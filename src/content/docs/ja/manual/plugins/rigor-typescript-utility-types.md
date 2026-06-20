---
title: "rigor-typescript-utility-types"
description: "rigortype/rigor docs/manual/plugins/rigor-typescript-utility-types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-typescript-utility-types.md"
sourcePath: "docs/manual/plugins/rigor-typescript-utility-types.md"
sourceSha: "6e1948c94545e5abbe51491622dd84ee4771aa5968f2d4e1ad16880ff8e98ce7"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 9050
---

TypeScript標準のユーティリティ型の綴りを、Rigor独自のシェイプ投影型関数（shape-projection type function）へとマッピングします。これにより、TypeScript / Sorbet RBIから移行してくるコードベースが、`RBS::Extended`アノテーションの中で馴染みのある名前を書けるようになります。[ADR-13](../../../adr/13-typenode-resolver-plugin/)の`TypeNodeResolver`を5つ登録します ── 純粋な変換レイヤーであり、シェイプ（shape）の*セマンティクス*はコアに存在し、そこではあらゆる利用者で共有される単一の仕様所有の定義を持ちます。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-typescript-utility-types
```

> **完全なガイド**。シェイプ投影そのもの ── 各々が何をするか、ロッシー投影（lossy-projection）ルール、TypeScript→Rigorの語彙表 ── は、ハンドブックの[第4章: タプルとハッシュシェイプ](../../../handbook/04-tuples-and-shapes/)の§「Deriving new shapes」と[TypeScript付録](../../../handbook/appendix-typescript/)でカバーされています。このページは運用上のクイックリファレンスです。

## 何を解決するか

| TypeScriptの綴り | Rigorコアの投影 |
| --- | --- |
| `Pick<T, K>` | `pick_of[T, K]` |
| `Omit<T, K>` | `omit_of[T, K]` |
| `Partial<T>` | `partial_of[T]` |
| `Required<T>` | `required_of[T]` |
| `Readonly<T>` | `readonly_of[T]` |

```ruby
class Address
  # @rbs!
  #   %a{rigor:v1:return: Pick[Address::Shape, :name | :email]}
  def public_fields; end
end
```

プラグインが有効になると、`Pick[…]`のヘッドは完全な解決パス（組み込み → プラグインチェーン → RBS Nominalフォールバック）を通じて解決されるため、サブ引数にはRigorの既存の型語彙のいずれを使ってもかまいません。

## 設定なし

このプラグインに設定ノブはありません ── リゾルバチェーンはクラスロード時に登録されます。

## 制限事項

- **マッピングされていないTS名は`Nominal`に格下げされます**。`Parameters<F>`、`ReturnType<F>`、`InstanceType<C>`、`Awaited<P>`、文字列ケーシングユーティリティ（`Uppercase`/`Lowercase`/…）、`ThisParameterType`、`NoInfer`はマッピングされていません ── これらにはまだRigorの対応物がない（あるいは未着手のコア演算子を必要とする）ため、`Nominal[Name, […]]`として解決されます。
- **非シェイプキャリアでロッシーになります**。（`HashShape` / `Tuple`ではなく）裸の`Nominal[Hash, [K, V]]`に投影を適用すると、入力をそのまま返し、呼び出し箇所を監査できるよう`dynamic.shape.lossy-projection`の`:info` diagnosticを記録します。

## プラグインの内部

5つのリゾルバクラス、再帰的な解決メカニズム、ADR-13の`TypeNodeResolver`契約（contract）については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-typescript-utility-types/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
