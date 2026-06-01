---
title: "Language Server — Rigor向けインプロセスRuby LSP"
description: "rigortype/rigor docs/design/20260517-language-server.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260517-language-server.md"
sourcePath: "docs/design/20260517-language-server.md"
sourceSha: "40a692f750611a6c1931aee02b470408715477210df59c7166b6388bd39f8bae"
sourceCommit: "dac915a9ee49b89e89774c34c518e8501275f6a3"
sourceDate: "2026-05-17T01:48:41+09:00"
translationStatus: "translated"
sidebar:
  order: 20265517
---

**Status:** Draft. 契約に対して将来ADRが起票されたときにのみ取って代わ
られる。

[ADR-0](../../adr/0-concept/)はLSP統合を先送りし、CLIファーストの推論
エンジンを成熟させた。エディタモードv1（[`docs/design/20260516-editor-mode.md`](../20260516-editor-mode/)）
はCLIシェルアウトのフロアであり、今日機能する。本ドキュメントは、
そのフロアを「キーストローク高速」フィードバックループへと変える
**インプロセスRuby Language Server**を設計する。これにより、キースト
ロークごとにRuby VM／RBS env起動コストを再消費することがなくなる。

枠組みの決定、言語の比較、アーキテクチャ三者比較の議論はここでは繰り
返さない。本ドキュメントを生んだチャットスレッドを参照されたい。本
ファイルは決定を束ねるものである。

## 決定事項

- **アーキテクチャ: B（インプロセスRuby LSP）**。1つのLSPプロセスが
  `Rigor::Analysis::Runner`、プラグイン、`Environment`、RBSロード、
  Ractorプールをホストする。リクエストごとの作業はバッファごとの推論
  のみである。
- **言語: Ruby**。解析器と同じランタイム。IPCなし、シェルアウトなし、
  言語横断の型マーシャリングなし。
- **ライブラリ: `language_server-protocol` gem（薄い）**。JSON-RPC
  フレーミング＋LSP型セットを提供する。Solargraph／RuboCop LSP／Steep
  はすべてこれを使う。Rigorは`ruby-lsp`のアドオンフレームワーク（Rigor
  には合わないShopifyスタイルのライフサイクルを前提とする）の中で生き
  るのではなく、自身のディスパッチャー、ライフサイクル、メッセージ
  ルーティングを所有する。
- **CLI表面: `rigor lsp`サブコマンド**。`rigor check`／`rigor type-of`
  と同じgem、同じバイナリ、同じ設定発見。今日公開する別gemはない。v1
  のLSPはrigor gem自体の一部である。パッケージ形状（バンドルvs
  スタンドアロンの`rigor-lsp` gem vs `ruby-lsp-rigor`アドオン）は
  [`ADR-19`](../../adr/19-language-server-packaging/)で、問題を再び
  開く可能性のあるトリガー条件とともに決定される。
- **トランスポート: stdio JSON-RPC**。v1にはTCP／IPC／Unixソケットは
  ない。

## なぜアーキテクチャBがRigorにとってA／Cに勝るか

ボトルネックはLSPプロトコルのオーバーヘッドではない。Ruby VM起動
（約150ms）＋`Environment.for_project`（ウォームで約100-300ms、コール
ドで1000ms以上）＋プラグインロードである。エディタモードv1のCLIシェル
アウトはキーストロークごとにそのコストを支払う。インプロセスは一度だ
け支払い、セッションを通じて償却する。

| | A（CLIシェルアウト）| B（インプロセスRuby）| C（多言語＋Rubyデーモン）|
|---|---|---|---|
| リクエストあたりウォール時間 | 500ms–1.5s | 30–200ms | 50–250ms |
| 解析器との相互運用 | サブプロセス引数 | 直接require | JSON-RPC／msgpack |
| リクエスト横断のプラグインファクト共有 | 不可 | **可** | デーモンAPIが必要 |
| Ractorプール再利用 | 不可能（ワンショット）| **可** | 可、デーモン側 |
| コードベースフットプリント | 0（エディタモードv1）| LSPサーバー | LSPシェル＋デーモン＋IPCスキーマ |
| 配布 | 単一gem | 単一gem | 単一静的バイナリ＋gem |

アーキテクチャCはプロトコル側のパフォーマンスとバイナリ配布で勝つが、
Rigorが今日気にする他のすべての軸では負ける。LSPプロトコルのレイテン
シが（その兆候はないものの）ボトルネックになった場合は、プロトコル
シェルとしてGoまたはRustを使うCを再検討する。

## CLI表面

