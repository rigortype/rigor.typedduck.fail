---
title: "アーキテクチャ決定記録"
description: "rigortype/rigor docs/adr/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/README.md"
sourcePath: "docs/adr/README.md"
sourceSha: "c9a1f138a7de2460fdd2d49c9a5ff39882fdf5f8e75b1fb797360b81288059ef"
sourceCommit: "b5c25bc5a9e53d495e4f515a9506f10fd4bef8d7"
translationStatus: "translated"
sidebar:
  order: 4000
---

このディレクトリにはRigorのアーキテクチャ決定記録（Architecture Decision Records、ADR）が含まれています。各ドキュメントは、重要な設計上の決定、その背景、検討された選択肢、そして結果を記録しています。

## 読み方

- **ADR-0**は基礎ドキュメントです — プロジェクトの中核的な原則とアーキテクチャを知るには、ここから始めてください。
- **ADR-1**から**ADR-3**は型モデル、拡張API、型表現を定義します — アナライザーの概念的な中核です。
- 番号の大きいADRは基礎の上に構築されており、必要に応じて読むことができます。
- 各ADRには**Status**フィールドがあります：`Accepted`、`Proposed`、`Superseded`のいずれかです。実装がまだ進行中のAcceptedなADRは、括弧書きの注記（例: *partially implemented*、*slice N deferred*）を持ちます。

## 索引

