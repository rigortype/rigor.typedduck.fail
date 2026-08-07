---
title: "`if` / `unless`の真偽性による削除 —— 判定が何に依拠しているかのコーパス調査（issue #286）"
description: "rigortype/rigor docs/notes/20260805-issue-286-if-unless-truthiness-elision-census.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260805-issue-286-if-unless-truthiness-elision-census.md"
sourcePath: "docs/notes/20260805-issue-286-if-unless-truthiness-elision-census.md"
sourceSha: "47fdf87fba08121dbabb7e83e3f961e2fde2db7a50216d619764006cfe29f4ed"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
translationStatus: "translated"
sidebar:
  order: 20266805
---

ステータス: [issue #286](https://github.com/rigortype/rigor/issues/286)のための計測。`master`のb72665dd（Rigor 0.2.x系）に対して実施。非規範的;`lib/`には何も出荷していない。

**#286が提案する変更についての判定: 着地させない —— それは証明可能なno-opである**。それが狙う不健全な名前的型のファミリー（`Object` / `BasicObject` / `Kernel`）は、11プロジェクトの41,836件の`if` / `unless`述語のうち**0回**しか発火しない。**しかしこの調査は、同じ賭けをしている別のファミリーを125回見つけたし、それは`master`上で再現可能な偽陽性を生む** —— `docs/internal-spec/inference-engine.md`が`&&` / `||`のゲートについて手作業で名指ししている、楽観的にnilフリーなキャリアだ。決定に値するのはそちらの発見である。

## 1. 判定の場所

判断は1つ、`Rigor::Inference::Narrowing.predicate_certainty`（`lib/rigor/inference/narrowing.rb:124`）であり、2つの消費者がそれを読む:

- `StatementEvaluator#live_branch_for_if` / `#live_branch_for_unless`（`lib/rigor/inference/statement_evaluator.rb:545` / `:552`）—— スコープ側。死んだ分岐を丸ごとスキップする: 型もポストスコープも寄与せず、その本体は決して評価されない。
- `ExpressionTyper#elide_or_union`（`lib/rigor/inference/expression_typer.rb:621`）—— 値側（式位置の三項演算子と、`type_of`経由で到達するあらゆる`if` / `unless`）。

`predicate_certainty`は`narrow_falsey(type)`が`Bot`のとき`:truthy`と答える。そして非`Bot`のfalsey断片を生みうる唯一の名前的型は、`class_name`が文字どおり`NilClass`または`FalseClass`であるものだけだ（`Narrowing.falsey_nominal?`、`narrowing.rb:634`）。

issueの例を`master`でそのまま再現すると:

```
$ rigor type-of repro.rb:3:1        # x = Time.now; y = if x then 1 else "s" end; y
type:    1
```

## 2. 分類 —— 何が判定に到達するか

各キャリアに対して直接駆動した（ソースからの読み取りではなくプローブスクリプト）。適合の列は仮定ではなくRubyランタイムに対して確認した:

| 形状 | 判定 | 健全か |
| --- | --- | --- |
| `Constant[nil]`・`Constant[false]` | `:falsey` | 健全 —— 本物の値 |
| `Constant[c]`、真値な`c`（`0`・`""`を含む） | `:truthy` | 健全 —— 本物の値 |
| `Nominal[NilClass]`・`Nominal[FalseClass]` | `:falsey` | 健全 |
| `Nominal[C]`、`C`は`nil` / `false`でありえないクラス（`String`・`Time`・`Integer`…） | `:truthy` | **その名前的型が正直である限り**健全 —— §5を参照 |
| **`Nominal[Object]`・`Nominal[BasicObject]`・`Nominal[Kernel]`** | **`:truthy`** | **不健全** —— `nil.is_a?(Object)` / `false.is_a?(Kernel)`はどちらも真 |
| `Nominal[Comparable]`・`Nominal[Enumerable]` | `:truthy` | **健全** —— §6の訂正を参照 |
| `Singleton[C]`・`Tuple[…]`・`HashShape{…}` | `:truthy` | 居住性から健全 |
| 偽値メンバーを持たない`Union` | `:truthy` | 各メンバーの状態を継承する —— §5を参照 |
| `Constant[nil]` / `[false]`を含む`Union` | — | 正しく辞退する |
| `Top`・`Dynamic[T]`・`Bot` | — | 正しく辞退する |
| `Refined`・`Difference`・`IntegerRange` | — | 正しく辞退する（両断片が変更なしで返る） |

不健全なファミリーはちょうど`NilClass` / `FalseClass`の祖先である`Object`・`Kernel`・`BasicObject`だ。一般の「上位型」ではない —— `nil.is_a?(Comparable)`は`false`である。`class Object; include Foo; end`をするプロジェクトはこのファミリーを`Foo`だけ拡げるが、その残余はここでは計測していない。

`RbsTypeTranslator`はもっともらしい3つの入口をこのファミリーから外している: RBSの`untyped`と`interface`はどちらも`Dynamic`になり、`top` / `void`は`Top`になる。3つとも辞退する。

## 3. 手法

`rigor check --format json --workers 0 --no-baseline --no-cache --no-ci-detect`、cwdはターゲット、`BUNDLE_GEMFILE`はRigorのものを指し、Flakeの中で実行。計装したビルドが両方の消費者において、述語の型・判定・（暗黙の`nil` elseではなく）*書かれた*アームが落とされたか・`file:line`を記録した。

#152の評価で見つかった2つの罠は潰してある: `--no-baseline`（プロジェクトのベースラインはredmineだけで793件の診断を黙らせる）と`--no-cache`（実行結果のキャッシュキーはエンジンのソースから何も導かない —— [#285](https://github.com/rigortype/rigor/issues/285) —— ので、計装前の結果を再生してしまっていた）。

3つ目の罠はこの計測に固有であり、この調査が*ゼロ*と言うのを信頼できる理由でもある: **陽性コントロール**だ。条件の位置でローカルを`Nominal[Object]`として型付けするフィクスチャを同じハーネスに通すと、その記録は`UNSOUND`に分類されて返ってきた。つまり、コーパスに「いいえ」と言わせる前に、分類器は「はい」と言える。

## 4. コーパスでの計数

41,836件の`if` / `unless`述語の観測;**2,057件が判定に到達**（`:truthy` 1,404件、`:falsey` 653件）。

| カテゴリー | 発火数 | うち*書かれた*アームを落とすもの | 異なるサイト数 |
| --- | ---: | ---: | ---: |
| A1 —— 単一の`Constant`（本物の値） | 1,926 | 595 | 603 |
| A2 —— 単一の`Nominal[C]`、`C`は`nil`/`false`を許さない | 73 | 37 | 53 |
| A3 —— `Tuple` / `HashShape` / `Singleton` | 6 | 5 | 5 |
| **B —— `Nominal[Object` / `BasicObject` / `Kernel]`** | **0** | **0** | **0** |
| C —— nilフリーな値の`Union`（2メンバー以上、すべて真値） | 52 | 24 | 29 |

ターゲットごと（判定数;`w` = 書かれたアームを落としたもの）:

| ターゲット | A1定数 | A2名前的型 | A3シェイプ | B不健全な名前的型 | C nilフリーなユニオン |
| --- | --- | --- | --- | --- | --- |
| rigor `lib` | 285 (210w) | 24 (22w) | 0 | **0** | 7 (5w) |
| rigor plugins + examples | 83 (80w) | 3 (3w) | 0 | **0** | 13 (12w) |
| erubi | 1 (0w) | 0 | 0 | **0** | 0 |
| faraday | 3 (2w) | 2 (2w) | 0 | **0** | 0 |
| net-ssh | 13 (7w) | 1 (0w) | 0 | **0** | 0 |
| kramdown | 73 (17w) | 2 (0w) | 0 | **0** | 4 (0w) |
| liquid | 20 (18w) | 0 | 0 | **0** | 0 |
| mail | 654 (107w) | 2 (2w) | 0 | **0** | 14 (0w) |
| textbringer | 618 (63w) | 16 (3w) | 2 (2w) | **0** | 9 (2w) |
| redmine（`app lib`） | 137 (74w) | 21 (5w) | 3 (2w) | **0** | 1 (1w) |
| mastodon（`app lib`） | 39 (17w) | 2 (0w) | 1 (1w) | **0** | 4 (4w) |

**コーパス全体で、条件の型のどこかに`Object`が現れるのはちょうど1回だけ** —— rigorの`lib/rigor/analysis/runner.rb:1094`にある`Union[Constant[nil] | Nominal[Object]]`で、`nil`のアームがあるので辞退する。`Kernel`と`BasicObject`は一度もない。

構造的な理由は、Rigorの「分からない」を表すキャリアが`Nominal[Object]`ではなく`Dynamic`であることだ: 41,836件の述語のうち30,970件が`Dynamic`を運んでおり、`Dynamic`は辞退する。#286の前提 —— 「アノテーションのないパラメータや寛容なRBSの戻り値は頻繁に`Object`を与える」—— は、このエンジンには当てはまらない。

## 5. 調査が代わりに見つけたもの

カテゴリーA2とCは、仕様が`&&` / `||`について禁じているのと同じ賭けを、`if`の位置でしているものだ。`docs/internal-spec/inference-engine.md`（251行目）は、`RbsDispatch`がコアRBSの`%a{implicitly-returns-nil}`を意図的に尊重しないことを記録している —— `Hash#[]`は`V`、`Array#[]`は`Elem`、`Array#first`は`E`として読まれる —— それらを悲観的にするとRigor自身の`lib`で25件の偽陽性が実測されるからだ。そして帰結を導く: そのような値は**「証明ではなく楽観的」**であり、`flow.always-truthy-condition`と`&&` / `||`のゲートはそこから真値性を結論してはならない（MUST NOT）。`if` / `unless`の削除は同じ判断の3番目の消費者であり、その一節はそれを名指ししていない。

カテゴリーCの29の異なるサイトは、網羅的にサンプルした結果すべてが、動的キーのルックアップからのガードというイディオムだった:

```ruby
kana = HIRAGANA_TABLE[c]                                    # textbringer skk_input_method.rb:491
if kana then … else … end                                   #   書かれたelseアームが落ちる

if (supported_locale = SUPPORTED_LOCALES[locale.to_sym])    # mastodon languages_helper.rb:255, :272
elsif (regional_locale = REGIONAL_LOCALE_NAMES[…])          #   elsifとelseのアームが落ちる
else locale end

icon_name = ALERT_TYPE_TO_ICON_NAME[alert_type]             # redmine alerts_icons_scrubber.rb:49
return unless icon_name                                     #   ガードが決して通らないと判定される

handler = HANDLERS[command]                                 # rigor lib/rigor/cli.rb:91
return send(handler) if handler                             #   未知コマンドのガードが削除される

handler = TUPLE_HANDLERS[method_name]                       # rigor shape_dispatch.rb:240, :247
return nil unless handler                                   #   シェイプティア自身の委譲の契約
```

カテゴリーA2は、名前的型がクラスによってではなく楽観によってnilフリーであるところではどこでも同じ形を持つ: `face = Face[name]; ctx.highlight(…) if face`（textbringer `mode.rb:106`）、`singleton = env.singleton_for_name(candidate); return singleton if singleton`（rigor `reflection.rb:129`）、`hint = suggestion ? … : ""`で`suggestion`が`SpellChecker#correct(…).first`であるもの（rigor `config_audit.rb:73` —— `rigor type-of`は`String`と報告し、コアRBSは`Array#first`を`%a{implicitly-returns-nil} () -> E`と綴っている）。A2は本当に混在している: 53サイトのうちいくつかは正直にクラスで型付けされた値であり、そこでの削除は正しい。両者を分けるのはprovenanceだが、[ADR-78](../../adr/78-reflexive-overfold-always-truthy/)はこの判断についてのprovenanceタグをすでに却下している。

### masterで実演される偽陽性

```ruby
MAP = { a: "x", b: "y" }.freeze

def label_for(key)
  v = MAP[key]                     # "x" | "y" —— 楽観によってnilフリー
  n = if v then 1 else "none" end  # elseアームが落ち、nは1と型付けされる
  n.upcase                         # 実行時: キーが外れると "NONE"
end
```

```
$ rigor check optimistic.rb
optimistic.rb:7:5: error: undefined method `upcase' for 1
1 error(s) in 1 file(s)
```

このプログラムは動く。これは#152が`&&` / `||`のエッジに導入するとして見送られたのとまったく同じFPの機構であり —— すでに`if`のエッジでは出荷されていて、不誠実なアノテーションを一切使わずに到達できる。

コーパスは今のところこれを**表面化させない**。コーパス中のすべての`flow.always-*`診断（61件）を同じ`file:line`の調査記録と突き合わせると: 53件が判定と一致し、**53件すべてが本物の`Constant`に依拠している**;残りの8件はその行に`if` / `unless`の判定がまったくない（このルールはループやオペランドの位置でも発火する）。名前的型やnilフリーなユニオンに依拠するものはゼロだ。診断ルールはConstantでゲートされている（ADR-78 WD1）が、*削除*はそうではない。したがって今日の害はコーパス上の診断ではなく、静かに絞り込まれた型である —— まさに#152が置かれていた位置だ。

## 6. 訂正

#286の本文と[#152のノート](../20260805-issue-152-and-or-polarity-gate-fp-evaluation/)（§1の表）はどちらも`Nominal[Comparable]`を不健全な形状に挙げている。そうではない: `nil.is_a?(Comparable)`も`false.is_a?(Comparable)`もどちらも`false`なので、`Comparable`は本当に非偽値の境界である。不健全な集合は`Object`・`BasicObject`・`Kernel`であり、コアにはそれ以外にない。

## 7. 推奨

1. **スコープどおりの`falsey_nominal?`の絞り込みは着地させない**。このコーパスで発火ゼロということは、計測可能な利益もゼロ、計測可能なリスクもゼロだ。それは空集合を守る未テストのガードであり、#286の受け入れ基準（「新規診断ゼロ」）は空虚に満たされてしまう。健全性の衛生を理由になお着地させるのであれば、それは`predicate_certainty`に置き、`falsey_nominal?`や`narrow_falsey`には**置かない**こと: それらは`&&=` / `||=`とand/orの生き残る左辺のエッジ（`statement_evaluator.rb:382`/`:384`/`:1242`、`expression_typer.rb:661`）にも読まれており、そこでfalsey断片を広げると束縛されたローカルに`nil`が再び入り、`possible nil receiver`の発火を招く —— 偽陽性で支払う健全性の修正であり、ここでは誤ったトレードだ。
2. **実際に発火するもののほうへissueを組み直す**。未解決の問いは`Object`ではない;`if` / `unless`の削除がそもそも楽観的にnilフリーなキャリアに依拠してよいのか、である。一貫した答えは2つあり、どちらも差分ではなくADRの形をしている:
   - 仕様の除外をこの経路も名指しするよう拡張し、なぜここではその賭けが許容されるのかを意図的に述べる（現状の正直版）;または
   - 非`Constant`のキャリアに対して削除をやめる。これははるかに大きな挙動変更であり —— 2,057件の判定のうち131件、うち66件は書かれたアームを落とす —— しかも両方向のFP評価が必要になる。死んだアームを*生かしておく*こともまた、ユニオンへ型を再び入れることになるからだ。
3. いずれにせよ、仕様のこの一節はこの消費者について沈黙するのをやめるべきだ;今日それは、1つの判断の3人の読み手のうち2人しか制約していない。

## 8. 限界

- カテゴリーCとA2の分割はprovenanceではなく**形状**による。provenanceが記録されていないからだ。カテゴリーCの29サイトはそれぞれソースで読み、29件すべてがルックアップからのガードだった;A2の53サイトはサンプルであり、網羅ではない。
- この調査はソースのサイト数ではなく*評価*を数えている: 同じ`if`が2回以上評価される（メソッドの戻り値推論が本体に再突入する）ので、発火数が異なるサイト数を上回る。異なるサイト数のほうが保守的な数字だ。
- `Object`（あるいは`NilClass` / `FalseClass`）にモジュールをインクルードするプロジェクトは、不健全な名前的型のファミリーを3つのコアの名前を越えて拡げる。Railsはそれをする;mastodonやredmineでそのような発火は現れなかったが、分類器は3つのコアの名前しか知らなかった。
- `plugins/*/lib examples/*/lib`は`make check-plugins`に合わせて1つのターゲットとして実行した。
