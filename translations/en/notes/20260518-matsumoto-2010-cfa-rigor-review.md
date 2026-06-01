---
title: "Matsumoto & Minamide 2010 (Ruby CFA) — Rigor perspective review"
description: "English translation of a Rigor-perspective review of Matsumoto & Minamide's 2010 control-flow-analysis paper."
sourceSha: "39dcddde6821e3340a65cd98c79a8d811df13e02ad64baadffade603dff37ca9"
sourceCommit: "a5d648b126d5ed7b1e04a16a87927bca7883e069"
translationStatus: "translated"
---

Date: 2026-05-18.

Status: **research note, no design commitments.**

Kind: Rigor-perspective review of an external paper.

## Paper

- Soutaro Matsumoto, Yasuhiko Minamide,
  "Control flow analysis of Ruby programs and a soundness proof,"
  IPSJ Transactions on Programming Vol.3 No.2, pp.9–25 (Mar. 2010)
- Source URL: <https://ipsj.ixsq.nii.ac.jp/records/37907>
- Local copy: [IPSJ-TPRO0302003.md](https://github.com/rigortype/rigor/blob/master/IPSJ-TPRO0302003.md) /
  [IPSJ-TPRO0302003.pdf](../../IPSJ-TPRO0302003.pdf)

## 1. Paper summary (one paragraph)

Defines an operational semantics for a subset of Ruby called **SemiRuby** (class definitions are given in advance, `def` is reduced to the triple of class name, method name, and definition identifier, blocks are lambda expressions, and `return`/`break` are translated to `throw`/`catch` pairs), and on top of that designs a **control-flow analysis that is control-flow-dependent with respect to method definitions (semi-flow-sensitive)**. Each program point is associated with a **method configuration**, a mapping "class × method name → method definition." This is updated at the evaluation of a `def` expression and combined as a set-union at `if`-merges. The novelty is the asymmetric design: values themselves are control-flow-independent, but *which definitions are visible* is control-flow-dependent. Finally a Palsberg–Schwartzbach-style safety analysis (no undefined-method calls / `yield` targets are lambda expressions) is defined and **preservation + progress** soundness is proved. Implementation is OCaml + BDDBDDB (a Datalog processor).

## 2. Correspondence with Rigor's current design

| Paper-side concept | Rigor-side counterpart | Match / observation |
| --- | --- | --- |
| The guideline **semi-flow-sensitive** | [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/)'s edge-sensitive narrowing, trinary certainty, fact stability | Match. The paper's pragmatism of avoiding full value-flow-sensitivity as a property aligns with Rigor's certainty/effect model. |
| **Method configuration D = {(C,f) → d}** | Rigor's dispatcher hierarchy (plugin → dependency-source → bundled) + Plugin::FactStore ([ADR-9](../../adr/9-cross-plugin-api/)) | Rigor only decides "which definitions are visible" statically per walker. The paper's D is more powerful in that it switches dynamically per program point. |
| **Example 1: top-level class A re-open** | [ADR-17 `pre_eval:`](../../adr/17-monkey-patch-pre-evaluation/) | In the paper, the semi-flow-sensitive CFA **directly** distinguishes "x:Fixnum / y:String." Rigor's design approximates the same precision with a two-phase approach: "run once first to build a project-wide ProjectPatchedMethods." The paper's mechanism is more elegant analytically; ADR-17 is exposed as an engineering compromise. |
| **Example 2: overriding def inside def** | Rigor effectively does not handle this | The paper's analysis handles this with precision. Rigor takes the ADR-5 robustness-principle (Postel-style asymmetric discipline) side and cuts this off as "doesn't happen that often in practice." At the cost of not closing the precision gap. |
| **Example 3: def inside an if branch** | Rigor's Union narrowing | Both end up as a conservative union. The paper and Rigor reach the same judgement that "this is essentially statically unanalysable." |
| **SemiRuby's throw/catch modeling of return/break** | Rigor's non-local-exit handling (the control parts of the diagnostic family) | The design judgement is isomorphic. |
| **Instance variables F[[l,@x]]** | Rigor's instance-variable inference (IVar's per-class shape) | The paper is more fine-grained, partitioning per location. Rigor stays per-class + initialization context. |
| **Safety analysis (undefined method / yield soundness)** | Rigor's `call.method-not-found` family ([diagnostic-policy](../../type-specification/diagnostic-policy/)) | The checked targets are nearly the same. Rigor additionally goes as far as the `def.return-type-mismatch` family, while the paper does not carry types that far (only value sets). |
| **Formal soundness proof (preservation + progress)** | **Does not exist in Rigor** | The spec corpus uses RFC 2119 norms, but there is no mechanical verification or operational semantics. The fact that the paper could prove this *because* it could narrow scope to SemiRuby is important. If Rigor were to aim for an equivalent proof, the first step would be to carve out a "provable core (Rigor Core)." |
| **Implementation: OCaml + BDDBDDB (Datalog)** | Rigor: hand-written Ruby inference engine + file-based cache ([ADR-4](../../adr/4-type-inference-engine/), [ADR-6](../../adr/6-cache-persistence-backend/)) | The paper's Datalog framing is beautiful in terms of maintainability, but does not fit Rigor's constraints: (a) coupling with RBS, (b) arbitrary Ruby logic in plugins, (c) Ractor parallelism ([ADR-15](../../adr/15-ractor-concurrency/)). A design-tradeoff difference. |

