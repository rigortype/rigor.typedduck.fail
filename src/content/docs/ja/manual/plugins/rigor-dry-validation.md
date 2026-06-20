---
title: "rigor-dry-validation"
description: "rigortype/rigor docs/manual/plugins/rigor-dry-validation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-dry-validation.md"
sourcePath: "docs/manual/plugins/rigor-dry-validation.md"
sourceSha: "984a523cdcbba53d7630055aaa888e6208475e17689fce78b6ed82918bac27e0"
sourceCommit: "6e5bd55274e20dfb59183559c4971d34f878c907"
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

このプラグインは、上記の結果APIに型を付けるRBSオーバーレイ（`sig/dry_validation.rbs`）を同梱しており、**それを自動的に提供します**。プラグインのマニフェストが`signature_paths: ["sig"]`を宣言する（[ADR-25](../../../adr/25-plugin-contributed-rbs/)）ので、`rigor-dry-validation`を有効化するだけで十分です;プロジェクト側の`signature_paths:`配線は不要です。

## diagnosticもconfigもなし

このプラグインは、契約リストとオーバーレイを公開します。diagnosticは一切出さず、configキーも受け付けません。（将来のスライス（slice）で、組み合わせた`rigor-dry-schema`の`params`ブロックからの`result.to_h`の型付けと、契約ごとの`rule`キーのdiagnosticが追加されます。）

## プラグインの内部構造

`prepare(services)`のスキャン、`:dry_validation_contracts`ファクト、RBSオーバーレイ、そしてスライスのfloor/ceilingについては[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-dry-validation/README.md)に記載されています。プラグインを書くには[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