```sh
rigor lsp [--transport=stdio] [--log=PATH] [--config=PATH]
```

- `--transport=stdio`（デフォルト。v1で受け付けられる唯一の値）。TCP
  ／Unixソケットトランスポートは具体的な需要が出るまでキューイングさ
  れる。
- `--log=PATH`はLSPワイヤログ＋サーバー側デバッグ出力を書き込む。
  未設定の場合、サーバー側ログは`stderr`に行く（クライアントは
  `window/logMessage`経由でルーティングする）。
- `--config=PATH`は`rigor check --config=PATH`をミラーする。LSPは未設
  定の場合`Configuration.discover`を使う（同じコードパス）。

位置引数はない。LSPサーバーは「paths」を持たない。クライアントが
`textDocument/didOpen`経由で何が開かれているかをサーバーに伝える。

## リクエスト → 内部APIのマッピング

| LSPメソッド | 方向 | Rigor内部 | 備考 |
|---|---|---|---|
| `initialize` | C→S | `Environment.for_project`＋プラグイン`#prepare`＋プリパスをブートストラップ | アドバタイズされたケイパビリティを返す。プロジェクトルートは`rootUri`／`workspaceFolders`から。 |
| `initialized` | C→S | no-op | オプションの`workspace/didChangeWatchedFiles`登録をトリガーする。 |
| `shutdown` | C→S | ランナー解放、ワーカードレイン | サーバーは`exit`まで生存する。 |
| `exit` | C→S | `exit 0` | プロセス終了。 |
| `textDocument/didOpen` | C→S | 仮想ファイルテーブル`{uri => bytes}` | 診断発行をトリガーする。 |
| `textDocument/didChange` | C→S | 仮想テーブルを変異 | デバウンスされた診断発行をトリガーする。 |
| `textDocument/didSave` | C→S | v1ではno-op | 診断は`didChange`によりすでに新鮮。 |
| `textDocument/didClose` | C→S | 仮想テーブルからエントリー削除 | URIに対し空の診断を発行してインラインマーカーをクリアする。 |
| `textDocument/publishDiagnostics` | S→C | `Runner.run(buffer:)` → `Result#diagnostics` → LSP `Diagnostic[]` | ファイルごとの出力。ダーティなファイル1つにつき通知1つ。 |
| `textDocument/hover` | C↔S | 位置における`Scope#type_of`（`Source::NodeLocator`＋`ScopeIndexer`）— 既存の`rigor type-of`のコア | Markdownボディを返す。 |
| `textDocument/definition` | C↔S | （先送り）`Reflection`シンボルインデックス | スライス7以降。 |
| `textDocument/documentSymbol` | C↔S | Prism ASTを走査して`ClassNode`／`ModuleNode`／`DefNode`を収集 → LSP `DocumentSymbol[]` | |
| `workspace/didChangeConfiguration` | C→S | `Configuration.discover`再読み込み＋Environment再構築 | キャッシュ済みプリパスを破棄。 |
| `workspace/didChangeWatchedFiles` | C→S | ファイルごとのキャッシュ無効化 | 「プロジェクトコンテキストの更新」セクションを参照。 |

それ以外のメソッドは`ServerCapabilities`でアドバタイズされない。問い
合わせたクライアントは`MethodNotFound`を受け取る。スコープ外のメソッ
ドは「v1スコープ外」セクションで列挙される。

## バッファ状態モデル

LSPサーバーはセッションごとに`BufferTable`を保持する。
`DocumentUri`をキーとする。

```ruby
class BufferTable
  # uri -> { bytes: String, version: Integer, dirty: Boolean }
end
```

- `didOpen`はエントリーを作成する。
- `didChange`は`bytes`を変異させ`version`を増やす。診断発行が完了する
  まで`dirty: true`。
- `didClose`はエントリーを削除する。URIの診断は空の発行でクリアされる。

診断実行が発火すると、サーバーはダーティなエントリーごとに`BufferBinding`
を1つ実体化する。

```ruby
BufferBinding.new(
  logical_path: uri_to_project_path(uri),
  physical_path: write_tempfile(bytes)
)
```

パスマッピング（`uri_to_project_path`）は`file://...`をランナーが期待
するプロジェクトルート相対パスに正規化する。Windowsでは、URIデコード
がドライブレターの畳み込みを担当する。このケースに対するv1仕様は
「オープンクエスチョン」セクションにある。

