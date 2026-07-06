---
title: "Provenance analysis of Mastodon type-coverage holes + a sig-gen RBS-validity crash"
description: "Triage of Mastodon's type-coverage holes: provenance catch-all misleads tractability, and a sig-gen RBS-validity crash makes sigs look harmful; grounds ADR-82 provenance-wiring."
sourceSha: "bd972dcd9d427a9fa0895264ee4a613de01a7dff28278d7d10fa9327bf7a39a9"
sourceCommit: "ee19f4b60fca3bd0ceb677ebb395593203f2ea48"
translationStatus: "translated"
---

Status: real-project triage + bug discovery/partial fixes + rationale memo for an ADR proposal. Conducted 2026-07-06 against `~/repo/ruby/rigor-survey/mastodon` (Rails 8.1.3, v4.6.0-rc.1+186) at Rigor v0.2.7 (`[Unreleased]`). Non-normative (the design commitment lives in [ADR-82](../../adr/82-dynamic-provenance-wiring/)).

Grounding: the immediate predecessor note is [2026-07-04 Rails coverage onboarding](../20260704-rails-coverage-onboarding-carrier-trap/) (hereafter "the 07-04 note"). This note re-confirms and drills into that note's O5 (provenance catch-all) and H3 (silencing of the sig env-crash) over the full mastodon app+lib scope, fixes one class of sig-gen RBS-validity bug in the engine, and carves the remaining provenance-wiring out into [ADR-82](../../adr/82-dynamic-provenance-wiring/). Labels: [ADR-75](../../adr/75-dynamic-provenance/) (Dynamic provenance) / [ADR-63](../../adr/63-type-protection-coverage/) (protection coverage).

## Initial state

mastodon was already `rigor-project-init`'d in the 07-04 note (acknowledge mode / `severity_profile: lenient`). It has a `.rigor.dist.yml` (9 Rails plugins) + `.rigor-baseline.yml` (1,138 buckets), both uncommitted, and no `sig/`. This session re-ran `coverage --protection` from that state (the 07-04 plugin-aware + discovery-seed fixes are landed, so the numbers are check-faithful).

## 1. Coverage overview (`coverage --protection`, app+lib, ~53s, 1,312 files)

| metric | value |
| --- | --- |
| protection ratio | **0.3148 (31.5%)** |
| protected / total | 9,703 / 30,822 |
| parse errors | 0 |

31.5% is consistent with the 07-04 note's "check-faithful true protection ratio ~33% after fixing the two bugs (plugin-blind + discovery-unseeded)". The coverage-scope fix is landed, and this measurement is a re-confirmation on top of it.

Unprotected directory distribution (count-weighted):

```
app/lib 4138 / app/models 3889 / app/services 3583 / app/controllers 2655
app/serializers 1793 / lib/mastodon 1566 / app/helpers 835 / app/workers 624
```

Worst files: `app/lib/feed_manager.rb` (435 holes / 19.6%), `activitypub/process_account_service.rb` (323 / 18.4%), `post_status_service.rb` (194 / 13.4%), `app/models/account.rb` (173 / 26.7%).

Top methods on Dynamic receivers: `[]`(2145) `id`(754) `present?`(545) `nil?`(501) `==`(453) `!`(423) `account`(338) `to_s`(298) `map`(259) `blank?`(244) `where`(201)… — all downstream of idioms on the untyped receivers of AR models / ActionController params / Devise helpers. Samples: `Tag.find_normalized(...).id` (custom AR finder → untyped), `current_user&.account&.unavailable?`, `params[:limit].present?`.

## 2. Provenance misleads tractability via a catch-all (re-confirming/drilling into O5)

`add_a_type_here` sites tallied by tractability:

| tractability (cause) | sites | share |
| --- | --- | --- |
| `engine_gap` (`unsupported_syntax`) | 17,727 | 84.0% |
| (cause unrecorded / null) | 2,921 | 13.8% |
| `add_rbs` (`explicit_untyped`) | 471 | 2.2% |
| `enable_plugin` (`framework_dsl_boundary`) | **0** | 0% |
| `add_rbs` (`external_gem_without_rbs`) | **0** | 0% |

**98% fall into the catch-all (`unsupported_syntax` + null).** In a Rails app, receivers that ought to be classified as `framework_dsl_boundary` (Devise `current_user` / ActionController) or `external_gem_without_rbs` (gems missing RBS) carry that cause in **not a single case**. ADR-75's tractability guidance (distinguishing "enable a plugin vs. hand-write RBS vs. engine limit") is not working on a real Rails app.

