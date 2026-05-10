---
title: "Current Work — Inference Engine Checkpoint"
description: "Imported from rigortype/rigor docs/CURRENT_WORK.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "69970ac3f57d4767f4e33723044ef8e87c58c6d0d570bba50f029efce9c81e6a"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
translationStatus: "translated"
sidebar:
  order: 9050
---

これは長い実装スレッドをレビュー可能なチャンクに分割するための一時的なブックマークです。**規範的な**契約とスライスロードマップは[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります。リリースごとのコミットメントエンベロープは[`docs/MILESTONES.md`](../milestones/)にあります。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / マイルストーンが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.2リリース済み。** v0.1.2の全トラックが着地し、バージョンカット完了。スライスごとのまとめは`CHANGELOG.md` § `[0.1.2]`と`docs/MILESTONES.md` §「v0.1.2 — 計画中」にあります。

**v0.1.3進行中。**テーマ: **[ADR-10 — オプトイン依存関係ソース推論](../adr/10-dependency-source-inference/)をエンドツーエンドで提供し、ADR-11 / Railsプラグインフェーズ作業を吸収する。** v0.1.2リリース以降の着地内容:

- **ADR-10完全実装済み。** 5スライスエンベロープ（設定配管 → ウォーカー + ディスパッチャーティア → キャッシュディスクリプター → gemごとの予算 → ドキュメント）+ 4つの「オープンクエスチョン」フォローアップ（5aレシーバーごとのプラグイン拒否権 / 5b β予算セマンティクス / 5d設定競合診断; 5cバウンダリクロスは`mode: full`独自ディスパッチを前提として延期として文書化）。
- **ADR-11（rigor-sorbet）一次サーフェス完了。**元の計画のスライス1〜6 + 8、加えて`T.must_because`、`T.reveal_type`、`T.assert_type!`、`T.bind`、`enforce_sigil`のファイルごとのゲーティングの軽量フォローアップ。コールサイトごとのアサーションゲーティングのみ残る。
- **PHPStanスタイルのType-Specifying Extensions基板着地。** `Inference::StatementEvaluator#apply_plugin_assertions`がプラグイン側の`truthy_facts` / `falsey_facts` / `post_return_facts`をナロイングエンジンに配線し、ADR-7 §「スライス4-A」のプラグイン半分を閉じる。T.bindが使う基板と同じ; PHPStanスタイルのコールシェイプアサーションがエンジン変更なしにRigorプラグインから作成可能になった。
- **rigor-actionpack 4フェーズ完了。**フェーズ4（ルートヘルパー）+ フェーズ2（フィルターチェーン）+ フェーズ3（レンダーターゲット）+ フェーズ1（ストロングパラメーター → ARカラム検証）。Action Pack全サーフェスを出荷する最初のTier 2プラグイン。
- **rigor-factorybot Tier 2プラグイン** — フェーズ1 （a）自立型バリデーション + フェーズ1 (c) `:model_index` ADR-9ファクト経由のARカラム相互チェック。
- **rigor-activerecord ADR-9公開。**新しい`manifest(produces: [:model_index])` + `prepare(services)`フックがモデルインデックスをクロスプラグインファクトストアに公開する。2つのコンシューマー（rigor-actionpackフェーズ1 + rigor-factorybotフェーズ1 （c））でADR-9をエンドツーエンドで実証する最初の「公開-消費」サイクル。
- **ハンドブック拡張。**第7章に`@phpstan-assert`対応表を追加;第10章（rigor-sorbet）が新しいsorbet認識器すべてをカバー。

`examples/`に18の動作プラグイン例が着地。ADR-10の「オープンクエスチョン」トラックは`mode: full`独自ディスパッチ（バウンダリクロス診断の前提条件）を除いてクローズ。ADR-11の延期項目はコールサイトごとのアサーションゲーティングのみ。

ADR-10はv0.1.2と並行して作成されv0.1.3+に待機; v0.1.3で実装を開始。ADRの「実装スライシング」セクションに従った5スライス（設定配管 → ウォーカー + ディスパッチャーティア → キャッシュディスクリプター → gemごとの予算 → ドキュメント）。

- **スライス1（設定配管）** — 未リリースで着地。新しい`Configuration::Dependencies`値オブジェクト + `Entry(gem:, mode:, roots:)`フリーズData。`.rigor.yml`に`dependencies.source_inference[]`セクションを追加。JSONスキーマ + パーサーテスト + `Configuration.load`を通じた統合テスト。`[Unreleased]`下のCHANGELOGエントリ。
- **スライス2a（Gemリゾルバー + Rannerワイリング）** — 未リリースで着地。`Analysis::DependencySourceInference::GemResolver.resolve`がエントリを`Resolved` / `Unresolvable`にマップ; `Builder.build`が分割し、フリーズされた`Index`を返す。`Analysis::Runner`が実行ごとに一度インデックスをビルドし（スライス1のファントム設定ギャップを閉じる）、解決不能なgemを`dynamic.dependency-source.gem-not-found` `:warning`診断として表面化する。ウォーカーとディスパッチャーの作業は内部的に**スライス2b**として切り離された。
- **スライス2b-i（ウォーカー + インデックスメソッドカタログ）** — 未リリースで着地。`Walker.walk(gem_dir:, roots:)`がオプトインgemの`*.rb`ファイルをパースし、フラットな`Hash{[class_name, method_name] => :instance | :singleton}`カタログを返す。ADR-10 §「ハード除外」はルート粒度で強制: `spec/` / `test/` / `bin/`はファイルシステムウォーク前にフィルタリングされユーザーが上書きできない。`Builder.build`がgemごとのカタログを`Index#method_catalog`に集約; `Index#contribution_for(class_name:, method_name:)`がテーブルから回答する。
- **スライス2b-ii（ディスパッチャーティア）** — 未リリースで着地。`Inference::MethodDispatcher.dispatch`の新しいティア（`RbsDispatch.try_dispatch`と`try_user_class_fallback`の間）: レシーバークラス + メソッド名が`Index`エントリにマッチすると`Type::Combinator.untyped`（Dynamic[top]）を返す。`Environment.for_project` / `Environment.new`が`dependency_source_index:`を受け入れ; `Environment#dependency_source_index`アクセサーがドリフトスナップショット + `sig/rigor/environment.rbs`でピン留め。**スライス2エンベロープ完了**。
- **スライス3（キャッシュディスクリプター + gemバージョンごとの無効化）** — 未リリースで着地。`Cache::Descriptor::DependencyEntry(gem_name:, gem_version:, mode:)`値オブジェクト + `Cache::Descriptor`の新しい`dependencies:`スロット; `gem_name`上の`compose_by_key`がバージョン / モードの不一致で`Conflict`を発生させる;正規ハッシュスロット順序は`configs / dependencies / files / gems / plugins`; `SCHEMA_VERSION`が2にバンプされ古い形状のエントリが初回実行で消去される。新しい`DependencySourceInference::Index#cache_descriptor`がすべての`Resolved`行を`DependencyEntry`に変換し`dependencies:`スロットが設定されたフリーズされたディスクリプターを返す——将来のキャッシュプロデューサーが自身のディスクリプターと合成できるプリミティブで、リストされたgemの`bundle update`がそのgemのスライスだけを無効化する。解決不能エントリは何も貢献しない（バージョンなし）;解決済み-無効エントリは`Builder`で上流でフィルタリングされる。
- **スライス4（gemごとの予算プール）** — 未リリースで着地。新しい`dependencies.budget_per_gem`設定エントリ（デフォルト`5000`、範囲`1250 .. 20000` ADR-10 §「予算のインタラクション」より）。`Walker.walk`が`budget:`キーワードを受け入れ`Walker::Outcome(catalog:, truncated:)`を返す;収集はキャップで停止し`truncated?`が`Index#budget_exceeded`に伝播する。`Analysis::Runner`がトリップしたgemごとに1つの`dynamic.dependency-source.budget-exceeded` `:warning`を発行（コールサイトごとではなくgemごとの重複排除）。ADR-10 WD4の（α）ウォーカー側キャップを実装;より豊富な（β）クラスからgemへの逆インデックスは具体的なユーザーニーズの後ろに待機。
- **スライス5（ドキュメント）** — 未リリースで着地。着地した5スライスすべてをエンドツーエンドでカバーする[`docs/internal-spec/dependency-source-inference.md`](../internal-spec/dependency-source-inference/)の新しい規範的仕様（設定、リゾルバー + インデックス、ウォーカー、ディスパッチャーティア、キャッシュスライス、予算強制）、加えてライブ + 保留中の診断ファミリーとADR-2 / ADR-5 / ADR-9との境界契約。`docs/internal-spec/README.md`の読書順テーブル更新; `special-types.md` / `inference-budgets.md` / `diagnostic-policy.md`のクロスリンクが「ADR-10のみ」から「ADR-10（解析器契約: dependency-source-inference.md）」にアップグレードされ、読者が実装契約にワンクリックで到達できる。
- **ADR-10エンベロープ完了 + オープンクエスチョンスイープ。** 5つの実装スライス + 5a（`manifest(owns_receivers:)`経由のレシーバーごとのプラグイン拒否権）、5b（`dependencies.budget_overrun_strategy: dependency_silence`経由のβ予算セマンティクス）、5d（`includes:`チェーンモードの不一致に対する`dynamic.dependency-source.config-conflict` :warning）。5c（バウンダリクロス診断）は`mode: full`独自ディスパッチ前提として延期として文書化されました——その前提なしに診断を出荷することは、決して発火できないルールを出荷することになります。

**v0.1.0 → v0.1.2リリース済み。**スライスごとのまとめは`CHANGELOG.md`（§ `[0.1.0]`、`[0.1.1]`、`[0.1.2]`）と`docs/MILESTONES.md`（§「v0.1.0 — リリース済み」、「v0.1.1 — 計画中」完了マーク済み、「v0.1.2 — 計画中」完了マーク済み）にあります。`target_ruby`ファントム設定修正と[`spec/rigor/analysis/runner_spec.rb`](https://github.com/rigortype/rigor/blob/main/spec/rigor/analysis/runner_spec.rb)「ランタイムでの設定配線（監査ガード）」下の実行時監査ガードスペックブロックはv0.1.1バッチ中に着地し、引き続き有効です。

## 作業が再開される場所

### v0.1.3エントリーパス

v0.1.3の3つの主要トラックはクローズされました:
- **ADR-10**: 5スライスエンベロープ + 5a / 5b / 5dオープンクエスチョンフォローアップすべて着地; 5cバウンダリクロスは`mode: full`独自ディスパッチ前提として延期。
- **ADR-11（rigor-sorbet）**: スライス1〜6 + 8 + 軽量フォローアップ（`T.must_because`、`T.reveal_type`、`T.assert_type!`、`T.bind`、`enforce_sigil`）すべて着地。コールサイトごとのアサーションゲーティングのみ残る。
- **Railsエコシステム（Tier 2）**: rigor-actionpack 4フェーズ + rigor-factorybotフェーズ1 (a)+（c）すべて着地。ADR-9クロスプラグインチェーンが`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）でエンドツーエンドで証明された。

次のセッションでできること:
1. **リリースカット**（[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従って`bundle exec rake release`、明示的なユーザー承認待ち）。v0.1.3は実質的な作業を蓄積しており出荷可能です。
2. **延期キュー項目を継続する**:
   - `mode: full`独自ディスパッチ（ADR-10 5cバウンダリクロスのブロックを解除する）。
   - rigor-sorbetのコールサイトごとのアサーションゲーティング（最後のADR-11延期項目）。
   - Tier 3エコシステムプラグインの残り: `rigor-graphql`、`rigor-activestorage`。
   - rigor-activerecord拡張: アソシエーション、列挙型、スコープ、バリデーション、コールバック（ロードマップに従い各0.2.0+マイナーバンプとして出荷可能）。
3. **新エコシステム作業**: ADR-12候補プラグイン（[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)に従ったdry-rbアダプター）。

### Railsエコシステムプラグイン（並行実行トラック）

Railsプラグインファミリーはv0.1.xコア作業と並行して継続しています。フルプランは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。作成は**1セッションにつき1プラグイン**の形式で`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。

`examples/`に着地済み（`master`に未リリース）:
- **Tier 1**: `rigor-rails-routes`（`:helper_table`を公開）、`rigor-rails-i18n`、`rigor-actionmailer`、`rigor-activejob`。
- **Tier 2**: `rigor-actionpack`（4フェーズ — ルートヘルパー / フィルターチェーン / レンダーターゲット / ストロングパラメーター → ARカラム検証）; `rigor-factorybot`（フェーズ1 (a) + （c））; `rigor-activerecord`（下流コンシューマーへの`manifest(produces: [:model_index])` ADR-9公開付き）。
- **Tier 3**: `rigor-pundit`、`rigor-sidekiq`、`rigor-rspec`、`rigor-actioncable`。

保留中Tier 3: `rigor-graphql`、`rigor-activestorage`。`rigor-sorbet`プラグイン（ADR-11;スライス1〜6 + 8 + 軽量フォローアップ着地）はRailsトラックと並行。`rigor-activerecord`拡張（アソシエーション、列挙型、スコープ、バリデーション、コールバック）は0.2.0+マイナーバンプとして出荷。

## オープンエンジニアリング項目

v0.0.xスライスを通じて浮かび上がった永続的な項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。v0.1.1にすでに吸収された項目はここで再説明するのではなくMILESTONESを通じて参照されます。

1. ~~**Cボディクラシファイアーの間接ミューテーター。**~~ v0.1.2でクローズ——抽出器のシードが、ボディで凍結チェック（`str_modifiable`、`rb_struct_modify`、`range_modify`、`rb_class_modify_check`など）を発行する`_modify` / `_modifiable`命名のヘルパーもマッチするようになりました。カタログ再生成により`String#replace` / `String#initialize_copy` / 複数のStringビックリメソッド / `Range#initialize` / `Range#initialize_copy`が`mutates_self`に切り替わります。最初の引数の形式パラメーターに対する推移的閉包アプローチが検討されましたが差し戻されました——最初の引数が形式であるにもかかわらずヘルパーが実際にはそれをミューテートしない関数での過剰分類。クラスごとのブロックリストが残りのケース（Time / Setヘルパー）を吸収し続けます。

（以前ここに列挙されていた項目——`node_locator_spec.rb:82`と`numeric.yml`の`Integer#ceildiv`——は現在[v0.1.1 Track 4メンテナンス](../milestones/#v011--planned)です。）

## 復帰する実装者のための読書順

次のセッションのデフォルト目標は、設計上の判断が解決され次第「ADR-10のスライス4（gemごとの予算プール）を着地させる」か、「並行して次のエコシステムプラグインを作成する」です。この順序で読んでください:

1. `CHANGELOG.md`の`[Unreleased]`セクション——v0.1.3の作業が着地するにつれて蓄積されます。
2. [`docs/MILESTONES.md`](../milestones/) — リリースごとのコミットメントエンベロープ; v0.1.2が最新リリースマイルストーン、v0.1.3がADR-10実装を担う。
3. [`docs/adr/10-dependency-source-inference.md`](../adr/10-dependency-source-inference/) + [`docs/internal-spec/dependency-source-inference.md`](../internal-spec/dependency-source-inference/) — v0.1.3の主要トラックの設計根拠と解析器契約。
4. [`docs/adr/9-cross-plugin-api.md`](../adr/9-cross-plugin-api/)と[`docs/adr/11-sorbet-input-adapter.md`](../adr/11-sorbet-input-adapter/) — v0.1.xコアに着地した兄弟ADR; Tier 2 RailsプラグインはADR-9に依存し、rigor-sorbetプラグインドラフトはADR-11を追跡。
5. [`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/) — Railsプラグインファミリーの順序付け、依存関係グラフ、サブツリー分割準備チェックリスト。
6. [`.codex/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) — 新しいプラグインを作成するためのエージェント向けプレイブック（すべてのRails / dry-rb / Sorbetプラグインセッションに使用）。
7. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスしてください。
8. [`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 16の動作プラグイン例の比較表;新しい作者への推奨読書順。
9. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)と[`docs/adr/7-v0.1.0-slice-decisions.md`](../adr/7-v0.1.0-slice-decisions/) — v0.1.xが拡張するv0.1.0プラグイン契約の拘束力のある設計とスライスごとの作業上の決定。
10. [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)作業上の決定 — OQ1 / OQ2 / OQ3の結果がプラグインが消費する型オブジェクトパブリックサーフェスを引き続き拘束します。

その後、v0.1.3の実装サーフェスは`lib/rigor/analysis/dependency_source_inference/`、`lib/rigor/cache/`、`lib/rigor/inference/method_dispatcher.rb`、`lib/rigor/configuration*`、`lib/rigor/plugin/`（プラグイン側作業用）に対するgrepから見つけられます。
