---
title: "Adopting Rigor in Rails projects — a comprehensive practical guide (spec + community knowledge)"
description: "A comprehensive survey and practical guide to adopting Rigor in Rails projects, integrating the official specification with community knowledge."
sourceSha: "6c16af9d4cb8e945758ca265c2a09518b4f479ca790404506e18afcb4c426147"
sourceCommit: "ca611a0fa195c049e8e56b0aa4a78145864c4d54"
translationStatus: "translated"
---

## 1. Introduction: the evolution of type inference in the Ruby ecosystem and where Rigor fits

Ruby, a dynamically typed language, has for many years delivered overwhelming productivity in web application development centered on Ruby on Rails, thanks to the high expressiveness and flexibility afforded by its heavy use of metaprogramming. However, as a project grows in scale and moves into a long-running maintenance phase, the challenge intrinsic to dynamic languages — that type errors (especially NoMethodError) are not discovered until runtime — becomes apparent [1]. To address this problem, static type checkers such as Sorbet (developed by Stripe) and Steep and TypeProf (which came to be supported as part of standard Ruby) have spread through the community [3]. While these existing tools dramatically improved type safety, they also brought new challenges to development sites: the cost of writing type annotations, and the ongoing maintenance burden of RBS (Ruby Signature) files (so-called "RBS maintenance hell") [5].

