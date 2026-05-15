---
title: "Ractor移行 — 段階化されたプラン"
description: "rigortype/rigor docs/design/20260514-ractor-migration.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/design/20260514-ractor-migration.md"
sourcePath: "docs/design/20260514-ractor-migration.md"
sourceSha: "ce7c51509c8ddd485d6e811d7033d1e1609d22978aa3cae6128ccff33555e942"
sourceCommit: "035915291e331f3bcd5ce804a1e30dc284ffbd48"
translationStatus: "translated"
sidebar:
  order: 20265514
---

**ステータス**: 草案。フェーズ1着地済み;後のフェーズは保留中。

RigorのアナライザーはCPUバウンドのRubyです。MRIのGVLがスレッド全体でRubyコード実行をシリアライズするため、Threadベースの並列性は`rigor check`にwall-clockの恩恵を与えません（プロトタイプ化 + 差し戻し済み;`docs/CURRENT_WORK.md`オープンエンジニアリング項目#7を参照）。マルチコア利用への2つの現実的なパスは、**フォークベースのワーカー**と**Ractor**。このドキュメントはRactorパスを計画します。

RactorはRactor境界を越えるすべてのオブジェクトが`Ractor.shareable?`である必要があります。最終的なエンドステート — コア全体に`analyze_file`をディスパッチするRactor分離ワーカープール — は、`(Configuration, Environment, Scope, Type, TypeNode, FlowContribution, Plugin)`データサーフェス全体がその制約を満たすことを必要とします。作業は単一のコミットには大きすぎ、投機的に行うのはリスクが高いので、フェーズで着地します。各フェーズは独立して有用で独立して取り消し可能です。

## フェーズ1 — 値オブジェクトの共有可能性（着地済み）

ゴール: エンジンがディスパッチを通じて運ぶすべてのリーフ値オブジェクトは、構築時に`Ractor.shareable?`。

今日のカバレッジ:

- `Rigor::Type::*` — すべてのTypeキャリア（16クラス）。すべて共有可能。
- `Rigor::TypeNode::*` — すべてのパーサー側ASTノード。コンストラクターで内部の`String` / `Array`フィールドを凍結して共有可能にした（このコミット）。
- `Rigor::Cache::Descriptor` — すでに共有可能。
- `Rigor::Analysis::FactStore.empty` — すでに共有可能。
- `Rigor::FlowContribution` — すでに共有可能。

リグレッションガード: `spec/rigor/ractor_readiness_spec.rb`はカバーされたリストのすべてのコンストラクターで`Ractor.shareable?`をアサートする。監査specを更新せずに新しい値オブジェクトクラスを追加すると、将来のドリフトをキャッチする。

## フェーズ2 — Configuration / Scope / Environment

ゴール: ランタイムコンテキストキャリアオブジェクトが乗るものが共有可能になる。

3つのクラスがこれをブロック:

### `Rigor::Configuration`（着地済み — フェーズ2a）

共有可能でなかった理由: `@paths`配列が凍結されておらず、`Configuration#initialize`が`self`に`freeze`を呼んでいなかった。他のすべてのivarはすでに凍結されていた（Symbol / nil / Boolean、または明示的に凍結されたコレクション / 値オブジェクト）。

着地した修正: `@paths`の構築に`.freeze`を追加し、`initialize`の最後に`freeze`行を追加。後方互換 — プロダクションコードは構築後のConfigurationをミューテートせず、監査specは2行の変更直後にパスする。`spec/rigor/ractor_readiness_spec.rb`の`Rigor::Configuration`例が`skip`からパスするアサーションに切り替わる。

### `Rigor::Scope`

共有可能でない理由: `Scope.empty`がデフォルトの`Environment`を参照し、それは共有可能ではない（下記参照）。

修正: `Environment`が共有可能になれば、`Scope`が続く。Scope値オブジェクト自体はすでにディープフリーズされている。

### `Rigor::Environment`

