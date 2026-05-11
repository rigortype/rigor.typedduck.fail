---
title: "ADR-9 — Cross-plugin API"
description: "Imported from rigortype/rigor docs/adr/9-cross-plugin-api.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/9-cross-plugin-api.md"
sourcePath: "docs/adr/9-cross-plugin-api.md"
sourceSha: "e1e0ca181b4bded70ec696c11ff57b028366523ce499eb6b4d2ed45da72de3b8"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 4009
---

ステータス: **提案中、2026-05-08**。実装はv0.1.xのためにキューイング済み。このADRは設計を固定し、Tier 1プラグイン作成がそのランドを待たずに進められるようにする。

## コンテキスト

v0.1.0プラグイン契約（[ADR-2](../2-extension-api/)）は、すべてのプラグインに独自のファイルごと解析フック（`#diagnostics_for_file(path:, scope:, root:)`）、ファイル読み取り用の独自の`IoBoundary`、キャッシュ用の独自の`Plugin::Base.producer`名前空間を提供する。プラグインは**完全に独立している** — 1つのプラグインが別のプラグインの解析状態を読めず、プロデューサー名前空間（`plugin.<id>.<producer>`）は[ADR-7 § 「スライス6-C」](../7-v0.1.0-slice-decisions/)に従って意図的にプラグインごとにサンドボックス化されている。

この独立性はプラグインが未実証だったv0.1.0の正しいデフォルトだった。7つの実装例がランドし、Railsエコシステムロードマップ（[`docs/design/20260508-rails-plugins-roadmap.md`](../../design/20260508-rails-plugins-roadmap/)）が記録されると、制約は具体的に障害になっている。

- `rigor-actionpack`フェーズ1（強いパラメータ）は`rigor-activerecord`がすでに構築しているモデルインデックスが必要だ。`db/schema.rb`を最初から再読み込み・再パースするのは無駄であり、モデルディスカバラーを再実装すると`rigor-activerecord`のルールからずれていく。
- `rigor-factorybot`はファクトリー属性検証に同じモデルインデックスが必要だ。
- `rigor-actionpack`フェーズ4（ルートヘルパー消費）は`rigor-rails-routes`が構築するヘルパーテーブルが必要だ。

これらのクロスプラグイン読み取りはRailsエコシステムプラグイン全体で繰り返される。公認APIなしでは、プラグイン作成者は作業を重複させるか、アドホックな回避策（例：スライス6-Cサンドボックスに違反する共有プロデューサーid）を考案するかのどちらかになる。

## 決定

v0.1.0プラグイン契約に3つの追加をv0.1.xスライスとしてゲートして追加する。

1. **プラグインが型付きキーバリューのタプルを公開できるプランごとの`Plugin::FactStore`**。他のプラグインは`(plugin_id, fact_name)`で読み取る。
2. **新しい`Plugin::Base#prepare(services)`フック**。 `Analysis::Runner.run`ごとに1回、`#init`の後、任意の`#diagnostics_for_file`呼び出しの前に呼び出される。プラグインはここでファクトを計算して公開する。
3. **新しい`manifest(consumes: [...])`宣言**。プラグインがファクトストアから読み取る`(plugin_id, fact_name)`ペアを宣言する。ローダーはそれをトポロジカルソートと欠落しているプロデューサーの早期失敗に使用する。

### `Plugin::FactStore`

公開/読み取り/反復操作を持つパブリック読み取り専用の値オブジェクト。`Plugin::Services#fact_store`に配置される。

```ruby
module Rigor
  module Plugin
    class FactStore
      Fact = Data.define(:plugin_id, :name, :value)

      def publish(plugin_id:, name:, value:)
        # Writes to the store. Idempotent if called twice with
        # the same value (== comparison). Raises
        # Plugin::FactStore::Conflict if a different value is
        # published under the same (plugin_id, name).
      end

      def read(plugin_id:, name:)
        # Returns the published value or nil. Reads do not
        # establish a dependency — that is what `consumes:`
        # is for; reads are the data access mechanism.
      end

      def published?(plugin_id:, name:)
        # Predicate sibling for read.
      end

      def each_fact(&block)
        # Enumerate every published fact across plugins.
        # Used by the runner for diagnostic provenance.
      end
    end
  end
end
```

