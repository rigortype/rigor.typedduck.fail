---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "33d3ec15658c7c4a59c23b61bde25922970c79a89a2f77bb7258f376b9c64435"
sourceCommit: "c64342708cd0effeb20265e84fe912ae22635159"
sourceDate: "2026-06-05T16:31:02+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.17リリース済み（2026-06-06）**。フォーカスはv0.2.0への道のりで、まずもう1つテーマ別のプレビューカットが計画されている —— **v0.1.18（CI環境サポート）**、そのコアは今や`master`に**着地した**（まだ未リリース）: [ADR-51](../adr/51-ci-diagnostic-output-formats/) —— 6つの`rigor check --format` CIネイティブレンダリング + ランタイムCI自動検出 + CIセットアップテンプレート + `rigor-ci-setup`スキル。残りのv0.1.18作業は**リリースカット自体**（`rigor-release-prep`、承認でゲート）と需要ゲートのフォローアップ。[`ROADMAP.md`](../roadmap/) §「v0.1.18 — CI-environment support」を参照。

v0.1.17サイクル（内部構造レビュー + パフォーマンスチューニング）が出荷したもの: インクリメンタル解析（`rigor check --incremental`、[ADR-46](../adr/46-incremental-dependency-graph/)）、未変更プロジェクトの高速パス（[ADR-45](../adr/45-unchanged-project-fast-path/)）、大きなアロケーション（allocation）削減（[ADR-44](../adr/44-dispatch-allocation-churn/)）、Elixir v1.20着想のナローイング（narrowing）（`Array`非空 + `Hash`キー存在）+ `flow.unreachable-clause`（[ADR-47](../adr/47-narrowing-driven-clause-reachability/)）、`rigor:v1:conforms-to`ディレクティブ、`call.self-undefined-method`ルール（`:off`で出荷、[ADR-24](../adr/24-self-method-call-resolution/)スライス4）、`Data.define`値fold（[ADR-48](../adr/48-data-struct-value-folding/)）。完全な記録は`CHANGELOG.md` § `[0.1.17]`にある;ここで再要約しないこと。

v0.1.17はまた**v0.2.0への道のりのためのリリースエンジニアリング機構**も着地させた（ユーザー向けCHANGELOGには意図的に*入れていない* —— プロセス / CI / ドキュメントだから）: [ADR-49](../adr/49-adr-authoring-guidelines/)（ADR執筆ルーブリック + `rigor-adr-author`スキル + コーパス監査ノート[`docs/notes/20260605-adr-corpus-rubric-audit.md`](../notes/20260605-adr-corpus-rubric-audit/)）;**[ADR-50](../adr/50-release-engineering-and-stability-strategy/)**（リリースエンジニアリング + 安定性戦略、v0.2.0→v1.0.0、PHPStanをモデルにしたもの）;`release/x.y.z`ブランチワークフロー + `release-gate.yml`（アドバイザリー）+ `make bench-perf`パフォーマンスゲート;および`rigor-release-prep`スキルのブランチ + リリースサマリーの規約。**v0.1.17はこの機構上での最初のリリースカット**であり —— これがエンドツーエンドで検証された（リリースゲートがカット途中で実際の設定クラッシュバグ、`source_inference: false`クラッシュを捕捉;同じリリースで修正）。

ヘッドラインのリアリズム数値（v0.1.12のOSSリアリズムカット時点で計測;依然有効——後続のカットは新しいフルサーベイではなくオンボーディング / `def.override-*` / プラグイン契約スイート / パフォーマンスを追加した）:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

Mastodonの残り6件のエラーはエンジン精度とは無関係: 5件はテストフィクスチャ内のnil-receiver + 1件は上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（narrowing）ギャップ（[`docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md`](../notes/20260528-rbs-upstream-pr-resolv-typeclass/)を参照）。

## 次セッションのエントリーポイント

