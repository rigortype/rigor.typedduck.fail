---
title: "Rigor型仕様"
description: "rigortype/rigor docs/type-specification/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/README.md"
sourcePath: "docs/type-specification/README.md"
sourceSha: "8c510b0c05349a820c016b57f3050980651c74cc3ac16869b1810374aa015154"
sourceCommit: "db8d01bf94926a72e6a2aaf15639d1591b7e142e"
translationStatus: "translated"
sidebar:
  order: 2000
---

## ステータス

ドラフト。このディレクトリはRigor型モデルの正規仕様です。

`docs/type-specification/`以下の文書は、解析器が**何をするか**を記述します。型の正規化、ナローイング（narrowing）、消去、署名処理、診断識別子、推論バジェット、プラグインや`RBS::Extended`注釈に公開される表面を定義します。

解析器内部の契約（contract） — 下流機能が依存するエンジン表面、およびプラグイン・ルール・CLIコンポーネントが利用する型オブジェクトの公開モデル — は、本仕様と並んで[`docs/internal-spec/`](../internal-spec/)にあります。本仕様と`docs/internal-spec/`が同じ表面を扱う場合、観測可能な型言語の挙動については**本仕様が拘束**し、Ruby側の契約については`docs/internal-spec/`が拘束します。

設計の根拠、決定の履歴、却下/保留された選択肢、未解決事項は`docs/adr/1-types.md`（およびプラグイン拡張APIの決定は`docs/adr/2-*`、内部型表現の根拠は`docs/adr/3-*`）にあります。仕様とADRが解析器の挙動について矛盾しているように見えるときは、**仕様が拘束**し、ADRを修正すべきです。

本仕様は長期的な型モデルを扱います。最終的な解析器の挙動について規範性を持ちますが、最初のユーザー向けリリース（v1）は意図的に範囲を絞ったスライス（slice）を出荷します。出荷済みのサーフェスと、なお保留の作業を区別する節は、その差を本文中に明示します。

## 規約

本仕様で使うMUST、MUST NOT、SHOULD、SHOULD NOT、MAYのキーワードは[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)と[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)に従って解釈します。

型表現は、RBSで書ける範囲はRBS構文で書き、それ以外はRigorの内部記法で書きます。RBSの表面構文に含まれない内部記法（例: `Dynamic[T]`、`T - U`、`~T`、`key_of[T]`）は、各文書で初めて登場するときに明示的に説明します。

## 互換性の階層

- **RBS**と**rbs-inline**は、型構文およびインライン注釈の互換性に関する第一の規範です。
- **Steep 2.0**の挙動は、文章による仕様が挙動を未定義にしている部分について、既存の注釈をどう解釈するかに関する第二の規範です。
- **TypeScript**、**PHPStan**、**Python typing**は、欠けている概念や実用的な解析器機能を見つけるためのデザイン参照であり、構文互換のターゲットではありません。

3者が異なるとき、解決順序は次のとおりです:

1. RBSの文章仕様が勝つ。
2. RBSの文章仕様が触れていないインライン構文上の問題は、rbs-inlineドキュメントが勝つ。
3. RBS文章仕様もrbs-inlineドキュメントも挙動を規定していない場合に限り、Steep 2.0の挙動が勝つ。

Steepが上位の参照源と食い違う箇所では、Rigorは上位の参照源に従い、その差分を文書化します。Steepからの移行ユーザーが診断を踏んで初めて違いに気づくことがないよう、当該箇所では個別に明示します。

## 読み順

文書は、基礎的な定義から始めて具体的な表面が積み上がる順に並んでいます。

| 文書 | 範囲 |
| --- | --- |
| [overview.md](overview/) | 中核原則（RBSのスーパーセット）、設計優先度、本仕様の範囲。 |
| [robustness-principle.md](robustness-principle/) | 型のためのPostelの法則。戻り値は厳密、引数は寛容。Rigorが著作するすべての型が守る非対称な著作ルール。 |
| [relations-and-certainty.md](relations-and-certainty/) | サブタイピング（subtyping）（`<:`）、<ruby>漸進的一貫性<rp>（</rp><rt>gradual consistency</rt><rp>）</rp></ruby>（`consistent`）、3値の確実性（`yes`/`no`/`maybe`）。 |
| [value-lattice.md](value-lattice/) | 値束（lattice）、束の同一性、`Dynamic[T]`の代数。 |
| [special-types.md](special-types/) | `top`、`bot`、`untyped`/`Dynamic[T]`、`void`、`nil`/`NilClass`、`bool`/`boolish`。 |
| [rbs-compatible-types.md](rbs-compatible-types/) | Rigorが受け付けるRBS形式の集合と、それぞれの解釈。 |
| [rigor-extensions.md](rigor-extensions/) | RBSを超えてRigorが推論する内部限定の形式（リファインメント（refinement、篩型とも）など）。 |
| [imported-built-in-types.md](imported-built-in-types/) | 予約済み組み込みリファインメント名（`non-empty-string`、`positive-int` …）と命名規則。 |
| [type-operators.md](type-operators/) | `~T`、`T - U`、`key_of[T]`、添字アクセス、診断表示の契約。 |
| [structural-interfaces-and-object-shapes.md](structural-interfaces-and-object-shapes/) | RBSインターフェース、推論されたオブジェクトシェイプ（shape）、ケイパビリティ（capability）ロール、メソッドシェイプエントリ。 |
| [control-flow-analysis.md](control-flow-analysis/) | エッジを意識したナローイング、等価性のセマンティクス、事実の安定性、ミューテーションの効果、プラグイン適用前の表面。 |
| [rbs-extended.md](rbs-extended/) | `%a{rigor:v1:…}`注釈、述語/表明の文法、明示的適合宣言、フロー効果バンドル。 |
| [normalization.md](normalization/) | 決定論的な正規化規則。 |
| [rbs-erasure.md](rbs-erasure/) | 保守的なRBS消去（ハッシュシェイプ消去アルゴリズムを含む）。 |
| [inference-budgets.md](inference-budgets/) | バジェット表、設定、境界契約の挙動。 |
| [diagnostic-policy.md](diagnostic-policy/) | 診断識別子の分類体系、`Dynamic[T]`の表示規則、抑制マーカー。 |

## 関連: 解析器内部の契約

エンジン表面の契約（`Scope`、ファクトストア、効果モデル、ケイパビリティロール推論、正規化、RBS消去のルーティング、公開安定性ルール）と型オブジェクトの公開契約（メソッド表面、同一性と等価性、不変性、ファクトリー経由の正規化、診断表示のルーティング）は、[`docs/internal-spec/`](../internal-spec/)で規範性を持ちます。2つのコーパスは補完関係にあり、本ディレクトリは型言語のセマンティクスを拘束し、`docs/internal-spec/`はそれを満たすRuby側の表面を拘束します。
