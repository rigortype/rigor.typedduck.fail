---
title: "ADR-83 — Dynamic-origin代数: `Dynamic`へ吸収せずユニオンアームを保つ"
description: "rigortype/rigor docs/adr/83-dynamic-origin-algebra.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/83-dynamic-origin-algebra.md"
sourcePath: "docs/adr/83-dynamic-origin-algebra.md"
sourceSha: "934298e89ae9b31035d76f76c555db2f70ac75a885f89e759cb873bd3e9c6a98"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 4083
---

ステータス: **Accepted、2026-07-11。** [`value-lattice.md`](../../type-specification/value-lattice/)にある創設期のdynamic-origin **join**代数（`T | Dynamic[U] = Dynamic[T | U]`）は**廃止**された——エンジンは意図的にこれを実装しておらず、スパイクによって実装してもユーザーに見える価値はゼロで、しかも誤った方向を向いている（具体的なユニオンアームを`Dynamic`へ吸収する）ことが確認された。規範的な挙動はエンジンが実際に行うものになる。すなわち`union`は別々のアームを保ち、フローナローイングはガードされた`Dynamic`を具体化する。仕様は同じ変更の中でこれに合わせて改訂される。

根拠: [2026-07-11 dynamic-facet代数スパイク](../../notes/20260711-dynamic-facet-algebra-spike/)（計測）＋この乖離を浮かび上がらせた[2026-07-11 仕様監査台帳](../../notes/20260711-docs-audit-type-spec/)。

## コンテキスト

`value-lattice.md`の§「Algebraic rules」は、value-lattice演算子のdynamic-origin代数を規範として次のように定めている。

```text
Dynamic[A] | Dynamic[B] = Dynamic[A | B]     T | Dynamic[U] = Dynamic[T | U]     (join)
Dynamic[T] & U = Dynamic[T & U]              Dynamic[T] - U = Dynamic[T - U]      (meet / difference)
```

`Type::Combinator`（`lib/rigor/type/combinator.rb`）はこのいずれも適用しない——`union` / `intersection` / `difference`は`Dynamic`オペランドを通常のメンバーとして扱うため、`String | Dynamic[Integer]`は`Union[String, Dynamic[Integer]]`のまま（`Dynamic[Integer | String]`にはならない）であり、`untyped & String`は`Intersection[Dynamic[top], String]`のまま（`Dynamic[String]`にはならない）である。2026-07-11の監査はこれを仕様対実装の乖離として指摘した。このADRはどちら側が権威を持つかを決定する。

## 決定

**創設期のdynamic-origin join代数を実装しない。エンジンの挙動を保ち、仕様をそれに合わせて改訂する。** 現在の挙動は見落としではない——それはより優れた設計であり、スパイクは仕様形式がよくてもinert（不活性）、最悪の場合は精度にマイナスであることを証明している。

**基準——値の結合ルールがその地位を得るのは、どこか計測可能な場所で精度または保護を改善する場合に限る。表現を再正規化するだけのルール、あるいはどの消費者も読まない由来のために精度を犠牲にするルールは採用しない。** dynamic-origin joinは3つの演算子すべてでこれを満たさない。

- **Join**（`T | Dynamic[U]`）は*具体的な*アームを`Dynamic`へ吸収する——精度にマイナスの方向であり、[ADR-82](../82-dynamic-provenance-wiring/) / [ADR-67](../67-parameter-type-inference/)の保護優先の流れに反する。別々のユニオンアーム（`Union[String, Dynamic[Integer]]`）を保つほうが厳密により精密で、より細かい由来（どのアームがdynamicかが分かる）を持つ。これが権威ある挙動である。
- **Meet**（`Dynamic[T] & U`）は唯一の精度プラスのルールだが、フローナローイングはすでに*それ以上*のことを行っている。`narrowing.rb:2317`は`is_a?(String)`のもとで`Dynamic[top]`レシーバーを`Nominal[String]`へナローイングする——完全な具体化であり、これによりガードされたレシーバーは**保護される**。由来を保つ`Dynamic[String]`形式が意味を持つのは、将来のstrict-dynamic規律（[ADR-75](../75-dynamic-provenance/) WD4、需要ゲート付き）に対してのみであり、今日それを採用すると保護が*後退*してしまう。
- **Difference**にはin-treeの呼び出し元が1つある（`narrowing.rb:613`）。この変換は無意味である。

スパイク（根拠ノート）は3つすべてを実装し、**デルタゼロ**を計測した。すなわちセルフチェックの`lib`診断は同一、`lib`のカバレッジ`precise_ratio`は同一（0.5632、dynamic_opaqueは実際には上昇）、Mastodonの`app/models`診断は同一——一方で最もホットなパス（`union` / `intersection`）に`Dynamic`スキャン＋再帰を追加した。

## 却下／延期した代替案

| 選択肢 | 却下理由 |
| --- | --- |
| 仕様に合わせて創設期の代数を実装する | 計測された価値はゼロ。精度にマイナス（具体的なアームを吸収する）。最もホットなパスへの恒久的コスト。根本的な不変条件に対する大きな影響範囲。 |
| 代数を「planned / not yet wired」とマークする（[ADR-41](../41-inference-budget-design/)の誠実マーカーパターン） | 誤解を招く——それは*保留中*の作業ではなく、Rigorが意図的に*望まない*設計である。「Superseded」が誠実なラベルである。 |
| meetルールのみ採用する（由来を保つナローイング`Dynamic[T] & U → Dynamic[T&U]`） | 具体化をやめるために`Combinator`だけでなく*ナローイング*を変更する必要があり、今日の保護を後退させる。その唯一の見返りは需要ゲート付きのstrict-dynamic規律である。それが出荷されるなら[ADR-75](../75-dynamic-provenance/) WD4へ延期する。 |

## 影響

- **プラス:** 仕様がエンジンの持たない挙動を主張するのをやめる。より精密で保護に優しいユニオン保持の挙動が、いまや文書化された契約になる。エンジンの変更なし、リスクなし。
- **マイナス／持ち越し:** strict-dynamic規律（ADR-75 WD4）がいつか構築されるなら、そのとき由来を保つナローイングを再検討しなければならない——meetルールは延期であって恒久的に閉じられたわけではなく、そのADRが再開のトリガーを所有する。
- `RBS`境界のラウンドトリップ（`Dynamic[top] ↔ untyped`、保持されるジェネリックスロット）は影響を受けない——このADRはdynamic-origin型の*表現*や*消去*ではなく、*結合*に関するものである。

## 他のADRとの関係

- [ADR-75](../75-dynamic-provenance/) —— `Dynamic[T]`の由来と、由来を保つナローイングの唯一の将来の消費者である延期されたstrict-dynamic規律を所有する。
- [ADR-82](../82-dynamic-provenance-wiring/) / [ADR-67](../67-parameter-type-inference/) —— joinルールが矛盾する保護優先の方向。
- 規範的な本拠地: [`value-lattice.md`](../../type-specification/value-lattice/)と[`normalization.md`](../../type-specification/normalization/)、このADRと並行して改訂される。
