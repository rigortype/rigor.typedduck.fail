---
title: "\"What the Era of Gradual Typing Languages Needs\" (mizchi) — Rigor / TypeScript perspective review"
description: "English translation of a Rigor/TypeScript-perspective review of mizchi's essay \"What the Era of Gradual Typing Languages Needs.\""
sourceSha: "dbfec287dd4c49f6930172ffa72ebe066f1632504595613b0388312d50eac172"
sourceCommit: "9f5010ab7b1916b07154e383346d8cd64ba34370"
translationStatus: "translated"
---

Date: 2026-06-01.
Status: research note, no design commitments.
Kind: Rigor / TypeScript-perspective review of an external essay.
Trilogy (external essays × retrofitting types onto existing languages):
- [20260601-type-system-poem-rigor-review.md](../20260601-type-system-poem-rigor-review/) (myuon, "Type System Poem")
- [20260601-revenge-of-the-types-runtime-checker-survey.md](../20260601-revenge-of-the-types-runtime-checker-survey/) (Armin Ronacher, "Revenge of the Types")
- This note (mizchi, "What the Era of Gradual Typing Languages Needs")

## Essay under review

- mizchi, "What the Era of Gradual Typing Languages Needs" (2018-07-05)
- Source URL: <https://mizchi.hatenablog.com/entry/2018/07/05/180219>

A practice-leaning piece that, from hands-on experience with
TypeScript / TypedCoffeeScript, writes out as requirements "what the gradual
typing to come will need." **Rigor (2026, Ruby) amounts to a later
implementation of this 2018 requirements list**, so we read it as a three-way
hold-up: "how much of mizchi's requirements did Rigor satisfy / how did
TypeScript answer them?"

## 0. Framing and conclusion (stated up front)

