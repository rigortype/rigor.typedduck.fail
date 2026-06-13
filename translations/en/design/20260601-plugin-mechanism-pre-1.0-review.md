---
title: "Plugin mechanism — final pre-1.0 review (over/under-coverage, pain points, boilerplate)"
description: "English translation of the pre-1.0 plugin-mechanism review: a cross-cutting audit of plugin boilerplate, contract gaps, and PHPStan-style interface segregation."
sourceSha: "81c5c29b3548caee9cfa89ca1150ce5933ef954ff527e207a7b58cec9f2df7bd"
sourceCommit: "94bccefcb8e324ea2322199418f33e80617b8e33"
translationStatus: "translated"
---

Status: Research / pre-1.0 optimization review. Non-normative. Accepted items graduate into individual ADRs (chiefly a revision of [ADR-2](../../adr/2-extension-api/)) and the internal-spec. This note is an inventory for triaging "fix before the official release vs. push to 1.x."

Scope: the 31 `plugins/` entries + 6 `examples/` walkthroughs + the plugin-facing surface of the core (`lib/rigor/plugin/`, `lib/rigor/source/`). A cross-cutting survey against the tree as of 2026-06-01. Every finding is backed by file:line.

---

## 0. Executive summary

The plugin contract itself (the Scope / Type / Reflection / FactStore / IoBoundary / individual manifest fields that ADR-2 promised) is **implemented and working**. The engine queries ADR-2 promised — `Scope#type_of` foremost — are actually exposed (un-gated) via the `scope:` handed to plugins.

The problem is not the presence of the contract but that **there is no "author-facing utility layer" between the contract and the author**. As a result almost every plugin re-implements the same helper code, and in the process of re-implementing it produces subtle divergences (two inflectors, two camelize implementations, two describe-detection implementations, …) and a **cache-inconsistency bug with real impact**.

In descending priority:

1. **[Bug · must fix]** factorybot / pundit / sidekiq call `cache_for` without passing `descriptor:`, so the discovery index is not invalidated across processes (a warm cache returns stale results even after you edit a file).
2. **[Contract gap]** `Source::NodeWalker` and the like **exist in the core but are not exposed to plugins**, and the docstring for `diagnostics_for_file` explicitly says "walk the root yourself." The absence of an author-facing helper layer (walker / diagnostic builder / literal extraction / did-you-mean / config defaults) is the root cause of all the boilerplate.
3. **[Contract gap]** There is no `Manifest#with(**overrides)`, so rbs-inline hand-copies all 20 manifest fields (guaranteed to rot when a field is added).
4. **[Decide before 1.0]** Several produced-but-unconsumed ADR-9 facts (graphql ×4 / dry-validation / dry-schema) and several diagnostics the docstrings promise but that are unimplemented. You need to deliberately decide "do we ship this as a public 1.0 contract?"
5. **[Architecture · decide before 1.0]** Should the current fat `Plugin::Base` (a single class with many optional hooks) be split into narrow interfaces like PHPStan's → **§6**. To preview the conclusion: Rigor has *already* achieved PHPStan-style segregation with 10 declarative manifest fields, and only the 2 remaining imperative hooks (`flow_contribution_for` / `diagnostics_for_file`) are the "call everyone, self-gate" holdout. The end goals — AI-agent legibility and testability — are best met by pulling these 2 into the same declarative, engine-gated pattern. Because hook signatures freeze as a public contract at 1.0, **if you are going to split them, do it now**.
6. **[Selective adoption of extension types]** Among PHPStan's extension **types**, select the ones that have real demand in Ruby and are **unimplemented** in Rigor → **§7**. The strongest candidate is the Ruby version of `AdditionalConstructors` = **`additional_initializers:`** (a small feature that opens ivar-type seeding to lifecycle methods other than `initialize` — rspec `before` / minitest `setup` / Rails callbacks — directly serving the FP discipline). The runner-up is sealed / exhaustiveness (the `AllowedSubTypes` version, finishing ADR-36). `ResultCacheMeta` and the like are **already implemented, so don't build them**.

---

## 1. Boilerplate (the biggest finding)

### 1.1 Scale of duplication (machine-measured)

