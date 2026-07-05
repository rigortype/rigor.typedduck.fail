---
title: "`examples/` plugin modernization survey — the gap between the earliest plugins and the current contract surface"
description: "An internal audit inventorying how far the six `examples/` tutorial plugins keep up with the plugin-authoring surface added by later ADRs, and the modernization PR it drove."
sourceSha: "8464be3a491c4d1f312e11ddeeb8bd7094be46c0f2e8600eb3114da3b9c11b66"
sourceCommit: "47c1c7d35efbce222a6a888268b263808b49796c"
translationStatus: "translated"
---

Status: internal audit note, authored 2026-07-04 (Rigor on the release/0.2.x line, master
at `ae6844e7`). **This note drove the implementation PR on the same-named branch `examples-modernization`**
(applying the ADR-40 default migration, the ADR-60 WD4 rework of routes, and a documentation-freshness
cleanup; units, after verification, turned out to have the original design right and was corrected. Each
section below carries an addendum with the implementation results). **As a second pass**, the
`rigor-plugin-review` skill that grew out of this work was applied to examples itself (dogfooding), fixing
two remaining items under checklist point 2 (ownership of the AST walk) — routes' per-call inspection was
moved to `node_rule Prism::CallNode` and `diagnostics_for_file` restricted to load-error handling (matching
production rigor-rails-routes), and units' `Analyzer` manual `Diagnostic.new` was moved to the public
constructor `Diagnostic.from_location` (byte-identical). web was re-confirmed to need no change, since it has
the same `diagnostics_for_file` + checker shape as production rigor-hanami. **As a third pass (blind
validation of the skill)**, a Sonnet subagent given only the `rigor-plugin-review` skill was set loose on a
`master` worktree (from before the PRs of passes 1 and 2) to review and revise examples, and its results were
compared against ours (our changes and this note were withheld). Result: from the skill alone, Sonnet
independently reproduced every one of our items (ADR-40, the WD4 helpers, routes' `node_rule` migration,
units' trap-avoidance, doc freshness), and **additionally found three doc staleness bugs we had missed** (a
nonexistent "statesman" reference in the deprecations README, the lisp-eval README's claim that "return-type
is queued for a later slice" — which contradicts the already-implemented `dynamic_return` — and a nonexistent
`evaluate(node, emit_terminal:)` argument in the units README), and made the independent design call to
**migrate web to `node_rule(Prism::ClassNode)`** (we had followed production hanami and kept
`diagnostics_for_file`, but per-class inspection is expressible as a node and the skill's point 2 favors the
migration — Sonnet was the more faithful to the skill). Those three doc fixes, the web migration, and a
"genuinely whole-file boundary" annotation on the skill's point 2 were folded into this PR (keeping 77/77
green). Strong evidence that the skill works generically rather than merely "describing our work."
This inventories how far the six tutorial plugins under `examples/` exercise the current (= mostly later
ADR-added) plugin-authoring surface. examples are "teaching material that shows the contract surface in
minimal code" ([`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)),
and it is a given that the `make check-plugins` (ADR-43) gate keeps their self-checks green — so what this
note flags is **not correctness regressions, but staleness in idiom / precision / documentation**. ADR / spec
are binding. Confirm each file still exists before starting.

## Why this survey

The request: "some of the examples plugins were implemented in the earliest period and don't fully exploit the
latest Rigor features (e.g. aggressive literal typing of operations). First, survey the current state
comprehensively and write it up in docs/notes." Since examples are teaching material, their value lies in
being a **mirror of the currently recommended idioms**. If old styles linger, plugin authors copy them and
reproduce stale code.

## Implementation period — all six are the earliest cohort

| Plugin | Introduced | Last revised | Main hook | Role |
| --- | --- | --- | --- | --- |
| `rigor-deprecations` | 2026-05-07 | 2026-06-02 (`node_rule` migration) | `node_rule` | config-driven rule (minimal) |
| `rigor-lisp-eval` | 2026-05-07 | 2026-06-16 (comment fix) | `node_rule` + `dynamic_return` | literal AST typing |
| `rigor-pattern` | 2026-05-07 | 2026-06-16 (comment fix) | `node_rule` + `dynamic_return` | engine cooperation (`Scope#type_of`) |
| `rigor-units` | 2026-05-07 | 2026-06-10 (ADR-52 slice 2 migration) | `diagnostics_for_file` + `dynamic_return` | local-variable flow tracking |
| `rigor-routes` | 2026-05-07 | 2026-06-16 (comment fix) | `diagnostics_for_file` + `producer` | IoBoundary + cache producer |
| `rigor-web` | 2026-05-23 | 2026-05-23 (introduction only) | `diagnostics_for_file` | pass-scope protocol contract (ADR-28) |

