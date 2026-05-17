---
title: "Rigor Roadmap"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "bc251ab913508731e5ecc02889ecf134d42c965d638b7676dbf481e93ee95ba9"
sourceCommit: "dac915a9ee49b89e89774c34c518e8501275f6a3"
sourceDate: "2026-05-17T17:08:50+09:00"
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

テーマ: **3つのaccepted-and-implemented ADRが、クロスプラグインファクト経由の呼び出しサイトごとの精度向上、プロジェクト側のmonkey-patch認識、基礎となるdry-rbプラグインをアンロックする — プラスエディタ / IDE統合の最初の2カット: エディタモードv1（PHPStanスタイルのバッファバインディングCLI）と言語サーバーv1（インプロセスRuby LSP）**。コミット`3c99eed` → `c2451d4`。

- **[ADR-12](../adr/12-dry-rb-packaging/)（accepted） + `rigor-dry-types`スライス1+2+3**。gemごと + 計画されている`rigor-dry-rb`メタアンブレラ（Railsプラグインパターンに一致）。`rigor-dry-types`は`module Types; include Dry.Types(); end`を認識し、`:dry_type_aliases` ADR-9クロスプラグインファクト（15の正準 + 60のネストカテゴリ + ユーザー著作のコンポジションエントリ）を公開する。`examples/`下25番目の動作プラグイン。
- **[ADR-17](../adr/17-monkey-patch-pre-evaluation/)（accepted） + スライス1+2+3a+4**。`pre_eval:`設定軸 + `Inference::ProjectPatchedMethods`レジストリ + プラグインと依存ソース推論の間の新しいディスパッチャーティア。スライス3aは`フェーズB`スタイルのヒューリスティック戻り型抽出（ADR-10の`ReturnTypeHeuristic`を再利用） + `pre-eval.duplicate-declaration` `:info`を追加。スライス4はglobサポート（`lib/core_ext/**/*.rb`）を追加。スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス）、スライス6（プラグインAPIフック）は需要駆動のまま。
- **[ADR-18](../adr/18-substrate-per-call-site-return-type/)（proposed + スライス1+2+3+5）**。ADR-16への基板修正: `Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（宣言的な`position:` + `lookup_via: {plugin_id:, fact:}`クロスプラグインファクトチャネル）。`SyntheticMethodScanner`は呼び出しサイト引数の修飾定数ソース表現を抽出し、名前付きファクトでルックアップする。3ティアフォールバック（`returns_from_arg:` → 静的`returns:` → `Dynamic[Top]`）。Runnerはファクトが利用可能になるよう、合成メソッドスキャナの**前**にプラグインの`prepare(services)`を並べ替える。 **エンドツーエンドのアップリフト**: `rigor-dry-struct` v0.2.0マニフェストは`:dry_type_aliases`を消費するため、`attribute :city, Types::String`は`Nominal[String]`を返す`Address#city`を合成する（スライス2cフロアでは`Dynamic[Top]`だった）。
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

コミットされたすべてのv0.1.6トラックは純粋に加法的（既存のCLI消費者の動作変更なし）;基板修正（ADR-18）は新しい3ティアフォールバック下でv0.1.6以前の`returns:`セマンティクスを保持する。

### v0.1.6のスコープ外（キュー、需要駆動）

