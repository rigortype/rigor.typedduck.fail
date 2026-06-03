---
title: "PHPStan internal type algebra (TypeCombinator / TypeUtils / binary-operator evaluation) vs Rigor"
description: "Comparison of PHPStan's plugin-level type-algebra gaps with Rigor."
sourceSha: "fa7dec8040e6bdefda2b759f4fb5be9e5867203dd47aaf1ea32e93317b5db5f3"
sourceCommit: "b5c25bc5a9e53d495e4f515a9506f10fd4bef8d7"
translationStatus: "translated"
---

**Status:** research note, no design commitments. An investigation of type-algebra gaps at the plugin level.
**Date:** 2026-06-03.
**Rigor version:** observations against the working tree (the v0.1.x line, master @ `7d8000e6`).
**PHPStan version:** the distributed phar is vendored under `references/phpstan` (`2.1.39-767`), but **the source is not included** (phar only). Citations of internal classes refer directly to the `2.1.x` branch of the upstream [`phpstan/phpstan-src`](https://github.com/phpstan/phpstan-src). Note that re-grepping `references/phpstan` will not turn up `TypeCombinator.php` and the like.

**Why:** in response to the requirement "we want to do type algebra at the plugin level on par with PHPStan," this note cross-references the type-algebra (type algebra) surface of both tools to identify the implementation and test coverage that Rigor is missing. It is the foundation for later porting investigations / ADR filings, which will cite this note as their basis.

**Reading order.** §1 takes inventory of the PHPStan surface, §2 is the Rigor-side mapping table, §3 is the gap analysis (plugin perspective), §4 covers the test-coverage angle, and §5 judges whether an ADR is needed. `file:line` citations are against the Rigor working tree / phpstan-src 2.1.x and may be off by a few lines. Re-grep before citing.

---

## 0. One-paragraph orientation

PHPStan's type algebra is split into **three layers**: (1) the static facades that handle the algebra of type objects — `TypeCombinator` (union/intersect/remove) and `TypeUtils` (the family of extraction helpers); (2) the methods on the `Type` interface itself that each type implements (`isSuperTypeOf` / `accepts` / `is*()` predicates / `get*()` extraction / `to*()` coercions / offset access); and (3) the logic by which `MutatingScope` evaluates binary operations on the AST (real evaluation of constant scalars + abstract range arithmetic on `IntegerRangeType` + union cross-product distribution). Plugins can call into all three layers, and additionally have a dedicated extension point — **`OperatorTypeSpecifyingExtension`** — for declaring the result type of a binary operation.

Rigor has corresponding three layers too — `Type::Combinator` ([`lib/rigor/type/combinator.rb`](../../lib/rigor/type/combinator.rb)), each carrier's `accepts` / capability predicate / projection ([`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)), and `ConstantFolding`'s binary-operation evaluation ([`lib/rigor/inference/method_dispatcher/constant_folding.rb`](../../lib/rigor/inference/method_dispatcher/constant_folding.rb)). The algebra facade and the relational operations are roughly on par, but the biggest structural gap is that **there is no extension point for a plugin to inject the result type of a binary operation**.

---

## 1. Inventory of the PHPStan surface

### 1.1 `TypeCombinator` (the type-algebra facade with normalization)

The public static methods of `PHPStan\Type\TypeCombinator`:

| Method | Role |
| --- | --- |
| `union(Type ...$types): Type` | Normalizing union. Deduplication, subtype absorption (the supertype wins), aggregation of constant scalars (`true|false → bool`), the iterable merge `string[]|int[] → (string|int)[]`, and merging of constant arrays with generalization when there are too many |
| `intersect(Type ...$types): Type` | Normalizing intersect. Distributes over unions (`A & (B|C) → (A&B)|(A&C)`), contradictions become `NeverType`, the subtype wins |
| `remove(Type $from, Type $toRemove): Type` | Type difference. A complete removal yields `NeverType` |
| `removeNull` / `addNull` / `containsNull` | Convenience wrappers dedicated to null |
| `removeTruthy` / `removeFalsey` | Truthiness-based narrowing aids |
| `countConstantArrayValueTypes` | Total count of value entries in a constant array (for the generalize-threshold decision) |

Key points of normalization: implicit-never removal → benevolent-union expansion → flattening of nested unions → scalar aggregation → enum-case separation → iterable merge → subtype absorption → array processing (`processArrayTypes`, generalizing when the value count exceeds the cap).

### 1.2 `TypeUtils` (the family of extraction helpers)

In 2.x, much of this was migrated to methods on `Type` itself, and the `TypeUtils` side has shrunk. The main survivors: `getConstantIntegers`, `getIntegerRanges`, `toBenevolentUnion`, `toStrictUnion`, `flattenTypes` (power-set expansion, optimized when huge), `findThisType`, `findCallableType`, `getHasPropertyTypes`, `getAccessoryTypes`, `containsTemplateType`, `resolveLateResolvableTypes`. Naive extractors like `getConstantStrings` moved to the interface's `getConstantStrings(): list<ConstantStringType>`.

### 1.3 The operation surface of the `Type` interface itself

This is the heart of "type algebra." Plugins call directly on the `Type` they obtained from `Scope->getType($expr)`.

- **Relational operations**: `isSuperTypeOf(Type): IsSuperTypeOfResult` (**the recommended API for plugins to query types** — "does the value set of `$this` subsume the argument?"), `accepts(Type, bool $strictTypes): AcceptsResult` (assignability that takes PHP's implicit coercion into account; semantics are complex — e.g. `FloatType` accepts `IntegerType` — so it is ill-suited for type discrimination), `equals(Type): bool`.
- **Three-valued predicates (returning `TrinaryLogic`)**: `isString` / `isInteger` / `isFloat` / `isBoolean` / `isArray` / `isList` / `isCallable` / `isObject` / `isEnum` / `isNull` / `isScalar` / `isOffsetAccessible` … as well as **precise string predicates** like `isNumericString` / `isNonEmptyString` / `isNonFalsyString` / `isLiteralString` / `isLowercaseString` / `isClassString`.
- **Constant extraction**: `getConstantScalarTypes` / `getConstantScalarValues` / `getConstantStrings` / `getConstantArrays` / `isConstantScalarValue`.
- **Coercions `to*()`**: `toBoolean` / `toNumber` / `toInteger` / `toFloat` / `toString` / `toArray` / `toArrayKey` / `toBitwiseNotType` / `toAbsoluteNumber` / `toCoercedArgumentType`. **These are pure functions from type to type**, used in binary-operation evaluation and in resolving casts like `(string)$x`.
- **Offset access**: `hasOffsetValueType(Type): TrinaryLogic`, `getOffsetValueType(Type): Type`, `setOffsetValueType(?Type,Type,bool): Type`, `setExistingOffsetValueType`, `unsetOffset`. There are many array operations at the type level — `getKeysArray` / `getValuesArray` / `sliceArray` / `popArray` / `flipArray` …
- **Precision management**: `generalize(GeneralizePrecision): Type` (drops constant information when a type has become too complex).

`TrinaryLogic` (`yes`/`no`/`maybe`, `createYes`, etc.) is the shared return value of predicates and relational operations, expressing the uncertainty inherent in unions/intersections.

### 1.4 Binary-operation evaluation (`MutatingScope`)

The AST `Expr\BinaryOp\*` (`Plus` / `Minus` / `Mul` / `Div` / `Mod` / `Pow` / `Concat` / comparisons / bitwise ops) are evaluated inside `MutatingScope::getType()`. Key points:

1. **Real evaluation of constant scalars**: if both sides are constant scalars, it actually computes with the PHP operator and produces `ConstantIntegerType` / `ConstantFloatType` / `ConstantStringType`. On `int` overflow it promotes to `float`.
2. **Abstract range arithmetic on `IntegerRangeType`**: even when not constant, it computes addition/subtraction/multiplication/division and comparisons between ranges, as in `int<1,5> + int<10,20> → int<11,25>`. `IntegerRangeType` itself carries the range-operation methods.
3. **Union cross-product distribution**: if the operands are unions, it evaluates the cross-product of each member and folds it back into a union.
4. **String concatenation `Concat`**: if constant, a constant string; otherwise a precise string type such as `numeric-string` / `non-empty-string`.
5. These results are ultimately normalized through `TypeCombinator::union`.

### 1.5 `OperatorTypeSpecifyingExtension` (**the plugin-facing binary-operation hook**)

```php
interface OperatorTypeSpecifyingExtension
{
    public function isOperatorSupported(string $operatorSigil, Type $leftSide, Type $rightSide): bool;
    public function specifyType(string $operatorSigil, Type $leftSide, Type $rightSide): Type;
}
```

For **object types that overload operators (or behave operator-like)** such as GMP / BCMath / Money, a plugin can declare the result type of a binary operation. It is registered in the `phpstan.neon` config as `tags: [phpstan.broker.operatorTypeSpecifyingExtension]`. **This is the core of "plugin-level binary-operator type algebra,"** and Rigor has no direct counterpart.

### 1.6 The plugin's type-construction idiom

You can directly `new` `new ObjectType(...)` / `new ConstantStringType('x')` / `new UnionType([...])`, but the official guide treats "non-canonical forms should be simplified" as policy and recommends that **after construction you must always normalize through `TypeCombinator::union/intersect`** (a direct `new UnionType` can create an invalid type such as `string&int`). When you build a custom type, implementations of `describe` / `equals` / `isSuperTypeOf` / `accepts` are mandatory, and you are told to test `isSuperTypeOf` rigorously via `TypeCombinator`.

---

## 2. Rigor-side mapping

| PHPStan | Rigor counterpart | Location | State |
| --- | --- | --- | --- |
| `TypeCombinator::union` | `Type::Combinator.union` | [`combinator.rb:363`](../../lib/rigor/type/combinator.rb) | ✅ Equivalent (deterministic normalization + lattice identities) |
| `TypeCombinator::intersect` | `Type::Combinator.intersection` | [`combinator.rb:325`](../../lib/rigor/type/combinator.rb) | ✅ Equivalent |
| `TypeCombinator::remove` | `Type::Combinator.difference` (the `T - U` operator) | [`combinator.rb:123`](../../lib/rigor/type/combinator.rb) | ✅ Rigor has an explicit difference operator, and the diagnostic display also has a `D - U` form ([type-operators.md](../../type-specification/type-operators/)). If anything, the expression is richer than PHPStan's |
| `removeNull`/`addNull`/`containsNull` | `difference(t, nil)` / `union(t, nil)` / the `nil_value` predicate | combinator + predicate | ⚠️ Derivable, but **no dedicated convenience methods are provided** |
| `removeTruthy`/`removeFalsey` | (narrowing is on the CFA side) | [control-flow-analysis.md](../../type-specification/control-flow-analysis/) | ⚠️ Not exposed as part of the type-algebra facade |
| `Type::isSuperTypeOf` | `Type#accepts(other, mode:)` → `AcceptsResult` | each carrier's `accepts` (e.g. [`constant.rb:114`](../../lib/rigor/type/constant.rb)) | ✅ Implemented as gradual consistency. The strict subtype (`subtype_of`) returning `SubtypeResult` is planned for slice 5+ |
| `Type::accepts` | `Type#accepts` | same as above | ✅ gradual mode implemented, strict mode reserved |
| `TrinaryLogic` | `Rigor::Trinary` (yes/no/maybe) | — | ✅ Equivalent |
| The `is*()` predicate family | capability predicates (`string` / `integer` / `array` / `callable` …) | [internal-type-api.md](../../internal-spec/internal-type-api/) | ✅ Roughly equivalent. However PHPStan's precise string predicates (`isNumericString` / `isLowercaseString` etc.) are distributed across the Refined carrier + the predicate-ID side in Rigor |
| `getConstant*` extraction | projections (`constant_strings` / `constant_integers` …) | internal-type-api.md | ✅ Equivalent |
| `IntegerRangeType` range arithmetic | `try_fold_binary_range` and others (additive / multiply / divide / comparison, corner computation + algebraic considerations like `0×∞=0`) | [`constant_folding.rb:800`](../../lib/rigor/inference/method_dispatcher/constant_folding.rb) | ✅ **On par**. The four-corner product of range × range, the division guard, and infinite-endpoint handling are all implemented |
| Real evaluation of constant scalars (binary ops) | `ConstantFolding` (an allow-list such as NUMERIC_BINARY / STRING_BINARY + a real `send`) | constant_folding.rb | ✅ Equivalent. If the receiver/argument is `Constant` or `Union[Constant]` and is on the allow-list, it really evaluates; if off the list, it fails soft to `Dynamic[top]` |
| Union cross-product distribution (binary ops) | ConstantFolding's Cartesian fold (`UNION_FOLD_INPUT/OUTPUT_LIMIT`) | constant_folding.rb | ✅ Equivalent (with input/output caps) |
| `to*()` coercions (pure type → type functions) | — | — | ❌ **Not exposed as type-object methods**. Casting/coercion is closed inside ConstantFolding |
| offset access (`getOffsetValueType` etc.) | the `indexed_access` type function + ShapeDispatch (the `[]`/`fetch`/`dig` of Tuple/HashShape) | [`shape_dispatch.rb`](../../lib/rigor/inference/method_dispatcher/shape_dispatch.rb), [type-operators.md](../../type-specification/type-operators/) | ⚠️ Precise inside the engine. **The offset facade callable from a plugin is limited to about `indexed_access`** |
| `generalize(precision)` | `normalize` (idempotent normalization) only | normalization.md | ⚠️ A `generalize` that **intentionally drops precision** is not provided (there is an implicit widen from the union/output cap) |
| **`OperatorTypeSpecifyingExtension`** | — | — | ❌ **No counterpart**. There is no plugin binary-operation hook |
| The plugin type-construction facade | `services.type` (= `Type::Combinator`) | [`services.rb:43`](../../lib/rigor/plugin/services.rb) | ✅ Injects a facade that mandates normalization (consistent with PHPStan's "`TypeCombinator` over `new`" policy) |

The plugin extension points ([`plugin/base.rb`](../../lib/rigor/plugin/base.rb)) are `node_rule` (lines 86, 137) / `dynamic_return` (line 210) / `type_specifier` (line 239) / `producer` (line 86). PHPStan's `DynamicMethodReturnTypeExtension` ≈ Rigor's `dynamic_return`, and `TypeSpecifierExtension` ≈ `type_specifier`. **Only a hook corresponding to `OperatorTypeSpecifyingExtension` is missing** (`grep -i operator lib/rigor/plugin/` is empty).

---

## 3. Gap analysis (plugin perspective)

The gaps toward "on par with PHPStan," in order of impact.

### G1 (needs verification → **spiked, settled by an integration spec**) — the binary-operation plugin hook

We initially hypothesized "Rigor has no plugin binary-operation hook," but **a code spike plus an integration spec on 2026-06-03 refuted it and settled it** ([`spec/integration/plugin_operator_dynamic_return_spec.rb`](../../spec/integration/plugin_operator_dynamic_return_spec.rb), 4 examples green). In Ruby, `a + b` is a `Prism::CallNode` with `name: :+`, and like any ordinary call it flows through `call_type_for` → `MethodDispatcher.dispatch` with `call_node: node` / `method_name: :+` / `scope:` ([`expression_typer.rb:1233`](../../lib/rigor/inference/expression_typer.rb)). The dispatch priority is **`ConstantFolding` (precise tiers) → `try_plugin_contribution` (`dynamic_return`) → RBS** ([`method_dispatcher.rb:74-97`](../../lib/rigor/inference/method_dispatcher.rb)). A plugin-owned receiver is `Nominal[CustomType]`, not `Constant` / `IntegerRange`, so ConstantFolding returns `nil`, and **dispatch falls through to the plugin tier**. `dynamic_return_type` gates only on the receiver class and does not consider the method name at all ([`base.rb:382`](../../lib/rigor/plugin/base.rb)). The spec confirms that the block fires for all of `:+ :- :* :/` and that the contributed type is settled as the result type of `(a <op> b)`.

Conclusion: **the equivalent of PHPStan's `OperatorTypeSpecifyingExtension` can already be achieved with the existing contract.**

```ruby
dynamic_return receivers: ["Money"] do |call_node, scope|
  next nil unless %i[+ - * /].include?(call_node.name)
  right = scope.type_of(call_node.arguments&.arguments&.first)
  # ... Money for Money-to-Money, Money for Money × Integer, etc.
  services.type.nominal_of("Money")
end
```

So **no new hook is needed**. The gap shrinks to the following three points, not "the absence of a contract":

- **G1a (documentation)**: nowhere is it stated that `dynamic_return` can also capture operator sugar. Neither ADR-37 nor the examples show an operator use case.
- **G1b (ergonomics)**: because the gate is receiver-only, the block has to manually branch on `call_node.name` and extract the right-hand-side type with `scope.type_of`. There is no sugar like PHPStan's `specifyType(sigil, left, right)` that hands you (operator sigil, left type, right type) directly. A thin declarative sugar like `operator_return operators: %i[+ -], receivers: [...]` is worth considering.
- **G1c (coerce direction, the real design gap)**: Ruby dispatches `a + b` against `a`. In a case like `1 + money`, where **the left side is a built-in type**, Integer becomes the receiver and at runtime it goes through `money.coerce(1)`. A plugin cannot intervene in left-originated operations unless it owns Integer. **The real behavior confirmed by the spec** (the coerce example in the spec above): `1 + money` does not fail soft to Dynamic — it is **typed as the left operand's built-in type (Integer)**. Consequently a downstream `(1 + money).custom_method` is judged undefined on Integer, and against code that does run at runtime via `coerce`, a **narrow but real false positive can arise** (when the minority conditions of a scalar-first coerce *plus* a custom method call on the result coincide). PHPStan is structurally superior here in that `isOperatorSupported($left, $right)` is **bidirectional** and can decide from the type on either side. The options for handling the coerce direction in Rigor: (i) `dynamic_return receivers: ["Integer"]` on the `coerce` call … impossible due to ownership conflict, (ii) a new path on the engine side that "delegates the left-hand built-in arithmetic to the plugin when the argument is a plugin-owned type," (iii) a **simpler FP mitigation** — when the argument is an unknown/custom type that is not Numeric, fall the result back to Dynamic rather than the Integer left-bias (a small engine change with no plugin hook that eliminates only the false positive). **This is the one place where an ADR-class design decision remains.**

Use cases (real demand in the Ruby ecosystem):

- The arithmetic result types of `BigDecimal` / `Rational` / `Complex` (there is already a track record of fixing a BigDecimal-coerce FP in the [oss-library-survey](../20260519-oss-library-survey/) — demand for the operator path is real. These are textbook cases of the coerce direction G1c).
- The `Money`/`Unit` family (`examples/rigor-units` handles unit-bearing numbers — the textbook case of operator overloading. Same-type-to-same-type cases can be handled by the existing G1 contract).
- Vectors/matrices, `Set`'s `|`/`&`/`-`, `Pathname#/`, etc. (mostly same-type / self-type receivers, coverable by the existing G1 contract).

### G2 — the absence of the `to*()` coercion surface

PHPStan's `toNumber`/`toString`/`toBoolean`/`toArray` can be called from a plugin as **pure type → type functions**. In Rigor the equivalent logic is closed inside `ConstantFolding`, and a plugin cannot ask, as type algebra, "what does this type become if I coerce it to boolish/integer?" There is the handling of `boolish` ([special-types.md](../../type-specification/special-types/)), but it is not a general-purpose coercion facade.

**Assessment 2026-06-03 — rejected (no demand).** Ruby casts are method calls like `x.to_i` / `Integer(x)`, already refined via dispatch. Truthiness handling is the equivalent mechanism of `narrow_truthy`/`narrow_falsey` ([`narrowing.rb:67`](../../lib/rigor/inference/narrowing.rb), built into the engine) + the plugin-extensible `type_specifier`. There is no consumer in examples/plugins that wants a type → type coercion facade.

### G3 — the absence of `generalize`

PHPStan has a `generalize` that intentionally drops precision. Rigor has only `normalize` (idempotent, information-preserving) + the implicit widen from the fold output cap, and a plugin cannot explicitly request "this got too complex, so throw away the constant information and lift it to `Integer`."

**Assessment 2026-06-03 — rejected as a plugin facade.** Intentional precision reduction is the province of ADR-41 (inference budget), not the plugin-facing surface. The implicit widen from the union/output cap keeps things running without harm, and there are zero consumers requesting explicit generalize from a plugin. If a need arises it will be absorbed into ADR-41.

### G4 — the absence of null/truthy convenience methods

There is no facade equivalent of `removeNull` / `addNull` / `containsNull` / `removeTruthy` / `removeFalsey`. It can be derived with `difference`/`union` + predicates, so it is **purely a DX (convenience) issue**. It directly affects the verbosity of plugin code.

### G5 — the offset-access facade is limited

ShapeDispatch precisely resolves Tuple/HashShape offsets inside the engine, but the type-algebra API exposed to plugins is about the `indexed_access` type function. The **family of pure functions for type-level offset manipulation** like PHPStan's `getOffsetValueType` / `setOffsetValueType` is not lined up in the plugin facade.

**Assessment 2026-06-03 — on hold (conditional).** `ShapeDispatch` is a closed tier limited to Tuple/HashShape ([`shape_dispatch.rb`](../../lib/rigor/inference/method_dispatcher/shape_dispatch.rb)), and there are currently zero plugins with their own container types. It is the strongest candidate for extension when a plugin defining a custom collection type appears in the future, but we will not start until a consumer shows up.

### Areas that are fine as-is (no porting needed)

union/intersect/difference, accepts (gradual), capability predicates, constant extraction, real evaluation of constant scalars, **IntegerRange abstract arithmetic**, union cross-product distribution, and the policy of injecting a normalization-mandating facade. These are on par with PHPStan or better (the difference operator and the diagnostic display are richer in Rigor).

---

## 4. Test-coverage angle

PHPStan's norm is to exhaustively test `isSuperTypeOf` via `TypeCombinator`. The axes we want to strengthen on the Rigor side:

1. **Binary operation × union cross-product**: boundary tests that arithmetic between `Union[Constant]` operands folds correctly via the cross-product and fails soft when over the cap (right around `UNION_FOLD_INPUT/OUTPUT_LIMIT`).
2. **Algebraic edges of IntegerRange arithmetic**: `0×∞`, a divisor whose range crosses 0, one-sided infinity, endpoint swapping in subtraction (the `:-` branch of `range_additive`). The implementation already takes care of these, but the regression tests should be made explicit.
3. **gradual non-transitivity of accepts**: a case table that pokes at "consistent is not transitive" from `relations-and-certainty.md`.
4. **Normalization of the difference operator**: the flattening of `String - "" - "x"`, the interaction with `Refined`, and the `D - (U|V)` form of the diagnostic display.
5. **The normalization guarantee of the plugin facade**: a contract test that `services.type.union(...)` never allows a direct `Union.new` and always goes through normalization (the Rigor version of PHPStan's "avoid `new`" policy).
6. **Operator sugar → dynamic_return** (**LANDED** 2026-06-03 — [`spec/integration/plugin_operator_dynamic_return_spec.rb`](../../spec/integration/plugin_operator_dynamic_return_spec.rb)): that `Nominal[Custom] <op> Custom` arrives at a `dynamic_return receivers: ["Custom"]` block as a `call_node` and the result type is settled at the plugin tier (all of `:+ :- :* :/`, plus declining an out-of-declaration operator, plus the left-bias typing of the coerce direction — 4 examples). Observation requires a core-type sentinel (a user-defined class emits no undefined-method diagnostic, to avoid false positives).

---

## 5. Judging whether an ADR is needed

The spike (§3 G1) broke one premise: **binary operations on a self-type / same-type receiver can already be handled without a new hook**. This makes the scope of ADR required smaller than originally assumed.

- **G1a/G1b (documentation + ergonomics) need no ADR — LANDED**. `dynamic_return`'s operator capture is documented in the `dynamic_return` section of [`docs/internal-spec/plugin.md`] plus [`examples/rigor-units/README.md`], and pinned by the regression spec [`plugin_operator_dynamic_return_spec.rb`]. The thin declarative sugar `operator_return` is, if wanted, a later minor improvement (no ADR, CHANGELOG level).
- **G1c (coerce direction) — filed as ADR-42, low priority, demand-gated**. The current position after two corrections: (1) the original "real demand (BigDecimal-coerce survey)" was wrong — the survey's FP was an overload-ordering problem **already resolved by `acc9882` (ReceiverAffinity)**, unrelated to this. (2) The next claim of "harmless fail-soft (Dynamic, no diagnostic)" was also **refuted by the spec**: `1 + money` becomes not Dynamic but **left-biased Integer**, and a custom method call on the result can produce a **narrow but real false positive** (§3 G1c). So it is not "precision-only / irrelevant to safety"; an FP arises under minority conditions. (3) However, the cheapest fix is not ADR-42's new hook but **option (iii) in §3 G1c: a small engine change that, when the argument is a non-Numeric custom type, falls the result back to Dynamic rather than the Integer left-bias**, eliminating just the FP without any plugin hook. If precision is also wanted, the main line is the **ADR-20 lightweight HKT + RBS type functions** that `examples/rigor-units` itself points to. → **Leave ADR-42 as Proposed. Consider the (iii) FP mitigation first, and prioritize the HKT path for precision. A new hook only if a real consumer turns out to be inexpressible with both.**
- **G2/G3/G5 — rejected/on hold in the 2026-06-03 assessment** (see each item in §3). G2 (`to_*`) = rejected, no demand, narrowing is the equivalent mechanism. G3 (`generalize`) = the province of the ADR-41 budget, not a plugin facade, rejected. G5 (offset facade) = on hold until a custom-container consumer appears. None requires an ADR.
- **G4** needs no ADR. It is a DX improvement that merely adds convenience methods to `Type::Combinator`, at the CHANGELOG level.

**Summary (after re-assessment)**: aiming for parity with PHPStan, **nothing unimplemented requires a new plugin extension point**. Self-type / left-side operators are already handled by the existing `dynamic_return` (settled by the spec), the coerce direction (G1c) can produce a minority FP but the cheapest mitigation is a small engine change (§3 G1c (iii)) with the HKT path for precision, and `to_*`/`generalize`/the offset facade have no demand. The remaining valuable work is the test setup in §4 and the documentation of G1a/G1b, plus the G1c (iii) FP mitigation if needed (none requiring a new-hook ADR).

**Recommendations and landing status**:

1. **LANDED (no ADR)**: G1a/G1b (the §4-6 operator ↔ `dynamic_return` regression spec [`plugin_operator_dynamic_return_spec.rb`] + an operator note in the `dynamic_return` section of [`docs/internal-spec/plugin.md`] + an operator pointer in [`examples/rigor-units/README.md`]). This brings "self-type / left-side operator type algebra" on par with PHPStan.
2. **LANDED (no ADR)**: of the §4 test axes, the 3 real gaps (`STRING_FOLD_BYTE_LIMIT`, IntegerRange signed infinity, Difference repeated subtraction) added to the existing specs. The rest (an explicit case for accepts non-transitivity, etc.) is low priority as existing coverage is thick.
3. **ADR-42 filed (Proposed, low priority, demand-gated)**: G1c (coerce direction). The spec confirmed a "narrow FP." The cheapest mitigation is WD-D (a small engine change, no hook), and the precision path is ADR-20 HKT. Unimplemented until a real consumer appears.
4. **Rejected / on hold (no ADR)**: G2/G3/G5 (see each item in §3), G4 (CHANGELOG level).

→ The original "make all of G1 an ADR" plan was overkill; the ADR that actually remained is a single one scoped to G1c (ADR-42). Everything else is settled by documentation and tests.

---

## Appendix: primary sources

- PHPStan: [`TypeCombinator.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/TypeCombinator.php), [`TypeUtils.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/TypeUtils.php), [`Type.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/Type.php), [`OperatorTypeSpecifyingExtension.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Type/OperatorTypeSpecifyingExtension.php), [`MutatingScope.php`](https://github.com/phpstan/phpstan-src/blob/2.1.x/src/Analyser/MutatingScope.php), and the official guides [Type System](https://phpstan.org/developing-extensions/type-system) / [Extension Types](https://phpstan.org/developing-extensions/extension-types).
- Rigor: [`combinator.rb`](../../lib/rigor/type/combinator.rb), [`constant_folding.rb`](../../lib/rigor/inference/method_dispatcher/constant_folding.rb), [`shape_dispatch.rb`](../../lib/rigor/inference/method_dispatcher/shape_dispatch.rb), [`plugin/base.rb`](../../lib/rigor/plugin/base.rb), [`plugin/services.rb`](../../lib/rigor/plugin/services.rb), [internal-type-api.md](../../internal-spec/internal-type-api/), [type-operators.md](../../type-specification/type-operators/), [value-lattice.md](../../type-specification/value-lattice/), [relations-and-certainty.md](../../type-specification/relations-and-certainty/).
