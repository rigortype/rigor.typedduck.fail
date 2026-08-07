---
title: "Language Server — Rigor向けインプロセスRuby LSP"
description: "rigortype/rigor docs/design/20260517-language-server.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260517-language-server.md"
sourcePath: "docs/design/20260517-language-server.md"
sourceSha: "aec5b1d6a5ca7d67ab58b40ac397a7860ed7d9a8d016548d8471b56d45ef85db"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
sourceDate: "2026-07-25T22:13:35+09:00"
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

**置き換え済み（issue #142、着地済み）**: 本節はもともと、`initialize`時に
一度起動してあらゆるリクエストで再利用するRactorプールを規定していた。
実装中に判明した2つの理由から、その形は実際に着地したものと合致しない。
以下の記述は、出荷されるものから黙って乖離するのではなく、実際の機構を
説明する。

1. Rigorの他のあらゆる場所で有効なプールのバックエンドはRactorではなく
   **fork**である（ADR-15の修正。Ractorプールは`RIGOR_POOL_BACKEND=ractor`
   の背後にのみ保存されている —— §「ライブラリ選択」と
   `Rigor::Analysis::Runner::PoolCoordinator`を参照）。LSPのプールは、
   放棄されたバックエンドに残る唯一の呼び出し元になるのではなく、これに
   従う。
2. `Rigor::Analysis::Runner`と`Rigor::LanguageServer::ProjectContext`は
   #142より前（スライス7）から、`DiagnosticPublisher#run_analysis`に
   **永続的で共有された`Environment`＋`ProjectScan`**をすでに与えていた:
   単一バッファの発行はすべて、ウォームな`Environment.for_project`の
   ビルド1回とウォームなプラグインの`#prepare`パス1回を再利用しており、
   リクエストごとにどちらも再構築していない。`initialize`時の起動の背後に
   隠すべき「プールのウォームアップ」コストはもう残っていなかった ——
   高価な部分はすでに償却済みだったのだ。#142が必要としたのは純粋に
   **ディスパッチ側**の変更、すなわち一度に1つではなく複数バッファの解析を
   並列に走らせることだった。

着地した機構:

- `Rigor::Analysis::Runner::BufferPoolDispatcher`（`PoolCoordinator`の
  兄弟であり、Ractorプールのオブジェクトではない）が、ダーティな
  バッファごとに独立した`Runner#run`を1つ走らせ、N個の子プロセスを
  `fork`する。子はコピーオンライトで**親**プロセスのすでにウォームな
  `Environment`＋`ProjectScan`を継承するので、バッチは今日の逐次パスに
  対してRBS環境ビルドやプラグインの`#prepare`の追加コストを**まったく**
  払わない;メインプロセスの外へ移るのはファイルごとの推論そのものだけだ。
  発行と発行の間にアイドルで居座る生きたプールはない: 各バッチは新しい
  子プロセスをforkし、終わったら終了する。これは飽和したワークロードでは
  なく、バースト的でデバウンスされたワークロード（単一バッファの発行の
  定常的な流れと、ときおりのバースト）に対して正しい形である。
- `Rigor::LanguageServer::PublishBatcher`が、URIごとのデバウンスタイマーが
  近接して満了した`publish_for`呼び出し（ワークスペース全体のリネーム、
  多数の開いたファイルに触れるgitブランチ切り替え）を、
  `BufferPoolDispatcher`を通じてディスパッチされる1回の`#publish_many`
  ラウンドへ合流させる。単一フライト化は#246の保存ラウンドと同じやり方だ。
  単独の編集は今日とまったく同じ単一バッファのパス（`#run_and_notify`）を
  通る —— バッチ層はN=1に対してはno-opである。
- **サイズゲート（レビューで追加）:** `BufferPoolDispatcher::DEFAULT_MIN_BATCH_SIZE`
  （16。`RIGOR_LSP_POOL_MIN_BATCH`で上書き）を下回ると、プールが利用可能で
  あっても`#analyze`は逐次のインプロセスパスを取る。このリポジトリ自身の
  `lib/rigor`に対する計測は、`fork`＋`Marshal`＋`Process.waitpid2`の
  オーバーヘッドが並列化の利得をおよそN=12まで上回ること —— まさに現実的な
  バーストの規模である —— そしてN=16以上で初めてきれいに元が取れることを
  示した;完全な表は`BufferPoolDispatcher`自身のドキュメントコメントを参照。
  このゲートのフォールバックは逐次パスがすでに走らせているのとまったく同じ
  計算なので、今日より遅くなることは決してなく、閾値未満で使うのを辞退した
  プールより遅いだけである。
