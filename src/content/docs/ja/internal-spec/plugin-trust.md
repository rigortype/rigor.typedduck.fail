---
title: "プラグインの信頼とI/Oポリシー（スライス2）"
description: "rigortype/rigor docs/internal-spec/plugin-trust.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/plugin-trust.md"
sourcePath: "docs/internal-spec/plugin-trust.md"
sourceSha: "2da4cfdf97d63cecbae5cee18c23744caaf535678134f1104d7aff24bfef3ca9"
sourceCommit: "2a65ec8e52462c931fbfec94df68a18139259a43"
sourceDate: "2026-09-02T14:42:06+09:00"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**v0.1.0スライス（slice）2規範的**。トラストモデルとプラグインが使用することが期待されるアナライザー側のI/Oサーフェス（surface）を固定します。拘束力のある設計サーフェスは[ADR-2 §「プラグイントラストとI/Oポリシー」](../../adr/2-extension-api/)です；このドキュメントがADRと矛盾する場合、ADRが優先されます。

## なぜこれが存在するか

ADR-2はスライス2の契約（contract）を3つの点を中心に固定します：

1. プラグインはユーザー・Gemfile・`.rigor.yml`が選択した**信頼されたRuby gem**です。スライス1のローダーはプラグインgemを設定に列挙することを要求することでこのトラスト境界をすでに強制します；スライス2はプラグインが従うことが期待される**宣言的な**ポリシーを追加します。
2. 決定論性のため、解析中は**ネットワークアクセスがデフォルトで無効**です。
3. **ファイル読み込みはスコープが限定**されており、プロジェクト・プロジェクトのRBSシグネチャ・アクティブな`Gemfile.lock`・各信頼済みgemの`Gem::Specification#full_gem_path`のみが対象です。そのスコープ外の読み込みには明示的な設定とキャッシュ依存ディスクリプタが必要です。

ADR-2は**強制的な隔離より文書化**を明示的に選択しています：生の`File.read`や`Net::HTTP`で境界を迂回するプラグインはスライス2のスコープ外です。契約は、プラグインがアナライザー側の{Rigor::Plugin::IoBoundary}を使用する場合、その読み込みが検証され、ネットワーク呼び出しが拒否され、その入力が{Rigor::Cache::Descriptor}パイプラインを通じてキャッシュ無効化に使われることです。

## パブリックネームスペース（ドリフト固定済み）

