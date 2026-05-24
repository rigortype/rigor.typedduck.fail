---
title: "Public API Stability Boundary"
description: "Imported from rigortype/rigor docs/internal-spec/public-api.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/public-api.md"
sourcePath: "docs/internal-spec/public-api.md"
sourceSha: "9b8ac57d18f2752f2e1f2e91d81d89d8b096fcf02e92a3d54f054a70d07742b1"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**v0.1.0以前のサーフェス宣言**。v0.1.0のプラグインコントラクトが設計される対象となるネームスペースをリストし、[パブリックAPIドリフトスペック](../../spec/rigor/public_api_drift_spec.rb)を通じてそれらを固定します。v0.1.0が出荷されるまで、サーフェスはコミットごとに進化することが許されます；ドリフトスペックは偶発的なシグネチャ変更を検出するため、変更は意図的にレビュー可能な形で行われます。

## なぜこの境界が存在するか

ADR-2はRigorをプラグインアーキテクチャにコミットさせており、gem作成者がケイパビリティロール・動的返却ファクト・型指定プラグイン・`RBS::Extended`ディレクティブを提供できるようにします。プラグイン作成者は少数の読み取り側サーフェスに対して書き込みを行います：

- **`Rigor::Scope`** — ノードごとの解析状態（ローカル変数・インスタンス変数・ファクト・環境）。
- **`Rigor::Type`** + **`Rigor::Type::Combinator`** — 型オブジェクトレイアウトとファクトリエントリポイント。
- **`Rigor::Environment`** — プロジェクトレベルのRBS/クラスレジストリ/キャッシュストアハンドル。
- **`Rigor::Reflection`** — 3つのリフレクションソース（ClassRegistry + RbsLoader + スコープで発見されたファクト）に対する統合された読み取り側ファサード。
- **`Rigor::FlowContribution`** — プラグインが返すバンドル（v0.1.0貢献マージャーはバンドルを直接消費します）。
- **`Rigor::Analysis::Diagnostic`** — プラグインが発行する診断の形状（`source_family`来歴を持つ）。

このドキュメントは、それらのネームスペース上のどのメソッドが**パブリック**（プラグイン作成者が依存してよい）か、**内部**（予告なく変更される可能性がある）かを宣言します。v0.0.9のクラスタはネームスペースごとのドリフトスナップショットを増やしたため、将来のシグネチャ変更はサイレントな破壊ではなくテストの失敗として現れます。

## 現在ロックされているもの

[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)のドリフトスペックは以下のインスタンスおよびシングルトンメソッドセットを固定します：

- `Rigor::Scope` — インスタンスメソッド + `Scope.empty(environment:)`ファクトリ。
- `Rigor::Environment` — インスタンスメソッド + `Environment.default` / `Environment.for_project(root:, libraries:, signature_paths:, cache_store:)`。
- `Rigor::Type::Combinator` — 推論エンジンが使用するすべてのファクトリ（`top`・`bot`・`untyped`・`nominal_of`・`singleton_of`・`constant_of`・`integer_range`・`positive_int`・`non_empty_string`・`lowercase_string`・`literal_string`・`union`・`intersection`・`difference`・`refined`・`key_of`・`value_of`・`indexed_access`など）。
- `Rigor::Reflection` — すべての`class_known?`・`class_ordering`・`class_type_param_names`・`constant_type_for`・`discovered_class?`・`discovered_method?`・`instance_definition`・`instance_method_definition`・`nominal_for_name`・`rbs_class_known?`・`singleton_definition`・`singleton_for_name`・`singleton_method_definition`。
- `Rigor::Plugin` — `register`・`registered`・`registered_for`・`unregister!`（テストヘルパー）。v0.1.0スライス1。
- `Rigor::Plugin::Base` — クラスレベルの`manifest(**fields)`・インスタンスレベルの`services` / `config` / `manifest`・オーバーライドフック`#init(services)`。v0.1.0スライス1。
- `Rigor::Plugin::Manifest` — `id`・`version`・`description`・`protocols`・`config_schema`・`validate_config(config)`。
- `Rigor::Plugin::Services` — `reflection`・`type`・`configuration`・`cache_store`・`trust_policy`・`io_boundary_for(plugin_id)`。
- `Rigor::Plugin::Registry` — `plugins`・`ids`・`find(id)`・`load_errors`・`empty?`・`any_load_errors?`。
- `Rigor::Plugin::TrustPolicy` — `trusted_gems`・`allowed_read_roots`・`network_policy`・`allow_read?(path)`・`network_allowed?`・`gem_trusted?(name)`・`to_h`。v0.1.0スライス2。
- `Rigor::Plugin::IoBoundary` — `policy`・`plugin_id`・`read_file(path)`・`open_url(url)`・`cache_descriptor`。v0.1.0スライス2。

これらのメソッドのシグネチャが変更された場合は、同じコミットで対応する`PublicApiDriftSnapshots::*`定数を更新する必要があります。

## 意図的にまだロックされていないもの

