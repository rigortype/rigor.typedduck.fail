---
title: "Adopting Steep in Ruby on Rails projects — a comprehensive survey (spec + community practice)"
description: "A comprehensive survey of adopting Steep in Rails projects, integrating official specifications with community practical know-how across setup, operations, best practices, and troubleshooting."
sourceSha: "f5d511998e592be16abb4f1af7728d09db0db1f86875027e8144eb5a9a67d218"
sourceCommit: "ca611a0fa195c049e8e56b0aa4a78145864c4d54"
translationStatus: "translated"
---

## 1. Introduction: The Inevitability of Static Analysis for a Dynamically Typed Language, and an Architectural Overview

Since the 2010s, the current of software engineering has leaned heavily toward the adoption of statically typed languages. In response to this paradigm shift, Yukihiro Matsumoto, the designer of Ruby, presented a future of "static type checking without type declarations," armed with abstract interpretation[1]. As the first step toward this vision, the type definition language "RBS" and the type analysis tool "TypeProf" were bundled with the standard distribution starting from Ruby 3.0[1]. In addition to these, the type checker developed with the aim of providing rigorous static type checking and a powerful LSP (Language Server Protocol) is "Steep (soutaro/steep)"[2].

Steep is a static analyzer that detects inconsistencies between source code and RBS before the program runs, and it embodies a design philosophy that demands explicit type declarations over type inference[4]. Multiple type-related tools exist in the Ruby ecosystem, but they adopt different architectures in terms of inference strength, checking strictness, and execution speed.

| Tool name | Primary role and approach | Inference strength | Checking strength | Analysis speed |
| :---- | :---- | :---- | :---- | :---- |
| **TypeProf** | An analyzer that abstractly interprets real code and automatically generates RBS files (type definitions)[6]. | Strong | Weak | Slow[1] |
| **Steep** | A static checker that rigorously verifies the consistency of real code against the prepared RBS definitions[6]. | Weak | Strong | Fast[1] |
| **Sorbet** | Rather than RBS in separate files, it describes types within Ruby code using a proprietary DSL (RBI/sig), and also provides runtime checking[2]. | Moderate | Strong | Extremely fast[7] |

This report examines the process of introducing Steep to Ruby on Rails (hereafter, Rails) projects — a framework that, unlike pure Ruby scripts, makes heavy use of metaprogramming and dynamic dispatch. In doing so, it rigorously distinguishes the paradigm of the "official materials" as specified by the language implementers and the Steep developers from that of the "unofficial materials (community practical know-how)" that development organizations in the field have produced through trial and error, and it unravels the whole picture from setup to operations to troubleshooting.

## 2. Setup Procedure: Building the Static Foundation and Resolving the Dynamic DSL

Introducing Steep into a Rails project is composed of a two-tiered structure: the official procedure that initializes the basic type-checking engine, and the community-driven extension procedure that makes the type checker recognize Rails-specific black magic (dynamic methods).

### 2.1 The Standard Setup Sequence Specified by the Official Materials

In the official documentation, the process of introducing Steep starts from a rigorous separation of implementation and type definitions. First, in the Gemfile that manages the project's dependencies, you declare gem 'steep', require: false limited to the development group and run the installation[4].

Next, you run the steep init command from the CLI to generate the configuration file Steepfile — which determines the type-checking behavior — in the project's root directory[4]. Within this configuration file, it is possible to define multiple contexts (targets), assigning different analysis scopes to the application code, test code, and library code respectively. Specifically, inside a target :app do ... end block, you explicitly describe the check directories that specify the paths of the real code (e.g., app or lib), the signature directories that store the type signatures (e.g., sig), and the standard libraries you depend on (e.g., pathname or set)[4]. Furthermore, using the configure_code_diagnostics block, you describe the settings that control the strictness of the checking (Diagnostics), which is discussed later[9].