なぜインメモリの`{path => bytes}`パーサオーバーライドではなくテンポ
ラリファイルを使うのか？　`Runner`／`WorkerSession`／プリパススキャナ
は`BufferBinding.resolve`を通じてすでに物理パスからパースする。LSPバ
ッファをテンポラリファイル経由でルーティングすればその契約をビット単
位で再利用できる。新たなパーサエントリーポイントなし、維持すべき第二
のコードパスなし。テンポラリファイルは`Dir.tmpdir`配下に置かれ、バッ
ファエントリーが削除されたときにunlinkされる。

## 並行性

- LSPはサイズNのRactorプール1つを起動する（`parallel.workers:`／
  `RIGOR_RACTOR_WORKERS`、`rigor check`をミラー）。
- ワーカーは最初のリクエスト時に遅延ウォームアップされるのではなく、
  `initialize`時に`Environment`＋プラグインで事前ウォームアップされる。
  セッションは長命（分から時間オーダー）であり、コールドスタート税は
  ちょうど1回支払われる。
- 各`publishDiagnostics`リクエストはワーカー1つにディスパッチされる。
  プールの既存のワーカーごとのレポーターとFactStoreは`rigor check`プー
  ルモードと同様に機能し続ける。
- `hover`／`documentSymbol`リクエストはメインRactorでインラインで実行
  できる（安価。バッファごとの推論なし）。
- キャンセル: LSPの`$/cancelRequest`はv1ではリクエストごとのキャンセル
  フラグの設定で尊重される。ワーカーはスコープインデックス構築ステップ
  間でそれをチェックする。粒度は粗い（実行中リクエスト1つにつきキャン
  セルポイント1つ）。きめ細かいASTウォークキャンセルは先送りである。

エディタモードv1はバッファごとのワンショットコストがプールウォーム
アップに支配されるため`workers: 0`を強制する。LSPはそれを反転させる。
プールは一度ウォームアップされて生存し続けるため、リクエストごとの
コストは本来あるべき場所（推論のみ）に着地する。

## プロジェクトコンテキストの更新

プロジェクト全体のプリパス（`SyntheticMethodScanner`、
`ProjectPatchedScanner`、プラグインの`#prepare`、依存ソースウォーカー）
は高価である（プロジェクト規模に応じて数百ミリ秒から数秒）。キース
トロークごとに再実行されてはならない（MUST NOT）。

セッションは**コンテキスト世代カウンタ**と派生スナップショットを保持
する。

```ruby
class ProjectContext
  attr_reader :generation, :synthetic_method_index,
              :project_patched_methods, :plugin_registry,
              :environment
end
```

無効化ルール。

| イベント | アクション |
|---|---|
| プロジェクト`.rb`ファイルに対する`workspace/didChangeWatchedFiles` | ファイルごとの合成メソッド／プロジェクトパッチ寄与を無効化、影響を受けるインデックススライスを再構築 |
| `.rigor.yml`／`Gemfile.lock`に対する`workspace/didChangeWatchedFiles` | 世代を増やし、コンテキスト全体を再構築 |
| `workspace/didChangeConfiguration` | 世代を増やし、再構築 |
| 開いているバッファに対する`didChange` | 無効化なし — バッファは仮想であり、ディスク上にない。プリパスは`BufferBinding`経由ですでに仮想バイトを参照する |

バッファのプリパスは診断発行時に常に仮想ファイルテーブルに対して再実
行される。単一ファイルスコープでは十分安価である。プロジェクト全体の
再実行は`workspace/didChangeWatchedFiles`の背後にゲートされる。

クライアントが`workspace/didChangeWatchedFiles`をサポートしない場合
（最小限のクライアントなど）、LSPは安全弁としてN=20で「N回ごとのリ
クエストでコンテキストを再構築する」にフォールバックする。粗いが正し
い。

## 診断ストリーミング

LSPはサーバープッシュの`textDocument/publishDiagnostics`を要求する。
サーバーは以下のときに発行する。

- `didOpen`時 — 開かれたバッファに対する新鮮な診断。
- `didChange`時 — 最後のキーストロークから200msデバウンス。新しい
  `didChange`ごとにタイマーがリセットされる。高速タイピング中の発行
  ストームを防ぐ。
- `didClose`時 — URIに対する空の診断配列（インラインマーカーをクリア）。

バッファごとのスコープ: 変更されたバッファのみが新鮮な発行を受ける。
これはエディタモードv1の単一ファイルスコープに一致する。ファイルごと
の診断キャッシュが着地したとき（キューイング済み。ROADMAPの「エディ
タ／IDE統合」セクションを参照）、LSPはプロジェクトスコープ発行に安価
に昇格できる。

