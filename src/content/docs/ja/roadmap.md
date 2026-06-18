---
title: "Rigor Roadmap"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "fb7465b94ec27fd92eb256b8ee2073d1eadc7b9f011b1567aa475c3506805b15"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
sourceDate: "2026-06-13T19:23:25+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

将来を見据えたコミットメント: 何が積極的に進行中で、次に何が計画されているか、何が意図的にスコープ外か。

このファイルは**計画資料**であり、リリースログではありません。「何が出荷されたか」の記録については、[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)（アクティブな`0.1.x`サイクル）と[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)（アーカイブ済み`0.0.x`）を参照してください。

このファイルがADRまたは仕様と矛盾する場合、ADR / 仕様が拘束力を持ち、このファイルは古くなっています。

## リリース済みマイルストーン（ポインタのみ）

完全なリリースノートは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

| バージョン | リリース日 | テーマ |
| --- | --- | --- |
| v0.0.3 — v0.0.9 | 2026-05-02 → 2026-05-05 | 型語彙、推論エンジン、永続キャッシュ。[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)を参照。 |
| v0.1.0 | 2026-05-07 | 最初のプラグイン契約（contract）（6スライス（slice））;7つの動作例。`CHANGELOG.md` § `[0.1.0]`を参照。 |
| v0.1.1 | 2026-05-08 | リテラル文字列ナローイング（narrowing）の深化、クロスプラグインAPI、プラグイン作成DX。`CHANGELOG.md` § `[0.1.1]`を参照。 |
| v0.1.2 | 2026-05-09 | プラグイン例の戻り値型移行、エンジン深化フォローアップ。`CHANGELOG.md` § `[0.1.2]`を参照。 |
| v0.1.4 | 2026-05-14 | ADR-10 / ADR-11 / ADR-13の延期キュー、ADR-14 `rigor sig-gen`エンドツーエンド、`Type::BoundMethod`キャリア（carrier）、18の動作プラグイン例。（v0.1.3のコミットメントエンベロープがカット前に追加のトラックを吸収し、v0.1.4として出荷。）`CHANGELOG.md` § `[0.1.4]`を参照。 |
| v0.1.5 | 2026-05-16 | ADR-15 Ractor移行エンドツーエンド（フェーズ1〜4c + 4b.x）、実世界Railsサーベイ（14プロジェクト、31,840ファイル）が本番改善を駆動（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識sigディスカバリー）、ADR-16マクロ / DSL展開基板（WD13フロアでO2をクローズ）、O4レイヤー3スライス1+2+3（`Gemfile.lock`パース + `rbs_collection.lock.yaml`認識 + 欠落gemの`:info`診断）、DEFAULT_LIBRARIESのstdlibカバレッジ拡張（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決、24の動作プラグイン例。`CHANGELOG.md` § `[0.1.5]`を参照。 |
| v0.1.6 | 2026-05-19 | ADR-12 / ADR-17 / ADR-18フロア + 動作消費者;エディタモードv1 + 言語サーバーv1/v2;ADR-20軽量HKT;エコシステムプラグイン + `rigor-rails`メタgemスキャフォールド。`CHANGELOG.md` § `[0.1.6]`を参照。 |
| v0.1.7 | 2026-05-20 | ADR-22ベースライン（baseline）メカニズム（スライス1+2） + プロジェクトオンボーディング基盤;サーベイ駆動のプラグイン / エンジン偽陽性修正;Pillar 2 <del>「あなたのspecが型である」</del>スライス1+2+3<ins>（このピラーの枠組みは2026-06-12に[ADR-59](../adr/59-spec-assertions-are-not-signatures/)により退役 —— アサーションが実装シグネチャに食わされることは決してない。出荷済みのスライス自体 —— マッチャーナローイング、`let`/`subject`束縛、`:factory_index` —— は引き続き正確かつ有効）</ins>。`CHANGELOG.md` § `[0.1.7]`を参照。 |
| v0.1.8 | 2026-05-21 | Mastodonサーベイ偽陽性削減: ADR-15フォークベースのワーカープール（アクティブな`workers > 0`バックエンド）、ADR-23 `rigor triage`診断トリアージサブコマンド、ADR-24暗黙的selfメソッド呼び出し解決。`CHANGELOG.md` § `[0.1.8]`を参照。 |
| v0.1.9 | 2026-05-23 | 指定の「最後のプレビューカット」: 外部ユーザーSKILLトリオ（`rigor-project-init`、`rigor-baseline-reduce`、[ADR-22 WD8](../adr/22-baseline-and-project-onboarding/)に基づく外部著者`rigor-plugin-author`バリアント）;ADR-22ベースラインスライス5（`rigor baseline regenerate` + `--baseline-strict` CIゲート）;v0.1.7 / v0.1.8サーベイデータによる実証的デフォルトの引き締め。`CHANGELOG.md` § `[0.1.9]`を参照。 |
| v0.1.10 | 2026-05-27 | `rigor mcp --transport stdio`（ADR-33、7つの読み取り専用ツール）;`rigor sig-gen --params=observed` attr_reader推論;`rigor coverage`精度ゲート;`rigor check --treat-all-as-inline-rbs`;`rigor-rbs-inline`プラグイン（ADR-32）;ブラウザプレイグラウンド（ADR-29スライス1〜4）;`rigor annotate`戻り値型アノテーション;ADR-28パススコープのプロトコル契約 + `rigor-hanami`;定数畳み込み（Date/DateTime/Time、Math、String/Integer/Float中優先度、Hashシェイプ（shape）ハンドラ）;`return if @ivar.nil?` ivarガードナローイング修正。`CHANGELOG.md` § `[0.1.10]`を参照。 |
| v0.1.11 | 2026-05-27 | プラグインを`rigortype` gemにバンドル;ポータブルベースラインパス;`rigor-rails-routes`でkaigionrails conference-app + Mastodonトライアルに基づく5つの偽陽性ソースを解消（`new_` / `edit_`プレフィックス順序、匿名`get`ルート、`scope as:`プレフィックス + arity、`draw(:name)`部分的読み込み、`concern`ボディnoop、末尾オプションハッシュ +1 arityルール）;`rigor-rails-i18n`コントローラー内のレイジー翻訳キー;Railsクイックスタートマニュアル。`CHANGELOG.md` § `[0.1.11]`を参照。 |
| v0.1.12 | 2026-05-28 | Mastodon / Redmine / GitLab FOSSに対するOSSリアリズムサイクル: Mastodon`app + lib`エラー**789 → 6（−99.2%）**、Redmine**163 → 79（−51%）**、GitLab FOSS `app/{controllers,mailers,workers,services}`**〜670 → 〜140**。6つの`flow.always-truthy / always-falsey` FPパターンをクローズ（書き込み前読み取りnil、介在するメソッド呼び出し、retryエッジ、falsey-rvalue防御的初期化、極性認識ガード、ミューテーターの幅広げ）。新しいナローイングプリミティブ（`receiver[key] \|\|= default`、単一ホップメソッドチェーン`is_a?`）。`Class.new(Parent) { \|c\| ... }`と`Hash#each { \|k, v\| ... }`オートスプラット型付け。プラグインの包括的拡張: `rigor-rails-routes`がdevise_for / use_doorkeeper / mount / concern / with_options / member-collection-shorthand等を認識;`rigor-actionpack`のネストモジュール修飾付きフィルタ & レンダー;`rigor-activerecord`のマイグレーション除外 / バーチャルテーブルモデル / Postgres配列カラム / スコープボディ解決;`rigor-actionmailer`のinclude-of-concerns;`rigor-rails-i18n`のRails同梱キープレフィックス。新しい`rigor plugins`サブコマンド。`CHANGELOG.md` § `[0.1.12]`を参照。 |
| v0.1.13 | 2026-05-29 | AI支援のオンボーディング + 単一ファイルスクリプト解析: 新しい`rigor skill`サブコマンド（`mise use gem:rigortype`インストールから発見できるバンドル済みAgent Skills）;`call.unresolved-toplevel`診断（[ADR-34](../adr/34-toplevel-unresolved-self-call-default/)） + `pre_eval:`プロジェクトモンキーパッチ事前評価（[ADR-17](../adr/17-monkey-patch-pre-evaluation/)）。`CHANGELOG.md` § `[0.1.13]`を参照。 |
| v0.1.14 | 2026-05-29 | AIエージェント駆動のセットアップのための機械可読インストールガイド（`docs/install.md`、[ADR-27](../adr/27-tool-distribution-model/)）;`rbs collection install`後に環境を黙って壊していた`RBS::DuplicatedDeclarationError`を修正。`CHANGELOG.md` § `[0.1.14]`を参照。 |
| v0.1.15 | 2026-05-29 | リスコフのオーバーライド互換性診断ファミリー（`def.override-*`、[ADR-35](../adr/35-override-signature-compatibility/)）;`rigor plugin`ソースブラウジングコマンド;実際には未インストールのプロジェクトモンキーパッチや生成されたDSLである`undefined-method`診断に対する、より鋭い報告 + `rigor triage`認識器 + オンボーディングスキルのルーティング。`CHANGELOG.md` § `[0.1.15]`を参照。 |
| v0.1.17 | 2026-06-06 | 内部構造レビュー + パフォーマンスチューニング。インクリメンタル解析（`rigor check --incremental`、ADR-46） + 未変更プロジェクトの高速パス（ADR-45） + 大規模なアロケーション削減（ADR-44）;Elixir v1.20に触発されたナローイング（`Array`非空、`Hash`キー存在） + `flow.unreachable-clause`（ADR-47）;`rigor:v1:conforms-to`ディレクティブ;`call.self-undefined-method`ルール（`:off`で出荷、ADR-24スライス4）;`Data.define`値の畳み込み（ADR-48）。さらに出荷（プロセス / CI / ドキュメント、ユーザー向けノートには含まれない）: v0.2.0への道のためのリリースエンジニアリング機構 —— ADR-49（ADR著作ルーブリック + `rigor-adr-author`スキル + コーパス監査）、ADR-50（リリースエンジニアリング + 安定性戦略）、`release/x.y.z`ブランチ + `release-gate.yml` + `make bench-perf`パフォーマンスゲート。`CHANGELOG.md` § `[0.1.17]`を参照。 |
| v0.1.18 | 2026-06-11 | CI環境サポート（ADR-51）: 6つの`rigor check --format` CIネイティブレンダリング（SARIF、GitHub Actions、GitLab Code Quality、Checkstyle、JUnit、TeamCity） + ランタイムCI自動検出（WD7） + コピーペースト用CIセットアップテンプレート + バンドルされた`rigor-ci-setup`スキル。`CHANGELOG.md` § `[0.1.18]`を参照。 |
| v0.1.19 | 2026-06-13 | 手続き的Rubyのための精度と信頼のサイクル —— かつ**v0.2.0の実質的なリリース候補**（最後の`0.1.x`プレビューカット）。メソッド呼び出しの結果がユーザー定義のヘルパーを流れるようになり（ADR-57）、再帰戻り値（ADR-55）とブロック/ループのキャプチャされたミューテーション（ADR-56）の精度がそれを裏打ちする;データ構造 / パース / ネットワークコードに対する大規模な実世界の偽陽性バッチ（ADR-58 + CRuby-stdlibと16リポジトリの現実的ユースケーススイープ）;新しい推論が本来課すであろう`lib`全体の超線形なスローダウンを取り除く実行スコープの戻り値メモ;1.0前のプラグイン契約（contract）の統合（ADR-60、BC破壊を伴う）;エージェントフレンドリーな構造化診断フィールド（ADR-61）;ADR-50 WD1の互換性サーフェスドキュメント + WD2のブリーディングエッジオプトイン基盤;そしてADR-54のキャッシュスリム化（プロジェクトごと約33.7 MB → 約2 MB）。`CHANGELOG.md` § `[0.1.19]`を参照。 |
| v0.2.0 | 2026-06-17 | **最初の公式発表（一般 / 評価）リリース**（[ADR-50](../adr/50-release-engineering-and-stability-strategy/)）: 列挙された互換性サーフェス（[`docs/compatibility.md`](../compatibility/)）をv1.0.0フリーズへ向けたマイナー非破壊の試行として公開する。検出の**「ティース」** + 保護カバレッジ —— `call.undefined-method` / `call.argument-type-mismatch`が今やユニオン / リファインメント / 多重オーバーロードのレシーバーで発火する（ADR-62のミューテーションハーネス、ADR-63の`coverage --protection`）;より広い定数fold;定義済み定数のリファインメント;`Struct.new`値fold（ADR-48）;`evidence_tier` + `documentation_url`の診断メタデータ（ADR-65）。`CHANGELOG.md` § `[0.2.0]`を参照。 |
| v0.1.16 | 2026-06-03 | プラグインアーキテクチャの全面的見直しと内部メカニズムの再ドキュメント化。ADR-37/38/39/40が完全に着地: バンドルの診断発行プラグイン14個すべてを`node_rule`（エンジン所有ウォーク、PHPStanスタイル）へ移行;`dynamic_return` / `type_specifier`のスライス（slice）2;`rigor plugins --capabilities` AI可読カタログ（スライス3）;`additional_initializers:`（ADR-38のdef形式）;`config_schema`の宣言デフォルト（ADR-40、13プラグインを移行）;`Source::Literals`グリッド完成 + 10プラグインを移行;実際の`ActiveSupport::Inflector`上の`Plugin::Inflector` + 選択可能な分離戦略（デフォルトは`process`、`Plugin::Isolation`）。ADR-43のRBS完全な祖先解決（`Plugin::Base`許可リスト） + `verify`とCIでの`make check-plugins`ゲート。プラグイン契約（contract）の構造的ガード: 適合スペック、全プラグインロードスペック、デモ実行スペック、外部プラグインフィクスチャ（v0.2.0ゲート1の実行可能なエビデンス）。`Plugin::Base` + `Manifest`のRBSサーフェス（surface）完成。RBSロバストネス: 不正・陳腐化したプロジェクトの`signature_paths:` sig向けの合成名前空間 + スタブ型。`rigor-activerecord`の欠落スキーマメモ化修正（Redmineメモリ−86%、ウォール時間−51%）。推論バジェットサーベイ + `RIGOR_BUDGET_TRACE`計装。`CHANGELOG.md` § `[0.1.16]`を参照。 |

