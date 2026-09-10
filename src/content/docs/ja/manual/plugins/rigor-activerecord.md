---
title: "rigor-activerecord"
description: "rigortype/rigor docs/manual/plugins/rigor-activerecord.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activerecord.md"
sourcePath: "docs/manual/plugins/rigor-activerecord.md"
sourceSha: "9ff627bebe270030802945c08489871894c695ed18f55693c9ce2d966068ba83"
sourceCommit: "db7b23d42e9b47560438b67dfe16d53e03f70575"
sourceDate: "2026-09-09T01:20:05+09:00"
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
demo.rb:18:1: info: `User.find` returns User (table: `users`) [plugin.activerecord.model-call]
demo.rb:21:1: info: `User.where` (:admin) on table `users` [plugin.activerecord.model-call]

errors_demo.rb:12:1: error: `User.where(emial: ...)` references unknown column `emial` on table `users` (did you mean `:email`?) [plugin.activerecord.unknown-column]
errors_demo.rb:24:1: error: `User.find` expects at least 1 argument, got 0 [plugin.activerecord.wrong-arity]
```

| 診断 | 重大度 | ルール |
| --- | --- | --- |
| 認識された`Model.find`／`Model.find_by`／`Model.where`の呼び出し | `:info` | `plugin.activerecord.model-call` |
| `Model.find_by(unknown: ...)`／`Model.where(unknown: ...)` | `:error` | `plugin.activerecord.unknown-column` |
| 引数0個の`Model.find` | `:error` | `plugin.activerecord.wrong-arity` |
| スキーマソース（`db/schema.rb`または`db/structure.sql`）が存在しない——縮退モード | `:info` | `plugin.activerecord.load-error` |
| 存在するが読み取れない、またはパースできないスキーマソース | `:warning` | `plugin.activerecord.load-error` |

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

プロジェクトが`rbs collection install`を通じて`activerecord`もインストールしている場合、コレクションは型パラメータなしの`ActiveRecord::Relation`を宣言し、プラグインは`ActiveRecord::Relation[Elem]`を宣言するため、RBSは両方を保持できません。プラグインの宣言は身を引きます: リレーションの呼び出しサイトは依然として`ActiveRecord::Relation[Model]`として型付けされますが、リレーションへの呼び出しはコレクションの宣言に対して解決されるため、プラグインの要素型付け（たとえば`.first`が`Model?`になるなど）は利用できなくなり、実行は両方のファイル名を名指す`rbs.coverage.plugin-signature-stood-down` info行を1つ報告します。何も壊れていません;プラグインの型付けは、コレクションがそのクラスの宣言を停止したときにのみ復帰します。

`User.table_name`は`String`と型付けされ、厳密な文字列になるのは、あなたのソースがその名前を述べているときだけです: クラス上またはSTIの祖先上のリテラルな`self.table_name = "people"`であって、その連鎖の中に実行時に名前を計算するものが何もない場合です（`def self.table_name`、その`class << self`版、補間を伴う代入は、いずれも計算しているとみなされます）。それ以外の名前——プラグインがクラス名を複数形化して導出したもの——はすべて素の`String`のままです。

これには確定して見える名前も含まれます。スキーマ内の`users`テーブルは、それが`User`のテーブルであることの証拠にはなりません: ベースクラスに`self.table_name_prefix`があれば`User`は実際には`app_users`を読みますし、別のモデルに属する`users`テーブルが誤った推測を「確定」させてしまうこともあります。誤った厳密な文字列は、正直な`String`よりも悪い——`User.table_name`を比較するコードが黙って誤った分岐を取ってしまう——ので、このプラグインはあなたが書き下したものだけを固定します。`User.quoted_table_name`は常に`String`です;クォートの仕方はデータベースアダプタ次第だからです。

Rubyのモジュールまたはクラスの内部で宣言されたモデル（`Blog::Post`）は、以下の場合においてRailsと同じ方法でそのテーブルを解決します: ネームスペースはドロップされ、名前にフラット化されないため、`Blog::Post`は`blog_posts`ではなく`posts`を読みます。囲むネームスペースがリテラルとして宣言した`table_name_prefix` / `table_name_suffix`（`def self.table_name_prefix = "blog_"`、同様の`class << self`、または`mattr_accessor :table_name_prefix, default: "blog_"`）はその上に適用されるため、`Blog`がそれを設定すると同じモデルは`blog_posts`を読みます。`mattr_writer`はカウントされません——リーダーを定義しないため、Railsは実際に値を読み戻すことはなく、プラグインも同様です。

`Blog`のprefix/suffixがプラグインがリテラルとして読み取れない形状（計算された値、2つの矛盾する宣言）で宣言されている場合、`Blog::Post.table_name`は依然として素のdemodulizeされた名前（`posts`）として読まれます——ただしこの場合、その文字列は情報提供のみを目的とします。プラグインはそれに対してカラムをルックアップするほどには信頼しません: 素の名前を推測することは、ネームスペース付きアプリにおいて無関係な実際のテーブルにヒットする可能性が最も高い推測であり、誤った裏付けは裏付けがないことよりも悪いため、`Blog::Post`のカラム、エイリアス、および関連のチェックは、実際のテーブルではないかもしれないテーブルに対して実行されるのではなく、完全に役目を降ります。

## フレームワーク定数の解決

バンドルされたシグネチャは、Active Recordの例外階層（`ActiveRecordError`およびアプリケーションがrescueするクラス群: `RecordNotFound`、`RecordInvalid`、`RecordNotSaved`、`StatementInvalid`、`RecordNotUnique`、`StaleObjectError`、…）、`ActiveModel`名前空間、および`Arel`も名指しします。`rescue ActiveRecord::RecordNotFound => e`は、`e`を不透明なままにする代わりに型付けします。

それらのいずれもメソッドサーフェスを宣言しません —— この宣言は定数解決をもたらすだけであり、それ以外の主張は何もしないため、`e.record`やその他の省略されたすべてのメンバーは、指摘されるのではなく寛容なまま保たれます。`ActiveRecord::Base`は意図的に宣言されて**いません**: これを閉じてしまうと、プロジェクト内のすべてのモデルを閉じてしまうことになるためです。

## 制限事項

- **直接のスーパークラスのみマッチ**。`User < ApplicationRecord`である状況下での`class Admin < User`は発見されません。`User`を`model_base_classes`に追加するか、すべての具体的なモデルを明示的に列挙してください。
- **別の非抽象モデルクラスの内部にネストされたモデルは、推測するのではなく役目を降ります**。`Post < ApplicationRecord`であり`Post`が抽象でない`Post::Comment`は、まったく異なるRailsの名前付けルールに当たります——親自身のテーブル名がprefix/suffixではなく子の真ん中に結合されるため、プラグインはその形状を認識し、実際の名前を計算（または推測）する代わりに`Comment`のカラム / エイリアス / 関連のチェックの役目を降ろします。（`Base`が`self.abstract_class = true`または`primary_abstract_class`を宣言している`Base::Comment`のように、*抽象*親クラスの内部にネストされたモデルは、完全なカラムチェックを伴って素のdemodulizeされたテーブル名を正しく解決します。）
- **外部の`table_name_prefix` / `table_name_suffix`宣言とエンジン**。`model_search_paths`外の宣言（例: `lib/`やエンジンの`isolate_namespace`内）はプロジェクト全体で検出され、誤ったテーブル名を推測するのではなく、空のカラムセットで影響を受けるモデルを安全に役目から降ろします。`model_search_paths`内では、モデルレベルおよびベースクラスの`table_name_prefix`宣言（リテラルまたは計算済み）が直接解決されます。
- **PostgreSQLの`db/structure.sql`フォールバック**。`db/schema.rb`がないとき、プラグインは同じカラム／型テーブルのために`db/structure.sql`（`schema_format = :sql`のダンプ）をパースします。PostgreSQL DDLのみを読みます;SQL型にRubyのマッピングがないカラム（カスタムenum、`tsvector`、`ltree`）は`Object`へ降格し（決して落とさない）、`public`以外のスキーマのパーティションテーブルはスキップされます。
- **コミットされたスキーマがない——縮退モード**。生のマイグレーションを出荷し`db/schema.rb`をgitignoreするプロジェクト（DBに依存しないRailsのパターン）でも、テーブル名・ファインダー・スコープ・関連は得られます: それらはスキーマではなくあなたのモデルのソースから読まれるからです。役目を降りるのはカラムに依存する半分だけです——カラムのリーダーは型なしのままになり、`where(col:)`のキーは検証されません。スキーマが記述していないテーブルに対するのとまったく同じです。プラグインは実行ごとに1回`:info`でそう述べます。スキーマのダンプをコミットする（または`schema_file` / `structure_sql_file`をそれへ向ける）と、次のコールドの実行からカラム側の半分が再びオンになります——ウォームなキャッシュは無効化されるまで縮退したインデックスを提供し続けるので、すぐに変化を見たいときは`rigor check --no-cache`（または`make cache-clean`）を使ってください。
- **カラムの読み取りであり、セッターではない**。このプラグインはインスタンス側のカラムの*読み取り*（`user.name`、`user.admin?`）と単数の関連を型付けしますが、`name=`セッターやダーティトラッキング系（`name_changed?`、`name_was`、…）は型付けしません。
- **プロジェクト独自のインフレクションはまだ読み取られない**。モデル↔テーブルの複数形化は本物のActiveSupportインフレクターを通ります（そのため`Person → people`、`Mouse → mice`は解決されます）が、`config/initializers/inflections.rb`で宣言したルールはまだ取り込まれません ── それに依存するモデルには`self.table_name`が必要です（ADR-39スライス3）。

## プラグインの内部

アーキテクチャ（キャッシュされたスキーマパーサ → モデルインデックス → アナライザーのチェーン）、ソースのレイアウト、デモの実行方法、そしてこのプラグインが行使するプラグインの契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activerecord/README.md)に記載されています。自分自身のプラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)のウォークスルーと[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
