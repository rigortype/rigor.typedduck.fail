---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "37793f390c3251b905966711fc23ee8f592849e39f703570d787590eb88b119f"
sourceCommit: "dd7f6dc8daf0b115fb4f9e44f67eb21008e1456d"
sourceDate: "2026-06-15T10:05:19+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.2.0リリース済み（2026-06-17）—— 最初の公式発表（一般 / 評価）リリース**であり、[ADR-50](../adr/50-release-engineering-and-stability-strategy/)が統制する。列挙されたパブリック互換性サーフェス（[`docs/compatibility.md`](../compatibility/)）をマイナー非破壊の*試行*として公開する（v1.0.0のハードフリーズのリハーサル）。このカットのテーマは検出の**「歯（teeth）」** + 保護カバレッジだ: `call.undefined-method` / `call.argument-type-mismatch`は、かつてはbailしていたユニオン（union、合併型とも）・リファインメント（refinement、篩型とも）・多重オーバーロードのレシーバーについて今や推論する（[ADR-62](../adr/62-mutation-testing-teeth-measurement/)のミューテーションハーネスが表面化させ、[ADR-63](../adr/63-type-protection-coverage/)の`rigor coverage --protection`が計測する）、加えてより広い定数fold、定義済み定数のリファインメント、`Struct.new`値fold（[ADR-48](../adr/48-data-struct-value-folding/)）、そしてエージェント向けの診断メタデータ（`evidence_tier` + `documentation_url`、[ADR-65](../adr/65-diagnostic-evidence-tier-and-doc-url/)）。それに先行する手続き的Rubyの精度作業の蓄積 —— メソッド呼び出しの戻りフロー（[ADR-57](../adr/57-self-call-return-adoption/)）、再帰戻り値（[ADR-55](../adr/55-recursive-return-precision/)）、ブロック/ループのキャプチャされたミューテーション（[ADR-56](../adr/56-block-captured-local-mutation/)）、ivar-nilバッチ（[ADR-58](../adr/58-ivar-field-typing/)）—— はv0.1.19、最後のプレビューカットで出荷された。**完全な記録は`CHANGELOG.md` § `[0.2.0]`と § `[0.1.19]`にある;ここで再要約しないこと。**

`make verify`はクリーン。ラインは今や**`0.2.x` —— 評価**だ: 外部からのフィードバックを集め、計画された機能セットを高い完成度へ持っていく。道は**v1.0.0**、ハードな契約フリーズ（[ADR-50](../adr/50-release-engineering-and-stability-strategy/)）を指している。[`docs/ROADMAP.md`](../roadmap/) §「Release strategy」を参照。

**リリースゲートのベースラインはv0.2.0カットで再較正された**（`bench/baseline.json`のパフォーマンスターゲット + `data/oss-sweep/mastodon-thresholds.json`）: 機能サイクルで蓄積したアロケーション / RSS増加と、歯に駆動されたMastodonの診断増加（`app lib config`で445 → 468、精度は42.84 %で不変）は容認された;再較正の検証が表面化させた3件の`StringScanner#[]`偽陽性は根本で修正され（`data/core_overlay/string_scanner.rbs` —— rbs 4.0.2の名前付きキャプチャオーバーロードのギャップ）、しきい値へは**容認していない**。再較正の規律 + StringScannerギャップの教訓は下記のGotchasにある。

ヘッドラインのリアリズム（**v0.1.12のOSSリアリズムカット** —— このツールを実コードで信頼に足るものにした偽陽性削減の成果;これらは偽陽性削減のフロアであって、今日の正確なカウントではない —— v0.2.0の検出の歯は、精度を変えずにこれらのコーパスで表面化するカウントを意図的に*引き上げる*）:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

## 次セッションのエントリーポイント

