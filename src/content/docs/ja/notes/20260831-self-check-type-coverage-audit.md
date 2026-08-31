---
title: "セルフチェックの型カバレッジ監査 — Rigor自身の`lib`のどこが型なしのままか"
description: "rigortype/rigor docs/notes/20260831-self-check-type-coverage-audit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260831-self-check-type-coverage-audit.md"
sourcePath: "docs/notes/20260831-self-check-type-coverage-audit.md"
sourceSha: "5194c6f2fa53ff1430c5285aefe85f5adc8822a073112a77fb440cd19be99079"
sourceCommit: "2d0ffe6f38d01cfd850527c57987b27487b414d4"
translationStatus: "translated"
sidebar:
  order: 20266831
---

ステータス: 計測ノート。masterの`83aaad82`（v0.3.6）、`lib`は427ファイル / 165,820個の型付けされた式 / 247,256個のASTノード。`make check`と`make check-plugins`は終始クリーンだった;ここでのどの計測のためにもリポジトリのファイルを1つも変更していない。発見は[#501](https://github.com/rigortype/rigor/issues/501)・[#502](https://github.com/rigortype/rigor/issues/502)・[#503](https://github.com/rigortype/rigor/issues/503)・[#506](https://github.com/rigortype/rigor/issues/506)となり、すべて同日に着地した（PR [#504](https://github.com/rigortype/rigor/pull/504)・[#505](https://github.com/rigortype/rigor/pull/505)・[#507](https://github.com/rigortype/rigor/pull/507)・[#508](https://github.com/rigortype/rigor/pull/508)）;§順位付けの節がその順序と、なぜその順序だったのかを運ぶ。

問い: RigorをRigorに対して走らせ、型が付かない場所を見つけ、次に何を直すかを順位付けせよ。

## 手法

4つの計器、うち3つは出荷済みのもの:

- `rigor check --no-cache --no-ci-detect lib`——ゲート。クリーン（RBSを持たない28個のgemについて`info`が1行）。
- `rigor type-scan lib`——ノードクラスごとの認識。247,256個のうち5,156個が未認識（2.1%）で、`ConstantPathNode`（20.9%）・`ConstantReadNode`（8.6%）・`CallNode`（7.7%）に集中している。この軸は飽和に近く、残りの作業がある場所では**ない**。
- `rigor coverage lib` / `rigor coverage --protection lib`——精度の層と、ディスパッチサイトのレシーバーの具体性。
- `Inference::PrecisionScanner`自身の分類器を再利用するスクラッチのプローブ。すべての`:dynamic_top` / `:top`の式についてそのノードクラスを、そして`CallNode`についてはその**レシーバー**が型付けされた層を記録する。ドライバ側のみ;ハーネスの慣習どおり、リポジトリは決して変更しない。

以下のA/Bはすべてタイミングではなく決定的なカウントなので、パフォーマンス作業を縛るインターリーブの規律はここには適用されない。

## 見出しとなる内訳

`rigor coverage lib`は精密55.20%、`Dynamic[Top]` 44.64%と報告する。74,284個の不透明な式のうち:

| ノードクラス | 件数 | 割合 |
| --- | --- | --- |
| `LocalVariableReadNode` | 28,765 | 38.7% |
| `CallNode` | 27,783 | 37.4% |
| `LocalVariableWriteNode` | 3,551 | 4.8% |
| `BlockNode` | 2,453 | 3.3% |
| `InstanceVariableReadNode` | 2,169 | 2.9% |
| それ以外すべて | 9,563 | 12.9% |

作業のありかを決めるのは2つの帰属である。

**不透明なローカル読み取りはパラメータである**。その名前が`def`のパラメータか、ブロックパラメータか、囲むスコープの代入されたローカルかでバケット分けすると:

| バケット | 件数 | 不透明なローカル読み取りに占める割合 |
| --- | --- | --- |
| `def`のパラメータ | 17,203 | 59.8% |
| 代入されたローカル | 8,079 | 28.1% |
| ブロックパラメータ | 3,483 | 12.1% |

パラメータは20,686サイト——**`lib`のあらゆる不透明な式の27.8%**である。

**不透明な呼び出しは起点ではなく伝播である**。最も頻出する120個の「レシーバーの層とメソッド」の組にわたって、レシーバーはすでに`Dynamic`が15,478サイトで、名前的が1,476、暗黙のselfが133、シェイプ付きが126だった。`coverage --protection`は自身の由来のサイドチャネル（ADR-75）から同意する: **エンジンのギャップが10,940に対しRBSを書けば済むものが375**、つまり型なしレシーバーのディスパッチサイトの96.7%はRBSを書いても閉じられない。レバーはシグネチャではなく推論だ——それこそが[ADR-67](../../adr/67-parameter-type-inference/)の`INFERRED_RETURN_UNTYPED`という原因が述べるために定義されたものである。

## 発見1——精度レンズは、エンジンが持つより弱いスコープの上で計測されている

[`CLI::CoverageScan.precision_report`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli/coverage_scan.rb)は素の`Scope.empty`を構築する。`--protection`のパスである[`CoverageCommand#scope_with_inferred_params`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli/coverage_command.rb)は`discovered_classes`＋`param_inferred_types`をシードし、そのコメント自身が、`discovered_classes`のシードの欠落が計測上の過小カウントを引き起こしていたことを記録している（2026-07-04に発見）。単一ファイルのスキャンは、自身が宣言していないクラスを見られないからだ。**その修正が精度のパスへ適用されたことは一度もなかった**。

| スコープ | 精密 | 比 | 差分 |
| --- | --- | --- | --- |
| 素の`Scope.empty`（`coverage`が報告するもの） | 91,536 | 0.5520 | —— |
| ＋`discovered_classes`（621） | 93,907 | 0.5663 | +1.43pt |
| ＋`param_inferred_types`（1,338） | 99,607 | 0.6007 | +4.87pt / +8,071サイト |

この比はユーザーの目に触れる——`rigor coverage`・`rigor check --coverage`・`make coverage`の閾値ゲートがすべてこれを報告する。計測する者にとっての帰結はこうだ: **同じ実行から得た精度の比と保護の比は、2つの異なるエンジンを記述しており、比較してはならない**。

両方を無条件にシードすると過大報告になる。`parameter_inference:`の既定はfalseであり、checkの走査のテーブルは空だからだ（ADR-67 WD6a）。レンズは走査を鏡写しにすべきである: `discovered_classes`は常にシードし、`param_inferred_types`はフラグの下でシードする。[#502](https://github.com/rigortype/rigor/issues/502)として起票。

`param_inferred_types`の側はそれ自体が1つの結果である: **我々自身の`lib`で+3.44pt**。未決のWD6の既定オンの問いに対するデータ点であり、コールグラフが完全にプロジェクト内で閉じているコードベースで取られたもの——ADR-67がfaraday / haml / mastodonで計測した範囲の、有利な側の端である。

## 発見2——レシーバー非依存の`Object` / `Kernel`のメソッドが`Dynamic[Top]`と答える

`x.nil?`は`x`が何であろうと`bool`である。`x`が型なしのとき、それは`Dynamic[top]`になり、`is_a?`・`kind_of?`・`instance_of?`・`respond_to?`・`!`・`frozen?`・`equal?`・`to_s`・`inspect`・`hash`・`object_id`・`class`も同様だ——`rigor type-of`で1つずつ確認した。`MethodDispatcher.resolve`は`Dynamic`レシーバーに対して層を見つけられず、`ExpressionTyper`は`inherit_receiver_origin`へ落ちる。

スパイク: `resolve`がnilを返し、かつレシーバーが`Type::Dynamic`であるとき、固定のテーブルから答える。発見1のシード済みベースラインの上で計測した。

| テーブル | 精密の比 | 差分 | 新規の`check`診断 |
| --- | --- | --- | --- |
| ベースライン（シード済み） | 0.6007 | —— | 0 |
| `nil? is_a? kind_of? instance_of? respond_to? equal? frozen? !` | 0.6191 | +1.84pt | 4 |
| ＋`inspect hash object_id` | 0.6218 | +2.11pt | +0 |
| ＋`to_s` | 0.6303 | +2.96pt | +7 |
| ＋`class` | 0.6317 | +3.10pt | +13 |
| ＋`== != eql?` | 0.6378 | +3.71pt | さらに増える |

診断こそがこのスパイクの価値のすべてであり、各列は別々のことを述べている:

- **`class`は除外しなければならない**。13件すべてが`undefined method X for Class`である。プラグインのインスタンスに対する`p.class.dynamic_returns`は`lib/rigor/plugin/registry.rb`にある実在のコードだ;`class`を`Nominal[Class]`へ畳み込むと、そのメソッドを定義しているシングルトンが消える。教科書どおりの[ADR-5](../../adr/5-robustness-principle/)の偽陽性を、+0.14ptで買うことになる。
- **`==` / `!=` / `eql?`は同じ理由で除外**——影響範囲はより大きい。
- **`to_s`の7件はこの畳み込みのせいではない**——`child.to_s.split("::")[0...-1]`に対する`possible-nil-receiver`であり、RBSの`Array#[](Range) -> Array[T]?`というオプショナルな戻り値のノイズを、畳み込みが到達可能にしただけである。
- **最初の行の4件は既存のバグ**であって、この変更のコストではない。1件は発見3（`@class_rows[k] ||= {}`）だった;残る3件を追いかけたところ、シェイプの機構が認識しない*2つ目の*別のミューテーションのパスが見つかった——下の発見4を参照。どちらもこの畳み込みが原因ではなく、どちらもそれによって覆いを剥がされたものだ。

偽陽性なしの集合: 8つの述語に`inspect hash object_id`を加えたもので、**新規の診断ゼロで+2.11pt**。[#503](https://github.com/rigortype/rigor/issues/503)として起票し、[#508](https://github.com/rigortype/rigor/pull/508)として着地——統合されたツリーで再計測すると**56.71% → 58.98%（+2.27pt、+3,830サイト）**であり、副作用として保護も45.6% → 45.8%へ動いた。これらの結果に対する連鎖した呼び出しが、今ではレシーバーを持つからだ。

実装上の細部を1つ、計測サイクルを丸ごと1回費やしたので記録しておく価値がある: `bool`を正典の`Constant[true] | Constant[false]`（`RbsTypeTranslator::BOOL_UNION`）ではなく`Nominal[TrueClass] | Nominal[FalseClass]`と綴ると、`declared bool, inferred TrueClass | FalseClass`と読める偽の`def.return-type-mismatch`の警告が17件生じる。

## 発見3——実在の偽陽性: インデックスのor/and/演算子書き込みは決して広がらない

上記の4件の`flow.always-truthy-condition`の警告を追いかけた先に、再現にスパイクを必要としないバグがあった。`MutationWidening.widen_after_call`は`StatementEvaluator`の`CallNode`のパスから走るので、`@h[k] = 1`は広がる——それは`[]=`の`CallNode`だからだ。`@h[k] ||= 1`は`Prism::IndexOrWriteNode`であり、`eval_index_or_write`に到達し、広げる呼び出しサイトを決して通らない。

| 兄弟メソッドでのミューテーション | `@h.empty?`が型付けされる先 |
| --- | --- |
| `@h[k] = 1` | `bool` |
| `@h.store(k, 1)` | `bool` |
| `@a << x` | `bool` |
| `@h[k] \|\|= 1` | `true` |
| `@h[k] += 1` | `true` |
| `@h[k] &&= 2` | （`@h.size`が`1`のままになる） |

masterでは、`return nil if @rows.empty? || $stdout.tty?`が「condition is always truthy」と警告する一方で、同じクラス内の素の`return nil if @rows.empty?`は正しく警告しない。これは`MutationWidening`が閉じるために書かれたG1/G2のギャップ（[`20260521-mastodon-cluster4-flow-folding-triage.md`](../20260521-mastodon-cluster4-flow-folding-triage/)）が、その修正がカバーしなかった3つのノードクラスを通じて再び現れたものだ。

`lib/rigor/effects/plugin_facts.rb`は`@class_rows[entry.singleton] ||= {}`と書き、4つの読み手を`return nil if x.nil? || @rows.empty?`で守っている。その4つが今日沈黙しているのは、左のオペランドが`Dynamic`であるからにすぎない——そしてそれこそ発見2が変えるものである。[#501](https://github.com/rigortype/rigor/issues/501)として起票。

## 発見4——2つ目のエイリアシングのパス: 兄弟メソッドが手渡すivar

発見2の4件の診断のうち3件は発見3ではなかった。`plugin_facts.rb`の`@self_rows`・`@path_rows`・`@result_rows`はそれぞれ`initialize`で`{}`にされ、`bucket_for(entry)`によって手渡され、`(bucket_for(entry)[entry.receiver] ||= {})[entry.method.to_s] = row`を通じて埋められる。クラスivarの事前パスは、レシーバーが`InstanceVariableReadNode`であるときにしかミューテーションを記録しないので、返されたエイリアスを通じたミューテーションは見えず、そのivarは空の`HashShape`を保ち続ける。修正前のmasterでは、`rigor type-of`は`@path_rows`を`{}`と読み、`@path_rows.empty?`を`Constant[true]`と読んだ——動作するプログラムでは決して空にならないハッシュに対する誤った型であり、上記のどの変更もなしに証明できる。

発見3と同じファミリー——シェイプの無効化の機構が認識しないミューテーションのパス——であり、潜伏の仕方も同じだ: 素のガードは沈黙し、複合のものが発火する。[#506](https://github.com/rigortype/rigor/issues/506)として起票し、[#507](https://github.com/rigortype/rigor/pull/507)として着地。修正は意図的に狭いままにしてある（self呼び出しのレシーバー、同一クラスの呼び出し先、RETURN位置のivarのみ）。過剰に記録すると、何もミューテートしないシェイプのキャリアを広げてしまい、そのクラスのあらゆる読み手で精度を損なうからだ。

これを書いたことから残しておく価値のあることが1つ: `make check`が最初のドラフトを拒否し、そしてそれは正しかった——`gather_aliased_mutations`が、ナローイングできない述語（`NODE_CLASSES.any? { |k| node.is_a?(k) }`は`Prism::Node`に対する呼び出しとして読まれる）の背後で`node.receiver`を読んでおり、潜在的な`NoMethodError`だった。エンジンは、自身の偽陽性に対する修正の中に実在のバグを見つけたのだ。

## 順位付け

発見1・3・4は同日に、その依存順で着地した;発見2は最後になった。その計測がクリーンであるためには、2つのミューテーションのバグが両方とも消えている必要があったからだ。

1. **[#501](https://github.com/rigortype/rigor/issues/501)** → [#504](https://github.com/rigortype/rigor/pull/504)——`MutationWidening`を迂回するインデックスのor/and/演算子書き込み。
2. **[#506](https://github.com/rigortype/rigor/issues/506)** → [#507](https://github.com/rigortype/rigor/pull/507)——兄弟メソッドが返したエイリアスを通じてミューテートされるivar。
3. **[#502](https://github.com/rigortype/rigor/issues/502)** → [#505](https://github.com/rigortype/rigor/pull/505)——保護レンズと同じようにシードされる精度レンズ;ADR-67のWD6のデータ点でもある。
4. **[#503](https://github.com/rigortype/rigor/issues/503)** → [#508](https://github.com/rigortype/rigor/pull/508)——レシーバー非依存のセレクタのテーブル。
5. **パラメータ**——依然として未決であり、今や見積もる価値のある残りのすべてだ: 不透明性全体の27.8%であり、先送りのままのADR-67のWD2（本体内の構造的推論）の領分である。上記の帰属が、#508後のツリーで再計測する際のベースラインになる。

再利用できる部分は個々の数字ではなくその日の形である: **ある精度のレバーの価値は2.27ポイントで、その副産物は、ゲートもコーパスも表に出していなかった実在の偽陽性バグ2件だった**。より多くの式に型を付ける畳み込みは、既存の誤った型を診断ルールから*到達可能*にする。だからこそ診断の件数は比と同じ表に属する。

## コーパスでの検証（同日、4件すべてが着地した後）

上記の節は1つのコードベースを計測しており、そう述べている。サーベイのコーパスから取った2つの実在のRailsアプリケーションが、`lib`には答えられない2つの問いに答える: このどれかが我々の書いていないコードで発火するのか、そして精度の向上は型検査器自身のソースの外でも生き延びるのか。

手法: 監査前のツリー（`83aaad82`）とマージ済みのmasterを突き合わせ、各腕は`rigor check --no-cache --no-ci-detect --format=json`で、cwdはそのプロジェクト、`BUNDLE_GEMFILE`はこのリポジトリのものとし、各プロジェクトのコミット済み設定から`baseline:`スタンザだけを除いて何も抑制されないようにした。診断の集合は`(path, line, column, rule, message)`で比較した。決定的なカウントなので、ここではフェーズに分けたA/Bで健全である——インターリーブの規律が縛るのはタイミングであって集合ではない。

| プロジェクト | 診断 | 保護 | 精度 |
| --- | --- | --- | --- |
| redmine（app+lib、347ファイル） | 792 → 792、**追加0 / 除去0** | 34.9% → 35.0%（+43サイト） | 43.06% → 47.76% |
| mastodon（app+lib、1,325ファイル） | 2,341 → 2,341、**追加0 / 除去0** | 33.7% → 33.9%（+54サイト） | 42.08% → 48.90% |
| このリポジトリ（`lib`、427ファイル） | 0 → 0 | 45.6% → 45.8%（+81サイト） | 55.27% → 58.98% |

**両方のアプリケーションで診断の変化はゼロ**——4つの変更は我々の書いていないコードに対して精度加算的であり、それこそ発見2の除外の分析が選ばれた目的の性質である。

### 帰属は発見2が仮定していたものをひっくり返す

マージ済みのツリーを`UniversalObjectDispatch.try_dispatch`を無効化して再実行すると、精度の列は分解できる:

| | 前 → 層なし → 層あり | シード＋ミューテーション修正 | 層（#508） |
| --- | --- | --- | --- |
| redmine | 43.06 → 46.95 → 47.76 | **+3.89pt** | +0.81pt |
| mastodon | 42.08 → 48.05 → 48.90 | **+5.97pt** | +0.85pt |
| このリポジトリ | 55.27 → 56.71 → 58.98 | +1.44pt | **+2.27pt** |

つまり、このノートが公表した順位付けは、どちらのレバーが効いたのかについて、両方向に間違っている。**この層が我々自身の`lib`で+2.27ptだったのは、我々自身の`lib`が生業としていることによって水増しされていた**——型検査器は絶えず型について述語を取るのであり、`nil?` / `is_a?`の密度はアプリケーションコードではそれに遠く及ばず、そこでの層の価値は約3分の1である。**計測の訂正として起票され、それより下に順位付けされたシードの修正が、実在のアプリケーションでは4〜6ポイントの価値を持つ**——Railsアプリのクロスファイルのクラス定数こそ、1ファイルずつの走査が見られないものの大半だからだ。

一般化した形は残しておく価値がある: **このリポジトリ自身の`lib`で計測されたレバーは、Rigorが対象とするプログラムではなく型検査器に対して較正されている**。発見2の注意書きは`lib`を上限として読めと述べていた;それは層については正しく、シードについては逆だった。

## フォローアップ: `check`の走査には同様のシードのギャップはない（否定的結果）

上記のコーパスの内訳は明白な問いを立てた。*レンズ*が過小にシードされており、それが実在のアプリケーションで4〜6ポイントの価値を持ったのなら、**プロダクト**であるcheckの走査にも同種の穴があるのか？ 2つのパスがそれに答え、答えは「ない」である。

**構造的に**。`Analysis::Runner#project_scope_seed_tables`は`Scope::DiscoveryIndex`が持つクロスファイルのスロットすべてをシードする: `discovered_classes`・`discovered_methods`・インスタンスとシングルトンのdefノードとdefソースのテーブル・`discovered_method_visibilities`・`discovered_superclasses`・`discovered_includes`・Data / Structのメンバーのレイアウト・`run_generation`、加えて2つのオプトインのテーブル（`param_inferred_types`・`in_source_constants`）と、依存関係の記録の下での`discovered_class_sources`。シードし*ない*のは、`ScopeIndexer`が構成上**ファイルごとに**構築する4つのテーブル——`declared_types`・`class_ivars`・`class_cvars`・`program_globals`——である。

`class_ivars`は本物のギャップに見え、実際に再現する:

```ruby
# a.rb
class Foo
  def initialize = @rows = []
end

# b.rb
class Foo
  def probe = @rows.empty?   # Dynamic[top]; the identical code in ONE file types `true`
end
```

**経験的には、その母集団はほぼ空である**。純粋にASTだけで、そのクラスについて自身はそのivarを書いていないファイルの中に座るインスタンス変数の読み取りを数えた調査:

| | 書き込みのあるivarの読み取り | それを書いていないファイル内 | 影響を受けるクラス |
| --- | --- | --- | --- |
| このリポジトリ（`lib`、429ファイル） | 2,300 | **0** | 0 |
| redmine（app+lib、347ファイル） | 2,121 | **0** | 0 |
| mastodon（app+lib、1,325ファイル） | 4,270 | **17**（0.4%） | 1 |

他の2つのファイルごとのテーブルに対する同じ調査は、3つすべてで、書き込みのあるグローバル変数やクラス変数の外部からの読み取りを**ゼロ**しか見つけない。したがって`class_ivars`をプロジェクト全体のインデックスへ引き上げること——アキュムレータの`initialize` / 書き込み前の読み取り / 死んだ書き込みのガードがクラス本体ごとに計算されるので、相当な変更になる——は、最大の対象で17サイトを買い、他の2つでは何も買わない。

**追わない**。再導出されないように記録しておく: `discovered_classes`の形をした発見はここでは繰り返さない。Rubyのコードベースは、クラスを複数ファイルに分割するときでさえ、そのクラスのivarの書き込みと読み取りを同じファイルに保つからだ（redmineとmastodonでそのようなクラスはそれぞれ21個と16個あり、そのどれもivarを分割していない）。

この調査は、桁が1つ大きいので名指す価値のある*別の*母集団を表に出す: **すべてのivar読み取りの13〜15%は、走査したツリーのどこにも静的な書き込みのないivarに対するものである**（380 / 394 / 635）。それらは`attr_writer`・`instance_variable_set`・フレームワークによる代入、あるいは走査したパスの外側での書き込みだ——シードよりも難しい問題であり、それとは無関係である。

## フォローアップ: インスタンス変数の不透明性は実際どこから来るのか

上記の調査は1つの母集団を名指し——ivar読み取りの13〜15%は走査したツリーに静的な書き込みのないivarに対するもの——そしてそれをスコープ未確定と呼んだ。それをスコープ付けすると、その大きさそのものより有用なことが言える。

（ASTにではなく）エンジンに、なぜ各不透明なivar読み取りが不透明なのかを`lib`上で尋ねると: **2,711件のivar読み取りのうち2,104件が`Dynamic[Top]`**であり、それは3つに分かれる。

| バケット | 件数 | 割合 | それが何であるか |
| --- | --- | --- | --- |
| **エントリー不透明** | 1,656 | 78.7% | クラスivarのアキュムレータはエントリーを持って**いる**が、それが`Dynamic`である——右辺自身が型付けされなかった書き込みが存在する |
| エントリーなし | 413 | 19.6% | アキュムレータが見る場所に、その名前を書いたものが何もない |
| シングルトン本体 | 35 | 1.7% | `def self.` / `class << self`の本体の内側での読み取り。設計上ivarのシードを取らない |

**ivarの不透明性の5分の4は、右辺がパラメータである書き込みである**——`def initialize(line); @line = line`——これはまさに[ADR-67](../../adr/67-parameter-type-inference/)が自身のものと名指すフロンティアだ（ADR-58は具体的な書き込みのフィールドを型付けするが、パラメータ由来のものには触れられない）。ivarは独立したレバーではない;1ホップ下流から見たパラメータである。

`エントリーなし`のバケットには、構造的に見えたので計測する価値のあるきれいなサブパターンが1つある: **クラス／モジュールの本体レベル**で書かれ（`module_function`の隣の`@mutex = Mutex.new`）、シングルトンコンテキストのメソッドから読まれるivarだ。それらは実行時には同じオブジェクトのivarであり、アキュムレータは助けにならない。意図的にインスタンス本体だけを扱うからだ——クラスレベルの書き込みをインスタンス本体へシードするのは誤りになる（別のオブジェクトだ）。シングルトン本体を扱うであろう対称なアキュムレータは存在しない。母集団:

| | シングルトンコンテキストのivar読み取り | クラスレベルの書き込みを持つもの |
| --- | --- | --- |
| このリポジトリ（`lib`） | 82 | 82 |
| redmine（app+lib） | 63 | 63 |
| mastodon（app+lib） | 5 | 5 |

写像は存在する限り完璧であり（そのような読み取りはすべて対応する書き込みを持つ）、母集団は隣のバケットの1,656に対して82サイトである。上記のクロスファイルの問いと同じ理由で、**追わない**。

### このスレッドが到達する結論

残る不透明性の3つの独立した分解が、1つの場所に着地する:

- 不透明な**ローカル読み取り**——72%は`def`またはブロックのパラメータ;
- 不透明な**呼び出し**——約91%はレシーバーがすでに`Dynamic`であり、つまり伝播である;
- 不透明な**ivar読み取り**——79%は右辺がパラメータである書き込みだ。

したがって、このコードベースでの精度の作業はレバーを見つけられずに詰まっているのではない;すべてが行き着く唯一のレバーで詰まっており、それへの2つのアプローチはどちらもADR-67によって閉じられている（WD2は設計スパイクによって、WD3の既定オンは3つの再評価トリガーによって。そのうち1つは実世界での利用の蓄積を必要とする）。将来のセッションにとって有用な形はこうだ: **ADR-67のゲートが動くまで、ここで精度のレバーを探すのをやめること**——探索は3通りのやり方で行われ、同じ答えを返している。

## このノートが主張しないこと

精度の比はゴールではなく*レンズ*である: より高い数字が持つ価値があるのは、それが新規の偽陽性なしで得られるときだけであり、だからこそ上記のすべての行が診断の件数を運んでいる。発見の各節はこのリポジトリ自身の`lib`だけを計測しており、そのコールグラフは異常なほど自己完結している;上記のコーパスでの検証の節が、それらを実在のアプリケーションに対して確認するものであり、それは確認するというより順位付けを訂正している。パラメータ推論の数字にはそのような確認がなく、依然として上限として読むべきである。
