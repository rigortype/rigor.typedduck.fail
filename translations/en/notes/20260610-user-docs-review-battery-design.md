---
title: "User-facing docs review battery design — porting chibirigor-review"
description: "English translation of a design note exploring whether chibirigor's multi-lens review battery can be ported to Rigor's user-facing documentation."
sourceSha: "744c691ced890934fb03537176c16bbf78620b8e81724b8d534c576b538ce85f"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
---

**Status:** design note — follow-up work is queued in `docs/ROADMAP.md` § "Documentation —
user-facing docs review battery". Observations taken against the post-v0.1.17 working tree
(v0.1.18 cycle, 2026-06-10).

## Background and request

chibirigor (a two-volume book in a separate repo) has a multi-lens review-battery skill at
`/Users/megurine/repo/ruby/chibirigor/.claude/skills/chibirigor-review/SKILL.md` — a frozen
methodology that bundles 10 lenses (reproducibility, type theory, editor, domain author,
Japanese proofreading, Rigor fidelity, Java reader, Ruby reader, book reviewer, harsh book
reviewer) into 4 layers (truth → conveyance → reading → polish), runs them parallel within a
layer and sequential across layers, records each finding in a note, and selectively applies
only the fixes that keep the axes intact.

The question is whether equivalent quality assurance can be applied to Rigor's **user-facing
documentation** ([`docs/manual/`](../../manual/) and [`docs/handbook/`](../../handbook/)).
One constraint was made explicit, though: **this is software documentation, not a book, so
the prose need not be enriched beyond what is necessary** — chibirigor's lenses that
celebrate "thickness as reading material" cannot be carried over as-is.

## Measuring the targets (2026-06-10)

| target | scale | character |
| --- | --- | --- |
| `docs/manual/` | 14 chapters + `plugins/` + `ci-templates/`, ~2,800 lines | **An operational reference.** The lead actors in code blocks are CLI commands, `.rigor.yml`, and CI templates (`14-rails-quickstart.md` alone has 58 blocks, `02-cli-reference.md` 36, `10-mcp-server.md` 30). |
| `docs/handbook/` | 12 chapters + 12 appendices, ~10,400 lines | **A type-model exposition.** 20 files carry Ruby snippets with `assert_type` / `dump_type`, containing a large number of **machine-verifiable claims** of the form "this expression's inferred result is this." |

State of machine verification: **zero**. There is no test in `spec/` that executes the
documentation snippets, and the `Makefile` has no docs-targeting target. The v0.1.16 docs
overhaul (ROADMAP § "Documentation — user-facing docs overhaul") was a one-off manual pass
including cold-read verification; it left no standing gate.

A design tailwind: both READMEs **already declare their axes explicitly** —

- Reader declaration (handbook: Ruby programmers without a static-typing background; each
  appendix declares its reader one by one via "Coming from X").
- Division of responsibility (type model = handbook / operations = manual, each README
  states this for the other).
- Non-goals (handbook: "readable in a few hours," "edge cases go to the spec corpus,"
  "no Ruby introduction," "plugin authoring goes to examples/").
- Terminology conventions (bare "interface" forbidden — the first occurrence must be
  *structural interface* / *RBS interface*).
- spec binds (if the handbook contradicts the spec corpus, the handbook is what gets fixed).

There is no need to invent something new corresponding to chibirigor's "shared promises
(axes)"; the existing declarations can be handed over directly as the review's criteria.

## Porting verdict — what carries over, what drops, what flips

**Carries over as-is (the methodology):** layer-driven execution (parallel within a layer,
sequential across layers), independent-context subagents, the "the next layer reads the
fixed text" gate, persistent recording in finding notes, axis-first selective application,
the "don't bother for a one-sentence tweak" rule.

**Drops:** the domain-author lens (mametter — there is no problem of fairness toward
self-citation here), Japanese proofreading (the docs are in English → replace with English
technical-writing proofreading; AI-ish-tone detection stays valid), and the book-reviewer
lens that *celebrates* prose thickness and the weaving-in of background (head-on collision
with the given constraint; in a reference, tables and code are the lead actors and thin
background is not a defect).