ライフサイクル: 新鮮な`FactStore`インスタンスはすべての`Analysis::Runner.run`の開始時に構築され、終了時に破棄される。ストアは実行をまたいでキャッシュされない — 高コストな基礎計算のキャッシュはプロデューサーの仕事（`Plugin::Base.producer`）。FactStoreはそのすでにキャッシュされた結果への*参照*を公開するだけだ。

コンフリクトセマンティクス: 2つのプラグインが同じ`(plugin_id, name)`の下に公開する場合、2番目の書き込みは最初のものと一致（ノーオペレーション）するか、異なる（raiseする）かのどちらかだ。`plugin_id`がキーを名前空間化するため、コンフリクトは単一プラグインが2回公開する場合にのみ発生する——したがってコンフリクトはローダー時の無関係なプラグイン間の衝突ではなく、プラグイン作成者のバグを示す。

### `Plugin::Base#prepare(services)`フック

デフォルトはノーオペレーション。プラグインは他のプラグインが消費するファクトを計算・公開するためにオーバーライドする。

```ruby
class Activerecord < Plugin::Base
  manifest(id: "activerecord", version: "0.2.0")

  producer :model_index do |_params|
    # ... existing code ...
  end

  def prepare(services)
    services.fact_store.publish(
      plugin_id: manifest.id,
      name: :model_index,
      value: model_index
    )
  end
end
```

単一の`Analysis::Runner.run`内の呼び出し順序:

1. `Plugin::Loader.load`がすべてのプラグインインスタンスを構築し、各プラグインの`#init(services)`を呼び出す。
2. ローダーは`consumes:`宣言によってプラグインをトポロジカルソートする（プロデューサーが先。サイクルはロードエラー）。
3. **トポロジカル順序でプラグインごとに**、ランナーが`#prepare(services)`を呼び出す。プラグインはここでファクトを公開する。
4. ランナーはファイルを反復する。各ファイルに対して、すべてのプラグインの`#diagnostics_for_file`が実行される（登録順——既存のセマンティクス）。フックは`services.fact_store`から自由に読み取る。

公開するファクトのないプラグインは`#prepare`をデフォルトのノーオペレーションのままにする。

失敗の分離: `#prepare`のraiseはADR-2 § 「プラグイン信頼とI/Oポリシー」に従って`:plugin_loader runtime-error`診断として分離され、`#diagnostics_for_file`のraiseと同じ形状だ。`#prepare`で失敗したプラグインのファクトは未公開と見なされる。下流のコンシューマーは`fact_store.read`から`nil`を見て、グレースフルにデグレードする。

### `manifest(consumes:)`宣言

オプションのマニフェストフィールド。プラグインが読み取るファクトを命名する`{ plugin_id:, name: }`ハッシュの配列:

```ruby
class Actionpack < Plugin::Base
  manifest(
    id: "actionpack",
    version: "0.1.0",
    consumes: [
      { plugin_id: "activerecord", name: :model_index },
      { plugin_id: "rails-routes", name: :helper_table }
    ]
  )
end
```

`Plugin::Manifest::Consumption`値オブジェクト: 凍結された`Data.define(:plugin_id, :name)`。マニフェストはクラス定義時に形状を検証する。不正な宣言は問題のあるエントリを名指しするメッセージで`ArgumentError`をraiseする。

ローダーは`consumes`を2つのことに使用する。