- プールサイズNは`parallel.workers:`／`RIGOR_RACTOR_WORKERS`から解決され、
  `rigor check`をミラーする。これは当初の規定どおりである。
- `hover`／`documentSymbol`は引き続きメインプロセスでインラインに走る
  （安価。バッファごとの推論なし）—— 当初の記述から変更なし。
- `$/cancelRequest`はバッファプールに**配線されていない**。単一バッファの
  パスに対しても実装されたことはなく（「v1スコープ外」のリストがすでに
  リクエスト単位より細かいキャンセルをキューに積んでいる）、上にあった
  リクエストごとのキャンセルフラグの記述は、この着地が満たす必要のなかった
  願望を述べたものだったので、そう示唆したままにせず削除した。
- バッファの差し替えはセッション単位ではなく**ジョブ単位**である: ダーティな
  バッファはそれぞれ自分の`BufferBinding`（論理パス → そのバッファ自身の
  エディタ一時ファイル）をfork子まで持ち込むので、複数が一緒に
  ディスパッチされてもワーカーがディスクにあるままのファイルを読むことも、
  兄弟バッファのバイト列を読むこともない —— `PoolCoordinator`の既存の
  単一セッション`@buffer`スロットが一般化できないリスクである（あちらの
  エディタモードは、実行ごとにバッファバインディングを1つしか持たないため
  まさにその理由で逐次を強制する）。

エディタモードv1は、CLIのワンショットな`--tmp-file`パスに対しては依然として
`workers: 0`を強制する。そこではプールのウォームアップが単一の起動を本当に
支配するからであり、そのトレードオフは変わらない。LSPが異なるのは、プロセス
自体が長命であり、ウォームな状態（`Environment`＋`ProjectScan`）がこのissueとは
独立にすでにリクエスト間で共有されているためで、バッチディスパッチには推論の
作業そのもの以外に償却すべきものが残っていないからだ。

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

`didChange`時のバッファごとの解析スコープ: 変更されたバッファのみが新鮮な
発行を受ける。プロジェクト全体への昇格は以下で決定される。

### 保存時のプロジェクト全体の発行（2026-08-01決定）

エディタモードのオプションBがCLI向けに#146で出荷されたので、LSPは昇格できる。
7つの決定が形を固定する。「発行集合」とは1回の発行ラウンドが対象とするURIの
ことで、その診断を生んだ解析のスコープとは区別される（`CONTEXT.md`を参照。
そこでは**スコープ**は罠のある用語として扱われている）。

1. **発行集合は開いているバッファのみ。** クライアントが開いていないURIは
   決して対象にしない。そうすればクリアの義務に定義された終わり（`didClose`）が
   あるが、サーバーが発行した未オープンURIの集合は永遠に所有することになる。
   これはまた、ワークスペース診断を示唆するのではなく、サーバーをプッシュ型
   診断のセマンティクス内に留める。
2. **各ラウンドは影響を受けたファイルだけでなく、発行集合全体に対して発行する。**
   1回の再チェックはすでにプロジェクト全体の診断を生むので、それを開いているURIで
   分割するのは無償である —— そして古いマーカーは「前回何を発行したか」の台帳では
   なく、構成上ありえなくなる。#204のテーブル差分と同じ理屈だ。
3. **ダーティなバッファは、自分自身としてを除いて発行集合から除外される。**
   バイト列がバインドされるバッファは常に1つだけなので、別のダーティな
   バッファの診断を発行すれば、そのディスク上の古いバイト列について報告する
   ことになる —— 沈黙より悪い。不変条件: *各URIのマーカーは、そのURIの現在の
   バイト列を見た最後の解析から来る* —— ダーティなバッファ自身の`didChange`発行、
   クリーンなバッファなら最新の保存ラウンド。
4. **トリガーは`didChange`ではなく`didSave`。** CLIのオプションB起動1回の
   フェーズ帰属（mastodon `app/models`、248ファイル、ウォーム、4ファイルの
   クロージャ）は、ファイルごとの解析＋マージを約0.60秒と見積もる;ブート・
   RBS環境・事前パス —— 残りの約0.73秒 —— はLSPではすでにウォームか事前構築済みだ。
   これは下記の`didChange` → 発行のp50目標の2〜3倍であり、しかも対象プロファイルの
   5分の1の規模のプロジェクトでの話である。保存はまた、ユーザーの心的モデルが
   「プロジェクトの残りが追いつく」を置く場所でもある。帰結: このラウンドは
   ディスク上のバイト列を読むので、**`BufferBinding`はまったく不要**である。
