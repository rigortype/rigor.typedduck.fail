---
title: "Rigor Roadmap"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "427ecb3220c2161ab278de0206263ba036399a04b057b490a9fb7c2aa3f85e75"
sourceCommit: "86367f26f62593f19f649f7cb9c8e1a00a751282"
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
| v0.1.2 | 2026-05-09 | プラグイン例の戻り型移行、エンジン深化フォローアップ。`CHANGELOG.md` § `[0.1.2]`を参照。 |
| v0.1.4 | 2026-05-14 | ADR-10 / ADR-11 / ADR-13の延期キュー、ADR-14 `rigor sig-gen`エンドツーエンド、`Type::BoundMethod`キャリア（carrier）、18の動作プラグイン例。（v0.1.3のコミットメントエンベロープがカット前に追加のトラックを吸収し、v0.1.4として出荷。）`CHANGELOG.md` § `[0.1.4]`を参照。 |
| v0.1.5 | 2026-05-16 | ADR-15 Ractor移行エンドツーエンド（フェーズ1〜4c + 4b.x）、実世界Railsサーベイ（14プロジェクト、31,840ファイル）が本番改善を駆動（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識sigディスカバリー）、ADR-16マクロ / DSL展開基板（WD13フロアでO2をクローズ）、O4レイヤー3スライス1+2+3（`Gemfile.lock`パース + `rbs_collection.lock.yaml`認識 + 欠落gemの`:info`診断）、DEFAULT_LIBRARIESのstdlibカバレッジ拡張（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決、24の動作プラグイン例。`CHANGELOG.md` § `[0.1.5]`を参照。 |
| v0.1.6 | 2026-05-19 | ADR-12 / ADR-17 / ADR-18フロア + 動作消費者;エディタモードv1 + 言語サーバーv1/v2;ADR-20軽量HKT;エコシステムプラグイン + `rigor-rails`メタgemスキャフォールド。`CHANGELOG.md` § `[0.1.6]`を参照。 |
| v0.1.7 | 2026-05-20 | ADR-22ベースライン（baseline）メカニズム（スライス1+2） + プロジェクトオンボーディング基盤;サーベイ駆動のプラグイン / エンジン偽陽性修正;Pillar 2「あなたのspecが型である」スライス1+2+3。`CHANGELOG.md` § `[0.1.7]`を参照。 |
| v0.1.8 | 2026-05-21 | Mastodonサーベイ偽陽性削減: ADR-15フォークベースのワーカープール（アクティブな`workers > 0`バックエンド）、ADR-23 `rigor triage`診断トリアージサブコマンド、ADR-24暗黙的selfメソッド呼び出し解決。`CHANGELOG.md` § `[0.1.8]`を参照。 |
| v0.1.9 | 2026-05-23 | 指定の「最後のプレビューカット」: 外部ユーザーSKILLトリオ（`rigor-project-init`、`rigor-baseline-reduce`、[ADR-22 WD8](../adr/22-baseline-and-project-onboarding/)に基づく外部著者`rigor-plugin-author`バリアント）;ADR-22ベースラインスライス5（`rigor baseline regenerate` + `--baseline-strict` CIゲート）;v0.1.7 / v0.1.8サーベイデータによる実証的デフォルトの引き締め。`CHANGELOG.md` § `[0.1.9]`を参照。 |
| v0.1.10 | 2026-05-27 | `rigor mcp --transport stdio`（ADR-33、7つの読み取り専用ツール）;`rigor sig-gen --params=observed` attr_reader推論;`rigor coverage`精度ゲート;`rigor check --treat-all-as-inline-rbs`;`rigor-rbs-inline`プラグイン（ADR-32）;ブラウザプレイグラウンド（ADR-29スライス1〜4）;`rigor annotate`戻り型アノテーション;ADR-28パススコープのプロトコル契約 + `rigor-hanami`;定数畳み込み（Date/DateTime/Time、Math、String/Integer/Float中優先度、Hashシェイプ（shape）ハンドラ）;`return if @ivar.nil?` ivarガードナローイング修正。`CHANGELOG.md` § `[0.1.10]`を参照。 |
| v0.1.11 | 2026-05-27 | プラグインを`rigortype` gemにバンドル;ポータブルベースラインパス;`rigor-rails-routes`でkaigionrails conference-app + Mastodonトライアルに基づく5つの偽陽性ソースを解消（`new_` / `edit_`プレフィックス順序、匿名`get`ルート、`scope as:`プレフィックス + arity、`draw(:name)`部分的読み込み、`concern`ボディnoop、末尾オプションハッシュ +1 arityルール）;`rigor-rails-i18n`コントローラー内のレイジー翻訳キー;Railsクイックスタートマニュアル。`CHANGELOG.md` § `[0.1.11]`を参照。 |
| v0.1.12 | 2026-05-28 | Mastodon / Redmine / GitLab FOSSに対するOSSリアリズムサイクル: Mastodon`app + lib`エラー**789 → 6（−99.2%）**、Redmine**163 → 79（−51%）**、GitLab FOSS `app/{controllers,mailers,workers,services}`**〜670 → 〜140**。6つの`flow.always-truthy / always-falsey` FPパターンをクローズ（書き込み前読み取りnil、介在するメソッド呼び出し、retryエッジ、falsey-rvalue防御的初期化、極性認識ガード、ミューテーターの幅広げ）。新しいナローイングプリミティブ（`receiver[key] ||= default`、単一ホップメソッドチェーン`is_a?`）。`Class.new(Parent) { |c| ... }`と`Hash#each { |k, v| ... }`オートスプラット型付け。プラグインの包括的拡張: `rigor-rails-routes`がdevise_for / use_doorkeeper / mount / concern / with_options / member-collection-shorthand等を認識;`rigor-actionpack`のネストモジュール修飾付きフィルタ & レンダー;`rigor-activerecord`のマイグレーション除外 / バーチャルテーブルモデル / Postgres配列カラム / スコープボディ解決;`rigor-actionmailer`のinclude-of-concerns;`rigor-rails-i18n`のRails同梱キープレフィックス。新しい`rigor plugins`サブコマンド。`CHANGELOG.md` § `[0.1.12]`を参照。 |
| v0.1.13 | 2026-05-29 | AI支援のオンボーディング + 単一ファイルスクリプト解析: 新しい`rigor skill`サブコマンド（`mise use gem:rigortype`インストールから発見できるバンドル済みAgent Skills）;`call.unresolved-toplevel`診断（[ADR-34](../adr/34-toplevel-unresolved-self-call-default/)） + `pre_eval:`プロジェクトモンキーパッチ事前評価（[ADR-17](../adr/17-monkey-patch-pre-evaluation/)）。`CHANGELOG.md` § `[0.1.13]`を参照。 |
| v0.1.14 | 2026-05-29 | AIエージェント駆動のセットアップのための機械可読インストールガイド（`docs/install.md`、[ADR-27](../adr/27-tool-distribution-model/)）;`rbs collection install`後に環境を黙って壊していた`RBS::DuplicatedDeclarationError`を修正。`CHANGELOG.md` § `[0.1.14]`を参照。 |
| v0.1.15 | 2026-05-29 | リスコフのオーバーライド互換性診断ファミリー（`def.override-*`、[ADR-35](../adr/35-override-signature-compatibility/)）;`rigor plugin`ソースブラウジングコマンド;実際には未インストールのプロジェクトモンキーパッチや生成されたDSLである`undefined-method`診断に対する、より鋭い報告 + `rigor triage`認識器 + オンボーディングスキルのルーティング。`CHANGELOG.md` § `[0.1.15]`を参照。 |
| v0.1.16 | 2026-06-03 | プラグインアーキテクチャの全面的見直しと内部メカニズムの再ドキュメント化。ADR-37/38/39/40が完全に着地: バンドルの診断発行プラグイン14個すべてを`node_rule`（エンジン所有ウォーク、PHPStanスタイル）へ移行;`dynamic_return` / `type_specifier`のスライス（slice）2;`rigor plugins --capabilities` AI可読カタログ（スライス3）;`additional_initializers:`（ADR-38のdef形式）;`config_schema`の宣言デフォルト（ADR-40、13プラグインを移行）;`Source::Literals`グリッド完成 + 10プラグインを移行;実際の`ActiveSupport::Inflector`上の`Plugin::Inflector` + 選択可能な分離戦略（デフォルトは`process`、`Plugin::Isolation`）。ADR-43のRBS完全な祖先解決（`Plugin::Base`許可リスト） + `verify`とCIでの`make check-plugins`ゲート。プラグイン契約（contract）の構造的ガード: 適合スペック、全プラグインロードスペック、デモ実行スペック、外部プラグインフィクスチャ（v0.2.0ゲート1の実行可能なエビデンス）。`Plugin::Base` + `Manifest`のRBSサーフェス（surface）完成。RBSロバストネス: 不正・陳腐化したプロジェクトの`signature_paths:` sig向けの合成名前空間 + スタブ型。`rigor-activerecord`の欠落スキーマメモ化修正（Redmineメモリ−86%、ウォール時間−51%）。推論バジェットサーベイ + `RIGOR_BUDGET_TRACE`計装。`CHANGELOG.md` § `[0.1.16]`を参照。 |

