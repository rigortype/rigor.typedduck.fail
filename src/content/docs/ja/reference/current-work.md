---
title: "Current Work — Inference Engine Checkpoint"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "e2a9d11bfcae13bc11b394b1fe0c7560e6794c3ebb4b8604cfd70cb66cc9ec9c"
sourceCommit: "035915291e331f3bcd5ce804a1e30dc284ffbd48"
translationStatus: "translated"
sidebar:
  order: 9050
---

これは長い実装スレッドをレビュー可能なチャンクに分割するための一時的なブックマークです。**規範的な**契約とスライスロードマップは[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります。将来を見据えたコミットメントエンベロープ（アクティブなサイクル + キューされた作業）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は`CHANGELOG.md`です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.4リリース済み（2026-05-14）**。スライスごとのまとめは`CHANGELOG.md` § `[0.1.4]`。完全なv0.1.0 → v0.1.4リリースログは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

**v0.1.5は`master`に蓄積中（リリース保留中）**。2つの絡み合うテーマ:

1. **Ractor移行のエンドツーエンド + spec-suiteのパフォーマンス向上**。ADR-15フェーズ1、2a、2b、3a、4a、4b、4b.x、4cがすべて着地;`Cache::Store`スレッドセーフ + インプロセスメモ + `parallel_tests`ランナーが、12コア開発機でスイートのwall-clockを162秒 → 27秒に削減。
2. **実世界Rails / Rubyサーベイ + 本番品質の改善**。3ラウンドにわたって14のプロジェクトを掃引（Redmine / Discourse / Mastodon / GitLab FOSS / Forem / Solidus / Chatwoot / Canvas LMS / OpenProject / Loomio / Publify / Diaspora / Dependabot Core / tDiary Core — 合計31,840ファイル）。サーベイ + 測定 + オープン項目インベントリは[`docs/notes/20260515-real-world-rails-survey.md`](../notes/20260515-real-world-rails-survey/)にあります。8つのエンジン / パッケージング改善がサーベイから着地しました: `examples/rigor-activesupport-core-ext/`オプトインRBSバンドル、6つのネイティブ拡張gem向け`data/vendored_gem_sigs/`ビルトインRBS、`bundler.bundle_path` / `auto_detect`によるBundler認識、条件内代入のナローイング、Ractorプール向けの4つのディープ共有可能性フォローアップ、`Hash[K, V] <:= Enumerable[[K, V]]`射影、`CONSTANT_CONSTRUCTORS` Proc共有修正、`RbsLoader#env`失敗メモ（競合する`signature_paths:`エントリーで約550×の高速化）。

プールパスは今、本番対応になりました: **プール ≡ シーケンシャルが14のサーベイプロジェクトすべてで証明**（31,840の掃引ファイル全体で`Ractor::IsolationError`ゼロ）;プールのwall-clockがシーケンシャルを上回るクロスオーバーは約1.3〜1.8 Kファイル;GitLab FOSS（11.1 Kファイル）はpool=8でシーケンシャルの1.64×を示す。

コミットされたすべてのv0.1.5トラックは純粋に加法的（既存のCLI消費者の動作変更なし）;Ractor作業は各フェーズが独立して取り消し可能な形で段階化されている。

## 作業が再開される場所

次のセッションのデフォルト目標は**v0.1.5リリースをカットする**ことです。Ractor移行は機能完成（フェーズ1〜4c + 4b.x）、v0.1.3 / v0.1.4の延期されたエコシステム項目はクローズ（`rigor-activestorage`、rigor-activerecord拡張、`Method#curry`）、実世界Railsサーベイは出荷された改善を生成（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識レイヤー1+2）、4つの崖級のバグが解決されました（O5 / O6 / O7に加えて条件内代入のナローイング）。[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従った`bundle exec rake release`は明示的なユーザー承認待ち。

リリースせずに実装を継続する場合、自然なエントリーは:

1. **O4レイヤー3** — v0.1.5のBundler認識MVPの上に、`Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング。レイヤー1（`bundler.bundle_path`） + レイヤー2（`.bundle/config` / `vendor/bundle`の自動検出）は`95b923f`で着地;レイヤー3は自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）を`Gemfile.lock` + `gem_rbs_collection`から供給されるバージョン解決テーブルに変える。
2. **O2 — マクロテンプレート / heredoc-Ruby展開**。[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + スライス7ドキュメント（コミット584ae85…56706a5）を通じて基板フロアが着地。Tier A（ブロック-as-メソッド）+ Tier C（heredocテンプレート）+ Tier B（トレイトインライニングレジストリ）エンジン統合が新しい`SyntheticMethodIndex` + プレパススキャナを介して出荷;Tier Dは契約のみで出荷（エンジン統合はスライス5aの先送りに従いキュー）;Concern（`included do`）再ターゲティングはスキャナで処理。3つの動作消費者が着地: `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。残り作業 — **スライス5b**（Tier Dエンジン統合: マッチした外部ファイルに対するトップレベルの`self_type`ナローイング + `bound_ivars`事前バインディング）と**スライス6**（精度プロモーション: Tier C `returns:`文字列をADR-13の`Plugin::TypeNodeResolver`にルーティング） — は具体的なプラグイン作者のケースにゲートされた需要駆動のまま。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
3. **gemソースからの呼び出しごとの戻り型精度**（ADR-10ウォーカー拡張）。v0.1.3 / v0.1.4から繰り越し。ウォーカーは現在`(class_name, method_name) → kind`のみをカタログ化する;より豊富なメソッドごとの戻り型は、`mode: :full`が`Dynamic[top]`ではなく精密な型を貢献できるようにする。
4. **`rigor-graphql`**（最後のTier 3エコシステムプラグイン）。具体的なユーザー需要があれば作成。
5. **dry-rbアダプタープラグイン**（[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)） — パッケージング戦略（単一gem対ファミリー対中粒度バンドル）には最初に明示的なADR-12決定が必要。

## オープンエンジニアリング項目

次の実装者がフルスレッドを再読することなく見ておくべき永続的な項目。リリース済みマイルストーンにすでに吸収された項目は、再記述するのではなく`CHANGELOG.md`を通じて参照されます。

### サーベイ駆動（v0.1.5サイクル）

14プロジェクトの実世界Railsサーベイは、v0.1.5サイクル中に3ラウンドを通じて実行されました。項目O1、O5、O6、O7はクローズ（`docs/ROADMAP.md` §「v0.1.5 — masterに蓄積中」を参照）;O4レイヤー1+2は着地し、レイヤー3はキューのまま;O2はキューのまま;O3は非問題と判明（早期exitナローイングはすでに動作 — サーベイ残余はObject#blank? / present? / tryで、O1のRBSバンドルがカバーする）。

| ID | ステータス | 項目 |
| --- | --- | --- |
| O1 | 着地（MVP、v2） | トップ約50のActiveSupport `core_ext`セレクタ向けの`examples/rigor-activesupport-core-ext/`オプトインRBSバンドル。v2はラウンド2の掃引後に`compact_blank` / `exclude?` / `index_with` / `Hash.from_xml` / `DateTime`計算を追加。 |
| O2 | 基板フロアが着地（Tier A/B/Cエンジン + Tier D契約 + Concern再ターゲティング + 3つの動作消費者プラグイン + ドキュメント）;スライス5b + スライス6はキュー | マクロテンプレート / heredoc-Ruby展開。[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + 7（コミット584ae85…56706a5）を通じて出荷。基板はWD13フロアで機能完成。tDiaryの`instance_eval`プラグインパターン + Railsジェネレーターの`.rb`-as-ERBテンプレートは、先送りされたスライス5b（Tier Dエンジン）に引き続き関連する。 |
| O3 | 非問題 | 早期exitナローイング（`next if x.nil?` / `return if x.nil?`）はすでに動作;サーベイ残余は`Object#blank?` / `#present?` / `#try`で、O1がカバーする。 |
| O4 | レイヤー1+2着地 | Bundler認識。`bundler.bundle_path`（明示） + `bundler.auto_detect`（`.bundle/config` / `vendor/bundle/`） + rigorの`DEFAULT_LIBRARIES` + `data/vendored_gem_sigs/`に対する`SKIPPED_GEMS_BY_DEFAULT`フィルター。レイヤー3（`Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング）はキュー。 |
| O5 | 着地（`ac14c45`） | `Inference::Acceptance#accepts_nominal_from_nominal`での`Hash[K, V] <:= Enumerable[[K, V]]`パラメータ化された祖先射影。今日のHash → Enumerableの手書きマッピング;一般的なRBS駆動の`definition.ancestors[i].args`射影は先送り。 |
| O6 | 着地（`4698437`） | `MethodDispatcher::CONSTANT_CONSTRUCTORS`のディープシェア（Proc値は浅い`.freeze`下で共有可能ではなかった）。修正後GitLab FOSSでプール ≡ シーケンシャル。 |
| O7 | 着地（`3c4a7ff`） | `RbsLoader#env`が失敗をメモ化。修正前は、1つの競合する`signature_paths:`エントリーがASTノードごとにenvを再構築（ファイルあたり390×、1つのコントローラーに約35秒）。修正後: 5つのコントローラーに対して0.15秒（約550×の高速化）、違反ファイルを名指しする1つのユーザー向け警告のみ。O4レイヤー3のブロックを解除 — stdlib RBSと競合するgem同梱sigsが今では優雅に縮退する。 |

### サーベイ前の永続項目

1. **sig-genの`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — `Foo::Bar`と`Foo::Bar::Child`の両方の宣言がフラットな兄弟としてすでに存在する場合、sig-genはそれらをフラットなままにする。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。
2. **インメモリの`Analysis::Runner.run_source`エントリーポイント（テスト専用のパフォーマンスフォローアップ）**。`RunnerHelpers#analyze`テストヘルパーは呼び出しごとにtmpdirを実体化する（ソースファイル書き込み、chdir、実行、クリーンアップ）。呼び出しごとに約25〜50ms × 数百のrunner-spec呼び出しで、これはインメモリエントリーポイントが削除できるスイートwall-clockの実質的なシェア。スケッチ: パス展開をバイパスし`{path => bytes}`仮想ファイルテーブルを受け入れる`Runner.run_source(source:, path: "code.rb", environment:, config:)`を追加する。ヘルパーは`analyze(source: "...")`形状（ファイル / sigなし）に対してそれを呼び出す。期待される差分: シーケンシャル約5 %、並列約3% — 単独で行う価値はないが、テストスイート拡張が続けば自然な補完。
3. **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50 %、`Marshal.load`約22 %、GC約17 %を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリーを処理する;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。実装スケッチ: `Runner#run`がファイルチャンクごとにワーカーをフォークし、各々がパイプに診断を書き、親が元のパス順序で再構築する。

## 復帰する実装者のための読書順

次のセッションのデフォルト目標は「v0.1.5リリースをカット」です。この順序で読んでください:

1. `CHANGELOG.md`の`[Unreleased]`セクション — v0.1.5の作業が着地するにつれて蓄積されます。
2. [`docs/notes/20260515-real-world-rails-survey.md`](../notes/20260515-real-world-rails-survey/) — 14プロジェクトの実世界サーベイ + オープン項目 + ラウンドごとの測定。
3. [`docs/ROADMAP.md`](../roadmap/) §「v0.1.5 — masterに蓄積中」 — 完全なv0.1.5エンベロープ（Ractor移行 + サーベイ + 本番品質の改善）。
4. [`docs/adr/15-ractor-concurrency.md`](../adr/15-ractor-concurrency/) + [`docs/design/20260514-ractor-migration.md`](../design/20260514-ractor-migration/) — Ractor移行の拘束力のある契約 + 段階化されたプラン。
5. [`docs/adr/10-dependency-source-inference.md`](../adr/10-dependency-source-inference/) — 依存ソース推論ティアの設計根拠;O4のレイヤー3（Gemfile.lock + gem_rbs_collectionマッチング）がこのサーフェスを拡張する。
6. [`docs/adr/9-cross-plugin-api.md`](../adr/9-cross-plugin-api/)、[`docs/adr/11-sorbet-input-adapter.md`](../adr/11-sorbet-input-adapter/)、[`docs/adr/13-typenode-resolver-plugin.md`](../adr/13-typenode-resolver-plugin/)、[`docs/adr/14-rbs-sig-generation.md`](../adr/14-rbs-sig-generation/)、[`docs/adr/16-macro-expansion.md`](../adr/16-macro-expansion/) — v0.1.xに着地した兄弟ADR。
7. [`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/) — Railsプラグインファミリーの順序付け、依存関係グラフ、サブツリー分割準備チェックリスト。
8. [`.codex/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) — 新しいプラグインを作成するためのエージェント向けプレイブック。
9. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスしてください。
10. [`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 21の動作プラグイン / RBSバンドル例の比較表;新しい作者への推奨読書順。
11. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)と[`docs/adr/7-v0.1.0-slice-decisions.md`](../adr/7-v0.1.0-slice-decisions/) — v0.1.xが拡張するv0.1.0プラグイン契約の拘束力のある設計とスライスごとの作業上の決定。
12. [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)作業上の決定 — OQ1 / OQ2 / OQ3の結果がプラグインが消費する型オブジェクトパブリックサーフェスを引き続き拘束します。
13. [`data/vendored_gem_sigs/README.md`](https://github.com/rigortype/rigor/blob/main/data/vendored_gem_sigs/README.md) — ビルトインのネイティブ拡張RBSバンドルの設計根拠（オプトインではなくデフォルトオンの理由、ActiveSupport core-extバンドルとの対比）。

スライス3bのサーフェス（`lib/rigor/rbs_extended.rb`、`lib/rigor/rbs_extended/reporter.rb`、`lib/rigor/builtins/imported_refinements.rb`、`lib/rigor/environment.rb`、`lib/rigor/analysis/runner.rb`）は端から端まで配線されている — レポーターや実行ごとの`name_scope`を必要とするフォローアップを作成するときはこれらを参照してください。v0.1.5のBundler認識サーフェス（`lib/rigor/environment/bundle_sig_discovery.rb`、`lib/rigor/configuration.rb` §「bundler」、`lib/rigor/environment.rb` § `for_project`）はO4レイヤー3フォローアップ作業のエントリーポイントです。
