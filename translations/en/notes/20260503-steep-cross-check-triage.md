---
title: "Steep 2.0 cross-check triage (2026-05-03)"
description: "English translation of the Steep 2.0 cross-check triage note recording sig drift and false-positive analysis."
sourceSha: "e7ea90ad1caf8ef2c8ede6a0dcf7a10157066379ea8d39afb070d1630bf7db60"
sourceCommit: "baf3cf01385b0c15037940f46025827f94623800"
translationStatus: "translated"
---

Triage of the results of adding Steep 2.0.0 as an independent bundle under `tool/steep/` and running `make steep-check` to check `lib/` against `sig/`. On the premise of keeping Rigor's own `make check` clean, this separates from the external checker's perspective which warnings are **real mismatches Rigor should also detect**, which are **correctly not picked up by Rigor (= limits of Steep)**, and which are **resolvable as false positives through more precise typing**.

## Summary

- Input: `make steep-check`
- Counts: **17 files / 54 cases** (`Ruby::MethodBodyTypeMismatch` 42, `Ruby::MethodParameterMismatch` 9, `RBS::DuplicatedMethodDefinition` 3)
- Categories:

| Category | Count | Summary |
| --- | --- | --- |
| A. Rigor should also detect (real sig drift) | 48 | Wrong return-type declarations, missing arguments, duplicated declarations. Resolvable with `sig/` fixes. |
| B. Correctly not detected by Rigor (Steep-specific false positives) | 0 | None this round. All warnings are grounded in fact. |
| C. Resolvable as false positives through proper typing (will vanish with Rigor refinement) | 6 | Caused by failure to track `Array()` coercion and `Data.define` keyword synthesis. |

Below, the breakdown and recommended actions are summarised by category.

---

## Category A — Rigor should also detect (real sig drift)

Hand-written declarations on the `sig/` side have failed to keep up with the implementation in `lib/`. The kind that should be detected if "strict on returns" from the Robustness Principle ([docs/type-specification/robustness-principle.md](../type-specification/robustness-principle.md)) is straightforwardly applied.

### A-1. Return type of predicate methods `top` / `bot` / `dynamic` (39 cases)

The predicate methods `top` / `bot` / `dynamic` exposed by each type carrier (`Top`, `Bot`, `Dynamic`, `Constant`, `IntegerRange`, `Nominal`, `Singleton`, `Union`, `Difference`, `Refined`, `Intersection`, `Tuple`, `HashShape`) return `Trinary.yes/no/maybe` in the implementation ([lib/rigor/type/top.rb:26-36](../../lib/rigor/type/top.rb)), but [sig/rigor/type.rbs:11-13](../../sig/rigor/type.rbs) declares:

```rbs
def top: () -> Top
def bot: () -> Bot
def dynamic: () -> Dynamic
```

**The meaning of the return type itself is being mistaken**: the sig reads as "calling `top` returns a `Top`-type instance," but in reality it is a predicate "is this type top?" returning Trinary.

- Should it be detected: **Yes** — a straightforward violation of strict on returns. Automatically detectable once Rigor is complete.
- Fix: align the sig side with `def top: () -> Trinary` etc. 13 files × 3 methods = 39 sites.
- Scope of impact: `sig/rigor/type.rbs` only. No changes needed on the `lib/` side.

Note: the warnings for `Refined#dynamic` and `Difference#dynamic` show the body inference as `(Type::Dynamic | Trinary)`, but this is the same cause (a side effect of Steep picking up the route where an inherited / delegated target wrongly returns `Type::Dynamic`) and disappears with the same fix.

### A-2. Return value of `IntegerRange#lower` / `upper` (2 cases)

[lib/rigor/type/integer_range.rb:67-71](../../lib/rigor/type/integer_range.rb) represents `NEG_INFINITY` / `POS_INFINITY` with Symbol sentinels, so `lower` / `upper` can return `Integer | Float | Symbol`. Meanwhile [sig/rigor/type.rbs:71-72](../../sig/rigor/type.rbs) says `() -> Numeric`. Since Symbol is not a subtype of `Numeric`, this is inconsistent.

- Should it be detected: **Yes** — the return set is broader than declared, a clear strict-on-returns violation.
- Two possible fix paths:
  1. Sig to `() -> (Integer | Float | Symbol)` (match the actual).
  2. Replace impl with `Float::INFINITY` sentinels and keep the sig's `Numeric`.
- Which is preferable needs to be reconciled with ADR-3 (type representation), but as long as we adopt Symbol sentinels, updating the sig side is realistic for now.

### A-3. Missing argument on `record_declarations` (1 case)

[lib/rigor/inference/scope_indexer.rb:473](../../lib/rigor/inference/scope_indexer.rb) takes 4 arguments:

```ruby
def record_declarations(node, qualified_prefix, identity_table, discovered)
```

[sig/rigor/inference.rbs:135](../../sig/rigor/inference.rbs) takes 3:

