---
title: "mizchi/dspec — Evaluation as a Formal Specification Substrate + Porting Study of Its Traceability Discipline"
description: "Evaluation of mizchi/dspec as a formal-spec substrate and the porting value of its traceability discipline, with a probe that found the void clause unimplemented."
sourceSha: "748f6e09d47a917f957f63b96def0a7354270d8473459f5321286a67b2b7794f"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
---

Date: 2026-07-16.

Status: **research note, no design commitments.**

Kind: external-tool survey + evaluation of portability into Rigor + evaluation of
using formal methods (Lean 4 / Alloy) as test oracles.
Related: [20260601-gradual-typing-era-mizchi-rigor-ts-review.md](../20260601-gradual-typing-era-mizchi-rigor-ts-review/)
(a review of an essay by the same author).

**Measured outcome of this note** (a by-product of the survey, but more important
than the main body):
discovered that the **`void` clause of `docs/type-specification/special-types.md`
is wholly unimplemented** (§ P1). Against the behavior that a clause containing two
MUSTs prescribes in the present tense, the implementation is
`Bases::Void => :translate_untyped`. A risk ADR-1 foresaw by name had materialized,
and it had gone unreflected in every gate.

## Subject

- Repository: <https://github.com/mizchi/dspec>
- HEAD at survey time: `8136008` (fetched 2026-07-16)
- Scale: 16 commits / 2026-07-13–2026-07-15 / single author (mizchi, some under the
  name Kotaro Chikuba)
- Self-description: "Typed Pkl prototype for a human-level executable specification language"
- Implementation size: `dspec/Schema.pkl` 790 lines (typed authoring surface),
  `src/cli.mjs` 14,281 lines (checking machinery), `src/core/clause-ast.mjs` **91 lines**
  (the entire formal semantics)

**Caution (methodology)**: with a `--depth 1` clone, all commits collapse to look like
the latest date and a single author. The age and author count above are measured after
`--unshallow`. Reading a repository's maturity from a shallow clone produces the same
kind of measurement artifact as ADR-82's group-dominant aggregation.

## Conclusion (stated up front)

A two-tier evaluation:

> **Unsuitable as a substrate for formal description.** The Clause AST is nothing but a
> propositional-logic fragment over uninterpreted atoms, and it lacks the vocabulary that
> Rigor's specification requires — types, inductive definitions, inference rules. Writing
> `T <: U` yields only `atom("subtype", ["T","U"])`, and all the backend can verify is
> tautologies on top of that.
>
> **On the other hand, its "epistemology of support" is worth porting.** dspec's real
> invention is not formal methods but a **discipline that makes you declare, in typed form,
> the distance between a claim (Rule) and its grounds (CheckTarget), and mechanically flags
> broken links (drift) and unverified claims (coverage)**. Rigor has this discipline for
> diagnostics (ADR-65 evidence_tier) and for user code (ADR-63/70 protection coverage), but
> **it does not have it for its own normative specification**.
>
> **And the hole was real (P1, executed in this note).** A probe of `special-types.md`
> revealed that the **`void` clause is wholly unimplemented** — against the behavior a clause
> containing two MUSTs prescribes in the present tense, the implementation collapses void with
> `Bases::Void => :translate_untyped`. **The failure ADR-1 foresaw by name — "the risk that
> `void` gets treated as a broad alias too early" — had materialized exactly as predicted and
> remained.** The reason it appears in no gate is that all of Rigor's gates are FP-oriented
> (they catch things that should not fire), and **an unimplemented diagnostic = silence**. See
> P1 below for details.

## What dspec is

Pkl as the authoring surface (typed document verification), a Node CLI as the checking surface.
The core of the model:

- `Term` (vocabulary, ja/en localized) + `Rule` (kinds: `permission` / `prohibition` /
  `obligation` / `invariant` / `transition`; `when` / `must` / `mustNot` clauses)
  + `Decision` (append-only design history = the ADR equivalent)
- `CheckTarget` / `ImplementationRef` — tie a rule to a test anchor and an implementation
  symbol, and the `drift` command continuously checks resolvability
- **assurance ladder**: `reference` / `executed` / `mutation-tested` / `bounded` / `proved`.
  A stronger claim demands an evidence manifest with a digest (not a total order but a set —
  mutation testing and bounded model checking answer different questions)
- `spec-change compat` — classifies a before/after spec into `compatible` / `breaking` /
  `narrowing` / `widening` / `unknown`
- `spec-reading-eval` — grades "can an LLM read the spec correctly" on a gold set carrying
  correct-answer labels (`entailed` / `contradicted` / `not-supported`)
- Domain packs (`db` / `cloud` / `data` / `release` / `runtime`) + deterministic projections
  to Markdown / QuickCheck / TLA+ / Alloy / Lean

## Evaluation as a formal substrate — why it is unsuitable

### 1. The Clause AST is too impoverished

The full operator set of `src/core/clause-ast.mjs` is only
`atom | eq | neq | not | and | or | implies | exists | forall`.
`atom` is an **uninterpreted predicate over string arguments**, and `eq`/`neq` is symbolic
comparison by `Object.is`. Types, inductive definitions, inference rules, and recursion do
not exist in the expressive vocabulary.

Trying to write Rigor's core specification — the lattice identities of `value-lattice.md`,
`<:` and gradual consistency in `relations-and-certainty.md`, edge-aware narrowing in
`control-flow-analysis.md` — everything collapses into a litany of uninterpreted atoms.
**The meaning of an atom is invisible to the backend**, so all that can be verified is
"propositional-logic entailment among atoms."

### 2. The only semantic verification path is Lean's equality fragment

dspec itself carries a candid applicability matrix,
`ClauseBackendSupport = unmapped | textual | structural | semantic`, and its self-report there is:

- **Lean**: only `eq` / `neq` / `not` / `implies` are semantic. `atom` / `and` / `or` /
  quantifiers are structural
- **TLA+**: textual (strings)
- **Alloy**: unmapped
- The `bounded` / `proved` targets of its own self-model are **zero**

The README's self-description is the most honest:

> "This proves the Clause proposition, not the behavior of application code."

