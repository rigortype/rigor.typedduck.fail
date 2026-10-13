---
title: "Alba Onboarding and rbs-inline Pilot — Field Observations of sig-gen / inline Integration in a Hand-Written sig/ Project"
description: "Empirical observations from onboarding the Alba gem to Rigor, piloting sig-gen and rbs-inline migration on an existing hand-crafted sig/ codebase, and distilling invariants for deterministic RBS refinement."
sourceSha: "723c1b76248598474b2da6a3dafc124d38f7cf92a7afa17d088f4573d0b930fe"
sourceCommit: "9cc10f58aa968f6e3116557a491aae41bc8a89e1"
translationStatus: "translated"
---

Status: **research note, no design commitments.** Observed Rigor version: **0.4.2** (`mise gem:rigortype@0.4.2`). Target repository: [alba](https://github.com/okuramasafumi/alba) (a JSON serializer gem, `required_ruby_version >= 3.0.0`, with **hand-written RBS in `sig/` committed, used for Steep, and bundled in the gem**). This note records in chronological order the events of the session on 2026-10-11–12: installation → `rigor-project-init` onboarding → `sig-gen` trial (failure → restoration) → manual type tightening → YARD-to-`rbs-inline` pilot (validating mechanics with Approach A, then selecting Approach B as overall policy). No changes were made to application logic (only comments and RBS).

---

## 1. Installation via mise: Three Discoveries

Execution environment: macOS arm64, Homebrew `ruby 4.0.7` (head of PATH) + mise-managed `ruby 4.0.6` (`mise use -g ruby=4.0.6` configured). Pre-existing Rigor installation: mise-managed `0.4.0`.

### 1a. Stale PATH in Non-Interactive Shells

Immediately after `mise use --pin gem:rigortype@0.4.2`, running `rigor --version` within the same session still reported `0.4.0`. `mise which rigor` correctly resolved `0.4.2`, and updating PATH via `eval "$(mise hook-env)"` yielded `0.4.2`. This is the standard scenario described in `install.md` Step 3.

### 1b. `minimum_release_age` Quarantine

RubyGems `latest.json` showed `0.4.2`, while `mise latest gem:rigortype` returned `0.4.1`. `mise ls-remote` printed to stderr: `1 newer gem:rigortype release hidden by minimum_release_age`. Because `mise settings get minimum_release_age` was unset (default mise behavior), installing by explicitly specifying `<LATEST>` succeeded as prescribed in `install.md`. Exactly matches documented behavior.

### 1c. RBS Native Extension `libruby` Mismatch (Primary Finding 1)

**Symptom**: `rigor --version` functioned normally, but analysis commands (`rigor triage` / `rigor check`) crashed immediately:

```
dlopen(.../gem-rigortype/0.4.2/libexec/gems/rbs-4.2.0/lib/rbs_extension.bundle, 0x0009):
Library not loaded: /opt/homebrew/opt/ruby@4.0/lib/libruby.4.0.dylib (LoadError)
```

**Root Cause**: `otool -L rbs_extension.bundle` confirmed that the bundle linked against `/opt/homebrew/opt/ruby@4.0/lib/libruby.4.0.dylib` (a **non-existent Homebrew keg**). The `mise` gem backend builds native extensions during `gem install` using the **Ruby at the head of PATH at execution time** (Homebrew 4.0.7), whereas at runtime `installs/ruby/4.0.6/bin/ruby` (the mise runtime) attempts to `dlopen` the bundle. Because `--version` does not load RBS, the lockout went unnoticed.

**Remediation**: Run `eval "$(mise hook-env)"` (placing mise Ruby at the head of PATH) → `mise install --force gem:rigortype@0.4.2`. All gems including `rbs` were recompiled against mise Ruby 4.0.6. `otool -L` subsequently pointed to `installs/ruby/4.0.6/lib/libruby.4.0.dylib`, and `triage` succeeded.

**Assessment**: A **new concrete instance** of the "native extension built with a different Ruby" defect class (footnote: `linked to incompatible libruby`) identified in [20260717-install-channel-evaluation.md](../20260717-install-channel-evaluation/) §1. Rather than global gem pollution, this was caused by the **mise gem backend itself** building against the Homebrew Ruby at the head of PATH. It is worth advising in `install.md`: "When reinstalling with mise, run hook-env to ensure the mise Ruby is at the head of PATH beforehand."

## 2. Onboarding Results — Zero Diagnostics, Empty Baseline

- **Stack Detection**: Plain Ruby library (`railties`/`activesupport` are optional integration / test dependencies with `require: false`). Because hand-written `sig/` exists, Phase 5 signature generation was skipped.
- **Mode**: Acknowledge (default `severity_profile: balanced`). **Plugins**: None (discovered `rigor-alba` in the plugin catalogue, but it models Alba for *consumer* applications; using it inside Alba itself would duplicate `sig/alba/*.rbs`).
- **`target_ruby`**: `"3.3"` (gemspec `>= 3.0.0` → Prism minimum 3.3 lookup table).
- **triage / check**: `total: 0`. No hints, no plugin `load-error`. Confirmed with `rigor sig-gen --format json` (`new_method: 0`) that hand-written `sig/` already declares all methods, verifying the zero diagnostic count is genuine.
- **baseline**: Empty (`ignored: []`). All future diagnostics are new findings — functioning as a strict regression gate.
- **AGENTS.md**: Appended the canonical `rigor-type-oracle` fragment (`references/02-agents-md-fragment.md`) verbatim. Because `CLAUDE.md` and `.cursorrules` symlink to `AGENTS.md`, updating one location sufficed.

## 3. sig-gen Trial — `--write --overwrite` against Hand-Written `sig/` Is Destructive (Primary Finding 2)

Per user request, we tested `rigor sig-gen --params=observed --write --overwrite lib` (prerequisite: `sig/` clean and committed to git, safely recoverable). **The run failed, and was restored via `git checkout -- sig/`.**

### 3a. Classification

```
new_method: 0 / skipped: 37 (sig.skipped.untyped-return) / tighter_return: 20
```

### 3b. Broken RBS Build from Cross-File Duplicate Declarations

Generated files: `sig/alba/resource.rbs` (+13) and `sig/alba/association.rbs` (+6). The latter received module-level `self.` methods such as `Alba.resource_class` and `Alba.register_type`, which were already declared in the existing `sig/alba.rbs`. Result:

```
rbs.coverage.definition-build-failed: 3 RBS class definition(s) failed to build:
Alba, Alba::Resource::ClassMethods, Alba::Resource.
First failure: RBS::DuplicatedMethodDefinitionError on `::Alba.resource_class`.
Conflicting signature file(s): sig/alba.rbs, sig/alba/association.rbs, sig/alba/resource.rbs.
```

Because Rigor drops broken classes down to KNOWN `Dynamic[top]`, **diagnostics remained at 0 while coverage quietly degraded**. `sig-gen` emits module `self.` methods into the first file it touches during generation, ignoring pre-existing declaration homes (`sig/alba.rbs`). **Upstream issue candidate**: "Avoid duplicate emission when an existing RBS file already declares the method in another file."

### 3c. Quality of Generated Signatures — Returns Tightened, Parameters Widened

While the 20 generated candidates made return types concrete, they **widened parameters to `untyped`** (e.g., `association: (Symbol | String, ?instance_proc?, ?source: Proc?, ...)` → `(untyped, ?untyped, ...)`). Furthermore, they were inserted as intra-module methods that shadowed the precise interfaces on the hand-written side (`_ClassMethods`). The net effect was a **reduction in overall precision**.

### 3d. Artifact Return Types (Distinguishing Noise)

| Pattern | Example | How to Identify |
| --- | --- | --- |
| Value returned by trailing assignment | `root_key! -> true` / `stringify_keys! -> false` (YARD says `@return [void]`) | Trailing expression is `@ivar = literal` |
| Return value of `alias_method` | `prefer_resource_method! -> Symbol` | `alias_method` evaluates to the new name Symbol |
| Return value of `each` | `register_default_types -> Array[singleton(Integer) \| singleton(String)]` | Trailing expression is `.each` |
| Massive union | `inherited -> Hash[Symbol, Array[...] \| ...]` | Composite return from multiple ivar assignments |

### 3e. Selective Manual Application (5 Candidates → 4) and Two Additional Lessons

From the 20 candidates in `--diff`, we applied 5 where return types carried genuine semantic value to the hand-written signatures (preserving hand-written parameters). Verification at this point relied solely on `rigor check` and `rbs validate` (as `bundle exec rake typecheck` was temporarily broken due to missing dev gems). **Once the bundle was repaired and Steep ran, two issues surfaced:**

- **Reverted `reset_transform_keys -> Hash[untyped, untyped]`**: Setters such as `inflector=` end with `reset_transform_keys` as their final expression, which caused the setter's body type to mismatch its declaration and triggered `Ruby::SetterBodyTypeMismatch`. **"Artifact return types" are not harmless on setters** — even if callers discard the return value, it flows through the setter body contract.
- **RBS union returns require parentheses**: `-> Alba::Association | Alba::ConditionalAttribute` passed `rbs validate` under the bundled RBS 4.2.0, but Steep's parser rejected it with `Syntax error: unexpected token for method type, token=Alba`. Wrapping it as `-> (A | B)` satisfied both tools. **A parser discrepancy across RBS versions** (highlighting the value of validating with two independent type checkers).

Final retained candidates (4 total): `register_type -> Alba::Type`, `association -> (Alba::Association | Alba::ConditionalAttribute)`, `nested_attribute -> (Alba::ConditionalAttribute | Alba::NestedAttribute)`, and `layout -> Alba::Layout`. **In repositories with existing hand-written `sig/`, use `sig-gen` as a review surface via `--diff` / `--format json`, and reserve `--write --overwrite` exclusively for scratch generation.**

## 4. Environment Recovery and Unblocking

During initial onboarding, `bundle exec rake typecheck` and `test` failed because Bundler could not resolve a GitHub source gem (`rubocop-gem_dev`). Running **`bundle install`** resolved all 79 gems (including Steep 2.1.0). As a side effect, **`Gemfile.lock` was generated** (gitignored), prompting Rigor to report `rbs.coverage.missing-gem` (info: 60 dev gems lack RBS). Because `fail_on` is set to `error`, this did not breach the CI gate, but it introduces noise visible only to developers with a local lockfile. Policy (installing RBS collections vs. `dependencies.source_inference:` vs. accepting info notices) remains open.

## 5. rbs-inline Pilot (Primary Finding 3) — `lib/alba/type.rb`

To evaluate YARD-to-`rbs-inline` migration, we piloted the pipeline on a small file. After validating the machinery with Approach A (treating inline as source of truth and removing corresponding methods from `sig/`), **Approach B was adopted as the project-wide direction** (see §6).

### 5a. Implementation

- Added `# rbs_inline: enabled` and `# @rbs` meta annotations (`# @rbs name: T` / `# @rbs return: T`, with attribute casts like `attr_reader :name  #: T`) to `lib/alba/type.rb`. Followed hand-written signatures faithfully for precise types (`name: Symbol | String | Class`, etc.).
- Configured `.rigor.dist.yml` with `plugins: [rigor-rbs-inline]` and `sig_gen.inline_declared: skip`.
- Installed `rbs-inline 0.14.0` in the Rigor environment (`mise exec gem:rigortype -- gem install rbs-inline`).

### 5b. Verification Results

| Check | Result |
| --- | --- |
| `rigor plugins` | `rigor-rbs-inline` `[OK]` (`source_rbs_synthesizer: yes`) |
| Positive control for inline enforcement | Modifying an annotation to an incorrect type triggered `def.ivar-write-mismatch` (the annotation polluted ivar inference, detecting cross-method contradiction). **Proves the annotation acts as a live contract.** |
| `bundle exec rake typecheck` | Clean (`rbs validate` + Steep 2.1.0) |
| `bundle exec rake test` | 281 runs / 1400 assertions / 0 failures |

### 5c. Pitfalls in Steep Integration

- **Applying `check "lib", inline: true` across `lib/` breaks**: Steep's inline reader **does not respect the `# rbs_inline: enabled` magic comment**; it declares constants and methods for all files in the directory. This caused duplicate declarations against hand-written `sig/` (`VERSION`, `INTERNAL_VARIABLES`, and `REMOVE_KEY` failed with `RBS::DuplicatedDeclaration`), and dynamic `attr_reader(*INTERNAL_VARIABLES.keys)` triggered `RBS::InlineDiagnostic` (the inline reader cannot handle splatted attributes).
- Remediation (under Approach A): Split Steepfile into `check 'lib'` and `check 'lib/alba/type.rb', inline: true`, removing methods from `sig/alba/type.rbs` while **retaining ivar declarations**. Passed cleanly.

## 6. Project Policy and Implementation of Approach B

While Approach A (inline as canonical, removed from `sig/`) functions within the repository, **Alba bundles `sig/` in the published gem**. Omitting methods from the bundled `sig/` would strip types for consumers. Consequently, **Approach B** was chosen for general adoption and validated during the pilot:

- **Annotations serve as the authoring format; `sig/` is regenerated via the `rbs-inline` CLI**. Because the project is not yet structured around Rigor as primary build tool, **signatures are flattened directly under `sig/` rather than segregated into `sig/generated/`** (`bundle exec rbs-inline --output=sig lib`. Note: the space-separated `--output sig` defaults to `sig/generated`; the `=` form is required to flatten). Hand-written `sig/alba/type.rbs` was replaced with the generated output.
- In-repo Steep runs with **`inline: false`, reading the generated `sig/`** (Steepfile retains `check 'lib'`).
- Added `rbs-inline` to the Gemfile `:type` group (locking the generation workflow into the project).

Verification: `rigor check` 0 errors, `bundle exec rake typecheck` clean, `bundle exec rake test` 281 runs / 0 failures.

### New Asymmetry Found in Approach B (Primary Finding 4) — Ivars Excluded from Merging

During the pilot, adding inline ivar annotations (`# @rbs @name: T`) caused `rigor check` to report:

```
rbs.coverage.definition-build-failed: RBS::InstanceVariableDuplicationError on `::Alba::Type`.
Conflicting signature file(s): virtual:rbs-inline:/.../lib/alba/type.rb
```

**Root cause**: The `rigor-rbs-inline` plugin synthesizes ivars from inline `# @rbs @ivar` annotations. Because the generated `sig/generated/` also declared the same ivar, a duplicate declaration occurred. **Precedence rules ("silent if identical") apply only to methods**; ivars (non-method members) are not compared, causing the build to fail. Steep (`inline: false`) reads only `sig/` and never notices. **An asymmetry visible only to Rigor.**

Remediation (the first practical case requiring manual merging as anticipated in §6): Removed ivar annotations from inline code, manually merged ivar declarations into the post-generation `sig/generated/alba/type.rbs`, and added comments marking them as persistent. `rigor check` returned to clean status.

## 7. Batch Migration (9 Files Excluding `type.rb`) — Late 2026-10-12

Following the `type.rb` pilot, we batch-migrated **9 small-to-medium files** (`version`, `constants`, `deprecation`, `default_inflector`, `typed_attribute`, `nested_attribute`, `conditional_attribute`, `layout`, and `association`). Procedure:
1. Added `# rbs_inline: enabled` and `# @rbs` annotations to each file (methods with blocks received full `#:` signatures).
2. Regenerated in bulk via `bundle exec rbs-inline --output=sig lib` (processed only files with magic comments; `alba.rb` and `resource.rb` were untouched and retained hand-written signatures).
3. **Manually merged hand-written sections**.
4. Verified with Steep, Rigor, and test suite.

Verification results: `rigor check` 0 errors, `bundle exec rake typecheck` clean, `bundle exec rake test` 281 runs / 0 failures. Diff: 10 `lib/` files + 10 `sig/` files, +299 / −160 lines.

### 7a. Generation Boundaries of `rbs-inline` Identified during Merging (Primary Finding 5)

Items that had to be restored manually post-generation (patterns where `rbs-inline` either does not generate or mis-generates signatures):

| Pattern | Concrete Example | Remediation |
| --- | --- | --- |
| **Ivars not generated** | All classes (`@name`, etc.) | Manually merged into generated files with comments marking them for preservation |
| **`class << self` attr casts mis-generated as instance attrs** | `attr_reader :const_cache` inside `class << self` emitted as `attr_reader const_cache:` on the class body | Corrected to `def self.const_cache: () -> Hash[...]` and merged `self.@const_cache` |
| **`delegate` methods not generated** | 6 methods on `DefaultInflector` | Manually restored `def self.*` from previous `sig/` |
| **Kernel restriction override declarations not generated** | `def caller_locations: (Range[Integer]) -> Array[...]` | Manually merged (omitting it yields `\| nil`, causing `.first` to fail with `NoMethod`) |
| **Under-inferred constant types** | `REMOVE_KEY = Object.new.freeze` → `REMOVE_KEY: untyped` | Corrected to hand-written `Object` |
| **Block `[self: singleton(Resource)]` bindings inexpressible** (cannot be written in `#:`)| `?{ () [self: singleton(Resource)] -> void }` on `Association#initialize` | Simplified to `?{ () -> void }` (acceptable slight precision loss) |
| **`extend Forwardable` handled correctly** | `Layout` | Manual `def_delegators` declarations became unnecessary (resolved from Forwardable) |
| **`module_function` handled correctly** | `def self?.warn` | Generated properly |
| **Constants generated correctly** | `VERSION: ::String` in `version.rb` / `constants.rb` | Generated properly |

### 7b. Excluded and Deferred Files (Decision Records)

- `lib/alba/errors.rb` and `lib/alba/railtie.rb`: No YARD, no methods (class shells only) → excluded from migration.
- **`lib/alba.rb` and `lib/alba/resource.rb` deferred**: Contain type aliases (`generic_hash`, `transform_type`, etc.), interfaces (`_ResourceClass`, `_Inflector`, `_ClassMethods`, `_InstanceMethods`, `_ClassContext`), dynamic `attr_reader(*INTERNAL_VARIABLES.keys)`, numerous `self.@*` / `@_*` ivars, and self-binding blocks. Replacing these requires restructuring after `rbs-inline` generation. Because a mechanical replacement would fail, hand-written signatures were retained (no annotations added, preserving consumer stability).

### 7c. Expectations for Rigor / Generation Workflows (User Policy Note)

**The desired role for Rigor (and generation pipelines) is not blindly copying code annotations into `sig/`.** The true requirements are:

1. **Reconstructing annotations into well-formed RBS structure** (rather than verbatim copies of under-inferred types like `initialize -> untyped` or `REMOVE_KEY: untyped`).
2. **Serving as an iterative hardening tool for existing RBS files** — functioning not as a destructive one-shot replacement, but as an engine that progressively tightens alignment between annotations, generated artifacts, and hand-written declarations (Approach B in §6 and manual merging in §7a represent one form of this iteration).

Supporting evidence: wholesale generation via `--write --overwrite` degrades existing precise parameters to `untyped` (§3c), while constants and `initialize` returns are emitted with blunt inference (§7a). Generation quality should therefore be judged not on "transcription fidelity", but on "RBS correctness and how effectively it closes the delta against hand-written intent."

## 8. Follow-up Candidates

1. **Duplicate declaration emission in `sig-gen`** (§3b) — upstream issue candidate. Repro: in a project with hand-written `sig/`, running `sig-gen --write --overwrite lib` re-emits module `self.` methods into secondary files, triggering `RBS::DuplicatedMethodDefinitionError`.
2. **Ruby binary selection in mise gem backend** (§1c) — add note to `install.md` (run hook-env to set mise Ruby at head of PATH before `mise install --force`).
3. **RBS union return parsing divergence** (§3e) — parentheses determine whether `rbs validate` and Steep accept union return syntax. While `sig-gen` consistently emits parentheses, the rationale warrants documentation.
4. **`Gemfile.lock` generation triggering `rbs.coverage.missing-gem` (info)** — determine policy.
5. **Migration plan for deferred files (`alba.rb` / `resource.rb`)** — establish a structured "annotate → regenerate → restructure" protocol before proceeding (§7b).
6. **Double declaration of inline ivar annotations** (§6, Primary Finding 4) — verify upstream whether plugin synthesis and generated `sig/` can coexist cleanly (document the asymmetry that methods have precedence while ivars do not).
7. **Mis-generation of `class << self` attribute casts** (§7a) — report upstream to `rbs-inline` (scope resolution for `self.@*` / `def self.*`).

---

## 9. Systematic Analysis of Residual `-> untyped` and Normative Criteria for `-> void` — Deterministic Generation & Skill Heuristics (Primary Finding 6)

During a minimal-diff refactoring pass on 2026-10-12, all residual `-> untyped` instances across the hand-written `sig/` files were comprehensively audited. The boundaries governing "what should be typed, what should become `-> void`, and what must deliberately remain `-> untyped`" were codified as deterministic heuristics for Rigor's generation engine (`sig-gen` / `sig-refine`, ADR-122) and agent skills (`rigor-sig-refine`).

### 9a. Three Categories of Residual `-> untyped`

| Category | Representative Examples | Rationale & Semantics | May Become `-> void`? |
| :--- | :--- | :--- | :---: |
| **Category 1: Arbitrary user domain data / attribute values** | `Resource#object`, `Layout#object`<br>`Association#object_from`<br>`fetch_attribute*`<br>`ConditionalAttribute#second_object`<br>`Type#convert`, `TypedAttribute#value`<br>`Resource#__send__` | Arbitrary POROs, ActiveRecord models, or hashes supplied by users for serialization, or evaluated attribute values themselves. In a non-generic library architecture, these are inherently `untyped` (or `top`). Callers consume these values to populate JSON hashes. | ❌ **Strictly Forbidden**<br>(Return value is consumed; converting to `void` causes `void-value-used` violations) |
| **Category 2: Callback / attribute definition block arguments** | `attribute` / `assign_attributes_with_types` with `?{ (untyped) -> untyped }`<br>`type attribute = ... ^(...) -> untyped`<br>`type instance_proc = ... -> untyped` | Block return values for `attribute :name do \|u\| ... end`. Because Alba consumes the block evaluation result as the serialized value, the block return type must remain `-> untyped`, meaning "accepts any return type." | ❌ **Strictly Forbidden**<br>(Typing block return as `-> void` declares that callers discard the result, which is false) |
| **Category 3: Escape valves for Steep type inference limitations & false-positive avoidance** | `Alba.resolved_default_superclass` (actually `Class`)<br>`Resource#transform_key` (actually `Symbol \| String`)<br>`Resource#dup` / `transform_keys!` (actually `self`) | Methods returning concrete types at runtime where static typing triggers Steep false positives:<br>• `Object.const_get` return value is not narrowed to `Class` in Steep (`MethodBodyTypeMismatch`)<br>• `key_type` includes `nil`; typing key transformation methods triggers `ArgumentTypeMismatch` on `hash[key]` due to nil-key warnings<br>• Inside `dup.class_eval`, the block context fails to recognize singleton methods on `self` (`NoMethod`) | ❌ **Forbidden**<br>(Intentional boundaries required to keep downstream Steep verification green) |

### 9b. Strict Criteria for Replacing `-> untyped` with `-> void`

Replacing `-> untyped` with `-> void` is permitted **only** when all of the following conditions hold:
1. **Callers discard the return value**: The return value is never assigned or consumed as an expression; the method is called purely for side effects.
2. **Hook methods**: Language hooks such as `included`, `extended`, and `inherited` (return values are discarded by Ruby runtime semantics).
3. **Setter methods**: `def name=(val)` syntax. In Ruby syntax, `obj.name = x` evaluates to `x`; normalize setter return types to `void` to prevent leaking internal intermediate expressions (assignments or cleanup helpers like `reset_transform_keys`) (ADR-122 WD3).
4. **Command methods**: Methods performing registration, initialization, error handling, or visibility mutations (`reset!`, `register_default_types`, `set_key_and_attribute_body_from`, `handle_error`, `private`).

### 9c. Results of the Minimal-Diff Discipline

Revisiting the 12-file, 479-line diff from the initial batch migration in light of these criteria produced dramatic improvements:
- Fully reverted 6 files lacking meaningful type improvements (`constants`, `default_inflector`, `deprecation`, `nested_attribute`, `typed_attribute`, `version`) to HEAD.
- Applied minimal 1–4 line adjustments to files where localized typing was viable (`association`, `conditional_attribute`, `layout`, `type`).
- Compressed the total diff to **6 files and 80 lines**, maintaining completely green results across Steep (`No type error detected. 🫖`), Rigor (0 errors), and tests (281 runs / 0 failures).
For existing libraries with hand-crafted RBS, rigorous adherence to this "minimal diff discipline" is required to produce pull requests acceptable to upstream maintainers.

---

## 10. Review Findings from PR #576, Return Unions, and Downstream Inference (Primary Finding 7)

Verification of CodeRabbit review feedback on Alba RBS improvement PR ([#576](https://github.com/okuramasafumi/alba/pull/576)), handling of return unions, and division of responsibilities with downstream type inference models (`rigor-alba`).

### 10a. Assessment of PR Review Feedback

| Feedback Item | Decision | Rationale & Verification |
| :--- | :---: | :--- |
| **Add `Hash[root_key_type, generic_hash]` to `serializable_hash_for_collection` return type** | **Accepted** | When `collection_key` is configured, the method returns a Hash mapping keys to each element's serialized result (`generic_hash`). Removed `Hash[root_key_type, Array[generic_hash]]` from the legacy signature (which actually represents `as_json` with a root key wrapper) and updated the signature to a 2-element union `(Array[generic_hash] \| Hash[root_key_type, generic_hash])` (synchronized `serializable_hash_type` accordingly). Applied in commit `f378cc6`. |
| **Change `name` on `_ClassContext` / `ClassMethods` to `String?`** | **Declined** | Anonymous classes created via `Alba.resource_class` may return `nil` for `name`. However, `lib/alba/resource.rb:420-426` (`nesting`) implements `if name.nil? ... else name.rpartition ... end`. Steep does not support flow-sensitive narrowing on method call results without rebinding to a local variable (`n = name`). Consequently, `name` remains `(String \| nil)` in the `else` branch, triggering `Ruby::NoMethod: Type (::String \| nil) does not have method rpartition`. To preserve Steep compliance without altering Ruby source, `-> String` was retained. |

### 10b. Inevitability of Return Unions and RBS Expressive Limits

From a type system perspective, return unions should be approached cautiously because they force callers to branch on types. Within Alba's standalone RBS, however, return unions are unavoidable:

1. **Absence of conditional types**: RBS does not support conditional types like TypeScript's `T extends U ? X : Y`.
2. **Limitations of parameterless method overloading**: RBS method overloading (`def m: (A) -> X | (B) -> Y`) is resolved based on argument type differences. Because `serializable_hash_for_collection` takes no arguments (`() -> ...`), branching return types via overloading is syntactically impossible.
3. **Dynamic branching based on runtime instance state**: The return value branches not on parameters, but on the presence of instance variable `@_collection_key`:
   - With `@_collection_key`: `@object.to_h { ... }` (`Hash[root_key_type, generic_hash]`)
   - Without `@_collection_key`: `@object.map { ... }` (`Array[generic_hash]`)

Therefore, as a generic signature shipped with the library, joining both variants as `(Array[generic_hash] | Hash[root_key_type, generic_hash])` is the sole accurate representation.

### 10c. Flow-Sensitive Downstream Inference with `rigor-alba`

While return unions are unavoidable in the library's static RBS, downstream application code utilizing Alba typically determines whether `collection_key` is set at the resource class definition level:

```ruby
class UserResource
  include Alba::Resource
  collection_key :users # statically declared
end

# Caller:
result = UserResource.new(users).serializable_hash # In practice, always a Hash
```

If the return type remains `(Array[...] | Hash[...])` in application code, callers are burdened with redundant type guards like `is_a?(Hash)` on every invocation.

This delineates the precise responsibilities of the **`rigor-alba` plugin**:
- **Library bundled `sig/`**: Provides the most accurate union type expressible within the RBS language specification.
- **`rigor-alba` plugin**: Statically analyzes resource DSL definitions in application code (detecting presence of `collection_key`) and **narrows / specializes** the return type of `serializable_hash` / `serializable_hash_for_collection` to `Array[generic_hash]` or `Hash[Symbol, generic_hash]`.

This division of responsibilities maximizes downstream type safety and developer experience without violating the library's RBS contract.
