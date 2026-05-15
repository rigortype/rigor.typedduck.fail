---
title: "Rigorロードマップ"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "8da3408707c98390ab21d13ec8c37ab2a4b7dbf3a1be835d4df43d48c76e8518"
sourceCommit: "61c8eef1a239a7226ba399ca3ffa2208e4763265"
translationStatus: "translated"
sidebar:
  order: 9050
---

将来を見据えたコミットメント: 現在進行中のもの、次に計画されているもの、意図的にスコープ外のもの。

このファイルは**計画材料**であり、リリースログではありません。「何が出荷されたか」の記録については、[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/main/CHANGELOG.md)（アクティブな`0.1.x`サイクル）と[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)（アーカイブされた`0.0.x`）を参照してください。

このファイルがADRまたは仕様と矛盾する場合、ADR / 仕様が拘束力を持ち、このファイルは古くなっています。

## リリース済みマイルストーン（ポインターのみ）

完全なリリースノートは`CHANGELOG.md`にあります;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

| バージョン | リリース日 | テーマ |
| --- | --- | --- |
| v0.0.3 — v0.0.9 | 2026-05-02 → 2026-05-05 | 型語彙、推論エンジン、永続キャッシュ。[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)を参照。 |
| v0.1.0 | 2026-05-07 | 最初のプラグイン契約（6スライス）;7つの動作例。`CHANGELOG.md` § `[0.1.0]`を参照。 |
| v0.1.1 | 2026-05-08 | リテラル文字列のナローイング深化、クロスプラグインAPI、プラグイン作成DX。`CHANGELOG.md` § `[0.1.1]`を参照。 |
| v0.1.2 | 2026-05-09 | プラグイン例の戻り型移行、エンジン深化フォローアップ。`CHANGELOG.md` § `[0.1.2]`を参照。 |
| v0.1.4 | 2026-05-14 | ADR-10 / ADR-11 / ADR-13の延期キュー、ADR-14 `rigor sig-gen`エンドツーエンド、`Type::BoundMethod`キャリア、18の動作プラグイン例。（v0.1.3のコミットメントエンベロープがカット前に追加トラックを吸収し、v0.1.4として出荷された。）`CHANGELOG.md` § `[0.1.4]`を参照。 |

## v0.1.5 — `master`に蓄積中（リリース保留中）

テーマ: **[ADR-15](../adr/15-ractor-concurrency/) Ractor移行をエンドツーエンドで開始、spec-suiteのパフォーマンス向上（6×wall-clock）を確定、v0.1.3 / v0.1.4の延期キューのエコシステム項目をクローズ、14の実世界Rails / Rubyプロジェクトに対してアナライザーを実証 — その結果、本番品質の改善（ビルトインのベンダーgem RBS、ターゲットプロジェクトのBundler認識、複数のエンジン修正）を駆動する、そして[ADR-16](../adr/16-macro-expansion/)マクロ / DSL展開基板をエンドツーエンドで着地させる（WD13フロアでROADMAP O2をクローズ）**。

コミットされたすべてのv0.1.5トラックは純粋に加法的（既存のCLI消費者の動作変更なし）;Ractor作業は各フェーズが独立して取り消し可能な形で段階化されている。

`master`にこれまで確定済み:

### ADR-15 Ractor移行 — フェーズ1〜4c + 4b.xすべて着地

