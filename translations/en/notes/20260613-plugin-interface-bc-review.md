---
title: "Plugin interface final review — auditing BC-break opportunities before the v1.0 freeze"
description: "Pre-freeze review of the public plugin contract, sorting out what must break, what only needs to be added, and what stays as-is before the v1.0 plugin-API freeze."
sourceSha: "293a93c8c0a1285978ee0c345663aa634b4d1209c4d5da18fc57b5faf353a262"
sourceCommit: "222d8e03ee0f4252795f6c7294672a76c20b7ae3"
translationStatus: "translated"
---

*2026-06-13. Status: pre-freeze interface review — informational, feeding the release
decision and any final plugin-API BC-break work. The spec and ADRs bind. Observations
against working tree @ `c1bddcc2` (v0.1.18 released); all 31 production plugins + 6
examples surveyed exhaustively (the 8 large plugins read closely, the rest via grep +
spot excerpts).*

## Question

ADR-50 freezes the public plugin surface (DSL names, Manifest fields, the `Services` /
`FactStore` / `Scope` public readers) at v1.0.0. **Now is the last window in which we can
break compatibility.** This review evaluates the contract surface as it stands after
ADR-37 (interface separation) → ADR-52 (compiled contribution dispatch, including the
removal of `flow_contribution_for`) → ADR-53 Track B (walk unification) have all landed,
from both (a) the performance and (b) the plugin-authoring-experience angles, and sorts
the surface into "must break before the freeze," "only needs an additive fix," and
"adjudicated as not worth breaking."

## Summary of conclusions

**No structural performance problem remains that would require a BC break.** Findings
1–6 of the 2026-06-10 audit all landed via ADR-52/53, and every hot path (per-dispatch /
per-node) is now gated by a compiled index. The remaining optimizations are independent
of interface shape.

**Authoring-experience friction is real, but most of it can be resolved additively.**
There are three candidates that genuinely require a BC break — (1) removing the unwired
`external_files:` field before the freeze, (2) normalizing the inconsistent naming across
the macro value objects, and (3) declarativizing the order-dependent `io_boundary` →
`cache_for` contract. All three can be carried out safely under the precedent set by
ADR-52 slice 5b (a load-time error + a CHANGELOG migration table + simultaneous migration
of all bundled plugins + a corpus byte-identical gate).

## 1. Performance — the delta since the 2026-06-10 audit

Status of each finding from the [previous audit](../20260610-plugin-architecture-perf-audit/):

| Finding (2026-06-10) | Status (2026-06-13) |
| --- | --- |
| 1. `flow_contribution_for` cannot be gated | **Resolved** — the hook was removed in ADR-52 WD3 (load-time `ArgumentError`). All 5 legacy users have migrated to `dynamic_return`'s static / `methods:` callable / `file_methods:` gates |
| 2. Double query against the same call node | **Resolved** — return values go through `MethodDispatcher` and post-return facts through `StatementEvaluator`, one path per concern. Each path is fronted by `ContributionIndex`'s O(1) method-name gate |
| 3. No cross-cutting method-name index | **Resolved** — the compiled tables of ADR-52 WD1 (`dispatch_candidate?` / `dynamic_candidate_for?` / verb-keyed `block_entries_for`) |
| 4. Registry aggregate queries recomputed every time | **Resolved** — `open_receivers` made a Set, `owns_receiver?` per-env ancestor memo, `contracts_for_path` per-path memo, `additional_initializers` frozen array |
| 5. node_rule walk is per-plugin | **Resolved** — `Plugin::NodeRuleWalk` (ADR-52 WD4) gives one walk per file, `is_a?` matching memoized per concrete node class, `NodeContext` lazily built one per node. Converges with the built-in rule walk too in ADR-53 B4 |
| 6. `MacroBlockSelfType` linear matching | **Resolved** — verb-keyed Hash lookup |

