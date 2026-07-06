---
title: "ADR-67 WD2 (in-body structural parameter inference) design spike — a measured deferral verdict"
description: "A measured spike de-risking ADR-67 WD2 in-body parameter inference, concluding the structural-interface carrier is not worth its cost and the deferral should stand."
sourceSha: "e89c0ec9f5a30051f62d5b62d0beac01ec63a4e733233c8f97b37f1150e7cccc"
sourceCommit: "ee19f4b60fca3bd0ceb677ebb395593203f2ea48"
translationStatus: "translated"
---

Status: design spike / measurement-driven decision note. 2026-07-06, Rigor v0.2.7 (`[Unreleased]`).
Non-normative (the design commitment lives in [ADR-67](../../adr/67-parameter-type-inference/)). This note is
the measurement and conclusion that de-risk WD2 before we commit to a real implementation.

Grounding: the direct parent is the [2026-07-06 Mastodon provenance note](../20260706-mastodon-coverage-provenance-and-siggen-rbs-validity/)
(whose provenance-wiring arc concluded that "the remaining actionability lever = real inference (ADR-67 param / ADR-58 ivar)").
This spike narrows to that arc's "sole remaining ADR-67 lever = WD2 in-body inference" and verifies the
payoff with measurement.

## The question

The provenance arc mapped the protection ceiling (mastodon app+lib, unprotected 21,119, ratio
0.3148). The actionable `inferred_return_untyped` bucket is **5,399 (26%) at the per-site exact count**, of which
~3,100 come from params and ~1,900 from unbound ivars (the WD7/WD8 enrichment delta). Call-site inference (WD3,
implemented) already types what param call-sites resolve; the remaining ~3,100 param sites are
**"untyped params that call-sites do not resolve (invoked via dynamic dispatch / framework callbacks)"** —
this is WD2 in-body inference's target population.

WD2 derives a **structural lower bound** (responds-to set) from the set of methods called on a param inside its body.
ADR-67's 2026-06-26 implementation finding recorded that "the type zoo has no structural-interface
carrier → a new carrier is needed, and that is a major overhaul beyond the 'cheapest' framing."

**What the spike verifies**: whether it is worth building that carrier. Concretely: "can the in-body method
set of an untyped param uniquely pin a nominal that yields real protection, or does it top out at a structural bound?"

## Measurement (pure AST probe, `scratchpad/wd2_probe.rb`)

For each req+opt param, collect the "set of method names called on that param as a bare receiver inside the body" and classify:
- **no-calls**: the param never becomes a receiver inside the body → WD2 is powerless in principle
- **all-universal**: the set is entirely universal/duck methods (`to_s`/`==`/`nil?`/`present?`/`[]`/`each`/
  `map`/`id`…, a permissive list drawn from Object + top-Dynamic-receiver methods) → pins no nominal
- **has-distinctive**: contains at least one non-universal method → the upper bound of candidates WD2 could bite on

| corpus | params(req+opt) | no-calls | all-universal | has-distinctive |
| --- | ---: | ---: | ---: | ---: |
| mastodon app+lib | 2,318 | 1,344 (58.0%) | 435 (18.8%) | **539 (23.3%)** |
| redmine app+lib | — | — | — | ~29% |
| rigor lib (sanity) | 5,785 | 2,551 (44.1%) | 1,568 (27.1%) | **1,666 (28.8%)** |

**Breakdown of has-distinctive (mastodon 539)**: distinctive method count 1 is 317 (59%), 2+ is 222 (41%).
Most of distinctive-1 is core-duck and pins no nominal (`clamp`→Comparable, `merge!`→Hash/Relation,
`group_by`/`zero?`→Enumerable/Numeric). Only the 2+ (222 = **~10%** of all params) is domain-specific and could pin
a nominal (`account -> display_name, username, emojis`, `keypair -> revoked?, expired?`,
`log -> target_type, human_identifier, permalink`…).

## Three facts that decide it