## リリース戦略 — v1.0.0への道

`0.1.x`ラインは**プレビュー**ラインだった。**v0.2.0（2026-06-17）が`0.2.x`評価ラインを開いた** —— 最初の公式発表バージョンであり、実プロダクトでの試行デプロイと外部フィードバックの募集を意図している。これは依然として正式 / GAリリースではない;道は今や**v1.0.0**、ハードな契約フリーズを指している。

| ライン | 役割 |
| --- | --- |
| `0.1.x` | **プレビュー（クローズ済み）**。v0.1.9は当初「最後のプレビューカット」に指定されていたが、Mastodon / Redmine / GitLab FOSSに対する試行作業が、偽陽性削減・オンボーディング・機能・アーキテクチャ・パフォーマンスの各サイクルとともにこれをv0.1.19まで延長した。v0.1.19（2026-06-13）が最後のプレビューカット / 実質的なRCだった。 |
| `v0.2.0` | **最初の評価リリース（2026-06-17リリース済み）**。実プロダクトでの試行デプロイを意図した最初のバージョンとして公式発表;評価期間を開く。`CHANGELOG.md` § `[0.2.0]`を参照。 |
| `0.2.x` | **評価ライン（現在）**。まだ正式バージョンではない;目標は、計画されたすべての機能を —— **Ractor並行性トラックを除いて** —— 高い完成度 / プロダクション品質へ持っていき、外部フィードバックを集めることだ。 |
| `v1.0.0` | **ハードな契約フリーズ（目標）**。列挙されたパブリックサーフェス（[`docs/compatibility.md`](../compatibility/)）が拘束力を持つようになる;適合するユーザーの設定 / プラグイン / 抑制を無効化する変更は、ここからメジャーバージョンでのみ行われる。 |

### v0.2.0への道が決着させたもの（今や完了）

v0.2.0のゲート条件 —— すべて**達成済み**:

- **外部プラグイン契約の安定化 + ドキュメント化**。実行可能なエビデンス（外部プラグインフィクスチャ + 適合 / 全プラグインロード / デモ実行スペック）はv0.1.16で着地;ドキュメント化された安定性コミットメントは[`docs/compatibility.md`](../compatibility/)（[ADR-50](../adr/50-release-engineering-and-stability-strategy/) WD1のサーフェスドキュメント）としてv0.1.19で出荷された —— v0.2.0で**試行**として拘束し、v1.0.0でフリーズする。
- **配布モデルの決着** —— 単一のバンドルされた`rigortype` gem（[ADR-31](../adr/31-contribution-and-supply-chain-policy/)、コミット`9769f5fa`）として。サブツリー分割 / プラグインごと公開のゲートは*置き換えられ*、外部のサードパーティ`rigor-*`パス（作者自身のリポジトリ、`gem "rigortype"`に依存）のみが残った。
- **セルフサービスのオンボーディング** —— SKILLトリオ + `docs/install.md`経由（v0.1.9 / v0.1.13 / v0.1.14）。
- **リリースエンジニアリング機構**（[ADR-50](../adr/50-release-engineering-and-stability-strategy/)、PHPStanをモデルにしたもの）: v0.2.0はリリースエンジニアリングの*試行*（機構 + リハーサルとしてのマイナー非破壊の誓約）、v1.0.0が*ハードフリーズ*だ。`release/x.y.z`ブランチ + `release-gate.yml` + `make bench-perf`はv0.1.17で出荷;パフォーマンスベースライン + Mastodon OSSスイープのしきい値は較正済みでゲートは必須（両方とも**v0.2.0カットで再較正された** —— `bench/baseline.json` + `data/oss-sweep/mastodon-thresholds.json`;`docs/CURRENT_WORK.md`を参照）。WD2のブリーディングエッジオプトイン基盤は配線済み（オーバーレイは空;`bleeding_edge:`設定 + `rigor show-bleedingedge` + `rigor check --bleeding-edge[=ids]`）。

**リリース済みバージョンの詳細は`CHANGELOG.md`にある**（上記のマイルストーン表が各`§`を指す）: v0.1.18（CI環境サポート、[ADR-51](../adr/51-ci-diagnostic-output-formats/) —— 6つのCIネイティブな`--format`レンダリング + ランタイムCI自動検出）、v0.1.19（精度と信頼 + freeze前のプラグイン契約統合[ADR-60]）、v0.2.0（検出のティース[ADR-62] + 保護カバレッジ[ADR-63] + 互換性サーフェスの試行[ADR-50]）。

**ADR-50の残り（v0.2.0以降）:**サポートラインモデル（WD5 —— 最新 + 1つ前のマイナー、→ post-1.0でPHPStanの`1.x`デフォルトブランチ）、`rigor upgrade`マイグレーションコマンド（WD7、具体的なBCが対象を与えるまで先送り）、そして次のメジャー境界の規律がキューに入ったときの最初のbleeding-edge `FEATURES`エントリー（オーバーレイは今日時点で空）。

### v0.2.x — 高完成度の評価ライン

`0.2.x`シリーズ全体を通じて、目標は計画された機能セットを高い完成度 / プロダクション品質へ持っていくことだ。下記の §「Future cycles」の需要駆動バックログは、この計画のもとでは、オープンエンドなキューではなく**v0.2.xの完成目標**である —— そこにあるすべての項目が`0.2.x`のスコープ内だ、**Ractor並行性トラックを除いて**。

**Ractorは意図的に除外される**。ADR-15のRactorワーカープールはRuby 4.0.xで使用不能と判明した（Ruby Bug #22075に加え、決定論的な`Ractor::IsolationError`）;v0.1.8のforkベースのプールがアクティブなバックエンドだ。Ractorプールは`RIGOR_POOL_BACKEND=ractor`とADR-15 § OQ1の背後に駐車されたままだ;その完成は`0.2.x`の目標では**なく**、upstreamのCRuby修正を待つ。

## 将来のサイクル（特定のリリースにコミットされていない）

v0.1.x作業を通じて浮かび上がった項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。

### プラグイン契約——インターフェース分離 + エルゴノミクス（ADR-37/38/39/40）——SHIPPED v0.1.16

1.0前のプラグインメカニズムレビュー（[`docs/design/20260601-plugin-mechanism-pre-1.0-review.md`](../design/20260601-plugin-mechanism-pre-1.0-review/)）が、大規模なインターフェース分離作業を駆動した——エンジンがASTウォークを所有し各狭い拡張を宣言的にゲートする（PHPStanスタイル）、AI可読でインターフェースごとにテスト可能なプラグイン契約であり、古い太いフックは非推奨の脱出弁として残す。**これはv0.1.16で出荷された:** ADR-37/38/39/40がAcceptedであり、バンドルされた14個のウォーカープラグインすべてが`node_rule`へ移行され、ボイラープレート削減の作成者ヘルパー層が着地した。完全な詳細は`CHANGELOG.md` § `[0.1.16]`に;フェーズ別計画は[`docs/design/20260602-plugin-boilerplate-reduction-plan.md`](../design/20260602-plugin-boilerplate-reduction-plan/)に。

**残り（すべて非ゲート、需要駆動のエルゴノミクス;各々が独自の振る舞いを保存するスライス——着地前に各々を検証する）:**

