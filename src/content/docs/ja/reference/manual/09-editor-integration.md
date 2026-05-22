---
title: "Rigor LSP — エディター統合"
description: "rigortype/rigor docs/manual/09-editor-integration.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/manual/09-editor-integration.md"
sourcePath: "docs/manual/09-editor-integration.md"
sourceSha: "0ca0557371a91e241d92ab2798a466d06f3d7c5c5a1c76c3084e48713dc9a38b"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
translationStatus: "translated"
sidebar:
  order: 9009
---

`rigor lsp`は`rigortype` gemにバンドルされたインプロセスランゲージサーバーです。stdioで[Language Server Protocol](https://microsoft.github.io/language-server-protocol/)を話し、Rigorのアナライザーをライブエディタ体験として公開します——キーストロークごとの診断、ホバーで型表示、アウトラインビュー、型認識補完。

このページはエディタに組み込むためのエントリーポイントです。設計と機能マトリックスは[`docs/design/20260517-language-server.md`](../../design/20260517-language-server/)（v1）と[`docs/design/20260517-lsp-hover-completion.md`](../../design/20260517-lsp-hover-completion/)（v2）にあります。パッケージング根拠は[`docs/adr/19-language-server-packaging.md`](../../adr/19-language-server-packaging/)にあります。

## 機能一覧

| LSPメソッド | 動作 |
|---|---|
| `textDocument/publishDiagnostics` | `didChange`のたびにプッシュ、200msデバウンス。重要度 / ルール / ソースはRigorの診断分類に直接対応。 |
| `textDocument/hover` | 型認識Markdown。ノードクラスごとのディスパッチで、メソッド呼び出しはレシーバー型+RBSシグネチャ、定数はFQN+シングルトン型+定義パス、ローカルはナローイングされた型+バインド位置、`Refined` / `Difference`キャリアには正規リファインメント名（`non-empty-string`、…）を表示。 |
| `textDocument/completion` | `.`の後のメソッド補完（推論レシーバー型で動作）、`::`の後の定数パス補完。複合レシーバー（Union → メソッドの積集合、Tuple / HashShape → 祖先名前的、Refined → 基底名前的）を処理。パースリカバリーセンチネルにより、編集中の`obj.` / `Foo::バッファが動作する。 |
| `textDocument/documentSymbol` | Prism ASTからのアウトラインツリー: ネストを含む`class` / `module` / `def`。 |
| `workspace/didChangeWatchedFiles` | セッションごとの`Environment` + `Cache::Store`キャッシュを無効化し、保存済みファイルが再伝播するようにする。 |
| `workspace/didChangeConfiguration` | 同様——`.rigor.yml` / `Gemfile.lock`等を再読み込みする。 |

## 前提条件

前提条件は**`rigor`が`PATH`上にある**ことだけです——`rigor check`と`rigor type-of`がすでに使っている同じ実行ファイルです。[Rigorのインストール](../01-installation/)のインストールチャンネルのいずれでも提供されます。`mise`が推奨です——そのshimがシェル環境を継承しないGUI起動エディタに`rigor`を利用可能にするからです。

`rigortype`をプロジェクトの`Gemfile`に追加**しないでください**。Rigorはツールであり、ライブラリではありません——スタンドアロンでインストールすることでRubyバージョンと依存関係がアプリケーションの解決から切り離されます。[Rigorのインストール § 推奨 — ランタイムバージョンマネージャ](../01-installation/#recommended--a-runtime-version-manager)を参照してください。

LSPサーバーは`rigor lsp`として実行されます。別途gemは不要、アドオン登録も不要——`rigor check` / `rigor type-of`と同じバイナリです。

## CLI

```sh
rigor lsp [--transport=stdio] [--log=PATH] [--config=PATH]
```

- `--transport=stdio` — デフォルト。v1で受け付ける唯一の値。TCP / Unixソケットトランスポートはキュー待ち。
- `--log=PATH` — ワイヤーログ + サーバーデバッグをファイルに書き出す。指定しない場合、サーバー側のログはstderrに出力される。
- `--config=PATH` — `rigor check --config=PATH`のミラー。指定しない場合、`Configuration.discover`がプロジェクトルートから`.rigor.yml` / `.rigor.dist.yml`を探索する。

## エディタへの組み込み

以下のスニペットはすべて`rigor lsp`を直接呼び出します。`rigor`がエディタの`PATH`上にある（`mise` shimパス、`asdf` shim、またはインストールチャンネルが設定したもの——[Rigorのインストール](../01-installation/)を参照）と同時に機能します。

プロジェクトの`Gemfile`に`rigortype`を追加した古いプロジェクトローカルインストールを使用している場合は、`rigor lsp`を`bundle exec rigor lsp`に置き換えてください（エディタが必要とする`cwd` / `BUNDLE_GEMFILE`も追加します）。これはレガシーフォールバックです。新しいインストールでは必要ありません。

### Neovim — nvim-lspconfig

カスタムサーバーエントリを追加します。`nvim-lspconfig`にはまだRigor用の組み込みプリセットがないため、手動で登録します:

```lua
local configs = require('lspconfig.configs')
local lspconfig = require('lspconfig')

if not configs.rigor then
  configs.rigor = {
    default_config = {
      cmd = { 'rigor', 'lsp' },
      filetypes = { 'ruby' },
      root_dir = lspconfig.util.root_pattern('.rigor.yml', '.rigor.dist.yml', 'Gemfile', '.git'),
      single_file_support = false,
    },
  }
end

lspconfig.rigor.setup({})
```

これを`init.lua`（または`lua/plugins/`配下）に記述します。Neovimを再起動してRigor設定済みプロジェクト内のRubyファイルを開くと、保存時に診断が表示され、`K`でホバーが機能するはずです。プロジェクトの`Gemfile`に`rigortype`を追加した古いインストールを使用している場合は、`cmd = { 'bundle', 'exec', 'rigor', 'lsp' }`に設定します。

### VS Code — 汎用LSPクライアント

まだ公式のVS Code拡張機能はありません。次のような汎用LSPクライアントラッパーを使用するか:
[`vscode-languageclient-generic`](https://marketplace.visualstudio.com/items?itemName=mads-hartmann.bash-ide-vscode-tooltips)
またはサーバーを登録する最小限の拡張機能を作成します:

```ts
// extension.ts (minimal example)
import { workspace, ExtensionContext } from 'vscode';
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverOptions: ServerOptions = {
    command: 'rigor',
    args: ['lsp'],
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

プロジェクトの`Gemfile`に`rigortype`を追加した古いインストールを使用している場合は、`command: 'bundle', args: ['exec', 'rigor', 'lsp']`に設定します。

プライベート拡張機能として公開するか、`--extensionDevelopmentPath`で実行します。コミュニティが維持するマーケットプレイス拡張機能が後で登場するかもしれません。コントリビューション歓迎です。

### Helix

`~/.config/helix/languages.toml`に追加します:

```toml
[language-server.rigor]
command = "rigor"
args = ["lsp"]

[[language]]
name = "ruby"
language-servers = ["rigor"]
```

Helixはプロジェクトルート走査を通じて`.rigor.yml`を自動検出します。Solargraph / ruby-lspも使用している場合は、`rigor`と並べて列挙します——Helixは言語ごとに複数のサーバーを実行します。プロジェクトの`Gemfile`に`rigortype`を追加した古いインストールを使用している場合は、`command = "bundle"`と`args = ["exec", "rigor", "lsp"]`を使用します。

### Emacs — Eglot

```elisp
(require 'eglot)
(add-to-list 'eglot-server-programs
             '(ruby-mode . ("rigor" "lsp")))
;; ruby-ts-mode（Emacs 30+）の場合:
(add-to-list 'eglot-server-programs
             '(ruby-ts-mode . ("rigor" "lsp")))
```

Rubyバッファでアタッチするには`M-x eglot`を実行します。プロジェクトの`Gemfile`に`rigortype`を追加した古いインストールを使用している場合は、`("rigor" "lsp")`を`("bundle" "exec" "rigor" "lsp")`に置き換えます。

### Emacs — lsp-mode

```elisp
(with-eval-after-load 'lsp-mode
  (lsp-register-client
   (make-lsp-client
    :new-connection (lsp-stdio-connection '("rigor" "lsp"))
    :activation-fn (lsp-activate-on "ruby")
    :server-id 'rigor)))
```

プロジェクトの`Gemfile`に`rigortype`を追加した古いインストールを使用している場合は、接続リストを`'("bundle" "exec" "rigor" "lsp")`に変更します。

## トラブルシューティング

**サーバーは起動するが診断が表示されない**。

- プロジェクトに`.rigor.yml`または`.rigor.dist.yml`があること（またはLSPルート走査がそれを見つけること）を確認します。LSPは`Configuration.discover`を使います——`rigor check`と同じロジックです。
- LSPログ（`--log=/tmp/rigor-lsp.log`）でプラグイン読み込みエラーまたはRBS環境ビルドの失敗を確認します。
- 同じプロジェクトルートから`rigor check <path>`を実行します。そこで機能すれば、LSPも機能するはずです。`rigor check`が失敗する場合は、まずそちらを修正してください。

**補完ポップアップが空**。

- 補完は型がわかっているノードでのみ発火します。型が`Dynamic[Top]`に折りたたまれるレシーバーでは補完が生成されません。`rigor type-of <file>:<line>:<col>`でアナライザーがレシーバーに何の型を割り当てているかを確認します。
- 編集中のバッファサポートはベストエフォートです。パースが失敗し、かつカーソルが`.` / `::`の直後にない場合、v1 LSPは補完を返しません。より深いリカバリーはキュー待ちです（ROADMAPの「Editor / IDE integration」セクションを参照）。

**ホバーが`untyped`ばかり表示される**。

- アナライザーがプロジェクトのRBSを読み込んでいません。`.rigor.yml`に正しい`signature_paths:`と`libraries:`があることを確認します。LSPログで`RBS::DuplicatedDeclarationError`などを確認します。

**複数のLSPセッションが競合する**。

- そうなるべきではありません——LSPは読み取り専用の`Cache::Store`を使用しており、同じプロジェクトに対する複数のプロセスがオンディスクキャッシュで競合しません。破損が見られる場合は、ログを添えてバグを報告してください。

## パフォーマンス指標

LSP v1の設計ターゲット（ウォームセッション、5Kファイルプロジェクト、現行ラップトップ）:

- コールドスタート（`initialize` → 最初のプッシュ）: 3秒未満。
- `didChange` → `publishDiagnostics`: p50 < 250ms、p95 < 500ms。
- `hover`: p95 < 100ms。
- `documentSymbol`: p95 < 50ms。
- メモリ定常状態: 600 MB未満。

コールドスタートはRBS環境ビルドが支配的です。ウォームスタート（`rigor check`でウォームされた`.rigor/cache`）は1.5秒未満です。

## ステータス + ロードマップ

LSP v1 + v2はv0.1.6で提供されます（`master`に蓄積中）。キュー待ちのフォローアップ（`textDocument/signatureHelp`、ハッシュキー補完、`textDocument/definition`、インクリメンタル`didChange`同期、Ractorプールディスパッチ、codeAction / rename / semanticTokens / inlayHint）は需要駆動です。現在のキューはROADMAPの「Editor / IDE integration」セクションを参照してください。

キュー待ちの機能をリクエストするかLSPの問題を報告するには、次の情報を添えてGitHub issueを開いてください: エディタ + バージョン、Rigorバージョン（`rigor version`）、LSPログ（`--log=PATH`）、最小限の再現手順。