We split mizchi's claims into requirements R1–R9 + a supplement (LSP) for
"the future of gradual typing," and line up the answers from TypeScript (the
article's home turf) and Rigor (the later Ruby version).

The organizing thesis:

> **Against mizchi's requirements list, Rigor reads as though it "dutifully
> built in Ruby what people said they wanted in 2018."** The biggest fork is
> **"where to put the types, and how far to permit expressiveness."** TypeScript
> put types **inside the source** and grew expressiveness **without limit** (and
> as a result the "type puzzles" mizchi feared became reality). Rigor puts types
> **outside the source** and **caps expressiveness with a budget** (avoiding the
> puzzle, but with a low precision ceiling). These are TS's and Rigor's
> **opposite solutions** to the core problem of mizchi's "distinguish
> compiler-facing from human-facing types."

## Requirement-by-requirement mapping

### R1. Suppressibility (build it into the design)
Ignore with `declare module "a"`, restrict to the range you care about — the
heart of mizchi's argument.

- **TypeScript**: `// @ts-ignore` / `@ts-nocheck` / `@ts-expect-error` (3.9) /
  `any` / `skipLibCheck` / tsconfig `exclude`. Per-line, per-file, per-project.
- **Rigor**: suppression markers (diagnostic-policy) + **the ADR-22 baseline
  (`.rigor-baseline.yml`) institutionalizes suppression**. It adopts the
  existing working state wholesale and **surfaces only regressions**. A step
  stronger than 2018 TS's per-line ignore at relieving the "agony of going from
  0 to 1," the most institutionalized form of the suppression strategy.
- → An item where **Rigor answers better than 2018 TS**.

### R2. Tunable strictness per environment
- **TypeScript**: tsconfig flags (`strict`/`strictNullChecks`/`noImplicitAny`).
  It largely met mizchi's request.
- **Rigor**: `.rigor.yml`'s `severity_profile:`, per-rule severity, and a design
  that deliberately narrows the v1 narrowing surface. Equally tunable.

### R3. Distinguish "compiler-facing" from "human-facing" types (the deepest claim)
- **TypeScript**: types live **inside the source (.ts)** and serve both, erased
  at runtime. Co-located "types as documentation."
- **Rigor**: types are pulled **outside the source (RBS/generated stubs)**, with
  no bespoke DSL in the application body (ADR-0 "AI-Native Purity"). An explicit
  answer that separates the `.rb` — the surface humans/AI read — from RBS, the
  surface of the machine contract. Whereas mizchi in 2018 emphasized
  "documentation for humans," Rigor in 2026 adds **AI readers as first-class
  consumers** (an extension of the era).
- → **Trade-off**: what mizchi valued was "types next to the code = documentation."
  Rigor's external RBS loses co-location. Rigor recovers part of it by
  **accepting rbs-inline** (`#: String` etc. as a type source), running external
  `.rbs` and inline side by side.

### R4. Handling external IO boundaries (any at the exit, strict inside, a wrapping layer)
- **TypeScript**: standard practice. In TS 3.0 of the same month as the article
  (2018-07), **`unknown`** landed and developed into the principled version of
  "receive at the boundary, validate, then go inside" (zod etc.).
- **Rigor**: **the robustness principle formalizes the same shape on the
  type-authoring side** — lenient on arguments (boundary tolerance) / strict on
  returns (internal precision). Furthermore, **`Dynamic[T]` carries provenance**,
  so it goes beyond "cast to any (= discard the origin)" and is **"untyped but
  remembers what it knew."** JSON.parse's `symbolize_names` discrimination /
  ActiveRecord `open_receivers` / plugin facts fill the IO boundary on the Ruby
  side.

### R5. any = the Top∧Bottom escape hatch; whether you uphold it is your own responsibility
- **TypeScript**: `any` is exactly that (an unsound escape hatch).
- **Rigor**: `Dynamic[T]` is the gradual fallback. A wrapper that carries T's
  precision and origin, reversible at the boundary (the Dynamic algebra of the
  value lattice). **There is no `any` DSL a user writes in the source** (no
  inline DSL) — the escape hatch is internal to the engine + RBS `untyped`. It
  reduces the surface area of "your-own-responsibility any" via provenance.

### R6. Inference that looks the same as dynamic typing
- **TypeScript**: mizchi valued that "on the surface you can write the same
  thing as dynamic typing."
- **Rigor**: it **pushes inference-first more extremely than TS**. TS wants
  annotations at function boundaries / public APIs, but Rigor infers even user
  method signatures via CFA + call-site synthesis and **targets zero in-source
  annotations**. However, **Ruby's metaprogramming is harder to infer than JS**,
  so where TS would fill in by inference, Rigor has more room to fall to
  `Dynamic[T]`/plugins. Higher ambition, harsher terrain.

### R7. The type-puzzle trap (expressiveness backfiring)
The Flow Redux connect, generics overuse, and non-uniqueness of type expression
mizchi named.

- **TypeScript**: right after the article, conditional types (2.8) / mapped /
  template literal types expanded and **the type level became nearly
  Turing-complete → type puzzles became reality**. `.d.ts` became a byword for
  puzzles.
- **Rigor**: **a deliberate lesson learned**. The false-positive discipline +
  "complex types go to `.rbs`, don't make me write them in the source" +
  **inference budgets (a budget that forbids unbounded type-level computation)**
  are the direct deterrent to type puzzles. ADR-20 HKT being **"lightweight"** is
  also for puzzle avoidance. **It took in the 2018 lesson and deliberately capped
  expressiveness.**
- → **The cost**: it cannot express precision on the order of combineReducers.
  Complexity is **moved into plugins (the engine side, written in Ruby)** —
  pushing the hard parts onto plugin authors' work rather than users' type
  puzzles. **"It evicted the puzzle from user source to the engine"** is the
  watershed with TS.

### R8. The hell of managing library type definitions (DefinitelyTyped)
- **TypeScript**: the `@types/*` ecosystem. Mature but still a pain point; lately
  bundling one's own types is increasing.
- **Rigor**: the RBS ecosystem (gem_rbs_collection) + a plugin catalogue +
  **`rigor sig-gen` (generation, not hand-writing)** + ADR-25 plugin-provided
  RBS. The hand is **"lean on inference + generation rather than a giant
  hand-written type-definition repository."** A holes-in-sig-gen-are-the-valuable-signal
  policy. Framework metaprogramming such as Rails is handled by maintained
  plugins rather than re-derived by every user.

### R9. Recommendations for later languages (syntax reservation only / build suppression into the design / community implementation)
- **Rigor is the concrete realization in 2026.** It **adds nothing** to Ruby
  syntax and uses RBS (external) + existing rbs-inline/Steep annotations. It goes
  past "syntax reservation only" to **zero reservation** and over-satisfies.
  Suppression is designed in via the baseline. **The figure of having implemented
  mizchi's 2018 wishlist almost clause by clause in Ruby.**

### Supplement. The importance of LSP / static-analysis metadata
mizchi emphasized this in 2018. Rigor has ADR-19 `rigor lsp` + **ADR-33 `rigor
mcp` (for AI consumers)**, adding a **2026-style extension (MCP)** to the
foreseen LSP-metadata layer.

## Summary

- **R1/R2/R4/R6/R7/R9/LSP** are dutifully satisfied by Rigor, at times better
  than 2018 TS. Rigor reads as a Ruby implementation of "what mizchi said was
  needed."
- **The biggest fork is how R3 + R7 are solved**:
  - TypeScript = types **inside the source**, expressiveness **unlimited** → it
    gained co-location but **type puzzles became reality**.
  - Rigor = types **outside the source**, expressiveness **capped by a budget** →
    it avoids the puzzle and keeps `.rb` clean but **the precision ceiling is
    low** and it loses co-location (partly recovered via rbs-inline).
  - The **opposite answer** to mizchi's "distinguish compiler-facing from
    human-facing," a difference of bets rather than of merit.
- **Points mizchi would likely press Rigor on**: (1) external RBS weakens the
  "documentation next to the code" quality; (2) Ruby's metaprogramming is harder
  to infer than JS, so the inference of "looks the same as dynamic" has more
  holes than TS (more Dynamic/plugin dependence).
- **Where Rigor advanced from 2018**: (1) `Dynamic[T]` provenance (escaping the
  origin-discarding any); (2) institutionalizing suppression via the baseline;
  (3) the structure of evicting type puzzles from user source to the plugin
  engine; (4) making AI/MCP a first-class consumer of type metadata.

In one line — **Rigor satisfies in 2026 Ruby most of the conditions mizchi laid
out in 2018 as "needed for the gradual typing to come." But on the one thing he
agonized over to the end — "where to put the types and how far to permit
expressiveness" — it chose the exact opposite of TypeScript (outside the source,
capped by a budget), and that is both Rigor's individuality and the source of its
precision ceiling.**
