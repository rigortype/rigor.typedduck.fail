---
title: "Coverage-uplift onboarding for a Rails app — the sig-gen carrier trap and the engine-bound ceiling"
description: "Real-project triage of onboarding Redmine and Mastodon for type coverage: the sig-gen carrier trap, an RBS env-crash bug, and how much of the coverage ceiling is genuinely engine-bound vs. plugin/config-closable."
sourceSha: "4f08b103b994fcdedc1a30a16ed2838d0fab6dd4d81d479634237a4de5e4d212"
sourceCommit: "47c1c7d35efbce222a6a888268b263808b49796c"
translationStatus: "translated"
---

Status: real-project triage + hypothesis notes. Carried out 2026-07-04, at Rigor v0.2.6 (`[Unreleased]`),
against `~/repo/ruby/rigor-survey/{redmine,mastodon}`. Non-normative (no design commitment).
redmine is Rails 8.1.3 (git a12198ea0), mastodon is Rails 8.1.3 (v4.6.0-rc.1+186).

Grounding: observed during onboarding following the steps in the
[`rigor-project-init`](https://github.com/rigortype/rigor/blob/master/skills/rigor-project-init/SKILL.md)
skill. A measured instance of the carrier-additivity trap that
[`rigor-protection-uplift`](https://github.com/rigortype/rigor/blob/master/skills/rigor-protection-uplift/SKILL.md)
warns about. The holes we target are
[ADR-58](../../adr/58-ivar-field-typing/) (ivar field typing) + [ADR-67](../../adr/67-parameter-type-inference/)
(parameter inference); the tractability labels are [ADR-75](../../adr/75-dynamic-provenance/) /
[ADR-63](../../adr/63-type-protection-coverage/).

> **⚠️ Correction (re-investigated 2026-07-04, after fixing Bug A)** — The headline claim of this
> note's first draft, "sig-gen's generated `sig/` lowers coverage / is purely negative to the goal",
> was **wrong**. That was, throughout, an **artifact of the RBS environment crash (Bug A)**: every time
> `sig/` was loaded the env broke and every type-of dropped to Dynamic, which made coverage look low
> (with a single manual git fix the env kept re-crashing on other bare-class adapters etc. and stayed
> at 0.1576). Once Bug A is fixed in the engine, **the generated `sig/` raises coverage substantially**
> (redmine +10.3pp / mastodon +5.4pp). The carrier-additivity trap is real, but its manifestation is
> not "coverage down" but **"an increase in sig-quality FPs from dropped non-listed members"**
> (see the "Re-investigation" section below). §2, Bug B, and H1 below are superseded by this correction.
> §4's final state, §1 (plugin-neutral), and H4 (engine-bound) remain valid.

## Goal and initial state

The user request was "we want to strengthen the type coverage of redmine / mastodon". Neither project
had any `.rigor.yml`, baseline, or `sig/` at all (un-onboarded). `rigor plugins` reported **0 plugins
loaded** — the measurement was on the bare engine.

## Procedure (project-init)

Created a `.rigor.dist.yml` for both (`target_ruby: "3.3"`, `paths: [app, lib]`, `severity_profile:
lenient`, acknowledge mode). The plugin set came from detection:

- **redmine** (plain Rails): actionpack / activerecord / actionmailer / rails-routes / rails-i18n /
  activesupport-core-ext (6)
- **mastodon** (+Devise/Pundit/Sidekiq/rails-i18n): the above + devise / pundit / sidekiq (9)

Confirmed all loaded via `rigor plugins` (0 load errors). From then on ran via Flake with `cwd=target`
+ `BUNDLE_GEMFILE=<rigor>/Gemfile`.

## Observed data

### 1. Plugins are coverage-neutral

Protection coverage of redmine `app/models` (`coverage --protection`):

| config | ratio | protected/total | tractability |
| --- | --- | --- | --- |
| 0 plugins | 0.1868 | 1924 / 10300 | engine_gap 6980, add_rbs 33 |
| 6 plugins (above) | **0.1868** | 1924 / 10300 | engine_gap 6980, add_rbs 33 |

**Byte-for-byte identical.** The Rails plugins do affect *diagnostics* and some return/relation typing,
but they do **not move the receiver typing at dispatch sites**, which is the denominator of protection.

### 2. sig-gen's generated `sig/` lowers coverage (the main phenomenon)

After generating 169 files with `rigor sig-gen --params=observed --write app lib`, A/B over the whole of
redmine (app+lib, 28267 dispatch sites) with cache eliminated and git_adapter's superclass fixed
(i.e. after the bug workaround below):

| config | ratio | protected | tractability |
| --- | --- | --- | --- |
| with sig | 0.1576 | 4454 | engine_gap 19572, add_rbs 0 |
| **without sig** | **0.1953** | **5520** | engine_gap 18437, add_rbs 116 |

The generated `sig/` dropped the protection rate **0.195 → 0.158 (1066 fewer protected sites)**. Meanwhile
the `check` diagnostic count for `app/models` was **57 (without sig) = 57 (with fixed sig)**, unchanged.
**It strips protection without removing a single diagnostic.**

### 3. mastodon shows the same pattern

`app/models` (without sig, plugins on): ratio 0.1773 (1043 / 5884), engine_gap 3786, add_rbs 20.
triage (app+lib, 1312 files, ~27s): total 2358 (error 4 / warning 26 / info 2328); the only hints are
`gem-without-rbs` (323 gems without RBS = as expected) and `genuine-bugs` ×6. project-monkey-patch /
unresolved-toplevel / activesupport-core-ext hints are **absent** (the AS overlay + plugins already
resolved the undefined-method cluster).

### 4. Final onboarded state (sig discarded, clean baseline)

| | redmine | mastodon |
| --- | --- | --- |
| baseline | 225 buckets / 796 diagnostics | 1138 buckets / 2358 diagnostics |
| `check` (on baseline) | No diagnostics | No diagnostics |

Most of the baseline is plugin-recognition traces `:info` (rails-routes.helper, actionpack.filter-call,
activerecord.model-call, etc.). The real type diagnostics are small (redmine: undefined-method 12,
possible-nil 10, argument-type-mismatch 1 / mastodon: possible-nil 14, always-truthy 2).

## Bugs encountered

### Bug A — sig-gen's missing superclass → RBS environment crash (dangerous)

`rigor baseline generate` failed on `sig/lib/redmine/scm/adapters/git_adapter.rbs` with
`RBS::DuplicatedDeclarationError: ::Redmine::Scm::Adapters::GitAdapter`.

Cause: the source is `class GitAdapter < AbstractAdapter`, but sig-gen omitted the superclass and emitted
`class GitAdapter`. Rigor's RBS environment build tries to **merge the sig declarations with the
declarations collected from the analyzed source (which carry the superclass)**, and the mismatch in
superclass presence collides as a duplicate declaration in RBS. It does not reproduce when loading the sig
alone (+core); it only fires during the full environment build. Adding `< AbstractAdapter` resolves it.

**The dangerous part: the failure disguises itself as an "improvement".** When the environment build fails,
Rigor keeps analyzing *without an RBS environment*, so every type-of query degrades to `Dynamic[top]` →
undefined-method can no longer be proven → a **false reduction in diagnostics** occurs. In fact, with the
broken sig, `check` on `app/models` was 26 (23 undefined-methods falsely vanished), while after the fix it
was 57. I nearly misread this 57→26 as "the sig halved the FPs" (the workaround below revealed the truth).

### Bug B — carrier-additivity of the generated `sig/` (protection down at zero diagnostic gain)

Data 2 above. Even with the sig fixed, protection drops (diagnostics unchanged). Declaring a class in the
sidecar `sig/` switches that class from inference mode to RBS declaration mode, so the **non-declared members
that inference had attached fall away** → `foo` in `x.foo.bar` (not listed in the sig) returns Dynamic → the
receiver of `bar` becomes Dynamic. undefined-method does not fire under FP-discipline (a Dynamic receiver is
not questioned), so diagnostics don't increase, but protection is lost. `untyped` is mostly harmless in the
**argument** position (`(untyped, untyped) -> concrete type`); the loss is on the member-drop side from
re-declaring the class. A measured instance of the "sidecar sig is not purely additive" that the
`rigor-protection-uplift` skill spells out.

## How the workaround unfolded (misread → refutation → confirmation)

1. After sig generation, observed `app/models` protection 0.187→0.156 and diagnostics 57→26 → initially
   interpreted these as coexisting: "the carrier trap loses protection, in exchange FPs are halved".
2. `baseline generate` crashed on the RBS duplicate declaration → suspicion the environment was broken.
3. Loading the sig alone was OK, only the full environment was NG → identified as a superclass collision with
   the source-collected declaration, fixed with `< AbstractAdapter`. Only git_adapter fired (RBS aborts on the
   first collision, and in resolution order git was at the head).
4. **After the fix, re-measuring gives `check` 57 = 57** (the sig's diagnostic gain was an illusion). So the
   "57→26" was a byproduct of the broken environment. Only the protection drop was real (reproduced as
   0.195→0.158 with cache eliminated in a whole-project A/B).
5. Concluded that the sig is purely negative to the goal (coverage) (protection down, zero diagnostic gain) →
   discarded the generated `sig/` and regenerated / wired a clean baseline without a sig.

## Hypotheses

- **H1 (REFUTED — see the "Re-investigation" section below): "sig-gen's sidecar `sig/` is purely negative to
  protection coverage" is wrong.** The truth was an artifact of the env crash (Bug A). After the env fix the
  sig raises coverage by +5–10pp. The carrier trap manifests as "member drop → undefined-method FP increase"
  (a coverage-up vs. FP-up tradeoff).

- **H2: the missing superclass is a general defect of sig-gen.** Across all 169 files, `class X < Y` becomes
  `class X`. Many simply have no collision partner in the env and never surface, but they are a latent mine
  that takes down the whole RBS environment if the subclass is among the analyzed targets. Fix candidates are
  (a) sig-gen emits the superclass, (b) the env build tolerates a "superclass-less redundant reopen" by merging
  it instead of raising DuplicatedDeclarationError. **(b) is especially important** — the behavior where a
  single file's sig defect drops *everything* to Dynamic is disproportionate in its impact.

- **H3: the silence of environment-build failure is itself a UX bug.** "Diagnostics decreased" can mean "the
  RBS environment broke". Env-build failure should be made much more visible (a dedicated diagnostic /
  non-zero exit / triage hint). This time it was only a one-line stderr warning, and `baseline generate` wrote
  out 748 diagnostics with the broken env in place (an untrustworthy baseline).

- **H4: the coverage ceiling is engine-bound.** **~94% of the unprotected** are engine_gap (redmine
  18437/28267); `add_rbs` closable with hand-written RBS is **<0.5%** (redmine 116, mastodon 20). The nature
  of it is an untyped-argument → Dynamic ivar/receiver chain, which is exactly the territory ADR-58 / ADR-67
  target. It won't move via config/plugin/sig; the actual lever is the engine implementation.
  redmine/mastodon become an empirical corpus for prioritizing that.

## Follow-up

- sig-gen superclass output / env merge tolerance (Bug A, H2) — **both FIXED (2026-07-04)**. The true cause
  was not the superclass mismatch per se: the generated sig references an inherited nested type
  (`GitAdapter::Revision`) → the stub sweep in `stub_missing_referenced_types` re-declared the already-declared
  `class GitAdapter` as a `module` enclosing namespace → class/module kind collision →
  `DuplicatedDeclarationError` (adding the superclass "worked" because the nested type then resolves via
  inheritance → no stub needed → collision avoided). Fix (a) `Generator#record_superclass` +
  `Writer#superclass_suffix`: emit a plain-constant parent as `class X < Y` (a computed parent such as
  `Struct.new` continues to emit nothing, as before). Fix (b) `RbsLoader.append_stub_declarations`: don't stub
  names already declared in the env (apply the `collect_missing_namespaces` `declared.include?` guard on the
  sweep side too). **(b) alone prevents the env collapse** = it resolves H2(b)'s "one file, everything Dynamic"
  disproportion. Regression tests: generator_spec / writer_spec / rbs_loader_spec.
- Strengthen env-build-failure visibility (H3) — not started (only the one-line warning from
  `warn_about_env_build_failure_once`; a dedicated diagnostic / non-zero exit / triage hint is demand-gated).
- Implementing ADR-58 WD1b/WD2 · ADR-67 is the biggest coverage lever (H4). Protection A/B with an in-place
  additive carrier (to back up H1).

## Re-investigation (2026-07-04, after the engine fix for Bug A)

Re-measured everything on the working tree with Bug A fixed (superclass output + stub-sweep guard). Affected
specs 155/0 green. Regenerated the sig on redmine with the fixed engine → confirmed superclass output
(`class GitAdapter < AbstractAdapter`, 127 with-superclass / 51 bare), `baseline generate` crash resolved
(281 buckets / 956 diagnostics written out normally).

### Correction R1 — the generated `sig/` raises coverage substantially (replaces §2)

Whole of redmine (app+lib, 28267 sites, cache-eliminated A/B, **with sig-gen no longer breaking the env**):

| config | ratio | protected | tractability |
| --- | --- | --- | --- |
| **with sig (fixed engine)** | **0.2986** | **8440** | engine_gap 16168, add_rbs 49 |
| without sig | 0.1953 | 5520 | engine_gap 18437, add_rbs 116 |

**+10.3pp (+2920 protected sites).** The first draft's §2 figure of 0.1576 (with sig) was the number from a
*broken env* that kept re-crashing on other files under a single manual git fix. mastodon `app/models` shows
the same tendency: with sig 0.2311 (1360/5884) vs. without 0.1773 (1043/5884) → **+5.4pp**.

### Correction R2 — the carrier trap's true manifestation = sig-quality FP increase (redefines Bug B)

Once the env is healthy, the non-listed members that the sig drops on class re-declaration **now erupt as
provable `call.undefined-method`**. redmine triage A/B (baseline-independent):

| rule | with sig | without sig |
| --- | --- | --- |
| call.undefined-method | 155 | 33 |
| call.wrong-arity | 22 | 0 |
| def.return-type-mismatch | 10 | 0 |
| (error total) | 201 | 57 |

adjudication (all sig-quality FPs):
- **undefined-method +122**: the message confesses `undefined method 'scope_select' … the project defines
  'Redmine::Activity::Fetcher#scope_select'` — the sig **dropped a member that actually exists** when it
  declared the class.
- **wrong-arity +22**: the sig lacks the generated initialize of `Struct.new` subclasses (`Webhook::Executor`,
  `Redmine::Notifiable`, `MultipleValuesDetail`, etc.) → `given 3, expected 0`.
- **return-type-mismatch +10**: over-narrow inferred returns (`declared nil, inferred X` / `declared bool`).

So a **tradeoff of coverage +10pp for FP +150**. It breaks protection-uplift's double gate (coverage-up AND
zero new diagnostics) on the FP side. In acknowledge mode the baseline absorbs it, but it soils the baseline
with FPs that "call an existing method undefined".

### Correction R3 — the biggest engine lever the re-investigation revealed: **make the project's own `sig/` additive**

The root of the FPs is "declaring a class in a sig makes it be treated as *complete*, so members that
inference had attached fall away" (the all-or-nothing of RBS declaration mode). If **the project's own `sig/`
could be merged with inference (additive)**, we could get coverage +10pp with **zero FPs**. Candidates:
(a) sig-gen emits every method of a declared class (with an `untyped` return for the un-inferrable ones) so
nothing drops; (b) the engine treats project sigs as inference-additive rather than authoritative-complete.
(b) has a larger reach than the crash fix for Bug A, and solves the general Rails-app case of "I want to raise
coverage with sig-gen but not produce FPs". H1's in-place additive-carrier idea (rbs-inline `#:` /
return-override) amounts to the manual version of (a).

