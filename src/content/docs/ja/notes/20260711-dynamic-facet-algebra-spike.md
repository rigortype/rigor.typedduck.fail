---
title: "Dynamic-origin代数 —— 実装スパイク + 計測（2026-07-11）"
description: "rigortype/rigor docs/notes/20260711-dynamic-facet-algebra-spike.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-dynamic-facet-algebra-spike.md"
sourcePath: "docs/notes/20260711-dynamic-facet-algebra-spike.md"
sourceSha: "5c388ec8a01d8f53c5876385eee6fc825f1c74c1471348616b29b8171e641c51"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

[ADR-83](../../adr/83-dynamic-origin-algebra/)の裏付けノート。2026-07-11の仕様対実装監査（[型仕様台帳](../20260711-docs-audit-type-spec/)）は、`value-lattice.md`の§「Algebraic rules」がエンジンの実装していないDynamic-origin代数を規定していることを指摘した。本ノートは、それを実装する価値があるかを計測したスパイクを記録する。結論: **否** —— 何も実装せず、仕様を改訂せよ。

## 乖離

`value-lattice.md`は3つの規範的（normative）恒等式を規定する:

```text
Dynamic[A] | Dynamic[B] = Dynamic[A | B]        (join / union)
T | Dynamic[U]          = Dynamic[T | U]         (join / union)
Dynamic[T] & U          = Dynamic[T & U]         (meet / intersection)
Dynamic[T] - U          = Dynamic[T - U]         (difference)
```

`Type::Combinator`（`lib/rigor/type/combinator.rb`）はそのいずれも適用しない。`union`・`intersection`・`difference`は`Dynamic`オペランドを通常のメンバーとして扱う。その結果、エンジンは次を生成する:

| 式 | 仕様 | エンジン（現状） |
| --- | --- | --- |
| `Dynamic[Int] \| Dynamic[Str]` | `Dynamic[Integer \| String]` | `Union[Dynamic[Integer], Dynamic[String]]` |
| `String \| Dynamic[Int]` | `Dynamic[Integer \| String]` | `Union[String, Dynamic[Integer]]` |
| `untyped & String` | `Dynamic[String]` | `Intersection[Dynamic[top], String]` |

## スパイク

3つの恒等式すべてを`Combinator`に実装した（`Dynamic`オペランドを静的ファセット（facet）へアンラップし、結合し、`dynamic(...)`で再ラップする）。この変換が仕様を再現することを確認した:

```
Dynamic[Int] | Dynamic[Str] → Dynamic[Integer | String]
String | Dynamic[Int]       → Dynamic[Integer | String]
untyped & String            → Dynamic[String]
top | Dynamic[Int]          → Dynamic[top]
```

続いて、実コードへの影響を計測した:

| 計測項目 | ベースライン（master） | スパイク | 差分 |
| --- | --- | --- | --- |
| セルフチェック `rigor check lib`（エラー/警告行数） | 0 | 0 | **同一** |
| `lib`のカバレッジ `precise_ratio` | 0.5632 | 0.5632 | **同一**（dynamic_opaque +26 —— わずかに*より*不透明） |
| Mastodon `app/models` の診断 | 5 | 5 | **同一** |
| 壊れた `spec/rigor/{type,inference}` ユニットスペック | — | 3 | 現在のユニオンアーム挙動をエンコード |

**ユーザーから見える影響はゼロ。** この変換はunion↔dynamicの表現を組み替えるだけで、Rigor自身のコードでも実際のRailsコーパスでも、いかなる診断も精度比も変えない。

## 3つの規則が割に合わない理由

1. **Join（`T | Dynamic[U] = Dynamic[T|U]`）** は具体的なユニオンアームを`Dynamic`*の中へ*吸収する —— これは精度にとってマイナスの方向であり（`lib`でdynamic_opaqueが増加）、ADR-82/ADR-67の保護優先の方向に反する。個別のユニオンアームを保つ方が精度が高く*かつ*由来もよく伝わる（どのアームがdynamicかが分かる）。現在の挙動の方が優れた設計である。
2. **Meet（`Dynamic[T] & U = Dynamic[T&U]`）** は唯一の精度プラスの規則だが（`untyped`を使えるファセットへナローイングする）、フローナローイングはすでに*それ以上*のことをしている。`narrowing.rb:2317`は`is_a?(String)`の下で`Dynamic[top]`レシーバーを`Nominal[String]`へナローイングする —— 完全な具体化であり、ガードされたレシーバーを**保護済み**にする。由来を保つ`Dynamic[String]`形が意味を持つのは、将来のstrict-dynamic規律（ADR-75 WD4、需要ゲート付き）に対してだけであり、今日それを採用すれば保護を*後退させる*（ナローイングされたレシーバーが`Dynamic`＝非保護へフォールバックしてしまう）。
3. **Difference** はin-treeの呼び出し元が1つだけ（`narrowing.rb:613`、リファインメントナローイング）で、そこでは変換は無意味である。

## それでも実装した場合のコスト／リスク

`union` / `intersection` は最もホットなパスである。この変換は呼び出しごとに`Dynamic`スキャン + 再帰を追加し、その見返りはゼロだ。加えて根本的な型結合の不変条件を変えてしまい（影響範囲が広い）、`Union[concrete, Dynamic]`が具体アームを保つことに依存する潜在的なパスを黙って劣化させかねない。

## 結論

実装するな。乖離は、実際の（意図的により優れた）挙動を記述するよう仕様を改訂することで解消せよ。joinはユニオンアームを個別に保ち、ナローイングはガードされた`Dynamic`を具体化する。創成期のDynamic-origin join代数は取って代わられた。ADR-83として記録する。
