---
title: "Rigor Roadmap"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "3c90dfe73bba05bb5bf4edd63dbb4037d05ab33eb5bb9ceddd694d750a51ffb2"
sourceCommit: "dd1240d88f635b570b72ca36d1fccddc8df8ccd1"
sourceDate: "2026-05-18T05:10:51+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

将来を見据えたコミットメント: 何が積極的に進行中で、次に何が計画されているか、何が意図的にスコープ外か。

このファイルは**計画資料**であり、リリースログではありません。「何が出荷されたか」の記録については、[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/main/CHANGELOG.md)（アクティブな`0.1.x`サイクル）と[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)（アーカイブ済み`0.0.x`）を参照してください。

このファイルがADRまたは仕様と矛盾する場合、ADR / 仕様が拘束力を持ち、このファイルは古くなっています。

## リリース済みマイルストーン（ポインターのみ）

完全なリリースノートは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

| バージョン | リリース日 | テーマ |
| --- | --- | --- |
| v0.0.3 — v0.0.9 | 2026-05-02 → 2026-05-05 | 型語彙、推論エンジン、永続キャッシュ。[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)を参照。 |
| v0.1.0 | 2026-05-07 | 最初のプラグイン契約（6スライス）;7つの動作例。`CHANGELOG.md` § `[0.1.0]`を参照。 |
| v0.1.1 | 2026-05-08 | リテラル文字列ナローイングの深化、クロスプラグインAPI、プラグイン作成DX。`CHANGELOG.md` § `[0.1.1]`を参照。 |
| v0.1.2 | 2026-05-09 | プラグイン例の戻り型移行、エンジン深化フォローアップ。`CHANGELOG.md` § `[0.1.2]`を参照。 |
| v0.1.4 | 2026-05-14 | ADR-10 / ADR-11 / ADR-13の延期キュー、ADR-14 `rigor sig-gen`エンドツーエンド、`Type::BoundMethod`キャリア、18の動作プラグイン例。（v0.1.3のコミットメントエンベロープがカット前に追加のトラックを吸収し、v0.1.4として出荷。）`CHANGELOG.md` § `[0.1.4]`を参照。 |
| v0.1.5 | 2026-05-16 | ADR-15 Ractor移行エンドツーエンド（フェーズ1〜4c + 4b.x）、実世界Railsサーベイ（14プロジェクト、31,840ファイル）が本番改善を駆動（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識sigディスカバリ）、ADR-16マクロ / DSL展開基板（WD13フロアでO2をクローズ）、O4レイヤー3スライス1+2+3（`Gemfile.lock`パース + `rbs_collection.lock.yaml`認識 + 欠落gemの`:info`診断）、DEFAULT_LIBRARIESのstdlibカバレッジ拡張（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決、24の動作プラグイン例。`CHANGELOG.md` § `[0.1.5]`を参照。 |

## v0.1.6 — `master`に蓄積中（リリース保留中）

テーマ: **3つのaccepted-and-implemented ADRが、クロスプラグインファクト経由の呼び出しサイトごとの精度向上、プロジェクト側のmonkey-patch認識、基礎となるdry-rbプラグインをアンロックする — プラスエディタ / IDE統合の最初の2カット（エディタモードv1 + 言語サーバーv1）、実質的なLSP / specスイートのパフォーマンス向上、そして4つの新エコシステムプラグイン（rigor-dry-schema、rigor-graphql、rigor-dry-validation）プラス`rigor-rails`メタgemスキャフォールド**。コミット`3c99eed` → `8530856`。