共有可能でない理由: `Environment#rbs_loader`は、ミューテーション可能なプロセスごとのキャッシュ（`@class_known_cache`、`@instance_definition_cache`、`@singleton_definition_cache`）を持つ`RbsLoader`インスタンスを運ぶ。これらのキャッシュはパフォーマンスに**重要** — すべての`class_known?` / `instance_definition`ルックアップがそれらを通る。

競合: 凍結されたEnvironmentは可変キャッシュを運べない。Ractorごとのキャッシュはクロスファイル共有の恩恵を打ち破る。

解決スケッチ（実質的なリファクター）:

1. `RbsLoader`を2つのサーフェスに分割:
   - **Reflection** — 読み取り専用RBSクエリインターフェース（`class_known?`、`instance_definition`など）。構築後に凍結。Environmentがこれを運ぶ。
   - **CacheLayer** — Reflectionをラップする可変メモ化レイヤー。実行中のRactorが所有し、Ractor間で共有されない。
2. `Environment`は凍結されたReflectionのみを運ぶ。Ractorごとに、Ractorは共有されたReflection + 共有された`Cache::Store`（すでに`Monitor`保護された`@memo`を持つ）を指す自身のCacheLayerを実体化する。
3. `class_known?` / `instance_definition`はRactorごとのCacheLayer経由でディスパッチ;キャッシュフィルは`Cache::Store`（Marshal-cleanエントリー、Ractor寿命を越えて耐久）経由で伝播する。

推定サイズ: 大（約300〜500 LoC + spec）。

トレードオフチェック: Ractorごとのキャッシュレイヤーは、共有モデルではゼロに対してRactorあたり1つのコールドスタートを払う。ワーカープールがNファイルを処理する場合、ウォームアップコストは最初のファイル後に償却される。設計にコミットする前にプロファイル確認。

## フェーズ3 — プラグイン契約

ゴール: プラグインがRactorワーカーから実行できる。

### フェーズ3a — `Plugin::Blueprint` + 実体化ファクトリ（着地済み）

プラグインリプレイのための最小のクロスRactorハンドルが、ライブコーディネーターパスを変更せずに着地した。新しいサーフェス:

- **`Rigor::Plugin::Blueprint`** — 凍結された`Ractor.shareable?`値オブジェクトで、`klass_name`（String — 定数パス）プラスディープコピーされた`Ractor.make_shareable`処理された`config` Hashを運ぶ。構築は`String`または`Module`を取る;Module形は`klass.name`を保存する。
- **`Plugin::Blueprint#materialize(services:)`** — `Object.const_get(klass_name).new(services:, config:)`、その後`#init(services)`をリプレイする。`Loader#instantiate`にビット単位で等価なので、ブループリントパスは設定パスと一貫している。
- **`Plugin::Registry#blueprints`** — `plugins`と1:1で整列された凍結された`Array<Blueprint>`。ローダーは`plugin.class.name + plugin.config`経由でpost-topo-sortのプラグインリストから派生させる。
- **`Plugin::Registry.materialize(blueprints:, services:)`** — 各ブループリントを新鮮なプラグインインスタンスにマッピングして新しいRegistryを構築する。`load_errors`は意図的に空（ロード失敗はすでにコーディネーターレジストリで表面化している;ワーカーごとに繰り返されない）。

プラグインインスタンスは意図的に非共有のまま。実行ごとの可変アキュムレーター状態をivar（`rigor-sorbet`の`@reachable_absurd_nodes` / `@reveal_type_calls` / `@assert_type_mismatches`;ほとんどのRailsプラグインの`*_index` Hashes）に運ぶ。Ractorごとのパターンは、すべてのプラグイン作者にリファクターを強制せずに制約をサイドステップする: 境界越しにブループリントを送り、ワーカーごとに1度実体化し、各ワーカーが自身のインスタンスを寿命の間所有する。