## リリース戦略 — v0.2.0への道

`0.1.x`ラインは**プレビュー**ラインです。`0.2.x`ラインは**評価**ラインを開きます — まだフォーマル / GAリリースではないが、実プロダクトでの試験デプロイを意図した最初の公式発表バージョンです。

| ライン | 役割 |
| --- | --- |
| `0.1.x` | プレビュー。v0.1.9は当初の指定「最後のプレビューカット」だったが、Mastodon / Redmine / tdiary / GitLab FOSSに対するトライアル作業が、実質的な偽陽性削減・オンボーディング・機能・アーキテクチャの各サイクルを経てラインをv0.1.16まで延長した。v0.1.12はMastodon`app + lib`を6件の無関係なエラーで残した;v0.1.13〜v0.1.15はAI支援のオンボーディング + リスコフの`def.override-*`を追加;v0.1.16はプラグインのインターフェース分離 + エルゴノミクススイート（ADR-37/38/39/40/43）一式とv0.2.0ゲート1の実行可能なエビデンスを着地させた。v0.1.17（計画中）はv0.2.0カットの前に内部構造レビュー + パフォーマンスチューニングを完了させる。 |
| `v0.2.0` | **最初の評価リリース**。実プロダクトでの試験デプロイを意図した最初のバージョンとして公式に発表される;評価期間を開き、外部のフィードバックを募る。 |
| `0.2.x` | 評価ライン。まだフォーマルバージョンではないが、目標は**Ractor並行性トラックを除くすべての計画された機能**を高い完成度 / 本番品質に持っていくこと。 |

### v0.1.16以降の状況

v0.1.9の「最後のプレビューカット」の意図は達成済み（SKILLトリオ、ADR-22スライス5、実証的デフォルトの引き締めが出荷）し、ラインは追加のトライアル駆動・アーキテクチャ駆動のパッチカット7件（v0.1.10〜v0.1.16）を経て*延長*された。プレビューラインはv0.2.0に向けた強いRCポスチャーに今ある:

- 99.2%のMastodon FP削減が経験的に実証済み;Redmine 51%、GitLab FOSS〜80%（調査済みスコープ）;v0.1.16の`rigor-activerecord`メモ化修正後、Redmineのメモリフットプリントは−86%削減。
- 全3件のフローフォールディングG2フォローアップ（`retry`、介在する呼び出し、書き込み前読み取りnil）がクローズ済み（v0.1.12）。
- `rigor plugins`（有効化レディネス、v0.1.12）、`rigor plugin`（バンドルソースブラウジング、v0.1.15）、`rigor plugins --capabilities`（AI可読の拡張プロトコルカタログ、v0.1.16）サブコマンドが、プラグイン設定と発見のギャップをクローズする。
- オンボーディングはセルフサーブ: `rigor skill` + `docs/install.md`により、AIエージェントが単一のプロンプトからRigorをインストール・設定できる（v0.1.13 / v0.1.14）。
- `pre_eval:`メカニズム（ADR-17）、リスコフの`def.override-*`ファミリー（ADR-35）、プラグインのインターフェース分離 + エルゴノミクススイート（ADR-37/38/39/40/43）がすべて出荷され、v0.1.16までで主要な残りのADRキューをクローズした。
- **v0.2.0ゲート1の実行可能なエビデンスが着地**（v0.1.16）: 外部プラグインフィクスチャ + 適合スペック + 全プラグインロードスペック + デモ実行スペックが、パブリックなプラグイン契約がツリー外の`rigor-*` gemをサポートすることを証明する。残るステップは*文書化された安定性コミットメント*（ピン留めされた名前空間に対する「0.2.x内で壊さない」という言明）。

v0.2.0ゲートはその後**3つから1つに削減された**: SKILLトリオ（ゲート3）が出荷され、サブツリー分割／プラグインごとの公開ゲートは単一バンドル`rigortype` gem配布モデル（[ADR-31](../adr/31-contribution-and-supply-chain-policy/) + コミット`9769f5fa`）によって**置き換えられた**。残る唯一の実質的なゲートは、外部プラグイン契約の文書化された安定性コミットメントである。