That is, what the generated Lean proves is the Clause proposition over `ClauseEnv`, not the
behavior of the target system. **The latter is exactly what Rigor wants to formalize.**

### 3. Operational cost

The cost of bringing Pkl + Node 24 + pnpm into a Ruby/Nix repository. A three-day-old,
single-author prototype with no compatibility guarantee (the README states pre-release; the
delete command's policy is to reject an alias-less removal as unknown). The domain packs are
entirely DevOps-oriented (cloud / data / release / runtime) and have nothing to do with type
theory.

### 4. The alternatives are stronger

If you truly want to formalize type semantics, using **Lean 4 directly** (lattice identities,
soundness of narrowing) or, for bounded checking, **Alloy directly** is orders of magnitude
stronger in both expressiveness and proving power than going through dspec's Clause AST. In
that case dspec amounts to nothing more than "a registry of pointers to Lean files."

## The discipline worth porting — correspondence table

| dspec | Rigor's existing counterpart | Gap |
| --- | --- | --- |
| Stable Rule ids + `drift` (broken-link check) | RFC 2119 wording of the spec corpus | There is **no** machine-readable link from a normative clause → spec |
| `coverage` (approved rules must be auto-checked) | `spec/docs/` (user docs only), the RuleCatalog completeness spec | There is **no** per-normative-clause coverage |
| assurance ladder (reference / executed / … / proved) | ADR-65 evidence_tier (diagnostics), ADR-63/70 protection coverage (user code) | **Not applied to its own normative spec** |
| `spec-change compat` (breaking/narrowing/widening) | ADR-50 compatibility contract (manual practice), ADR-50 WD7 / ADR-77 WD2 `rigor upgrade` (accepted, deferred) | Machine classification merges into existing deferred work |
| `spec-reading-eval` (grading LLM spec comprehension) | ADR-73/74 skills + llms.txt, [ACP 13-model validation](../20260620-opencode-acp-cross-model-validation/) (evaluation of *behavior*) | There is **no** gold-set evaluation of *comprehension* |
| `Decision` (append-only history) | The ADR corpus + the ADR-49 rubric | Rigor is more mature here |

## Measured Rigor-side gap (2026-07-16)

Scale of the normative corpus (**occurrence count** of the normative keywords
`MUST` / `MUST NOT` / `SHOULD` / `SHOULD NOT` / `MAY` — this includes uses in prose, so it is
an upper bound on the number of independent normative clauses):

| Corpus | Occurrences | Files |
| --- | --- | --- |
| `docs/type-specification/` | 289 | 17 |
| `docs/internal-spec/` | 547 | 17 |

Against this, the reality of machine linkage:

- `spec/docs/` has 3 specs (`handbook_snippets_spec.rb` / `link_integrity_spec.rb` /
  `manual_drift_spec.rb`), and they are **all exclusively for user-facing docs (manual + handbook)**
- From the whole of `spec/`, only **one place** references `type-specification`, and even that
  is an incidental mention inside the integration fixture `demo.rb`
- CLAUDE.md declares "spec binds", but **there exists no gate that fails when the normative
  corpus diverges from the engine**

**Precedent already exists**: `manual_drift_spec.rb` already implements — along four axes (CLI
subcommands / config keys / rule IDs / `documentation_url` anchors) — exactly the same shape as
dspec's drift ("the implementation-side set and the document-side set must agree"). Extending it
to the normative corpus is not a new architecture but **an extension of an existing pattern**.

## Practical proposal

A "complete registry" that assigns an id to all 836 occurrences is **not recommended** — many
prose MUSTs are not atomically testable propositions (they include authoring conventions and
explanatory uses), and assigning ids and standing up a coverage gate would mass-produce
substance-free `reference` links, producing **false assurance**. dspec distinguishes `reference`
from `executed` by type precisely because it knows this failure mode.

Instead, following Rigor's own methodology (ADR-62's adjudicate-don't-assume, ADR-49's
measurement-gated defaults), **before building the machine, we measured whether the hole was
real**. That result (P1) determined the shape of the machine to build far more narrowly than a
general-purpose registry (P1').

### P1 (executed — confirmed the hole is real): a probe of `special-types.md`

Targeting `docs/type-specification/special-types.md` (small, core semantics, high stakes, a
region ADR-75/82/83 touch repeatedly), for each normative clause we probed "is there a spec that
goes red when the engine stops honoring this?" (2026-07-16, a coverage probe rather than a full
adjudication of all 14 clauses).

**Result — the `void` clause is wholly unimplemented. And it is recorded nowhere.**

`special-types.md` § `void` (L66-92) prescribes the following in the present tense:

> `void` is **not** an ordinary value type in Rigor. It is a result marker …
> **Rigor keeps `void` distinct internally so it can diagnose value use**
> - In value context, a `void` result **MUST** produce a primary "use of void value"
>   diagnostic and is materialized as `top` for downstream recovery.
> - When imported RBS places `void` in a generic slot, Rigor **MUST** preserve the slot.
> - `void | bot` normalizes to `void` in result summaries.

Implementation ([`lib/rigor/inference/rbs_type_translator.rb:51`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/rbs_type_translator.rb)):

```ruby
RBS::Types::Bases::Void => :translate_untyped,
```

**`void` is collapsed to `untyped` (= `Dynamic[top]`) at the RBS boundary.** Measured:

| Spec requirement | Implementation |
| --- | --- |
| Keep `void` distinct internally | No `Type::Void` carrier (absent from `lib/rigor/type/`) |
| "use of void value" diagnostic (MUST) | Zero rule ids. Zero string hits in both `lib/` and `spec/` |
| Preserve the generic slot (MUST) | Vanishes on translation |
| `void \| bot` → `void` normalization | The `void` to be normalized does not exist |
| Materialize to `top` in value context | Becomes `Dynamic[top]` (= not checked) |

**Recording status**: there is **no** record of void semantics being deferred in ROADMAP /
CURRENT_WORK / CHANGELOG (all hits are `-> void` in RBS signatures). `special-types.md` itself
also carries **no** deferral marker such as "not yet" / "planned". internal-spec has **no**
specification of a `Void` carrier either.

**And ADR-1 foresaw this failure by name**:

