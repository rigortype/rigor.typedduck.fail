---
title: "提供スキル"
description: "rigortype/rigor docs/manual/08-skills.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/08-skills.md"
sourcePath: "docs/manual/08-skills.md"
sourceSha: "d9b0e2af3ff9f34b32f2241ff12594cff39b6f84fbb15fc341d431089ef66561"
sourceCommit: "db8d01bf94926a72e6a2aaf15639d1591b7e142e"
translationStatus: "translated"
sidebar:
  order: 9008
---

Rigorは一連の**エージェントスキル**をバンドルしています——AIコーディングエージェント（Claude Codeと互換ツール）があなたの代わりに実行できる構造化ワークフローです。`skills/`に格納されており、Rigorが利用可能なプロジェクト内でエージェントが作業するときに自動的に発見されます。

スキルはオプションです。スキルが行うことはすべて、このマニュアルのコマンドで手動で実行できます。スキルはワークフローをエンドツーエンドで進めるだけです。

## `rigor-project-init`

コールドスタートからプロジェクトをRigorにオンボードします。スタック（Rails、RSpec、dry-rb、…）を検出し、対応する[プラグイン](../07-plugins/)を提案し、採用モード——既存コードベース向けの[ベースライン](../06-baseline/)（baseline）スナップショットまたはクリーンなコードベース向けのゼロ診断ゲート——を選択し、`.rigor.dist.yml`を書き出して最初のベースラインを生成します。

プロジェクトに初めてRigorをセットアップするときに使ってください。

## `rigor-baseline-reduce`

既存の`.rigor-baseline.yml`をルールごとに削減します。`rigor triage`で優先順位を付け、各診断についてそのサイトを実際のバグ、安全なスタイル上の発見、または偽陽性として分類し——修正、`# rigor:disable`、またはRigor側のリグレッションspecを提供し——最後にベースラインを再生成します。

プロジェクトがすでにRigorを実行していて、バックログを少しずつ減らしたいときに使ってください。

## `rigor-plugin-author`

自分のリポジトリに新しいRigorプラグインをスキャフォールドします——スタンドアロンgemまたはプロジェクトプライベートプラグイン——推論できないアプリケーションDSLやメタプログラミングパターンについてRigorに教えます。gemspec、プラグインクラス、ASTウォーカー、型の貢献、テストをカバーします。

バンドルされたプラグインがプロジェクトが依存するフレームワークやDSLをカバーしていないときに使ってください。

## CLIからスキルを発見する

上記の3つのスキルは`rigortype` gemの内部に出荷されているので、Rigorが`mise` / `gem install`でプロジェクト側のソースチェックアウトなしにインストールされていても到達できます。`rigor skill`コマンドがそれらを表面化させます:

```sh
rigor skill list            # バンドルされた各スキルの名前 + 絶対パス
rigor skill print <name>    # SKILL.md本体を出力（references/ヘッダー付き）
rigor skill path  <name>    # 1行の絶対SKILL.mdパス。ファイル読み取りツール向け
```

`rigor skill print rigor-project-init`は、リポジトリを指し示すことなくAIエージェントにオンボーディングワークフローを手渡す正規の方法です。[CLIリファレンス](../02-cli-reference/#rigor-skill)を参照してください。

## スキルを実行する

エージェントスキルをサポートするエージェントでは、名前でスキルを呼び出します（Claude Codeでは`/rigor-project-init`）。エージェントは（ソースチェックアウトの`skills/`から、またはそうでなければ`rigor skill print <name>`を通じて）スキル定義を読み込み、それに従います。ツールがスキルをサポートしていない場合、各スキルの`SKILL.md`は自分でフォローできるプレーンなチェックリストとして読めます。
