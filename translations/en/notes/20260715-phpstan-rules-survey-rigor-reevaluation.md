---
title: "Classifying All PHPStan `src/Rules` and Re-evaluating Rigor Reimplementation Value (2026-07-15)"
description: "Imported from rigortype/rigor docs/notes/20260715-phpstan-rules-survey-rigor-reevaluation.md."
sourceSha: "92fe5d8662d60eb1f2e4b9aadb34bab9197dcdbaea5330db4cc64b94032e2366"
sourceCommit: "eb8e9996d113a1b5e1778d0988597c979814a219"
translationStatus: "translated"
---

Status: research note, no design commitments — each Tier 1/2 candidate goes through its own ADR / corpus gate before work begins.

## Purpose and positioning

This note classifies, rule by rule, the shipped PHPStan rules implemented in
`/Users/megurine/repo/php/phpstan-src/src/Rules` (roughly 600 files across
about 40 subdirectories), and re-evaluates the value of reimplementing each
one in Rigor.

Only two prior PHPStan comparisons exist in the corpus, and neither is a
**rule-level survey**:

- `docs/notes/20260603-phpstan-type-algebra-comparison.md` — a comparison at
  the type-algebra layer (`TypeCombinator` and friends). Conclusion: "zero
  unimplemented items that require new plugin extension points to reach
  PHPStan parity." Only the G1c coerce direction went to ADR-42
  (demand-gated).
- `docs/design/20260601-plugin-mechanism-pre-1.0-review.md` §7.1 — an
  adopt/reject matrix for extension **interfaces** (~50 kinds).
  `AdditionalConstructorsExtension` → adopted in ADR-38, `AllowedSubTypes` →
  recommended but still unimplemented, dead-code / restricted-usage families
  → deferred to post-1.x, demand-driven.

This note is the first rule-level survey of `src/Rules`. The investigation
was carried out by four subagent tracks (three rule-group splits plus a
Rigor-side inventory), and the body here is the consolidated verdict.

Classification key: **(a)** PHP-specific (no Ruby counterpart) / **(b)**
directly portable / **(c)** needs Ruby-oriented adaptation / **(d)** not a
rule but an engine-internal helper/infrastructure. FP risk — whether the
check "fires against working, idiomatic Ruby code" — is rated low/medium/high
per Rigor's FP discipline (`feedback_false_positive_discipline`).

## Overall picture

- Roughly **a quarter of PHPStan's rule assets** are PHP-specific syntax
  legality / version gates (cast, attributes, property hooks, pass-by-reference,
  goto, enum syntax, promoted properties, etc.), which have no Ruby
  counterpart at all.
- **The largest block of portable candidates is already covered by Rigor**:
  Comparison's constant-condition family ≈ `flow.always-truthy-condition` +
  ADR-47; Methods' dispatch core ≈ `call.undefined-method` +
  arity/argument-mismatch; override compatibility ≈ ADR-35; Operators ≈ the
  coerce-barrier ruling of ADR-64 (which is **ahead of** a naive PHPStan
  port); uninitialized property ≈ ADR-58's provenance-gated version.
