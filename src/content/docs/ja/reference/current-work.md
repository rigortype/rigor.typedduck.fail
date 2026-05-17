---
title: "Current Work — Inference Engine Checkpoint"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "93d8a57c16f7bcc20c5ae44575304d381ed5b0c8a2b59304242ee25205d57b4e"
sourceCommit: "dac915a9ee49b89e89774c34c518e8501275f6a3"
sourceDate: "2026-05-17T17:08:50+09:00"
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

次のサイクル（`v0.1.6`）は`master`に蓄積中（リリース保留中）。今までに着地したスライス（コミット`3c99eed` → `086e507`）:

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
- **Specヘルパー — コンテンツキー化sigディレクトリ + 共有ワークスペース**（CHANGELOG `[Unreleased]` § Performance）。`runner_spec.rb` 39.6秒 → **25.4秒（-36%）**、孤立;`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。永続的な`Cache::Store`は`(path, sha256)`でRBS環境をキーするため、以前のヘルパーの呼び出しごとの`Dir.mktmpdir`はすべての`analyze(sig: ...)`にenvの再構築を強制した（約1.8秒）;新しいヘルパーは`sig:`コンテンツを安定したパスにハッシュするため、同一のsigsは1つのウォームキャッシュエントリを共有し、ソースのみの高速パスはプロセスごとの1つの空のワークスペースを再利用する。ヘルパー側のキャッシュキー正規化を通じて「Spec-suiteランタイムブレークダウン（a）」をクローズ — runner_spec.rbのグループ構造への変更なし。スライスは`spec/support/runner_helpers.rb`に完全に含まれる。✓
- **Specヘルパー — `plugin_helpers#run_plugin`でのオプトイン共有キャッシュ**（CHANGELOG `[Unreleased]` § Performance）。`sorbet_plugin_spec` 13.1秒 → **4.7秒（-64%）**孤立（約3×高速化）;統合シーケンシャル90.2秒 → **78.6秒（-13%）**。`PluginHelpers`がプロセス全体の`shared_cache_store` + specファイルがオプトインするためにオーバーライドする`default_run_plugin_cache_store`インスタンスメソッドを獲得する（`let(:default_run_plugin_cache_store) { :shared }`）。キャッシュI/Oオーバーヘッドが1〜11の例を持つspecファイルでのenv構築節約を超えるため、パターンはオプトイン;重いspecファイル（48のsorbet）のみがコストを回収する。将来の重いプラグインspecは同じ1行の`let`経由でオプトインできる。3つの統合specs（actioncable / actionmailer / rails-i18n）は、プラグインキャッシュディスクリプタが読み取るプロジェクトファイルを含むまでオプトインできない — オープンエンジニアリング項目§6としてキャプチャ。✓
- **LSP / エディタモード — プロジェクトコンテキストプレパススナップショットキャッシュ**（CHANGELOG `[Unreleased]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan(paths:)`ビルダー + `Runner.new(prebuilt:)`採用パス。LSPの`ProjectContext`はスナップショットを遅延ビルドし、`invalidate!`（監視ファイル / 設定変更）でドロップする。`DiagnosticPublisher`は各publishごとの`Runner.new`に渡すため、プラグイン`#prepare`、`Plugin::Loader.load`、`DependencySourceInference::Builder.build`、合成メソッド / プロジェクトパッチ済みスキャナはキーストロークごとに再実行されない。コールドプレパスコストはセッション世代ごとに1度支払われる;バッファごとのpublishはバッファパース + チェックルールに狭まる。些細なプロジェクトのゲインは小さい（約10%）;勝利はプラグイン / 基板 / 依存の複雑さでスケールする。ボーナスの正確さ: キャッシュされたスキャナはバッファのみではなくプロジェクト全体を観察するため、他のファイルで宣言された合成メソッドはバッファ解析中に見える — スライス7 LSP設計からの既知のギャップをクローズ。✓

残りの作業の自然なエントリー（v0.1.6進行中スライス後）:

