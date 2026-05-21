---
title: "Current Work — Inference Engine Checkpoint"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "29a4bcc68519d25d41d625858cdeace4f4474ab577364a761fb9dce8bcf34275"
sourceCommit: "626e04cb1ce26d1b1500ed80d078dac891053fd2"
sourceDate: "2026-05-21T05:31:38+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

これは長い実装スレッドをレビュー可能なチャンクに分割するための一時的なブックマークです。**規範的な**契約とスライスロードマップは[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります。将来を見据えたコミットメントエンベロープ（アクティブなサイクル + キューされた作業）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は`CHANGELOG.md`です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.7リリース済み（2026-05-20）**。スライスごとのまとめは`CHANGELOG.md` § `[0.1.7]`（ヘッドライン: ADR-22ベースラインメカニズムスライス1 + 2）。アクティブなサイクルは`CHANGELOG.md` § `[Unreleased]`に蓄積中 — **Mastodonサーベイ診断品質プッシュ**をテーマとしている: 下記§「作業が再開される場所」を参照。

### 作業が再開される場所 — `[Unreleased]`サイクル（2026-05-20）

現在のサイクルは[`docs/notes/20260519-oss-library-survey.md`](../notes/20260519-oss-library-survey/) Mastodonサーベイ駆動の実世界フォルスポジティブ削減パス。**`origin/master`より12コミット先行、未プッシュ**（プッシュ + リリース決定はAGENTS.mdに従いユーザーにゲート）。着地済み:

1. **ADR-15 Amendment — フォークベースのワーカープールがRactorプールに取って代わる**。Ruby 4.0.x上の2つの独立したRactorプール欠陥に根本原因を特定したCI segfault（`rb_vm_ci_lookup`のCRubyヒープ-UAF、**Ruby Bug #22075**として報告;加えて決定論的な`Ractor::IsolationError`）。新しい`Runner#analyze_files_in_fork_pool`がアクティブな`workers > 0`バックエンド;Ractorプールは`RIGOR_POOL_BACKEND=ractor`の背後に残る。調査ノート: [`docs/notes/20260520-ractor-pool-cruby-uaf.md`](../notes/20260520-ractor-pool-cruby-uaf/)。コミット`86ed912`。
2. **[ADR-23](../adr/23-diagnostic-triage-command/) `rigor triage`サブコマンド（スライス1+2）**。ルールID分布 + ファイルごとのホットスポット + 6つのレコグナイザーヒューリスティックヒントカタログ。読み取り専用 / アドバイザリー。コミット`9b58655`、`9ed624b`。
3. **Mastodon FPクラスター修正（順番通りに作業）:**
   - **クラスター3 — stdlib RBSカバレッジギャップ**。`references/rbs`がPRブランチ`widen-strscan-resolv-stdlib-sigs`で拡張（`StringScanner#[]`、`Resolv#initialize`） — ブランチプッシュ + 上流PRの作成はユーザーのタスク。加えて`Hash#deep_transform_keys!`ファミリーを`rigor-activesupport-core-ext`に追加（コミット`e7ef6ef`）。
   - **クラスター1 — `belongs_to`がデフォルトでnullable不可**。`rigor-activerecord` v0.1.0 → v0.2.0;`belongs_to`アクセサーは`optional: true`でない限り`Target?`でなく`Nominal[Target]`に型付け。コミット`bdbd46c`。
   - **クラスター2 — 明示的レシーバー呼び出しがprivateフォールバックメソッドに解決**。`Favourite.select(:col)`がユーザークラスフォールバック経由でプライベートな`Kernel#select`（`-> Array[String]`）に誤解決;誤った`Array[String]`が`undefined-method` / `argument-type-mismatch` FPに連鎖。`try_user_class_fallback`が明示的な非`self`レシーバーに対して`public_only: true`を渡すように;`RbsDispatch`はそのフラグ下で`:private`メソッドをスキップ。コミット`fb807fb`**。完了**。
   - **クラスター1b — `fail_with_message(...) if x.nil?`ガードヘルパーがナローイングしない**（`lib/mastodon/cli/accounts.rb`に`possible-nil-receiver`が約42件）。根本原因: rigorがメソッドボディ内の暗黙的selfメソッド呼び出しを解決しなかった — それらは`Dynamic[top]`に型付けされ、ガードヘルパーの`bot`リターンが見えなかった**。[ADR-24](../adr/24-self-method-call-resolution/)**（提案済み、7つのワーキング決定、4つの実装スライス）として設計。コミット`3fffb3e`**。ADR-24スライス1 + 2 + 3実装済み**（コミット`8f9d74d`、`37de7e0`、`61bdaad`）: スライス1は暗黙的self呼び出しを同クラス + トップレベル定義に対して解決;スライス2は新しい`ScopeIndexer.discovered_def_index_for_paths`プレパスを経由してクロスファイルでユーザークラスのスーパークラスチェーンを辿る;スライス3は`eval_if` / `eval_unless`のターミネーティングブランチ検出を「ブランチ型が`Bot`」に汎化。採用は保守的にクラスボディ内の`Bot`リターンにゲート（無条件採用は`rigor check lib`を16診断リグレッション）。3つのスライスが合わさって祖先ガードヘルパーを`bot`に解決しガードをナローイング — **クラスター1bクローズ**。インクルードモジュール（`include`）解決 + スライス4（ゲート付きclosed-class診断）は残り。

### 復帰する実装者への次のエントリー

- **クラスター4 — フローフォールディング警告**（`condition is always truthy` / `always falsey`）: 2026-05-21トリアージ済み、[`docs/notes/20260521-mastodon-cluster4-flow-folding-triage.md`](../notes/20260521-mastodon-cluster4-flow-folding-triage/)を参照。Mastodonの8件の警告はすべてフォルスポジティブ;実バグなし。2つのキューされたエンジンギャップに分割 — G1ループ/retryボディミューテーション（= オープンエンジニアリング項目0）とG2 ivar型がミューテーションで無効化されない。どちらも`control-flow-analysis.md` §「mutation effects」モデル下でキューされたまま;どちらもスケジュールされていない（中規模エンジン変更、精度リグレッションリスク、`:warning`であって`:error`ではない）。Mastodonサーベイサイクルの診断クラスターはすべてトリアージ完了。
- **ADR-24残り作業** — スライス1+2+3着地済み（`8f9d74d`、`37de7e0`、`61bdaad`）、加えてinclude/prependされたモジュール解決（スライス2の祖先チェーンを完成）。ADR-24祖先チェーン（WD1）は現在完全 — 同クラス + トップレベル + スーパークラスチェーン + インクルードモジュール、クロスファイル。残り: （a）**スライス4**（ゲート付き`undefined-method` / アリティ診断、closed-classセルフ呼び出し — 独自のFP評価ゲート、ADR-24 WD4）;（b）クラスボディ内の**非`Bot`一般採用**フォローアップ — 精確な型を採用しても下流で既存の不精度が表面化しないよう、呼び出し先リターン推論が十分精確である必要がある（無条件採用実験は`rigor check lib`を16診断リグレッション）。ADR-24 §「実装スライシング」を参照。
- **`rigor triage`スライス4 — 構造化`Diagnostic`フィールド着地済み**。`Analysis::Diagnostic`がオプションの`receiver_type` / `method_name`を持つようになり、`call.undefined-method`ルールによって投入される;`Triage::Catalogue`がそれらを読み、不在の場合のみメッセージパースにフォールバック — WD3のメッセージ語彙結合がエンジンパスに対して消去された。残り: スライス3（SKILL統合、v0.1.9 ADR-22 SKILLトリオにブロック） + スライス4のプラグイン提供レコグナイザーフック（先送り）。

v0.1.5のテーマ（タグで凍結、完全な詳細はCHANGELOG）:

1. **ADR-15 Ractor移行エンドツーエンド**（フェーズ1、2a、2b、3a、4a、4b、4b.x、4c）+ spec-suiteのパフォーマンス向上（`Cache::Store`スレッドセーフ + インプロセスメモ + `parallel_tests`経由で12コアで162秒 → 27秒）。
2. **実世界Rails / Rubyサーベイ + 本番品質の改善**。14のプロジェクト（31,840ファイル）が`plugins/rigor-activesupport-core-ext/`（オプトインRBSバンドル、総診断 −75%）、`data/vendored_gem_sigs/`（6つのネイティブ拡張gemをデフォルトで）、条件内代入のナローイング、Ractor向けの4つのディープ共有可能性フォローアップ、`Hash[K, V] <:= Enumerable[[K, V]]`射影、`CONSTANT_CONSTRUCTORS` Proc共有修正、`RbsLoader#env`失敗メモ（約550×の高速化）を駆動した。
3. **[ADR-16](../adr/16-macro-expansion/)マクロ / DSL展開基板** — フロア + 精度プロモーション着地;3つの動作消費者プラグインを持つ4ティア基板（Tier Aブロック-as-メソッド / Tier Bトレイトインライニングレジストリ / Tier C heredocテンプレート / Tier D外部ファイル契約のみ）。WD13フロアでROADMAP O2をクローズ。
4. **O4レイヤー3（スライス1+2+3）ターゲットプロジェクトRBSソースディスカバリ + DEFAULT_LIBRARIES拡張**。`Rigor::Environment::LockfileResolver`、`RbsCollectionDiscovery`、`RbsCoverageReport`、欠落gemの`:info`診断、+31のstdlibライブラリ自動ロード（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決。

v0.1.7のテーマ（タグで凍結、完全な詳細はCHANGELOG `[0.1.7]`）:

1. **[ADR-22](../adr/22-baseline-and-project-onboarding/)ベースラインメカニズム + プロジェクトオンボーディング**（提案済み;9つのワーキング決定、スライス1 + 2実装済み）。PHPStan形の`.rigor-baseline.yml`が`(file, qualified_rule, count)`スナップショットを記録し、Rigor側の調整を加える — ルールIDデフォルト + オプトインメッセージパターンモード（WD1）、ALL-or-NOTHINGバケット閾値セマンティクス（WD4）、`baseline:`設定キー経由の明示的ロードのみ（WD2（b））、最後の抑制レイヤーとしてのフィルター（WD6）、stderrサマリー行（WD7）、human-vs-tool-edit非対称性に基づくPHPStanのconfigインクルード再利用を選ばない専用スキーマ（`version: 1` + `ignored:`）の採択（WD9）。新しい`Rigor::Analysis::Baseline`値オブジェクト + `Rigor::CLI::BaselineCommand`サブコマンドルーター + `rigor check --baseline=PATH` / `--no-baseline` CLIフラグ + `.rigor.yml`の`baseline:`設定キー + JSONスキーマプロパティ**。スライス1**が`generate` + ロード/フィルタープリミティブを出荷**。スライス2**が`dump`（テキスト + JSON、`--rule` / `--file`フィルター） + `drift`（バケットごとのステータス`:within` / `:over` / `:cleared` / `:reducible`） + `prune`（クリアされたバケットをドロップ + `--dry-run`）を出荷。Specカバレッジ: 45例 / 0失敗。
2. **実世界サーベイ駆動のプラグイン / エンジン修正（Dトラック）**。5プロジェクトサーベイ（[Mastodon / Redmine / Solidus / tdiary-core / dependabot-core](../notes/20260519-oss-library-survey/)）が合計約6,697 → 3,457診断（-48%）に対する修正を駆動。主な修正: rigor-rails-routes `only:`/`except:`シンボルコアーション + 不規則複数形処理 + `root :as => 'home'`パース;rigor-actionpackのconcernトランジティブinclude + render-template拡張（HAML / Slim / JBuilder）+ rigor-rails-routesとのクロスプラグイン重複排除;rigor-activerecordの`belongs_to`が`find_by`エイリアスとして;rigor-actionmailerのprivate + before_action除外;rigor-rails-i18n CLDRの複数形名前空間;rigor-activesupport-core-extの`Object#as_json`オーバーレイ;エンジンの汎用等価メソッド（`==` / `eql?` / `equal?` / `<=>`）がarg-type-mismatchをスキップ;ロードエラーをファイルごとから実行ごとに変更;CGIエクストラRBSオーバーレイ（`include CGI::QueryExtension`）。
3. **ADR-15 Amendment — Ractorプールが使用不可として根本原因特定;フォークプールが置き換え**。CI segfaultがRactorワーカープール（ADR-15フェーズ4）をRuby 4.0.x上で使用不可と追跡: `rb_vm_ci_lookup`でのCRuby並列Ractorヒープ-use-after-free（Ruby Bug #22075として報告、クラッシュ率約70%）加えてすべてのワーカーが100%の`internal analyzer error`を出力させる決定論的な`Ractor::IsolationError`。調査は[`docs/notes/20260520-ractor-pool-cruby-uaf.md`](../notes/20260520-ractor-pool-cruby-uaf/)。新しいフォークベースのバックエンド（`Runner#analyze_files_in_fork_pool`）がアクティブな`workers > 0`パス — 別プロセスが両方の欠陥を回避;Ractorプールは`RIGOR_POOL_BACKEND=ractor`の背後に保持。Mastodon（1303ファイル）でシーケンシャルより約2倍高速、メモリセーフ、`runner_fork_pool_spec.rb`がデフォルトスイートに。既知のフォローアップ: 小さな決定論的なプール/シーケンシャル診断の乖離（ワーカープールモデルに固有のクロスファイル解析順序効果）。
4. **[ADR-23](../adr/23-diagnostic-triage-command/) `rigor triage` — 診断トリアージサブコマンド（スライス1+2実装済み）**。`check`派生のサブコマンドで診断ストリームを要約 — ルールID分布、ファイルごとのホットスポット、6つのレコグナイザーヒューリスティックヒントカタログ（ActiveSupport `core_ext` / プロジェクトモンキーパッチ / RBSなしgem / AR関係の誤推論 / 系統的クラスター / 低カウント = 本物のバグの可能性が高い）。読み取り専用かつアドバイザリー;`--format json`がADR-22オンボーディングSKILLに供給。新しい`Rigor::Triage` + `Triage::Catalogue` + `CLI::TriageCommand` + `TriageRenderer`;19のspec例。Mastodon上では489の診断を5つの実行可能ヒントに凝縮。ADR-22への伴侶（ADR-22は*何が存在するか*を記録;ADR-23は*それが何を意味するか*を説明）。スライス4の構造化`Diagnostic`フィールドの半分が着地（`receiver_type` / `method_name`が`call.undefined-method`によって投入;カタログがそれらを読み取り、メッセージパースはフォールバックに） — スライス3（SKILL統合） + スライス4のプラグインレコグナイザーフックは残り。
5. **microsoft/waza CLI + SKILL品質改善**。`microsoft/waza`（エージェントSKILL評価フレームワーク）をFlake devシェルに追加（[`5b4c179`](#)）。`waza check` + `waza quality` LLMジャッジフィードバックを通じてすべての4 SKILLを改善。`skills/rigor-plugin-author/`はプログレッシブディスクロージャー（`SKILL.md` + 4つの`references/`）に再編成 → 1430トークン（9658から）、Quality 4.67/5.0（3ジャッジの平均、4.13から向上）。その後、外部著者バリアントはv0.1.9のコミットメントになる（ADR-22 WD8に従い）ことを認識し、`.claude/skills/`に再ホーム。

v0.1.6のテーマ（タグで凍結、完全な詳細はCHANGELOG `[0.1.6]`）:

1. **ADR-12 / ADR-17 / ADR-18フロア + 動作消費者**。`rigor-dry-types`スライス1〜4（推移的を含む完全なエイリアスカバレッジ）;`rigor-dry-schema`スライス1+2（認識 + `each`リストスロット）;`rigor-dry-validation`スライス1（Contract認識 + RBSオーバーレイ）;ADR-17スライス1+2+3a+4（pre-eval配管、monkey-patchレジストリ、ディスパッチャーティア、glob）;ADR-18スライス1+2+3+5（`returns_from_arg:` DSL + エンドツーエンドdry-struct向上）。ADR-10フェーズBヒューリスティック戻り型抽出。
2. **エディタモードv1 + 言語サーバーv1/v2 + LSPポリッシュ/パフォーマンス**。`--tmp-file`/`--instead-of`ペアフラグ + `BufferBinding`;`rigor lsp`サブコマンド（8スライスv1;[ADR-19](../adr/19-language-server-packaging/)でのパッケージング）;v2型認識hover + `textDocument/completion`;LSPフォローアップ（signatureHelp + hash-key補完 + エディタガイド[`docs/lsp-integration.md`](../lsp-integration/) + e2e spec）;LSPポリッシュ（6スライス;9機能合計）;LSPパフォーマンス三冠（`ProjectScan`プレパスキャッシュ + Environment共有 + プラグインキャッシュディスクリプタ正確性修正）。設計ドキュメント: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/)、[`docs/design/20260517-language-server.md`](../design/20260517-language-server/)、[`docs/design/20260517-lsp-hover-completion.md`](../design/20260517-lsp-hover-completion/)。
3. **エコシステムプラグイン**。`rigor-graphql`スライス1+2a〜2d（Schema::Object / Enum / InputObject / Mutation;4つのクロスプラグインファクト;Tier 3D — 最後の保留中Tier 3スロットをクローズ）;`rigor-dry-schema` 1+2;`rigor-dry-validation` 1;`rigor-rails`メタgemスキャフォールド;`rigor-minitest`;`rigor-rspec-rails`;`rigor-shoulda-matchers`。合計29の`plugins/` + `examples/`エントリ。
4. **ADR-20軽量HKT**。32コミット;キャリア + パーサー + 完全な§ D3条件文法;`JSON.parse` / `YAML.safe_load` / `CSV.parse` / `CSV.read`の`METHOD_RETURN_OVERRIDES`;3つのユーザー著作パス（`.rbs`ディレクティブ / プラグインマニフェスト / ビルトイン）。ハンドブック第12章。[ADR-20](../adr/20-lightweight-hkt/)を参照。
5. **エンジン改善**。レシーバーアフィニティ事前ソート + `Acceptance`祖先チェーンフォールバック（BigDecimal/Numeric偽陽性 −25）;`StaticReturnRefinements`ティア;パラメータデフォルトスコープ修正（prism-1.9.0での偽陽性 −97%）;`Module.new`/`Class.new`ブロックウォーク;モジュールミックスインの`self_type`;クロスファイルクラス発見プレパス;`FlowContribution::Fact :local`;Pillar 2スライス1+2+3（rigor-rspecマッチャーナローイング + `let`/`subject`クロスバインディング + ファクトリモデルクラス）;RBSオーバーレイ（prism / bundler / rubygems / did_you_mean）。Referencesサーベイ（`references/ruby/lib`）1,756 → 354エラー（-80%）。
6. **Spec-suite + リポジトリレイアウト**。デフォルトで並列（`217秒 → 60秒`、12コア）;コンテンツキー化sigディレクトリ（runner_spec 39.6秒 → 25.4秒）;オプトイン共有プラグインキャッシュ（sorbet_plugin_spec 13.1秒 → 4.7秒）;リポジトリレイアウト分割（27の本番プラグイン向け`plugins/<id>/`;5つのウォークスルー向け`examples/<id>/`）。

`[Unreleased]`の進行中スライス以降の残り作業の自然なエントリーポイント:

1. **リリース候補（アクティブ）**。`[Unreleased]`サイクル（MastodonサーベイFP削減パス — フォークプール、`rigor triage`、クラスター1/2/3）は検証付きで実装完了。クラスター4 + ADR-24作業が落ち着いたら[`.claude/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.claude/skills/rigor-release-prep/SKILL.md)に従った`bundle exec rake release`が自然な出荷状態決定;明示的なユーザー承認待ち。
2. **ADR-22フォローアップスライス**。スライス5（`regenerate` + `--baseline-strict` CIゲート）は需要駆動。スライス3 + 4（外部ユーザーSKILLトリオ — `rigor-project-init` / `rigor-baseline-reduce` / 外部`rigor-plugin-author`）はWD8に従いv0.1.9にコミット済み;v0.1.7 / v0.1.8はSKILLトリオのデフォルトを設定するための実地からの実証的ベースラインデータ収集用に予約。
3. **rigor-dry-rb継続**（[ADR-12](../adr/12-dry-rb-packaging/)ロードマップ継続;スライス決定は[`docs/design/20260517-dry-validation-slicing.md`](../design/20260517-dry-validation-slicing/)）。dry-typesスライス1〜4 + dry-schemaスライス1+2 + dry-validationスライス1がすべて着地**。残り（需要駆動）**: dry-schemaスライス2+（ADR-16 Tier C経由の型付き`result.to_h`合成）;dry-validationスライス2（`:dry_schema_table`経由のparams-blockタイピング） + スライス3（`json { ... }`パリティ）;dry-monads（`Result[T, E]` / `Maybe[T]`キャリア — ADR-3修正がブロック条件）。
4. **ADR-18フォローアップスライス**。スライス4（`returns_from_arg:`の`TraitRegistry`パリティ）とチェインドコール引数拡張（`Types::String.constrained(...)` → チェインヘッド経由で解決）はいずれも需要駆動のまま。現在のフロアは標準的な著作ケースをカバーする`ConstantReadNode` / `ConstantPathNode`形を処理する。
5. **ADR-17フォローアップスライス**。スライス3b（`Cache::Descriptor::PreEvalEntry`）は測定された痛みまで先送り。スライス5（全プロジェクト2パスディスカバリ）、スライス6（プラグインAPIフック）は需要駆動のまま。
6. **gemソースからのコールごとの戻り型精度**（ADR-10ウォーカー拡張、オプションC遅延 / オンデマンド）。フェーズBフロアが着地;オプションCはコールサイトリクエスト時にgem推論を遅延配線 — ウォーカー / ディスパッチャー境界への実質的なアーキテクチャ変更、需要にゲート。
7. **rigor-graphqlの将来スライス** — リゾルバーメソッドの型チェック、`<Type>.array` / `<Type>!`チェーン形、文字列形式`field :foo, "User"`診断、`Schema.execute(...)`結果タイピング。すべて需要駆動。
8. **O4レイヤー3 gemバージョンごとのキャッシュ（スライス3アーキテクチャ）** — 測定された痛みまでDEFERRED。
9. **ADR-16需要駆動フォローアップ** — （a）**スライス5b** Tier Dエンジン統合（マッチした外部ファイルが`self_type`ナローイング + `bound_ivars`事前バインドで実行）;（b）`returns:`文字列向けの完全なADR-13 `Plugin::TypeNodeResolver`チェイン配線（`Array[String]` / `Pick<T, K>`のようなユーティリティ型形状の基板戻り値）。両方ともADR-16 §「実装スライスの脚注」にピン留め;具体的なプラグイン著者ケース待ち。
10. **エディタモードフォローアップ** — [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「v1のスコープ外」を参照。主要レバー: **ファイルごとの診断キャッシュ**（オプションA → オプションBアップグレード）と**ディスクバックの`ProjectScan`スナップショットキャッシュ**（CLIシェルアウトパス向け;設計は[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)）。両方とも需要駆動。
11. **LSPフォローアップ** — [`docs/design/20260517-language-server.md`](../design/20260517-language-server/)（v1） + [`docs/design/20260517-lsp-hover-completion.md`](../design/20260517-lsp-hover-completion/)（v2）を参照。最高レバレッジのキュー項目: （a）並列マルチバッファパブリッシュのための**Ractorプールディスパッチ**;（b）**`textDocument/definition`**（FILE:LINEキーのReflection側シンボルインデックスが必要）;（c）**インクリメンタル`didChange`同期**（UTF-16オフセットブックキーピング）。スコープ外の機能（codeAction / rename / semanticTokens / inlayHint / スニペット / ベア名 / シンボル / マルチオーバーロード / `completionItem/resolve`）はそれぞれ独自の設計パスが必要。

## オープンエンジニアリング項目

次の実装者がフルスレッドを再読することなく見ておくべき永続的な項目。リリース済みマイルストーンにすでに吸収された項目は、再記述するのではなく`CHANGELOG.md`を通じて参照されます。

### サーベイ駆動（v0.1.5サイクル、すべての項目クローズ）

14プロジェクトの実世界Railsサーベイは、v0.1.5サイクル中に3ラウンドを通じて実行されました。下記のすべての項目はクローズ（完全なまとめは`CHANGELOG.md` § `[0.1.5]`）;クロスドキュメントルックアップ用の「各IDが何か」のリファレンスインデックスとしてここに残す。

| ID | ステータス | 項目 |
| --- | --- | --- |
| O1 | 着地（MVP、v2） | トップ約50のActiveSupport `core_ext`セレクタ向けの`plugins/rigor-activesupport-core-ext/`オプトインRBSバンドル。v2はラウンド2の掃引後に`compact_blank` / `exclude?` / `index_with` / `Hash.from_xml` / `DateTime`計算を追加。 |
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

### セッション状態（2026-05-20）

1. **`origin/master`より12コミット先行、未プッシュ**。プッシュ + リリース決定はAGENTS.mdのリリースケイデンスポリシーに従いユーザーにゲートされたまま。`[Unreleased]`サイクルはMastodonサーベイFP削減パス（上記§「作業が再開される場所」を参照）。`make verify`はパス;`rigor check lib`セルフチェッククリーン。
2. **`references/rbs` PRブランチ`widen-strscan-resolv-stdlib-sigs`**は2つのstdlib-RBS拡張コミット（`StringScanner#[]`、`Resolv#initialize`）を保持 — ブランチプッシュ + 上流`ruby/rbs` PR作成はユーザーのタスク、自動的には行われない。
3. **すべてのMastodonサーベイクラスタートリアージ完了**。クラスター4（フローフォールディング警告）2026-05-21トリアージ済み — 8件すべてFP、エンジンギャップG1/G2としてキュー（[`docs/notes/20260521-mastodon-cluster4-flow-folding-triage.md`](../notes/20260521-mastodon-cluster4-flow-folding-triage/)を参照）。ADR-24（暗黙的selfコール解決）スライス1 + 2 + 3 + include/prependされたモジュール解決実装済み — クラスター1bクローズ、ADR-24祖先チェーン（WD1）完全。ADR-24残り: スライス4（ゲート付きclosed-class診断）、非`Bot`一般採用。
4. **`make verify`はデフォルトで並列**（`rake spec_parallel`）。`runner_pool_spec.rb`は両パスから除外;`RIGOR_INCLUDE_RACTOR_POOL=1`でオプトインに戻す。Ruby 4.0.4下でRactorホスト側クラッシュのため`cli_spec.rb` / `runner_pool_spec.rb`で時折ハング（このセッションの変更なしでmasterで再現可能）;フォールバックとして`bundle exec rspec`を個別実行で使う。
3. **LSPは9つのアドバタイズされた機能を出荷**（textDocumentSync / hover / completion / signatureHelp / documentSymbol / foldingRange / selectionRange + workspace/didChangeWatchedFiles + workspace/didChangeConfiguration）。キーストロークの速いリンティング + hover + completionループに対して機能完成。残りのLSP作業（codeAction / rename / semanticTokens / definition / インクリメンタル同期 / Ractorプールディスパッチ）はROADMAP §「エディタ / IDE統合」。
4. **新しいプラグインホーム**: `plugins/<id>/`（本番プラグイン、27個、実gem / フレームワークをターゲット）;`examples/<id>/`はアーキテクチャ的サーフェスウォークスルー用に予約（5個）。`rigor-plugin-author` SKILLが二重レイアウトを反映。
5. **キューされたナローイング項目:**（a）**2026-05-21クローズ** — `x = expr() or raise`はすでに`x`をnon-nilにナローイングする（`rigor type-of` / `assert_type`で確認;以前のチェックポイントは古く、v0.1.5の条件内代入ナローイングで修正済み）。そこでの残りのギャップ — `eval_and_or`が*構文的な*exit呼び出しのみを認識するため、`x = expr() or guard_helper()`（分岐するヘルパー、ベアの`raise`ではない）がナローイングしなかった — はADR-24 WD6（`branch_terminates?`）を`eval_and_or`に拡張することでクローズされた。（d）`Hash === expr` case-equalityナローイング（`open3.rb:226`の形）— 引き続きオープン。2026-05-18 referencesサーベイの項目（b）/（c）/（e）/（f）は2026-05-19セッションでクローズ。
6. **StaticReturnRefinements — 2026-05-21にキュー再検討、実行可能な項目は残らない**。`File.expand_path` / `File.dirname`は着地済み（2026-05-19セッション）。以前ここに記載されていたその他の候補はすべて古いか対象外、`rigor type-of`で確認:（a）`File.basename` → `non-empty-string`は**健全でない** — `File.basename("")`は`""`を返す — `lib/rigor/builtins/static_return_refinements.rb`で明示的に拒否（`FILE_NON_EMPTY`コメント）;（b）`__method__` / `__callee__`はすでに`Symbol | nil`を正しく推論 — 追加なし;（c）`Kernel#caller`は`Array[String]`を推論し`caller_locations`は`Array[Thread::Backtrace::Location]`を推論、どちらもまれな`nil`リターン（要求レベルがスタック深さを超えるとき）が欠けているが — `nil`を追加することは*拡大*であり、`StaticReturnRefinements`は*ナローイング*ティア（RBSが現実より広い → 絞り込む）。`caller` / `caller_locations`の`nil`ギャップは、対処するなら、ベンダーの`ruby/rbs` sigまたはRBSオーバーレイに属し、このティアではない。純益: ここに小さなタスクはない;ティアへの将来の追加は需要駆動であるべき（本物のRBS-too-broadケース）。
7. **`rigor-rails`メタgemは公開可能**;アクティベーションはTier 1+2サブプラグインのsubtree-split + RubyGems公開待ち。ADR-12 WD1に従いプラグインごとの`.rigor.yml`アクティベーションのまま。
8. **ADR-20残り作業**（すべて需要駆動）: スライス4 dry-monads `Result[T, E]`/`Maybe[T]`（ADR-3修正がブロック条件）;スライス5 `type`エイリアス糖衣構文;パターンマッチングバインダー抽出（lisp-evalマイグレーションはこれにゲート）;`METHOD_RETURN_OVERRIDES`をより多くのstdlibメソッドに拡張（需要駆動）。

### サーベイ前の永続項目

-2. **外部コードベース解析: 業務利用SDK（2026-05-18）**。`/tmp/sdks/`に浅くクローンされた3つの本番Ruby SDKに対し`rigor check lib`を実行: `facebook-ruby-business-sdk`（1,220ファイル）、`google-api-ruby-client/google-apis-core`（25ファイル）、`google-cloud-ruby/google-cloud-storage`（27ファイル、疎）。3つにわたって79エラー + 8警告をトリアージ**。表面化した実バグ**: `facebook/lib/facebook_ads/ad_objects/`の6ファイル（自動生成）に`ruby -c`さえ拒否するリテラルRuby構文エラー（`has_edge : do |edge|`）が含まれる**。解析駆動のエンジン改善**: （β）クロスファイルクラス発見プレパスが`a8932a1`で着地 — `ScopeIndexer.discovered_classes_for_paths`はすべてのプロジェクトファイルの`class Foo`宣言を歩き、プロジェクト全体テーブルをファイルごとの`default_scope`にシードする、google-cloud-storageの5つの偽陽性`singleton(File)`エラーをクローズ（`Google::Cloud::Storage::File`はstdlib `::File`を覆い隠すユーザー定義クラス）。モジュールはシードから意図的に除外（rigorセルフチェックが、モジュールを登録すると別個の`module_function`フォールスルー制限が表面化することを露呈;キューされたフォローアップとして文書化）**。キューされたエンジン項目**（まだ実装されていない）: （α）クロージャ内の`x ||= expr`非Nilナローイング — 4つのgoogle-apis-core偽陽性が観察された（`proc do |chunk|`ブロック内で`||= 0`後に`download_offset`が`nil`として読まれる）;単純ケースの再現器は正しくナローイングするので、失敗モードはより深い調査を要するネストされたクロージャ相互作用が関与。クロスファイル`discovered_methods`プレパス（メソッド用の（β）のミラー）はmodule_functionサポートとクロスファイル呼び出しでのユーザー定義メソッド偽陽性のさらなるクローズをアンロックする。

-1. **外部コードベース解析: Steep 2.0.0（2026-05-18）**。`tool/steep/vendor/bundle/ruby/4.0.0/gems/steep-2.0.0/lib`（141ファイル）に対し`rigor check lib`を実行 — 28ファイルにわたって107の診断（92エラー + 15警告）を表面化。カテゴリ別にトリアージ: (A) 36 × Struct.newの動的クラス生成がモデル化されていない;(B) ~6 × `is_a?(RBS::AST::Declarations::Base)`の抽象基底へのナローイングがミックスインメソッド（`annotations`、`location`）を隠す;(C) ~7 × `x = foo or raise`イディオムを通じた代入の`or` / `||`ナローイングが伝播されない;(D) ~5 × クロージャーブロック変異が伝播されない（下記項目0と同じ根本 — `each { flag = true }`、`OptionParser#parse!`キャプチャ変異をカバー）;(E) ~10 × **実Steepのdead-assignmentバグ**（`type_construction.rb`のL656、L2875、L2878、L5077のリファクタ残り;また`goto_service`、`content_change`、`source`、`locator`、`ast/types/helper`、`ast/types/name`）;(F) ~40+ × RBSカバレッジギャップ（Steepはgemに`sig/`を出荷しない）**。観察されたキューされたエンジン改善**（何もスケジュールされていない — すべて需要駆動）: (C) `x = foo or raise` / `x = foo || raise`イディオムの**`or`での代入ナローイング** — 中程度の実装（`Inference::Narrowing#analyse_or`拡張、`assignment_to_local? && non_returning?` LHS+RHSペアを検出し、真偽スコープの書き込みターゲットをRHSのfalsey部分を除去してナローイング）。需要測定: `rigor lib/`に0出現、`examples/`に0、`spec/`に0;Steepに7。内部需要はプロジェクトの「需要駆動」バーより低い — 実装するのではなく記録してキュー**。実Steep発見**（カテゴリE）はrigor変更ではなく上流レポート;`Ruby::UnusedLocal`がデフォルトで`:hint`未満であるため、Steep自身の寛容プロファイルはそれらを見逃す — rigorの`flow.dead-assignment`ルールが`:warning`深刻度で、Steepのデフォルトプロファイルが同じイディオム上でより強力なバグサーフェスパワーを持つというデータポイント。

0. **セルフ解析: `flow.always-truthy-condition`のためのループ変異追跡（キューされたエンジン改善）**。bool多相性 + HashShape-narrowing修正（コミット`7c4efce` + `dd917b5`）後の`rigor check lib`は依然として3つの警告を表面化、すべて同じ形: `arr = [seed]; while ...; arr << x; end; if arr.size == N` / `arr.empty?`が常に真として報告される、`Inference::Narrowing`がループ本体の`<<` / `push`変異をsize/empty narrowingに反映しないため。影響を受けるサイト: [hkt_body_parser.rb:140](https://github.com/rigortype/rigor/blob/main/lib/rigor/inference/hkt_body_parser.rb#L140)、[hkt_body_parser.rb:307](https://github.com/rigortype/rigor/blob/main/lib/rigor/inference/hkt_body_parser.rb#L307)、[hkt_registry.rb:212](https://github.com/rigortype/rigor/blob/main/lib/rigor/inference/hkt_registry.rb#L212)。修正は`docs/type-specification/control-flow-analysis.md` §「mutation effects」下の変異エフェクトモデルに存在 — おそらく中程度のエンジン変更。具体的な需要が表面化するまでキュー（ここの警告が需要シグナル;既存のサイト数はエンジンコストが払われる必要があるほど小さい）**。Update 2026-05-21**: Mastodonクラスター4トリアージ（[`docs/notes/20260521-mastodon-cluster4-flow-folding-triage.md`](../notes/20260521-mastodon-cluster4-flow-folding-triage/)）がこのまさに同じ形のさらに3つの`loop/retry`警告（ギャップ**G1**）に加え、姉妹ギャップ**G2** — ivarの型がそのリテラル書き込みから取られ、介在するメソッド呼び出し / インプレースの`<<` / 書き込み前読み取り`nil`によって無効化されない — を追加する。G1 + G2は`control-flow-analysis.md` §「mutation effects」のホームを共有;引き続きキュー**。Update 2026-05-21**: Mastodonクラスター4トリアージ（[`docs/notes/20260521-mastodon-cluster4-flow-folding-triage.md`](../notes/20260521-mastodon-cluster4-flow-folding-triage/)）がこのまさに同じ形のさらに3つの`loop/retry`警告（ギャップ**G1**）に加え、姉妹ギャップ**G2** — ivarの型がそのリテラル書き込みから取られ、介在するメソッド呼び出し / インプレースの`<<` / 書き込み前読み取り`nil`によって無効化されない — を追加する。G1 + G2は`control-flow-analysis.md` §「mutation effects」のホームを共有;引き続きキュー。

1. **sig-genの`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — `Foo::Bar`と`Foo::Bar::Child`の両方の宣言がフラットな兄弟としてすでに存在する場合、sig-genはそれらをフラットなままにする。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。
2. **インメモリの`Analysis::Runner.run_source`エントリーポイント（テスト専用のパフォーマンスフォローアップ）**。`RunnerHelpers#analyze`テストヘルパーは呼び出しごとにtmpdirを実体化する（ソースファイル書き込み、chdir、実行、クリーンアップ）。呼び出しごとに約25〜50ms × 数百のrunner-spec呼び出しで、これはインメモリエントリーポイントが削除できるスイートwall-clockの実質的なシェア。スケッチ: パス展開をバイパスし`{path => bytes}`仮想ファイルテーブルを受け入れる`Runner.run_source(source:, path: "code.rb", environment:, config:)`を追加する。ヘルパーは`analyze(source: "...")`形状（ファイル / sigなし）に対してそれを呼び出す。期待される差分: シーケンシャル約5%、並列約3% — 単独で行う価値はないが、テストスイート拡張が続けば自然な補完。
3. **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリーを処理する;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。実装スケッチ: `Runner#run`がファイルチャンクごとにワーカーをフォークし、各々がパイプに診断を書き、親が元のパス順序で再構築する。

## 復帰する実装者のための読書順

次のセッションのデフォルト目標は、ADR-12 / ADR-17 / ADR-18すべてがフロア + 動作消費者状態にあるため、**v0.1.6リリースをカット**するか、または上記の自然なエントリーの1つで**サイクルを継続**するかのいずれか。この順序で読んでください:

1. `CHANGELOG.md`の`[Unreleased]`セクション — v0.1.6の作業が着地するにつれて蓄積される。
2. [`docs/ROADMAP.md`](../roadmap/) §「v0.1.6 — `master`に蓄積中」 — サイクルのADR-12 / ADR-17 / ADR-18エンベロープ。
3. [`docs/adr/12-dry-rb-packaging.md`](../adr/12-dry-rb-packaging/)、[`docs/adr/17-monkey-patch-pre-evaluation.md`](../adr/17-monkey-patch-pre-evaluation/)、[`docs/adr/18-substrate-per-call-site-return-type.md`](../adr/18-substrate-per-call-site-return-type/) — 3つのv0.1.6 ADR（12 accepted、17 accepted、18 proposed-and-implemented）。
4. [`docs/adr/16-macro-expansion.md`](../adr/16-macro-expansion/) — ADR-18が修正する基板;既存のスライスプラン + WD13に対して方向付ける。
5. [`docs/adr/9-cross-plugin-api.md`](../adr/9-cross-plugin-api/) — `Plugin::FactStore`はADR-18が読み取る / `rigor-dry-types`が書くチャネル。
6. [`docs/adr/10-dependency-source-inference.md`](../adr/10-dependency-source-inference/) — ADR-10ウォーカー（gemソース推論）;ヒューリスティック戻り型抽出器（`フェーズB`、`e40947c`）は`ProjectPatchedScanner`で再利用される。
7. [`plugins/README.md`](https://github.com/rigortype/rigor/blob/main/plugins/README.md) — 本番プラグインカタログ（Rails Tier 1/2/3、テストマッチャー、dry-rb基礎、ADR-16基板消費者、クロスプラグインファクトチャネル表）。[`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 5つのプラグイン契約ウォークスルー（`rigor-deprecations` / `rigor-lisp-eval` / `rigor-pattern` / `rigor-routes` / `rigor-units`） + アーキテクチャ的サーフェスマップ。リポジトリレイアウト分割はコミット`ae1b1c9`（2026-05-19）で着地;根拠については上記の2026-05-19セッション終了の繰り越しを参照。
8. [`docs/notes/20260515-real-world-rails-survey.md`](../notes/20260515-real-world-rails-survey/) — v0.1.5の本番品質改善を駆動したサーベイ;次のバッチの実世界プロジェクトが解析されるときも依然権威的。
8a. [`docs/notes/20260519-oss-library-survey.md`](../notes/20260519-oss-library-survey/) — v0.1.6の`OverloadSelector`レシーバーアフィニティ事前ソート + `Acceptance`祖先チェーンフォールバック（ファミリー3 / BigDecimal-coerce回帰）を駆動した22 OSSライブラリサーベイ。他の5つの診断クラスター（§3b mixinルックアップ / §3cガード経由のnilナローイング / §3d常にfalsey-truthyノイズ / §3g ivar型乖離 / §8aジェネレーター`.rb` ERB）はキューのまま;このノートはライブラリごとのカウントを記録し、次のスライスがデータを手元に持って選ばれるようにする。
9. [`docs/adr/15-ractor-concurrency.md`](../adr/15-ractor-concurrency/) + [`docs/design/20260514-ractor-migration.md`](../design/20260514-ractor-migration/) — Ractor移行契約;共有可能性レビューを必要とするプラグインサーフェスを追加するときに関連（ADR-18はパスだった）。
10. [`skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/main/skills/rigor-plugin-author/SKILL.md) — 新しいプラグインを作成するためのプレイブック（`rigor-dry-types`スライス1のテンプレートとして使用）。
11. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。
12. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)と[`docs/adr/7-v0.1.0-slice-decisions.md`](../adr/7-v0.1.0-slice-decisions/) — v0.1.xが拡張するv0.1.0プラグイン契約の拘束力のある設計とスライスごとの作業上の決定。
13. [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)作業上の決定 — OQ1 / OQ2 / OQ3の結果がプラグインが消費する型オブジェクトパブリックサーフェスを引き続き拘束する。

一般的なフォローアップ作業を開始するためのキーサーフェス:

- **ADR-18基板修正**: `lib/rigor/plugin/macro/heredoc_template.rb`（Emit + ReturnsFromArg）、`lib/rigor/inference/synthetic_method_scanner.rb`（`resolve_emit_return_type` + `argument_source_representation` + `resolve_returns_from_arg`）、`lib/rigor/analysis/runner.rb#run`（プラグインprepare再順序付け + `shared_fact_store`）。
- **ADR-17事前評価パイプライン**: `lib/rigor/inference/project_patched_methods.rb`（レジストリ）、`lib/rigor/inference/project_patched_scanner.rb`（プレパス + 重複宣言）、`lib/rigor/inference/method_dispatcher.rb#try_project_patched_method`（ディスパッチャーティア）、`lib/rigor/configuration.rb#expand_pre_eval_entries`（スライス4 glob）。
- **ADR-12 dry-rb基礎**: `plugins/rigor-dry-types/lib/rigor/plugin/dry_types.rb` + `dry_types/alias_scanner.rb`（正準 + ネスト + コンポジション）;`plugins/rigor-dry-struct/lib/rigor/plugin/dry_struct.rb`（`:dry_type_aliases`の消費者マニフェスト）。
- **O4 Bundler-awarenessサーフェス（v0.1.5以降変更なし）**: `lib/rigor/environment/bundle_sig_discovery.rb`、`lib/rigor/environment/lockfile_resolver.rb`、`lib/rigor/environment/rbs_collection_discovery.rb`、`lib/rigor/environment/rbs_coverage_report.rb`。