**Flips:** the L3 reading-feel layer. Keep only the harsh book reviewer's nitpicking trait
but reverse its direction, making it **specialize in detecting the fattening direction, not
the thinning one** — padding, duplication between manual and handbook (the division-of-
responsibility declaration is the criterion), passages written in prose that one table would
cover, and non-goal violations (bloating the read-through time). The under-explanation side
is already handled by L2's reader lens, so don't double up.

**New (the biggest delta):** the L0 machine layer. Unlike a book, many of this
documentation's claims can be verified deterministically — the handbook's snippets can be
run through `rigor check` to actually score the `assert_type` claims, and the manual's flags,
config keys, and rule IDs can be reconciled against the CLI itself, the config schema, and
the rule registry. This corresponds to chibirigor's "scoring harness" (which scores a
reader's reproduction implementation), but the target is the documentation itself. Failure
modes that should be caught by machine before going to the LLM lenses (flags / output
examples that have diverged from the implementation) are closed here permanently. It is an
asset that, once written, runs for free every release, and the review battery runs on the
premise that "L0 is green."

## Proposed structure — 5 layers

The execution order is **machine → truth → conveyance → concision → polish**. As in
chibirigor, the full cycle runs only at milestones; day to day, only the troubled layer runs.

| layer | question | contents | form |
| --- | --- | --- | --- |
| **L0 machine** | Do the verifiable claims match actual behavior? | (1) extract handbook snippets → run `rigor check` → score `assert_type`; (2) reconcile the manual's CLI flags / `.rigor.yml` keys / rule IDs against the implementation; (3) the existence of relative links / ADR references | **Standing as `spec/docs/` (or `make docs-check`), not an LLM lens** |
| **L1 truth** | Do the semantic claims match the implementation / spec? | Semantic claims not capturable by machine ("the cache is invalidated by X," "this diagnostic fires on Y," "`:info` under balanced"). The handbook is reconciled against the spec corpus (criterion clear via spec binds), the manual against the implementation / actual behavior. Reviewers may read `lib/rigor/` freely + run the CLI. The type-theory lens is limited to appendix-type-theory and the other appendices. | LLM lens (chibirigor lens 6 promoted to lead) |
| **L2 conveyance** | Does it reach the declared reader? | (a) **Ruby-only reader** (chibirigor lens 8 almost verbatim — "no excessive simplification," but-clause included); (b) **procedure reproduction** (can manual 01/14 be completed from the body text alone? execution-type); (c) **appendix reader** (read "Coming from X" as an X-experienced reader — all 9 are heavy, so sample only the revised parts) | LLM lens |
| **L3 concision** | Is it not fattened? (no thinning detection) | padding, duplication, prose that a table would cover, non-goal violations. The reversed harsh book reviewer. | LLM lens |
| **L4 polish** | English, terminology, formatting | English technical-writing proofreading (AI-ish-tone detection included), terminology-convention compliance (the "structural interface" convention is semi-mechanizable), the manual↔handbook boundary discipline, link wording | LLM lens (always last) |

## Operational decisions

- The output destination for finding notes does not adopt chibirigor's `_<lens>-review.md`
  scheme (directly under the target directory) — `docs/manual/` / `docs/handbook/` are
  shipped documentation, so don't dirty them; route notes under `docs/notes/`.
- Freeze it as a skill at `.claude/skills/rigor-docs-review/SKILL.md`, and after authoring
  run `waza check` once (per the CLAUDE.md convention).
- The first full cycle is expected to surface a fair number of implementation divergences at
  L1 — the handbook / manual were last verified at the v0.1.16 overhaul, and since then
  ADR-51 (6 CI output formats + CI auto-detection) etc. have landed in `11-ci.md` and others,
  with no follow-up verification.

## Follow-up work (queued in ROADMAP)

In effect order: **(1)** the L0 machine harness (a permanent asset, top priority) →
**(2)** freezing the `rigor-docs-review` SKILL.md (the L1–L4 lenses written out) →
**(3)** the first full-cycle run. Details in `docs/ROADMAP.md` § "Documentation —
user-facing docs review battery".
