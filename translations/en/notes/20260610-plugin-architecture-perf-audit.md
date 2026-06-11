---
title: "Plugin architecture structural audit — optimization room in the per-call consumption path"
description: "English translation of a static structural audit of Rigor's plugin consumption path, exploring whether the architecture can be reshaped so such per-call optimizations become structurally unnecessary."
sourceSha: "fbb1f4e8528e8e836bc4efd48a22ee962902bb0a8d635e17dc5ac975fc9931ff"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
---

*2026-06-10. Status: structural audit feeding an ADR — informational, not normative. The
spec binds. Observations taken against Rigor v0.1.17 (working tree @ `54062b0a`).*

## Question

With the [Mastodon](../20260604-mastodon-allocation-profile/) /
[GitLab](../20260604-gitlab-plugin-contribution-allocation/) allocation profiles and the
ADR-44 fixes, the *symptoms* of the plugin consumption path (repeated per-dispatch `dup`s,
linear scans over all plugins) have been cut substantially. This audit's question is what
comes next — **can the architecture itself be reshaped so this kind of optimization becomes
structurally unnecessary?** This is a static audit done by reading the code; no new profile
was taken (the profiling method and numbers are baselined by the two notes above).

## Current state of the art (recap / premises)

- `Registry::ContributionIndex` (`lib/rigor/plugin/registry.rb`) classifies, once at
  registry build time, the "plugins that structurally implement a per-call path," and both
  `MethodDispatcher`'s and `StatementEvaluator`'s `collect_plugin_contributions` visit only
  that subset (GitLab: 11 → 2).
- The snapshots of `Plugin::Base.dynamic_returns` / `.type_specifiers` are memoized.
  Contribution collection is lazily allocated + a shared frozen empty array.

So the pruning of "which plugins to look at" is done. The remaining cost is in **(a) the
per-call processing after deciding to look** and **(b) the opaque paths that cannot be
indexed**.

## Findings (in impact order)

### 1. The legacy `flow_contribution_for` cannot be gated — the biggest structural problem

Plugins that override it are called unconditionally for **every call node × 2 paths** (the
dispatcher's return-value collection + the statement evaluator's assertion collection). The
gate condition is buried in the plugin's internal code and cannot be indexed from the engine
side.

The remaining users are the four biggest in production + 3 examples:

| plugin | actual gate condition | vocabulary needed to make it declarative |
| --- | --- | --- |
| rigor-activerecord | receiver is a model class / Relation (the key set of the `model_index` built in `prepare`) | **run-time-resolved receiver set** (callable, evaluated once after `prepare`) |
| rigor-activestorage | same (attachment-declaration index) | same |
| rigor-sorbet | `T.*` assertions (static names) **+ catalog path (any def method that has an ingested sig)** | **run-time-resolved method-name set** (catalog keys, evaluated after `prepare`) |
| rigor-rspec | per-file let names (per-file dynamic) | a **per-file name-set** hook |
| examples/rigor-units | the receiver's *dimension* (refinement carrier, no nominal class) + a static method-name set | a **static method-name gate (receiver-agnostic)** |
| examples/rigor-lisp-eval / -pattern | a single config-derived method name | run-time method name (config-derived) |

> **2026-06-10 correction**: this table originally listed "rigor-activesupport-core-ext =
> method-name set" as a fifth entry and classified sorbet as a "static method-name gate."
> Scrutiny during implementation found both wrong — **activesupport-core-ext is a pure RBS
> bundle with no `flow_contribution_for`** (not even a migration target; the grep hit a
> comment mention), and **sorbet matches any def method via the catalog path**, so it does
> not fit a static name set and needs a run-time set. As a result, **no real plugin fits the
> static method-name gate**, and its first consumer was examples/rigor-units (migrated in
> ADR-52 slice 2).

The `dynamic_return` DSL (ADR-37 slice 2) could initially declare a receiver only as a
**static Array of class names**. ADR-52 WD2 slice 2 added a **receiver-agnostic static gate
(`methods:` only)** and migrated units. The remaining 4 production + 2 config-derived
examples need run-time sets (receiver / method name / per-file) and are handled in slice 3
onward.

### 2. Double querying of the same call node

`MethodDispatcher#collect_plugin_contributions` (return value) and
`StatementEvaluator#collect_plugin_contributions` (post-return facts, run over **every call
statement** via `apply_plugin_assertions`) collect independently. A legacy plugin pays its
internal decision in full twice per call. In the GitLab profile, this corresponds to 3.5%
of allocations on the `StatementEvaluator` side alone.

### 3. There is no cross-cutting index on method names

- `type_specifiers` is a **pure method-name gate**, yet matching is a per-plugin,
  per-rule linear `rule[:methods].include?(name)` (`Plugin::Base#type_specifier_facts`).
