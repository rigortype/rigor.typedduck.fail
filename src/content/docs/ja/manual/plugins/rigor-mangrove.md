---
title: "rigor-mangrove"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-mangrove.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-mangrove.md"
sourcePath: "docs/manual/plugins/rigor-mangrove.md"
sourceSha: "131cea87f4ddd158e28b879fc972bddf6bfddbcf9f34f91c16569966db58da1e"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

[Mangrove](https://github.com/)の`Result`／`Option`のunwrap系の戻り値の型を、`untyped`から呼び出し箇所で運ばれている具体的な型引数へと先鋭化し、さらに`Enum`の`variants do … end`DSLがランタイムで生成するサブクラスを合成して、それらが静的に解決されるようにします。[`rigor-sorbet`](../rigor-sorbet/)（Mangroveの`sig`／RBIサーフェスを取り込む）の上に重ねて動作します。このプラグインは、sigレベルの型では到達できない2つの精度向上ステップを追加します。ランタイム依存はありません。

`rigortype`にバンドルされて配布されます。`plugins:`の下で（キャリア（carrier）型を供給する`rigor-sorbet`とともに）有効化します。

```yaml
plugins:
  - rigor-sorbet
  - rigor-mangrove
```

## 何を推論するか — 診断なし、設定なし

このプラグインは独自の診断を発行せず、設定も持ちません。2箇所で型を提供します。その後、エンジンの通常のメソッド存在チェックが、今や既知となった型に対するタイプミスを捕捉します。

**unwrap系の戻り値の型**。レシーバーが型引数を運んでいるMangroveのキャリアである場合、unwrapの戻り値はその引数にナローイング（narrowing）されます。

```ruby
# token : Result::Ok[String, StandardError]
session.token.unwrap!.uppercaze   # error: String に対して未定義のメソッド `uppercaze'
```

**Enumバリアントの合成（ADR-36のSlice A）**。 `variants`DSLはランタイムでネストされたサブクラスを発行します。プラグインはそれらを静的に合成します ── バリアント定数が解決され、`.new`がディスパッチされ、型付けされた`#inner`リーダーが宣言されたペイロード型を返します。

```ruby
class Shape
  extend Mangrove::Enum
  variants do
    variant Circle, Float
  end
end

Shape::Circle.new(1.5).inner.floor                # ok — Float
Shape::Circle.new(1.5).inner.no_such_float_method # error: Float に対して未定義
```

## 制限事項

- **コンストラクタからのジェネリック推論はない**。 `Result::Ok.new("x")`は型引数のないキャリアを生むため、そこでのunwrapは何も提供しません（保守的なno-opであり、偽陽性は決して起こりません）。
- **ダウンキャストのナローイングは型引数を保持しない（ADR-36のSlice B、保留）**。 `is_a?`を介して親のジェネリックをバリアントへナローイングしても、継承エッジを通して型引数が運ばれることはまだありません。
- **定数でないペイロードのシェイプは劣化する**。ペイロードがシェイプ（shape）ハッシュ（`{ name: String }`）であるバリアントは、`Dynamic[Top]`にフォールバックします。

## プラグインの内部

キャリアジェネリックのインスタンス化、`NestedClassTemplate`によるバリアント合成、そして`rigor-sorbet`との関係は、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-mangrove/README.md)にあります。合成のtierは[ADR-36](../../../adr/36-mangrove-enum-nested-class-emission/)です。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
