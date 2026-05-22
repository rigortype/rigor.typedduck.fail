---
title: "Architecture Decision Records"
description: "Imported from rigortype/rigor docs/adr/README.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/README.md"
sourcePath: "docs/adr/README.md"
sourceSha: "86d80e3a8a148ef15bf66b4c5767a26794e0469d6ffb93a62a37df33a95f0652"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
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
| ADR-0 | [Foundation and Core Architecture of Rigor](0-concept/) | Accepted |
| ADR-1 | [Type Model and RBS Superset Strategy](1-types/) | Draft |
| ADR-2 | [Extension API Strategy](2-extension-api/) | Draft |
| ADR-3 | [Type Representation](3-type-representation/) | Draft |
| ADR-4 | [Type Inference Engine](4-type-inference-engine/) | Draft |
| ADR-5 | [Robustness Principle](5-robustness-principle/) | Draft |
| ADR-6 | [Cache Persistence Backend](6-cache-persistence-backend/) | Draft |
| ADR-7 | [v0.1.0 Slice Decisions](7-v0.1.0-slice-decisions/) | Accepted |
| ADR-8 | [Steep-Inspired Improvements](8-steep-inspired-improvements/) | Accepted |
| ADR-9 | [Cross-Plugin API](9-cross-plugin-api/) | Proposed |
| ADR-10 | [Dependency Source Inference](10-dependency-source-inference/) | Proposed |
| ADR-11 | [Sorbet Input Adapter](11-sorbet-input-adapter/) | Proposed |
| ADR-12 | [dry-rb Packaging](12-dry-rb-packaging/) | Accepted |
| ADR-13 | [TypeNode Resolver Plugin](13-typenode-resolver-plugin/) | Proposed |
| ADR-14 | [RBS Sig Generation](14-rbs-sig-generation/) | Proposed |
| ADR-15 | [Ractor Concurrency](15-ractor-concurrency/) | Proposed |
| ADR-16 | [Macro Expansion](16-macro-expansion/) | Accepted |
| ADR-17 | [Monkey Patch Pre-Evaluation](17-monkey-patch-pre-evaluation/) | Proposed |
| ADR-18 | [Substrate Per-Call-Site Return Type](18-substrate-per-call-site-return-type/) | Proposed |
| ADR-19 | [Language Server Packaging](19-language-server-packaging/) | Accepted |
| ADR-20 | [Lightweight HKT](20-lightweight-hkt/) | Accepted |
| ADR-21 | [Rubydex Evaluation](21-rubydex-evaluation/) | Proposed |
| ADR-22 | [Baseline and Project Onboarding](22-baseline-and-project-onboarding/) | Proposed |
| ADR-23 | [Diagnostic Triage Command](23-diagnostic-triage-command/) | Proposed |
| ADR-24 | [Self Method Call Resolution](24-self-method-call-resolution/) | Proposed |
| ADR-25 | [Plugin Contributed RBS](25-plugin-contributed-rbs/) | Accepted |
| ADR-26 | [ActiveRecord Relation Typing](26-activerecord-relation-typing/) | Accepted |
| ADR-27 | [Tool Distribution and Installation Model](27-tool-distribution-model/) | Proposed |

## 新しいADRの追加

重要なアーキテクチャ上の決定を行うとき：

1. このディレクトリで次に空いている番号を見つけます。
2. 既存のADRからテンプレートをコピーするか、同じ構造（Status、Context、Decisions、Consequences）に従って新しいファイルを作成します。
3. 上記の索引テーブルにエントリを追加します。
4. 適切なコードコメント、他のADR、または`AGENTS.md`からそのADRを参照します。

## 他のドキュメントとの関係

- **`docs/types.md`** — 型仕様のクイックガイド。ADR-1と`docs/types.md`が同じ領域を論じているとき、*アナライザーが何をするか*については`docs/types.md`が権威を持ち、*なぜそうするか*についてはADR-1が権威を持ちます。
- **`docs/type-specification/`** — 規範的な型仕様。トピックごとのドキュメントに分割されています。
- **`docs/internal-spec/`** — アナライザー内部のコントラクト（エンジンサーフェス、型オブジェクトの公開API）。
- **`docs/handbook/`** — エンドユーザー向けハンドブック。静的型付けの予備知識を持たないRubyプログラマー向けに書かれています。
- **`AGENTS.md`** — このリポジトリで作業するエージェント向けの開発コントラクト。