| # | Title | Status |
| --- | --- | --- |
| ADR-0 | [Foundation and Core Architecture of Rigor](0-concept/) | Accepted |
| ADR-1 | [Type Model and RBS Superset Strategy](1-types/) | Accepted |
| ADR-2 | [Extension API Strategy](2-extension-api/) | Accepted |
| ADR-3 | [Type Representation](3-type-representation/) | Accepted |
| ADR-4 | [Type Inference Engine](4-type-inference-engine/) | Accepted |
| ADR-5 | [Robustness Principle](5-robustness-principle/) | Accepted |
| ADR-6 | [Cache Persistence Backend](6-cache-persistence-backend/) | Accepted |
| ADR-7 | [v0.1.0 Slice Decisions](7-v0.1.0-slice-decisions/) | Accepted |
| ADR-8 | [Steep-Inspired Improvements](8-steep-inspired-improvements/) | Accepted |
| ADR-9 | [Cross-Plugin API](9-cross-plugin-api/) | Accepted (implemented in v0.1.1) |
| ADR-10 | [Dependency Source Inference](10-dependency-source-inference/) | Accepted |
| ADR-11 | [Sorbet Input Adapter](11-sorbet-input-adapter/) | Accepted |
| ADR-12 | [dry-rb Packaging](12-dry-rb-packaging/) | Accepted |
| ADR-13 | [TypeNode Resolver Plugin](13-typenode-resolver-plugin/) | Accepted |
| ADR-14 | [RBS Sig Generation](14-rbs-sig-generation/) | Accepted |
| ADR-15 | [Ractor Concurrency](15-ractor-concurrency/) | Accepted (fork backend active; Ractor pool deferred) |
| ADR-16 | [Macro Expansion](16-macro-expansion/) | Accepted |
| ADR-17 | [Monkey Patch Pre-Evaluation](17-monkey-patch-pre-evaluation/) | Accepted (implemented in v0.1.13) |
| ADR-18 | [Substrate Per-Call-Site Return Type](18-substrate-per-call-site-return-type/) | Accepted (implemented in v0.1.6) |
| ADR-19 | [Language Server Packaging](19-language-server-packaging/) | Accepted |
| ADR-20 | [Lightweight HKT](20-lightweight-hkt/) | Accepted (partial implementation) |
| ADR-21 | [Rubydex Evaluation](21-rubydex-evaluation/) | Proposed |
| ADR-22 | [Baseline and Project Onboarding](22-baseline-and-project-onboarding/) | Accepted |
| ADR-23 | [Diagnostic Triage Command](23-diagnostic-triage-command/) | Accepted (slices 1+2+3+4 implemented) |
| ADR-24 | [Self Method Call Resolution](24-self-method-call-resolution/) | Accepted (slice 4 gated) |
| ADR-25 | [Plugin Contributed RBS](25-plugin-contributed-rbs/) | Accepted |
| ADR-26 | [ActiveRecord Relation Typing](26-activerecord-relation-typing/) | Accepted |
| ADR-27 | [Tool Distribution and Installation Model](27-tool-distribution-model/) | Accepted (partially implemented; CI template + single binary deferred) |
| ADR-28 | [Path-scoped Method-Protocol Contracts](28-path-scoped-protocol-contracts/) | Accepted |
| ADR-29 | [Browser Playground](29-browser-playground/) | Accepted (implemented in v0.1.10–0.1.11; cloud deploy + ruby.wasm deferred) |
| ADR-30 | [`rigor-ffi` Plugin Shape](30-rigor-ffi-plugin-shape/) | Proposed (not implemented) |
| ADR-31 | [Contribution and Supply-chain Policy](31-contribution-and-supply-chain-policy/) | Accepted (in force) |
| ADR-32 | [Inline-RBS Comment Ingestion](32-rbs-inline-comment-ingestion/) | Accepted (implemented in v0.1.10) |
| ADR-33 | [MCP Server Packaging](33-mcp-server/) | Accepted (implemented in v0.1.10) |
| ADR-34 | [Toplevel Unresolved Implicit-self Calls Warn by Default](34-toplevel-unresolved-self-call-default/) | Accepted (implemented in v0.1.13; Playground severity wiring deferred) |
| ADR-35 | [Override Signature Compatibility (Liskov signature rule)](35-override-signature-compatibility/) | Accepted (slices 1–4 done; slice 5 deferred) |
| ADR-36 | [Macro-substrate Nested-class Emission Tier (Mangrove `Enum`)](36-mangrove-enum-nested-class-emission/) | Accepted (Slice A implemented; `is_a?` exhaustiveness deferred) |
| ADR-37 | [Plugin Interface Segregation (narrow extension protocols)](37-plugin-interface-segregation/) | Accepted (Slices 1–3 implemented; all bundled walker plugins migrated) |
| ADR-38 | [Plugin-declared Additional Initializers](38-additional-initializers/) | Accepted (def-form implemented; block-form deferred) |
| ADR-39 | [Plugins may invoke their target library's safe methods directly](39-plugin-target-library-invocation/) | Accepted (Plugin::Inflector + 3 consumers migrated; slice 3 deferred) |
| ADR-40 | [`config_schema` declared defaults (`{kind:, default:}`)](40-config-schema-defaults/) | Accepted (mechanism + 13 plugins migrated off the `DEFAULT_*` idiom) |
| ADR-41 | [Inference budget design (wiring, on-hit policy, measurement-gated defaults)](41-inference-budget-design/) | Proposed (spec table unwired; Layer 1 doc hygiene + Layer 2 measurement-gated wiring queued) |
| ADR-42 | [Plugin-contributed binary-operator return types (coerce-direction)](42-plugin-binary-operator-return-types/) | Proposed, low priority (self/left-operand case already works via `dynamic_return`, spec-confirmed; coerce direction is a narrow false positive — cheapest fix is the WD-D engine mitigation, precision via the ADR-20 HKT route; demand-gated) |
| ADR-43 | [RBS-complete ancestor resolution (allow-list inherited-method dispatch)](43-rbs-complete-ancestor-resolution/) | Accepted — fully landed (WD1–WD6; `rigor check` resolves a Ruby subclass's inherited calls against an allow-listed RBS-complete ancestor (seed `Plugin::Base`) so contract misuse warns standalone, without Steep's own-helper FP wall; zero net FP on the plugin lib tree; blanket resolution rejected on Rails-controller FP grounds; `make check-plugins` gate in `verify` + CI, teeth verified) |

## 新しいADRの追加

重要なアーキテクチャ上の決定を行うとき：

1. このディレクトリで次に空いている番号を見つけます。
2. 既存のADRからテンプレートをコピーするか、同じ構造（Status、Context、Decisions、Consequences）に従って新しいファイルを作成します。
3. 上記の索引テーブルにエントリーを追加します。
4. 適切なコードコメント、他のADR、または`AGENTS.md`からそのADRを参照します。

## 他のドキュメントとの関係

- **`docs/types.md`** — 型仕様のクイックガイド。ADR-1と`docs/types.md`が同じ領域を論じているとき、*アナライザーが何をするか*については`docs/types.md`が権威を持ち、*なぜそうするか*についてはADR-1が権威を持ちます。
- **`docs/type-specification/`** — 規範的な型仕様。トピックごとのドキュメントに分割されています。
- **`docs/internal-spec/`** — アナライザー内部の契約（contract）（エンジンサーフェス（surface）、型オブジェクトの公開API）。
- **`docs/handbook/`** — エンドユーザー向けハンドブック。静的型付けの予備知識を持たないRubyプログラマー向けに書かれています。
- **`AGENTS.md`** — このリポジトリで作業するエージェント向けの開発契約。