Once the initial configuration is complete, you create .rbs files under the sig/ directory and declare types. In the official procedure, to reduce the burden of writing RBS from scratch, the recommended approaches are to statically generate prototype type definitions from the abstract syntax tree (AST) of existing Ruby code using the rbs prototype rb command, or to dynamically extract type definitions from the runtime state of objects using rbs prototype runtime[10]. Finally, by running steep check from the command line, the static consistency check between the real code and the RBS signatures begins[4].

### 2.2 The Rails-Specialized Setup and Dependency Resolution Presented by the Unofficial Materials

If the aforementioned official procedure is applied to a Rails project as-is, a large number of false-positive errors occur, and the analysis effectively breaks down. The causes are the metaprogramming that Rails uses heavily (dynamic generation of column accessors and scopes via method_missing and define_method) and the dependence on an enormous number of third-party gems. To overcome this problem, the community has standardized the introduction of advanced dependency resolution and dynamic analysis tools.

First, the introduction of rbs_collection to resolve type definitions for external gems becomes unavoidable. By running bundle exec rbs collection init to generate rbs_collection.yaml, and then running rbs collection install, the type information for the various gems the project depends on (actionpack, activerecord, etc.) is downloaded in bulk from the official gem_rbs_collection repository into the .gem_rbs_collection/ directory[3]. At this point, if a gem exists whose type definition file itself contains a syntax error (according to community reports, meta-tags and the like), a workaround of explicitly specifying ignore: true within rbs_collection.yaml to skip loading that gem's types — in order to prevent the entire analyzer from crashing — is widely practiced[11].

Second, the incorporation of dedicated generators that automatically generate type definitions for Rails-specific dynamic methods, starting with ActiveRecord models. Currently, two powerful tools mainly compete for supremacy in the community, and one is chosen depending on the project's requirements[14].

| Generator name | Architecture and characteristics | Community evaluation and use cases |
| :---- | :---- | :---- |
| **rbs_rails** | It runs a Rake task (rbs_rails:all) after loading the Rails application context, and statically outputs RBS from ActiveRecord schema and routing information[2]. | It has an extremely large number of adoption cases and is a stable de facto standard. Because there is an abundance of information, it is regarded as the safest choice for the initial introduction of types[14]. |
| **orthoses-rails** | It is built on top of the flexible middleware foundation called orthoses, hooking the dynamic definition of modules and methods at application load time to extract a broader range of metaprogramming traces as RBS[14]. | Because it can attach types even to complex DSLs and proprietary Rails plugin extensions that rbs_rails cannot fully cover, its adoption has been increasing in recent medium-to-large-scale projects[14]. |

Only when the large body of RBS files generated using these tools and the type information for external dependencies provided by rbs_collection are both in place does Steep become ready to correctly abstractly interpret the whole of a Rails project and perform practical static analysis[7].

## 3. What Is Required After Introduction: Operational Requirements for Type Assets and Integration into Team Development

In the world of static typing, type definitions are not something you write once and are done with; they are "executable documentation" that should be continuously maintained as the application grows. Even in the post-introduction operational phase, there exists both the ideal paradigm envisioned by the official materials and the community's automation paradigm born out of the constraints of the field.

### 3.1 The Operational Paradigm and the Trend Toward Inline Types Led by the Official Materials

The maintenance work presupposed by the official ecosystem is that every time a developer changes Ruby logic, they manually update the corresponding .rbs file in parallel, always maintaining a state that passes steep check[4].

However, the fact that the implementation and type-definition files are physically separated increases context switching during development and tends to invite drift (staleness) in the type definitions. As the official answer to this problem, rbs-inline is being developed at a rapid pace in recent years[7]. This is an approach that embeds type information as special comments (magic comments) within the Ruby source code and dynamically generates RBS files via a transpiler. Specifically, you write # rbs_inline: enabled just before a class declaration, and either write # @rbs (String) -> String above a method, or attach an annotation inline as #: (String) -> String immediately after the method-definition line[20]. According to the official materials, rbs-inline is positioned as a prototype feature slated to be integrated into RBS proper in the future, and it is strongly recommended as the next-generation standard operational flow for keeping type and implementation consistent without taking your eyes off the editor[20].

