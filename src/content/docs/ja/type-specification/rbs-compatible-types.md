---
title: "RBS互換型"
description: "rigortype/rigor docs/type-specification/rbs-compatible-types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/rbs-compatible-types.md"
sourcePath: "docs/type-specification/rbs-compatible-types.md"
sourceSha: "27080c9a84920fd39dc3afc7f0543b7f0d0709091d3a0916475d5d8ae9b2dddf"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 2050
---

RigorはRBS構文で文書化されたすべての型形式をサポートします。この文書はRBS形式をRigorの解釈とRBS消去にマッピングする権威あるテーブルです。

ハッシュシェイプ（shape）消去アルゴリズムを含む完全な消去規則は[rbs-erasure.md](../rbs-erasure/)にあります。RBSを超えるRigor専用の形式は[rigor-extensions.md](../rigor-extensions/)にリストされています。予約済み組み込みリファインメント（refinement、篩型とも）名は[imported-built-in-types.md](../imported-built-in-types/)にあります。

## 形式テーブル

| RBS形式 | Rigorの解釈 | RBS消去 |
| --- | --- | --- |
| `C`、`C[A]` | 名前的インスタンス型 | 同じ |
| `_I`、`_I[A]` | インターフェース型 | 同じ |
| `alias`、`alias[A]` | エイリアス参照、必要に応じて展開 | 同じまたは展開されたエイリアス |
| `singleton(C)` | シングルトンクラスオブジェクト型 | 同じ |
| string、symbol、integer、`true`、`false`リテラル | リテラルシングルトン型 | 同じ |
| `A \| B` | ユニオン型（union type、合併型とも） | 消去されたオペランドの後に同じ |
| `A & B` | インターセクション型（intersection type、交叉型とも） | 消去されたオペランドの後に同じ |
| `T?` | `T \| nil` | 有効なときはオプショナル構文、そうでなければユニオン |
| `{ key: T }` | 既知キーのハッシュレコード | 同じ |
| `[A, B]` | 固定アリティの配列タプル | 同じ |
| 型変数 | 境界と変性を持つスコープ型変数 | 同じ |
| `self` | selfコンテキストでのオープン再帰レシーバー型 | RBSコンテキストが許す場合に同じ |
| `instance` | classish-contextでの現在のクラスインスタンス型 | RBSコンテキストが許す場合に同じ |
| `class` | classish-contextでの現在のクラスシングルトン型 | RBSコンテキストが許す場合に同じ |
| `bool` | `true \| false`のエイリアス | `bool` |
| `nil` | シングルトン`nil`値 | `nil` |
| `untyped` | 動的型 | `untyped` |
| `top` | 最大の静的値型 | `top` |
| `bot` | 空型 | `bot` |
| `void` | 戻り値位置の「使用しない」結果マーカー | 有効な場所では`void`、そうでなければ診断付きで`top` |
| proc型 | 呼び出し可能オブジェクト型 | 消去されたオペランドの後に同じ |

## コンテキスト制限

`self`、`instance`、`class`、`void`はRBSにコンテキスト制限があります。Rigorは内部的により豊かなコンテキスト情報を保持できますが（MAY）、エクスポートされたRBSはそれらの制限を守らなければなりません（MUST）。

- `self`、`instance`、`class`: それぞれのclassishまたはselfコンテキストでのみ有効。RigorはRBSが受け付ける場所でのみそれらを出力しなければなりません（MUST）。
- `void`: メソッドとprocの戻り値位置、およびインポートされたシグネチャからそれを持つジェネリックスロットで有効。値コンテキストルールとインポートされたRBSルールについては[special-types.md](../special-types/)を参照してください。

内部型が無効なRBSコンテキストでこれらのマーカーのいずれかを含む場合、消去パスは最も近い有効な保守的型に書き直し、精度損失を報告しなければなりません（MUST）。エクスポート中の精度損失の診断ポリシーは[diagnostic-policy.md](../diagnostic-policy/)にあります。

## 個別形式の注記

### オプショナル

`T?`は内部的に`T | nil`に正規化されます（[normalization.md](../normalization/)参照）。エクスポート時、Rigorは有効なときは`T?`構文を優先すべきです（SHOULD）;そうでなければ明示的なユニオンにフォールバックします。

### レコードとタプル

RBSレコード（`{ key: T }`）とタプル（`[A, B]`）は正確な形式として受け付けられます。Rigorの内部ハッシュと配列シェイプ（[structural-interfaces-and-object-shapes.md](../structural-interfaces-and-object-shapes/)参照）はこれらのRBS形式を必須/オプショナル/追加キーポリシーと読み取り専用マーカーで拡張します;それらの拡張は決定論的に消去されます（[rbs-erasure.md](../rbs-erasure/)参照）。

### 型変数

RBSからの型変数の境界と宣言サイトの変性は保持されます。メソッド本体を通じたジェネリック保持 — 例えばメソッドが受け取ったのと同じパラメータオブジェクトを返すとき`[S < _RewindableStream] (S stream) -> S`を推論する — はRigorの推論挙動であり、新しい表面形式ではありません。[structural-interfaces-and-object-shapes.md](../structural-interfaces-and-object-shapes/)を参照してください。

### `bool`対真偽性

`bool`は`true | false`のリテラルエイリアスです。Rubyの真偽性は任意の値を受け付けます。Rigorは真偽性をフロー述語としてモデル化します。`bool`に広げることはしません。[special-types.md](../special-types/)と[control-flow-analysis.md](../control-flow-analysis/)を参照してください。

### `untyped`

`untyped`はRBS境界で両方向に保持されます。内部精密表現は`Dynamic[top]`で、完全な代数は[value-lattice.md](../value-lattice/)にあります。RBSからRigorへのラウンドトリップとその逆は正確です。