All six date to **2026-05-07 (only web to 05-23) = the repository's oldest set of plugins**. Their subsequent
revisions are limited to "mechanical migration off the removed `flow_contribution_for` (ADR-52)", "conversion
to `node_rule` (ADR-37)", and "comment fixes" — they **have not followed the authoring surface that grew after
ADR-40 at all**.

## Baseline of the current authoring surface (what examples don't touch)

I confirmed the surfaces that the current `Plugin::Base` (`lib/rigor/plugin/base.rb`) exposes and that
**production `plugins/` adopts widely, yet examples use in 0 cases**:

| Surface | Origin | What it replaces | examples adoption | plugins adoption |
| --- | --- | --- | --- | --- |
| `config_schema`'s `{kind:, default:}` | ADR-40 | `DEFAULT_*` constants + the `config.fetch(k, DEFAULT)` idiom | **0/6** | 13+ plugins |
| `Base.suggest(name, candidates)` | ADR-60 WD4 | each plugin's hand-written Levenshtein/"did you mean" | **0/6** | several (activerecord, rails-routes, statesman…) |
| `#producer_value` / `#producer_error` | ADR-60 WD4 | hand-written `@table`/`@load_error` memo + `cache_for(...).call` + rescue | **0/6** | several (rails-routes etc.) |
| `#read_fact(plugin_id:, name:)` | ADR-60 WD4 | hand-written cross-plugin fact reads with a `@x_resolved` flag | 0/6 (no such opportunity in routes/web) | actioncable, actionmailer, activejob… |
| `#diagnostics_for(violations, path:, node:)` | ADR-60 WD4 | `violations.map { diagnostic(...) }` / inline `Diagnostic.new(...)` | **0/6** | several |
| `narrowing_facts` (formerly `type_specifier`) | ADR-37 slice2 / ADR-80 | — | 0/6 (limited opportunity; see pattern below) | minitest, sorbet, rspec |

ADR-60 (pre-freeze plugin contract consolidation, 2026-06-13) **claimed its WD4 authoring helpers would
"migrate the bundled corpus", but that corpus was `plugins/` and `examples/` was out of scope** — this is the
main reason examples never caught up. examples have stayed on as "teaching material" while preserving the old
idioms.

## Per-plugin findings

### rigor-deprecations — nearly current, small gap
- Already on `node_rule`, uses the `diagnostic` helper, no I/O or cache. Healthy as a minimal example.
- The only gap: `config_schema` is `{"methods" => :array}` (no default), and `init` hand-writes
  `config["methods"] || []`. Making it ADR-40's `{kind: :array, default: []}` removes the `|| []` (minor).

### rigor-lisp-eval — migrated, but inline Diagnostic remains
- Already on `node_rule` + `dynamic_return`. `type_for_result` folds the value into `constant_of` and the tag
  into `nominal_of` — **it does literal typing correctly** (also good by the "literal typing of operations"
  criterion below).
- Gaps:
  - `DEFAULT_MODULE_NAME`/`DEFAULT_METHOD_NAME`/`DEFAULT_SEVERITY` constants + a triple `config.fetch`
    → to the ADR-40 default form. But `severity` has allow-list validation, so it cannot simply be
    defaulted; `{kind: :string, default: "info"}` + keeping the validation is the right move.
  - `diagnostic_for_inferred_type` / `diagnostic_for_error` build `Rigor::Analysis::Diagnostic.new` directly.
    Using the `Base#diagnostic(node, ...)` helper (which absorbs the coordinate computation) would cut line
    count.

### rigor-pattern — the most modern as teaching material, but the default form is old
- **The reference implementation of this note.** Its own docstring states "unlike the early AST-only examples,
  it does not reimplement literal-string tracking but reads back the engine's `LiteralStringFolding` via
  `Scope#type_of`" — a model of engine cooperation. On a match, `dynamic_return` returns `value_type` (usually
  `Constant<String>`) to sharpen the caller — good.
- Gaps:
  - `DEFAULT_METHOD_NAME` + `config.fetch` → the ADR-40 form.
  - **Old version references** like "introduced in v0.0.9" remain in the docstring/README (stale; the current
    phrasing "literal-string carrier" suffices).
  - (optional, needs consideration) Beyond returning a value type on a match, there is room to extend it to
    thread the fact "this value conforms to the :email pattern" downstream via `narrowing_facts`. It has
    teaching value as long as it doesn't add FPs.

