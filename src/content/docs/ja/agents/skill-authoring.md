---
title: "このリポジトリでスキルを執筆する"
description: "rigortype/rigor docs/agents/skill-authoring.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/skill-authoring.md"
sourcePath: "docs/agents/skill-authoring.md"
sourceSha: "6bf93752cf85b1f5f17511af3ba61746e8f76d7a096b98f6ad0b93be1ae1abb3"
sourceCommit: "e3eb424c3c88035e453246710c8df3dc5cc8e7e1"
translationStatus: "translated"
sidebar:
  order: 9050
---

2つのツリー、2つの読者層。各`SKILL.md`の`description:`がそこへのルーティングを担うので、カタログは
他のどこにも保持されていない。

- [`.claude/skills/`](../../.claude/skills/) —— **貢献者**向けのワークフローで、この
  リポジトリでの作業時に自動検出される。モノレポの`Makefile`とレイアウトを前提とし、
  `metadata.internal: true`を持つため、エンドユーザー向けにインストールされることはない。
- [`skills/`](https://github.com/rigortype/rigor/tree/master/skills/) —— Rigorを採用するプロジェクトへ
  出荷する**ユーザー向け**のセット。これらは公開の`rigor` CLIのみを参照する: `make`ターゲットも、
  リポジトリ相対パスも、Flakeもない。いくつかの名前は両方のツリーに存在する（`rigor-plugin-author`）;
  それらは異なる読者向けの異なる文書であり、[`skills/README.md`](https://github.com/rigortype/rigor/blob/master/skills/README.md)が
  ユーザー向けのインベントリーを保持する。

サードパーティのプラグイン作者はモノレポの外へ完全にルーティングされる —— `rigor-plugin-author`の
Phase 0.5と[ADR-31](../../adr/31-contribution-and-supply-chain-policy/) WD2/WD4を参照。

## `waza`チェッカー

`SKILL.md`を執筆したら、仕様準拠のために`waza check <skill-path>`を一度実行する。それが報告する
それ以外のすべては**参考情報**だ —— そのトークン予算と`USE FOR:`マーカーはagentskills.ioでの公開を
対象としており、それは貢献者向けのツリーよりも`skills/`ツリーをはるかに強く拘束する。

`waza dev --auto`は決して実行しないこと: それは頻繁に誤りとなる定型文を注入する。手書きの`name:` +
`description:`のペアが拘束力を持つサーフェスだ。
