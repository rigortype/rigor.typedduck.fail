---
title: "lib/rigor internal architecture re-review — a structural audit before the official release"
description: "English translation of a structural audit of lib/rigor's internal architecture, on role clarity and boilerplate/call-overhead reduction ahead of the official release."
sourceSha: "28406574e941ec0050e6c42a67923f820b00b7180b9d3400059506ebfe2050a4"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
---

*2026-06-10. Status: structural audit feeding ROADMAP entries + an ADR — informational,
not normative. The spec binds. Observations taken against the working tree @
`75484162` (post-v0.1.17, pre-v0.1.18 cut). Four subsystems were investigated in parallel,
and high-impact findings were corroborated by grepping the main tree.*

## Question

Before the official release (ADR-50: v0.2.0 evaluation release → v1.0 contract freeze),
re-examine `lib/rigor`'s internal architecture along two axes: **(a) clarity of logical
role separation** and **(b) reduction of redundant boilerplate and wasted method calls**.
Without re-covering areas already digested by prior audits
([builtin boilerplate](../20260603-builtin-typing-boilerplate-audit/) /
[structural repetition](../20260604-structural-repetition-audit/) /
[plugin architecture](../20260610-plugin-architecture-perf-audit/)), take stock of **only
the structural issues that remain**.

## Premises — already-digested areas

- Boilerplate: Theme A (ValueSemantics/AcceptanceRouter) / C (CLI::Command) /
  D (the Diagnostic factory + RbsCacheProducer + LSP mixin), and builtin Findings 1–4
  (SingletonFolding / the unified CallContext interface / `MethodCatalog.for_topic`)
  are all DONE (see each note's progress log).
- Allocation: ADR-44 (body-scope collapse, −42% allocs) LANDED.
- Plugin consumption path: ADR-52 is **proposed but unimplemented**. This audit's A-1
  re-confirms the grounds for placing its implementation first.

## Overall assessment — the foundation is sound

- **No cycles in the dependency direction**: `cli → analysis → inference → type`, a single
  direction. There are only two back-flows, both acceptable — `Inference::BudgetTrace` at
  `type/combinator.rb:19` (measurement only), and the namespace twist where `Scope` carries
  `Analysis::FactStore` (no functional problem; a low-priority rename candidate).
- The Scope-invariant discipline, fail-soft, and the `try_dispatch(CallContext)` tier
  unification all work as the internal-spec declares.
- The four-way split of `ExpressionTyper` (type values) / `StatementEvaluator` (scope
  transitions) / `Narrowing` (narrowing) / `MethodDispatcher` (resolution) largely holds.
  No circular references.

## Finding A — Wasted method calls (performance axis)

### A-1. Plugin-contribution dispatch (ADR-52, the centerpiece)

The legacy `flow_contribution_for` is called unconditionally for every call node × 2 paths,
and node_rule walks the entire file once per plugin. The WD1–WD6 implementation of
[ADR-52](../../adr/52-compiled-plugin-contribution-dispatch/) is the biggest single move
for this theme. Details in the
[plugin architecture audit](../20260610-plugin-architecture-perf-audit/).

### A-2. The builtin tiers also do an "every-tier attempt"

Even for a typical call like `String#+`, all 14 tiers of `PRECISE_TIERS` take the
`CallContext`, return nil, and only then reach RbsDispatch (around
`method_dispatcher.rb:738`, 50–70 micro-operations of whiffing per call). The singleton
folders can never hit unless the receiver is `Singleton[Math]` etc., so **the same "look up
once with a key the engine already holds" idea as ADR-52 can be applied to the builtin
tiers** (a prefilter keyed on receiver class / method name). A natural fit as an ADR-52 WD
addendum or sibling slice. The measurement gate is identical to ADR-52 WD6
(byte-identical diagnostics + stackprof + `make bench-perf`).

### A-3. Duplicate construction of CallContext

Up to three are created per dispatch — beyond the entry at `method_dispatcher.rb:86`, the
Tier B promotion at `:476` and the user-class fall-through at `:791` each redo
`CallContext.build`. Mechanically reducible via differential copies with `Data#with`. This
is the reality behind the ADR-44 note's "CallContext per-dispatch (intrinsic) still open":
everything but the one intrinsic instance can be cut.

### A-4. AST-walk count per file

Per file: ScopeIndexer 1× + CheckRules' `NodeWalker.each` 1× (`check_rules.rb:167`) +
4 independent collectors (`:228` IvarWrite / `:242` DeadAssignment / `:255`
AlwaysTruthyCondition / `:265` UnreachableClause) + the number of plugins with a
node_rule = **at minimum 6 + N walks**. The plugin portion is resolved by ADR-52 WD4
(a single engine-owned walk). Consolidating CheckRules' four collectors is **not to be
touched without a shadow-run equivalence harness**, because **traversal order matters for
correctness** (the same judgment as Theme B in the structural-repetition note).
→ goes to Finding B-4 / an ADR.

### A-5. OverloadSelector's acceptance call count

At `overload_selector.rb:259`, `accepts` runs for every overload × every param, multiplied
by member count for a Union receiver (e.g. a 3-member Union × 5 overloads × 3 params = 45
calls). `Acceptance` itself is light per call (TYPE_HANDLERS table + structural-equality
short-circuit). An optimization candidate **only after measuring** (not a dominant term in
the current profile).

## Finding B — Role separation (structural axis)

### B-1. `Analysis::Runner` (2011 lines) is the biggest monolith

File enumeration / the 7 project pre-passes (`runner.rb:448-514`) / Ractor & fork-pool
coordination (~400 lines, `:747-1163`) / the run-result cache key / aggregation of 12+
diagnostic sources (`:297-338`, `:613-628`) / severity application / reporter drain /
plugin execution all live in one class. A **three-way split into `PoolCoordinator` /
`ProjectPrePasses` / `DiagnosticAggregator`** brings the orchestrator proper down to
~600 lines. A behavior-preserving container split, so low risk. It also serves as scaffolding
for the ADR-46 follow-up slices and the LSP request for a "Runner that takes a pre-built
Environment" (ROADMAP § LSP Ractor pool).

### B-2. Duplicate implementation of certainty judgment

The branch certainty (`:yes/:no/:maybe`) of `case/when` is independently implemented in
`expression_typer.rb:791-862` (`case_when_branch_certainty` / `case_when_pattern_certainty`),
and the same pattern analysis also lives in `narrowing.rb:365` (`case_when_scopes`).
`StatementEvaluator` already delegates to `Narrowing.case_when_scopes`
(`statement_evaluator.rb:560-584`), so it is **double** (not triple). The truthy/falsey
certainty of `if/unless` likewise has `expression_typer.rb:678`
(`constant_predicate_polarity`) and `statement_evaluator.rb:492` (`predicate_certainty`)
writing the same `Narrowing.narrow_truthy → Bot?` idiom separately. **Consolidating onto
"Narrowing is the sole owner of certainty judgment; Typer / Evaluator are queriers"** is the
right shape for role separation. But since this is the correctness core of the inference hot
path, do it as a dedicated slice + full suite + diagnostics-invariant gate, not a mechanical
refactor.

### B-3. The `run_check` remnant in `cli.rb`

The other 14 commands already delegate to `CLI::Command`, but check alone remains in the
body (`cli.rb:83-287`, ~200 lines + `parse_check_options`, 256 lines). Delegating to
`CheckCommand` completes the symmetry. Low risk.

### B-4. Too many meta-tables on Scope (a design-decision case → ADR)

Beyond its flow-sensitive core duty of "bindings + facts + narrowing state," `scope.rb`
carries ~10 `discovered_*` **project-wide indexes** (class / def / visibility / superclass /
includes / class_sources / `data_member_layouts` …). The latter are invariant during a run,
so they need not be carried via `rebuild` on every scope transition. A `ProjectIndex`-style
separation is the soundest move for role separation, but:

- ADR-44 demoted a similar `ProjectScope` reorganization as "not an allocation reduction
  under Ruby 4.0 object-shapes" (the motivation must be reframed as **boundary clarity**
  rather than performance).
