---
title: "rigor-graphql"
description: "rigortype/rigor docs/manual/plugins/rigor-graphql.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-graphql.md"
sourcePath: "docs/manual/plugins/rigor-graphql.md"
sourceSha: "78ed379697ee0e6aadb35723b32750d7dae171b4d1c12df566691f8bf625a690"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

GraphQL-Rubyのスキーマクラス（`Schema::Object`、`Schema::Enum`、`Schema::InputObject`、`Schema::Mutation`のサブクラス）を認識し、それらの`field` / `value` / `argument`のDSL宣言を走査して、得られた型テーブルを下流のプラグインが消費できる[ADR-9](../../../adr/9-cross-plugin-api/)のクロスプラグインファクト（fact）として公開します。graphql-rubyの`field`DSLは純粋なメタデータレコーダー（Rubyメソッドを一切合成しません）であるため、ここでのRigorの価値はメソッドの合成ではなく静的な型テーブルにあります。ソースを読むだけで、`graphql`ランタイムへの依存はありません。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-graphql
```

## 推論する内容

```ruby
module Types
  class User < GraphQL::Schema::Object
    field :name, String, null: false
    field :email, String, null: true
    field :tags, [String], null: false   # list-of form
  end
end
```

は`:graphql_type_table`ファクトを公開します。

```ruby
{
  "Types::User" => {
    "name"  => { type: "String", nullable: false, list: false },
    "email" => { type: "String", nullable: true,  list: false },
    "tags"  => { type: "String", nullable: false, list: true }
  }
}
```

1回のプロジェクト走査から4つの独立したファクトを公開します。1つだけ（あるいは1つも）必要としない消費者は、他のファクトの影響を受けません。

| ファクト | ソースクラス | シェイプ |
| --- | --- | --- |
| `:graphql_type_table` | `Schema::Object` | `field` → `{type, nullable, list}` |
| `:graphql_enum_table` | `Schema::Enum` | `value "..."` → 順序づけられた値のリスト |
| `:graphql_input_object_table` | `Schema::InputObject` | `argument` → `{type, required, list}` |
| `:graphql_mutation_table` | `Schema::Mutation` | `{arguments:, fields:}`を結合 |

正規のGraphQLスカラーはRubyのクラスにマッピングされます（`String`→`String`、`Integer`/`Int`→`Integer`、`Boolean`→`TrueClass`、`Float`→`Float`、`ID`→`String`）。ユーザー定義型は完全修飾名で記録されます。`null:`は`nullable:`として抽出されます（graphql-rubyに倣ってデフォルトは`true`）。`required:`のデフォルトは`false`です。単一要素の`[String]`リスト形が認識されます。

## 診断なし、設定なし

このプラグインは診断を一切出さず、設定のつまみもありません。他のプラグインが消費するために、上記の型テーブルを提供するだけです。スキーマクラスのシェイプを求めて、すべての`paths:`エントリーの`.rb`ファイルを走査します。

## 制限事項

- **リゾルバメソッドの型チェックなし**。`field`宣言はメタデータとして記録されますが、それらを裏付けるRubyのリゾルバメソッドとはまだ相互参照されません。
- **`Schema.execute(...)`の結果の型付けなし**。クエリされたフィールドに照らして`Schema.execute(query).to_h`を型付けすることは将来のプラグインです。
- **定数形の型のみ**。文字列形（`field :foo, "User"`）と`<Type>.array` / `<Type>!`の糖衣構文チェーンは認識されません（`[String]`のブラケット形は認識されます）。複数要素および空のリストリテラルは破棄されます。
- **enumのリテラル値のみ**。`value "ACTIVE"`は登録されます。シンボル形（`value :ACTIVE`）と定数形は破棄され、`value:` / `description:`のキーワード引数は一緒に運ばれますがテーブルには載りません。
- **キャッシュのラウンドトリップなし**。走査は呼び出しごとに再実行されます。

## プラグイン内部

型スキャナと、このプラグインが利用する契約のサーフェスについては、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-graphql/README.md)を参照してください。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
