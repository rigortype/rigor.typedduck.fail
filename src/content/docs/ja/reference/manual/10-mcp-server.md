---
title: "Rigor MCPサーバー — AIエージェント統合"
description: "rigortype/rigor docs/manual/10-mcp-server.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/10-mcp-server.md"
sourcePath: "docs/manual/10-mcp-server.md"
sourceSha: "73b0420f7e30692ec093a87e7d192bd36ec9fe8a7a07a20a175fbdc495dd76be"
sourceCommit: "636f8725dd79aab2f711249ace6357a98b7e73a4"
translationStatus: "translated"
sidebar:
  order: 9010
---

`rigor mcp`は`rigortype` gemに同梱されているModel Context Protocol（MCP）サーバーです。Rigorの解析ツールを改行区切りstdioストリーム上のJSON-RPC 2.0ツール呼び出しとして公開するため、AIコーディングアシスタント——Claude Code、Cursor、Cline、VS Code Copilot Chat、その他のMCP対応エージェント——がセッション中にRigorを直接呼び出せます。

> **この章の内容**
> [MCP対LSP](#mcp対lsp--適切な統合の選択) ·
> [ツール一覧](#ツール一覧) ·
> [前提条件](#前提条件) ·
> [CLI](#cli) ·
> クライアント設定 — [Claude Desktop](#claude-desktop) · [Claude Code](#claude-code-cli) · [Cursor](#cursor) · [Cline](#clinevs-code拡張) · [汎用](#汎用--カスタムmcpクライアント) ·
> ツールリファレンス — [`rigor_check`](#rigor_check) · [`rigor_type_of`](#rigor_type_of) · [`rigor_triage`](#rigor_triage) · [`rigor_annotate`](#rigor_annotate) · [`rigor_sig_gen`](#rigor_sig_gen) · [`rigor_explain`](#rigor_explain) · [`rigor_coverage`](#rigor_coverage) ·
> [トラブルシューティング](#トラブルシューティング) ·
> [ステータスとロードマップ](#ステータスとロードマップ)

## MCP対LSP — 適切な統合の選択

`rigor lsp`と`rigor mcp`は同じ基盤エンジンを公開します。違いは消費者です。

| | `rigor lsp` | `rigor mcp` |
|---|---|---|
| プロトコル | Language Server Protocol | Model Context Protocol |
| 消費者 | エディタ | AIコーディングエージェント |
| インタラクション | 継続的（セーブのたびに診断をプッシュ） | オンデマンド（エージェントが判断したときにツールを呼び出す） |
| トランスポート | stdio（TCPキュー） | stdio（HTTPキュー） |
| 使用場面 | エディタ統合 | AI支援開発 |

インラインの診断とNeovim、VS Code、Helix、Emacsでのホバーを得るには`rigor lsp`を使います。AIエージェントがリファクタ提案前に型チェックし、カーソル位置の型を調べ、コードレビューセッションのコンテキストとしてプロジェクトの診断セットをトリアージできるようにするには`rigor mcp`を使います。

両方を同時に実行しても競合はありません。

## ツール一覧

| ツール | 基盤コマンド | 返り値 |
|---|---|---|
| `rigor_check` | `rigor check --format json` | JSON診断レポート |
| `rigor_type_of` | `rigor type-of --format json` | `FILE:LINE:COL`のJSON型 |
| `rigor_triage` | `rigor triage --format json` | JSON分布 + ホットスポット + ヒント |
| `rigor_annotate` | `rigor annotate --no-color` | 注釈付きRubyソース |
| `rigor_sig_gen` | `rigor sig-gen --print --format json` | JSON RBSスケルトン候補 |
| `rigor_explain` | `rigor explain --format json` | JSONルールカタログエントリー |
| `rigor_coverage` | `rigor coverage --format json` | JSON精度ティア内訳 |

すべてのツールは読み取り専用です。書き込み側の操作（`rigor init`、`rigor baseline generate`、`rigor sig-gen --write`）は意図的に除外されています——プロジェクトファイルの変更は開発者が行うものであり、エージェントのツール呼び出しではありません。

## 前提条件

唯一の前提条件は**`PATH`上の`rigor`** ——`rigor check`と`rigor lsp`が既に使っているのと同じ実行ファイルです。[Rigorのインストール](../01-installation/)のどのインストールチャネルでも提供されます;`mise`が推奨チャネルです。shims経由でシェル環境を継承しないプロセス（AIエージェント）にも`rigor`を利用可能にするためです。

`rigortype`をプロジェクトの`Gemfile`に追加**しないでください**。Rigorはツールであり、ライブラリではありません。[Rigorのインストール §「推奨 — ランタイムバージョンマネージャー」](../01-installation/#recommended--a-runtime-version-manager)を参照してください。

## CLI

```sh
rigor mcp [--transport=stdio] [--config=PATH]
```

- `--transport=stdio` — デフォルト;v1で受け付ける唯一の値。HTTPトランスポートはv2に先送り。
- `--config=PATH` — セッションレベルのデフォルト設定パス。個々のツール呼び出しが独自の`config`引数を提供でき、それが優先されます。どちらもない場合、`Configuration.discover`がワーキングディレクトリから`.rigor.yml` / `.rigor.dist.yml`を探索します。

終了コード: 0（クリーンシャットダウン — stdin EOF）、64（不明な`--transport`）。

## クライアント設定

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）または`%APPDATA%\Claude\claude_desktop_config.json`（Windows）にエントリーを追加します:

```json
{
  "mcpServers": {
    "rigor": {
      "command": "rigor",
      "args": ["mcp"]
    }
  }
}
```

Claude Desktopを再起動します。`rigor_check`、`rigor_type_of`などのツールがモデルのツールパレットに表示されます。特定のプロジェクト設定に解析をピン留めするには:

```json
{
  "mcpServers": {
    "rigor": {
      "command": "rigor",
      "args": ["mcp", "--config=/path/to/project/.rigor.yml"]
    }
  }
}
```

### Claude Code CLI

Claude CodeはプロジェクトレベルのMCPサーバー定義をその設定から読み込みます。プロジェクトルートの`.claude/settings.json`に追加します:

```json
{
  "mcpServers": {
    "rigor": {
      "command": "rigor",
      "args": ["mcp"]
    }
  }
}
```

または`~/.claude/settings.json`にグローバルに登録して、すべてのプロジェクトで利用可能にします。登録すると、Claude CodeはこれからRigorを使えます。

### Cursor

`.cursor/mcp.json`（プロジェクトルート）または`~/.cursor/mcp.json`（ユーザーレベル）に追加します:

```json
{
  "mcpServers": {
    "rigor": {
      "command": "rigor",
      "args": ["mcp"]
    }
  }
}
```

CursorのComposerはRigorツールを組み込み機能と並べて提供します。`rigor_check`はComposerリファクタの前に特に有用です——まず実行して現在の診断ベースライン（baseline）を把握し、その後で比較します。

### Cline（VS Code拡張）

Clineパネル → MCPサーバー → サーバーを追加 → カスタムを開き、以下を入力します:

| フィールド | 値 |
|---|---|
| 名前 | `rigor` |
| コマンド | `rigor` |
| 引数 | `["mcp"]` |

またはClineの`cline_mcp_settings.json`に直接追加します:

```json
{
  "mcpServers": {
    "rigor": {
      "command": "rigor",
      "args": ["mcp"]
    }
  }
}
```

### 汎用 / カスタムMCPクライアント

`rigor mcp`は[MCPstdioトランスポート](https://spec.modelcontextprotocol.io/specification/basic/transports/#stdio)を使います: 1行1つのJSON-RPC 2.0メッセージ、`\n`終端、`Content-Length`フレームなし。この規約に従うどのクライアントでも動作します。初期化シーケンス:

```
→  {"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-agent","version":"1.0"}}}
←  {"jsonrpc":"2.0","id":0,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"rigor","version":"0.1.15"}}}
→  {"jsonrpc":"2.0","method":"notifications/initialized"}
→  {"jsonrpc":"2.0","id":1,"method":"tools/list"}
←  {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

`notifications/*`以外のすべてのメッセージはレスポンスを必要とします。`notifications/*`は`id`を持たず、静かに消費されます。

## ツールリファレンス

### rigor_check

1つ以上のRubyファイルまたはディレクトリを型エラー、未定義メソッド、引数数の不一致、nilレシーバーリスクについて解析します。

**入力:**

| 引数 | 型 | 必須 | デフォルト |
|---|---|---|---|
| `paths` | `string[]` | はい | — |
| `config` | `string` | いいえ | セッションデフォルト |

**返り値:** JSON — `rigor check --format json`と同じ構造。

```json
{
  "diagnostics": [
    {
      "path": "app/models/user.rb",
      "line": 42,
      "column": 5,
      "rule": "call.undefined-method",
      "severity": "error",
      "message": "undefined method `naem` for String"
    }
  ]
}
```

`isError`は、診断が見つかった場合でも実行が正常完了したときは`false`。`isError: true`はCLIがEXIT_USAGE（64）で終了したとき——不正な引数またはランタイム失敗——のみ設定されます。AIクライアントは`isError: false`のJSON診断配列を通常通り読み取れます。

**典型的なエージェントの使い方:**エージェントが編集しようとするファイルに対して`rigor_check`を呼び出してベースラインを記録し、編集を適用し、再度呼び出して2つの診断配列の差分を取ることで変更が問題を導入または解決したかを確認する。

---

### rigor_type_of

特定のソース位置での式の推論型を取得します。

**入力:**

| 引数 | 型 | 必須 |
|---|---|---|
| `file` | `string` | はい |
| `line` | `integer`（1ベース） | はい |
| `col` | `integer`（1ベース） | はい |
| `config` | `string` | いいえ |

**返り値:** JSON — `rigor type-of --format json`と同じ。

```json
{
  "file": "lib/order.rb",
  "line": 17,
  "column": 10,
  "node": "LocalVariableReadNode",
  "type": "Integer | nil",
  "erased": "Integer?"
}
```

**典型的なエージェントの使い方:**ホバー説明の根拠（「このカーソル位置の`x`の型は何か？」）、またはシグネチャを生成する前の型仮定の検証。

---

### rigor_triage

プロジェクトの診断ストリームを要約します: ルール分布、ファイルごとのホットスポット、最も一般的なエラークラスタに対するヒューリスティックヒント。

**入力:**

| 引数 | 型 | 必須 | デフォルト |
|---|---|---|---|
| `paths` | `string[]` | いいえ | 設定済みパス |
| `top` | `integer` | いいえ | `10` |
| `config` | `string` | いいえ | セッションデフォルト |

**返り値:** JSON — `rigor triage --format json`と同じ。

```json
{
  "summary": { "total_diagnostics": 488, "files_with_diagnostics": 31 },
  "distribution": [
    { "rule": "call.possible-nil-receiver", "count": 212, "pct": 43.4 }
  ],
  "hotspots": [
    { "path": "app/models/account.rb", "count": 38 }
  ],
  "hints": [
    { "id": "H1", "message": "Likely missing ActiveSupport core_ext RBS ...", "action": "..." }
  ]
}
```

**典型的なエージェントの使い方:**コードレビューまたはクリーンアップセッションの開始時に`rigor_triage`を実行して、どのルールとファイルに注力するかを決める前に診断の全体像を把握する。

---

### rigor_annotate

指定されたRubyソースファイルに各行の最後の式の型を`#=>`コメントとして付加して返します。`def`ヘッダー行はメソッドの推論戻り型を表示します。

**入力:**

| 引数 | 型 | 必須 |
|---|---|---|
| `file` | `string` | はい |
| `config` | `string` | いいえ |

**返り値:**プレーンテキスト（注釈付きRubyソース）。JSONではありません。

```ruby
module Rigor
  VERSION = "0.1.15"  #=> "0.1.15"
end
```

**典型的なエージェントの使い方:** `rigor_type_of`を行ごとに呼び出すことなく、特定のファイルを通じてRigorが型を推論する方法を理解する。

---

### rigor_sig_gen

RubyソースファイルからRBSスケルトンシグネチャを推論して生成します。

**入力:**

| 引数 | 型 | 必須 | デフォルト |
|---|---|---|---|
| `paths` | `string[]` | いいえ | 設定済みパス |
| `params` | `"untyped"` | `"observed"` | いいえ | `"untyped"` |
| `config` | `string` | いいえ | セッションデフォルト |

`params: "observed"`は`spec/`（または基盤CLIの`--observe=PATH`で指定されたディレクトリ）から呼び出しサイト引数型を収集します。

**返り値:** JSON — `rigor sig-gen --print --format json`と同じ。

```json
{
  "candidates": [
    {
      "class_name": "Order",
      "method_name": "total",
      "kind": "instance",
      "classification": "new-method",
      "rbs": "def total: () -> Integer"
    }
  ]
}
```

分類: `new-file`、`new-method`、`tighter-return`、`equivalent`、`skipped`。

**典型的なエージェントの使い方:** `rigor_sig_gen`を呼び出してどのメソッドが`sig/`に書く価値のある精確な戻り値を持つかを確認し、候補を生成して挿入する。エージェントはシグネチャを自動的に書く**べきではありません** — 候補を人間のレビューのために提示し、確認済みエントリーのみを`rigor sig-gen --write`で適用する。

---

### rigor_explain

1つまたはすべてのRigor診断ルールの説明を調べます。

**入力:**

| 引数 | 型 | 必須 | 備考 |
|---|---|---|---|
| `rule` | `string` | いいえ | 省略するとフルカタログを取得 |

受け付ける値: 正規ルールID（`call.undefined-method`）、レガシーエイリアス（`undefined-method`）、またはファミリープレフィックス（`call`、`flow`、`assert`、`dump`、`def`）。

**返り値:** JSON — ルールカタログエントリーの配列。

```json
[
  {
    "id": "call.undefined-method",
    "summary": "Method not found on the inferred receiver type.",
    "severity_authored": "error",
    "since": "0.0.1",
    "fires_when": ["..."],
    "does_not_fire_when": ["..."],
    "suppression": "# rigor:disable call.undefined-method"
  }
]
```

**典型的なエージェントの使い方:**診断をユーザーに説明する、または特定の状況でルールが発火するかどうかを調べて発見が実際のバグかどうかを判断する。

---

### rigor_coverage

型精度カバレッジを報告します: Rigorが`Constant` / `Nominal` / shaped / refined（精確）として型付けする式の割合対`Dynamic[Top]`または`top`（不透明）の割合。

**入力:**

| 引数 | 型 | 必須 |
|---|---|---|
| `paths` | `string[]` | はい |
| `config` | `string` | いいえ |

**返り値:** JSON — `rigor coverage --format json`と同じ。

```json
{
  "summary": {
    "files_processed": 12,
    "expressions_typed": 3841,
    "precision_ratio": 0.447
  },
  "tiers": {
    "constant": 312, "nominal": 903, "shaped": 46,
    "refined": 71, "bot": 381,
    "dynamic_specific": 512, "dynamic_top": 1498, "top": 118
  },
  "files": [
    {
      "path": "lib/order.rb",
      "expressions_typed": 214,
      "precision_ratio": 0.612
    }
  ]
}
```

**典型的なエージェントの使い方:** foldルールやRBSアノテーションを追加した影響を測定する——前後で`rigor_coverage`を呼び出して`precision_ratio`のデルタを比較する。

---

## トラブルシューティング

**MCPサーバーは起動するがクライアントにツールが表示されない**。

ターミナルで`rigor mcp`を手動で実行してハンドシェイクを送信します:

```sh
echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}' | rigor mcp
```

JSONレスポンスが返るはずです。何も返らないかシェルエラーが出る場合、`rigor`が`PATH`上にありません——まずインストールパスを修正してください（[Rigorのインストール](../01-installation/)を参照）。

**`rigor_check` / `rigor_triage`がエラーのあるプロジェクトで空の診断配列を返す**。

ツールはMCPサーバーが起動したワーキングディレクトリから`Configuration.discover`を使います。クライアントがホームまたは一時ディレクトリから`rigor mcp`を起動した場合、`.rigor.yml`が見つからず設定済みパスが空のセットにデフォルトします。対処法:

- 起動時に`--config=/path/to/project/.rigor.yml`を渡す:
  `"args": ["mcp", "--config=/path/to/project/.rigor.yml"]`
- またはツール呼び出しに絶対`paths`引数を渡す:
  `{ "name": "rigor_check", "arguments": { "paths": ["/path/to/project/lib"] } }`

**`rigor_type_of`が`isError: true`を報告する**。

ファイルパスはサーバープロセスから読み取り可能なオンディスクの正確なパスでなければなりません。相対パスはサーバーのワーキングディレクトリから解決されます。曖昧さを避けるためAIエージェントからは絶対パスを使ってください。

**最初の呼び出しは遅く、その後は速い**。

セッションの最初の呼び出しでRubyの`require`キャッシュのコールドブートが行われます;以降の呼び出しではロード済みエンジンコードを再利用します。期待されるウォームパスのレイテンシ:

| ツール | コールド（最初の呼び出し） | ウォーム（以降の呼び出し） |
|---|---|---|
| `rigor_explain` | < 200 ms | < 5 ms |
| `rigor_type_of` | ~1.5秒 | ~200 ms |
| `rigor_check`（小プロジェクト） | ~2秒 | ~500 ms |
| `rigor_triage`（小プロジェクト） | ~2秒 | ~700 ms |

コールドスタートはRBS環境構築が支配的です。事前の`rigor check`実行でウォームアップされた`.rigor/cache`で大幅に短縮されます。

## ステータスとロードマップ

`rigor mcp`はすべての7ツールとstdioトランスポートを伴うv0.2.0評価リリースで出荷されます。キューされたフォローアップは需要駆動です:

- **HTTPトランスポート**（スライス（slice）2） — CI / リモートエージェント向けの`--transport=http`;最小限のRackエンドポイント。
- **コール間環境キャッシュ**（スライス3） — コール間でウォームな`Environment` + `Cache::Store`をサーバー内に保持し、`mtime`ベースのチェックで無効化;同じプロジェクトへの繰り返し呼び出しのウォームパスレイテンシをほぼゼロに削減。
- **`rigor_check`バッファモード** — ファイルパスの代わりに（または加えて）インメモリのソースバッファを受け付ける;`--tmp-file` / `--instead-of`エディタモードフラグをミラー。AIエージェントがファイルの内容をインメモリで編集して書き込む前にチェックしたいときに有用。
- **`rigor_baseline_generate`（書き込み側、ゲート付き）** — 確認済みの書き込み権限を持つエージェント向けの明示的オプトインの書き込みツール。明確な需要シグナルが出るまで先送り。

キューされた機能のリクエストや問題の報告はGitHub issueを開いてください: MCPクライアント + バージョン、Rigorバージョン（`rigor version`）、問題を引き起こしたJSON-RPC交換を含めてください。
