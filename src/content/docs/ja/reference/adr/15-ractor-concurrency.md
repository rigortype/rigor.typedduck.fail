---
title: "ADR-15 — アナライザーのRactorベース並行性モデル"
description: "rigortype/rigor docs/adr/15-ractor-concurrency.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/15-ractor-concurrency.md"
sourcePath: "docs/adr/15-ractor-concurrency.md"
sourceSha: "cef5eeb88a949051ac806789e375c7e8a89d0f01c8d803e7603ea91351a6502c"
sourceCommit: "035915291e331f3bcd5ce804a1e30dc284ffbd48"
translationStatus: "translated"
sidebar:
  order: 4015
---

Status: **proposed、2026-05-14**。フェーズ1と2aはこのADRが書かれる前に段階的に着地済み;ADRはコミットメントを形式化し、フェーズ2b〜4が安定した契約に対して着地するようにします。ADR-12（dry-rbパッケージング）は引き続き予約スロットを保持;このADRはそれから独立しています。

## コンテキスト

RigorのアナライザーはCPUバウンドのRubyです。v0.1.4時点でのウォームキャッシュ`rigor check lib`プロファイル（157ファイル、stackprof `wall(1000)`、1340サンプル）の内訳は:

| フェーズ | wall割合 | 注記 |
| --- | --- | --- |
| 推論（`ExpressionTyper#type_of`、`MethodDispatcher.dispatch_precise_tiers`） | 約50% | アナライザーの主な仕事 |
| `Marshal.load`（起動時のキャッシュヒット） | 22.5% | RBS env / instance_defs / singleton_defsのデシリアライズ |
| GC（mark + sweep） | 約15% | Ruby標準のオーバーヘッド |
| Prismパース | 約3% | すでに高速 |
| その他（ファイルウォーク、CheckRules編成、プラグインフック） | 約9% | ファイルごとの儀式 |

2つのインフラストラクチャー変更がすでに着地:

- **`Cache::Store`スレッドセーフティ**（コミット`31e95c8`） — 再入可能な`Monitor`が`@memo`プラスヒット / ミス / ライトカウンターをガードするため、並行ワーカーが1つのStoreを競合なしで共有できる。
- **`Cache::Store`インプロセスメモ**（コミット`5c30b37`） — インメモリレイヤーが繰り返しの`(producer_id, key)`キャッシュヒットをプロセスあたり1つの`Marshal.load`に畳み込む。RSpec側の勝利は6×（162秒 → 27秒、`parallel_tests`使用）;シングルショットCLIではレイヤーは休眠中、各プロデューサーが1回しか参照されないため。

マルチコア利用はThreadベースのファイル並列性（`Runner#analyze_files`がワーカープール経由でディスパッチ）でプロトタイプ化された。結果は**ネガティブ**: `RIGOR_WORKERS=4`で12コアマシン上のwall-clockが1.85秒から2.15秒に増えた。RubyのGVLがCPUバウンド作業をシリアライズし、アナライザーは圧倒的にCPUバウンド;スレッド協調のオーバーヘッドが（ゼロの）GVLリリースされたゲインを超えた。コードは差し戻された;発見は`docs/CURRENT_WORK.md`オープン項目#7に記録されている。

MRI Ruby 4.xでマルチコア利用への唯一の実現可能なパスは:

1. **フォークベースのワーカー** — 親に協調された独立プロセス。GVLを完全にバイパス。プロセスごとの起動コスト（macOSで約50〜100ms）プラスプロセスごとの`Environment`再構築が高速化エンベロープを制限する;数百ファイルまたは複数秒の解析テールを持つプロジェクトでのみ正味プラスになる。
2. **Ractor** — GVLをバイパスしながらインプロセスメモリセマンティクスを保つ、共有しない並行プリミティブ。Ruby 3.x+とRuby 4.xで安定。厳格な共有可能性制約（Ractor境界を越えるすべてのオブジェクトは`Ractor.shareable?`でなければならない（MUST））がアナライザー全体の採用を自明でなくする。