重要度プロファイル＋ルールごとのオーバーライドは`rigor check`と同様に
適用される。LSP `DiagnosticSeverity`のマッピング。

| Rigor `Diagnostic#severity` | LSP `DiagnosticSeverity` |
|---|---|
| `:error` | `Error` (1) |
| `:warning` | `Warning` (2) |
| `:info` | `Information` (3) |
| `:hint` | `Hint` (4) |

LSP `Diagnostic`の`source`フィールドは`"rigor"`。`code`はルール識別子
（`"call.undefined-method"`、`"flow.always-raises"`、…）。`data`は
プラグインソースファミリー（`:builtin`／`"plugin.activerecord"`／…）を
運ぶため、後でクライアント側フィルタを配線できる。

## v1でアドバタイズされるケイパビリティ

```ruby
{
  textDocumentSync: {
    openClose: true,
    change: TextDocumentSyncKind::FULL  # incremental queued
  },
  diagnosticProvider: {
    interFileDependencies: false,        # single-file scope
    workspaceDiagnostics: false
  },
  hoverProvider: true,
  documentSymbolProvider: true,
  positionEncoding: "utf-16"             # LSP default; UTF-8 queued
}
```

`change: FULL`を先に出荷する。インクリメンタルな変更処理はUTF-16コード
ユニットに対する行／列追跡を必要とし、これは些細でない正確性の作業だ
からである。`FULL`はキーストロークごとにバッファ全体を再送する。ネット
ワークはローカルのstdioであり帯域は無関係である。コストはランナーに
あり、トランスポートにはない。

インクリメンタルな変更処理はスライス9以降にキューイングされる。

## ライブラリ選択

`language_server-protocol`（mtsmfm）は以下を提供する。

- `stdio`／`socket`経由のJSON-RPCフレーミング。
- Ruby Data形状の値クラスとしての完全なLSP型セット。
- 最小限の`LanguageServer::Protocol::Transport::Stdio`の読み手／書き手。

提供しないもの。

- サーバーライフサイクル。我々が`LanguageServer::Server`（状態機械:
  uninitialized → initialized → shutdown → exit）を所有する。
- リクエストディスパッチャー。我々がメソッドシンボル → ハンドラのハッ
  シュを所有する。
- ワーカープール。我々がRigorのRactorプールに直接バインドする。

`ruby-lsp`（Shopify）は3つすべてを提供するが、特定のアドオンライフ
サイクルと、単一ツールLSPには冗長な意見の強い「extensions register
here」表面を仮定する。Rigorは多拡張足場を必要としない。我々はライフ
サイクルを完全に制御できる最小限のプロトコル層を望む。よって薄い選択
である。

## スライス

各スライスはspec付きで自身のコミットで出荷される。エディタモードv1の
7スライス分割と同じ規律である。

1. **`rigor lsp` CLIサブコマンドスタブ**。`--transport=stdio`を受け
   付け、ケイパビリティスケルトンを表示し、`shutdown`＋`exit`で終了
   する。実際の解析はまだない。Spec: `LanguageServer::Server`を通じて
   最小の`initialize` → `shutdown` → `exit`シーケンスをディスパッチ
   し、応答形状をアサートする。
2. **`Rigor::LanguageServer::Server`ライフサイクル**。状態機械、stdio
   上のJSON-RPCディスパッチャー、ケイパビリティネゴシエーション。フレー
   ミングに`language_server-protocol`を再利用する。
3. **`BufferTable`＋`didOpen`／`didChange`／`didClose`**。仮想ファイル
   テーブルを保持する。診断はまだない。
4. **`didChange`時の`publishDiagnostics`（200msデバウンス）**。
   `BufferBinding`を実体化し、バッファモードで`Runner`を実行し、
   `Diagnostic`をLSP形状に変換し、プッシュする。エンドツーエンドで
   ユーザーに見える最初の成果。
5. **`textDocument/hover`**。`rigor type-of`のコア（スコープインデック
   ス＋`NodeLocator`＋`Scope#type_of`）をラップする。型＋RBS消去形を
   含むMarkdownホバーボディを返す。
6. **`textDocument/documentSymbol`**。Prism ASTを走査して`ClassNode`
   ／`ModuleNode`／`DefNode`を収集 → LSP `DocumentSymbol[]`。
7. **`workspace/didChangeWatchedFiles`＋ProjectContext無効化**。ファイ
   ルシステムイベントが影響を受けるインデックススライスを破棄する。
   プリパスはインクリメンタルに再構築される。
8. **Ractorプール統合**。LSPは`initialize`時にプールを起動する。リク
   エストごとの診断はプールにディスパッチされる。`hover`／
   `documentSymbol`はメインRactorのままとする。
