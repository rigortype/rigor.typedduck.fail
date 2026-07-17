---
title: "ドメインドキュメント"
description: "rigortype/rigor docs/agents/domain.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/domain.md"
sourcePath: "docs/agents/domain.md"
sourceSha: "9992945ab1ed51754d16d80fbe9949e13473e5f4f378fc767d4cc2eda5c974eb"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 9050
---

エンジニアリングスキルが、コードベースを探索する際にこのリポジトリのドメインドキュメントをどう消費するか。

これは**単一コンテキスト**のリポジトリです。

## 探索の前に、これらを読むこと

- リポジトリルートの**`CONTEXT.md`** —— ドメイン用語集（罠となる用語 + 正典的な語彙ドキュメントへのポインタ）。
- **`docs/adr/`** —— これから作業する領域に触れるADR。ファイルは`N-slug.md`;その索引（すべてのADRのタイトル + ステータス）は`docs/adr/README.md`だ。領域にかかわらずエージェントが知っておくべき前提は`AGENTS.md` §「Architecture Decision Records」に列挙されている。

ファイルが欠けていても、黙って進めること;`/domain-modeling`は、用語や決定が実際に解決されたときにそれらを遅延的に作成する。

## 用語集の語彙を使う

出力がドメイン概念を名指すとき（issueのタイトル、リファクタリング提案、仮説、テスト名）、`CONTEXT.md`が定義するとおりの用語を使うこと。このリポジトリでは2つの用語が積極的に罠として仕掛けられている——「interface」と「protocol」——どちらかを使う前に用語集を参照すること。

必要な概念が用語集にない場合、それはシグナルだ: プロジェクトが使わない言葉を発明しているか（再考せよ）、本当のギャップがあるか（`/domain-modeling`のために書き留めよ）のいずれかである。

## ADRの衝突を指摘する

出力が既存のADRと矛盾する場合、黙って上書きするのではなく、明示的に表面化すること:

> _ADR-43（許可リストの祖先解決）と矛盾する——しかし再検討する価値がある。なぜなら……_

リポジトリ自身のルールを忘れないこと: ADRと仕様コーパスがアナライザーの挙動について食い違うとき、**仕様が拘束力を持ち**（`docs/type-specification/`、`docs/internal-spec/`）;ADRはその理由を記録する。
