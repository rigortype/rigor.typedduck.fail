---
title: "Rigor型システム — クイックガイド"
description: "rigortype/rigor docs/types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/types.md"
sourcePath: "docs/types.md"
sourceSha: "4fc119458aecd87a0f68cd2932c8b0f1784d92489f57f2e8aa86ab7be4f63e6b"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 9050
---

Rigorは、Ruby向けの「推論ファースト」な静的解析器です。型言語は**RBSの厳密なスーパーセット**で、すべてのRBS型はRigorの内部表現を経て無損失で往復し、Rigorが推論したすべての型は通常のRBSへ保守的に消去（erasure）できます。

このファイルは1ページで読み切れる入口です。完全な正規仕様は[`docs/type-specification/`](../type-specification/)にあります。設計の根拠と却下/保留された選択肢は[`docs/adr/1-types.md`](../adr/1-types/)にあります。

## コンセプト

- **インラインDSLは導入しない**。アプリケーションのRubyコードにRigor専用の注釈構文は持ち込みません。RBS、rbs-inline、Steep互換の注釈は型のソースとして受け入れます。
- **入力RBSは無損失、出力RBSは保守的に**。内部の精度（リテラル集合、リファインメント、シェイプ、動的由来（provenance）情報）はRBSで表現できる範囲を超えてもかまいません。エクスポート時には、Rigorが証明した型より広くなることはあっても狭くなることはない通常のRBSに消去します。
- **3値の確実性**。型・リフレクション・メンバー問い合わせは`yes`、`no`、`maybe`のいずれかを返します。`maybe`は`yes`のように絞り込んだり、`no`のように反対側のエッジ事実を生成したりはしません。
- **2つの関係を分離して保つ**。サブタイピング（`A <: B`、値集合の包含）とグラデュアル一貫性（`consistent(A, B)`、動的境界の互換性）は統一しません。`untyped`は動的型であり、`top`とは別物です。
- **頑健性原則（Postelの法則）**。 Rigorが著作する型は*戻り値については厳密に*かつ*引数については寛容に*します。精密な戻り値は推論エンジンを通じて有用な事実を伝播させ、寛容な引数は呼び出し側での強制変換ワークアラウンドを防ぎます。手書きのRBSは著作物として拘束力を持ちます — 原則はRigorのデフォルトに対して指針を与えるもので、ユーザー記述の署名には適用されません。詳細は[robustness-principle.md](../type-specification/robustness-principle/)（正規ルール）と[adr/5-robustness-principle.md](../adr/5-robustness-principle/)（設計の根拠）を参照してください。

## 主な機能

| 機能 | 詳細はこちら |
| --- | --- |
| `Dynamic[T]`代数とグラデュアル型付けのprovenance | [value-lattice.md](../type-specification/value-lattice/), [special-types.md](../type-specification/special-types/) |
| 複合条件の内部でエッジを意識した制御フローナローイング | [control-flow-analysis.md](../type-specification/control-flow-analysis/) |
| 否定事実、差分型、補集合の表示契約 | [type-operators.md](../type-specification/type-operators/) |
| RBSインターフェースと推論されたオブジェクトシェイプによる構造的ダックタイピング | [structural-interfaces-and-object-shapes.md](../type-specification/structural-interfaces-and-object-shapes/) |
| ケイパビリティロール（`_RewindableStream`、`_ClosableStream` …）によるIO互換性 | [structural-interfaces-and-object-shapes.md](../type-specification/structural-interfaces-and-object-shapes/) |
| リファインメント（`non-empty-string`、`positive-int`、ハッシュシェイプの追加キーポリシー …） | [imported-built-in-types.md](../type-specification/imported-built-in-types/), [rigor-extensions.md](../type-specification/rigor-extensions/) |
| `RBS::Extended`注釈（`%a{rigor:v1:…}`による述語、表明、適合宣言） | [rbs-extended.md](../type-specification/rbs-extended/) |
| 再帰や演算子の曖昧性に対する推論バジェットと境界契約 | [inference-budgets.md](../type-specification/inference-budgets/) |
| 診断識別子の分類体系と抑制マーカー | [diagnostic-policy.md](../type-specification/diagnostic-policy/) |
| 保守的なRBS消去とハッシュシェイプの消去アルゴリズム | [rbs-erasure.md](../type-specification/rbs-erasure/) |

## 目的別の読み方

- **メンタルモデルだけ知りたい？** [overview.md](../type-specification/overview/)、[value-lattice.md](../type-specification/value-lattice/)、[special-types.md](../type-specification/special-types/)をこの順に読んでください。
- **推論を実装中？**さらに[control-flow-analysis.md](../type-specification/control-flow-analysis/)、[normalization.md](../type-specification/normalization/)、[inference-budgets.md](../type-specification/inference-budgets/)、そして解析器内部の契約[`docs/internal-spec/`](../internal-spec/)を加えてください — まず[implementation-expectations.md](../internal-spec/implementation-expectations/)と[internal-type-api.md](../internal-spec/internal-type-api/)から始めるのがおすすめです。
- **RBSや`RBS::Extended`のペイロードを書く？** [rbs-compatible-types.md](../type-specification/rbs-compatible-types/)と[rbs-extended.md](../type-specification/rbs-extended/)を読み、続けて往復の挙動を見るために[rbs-erasure.md](../type-specification/rbs-erasure/)を読んでください。
- **診断面のレビューや拡張をする？** [diagnostic-policy.md](../type-specification/diagnostic-policy/)を[type-operators.md](../type-specification/type-operators/)と並行して読んでください。

## 仕様の索引

正規仕様の読み順、規約（RFC 2119のキーワード、RBS優先の互換性階層）、各トピック文書の1行説明は[`docs/type-specification/README.md`](../type-specification/)にあります。

型仕様を補完する解析器内部の契約（エンジン表面、型オブジェクトの公開API）は[`docs/internal-spec/README.md`](../internal-spec/)を参照してください。

## 関連文書

- [`README.md`](https://github.com/rigortype/rigor/blob/main/README.md) — プロジェクト概要とCLIの入口
- [`AGENTS.md`](https://github.com/rigortype/rigor/blob/main/AGENTS.md) — 本リポジトリの開発ワークフロー
- [`docs/adr/0-concept.md`](../adr/0-concept/) — Rigorの高レベルなコンセプトADR
- [`docs/adr/1-types.md`](../adr/1-types/) — 型モデルのADR（設計根拠、検討した選択肢、却下/保留事項、未解決事項）
- [`docs/adr/2-extension-api.md`](../adr/2-extension-api/) — プラグイン拡張APIのADR
- [`docs/adr/3-type-representation.md`](../adr/3-type-representation/) — 内部型表現のADR（設計根拠と未解決事項）
- [`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/) — 型推論エンジンADR（スライスのロードマップ、ADR-3の未解決事項に対する暫定回答）
- [`docs/internal-spec/README.md`](../internal-spec/) — 解析器内部の契約（エンジン表面、型オブジェクトの公開API、推論エンジン）