ADR-15は**Ractorを主要な並行性の方向性として**コミットします。フォークベースのワーカーは除外されていない — 大きなプロジェクト向けの素早い勝利として最初に着地できる — が、このADRが固定する長期的な形はRactorベースです。

## ゴール

- 利用可能なCPUコアでスケールするウォームキャッシュ`rigor check`での**wall-clock並列性**。目標: 100+ファイルのプロジェクトは4ワーカーで3×以上の高速化;小さなプロジェクトは1.05×を超えない（ワーカー起動オーバーヘッドが償却される）。
- **正確性のリグレッションなし**。診断出力は完了順序に関係なく決定論的のまま。プラグイン契約は引き続き公開された動作を尊重する。
- **段階的採用**。各移行フェーズは独立して出荷され独立して取り消し可能。監査spec（[`spec/rigor/ractor_readiness_spec.rb`](https://github.com/rigortype/rigor/blob/main/spec/rigor/ractor_readiness_spec.rb)）はフェーズ間の契約。
- **デーモン / ウォッチモード対応**。Ractor分離ワーカーをサポートする形は、繰り返される`run`呼び出し（LSP、ウォッチモード、将来の`rigor server`）を呼び出しごとにRBS状態を再構築せずに処理する長寿命の`Analysis::Runner`インスタンスもサポートする。`Cache::Store`インプロセスメモはこの半分を実装している;Environment分割が残りを完了させる。

## 非ゴール

- **デフォルトとしてのRactorベース実行の強制**。フェーズ4はオプトイン（env var / configフラグ）として出荷;シーケンシャルパスがデフォルトのまま。Ractor実行は公開された例プラグインがすべてRactorテスト済みになり、ワーカープールの起動コストが低く検証されたときにデフォルトになる。
- **プロセスプール統合**。フォークベースのワーカーは`docs/CURRENT_WORK.md`オープン項目#7で別途追跡。2つのパスは共存できる;このADRはフォークパスについていずれの方向にもコミットしない。
- **コードベース全体の純粋Ractorリファクター**。可変インプロセス状態は属する場所にとどまる（例: Ractorごとの推論キャッシュ）。分割は「凍結されたリフレクションレイヤー共有 + Ractorごとの可変キャッシュレイヤー」であり、「どこでもすべて不変」ではない。

## 決定

Rigorは[`docs/design/20260514-ractor-migration.md`](../../design/20260514-ractor-migration/)に文書化された4フェーズ移行に従ったRactorベースの並行性を採用します:

1. **フェーズ1 — 値オブジェクトの共有可能性（着地済み）**。エンジンがディスパッチを通じて送るすべてのリーフキャリアは構築時に`Ractor.shareable?`。カバレッジ: `Type::*`（16クラス）、`TypeNode::*`（7クラス）、`Cache::Descriptor`、`Analysis::FactStore`、`FlowContribution`。リグレッションガードは[`spec/rigor/ractor_readiness_spec.rb`](https://github.com/rigortype/rigor/blob/main/spec/rigor/ractor_readiness_spec.rb)。
2. **フェーズ2a — `Configuration`ディープフリーズ（着地済み）**。`Configuration#initialize`が`@paths`配列を凍結し、`self`に`freeze`を呼ぶ。2行の変更、動作シフトなし。
3. **フェーズ2b — Environment / RbsLoader分割（着地済み）**。新しい`Rigor::Environment::Reflection`値オブジェクトがローダーの読み取り専用RBSクエリサーフェス（5つの凍結テーブル + 祖先名）を保持し、純粋なHash / Setルックアップから`class_known?` / `instance_definition` / `singleton_definition` / `class_type_param_names` / `constant_type` / `class_ordering`に応答する。`RbsLoader#reflection`が1つを構築 + メモ化;新しい`Environment#reflection`が委譲する。Reflectionは`frozen?`だが`Ractor.shareable?`ではない（下記WD6を参照）。各Ractorワーカー（フェーズ4）は共有された`Cache::Store`から自身のReflectionを構築する;Reflection自体はRactor境界を越えない。
4. **フェーズ3 — プラグイン契約（フェーズ3a着地済み）**。`Plugin::Blueprint`（新規）は凍結されたRactor共有可能なリプレイディスクリプタで、`klass_name` + ディープフリーズされた`config`を運ぶ。`Plugin::Registry`は今、整列されたRactor共有可能な`Array<Blueprint>`として`blueprints`を公開し、`Object.const_get + klass.new + #init(services)`を介して各ブループリントをリプレイしてフレッシュなレジストリを構築する`Registry.materialize(blueprints:, services:)`を追加する。プラグインgemはワーカーがスポーンする前にメインRactorから`require`される — そのため、ワーカー内でブループリント解決がgemを再ロードせずに成功する。プラグインインスタンスは意図的に非共有のまま — ivar内の実行ごとの状態を蓄積する（`rigor-sorbet`の`@reachable_absurd_nodes` / `@reveal_type_calls` / `@assert_type_mismatches`が正典の例）。フェーズ4のワーカーパターンは: ブループリントを境界越しに送り、ワーカーごとに1度実体化し、インスタンスを共有しない。フェーズ3b（クロスRactorプラグイン集約状態 — § OQ2を参照）は、フェーズ4が実際の使用を測定するまで先送り。
5. **フェーズ4 — Ractorワーカープール**。`Analysis::Runner#analyze_files`が凍結された`Environment`を共有する`Ractor.new`割り当てプールにディスパッチする。結果の再アセンブリは元のパス順序を保持するため、診断ストリームは決定論的のまま。3つのサブフェーズに分解（完全なプランは[`docs/design/20260514-ractor-migration.md`](../../design/20260514-ractor-migration/) § フェーズ4）:
   - **フェーズ4a（着地済み）**: `Analysis::WorkerSession`値キャリア。`Ractor.shareable?`入力（`Configuration`、`cache_store`、`Array<Plugin::Blueprint>`）を取り、自身のプラグインサービス + 実体化されたレジストリ + `DependencySourceInference::Index` + `Environment` + セッションごとの`RbsExtended::Reporter` + `BoundaryCrossReporter`を構築するワーカーごとの基板。`#analyze(path)`は`Runner#analyze_file`の等価物。ループ内にまだRactorなし — 基板は存在し、ワーカーごとの所有権境界が分離してテスト可能になる。
   - **フェーズ4b（着地済み）**: `Runner`は`workers: N`コンストラクターキーワードを取得（デフォルト`0` = シーケンシャル）。`N > 0`のとき、ファイルごとの解析はWorkerSessionを実行するN個のRactorにディスパッチされる。ワーカーは`Ractor.main.send`（Ruby 4.0+のメールボックスモデル — yieldは削除された）を介して書き戻す。コーディネーターはワーカーごとのレポーターをマージし、診断を元のパス順序で並べ替える。`Environment::ClassRegistry.default`は`Ractor.make_shareable`され、ワーカーが`Ractor::IsolationError`なしに読み取れる。CLIサーフェスは触れられないまま — `workers:`はこのスライスではプログラム的なオプトインのみ。フェーズ4cがユーザー向けフラグを配線する。
   - **フェーズ4c（着地済み）**: `Configuration#parallel_workers`（デフォルト`0`）が`.rigor.yml`の`parallel.workers:`を読む;CLIの`--workers=N`フラグと`RIGOR_RACTOR_WORKERS` env varがそれをオーバーライドする。優先順位: CLI > env > config > `0`。デフォルトは引き続きシーケンシャル — プールモードは、ワーカー側のenv構築安定性作業（フェーズ4b.x;下記§「既知の制限」を参照）が着地するまでオプトインのまま。プールspecは`RIGOR_INCLUDE_RACTOR_POOL=1`の後ろにゲートされ、デフォルトの`make verify`が決定論的のまま;`make test-ractor-pool`が分離して実行する。

[`spec/rigor/ractor_readiness_spec.rb`](https://github.com/rigortype/rigor/blob/main/spec/rigor/ractor_readiness_spec.rb)の監査specがフェーズ間の契約。マッチする`Ractor.shareable?`アサーションを書かずに新しい値オブジェクトクラスを追加するのはリグレッション。

## リファレンス: 共有境界

RactorはRactor境界を越えるすべてのオブジェクトが`Ractor.shareable?`である必要がある — 凍結 + すべてのフィールドが再帰的に共有可能。このADRがコミットする分割は:

- **凍結されたサーフェス** — 呼び出し元がRactor-sendするものはすべてこのサーフェスにある必要がある。Configuration、Environment（フェーズ2b後）、Scope（フェーズ2b後）、すべての値オブジェクトキャリアがここに乗る。
- **Ractorごとの可変サーフェス** — キャッシュ、メモ化テーブル、プラグインの実行ごとの状態。各Ractorが自身のものを所有;データは状態としてRactor境界を越えない。派生した共有可能な値（例: 一度ロードされて共有される凍結された`RBS::Definition`）のみが越える。
- **クロスRactor共有可変サーフェス** — 正確に1つのクラス: `Cache::Store`。Monitor + memoレイヤーが共有アクセスを安全にする。StoreのベースディスクはRactor寿命を越えて（およびプロセス寿命を越えて）耐久性があるため、上のRactorごとのキャッシュレイヤーは単一の共有基板からウォームアップする。

## 作業上の決定

### WD1 — なぜフォークではなくRactor？

両方ともGVLをバイパスする。トレードオフ:

| 側面 | Ractor | フォーク |
| --- | --- | --- |
| セットアップコスト | Ractorあたり（約10ms） | フォークあたり（macOSで約50〜100ms、Linuxではより低い） |
| メモリ | 共有された凍結サーフェス、Ractorごとの可変 | コピーオンライト（Linux） / フルコピー（macOS） |
| 協調 | `Ractor.yield` / `Ractor.send` / `Ractor.take` | パイプ + シリアライゼーション |
| プラグイン形状変更 | 一回限りのリファクター（フェーズ3） | プラグインは無傷で生存（別プロセス） |
| デーモン / ウォッチモードの再利用 | 直接（Ractorプールが永続化） | 各リクエストが新たにフォーク |
| 決定性 | 強い（共有可能契約がそれを強制） | 強い（シリアル化されたIPC） |
| 4.xでのMRI成熟度 | 安定、共有可能性に注意点あり | 安定、macOSオーバーヘッドあり |

Rigorの特定の形 — すべてのファイル間で共有された単一のEnvironment、そのEnvironmentを与えられればステートレスなファイルごとのディスパッチ — に対して、Ractorはより近いフィットです: 共有しない境界が、まさにRigorのデータが分割されたい場所です。フォークは実行ごとにプロセスごとのEnvironment再構築を強制し、インプロセスメモが提供するキャッシュウォーム済みの恩恵を排除する。

フェーズ3のプラグインリファクターが予想より侵襲的だと判明した場合、フォークパスは実行可能なフォールバックになります — フォークはプラグインが共有可能であることを要求しません。私たちはフォークに**反対**してコミットしているのではなく;Ractorに主要な方向性としてコミットしているのです。

### WD2 — なぜ`RbsLoader`を共有可能にするのではなく分割するのか？

`RbsLoader`は3つの可変Hashes（`@class_known_cache`、`@instance_definition_cache`、`@singleton_definition_cache`）プラス内部の`RBS::Environment`（上流、こちらも可変）を運ぶ。ローダー全体を共有可能にするには次のいずれかが必要:

- 可変Hashesを`Ractor.make_shareable`不変スナップショットに置き換える — キャッシュを打ち破る、呼び出しごとのミスパスがすべてフルenvウォークになる。
- Hashesを`Ractor::TVar`または類似に置き換える — MRI 4.xには存在しない。
- すべてのアクセスにわたる粗いMonitor — 原則として動作するがRactorの共有しないモデルは明示的にこのパターンを拒否する;Monitor-ガードされた共有キャッシュはRactor契約に違反する。

ローダーを分割してEnvironmentが凍結されたリフレクションファサードのみを運ぶようにすると、キャッシュが保たれ（Ractorごとの可変、クロスRactor`Cache::Store`から取り込まれる）、AND Ractor契約を満たします。コストはリファクター;代替手段はフェーズ4ワーカープールなし。

### WD3 — なぜ共有ではなくRactorごとのキャッシュ？

`Cache::Store`はプロセス共有のmonitor-safeインメモリレイヤーを提供する。なぜすべてのRactorを直接そこに向けないのか？

`Cache::Store`はクロスRactor共有ポイントです — しかしStoreと呼び出しサイトの間にはローダーごとのメモ化レイヤー（`@class_known_cache`など）が座る。メモ化レイヤーはCache::StoreルックアップANDデシリアライズステップを暖かい呼び出しでスキップする。それをクロスRactor共有にするには次のいずれかが必要:

- すべてのRactorからのメモアクセスごとにMonitorロック — Ractor契約違反。
- HashをRactorごとの共有不変スナップショットへのビューに置き換える — ミスパスでウォームアップの恩恵を打ち破る。

Ractorごとのキャッシュレイヤーは最初のミスでRactorあたり1つのコールドスタートを払う。Cache::StoreはクロスRactorのウォームアップ（シリアル化されたディスクエントリーAND繰り返しのプロセス内Runner呼び出しのためのインプロセスメモ）をカバーする。組み合わされた動作:

- 最初のRunner.run、最初のRactor、クラスXに対する最初の`class_known?`呼び出し: Cache::Store memoミス → ディスクヒット（または構築） → memo書き込み。ローダー上のRactorごとのmemoがそのRactor内の後続呼び出しの結果をキャッシュする。
- 2番目のRactor、クラスXに対する最初の`class_known?`呼び出し: Cache::Store memo HIT（クロスRactorウォーム） → ディスクなし、Marshal.loadなし。Ractorごとのmemoがワーカーの残りのファイルのためにキャッシュする。

これは2つのレイヤーを正しく構成する。Ractorごとのmemoは小さい（触れたクラスあたり1つのHashエントリー）;Cache::Store memoはプール全体で償却される。

### WD4 — なぜデフォルトではなくオプトイン？

フェーズ4は、例プラグインエコシステムがRactor分離下で検証されるまで、Ractorワーカーをオプトイン（env var / configフラグ）として出荷する。具体的には:

- フェーズ3のプラグイン契約変更は侵襲的。フェーズ3が着地する前に作成されたプラグインは、共有された可変状態に偶発的に依存している可能性がある（MAY）。ワーカーをデフォルトで有効化すると、それらのバグがユーザーコードで表面化する。
- ワーカー起動コストは典型的なプロジェクト形状に対してデフォルト化前に測定する必要がある。50ファイルプロジェクトはワーカープールオーバーヘッドのために遅くなるべきではない。
- 決定性動作（特にプラグイン貢献タイミング周辺）にはまだ存在しないspecカバレッジが必要。

オプトインは早期採用者がトレードオフに注意を払うことを意味する;デフォルトオンは全員が払うことを意味する。検証データがそれを正当化したときにデフォルトオンにする。

### WD6 — なぜ`Environment::Reflection`は`Ractor.shareable?`ではないのか？

フェーズ2b実装中に発見: キャッシュされた`instance_definitions` / `singleton_definitions`テーブルは、推移的に`RBS::Location`を参照する上流の`RBS::Definition`オブジェクトを保持する。`RBS::Location`は`Ractor.make_shareable`が拒否するC拡張状態（`lib/rigor/cache/rbs_environment_marshal_patch.rb`の`RBS::Environment` Marshalパッチを強制したのと同じ制約）。

解決: Reflectionは凍結 + 読み取り専用 — 不変性の勝利 — だが`Ractor.shareable?`ではない。Ractorワーカープール（フェーズ4）は、各ワーカーが共有された`Cache::Store`から自身のReflectionを構築することで制約をサイドステップする。クロスRactor共有ポイントはStoreのディスク + インプロセスメモレイヤー（すでにMonitor-safe）;各RactorのReflectionは、同じベースデータのRactorごとの不変な読み取り側ビュー。

将来のRBSリリースが`RBS::Location`をRactor共有可能にすれば、Reflectionの`initialize`に`Ractor.make_shareable(self)`を1行追加すれば、キャリア全体がクロスRactor共有可能になります。それまでは、ワーカーごとのReflectionパターンが契約です。

監査spec（[`spec/rigor/ractor_readiness_spec.rb`](https://github.com/rigortype/rigor/blob/main/spec/rigor/ractor_readiness_spec.rb)）は両方のプロパティを明示的に文書化する: `be_frozen`アサーションとRBSが制約を解除した日に失敗する`not_to be(Ractor.shareable?)`アサーション、1行のアップグレードを促す。

### WD5 — スレッドベースの並行性を完全に非推奨にすべきか？

いいえ。`Cache::Store`はMonitor + インプロセスメモを保持する。理由:

- `parallel_tests`の恩恵（specスイートの6×高速化）はThread様のプロセス分離を使うが、ディスク上で`Cache::Store`ディレクトリを共有する;インプロセスメモとMonitorの両方がプロセスレベルで引き続き有用。
- 将来のI/Oバウンド作業（例: ネットワークからのプラグイン`IoBoundary`フェッチ）はThreadを生産的に使える — それらはCレベルI/O中にGVLをリリースする。
- Monitorコストは競合ゼロパス（シングルスレッドのシーケンシャル解析）でゼロ。

スレッドベースの並列性は非推奨ではない;それはマルチコアCPU利用へのパスではないだけ。

## 実装のスライス分け

フェーズは上記の順序で着地。各フェーズは独自のコミットクラスター + specカバレッジを持つ。監査spec（`spec/rigor/ractor_readiness_spec.rb`）がゲート: ターゲットクラスが`skip`からパスする`Ractor.shareable?`アサーション（フェーズ1〜2）に切り替わったとき、またはそのエンドツーエンド動作テストがパスしたとき（フェーズ3〜4）にフェーズが進む。

### フェーズ2bの成果物

次のフェーズは`RbsLoader`を次に分割する:

```ruby
# 凍結、共有可能
class Environment::Reflection
  # 読み取り専用RBSクエリサーフェス
  def class_known?(name) end
  def instance_definition(name) end
  def singleton_definition(name) end
  def class_ordering(lhs, rhs) end
  # ...
end

# Ractorごと、可変
class Environment::CacheLayer
  def initialize(reflection:, cache_store:)
    @reflection = reflection
    @cache_store = cache_store
    @class_known_cache = {}
    @instance_definition_cache = {}
    @singleton_definition_cache = {}
  end

  def class_known?(name)
    @class_known_cache[name.to_s] ||= reflection.class_known?(name)
  end
  # ...
end
```

`Environment#rbs_loader`（今日）はキャッシュレイヤーになる;新しい`Environment#reflection`が共有可能なファサードを運ぶ。既存の公開リードAPI（`class_known?`、`instance_definition`など）は変更されないまま — ディスパッチはキャッシュレイヤーを通り、リフレクションファサードを通じて遅延ルーティングされる。

`Cache::Store`バックのプロデューサー（`RbsConstantTable`、`RbsKnownClassNames`、`RbsInstanceDefinitions`、`RbsSingletonDefinitions`、`RbsClassAncestorTable`、`RbsClassTypeParamNames`）は既存の単一blobレイアウトを保つ。リフレクションファサードはそれらの後ろに座る;それらの上のキャッシュレイヤーはRactorごとのウォームアップ。

### フェーズ3 / 4の成果物

詳細なスケッチは[`docs/design/20260514-ractor-migration.md`](../../design/20260514-ractor-migration/) § フェーズ3 / フェーズ4。ここで繰り返しはスキップ;スケッチはフェーズ2bリファクターが配置され、実際のプラグイン / runner形状制約が見えたら、独自のADR-15修正で批准される。

## ADR-4（型推論エンジン）との境界

ADR-4は`Scope#type_of`と`Scope`値オブジェクトを記述する。Scopeはすでに凍結された`Environment`参照を運ぶ。フェーズ2bリファクターはEnvironmentが何で**ある**かを変える — リフレクションをキャッシュから分割 — が、Scope契約や`Scope#type_of`の動作は変えない。ADR-4の「実装期待」に従い、ScopeのパブリックAPIはこのリファクター全体で安定したまま;`scope.environment.{class_known?, instance_definition, ...}`を読むプラグインは同じ戻り値を見る。

ADR-4はフェーズ2b後に`Environment`が`Reflection` + `CacheLayer`に分割されることを文書化する非規範的な注記を取得する;Scopeとディスパッチャーの契約は変更されない。

## ADR-6（キャッシュ永続化バックエンド）との境界

ADR-6は`Cache::Store`を`flock`-ガードされたアトミック書き込みを持つプロセスローカルファイルシステムキャッシュとして記述する。v0.1.4のMonitor + インプロセスメモ追加（コミット`31e95c8`、`5c30b37`）は、スレッドセーフなインプロセスレイヤリングでそのバックエンドを拡張する。ADR-15は`Cache::Store`をキャッシュされた値のための**クロスRactor共有ポイント**として指定する。

契約追加:

- `Cache::Store`は`Ractor.shareable?`でなければならない（MUST）。現在の実装はそうではない（Monitor + Hash + counter ivarsは共有可能ではない）。フェーズ4の設計が次のいずれかを決定する:
  (a) Storeを直接共有可能にする、または
  （b）薄いRactor共有可能なプロキシでラップする。

ADR-6は、将来のCache::Store作業が誤って共有可能性から設計を遠ざけることがないようにこの制約を記録するオープンクエスチョンエントリーを取得する。

## ADR-2（拡張API）との境界

ADR-2はプラグイン契約を定義する。フェーズ3変更:

- プラグインインスタンスはRactorごとになる。プラグインレジストリ（プラグインクラス + マニフェストのシングルトンテーブル）は凍結されたファクトリリファクター経由でクロスRactorのまま。
- プラグインの実行ごとの状態は、クロスRactor協調が必要なときに`Plugin::FactStore`（すでにMonitor-safe）を介してルーティングすべき（SHOULD）。インスタンスごとのivar状態はRactorごとのまま。

ADR-2は（フェーズ3修正で）、`flow_contribution_for`または`diagnostics_for_file`で可変状態を保持するプラグイン作者がRactorごとの実体化下で安全であるか、Ractor非互換性を文書化しなければならない（MUST）ことを明確にする規範的な注記を取得する。

## オープンクエスチョン

### OQ1 — `Cache::Store`は書き込みスループットのためにRactorでシャード化されるべきか？

現在のStoreはすべての書き込みを1つのMonitorを通じて同期する。重い並行書き込み（多くのRactorがすべてコールドパスにヒット）下で、Monitorは競合ポイントになる。Storeをシャード化する（プロデューサーごとまたはキープレフィックスごとのサブストア、各々が自身のMonitorを持つ）と、それが緩和される。

先送り: 最初に測定。期待されるワークロードは読み取り重視（ほとんどのキャッシュヒット）でMonitor競合は無視できるはず。

### OQ2 — プラグインのRactorごとのインスタンスは集約状態をどう協調するべきか？

`rigor-sorbet`のabsurd-reachable / reveal-type / assert-type-mismatch追跡はファイルにわたって蓄積する。Ractorごとのプラグイン下では、各Ractorのプラグインインスタンスはそのスライスのみを見る。現在の形はASTノードでキーされた`compare_by_identity` Hashesに依存する;ASTノードもRactorごと。

フェーズ3にこれが着地するときの3つの選択肢:

1. **`Plugin::FactStore` publish/consumeに移行**。プラグインは呼び出しごとの観察を公開する;メインRactorはすべてのワーカーが終了した後に集約する。
2. **プラグインごとの結果マージ**。各ワーカーがプラグイン状態を診断と一緒に返す;runnerがプラグインごとにマージする。
3. **並列性からのプラグインオプトアウト**。プラグインが`manifest(serial: true)`を宣言し、runnerがそれらへの呼び出しをシリアライズする。

決定はフェーズ3に先送り。

### OQ3 — RactorプールサイズはCPU数派生または設定可能であるべきか？

両方。`[CPU_count - 1, 4].min`（親 + OS用に1コアを残す）にデフォルト;`RIGOR_RACTOR_WORKERS`と`.rigor.yml`の`parallel: { workers: N }`を尊重する。specスイートですでに動作した`parallel_tests`のノブ形状と同一。

## 拒否された代替案

- **現状（シングルスレッドアナライザー）**: 中規模および大規模プロジェクトに対してwall-clock影響が大きく、監査データ（157ファイル、1.8秒ウォーム）がヘッドルームが**利用可能**であることを示すため拒否 — 私たちはそれを床に残しているだけ。
- **純粋なフォークベースのワーカー**: 完全に拒否されていないが二次として考慮。フォークは起動コストが高く、デーモンパスがなく、フォークごとのEnvironment再構築を強制する。Ractorパスはより多くの下流ケース（LSP、ウォッチモード、将来の`rigor server`）を解決する。
- **gem（例: `concurrent-ruby`）経由の外部ワーカープール**: 拒否。GVL問題を解決せずに依存関係を追加する;MRI 4.x下で`concurrent-ruby`スレッドはCPU作業に対して引き続きGVLバウンド。
- **Ruby M:Nスケジューラの成熟を待つ**: ブロッキングとして拒否。M:Nスケジューラは存在するがMRI下のCPU並列性ストーリーはまだ進化中。Ractorは今日コミットされ安定。

## 推奨される順序

1. ✅ フェーズ1 — 値オブジェクトの共有可能性。
2. ✅ フェーズ2a — `Configuration`ディープフリーズ。
3. ✅ フェーズ2b — `Environment::Reflection`抽出（凍結、まだRactor共有可能ではない;`RBS::Location`制約についてはWD6を参照）。
4. ✅ フェーズ3a — `Plugin::Blueprint` + `Registry#blueprints` + `Registry.materialize`ファクトリ。ライブプラグインインスタンスは意図的に共有可能ではない;ブループリントセットがクロスRactorハンドル。
5. ⏭ フェーズ3b — クロスRactorプラグイン集約状態契約（§ OQ2を参照）。フェーズ4がワーカーごとのプラグイン状態の実際の形を測定するまで先送り。
6. ✅ フェーズ4a — `Analysis::WorkerSession`値キャリア;ループ内にまだRactorなしのワーカーごとの基板。§ フェーズ4設計 + 設計ドキュメント § フェーズ4aを参照。
7. ✅ フェーズ4b — `WorkerSession`周りのRunner Ractorプール（プログラム的な`workers:`キーワード;シーケンシャルが引き続きデフォルト;CLI / `.rigor.yml`オプトインは4cに先送り）。
8. ✅ フェーズ4c — `RIGOR_RACTOR_WORKERS`オプトインフラグ + `.rigor.yml`の`parallel.workers:`エントリー + `Configuration#parallel_workers`アクセサー + CLI `--workers=N`フラグ（優先順位: CLI > env > config > `0`）。デフォルトは引き続きシーケンシャル。プールspecはデフォルトスイートから除外（§「既知の制限」を参照）。
9. ✅ フェーズ4b.x — キャッシュpre-warm経由のワーカー側env構築安定性。`Runner#analyze_files_in_pool`は今、ワーカーをスポーンする前にメインRactorですべてのキャッシュ済みRBSプロデューサーを駆動する（`RbsLoader#prewarm`）ため、ワーカーはディスク上のMarshal blobからすべてのリフレクションクエリを提供し、`RBS::EnvironmentLoader.new`に触れることはない — 非共有のRubyGems / RBSモジュール定数のチェーンはメインRactorのみにとどまる。Rigor自身のディスパッチ定数（`MethodDispatcher::ConstantFolding::CATALOG_BY_CLASS`など）は`Ractor.make_shareable`になった;`Builtins::MethodCatalog`はYAMLを積極的にロードするため、make_shareableの凍結が遅延`@catalog ||= load_catalog`書き込みをトリップしない。`cache_store`なしのプールモードは`pool-degraded` `:warning`診断付きでシーケンシャルに縮退する — `--no-cache`パスはレガシーセマンティクスを保つ。
10. ⏭ フェーズ4c+ — § OQ1に従いワーカーごとの`Cache::Store`共有ファサード;シーケンシャル対プールのwall-clockをベンチマークし、フェーズ4b.xがワーカーenv構築を安定化させたらデフォルトを再検討。