## 3. Concrete pointers the paper offers to Rigor

1. **The slice "only the visibility of method definitions is flow-sensitive"** clarifies one space where Rigor could gain precision. Today Rigor decides almost statically via the `:leaf` discipline + [ADR-17](../../adr/17-monkey-patch-pre-evaluation/) pre-evaluation, but the paper shows that the intermediate option **to have "method configurations" partially per program point** is theoretically justifiable. Subject to implementation cost and cache consistency (ADR-6).

2. **Reinforcement material for the discussion "is the ADR-17 MVP (explicit file enumeration) sufficient?"** The paper's Example 1 (top-level overriding) is exactly the ADR-17 use case, and the paper shows it can be solved with "an analysis that distinguishes control flow with respect to method definitions." That is, ADR-17's "explicit list" path is reaffirmed as a cheap and correct first step that reliably raises the precision floor.

3. **The absence of a soundness proof** is a strategic blank that remains in Rigor. If, like the paper, a two-layer **core + perimeter** structure is taken (SemiRuby ↔ full Ruby), then Rigor should also be able to aim at preservation/progress for just a "Rigor Kernel." This is not in the [ROADMAP](../../roadmap/) at the moment, but is a long-term high-value track.

4. The fact that **the first author = Soutaro Matsumoto = author of Steep** reaffirms the weight Rigor places on Steep compatibility ([ADR-8](../../adr/8-steep-inspired-improvements/)) and the RBS superset stance. We can see the genealogical pre-history of Steep's modern implementation in this paper: a comparison such as "method configuration is hidden inside Steep by subtyping + global env sanitization" has value as a standalone note.

5. **SemiRuby's style of translating blocks to lambdas and return/break to throw/catch** can be reused as-is as the semantic foundation for [ADR-16](../../adr/16-macro-expansion/)'s macro-expansion substrate Tier A (block-as-method). The option of adopting SemiRuby's semantics as the definition of "correctness" for Tier A is worth considering.

## 4. Summary

The paper is a result that formally solves Rigor's largest-class root problem of **"the dynamic nature of method definitions vs. static analysis"** by narrowing to the minimal kernel called SemiRuby. Rigor covers a broader Ruby surface in engineering terms, but (a) relies on approximations such as `pre_eval` pre-evaluation and (b) has no mechanical soundness proof. The paper's semi-flow-sensitive CFA and its soundness proof provide a reliable starting point in both directions for Rigor's **future "Rigor Kernel" extraction** and **narrowing strengthening that partially adopts method configurations**.

## Related ADRs / specs

- [ADR-5: Robustness Principle](../../adr/5-robustness-principle/)
- [ADR-8: Steep-Inspired Improvements](../../adr/8-steep-inspired-improvements/)
- [ADR-15: Ractor Concurrency](../../adr/15-ractor-concurrency/)
- [ADR-16: Macro / DSL Expansion Substrate](../../adr/16-macro-expansion/)
- [ADR-17: Monkey-Patch Pre-Evaluation](../../adr/17-monkey-patch-pre-evaluation/)
- [Control Flow Analysis spec](../../type-specification/control-flow-analysis/)

## Sister note

- [Matsumoto & Minamide 2008 (polymorphic record types) Rigor perspective review](../20260518-matsumoto-2008-poly-records-rigor-review/)
  — Rigor-perspective review of the same author's 2008 paper (reference 11 of this paper).
