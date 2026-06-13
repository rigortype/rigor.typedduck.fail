---
title: "PHPStan 内部型演算（TypeCombinator / TypeUtils / 二項演算評価）と Rigor の比較"
description: "Imported from rigortype/rigor docs/notes/20260603-phpstan-type-algebra-comparison.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260603-phpstan-type-algebra-comparison.md"
sourcePath: "docs/notes/20260603-phpstan-type-algebra-comparison.md"
sourceSha: "fa7dec8040e6bdefda2b759f4fb5be9e5867203dd47aaf1ea32e93317b5db5f3"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
sourceDate: "2026-06-03T16:35:56+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266603
---

**Status:** research note, no design commitments. プラグインレベルでの型演算ギャップ調査。
**Date:** 2026-06-03.
**Rigor version:** working tree（v0.1.x系、master @ `7d8000e6`）に対する観察。
**PHPStan version:**配布pharは`references/phpstan`（`2.1.39-767`）にvendor済みだが**ソースは入っていない**（pharのみ）。内部クラスの引用はupstream
[`phpstan/phpstan-src`](https://github.com/phpstan/phpstan-src)の`2.1.x`ブランチを直接参照した。`references/phpstan`を再grepしても`TypeCombinator.php`等は見つからない点に注意。

**Why:**「プラグインレベルでPHPStanと同水準の型演算をしたい」という要求に対し、両者の型代数（type algebra）サーフェスを突き合わせ、Rigor側に不足している実装とテストカバレッジを特定するための土台。後続の移植検討／ADR起票はこのノートを根拠にする。

**読み順.** §1がPHPStan側のサーフェス棚卸し、§2がRigor側マッピング表、§3がギャップ分析（プラグイン視点）、§4がテストカバレッジ観点、§5がADR要否の判断。`file:line`引用はRigor作業ツリー / phpstan-src 2.1.xに対するもので、±数行ずれうる。引用前に再grepすること。

---

## 0. 一段落オリエンテーション

PHPStanの型演算は**3層**に分かれる。（1）型オブジェクトの代数を扱う静的ファサード`TypeCombinator`（union/intersect/remove）と`TypeUtils`（抽出ヘルパ群）、（2）各型が実装する`Type`インターフェース本体のメソッド群（`isSuperTypeOf` / `accepts` / `is*()`述語 / `get*()`抽出 / `to*()`強制変換 / offsetアクセス）、（3）AST上の二項演算を`MutatingScope`が評価するロジック（定数スカラの実評価＋`IntegerRangeType`の抽象範囲算術＋union直積分配）。プラグインはこの3層すべてを呼べるうえ、**二項演算の結果型を宣言する専用拡張点`OperatorTypeSpecifyingExtension`**を持つ。

Rigorも対応する3層を持つ — `Type::Combinator`（[`lib/rigor/type/combinator.rb`](../../lib/rigor/type/combinator.rb)）、各キャリアの`accepts` / capability predicate / projection（[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)）、`ConstantFolding`の二項演算評価（[`lib/rigor/inference/method_dispatcher/constant_folding.rb`](../../lib/rigor/inference/method_dispatcher/constant_folding.rb)）。代数ファサードと関係演算はほぼ同水準だが、**プラグインから二項演算の結果型を差し込む拡張点が存在しない**点が最大の構造的ギャップである。

---

## 1. PHPStan側のサーフェス棚卸し

### 1.1 `TypeCombinator`（正規化付き型代数ファサード）

`PHPStan\Type\TypeCombinator`のpublic staticメソッド：

| メソッド | 役割 |
| --- | --- |
| `union(Type ...$types): Type` | 正規化union。重複除去・subtype吸収（supertypeが勝つ）・定数スカラの集約（`true|false → bool`）・`string[]|int[] → (string|int)[]`のiterableマージ・定数配列の併合と過剰時のgeneralize |
| `intersect(Type ...$types): Type` | 正規化intersect。union上に分配（`A & (B|C) → (A&B)|(A&C)`）、矛盾は`NeverType`、subtypeが勝つ |
| `remove(Type $from, Type $toRemove): Type` | 型差分。全消去で`NeverType` |
| `removeNull` / `addNull` / `containsNull` | null専用の便宜ラッパ |
| `removeTruthy` / `removeFalsey` | 真偽値によるnarrowing補助 |
| `countConstantArrayValueTypes` | 定数配列の値エントリ総数（generalize閾値判定用） |

正規化の要点：implicit-never除去 → benevolent union展開 → ネストunion平坦化 → スカラ集約 → enum case分離 → iterableマージ → subtype吸収 → 配列処理（`processArrayTypes`、値数が上限超でgeneralize）。

### 1.2 `TypeUtils`（抽出ヘルパ群）

2.xでは多くが`Type`本体のメソッドへ移管され、`TypeUtils`側は縮小済み。現存する主なもの：`getConstantIntegers`, `getIntegerRanges`, `toBenevolentUnion`, `toStrictUnion`, `flattenTypes`（power-set展開、巨大時に最適化）, `findThisType`, `findCallableType`, `getHasPropertyTypes`, `getAccessoryTypes`, `containsTemplateType`, `resolveLateResolvableTypes`。`getConstantStrings`等の素朴な抽出はインターフェースの`getConstantStrings(): list<ConstantStringType>`に移った。

### 1.3 `Type`インターフェース本体の演算サーフェス

これが「型演算」の本体。プラグインは`Scope->getType($expr)`で得た`Type`に対し直接呼ぶ。

- **関係演算**：`isSuperTypeOf(Type): IsSuperTypeOfResult`（**プラグインが型問い合わせに使う推奨API** —「`$this`の値集合が引数を包含するか」）、`accepts(Type, bool $strictTypes): AcceptsResult`（PHPの暗黙強制を加味した代入可否。`FloatType`が`IntegerType`をacceptする等、意味が複雑なので型判定には不向き）、`equals(Type): bool`。
- **3値述語（`TrinaryLogic`を返す）**：`isString` / `isInteger` / `isFloat` / `isBoolean` / `isArray` / `isList` / `isCallable` / `isObject` / `isEnum` / `isNull` / `isScalar` / `isOffsetAccessible` … および`isNumericString` / `isNonEmptyString` / `isNonFalsyString` / `isLiteralString` / `isLowercaseString` / `isClassString`のような**精密string述語**。
- **定数抽出**：`getConstantScalarTypes` / `getConstantScalarValues` / `getConstantStrings` / `getConstantArrays` / `isConstantScalarValue`。
- **強制変換`to*()`**：`toBoolean` / `toNumber` / `toInteger` / `toFloat` / `toString` / `toArray` / `toArrayKey` / `toBitwiseNotType` / `toAbsoluteNumber` / `toCoercedArgumentType`。**これらは型→型の純関数**で、二項演算評価や`(string)$x`等のキャスト解決に使われる。
- **offsetアクセス**：`hasOffsetValueType(Type): TrinaryLogic`, `getOffsetValueType(Type): Type`, `setOffsetValueType(?Type,Type,bool): Type`, `setExistingOffsetValueType`, `unsetOffset`。配列操作`getKeysArray` / `getValuesArray` / `sliceArray` / `popArray` / `flipArray` … が型レベルで多数。
- **精度管理**：`generalize(GeneralizePrecision): Type`（型が複雑化しすぎたとき定数情報を落とす）。

`TrinaryLogic`（`yes`/`no`/`maybe`、`createYes`等）が述語・関係演算の共通戻り値で、union/intersectionに内在する不確実性を表現する。

### 1.4二項演算の評価（`MutatingScope`）

ASTの`Expr\BinaryOp\*`（`Plus` / `Minus` / `Mul` / `Div` / `Mod` / `Pow` / `Concat` / 比較 / ビット演算）を`MutatingScope::getType()`内で評価する。要点：

1. **定数スカラの実評価**：両辺が定数スカラなら、PHPの演算子で実際に計算して`ConstantIntegerType` / `ConstantFloatType` / `ConstantStringType`を生む。`int`オーバーフロー時は`float`に昇格。
2. **`IntegerRangeType`の抽象範囲算術**：`int<1,5> + int<10,20> → int<11,25>`のように、定数でなくても範囲同士で加減乗除・比較を計算する。`IntegerRangeType`自体が範囲演算メソッドを持つ。
3. **union直積分配**：オペランドがunionなら各メンバの直積で評価してunionに畳む。
4. **文字列連結`Concat`**：定数なら定数文字列、そうでなければ`numeric-string` / `non-empty-string`等の精密string型へ。
5. これらの結果は最終的に`TypeCombinator::union`で正規化される。

### 1.5 `OperatorTypeSpecifyingExtension`（**プラグイン向け二項演算フック**）

```php
interface OperatorTypeSpecifyingExtension
{
    public function isOperatorSupported(string $operatorSigil, Type $leftSide, Type $rightSide): bool;
    public function specifyType(string $operatorSigil, Type $leftSide, Type $rightSide): Type;
}
```

GMP / BCMath / Moneyなど**演算子をオーバーロード（あるいは演算子的に振る舞う）オブジェクト型**に対し、二項演算の結果型をプラグインが宣言できる。configの`phpstan.neon`で
`tags: [phpstan.broker.operatorTypeSpecifyingExtension]`として登録する。**これが「プラグインレベルの二項演算型演算」の中核**であり、Rigorに直接対応物がない。

### 1.6プラグインの型構築イディオム

`new ObjectType(...)` / `new ConstantStringType('x')` / `new UnionType([...])`を直接`new`できるが、公式ガイドは「非正準形は単純化すべき」として**構築後は必ず`TypeCombinator::union/intersect`で正規化する**ことを推奨（直接`new UnionType`だと`string&int`のような不正型を作りうる）。カスタム型を作る場合は`describe` / `equals` / `isSuperTypeOf` / `accepts`の実装が必須で、`isSuperTypeOf`を`TypeCombinator`経由で厳密にテストせよ、とされる。

---

## 2. Rigor側マッピング

| PHPStan | Rigor対応 | 所在 | 状態 |
| --- | --- | --- | --- |
| `TypeCombinator::union` | `Type::Combinator.union` | [`combinator.rb:363`](../../lib/rigor/type/combinator.rb) | ✅ 同等（決定論的正規化 + lattice恒等則） |
| `TypeCombinator::intersect` | `Type::Combinator.intersection` | [`combinator.rb:325`](../../lib/rigor/type/combinator.rb) | ✅ 同等 |
| `TypeCombinator::remove` | `Type::Combinator.difference`（`T - U`演算子） | [`combinator.rb:123`](../../lib/rigor/type/combinator.rb) | ✅ Rigorは明示的差分演算子を持ち、診断表示も`D - U`形を持つ（[type-operators.md](../../type-specification/type-operators/)）。むしろPHPStanより表現が厚い |
| `removeNull`/`addNull`/`containsNull` | `difference(t, nil)` / `union(t, nil)` / `nil_value`述語 | combinator + 述語 | ⚠️ 導出可能だが**専用便宜メソッドは未提供** |
| `removeTruthy`/`removeFalsey` | （narrowingはCFA側） | [control-flow-analysis.md](../../type-specification/control-flow-analysis/) | ⚠️ 型代数ファサードとしては未公開 |
| `Type::isSuperTypeOf` | `Type#accepts(other, mode:)` → `AcceptsResult` | 各キャリア`accepts`（例[`constant.rb:114`](../../lib/rigor/type/constant.rb)） | ✅ gradual consistencyとして実装。厳密subtype（`subtype_of`）はslice 5+ で`SubtypeResult`予定 |
| `Type::accepts` | `Type#accepts` | 同上 | ✅ gradual mode実装、strict mode予約 |
| `TrinaryLogic` | `Rigor::Trinary`（yes/no/maybe） | — | ✅ 同等 |
| `is*()`述語群 | capability predicates（`string` / `integer` / `array` / `callable` …） | [internal-type-api.md](../../internal-spec/internal-type-api/) | ✅ 概ね同等。ただしPHPStanの精密string述語（`isNumericString` / `isLowercaseString`等）はRigorではRefinedキャリア + 述語ID側に分散 |
| `getConstant*`抽出 | projections（`constant_strings` / `constant_integers` …） | internal-type-api.md | ✅ 同等 |
| `IntegerRangeType`範囲算術 | `try_fold_binary_range`ほか（additive / multiply / divide / comparison、corner計算 + `0×∞=0`等の代数的配慮） | [`constant_folding.rb:800`](../../lib/rigor/inference/method_dispatcher/constant_folding.rb) | ✅ **同等水準**。範囲 × 範囲の四隅積・除算ガード・無限端処理まで実装済み |
| 定数スカラ実評価（二項演算） | `ConstantFolding`（NUMERIC_BINARY / STRING_BINARY等の許可リスト + 実`send`） | constant_folding.rb | ✅ 同等。受け手/引数が`Constant`か`Union[Constant]`で許可リスト内なら実評価、外れたら`Dynamic[top]`にfail-soft |
| union直積分配（二項演算） | ConstantFoldingのCartesian fold（`UNION_FOLD_INPUT/OUTPUT_LIMIT`） | constant_folding.rb | ✅ 同等（入出力上限あり） |
| `to*()`強制変換（型→型純関数） | — | — | ❌ **型オブジェクトメソッドとして未公開**。キャスト/coerceはConstantFolding内部に閉じている |
| offsetアクセス（`getOffsetValueType`等） | `indexed_access`型関数 + ShapeDispatch（Tuple/HashShapeの`[]`/`fetch`/`dig`） | [`shape_dispatch.rb`](../../lib/rigor/inference/method_dispatcher/shape_dispatch.rb), [type-operators.md](../../type-specification/type-operators/) | ⚠️ エンジン内部では精密。**プラグインから呼べるoffsetファサードは`indexed_access`程度に限定** |
| `generalize(precision)` | `normalize`（冪等正規化）のみ | normalization.md | ⚠️ 精度を**意図的に落とす** generalizeは未提供（union/出力上限による暗黙widenはある） |
| **`OperatorTypeSpecifyingExtension`** | — | — | ❌ **対応物なし**。プラグインの二項演算フックが存在しない |
| プラグインの型構築facade | `services.type`（= `Type::Combinator`） | [`services.rb:43`](../../lib/rigor/plugin/services.rb) | ✅ 正規化必須のfacadeを注入（PHPStanの「`new`より`TypeCombinator`」方針と一致） |

プラグイン拡張点（[`plugin/base.rb`](../../lib/rigor/plugin/base.rb)）は`node_rule`（86, 137行）/ `dynamic_return`（210行）/ `type_specifier`（239行）/ `producer`（86行）。PHPStanの`DynamicMethodReturnTypeExtension` ≈ Rigor `dynamic_return`、`TypeSpecifierExtension` ≈ `type_specifier`。**`OperatorTypeSpecifyingExtension`に対応するフックだけが欠けている**（`grep -i operator lib/rigor/plugin/`は空）。

---

## 3. ギャップ分析（プラグイン視点）

PHPStan「同水準」に向けた不足を、影響度順に。

### G1（要検証→**スパイク済み・統合スペックで確定**）— 二項演算プラグインフック

当初「Rigorにはプラグインの二項演算フックがない」と仮説したが、**2026-06-03のコード・スパイク＋統合スペックで反証・確定した**（[`spec/integration/plugin_operator_dynamic_return_spec.rb`](../../spec/integration/plugin_operator_dynamic_return_spec.rb)、4例green）。Rubyの`a + b`はPrismでは`name: :+`の`Prism::CallNode`であり、通常の呼び出しと同じく`call_type_for` → `MethodDispatcher.dispatch`に`call_node: node` / `method_name: :+` / `scope:`付きで流れる（[`expression_typer.rb:1233`](../../lib/rigor/inference/expression_typer.rb)）。dispatchの優先順位は**`ConstantFolding`（precise tiers）→ `try_plugin_contribution`（`dynamic_return`）→ RBS**（[`method_dispatcher.rb:74-97`](../../lib/rigor/inference/method_dispatcher.rb)）。プラグイン所有のレシーバは`Nominal[CustomType]`であって`Constant` / `IntegerRange`ではないためConstantFoldingは`nil`を返し、**dispatchはplugin tierに落ちる**。`dynamic_return_type`はreceiverクラスのみでゲートしmethod名は一切問わない（[`base.rb:382`](../../lib/rigor/plugin/base.rb)）。スペックは`:+ :- :* :/`すべてでブロックが発火し、寄与した型が`(a <op> b)`の結果型として確定することを確認済み。

結論：**PHPStanの`OperatorTypeSpecifyingExtension`相当はすでに既存契約で実現できる**。

```ruby
dynamic_return receivers: ["Money"] do |call_node, scope|
  next nil unless %i[+ - * /].include?(call_node.name)
  right = scope.type_of(call_node.arguments&.arguments&.first)
  # ... Money 同士なら Money、Money×Integer なら Money など
  services.type.nominal_of("Money")
end
```

つまり**新フックは不要**。ギャップは「契約の不在」ではなく以下の3点に縮小する：

- **G1a（ドキュメント）**：`dynamic_return`が演算子糖衣も捕捉できることがどこにも明記されていない。ADR-37 / examplesいずれも演算子ユースケースを示していない。
- **G1b（エルゴノミクス）**：receiver-onlyゲートのため、ブロックが手動で`call_node.name`を分岐し、`scope.type_of`で右辺型を取り出す必要がある。PHPStanの`specifyType(sigil, left, right)`のような（演算子記号,左型,右型）を直接渡す糖衣がない。`operator_return operators: %i[+ -], receivers: [...]`のような薄い宣言糖衣は検討余地。
- **G1c（coerce方向、設計上の真のギャップ）**：Rubyは`a + b`を`a`に対してディスパッチする。`1 + money`のように**左辺が組み込み型**のケースはIntegerがレシーバになり、ランタイムでは`money.coerce(1)`を経由する。プラグインがIntegerを所有しないと左辺起点の演算に介入できない。**スペックで確定した実挙動**（上記スペックのcoerce例）：`1 + money`はDynamicにfail-softするのではなく、**左オペランドの組み込み型（Integer）として型付けされる**。したがって下流`(1 + money).custom_method`はInteger上で未定義判定され、ランタイムで`coerce`経由で動くコードに対し**狭いが偽陽性が出うる**（scalar-first coerce＋ 結果への独自メソッド呼び出しという少数派条件が重なったとき）。PHPStanは`isOperatorSupported($left, $right)`が**双方向**で左右どちらの型からでも判定できる点で構造的に勝る。Rigorでcoerce方向を扱う選択肢：（i）`coerce`呼び出しを`dynamic_return receivers: ["Integer"]` …は所有衝突で不可、（ii）エンジン側で「引数がプラグイン所有型なら左辺組み込み算術をプラグインに委譲」する新経路、（iii）**より単純なFP緩和** — 引数が非Numericの未知/独自型のとき結果をInteger左偏重ではなくDynamicに倒す（プラグインフック不要のエンジン小改修で偽陽性だけ消える）。**ここだけはADR級の設計判断が残る**。

ユースケース（Ruby生態系での実需）：

- `BigDecimal` / `Rational` / `Complex`の算術結果型（既に[oss-library-survey](../20260519-oss-library-survey/)でBigDecimal-coerceのFP修正実績あり — 演算子経路の需要は実在。これらはcoerce方向G1cの典型）。
- `Money`/`Unit`系（`examples/rigor-units`が単位付き数値を扱う — 演算子オーバーロードの典型。同型同士ならG1既存契約で対応可）。
- ベクトル/行列、`Set`の`|`/`&`/`-`、`Pathname#/`等（同型／自型レシーバが多くG1既存契約でカバー可）。

### G2 — 強制変換`to*()`サーフェスの不在

PHPStanの`toNumber`/`toString`/`toBoolean`/`toArray`は**型→型の純関数**としてプラグインから呼べる。Rigorでは同等のロジックが`ConstantFolding`の内部に閉じ、プラグインが「この型をboolish/integerにcoerceしたら何になるか」を型代数として問えない。`boolish`の扱い（[special-types.md](../../type-specification/special-types/)）はあるが、汎用coercion facadeではない。

**評価2026-06-03 — 却下（需要なし）**。 Rubyのキャストは`x.to_i` / `Integer(x)`等のメソッド呼び出しで、既にdispatch経由で精密化される。真偽値の扱いは`narrow_truthy`/`narrow_falsey`（[`narrowing.rb:67`](../../lib/rigor/inference/narrowing.rb)、エンジン内蔵）＋ プラグイン拡張可能な`type_specifier`が等価機構。型→型のcoercion facadeを欲する消費者はexamples/pluginsに皆無。

### G3 — `generalize`の不在

PHPStanは精度を意図的に落とす`generalize`を持つ。Rigorは`normalize`（冪等・情報保存）＋fold出力上限による暗黙widenのみで、プラグインが「複雑になりすぎたので定数情報を捨てて`Integer`に上げる」を明示要求できない。

**評価2026-06-03 — プラグインfacadeとしては却下**。意図的精度低下はADR-41（inference budget）の領分であり、プラグイン公開面ではない。union/出力上限による暗黙widenで実害なく回っており、プラグインから明示generalizeを要求する消費者はゼロ。必要が生じればADR-41に吸収する。

### G4 — null/truthy便宜メソッドの不在

`removeNull` / `addNull` / `containsNull` / `removeTruthy` / `removeFalsey`相当がfacadeに無い。`difference`/`union` + 述語で導出できるので**純粋にDX（便宜）の問題**。プラグインコードの冗長さに直結する。

### G5 — offsetアクセスfacadeの限定

ShapeDispatchはエンジン内部でTuple/HashShapeのoffsetを精密に解くが、プラグインに公開された型代数APIは`indexed_access`型関数程度。PHPStanの`getOffsetValueType` / `setOffsetValueType`のような**型レベルoffset操作の純関数群**はplugin facadeに揃っていない。

**評価2026-06-03 — 保留（条件付き）**。 `ShapeDispatch`はTuple/HashShape限定のclosed tier（[`shape_dispatch.rb`](../../lib/rigor/inference/method_dispatcher/shape_dispatch.rb)）で、独自コンテナ型を持つプラグインは現状ゼロ。将来カスタムコレクション型を定義するプラグインが現れたときの最有力拡張候補ではあるが、消費者が出るまでは着手しない。

### 同等で問題ない領域（移植不要）

union/intersect/difference、accepts（gradual）、capability predicates、定数抽出、定数スカラ実評価、**IntegerRange抽象算術**、union直積分配、正規化必須facadeの注入方針。これらはPHPStanと同水準かそれ以上（差分演算子と診断表示はRigorが厚い）。

---

## 4. テストカバレッジ観点

PHPStanは`isSuperTypeOf`を`TypeCombinator`経由で網羅テストするのが規範。Rigor側で強化したい軸：

1. **二項演算 × union直積**：`Union[Constant]`同士の算術が直積で正しく畳まれ、上限超でfail-softする境界テスト（`UNION_FOLD_INPUT/OUTPUT_LIMIT`直近）。
2. **IntegerRange算術の代数的エッジ**：`0×∞`、除数が0を跨ぐ範囲、片側無限、減算での端入れ替え（`range_additive`の`:-`分岐）。既に実装は配慮済みだが回帰テストの明示化。
3. **acceptsのgradual非推移性**：`relations-and-certainty.md`の「consistentは推移的でない」を突くケース表。
4. **差分演算子の正規化**：`String - "" - "x"`の平坦化、`Refined`との相互作用、診断表示の`D - (U|V)`形。
5. **プラグインfacadeの正規化保証**：`services.type.union(...)`が直接`Union.new`を許さず常に正規化を通すことの契約テスト（PHPStanの「`new`回避」方針のRigor版）。
6. **演算子糖衣 → dynamic_return**（**LANDED** 2026-06-03 — [`spec/integration/plugin_operator_dynamic_return_spec.rb`](../../spec/integration/plugin_operator_dynamic_return_spec.rb)）：`Nominal[Custom] <op> Custom`が`dynamic_return receivers: ["Custom"]`のブロックに`call_node`として届き、結果型がplugin tierで確定すること（`:+ :- :* :/`全数 + 宣言外演算子の辞退 + coerce方向の左偏重型付けの4例）。観測にはcore型センチネルが必要（ユーザー定義クラスは偽陽性回避のため未定義メソッド診断が出ない）。

---

## 5. ADR要否の判断

スパイク（§3 G1）で前提が一つ崩れた：**自型／同型レシーバの二項演算は新フックなしで既に対応できる**。これによりADRの必要範囲は当初想定より小さい。

- **G1a/G1b（ドキュメント + エルゴノミクス）はADR不要・LANDED**。`dynamic_return`の演算子捕捉を[`docs/internal-spec/plugin.md`] の`dynamic_return`節 + [`examples/rigor-units/README.md`] に明記し、回帰スペック[`plugin_operator_dynamic_return_spec.rb`] で固定済み。薄い宣言糖衣`operator_return`は欲しければ後続の小改善（ADR不要、CHANGELOGレベル）。
- **G1c（coerce方向）— ADR-42として起票済み・低優先demand-gated**。2回の訂正を経た現在地：（1）当初「実需あり（BigDecimal-coerce survey）」は誤り。surveyのFPはoverload順序問題で`acc9882`（ReceiverAffinity）により**解決済み**、本件と無関係。（2）次に「無害なfail-soft（Dynamic・無診断）」としたが、これも**スペックで反証された**：`1 + money`はDynamicではなく**左偏重でInteger型**になり、結果への独自メソッド呼び出しは**狭いが偽陽性を生みうる**（§3 G1c）。よって「精度のみ・安全性に無関係」ではなく、少数派条件下でFPが出る。（3）ただし最安の解はADR-42の新フックではなく、**§3 G1cの選択肢（iii）：引数が非Numericの独自型のとき結果をInteger左偏重ではなくDynamicに倒すエンジン小改修**で、プラグインフックなしにFPだけを消せる。さらに精度まで欲しければ`examples/rigor-units`自身が示す**ADR-20 lightweight HKT + RBS型関数**が本筋。→ **ADR-42はProposedのまま。まず（iii）のFP緩和を検討し、精度はHKT経路を優先。新フックは両者で足りないと実消費者で判明したときのみ**。
- **G2/G3/G5 — 2026-06-03評価で却下／保留**（§3各項参照）。G2（`to_*`）= 需要なし・narrowingが等価機構で却下。G3（`generalize`）= プラグインfacadeではなくADR-41 budgetの領分、却下。G5（offset facade）= カスタムコンテナ消費者が出るまで保留。いずれもADR不要。
- **G4**はADR不要。`Type::Combinator`に便宜メソッドを足すだけのDX改善で、CHANGELOGレベル。

**総括（再評価後）**：PHPStan同水準を目指す未実装で**新しいプラグイン拡張点を要するものはゼロ**。自型/左辺の演算子は既存`dynamic_return`で対応済み（スペックで確定）、coerce方向（G1c）は少数派FPが出うるが最安の緩和はエンジン小改修（§3 G1c（iii））で精度はHKT経路、`to_*`/`generalize`/offset facadeは需要なし。価値ある残作業は §4のテスト整備とG1a/G1bのドキュメント化、そして必要ならG1c（iii）のFP緩和（いずれも新フックADR不要）。

**推奨と着手状況**：

1. **LANDED（ADR不要）**：G1a/G1b（§4-6の演算子↔`dynamic_return`回帰スペック[`plugin_operator_dynamic_return_spec.rb`] + [`docs/internal-spec/plugin.md`] の`dynamic_return`節への演算子注記 + [`examples/rigor-units/README.md`] への演算子ポインタ）。これで「自型/左辺の演算子型演算」はPHPStanと同水準に並んだ。
2. **LANDED（ADR不要）**：§4テスト軸のうち実在ギャップ3本（`STRING_FOLD_BYTE_LIMIT`、IntegerRange符号付き無限大、Difference連続減算）を既存スペックに追加。残り（accepts非推移性の明示ケース等）は既存カバレッジが厚く優先度低。
3. **ADR-42起票済み（Proposed・低優先・demand-gated）**：G1c（coerce方向）。スペックで「狭いFP」と確定。最安の緩和はWD-D（エンジン小改修、フック不要）、精度はADR-20 HKT。実消費者が出るまで未実装。
4. **却下/保留（ADR不要）**：G2/G3/G5（§3各項）、G4（CHANGELOGレベル）。

→ 当初の「G1全体をADR」案は過大で、実際に残ったADRはG1cに絞った1本（ADR-42）のみ。それ以外は文書・テストで決着済み。

---

## 付録：一次ソース

- PHPStan: [`TypeCombinator.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/TypeCombinator.php), [`TypeUtils.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/TypeUtils.php), [`Type.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/Type.php), [`OperatorTypeSpecifyingExtension.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/OperatorTypeSpecifyingExtension.php), [`MutatingScope.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Analyser/MutatingScope.php),公式ガイド[Type System](https://phpstan.org/developing-extensions/type-system) / [Extension Types](https://phpstan.org/developing-extensions/extension-types)。
- Rigor: [`combinator.rb`](../../lib/rigor/type/combinator.rb), [`constant_folding.rb`](../../lib/rigor/inference/method_dispatcher/constant_folding.rb), [`shape_dispatch.rb`](../../lib/rigor/inference/method_dispatcher/shape_dispatch.rb), [`plugin/base.rb`](../../lib/rigor/plugin/base.rb), [`plugin/services.rb`](../../lib/rigor/plugin/services.rb), [internal-type-api.md](../../internal-spec/internal-type-api/), [type-operators.md](../../type-specification/type-operators/), [value-lattice.md](../../type-specification/value-lattice/), [relations-and-certainty.md](../../type-specification/relations-and-certainty/)。