### 3.2 The Automation Pipeline Built by the Unofficial Materials and Adaptation to Development Culture

In an actual Rails development team, demanding advanced manual RBS maintenance from every developer risks causing a dramatic drop in development speed and frustration, hollowing out the very introduction of types[11]. Therefore, in real-world projects, a thorough reduction of toil (wasted effort) and an automation paradigm centered on CI (continuous integration) are built.

The first watershed in operations is the question of whether or not to include the automatically generated type-definition files (files under .gem_rbs_collection/ or sig/rbs_rails/) in the version control system (Git). As a mainstream community practice, the approach of adding these to .gitignore and excluding them from repository management is supported[11]. The reason is that every gem update or subtle change to the DB schema produces diffs of thousands of lines of type definitions, and this prevents the mass production of noisy pull requests for human reviewers[11].

To support this version control strategy, the process of automatically generating and checking type definitions is firmly incorporated into the CI/CD pipeline. As a concrete operational example, one can cite building a workflow that uses a GitHub Actions cron job to automatically run rbs collection install and the rbs-inline transpilation process late at night, and has a bot automatically create a pull request only when a diff arises[21]. This frees developers from the mechanical task of generating type definitions, allowing them to concentrate on implementing pure business logic.

As a more advanced operation, there are also reported cases of incorporating LLMs (large language models) into the maintenance and migration of type definitions. When bulk-converting old YARD documentation remaining in an existing project into rbs-inline format, or when TypeProf's inference results fall back to broad untyped (undefined types), an operation of giving AI agents such as RBS Goose or Roo Code the context of the static analysis and having them refine the types into concrete class types has produced results at the level of real-world operation[21].

## 4. Best Practices: Design That Maximizes the Benefits of the Type System and Minimizes Friction

The attempt to retrofit a type system onto Ruby, which has no static typing, is always a battle against the trade-off between "the expressiveness of types" and "the conciseness of description." This section contrasts and explains the official recommended syntactic design for driving Steep's analysis engine accurately, and the community's own mitigation strategies for not spoiling the development experience in Rails projects.

### 4.1 The Static-Analysis-Friendly Design Demanded by the Official Materials

When abstractly interpreting Ruby's dynamic behavior, Steep places importance on the static description in the source code (the AST). Therefore, attaching explicit annotations to correctly guide the compiler is defined as an official best practice[4].

First, the thorough use of the @dynamic annotation. In Ruby, it is routine to generate methods using attr_reader, delegate, and so on, but because no def construct exists in the source code, Steep judges these as errors ("exists in RBS but no implementation can be found (MethodDefinitionMissing)")[4]. To avoid this, the specification requires that you write an annotation such as # @dynamic name, contacts inside the class definition, making explicit that the method in question is dynamically implemented and thereby skipping the static check[4].

Second, the use of the @type var annotation to compensate for the constraints of flow-sensitive typing[4]. For simple conditional branches such as is_a? or nil?, Steep can safely narrow the type inside the block. However, in cases such as branching with a case statement over untyped external input or a complex union type (e.g., Phone | Email), the compiler may be unable to fully pin down the type of the variable. In such situations, inserting an annotation that explicitly casts the type of a local variable — such as # @type var other: Phone — immediately before or after the conditional branch, giving the compiler a type hint, becomes an essential practice[4].

### 4.2 The "Effortless Type Introduction" and Gradual Adaptation Advocated by the Unofficial Materials

Applying the strict official practices above to an entire Rails application constitutes an extremely high barrier to introduction. Thus, from the community — especially the group of companies operating large-scale production environments — a pragmatic best practice has been advocated: "do not make passing the type check the ultimate goal; maximize coding assistance in the editor (LSP)." This paradigm is called "effortless type introduction" within the community[11].

