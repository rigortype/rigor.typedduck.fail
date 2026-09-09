---
title: "区間ボキャブラリとしてのRuby範囲リテラル: IntegerとFloatの事実"
description: "rigortype/rigor docs/notes/20260908-ruby-range-notation-and-float-intervals.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260908-ruby-range-notation-and-float-intervals.md"
sourcePath: "docs/notes/20260908-ruby-range-notation-and-float-intervals.md"
sourceSha: "115e788f08aad6cf8bda70870637448a25a4c44a328fa3a1b91c4c56c84c88c2"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
translationStatus: "translated"
sidebar:
  order: 20266908
---

日付: 2026-09-08。[ADR-109](../../adr/109-ruby-native-range-notation/)の根拠ノート。以下のすべての事実は、このマシン上のFlakeのRuby（4.0.5）または`8ff3fe21`の`exe/rigor`で生成されたものです；再現コマンドは§ 8に記載されています。

## 1. `int<min, max>`という表記がどのように入り込んだか

| 日付 | コミット | 記載内容 |
| --- | --- | --- |
| 2026-04-27 | `4c678915`, `db0237ba` | ADR-1は「`int<1, 10>`のようなPHPStan形式の整数範囲の取り込み: 現時点では却下。RubyやRBSの命名により近づけるため、Rigorは`Integer[1..10]`のような独自の範囲表記を使用すべきである」と記録した。同じルールが`imported-built-in-types.md`に「PHPStan形式の`int<1, 10>`は当初エイリアスとして追加してはならない（MUST NOT）」として着地した。 |
| 2026-05-02 | `2ad0d4c6` | `Type::IntegerRange`が「PHPStanの`int<min, max>`ファミリーをモデルとして」出荷された；`describe`は`int<a, b>`を出力した。 |
| 2026-06-21 | `3a58eac3` | ドキュメントの矛盾スイープにより、仕様とコードの不一致がコード側に合わせて解決された: 「実装された`int<min, max>`形式はもはや禁止されない」。ADR-1の行と`rigor-extensions.md`の`Integer[1..]`行は触られなかったため、それ以降、拘束力のあるコーパスは自己矛盾を抱えることになった。 |

ADR-1を上書きする決定を記録したコミットは存在しません。この表記は初期実装の都合によるものでした。

## 2. 現在の表記におけるラウンドトリップの欠陥

`Type::IntegerRange#describe`は半開区間に対して`int<0, max>` / `int<min, -1>`を出力しますが、ペイロード文法（`Builtins::ImportedRefinements::Parser#parse_int_bound`）は符号付き整数リテラルしか受け入れません。診断結果の表記をシグネチャにコピーしたユーザーは、以下を受け取ることになります:

```
sig/foo.rbs:5:3: info: `RBS::Extended` directive payload could not be resolved: "rigor:v1:return: int<0, max>" [dynamic.rbs-extended.unresolved]
```

`int<10, 1>`はさらに悪化していました: `Type::IntegerRange#initialize`が例外を発生させ、Rubyファイル全体が`internal analyzer error`を報告し、それでも`rigor check`は終了コード0を返しました（個別の修正として追跡）。ハンドブック（`07-rbs-and-extended.md`）とマニュアル（`16-rbs-extended-annotations.md`）はどちらも入力形式として`int<min, max>`を提示していたため、この欠陥は隠されていたのではなく文書化されていました。

## 3. Integerに関する事実

| 式 | 結果 | 確定させること |
| --- | --- | --- |
| `(1..10).inspect`, `(1...10)`, `(1..)`, `(..10)`, `(...10)`, `(nil..nil)` | `1..10`, `1...10`, `1..`, `..10`, `...10`, `nil..nil` | すべての境界形状にRubyの表記が存在する；`Range#inspect`が表示形式となる |
| `(1...10).cover?(10)` | `false` | 排他的な終端 |
| `(1..10).to_a == (1...11).to_a` | `true` | Integerにおいて`a...b`と`a..b-1`は同一の集合である（PostgreSQLの`int4range`も同じように正規化する） |
| `(1..10) == (1...11)` | `false` | Range*オブジェクト*は等しくない；*集合*が等しい。型とは集合である |
| `(1..10).cover?(5.5)`, `(1..10) === 5.5` | `true`, `true` | 裸の範囲は「整数」を意味しない；クラスヘッドがそれを意味する |
| `(1..10).cover?(3r)` | `true` | 同様: `Rational`もカバーされる。`Integer[R]`はIntegerであることを表す |
| `(5..1).cover?(3)`, `(1...1).cover?(1)` | `false`, `false` | 空の範囲はRubyで明確に定義されている（かつ空集合である） |
| `(0..).cover?(2**64)` | `true` | モデル化すべき整数のオーバーフロー境界は存在しない |

