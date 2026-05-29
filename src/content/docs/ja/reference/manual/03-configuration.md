---
title: "設定"
description: "rigortype/rigor docs/manual/03-configuration.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/03-configuration.md"
sourcePath: "docs/manual/03-configuration.md"
sourceSha: "0b1b7332afae499c5b7e0884a4b11be14792dbbb3342bbe80a9be4076c9e5f6e"
sourceCommit: "fa9e1de7a00dc2aff56f6efa3045b4607650a647"
translationStatus: "translated"
sidebar:
  order: 9003
---

Rigorはプロジェクトルートから単一のYAML設定ファイルを読み込みます。`rigor init`でスターターファイルを生成できます。

## 探索と優先順位

`--config`フラグなしの場合、Rigorは以下の順に探索します:

1. `.rigor.yml`
2. `.rigor.dist.yml`

**最初に見つかったファイル**が優先されます——両者はマージされません。慣例として`.rigor.dist.yml`を共有プロジェクト設定としてコミットし、個々の開発者が（追跡されない）`.rigor.yml`をローカルで上書きするために配置します。

設定を置き換えではなく*継承*するには、設定ファイルで`includes:`（再帰的）を使ってベースを指定できます。`--config=PATH`は探索を完全にバイパスします。

設定ファイル内のすべての相対パスは、そのファイル自身のディレクトリを基準に解決されます。

## 最小限の設定

```yaml
target_ruby: "4.0"
paths:
  - lib
plugins: []
cache:
  path: .rigor/cache
```

## キーリファレンス

### ソースとターゲット

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `target_ruby` | String | `"4.0"` | **自分の**プロジェクトが実行するRubyバージョン——`"X.Y"`、`"X.Y.Z"`、または`"latest"`。Rigor自体が動作するRubyとは独立。 |
| `paths` | Array | `["lib"]` | 解析するディレクトリまたはファイル。 |
| `exclude` | Array | `[]` | スキップするGlobパターン。`vendor/bundle`、`.bundle`、`node_modules`は常に除外される。 |
| `includes` | Array | `[]` | このファイルの下に継承する他の設定ファイル。 |
| `fold_platform_specific_paths` | Boolean | `false` | ソース探索時にRubyバージョン条件付きロードパスを解決する。 |

### 型ソース

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `libraries` | Array | `[]` | バンドルされたRBSを読み込む標準ライブラリ/gem名。 |
| `signature_paths` | Array | `nil` | `.rbs`ファイルの追加ディレクトリ。 |
| `pre_eval` | Array | `[]` | ファイルごとの解析前に走査するファイル（またはglob）。プロジェクトのモンキーパッチを登録するために使用。 |
| `plugins` | Array | `[]` | 有効化するプラグイン——[プラグインの使い方](../07-plugins/)を参照。 |

### 診断

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `disable` | Array | `[]` | プロジェクト全体で抑制するルールIDまたはファミリー。 |
| `severity_profile` | String | `"balanced"` | `lenient`、`balanced`、または`strict`——[診断](../04-diagnostics/)を参照。 |
| `severity_overrides` | Hash | `{}` | ルール/ファミリーごとの重要度。例: `{ call: warning, flow.always-truthy-condition: off }`。 |
| `baseline` | String / `false` | `nil` | `.rigor-baseline.yml`へのパス、または`false`で継承されたベースライン（baseline）を無効化。[ベースライン](../06-baseline/)を参照。 |

### 依存関係RBS探索

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `bundler.auto_detect` | Boolean | `true` | Bundlerのインストールパスとlockfileを自動検出する。 |
| `bundler.bundle_path` | String | `nil` | 明示的なBundlerインストールルート。 |
| `bundler.lockfile` | String | `nil` | 明示的な`Gemfile.lock`パス。 |
| `rbs_collection.auto_detect` | Boolean | `true` | `rbs_collection.lock.yaml`を自動探索する。 |
| `rbs_collection.lockfile` | String | `nil` | 明示的な`rbs_collection.lock.yaml`パス。 |
| `dependencies.source_inference` | Array | `[]` | gem単位のソース推論モード（ADR-10）。 |
| `dependencies.budget_per_gem` | Integer | `1000` | gem単位の推論時間予算（ミリ秒）。 |

### 実行

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `cache.path` | String | `.rigor/cache` | 永続キャッシュディレクトリ。[キャッシュ](../12-caching/)を参照。 |
| `parallel.workers` | Integer | `0` | ファイルごとの解析用Ractorワーカー。`0`は逐次処理。CLI `--workers`と`RIGOR_RACTOR_WORKERS`が優先される。 |
| `plugins_io.network` | String | `"disabled"` | プラグインネットワークポリシー——`disabled`または`allowlist`。 |
| `plugins_io.allowed_paths` | Array | `[]` | プラグインが読み取り可能なファイルシステムパス。 |
| `plugins_io.allowed_url_hosts` | Array | `[]` | `network: allowlist`のときプラグインがフェッチ可能なURLホスト。 |

## 設定例

```yaml
target_ruby: "3.4"
paths:
  - lib
  - app
exclude:
  - "**/*_pb.rb"
plugins:
  - rigor-activerecord
  - rigor-rspec
severity_profile: balanced
severity_overrides:
  flow.dead-assignment: warning
baseline: .rigor-baseline.yml
```