The core of this approach lies in intentionally silencing all error messages (Diagnostics) caused by type inconsistencies in the Steepfile configuration. Specifically, you configure the Steepfile as follows. The intent of the setting is to assign nil to D::Ruby::ALL, or to use the future API configure_code_diagnostics (D::Ruby.silent) to instruct Steep to ignore all warnings[9]. With this decisive setting, developers are freed from the enormous drudgery of fixing type errors, while purely enjoying the benefits — through the LSP — of the automatically generated ActiveRecord methods and relations: powerful input completion and documentation display on hover[11]. Moreover, not only on the CLI and in the editor but also in REPL environments such as katakata_irb, runtime method completion leveraging this static type information improves dramatically, and it has been demonstrated that development efficiency is boosted by leaps and bounds[11].

Furthermore, even when partially enabling type-check errors with the aim of catching bugs in advance, a big-bang approach of subjecting the entire application to checking at once is avoided. Using the check directory specification in the Steepfile, a gradual (incremental) introduction — starting first with a small set of modules with few side effects, then moving to the core domain of app/models, and finally to app/services where logic is intricately intertwined — is shared as an iron rule for preventing breakdown[7].

## 5. Troubleshooting When Types Do Not Attach as Expected

In the process of applying static analysis to legacy code without type declarations, or to a Rails codebase that is the pinnacle of metaprogramming, you encounter countless errors such as type mismatches and undefined methods (NoMethod). This section details the official escape hatches that Steep provides and the community's workarounds for Rails-specific black magic.

### 5.1 The Analysis-Suppression Mechanisms Provided by the Official Materials

As development proceeds, situations inevitably arise involving advanced abstractions that exceed the compiler's inference capability, or where you want to temporarily defer the resolution of types. To handle these situations, Steep provides flexible error-suppression features.

First, the steep:ignore comment feature officially introduced in Steep 1.7.0[8]. Unlike the conventional settings applied to the entire project, this is a feature that disables type checking pinpointed to specific lines or specific blocks of code. Writing # steep:ignore at the end of a line ignores all errors on that line, and by specifying an error type as in # steep:ignore NoMethod, you can suppress only a specific warning[8]. Also, when targeting a broad range of processing, by enclosing an entire block with # steep:ignore:start and # steep:ignore:end, it is possible to safely quarantine legacy code that is difficult to refactor from the scope of analysis[8].

Second, the baselining of errors using the --save-expectations option, which shows its power when introducing Steep into an existing project[19]. When it is impossible to immediately fix the enormous number of existing type errors, running steep check --save-expectations lets you save all currently occurring error information in YAML format. From the next check onward, by setting with_expectations = true and running, the saved errors are tolerated as "known violations," realizing an operation in which CI detects only the type errors of code newly added thereafter[19].

Third, the active use of untyped (unspecified type) built into the RBS type system itself[8]. Since RBS 3.5, the syntax for explicitly indicating that no type checking is performed on arguments or blocks has been strengthened, and for passing complex hashes that are difficult to statically analyze, or for the arguments of dynamic methods, deliberately falling back to untyped rather than forcibly defining a strict type is treated as a correct measure even within the official ecosystem[8].

### 5.2 The Rails-Specific Obstacles and Practical Workarounds Elucidated by the Unofficial Materials

The majority of type errors in a Rails application stem not from a developer's coding mistake, but from an impedance mismatch between the behavior of the core classes that ActiveSupport has extended and Steep's abstract-interpretation engine. The community has analyzed these frequently occurring errors and accumulated workarounds such as the following.

#### Errors Stemming from ActiveSupport's Dynamic Expressions

Rails-specific metaprogramming expressions that are not Ruby's standard methods are difficult for Steep to recognize. For example, calling the accessor of a class attribute defined using class_attribute immediately results in a NoMethod error because no signature for it exists in RBS[26]. The limitations in type narrowing are also serious. Steep can narrow the type of a variable through conditional branches by nil? or is_a? (e.g., determining Integer? to be Integer)[5]. However, when the blank? or present? methods, heavily used in Rails development, are used in a conditional branch, Steep does not recognize these as type-guard functions at the compiler level, so no narrowing occurs inside the block either, and as a result NoMethod errors keep occurring[26]. The most effective workaround for this problem is to refactor the Ruby-side implementation to match the type checker's behavior. That is, by replacing if user.present? with if user (a direct nil check), or rewriting user.present? ? user.name : nil into Ruby's standard lonely operator user&.name, you can make Steep's flow-sensitive type inference function correctly[26].