- **[ADR-12](../adr/12-dry-rb-packaging/)（accepted） + `rigor-dry-types`スライス1+2+3**。gemごと + 計画されている`rigor-dry-rb`メタアンブレラ（Railsプラグインパターンに一致）。`rigor-dry-types`は`module Types; include Dry.Types(); end`を認識し、`:dry_type_aliases` ADR-9クロスプラグインファクト（15の正準 + 60のネストカテゴリ + ユーザー著作のコンポジションエントリ）を公開する。`examples/`下25番目の動作プラグイン。
- **[ADR-17](../adr/17-monkey-patch-pre-evaluation/)（accepted） + スライス1+2+3a+4**。`pre_eval:`設定軸 + `Inference::ProjectPatchedMethods`レジストリ + プラグインと依存ソース推論の間の新しいディスパッチャーティア。スライス3aは`フェーズB`スタイルのヒューリスティック戻り型抽出（ADR-10の`ReturnTypeHeuristic`を再利用） + `pre-eval.duplicate-declaration` `:info`を追加。スライス4はglobサポート（`lib/core_ext/**/*.rb`）を追加。スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス）、スライス6（プラグインAPIフック）は需要駆動のまま。
- **[ADR-18](../adr/18-substrate-per-call-site-return-type/)（proposed + スライス1+2+3+5）**。ADR-16への基板修正: `Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（宣言的な`position:` + `lookup_via: {plugin_id:, fact:}`クロスプラグインファクトチャネル）。`SyntheticMethodScanner`は呼び出しサイト引数の修飾定数ソース表現を抽出し、名前付きファクトでルックアップする。3ティアフォールバック（`returns_from_arg:` → 静的`returns:` → `Dynamic[Top]`）。Runnerはファクトが利用可能になるよう、合成メソッドスキャナの**前**にプラグインの`prepare(services)`を並べ替える**。エンドツーエンドのアップリフト**: `rigor-dry-struct` v0.2.0マニフェストは`:dry_type_aliases`を消費するため、`attribute :city, Types::String`は`Nominal[String]`を返す`Address#city`を合成する（スライス2cフロアでは`Dynamic[Top]`だった）。
- **エディタモードv1 — `--tmp-file` / `--instead-of`ペアフラグ + 読み取り専用キャッシュ + 単一ファイルスコープ + Ractor縮退**。PHPStanの「エディタモード」契約をミラーする: 外部ツールがユーザーの進行中バッファを一時ファイルに書き、Rigorはそのファイルが1つの論理パスを置き換えたかのように解析する。新しい`Rigor::Analysis::BufferBinding`値オブジェクトが`Runner` / `WorkerSession`パースポイント + `SyntheticMethodScanner` / `ProjectPatchedScanner`プレパスを通してスレッド化;並行安全なエディタ呼び出しのための新しい`Cache::Store(read_only: true)`モード;`rigor check`と`rigor type-of`の両方がペアフラグを獲得;Ractorプールはバッファがバインドされたときに自動的にシーケンシャルに縮退する。設計: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/)。CLI形は将来の「オプションB」（プロジェクトスコープ + ファイルごとの診断キャッシュ）と前方互換、そのキャッシュが着地したら。
- **言語サーバーv1 — `rigor lsp`サブコマンド + インプロセスRuby LSP**。[ADR-0](../adr/0-concept/)の先送りされたLSPコミットメントをクローズ。単一のインプロセスRuby LSPが`Analysis::Runner` + プラグイン + `Environment` + `Cache::Store`をホストする;コールドスタート税はセッションごとに1度支払われる;リクエストごとの作業はバッファごとの推論のみ。8スライスがカバー: ライフサイクル状態機械 + JSON-RPCディスパッチャーループ（stdio）;BufferTable + textDocument同期（FULL）;DiagnosticPublisher経由のpublishDiagnosticsエンドツーエンド;textDocument/hover（`rigor type-of`のコアを再利用）;textDocument/documentSymbol（Prism ASTウォーク）;ProjectContextキャッシング（Environment + 読み取り専用Cache::Store） + workspace/didChangeWatchedFiles / didChangeConfiguration無効化;Debouncer（200ms静穏時間） + SynchronizedWriter（Mutexラップされたstdout）。ライブラリ: `language_server-protocol ~> 3.17`（薄い）、Rigorが自身のディスパッチャー / ライフサイクル / プールを所有する。設計: [`docs/design/20260517-language-server.md`](../design/20260517-language-server/)。パッケージング形は[`ADR-19`](../adr/19-language-server-packaging/)で決定。
- **LSPフォローアップ着地** — `textDocument/signatureHelp`（新しい`SignatureHelpProvider`、センチネルパッチされた`obj.foo(`リカバリ、カンマカウントによるactiveParameter） + `HashShape`キャリア向けのhash-key補完（スライスD1;`[:`センチネル経由の新しい`KIND_FIELD`アイテム） + ユーザー向けエディタ統合ガイド（`docs/lsp-integration.md`、Neovim / VSCode / Helix / Emacsをカバー） + 実際の`exe/rigor lsp`バイナリをスポーンするエンドツーエンド統合spec。
- **LSPのポリッシュ + 新しい機能着地** — マルチオーバーロードsignatureHelp（C2） + hoverとsignatureHelpのRBSドキュメント表面化（C3） + 設定された`SignatureInformation.parameters`（C4） + hoverの`range`フィールド（E1） + 新しい`textDocument/foldingRange`（F1） + 新しい`textDocument/selectionRange`（G1）。6つの小さなスライス、すべてLSP v2設計の「オープンクエスチョン」 + 「スコープ外」リスト下。Specカバレッジ +12。
- **言語サーバーv2 — 型認識hover + `textDocument/completion`**。LSP v1への8スライスフォローアップ、設計は[`docs/design/20260517-lsp-hover-completion.md`](../design/20260517-lsp-hover-completion/)。Hoverは新しい`HoverRenderer`経由でPrismノードクラスごとのディスパッチを獲得: CallNodeはレシーバー + RBSシグネチャ + 戻り値を表示;ConstantReadNode / ConstantPathNodeはFQN + シングルトン型 + 定義先を表示;Local / Ivarは名前 + ナローイングされた型 + 囲むクラスを表示;リテラルはクリーンな`# Type / # Erased`を表示（デバッグの`node:`行をドロップ）、`Refined` / `Difference`のリファインメント名表面化付き。Completion（新しい`CompletionProvider` + アドバタイズされた`completionProvider.triggerCharacters: [".", ":"]`）: `obj.|`のメソッド補完、`Foo::|`の定数パス補完、複合レシーバー処理（Refined / Tuple / HashShape / Union-as-intersection / Intersection-as-union）、Prismがクリーンにパースできない編集中の`.` / `::`バッファに対するセンチネル名パッチ経由のパースリカバリ。
- **ADR-10ウォーカー — フェーズBヒューリスティック戻り型抽出**。オプトインgemソース内のリテラルテールメソッド本体は`Dynamic[Top]`の代わりに`Dynamic[T]`ラップされた特定型（`Constant<value>`、`Nominal[String]`、…）を貢献する。ヒューリスティックはADR-17スライス3aのプレパスと共有。
- **`is_a?(C)`レキシカルネスティング定数解決**。`Inference::Narrowing#analyse_class_predicate`はRubyの`Module.nesting`駆動のルックアップをミラーするため、ネストされた`Rigor::Type::Singleton`がトップレベルのstdlib `Singleton`に勝つ。`DEFAULT_LIBRARIES`内の`singleton`のブロックを解除。
- **DEFAULT_LIBRARIES拡張 +31 stdlibライブラリ**（1,273 → 1,427 RBSクラス、箱から出してすぐ）。
- **O4レイヤー3スライス3 — 優雅な縮退`:info`診断**、`Gemfile.lock`内のRBSソースがないgem向け（`rbs collection install`の提案）。
- **Specヘルパー — コンテンツキー化sigディレクトリ + 共有ワークスペース**。`spec/support/runner_helpers.rb`が`analyze(sig: …)`パスを書き換えるため、同一のsigコンテンツは1つのウォーム`RbsLoader` envエントリを共有し、ソースのみの高速パスはプロセスごとの1つの空のワークスペースを再利用する。`runner_spec.rb` 39.6秒 → **25.4秒孤立（-36%）**;`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。`before(:context)` Environment共有の代わりにキャッシュキー正規化を通じて「Spec-suiteランタイムブレークダウン（a）」をクローズ — runner_spec.rbのグループ構造への変更なし。
- **Specヘルパー — `plugin_helpers#run_plugin`でのオプトイン共有キャッシュ（sorbet最初の消費者）**。`PluginHelpers`がプロセス全体の`shared_cache_store` + specファイルがオプトインするためにオーバーライドする`default_run_plugin_cache_store`インスタンスメソッドを獲得する（`let(:default_run_plugin_cache_store) { :shared }`）。`sorbet_plugin_spec` 13.1秒 → **4.7秒孤立（-64%）**;統合シーケンシャル90.2秒 → **78.6秒（-13%）**。キャッシュI/Oオーバーヘッドが1〜11の例を持つファイルでのenv構築節約を超えるためオプトインパターン;重いプラグインspecのみが恩恵を受ける。将来の重いプラグインspecは1行の`let`で採用できる。3つのプラグインspec（actioncable / actionmailer / rails-i18n）は、プラグインキャッシュディスクリプタが読み取るプロジェクトファイルを含むまでオプトインできない（オープンエンジニアリング項目で別途追跡）。
- **LSP / エディタモード — `Analysis::ProjectScan`プレパススナップショットキャッシュ**。新しい`Analysis::ProjectScan`値オブジェクトがプラグインレジストリ / dep-sourceインデックス / スキャナ出力 / プレパス診断をバンドル、プラス`Runner#prepare_project_scan`ビルダーと`Runner.new(prebuilt:)`採用パス。LSPの`ProjectContext`はスナップショットを遅延ビルドし、`workspace/didChangeWatchedFiles` / `workspace/didChangeConfiguration`で無効化する;`DiagnosticPublisher`は各publishごとの`Runner.new`に渡すため、プラグイン`#prepare`、`Plugin::Loader.load`、依存ソースウォーカー、合成メソッド / プロジェクトパッチ済みスキャナはキーストロークごとに再実行されない。ボーナスの正確さ: キャッシュされたスキャナはバッファのみではなくプロジェクト全体を見るため、クロスファイルで宣言された合成メソッドはバッファ解析中に見える（スライス7 LSP設計のギャップをクローズ）。Specカバレッジ: 3ユニット + 4 Runner統合 + 3 ProjectContext。
- **プラグインキャッシュディスクリプタの正確性修正 — actioncable / actionmailer / rails-i18n**。新しい`Plugin::Base#glob_descriptor(roots, *patterns)`ヘルパーが`:digest` `FileEntry`行でglobマッチした全ファイルを列挙する`Cache::Descriptor`を構築する;影響を受ける3つのプラグインはそれを`cache_for(..., descriptor: …)`に通すので、キャッシュキーはプロデューサー実行前のプロジェクト状態を反映する（インプロセスの`IoBoundary`の新鮮プロセス時に空の読み出し履歴ではなく）。`rigor check`の永続キャッシュにおける実際の正確性バグ（チャネル / mailer / view / locale発見が編集をまたいで古いデータを返しうる）を修正。3プラグインspecが共有キャッシュにオプトイン（`let(:default_run_plugin_cache_store) { :shared }`）。Specカバレッジ: +6 `glob_descriptor`ユニットケース。
- **LSP / エディタモード — publish全体でのEnvironment共有**。`Runner.new(environment:)`オプトインkwarg + publishごとのレポーター差し替えのための`Environment#attach_reporters!`。LSPの`ProjectContext`は今、FULLな環境（プラグイン / scan / bundler / RBS-collection軸が焼き付け）をキャッシュし、publishごとの`Runner.new`に渡すので、連続的な`analyze_files`は呼び出しごとの`Environment.for_project`構築をスキップ（vendoredなgemを持つRailsプロジェクトで10〜50 msの節約）。publishごとのレポーター隔離は可変な`Environment::Reporters`スロット経由で扱う——envは凍結、内部コンテナは可変——なので診断イベントは単一のpublishにスコープされたまま。Specカバレッジ: +4 `attach_reporters!`ケース + 3 Runner env-overrideケース。
- **`rigor-dry-types`スライス4 — 推移的コンポジション参照の解決**。`AliasScanner#collect_compositions`内の2パス走査: パス1は直接コンポジション（正準ルートのRHS）を集め;パス2は別のローカルコンポジションをターゲットとするRHSを持つ残りの`ConstantWriteNode`を解決する（`ManagerEmail = Email`、多段チェーン、コンポジション上にrootedされたメソッドチェーン）。訪問済みセット経由のサイクル検出。dry-typesエイリアスカバレッジはこれでWD13フロアにおいて完全。
- **`examples/rigor-dry-schema/`スライス1+2 — `Dry::Schema.X`認識 + `each(<T>)`リストスロット**。新しいdry-rbアダプター（dry-types + dry-structの次の具体的なdry-rbプラグイン、[dry-validationのスライシング計画](../design/20260517-dry-validation-slicing/)に従う）。スライス1はプロジェクトを歩いて`Foo = Dry::Schema.{Params,JSON,define} { ... }`代入を探し、スキーマごとの`:dry_schema_table`クロスプラグインファクト（`{schema_const_fqn => {required: {key => {type:, list:}}, optional: {…}}}`）を公開する;12の正準型語彙 + `value(Types::Email)`形に対するクロスプラグイン`:dry_type_aliases`解決。スライス2は`each(<T>)`リスト認識 + 対称的な`list:`スロットを追加（将来の消費者がリスト対スカラーを一様に推論できるよう`rigor-graphql`のフィールドテーブル形をミラーリング）。26番目の動作プラグイン。
- **`examples/rigor-graphql/`スライス1+2a+2b+2c+2d — Schema::{Object, Enum, InputObject, Mutation}認識**。最後の保留中だったTier 3エコシステムプラグイン（Tier 3D）をクローズ。graphql-rubyの`field` DSLは純粋なメタデータレコーダー（Rubyメソッドを発行しない——[サーベイ §「GraphQL-Ruby」](../notes/20260515-macro-expansion-library-survey/)を参照）なので、プラグインはADR-16基板消費者ではなく**静的型テーブル生成者**として出荷される。4つのクロスプラグインファクトを公開する: `:graphql_type_table`（Schema::Objectフィールド）、`:graphql_enum_table`（Schema::Enum値）、`:graphql_input_object_table`（Schema::InputObject引数）、`:graphql_mutation_table`（Schema::Mutation引数+フィールド）。フィールド行は`{type:, nullable:, list:}`を運ぶ;引数行は`{type:, required:, list:}`を運ぶ（graphql-rubyの極性）;ユーザー定義型は下流の消費者が一様にクロスリファレンスできるよう修飾名として保存される。27番目の動作プラグイン。Specカバレッジ: 31統合ケース。
- **`examples/rigor-dry-validation/`スライス1 — Contract認識 + RBSオーバーレイ**。[スライシング計画](../design/20260517-dry-validation-slicing/)に従ったTier Aのdry-rbアダプター。`class T < Dry::Validation::Contract`サブクラスを探して歩く（フルパスAND字句的なDry `< Validation::Contract`形;素の`< Contract`と同じtail-異なるrootケースは拒否）;ソート＋凍結されたcontract FQNリストを`:dry_validation_contracts`クロスプラグインファクトとして公開する。`Contract#call → Result` + `Result#{success?, failure?, to_h, errors, []}`を型付けするRBSオーバーレイ（`sig/dry_validation.rbs`）を出荷するので、ユーザーの`signature_paths:`下で`contract.call(input).to_h`チェーンがクリーンに解決される。スライス2（`:dry_schema_table`消費経由の型付き`result.to_h`合成）は先送り。28番目の動作プラグイン。
- **`examples/rigor-rails/`メタgemスキャフォールド — Tier 1+2 Railsエコシステムアンブレラ**。ADR-12 WD1に従い、7つのTier 1+2サブプラグイン（rails-routes / rails-i18n / actionmailer / activejob / activerecord / actionpack / factorybot）を`add_dependency`宣言とワンストップの`require "rigor-rails"`経由で引き寄せるGemfile-conveniencメタgem。アンブレラはGemfile専用;ユーザーは依然`.rigor.yml`の`plugins:`リストでアクティブにしたいプラグインを個別に列挙する（mix-and-matchは明示のまま）。`examples/`の29番目のエントリ（27の動作プラグイン + 1つのRBS-onlyバンドル + 1つのメタgem）。
- **設計ノート** — [`docs/design/20260517-dry-validation-slicing.md`](../design/20260517-dry-validation-slicing/)はdry-rbアダプターの依存ツリー（dry-validationの前にdry-schemaが着地しなければならない）を記録し、次のdry-rbステージのための5スライス計画を提案する。[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)は、CLIエディタモード（`rigor check --tmp-file`）がウォームヒットでプレパスをスキップできるようにするディスクバック`ProjectScan`キャッシュの5フェーズ実装パスを記述する;具体的なエディタ拡張が需要を浮かび上がらせるまで先送り（LSPがすでにpublishごとの ≤5 msでエディタケースの90%+をカバー）。