**v0.1.17が進行中**で、v0.2.0カットの前のさらなる内部構造レビューとパフォーマンスチューニングのサイクルとなる。**パフォーマンス / キャッシュの半分は順調に進行中**（未リリース;`CHANGELOG.md` § `[Unreleased]`内）: ADR-44のディスパッチごと / ナローイングごとのアロケーションデチャーン + プラグイン寄与のデチャーン（`rigor check`はアロケーションバウンド —— Mastodonでアロケーション約−42%、GitLabで実時間約−14%）、ADR-45のrecord-and-validate未変更プロジェクト高速パス（未変更のGitLab実行で約42倍）、そして**ADR-46 — ボディ層COMPLETE**: `rigor check --incremental`がクロスプロセスのファイル単位インクリメンタル解析を出荷（Rigor自身の`lib`の未変更 / リーフ編集実行で約6〜9倍）、健全性は`--verify-incremental`でCIゲート —— 下記 §「パフォーマンス / スケーラビリティ — キャッシュ + インクリメンタル解析」と`docs/CURRENT_WORK.md`を参照。**残るv0.1.17ターゲット（需要駆動）:** ADR-46スライス3/4（構造層 + シンボル粒度）、ADR-24スライス4（解決済みのクローズドクラスselfコールに対するゲート付き`undefined-method` —— check-rulesルートは試みて差し戻し;評価時レコーダーが必要）、そしてさらなるエンジン内部の精度向上。**エンジン精度 + 型カバレッジ（このサイクルで着地）:** `Hash === <chain>`のcase等価性ナローイング、`Runner#run_source`（インメモリ埋め込み者API）、Tuple/Hash/Stringの値fold（value-folding）ギャップ解消（シェイプキャリアのfold層が包括的になった）。**エンジン精度（このサイクルで着地）:** [ADR-47](../adr/47-narrowing-driven-clause-reachability/) WD1 + WD2 + WD3a —— デッドな`case`/`when`と`case`/`in`（ベアクラス）節に対する`flow.unreachable-clause`診断、先行網羅対disjointメッセージ精度と防御的な`raise`/`fail`/`throw`ガードを除外するデッドな末尾`else`チェックを伴う（lenient/balancedで`:info`、strictで`:warning`を出荷;WD4の16コーパスFPスイープはゼロ件発火のため、balancedは`:info`のまま）;WD3bが残り、下記 §「型言語 / エンジン」を参照。

### v0.2.0 — 最初の評価リリース

実プロダクトでの試験デプロイを意図した最初の公式発表バージョン。v0.2.0は**評価**リリースであり、GA / フォーマルバージョンではない — 評価期間を開き、外部のフィードバックを募る。ゲート条件（このリリースが吸収するv0.1.xの「今日はスコープ外」リスト）:

- ADR-2プラグイン契約サーフェス（surface）が、このモノレポ外の外部`rigor-*` gem（[ADR-31](../adr/31-contribution-and-supply-chain-policy/) WD4に基づく`gem "rigortype"`に依存するサードパーティgem）をサポートできるほど安定化されており、外部著者向けのオンボーディングパスと、ツリー外プラグインがロードされ実行されるテストを伴う。**実行可能なエビデンスが着地**（v0.1.16）: 外部プラグインフィクスチャ、適合スペック、全プラグインロードスペック、デモ実行スペックがすべてCIにある。残るステップは文書化された安定性コミットメント — ピン留めされたプラグイン契約名前空間に対する「0.2.x内で壊さない」という言明（ドリフトスペックはすでにそれらをピン留めしている）。
- ~~subtree-split / RubyGems公開フローが少なくとも`rigor-rails`ファミリーに対して行使されている。~~ **置き換えられた**。配布モデルは**単一バンドル`rigortype` gem**に変わった——バンドルされたプラグインはすべてその中で出荷され（プラグインごとのgemspecは削除、コミット`9769f5fa`）、[ADR-31](../adr/31-contribution-and-supply-chain-policy/)はサブツリー分割をデフォルトパスから撤回した（WD5はサブツリー*マージ*を稀な予約済みオプションとしてのみ残し、計画フローとしては残さない）。したがって行使すべきプラグインごとの公開フローはない;公開される成果物は`rigortype`自身のみ（既にリリースサイクルに乗っている）。このゲートの残りは最初の項目に畳み込まれる: *外部*のサードパーティ`rigor-*`パス（`gem "rigortype"`に依存する作者自身のリポジトリ + gemspec）。
- SKILLトリオが出荷済み（v0.1.9）で、新参者がオンボーディングパスを持つ。

### v0.2.x — 高完成度の評価ライン

`0.2.x`シリーズ全体で、目標は計画された機能セットを高い完成度 / 本番品質に持っていくこと。下記§「将来のサイクル」の需要駆動バックログは、この計画の下では、オープンエンドのキューではなく**v0.2.x完成ターゲット**である — そこのすべての項目が`0.2.x`のスコープ内である、**Ractor並行性トラックを除いて**。

