---
title: "正規化"
description: "rigortype/rigor docs/type-specification/normalization.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/normalization.md"
sourcePath: "docs/type-specification/normalization.md"
sourceSha: "9fadd038d43edb06ae0dc97e74fb2d74ac54bc6f5097bfe489bdf47c6542c994"
sourceCommit: "636f8725dd79aab2f711249ace6357a98b7e73a4"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorは比較と報告の前に型を正規化します。正規化は診断、キャッシュ、エクスポートされたシグネチャが安定するように決定論的でなければなりません（MUST）。

この文書は正規化規則の権威ある一覧です。これらを裏付ける束は[value-lattice.md](../value-lattice/)にあります。ここで参照される演算子（`~T`、`T - U`、`T?`）は[type-operators.md](../type-operators/)で定義されています。`Dynamic[T]`の代数は[special-types.md](../special-types/)にあります。

## 規則

- ネストされたユニオン（union、合併型とも）と積をフラット化する。
- 重複するユニオンと積のオペランドを除去する。
- ユニオンから`bot`を削除する（`T | bot = T`）。
- 積から`top`を削除する（`T & top = T`）。
- `T?`を内部的に`T | nil`に展開する。
- ドメインが既知の場合、有限集合の差と補完を正規化する。
- 否定的事実は正のドメインに対するスコープ事実として保持する;除外された値だけから正のドメインを導入しない。
- 大きなドメインに対して保持された否定的事実にバジェットを設定し、バジェットが超過したときに表示を広げる（[inference-budgets.md](../inference-budgets/)参照）。
- RBS消去まで（[rbs-erasure.md](../rbs-erasure/)参照）ハッシュシェイプ（shape）の開放性と読み取り専用マーカーを保持する。
- より明確な場合は**表示**のために`true | false`を`bool`に折り畳む。
- リテラルの精度が大きくなりすぎるか高コストになるまで保持する;その後は名前的ベースに広げる。
- 値ピン留めされたユニオンメンバーを、同居する名前的ベースへ包摂折り畳みしない: `1 | Integer`は`1 | Integer`のまま。値ピン留めされたメンバーは、独自の由来を持つ到達可能な正確値を記録している——典型的にはゼロ反復シードまたは再帰の基底ケース（`0..N`反復のアキュムレータ本体に先行する`result = 1`;再帰的戻り値サマリーの`n <= 1`アーム）——折り畳めばその証拠が表示からも値認識のコンシューマーからも消える一方、得るものは何もない（ユニオンは既にベースと外延的に等しい）。そうしたメンバーを広げるのは明示的なキャップ/バジェット拡大規則の仕事であり、ユニオン構築の仕事ではない。
- `untyped`を`top`に正規化するのではなく、動的由来のラッパーを明示的に保持する。
- 動的由来のユニオン、積、差は静的ファセットを変換してラッパーを保持することで正規化する。

## 特別な結果の同一性

`void | bot`は結果サマリーで`void`に折り畳まれます。なぜなら`bot`パスは通常値を提供しないからです。完全な`void`対`bot`規則については[special-types.md](../special-types/)を参照してください。

## 決定論性

正規化は決定論的でなければなりません（MUST）。同等の入力は、設定されたバジェットと権威あるシグネチャの変更を除き、実行間および解析器インスタンス間で同一の出力を生成しなければなりません（MUST）。この決定論性が診断、キャッシュ、エクスポートされたシグネチャを編集とCIの実行にわたって比較可能にします。

## 表示との相互作用

正規化はエンジン内部の正規化です。差、補完、動的由来型の診断表示契約（contract）は[type-operators.md](../type-operators/)と[diagnostic-policy.md](../diagnostic-policy/)にあります。表示規則は正規化された型をより読みやすく描画する場合がありますが（例: `true | false`の代わりに`bool`を表示）、基礎となる型の同一性を変更してはなりません（MUST NOT）。