コミットされたすべてのv0.1.6トラックは純粋に加法的（既存のCLI消費者の動作変更なし）;基板修正（ADR-18）は新しい3ティアフォールバック下でv0.1.6以前の`returns:`セマンティクスを保持する。

### v0.1.6のスコープ外（キュー、需要駆動）

- **ADR-17スライス3b**（ファイルごとのキャッシュディスクリプタ）、スライス5 / 6（フルプロジェクト2パス / プラグインAPIフック）。
- **ADR-18スライス4**（`returns_from_arg:`のTraitRegistryパリティ） + 連鎖呼び出し引数拡張（`Types::String.constrained(...)`チェインヘッド解決）。
- **ADR-12**継続: `rigor-dry-types`スライス4 + `rigor-dry-schema`スライス1+2 + `rigor-dry-validation`スライス1がすべて着地済み（CHANGELOG `[Unreleased]` § Added）。残り: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断;需要駆動）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json { ... }`パリティ）;`rigor-dry-monads`（依然`Result[T, E]` / `Maybe[T]`キャリア決定が必要 — スライシング計画を参照）。
- **ADR-10オプションC**（遅延 / オンデマンドの呼び出しごとのgem-source推論）。
- 合成メソッドティアの`returns:`文字列（ユーティリティ型戻り値）向けの**ADR-13リゾルバチェイン配線**。
- **ADR-16スライス5b**（Tier Dエンジン統合）。
- **エディタモードフォローアップ**（[`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「v1のスコープ外」）: ファイルごとの診断キャッシュ（単一ファイルスコープ（オプションA） → 代入付きプロジェクトスコープ（オプションB）にアップグレードするレバー）、プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ、マルチバッファ（`--buffer A=B --buffer C=D`）、`--also=dep1,dep2`呼び出し元宣言のディペンデント、LSPデーモン / ファイルウォッチ。
- **`rigor-graphql`スライス1+2a+2b+2c+2dすべて着地**（Tier 3D — `Schema::Object` + リストラッパー + `Schema::Enum` + `Schema::InputObject` + `Schema::Mutation`認識、4つのクロスプラグインファクトを公開;CHANGELOG `[Unreleased]` § Added）。残りの将来スライス（リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け）は需要駆動。
- **O4レイヤー3 gemバージョンごとのキャッシュ**（スライス3アーキテクチャ;将来のRuby::BoxスタイルのBundler拡張が優先順位を上げる）。

