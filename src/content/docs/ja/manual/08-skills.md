---
title: "提供スキル"
description: "rigortype/rigor docs/manual/08-skills.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/08-skills.md"
sourcePath: "docs/manual/08-skills.md"
sourceSha: "cfb61729dac5552ab58968dd6bec8417118c584e9c7814b4c96a67ccd91c1921"
sourceCommit: "212f2c491920cc5c39a12d75aee385cb6c51fa0c"
translationStatus: "translated"
sidebar:
  order: 9008
---

Rigorは一連の**エージェントスキル**をバンドルしています。AIコーディングエージェント（Claude Codeと互換ツール）があなたの代わりに実行できる構造化ワークフローです。[`skills/`](https://github.com/rigortype/rigor/tree/master/skills/)に格納されており、Rigorが利用可能なプロジェクト内でエージェントが作業するときに自動的に発見されます。

スキルはオプションです。スキルが行うことはすべて、このマニュアルのコマンドで手動で実行できます。スキルはワークフローをエンドツーエンドで進めるだけです。

## ここから始める: `rigor-next-steps`

`rigor-next-steps`は唯一のエントリポイントです。エージェントに手渡せば、`rigor`コマンドを解決し（不足していればインストールし）、未設定のプロジェクトをオンボードし、次に何をすべきかを`rigor skill describe`に尋ねて、以下の該当するスキルへルーティングします。これが進めるエンドツーエンドのワークフローが[`rigor-next-steps`によるプロジェクト改善の推進](../17-driving-improvement/)です。

どのスキルが必要か分からない場合は、まずこれから始めてください。

## カタログ

以下の各スキルは、`rigor-next-steps`が（`rigor skill describe`を介して）あなたをルーティングできる行き先です。

### オンボーディングと基盤

- **`rigor-project-init`**: コールドスタートからプロジェクトをオンボードします。スタック（Rails、RSpec、dry-rb、…）を検出し、対応する[プラグイン](../07-plugins/)を提案し、採用モード（既存コードベース向けの[ベースライン](../06-baseline/)（baseline）スナップショットまたはクリーンなコードベース向けのゼロ診断ゲート）を選択し、`.rigor.dist.yml`を書き出して最初のベースラインを生成します。初めてRigorをセットアップするときに使ってください。
- **`rigor-rbs-setup`**: gem向けのコミュニティRBSをインストール（`rbs collection install`）して、RBSのない依存関係が`Dynamic`として型付けされるのをやめさせます。Rigorは生成された`rbs_collection.lock.yaml`を自動検出します。
- **`rigor-plugin-tune`**: `Gemfile.lock`をバンドルされたプラグインカタログに再マッチングし、現在のスタック向けにプラグインを有効化します（`rigor plugins --strict`で検証）。gemを追加した後や、Railsプラグインがまだ有効化されていないRailsアプリで使ってください。

### 改善と削減

- **`rigor-protection-uplift`**: `rigor coverage --protection`が表面化させる型保護の穴を塞ぎます。まずsig-gen、次に最小限の手書きRBSの残余を、二重ゲート（サイトが保護される*かつ*`rigor check`が新たな診断を獲得しない）のもとで行います。[型保護カバレッジ](../15-type-protection-coverage/)を参照してください。
- **`rigor-baseline-reduce`**: 既存の`.rigor-baseline.yml`をルールごとに削減します。`rigor triage`で優先順位を付け、各サイトを実際のバグ／安全なスタイル上の発見／偽陽性として分類し、ベースラインを再生成します。バックログを少しずつ減らすために使ってください。
- **`rigor-monkeypatch-resolve`**: 実際にはプロジェクト自身のモンキーパッチである`undefined-method`のクラスタを、定義ファイルを`pre_eval:`に配線することで解決します。

### 統合と運用

- **`rigor-ci-setup`**: インラインのPR/MR診断（SARIF / GitHub Actions / GitLab Code Quality / reviewdog）とともにRigorをCIに配線します。[CIでRigorを実行する](../11-ci/)を参照してください。
- **`rigor-editor-setup`**: バンドルされた`rigor lsp`言語サーバーをエディタ（Neovim、VS Code、Helix、Emacs）に配線します。[エディタ統合](../09-editor-integration/)を参照してください。
- **`rigor-mcp-setup`**: バンドルされた`rigor mcp`サーバーをAIコーディングエージェント（Claude Code、Cursor、Cline、…）に配線します。[MCPサーバー](../10-mcp-server/)を参照してください。

### メンテナンスとオーサリング

- **`rigor-upgrade`**: 新しいRigorバージョンをクリーンに採用します。ベースラインとの差分を取り、本物の新規キャッチをsig品質の偽陽性から仕分けし、再生成します。
- **`rigor-doctor`**: セットアップが健全であること（設定が解決し、プラグインがロードされ、ベースラインが新鮮で、RBS環境が壊れていないこと）を検証します。[トラブルシューティング](../13-troubleshooting/)を参照してください。
- **`rigor-plugin-author`**: 自分のリポジトリに新しいRigorプラグインをスキャフォールドして、Rigorが推論できないアプリケーションDSLやメタプログラミングパターンについて教えます。バンドルされたプラグインがプロジェクトの依存するフレームワークやDSLをカバーしていないときに使ってください。

## CLIからスキルを発見する

これらのスキルは`rigortype` gemの内部に出荷されているので、Rigorが`mise` / `gem install`でプロジェクト側のソースチェックアウトなしにインストールされていても到達できます。`rigor skill`コマンドがそれらを表面化させます:

```sh
rigor skill describe        # probe the project + recommend the next skill (alias: rigor describe)
rigor skill --list            # name + absolute path for each bundled skill
rigor skill <name>    # print the SKILL.md body (with a references/ header)
rigor skill --path  <name>    # one-line absolute SKILL.md path, for a file-reading tool
```

`rigor skill describe`は`rigor-next-steps`が駆動するレコメンデーションエンジンです。`rigor skill rigor-project-init`は、リポジトリを指し示すことなくエージェントにオンボーディングワークフローを手渡す正規の方法です。`list` / `print` / `path`という動詞表記は非推奨です（v0.3.0で削除）。[CLIリファレンス](../02-cli-reference/#rigor-skill)を参照してください。

## スキルをプロジェクトにインストールする

gemに加えて、ユーザー向けのスキルは[vercel-labs/skills](https://github.com/vercel-labs/skills)経由でインストール可能です。Rigorをインストールする*前*にエントリポイントをプロジェクトに投入するのに便利です:

```sh
# Just the entry point (recommended):
npx skills add https://github.com/rigortype/rigor/tree/master/skills/rigor-next-steps
# Or the whole user-facing set:
npx skills add rigortype/rigor
```

（`.claude/skills/`配下の貢献者専用スキルは内部用としてマークされており、一括の`npx skills add`ではインストールされません。）

## スキルを実行する

エージェントスキルをサポートするエージェントでは、名前でスキルを呼び出します（Claude Codeでは`/rigor-next-steps`）。エージェントは（ソースチェックアウトの`skills/`から、またはそうでなければ`rigor skill <name>`を通じて）スキル定義を読み込み、それに従います。ツールがスキルをサポートしていない場合、各スキルの`SKILL.md`は自分でフォローできるプレーンなチェックリストとして読めます。