**Ractorは意図的に除外されている**。ADR-15のRactorワーカープールはRuby 4.0.x上で使用不可と判明した（Ruby Bug #22075に加え決定論的な`Ractor::IsolationError`）;v0.1.8のフォークベースのプールがアクティブなバックエンドだ。Ractorプールは`RIGOR_POOL_BACKEND=ractor`とADR-15 § OQ1の背後にパークされたまま;それを完成させることは`0.2.x`の目標では**ない**し、上流CRubyの修正を待つ。

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
- **Elixirに触発されたナローイング拡張（v1.20レビューノート § 4より） —— 着地済み（v0.1.17）**。[`…-elixir-v1.20-type-system-rigor-review.md`](../notes/20260604-elixir-v1.20-type-system-rigor-review/)からスピンオフした2つの制御フローナローイング追加:（a）§ 4-3 **Hashキー存在**（`is_map_key`アナローグ） —— `h.key?(:foo)` / `has_key?`ガード（リテラルキー）がオプショナルなhashシェイプキーをtrueブランチで「存在する」状態にリファインし、`h[:foo]`が`T | nil`ではなく`T`を読むようになる（`Narrowing#analyse_key_presence_predicate`;オプショナル性のnilは除去、値自身のnilは保持;falseブランチはno-op）;（b）§ 4-4 **Array非空**（`tuple_size`アナローグ） —— 素の`arr.empty?`（falseエッジ） / `any?`（trueエッジ） / `none?`（falseエッジ）が`Array[T]` → `non-empty-array[T]`にリファインし、`arr.size`/`length`/`count`が`positive-int`を読むようになる（`Narrowing#analyse_array_emptiness_predicate`、既存の`non-empty-array`リファインメント + 空除去射影を再利用）。いずれも具体的なシェイプのみを絞り込み（`Dynamic`では発火しない）、FP安全（ナローイングのみ、新しい診断なし）であり、`dump.type`ラウンドトリップで検証済み。**残り（需要駆動）:** § 4-3のfalseブランチキー*不在*ファクト（Elixirの`foo: not_set()`）;§ 4-4の上限長さ追跡（`tuple_size(x) < 3`、長さ範囲キャリアが必要）;§ 4-5のガード後`Dynamic`→`C`強化はFPリスクありと評価（ガードされたボディのundefined-method対<ruby>漸進的保証<rp>（</rp><rt>gradual guarantee</rt><rp>）</rp></ruby>）して**採用しない**。
- **O2 — マクロテンプレート / heredoc-Ruby展開（ADR-16）**。需要駆動の残り項目: **スライス5b**（Tier Dエンジン統合 — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド）と合成メソッドティア向けの**完全なADR-13リゾルバチェイン配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名をリゾルバチェイン経由でルーティング）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **軽量HKT（ADR-20）**。コアキャリア + パーサ + 条件文法 + 主要な`METHOD_RETURN_OVERRIDES`（`JSON.parse`、`YAML`、`Psych`、`CSV`）はすべて着地;ハンドブック第12章も出荷済み。残り（需要駆動）: スライス4（`dry-monads`の`Result[T, E]` / `Maybe[T]`、ADR-3修正が必要）、スライス5（糖衣構文`type`エイリアス）、`rigor-lisp-eval`でのパターンバインディング抽出、追加の`METHOD_RETURN_OVERRIDES`。[ADR-20](../adr/20-lightweight-hkt/)を参照。
- **`rigor:v1:conforms-to`ディレクティブ**。元々v0.1.1の「スコープ外」にキューされていた;まだオープン。メソッドパラメータが名前付き構造インターフェースを満たす任意の値を受け付けられるようにする。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価（ADR-17）**。`pre_eval:`設定はライブ。残りの需要駆動フォローアップ: スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）。
- **オーバーライドシグネチャ互換性（ADR-35） — スライス1〜4ランディング済み**。著作されたクラス/モジュール階層をまたいでリスコフのシグネチャ規則を強制する`def.override-*`ルールファミリー: `def.override-visibility-reduced`（可視性public → protected/private）、`def.override-return-widened`（戻り値の共変性）、`def.override-param-narrowed`（パラメータの反変性）。それぞれは証明可能（`:no`）な違反でのみ発火し、両側著作のシグネチャにゲートされ（可視性ルールは両側*観測可能* — 可視性はRBSとは独立にソースで表現される）、`severity_profile:`を通じてマップされる（`lenient → off`、`balanced → :warning`、`strict → :error`;加算的で、lenientプロジェクトは影響を受けない）。スライス4（Mastodonコーパスの偽陽性検証）はクロスファイル可視性の偽陽性クラスタを発見・修正し（160 → 35;残余は`strict`の下でのみ顕在化する真の縮小）、保守的なマッピングを維持した — 書き起こしは[`docs/notes/20260529-adr35-mastodon-fp-verification.md`](../notes/20260529-adr35-mastodon-fp-verification/)。**残り（需要駆動、実装時期未定）:** **スライス5**（親が著作 + 子が*推論*の共変性 — 子の推論された戻り値を著作された親の戻り値に対してチェック;より価値が高く、より偽陽性が高い、推論された戻り値の精度にゲートされる）; WD9の段階1のジェネリックインスタンス化を認識する比較（*精度*の向上であって偽陽性安全性の要件ではない — 未束縛ジェネリックはすでに`Dynamic[Top]`へ退化する）;型ルールのためのRBSのみの祖先へのリーチ;そしてシングルトン（`def self.`）メソッドのカバレッジ。[ADR-35](../adr/35-override-signature-compatibility/)を参照。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。（注: クロスプラグインファクト（fact）経由の呼び出しサイトごとの戻り型ルックアップはv0.1.6で[ADR-18](../adr/18-substrate-per-call-site-return-type/)を介して出荷;上記のADR-13配線は直交する「パラメータ化形パーサ」拡張。）
- **Struct / Data値fold**。[`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)（2026-05-23）の監査、type-coverage-upliftラインのPhase 5成果物。精密な`Struct` / `Data`メンバーアクセスfold（`Point = Struct.new(:x, :y); Point.new(1, 2).x` → `Constant[1]`）はディスパッチティアのエントリーでは到達不能 — **新しいキャリアが2つ**必要: 順序付きメンバー名リスト（+ `keyword_init:`フラグ）でパラメータ化されたstruct-classキャリアと、`HashShape`の形をしたクラスタグ付きstruct-instanceキャリア。加えて`Struct.new`クラスボディブロックの劣化契約、位置指定vs `keyword_init:` struct、struct継承。ADR相当;不変な`Data.define`きょうだいがおそらくより良い最初のターゲット（凍結インスタンスが健全性（soundness）ストーリーを単純化する）。**リリース未確定**。`Encoding`値foldは同じ監査で*恒久的除外*として記録 — `Constant[Encoding]`キャリアがfoldできるのはごく小さなサーフェス（`.name` / `.dummy?`）のみ、実際のプログラムは`Encoding`を不透明タグとして使い、キャリア増加のコストは見合わない;`Nominal[Encoding]`が答えのまま。
- **カバレッジ認識の診断姿勢（将来のコンセプト — まだ設計されていない）**。アイデア: spec / テストカバレッジによって診断の*姿勢*を変調する — コードがテストで実行される箇所では楽観的に解析し、そうでない箇所では保守的なまま（または注意をエスカレートする）。これは[`overview.md`](../type-specification/overview/) §「偽陽性の規律」の価値（実行され、テストでカバーされたプログラムはそれ自身の正確性の証拠である）を、「動作している」ことを機械可読かつ*局所的*にすることで運用化する: カバレッジマップが、推論後の診断重要度を変調する新しいファクトソースになり、WD6パイプラインの`severity_profile`の近くに位置する — 型推論自体は変わらない。柱2（spec → 型ファクト）とは別物;これはカバレッジ → 信頼度だ。**これが設計可能になる前に解決すべき懸念:**（1）*カバレッジ ≠ 正確性* — 「実行された」は「型に関連するエッジケースが実行されアサートされた」ではないので、カバーされたコードに対する楽観的な姿勢は、テストが実行するがアサートしない実バグを抑制しうる;行カバレッジは特に弱く、分岐カバレッジはより良いが依然部分的だ。（2）2つの半分は**リスクが非対称**だ — 「未カバー → エスカレート」は再優先順位付けするだけで何も抑制しない（安全、純粋にアップサイドのみ）一方、「カバー済み → 抑制」は誤った安心のリスクを持つ;最初のスライスはおそらく未カバーの半分のみであるべき。（3）カバレッジアーティファクト（SimpleCovの`.resultset.json` / `Coverage` stdlibモジュール）はprovenance + 陳腐化処理を必要とする外部ファクトソースであり、不在または陳腐化時にフェイルソフトする。（4）[ADR-22](../adr/22-baseline-and-project-onboarding/)ベースラインとの可能なシナジー — カバレッジはどのベースラインバケットが「未テスト、ゆえに最初にレビューに値する」かをランク付けできる。ADRなし、スライスなし、コミット済みマイルストーンなし — 方向性としてここに記録。

### プラグイン / エコシステム

ガバナンス: [ADR-31](../adr/31-contribution-and-supply-chain-policy/)はプロジェクト全体の貢献・サプライチェーンポリシーである。**変更の大きさ**で貢献を整理する: 軽微で焦点の絞られた変更（バグ修正、ドキュメント改善、タイポ修正、スコープ化されたリファクタ、テスト、既存バンドルプラグインのバグ修正）は任意のパスへの直接PRとして歓迎される;広範な変更（アーキテクチャ的書き換え、コードスタイル一括変更、新規アナライザー機能、新規バンドルプラグイン、ADR / 仕様の撤回）はチームが著作した実装に`Co-authored-by:`属性を付けたうえで、issue先行の提案を経る。WD2〜WD5のプラグイン固有の想定パス:（1）`gem "rigortype"`に依存する著者自身のリポジトリ内の**サードパーティ`rigor-<gem>` gem**（ADR-31 WD4 — [MPL §3.3](../LICENSE)下のLarger Work、完全サポート、デフォルトの想定）;（2）ラップ対象gemがコミュニティ認知に達したときの`Co-authored-by:`属性付き**issue経由のバンドル化昇格**（ADR-31 WD2、判断基準はWD3に従って意図的に曖昧）;エンジン / 仕様 / リファクタの提案はWD3の採用エビデンス要件を除き、同じWD2のissue駆動の形に従う。実績あるサードパーティプラグインのsubtreeマージはオプションのパスとして留保される（ADR-31 WD5） — サードパーティ著者が前提とすべきパスではない。

- **`rigor-graphql`** — 将来のスライス（需要駆動）: リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け。
- **dry-rbアダプタプラグイン（[ADR-12](../adr/12-dry-rb-packaging/)）**。**残り**: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断;需要駆動）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json { ... }`パリティ）;`rigor-dry-monads`（依然`Result[T, E]` / `Maybe[T]`キャリア決定が必要 — スライシング計画を参照）。基礎サーベイは[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)。
- **ADR-10 — gemソースからの呼び出しごとの戻り型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り型を推論すること（`mode: :full`が`Dynamic[Top]`より豊富に貢献できるように）は、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **プラグイン提供のRBSシグネチャ**。[ADR-25](../adr/25-plugin-contributed-rbs/)が提案された（2026-05-21）: オプションの`signature_paths:` `Manifest`フィールドにより、プラグインgemがRBSディレクトリを貢献でき、`Plugin::Loader`によって解決されRBS環境にマージされる。今日RBSのみのバンドルgem（`rigor-activesupport-core-ext`）を非ポータブルな`signature_paths:`パス経由で手配線することを強いるギャップをクローズする。3スライス（マニフェストフィールド + ローダー解決 + 環境マージ → `rigor-activesupport-core-ext`を些細なプラグインに変換 → `rigor-project-init` SKILLのフォロースルー）;pre-1.0プラグイン契約に加法的、v0.1.x内で安全。コンパニオンフォローアップ（別個、より小さい）: `Environment::BundleSigDiscovery`の自動検出を`vendor/bundle` / `.bundle/config`レイアウトを超えてデフォルトの`bundle install` gemパスに拡張する。
- **ADR-28パススコープのプロトコル契約 — オープンエコシステム項目**。`rigor-actioncable`の`#receive(data)`パラメータ型提供: `method_name: :receive, param_types: [{index: 0, type_name: "Hash"}]`の契約により、すべてのチャネルのreceiveボディ内で`data`が`Hash`として型付けされる。需要駆動。
- **インラインRBSコメント取り込み（[ADR-32](../adr/32-rbs-inline-comment-ingestion/)）— 着地済み**。3スライスすべてとWD10 CLIキャリーオーバーがv0.1.xサイクルで出荷: スライス1（エンジンフック + バンドル`rigor-rbs-inline`プラグイン） + スライス2（`（コンテンツSHA、プラグインID + バージョン + config_hash）`をキーとするファイルごとキャッシュ + envキャッシュ無効化 + 新しい`Plugin::SourceRbsSynthesisReporter`経由の`source-rbs-synthesis-failed`インフォ診断） + スライス3（プラグインREADME + ハンドブック第7章 §「RubyソースへのインラインRBS」） + 単一ファイルアドホックCI用途向け`rigor check --treat-all-as-inline-rbs` CLIフラグ。WD9のトップレベル`def`キャビアットはrbs-inline 0.14.0に対して確認済み（裸のトップレベルdefへの出力なし;エンゲージするにはクラスラップが必要）。残りの需要駆動フォローアップ: 新しい`source_rbs_synthesizer:`フックを取り巻くLSPインクリメンタルフロー統合（ADR-19 LSPロードマップ下にキュー済み）。公開APIドリフトサーフェスの全リストは`CHANGELOG.md` § `[Unreleased]`を参照。
- **`rigor-ffi`プラグインファミリー（[ADR-30](../adr/30-rigor-ffi-plugin-shape/)）**。コアの`rigor-ffi`は`ffi` gemの共通機構（`extend FFI::Library`、`attach_function`、`callback`、`typedef`、`enum`、`bitmask`、`FFI::Struct`/`Union`/`AutoPointer`/`MemoryPointer`/`Pointer`/`Function`/`Buffer`）をカバーし、tenderloveの`ffx` gemが同じDSLの厳密なサブセットを出荷しているため、ffx対象プロジェクトも追加コストなしでサポートする — さらにgemインストール時にffxが拒否する宣言を表面化する新しい`ffx.unsupported-*`診断ファミリーも提供する。ライブラリごとのサブプラグイン（`rigor-rbnacl`、`rigor-ethon`、`rigor-ffi-rzmq`、`rigor-sassc`）はDSL認識器、オプションカタログ → セッター生成、高レベルAPIのRBSリファインメント（refinement、篩型とも）を貢献する。WD9: 実装は直接の需要よりも非ユーザーオーバーヘッドゼロ（サブプラグインは解決済み依存マッチ時のみアクティブ化）によって正当化される — 想定された4つの消費者すべてで需要は弱い（sassc-rubyはEOL、typhoeus/ethonとrbnaclは特化型、ffi-rzmqはニッチ）。WD10:「バニラ」FFI gem（リテラルな`attach_function` + 薄いRubyラッパークラス）にはコアで十分であり、プラグインは不要 — 依存を宣言するだけでよい。新しいSKILL [`.claude/skills/rigor-ffi-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-ffi-plugin-author/SKILL.md)は著者を最初にカバレッジ評価へ案内し（コアで十分なときは*著者を著作から思いとどまらせる*ように設計）、残るケースをプロジェクト全体の[ADR-31](../adr/31-contribution-and-supply-chain-policy/)貢献ポリシーへルーティングする。FFI固有の追加: プラグインのgemspecでラップ対象gemのバージョン範囲をピン留めする（孤立プラグインリスクはADR-31 WD4に従いプラグイン著者の責任）。スケッチされた6スライス: コアMVP → `rigor-sassc`（経験構築） → `rigor-ethon` → `rigor-rbnacl` + `Plugin::FFI::BindingRecognizer`拡張ポイント → ffx対象検出 + 診断 → `rigor-ffi-rzmq`（ADR-10呼び出しごとの戻り型精度にゲート）。基礎サーベイ: [`docs/notes/20260525-ffi-library-survey.md`](../notes/20260525-ffi-library-survey/)。姉妹の`rigor-fiddle`プラグイン（FiddleのDSLは別個の著作を必要とするほど分岐している）はADR-30のスコープ外と明示される。スライスはスケジュールされていない。

### エディタ / IDE統合
- **LSP — 並列マルチバッファpublishのためのRactorプール**。LSP設計ドキュメントのスライス8は2つの関心事を列挙した: デバウンス（着地）AND Ractorプール統合。プール部分は需要駆動のまま — ワーカーをLSP `initialize`で1度事前ウォームしpublish全体で再利用できるよう、`Analysis::Runner`が事前ビルドされた永続的`Environment`を受け入れるリファクタが必要。ProjectContext（スライス7）はすでに読み取り専用`Cache::Store`経由でpublish + hoverにウォームEnvironmentの勝利を与える;ディスパッチ側並列性（コア全体のマルチバッファpublish）が残りのレバー。需要駆動。
- **LSP — `textDocument/definition`**（設計ドキュメントのスライス9、先送り）。`FILE:LINE`でキー化された`Reflection`側のシンボルインデックスが必要。需要駆動。
- **LSP — インクリメンタル`didChange`同期**（設計ドキュメントのスライス10、先送り）。現在、サーバーは`TextDocumentSyncKind::Full = 1`をアドバタイズするため、各キーストロークがバッファ全体を再送信する。インクリメンタル（`TextDocumentSyncKind::Incremental = 2`）はUTF-16オフセット帳簿 + 編集ごとの適用が必要。帯域幅はローカルstdioなのでコストはワイヤではなくパースにある;需要駆動。
- **LSP — まだキューされた拡張機能**（v2以降 + フォローアップ後 + ポリッシュ後）: `textDocument/codeAction`、`textDocument/rename`、`textDocument/semanticTokens`、`textDocument/inlayHint`、`textDocument/definition`（LSP v1設計のスライス9 — Reflectionシンボルインデックスが必要）、インクリメンタル`didChange`同期（LSP v1設計のスライス10 — UTF-16オフセット帳簿）、並列マルチバッファpublishのためのRactorプールディスパッチ（LSP v1設計のスライス8後半 — Runnerリファクタ）、マルチルートワークスペース、TCP / Unixソケット輸送、スニペット展開、素の名前（暗黙のself）補完、シンボル補完、シグネチャ内ハイライトのための`ParameterInformation`オフセットタプルラベル、`completionItem/resolve`遅延ペイロード、プラグイン側の補完貢献。
- **エディタモードオプションB — ファイルごとの診断キャッシュ**。今日のエディタモードはオプションA（単一ファイルスコープ）を出荷: バッファのみがファイルごとの診断を生成する。オプションB（PHPStan形: プロジェクト全体の解析と1つの代入されたファイル、「編集ファイル + ディペンデントのみ再解析」）にアップグレードするには、`（ファイルダイジェスト、プロジェクトEnvironmentダイジェスト）`でキー化されたファイルごとの診断キャッシュが必要 —— **これはまさにADR-46インクリメンタルトラック**（`dependents`インデックス + ファイルごとのキャッシュ + `--verify-incremental`）であり、ADR-46スライス2が着地すればオプションBはそのエディタ側の消費者となる。ADR-45の`Cache::Store#fetch_or_validate`がrecord-and-validateのプリミティブ;ADR-17スライス3bのファイルごとのキャッシュディスクリプタはより古いレバー。設計: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「スコープの選択」。需要駆動。
- **CLIエディタモード — ディスクバック`ProjectScan`スナップショットキャッシュ**。実装パスは[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)に文書化。`rigor check --tmp-file=X --instead-of=Y`シェルアウトパスをターゲット: プロジェクトのプレパス出力（スキャナ + dep-sourceインデックス + プラグイン公開ファクト）を`.rigor/cache/`に永続化し、`(config + plugin manifest + project file mtime+size + pre_eval mtime+size)`でキー化することで、ウォームCLI呼び出しがプレパスをスキップできるようにする。期待される勝利: CLI呼び出しあたり-200 ms（小プロジェクト）から>-1.3秒（基板プラグインを持つ大規模モノレポ）。新しい不変条件: `Plugin::FactStore`スナップショットAPI、プラグインファクトのMarshalフレンドリーさ。5フェーズ（Marshal可能なscan / キー導出 / キャッシュプロデューサー / Runner統合 / FactStoreスナップショットAPI）。需要駆動;LSPパスはすでにエディタケースのほとんどをpublishあたり≤5 msでカバーしているので、このスライスは具体的なCLIシェルアウトのエディタ拡張が約1秒の壁をUX問題として報告したときに着手される。
- **エディタモード — プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ**。LSPパスで**着地**（v0.1.6、CHANGELOG `[Unreleased]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan`ビルダー + `Runner.new(prebuilt:)`採用パス;LSPの`ProjectContext`がスナップショットを遅延ビルドし、`invalidate!`でドロップする。CLIエディタモード（`rigor check --tmp-file`）はまだスナップショットを消費**しない**、各呼び出しが新鮮なプロセスのため — `（plugin-manifestダイジェスト、プロジェクトファイルmtime + サイズリスト）`でキー化されたディスクバックのスナップショットキャッシュが、ワンショットCLI呼び出しもプレパスをスキップできるようにする。需要駆動;LSP側の勝利が典型的なエディタ消費者。
- **エディタモード — `--also=path,path`呼び出し元宣言のディペンデント**。エディタ拡張は現在、ディペンデントを更新するためにN個の単一ファイル呼び出しを発行する必要がある。`--also`付きの単一の呼び出しがそれらをバッチする。些細なCLI拡張;設計ノートは`docs/design/20260516-editor-mode.md`。需要駆動。
- **マルチバッファエディタモード**（`--buffer A=B --buffer C=D`）。LSP v1がほとんどのユースケースでこれを置き換える（LSP `BufferTable`はすでにNバッファを保持する）;非LSPバッチツーリングには引き続き関連。需要駆動。

### パフォーマンス / スケーラビリティ — キャッシュ + インクリメンタル解析（ADR-44 / 45 / 46、v0.1.17進行中）

未リリースのv0.1.17パフォーマンスサイクル。出荷済みの詳細は`CHANGELOG.md` § `[Unreleased]`にある;エンジン内部の再開用詳細は`docs/CURRENT_WORK.md` §「パフォーマンス / キャッシュ / インクリメンタル」にある。

- **[ADR-44](../adr/44-dispatch-allocation-churn/) — ディスパッチごと / ナローイングごとのアロケーションチャーン（着地済み）**。`rigor check`はアロケーションバウンド（プロファイル: [`docs/notes/20260604-mastodon-allocation-profile.md`](../notes/20260604-mastodon-allocation-profile/)、[`…-gitlab-plugin-contribution-allocation.md`](../notes/20260604-gitlab-plugin-contribution-allocation/)）。ボディスコープの`with_*`チェーン畳み込み + アロケーション衛生。ミュータブルなプール化`Scope` / `CallContext`は却下（再入性 → FP）;`ProjectScope`再グループ化は格下げ（オブジェクトシェイプベンチマーク: サイズを削るが個数は削らない）。**残り（需要ゲート付き）:**ヒープ圧迫のケースが現れた場合の`ProjectScope`メモリフットプリント再グループ化;シンボルレベルの`CallContext`特殊化。
- **[ADR-45](../adr/45-unchanged-project-fast-path/) — 未変更プロジェクトの高速パス（着地済み）**。record-and-validate全体実行診断キャッシュ。粗い: 解析対象ファイルが変更されれば全体を再実行。**CIの注意点:**コード変更時、キャッシュは約113秒のGitLab実行で<1秒しか節約しない（計測済み）ため、CIで`.rigor/cache`を永続化するのはほぼ無意味;勝利はローカル開発 / エディタ / 同一SHA再実行。CIのレバーはADR-46。
- **[ADR-46](../adr/46-incremental-dependency-graph/) — ファイル横断の依存グラフによるインクリメンタル解析（ボディ層COMPLETE、着地済み）**。`rigor check --incremental`は`ΔF ∪ dependents[ΔF]`のみを再解析し、残りをフィンガープリント付きクロスプロセスディスクスナップショットから提供する;ファイル単位の依存を`Scope`アクセサのチョークポイントで記録 → `dependents`インデックス;健全性は`--verify-incremental`（`make check-incremental`、全体実行に対してバイト単位同一）でCIゲート。未変更 / リーフ編集実行で約6〜9倍を計測。**残り（需要駆動）:**スライス3（構造層ネガティブ依存追跡 —— 構造的編集は現在フィンガープリント経由でフルリビルド） + スライス4（シンボル粒度: `(file, symbol)`依存）。構成要素: `Analysis::{DependencyRecorder,Incremental,IncrementalSession}`、`Cache::IncrementalSnapshot`。ADR §「Staging」 + `docs/CURRENT_WORK.md` §「次セッションのエントリーポイント」を参照。

### パフォーマンス / スケーラビリティ — その他のレバー
- **O4レイヤー3 — `Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング**。v0.1.5の`BundleSigDiscovery` MVPの上に座る。MVPの自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）はバージョン管理された解決テーブルになる;rigorは`Bundler::LockfileParser`出力を消費 + `ruby/gem_rbs_collection`で最適マッチバージョンをクエリする。O7の失敗メモでアンブロック（競合は今ハングするのではなく警告する）。
- **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリー;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。
- **Spec-suiteランタイムブレークダウン（2026-05-17調査;部分的に着地）**。`make verify`デフォルトが並列rspec（コミット`086e507`）に切り替わった: wall時間217秒 → 60秒（12コアで3.6×）。フォローオンサイクルが実際のボトルネックは**各`analyze(sig: …)`での呼び出しごとのRBS env再構築**であることを確認した: `Cache::Store`は`RbsDescriptor::FileEntry`ごとに`(path, sha256)`でenvをキーするため、各呼び出しの一意の`Dir.mktmpdir`ルートのsigパスが新鮮な約1.8秒のenv構築を強制した。**ヘルパー側の修正が着地**（`spec/support/runner_helpers.rb`）: コンテンツキー化sigディレクトリ + ソースのみの呼び出しに対する共有ワークスペース。`runner_spec.rb` 39.6秒 → **25.4秒孤立（-36%）**、`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。元々キューされた2つのレバーは小さな残りのヘッドルームでオープンのまま:
  - **(a) `runner_spec.rb`の例間で`Environment`を共有**、`before(:context)`または`let_it_be`形のヘルパー経由で。キャッシュキー修正が呼び出しごとのコストのsig関連コンポーネントをクリアしたので、残りの勝利はソースのみの高速パスを打つ約80%の例に対するEnvironment構築自体。例ごとのプラグイン変動は依然共有を複雑化する。需要駆動;ヘルパー側の修正がすでにほとんどのヘッドルームを吸収した。
  - **（b）インメモリ`Analysis::Runner.run_source(source:, path:)`エントリーポイント —— 着地済み（v0.1.17）**。RubyのStringをメモリ内で解析（tmpdir / chdirなし）、`parse_source` + `accept_as_ruby_file?`が従う`@in_memory_sources`マップ経由;素の`analyze(source)`specヘルパーがこれを経由し、スイート全体で等価性を検証する。**パフォーマンスに関するメモ:**仮定していた約5% spec-suite改善は実現しなかった（共有ワークスペースのパスはすでに最適化済み）;真の価値はクリーンな埋め込み者（LSP / エディタ）のパブリックAPIにある。
- ~~**インメモリ`Analysis::Runner.run_source`エントリーポイント（パブリック + テスト専用）**。~~ 着地済み —— 上記（b）を参照。

### Sig-gen（ADR-14）
- **`--params=observed` attr_reader / attr_writer / attr_accessorの`initialize`観測からの推論 — 着地済み**（コミット`f2aa8de`、v0.1.9サイクル）。`rigor sig-gen --params=observed --write`は、`def initialize`の`@ivar = param`代入経由で観測された呼び出しサイト引数型を`attr_reader` / `attr_accessor`メソッドに伝播するようになり、`:untyped_return`としてスキップされる代わりに具体的なユニオン（union、合併型とも）戻り型を受け取る。実装: `build_observed_ivar_map` → `collect_init_ivar_obs` → `ivar_obs_from_initialize`（+ `build_ivar_obs_type_map` / `collect_param_obs_types`）。新しいロジックはすべて`Generator`に留まり`ScopeIndexer`には触れない。TypeProfコンパチビリティスペック追加（`spec/rigor/sig_gen/typeprof_compat_spec.rb`）。
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

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（v0.1.4 → v0.1.6）:**

- **Tier 1**: [`rigor-rails-routes`](../plugins/rigor-rails-routes/)（`:helper_table`）、[`rigor-rails-i18n`](../plugins/rigor-rails-i18n/)、[`rigor-actionmailer`](../plugins/rigor-actionmailer/)、[`rigor-activejob`](../plugins/rigor-activejob/)。
- **Tier 2**: [`rigor-activerecord`](../plugins/rigor-activerecord/)（`:model_index`;アソシエーション / enum / スコープ / バリデーション / コールバック）;[`rigor-actionpack`](../plugins/rigor-actionpack/)（ルート / フィルタ / レンダー / ストロングパラメータ）;[`rigor-factorybot`](../plugins/rigor-factorybot/)（フェーズ1 (a)+（c））。
- **Tier 3**: [`rigor-pundit`](../plugins/rigor-pundit/)、[`rigor-sidekiq`](../plugins/rigor-sidekiq/)、[`rigor-rspec`](../plugins/rigor-rspec/)（Pillar 2スライス1+2+3）、[`rigor-actioncable`](../plugins/rigor-actioncable/)、[`rigor-activestorage`](../plugins/rigor-activestorage/)（v0.1.5）;[`rigor-graphql`](../plugins/rigor-graphql/)（v0.1.6 — Tier 3D、スライス1+2a〜2d、4つのクロスプラグインファクト）;[`rigor-minitest`](../plugins/rigor-minitest/)、[`rigor-rspec-rails`](../plugins/rigor-rspec-rails/)、[`rigor-shoulda-matchers`](../plugins/rigor-shoulda-matchers/)（v0.1.6）。
- **オプトインバンドル**: [`rigor-activesupport-core-ext`](../plugins/rigor-activesupport-core-ext/)（オプトインRBSバンドル）;[`rigor-typescript-utility-types`](../plugins/rigor-typescript-utility-types/)（ADR-13スライス6）。
- **メタgem**: [`rigor-rails`](../plugins/rigor-rails/)（v0.1.6スキャフォールド;Tier 1+2の`add_dependency`宣言;`.rigor.yml`でのアクティベーションはプラグインごとのまま）。
- **ADR-16基板消費者（v0.1.5）**: [`rigor-sinatra`](../plugins/rigor-sinatra/)（Tier A）、[`rigor-dry-struct`](../plugins/rigor-dry-struct/)（Tier C;v0.2.0 ADR-18精度向上）、[`rigor-devise`](../plugins/rigor-devise/)（Tier B）。
- **dry-rb基礎（v0.1.6）**: [`rigor-dry-types`](../plugins/rigor-dry-types/)（`:dry_type_aliases` — 正準 + ネスト + ユーザー著作コンポジション + 推移的参照）;[`rigor-dry-schema`](../plugins/rigor-dry-schema/)（`:dry_schema_table` — 認識 + `each`リストスロット）;[`rigor-dry-validation`](../plugins/rigor-dry-validation/)（`:dry_validation_contracts` + `Contract#call → Result`のRBSオーバーレイ）。`rigor-dry-struct` v0.2.0はADR-18の`returns_from_arg:`経由で`:dry_type_aliases`を消費。

**Railsエコシステム以外（v0.1.9でランド済み）:**

- [`rigor-hanami`](../plugins/rigor-hanami/) — Hanami::ActionのためのADR-28 provide-and-check。プロトコル: `app/actions/**/*.rb`内での`#handle(Hanami::Action::Request, Hanami::Action::Response) → void`。カスタムスレイアウトのための`action_path:`で設定可能。

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`スライス3+（リゾルバメソッド型チェック;ブラケット形を超える`<Type>.array` / `<Type>!`連鎖形;文字列形`field :foo, "User"`診断;`Schema.execute(...)`結果型付け）。
- `rigor-dry-schema`スライス2+（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2+3（`:dry_schema_table`消費経由のparamsブロック型付け + `json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。
- `rigor-actioncable` `#receive(data)`パラメータ型提供強化（上記のADR-28エコシステムエントリーを参照;需要駆動）。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`plugins/rigor-<id>/`にステージされ、**単一バンドル`rigortype` gemの中で出荷されます** — [ADR-31](../adr/31-contribution-and-supply-chain-policy/)で決着した配布モデル（単一gem、プラグインごとのgemspecはコミット`9769f5fa`で削除）。以前の`git subtree split` + プラグインごと公開の計画は**廃止された**;バンドルされたプラグインは個別にインストール可能なgemではなく、`git subtree merge`は実証済みの*サードパーティ*プラグインを取り込むためのADR-31 WD5の稀な予約済みオプションとしてのみ残り、rigor-railsの公開パスとしては残らない。`rigor-rails`メタgemスキャフォールド（v0.1.6）は、個別公開マニフェストではなく、アクティベーショングルーピングのテンプレートとして機能するようになった（その`add_dependency`宣言はTier 1+2アンブレラを文書化する）。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5でリリース。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。

[ADR-18](../adr/18-substrate-per-call-site-return-type/)（基板の呼び出しサイトごとの戻り型DSL）はv0.1.6に向けて`master`に蓄積中。`Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（+ `lookup_via:`クロスプラグインファクトチャネル）を追加;`rigor-dry-struct` v0.2.0は最初の動作消費者（`rigor-dry-types`が公開する`:dry_type_aliases`経由で`attribute :city, Types::String`を`Nominal[String]`に解決）。スライス4（TraitRegistryパリティ） + 連鎖呼び出し引数抽出は需要駆動のまま。