以下の両クラスは[`spec/rigor/public_api_drift_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/rigor/public_api_drift_spec.rb)によって固定されています。

### `Rigor::Plugin::TrustPolicy`

実行ごとのトラストスコープを記述する凍結値オブジェクト。

| フィールド | 目的 |
| --- | --- |
| `trusted_gems` | ユーザーが承認したgemの名前のソート済み重複排除リスト。`.rigor.yml`の`plugins:`エントリーのgem名部分から導出される。 |
| `allowed_read_roots` | プラグインが{IoBoundary}を通じて読み込める、ソート済みの絶対パス。デフォルト内容：プロジェクトルート（CWD）・すべての`signature_paths`エントリー・各信頼済みgemの`Gem::Specification#full_gem_path`・ユーザーが`plugins_io.allowed_paths`に列挙した追加パス。 |
| `network_policy` | `:disabled`（デフォルト）または`:allowlist`（v0.1.2）。`Configuration`が受け入れる2つの値。 |
| `allowed_url_hosts` | `network_policy`が`:allowlist`のときにプラグインがフェッチできるホスト名の、ソート済み・重複排除・小文字化されたリスト。`:disabled`では空（かつ無視される）。 |

述語：`#allow_read?(path)`（許可されたルートのいずれかに対する絶対パス包含チェック）・`#network_allowed?`（ポリシーが`:allowlist`のときのみ`true`）・`#allow_url?(url)`（HTTPS + パース済みホストが`allowed_url_hosts`にある）・`#gem_trusted?(name)`。`#to_h`は診断とキャッシュディスクリプタ用のシリアライズ可能なHashを返します。

### `Rigor::Plugin::IoBoundary`

{Rigor::Plugin::Services#io_boundary_for}によって構築されるプラグインごとのヘルパーサビス。凍結された`TrustPolicy`と読み込みエントリーのインスタンスごとのアキュムレータを保持します。

| メソッド | 目的 |
| --- | --- |
| `#read_file(path)` | 絶対パスをポリシーに対して検証し、バイトを読み込み、`:stat`の（ADR-87 WD1）{Cache::Descriptor::FileEntry}を境界の蓄積エントリーに追加します。拒否されたパスに対しては{Rigor::Plugin::AccessDeniedError}（`reason: :read_outside_scope`）を発生させます。パスが存在しないために読み取りが失敗した場合（`Errno::ENOENT`、または親の構成要素が通常ファイルであるときの`Errno::ENOTDIR`）は、再raiseする前に**不在の行**（`FileEntry.absent(path:)`、`:exists`の比較器）を記録します（ADR-45 WD1）。 |
| `#file?(path)` / `#directory?(path)` | **存在プローブ（existence probe）**（ADR-45 WD1b / #613）。スコープ内か外かに関わらず、一切例外を発生させることなく、`File.file?` / `File.directory?`が返すものを正確に返します——そしてその結果を`:exists`の{Cache::Descriptor::FileEntry}として記録します: プローブが求めたものを見つけた場合は`FileEntry.present`、パスに何も存在しない場合は`FileEntry.absent`、そこに何かが存在するが求められたものではない場合は**何も記録しません**（ファイルが欲しかった場所にディレクトリがある場合など。これは`#read_file`が`EISDIR`に対してピン留めする境界と同じです）。ポリシーがゲートするのは回答ではなく記録です: スコープ外の読み取りが何も行を寄与しないのとまったく同様に、スコープ外のパスは何も行を寄与しません。プラグインコードはプロジェクトのパスにおいて`File.file?` / `File.directory?`よりもこれらを優先しなければなりません（MUST）: 素の`File`プローブは何も記録しないため、その不在によって形作られた結果が、ファイルが現れた後も再び提供されてしまいます。 |
| `#open_url(url)` | `:disabled`の下では{Rigor::Plugin::AccessDeniedError}（`reason: :network_disabled`）を発生させます。`:allowlist`（v0.1.2）の下では、パース済みホストが`allowed_url_hosts`にあるときHTTPS経由でGETを実行し、リクエストタイムアウト（10秒）とレスポンスボディサイズ上限（10 MB）を強制します;失敗時は`reason:`が`:invalid_url_scheme`・`:host_not_allowed`・`:http_error`・`:request_timeout`・`:body_too_large`のいずれかの`AccessDeniedError`を発生させます。 |
| `#cache_descriptor` | 境界が蓄積した`FileEntry`行を持つ新しい凍結された{Cache::Descriptor}を返します。後続の読み込みは基底レコードテーブルを拡張します；各呼び出しはその時点での読み込み履歴を反映した新しいディスクリプタを返します。 |

パスごとの読み込みは絶対パスによって重複排除されます；内容が変更されたファイルの再読み込みはエントリーのダイジェストを上書きします。読み取りの成功は、同じパスに対する以前の不在の行を置き換えます（ファイルが現れ、そのバイトが消費された）;不在の行が以前の内容の行を置き換えることは決してありません（1回の実行で1つのパスに2つの結果が出るということは、解析の足下でファイルが動いたということであり、内容と存在の両方を検証がカバーするのは内容の行のほうだからです）。同じ順序付けがプローブ行にも適用されます: コンテンツ行は任意の存在行を置き換え、1つのパスに対する2つの存在行の間では最初に記録されたものが優先されます——それがどちらであれ、以前の決定が形作られた世界を記述しており、世界がそれに一致しなくなった瞬間に古くなるため、実行途中の変更は誤ったヒットではなく再計算のコストを伴うようになります。

### `Rigor::Plugin::AccessDeniedError`

境界違反のパブリック例外。理由：

- `:read_outside_scope` — `read_file`がすべての許可読み込みルートの外のパスで呼び出された。
- `:network_disabled` — `network_policy == :disabled`の間に`open_url`が呼び出された。
- `:invalid_url_scheme` / `:host_not_allowed` / `:http_error` / `:request_timeout` / `:body_too_large` — `:allowlist`ポリシーの下での`open_url`失敗（v0.1.2）。

問題のある`resource`（パスまたはURL）を持ちます。

### `Rigor::Plugin::Services`（トラスト + ファクトストアの追加）

スライス2がトラストサーフェスを追加し;v0.1.1（ADR-9）が`fact_store`を追加しました：

| メソッド | 目的 |
| --- | --- |
| `#trust_policy` | 実行の{TrustPolicy}。プロジェクトの`.rigor.yml`から`Analysis::Runner`によって構築される。 |
| `#io_boundary_for(plugin_id)` | 新しいプラグインごとの{IoBoundary}を返す。貢献マージャー（スライス3）は実行ごとにプラグインごとに1つを構築し、結果のキャッシュディスクリプタを組み込みプロデューサーと同じパイプラインに通す。 |
| `#fact_store` | 実行ごとのクロスプラグイン{Rigor::Plugin::FactStore}（ADR-9 / v0.1.1）。プロデューサーは`#prepare(services)`で公開し、消費者は`#diagnostics_for_file` / `dynamic_return`ブロックで読む。 |

## `.rigor.yml`の`plugins_io`セクション

```yaml
plugins_io:
  network: disabled              # :disabled (default) or :allowlist (v0.1.2)
  allowed_url_hosts:             # required hostnames when network: allowlist
    - example.com
  allowed_paths:                 # extra read roots beyond project + sig + trusted gems
    - vendor/generated
    - db/schema.rb
```

`Configuration#plugins_io_network`は解析されたシンボルを返します；`Configuration#plugins_io_allowed_paths`はユーザーが指定した追加パスの凍結された`Array<String>`を返します（相対パスはポリシー構築時にランナーが絶対パスに展開します）。

## アナライザーの接続（`Analysis::Runner`）

スライス2のランナーは実行ごとに一度`TrustPolicy`を構築します：

1. `trusted_gems` ← すべての`Configuration#plugins`エントリーのgem名部分。
2. `allowed_read_roots`：
   - `Dir.pwd`（プロジェクトルート）。
   - すべての`Configuration#signature_paths`エントリー（展開済み）。
   - 各信頼済みgemについて：`Gem.loaded_specs[gem_name]&.full_gem_path`（gemがロード可能な場合、失敗はサイレント——gemはインストール済みspecのないプロジェクトローカルである可能性があります）。
   - すべての`Configuration#plugins_io_allowed_paths`エントリー（展開済み）。
3. `network_policy` ← `Configuration#plugins_io_network`（`:disabled`デフォルト、または`Configuration#plugins_io_allowed_url_hosts`付きの`:allowlist`、v0.1.2）。

ポリシーは`Plugin::Services`に渡され、そこからすべてのプラグインの`Services#io_boundary_for`呼び出しに渡されます。境界を使用しないプラグインも文書化のために`services.trust_policy`を通じてポリシーを受け取ります。

## スライス2が意図的に行わないこと

- **強制的な隔離**。ADR-2はトレードオフを明示的に受け入れています：境界を迂回するプラグインはスコープ外です；スライス2の仕事は宣言的なポリシーと文書化されたエッジを提供することです。強力な隔離（Ruby::Box、プロセス境界）は将来のオプションであり、スライス2のコミットメントではありません。
- **`realpath`によるシンボリックリンクの解決**。`File.expand_path`が唯一の正規化ステップです。敵対的なプラグインはスコープ外です。

- **境界のキャッシュディスクリプタを`Cache::Store`に接続すること**。それはスライス6の仕事でした——プラグイン側キャッシュプロデューサーは`PluginEntry`行をディスクリプタスキーマに含む`Store#fetch_or_validate(serialize:, deserialize:)`（ADR-60 WD3のレコードアンドバリデート）を使用します（[plugin-cache-producers.md](../plugin-cache-producers/)）。スライス2はディスクリプタを構築しただけです。

v0.1.2でネットワークゲートが解放されました: `network_policy`は`:allowlist`も受け付けるようになり、`IoBoundary#open_url`を通じて`allowed_url_hosts`内のホストへのHTTPS GETを、リクエストタイムアウトとレスポンスサイズ上限付きで許可します。デフォルトは`:disabled`のままです。

境界が蓄積するディスクリプタはもはや未消費ではありません：`Analysis::Runner#run_dependency_descriptor`がすべてのプラグイン境界の`#cache_descriptor`ファイルを実行の依存ディスクリプタに畳み込むため、プラグインが境界を通じて読み込んだファイルは、解析対象ファイルや`sig`ファイルと同様に実行結果のキャッシュ無効化に関与します。