- The remaining net-new candidates are (1) the **annotation/declaration
  validation family** (validity checks for RBS/`%a{rigor:v1:}` — the full
  counterpart to the PhpDoc/Generics directories; both sides are
  author-written declarations, so it's FP-free), (2) **semantic checks on
  built-in functions where constant folding applies** (printf placeholders,
  datetime-parse execution checks), and (3) **a handful of syntactic
  footgun detections** (duplicate keys in hash literals, `return` inside
  `ensure`, `raise` of a non-exception, rescue-clause shadowing).
- The high-FP conclusions are consistent: places where PHPStan already gives
  up because of dynamism even in PHP (e.g. `UnusedPrivateMethodRule` bails
  out on dynamic method names) get **worse** in Ruby due to `send` / symbol
  callbacks / monkey-patching. Naive ports of purity inference, duplicate
  definition detection, and visibility enforcement are all rejected.

## Classification by directory (condensed)

The full tables from each subagent are too long to include here, so this
section condenses the verdicts to rule/cluster granularity. Verdict column
= classification / FP risk / ruling (adopt candidate ◎ / gated adoption ○ /
reject × / PHP-specific — / already covered =).

### Arrays

| Rule/cluster | What it detects | Verdict |
|---|---|---|
| `DuplicateKeysInLiteralArraysRule` | Duplicate keys in a literal array | (b) / low / **◎** Duplicate keys in a hash literal (last-wins silently masks a real bug; limited to literals so FP-free) |
| `NonexistentOffsetInArrayDimFetchRule` | Access to a nonexistent offset | (c) / low (limited to HashShape/Tuple) / ○ Sound when limited to shape carriers. Plain `Hash[K,V]` is excluded outright, since `h[:absent]` (defaulting to nil) is idiomatic |
| `DeadForeachRule` | `foreach` over an empty array | (b) / medium / ○ Provably-empty collection `each` — low value |
| `ArrayDestructuringRule` | Destructuring of a non-array | (c) / medium / × Reduces to checking for a `to_ary`/`deconstruct` protocol, which existing dispatch checks already cover |
| `IterableInForeachRule` | `foreach` over a non-iterable | (c) / low / **=** Reduces to `each`'s `call.undefined-method` |
| `OffsetAccessAssignment*` (3 rules) | Type checking of `[]=` | (c) / low / **=** Reduces to `[]=` dispatch + argument-mismatch |
| `InvalidKeyInArrayDimFetch/Item`, `ArrayUnpackingRule`, `OffsetAccessWithoutDimForReadingRule` | PHP's key-type constraints, splat constraints | (a) / — |
| `UnpackIterableInArrayRule` | Unpacking a non-iterable | × In Ruby a splat simply wraps a non-array value, which is legal |

### Cast

5 of the 7 rules are (a) — version gates on cast syntax. `InvalidCastRule` /
`EchoRule` / `PrintRule` / `InvalidPartOfEncapsedStringRule`'s to-string
conversion checks are nearly vacuous in Ruby, since `Object#to_s` exists on
every object — × rejected. The one remaining residue (implicit
`to_str`/`to_int` conversion sites) is already occupied by ADR-64's
`param_accepts_arg_class?`.

### Classes

| Rule/cluster | What it detects | Verdict |
|---|---|---|
| Existence-check cluster (`ExistingClassIn*`, 6 rules) | Unresolved class in extends/implements/instanceof + kind mismatch | (c) / unresolved side medium (autoload, `const_missing`), **kind-mismatch side low** / ○ `class Foo < SomeModule` / `include SomeClass` is a real TypeError — FP-safe when limited to already-resolved constants |
| `ImpossibleInstanceOfRule` | Tautological/always-false `instanceof` | (b) / low / **=** Already within the existing scope of narrowing + always-truthy (see the "impossible-check" cluster below) |
| `InstantiationRule` | `new` on an unresolved/uninstantiable class, ctor arguments | (c) / low for module-`new` and arity, high for "abstract" inference / ○ Limited to `.new` on a module only |
| PHPDoc tag-validity cluster (`MethodTagRule`/`PropertyTagRule`/`MixinRule`/`LocalTypeAliases*`, etc.) | Unknown class, invalid type, or broken alias in an annotation | (c) / **low** / **◎** As RBS/annotation declaration validation (extension of the PR #96/#97 isolation arc) |
| `AllowedSubTypesRule` | Deviation from a sealed hierarchy | (c) / low / ○ Stays as §7.1's ADOPT verdict, still unimplemented (connects to ADR-36/47 WD3b) |
| `RequireExtendsRule` / `RequireImplementsRule` | A module's contract demands on its includer | (c) / low / ○ Same shape as `conforms-to` + ADR-28 — demand-driven |
| `ClassConstantRule` | Reference to an undefined class constant | (c) / medium / ○ Presupposes an allow-list discipline equivalent to ADR-43 |
| Duplicate-declaration cluster (`Duplicate*`, 3 rules) | Re-declaration of a class/method/trait | (c) / **high** (reopening is a core Ruby idiom) / × The only low-risk fragment = a duplicate `def` within the same class body in the same file (a copy-paste bug) |
| `UnusedConstructorParametersRule` | Unused constructor argument | (b) / medium / ○ Presupposes an `_`-prefix convention + ADR-35 hierarchy awareness |
| `NewStaticRule` | Safety of `new static()` | (c) / **high** / × `self.new` factories are a major Ruby idiom |
| Attributes / promoted properties / readonly class / enum sanity | PHP syntax | (a) / — |

### Comparison

| Rule/cluster | What it detects | Verdict |
|---|---|---|
| Constant-condition family (if/elsif/ternary/while/do-while/not; 7 rules) | Always-true/always-false conditions | (b) / low / **=** This *is* `flow.always-truthy-condition`. The only differences are per-syntax coverage and message precision (left/right operand attribution) |
| `BooleanAnd/Or/XorConstantConditionRule` | `&&`/`\|\|` operand polarity | (b) / low-medium / **=** Already covered by `constant_value_polarity`. Excluding the `\|\|=` memoization idiom is the make-or-break detail (per the ADR-56/58 findings) |
| impossible-check cluster (`ImpossibleCheckType*`, 3 rules) | A type-predicate call like `is_string()` that is always true/false | (b) / low for core predicates / **◎** An extension to "always-true predicate *calls*" that's cheap to implement with the existing predicate-fact mechanism. `PossiblyImpureTipHelper` (softens the message when the receiver may be impure) is a message-quality device worth stealing |
| `ConstantLooseComparisonRule` / `StrictComparisonOfDifferentTypesRule` | `==`/`===` between disjoint types, always false | (c) / medium / ○ Because `==` can be overridden, limited to value-pinned, final-class receivers (a sound subset in the same family as ADR-57's union-arm polarity). Note that PHP `===` and Ruby `===` are different things |
| `NumberComparisonOperatorsConstantConditionRule` | Always-true/always-false comparison via integer-range types | (b) / medium / ○ Depends on how much range arithmetic we have. Coerce operators are gated the same way as the ADR-64 exclusion list |
| `MatchExpressionRule` | Dead `match` arms + missing exhaustiveness | (c) / dead-arm low, exhaustiveness medium / **=** (dead arm: already shipped in ADR-47) + ○ (exhaustiveness: limited to `case/in`, exactly ADR-47 WD3b — `case/when` without an `else` returning nil is idiomatic, so it's excluded) |
| `UsageOfVoidMatchExpressionRule` | Use of a void value | (c) / low / **◎** Using the return value of an RBS-declared `void` violates the author's intent (equivalent to Steep) |
| `ConstantConditionInTraitRule` | Reports a constant condition inside a trait only when it holds identically across all using classes | (d) / — / Recorded as a mechanism: the day module bodies get re-analyzed per includer, this same multi-context dedup will be needed |

### Constants

`ValueAssignedToClassConstantRule` (folding an RBS-declared type against the
assigned literal's type, both sides author-written, low) is ○.
`OverridingConstantRule`'s type-covariance fragment is likewise ○, limited to
RBS declarations (constant shadowing by a subclass is itself idiomatic, so
only type conflicts are checked). The rest (final/typed const, magic
constants, `define()`, etc.) is (a). `AlwaysUsedClassConstantsExtension` is a
seam that **plugin-izes** the FP envelope of a dead-code rule, and reconfirms
the §7.1 ruling that "detection and suppression hooks ship only as a pair."

### DeadCode

| Rule/cluster | What it detects | Verdict |
|---|---|---|
| `UnreachableStatementRule` | A statement unreachable after a terminating statement | (b) / **low** / **◎** Statements after `return`/`raise` are syntactically robust. A close sibling of ADR-47, implementable via exit-point tracking in the flow engine |
| `NoopRule` | A pure expression in statement position (e.g. `x == 1` on its own line) | (c) / medium / ○ Low if limited to a subset of literals, variable references, and comparison operators (mixing up `=`/`==` is a real bug). Extending to "any pure expression" enters dangerous territory |
| Purity cluster (`CallTo*WithoutImpurePoints*`, 4 rules + collectors + a transitive resolver) | Statement-position use of a side-effect-free call | (c) / **high** / × Ruby purity is largely statically unknowable (memoizing ivar writes, monkey-patching, C implementations). The only narrow variant = discarding the result of `x.dup` / `x.map{}` from a catalog of already-known pure methods (via the existing fold catalog) — a low-risk fragment for when demand appears |
| `UnusedPrivateMethodRule` | Unused private method | (c) / **high** / × `send(:name)`, `before_action :check`, and other symbol references are the backbone of Rails. Without a plugin supplying "used via symbol" facts, this doesn't even reach medium (reconfirms the §7.1 ruling) |
| `UnusedPrivateConstantRule` | Unused `private_constant` | (c) / medium / × Same as above (`const_get`) |
| `UnusedPrivatePropertyRule` | An ivar that's only written, or only read | (c) / medium / ○ The read side is already occupied from a different angle by ADR-58. Write-only ivars are held back because serializers/DI use `instance_variable_get` |

### Exceptions

| Rule/cluster | What it detects | Verdict |
|---|---|---|
| `OverwrittenExitPointByFinallyRule` | A `return` inside `finally` overwriting an outer `return` | (b) / **low** / **◎** `return` inside `ensure` (a classic footgun that swallows both the return value and any in-flight exception). RuboCop's `Lint/EnsureReturn` is a low-FP precedent. Purely syntactic detection |
| `ThrowExprTypeRule` | `throw` of a non-Throwable | (b) / low / **◎** `raise x` where x is neither an Exception-family object, a String, nor something that responds to `#exception` → almost certainly a TypeError |
| `CatchWithUnthrownExceptionRule` (shadowed-clause half) | A later rescue clause shadowed by an earlier, broader one | (c) / **low** / **◎** `rescue StandardError; rescue ArgumentError` is a provable real bug via a hierarchy comparison alone |
| `CatchWithUnthrownExceptionRule` (never-thrown half) | A `catch` for an exception the `try` body can never throw | (c) / **high** / × Ruby has no throws declarations, and any call can raise anything |
| `CaughtExceptionExistenceRule` | `rescue` of an unresolved/non-exception class | (c) / low-medium / ○ Limited to resolved, non-Exception classes only. Must still allow `rescue MyGem::Error` (the module-as-error-tag mixin pattern), or it fires on working code |
| checked-throws / too-wide-throws / throws-void cluster (10 files) | Coverage/excess/covariance checks on `@throws` annotations | (c) / medium-high / × RBS has no throws vocabulary. Even introducing `%a{rigor:v1:throws}` leaves inferring the raise set unbounded. Only the fragment "a literal `raise X` in the body not covered by the declaration" is a future low-risk candidate |
| `ThrowExpressionRule` and other version gates | PHP 8.0 gate | (a) / — |

### Functions / Methods / Properties (dispatch core family)

| Rule/cluster | What it detects | Verdict |
|---|---|---|
| `CallMethodsRule` / `CallStaticMethodsRule` / `CallToFunctionParametersRule` (+ the 898-line `FunctionCallParametersCheck`) | Undefined methods, arity, argument types, generics resolution | (c) / — / **=** This is Rigor's entire reason for existing. PHPStan checks argument types unconditionally, but ADR-64 has already ruled that a naive port of that becomes high-FP in Ruby (the coerce barrier). Two residues remain: enforcing visibility (medium, since `send` piercing `private` is idiomatic — not adopted without a send-aware gate) / override across kwarg renaming (below) |
| `MethodCallWithPossiblyRenamedNamedArgumentRule` | An override that renames a kwarg | (c) / **low** / **◎** Ruby kwargs are real names (no PHP-style positional/named duality), so this is *stronger* than the PHP version: a kwarg rename is a clear-cut LSP violation, absorbable into ADR-35 |
| `OverridingMethodRule` + helpers / `MethodSignatureRule` | Liskov signature compatibility | (c) / low / **=** Already shipped as ADR-35. `final` is (a). An `#[\Override]`-annotation discipline would be low-risk and annotation-driven — awaiting demand |
| `ReturnTypeRule` family (function/closure/arrow) | Declared vs. actual return type | (b) / low / **=** `def.return-type-mismatch` |
| `IncompatibleDefaultParameterTypeRule` (3 rules) | Default argument value vs. declared parameter type | (b) / **low** / **◎** Default values fold on the spot. Per ADR-5, this only fires for *declared* parameter types |
| printf cluster (`PrintfParametersRule`, etc., 3 rules) | Placeholder count/type in a format string | (b) / **low** / **◎** Literal format checking for `format`/`sprintf`/`String#%` — squarely constant-folding's home turf |
| `RandomIntParametersRule` | min > max | (b) / low / ○ For `rand(a..b)`-style calls. Cheap if a range type is available |
| sort/implode castability cluster | Whether elements are to-string-able / comparable | (c) / medium-low / ○ The value is on the *sort* side: `sort` on a union of `<=>`-incompatible elements is a real ArgumentError family |
| `ArrayFilterRule` / `ArrayValuesRule` | No-op collection calls | (c) / medium / × Inherits the always-truthy envelope but the yield is thin |
| NoDiscard cluster (`CallTo*WithNoDiscardRule`) | Discarding the return value of `#[\NoDiscard]` | (c) / **low** / ○ A must-use annotation (a `%a{rigor:v1:}` candidate) — fires only where the author requested it. Demand-driven |
| No-side-effect statement cluster (`CallTo*StatementWithoutSideEffectsRule`) | Statement-position use of a pure call | (c) / high / × (same verdict as the DeadCode purity cluster). Exception: a narrow port of the ctor variant — leaving an ADR-48 Data class's `.new` result discarded in statement position is a medium-risk candidate worth considering |
| `NullsafeMethodCallRule` / `NullsafePropertyFetchRule` | `?->` on a non-nullable | (b) / medium / ○ "`&.` on a receiver that's never nil" — a family that fires on working defensive code, so only on the same `:info`/strict shelf as always-truthy |
| `MissingFunctionParameter/ReturnTypehintRule` family / `MissingTypehintCheck` | Missing type annotation, element-less collection type | (c) / medium if default-on / × This is material for the **coverage** dimension rather than a diagnostic — already occupied by the `coverage --protection` axis |
| `AccessPropertiesRule` family | Access to an undefined property | (c) / medium / **=** In Ruby an ivar is only visible within its own object. Reading an unwritten `@ivar` inside the class is already the right adaptation, provenance-gated by ADR-58 |
| `TypesAssignedToPropertiesRule` / `DefaultValue…` | Declared field type vs. assignment | (c) / low when limited to RBS declarations / ○ Firing on an *inferred* field type is high-risk (idiomatic widening), so it's pinned to declarations only |
| `UninitializedPropertyRule` | Uninitialized property | (c) / — / **=** Deliberately split between ADR-58 WD3 (definite assignment) and ADR-38. `\|\|=` lazy memoization is a Ruby-specific trap |
| readonly-discipline cluster (native + `@readonly` phpdoc, 8 rules) | readonly violations | (c) / medium / ○ A future candidate is the annotation-driven `@readonly` counterpart (both sides author-written, so FP-safe). *Inferring* readonly-ness is high-risk and rejected |
| `ConsistentConstructorRule` | Ctor compatibility for `self.class.new`-style code | (c) / low-medium / ○ Useful, annotation-gated, for the `Class[T]` factory pattern |
| `MissingReturnRule` | Missing return | (a) mostly / — / Ruby has implicit return of the final expression. The residue (a body that can complete despite a `-> bot` declaration) is low-risk but tiny |
| PHP-specific group: closure `use()`, pass-by-reference, superglobals, attributes, LSB `static::`, property hooks, first-class-callable gates | — | (a) / — |

### Generics (entire directory)

`@template` bounds/defaults/shadowing (G1), consistency of generic-ancestor
instantiation (G2), and variance-position checks (G3) — all 15 rules —
**(c) / low / ◎ a bulk-adopt candidate**. These amount to annotation linting
against RBS type arguments (bounds `< T`, `out`/`in` variance) and are
FP-free by construction, since both sides are author-written. Worth checking
for overlap with the rbs gem's own checks before wiring this in as an
engine-internal validation, connected to the PR #96/#97 isolation arc.

### PhpDoc (entire directory)

The family of annotation-vs-reality consistency checks — **(c) / low /
◎ the single largest unmined genre**. Counterparts:

- Inconsistent-annotation cluster (`IncompatiblePhpDocTypeRule` and 3 others)
  → checking RBS/inline-RBS against inferred types for contradictions
- `@phpstan-assert` verification → verifying that
  `%a{rigor:v1:predicate/assertion}` actually references a real parameter and
  actually narrows it
- Conditional return-type verification → a verification layer for ADR-20's
  conditional grammar
- Malformed tag syntax (`InvalidPhpDocTagValueRule` and others) → unknown
  `rigor:v1:` directives, broken inline RBS
- `@var` hygiene → an inline type assertion that contradicts inference (a
  cousin of ADR-59's weak-form `spec.impossible-assertion`)
- require-extends / require-implements / sealed → connects to `conforms-to`,
  ADR-28, and ADR-36/47 WD3b

### Remaining directories (highlights only)

- **Generators**: checking `yield` values against a declared block signature
  is (c)/low, an extension of existing scope. `YieldInGeneratorRule` is (a).
- **Keywords**: `ContinueBreakInLoopRule` is medium in Ruby, since `break`/`next`
  inside a block is legal — not adopted. `RequireFileExistsRule` is low if
  limited to a `require_relative` literal, but I/O during analysis intersects
  with ADR-45 descriptors — held back. goto/strict_types are (a).
- **Names / Namespaces**: `use`-statement checking is (a). Unresolved
  constant references at the base already have a careful equivalent in
  Rigor's discovery + Dynamic fallback.
- **Operators**: `InvalidBinaryOperationRule` is already ruled on by
  ADR-64/42/78 (=). The `<=>`/Comparable-missing fragment of
  `InvalidComparisonOperationRule` is ○, in the same family as
  sort-castability. inc/dec, pipe, backtick are (a).
- **Missing**: only `MissingReturnRule` above.
- **Pure**: enforcing a purity contract is high-risk (memoization, logging —
  Ruby purity is almost entirely technically impure) — ×. The reverse case
  ("declared impure but no side effects") is medium, but there's no
  vocabulary for it yet.
- **Regexp**: `RegularExpressionPatternRule` — (b)/low/**◎**. When a
  string-built pattern folds to a constant, execute `Regexp.new` inside a
  rescue harness to verify it (ADR-39 has already policy-approved exactly
  this technique). Literal regexes are already checked by Ruby at parse
  time, so the value is in string-built patterns.
- **RestrictedUsage / InternalTag**: not hardcoded rules but a **plugin
  seam** (an extension supplies the message). In Rigor, adding a
  `restricted_usage` verb to ADR-52's compiled dispatch table could
  uniformly cover deprecation (examples/rigor-deprecations), internal-API,
  and API-freeze consumers — ○ demand-driven (maintains the §7.1 ruling).
- **TooWideTypehints**: overly-wide return-type checking is the
  **enforcement arm of ADR-5's robustness principle (strict returns)** —
  (b)/medium. Suppressed for bodies containing Dynamic, needs to account for
  override hierarchies (ADR-35), and intentional API width exists, so
  **shipping as a `bleeding_edge:` feature is the natural fit** (a candidate
  second consumer for ADR-50 WD2). The param-out family is (a) (pass-by-reference).
- **Traits**: almost entirely (a) (a product of PHP's trait-inlining model).
  Only `ConflictingTraitConstantsRule`'s module-vs-includer constant
  shadowing is a thin (c)/low.
- **Variables**: `DefinedVariableRule` translates into nil-flow in Ruby and
  is already within the existing possible-nil territory (=). The
  isset/empty/?? family is ○ as redundant-guard detection, in the same shelf
  as always-truthy. `$this`, unset, compact, and by-ref are (a).
- **Whitespace**: (a) — RuboCop's territory.
- **Api / Debug / Playground / Ignore**: Api is the tool's own enforcement
  of its BC promise (reference value as the idea of enforcing a frozen
  surface on a plugin, per ADR-50; the actual implementation would fold
  into RestrictedUsage). Debug's `assertType` magic function is structurally
  identical to Rigor's spec fixtures / ADR-62 oracle (d). Playground's
  `PromoteParameterRule` ("enable this setting and you'll get this error" as
  an advertisement) is recorded as a cousin of the `show-bleedingedge` UX.
  **`IgnoreParseErrorRule` is ◎**: a broken suppression comment silently
  becoming a no-op is the worst possible outcome for a baseline workflow —
  parse errors in `# rigor:disable` should be diagnosed.

## Re-evaluation: prioritized verdicts

### Tier 1 — adoption candidates (low FP, cheap with existing machinery)

| # | Candidate | PHPStan source | Rationale |
|---|---|---|---|
| 1 | **RBS/annotation declaration validation family** (unknown class, invalid type, broken alias; whether `%a{}` actually references a real parameter and actually narrows it; variance position; generic bounds and instantiation consistency) | PhpDoc/ + Generics/ + Classes' tag-validity cluster | FP-free by construction, since both sides are author-written. A direct extension of the PR #96/#97 isolation arc. The single largest unmined genre |
| 2 | **Diagnosing parse errors in suppression comments** | `IgnoreParseErrorRule` | A broken `# rigor:disable` silently doing nothing is the worst failure mode for the suppression system. Implementation cost is limited to an error path in the existing parser |
| 3 | **`return` inside `ensure`** | `OverwrittenExitPointByFinallyRule` | A classic footgun that swallows the return value and any in-flight exception. Purely syntactic; low FP demonstrated by RuboCop precedent |
| 4 | **`raise` of a non-exception operand** | `ThrowExprTypeRule` | Almost certainly a TypeError unless it's an Exception-family object, a String, or responds to `#exception` |
| 5 | **rescue-clause shadowing** | Part of `CatchWithUnthrownExceptionRule` | Provable by hierarchy comparison alone. The never-thrown half is not adopted |
| 6 | **Duplicate keys in a hash literal** | `DuplicateKeysInLiteralArraysRule` | Silent last-wins behavior is a real bug. Limited to literals + pinned values |
| 7 | **Format-string placeholder checking** | printf cluster | Literal format checking for `format`/`sprintf`/`String#%` — squarely constant folding's home turf |
| 8 | **Default argument value vs. declared type** | `IncompatibleDefaultParameterTypeRule` | Default values fold on the spot. Limited to declared parameter types (consistent with ADR-5) |
| 9 | **Override across kwarg renaming** | `MethodCallWithPossiblyRenamedNamedArgumentRule` | A stronger LSP violation in Ruby than in the PHP version. Absorbed into ADR-35 |
| 10 | **Runtime verification of a string-built regex** | `RegularExpressionPatternRule` | An ADR-39-approved technique (`Regexp.new` inside a rescue harness). Datetime-parse verification (`DateTimeInstantiationRule` → `Time.parse`-family) has the same shape |
| 11 | **impossible-check (always-true/false type-predicate calls)** | `ImpossibleCheckType*` | A cheap consumer of the existing predicate-fact mechanism. Also picks up `PossiblyImpureTipHelper`'s message softening |
| 12 | **Use of a `void` value** | `UsageOfVoidMatchExpressionRule` | An RBS-declared `void` reflects author intent. Equivalent to Steep |

### Tier 2 — gated / demand-driven (medium, or awaiting machinery)

- **Too-wide return** (the enforcement arm of ADR-5) — as a `bleeding_edge:`
  feature. Suppressed for bodies containing Dynamic, must account for ADR-35
  hierarchies.
- **`&.` on a non-nil value / redundant-guard detection** (Nullsafe family,
  isset family) — only on the same `:info`/strict shelf as always-truthy.
- **`restricted_usage` plugin verb** (unifying the RestrictedUsage/InternalTag/Api
  seam) — maintains the §7.1 demand-driven ruling. Deprecation,
  internal-API, and frozen-surface enforcement are already visible as three
  consumers.
- **sealed / AllowedSubTypes + `case/in` exhaustiveness** — where the §7.1
  ADOPT ruling meets ADR-47 WD3b. Still demand-gated.
- **`sort`/comparison of a `<=>`-incompatible union** — a real ArgumentError
  family, but needs a coerce/monkey-patch gate.
- **Unused ctor argument / annotation-driven readonly / ConsistentConstructor
  / NoDiscard annotation / `.new` on a module** — all drop to low with an
  annotation or convention gate, but demand hasn't been observed yet.
- **Always-true/false comparison via range arithmetic** — depends on how
  much range-type support we have.

### Tier 3 — rejected (high FP in Ruby, or already ruled on)

- **Purity-based no-effect statements** (DeadCode purity cluster, Pure/) —
  Ruby purity is unknowable due to memoizing ivar writes and monkey-patching.
  Only the narrow fragment limited to the fold catalog is a future candidate.
- **Unused private method/constant** — `send` and symbol callbacks are the
  backbone of Rails. Reconfirms §7.1's "only paired with a suppression
  hook, deferred past 1.x."
- **Duplicate-declaration / reopening detection** — a core piece of Ruby's
  dynamism itself.
- **Visibility enforcement without a send-aware gate / abstract inference /
  readonly inference / `new static` safety** — fires on idiomatic patterns.
- **Naive binary-operation / unconditional argument-type checking** — ADR-64's
  coerce barrier already carves this down to the right shape.
- **checked-throws family** — no throws vocabulary exists, and the raise set
  is unbounded.
- **missing-typehint family** — material for the coverage dimension, not a
  diagnostic (already occupied).

### Tier 4 — PHP-specific (target doesn't exist)

Pass-by-reference in general (ParameterOut, by-ref foreach), closure
`use()`, superglobals, `$this` assignment, goto/label,
`declare(strict_types)`, attributes, property hooks (PHP 8.4), promoted
properties, readonly class, enum syntax, cast syntax and version gates,
`use` import, LSB `static::`, inc/dec/pipe/backtick, array key int|string
constraints, BOM/whitespace. By feel, about a quarter of the rule assets.

## Architectural observations (takeaways beyond the rules)

1. **Contrasting FP-control designs**: PHPStan controls FP via
   `RuleLevelHelper`'s **levels** — at lower levels, a type-visibility
   filter *hides* nullable/mixed arms from rules. Rigor keeps the full type
   and controls firing via policy (severity profiles, evidence tiers,
   provenance gates). Rigor's approach is more honest, but PHPStan's
   approach functions as an "onboarding ramp" — worth referencing in an
   onboarding context (ADR-22/23).
2. **Error-object vocabulary**: PHPStan's `NonIgnorableRuleError` (an error
   that a suppression comment cannot dismiss) and `FixableNodeRuleError`
   (carries an auto-fix, the basis for `--fix`) have no counterpart in
   Rigor. The former is recorded as the non-suppressibility of
   configuration-error-class diagnostics; the latter as a future `rigor fix`.
3. The **collector pattern** (two-pass cross-file aggregation), set aside in
   ADR-7, is instead handled in Rigor by the discovery index + the ADR-9
   fact store. PHPStan's transitive purity resolver is the heaviest
   consumer of this pattern.
4. **Trait-context dedup** (`ConstantConditionInTraitRule`: reports only
   when the value agrees across all using classes) is the necessary FP
   suppression mechanism for the day module bodies get re-analyzed per
   includer.
5. **Tool self-protection rules** (Api/ enforces a BC promise on third
   parties, `make check-plugins` ≈ the same idea as ADR-43) and **Debug/'s
   `assertType` self-hosted type-test oracle** (≈ spec fixtures + ADR-62)
   confirm that the two designs converged independently.

## Method and limitations

- The investigation was carried out by four subagent tracks (three rule-group
  splits plus a Rigor-side inventory of rules and prior rulings), and this
  body is their consolidation. Each rule's error-message string was read as
  evidence, but **the full implementation of all 600 files was not read
  line by line** — this includes clustering (treating
  Function/Method/StaticMethod variants as equivalent, etc.).
- FP-risk assessments are analogical, drawn from Rigor's existing rulings
  (ADR-64 coerce, ADR-78 reflective send, ADR-58 provenance, ADR-47 corpus
  sweeps) rather than measured. Tier 1 candidates will still need the usual
  corpus gate at implementation time.
- The **separate packages** phpstan-strict-rules / phpstan-deprecation-rules
  etc. are out of scope (only the main `src/Rules` was surveyed).
- A head-to-head comparison of diagnostic output (running both tools against
  the same codebase) still does not exist.
