---
title: "Current Work — Inference Engine Checkpoint"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "61d53a436c9dd941389d7444ae87ed6e82d7321481ed4cf59a5b88966325ac44"
sourceCommit: "61c8eef1a239a7226ba399ca3ffa2208e4763265"
translationStatus: "translated"
sidebar:
  order: 9050
---

これは長い実装スレッドをレビュー可能なチャンクに分割するための一時的なブックマークです。**規範的な**契約とスライスロードマップは[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります。将来を見据えたコミットメントエンベロープ（アクティブなサイクル + キューされた作業）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は`CHANGELOG.md`です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.4リリース済み（2026-05-14）**。スライスごとのまとめは`CHANGELOG.md` § `[0.1.4]`。完全なv0.1.0 → v0.1.4リリースログは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

**v0.1.5は`master`に蓄積中（リリース保留中）**。4つの絡み合うテーマ:

1. **Ractor移行のエンドツーエンド + spec-suiteのパフォーマンス向上**。ADR-15フェーズ1、2a、2b、3a、4a、4b、4b.x、4cがすべて着地;`Cache::Store`スレッドセーフ + インプロセスメモ + `parallel_tests`ランナーが、12コア開発機でスイートのwall-clockを162秒 → 27秒に削減。
2. **実世界Rails / Rubyサーベイ + 本番品質の改善**。3ラウンドにわたって14のプロジェクトを掃引（Redmine / Discourse / Mastodon / GitLab FOSS / Forem / Solidus / Chatwoot / Canvas LMS / OpenProject / Loomio / Publify / Diaspora / Dependabot Core / tDiary Core — 合計31,840ファイル）。サーベイ + 測定 + オープン項目インベントリは[`docs/notes/20260515-real-world-rails-survey.md`](../notes/20260515-real-world-rails-survey/)にあります。8つのエンジン / パッケージング改善がサーベイから着地しました: `examples/rigor-activesupport-core-ext/`オプトインRBSバンドル、6つのネイティブ拡張gem向け`data/vendored_gem_sigs/`ビルトインRBS、`bundler.bundle_path` / `auto_detect`によるBundler認識、条件内代入のナローイング、Ractorプール向けの4つのディープ共有可能性フォローアップ、`Hash[K, V] <:= Enumerable[[K, V]]`射影、`CONSTANT_CONSTRUCTORS` Proc共有修正、`RbsLoader#env`失敗メモ（競合する`signature_paths:`エントリーで約550×の高速化）。
3. **[ADR-16](../adr/16-macro-expansion/)マクロ / DSL展開基板 — フロア + 精度プロモーション着地**。16のコミット（584ae85…53b7db0）が4ティア基板を配信: Tier A（ブロック-as-メソッド、`rigor-sinatra`）、Tier B（トレイトインライニングレジストリ、`rigor-devise`）、Tier C（heredocテンプレート、`rigor-dry-struct`）、Tier D（外部Rubyファイルインクルージョン — 契約のみ、エンジンは先送り）。新しい`Rigor::Plugin::Macro::{BlockAsMethod, HeredocTemplate, TraitRegistry, ExternalFile}`値クラス + マニフェストフック;新しい`Rigor::Inference::{SyntheticMethod, SyntheticMethodIndex, SyntheticMethodScanner}`基板 + `try_synthetic_method`ディスパッチャーティア;Tier A用の`Rigor::Inference::MacroBlockSelfType`エンジンフック;Concern（`included do`）再ターゲティングウォーカー。スライス6精度プロモーション: Tier B発行が`RbsDispatch`経由でincludeされたモジュールの著作RBS戻り値を取得;Tier Cの素のクラス`returns:`文字列が`environment.nominal_for_name`経由で解決される。24の動作プラグイン例が今`examples/`下に出荷。WD13フロアでROADMAPオープン項目O2をクローズ。
4. **O4レイヤー3スライス1 + 2 + stdlibカバレッジ拡張**。6つの2026-05-16コミット（3c99eed → de2142a）が配信: (a) `Rigor::Environment::LockfileResolver` + `BundleSigDiscovery`のロックファイルフィルタで、プロジェクトの`Gemfile.lock`に存在するgemのみが`signature_paths:`にRBSを貢献する（スライス1）;(b) `rbs_collection.lock.yaml`をパースする`Rigor::Environment::RbsCollectionDiscovery`で、`rbs collection install`を実行するユーザーが手動の`signature_paths:`設定なしでダウンロードしたsigsを自動的にロードされる（スライス2）;(c) 30の追加stdlibライブラリ（`pp`、`delegate`、`observable`、…、`strscan`）が`Environment::DEFAULT_LIBRARIES`に追加されたため、それらをターゲットにする任意のRubyプログラムが箱から出してすぐに精密なRBS型を見られる（1,273 → 1,425 RBSクラス、+152）。1つのライブラリ（`singleton`）は`Rigor::Type::Singleton`との名前衝突のために保留された;設計判断はこのファイルの §「stdlibカバレッジ拡張 — オープンな設計の質問」に記録されている。

プールパスは今、本番対応になりました: **プール ≡ シーケンシャルが14のサーベイプロジェクトすべてで証明**（31,840の掃引ファイル全体で`Ractor::IsolationError`ゼロ）;プールのwall-clockがシーケンシャルを上回るクロスオーバーは約1.3〜1.8 Kファイル;GitLab FOSS（11.1 Kファイル）はpool=8でシーケンシャルの1.64×を示す。

コミットされたすべてのv0.1.5トラックは純粋に加法的（既存のCLI消費者の動作変更なし）;Ractor作業は各フェーズが独立して取り消し可能な形で段階化されている。

## 作業が再開される場所

次のセッションのデフォルト目標は**v0.1.5リリースをカットする**ことです。Ractor移行は機能完成（フェーズ1〜4c + 4b.x）、v0.1.3 / v0.1.4の延期されたエコシステム項目はクローズ（`rigor-activestorage`、rigor-activerecord拡張、`Method#curry`）、実世界Railsサーベイは出荷された改善を生成（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識レイヤー1+2+3スライス1+2）、4つの崖級のバグが解決されました（O5 / O6 / O7に加えて条件内代入のナローイング）、**ADR-16マクロ展開基板がエンドツーエンドで着地**（基板フロア + 精度プロモーション + 3つの動作消費者プラグイン;WD13フロアでO2をクローズ）、**DEFAULT_LIBRARIES stdlibカバレッジ拡張**が、箱から出してすぐに使えるRBSクラスを1,273から1,425に（+152）持ってきた。[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従った`bundle exec rake release`は明示的なユーザー承認待ち。

リリースせずに実装を継続する場合、自然なエントリーは:

1. **O4レイヤー3スライス3（gemバージョンごとのキャッシュディスクリプター）** — スライス3のユーザー向けサーフェス（未カバーgem向けの優雅な縮退`:info`診断）は着地済み;残りの部分はgemバージョンごとのキャッシュ無効化: `Cache::Descriptor::RbsCollectionEntry`内で`(gem_name, gem_version)`を追跡し、1つのgemの`bundle update`がプロジェクト全体のRBS envキャッシュではなくそのgemのスライスのみを無効化する。より大きなアーキテクチャ変更（envキャッシュは現在、すべてのsigファイルの連結のフィンガープリントでキー）;gemごとの無効化が測定可能な痛みになるまで先送り。
2. **gemソースからの呼び出しごとの戻り型精度**（ADR-10ウォーカー拡張）。v0.1.3 / v0.1.4から繰り越し。ウォーカーは現在`(class_name, method_name) → kind`のみをカタログ化する;より豊富なメソッドごとの戻り型は、`mode: :full`が`Dynamic[top]`ではなく精密な型を貢献できるようにする。
3. **`rigor-graphql`**（最後のTier 3エコシステムプラグイン）。具体的なユーザー需要があれば作成。
4. **dry-rbアダプタープラグイン**（[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)） — パッケージング戦略（単一gem対ファミリー対中粒度バンドル）には最初に明示的なADR-12決定が必要。ADR-16 Tier C / Tier Bエンジン基板が着地したことで、`rigor-dry-struct`への`rigor-dry-types`コンパニオンを同じプリミティブの上に構築できる。
5. **ADR-16需要駆動フォローアップ** — (a) **スライス5b** Tier Dエンジン統合（マッチした外部ファイルが`self_type`をナローイングされ`bound_ivars`が事前バインドされた状態で実行される）;（b）合成メソッドティアのためのADR-13 `Plugin::TypeNodeResolver`チェインの完全な配線（ユーティリティ型形の基板戻り値、例: `Array[String]` / `Pick<T, K>`をアンロックする）。両方ともADR-16 § 実装スライシングフットノートで固定;具体的なプラグイン作者のケース待ち。
6. **プロジェクト側のmonkey-patch事前評価** — `.rigor.yml`内の設定駆動メカニズムで、プロジェクトの残りが解析される前に明示的なリファインメント / monkey-patchを事前評価する。Redmineの実世界テスト中に「Rails `call.undefined-method`のロングテールを閉じる」ワークストリームの欠けている半分として表面化（もう半分はO1のRBSバンドルで、着地済み）。実装前にADRが必要（境界契約: 事前評価がいつ実行されるか、解析をクラッシュさせられるか、スコープルール）。コミット済みマイルストーンなし。

## オープンエンジニアリング項目

次の実装者がフルスレッドを再読することなく見ておくべき永続的な項目。リリース済みマイルストーンにすでに吸収された項目は、再記述するのではなく`CHANGELOG.md`を通じて参照されます。

### サーベイ駆動（v0.1.5サイクル）

14プロジェクトの実世界Railsサーベイは、v0.1.5サイクル中に3ラウンドを通じて実行されました。項目O1、O5、O6、O7はクローズ（`docs/ROADMAP.md` §「v0.1.5 — masterに蓄積中」を参照）;O4レイヤー1+2は着地し、レイヤー3はキューのまま;O2はキューのまま;O3は非問題と判明（早期exitナローイングはすでに動作 — サーベイ残余はObject#blank? / present? / tryで、O1のRBSバンドルがカバーする）。

| ID | ステータス | 項目 |
| --- | --- | --- |
| O1 | 着地（MVP、v2） | トップ約50のActiveSupport `core_ext`セレクタ向けの`examples/rigor-activesupport-core-ext/`オプトインRBSバンドル。v2はラウンド2の掃引後に`compact_blank` / `exclude?` / `index_with` / `Hash.from_xml` / `DateTime`計算を追加。 |
| O2 | 基板フロア + 精度プロモーション着地（Tier A/B/Cエンジン + Tier D契約 + Concern再ターゲティング + 3つの動作消費者プラグイン + ドキュメント + スライス6精度）;スライス5b + ADR-13リゾルバチェイン配線はキュー | マクロテンプレート / heredoc-Ruby展開。[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + 7（コミット584ae85…56706a5） + スライス6a-TierB / 6b-TierC（コミットd174fff / d7b1943）を通じて出荷。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier B → モジュールRBS、Tier C → 素のクラス名ルックアップ）で機能完成。tDiaryの`instance_eval`プラグインパターン + Railsジェネレーターの`.rb`-as-ERBテンプレートは、先送りされたスライス5b（Tier Dエンジン）に引き続き関連する。パラメータ化 / ユーティリティ型の基板戻り値は、需要駆動のADR-13リゾルバチェイン配線に先送り。 |
| O3 | 非問題 | 早期exitナローイング（`next if x.nil?` / `return if x.nil?`）はすでに動作;サーベイ残余は`Object#blank?` / `#present?` / `#try`で、O1がカバーする。 |
| O4 | レイヤー1+2+3（スライス1+2+3）着地 | Bundler認識。レイヤー1（`bundler.bundle_path`） + レイヤー2（`.bundle/config` / `vendor/bundle/`の自動検出） + レイヤー3スライス1（`Gemfile.lock`パース + バンドルsigフィルター、コミット`3c99eed`） + レイヤー3スライス2（`rbs_collection.lock.yaml`認識、コミット`46c9ec7`） + レイヤー3スライス3（ロックされたgemにRBSカバレッジがないときの優雅な縮退`:info`診断）。gemバージョンごとのキャッシュディスクリプター（`bundle update`がプロジェクト全体ではなく影響を受けるgemのスライスのみを無効化する）は、より大きなアーキテクチャ変更としてキューに残る。 |
| O5 | 着地（`ac14c45`） | `Inference::Acceptance#accepts_nominal_from_nominal`での`Hash[K, V] <:= Enumerable[[K, V]]`パラメータ化された祖先射影。今日のHash → Enumerableの手書きマッピング;一般的なRBS駆動の`definition.ancestors[i].args`射影は先送り。 |
| O6 | 着地（`4698437`） | `MethodDispatcher::CONSTANT_CONSTRUCTORS`のディープシェア（Proc値は浅い`.freeze`下で共有可能ではなかった）。修正後GitLab FOSSでプール ≡ シーケンシャル。 |
| O7 | 着地（`3c4a7ff`） | `RbsLoader#env`が失敗をメモ化。修正前は、1つの競合する`signature_paths:`エントリーがASTノードごとにenvを再構築（ファイルあたり390×、1つのコントローラーに約35秒）。修正後: 5つのコントローラーに対して0.15秒（約550×の高速化）、違反ファイルを名指しする1つのユーザー向け警告のみ。O4レイヤー3のブロックを解除 — stdlib RBSと競合するgem同梱sigsが今では優雅に縮退する。 |

### stdlibカバレッジ拡張 — オープンな設計の質問（2026-05-16）

`Environment::DEFAULT_LIBRARIES`を拡張するv0.1.5の作業（コミット`0a4ffea` + フォローオン）が駆動。23の追加stdlibライブラリが今、自動ロードされる（1,273 → 1,412 RBSクラス）。2つの設計判断ポイントが表面化し、先送りされた:

1. **rigorの内部キャリアとのstdlib名前衝突（解決済み）**。`singleton`（stdlibの`Singleton`ミックスイン）が当初レキシカルスコープ内で`Rigor::Type::Singleton`と衝突し、`lib/rigor/type/singleton.rb#==`の`is_a?(Singleton)`ナローイングで`undefined-method`偽陽性を表面化した。`Inference::Narrowing#analyse_class_predicate`のレキシカルネスティング修正経由で解決: 素の名前引数は、`scope.self_type`から派生したチェイン（`Module.nesting`駆動の定数ルックアップをミラー）を通じて解決されるため、ネストされた`Rigor::Type::Singleton`がトップレベルのstdlib `Singleton`に勝つ。`singleton`は今`DEFAULT_LIBRARIES`に入っている。より広いレキシカル解決カバレッジ（メソッドディスパッチレシーバー、属性アクセスなど）はさらなる需要にゲート — 修正はクラス述語ナローイングサーフェスに対して外科的。

2. **上流`rbs` gemのstdlib RBSカバレッジギャップ**。`strscan`が当初バッチ2をブロックした、バンドルされたRBSが`StringScanner#[](Integer)`のみを宣言するため、一方で実際のRubyは名前付きキャプチャの`StringScanner#[](Symbol)`をサポートする — rigor自身が`lib/rigor/builtins/imported_refinements.rb:422,424`で使う。便宜的な解決（下記の応答パス（a））が影響を受ける呼び出しサイトに2つの`# rigor:disable argument-type-mismatch`ディレクティブを適用し、`strscan`を`DEFAULT_LIBRARIES`に移動した、そのためパーサーコードを解析するユーザーがStringScannerディスパッチ精度を取得する。残りの応答パスは長期的な修正としてオープンのまま:
   - **（a）ライブラリをスキップ** — バッチ2で当初使用;バッチ3.5で（a'）に取って代わられた
   - **（a'）ギャップに影響を受ける呼び出しサイトでのインソース`# rigor:disable`ディレクティブ** + ライブラリをロード。バッチ3.5で着地したもの。トレードオフ: 上流RBSが修正されたときにrigor自身のコードがメンテナンス負担を運ぶ（ディレクティブを削除しなければならない）;負担は限定的（1ファイルに2つの呼び出しサイト）。これは`lockfile_resolver.rb`の`Bundler::LazySpecification#platform`にすでに使用されているのと同じパターン。
   - **(b) rigor自身の`sig/`下に手書きのRBSオーバーレイを作成**。AGENTS.md §「RBS Authorship」に従い、プロジェクトポリシーは手書きRBSよりも`rigor sig-gen`を好むが、「上流RBS shimギャップを埋める」は「推論から生成する」とは別個のカテゴリーであると議論できる。小さな焦点を絞ったオーバーレイ（`StringScanner#[](Symbol)`行）が、rigor自身のコードがdisableディレクティブを落とせるようにする。
   - **(c) `ruby/rbs`に修正を上流化してgemをバンプ**。最高品質の長期パス;クロスプロジェクト協調が必要。

   同じパターンは、ライブラリセットが拡張するにつれて他のstdlib RBSギャップに対しても再発する。決定ツリーは: 上流RBSギャップが単一の内部呼び出しサイトで表面化したとき、（a'）（disableディレクティブ）を好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、（b）または（c）にエスカレートする。

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
10. [`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 24の動作プラグイン / RBSバンドル例の比較表;新しい作者への推奨読書順。
11. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)と[`docs/adr/7-v0.1.0-slice-decisions.md`](../adr/7-v0.1.0-slice-decisions/) — v0.1.xが拡張するv0.1.0プラグイン契約の拘束力のある設計とスライスごとの作業上の決定。
12. [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)作業上の決定 — OQ1 / OQ2 / OQ3の結果がプラグインが消費する型オブジェクトパブリックサーフェスを引き続き拘束します。
13. [`data/vendored_gem_sigs/README.md`](https://github.com/rigortype/rigor/blob/main/data/vendored_gem_sigs/README.md) — ビルトインのネイティブ拡張RBSバンドルの設計根拠（オプトインではなくデフォルトオンの理由、ActiveSupport core-extバンドルとの対比）。

スライス3bのサーフェス（`lib/rigor/rbs_extended.rb`、`lib/rigor/rbs_extended/reporter.rb`、`lib/rigor/builtins/imported_refinements.rb`、`lib/rigor/environment.rb`、`lib/rigor/analysis/runner.rb`）は端から端まで配線されている — レポーターや実行ごとの`name_scope`を必要とするフォローアップを作成するときはこれらを参照してください。v0.1.5のBundler認識サーフェス（`lib/rigor/environment/bundle_sig_discovery.rb`、`lib/rigor/configuration.rb` §「bundler」、`lib/rigor/environment.rb` § `for_project`）はO4レイヤー3フォローアップ作業のエントリーポイントです。
