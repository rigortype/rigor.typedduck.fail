---
title: "公開APIの安定性境界"
description: "rigortype/rigor docs/internal-spec/public-api.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/public-api.md"
sourcePath: "docs/internal-spec/public-api.md"
sourceSha: "d8c96449eee90d3c57cdfe69b50784e90314add2e4c966fc908ca4932f0db53b"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-09T19:49:45+09:00"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**アクティブ — 列挙されたサーフェスは`v0.2.0`評価試行の下にあります**（[`docs/compatibility.md`](../../compatibility/) §3つの段階: `v0.2.0`から試行としてコミットされ、`v1.0.0`で拘束的になる）。プラグイン契約（contract）が設計される対象となるネームスペースをリストし、[パブリックAPIドリフトスペック](https://github.com/rigortype/rigor/blob/master/spec/rigor/public_api_drift_spec.rb)を通じてそれらを固定します。v0.1.0プラグイン契約は出荷され、`0.1.x`プレビューラインがサーフェスを拡張してきました（クロスプラグインファクト、`signature_paths:`、`open_receivers:`、`protocol_contracts:`、`source_rbs_synthesizer:`）;`v0.2.0`は、外部の`rigor-*` gem向けにこのサーフェスのマイナー非破壊を誓約した最初のラインでした。（`rigor <command>` CLI自体 — `mcp`、`triage`、`baseline`、`plugin`、`skill`のような新しいサブコマンドを含む — は以下の除外リストに従って内部の配管にとどまります;そのユーザー向け契約は`docs/manual/`にあります。）ドリフトスペックは偶発的なシグネチャ変更を検出するため、すべての変更は意図的でレビュー可能なままです。

このドキュメントは、固定されたネームスペースの**プラグイン作成者ビュー**です。プロジェクト全体の互換性コミットメント——完全な公開サーフェス（CLI、`.rigor.yml`キー、診断語彙、ベースライン＋キャッシュ形式、`RBS::Extended`文法）と、それが拘束する試行後フリーズの軌道——は[`docs/compatibility.md`](../../compatibility/)（[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) WD1サーフェスドキュメント）にあります;このファイルは、その傘下のネームスペースレベルの詳細です。

## なぜこの境界が存在するか

ADR-2はRigorをプラグインアーキテクチャにコミットさせており、gem作成者がケイパビリティ（capability）ロール・動的返却ファクト（fact）・型指定プラグイン・`RBS::Extended`ディレクティブを提供できるようにします。プラグイン作成者は少数の読み取り側サーフェスに対して書き込みを行います：

- **`Rigor::Plugin::_Scope`** — フックが受け取るノードごとの解析状態に対して呼び出してよいメソッド群。エンジンの`Rigor::Scope`クラスではなく構造的インターフェースです。
- **`Rigor::Type`** + **`Rigor::Type::Combinator`** — 型オブジェクトレイアウトとファクトリーエントリーポイント。
- **`Rigor::Plugin::_Environment`**、**`_Services`**、**`_FactStore`**および**`_Configuration`** — スコープが公開するプロジェクトレベルのRBSハンドル、および`init` / `prepare`が受け取るサービスコンテナのためのインターフェース。
- **`Rigor::Reflection`** — 3つのリフレクションソース（ClassRegistry + RbsLoader + スコープで発見されたファクト）に対する統合された読み取り側ファサード。
- **`Rigor::FlowContribution`** — プラグインが返すバンドル（v0.1.0貢献マージャーはバンドルを直接消費します）。
- **`Rigor::Analysis::Diagnostic`** — プラグインが発行する診断の形状（`source_family`来歴を持つ）。`Diagnostic.from_node`／`.from_location`コンストラクタ（および`Plugin::Base#diagnostic`ラッパー）は、1始まりの`line`／`start_column + 1`という位置指定の慣習を内部に取り込みます（ADR-37）。

このドキュメントは、それらのネームスペース上のどのメソッドが**パブリック**（プラグイン作成者が依存してよい）か、**内部**（予告なく変更される可能性がある）かを宣言します。

