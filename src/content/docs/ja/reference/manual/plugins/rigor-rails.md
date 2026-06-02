---
title: "rigor-rails"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-rails.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rails.md"
sourcePath: "docs/manual/plugins/rigor-rails.md"
sourceSha: "acb8da13b2ef1219e375893d9f0e6fa8bbf2e7bd538283645c14af83cfc68171"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

7つのTier 1+2 Railsエコシステムプラグインを便利にまとめたグループです。これ自体は**チェッカーではなく**、独自の解析は一切行いません。インストールも不要で、各プラグインはすべて`rigortype`にバンドルされて提供されます。

Railsプラグインを有効化するには、使いたいものを`plugins:`の下に列挙します。`rigor-rails`はこのセットを1行で**まとめて有効化することはしません**（こうすることで各プラグインのオプトインをあなたの制御下に保ちます。ルートヘルパーをあまり使わないアプリは`rigor-rails-routes`を省略し、フィクスチャをあまり使わないアプリは`rigor-factorybot`を省略する、といった具合です）。

```yaml
plugins:
  - rigor-rails-routes
  - rigor-rails-i18n
  - rigor-actionmailer
  - rigor-activejob
  - rigor-activerecord
  - rigor-actionpack
  - rigor-factorybot
```

| プラグイン | 対象範囲 |
| --- | --- |
| [rigor-rails-routes](../rigor-rails-routes/) | `*_path` / `*_url`ヘルパーの検証 |
| [rigor-rails-i18n](../rigor-rails-i18n/) | `t('key')`翻訳キーの検証 |
| [rigor-actionmailer](../rigor-actionmailer/) | メーラーアクションの存在・アリティ・ビューテンプレート |
| [rigor-activejob](../rigor-activejob/) | `Job.perform_*`の引数アリティ |
| [rigor-activerecord](../rigor-activerecord/) | ファインダー／リレーションの型付け、スキーマ照合済みカラム |
| [rigor-actionpack](../rigor-actionpack/) | コントローラーヘルパー／フィルタ／レンダー／ストロングパラメータ |
| [rigor-factorybot](../rigor-factorybot/) | ファクトリー＋属性（＋ARカラム）の検証 |

かつて`rigor-rails`はGemfileのメタgemで、`require "rigor-rails"`によって7つのエントリーポイントを一度にすべて読み込んでいました。Rigorの単一バンドルgem配布モデルのもとではこの`require`は冗長です（プラグインはすでに`rigortype`からidで読み込み可能です）。そのため上記の`plugins:`リストが正規のセットアップ方法です。

**Tier 3プラグイン**（`rigor-pundit`、`rigor-sidekiq`、`rigor-rspec`、`rigor-actioncable`、`rigor-activestorage`、`rigor-graphql`）はこのグループには含まれません。プロジェクトの必要に応じて個別に有効化してください。