- **フェーズ1**（値オブジェクトの共有可能性監査）。すべての`Rigor::Type::*` / `Rigor::TypeNode::*` / `Cache::Descriptor` / `FactStore` / `FlowContribution`が構築時に`Ractor.shareable?`。[`spec/rigor/ractor_readiness_spec.rb`](../spec/rigor/ractor_readiness_spec.rb)にリグレッションガード。
- **フェーズ2a**（`Rigor::Configuration`ディープフリーズ）。`Configuration.new(...)`は構築時に`Ractor.shareable?`。
- **フェーズ2b**（`Environment::Reflection`抽出）。凍結されたRBSクエリファサード;`Ractor.shareable?`ではない（推移的にRBS::LocationがC拡張状態のため） — フェーズ4のワーカープールは各ワーカーが共有された`Cache::Store`から自身のReflectionを構築することでこれを回避する。
- **フェーズ3a**（`Plugin::Blueprint` + `Registry.materialize`）。凍結された`Ractor.shareable?`ブループリントキャリア + Ractorごとの実体化ファクトリー;プラグインインスタンスは意図的に非共有のまま。
- **フェーズ4a**（`Analysis::WorkerSession`）。`Ractor.shareable?`入力のみを消費し、自身のプラグインレジストリ / 依存ソースインデックス / 環境 / レポーターを内部で構築するワーカーごとの基板。
- **フェーズ4b**（`Runner#analyze_files_in_pool`）。WorkerSession周りの実際のRactorプール配線。3種類のメッセージ（`[:prepare, …]` / `[:file, path, …]` / `[:done, …]`）;パスごとの結果Hashと元順序での再フローを介して診断順序が保たれる。同等性 + プラグインリプレイ + prepare重複除去は[`spec/rigor/analysis/runner_pool_spec.rb`](../spec/rigor/analysis/runner_pool_spec.rb)で証明される。
- **フェーズ4b.x**（ワーカー側env構築の安定性 + モジュール共有可能性）。実世界プロジェクトに対する4つのフォローアップが残りの`Ractor::IsolationError`ソースを修正: `NumericCatalog#@catalog`、`Type::Refined::CANONICAL_NAMES`、`Builtins::RegexRefinement::RULES`、`MethodDispatcher::ShapeDispatch::REFINED_STRING_PROJECTIONS`、加えて`MethodDispatcher::CONSTANT_CONSTRUCTORS`（proc値）。`RbsLoader#prewarm`（新規）がプールスポーン前にメインRactor上ですべてのキャッシュ済みRBSプロデューサーを駆動し、ワーカーがMarshal blobから提供する。
- **フェーズ4c**（CLI / env / config opt-inサーフェス）。`rigor check --workers=N` > `RIGOR_RACTOR_WORKERS` > `.rigor.yml` `parallel.workers:` > `0`。シーケンシャルが引き続き文書化されたデフォルト。

**プール ≡ シーケンシャルが14の実世界プロジェクトで証明**（Redmine、Discourse、Mastodon、GitLab FOSS、Forem、Solidus、Chatwoot、Canvas LMS、OpenProject、Loomio、Publify、Diaspora、Dependabot Core、tDiary Core — 合計31,840ファイルを掃引）。プールのwall-clockがシーケンシャルを上回るクロスオーバーは約1.3〜1.8Kファイル;GitLab FOSS（11.1Kファイル）はpool=8でシーケンシャルの1.64×を示す。

### ADR-16マクロ展開基板 — フロア + 精度プロモーションすべて着地

ROADMAPオープン項目O2（マクロテンプレート / heredoc-Ruby展開）をクローズ。16のコミット（`584ae85`…`53b7db0`）が、プラグイン作者がASTウォーカーではなくマニフェストエントリーを書いてメタプログラミング形のDSLを認識できる4ティアの宣言的基板を配信。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)（Rails AS::Concern + ActiveStorage attached、AASM、Devise、GraphQL-Ruby、factory_bot、Sinatra、Sequel、Redmine、dry-types、dry-schema、dry-structをカバーする11のライブラリサブシステム）。

