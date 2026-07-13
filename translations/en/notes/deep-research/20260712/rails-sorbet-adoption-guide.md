---
title: "Adopting and operating Sorbet in Ruby on Rails projects — a comprehensive analysis"
description: "A comprehensive analysis of setting up, operating, and troubleshooting Sorbet in Ruby on Rails projects, contrasting Stripe's official approach with the Tapioca-centered community ecosystem."
sourceSha: "2d21e7674c3176eec001c7917201b5e4065d2b735abbd2e59aa843fb9bb0fb39"
sourceCommit: "ca611a0fa195c049e8e56b0aa4a78145864c4d54"
translationStatus: "translated"
---

## Introduction: Scaling Ruby on Rails and the call for gradual typing

Ruby on Rails (hereafter "Rails") is a web application framework that has delivered exceptionally high productivity and flexibility thanks to its robust conventions and a "duck typing" philosophy that makes heavy use of metaprogramming [1]. However, as a business grows and its codebase expands to a scale of hundreds of thousands or millions of lines, and as the development organization scales up, this dynamic nature becomes the single largest breeding ground for technical debt and runtime errors. Because a method's input values and return values are implicit, developers are forced to read through the entire implementation in order to understand how a function behaves, and they run into the structural problem that safe refactoring becomes difficult [2].

To solve this problem, the "gradual typing" approach — which preserves Ruby's dynamic flexibility while incorporating the safety of static analysis — has been gaining support. A gradual type system has the distinctive advantage that it can introduce types incrementally, team by team or file by file, without the risk of halting feature development for a complete rewrite [4].

Sorbet is a fast and powerful type checker for Ruby, developed by Stripe as an internal tool in the United States and later open-sourced [5]. It runs multithreaded and possesses overwhelming scalability that analyzes millions of lines of Ruby code in a matter of seconds, and it dramatically improves the developer experience through editor integration via the Language Server Protocol (LSP) [5].

This report provides a comprehensive analysis for technical leaders and senior engineers considering the adoption of Sorbet in Rails projects, covering setup procedures, the operational processes that become indispensable after adoption, architectural best practices, and advanced troubleshooting for cases where types do not attach as expected. In strict accordance with the user's request, the discussion clearly separates the standard approach based on the "official materials" provided by Stripe from the Rails-specific approach based on the "unofficial materials (the ecosystem)" that the community — Shopify foremost among them — has developed.

## Basic concepts presented by the official materials, and the limits of the standard architecture

The architecture and setup procedures presented by Sorbet's official documentation work robustly for pure Ruby projects. However, understanding the friction that arises when they intersect with the characteristics of the Rails framework is critically important for any adoption plan.

### The dual system of static analysis and runtime checks

According to the official materials, Sorbet is composed of two main components — a "static type checker (`srb`)" and a "runtime checker (`sorbet-runtime`)" — and is designed so that these two complement each other to provide high reliability [6]. The static type checker analyzes the entire project before the code runs, as a command-line tool, and detects potential errors. The runtime checker, on the other hand, provides a DSL (such as the `sig` method) for adding type annotations to Ruby code, and dynamically verifies at runtime whether a method's arguments and return value match its signature [6]. The official gradual-typing philosophy holds that the static type checker's predictions are not always correct (because an opt-out `T.untyped` exists), and it teaches that the presence of runtime checks — which surface errors early and prominently at runtime — is indispensable [9].

### Incremental control through strictness levels

Rather than forcing uniform typing across the entire codebase, Sorbet manages incremental adoption using a "strictness" level that can be configured per file [4]. By writing a magic comment called a "sigil" at the top of each file, developers instruct Sorbet as to the level of rigor demanded for that file.

| Level | Declaration sigil | Behavior and recommendations based on the official documentation |
| :---- | :---- | :---- |
| Ignore | # typed: ignore | Sorbet does not read this file at all and excludes it completely from static analysis. Because classes and constants are not resolved either, the official guidance recommends avoiding its use as much as possible. |
| False | # typed: false | Only constants and syntax are resolved; method-call errors and type mismatches are ignored. This is the default setting for files where no sigil is stated. |
| True | # typed: true | Reports all common static type errors. Calls to unknown methods and type mismatches are detected; this is considered the optimal balance point between safety and adoption cost. |
| Strict | # typed: strict | Requires explicit type signatures for every method, constant, and instance variable in the file. |
| Strong | # typed: strong | Completely eliminates any "unknown type (T.untyped)" state from the code that runs. This is an extremely difficult-to-reach highest level, used only in a very small number of critical files. |