- `dynamic_return_type` redoes per-rule receiver-ancestor matching
  (`class_matches_receiver?` → `environment.class_ordering`) per dispatch. Even for a rule
  with a `methods:` gate, the receiver match runs first.

The overwhelming majority of calls (`each` / `map` / `+` …) concern no plugin, yet
confirming "concerns nothing" costs O(target plugins × rules). Building a reverse index
`Hash[Symbol → [(plugin, rule)]]` at registry build time makes the typical path a single
Hash lookup.

### 4. The Registry's aggregation queries recompute flat_map every time

The Registry is frozen at build time, yet the following aggregate on the fly on each call:

| query | call frequency | current cost |
| --- | --- | --- |
| `Registry#open_receiver?` | per `call.undefined-method` candidate (`Analysis::CheckRules`) | flat_map + Array#include? |
| `Registry#additional_initializers` | per def node × 2 sites (`ScopeIndexer`) | flat_map |
| `Registry#contracts_for_path` | per def (`MethodParameterBinder#apply_protocol_contract`) | flat_map + fnmatch over all contracts |
| `MethodDispatcher#plugin_owns_receiver?` | per dispatch that reaches the user-class fallback | all plugins × owns_receivers × `class_ordering` |

All can be replaced by the same "precompute once at build time" as ContributionIndex
(Set-ify, frozen union, per-path / per-class memo). The class graph is invariant during a
run, so memoizing `(class_name, constraint) → bool` is sound.

### 5. node_rule's AST walk is per-plugin

`Plugin::Base#node_rule_diagnostics` has each plugin run `Source::NodeWalker.each_with_ancestors`
in full for itself. With N plugins that have a node_rule, that's N full node traversals per
file. On top of that, `NodeContext` is allocated **per matching rule** (one per node would
suffice). ADR-37's "the engine owns the walk" principle is realized only per-plugin; the
natural finished form is the engine doing a **single per-file walk** and consuming all
plugins' rules merged as `node_type → [(plugin, rule)]`.

### 6. `MacroBlockSelfType`'s linear matching

Per call site with a block, all plugins × `block_as_methods` are matched linearly
(`lib/rigor/inference/macro_block_self_type.rb`). It has the shape of a verb (method-name
Symbol) that could be looked up in a Hash.

### Addenda (minor)

- `Environment#class_ordering`'s `normalize_class_name` newly allocates a string each time
  via `delete_prefix` (even when there is no prefix).
- The runner's `plugin_emitted_diagnostics` calls `diagnostics_for_file` on all plugins for
  every file, but whether it is the default implementation (`[]`) can be determined at build
  time (the same `Method#owner` check as ContributionIndex's `flow_overridden?`).

## Proposal — three stages

### Short term: thorough build-time precomputation in the Registry (mechanical, diagnostics-invariant by construction)

Implement Findings 3, 4, 6, and the addenda as an extension of ContributionIndex (or a
successor single table): method-name reverse-index Hashes for type_specifier /
dynamic_return (with `methods:`) / block_as_methods, Set-ification of open_receivers, frozen
union of additional_initializers / owns_receivers, a per-path memo for contracts_for_path,
a `(class, constraint)` ancestor-judgment memo, and once-per-node allocation of NodeContext.
The same kind of pure allocation reduction as ADR-44, no FP risk.

### Medium term: extend the DSL vocabulary → retire the legacy hook (the centerpiece, ADR required)

Add the three vocabularies in Finding 1's right column — (a) a run-time-resolved receiver
set (callable), (b) a method-name-only gate, (c) a per-file name-set hook — to the
`dynamic_return` / `type_specifier` family DSLs, and migrate the 5 plugins. Once done,
deprecate `flow_contribution_for`. Since this is before the official release (the ADR-50
freeze is v1.0), there are no BC constraints. The landing is isomorphic to PHPStan's
`DynamicMethodReturnTypeExtension` (a class-name-keyed registry).

### Long term: consolidate onto a compiled contribution table

Compile all declared contributions into a single frozen dispatch table at run start, so the
engine's hot sites just "look up a Hash with a value on hand (method-name Symbol / receiver
class name)." Finding 2's double query is also unified into one collection per call-node via
the table. The frozen table is Ractor-shareable, so it also helps reduce the Blueprint
rebuild cost of ADR-15 Phase 4.

## Verification protocol

Measure each stage with the existing method: take stackprof (throwaway GEM_HOME) + alloc
counts on Mastodon `app/models` (6 plugins) / a GitLab-config subset (11 plugins), with
**byte-identical diagnostics** as the pass condition. Run with cwd=target + the project's
`.rigor.yml` (with cwd=rigor, the plugin relative-path search breaks — see the
[Mastodon note](../20260604-mastodon-allocation-profile/) methodology).

## Follow-up

- File an ADR (completing the declarativization of plugin contributions + a single dispatch
  table) with this audit as input.
