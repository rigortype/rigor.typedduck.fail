---
title: "VSCode extension — first-party marketplace client for `rigor lsp`"
description: "Imported from rigortype/rigor docs/design/20260522-vscode-extension.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/design/20260522-vscode-extension.md"
sourcePath: "docs/design/20260522-vscode-extension.md"
sourceSha: "57945aa041e11bc586a5ab0246364e7c780b07c8a3d1d86c572fa6f846880aa4"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
translationStatus: "translated"
sidebar:
  order: 20265522
---

**ステータス:**ドラフト。まだスライスされていない。将来ADRが開かれた場合にのみそれによって置き換えられる。

Language Server（[`docs/design/20260517-language-server.md`](../20260517-language-server/)）はv0.1.6で着地し、`rigor lsp`サブコマンドとして`rigortype` gemにバンドルされている（[ADR-19](../../adr/19-language-server-packaging/)）。今日のVSCodeユーザーは、汎用LSPクライアントか手書きの最小限の拡張機能を通じてそれを配線するように案内されている — 現行の[`docs/manual/09-editor-integration.md`](../../manual/09-editor-integration/) §「VSCode」を参照。Neovimには文書化された`lspconfig`レシピがあり、Helixには`languages.toml`ブロックがあり、EmacsにはEglot / lsp-modeのスニペットがある。VSCode — Ruby人口の中で単独最大のエディタ — には「自分で書け」というプレースホルダがある。

このドキュメントは、マーケットプレイスに公開する**ファーストパーティのVSCode拡張機能**を設計する: ワンクリックインストール、設定UI、まともなサーバーディスカバリ、そしてステータスインジケータ。これはADR-19のgem側の決定に対する、エディタ側の対となるものである。

## 位置づけ — なぜこれはADR-19の問題ではないのか

ADR-19は*LSP gemのコード*がどこに置かれるかを決定したが、その支配的な論拠は内部APIの結合だった: LSPは`Analysis::Runner`、`Scope#type_of`、`Environment`、`BufferTable`などを直接読んでいるため、それを別のgemに分割するとそれらのサーフェスを公開せざるをえなくなる。

**その論拠はVSCode拡張機能には移転しない**。拡張機能は純粋なLSPクライアントである。それはstdio越しにJSON-RPCで`rigor lsp`と話し、RigorのRuby APIには*まったく*触れない。伏せるべき結合はなく、公開APIの誓約も賭けられていない。したがってTypeScriptアーティファクトのパッケージング問題は、それ自体の論点（発見可能性、ビルドツールチェーン、リリース頻度）で答えられ、このドキュメントに記録される。専用のADRはオプションである。もしマーケットプレイス公開のポリシーが後でADRの重みを必要とするなら、gemの論拠を再導出するのではなく、ADR-19にエディタアーティファクトのセクションを追記すればよい。

## 決定事項