> **▶ v0.2.0は出荷済み;ラインは今や`0.2.x` —— 評価であり、v1.0.0へ向かう**。進行中のリリースはない。次の実装者はエンジン精度のキュー（M3 / メンバーシェイプの弧、またはゲートなしの型カバレッジ作業）か、`0.2.x`評価ラインのタスクから選ぶ。`make verify`はクリーン。
>
> **（A）エンジン精度 —— M3 / メンバーシェイプの弧（キュー済み・ゲート順;2026-06-16に留保付きで先送り —— 順序を違えて着手しないこと）:**
> 1. **[ADR-67](../adr/67-parameter-type-inference/)の`check`ウォーク配線** —— ADR-66/68が実アプリで効くための前提条件。WD1+WD3+WD5は着地済み（呼び出しサイトでのパラメータ型推論（parameter type inference） + 上限付き不動点、`coverage --protection`のみに配線）;残るステップは`param_inferred_types`をメインのcheckウォークに供給することで、ウォーク前の収集（予算ゲート付き、おそらくオプトイン / インクリメンタル裏付け）に加え、WD1の本体内由来（provenance）**マーク** + 診断ガードを要する。**価値は不透明だ** —— WD1の抑制によってfold精度のみとなり、下流の偽陽性を表面化させればネットでマイナスになりうるため、具体的な需要が現れるまで先送りが妥当なままかもしれない。**エンジンのエントリーポイント（ウォームコンテキスト）:** 収集は`ScopeIndexer.discovered_*_for_paths`に乗る;再利用する戻り値メモは`9a3d6f5c`（[ADR-57](../adr/57-self-call-return-adoption/)）;パラメータは`lib/rigor/inference/method_parameter_binder.rb:203`（`default_types_for`）でデフォルト`untyped`。
> 2. **[ADR-68](../adr/68-class-builder-folding/)のビルダー畳み込み** —— #1にゲートされる（パラメータ推論なしでは見返り~0、faradayで計測済み）。**三度のウォーク・二段階**の変更だ: 2つのサイドテーブル（`struct_member_layouts[Const]` + `discovered_classes[Const] = Singleton[Const]`、さもないとStructFolding層が決して発火しない）に加え、`collect_class_decls`へのスーパークラスのスレッド + レシーバー名解決 + 推移的な`< Struct`チェック。偽陽性に安全な部分的選択肢は、完全なスーパークラスのシードを既に持つファイルごとの2経路での同一ファイル限定の認識だ。ADRの「Corrected scope」補遺を参照。
> 3. **[ADR-66](../adr/66-discriminated-union-member-typing/)のタグナローイング** —— 同じゲート、より難しく（tag⇒payloadマップ + ビジターディスパッチ）、ADR-58より下位にランクされる。3つのうち最も優先度が低い。
>
> **（B）ゲートなしのエンジン精度（リリース / M3依存なし）:**
> - **type-coverage-uplift** —— より多くのビルトインメソッドを精密な型へfoldする（`rigor-type-coverage-uplift`スキル）。2026-06-17に3スライスが着地: `Range#first(n)` / `#last(n)` / `#take(n)` → `Tuple`、`Array#minmax` → `Tuple[min, max]`、`String#codepoints` → `Tuple`。**教訓:** 2026-05-22のカバレッジドキュメントは🔲ギャップを過大報告する（カタログの`leaf`パスがほとんどのスカラーメソッドを自動foldする）—— 実装前に`MethodDispatcher.dispatch_precise_tiers`を経験的にプローブすること;本当のギャップは、Tuple昇格ハンドラ + キャリアの`*_HANDLERS`エントリーを要するArray / 構造を返すメソッドに集まる。
> - **[ADR-47](../adr/47-narrowing-driven-clause-reachability/) WD3b** —— 分解 / 値 / 変数キャッチオール（catch-all）パターンの`case`/`in`網羅性（ゼロ発火のWD4スイープにより優先度引き下げ;アドホックに推論しないこと）。
>
> **（C）`0.2.x`評価ライン + [ADR-50](../adr/50-release-engineering-and-stability-strategy/)の残り:**
> - 外部からのフィードバックを集める（評価ラインの目的）;[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」の需要駆動バックログが`0.2.x`の完成目標だ（Ractor並行性トラックを除くすべて）。
> - **ADR-50の残りWD:** サポートラインモデル（WD5 —— 最新 + 1つ前のマイナー）、`rigor upgrade`マイグレーションコマンド（WD7、具体的なBCが対象を与えるまで先送り）、そして次のメジャー境界の規律がキューに入ったときの最初の**bleeding-edge `FEATURES`エントリー**（オーバーレイは今日時点で空 —— `Rigor::BleedingEdge`、`bleeding_edge:`設定キー、`rigor show-bleedingedge`、`rigor check --bleeding-edge[=ids]`はすべて配線済み;最初の規律は単一の`FEATURES`エントリーとして着地し、エンジン配線は不要）。
>
> **▶ [ADR-48](../adr/48-data-struct-value-folding/)の`Struct`値fold —— スライス1 + 2 + 3が2026-06-15に着地;スライス4は完全な設計とともに先送り**（セッターを通じた変更されたメンバーの精密な再型付け;ルートaの書き戻しをスライス3で証明されたno-alias/no-escapeケースに絞ったもの、設計は[`docs/notes/20260615-struct-folding-slice3-design.md`](../notes/20260615-struct-folding-slice3-design/)）。`Data.define`はスライス1〜4を出荷した（v0.1.17）。残るより小さな項目: `Data.define`の素のローカルブロック形式のパリティ（`c = Data.define(:x) do … end` —— リーダー再定義ガード用の解決可能なクラス名なし、保守的にbail）。
>
> check-rulesルート経由でADR-24スライス4を**再起動しない**こと（2026-06-05にリバート済み、135件の偽陽性 —— 着地済みのルートは評価時の`SelfCallResolutionRecorder`）。`Runner#initialize`のivar事前シードをヘルパに**抽出しない**こと（エンジン自身のフロー解析からそれらが隠れる → self-check偽陽性;「Gotchas」を参照）。`make verify`クリーンのシグナルだけでユニオン / nilableレシーバーの診断を**広げない**こと —— `rigor-survey`コーパスに対してゲートすること（外部コードは誤って型付けされたレシーバーの偽陽性を露呈する;「Gotchas」を参照）。再帰的な`always-truthy`の相互作用を最初に解決せずに、シェイプキャリアを`freeze` / `dup`を通して**保たない**こと（[`docs/notes/20260614-precision-foldgap-recon.md`](../notes/20260614-precision-foldgap-recon/)）。

### 参照読書

1. [`docs/ROADMAP.md`](../roadmap/) §「Release strategy」—— `0.2.x`評価ラインとv1.0.0フリーズへの道のり（ADR-50が統制する）。
2. [`docs/adr/50-release-engineering-and-stability-strategy.md`](../adr/50-release-engineering-and-stability-strategy/) —— v0.2.0→v1.0.0のリリース / QA契約（互換性サーフェス、診断の非契約 + bleeding-edge、パフォーマンスゲート、サポートライン、昇格ケイデンス）。
3. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.1.17]` —— 出荷済みのパフォーマンス / インクリメンタル / 診断サイクル;§ `[0.1.16]`はプラグイン契約スイート + ADR-43;§ `[0.1.12]`はOSSリアリズムサイクル。
4. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) —— パブリック対内部の安定性境界（ADR-50 WD1がそれを列挙する）;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。

## Gotchas（load-bearing、苦労して学んだもの）

- **ADR-46** —— `Runner#initialize`のivar事前シード（`@class_decl_paths_snapshot = {}`等）をヘルパに抽出**しない**こと;コンストラクタの外に移すと、エンジン自身のフロー解析からそれらが隠れ、`make check`が`snapshot.size`をnil-receiver偽陽性として自己フラグする。インラインに保つこと（コンストラクタは`AbcSize`のdisableを持つ）。
- **ADR-45** —— `@collect_stats`はデフォルトで真（キャッシュをこれでゲートできない;ヒットはnil統計を返す）;フリーズ済みプラグインへの遅延`@io_boundary ||=` → `FrozenError`（`instance_variable_get`を使う）;キャッシュの書き込み / シリアライズ失敗は握り潰される（実行を決して壊さない）。
- **ADR-24** —— セルフ呼び出し解決のcheck-rules*再実装*は、エンジン実際の解決（精度のために`module_function` / `Data.define`アクセサ / mixinを既に処理する）から乖離する → 135件のFP（リバート済み）。着地済みのルートは評価時`SelfCallResolutionRecorder`（「collect, don't recompute」）。
- **ADR-62 / ADR-63** —— `make verify`がゲートするのは`lib` + `plugins`のみ;**外部コーパスは依然として偽陽性を露呈しうる**、Rigorが誤って型付けするレシーバーから。ユニオン/nilableのundefined-methodルールはスカラールールの「推論された型と同程度にしか良くない」露出を継承する —— nilableスタディはmailでの`Hash | Hash`#pack FPを捕捉した（`compose_codepoints`が`Array`を誤って型付けした）。ユニオン / nilableレシーバー上のいかなる診断拡張を信頼する前にも、`rigor-survey`コーパス差分（`cd $proj; BUNDLE_GEMFILE=$rigor/Gemfile nix develop $rigor -c bundle exec $rigor/exe/rigor check --format json $paths`）を実行すること。さらに: 推論スキャナ（`PrecisionScanner` / `ProtectionScanner`）は`require "rigor"`で自動ロードされない（そのspecがそうするように明示的にrequireすること）;rubocopは注釈付きの`%<name>s`フォーマットトークンを強制する;そして`Data.define(:method, …)`メンバーは`Data#method`をシャドウする（`:method_name`を使う）。
- **bench-perf** —— Makeターゲットは`bench`ではなく`bench-perf`（素の名前は`bench/`データディレクトリと衝突する;ファイルは`.PHONY`なしの規約を保つ）。リリースゲートは**必須**（アドバイザリーではない）。両方のベースラインは**機能サイクルごとに再較正される** —— `bench/baseline.json`のパフォーマンスターゲット + `data/oss-sweep/mastodon-thresholds.json`;v0.2.0カットはlibのアロケーションを≈1877万 / ピークRSS ≈232 MB / 壁時計13.75秒に、Mastodonの`app lib config`を468診断・最小精度0.4284に設定した。これらは余裕の少ない厳密カウント / 帯ゲートなので、精度やアロケーションの変化は設計上、**再較正されるまで**赤にフリップする。パフォーマンスは失敗した実行のログ内の**CIで計測されたLinux値**から再較正すること（アロケーションが決定論的なシグナル;wall_sはノイジー —— `gh run rerun --failed`が壁時計のみのフレークを片付ける）、そして**より高いカウントを容認する前にOSSスイープの診断を偽陽性についてdiffすること**（v0.2.0の再較正は3件の`StringScanner#[]`偽陽性を発見 → `data/core_overlay/string_scanner.rbs`経由で修正、しきい値へは容認していない）。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログは[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」にある。

### ADR-52 — コンパイル済みプラグイン貢献ディスパッチ（完了 —— スライス1〜6が2026-06-10/11着地）

呼び出しごと / defごと / ファイルごと / ノードごとのすべてのプラグイン参照は、レジストリ構築時に実行ごとに一度コンパイルされるテーブルを介して、エンジンが既に保持する鍵でゲートされる —— プラグインコードは候補ヒット時にのみ走る。5つすべてのレガシー`flow_contribution_for`ユーザーが移行し（ARの「receivers-ゲートブロッカー」は**新しいゲート形式なしで**解決された —— ランタイムの`methods:` callableはレシーバー型を決して読まないので、既存のスライス4ゲートに適合する）、フックは**削除され**（ロード時`ArgumentError` + CHANGELOG移行ノート）、そしてエンジン所有の単一の`Plugin::NodeRuleWalk`がファイルごとに走る。スライスごとの完全な記録（コミットハッシュ、解決されたARブロッカー、委譲の教訓）は[ADR-52](../adr/52-compiled-plugin-contribution-dispatch/) + [`docs/ROADMAP.md`](../roadmap/) §「compiled plugin contribution dispatch」にある。需要ゲートの残り物のみ: ノードメジャー診断の再ソート（取らない —— バイト同一性を壊す）、そしてプロファイルがレシーバー祖先ウォークがホットだと示した場合の厳密メンバーシップSetゲートの精緻化。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4（レコーダー + `call.self-undefined-method`ルール、`:off`で出荷）—— 着地済みv0.1.17;WD4コーパスFP評価は2026-06-14に完了 → ルールは`:off`のまま、昇格不可**（[ノート](../notes/20260614-adr24-slice4-self-undefined-fp-eval/)）。評価は普遍ベース除外（バケット1、`Object`/`BasicObject`/`Kernel`、287件のコーパスFP）を着地させたが、**抽象 / テンプレートメソッドの基底クラスパターン**（バケット2、167件）が現在のクラスごとのゲートでは対処不能なFPであることを見出した。抽象ベースのFPが解決されるまで、**スタンドアロンのみのゲートをスーパークラス / includeチェーンへ拡張しない**こと —— 必要な形は**サブクラス認識ゲーティング**（見逃したメソッドが既知のサブクラスに定義されているかをレコーダーで記録し、そうなら抑制する）だ。解決されたclosed-classセルフ呼び出しに対する**arity診断**はスライス4の一部では**なかった**（undefined-methodのみ） —— ルールが実績を積んだ後の後続拡張。
- **クラスボディ内の非`Bot`一般採用** —— 解決されたセルフ呼び出しの戻り値型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた（既存の呼び出し先戻り推論の不精度が下流で表面化した）;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ARスコープボディのラムダ`self`

`scope :x, -> { select(...).group(...) }`のインスタンスラムダ内で、ラムダの`self`がモデルクラスにリバインドされる必要が依然ある。v0.1.12は通常のメソッドボディに対する暗黙的selfのクラス側解決をクローズした;ラムダボディは残る（ADR-26領域）。経験的なケースは[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「What is increasing」項目2にある。

### ADR-23 — `rigor triage`スライス4プラグイン認識器

残り: プラグインが自身の認識器（recognizer）を貢献できる`Plugin`フック（先送り）。（構造化された`receiver_type` / `method_name`フィールド + SKILL統合はv0.1.8 / v0.1.9サイクルで出荷。）

### 推論バジェット — 仕様表は未配線（Layer 1ドキュメント衛生は完了）

仕様の設定可能な`budgets:`表（[`docs/type-specification/inference-budgets.md`](../type-specification/inference-budgets/)）はv1向けに規範的でありながら**配線されていない** —— 実際に効いているカットオフは、ハードコードされた3つのサイレントガード（再帰の再入≈深さ1、祖先ウォーク100、HKT fuel 64）とADR-10の`budget_per_gem`だけ。**Layer 2は解決済み、そしてそれはバジェットではなかった:**大規模アプリのコストの崖は`rigor-activerecord`の4.2 M保持Stringリーク（v0.1.16で修正）で、`union_size`はメモリと無相関と反証された。バジェット配線は**需要先送り** —— バジェット型のコストを示すコーパスプロジェクトは存在しない;もし現れたら、まず2aの分布プローブを再実行する（[ADR-41 WD3](../adr/41-inference-budget-design/)）。`RIGOR_BUDGET_TRACE` / `RIGOR_HEAP_PROFILE` / `RIGOR_HEAP_TRACE`プローブは再利用可能。

### Stdlib RBSカバレッジギャップパターン + ステージ済みの上流PR

上流の`ruby/rbs`ギャップが単一の内部呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable` + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードでは、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）はステージ済み —— **ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク**。

### Sig-gen（ADR-14）残りギャップ

`initialize`以外のソース（DB読み取り、設定、副作用）からivarが設定される`attr_reader`は依然`:untyped_return`を生成 → 手書きのsig。untypedレシーバーへの深いチェーンは`rbs collection install` / ADR-10の`source_inference:`。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグイン。`update_existing`は兄弟の親/子クラスブロックを畳み込まない（回避策: ターゲットsigを削除 + 再生成）。`skills/rigor-project-init/references/04-sig-uplift.md`に記載。

### ADR-49コーパス経済フォローアップ（オプション）

2026-06-05のコーパス監査は、過剰情報がコーパスの唯一の系統的ドリフトであることを見出した;ADR-22のSKILLスケッチ肥大はトリミングされた（v0.1.17）。ADR-1 / ADR-16が残る長さの外れ値だが、その長さは監査によれば「弁護可能」（高ステークス）で、抽出は基礎的な根拠を分断するため —— **割に合わない**と評価、完全性のために記録、キューには入れない。