## Investigating further typing obstacles (2026-07-04, in the clean sig-less state)

Aggregated the `add_a_type_here` (method × count × dynamic_origin) from `coverage --protection --format json`
+ confirmed the real types with `Rigor.dump_type(x)` probes to pinpoint the **origins** of Dynamic.

### Distribution of obstacles (redmine app+lib, 22747 unprotected, count-weighted)

| dynamic_origin | share | tractability |
| --- | --- | --- |
| unsupported_syntax | 81.1% | engine_gap |
| (nil / unclassified) | 18.4% | — |
| explicit_untyped | 0.5% | add_rbs |

Top methods on Dynamic receivers: `[]`(2378) `==`(716) `to_s`(632) `table_name`(514) `current`(493)
`id`(472) `where`(406) `+`(400) `present?`(363) `each`(359) `new`(355) `[]=`(324) `is_a?`(323)…
— all of them downstream of a receiver that has already become Dynamic. The `dump_type` probe revealed the
true origins:

### O1 (redmine's biggest · config-fixable): rigor-activerecord is inert

`load-error: rigor-activerecord: schema file db/schema.rb not found; AR call checks skipped`. Redmine does not
commit `db/schema.rb` (it's generated from 327 migrations), so there's no schema in the model_index, and
**the entire AR check is skipped**. As a result, model constants like `User` `Issue`, `Issue.where(…)`,
`Issue.find(…)`, and AR-derived ivars are **all `Dynamic[top]`** (probe-measured). Contrast: on mastodon
(which has `db/schema.rb`), `Account.where(id:1)` → `ActiveRecord::Relation[Account]` and `User.find(1)` →
`User` are typed. That said, O1's upper bound is capped by O2 (below).

### O2 (both · plugin/engine gap): model constants are `Dynamic[top]`

Even when AR is working (mastodon), a **bare model constant `Account` is `Dynamic[top]`**. The plugin types the
*result* of a recognized call (`.where` → Relation, `.find` → Model) but does not type the model constant
itself as `singleton(Account)`. Hence even mastodon's working AR keeps app/models protection at only ~0.177
(about the same as redmine's inert-AR 0.187) — **introducing an AR schema is not the silver bullet**. The
model_index knows the constant exists, so the fix for O2 is to extend it to type the constant as
`singleton(Model)`.

### O3 (both · plugin gap): `params` / `session` / `request` are untyped

The largest method cluster, `[]`(2378) + `[]=`(324) ≈ 2700 sites, is dominated (in the samples we took) by
`params[:x]` / `session[:x] =` / `request.query_parameters[:x]`. There is no plugin that types these on
ActionController, so they are all `Dynamic[top]` (probe-measured). If rigor-actionpack typed params as a
hash-shape / `ActionController::Parameters`, the largest single cluster would close.

### O4 (both · engine): untyped ivar → member

`@object.project`, `@author.name`, etc. AR-derived ivars improve with O1/O2, but non-AR ivars are
[ADR-58](../../adr/58-ivar-field-typing/) territory.

### O5 (cross-cutting · measurement quality): provenance misleads via a catch-all

O1 above (config gap) and O2/O3 (plugin gap) ought to be classified as `framework_dsl_boundary`
(→ enable_plugin) or as config-gap, but **81% are lumped into `unsupported_syntax` (→ engine_gap)**, so
`coverage --protection`'s tractability steering falsely tells you "engine_gap = not user-closable".
[ADR-75](../../adr/75-dynamic-provenance/)'s cause set is coarse and cannot distinguish the real cause of a
Dynamic receiver (an untyped framework object / an unrecognized model constant / an inert plugin's load-error).
**H4's "94% engine-bound" is an overestimate** — a substantial part is closable via plugin/config.

### Ranking of obstacles (in order of lever size)

1. **O3 params/session typing** (~2700, plugin, both) — the largest single cluster, a rigor-actionpack extension.
2. **O2 model constant → `singleton(Model)`** (plugin, both) — extend AR's recognized range to constants.
3. **O1 supply redmine a schema** (config, redmine only) — get AR working. Its upper bound is set by O2.
4. **O5 refine provenance** (measurement) — correct the misdirection. The trustworthiness of coverage.
5. **O4 ADR-58 / ADR-67** (engine) — the bare Dynamic ivar/param that remains after O1–O3.

## Implementation (2026-07-04): O3 params typing + fixing coverage's plugin-blindness

While implementing O3, a larger measurement bug came to light.

### Implementation I1 — rigor-actionpack types a controller's `params`

`dynamic_return methods: [:params]` (gated on implicit-self + a controller `self`) types `params` as
`ActionController::Parameters`. **Deliberately no RBS is bundled**: the receiver is concrete (the ~2400
`params[:x]` dispatches are protected), but the class's method surface stays engine-lenient (Rigor does not
emit undefined-method for an RBS-unknown class) → `params.require(...).permit(...)`, `params.to_unsafe_h`, etc.
are all FP-safe. Bundling a partial RBS would re-trigger the carrier trap (a declared class drops non-listed
members). ADR-5: type the container, keep the values lenient. Verified with `check`/`dump_type`, zero FPs.

### Discovery I2 (more serious than I1) — `coverage --protection` was **plugin-blind**

Even after I1, the `coverage` ratio didn't move. Cause: the protection scan's scope was
`Scope.empty(environment: Environment.for_project(libraries, signature_paths))` = **the RBS environment only,
with the plugin registry not wired in.** Hence coverage was **not seeing any of the receivers that a plugin
typed via `dynamic_return`** (neither params, nor `Model.where` → `Relation[Model]`) → all treated as Dynamic
and miscounted as unprotected. The dump_type probe (via `check`) sees plugins, so it was correct, but
**coverage's ratio structurally underestimated the plugin contribution**.

**Important implication**: §1's "plugins are coverage-neutral (0.187→0.187)" in this note, and the coverage
ratios / engine_gap shares of §O1–O5, are **all plugin-blind measurements** that underestimated the real
protection (the dump_type-based type determinations = the qualitative conclusions of O1–O5 remain valid).

Fix: build coverage's protection scope with `LanguageServer::ProjectContext#environment` (the same
plugin-aware environment as runner/LSP: registry materialize + prepare pass).

### Measurement after the fix (plugin-aware coverage + params typing)

| target | before (plugin-blind) | after | delta |
| --- | --- | --- | --- |
| redmine app+lib | 0.1953 (5520/28267) | **0.2227** (6295/28267) | +2.7pp (mostly params, `[]` 2378→1782) |
| mastodon app/models | 0.1773 (1043/5884) | **0.2364** (1391/5884) | +5.9pp (**AR relation typing made visible**) |

mastodon's +5.9pp is on app/models, which has no params, so it is wholly the "AR `dynamic_return` contribution
that was invisible to the old coverage". This shows the scale of the plugin-blind bug. Commit `ec4d7a6d`
(params + coverage), `7afa4aa5` (sig-gen env fix).

### Discovery I3 — O2 was wrong; the real gap is coverage's **un-seeded discovery**

Trying to implement O2 ("model constants are Dynamic"), I re-verified first → **making all of app/models a
discovery target, `Account` → `singleton(Account)` and `User` → `singleton(User)` are typed correctly**
(and `Status.where` → `Relation[Status]` too). The earlier "Account → Dynamic" was **an artifact of a
single-file probe** (a lone `_rigor_probe.rb` check does not discover the sibling app/models). O2 is not an
engine gap.

The real gap is of the same kind as plugin-blindness: **coverage's protection scan did not seed cross-file
discovery (`discovered_classes`) under `Scope.empty`** → the class constants of sibling files became Dynamic
within coverage and were miscounted as unprotected. `check` does `seed_project_scope` per-file, so again only
coverage diverged. Fix: seed the scan scope with `ScopeIndexer.discovered_classes_for_paths(paths)`.

### Measurement after the fix (plugin-aware + discovery-seed, = faithful to check)

| target | original (plugin-blind) | +plugin-aware | +discovery-seed | total delta |
| --- | --- | --- | --- | --- |
| redmine app+lib | 0.1953 | 0.2227 | **0.3278** | **+13.2pp** |
| mastodon app/models | 0.1773 | 0.2364 | **0.3112** | **+13.4pp** |

**The true protection rate is ~33%.** The "~18-20% / 94% engine_gap" was an underestimate of roughly **13pp**
caused by coverage's two missing scopes (plugin registry not wired + discovery not seeded). Both changes are
`make verify` green, actionpack spec +3, coverage_command_spec unchanged. Commit `2273f2c1` (discovery-seed).
After discovery-seed, the top unprotected in mastodon models are `[]`(288) `present?`(161) `nil?`(136) `!`
`id` `==` `to_s` `each` — the rest is bare Dynamic from ivar / association / method-chain results.

### I4 — completing the request-context reader family (session/request/flash/cookies)

Extended the same lenient-nominal technique as params to `session` → `ActionDispatch::Request::Session`,
`request` → `ActionDispatch::Request`, `flash` → `ActionDispatch::Flash::FlashHash`, and `cookies` →
`ActionDispatch::Cookies::CookieJar` (commits `53fec3eb`, `ec8b6e84`). All are zero-FP
(`session.delete` / `request.xhr?` / `flash.now`, etc. are engine-lenient). `flash[` is used a lot in redmine
controllers (129 uses), taking app/controllers from 0.045 to 0.229.

### Final cumulative coverage (after all fixes = faithful to check)

| target | original (plugin-blind) | final | total delta |
| --- | --- | --- | --- |
| redmine app+lib | 0.1953 | **0.3386** | **+14.3pp** |
| mastodon app/models | 0.1773 | **0.3112** | **+13.4pp** |
| mastodon app/controllers | ~0.04 (before params) | **0.2736** | — |

### Boundary and the next lever

The well-scoped quick slice ends here (the reader family + the two coverage-fidelity fixes). What remains
unprotected is **bare Dynamic ivar / association / method-chain results**, whose true cause is the
untyped-param → Dynamic-ivar chain. **ADR-58 is about firing policy (reducing possible-nil FPs) rather than
raising protection** (the ADR itself states "refining an ivar to `Node | nil` worsens FPs", and it is
effectively implemented already); the real lever is **ADR-67 (parameter inference, proposed)** = the large
feature that infers param types from the call site to sharpen ivars/receivers. That is independent, serious
work, not a continuation of the quick slice.

## GOTCHAs (for re-runners)

- Diagnostic messages contain non-ASCII from i18n → for JSON parsing use `File.read(f, encoding:"UTF-8").scrub`.
- There is no `--no-cache` on `coverage` → bust it with `rm -rf .rigor/cache`. The `coverage --protection`
  numbers are stable across multiple runs with cache eliminated (no confounding).
- The artifacts (`.rigor.dist.yml` / `.rigor-baseline.yml` / `.rigor/cache/`) are untracked within the survey
  checkout. They persist across a sweep's tag switch.