5. **状態は`ProjectContext`上のインプロセスな`IncrementalSession`であり、
   オンディスクのスナップショットがあればそこからシードされ、決して書き戻さない。**
   書き戻さないのは既存の`cache_store`の決定に従うものだ（読み取り専用なので、
   並行するセッションが共有状態を取り合うことはない）;長命なプロセスは、すでに
   メモリに保持しているものを永続化してもほとんど得をしない。シードは一方向である:
   ターミナルの`rigor check --incremental`がLSPをウォームするのであって、逆ではない。
6. **スナップショットがシードしないとき、最初のラウンドがベースラインを構築する。**
   既存の`Debouncer`上で、プロジェクト全体に対する1つのキーで走る。何もブロック
   しない: 保存されたバッファはすでにその`didChange`で発行済みであり、他のタブは
   ラウンドが着地したときに更新される。ラウンドは開始時に
   `ProjectContext#generation`を捕捉し、**世代が動いていたらその結果を破棄する**
   —— さもないと無効化された世界の診断が発行されてしまう。
7. **単一フライト、サイズ上限なし。** Debouncerは開始していないタスクしか
   キャンセルしないので、放っておくと2つのラウンドが1つのセッションの可変状態の上で
   並行に走りうる;ミューテックスと「再実行保留」フラグが、それに触れるラウンドを
   ちょうど1つに保ち、保存のバーストを高々1回の追加ラウンドへ畳み込む。クロージャの
   サイズに上限はない: あらゆるものがインクルードする基底クラスへの編集の後にすべてを
   再解析するのは、正しさが要求する作業であり、上限を設けると他のタブが更新されるか
   どうかが、ユーザーには観測できない形で依存関係のトポロジーに左右されてしまう ——
   遅さは目に見えるが、静かな陳腐化は見えない。

これが意図的に与えないもの: **未保存の**編集が他のファイルに与える影響。それは
CLIのオプションB（こちらはバッファをバインドする）であり、LSPはそれをp50の予算と
引き換えにしている。

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
    change: TextDocumentSyncKind::FULL  # now INCREMENTAL — see below
  },
  // NOTE: 実装はアドバタイズしない —— `diagnosticProvider`はPULLモデル
  // （`textDocument/diagnostic`）に属し、このサーバーはそれを実装しない。
  // プッシュ型の`publishDiagnostics`はケイパビリティを必要としないので、
  // 上記の保存ラウンドへの昇格はここを何も変えない。
  hoverProvider: true,
  documentSymbolProvider: true,
  positionEncoding: "utf-16"             # LSP default; UTF-8 queued
}
```

`change: FULL`を先に出荷した。インクリメンタルな変更処理はUTF-16コード
ユニットに対する行／列追跡を必要とし、これは些細でない正確性の作業だ
からである。`FULL`はキーストロークごとにバッファ全体を再送する。ネット
ワークはローカルのstdioであり帯域は無関係である。コストはランナーに
あり、トランスポートにはない。

**置き換え済み**: サーバーはいまや`TextDocumentSyncKind::INCREMENTAL`をアドバタイズし、`Rigor::LanguageServer::IncrementalSync`が各`contentChanges`のレンジ編集を、保持されたバッファへUTF-16コードユニット空間で適用する。フルテキストのエントリー形式（`range`のない変更）は依然として正当で、引き続き処理される。確信を持って適用できない変更はバッファを手付かずのまま残し、URIを同期がずれた状態としてマークする——診断はクリアされ、フルテキストの変更または再オープンがそれを再確立するまでプロバイダは応答を差し控える。

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
8. **複数バッファ発行のためのワーカープールディスパッチ（着地済み、issue
   #142 —— Ractorではなくforkとして。理由は「並行性」節の「置き換え済み」の
   注記を参照）**。デバウンスタイマーが同時に満了したバッファのバーストは、
   N回の逐次的な`Runner`呼び出しではなく1回の
   `Rigor::Analysis::Runner::BufferPoolDispatcher`ラウンドを通じて発行される。
   `hover`／`documentSymbol`は当初の規定どおりメインプロセスのままとする。
9. **（先送り）`textDocument/definition`** — FILE:LINEをキーとする
   `Reflection`側シンボルインデックスを必要とする。
10. **インクリメンタルな`didChange`**（着地済み） — UTF-16オフセット
    管理＋行／列変換（`Rigor::LanguageServer::IncrementalSync`）。

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
- インクリメンタル同期（スライス10としてキューイングされていたが、その後着地）。
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
- ~~**単一バッファvsプロジェクトスコープ診断**。~~ 2026-08-01に解決 ——
  §「保存時のプロジェクト全体の発行」を参照。

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
