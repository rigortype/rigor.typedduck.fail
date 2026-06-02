---
title: "Plugin reference"
description: "Imported from rigortype/rigor docs/manual/plugins/README.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/README.md"
sourcePath: "docs/manual/plugins/README.md"
sourceSha: "9bc72a6dc075cff1703e6ea9c5cb0f8046a1729fd690050d40b27bf1ffc971af"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9000
---

バンドルされている各Rigorプラグインのユーザー向けドキュメントです。何をチェックするか、その設定キー、何を推論するか、そしてその制限事項を扱います。プラグイン全般の*有効化*については[プラグインを使う](../07-plugins/)を、プラグインを*書く*方法については[examples/](https://github.com/rigortype/rigor/blob/master/examples/README.md)のウォークスルーと[`rigor-plugin-author`スキル](../08-skills/)を参照してください。

すべてのプラグインは`rigortype`にバンドルされて提供され、別途のインストールは不要です。すべてのプラグインを1行のスコープ付きで網羅したカタログは[plugins/README.md](https://github.com/rigortype/rigor/blob/master/plugins/README.md)にあります。

## 利用可能なページ

- [rigor-activerecord](rigor-activerecord/) — ActiveRecordのファインダー／リレーションの型付けと、スキーマでチェックされるカラム。
- [rigor-rails-routes](rigor-rails-routes/) — パースした`config/routes.rb`に対する`*_path`／`*_url`ヘルパーの検証。
- [rigor-rails-i18n](rigor-rails-i18n/) — `t(...)`／`I18n.t(...)`のキー、ロケールごとのカバレッジ、補間の検証。
- [rigor-actionpack](rigor-actionpack/) — コントローラーのルートヘルパー、フィルタチェーン、レンダーターゲット、ストロングパラメータのキー。
- [rigor-activestorage](rigor-activestorage/) — ARモデル上の`has_*_attached`によるアタッチメントアクセサの型付け。
- [rigor-activejob](rigor-activejob/) — 発見した`#perform`に対する`Job.perform_*`の引数のアリティ（arity）。
- [rigor-actionmailer](rigor-actionmailer/) — メイラーアクションの存在／アリティと、欠落したビューテンプレートの検出。
- [rigor-factorybot](rigor-factorybot/) — `FactoryBot.create`／`build`／…に対するファクトリー＋属性（＋ARカラム）の検証。
- [rigor-rails](rigor-rails/) — Tier 1＋2の7つのRailsプラグインを便宜的にグループ化したもの（それ自体はチェッカーではない）。
- [rigor-dry-types](rigor-dry-types/) — `Types::*`エイリアスの解決。dry-rbの基盤（それ自体の診断はなし）。
- [rigor-dry-struct](rigor-dry-struct/) — `Dry::Struct`の`attribute`リーダーを合成する（dry-typesと併せると精度が上がる）。
- [rigor-dry-schema](rigor-dry-schema/) — dry-schemaの宣言を認識し、型付きキーのテーブルを公開する（ファクトのみ）。
- [rigor-dry-validation](rigor-dry-validation/) — `Dry::Validation::Contract`のサブクラスを認識する。結果APIのRBSオーバーレイ。
- [rigor-sinatra](rigor-sinatra/) — ルートブロックの`self`をナローイング（narrowing）して`params`／`redirect`／`halt`／…が解決できるようにする。
- [rigor-rspec](rigor-rspec/) — RSpecの`let`／`subject`の重複および自己参照チェック。
- [rigor-sorbet](rigor-sorbet/) — 既存のSorbetコードベース（`sig`ブロック、RBI、`T.*`アサーション）を型ソースとして読む（完全なガイド: [ハンドブック第10章](../../handbook/10-sorbet/)）。
- [rigor-devise](rigor-devise/) — `devise :strategy`宣言がモデルにミックスインするメソッドを合成する（診断なし）。
- [rigor-statesman](rigor-statesman/) — `state_machine`ブロックで宣言された状態に対して`transition_to(:state)`を検証する。
- [rigor-mangrove](rigor-mangrove/) — Mangroveの`Result`／`Option`のアンラップ型を鋭利化し、`Enum`バリアントを合成する。
- [rigor-pundit](rigor-pundit/) — ポリシークラスの存在と`authorize(record, :action)`の述語の検証。
- [rigor-sidekiq](rigor-sidekiq/) — 発見した`#perform`に対するSidekiqの`Worker.perform_*`の引数のアリティ。
- [rigor-actioncable](rigor-actioncable/) — `broadcast_to`のチャネルの存在と、`ActionCable.server.broadcast`のストリーム名の検証。
- [rigor-minitest](rigor-minitest/) — Minitest／Test::Unitのアサーションおよびspecマッチャーを通したローカル変数のナローイング。
- [rigor-graphql](rigor-graphql/) — GraphQL-Rubyの型／enum／input／mutationのテーブルの公開（プラグイン横断のファクト、診断なし）。

_プラグインごとのページは、各プラグインのツリー内`README.md`からここへ移行中です。あるプラグインが上記のページを持つまで、そのユーザー向けドキュメントは[`plugins/<name>/README.md`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)にあります。_