- [ADR-1:30](../../adr/1-types/) — "Special RBS types such as `untyped`, `top`, `bot`,
  and `void` **must be handled with type-theoretic clarity rather than as ad hoc
  aliases**."
- [ADR-1:74](../../adr/1-types/) (risk section) — "**`void` and `untyped` are likely to be
  treated as broad aliases too early.**"

The foreseen risk materialized in exactly that form and remained, unnoticed by anyone.

### What P1 showed — why the existing gates miss it

The reason this divergence survived is structural, and highly instructive:

**All of Rigor's gates are false-positive oriented.** Byte-identical corpus, regression sweep,
`make check` self-diagnosis — all of them catch "**something fires that should not**." An
unimplemented diagnostic is **silence**, so it appears in no gate.

This is the **same class of blind spot ADR-62 (mutation testing = false-negative measurement)
set out to solve, but one layer up.** ADR-62 breaks code to measure the "teeth", but when the
*feature itself does not exist* there is no code to break, so mutation testing does not catch it
either. **"A diagnostic the spec promised has never been implemented" is a complete blind spot in
Rigor's current gate net.**

An n=1 chapter probe produced this. Full adjudication of the other chapters is unexecuted, but
**the existence of the hole is confirmed** (`Dynamic[top]` appears in 46 spec files, `NilClass`
in 15, so the coverage of other clauses looks reasonable — it is not that all clauses are holes,
but that a *silent MUST* is what stings).

### Consequence of P1 (a): resolving the void divergence itself

This is a concrete engineering item that exists now, independent of the porting study. Under
CLAUDE.md's "spec binds", the implementation is non-conformant, so there are two options:

1. **Make the spec match the implementation** — accept `void` as an alias of `untyped` and
   shrink § void. This runs directly counter to ADR-1:30's "do not make it an ad hoc alias", so
   its retraction must be explicitly recorded in an ADR
2. **Make the implementation match the spec** — a `Type::Void` carrier + value-context diagnostic
   + slot preservation. A new diagnostic rule = adding a required discipline to ADR-50 WD1 = **BC**,
   so it goes through the bleeding-edge overlay (off by default). The FP surface is narrow (using
   the return value of `puts` is clearly suspicious), but there is a vast amount of RBS returning
   `-> void`, so it needs a corpus measurement

**Either is fine, but the status quo (a spec that lies in the present tense) is not an option.**
The decision needs a corpus measurement (the actual frequency with which the return value of a
`-> void` method is used in value context), so filing an ADR is appropriate.

### Consequence of P1 (b): the "promised diagnostic" gate — the narrow machine the measurement showed

P1 made a general-purpose registry (ids on 836 clauses) **unnecessary**. What stung was one
specific class — **"the spec promises a diagnostic, yet that rule id does not exist."** This is:

- **Machine-checkable** — where a normative clause promises a diagnostic, make it name a rule id,
  and check that it exists in `CheckRules::ALL_RULES`
- **An extension of an existing pattern** — axis 3 of `manual_drift_spec.rb` already implements
  "every ID in `ALL_RULES` appears in the catalogue." We only add the **reverse direction** (an
  id the spec promised exists in the implementation)
- **Does not produce false assurance** — not a mass of `reference` links, but the binary
  "promise vs. reality." In terms of dspec's `assurances` ladder this is the bottom rung, but
  **void was falling at that very bottom rung**
- **Hits Rigor's blind spot precisely** — the FP-oriented gate net + ADR-62 mutation testing are
  both structurally unable to see "a diagnostic that was never implemented"; this is the only
  shape that catches it

The scale is small too: the normative clauses that promise a diagnostic are a tiny fraction of
the 836 occurrences.

### (b) executed — result of the full-chapter inventory (2026-07-16)

From all 17 chapters of `docs/type-specification/` we extracted the "normative clauses that
promise a diagnostic" (53 clauses) and cross-checked them against the implementation vocabulary.
**The full diagnostic vocabulary is 39 ids** — the 26 in `CheckRules::ALL_RULES` plus the 13 in
non-check families (`dynamic.*` / `pre-eval.*` / `rbs.coverage.*` / `rbs_extended.*`).
`ALL_RULES` is not the whole (by design, `known_suppression_token?` accepts non-check ids at the
family level), so the inventory must be done against the entire vocabulary.

**Implementation status of the 12 families that `diagnostic-policy.md` § Identifier taxonomy declares**:

| Declared family | lib implementation | Spec's status wording |
| --- | --- | --- |
| `call.*` / `def.*` / `flow.*` / `dynamic.*` / `rbs_extended.*` / `rbs.coverage.*` | present | — |
| `plugin.<id>.*` | dynamic (plugins) | — |
| **`static.*`** | **0** | **no deferral marker** (present tense) |
| **`compat.*`** | **0** | **no deferral marker** (present tense) |
| **`hint.*`** | **0** | **no deferral marker** (present tense) |
| **`generated.<provider>.*`** | **0** | **no deferral marker** (present tense) |
| `sig.*` | 7 (JSON output only) | ✅ **honestly stated** — "The slice-1 MVP surfaces these identifiers through the command's JSON output rather than the diagnostic stream" |

**4 of the 12 families have zero implementation, and no deferral marker.** `static.*` in
particular has a broad reach — `diagnostic-policy.md:5` "The cutoff identifiers used by inference
budgets live in the `static.*` family", `:10` "Calling a method on `top` without proof is a
diagnostic", `:21` "Rigor **MUST** report the cutoff", `special-types.md:11` "Diagnostics for
unguarded calls on `top` belong to the `static.*` family" — all in the present tense.

### Adjudication — separate "unrecorded drift" from "known deferral"

Not everything is equally guilty. Classifying per ADR-62's adjudicate-don't-assume:

**✅ Honest wording (exemplary — the spec already knows the correct way to write it)**

- `inference-budgets.md:75` — "The budget table above is **normative-for-v1 intent. As of this
  writing the configurable `budgets:` surface is not yet wired** — no `budgets:` key is parsed and
  the table's rows are not enforced." Indeed there is no `budgets` key in `configuration.rb`.
  **Line 75 explicitly reserves the MUST on line 54.** [ADR-41](../../adr/41-inference-budget-design/)
  (Proposed) records the same fact
