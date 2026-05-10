---
title: "Rigor内部仕様"
description: "rigortype/rigor docs/internal-spec/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/internal-spec/README.md"
sourcePath: "docs/internal-spec/README.md"
sourceSha: "4830c935610a535ec01395f4f056a706f39c322f14ad7ea1091034f6f3e468d5"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
translationStatus: "translated"
sidebar:
  order: 3000
---

## ステータス

ドラフト。このディレクトリはRigorの解析器内部の契約に関する正規仕様です。下流の機能が依存するエンジン表面と、プラグイン・ルール・CLIコンポーネントが利用する型オブジェクトの公開モデルを定義します。

`docs/internal-spec/`以下の文書は、解析器が**内部的に何で構成されているか**を記述します。エンジンとプラグインのコードが守らなければならない不変な形（shape）、公開メソッド表面、同一性ルール、正規化ルーティング、安定性保証を扱います。型言語の**セマンティクス**（RBS相互運用、値束、ナローイング規則、正規化規則、消去規則、診断識別子）は[`docs/type-specification/`](../type-specification/)にあり、本ディレクトリの記述が型言語の挙動と矛盾するときは型仕様が拘束します。

設計の根拠、決定の履歴、却下/保留された選択肢、未解決事項は`docs/adr/`（とりわけ型オブジェクトモデルについては`docs/adr/3-type-representation.md`）にあります。本仕様とADRが解析器の挙動について矛盾しているように見えるときは、**本仕様が拘束**し、ADRを修正すべきです。

## 規約

本仕様で使うMUST、MUST NOT、SHOULD、SHOULD NOT、MAYのキーワードは[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)と[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)に従って解釈します。

Rubyの識別子（`Rigor::Type`、`Rigor::Trinary`、`Rigor::Type::Combinator`など）は本仕様で使う仮の名前です。記述する契約が保たれている限り、実装段階で改名してかまいません。例の中の型表現は[`docs/type-specification/`](../type-specification/)の規約に従います。

## 他文書との関係

- [`docs/type-specification/`](../type-specification/)は型言語の**意味**を定義します。本ディレクトリは、その意味を満たすために解析器が**公開する**ものを定義します。
- [`docs/adr/1-types.md`](../adr/1-types/)は型モデルの根拠を記録します。型仕様は結果として現れる挙動を拘束し、本ディレクトリは結果として現れる内部契約を拘束します。
- [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)は拡張APIの決定を記録します。その決定の一部（Type問い合わせ、Scope問い合わせ、ケイパビリティロール適合）は本書で規範的になり、ADRは引き続き根拠の文書です。
- [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)は内部型表現の根拠と未解決事項を記録します。安定した決定は[`internal-type-api.md`](internal-type-api/)で規範的になります。
- [`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)は型推論エンジンの根拠、スライスのロードマップ、ADR-3の未解決事項に対する暫定回答を記録します。安定した決定は[`inference-engine.md`](inference-engine/)で規範的になります。

## 読み順

| 文書 | 範囲 |
| --- | --- |
| [implementation-expectations.md](implementation-expectations/) | エンジン表面 — `Scope`、ファクトストア、効果モデル、ケイパビリティロール推論、正規化、RBS消去のルーティング、公開安定性ルール。 |
| [internal-type-api.md](internal-type-api/) | 型オブジェクトの公開契約 — メソッド表面、同一性と等価性、不変性、ファクトリー経由の正規化ルーティング、診断表示のルーティング。 |
| [inference-engine.md](inference-engine/) | `Rigor::Scope#type_of(node)`問い合わせ — 純粋性、不変なScope規律、`Dynamic[Top]`への安全フォールバックポリシー、環境ローディング境界。 |
| [reflection.md](reflection/) | `Rigor::Reflection`読み取り側ファサード — `ClassRegistry` + `RbsLoader` + `Scope`で発見した事実を統合した読み取り表面。v0.1.0のプラグインAPIレディネス向け公開読み取り表面。 |
| [cache.md](cache/) | `Rigor::Cache`層 — ディスクリプタスキーマ、ファイルシステム実装のStore、最初のキャッシュ生成器（`RbsConstantTable`）、CLIの可観測性、診断provenance。 |
| [flow-contribution.md](flow-contribution/) | `Rigor::FlowContribution`バンドル — プラグイン、`RBS::Extended`注釈、組み込みナローイングルールが、単一の呼び出しエッジで解析器に事実と効果を渡すための公開パッケージ。 |
| [public-api.md](public-api/) | 公開APIの安定境界 — v0.1.0のプラグイン契約が設計対象とする名前空間（`Rigor::Scope`、`Type`、`Environment`、`Reflection`、`FlowContribution`、`Diagnostic`）、および内部に留めておく表面。 |
| [dependency-source-inference.md](dependency-source-inference/) | オプトイン依存関係ソース推論（ADR-10）— `dependencies.source_inference:`設定、ウォーカー / ディスパッチャーティア、`DependencyEntry`キャッシュスライス、`dynamic.dependency-source.*`診断ファミリー。 |

このリストは、追加の内部契約（ファクトストアスキーマ、キャッシュと無効化規則、プラグインライフサイクル内部）が安定するにつれて拡大します。
