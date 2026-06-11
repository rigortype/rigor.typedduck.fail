---
title: "Cache subsystem audit — disk footprint and warm-run load cost"
description: "English translation of a measurement note auditing Rigor's filesystem cache for disk usage and warm-run performance."
sourceSha: "f6bc81d81660e46f7f0334fa103cd94ff93f5a7ee0b1590414901bf2c693e6a7"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
---

*2026-06-10. Status: measurement note feeding an ADR — informational, not normative. The
spec binds. Observations taken against Rigor v0.1.17 (working tree @ `69aed050`),
macOS / APFS / Apple Silicon. Real project caches were drawn from the `rigor-survey/`
corpus (about 30 projects + a sweep directory) plus Mastodon. GitLab's cache was out
of scope (no checkout on hand). Redmine's `.rigor` was only 248KB and lacked RBS blobs
(traces of a `--no-cache` workflow or a failed env build — no effect on this audit's
conclusions).*

## Question

Is there room to improve ADR-6's filesystem cache (`.rigor/cache`) in terms of disk
footprint and runtime (warm-run) performance? Answer by measuring the cache files
actually produced.

## Current layout (premises)

- The root is the project-local `.rigor/cache` (`Analysis::Runner::DEFAULT_CACHE_ROOT`).
- Entries are sharded per producer + a `RIGOR\x00\x01` header + varint length +
  Marshal value + SHA-256 trailer (`Cache::Store`).
- There are seven RBS-derived producers (`rbs.environment` / `rbs.instance_definitions` /
  `rbs.singleton_definitions` / `rbs.known_class_names` / `rbs.constant_type_table` /
  `rbs.class_ancestor_table` / `rbs.class_type_param_names`). Each is a single blob
  (ADR-7 slice 6-D: per-class disk entries were slow).
- The default for `max_bytes` is nil = `Store#evict!` is a **no-op**.

## Measurement 1 — Disk footprint: almost every project is a uniform ~32MB, with duplicated content

Survey-corpus `.rigor` directories are nearly a uniform **~32MB** regardless of project
size (even for small gems like oj / ox / rbnacl). Mastodon is 37MB. The breakdown is
dominated by three RBS blobs:

| producer | Mastodon measured | after gzip (ratio) |
| --- | --: | --: |
| `rbs.instance_definitions` | 14.5MB | 2.1MB (14.4%) |
| `rbs.environment` | 10.6MB | 1.7MB (16.1%) |
| `rbs.singleton_definitions` | 9.0MB | 1.2MB (13.3%) |
| (remaining 7 producers + plugin.* total) | ~3MB | — |

Moreover, projects without their own `signature_paths:` (oj / slim / parser …) are
**byte-identical in both cache key and content** (the `rbs.environment` entry shares the
same key `a9a23d…`, content md5 matches). So on this machine, 30+ projects × 32MB ≈
**over 1GB is duplicated identical data**.

## Measurement 2 — Warm-run load cost: Marshal.load dominates, verification is noise

Breakdown of the three blobs for `Store#read_entry` (Mastodon cache, measured in a Flake):

| producer | read | SHA-256 verify | Marshal.load | total (`read_entry`) | allocs |
| --- | --: | --: | --: | --: | --: |
| `rbs.environment` | 1ms | 3ms | 154ms | 163ms | 0.56M |
| `rbs.instance_definitions` | 2ms | 5ms | 366ms | 406ms | 1.06M |
| `rbs.singleton_definitions` | 1ms | 3ms | 180ms | 190ms | 0.58M |
| **total** | **4ms** | **11ms** | **700ms** | **759ms** | **2.2M** |

- Disk read and SHA-256 envelope verification total ~15ms — noise. **No action needed.**
- zlib inflate is ~49ms across the three blobs — just 7% of Marshal.load, so
  **compressing the value payload is essentially runtime-neutral while saving −85% on disk**.

## Measurement 3 — The two definitions blobs are a net loss when the env cache is assumed

ADR-7 slice 6-D's single-blob decision compared "per-class *disk* entries vs single blob";
it never measured "blob vs rebuild from the cached env." Measuring that:

| path | time | allocs |
| --- | --: | --: |
| `rbs.instance_definitions` blob Marshal.load (all classes) | 366ms | 1.06M |
| `build_instance` for **all 492 classes** from cached env | **137ms** | **0.5M** |
| `rbs.singleton_definitions` blob Marshal.load | 180ms | 0.58M |
| `build_singleton` for all 491 classes from env | 178ms | 0.6M |
| (reference) on-demand build of just the top 12 classes | 0.0ms | — |

The instance side is a **decisive win for rebuilding** (2.7× faster, half the allocs); the
singleton side is a wash. And since a real run consumes only a subset of the known classes'
definitions, lazy construction makes the real cost smaller still (the loader already has
per-process memos `@instance_definition_cache` / `@singleton_definition_cache`). In other
words, these two blobs **pay 23.4MB of disk per project to make the warm run up to ~550ms
slower**. The cold run also speeds up, since "eager build of all classes + a 23MB write"
disappears.

