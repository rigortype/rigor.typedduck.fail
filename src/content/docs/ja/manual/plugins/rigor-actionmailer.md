---
title: "rigor-actionmailer"
description: "rigortype/rigor docs/manual/plugins/rigor-actionmailer.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-actionmailer.md"
sourcePath: "docs/manual/plugins/rigor-actionmailer.md"
sourceSha: "0620017845b9f1e6c5a59d814da104081a0509147dcdd4f932304584e7b3f990"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`Mailer.action(args).deliver_*`の呼び出し箇所について、アクションの存在と引数のアリティを検証し、`app/views/`配下にビューテンプレートが存在しないメーラーアクションを指摘します。`include`されたconcernモジュールから継承されたアクションはメーラーのアクション集合にマージされるため、`include`した`Emails::*`concernからアクションを導出するメーラーでも型チェックが通ります。Railsランタイムへの依存はありません。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-actionmailer
```

## チェック内容

```text
demo.rb:7:1:  info:  `UserMailer.welcome` matches mailer action (arity 1..2)
errors_demo.rb:7:1:  error: `UserMailer.welcome` expects 1..2 argument(s), got 0
errors_demo.rb:15:1: error: `UserMailer.does_not_exist` is not a defined mailer action (known actions: digest, reset_password, welcome)
app/mailers/user_mailer.rb:14:7: warning: `UserMailer#digest` has no view template under `app/views/user_mailer/`
```

1. **アクションの存在**: `Mailer.unknown_action(...)` → `unknown-action`（未解決の`include`がある場合は、推測する代わりにこれを抑制します）。
2. **引数のアリティ**: 位置引数が少なすぎる／多すぎる → `wrong-arity`。
3. **ビューテンプレートの存在**: 各アクションには少なくとも1つの`app/views/<mailer_underscore>/<action>.{html,text}.{erb,haml,slim}`が必要です。存在しない場合は`missing-view`となり、アクションの`def`にアンカーされます。

認識される呼び出し形は次のとおりです。直接のアクション呼び出し（`UserMailer.welcome(user)`）、`.with(...)`チェーン（`UserMailer.with(user: u).welcome(user)`）、末尾の`.deliver_now` / `.deliver_later`（受け入れられますが、解釈はされません）。

## 設定

```yaml
plugins:
  - gem: rigor-actionmailer
    config:
      mailer_search_paths: ["app/mailers"]                            # default
      mailer_base_classes: ["ApplicationMailer", "ActionMailer::Base"] # default
      views_root: "app/views"                                         # default
```

## 制限事項

- **直接の親クラスのマッチのみ**。`BaseMailer < ApplicationMailer`であるような`class CustomerMailer < BaseMailer`は、`BaseMailer`が`mailer_base_classes`に含まれていない限り発見されません。（`include`されたconcern*モジュール*由来のアクションはマージされます。これは親クラスチェーンに関する話です。）
- **構文的なアクションリスト**。アクションはインスタンス側の`def`から読み取られます。`define_method`、`initialize`、`_`始まりの名前は除外されます。
- **標準のビューファイル名パターンのみ**（`<action>.{html,text}.{erb,haml,slim}`）。カスタムエンジン／ビューパスは対象外です。
- 真新しいビューファイルは、メーラーファイルが参照する何かが変わるまでキャッシュされたインデックスを無効化しません（リード追跡のトレードオフです）。

## プラグイン内部

メーラー／concernのディスカバラー、キャッシュされた`:mailer_index`プロデューサー、デモ、そしてこのプラグインが利用する契約のサーフェスについては、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-actionmailer/README.md)を参照してください。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
