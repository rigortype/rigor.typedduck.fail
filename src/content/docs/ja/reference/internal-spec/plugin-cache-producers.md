---
title: "Plugin-side Cache Producers (slice 6)"
description: "Imported from rigortype/rigor docs/internal-spec/plugin-cache-producers.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/plugin-cache-producers.md"
sourcePath: "docs/internal-spec/plugin-cache-producers.md"
sourceSha: "24d20ff988908b66b40248b97f2e1453b9d0aab4545c7e6469fddd31691208ac"
sourceCommit: "ea8ac6950eae8c643cd2811da2569fd4809f89c8"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**v0.1.0スライス（slice）6規範的**。プラグイン作成者がキャッシュ済みプロデューサーを宣言するためのサーフェス（surface）を固定します——`Plugin::Base.producer` DSL・`Plugin::Base#cache_for`呼び出し可能オブジェクト・自動的な`PluginEntry`の追加・`plugin.<manifest.id>.`キャッシュidサンドボックス。これらのサーフェスの背後にある設計上の決定は[ADR-7 §「スライス6」](../../adr/7-v0.1.0-slice-decisions/)に記録されています；このドキュメントがADRと矛盾する場合、ADRが優先されます。

## なぜこれが存在するか

Rigorの永続キャッシュ（ADR-6、v0.0.8/v0.0.9）は`(producer_id, params, descriptor)`をキーとするバイナリエントリーの単一シャードディレクトリです。スライス6はその契約（contract）のプロデューサー側をプラグイン作成者に拡張することで、計算コストが高いプラグイン貢献（スキーマの解析、動的メンバーテーブルの構築、生成メタデータのインデックス作成）が`rigor check`の実行をまたいでキャッシュされ、入力が変更されたときに正しく無効化されるようにします。

ADR-7 §「スライス6」は3つの実装上の選択を固定します：

- **6-A.** DSL宣言（`Plugin::Base.producer`）と命令型ヘルパー（`Plugin::Base#cache_for`）のハイブリッド。宣言はidとシリアライザのペアを持ち；ヘルパーがラウンドトリップを実行するため、プラグイン作成者は`Cache::Descriptor`を手作業で構築する必要がありません。
- **6-B.**ローダー/サービスヘルパーがすべての`cache_for`ラウンドトリップにプラグインごとの`PluginEntry`テンプレート（id・バージョン・`config_hash`）を自動的に追加します。プラグインid・バージョン・config不変条件が構築時に強制されます。
- **6-C.**プラグインが宣言したプロデューサーidには`plugin.<manifest.id>.`が自動的にプレフィックスとして追加されるため、プラグインキャッシュは組み込みプロデューサー（`rbs.*`など）や互いから切り離されたサンドボックスに保たれます。

## パブリックサーフェス（ドリフト固定済み）

### `Rigor::Plugin::Base.producer(id, serialize: nil, deserialize: nil, &block)`

プロデューサーを登録するクラスレベルDSL。ブロックはプロデューサー本体です；`instance_exec`を通じて実行されるため、ブロック内の`self`はプラグインインスタンス——`io_boundary`・`services`・`manifest`・`config`がすべてスコープ内にあります。ブロックは呼び出しサイトの`params`ハッシュを唯一の引数として受け取ります；`params`は`Cache::Descriptor#cache_key_for`（v0.0.8）に従ってキャッシュキーに混合されます。

`serialize:` / `deserialize:`は`Cache::Store#fetch_or_compute`にそのまま転送されます。デフォルトのラウンドトリップはv0.0.9の呼び出し可能サーフェスに従う`Marshal.dump` / `Marshal.load`です；返り値がMarshalクリーンでないプロデューサー（`RBS::Location`メンバーを持つRBSネイティブオブジェクト・生の`IO`など）は独自のペアを提供しなければなりません（MUST）。

`Plugin::Base.producers`は凍結された`{ id => entry }`スナップショットを返します。スーパークラスからの継承されたプロデューサーは表面化されません——ローダーは登録ごとに1つのサブクラスをインスタンス化し、プロデューサーテーブルはフラットのままです。

### `Rigor::Plugin::Base#io_boundary`

プラグインごとにメモ化された`Rigor::Plugin::IoBoundary`（スライス2）。境界が蓄積したエントリーが`cache_for`ラウンドトリップのキャッシュ無効化に使われます: `cache_for`が呼び出される**前に**`io_boundary`を通じて行われた読み込みはディスクリプタに折り込まれます。`#read_file(path)`は`:digest`の`FileEntry`を記録します;`#open_url(url)`は`"url:#{url}"`でキーされた`ConfigEntry`を記録し、その`value_hash`はレスポンスボディのSHA-256です。これにより、変更されたリモートペイロードは変更されたファイルと同じ方法でスライス（slice）を無効化します。以下の「無効化契約」を参照してください。

### `Rigor::Plugin::Base#glob_descriptor(roots, *patterns)`

`roots`下で`patterns`のいずれかにマッチして見つかったファイルごとに`:digest`の`FileEntry`を1つ`files:`スロットに持つ`Cache::Descriptor`を返す発見グロブヘルパーです（`File.join(root, pattern)`で結合;複数パターンはユニオン（union、合併型とも）になります）。結果を`cache_for`の`descriptor:`として渡すと、発見されたファイルの*集合*をスキャンするプロデューサー（あらゆるファクトリー、あらゆる`app/policies/**/*.rb`）が、いずれかのファイルのコンテンツ変更・追加・削除で無効化されます——これは、コールドコールでプロデューサーがまだファイルを読んでいないために`IoBoundary`単独では取り逃すケースです。`roots`はプロジェクトルートからの相対か絶対です。ヘルパーはマッチしたファイルごとに呼び出し時点で1回のSHA-256読み込みを支払います;10〜100ファイル範囲の発見グロブでは、ミス時のプロデューサーのパース＆ウォークに比べて無視できる程度です。これは手書きの発見ダイジェストディスクリプタ（`rigor-factorybot`がヘルパーへ移行する前に独自に再発明していたもの）の代わりにサポートされる方法です。