- It touches the public surface where plugins read indexes via `Scope` (`user_def_for` etc.).
- Like A-4's CheckRules collector consolidation and structural-repetition Theme B
  (scope_indexer walker unification), it **presupposes an equivalence harness**.

Decide it in an ADR as a boundary issue, not a performance one. → file ADR-53.

## Finding C — Public-API boundary violations to close before the v1.0 freeze

[rigor-sorbet](../../plugins/rigor-sorbet/lib/rigor/plugin/sorbet.rb) `:585` calls
`Rigor::Inference::Acceptance.accepts` directly. `public-api.md` declares `Inference::*`
internal, so this must be resolved before the ADR-50 freeze. Since `Type#accepts` is the
public surface, rewriting to `asserted.accepts(inferred)` is a near-one-line fix
(AcceptanceRouter delegates to the same implementation). Others: `rigor-sinatra:27` is a
comment mention only (harmless); the plugins' direct `Diagnostic.new` calls are on the
public surface and so are not violations (there is room to steer them toward the recommended
`Plugin::Base#diagnostic` wrapper).

## Proposal — four phases

| Phase | Contents | Risk | Gate |
| --- | --- | --- | --- |
| 1 (mechanical) | C sorbet boundary fix / A-3 CallContext `with`-ification / B-3 `run_check` → CheckCommand | Low | `make verify` + diagnostics-invariant |
| 2 (centerpiece) | ADR-52 implementation WD1→WD6 (+ A-2 builtin-tier prefilter as a WD addendum) | Medium | ADR-52 WD6 (byte-identical + stackprof + bench-perf) |
| 3 (structural) | B-1 Runner three-way split / B-2 certainty-judgment consolidation onto Narrowing | Medium | full suite + diagnostics-invariant |
| 4 (ADR required) | B-4 Scope project-index separation / A-4 collector consolidation (shadow-run premised) | High | ADR-53 + equivalence harness |

## Follow-up

- Register all phases as work items in `docs/ROADMAP.md` § Future cycles.
- File the Phase 4 design decisions as ADR-53 (deliberative / high stakes).
- Phase 1 needs no ADR and can begin immediately.
