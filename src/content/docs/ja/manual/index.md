---
title: "Rigorユーザーマニュアル"
description: "rigortype/rigor docs/manual/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/README.md"
sourcePath: "docs/manual/README.md"
sourceSha: "76a0fbdfff06ebd9f713e858b75ba0a6f418f0b88d003ba0b8d249a410ee5ad2"
sourceCommit: "51a679f3ccd12f5bee48c24150401d10e978efce"
translationStatus: "translated"
sidebar:
  order: 9000
---

Rigorのインストール、実行、設定、運用方法について説明します。[ハンドブック](../handbook/)が**型モデル**——Rigorが推論するキャリア（carrier）とその理由——を教えるのに対し、このマニュアルは**オペレーション**リファレンスです: コマンドライン、設定ファイル、診断カタログ、そして実際のプロジェクトへのRigor導入ワークフロー。

両者は補完的です。診断が何を**意味するか**を理解したいときはハンドブックを、フラグ・キー・コマンドを調べたいときはマニュアルを参照してください。

## 目次

### 入門

1. [Rigorのインストール](01-installation/) — `mise`、`asdf`、`gem install`、Nix、dev-containerのガイダンス。Rigorはツールであり、プロジェクトの依存関係ではありません。
17. [`rigor-next-steps`によるプロジェクト改善の推進](17-driving-improvement/) — 単一エントリポイントのループ: オンボーディング、Rigorが見つけたものの確認、型保護の引き上げ、CIでの保護——`rigor skill describe`が駆動します。
14. [Railsプロジェクトへのセットアップ — miseを使ったステップバイステップ](14-rails-quickstart/) — Ruby 4.0 + Rigorを`mise`でインストールし、Railsプラグインセットを有効化して`rigor check`を実行し、設定をチームで共有する——約10分で完了。

### リファレンス

2. [CLIコマンドリファレンス](02-cli-reference/) — すべてのサブコマンド（`check`、`annotate`、`type-of`、`sig-gen`、`baseline`、`triage`、`lsp`、…）、そのフラグと終了コード。
3. [設定](03-configuration/) — `.rigor.yml`キーリファレンス、設定ファイル探索、`includes:`による継承。
4. [診断](04-diagnostics/) — ルールIDカタログ、重要度プロファイル、`# rigor:disable`による抑制。
5. [推論型の検査](05-inspecting-types/) — `assert_type` / `dump_type`ソースヘルパーと`rigor annotate` / `rigor type-of`コマンド。
16. [RBS::Extendedアノテーション](16-rbs-extended-annotations/) — `*.rbs`ファイルに書く`%a{rigor:v1:…}`アノテーション: `return:` / `param:`オーバーライド、述語とアサーションのナローイング、`conforms-to`、そしてHKTディレクティブ。

### プロジェクトへのRigor導入

6. [ベースライン](06-baseline/)（baseline） — `.rigor-baseline.yml`、`rigor baseline`サブコマンド、`rigor triage`。
7. [プラグインの使い方](07-plugins/) — `plugins:`設定キーによるフレームワーク・gemプラグインの有効化。プラグインごとのユーザードキュメントは[プラグインリファレンス](plugins/)にあります。
8. [提供スキル](08-skills/) — `rigor-next-steps`ループが振り分ける付属エージェントスキル: オンボーディング、RBS / プラグインのセットアップ、保護の引き上げ、ベースライン削減、CI / エディタ / MCPの配線、プラグイン作成。
15. [型保護カバレッジ](15-type-protection-coverage/) — バグが*捕まる*かどうかを計測し、あなたの型とあなたのテストを1枚のセーフティネットに融合します（`rigor coverage --protection [--mutation --with-tests --include-dynamic]`）。

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
