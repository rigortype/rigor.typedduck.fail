---
title: "値束（Value Lattice）"
description: "rigortype/rigor docs/type-specification/value-lattice.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/value-lattice.md"
sourcePath: "docs/type-specification/value-lattice.md"
sourceSha: "e245ece1b72c0eee53c8862449a43f3c5d2de74a0b6929393867500ea589bcf7"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
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

Rigorは動的由来のオペランドを結合型へ畳み込**みません**。ユニオンの`Dynamic[T]`オペランドは、他のオペランドを単一の`Dynamic`へ吸収するのではなく、独立したユニオンアームのまま残ります:

```text
Dynamic[A] | Dynamic[B] = Dynamic[A] | Dynamic[B]   (distinct arms, NOT Dynamic[A | B])
T | Dynamic[U]          = T | Dynamic[U]            (the concrete arm T is preserved)
```

アームを独立に保つことは、それらを吸収するより精密です: 具体的なアーム`T`は具体的な型のまま残り——そしてすべてのアームが具体的な箇所では*保護された*ディスパッチのまま残り——一方でprovenanceはアームごとに保たれます（どのアームが境界を越えたかが分かる）。何らかの動的由来アームを持つユニオンはディスパッチにおいて依然として漸進的に妥当なので、漸進的一貫性の保証は変わりません。

ガードされた動的由来の値は、マーカーを積で交えることではなく、それを**具体化する**ことでナローイングされます: `x.is_a?(String)`のような信頼できるガードは、`Dynamic[top]`レシーバーを`Nominal[String]`（完全に具体的で保護された`String`）へナローイングするので、ガードされた呼び出しは`String`のメソッド事実に対して直接解決します。[control-flow-analysis.md](../control-flow-analysis/)を参照。

創設期の動的由来の**ジョイン**代数（`T | Dynamic[U] = Dynamic[T | U]`、具体的なアームを`Dynamic`へ吸収する）と**ミート**規則（`Dynamic[T] & U = Dynamic[T & U]`、provenanceを保存するナローイング）は、この振る舞いによって**置き換えられました** —— 計測と論拠は[ADR-83](../../adr/83-dynamic-origin-algebra/)を参照。provenanceを保存するナローイングは将来のストリクト動的規律（[ADR-75](../../adr/75-dynamic-provenance/) WD4）へ先送りされます;それまではナローイングは具体化します。

### ジェネリック位置

ジェネリック位置は動的由来のスロットを保持します。例えば`Array[untyped]`は内部的に`Array[Dynamic[top]]`であり、**`Array[top]`ではありません**。要素を読み取ると`Dynamic[top]`が返ります。要素の書き込みは漸進的一貫性に従い、ストリクトモードはコレクションがチェックされていない値を保持することを報告できます（MAY）。同じルールがハッシュ、タプル、レコード、procのパラメータと戻り値、シェイプ（shape）メンバーに適用されます。

### ラウンドトリップ保持

動的由来ラッパーはRBS境界で可逆です。`Dynamic[top]`は`untyped`にラウンドトリップし、保持されたジェネリックスロットは同じ形状でラウンドトリップします。これが`untyped`が参加する場合でもRBS→Rigor方向が無損失である理由です。無損失/有損失契約（contract）については[overview.md](../overview/)を、エクスポート側については[rbs-erasure.md](../rbs-erasure/)を参照してください。

## 束を使った作業

- サブタイピングは`Dynamic[T]`の静的ファセットを使います。漸進的一貫性はチェックされていない越境を管理します（[relations-and-certainty.md](../relations-and-certainty/)参照）。
- 正規化は診断、キャッシュ、エクスポートされたシグネチャが安定するように決定論的でなければなりません（MUST）。完全な正規化規則セットは[normalization.md](../normalization/)にあります。
- ナローイングはエッジを意識したスコープを通じて束の上で動作します（[control-flow-analysis.md](../control-flow-analysis/)参照）。否定的事実は[type-operators.md](../type-operators/)の演算子を使って表現され、除外された値だけから正のドメインを導入することはありません。