Against this historical backdrop, "Rigor" is what presented an entirely new paradigm. Rigor is a CLI-first static analyzer for Ruby that makes type inference its top priority, keeps application code clean, and achieves zero runtime dependencies (no runtime dependency) [7]. This report discusses strategic approaches to adopting Rigor in Ruby on Rails projects, which carry complex domain logic and implicit behavior. In line with the user's request, it comprehensively covers setup procedures, post-adoption operations, best practices, and advanced troubleshooting techniques, while clearly distinguishing between Rigor's official materials (The Rigor Handbook and the official repository's documentation) and unofficial materials (the technical book *The Little chibirigor* by the developer tadsan, presentation materials from RubyKaigi and elsewhere, and knowledge from the developer community).

## 2. Setting up Rigor

Rigor's architecture is designed to harmonize closely with Rails-specific autoloading mechanisms and conventions. The adoption itself is a concise process through a package manager, but behind the scenes advanced configuration is performed to map Rails' dynamic nature onto static analysis.

### 2.1 The installation and initialization process defined by the official materials

According to the official repository's documentation and the Gem's specification, the essential requirement for running Rigor is an environment with Ruby 4.0.0 or later (below 4.1) [7]. Installation is completed by adding it to the project's Gemfile as a development dependency.

```ruby
gem 'rigortype', require: false
```

Specifying require: false here is defined as a required official step. This is because Rigor is not a library that gets loaded into memory at application runtime like Sorbet's runtime component; it functions as an independent CLI tool that scans the codebase from the outside during the development process and in CI (continuous integration) environments [2].

After installing the dependency, run the initialization command in the project's root directory.

```bash
rigor init
```

This command generates a configuration template file named .rigor.dist.yml inside the project [9]. The developer renames it to .rigor.yml and adjusts it to match their own project's structure. Rigor's analysis engine recognizes the directory containing this file as the project root and begins building the dependency graph [9]. The main configuration items recommended for Rails projects in the official materials are as follows.

| Configuration key | Role in the official materials | Meaning in a Rails project |
| :---- | :---- | :---- |
| rails_zeitwerk | Specifies the path resolution algorithm | Setting it to true adapts Rigor's module resolution mechanism to the conventions of Zeitwerk (the standard autoloader from Rails 6 onward — the rules that infer constant names from file paths). |
| autoload_paths | Specifies the root directories to search | Explicitly lists, as an array, the paths that Rails autoloads — app/models, app/controllers, app/services, app/jobs, and so on — telling Rigor the scope of analysis. |
| concern_dirs | Specifies special module namespaces | Specifies directories such as app/controllers/concerns, letting the inference engine correctly recognize the divergence between the module nesting structure and the file paths. |

By configuring these settings accurately, Rigor correctly reverse-derives the hierarchical structure of classes and modules from file placement and builds a static dependency graph of the entire Rails application [9].

### 2.2 The depth of setup revealed by unofficial materials and community knowledge

Configuration items treated in the official procedure as mere entries in a config file become far clearer as to why they are indispensable in Rails once you unravel the community's technical documents and the design discussions (ADRs) within the repository.

In Rigor's internal architecture, source-code parsing uses ruby-prism, a parser crate implemented in Rust, and constructs the AST (abstract syntax tree) in memory using the fast arena allocator of the bumpalo crate [3]. After this fast parsing phase, Rigor operates a "plugin mechanism" to statically understand methods that Rails generates dynamically through metaprogramming (for example, ActiveJob's perform_later or ActionMailer's deliver_now) [10].

According to an unofficial design document (20260602-plugin-boilerplate-reduction-plan.md), Rigor has a mechanism to statically emulate the behavior of ActiveSupport's Inflector (the module that performs singular/plural conversion and underscoring) [10]. Rails-project-specific routing helpers (e.g., user_path) and model associations (the users method inferred from has_many :users) are backed by this static-analysis plugin for the Inflector [10]. Therefore, community investigation has made clear that the .rigor.yml settings do not stop at merely specifying paths — they function as the foundation for accurately bootstrapping this suite of advanced AST-walker plugins.

## 3. Operations required after adoption and integration into the CI/CD pipeline

Immediately after Rigor's setup is complete, you face the operational challenges of processing the first analysis results against the existing codebase and of how to integrate that into the team's development flow. Here we explain by contrasting the official specification with unofficial approaches practiced in the field.

### 3.1 The initial inspection and establishing a baseline as defined by the official materials

After initializing Rigor, the developer runs the following command to perform a type check across the whole project.

```bash
rigor check
```

This command analyzes the AST of the entire source code and verifies method callability and type consistency [9]. When Rigor is first introduced into a large Rails project that has been operated for many years, it is common for hundreds to thousands of warnings to be output. The official "The Rigor Handbook" and the manual strongly recommend a gradual approach — instead of trying to fix all the warnings in existing code immediately, recording the current error state as a "baseline" [11].

By setting a baseline, it becomes possible to turn a blind eye to past technical debt while enforcing strict checks only on newly added code and on the diffs being changed. In addition, for localized spots where Rigor simply cannot prove the type — due to overly dynamic metaprogramming, for instance — an official feature is provided to mute warnings using the following suppression directive [12].

```ruby
# rigor:disable
```

In the official manual, each diagnostic rule (Diagnostics) is assigned a Rule-ID, and the operational practice of progressively raising the severity profiles (Severity profiles) in step with the project's maturity is defined as a best practice [12].

### 3.2 Field operational strategies and architecture inspection shown by unofficial materials

In addition to the baseline feature the official materials provide, the developer community practices architecture inspection using the module dependency data that Rigor produces as a byproduct. The unofficial third-party tool rigor-module-graph uses the module resolution graph that Rigor builds to analyze package boundaries within a Rails project [9].

This is an approach similar to boundary-checking tools such as Packwerk (developed by Shopify): by outputting the JSONL-format edge data that rigor check generates, it is used as a metric for visualizing and refactoring the tightly coupled Rails-specific architecture in which "any model is called from any place" [9].

Furthermore, according to field knowledge shared at events such as Kansai Ruby Kaigi 09 and Sekigahara Ruby Kaigi 01, adopting Rigor brings the major benefit of reducing RBS file maintenance costs. In conventional Steep and Sorbet operations, it was essential to auto-generate RBS files using tools like rbs-inline or rbs_rails and to run a CI pipeline that continuously regenerated files in step with dependency-library updates (the struggle with Dependabot and Renovate) [5]. Because Rigor breaks free from this "RBS dependency" and takes the approach of inferring types directly from the behavior of the code itself, there are reports that it dramatically reduces the effort spent on post-adoption operations and maintenance [5].

## 4. Best practices: designing code to make the most of inference

The core of making Rigor succeed in a Rails project is not to force type annotations onto the tool, but to write plain, Ruby-like code that Rigor's inference engine can understand types from naturally.

### 4.1 Structural typing and narrowing recommended by the official Handbook

The official document "The Rigor Handbook" is a systematic guide written for Ruby programmers who lack background knowledge of static typing [11]. The best practice most emphasized there is "narrowing" (narrowing the type) based on control flow, and the use of "Shape" (structure) for Ruby-specific data structures.

#### Fixing types via narrowing (Narrowing)

Rigor tracks the state of variables per branch. For example, when an ActiveRecord query result is User | nil, rather than writing an explicit type cast, the approach is to let the inference engine fix the type using standard Ruby syntax.

```ruby
user = User.find_by(id: params[:id])
# ここでの user の型は `User | nil` (Union型)

if user.nil?
  return render status: :not_found
end

# 制御フローがここを通過した場合、Rigorは user の型を確実な `User` として扱う
user.update!(last_login_at: Time.current)
```

This approach — using if, case, or predicate methods (Predicate methods) that return a boolean to whittle down the types a variable can take — is an officially recommended pattern that ensures safety without harming code readability [11].

#### Leveraging structural typing (Tuples and Hash Shapes)

In Rails applications, hashes and arrays are used frequently instead of model instances when communicating with external APIs or exchanging JSON with the frontend. When Rigor can statically prove the layout of a literal expression ([a, b, c] or {key: value}), it infers it not as a mere Array or Hash but as a strict "tuple" or "hash shape" [11].

Furthermore, the official specification provides Shape-projection functions (Shape-projection functions), analogous to TypeScript's Utility Types, powerfully supporting the type definition of dynamic hashes [11].

| Projection function | Effect | Example use case in Rails |
| :---- | :---- | :---- |
| pick_of | Generates a Shape that extracts only the specified keys | Defining the return value of a serializer that pulls only the required attributes from a JSON response. |
| omit_of | Generates a Shape that excludes the specified keys | Defining the structure of an API response with password hashes and internal IDs excluded. |
| partial_of | Generates a Shape with all keys made optional | A parameter hash passed to an update method that contains only some of the attributes. |
| required_of | Generates a Shape with all keys made required | A strict data structure after passing validation, in which no field may be missing. |
| readonly_of | Generates an immutable Shape | Representing configuration values turned into constants or frozen hash objects. |

By leveraging these features, you can pass data type-safely while keeping it as hash objects, without defining complex classes in your Ruby code [11].

### 4.2 The gradual philosophy of "never frighten working code" seen in unofficial materials

While the official materials focus on "how to make it infer," the technical book *The Little chibirigor* by the developer tadsan (Nyander Swan) and various presentation materials reveal a deeper design philosophy: "how far to give up on inference" [13].

Ruby also has an approach, like TypeProf, that "executes the entire program at the type level," reverse-deriving everything from a method's callers to its argument types in order to generate RBS [15]. However, Rigor (and chibirigor, the model for learning) deliberately does not adopt this technique. Whole-program execution tends to cause state explosion (State explosion) in a large and complex codebase like Rails, becoming a cause of either exponentially growing inference time or a flood of false positives [15].

The heart of Rigor's architecture is "bottom-up composition." Its basis is to build types upward from the expressions as written, and in principle it does not reverse-derive argument types from the callers. When an argument's type is unknown, Rigor cleanly treats it as untyped (in the internal representation, Dynamic[top]) [11]. This is not a "defeat" of static analysis. It is the design choice that tadsan advocates — "never frighten working code" — releasing what is unclear as unclear and warning only on spots that are definitely contradictory (for example, calling the upcase method on an Integer), thereby securing the checker's silence and scalability [14].

This approach is widely supported in the community as "duck-typing-inspired heuristic inference." Rigor embodies the new set of values proposed in Shia's talk "Good Enough Types" at RubyKaigi 2026 and in dak2's "No Types Needed, Just Callable Method Check" — namely that "complete type proof is unnecessary, and for practical purposes it is enough merely to confirm whether a method is callable (Callable Method Check)" [3]. Therefore, the greatest best practice in a Rails project is: "Do not obsess over fully annotating types; entrust yourself to Rigor's duck-typing heuristics and keep your Ruby code natural."

## 5. Troubleshooting when types are not inferred as expected

Even with Rigor's inference-first philosophy, the extremely dynamic nature of Ruby and Rails makes it unavoidable that the inference engine sometimes fails to pin down a type and emits untyped or NoMethodError-equivalent warnings. In such situations, we explain how you should isolate the problem and assist the inference engine, from both the official techniques and unofficial architectural knowledge.

### 5.1 Debugging tools and workarounds provided by the official materials

To investigate why Rigor interpreted a particular variable the way it did (or why it failed to interpret it), two powerful internal-state inspection methods are officially provided [12].

* **dump_type(expr)**: When you place this method call in your code and run rigor check, the checker dumps the inference result of the specified expression (expr) at that line directly to standard output or the log 11. This lets the developer grasp in real time how Rigor sees a variable.
* **assert_type(expr, ExpectedType)**: Statically asserts whether the specified expression matches the type the developer intends (ExpectedType) 11. When it does not match, Rigor reports an error during the analysis phase, so it functions as a breakpoint for identifying at which stage of a complex method chain the type information was lost.

If investigation using these tools reveals that an overly dynamic method definition (such as runtime method addition via define_method) is the cause and it exceeds Rigor's limits, the official Handbook recommends, as a last resort, "nudging" the inference using "RBS" and its extended version "RBS::Extended" [11]. Without polluting the code body with redundant type annotations, you can define signatures in RBS in a separate file and inject them into Rigor's inference engine as external truths (Roots), letting you break through the wall of what cannot be inferred.

### 5.2 The root causes of inference failure and Rails-specific responses uncovered by unofficial materials

Whereas the official materials teach "how to deal with it," unofficial materials and internal design discussions provide a deep understanding of the mechanism behind "why the type was not inferred." The typical patterns in which Rigor's inference breaks down in a Rails project are as follows.

#### Failure of MethodRegistry lookup due to dynamic dispatch

Inside Rigor, a hash map called MethodRegistry — lookupable in O(1) (`HashMap<(ReceiverType, MethodName), MethodInfo>`) — is in operation [3]. For example, if it is statically established that the receiver is of type String and the method name is upcase, the information "the return value is of type String" can be pulled from this registry immediately [3]. However, as with send (dynamic_method_name) or public_send, when the method name being called depends on a runtime variable or string interpolation, Rigor — which walks the AST statically — cannot pin down the MethodName and cannot consult the registry. As a result, the return value inevitably becomes untyped. The solution is either to refactor the code into a statically analyzable form, or to supply an explicit signature via the aforementioned RBS.

#### The divergence and limits of Union types

After passing through complex conditional branches or processing a huge collection, a variable's type can balloon into a massive Union type such as String | Integer | Array | nil [1]. When a variable can take multiple types, Rigor's inference engine tends, for safety's sake, to reject any method other than "those that are commonly callable across all the types." In this case, it should be viewed not as a flaw in the inference engine but as a sign of code design that burdens a single variable with too many responsibilities. By splitting methods into smaller pieces and thoroughly applying narrowing via early return (Early return), the inference engine gets back on track.

#### Mismatch between Rails' Inflector and plugins

In a Rails project, if URL helpers (e.g., admin_user_path) or dynamic methods from model associations are suddenly reported as NoMethodError, there is a high likelihood that Rigor's internal plugin mechanism and the Rails project's configuration have diverged. As mentioned earlier, Rigor's AST-walker plugin statically imitates ActiveSupport's Inflector [10]. If your project defines special irregular singular/plural rules (Irregular rules) in its own config/initializers/inflections.rb, and Rigor's static parser has not correctly loaded that initialization file, then the string conversion fails and it loses track of the method name. In such cases, you need to check whether the analysis path to the initialization code is correctly configured in the config file (.rigor.yml), or whether a Rigor version upgrade has changed the support status of the relevant plugin (tracking ADRs, and so on) [10].

## 6. Conclusion and recommendations

Through the analysis in this report, it has been shown that Rigor is an extremely innovative and practical option for ensuring type safety in Rails projects. Whereas existing approaches such as Sorbet and TypeProf each carry challenges — the cost of writing type annotations, and the scalability issues of whole-program execution — Rigor adopts a decisive design of "inference first" and "duck-typing-based heuristics."

The essentials for leading a Rails project's Rigor adoption to success come down to the following three points.

1. **Thorough gradual adoption:** After accurately configuring the Zeitwerk and autoload paths in .rigor.yml, absorb the warnings in existing code as a one-time baseline. Rather than aiming for perfect typing from day one, use it as a breakwater that ensures the safety of the code newly added in each day's pull requests.
2. **Design that trusts Ruby's semantics:** Break away from a programming style that satisfies the compiler with type annotations, and leverage "narrowing" (Narrowing) via early returns and guard clauses, and literal-based "Shape." Writing plain Ruby code that Rigor's inference engine naturally understands the context of is itself the best refactoring.
3. **Troubleshooting that accepts the limits of inference:** The occurrence of untyped is not a defeat of static analysis but an expression of Rigor's philosophy of "never frighten working code." Use dump_type and assert_type to identify where the analysis breaks, and perform surgical "nudging" with RBS only for the metaprogramming areas where static proof is genuinely difficult.

The greatest value Rigor brings is that it lays down a "Good Enough" safety net while recovering the "joy of writing Ruby" and the "productivity" that tend to be lost in the pursuit of type strictness. By operating it with a deep understanding of its design philosophy and internal mechanisms, the maintainability and development speed of a Rails project can be raised over the long term.

## References

1. The Ruby Type Checker - Department of Computer Science, [https://www.cs.tufts.edu/~jfoster/papers/oops13.pdf](https://www.cs.tufts.edu/~jfoster/papers/oops13.pdf)
2. Unleashing the Power of Type Checking in Ruby with Sorbet - Harled Inc., [https://harled.ca/blog/unleashing_the_power_of_type_checking_in_ruby_with_sorbet](https://harled.ca/blog/unleashing_the_power_of_type_checking_in_ruby_with_sorbet)
3. ちょっとすごいRubyの型チェッカーを作ってます｜にゃんだーすわん - pixivFANBOX, [https://tadsan.fanbox.cc/posts/11959067](https://tadsan.fanbox.cc/posts/11959067)
4. Sorbet · A static type checker for Ruby, [https://sorbet.org/](https://sorbet.org/)
5. 関ケ原Ruby会議01のGoldスポンサーをしました - リーナー開発者ブログ, [https://developer.leaner.co.jp/entry/regional-rubykaigi-sekigahara01](https://developer.leaner.co.jp/entry/regional-rubykaigi-sekigahara01)
6. 拙者、『型は欲しいが型は書きたくない』者たちとの和睦を結び、るびぃにおける型の領地安堵を実現せんと欲す者也 #sekigahara01/sekigahara01 - Speaker Deck, [https://speakerdeck.com/sanfrecce_osaka/sekigahara01](https://speakerdeck.com/sanfrecce_osaka/sekigahara01)
7. rigortype | RubyGems.org | your community gem host, [https://rubygems.org/gems/rigortype](https://rubygems.org/gems/rigortype)
8. GitHub - rubocop/rubocop: A Ruby static code analyzer and formatter, based on the community Ruby style guide., [https://github.com/rubocop/rubocop](https://github.com/rubocop/rubocop)
9. rigor-module-graph 0.1.3 on Rubygems - Libraries.io - security, [https://libraries.io/rubygems/rigor-module-graph](https://libraries.io/rubygems/rigor-module-graph)
10. rigor/docs/design/20260602-plugin-boilerplate-reduction-plan.md at master - GitHub, [https://github.com/rigortype/rigor/blob/master/docs/design/20260602-plugin-boilerplate-reduction-plan.md](https://github.com/rigortype/rigor/blob/master/docs/design/20260602-plugin-boilerplate-reduction-plan.md)
11. rigor/docs/handbook/README.md at master · rigortype/rigor · GitHub, [https://github.com/rigortype/rigor/blob/master/docs/handbook/README.md](https://github.com/rigortype/rigor/blob/master/docs/handbook/README.md)
12. rigor/docs/manual/README.md at master · rigortype/rigor · GitHub, [https://github.com/rigortype/rigor/blob/master/docs/manual/README.md](https://github.com/rigortype/rigor/blob/master/docs/manual/README.md)
13. The Little chibirigor - Zenn, [https://zenn.dev/tadsan/books/the-little-chibirigor](https://zenn.dev/tadsan/books/the-little-chibirigor)
14. この本について｜The Little chibirigor - Zenn, [https://zenn.dev/tadsan/books/the-little-chibirigor/viewer/about](https://zenn.dev/tadsan/books/the-little-chibirigor/viewer/about)
15. Part 0はじめに：推論を土台にした型チェッカー｜The Little chibirigor - Zenn, [https://zenn.dev/tadsan/books/the-little-chibirigor/viewer/part0-introduction](https://zenn.dev/tadsan/books/the-little-chibirigor/viewer/part0-introduction)