1. **`dynamic_return`の一般化**（オプションの`methods:`ゲート／動的レシーバー述語）——脱出弁コンシューマー（rspecの`let`バインディング、sorbet、activerecord、activestorage）を`flow_contribution_for`から移行するためのパス。太いフックはサポートされた非推奨の弁であり、それらのコンシューマーは変更なく動作する;これは狭いサーフェスを広げるだけである。
2. **[ADR-38](../adr/38-additional-initializers/)ブロック形式**の`additional_initializers`（ivar書き込みが`DefNode`ではなく呼び出しブロック内に存在するrspecの`before`／`let`）——ivar書き込み収集器が宣言された呼び出しブロックへ降りていく必要がある。
3. **インターフェースごとのテストハーネス**（`NodeRuleTest` / `DynamicReturnTest`）——プラグイン作成者が必要とするまで延期。
4. **[ADR-39](../adr/39-plugin-target-library-invocation/)のフォローオン**——スライス3（プロジェクト独自の語形変化のための`config/initializers/inflections.rb`の静的取り込み;デフォルトのASルールセットが一般的なケースをカバー）、最大忠実度の正確なgemバージョンロード（ターゲットの`Gemfile.lock`に固定された`process`／`ruby_box`ワーカー）、`rigor-rspec-rails`のRackカタログを`Isolation`経由でルーティングすること、そして上流の`Ruby::Box` VM segfaultが修正され次第の`ruby_box`の再有効化。
5. **`Source::Literals`採用の残り**——assocキーの*名前一致*イディオム（`el.key.is_a?(SymbolNode) && el.key.unescaped == "x"`）は値抽出ではなくキー比較なので、4ヘルパーグリッドの外に位置する;専用の`symbol_named?(node, name)`ヘルパーがそれを吸収できるが、独自のスライスである。

脱出弁コンシューマー（sorbet / activerecord / activestorage / rspec-let）、dry-rb/graphqlの純粋なFactProviderプラグイン（移行するものなし）、hanami/web（ADR-28 ProtocolContractChecker——別の共通ベース軸）は、**node_rule／スライス2移行のスコープ外**であり、現状のまま留まる。