### rigor-units — "looks like" a double implementation, but is actually mandatory (the initial hypothesis was rejected)
> **2026-07-04 addendum (verified in implementation)**: this section originally rated the `Analyzer`'s
> `@bindings` as "a redundant implementation replaceable by `scope.type_of`", but once implemented and run
> through integration tests it was **rejected**. What follows is the corrected conclusion.

- `dynamic_return` is already migrated and reads `scope.type_of` (the flow scope). The diagnostic path
  (`Analyzer`) has its own `@bindings` local-variable map + its own AST walk + its own literal classification.
- **This is not redundant but mandatory.** The `Scope` passed to the plugin's diagnostic side
  (`diagnostics_for_file` / `node_rule`) is `seed_project_scope(Scope.empty(...))` = the **seed/entry scope**;
  `Scope#type_of` re-evaluates a node on demand but **has no flow-accumulated local bindings**:
  - `scope.type_of(100.kilometers)` is a self-contained expression, so it re-fires `dynamic_return` and
    returns `Distance` (i.e. a single-statement `inferred-binding` passes).
  - But in `speed = distance / time`, `scope.type_of(distance)` is `untyped`. The entry scope does not bind
    `distance` (the binding only exists in the flow scope) → the dimension can't be recovered, and
    multi-statement propagation, mismatch detection, and `in_query` decisions all fail (measured: 11 failures
    out of 19 examples).
  - The `Scope` passed to `dynamic_return` **is** the flow scope, so `scope.type_of(distance)` is `Distance`.
    The engine threads the dimension correctly (a downstream `speed.upcase` does in fact fire
    `call.undefined-method` against `Speed`), but **that thread is invisible from the diagnostic API**.
- So the two halves read the dimension from different sources out of necessity: `dynamic_return` from the flow
  `Scope#type_of`, and `Analyzer` from its own single-pass binding map (= the only way for the diagnostic side
  to follow a dimension across statements). rigor-pattern's warning to "don't reimplement the engine" is for
  the case where **a value is needed at a single call site**. units is the case where **the diagnostic side
  needs local flow across statements**, which the current engine does not expose to the diagnostic scope.
- **Resolution**: keep the original design and document this asymmetry in the docstring as "why a parallel
  binding map is needed" (converting the invested investigation into teaching value). Genuinely removing it
  would require exposing flow bindings to the diagnostic scope (an engine change, out of scope for examples
  modernization), or a design where the dimension computed in `dynamic_return` (the flow scope) is stashed by
  node identity and read back on the diagnostic side; but the latter introduces a flow→diagnostics ordering
  coupling and a cross-file identity assumption, making it more opaque as teaching material, so it was
  declined.
- On literal typing: the operation table (`MethodTable`) is closed over dimension Symbols, and
  `100.kilometers` returns `Nominal("Distance")`, dropping the numeric magnitude (Constant); but as dimensional
  analysis that is fine. The custom literal classification (`IntegerNode → :numeric`) is, as noted above,
  legitimate under the constraints of the diagnostic scope.
- Other: `config_schema` undeclared (fine, since it takes no config).

### rigor-routes — the biggest beneficiary of the ADR-60 WD4 helpers (unapplied)
- A teaching example of slice2 (IoBoundary/TrustPolicy) + slice6 (producer/cache_for). Already migrated to
  ADR-60 WD3 record-and-validate.