## 4. Floatに関する事実

Float範囲が表す集合は`{x : Float | R.cover?(x)}`です。Rubyがあらゆる困難なケースを判定します:

| 式 | 結果 | `Float[R]`に対する結果 |
| --- | --- | --- |
| `(0.0..1.0).cover?(Float::NAN)` | `false` | 境界を持ついかなる範囲もNaNを除外する |
| `(0.0..).cover?(Float::NAN)` | `false` | 終端のない範囲も同様 |
| `(nil..nil).cover?(Float::NAN)` | `true` | 非有界範囲はNaNを含めた`Float`全体である；`Float[nil..nil]`は`Float`に正規化される |
| `(-Float::INFINITY..).cover?(Float::NAN)` | `false` | `Float[-Float::INFINITY..]`は「NaN以外のすべてのFloat」（`non-nan-float`）である |
| `(0.0..).cover?(Float::INFINITY)` | `true` | 終端なしは+∞で閉じている |
| `(0.0..Float::INFINITY).cover?(Float::INFINITY)` | `true` | `(0.0..)`と同一の集合 |
| `(0.0...Float::INFINITY).cover?(Float::INFINITY)` | `false` | `...Float::INFINITY`は+∞を除外する: 「有限」はRubyで表現可能な集合である |
| `(0.0...Float::INFINITY).cover?(Float::MAX)` | `true` | |
| `(-Float::INFINITY..Float::INFINITY).inspect` | `-Infinity..Infinity` | `Range#inspect`は`Float#inspect`を使用するが、これはRubyのソースコードではない；型言語は`Float::INFINITY`と表記する |
| `(-0.0..0.0).cover?(0.0)` | `true` | `-0.0`と`0.0`は順序において同一の点である |
| `(0.0...0.0).cover?(0.0)` | `false` | 空 |
| `Float::MIN` | `2.2250738585072014e-308` | 最小の正の*正規化*倍精度実数であり、非正規化数はさらに小さい。境界キーワードとしての`min`は誤解を招く；これはPHPStanの`PHP_FLOAT_MIN`の罠である |
| `0.0.next_float`, `Float::MAX.next_float`, `1.0.prev_float` | `5.0e-324`, `Infinity`, `0.9999999999999999` | Rubyは後続関数を提供する；開いた境界は閉じた境界に正規化される |
| `(1.0...2.0).cover?(1.0..2.0.prev_float)` | `true` | `[a, b)` = `[a, prev_float(b)]` |
| `(0.1..0.2).cover?(0.1)` | `true` | 境界は実数ではなく倍精度浮動小数点数である: リテラル`0.1`はアノテーション時と実行時で同一の倍精度実数である |
| `Float::NAN == Float::NAN`, `Float::NAN.eql?(Float::NAN)`, `[Float::NAN].include?(Float::NAN)` | `false`, `false`, `true` | NaNに対する値の等価性は反射的ではない；`ValueSemantics`の下での`Constant<NaN>`キャリアは健全でなくなる。NaNが決して`Constant`にならない理由である |
| `1 <=> Float::NAN` | `nil` | |

Rubyの`Range`には排他的な**終端**があり、排他的な**始端**はありません。`x > c`の真側エッジである集合`(c, +∞]`にはRubyリテラルがありません；その正準な閉じた形式は`c.next_float..`です。

## 5. RubyのFloatにおいて実際に何が問題になるか

PHPが開いた下限境界を求める動機はゼロ除算と`log(0)`です。Rubyにおける危険はNaNと無限大であり、閉じた境界および`nan?` / `finite?`の絞り込みがそれに対処します。

