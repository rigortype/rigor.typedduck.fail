---
title: "Rigor Type System — Quick Guide"
description: "Imported from rigortype/rigor docs/types.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/types.md"
sourcePath: "docs/types.md"
sourceSha: "4fc119458aecd87a0f68cd2932c8b0f1784d92489f57f2e8aa86ab7be4f63e6b"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "pending"
sidebar:
  order: 9050
---

> [!NOTE]
> このページはまだ翻訳されていません。英語版の本文を参考表示しています。

Rigor is an inference-first static analyzer for Ruby. Its type language is a **strict superset of RBS**: every RBS type round-trips losslessly through Rigor's internal representation, and every Rigor-inferred type erases conservatively back to ordinary RBS.

This file is the one-page entry point. The full normative specification lives in [`docs/type-specification/`](../type-specification/). Design rationale and rejected/deferred options live in [`docs/adr/1-types.md`](../adr/1-types/).

## Concept

- **No inline DSL.** Application Ruby code stays free of Rigor-only annotation syntax. RBS, rbs-inline, and Steep-compatible annotations are accepted as type sources.
- **Lossless RBS in, conservative RBS out.** Internal precision (literal sets, refinements, shapes, dynamic-origin provenance) MAY exceed what RBS can spell. On export, Rigor erases to ordinary RBS that is never narrower than what was proved.
- **Three-valued certainty.** Type, reflection, and member queries return `yes`, `no`, or `maybe`. `maybe` does not narrow as if `yes` and does not produce the opposite-edge fact as if `no`.
- **Two relations, kept separate.** Subtyping (`A <: B`, value-set inclusion) and gradual consistency (`consistent(A, B)`, dynamic-boundary compatibility) are not unified. `untyped` is the dynamic type, distinct from `top`.
- **Robustness principle (Postel's law).** Rigor-authored types are *strict on returns* and *lenient on parameters*. A precise return propagates useful facts through the inference engine; a permissive parameter prevents coercion workarounds at call sites. Hand-written RBS authorship binds — the principle directs Rigor's defaults, not user-supplied signatures. See [robustness-principle.md](../type-specification/robustness-principle/) for the normative rule and [adr/5-robustness-principle.md](../adr/5-robustness-principle/) for the design rationale.

## Main features

| Feature | Where to read more |
| --- | --- |
| `Dynamic[T]` algebra and gradual-typing provenance | [value-lattice.md](../type-specification/value-lattice/), [special-types.md](../type-specification/special-types/) |
| Edge-aware control-flow narrowing inside compound conditions | [control-flow-analysis.md](../type-specification/control-flow-analysis/) |
| Negative facts, difference types, complement display contract | [type-operators.md](../type-specification/type-operators/) |
| Structural duck typing through RBS interfaces and inferred object shapes | [structural-interfaces-and-object-shapes.md](../type-specification/structural-interfaces-and-object-shapes/) |
| Capability roles (`_RewindableStream`, `_ClosableStream`, …) for IO-like compatibility | [structural-interfaces-and-object-shapes.md](../type-specification/structural-interfaces-and-object-shapes/) |
| Refinements (`non-empty-string`, `positive-int`, hash-shape extra-key policy, …) | [imported-built-in-types.md](../type-specification/imported-built-in-types/), [rigor-extensions.md](../type-specification/rigor-extensions/) |
| `RBS::Extended` annotations (`%a{rigor:v1:…}` for predicates, assertions, conformance) | [rbs-extended.md](../type-specification/rbs-extended/) |
| Inference budgets and boundary contracts for recursion / operator ambiguity | [inference-budgets.md](../type-specification/inference-budgets/) |
| Diagnostic identifier taxonomy and suppression markers | [diagnostic-policy.md](../type-specification/diagnostic-policy/) |
| Conservative RBS erasure and hash-shape erasure algorithm | [rbs-erasure.md](../type-specification/rbs-erasure/) |

## Quick reading paths

- **Just want the mental model?** Read [overview.md](../type-specification/overview/), [value-lattice.md](../type-specification/value-lattice/), and [special-types.md](../type-specification/special-types/) in that order.
- **Implementing inference?** Add [control-flow-analysis.md](../type-specification/control-flow-analysis/), [normalization.md](../type-specification/normalization/), [inference-budgets.md](../type-specification/inference-budgets/), and the analyzer-internal contracts in [`docs/internal-spec/`](../internal-spec/) — start with [implementation-expectations.md](../internal-spec/implementation-expectations/) and [internal-type-api.md](../internal-spec/internal-type-api/).
- **Writing RBS or `RBS::Extended` payloads?** Read [rbs-compatible-types.md](../type-specification/rbs-compatible-types/) and [rbs-extended.md](../type-specification/rbs-extended/), then [rbs-erasure.md](../type-specification/rbs-erasure/) to see how they round-trip.
- **Reviewing or extending the diagnostic surface?** Read [diagnostic-policy.md](../type-specification/diagnostic-policy/) alongside [type-operators.md](../type-specification/type-operators/).

## Specification index

The full reading order, conventions (RFC 2119 keywords, RBS-first compatibility hierarchy), and one-line description of each topical document live in [`docs/type-specification/README.md`](../type-specification/).

For analyzer-internal contracts that complement the type specification (engine-surface, type-object public API), see [`docs/internal-spec/README.md`](../internal-spec/).

## Related documents

- [`README.md`](https://github.com/rigortype/rigor/blob/main/README.md) — project overview and CLI entry point
- [`AGENTS.md`](https://github.com/rigortype/rigor/blob/main/AGENTS.md) — development workflow for this repository
- [`docs/adr/0-concept.md`](../adr/0-concept/) — Rigor's high-level concept ADR
- [`docs/adr/1-types.md`](../adr/1-types/) — type-model ADR (design rationale, options considered, rejected/deferred items, open questions)
- [`docs/adr/2-extension-api.md`](../adr/2-extension-api/) — plugin extension API ADR
- [`docs/adr/3-type-representation.md`](../adr/3-type-representation/) — internal type representation ADR (design rationale and open questions)
- [`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/) — type inference engine ADR (slice roadmap, tentative answers to ADR-3 open questions)
- [`docs/internal-spec/README.md`](../internal-spec/) — analyzer-internal contracts (engine surface, type-object public API, inference engine)
