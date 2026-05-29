---
title: "提供スキル"
description: "rigortype/rigor docs/manual/08-skills.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/08-skills.md"
sourcePath: "docs/manual/08-skills.md"
sourceSha: "5c336d2a0337986b44c194d16143eca8b0b7e3c61c6043e137c4c63eb8bdfb7f"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
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

## スキルを実行する

エージェントスキルをサポートするエージェントでは、名前でスキルを呼び出します（Claude Codeでは`/rigor-project-init`）。エージェントは`skills/`からスキル定義を読み込み、それに従います。ツールがスキルをサポートしていない場合、各スキルの`SKILL.md`は自分でフォローできるプレーンなチェックリストとして読めます。