監査カバレッジ: 新しい「フェーズ3 — プラグイン契約」describeの下で`spec/rigor/ractor_readiness_spec.rb`に4つの`Ractor.shareable?` / `frozen?`アサーション。

### フェーズ3b — クロスRactorプラグイン集約状態（先送り）

Ractorごとのパターンは各プラグインの実行ごとの観察ビューをスライスする。`rigor-sorbet`スタイルの集約追跡（ALLファイル全体のabsurd-reachable、reveal-type、assert-type-mismatch）は、フェーズ4が出荷したときに協調プロトコルを必要とする。ADR-15 § OQ2に文書化された3つの候補形:

1. 状態を`Plugin::FactStore` publish/consumeに移動。
2. ランナーでプラグインごとの結果マージ。
3. 並列性からのプラグインオプトアウト（`manifest(serial: true)`）。

フェーズ3bの決定はフェーズ4が実際の使用を測定するまで先送り。ランナーがシーケンシャル（フェーズ4オプトインデフォルト）のままなら、バンドルされたプラグインのどれもクロスRactor集約を必要としない。

推定サイズ: フェーズ4がランディングしたら小（選ばれた形のために約50〜100 LoC）。

## フェーズ4 — Ractor分離ファイルワーカー

ゴール: `Analysis::Runner#analyze_files`がファイルをRactorのプールにディスパッチする。

前提条件: フェーズ1〜3a。それらが着地したら、欠けている部分は:

### 今日Ractor境界を越えられるもの

フェーズ3a後、クロス境界ペイロードは完全に`Ractor.shareable?`:

- `Rigor::Configuration`（フェーズ2a — 凍結 + 共有可能）
- `cache_root`（`String`、凍結 — Cache::Storeディレクトリパス;各ワーカーがそのrootで自身のStoreを構築する）
- `libraries`、`signature_paths`（凍結された文字列の凍結配列）
- `Array<Rigor::Plugin::Blueprint>`（フェーズ3a — 凍結 + 共有可能）
- ファイルパスの`Array<String>`（凍結）

### Ractor境界を越えられないもの

ファクトファインディング監査（フェーズ3aに続くコミット）が、ワーカー設計が回避する必要がある3つのブロッカーを特定:

1. **`Rigor::Environment`**は共有可能でない — `RbsLoader`が可変`@class_known_cache` / `@instance_definition_cache` / `@singleton_definition_cache`プラス上流の`RBS::Environment`（可変、C拡張状態）を運ぶ。各ワーカーは自身のRactor本体内で`Environment.for_project(libraries:, signature_paths:, cache_store:, ...)`経由で自身の`Environment`を構築しなければならない（MUST）。
2. **`Cache::Store`**は共有可能でない — Monitor + counter ivars + default_procを持つHashすべてが契約に違反する。フェーズ4aは、各ワーカーが同じディスク上のディレクトリを指す自身のStoreを構築することでこれをサイドステップする。インプロセスメモの恩恵はクロスRactorで失われるが、ディスクバックのキャッシュは共有される（ファイルシステムが協調ポイント）。将来の作業（フェーズ4b？ 先送り）: Storeを直接共有可能にするか、メモアクセスを単一所有者Ractor経由でチャネルするRactor共有可能プロキシでラップする。
3. **`RbsExtended::Reporter` + `BoundaryCrossReporter`**は`Mutex`を使う — スレッドセーフだがRactor共有可能ではない。各ワーカーは自身のレポーターを構築しなければならない（MUST）;ランナーはレポーターの既存の重複除去ロジック経由で最後にエントリーをマージする（キーごとのエントリー追加は`(payload, source_location)`で冪等なので、事後マージは安全）。

### フェーズ4サブフェーズ分解

