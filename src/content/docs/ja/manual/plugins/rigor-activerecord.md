---
title: "rigor-activerecord"
description: "rigortype/rigor docs/manual/plugins/rigor-activerecord.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activerecord.md"
sourcePath: "docs/manual/plugins/rigor-activerecord.md"
sourceSha: "4ff8f243248f347a3ee33e3ca60cd89753dec5cfdf3171c1f3969dd5b8cc6279"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 9050
---

ActiveRecordのファインダー呼び出しとリレーション呼び出しを、プロジェクトの`db/schema.rb`および発見したモデルクラスに対して型付けします。これにより`User.find(1)`は`User`に、`User.where(emial: …)`は未知のカラムとしてフラグが立ち、`user.posts`はチェーンを通じてその要素型を保持します。このプラグインはソースのみを読みます。`active_record`を決してロードしないため、RigorはRailsから切り離されたままです。

このプラグインは`rigortype`にバンドルされて提供され、別途のインストールは不要です。設定ファイルの`plugins:`の下で有効化します:

```yaml
plugins:
  - rigor-activerecord
```

## 何をチェックするか

```text
demo.rb:20:1: info: `User.find` returns User (table: `users`) [plugin.activerecord.model-call]
demo.rb:23:1: info: `User.where` (:admin) on table `users` [plugin.activerecord.model-call]

errors_demo.rb:13:1: error: `User.where(emial: ...)` references unknown column `emial` on table `users` (did you mean `:email`?) [plugin.activerecord.unknown-column]
errors_demo.rb:25:1: error: `User.find` expects at least 1 argument, got 0 [plugin.activerecord.wrong-arity]
```

| 診断 | 重大度 | ルール |
| --- | --- | --- |
| 認識された`Model.find`／`Model.find_by`／`Model.where`の呼び出し | `:info` | `plugin.activerecord.model-call` |
| `Model.find_by(unknown: ...)`／`Model.where(unknown: ...)` | `:error` | `plugin.activerecord.unknown-column` |
| 引数0個の`Model.find` | `:error` | `plugin.activerecord.wrong-arity` |
| スキーマソース（`db/schema.rb`または`db/structure.sql`）が読み取れない | `:warning` | `plugin.activerecord.load-error` |

「もしかして」候補は、解決されたテーブルのカラム名に対する`DidYouMean`のファジーマッチングを用います。

## 設定

```yaml
plugins:
  - gem: rigor-activerecord
    config:
      schema_file: "db/schema.rb"                                  # default
      structure_sql_file: "db/structure.sql"                       # default (fallback when schema_file is absent)
      model_search_paths: ["app/models"]                           # default
      model_base_classes: ["ApplicationRecord", "ActiveRecord::Base"]  # default
```

キーはすべて任意です。次のような場合に調整します:

- スキーマが別の場所にある（`schema_file: "shared/db/schema.rb"`）。
- プロジェクトが`schema_format = :sql`を使い、そのダンプがデフォルトパスにない（`structure_sql_file: "db/structure.sql"`）。
- モデルが標準外のディレクトリにある（`model_search_paths: ["domain/models", "engines/billing/app/models"]`）。
- ベースクラスがカスタムである（`model_base_classes: ["DbRecord", "ApplicationRecord"]`）。

## 何を推論するか

このプラグインは診断に加えて、呼び出し箇所の型も提供します。クラス側: `User.find(1)` → `User`、`User.find_by(...)` → `User | nil`、`User.find_by!(...)` → 非nullableの`User`。インスタンス側: カラムの読み取り（`user.name`）はそのカラムの値型にナローイングされ、`user.admin?`は`bool`に、単数の関連（`post.user`）はターゲットモデルにナローイングされます。

リレーションを返す呼び出し箇所 ── `User.where(...)`、`User.all`、`User.order(...)`、`has_many`／`has_and_belongs_to_many`のアクセサ（`user.posts`）、ユーザー宣言の`scope`（`Post.published`）── は`ActiveRecord::Relation[Model]`にナローイングされます。チェーンされたクエリメソッドは要素型を保持し、イテレーション（`user.posts.each { |p| ... }`）はモデルを生み出します。型付きリレーションに対して呼び出されたユーザー定義のスコープ（`User.where(...).published`）が、誤った`call.undefined-method`を表面化させることはありません。

## 制限事項

- **直接のスーパークラスのみマッチ**。`User < ApplicationRecord`である状況下での`class Admin < User`は発見されません。`User`を`model_base_classes`に追加するか、すべての具体的なモデルを明示的に列挙してください。
- **PostgreSQLの`db/structure.sql`フォールバック**。`db/schema.rb`がないとき、プラグインは同じカラム／型テーブルのために`db/structure.sql`（`schema_format = :sql`のダンプ）をパースします。PostgreSQL DDLのみを読みます;SQL型にRubyのマッピングがないカラム（カスタムenum、`tsvector`、`ltree`）は`Object`へ降格し（決して落とさない）、`public`以外のスキーマのパーティションテーブルはスキップされます。
- **カラムの読み取りであり、セッターではない**。このプラグインはインスタンス側のカラムの*読み取り*（`user.name`、`user.admin?`）と単数の関連を型付けしますが、`name=`セッターやダーティトラッキング系（`name_changed?`、`name_was`、…）は型付けしません。
- **プロジェクト独自のインフレクションはまだ読み取られない**。モデル↔テーブルの複数形化は本物のActiveSupportインフレクターを通ります（そのため`Person → people`、`Mouse → mice`は解決されます）が、`config/initializers/inflections.rb`で宣言したルールはまだ取り込まれません ── それに依存するモデルには`self.table_name`が必要です（ADR-39スライス3）。

## プラグインの内部

アーキテクチャ（キャッシュされたスキーマパーサ → モデルインデックス → アナライザーのチェーン）、ソースのレイアウト、デモの実行方法、そしてこのプラグインが行使するプラグインの契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activerecord/README.md)に記載されています。自分自身のプラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)のウォークスルーと[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
