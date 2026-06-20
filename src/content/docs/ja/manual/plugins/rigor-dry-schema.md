---
title: "rigor-dry-schema"
description: "rigortype/rigor docs/manual/plugins/rigor-dry-schema.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-dry-schema.md"
sourcePath: "docs/manual/plugins/rigor-dry-schema.md"
sourceSha: "58a16335c33ae2f43f6b3c453aa80e86afd3d604a33fcbd1040de9ae9b4c4ba5"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

dry-schemaの宣言を認識し、スキーマごとの型付きキーテーブルをクロスプラグインのファクト（fact、`:dry_schema_table`）として公開します。`rigor-dry-validation`はこれを消費して型付きペイロードを合成します。[`rigor-dry-types`](../rigor-dry-types/)と同様、これは基盤プラグインです。独自のdiagnosticは持たず、configキーもありません。

`rigortype`にバンドルされて配布されます。有効化するには次のようにします（述語の引数内の`Types::*`エイリアスを解決するには`rigor-dry-types`と組み合わせます）。

```yaml
plugins:
  - rigor-dry-types     # optional: resolves Types::Email etc.
  - rigor-dry-schema
```

## 認識する対象

```ruby
NewUserSchema = Dry::Schema.Params do
  required(:email).filled(:string)
  required(:age).value(:integer)
  required(:tags).each(:string)
  optional(:nickname).maybe(:string)
end
```

- `required` / `optional`キー。述語の型シンボルはRubyのクラスにマッピングされます（`:string` → `String`、`:integer` → `Integer`、`:decimal` → `BigDecimal`、`:bool` → `TrueClass`、…）。
- `each(:T)`はそのキーを**リスト**としてマークします（`list: true`）。`filled` / `value` / `maybe`はスカラーです（`list: false`）。
- `value(Types::Email)`は`rigor-dry-types`がロードされているとき`:dry_type_aliases`ファクトを通じて解決されます。それがない場合（または未知の参照の場合）は、下流の消費者を誤らせるよりも、その行をテーブルから外します。
- トップレベル（`Foo = Dry::Schema.Params { … }`）およびクラスレベル（`class Bar; SCHEMA = …; end` → `"Bar::SCHEMA"`）の宣言。`.Params` / `.JSON` / `.define`のいずれにも対応します。

## diagnosticもconfigもなし

このプラグインは、他のプラグインが消費するためのスキーマテーブルを公開するだけです。diagnosticは一切表面化させず、configキーも受け付けません。（将来のスライス（slice）で`dry-schema.unknown-predicate` / `unknown-type` info diagnosticと型付き`result.to_h`合成が追加されます。）

## プラグインの内部構造

`prepare(services)`のスキャン、公開される`:dry_schema_table`のシェイプ（shape）、そしてスライスのfloor/ceilingについては[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-dry-schema/README.md)に記載されています。プラグインを書くには[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
