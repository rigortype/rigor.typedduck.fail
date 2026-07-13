---
title: "Ren et al. 2013 \"The Ruby Type Checker (rtc)\" — a Rigor-perspective review"
description: "A Rigor-perspective review of Ren et al. 2013 rtc: same goal (type safety for Ruby without breaking running code), opposite mechanism (runtime, annotation-rooted checking)."
sourceSha: "c92df76aca26d26d0f17439ab1b2b3e70d16b4c5f86f6054d4f48a16adc64dc7"
sourceCommit: "ca611a0fa195c049e8e56b0aa4a78145864c4d54"
translationStatus: "translated"
---

**Status:** research note, no design commitments. An external-literature review from Rigor's perspective.
**Date:** 2026-07-12.
**Rigor version:** observations against master @ `138bf2c4` (right after the v0.2.9 release).

## Paper under review

- Brianna M. Ren, John Toman, T. Stephen Strickland, Jeffrey S. Foster
  **"The Ruby Type Checker"**
  Proc. 28th ACM Symposium on Applied Computing (SAC '13), pp. 1565–1572,
  Coimbra, Portugal, March 2013. ACM 978-1-4503-1656-9/13/03.
  (University of Maryland, College Park. The distributed URL's filename is `oops13.pdf`,
  but the imprint says SAC'13.)
- Primary-source URL: <https://www.cs.tufts.edu/~jfoster/papers/oops13.pdf>

**Why:** rtc pursues the **same goal as Rigor (type safety for Ruby, without breaking running code)**,
yet its machinery sits at the exact opposite design point — where Rigor is "static, inference-first, no
annotations required," rtc is "runtime, annotation-rooted checking, pay-for-what-you-use." Setting these
poles against each other lets us (a) confirm which axes Rigor's design decisions deliberately diverge on,
(b) take inventory of what price Rigor pays to approximate the hard spots (eval / method_missing / reflection)
that rtc claims are "naturally solved because it is runtime," and (c) record the fact that both systems
independently converge on the same real-bug shape (the `false`/`nil` return arm). This paper is the core of
the U.S.-side Ruby-typing lineage DRuby → Rubydust → **rtc** → (later) RDL from Foster's group, and it has
value as a continuing benchmark paired with the Japan-side lineage of
[Matsumoto & Minamide 2010 (Steep prehistory)](../20260518-matsumoto-2010-cfa-rigor-review/).

**Reading order.** §1 inventories rtc's surface, §2 maps the type languages, §3 covers the divergent design
decisions (the most important part), §4 the concrete implications for Rigor, and §5 the lineage and its
standing as a benchmark.

---

## 1. Inventory of rtc's surface

1. **Runtime type checking — but at method entry/exit**. rtc is implemented as a Ruby library, and type
   checking runs at runtime. But it places itself at a **midpoint**: "faster than pure dynamic typing
   (at method entry/exit), slower than pure static typing." Its selling point is that, being runtime, it
   naturally handles the highly dynamic features (eval, reflective method invocation) that static checking
   struggles with.

2. **"pay for what you use" — annotation-rooted checking**. Programs without annotations run as usual.
   Objects are split into **raw (untyped)** and **annotated (typed)**, and **type checking fires only when
   an annotated value becomes a receiver**. Annotations are declared explicitly by the programmer, or
   implicitly attached to a value passed as an argument into a type-checked call.

3. **Annotation DSL (attached to classes, methods, objects)**.
   - `rtc_annotated` — mark a class as an annotation target.
   - `typesig "personnel_id : () -> Fixnum"` — declare a method type as a **string**.
   - `rtc_annotate` — create an annotated version carrying a type on a value (safe upcasts only).
   - `rtc_cast` — a separate method for downcasting (e.g., into a union type); a cast is conceptually
     distinct from an upcast, so it is kept separate.
   - `rtc_instantiate` — explicitly instantiate a type parameter.
   - `rtc_autowrap` — automatically annotate all instances of a class (non-parametric classes only).

4. **Type-system expressiveness**. nominal types / **union** (`Manager or %false`) / **intersection**
   (writing multiple `typesig`s on the same method = intersection = the equivalent of overloading) /
   **block (higher-order method) types** (`() { (String) -> %any } -> String`) / **parametric polymorphism**
   (`Array<t>`, `map<u>: () {(t) -> u} -> Array<u>`) / **type cast** / **Tuple types**
   (`Tuple<t1,…,tn>`, the i-th being ti) / type aliases (`%true`, `%bool`, `%any`, `%false`).

5. **Implemented via proxies**. An annotated object is wrapped in a **Proxy** carrying `method_missing`
   that intercepts calls, type-checks them at entry/exit, delegates to the underlying object, and also
   annotates arguments and return values. Proxy implementation details: proxy tracking on `self` (a Proxy
   stack); `:unwrap => [0]` (an argument-position spec that strips the proxy before the call) to handle the
   problem of native methods disliking proxies; `false`/`nil` are not wrapped (because boolean comparisons
   cannot be intercepted); `eval`-generated methods are faster to call than `define_method`; and so on.

6. **non-strict mode (default)**. When annotating a raw array, checking down to the element type of a
   container like `Array` is iteration-expensive. In the default non-strict mode, only the **type constructor
   (the kind of container)** is matched, and the type parameter (element type) is not checked. `$RTC_STRICT = true`
   switches to strict mode (elements are iterated and checked too). Even in non-strict mode, errors are still
   caught the moment a stored value is **used**.

7. **Evaluation.** Subject programs = Sudoku / Ascii85 / ministat / finitefield / hebruby / set / RDS
   (SinglyLinkedList, etc.) plus the built-in Array/Hash/Set. The first five come from the Rubydust
   benchmarks. Relative overhead is large (Sudoku 0.04s → non-strict 5.34s → strict 7.58s, mainly from
   method-interception cost), but in absolute time the tests are fast. In production it can be disabled with
   `RTC_DISABLED`. In usage frequency, union / polymorphism are most common in the subject programs, and
   intersection / block types are most common in the standard library; tuples and `rtc_cast` are very rare.
   **One real bug detected** (Sudoku's `search` returns `false` when there is no solution, but
   `string_solution` assumes a valid solution → fires as an annotation mismatch).

---

## 2. Type-language correspondence (rtc ↔ Rigor)

| rtc type constructor | Rigor counterpart | Remarks |
| --- | --- | --- |
| nominal type | Nominal carrier (an RBS superset) | Direct correspondence. |
| union (`A or B`) | Union ([value-lattice.md](../../type-specification/value-lattice/)) | Direct correspondence. rtc explicitly states "regular union, not disjoint union" — synonymous with Rigor's union. |
| intersection (multiple `typesig`s) | method overloading (RBS overload) | rtc writes multiple `typesig`s on a same-named method and defines the intersection as satisfying all annotations. Isomorphic to Rigor's overload resolution (`OverloadSelector`). |
| block (higher-order) type | block type ([structural-interfaces](../../type-specification/structural-interfaces-and-object-shapes/), [ADR-16](../../adr/16-macro-expansion/) Tier A) | Direct correspondence. rtc's `() { (String) -> %any } -> String` maps straight onto Rigor's block-type annotation. |
| parametric polymorphism (`Array<t>`, `map<u>`) | generics + lightweight HKT ([ADR-20](../../adr/20-lightweight-hkt/)) | Correspondence. rtc infers `map`'s `u` "from the block's first-invocation result, or `%none` = bot if never invoked" — the same idea as Rigor's block-return inference. |
| Tuple type (`Tuple<t1,…,tn>`) | Tuple carrier + Data/Struct member shape ([ADR-48](../../adr/48-data-struct-value-folding/)) | Correspondence. rtc uses Tuple to distinguish "using an array both as a homogeneous collection and as a fixed-length tuple" — the same motivation as Rigor's Tuple/HashShape separation. Unlike DRuby, rtc explicitly states "it stays a Tuple while Tuple methods are used, and is promoted to Array once a non-Tuple method arrives." |
| type alias (`%true`/`%bool`/`%any`/`%false`) | special types ([special-types.md](../../type-specification/special-types/)) | `%any` = untyped = **Rigor's `Dynamic[top]`**. `%false`/`%true`/`%bool` correspond to Rigor's `false`/`true`/`bool` literals and boolish. `%none` = bot. Nearly one-to-one. |
| `rtc_cast` (runtime downcast) | assertion annotation (`rigor:v1:assertion` in [rbs-extended.md](../../type-specification/rbs-extended/)) | Conceptual correspondence. rtc tests a value at runtime and then re-labels its type. Rigor obtains the same effect statically via narrowing, or you write an explicit assertion. |
| **prohibition of union/intersection ambiguity** | uniqueness of overload resolution (value-pinning / consistency) | rtc **prohibits at annotation time** unions/intersections whose type-variable bindings would be ambiguous, and errors on the ambiguous method call. Rigor solves it **at check time** via consistency. The two address the same hard spot at different points in time (§3-4). |

The expressiveness of the two type languages is nearly equivalent, and rtc's string DSL is the direct
ancestor of the RBS/RDL lineage that Rigor takes as a superset (the annotation strings of rtc → RDL are
rooted in this paper's `typesig`).

---

## 3. Divergent design decisions (the most important part)

1. **Static vs. runtime — opposite ends of the design space**.
   rtc checks at method boundaries at runtime. Implications: (a) it **only protects observed execution
   paths** (branches that did not run, and metaprogrammed methods, go unchecked); (b) the **runtime overhead**
   of proxy interception; (c) conversely, it handles eval/reflection/`method_missing` **naturally**.
   Rigor protects **all paths** with zero runtime cost, statically and without required annotations, at the
   price of statically approximating dynamic features.
   **The goal (low-FP Ruby type safety) is identical; the machinery is exactly opposite** — a runtime-side
   instance of the "same goal, opposite mechanism" configuration seen in the
   [Elixir review](../20260604-elixir-v1.20-type-system-rigor-review/).

2. **The handling of dynamic features is swapped (rtc sidesteps Rigor's biggest hard spot at runtime)**.
   In its related-work comparison, rtc explicitly states that "because it runs at runtime, it observes only
   realizable execution paths and works easily even in the presence of dynamic features involving eval,
   reflective method invocation, and `method_missing`." This is precisely the territory Rigor has struggled
   with statically — `pre_eval` ([ADR-17](../../adr/17-monkey-patch-pre-evaluation/)), the macro-expansion
   substrate ([ADR-16](../../adr/16-macro-expansion/)), implicit-self call resolution
   ([ADR-24](../../adr/24-self-method-call-resolution/)/[ADR-57](../../adr/57-self-call-return-adoption/)),
   and the whole arc of `Dynamic[T]` provenance
   ([ADR-75](../../adr/75-dynamic-provenance/)/[ADR-82](../../adr/82-dynamic-origin-algebra/)).
   rtc **structurally eliminates** these by "paying at runtime." Rigor pays via "static approximation + a
   plugin escape hatch." **This is a fundamental trade and cannot be followed — record only**. But the flip
   side is that the "paths that did not run / metaprogrammed methods that were never invoked" that rtc cannot
   protect are exactly the territory Rigor can protect statically, so the advantage exists symmetrically.

3. **Inference vs. checking (the contrast with Rubydust is what matters to Rigor)**.
   The paper places itself against Rubydust (An et al., POPL 2011 — constraint-based type **inference**),
   and says rtc does type **checking**. Rigor sits at a third point: inference-first (the DRuby/Rubydust-side
   lineage) **and** static **and** low-FP. rtc's reasons for choosing checking — (a) avoid maintaining a Ruby
   frontend, (b) handle dynamic features, (c) report errors **as they occur** (Rubydust solves constraints
   at the end, so its reports are hard to interpret) — of these, (c) Rigor also satisfies via "immediate
   reporting at check time with a source of origin," but (a) and (b) are where Rigor **deliberately chose the
   opposite** (taking on the cost of a full frontend and static approximation to gain all-path protection and
   zero runtime cost).

4. **The point in time at which union/intersection ambiguity is addressed**.
   rtc **prohibits, syntactically at annotation time**, unions/intersections whose type-variable bindings
   would be ambiguous, and makes an ambiguous method call a runtime error (e.g., `m1<t,u>: (t or u) -> ...`
   is ambiguous because t/u appear in the same position). Rigor solves the same ambiguity at **check-time
   overload resolution** (value-pinning, gradual consistency). Rigor is more permissive of expressiveness in
   that it "solves rather than prohibits," but it also carries the risk of quietly dropping an unsolvable
   ambiguity into `Dynamic`. rtc's "ambiguity is an explicit error" is a reference for the design decision to
   **surface, with `analyzer-budget-cutoff`-family rather than `framework_dsl_boundary`**, the provenance of
   the places where Rigor's overload resolution silently turns something into Dynamic.

5. **The non-strict/strict binary mode for container-checking cost**.
   rtc resolves "looking down to a container's element type is iteration-expensive" with a **global mode flag**,
   non-strict (constructor only) / strict (elements too). Rigor solves the same cost problem with **per-carrier
   budgets** ([ADR-41 inference budgets](../../adr/41-inference-budget-design/),
   [inference-budgets.md](../../type-specification/inference-budgets/)) and the element-type join of the
   shape carrier ([ADR-56](../../adr/56-block-captured-local-mutation/) slice C, ADR-48 member layout).
   rtc's binary flag is coarse, but the very existence of the "container vs. contents" axis is a shared
   essence. Rigor's budget scheme can be read as a continuous version of "the kind of container is always
   free; the contents go to Dynamic once fuel runs out."

---

## 4. Concrete implications for Rigor

1. **The `false`/`nil` return arm is the highest-value real-bug shape in both systems (independent convergence)**.
   ✅ Rigor has already started on this. rtc's only real-bug detection, and the "most common error" it found
   through annotating iteratively, were both **missing the edge case of "a method that sometimes returns
   `false`"** and **"forgetting one arm of an intersection."** This is exactly the territory targeted by
   Rigor's union-arm predicate polarity ([ADR-57 WD3](../../adr/57-self-call-return-adoption/),
   [the union-arm-predicate-polarity note](../20260710-union-arm-predicate-polarity/)) and the possible-nil
   family ([ADR-58](../../adr/58-ivar-field-typing/)). **The fact that two independent Ruby type systems
   converged on "the money bug is the `false`/`nil` return arm"** externally corroborates the validity of the
   engineering effort Rigor has invested here. No additional action needed, but there is value in citing "rtc
   reached the same conclusion" in Rigor's diagnostic-example collection and handbook.

2. **rtc is "a device that converts type annotations into test protection" — a data point for ADR-70's
   test-protected axis**.
   The essence of rtc is that "an annotation becomes a runtime assertion, exercised by the test suite." This
   is nothing other than a form of fused protection ([ADR-70](../../adr/70-fused-protection-coverage/)) that
   **realizes the test-protected axis not with mere tests but with type contracts**. Implications:
   - rtc's "protection" is capped by test coverage (paths that do not run are unprotected) — the same
     structure as ADR-70's reason for saying "test protection is the suite's job; you must not select it from
     the dependency graph."
   - Rigor's type protection (static, all-path, capped by inference precision) and rtc-style runtime
     protection are **complementary**. To ADR-70's attribution ("add types" vs. "add tests"), rtc suggests a
     **third, intermediate move**: "make the annotation a runtime contract and the tests will exercise the
     types."
   Record value: where ADR-70's framing was "static types ∪ running tests," rtc historically demonstrates
   the existence of an intermediate layer, "static types ∪ **type-contracted** running tests."

3. **The standing of `%any` = Dynamic and its provenance**.
   rtc's `%any` is an explicit untyped that expresses "the block may return anything," common in non-strict
   mode and at native boundaries. Its role is the same as Rigor's `Dynamic[T]`, but Rigor tracks "why it is
   Dynamic" via provenance ([ADR-75](../../adr/75-dynamic-provenance/)/[ADR-82](../../adr/82-dynamic-origin-algebra/)).
   rtc does not track it (being runtime, it does not need to). Put the other way, **Rigor's provenance arc is
   "metadata that became necessary precisely because it is static,"** and the contrast with rtc throws its
   reason for existence into sharp relief — a runtime checker has no need to know the origin of a Dynamic
   (it sees the real thing the moment the value arrives).

4. **The rarity of `rtc_cast` / assertions corroborates "people don't want to write annotations"**.
   In rtc's evaluation, tuple types and `rtc_cast` were "very rare." The observation that a cast (= a person
   manually re-labeling a type) is seldom needed in real programs is external evidence in the same direction
   as Rigor's "over hand-written RBS, prefer `sig-gen` and inference precision" orientation
   (`feedback_no_ai_generated_rbs`). People do not want to write narrowing → make inference and narrowing
   apply it automatically.

---

## 5. Lineage and standing as a benchmark

- **The core of Foster's group's Ruby-typing lineage**. DRuby (Furr, An, Foster, Hicks — "Static Type
  Inference for Ruby," OOPS'09; static, constraint-based inference) → Rubydust (POPL 2011; dynamic,
  runtime constraint collection, solved at the end) → **rtc (this paper, SAC'13; runtime checking,
  annotation-rooted)** → (later) RDL.
  Rigor can be read as a design that inherits DRuby's goal of "bootstrapping types by inference" while going
  after the "static, all-path, zero-runtime-cost" that Rubydust/rtc let slip by going runtime. rtc's `typesig`
  string DSL is, by way of RDL, one source of the current RBS/Sorbet-era type-annotation culture, and it lies
  downstream of Rigor's decision to choose RBS super-compatibility.

- **Paired with the Japan-side lineage (Steep prehistory)**. Where the existing
  [Matsumoto & Minamide 2010 (Ruby CFA) note](../20260518-matsumoto-2010-cfa-rigor-review/) covered Steep's
  prehistory (the semi-flow-sensitive CFA of method configuration), this note covers the U.S.-side Foster-group
  lineage. **Both lineages ultimately converge on "RBS + a practical checker,"** and Rigor sits downstream at
  that confluence. method configuration (who is visible = flow-sensitive) and rtc (seeing the real thing at
  runtime) are static/runtime answers to the same problem, "how to pin down the visibility of dynamic
  dispatch," and taking the two notes together makes clear that Rigor's dispatcher hierarchy + `pre_eval`
  stand as the **static approximation** of it.

- **Trigger for revisiting as a continuing benchmark.** rtc alone is old (2013) with no follow-up items, but
  if Foster's group's line (RDL and its successors, the runtime-contract × type-inference hybrid) puts out
  something new, it will be worth re-benchmarking as an implementation example of the intermediate move in
  ADR-70 fused protection, "runtime-izing a type contract into test protection."

---

## 6. Summary

rtc is a runtime type checker that **pursued the same goal as Rigor (Ruby type safety without breaking
running code) with the exact opposite mechanism**. The two biggest implications:

1. **rtc structurally eliminates dynamic features (eval/method_missing/reflection) at runtime, while Rigor
   pays for them via static approximation + plugins** — this is a fundamental trade, and it illuminates from
   the outside that all of Rigor's `Dynamic` provenance arc, `pre_eval`, macro substrate, and self-call
   resolution are "the price of choosing static" (record, do not follow). Symmetrically, the unexecuted paths
   and never-invoked metaprogrammed methods that rtc cannot protect are Rigor's static-advantage territory.

2. **Two independent Ruby type systems converged on "missing the `false`/`nil` return arm" as the
   highest-value real-bug shape** — Rigor's investment in union-arm polarity (ADR-57) and possible-nil
   (ADR-58) aligns with the industry frontier. In addition, rtc, as "a device that converts type annotations
   into test protection," historically demonstrates the existence of a **type-contracting intermediate move**
   on the test-protected axis of fused protection (ADR-70), which has high record value.

The type language (union/intersection/block/polymorphism/tuple/alias) is nearly equivalent, and rtc's
`typesig` string is the direct ancestor of the RBS/RDL annotation culture that Rigor takes as a superset.
This note carries no design commitments, but it leaves a small improvement opening to cite "rtc reached the
same conclusion / the same real-bug shape" in ADR-70's attribution explanation and in the handbook's
diagnostic-example collection.

## Related ADRs / specifications

- [ADR-16: Macro / DSL Expansion Substrate](../../adr/16-macro-expansion/)
- [ADR-17: Monkey-Patch Pre-Evaluation](../../adr/17-monkey-patch-pre-evaluation/)
- [ADR-41: Inference Budget Design](../../adr/41-inference-budget-design/)
- [ADR-48: Data / Struct Value Folding](../../adr/48-data-struct-value-folding/)
- [ADR-57: Self-Call Return Adoption (union-arm polarity)](../../adr/57-self-call-return-adoption/)
- [ADR-58: Instance-Variable Field Typing](../../adr/58-ivar-field-typing/)
- [ADR-70: Fused Static∪Dynamic Protection Coverage](../../adr/70-fused-protection-coverage/)
- [ADR-75: Dynamic[T] Provenance](../../adr/75-dynamic-provenance/)
- [Special Types specification](../../type-specification/special-types/)
- [Value Lattice specification](../../type-specification/value-lattice/)
- [Control Flow Analysis specification](../../type-specification/control-flow-analysis/)

## Sister notes

- [Matsumoto & Minamide 2010 (Ruby CFA) — a Rigor-perspective review](../20260518-matsumoto-2010-cfa-rigor-review/)
  — Japan-side Steep prehistory. Paired with this note (the U.S.-side Foster-group lineage).
- [Elixir v1.20's gradual set-theoretic type system — a Rigor-perspective review](../20260604-elixir-v1.20-type-system-rigor-review/)
  — another instance of the "same goal, opposite mechanism (sound vs. unsound)" configuration.
