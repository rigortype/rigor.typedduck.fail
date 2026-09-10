---
title: "ADR-109 — 数値範囲リファインメントの記法およびセマンティクスとしてのRuby範囲リテラル"
description: "rigortype/rigor docs/adr/109-ruby-native-range-notation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/109-ruby-native-range-notation.md"
sourcePath: "docs/adr/109-ruby-native-range-notation.md"
sourceSha: "b272907aa680b86ec8709b64dc348bc27e517a2dd1ebef16797857e5e2d3195c"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
translationStatus: "translated"
sidebar:
  order: 4109
---

Status: **Accepted, 2026-09-08 — スライス1はこのADRとともに[#830](https://github.com/rigortype/rigor/pull/830)で着地；スライス2は2026-09-09に着地**。スライス1は`Integer`に関するADR-1の決定を復活させます。キャリアは`Integer[1..10]` / `Integer[0..]` / `Integer[..-1]`を表示し、`%a{rigor:v1:…}`文法も同じ綴りを受け入れ、`int<a, b>`はもはや何も出力しない非推奨の入力エイリアスとして受け入れられ続けます。スライス2は`Float[R]`キャリア（`Type::FloatRange`）を`non-nan-float` / `finite-float`とともに追加します。スライス3（2026-09-09着地）は§ WD5の真側比較絞り込み、`nan?` / `finite?`、およびガード後の結合を1つの集合に保つユニオン吸収を追加します。§ WD3の非推奨診断は2026-09-09に[#854](https://github.com/rigortype/rigor/pull/854)で着地し、Floatの畳み込み（`rand`、単調な`Math`関数、`abs`、`clamp`、有界なFloatの整数変換）も同日に着地して、[#831](https://github.com/rigortype/rigor/issues/831)をクローズしました。アーキタイプ: 審議型（deliberative）。ステークス: 中 — アノテーション文法は公開サーフェスであるため（[ADR-50](../50-release-engineering-and-stability-strategy/) WD1）、古い入力形式には非推奨期間が与えられます。表示は契約ではありません。Float部分はNaNを通じて健全性エンベロープに触れるため、ここでは設計レベルでのみ確定されます。

根拠: [`docs/notes/20260908-ruby-range-notation-and-float-intervals.md`](../../notes/20260908-ruby-range-notation-and-float-intervals/)（ドリフトのタイムライン、ラウンドトリップの欠陥、および以下で引用されるRuby 4.0.5のすべての事実と再現コマンド）。

## 背景

[ADR-1](../1-types/)はPHPStanの`int<1, 10>`を却下し、「RubyおよびRBSの命名により近づけるため」に範囲表記として`Integer[1..10]`を指定しました。しかし5日後に出荷されたキャリア（`2ad0d4c6`）はそれでも`int<min, max>`を出力し、2026-06-21のドキュメント矛盾スイープ（`3a58eac3`）はコード側に合わせて不一致を解消し、ADR-1の却下行と`rigor-extensions.md`の`Integer[1..]`行をそのまま残してしまいました。それ以降、拘束力のあるコーパスは自己矛盾を抱えており、ADR-1を上書きする決定を記録したコミットは存在しません。

インポートされた綴りは、それ自体の観点からも破綻していました:

- **ラウンドトリップしない**。`describe`は`int<0, max>`を出力しますが、文法は境界として整数リテラルしか受け入れないため、診断結果をシグネチャにコピーすると`dynamic.rbs-extended.unresolved`が発生します。ハンドブックとマニュアルでは入力形式として`int<min, max>`が文書化されていました。
- **`Float`に拡張できない**。境界キーワードとしての`min` / `max`は、Rubyistには`Float::MIN` / `Float::MAX`と読めますが、`Float::MIN`は最小の正の*正規化*倍精度浮動小数点数であり、何かの下限ではありません。また、Floatの区間には`..`と`...`がすでに表している閉区間／半開区間の区別が必要ですが、`int<a, b>`にはそのためのスロットがありません。仕様にある「将来の`finite-float`または非NaNの証明」を着地させる記法がありませんでした。
- **Rubyがすでにセマンティクスを保有している**。`Range#cover?`は、Float区間が引き起こすあらゆる困難なケース（NaN、±∞、`-0.0`、終端排他、非有界範囲）を判定します。そして`rand(0.0...1.0)`、`x.clamp(0.0..1.0)`、`case x in 1..9`は、Rubyプログラマーがまさにこれらの集合に対して使うイディオムです。エンジンはすでに`when 1...10`を`int<1, 9>`として読み取っています。

## 決定

**値の集合がRubyリテラル自体の述語が受け入れるものと完全に一致するリファインメントは、そのリテラルで表記され、その述語によって定義される**。インポートされた表記（`non-empty-string`、`positive-int`）は、Rubyがその集合のリテラルを持たない場合にのみ保持されます。ここに適用すると、数値範囲はRubyの`Range`リテラルであり、集合は`Range#cover?`が判定するものになります。

数値クラス`C`（現在は`Integer`、スライス2で`Float`）とRubyの`Range`リテラル`R`に対して:

```
C[R]  =  { x | x.is_a?(C) && R.cover?(x) }
```

`R`はRubyの表記どおりに書かれます: `Integer[1..10]`、`Integer[1...10]`、`Integer[1..]`、`Integer[..-1]`、`Integer[nil..nil]`。クラスヘッドは必須です。`(1..10).cover?(5.5)`はtrueになるため、裸の範囲リテラルは整数を意味せず、エンジンはすでに`Range`の*値*（`Constant<Range>`）に対して裸の`1..10`を出力しています。

### 作業上の決定

**WD1 — Integerの正準形**。キャリアは閉じた境界を持つ`Type::IntegerRange`のままです。`Integer[a...b]`は`Integer[a..b-1]`に正規化されるため（Ruby: `(1...10).to_a == (1..9).to_a`）、表示は常に閉区間になります。欠落または`nil`の終端は記号的な無限大です。普遍的な範囲は`int`ではなく`Integer`と表示されます。ADR-1の4つのエイリアス`positive-int`、`non-negative-int`、`negative-int`、`non-positive-int`は入力名として残り、それらの範囲において優先される表示であり続けます。空の範囲（`Integer[5..1]`、`Integer[1...1]`）は、`bot`に解決されるのではなく、解決不能なペイロードとして**拒否（decline）**されます。すべての呼び出し元を暗黙にデッドコードにしてしまうタイポは、このリポジトリが最も警戒する偽陽性だからです。

**WD2 — 文法の配置場所**。`Builtins::ImportedRefinements::Parser`に`TypeNode::RangeLiteral`リーフが追加されます（値は`Range`オブジェクトそのものであるため、`begin` / `end` / `exclude_end?`の表現は1つになります）。`parse_single_type_arg_ast`は裸の整数の前に範囲の形状を試行します。リゾルバは、RBSの`Nominal`フォールバックの前に、単一の`RangeLiteral`引数を持つ`Integer`ヘッドを処理します（`Resolver#try_range_head_builder`）。他のヘッドの下では、リテラルは他のリーフリテラルと同様に`Constant<Range>`にリフトされるため、プラグインリゾルバ（[ADR-13](../13-typenode-resolver-plugin/)）がそれを消費できます。

**WD3 — 非推奨のエイリアス**。`int<a, b>`は1つの非推奨期間にわたって文法に受け入れられ続けますが、二度と出力されることはありません。ADR-50 WD7の警告期間ステップは`dynamic.rbs-extended.deprecated-form`情報診断であり、書くべき`Integer[a..b]`の綴りを指名するアノテーション1行につき1件発行されます。削除は次の後方互換性破壊のタイミングで行われます。診断テキストは非契約であるため（ADR-50 § 決定3）、表示の変更はマイナーリリースで出荷されます。`int<`とマッチしていたメッセージモードのベースラインは再生成されます。

**WD4 — `Float[R]`（スライス2、設計）**。`Type::FloatRange`キャリアは2つの倍精度浮動小数点数（±`Float::INFINITY`は通常の値であり、決して`nil`ではありません）と`exclude_end`を保持します。Rubyには排他的な開始点がないため、排他的なbeginはありません。終端はIntegerまたはFloatリテラル（`(0..1).cover?(0.5)`のようにIntegerは強制型変換されます）、`Float::INFINITY`、`-Float::INFINITY`、`Float::MAX`、`-Float::MAX`、または省略です。`(nil..nil).cover?(Float::NAN)`はtrueであるため、`Float[nil..nil]`は`Float`に正規化されます。他のすべての範囲は、`cover?`が比較を行うためNaNを除外します。人々が最も意図する範囲のために、2つの名前が予約されています:

| 名前 | 範囲 | 集合 |
| --- | --- | --- |
| `non-nan-float` | `Float[-Float::INFINITY..]` | NaNを除くすべてのFloat |
| `finite-float` | `Float[-Float::MAX..Float::MAX]` | NaNおよび±∞を除くすべてのFloat |

表示は、WD1が`positive-int`に対して行うように名前を優先します。範囲形式がその定義です。個別の「NaN性」キャリアは存在しません。NaNの除外はすべての有界範囲の特性であるため、「Float範囲か`non-nan-float`か」という二者択一ではなく、後者は前者のエイリアスです。`Float::NAN`は決して`Constant`キャリアにはなりません（`Float::NAN.eql?(Float::NAN)`はfalseであり、これは`ValueSemantics`が表現できません）。`x.nan?`の真側エッジはそのエントリー型を維持します。

**WD5 — Floatの絞り込み（スライス3、設計）**。比較の絞り込みは真側エッジのみです: `x < c` → `Float[...c]`、`x <= c` → `Float[..c]`、`x >= c` → `Float[c..]`、`x > c` → `Float[c..]`。最後は厳密な集合`(c, ∞]`よりも倍精度1つ分広い閉じたエンベロープです。厳密な形式`Float[c.next_float..]`も存在し（Rubyは`Float#next_float`を提供しています）、削除された点を要求するルールが現れるまで延期されます。偽側エッジはすべての場合でエントリー型を維持します。`!(x > c)`にはNaNが含まれるためです。`x.nan?`の偽側 → `non-nan-float`、`x.finite?`の真側 → `finite-float`。代数（包含、join、meet）は`next_float` / `prev_float`を通じて正準な閉じた倍精度浮動小数点数上で実行されます。表示は記述された`...`を維持します。これはPHPStanのfloat-range提案が到達した区間モデル（[phpstan/phpstan#6963](https://github.com/phpstan/phpstan/issues/6963)）を反映していますが、RubyのリテラルにはなくRubyの危険性に対しても必要のない開いた開始点は除外されています。`1.0 / 0.0`は`Infinity`であり、例外を発生させるのはNaNまたは±∞に対する`to_i` / `round` / `JSON.generate` / `sort`です。

**WD6 — 仕様の配置場所**。名前と`cover?`の定義: `imported-built-in-types.md`。文法: `rbs-extended.md`。カタログ行: `rigor-extensions.md`。表示規約: `docs/types.md`（数値クラスの後の角括弧はRubyの範囲リテラルを保持する）。スライス2/3のすべての形式は、着地するまで[ADR-92](../92-normative-status-fidelity/)に従って*Reserved（本稿執筆時点）*マーカーを担持します。

## 却下された代替案

| 代替案 | 却下の理由 |
| --- | --- |
| `int<min, max>`を維持し、`float<min, max, closed-open>`を追加する | 基準を満たさない。`min`は`Float::MIN`と誤読される。第3引数の境界ボキャブラリは`...`を再発明することになる。一方通行の構文が残る |
| 型としての裸の範囲リテラル（`1..10`） | `Constant<Range>`の表示と衝突する。また`(1..10).cover?(5.5)`はtrueであり、リテラルは「整数」を表していない |
| ハイブリッドな`int<1..10>` | Rubyに存在しないヘッドを維持してしまう。リテラルが境界を表す以上、山括弧は何の情報も伝えない |
| ISO区間表示`float<[0.0, 1.0)>` | Rubyらしくなく、アノテーションを読み戻す文法によってパースできない。PHPStanのレビューではそのギャップが重大（Major）と指摘された |
| 「非NaN」としての`Float[nil..nil]` | Rubyでは非有界範囲はNaNをカバーすると定めている。型は直感ではなく`cover?`に従う |
| 空の範囲が`bot`に解決される | タイポがあらゆる呼び出し元でデッドコードになってしまう。代わりに拒否する |
| floatモデルを`Rational` / `Complex`に拡張する | `Complex`には順序がない。`Rational`は厳密であり、独自のADRを取得する可能性がある |

## 結果

- **利点**。表示と入力がパース可能な単一の綴りになります。`Float`は新しいボキャブラリなしで表記と定義を取得します。記法は`case/when`、`rand`、`clamp`、および`Range#cover?`と一致するため、ハンドブックはRubyistが知らないことを何も教えずに済みます。
- **欠点**。シグネチャに`int<a, b>`を持つ採用者には非推奨サイクルが発生します。`int<`とマッチしていたメッセージモードのベースラインは再生成が必要です。PHPStan付録は範囲に関する「同一の構文」の行を失います。スライス1においてlib、spec、docs全体で約200箇所の変更が生じます。
- **持ち越し**。スライス2/3の追跡issue。`dynamic.rbs-extended.deprecated-form`診断。根拠ノートで言及された`n.clamp(1..9)`および`rand(0.0...1.0)`の畳み込み。

## 他のADRとの関係

[ADR-1](../1-types/)がこの決定を下しました。本ADRはそれを復活させ、定義を追加します。
[ADR-3](../3-type-representation/)はキャリア（`IntegerRange`、将来の`FloatRange`、`Constant<Range>`値）を所有します。[ADR-5](../5-robustness-principle/)は範囲を保持する価値がある理由です。
[ADR-13](../13-typenode-resolver-plugin/)は新しいリーフが参加する`TypeNode` ASTを所有します。
[ADR-50](../50-release-engineering-and-stability-strategy/)は非推奨期間を設定します。
[ADR-92](../92-normative-status-fidelity/)は予約マーカーのイディオムを提供します。
[ADR-107](../107-checked-types-and-typeless-comments/)は1段下の同じ価値観です。書かれた型はRigorが読み戻せる型でなければなりません。