**基準**（[ADR-128](../../adr/128-plugin-hook-surface-interfaces/)）：あるメソッドがパブリックなプラグインAPIであるのは、`Rigor::Plugin::Base`、プラグイン向けインターフェース（`sig/rigor/plugin/interfaces.rbs`）、またはこのドキュメントがパブリックとして列挙するネームスペースのいずれかで宣言されている場合**のみ**です。実行時に到達可能であってもパブリックにはならず、ドリフトピン留めも同様です。インターフェースの背後にある具象エンジンクラス（`Rigor::Scope`・`Rigor::Environment`・`Rigor::Plugin::Services`・`Rigor::Plugin::FactStore`・`Rigor::Configuration`）は内部実装です（[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) WD1）：インターフェースを越えて直接呼び出すプラグインは現状では動作しますが、どのリリースでも壊れる可能性があります。メソッドがインターフェースに追加されるのは、プラグインがそれを必要とし、かつエンジン内部の型名を挙げたり不確実性の方向を隠したりせずにその契約を記述できる場合のみです。そうでなければ、Rigorはパブリックなネームスペースにファサードを追加します（`Reflection.project_method_defined`がその最初です）。

インターフェースのメンバー一覧：

- `_Scope` — `type_of`・`self_type`・`local`・`source_path`・`with_local`、および非nilの`environment`。
- `_Environment` — `nominal_for_name`・`rbs_module?`。
- `_Services` — `fact_store`・`configuration`・`reflection`および`type`。最後の2つは、プラグインが両方とも定数経由でも参照するため、より狭いインターフェースではなくパブリックな`Rigor::Reflection`および`Rigor::Type::Combinator`モジュールそのものです。
- `_FactStore` — `publish`・`read`。
- `_Configuration` — `paths`。

`Plugin::Base`のすべてのフック位置は、これらと具象`Prism`ノードクラス、`Rigor::Type::t`、およびコア型に対して型付けされています。フックの`scope`は非nilです：エンジンはスコープを取るすべてのフックを`Scope`付きで呼び出します。

v0.0.9のクラスタはネームスペースごとのドリフトスナップショットを増やしたため、将来のシグネチャ変更はサイレントな破壊ではなくテストの失敗として現れます。

## 現在ロックされているもの