- **ADR-17スライス3b**（ファイルごとのキャッシュディスクリプタ）、スライス5 / 6（フルプロジェクト2パス / プラグインAPIフック）。
- **ADR-18スライス4**（`returns_from_arg:`のTraitRegistryパリティ） + 連鎖呼び出し引数拡張（`Types::String.constrained(...)`チェインヘッド解決）。
- **ADR-12**継続: `rigor-dry-validation`、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要）。 **rigor-dry-typesスライス4**（推移的コンポジション参照）。
- **ADR-10オプションC**（遅延 / オンデマンドの呼び出しごとのgem-source推論）。
- 合成メソッドティアの`returns:`文字列（ユーティリティ型戻り値）向けの**ADR-13リゾルバチェイン配線**。
- **ADR-16スライス5b**（Tier Dエンジン統合）。
- **エディタモードフォローアップ**（[`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「v1のスコープ外」）: ファイルごとの診断キャッシュ（単一ファイルスコープ（オプションA） → 代入付きプロジェクトスコープ（オプションB）にアップグレードするレバー）、プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ、マルチバッファ（`--buffer A=B --buffer C=D`）、`--also=dep1,dep2`呼び出し元宣言のディペンデント、LSPデーモン / ファイルウォッチ。
- **`rigor-graphql`**（具体的なユーザー需要保留中）。
- **O4レイヤー3 gemバージョンごとのキャッシュ**（スライス3アーキテクチャ;将来のRuby::BoxスタイルのBundler拡張が優先順位を上げる）。

## 将来のサイクル（特定のリリースにコミットされていない）

v0.1.x作業を通じて浮かび上がった項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。

### 型言語 / エンジン
- **O2 — マクロテンプレート + heredoc-Ruby展開**。基板フロア + 精度プロモーションは[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + 7（コミット584ae85…56706a5） + スライス6a-TierB / 6b-TierC精度（コミットd174fff / d7b1943）を通じて配信: Tier A（ブロック-as-メソッド） + Tier B（トレイトインライニングレジストリ） + Tier C（heredocテンプレート）エンジン統合が新しい`SyntheticMethodIndex` + プレパススキャナを通じて;Tier D（外部ファイルインクルージョン）はスライス5aの先送りに従いエンジン統合を先送りした契約のみを出荷;Concern（`included do`）再ターゲティングはスキャナで処理;**スライス6**精度プロモーションはTier B発行を`origin_module:`provenance経由で`RbsDispatch.try_dispatch`にルーティングする（Deviseの`valid_password?`は今`Dynamic[T]`ではなく`bool`を返す）し、Tier Cの素のクラス名`returns:`文字列を`environment.nominal_for_name`経由で解決する。3つの動作消費者が着地: `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。残り項目: **スライス5b**（Tier Dエンジン — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド;キュー、需要駆動）、**ADR-13リゾルバチェインの完全な配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名`Pick<T, K>`をリゾルバチェイン経由でルーティング;キュー、需要駆動）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **DSLシグネチャでの軽量HKT（高階型）**。`docs/type-specification/rigor-extensions.md`の条件型 / インデックスアクセス行に従い、`untyped`境界を型レベル`eval`に置き換える。最初のリファレンスサイトはrigor-lisp-evalデモ。探索的、コミット済みマイルストーンなし。
- **`rigor:v1:conforms-to`ディレクティブ**。元々v0.1.1の「スコープ外」にキューされていた;まだオープン。メソッドパラメーターが名前付き構造インターフェースを満たす任意の値を受け付けられるようにする。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価**。[ADR-17](../adr/17-monkey-patch-pre-evaluation/) accepted（2026-05-16）。スライス1+2+3a+4はv0.1.6で**着地**（`pre_eval:`配管 + レジストリ + ディスパッチャーティア + ヒューリスティック戻り型 + 重複宣言`:info` + globサポート）。残りの需要駆動フォローアップ: スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。（注: クロスプラグインファクト経由の呼び出しサイトごとの戻り型ルックアップはv0.1.6で[ADR-18](../adr/18-substrate-per-call-site-return-type/)を介して出荷;上記のADR-13配線は直交する「パラメータ化形パーサー」拡張。）

### プラグイン / エコシステム
- **`rigor-graphql`** — 最後のTier 3プラグイン。GraphQLスキーマDSLパースは自明ではない;具体的なユーザー需要があれば作成。
- **dry-rbアダプタープラグイン** — [ADR-12](../adr/12-dry-rb-packaging/) accepted（2026-05-16）: gemごとのプラグイン + 計画されている`rigor-dry-rb`メタアンブレラ、Railsプラグインファミリーパターンに一致。 **着地**: `rigor-dry-struct`（v0.1.5;ADR-18精度向上を持つv0.1.6でv0.2.0） + `rigor-dry-types`（v0.1.6、スライス1+2+3: 正準 + ネストカテゴリ + ユーザー著作のコンポジション）。 **次の具体**: `rigor-dry-validation`（Tier A;スライシング決定が必要: Contract対schema対params DSLサーフェス） + `rigor-dry-monads`（Tier B;`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要）。 **より小さなフォローアップ**: `rigor-dry-types`スライス4（2パスウォーク経由の推移的コンポジション参照）。サーベイは[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)。
- **ADR-10 — gemソースからの呼び出しごとの戻り型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り型を推論すること（`mode: :full`が`Dynamic[Top]`より豊富に貢献できるように）は、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **`rigor-sorbet`の呼び出しサイトごとのsigilゲーティングを超えるフォローアップ** — v0.1.4で着地。未解決のキュー項目なし。

### エディタ / IDE統合
- **LSP — 並列マルチバッファpublishのためのRactorプール**。LSP設計ドキュメントのスライス8は2つの関心事を列挙した: デバウンス（着地）AND Ractorプール統合。プール部分は需要駆動のまま — ワーカーをLSP `initialize`で1度事前ウォームしpublish全体で再利用できるよう、`Analysis::Runner`が事前ビルドされた永続的`Environment`を受け入れるリファクターが必要。ProjectContext（スライス7）はすでに読み取り専用`Cache::Store`経由でpublish + hoverにウォームEnvironmentの勝利を与える;ディスパッチ側並列性（コア全体のマルチバッファpublish）が残りのレバー。需要駆動。
- **LSP — `textDocument/definition`**（設計ドキュメントのスライス9、先送り）。`FILE:LINE`でキー化された`Reflection`側のシンボルインデックスが必要。需要駆動。
- **LSP — インクリメンタル`didChange`同期**（設計ドキュメントのスライス10、先送り）。現在、サーバーは`TextDocumentSyncKind::Full = 1`をアドバタイズするため、各キーストロークがバッファ全体を再送信する。インクリメンタル（`TextDocumentSyncKind::Incremental = 2`）はUTF-16オフセット帳簿 + 編集ごとの適用が必要。帯域幅はローカルstdioなのでコストはワイヤではなくパースにある;需要駆動。
- **LSP — まだキューされた拡張機能**（v2以降 + フォローアップ後 + ポリッシュ後）: `textDocument/codeAction`、`textDocument/rename`、`textDocument/semanticTokens`、`textDocument/inlayHint`、`textDocument/definition`（LSP v1設計のスライス9 — Reflectionシンボルインデックスが必要）、インクリメンタル`didChange`同期（LSP v1設計のスライス10 — UTF-16オフセット帳簿）、並列マルチバッファpublishのためのRactorプールディスパッチ（LSP v1設計のスライス8後半 — Runnerリファクター）、マルチルートワークスペース、TCP / Unixソケット輸送、スニペット展開、素の名前（暗黙のself）補完、シンボル補完、シグネチャ内ハイライトのための`ParameterInformation`オフセットタプルラベル、`completionItem/resolve`遅延ペイロード、プラグイン側の補完貢献。
- **エディタモードオプションB — ファイルごとの診断キャッシュ**。今日のエディタモードはオプションA（単一ファイルスコープ）を出荷: バッファのみがファイルごとの診断を生成する。オプションB（PHPStan形: プロジェクト全体の解析と1つの代入されたファイル、「編集ファイル + ディペンデントのみ再解析」）にアップグレードするには、`（ファイルダイジェスト、プロジェクトEnvironmentダイジェスト）`でキー化されたファイルごとの診断キャッシュが必要。ADR-17スライス3bのファイルごとのキャッシュディスクリプタが最も近い既存のレバー。設計: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「スコープの選択」。需要駆動。
- **エディタモード — プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ**。LSPパスで**着地**（v0.1.6、CHANGELOG `[Unreleased]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan`ビルダー + `Runner.new(prebuilt:)`採用パス;LSPの`ProjectContext`がスナップショットを遅延ビルドし、`invalidate!`でドロップする。CLIエディタモード（`rigor check --tmp-file`）はまだスナップショットを消費**しない**、各呼び出しが新鮮なプロセスのため — `（plugin-manifestダイジェスト、プロジェクトファイルmtime + サイズリスト）`でキー化されたディスクバックのスナップショットキャッシュが、ワンショットCLI呼び出しもプレパスをスキップできるようにする。需要駆動;LSP側の勝利が典型的なエディタ消費者。
- **エディタモード — `--also=path,path`呼び出し元宣言のディペンデント**。エディタ拡張は現在、ディペンデントを更新するためにN個の単一ファイル呼び出しを発行する必要がある。`--also`付きの単一の呼び出しがそれらをバッチする。些細なCLI拡張;設計ノートは`docs/design/20260516-editor-mode.md`。需要駆動。
- **マルチバッファエディタモード**（`--buffer A=B --buffer C=D`）。LSP v1がほとんどのユースケースでこれを置き換える（LSP `BufferTable`はすでにNバッファを保持する）;非LSPバッチツーリングには引き続き関連。需要駆動。

### パフォーマンス / スケーラビリティ
- **O4レイヤー3 — `Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング**。v0.1.5の`BundleSigDiscovery` MVPの上に座る。MVPの自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）はバージョン管理された解決テーブルになる;rigorは`Bundler::LockfileParser`出力を消費 + `ruby/gem_rbs_collection`で最適マッチバージョンをクエリする。O7の失敗メモでアンブロック（競合は今ハングするのではなく警告する）。
- **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリー;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。
- **Spec-suiteランタイムブレークダウン（2026-05-17調査;部分的に着地）**。`make verify`デフォルトが並列rspec（コミット`086e507`）に切り替わった: wall時間217秒 → 60秒（12コアで3.6×）。フォローオンサイクルが実際のボトルネックは**各`analyze(sig: …)`での呼び出しごとのRBS env再構築**であることを確認した: `Cache::Store`は`RbsDescriptor::FileEntry`ごとに`(path, sha256)`でenvをキーするため、各呼び出しの一意の`Dir.mktmpdir`ルートのsigパスが新鮮な約1.8秒のenv構築を強制した。 **ヘルパー側の修正が着地**（`spec/support/runner_helpers.rb`）: コンテンツキー化sigディレクトリ + ソースのみの呼び出しに対する共有ワークスペース。`runner_spec.rb` 39.6秒 → **25.4秒孤立（-36%）**、`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。元々キューされた2つのレバーは小さな残りのヘッドルームでオープンのまま:
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
- **Tier 3**: [`rigor-pundit`](../examples/rigor-pundit/)、[`rigor-sidekiq`](../examples/rigor-sidekiq/)、[`rigor-rspec`](../examples/rigor-rspec/)、[`rigor-actioncable`](../examples/rigor-actioncable/)、[`rigor-activestorage`](../examples/rigor-activestorage/)（v0.1.5で着地）。
- **オプトインの非プラグインバンドル**: [`rigor-activesupport-core-ext`](../examples/rigor-activesupport-core-ext/)（v0.1.5;トップ約50 AS core_extセレクタ向けのオプトインRBSバンドル）。[`rigor-typescript-utility-types`](../examples/rigor-typescript-utility-types/)（ADR-13スライス6）。
- **ADR-16基板消費者プラグイン（v0.1.5）**: [`rigor-sinatra`](../examples/rigor-sinatra/)（Tier A — ブロック-as-メソッド）、[`rigor-dry-struct`](../examples/rigor-dry-struct/)（Tier C — heredocテンプレート）、[`rigor-devise`](../examples/rigor-devise/)（Tier B — トレイトインライニングレジストリ）。マクロ展開基板をエンドツーエンドで行使する3つの純粋に宣言的なプラグイン。
- **dry-rb基礎（v0.1.6）**: [`rigor-dry-types`](../examples/rigor-dry-types/) — `module Types; include Dry.Types(); end`を認識し、`:dry_type_aliases`クロスプラグインファクト（15の正準 + 60のネストカテゴリ + ユーザー著作のコンポジションエントリ）を公開する。`rigor-dry-struct` v0.2.0はADR-18の`returns_from_arg:`経由でファクトを消費し呼び出しサイトごとの精度向上を実現。25番目の動作プラグイン。

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`。
- `rigor-dry-validation` / `rigor-dry-monads` — ADR-12の次のスライス。ValidationはContract対Schema対Paramsのスライシング決定が必要;monadsは`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。最終的な`rigor-rails`メタgemはTier 1+2プラグインをgem依存関係として宣言し、単一のGemfile行でユーザーがスタック全体にオプトインできるようにします。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5でリリース。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。

[ADR-18](../adr/18-substrate-per-call-site-return-type/)（基板の呼び出しサイトごとの戻り型DSL）はv0.1.6に向けて`master`に蓄積中。`Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（+ `lookup_via:`クロスプラグインファクトチャネル）を追加;`rigor-dry-struct` v0.2.0は最初の動作消費者（`rigor-dry-types`が公開する`:dry_type_aliases`経由で`attribute :city, Types::String`を`Nominal[String]`に解決）。スライス4（TraitRegistryパリティ） + 連鎖呼び出し引数抽出は需要駆動のまま。