## Measurement 4 — Peripheral costs (all currently minor)

- **`RbsDescriptor.build`** (called once per producer, 7×/run): a SHA-256 sweep over 18
  vendored sigs + project sigs. Measured at 1.3ms × 7. Noise today, but it scales linearly
  with large `signature_paths:` (`gem_rbs_collection` etc.), so a per-run memo on the
  loader is cheap insurance.
- **ADR-45 `fresh?` verification** (`analysis.run-diagnostics`): Mastodon re-digests all
  2,312 files / 15.5MB. A digest sweep measured at 248 files / 0.5MB gives cold 24ms /
  warm 5ms — overall warm ~50–150ms scale. An mtime fast-path saves little while degrading
  soundness (counter to ADR-45's lesson), so it is **not recommended**.

## Measurement 5 — Eviction and entry accumulation

Today each survey directory has 1 entry/producer, but that is because
`Descriptor::SCHEMA_VERSION` bumps have wiped the root each time. Once the schema
stabilizes, **an rbs-gem version bump or a `signature_paths:` change leaves the old key's
~33MB blob orphaned** (content-keyed, so the new key is written and the old key is never
removed). With `max_bytes` defaulting to nil, `evict!` does not run.

## Findings (improvement points, in priority order)

1. **Retire the two definitions blobs** (Measurement 3) — switch
   `cached_instance_definition` / `cached_singleton_definition` to on-demand construction
   from the cached env + the existing per-process memos. Saves −23.4MB/project (−70%) on
   disk, up to −550ms / −1.6M allocs on the warm run, and shortens the cold run too. Gate
   on byte-identical diagnostics + `make bench-perf`.
2. **zlib-compress the value payload** (Measurement 2) — write deflate via a format-version
   bump (the format byte in `Store::HEADER`). The remaining env blob shrinks 10.6MB → 1.7MB.
   Inflate cost is under 10% of Marshal.load. Combined with #1: **33.7MB → ~1.7MB (−95%)**.
3. **Default eviction behavior** (Measurement 5) — a sensible default cap (e.g. 256–512MB)
   or an age-based startup sweep, to prevent orphan-blob accumulation after the schema
   stabilizes.
4. (minor) a per-run memo on `RbsDescriptor.build` (Measurement 4).

### Judged not to need action

- SHA-256 envelope verification / disk read (~15ms total, noise).
- A cross-project shared root (proposal to place only `rbs.*` in an XDG `~/.cache/rigor`):
  content-keyed so it can be safely shared, and ADR-6 deferred only the cross-*machine*
  case — but after #1+#2 the duplication shrinks to ~1.7MB×N, not worth the complexity.
- An mtime fast-path for ADR-45 `fresh?` (Measurement 4, not worth the soundness tradeoff).

## Follow-up

Findings 1–3 are consolidated as design decisions in
[ADR-54](../../adr/54-cache-slimming/) and **landed the same day as implementation WD1–WD4**
(commits `5f53db09` / `0c671e04` / `d2465fe1` / `5ced88f1`). Measurements at landing:

- The compressed `rbs.environment` entry = **1.76MB** (16% of the raw 11.0MB). The full
  active set is **~2.2MB/project** (as Measurement 5 predicted).
- WD3's orphan story was confirmed live in this very repo: `.rigor/cache` had accumulated
  **~180MB / 47 entries** (active was ~2MB / 14 entries). A trial run with a 4MB cap pruned
  only the stale portion, and the next run stayed warm.
- Slice gates: cache / environment / configuration specs; the self-check diagnostics
  `--no-cache` / cold / warm agreement; and the Mastodon corpus no-cache / cold / warm
  agreement (the 2,061-element diagnostics array of `--format json` matched exactly across
  3 runs; metadata such as `stats.wall_seconds` was excluded from the comparison).
- Mastodon `.rigor` directory measured: **37MB → 2.6MB**. The warm run (ADR-45 hit path)
  under the new format is real ~15s / user ~2.6s (reference values under concurrent spec
  execution; cold is real ~171s).
- Verification-method lesson: comparing the old version via `git worktree` +
  `bundle exec ruby <worktree>/exe/rigor` causes **both trees' Rigor to be loaded together**
  (`already initialized constant Rigor::VERSION`). The sound gate is a `--no-cache` vs cold
  vs warm comparison on identical code (analysis logic is cache-independent).
- Addendum (same day, `8c65c0c5`): a format bump alone leaves old v1 entries "unreadable
  but undeleted" (32MB is under the 256MB cap, so not eviction-eligible) → the
  `schema_version.txt` marker was extended to `"<SCHEMA_VERSION>.<FORMAT_VERSION>"` and is
  reclaimed via the existing root-clear path on the first write run (confirmed live in this
  repo: marker 3 → 3.2, root rebuilt, diagnostics unchanged). The ADR-46 incremental
  snapshot, which does not go through Store, is deflated likewise (SCHEMA 4→5). Old caches
  remaining in the survey corpus are reclaimed automatically on each project's next run.