1. **トポロジカルソート** — `consumes`グラフの深さ優先ウォークがプラグインの`#prepare`呼び出しをプロデューサーがコンシューマーの前に実行されるよう順序付ける。サイクルは`Plugin::LoadError(:dependency-cycle)`をraiseする。決定論性の同率処理: 依存関係がない場合は`plugin_id`アルファベット順。
2. **早期検証** — `Plugin::Loader.load`の終了時、ローダーは消費されたすべての`(plugin_id, name)`に、一致するproductionを宣言するマニフェストを持つプラグインがレジストリにあることを確認する。これはプロデューサー側のマニフェストフィールド`manifest(produces: [:model_index])`を通じて強制される。欠落しているプロデューサーは解析が実行される前に`:plugin_loader load-error`診断として表面化する。

オプションの`consumes:`エントリセマンティクス: `optional: true`でタグ付けされたエントリは早期検証チェックをスキップする。コンシューマーの`fact_store.read`は`nil`を返し、コンシューマーはグレースフルにデグレードしなければならない。

```ruby
manifest(
  consumes: [
    { plugin_id: "activerecord", name: :model_index, optional: true }
  ]
)

def diagnostics_for_file(path:, scope:, root:)
  ar_index = services.fact_store.read(plugin_id: "activerecord", name: :model_index)
  return [] if ar_index.nil?  # graceful degrade — no AR loaded
  # ...
end
```

`optional: true`は、兄弟がロードされているとエルゴノミクスが改善するが、単独でも機能しなければならないプラグインに使用する。`rigor-factorybot`が典型的な例だ——`rigor-activerecord`なしでも動作するが、あれば恩恵を受ける。

## パブリックAPIドリフトサーフェス

このADRは以下を追加する。

- `Rigor::Plugin::FactStore`（新しい名前空間） — `publish`、`read`、`published?`、`each_fact`、`Fact`（凍結Data）、`Conflict`（例外クラス）。
- `Rigor::Plugin::Services#fact_store`（新しいアクセサー）。
- `Rigor::Plugin::Base#prepare(services)`（新しいフック、デフォルトノーオペレーション）。
- `Rigor::Plugin::Manifest#consumes`（新しいattr_reader、デフォルト`[]`）。
- `Rigor::Plugin::Manifest#produces`（新しいattr_reader、デフォルト`[]`）。
- `Rigor::Plugin::Manifest::Consumption`（新しい凍結Data）。
- `Rigor::Plugin::LoadError`が`:dependency-cycle`と`:missing-producer`の理由コードを得る。

すべての更新は実装と同じコミットの`spec/rigor/public_api_drift_spec.rb`にランドする。

## 実装スライシング

推奨順序。各スライスは独立して出荷可能:

1. **`Plugin::FactStore`値オブジェクト+spec**。純粋な値オブジェクト。プラグインローダーの変更はまだなし。ドリフトスナップショットをランド。
2. **`Plugin::Services#fact_store`アクセサー**。 Servicesごとにインスタンスが1つ構築される。プラグインは公開と読み取りができる。他は何も変わらない。
3. **`Plugin::Base#prepare(services)`デフォルトフック+Runnerの呼び出し**。 Runnerはファイルごとの反復の前にすべてのプラグインで`#prepare`を呼び出す。順序: 登録順（まだトポロジカルソートなし——それはスライス5）。
4. **`manifest(produces:)` + `manifest(consumes:)`宣言+検証**。マニフェストは宣言を持つが、ローダーはまだそれを強制しない。
5. **`Plugin::Loader`のトポロジカルソート+欠落プロデューサー/サイクル検出**。これが`consumes:`を拘束力あるものにするスライスだ。
6. **ドキュメント更新** — `docs/internal-spec/plugin-cross-plugin.md`（新ファイル）+ `rigor-plugin-author` SKILLが「フェーズ4.7 — クロスプラグインファクト」セクションを得る。

