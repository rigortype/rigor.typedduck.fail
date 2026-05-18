---
title: "Current Work — Inference Engine Checkpoint"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "c3b0909c8e131214edf3d26af654db4e50d21de81d78e3636cd1c7fa8fdeab4a"
sourceCommit: "dd1240d88f635b570b72ca36d1fccddc8df8ccd1"
sourceDate: "2026-05-18T23:28:30+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

これは長い実装スレッドをレビュー可能なチャンクに分割するための一時的なブックマークです。**規範的な**契約とスライスロードマップは[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります。将来を見据えたコミットメントエンベロープ（アクティブなサイクル + キューされた作業）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は`CHANGELOG.md`です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.5リリース済み（2026-05-16）**。スライスごとのまとめは`CHANGELOG.md` § `[0.1.5]`。完全なv0.1.0 → v0.1.5リリースログは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（隣接リリースタグ間の任意のコミットで`git log -- docs/CURRENT_WORK.md docs/ROADMAP.md`）。

v0.1.5のテーマ（タグで凍結、完全な詳細はCHANGELOG）:

1. **ADR-15 Ractor移行エンドツーエンド**（フェーズ1、2a、2b、3a、4a、4b、4b.x、4c）+ spec-suiteのパフォーマンス向上（`Cache::Store`スレッドセーフ + インプロセスメモ + `parallel_tests`経由で12コアで162秒 → 27秒）。
2. **実世界Rails / Rubyサーベイ + 本番品質の改善**。14のプロジェクト（31,840ファイル）が`examples/rigor-activesupport-core-ext/`（オプトインRBSバンドル、総診断 −75%）、`data/vendored_gem_sigs/`（6つのネイティブ拡張gemをデフォルトで）、条件内代入のナローイング、Ractor向けの4つのディープ共有可能性フォローアップ、`Hash[K, V] <:= Enumerable[[K, V]]`射影、`CONSTANT_CONSTRUCTORS` Proc共有修正、`RbsLoader#env`失敗メモ（約550×の高速化）を駆動した。
3. **[ADR-16](../adr/16-macro-expansion/)マクロ / DSL展開基板** — フロア + 精度プロモーション着地;3つの動作消費者プラグインを持つ4ティア基板（Tier Aブロック-as-メソッド / Tier Bトレイトインライニングレジストリ / Tier C heredocテンプレート / Tier D外部ファイル契約のみ）。WD13フロアでROADMAP O2をクローズ。
4. **O4レイヤー3（スライス1+2+3）ターゲットプロジェクトRBSソースディスカバリ + DEFAULT_LIBRARIES拡張**。`Rigor::Environment::LockfileResolver`、`RbsCollectionDiscovery`、`RbsCoverageReport`、欠落gemの`:info`診断、+31のstdlibライブラリ自動ロード（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決。

## 作業が再開される場所

次のサイクル（`v0.1.6`）は`master`に蓄積中（リリース保留中）。今までに着地したスライス（コミット`3c99eed` → `8530856`）:

- **`data/vendored_gem_sigs/prism/` — prism gem用のRBS補足**。gem自身の`sig/`が省略するC拡張バインドのクラスメソッド（`StringQuery.{local?, constant?, method_name?}`）とRubyソースメソッド（`ParseResult#attach_comments!` / `#mark_newlines!`）を追加。gemのRBSと並べてロードされる（衝突なし — 新しい宣言のみを追加）。`VENDORED_GEM_NAMES`は6 → 7にバンプ。referencesサーベイ: 1747 → 1743（-4エラー）。✓
- **エンジン — `eval_call`が引数位置のDefNodesを歩く（ruby2_keywords / private def / public def / module_function def）**。delegate.rbの`ruby2_keywords def method_missing`が駆動。各`Prism::DefNode`引数は今`eval_def`を通過するので、ボディのスコープインデックスは囲むクラスボディの`singleton(C)`ではなく適切なインスタンス/シングルトン`self_type`を見る。✓
- **エンジン — `OverloadSelector`パス1.5（エイリアス解決済みstrict）**。`references/ruby/lib/ipaddr.rb:51`の`Array#*(Integer)`の誤解決が駆動。正準コアエイリアス（`::int` / `::string` / `::interned` / `::io` / `::encoding` / `::path` / `::boolean`）は、両候補がエイリアスを使うとき正しいオーバーロードが勝つよう、strictとgradualの間の新しいパスでstrict-armマッチを得る。✓
- **エンジン — `class << Foo`（明示的定数のシングルトンクラス）はFooのシングルトンスコープを開く**。referencesサーベイ（`time.rb`の`class Time; class << Time; ...`）が駆動。新しい`singleton_class_prefix`ヘルパーがレシーバを解決し、囲むクラスにマッチすれば畳み、無関係なら接頭辞を置き換える。StatementEvaluator側にもミラーリング。time.rb: 13 → 1エラー。✓
- **エンジン — `Rigor::Builtins::StaticReturnRefinements`ディスパッチャ層 + `Kernel#__dir__`エントリ**。`MethodDispatcher.dispatch`内のHKTとRBSの間の新しい層が、上流のRBSが文書化された挙動より広いstdlibメソッドのための`(owner, method, kind)`オーバーライドテーブルを参照する。`Kernel#__dir__`は今、3つの呼び出し形すべて（暗黙のself / `Kernel.__dir__` / `instance.__dir__`）で`non-empty-string | nil`を返す。`Kernel#caller`、`File.expand_path`などのための前方拡張サーフェス。✓
- **エンジン — `def Foo.method`明示的レシーバ形が囲むクラス上のシングルトンとして認識される**。references/ruby/libサーベイ（open-uri.rbの`def OpenURI.check_options`など）が駆動。`ScopeIndexer` + `StatementEvaluator`が`def_receiver_targets_lexical_self?`ヘルパーを取得し、レシーバ定数が字句的に囲むクラスに解決されるときに`def C.method`をシングルトンに昇格させる。クロスクラス形（`module Foo`内の`def Bar.x`）は昇格されないまま。open-uri.rb: 24 → 15エラー。✓
- **エンジン — 組み込みPrismリーフノードフォールバックハンドラ + リファインメント向上**。`rigor check --explain references/ruby/lib`サーベイが駆動;8つの新しい`PRISM_DISPATCH`エントリが`__FILE__` / `__LINE__` / バックティック / `%x{...}` / `END { … }` / shareable-constantコメント / `{ x: }`省略形 / `it`パラメータをカバー。Rubyのcore/stdlibリファレンスツリーで約60の`:info` fail-softフォールバックイベントが削除された。フォローアップコミット`e44cfee`が`__FILE__`を`non-empty-string`に、`__LINE__`を`positive-int`に絞り込んだ（正準のインポート済みリファインメント — パーサが見たパスは`""`にはなりえず、行番号は1始まり）。✓
- **O4レイヤー3スライス3**（優雅な縮退カバレッジ診断）。✓
- **`is_a?(C)`レキシカルネスティング定数解決**。✓
- **DEFAULT_LIBRARIES拡張**（+31 stdlibライブラリ;1,273 → 1,427 RBSクラス）。✓
- **[ADR-10]ウォーカーヒューリスティック戻り型抽出**（フェーズBフロア）。✓
- **[ADR-12] dry-rbパッケージング** acceptance + `rigor-dry-types`スライス1+2+3（Tier A基礎;正準 + ネストカテゴリ + ユーザー著作のコンポジション;25番目の動作プラグイン）。✓
- **[ADR-17] monkey-patch事前評価** acceptance + スライス1+2+3a+4（`pre_eval:`配管 + `ProjectPatchedMethods`レジストリ + ディスパッチャーティア + ヒューリスティック戻り型 + 重複宣言`:info` + globサポート）。✓
- **[ADR-18]基板の呼び出しサイトごとの戻り型DSL** proposed + スライス1+2+3+5（`HeredocTemplate::Emit#returns_from_arg` + スキャナ抽出 + ファクトストアルックアップ + `rigor-dry-struct`消費者マニフェスト更新 — クロスプラグインファクト経由の最初のエンドツーエンドの精度向上）。✓
- **エディタモードv1** — `rigor check` / `rigor type-of`がペアの`--tmp-file` / `--instead-of`フラグを獲得 + `BufferBinding`値オブジェクトがRunner / WorkerSession / プレパスを通してスレッド化 + 並行安全なエディタ呼び出しのための`Cache::Store(read_only: true)` + 単一ファイルスコープ（バッファのみがファイルごとの診断を生成）+ Ractorプール自動シーケンシャル縮退。7スライスカット、設計は[`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/)。スコープ外フォローアップ（「オプションB」用のファイルごとの診断キャッシュ、プロジェクトコンテキストスナップショットキャッシュ、マルチバッファ、`--also`、LSPデーモン）はROADMAP §「エディタ / IDE統合」にキュー。✓
- **言語サーバーv1** — `rigor lsp`サブコマンド + ADR-0の先送りされたコミットメントをクローズするインプロセスRuby LSP。8スライスカット、設計は[`docs/design/20260517-language-server.md`](../design/20260517-language-server/)。`initialize` / `shutdown` / `exit`ライフサイクル + stdio JSON-RPC + BufferTable + `textDocument/didOpen/Change/Close` + `textDocument/publishDiagnostics`（200msデバウンス） + `textDocument/hover` + `textDocument/documentSymbol` + `workspace/didChangeWatchedFiles` + ProjectContextキャッシング（ウォームEnvironment + 読み取り専用Cache::Store） + Debouncer（協調的キャンセル） + SynchronizedWriter（Mutexラップされたstdout）をカバー。新しいランタイム依存`language_server-protocol ~> 3.17`。パッケージング形は[ADR-19](../adr/19-language-server-packaging/)で決定（`rigortype`にバンドル）。✓
- **言語サーバーv2** — 型認識hover + completion。8スライスカット、設計は[`docs/design/20260517-lsp-hover-completion.md`](../design/20260517-lsp-hover-completion/)。HoverがPrismノードクラスごとのディスパッチを獲得（CallNode → レシーバー + シグネチャ + 戻り値;Constant → FQN + シングルトン + 定義先;Local/Ivar → 名前 + 型 + 囲むクラス;リテラル → クリーンなType/Erased + リファインメント名表面化）。Completionは`[".", ":"]`トリガー文字を持つ`textDocument/completion`を出荷: `obj.|`のメソッド補完、`Foo::|`の定数パス補完、複合レシーバー処理（Refined/Tuple/HashShape → 基底のnominal;Union → メソッドの交差;Intersection → メソッドの和集合）、編集中の`.` / `::`バッファに対するセンチネル名パッチ経由のパースリカバリ。✓
- **LSPフォローアップクラスター** — `textDocument/signatureHelp`（新しい`SignatureHelpProvider`;センチネルパッチされた`obj.foo(`リカバリ;カンマカウントによるactiveParameter;`signatureHelpProvider.triggerCharacters: ["(", ","]`をアドバタイズ） + `HashShape`キャリア向けのhash-key補完（スライスD1;`[:`センチネルパッチが`:foo` / `"bar"`キーをKIND_FIELDアイテムとして返す） + ユーザー向け[エディタ統合ガイド](../lsp-integration/)（Neovim / VSCode / Helix / Emacsのセットアップ、トラブルシューティング、パフォーマンス） + `Open3.popen3`経由で実際の`exe/rigor lsp`バイナリをスポーンするエンドツーエンドspec。✓
- **LSPのポリッシュ + 新しい機能** — 6つの小さなスライス: signatureHelpマルチオーバーロード表示（C2） + hoverとsignatureHelpのRBSコメント（C3） + 設定された`SignatureInformation.parameters`（C4） + hoverの`range`フィールド（E1） + 新しい`textDocument/foldingRange`（F1） + 新しい`textDocument/selectionRange`（G1）。LSPは今9つの機能をアドバタイズする（textDocumentSync / hoverProvider / completionProvider / signatureHelpProvider / documentSymbolProvider / foldingRangeProvider / selectionRangeProvider + workspace/didChangeWatchedFiles + workspace/didChangeConfiguration）。✓
- **`make verify`デフォルトで並列** — コミット`086e507`がspecフェーズをシーケンシャルな`bundle exec rspec`から`rake spec_parallel`（`PARALLEL_TEST_PROCESSORS`ワーカー全体でparallel_rspec）に切り替えた。12コアでwall時間217秒 → 60秒（3.6×）。Rakefileが`runner_pool_spec.rb`用のネイティブ`--exclude-pattern`を取得する（spec_helper.rbのRSpec設定側の除外はparallel_rspecがワーカーがspec_helperをロードする前にファイルを分割するため適用されなかった）。`make verify-sequential`は遅いflake耐性のあるフォールバックとして保持;`make verify-parallel`は後方互換のエイリアスとして保持。AGENTS.mdの検証プロトコルエントリーが更新。✓
- **Specヘルパー — コンテンツキー化sigディレクトリ + 共有ワークスペース**（CHANGELOG `[Unreleased]` § Performance）。`runner_spec.rb` 39.6秒 → **25.4秒（-36%）**、孤立;`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。✓
- **Specヘルパー — `plugin_helpers#run_plugin`でのオプトイン共有キャッシュ**（CHANGELOG `[Unreleased]` § Performance）。`sorbet_plugin_spec` 13.1秒 → **4.7秒（-64%）**孤立;統合シーケンシャル90.2秒 → **78.6秒（-13%）**。✓
- **LSP / エディタモード — プロジェクトコンテキストプレパススナップショットキャッシュ**（CHANGELOG `[Unreleased]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan(paths:)`ビルダー + `Runner.new(prebuilt:)`採用パス。LSPの`ProjectContext`はスナップショットを遅延ビルドし、`invalidate!`（監視ファイル / 設定変更）でドロップする。`DiagnosticPublisher`は各publishごとの`Runner.new`に渡すため、プラグイン`#prepare`、`Plugin::Loader.load`、`DependencySourceInference::Builder.build`、合成メソッド / プロジェクトパッチ済みスキャナはキーストロークごとに再実行されない。ボーナスの正確さ: キャッシュされたスキャナはバッファのみではなくプロジェクト全体を観察するため、他のファイルで宣言された合成メソッドはバッファ解析中に見える — スライス7 LSP設計からの既知のギャップをクローズ。✓
- **プラグインキャッシュディスクリプタの正確性修正**（CHANGELOG `[Unreleased]` § Added）。新しい`Plugin::Base#glob_descriptor(roots, *patterns)`ヘルパーが`:digest` `FileEntry`行でglobマッチしたすべてのファイルを列挙する。3つのプラグインキャッシュプロデューサー（actioncableの`:channel_index`、actionmailerの`:mailer_index`、rails-i18nの`:locale_index`）はそれを`cache_for(..., descriptor: …)`を通して通すので、キャッシュキーはプロデューサー実行前のプロジェクト状態を反映する。3つの統合specsは今、共有キャッシュにオプトインする（修正が着地した証拠）。✓
- **LSP / エディタモード — publish全体でのEnvironment共有**（CHANGELOG `[Unreleased]` § Added）。`Runner.new(environment:)`オプトインオーバーライド + publishごとのレポーター差し替えのための`Environment#attach_reporters!`。LSP `ProjectContext`は今、FULLな環境（プラグイン / scan / bundler / collection軸すべてが焼き付け）をキャッシュし、publishごとの`Runner.new`に渡すので、連続的な`analyze_files`は呼び出しごとの`Environment.for_project`構築をスキップする（vendoredなgemを持つRailsプロジェクトで10〜50 msの節約）。publishごとのレポーター隔離は可変な`Reporters`スロット経由で扱う——envは凍結、スロットは可変——なので診断イベントは1つのpublishにスコープされたまま。✓
- **`examples/rigor-dry-schema/`スライス1**（CHANGELOG `[Unreleased]` § Added）。`Foo = Dry::Schema.{Params,JSON,define} { ... }`宣言を認識し、`:dry_schema_table`クロスプラグインファクトを公開、`value(Types::Email)`参照を`:dry_type_aliases`経由で解決する。26番目の動作プラグイン。✓
- **`examples/rigor-graphql/`スライス1**（CHANGELOG `[Unreleased]` § Added）。`class T < GraphQL::Schema::Object`サブクラス + `field :name, Type, null: ...`宣言を認識し、`:graphql_type_table`クロスプラグインファクトを公開する。Railsプラグインロードマップに従い、最後の保留中Tier 3エコシステムプラグインをクローズ。メタデータレコーダー形（ADR-16基板ではない）。27番目の動作プラグイン。✓
- **CLIエディタモードのディスクバック`ProjectScan`スナップショットキャッシュ — 設計ノートのみ**、[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)。CLIシェルアウトニッチ向けに実装パスが文書化された（LSPはすでに最適化済み）。5フェーズ（Marshal可能なscan / キー導出 / キャッシュプロデューサー / Runner統合 / FactStoreスナップショットAPI）。具体的なエディタ拡張が`rigor check --tmp-file`にシェルアウトし約1秒の壁をUXペインとして報告するまで先送り。✓（設計のみ）
- **rigor-dry-typesスライス4 — 推移的コンポジション参照の解決**。`AliasScanner#collect_compositions`内の2パス走査、サイクル検出付き。dry-typesエイリアスカバレッジはWD13フロアにおいて完全に — 認識可能なすべてのユーザー著作コンポジション（正準 / ネストカテゴリ / `.constrained` / `.optional` / `.default`チェーン / 多段`ManagerEmail = Email`チェーン）が基底のクラスに解決される。✓
- **設計ノート — `rigor-dry-validation`のスライシング決定**（[`docs/design/20260517-dry-validation-slicing.md`](../design/20260517-dry-validation-slicing/)）。依存ツリー（dry-validationの前にdry-schema）を記録し、5スライス計画を提案し、validation自体にはADR-3修正が必要ないことを確認し、dry-monadsのための`Result[T, E]` / `Maybe[T]`キャリア決定をフレーミング。✓（設計のみ）
- **`examples/rigor-graphql/`スライス2a + 2b — リストラッパー + `Schema::Enum`**。リストラッパー（`field :tags, [String]`）が`{type:, nullable:, list: true}`として認識される;複数要素 / 空リストリテラルはドロップ。`Schema::Enum`サブクラスが`:graphql_enum_table`に寄与する（ソート済みの値名リスト）。マニフェストは`:graphql_type_table` + `:graphql_enum_table`の両方をアドバタイズする。✓
- **`examples/rigor-dry-schema/`スライス2 — `each(<T>)`リスト認識 + 対称な`list:`スロット**。行ごとの値形は今`{type:, list:}`（`each`が`list: true`を設定;`filled`/`value`/`maybe`が`list: false`を設定）。`rigor-graphql`のフィールドテーブル形と対称なので、将来のクロスプラグイン消費者（rigor-dry-validationスライス2）がリスト対スカラーを一様に推論できる。✓
- **`examples/rigor-graphql/`スライス2c + 2d — `Schema::InputObject` + `Schema::Mutation`**。4つの`Schema::*`種別に拡張。InputObjectとMutationの間で共有される新しいヘルパー`collect_arguments`が`argument :name, Type, required: ...`行をパースする（`required:`デフォルト`false`はgraphql-rubyの引数デフォルト極性をミラー、`field`の`null:`とは逆）。Mutation行は`arguments:`と`fields:`の両方のサブテーブルを運ぶ。プラグインは合計4つのファクトを公開する（`:graphql_type_table`、`:graphql_enum_table`、`:graphql_input_object_table`、`:graphql_mutation_table`）。✓
- **`examples/rigor-rails/`メタgemスキャフォールド — Tier 1+2 Railsエコシステムアンブレラ**。ADR-12 WD1に従う。`rigor-rails.gemspec`が7つのTier 1+2サブプラグイン依存を宣言 + `lib/rigor-rails.rb`がすべてを一度に`require`する。Gemfile-conveniencのみ;`.rigor.yml`アクティベーションはプラグインごとのまま。29番目の`examples/`エントリ。✓
- **`examples/rigor-dry-validation/`スライス1 — Contract認識 + RBSオーバーレイ**。`class T < Dry::Validation::Contract`サブクラス（フルパス + 字句的Dry形;素の`< Contract` + 同じtail異なるrootは拒否）を歩く。ソート＋凍結された`:dry_validation_contracts`ファクトを公開する。RBSオーバーレイ（`sig/dry_validation.rbs`）を出荷し`Contract#call → Result` + `Result#{success?, failure?, to_h, errors, []}`を型付けするので、`contract.call(input).to_h`チェーンがクリーンに解決する。28番目の動作プラグイン（今や27の動作 + 1つのRBSバンドル + 1つのメタgem = 29の`examples/`エントリ）。✓

残りの作業の自然なエントリー（v0.1.6進行中スライス後）:

1. **リリース準備候補**。ADR-12 / ADR-17 / ADR-18すべてがフロア + 動作消費者状態にあり、v0.1.6は実質的なユーザー可視サーフェスを出荷した。[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従った`bundle exec rake release`が自然な次の「出荷状態」決定;明示的なユーザー承認待ち。
2. **rigor-dry-typesスライス4 — 推移的コンポジション参照 — 着地済み**。CHANGELOG `[Unreleased]` § Added「rigor-dry-typesスライス4」。`AliasScanner#collect_compositions`内の2パスウォーク、サイクル検出付き。dry-typesエイリアスカバレッジはWD13フロアで完全。
3. **rigor-dry-rb継続**（[ADR-12](../adr/12-dry-rb-packaging/)ロードマップの継続;スライシング決定は[`docs/design/20260517-dry-validation-slicing.md`](../design/20260517-dry-validation-slicing/)）**。v0.1.6で着地**: dry-typesスライス1+2+3+4（完全なエイリアスカバレッジ）、dry-schemaスライス1+2（Schema宣言認識 + `each(<T>)`リストスロット）、dry-validationスライス1（Contract認識 + `Contract#call → Result`型付けのRBSオーバーレイ）**。残り（需要駆動）**: `each`を超えるdry-schemaスライス2+サーフェス（ADR-16 Tier C heredocテンプレート基板経由の型付き`result.to_h`合成 — Contractごとの精度向上）;dry-validationスライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json { ... }`パリティ）;dry-monads（依然`Result[T, E]` / `Maybe[T]`キャリア質問でブロック — 2つのルートが文書化済み（新しい`Rigor::Type::*`種別vs `Union`ベースの回避策）、決定は具体的な需要まで先送り）。
4. **ADR-18フォローアップスライス**。スライス4（`returns_from_arg:`のTraitRegistryパリティ）と連鎖呼び出し引数拡張（`Types::String.constrained(...)` → チェインヘッド経由で解決）はどちらも需要駆動のまま。現在のフロアは正準著作ケースをカバーする`ConstantReadNode` / `ConstantPathNode`形状を処理する。
5. **ADR-17フォローアップスライス**。スライス3b（`Cache::Descriptor::PreEvalEntry`）は測定された痛みまで先送り。スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）は需要駆動のまま。
6. **gemソースからの呼び出しごとの戻り型精度**（ADR-10ウォーカー拡張、オプションC遅延 / オンデマンド）。フェーズBフロア（ヒューリスティックリテラルテール抽出）は`e40947c`で着地;オプションCは呼び出しサイトリクエストでgem推論を遅延配線する — ウォーカー / ディスパッチャー境界への実質的なアーキテクチャ変更、需要にゲート。
7. **`rigor-graphql`スライス1+2a+2b+2c+2d着地済み**。最後の保留中Tier 3エコシステムプラグインがクローズ。`Schema::Object` + リストラッパー（`field :tags, [String]`） + `Schema::Enum` + `Schema::InputObject` + `Schema::Mutation`認識;4つのクロスプラグインファクトを公開。メタデータレコーダープラグイン形（ADR-16基板消費者ではない — サーベイ §「GraphQL-Ruby」を参照）。将来のスライス（リゾルバメソッド型チェック、ブラケット形を超える`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け）は需要駆動。CHANGELOG `[Unreleased]` § Added。
8. **O4レイヤー3 gemバージョンごとのキャッシュ（スライス3アーキテクチャ）** — 測定された痛みまで先送り。Ruby::Boxの将来の方向性コンテキストについては下記「オープンエンジニアリング項目」を参照。
9. **ADR-16需要駆動フォローアップ** — (a) **スライス5b** Tier Dエンジン統合（マッチした外部ファイルが`self_type`をナローイングされ`bound_ivars`が事前バインドされた状態で実行される）;(b) `returns:`文字列の完全なADR-13 `Plugin::TypeNodeResolver`チェイン配線（`Array[String]` / `Pick<T, K>`のようなユーティリティ型形の基板戻り値をアンロックする）。両方ともADR-16 § 実装スライシングフットノートで固定;具体的なプラグイン作者のケース待ち。
10. **エディタモードフォローアップ** — [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「v1のスコープ外」を参照。素早い次のステップは**プロジェクトコンテキストスナップショットキャッシュ**で、バッファされたファイルのみが変更されたときにプレパス（合成メソッドスキャナ、プロジェクトパッチ済みスキャナ、依存ソースウォーカー）がそのウォークをスキップするようにする;より大きなレバーは**ファイルごとの診断キャッシュ**で、エディタモードをオプションA（単一ファイルスコープ）からオプションB（PHPStan形: プロジェクトスコープと1つの代入されたファイル + インクリメンタル診断キャッシュ）にアップグレードする。両方とも需要駆動;v1 CLIサーフェスの最初の具体的なエディタ拡張消費者が自然と優先順位を表面化する。
11. **LSPフォローアップ** — [`docs/design/20260517-language-server.md`](../design/20260517-language-server/)（v1） + [`docs/design/20260517-lsp-hover-completion.md`](../design/20260517-lsp-hover-completion/)（v2）を参照。最高レバレッジのキューされた項目: （a）並列マルチバッファpublishのための**Ractorプールディスパッチ**（v1スライス8の後半;`Analysis::Runner`が事前ビルドされた永続的Environmentを受け入れるリファクターが必要）;(b) **`textDocument/definition`**（v1スライス9;FILE:LINEでキー化されたReflection側のシンボルインデックスが必要）;(c) **インクリメンタル`didChange`同期**（v1スライス10;UTF-16オフセット帳簿）;(d) **`textDocument/signatureHelp`**（v2の自然な補完;`foo(|`のパースリカバリは独自のスライス）;(e) **hash-key補完** `HashShape`キャリア向け（Rigorが出荷できる最も型駆動の補完、`hash[:|]`パースリカバリにゲート）。スコープ外のまま（codeAction / rename / semanticTokens / inlayHint / snippets / 素の名前 / シンボル / マルチオーバーロード / `completionItem/resolve`）の各機能は独自の設計パスが必要;優先順位は具体的なエディタ統合需要から表面化する。

## オープンエンジニアリング項目

次の実装者がフルスレッドを再読することなく見ておくべき永続的な項目。リリース済みマイルストーンにすでに吸収された項目は、再記述するのではなく`CHANGELOG.md`を通じて参照されます。

### サーベイ駆動（v0.1.5サイクル、すべての項目クローズ）

14プロジェクトの実世界Railsサーベイは、v0.1.5サイクル中に3ラウンドを通じて実行されました。下記のすべての項目はクローズ（完全なまとめは`CHANGELOG.md` § `[0.1.5]`）;クロスドキュメントルックアップ用の「各IDが何か」のリファレンスインデックスとしてここに残す。

| ID | ステータス | 項目 |
| --- | --- | --- |
| O1 | 着地（MVP、v2） | トップ約50のActiveSupport `core_ext`セレクタ向けの`examples/rigor-activesupport-core-ext/`オプトインRBSバンドル。v2はラウンド2の掃引後に`compact_blank` / `exclude?` / `index_with` / `Hash.from_xml` / `DateTime`計算を追加。 |
| O2 | 基板フロア + 精度プロモーション着地（Tier A/B/Cエンジン + Tier D契約 + Concern再ターゲティング + 3つの動作消費者プラグイン + ドキュメント + スライス6精度）;スライス5b + ADR-13リゾルバチェイン配線はキュー | マクロテンプレート / heredoc-Ruby展開。[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + 7（コミット584ae85…56706a5） + スライス6a-TierB / 6b-TierC（コミットd174fff / d7b1943）を通じて出荷。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier B → モジュールRBS、Tier C → 素のクラス名ルックアップ）で機能完成。tDiaryの`instance_eval`プラグインパターン + Railsジェネレーターの`.rb`-as-ERBテンプレートは、先送りされたスライス5b（Tier Dエンジン）に引き続き関連する。パラメータ化 / ユーティリティ型の基板戻り値は、需要駆動のADR-13リゾルバチェイン配線に先送り。 |
| O3 | 非問題 | 早期exitナローイング（`next if x.nil?` / `return if x.nil?`）はすでに動作;サーベイ残余は`Object#blank?` / `#present?` / `#try`で、O1がカバーする。 |
| O4 | レイヤー1+2+3（スライス1+2+3）着地 | Bundler認識。レイヤー1（`bundler.bundle_path`） + レイヤー2（`.bundle/config` / `vendor/bundle/`の自動検出） + レイヤー3スライス1（`Gemfile.lock`パース + バンドルsigフィルター、コミット`3c99eed`） + レイヤー3スライス2（`rbs_collection.lock.yaml`認識、コミット`46c9ec7`） + レイヤー3スライス3（ロックされたgemにRBSカバレッジがないときの優雅な縮退`:info`診断）。gemバージョンごとのキャッシュディスクリプター（`bundle update`がプロジェクト全体ではなく影響を受けるgemのスライスのみを無効化する）は、より大きなアーキテクチャ変更としてキューに残る。 |
| O5 | 着地（`ac14c45`） | `Inference::Acceptance#accepts_nominal_from_nominal`での`Hash[K, V] <:= Enumerable[[K, V]]`パラメータ化された祖先射影。今日のHash → Enumerableの手書きマッピング;一般的なRBS駆動の`definition.ancestors[i].args`射影は先送り。 |
| O6 | 着地（`4698437`） | `MethodDispatcher::CONSTANT_CONSTRUCTORS`のディープシェア（Proc値は浅い`.freeze`下で共有可能ではなかった）。修正後GitLab FOSSでプール ≡ シーケンシャル。 |
| O7 | 着地（`3c4a7ff`） | `RbsLoader#env`が失敗をメモ化。修正前は、1つの競合する`signature_paths:`エントリーがASTノードごとにenvを再構築（ファイルあたり390×、1つのコントローラーに約35秒）。修正後: 5つのコントローラーに対して0.15秒（約550×の高速化）、違反ファイルを名指しする1つのユーザー向け警告のみ。O4レイヤー3のブロックを解除 — stdlib RBSと競合するgem同梱sigsが今では優雅に縮退する。 |

### stdlibカバレッジ拡張 — オープンな設計の質問（2026-05-16）

`Environment::DEFAULT_LIBRARIES`を拡張するv0.1.5の作業（コミット`0a4ffea` + フォローオン）が駆動。23の追加stdlibライブラリが今、自動ロードされる（1,273 → 1,412 RBSクラス）。2つの設計判断ポイントが表面化し、先送りされた:

1. **rigorの内部キャリアとのstdlib名前衝突（解決済み）**。`singleton`（stdlibの`Singleton`ミックスイン）が当初レキシカルスコープ内で`Rigor::Type::Singleton`と衝突し、`lib/rigor/type/singleton.rb#==`の`is_a?(Singleton)`ナローイングで`undefined-method`偽陽性を表面化した。`Inference::Narrowing#analyse_class_predicate`のレキシカルネスティング修正経由で解決: 素の名前引数は、`scope.self_type`から派生したチェイン（`Module.nesting`駆動の定数ルックアップをミラー）を通じて解決されるため、ネストされた`Rigor::Type::Singleton`がトップレベルのstdlib `Singleton`に勝つ。`singleton`は今`DEFAULT_LIBRARIES`に入っている。より広いレキシカル解決カバレッジ（メソッドディスパッチレシーバー、属性アクセスなど）はさらなる需要にゲート — 修正はクラス述語ナローイングサーフェスに対して外科的。

2. **上流`rbs` gemのstdlib RBSカバレッジギャップ**。`strscan`が当初バッチ2をブロックした、バンドルされたRBSが`StringScanner#[](Integer)`のみを宣言するため、一方で実際のRubyは名前付きキャプチャの`StringScanner#[](Symbol)`をサポートする — rigor自身が`lib/rigor/builtins/imported_refinements.rb:422,424`で使う。便宜的な解決（下記の応答パス（a））が影響を受ける呼び出しサイトに2つの`# rigor:disable argument-type-mismatch`ディレクティブを適用し、`strscan`を`DEFAULT_LIBRARIES`に移動した、そのためパーサーコードを解析するユーザーがStringScannerディスパッチ精度を取得する。残りの応答パスは長期的な修正としてオープンのまま:
   - **（a）ライブラリをスキップ** — バッチ2で当初使用;バッチ3.5で（a'）に取って代わられた
   - **（a'）ギャップに影響を受ける呼び出しサイトでのインソース`# rigor:disable`ディレクティブ** + ライブラリをロード。バッチ3.5で着地したもの。トレードオフ: 上流RBSが修正されたときにrigor自身のコードがメンテナンス負担を運ぶ（ディレクティブを削除しなければならない）;負担は限定的（1ファイルに2つの呼び出しサイト）。これは`lockfile_resolver.rb`の`Bundler::LazySpecification#platform`にすでに使用されているのと同じパターン。
   - **(b) rigor自身の`sig/`下に手書きのRBSオーバーレイを作成**。AGENTS.md §「RBS Authorship」に従い、プロジェクトポリシーは手書きRBSよりも`rigor sig-gen`を好むが、「上流RBS shimギャップを埋める」は「推論から生成する」とは別個のカテゴリーであると議論できる。小さな焦点を絞ったオーバーレイ（`StringScanner#[](Symbol)`行）が、rigor自身のコードがdisableディレクティブを落とせるようにする。
   - **(c) `ruby/rbs`に修正を上流化してgemをバンプ**。最高品質の長期パス;クロスプロジェクト協調が必要。

   同じパターンは、ライブラリセットが拡張するにつれて他のstdlib RBSギャップに対しても再発する。決定ツリーは: 上流RBSギャップが単一の内部呼び出しサイトで表面化したとき、（a'）（disableディレクティブ）を好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、（b）または（c）にエスカレートする。

### セッション終了の繰り越し（2026-05-17）

スライスごとの着地リストを超えて、次の実装者へのメモ:

1. **`make verify`は今デフォルトで並列**。AGENTS.md検証プロトコルが更新。並列のみのflakeを見たら、ワーカー分離か実際のバグかを確認するために`make verify-sequential`にフォールバックし、それから報告する。`runner_pool_spec.rb`は両方のパスから除外（シーケンシャルは`RSpec.config.exclude_pattern`経由、並列は`parallel_rspec --exclude-pattern`経由）;`RIGOR_INCLUDE_RACTOR_POOL=1`で両方ともオプトインに戻す。`make test-ractor-pool`で分離して再現可能なプールspecカバレッジを実行。
2. **Spec-suiteのホットスポット — 部分的に最適化（2026-05-17）**。`spec/support/runner_helpers.rb`の**コンテンツキー化sigディレクトリ + 共有ワークスペース**レバー（CHANGELOG `[Unreleased]` § Performance）が`runner_spec.rb`を**25.4秒孤立**にカットし、`make verify`並列wall時間を**65.6秒 → 52.6秒（-20%）**に。残りのROADMAP §「パフォーマンス / スケーラビリティ → Spec-suiteランタイムブレークダウン」レバーはキューのまま: (a) `runner_spec.rb`での`before(:context)`スタイルのEnvironment共有;(b) `Analysis::Runner.run_source(source:, path:, ...)`インメモリエントリポイント。LSP-spec分割は調査され**拒否**。
3. **LSP v1 + v2 + フォローアップが今9のアドバタイズされた機能を出荷**。lspサブシステムは「キーストロークの速いリンティング + hover + completion + signatureHelp + folding + selection」ループに対して機能完成。残りのLSP作業（codeAction / rename / semanticTokens / inlayHint / definition / インクリメンタル同期 / Ractorプールディスパッチ）はROADMAP §「エディタ / IDE統合」 — 各々が独自の設計パスを必要とし;優先順位は具体的なエディタ統合需要から表面化する。
4. **v0.1.6はそのまま出荷可能**。蓄積された作業（ADR-12 / ADR-17 / ADR-18フロア + 動作消費者状態 + エディタモードv1 + LSP v1/v2 + LSPポリッシュ + spec-suite並列デフォルト）は純粋に加法的 — 既存のCLI消費者の動作変更なし。`rigor-release-prep` SKILLに従った`bundle exec rake release`が自然な次の決定;明示的なユーザー承認待ち。
5. **`rigor-*`作業を追加するときに念頭に置くべきプラグインパッケージングADR**。[ADR-12（dry-rb）](../adr/12-dry-rb-packaging/)はgemごと + メタアンブレラパターンを設定;[ADR-19（LSP）](../adr/19-language-server-packaging/)はLSPが`rigortype`にバンドルされたまま（別個の`rigor-lsp` gemではない）と決定し、再評価のための明示的なトリガー条件を持つ。両方のADRがプロジェクトが取る「早すぎるgem分割なし」スタンスを文書化する。
6. **プラグイン`cache_for(...)`ディスクリプタの完全性 — 着地済み（2026-05-17）**。CHANGELOG `[Unreleased]` § Added「プラグインキャッシュディスクリプタの正確性修正」で修正された。新しい`Plugin::Base#glob_descriptor(roots, *patterns)`ヘルパーが`:digest` `FileEntry`行でglobマッチしたすべてのファイルを列挙する;影響を受ける3つのプラグイン（actioncable / actionmailer / rails-i18n）は今、それを`cache_for(..., descriptor: …)`を通じてスレッド化するので、キャッシュキーはプロデューサー実行前のプロジェクト状態を反映する。3つの統合specsは今、`let(:default_run_plugin_cache_store) { :shared }`経由で共有キャッシュにオプトインしパスする — 以前同じオプトインが古いキャッシュの退行を表面化した、まさにこの修正が対処するバグ。

### セッション終了の繰り越し（2026-05-18）

スライスごとの着地リストを超えて、次の実装者へのメモ、2026-05-17の繰り越しの上に蓄積:

1. **dry-rb基礎ペアはv0.1.6で完全になった**。`rigor-dry-types`（スライス1-4） + `rigor-dry-schema`（スライス1+2） + `rigor-dry-validation`（スライス1）がすべて着地;`rigor-dry-struct`（Tier C基板消費者）はすでにv0.1.5 + v0.2.0 ADR-18向上で出荷済み。クロスプラグイン形の対称性は意図的: スキーマ行 + graphqlフィールド/引数行は`{type:, list:, …}`スロットパターンを共有するので、将来の`rigor-dry-validation`スライス2（型付き`result.to_h`合成）が`:dry_schema_table`を一様に消費できる。優先順での残りのdry-rb作業: dry-schemaスライス2+ → dry-validationスライス2 → dry-validationスライス3 → dry-monads（ADR-3修正後）。すべて需要駆動。
2. **Tier 3エコシステムプラグインはv0.1.6で完全になった**。`rigor-graphql`（Tier 3D）が最後の保留中Tier 3スロットをクローズ。プラグインファミリーインベントリ: Tier 1（4プラグイン） + Tier 2（3プラグイン） + Tier 3（graphqlを含む6プラグイン） + dry-rb（4プラグイン） + オプトインバンドル（2エントリ） + メタgem（1エントリ） = **29の`examples/`エントリ**（27の動作プラグイン + 1のRBS-onlyバンドル + 1のメタgem）。
3. **`rigor-rails`メタgemスキャフォールドは公開可能**。gemspec + エントリポイント + README + 5ケース統合specがすべて揃った。野生でのアクティベーションはTier 1+2サブプラグインのsubtree-split + RubyGems公開を[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) SKILLに従って待つ。ADR-12 WD1に従い、アンブレラはGemfile-conveniencのみ — `.rigor.yml`アクティベーションはプラグインごとのまま。
4. **v0.1.6はそのまま出荷可能**。蓄積された作業（ADR-12 / ADR-17 / ADR-18フロア + 動作消費者状態 + エディタモードv1 + LSP v1/v2 + LSPポリッシュ + LSPパフォーマンス三冠（`Analysis::ProjectScan`プレパスキャッシュ + Environment共有 + プラグインキャッシュディスクリプタの正確性修正） + spec-suiteパフォーマンス三冠（並列デフォルト + コンテンツキー化sigディレクトリ + plugin_helpersオプトイン共有キャッシュ） + 4つの新エコシステムプラグイン（dry-schema、graphql、dry-validation） + メタgemスキャフォールド + 2つの設計ノート）は純粋に加法的 — 既存のCLI消費者の動作変更なし。`rigor-release-prep` SKILLに従った`bundle exec rake release`が自然な次の決定;明示的なユーザー承認待ち。
5. **CLIエディタモードのディスクバックスナップショットキャッシュは完全に設計されているが未実装**。[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)が5フェーズの実装パス（Marshal可能なscan / キー導出 / Cache::Storeプロデューサー / Runner統合 / FactStoreスナップショットAPI）を記録する。具体的なエディタ拡張が`rigor check --tmp-file`にシェルアウトし約1秒の壁をUXペインとして報告するまで実装は先送り。LSPパスはすでにエディタケースの90%+をpublishあたり≤5 msでカバーしているので、このスライスは需要待ちのニッチな勝利。
6. **[ADR-20軽量HKT](../adr/20-lightweight-hkt/) — スライス1 + 2a + 2b + 2c + 2d + 2e + 3 + 6 + § D3（プログラマティック + パーサー + メンバーシップ） + symbolize_names + YAML.safe_load + permitted_classes簡約後 + CSV.parse / CSV.read + kv-formリファクター + パーサー経由のバンドルボディ + パーサー引数リストのユニオン修正 + Ractor隔離修正 + 遅延hkt_registryホルダー + ハンドブック第12章すべてv0.1.6で着地 — 実質的なADR-20実装完了**。**このセッションで32コミット**（`0dbb388`から`a8932a1`）;185のHKT専用spec（181 + `JSON.load_file`フォローアップ）;`make verify`が3748例 / 0失敗 / 598リントファイル / rigor checkパスでクリーン（bool多相性 + HashShape-narrowing修正後、セルフチェック警告が6 → 3に;Steepの寛容プロファイルもクリーン、コード品質パリティのために2つのscratch-ivar nil-guardクリーンアップが着地）**。外部コードベース解析駆動のエンジン修正**（`88e6534`）: パラメータデフォルト値式は今メソッドのボディスコープ（インスタンス`self_type`）下で実行され、`prism-1.9.0`の偽陽性の97.2%をクローズ（938 → 26エラー）、`rbs-4.0.2`の22.7%（255 → 197）。バグはrigorのlib/examples/specで`def copy(x: self.x)`イディオムが0だったため、rigorのセルフチェックには表れなかった**。CLIで検証されたエンドツーエンドの形**: `JSON.parse(s)` → `Array[json::value[String]] \| Float \| Hash[String, json::value[String]] \| ...`;`JSON.parse(s, symbolize_names: true)` → `Hash[Symbol, json::value[Symbol]]`;`YAML.safe_load(s, permitted_classes: [Date])` → `Date \| ...`が追加;`Psych.safe_load`パリティ;`CSV.parse("a,b\n1,2\n")` → `Array[Array[String \| nil]]`**。ユーザー著作ループが3つの独立したレベルでクローズ**: （a）出荷された`.rbs`ファイルの`%a{rigor:v1:hkt_register / hkt_define}`ディレクティブ（`Environment.for_project`スキャン経由）、（b）プラグインマニフェスト`hkt_registrations: [...]` / `hkt_definitions: [...]`（`Plugin::Registry#hkt_overlay_registry`経由）、（c） stdlibメソッド向けのハードコードされたRigorバンドル`Builtins::HktBuiltins`。ボディ文法は完全なADR-20 § D3をカバー: union + アトム + nominal_app + app_ref + param + 条件（`<:`、`==`、`in [...]`テスト）、3値レデューサ評定（yes / no / WD7に従いmaybe-widens-to-union）。`env.hkt_registry`でのマージ順（last-write-wins）: builtins → プラグインオーバーレイ → RBS envスキャン**。残りのADR-20作業**（すべて需要駆動、何もスケジュールなし）: **スライス4**（dry-monadsの`Result[T, E]` / `Maybe[T]`キャリア — 最初の複数引数HKT検証、ADR-3修正がブロック条件）;**スライス5**（再帰的`type`エイリアス経由のシュガー — 明示的`%a{...}`形が冗長すぎるというユーザーフィードバックでゲート）;**バインダ抽出を伴うパターンマッチ**（lisp-evalは`A` / `B`を新しいバインディングとする`(E <: [:+, A, B] ? lisp_type[A] : ...)`形を必要とする;残る最大のギャップで独自の設計パスが必要）;**rigor-lisp-evalデモ移行**（バインダ抽出にゲート）;`METHOD_RETURN_OVERRIDES`をより多くのstdlibメソッドに拡張（`JSON.load_file` / `JSON.load_file!`は`9013fe7`で着地;`Marshal.load`は真にTopを返すのでHKTエンベロープは適用されず;`JSON.[]`はparse-or-generate多相でまだサポートされていない第一引数判別が必要;さらなる追加は需要駆動）。次の実装者はADR-20を実質的に完了として扱い、具体的なユースケースが浮上したときのみ残りのリストから選ぶべき。

### セッション終了の繰り越し（2026-05-18、後半セッション — references/ruby/libサーベイ）

先の2026-05-18繰り越しの項目6の後を引き継ぐ。このブロックは`rigor check --explain references/ruby/lib`（Ruby同梱のcore + stdlib、626の`.rb`ファイル / エラーを表面化した257のファイル / 開始時1756エラー）を実行し、欠落RBSギャップではなくエンジンバグに見えるすべての診断をトリアージした。6つのエンジン修正 + 1つのC拡張RBSオーバーレイ + 1つのリファインメント層拡張がコミット`1adf5e3` → `26429df`にわたって着地（リファインメント向上のために`e44cfee`も）。最終的なreferences状態: **1743エラー / 255ファイル**（-13エラー / -2ファイル;また`eval_call` DefNodeウォーク修正で表面化した以前隠れていた12の実エラーに加え、約60の`:info` fail-softフォールバックイベント削除）。全期間を通じて`make verify` + lint + rigor-self-checkがクリーン。

着地したエンジン項目（それぞれを表面化したreferencesファイル付き）:

1. **Prismリーフノードハンドラ**（`1adf5e3`、`e44cfee`） — `__FILE__` / `__LINE__` / バックティック / `%x{}` / `END { }` / `ShareableConstantNode` / `{ x: }`の`ImplicitNode` / `ItParametersNode`。`__FILE__` → `non-empty-string`、`__LINE__` → `positive-int`。ソース: referencesにわたって遍在的。
2. **`def Foo.method`形**（`12dfc45`） — レシーバ定数が字句的tailと一致するとき囲むクラス上のシングルトンに昇格させる。ソース: `open-uri.rb`（24→15エラー）。
3. **`class << Foo`がFooのシングルトンスコープを開く**（`92d5fbd`） — 明示的定数`class << X`がシングルトンクラスではなくクラスボディとして扱われていた。ソース: `time.rb`（13→1エラー）。
4. **`OverloadSelector`パス1.5**（`97590fe`） — strictとgradualパスの間でエイリアス解決済みstrictマッチング。両候補がトランスレーターが`Dynamic[Top]`に畳む正準コアエイリアス（`::int` / `::string`など）を使うとき正しいオーバーロードを選ぶ。ソース: `ipaddr.rb:51`（`Array#*(Integer)`）。
5. **`eval_call`が引数位置のDefNodeを歩く**（`06923d3`） — `ruby2_keywords def m`、`private def m`などは今、囲むクラスボディシングルトンではなくdefのインスタンス / シングルトンスコープ下で本体を歩かれる。ソース: `delegate.rb:85`（`ruby2_keywords def method_missing` + `self.__getobj__`）。副次的な利益: `optparse.rb`の`private def parse_arg`本体に以前隠れていた12の実エラーを表面化（フロー絞り込み項目 — 下記キューリストを参照）。
6. **`data/vendored_gem_sigs/prism/`**（`d79a640`） — prism gemのRBS補足。gem自身の`sig/`が省略するC拡張バインドのクラスメソッド（`StringQuery.{local?, constant?, method_name?}`） + Rubyソースメソッド（`ParseResult#attach_comments!` / `#mark_newlines!`）を追加。新しい宣言のみを追加するためクラスを再オープン、したがって`DEFAULT_LIBRARIES`経由でロードされるgem同梱RBSに対し`DuplicatedDeclarationError`なし。`VENDORED_GEM_NAMES`は6 → 7にバンプ。
7. **`Rigor::Builtins::StaticReturnRefinements`ディスパッチャ層**（`26429df`） — `MethodDispatcher.dispatch`内のHKTとRBSの間の新しい`(owner, method, kind) => handler`テーブル。今日の唯一のエントリ: `Kernel#__dir__` → `non-empty-string | nil`。3つの呼び出し形すべて（暗黙のself、`Kernel.__dir__`、`instance.__dir__`）をカバー;`BasicObject`レシーバには拒否される。前方拡張サーフェス — キュー項目を参照。

キューされたエンジン項目（需要駆動、サーベイで表面化、スケジュール**されていない**）:

- **(a) `x = expr() or raise`が`x`をnonNilにナローイングしない**。`net/http/header.rb:531-540`（8+サイト）、`resolv.rb`、`optparse.rb`に影響。ナローイングはInference::Narrowing#analyse_or`内に存在 — LHSがローカル変数代入でRHSが非return（`raise` / `return` / `throw`）のとき、or後のスコープはLHSローカルをそのrvalueのfalsey部分を除去するようナローイングすべき。同じ形の内部需要: `rigor lib/`で0、referencesで複数。キュー;最小再現は`/tmp/rigor-refs-check/or_raise_narrow.rb`に記録。
- **(b) `$1`（正規表現マッチ特殊変数）が`=~`成功チェックされた`unless ... raise`後にナローイングされない**。`net/http/header.rb:528`に影響。`Inference::Narrowing`が正規表現`=~`を成功分岐で`$~` / `$1..$N`を`String | nil`にバインドするものとしてモデル化し、`raise`-on-failureガード後に`$1`を`String`にナローイングする必要がある。最小再現は`/tmp/rigor-refs-check/regex_dollar1_narrow.rb`。
- **(c) `rescue ... return`がpost-blockフローをナローイングしない**。`resolv.rb:430`（`Socket.ip_address_list` rescue + return + `list`の後の使用）に影響。rescue分岐の`return`はpost-blockフロー和集合からrescueパスを除去し、`list`を非rescue型のまま残すべき。最小再現は`/tmp/rigor-refs-check/rescue_return_flow.rb`。
- **(d) `Hash === expr`（case equality）がナローイングされない**。`open3.rb:226`（`Hash === cmd.last; opts = cmd.pop.dup`）に影響。case-equality形は真偽分岐で`cmd.last`を`Hash`にナローイングすべき（ディスパッチは`cmd.last.is_a?(Hash)`と同じ）。
- **(e) `Module.new do ... end`ブロック内容が歩かれない**。`resolv.rb`（`ClassHash`が内部に`def []=`を持つ`Module.new`である`ClassHash[[k,v]] = c`の約15サイト）に影響。ADR-16マクロ展開基板作業と接続 — block-as-メソッド形（Tier A）が`Module.new` / `Class.new`ブロック本体に拡張されたときにこれをカバーする。
- **(f) Moduleミックスインの`self_type`が`Object` / `Kernel`メソッドを含まない**。`pp.rb:369-371`（`PP::ObjectMixin`本体の`self.inspect` / `self.respond_to?`）に影響。`module M`がミックスイン（オブジェクトにincludeされる）のとき、そのインスタンスメソッドの`self_type`はKernelメソッドを許容すべき。項目（e）とは別。

キューされたStaticReturnRefinements拡張（1行ずつ、需要駆動）:

- `Kernel#caller` / `Kernel#caller_locations` → `Array[String] | nil`（上流RBSは広い）。
- `File.expand_path` / `File.dirname` / `File.basename` → `non-empty-string`（上流RBSは`String`を返す）。
- `__method__` / `__callee__` → `Symbol | nil`（上流は`Symbol?`を返す）。

行の追加は今、単一テーブル編集（`lib/rigor/builtins/static_return_refinements.rb`の`OVERRIDES`定数 + `static_return_refinements_spec.rb`ケース + `method_dispatcher_spec.rb`統合ケース）。マッチポリシーはすでにあらゆるKernel-mixed-inレシーバクラスを処理する。追加にエンジン作業は不要。

### サーベイ前の永続項目

-2. **外部コードベース解析: 業務利用SDK（2026-05-18）**。`/tmp/sdks/`に浅くクローンされた3つの本番Ruby SDKに対し`rigor check lib`を実行: `facebook-ruby-business-sdk`（1,220ファイル）、`google-api-ruby-client/google-apis-core`（25ファイル）、`google-cloud-ruby/google-cloud-storage`（27ファイル、疎）。3つにわたって79エラー + 8警告をトリアージ**。表面化した実バグ**: `facebook/lib/facebook_ads/ad_objects/`の6ファイル（自動生成）に`ruby -c`さえ拒否するリテラルRuby構文エラー（`has_edge : do |edge|`）が含まれる**。解析駆動のエンジン改善**: （β）クロスファイルクラス発見プレパスが`a8932a1`で着地 — `ScopeIndexer.discovered_classes_for_paths`はすべてのプロジェクトファイルの`class Foo`宣言を歩き、プロジェクト全体テーブルをファイルごとの`default_scope`にシードする、google-cloud-storageの5つの偽陽性`singleton(File)`エラーをクローズ（`Google::Cloud::Storage::File`はstdlib `::File`を覆い隠すユーザー定義クラス）。モジュールはシードから意図的に除外（rigorセルフチェックが、モジュールを登録すると別個の`module_function`フォールスルー制限が表面化することを露呈;キューされたフォローアップとして文書化）**。キューされたエンジン項目**（まだ実装されていない）: （α）クロージャ内の`x ||= expr`非Nilナローイング — 4つのgoogle-apis-core偽陽性が観察された（`proc do |chunk|`ブロック内で`||= 0`後に`download_offset`が`nil`として読まれる）;単純ケースの再現器は正しくナローイングするので、失敗モードはより深い調査を要するネストされたクロージャ相互作用が関与。クロスファイル`discovered_methods`プレパス（メソッド用の（β）のミラー）はmodule_functionサポートとクロスファイル呼び出しでのユーザー定義メソッド偽陽性のさらなるクローズをアンロックする。

-1. **外部コードベース解析: Steep 2.0.0（2026-05-18）**。`tool/steep/vendor/bundle/ruby/4.0.0/gems/steep-2.0.0/lib`（141ファイル）に対し`rigor check lib`を実行 — 28ファイルにわたって107の診断（92エラー + 15警告）を表面化。カテゴリ別にトリアージ: (A) 36 × Struct.newの動的クラス生成がモデル化されていない;(B) ~6 × `is_a?(RBS::AST::Declarations::Base)`の抽象基底へのナローイングがミックスインメソッド（`annotations`、`location`）を隠す;(C) ~7 × `x = foo or raise`イディオムを通じた代入の`or` / `||`ナローイングが伝播されない;(D) ~5 × クロージャーブロック変異が伝播されない（下記項目0と同じ根本 — `each { flag = true }`、`OptionParser#parse!`キャプチャ変異をカバー）;(E) ~10 × **実Steepのdead-assignmentバグ**（`type_construction.rb`のL656、L2875、L2878、L5077のリファクタ残り;また`goto_service`、`content_change`、`source`、`locator`、`ast/types/helper`、`ast/types/name`）;(F) ~40+ × RBSカバレッジギャップ（Steepはgemに`sig/`を出荷しない）**。観察されたキューされたエンジン改善**（何もスケジュールされていない — すべて需要駆動）: (C) `x = foo or raise` / `x = foo || raise`イディオムの**`or`での代入ナローイング** — 中程度の実装（`Inference::Narrowing#analyse_or`拡張、`assignment_to_local? && non_returning?` LHS+RHSペアを検出し、真偽スコープの書き込みターゲットをRHSのfalsey部分を除去してナローイング）。需要測定: `rigor lib/`に0出現、`examples/`に0、`spec/`に0;Steepに7。内部需要はプロジェクトの「需要駆動」バーより低い — 実装するのではなく記録してキュー**。実Steep発見**（カテゴリE）はrigor変更ではなく上流レポート;`Ruby::UnusedLocal`がデフォルトで`:hint`未満であるため、Steep自身の寛容プロファイルはそれらを見逃す — rigorの`flow.dead-assignment`ルールが`:warning`深刻度で、Steepのデフォルトプロファイルが同じイディオム上でより強力なバグサーフェスパワーを持つというデータポイント。

0. **セルフ解析: `flow.always-truthy-condition`のためのループ変異追跡（キューされたエンジン改善）**。bool多相性 + HashShape-narrowing修正（コミット`7c4efce` + `dd917b5`）後の`rigor check lib`は依然として3つの警告を表面化、すべて同じ形: `arr = [seed]; while ...; arr << x; end; if arr.size == N` / `arr.empty?`が常に真として報告される、`Inference::Narrowing`がループ本体の`<<` / `push`変異をsize/empty narrowingに反映しないため。影響を受けるサイト: [hkt_body_parser.rb:140](https://github.com/rigortype/rigor/blob/main/lib/rigor/inference/hkt_body_parser.rb#L140)、[hkt_body_parser.rb:307](https://github.com/rigortype/rigor/blob/main/lib/rigor/inference/hkt_body_parser.rb#L307)、[hkt_registry.rb:212](https://github.com/rigortype/rigor/blob/main/lib/rigor/inference/hkt_registry.rb#L212)。修正は`docs/type-specification/control-flow-analysis.md` §「mutation effects」下の変異エフェクトモデルに存在 — おそらく中程度のエンジン変更。具体的な需要が表面化するまでキュー（ここの警告が需要シグナル;既存のサイト数はエンジンコストが払われる必要があるほど小さい）。

1. **sig-genの`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — `Foo::Bar`と`Foo::Bar::Child`の両方の宣言がフラットな兄弟としてすでに存在する場合、sig-genはそれらをフラットなままにする。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。
2. **インメモリの`Analysis::Runner.run_source`エントリーポイント（テスト専用のパフォーマンスフォローアップ）**。`RunnerHelpers#analyze`テストヘルパーは呼び出しごとにtmpdirを実体化する（ソースファイル書き込み、chdir、実行、クリーンアップ）。呼び出しごとに約25〜50ms × 数百のrunner-spec呼び出しで、これはインメモリエントリーポイントが削除できるスイートwall-clockの実質的なシェア。スケッチ: パス展開をバイパスし`{path => bytes}`仮想ファイルテーブルを受け入れる`Runner.run_source(source:, path: "code.rb", environment:, config:)`を追加する。ヘルパーは`analyze(source: "...")`形状（ファイル / sigなし）に対してそれを呼び出す。期待される差分: シーケンシャル約5%、並列約3% — 単独で行う価値はないが、テストスイート拡張が続けば自然な補完。
3. **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリーを処理する;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。実装スケッチ: `Runner#run`がファイルチャンクごとにワーカーをフォークし、各々がパイプに診断を書き、親が元のパス順序で再構築する。

## 復帰する実装者のための読書順

次のセッションのデフォルト目標は、ADR-12 / ADR-17 / ADR-18すべてがフロア + 動作消費者状態にあるため、**v0.1.6リリースをカット**するか、または上記の自然なエントリーの1つで**サイクルを継続**するかのいずれか。この順序で読んでください:

1. `CHANGELOG.md`の`[Unreleased]`セクション — v0.1.6の作業が着地するにつれて蓄積される。
2. [`docs/ROADMAP.md`](../roadmap/) §「v0.1.6 — `master`に蓄積中」 — サイクルのADR-12 / ADR-17 / ADR-18エンベロープ。
3. [`docs/adr/12-dry-rb-packaging.md`](../adr/12-dry-rb-packaging/)、[`docs/adr/17-monkey-patch-pre-evaluation.md`](../adr/17-monkey-patch-pre-evaluation/)、[`docs/adr/18-substrate-per-call-site-return-type.md`](../adr/18-substrate-per-call-site-return-type/) — 3つのv0.1.6 ADR（12 accepted、17 accepted、18 proposed-and-implemented）。
4. [`docs/adr/16-macro-expansion.md`](../adr/16-macro-expansion/) — ADR-18が修正する基板;既存のスライスプラン + WD13に対して方向付ける。
5. [`docs/adr/9-cross-plugin-api.md`](../adr/9-cross-plugin-api/) — `Plugin::FactStore`はADR-18が読み取る / `rigor-dry-types`が書くチャネル。
6. [`docs/adr/10-dependency-source-inference.md`](../adr/10-dependency-source-inference/) — ADR-10ウォーカー（gemソース推論）;ヒューリスティック戻り型抽出器（`フェーズB`、`e40947c`）は`ProjectPatchedScanner`で再利用される。
7. [`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 29の`examples/`エントリの比較表（27の動作プラグイン + 1のRBS-onlyバンドル + 1のGemfile-conveniencメタgem）。v0.1.6の追加: `rigor-dry-types`スライス4拡張 + 新プラグイン`rigor-dry-schema`、`rigor-graphql`、`rigor-dry-validation`、加えて`rigor-rails`メタgemスキャフォールド。
8. [`docs/notes/20260515-real-world-rails-survey.md`](../notes/20260515-real-world-rails-survey/) — v0.1.5の本番品質改善を駆動したサーベイ;次のバッチの実世界プロジェクトが解析されるときも依然権威的。
9. [`docs/adr/15-ractor-concurrency.md`](../adr/15-ractor-concurrency/) + [`docs/design/20260514-ractor-migration.md`](../design/20260514-ractor-migration/) — Ractor移行契約;共有可能性レビューを必要とするプラグインサーフェスを追加するときに関連（ADR-18はパスだった）。
10. [`.codex/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) — 新しいプラグインを作成するためのプレイブック（`rigor-dry-types`スライス1のテンプレートとして使用）。
11. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。
12. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)と[`docs/adr/7-v0.1.0-slice-decisions.md`](../adr/7-v0.1.0-slice-decisions/) — v0.1.xが拡張するv0.1.0プラグイン契約の拘束力のある設計とスライスごとの作業上の決定。
13. [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)作業上の決定 — OQ1 / OQ2 / OQ3の結果がプラグインが消費する型オブジェクトパブリックサーフェスを引き続き拘束する。

一般的なフォローアップ作業を開始するためのキーサーフェス:

- **ADR-18基板修正**: `lib/rigor/plugin/macro/heredoc_template.rb`（Emit + ReturnsFromArg）、`lib/rigor/inference/synthetic_method_scanner.rb`（`resolve_emit_return_type` + `argument_source_representation` + `resolve_returns_from_arg`）、`lib/rigor/analysis/runner.rb#run`（プラグインprepare再順序付け + `shared_fact_store`）。
- **ADR-17事前評価パイプライン**: `lib/rigor/inference/project_patched_methods.rb`（レジストリ）、`lib/rigor/inference/project_patched_scanner.rb`（プレパス + 重複宣言）、`lib/rigor/inference/method_dispatcher.rb#try_project_patched_method`（ディスパッチャーティア）、`lib/rigor/configuration.rb#expand_pre_eval_entries`（スライス4 glob）。
- **ADR-12 dry-rb基礎**: `examples/rigor-dry-types/lib/rigor/plugin/dry_types.rb` + `dry_types/alias_scanner.rb`（正準 + ネスト + コンポジション）;`examples/rigor-dry-struct/lib/rigor/plugin/dry_struct.rb`（`:dry_type_aliases`の消費者マニフェスト）。
- **O4 Bundler-awarenessサーフェス（v0.1.5以降変更なし）**: `lib/rigor/environment/bundle_sig_discovery.rb`、`lib/rigor/environment/lockfile_resolver.rb`、`lib/rigor/environment/rbs_collection_discovery.rb`、`lib/rigor/environment/rbs_coverage_report.rb`。