In the official adoption strategy, the accepted path is to initialize every file at the lowest level and, while resolving constant errors and the like, progressively raise a large number of files to `# typed: true` [11].

### How the official setup command works, and where it breaks down on Rails

The setup flow the official guidance describes begins by adding `sorbet` and `sorbet-runtime` to the `Gemfile` and running the initialization command `srb init` [5]. This command scans every Ruby file in the project, uses runtime reflection to detect missing constants, and attempts to auto-generate type definition files (RBI: Ruby Interface) for the existing code and dependency gems [8].

In large Rails projects, however, this official initialization method causes serious problems. Because `srb init` pulls even the vast number of scripts inside the `vendor/bundle/` and `node_modules/` directories into its analysis scope, processing takes an extremely long time and, in some cases, has been reported to fall into an infinite loop [12]. Avoiding this requires stopgap measures such as manually inserting `# typed: ignore` into every file within external directories [12].

Even more fatal is the fact that Sorbet itself cannot understand Rails-specific metaprogramming [13]. The column accessors and the family of relation methods that ActiveRecord generates dynamically are defined for the first time only at runtime. Consequently, relying on the official static analysis alone causes every property reference on an ActiveRecord model to be treated as a "method does not exist" error.

## Rails-specific setup via the unofficial ecosystem, and the introduction of Tapioca

To complement the limitations of the official tools, "Tapioca" — developed under the leadership of Shopify and others in the community — has become the de facto standard for adopting Sorbet in today's Rails projects [13]. A tool called "sorbet-rails," developed by the Chan Zuckerberg Initiative, was once relied upon, but a complete migration to Tapioca is now strongly recommended [15].

### Migrating from sorbet-rails to Tapioca

If an existing Rails project was using sorbet-rails, a complete cleanup is required before adoption. Specifically, one deletes all of the RBI files under the previously generated `sorbet/rbi/` directory and runs a migration that replaces them with Tapioca's mechanism [15]. Because Tapioca is specialized for use as a command-line tool, the best practice is to specify `require: false` in the `Gemfile` dependency and configure it so that it can be run only in the development and test environments [13].

### The full picture of the Tapioca-centered setup process

Initial setup with Tapioca provides a more advanced and controllable process that fully replaces the official `srb init`.

| Command | Role and internal mechanism |
| :---- | :---- |
| tapioca init | Initializes the project environment. It generates the Sorbet and Tapioca configuration files (`sorbet/tapioca/config.yml`, etc.), and performs, in one pass, automatic compilation of gem RBIs and the retrieval of community-provided annotations [13]. |
| tapioca gem | Generates RBI files for dependency gems. It loads the application to identify the required gems, imports the signatures and documentation within the source code, and compiles them into `sorbet/rbi/gems` [13]. |
| tapioca dsl | The core command that converts Rails-specific families of dynamic methods into RBIs amenable to static analysis. It actually loads the Rails application into memory and, through introspection, identifies constants and dynamic methods [13]. |
| tapioca annotations | Pulls hand-written, high-quality signatures for gems from a central repository managed by Shopify (`rbi-central`). It supplements type information that dynamic generation cannot cover [13]. |

### The depths of the DSL compilers and resolving ActiveRecord

Tapioca's most powerful capability is its family of "DSL compilers" for decoding Rails metaprogramming. When `tapioca dsl` is run, multiple specialized compilers start up, search the codebase for specific patterns, and generate type definitions [16].

For example, the `ActiveRecordDelegatedTypes` compiler searches for whether `delegated_type` is defined within a model, and auto-generates the type signatures for the build and predicate methods that correspond to polymorphic behavior (e.g., `build_entryable` or `message?`) [19]. Similarly, the `ActiveSupportCurrentAttributes` compiler analyzes the accessors of classes that manage thread-safe global attributes, and `ActionControllerHelpers` takes on the role of integrating helper modules within controllers into static analysis [20].

To speed up DSL compilation in large applications, Tapioca is integrated with Bootsnap's instruction-sequence (iseq) cache. By setting the environment variable `TAPIOCA_RBS_CACHE=1`, it is possible to skip recompilation of unchanged files and greatly shorten the developer's feedback loop [13].

## Operational tasks required after adoption, and the continuous-improvement cycle