- **Tier A — ブロック-as-メソッド**。`Plugin::Macro::BlockAsMethod` + 新しい`Rigor::Inference::MacroBlockSelfType`エンジンフックが、`<Class>.<verb> do … end`形（Sinatra正準）に対してブロック本体の`self_type`をナローイングする。動作プラグイン: [`rigor-sinatra`](https://github.com/rigortype/rigor/blob/main/examples/rigor-sinatra/)。
- **Tier B — バンドルされたモジュールレジストリ経由のトレイトインライニング**。`Plugin::Macro::TraitRegistry` + スキャナ拡張が、includeされたモジュールのRBSインスタンスメソッドをメソッドごとに呼び出し元クラスに展開する。スライス6a精度プロモーションが`Nominal[origin_module]`上で`RbsDispatch`経由で再ディスパッチするため、モジュールの著作RBS戻り値が勝つ（Deviseの`valid_password?`は`Dynamic[T]`ではなく`bool`を返す）。動作プラグイン: [`rigor-devise`](https://github.com/rigortype/rigor/blob/main/examples/rigor-devise/)（レジストリが`lib/devise/modules.rb`をミラー）。
- **Tier C — heredocテンプレート展開**。`Plugin::Macro::HeredocTemplate` + 新しい`Rigor::Inference::SyntheticMethod` / `SyntheticMethodIndex` / `SyntheticMethodScanner`基板 + 新しい`try_synthetic_method`ディスパッチャーティア（WD13に従いRBSディスパッチの**下**に座るため、ユーザー著作のRBSが合成を上書きする）。プレパスがファイルごとの推論が開始する前にすべてのプロジェクトソースファイルを2回スキャン（階層収集 + クラス本体マッチ）する。スライス6b精度プロモーションが、マニフェストの`returns:` Stringを`environment.nominal_for_name`経由で素のクラス名に対して解決する。動作プラグイン: [`rigor-dry-struct`](https://github.com/rigortype/rigor/blob/main/examples/rigor-dry-struct/)。
- **Tier D — 外部Rubyファイルインクルージョン**。`Plugin::Macro::ExternalFile`値クラス + マニフェストフックが**契約のみ**として着地;エンジン統合（トップレベルの`self_type`ナローイング + `bound_ivars`事前バインディング）はスライス5aの先送りに従いスライス5bに先送り。プラグイン作者は今日エントリーを宣言できる;基板はまだそれらに作用しない。
- **Concern（`included do`）再ターゲティング**はスキャナで処理される — `included do … end`ブロック内のTier B/C呼び出しがincludeするクラスに対してリプレイされる（1ホップ、定数パス`include M`のみ;`class_methods do`は先送り）。
- **WD13に従うコストバウンドのベストエフォート姿勢**。v0.1.xはフロアを出荷: 合成メソッド名が発行される;クロスファイルディスパッチが解決される;`class_eval`されたheredoc内の識別子がパースチェックされる。精度プロモーションは同じ規律に従う: Tier Bは一般的なケース（RBS内のモジュール）に対して`origin_module`provenance経由でプロモートする;Tier Cは`nominal_for_name`経由で素のクラス名をプロモートする。パラメータ化形式（`Array[String]`、`Hash[K, V]`）とプラグイン提供のユーティリティ型名（`Pick<T, K>`）は、ADR-13の完全な`Plugin::TypeNodeResolver`チェインが合成メソッドティアに配線されるまで`Dynamic[T]`にとどまる（需要に先送り）。

ADR-16ステータスは「accepted — フロア + 精度プロモーション着地（スライス1〜7 + 6a/6b）、スライス5b + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要に先送り」にプロモート。

### 実世界Rails / Rubyサーベイ + 本番品質の改善

3ラウンドのプロジェクト掃引（[`docs/notes/20260515-real-world-rails-survey.md`](../notes/20260515-real-world-rails-survey/)に記録）が8つのエンジン / パッケージング改善を駆動:

- **O1**（`examples/rigor-activesupport-core-ext/`） — トップ約50のActiveSupport `core_ext`セレクタのオプトインRBSバンドル。14のサーベイプロジェクト全体のv1 + v2の合計影響: 総診断12,502 → 3,071（−75%）、`call.undefined-method` 10,589 → 1,426（−87%）。
- **O5**（`ac14c45`） — `Inference::Acceptance`での`Hash[K, V] <: Enumerable[[K, V]]`パラメータ化された祖先射影。
- **O6**（`4698437`） — `MethodDispatcher::CONSTANT_CONSTRUCTORS`のディープシェア。修正後GitLab FOSSでプール ≡ シーケンシャル（修正前は2,983対2,982）。
- **O7**（`3c4a7ff`） — `RbsLoader#env`が失敗をメモ化。競合するsigを1つ追加すると（例: gem同梱の`prism/sig/prism.rbs`の`Prism::VERSION`がrigorのバンドルstdlib RBSと衝突）、修正前は1つのコントローラーに対してファイルごとのenv再構築（390×、約35秒のwall）が発生していた。修正後: 5つのコントローラーに対して0.15秒（約550×の高速化）、違反ファイルを名指しする1つのユーザー向け警告のみ。
- **ベンダーgem RBS**（`f9b94d2`） — `data/vendored_gem_sigs/<gem>/`が6つのネイティブ拡張gemのRBSをデフォルトで出荷: `pg` / `mysql2` / `nokogiri` / `bcrypt` / `redis` / `idn-ruby`。4つは`ruby/gem_rbs_collection`から（`LICENSE.upstream`付きMITベンダー）;2つ（`pg`、`idn-ruby`）は手書きの最小スタブ（MPL-2.0）。すぐに使えるRBSクラス: 1,134 → 1,273（+139）。Mastodonの`bundle install`ブロッカー（libidn）は静的解析では論点にならない。
- **O4 MVP**（`95b923f`） — `bundler.bundle_path` / `bundler.auto_detect`設定キー。新しい`BundleSigDiscovery`モジュールがターゲットプロジェクトのbundlerインストールルートを歩き、gem同梱の`sig/`ディレクトリを自動的に`signature_paths:`にフィードする。自動検出は`.bundle/config`の`BUNDLE_PATH:`を読み、`vendor/bundle/`にフォールバックする。`SKIPPED_GEMS_BY_DEFAULT`セットは、すでに`DEFAULT_LIBRARIES` + `data/vendored_gem_sigs/`でカバーされているgemを除外するため、O7が表面化したprism-class競合が再発しない。Mastodonで検証: 7つの非スキップgem sigからRBSクラス1,178 → 2,136（+958）。レイヤー3（`Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング）はキューに残る。
- **エンジンナローイング** — 条件式内の代入（`if cond && (var = expr)`）がバインドされたローカルを今ナローイングする;Redmineだけで`call.possible-nil-receiver` 69 → 23（−46 FP）。
- **rigor-activesupport-core-ext v2（`compact_blank` / `exclude?` / `index_with` / `Hash.from_xml` / DateTime calculations）** — ラウンド2（Forem / Solidus / Chatwoot / Canvas LMS / OpenProject）サーベイ拡張から。

### 着地したその他のv0.1.5作業

- **spec-suiteパフォーマンス** — `Cache::Store`スレッドセーフ + インプロセスメモ + `parallel_tests`ランナー;12コア開発機でスイートwall-clock 162秒 → 27秒（約6×）。
- **`rigor check --stats`（デフォルトON）** — stderrへの実行終了サマリー（チェックターゲット / 型ユニバース / gemソースウォーク / プロセス）。
- **`rigor-activerecord`拡張** — アソシエーション / enum / スコープ / バリデーション / コールバックすべて`ModelIndex::Entry`に記録;`Model.where(enum_col: :unknown)`が`unknown-enum-value`を表面化;`belongs_to` / `has_one`が`flow_contribution_for`を介して`Nominal[Target] | nil`を貢献。
- **`Method#curry`の精度** — `Type::BoundMethod`を介して（オープンエンジニアリング項目#5、オプションA）。
- **`rigor-activestorage`（Tier 3E）** — `has_one_attached :avatar` / `has_many_attached :photos`マクロ認識 + `flow_contribution_for`を介した戻り型ナローイング。`examples/`下20番目の動作プラグイン。
- **3つの新しいADR-16基板消費者プラグイン**。`rigor-sinatra`（Tier A — ブロック-as-メソッド）、`rigor-dry-struct`（Tier C — heredocテンプレート）、`rigor-devise`（Tier B — トレイトインライニングレジストリ）。各々が純粋に宣言的（1つのマニフェストエントリー、ウォーカーなし） — 基板をエンドツーエンドで検証する。例の数: 21 → 24。

### プール / シーケンシャル同等性のクロスプロジェクトサマリー

| プロジェクト | ファイル | Seqウォーム | Poolウォーム | 診断（ベースライン → O1 v2付き → ベンダーRBS付き） |
| --- | ---: | ---: | ---: | --- |
| Redmine | 347 | 2.82s | 3.70s（`w=4`） | 389 → 157 → 157 |
| Mastodon | 1,302 | 3.31s | 3.98s（`w=4`） | 521 → 124 → 124 |
| Forem | 1,250 | 4.31s | 4.60s（`w=4`） | 691 → 146 → 149 |
| Discourse | 1,804 | 7.46s | **5.82s** | 1,439 → 423 → 429 |
| Solidus | 1,914 | 7.36s | **4.91s** | 528 → 42 → 42 |
| Canvas LMS | 3,248 | 17.32s | **11.16s** | 3,296 → 1,496 → 1,506 |
| OpenProject | 6,817 | 18.84s | **10.24s** | 2,356 → 175 → 176 |
| GitLab FOSS | 11,130 | 25.27s | **15.43s**（`w=8`） | 2,982 → 489 → 491 |

（残りの6つの小さなプロジェクト — Loomio、Publify、Diaspora、Chatwoot、Dependabot Core、tDiary Core — についてはサーベイノートを参照。）

### 統合されたオープン項目（サーベイ後）

| ID | ステータス | 項目 |
| --- | --- | --- |
| O1 | 着地（MVP、v2） | `examples/rigor-activesupport-core-ext/`オプトインRBSバンドル。 |
| O2 | 基板フロア + 精度プロモーション着地（Tier A/B/Cエンジン + Tier D契約 + Concern再ターゲティング + スライス6a/6b精度）;スライス5b（Tier Dエンジン）+ ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線はキュー | マクロテンプレート / heredoc-Ruby展開。[ADR-16](../adr/16-macro-expansion/)からの基板がスライス1〜5a + スライス7ドキュメント（コミット584ae85…56706a5） + スライス6a-TierB / スライス6b-TierC精度プロモーション（コミットd174fff / d7b1943）を通じて出荷。3つの動作消費者 — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B） — が基板をエンドツーエンドで行使。スライス6の精度プロモーション: Tier B発行がモジュールの著作RBS戻り値を取得;Tier Cの素のクラス名戻り値が`environment.nominal_for_name`経由で解決される。Tier Dエンジン統合とパラメータ化 / ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。 |
| O3 | 非問題 | 早期exitナローイング（`next if x.nil?` / `return if x.nil?`）はすでに動作;サーベイ残余はほとんどObject#blank?/present?/tryでO1がカバー。 |
| O4 | レイヤー1+2着地 | Bundler認識。レイヤー3（`Gemfile.lock`パース + `gem_rbs_collection`マッチング）はキュー。 |
| O5 | 着地（`ac14c45`） | `Hash[K, V] <: Enumerable[[K, V]]`射影。 |
| O6 | 着地（`4698437`） | プール / seq精度の発散（CONSTANT_CONSTRUCTORS）。 |
| O7 | 着地（`3c4a7ff`） | RBS env構築失敗メモ（重複宣言時のファイルごとの低速化）。 |

### v0.1.5のスコープ外

- **O2フォローアップ** — スライス5b（Tier Dエンジン統合: 宣言された`self`下の外部ファイルインクルージョン）と合成メソッドティアのためのADR-13 `Plugin::TypeNodeResolver`チェインの完全な配線（ユーティリティ型形の基板戻り値、例: `Array[String]` / `Pick<T, K>`をアンロックする）は需要駆動のまま。基板フロア + Tier A/B/Cエンジン + スライス6精度プロモーションはv0.1.xで着地。
- **O4レイヤー3**（Gemfile.lock + gem_rbs_collectionバージョンマッチング） — v0.1.6+にキュー（コミット済みマイルストーンなし）。
- **`rigor-graphql`**（Tier 3プラグイン） — 具体的なユーザー需要があれば作成。
- **dry-rbエコシステムプラグイン** — ADR-12パッケージング決定は保留中。

## 将来のサイクル（特定リリースには未コミット）

v0.1.x作業を通じて浮上した項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。

### 型言語 / エンジン
- **O2 — マクロテンプレート + heredoc-Ruby展開**。基板フロア + 精度プロモーションは[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + 7（コミット584ae85…56706a5）+ スライス6a-TierB / 6b-TierC精度（コミットd174fff / d7b1943）を通じて配信: Tier A（ブロック-as-メソッド）+ Tier B（トレイトインライニングレジストリ）+ Tier C（heredocテンプレート）エンジン統合が新しい`SyntheticMethodIndex`とプレパススキャナを通じて;Tier D（外部ファイルインクルージョン）はスライス5aの先送りに従いエンジン統合を先送りした契約のみを出荷;Concern（`included do`）再ターゲティングはスキャナで処理;**スライス6**精度プロモーションはTier B発行を`origin_module:`provenance経由で`RbsDispatch.try_dispatch`にルーティングする（Deviseの`valid_password?`は今`Dynamic[T]`ではなく`bool`を返す）し、Tier Cの素のクラス名`returns:`文字列を`environment.nominal_for_name`経由で解決する。3つの動作消費者が着地: `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。残り項目: **スライス5b**（Tier Dエンジン — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド;キュー、需要駆動）、**ADR-13リゾルバチェインの完全な配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名`Pick<T, K>`をリゾルバチェイン経由でルーティング;キュー、需要駆動）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **DSLシグネチャでの軽量HKT（高階型）**。`docs/type-specification/rigor-extensions.md`の条件型 / インデックスアクセス行に従い、`untyped`境界を型レベル`eval`に置き換える。最初のリファレンスサイトはrigor-lisp-evalデモ。探索的、コミット済みマイルストーンなし。
- **`rigor:v1:conforms-to`ディレクティブ**。元々v0.1.1の「スコープ外」にキューされていた;まだオープン。メソッドパラメーターが名前付き構造インターフェースを満たす任意の値を受け付けられるようにする。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価**。`.rigor.yml`内の設定駆動メカニズムで、プロジェクトの残りを解析する前に明示的なリファインメント / monkey-patchを宣言してアナライザーが事前評価する（Ruby自身が起動時に行うのと同じ方法）。Redmineの実世界テスト中に、O1のRBSバンドル（着地済み）と並んで「Rails `call.undefined-method`のロングテールを閉じる」ワークストリームの欠けている半分として表面化。実装前にADRが必要 — オープン契約: 事前評価がいつ実行されるか、解析をクラッシュさせられるか、スコープルール、ADR-16 Tier Dファイルインクルージョンとの相互作用。コミット済みマイルストーンなし。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。

### プラグイン / エコシステム
- **`rigor-graphql`** — 最後の残りのTier 3プラグイン。GraphQLスキーマDSLパースは自明ではない;具体的なユーザー需要があれば作成。
- **dry-rbアダプタープラグイン** — パッケージング戦略（単一gem対ファミリー対中粒度バンドル）は個々のプラグインを作成する前に明示的なADR-12決定が必要。[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)下のサーベイ。
- **ADR-10 — gemソースからの呼び出しごとの戻り型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り型を推論する（`mode: :full`が`Dynamic[Top]`より豊富に貢献できる）のは、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **`rigor-sorbet`のコールサイトごとのsigilゲーティング以降のフォローアップ** — v0.1.4で着地。未解決のキュー項目なし。

### パフォーマンス / スケーラビリティ
- **O4レイヤー3 — `Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング**。v0.1.5の`BundleSigDiscovery` MVPの上に座る。MVPの自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）がバージョン管理された解決テーブルになる;rigorは`Bundler::LockfileParser`出力を消費 + `ruby/gem_rbs_collection`に対して最適マッチングバージョンをクエリする。O7の失敗メモによりアンブロック（競合は今ハングではなく警告される）。
- **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50 %、`Marshal.load`約22 %、GC約17 %を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリー;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。
- **インメモリの`Analysis::Runner.run_source`エントリーポイント（テスト専用）**。`RunnerHelpers#analyze`テストヘルパーは呼び出しごとにtmpdirを実体化する。呼び出しごとに約25-50ms × 数百のrunner-spec呼び出しでは、インメモリエントリーポイントがスイートからシーケンシャル約5% / 並列約3%を削れる可能性。単独で行う価値はないが、テストスイート拡張が続けば自然な補完。

### sig-gen（ADR-14）
- **`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は各候補の`class_name`を独立して解決する — フラットな兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。

### ADRにキューされたオープン研究質問
- **ADR-15 § OQ1** — Ractorごとの`Cache::Store`共有ファサード。今日各ワーカーはキャッシュから自身のRBS envを構築する;OQ1は共有可能なファサードを介してワーカー間でインメモリenvを共有することを探求する。プールのwall-clockがシーケンシャルを上回るクロスオーバー（現在約1.3〜1.8 Kファイル）を下げるだろう。
- **ADR-13 §「未解決の問題」** — 5つのコア関数（`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`）を超えてシェイプ射影サーフェスを拡張する。新しいマップ型語彙を追加するときに権威的。

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（v0.1.4までリリース / v0.1.5に向けて`master`に蓄積中）:**

- **Tier 1**: [`rigor-rails-routes`](../examples/rigor-rails-routes/)（`:helper_table`を公開）、[`rigor-rails-i18n`](../examples/rigor-rails-i18n/)、[`rigor-actionmailer`](../examples/rigor-actionmailer/)、[`rigor-activejob`](../examples/rigor-activejob/)。
- **Tier 2**: [`rigor-activerecord`](../examples/rigor-activerecord/)（`:model_index`を公開;アソシエーション / enum / スコープ / バリデーション / コールバックすべてv0.1.5で着地）;[`rigor-actionpack`](../examples/rigor-actionpack/)（4フェーズ: ルート / フィルター / レンダー / ストロングパラメーター）;[`rigor-factorybot`](../examples/rigor-factorybot/)（フェーズ1 (a) + （c））。
- **Tier 3**: [`rigor-pundit`](../examples/rigor-pundit/)、[`rigor-sidekiq`](../examples/rigor-sidekiq/)、[`rigor-rspec`](../examples/rigor-rspec/)、[`rigor-actioncable`](../examples/rigor-actioncable/)、[`rigor-activestorage`](../examples/rigor-activestorage/)（v0.1.5で着地）。
- **オプトインの非プラグインバンドル**: [`rigor-activesupport-core-ext`](../examples/rigor-activesupport-core-ext/)（v0.1.5;トップ約50 AS core_extセレクタ向けのオプトインRBSバンドル）。[`rigor-typescript-utility-types`](../examples/rigor-typescript-utility-types/)（ADR-13スライス6）。
- **ADR-16基板消費者プラグイン（v0.1.5）**: [`rigor-sinatra`](../examples/rigor-sinatra/)（Tier A — ブロック-as-メソッド）、[`rigor-dry-struct`](../examples/rigor-dry-struct/)（Tier C — heredocテンプレート）、[`rigor-devise`](../examples/rigor-devise/)（Tier B — トレイトインライニングレジストリ）。マクロ展開基板をエンドツーエンドで行使する3つの純粋に宣言的なプラグイン。

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`。
- `rigor-dry-types`コンパニオン（Tier-Cを`const_set`定数発行として）。[ADR-16](../adr/16-macro-expansion/)サーベイで`rigor-dry-struct`の自然なフォローアップとして議論されている。現在のTier C基板はメソッドを発行するが定数は発行しない — 定数発行プリミティブを追加するのは別個のスライス。需要にゲート。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。最終的な`rigor-rails`メタgemはTier 1+2プラグインをgem依存関係として宣言し、単一のGemfile行でユーザーがスタック全体にオプトインできるようにします。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5（`master`、リリース保留中）で着地。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。
