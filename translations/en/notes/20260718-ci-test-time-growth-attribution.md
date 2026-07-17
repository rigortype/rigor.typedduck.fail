---
title: "CI test-time growth — attribution (instance gacha vs test growth vs binpacker)"
description: "Attributing the apparent growth in CI test wall-clock time across instance variance, test-suite growth, and the binpacker architecture."
sourceSha: "08201db8f25ecb026a839cbf7ae3c1ee347b4231bf8887800be8412cffc7efe6"
sourceCommit: "7a69f1427bb5d1985ccc87080ee90023ffb42665"
translationStatus: "translated"
---

Status: research note, no design commitments. Observations taken against Rigor
**v0.2.9**, GitHub Actions `ubuntu-latest`, binpacker 0.2.0, 2026-07-18.

## Motivation

A concern that the "Tests (Ruby 4.0)" CI wall-clock time appears to be
"gradually growing." Starting from two consecutive runs
([#186](https://github.com/rigortype/rigor/actions/runs/29607710808) = 427s /
[#187](https://github.com/rigortype/rigor/actions/runs/29608667875) = 660s, 15
minutes apart), we separated out (1) test growth, (2) GitHub congestion /
instance variance, (3) the binpacker architecture, and (4) other factors.

## Method

Using `gh run list/view`, we collected the "Run tests" step wall-clock time for
239 successful runs (2026-06-22 → 07-17). In addition, for representative runs
we captured the `Total: N files, MMmSS.s | K examples` line that binpacker emits
at the end. This `MMmSS.s` is the **total CPU time across all workers (= the
compute cost of the same work)**, an indicator of "pure work volume" that is
independent of worker count, scheduling quality, and congestion noise. This is
the key to the attribution.

## Observations

### Weekly median wall-clock time — a "step," not a gradual rise

| ISO week | Period | Median | n |
|---|---|---|---|
| 26 | 06/22–28 | **376s** | 25 |
| 27 | 06/29–07/05 | **392s** | 41 |
| 28 | 07/06–12 | **516s** | 74 |
| 29 | 07/13–19 | **530s** | 99 |

In daily medians, it holds constant at ~380s through 07-04 → **490s on 07-05 →
constant at 510–556s from 07-06 onward**. Tracked to the minute, the transition
is the **9-minute window from 07-05 08:17 (392s) → 08:26 (533s)**. But all of
that day's commits are after 15:16 (bundle update, version bumps, comment
formatting only — runtime-independent). **The step occurs on the same codebase
with no code change.**

### Total CPU time — the same tests swing between 27 and 42 minutes per instance

| Run | Wall time | examples | **Total CPU** | workers | Parallel efficiency* |
|---|---|---|---|---|---|
| 06-23 (baseline) | 392s | 7038 | 24m44s | 4 | 94.6% |
| 07-04 (fast) | 381s | 7332 | 24m14s | 4 | 95.4% |
| 07-05 08:17 (fast) | 392s | **7339** | **24m45s** | 4 | — |
| 07-05 08:26 (slow) | 533s | **7339** | **31m33s** | 4 | 88.7% |
| 07-06 (slow) | 506s | 7340 | 31m50s | 4 | — |
| 07-17 #186 (fast) | 427s | 8068 | 27m15s | 4 | 95.7% |
| 07-17 mid | 538s | 8067 | 34m24s | 4 | — |
| 07-17 #187 (slow, max) | 660s | 8077 | **42m38s** | 4 | 96.9% |

*Parallel efficiency = (Total CPU ÷ 4) ÷ wall time

07-05 08:17 and 08:26 are **completely identical at examples=7339, identical at
workers=4, identical at profile=ci**, yet total CPU goes **24m45s → 31m33s
(+27%)**. The three same-day 07-17 runs (examples≈8070) also swing in total CPU,
**27m → 42m (+56%)**. The same test code costs more than 1.5× the compute
depending on which host you draw that day = **common-mode variation across hosts
caused by noisy neighbors**.

## Conclusion (attribution)

1. **Real test growth — a small contribution, gradual and healthy (about
   +10%/month)**. examples 7038→8077 (+15%), spec LOC +13%. But comparing total
   CPU between "clean hosts," it stays at 24m44s (06-23) → 27m15s (07-17 #186) =
   **+10%**. This is the only real trend, and it is proportional to scale.

2. **GitHub host performance variance / degradation — the main cause of the
   perceived increase and the source of all the noise**. On the same code, total
   CPU varies between 27 and 42 minutes. Around 07-05 08:20 UTC, the baseline for
   an "ordinary host" degraded permanently (24m45s → 31m30s), producing the
   staircase in weekly medians of 392 → 516s. On top of that rides large per-run
   noise. The 427 vs 660 the user cited is a **comparison of noise against noise**
   (#186 is a fast draw, #187 is the highest outlier among 60 runs, total CPU 27m
   vs 42m). You cannot measure a trend by comparing single runs.

3. **binpacker is innocent — indeed excellent**. All runs are 4 workers /
   profile: ci (work-stealing enabled; `Config#resolve_profile` auto-selects on
   the `CI` / `GITHUB_ACTIONS` env). Parallel efficiency is consistently
   **94–97%** (96.9% even on #187). It merely passes through the host's CPU cost
   without amplifying it. Changing this here would have no effect.

## Considering per-category job splitting (negative)

We considered "if we split jobs per major category, would it help against
instance gacha?" → **counterproductive as a variance mitigation, and inferior to
a larger runner even for speed**.

- **The gacha is drawing more tickets, not re-drawing**. Stage completion = max
  of N jobs. max-of-N worsens both the expected value and the tail (straggler).
  Noisy neighbors are common-mode per host, so they do not average out within a
  shard, and across shards the probability that "one of them is slow" rises.
- **It discards binpacker's global balancing**. The current setup dynamically
  redistributes 325 files with file-granularity measured timings + LPT +
  work-stealing. Category boundaries are static and uneven, and would re-introduce
  by hand the skew we once struggled with under parallel_tests
  ([2026-06-22 note](../20260622-parallel-suite-runtime-distribution/)).
- **Fixed overhead (checkout/setup-ruby/bundle/boot) multiplied by N**.
- **If speed is the goal, a larger runner wins on every axis**. `workers: auto`
  is nproc, so simply placing it on a larger runner auto-scales (zero config
  change), the gacha stays a single ticket, global balancing is preserved, and
  larger/dedicated runners have less co-tenancy noise, improving variance too.

Splitting is justified only for (a) a thin smoke tier for feedback-latency
purposes, (b) isolating test groups with a different environment such as a DB
service, or (c) independent retry of unstable shards — none of which are about
speed or variance. Current rigor is a single gem's unit specs, so none apply.

## Recommendations

1. **Stop comparing single runs; change the metric**. Track the total CPU time
   binpacker emits every run (`Total: … NNmSS.s`) or the weekly median of wall.
   With parallel efficiency and congestion noise separated out, you see the real
   trend (+10%/month).
2. **If you want to shrink wall, use a larger runner (more cores)**. Already
   CPU-bound at 4 vCPU; adding workers hits the ceiling of the core count.
   larger/dedicated is the only lever that affects both level and variance.
   binpacker needs no change.
3. **Only once total CPU begins to persistently outpace the examples growth
   rate** should you first suspect the engine / spec bloat. Currently it is
   proportional to scale.

## Evaluating paying to change the runner (larger runner / third parties)

Can variance (instance gacha) be mitigated with money? We compared GitHub's
official larger runners and third parties (Blacksmith / WarpBuild).

### Premises (GitHub billing / runner-choice page)

- **Standard runners on public repos are free** (rigor's CI is currently $0).
  There is no product like "a premium, less-congested version of the standard,"
  and the only thing money can actually change is a larger runner.
- **Larger runners are always charged for** (original: "Larger runners are always
  charged for, even when used by public repositories"), the free allowance does
  not apply, and **a GitHub Team / Enterprise Cloud plan is required**. Pricing is
  roughly proportional to vCPU (8-core Linux ≈ around $0.032/min).
- The runner-choice page **does not state performance consistency** for larger
  runners → what you can reliably buy is core count (= wall reduction), and
  variance reduction is a bonus, not guaranteed.

### Third parties (pricing pages as of 2026-07-18)

| | Unit price (Linux x64) | Claim | OSS free tier |
|---|---|---|---|
| WarpBuild | 4vCPU $0.008 / 8vCPU $0.016 / 16vCPU $0.032 /min | "50% cheaper, 2× faster" | not stated |
| Blacksmith | 2-core $0.004/min (variable vCPU) | "67% reduction, 2× faster" | yes, **selective** (currently only Celery/Ladybird/Zen/Limbo, 4 projects; requires application) |

That the third parties are faster and cheaper is broadly true: they use
**high-clock dedicated bare metal**, so per-core is faster (consumed minutes drop
too), and with less co-tenancy noise they **directly help the variance axis more
than GitHub larger runners**. Technically they hit this case's "total CPU swing"
most squarely.

### Conclusion — deferral is reasonable

Money is not the barrier (8vCPU 2× is roughly **$15–30/month**, a bit under half
of GitHub larger). The deciding axis is not the amount but **"cosmetic benefit
vs. permanent supply-chain dependency"**:

- Granting a third-party GitHub App Actions access and **running the CI of a type
  checker that people install and use on external infrastructure** is the domain
  of [ADR-31](../../adr/31-contribution-and-supply-chain-policy/) (supply-chain
  policy). With ephemeral VMs the persistent fork-PR risk of raw self-hosted is
  slim, but the trust dependency is permanent. What you gain is only a cosmetic
  (variance) improvement.
- Self-hosted on a public repo is a known anti-pattern for fork-PR arbitrary code
  execution and is **not allowed**.
- The real trend is +10%/month, median 530s, worst 11 minutes — a **no-real-harm**
  problem. It is not worth the trade of adding a permanent dependency.

**Re-evaluation triggers**: (a) wall grows into a real throughput blocker
(persistently >15 minutes or so), or (b) **rigor is accepted into Blacksmith's
OSS free tier**, flipping the ROI (free 2×, dedicated, with only App trust as the
remaining cost) — the application is low cost, so it is worth a probe.

## The landing point (decided 2026-07-18)

- **Paid runners (larger / third party) are deferred**. The free real fixes
  suffice.
- The real fix = **stop comparing single runs, track total CPU time / weekly
  median of wall** (revealing the real +10%/month trend). In addition, **not
  running tests on `*.md`-only PRs** is a reasonable landing point.

### Implementation caveats for `*.md`-only PR skipping (important)

**A naive `paths-ignore` is not acceptable**.
[ci.yml:6-13](../../.github/workflows/ci.yml) applies `paths-ignore: "**/*.md"`
only to `push`, and **intentionally leaves `pull_request` unfiltered**. As the
comment (ci.yml:9-11) explains, **a path-filtered required check stays stuck at
pending and blocks merge**. Adding `paths-ignore` to `pull_request` would make
md-only PRs unmergeable.

The correct implementation is the pattern of **"always report the required check,
but conditionally skip only the heavy steps"**: start the `test` job on every PR
(run through checkout → report success in tens of seconds), determine the changed
files, and if md-only, skip `make test-binpacker` / `make test-ractor-pool` (a
guard step such as `dorny/paths-filter` + `if:`). This spares only the suite
execution without breaking the required contract.

Note that, as a premise, AGENTS.md dictates **md-only changes commit directly to
master** (no PR needed), and the push side already has paths-ignore. So an md-only
PR is an edge case (a PR opened outside convention), so the benefit is limited,
but the cost is small. A change to ci.yml is non-md → **branch + PR required**
(that PR itself does run tests).

## Verifying time-of-day dependence (negative)

We tested "if I work during JST daytime, wouldn't it be faster because I'm not
competing for runners with European/US developers?" against the collected 239
runs (173 runs after the step, from 07-06 onward). **The premise is correct but
no effect is detectable.**

- **The premise is accurate**: JST daytime (e.g. 10:00–18:00 = UTC 01–09) is the
  off-peak of global CI (US is night, Europe is before early morning). JST late
  night (0:00–3:00 = UTC 15–18) overlaps the peak of European afternoon + US
  morning.
- **But there is no difference in the real data** (after the step, binned by UTC
  hour):

  | | JST daytime (UTC 00–09) | Global peak (UTC 13–22) |
  |---|---|---|
  | Median run time | 517s | 523s (6s difference) |
  | Median queue wait | 3s | 3s |

  All 24 hours fall within a band of 494–556s run time / 2–3s queue wait, with no
  intra-day trend. The 6-second difference is buried in per-run variability
  (σ≈65s). Queue wait (run createdAt → Tests job startedAt) has a median of ~3
  seconds across all hours = **no capacity exhaustion even at peak** (the very
  phenomenon of allocation being delayed by congestion does not occur).

**Why it does not help**: instance gacha is not "congestion" but a "placement
lottery." What decides speed is *which physical host / CPU generation the VM lands
on*, not the whole world's CI load at that instant → uncorrelated with time. The
dominant variation is **pool/generation turnover (day-to-week scale)**, like the
07-05 step, and that cannot be moved by time of day.

**Conclusion**: There is no value in shifting your working hours. Rather than
chasing a few-seconds-to-few-percent undetected effect, md-only PR skipping +
median/total-CPU tracking is more certain.

## Related

- [2026-06-22 Parallel spec suite: runtime-based distribution](../20260622-parallel-suite-runtime-distribution/)
  — the problem where `--group-by filesize` breaks down on "large but fast" files
  (the prehistory of adopting binpacker).
- [2026-06-23 binpacker parallel-suite trial](../20260623-binpacker-parallel-suite-trial/)
  — the binpacker adoption trial and initial observations of CI variance.