> **フォーカスはv0.2.0への道のりで、[ADR-50](../adr/50-release-engineering-and-stability-strategy/)が統制する**。機構はv0.1.17で出荷した;残るのは**その較正 + 堅牢化**、ADR-50の段階的実装、そして常設のエンジンバックログ。`make verify`はクリーン。
>
> **（A）リリースエンジニアリング + CI —— ADR-50を運用化し、v0.1.18 CI環境サポートを出荷する（目玉トラック）:**
> 0. **v0.1.18 —— CI環境サポート**（v0.2.0前のテーマ別カット;全サーフェスは[`ROADMAP.md`](../roadmap/) §「v0.1.18 — CI-environment support」）。**CI診断出力 + 自動検出 + テンプレート + スキルの半分が着地した**（[ADR-51](../adr/51-ci-diagnostic-output-formats/)）: `rigor check --format sarif|github|gitlab|checkstyle|junit|teamcity`（`--format json`フィールド上の6つのCIネイティブレンダリング、`lib/rigor/cli/diagnostic_formats.rb`;`checkstyle`はreviewdogブリッジ → 任意のreviewdogレポーター）**+ ランタイムCI自動検出**（WD7、`lib/rigor/cli/ci_detector.rb`、PHPStanの`CiDetectedErrorFormatter`をモデルにしたもの: デフォルトの`text`出力がファーストクラスCIのネイティブ形式を自動発行する —— GitHub Actions / TeamCityはログを増補、GitLab + セカンドクラスCIはreviewdog / formatをヒント;オプトアウトは`--no-ci-detect`/`RIGOR_CI_DETECT=0`;Rigor自身の`make check` / specsはオフに固定）+ `docs/manual/ci-templates/`下のコピペ用CIセットアップテンプレート（reviewdog `action-setup`バリアントを含む）+ バンドルされた`skills/rigor-ci-setup/`スキル（Phase 0のプラットフォーム検出 + プラットフォームごとにルーティングされるreviewdogレポーター）+ `docs/manual/11-ci.md`の解説。解決したスコーピング判断: 新規ADR（ADR-27の改訂ではない）;6つすべての形式;GitHubの*デフォルト*サーフェスはSARIFではなく`github`アノテーション（SARIFアップロードはコードスキャニング = プライベートリポジトリではGHASが必要）;ファーストクラス（ネイティブ、PHPStanがサポート）対セカンドクラス（reviewdog）の分割 = WD7。**カットの残り:** ADR-51が先送りするエルゴノミクス（`--output FILE`、reviewdog `rdjson`、TeamCity、よりリッチなSARIFルールメタデータ —— すべて需要ゲート）、ADR-27 § WD3の`setup-ruby`プリビルド4.0タイミングの注意点、そしてv0.1.18のタグ付け前に常設バックログが寄与するその他のもの。**実際のカットにはrigor-release-prepスキルを実行すること**。
> 1. **パフォーマンスゲートを較正する**。`bench/baseline.json`は**未較正**で出荷されている（`make bench-perf` / リリースゲートが通り、提案を発行するため）。CIで計測したLinuxベースライン —— `release-gate.yml`の`bench-baseline-*`アーティファクトから、またはLinux上の`make bench-perf`から —— を`{ "calibrated": true, "targets": {…} }`としてコミットし、次に`release-gate.yml`をアドバイザリー → 必須に堅牢化する。（ADR-50 WD4/WD6。）
> 2. **OSSスイープを較正する**。`data/oss-sweep/mastodon-thresholds.json`は未較正（`max_diagnostics: 999999`）。週次スイープを赤に保っていた`source_inference: false`クラッシュは**修正済み（v0.1.17）**なので、スイープは今や走る —— 閾値を約6のMastodonベースラインに対してリフレッシュする（削除 + 再較正、またはワークフローアーティファクトをコミット）。
> 3. **ADR-50の段階的実装**（それぞれ独自のスライス;ADR-50はProposedのまま → v1.0.0でratified）: **bleeding-edgeオーバーレイ** + `rigor show-bleedingedge`差分コマンド + 粒度の細かい`bleeding_edge:`設定（WD2）;**列挙されたパブリックサーフェスドキュメント**（WD1、v0.2.0でドラフト）;**サポートラインモデル**（最新 + 1つ前のマイナーpre-1.0 → post-1.0でPHPStanの`1.x`デフォルトブランチ、WD5）;**`rigor upgrade`**マイグレーション支援コマンド（WD7、最初の具体的なBCが対象を与えるまで先送り）。
> 4. **v0.2.0カット** —— 唯一の実質的なゲートは外部プラグイン契約に対する文書化された安定性コミットメント;**ADR-50が今やそのポリシーを提供する**（ゲート1の実行可能な証拠はv0.1.16で着地）。[`docs/ROADMAP.md`](../roadmap/) §「Release strategy」を参照。
>
> **（B）外部コーパスゲート —— `~/repo/ruby/rigor-survey/`が必要、このリポジトリ内では完結しない:**
> 5. **ADR-24スライス4 —— コーパスFPゲート + ゲート拡張**。`call.self-undefined-method`は`:off`で出荷、Rigor自身の`lib`でFPクリーン。プロファイルをフリップする前にWD4 FP評価を実施し、次にスタンドアロンのみのゲートをスーパークラス / includeチェーンへ拡張する（レコーダーで祖先チェーン解決の完全性を記録 —— 「collect, don't recompute」ルート）。下記§「ADR-24」を参照。
> 6. **`rigor check --incremental` CIゲート拡張** —— `--verify-incremental` CIゲートをMastodon + GitLabのサーベイツリーへ拡張する。
>
> **（C）リポジトリ内エンジンバックログ（需要駆動、それぞれADRスコープ）:**
> 7. **[ADR-48](../adr/48-data-struct-value-folding/) `Struct`フォローアップ**（独自のスライスと変更健全性ストーリー —— セッター / `[]=`がインスタンスメンバーマップを無効化;サイドテーブルは`Data.define`のみを記録）+ 素のローカルブロック形式のパリティ（`c = Data.define(:x) do … end` —— スライス4のリーダー再定義ガード用の解決可能なクラス名なし、保守的なボイコット）。`Data.define`は出荷済み（スライス1〜4）。
> 8. **[ADR-47](../adr/47-narrowing-driven-clause-reachability/) WD3b** —— 分解 / 値 / 変数キャッチオール（catch-all）パターンの網羅性（先送りされた[ADR-36](../adr/36-mangrove-enum-nested-class-emission/)の`is_a?`隣接;アドホックに推論しないこと;ゼロ発火のWD4スイープにより優先度引き下げ）。
> 9. **`MathFolding`のFloatサイン精緻化** —— **仕様争議あり、迅速な勝利ではない**。`Math.exp → positive-float`等にはFloatサイン精緻化（`positive-float` / `non-negative-float`）が必要だが、[`imported-built-in-types.md`](../type-specification/imported-built-in-types/)はこれを**意図的に除外している**（精緻化は意図的に`Integer`専用;Floatのサイン / リテラルナローイングは`NaN` / signed-zero / 型変換の根拠で「デフォルトで拒否」 —— 仕様が認めるのは将来の`finite-float` / 非`NaN`証明）。そして`Math.exp(Float::NAN) → NaN`により、非`NaN`前提条件なしには明らかに非健全。ADR相当 + 仕様改訂が先;需要ゲート。
>
> check-rulesルート経由のADR-24スライス4を**再起動しない**こと（2026-06-05にリバート済み、135件のFP —— 下記参照）;評価時レコーダーが着地済みのルート。`Runner#initialize`のivar事前シードをヘルパに抽出**しない**こと（エンジン自身のフロー解析からそれらが隠れる → 自己チェックFP;「Gotchas」を参照）。