**フェーズ4a（着地済み） — `WorkerSession`値キャリア（まだRactorなし）**。{Rigor::Analysis::WorkerSession}は上記の共有可能な入力（`configuration`、`cache_store` / cache_root、`Array<Plugin::Blueprint>`、`explain`）を取り、内部で新鮮な`Plugin::Services` + `Plugin::Registry`（`Registry.materialize`経由） + `DependencySourceInference::Index` + `Environment` + セッションごとの`RbsExtended::Reporter` + `BoundaryCrossReporter`を構築する。プラグインの`#prepare`は構築時に1度実行;raiseは`#prepare_diagnostics`にキャプチャされ、呼び出し元がファイルごとの診断ストリームと一緒にそれらをドレインできる。`#analyze(path)`を公開し、ファイルごとの診断ストリーム（`Runner#analyze_file` + `plugin_emitted_diagnostics` + `explain_diagnostics`の等価物）プラス`#drain_reporters`がプール終了マージのための凍結されたレポータースナップショットを返す。

`Runner#analyze_file`との等価性は`spec/rigor/analysis/worker_session_spec.rb`で証明: 同じconfiguration + cache_store + plugin_blueprints、同じファイルごとの診断ストリーム（severity-profile再スタンプを除く — セッションはそれを呼び出し元に実行ごとの集約の関心事として残す）。プラグインライフサイクル（init、prepare、diagnostics_for_file）は、Runnerが今日適用するのと同じランタイムエラー分離エンベロープでブループリントパスを経由してリプレイされる。

基板は意図的に加法的: `Runner`はv0.1.4以前のリリースで引き続きファイルごとの解析を自身で駆動する。フェーズ4bは`Runner`を変更してファイルごとの解析を1つの（Ractorなし）WorkerSessionに委譲;フェーズ4cがN個のセッションを保持するN個のワーカーRactorをスポーンする。

ループ内にまだRactorなし — これは基板。

**フェーズ4b（着地済み） — `WorkerSession`周りのRactorプール**。`Analysis::Runner#initialize`は`workers: N`キーワードを取得する（デフォルト`0` = シーケンシャル、文書化されたv0.1.4以前の動作）。`N > 0`のとき、`Runner#analyze_files`は新しい私的な`#analyze_files_in_pool(files)`にディスパッチし、それがN個のRactorをスポーンする。各ワーカーは共有可能なペイロード（Configuration、cache_root String、Plugin::Blueprint Array、explain Boolean）を取り、内部で自身のWorkerSessionを構築し、`Ractor.main.send`経由でメインRactorのメールボックスに書き戻す（Ruby 4.0は`Ractor.yield`を削除した;メールボックスモデルは今や双方向）。3種類のメッセージ: `[:prepare, diagnostics]`（コーディネーターは最初のワーカーのスナップショットを保持）、`[:file, path, diagnostics]`（解析されたファイルごとに1つ）、`[:done, drained_reporters]`（終了時のワーカーごとに1つ）。診断順序はパスごとの結果Hashを元の入力順序で再フローすることで再構築される。ワーカーごとのレポータースナップショットは既存の`record_*` API経由でランナー側のアキュムレーターにマージされる（自然に重複除去）。`Environment::ClassRegistry.default`は`Ractor.make_shareable`され、ワーカーが`Ractor::IsolationError`なしに遅延読み取りできる;`Runner#analyze_files_in_pool`がメインRactorで最初にそれを事前ウォームする。`WorkerSession`コンストラクターはもはや`MethodDispatcher::FileFolding.fold_platform_specific_paths`プロセスグローバルに書き込まない（メイン以外の書き込みはraise） — Runnerがプールスポーン前にメインRactorで1度設定する。

等価性 + プラグインリプレイ + prepare重複除去は`spec/rigor/analysis/runner_pool_spec.rb`で証明。`spec/rigor/ractor_readiness_spec.rb` §「フェーズ4b — Ractorプール準備」での監査specカバレッジ。

**フェーズ4c（着地済み） — デフォルト + フラグ**。3つのオプトインサーフェス、優先順位はCLI > env > config > 0:

