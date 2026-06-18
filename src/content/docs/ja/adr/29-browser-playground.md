---
title: "ADR-29 — ブラウザプレイグラウンド"
description: "rigortype/rigor docs/adr/29-browser-playground.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/29-browser-playground.md"
sourcePath: "docs/adr/29-browser-playground.md"
sourceSha: "5b6398eb99e598d6ea2e2813af3838c8c21e1597104ce03b1fc3b955c95aa3e6"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4029
---

ステータス: **Accepted、2026-05-23; v0.1.10〜0.1.11で実装**。

ブラウザベースのRigorプレイグラウンド——リアルタイム診断と`annotate`スタイルの型コメントを表示するテキストエディタ——を構築し、どのようにホストすべきかという決定を記録する。2つのアプローチを評価した: 完全にブラウザ内のWASMランタイム（`ruby.wasm`）と、静的サイトをフロントエンドとするサーバーサイドAPI。**サーバーサイドAPI**が採用された短期パスである;具体的なゲート条件のセット（WD6）が、ブラウザ内WASM完全移行が実行可能になる時期を定義する。サーバーサイドAPI + 静的フロントエンドは`plugins/rigor-playground/`プラグインと`rigor playground`コマンド（ローカルサービング、WD4 / ADR-32 WD10に従い`rigor-rbs-inline`を`require_magic_comment: false`でロード）として出荷された;それをCloudflare Pages / Fly.ioへデプロイするのはops作業であり、ruby.wasm移行はWD6にゲートされたままである。

**修正2026-05-25**: WD4がデフォルトのプラグインセットを空から`rigor-rbs-inline`有効（[ADR-32](../32-rbs-inline-comment-ingestion/)のWD10に従い、`require_magic_comment: false`で）へ変更した。これにより、`# @rbs`形コメントを含む貼り付けスニペットが最初のリクエストからインラインRBSとして解析され、ユーザー側の設定が不要になる。

**修正2026-05-29**: [ADR-34](../34-toplevel-unresolved-self-call-default/)のWD7により、リクエストごとのサンドボックスは`severity_profile: strict`（または同等のルールごとのオーバーライド）を設定し、新しい`call.unresolved-toplevel`ルールが`foo 1`のような貼り付けスニペットで発火するようにする。`balanced`デフォルトを継承するとルールが`:warning`にマッピングされ——表面化はするが、プレイグラウンドとのユーザーの最初のインタラクションになる可能性が最も高い例を過小評価することになる。