- `diagnostic-policy.md:43` — states that `sig.*` is JSON-only

**❌ Unrecorded (real harm)**

- **`void` diagnostic** — 0 implementation, no deferral marker in the spec, no record in ADR /
  ROADMAP / CHANGELOG either (§ P1)
- **the `top` half of `static.*`** — the budget half is honestly reserved as above, but the half
  "an unguarded call on `top` is a diagnostic" is reserved nowhere
- **`compat.*` / `hint.*` / `generated.*`** — **founding-era declarations from ADR-1 / ADR-2 left
  in the present tense** (`hint.role-generalization.*` is defined by [ADR-1:366](../../adr/1-types/)
  with a config switch `style.suggest_role_generalization`, but that config key also does not exist
  in `configuration.rb`). No deferral record

In short, `docs/type-specification/diagnostic-policy.md` § Identifier taxonomy is in a state where
**part of it presents a "design-time wishlist" as a normative classification table**.

### Why the existing gates structurally cannot see it (the gate's shape is settled)

Rereading the four axes of `manual_drift_spec.rb`, **all of them are impl → doc direction**:

- Axis 2: "every top-level key in `Configuration::DEFAULTS` **must be mentioned in** the
  configuration reference"
- Axis 3: "every ID in `CheckRules::ALL_RULES` **must appear in** the diagnostic catalogue"

**The reverse direction (doc → impl) is not checked at all.** So "the spec declared it but the
implementation does not exist" passes through in all five cases. This is the exact document-side
counterpart of P1's FP-oriented gate argument (silence does not show).

**Therefore the gate's shape is settled** (and smaller than originally sketched):

> Each family that `diagnostic-policy.md` declares must either **have one or more implementation
> ids, or carry an explicit deferral marker.**

- Assigning ids to 836 clauses is **unnecessary** — the check target is the 12 rows of the
  classification table
- **Not "implement it" but "declare it, or state the deferral explicitly"** — `sig.*` and
  `budgets:` already demonstrate the correct way to write it, so the norm is established; only
  the enforcement is missing
- Just add one more axis to `manual_drift_spec.rb` (the reverse of an existing pattern)
- Does not produce false assurance — not a mass of `reference` links, but the binary "declaration
  vs. reality"

### P2 (independent, has novelty): a spec-reading eval against our own documentation

dspec's `spec-reading-eval` hits a Rigor weakness precisely. Rigor ships skills for AI consumers
(ADR-73) + `rigor docs` / llms.txt (ADR-74), but **there is no evaluation of whether agents read
it correctly**. The [ACP 13-model validation](../20260620-opencode-acp-cross-model-validation/)
measured *behavior* (can it run `rigor-next-steps` to completion), but *comprehension* (what is
entailed by the spec) is unmeasured.

`waza` is already in the Flake and usable for skill evaluation. Building a gold set
(entailed / contradicted / not-supported) for one chapter of the handbook / type-spec can be
started immediately with no machinery. Independent of P1.

### P3 (pointer only, no new work needed)

Machine classification of `spec-change compat` merges, for Rigor, into **ADR-50 WD7 / ADR-77 WD2's
`rigor upgrade` (accepted, deferred pending concrete BC targets)**. In the form of before/after
classification of the frozen surface (rule IDs / CLI vocabulary / JSON keys), it becomes a design
input when that ADR is implemented. The diagnostic output itself is non-contractual under ADR-50
WD1, so it is out of scope.

## Evaluation of the plan to use Lean 4 / Alloy directly as a test oracle

Since the reason for rejecting dspec was "if you're going to formalize, use Lean/Alloy directly",
we evaluated that plan itself (the same day, self-contained within this note). **Conclusion:
building it as a CI oracle now is deferred. But Alloy is usable as a design-time tool starting
today.**

**Corpus precedent is zero** — across all of `docs/adr/` and `docs/notes/`, this note is the first
to mention Lean / Alloy / Coq / TLA+. Truly unevaluated.

### Rejection reason 1: the layer that can be formalized is not the layer where bugs are

Formalization is realistic only for **type algebra** (lattice identities, `Dynamic[T]` algebra,
`<:`, normalization). Formalizing narrowing / dispatch / the evaluator would demand formalizing
Ruby semantics (blocks, metaprogramming, RBS overload resolution, `coerce`), which is unrealistic.

So where do real bugs appear — a stratification of the corpus's soundness bugs:

| Bug | Layer |
| --- | --- |
| ADR-56: block-exit scope discard → `1.upto(6){ result *= i }` becomes `Constant[1]` (720 at runtime) | evaluator scope wiring |
| ADR-78: constant folding of `public_send(method_name)` → 12 FP | the dispatcher's fold gate |
| ADR-57: the tail-only body evaluator drops explicit / block-internal returns | evaluator |
| ADR-91 / #110: ownership of Kernel fold | the dispatcher's gate |
| ADR-64: the coerce barrier | Ruby's dispatch semantics |
| the value-position edge-narrowing bug of `\|\|` / `&&` | narrowing wiring |

**Not one is a type-algebra bug.** Conversely, the corpus's only pure algebra question (ADR-83
Dynamic-facet algebra) was decided as "implemented but zero user-visible value", and that judgment
was an **economic question** (does precision improve) rather than a formal one (is it consistent) —
a question Lean cannot answer. What paces Rigor's decision-making is not soundness but **the
economics of FP and precision**.

### Rejection reason 2 (decisive): a model without a conformance link is `void` from this very note

For a formal model to become an oracle, it needs a correspondence link to the implementation. The
options are: (1) extract the implementation from the model (impossible for the existing Ruby
engine), (2) make the model executable and differential-test (maintaining a second implementation
in a language no one writes), (3) nothing (= documentation with proofs). In reality, (3).

