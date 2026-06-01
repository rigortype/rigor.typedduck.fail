---
title: "\"Type System Poem\" (myuon) — Rigor perspective review"
description: "English translation of a Rigor-perspective review of myuon's essay \"Type System Poem.\""
sourceSha: "b12a01bb6b29e68b36c27c28ef54b7670a0c5509d6d417b4a258e496af3e585b"
sourceCommit: "9f5010ab7b1916b07154e383346d8cd64ba34370"
translationStatus: "translated"
---

Date: 2026-06-01.
Status: research note, no design commitments.
Kind: Rigor-perspective review of an external essay.
Trilogy (external essays × retrofitting types onto existing languages):
- This note (myuon, "Type System Poem")
- [20260601-revenge-of-the-types-runtime-checker-survey.md](../20260601-revenge-of-the-types-runtime-checker-survey/) (Armin Ronacher, "Revenge of the Types")
- [20260601-gradual-typing-era-mizchi-rigor-ts-review.md](../20260601-gradual-typing-era-mizchi-rigor-ts-review/) (mizchi, "What the Era of Gradual Typing Languages Needs")

## Essay under review

- myuon, "Type System Poem"
- Source URL: <https://myuon.github.io/posts/type-system-poem/>

A type-theory-leaning author's rebuttal to the (mostly unfounded) public
discourse about type systems, plus musings on where type systems stand today
and where they are heading. It is not a paper but an opinion piece — not a
normative argument — yet it carries a strong practical sense of "how a type
checker ought to behave," so it is worth holding up against Rigor's design
constitution.

## 1. The essay's main points (summary)

- **Type systems are a matter of degree.** Stronger types are not justice;
  this is a domain where you look for the right landing point. Running through
  it is a meta-claim: stop the groundless criticism of computer science.
- **The success of landing points that preserve decidable type inference**
  (OCaml etc.). On the other side, **the cost of strong type systems** — being
  forced to write absurdly long types / longer compile times / burning out on
  type-level programming / the enormous cost of turning runtime errors into
  compile errors.
- **The real world is loosely typed, and all the strain piles up near the
  boundaries** (the fate of static analysis; pronounced in Haskell/Scala/Rust).
