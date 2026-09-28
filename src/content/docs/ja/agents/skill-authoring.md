---
title: "このリポジトリでスキルを執筆する"
description: "rigortype/rigor docs/agents/skill-authoring.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/skill-authoring.md"
sourcePath: "docs/agents/skill-authoring.md"
sourceSha: "dfcbd8ad435dd46e03a549522720cff7fce9fe1bdb2d3692037a6b18bb8045f1"
sourceCommit: "e12ab45fa55707ed2acc0eae2e273b99a72dc077"
sourceDate: "2026-09-28T02:29:29+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

2つのツリー、2つの読者層。各`SKILL.md`の`description:`がルーティングを担うサーフェスです; トリガーの2つ目のカタログを管理してはなりません。

- [`.claude/skills/`](https://github.com/rigortype/rigor/tree/master/.claude/skills/)は貢献者向けのワークフローを含みます。このリポジトリの`Makefile`とレイアウトを前提とし、`metadata.internal: true`を持ちます。
- [`skills/`](https://github.com/rigortype/rigor/tree/master/skills/)はユーザー向けのワークフローを含みます。公開の`rigor` CLIのみを使用し、`make`ターゲット、リポジトリパス、Flakeコマンドは使用しません。2つのツリーは異なる読者にサービスを提供しながら同じ名前を共有することがあります。

サードパーティのプラグイン作者はモノレポの外へルーティングされます ── `rigor-plugin-author` Phase 0.5および[ADR-31](../../adr/31-contribution-and-supply-chain-policy/) WD2/WD4を参照してください。

## Description（説明）

メタデータだけでルーティングできる程度に説明を短く保ちます: アクション、それをトリガーする具体的なイベントまたは成果物、そして別の場所へルーティングする非自明な境界のみを記述します。例のカタログ、実装の詳細、または厳密なフラグよりも、1〜2文を好みます。トリガーはそのスキルが所有するタスクの名前を挙げるべきであり、その周辺にあるすべてのタスクではありません; アンチトリガーは、2つのスキルが一致する可能性がある場合に有用です。

説明をミニ手順ではなくポインタとして扱います。厳密なコマンド、バージョンに結合された値、長い例、およびブランチ固有のステップは、本文または条件付きの`references/`ファイルに配置します。本文は安定したワークフロースパイン（spine）であるべきです: 目標、フェーズ、決定ポイント、および観測可能な完了基準です。スキルに複数のブランチがある場合は、すべてのブランチを読み込むのではなく、関連するリファレンスへルーティングします。

## `waza`レビュー

スキルに対する変更は、[`contribution-flow.md`](contribution-flow.md) §「プルリクエストのマージ」にある敵対的レビュー（adversarial review）に加えて、`waza`レビューを経た後にのみ出荷されます。エージェントレビュアーはリポジトリに対して変更を読み込み、`waza`はエージェントが従うルーティングおよび指示サーフェスとしてスキルを読み込みます。したがってスキルに対するいかなる変更もPRが必要です。ローカルでの`waza check`を経た後、タイポ級の修正（スペルミス、壊れたリンク先）のみが`master`に直接進むことができます。スキルの削除には`waza`の実行は不要です。

どちらのスキルツリーであっても、何が変更されたかに応じて実行するコマンドが異なります:

| 変更内容 | 実行するコマンド |
| --- | --- |
| `SKILL.md` | `waza check <skill-path>` および `waza quality <skill-path> --model <judge>` |
| `references/`、`scripts/`、または`evals/`のみ | `waza check <skill-path>`。`waza quality`は`SKILL.md`のみを読み込むため、PRが触れていないテキストを採点してしまいます; 敵対的レビューが内容を担います。 |

多くのスキルにまたがる機械的なスイープでは、各スキルで`waza check`を実行し、PRコメントで指定された代表的な1つのスキルで`waza quality`を実行します。スイープが機械的であると言えるのは、`description:`や指示の文言（パス、リンク、フォーマット）を変更しない場合のみです。説明や指示を書き直すスイープでは、変更されたすべての`SKILL.md`で`waza quality`を実行します。

`waza quality`にはGitHub Copilotのログインと、Flakeのwaza 0.38.7以降が必要です; waza 0.31.0はすべてのjudgeに対して`parsing judge response: no JSON found`を返します。`waza models`がリストする応答可能な最も強力なjudgeを選択してください。指定したjudgeがCopilot側で失敗する場合（`--debug`の下で`model.call_failure`）、`--model auto`にフォールバックし、どのjudgeが実行されたかを記録してください。judgeは非決定論的であり、同じテキストに対して実行ごとに異なる採点を行うため、数値ではなくフィードバックを読んでください。

出力を敵対的レビューの所見とともにトリアージします:

- `waza check`の2つのセクションのみが拘束力を持ちます: 「Spec Compliance」と「Links」です。そこでの失敗は欠陥です; 修正してください。Compliance Score、Token Budget、Advisory Checksの下の❌行、および総合判定は公開プロファイルのアドバイザリーであり、次のルールに従います。ネットワーク不足のために失敗するリンクチェックは「`waza`を実行できない」ことであり、欠陥ではありません。
- `waza quality`の出力はアドバイザリーであり、それ単体で深刻（severe）になることは決してありません。agentskills.ioの公開プロファイルとは無関係に実際の欠陥を特定している場合にのみ項目を採用してください; Rigorの包括的なワークフローは、そのトークン予算やラベルのために再形成する必要はありません。また`references/`に保持された詳細に対する完全性スコアの低さは、このガイドが求める漸進的開示（progressive disclosure）そのものです。敵対的レビュアーは項目を深刻へ昇格させることができます。恒久的なキャリブレーションについては[ADR-81](../../adr/81-skill-set-optimization/)を参照してください。
- 修正ラウンド後の`waza`の再実行はそのラウンドの差分レビューの一部であり、独立したラウンドではなく、それ自体でラウンドを開始することは決してありません。

採点されたコミット、judge、スコア、および採用または却下した内容を、理由とともにPRコメントとして投稿してください。`waza`が実行できない場合（未インストール、古すぎる、Copilotログインなし、すべてのjudgeが失敗）は、PRにその旨を記載してDraftのまま残してください。`waza`が実行できるセッションでは、レビューを実行してコメントを投稿することでこれを解消します; レビューを決して黙ってスキップしてはなりません。

`waza dev --auto`は決して実行しないでください: 往々にして誤りとなるボイラープレートを注入します。手書きの`name:`と`description:`のペアが拘束力を持つサーフェスです。