- **配置: モノレポ、新しいトップレベルの`editors/vscode/`**。新しい`editors/`ツリーが`plugins/`、`examples/`、`skills/`に加わる。これにより拡張機能は`docs/lsp-integration.md`の隣でバージョン管理され、1つのリポジトリで発見可能となり、また`editors/`を将来のエディタアーティファクト（Zed拡張機能、Emacsパッケージ）のためにレイアウトを蒸し返すことなく予約する。却下したもの: `plugins/`（そのツリーは[`plugins/README.md`](https://github.com/rigortype/rigor/blob/main/plugins/README.md)に従えばRuby gemのプラグインカタログである — TypeScriptアーティファクトはそのカタログの前提を壊す）と、別個の`rigor-vscode`リポジトリ（結合がないにもかかわらず、ドキュメント / 拡張機能のリポジトリをまたいだ同期を強いる。結合がないのだから利点はない）。
- **言語: TypeScript**。 VSCode拡張機能の標準。
- **クライアントライブラリ: `vscode-languageclient`**（Microsoft）。LSPのライフサイクル、ケイパビリティ折衝、そして診断 / ホバー / 補完 / documentSymbol → VSCode UIの配管をラップする。拡張機能はサーバーを起動しクライアントを登録する。それ自体は言語機能を一切実装しない。
- **サーバートランスポート: stdio**。 LSPのv1で唯一のトランスポートに合わせる。
- **ビルド: `esbuild`バンドル＋パッケージングのための`@vscode/vsce`**。最小限のツールチェーン。`editors/vscode/`配下の`npm`スクリプト。
- **リリース頻度はgemとは独立している**。拡張機能は独自のsemverラインと独自の`CHANGELOG.md`を持つ。それはロックステップなバージョンではなく、互換性のある*最小*の`rigortype`バージョンを宣言する — LSPのワイヤサーフェスは安定したLSPであるため、拡張機能のUX変更（設定、ステータスバー）がgemのバンプを強いてはならず、アナライザの型正しさのリリースが拡張機能のバンプを強いてはならない。TypeScriptアーティファクトに適用された、ADR-19の可逆性 / 独立した頻度の論拠を反映している。
- **VS MarketplaceとOpen VSXの両方に公開する**。 Open VSXはVSCodium / Cursor / Gitpodをカバーする。両方の公開は手動かつ認可ゲート付きであり、gemに対する`rake release`と同じ規律である。
- **拡張機能はgemをバンドルしない**。ユーザーが`rigortype`をインストールする（Gemfileまたはグローバルgem）。拡張機能は薄いクライアントである。インストールされていないケースは穏当に処理される（§ サーバーディスカバリを参照）。

## アイデンティティ

- マーケットプレイスのパブリッシャー: Rigor組織のパブリッシャーID。
- 拡張機能ID: `rigor`。表示名: **「Rigor — Ruby type checker」**。
- カテゴリ: `Programming Languages`、`Linters`。
- キーワード: `ruby`、`rbs`、`type checking`、`static analysis`、`lsp`。

## 拡張機能がVSCodeユーザーに与えるもの

LSPがすでにアドバタイズしているものはすべて、`vscode-languageclient`が接続すれば自動的に有効になる — 拡張機能はこれらのために機能コードを一切書かない:

| LSPケイパビリティ | それが駆動するVSCode UI |
|---|---|
| `publishDiagnostics` | Problemsパネル＋インラインの波線、`source: "rigor"`、重大度マッピング済み、`code` = ルールID |
| `hover` | ホバーツールチップ（型を考慮したmarkdown） |
| `completion` | `.` / `::`の後のIntelliSense |
| `documentSymbol` | アウトラインビュー＋パンくず＋シンボル検索 |
| `didChangeWatchedFiles` | 設定 / ファイル保存による無効化（§ ファイルウォッチングを参照） |

拡張機能*自身*のサーフェスは、LSPがstdioサーバーの内側からは提供できない部分である: ディスカバリ、設定UI、ライフサイクルコマンド、ステータス。

## サーバーディスカバリ

拡張機能は`rigor`実行ファイルを見つけ出さなければならない。優先順位の連鎖、最初にマッチしたものが勝ち、ワークスペースフォルダごとに評価される:

1. **`rigor.server.path`設定** — 明示的な絶対パスまたはコマンド。非標準のインストール（asdfのshim、モノレポのサブディレクトリ、Dockerのラッパー）のための脱出ハッチ。
2. **Bundler** — `rigor.server.useBundler`がtrueに解決され、かつそのフォルダに`rigortype`を列挙した`Gemfile.lock`がある場合 → `bundle exec rigor lsp`。`useBundler`は`auto` / `always` / `never`のenumである。`auto`（デフォルト）は、`rigortype`に言及する`Gemfile.lock`が見つかった場合にかぎりtrueに解決される。ほとんどのRubyプロジェクトはGemfileにgemをピン留めするため、これが一般的なパスである。
3. **グローバルな`PATH`** — むき出しの`rigor lsp`。
4. **見つからなかった場合** — クラッシュしない。アクション可能な通知（「Rigor: `rigortype` gem not found in this workspace」）を、インストールドキュメントへリンクするボタン付きで表面化する。拡張機能はロードされたままになるため、ユーザーはGemfileを修正して`Rigor: Restart Server`を実行できる。

サーバーの作業ディレクトリ＝ワークスペースフォルダのルートであるため、`Configuration.discover`はCLIとまったく同じように`.rigor.yml` / `.rigor.dist.yml`をたどる。起動時に拡張機能は`rigor version`をプローブし（安価）、それが最小値より古ければ警告する — 正確な「gemが古すぎる」というメッセージは、不透明な起動失敗に勝る。

Windowsについての注記: `bundle exec`の解決には`bundle.bat` / `shell: true`の処理が必要である。LSP自身のWindowsパスエンコーディングのオープンクエスチョン（[`20260517-language-server.md`](../20260517-language-server/) §「Open questions」）は、ここで解決されるのではなく継承される。

## 設定のコントリビューション

`contributes.configuration`、すべて`rigor.`プレフィックスの下:

| 設定 | 型 | デフォルト | 効果 |
|---|---|---|---|
| `rigor.enable` | boolean | `true` | マスタースイッチ。`false`でクライアントを停止する |
| `rigor.server.path` | string | `""` | 明示的な実行ファイルのパス / コマンド |
| `rigor.server.useBundler` | enum `auto`/`always`/`never` | `auto` | Bundlerの解決ポリシー |
| `rigor.server.configPath` | string | `""` | `--config=PATH`として渡される |
| `rigor.server.logPath` | string | `""` | `--log=PATH`として渡される |
| `rigor.trace.server` | enum `off`/`messages`/`verbose` | `off` | 出力チャンネルへの標準的なLSPクライアントのワイヤトレース |

意味のあるところでは`resource`スコープにしてあるため、マルチルートワークスペースはフォルダごとにオーバーライドできる。

**再起動のセマンティクス**。 *プロセスの起動方法*を変える設定（`server.path`、`server.useBundler`、`server.configPath`、`server.logPath`）はクライアントの**再起動**を必要とする — それらは`workspace/didChangeConfiguration`のペイロードではない。拡張機能は自身の設定をウォッチし、影響を受けるクライアントを自動的に再起動する。LSP v1は`didChangeConfiguration`ペイロードを無視し、いずれにせよ`Configuration.discover`を再実行するため、プロジェクト設定のサーフェスはVSCode設定ではなくファイルウォッチングによって駆動される。

## ファイルウォッチング

`vscode-languageclient`は、サーバーがリクエストする`workspace/didChangeWatchedFiles`の動的登録を尊重する。拡張機能はさらに`**/.rigor.yml`、`**/.rigor.dist.yml`、`**/Gemfile.lock`に対して`synchronize.fileEvents`を設定するため、設定の編集とgemの変更がサーバーに届き、その`ProjectContext`を無効化する（LSP設計の §「Project context refresh」に従う）。バッファの編集は通常の`didChange`を通る — ウォッチャは不要である。

## アクティベーション

`activationEvents`:

- `onLanguage:ruby`
- `workspaceContains:**/.rigor.yml`
- `workspaceContains:**/.rigor.dist.yml`

`*`によるイーガーアクティベーションはなし — VSCodeの起動パフォーマンスガイダンス。Rigor設定を持つプロジェクトは最初のRubyファイルが開かれる前にサーバーをウォームアップする。設定を持たないプロジェクトは、Rubyに触れたときにのみアクティベートされる。

## コマンド

`contributes.commands`:

- `rigor.restartServer` — 言語クライアントを再起動する（gemのアップデート、Gemfileの変更、またはサーバーに影響する設定の編集の後）。
- `rigor.showOutputChannel` — 「Rigor」出力チャンネルを表示する。
- `rigor.showServerLog` — `server.logPath`が設定されている場合に`--log`ファイルを開く。

延期されたもの（§ スコープ外を参照）: `rigor.checkWorkspace`。

## ステータスバー

ステータスバーアイテムがクライアントの状態 — `starting` / `running` / `stopped` / `error` — を反映し、それをクリックすると出力チャンネルが開く。LSPはそれ以外では静かに動作するため、これが主要な「生きているか？」のアフォーダンスとなる。標準的な形状である（Sorbet / Steepの拡張機能も同じことをしている）。

## マルチルートワークスペース

LSP v1はシングルルートである（[`20260517-language-server.md`](../20260517-language-server/) §「Out of scope for v1」）。拡張機能はそれをVSCodeのマルチルートワークスペースと折り合わせるため、`.rigor.yml` / `.rigor.dist.yml` / `Gemfile`を含む**ワークスペースフォルダごとに1つの`LanguageClient`**を、それぞれそのフォルダをルートとして起動する。Rigor設定を持たないフォルダはクライアントを得ない。すべてのRigor設定済みフォルダの外にあるファイルは診断を得ない — 既知の制限として文書化されており、LSPが後でマルチルートサポートを得れば無償で解消される。

`documentSelector`: `{ scheme: 'file', language: 'ruby' }`。Untitledおよび非`file`バッファはサポートされない — アナライザはディスク上のプロジェクトルートを必要とする。

## 他のRubyツールとの共存

VSCodeユーザーはShopify Ruby LSP / Solargraph / Sorbetを日常的に並べて実行している。VSCodeは言語ごとに複数のサーバーを衝突なく多重化する。良き市民であり続けるため、Rigor拡張機能は:

- `contributes.languages` / `grammars`を**宣言しない** — 既存の`ruby`言語IDを消費するだけで、それを主張することは決してない（シンタックスハイライトはユーザーが選んだgrammar拡張機能のままになる）。
- フォーマッタを**登録しない**（LSP設計に従えばRuboCopの仕事である）。
- Problemsパネルでの視覚的な帰属のために、すべての診断の`source: "rigor"`に依存する。

READMEは、もう一つのRuby LSPも実行するユーザーのためにペアリングのセットアップを推奨する。

## v1のスコープ外

- **`rigor.checkWorkspace`** — プロジェクト全体の`rigor check`実行。LSPは単一ファイルのスコープである。プロジェクト全体の診断はエディタモードの「オプションB」フォローアップ（ROADMAP §「Editor / IDE integration」）に属する。LSPがワークスペース診断を公開すれば明示的なコマンドは冗長になる — それまで延期する。それより早く要求されるなら、コマンドではなく`contributes.tasks`のタスクとして出荷する。
- **バンドルされた`rigortype`** — gemはユーザーがインストールするものである。
- **テレメトリ** — なし。プライバシーのために明示的に述べておく。
- **デバッグアダプタ / テストランナー統合**。
- **スニペット、コードレンズ、インレイヒント** — 対応するLSPケイパビリティを待つ（すべてROADMAPにキューされている）。

## パッケージングとリリース

`editors/vscode/`の内容:

```
editors/vscode/
  package.json          extension manifest + contributes
  tsconfig.json
  esbuild.js            bundle script
  src/extension.ts      activate / deactivate, client wiring
  src/discovery.ts      server-discovery chain
  src/status.ts         status bar item
  .vscodeignore
  README.md             marketplace landing page
  CHANGELOG.md          extension's own semver line
  LICENSE
  icon.png
```

- ビルド: `npm run compile`（esbuild）。パッケージ: `npm run package`（`vsce package` → `.vsix`）。
- 公開: `vsce publish`（VS Marketplace）＋`ovsx publish`（Open VSX）。**手動かつ認可ゲート付き** — `bundle exec rake release`と同じルール。これをgemリリースのゲートと並べて`AGENTS.md`に記録する。
- CI: `editors/vscode/`にスコープされたGitHub Actionsジョブが`npm ci && npm run compile && npm run package`を実行し、破損を捕まえる。公開は手動のままである。
- 拡張機能のビルドは`make verify`に配線**されておらず**、NodeはFlakeのdevシェルに追加**されない** — Ruby貢献者にNodeツールチェーンを強いてはならない。`editors/vscode/`は独自の`npm`スクリプトを抱える。`AGENTS.md`がこの分離を文書化する。（ADR-19との対称性: あちらではCIのみのgemユーザーが依然として`language_server-protocol`の依存を負担する。こちらではRuby貢献者がNodeの依存を負担しない。）

## 互換性マトリクス

- VSCodeの`engines.vscode`: 最近の`^1.8x.0`をベースラインとする。
- `vscode-languageclient`: メジャーバージョンをピン留めする。
- 最小の`rigortype`: **v0.1.6**（`rigor lsp`を出荷した最初のリリース）。起動時の`rigor version`プローブがそれを強制する。
- 位置エンコーディング: LSPはVSCodeのデフォルトである`utf-16`をアドバタイズする — 折衝の問題はない。

## スライス

各スライスは独自のコミットで出荷される。LSP設計と同じ規律である。

1. **`editors/vscode/`のスキャフォールド** — `package.json`、`tsconfig`、`esbuild.js`、hello-worldの`activate`。LSPはまだなし。
2. **LanguageClientの配線** — stdio越しに`rigor lsp`を起動、`documentSelector`はruby。診断 / ホバー / 補完 / アウトラインが有効になる。最初のユーザーから見える成果。
3. **設定のコントリビューション** — 設定 → サーバー引数（`--config`、`--log`）。サーバー設定変更時の再起動。
4. **サーバーディスカバリの連鎖** — `path` / bundler-`auto` / グローバル＋アクション可能な「見つからない」通知＋`rigor version`プローブ。
5. **ステータスバーアイテム＋コマンド** — `restartServer`、`showOutputChannel`、`showServerLog`。
6. **マルチルート** — Rigor設定済みフォルダごとに1つのクライアント。
7. **ファイルウォッチング** — `.rigor.yml` / `Gemfile.lock`の同期。
8. **マーケットプレイスのメタデータ** — README、アイコン、カテゴリ、キーワード。Open VSXのマニフェスト。
9. **CIジョブ** — ビルド＋`vsce package`（公開なし）。
10. *（延期）* `rigor.checkWorkspace`タスク。新しいLSP機能を追跡するケイパビリティのフォローアップ。

スライス7の後、拡張機能は「マーケットプレイスからインストールし、キーストロークのように速い診断＋ホバー＋補完＋アウトラインを得る」体験について機能完成となる。スライス8〜9は公開のパスである。

## ドキュメントのフォロースルー

拡張機能が出荷されたら、[`docs/manual/09-editor-integration.md`](../../manual/09-editor-integration/) §「VSCode」を書き換える: 汎用クライアント / 手書き拡張機能のワークアラウンドを「マーケットプレイス（またはOpen VSX）から**Rigor**拡張機能をインストールする」に置き換え、手動配線のスニペットはサポート外のVSCodeフォークを使うユーザーのためのフォールバックとしてのみ残す。

## オープンクエスチョン

- **Open VSXの自動化** — 自動化された`ovsx publish`のためのトークン保管 / ローテーション。延期。v1は手動で公開する。
- **アイコン / ブランディングアセット** — 最初のマーケットプレイス提出の前に、実際にデザインされたアセットが必要である。
- **`rigor version`プローブの失敗モード** — 「gemが不在」を「gemは存在するが`lsp`サブコマンドが不在」（v0.1.6以前）と「OSによって起動がブロックされた」から区別する。v1は後者2つを1つのメッセージにまとめる。ユーザーを混乱させるなら精緻化する。
- **プレリリースチャンネル** — VS Marketplaceは`pre-release`フラグをサポートする。未リリースのLSPケイパビリティを追跡するためにそれを使うかどうかを決める。プレビューに値するLSP機能が出るまで延期する。
- **ワークスペーストラスト** — VSCodeの「制限モード」はワークスペースの実行ファイルの起動をブロックする。拡張機能は信頼されていないワークスペースを検出し、静かに失敗するのではなく明確な「Rigorを実行するためにこのワークスペースを信頼してください」というプロンプトを表示すべきである。