**2026-06-14に再評価**: 以下のオプションAのブロッカーは2026-05-23に評価されたものであり、`ruby.wasm`エコシステムはそれ以降進展した。`ruby/ruby.wasm`は今やRuby 4.0ビルド（`@ruby/4.0-wasm-wasi`パッケージ）を公開しており、`rbwasm`のソースからのビルドはバンドルのgem C拡張をリンクする——したがって`prism`/`rbs`のブロッカーは、もはや上流欠如の問題ではなく*ビルドして検証する*タスクである。WD6は条件ごとのステータスとともに改訂され、**WD8**が具体的な`rbwasm`ビルドパイプラインを、**WD9**がブラウザ内トランスポートを記録する——いずれも`plugins/rigor-playground/wasm/`のスキャフォールディングとして実装済み。決定的なのは、[try.ruby-lang.org](https://try.ruby-lang.org/playground/)のホスティングモデル（wasmモジュールを*静的アセット*として配信する）がブロッカー4を完全に回避することだ: 約1 MBの上限はCloudflareの*Workers*スクリプト制限であって、Pages / 静的CDNの制限ではない——15 MB超のwasmはそこでは単にキャッシュされたファイルにすぎず、try.rubyが出荷しているのと正確に同じである。この再評価は本番デフォルトを**反転させない**: WD6の条件②と③がグリーンと検証されるまで、オプションBがデプロイされたバックエンドのままだ。これは未解決の作業を「上流を待つ」から「ゲートとなる`rbwasm`ビルドのスパイクを実行する」へ移す。

**2026-06-14/15に出荷**: ゲートとなるビルドのスパイクが成功した——`psych`/`libyaml`の静的リンクのブロッカーが解消され（`Fix the psych/libyaml link so the playground wasm build is green`）、モジュールはブラウザVM内で正しく動くようになり（WD6 ③、`Make the playground wasm run correctly in the browser VM`）、アーティファクトは縮小され（strip＋ サイズ最適化 ＋brotliによる事前圧縮）、**リリースタグでCloudflare R2に公開される**（`.github/workflows/playground-wasm.yml`の`tags: v*`トリガーは稼働中）。安定した`-latest`ポインタも備える。ドキュメントサイト（`rigor.typedduck.fail`）はそれを取得して静的アセットとして配信するため、公開プレイグラウンドは今やバックエンドなしで**完全にブラウザ内で**動作する。ローカルの`rigor playground` CLIコマンドはオプションBのRackバックエンドを維持する。

## コンテキスト

公開されたプレイグラウンドにより、ユーザーは何もインストールせずに任意のスニペットに対してRigorを試せる。目標とするエクスペリエンスは、左側にMonacoまたはCodeMirrorスタイルのエディタ;右側（またはインラインの型コメントとして）に`rigor annotate`の出力と`rigor check --format json`からの診断ストリームがあり、キーストロークまたはデバウンスティックごとに更新される。

ホスティング目標は**Cloudflare Workers / Pages**: 静的フロントエンドで運用するオリジンサーバーがなく、リクエストごとのインフラコストがゼロで、グローバルな低遅延配信が可能。この目標により、ランタイムの選択が重要になる——Rigorエンジンがユーザーのブラウザ（WASM）で動作するかバックエンドサービスで動作するかが、完全な静的ホスティング目標が達成可能かどうかを決定する。

### オプションA — 完全な`ruby.wasm`（ブラウザ内WASM）

`ruby.wasm`はWebAssemblyにコンパイルされたRubyインタープリタを組み込む。フロントエンドページはRubyランタイム + すべてのgemソース + RigorのYAMLデータカタログを同梱し、解析は完全にブラウザ内で実行される——キーストロークごとのネットワーク往復なし、運用するバックエンドなし。

**このADR時点（2026-05-23）のブロッカー:**

1. **Ruby 4.0 WASMビルドがない**。`ruby.wasm`はRuby 3.x系の本番ビルドを提供する。Rigorのgemspecは`required_ruby_version = [">= 4.0.0", "< 4.1"]`をピン留めする（ADR-27 WD7——`ruby/rbs`が最新Rubyを追跡し、ADR-15のRactorモデルが最近のランタイム機能を必要とするため、Rigorはlatest-Ruby専用を維持する）。このピン留めを緩めることはWD7の根拠と矛盾するため、実行可能な回避策ではない。Ruby 4.0 WASMターゲットはまだ存在しない;出荷される際は本番品質になる前に実験的ビルドとして届くと思われる。

2. **C拡張の依存関係**。Rigorが依存するパーサ`prism`と型環境レイヤー`rbs`の両方がC拡張を持つ。これらは標準の`ruby.wasm`ランタイムバンドルには含まれていない。WASMでのビルドにはEmscriptenツールチェーンとパッチ作業が必要だが、いずれの上流プロジェクトも`ruby.wasm`ターゲット向けに現在メンテナンスしていない。これは設定の選択ではなく、それ自体が独立したエンジニアリングプロジェクトである。

3. **キャッシュレイヤーの`flock`**。`lib/rigor/cache/store.rb`はアトミックなキャッシュ書き込みを守るために`File::LOCK_EX`（`flock(2)`）でアドバイザリーロックを取得する（ADR-6）。`flock`はWASMサンドボックスではサポートされていない（WASI/Emscriptenの仮想ファイルシステムはPOSIXファイルロックを実装していない）。プレイグラウンドはキャッシュをno-opにスタブできるが、これは専用のコードパスまたはビルド時抽象化レイヤーを必要とする。

4. **Cloudflare Workersのバンドルサイズ**。ruby.wasmランタイムバイナリは約15 MB;gemソースとRigorの740 KBのYAMLビルトインカタログを追加すると、1 MBのWorkerスクリプト制限を大幅に超える（有料プランではWASMモジュール制限が25 MBに上がるが、スクリプト + WASM + アセットの全体バンドルは依然タイトなフィットで無料ティアオプションではない）。

5. **Ractor（ADR-15）**。v0.1.8で出荷したフォークベースのワーカープールはWASMでは無効化される;単一スニペットを解析するプレイグラウンドは並行性を必要としないため、シングルスレッド実行パスで対処可能だが、メンテナンスする条件付きコードパスが増える。

**長期的なアップサイド**。オプションAは理想的な最終状態であり続ける: リクエストごとのサーバーコストがゼロ、ネットワーク往復の遅延なし、運用またはセキュリティ確保するバックエンドなし。ブロッカーはすべて時間依存——Ruby 4.0 WASMはいつか出荷される;`prism`はすでにJavaScript WASMビルドを持っており（ウェブベースのエディタで使用される）、公式のRuby WASMビルドは自然なフォローオン;Cloudflareのバンドル制限は`ruby.wasm`チームがよりコンパクトなランタイムを出荷すれば重要性が下がる。WD6はゲート条件を記録する。

### オプションB — サーバーサイドAPI + 静的フロントエンド

フロントエンドはエディタとレンダリングロジックを含む静的HTML/JSページ（Cloudflare Pages）。解析リクエストは`rigor check --format json`と`rigor annotate`にシェルアウトしてJSONを返す小さなHTTP APIに送られる。バックエンドは別のホスティングサービス（Fly.io、Railway、または同等）にデプロイされ、静的フロントエンドから切り離されて保持される。

**利点:**
- 既存のCLIとそのJSON出力契約（contract）で今日動作する。
- Rigorエンジンへの変更なし——APIはユーザーがローカルで実行するのと同じバイナリの薄いシムである。
- Cloudflare Pages上のフロントエンドは完全に静的;APIサーバーのみがコンピュートを実行する。
- リクエストごとの分離は些細に強制される: 各リクエストが`Tempfile`を書き込み、解析を実行し、それを破棄する。

**課題:**
- 完全に静的ではない——小さなAPIサーバーを運用する必要がある。
- 解析リクエストごとのネットワーク往復遅延（デバウンス駆動のプレイグラウンドでは許容可能;ウォームサーバーで100行スニペットに対して< 500 msを目標）。
- セキュリティ強化が必要: 入力サイズ上限、リクエストタイムアウト、レート制限、悪意ある入力がホストに影響しないようにするサンドボックス化。

### オプションC — プロキシとしてのCloudflare Workers

Cloudflare Workerはリクエストを受け取りバックエンドにフォワードできる。これはバックエンドを排除せずに間接レイヤーを追加する。これ以上評価されない;バックエンドが必要なら、Worker経由でルーティングすることは構造的なメリットなしに複雑さを加える。（WorkersはWASMビルドをホストできるが——Workers経由のオプションA——これはオプションAのブロッカーを継承する。）

## 決定

**オプションB（サーバーサイドAPI + 静的フロントエンド）を短期実装として採用する**。オプションAが長期目標;WD6は移行が正当化される前に**すべて**満たされなければならない3つの条件を定義する。

プレイグラウンドは既存のCLIコマンドをラップする3つのエンドポイントを公開する:

| エンドポイント | CLI相当 | レスポンス |
| --- | --- | --- |
| `POST /check` | `rigor check --format json` | JSON診断配列 |
| `POST /annotate` | `rigor annotate` | 注釈付きソーステキスト |
| `POST /annotate-lines` | `rigor annotate`（整形） | `{ 行番号 → 型 }`マップ |
| `POST /type-of` | `rigor type-of` | ポジションの型文字列 |

フロントエンドは静的なCloudflare Pagesサイト。バックエンドはFly.io（または同等）上の同じ`rigortype` Rubyプロセス内で実行される最小限のRackアプリケーションで、Pumaスレッドごとに1ワーカー。

## Working decisions

### WD1 — フロントエンドはCloudflare Pages;バックエンドは別サービス

静的フロントエンド（HTML + JS + エディタバンドル）はCloudflare Pagesにデプロイされる。サーバーサイドレンダリングなし、フロントエンド自体のWorkerコンピュートなし。

APIバックエンドは別のデプロイメント（Fly.ioの無料ティアまたはRailway）。Ruby 4.0 + `rigortype` + 薄いRack/Pumaレイヤーを実行する。バックエンドのCORSヘッダーがPagesドメインからのクロスオリジンリクエストを許可する。

フロントエンドとバックエンドは`plugins/rigor-playground/`に同居する——静的アセット用の`frontend/`とRack/Pumaバックエンドのgemルート。独立してデプロイされる;フロントエンドの`RIGOR_API_URL`はビルド時に環境変数として注入される。

### WD2 — API契約

すべてのエンドポイントはリクエストボディにUTF-8ソースを持つ`application/json`を受け付ける。すべてのレスポンスは`application/json`。

**`POST /check`**

リクエスト:
```json
{ "source": "...", "config": {} }
```

レスポンス（`rigor check --format json` → `Result#to_h`をミラー）:
```json
{
  "diagnostics": [
    {
      "path": "<playground>",
      "line": 3,
      "column": 5,
      "rule": "call.undefined-method",
      "message": "...",
      "severity": "error"
    }
  ],
  "error_count": 1,
  "success": false
}
```

**`POST /annotate`**

リクエスト: `{ "source": "..." }`
レスポンス: `{ "annotated": "# 型コメント付き注釈済みソース..." }`

**`POST /annotate-lines`**（修正2026-05-25）

`/annotate`と同じ入力。`/annotate`の出力をクライアント向けに整形したもの。`#=> dump_type:`コメントの文法を再パースせずに型注釈をインレイヒントスタイルのオーバーレイとしてレンダリングしたいクライアント（スライス（slice）3フロントエンドの「型を表示」トグル）向け:

リクエスト: `{ "source": "..." }`
レスポンス: `{ "annotations": { "1": "String", "5": ":asc | :desc" } }`

マップは1ベースの行番号をキー（JSONオブジェクトのキーは文字列）とし、値は推論された型の短い説明である。`/annotate-lines`は`rigor annotate --format json`を起動し、これはエンジンの行型データからこのマップを直接出力する——`#=>`コメントのテキストはレンダリングも再パースもされない（以前の文字列パース方式はコメントのスペルが変わると静かに壊れた）。注釈のない行はマップに含まれない。

**`POST /type-of`**

リクエスト: `{ "source": "...", "line": 5, "column": 12 }`
レスポンス: `{ "type": "String" }`

`/check`の`config`フィールドは初期は無視される;プレイグラウンドUIに`.rigor.yml`オプションのサブセット（例: `severity_profile:`）を公開する将来のスライス向けに予約されている。

### WD3 — エディタ: CodeMirror 6

フロントエンドエディタはMonacoではなくCodeMirror 6。どちらもRubyシンタックスハイライトをサポートするが、CodeMirror 6が選ばれた理由:

- **バンドルサイズ**。Ruby言語サポートを含む最小限のCodeMirror 6バンドルはgzip圧縮で約100 KB。Monacoのフルバンドルはgzip圧縮で約2 MB;Rubyサポートにはコミュニティパッケージが必要で、言語サーバー統合はWorkerベースの言語サーバープロセスを期待する（ここでは不要——診断はRigor APIから来る）。
- **埋め込み可能性**。CodeMirror 6はライブラリとして設計されており、`/check`レスポンス駆動の波線下線デコレーションと`/annotate`からのインライン型コメント注釈を追加するのが簡単。
- **エディタ自体のビルド時コンパイル不要**。Monacoはアセットパイプラインに`monaco-editor`の別コピーを必要とするが、CodeMirror 6パッケージは標準バンドラー（またはバンドルレスセットアップ用のCDNインポート）でクリーンに統合される。

`/check`からの診断はCodeMirrorのlintマーカー（赤い下線 + ホバーツールチップ）としてレンダリングされる。`/annotate`からの型注釈は、ボタンでトグルされるdiffスタイルの「ゴーストテキスト」オーバーレイとしてレンダリングされる。

### WD4 — バックエンドサンドボックスとリクエスト分離

各HTTPリクエストは分離して処理される:

1. ソースコードはリクエスト開始時に作成された`Tempfile`（`/tmp/rigor-playground-*.rb`）に書き込まれ、`ensure`ブロックで削除される。
2. `Rigor::Analysis::Runner`（または同等のエントリーポイント）はそのファイルに対してインプロセスで直接呼び出される——シェルexecなし、つまりパスからのインジェクションリスクなし。
3. 永続的なオンディスクキャッシュ（ADR-6）はプレイグラウンドバックエンドでは**無効化**される。各リクエストはRBS環境をゼロから構築する。これによりクロスリクエストのキャッシュ汚染が回避され、`flock`依存関係が除去される;遅延コスト（RBS環境ブート約100 ms）はウェブプレイグラウンドには許容可能。
4. リクエストごとにハードな10秒タイムアウトで暴走する推論を終了させる（意図的に敵対的なスニペットが高コストな再帰をトリガーする可能性がある）。
5. 入力はソーステキスト**64 KB**に上限がある。UIはクライアントサイドでこれを強制;バックエンドはサーバーサイドで413レスポンスで強制する。

バックエンドはデフォルトで**`rigor-rbs-inline`**をロードする（[ADR-32](../32-rbs-inline-comment-ingestion/)のWD10に従い）。これにより、`# @rbs`形コメントを含む貼り付けスニペットはページが読み込まれた瞬間からインラインRBSとして解析される——プラグイン設定の探索も、`# rbs_inline: enabled`マジックコメントの入力も不要。プラグインの`require_magic_comment:`設定キーは`false`に設定されている。プレイグラウンドは単一バッファの探索サーフェス（surface）であり、WD2が緩和しようとしている複数ファイルのプロジェクト上の摩擦が存在しないためである。

プレイグラウンドの`.rigor.yml`（バックエンドに埋め込まれる）は固定の設定:

```yaml
plugins:
  - id: rigor-rbs-inline
    config:
      require_magic_comment: false
severity_profile: strict
```

他のプラグインはデフォルトではロードされない。

### WD5 — バックエンドデプロイメント: Fly.ioの無料ティア（シングルマシン）

バックエンドはシングルのFly.io Machine（shared-CPU-1x、256 MB RAM）としてデプロイされる。2スレッドのシングルPumaワーカーで、期待されるプレイグラウンドトラフィックには十分。Fly.ioの無料枠がこの構成をコストなしでカバーする。

トラフィックがスケーリングを要求する場合、Fly.ioのオートスケーリングまたは別ホストへの移行は簡単——バックエンドはホストへのステートフルな結合のないプレーンなRackアプリである。バックエンドのデプロイメントマニフェスト（`plugins/rigor-playground/fly.toml`）はリポジトリにコミットされる。

レート制限（IPごとに50リクエスト/分）は`fly.toml`の`http_service.rate_limiting`経由でFly.ioプロキシレイヤーで強制される。4インフライトリクエストのグローバル同時実行制限により、バーストがRBS環境ブート中にシングルマシンのCPUを独占するのを防ぐ。

### WD6 — ruby.wasm移行ゲート（3つの条件;ステータス2026-06-14）

オプションBからオプションA（完全にブラウザ内WASM）への移行には、以下の3つの条件が**すべて**同時に満たされる必要がある。それぞれの下のステータス行が2026-06-14の再評価を記録する。

1. **Ruby 4.0の公式WASMビルドが本番品質である**。「本番品質」とは: `ruby/ruby.wasm`の下で公開され、上流のテストスイートをパスし、CDNから利用可能またはstable npmパッケージとして利用可能であること。実験的またはナイトリービルドはこの条件を満たさない。
   - **ステータス: 実質的に達成**。`ruby/ruby.wasm`はRuby 4.0ビルド（`ruby-4.0.0`アーティファクト;`@ruby/4.0-wasm-wasi` npmパッケージ）を出荷している。唯一の留保は文言だ: `ruby.wasm`は慣習として「stable」リリースではなく日付付きの*プレリリース*タグの下で公開している——だがこれらは`try.ruby-lang.org`が本番で出荷しているのと同じビルドなので、趣旨（ナイトリー/実験的ではない、CDNからインストール可能）は成立する。

2. **`prism`と`rbs`のWASMパッケージが利用可能である**。両方のgemが公式WASMビルドを提供している必要がある（ruby.wasmランタイムにバンドルされているか、別途ロード可能な`.wasm`モジュールとして）、かつWASMターゲット下で自身のテストスイートをパスする。
   - **ステータス: 達成——フルビルドが2026-06-14にグリーン**。`prism`はCRuby自身のパーサであり、インタープリタwasmの内部に同梱される。WD8の`rbwasm`ソースからのビルドは、`prism`、`rbs`、**および**`psych`をwasi-sdk-24.0に対してリンカーエラーゼロでコンパイルして静的リンクし、69.9 MBの`rigor-playground.wasm`を生成する。最初のスパイクは1つの配線ギャップに当たった——`libyaml.a`がビルドされ`--with-libyaml-dir`が渡されたにもかかわらず、`psych`の`-lyaml`が最終的な静的リンクに到達しなかった——が、`ruby_wasm`がwasi-vfs向けにすでに行っているのと同じやり方で`libyaml.a`をcrossrubyのXLDFLAGSに強制する限定的なビルドパッチ（[`wasm/build_patches/libyaml_link.rb`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-playground/wasm/build_patches/libyaml_link.rb)）で修正された。この条件が問題にしていたC拡張のリスクは完全に解消された;残るのはWD6 ③（サンドボックス下でのランタイムの正しさ）である。

3. **RigorのテストスイートがWASM下でパスする**。ruby.wasmランタイム内で（`flock`とフォークベースのワーカープールをスタブして）`make test`を実行するCIジョブが、テスト数のリグレッションなしにパスする必要がある。このゲートは、WASMサンドボックスにないPOSIX意味論を暗黙に仮定するエンジンコードを捕捉する。
   - **ステータス: プレイグラウンドについては達成——ランタイムを2026-06-14に検証**。アダプタは`@ruby/wasm-wasi` VM内でエンドツーエンドに動作し、**Rackバックエンドとバイト単位で同一の診断**（`nil.upcase`のundefined-method*と*`rigor-rbs-inline`のargument-type-mismatch）を出力する。これは`rake smoke`（[`wasm/smoke.mjs`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-playground/wasm/smoke.mjs)。ブラウザの`DefaultRubyVM` WASIを再現する）によってヘッドレスに確認された。4つのwasmランタイム統合修正が必要であり、いずれも適用済みだ: （a）バンドル内の`gem "js"`——`DefaultRubyVM`がインスタンス化に必要とする;（b）アダプタ内の`require "rubygems"`——ruby.wasmはrubygems無効で動作し、これがないとRBSのローダーが静かに**空の**型ユニバース（0クラス → 何もフラグされない）を構築する;今や334以上のクラスがロードされる;(c) `bundler/setup`（無効化されたrubygemsパスに当たる）ではなく`require "/bundle/setup"`（ruby_wasmのロードパスセットアップ）;（d）書き込み可能な作業ディレクトリ——WASIはパックされたgem / configツリーを読み取り専用でマウントするので、アダプタはcwd相対のキャッシュ + リクエストごとのバッファのために`/work`（ブラウザVMのインメモリの`/`;Node下では明示的なpreopen）をステージングする。`flock` / forkの懸念は予測どおりに保たれた（シム化 / 自己劣化）。wasm下でのフル`make test`はより大きな別の課題のままだが、プレイグラウンドのランタイムの正しさは確立された。

3つの条件がすべて満たされるまで、サーバーサイドAPI（オプションB）が本番バックエンドである。次の具体的なステップはもはや「上流を待つ」ことではない——WD8の`rbwasm`ビルドを実行し、条件②（次いで③）を解決することだ。

### WD7 — プレイグラウンドでの`rigor annotate`出力

`rigor annotate`は今日、型コメントを`# :: Type`注釈として（式行ごとに1つ）付加したソーステキストを出力する。プレイグラウンドはこれをトグル可能な「注釈ビュー」としてレンダリングする——「型を表示」をクリックすると、エディタコンテンツが注釈付きソースに置き換えられる;「編集」をクリックすると元に戻る。注釈ビューは読み取り専用;編集しようとすると自動的に編集モードに戻る。

将来のスライスでは、型注釈をエディタコンテンツを置き換える代わりにCodeMirrorのインレイヒント（式の後にインラインで、ゴーストテキストとしてスタイリング）としてレンダリングするかもしれない——これは、CodeMirrorのインレイヒントAPIがエコシステムで安定し、トグルUXが十分かどうかについてプレイグラウンドが実際のユーザーフィードバックを得るまで先送りされる。

### WD8 — `rbwasm`ビルドパイプライン（2026-06-14に追加）

ブラウザ内ビルドは[`plugins/rigor-playground/wasm/`](https://github.com/rigortype/rigor/tree/master/plugins/rigor-playground/wasm/)にあり、`rigortype`パスgem、`rigor-rbs-inline`、`rbs-inline`——プレイグラウンドの正確なランタイムセット——を含む専用の`Gemfile`に対して`rbwasm`（`ruby_wasm` gem）によって生成される。`rbs`がC拡張を持つため、ビルドは`rbwasm`の**ソースから**のパス（`--build-options`/wasi-sdk）を使い、これが`prism`と`rbs`をコンパイルして単一の`.wasm`に静的リンクする。これは、ビルドをprebuilt + 純粋Rubygemパックから区別する荷重を担う特性である: WD6 ②を満たす唯一の経路だ。

パッキングの決定:

- **カタログ + シグネチャデータがパスgemに同行する**。`rigortype` gemspecはすでに`spec.files`に`data/builtins/**/*.yml`と`sig/**/*.rbs`を列挙しているので、`rbwasm`はそれらを`lib/`と並んでgemのVFSツリーにパックする;エンジンの`__dir__`相対の読み取りは変わらず解決する。（ビルドドキュメントは、ある`ruby_wasm`バージョンが`require_paths`のみをパックする場合に備えて明示的な`--dir`フォールバックを記録している。）
- **キャッシュはオフなので`flock`には決して到達しない**。VM内アダプタは`rigor check --format=json --no-cache`を起動し（WD4はすでにキャッシュなしのプレイグラウンドを義務付けている）、これによりエンジンコードに触れることなく唯一のPOSIXロック依存関係が取り除かれる。
- **設定はパックされた`.rigor.yml`として旅する**。プレイグラウンド設定のコピー（`rigor-rbs-inline`をロード、`severity_profile: strict`）がアダプタの作業ディレクトリのVFSにマッピングされ、`Rigor::CLI.start`の通常のcwd探索がそれを見つける——Rackバックエンドが依拠するのと同じ設定サーフェスである。
- **構築による契約忠実性**。アダプタは`StringIO`バッファに対して`Rigor::CLI.start(argv, out:, err:)`を呼び出し、これはバックエンドの`run_cli`（[`app.rb`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-playground/lib/rigor/playground/app.rb)）とバイト単位で同一の起動である。したがってWD2のJSONシェイプはトランスポート間で同一であり、異なるのはバイトの出所（ネットワーク対VM内）だけである。

**既知のv1コスト——呼び出しごとのRBS環境再構築**。CLIは起動のたびにRBS環境を再構築し、ディスクキャッシュがオフなのでクロスコールの再利用はない。wasmではそのブートはバックエンドの約100 msではなく数秒である。最適化は、ページロード時に環境を一度だけ構築しキーストロークごとに`run_source`を再実行する永続的な`Runner`（ミューテーションハーネスが使う`ProjectContext`の環境一度きりパターン）である;それはCLIなしでCLIのプラグイン / 設定の配線を再導出しなければならないため、また忠実な遅いパスを最初に出荷することが契約を正直に保つため、意図的にv1スキャフォールディングから外されている。WD8のperfフォローアップとして追跡される。

### WD9 — ブラウザ内トランスポート（2026-06-14に追加）

wasmフロントエンドはCodeMirror 6エディタ、lintマーカー、型オーバーレイ、WD2のJSONシェイプをそのまま再利用する;変わるのはトランスポートだけだ。バックエンドページが`fetch("/check", …)`を呼ぶところで、wasmページはリクエストをJSのグローバルにセットしアダプタに対して`vm.eval`を呼び、アダプタはそれを読んで同じJSON文字列を返す。動作中のバックエンドページ（`frontend/index.html`）に手を付けないため、wasmバリアントは**独立した自己完結の静的ページ**（[`wasm/index.html`](https://github.com/rigortype/rigor/tree/master/plugins/rigor-playground/wasm/)）である——2つのデプロイメント（バックエンド上のPages対完全静的wasm）は独立を保ち、WD1の独立デプロイの立場と一致する。`vm.eval`はメインスレッドで同期的にRubyを実行する;解析をWeb Workerにオフロードすること（遅いキーストロークがタイピングをブロックしないように）は、WD8の永続環境の作業と対になるWD9のレスポンシブネスのフォローアップである。

### WD10 — デプロイメント: ドキュメントサイトのサブパス、CIビルドのwasmをR2に（2026-06-14に追加）

プレイグラウンドは`https://rigor.typedduck.fail/playground/`——既存のドキュメントサイト（Cloudflare Workers Static Assets上のAstro + Starlight、`rigor`は`upstream/rigor`サブモジュールとしてベンダリング）のサブパス——で出荷される。そのサイトの2つの事実が設計を形づくる:

1. **サイトのCIはNode専用**（Rubyを決してビルドせず、重い`references/*`サブモジュールを意図的に避ける）なので、wasmはそこではビルドできない——事前ビルドされたアーティファクトとして届かなければならない。
2. **Cloudflare Workers Static Assetsは単一ファイルを25 MiBに上限する**。フルstdlib + `data/builtins`を含むソースからのRuby 4.0 wasmはそれを超える見込みが高いので、このバイナリは静的アセットではない。

決定（2026-06-14に選択）:

- **wasmは`rigor`自身のCIでビルドされ**（ツールチェーンのコンテキストを持つ）、リリース / 手動ディスパッチで、**Cloudflare R2に公開される**——数MBのバイナリをデプロイごとのAstroアセットバンドルとgit履歴の両方の外に保ち、25 MiBのアセット上限を回避する。ビルドは**バージョンピン留め**される: wasmはサイトのサブモジュールが指すのと同じ`rigor`コミットから生成されるので、プレイグラウンドの挙動は同期されたドキュメントと一致する。
- **フロントエンド（`index.html`）は静的アセットとして配信される**。サイトの`public/playground/`下に、専用の同期ステップ（`sync-rigor-docs`を模倣）でサブモジュールからコピーされる。これはフルブリードのアプリなので、Starlightのドキュメントクロームの*外*に位置する;Starlightページがそれにリンクする。
- **ページは設定可能なURLでR2からwasmをフェッチする**（ページはローカルの`rake serve`向けに同一オリジンの相対パスをデフォルトとし、サイトの同期ステップは`<meta>`タグ経由でそれをR2のURLに上書きする）。トランスポートの間接化により、ページはバイナリがアセットかR2ホストかに依存しない。`WebAssembly.compileStreaming`はHTTPSを必要とし（Cloudflareが提供する）、クロスオリジンのR2 URLはバケットにCORSを必要とする;コンテンツハッシュ化されたwasmは`immutable`で配信される。

却下: サイトCIでのビルド（Rubyツールチェーンがなく、デプロイ時間が膨らむ）;どちらかのリポジトリへのバイナリのコミット（大きなgit blob、デプロイごとに再アップロード）;R2を同一オリジンでプロキシするルーティングWorker（サイトは`main` Workerを持たないアセットのみ——R2カスタムドメインまたは公開URLのほうが、Workerスクリプトロジックを導入するより単純である）。

## 実装スライス

このADRではスライスはスケジュールされていない。プレイグラウンドは`0.2.x`評価ラインをブロックしない新しい並行トラックである。

| スライス | スコープ |
| --- | --- |
| 1 | `plugins/rigor-playground/` — Rackアプリケーション、`/check`エンドポイント、リクエストごとの`Tempfile`分離、10秒タイムアウト、64 KB上限、固定`.rigor.yml`（WD4 / ADR-32 WD10に従い`require_magic_comment: false`で`rigor-rbs-inline`をロード）。Fly.ioにデプロイ。スライス1はADR-32スライス1（`source_rbs_synthesizer:`マニフェストフィールドと`rigor-rbs-inline`プラグインの存在）にゲートされる。 |
| 2 | `plugins/rigor-playground/frontend/` — CodeMirror 6、デバウンスされた`/check`呼び出し、lintマーカー、Cloudflare Pagesデプロイ設定。 |
| 3 | `/annotate`エンドポイント + フロントエンドトグルビュー。 |
| 4 | `/type-of`エンドポイント + フロントエンドホバー統合。 |
| 5 | ruby.wasm移行（WD8/WD9/WD10）。**スキャフォールディング + グリーンビルドが2026-06-14に着地**——`plugins/rigor-playground/wasm/`下に、`rbwasm` Gemfile + ビルドタスク、VM内CLIアダプタ、パックされた`.rigor.yml`、静的wasmフロントエンド。**`rake build`が成功するように**: `prism` + `rbs` + `psych`がwasi-sdk-24.0下でリンクし（`libyaml_link`ビルドパッチ経由でWD6 ②達成）、**約70 MB**の`rigor-playground.wasm`を生成する——これは25 MiBを大きく上回るため、WD10のR2ホスティングパスを裏付ける。**ランタイム検証済み（WD6 ③）**: `rake smoke`がブラウザを代表するVMでアダプタを実行し、バックエンドの診断をバイト単位で再現する（4つのwasm統合修正——`gem "js"`、`require "rubygems"`、`/bundle/setup`、書き込み可能な`/work`——の後）。出荷前に残るもの: R2バケット + シークレット、そしてドキュメントサイトの同期配線。 |