| Re-implemented pattern | Count | Representative site |
| --- | --- | --- |
| Recursive AST walker (`def walk` / `compact_child_nodes.each`) | **25 plugins** | statesman.rb:152, actionpack (4 copies / 1 file) |
| `Rigor::Analysis::Diagnostic.new` direct construction (`column: start_column+1`) | **23 plugins** | all diagnostic-emitting code |
| Literal Symbol/String extraction from Prism nodes | **20 plugins** | statesman.rb:145, plus 4 duplications inside the core |
| `config.fetch("x", DEFAULT_X)` + `DEFAULT_*` constant | **17 plugins** | statesman.rb:59-67 |
| `rescue StandardError → @load_error` one-shot emission | **10 plugins** | pundit.rb:102-118 |
| `levenshtein` / `did_you_mean` home-rolled | **4 plugins** | statesman.rb:159-192; routes ↔ activerecord are verbatim copies |
| Constant-path serializer (`constant_path_name`/`qualified_name_for`) | **~12 sites** (pundit/sidekiq/rspec have 2 copies within one file) | sorbet ×4, lisp-eval, units |
| Discoverer skeleton (`walk_for_X` + `visit_class` + `read_safely` + `ruby_files_under`) | activejob/actioncable/activestorage/actionmailer nearly verbatim | job_discoverer.rb |
| Index class (frozen `@by_name` + `find/known?/empty?/size/names`) | JobIndex/ChannelIndex/MailerIndex/WorkerIndex/PolicyIndex/FactoryIndex | worker_index.rb:12 admits it is "the same envelope shape" |

### 1.2 Root cause — present in the core but not exposed