- `rigor check --workers=N` — 明示的CLIオーバーライド。
- `RIGOR_RACTOR_WORKERS=N` — env var、CIで有用。
- `.rigor.yml` `parallel: { workers: N }` — プロジェクトデフォルト。

`Configuration#parallel_workers`（デフォルト`0` = シーケンシャル）がYAMLを読む;CLIの`resolve_workers`プライベートメソッドが優先順位チェインを`Runner.new(workers:)`にスレッドする。負のenv var値は`0`にクランプされるので、迷子の`-1`がプールスポーンループをクラッシュさせない。非数値の設定値は`ArgumentError`をraiseするので、タイポが大きく失敗する。

シーケンシャルは文書化されたデフォルトのまま。シーケンシャル対プールのwall-clockのベンチマークは、現在のプールパスが些細なソースファイルのみを確実に処理するため（RBS / RubyGems C拡張状態がワーカー内での最初の非自明なenvアクセスで`Ractor::IsolationError`をトリップする）、フェーズ4b.xに先送り。

### フェーズ4b.x — ワーカー側env構築安定性（先送り）

フェーズ4bプールのワーカー`RBS::EnvironmentLoader.new`パスは、非共有モジュール定数のチェイン（`RBS::EnvironmentLoader::DEFAULT_CORE_ROOT`、`RBS::Repository::DEFAULT_STDLIB_ROOT`、`Gem::Requirement::DefaultRequirement`）を参照する。各々がワーカーRactorからアクセスされたときに`Ractor::IsolationError`をトリップする。リーフで`Ractor.make_shareable`を事前実行すると、RBSが続いてC拡張パス経由で使おうとするPathnameをディープフリーズし、クリーンなIsolation raiseではなくバスエラーを生成する（Ruby 4.0.4 + rbs 4.0.2 on macOS arm64で観察）。

3つの候補修正、各々が別個のサブフェーズ:

- **（a）コーディネーター側env + クロスRactorハンドル**。メインRactorで1度envを構築し、ワーカーが`Ractor.main.send`往復経由で参照するRactor共有可能なクエリファサード（`Environment::Reflection`の凍結サブセット）を公開する。コスト: クラスルックアップごとのクロスRactor RPC;ホットディスパッチパスにとってレイテンシ的に法外。

- **(b) RubyGems / RBS上流パッチ**。上流コードで違反する定数を共有可能にする。長期で最高のレバレッジ、2つの上流リポを協調する必要がある。

- **（c）代わりにフォークベースの並列性**。Ractorをスキップ;`Process.fork`を使ってワーカーが完全なRBS / RubyGems状態を持つ自身のプロセスを取得する。Ractorへの並行オプションとしてこのドキュメントで以前破棄;(a) / （b）が解決不能と判明したら再検討。

これらのいずれかが着地するまで、デフォルトシーケンシャルモードがプロダクションパス。

### フェーズ4aのオープン設計ポイント

- **プラグイン`#prepare`タイミング**。`prepare_plugins`は実行ごとに1度、ファイル解析前に実行され（runner.rb:424）、各プラグインが自身のサービスのfact_storeにファクトを公開することを期待する。Ractor分離下では、各ワーカーが自身のサービス / fact_storeを持つ自身のプラグインインスタンスを持つ — しかしfact_storeはMutex共有クロスRactorできない。選択肢: （a）コーディネーターで`prepare`を1度実行、生成されたファクトを共有可能なHashとしてダンプ、リプレイのためにワーカーに送信;(b)`prepare`がワーカーごとに実行されることを受け入れる（ほとんどのプラグインは同じディスク入力を再読する — 重複作業だが正しい）。4aが1つを選ぶ必要がある;fact_store内容がMarshalableと仮定すれば、（a）がより低コストの選択肢。

- **`dependency_source_index`**。すでに実行ごとに構築されている;共有可能性を検証するかワーカーごとに再構築する必要がある。