**The consequence of (3) is already demonstrated by this note's P1**: even if Lean proves void
semantics perfectly, that proof merely sleeps next to `Bases::Void => :translate_untyped`. This is
the same structure as the reason for rejecting dspec ("This proves the Clause proposition, not the
behavior of application code") but **falling one layer up**, and it is worse — a proof adds a
psychological assurance of "verified" while the code guards nothing.

### The lower two rungs are empty (ADR-86's ladder shape)

- **Rung 0 (entirely empty): property-based testing of the type algebra.** There is zero `rantly`
  / `propcheck`-class dependency in the Gemfile. `spec/rigor/type/combinator_spec.rb` has 132
  examples but they are all example-based — e.g. it confirms `Dynamic[Dynamic[T]] → Dynamic[T]`
  (the idempotence law) at **a single point** only. Lifting it to ∀ has zero translation gap
  (the oracle = the implementation itself), stays within existing rspec, and has no maintenance
  duplication. There is also a prospect of not whiffing — **ADR-1:29 explicitly states the ∀
  proposition "Erasure must never produce a narrower type than Rigor proved"**, and this
  erasure / rendering family has shipped real bugs (the record-key RBS crash of sig-gen; #51 where
  `&block` emitted `(**untyped, ?{ (?) -> void })` that corrupted the env).
- **Rung 1 (existing, with a track record): rigor-rs differential.**
  [ADR-91:80](../../adr/91-kernel-intrinsic-fold-ownership-gate/) — **rigor-rs's differential
  harness actually found item 1 (Kernel fold polarity)**. ADR-91's remedy is "convert the external
  detector into an in-repo invariant gate" (noted as ADR-62 kinship), and `rely-on-rigor-rs-differential`
  itself is deferred as "external, coupled to the port schedule, not a CI gate" as complement,
  demand-gated. **There is already a running oracle that has caught a real bug.** There is no
  translation gap either (both implement the same spec). A Lean model would be building a weaker
  oracle at higher cost.

### Where we do reach out even so

- **Alloy = a design-time thinking tool (usable today).** Inside an ADR proposing a new algebraic
  operation, it returns a counterexample to "is this normalization confluent?" in minutes. It is
  disposable, so no conformance link and zero maintenance. Not a CI gate.
- **Lean 4 = when rigor-rs parity becomes a first-class program.** In the structure where two
  implementations implement one spec, a mechanized spec becomes an asset as a **shared referee**
  (the position of WebAssembly's mechanized spec). `value-lattice.md` + `relations-and-certainty.md`
  + `normalization.md` can be formalized in the small. But for now the differential harness is
  cheaper and already running.

### Recommended order

Rung 0 (type-algebra PBT) → in-repo gating of the rigor-rs differential that ADR-91 deferred →
if a ∀ that still isn't covered emerges, then Lean. If it is to be recorded, use **the same shape
as ADR-86** (standing rejection + a non-formal-methods-first ladder + a re-evaluation trigger).

### Rung 0 executed — result of the PBT spike (2026-07-16)

Done with a hand-written generator with no gem dependency (following the precedent where ADR-62
WD1 rejected `mbj/mutant` and built its own harness; a spike stage where the gem / commit decision
waits until a hit appears). `seed=20260716` / 2,000 cases. All the laws are sourced from normative text.

**Validating the generator's soundness first** (before trusting green): 13 carriers are generated
(Dynamic 15.3% / Difference 12.0% / Bot 8.8% / Top 8.4% / IntegerRange 8.4% / Tuple 8.0% /
Singleton 7.8% / Constant 7.8% / HashShape 7.7% / Nominal 7.6% / Union 3.5% / Intersection 3.0% /
Refined 1.9%), **0 swallowed rescues at generation time**, and it generates nested real types
(`[{ k0: singleton(Object), … }, untyped]`, etc.). **Not a whiff.**

| Law | Source | Result |
| --- | --- | --- |
| L1 `erase_to_rbs` yields valid RBS | internal-type-api:140 | **PASS** |
| L2 `normalize` idempotent | internal-type-api:141 | **not executed** (below) |
| L3 `eql?` ⟹ hash match | internal-type-api:28 | PASS |
| L4 `union(T,bot)==T` / idempotent / commutative | value-lattice | **PASS** |
| L5 `dynamic(top)` is canonical untyped | internal-type-api:118 | PASS |

**Result 1: the type algebra that exists is solid.** This became **independent corroboration** of
Lean/Alloy rejection reason 1 — the formalizable layer, hit with 2,000 cases, zero counterexamples.
The question formal methods answer already has an answer in Rigor.

**Result 2 (the main find): the PBT's harvest was not a law violation but contract archaeology.**
L2 was **silently skipped** by a `respond_to?(:normalize)` guard. Tracing the reason —

### The third isomorphic case: the type-object contract of `internal-type-api.md`

`docs/internal-spec/internal-type-api.md` is classified as **normative** by CLAUDE.md and
prescribes itself in the present tense as "the public contract that every Rigor type object
**MUST satisfy**." Implementation status (out of 23 carriers):

| Contract method | Carriers implemented | Note |
| --- | --- | --- |
| `describe` | 19 | ✅ |
| `erase_to_rbs` | 19 | ✅ |
| `accepts` | 2 | via `acceptance_router` |
| **`normalize`** | **0** | MUST-tagged (idempotent, returns `self`, routes to `normalization.md`). **No Type across all of lib has a `def normalize`** |
| **`traverse`** | **0** | Not even a near name exists across all of lib |
| **`consistent_with`** | **0** | **Zero** methods containing `consistent` across all of lib |
| **`equal_value`** | **0** | Same as above |
| **`has_method`** | **0** | Only engine-internal helpers such as `arg_class_has_method?` |
| **`subtype_of`** | **0** | The capability exists engine-internally as `subtype_verdict` / `rbs_subtype?` etc., but **it is absent as the carrier method surface the contract prescribes** |

The core carrier `Rigor::Type::Nominal` exposes only 4 — `initialize` / `describe` /
`erase_to_rbs` / `inspect`.

**Adjudication (this is not a naming problem)**: line 22 of the same document explicitly excludes
method names ("do not bind, since ADR-3 OQ2 is unresolved"), and line 21 does not bind the concrete
class set either. But `consistent` / `traverse` / `equal_value` **do not exist even as a near name
across all of lib**, so it is not a spelling problem but an **absence of capability**. The naming
carve-out exempts spelling; it does not exempt relocating an entire method surface into
engine-internal helpers.

## A/B measurement of the void three-way choice (2026-07-16, a carry-over from ADR-92 WD2)

Of the three-way choice that ADR-92 WD2 gated on measurement, we A/B'd **option (b) (`void → top`,
narrowed at RBS)**. Changed to `Bases::Void => :translate_top` and diffed the corpus diagnostics.

| corpus | baseline | `void → top` | verdict |
| --- | --- | --- | --- |
| mail `lib` | 26 | 26 | IDENTICAL |
| kramdown `lib` | 68 | 68 | IDENTICAL |
| haml `lib` | 60 | 60 | IDENTICAL |
| liquid `lib` | 5 | 5 | IDENTICAL |
| mastodon `app/models` | 0 | 0 | IDENTICAL (248 files / 1350 RBS classes) |

**Whiff check** (before trusting green): instrumented the translator to count translations of
`Bases::Void` — mail **2 times** / kramdown **29 times**. The 29 sites in kramdown actually changed
from `Dynamic[top]` → `top`, and yet the diagnostics are unchanged. **The measurement is not a whiff.**

**Conclusion: (b) is diagnostically free.** But the reason matters — **the mechanism that
distinguishes `top` from `Dynamic[top]` (`static.*` = "an unguarded `top` call is a diagnostic") is
itself unimplemented**, so both are silent on a method call. That is, the value of (b) is not that it
"works now" but that it **removes the unlicensed divergence from RBS and lays the foundation on which
`static.*` will work correctly once it lands.** Prepaying the correctness of representation.

**The relationship between (a) and (b) — not a simple ordering.** The spec explicitly states the
reason to *distinguish* void from `top`:

> Rigor's contribution on top of the RBS rule is to record that the value reached the
> position by recovery from `void` and to surface that as a primary diagnostic, so the
> analyzer can explain *why* a `top` appeared

That is, implementing (b) naively **loses void's provenance**, and this "explain why it became `top`"
capability disappears. But **the design pattern that avoids the ADR-75 type is directly usable here** —
provenance is "metadata about the value, not part of the value itself." If you place an
identity-keyed side-table like `dynamic_origins` (`void_origins`), then **`void → top` + a provenance
side-table = realizing the intent of (a) on top of the foundation of (b).** There is no need to add a
carrier and branch the lattice (the same reason ADR-75 WD1 rejected adding a `provenance:` field to
the `Dynamic` carrier — it breaks value-equality).

**Recommendation**: land (b) first (free, fidelity restored, the foundation for (a)) → design (a)
together with `static.*` + the `void_origins` side-table. But (a) is a newly required discipline =
BC under ADR-50 WD1, so it goes via `bleeding_edge:`. **(c) (endorsing the implementation) is made
unnecessary by the measurement** — since (b) is free, there is no reason to abandon both RBS and
ADR-1:30.

## Verifying void semantics — from a user report (2026-07-16)

Reported expected behavior:

```ruby
def foo #: void
  p 1
end
def bar = foo
a = bar   # "a: 1 is what happens. I'd like it widened to void ≒ top."
```

**Measured (rbs-inline plugin + `# rbs_inline: enabled`)**:

| Form | `dump_type` |
| --- | --- |
| top-level `def foo #: void` → `a = bar` | **`1`** (as reported) |
| in-class `def cv #: void` | `Dynamic[top]` (before landing) |
| in-class `def cbar; cv; end` (**no annotation**) | `Dynamic[top]` ← **void-ness had propagated** |

**The cause is not void but the top level.** Inspecting the synthesizer's output directly:

```ruby
class C
  def cv: () -> void
end
```

**Not a single line is generated for a top-level `def`** (upstream rbs-inline only emits `class`/`module`
declarations). The end-of-line `#: void` syntax itself is correctly converted to `() -> void`. It is
not void-specific; `#: () -> String` is ignored just the same.

**Two methodological pitfalls** (both nearly caused a false report):
1. the magic comment `# rbs_inline: enabled` is required (ADR-32 WD2). Without it the plugin
   **contributes nothing**. The first test nearly concluded "annotations have no effect" over this
2. `#: void` belongs at the end of the def line. upstream rbs-inline itself writes
   `def self.write(...) #: void`

**An accepted signature is trusted at the boundary** (as in `relations-and-certainty.md:48`) — in a
control experiment, attaching `#: () -> String` to a `p 1` body makes the type `String` and produces
`return-type mismatch: declared String, inferred 1`. The declaration beats inference.

### The report strengthened the case for (b)

The reporter's request was to widen `void` ≒ `top` and **not guarantee backward compatibility**. This
is a stronger case for (b) than the fidelity argument — **`Dynamic[top]` betrays the purpose**:

- `Dynamic[top]` = gradual's escape hatch. Consistent with anything. `a = bar; a.length` passes silently
  → **the caller can silently depend on it** (= the one thing `void` wanted to prevent)
- `top` = demands proof before use → faithful to the declared contract

**Landed (b)** (`Bases::Void => :translate_top`).

### The rest decomposes into two parts

The reporter's second request "warn on assignment / argument" = the unimplemented MUST of spec § void
= ADR-92 option (a). The "a rule level separate from the type" idea the reporter themselves raised holds
for **direct use without a carrier**, but **the reported example is a transitive case** (`a = bar`, `bar`
is unannotated), so void is not visible from reading the RBS at the call point alone. What is needed is:

1. **Implementing `static.*`** — one of the 4 families we tagged Reserved today. **This is the very
   reason (b) was free**: without `static.*`, `top` and `Dynamic[top]` are equally silent. Only when this
   is in does `top` bite. **The missing connective**
2. **The `void_origins` side-table** — the ADR-75 pattern (provenance is metadata about the value, not
   part of the value) + ADR-82 WD6's chain-origin propagation. Solves the transitive case with no carrier,
   no lattice branching

All three parts ((b) / `static.*` / `void_origins`) are places this note's survey touched. **The two
ideals reported nearly coincide with the intent the spec originally wrote, and are explained down to the
missing connective `static.*`.**

## The fourth case — rbs-inline ingestion: spec vs. ADR-32 head-on collision (adjudicated 2026-07-16)

Prompted by the user suggestion "why not make rbs-inline a default load?", we adjudicated whether the
MUST of `overview.md:68` and ADR-32's plugin approach are consistent. **Result: they are not. And it is
sharper than cases 1–3 (unimplemented-by-silence) — an accepted, implemented ADR collides head-on with
a binding spec.**

`overview.md` § "Compatibility hierarchy" (**2026-04-28**, `4e49c10b`):

> Rigor … **MUST NOT require `# rbs_inline: enabled` to begin parsing them**. Only the
> rbs-inline configuration directives such as `# rbs_inline: enabled` and
> `# rbs_inline: disabled` are interpreted; the rbs-inline annotation comments themselves
> (for example `#: String`, `# @rbs`, parameter annotations) are **always parsed and used
> whenever present**.

ADR-32 (**2026-05-25**, accepted, implemented in v0.1.10):

> WD2 — The plugin synthesises RBS **only** for files whose first non-blank lines include
> `# rbs_inline: enabled`. … Rejected: **Always-on once the plugin is loaded**

The timeline is decisive: **the spec is one month earlier.** ADR-32, without recognizing the spec's
existence (its References are ADR-0/2/5/6/15/25/27/29 — **it never cites overview.md**), adopted in WD2
exactly the form the spec wrote as MUST NOT, and placed the form the spec requires in "Rejected
alternative." The 2026-05-29 docs-alignment pass also passed this clause by.

**Under CLAUDE.md's rule the adjudication is automatic**: "When an ADR and the spec disagree on
analyzer behaviour, the spec binds." → **the shipped behavior is non-conformant.** On two axes:

1. **Startup model** — the spec makes annotations "official type sources … always parsed whenever
   present." Bare Rigor (plugin unconfigured) parses nothing at all
2. **magic comment** — the spec says "MUST NOT require." The plugin default is `require_magic_comment: true`

**The conformant form already exists**: WD10's `require_magic_comment: false` is exactly the spec's
semantics. Verifying upstream `parser.rb:73` — `# rbs_inline: disabled` is honored unconditionally
**before** the `opt_in` decision (`return if with_disable_magic_comment`), so per-file opt-out stays alive
on the `false` side too. **Conformance is not an engineering problem but a wiring-and-defaults problem.**

### The answer to the user suggestion flipped

Initially I opposed defaulting it as "contrary to the auto-load deferral of ADR-27/31." As a result of
the adjudication, **the binding spec demands something stronger than the user suggestion** (the suggestion =
default load + opt-out possible; the spec = always parse without a magic comment, interpret only `disabled`).
The opposition was overturned by primary sources on the question of the startup model. The concerns of ADR-0
(zero-dep) / ADR-27/31 (code execution) / standalone install (gem absent) constrain the **mechanism**; they
do not erase the **obligation**.

Mechanism options and residuals (organized in ADR-93):
- core reimplementation — ADR-32 WD1's rejection reason (grammar drift) still stands. Since the obligation
  is behavior, not implementation method, the rejection can be maintained
- **presence-gated default wiring** (the ADR-72 pattern) — if the rbs-inline library is resolvable (a Rigor
  environment or ADR-90's bundle-fallback), auto-enable the bundled plugin + `require_magic_comment: false`.
  If unresolvable, a hint
- residual (standalone, gem absent) — "always parsed" cannot be fully satisfied without a core dependency.
  The true tension with ADR-0 narrows to **this alone**

## First measurement of ADR-93 WD4 (2026-07-16, herb + mail)

The natural experiment = **herb** (marcoroth's HTML+ERB toolchain): genuine rbs-inline annotations in
~25 files, magic comments in only 2 files, **and hand-written `sig/` covering the same code.**

**Finding 1 (blocker, fixed same day)**: enabling the plugin caused a **total env collapse** (1,490 classes →
0, even `require` becomes unresolved, 74 spurious `call.unresolved-toplevel`). The mechanism —
`RBS::Environment#add_source` appends to `sources` **first** and then inserts decls, so a virtual constant
colliding with `sig/` raises mid-insertion → the per-entry rescue skips it but **a poisoned source remains**,
and `resolve_type_names`, which rebuilds from `sources`, re-erupts outside all rescues. The overlap of sig/
and inline is the *expected state* of a migrating project, and **it is a real bug that every opt-in user today
hits** (independent of ADR-93). The fix = making the skip transactional + a resolve-time backstop for the
rbs `>= 3.0, < 5.0` band + explicit `.rbs` wins + a cache-hit-safe `virtual_rbs_collision_quarantined` + a
one-time naming warning.

**Methodological lessons (2, my own errors)**: ① I first read "RBS defers duplicate detection to resolve"
but that is wrong — the true mechanism is "eager insertion + re-eruption of a dirty partial add." I should
have read into the internals of add_source instead of stopping the backtrace at resolve_type_names:533.
② My first fix (a retry loop) had `unload` re-raise **inside the rescue handler**, not caught by my own
rescue, and it failed silently on herb. Re-verifying the minimal reproduction's green on herb saved me.

**Finding 2 (post-fix A/B/C, herb lib)**:

| Mode | Diagnostics | Diff |
| --- | --- | --- |
| A: no plugin | 11 | — |
| B: opt-in + magic respected (current ADR-32) | 11 | ±0 (both magic-comment files collide with sig/ → quarantined, sig wins) |
| C: `--treat-all-as-inline-rbs` (ADR-93 target form) | 12 | **−3 genuine wins** + 4 FP |

The +4 is `call.possible-nil-receiver` × `Regexp.last_match(1)` (after `=~` succeeds, the group necessarily
participates via `/\n([ \t]+)\z/` → nil impossible at runtime). **It was not caused by annotations; it exposed
an existing engine imprecision that sig/'s `-> untyped` was hiding.** Routed to a future narrowing fact —
non-nil-ing `last_match(n)` on the match-success edge.

**Finding 3 (a refutation that reshaped WD1/WD2)**: with zero-annotation mail, `--treat-all-as-inline-rbs`
went 26 → 42. The cause — upstream rbs-inline's opt-out mode **synthesizes a `-> untyped` skeleton for every
unannotated def**, and an accepted signature beats body inference, so it **collides head-on with inference-first**
(inference is more precise than `untyped`). What the spec binds is "honor annotations if present", not
"manufacture untyped shadows of unannotated code." So the conformant form of ADR-93 is an **annotation-presence
gate** (a cheap scan of file contents; the magic comment stays unnecessary = MUST NOT is honored), not all files
unconditionally.

## Implementing ADR-93 WD1 — the measurement reshaped the design twice (2026-07-16)

Following the WD4 measurement, implemented WD1 (magic-comment-free mode). **The measurement refuted my design
twice.**

**First refutation (previous section's Finding 3)**: "set `require_magic_comment: false`" = upstream's opt-out
mode = **synthesize an untyped skeleton for every unannotated def**. mail 26→42. → Changed the plan to a gate
that "contributes only when the file has annotations."

**A point where even that plan proved insufficient, found in intermediate verification**: measuring a mixed file —

```
class Mixed
  def annotated: (String) -> Integer        # annotated: genuine
  def unannotated: (untyped x) -> untyped   # unannotated: skeleton
```

Even with a file-level gate, **the other methods of a file with one annotation are contaminated with untyped.**
A member-level filter is coupling to the upstream AST (the line ADR-32 WD1/WD3 rejected for grammar-drift reasons),
so it is not adopted for v1, and "an annotated file is upstream-conformant (the same thing `rbs-inline --output`
generates)" is accepted. **Recorded as a residual.**

**Second refutation — `#:nodoc:`**: even after implementing the gate, mail did not return to 26 but **31**. The
cause is `class AddressList #:nodoc:` — the RDoc directive lexically collides with `#: <type>`, and **upstream
parses it as a TypeAssertion of the type alias `nodoc`** (consuming `nodoc` and discarding the trailing colon).
**61 files** of mail passed the gate on this alone. One of the most universal comments in Ruby.

- it is an upstream bug worth reporting, but **the output is harmless** (it just comes back as a `# :nodoc:`
  comment; no spurious type appears) → the filter suffices at the gate layer only
- detection is delegated to upstream's own `AnnotationParser` (an implementation that regex-searches for `#:`
  would misdetect a plain doc comment containing `http://example.com#:`, and the grammar is upstream's = ADR-32 WD3)

**Final measurement**:

| corpus | base | after gate | |
| --- | --- | --- | --- |
| mail (zero annotations) | 26 | **26** | repaired in stages 42 → 31 → 26 |
| kramdown / haml / liquid | 68 / 60 / 5 | same | no-op ✓ |
| herb (real annotations) | 11 | 12 | **−3 genuine wins** / +4 |

**Lesson**: "delegate to upstream and the grammar is upstream's" (ADR-32 WD3) is correct, but **upstream's
*purpose* differs from Rigor's** — `rbs-inline --output` is a tool that *generates* sig/, so emitting a skeleton
for an unannotated def is correct for it. Rigor is *inference*-first, so the same output is harmful. The boundary
of delegation is "the grammar", not "what counts as a contribution."

**Remaining (ADR-93 WD1a)**: herb's +4 (the possibly-nil judgment of `Regexp.last_match(1)`) is an artifact on the
ADR-57 protocol, so **a root fix is needed before flipping the default.** It is a precondition, not a side quest.

## Synthesis — the common pattern discovered

This note's survey discovered the same bug class **four times independently** (#4 is a sharper variant —
contradiction rather than silence):

| # | Location | Content | Record |
| --- | --- | --- | --- |
| 1 | `special-types.md` § void | a clause containing 2 MUSTs is wholly unimplemented (`Bases::Void => :translate_untyped`) | **none** |
| 2 | `diagnostic-policy.md` § taxonomy | 4 of the 12 declared families (`static.*` / `compat.*` / `hint.*` / `generated.*`) have zero implementation | **none** |
| 3 | `internal-type-api.md` § method surface | the contract methods `normalize` / `traverse` / `consistent_with` / `equal_value` / `has_method` / `subtype_of` are absent from carriers | **none** |
| 4 | `overview.md:68` vs ADR-32 | against the binding spec "always parsed / MUST NOT require magic comment", an accepted ADR implements an opt-in plugin + magic-comment gate (the spec is a month earlier, the ADR does not cite the spec) | **none** (zero cross-reference) |

**The common diagnosis**: Rigor's normative corpus has a **founding-era stratum** (the ADR-1 / ADR-2 / ADR-3
period), and what was written there as *design goals* remains presented in the present tense as *binding
contracts*, never once cross-checked against the shipped artifact.

**And the correct way to write it already exists in the corpus in two examples** — both later additions:

- `inference-budgets.md:75` — "**As of this writing the configurable `budgets:` surface is not yet wired**"
- `diagnostic-policy.md:43` — states `sig.*` is JSON-only

**The norm is established. Only the enforcement is missing.** This determines the reach of the "declare it, or
state the deferral" gate (§ (b)) — the target is not the single void clause but the entire founding-era stratum.

## Rejections

- **Adopting dspec itself** — unsuitability as a formal substrate (1–4 above) + the cost of introducing
  Pkl/Node + three days old, single author, no compatibility guarantee
- **Lean 4 / Alloy as a CI test oracle (at this time)** — the formalizable layer has no bugs, and a model
  without a conformance link re-enacts the `void` failure. Rung 0 / rung 1 are open
- **Assigning ids to all normative clauses + a coverage gate** — mass-produces false assurance. Only after
  P1's measurement showed the hole
- **Lean/Alloy projection via dspec** — writing directly is orders of magnitude stronger

## Re-evaluation triggers

- **(Formal methods)** if rigor-rs parity becomes a first-class program — a mechanized spec becomes an asset
  as the shared referee of two implementations. But first, the in-repo gating of the differential that ADR-91
  deferred comes first
- **(Formal methods)** if a ∀ proposition that rung-0 PBT cannot span produces real harm
- if dspec's Clause AST acquires types / inductive definitions / inference rules (currently 91 lines, a
  propositional-logic fragment — a major design change is required)
- if spec-parity verification against rigor-rs demands a "table-driven normative-clause registry" (ADR-91's
  spelling-parity spec is already a seed of that shape. Cross-implementation parity may become the strongest
  justification for a registry)
- if dspec acquires multiple authors and a compatibility guarantee, and gains a Ruby-side authoring surface
