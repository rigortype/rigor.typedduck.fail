---
title: "rigor-activejob"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-activejob.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activejob.md"
sourcePath: "docs/manual/plugins/rigor-activejob.md"
sourceSha: "c9a0328bf5f7324e61dba79485b66e58f4087a1e7324631b32b5670399b31925"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`Job.perform_later(...)`／`.perform_now(...)`／`.perform(...)`の引数のアリティ（arity）を、発見した`#perform`定義に対して検証します。Railsのランタイム依存はありません ── このプラグインはPrism経由でプロジェクトのソースを読むだけです。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化します:

```yaml
plugins:
  - rigor-activejob
```

## 何をチェックするか

`#perform`が必須引数1個と任意引数1個（アリティ`1..2`）を取るジョブがある場合:

```text
demo.rb:6:1:  info:  `WelcomeEmailJob.perform_later` matches `#perform` (arity 1..2)
demo.rb:9:1:  error: `WelcomeEmailJob.perform_later` expects 1..2 argument(s), got 0
demo.rb:12:1: error: `WelcomeEmailJob.perform_later` expects 1..2 argument(s), got 3
```

`*rest`パラメータは上限のないアリティ（`arity 0+`）を生み出します。3つのエントリーポイントすべて ── `perform_later`（非同期）、`perform_now`（同期）、裸の`perform` ── は、同じ`#perform`のエンベロープに対して検証されます。

## 設定

```yaml
plugins:
  - gem: rigor-activejob
    config:
      job_search_paths: ["app/jobs"]                            # default
      job_base_classes: ["ApplicationJob", "ActiveJob::Base"]   # default
```

## 制限事項

- **直接のスーパークラスのみマッチ**。 `BaseJob < ApplicationJob`である状況下での`class WelcomeJob < BaseJob`は、`BaseJob`を`job_base_classes`に追加しない限り発見されません。
- **構文上のアリティ**。 `#perform`のアリティはパラメータリストから読み取られます。`define_method`で構築された`#perform`は対象外です。
- **位置アリティのみ**。必須のキーワード引数は発見器によって記録されますが、呼び出し箇所ではまだ検証されません。

## プラグインの内部

ジョブの発見器／インデックス、キャッシュされた`:job_index`プロデューサー、デモ、そしてこのプラグインが行使する契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activejob/README.md)にあります。プラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