### 参照読書

1. [`docs/ROADMAP.md`](../roadmap/) §「Release strategy — the road to v0.2.0」—— v0.2.0をゲートするもの（今やADR-50が統制する）。
2. [`docs/adr/50-release-engineering-and-stability-strategy.md`](../adr/50-release-engineering-and-stability-strategy/) —— v0.2.0→v1.0.0のリリース / QA契約（互換性サーフェス、診断の非契約 + bleeding-edge、パフォーマンスゲート、サポートライン、昇格ケイデンス）。
3. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.1.17]` —— 出荷済みのパフォーマンス / インクリメンタル / 診断サイクル;§ `[0.1.16]`はプラグイン契約スイート + ADR-43;§ `[0.1.12]`はOSSリアリズムサイクル。
4. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) —— パブリック対内部の安定性境界（ADR-50 WD1がそれを列挙する）;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。

## Gotchas（load-bearing、苦労して学んだもの）

- **ADR-46** —— `Runner#initialize`のivar事前シード（`@class_decl_paths_snapshot = {}`等）をヘルパに抽出**しない**こと;コンストラクタの外に移すと、エンジン自身のフロー解析からそれらが隠れ、`make check`が`snapshot.size`をnil-receiver偽陽性として自己フラグする。インラインに保つこと（コンストラクタは`AbcSize`のdisableを持つ）。
- **ADR-45** —— `@collect_stats`はデフォルトで真（キャッシュをこれでゲートできない;ヒットはnil統計を返す）;フリーズ済みプラグインへの遅延`@io_boundary ||=` → `FrozenError`（`instance_variable_get`を使う）;キャッシュの書き込み / シリアライズ失敗は握り潰される（実行を決して壊さない）。
- **ADR-24** —— セルフ呼び出し解決のcheck-rules*再実装*は、エンジン実際の解決（精度のために`module_function` / `Data.define`アクセサ / mixinを既に処理する）から乖離する → 135件のFP（リバート済み）。着地済みのルートは評価時`SelfCallResolutionRecorder`（「collect, don't recompute」）。
- **bench-perf** —— Makeターゲットは`bench`ではなく`bench-perf`（素の名前は`bench/`データディレクトリと衝突する;ファイルは`.PHONY`なしの規約を保つ）。`bench/baseline.json`は未較正で出荷される → 初回実行が`bench/baseline.updated.json`（gitignore済み）を書き、通過する。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログは[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」にある。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4（レコーダー + `call.self-undefined-method`ルール、`:off`で出荷）—— 着地済みv0.1.17**。 **残り（外部コーパスが必要）:**プロファイルをフリップする前のWD4 FP評価、次にスタンドアロンのみのゲートをスーパークラス / includeチェーンへ拡張（レコーダーで祖先チェーン解決の完全性を記録）。解決されたclosed-classセルフ呼び出しに対する**arity診断**はスライス4の一部では**なかった**（undefined-methodのみ） —— ルールが実績を積んだ後の後続拡張。
- **クラスボディ内の非`Bot`一般採用** —— 解決されたセルフ呼び出しの戻り型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた（既存の呼び出し先戻り推論の不精度が下流で表面化した）;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

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