[`spec/rigor/public_api_drift_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/rigor/public_api_drift_spec.rb)のドリフトスペックは以下のインスタンスおよびシングルトンメソッドセットを固定します：

- 上記のプラグイン向けインターフェースのメンバー一覧（`PLUGIN_INTERFACE_MEMBERS`スナップショット、RBSから読み取られる）。
- `Rigor::Scope`および`Rigor::Environment` — インスタンスメソッド + `Scope.empty(environment:)`ファクトリーおよび`Environment.default` / `Environment.for_project(root:, libraries:, signature_paths:, cache_store:)`。**これら2つのスナップショットは内部変更検知器であり、約束ではありません**：エンジンクラスのシグネチャ変更を意図的でレビュー可能なものにするためのものであり、これらのみがピン留めするメンバーにプラグインが依存してはなりません。
- `Rigor::Type::Combinator` — 推論エンジンが使用するすべてのファクトリー（`top`・`bot`・`untyped`・`nominal_of`・`singleton_of`・`constant_of`・`integer_range`・`positive_int`・`non_empty_string`・`lowercase_string`・`literal_string`・`union`・`intersection`・`difference`・`refined`・`key_of`・`value_of`・`indexed_access`など）。
- `Rigor::Reflection` — すべての`class_declarations_in`・`class_known?`・`class_ordering`・`class_type_param_names`・`constant_type_for`・`ancestry_reaches`・`discovered_class?`・`discovered_method?`・`rbs_method_defined`・`instance_definition`・`instance_method_definition`・`nominal_for_name`・`project_method_defined`・`rbs_class_known?`・`singleton_definition`・`singleton_for_name`・`singleton_method_definition`。`project_method_defined(class_name, method_name, kind:, source:, scope:)`（ADR-128 WD1）は、プラグインが従来2つの`Scope`ウォークを通じて尋ねていた祖先に関する質問です：`Rigor::Trinary`を返し、ウォークの祖先バジェットが定義元を見つける前に尽きた場合や、（`:discovered`・`:either`）チェーン上のクラスがいずれのテーブルにも載らない名前でメソッドを定義している場合、または（`kind: :instance`）いずれのテーブルにも名前がないモジュールをミックスインしている場合は`maybe`を返します。[`reflection.md`](../reflection/) §「ソース側の発見」を参照してください。`rbs_method_defined(class_name, method_name, kind:, scope:)`はプロジェクトの祖先を通じてRBSに対して同じ質問を行い、`ancestry_reaches(class_name, ancestor_names, kind:, scope:)`はその祖先が指定されたクラスに到達するかどうかを尋ねます；どちらも`Trinary`を返します。`class_declarations_in(root) { |declared_call| … }`（#2708）はファイルごとの宣言ウォークです：パースされたファイルが宣言するクラスを`Rigor::Reflection::ClassDeclaration`値（`name`・`nesting`・`node`）として返し、ブロックが与えられた場合はウォークが訪れる各呼び出しを`Rigor::Reflection::DeclaredCall`値（`node`・`owner`：その呼び出しが属するクラスまたはモジュール）としてyieldします。これは`rigor-alba`や`rigor-typelizer`が内部にとどまる`Rigor::Inference::DeclarationWalk`の代わりに使うエントリーポイントです。
- `Rigor::Trinary` — `Reflection.project_method_defined`が返す値：`yes?` / `no?` / `maybe?`、`and`、`or`、`negate`、`value`、`==`、および`Trinary.yes` / `.no` / `.maybe` / `.from_symbol`コンストラクタ。
- `Rigor::Plugin` — `register`・`registered`・`registered_for`・`unregister!`（テストヘルパー）。v0.1.0スライス（slice）1。
- `Rigor::Plugin::Base` — クラスレベルの`manifest(**fields)`・`producer`・`node_rule`・`node_file_context`、およびFFI認識（`ffi_binding_recognizer`、`ffi_binding_recognizers`）の各DSL・インスタンスレベルの`services` / `config` / `manifest`・オーバーライドフック`#init` / `#prepare` / `#diagnostics_for_file` / `#template_units_for_file` / `#template_units_pass_started`（#1047）・エンジン所有ウォークのディスパッチャー`#node_rule_diagnostics`・`#diagnostic(node, …)`ビルダー、および実行スコープの開示チャネル`#disclose_once(key, message:, severity:, rule:)` / `#run_disclosure_records`（#1051）、そして位置付きの兄弟`#emit_once(key, diagnostics)`（#1060）。v0.1.0スライス1 + ADR-37 + ADR-30（#727） + #392 + #1051 + #1060。
- `Rigor::Plugin::Manifest` — `id`・`version`・`description`・`protocol_contracts`・`config_schema`・`validate_config(config)`・`template_globs`。
- `Rigor::Plugin::TemplateUnit` — #392のテンプレートユニットキャリア: `logical_name`・`path`・`ruby_source`・`line_map`・`self_type`・`locals`・`ivar_seeds`・`transform_id`・`suppressed_rules`（#393）、加えて`unit_key`・`digest(fallback_transform_id = nil)`・`template_line(ruby_line)`および値オブジェクトカルテット（`==` / `eql?` / `hash` / `to_h`）。[`macro-substrate.md`](../macro-substrate/) § テンプレートユニットにおいて仕様化。
- `Rigor::Plugin::Services` — `reflection`・`type`・`configuration`・`fact_store`・`cache_store`・`trust_policy`・`io_boundary_for(plugin_id)`。このうち`_Services`のメンバー（`fact_store`・`configuration`・`reflection`・`type`）のみがプラグインAPIです；残りはバンドルプラグインが`services`経由で呼び出さないため内部変更検知器としてピン留めされています。
- `Rigor::Plugin::Registry` — `plugins`・`ids`・`find(id)`・`load_errors`・`empty?`・`any_load_errors?`。
- `Rigor::Plugin::TrustPolicy` — `trusted_gems`・`allowed_read_roots`・`network_policy`・`allow_read?(path)`・`network_allowed?`・`gem_trusted?(name)`・`to_h`。v0.1.0スライス2。
- `Rigor::Plugin::IoBoundary` — `policy`・`plugin_id`・`read_file(path)`・`open_url(url)`・`cache_descriptor`。v0.1.0スライス2。
- `Rigor::Source::Literals` — 引数リテラル抽出グリッド`symbol`・`symbol_name`・`symbol_or_string`・`symbol_or_string_name`・`symbol_arguments`・`symbol_arg`。それ以外は内部の`Rigor::Source::*`名前空間（後述）の中で意図的に公開された唯一のメンバー: プラグイン作成者が案内される共有DSLウォーカーヘルパーです（ボイラープレート削減プラン § 0a）。v0.1.x。

これらのメソッドのシグネチャが変更された場合は、同じコミットで対応する`PublicApiDriftSnapshots::*`定数を更新する必要があります。

**境界ゲート**。ドリフトスペックはRigorが約束するものをピン留めします；プラグインが実際に何を呼び出すかは見ることができません。スペック専用の`TracePoint`レコーダー（`spec/support/plugin_boundary.rb`、ADR-128 WD4）はバンドルプラグインの結合スペック（`make test-integration-plugins`）上で実行され、`plugins/`または`examples/`配下のフレームがインターフェースのバッキングクラスまたは`Rigor::Inference`配下のモジュールに対して呼び出すあらゆるメソッドを記録し、インターフェースで宣言されておらず、`Object` / `Kernel` / `BasicObject`プロトコルの一部でもなく、許可リストの行でもないものが1つでもあれば実行を失敗させます。そのカバレッジはそれらのスペックが実行する範囲に限られ、対象はバンドルプラグインのみです。forkされたプールワーカー内で行われる呼び出しは記録されません。

## 意図的にまだロックされていないもの

- **`Rigor::FlowContribution`** — v0.0.9（`c48f05f`）で出荷されたバンドル構造体；スライス3が`#to_element_list`を追加し、パブリックAPIドリフトスペックを通じてバンドル形状を固定しました。プラグイン作成者はパブリックリーダー/`to_h`形式を通じてバンドルを消費し、スロットごとの値形状（`PredicateEffect`・`AssertEffect`など）を直接固定するのは避けてください——v0.1.0が確定させたのはバンドルであって、それらではありません。
- **`Rigor::FlowContribution::Element` / `MergeResult` / `Conflict` / `Merger`** — スライス3のサーフェス；ドリフトスペックによって固定済み。平坦化とマージポリシーは[`flow-contribution-merger.md`](../flow-contribution-merger/)に従って規範的です。
- **`Rigor::Analysis::Diagnostic`** — `source_family`と`qualified_rule`はv0.0.8（`ed9ae0a`）で追加されました;ルールごとの識別子自体は固定されたサーフェスの外にとどまり、`v1.0.0`でパブリック語彙としてフリーズします（ADR-50）。これが`Rigor::Analysis::Diagnostic`がドリフトスペックの外にとどまる理由です。
- **`Rigor::Cache::*`** — プロデューサー向けの`Store#fetch_or_compute(producer_id:, params:, descriptor:, serialize:, deserialize:)` APIは最も安定したレイヤーであり、プラグイン側キャッシュプロデューサーが使用するものです（[plugin-cache-producers.md](../plugin-cache-producers/)）。ディスクリプタスキーマはADR-6とスライス分類設計ドキュメントによって固定されています；プラグイン作成者は新しいスロット種類ではなく`PluginEntry`行を追加すべきです。
- **`Rigor::RbsExtended`ディレクティブパーサ** — パブリックリーダーメソッド（`read_predicate_effects`・`read_assert_effects`・`read_return_type_override`・`read_param_type_overrides`・`read_flow_contribution`）は現在安定した形状です；エフェクトごとのデータキャリア（carrier）（`PredicateEffect`・`AssertEffect`・`ParamOverride`）は`FlowContribution`のスロットごとの形状と同じ理由で未固定です。
- **`Rigor::Plugin::*`** — 登録/ロードサーフェスはv0.1.0スライス1で到着しました。インスタンスレベルの`Rigor::Plugin::Base#init`フックは現在安定しています；スライス3〜6で追加されるプロトコルフックは`Base`のパブリックメソッドセットを精緻化するかもしれません。プラグイン作成者はv0.1.0の開発中は特定のRigorバージョンにgemを固定すべきです。

## 内部サーフェス（パブリックではない）

プラグイン作成者が以下に依存してはなりません（MUST NOT）：

- `Rigor::Inference::*`モジュール（`ScopeIndexer`・`ExpressionTyper`・`StatementEvaluator`・`MethodDispatcher`・`MethodParameterBinder`・`ClosureEscapeAnalyzer`・`CoverageScanner`）。これらはエンジンの内部メカニズムです；推論サーフェスの進化に伴い形状が変わります。宣言ウォーク（`Rigor::Inference::DeclarationWalk`）もその1つです；プラグインは代わりに`Rigor::Reflection.class_declarations_in`に問い合わせます。
- `Rigor::Scope`・`Rigor::Environment`・`Rigor::Plugin::Services`・`Rigor::Plugin::FactStore`または`Rigor::Configuration`のメソッドのうち、上記の各インターフェースが宣言していないものすべて、および`Rigor::Plugin::TypeNodeResolver`の`NameScope`（そのインターフェースは後のADR-128スライスで決定されます）。
- `Rigor::Analysis::FactStore`・`Analysis::Result`・`Analysis::CheckRules`・`Analysis::Runner`。診断カタログとルール定義はプラグイン拡張サーフェスではありません——プラグインはv0.1.0プラグインプロトコルを通じて診断を発行し、`CheckRules`に行を追加しません。
- `Rigor::AST::*`仮想ノード。エンジンが内部で使用する合成ASTノードは安定したプラグインサーフェスではありません。
- あらゆる`Rigor::Source::*`（**上でロックされた`Rigor::Source::Literals`を除く**）・`Rigor::CLI::*`・`Rigor::Configuration`ヘルパー。これらはCLI/ローダーの配管です。`Source::Literals`は唯一の切り出し例外です: ドリフトピン留めされており、推奨されるプラグイン作成者向け引数抽出器です。

## 昇格パス

v0.1.0プラグイン契約が現在内部のサーフェスをパブリックにする必要がある場合：

1. 関連するADRが修正されます（プラグイン拡張プロトコルはADR-2、型オブジェクト/推論エンジンの詳細はADR-3/4）。
2. クラスがメソッドセットのスナップショットと共に[`spec/rigor/public_api_drift_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/rigor/public_api_drift_spec.rb)に追加されます。そのコミット以降、偶発的なシグネチャ変更はドリフトスペックを壊します。
3. このドキュメントに新しいネームスペースの「v0.1.0で昇格」エントリーが追加されます。

## プラグイン作成者のための読み順

1. [`docs/adr/2-extension-api.md`](../../adr/2-extension-api/) — プラグイン契約（ケイパビリティロール・貢献マージ・診断来歴・登録・設定・キャッシュ・トラスト/I/O）。
2. [`docs/internal-spec/internal-type-api.md`](../internal-type-api/) — すべての`Rigor::Type::*`キャリアが満たす型オブジェクトパブリック契約。
3. [`docs/internal-spec/inference-engine.md`](../inference-engine/) — `Rigor::Scope#type_of`の純粋性・ファクトストア/エフェクトモデル・環境読み込み境界。
4. [`docs/internal-spec/reflection.md`](../reflection/) — `Rigor::Reflection`読み取り側ファサード。
5. [`docs/internal-spec/flow-contribution.md`](../flow-contribution/) — `Rigor::FlowContribution`バンドル。
6. [`docs/internal-spec/cache.md`](../cache/) — キャッシュレイヤーのパブリック読み取り形状；プラグイン側キャッシュプロデューサーがこのAPIを使用します。