- **`scope_indexer.discovered_classes`のクロスファイルシード**。一部のフローは、以前のファイルから発見されたクラスでスコープを事前シードする（ADR-14 ObservationCollector）。並列ワーカーがファイルを並行して処理する場合、このクロスファイルシードは破綻する。Pin: ワーカーは独立したファイルごとの解析を実行する;ObservationCollectorパスはシーケンシャルのまま（デフォルトの`analyze_file`ではなく別個のコードパス）。

推定サイズ:

- フェーズ4a: 約200〜300 LoC（WorkerSession + spec）
- フェーズ4b: 約150〜250 LoC（Runner統合 + spec）
- フェーズ4c: 約50 LoC（フラグ + ドキュメント）

期待される恩恵: 4ワーカー + RBSキャッシュウォームで、数百ファイル（推論が支配する）のプロジェクトでwall-clockが約3×ドロップするはず。小さなプロジェクトはRactor起動オーバーヘッドを払うが、あまり勝てない。

## トレードオフと決定ポイント

- **CRuby Ractor成熟度**: Ractorは安定だが共有可能性制約は厳格。一部のRubyイディオム（クラスレベルの可変状態、動的に構築されるStringとfrozen-string-literalの相互作用）には各フェーズで慎重な監査が必要。
- **YJIT互換性**: YJITはRuby 3.3+でRactorごと。ワーカー起動はYJITウォームアップコストを払う。
- **プラグイン作者負担**: フェーズ3はプラグインがスレッド / Ractor認識である必要がある。フレームワークがレジストリリファクター経由でほとんどを引き受けられるが、ステートフルフックを持つプラグイン作者はRactorごとの実体化にオプトインする必要がある。
- **代替: フォークベースの並列性** — よりシンプル、今日動作するが、各ワーカーがEnvironment + RBSキャッシュを再構築し、フォークあたり約50〜200msかかる。スケールでのみ正味の恩恵。

フォークパスとRactorパスは相互排他的ではない。フォークベースは素早い勝利として最初に着地できる（CURRENT_WORKオープン項目#7）一方、Ractorフェーズは段階的に進む。

## 推奨される順序

1. ✅ フェーズ1 — 値オブジェクトの共有可能性。
2. ✅ フェーズ2a — `Configuration`ディープフリーズ。
3. ✅ フェーズ2b — `Environment::Reflection`抽出（凍結された読み取り専用ファサード;上流の`RBS::Location` C拡張制約のためRactor共有可能ではない;各フェーズ4ワーカーは共有された`Cache::Store`から自身のReflectionを構築する）。
4. ✅ フェーズ3a — `Plugin::Blueprint` + `Registry#blueprints` + `Registry.materialize`ファクトリ。
5. ⏭ フェーズ3b — クロスRactorプラグイン集約状態契約（フェーズ4まで先送り）。
6. ✅ フェーズ4a — `WorkerSession`値キャリア（まだRactorなし;プールの基板）。
7. ✅ フェーズ4b — `Runner#analyze_files`での`WorkerSession`周りのRactorプール（プログラム的な`workers: N`オプトイン;シーケンシャルが引き続きデフォルト）。
8. ✅ フェーズ4c — ユーザー向けオプトインフラグ（`RIGOR_RACTOR_WORKERS` env + `.rigor.yml` `parallel.workers:` + CLI `--workers=N`）。
9. ✅ フェーズ4b.x — キャッシュ事前ウォーム経由のワーカー側env構築安定性。`Runner`がプールスポーン前にメインRactorですべてのキャッシュ済みRBSプロデューサーをウォームする;ワーカーはディスク上のMarshal blobからすべてのリフレクションクエリを提供し、RubyGems / RBSモジュール定数分離チェインをサイドステップする。Rigor自身のディスパッチ定数が共有可能;`MethodCatalog`がYAMLを積極的にロードする。

各後続のフェーズは前のフェーズの監査specから読み取って前提条件を確認する。監査specがフェーズ間の契約。