### Cause (two gaps identified by reading the engine)

`DynamicOrigin::UNSUPPORTED_SYNTAX` is by definition the "inference fallback for unmodeled syntax" = a **catch-all** (`lib/rigor/inference/dynamic_origin.rb:22`). Everything without a specific cause lands here.

- **G1 lookup gap.** `ProtectionScanner#scan` looks up provenance on the dispatch's **direct receiver node** (`protection_scanner.rb:49`, `scope.dynamic_origins[node.receiver]`). But `MethodDispatcher` records the specific cause on the **call node that produced the Dynamic value** (`method_dispatcher.rb:113/141/166/178`). The receiver of `tag.id` is `tag` (a local read), distinct from the true origin `Tag.find_normalized(...)` call node. The receiver node of a local/ivar read has no record and is nil (→ null 13.8%) or falls into the generic `UNSUPPORTED_SYNTAX` of `ExpressionTyper#fallback_for` (`expression_typer.rb:911-912`) (→ 84%). Propagation only works in a chained call `a.b.c` when the receiver of `.c` is the call node `a.b`.

- **G2 recording-condition gap.** `FRAMEWORK_DSL_BOUNDARY` is recorded **only when a plugin returns Dynamic via `dynamic_return`** (`method_dispatcher.rb:112`), but plugins mostly return **concrete types** (= that site is protected and not a hole), so the sites that remain as holes almost never get this cause. `EXTERNAL_GEM_WITHOUT_RBS` presupposes ADR-10 dependency-source / opt-in via `pre_eval:` and does not fire in a stock Rails configuration. In addition, `try_discovered_method` (`method_dispatcher.rb:246`) and `try_user_class_fallback` (`:210`) return Dynamic but record **no cause at all**.

→ Expanding provenance-wiring (G1 propagation + G2 additional recording + tractability assignment for new causes) was carved out into [ADR-82](../../adr/82-dynamic-provenance-wiring/). It is precision-additive (types/diagnostics/severity unchanged), so the substance is safe, but G1's binding→origin propagation needs design work for side-table soundness and perf under joins, and must not be landed hastily.

## 3. sig-gen re-measurement — env-crash makes sigs look "harmful" (re-demonstrating H3)

The 07-04 note's R1, after fixing env-crash bug A (missing superclass), corrected the finding to "sigs raise coverage by +5–10pp." When sig-gen was re-measured this session against the **full mastodon app+lib**, a **different** env-crash recurred.

### Naive re-measurement (sig generation → coverage)

| configuration | ratio | protected | tract |
| --- | --- | --- | --- |
| no sig | 0.3148 | 9,703 | engine_gap 17727, add_rbs 471 |
| with sig (naive) | **0.2627** | 8,098 | engine_gap 19473, **add_rbs 0** |

−5.2pp. **But this is an env-crash artifact.** stderr:

```
RBS environment build failed: RBS::ParsingError:
  sig/helpers/application_helper.rbs:4: unexpected record key token, token=`data`
```

sig-gen **generated invalid RBS**, the env build collapsed entirely, and "Rigor will continue analyzing with no RBS env in scope, so most type-of queries will return Dynamic[top]" = every type-of degraded to Dynamic → protection vanished and **sigs looked harmful** (add_rbs=0 is proof that RBS dispatch is not working at all). This is a re-demonstration of the 07-04 note's H3 ("a drop in diagnostics can mean env collapse"), surfacing this time on the coverage side.

### sig-gen RBS-validity bugs (2 classes)

Running each of the 333 generated files through `RBS::Parser.parse_signature` individually yields **330 valid / 3 invalid**. The invalid ones fall into 2 classes:

1. **Non-identifier record keys (2 → fixed in the engine this session).** mastodon's `html_attributes` returns `{ lang:, class:, :"data-contrast" => …, :"data-color-scheme" => … }`, and `HashShape` emitted the symbol key `:"data-contrast"` as a **bare `data-contrast:`** → unparseable RBS. The RBS grammar rejects both a bare non-identifier key and `"data-contrast":` (quotes + colon), and accepts only `"data-contrast" =>` (quotes + fat arrow). **Fix**: `Type::HashShape#erase_key_prefix` emits `key:` for a bare identifier symbol and `"key" =>` otherwise (`describe` is display-only, so its historical `"a":` is retained to minimize blast radius). Regression test added; `hash_shape_spec` 27/27 green.

