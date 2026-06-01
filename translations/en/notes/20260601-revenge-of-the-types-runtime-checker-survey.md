---
title: "\"Revenge of the Types\" (Armin Ronacher) — runtime × type-checker cross-cut review"
description: "English translation of a cross-cut review of Armin Ronacher's essay \"Revenge of the Types\" across runtimes and type checkers."
sourceSha: "a9aeca94487d27fc96ccc09b315fc708006d5a78be979a432c4b3c8bbfc12aef"
sourceCommit: "a5d648b126d5ed7b1e04a16a87927bca7883e069"
translationStatus: "translated"
---

Date: 2026-06-01.

Status: **research note, no design commitments.**

Kind: cross-cut review of an external essay (Ruby/PHP/Python/JavaScript runtimes
× Rigor/PHPStan/TypeScript/Python type checkers).
Trilogy (external essays × retrofitting types onto existing languages):
- [20260601-type-system-poem-rigor-review.md](../20260601-type-system-poem-rigor-review/) (myuon, "Type System Poem")
- This note (Armin Ronacher, "Revenge of the Types")
- [20260601-gradual-typing-era-mizchi-rigor-ts-review.md](../20260601-gradual-typing-era-mizchi-rigor-ts-review/) (mizchi, "What the Era of Gradual Typing Languages Needs")

## Essay under review

- Armin Ronacher, "Revenge of the Types" (2014-08-24)
- Source URL: <https://lucumr.pocoo.org/2014/8/24/revenge-of-the-types/>

A piece in which an author from the dynamic-typing (Python/Flask) world, having
gone through a Rust/Haskell/Swift period, re-evaluates the value of static
types. Its core is not abstract argument but a concrete example: **the str/bytes
(text/binary) unification problem**. This note takes that as its spine and, axis
by axis, holds up what each of four runtimes × four type checkers "answers" on
each point.

## 0. Framing and conclusion (stated up front)

Splitting the article's claims into practical questions gives roughly six axes
(A–F). The organizing thesis:

> **The ceiling on what a type checker "can answer" is set by the type design
> of the runtime beneath it.** A checker is fundamentally bad at retroactively
> creating distinctions the runtime never made, and Armin's "str/bytes
> confusion is a language/runtime design problem and bolting types on later
> won't fix it" is correct.
> And to the article's biggest worry (= static types make flexible dynamic APIs
> impossible to express), the modern gradual-checker crowd answered with **"not
> becoming Haskell" and "growing small dependent-type-ish features afterward,
> like return types that depend on an argument value."**

## A. The str/bytes unification problem (the article's spine)

The axis where the runtime-to-runtime difference is sharpest. Since a checker
only traces the runtime's distinctions, the runtime design becomes the checker's
ceiling directly.

| | Runtime design | The checker's answer |
| --- | --- | --- |
| Python | Py2 conflated str/unicode → **Py3 fully separated `bytes`/`str`** (major surgery on the runtime side) | mypy/pyright track them as distinct types and narrow. **The cleanest "answer"**: the runtime did the heavy distinction first, and the checker merely enforces it. |
| JavaScript | Strings are UTF-16 text, binary is a separate thing via `Uint8Array`/`Buffer` | TypeScript makes `string` vs `Uint8Array` distinct types. A "pre-distinguished" typing close to Py3. |
| PHP | A string is **the byte sequence itself**. The language has no text/binary distinction (you detour via `mb_*`) | PHPStan cannot create the distinction either. Instead it escapes into **orthogonal refinements** like `non-empty-string`/`numeric-string`/`literal-string` (the `literal-string` SQLi countermeasure is a fine example). |
| Ruby | A String houses **a byte sequence + an encoding attribute** in one object. Encoding is **a runtime attribute, not a type** (it changes dynamically via `force_encoding`) | Neither RBS nor Rigor has an encoding distinction. **Ruby/Rigor stay in the Py2 model** and cannot answer the central example. Rigor's refinements are `non-empty-string`/`positive-int` (a lexical match with PHPStan), but those are on the length/sign axis, not the byte/text axis. |