- **`Rigor::FlowContribution`** — v0.0.9（`c48f05f`）で出荷されたバンドル構造体；スライス3が`#to_element_list`を追加し、パブリックAPIドリフトスペックを通じてバンドル形状を固定しました。プラグイン作成者はパブリックリーダー/`to_h`形式を通じてバンドルを消費し、v0.1.0が確定するまでスロットごとの値形状（`PredicateEffect`・`AssertEffect`など）を直接固定するのは避けてください。
- **`Rigor::FlowContribution::Element` / `MergeResult` / `Conflict` / `Merger`** — スライス3のサーフェス；ドリフトスペックによって固定済み。平坦化とマージポリシーは[`flow-contribution-merger.md`](../flow-contribution-merger/)に従って規範的です。
- **`Rigor::Analysis::Diagnostic`** — `source_family`と`qualified_rule`はv0.0.8（`ed9ae0a`）で追加されましたが、v0.1.0プラグインの可観測性ストーリーが確定するにつれてルールごとの診断識別子はまだ流動的です。
- **`Rigor::Cache::*`** — プロデューサー向けの`Store#fetch_or_compute(producer_id:, params:, descriptor:, serialize:, deserialize:)` APIは最も安定したレイヤーであり、プラグイン側キャッシュプロデューサーが使用するものです。ディスクリプタスキーマはADR-6とスライス分類設計ドキュメントによって固定されています；プラグイン作成者は新しいスロット種類ではなく`PluginEntry`行を追加すべきです。
- **`Rigor::RbsExtended`ディレクティブパーサー** — パブリックリーダーメソッド（`read_predicate_effects`・`read_assert_effects`・`read_return_type_override`・`read_param_type_overrides`・`read_flow_contribution`）は現在安定した形状です；エフェクトごとのデータキャリア（`PredicateEffect`・`AssertEffect`・`ParamOverride`）は`FlowContribution`と同じv0.1.0の精緻化の対象です。
- **`Rigor::Plugin::*`** — 登録/ロードサーフェスはv0.1.0スライス1で到着しました。インスタンスレベルの`Rigor::Plugin::Base#init`フックは現在安定しています；スライス3〜6で追加されるプロトコルフックは`Base`のパブリックメソッドセットを精緻化するかもしれません。プラグイン作成者はv0.1.0の開発中は特定のRigorバージョンにgemを固定すべきです。

## 内部サーフェス（パブリックではない）

プラグイン作成者が以下に依存してはなりません（MUST NOT）：

- `Rigor::Inference::*`モジュール（`ScopeIndexer`・`ExpressionTyper`・`StatementEvaluator`・`MethodDispatcher`・`MethodParameterBinder`・`ClosureEscapeAnalyzer`・`CoverageScanner`）。これらはエンジンの内部メカニズムです；推論サーフェスの進化に伴い形状が変わります。
- `Rigor::Analysis::FactStore`・`Analysis::Result`・`Analysis::CheckRules`・`Analysis::Runner`。診断カタログとルール定義はプラグイン拡張サーフェスではありません——プラグインはv0.1.0プラグインプロトコルを通じて診断を発行し、`CheckRules`に行を追加しません。
- `Rigor::AST::*`仮想ノード。エンジンが内部で使用する合成ASTノードは安定したプラグインサーフェスではありません。
- `Rigor::Source::*`・`Rigor::CLI::*`・`Rigor::Configuration`ヘルパー。これらはCLI/ローダーの配管です。

## 昇格パス

v0.1.0プラグインコントラクトが現在内部のサーフェスをパブリックにする必要がある場合：

1. 関連するADRが修正されます（プラグイン拡張プロトコルはADR-2、型オブジェクト/推論エンジンの詳細はADR-3/4）。
2. クラスがメソッドセットのスナップショットと共に[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)に追加されます。そのコミット以降、偶発的なシグネチャ変更はドリフトスペックを壊します。
3. このドキュメントに新しいネームスペースの「v0.1.0で昇格」エントリが追加されます。

## プラグイン作成者のための読み順

1. [`docs/adr/2-extension-api.md`](../../adr/2-extension-api/) — プラグインコントラクト（ケイパビリティロール・貢献マージ・診断来歴・登録・設定・キャッシュ・トラスト/I/O）。
2. [`docs/internal-spec/internal-type-api.md`](../internal-type-api/) — すべての`Rigor::Type::*`キャリアが満たす型オブジェクトパブリックコントラクト。
3. [`docs/internal-spec/inference-engine.md`](../inference-engine/) — `Rigor::Scope#type_of`の純粋性・ファクトストア/エフェクトモデル・環境読み込み境界。
4. [`docs/internal-spec/reflection.md`](../reflection/) — `Rigor::Reflection`読み取り側ファサード。
5. [`docs/internal-spec/flow-contribution.md`](../flow-contribution/) — `Rigor::FlowContribution`バンドル。
6. [`docs/internal-spec/cache.md`](../cache/) — キャッシュレイヤーのパブリック読み取り形状；プラグイン側キャッシュプロデューサーがこのAPIを使用します。