#### Insufficient Type Definitions for Third-Party Gems and Monkey Patches

When using extension gems that dynamically add methods to ActiveRecord model classes — such as kaminari (pagination), discard (soft deletion), and draper (decorators) — merely installing gem_rbs_collection does not provide the types of those methods to project-specific models (for example, the User class), and calls such as User.page（1） all become NoMethod[26]. The community's countermeasures for this challenge are as follows.

1. Adopt the aforementioned middleware-based type generators such as orthoses, and have them automatically generate RBS by hooking the state in which modules have been included at runtime17.
2. Either hand-write type-definition stubs for individual models, or use an AI agent to automatically generate and apply the missing RBS monkey patches24.
3. Wait for an update on the generator side (such as an extension to rbs_rails), and for now use steep:ignore comments to uniformly hide the warnings26.

#### False Positives and Method Signature Inconsistencies

Because Steep is a very strict checker, in cases of method delegation via metaprogramming (delegate or method_missing), if the actual number of arguments or the handling of keyword arguments differs even slightly from the RBS definition, it reports a wide variety of errors. The table below shows the frequently occurring diagnostic errors (Diagnostics) and their occurrence mechanisms[30].

| Error code (Diagnostic ID) | Occurrence mechanism and community countermeasure |
| :---- | :---- |
| **Ruby::MethodDefinitionMissing** | A method defined in RBS does not exist in the real code (Ruby) (it is dynamically generated by attr_reader or the like). Avoid it by attaching a @dynamic annotation[4]. |
| **Ruby::MethodArityMismatch** | Occurs when something that should be passed as a keyword argument is passed as a positional argument, or when the number of arguments does not match RBS. For delegation methods and the like, mitigate it by redefining the arguments on the RBS side as `(*untyped) -> untyped`[24]. |
| **Ruby::DifferentMethodParameterKind** | Occurs when, despite an argument being optional, the `?` prefix has been forgotten in the argument definition on the RBS side. Fix the RBS signature[30]. |
| **Ruby::BreakTypeMismatch** | Occurs when returning a value with break from inside a block, and it does not match the block's return-value type defined in RBS[30]. |
| **Ruby::InvalidIgnoreComment** | Occurs when the syntax of a steep:ignore comment is wrong (for example, another string is included before or after it). Be thorough about writing it on a standalone line[26]. |

In this way, troubleshooting when types do not attach as expected inevitably requires a mutual convergence from both directions: an approach that loosens the constraints on the Steep side (RBS), and an approach that refactors the Ruby-side implementation to be static-analysis-friendly.

## 6. Conclusion

Introducing Steep into a Ruby on Rails project is a grand reconciliation effort between the flexibility of a framework that could be called the pinnacle of dynamic languages, and the rigorous order that static analysis demands.

The official materials provide a robust framework that logically and rigorously guarantees the consistency of types by making full use of the meticulous configuration of the Steepfile, annotations such as @dynamic and @type var, and the latest features such as steep:ignore and rbs-inline. On the other hand, the community operating actual production environments has coolly assessed the initial cognitive load and enormous operational cost that this rigor brings, and has established an extremely pragmatic paradigm (effortless type introduction): thorough automatic generation of type information using rbs_rails and orthoses-rails, together with "silencing type errors and extracting only the improvement in development experience via the LSP."

The optimal solution for successfully introducing types into Rails is not to pursue complete static type safety from the outset. It is an approach of assessing the nature of the project and the team's proficiency, first enjoying the benefits of automatically generated type definitions and LSP completion, while gradually raising the strictness (Severity) of type checking starting from the core domain. In the present era, where AI-assisted type inference and the maturation of the rbs-inline syntax are accelerating, appropriately blending the refined analysis engine provided by the official side with the down-to-earth workarounds honed by the community is precisely the most realistic and powerful type-introduction strategy in modern Ruby on Rails development.