The remaining cold paths — `protocol_contracts` (per-file fnmatch, already per-path
memoized), the `type_node_resolvers` chain (only when parsing a `%a{rigor:v1:…}`
payload), and `source_rbs_synthesizer` (once per file during env construction) — are all
acceptable in both frequency and cost; gating them would produce no observable
difference. **There is no longer any place where the shape of the interface forces a
bottleneck** — this is the completed form of the ADR-37→52 arc, and it can withstand the
freeze.

The only future risk is the discipline of keeping it up: every time a new contribution
shape is added, a gate must be added to ContributionIndex. But this is already normative
as an ADR-52 criterion (*a capability that cannot declare a key is a gap in the DSL
vocabulary, not a license for an ungated hook*). It is enough to confirm that the freeze
target includes this criterion.

## 2. Authoring experience — friction measured in practice

The actual usage across 37 plugins (31 production + 6 examples).

### 2.1 Skew in adoption frequency (measured)

| Surface | Uses | Notes |
| --- | --- | --- |
| `manifest` / `init` | 37 / ~32 | All of them |
| `node_rule` | ~23 | The standard route for diagnostics. Established |
| `config_schema:` (incl. defaults) | ~20 | Established by ADR-40 |
| `producer` + `cache_for` | ~14–16 | The standard route for Rails-family discovery |
| `diagnostics_for_file` | **15** | Mostly legitimate file-level diagnostics (reporting load errors, cross-file validation) |
| `dynamic_return` | 11 | The sole return-value contribution surface after the ADR-52 migration |
| `type_specifier` | **3** (rspec / sorbet / minitest) | Sound by design, but poorly publicized |
| `protocol_contracts:` | 3 | ADR-28. Hanami-family only |
| `block_as_methods` / `heredoc_templates` / `trait_registries` | 2 / 2 / 1 | The ADR-16 foundation. Few users, but wired and in service |
| `TypeNodeResolver` | **1** (typescript-utility-types) | ADR-13. Niche, or a discoverability gap — needs disambiguating |
| `additional_initializers:` | 1 | ADR-38 |
| `external_files:` | **0 (and zero engine consumers)** | See § 3.1 |

Low usage on its own is not a defect (ADR-16/13/28 are each foundations aimed at a
specific shape, and node_rule being the default for diagnostics is exactly as intended).
The two real problems are **a field heading into the freeze with zero usage and zero
wiring** (external_files), and **surfaces whose existence is invisible from the docs /
SKILLs** (type_specifier / TypeNodeResolver).

### 2.2 Recurring boilerplate patterns (measured)

1. **Hand-written lazy memoization of fact-store / producer reads** — a private
   `*_index_or_nil` helper appears in **12 plugins** (13 instances), 4 of which carry an
   `@x_resolved` flag to "distinguish a nil result from an un-queried state." The
   asymmetry is that `consumes:` is declared declaratively, yet the read side is the same
   8–15 lines of code every time.
2. **The `io_boundary` → `cache_for` ordering contract** — FileEntry digest
   accumulation is a side effect, and unless the reads complete **before** `cache_for`
   takes its snapshot you get a **silently stale cache**. rigor-actionpack /
   rigor-rails-routes use warning comments to remind humans of the ordering
   (actionpack.rb:191, rails_routes.rb:218). It is enforced neither statically nor at
   runtime — the most precarious spot on the contract surface.
3. **Repackaging violation → `diagnostic()`** — the ~23 node_rule plugins all carry a
   nearly identical 3–8 line `.map { diagnostic(node, path:, location:, message:, …) }`.
4. **Scattered identically-named private helpers** — path predicates like
   `canonical_path` / `controller_file?`, `load_error_diagnostic`, `scannable_paths`
   (a reimplementation of the runner's `expand_paths`, in three places: dry-types /
   graphql / mangrove), and so on, totaling ~80–100 lines.

### 2.3 Spots where conventions diverge

- **Two conventions for publishing facts**: explicit `fact_store.publish` inside
  `prepare` (dry-family / graphql / mangrove) vs. via a `producer` block (Rails-family).
  Both are legitimate, but the criterion for choosing between them is undocumented.
- **Three conventions for error handling**: rescue and accumulate into `@load_error`,
  reporting via `diagnostics_for_file`; rescue and silently return nil; don't rescue and
  leave it to the isolation harness. No guideline.
