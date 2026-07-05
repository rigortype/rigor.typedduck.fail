---
title: "`plugins/` modernization sweep — a drift audit of the production plugins under SKILL application"
description: "Applying the rigor-plugin-review skill's nine-lens scan to the 31 production plugins, and the surgical drift fixes it turned up."
sourceSha: "e8a55373938541d68e53700bf4f9925b7dc2f7e61cdcc6988cc5b1b445ee2c66"
sourceCommit: "47c1c7d35efbce222a6a888268b263808b49796c"
translationStatus: "translated"
---

Status: internal audit note, authored 2026-07-04 (Rigor is on the release/0.2.x line). A record of applying the `rigor-plugin-review` skill
([`skills/rigor-plugin-review/`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-review/SKILL.md)) — newly created during the `examples/` modernization
([`20260704-examples-plugin-modernization-survey.md`](../20260704-examples-plugin-modernization-survey/),
merged to master in PR #35) — this time to the 31 production
plugins (`plugins/`). It drove the implementation PR on branch `plugins-modernization`. No design commitments.

## Summary — the production plugins are largely modernized already; drift is surgical

The production plugins were the *corpus* for the ADR-60 WD4 authoring-helper migration, so the prior hypothesis was that they carry less
drift than the examples — and the scan bore it out. Scanning all 31 plugins against the skill's nine lenses:

| Lens | Result |
| --- | --- |
| 1. ADR-40 config defaults | **No drift** (the `DEFAULT_*` constants in playground/sorbet are not config — CLI port and sigil-level internal constants) |
| 3. `type_specifier` (→ `narrowing_facts`) / `flow_contribution_for` | **All migrated** (zero uses of the author verb; `flow_contribution_for` appears only in comments) |
| 4. Hand-written Levenshtein | **None** (every plugin already uses `Base.suggest`) |
| 7. Manifest hygiene (`external_files:` / `verbs:` / `name_arg_position:`) | **Clean** |
| 2. AST-walk ownership | **1** genuine smell (hanami) — the other `class_nodes` / `def walk` cases are discovery/collect passes (legitimate, arising from `#prepare` / `node_file_context`) |
| 4. `Diagnostic.new` at node level | **1** genuine-smell candidate that was a false positive (rspec, below) |
| 8. Doc freshness | 2 minor fixes (an activerecord comment and the `flow_contribution_for` archaeology in the sorbet README) |

## Changes made (surgical, each gated on byte-identical spec output)

1. **rigor-hanami — ActionChecker moved to `node_rule(Prism::ClassNode)`** (lens 2).
   The check half of the ADR-28 protocol-contract was `diagnostics_for_file` + hand-written `class_nodes` / `walk`
   (exactly isomorphic to the web example). Decomposed it into `ActionChecker#check_class` and removed `class_nodes` / `walk`.
   Now the canonical per-class inspection form for production. hanami spec 12/12 green. The production version of the examples web fix.
2. **rigor-sorbet — three `walk_for_*` moved to `node_rule(Prism::CallNode)`** (lens 2).
   The `T.absurd` reachability, `T.reveal_type`, and `T.assert_type!` diagnostics were each `diagnostics_for_file` +
   a hand-written full walk (three of them). Each is a membership check against a set (`@reachable_absurd_nodes`, etc.)
   **recorded by object identity** during the inference phase (`dynamic_return` / `narrowing_facts`).
   Because node_rule fires in the diagnostic phase (post-inference) the set is already populated, identity matches on the same parse
   tree, and membership gates. `diagnostics_for_file` shrank to parse-error only; six methods removed.
   sorbet spec 68/68 green. The most complex plugin, but healthy as the up-front analysis predicted.
3. **Doc freshness** — removed the archaeological references to `flow_contribution_for` from the activerecord comment and the
   sorbet README table, and described the current mechanism directly (lens 8).

## Lesson — the skill's "oracle discipline" caught a false positive

In the initial triage for lens 4 I **misjudged rspec/analyzer's `Diagnostic.new` as a node-level smell** and
replaced it with `Diagnostic.from_location`, whereupon 4 spec cases failed (diagnostics went nil). The cause was that
`Diagnostic` there is not `Rigor::Analysis::Diagnostic` but a **plugin-local `Struct`** (an intermediate value
object) that has no `from_location` (a two-layer structure where rspec.rb converts to the real one downstream).
Reverted immediately (back to 47/47 green). **Lesson**: a grep for `Diagnostic.new` cannot distinguish the engine's Diagnostic from
a plugin-local value object → confirm the identity of `Diagnostic` before replacing it.
A concrete case of the skill's "make the spec the oracle after every step" discipline catching a bad modernization in a
complex plugin at minimal cost.

## Left untouched (avoiding churn)

- **Discovery/collect walkers** (activerecord/analyzer, activestorage/attachment_discoverer,
  rails-routes/helper_discoverer, sorbet/catalog_walker, etc.) — these are the collect half of `#prepare` / `node_file_context`,
  where the walk is necessary (explicitly excluded by the skill's lens 2).
- **File-level `Diagnostic.new(line: 1)`** (each plugin's load-error) — legitimate, as there is no node to position at.
- **rspec/analyzer's local `Diagnostic` Struct** — an intermediate value object, not a smell (above).
- ADR-40 / `narrowing_facts` / `suggest` / WD4 helpers — production has already adopted these; nothing to do.

## References

- [`20260704-examples-plugin-modernization-survey.md`](../20260704-examples-plugin-modernization-survey/) — sister work (examples, PR #35)
- [`skills/rigor-plugin-review/`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-review/SKILL.md) — the skill applied (created in the same PR)
- ADR-37 (`node_rule` engine-owned walk), ADR-52 (`dynamic_return`), ADR-60 WD4 (authoring helpers)
