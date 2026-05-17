---
title: "Rigor LSP — エディタ統合"
description: "rigortype/rigor docs/lsp-integration.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/lsp-integration.md"
sourcePath: "docs/lsp-integration.md"
sourceSha: "08c3f6683a5c97f7caa60e7d6a80195d2217c4bd0860903da907e4ab5b0362f4"
sourceCommit: "dac915a9ee49b89e89774c34c518e8501275f6a3"
sourceDate: "2026-05-17T02:39:15+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

`rigor lsp`は`rigortype` gemにバンドルされたインプロセスの言語サーバーです。stdio経由で[言語サーバープロトコル](https://microsoft.github.io/language-server-protocol/)を話し、Rigorのアナライザーをライブのエディタ体験として公開します — 各キーストロークでの診断、hover-to-type、アウトラインビュー、型認識補完。

このページはエディタに配線するためのエントリーポイントです。設計 + 機能マトリックスは[`docs/design/20260517-language-server.md`](../design/20260517-language-server/)（v1）と[`docs/design/20260517-lsp-hover-completion.md`](../design/20260517-lsp-hover-completion/)（v2）にあります。パッケージング根拠は[`docs/adr/19-language-server-packaging.md`](../adr/19-language-server-packaging/)にあります。

## 機能の概要

| LSPメソッド | 動作 |
|---|---|
| `textDocument/publishDiagnostics` | 各`didChange`でプッシュ、200msデバウンス。深刻度 / ルール / ソースがRigorの診断分類に直接マップする。 |
| `textDocument/hover` | 型認識markdown。ノードクラスごとのディスパッチが、メソッド呼び出しのレシーバー型 + RBSシグネチャ、定数のFQN + シングルトン型 + 定義先パス、ローカルのナローイングされた型 + バインド先、`Refined` / `Difference`キャリアの正準リファインメント名（`non-empty-string`、…）を表面化する。 |
| `textDocument/completion` | `.`の後のメソッド補完（推論されたレシーバー型で駆動）、`::`の後の定数パス補完。複合レシーバー（Union → メソッドの交差、Tuple / HashShape → 祖先nominal、Refined → 基底nominal）が処理される。パースリカバリセンチネルが編集中の`obj.` / `Foo::`バッファを動作させる。 |
| `textDocument/documentSymbol` | Prism ASTからのアウトラインツリー: ネスト付きの`class` / `module` / `def`。 |
| `workspace/didChangeWatchedFiles` | セッションごとの`Environment` + `Cache::Store`キャッシュを無効化するため、保存されたファイルが再伝播する。 |
| `workspace/didChangeConfiguration` | 同上 — `.rigor.yml` / `Gemfile.lock`などを再読する。 |

## 前提条件

- Ruby `>= 4.0.0`（アナライザーと一致;`rigortype.gemspec`を参照）。
- プロジェクトの`Gemfile`に`rigortype`を追加:

  ```ruby
  group :development do
    gem "rigortype"
  end
  ```

- `bundle install`。

LSPサーバーは`bundle exec rigor lsp`として実行される。別個のgemなし、アドオン登録なし — `rigor check` / `rigor type-of`と同じバイナリ。

## CLI

```sh
rigor lsp [--transport=stdio] [--log=PATH] [--config=PATH]
```

- `--transport=stdio` — デフォルト;v1で受け入れられる唯一の値。TCP / Unixソケットトランスポートはキュー。
- `--log=PATH` — ワイヤログ + サーバーデバッグをファイルに配線する。これがないと、サーバー側のログはstderrに行く。
- `--config=PATH` — `rigor check --config=PATH`をミラーする。これがないと、`Configuration.discover`がプロジェクトルートから`.rigor.yml` / `.rigor.dist.yml`を歩く。

## エディタ配線

### Neovim — nvim-lspconfig

カスタムサーバーエントリを追加。`nvim-lspconfig`はまだRigor用のビルトインプリセットを出荷していないので、手動で登録する:

```lua
local configs = require('lspconfig.configs')
local lspconfig = require('lspconfig')

if not configs.rigor then
  configs.rigor = {
    default_config = {
      cmd = { 'bundle', 'exec', 'rigor', 'lsp' },
      filetypes = { 'ruby' },
      root_dir = lspconfig.util.root_pattern('.rigor.yml', '.rigor.dist.yml', 'Gemfile', '.git'),
      single_file_support = false,
    },
  }
end

lspconfig.rigor.setup({})
```

これを`init.lua`（または`lua/plugins/`下）に配置する。Neovimを再起動し、Rigor設定済みのプロジェクト内でRubyファイルを開く;保存時に診断が表示され、`K`経由でhoverが動作するはず。

### VSCode — 汎用LSPクライアント

まだファーストパーティのVSCode拡張機能はない。[`vscode-languageclient-generic`](https://marketplace.visualstudio.com/items?itemName=mads-hartmann.bash-ide-vscode-tooltips)のような汎用LSPクライアントラッパーを使うか、サーバーを登録する最小限の拡張機能を書く:

```ts
// extension.ts (minimal example)
import { workspace, ExtensionContext } from 'vscode';
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverOptions: ServerOptions = {
    command: 'bundle',
    args: ['exec', 'rigor', 'lsp'],
    transport: TransportKind.stdio,
  };
  client = new LanguageClient(
    'rigor',
    'Rigor Language Server',
    serverOptions,
    { documentSelector: [{ scheme: 'file', language: 'ruby' }] }
  );
  client.start();
}

export function deactivate() { return client?.stop(); }
```

プライベート拡張機能として公開するか、`--extensionDevelopmentPath`経由で実行する。コミュニティメンテナンスのマーケットプレース拡張機能が後で表面化するかもしれない;貢献歓迎。

### Helix

`~/.config/helix/languages.toml`に追加:

```toml
[language-server.rigor]
command = "bundle"
args = ["exec", "rigor", "lsp"]

[[language]]
name = "ruby"
language-servers = ["rigor"]
```

Helixはプロジェクトルートウォーク経由で`.rigor.yml`を自動検出する。Solargraph / ruby-lspも使う場合、`rigor`と並べてリストする — Helixは言語ごとに複数のサーバーを実行する。

### Emacs — Eglot

```elisp
(require 'eglot)
(add-to-list 'eglot-server-programs
             '(ruby-mode . ("bundle" "exec" "rigor" "lsp")))
;; Or for ruby-ts-mode (Emacs 30+):
(add-to-list 'eglot-server-programs
             '(ruby-ts-mode . ("bundle" "exec" "rigor" "lsp")))
```

Rubyバッファで`M-x eglot`してアタッチする。

### Emacs — lsp-mode

```elisp
(with-eval-after-load 'lsp-mode
  (lsp-register-client
   (make-lsp-client
    :new-connection (lsp-stdio-connection '("bundle" "exec" "rigor" "lsp"))
    :activation-fn (lsp-activate-on "ruby")
    :server-id 'rigor)))
```

## トラブルシューティング

**サーバーは起動するが診断が表示されない**。

- プロジェクトに`.rigor.yml`または`.rigor.dist.yml`があることを確認（またはLSPルートウォークが1つ見つける）。LSPは`Configuration.discover`を使う — `rigor check`と同じロジック。
- プラグインロードエラーまたはRBS env構築失敗についてLSPログ（`--log=/tmp/rigor-lsp.log`）を確認する。
- 同じプロジェクトルートから`rigor check <path>`を実行する;そこで動作するなら、LSPも動作するはず。`rigor check`が失敗するなら、まずそれを修正する。

**Completionポップアップが空**。

- Completionは既知の型を持つノードでのみ発火する。型が`Dynamic[Top]`に縮退するレシーバーは補完を生成しない。アナライザーがレシーバーに割り当てた型を見るために`rigor type-of <file>:<line>:<col>`を見る。
- 編集中のバッファサポートはベストエフォート。パースが失敗ANDカーソルが`.` / `::`の直後にない場合、v1 LSPは補完を返さない;より深いリカバリはキュー（ROADMAP §「エディタ / IDE統合」を参照）。

**Hoverがどこでも`untyped`を表示する**。

- アナライザーがプロジェクトのRBSをロードしていない。`.rigor.yml`に正しい`signature_paths:`と`libraries:`があることを確認する。LSPログで`RBS::DuplicatedDeclarationError`または類似を確認する。

**並行LSPセッションが競合する**。

- そうあるべきではない — LSPは読み取り専用`Cache::Store`を使うため、同じプロジェクトに対する複数のプロセスがディスク上のキャッシュで競合しない。破損を見たら、ログ付きでバグを報告する。

## パフォーマンス期待

LSP v1の設計ターゲットに従う（ウォームセッション、5Kファイルのプロジェクト、現代のラップトップ）:

- コールドスタート（`initialize` → 最初のpublish）: < 3秒。
- `didChange` → `publishDiagnostics`: p50 < 250ms、p95 < 500ms。
- `hover`: p95 < 100ms。
- `documentSymbol`: p95 < 50ms。
- 定常状態メモリ: < 600 MB。

コールドスタートはRBS環境構築が支配的;ウォームスタート（`rigor check`でウォーム化された`.rigor/cache`）は1.5秒未満で着地する。

## ステータス + ロードマップ

LSP v1 + v2はv0.1.6で着地（`master`に蓄積中）。キューされたフォローアップ（`textDocument/signatureHelp`、hash-key補完、`textDocument/definition`、インクリメンタル`didChange`同期、Ractorプールディスパッチ、codeAction / rename / semanticTokens / inlayHint）は需要駆動;現在のキューについてはROADMAP §「エディタ / IDE統合」を参照。

キューされた機能をリクエストするかLSP問題を報告するには、次の情報でGitHub issueを開く: エディタ + バージョン、Rigorバージョン（`rigor version`）、LSPログ（`--log=PATH`）、最小限の再現。
