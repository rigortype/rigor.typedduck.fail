---
title: "プラグインの使用"
description: "rigortype/rigor docs/manual/07-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/07-plugins.md"
sourcePath: "docs/manual/07-plugins.md"
sourceSha: "b0c01a3a1846aa19784e23729ea17ac1f7347979f934b72cf7a96a548f01fe26"
sourceCommit: "1881619b60b29439a03e7a1f8fee266031c9ca10"
translationStatus: "translated"
sidebar:
  order: 9007
---

プラグインはRigorにフレームワーク、gem、またはアプリケーションDSLについて教えます——Railsのルートヘルパー、RSpecの`let`バインディング、dry-rbのstruct属性など、通常の推論では見えないものです。このページはプラグインの*有効化*について説明します。プラグインの作成は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`スキル](../08-skills/)でカバーされています。

## プラグインを有効化する

設定ファイルの`plugins:`キーの下にプラグインを列挙します:

```yaml
plugins:
  - rigor-activerecord
  - rigor-rspec
  - rigor-rails-routes
```

各名前は`rigortype` gem内にバンドル済みのプラグインです——追加のインストールは不要です。`plugins:`の下に列挙するだけで有効化できます。設定が必要なプラグインはオブジェクト形式を使います:

```yaml
plugins:
  - gem: rigor-activerecord
    config:
      schema: db/schema.rb
```

## 利用可能なプラグイン

Rigorは[`plugins/`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)配下にプロダクションプラグインのカタログを同梱しています。リリース間でセットは増えます——現在のリストと各プラグインのオプションはそのディレクトリを参照してください——現在のファミリーは以下のとおりです:

- **Rails** — `rigor-activerecord`、`rigor-actionpack`、`rigor-rails-routes`、`rigor-rails-i18n`、`rigor-actionmailer`、`rigor-activejob`、`rigor-activestorage`、`rigor-actioncable`。`rigor-rails`メタgemはGemfileの利便性のためにRailsセットをバンドルしています。`plugins:`の下に使いたい個別プラグインは引き続き列挙する必要があります。
- **Testing** — `rigor-rspec`、`rigor-rspec-rails`、`rigor-minitest`、`rigor-shoulda-matchers`、`rigor-factorybot`。
- **dry-rb** — `rigor-dry-types`、`rigor-dry-schema`、`rigor-dry-struct`、`rigor-dry-validation`。
- **その他のエコシステム** — `rigor-sinatra`、`rigor-hanami`、`rigor-devise`、`rigor-pundit`、`rigor-sidekiq`、`rigor-graphql`、`rigor-statesman`、`rigor-sorbet`、`rigor-typescript-utility-types`、`rigor-activesupport-core-ext`。

## `plugins/` vs `examples/`

[`plugins/`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)は実際のgemとフレームワーク向けのプロダクションプラグイン——有効化するもの——を保持しています。[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)ツリーは意図的に単純化されたDSL上のチュートリアルプラグインを保持しています。プラグイン作者向けの読み物であり、実際のプロジェクトで有効化するためのものではありません。

## サンドボックス

プラグインはファイル（スキーマダンプ）を読み込んだりネットワークに接続したりしたい場合があります。それらは`plugins_io:`設定キーでゲートされています——ネットワークはデフォルトで`disabled`で、プラグインはリストしたパスのみ読み込めます。[設定](../03-configuration/)を参照してください。