2. **Block-parameter misrendering (3 files, unfixed).** `def initialize: (**untyped, ?{ (?) -> void }) -> void` — an optional block is emitted inside the parens with a comma (correctly it belongs outside the parens), and `(?)` is also an invalid block argument. The 3 cases are `connection_pool/*` and `elasticsearch/client_extensions`. This is a separate defect in sig_gen's writer area; this session only characterized it (to avoid whack-a-mole).

### Genuine numbers with a healthy env (excluding the 3 invalid files, 330 files)

| configuration | ratio | protected | env |
| --- | --- | --- | --- |
| no sig | 0.3148 | 9,703 | — |
| with sig (330 valid, env HEALTHY) | **0.3195** | 9,848 | healthy |

**The genuine sig effect is only +0.47pp (protected +145).** The **5.7pp swing** between the naive −5.2pp and the genuine +0.47pp is caused by **a single invalid sig file taking down the entire env**. Unlike the 07-04 app/models-only +5.4pp, the full app+lib is dominated by controllers/services/lib, where the sig contribution is thin. On top of that, the 07-04 R2 carrier-trap (member loss on class re-declaration → sig-quality FP +150) is still present. **Conclusion: at app+lib scale, sig-gen is not an effective lever for protection coverage** (marginal gain vs. FP/crash risk).

## 4. Root-cause ranking of the failures (by lever size, mastodon app+lib)

1. **provenance-wiring (measurement reliability) — [ADR-82](../../adr/82-dynamic-provenance-wiring/).** Split the 84% catch-all into actionable buckets. An engine change but precision-additive.
2. **env-build resilience (prerequisite for making sigs practical).** The imbalance where a single invalid sig file takes down the entire env (07-04 H2(b)/H3). Quarantining/skipping makes it robust even against the remaining sig-gen bugs, and closes the "diagnostics down = env collapse" silent failure. A dedicated diagnostic / non-zero exit is also needed (07-04 H3, not started).
3. **sig-gen RBS validity (block-param class).** §3.2 above, a writer fix.
4. **ADR-67 parameter inference / ADR-58 ivar typing.** The remaining naive Dynamic ivar/param/association. The real heart of the protection ceiling (07-04 H4/§boundary). Not movable by config/plugin/sig.

## Follow-up

