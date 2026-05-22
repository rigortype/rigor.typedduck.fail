---
title: "Architecture Decision Records"
description: "Imported from rigortype/rigor docs/adr/README.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/README.md"
sourcePath: "docs/adr/README.md"
sourceSha: "cca27c14ea012c2cc36006b7425dcd03cc89e49d105a69f17efba4ffbe17b615"
sourceCommit: "75f1372f98e9b1b00cb79a72bf925849cead6956"
translationStatus: "translated"
sidebar:
  order: 4000
---

このディレクトリにはRigorのアーキテクチャ決定記録（Architecture Decision Records、ADR）が含まれています。各ドキュメントは、重要な設計上の決定、その背景、検討された選択肢、そして結果を記録しています。

## 読み方

- **ADR-0**は基礎ドキュメントです — プロジェクトの中核的な原則とアーキテクチャを知るには、ここから始めてください。
- **ADR-1**から**ADR-3**は型モデル、拡張API、型表現を定義します — アナライザーの概念的な中核です。
- 番号の大きいADRは基礎の上に構築されており、必要に応じて読むことができます。
- 各ADRには**Status**フィールドがあります：`Accepted`、`Draft`、`Superseded`のいずれかです。

## 索引

| # | Title | Status |
| --- | --- | --- |
| [0](0-concept/) | Foundation and Core Architecture of Rigor | Accepted |
| [1](1-types/) | Type Model and RBS Superset Strategy | Draft |
| [2](2-extension-api/) | Extension API Strategy | Draft |
| [3](3-type-representation/) | Type Representation | — |
| [4](4-type-inference-engine/) | Type Inference Engine | — |
| [5](5-robustness-principle/) | Robustness Principle | — |
| [6](6-cache-persistence-backend/) | Cache Persistence Backend | — |
| [7](7-v0.1.0-slice-decisions/) | v0.1.0 Slice Decisions | — |
| [8](8-steep-inspired-improvements/) | Steep-Inspired Improvements | — |
| [9](9-cross-plugin-api/) | Cross-Plugin API | — |
| [10](10-dependency-source-inference/) | Dependency Source Inference | — |
| [11](11-sorbet-input-adapter/) | Sorbet Input Adapter | — |
| [12](12-dry-rb-packaging/) | dry-rb Packaging | — |
| [13](13-typenode-resolver-plugin/) | TypeNode Resolver Plugin | — |
| [14](14-rbs-sig-generation/) | RBS Sig Generation | — |
| [15](15-ractor-concurrency/) | Ractor Concurrency | — |
| [16](16-macro-expansion/) | Macro Expansion | — |
| [17](17-monkey-patch-pre-evaluation/) | Monkey Patch Pre-Evaluation | — |
| [18](18-substrate-per-call-site-return-type/) | Substrate Per-Call-Site Return Type | — |
| [19](19-language-server-packaging/) | Language Server Packaging | — |
| [20](20-lightweight-hkt/) | Lightweight HKT | — |
| [21](21-rubydex-evaluation/) | Rubydex Evaluation | — |
| [22](22-baseline-and-project-onboarding/) | Baseline and Project Onboarding | — |
| [23](23-diagnostic-triage-command/) | Diagnostic Triage Command | — |
| [24](24-self-method-call-resolution/) | Self Method Call Resolution | — |
| [25](25-plugin-contributed-rbs/) | Plugin Contributed RBS | — |
| [26](26-activerecord-relation-typing/) | ActiveRecord Relation Typing | — |

## 新しいADRの追加

重要なアーキテクチャ上の決定を行うとき：

1. このディレクトリで次に空いている番号を見つけます。
2. 既存のADRからテンプレートをコピーするか、同じ構造（Status、Context、Decisions、Consequences）に従って新しいファイルを作成します。
3. 上記の索引テーブルにエントリを追加します。
4. 適切な場所で、関連するコードコメント、他のADR、または`AGENTS.md`からそのADRを参照します。

## 他のドキュメントとの関係

- **`docs/types.md`** — 型仕様のクイックガイド。ADR-1と`docs/types.md`が同じ領域を論じているとき、*アナライザーが何をするか*については`docs/types.md`が権威を持ち、*なぜそうするか*についてはADR-1が権威を持ちます。
- **`docs/type-specification/`** — 規範的な型仕様。トピックごとのドキュメントに分割されています。
- **`docs/internal-spec/`** — アナライザー内部のコントラクト（エンジンサーフェス、型オブジェクトの公開API）。
- **`docs/handbook/`** — エンドユーザー向けハンドブック。静的型付けの予備知識を持たないRubyプログラマー向けに書かれています。
- **`AGENTS.md`** — このリポジトリで作業するエージェント向けの開発コントラクト。