1. **リリース準備候補**。ADR-12 / ADR-17 / ADR-18すべてがフロア + 動作消費者状態にあり、v0.1.6は実質的なユーザー可視サーフェスを出荷した。[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従った`bundle exec rake release`が自然な次の「出荷状態」決定;明示的なユーザー承認待ち。
2. **rigor-dry-typesスライス4 — 推移的コンポジション参照**。`ManagerEmail = Email`（`Email`がスライス3コンポジションだった場合）は解決するために2パスウォークが必要。小さく自律的に実装可能: パス1で正準 + コンポジションエントリを収集し、パス2で前方参照を解決する（サイクル検出付き）。需要駆動フォローアップ;コミット済みマイルストーンなし。
3. **rigor-dry-validation / rigor-dry-monads**（[ADR-12](../adr/12-dry-rb-packaging/)ロードマップの継続）。両方とも実装前に設計判断が必要。 **rigor-dry-validation**は複数のDSLサーフェスを持つ（`Dry::Validation::Contract`サブクラス対`schema { ... }`ブロック対`params { ... }`アダプタブロック） — スライシング決定保留中。 **rigor-dry-monads**はメソッドごとの戻り型ラッピング（`def x; Success(42); end → Result[Integer, untyped]`）を望むが、これは`Rigor::Type::*`階層のResult / Maybeキャリア（または既存のUnion形状経由の回避策）を必要とする — ADR-3修正レベルの作業。
4. **ADR-18フォローアップスライス**。スライス4（`returns_from_arg:`のTraitRegistryパリティ）と連鎖呼び出し引数拡張（`Types::String.constrained(...)` → チェインヘッド経由で解決）はどちらも需要駆動のまま。現在のフロアは正準著作ケースをカバーする`ConstantReadNode` / `ConstantPathNode`形状を処理する。
5. **ADR-17フォローアップスライス**。スライス3b（`Cache::Descriptor::PreEvalEntry`）は測定された痛みまで先送り。スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）は需要駆動のまま。
6. **gemソースからの呼び出しごとの戻り型精度**（ADR-10ウォーカー拡張、オプションC遅延 / オンデマンド）。フェーズBフロア（ヒューリスティックリテラルテール抽出）は`e40947c`で着地;オプションCは呼び出しサイトリクエストでgem推論を遅延配線する — ウォーカー / ディスパッチャー境界への実質的なアーキテクチャ変更、需要にゲート。
7. **`rigor-graphql`**（最後のTier 3エコシステムプラグイン）。GraphQLスキーマDSLパースは自明ではない;具体的なユーザー需要があれば作成。
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
2. **Spec-suiteのホットスポット — 部分的に最適化（2026-05-17）**。ヘルパー側の修正前の孤立ファイルごとのwall時間: `runner_spec.rb` 42.6秒、`cli_spec.rb` 19.7秒、`sorbet_plugin_spec.rb` 14.8秒、LSP specs合計約11秒、その他は個別で<5秒。最も遅いワーカー（`runner_spec.rb`を運ぶ）が並列実行を約45秒wall時間でボトルネックにしていた。`spec/support/runner_helpers.rb`の**コンテンツキー化sigディレクトリ + 共有ワークスペース**レバー（CHANGELOG `[Unreleased]` § Performance）が`runner_spec.rb`を**25.4秒孤立**にカットし、`make verify`並列wall時間を**65.6秒 → 52.6秒（-20%）**に。残りのROADMAP §「パフォーマンス / スケーラビリティ → Spec-suiteランタイムブレークダウン」レバーはキューのまま: (a) `runner_spec.rb`での`before(:context)`スタイルのEnvironment共有（Environment関連の状態を変更しないグループでは依然可能 — ただしヘルパー側の修正がすでに最大のsig関連コンポーネントをクリアしたため、残りの勝利は小さい）;(b) `Analysis::Runner.run_source(source:, path:, ...)`インメモリエントリポイント（LSP / エディタモードのような埋め込み者向けのクリーンなパブリックAPI;ヘルパー修正の上に約5%のテストスイート勝利）。LSP-spec分割（`make verify-lsp`または`make verify-no-lsp`）は調査され**拒否** — LSPはシーケンシャルの約5% / 並列の約1%のみで、分割は意味のあるものを買わない。
3. **LSP v1 + v2 + フォローアップが今9のアドバタイズされた機能を出荷**。lspサブシステムは「キーストロークの速いリンティング + hover + completion + signatureHelp + folding + selection」ループに対して機能完成。残りのLSP作業（codeAction / rename / semanticTokens / inlayHint / definition / インクリメンタル同期 / Ractorプールディスパッチ）はROADMAP §「エディタ / IDE統合」 — 各々が独自の設計パスを必要とし;優先順位は具体的なエディタ統合需要から表面化する。
4. **v0.1.6はそのまま出荷可能**。蓄積された作業（ADR-12 / ADR-17 / ADR-18フロア + 動作消費者状態 + エディタモードv1 + LSP v1/v2 + LSPポリッシュ + spec-suite並列デフォルト）は純粋に加法的 — 既存のCLI消費者の動作変更なし。`rigor-release-prep` SKILLに従った`bundle exec rake release`が自然な次の決定;明示的なユーザー承認待ち。
5. **`rigor-*`作業を追加するときに念頭に置くべきプラグインパッケージングADR**。[ADR-12（dry-rb）](../adr/12-dry-rb-packaging/)はgemごと + メタアンブレラパターンを設定;[ADR-19（LSP）](../adr/19-language-server-packaging/)はLSPが`rigortype`にバンドルされたまま（別個の`rigor-lsp` gemではない）と決定し、再評価のための明示的なトリガー条件を持つ。両方のADRがプロジェクトが取る「早すぎるgem分割なし」スタンスを文書化する。
6. **プラグイン`cache_for(...)`ディスクリプタの完全性（2026-05-17に表面化）**。specヘルパーのオプトイン共有キャッシュ（CHANGELOG `[Unreleased]` § Performance）を探索する間、3つのプラグインがプロデューサーが読み取るプロジェクトファイルをディスクリプタが含まないキャッシュプロデューサーを表面化した: `examples/rigor-actioncable`（`:channel_index`は`app/channels/**/*.rb`を読む）、`examples/rigor-actionmailer`（メイラー / ビュー発見が`app/mailers/**/*.rb` + `app/views/**/*`を読む）、`examples/rigor-rails-i18n`（ロケールローダーが`config/locales/**/*.{yml,yaml}`を読む）。現在の動作はspecヘルパーがそれらのファイルに`cache_store: nil`を使うため`rigor check`のデフォルトキャッシュ下で正しいままだが、`rigor check`を永続キャッシュで実行する実際のユーザーは編集間で古いプロデューサー出力を見るだろう（`make cache-clean`まで）。修正: 各`cache_for(...)`呼び出しに、読み取られるglobをカバーする`Descriptor`をスレッド化する。プラグインごとに3つの小さなスライス。需要駆動;コミット済みマイルストーンなし。

### サーベイ前の永続項目

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
7. [`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 25の動作プラグイン / RBSバンドル例の比較表（v0.1.6で`rigor-dry-types`を追加）。
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
