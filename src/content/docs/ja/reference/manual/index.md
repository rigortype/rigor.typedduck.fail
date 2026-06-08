---
title: "Rigorユーザーマニュアル"
description: "rigortype/rigor docs/manual/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/README.md"
sourcePath: "docs/manual/README.md"
sourceSha: "f715a080e133e79b88c1b2837e2cbd762a4f31de35de5f27ef1e8f1bbbc57cab"
sourceCommit: "c64342708cd0effeb20265e84fe912ae22635159"
translationStatus: "translated"
sidebar:
  order: 9000
---

Rigorのインストール、実行、設定、運用方法について説明します。[ハンドブック](../handbook/)が**型モデル**——Rigorが推論するキャリア（carrier）とその理由——を教えるのに対し、このマニュアルは**オペレーション**リファレンスです: コマンドライン、設定ファイル、診断カタログ、そして実際のプロジェクトへのRigor導入ワークフロー。

両者は補完的です。診断が何を**意味するか**を理解したいときはハンドブックを、フラグ・キー・コマンドを調べたいときはマニュアルを参照してください。

## 目次

### 入門

1. [Rigorのインストール](01-installation/) — `mise`、`asdf`、`gem install`、Nix、dev-containerのガイダンス。Rigorはツールであり、プロジェクトの依存関係ではありません。
14. [Railsプロジェクトへのセットアップ — miseを使ったステップバイステップ](14-rails-quickstart/) — Ruby 4.0 + Rigorを`mise`でインストールし、Railsプラグインセットを有効化して`rigor check`を実行し、設定をチームで共有する——約10分で完了。

### リファレンス

2. [CLIコマンドリファレンス](02-cli-reference/) — すべてのサブコマンド（`check`、`annotate`、`type-of`、`sig-gen`、`baseline`、`triage`、`lsp`、…）、そのフラグと終了コード。
3. [設定](03-configuration/) — `.rigor.yml`キーリファレンス、設定ファイル探索、`includes:`による継承。
4. [診断](04-diagnostics/) — ルールIDカタログ、重要度プロファイル、`# rigor:disable`による抑制。
5. [推論型の検査](05-inspecting-types/) — `assert_type` / `dump_type`ソースヘルパーと`rigor annotate` / `rigor type-of`コマンド。

### プロジェクトへのRigor導入

6. [ベースライン](06-baseline/)（baseline） — `.rigor-baseline.yml`、`rigor baseline`サブコマンド、`rigor triage`。
7. [プラグインの使い方](07-plugins/) — `plugins:`設定キーによるフレームワーク・gemプラグインの有効化。プラグインごとのユーザードキュメントは[プラグインリファレンス](plugins/)にあります。
8. [提供スキル](08-skills/) — オンボーディングとベースライン削減のための付属エージェントスキル。

### 統合と運用

9. [エディタ統合](09-editor-integration/) — `rigor lsp`をNeovim、VS Code、Helix、Emacsに組み込む方法。
10. [MCPサーバー](10-mcp-server/) — `rigor mcp`によるAIコーディングエージェント（Claude Code、Cursor、Cline …）へのRigorの解析ツール公開。
11. [CIでのRigor実行](11-ci/) — 独立したCIジョブ、インラインのPR/MR診断（SARIF / GitHub Actions / GitLab Code Quality）、コピー＆ペースト用[テンプレート](ci-templates/)、バージョンのピン留め。
12. [キャッシュ](12-caching/) — キャッシュの場所、無効化の条件、削除方法。
13. [トラブルシューティング](13-troubleshooting/) — よくある問題とその解決策。

## 関連ドキュメント

- [Rigorハンドブック](../handbook/) — 型モデルの解説。
- [`docs/types.md`](../types/) — 型システムの1ページガイド。
- [`docs/type-specification/`](../type-specification/) — 規範的な仕様コーパス。
- [`docs/adr/`](../adr/) — アーキテクチャ決定記録（ADR）。
