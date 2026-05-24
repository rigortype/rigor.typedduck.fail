---
title: "Plugin Trust and I/O Policy (slice 2)"
description: "Imported from rigortype/rigor docs/internal-spec/plugin-trust.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/plugin-trust.md"
sourcePath: "docs/internal-spec/plugin-trust.md"
sourceSha: "e27edd049eb44db71bd103023279d70edb1e0322072ed661ef148f781b6d0a95"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**v0.1.0スライス2規範的**。トラストモデルとプラグインが使用することが期待されるアナライザ側のI/Oサーフェスを固定します。拘束力のある設計サーフェスは[ADR-2 §「プラグイントラストとI/Oポリシー」](../../adr/2-extension-api/)です；このドキュメントがADRと矛盾する場合、ADRが優先されます。

## なぜこれが存在するか

ADR-2はスライス2のコントラクトを3つの点を中心に固定します：

1. プラグインはユーザー・Gemfile・`.rigor.yml`が選択した**信頼されたRuby gem**です。スライス1のローダーはプラグインgemを設定に列挙することを要求することでこのトラスト境界をすでに強制します；スライス2はプラグインが従うことが期待される**宣言的な**ポリシーを追加します。
2. 決定論性のため、解析中は**ネットワークアクセスがデフォルトで無効**です。
3. **ファイル読み込みはスコープが限定**されており、プロジェクト・プロジェクトのRBSシグネチャ・アクティブな`Gemfile.lock`・各信頼済みgemの`Gem::Specification#full_gem_path`のみが対象です。そのスコープ外の読み込みには明示的な設定とキャッシュ依存ディスクリプタが必要です。

ADR-2は**強制的な隔離より文書化**を明示的に選択しています：生の`File.read`や`Net::HTTP`で境界を迂回するプラグインはスライス2のスコープ外です。コントラクトは、プラグインがアナライザ側の{Rigor::Plugin::IoBoundary}を使用する場合、その読み込みが検証され、ネットワーク呼び出しが拒否され、その入力が{Rigor::Cache::Descriptor}パイプラインを通じてキャッシュ無効化に使われることです。

## パブリックネームスペース（ドリフト固定済み）

以下の両クラスは[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)によって固定されています。

### `Rigor::Plugin::TrustPolicy`

実行ごとのトラストスコープを記述する凍結値オブジェクト。

| フィールド | 目的 |
| --- | --- |
| `trusted_gems` | ユーザーが承認したgemの名前のソート済み重複排除リスト。`.rigor.yml`の`plugins:`エントリのgem名部分から導出される。 |
| `allowed_read_roots` | プラグインが{IoBoundary}を通じて読み込める、ソート済みの絶対パス。デフォルト内容：プロジェクトルート（CWD）・すべての`signature_paths`エントリ・各信頼済みgemの`Gem::Specification#full_gem_path`・ユーザーが`plugins_io.allowed_paths`に列挙した追加パス。 |
| `network_policy` | スライス2では`:disabled`——今日`Configuration`が受け入れる唯一の値。 |

述語：`#allow_read?(path)`（許可されたルートのいずれかに対する絶対パス包含チェック）・`#network_allowed?`（ポリシーが`:disabled`の間は常に`false`）・`#gem_trusted?(name)`。`#to_h`は診断とキャッシュディスクリプタ用のシリアライズ可能なHashを返します。

### `Rigor::Plugin::IoBoundary`