9. **（先送り）`textDocument/definition`** — FILE:LINEをキーとする
   `Reflection`側シンボルインデックスを必要とする。
10. **（先送り）インクリメンタルな`didChange`** — UTF-16オフセット
    管理＋行／列変換。

スライス8のあとで、エディタモードv1がすでに目標としていた「キース
トローク高速のリント＋ホバー型」ループに対して、ただし10倍の応答性で
v1 LSPは機能完成となる。

## v1スコープ外

- `textDocument/completion`（実質的 — 別途補完エンジン設計が必要。本
  ドキュメントには何もブロックされない）。
- `textDocument/codeAction`（リファクタリング — 別の問題）。
- `textDocument/formatting`（RuboCopの仕事）。
- `textDocument/rename`（プロジェクト全体のシンボルインデックスが必要）。
- `textDocument/semanticTokens`（装飾的、オプション）。
- `textDocument/inlayHint`（装飾的、オプション）。
- マルチルートワークスペース（v1は単一ルートのみ）。
- TCP／ソケットトランスポート。
- インクリメンタル同期（スライス10としてキューイング）。
- リクエストごとより細かいキャンセル（キューイング）。

## オープンクエスチョン

- **Windowsパスエンコーディング**。LSPのURIはWindowsで
  `file:///C:/foo/bar.rb`をデコードする。プロジェクト相対パスのマッピ
  ングはドライブレターのケース＋パス区切り文字の畳み込みを処理する必要
  がある。v1は期待される形を文書化するが、LSPのWindows CIはv1では計画
  されていない。
- **ロギングポリシー**。サーバー側ログ書き込みは2つに分かれる。プロト
  コルログ（クライアントへ送られるLSP `window/logMessage`イベント）と
  運用ログ（`--log=PATH`下に書かれるファイル）。`--log`がセットされた
  ときは両方にミラーすることを推奨する。さもなくばファイルログは
  `stderr`へ行き、クライアントは`showMessage`経由で`:error`レベルのイ
  ベントだけを見る。
- **設定の再読み込み**。`workspace/didChangeConfiguration`のペイロード
  形式はクライアント固有である。v1はペイロードを無視して
  `Configuration.discover`を再実行する。特定クライアント（Neovimの
  lspconfig、VSCodeのRigor拡張）が独自形状を望む場合、後で
  `--workspace-config-format`フラグが現れるかもしれない。
- **ホバーコンテンツ形式**。LSPの`Hover#contents`は
  `MarkupContent { kind, value }`を受け付ける。v1は型＋RBS消去行に対
  する```` ```ruby ````コードブロックを伴う`kind: "markdown"`を出荷す
  る。`MarkupKind::PlainText`のみをサポートするクライアント向けプレー
  ンテキストフォールバックはキューイングされている。
- **`initializationOptions`の形**。v1は存在すれば`config_path:`と
  `cache_path:`を読む。両方ともオプション。このための正確なJSON-Schema
  はスライス1の着地時に最終決定される。
- **単一バッファvsプロジェクトスコープ診断**。LSPはエディタモードv1
  の「オプションA」（単一ファイルスコープ）を継承する。ファイルごとの
  診断キャッシュが着地したとき（ROADMAPの「エディタ／IDE統合」セク
  ション）、LSPはファイル保存時にプロジェクト全体の診断を発行できる。
  CLI形状は前方互換である。

## パフォーマンス目標

これらはスライス8のあと、現行ラップトップ（8コア、32GB）上の5Kファイ
ルプロジェクトに対するウォームセッションでの目指すべき定常状態目標で
ある。

| 操作 | 目標ウォール時間 | パス |
|---|---|---|
| コールドスタート（`initialize` → 最初の発行）| < 3s | Environment構築＋プリパス |
| `didChange` → `publishDiagnostics` | < 250ms（p50）、< 500ms (p95) | デバウンス＋単一ファイル推論 |
| `hover` | < 100ms (p95) | スコープインデックス＋type_of |
| `documentSymbol` | < 50ms (p95) | Prism走査 |
| 定常状態メモリ | < 600 MB | RBS env＋Ractorプール＋Nバッファ |

コールドスタート予算はRBS env構築に支配される。キャッシュヒットの
ウォームスタートは < 1.5sのはず。`didChange`予算は単一ファイルスコー
プ（オプションA）を仮定する。オプションB（プロジェクトスコープ＋
ファイルごとの診断キャッシュ）が利用可能になったときには、p95は実質
的に締まるだろう。