**Implication**: the power to answer the central example ranks
**Python3 ≈ JS/TS > PHP/PHPStan > Ruby/Rigor**. This is not a verdict on
Rigor's quality but the fact that **Ruby's String design (making encoding an
object attribute) sets the ceiling**. For Rigor to bring encoding into the type
system, it would have to artificially manufacture, via refinement, a concept the
runtime does not distinguish — which **collides head-on with the false-positive
discipline (don't threaten running code)**. So it doesn't. This demonstrates,
from the flip side, the article's "bolting it on later won't fix it."

## B. Inference vs. annotation burden (the article lavishes praise on Rust)

- **TypeScript**: powerful local inference + structural typing + gradual escape
  via `any`. The winner that realized almost exactly the landing point the 2014
  article foresaw.
- **Rigor**: **inference-first + no bespoke type DSL in the application body**
  (ADR-0 "AI-Native Purity"). The most extreme embodiment of "don't make me
  write types." Only where it falls short, it places RBS **outside the source**.
  Whereas Armin was wary of PEP 484's **in-syntax** annotations, Rigor/RBS is
  out-of-syntax and closest to his preference.
- **PHPStan**: a layer that, since PHP's native type declarations are partial,
  supplements them up to generics via phpdoc + inference.
- **Python (mypy/pyright)**: pyright has strong inference, while mypy leans
  annotation-driven. PEP 484 annotations live **inside the language syntax** =
  the form Armin called out as worrying.

Answering power (purity of "don't make me write them"):
**Rigor > TypeScript > pyright > PHPStan > mypy** (with the handicap that
Rigor, being single-language-specialized, finds it easier to push purity up).

## C. Sum types / null / Option (static typing's biggest win = forcing all cases)

- **TypeScript**: union + `strictNullChecks` + discriminated unions + `never`
  exhaustiveness checking. Best in class.
- **Rigor**: union + trinary certainty (yes/no/**maybe**) + narrowing + `T | nil`.
  Ruby has no Option type, but one of the main purposes is the **nil-induced
  NoMethodError**. The design that does not crush `maybe` fits the Armin-style
  honesty of "at the boundary, honestly say you don't know."
- **PHP/PHPStan**: PHP8 native union/nullable + PHPStan narrowing.
- **Python**: `Optional`/`Union`, pyright narrowing, 3.10 pattern matching +
  `assert_never` exhaustiveness.

→ All four checkers answer comparatively well (the area gradual checking is best
at). The differences are narrowing precision and whether exhaustiveness checking
exists.

## D. Types leak into API design and make flexible dynamic APIs impossible to express (the deepest worry)

Armin's examples: return type changes with the argument / a decorator changes
the signature / Click/Werkzeug-style polymorphic APIs can't be written in static
types. Modern checkers answered in two stages:

1. **"Don't become Haskell" = choose gradual + structural.** Keep `any`/`Dynamic`/`mixed`,
   give up typing on APIs you can't express, and let them through. Rigor's
   `Dynamic[T]` + robustness principle (**lenient on arguments**) +
   false-positive discipline most explicitly formalize "don't shackle API
   authors." The direct answer to the article's worry is gradual's fundamental
   choice: "stop killing flexibility for safety's sake, and where flexibility
   wins, lower the types."
2. **Bolt on small "dependent-type-ish" features afterward.** Each checker
   individually added a feature that varies the return type by the **literal
   value** of an argument:
   - TypeScript: overloads + conditional types
   - PHPStan/Psalm: conditional return `@return ($x is true ? A : B)`
   - Python: `@overload` + `Literal`
   - **Rigor**: ADR-18 per-call-site return types (`returns_from_arg:`) + ADR-20
     conditional grammar. **The canonical example `JSON.parse(symbolize_names: true)`** —
     typing the way one and the same method returns a symbol-keyed hash vs. a
     string-keyed hash depending on the argument literal. A concrete case of
     typing, via limited dependent types, the dynamic API Armin said "can't be
     written in static types."

**Implication**: "static types kill flexible APIs" was true of the naive static
types of 2014, but the checkers since have been **adding safe thin slices of
dependent types and refuting it**. Rigor too rides this lineage from the Ruby
side (without going full dependent types — consistent with the sister note's
"dependent types are hell").

## E. "Behavior should be clearly defined, not by interpreter implementation"

Armin praises JS's "quirky but clearly defined semantics" and criticizes
Python/PHP/Ruby's "the implementation is the spec."

- **JS/TypeScript**: ECMAScript spec sits underneath, and TS **models the `==`
  weak-coercion and truthiness quirks as-is** and turns them into warnings.
- **Ruby/Rigor**: Rigor explicitly states it **"treats the Ruby runtime's
  behavior as the source of truth"** (overview). The **inverse** of Armin's
  ideal — a pragmatic flip that does not wait for a clean spec and **accepts the
  running runtime as the spec and encodes it**.
- **PHP/PHPStan**: PHPStan explicitly models loose comparisons and scolds you.
- **Python**: language reference + types as an external tool.

→ It is telling that **all checkers go the opposite way from Armin**. He said
"define clean semantics first," but reality answered with "reverse-engineer
dirty runtime semantics and push them into types." This is not resignation but
the only realistic solution under the problem framing of adding types to an
existing language.

## F. Was the retrofit done "well/badly"? (the meta-question, graded ten years later)

- **TypeScript = the front-runner for success.** Structural, gradual, erased
  (runtime-invariant), types outside the source. The closest fit to Armin's
  preferences, the representative case where the prediction came true.
- **Ruby/Rigor = the Ruby version of the TypeScript bet.** Types outside the
  `.rb` (RBS/generated stubs), no bespoke DSL, gradual, erased to RBS, runtime
  unmodified. **The form Armin would most likely endorse** (don't change the
  language).
- **PHPStan/Psalm**: phpdoc + inference, language unmodified. Meanwhile PHP
  *also* separately added **native, runtime-enforced types** (a different line
  that is not erased and bites at runtime).
- **Python = of two minds.** PEP 484 annotations are **inside the language
  syntax** (the form Armin called out) and checked by external tools. Erased at
  runtime by default, but they affect syntax, grammar, tooling, and runtime use
  via `get_type_hints` → the "this fundamentally changes Python" worry **partly
  came true**.

## Summary

- **The ones that best answered the core (str/bytes) were Python3 and JS/TS** —
  but **not by the checkers' merit; because the runtime created the
  distinction**. Ruby/Rigor are weak here, and **Ruby's String design sets the
  ceiling**. That Rigor does not bring encoding into the type system is a
  rational decision to avoid colliding with the false-positive discipline
  (demonstrating the article's "bolting it on later won't fix it" from the flip
  side).
- **On "don't make me write types" (inference), Rigor is the furthest right.**
  It embodies Armin's praise of Rust most extremely, from the Ruby side.
- **The deepest worry, "static types kill flexible APIs,"** is being partly
  refuted by all four gradual checkers together via "don't become Haskell + a
  thin dependent type of argument-dependent returns." Rigor too rides this
  lineage with ADR-18/ADR-20.
- **On the meta-ideal of "clean semantics first," everyone goes the opposite
  way**, answering with the line of tracing the dirty runtime and pushing it
  into types. The realistic solution to the problem of retrofitting types onto
  an existing language.
- **Rigor's position**: "a Ruby version of the TypeScript style that puts types
  outside the source," most straightforwardly satisfying the conditions Armin
  asked of a retrofitted type system (language-invariant, inference-first,
  gradual), while **the signature problem (str/bytes) alone remains structurally
  unsolved due to Ruby runtime constraints**. The honest summary is: **"it
  answers Armin's concerns about the *how* best, and cannot answer the concern
  about *that language's specific bad type construction*"** (the latter stems
  from runtime design and is outside the checker's jurisdiction).