### `Rigor::Plugin::Base#cache_for(producer_id, params: {}, descriptor: nil)`

名前付きプロデューサーのキャッシュラウンドトリップを実行する呼び出し可能オブジェクトを返します。その呼び出し可能オブジェクトは、呼び出されるとキャッシュされた値（ヒット時）またはプロデューサーブロックの実行結果（ミス時）を返し、結果を書き込みます。

`services.cache_store`が`nil`（例：CLI `--no-cache`）の場合、呼び出し可能オブジェクトはキャッシュをバイパスしてプロデューサーブロックを毎回実行します——組み込みプロデューサーのv0.0.9キャッシュサーフェスと同じセマンティクスです。

プロデューサーidには`plugin.<manifest.id>.`が自動的にプレフィックスとして追加されます；`manifest.id = "rails"`のプラグインに`:schema_table`として登録されたプロデューサーのキャッシュストアレイアウトは`<root>/plugin.rails.schema_table/<2-prefix>/<62-suffix>.entry`にあります。

オプションの`descriptor:`キーワード引数はプラグイン作成者が自動構築ディスクリプタに合成したい追加の`Cache::Descriptor`行を提供します——通常はgemバージョンの`GemEntry`・設定ファイルの`FileEntry`ダイジェスト・または{IoBoundary}が自身でキャプチャできない外部状態の`ConfigEntry`行です。渡されたディスクリプタは自動構築されたもの（`PluginEntry`テンプレート+境界読み込み）と`Cache::Descriptor.compose`を通じて流れます；スロットごとの競合は`Cache::Descriptor::Conflict`を発生させ、異なる入力が暗黙に上書きされることなく表面化します。

## キャッシュディスクリプタ合成（6-B）

`Plugin::Base#cache_for`は以下からディスクリプタを自動組み立てします：

- プラグインの**`PluginEntry`テンプレート**：`(id, version, config_hash)`。`config_hash`は正規化されたプラグインconfig（キーソート済み・再帰的なSymbol→String変換）のSHA-256であるため、`config:`の値が異なる同じプラグインの2つのインスタンスは異なるキャッシュスライスに置かれます。
- プラグインの**`IoBoundary#cache_descriptor`**：`cache_for`が呼び出される時点で境界が記録したすべての`:digest`の`FileEntry`。
- ユーザーの**`params:`**ハッシュ（`Descriptor#cache_key_for`を通じてキャッシュキーに混合される）。

プラグイン作成者はディスクリプタを手動で構築しません。カスタムディスクリプタ拡張（境界の読み込みを超えた追加の`FileEntry` / `GemEntry` / `ConfigEntry`行）は将来のAPIで対応します；スライス6は自動構築パスのみを出荷します。

## 無効化契約

IoBoundary統合は`cache_for`が呼び出される**前に**行われた読み込みのみを反映します。推奨パターン：

```ruby
class MyRailsPlugin < Rigor::Plugin::Base
  manifest(id: "rails", version: "0.1.0")

  producer :schema_table do |params|
    schema = io_boundary.read_file(params.fetch(:schema_path))
    parse_schema(schema, params.fetch(:table))
  end

  def schema_for(table)
    schema_path = "db/schema.rb"
    io_boundary.read_file(schema_path)             # populate boundary BEFORE cache_for
    cache_for(:schema_table, params: { schema_path: schema_path, table: table }).call
  end
end
```

`cache_for`の前の`read_file`はディスクリプタに格納される`:digest`の`FileEntry`を記録します；ファイルが実行間で変更された場合、ダイジェストが変わり、キャッシュキーが変わり、`cache_for`はプロデューサーにフォールスルーします。プロデューサー本体は同じパスのファイルを再読み込みします；キャッシュミス時に境界が再びデータを収集し、事後のダイジェストが新しいエントリーに書き込まれます。

より豊かな無効化（gemバージョン・外部設定ファイル・兄弟プラグインの状態）を求めるプラグイン作成者は現在それらをparamsハッシュに合成します；将来の拡張が`cache_for`に明示的なディスクリプタパラメータを追加するかもしれません。

## キャッシュidサンドボックス（6-C）

`Plugin::Base#cache_for`はプロデューサーidを`plugin.<manifest.id>.<id>`に書き換えるため、プラグイン作成者は組み込みプロデューサー（現在は接頭辞なしの`rbs.*`idを使用）や互いと衝突できません（すべてのプラグインのidはそれぞれのマニフェストidネームスペース下に置かれます）。プレフィックスは既存の`Cache::Store::VALID_PRODUCER_ID = /\A[a-z][a-z0-9._-]*\z/`正規表現の範囲内にあります；ディスク上の帰属は`rigor check --cache-stats`を通じて明確に確認できます。

## スライス6が意図的に行わないこと

- **v0.0.9のメソッドごとの`Reflection`キャッシュの持ち越しの再試行**。ADR-7 §「スライス6-D」に従い、その作業は別のv0.1.xチケットに移管されており、エンジン内部の回帰調査が新しいパブリックプラグインAPIと絡み合わないようにしています。
- **マシン間キャッシュ共有**。ADR-6に従い、キャッシュは単一マシン用です；プラグイン側プロデューサーはその制約を継承します。
- **LRU退去/サイズ上限**。プラグインキャッシュはADR-6で説明された無制限レイアウトを共有します；ユーザーは必要に応じて`--clear-cache`を実行します。