- **[ADR-82](../../adr/82-dynamic-provenance-wiring/)** — provenance-wiring (G1 propagation + G2 recording + new causes). This note is its rationale. **WD1+WD2+WD3+WD6+WD7+WD8 LANDED 2026-07-06** (see the "Implementation" sections below). WD7 = accurate per-site metrics + param enrichment (ADR-67); WD8 = unbound ivar enrichment (ADR-58). Cumulative causeless 49%→26%, inferred ×15. The actionability lever is nearly exhausted.
- **sig-gen record-key fix** — LANDED (`Type::HashShape#erase_key_prefix`, this session, CHANGELOG).
- **env-build resilience** — **quarantine + visibility LANDED 2026-07-06** (`RbsLoader.add_project_signatures` loads the project `signature_paths:` one file at a time and quarantines parse failures → the whole env survives; `RbsLoader#warn_about_quarantined_signatures` warns once with the skipped file names + parse errors). Demonstrated: with a mix of good+broken sigs, `RBS classes available` is non-zero and survives (classes on the good side are typed). This hardens the env even against the remaining sig-gen block-param etc. bugs. **Remaining**: a dedicated diagnostic / non-zero exit (07-04 H3, CI visibility) is not started (a new rule id is subject to ADR-50's vocabulary freeze, so it needs consideration).
- **sig-gen block-param rendering** — **FIXED 2026-07-06** (`Generator#block_signature_suffix`). `def initialize(**opts, &block)` was emitted as `(**untyped, ?{ (?) -> void })` = the block comma-joined inside the parens (RBS rejects it with `optional keyword argument type is expected`, and `(?)` is also invalid). In RBS the block goes **outside** the parens, so it is fixed to `(**untyped) ?{ (*untyped) -> untyped } -> void` (the block signature is unobserved, so the most lenient per ADR-5, `*untyped`→`untyped`). The only place generator/writer emits blocks is `render_initialize_param_list` (`render_param_list` does not emit blocks). Two regression tests + `RBS::Parser` parse verification. The damage was already contained by env-resilience (above), but now it no longer emits invalid RBS in the first place. Resolves the remaining §3.2 bug.

## Implementation (2026-07-06): ADR-82 WD2+WD3 + re-bucketing measurement

Executed ADR-82's WD5 ("land WD2+WD3 first, measure the re-bucketing, and judge WD1's cost").

- **WD3**: a new cause `DynamicOrigin::INFERRED_RETURN_UNTYPED` (tractability = `engine_gap`). "The call resolved but the return could not be inferred" = an inference gap that is neither `unsupported_syntax` (unmodeled syntax) nor `explicit_untyped` (declared untyped in RBS). The CLI references `DynamicOrigin.tractability` centrally, so no renderer change is needed.
- **WD2**: `MethodDispatcher`'s `try_discovered_method` and `try_user_class_fallback` record `INFERRED_RETURN_UNTYPED` on the call node when they return Dynamic (a one-line `record_dynamic_origin` each). In a chain `a.b.c`, when `.b` is a resolved user method, the receiver of `.c` (= the `a.b` call node) gets the correct cause.

### Measurement (mastodon app+lib, no-sig, site counts by cause)

| cause | baseline | WD2/3 | Δ |
| --- | --- | --- | --- |
| unsupported_syntax | 17,727 | 17,565 | −162 |
| (null) | 2,921 | 2,872 | −49 |
| **inferred_return_untyped** | 0 | **211** | +211 |
| explicit_untyped | 471 | 471 | 0 |
| protection ratio | 0.3148 | 0.3148 | 0 (precision-additive confirmed) |

**Only 211 sites (~1% of the total) re-bucketed.** Adjudication (confirming correct attribution): the sites that moved are chains of `<resolved user method>.foo` — `parsed_uri.path` (`def parsed_uri` present), `media_attachment_file.path` (`def media_attachment_file`), etc., all of which are "user methods whose return cannot be inferred" = `inferred_return_untyped` is warranted. The minority `directory_url.path` (a local, `directory_url = Addressable::URI.parse(...)`) merely mixes into the group's dominant-origin display, and is itself an example of G1 (a local receiver does not reach the call-node record).

**Conclusion (resolving WD5)**: the smallness itself demonstrated the G1 diagnosis. The remaining 84% are on local/ivar receivers, where no amount of cause recorded on the call node reaches a receiver-node lookup. Therefore **WD1 (lookup propagation) is not demand-gated but mandatory**. WD2+WD3 played their role as a "cheap diagnostic confirmation"; next is WD1's design (a flow-varying `Scope` binding→origin-node association, `make bench-perf` + discovery/self-check gate).

## Implementation (2026-07-06): ADR-82 WD1 + measurement (modest; next lever = redirect to WD6)

Implemented WD1 (propagating a binding's origin to bare receivers). `Scope#local_origins`/`#ivar_origins` (name→cause side tables, excluding ==/hash, reset at method boundaries) are set on assignment (`StatementEvaluator#eval_local_write/#eval_ivar_write`, when the rhs is a Dynamic with an origin), and `ProtectionScanner#propagated_origin` follows them when the receiver's own node has no origin.

### Measurement (mastodon app+lib, no-sig, site counts by cause, group-dominant tally)

| cause | baseline | WD2/3 | WD1 |
| --- | --- | --- | --- |
| unsupported_syntax | 17,727 | 17,565 | 17,854 |
| (null) | 2,921 | 2,872 | **2,550** |
| explicit_untyped | 471 | 471 | 462 |
| inferred_return_untyped | 0 | 211 | 253 |
| ratio | 0.3148 | 0.3148 | 0.3148 |

**WD1 reduced the null bucket (no cause) by ~322 sites** (2,872→2,550, ratio unchanged). But the **dominant 84% unsupported_syntax is nearly unchanged** (in fact +289, as formerly-null locals propagate an "unresolved-RHS"-derived unsupported).

### Adjudication → the "primary lever" was wrong, the next lever is WD6

Sampling the residual for real, the dominant hole receiver is **not a bare variable read but an intermediate expression/chain**:
- `signed_request_account.uri[…]` (the receiver of `[]` is a call chain)
- `account_id_param.present?` (the receiver is a method call)
- `Status.tagged_with(tag.id)`

When the `.foo` of a chain is **dispatched on a Dynamic receiver, it records a generic `unsupported_syntax` on the result and loses the upstream cause**. WD1 (local/ivar reads only) does not reach this. In a controlled case, propagation itself was confirmed to fire (`y = helper; y.save`, and the `y.save` receiver inherits the binding origin).

→ **Next lever = WD6 chain-origin inheritance** (a call result on a Dynamic receiver inherits the receiver's origin). Most of the 84% is here. But it touches the hottest dispatch path with high FP/perf risk, so defer it to an independent measured/adjudicated/bench-perf-gated slice (the same discipline as WD2/3→WD1). Keep WD1 (correct, perf-neutral, null-reducing, and the foundation for WD6).

### perf

`make bench-perf` FAILs, but **master itself also FAILs**: the committed baseline (19.77M alloc / 16.6s wall) is stale, while master is 27.51M/7.2s and WD1 is 27.54M/7.2s (**+0.1%, perf-neutral**). Re-taking the baseline (CI Linux measurement) is a separate follow-up.

## Implementation (2026-07-06): ADR-82 WD6 chain-origin inheritance

Following WD1's measurement showing "the dominant case is chain receivers", implemented WD6. Implemented `call_type_for`'s **existing comment** ("a result on a Dynamic receiver inherits the dynamic origin" — which had been unimplemented): `ExpressionTyper#inherit_receiver_origin` records the receiver's effective origin on the call node of a call result on a Dynamic receiver (`return dynamic_top` is unchanged). The effective origin comes from the shared `Inference::OriginLookup.origin_for` (`dynamic_origins[node] || local/ivar propagation`), unified with WD1's lookup (`ProtectionScanner` now uses the same helper too).

### Measurement (mastodon app+lib, no-sig, site counts by cause, group-dominant tally)

| cause | WD1 | WD6 |
| --- | --- | --- |
| unsupported_syntax | 17,854 | 19,405 |
| **(null)** | 2,550 | **1,356** |
| explicit_untyped | 462 | 217 |
| inferred_return_untyped | 253 | 141 |
| ratio | 0.3148 | 0.3148 |

**WD6 reduced the null (causeless) bucket 2,550 → 1,356 (−1,194)** — about 4× WD1's (−322). Cumulative baseline 2,921 → 1,356 (over half of null now labeled). A probe confirmed 3-hop propagation (all hops of `y.foo.bar.baz` inherit `y`'s binding origin). Ratio unchanged (precision-additive).

### An honest read: completeness ↑, actionability limited → next lever = enriching root causes

The labels are **dominated by unsupported_syntax** (null→unsupported +1,551). Reason: the **root** of a chain records unsupported — an implicit-self memoized reader, a `params[:x]` index, a metaprog accessor. Both `unsupported_syntax` and null have tractability `engine_gap`, so WD6 buys **provenance completeness** (causeless holes halved) but does not move **actionability** (routing to enable_plugin/add_rbs) much. The group-dominant decreases in inferred/explicit are tally noise (a chain whose root turned unsupported flips the group).

→ **Next lever = enriching the chain root's cause**: have the implicit-self resolution path record `inferred_return_untyped` (like WD2's explicit-receiver tier), and give framework index reads (`params`/`session`) a framework cause. WD1/WD6's propagation then spreads these across the whole chain for free. A demand-gated follow-up.

### perf

`make bench-perf` FAILs on the stale baseline, but A/B is perf-neutral: master 27,540,795 alloc / 7.77s, WD6 27,548,368 / 7.83s (**+0.03%, +7,573 alloc**). The record is an O(1) hash write per Dynamic-receiver call. The self-check `lib` has few Dynamic chains, so the impact is minimal.

## Implementation (2026-07-06): ADR-82 WD7 — accurate per-site metrics + param root-enrichment

Through WD6 the measurement used a group-dominant tally, which turned out to be lossy. Two coupled changes.

### Accurate metrics (+ correcting the WD1/WD6 measurements)

`coverage --protection` groups holes by method and reports each group's **dominant** cause, and `tractability_summary` also weighted that by group count. A minority cause in a mixed group (especially causeless sites) disappears. Adding a per-site accurate `cause_site_counts` (including `"none"`, with `tractability_summary` corrected to derive from it) reveals the **true state**:

| cause | per-site accurate (after WD1+2+3+6) |
| --- | --- |
| **none (causeless)** | **10,390 (49%)** |
| unsupported_syntax | 10,126 (48%) |
| inferred_return_untyped | 351 |
| explicit_untyped | 252 |

**The "null 2,921→1,356" for WD1/WD6 in this note/ADR was a group-dominant artifact.** The true causeless count is still **10,390 (49%)** after WD6. WD1/WD6 did real work (the labeled ones stay labeled), but its magnitude was overstated by the lossy metric. Provenance completeness is ~51% (not ~94%).

### param enrichment (the largest actionable slice of causeless)

The largest actionable part of the 49% causeless is **undeclared params** (`def f(x); x.foo` binds `x` to untyped, and a bare param receiver has no cause). `build_method_entry_scope` seeds an untyped param's `local_origins` with `inferred_return_untyped` (an untyped param is ADR-67's canonical gap) → the WD1 lookup labels `x.foo`, and WD6 propagates it to `x.foo.bar`. Seed-time only (the hot read path is unchanged).