{Rigor::Plugin::Services#io_boundary_for}によって構築されるプラグインごとのヘルパーサービス。凍結された`TrustPolicy`と読み込みエントリのインスタンスごとのアキュムレータを保持します。

| メソッド | 目的 |
| --- | --- |
| `#read_file(path)` | 絶対パスをポリシーに対して検証し、バイトを読み込み、`:digest`の{Cache::Descriptor::FileEntry}を境界の蓄積エントリに追加します。拒否されたパスに対しては{Rigor::Plugin::AccessDeniedError}（`reason: :read_outside_scope`）を発生させます。 |
| `#open_url(url)` | ポリシーが`:disabled`（スライス2の唯一の設定）の間は常に{Rigor::Plugin::AccessDeniedError}（`reason: :network_disabled`）を発生させます。このフックは将来のスライスがAPIを再定義せずにゲートを解放できるように予約されています。 |
| `#cache_descriptor` | 境界が蓄積した`FileEntry`行を持つ新しい凍結された{Cache::Descriptor}を返します。後続の読み込みは基底レコードテーブルを拡張します；各呼び出しはその時点での読み込み履歴を反映した新しいディスクリプタを返します。 |

パスごとの読み込みは絶対パスによって重複排除されます；内容が変更されたファイルの再読み込みはエントリのダイジェストを上書きします。

### `Rigor::Plugin::AccessDeniedError`

境界違反のパブリック例外。スライス2の理由：

- `:read_outside_scope` — `read_file`がすべての許可読み込みルートの外のパスで呼び出された。
- `:network_disabled` — `network_policy == :disabled`の間に`open_url`が呼び出された。

問題のある`resource`（パスまたはURL）を持ちます。

### `Rigor::Plugin::Services`（スライス2の追加）

スライス2は2つのサーフェスを追加します：

| メソッド | 目的 |
| --- | --- |
| `#trust_policy` | 実行の{TrustPolicy}。プロジェクトの`.rigor.yml`から`Analysis::Runner`によって構築される。 |
| `#io_boundary_for(plugin_id)` | 新しいプラグインごとの{IoBoundary}を返す。貢献マージャー（スライス3）は実行ごとにプラグインごとに1つを構築し、結果のキャッシュディスクリプタを組み込みプロデューサーと同じパイプラインに通す。 |

## `.rigor.yml`の`plugins_io`セクション

```yaml
plugins_io:
  network: disabled              # only :disabled accepted in slice 2
  allowed_paths:                 # extra read roots beyond project + sig + trusted gems
    - vendor/generated
    - db/schema.rb
```

`Configuration#plugins_io_network`は解析されたシンボルを返します；`Configuration#plugins_io_allowed_paths`はユーザーが指定した追加パスの凍結された`Array<String>`を返します（相対パスはポリシー構築時にランナーが絶対パスに展開します）。

## アナライザの接続（`Analysis::Runner`）

スライス2のランナーは実行ごとに一度`TrustPolicy`を構築します：

1. `trusted_gems` ← すべての`Configuration#plugins`エントリのgem名部分。
2. `allowed_read_roots`：
   - `Dir.pwd`（プロジェクトルート）。
   - すべての`Configuration#signature_paths`エントリ（展開済み）。
   - 各信頼済みgemについて：`Gem.loaded_specs[gem_name]&.full_gem_path`（gemがロード可能な場合、失敗はサイレント——gemはインストール済みspecのないプロジェクトローカルである可能性があります）。
   - すべての`Configuration#plugins_io_allowed_paths`エントリ（展開済み）。
3. `network_policy` ← `Configuration#plugins_io_network`（スライス2では`:disabled`）。

ポリシーは`Plugin::Services`に渡され、そこからすべてのプラグインの`Services#io_boundary_for`呼び出しに渡されます。境界を使用しないプラグインも文書化のために`services.trust_policy`を通じてポリシーを受け取ります。

## スライス2が意図的に行わないこと

- **強制的な隔離**。 ADR-2はトレードオフを明示的に受け入れています：境界を迂回するプラグインはスコープ外です；スライス2の仕事は宣言的なポリシーと文書化されたエッジを提供することです。強力な隔離（Ruby::Box、プロセス境界）は将来のオプションであり、スライス2のコミットメントではありません。
- **`realpath`によるシンボリックリンクの解決**。 `File.expand_path`が唯一の正規化ステップです。敵対的なプラグインはスコープ外です。
- **`:disabled`以外のネットワークポリシーの有効化**。 `network_allowed?`フックは、オフラインリプレイ/キャッシュフェッチ動作を必要とするスライスがAPIを再定義せずにゲートを解放できるように存在します；スライス2の受け入れ値は`[:disabled]`です。
- **境界のキャッシュディスクリプタを`Cache::Store`に接続すること**。それはスライス6の仕事です——プラグイン側キャッシュプロデューサーは`PluginEntry`行をディスクリプタスキーマに含む`Store#fetch_or_compute(serialize:, deserialize:)`を使用します。スライス2はディスクリプタを構築するだけです；まだ何もそれを消費しません。