| 式 | 結果 |
| --- | --- |
| `1.0 / 0.0`, `1 / 0.0`, `1.0 / 0` | `Infinity`（例外なし） |
| `0.0 / 0.0` | `NaN` |
| `1 / 0` | `ZeroDivisionError`（Integerのみ） |
| `Float::NAN.to_i`, `Float::INFINITY.to_i`, `Float::NAN.round`, `Float::INFINITY.floor`, `Integer(Float::NAN)`, `Float::NAN.to_r` | `FloatDomainError` |
| `Math.sqrt(-1.0)`, `Math.log(-1.0)`, `Math.acos(2.0)` | `Math::DomainError` |
| `Math.log(0.0)` | `-Infinity`（例外なし） |
| `JSON.generate(Float::NAN)`, `JSON.generate([Float::INFINITY])` | `JSON::GeneratorError` |
| `[3.0, Float::NAN, 1.0].sort`, `[Float::NAN, 1.0].max`, `Float::NAN.clamp(0.0, 1.0)` | `ArgumentError: comparison of Float with … failed` |
| `"#{Float::NAN}"` | `"NaN"`（警告なし；PHP 8.5はここで警告する） |

## 6. Rangeリテラルを区間としてすでに受け取っているコアAPI

| 呼び出し | 結果 |
| --- | --- |
| `rand(0.0...1.0)` | `[0.0, 1.0)`内の`Float`；`rand(1.0..2.0)`は閉じた終端を尊重する |
| `Random.rand(1.0..Float::INFINITY)`, `rand(1..)`, `Random.rand(0.0..)` | `Errno::EDOM`: 非有界な区間は実行時に拒絶される |
| `0.5.clamp(0.0..1.0)` | `0.5`；`0.5.clamp(0.0...1.0)`および`5.clamp(1...10)`は`ArgumentError: cannot clamp with an exclusive range`を発生させる |
| `case 5 in 1..10` | マッチする（`Range#===`は`cover?`である） |
| `(1..10).step(0.5).first(3)` | `[1.0, 1.5, 2.0]` |

## 7. エンジンがRuby範囲リテラルに対してすでに行っていること

- `Narrowing#case_equality_integer_range`（`lib/rigor/inference/narrowing.rb` ~L2291）は`when`の範囲リテラルを読み取り、`exclude_end?`を`high - 1`として尊重し、欠落している終端をキャリアの無限大にマップします。`spec/rigor/inference/narrowing_spec.rb` L1195–L1225は`1..10` → `int<1, 10>`、`1...10` → `int<1, 9>`、`(100..)` → `int<100, max>`を固定しています。エンドツーエンドでは、`case n when 1...10`の本体における`rigor type-of`は`int<1, 9>`を報告します。
- `ExpressionTyper#type_of_range`はリテラル終端の範囲を`Constant<Range>`として保持します（`1..10`、`1...10`、`0.0..1.0`はいずれもそれらの`Range#inspect`として表示されます）；ADR-3のキャリアはすでにFloat終端の範囲を受け入れています。
- `IteratorDispatch`および`BlockFolding`は`Range#each` / `inject`に対して`exclude_end?`を尊重します。
- 現時点では畳み込まれないもの（ギャップとして記録されており、ADR-109の一部ではありません）: `n.clamp(1, 9)`が`int<1, 9>`であるのに対して`n.clamp(1..9)`は`Dynamic[top]`である；`rand(0.0...1.0)`は`Range[Integer] -> Integer?`オーバーロードを選択して`Integer?`と型付けする；`x > 0.0`および`x.nan?`は（仕様に従い、意図的に）絞り込まれない。

## 8. 再現手順

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command ruby -e '
  p (0.0..1.0).cover?(Float::NAN), (nil..nil).cover?(Float::NAN), (-Float::INFINITY..).cover?(Float::NAN)
  p (0.0...Float::INFINITY).cover?(Float::INFINITY), Float::MIN, 0.0.next_float, (1..10).cover?(5.5)
  p (1.0...2.0).cover?(1.0..2.0.prev_float), Float::NAN.eql?(Float::NAN), [Float::NAN].include?(Float::NAN)'
nix --extra-experimental-features 'nix-command flakes' develop --command bundle exec ruby -Ilib -e '
  require "rigor"
  %w[int<1,\ 10> int<0,\ max> Integer[1..10]].each { |s| p [s, Rigor::Builtins::ImportedRefinements.parse(s)&.describe] }'
```

`8ff3fe21`で実行された2番目のコマンドは、`["int<1, 10>", "int<1, 10>"]`、`["int<0, max>", nil]`、`["Integer[1..10]", nil]`を出力します。