## Cited Works

1. Ruby3.1静的解析の導入で開発体験を向上させる（RBS, TypeProf）｜Offers Tech Blog - Zenn, [https://zenn.dev/overflow_offers/articles/20220509-ruby3-type-interpretation](https://zenn.dev/overflow_offers/articles/20220509-ruby3-type-interpretation)
2. [Steep]Railsの本番環境にruby3.0の型定義を入れていく - Qiita, [https://qiita.com/tatematsu-k/items/a0e8bf3a244a6e6b95f5](https://qiita.com/tatematsu-k/items/a0e8bf3a244a6e6b95f5)
3. RBS CollectionをRailsアプリで試してみよう - Zenn, [https://zenn.dev/leaner_dev/articles/20210915-rubykaigi-2021-rbs-collection](https://zenn.dev/leaner_dev/articles/20210915-rubykaigi-2021-rbs-collection)
4. soutaro/steep: Static type checker for Ruby - GitHub, [https://github.com/soutaro/steep](https://github.com/soutaro/steep)
5. いかにして動的型付けのRubyに静的な型検査を持ち込むか？ SteepとRBSが目指すもの - Findy Engineer Lab, [https://findy-code.io/engineer-lab/soutaro](https://findy-code.io/engineer-lab/soutaro)
6. [Ruby3.0]型推論、型検査（Typeprof、Steep）を試してみる - Qiita, [https://qiita.com/_akira19/items/34dbcb1246fbf1a6cf62](https://qiita.com/_akira19/items/34dbcb1246fbf1a6cf62)
7. Railsアプリケーションへの型導入検討 - エムスリーテックブログ, [https://www.m3tech.blog/entry/typed-rails-application](https://www.m3tech.blog/entry/typed-rails-application)
8. Release Note 1.7 · soutaro/steep Wiki - GitHub, [https://github.com/soutaro/steep/wiki/Release-Note-1.7](https://github.com/soutaro/steep/wiki/Release-Note-1.7)
9. RBSとSteepメモ（Ruby、Railsにおける型付け） - Linyclar, [https://linyclar.github.io/rails_memos/typing/](https://linyclar.github.io/rails_memos/typing/)
10. Rubyの型付けの変遷とRBS入門：今から型安全なRubyコードを書くために - Qiita, [https://qiita.com/tatematsu-k/items/0d2874d3fb8de12fd4c9](https://qiita.com/tatematsu-k/items/0d2874d3fb8de12fd4c9)
11. Railsプロジェクトへの「頑張らない型導入」のすすめ - メドピア開発者ブログ, [https://tech.medpeer.co.jp/entry/2023-small-rbs-introduce](https://tech.medpeer.co.jp/entry/2023-small-rbs-introduce)
12. `rbs validate` error with `rbs collection` · Issue #432 · soutaro/steep - GitHub, [https://github.com/soutaro/steep/issues/432](https://github.com/soutaro/steep/issues/432)
13. 小規模Railsプロジェクトに型を導入してみる #rbs - Qiita, [https://qiita.com/ken1flan/items/bcd777ab96fe20dea2ba](https://qiita.com/ken1flan/items/bcd777ab96fe20dea2ba)
14. DSLにより動的に定義されるメソッドの型シグネチャの導入｜Railsアプリケーション型付けハンドブック（rbs/steep） - Zenn, [https://zenn.dev/sanfrecce_osaka/books/steep-rails-typing-handbook/viewer/introduce-type-signature-for-defined-method-by-dsl](https://zenn.dev/sanfrecce_osaka/books/steep-rails-typing-handbook/viewer/introduce-type-signature-for-defined-method-by-dsl)
15. Rails RBSを試す - Zenn, [https://zenn.dev/kuronekopunk/scraps/b640bc3ef8dec8](https://zenn.dev/kuronekopunk/scraps/b640bc3ef8dec8)
16. Railsチュートリアルのsample_appに型を導入 - Zenn, [https://zenn.dev/fu_ga/articles/fff97cf13e9b21](https://zenn.dev/fu_ga/articles/fff97cf13e9b21)
17. 【Rails・RBS】VSCodeで型の参照とコード補完ができるようにする, [https://chietech.com/2024/01/03/rails-rbs](https://chietech.com/2024/01/03/rails-rbs)
18. Railsの型ファイル自動生成における課題と解決 / Yuki Kurihara - MIXI DEVELOPERS, [https://mixi-developers.mixi.co.jp/rails%E3%81%AE%E5%9E%8B%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E8%87%AA%E5%8B%95%E7%94%9F%E6%88%90%E3%81%AB%E3%81%8A%E3%81%91%E3%82%8B%E8%AA%B2%E9%A1%8C%E3%81%A8%E8%A7%A3%E6%B1%BA-yuki-kurihara-7b6a522fbf24](https://mixi-developers.mixi.co.jp/rails%E3%81%AE%E5%9E%8B%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E8%87%AA%E5%8B%95%E7%94%9F%E6%88%90%E3%81%AB%E3%81%8A%E3%81%91%E3%82%8B%E8%AA%B2%E9%A1%8C%E3%81%A8%E8%A7%A3%E6%B1%BA-yuki-kurihara-7b6a522fbf24)
19. A Thorough Look into RBS for Rails - Graham Marlow, [https://mgmarlow.com/words/2025-09-21-brief-look-into-rbs-rails/](https://mgmarlow.com/words/2025-09-21-brief-look-into-rbs-rails/)
20. soutaro/rbs-inline: Inline RBS type declaration - GitHub, [https://github.com/soutaro/rbs-inline](https://github.com/soutaro/rbs-inline)
21. AIを使ってYARDからrbs-inlineへ移行しました - kickflow Tech Blog, [https://tech.kickflow.co.jp/entry/rbs-inline-with-ai](https://tech.kickflow.co.jp/entry/rbs-inline-with-ai)
22. RBSに出会って変わったRubyへの向き合い方 - Timee Product Team Blog, [https://tech.timee.co.jp/entry/2024/12/24/000000](https://tech.timee.co.jp/entry/2024/12/24/000000)
23. Rubyの型システムの現実的な運用を、先入観にとらわれずに考えてみた - Wantedly, [https://www.wantedly.com/companies/wantedly/post_articles/545209](https://www.wantedly.com/companies/wantedly/post_articles/545209)
24. RubyKaigi 2024でRBSとLLMの話をしました - Zenn, [https://zenn.dev/leaner_dev/articles/20240521-rubykaigi-2024-lets-use-llms-from-ruby](https://zenn.dev/leaner_dev/articles/20240521-rubykaigi-2024-lets-use-llms-from-ruby)
25. steep/lib/steep/diagnostic/ruby.rb at master - GitHub, [https://github.com/soutaro/steep/blob/master/lib/steep/diagnostic/ruby.rb](https://github.com/soutaro/steep/blob/master/lib/steep/diagnostic/ruby.rb)
26. Steep-1.7.0.dev.1のignoreコメントを試す | Webシステム開発, [https://www.timedia.co.jp/tech/20240502-tech/](https://www.timedia.co.jp/tech/20240502-tech/)
27. Steep::CLI - gem.sh, [https://gem.sh/gems/steep/v1.0.1/classes/Steep::CLI](https://gem.sh/gems/steep/v1.0.1/classes/Steep::CLI)
28. Output format selection and improved automation formats · Issue, [https://github.com/soutaro/steep/issues/977](https://github.com/soutaro/steep/issues/977)
29. RubyKaigi2024で印象に残ったセッション - Zenn, [https://zenn.dev/nyancat/articles/20240525-ruby-kaigi-2024](https://zenn.dev/nyancat/articles/20240525-ruby-kaigi-2024)
30. Steepエラーリファレンスを作りました（2024/09/30時点） - Timee Product Team Blog, [https://tech.timee.co.jp/entry/2024/10/02/153330](https://tech.timee.co.jp/entry/2024/10/02/153330)
