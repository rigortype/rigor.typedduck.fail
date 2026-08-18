---
title: "設定"
description: "rigortype/rigor docs/manual/03-configuration.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/03-configuration.md"
sourcePath: "docs/manual/03-configuration.md"
sourceSha: "1d49940df3bd51b0330ff64a4d4922f8bd50a53906eac09022cdca513eb77fe5"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
sourceDate: "2026-06-15T14:21:04+09:00"
translationStatus: "translated"
sidebar:
  order: 9003
---

Rigorはプロジェクトルートから単一のYAML設定ファイルを読み込みます。`rigor init`でスターターファイルを生成できます。

## 探索と優先順位

`--config`フラグなしの場合、Rigorは以下の順に探索します:

1. `.rigor.yml`
2. `.rigor.dist.yml`

**最初に見つかったファイル**が優先されます。両者はマージされません。慣例として`.rigor.dist.yml`を共有プロジェクト設定としてコミットし、個々の開発者が（追跡されない）`.rigor.yml`をローカルで上書きするために配置します。

設定を置き換えではなく*継承*するには、設定ファイルで`includes:`（再帰的）を使ってベースを指定できます。`--config=PATH`は探索を完全にバイパスします。

設定ファイル内のすべての相対パスは、そのファイル自身のディレクトリを基準に解決されます。

## エディタ検証