| Helper | In the core? | Exposed to plugins? |
| --- | --- | --- |
| AST walker | **Yes** `Rigor::Source::NodeWalker` (node_walker.rb:17-35, `.each(root)` Enumerator) | ❌ Not injected into `Services`, not listed in the drift spec. `base.rb:168-171` explicitly says "walk it yourself" |
| Node → Diagnostic line | Partial (`Analysis::Diagnostic` exists but no `from_node`; the core too inlines `start_column+1` at 15+ sites in `check_rules.rb`) | ❌ No helper |
| Literal Symbol/String extraction | The logic is **duplicated 4 times inside the core** (observation_collector.rb:310, generator.rb:895, return_type_heuristic.rb:78, synthetic_method_scanner.rb:544) | ❌ Not extracted |
| levenshtein / did-you-mean | **None** (Ruby's standard `DidYouMean::SpellChecker` exists) | ❌ net-new |
| config defaults | **None** (`config_schema` does kind validation only, no default slot) | ❌ |

→ Simply exposing #1 (walker) and #3 (literal extraction), which the core already has, makes most of the copy-paste surface on the plugin side disappear. Moreover #3 can also resolve the 4 duplications inside the core at the same time (pays off in both directions, highest ROI).

### 1.3 Proposed author-facing layer

As an ADR-2 revision, provide the following as instance helpers on `Rigor::Plugin::Base` (or a `Plugin::AstSupport` mixin / `services.` accessor):

- `walk(root) { |node| }` / `each_node(root)` ← re-export `Source::NodeWalker`
- `diagnostic(node, rule:, severity:, message:)` ← encapsulate the `start_column+1` convention. Together, add `Diagnostic.from_node(...)` to the core too and unify the inline sites in `check_rules.rb`
- `literal_symbol(node)` / `literal_string(node)` / `symbol_arguments(call)` ← introduce a new `Rigor::Source::Literals`, also absorbing the 4 core duplications
- `suggest(name, candidates)` ← wrap `DidYouMean::SpellChecker`. Eliminate the home-rolled levenshtein in statesman/routes/activerecord
- config defaults: extend the `config_schema` entry shape to `{kind:, default:}`, and have `Base#config` merge defaults at construction time. Retire the `DEFAULT_*` constant idiom (a `Manifest` schema change → requires an ADR note)

### 1.4 Common abstractions to extract (larger units)

On top of the author-facing helpers, turn the recurring "plugin types" into base classes:

- **`ProtocolContractChecker` base** (ADR-28 family) — hanami `ActionChecker` and web `ProtocolChecker` have **verbatim-identical** `path_matches?` / `class_nodes` / `direct_defs` / `collect_direct_defs` / `singleton_def?` / `walk` / `class_name`. Duplication grows linearly as ADR-28 plugins increase. The presence/absence of an arity check matches too.
- **`ClassDiscoverer` base + `NameKeyedIndex`** — compress the discoverers + indexes of the Rails discovery family (activejob/actioncable/activestorage/actionmailer) into a base + small extraction blocks. About 4 files' worth of AST traversal disappear, and there is no longer a need to fix a future Prism-node bug fourfold.
- **`SourceScanner` mixin** (declaration-collection family) — dry-types/dry-schema/dry-validation/graphql/statesman re-implement `scannable_paths` / `scan_file`-rescue / `tree_walk` / `constant_name_for`. Worse, their **behavior diverges** (nil-return / `::` prefix / tail-match), which is itself a correctness risk. Unify into a single canonical implementation.
- **`Plugin::Testing::Narrowing`** — rspec `MatcherAnalyzer` and minitest `AssertionAnalyzer` verbatim-duplicate `literal_value_for` / `nominal_type_for` / `FlowContribution::Fact` construction (a source comment admits the duplication).
- **`Plugin::Inflector`** — routes has 2, activerecord has 1, actionmailer/actionpack have `underscore` for a total of 4 copies. routes_parser.rb:1498-1534 admits it is "kept in sync until one can adopt the other."

---

## 2. Cache / I/O / trust boundary

### 2.1 [Bug] discovery cache without a descriptor (must fix)

factorybot / pundit / sidekiq call `cache_for(:index, params: {})` **without `descriptor:`** (factorybot.rb:142, pundit.rb:105, sidekiq.rb:99). The cache key then depends only on "files IoBoundary has already read within the same process," so in a fresh process it is empty → editing a policy/worker/factory file makes a warm `rigor check` **return stale results**. The docstring at `base.rb:298-310` itself warns "discovery families must always pass `glob_descriptor`."

Fix: `cache_for(:index, descriptor: glob_descriptor(@search_paths, "**/*.rb"))`. Delete factorybot's home-rolled `prime_io_boundary_for_index` (a degraded reinvention of glob_descriptor).

### 2.2 Trust-boundary bypass

- rbs-inline's `Synthesizer#call` uses `File.read` **directly** (rbs_inline.rb:62-67). A contract gap that bypasses the `io_boundary` / `TrustPolicy` other plugins observe.
- examples/rigor-routes (routes.rb:98-106), on the other hand, **correctly** teaches the order dependency "read_file → record digest → cache_for," but it is fragile: break the order and invalidation silently breaks. If the core had a declarative API to pass "the set of files this producer depends on," the order dependency itself would disappear.

### 2.3 Two cache-priming idioms

Passing `glob_descriptor(...)` (i18n/actionmailer/actioncable) and read-then-`cache_for` (routes/activejob/activerecord/actionpack) coexist. They solve the same "descriptor empty on first run" problem separately. Should be standardized into one.

---

## 3. Manifest / contract surface

### 3.1 Manifest field bloat and the lack of `with`

`Manifest` has grown to 21 fields, each with its own `validate_*!` (manifest.rb:43-83). This itself is the reasonable result of incremental extension, but **there is no way to copy it**.

To bolt on a synthesizer afterward, rbs-inline **hand-copies all 20 manifest fields verbatim** (rbs_inline.rb:136-158). Guaranteed to rot when a new field is added. → Add `Manifest#with(**overrides)` to the core (top-priority small fix). Relatedly, rbs-inline is the only one that overrides `initialize` instead of `init` (rbs_inline.rb:111-122) — a bad precedent as a template — pull it toward the `init` convention.

### 3.2 Ceremony for RBS-only plugins

activesupport-core-ext is "an empty `Base` subclass with just `signature_paths: ["sig"]` + `register`" (activesupport_core_ext.rb:23-33). It is the canonical ADR-25 form, but it forces about 12 lines of boilerplate class onto a pure-RBS bundle with no analyzer code at all. Consider a **declarative path** that can ingest signature_paths from just a gem enumeration in `.rigor.yml`.

### 3.3 Surface ADR-2 promised but did not deliver

- **The `ContextInfo` companion (ADR-2 §Scope Object) is unimplemented.** Plugins receive only `path`/`scope`/`root`, and have to derive lexical context (current class/method/visibility/assertion context) by walking the root themselves.
- The logger service is explicitly deferred (services.rb:24-26). Acceptable.

---

## 4. Feature over/under-coverage

### 4.1 Produced-but-unconsumed ADR-9 facts (decide before 1.0)

- graphql's 4 facts (`:graphql_type_table` and others) **currently have no readers at all** (graphql.rb:30-39 merely lists future demand-driven consumers).
- dry-validation's `:dry_validation_contracts` is also produced-but-unconsumed (the consuming slice 2 itself is deferred, dry_validation.rb:29-40).
- dry-schema's `:dry_schema_table` also awaits dry-validation slice 2 for an actual consumer.

→ Deliberately decide "do we ship the facts as a public 1.0 contract, or keep them internal until a consumer arrives?" Shipping them produced-but-unconsumed becomes backward-compatibility debt.

### 4.2 Diagnostics the docstrings promise but that are unimplemented (drift)

- sorbet: `dynamic.sorbet.unsupported` / `degraded` are unimplemented, so the `Dynamic[top]` downgrade of `T.proc`/`T::Struct`/`T::Enum`/`type_parameters` is **completely silent** (type_translator.rb:43-48) — the user has no way to learn that the type was dropped.
- dry-types: `dry-types.unknown-alias` / `alias-shadow` (dry_types.rb:46-58) unimplemented.
- dry-schema: `unknown-predicate` / `unknown-type` (dry_schema.rb:69-76) unimplemented.
- statesman: the docstring table has `event :sym` validation but the implementation has only `state`/`transition_to` (statesman.rb:43 vs collect/validate).
- graphql: the docstring suggests alias resolution but it is unimplemented (`BaseObject = …; class X < BaseObject` passes through unhandled).

→ Either revise each docstring downward to match the implementation, or implement the diagnostic. At 1.0, if the docstring is read as the contract, this becomes a promise violation.

### 4.3 Lossy `bool/Boolean → TrueClass` mapping

dry-types (alias_scanner) / dry-schema (schema_scanner.rb:24) / graphql (type_scanner.rb:23) map bool to `TrueClass`. A cross-project precision floor that **mistypes `false`**. Should be unified to a proper bool carrier.

### 4.4 Constant `:info` noise

factorybot / pundit / sidekiq / statesman emit an `:info` diagnostic on **every** correct call (factory-call / policy-call / worker-call / known-state). They flood the output in real projects. Hide them behind a verbosity knob or default them off.

### 4.5 Individual over/under-coverage (mostly scoped deferrals, medium-to-low priority)

- devise: synthesized methods all return `Dynamic[T]` (no return precision, awaiting slice 6). Also controller helpers like `current_user` are out of scope — the place users most expect from a Devise plugin is unprovided (a deliberate trade-off per the ADR, but the largest expectation gap).
- activestorage: the manifest declares `consumes: model_index` but **never actually reads it** (always standalone discovery, double-parsing the same `app/models` as activerecord). A misleading declaration → delete it or actually consume it.
- pundit: namespaced-model (`Blog::Post`) policy-name resolution assumes the fully-qualified form, and could false-positive in apps with flat policy names (analyzer.rb:91-99).
- actionpack: `unknown_helper_diagnostic`/`wrong_arity_diagnostic` are defined but unused (~20 lines of dead code), and 2 of `STRONG_PARAMS_RECEIVER_NAMES` are dead config.
- dead data: i18n `value_kinds`, activejob `keyword_required`, actioncable `action_methods` are collected but unreferenced (uselessly carried in the cache slice).
- vendored-table drift risk: rspec-rails's Rack status table, devise's modules table — no validation against the gem version.

### 4.6 Anti-pattern teaching in the examples (templates)

The examples are the canon of "how to write a plugin," so the boilerplate here gets copied into real plugins. In particular:

- deprecations teaches `receiver:` matching by **source-string equality** (deprecations.rb:97-101) — it misses on `::User` / newlines / whitespace. The README should make clear it is not type-based.
- lisp-eval/units/routes comments say "return-type contribution awaits v0.1.x" but **the actual code is already implemented** — the documentation has not caught up to the implementation.
- contract-surface coverage is uneven across examples (web has up to return-type conformance but no arity, hanami has arity).

---

## 5. Recommended actions (in priority order)

### Should go in before 1.0 (small, high ROI)

1. **Fix the factorybot/pundit/sidekiq cache descriptor bug** (§2.1) — correctness.
2. **Add `Manifest#with(**overrides)`** (§3.1) — remove rbs-inline's 20-field hand-copy.
3. **Expose the minimal set of the author-facing helper layer** (§1.3) — re-export `Source::NodeWalker`, `Diagnostic.from_node` / `Base#diagnostic`, introduce `Source::Literals` (also resolving the 4 core duplications). One ADR-2 revision covers it. This alone makes the copy-paste in 25 plugins disappear and makes the templates healthy.
4. **Sweep out docstring drift** (§4.2, §4.6) — revise the promises of unimplemented diagnostics downward, resolve the comment/implementation mismatch in the examples. The honesty of the contract goes up with almost no code change.
5. **Decide the fate of produced-but-unconsumed facts** (§4.1) — publish or keep internal.

### Right after 1.0 (medium-scale refactor)

6. **Extract common bases** (§1.4) — `ProtocolContractChecker` / `ClassDiscoverer` + `NameKeyedIndex` / `SourceScanner` / `Testing::Narrowing` / `Inflector`.
7. **Config-defaults schema** (end of §1.3) — retire the `DEFAULT_*` idiom.
8. **Unify the bool carrier** (§4.3), **default info noise off** (§4.4), remove dead code/data (§4.5).

### 1.x and beyond (needs additional design)

9. **Provide `ContextInfo`** (§3.3), a declarative file-dependency API for the trust boundary (§2.2), a declarative path for RBS-only plugins (§3.2).

---

## 6. Interface-segregation study — PHPStan style vs. the current fat `Plugin::Base`

> End goal: a plugin architecture in which **an AI agent can easily grasp the rules and features, and which is easy to test and verify**. Performance reduction is secondary (mitigable by caching, non-critical).

### 6.1 An accurate reconstruction of the present — Rigor is already "2/3" split

Before arguing "is the current interface sufficient as is," classify the present accurately. Rigor's plugin extension points have **two coexisting styles**:

| Style | Extension point | How the engine handles it | Gate | PHPStan-style? |
| --- | --- | --- | --- | --- |
| **A. Declarative manifest fields** (10) | `block_as_methods` / `trait_registries` / `heredoc_templates` / `nested_class_templates` / `type_node_resolvers` / `protocol_contracts` / `hkt_registrations` / `hkt_definitions` / `source_rbs_synthesizer` / `owns_receivers` / `open_receivers` | Each field is aggregated from `registry.plugins` via `flat_map` and **the engine indexes it** (`SyntheticMethodScanner`, `ResolverChain`, `Registry#contracts_for_path`, etc.). **The engine gates** by verb/receiver/class/path | Engine side | ✅ **Already PHPStan-style** |
| **B. Imperative hooks** (2) | `flow_contribution_for(call_node:, scope:)` / `diagnostics_for_file(path:, scope:, root:)` | **Calls every plugin against every node/file**. `registry.plugins.filter_map { … }` (a **verbatim double copy** at `method_dispatcher.rb:663` and `statement_evaluator.rb:1379`) | **a self-`if` inside the plugin** | ❌ fan-out + self-gate |

→ **The correct framing of the question**: it is not "should we adopt PHPStan's philosophy." Rigor has already adopted it in 10 of 12 extension points. The question to ask is "do we also align the remaining 2 imperative hooks to the same declarative, engine-gated pattern (= do we **finish** the segregation)?"

### 6.2 The invariant to port from PHPStan (just one)

PHPStan has ~50 narrow interfaces, but the essence is a single invariant:

> Separate a **cheap gate predicate** (bool / `nil`-decline) from an **expensive payload** (returns a `Type` / error / data), and have the engine **index** extensions by the gate value (`getClass()` / `getNodeType()`), invoking the payload only for matching nodes/receivers.

- The type-inference trio: gate by `getClass()` + `isMethodSupported()` → `getTypeFromMethodCall()` only after passing.
- Rules: index by AST-node class via `getNodeType()` → `processNode()` only for matching nodes.
- Magic members: `hasMethod()` gate **only on a miss** of built-in reflection → `getMethod()`.
- The sole catch-all (`ExpressionTypeResolverExtension`, no gate) is the **explicitly discouraged** last resort.
- **One class, one interface** is dominant. A framework package registers many narrow extensions.
- Per-interface test bases (`RuleTestCase` = fixture + expected error set, `TypeInferenceTestCase` = string-match verification of inferred types via `assertType()` inside a fixture).

The current Rigor B is the **only** part that fails to satisfy this invariant.

### 6.3 Proposal — make the remaining 2 hooks narrow interfaces

Split B's 2 hooks into the same "manifest-registered, engine-indexed, gate/payload-separated" style as A. Mapping PHPStan's correspondences to Ruby:

**Split `flow_contribution_for` into two:**

```ruby
# (1) return-value change (PHPStan DynamicMethodReturnTypeExtension equivalent)
class DynamicReturnExtension
  def supported_receivers = ["ActiveRecord::Base"]   # gate: the engine indexes by receiver
  def supports?(method_name) = method_name == :find  # gate: cheap
  def return_type_for(call, scope) = ...             # payload: only on a match
end

# (2) narrowing via predicate/assertion (PHPStan TypeSpecifyingExtension equivalent)
class TypeSpecifyingExtension
  def supported_methods = [:present?, :blank?]        # gate
  def specify(call, scope, edge) = ...               # payload → truthy/falsey/post_return facts
end
```

The engine indexes by receiver class (**the existing `owns_receivers` indexing machinery can be reused**). The current "call every plugin against every unresolved CallNode and run `FlowContribution::Merger` each time" disappears.

**Split `diagnostics_for_file` into two:**

```ruby
# (3) per-node rule (PHPStan Rule<TNode> equivalent) — this is the keystone
class NodeRule
  def node_type = Prism::CallNode                     # gate: the engine indexes by node class
  def check(node, scope) = [...diagnostics]           # payload: only on a matching node
end

# (4) per-file rule (escape valve, ExpressionTypeResolverExtension equivalent)
class FileRule
  def check(path, root, scope) = [...]                # only when genuinely cross-file/index validation is needed
end
```

**(3) NodeRule is the keystone**: the engine walks the AST **only once** and distributes each node only to the rules registered for that node's class. The reason §1's **25 home-rolled walkers** exist is precisely that the current hook hands over the raw `root` and says "walk it yourself" (`base.rb:168-171`). Once the engine owns the walk, their very reason for existence disappears. (4) is kept as a last resort for cases that genuinely require the whole file (cross-file index cross-checking), but it is explicitly labeled "last resort" and is not part of the default surface.

`prepare` / `produces` / `consumes` (FactProvider) is already semi-declarative + topologically ordered (`loader.rb:230` Kahn sort, turning missing-producer/cycle into LoadError) and is close to PHPStan's Collector. Tidying it up as a named interface is enough.

### 6.4 How the three goals are met

- **AI-agent legibility** ← most important. The manifest becomes a **machine-readable capability declaration**. "This plugin changes the return value of `ActiveRecord::Base#find` and emits a rule on `CallNode`" becomes greppable / enumerable, and is no longer buried in a self-gating `if`. Furthermore a `rigor plugins --capabilities`-style **catalogue can be generated**, providing a "machine-readable index of interface → gate → test harness" that PHPStan lacks (a differentiator that can **surpass** PHPStan — the survey confirmed "PHPStan has no machine-readable interface↔tag registry").
- **Test / verification ease** ← inseparable from interface segregation. A dedicated harness per narrow interface: NodeRule → feed node+scope and assert the diagnostics (`RuleTestCase` equivalent), DynamicReturnExtension → feed call+scope and assert the `Type` (`TypeInferenceTestCase` equivalent). Currently the only harness is `run_plugin` (write to a demo dir, run the **full Runner**, and verify **indirectly** via the downstream `call.undefined-method` string — `plugin_helpers.rb:109`, the lisp-eval spec is a live example). The lack of any per-hook unit-verification means is the biggest current weakness.
- **Boilerplate reduction** (directly tied to §1) — the 25 walkers disappear, and the double copy of the dispatch loop is consolidated into a single indexed registry. §1's author-facing helper layer is a "mitigation if you don't split"; §6's split is the higher-order solution that "removes the reason helpers are needed at all."
- **Performance** (secondary) — the engine indexes and skips non-matching plugins. The current `plugins × files × nodes` fan-out (no pre-filter) is resolved. As the user noted it is not critical, but it comes along **at no extra cost** if you split.

### 6.5 The discipline of not overdoing it

Do not port all of PHPStan's ~50 interfaces. What Rigor needs now is just **3–4 new narrow interfaces** (DynamicReturn / TypeSpecifying / NodeRule + FileRule escape valve).

- magic-member / dynamic-reflection family → **already covered by the macro substrate (ADR-16)**. No new construct needed.
- dead-code (always-used) / restricted-usage family → demand-driven, deferred to 1.x.
- the catch-all (the FileRule equivalent to the current `diagnostics_for_file`) is kept but **explicitly labeled a discouraged last resort**.

### 6.6 Migration and timing

- **The target is 31 plugins, but most are mechanically convertible.** The "single walk → diagnostic on name match" type (statesman / pundit / sidekiq / factorybot / many Rails-family) falls into NodeRule almost as-is. A's declarative family (sinatra / devise / dry-struct / typescript-utility-types / parts of hanami·web) is **already split and needs no change**.
- **Backward compatibility**: if you keep the old fat hook as a deprecated-but-supported FileRule (catch-all), a wholesale migration is unnecessary. Make the new interfaces the recommended path, and rename the old `diagnostics_for_file` to FileRule + mark it deprecated.
- **Timing is the decisive point**: hook signatures **freeze as a public contract at 1.0**. Splitting the fat hook in 1.x is a breaking change. **If you do it, do it now (pre-1.0).** This is the biggest answer to "is the current state sufficient" — *functionally it is sufficient, but the window for splitting is open only now.*

### 6.7 Recommendation

1. **Before 1.0**: (a) introduce **NodeRule + engine-owned walk** (maximum effect on both boilerplate and testing, directly tied to §1), (b) split `flow_contribution_for` into **DynamicReturn + TypeSpecifying**, (c) keep the old `diagnostics_for_file` as **FileRule** (a deprecated catch-all).
2. At the same time, ship **per-interface test bases** (for NodeRule, for DynamicReturn) — the testability goal can only be achieved simultaneously with interface segregation.
3. Ship a **machine-readable capability catalogue** (a dump of the manifest aggregation / `rigor plugins --capabilities`) so AI agents can enumerate the extension types and each gate.
4. dead-code / restricted-usage / additional magic-member family are **demand-driven, in 1.x**.

→ This fits well filed as a single ADR-2 revision ("narrow-interface-ization of the 2 imperative hooks and naming of FactProvider"). §1's author-facing helper layer can be invested in ahead of time as a **bridge while this split is introduced in stages** (as plugins become NodeRule-ified, their dependence on the walker helper falls away).

---

## 7. Selective adoption of PHPStan extension types (a separate axis from interface segregation)

§6 is about "do we make the **shape** of the hooks PHPStan-like." This section is about "among the **kinds** of extension PHPStan has, which have real demand in Ruby and are **not yet** in Rigor." Of all ~50 interfaces, after backing the present state of Rigor with file:line, the ones worth adopting narrowed to a few. **The user-mentioned `AdditionalConstructorsExtension` was exactly the strongest candidate.**

### 7.1 Selection matrix

| PHPStan extension type | Rigor present state (backed) | Adoption value | Fit with FP discipline | Decision |
| --- | --- | --- | --- | --- |
| **AdditionalConstructors** → Ruby "additional initializers" | **PARTIAL**: ivar-type seeding is from `initialize` **only** (scope_indexer.rb:79, :214-220, :411) | **High** | ◎ | **Recommend adopting (small, ahead of others)** |
| **AllowedSubTypes** → sealed / exhaustiveness | **ABSENT**: no `case/in` exhaustiveness (statement_evaluator.rb:539-541). ADR-36 WD3 already specs the sealed-parent fact, and `is_a?` exhaustiveness narrowing is deferred (nested_class_template.rb:61-69) | **High** | ◎ (correctly detects missing cases) | **Recommend adopting (medium, integrated with ADR-36)** |
| **`Collector<TNode,TValue>`** | **PARTIAL**: FactStore + `prepare` exist but no per-node collection primitive, each plugin re-walks on its own (base.rb:166-178) | Medium | ○ | **Integrate into §6's NodeRule** (cross-file aggregation version) |
| **MethodParameterClosureType** (yield-argument type) | **PARTIAL**: `block_as_methods` is **self type only** (block_as_method.rb:47-51). yield-argument types are builtin+RBS only, no plugin field | Medium | ○ | **Consider adding `yields:` to the manifest (demand-driven)** |
| **AlwaysUsed\* / ReadWriteProperties** (dead-code FP suppression) | **PARTIAL**: dead-code is local-variable/branch only (check_rules.rb:74, :1058). No member-level unused detection | Medium (conditional) | ◎ (the **suppression** side is what's needed) | **Bundle the suppression hook when introducing member dead-code** (don't add it alone) |
| **RestrictedUsage family** (internal API / test-only) | **PARTIAL**: Ruby's private + Liskov override only (check_rules.rb:69-70). No caller constraint | Low–medium | ○ | demand-driven, 1.x |
| **DiagnoseExtension** (`-vvv` troubleshooting) | **ABSENT** (no plugin contribution). `rigor triage` (ADR-23) is a separate form on the consumer side | Low | — | Small, bundled with §6.4's capability catalogue |
| **ResultCacheMetaExtension** | **EXISTS**: `Cache::Descriptor::ConfigEntry` + `cache_for(descriptor:)` can hash arbitrary external state (descriptor.rb:120-141, base.rb:249-260) | — | — | **Don't build (already implemented)** |
| ExpressionType / Operator catch-all | N/A (discouraged per §6.2) | Low | — | Pass |
| magic-member reflection family | covered by the macro substrate (ADR-16) | — | — | Don't build |

### 7.2 Strongest — the "additional initializers" extension (Ruby version of AdditionalConstructors)

PHPStan's `additional-constructors` is a small extension that "treats `setUp()` etc. as constructors too and **removes the false positive** of uninitialized properties." Rigor has no uninitialized-property check of PHP's kind (Ruby ivars default to nil), but **a hard-coded boundary of the same structure already exists**:

- `scope_indexer.rb:79` `build_class_ivar_index` seeds ivar types **only from the body of `def_node.name == :initialize`**, and gates the read-before-write → nil contribution there too (:223-234).
- Code that establishes ivars in rspec `before`/`let`, minitest `setup`, and Rails callbacks (`after_initialize` etc.) is **outside the seeding scope** → it infers "an ivar not assigned in `initialize`" as nil-inclusive, a breeding ground for FPs in test / Rails code.

→ Add a **manifest declarative field** `additional_initializers:` (corresponding to PHPStan's declarative `additionalConstructors:` parameter) so you can declare, via `receiver_constraint` + a set of method names, "in this class these too are type-seeding sources." A small feature that rides straight on the §6.1 A-style (declarative, engine-gated), and the one that most directly serves §0's **false-positive discipline**. rigor-rspec / rigor-minitest / rigor-rails benefit immediately. For the rare cases that need dynamic logic, a hook can also be left that lets a plugin extend the `scope_indexer`-side seeding-site resolution (the same two-tier split PHPStan uses, "config for simple cases, an extension for dynamic ones").

### 7.3 High value — sealed / exhaustiveness (Ruby version of AllowedSubTypes)

Exhaustiveness checking of `case/in` / `case/when` is currently ABSENT (statement_evaluator.rb:539-541 admits "no exhaustiveness tracking yet"). ADR-36 WD3 already specs the **sealed-parent fact**, and exhaustiveness narrowing across `is_a?` is deferred awaiting the `Environment#class_ordering` wiring (nested_class_template.rb:61-69).

→ Introducing a **fact channel** corresponding to PHPStan's `AllowedSubTypesClassReflectionExtension` (`supports?` + `getAllowedSubTypes`) (a plugin declares "the allowed subtypes of this parent type are {A,B,C}") would get both precision improvement of union subtraction and detection of missing cases, and would unblock the pending items of **rigor-mangrove's Enum / dry-struct / ADR-36** all at once. It also fits the FP discipline (silent if exhaustive, reports only the gaps). The engine-side work is somewhat heavy, but it merely exposes an already-spec'd line to the plugin contract, so the design novelty is low.

### 7.4 Integrate · demand-driven · don't build

- **Collector** (cross-file per-node collection) naturally goes in as the **cross-file aggregation version of §6's NodeRule** (adding "collect then consume" on top of the foundation where the engine walks once and distributes nodes). Don't make it a standalone feature; fold it into §6.
- **`yields:` manifest field** (block-argument type) is for DSLs with context-dependent yield types that cannot be written in static RBS. It pairs with the self type of `block_as_methods`. Demand-driven.
- **Member dead-code + AlwaysUsed suppression** has value **only as a pair**. Ruby has an extremely high FP risk from metaprogramming, so adding detection alone without a suppression hook violates §0's discipline. If you add it, do so on the premise of **simultaneously** shipping a suppression extension that "treats Rails callbacks / DSL-registration methods as always used." Priority after 7.2/7.3.
- **RestrictedUsage / Diagnose** are demand-driven (1.x).
- **ResultCacheMeta is already implemented** (`ConfigEntry`) — don't re-implement. The only difference is the ergonomics of "no dedicated callback, you hand-assemble a `ConfigEntry`."

### 7.5 Recommendation (relationship to §6)

§6 (the **shape** of the hooks = narrow-interface-ization) and §7 (the **kinds** of extension) can proceed independently. The pre-1.0 adoption candidates, in priority order:

1. **`additional_initializers:` (7.2)** — small, declarative, directly hits the FP discipline. Top priority.
2. **sealed/AllowedSubTypes fact (7.3)** — finishes ADR-36 and unblocks Mangrove/dry enums. Medium.
3. Collector is integrated into §6; `yields:` and member dead-code + suppression are demand-driven.

7.2 is a standalone small PR, 7.3 is a continuation of ADR-36, and both can be split into tickets separate from §6's ADR-2 revision.

---

## Appendix: healthy exemplars (the shape to grow)

- **rigor-sinatra** — the cleanest manifest (1 BlockAsMethod + 9 verbs). No walker/Diagnostic/index code at all. The ideal form that offloads the burden to the substrate.
- **rigor-pattern** (example) — the best template for "do not re-implement string propagation yourself," cooperating with the engine via `services.type.literal_string_compatible?` / `scope.type_of`. The `literal-unknown` info is also a model of false-positive discipline.
- **rigor-devise** — zero analyzer code with a declarative TraitRegistry (the floor of return precision is a separate issue, but structurally the form others should aim for).

What these share is "offload the burden to the substrate / engine queries, and write no AST code of your own." Once §1's author-facing layer and §1.4's base classes are in place, walker-family plugins can approach this level of code volume too.
