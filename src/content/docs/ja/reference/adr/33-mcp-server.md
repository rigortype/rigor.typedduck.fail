---
title: "ADR-33 — MCPサーバーパッケージング"
description: "rigortype/rigor docs/adr/33-mcp-server.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/33-mcp-server.md"
sourcePath: "docs/adr/33-mcp-server.md"
sourceSha: "de314abc08021e4a2f147ea09aaefbbd3f3d61695d416d4ddda22e95b253dffb"
sourceCommit: "db8d01bf94926a72e6a2aaf15639d1591b7e142e"
translationStatus: "translated"
sidebar:
  order: 4033
---

**ステータス:**Accepted（2026-05-27）; v0.1.10で実装。`rigor mcp --transport stdio`サブコマンドが、7つのツール — `rigor_check`、`rigor_type_of`、`rigor_triage`、`rigor_annotate`、`rigor_sig_gen`、`rigor_explain`、`rigor_coverage` — を公開する純Ruby製のJSON-RPC 2.0 MCPサーバーを出荷する。HTTPトランスポートとセッションごとの環境キャッシュは保留のままである。

## コンテキスト

Rigorはすでに言語サーバー（`rigor lsp`、ADR-19）を同梱しており、LSPプロトコルを使ってstdio経由でエディタに解析エンジンを公開している。**Model Context Protocol（MCP）**向けの並列アダプタにより、AIコーディングアシスタント（Claude Code、Cursor、Clineなど）がRigorのツールを直接呼び出せるようになる——リファクタ提案前の`rigor_check`、ホバーツールチップの根拠となる`rigor_type_of`、プロジェクト全体のクリーンアップを計画するための`rigor_triage`。LSPとMCPは異なる消費者（エディタ対AIエージェント）にサービスを提供し、重複しない。

MCPはJSON-RPC 2.0を改行区切りのJSONstdioストリーム上で使用する。プロトコルサーフェス（surface）はLSPよりも大幅にシンプルである: ケーパビリティネゴシエーションのラウンドトリップなし、ファイルごとのバッファテーブルなし、非同期プッシュ通知なし。MCPサーバーは本質的に関数ディスパッチャーである: `tools/list` → 利用可能なツールの一覧; `tools/call` → ツールを1つ呼び出す。

## 決定

stdioを通じた長期稼働MCPサーバーを起動する`rigor mcp`サブコマンドを出荷する。

## Working decisions

### WD1 — Pure-Ruby実装;MCPgemへの依存なし

ADR-0のゼロランタイム依存スタンスが拘束力を持つ。MCPstdioトランスポートは改行区切りのJSON-RPC——直接実装するには十分シンプル。gemspecに新しいランタイム依存は追加しない。

### WD2 — v1ではstdioのみ;HTTPトランスポートは先送り

`rigor lsp` v1と整合性が取れている。唯一のトランスポートは`--transport stdio`。HTTPトランスポート（リモートCIなど）は需要に先送り。後でHTTPを追加してもCLIサーフェスが変わらないよう、フラグは受け付けて検証する。

### WD3 — 長期稼働プロセス、呼び出しごとのサブプロセスではない

`rigor mcp`は一度起動して多くの`tools/call`リクエストを順番に処理し、Rubyの`require`キャッシュを呼び出し全体で共有する。最初の呼び出しがフルコールドブートコストを払い、以降の呼び出しはロード済みエンジンコードを再利用する。これは`rigor lsp`をミラーする。

### WD4 — CLI内部経由のインプロセスディスパッチ（StringIOキャプチャ）

各ツール呼び出しは合成`argv`を構築し、`StringIO`でstdoutをキャプチャしながら`CLI.new(argv, out:, err:).run`を呼び出す。ツールの結果はキャプチャされた文字列である。

根拠: 既存のCLIコマンドはすでに出力を`--format json`でJSON形式にフォーマットする方法を知っている。それらを再利用することでツールはCLIと自動的に同期を保てる——`rigor check --format json`へのあらゆる改善は即座に`rigor_check`経由で見える。ツールレイヤーの別のJSONシリアライズが不要になる。

### WD5 — 7つの読み取り専用ツール

| MCPツール | 基盤コマンド |
|---|---|
| `rigor_check` | `rigor check --format json --no-stats [paths]` |
| `rigor_type_of` | `rigor type-of --format json FILE:LINE:COL` |
| `rigor_triage` | `rigor triage --format json [paths]` |
| `rigor_annotate` | `rigor annotate --no-color FILE` |
| `rigor_sig_gen` | `rigor sig-gen --print --format json [paths]` |
| `rigor_explain` | `rigor explain --format json [rule]` |
| `rigor_coverage` | `rigor coverage --format json paths` |

**除外:**

- `init`、`baseline`、`diff` — 書き込み側または副作用を持つコマンド。MCPツールは助言的であり、AIエージェントが開始するツール呼び出しでプロジェクトファイルツリーを変更することは適切ではない。
- `lsp` — 別のプロトコルであり、ツールではない。

### WD6 — `isError`はEXIT_USAGE（64）にマッピング、「解析が問題を見つけた」ではない

診断を見つけた`rigor check`の実行は1で終了する——これは正常な解析出力であり、エラーではない。`isError: true`はCLIがEXIT_USAGE（64）で終了したとき、つまり不正な引数またはランタイム失敗のみ設定される。AIクライアントは`isError: false`のJSON診断配列を通常通り読み取れる。

### WD7 — セッションレベルの`--config`デフォルト

`rigor mcp --config=PATH`は個々のツール呼び出しが独自の`config`引数を提供しないときに使用されるセッションレベルのデフォルト設定パスを設定する。`rigor lsp --config`をミラーする。

### WD8 — `rigor mcp`サブコマンド（`HANDLERS["mcp"]`）

`CLI::HANDLERS`の`HANDLERS["lsp"]`と並列。エントリーポイントは`lib/rigor/cli/mcp_command.rb`;サーバーロジックは`lib/rigor/mcp/`以下。

## 却下された代替案

**呼び出しごとのサブプロセスラッパーシェルスクリプト** — すべての`tools/call`でエンジンをコールドブートし、数百ミリ秒のレイテンシを追加する。却下。

**LSPと並んで単一プロセスでMCPを公開する** — プロトコルが異なりすぎて、1つのエントリーポイントに混在させると最小限のゲインで複雑さが増す。別々の`rigor lsp`と`rigor mcp`プロセスの方がクリーン。

**MCP Rubygemの使用** — プロトコルはシンプルであり、ランタイム依存の追加はADR-0に違反する。却下。

## 実装スライス

- **スライス（slice）1（このADR）:** 7ツールすべてを持つ`rigor mcp --transport stdio`。Pure-Ruby JSON-RPCループ + インプロセスCLIディスパッチ。`MCP::Server` + `MCP::Loop`。
- **スライス2（需要駆動）:** HTTPトランスポート（Rackベース）。
- **スライス3（需要駆動）:**コール間の環境キャッシュ（ウォームな`Environment`をコール間サーバー内に保持し、`mtime`ベースのチェックで無効化）。

## 関連ドキュメント

- [ADR-19](../19-language-server-packaging/) — LSPパッケージング（同じ形状、並列チャネル）。
- [ADR-0](../0-concept/) — ゼロランタイム依存スタンス。
