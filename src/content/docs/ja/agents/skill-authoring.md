---
title: "このリポジトリでスキルを執筆する"
description: "rigortype/rigor docs/agents/skill-authoring.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/skill-authoring.md"
sourcePath: "docs/agents/skill-authoring.md"
sourceSha: "35ffbbf3ebc3cd18f53fb720188b5a78a8fbeaa6d0b968e6e8f7769d5ba4a6e7"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
translationStatus: "translated"
sidebar:
  order: 9050
---

2つのツリー、2つの読者層。各`SKILL.md`の`description:`がルーティングを担うサーフェスです;トリガーの2つ目のカタログを管理してはなりません。

- [`.claude/skills/`](https://github.com/rigortype/rigor/tree/master/.claude/skills/)は貢献者向けのワークフローを含みます。このリポジトリの`Makefile`とレイアウトを前提とし、`metadata.internal: true`を持ちます。
- [`skills/`](https://github.com/rigortype/rigor/tree/master/skills/)はユーザー向けのワークフローを含みます。公開の`rigor` CLIのみを使用し、`make`ターゲット、リポジトリパス、Flakeコマンドは使用しません。2つのツリーは異なる読者にサービスを提供しながら同じ名前を共有することがあります。

サードパーティのプラグイン作者はモノレポの外へルーティングされます ── `rigor-plugin-author` Phase 0.5および[ADR-31](../../adr/31-contribution-and-supply-chain-policy/) WD2/WD4を参照してください。

## Description（説明）

メタデータだけでルーティングできる程度に説明を短く保ちます: アクション、それをトリガーする具体的なイベントまたは成果物、そして別の場所へルーティングする非自明な境界のみを記述します。例のカタログ、実装の詳細、または厳密なフラグよりも、1〜2文を好みます。トリガーはそのスキルが所有するタスクの名前を挙げるべきであり、その周辺にあるすべてのタスクではありません;アンチトリガーは、2つのスキルが一致する可能性がある場合に有用です。

説明をミニ手順ではなくポインタとして扱います。厳密なコマンド、バージョンに結合された値、長い例、およびブランチ固有のステップは、本文または条件付きの`references/`ファイルに配置します。本文は安定したワークフロースパイン（spine）であるべきです: 目標、フェーズ、決定ポイント、および観測可能な完了基準です。スキルに複数のブランチがある場合は、すべてのブランチを読み込むのではなく、関連するリファレンスへルーティングします。

## `waza`チェッカー

`SKILL.md`を変更したら、仕様準拠のために`waza check <skill-path>`を一度実行します。agentskills.ioの公開プロファイルとは無関係に実際の欠陥を特定している場合にのみ、アドバイザリーを適用します;Rigorの包括的なワークフローは、そのトークン予算やラベルを満たすために再形成する必要はありません。恒久的なキャリブレーションについては[ADR-81](../../adr/81-skill-set-optimization/)を参照してください。

`waza dev --auto`は決して実行しないでください: 往々にして誤りとなるボイラープレートを注入します。手書きの`name:`と`description:`のペアが拘束力を持つサーフェスです。