```rbs
def self?.record_declarations: (untyped node, Array[String] qualified_prefix, Hash[untyped, Type::t] table) -> void
```

The 4th argument `discovered` has dropped out of the sig — typical sig drift.

- Fix: add `Array[untyped] discovered` (actual type to be confirmed) to the sig.

### A-4. Duplicated declarations of `RbsLoader#instance_definition` / `singleton_definition` (3 cases)

In [sig/rigor/environment.rbs:41,48](../../sig/rigor/environment.rbs) and [same:43,49](../../sig/rigor/environment.rbs) the same-named methods are declared twice with conflicting return types `untyped` and `untyped?`:

```rbs
def instance_definition: (String | Symbol class_name) -> untyped
...
def instance_definition: (String | Symbol class_name) -> untyped?
```

The RBS spec does not allow duplication other than as overloads. Removing one of each line for `instance_definition` / `singleton_definition` and unifying on the `untyped?` side is reasonable (confirm whether the implementation can return `nil`).

- Should it be detected: **Yes** — an RBS-spec-level error; Rigor should error (or will error) the same way when reading through the RBS parser.

### A-5. Required keywords on `CLI#initialize` (3 cases)

[lib/rigor/cli.rb:31](../../lib/rigor/cli.rb):

```ruby
def initialize(argv, out:, err:)
```

[sig/rigor.rbs:23](../../sig/rigor.rbs):

```rbs
def initialize: (?Array[String] argv, ?out: untyped, ?err: untyped) -> void
```

The sig has `argv`, `out:`, `err:` all optional, but the impl has all required (`out:` has no default). A caller trusting the sig and calling `CLI.new` with no arguments fails with `ArgumentError`.

- Should it be detected: **Yes** — the contractual lenience is not respected by the impl.
- Resolution direction: following ADR-5 (Robustness Principle), loosen the impl side: align to `def initialize(argv = [], out: $stdout, err: $stderr)`. This also preserves the behaviour of `self.start`.

---

## Category B — Correctly not detected by Rigor (Steep-specific false positives)

**Zero hits this round.** All warnings emitted by Steep 2.0 reflected some substantive mismatch. The reason no warnings hit the area where Rigor has intentionally decided "not to detect" under its own lenience policy is that the `sig/` side has diverged considerably from the implementation through hand-writing, so basic contract violations were exposed before the lenience discussion was reached. After fixing the sigs and re-running, it is likely that cases classifiable under this category will appear (e.g. Steep refusing gradual acceptance via `untyped`).

---

## Category C — Resolvable as false positives through proper typing

Warnings caused by Steep's flow-sensitivity or its core-library modeling being coarse. False-positive-treated in the sense that they should disappear naturally once Rigor's robustness principle and control-flow analysis ([docs/type-specification/control-flow-analysis.md](../type-specification/control-flow-analysis.md)) are complete.

### C-1. `Array(union)` coercion (1 case)

[lib/rigor/analysis/fact_store.rb:128](../../lib/rigor/analysis/fact_store.rb):

```ruby
def fact_targets(fact)
  Array(fact.target)
end
```

`fact.target` is `Target | Array[Target]`. Ruby's `Array()` Kernel method has the convention "leave as-is if `Array[T]`, wrap in `[T]` if `T`," so the return value is naturally `Array[Target]`. Steep infers the return of `Array()` as `[T | Array[T]]` (a 1-element tuple), unable to step into specialization across union branches.

- Rigor perspective: this disappears by adding to the built-in catalog of `Kernel#Array` ([data/builtins/](../../data/builtins/)) the spec "when the argument is a union, normalise each member and unify."
- No immediate workaround needed — stays at warning under lenient settings as a false positive.

### C-2. `initialize` overrides on `Data.define`-derived classes (5 cases)

`Target` / `Fact` in [lib/rigor/analysis/fact_store.rb:26,32](../../lib/rigor/analysis/fact_store.rb) put pre-processing on top of classes generated by `Data.define(:kind, :name)` etc. via `def initialize(kind:, name:) ...`. Steep cannot fully analyze the keyword matching between `Data.define`'s auto-generated signatures and the hand-written overrides, raising `MethodParameterMismatch` in 5 places.

- Rigor perspective: it disappears by adding, in addition to specialised inference of `Data.define(*members)` ([docs/type-specification/structural-interfaces-and-object-shapes.md](../type-specification/structural-interfaces-and-object-shapes.md)), a rule that prefers explicitly-written `initialize` signatures. This is a feature that fits directly into the v0.0.4 / v0.1.0 roadmap.
- Workaround: writing `Target` / `Fact`'s `initialize` **explicitly in full** on the sig side so it doesn't contradict `Data`'s auto-generated signature also silences Steep (the current sig side is already hand-written). What Steep can't pick up is the `Data`-derived composed signature; this is an area where Rigor can take the lead by having a `Data.define`-specific recognizer.