| cause | before | param-enrich |
| --- | --- | --- |
| none | 10,390 | **7,305** |
| inferred_return_untyped | 351 | **3,460** |
| unsupported_syntax | 10,126 | 10,102 |

**~3,100 sites moved causeless → inferred_return_untyped (ADR-67 routing)** = a genuine actionability gain. Ratio unchanged (precision-additive), perf-neutral (A/B +0.15% alloc). The remaining causeless 7,305 is mainly unbound ivar reads (ADR-58) + dynamic_top node kinds (yield/super/block).

### WD8 = unbound ivar enrichment (ADR-58 routing)

`type_of_instance_variable_read` records `inferred_return_untyped` on an unbound ivar (`scope.ivar` nil) (an untyped field = ADR-58's canonical gap) → WD6 propagates it to `@x.foo.bar`. Unlike params it cannot be seeded at method entry (unboundness is discovered at the read site), so it is recorded at read time, but only on the already-`dynamic_top` branch, and is perf-neutral (A/B +0.03%).

| cause | param(WD7) | ivar(WD8) |
| --- | --- | --- |
| none | 7,305 | **5,405** |
| inferred_return_untyped | 3,460 | **5,399** |
| unsupported_syntax | 10,102 | 10,063 |

**~1,900 sites causeless→inferred. Cumulative WD7+WD8: causeless 10,390(49%)→5,405 (26%), actionable inferred 351→5,399 (×15).** Ratio unchanged. The remaining causeless is dynamic_top node kinds (yield/super/block) + cvar/gvar, largely genuinely unmodeled → the actionability lever is nearly exhausted. unsupported 10,063 (48%) is chains rooted at unresolved calls = an honest engine-gap floor.

## Verification (2026-07-06): provenance-wiring generalizes on redmine

Every ADR-82 slice was mastodon-driven, so accurate per-site metrics were taken on redmine (same onboarding, 6 plugins, AR inert = `db/schema.rb` uncommitted) to confirm generalization.

| cause | mastodon (18,695→21,119 unprot) | redmine (18,695 unprot) |
| --- | --- | --- |
| none (causeless) | 5,405 (26%) | 6,913 (37%) |
| unsupported_syntax | 10,063 (48%) | 6,019 (32%) |
| **inferred_return_untyped** | **5,399 (26%)** | **5,634 (30%)** |
| explicit_untyped | 252 | 127 |
| analyzer_budget_cutoff | 0 | 2 |

**In both apps the actionable `inferred_return_untyped` (param+ivar → ADR-67/58) accounts for 26-30%**, demonstrating that provenance-wiring is not mastodon-specific. redmine's inert AR gives it somewhat more causeless (37% vs. 26%), but the structure matches. On redmine, `analyzer_budget_cutoff` (2) is also captured (provenance picks up budget-derived Dynamics too). Ratio: redmine 0.3386 / mastodon 0.3148.

**Conclusion: the provenance-wiring arc is complete and its generalization verified.** The remaining actionability lever is not provenance wiring but **real inference** (ADR-67 param inference / ADR-58 ivar typing = typing untyped params/ivars to something *concrete* so they are actually protected → a large feature that raises the ratio). The provenance work drew that hole map accurately: in both apps the protection ceiling is dominated by param/ivar inference + unresolved calls.

## GOTCHAs (for re-runners)

- For `coverage --protection`'s with-sig numbers, **always verify the env-build succeeded** (the stderr `RBS environment build failed`). When the env collapses, sigs show a false drop that makes them look "harmful".
- Check the RBS validity of generated sigs individually with `RBS::Parser.parse_signature` (the env aborts on the first offender, so an env-crash alone does not tell you how many files are invalid).
- `coverage` has no `--no-cache` → bust it with `rm -rf .rigor/cache`.
- Generated artifacts (`sig/`, `.rigor/cache/`) are untracked inside the survey checkout. Discard them after measuring to return to a clean baseline state (no sig).
