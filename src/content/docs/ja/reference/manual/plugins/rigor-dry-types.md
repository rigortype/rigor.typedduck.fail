---
title: "rigor-dry-types"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-dry-types.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-dry-types.md"
sourcePath: "docs/manual/plugins/rigor-dry-types.md"
sourceSha: "9f02e4a7501468ef67e19610aadb07f41827b086eac2398f0446a014577a5eb7"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

dry-rbファミリーの基盤プラグインです。標準的なdry-typesのエイリアスモジュール—

```ruby
module Types
  include Dry.Types()
end
```

—を認識し、それが生成するエイリアス名を、基底となるRubyクラスへ解決できるようにします。そしてそれらをクロスプラグインのファクト（fact、`:dry_type_aliases`）として公開します。これは[`rigor-dry-struct`](../../07-plugins/)、`rigor-dry-schema`、`rigor-dry-validation`が消費します。

`rigortype`にバンドルされて配布されます。これを消費するdry-rbプラグインと一緒に有効化します。

```yaml
plugins:
  - rigor-dry-types
  - rigor-dry-struct
  # - rigor-dry-schema / rigor-dry-validation as needed
```

## 独自のdiagnosticはなし

このプラグインは**diagnosticを一切出さず**、**configキーも持ちません**。他のdry-rbプラグインに型情報を供給するだけなので、その目に見える効果はそれらを通じて表面化します（`Types::String`型の属性が下流で解決される、など）。

## 認識する対象

- **標準的なショートカット** — `Types::String` / `Integer` / `Float` / `Decimal` → `BigDecimal` / `Bool` / `Date` / `Hash` / `Array` / `Any` → `Object`、その他。
- **強制変換カテゴリーの名前空間** — `Coercible::` / `Strict::` / `Params::` / `JSON::`配下の同じ名前（基底のクラスは共有し、違いは実行時の強制変換にあります）。
- **ネストしたエイリアスモジュール** — `module App; module Types; include Dry.Types(); end; end`は`App::Types::String`などを公開します。
- **ユーザーが書いた単一ヘッドの合成** — `Email = String.constrained(format: …)`、`Status = Strict::Symbol`、`PositiveInt = Integer.constrained(gt: 0).optional`はヘッドの基底クラスのもとで公開されます。

ユニオン型（union type、`String | Integer`）、インターセクション型（intersection type、交叉型とも）、および他の合成への推移的な参照（`ManagerEmail = Email`）はスキップされます。公開すべき単一の基底クラスが存在しないためです。

## プラグインの内部構造

`prepare(services)`のスキャン、公開される`:dry_type_aliases`テーブル、そしてスライス（slice）のfloor/ceilingについては[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-dry-types/README.md)に記載されています。プラグインを書くには[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
