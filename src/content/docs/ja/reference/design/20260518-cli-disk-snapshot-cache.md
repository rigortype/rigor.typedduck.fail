---
title: "CLIエディタモード — ディスクバック`ProjectScan`スナップショットキャッシュ"
description: "rigortype/rigor docs/design/20260518-cli-disk-snapshot-cache.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/design/20260518-cli-disk-snapshot-cache.md"
sourcePath: "docs/design/20260518-cli-disk-snapshot-cache.md"
sourceSha: "2bc1c7fdf024ff9e11bd361f94f63e1a8f3e03e1d1b56dc55596dd2de6a5f62a"
sourceCommit: "dd1240d88f635b570b72ca36d1fccddc8df8ccd1"
translationStatus: "translated"
sidebar:
  order: 20265518
---

**ステータス:**設計ノート。2026-05-18に著作。具体的なエディタ拡張需要が表面化するまで実装は**先送り**。LSPパス（インメモリ`ProjectContext` + `Analysis::ProjectScan`、v0.1.6で着地）はすでに典型的なエディタケースに対処する;このノートはCLIシェルアウトニッチの実装パスを記録し、次の実装者が冷たい状態から拾い上げられるようにする。

## 動機

`rigor check --tmp-file=X --instead-of=Y lib`はPHPStanスタイルのエディタ拡張がバッファ保存ごとにシェルアウトするCLIサーフェスである（[`docs/design/20260516-editor-mode.md`](../20260516-editor-mode/) §「CLIサーフェス」を参照）。各呼び出しは新鮮なプロセスなので、呼び出し全体で共有するインメモリ`ProjectContext`は存在しない。rigor自身の`lib/`に対するウォームキャッシュ呼び出しでの計測内訳（2026-05-17ベンチマーク）:

| フェーズ | コスト |
|---|---|
| Ruby + bundlerブート + rigorライブラリロード | 約200 ms |
| `Environment.for_project`（ディスクキャッシュヒット） | 約300 ms |
| プレパス（`Plugin::Loader.load`、プラグイン`#prepare`、`DependencySourceInference::Builder.build`、`SyntheticMethodScanner.scan`、`ProjectPatchedScanner.scan`） | 約500 ms（プロジェクトサイズ依存） |
| バッファパース + `analyze_file` | 約50〜100 ms |

**合計: 約1050 ms**。ブートフロア（累積約500 ms）は根本的;約500 msのプレパスコストが対処可能なヘッドルーム。

ディスクバックのスナップショットはウォームヒットでプレパスコストを削り取り、CLIエディタモードを約500 msの壁に持ってくる — PHPStanのバッファごとのフィードバックと競争力がある。LSPパスはすでにインメモリ`ProjectScan`キャッシュ経由でpublishあたり≤5 msを達成しているので、この最適化は**CLIシェルアウトニッチのみ向け**（LSPサポートのないエディタ、またはバッチツーリング）。

## 実装パス

### フェーズA — Marshalフレンドリーなスナップショット

既存の`Rigor::Analysis::ProjectScan`（v0.1.6）値オブジェクトは6つのスロットをバンドルする;5つはMarshalフレンドリー、1つはそうでない:

| スロット | Marshalフレンドリー？ | 備考 |
|---|---|---|
| `dependency_source_index` | ✅ | プレーンなHash-of-CatalogEntryデータ。 |
| `synthetic_method_index` | ✅ | 凍結された`SyntheticMethod` Data値の凍結Hash。 |
| `project_patched_methods` | ✅ | 凍結されたHash。 |
| `plugin_prepare_diagnostics` | ✅ | `Diagnostic` Data値のArray。 |
| `pre_eval_diagnostics` | ✅ | プレーンHashのArray。 |
| `plugin_registry` | ❌ | プラグインインスタンスは`Plugin::Services`を保持し、`Cache::Store`（Mutex）、`IoBoundary`（Mutex）、`Plugin::FactStore`（これも可変）を持つ。 |

**解決策**。 `Rigor::Analysis::MarshalableProjectScan`を導入する — 5つのMarshalフレンドリーなスロットPLUS `plugin_registry`が間接的に運んだ**プラグインごとに公開されたファクトスナップショット**（`#prepare`実行後の`Plugin::FactStore`の状態）。これはライブのプラグインインスタンスをドロップし、下流のディスパッチ層が実際に参照するデータのみを保持する。

```ruby
MarshalableProjectScan = Data.define(
  :dependency_source_index,
  :synthetic_method_index,
  :project_patched_methods,
  :plugin_prepare_diagnostics,
  :pre_eval_diagnostics,
  :fact_store_snapshot  # Hash[plugin_id => Hash[fact_name => marshalable_value]]
)
```

ウォームロード時:

1. スナップショットをMarshalロードする。
2. `Plugin::Loader.load(configuration:, services:)`を呼んで`plugin_registry`を再構築する（gemは前の実行からすでにrequire済み — `Kernel.require`はfalseを返す;コストは`Plugin.register` / `Blueprint`作業によって支配される、約5〜20 ms）。
3. **スナップショットされたファクトを再アタッチ**、各プラグインの`services.fact_store`に、そのためディスパッチ消費者は`#prepare`を再実行せずに公開されたファクトを見る。
4. 再水和された`plugin_registry` + 不変のスナップショットスロットからランタイム`ProjectScan`を構築する。
5. `Runner.new(prebuilt: ...)`に渡す。

### フェーズB — キャッシュキー導出

スナップショットは、プレパス出力に影響するプロジェクト入力のいずれかが変更されたときに無効化されなければならない。キャッシュキー候補は:

```
SHA256(
  configuration_digest    # .rigor.yml + bundler / collection軸
  + plugin_manifest_digest # プラグインgemバージョン + プラグインごとの設定
  + project_paths_digest   # `paths:`-expanded .rbファイル、mtime + サイズ
  + pre_eval_paths_digest  # pre_eval:ファイル、mtime + サイズ
  + dependencies_digest    # dependencies.source_inference:設定
)
```

`project_paths_digest`が支配的なコスト: すべてのCLI呼び出しでmtime+sizeのために`paths:`を歩く。5000ファイルで`File.stat`呼び出しに約250 ms。**これは大規模プロジェクトでプレパス節約をほぼ相殺する**。2つの緩和策:

- **（α）ディレクトリmtime経由の安価な事前チェック**。ほとんどのファイルシステムは、エントリが追加または削除されたとき（内容が変更されたときではない）にディレクトリのmtimeを更新する。`paths:`ディレクトリのみをmtimeのために歩く → 約ms。キャッシュされたスナップショットのビルド時間から変更されていない場合、ファイルリストが変更されていないと仮定し、ファイルごとのmtime走査をスキップする。ファイルごとのmtime+sizeはディレクトリのmtimeが変更されたときのみキックインする。これは実装者が採用前にベンチマークすべき高速パス最適化。
- **（β）バッファのみのパス引数のキー導出をスキップ**。`rigor check --tmp-file=X --instead-of=Y`が`paths:`を設定のプロジェクトルートにデフォルトして呼ばれるとき、導出は避けられない。呼び出し元が単一のファイルパス（`rigor check --tmp-file=X --instead-of=Y lib/foo.rb`）のみを渡すとき、キーはプレパスが消費するものだけをカバーすればよい — それでもなお`paths:`下のプロジェクト全体、スキャナがプロジェクトを歩くため。だから（β）は役に立**たない**;（α）が正しいレバー。

### フェーズC — ストレージ

新しいプロデューサーで`Rigor::Cache::Store`を再利用する:

```ruby
module Rigor
  module Cache
    class ProjectScanSnapshot
      PRODUCER_ID = "analysis.project_scan_snapshot"

      def self.fetch(loader:, store:, configuration:)
        descriptor = build_descriptor(configuration)
        store.fetch_or_compute(
          producer_id: PRODUCER_ID,
          params: {},
          descriptor: descriptor
        ) { build_fresh(configuration) }
      end

      def self.build_descriptor(configuration)
        Descriptor.new(
          configs: [config_entry(configuration)],
          files: project_path_file_entries(configuration) +
                 pre_eval_file_entries(configuration),
          plugins: plugin_entries(configuration)
        )
      end

      def self.build_fresh(configuration)
        # プロジェクトのみのRunnerをスピンアップ（バッファなし）、
        # prepare_project_scanを呼び、fact_storeをスナップショット、
        # MarshalableProjectScanを返す。
      end
    end
  end
end
```

`Cache::Store`はすでにMarshalラウンドトリップ、シャード化ストレージ、ファイルごとの`flock`、ディスクリプタベースの無効化を処理する。新しいプロデューサーはディスクリプタ + 新鮮なビルドを提供するだけでよい。

### フェーズD — Runner統合

`Runner`はすでに`prebuilt:`を受け入れる。CLIコマンドパスは次のようにスレッド化する:

```ruby
def cli_run_check(configuration:, buffer_binding:)
  snapshot = Cache::ProjectScanSnapshot.fetch(
    loader: nil, store: cache_store, configuration: configuration
  )
  prebuilt = rehydrate(snapshot, configuration: configuration,
                       cache_store: cache_store)
  Runner.new(
    configuration: configuration,
    cache_store: cache_store,
    buffer: buffer_binding,
    prebuilt: prebuilt
  ).run([buffer_binding.logical_path])
end
```

`rehydrate`はフェーズAで記述されたPlugin::Loader.load + fact_store再アタッチを行う。

### フェーズE — 書き込み時のスナップショットの鮮度

キャッシュキーがミスを示すとき、新鮮なビルドはプロジェクトのみのrunnerに対して`Runner#prepare_project_scan`を実行し、それからシリアライズする:

- 5つのMarshalフレンドリーなスロットをそのままスナップショット。
- プラグインごとのfact_storeをスナップショット: `plugin_registry.plugins`を反復、`plugin.services.fact_store.facts`をキャプチャ（またはFactStoreのアクセサが公開するもの — `Plugin::FactStore`に`#snapshot_for_cache`メソッドが必要かもしれない）。
- Marshalフレンドリーな値のみ。非Marshalフレンドリーなファクト（Mutex、Procなど）を公開するプラグインはスナップショットを壊す — プロデューサーはレスキューし「この設定にはキャッシュなし」に縮退するか、FactStoreのスナップショットメソッドが違反するプラグインを指す明確なエラーをraiseすべき。

## 実装者へのオープン質問

1. **FactStoreスナップショットAPI**。`Plugin::FactStore`は現在「すべての公開されたファクトをシリアライズ」サーフェスを公開しない。正しい形は、ストアがプラグインごとにファクトをキー付けするかどうか（する、ADR-9に従い）と、値がMarshalフレンドリー型に制約されるかどうか（今日明示的な制約はない）に依存する。小さな`Plugin::FactStore#to_snapshot` / `.from_snapshot`ペアが統合をスコープする。
2. **Marshalバージョン安定性**。`Cache::Store`はすでに`SCHEMA_VERSION`でキーするので、Rubyバージョンバンプはエントリを無効化する。`MarshalableProjectScan`スナップショットはこの不変条件を継承する。
3. **プラグインgemバージョンのピン留め**。プラグインアップグレードはスナップショットを無効化すべき。今日の`Cache::Descriptor::PluginEntry`は`version:` + `config_hash:`を含む — プロデューサーのディスクリプタはプラグインごとにこれらのいずれかを含まなければならない。
4. **プレパス診断の再発行順**。`plugin_prepare_diagnostics`スナップショットは、ソースプラグインが発行した順序を保持しなければならない、そうすればCLI診断ストリームはコールド / ウォーム実行をまたいで安定したまま。MarshalラウンドトリップはArray順を保持する — specで検証。
5. **キャッシュ書き込み競合**。スナップショットを書く2つの`rigor check`呼び出しがプロデューサーのキャッシュファイルで衝突する。`Cache::Store`はファイルごとのflock経由ですでにこれを処理する;最初のライターが勝ち、2番目は計算した値を破棄する。

## 期待される勝利

| プロジェクトサイズ | CLIエディタモードのウォーム壁（今日） | スナップショットキャッシュ後 | Δ |
|---|---|---|---|
| 些細（プラグインなし） | 約500 ms | 約500 ms | 0（プレパスはすでに安価） |
| 小Rails（5プラグイン） | 約700〜900 ms | 約500〜550 ms | -200〜-350 ms |
| 中Rails（10プラグイン + 基板） | 約1000〜1500 ms | 約550〜650 ms | -450〜-850 ms |
| 大規模モノレポ（5000+ファイル、基板使用プラグイン） | 2+秒 | 約700 ms | > -1.3秒 |

勝利はプラグイン / 基板 / ファイル数でスケールする。

## なぜこれが先送りされるか

- **LSPがエディタケースの90%+をカバー**。`rigor lsp`（v0.1.6）が推奨されるエディタ統合。publishごとの作業はウォームで≤5 ms。LSPを話せるエディタ拡張はそのパスを使うべき。
- **実装サーフェスエリアが実質的**。プラグインファクトのMarshalフレンドリーさはプラグイン契約が公開する（または不透明に壊す）**新しい**不変条件。FactStoreがMarshalフレンドリーさを強制するか単に優雅に縮退するかの決定は実質的なADRレベルの質問。
- **具体的なエディタ拡張消費者は今日存在しない**。CLIエディタモードのCLI形はv0.1.6（`--tmp-file` / `--instead-of`）で出荷されたが、我々が知るエディタ拡張は保存時にそれにシェルアウトしていない。1つが表面化し>500 msの壁をUX問題として報告したとき、このスライスは改善のブロックを解除する。

## 隣接するレバー（優先順位低）

- **LSP / CLI全体のインメモリ`Environment.for_project`キャッシュ**。v0.1.6はすでにLSP `ProjectContext`でEnvironmentをキャッシュする。CLIはそのキャッシュを共有できないが、Environment構築自体は既存のオンディスク`Cache::RbsEnvironment`からの`Marshal.load`によって支配される — すでにウォームキャッシュ最適化済み。
- **CLIブートコストを削減**。約200 msのブートはRuby + bundler + rigorライブラリロード。それを削除するには永続デーモン（= LSP）が必要。スコープ外。

## 追跡

このスライスが拾い上げられるとき:

- `docs/CURRENT_WORK.md` §「オープンエンジニアリング項目」を更新。
- `CHANGELOG.md`に`[Unreleased]` § Performance下のエントリを追加。
- コミットでこの設計ノートを参照。
- `spec/rigor/public_api_drift_spec.rb`スナップショットに`Plugin::FactStore#to_snapshot` / `.from_snapshot`を追加。
