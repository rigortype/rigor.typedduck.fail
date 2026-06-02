---
title: "rigor-dry-validation"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-dry-validation.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-dry-validation.md"
sourcePath: "docs/manual/plugins/rigor-dry-validation.md"
sourceSha: "6f5fcd12ebfb09d49651da7f1ab8e2c16d5c5db26d11779b5a0b59930ca46b2a"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`class T < Dry::Validation::Contract`のサブクラスを認識し、契約（contract）クラス名の集合をクロスプラグインのファクト（fact、`:dry_validation_contracts`）として公開します。さらに、契約の結果API（`Contract#call → Result`、続いて`Result#success?` / `#failure?` / `#to_h` / `#errors` / `#[]`）に型を付けるRBSオーバーレイを同梱します。

`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-dry-validation
```

## 認識する対象

```ruby
class NewUserContract < Dry::Validation::Contract
  params do
    required(:email).filled(:string)
    required(:age).value(:integer)
  end
end
```

このプラグインは、フルパスの`Dry::Validation::Contract`と、字句的な`Dry`の形`Validation::Contract`の両方を認識し、発見した契約名をソートしたリストを公開します。

RBSオーバーレイをロードした状態では（下記参照）、次のようになります。

```ruby
result = NewUserContract.new.call(input)  # Dry::Validation::Result
result.success?                            # bool
result.to_h                                # Hash[Symbol, untyped]
```

## RBSオーバーレイ

このプラグインは、上記の結果APIに型を付けるRBSオーバーレイ（`sig/dry_validation.rbs`）を同梱しています。これをロードするには、オーバーレイの`sig/`ディレクトリが`signature_paths:`に含まれている必要があります。

> **注記（現在のギャップ）**。 [`rigor-activerecord`](../rigor-activerecord/)などの兄弟プラグインは、マニフェストの`signature_paths:`宣言を通じて、バンドルされたRBSを自動的に提供します（[ADR-25](../../../adr/25-plugin-contributed-rbs/)）。`rigor-dry-validation`はまだこれを採用していないため、そのオーバーレイは自動的にはロードされません。採用されるまで、`Result` APIの型は`untyped`にフォールバックします。契約の認識と`:dry_validation_contracts`ファクトはそれに関わらず機能します。

## diagnosticもconfigもなし

このプラグインは、契約リストとオーバーレイを公開します。diagnosticは一切出さず、configキーも受け付けません。（将来のスライス（slice）で、組み合わせた`rigor-dry-schema`の`params`ブロックからの`result.to_h`の型付けと、契約ごとの`rule`キーのdiagnosticが追加されます。）

## プラグインの内部構造

`prepare(services)`のスキャン、`:dry_validation_contracts`ファクト、RBSオーバーレイ、そしてスライスのfloor/ceilingについては[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-dry-validation/README.md)に記載されています。プラグインを書くには[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
