---
title: "rigor-dry-struct"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-dry-struct.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-dry-struct.md"
sourcePath: "docs/manual/plugins/rigor-dry-struct.md"
sourceSha: "117d9243592140f6f3ffd87dedc2098c2b50b84f9374d7152d9f524c0c8e3776"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`Dry::Struct`のサブクラスにおけるdry-structのクラスレベルの`attribute :name, Type` / `attribute? :name, Type` DSLを認識し、それが生成するリーダーメソッドを合成します。これにより、別ファイル内の素の`address.city`が`call.undefined-method`に落ちずに解決されます。

`rigortype`にバンドルされて配布されます。有効化し、さらに正確なリーダー型のために[`rigor-dry-types`](../rigor-dry-types/)と組み合わせます。

```yaml
plugins:
  - rigor-dry-struct
  - rigor-dry-types   # optional: resolves Types::String → String on the readers
```

## 何をするか

```ruby
class Address < Dry::Struct
  attribute :city, Types::String
  attribute? :postcode, Types::String
end

address.city      # resolves (synthesised reader)
address.postcode  # resolves
```

[`rigor-dry-types`](../rigor-dry-types/)も有効で、プロジェクトが`module Types; include Dry.Types(); end`を宣言している場合、リーダーの戻り値の型は属性の型引数を通じて解決されます（`attribute :city, Types::String` → `city`は`String`を返す）。dry-typesがロードされていない場合、または解決できないシェイプ（`.constrained(...)`チェーンやインラインの合成）の場合、リーダーは`Dynamic[Top]`にフォールバックします。これは静かに行われ、diagnosticは出ません。

## diagnosticもconfigもなし

このプラグインは、diagnosticではなく合成されたメソッドを提供し、configキーは持ちません。`Dry::Struct`を継承するあらゆるクラスを扱います（字句的・推移的に、あるいはチェーンが上流で終端する場合はRBS環境を通じて）。その目に見える効果は、属性リーダーの呼び出しが型チェックを通ることです。

## 制限

- **リーダーのみ**。 `schema` / `to_h` / `[:key]` / キーワード引数の`.new(name:)`のシェイプはまだ合成されません。
- **ネストしたブロック形式は非対応**。 `attribute :details do … end`（兄弟の`Dry::Struct`サブクラスを生成する）は先送りされています。

## プラグインの内部構造

宣言的な`HeredocTemplate`マニフェスト、`returns_from_arg`の精度パス（ADR-18）、そしてそれが乗っている合成メソッドの基盤については[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-dry-struct/README.md)に記載されています。プラグインを書くには[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
