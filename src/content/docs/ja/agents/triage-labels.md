---
title: "トリアージラベル"
description: "rigortype/rigor docs/agents/triage-labels.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/triage-labels.md"
sourcePath: "docs/agents/triage-labels.md"
sourceSha: "97b193a01096e5d6c7a54e27bd37249f513ae3e97fa7f30db57373adb06a4a73"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
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
