---
title: "トリアージラベル"
description: "rigortype/rigor docs/agents/triage-labels.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/triage-labels.md"
sourcePath: "docs/agents/triage-labels.md"
sourceSha: "453fe1242b659756565fb7e2314eb598a305da04d5b88ff93358fa6c19e00295"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
translationStatus: "translated"
sidebar:
  order: 9050
---

エンジニアリングスキルは、5つの正典的なトリアージロールで語る。このリポジトリはデフォルトの文字列をそのまま使う:

| ロール | このトラッカーでのラベル | 意味 |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | メンテナーがこのissueを評価する必要がある |
| `needs-info` | `needs-info` | 報告者からのさらなる情報を待っている |
| `ready-for-agent` | `ready-for-agent` | 完全に仕様化されている —— AFKエージェントが人間のコンテキストなしで着手できる（名指しされたファイル、ゲート、基準） |
| `ready-for-human` | `ready-for-human` | 実装の前に人間の判断または決定を要する |
| `wontfix` | `wontfix` | 対応しない |

トリアージロールと並んで、すべてのバックログissueはちょうど1つの**エリアラベル**を持つ:

`area:engine` · `area:plugins` · `area:perf` · `area:sig-gen` · `area:editor` · `area:docs` ·
`area:playground` · `area:self-testing` · `area:release`

`ready-for-agent`の基準はADR-43の形だ: issueが注入ポイント、制約のエンベロープ、そしてそれが完了したと証明するゲートを名指しする。迷ったら`ready-for-human`にすること。

## 既知の制限

`known-limitation`は、ある変更が意図的に着地させ、将来の課題として残す制限を示す: あえて見送った健全性や精度、あるいは拘束力のある仕様（`docs/type-specification/`、`docs/internal-spec/`）が未対応として記録している形状である。これは文書化された契約の一部であって未修正の欠陥ではないという点で、通常の`bug`とは区別される: 誰も残すと決めていない偽陽性の報告は`bug`だ。これは1つのトリアージラベルと1つのエリアラベルに加えて付与するものであり、それらの代わりに付けるものではない。

変更が意図的なトレードオフ（真陽性を失う保守的な下限、バジェット削減、過剰近似された解決集合）を着地させる場合、または追従しないと文書化した形状のまま出荷される場合に起票する。オープン中のissueがその形状をすでに追跡している場合は、重複して起票する代わりにそのissueにラベルを付け、以下の項目を含むコメントを追加する。決して解消されない制限はこのラベルの対象ではない: 仕様にその旨を明記するか、issueを`wontfix`としてクローズすること。制限が解消されたらissueをクローズする。

本文（またはラベル付けされた既存issueの場合はコメント）には以下を記載する:

- **Kind** — どちらの方向に誤るか: 正しいコードに残る偽陽性（健全性）、偽陽性の安全性のために引き換えにした精度（失われた真陽性）、またはその他の制限（ツール、パフォーマンス）。
- **Why** — それを余儀なくさせた制約。判断を下したPRへのリンクを添える。`approval-queue.d/`のエントリーは批准されると削除されるため、PRと併記する場合にのみ引用する。
- **Cost** — 測定または再現された影響と、最小限の例。
- **Revisit when** — それを解消する変更と、完了を証明するもの。

一覧表示するには`gh issue list --label known-limitation --state all`を使う。
