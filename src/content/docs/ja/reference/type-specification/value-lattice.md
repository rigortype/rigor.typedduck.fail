---
title: "値束（Value Lattice）"
description: "rigortype/rigor docs/type-specification/value-lattice.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/value-lattice.md"
sourcePath: "docs/type-specification/value-lattice.md"
sourceSha: "fd81eaa7793c6405884c3324c0ccc997ab07959f3b42b9c61a6d9c157139e626"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 2050
---

この文書はRigorが内部で使う値束（value lattice）を定義します。サブタイピング（subtyping）、正規化、ナローイング（narrowing）、消去はすべてこれを基盤としています。

## 通常の値束

通常の値束は以下を持ちます:

- すべてのRuby値に対する最大型としての`top`。
- 到達不能または不可能な値に対する空型としての`bot`。
- その間にある名前的型（nominal type、公称型とも）、構造型（structural）、リテラル型、ユニオン型（union type、合併型とも）、インターセクション型（intersection type、交叉型とも）、タプル型、レコード型、proc型、リファインメント型（refinement type、篩型とも）。

重要な同一性:

```text
bot <: T
T <: top
T | bot = T
T & top = T
T | top = top
T & bot = bot
```

これらの同一性は規範的であり、正規化（[normalization.md](../normalization/)参照）に使われます。

## `Dynamic[T]`と動的由来の代数

`untyped`は意図的に通常の値束の外に置かれています。Rigorは動的境界を越えた値を`Dynamic[T]`として表現します。ここで`T`は現在既知の静的ファセットです。生のRBS `untyped`は`Dynamic[top]`です。

`Dynamic[T]`は**表面RBS構文ではありません**。通常のユーザーが著作する型として受け付けてはなりません（MUST NOT）。これは2つの事実を組み合わせた内部実装形式です:

- 値が漸進的（gradual）境界を越えたか、チェックされていない情報から来た
- 現在の制御フロー解析がまだ静的ファセット`T`を証明できる

`untyped`、`Dynamic[T]`、漸進的一貫性、および動的由来のprovenanceに基づくストリクトモードの詳細なセマンティクスは[special-types.md](../special-types/)にあります。関係自体は[relations-and-certainty.md](../relations-and-certainty/)にあります。

### 代数的規則

動的由来のジョインは、値が純粋に静的であるかのように見せかけるのではなく、マーカーを保持します:

```text
Dynamic[A] | Dynamic[B] = Dynamic[A | B]
T | Dynamic[U]          = Dynamic[T | U]
```

動的由来の積と差は精度とprovenanceの両方を保持します:

```text
Dynamic[T] & U = Dynamic[T & U]
Dynamic[T] - U = Dynamic[T - U]
```

`U`が`top`のとき、結果は`untyped`と表示される場合がありますが（MAY）、内部形式は動的由来のprovenanceを引き続き記録しなければなりません（MUST）。診断表示規則は[diagnostic-policy.md](../diagnostic-policy/)にあります。

### 実例

`untyped & String`は、普通の`String`でも生の`untyped`でもなく`Dynamic[String]`になります。信頼できるガードが`Dynamic[top]`を`Dynamic[String]`にナローイングする場合があります。`upcase`のようなメソッド呼び出しはその後`String`のメソッド事実を使える場合があります。レシーバーはチェックされていないソースに追跡可能なままで、診断は呼び出しが動的由来の事実によって可能になったことを記録できます（MAY）。

### ジェネリック位置

ジェネリック位置は動的由来のスロットを保持します。例えば`Array[untyped]`は内部的に`Array[Dynamic[top]]`であり、**`Array[top]`ではありません**。要素を読み取ると`Dynamic[top]`が返ります。要素の書き込みは漸進的一貫性に従い、ストリクトモードはコレクションがチェックされていない値を保持することを報告できます（MAY）。同じルールがハッシュ、タプル、レコード、procのパラメーターと戻り値、シェイプメンバーに適用されます。

### ラウンドトリップ保持

動的由来ラッパーはRBS境界で可逆です。`Dynamic[top]`は`untyped`にラウンドトリップし、保持されたジェネリックスロットは同じ形状でラウンドトリップします。これが`untyped`が参加する場合でもRBS→Rigor方向が無損失である理由です。無損失/有損失契約については[overview.md](../overview/)を、エクスポート側については[rbs-erasure.md](../rbs-erasure/)を参照してください。

## 束を使った作業

- サブタイピングは`Dynamic[T]`の静的ファセットを使います。漸進的一貫性はチェックされていない越境を管理します（[relations-and-certainty.md](../relations-and-certainty/)参照）。
- 正規化は診断、キャッシュ、エクスポートされたシグネチャが安定するように決定論的でなければなりません（MUST）。完全な正規化規則セットは[normalization.md](../normalization/)にあります。
- ナローイングはエッジを意識したスコープを通じて束の上で動作します（[control-flow-analysis.md](../control-flow-analysis/)参照）。否定的事実は[type-operators.md](../type-operators/)の演算子を使って表現され、除外された値だけから正のドメインを導入することはありません。