- Gaps (**three kinds of hand-written boilerplate**, all named by ADR-60 WD4):
  1. `levenshtein` + `closest_route` (30 lines) implemented by hand → replaceable by
     `Base.suggest(name, candidates)` (a shared helper using Ruby's `DidYouMean::SpellChecker`).
  2. `route_table`'s `@table`/`@load_error` memo + `cache_for(:route_table).call` + multi-stage rescue →
     exactly the `*_index_or_nil` shape of `#producer_value(:route_table)` + `#producer_error(:route_table)`.
  3. `load_error_diagnostic` writes `Diagnostic.new` inline.
- `DEFAULT_ROUTES_FILE` + `config.fetch` → ADR-40 `{kind: :string, default: "config/routes.yml"}`.
- Note: production `plugins/rigor-rails-routes` already adopts `suggest`/`producer_value`, so we have the twist
  that **only the teaching version is old**.

### rigor-web — unchanged since introduction, but the gap is small
- An ADR-28 protocol-contract example. `diagnostics_for_file` + `signature_paths` + `protocol_contracts`. The
  design itself matches the current contract (the protocol-contract surface has not changed since).
- Gaps:
  - It has no `DEFAULT`/`config.fetch` but handles `config["controller_path"]` by hand. There is room to
    declare `{kind: :string, default: ""}` in `config_schema` to make the override decision cleaner.
  - Unchanged since 2026-05-23, it is the only plugin that hasn't been checked for ADR-60 pre-freeze fallout.
    No correctness issue is apparent, but `config_schema` is undeclared (it takes `controller_path` yet has no
    schema), so its granularity is out of line with the other five.

## The "aggressive literal typing of operations" angle (the request's example)

The current engine aggressively folds arithmetic/operations into `Constant`/literal carriers (ADR-48
Data/Struct, ADR-55 recursive-return, ADR-56 block-writeback, `ConstantFolding`/`ShapeDispatch`). examples are
products of an era when this precision was thinner. By criterion:

- **Correctly exploited**: `rigor-pattern` reads `Scope#type_of` → `Constant<String>`, and `rigor-lisp-eval`
  folds its own evaluation results into `constant_of`.
- **Doing it by hand is inherently correct (initially misjudged as "not fully exploited")**: `rigor-units`'
  diagnostic-side `@bindings`, after verification, turned out to be **mandatory under the current engine's
  diagnostic-scope constraint** (see the correction in the units section above). The diagnostic scope is the
  entry scope and holds no flow bindings, so `scope.type_of` can't follow a local dimension across statements.
  Here, doing it by hand is correct. lisp-eval's Lisp-DSL evaluation likewise can't be delegated to the
  engine.

So the initial guess that "examples should use the new feature of folding operations to literals" did not hold
for units. The real modernization room in examples is **not operation precision** but the authoring-surface
idioms below (ADR-40 / ADR-60 WD4) and documentation freshness.

## Documentation/demo staleness

- **References to a removed hook (`flow_contribution_for`)** remain in the READMEs/docstrings of lisp-eval /
  pattern / units (kept with a caveat "~ was removed", but unnecessary archaeology for new readers).
- **Old version references** ("introduced in v0.0.9" etc.) remain in pattern.
- The demo `.rigor.dist.yml` format is current (`paths:` + `plugins:` as a string or `gem:/config:`), no
  problem.
- Committed cache artefacts appear under `demo/tmp/.rigor/cache/`, but `tmp/` is subject to `.gitignore` —
  presumably untracked (needs confirming, but no functional impact).

## Prioritized follow-up candidates (not design commitments)

From the mechanical, low-risk end (idiom unification, high teaching value):

1. **Migrate all six to the ADR-40 default form** — `DEFAULT_*` + `config.fetch` → `config_schema {kind:,
   default:}`. The single measure that removes "old-ness" the most broadly. Keep validation logic only for
   lisp-eval's `severity` allow-list and web's override decision.
2. **Move rigor-routes to the ADR-60 WD4 helpers** (`suggest` / `producer_value` / `producer_error` /
   `diagnostics_for`) — remove the three hand-written kinds. Resolves the twist between production rails-routes
   and the teaching version. Should be gateable byte-identically by `make check-plugins`.
3. **Move inline `Diagnostic.new` to the `diagnostic`/`diagnostics_for` helpers** (lisp-eval, routes).
4. **Remove README/docstring staleness** — clean up references to removed hooks and old version numbers.
5. **Keep rigor-units' original design + document it in the docstring (implemented)** — the initial aim was to
   "cooperate with the engine and remove `@bindings`", but implementation verification found it **cannot be
   removed** because the diagnostic scope holds no flow bindings. The reason a parallel binding map is needed
   was documented in the docstring.
6. **Align rigor-web's granularity (implemented)** — add a `controller_path` default declaration to
   `config_schema`.

All keep the correctness gate (`check-plugins`) green. This is an improvement in **teaching-material
freshness**; 1–6 are bundled into one PR (each step gated by its example's integration tests).

## References

- [`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md) — the role of the
  teaching material and its contract-surface map
- ADR-37 (plugin interface segregation, `node_rule`/`node_file_context`/`dynamic_return`)
- ADR-40 (config_schema declared defaults)
- ADR-52 (compiled plugin contribution dispatch, `flow_contribution_for` removal)
- ADR-60 (pre-freeze plugin contract consolidation, WD4 authoring helpers)
- ADR-80 (`type_specifier` → `narrowing_facts` rename)
- [`.claude/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-plugin-author/SKILL.md)
  — the procedure for new plugin authors (freshness matters since examples are their copy source)
