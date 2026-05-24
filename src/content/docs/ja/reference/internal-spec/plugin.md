---
title: "Plugin Registration / Loading (slice 1)"
description: "Imported from rigortype/rigor docs/internal-spec/plugin.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/plugin.md"
sourcePath: "docs/internal-spec/plugin.md"
sourceSha: "de5199466f1a7841de23d7062c621f5e6f78dcf508413797d58d8904ba319612"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**v0.1.0スライス1規範的**。プラグイン作成者がプラグインの**登録**・**マニフェスト宣言**・`Analysis::Runner`による**ロード**に関して使用するパブリックサーフェスを固定します。貢献プロトコル（動的返却・型指定・動的リフレクション）は後続のv0.1.0スライスで追加されるため、ここでは定義しません。

拘束力のある設計サーフェスは[ADR-2](../../adr/2-extension-api/)です；v0.1.0の準備状況マップは[`docs/design/20260505-v0.1.0-readiness.md`](../../design/20260505-v0.1.0-readiness/)にあります。この仕様がADR-2と矛盾する場合、ADRが優先されます。

## パブリックネームスペース（ドリフト固定済み）

以下のすべてのネームスペースは[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)によってロックされています。シグネチャの変更は同じコミットで対応する`PublicApiDriftSnapshots::*`定数を更新します。

### `Rigor::Plugin`

プラグイン登録のモジュールレベルエントリ。

| メソッド | 目的 |
| --- | --- |
| `Rigor::Plugin.register(plugin_class)` | プラグインgemがロード時に`Rigor::Plugin::Base`サブクラスをアドバタイズするために呼び出す。 |
| `Rigor::Plugin.registered_for(id)` | マニフェストidによるローダー側のルックアップ。 |
| `Rigor::Plugin.registered` | 凍結された`{ id => class }`スナップショット。 |
| `Rigor::Plugin.unregister!(id = nil)` | テスト専用リセット。プラグインコントラクトはgem作成者にこれを呼び出すことを要求しない。 |

レジストリはプロセスグローバルでmutexガードされています。同じクラスを2回登録することはno-opです；同じidで異なるクラスを登録すると`Rigor::Plugin::LoadError`が発生するため、2つのプラグインが互いをサイレントに上書きすることはできません。

### `Rigor::Plugin::Base`

すべてのプラグインがサブクラス化する基底クラス。

```ruby
class MyPlugin < Rigor::Plugin::Base
  manifest(
    id: "my-plugin",
    version: "0.1.0",
    description: "...",
    protocols: [],
    config_schema: { "flag" => :boolean }
  )

  def init(services)
    @reflection = services.reflection
  end
end
```

クラスレベルの`manifest(**fields)`はクラス定義時に一度マニフェストを宣言します；引数なしで呼び出すと、キャッシュされた`Manifest`を返します。インスタンスレベルの`manifest`はクラスに委譲します。

`#initialize(services:, config: {})`は注入されたサービスとユーザーのconfigの凍結コピーを格納します。`#init(services)`はプラグインがサービスコンテナから状態を接続するために使用するオーバーライドフックで、デフォルト実装はno-opです。

`#diagnostics_for_file(path:, scope:, root:)`（スライス5）はファイルごとの診断発行フックです。デフォルトは空の配列を返します。プラグイン作成者はこれをオーバーライドして`root`（解析された`Prism::Node`）を走査し、`Rigor::Analysis::Diagnostic`行の配列を返します；ランナーはADR-7 §「スライス5-B」に従って返されたすべての診断を`source_family: "plugin.<manifest.id>"`で再スタンプするため、プラグイン作成者が誤って別のプラグインのidで公開することはありません。フック内のプラグイン例外は`rigor check`をクラッシュさせるのではなく、`:plugin_loader`の`runtime-error`診断として隔離されます。

### `Rigor::Plugin::Manifest`

1つのプラグインのアイデンティティを記述する凍結値オブジェクト。フィールド：

| フィールド | 型 | 目的 |
| --- | --- | --- |
| `id` | `/\A[a-z][a-z0-9._-]*\z/`に一致する`String` | 安定した識別子；`PluginEntry#id`と`plugin.<id>.<rule>`診断プレフィックスとして使用される。 |
| `version` | 空でない`String` | プラグインバージョン；キャッシュ無効化のため`PluginEntry#version`に格納される。 |
| `description` | `String?` | 人間が読めるサマリー。 |
| `protocols` | `Array<Symbol>` | このプラグインが実装するプロトコル名。スライス1ではこれを空にする；プロトコルスライスが埋める。 |
| `config_schema` | `{ String => Symbol }` | 受け入れられるconfigキーと値の種類（`:string`・`:boolean`・`:integer`・`:array`・`:hash`・`:any`）のマッピング。 |

`#validate_config(config)`はエラー文字列の配列を返します；ローダーは空でない結果を`LoadError`に変換します。

### `Rigor::Plugin::Services`

すべてのプラグインの`#initialize`と`#init`に渡される凍結DIコンテナ。スライス1のサーフェス：

