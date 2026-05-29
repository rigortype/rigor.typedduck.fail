---
title: "正規化"
description: "rigortype/rigor docs/type-specification/normalization.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/normalization.md"
sourcePath: "docs/type-specification/normalization.md"
sourceSha: "bbe27b66f89c012ea66909301a98c503d318fbdc807d436fd171321eca576586"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorは比較と報告の前に型を正規化します。正規化は診断、キャッシュ、エクスポートされたシグネチャが安定するように決定論的でなければなりません（MUST）。

この文書は正規化規則の権威ある一覧です。これらを裏付ける束は[value-lattice.md](../value-lattice/)にあります。ここで参照される演算子（`~T`、`T - U`、`T?`）は[type-operators.md](../type-operators/)で定義されています。`Dynamic[T]`の代数は[special-types.md](../special-types/)にあります。

## 規則

- ネストされたユニオンと積をフラット化する。
- 重複するユニオンと積のオペランドを除去する。
- ユニオンから`bot`を削除する（`T | bot = T`）。
- 積から`top`を削除する（`T & top = T`）。
- `T?`を内部的に`T | nil`に展開する。
- ドメインが既知の場合、有限集合の差と補完を正規化する。
- 否定的事実は正のドメインに対するスコープ事実として保持する;除外された値だけから正のドメインを導入しない。
- 大きなドメインに対して保持された否定的事実にバジェットを設定し、バジェットが超過したときに表示を広げる（[inference-budgets.md](../inference-budgets/)参照）。
- RBS消去まで（[rbs-erasure.md](../rbs-erasure/)参照）ハッシュシェイプの開放性と読み取り専用マーカーを保持する。
- より明確な場合は**表示**のために`true | false`を`bool`に折り畳む。
- リテラルの精度が大きくなりすぎるか高コストになるまで保持する;その後は名前的ベースに広げる。
- `untyped`を`top`に正規化するのではなく、動的由来のラッパーを明示的に保持する。
- 動的由来のユニオン、積、差は静的ファセットを変換してラッパーを保持することで正規化する。

## 特別な結果の同一性

`void | bot`は結果サマリーで`void`に折り畳まれます。なぜなら`bot`パスは通常値を提供しないからです。完全な`void`対`bot`規則については[special-types.md](../special-types/)を参照してください。

## 決定論性

正規化は決定論的でなければなりません（MUST）。同等の入力は、設定されたバジェットと権威あるシグネチャの変更を除き、実行間および解析器インスタンス間で同一の出力を生成しなければなりません（MUST）。この決定論性が診断、キャッシュ、エクスポートされたシグネチャを編集とCIの実行にわたって比較可能にします。

## 表示との相互作用

正規化はエンジン内部の正規化です。差、補完、動的由来型の診断表示コントラクトは[type-operators.md](../type-operators/)と[diagnostic-policy.md](../diagnostic-policy/)にあります。表示規則は正規化された型をより読みやすく描画する場合がありますが（例: `true | false`の代わりに`bool`を表示）、基礎となる型の同一性を変更してはなりません（MUST NOT）。