- **The three type-contribution surfaces** (`dynamic_return` / `type_specifier` /
  `TypeNodeResolver`): which to use cannot be told without reading the code. The division
  of roles is itself principled (§ 4.1).

## 3. Adjudicating the BC-break candidates

### 3.1 Tier 1 — must break before the freeze (BC break required)

**(a) Remove the `external_files:` Manifest field (or isolate it as experimental).**
Only the ADR-16 Tier D declaration was shipped ahead; the sole engine consumer is the
CLI's count display (the count in `plugins_command.rb`). As confirmed by grep, there is
zero wiring on the analysis side. **Freezing an unwired field at v1.0 makes it a public
surface that is a permanent empty promise** — directly contrary to ADR-50's freeze
criterion (an enumerated surface comes with behavior). The right move is to re-introduce
it, value object and all, when demand appears; removal is only possible now. The other
ADR-16 value objects (heredoc / trait / block_as / nested_class) are wired into
`SyntheticMethodScanner` / `MacroBlockSelfType` and in service — not removal targets.

**(b) Normalize the naming across the macro value objects.** The same "DSL method name"
concept is `verbs:` in `block_as_methods` but `method_name:` in heredoc / trait /
nested_class. The symbol argument position is `symbol_arg_position` (heredoc / trait) vs.
`name_arg_position` (nested_class). With only 2–3 plugins using them today, a bulk rename
is mechanical, but after the freeze we carry the coexisting aliases forever. We recommend
unifying on `method_names:` / `symbol_arg_position`.

**(c) Declarativize the producer / `cache_for` / `io_boundary` contract.** The order
dependency from § 2.2-2 is a contract where "whether you wrote it correctly can only be
detected via a silently stale cache" — it cannot survive the freeze. Two directions:

- Option 1 (small): with `producer :x, watch: [roots, patterns…]`, have the engine
  synthesize the glob descriptor and retire both the manual `glob_descriptor` synthesis
  and the ordering responsibility.
- Option 2 (large): take the `cache_for` snapshot **after** the block runs rather than at
  call time (automatically capturing the `io_boundary` reads inside the producer block).

Both involve changing the semantics of `cache_for`, so both are BC breaks. All 16 current
users are bundled, so a simultaneous migration is possible (the 25-line actionmailer case
is expected to drop to ~5 lines). **The highest-value of the three candidates** — it
closes a correctness trap by construction, the cache-side equivalent of Rigor's FP
discipline (don't threaten working code).

### 3.2 Tier 2 — only needs an additive fix (no BC break, but worth landing before the
freeze so the public surface is "the right shape from the start")

1. **`Plugin::Base#read_fact(plugin_id:, name:)`** — a read helper with nil-aware
   memoization built in. Replaces the `*_or_nil` + `_resolved` family across 12 plugins.
   We could go further and auto-synthesize getters from the `consumes:` declaration, but
   the helper suffices to start.
2. **Auto-wrapping of the violation array** — allow the `node_rule` block's return value
   to contain objects that respond to `#to_diagnostic`, or provide a bulk version of
   `diagnostic`. Folds away ~23 plugins × 3–8 lines.
3. **Documentation of `type_specifier` / `TypeNodeResolver` / the two fact-publishing
   conventions / the error-handling conventions** — into the `rigor-plugin-author` SKILL
   and the plugin contract docs. With zero code changes, most of § 2.3 is solved. Reflect
   it in the external-author SKILL (planned for v0.2.0) too.

### 3.3 Tier 3 — adjudicated, after review, as "not worth breaking"

- **Merging `dynamic_return` / `type_specifier`**: on the surface it's "two type-
  contribution DSLs," but they differ in role (return type vs. post-return narrowing
  facts), in consumption phase (dispatcher vs. statement evaluator), and in compiled gate
  form. A merged DSL would still branch internally, leaving only the rename cost.
  **Status quo + documentation** (Tier 2-3) is correct.
