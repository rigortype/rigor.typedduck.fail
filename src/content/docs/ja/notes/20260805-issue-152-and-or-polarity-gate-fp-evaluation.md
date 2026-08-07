---
title: "`&&` / `||`の値極性ゲート —— FPリスクの評価（issue #152）"
description: "rigortype/rigor docs/notes/20260805-issue-152-and-or-polarity-gate-fp-evaluation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260805-issue-152-and-or-polarity-gate-fp-evaluation.md"
sourcePath: "docs/notes/20260805-issue-152-and-or-polarity-gate-fp-evaluation.md"
sourceSha: "6d957acf391bc50319d467a69b791961c71a27ae7c22ab9cf994a7ccf6ab3cec"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
translationStatus: "translated"
sidebar:
  order: 20266805
---

ステータス: [issue #152](https://github.com/rigortype/rigor/issues/152)に対する評価。非規範的。**判定: `constant_value_polarity`を完全なプローブへ拡張しない**。 `lib/`には何も出荷していない。

このissueは「`ExpressionTyper#constant_value_polarity`を`Constant`を越えて拡張する」ことを、独自のFP評価を要する実質的な挙動変更としてキューに積んでいた。本ノートがその評価である: このゲートが今日何をしているか、完全なプローブが新たに何を判定するようになるか、2つ目の`&&`/`||`タイパーも歩調を合わせて動かさねばならないか、そしてコーパスの差分が何を計測するか。コーパスの差分は**新規診断ゼロ**で返ってきたが、判定は依然として*出荷しない*だ —— その隔たりの理屈が本ノートの本題である。

## 1. ゲートが今日していること、そして何が変わるか

`constant_value_polarity`（`lib/rigor/inference/expression_typer.rb`）は`Type::Constant`に対してのみ`:truthy` / `:falsey`と答え、`type_of_and_or`はその答えを使って両者のユニオンではなく一方のオペランドの型を返す。「完全なプローブ」は1行だ —— 他の*あらゆる*確実性の判定箇所がすでに読んでいる判断`Narrowing.predicate_certainty`へ委譲する:

```ruby
def constant_value_polarity(type)
  Narrowing.predicate_certainty(type)   # was: Constant-only
end
```

### 差分は見た目よりずっと狭い

（ノード種別 × 極性）の4つの組み合わせのうち、**2つは代数的に無効**だ —— 短絡とユニオンのフォールバックがすでに同じ型を生む。`union(Bot, right) == right`だからである:

| ノード | 極性 | 短絡の結果 | ユニオンのフォールバック | 効果 |
| --- | --- | --- | --- | --- |
| `a && b` | `:truthy` | `type_of(b)` | `union(narrow_falsey(a)=Bot, b)` | **なし** |
| `a \|\| b` | `:falsey` | `type_of(b)` | `union(narrow_truthy(a)=Bot, b)` | **なし** |
| `a && b` | `:falsey` | `type_of(a)` | `union(a, b)` | `b`を落とす |
| `a \|\| b` | `:truthy` | `type_of(a)` | `union(a, b)` | `b`を落とす |

したがってこのゲートを拡張することの観測可能な帰結はちょうど1つだ: 左オペランドが証明可能に真値と判定されると、`a || b`は**作者のフォールバック`b`を捨てる**;対称的に、証明可能に偽値な`a`に対して`a && b`は`b`を捨てる。第3の効果はなく、他のいかなる意味でも分岐が「絞り込まれる」ことはない。

### 新たに判定可能になる形状の分類

各キャリアに対して`Narrowing.narrow_truthy` / `narrow_falsey` / `predicate_certainty`を直接駆動して計測した（ソースからの推論ではなくプローブスクリプトによる）:

| 型の形状 | 今日 | 完全なプローブ | 健全か、推測か |
| --- | --- | --- | --- |
| `Constant[nil]`・`Constant[false]` | `:falsey` | `:falsey` | 不変 |
| `Constant[c]`（真値な`c`。`0`・`""`を含む） | `:truthy` | `:truthy` | 不変 |
| `Nominal[NilClass]`・`Nominal[FalseClass]` | — | **`:falsey`** | **健全** |
| `Nominal[String]`・`[Integer]`・`[Array[..]]`、偽値でない任意のクラス | — | **`:truthy`** | **推測** —— §2を参照 |
| `Nominal[Object]`・`Nominal[BasicObject]`・`Nominal[Kernel]` | — | **`:truthy`** | **不健全** —— `nil.is_a?(Object)`は`true`だ;`falsey_nominal?`は正確なクラス名でのみマッチするので、本当に`nil`を許す上位型が真値と判定される |
| `Singleton[C]`・`Tuple[..]`・`HashShape{..}` | — | **`:truthy`** | 居住性から健全 |
| 偽値メンバーを持たない`Union`（`String \| Integer`・`1 \| 2`） | — | **`:truthy`** | **推測** —— 各メンバーの状態を継承する |
| `Union[String, nil]`・`Union[true, false]` | — | — | 正しく辞退する |
| `Top`・`Dynamic[T]`、それらを含む任意のユニオン | — | — | 正しく辞退する |
| `Bot` | — | — | 正しく辞退する（デッドコードは確実性の主張ではない） |

健全な追加分（`NilClass` / `FalseClass` / シェイプのキャリア）は、**割に合いえない**ものだ: それらは`a && b`の`:falsey`の行にしか到達せず、コーパスは偽値の発火を**ゼロ**しか生まなかった（§3）。計測可能な効果を持つものはすべて「推測」の行にある。

## 2. なぜ「証明可能に真値な`Nominal`」がここでは、まさに推測なのか

これは名前的型についての一般的な主張ではない。*Rigorの*名前的型についての主張であり、型仕様がすでにそう述べている。[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)は、`RbsDispatch`がコアRBSの`%a{implicitly-returns-nil}`を意図的に**尊重しない**ことを記録している: `Hash#[]`は`V`、`Array#[]`は`Elem`としてnilフリーに読まれる。それらを悲観的にすると、Rigor自身の`lib`で25件の偽陽性が実測されるからだ（`Hash.new(0)` / `default_proc`のレシーバー）。同じ文書がその帰結を明示的に述べている:

> 非静的キーの`[]`から来る値ユニオンは、したがって**証明ではなく楽観的**である[…] `flow.always-truthy-condition`とそれが共有する`&&`/`||`の`constant_value_polarity`ゲートは、そのようなユニオンから真値性を結論してはならない（MUST NOT）。今日このゲートはConstant専用なのでそれはできない。**そのいかなる拡張（issue #152）もこの除外を保持しなければならない（MUST）**。さもなければ`MAP[key] || key`は左オペランドを証明可能に真値と判断し、作者のフォールバックを捨ててしまう。

これは規範的なMUSTであり、しかもこのissueを番号で名指ししている。完全なプローブはそれを守れない: 問題の値は、「クラスが本当にnilを除外するのでnilフリー」と「ディスパッチのティアで楽観を選んだのでnilフリー」を区別するprovenanceを何も運んでいない。どちらも同じ`Nominal` / `Union`だ。したがってこの除外は、完全なプローブの内側のフィルタとして**表現できない** —— provenanceタグが必要になるが、それはまさにこの判断について[ADR-78](../../adr/78-reflexive-overfold-always-truthy/)がすでに検討して却下したものだ（「provenanceは`Dynamic`を説明するのであって、定数を正当化しない」）。

ADR-78のWD1は、この拡張が破ることになる基準を述べている: 証明可能な真値性は、実行時に本当に成り立つ値にのみ依拠でき、実際の式より狭い形に健全性が条件付けられる畳み込みには決して依拠できない。楽観的なnilフリーの読み取りは、まさにその形状である。

**コーパスは、これが理論上の話でないことを確認した**。拡張したゲートが結果を変える13の異なるサイト（§3）のうち、仕様が逐語で名指しする`MAP[key] || key`の形は、Rigor自身の`lib`を含む4つのプロジェクトに現れる:

- `lib/rigor/inference/parameter_inference_collector.rb:355` —— `(index[receiver] || scope).type_of(receiver)`
- `lib/rigor/analysis/dependency_source_inference/gem_resolver.rb:52` —— `Gem.loaded_specs[name] || begin … end`
- kramdown `lib/kramdown/utils/html.rb:70` —— `ESCAPE_MAP[m] || m`
- textbringer `lib/textbringer/input_methods/hangul_input_method.rb:68` —— `COMPATIBILITY_JAMO_TO_FINAL[jamo] || jamo`
- redmine `app/helpers/application_helper.rb:258` —— `ATTACHMENT_CONTAINER_LINK[…] || RECORD_LINK[…]`

どれについても、作者は*ルックアップが外れうるからこそ*フォールバックを書いている。この拡張は、作者がガードとして足したまさにその分岐を消す。

## 3. 2つ目の`&&`/`||`タイパー —— それが計測に何をするか

**はい、2つ目の極性の経路が存在する**。そしてそれがより重要な発見だ。

- `ExpressionTyper#type_of_and_or` —— 値側。`constant_value_polarity`のゲートを持つ。
- `StatementEvaluator#eval_and_or` —— スコープ側。**極性ゲートをまったく持たない**。常に`union(skipped_type, right_type)`を返す（`skipped_type`は`narrow_falsey(left)` / `narrow_truthy(left)`）。その唯一の削除は、無関係なADR-24 WD6の終端分岐のケース（`a or raise`）だ。

masterでは両者は一致する。無効な2行についてはユニオンのフォールバックと`Constant`の短絡が一致し、左が`Constant`型なら残り2行も一致するからだ。**拡張は両者を乖離させる**し、それは直接観測できる:

```ruby
COUNTS = { a: 1, b: 2 }.freeze
label = COUNTS[key] || "none"    # write node
label                            # bound local
```

| | 書き込みノード（`ExpressionTyper`） | 束縛されたローカル（`StatementEvaluator`） |
| --- | --- | --- |
| master | `"none" \| 1 \| 2` | `"none" \| 1 \| 2` |
| 拡張後 | **`1 \| 2`** | `"none" \| 1 \| 2` |

これは記録済みの「2つの並行する`||`/`&&`タイパー」というバグのクラスを再現する: 同じロジックが二重に実装され、乖離していく。片側だけを拡張することは、その新しい実例を作り出すことであり、そこでは`rigor type-of` / LSPのホバーが、解析自身は使っていない型を報告することになる。

**これはまた、コーパスの差分が弱い証拠である理由でもある**。スコープ側が束縛を再導出するので、拡張された値側の答えは、診断を生むサーフェスに対しては大部分が*覆い隠される*:

- ローカルの束縛 —— 覆い隠される（上の表）;
- 推論されたメソッドの戻り値型 —— 覆い隠される（末尾位置の`CODES[key] || "none"`は前後とも`"none" | 1 | 2`と推論される）。

したがって「新規診断ゼロ」は、判断の安全性ではなく、この覆い隠しを実質的に計測している。2つのタイパーを1つのオーナーへ統合する将来の作業 —— それが正しい終着点であり、フェーズ3の再レビューが推奨するものだ —— は、この覆いを外し、FPのサーフェス全体を一度に露出させるだろう。

## 4. コーパスでの計測

手法: `rigor check --format json --workers 0 --no-baseline --no-cache`、cwdはターゲット、`BUNDLE_GEMFILE`はRigorのものを指し、Flakeの中で実行。診断は`(path, line, column, rule, message, severity)`の多重集合として比較した。

先に2つのハーネスの罠を潰す必要があり、どちらもきれいに見えるゼロを黙って生んでいた:

- **`.rigor-baseline.yml`** —— redmine/mastodon/textbringerがそれぞれ持っている;最初の実行はredmineだけで793件の診断を黙らせた。この種の差分には`--no-baseline`が必須だ。
- **run-diagnosticsキャッシュ** —— そのキー（`Analysis::RunCacheKey#descriptor`）は`Rigor::VERSION`・ディスクリプタのスキーマ・パス集合を混ぜ込むが、**エンジン自身のソースから導かれるものは何も混ぜていない**。バージョンを上げない`lib/`への編集はそれに見えないので、AFTERの実行はBEFOREの実行の診断を逐語で再生する。`--no-cache`（または`--clear-cache`）が必須だ。これは今後のあらゆるエンジンの前後比較の計測にとって知っておく価値がある。

| ターゲット | パス | before | after | 新規 | 消失 |
| --- | --- | ---: | ---: | ---: | ---: |
| rigor `lib` | `lib` | 1 | 1 | 0 | 0 |
| rigor plugins + examples | `plugins/*/lib examples/*/lib` | 1 | 1 | 0 | 0 |
| erubi | `lib` | 3 | 3 | 0 | 0 |
| faraday | `lib` | 7 | 7 | 0 | 0 |
| net-ssh | `lib` | 24 | 24 | 0 | 0 |
| kramdown | `lib` | 68 | 68 | 0 | 0 |
| liquid | `lib` | 5 | 5 | 0 | 0 |
| mail | `lib` | 26 | 26 | 0 | 0 |
| textbringer | `lib` | 188 | 188 | 0 | 0 |
| redmine | `app lib` | 797 | 797 | 0 | 0 |
| mastodon | `app lib` | 2351 | 2351 | 0 | 0 |
| **合計** | | **3471** | **3471** | **0** | **0** |

この変更はデッドコードではなく生きている: 計装したビルドは、拡張したゲートが答えてConstant専用のゲートが辞退する箇所を**70件**数えた —— すべて`:truthy`で、`:falsey`はゼロ。**うち59件が効果のある2行に落ちる**（つまり実際にオペランドを捨てる）;残りの11件は`&&`かつ真値で、代数的に無効だ。59件は13の異なるソースサイトに集約され、そのすべてが作者の書いたフォールバックを落としている:

```
kramdown      ESCAPE_MAP[m] || m
textbringer   COMPATIBILITY_JAMO_TO_FINAL[jamo] || jamo
textbringer   find_first_path(patterns) or raise EditorError, "Test target not found"   (×2 sites)
redmine       clear_password || ""
redmine       ATTACHMENT_CONTAINER_LINK[…] || RECORD_LINK[…]
redmine       m[2] or 1
rigor-lib     index[receiver] || scope
rigor-lib     Gem.loaded_specs[name] || begin … end
rigor-lib     node.lefts || []   /   node.rights || []
rigor-plugins params.parameters.requireds || []
rigor-plugins dq || sq
```

`find_first_path(patterns) or raise …`が最も鋭い例だ: 拡張は、作者の`or raise`が「そうではない」と書き記しているまさにその場所で、左オペランドを証明可能に真値と判定する。

## 5. 判定

**出荷しない**。この評価の着地ルールは「どこにも新規診断ゼロ」であり、その基準は満たされた —— だがそれは必要条件であって十分条件ではなく、3つの知見がそれを覆す:

1. **拘束力のある規範的なMUSTに反する**。 `docs/internal-spec/inference-engine.md`は、このゲートのいかなる拡張も楽観的nilフリー読み取りの除外を保持することを要求しており、issue #152と`MAP[key] || key`の反例を名指ししている。完全なプローブはそれを保持できない —— 除外される形状と認める形状は、区別するprovenanceを持たない同一のキャリアだからだ。着地させることは*仕様を修正すること*を意味し、それはRigorのnilフリーな読み取りが証明なのか楽観なのかについてのADRレベルの決定である。その決定はFP評価の内側では下せないし、ADR-78のWD1と、現行ポリシーを定めた25件の偽陽性の`implicitly-returns-nil`の計測を蒸し返すことになる。
2. **このゼロは部分的に2つ目のタイパーによる産物である**。 `StatementEvaluator#eval_and_or`は極性ゲートなしに束縛と戻り値型を再導出し、まさに診断を出すサーフェス上で拡張された答えを覆い隠す。この計測は、値付けしようとしたリスクの大半を見ることができないし、2つのタイパーを後で統合すればそれが一度に露出する。
3. **効果は精度の向上ではなく、精度の低下である**。 issueの前提は、拡張が「`&&`/`||`のナローイングの精度を改善する」ことだった。§1の代数が示すとおり、唯一の観測可能な効果は*作者のフォールバックのオペランドを捨てること*だ。左オペランドが本当に非nilである場合はそれは本物の利得だが（`node.lefts || []`）、楽観的に非nilであるだけの場合はガードを消す。Rigorは両者を区別できないし、「偽陽性は最悪ケースの静的な読みに優る」の下では、引き分けはユニオンを保つほうに倒れる。

構成上健全な部分集合（`Nominal[NilClass]` / `[FalseClass]` / シェイプのキャリア）は安全だが無価値だ: それは`a && b`の`:falsey`の行にしか到達せず、その行は11プロジェクト・3471診断にわたって**ゼロ**回しか発火しなかった。それを出荷することは、計測された利益なしに挙動変更を足すことになる。

### 推奨する処置

- #152を**評価のうえ見送り**としてクローズし、本ノートを引用する。「需要待ちで先送り」ではない —— 待っていた評価は行われたし、答えは需要に依存しない型モデル上の理由でノーだ。
- Constant専用のゲートは、未完成の収束ではなく**意図的なもの**として文書化すべきだ。それは、その保守性が効いている唯一の確実性の判定箇所である。

### 独自のissueに値する2つの発見

- **`if` / `unless`の値の経路は、このissueがするなと言われた賭けをすでにしている**。 `constant_predicate_polarity`はConstantの制限なしに`Narrowing.predicate_certainty`へ委譲するので、masterでも`x = Time.now; if x then 1 else "s" end`はすでに`1`と型付けされる —— nilフリーな`Nominal`に対してelse分岐が削除されるのだ。`Nominal[Object]` / `[BasicObject]`もその経路に到達し、そこでは判断が端的に不健全である（`nil.is_a?(Object)`）。したがって#152が取り除きたかった非対称性は実在するが、FPを嫌う解決は*逆*方向 —— `if`の経路を制約するほう —— を指すし、ADR-78の先例は、そういうものを消費側ではなくソースで直すことだ。issueに値するが、その経路を絞るのはそれ自体が挙動変更なので、ここではスコープ外である。
- **run-diagnosticsキャッシュのキーがエンジン自身のソースを無視している**。 `--no-cache`を忘れたエンジンの前後比較の計測は、黙って「変化なし」と報告する。コントリビュータ向けの文書化された警告か、キーにソースダイジェストのスロットを設けるかのどちらかに値する。

## 再現方法

実験用のパッチは3行だ;計測して差し戻したので、ツリーには何も残っていない。再現するには:

```ruby
# lib/rigor/inference/expression_typer.rb
def constant_value_polarity(type)
  Narrowing.predicate_certainty(type)
end
```

としてから、§4のターゲットに対して`rigor check --format json --workers 0 --no-baseline --no-cache`を差分する。