1. **The ceiling is small.** The upper bound WD2 could bite on is the 23-29% has-distinctive share. What could pin a real
   nominal is only the **~10% (mastodon 222 params)** with 2+ distinctive methods. The remaining 44-58% no-calls is not even WD2's
   domain (the param flows into ivar storage / a return value / another method's argument = WD3 or ADR-58). And since the probe
   does not exclude params already typed by WD3, the true incremental ceiling is smaller still.

2. **The AR-attribute trap kills the most promising layer.** The 2+ distinctive domain params are Rails helpers'
   `account`/`status` etc., and their distinctive methods (`username`/`display_name`/`following_count`) are
   **AR dynamic accessors (columns/associations) = absent from the static `discovered_methods` (def scan)**.
   Even if you build method-set→nominal resolution over the discovery index, matching hits 0 on exactly the
   AR-model params you could pin, and they fall through to untyped. Mastodon commits `schema.rb`, but knowing that is
   the schema knowledge of the rigor-activerecord plugin, not the def-index a generic method-set resolver reads.
   Redmine does not commit `schema.rb` (AR inert), which is even less favorable. → a corollary of the 07-04 carrier-trap note.

3. **The structural bound is circular against the protection metric.** Even if you build a carrier and credit
   the no-nominal layer, the bound is derived from the body's own calls, so it **merely marks that same body's sites
   as trivially protected** (`concrete_receiver?` counts everything non-Dynamic as protected). A typo in the same body
   (`x.fooo`) cannot be bitten because it enters the bound set as itself. To get real protection (killing a mutation,
   ADR-63's actual point) you would have to put the carrier on the check-walk's undefined-method dispatch,
   and that is the FP-risky path CURRENT_WORK warns about (a spurious `call.undefined-method` firing at the param's use sites).

## Conclusion and recommendation

**Implementing WD2 as specified (structural-interface carrier) is not worth the cost of the payoff. Keep it deferred.**
- carrier path: you would pay a high-stakes type-zoo expansion (rippling into the value-lattice / the ADR-3
  internal-type-api contract) for a circular, thin metric inflation. This is empirical confirmation of ADR-67's own concern that it "degrades the meaning of the metric."
- nominal-resolution path that needs no new carrier: FP-safe (untyped on 0 or multiple matches), but its target is ~10% of params,
  and the most promising AR-model layer is killed by fact 2. The increment is predicted to be negligible.

This is consistent with the provenance note's §4 lever ranking (1 provenance-wiring [done] → 2 env-build resilience →
3 sig-gen RBS validity → 4 ADR-67/58 large feature). WD2 is the worst-value part even within #4.

**Recommendation for the next lever (this spike's implication)**: pushing the protection ceiling directly only
moves with a large feature and is poor value. The higher-ROI nearby levers are (a) **env-build resilience** (quarantine +
visibility for the imbalance where a single malformed sig file brings down the whole env — makes sig-gen usable
and closes the silent failure of 07-04 H3, bounded), (b) consolidation of the `0.2.x` evaluation line / gathering
external feedback (the actual purpose leading to the v1.0 freeze). Growing WD2/ADR-67 stays deferred until concrete
demand arrives — until M3 recurs from outside as the top `add_a_type_here` (staying under the ADR-67 re-eval trigger).

## Re-evaluation triggers (no change, as in ADR-67)

- M3 (untyped param) recurs as the top `add_a_type_here` surfaced in an external project, **and** in a codebase where
  the AR-attribute trap's impact is thin (schema+plugin complete, or non-Rails domain-object-centric).
  This spike adds "in a Rails app, AR dynamic accessors kill the most promising layer" as a new counter-condition.
- ADR-46 incremental makes the WD3 call-site path affordable within a per-file model (raising the call-site ceiling
  before in-body is higher ROI).

## Artifacts / reproduction

The measurement is a throwaway pure-Prism probe (no env, not committed to the repo). It is reproducible via the
algorithm of the "Measurement" section above (req+opt param → in-body bare-receiver call set → no-calls / all-universal /
has-distinctive classification, universal list = Object + top-Dynamic-receiver methods). The classification distribution
matches across all 3 corpora (mastodon/redmine/rigor-lib).