- Rebuttals to common misconceptions:
  - "Typed languages force you to write types" is (in general) false. Type
    inference exists. Java forces declarations by language design, not by a
    theoretical limit.
  - "You can derive the implementation from the type" — of course you can't
    (how many `Int → Int` functions do you think there are?). It only applies
    in the special situations where parametricity bites.
  - "The IDE tells me, so I don't need types" → what that IDE is doing *is*
    essentially static analysis.
  - "Once inference advances in the future, you won't need to write types" →
    strong type systems like System F have been shown to have undecidable
    inference. No amount of theoretical progress fixes that. (Note that "type
    systems where you don't have to write types" already exist.)
  - "Dependent types are good" → a hair's breadth from theorem proving,
    genuinely hellish, not recommended.
- **Adding types to dynamically typed languages**: properly typing an existing
  LL language is quite hard. **Rather than putting types into an existing
  language, it is faster to build a language with similar syntax that types
  properly and drive out the old one** (the author's bet).
- **Going forward**: the phase of making type systems stronger and merging them
  is winding down; the author expects more "one-trick type system" languages
  matched to specific situations. Rust's region inference led the way. Effect
  systems and the like face the "decidability wall" and integration with
  real-world APIs as their challenges.

## 2. Overall assessment (conclusion first)

To the essay's **value-level wishes about "how a type checker should be,"
Rigor answers almost faithfully** (80–90%). If anything, Rigor lines up its
false-positive discipline, robustness principle, inference budgets, and
gradual fallback as though it had taken this essay as its design constitution.

On the other hand, to the **language-design-level questions the essay throws
(especially "building a new language is faster"), Rigor does not "answer."
Rigor has placed its "bet" on the opposite side.** This is not a question Rigor
can refute; it can only be settled by accumulating empirical evidence.

## 3. Point-by-point mapping

### 3.1 Answers well (values align)

| The essay's claim | Rigor's counterpart |
| --- | --- |
| Types are a matter of degree; find the right landing point | RBS strict superset + trinary certainty (yes/no/maybe) + inference budgets. The "freedom to give up" by retreating to `Dynamic[T]` when something can't be proven is a first-class citizen. The whole design-priority list in `overview.md`. |
| Soundness is not justice | **False-positive discipline** (`overview.md` § False-positive discipline / design priority 8). "A running program is the most important fact. You must not threaten the author with a worst case the runtime never reaches" = a declaration that deliberately discards worst-case soundness. The closest point of fidelity to the essay's sensibility. |
| "You're forced to write types" is a lie (inference exists) | ADR-0 "AI-Native Purity": no Rigor-specific type DSL in the application body, inference-first. Only where it falls short, place RBS/rbs-inline externally. |
| Strain piles up at the boundaries | Robustness principle (strict on returns / lenient on arguments) + `Dynamic[T]` provenance. Clause 2's workaround-multiplication anti-pattern (over-tightening arguments breeds workaround code on the caller side) directly verbalizes the essay's concern about boundary friction into a design decision. |
| Dependent types are hell | A middle path that does not adopt dependent types and instead chases just the handful of practically useful precision gains via bounded refinements (`non-empty-string`/`positive-int`). A concrete compromise on the essay's dependent-type skepticism. |

### 3.2 Less "answering" than merely "not sharing the same misconception"

- "You can derive the implementation from the type — of course you can't,"
  "IDE = essentially static analysis" — Rigor simply does not make these
  overclaims in the first place (Rigor itself *is* "that static analysis").
  Consistent, but it has only avoided stepping on the mine.
- On the side of the "honesty of not over-promising" that the essay praises,
  Rigor's documents stand (RFC 2119 / ADR / budgets spell out the limits of
  inference). It answers, as a stance, the meta-claim "don't talk nonsense
  about type systems."

### 3.3 Doesn't answer / bets the other way

- **"Rather than putting types into an existing language, building a new
  language is faster"** — an essential mismatch. Rigor is literally the very
  camp that "puts types into an existing language (Ruby)," choosing the road
  the essay calls a "detour." Rigor's rebuttal is not technical but strategic:
  the design choices — "don't break Ruby, don't add a bespoke DSL, isolate
  metaprogramming into plugins, lean practical with gradual + false-positive
  discipline" — are its mitigation for that difficulty; that is the bet. The
  author would presumably still reply, "a clean typed Ruby-like language is
  faster." Not an "answer" but a "different bet."
- **The type-theory frontier (System F's undecidability / effect systems'
  decidability wall / region inference / the rise of one-trick type system
  languages)** — Rigor is not a language processor but a tool for a single
  existing language, so the arena is simply different. As a loose counterpart,
  the plugin mechanism (adding domain-specific typing per Rails/dry-rb/FFI)
  somewhat resembles "composing one-trick type systems." The CFA mutation-effect
  model is a distant echo of effect systems. But these are at the level of
  metaphor; Rigor does not engage the language-design argument head-on.

## 4. What will judge the bet (empirical evidence)

Whether Rigor's bet against "a new language is faster" is right will be
settled by demonstration, not refutation. The current evidence:

- `surfaced = 0` across 16 release tags of the Mastodon v4.5 line (zero new
  false positives under normal maintenance):
  [20260521-mastodon-v4.5-regression-sweep.md](../20260521-mastodon-v4.5-regression-sweep/),
  v0.1.9 re-run [20260523-mastodon-v4.5-regression-sweep-v0.1.9.md](../20260523-mastodon-v4.5-regression-sweep-v0.1.9/),
  ADR-35 FP verification [20260529-adr35-mastodon-fp-verification.md](../20260529-adr35-mastodon-fp-verification/).
- The false-positive discipline is the core of this "don't threaten existing
  code" bet, and the regression-sweep series is structured to stack up its
  empirical backing.

## 5. In one line

To the essay's practical sense of "how a type checker should be," Rigor
answers extremely faithfully. But to the root skepticism the essay raises —
"isn't this whole approach a detour?" — Rigor responds not with an answer but
with a bet, and whether that bet is right will be judged by whether empirical
evidence like the regression-sweep series keeps accumulating.
