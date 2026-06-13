---
title: "Matsumoto & Minamide 2008 (polymorphic-record Ruby type inference) — Rigor perspective review"
description: "English translation of a Rigor-perspective review of Matsumoto & Minamide's 2008 polymorphic-record type inference paper."
sourceSha: "3e43a147510bc06cb411af0ffae1c5ece17df6c76d8cd1749bb4d4718a242972"
sourceCommit: "94bccefcb8e324ea2322199418f33e80617b8e33"
translationStatus: "translated"
---

Date: 2026-05-18.

Status: **research note, no design commitments.**

Kind: Rigor-perspective review of an external paper.

## Paper

- Soutaro Matsumoto, Yasuhiko Minamide,
  "Type inference for Ruby programs based on polymorphic record types,"
  IPSJ Transactions on Programming Vol.49 No.SIG 3 (PRO 36),
  pp.39–54 (Mar. 2008)
- Source URL: <https://ipsj.ixsq.nii.ac.jp/records/16465>
- Local copy: [IPSJ-TPRO4903005.md](https://github.com/rigortype/rigor/blob/master/IPSJ-TPRO4903005.md) /
  [IPSJ-TPRO4903005.pdf](../../IPSJ-TPRO4903005.pdf)

## 1. Paper summary (one paragraph)

Loads Garrigue-kinded polymorphic record types (with maskable fields) on top of an ML-style type system, designed and implemented as a type-inference tool for Ruby programs. Object types are represented by the triple-kind `α :: (L, U, R) ▷ α`, where `L` is the set of required methods, `U` is the set of defined methods, and `R` is the relational predicate "method name → function type." Instance variables are handled via Tofte's **imperative type variables (`_β`)**, suppressing polymorphism to preserve soundness in the presence of side effects. Built-in classes are described with a custom signature language (`def m :: C → C'`), and to fit Ruby's class-reopening culture the type system is designed so that **signatures and Ruby implementations coexist within the same class**. An asymmetric design is adopted: the negative position (arguments) takes its type only from signatures, while the positive position (return value) constructs its type from both signatures + Ruby definitions. Polymorphic recursion (the mutual recursion among Array/String/Integer) and irregular polymorphic methods such as `map` are approximated by **finite expansion (duplication) of class definitions**. The implementation is OCaml + a modified NodeDump; it can infer types for 21 out of 39 Ruby 1.8.5 samples (for `list.rb`: 80 lines in 1.26 s, but the number of bound type variables reaches **57,479**). The paper explicitly notes that soundness "holds only for a very restricted subset of Ruby."

## 2. Correspondence with Rigor's current design

| Paper-side concept | Rigor-side counterpart | Match / observation |
| --- | --- | --- |
| **Signature language `def m :: C → C'`** | [RBS (and its Rigor superset)](../../type-specification/rbs-compatible-types/) | The paper predates the RBS standardization (around 2020) by 12 years. Effectively **a prehistory of RBS**. The same separation strategy — "do not write types in the Ruby program body, give signatures separately" — is shared, but RBS separates into `.rbs` files while the paper coexists within the same class — a syntactic difference. |
| **Polymorphic record types + Garrigue kinds** | RBS's **nominal types + interface partial-structure** hybrid | Rigor is **nominal-first**. It does not take the structural approach of polymorphic records. The "type expressions inflate / 57k type variables" problem the paper struggled with is largely avoided by RBS putting nominal names front and center. This aligns with the engineering conclusion the same author arrived at in the Steep era. |
| **Imperative type variables (polymorphism restriction for IVars)** | Rigor's per-class IVar shape + initialization tracking (spec in [internal-spec](../../internal-spec/inference-engine/)) | The problem domain is exactly the same: do not let polymorphism contaminate side-effect-bearing ivars. The paper uses Tofte-style type-variable classification; Rigor uses fixing per-class shape + implementation without kind separation. **The paper's solution is theoretically clean, Rigor's is practical enough** — a trade-off difference. |
| **Asymmetric treatment of positive/negative positions** | [ADR-5 robustness principle](../../adr/5-robustness-principle/) | An interesting **same-direction in net** asymmetry. Paper: "fewer demands on the caller (negative position), accept generous implementations (positive position)." Rigor: "arguments (negative) are lenient, returns (positive) are strict." The **side that makes life easier for the caller** agrees in both, but the **strict/lenient direction on the return side is opposite** — this difference falls out naturally from the goal difference ("reduce friction as a type-inference tool" (paper) vs. "build trust as a type catalog" (Rigor)). A note comparing the paper's opposing design with Rigor's chosen direction is worth adding to [ADR-5](../../adr/5-robustness-principle/) as justification material for Rigor's robustness principle. |
| **"Class expansion" handling of polymorphic recursion** | RBS's pre-declared nominal types + per-method generics | The paper resorts to **manual expansion** (e.g. `Array#0`/`Array#1`) because the mutual recursion of Array/String/Integer collapses to monomorphism and produces false positives. On Rigor's side, RBS can declare `class Array[Elem]` polymorphically from the outset, so the structural monomorphism collapse does not happen. This is corroborating evidence for Rigor's decision to **trust hand-written RBS (and future sig-gen)** ([ADR-14](../../adr/14-rbs-sig-generation/), [AGENTS.md § RBS Authorship](https://github.com/rigortype/rigor/blob/master/AGENTS.md)). |
| **Irregular type of `map` (polymorphic recursion + polymorphic methods)** | RBS's `def map: [U] () { (Elem) -> U } -> Array[U]` | The paper cannot express this and approximates conservatively as "result-array element type = input-array element type" → producing a false positive on the practical example `[1,2,3].map{|x|x.to_s}.map{|x|(x+"0").to_i}`. RBS (Rigor) writes it naturally. The paper explicitly shows **why the limits of ML inference were pushed into declarative-first nominal generics**. |
| **Heterogeneous collections** | Rigor's Union types ([value-lattice.md](../../type-specification/value-lattice/)) | The paper handles element types as "structural types containing only the common fields" (fields accessible, not discriminable). Rigor uses Union (discriminable, requires narrowing). The essential difference: Union has **better affinity with narrowing/refinement**; Garrigue-style has **more freedom of access**. Rigor's design emphasises control-flow narrowing, so Union is the correct choice. |
| **`as(Integer)` cast proposal** (§7) | RBS::Extended's `%a{rigor:v1:assert_type ...}` / `%a{rigor:v1:return_override ...}` ([rbs-extended.md](../../type-specification/rbs-extended/)) | **The same-direction idea reconverges across a 12-year gap.** The paper's design ("the `as` method does nothing at runtime, has meaning only to the type-inference side") shares exactly the same philosophy as Rigor's predicate / assertion annotations. |
| **Stance on soundness** | Rigor's "RFC 2119 spec + practicality-first implementation" | **Exact match.** Paper: "prioritises coverage of practical Ruby programs over theoretical correctness." Rigor: "adopts the robustness principle, has no mechanised soundness proof" ([ADR-5](../../adr/5-robustness-principle/), [implementation-expectations.md](../../internal-spec/implementation-expectations/)). The fact that the same author's 2010 CFA paper ([sister note](../20260518-matsumoto-2010-cfa-rigor-review/)) was the only one to give a proof was possible because the target could be narrowed to SemiRuby. |
| **Cannot handle varargs** | RBS's native `*args: T` / `**kwargs: T` support | The paper split `print` by hand into `print1`/`print2`/`print3`. A concrete example of **what the expressive power of the RBS language resolved**. |
| **Error output is a raw dump of internal representation (§7 challenge)** | Rigor's diagnostic policy / family hierarchy ([diagnostic-policy.md](../../type-specification/diagnostic-policy/), [ADR-8](../../adr/8-steep-inspired-improvements/)) | The same author **recognised this problem early on**. A direct lineage explaining why the Steep–to–Rigor years of investment have focused on diagnostic UX. |
| **"Parent-method copy" implementation of class inheritance** | Rigor / RBS lookup chain | A compromise for implementation simplicity in the paper. Rigor can run analysis while preserving Ruby's true inheritance lookup (preserving identity). |

## 3. Concrete pointers the paper offers to Rigor

1. **Evidence for the "type variables explode to the ten-thousands" phenomenon.** The paper's `list.rb` result (57,479 bound type variables) is highly citable. As justification material for Rigor's **decision not to adopt structural polymorphic records**, a footnote could be added to [ADR-1](../../adr/1-types/) or [ADR-3](../../adr/3-type-representation/).

2. **A counterpoint for ADR-5's robustness principle.** The paper's design "signature-only on the negative position, implementation included on the positive position" is **another solution along the same "introduce asymmetry" axis**. There is room to organise a comparison between Rigor's chosen direction and the paper's direction as a "Why this asymmetry, not the other" section in [ADR-5](../../adr/5-robustness-principle/) or in [`docs/type-specification/robustness-principle.md`](../../type-specification/robustness-principle/).

3. **The genealogical proximity of `as(klass)` casts and Rigor's `%a{rigor:v1:assert_type}`** is justification material for Rigor's RBS-extended annotation design. The fact that the same author arrived at the same conclusion across 12 years demonstrates the robustness of the design choice.

4. **The manual-expansion-of-polymorphic-recursion approach** offers a hint on the scope of Rigor's sig-gen ([ADR-14](../../adr/14-rbs-sig-generation/)): rather than aiming at fully-automatic polymorphic-recursion analysis, Rigor's strategy of **making developers pay the cost of declaring nominal generics up front, in exchange for the inference side treating those declarations as absolute** can be understood as the structure of **shifting onto humans (library authors)** the "class duplication and expansion" that the paper brought in as a mechanical solution.

5. **The strategic absence of a soundness proof** is corroborated by this paper as a **consistent engineering judgement** in the lineage 2008 → 2010 → Steep → present from the same author. Rigor inheriting the same judgement is on the legitimate path and need not be defended independently.

6. **As the origin of the lineage to Steep**, the first leg of the flow this paper → CFA paper → Steep → RBS is here. RBS's expressive power (nominal generics, varargs, block arguments, polymorphic methods) all correspond to **the places where the paper could not express things in ML+kind and got stuck**. As a "collection of failure cases" for reading the RBS design rationale, the paper has high value.

## 4. Summary

The paper empirically demonstrates that an attempt to type Ruby with ML-style structural polymorphic records simultaneously hits five walls: **polymorphic recursion, polymorphic methods, varargs, soundness, and type-expression size**. Rigor sits in the line of the same author's lineage, but bypasses these walls with **a different choice — RBS** (nominal-first + declaration-first + plugin extensions + partial-structural interfaces). The paper is a first-class document that reads as a **historical validity check** for Rigor's design decisions on **why not adopt Garrigue-style structural type inference, why prioritise RBS compatibility, why not aim at full soundness**. It is **especially suitable for explicit citation as background literature** for [ADR-1](../../adr/1-types/), [ADR-5](../../adr/5-robustness-principle/), [ADR-14](../../adr/14-rbs-sig-generation/), and the RBS-extended annotation spec.

## Related ADRs / specs

- [ADR-0: Concept](../../adr/0-concept/)
- [ADR-1: Type Model and RBS Superset Strategy](../../adr/1-types/)
- [ADR-3: Internal Type Representation](../../adr/3-type-representation/)
- [ADR-5: Robustness Principle](../../adr/5-robustness-principle/)
- [ADR-8: Steep-Inspired Improvements](../../adr/8-steep-inspired-improvements/)
- [ADR-14: RBS Signature Generation](../../adr/14-rbs-sig-generation/)
- [RBS::Extended annotation spec](../../type-specification/rbs-extended/)
- [Robustness Principle spec](../../type-specification/robustness-principle/)

## Sister note

- [Matsumoto & Minamide 2010 (Ruby CFA) Rigor perspective review](../20260518-matsumoto-2010-cfa-rigor-review/)
  — Rigor-perspective review of the same author's 2010 paper (the CFA paper that succeeds this one).