- **Removing `diagnostics_for_file`**: 15 plugins use it. The primary use is file-level
  diagnostics that a node walk cannot express (reporting discovery load errors,
  aggregating cross-file validation). Not a degraded `node_rule` but **a legitimate
  surface as a file-rule**. Gated by ContributionIndex with no cost. Keep.
- **The dual grammar of `config_schema`** (bare kind vs. `{kind:, default:}`): ADR-40
  adopted it as an intentional superset. Banning the bare form is not worth the migration
  cost. Keep.
- **Collapsing the two fact-publishing conventions to one**: `prepare`+`publish` is "a
  lightweight scan that needs no caching" and `producer` is "cache-targeted discovery
  that involves IoBoundary" — the distinction has substance. Document the criterion
  (Tier 2-3) rather than force unification.

## 4. Confirmations about the frozen surface itself (for ADR-50 WD1)

1. **Drop from the freeze list**: `external_files:` (it drops automatically if removed
   per § 3.1-a).
2. **Add to the freeze list as a criterion**: ADR-52's "every contribution is gated by a
   key the engine already holds" discipline. Spell it out as an acceptance condition for
   adding new hooks.
3. **The `Scope` public readers** (`type_of` / `has_member?` / `has_key?` / `equals?`)
   are a surface plugins call directly, so before release reconcile that they enumerate
   identically in both internal-spec's implementation-expectations and the freeze list.
4. The one-way gates that originate in ADR-2 (plugins don't execute application code /
   Scope is immutable / FactStore is plugin_id-namespaced / no fat hooks are introduced)
   have been re-confirmed — no counterexample in this review either.

## Verification protocol

Each Tier 1 BC break follows the established precedent of ADR-52 slice 5b: (1) an explicit
load-time error (no silent degradation), (2) a migration table in CHANGELOG
`### Removed` / `### Changed`, (3) migrate all bundled plugins in the same changeset,
(4) Mastodon / GitLab corpus byte-identical + `make verify` (including `check-plugins`) +
`make bench-perf` neutral. Since (c) touches cache semantics, additionally confirm the
absence of a stale cache via a cross-process plugin-spec regression (an ADR-45
`pundit_plugin_spec`-style test).

## Follow-up

**Implemented 2026-06-13** — the recommendations in this review were filed as
[ADR-60](../../adr/60-pre-freeze-plugin-contract-consolidation/) and all work directives
have landed:

- **WD1 (Tier 1-a)**: removed the `external_files:` field + `Macro::ExternalFile`
  (rigor-rbs-inline's hand-rolled Manifest reconstruction was the only real user, and it
  was migrated too).
- **WD2 (Tier 1-b)**: `BlockAsMethod` `verbs:`→`method_names:`, `NestedClassTemplate`
  `name_arg_position:`→`symbol_arg_position:` (no aliases).
- **WD3 (Tier 1-c)**: moved `cache_for` to record-and-validate (`fetch_or_validate` +
  capturing the dependency descriptor after the block runs). Added `producer watch:` +
  `Cache::Descriptor::GlobEntry`. Migrated all 11 bundled producer plugins, eliminating
  prime-before-cache_for and manual `glob_descriptor` synthesis entirely, and made
  `glob_descriptor` private.
- **WD4 (Tier 2)**: added `read_fact` / `producer_value` + `producer_error` /
  `diagnostics_for` to `Plugin::Base`, migrating the 12 `*_or_nil` memos, 7 fact reads,
  and ~23 violation mappings.
- **WD5 (Tier 2-3)**: updated both `rigor-plugin-author` SKILLs (rename,
  record-and-validate, helpers, `type_specifier`/`TypeNodeResolver`, the two
  fact-publishing conventions, error-handling guidance).

The Tier 3 keep-verdicts (the `dynamic_return`/`type_specifier` separation,
`diagnostics_for_file`, the `config_schema` dual grammar) are recorded in ADR-60 as
rejected alternatives. `make verify` (including self-check + check-plugins) is all green.

- This note's measured adoption-frequency and boilerplate figures also feed the design of
  the v0.2.0 external-author SKILL.
