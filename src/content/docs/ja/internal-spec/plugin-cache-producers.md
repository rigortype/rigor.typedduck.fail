---
title: "Plugin-side Cache Producers (slice 6)"
description: "Imported from rigortype/rigor docs/internal-spec/plugin-cache-producers.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/plugin-cache-producers.md"
sourcePath: "docs/internal-spec/plugin-cache-producers.md"
sourceSha: "fd715bc0e4bdb1b30b25687cabba6ca7ccf8cde56a4b84db7f026ee607315916"
sourceCommit: "222d8e03ee0f4252795f6c7294672a76c20b7ae3"
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

### `Rigor::Plugin::Base.producer(id, watch: nil, serialize: nil, deserialize: nil, &block)`

プロデューサーを登録するクラスレベルDSL。ブロックはプロデューサー本体です；`instance_exec`を通じて実行されるため、ブロック内の`self`はプラグインインスタンス——`io_boundary`・`services`・`manifest`・`config`がすべてスコープ内にあります。ブロックは呼び出しサイトの`params`ハッシュを唯一の引数として受け取ります；`params`は`Cache::Descriptor#cache_key_for`（v0.0.8）に従ってキャッシュキーに混合されます。

`watch:`（ADR-60 WD3）は発見スタイルのプロデューサーのグロブカバレッジ——プロデューサーブロックが入力をグロブで読み込んだ場合でも、ファイルの*追加*／*削除*がキャッシュ値を無効化しなければならないディレクトリ——を宣言します（ブロック内の読み込みは、そこに存在しなかったファイルを見ることができないため）。これは`[roots, pattern, …]`タプルの静的な`Array`（`roots`は`String`または`Array<String>`；1タプルにつき1つ以上のグロブパターンサフィックス）か、または`cache_for`時にプラグインインスタンス上で`instance_exec`を通じて実行され（クラス定義時ではなく——検索ルートは通常`#init`でconfigから計算されます）そのArrayを返す`Proc`のいずれかです。評価された各`(root, pattern)`はプロデューサーの依存ディスクリプタ内の`Cache::Descriptor::GlobEntry`行になります——1つのエントリーがグロブ全体をダイジェストするので、コンテンツ変更・追加・削除のいずれもが無効化を引き起こします。

`serialize:` / `deserialize:`はプロデューサーの返り**値**に適用されます（キャッシュ層が格納される`[value, dependency_descriptor]`ペアの周りにそれらをラップします）。デフォルトのラウンドトリップはv0.0.9の呼び出し可能サーフェスに従う`Marshal.dump` / `Marshal.load`です；返り値がMarshalクリーンでないプロデューサー（`RBS::Location`メンバーを持つRBSネイティブオブジェクト・生の`IO`など）は独自のペアを提供しなければなりません（MUST）。

`Plugin::Base.producers`は凍結された`{ id => entry }`スナップショットを返します。スーパークラスからの継承されたプロデューサーは表面化されません——ローダーは登録ごとに1つのサブクラスをインスタンス化し、プロデューサーテーブルはフラットのままです。

### `Rigor::Plugin::Base#io_boundary`

プラグインごとにメモ化された`Rigor::Plugin::IoBoundary`（スライス2）。境界が蓄積したエントリーが`cache_for`ラウンドトリップのキャッシュ無効化に使われます: ADR-60 WD3のrecord-and-validateの下では、境界スナップショットはプロデューサーブロックの実行**後に**取られるため、ブロックが行うすべての読み込み（計算の途中で発見した読み込みを含む）がキャプチャされます——「`cache_for`の前に読む」という順序要件はありません。`#read_file(path)`は`:digest`の`FileEntry`を記録します;`#open_url(url)`は`"url:#{url}"`でキーされた`ConfigEntry`を記録し、その`value_hash`はレスポンスボディのSHA-256です。依存ディスクリプタ内の`ConfigEntry`（URL読み込み）はそのエントリーを決して新鮮（fresh）でない状態にします——URLをフェッチしたプロデューサーは毎回再計算しますが、これは健全です（リモートドキュメントには安価なローカル再検証手段がありません）。以下の「無効化契約」を参照してください。

ADR-60 WD3で`Plugin::Base#glob_descriptor(roots, *patterns)`は**プライベート**になりました（これは`watch:`が実装される土台となるビルディングブロックです）；プラグインコードはディスクリプタを手作業で合成する代わりに`watch:`を宣言します。

### `Rigor::Plugin::Base#cache_for(producer_id, params: {}, descriptor: nil)`

名前付きプロデューサーのキャッシュラウンドトリップを`Cache::Store#fetch_or_validate`（ADR-45のrecord-and-validateパス）を通じて実行する呼び出し可能オブジェクトを返します。その呼び出し可能オブジェクトは、呼び出されると、記録された依存関係がまだ新鮮（fresh）であればキャッシュされた値を返し、そうでなければプロデューサーブロックを実行して新鮮なエントリーを記録します。

`services.cache_store`が`nil`（例：CLI `--no-cache`）の場合、呼び出し可能オブジェクトはキャッシュをバイパスしてプロデューサーブロックを毎回実行します——組み込みプロデューサーのv0.0.9キャッシュサーフェスと同じセマンティクスです。

プロデューサーidには`plugin.<manifest.id>.`が自動的にプレフィックスとして追加されます；`manifest.id = "rails"`のプラグインに`:schema_table`として登録されたプロデューサーのキャッシュストアレイアウトは`<root>/plugin.rails.schema_table/<2-prefix>/<62-suffix>.entry`にあります。

オプションの`descriptor:`キーワード引数は、キャッシュ*キー*に属する**識別子**入力のための追加の`Cache::Descriptor`行を提供します——通常はgemバージョンの`GemEntry`ピン・または`IoBoundary`が自身でキャプチャできない外部状態の`ConfigEntry`行です。渡されたディスクリプタは自動構築された`PluginEntry`テンプレートと`Cache::Descriptor.compose`を通じて流れます；スロットごとの競合は`Cache::Descriptor::Conflict`を発生させ、異なる入力が暗黙に上書きされることなく表面化します。`IoBoundary`の読み込み履歴はキーに入りません——それは計算後に依存ディスクリプタへ記録されます。

## キャッシュディスクリプタ合成（6-B）

`Plugin::Base#cache_for`はエントリーを安定した識別子入力でキーし、読み込み依存関係を別々に記録します：

- **キーディスクリプタ**——プラグインの**`PluginEntry`テンプレート**`(id, version, config_hash)`（`config_hash`は正規化されたプラグインconfig——キーソート済み・再帰的なSymbol→String変換——のSHA-256であるため、`config:`が異なる2つのインスタンスは異なるスライスに置かれます）に、オプションの`descriptor:`識別子の追加分を合成し、さらにユーザーの**`params:`**ハッシュ（`Descriptor#cache_key_for`を通じて混合される）を加えたもの。
- **依存ディスクリプタ**（ブロック実行後に記録され、次回実行時に`Descriptor#fresh?`を介した再ダイジェストで再検証される）——`IoBoundary`の計算後の`FileEntry` / `ConfigEntry`読み込みに、評価された`watch:`の`GlobEntry`行を加えたもの。

プラグイン作成者はディスクリプタを手動で構築しません：ブロック内の読み込みは自動的にキャプチャされ、`watch:`がグロブカバレッジを宣言します。

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