### 型言語 / エンジン
- **ナローイング駆動の節到達可能性（ADR-47） —— WD1 + WD2 + WD3a着地 + WD4スイープ済み（v0.1.17）;WD3b残り**。デッドな`case`/`when`節に対する新しい`flow.unreachable-clause`診断で、Elixir v1.20の冗長節報告に触発された（レビューノート: [`docs/notes/20260604-elixir-v1.20-type-system-rigor-review.md`](../notes/20260604-elixir-v1.20-type-system-rigor-review/) § 4-2）。`if`/`unless`到達可能性ファミリーの3人目（`flow.unreachable-branch`のリテラル限定 + `flow.always-truthy-condition`の推論された定数）を`case`に拡張したもの —— `case`はエンジンが既に絞り込んでいる: `eval_case_when_branches`が`Narrowing.case_when_scopes`を介して`falsey_scope`を`when`分岐にまたいで通すため、節が到達不能になるのは、計算された`body_scope`が対象を`bot`に絞り込む（節ごとのdisjointness、互いに素）か、入口の`falsey_scope`が既に`bot`な対象を持つ（先行網羅）ときちょうどである —— これはElixirの`dynamic()`の*compatibility*テストが使うのと同じdisjointnessシグナルであり、Rigorが既に持つキャリア代数で表現できる。**WD1 + WD2着地**（`UnreachableClauseCollector` + `RULE_UNREACHABLE_CLAUSE`）: ナローイングされた対象が`Type::Bot`となる`case <local>`に対する`when String` / `when MyClass`を、`scope_index`からエンジン自身の節ごとの`body_scope`を読み取って処理（ダイバージェンスなし）;FPエンベロープ強制（対象は絞り込まれなければならない、`Dynamic`/既に`Bot`では発火しない、クラス/モジュール定数の`when`限定、ループ/ブロックをスキップ）;Rigor自身の`lib`/`plugins`/`examples`でクリーン;lenient/balancedで`:info`、strictで`:warning`を出荷。WD2は先行網羅対disjointメッセージ精度（各節の最初の条件ノードにエンジンが記録する入口`falsey_scope`で区別）と、防御的な`raise`/`fail`/`throw`ガードを除外するデッドな末尾`else`チェックを追加した。WD3aはベアクラスパターン限定（`in C` / `in C => x`、純粋な`is_a?`、`when C`と同様に`Narrowing.case_when_scopes`経由で健全にナローイング）でルールを`case`/`in`に拡張した;非構造化/値/変数パターンは保守的なまま。WD4は16のOSSコーパスをスイープした（[ノート](../notes/20260605-adr47-unreachable-clause-corpus-sweep/)）—— 発火ゼロ、FPゼロ;空虚なパスはより大きなデフォルトの根拠にならないので、balancedは`:info`のまま（strictは`:warning`）、昇格は実際の発火を待つ。**残り:** WD3b（非構造化 / 値 / 変数キャッチオールパターン網羅性、先送りされた[ADR-36](../adr/36-mangrove-enum-nested-class-emission/)の`is_a?`が隣接 —— アドホックに推論しないこと;ゼロ発火スイープで優先度が下がった）。`flow.always-truthy-condition`の偽陽性エンベロープをそのまま再利用し、評価時に収集することでルールとボディ型付けが同一のナローイングを読む。strong arrowsによる健全性は対比のために記録、採用はしない（Rigorは[ADR-5](../adr/5-robustness-principle/)のもとで意図的に不健全なまま）。[ADR-47](../adr/47-narrowing-driven-clause-reachability/)を参照。
- **Elixirに触発されたナローイング拡張（v1.20レビューノート § 4より） —— 着地済み（v0.1.17）**。[`…-elixir-v1.20-type-system-rigor-review.md`](../notes/20260604-elixir-v1.20-type-system-rigor-review/)からスピンオフした2つの制御フローナローイング追加:（a）§ 4-3 **Hashキー存在**（`is_map_key`アナローグ） —— `h.key?(:foo)` / `has_key?`ガード（リテラルキー）がオプショナルなhashシェイプキーをtrueブランチで「存在する」状態にリファインし、`h[:foo]`が`T | nil`ではなく`T`を読むようになり、**falseブランチではキーを削除する**（§ 4-3のfalseエッジキー*不在*、2026-06-05着地）ため、キーが不在と証明された場合`h[:foo]`は`nil`を読む —— 必須キーはfalseエッジを不透明（デッド）のままにし、未知のキーはすでにnilである（`Narrowing#{analyse_key_presence_predicate,narrow_hash_key_absent,remove_hash_key}`）;（b）§ 4-4 **Array非空**（`tuple_size`アナローグ） —— 素の`arr.empty?`（falseエッジ） / `any?`（trueエッジ） / `none?`（falseエッジ）が`Array[T]` → `non-empty-array[T]`にリファインし、`arr.size`/`length`/`count`が`positive-int`を読むようになる（`Narrowing#analyse_array_emptiness_predicate`、既存の`non-empty-array`リファインメント + 空除去射影を再利用）。いずれも具体的なシェイプのみを絞り込み（`Dynamic`では発火しない）、FP安全（ナローイングのみ、新しい診断なし）であり、`dump.type`ラウンドトリップで検証済み。**残り（需要駆動）:** § 4-4の上限長さ追跡（`tuple_size(x) < 3`、長さ範囲キャリアが必要）;§ 4-5のガード後`Dynamic`→`C`強化はFPリスクありと評価（ガードされたボディのundefined-method対<ruby>漸進的保証<rp>（</rp><rt>gradual guarantee</rt><rp>）</rp></ruby>）して**採用しない**。
- **O2 — マクロテンプレート / heredoc-Ruby展開（ADR-16）**。需要駆動の残り項目: **スライス5b**（Tier Dエンジン統合 — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド）と合成メソッドティア向けの**完全なADR-13リゾルバチェイン配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名をリゾルバチェイン経由でルーティング）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **軽量HKT（ADR-20）**。コアキャリア + パーサ + 条件文法 + 主要な`METHOD_RETURN_OVERRIDES`（`JSON.parse`、`YAML`、`Psych`、`CSV`）はすべて着地;ハンドブック第12章も出荷済み。残り（需要駆動）: スライス4（`dry-monads`の`Result[T, E]` / `Maybe[T]`、ADR-3修正が必要）、スライス5（糖衣構文`type`エイリアス）、`rigor-lisp-eval`でのパターンバインディング抽出、追加の`METHOD_RETURN_OVERRIDES`。[ADR-20](../adr/20-lightweight-hkt/)を参照。
- **`rigor:v1:conforms-to`ディレクティブ —— 着地済み（v0.1.17）**。クラス / モジュールレベルの明示的適合ディレクティブ（[rbs-extended.md](../type-specification/rbs-extended/) §「明示的適合ディレクティブ」）: `signature_paths:` RBS内の宣言が、名前付き構造インターフェースを設計上のアサーションとして（呼び出しサイトとは独立に検証される）、チェック済み設計アサーションとして満たすことを表明する。2つの保守的な層をチェック —— **存在**（確実に不在な必須メソッド）と**シグネチャ互換性**（提供されたメソッドの共変戻り値 / 反変パラメータ、FP安全 —— インターフェースとクラスの両方が著作されたRBSであり、ADR-35の両側著作の構成;単一メソッド型のみ、`Dynamic[Top]`の位置はスキップ）—— いずれも`rbs_extended.unsatisfied-conformance`（`:warning` / strictでは`:error`）を表面化;解決不能なインターフェース名は`dynamic.rbs-extended.unresolved`の`:info`に降格。インターフェース名は宣言クラスの名前空間を基準に解決する（Rubyの定数探索スタイル: `Bar::Baz`内の`conforms-to _Foo`は`Bar::Baz::_Foo` / `Bar::_Foo` / `_Foo`を試みる）。**残り（需要駆動）:**シグネチャチェックでのアリティ / キーワード必須性の相違（ADR-35 WD4を反映した位置型比較のみ）。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価（ADR-17）**。`pre_eval:`設定はライブ。残りの需要駆動フォローアップ: スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）。
- **オーバーライドシグネチャ互換性（ADR-35） — スライス1〜4ランディング済み**。著作されたクラス/モジュール階層をまたいでリスコフのシグネチャ規則を強制する`def.override-*`ルールファミリー: `def.override-visibility-reduced`（可視性public → protected/private）、`def.override-return-widened`（戻り値の共変性）、`def.override-param-narrowed`（パラメータの反変性）。それぞれは証明可能（`:no`）な違反でのみ発火し、両側著作のシグネチャにゲートされ（可視性ルールは両側*観測可能* — 可視性はRBSとは独立にソースで表現される）、`severity_profile:`を通じてマップされる（`lenient → off`、`balanced → :warning`、`strict → :error`;加算的で、lenientプロジェクトは影響を受けない）。スライス4（Mastodonコーパスの偽陽性検証）はクロスファイル可視性の偽陽性クラスタを発見・修正し（160 → 35;残余は`strict`の下でのみ顕在化する真の縮小）、保守的なマッピングを維持した — 書き起こしは[`docs/notes/20260529-adr35-mastodon-fp-verification.md`](../notes/20260529-adr35-mastodon-fp-verification/)。**残り（需要駆動、実装時期未定）:** **スライス5**（親が著作 + 子が*推論*の共変性 — 子の推論された戻り値を著作された親の戻り値に対してチェック;より価値が高く、より偽陽性が高い、推論された戻り値の精度にゲートされる）; WD9の段階1のジェネリックインスタンス化を認識する比較（*精度*の向上であって偽陽性安全性の要件ではない — 未束縛ジェネリックはすでに`Dynamic[Top]`へ退化する）;型ルールのためのRBSのみの祖先へのリーチ;そしてシングルトン（`def self.`）メソッドのカバレッジ。[ADR-35](../adr/35-override-signature-compatibility/)を参照。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。（注: クロスプラグインファクト（fact）経由の呼び出しサイトごとの戻り値型ルックアップはv0.1.6で[ADR-18](../adr/18-substrate-per-call-site-return-type/)を介して出荷;上記のADR-13配線は直交する「パラメータ化形パーサ」拡張。）
- **Struct / Data値の畳み込み —— `Data.define`が着地済み（[ADR-48](../adr/48-data-struct-value-folding/)、スライス1〜4、v0.1.17）**。精密なメンバーアクセス畳み込み（`Point = Data.define(:x, :y); Point.new(1, 2).x` → `Constant[1]`）には**新しいキャリアが2つ**必要 —— メンバークラスキャリア（`Type::DataClass`、順序付きメンバー名リスト）とクラスタグ付きメンバーインスタンスキャリア（`Type::DataInstance`、HashShape形だが名前的）—— さらに`DataFolding`ディスパッチ層と、スコープインデクサーが投入するクロスファイルの`Scope#data_member_layouts`サイドテーブル。3つの定義形式（定数代入 / `class X < Data.define(...)`サブクラス / 裸のローカル）、位置指定とキーワードの両構築形式、そして`to_h`/`deconstruct`/`deconstruct_keys`/`members`/`with`射影に対して出荷;精度加算的のみ（ブロック / 非リテラルメンバー / アリティ不一致の場合はクラスの名前的型に劣化 —— 診断なし、FPサーフェスなし）。基礎監査: [`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)。**残り（需要駆動）:**裸のローカルブロック形式のパリティ（`c = Data.define(:x) do … end` —— スライス4のreader再定義ガード用の解決可能なクラス名がなく保守的にbail）と**`Struct`後続作業** —— mutation健全性ストーリーを持つ独自のスライス（`Struct`インスタンスはミュータブル: セッター / `[]=`がメンバーマップを無効化する;サイドテーブルは`Data.define`のみを記録し`Struct.new`は意図的に除外）。`Encoding`値の畳み込みは同じ監査で*恒久的除外*として記録 —— `Constant[Encoding]`キャリアが畳み込めるのはごく小さなサーフェス（`.name` / `.dummy?`）のみ、実際のプログラムは`Encoding`を不透明タグとして使い、キャリア増加のコストは見合わない;`Nominal[Encoding]`が答えのまま。
- **カバレッジ認識の診断姿勢（将来のコンセプト — まだ設計されていない）**。アイデア: spec / テストカバレッジによって診断の*姿勢*を変調する — コードがテストで実行される箇所では楽観的に解析し、そうでない箇所では保守的なまま（または注意をエスカレートする）。これは[`overview.md`](../type-specification/overview/) §「偽陽性の規律」の価値（実行され、テストでカバーされたプログラムはそれ自身の正確性の証拠である）を、「動作している」ことを機械可読かつ*局所的*にすることで運用化する: カバレッジマップが、推論後の診断重要度を変調する新しいファクトソースになり、WD6パイプラインの`severity_profile`の近くに位置する — 型推論自体は変わらない。かつての柱2トラック（<del>spec → 型ファクト</del> <ins>spec本体のナローイングのみ —— [ADR-59](../adr/59-spec-assertions-are-not-signatures/)により、アサーションが実装シグネチャに食わされることは決してない</ins>）とは別物;これはカバレッジ → 信頼度だ。**これが設計可能になる前に解決すべき懸念:**（1）*カバレッジ ≠ 正確性* — 「実行された」は「型に関連するエッジケースが実行されアサートされた」ではないので、カバーされたコードに対する楽観的な姿勢は、テストが実行するがアサートしない実バグを抑制しうる;行カバレッジは特に弱く、分岐カバレッジはより良いが依然部分的だ。（2）2つの半分は**リスクが非対称**だ — 「未カバー → エスカレート」は再優先順位付けするだけで何も抑制しない（安全、純粋にアップサイドのみ）一方、「カバー済み → 抑制」は誤った安心のリスクを持つ;最初のスライスはおそらく未カバーの半分のみであるべき。（3）カバレッジアーティファクト（SimpleCovの`.resultset.json` / `Coverage` stdlibモジュール）はprovenance + 陳腐化処理を必要とする外部ファクトソースであり、不在または陳腐化時にフェイルソフトする。（4）[ADR-22](../adr/22-baseline-and-project-onboarding/)ベースラインとの可能なシナジー — カバレッジはどのベースラインバケットが「未テスト、ゆえに最初にレビューに値する」かをランク付けできる。ADRなし、スライスなし、コミット済みマイルストーンなし — 方向性としてここに記録。

### アナライザーのセルフテスト —— ティース計測 + 型保護カバレッジ（ADR-62 / ADR-63）

偽陽性の規律の双対: **偽陰性**を体系的に計測し（コードを壊すとRigorが噛みつくか）、それをユーザーに表面化する。基礎: [`docs/notes/20260613-mutation-teeth-harness.md`](../notes/20260613-mutation-teeth-harness/)。

- **[ADR-62](../adr/62-mutation-testing-teeth-measurement/)ミューテーションティースハーネス —— 着地済み（dev専用、ADR-50の凍結サーフェスの外）**。`tool/mutation/`は型に見えるミューテーションを注入し、*生き残った*ミュータントを偽陰性候補として読む;インプロセスの型認識フィルタがメトリックを意味あるものにする（生のkill率はノイズ —— ほとんどのミューテーションは正しい等価ミュータントである）;`mutate.rb sweep`は生存者を`(operator, receiver type)`でランク付けされたバックログにクラスタ化し（エージェント向けに`--json`）、`mutate.rb fuzz`はロバストネスの姉妹だ（クラッシュ / ハング / 非決定性 —— 2,706ミュータントの`lib/rigor`実行はクリーンだった）。**そこから3つのエンジンティース修正が着地した:**ユニオン（union、合併型とも）レシーバーのundefined-method（非nil各アームが確実に不在のとき発火、nilableスタディから収穫したジェネリックメタクラス + 異クラスのFPガード付き）、RBSクラスエイリアス解決（`Mutex = Thread::Mutex`およびあらゆる`X = Y`）、そしてリファインメント（refinement、篩型とも）レシーバーディスパッチ（`non-negative-int` / `non-empty-string`が今やそのベースクラスへ解決する）。累積的な再スイープが`lib/rigor`のティースを61.7 % → 71.4 %へ動かし、生存者−29 %。**スタディ済み + 却下:** nilableユニオンティース —— 13プロジェクトのコーパスFPスタディ（ActiveSupport偏重 + プレーン）が発火ほぼゼロに加え実際の特定性喪失FPを発見したため、意図的なN3 `T | nil`の沈黙を維持する。**需要ゲート付き:** `Type::*`セルフドッグフードRBS（残りのトップクラスタはADR-24の`call.self-undefined-method`ルールで、`:off`で出荷される）、ブロードファズの拡張、`arity_extra`固定アリティガード。
- **[ADR-63](../adr/63-type-protection-coverage/)型保護カバレッジ —— Tier 1 + Tier 2着地済み**。`rigor coverage --protection`（Tier 1、静的プロキシ）: 単一の`type_of`パスが各ディスパッチサイトを、そのレシーバーが具体クラスに型付けされるか（「ここでRigorは誤った呼び出しを捕まえられるか」）でスコアリングし、保護された比率 + ランク付けされた「ここに型を足す」リスト（型なしレシーバー上で最もよく呼ばれるメソッド） + 最も保護の薄いファイルとして報告する、既存の`--threshold`ゲートと`--format json`を再利用して。実際の保護の健全な上界。**Tier 2（ミューテーションベースの有効性）は2026-06-14に着地:** `rigor coverage --protection --mutation`、ファイルごとの*実際の*kill率、オプトインでgit変更ファイルスコープ（明示的なパスで広げられる）。ADR-62ハーネスの狭いサブセットを`lib/rigor/protection/`へプロダクト化する（`Mutator` + `MutationScanner` —— ウォームループ + 型認識フィルタ + kill基準）;dev用のsweep / fuzz / クラスタ化はADR-62 WD4に従いdev専用のままで（反転ではなくスコープ化された洗練）、`tool/mutation/mutate.rb`は`lib`の`Mutator`を再利用する。`--threshold`は有効性率でゲートし、`--format json`は`{mode, killed, survived, effectiveness_ratio, files, add_a_type_here}`を運ぶ。フレーミングルール（ロードベアリング、ADR-62基準A）: 常に有効性 / どこに型を足すか、決して生のミューテーション生存ではない。**需要駆動:**オプションのファイルごとミューテーション上限（スキャナはすでにシード付きの`limit:`を受け入れる）と、ADR-46のインクリメンタルに裏打ちされたより安価なプロジェクト全体の実行。

### プラグイン / エコシステム

ガバナンス: [ADR-31](../adr/31-contribution-and-supply-chain-policy/)はプロジェクト全体の貢献・サプライチェーンポリシーである。**変更の大きさ**で貢献を整理する: 軽微で焦点の絞られた変更（バグ修正、ドキュメント改善、タイポ修正、スコープ化されたリファクタ、テスト、既存バンドルプラグインのバグ修正）は任意のパスへの直接PRとして歓迎される;広範な変更（アーキテクチャ的書き換え、コードスタイル一括変更、新規アナライザー機能、新規バンドルプラグイン、ADR / 仕様の撤回）はチームが著作した実装に`Co-authored-by:`属性を付けたうえで、issue先行の提案を経る。WD2〜WD5のプラグイン固有の想定パス:（1）`gem "rigortype"`に依存する著者自身のリポジトリ内の**サードパーティ`rigor-<gem>` gem**（ADR-31 WD4 — [MPL §3.3](../LICENSE)下のLarger Work、完全サポート、デフォルトの想定）;（2）ラップ対象gemがコミュニティ認知に達したときの`Co-authored-by:`属性付き**issue経由のバンドル化昇格**（ADR-31 WD2、判断基準はWD3に従って意図的に曖昧）;エンジン / 仕様 / リファクタの提案はWD3の採用エビデンス要件を除き、同じWD2のissue駆動の形に従う。実績あるサードパーティプラグインのsubtreeマージはオプションのパスとして留保される（ADR-31 WD5） — サードパーティ著者が前提とすべきパスではない。

- **`rigor-graphql`** — 将来のスライス（需要駆動）: リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け。
- **dry-rbアダプタプラグイン（[ADR-12](../adr/12-dry-rb-packaging/)）**。**残り**: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断;需要駆動）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json { ... }`パリティ）;`rigor-dry-monads`（依然`Result[T, E]` / `Maybe[T]`キャリア決定が必要 — スライシング計画を参照）。基礎サーベイは[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)。
- **ADR-10 — gemソースからの呼び出しごとの戻り値型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り値型を推論すること（`mode: :full`が`Dynamic[Top]`より豊富に貢献できるように）は、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **プラグイン提供のRBSシグネチャ**。[ADR-25](../adr/25-plugin-contributed-rbs/)が提案された（2026-05-21）: オプションの`signature_paths:` `Manifest`フィールドにより、プラグインgemがRBSディレクトリを貢献でき、`Plugin::Loader`によって解決されRBS環境にマージされる。今日RBSのみのバンドルgem（`rigor-activesupport-core-ext`）を非ポータブルな`signature_paths:`パス経由で手配線することを強いるギャップをクローズする。3スライス（マニフェストフィールド + ローダー解決 + 環境マージ → `rigor-activesupport-core-ext`を些細なプラグインに変換 → `rigor-project-init` SKILLのフォロースルー）;pre-1.0プラグイン契約に加法的、v0.1.x内で安全。コンパニオンフォローアップ（別個、より小さい）: `Environment::BundleSigDiscovery`の自動検出を`vendor/bundle` / `.bundle/config`レイアウトを超えてデフォルトの`bundle install` gemパスに拡張する。
- **ADR-28パススコープのプロトコル契約 — オープンエコシステム項目**。`rigor-actioncable`の`#receive(data)`パラメータ型提供: `method_name: :receive, param_types: [{index: 0, type_name: "Hash"}]`の契約により、すべてのチャネルのreceiveボディ内で`data`が`Hash`として型付けされる。需要駆動。
- **インラインRBSコメント取り込み（[ADR-32](../adr/32-rbs-inline-comment-ingestion/)）— 着地済み**。3スライスすべてとWD10 CLIキャリーオーバーがv0.1.xサイクルで出荷: スライス1（エンジンフック + バンドル`rigor-rbs-inline`プラグイン） + スライス2（`（コンテンツSHA、プラグインID + バージョン + config_hash）`をキーとするファイルごとキャッシュ + envキャッシュ無効化 + 新しい`Plugin::SourceRbsSynthesisReporter`経由の`source-rbs-synthesis-failed`インフォ診断） + スライス3（プラグインREADME + ハンドブック第7章 §「RubyソースへのインラインRBS」） + 単一ファイルアドホックCI用途向け`rigor check --treat-all-as-inline-rbs` CLIフラグ。WD9のトップレベル`def`キャビアットはrbs-inline 0.14.0に対して確認済み（裸のトップレベルdefへの出力なし;エンゲージするにはクラスラップが必要）。残りの需要駆動フォローアップ: 新しい`source_rbs_synthesizer:`フックを取り巻くLSPインクリメンタルフロー統合（ADR-19 LSPロードマップ下にキュー済み）。公開APIドリフトサーフェスの全リストは`CHANGELOG.md` § `[0.1.10]`を参照。
- **`rigor-ffi`プラグインファミリー（[ADR-30](../adr/30-rigor-ffi-plugin-shape/)）**。コアの`rigor-ffi`は`ffi` gemの共通機構（`extend FFI::Library`、`attach_function`、`callback`、`typedef`、`enum`、`bitmask`、`FFI::Struct`/`Union`/`AutoPointer`/`MemoryPointer`/`Pointer`/`Function`/`Buffer`）をカバーし、tenderloveの`ffx` gemが同じDSLの厳密なサブセットを出荷しているため、ffx対象プロジェクトも追加コストなしでサポートする — さらにgemインストール時にffxが拒否する宣言を表面化する新しい`ffx.unsupported-*`診断ファミリーも提供する。ライブラリごとのサブプラグイン（`rigor-rbnacl`、`rigor-ethon`、`rigor-ffi-rzmq`、`rigor-sassc`）はDSL認識器、オプションカタログ → セッター生成、高レベルAPIのRBSリファインメント（refinement、篩型とも）を貢献する。WD9: 実装は直接の需要よりも非ユーザーオーバーヘッドゼロ（サブプラグインは解決済み依存マッチ時のみアクティブ化）によって正当化される — 想定された4つの消費者すべてで需要は弱い（sassc-rubyはEOL、typhoeus/ethonとrbnaclは特化型、ffi-rzmqはニッチ）。WD10:「バニラ」FFI gem（リテラルな`attach_function` + 薄いRubyラッパークラス）にはコアで十分であり、プラグインは不要 — 依存を宣言するだけでよい。新しいSKILL [`.claude/skills/rigor-ffi-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-ffi-plugin-author/SKILL.md)は著者を最初にカバレッジ評価へ案内し（コアで十分なときは*著者を著作から思いとどまらせる*ように設計）、残るケースをプロジェクト全体の[ADR-31](../adr/31-contribution-and-supply-chain-policy/)貢献ポリシーへルーティングする。FFI固有の追加: プラグインのgemspecでラップ対象gemのバージョン範囲をピン留めする（孤立プラグインリスクはADR-31 WD4に従いプラグイン著者の責任）。スケッチされた6スライス: コアMVP → `rigor-sassc`（経験構築） → `rigor-ethon` → `rigor-rbnacl` + `Plugin::FFI::BindingRecognizer`拡張ポイント → ffx対象検出 + 診断 → `rigor-ffi-rzmq`（ADR-10呼び出しごとの戻り値型精度にゲート）。基礎サーベイ: [`docs/notes/20260525-ffi-library-survey.md`](../notes/20260525-ffi-library-survey/)。姉妹の`rigor-fiddle`プラグイン（FiddleのDSLは別個の著作を必要とするほど分岐している）はADR-30のスコープ外と明示される。スライスはスケジュールされていない。

### エディタ / IDE統合
- **LSP — 並列マルチバッファpublishのためのRactorプール**。LSP設計ドキュメントのスライス8は2つの関心事を列挙した: デバウンス（着地）AND Ractorプール統合。プール部分は需要駆動のまま — ワーカーをLSP `initialize`で1度事前ウォームしpublish全体で再利用できるよう、`Analysis::Runner`が事前ビルドされた永続的`Environment`を受け入れるリファクタが必要。ProjectContext（スライス7）はすでに読み取り専用`Cache::Store`経由でpublish + hoverにウォームEnvironmentの勝利を与える;ディスパッチ側並列性（コア全体のマルチバッファpublish）が残りのレバー。需要駆動。
- **LSP — `textDocument/definition`**（設計ドキュメントのスライス9、先送り）。`FILE:LINE`でキー化された`Reflection`側のシンボルインデックスが必要。需要駆動。
- **LSP — インクリメンタル`didChange`同期**（設計ドキュメントのスライス10、先送り）。現在、サーバーは`TextDocumentSyncKind::Full = 1`をアドバタイズするため、各キーストロークがバッファ全体を再送信する。インクリメンタル（`TextDocumentSyncKind::Incremental = 2`）はUTF-16オフセット帳簿 + 編集ごとの適用が必要。帯域幅はローカルstdioなのでコストはワイヤではなくパースにある;需要駆動。
- **LSP — まだキューされた拡張機能**（v2以降 + フォローアップ後 + ポリッシュ後）: `textDocument/codeAction`、`textDocument/rename`、`textDocument/semanticTokens`、`textDocument/inlayHint`、`textDocument/definition`（LSP v1設計のスライス9 — Reflectionシンボルインデックスが必要）、インクリメンタル`didChange`同期（LSP v1設計のスライス10 — UTF-16オフセット帳簿）、並列マルチバッファpublishのためのRactorプールディスパッチ（LSP v1設計のスライス8後半 — Runnerリファクタ）、マルチルートワークスペース、TCP / Unixソケット輸送、スニペット展開、素の名前（暗黙のself）補完、シンボル補完、シグネチャ内ハイライトのための`ParameterInformation`オフセットタプルラベル、`completionItem/resolve`遅延ペイロード、プラグイン側の補完貢献。
- **エディタモードオプションB — ファイルごとの診断キャッシュ**。今日のエディタモードはオプションA（単一ファイルスコープ）を出荷: バッファのみがファイルごとの診断を生成する。オプションB（PHPStan形: プロジェクト全体の解析と1つの代入されたファイル、「編集ファイル + ディペンデントのみ再解析」）にアップグレードするには、`（ファイルダイジェスト、プロジェクトEnvironmentダイジェスト）`でキー化されたファイルごとの診断キャッシュが必要 —— **これはまさにADR-46インクリメンタルトラック**（`dependents`インデックス + ファイルごとのキャッシュ + `--verify-incremental`）であり、ADR-46スライス2が着地すればオプションBはそのエディタ側の消費者となる。ADR-45の`Cache::Store#fetch_or_validate`がrecord-and-validateのプリミティブ;ADR-17スライス3bのファイルごとのキャッシュディスクリプタはより古いレバー。設計: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「スコープの選択」。需要駆動。
- **CLIエディタモード — ディスクバック`ProjectScan`スナップショットキャッシュ**。実装パスは[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)に文書化。`rigor check --tmp-file=X --instead-of=Y`シェルアウトパスをターゲット: プロジェクトのプレパス出力（スキャナ + dep-sourceインデックス + プラグイン公開ファクト）を`.rigor/cache/`に永続化し、`(config + plugin manifest + project file mtime+size + pre_eval mtime+size)`でキー化することで、ウォームCLI呼び出しがプレパスをスキップできるようにする。期待される勝利: CLI呼び出しあたり-200 ms（小プロジェクト）から>-1.3秒（基板プラグインを持つ大規模モノレポ）。新しい不変条件: `Plugin::FactStore`スナップショットAPI、プラグインファクトのMarshalフレンドリーさ。5フェーズ（Marshal可能なscan / キー導出 / キャッシュプロデューサー / Runner統合 / FactStoreスナップショットAPI）。需要駆動;LSPパスはすでにエディタケースのほとんどをpublishあたり≤5 msでカバーしているので、このスライスは具体的なCLIシェルアウトのエディタ拡張が約1秒の壁をUX問題として報告したときに着手される。
- **エディタモード — プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ**。LSPパスで**着地**（v0.1.6、CHANGELOG § `[0.1.6]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan`ビルダー + `Runner.new(prebuilt:)`採用パス;LSPの`ProjectContext`がスナップショットを遅延ビルドし、`invalidate!`でドロップする。CLIエディタモード（`rigor check --tmp-file`）はまだスナップショットを消費**しない**、各呼び出しが新鮮なプロセスのため — `（plugin-manifestダイジェスト、プロジェクトファイルmtime + サイズリスト）`でキー化されたディスクバックのスナップショットキャッシュが、ワンショットCLI呼び出しもプレパスをスキップできるようにする。需要駆動;LSP側の勝利が典型的なエディタ消費者。
- **エディタモード — `--also=path,path`呼び出し元宣言のディペンデント**。エディタ拡張は現在、ディペンデントを更新するためにN個の単一ファイル呼び出しを発行する必要がある。`--also`付きの単一の呼び出しがそれらをバッチする。些細なCLI拡張;設計ノートは`docs/design/20260516-editor-mode.md`。需要駆動。
- **マルチバッファエディタモード**（`--buffer A=B --buffer C=D`）。LSP v1がほとんどのユースケースでこれを置き換える（LSP `BufferTable`はすでにNバッファを保持する）;非LSPバッチツーリングには引き続き関連。需要駆動。

### パフォーマンス / スケーラビリティ — キャッシュ + インクリメンタル解析（ADR-44 / 45 / 46、SHIPPED v0.1.17）

v0.1.17パフォーマンスサイクル。出荷済みの詳細は`CHANGELOG.md` § `[0.1.17]`にある;エンジン内部の再開用詳細は`docs/CURRENT_WORK.md`にある。ここでは、ADRごとの前向きな*残り*（需要ゲート付き）のレバーのために掲載する。

- **[ADR-44](../adr/44-dispatch-allocation-churn/) — ディスパッチごと / ナローイングごとのアロケーションチャーン（着地済み）**。`rigor check`はアロケーションバウンド（プロファイル: [`docs/notes/20260604-mastodon-allocation-profile.md`](../notes/20260604-mastodon-allocation-profile/)、[`…-gitlab-plugin-contribution-allocation.md`](../notes/20260604-gitlab-plugin-contribution-allocation/)）。ボディスコープの`with_*`チェーン畳み込み + アロケーション衛生。ミュータブルなプール化`Scope` / `CallContext`は却下（再入性 → FP）;`ProjectScope`再グループ化は格下げ（オブジェクトシェイプベンチマーク: サイズを削るが個数は削らない）。**残り（需要ゲート付き）:**ヒープ圧迫のケースが現れた場合の`ProjectScope`メモリフットプリント再グループ化;シンボルレベルの`CallContext`特殊化。
- **[ADR-45](../adr/45-unchanged-project-fast-path/) — 未変更プロジェクトの高速パス（着地済み）**。record-and-validate全体実行診断キャッシュ。粗い: 解析対象ファイルが変更されれば全体を再実行。**CIの注意点:**コード変更時、キャッシュは約113秒のGitLab実行で<1秒しか節約しない（計測済み）ため、CIで`.rigor/cache`を永続化するのはほぼ無意味;勝利はローカル開発 / エディタ / 同一SHA再実行。CIのレバーはADR-46。
- **[ADR-46](../adr/46-incremental-dependency-graph/) — ファイル横断の依存グラフによるインクリメンタル解析（ボディ層COMPLETE、着地済み）**。`rigor check --incremental`は`ΔF ∪ dependents[ΔF]`のみを再解析し、残りをフィンガープリント付きクロスプロセスディスクスナップショットから提供する;ファイル単位の依存を`Scope`アクセサのチョークポイントで記録 → `dependents`インデックス;健全性は`--verify-incremental`（`make check-incremental`、全体実行に対してバイト単位同一）でCIゲート。未変更 / リーフ編集実行で約6〜9倍を計測。**スライス3+4着地、構造層はファイル追加/削除を含め完全完成:**スライス4（シンボル粒度: `(file, symbol)`依存）とスライス3（構造層ネガティブ依存追跡 —— 2つのウォームセッション健全性ギャップをクローズ: ある`helper()`が後続の定義後に古い`call.unresolved-toplevel`を提供し、あるサブクラスがスーパークラスが後から定義された後に古い欠落`def.override-*`を提供していた;`top_level_def_for` + オーバーライドチェッカーがポジティブ/ネガティブエッジを記録し、`#recheck`が出現シンボル/クラスのネガティブディペンデントで対象を拡張する）。**ファイル追加/削除がインクリメンタルになった** —— スナップショットのフィンガープリントが（ファイルリストではなく）解析ルートにキー化されているため、ファイルを追加/削除してもスナップショットはウォームなまま、`#recheck`がデルタを調整する（追加 → 解析 + 今定義された名前の消費者を再チェック;削除 → 退出 + ポジティブディペンデントを再チェック）、全体実行とバイト単位同一。**残り（需要ゲート付き）:**推論された戻り値のファンアウトを抑制する戻り値型サマリー。構成要素: `Analysis::{DependencyRecorder,Incremental,IncrementalSession}`、`Cache::IncrementalSnapshot`。ADR §「Staging」 + `docs/CURRENT_WORK.md` §「次セッションのエントリーポイント」を参照。

### パフォーマンス / スケーラビリティ — コンパイル済みプラグイン貢献ディスパッチ（ADR-52、COMPLETE —— スライス1〜6が2026-06-10/11着地;5つのレガシーユーザーすべてが移行、フック削除）

**[ADR-52](../adr/52-compiled-plugin-contribution-dispatch/)** —— プラグイン消費パスにおけるADR-44のスポット修正の構造的後継であり、[2026-06-10の構造監査](../notes/20260610-plugin-architecture-perf-audit/)に基づく。基準: per-call / per-def / per-file / per-nodeのすべてのプラグイン参照は、エンジンが既に保持するキーでゲートされ、レジストリ構築時に実行ごとに1回コンパイルされるテーブルを経由する;プラグインコードは候補ヒット時のみ走る。**COMPLETE —— 6つのスライスすべてが2026-06-10/11着地**、それぞれMastodon（6プラグイン）/ GitLab（11プラグイン）コーパスでのバイト同一診断 + stackprofデルタ + `make bench-perf`でゲート: （1）コンパイル済み貢献テーブル + エンジン呼び出しサイトの再配線（契約変更なし）;（2）静的メソッド名のみ`dynamic_return`（レシーバーレス）→ `rigor-units`（監査修正: 静的ゲートに適合する本番プラグインはなかった —— activesupport-core-extはフックを出荷せず、sorbetのカタログはランタイム名前セット）;（3）ランタイム**レシーバーセット**callable（遅延`instance_exec`メモ、ブロックフィルタの安全な過大近似）→ `rigor-activestorage`;（4）ランタイム**メソッド名**セット → lisp-eval / pattern、その後`rigor-sorbet`（dependabot-coreが約38倍高速）と`rigor-activerecord` —— **レシーバーゲートの「ブロッカー」は新しいゲート形式なしで解決された**、メソッド名callableはレシーバー型を一切読まないためである —— 加えてファイルごとの`file_methods:`（スライス5a）→ `rigor-rspec`;（5b）**`flow_contribution_for`を削除**（意図的なpre-1.0 BC破壊 —— ロード時エラー + CHANGELOG移行ノート）;（6）ファイルごとに単一のエンジン所有`Plugin::NodeRuleWalk`。スライス別の完全な記録（コミットハッシュ、解決されたARブロッカー、委譲の教訓）は`docs/CURRENT_WORK.md` §「ADR-52」にある。需要ゲート付きの残りものだけ: ノードメジャー診断の再ソート（採用せず —— バイト同一性を壊す）と、プロファイルがレシーバー祖先ウォークをホットだと示した場合の厳密メンバーシップSetゲートの洗練。凍結されたテーブルはRactor共有可能（ADR-15フェーズ4）;これがADR-37の分離アークを完成させる。

### パフォーマンス / スケーラビリティ — キャッシュディスク + ウォームロードのスリム化（ADR-54、SHIPPED 2026-06-10）

**[ADR-54](../adr/54-cache-slimming/)** —— ADR-44/45/46サイクルが手をつけなかったキャッシュ層のディスク/ロード軸をクローズした、[2026-06-10のキャッシュ監査](../notes/20260610-cache-disk-runtime-audit/)に基づく。以前: あらゆるプロジェクトの`.rigor/cache`は約32 MB（3つのRBS Marshalブロブ;sigなしプロジェクト間でバイト同一 → サーベイコーパスマシンで1 GB超が重複）あり、ウォーム実行はそれらを実体化するために約700 msの`Marshal.load`を払っていた。基準: キャッシュ層は、ウォームパスで次に安い層からの再計算を上回る場合にのみそのバイトを正当化する。**4つのWDすべてが着地**（コミット`5f53db09` / `0c671e04` / `d2465fe1` / `5ced88f1`）: (1)`rbs.instance_definitions` / `rbs.singleton_definitions`ディスクブロブを廃止 —— キャッシュされたenvを考えるとネットでネガティブと計測（ロード366 ms対build-all 137 ms;23.4 MB/プロジェクト）;ディスパッチパスは既存のプロセスごとメモ上でクラスごとに遅延、ADR-15のprewarm/Reflection消費者はキャッシュされたenvから構築されたeagerなフルテーブルを保つ;（2）あらゆるエントリーの値ペイロードを`Store::HEADER`フォーマットバイトのbumpの背後でzlib-deflate（envブロブはraw比16 %の1.76 MBに着地;古いエントリーはサイレントミスとして読まれる、移行コードなし）;(3)`cache.max_bytes`はデフォルト256 MBになり`evict!`が恒久的なno-opでなくなった —— rigorリポジトリ自身のキャッシュは約2 MBのアクティブセットに対して約180 MBのオーファンを蓄積していた（明示的な`null`で無制限を復元）;(4)`RbsDescriptor.build`をローダーごとにメモ化。着地したエンベロープ: プロジェクトごと約33.7 MB → 約2 MB（−94 %）;definitionsに触れるウォーム実行は最大約550 ms / 1.6 Mアロケーションを節約;コールド実行はeagerなbuild-all + 23 MB書き込みを削減。ADR-7 § Slice 6-Dを部分的に置き換える。先送り/却下: クロスプロジェクト共有キャッシュルート（スリム化後の重複は約1.7 MB × N —— 2つ目のルートに見合わない）、`fresh?` mtime高速パス（健全性）、zstd（新規依存）。各スライスは診断同一の自己チェック（`--no-cache`/コールド/ウォーム）+ Mastodonコーパス実行でゲート。

### 内部アーキテクチャ — 正式リリース前の再検討（次の作業ターゲット）

[2026-06-10のlib/rigorアーキテクチャ再検討](../notes/20260610-lib-rigor-architecture-rereview/)は、
リリースラインを前に2つの軸でエンジン全体を再チェックした —— 役割分離の
明快さ、そしてホット呼び出しパスの無駄 —— そして基盤が健全であることを
見出した（非循環的なレイヤリング、不変Scopeの規律、統一されたディスパッチ層）。
残るものは次の作業ターゲットとしてここにキューされる、4つのフェーズで
（完全な根拠と`file:line`の裏付けはノートに）:

1. **Phase 1 —— 機械的な修正。完了（2026-06-11）**。
   (a)`rigor-sorbet`のパブリックAPI境界違反を`Type#accepts`へ書き換え
   （`9946b3ea`）;（b）ユーザークラスフォールバックの`CallContext`
   再構築をエントリコンテキストから`#with`経由で導出（`495cdf5a`;Tier-B
   昇格の再構築は意図的に残す —— コンテキストがそこに到達せず、1つを
   スレッド化すると挙動上の利得なしにシグネチャがカスケードする）;(c)`rigor check`
   を`CLI::CheckCommand`に抽出（`d5b0e108`、cli.rb約990 → 約320行）。
   フラグしたフォローアップ、未実施: cli.rbは今や推移的に未使用となった
   requireをいくつか保持する（埋め込み者向けに挙動隣接、別スライス）。
2. **Phase 2 —— [ADR-52](../adr/52-compiled-plugin-contribution-dispatch/)
   の実装: 完了（ADRは完了、スライス1〜6が2026-06-10/11着地）。
   ビルトイン層のアデンダムも完了**：8つのstdlibシングルトン
   フォルダーは今や`Singleton`レシーバーに対してのみ参照される凍結された
   クラス名 → フォルダーテーブルの背後に座る（構成上相互排他 —— 各
   フォルダーの最初のチェックは`Singleton[<そのただ1つのクラス>]` ——
   なので畳み込みは観測上同一;テーブルは8つがフラットリストにあった場所に
   座る）。非シングルトン呼び出しは8つのno-opトライアルすべてをスキップする。
3. **Phase 3 —— 構造的、挙動保存。完了（2026-06-11）**。
   (a)`Analysis::Runner`を
   `runner/{pool_coordinator,project_pre_passes,diagnostic_aggregator,run_snapshots}`
   に分解（約2000 → 約970行のオーケストレーター;reader-proc注入が読み取り
   タイミングを保持する;キューに入ったLSPの事前構築Environment
   リファクタの足場でもある）。（b）Narrowingが今や確実性判断の唯一の
   所有者 —— `predicate_certainty` / `class_pattern_certainty` /
   `value_pattern_certainty`を自身のフラグメントから導出する;Typerと
   Evaluatorは呼び出し側（`&&`/`||`の`constant_value_polarity`ゲートは
   意図的にConstant専用のまま —— そこでのフルプローブ精度は挙動変更で
   あり、需要ゲートとしてキューされる）。
4. **Phase 4 —— [ADR-53](../adr/53-scope-discovery-index-separation/):
   完了（2026-06-13）。** Track A完了（A1 `031f161e` + A2 `063823e4`、2026-06-10/11）;
   Track B完了（B1〜B4完了）: B3（`b85c51c6` + `4f1745aa` + `963a2947`）は
   5つのビルトインコレクターすべてを`CheckRules::RuleWalk`にホストした;B4
   （`e614ebf3` + `2925d66a`）はそれを`Plugin::NodeRuleWalk`と**ファイルごとに合計1回の
   ウォーク**へ収束させた;シャドウハーネス + バイト同一を通してゲートし、
   等価性スペックは191例。完全な4フェーズの1.0前アーキテクチャ再検討が完了した。

### パフォーマンス / スケーラビリティ — その他のレバー
- **O4レイヤー3 — `Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング**。v0.1.5の`BundleSigDiscovery` MVPの上に座る。MVPの自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）はバージョン管理された解決テーブルになる;rigorは`Bundler::LockfileParser`出力を消費 + `ruby/gem_rbs_collection`で最適マッチバージョンをクエリする。O7の失敗メモでアンブロック（競合は今ハングするのではなく警告する）。
- **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリー;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。
- **Spec-suiteランタイムブレークダウン（2026-05-17調査;部分的に着地）**。`make verify`デフォルトが並列rspec（コミット`086e507`）に切り替わった: wall時間217秒 → 60秒（12コアで3.6×）。フォローオンサイクルが実際のボトルネックは**各`analyze(sig: …)`での呼び出しごとのRBS env再構築**であることを確認した: `Cache::Store`は`RbsDescriptor::FileEntry`ごとに`(path, sha256)`でenvをキーするため、各呼び出しの一意の`Dir.mktmpdir`ルートのsigパスが新鮮な約1.8秒のenv構築を強制した。**ヘルパー側の修正が着地**（`spec/support/runner_helpers.rb`）: コンテンツキー化sigディレクトリ + ソースのみの呼び出しに対する共有ワークスペース。`runner_spec.rb` 39.6秒 → **25.4秒孤立（-36%）**、`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。元々キューされた2つのレバーは小さな残りのヘッドルームでオープンのまま:
  - **(a) `runner_spec.rb`の例間で`Environment`を共有**、`before(:context)`または`let_it_be`形のヘルパー経由で。キャッシュキー修正が呼び出しごとのコストのsig関連コンポーネントをクリアしたので、残りの勝利はソースのみの高速パスを打つ約80%の例に対するEnvironment構築自体。例ごとのプラグイン変動は依然共有を複雑化する。需要駆動;ヘルパー側の修正がすでにほとんどのヘッドルームを吸収した。
  - **（b）インメモリ`Analysis::Runner.run_source(source:, path:)`エントリーポイント —— 着地済み（v0.1.17）**。RubyのStringをメモリ内で解析（tmpdir / chdirなし）、`parse_source` + `accept_as_ruby_file?`が従う`@in_memory_sources`マップ経由;素の`analyze(source)`specヘルパーがこれを経由し、スイート全体で等価性を検証する。**パフォーマンスに関するメモ:**仮定していた約5% spec-suite改善は実現しなかった（共有ワークスペースのパスはすでに最適化済み）;真の価値はクリーンな埋め込み者（LSP / エディタ）のパブリックAPIにある。
- ~~**インメモリ`Analysis::Runner.run_source`エントリーポイント（パブリック + テスト専用）**。~~ 着地済み —— 上記（b）を参照。

### Sig-gen（ADR-14）
- **`--params=observed` attr_reader / attr_writer / attr_accessorの`initialize`観測からの推論 — 着地済み**（コミット`f2aa8de`、v0.1.9サイクル）。`rigor sig-gen --params=observed --write`は、`def initialize`の`@ivar = param`代入経由で観測された呼び出しサイト引数型を`attr_reader` / `attr_accessor`メソッドに伝播するようになり、`:untyped_return`としてスキップされる代わりに具体的なユニオン（union、合併型とも）戻り値型を受け取る。実装: `build_observed_ivar_map` → `collect_init_ivar_obs` → `ivar_obs_from_initialize`（+ `build_ivar_obs_type_map` / `collect_param_obs_types`）。新しいロジックはすべて`Generator`に留まり`ScopeIndexer`には触れない。TypeProfコンパチビリティスペック追加（`spec/rigor/sig_gen/typeprof_compat_spec.rb`）。
- **`--params=observed`後の残りギャップ**（需要駆動フォローアップ）: `initialize`以外のソース（DB読み込み、設定、副作用）からivarが設定される`attr_reader`は依然`:untyped_return`にフォールバック;修正は手書きのsigアノテーション。untyped受信者への深いチェーンは`rbs collection install` / ADR-10が必要。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグインが必要。
- **`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。

### ブラウザプレイグラウンド（ADR-29）

リアルタイム診断と`annotate`スタイルの型コメントを備えたCodeMirror 6エディタを持つブラウザベースのプレイグラウンド。Fly.io上の薄いRack/Puma APIとCloudflare Pagesの静的フロントエンドでバックアップされる。**スライス1〜4がv0.1.xサイクルで着地済み:** `Tempfile`per-request分離 + 64 KB上限 + CORSプリフライトを伴うバックエンド`/check`エンドポイント（スライス1）;デバウンスされたlintマーカーを持つCodeMirror 6エディタ（スライス2）;`/annotate-lines`トグルビュー（スライス3）;CodeMirrorの`hoverTooltip`拡張経由の`/type-of`ホバー（スライス4）。スライス1のFly.ioデプロイ成果物（`plugins/rigor-playground/Dockerfile` + `plugins/rigor-playground/fly.toml`）とスライス2のCloudflare Pagesデプロイ設定（`plugins/rigor-playground/frontend/_headers` + `_redirects` + README）はコミット可能なconfigとして同梱される;実際の`fly deploy` / `wrangler pages deploy`ステップはクレデンシャルが必要で、いかなるランディングサイクルの一部でもない。スライス5（ruby.wasm移行）は需要駆動のまま、3つの外部条件にゲートされている（公式Ruby 4.0 WASMビルド + `prism`/`rbs`のWASMパッケージ + WASM下でのRigorテストスイートのパス）。

**ADR-29 WD4修正（2026-05-25）が有効**: バックエンドは`require_magic_comment: false`で`rigor-rbs-inline`を事前ロードする（[ADR-32](../adr/32-rbs-inline-comment-ingestion/)のWD10に従い）。`# @rbs`形コメントを持つスニペットは最初のリクエストからインラインRBSとして解析される。`index.html`のシードSAMPLEはADR-32 ascdescパターンでこれを紹介する。[ADR-29](../adr/29-browser-playground/)を参照。

### ADRにキューされたオープン研究質問
- **ADR-15 § OQ1** — Ractorごとの`Cache::Store`共有ファサード。今日各ワーカーはキャッシュから自身のRBS envを構築する;OQ1は共有可能なファサード経由でワーカー全体でインメモリenvを共有することを探る。プールのwall-clockがシーケンシャルを上回るクロスオーバー（現在は約1.3〜1.8Kファイル）を下げる。
- **ADR-13 §「オープンクエスチョン」** — 5つのコア関数（`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`）を超えるシェイプ射影サーフェスの拡張。新しいマップ型語彙を追加するときに権威的。

### ドキュメント — ユーザー向けドキュメントのオーバーホール（COMPLETE）

ユーザー向けドキュメントに対する[`doc-coauthoring`](../.claude/skills/)ユーザーフレンドリー化パスは**完了しプッシュ済み**: ハンドブック（全19ファイル）、マニュアル（全14章 + バンドルされた30個のチェッカープラグインすべてのプラグインごとのページ——「（ii）」分割: 公開マニュアルにコンシューマービュー、開発者／契約資料はスリム化された`plugins/<id>/README.md`に）、そして[`docs/types.md`](../types/)に対し、章のオリエンテーション + ミニ目次、コールドリード検証済みのアンカー、コード検証済みのドキュメント正確性修正の一括（`CHANGELOG.md` § `[0.1.16]`のFixedに記録）。それが表面化させた2件のプラグイン*コード*ギャップ（`rigor-dry-validation`のRBSオーバーレイ配線、`rigor-shoulda-matchers`の二重プレフィックスのルールID）は修正され、v0.1.16に入っている。移行の*手法*は将来のプラグイン追加のために[`docs/notes/20260603-plugin-doc-migration-playbook.md`](../notes/20260603-plugin-doc-migration-playbook/)に保存されている。

### ドキュメント — ユーザー向けドキュメントレビューバッテリー（キュー済み）

[`docs/manual/`](../manual/)と[`docs/handbook/`](../handbook/)に対する継続的な品質
ゲートで、chibirigor本に使われたマルチレンズレビューバッテリーから適応された
もの。設計ノート:
[`docs/notes/20260610-user-docs-review-battery-design.md`](../notes/20260610-user-docs-review-battery-design/)。

本のバッテリーとの主な違い: **これは本ではなくソフトウェアドキュメントである** ——
散文の深さは美徳ではなく、バッテリーの仕事は正確さと必要な明快さであり、
物語の豊かさではない。「読みのバランス」層は*反転している*（深さブースターではなく
肥大検出器）。最大の構造的追加は**機械的なL0層**である —— スニペットとCLIサーフェスに
関する判断は決定論的に検証可能なので、本のバッテリーが再現性レビュアーに委ねる仕事を
`spec/docs/`ハーネスが行う。

5つの層、順番に実行（マイルストーンでフルサイクル;個々の層はオンデマンドで）:

1. **L0機械 —— `spec/docs/`ハーネス（永続的なゲート、レンズではない）**。`make docs-check`として配線された3つのチェッカー:
   - **スニペット実行:**ハンドブック章から` ```ruby `ブロックを抽出し、
     `rigor check`経由で実行し、`assert_type` / `dump_type`の主張を実際の
     推論出力に対して検証する。chibirigorのスコアリングハーネスの直接の類似だが、
     対象は読者の再実装ではなくドキュメント自身である。
   - **CLI/設定ドリフト:** `docs/manual/02-cli-reference.md`のフラグ +
     サブコマンドをCLIオプションパーサーに対して、`03-configuration.md`の
     キーを設定スキーマに対して、`04-diagnostics.md` /
     `08-understanding-errors.md`のルールIDをルールレジストリに対して
     クロスリファレンスする。
   - **リンク整合性:**相対リンク + ADR番号参照が実際のターゲットに解決される。
   L0は`make verify`と並んでCIで走る;LLMバッテリーはL0がグリーンのときのみ走る。

2. **L1真 —— 意味的忠実性（LLMレンズ）**。機械的に検証できない主張:
   キャッシュ無効化条件、診断の発火条件、severityプロファイルのマッピング。
   ハンドブックの主張は[仕様コーパス](../type-specification/)に対してチェック
   （仕様が拘束）;マニュアルの主張は実装 + 実際のCLI挙動に対してチェック。
   レビュアーは`lib/rigor/`への読み取りアクセスを持ち、CLIを実行できる。
   型理論エキスパートレンズは`appendix-type-theory.md`とクロスチェッカー
   アペンディックスにのみ適用される。

3. **L2伝 —— 読者レンズ（LLMレンズ、並列）**。3つのサブレンズ:
   - **Rubyのみの読者** —— ハンドブックREADMEが述べる対象読者（静的型付けの
     背景を仮定しないRubyプログラマー）。chibirigorレンズ8からそのまま移植、
     「過度に単純化しない」制約を含む。
   - **手順再現** —— マニュアル章01と14（インストール + Railsクイックスタート）:
     読者はテキストだけから手順を完了できるか？ 実行モードレンズ。
   - **アペンディックス読者** —— 「Coming from X」アペンディックス: 変更された
     アペンディックスでサンプリングし、その言語背景を持つ読者が読む。
     フルサイクルでは9つすべて;ターゲットパスでは変更されたものだけ。

4. **L3簡 —— 肥大検出器（LLMレンズ、本のバッテリーから反転）**。薄い散文を
   フラグ**しない** —— それはL2の仕事。*太い*方向のみをフラグする:
   - マニュアル / ハンドブックの重複（READMEが宣言する分割が基準）。
   - 表または注釈付きコードブロックがより精確に表現できる散文。
   - ハンドブックの非ゴール違反: 「数時間で通読できる」を超えるコンテンツ、
     仕様コーパスに属するコンテンツ、プラグイン著作ガイダンス（`examples/`に属する）。

5. **L4整 —— 英語のコピーエディット + 規約遵守（LLMレンズ、常に最後）**。
   技術文章の品質（AIっぽい言い回し、受動態へのドリフト）、`interface` →
   *structural interface* / *RBS interface*の命名ルール（半機械化可能）、
   `docs/manual` ↔ `docs/handbook`のクロスリファレンス衛生。

**出力ノート:**レンズの所見はドキュメントディレクトリ自身ではなく
`docs/notes/YYYYMMDD-docs-review-<scope>.md`へ行く。

**保留中の作業、優先度順:**
1. L0ハーネスを`spec/docs/`として実装し、`make docs-check`をCIに配線する。
2. `.claude/skills/rigor-docs-review/SKILL.md`を著作する（L1〜L4のレンズ
   ペルソナ + 層ゲートプロトコルを固定）。
3. 最初のフルサイクルを実行する;L1はADR-51のCIフォーマットのフォロー
   スルーギャップを表面化させると予想される（`11-ci.md`はv0.1.16の
   コード検証パス後に書き直された）。

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（v0.1.4 → v0.1.6）:**

- **Tier 1**: [`rigor-rails-routes`](../manual/plugins/rigor-rails-routes/)（`:helper_table`）、[`rigor-rails-i18n`](../manual/plugins/rigor-rails-i18n/)、[`rigor-actionmailer`](../manual/plugins/rigor-actionmailer/)、[`rigor-activejob`](../manual/plugins/rigor-activejob/)。
- **Tier 2**: [`rigor-activerecord`](../manual/plugins/rigor-activerecord/)（`:model_index`;アソシエーション / enum / スコープ / バリデーション / コールバック）;[`rigor-actionpack`](../manual/plugins/rigor-actionpack/)（ルート / フィルタ / レンダー / ストロングパラメータ）;[`rigor-factorybot`](../manual/plugins/rigor-factorybot/)（フェーズ1 (a)+（c））。
- **Tier 3**: [`rigor-pundit`](../manual/plugins/rigor-pundit/)、[`rigor-sidekiq`](../manual/plugins/rigor-sidekiq/)、[`rigor-rspec`](../manual/plugins/rigor-rspec/)（Pillar 2スライス1+2+3）、[`rigor-actioncable`](../manual/plugins/rigor-actioncable/)、[`rigor-activestorage`](../manual/plugins/rigor-activestorage/)（v0.1.5）;[`rigor-graphql`](../manual/plugins/rigor-graphql/)（v0.1.6 — Tier 3D、スライス1+2a〜2d、4つのクロスプラグインファクト）;[`rigor-minitest`](../manual/plugins/rigor-minitest/)、[`rigor-rspec-rails`](../manual/plugins/rigor-rspec-rails/)、[`rigor-shoulda-matchers`](../manual/plugins/rigor-shoulda-matchers/)（v0.1.6）。
- **オプトインバンドル**: [`rigor-activesupport-core-ext`](../manual/plugins/rigor-activesupport-core-ext/)（オプトインRBSバンドル）;[`rigor-typescript-utility-types`](../manual/plugins/rigor-typescript-utility-types/)（ADR-13スライス6）。
- **メタgem**: [`rigor-rails`](../manual/plugins/rigor-rails/)（v0.1.6スキャフォールド;Tier 1+2の`add_dependency`宣言;`.rigor.yml`でのアクティベーションはプラグインごとのまま）。
- **ADR-16基板消費者（v0.1.5）**: [`rigor-sinatra`](../manual/plugins/rigor-sinatra/)（Tier A）、[`rigor-dry-struct`](../manual/plugins/rigor-dry-struct/)（Tier C;v0.2.0 ADR-18精度向上）、[`rigor-devise`](../manual/plugins/rigor-devise/)（Tier B）。
- **dry-rb基礎（v0.1.6）**: [`rigor-dry-types`](../manual/plugins/rigor-dry-types/)（`:dry_type_aliases` — 正準 + ネスト + ユーザー著作コンポジション + 推移的参照）;[`rigor-dry-schema`](../manual/plugins/rigor-dry-schema/)（`:dry_schema_table` — 認識 + `each`リストスロット）;[`rigor-dry-validation`](../manual/plugins/rigor-dry-validation/)（`:dry_validation_contracts` + `Contract#call → Result`のRBSオーバーレイ）。`rigor-dry-struct` v0.2.0はADR-18の`returns_from_arg:`経由で`:dry_type_aliases`を消費。

**Railsエコシステム以外（v0.1.9でランド済み）:**

- [`rigor-hanami`](../manual/plugins/rigor-hanami/) — Hanami::ActionのためのADR-28 provide-and-check。プロトコル: `app/actions/**/*.rb`内での`#handle(Hanami::Action::Request, Hanami::Action::Response) → void`。カスタムスレイアウトのための`action_path:`で設定可能。

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`スライス3+（リゾルバメソッド型チェック;ブラケット形を超える`<Type>.array` / `<Type>!`連鎖形;文字列形`field :foo, "User"`診断;`Schema.execute(...)`結果型付け）。
- `rigor-dry-schema`スライス2+（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2+3（`:dry_schema_table`消費経由のparamsブロック型付け + `json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。
- `rigor-actioncable` `#receive(data)`パラメータ型提供強化（上記のADR-28エコシステムエントリーを参照;需要駆動）。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`plugins/rigor-<id>/`にステージされ、**単一バンドル`rigortype` gemの中で出荷されます** — [ADR-31](../adr/31-contribution-and-supply-chain-policy/)で決着した配布モデル（単一gem、プラグインごとのgemspecはコミット`9769f5fa`で削除）。以前の`git subtree split` + プラグインごと公開の計画は**廃止された**;バンドルされたプラグインは個別にインストール可能なgemではなく、`git subtree merge`は実証済みの*サードパーティ*プラグインを取り込むためのADR-31 WD5の稀な予約済みオプションとしてのみ残り、rigor-railsの公開パスとしては残らない。`rigor-rails`メタgemスキャフォールド（v0.1.6）は、個別公開マニフェストではなく、アクティベーショングルーピングのテンプレートとして機能するようになった（その`add_dependency`宣言はTier 1+2アンブレラを文書化する）。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5でリリース。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。

[ADR-18](../adr/18-substrate-per-call-site-return-type/)（基板の呼び出しサイトごとの戻り値型DSL）はv0.1.6に向けて`master`に蓄積中。`Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（+ `lookup_via:`クロスプラグインファクトチャネル）を追加;`rigor-dry-struct` v0.2.0は最初の動作消費者（`rigor-dry-types`が公開する`:dry_type_aliases`経由で`attribute :city, Types::String`を`Nominal[String]`に解決）。スライス4（TraitRegistryパリティ） + 連鎖呼び出し引数抽出は需要駆動のまま。