---

## Action proposal

In priority order:

1. **Fix return types of predicate methods in `sig/rigor/type.rbs`** (A-1, 39 cases)
   - Close to mechanical replacement. Align to `def (top|bot|dynamic): () -> Trinary`.
   - This alone removes 39 of 54 cases.
2. **Clean up duplicated declarations in `environment.rbs`** (A-4, 3 cases)
   - Delete the extra lines and unify on the `untyped?` side.
3. **Add the 4th argument to `scope_indexer`'s sig** (A-3, 1 case)
4. **Fix `IntegerRange#lower/upper` sig** (A-2, 2 cases)
   - Short term: sig to `Integer | Float | Symbol`. Long term: re-examine the sentinel representation in ADR-3.
5. **Loosen `CLI#initialize`** (A-5, 3 cases)
   - Fix to `def initialize(argv = [], out: $stdout, err: $stderr)`.
6. **Leave Category C as lenient warnings for now**. Re-run and confirm they vanish once Rigor's `Kernel#Array` modeling / `Data.define` recognizer lands.

---

## Reproduction

```sh
# One-time (dependency resolution)
nix develop --command make steep-install

# Run
nix develop --command make steep-check

# Individual target (passing options)
nix develop --command make steep ARGS="check --severity-level=error"
```

The `Steepfile` is currently `D::Ruby.lenient`. This setting is for compatibility-check purposes — to comprehensively pick up warnings (= detect more broadly than strict). Whether to incorporate into the `make verify` chain in the future will be decided by looking at the remaining cases after resolving A-1 through A-5.

---

## Pre-v0.1.1 release follow-up (2026-05-08)

A-1 through A-5 have all been landed in v0.1.x's Track 4 (see `docs/ROADMAP.md` v0.1.1 Track 4 item 11 / 13 / 12). Re-run (`make steep-check`) results re-classified just before the v0.1.1 release:

- **Input:** `make steep-check` (v0.1.1 release candidate branch)
- **Counts:** 8 cases / 2 files (8 warnings only, 0 errors)

| Category | Count | Content |
| --- | --- | --- |
| A. Real sig drift | 0 | A-1 through A-5 all resolved |
| B. Correctly not detected by Rigor | 8 | `Data.define do ... end` override block / `Kernel#Array` narrowing / `def` lambda default — due to limits of Steep's Ruby idiom support |
| C. False positives (vanish with Rigor refinement) | 0 | Re-classified into Category B |

### Error resolved in v0.1.1 (1 case)

- `sig/rigor.rbs:67` `RBS::UnknownTypeName: Rigor::Cache::Store` — `Rigor::Cache::Store` is still not properly sigged as of v0.1.1 (entered in `UNSIGNED_NAMESPACES`), so the reference was changed to `untyped` to bring it down. At the same time `attr_reader plugin_registry: untyped` and `?plugin_requirer: untyped` were added to the `Runner` declaration (reflecting in the sig the Runner surface introduced in Track 2 slice 7).
- Full sig of `Rigor::Cache::Store` is deferred as a v0.1.x maintenance task (to be written at the stage of removal from `UNSIGNED_NAMESPACES`).

### Classification of remaining 8 (warnings)

All due to limits of Steep's Ruby idiom recognition; no mismatches that need fixing on the Rigor codebase side:

| Count | Location | Kind | Nature |
| --- | --- | --- | --- |
| 5 | `lib/rigor/analysis/fact_store.rb:26-32` | `Ruby::MethodParameterMismatch` | `Target = Data.define(...) do def initialize(kind:, name:); ...; end; end` — Steep tries to match the `def initialize` inside the override-block against the outer `FactStore`'s `initialize` declaration. A known Steep limitation that it cannot tie up with the Data subclass's sig. Runtime correctly calls Data#initialize via `super(...)`. |
| 1 | `lib/rigor/analysis/fact_store.rb:128` | `Ruby::MethodBodyTypeMismatch` | `Array(fact.target)` with `fact.target: Target \| Array[Target]` — Steep cannot narrow the `Kernel#Array` coercion to `Array[Target]` instead of `[Target \| Array[Target]]`. Rewriting (`fact.target.is_a?(Array) ? fact.target : [fact.target]`) makes it disappear, but readability worsens, so deferred. |
| 2 | `lib/rigor/plugin/loader.rb:41` | `Ruby::MethodParameterMismatch` | `def self.load(configuration:, services:, requirer: ->(name) { require name })` — Steep mistakes the lambda default for the `Kernel#require` sig shape. Side effect of the Plugin namespace not having a sig (`UNSIGNED_NAMESPACES`). |

### Conclusion

`make steep-check` is stable at **error 0 / warning 8**. It is still not included in the `make verify` chain (intentional divergence at warning level is allowed). All warnings are expected to resolve once `Plugin::*` / `Cache::Store` sigs are properly developed.
