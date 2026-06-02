---
title: "rigor-rails-routes"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-rails-routes.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rails-routes.md"
sourcePath: "docs/manual/plugins/rigor-rails-routes.md"
sourceSha: "2261e993670f387cd59cea9c234bdd18f54fe49fc8f6a24ff2a7b3168fe077ac"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`config/routes.rb`をPrismで静的に解釈し（Railsランタイムへの依存はありません）、Railsが生成するであろうルートヘルパーテーブルを構築して、すべての`*_path` / `*_url`呼び出し箇所をそれに照らして検証します。不明なヘルパーは（did-you-mean候補つきで）指摘され、引数の個数が誤っている場合も同様です。モデル↔ルートの活用変化には本物の`ActiveSupport::Inflector`を使うため、不規則な名前もRailsが解決するのと同じように解決されます。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-rails-routes
```

## チェック内容

`config/routes.rb`が与えられると、プラグインはRailsが生成するであろうすべてのヘルパーを認識し、呼び出し箇所でのタイプミスやアリティの不一致を指摘します。

```text
file:line:col: info:  `users_path` → GET /users
file:line:col: info:  `admin_widgets_path` → GET /admin/widgets

file:line:col: error: no route helper `widgts_path` (did you mean `users_path`?)
file:line:col: error: `user_path` expects 1 argument(s), got 3
```

`_path`形と`_url`形の両方が認識されます。

### 認識されるルーティングDSL

パーサは、実際のアプリが使うルーティングDSLをカバーします（Mastodon／Redmine／GitLab FOSSに対するv0.1.11 / v0.1.12のOSS調査で拡張されました）。

- `Rails.application.routes.draw do … end`、および`draw :name` / `draw_all :name`による部分ルートファイル。
- `resources` / `resource`（`only:` / `except:`つき）、ネストされたリソース、`member do … end` / `collection do … end`。
- `namespace :admin do … end`と`scope` — 位置引数形式とキーワード`scope(path:, as:, module:)`の両方。`as:`プレフィックスと動的パスセグメントはヘルパーのアリティに数え入れられます。
- `root`、および明示的な`get`/`post`/`patch`/`put`/`delete`ルート（`as:`で名前付け、匿名の静的ルートを含む）。
- `devise_for`、`mount`、`use_doorkeeper`、`with_options`、`direct`、`concern :name do … end`（定義は記録されますが、wrong-arityの偽陽性を避けるため本体はスキップされます）。

## 設定

```yaml
plugins:
  - gem: rigor-rails-routes
    config:
      routes_file: "config/routes.rb"   # default
      helper_paths: ["app"]             # default; dirs scanned for
                                        # project-defined *_path / *_url methods
```

`helper_paths`により、自分で定義したURLビルダー（例えば`app/controllers`や`app/lib`配下のprivateな`def callback_url`）もプラグインに登録できるため、それらへの呼び出しが不明なヘルパーとして指摘されなくなります。

## 提供するもの

解析済みのヘルパーテーブルは`:helper_table`クロスプラグインファクト（fact、ADR-9）として公開され、`rigor-actionpack`がそれを消費してコントローラー内のヘルパー呼び出しを検証します。

## 制限事項

- **静的に展開できないルート定義**。パーサがメタプログラミングを展開できないことで生成されるヘルパー（ランタイムデータに対するループで構築されるルート、パーサがモデル化していないエンジンが注入するヘルパー）は登録されない場合があり、偽の`unknown-helper`が表面化することがあります。それらはベースライン（baseline）に記録するか、その行に`# rigor:disable`を付けてください。
- **プロジェクト固有の活用変化**（`config/initializers/inflections.rb`で宣言されたもの）はまだ取り込まれていません（ADR-39スライス3）。標準のActiveSupportの活用変化はカバーされています。

## プラグイン内部

Prismルートパーサ、キャッシュされた`:helper_table`プロデューサー、デモ、そしてこのプラグインが利用する契約のサーフェスについては、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-rails-routes/README.md)を参照してください。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