## 将来のサイクル（特定のリリースにコミットされていない）

v0.1.x作業を通じて浮かび上がった項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。

### 型言語 / エンジン
- **O2 — マクロテンプレート + heredoc-Ruby展開**。基板フロア + 精度プロモーションは[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + 7（コミット584ae85…56706a5） + スライス6a-TierB / 6b-TierC精度（コミットd174fff / d7b1943）を通じて配信: Tier A（ブロック-as-メソッド） + Tier B（トレイトインライニングレジストリ） + Tier C（heredocテンプレート）エンジン統合が新しい`SyntheticMethodIndex` + プレパススキャナを通じて;Tier D（外部ファイルインクルージョン）はスライス5aの先送りに従いエンジン統合を先送りした契約のみを出荷;Concern（`included do`）再ターゲティングはスキャナで処理;**スライス6**精度プロモーションはTier B発行を`origin_module:`provenance経由で`RbsDispatch.try_dispatch`にルーティングする（Deviseの`valid_password?`は今`Dynamic[T]`ではなく`bool`を返す）し、Tier Cの素のクラス名`returns:`文字列を`environment.nominal_for_name`経由で解決する。3つの動作消費者が着地: `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。残り項目: **スライス5b**（Tier Dエンジン — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド;キュー、需要駆動）、**ADR-13リゾルバチェインの完全な配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名`Pick<T, K>`をリゾルバチェイン経由でルーティング;キュー、需要駆動）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **DSLシグネチャでの軽量HKT（高階型）**。[ADR-20](../adr/20-lightweight-hkt/)が提案された（2026-05-18）。Yallop & White 2014 / fp-tsに従う脱関数化されたタグ + `App[F, A]`キャリア、すでに`docs/type-specification/rigor-extensions.md`に列挙されている条件型 / インデックスアクセス行の上に構築される。最初の具体的な採用者: `JSON.parse`の`untyped`スロット（6つの実装スライスがスケッチされており、スケジュールされたスライスはまだない）。背後にキューされた横断的な採用者: `rigor-lisp-eval`デモ、`rigor-dry-monads`の`Result[T, E]` / `Maybe[T]`、スキーマ駆動の`rigor-dry-validation`結果。
- **`rigor:v1:conforms-to`ディレクティブ**。元々v0.1.1の「スコープ外」にキューされていた;まだオープン。メソッドパラメーターが名前付き構造インターフェースを満たす任意の値を受け付けられるようにする。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価**。[ADR-17](../adr/17-monkey-patch-pre-evaluation/) accepted（2026-05-16）。スライス1+2+3a+4はv0.1.6で**着地**（`pre_eval:`配管 + レジストリ + ディスパッチャーティア + ヒューリスティック戻り型 + 重複宣言`:info` + globサポート）。残りの需要駆動フォローアップ: スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。（注: クロスプラグインファクト経由の呼び出しサイトごとの戻り型ルックアップはv0.1.6で[ADR-18](../adr/18-substrate-per-call-site-return-type/)を介して出荷;上記のADR-13配線は直交する「パラメータ化形パーサー」拡張。）

### プラグイン / エコシステム
- **`rigor-graphql`** — Tier 3DプラグインがスライスでLANDED（v0.1.6、1+2a+2b+2c+2d）: `Schema::Object` + リストラッパー + `Schema::Enum` + `Schema::InputObject` + `Schema::Mutation`認識、4つのクロスプラグインファクト（`:graphql_type_table`、`:graphql_enum_table`、`:graphql_input_object_table`、`:graphql_mutation_table`）を公開。ADR-16基板消費者ではなくメタデータレコーダーの形（graphql-rubyの`field` DSLはRubyメソッドを発行しない — [サーベイ §「GraphQL-Ruby」](../notes/20260515-macro-expansion-library-survey/)を参照）。将来のスライス（リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け）は需要駆動。
- **dry-rbアダプタープラグイン** — [ADR-12](../adr/12-dry-rb-packaging/) accepted（2026-05-16）: gemごとのプラグイン + 計画されている`rigor-dry-rb`メタアンブレラ、Railsプラグインファミリーパターンに一致**。着地**: `rigor-dry-struct`（v0.1.5;ADR-18精度向上を持つv0.1.6でv0.2.0）、`rigor-dry-types`（v0.1.6でスライス1+2+3+4 — 完全なエイリアスカバレッジ、サイクル検出付きの推移的コンポジション参照を含む）、`rigor-dry-schema`（v0.1.6でスライス1+2 — Schema宣言認識 + `each(<T>)`リストスロット）、`rigor-dry-validation`（v0.1.6でスライス1 — Contract認識 + RBSオーバーレイ）**。残り**: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。基礎サーベイは[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)。
- **ADR-10 — gemソースからの呼び出しごとの戻り型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り型を推論すること（`mode: :full`が`Dynamic[Top]`より豊富に貢献できるように）は、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **`rigor-sorbet`の呼び出しサイトごとのsigilゲーティングを超えるフォローアップ** — v0.1.4で着地。未解決のキュー項目なし。

### エディタ / IDE統合
- **LSP — 並列マルチバッファpublishのためのRactorプール**。LSP設計ドキュメントのスライス8は2つの関心事を列挙した: デバウンス（着地）AND Ractorプール統合。プール部分は需要駆動のまま — ワーカーをLSP `initialize`で1度事前ウォームしpublish全体で再利用できるよう、`Analysis::Runner`が事前ビルドされた永続的`Environment`を受け入れるリファクターが必要。ProjectContext（スライス7）はすでに読み取り専用`Cache::Store`経由でpublish + hoverにウォームEnvironmentの勝利を与える;ディスパッチ側並列性（コア全体のマルチバッファpublish）が残りのレバー。需要駆動。
- **LSP — `textDocument/definition`**（設計ドキュメントのスライス9、先送り）。`FILE:LINE`でキー化された`Reflection`側のシンボルインデックスが必要。需要駆動。
- **LSP — インクリメンタル`didChange`同期**（設計ドキュメントのスライス10、先送り）。現在、サーバーは`TextDocumentSyncKind::Full = 1`をアドバタイズするため、各キーストロークがバッファ全体を再送信する。インクリメンタル（`TextDocumentSyncKind::Incremental = 2`）はUTF-16オフセット帳簿 + 編集ごとの適用が必要。帯域幅はローカルstdioなのでコストはワイヤではなくパースにある;需要駆動。
- **LSP — まだキューされた拡張機能**（v2以降 + フォローアップ後 + ポリッシュ後）: `textDocument/codeAction`、`textDocument/rename`、`textDocument/semanticTokens`、`textDocument/inlayHint`、`textDocument/definition`（LSP v1設計のスライス9 — Reflectionシンボルインデックスが必要）、インクリメンタル`didChange`同期（LSP v1設計のスライス10 — UTF-16オフセット帳簿）、並列マルチバッファpublishのためのRactorプールディスパッチ（LSP v1設計のスライス8後半 — Runnerリファクター）、マルチルートワークスペース、TCP / Unixソケット輸送、スニペット展開、素の名前（暗黙のself）補完、シンボル補完、シグネチャ内ハイライトのための`ParameterInformation`オフセットタプルラベル、`completionItem/resolve`遅延ペイロード、プラグイン側の補完貢献。
- **エディタモードオプションB — ファイルごとの診断キャッシュ**。今日のエディタモードはオプションA（単一ファイルスコープ）を出荷: バッファのみがファイルごとの診断を生成する。オプションB（PHPStan形: プロジェクト全体の解析と1つの代入されたファイル、「編集ファイル + ディペンデントのみ再解析」）にアップグレードするには、`（ファイルダイジェスト、プロジェクトEnvironmentダイジェスト）`でキー化されたファイルごとの診断キャッシュが必要。ADR-17スライス3bのファイルごとのキャッシュディスクリプタが最も近い既存のレバー。設計: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「スコープの選択」。需要駆動。
- **CLIエディタモード — ディスクバック`ProjectScan`スナップショットキャッシュ**。実装パスは[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)に文書化。`rigor check --tmp-file=X --instead-of=Y`シェルアウトパスをターゲット: プロジェクトのプレパス出力（スキャナ + dep-sourceインデックス + プラグイン公開ファクト）を`.rigor/cache/`に永続化し、`(config + plugin manifest + project file mtime+size + pre_eval mtime+size)`でキー化することで、ウォームCLI呼び出しがプレパスをスキップできるようにする。期待される勝利: CLI呼び出しあたり-200 ms（小プロジェクト）から>-1.3秒（基板プラグインを持つ大規模モノレポ）。新しい不変条件: `Plugin::FactStore`スナップショットAPI、プラグインファクトのMarshalフレンドリーさ。5フェーズ（Marshal可能なscan / キー導出 / キャッシュプロデューサー / Runner統合 / FactStoreスナップショットAPI）。需要駆動;LSPパスはすでにエディタケースのほとんどをpublishあたり≤5 msでカバーしているので、このスライスは具体的なCLIシェルアウトのエディタ拡張が約1秒の壁をUX問題として報告したときに着手される。
- **エディタモード — プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ**。LSPパスで**着地**（v0.1.6、CHANGELOG `[Unreleased]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan`ビルダー + `Runner.new(prebuilt:)`採用パス;LSPの`ProjectContext`がスナップショットを遅延ビルドし、`invalidate!`でドロップする。CLIエディタモード（`rigor check --tmp-file`）はまだスナップショットを消費**しない**、各呼び出しが新鮮なプロセスのため — `（plugin-manifestダイジェスト、プロジェクトファイルmtime + サイズリスト）`でキー化されたディスクバックのスナップショットキャッシュが、ワンショットCLI呼び出しもプレパスをスキップできるようにする。需要駆動;LSP側の勝利が典型的なエディタ消費者。
- **エディタモード — `--also=path,path`呼び出し元宣言のディペンデント**。エディタ拡張は現在、ディペンデントを更新するためにN個の単一ファイル呼び出しを発行する必要がある。`--also`付きの単一の呼び出しがそれらをバッチする。些細なCLI拡張;設計ノートは`docs/design/20260516-editor-mode.md`。需要駆動。
- **マルチバッファエディタモード**（`--buffer A=B --buffer C=D`）。LSP v1がほとんどのユースケースでこれを置き換える（LSP `BufferTable`はすでにNバッファを保持する）;非LSPバッチツーリングには引き続き関連。需要駆動。

### パフォーマンス / スケーラビリティ
- **O4レイヤー3 — `Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング**。v0.1.5の`BundleSigDiscovery` MVPの上に座る。MVPの自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）はバージョン管理された解決テーブルになる;rigorは`Bundler::LockfileParser`出力を消費 + `ruby/gem_rbs_collection`で最適マッチバージョンをクエリする。O7の失敗メモでアンブロック（競合は今ハングするのではなく警告する）。
- **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリー;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。
- **Spec-suiteランタイムブレークダウン（2026-05-17調査;部分的に着地）**。`make verify`デフォルトが並列rspec（コミット`086e507`）に切り替わった: wall時間217秒 → 60秒（12コアで3.6×）。フォローオンサイクルが実際のボトルネックは**各`analyze(sig: …)`での呼び出しごとのRBS env再構築**であることを確認した: `Cache::Store`は`RbsDescriptor::FileEntry`ごとに`(path, sha256)`でenvをキーするため、各呼び出しの一意の`Dir.mktmpdir`ルートのsigパスが新鮮な約1.8秒のenv構築を強制した**。ヘルパー側の修正が着地**（`spec/support/runner_helpers.rb`）: コンテンツキー化sigディレクトリ + ソースのみの呼び出しに対する共有ワークスペース。`runner_spec.rb` 39.6秒 → **25.4秒孤立（-36%）**、`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。元々キューされた2つのレバーは小さな残りのヘッドルームでオープンのまま:
  - **(a) `runner_spec.rb`の例間で`Environment`を共有**、`before(:context)`または`let_it_be`形のヘルパー経由で。キャッシュキー修正が呼び出しごとのコストのsig関連コンポーネントをクリアしたので、残りの勝利はソースのみの高速パスを打つ約80%の例に対するEnvironment構築自体。例ごとのプラグイン変動は依然共有を複雑化する。需要駆動;ヘルパー側の修正がすでにほとんどのヘッドルームを吸収した。
  - **（b）インメモリ`Analysis::Runner.run_source(source:, path:, ...)`エントリーポイント**。各呼び出しでパス展開 + ワークスペースchdirをスキップ;埋め込み者（LSP / エディタモード）のための今日`Runner.new(configuration:).run`経由でルーティングされるクリーンなパブリックAPI。ヘルパー修正の上に小さなインクリメンタルなテストデルタ（約5%）だが、安定したパブリックサーフェスとして有用。需要駆動。
- **インメモリ`Analysis::Runner.run_source`エントリーポイント（パブリック + テスト専用）**。上記の「Spec-suiteランタイムブレークダウン」フォローアップ（b）と同じ項目;レガシークロスリファレンスのためにここに保持。

### Sig-gen（ADR-14）
- **`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。

### ADRにキューされたオープン研究質問
- **ADR-15 § OQ1** — Ractorごとの`Cache::Store`共有ファサード。今日各ワーカーはキャッシュから自身のRBS envを構築する;OQ1は共有可能なファサード経由でワーカー全体でインメモリenvを共有することを探る。プールのwall-clockがシーケンシャルを上回るクロスオーバー（現在は約1.3〜1.8Kファイル）を下げる。
- **ADR-13 §「オープンクエスチョン」** — 5つのコア関数（`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`）を超えるシェイプ射影サーフェスの拡張。新しいマップ型語彙を追加するときに権威的。

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（v0.1.4 / v0.1.5までリリース;v0.1.6は`master`に蓄積中）:**

- **Tier 1**: [`rigor-rails-routes`](../examples/rigor-rails-routes/)（`:helper_table`を公開）、[`rigor-rails-i18n`](../examples/rigor-rails-i18n/)、[`rigor-actionmailer`](../examples/rigor-actionmailer/)、[`rigor-activejob`](../examples/rigor-activejob/)。
- **Tier 2**: [`rigor-activerecord`](../examples/rigor-activerecord/)（`:model_index`を公開;アソシエーション / enum / スコープ / バリデーション / コールバックすべてv0.1.5で着地）;[`rigor-actionpack`](../examples/rigor-actionpack/)（4フェーズ: ルート / フィルター / レンダー / ストロングパラメーター）;[`rigor-factorybot`](../examples/rigor-factorybot/)（フェーズ1 (a) + （c））。
- **Tier 3**: [`rigor-pundit`](../examples/rigor-pundit/)、[`rigor-sidekiq`](../examples/rigor-sidekiq/)、[`rigor-rspec`](../examples/rigor-rspec/)、[`rigor-actioncable`](../examples/rigor-actioncable/)、[`rigor-activestorage`](../examples/rigor-activestorage/)（v0.1.5で着地）;[`rigor-graphql`](../examples/rigor-graphql/)（v0.1.6 — Tier 3D、スライス1+2a+2b+2c+2dがクローズ）。
- **オプトインの非プラグインバンドル**: [`rigor-activesupport-core-ext`](../examples/rigor-activesupport-core-ext/)（v0.1.5;トップ約50 AS core_extセレクタ向けのオプトインRBSバンドル）。[`rigor-typescript-utility-types`](../examples/rigor-typescript-utility-types/)（ADR-13スライス6）。
- **ADR-16基板消費者プラグイン（v0.1.5）**: [`rigor-sinatra`](../examples/rigor-sinatra/)（Tier A — ブロック-as-メソッド）、[`rigor-dry-struct`](../examples/rigor-dry-struct/)（Tier C — heredocテンプレート）、[`rigor-devise`](../examples/rigor-devise/)（Tier B — トレイトインライニングレジストリ）。マクロ展開基板をエンドツーエンドで行使する3つの純粋に宣言的なプラグイン。
- **メタgem（ADR-12 WD1に基づくGemfile-conveniencアンブレラ）**: [`rigor-rails`](../examples/rigor-rails/)（v0.1.6スキャフォールド — Tier 1+2依存関係を宣言;ユーザーは`.rigor.yml`でアクティブにしたいサブセットを依然として列挙する）。
- **dry-rb基礎ペア（v0.1.6）**: [`rigor-dry-types`](../examples/rigor-dry-types/) — `:dry_type_aliases`ファクト（15の正準 + 60のネストカテゴリ + ユーザー著作のコンポジション + 推移的参照）;[`rigor-dry-schema`](../examples/rigor-dry-schema/) — `:dry_schema_table`ファクト（認識 + `each`リストスロット）;[`rigor-dry-validation`](../examples/rigor-dry-validation/) — `:dry_validation_contracts`ファクト + `Contract#call → Result`のRBSオーバーレイ。`rigor-dry-struct` v0.2.0はADR-18の`returns_from_arg:`経由で`:dry_type_aliases`を消費し呼び出しサイトごとの精度向上を実現。

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`スライス3+（リゾルバメソッド型チェック;ブラケット形を超える`<Type>.array` / `<Type>!`連鎖形;文字列形`field :foo, "User"`診断;`Schema.execute(...)`結果型付け）。
- `rigor-dry-schema`スライス2+（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2+3（`:dry_schema_table`消費経由のparamsブロック型付け + `json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。`rigor-rails`メタgemスキャフォールド（v0.1.6）はTier 1+2アンブレラのための公開可能なテンプレート — gemspec + `add_dependency`宣言はすべて整っている;野生でのアクティベーションはサブプラグインのsubtree-split + RubyGems公開を待つ。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5でリリース。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。

[ADR-18](../adr/18-substrate-per-call-site-return-type/)（基板の呼び出しサイトごとの戻り型DSL）はv0.1.6に向けて`master`に蓄積中。`Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（+ `lookup_via:`クロスプラグインファクトチャネル）を追加;`rigor-dry-struct` v0.2.0は最初の動作消費者（`rigor-dry-types`が公開する`:dry_type_aliases`経由で`attribute :city, Types::String`を`Nominal[String]`に解決）。スライス4（TraitRegistryパリティ） + 連鎖呼び出し引数抽出は需要駆動のまま。