RigorはこのファイルのためのJSON Schemaを同梱しています。[`yaml-language-server`](https://github.com/redhat-developer/yaml-language-server)のマジックコメントを理解するエディタ（VS CodeのYAML拡張、IntelliJファミリー、Helix、`yaml-ls`を使うNeovim）では、入力しながらオートコンプリート、ホバードキュメント、構造検証が得られます:

```yaml
# yaml-language-server: $schema=https://github.com/rigortype/rigor/raw/master/schemas/rigor-config.schema.json
```

`rigor init`がその行を書き込みます。このスキーマはこのページのコピーではなく、それ自体が独立した信頼できる情報源であり、specによってローダーと歩調を合わせて保たれます。したがって、それが拒否するキーはRigorが受け付けないキーです。

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
| `target_ruby` | String | `"4.0"` | **自分の**プロジェクトが実行するRubyバージョン。`"X.Y"`、`"X.Y.Z"`、または`"latest"`。Rigor自体が動作するRubyとは独立。 |
| `paths` | Array | `["lib"]` | 解析するディレクトリまたはファイル。 |
| `exclude` | Array | `[]` | スキップするGlobパターン。`vendor/bundle`、`.bundle`、`node_modules`は常に除外される。 |
| `includes` | Array | `[]` | このファイルの下に継承する他の設定ファイル。 |
| `fold_platform_specific_paths` | Boolean | `false` | ソース探索時にRubyバージョン条件付きロードパスを解決する。 |
| `parameter_inference` | Boolean | `false` | `check`ウォークでのオプトインのコールサイトパラメータ型推論（[ADR-67](../../adr/67-parameter-type-inference/) WD6）。`true`のとき、宣言されていない`def` / `initialize` / セッターのパラメータは、解決されたコールサイト引数型のユニオンに型付けされ、下流のivar読み取り・畳み込み・保護カバレッジを精密化する。精度加算的のみ —— 否定的ルールは推論されたパラメータに対して決して発火しない。`--incremental`とは併用できない。 |

### 型ソース

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `libraries` | Array | `[]` | バンドルされたRBSを読み込む標準ライブラリ/gem名。 |
| `signature_paths` | Array | `nil` | `.rbs`ファイルの追加ディレクトリ。相対パスのエントリーは設定ファイルのディレクトリを基準に解決されます。 |
| `pre_eval` | Array | `[]` | ファイルごとの解析前に走査するファイル（またはglob）。プロジェクトのモンキーパッチを登録し、そのトップレベル定数をプロジェクト全体に公開するために使用。 |
| `plugins` | Array | `[]` | 有効化するプラグイン。[プラグインの使い方](../07-plugins/)を参照。 |

### 設定検証の警告

`rigor check`は、設定された値が黙って何にも解決しないとき（タイポがシグネチャを1つも読み込まない（あるいは抑制を無効なままにする）のに、唯一の症状が下流で混乱を招くという種類の間違い）にSTDERRへ警告します。たとえば、欠落したRBSパスは、それが記述するはずだった型へのすべての呼び出しを高信頼の`call.undefined-method`に変えてしまうので、1文字の間違いが数百もの本物の型エラーのように見えることがあります。この監査は次をカバーします:

```
rigor: `excludee` is not a recognized configuration key; it has no effect. Did you mean `exclude`?
rigor: signature_paths: "/path/to/sig" does not exist (no signatures loaded from it)
rigor: signature_paths: "/path/to/sig" matched 0 signature files
rigor: libraries: "csb" is not an available RBS library (no signatures loaded from it)
rigor: disable: "call.undefined-methdo" is not a recognized rule id; the suppression has no effect
rigor: severity_overrides: "flow.bogus" is not a recognized rule id; the override has no effect
rigor: bundler.lockfile: "./missing/Gemfile.lock" does not exist
```

未認識キーのチェックは**トップレベル**のキーを対象とし、他の実装のために予約された名前空間（下記参照）はスキップします。グループの*内側*でのタイポ（`cache: { pth: … }`）は、check時ではなく入力しながらJSONスキーマによって捕捉されます。

これらはエラーではなく警告です。部分的またはオプションのバンドルや、先を見越した設定は妥当なセットアップです。この監査は、明示的で、正常なセットアップに対して安全なシグナルでのみ発火します。未設定のデフォルト（自動検出される`<root>/sig`、自動検出されるバンドル）が警告されることは決してなく、*プラグイン*ファミリー（`rspec.…`、`rbs_extended.…`）配下の`disable:` / `severity_overrides:`トークンは放置されます。そのルールIDは静的に列挙できず、実行時に解決される可能性があるためです。同じ所見は`--format=json`のペイロードでも`config_warnings`の下に（それぞれ`kind`タグ付きで）現れるので、CIはそれらに対してアサートできます。

### 診断

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `disable` | Array | `[]` | プロジェクト全体で抑制するルールIDまたはファミリー。 |
| `severity_profile` | String | `"balanced"` | `lenient`、`balanced`、または`strict`。[診断](../04-diagnostics/)を参照。 |
| `severity_overrides` | Hash | `{}` | ルール/ファミリーごとの重要度。例: `{ call: warning, flow.always-truthy-condition: off }`。 |
| `baseline` | String / `false` | `nil` | `.rigor-baseline.yml`へのパス、または`false`で継承されたベースライン（baseline）を無効化。[ベースライン](../06-baseline/)を参照。 |
| `bleeding_edge` | Boolean / Array / Hash | `false` | 次のメジャーでキューに積まれた変更を前倒しで採用する（[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) § WD2）。`false`は何も採用せず;`true`はオーバーレイ全体を採用し;feature idのリストはそれらのみを採用し;`{ all: true, except: [ids] }`は名指ししたもの以外すべてを採用する。`severity_profile`とは直交する。単一の実行に対しては[`rigor check --bleeding-edge[=ids]`](../02-cli-reference/#rigor-check) / `--no-bleeding-edge`で上書きする。[`rigor show-bleedingedge`](../02-cli-reference/#rigor-show-bleedingedge)で検査する。 |

キューに積まれたフィーチャーは2つの種別のいずれかであり、`bleeding_edge:`はどちらも同じやり方で選択します:

- **severity**フィーチャーは1つ以上のルールを昇格させます —— Rigorがすでに静かに報告している規律が、エラーまたは警告になります。その差分はルールidのリストで、`rigor show-bleedingedge`が出力します。
- **behaviour**フィーチャーは測定・アルゴリズム・デフォルトを変更するもので、どのルールの重大度も動かしません。読むべきルールidの差分がないため、`rigor show-bleedingedge`が出すサマリーが、それを採用すると何が起きるかの説明のすべてです。

名指ししたidをこのバージョンのRigorが知らない場合、拒否されるのではなく無視されます。そのため共有された`.rigor.yml`が、使用中の一部のバージョンでしかキューに積まれていないフィーチャーを名指ししても構いません。

### 依存関係RBS探索

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `bundler.auto_detect` | Boolean | `true` | Bundlerのインストールパスとlockfileを自動検出する。 |
| `bundler.bundle_path` | String | `nil` | 明示的なBundlerインストールルート。 |
| `bundler.lockfile` | String | `nil` | 明示的な`Gemfile.lock`パス。 |

`bundler.auto_detect`はまずプロジェクトローカルな場所（`<project>/.bundle/config`に記録された`path`、次に`<project>/vendor/bundle/`ディレクトリ）でBundlerのインストールルートを探し、プロジェクトにツリー内バンドルがない場合はユーザーグローバルな`bundle config set --global path …`（`~/.bundle/config`）にフォールバックします。

これはrigor自身の環境から`BUNDLE_PATH`を読み取ら**ない**よう意図的に作られており、*デフォルト*の共有場所（`path`が未設定のときの、アクティブなRubyの`GEM_HOME`）にインストールされたgemには到達できません。rigorはそれ自身の隔離されたRubyで動作し、あなたのプロジェクトをデータとして読み取るため（[ADR-27](../../adr/27-tool-distribution-model/)）、ツールチェーンを実行しないとプロジェクトRubyのgem homeを知ることができないのです。`rigor check`の`--stats`がRBSを見つけられなかったgemを表示する場合は、`bundler.bundle_path:`でバンドルを明示的に指し示すか、別の方法でシグネチャを供給してください。すなわち`rbs collection install`（自動探索される）か`dependencies.source_inference:`です。
| `rbs_collection.auto_detect` | Boolean | `true` | `rbs_collection.lock.yaml`を自動探索する。 |
| `rbs_collection.lockfile` | String | `nil` | 明示的な`rbs_collection.lock.yaml`パス。 |
| `dependencies.source_inference` | Array | `[]` | gem単位のソース推論モード（ADR-10）。 |
| `dependencies.budget_per_gem` | Integer | `5000` | gem単位のソースウォーク上限。時間ではなく**メソッド定義**の個数で数えます。ウォーカーはgemのカタログを収集する際、この個数の`def`に達するとそれ以上の収集を停止し、`dynamic.dependency-source.budget-exceeded`を発行して残りを`Dynamic[top]`に縮退させます。範囲は1250〜20000です。 |
| `dependencies.budget_overrun_strategy` | String | `"walker_cap"` | `budget_per_gem`に達したgemへの呼び出しに何が起きるか（ADR-10 § 5b）。`walker_cap`（デフォルト）は、上限を超えたメソッドをエンジンの通常のユーザークラス解決にフォールスルーさせます。`dependency_silence`は代わりに、予算超過したgemのクラスへのあらゆる呼び出しを`Dynamic[top]`に解決し、そのgemの記録されていないサーフェスにおける`call.undefined-method`を黙らせます。その箇所での静的チェックが弱くなる代償を伴います。 |

### 実行

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `cache.path` | String | `.rigor/cache` | 永続キャッシュディレクトリ。[キャッシュ](../12-caching/)を参照。 |
| `cache.max_bytes` | Integerまたは`null` | `268435456`（256 MB） | キャッシュディレクトリのLRU退避の上限。`null`で退避を無効化する。[キャッシュ § サイズと退避](../12-caching/#サイズと退避)を参照。 |
| `cache.validation` | String | `"auto"` | キャッシュがファイルの未変更をどう確認するか: `auto`はCI環境が検出されたときは`digest`として、それ以外では`stat`として振る舞う;`stat`はサイズ＋ナノ秒単位のタイムスタンプ＋inodeを比較し、statが動いたファイルだけを再ハッシュする;`digest`は実行のたびに全ファイルの内容を再ハッシュする。どちらも内容ハッシュを変更判定の唯一の権威として保つ——`stat`はstatがファイルの未変更を証明できるときにハッシュ計算を省くだけである。[キャッシュ § ファイルの変更確認方法](../12-caching/#ファイルの変更確認方法)を参照。環境変数`RIGOR_STRICT_VALIDATION=1`は1回の実行に対して`digest`を強制し、このキーより優先する;`RIGOR_CI_DETECT=0`はCI検出を無効化する。 |
| `parallel.workers` | Integer | `0` | ファイルごとの解析用の並列ワーカープロセス（現在はfork方式のプール、ADR-15）。`0`は逐次処理。CLI `--workers`と`RIGOR_RACTOR_WORKERS`が優先される。フル実行と同様に`--incremental`の再チェックにも適用される。 |
| `plugins_io.network` | String | `"disabled"` | プラグインネットワークポリシー。`disabled`または`allowlist`。 |
| `plugins_io.allowed_paths` | Array | `[]` | プラグインが読み取り可能なファイルシステムパス。 |
| `plugins_io.allowed_url_hosts` | Array | `[]` | `network: allowlist`のときプラグインがフェッチ可能なURLホスト。 |

### エフェクトラベル

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `effects` | Hash | なし | **エフェクトラベルへのオプトイン（[ADR-103](../../adr/103-effect-labels/)）**。このブロックの*存在*がスイッチです —— `effects: {}`はすべてのサブキーをデフォルトのまま収集を有効にし、書かなければ`rigor check`はバイト単位で同一かつ無償のままです。他の何によっても収集はオンになりません: RBSの`%a{pure}`や`%a{rigor:v1:effect …}`アノテーションもオンにしません。アノテーションが黙ってすべてのランを高くつくものにしてはならないからです —— そのようなプロジェクトは代わりに、アノテーションが不活性である旨の`effect.annotations-unchecked`（`:info`）をランごとに1件受け取ります。キーがないとき`rigor effects`は暗黙の空ブロックの下で走るので、何も設定せずにレポートを試せます。エフェクトサマリーは固有のアイデンティティ（Rigorのエフェクトボキャブラリー、その組み込みカタログ、そしてこのブロック）の下でキャッシュされるので、同じジョブで`rigor check`の後に走る`rigor effects`はキャッシュヒット＋伝播で済み、このブロックのオン／オフはあなたの診断キャッシュを無効化しません。サブキーは下記のとおりです。`views`はスキーマに宣言済みの予約キーで、受理はされますが**まだ読まれません**。[`rigor effects`](../02-cli-reference/#rigor-effects)を参照。 |
| `effects.check` | Boolean | `true` | あなたが宣言したエンベロープ —— RBSの`%a{pure}`と`%a{rigor:v1:effect …}`、および下記の`effects.envelopes:`スタンザ —— をRigorが証明したものと照合し、`effect.envelope-exceeded`と、ボキャブラリーが認識しないラベルについては`effect.unknown-label`を表面化させるかどうか。`false`にすると、レポートとスナップショットは保ったまま両方を黙らせます。`effects:`ブロックなしでオンになることはありません。 |
| `effects.snapshot.path` | String | `.rigor-effects.yml` | `rigor effects update`がコミット対象の記録を書き出す場所。 |
| `effects.snapshot.reach` | Array | `[]` | スナップショットが`reach:`の下に**推移的**フットプリントを記録するエントリポイント。各エントリーはプロジェクト相対のファイルglob（`unused --entry-point`のセマンティクス —— ディレクトリ境界をまたぐ唯一の方法は`**`）か、プラグインが登録したエントリポイント**プリセット**の名前。Railsアプリでは`reach: [rails]`が求めるものです —— 下記参照。何も登録していない名前は、スナップショットの構築時にエラーになります（設定のロード時ではありません。プリセットを名付けるプラグインはその設定*から*ロードされるためです）。 |
| `effects.snapshot.gate` | String | `symmetric` | `rigor effects check`が何をドリフトとして扱うか。`symmetric`はあらゆる差異で失敗します —— エンキューを*やめた*ジョブもニュースです;`additions`は増加のみのラチェットです。 |
| `effects.labels` | Array | `[]` | **あなたのプロジェクト**が登録するエフェクトラベル。Rigorが出荷するボキャブラリーの上に重ねられます。プロジェクトは任意のルート（`acme.cache`）を開けます —— ここにラベルを列挙することが保証の行為です。いったん登録されれば、そのラベルは下記の他のすべてのキーで使えるようになり、未知として報告されなくなります。不正な綴りはロードエラーです。 |
| `effects.attribution` | Hash | `{}` | Rigorが見えないコードへの呼び出しが*何をするか*を、メソッドをキーにして記述: `{"Net::HTTP.get": [io.net.http], "Logger#info": [telemetry]}`。キーはメソッドキー —— `Owner#instance_method`または`Owner.singleton_method` —— で、それ以外はロードエラーです。ラベルは呼び出し元の**宣言**レーンに着地し、証明レーンには決して着地しないので、帰属によって診断が発火することはありえません;その呼び出しは引き続き未解決として数えられます。あなたがそのコードの振る舞いをRigorに教えただけで、Rigorが読んだわけではないからです。誰もプラグインを書いていないgemに使ってください。 |
| `effects.envelopes` | Array | `[]` | **規約による**エフェクトエンベロープ。アーキテクチャの層全体を、メソッドごとのアノテーションではなく1つのスタンザで制限します。各エントリーは`match:`（クラスが定義されているファイルに対するプロジェクト相対のパスglob）または`namespace:`（定数glob: `*`は1セグメント、`**`は1つ以上）のちょうど一方と、`effect:` —— 選択されたクラスが行ってよいラベル、純粋なら`[]` —— を指定します。最も近いものが勝ちます: メソッド単位のアノテーションはクラスレベルのものに勝ち、クラスレベルはスタンザに勝ちます;スタンザ同士では**最初**にマッチしたものが勝ちます。下記の例を参照。 |
| `effects.tolerated` | Array | `[]` | プロジェクトが対処しないと決めたラベル。境界や差異が**裁定される**ときに適用され、記録が書かれるときには決して適用されず、しかも**起点ごと**に適用されます: `Logger#info`は`io`と`telemetry`を一緒に運ぶので、`tolerated: [telemetry]`はロギングに伴ってきた`io`を免除し、同じメソッド内の`File.read`に由来する`io.fs.read`はそのままの位置に残します。`rigor check --no-tolerated-effects`（および`rigor effects check`の同じフラグ）はリストが空であるかのように再裁定します —— このポリシーの監査スイッチです。 |

ブロックを書かずにオンにしたいですか？[`effects-on-by-default`](../02-cli-reference/#rigor-show-bleedingedge)ブリーディングエッジ機能（`bleeding_edge: [effects-on-by-default]`）は、`effects:`キーをまったく持たない設定を`effects: {}`であるかのように振る舞わせます —— 収集、`effects.check`、そしてこのページのその他すべてがデフォルトでオンになります。これは*不在*だけを埋めます: `effects: false`と書けばあなたは何があろうとオプトアウトのままで、あなたが書いた`effects:`ブロックは書かれたとおりそのまま残ります。これは**v0.4.0**でデフォルトになるものをプレビューします（[ADR-103](../../adr/103-effect-labels/) § WD15）。

#### エントリポイントプリセット

`reach:`は「誰のフットプリントを記録が覆うべきか」を問い、フレームワーク上での正直な答えは、あなたのコードについてではなくフレームワークについての事実です。だから、それをモデル化するプラグインがその集合に名前を付け、あなたはそれを採用します:

```yaml
plugins:
  - rigor-railties
  - rigor-activerecord
  - rigor-actionpack

effects:
  snapshot:
    reach: [rails]
```

`rails` —— [`rigor-railties`](../plugins/rigor-rails/)が登録 —— は`app/controllers/**`・`app/jobs/**`・`app/mailers/**`・`app/channels/**`を表します: 外の世界がアプリケーションに入ってくるすべての経路です。コンポーネントプラグインは、4つ全部ではなく1つの層のフットプリントが欲しい場合に備えて、より狭い`rails-controllers`・`rails-jobs`・`rails-mailers`・`rails-channels`も登録します。プリセットはglobに付けた名前にすぎません;1つのリストで両者を混ぜても構いません。

プラグインを列挙することがそのプリセットを登録する行為なので、`plugins:`に`rigor-railties`がないまま`reach: [rails]`と書くと、その旨のエラーになります。

#### 規約によるエンベロープ

`envelopes:`リストは、RBSを1行も書く前の初日から元が取れるサーフェスです:

```yaml
effects:
  envelopes:
    - match: "app/presenters/**/*.rb"   # presenters render; they do not query
      effect: []
    - namespace: "Policies::*"          # Policies::Edit, not Policies::Admin::Edit
      effect: [mutate.local]
    - match: "app/jobs/**/*.rb"
      effect: [io]
  tolerated: [telemetry]
```

スタンザは、選択したすべてのクラスのすべてのメソッドにその境界を付けます。クラスに書いたアノテーションとまったく同じです。それを超えるメソッドは、破ったスタンザを名指しする`effect.envelope-exceeded`を`def`の位置に1件受け取ります:

```
app/presenters/user_presenter.rb:14:1: warning: Method Presenters::User#render performs io.fs.read
  (File.read), but is declared effect: [] at .rigor.yml effects.envelopes[0], so io.fs.read exceeds
  the envelope. [effect.envelope-exceeded]
```

1つのメソッドが意図的な例外であるときは、そのメソッドにRBSでより狭いエンベロープを書いてください —— 最も近いものが勝つので、`except:`キーは要りません。ある*種類*のエフェクトがどこでも許容できるときは、すべてのスタンザを緩める代わりに`tolerated:`にそれを名指ししてください。

ある層がまだ境界を持つ準備ができていないなら、`envelopes:`は書かずに、コミット対象のスナップショット（[`rigor effects update`](../02-cli-reference/#エフェクトスナップショット)）から始めてください —— それには宣言が一切要りません。スタンザは第2段階で、記録がその層の実際の振る舞いを教えてくれてから書くものです。

### 他の実装のために予約済み

| キー | 型 | デフォルト | 意味 |
| --- | --- | --- | --- |
| `rigor_rs` | Hash | — | **予約済み。この実装はスキップする**。別のRigor実装がこの名前空間の下のキーを読み取るため、1つの`.rigor.yml`で両方に対応できます。Rigorはその形をスキーマレベルでのみ検証し、値を決して読み取らず、無効な値もここでは実行時エラーになりません。それを読み取るツールが別の指示をしない限り、そのままにしておいてください。 |

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