Immediately after setup is complete, the infrastructure is merely in place; to actually reap the benefits of static type checking, one must establish an operational cycle that continuously improves the entire codebase. The official materials define this phase as the "lifecycle of T.untyped" [4].

### The lifecycle of T.untyped and metrics tracking

According to the official materials, when a codebase adopts a gradual type checker, it traverses the following three phases — from an initial state in which `T.untyped` (a state in which the type is undetermined) overflows throughout the system, to one in which it is gradually eliminated [4].

1. **Initial ramp-up phase**: A state in which only a small number of files are typed and a broad range remains at `# typed: ignore` or `# typed: false`.
2. **Transitional period**: A phase in which the core abstractions (the model and service layers) begin to acquire types.
3. **Long-tail phase**: A state in which typed code makes up the majority, heading toward resolving the edge cases [4].

To visualize this progress, Sorbet provides two main metrics. The first is the "file-level typedness rate (the number of files at each strictness level)," which is emphasized in the initial phase [22]. The second is the "number of uses of T.untyped," which is measured as the ratio of `types.input.sends.typed` (the number of calls whose receiver's type is known) to `types.input.sends.total` (the total number of monitored method calls). Once a project enters its transitional period, raising this ratio becomes the operational goal with the highest return on investment [22]. In operation, an automation workflow that periodically runs the `srb rbi suggest-typed` command and automatically raises the strictness level of files whose errors have been resolved by fixes is indispensable [15].

### Controlling runtime overhead in the production environment

Sorbet's runtime checks (`sorbet-runtime`) are a powerful defensive wall that prevents inaccurate type annotations from spreading false assumptions throughout the system. However, because argument type verification, execution of the original method, and return-value type verification are performed every time a method is called, a runtime performance overhead arises [9]. This overhead is normally minuscule, but in the production environment of a high-traffic Rails application it may exert fatal effects such as increased latency and reduced throughput [23].

As a best practice in the unofficial community and in large-scale environments, the strategic disabling of runtime checks in the production environment is adopted [25]. Sorbet provides methods such as `.checked(:tests)` that specify in which environment a particular signature's verification is performed [9]. As an operational maxim, the approach taken is to set `T::Configuration.default_checked_level = :tests` (or `:never`) globally within Rails' `application.rb` or an initialization script, thereby limiting runtime checks to only when the test suite runs [9]. This makes it possible to maintain production-environment performance while continuously proving the validity of type annotations through automated tests [9].

### Incorporation into continuous integration (CI)

Every time a table schema is changed, a new gem is added, a GraphQL schema is updated, and so on, the RBI files that Tapioca generated go stale. To prevent this, in addition to an operational practice in which developers regenerate RBIs in their local environment, automating synchronization verification in the CI pipeline is indispensable [2]. By incorporating commands such as `tapioca check-shims` into a CI step, one can build a mechanism that detects overlap between hand-added shim definitions and the auto-generated RBIs, and that also blocks, at the pull-request stage, divergences in type definitions caused by code changes [13].

## Best practices in Rails architecture design

In the course of integrating Sorbet into an existing Rails project, situations frequently arise in which the traditional "flexible Rails-style design" collides with "the rigor of static typing." To maximize the benefits of typing, the application's architecture itself needs to be refactored to be type-friendly.

### Restricting metaprogramming and migrating to POROs (Plain Old Ruby Objects)

In Rails development, the "Interactor pattern," which encapsulates business logic to avoid bloated controllers, is frequently adopted. However, widely used gems such as `collectiveidea/interactor` use `OpenStruct` — which permits arbitrary dynamic properties — as the context for passing state around [2]. Because `OpenStruct` defines methods at runtime, Sorbet treats every variable within the context as `T.untyped`, and the type guarantees on input and output are completely lost [2].

The architectural best practice for this problem is to abolish the use of ambiguous dynamic structs entirely and migrate to service classes based on POROs (Plain Old Ruby Objects) that have explicit instance variables and accessors [2]. Alternatively, it is strongly recommended to introduce a Rust-like Result type that rigorously types the success and failure states (such as the `sorbet-result` gem), and to redesign the success or failure of side effects as an interface amenable to static analysis [2].

### Making ActiveRecord callbacks explicit methods

In ActiveRecord model callbacks (`before_save`, etc.), developers often write implicit processing using a `Proc` (block). However, because Sorbet has limitations in resolving implicit receivers and inferring the types of instance methods within a `Proc`, static analysis frequently raises errors [26].

As a best practice, the technique adopted is to abolish inline callback definitions using a `Proc` and to refactor so that the symbol of a method explicitly defined within `private` scope is passed to the callback hook [26]. This change not only circumvents Sorbet's constraints; it also brings the excellent side effect of improving the testability of the model's internal logic and enhancing the readability of the domain logic.

### Adopting inline RBS comments (the latest paradigm shift)

For a long time, Sorbet's greatest drawback was said to be its verbose signature syntax (`sig { params(...).returns(...) }`). This not only harmed code readability but also forced the aforementioned runtime dependency (`sorbet-runtime`) to be inserted all over the codebase [23].

From 2025 into 2026, as the greatest technical breakthrough in the Ruby ecosystem, native support for "RBS inline comments" was added to Sorbet under Shopify's leadership [25]. RBS is the official type definition language introduced in Ruby 3.0, and this is a technique for writing it as comments within Ruby source code.

Using this technique, an existing Sorbet signature can be dramatically simplified as follows.

```ruby
# 従来のSorbetシグネチャ（ランタイム依存あり）
sig { params(names: T::Array[String]).returns(String) }
def greet(names)
  "Hello, #{names.join(", ")}!"
end

# 最新のインラインRBSコメント（ランタイム依存なし、ゼロオーバーヘッド）
#: (Array[String]) -> String
def greet(names)
  "Hello, #{names.join(", ")}!"
end
```

This inline RBS comment is interpreted by Sorbet at the AST (abstract syntax tree) analysis stage and is evaluated as completely equivalent to the traditional `sig` syntax [25]. Because it is not Ruby code evaluated at runtime, the performance overhead becomes completely zero, and downcasts equivalent to `T.cast` or `T.must` can also be written as `#: as String` or `#: as !nil` [25]. Using the Spoom tool provided by Shopify, existing `sig` blocks can be automatically converted into RBS comments; therefore, when newly introducing Sorbet into a Rails project going forward, adopting these RBS inline comments from the initial stage becomes the ultimate best practice that reconciles performance and maintainability [25].

## Advanced troubleshooting when types do not attach as expected

By the very nature of retrofitting a static type system onto a dynamic language, cases in which intuitively correct Ruby code is rejected by Sorbet as a type error occur frequently. Here we explain in detail the root-cause analysis for phenomena specific to Rails development, along with troubleshooting techniques found deep within the ecosystem.

### 1. Type mismatches in ActiveRecord Relations, and workarounds

When handling the results of database queries, the most frequently occurring error in Sorbet-adopting projects is the problem of type resolution for ActiveRecord relations. To accurately express chainable query methods, Tapioca's `ActiveRecordRelations` compiler dynamically defines three synthetic classes behind each model — `PrivateRelation`, `PrivateAssociationRelation`, and `PrivateCollectionProxy` — and emits them to RBI files [30].

The problem is that these synthetic classes are intentionally treated as private constants [30]. When a developer writes them directly into a signature as a method's return value (e.g., `returns(Post::PrivateRelation)`), static analysis passes, but the contradiction arises that at runtime the runtime check raises an "undefined constant" exception and the system crashes [30].

**Advanced solution options:**

1. **Specifying the plain `ActiveRecord::Relation`**: Directly specify the generic `ActiveRecord::Relation` class as the argument or return value of a signature. However, this technique has the serious drawback that the information that the receiver belongs to a specific model is lost, so that calling a model-specific scope (e.g., `Person.active`) results in a static analysis error [31].
2. **Exposing the private constant via a type alias (a hacky technique)**: This is the most realistic and widely adopted workaround. Using `ActiveSupport.on_load` and the like to intervene in the initialization process, one uses metaprogramming to make the private relation constants public at runtime and defines a generic `RelationType` alias on the model [26]. This makes it possible to preserve model-specific scopes while preventing the runtime-check crash.
3. **Opting out of the runtime check**: When one wants to avoid complex hacks, the technique taken is to use `T::Sig::WithoutRuntime.sig` to disable the runtime check only for a particular signature, or to temporarily define the relevant types as `T.untyped` to silence the error [15].

### 2. Using the escape hatches (type assertions) appropriately

When Sorbet's control flow-sensitive typing reaches its limits and the compiler cannot recognize the correct type, developers must use "escape hatches (type assertions)" to convey domain knowledge to the type checker [4]. Because these become a breeding ground for runtime errors when misused, rigorous discrimination in their use is required.

| Assertion | Primary use and internal mechanism |
| :---- | :---- |
| T.cast(expr, Type) | The developer forcibly overrides the compiler's inference result and asserts that the value is of the specified type. It is heavily used for downcasts (converting from abstract to concrete). At runtime, the actual value is verified against the type, and a `TypeError` is raised on a mismatch [4]. |
| T.let(expr, Type) | Used when initializing a variable and the like, to explicitly specify a "wider type" than the compiler infers, or a particular interface. For example, it is indispensable when one wants a mere `FalseClass` to be treated as `T::Boolean`, or to give an empty array an element type [33]. |
| T.must(expr) | For an object whose return value may be nil (a nilable type), promises the compiler that, in a particular context, it is logically never nil. If nil is passed at runtime, it immediately raises an exception, ensuring the safety of subsequent processing [26]. |
| T.unsafe(expr) | The last resort that completely opts out of (escapes) the type checker's supervision and permits arbitrary method calls. It should be used in a limited fashion for extremely dynamic metaprogramming, or for type inconsistencies that simply cannot be resolved. It is applied to the receiver of the call, not to the argument itself [10]. |

### 3. The wall of dynamic metaprogramming, and supplementing it with shims

Methods that are dynamically added by metaprogramming such as `define_method` — within a gem's internal processing, or during Rails' initialization process — can slip past even Tapioca's in-memory introspection. When such an unknown method is called from application code, Sorbet reports an error.

**Solution:** In such situations, the best practice is an operational practice of not fleeing to `T.unsafe` but instead manually writing a type definition file called a "shim" [14]. Within the project's `sorbet/rbi/shims/` directory, one creates an RBI file that reopens the corresponding class and declares only the method name and a dummy implementation (`; end`) inside it [14]. This enables Sorbet's static analysis engine to recognize the method's existence and type signature, resolving the compile error while preserving type safety.

### 4. Hardware-architecture-dependent incompatibilities (M1/M2/Docker)

In some development environments, cases have been confirmed in which command execution fails at a fundamental level even though there is not a single error in the code or configuration. In particular, there exists an architecture-dependent incompatibility problem in which, when `srb tc` or Tapioca compile commands are run inside a Linux Docker container on a Mac equipped with Apple Silicon (M1/M2, etc.), a process crash due to "Illegal instruction" occurs, or completely empty RBI files are output [15].

**Solution:** As troubleshooting for this problem, which originates in hardware and container virtualization, one must switch to an operational flow that avoids running the type-checking tasks inside the Linux Docker container and instead runs the Sorbet and Tapioca commands directly on the local environment of the host Mac OS [15]. Because static analysis can be performed independently of the environment's OS, this approach can eliminate the obstacle to development work.

### 5. Inaccuracies in the Ruby standard-library RBIs, and the limits of keyword arguments

Sorbet embeds type information for Ruby's standard library as a collection of hand-written RBI files. However, cases in which these definitions diverge from reality or are incomplete are seen from time to time [11]. Particularly conspicuous are the standard methods that take keyword arguments (e.g., `Array#sample` or `Pathname#find`). Sorbet is poor at expressing processing whose return type changes depending on a keyword argument, and it uniformly infers the return value of `Array#sample` as a union type with an array, thereby causing a type error when one wants to extract a single element [11].

**Solution:** When confronted with this problem, an effective hack is for the developer to create, within the project's shim directory (`sorbet/rbi/shims/`), an RBI that reopens the standard class and to override the standard library's type definition with a strict signature for the particular argument pattern [11]. As a fundamental improvement, contributing to the community by sending a pull request directly to the Sorbet repository managed by Stripe and fixing the standard RBIs themselves is recommended by the official guidance [11].

## Conclusion

Adopting Sorbet in a Ruby on Rails project is not merely the addition of an analysis tool; it is a strategic investment that fundamentally rebuilds the development paradigm and architectural premises of a dynamically typed language.

The core insights gained from this analysis are as follows. First, the official standalone Sorbet setup cannot surmount the wall of Rails' advanced metaprogramming, and the DSL compilation and annotation management leveraging the Shopify-led "Tapioca" tool suite are indispensable. It is only through Tapioca's introspection that Rails' magic is translated into an interface amenable to static analysis.

Second, rather than aiming to achieve complete type safety in one fell swoop, adhering firmly to the philosophy of gradual typing through per-file strictness levels is the key to a project's success. In particular, what is required is the flexibility to combine realistic compromises appropriate to the constraints of the live environment — such as avoiding the performance overhead of runtime checks in the production environment, and applying type aliases for ActiveRecord relations.

Third, the problems that were long Sorbet's shortcomings — its "own verbose signature syntax" and its "forced runtime dependency" — have met a dramatic end with Shopify's native support for "inline RBS comments." In projects that adopt Sorbet from now on, by adopting the latest inline RBS format as the standard specification, it is possible to build an ideal type-safe environment that reconciles zero-overhead performance with Ruby's inherent readability.

The transition to static typing forces upon an organization, in the short term, a confrontation with countless type errors and a learning cost. However, a Sorbet ecosystem that is properly designed and incorporated into continuous integration will elevate implicit domain logic into explicit contracts such as POROs, and will function as an extremely robust technical foundation that gives developers firm confidence in "safe refactoring" even in codebases at the scale of millions of lines.

## References

1. [https://ja.wikipedia.org/wiki/Ruby_on_Rails](https://ja.wikipedia.org/wiki/Ruby_on_Rails)
2. RubyKaigi 2025レポート：FindyのRailsプロジェクトでSorbetの型チェックを試してみた, [https://tech.findy.co.jp/entry/2025/04/24/070000](https://tech.findy.co.jp/entry/2025/04/24/070000)
3. Unleashing the Power of Type Checking in Ruby with Sorbet - Harled Inc., [https://harled.ca/blog/unleashing_the_power_of_type_checking_in_ruby_with_sorbet](https://harled.ca/blog/unleashing_the_power_of_type_checking_in_ruby_with_sorbet)
4. Gradual Type Checking & Sorbet, [https://sorbet.org/docs/gradual](https://sorbet.org/docs/gradual)
5. Sorbet · A static type checker for Ruby, [https://sorbet.org/](https://sorbet.org/)
6. Overview - Sorbet, [https://sorbet.org/docs/overview](https://sorbet.org/docs/overview)
7. Introduction to Sorbet — Type Checking for Ruby - Medium, [https://medium.com/@dave_russell/introduction-to-sorbet-type-checking-for-ruby-996c1c90cc9a](https://medium.com/@dave_russell/introduction-to-sorbet-type-checking-for-ruby-996c1c90cc9a)
8. How I write and maintain type signatures in my Rails app with Sorbet | Connor Shea, [https://connorshea.gitlab.io/blog/how-i-write-and-maintain-type-sigs-in-my-rails-app-with-sorbet.html](https://connorshea.gitlab.io/blog/how-i-write-and-maintain-type-sigs-in-my-rails-app-with-sorbet.html)
9. Enabling Runtime Checks - Sorbet, [https://sorbet.org/docs/runtime](https://sorbet.org/docs/runtime)
10. Learn Sorbet in Y Minutes, [https://learnxinyminutes.com/sorbet/](https://learnxinyminutes.com/sorbet/)
11. Frequently Asked Questions - Sorbet, [https://sorbet.org/docs/faq](https://sorbet.org/docs/faq)
12. Getting Started with the Sorbet Type Checker in Rails - DEV Community, [https://dev.to/akshaynathan/getting-started-with-the-sorbet-type-checker-in-rails-2nmj](https://dev.to/akshaynathan/getting-started-with-the-sorbet-type-checker-in-rails-2nmj)
13. GitHub - Shopify/tapioca: The swiss army knife of RBI generation, [https://github.com/shopify/tapioca](https://github.com/shopify/tapioca)
14. Adding Sorbet to a Rails project - Nithin Bekal, [https://nithinbekal.com/posts/sorbet-rails/](https://nithinbekal.com/posts/sorbet-rails/)
15. 既にあるRailsプロジェクトにSorbetの静的型チェックを導入しました - Zenn, [https://zenn.dev/pharmax/articles/a010bacd5033a7](https://zenn.dev/pharmax/articles/a010bacd5033a7)
16. tapioca/README.md at main - GitHub, [https://github.com/Shopify/tapioca/blob/main/README.md](https://github.com/Shopify/tapioca/blob/main/README.md)
17. GitHub - chanzuckerberg/sorbet-rails: A set of tools to make the Sorbet typechecker work with Ruby on Rails seamlessly., [https://github.com/chanzuckerberg/sorbet-rails](https://github.com/chanzuckerberg/sorbet-rails)
18. Migration Guide / Moving from `srb rbi gems` · Issue #114 · Shopify/tapioca - GitHub, [https://github.com/Shopify/tapioca/issues/114](https://github.com/Shopify/tapioca/issues/114)
19. tapioca/manual/compiler_activerecorddelegatedtypes.md at main - GitHub, [https://github.com/Shopify/tapioca/blob/main/manual/compiler_activerecorddelegatedtypes.md](https://github.com/Shopify/tapioca/blob/main/manual/compiler_activerecorddelegatedtypes.md)
20. tapioca/manual/compiler_activesupportcurrentattributes.md at main - GitHub, [https://github.com/Shopify/tapioca/blob/main/manual/compiler_activesupportcurrentattributes.md](https://github.com/Shopify/tapioca/blob/main/manual/compiler_activesupportcurrentattributes.md)
21. tapioca/manual/compiler_actioncontrollerhelpers.md at main - GitHub, [https://github.com/Shopify/tapioca/blob/main/manual/compiler_actioncontrollerhelpers.md](https://github.com/Shopify/tapioca/blob/main/manual/compiler_actioncontrollerhelpers.md)
22. Tracking Adoption with Metrics - Sorbet, [https://sorbet.org/docs/metrics](https://sorbet.org/docs/metrics)
23. You Don't Need Types in Ruby | @zhisme :: signal over noise, [https://zhisme.com/articles/you-dont-need-types-in-ruby/](https://zhisme.com/articles/you-dont-need-types-in-ruby/)
24. Ruby's hidden gems: Sorbet - AppSignal Blog, [https://blog.appsignal.com/2024/09/18/rubys-hidden-gems-sorbet.html](https://blog.appsignal.com/2024/09/18/rubys-hidden-gems-sorbet.html)
25. Inline RBS comments support for Sorbet | Rails at Scale, [https://railsatscale.com/2025-04-23-rbs-support-for-sorbet/](https://railsatscale.com/2025-04-23-rbs-support-for-sorbet/)
26. Sorbet Journey, Part 3: A Typical Day Adding Sorbet to a Rails App - Alex Dunae, [https://dunae.ca/notes/2020/12/28/a-typical-day-adding-sorbet-to-rails.html](https://dunae.ca/notes/2020/12/28/a-typical-day-adding-sorbet-to-rails.html)
27. Just read Shopify's latest update on Sorbet — they've added support for inline RBS comments, and it's a game changer for type checking in Ruby!, [https://rubystacknews.com/2025/06/03/just-read-shopifys-latest-update-on-sorbet-theyve-added-support-for-inline-rbs-comments-and-its-a-game-changer-for-type-checking-in-ruby-%F0%9F%8E%AF/](https://rubystacknews.com/2025/06/03/just-read-shopifys-latest-update-on-sorbet-theyve-added-support-for-inline-rbs-comments-and-its-a-game-changer-for-type-checking-in-ruby-%F0%9F%8E%AF/)
28. Ruby: SorbetにRBSのインラインコメント機能が追加された（翻訳） - TechRacho - BPS株式会社, [https://techracho.bpsinc.jp/hachi8833/2025_05_22/151005](https://techracho.bpsinc.jp/hachi8833/2025_05_22/151005)
29. Inline RBS comments for seamless type checking with Sorbet - RubyKaigi 2025, [https://rubykaigi.org/2025/presentations/Morriar.html](https://rubykaigi.org/2025/presentations/Morriar.html)
30. tapioca/manual/compiler_activerecordrelations.md at main - GitHub, [https://github.com/Shopify/tapioca/blob/main/manual/compiler_activerecordrelations.md](https://github.com/Shopify/tapioca/blob/main/manual/compiler_activerecordrelations.md)
31. Use Rails relations in typing · Issue #1140 · Shopify/tapioca - GitHub, [https://github.com/Shopify/tapioca/issues/1140](https://github.com/Shopify/tapioca/issues/1140)
32. Sorbet Error Reference, [https://sorbet.org/docs/error-reference](https://sorbet.org/docs/error-reference)
33. sorbet - Confusion on when to use T.let vs. T.cast - Stack Overflow, [https://stackoverflow.com/questions/70698561/confusion-on-when-to-use-t-let-vs-t-cast](https://stackoverflow.com/questions/70698561/confusion-on-when-to-use-t-let-vs-t-cast)
34. Type Assertions - Sorbet, [https://sorbet.org/docs/type-assertions](https://sorbet.org/docs/type-assertions)