`rigor-actionpack`フェーズ1はスライス5が出荷された後にランドする。Tier 1プラグイン（rigor-rails-routes、rigor-rails-i18n、rigor-actionmailer、rigor-activejob）はこれらのスライスを必要とせず、並行してランドできる。

## 作業上の決定

### WD1 — なぜメソッド呼び出しパススルーではないのか？

別の設計では、プラグインが互いのパブリックメソッドを直接クエリできるようにする。

```ruby
ar_plugin = services.plugin_registry.find("activerecord")
ar_plugin.model_index  # call public method
```

これは却下された。理由:

- プラグインを互いのクラスレベルAPIに結合させる。`rigor-activerecord`でのメソッド名変更がすべてのコンシューマーを壊す。
- プラグインインスタンスはランナーにとってプライベートだ。それらを公開すると無関係な状態（`@io_boundary`、`@config`）が漏洩する。
- 「ファクト」の抽象は、コンシューマーが実際に欲しいもの——プロデューサーが公開することを選んだ値オブジェクト、プラグインの内部状態ではない——に近い。

FactStore設計は偶発的な結合を防ぐ。唯一の契約は公開された値の形状であり、クロスバージョン互換性が懸念になる場合は`lib/rigor-<id>-facts.rb`（共有形状gem）に配置された型付きDataクラスでピン留めできる。

### WD2 — なぜファクト形状にRBSではないのか？

RBSはファクト値の型契約を宣言できる。検討されたが延期——形状契約はプロデューシングプラグイン自身のコード（例：`Rigor::Plugin::Activerecord::ModelIndex`）が所有するのが最善で、コンシューマーはその型にアクセスするためにプロデューシングgemをインポートする。RBSはリゴール（厳密さ）を加えるが、すべてのプラグインがパブリック型用の`.rbs`を出荷することを要求し、これは現在の慣行ではない。プラグインgemの1つがv1.0.0の安定性コミットメントに達したときに再検討する。

### WD3 — キャッシュディスクリプター合成

コンシューマープラグインが自身のキャッシュプロデューサーキーでファクトを使用する場合、ディスクリプターにはプロデューサーのアイデンティティ+バージョンを含める必要があり、プロデューサーのアップグレードがコンシューマーのキャッシュを無効化する。

```ruby
producer :strong_params_validation do |params|
  ar_plugin = services.fact_store.read(...)  # current run only
  cache_for(:strong_params_validation,
            params: params,
            descriptor: Cache::Descriptor.new(
              plugins: [Cache::Descriptor::PluginEntry.new(
                id: "activerecord",
                version: ar_plugin_version,  # how to get this?
                config_hash: ""
              )]
            )).call
end
```

未解決の問い: コンシューマーはどのようにプロデューサーのバージョンを知るか？ 選択肢:

A. プロデューサーがファクトペイロードの一部としてバージョンを公開する: `{ plugin_id:, name:, value:, producer_version: }`。
B. `services.fact_store.read`がプロデューサーメタデータを持つラッパーを返す: `Fact(value:, producer_version:)`。
C. コンシューマーがプロデューサーのマニフェストを読む: `services.plugin_registry.find("activerecord").manifest.version`。

オプションBが最もクリーンだ——実装は最初の具体的なニーズ（おそらく`rigor-actionpack`フェーズ1）まで形状を延期する。

## 検討した代替案

- **共有プロデューサーid**（コンシューマーが`producer :"plugin.activerecord.model_index"`を登録する）。却下: ADR-7 § 「スライス6-C」サンドボックスに違反する。キャッシュ帰属が曖昧になる。
- **プラグイン間requireおよび直接定数ルックアップ**。却下: プラグインgem間でgem依存関係を強制する。FactStoreの目的はgemを独立して取り出せるまま保つことだ。
- **能力ベースのメッセージパッシング**。検討済み。現在のユースケースに対して重すぎる。

## 改訂履歴

- 2026-05-08 — 初期提案。Railsエコシステムロードマップのランドによって引き起こされた。