| サービス | 型 |
| --- | --- |
| `reflection` | `Rigor::Reflection`（モジュール）。 |
| `type` | `Rigor::Type::Combinator`（モジュール）。 |
| `configuration` | `Rigor::Configuration`（読み取り専用のプロジェクトconfig）。 |
| `cache_store` | `Rigor::Cache::Store`または`nil`（スライス6がこれを通じてプラグイン側キャッシュプロデューサーを接続する）。 |

診断フォーマッタがプログレスチャンネルを持つようになったとき、ロガーサービスがこのリストに追加されます。

### `Rigor::Plugin::Registry`

単一の`Analysis::Runner.run`のためにロードされたプラグインの読み取り専用スナップショット。`Rigor::Plugin::Loader.load`によって返され、`Analysis::Runner#plugin_registry`として公開されます。

| メソッド | 返り値 |
| --- | --- |
| `#plugins` | 決定論的な順序でロードされた`Rigor::Plugin::Base`インスタンス。 |
| `#ids` | `#plugins`と並行したマニフェストidの`Array<String>`。 |
| `#find(id)` | idによるルックアップ；存在しない場合は`nil`。 |
| `#load_errors` | ロード中に収集された`Array<Rigor::Plugin::LoadError>`。 |
| `#empty?` / `#any_load_errors?` | 述語。 |

`Registry::EMPTY`はプラグインがロードされる前にランナーが使用するシングルトンの凍結空レジストリです。

### `Rigor::Plugin::LoadError`

プラグインエントリが解決できない場合にローダー内で発生するパブリック例外。`plugin_ref`（問題のあるgem名またはプラグインid）と`cause_class`（該当する場合の基底例外クラス）を持ちます。ランナーはそれぞれを`source_family: :plugin_loader`・`rule: "load-error"`を持つ`Rigor::Analysis::Diagnostic`に変換します。

## 内部サーフェス（パブリックではない）

- `Rigor::Plugin::Loader` — ローダーは内部インフラです。プラグイン作成者はそのプライベートヘルパーをサブクラス化したり依存したりすべきではありません；パブリックエントリポイントは`Loader.load(configuration:, services:, requirer:)`です。

## `.rigor.yml`のプラグインエントリ

設定の`plugins:`フィールドは短縮形と明示形の両方を受け入れます：

```yaml
plugins:
  - rigor-rails                         # bare gem name
  - gem: rigor-rspec
    id: rspec                           # only required when the gem registers > 1 plugin
    config:
      include_specs: true
```

`Configuration`はすべてのエントリをその2つの形式のどちらかに正規化し、`Configuration#plugins`を通じて公開します。

## ロード順序

ローダーはユーザーが記述した順序で`.rigor.yml`の`plugins:`エントリを処理します。複数の登録済みプラグインクラスに解決されるエントリ（1つのgemが1つ以上のプラグインを登録している場合）の場合、明示的な`id:`フィールドが曖昧さを解消します；なければローダーは推測するのではなく`LoadError`を発行します。エントリ間での重複するidはエラーであり、サイレントな重複排除ではありません。

## 障害の隔離（ADR-2 §「プラグイントラストとI/Oポリシー」に従う）

ロードはすべてのプラグインエントリを独立して処理します；1つのエントリの失敗は他のエントリを中断しません。各失敗は結果レジストリの`LoadError`として収集され、次に`Analysis::Runner#run`が以下を持つ`:error`の`Diagnostic`として表面化します：

- `path`: `".rigor.yml"`
- `line`: `1`
- `column`: `1`
- `source_family`: `:plugin_loader`
- `rule`: `"load-error"`
- `message`: `LoadError`のメッセージ（失敗の種類に応じてgemパス/登録/configスキーマ/`#init`例外）。

`rigor check`は解析を続行します；正常にロードされたプラグインは後のv0.1.0スライスに引き続き参加します。

## スライス1の境界（意図的にカバーしていないもの）

- **プラグイン貢献の発行**（`FlowContribution`バンドル、ケイパビリティロール、動的返却）。スライス3はスタンドアロンの{Rigor::FlowContribution::Merger}（[`flow-contribution-merger.md`](../flow-contribution-merger/)）を出荷済みです；バンドルを生成する`Rigor::Plugin::Base`上のプロトコルはスライス4（内部絞り込みを通じたFlowContribution接続）と並行して到着します。
- **ロード失敗の`:plugin_loader`ファミリーを超えたプラグイン診断来歴**。スライス5はプラグインが発行した診断を`plugin.<id>.<rule>`プレフィックスを持つ`Diagnostic#source_family`を通じてルーティングします。
- **プラグイントラスト/I/Oポリシー執行**。スライス2はプラグインが使用することが期待される宣言的な{Rigor::Plugin::TrustPolicy} + {Rigor::Plugin::IoBoundary}サーフェスを出荷します；[`plugin-trust.md`](../plugin-trust/)を参照。
- **プラグイン側キャッシュプロデューサー**。スライス6は`PluginEntry`ディスクリプタを通じてプラグインに`Store#fetch_or_compute`を接続します。
- **メソッドごとのリフレクションキャッシュ**。v0.0.9からの持ち越し；スライス6と並行して到着します。
