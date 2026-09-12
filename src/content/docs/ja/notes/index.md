---
title: "リサーチ・サーベイノート"
description: "rigortype/rigor docs/notes/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/README.md"
sourcePath: "docs/notes/README.md"
sourceSha: "42879d1dac91e4fa39d7fc1d014e01b8f838554e68e74235b876be41a43a5e14"
sourceCommit: "568138c239ec5b7b39833ed6a2a21fd027e3d319"
sourceDate: "2026-09-12T08:22:41+09:00"
translationStatus: "translated"
sidebar:
  order: 6000
---

経験的な**作業ノート** — ライブラリ調査、カバレッジ監査、リグレッションスイープ、実プロジェクトのトリアージ、外部研究の考察です。*何が観測されたか*（いつ観測されたか）、それが促した分析、そして着地したフォローアップを記録します。

これらのノートは**非規範的であり、執筆時点を日付として刻まれています** — 内部で示されたRigorのバージョンに対して、書かれた時点で真であった内容を反映します。多くは`Status:`行を持ちます。調査／エッセイレビューのノートは明示的に*「research note, no design commitments.」*です。ノートは[ADR](../adr/)・[設計ノート](../design/)・エンジン作業の材料になることがあります — ただし拘束力を持つのは仕様とADRであり、ノートではありません。記載されたファイル・メソッド・フラグが今も存在するか、それに基づいて行動する前に確認してください。

ファイル名は`YYYYMMDD-<slug>.md`で、執筆日を日付とします。

先行事例を探して掃くとき見落としやすい、隣接する2つのエビデンスストアがある: [`deep-research/`](deep-research/)は**取り込まれた外部の**リサーチレポート（LLMのdeep-research出力 —— ファーストパーティとして決して引用可能ではない;規則はそのREADMEに登録する）を保持し、CHANGELOG（[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)、アーカイブ済みの[`docs/CHANGELOG-0.1.x.md`](../changelog-0.1.x/)）は機能ごとの着地の物語を保持し、その比較エビデンス（例: `rbs_rails`のカバレッジ比較）はこの索引の他のどこにも現れない。

## ライブラリ・エコシステム調査

| Date | Note |
| --- | --- |
| 2026-05-15 | [Macro / DSL Expansion — Per-Library Survey](20260515-macro-expansion-library-survey/) |
| 2026-05-15 | [Real-world Rails project survey](20260515-real-world-rails-survey/) |
| 2026-05-19 | [22-library OSS survey — recurring false-positive clusters + BigDecimal-coerce fix](20260519-oss-library-survey/) |
| 2026-05-25 | [FFI library usage survey — feeding `rigor-ffi` design](20260525-ffi-library-survey/) |
| 2026-05-30 | [Mangrove (Result / Option / Enum) — library survey + `rigor-mangrove` shape](20260530-mangrove-library-survey/) |
| 2026-05-30 | [Real Sorbet/Tapioca app survey — strap + dependabot-core](20260530-sorbet-real-app-survey/) |
| 2026-05-31 | [TypeProf internals survey — inference logic + internal type representation](20260531-typeprof-internals-survey/) |
| 2026-06-03 | [PHPStan内部の型演算（TypeCombinator / TypeUtils / 二項演算評価）とRigorの比較](20260603-phpstan-type-algebra-comparison/) |
| 2026-07-15 | [PHPStan `src/Rules`全ルール分類とRigor再実装価値の再評価](20260715-phpstan-rules-survey-rigor-reevaluation/) |
| 2026-07-16 | [mizchi/dspec — 形式仕様基盤としての評価 + トレーサビリティ規律の移植検討](20260716-dspec-formal-spec-substrate-evaluation/) |

## 型カバレッジ監査

| Date | Note |
| --- | --- |
| 2026-05-22 | [Hash method coverage — ShapeDispatch & block-fold audit](20260522-hash-method-coverage/) |
| 2026-05-22 | [Rational / Complex / Range / Set — ConstantFoldingカバレッジ監査](20260522-rational-complex-range-set-method-coverage/) |
| 2026-05-22 | [標準ライブラリ決定論的モジュール関数カバレッジ](20260522-stdlib-deterministic-module-coverage/) |
| 2026-05-22 | [標準ライブラリ非決定論的・除外対象モジュール カバレッジ](20260522-stdlib-nondeterministic-module-coverage/) |
| 2026-05-22 | [型別メソッドカバレッジ — ConstantFolding / ShapeDispatch / ExpressionTyper監査](20260522-type-method-coverage/) |
| 2026-05-23 | [Date / Time / DateTime method coverage audit](20260523-date-time-method-coverage/) |
| 2026-05-23 | [Struct / Encoding coverage audit](20260523-struct-encoding-coverage/) |
| 2026-06-01 | [textbringer type-coverage survey — invalid bundled `sig/`, namespace-synthesis fix](20260601-textbringer-coverage-survey/) |
| 2026-08-31 | [セルフチェックの型カバレッジ監査 — Rigor自身の`lib`のどこが型なしのままか](20260831-self-check-type-coverage-audit/) |
| 2026-09-01 | [コーパス全体の不透明性の帰属 — 25個の対象で型がどこに付かないか](20260901-corpus-opacity-attribution/) |
| 2026-09-01 | [キャンペーン後の不透明性の再帰属 — マージ済みmasterでのスイーププローブ再実行](20260901-post-campaign-opacity-recheck/) |
| 2026-09-08 | [`sig/`内の全宣言の来歴 — ADR-107 G3に向けた初期シード監査](20260908-sig-provenance-audit/) |
| 2026-09-09 | [`sig/`内の224件の`no_source`宣言の出処](20260909-sig-no-source-audit/) |

## リグレッションスイープ・実プロジェクトトリアージ

| Date | Note |
| --- | --- |
| 2026-05-03 | [Steep 2.0 cross-check triage](20260503-steep-cross-check-triage/) |
| 2026-05-21 | [Mastodon survey — Cluster 4 (flow-folding warnings) triage](20260521-mastodon-cluster4-flow-folding-triage/) |
| 2026-05-21 | [Mastodon v4.5.x regression sweep — baseline-drift over a release line](20260521-mastodon-v4.5-regression-sweep/) |
| 2026-05-21 | [Redmine 6.x regression sweep — baseline-drift over a release line](20260521-redmine-6.x-regression-sweep/) |
| 2026-05-21 | [Redmine per-commit detection probe — does Rigor catch real bugs?](20260521-redmine-per-commit-detection-probe/) |
| 2026-05-23 | [Mastodon regression sweeps — re-run on Rigor v0.1.9](20260523-mastodon-v4.5-regression-sweep-v0.1.9/) |
| 2026-05-29 | [ADR-35 override-rules — Mastodon false-positive verification](20260529-adr35-mastodon-fp-verification/) |
| 2026-05-29 | [rigor-survey project-init baseline sweep](20260529-rigor-survey-project-init-baseline/) |
| 2026-06-05 | [ADR-47 `flow.unreachable-clause` — corpus FP sweep (WD4)](20260605-adr47-unreachable-clause-corpus-sweep/) |
| 2026-06-20 | [SKILL-driven onboarding (`rigor-next-steps`) — conference-app dogfood + rigor-survey field trial](20260620-skill-driven-onboarding-dogfood/) |
| 2026-06-20 | [OpenCode (ACP) cross-model validation — driving `rigor-next-steps` across 13 models](20260620-opencode-acp-cross-model-validation/) |
| 2026-07-04 | [Railsカバレッジ強化オンボーディング — sig-gen carrierトラップとengine-boundな天井（redmine / mastodon）](20260704-rails-coverage-onboarding-carrier-trap/) |
| 2026-07-06 | [Mastodon型カバレッジ穴のprovenance分析 + sig-genのRBS妥当性クラッシュ](20260706-mastodon-coverage-provenance-and-siggen-rbs-validity/) |
| 2026-08-05 | [`&&` / `\|\|`の値極性ゲート —— FPリスクの評価（issue #152）](20260805-issue-152-and-or-polarity-gate-fp-evaluation/) |
| 2026-08-05 | [`if` / `unless`の真偽性による削除 —— 判定が何に依拠しているかのコーパス調査（issue #286）](20260805-issue-286-if-unless-truthiness-elision-census/) |
| 2026-08-06 | [`if` / `unless`の削除 —— 楽観的キャリアのprovenance調査と双方向A/B（issue #286）](20260806-issue-286-optimistic-carrier-provenance-census/) |
| 2026-08-13 | [未使用定数の偽陽性ベースライン —— 3プロジェクトのコーパス計測（issue #345）](20260813-unused-constant-fp-baseline/) |
| 2026-08-17 | [エフェクトカタログ —— コーパス計測、前後（issue #380）](20260817-effect-catalogue-corpus/) |
| 2026-08-17 | [エフェクト収集 —— WD13の予算がどこへ行き、何がそれを取り戻したか（issue #382）](20260817-effect-collection-perf/) |
| 2026-08-17 | [Railsエフェクト層 —— コーパス計測、前後（issue #387）](20260817-effect-rails-layer-corpus/) |
| 2026-08-22 | [エフェクトシステム —— Redmineでの最初の採用者のユーザーストーリー](20260822-effect-user-story-redmine/) |
| 2026-08-23 | [`super`エフェクトエッジ —— コーパス計測（issue #446）](20260823-effect-super-edge-corpus/) |
| 2026-08-23 | [エフェクトラベル —— 10のユーザーストーリー、コーパスに照らして裁定（redmine + mastodon）](20260823-effect-user-stories-corpus/) |
| 2026-09-05 | [トップレベル`def`のcref —— リトラクト前のピールの規模測定（issue #716）](20260905-toplevel-def-cref-movable-sites/) |
| 2026-09-09 | [センサス走査のギャップ —— 修正前に3つの形状の規模を測定する（issue #693）](20260909-census-walk-gap-movable-sites/) |
| 2026-09-12 | [rigor-survey OSSコーパス —— v0.3.9カット前クラッシュチェック](20260912-v039-oss-corpus-crash-check/) |

## アナライザーの自己テスト（teeth・偽陰性）

| Date | Note |
| --- | --- |
| 2026-06-13 | [Mutation-testing the analyzer — a teeth / false-negative harness + `lib/rigor` sweep backlog](20260613-mutation-teeth-harness/) |
| 2026-06-17 | [Type-guided mutation testing — internal teeth vs. an external test-suite tool (strategy)](20260617-type-guided-mutation-testing-strategy/) |
| 2026-06-17 | [Fused protection (`--with-tests`) — broad survey sweep across 12 OSS targets](20260617-fused-protection-survey-sweep/) |
| 2026-06-18 | [Mutation-testing Rigor's own codebase — plan (RSpec ∪ self-check, independent type oracle)](20260618-self-mutation-testing-plan/) |
| 2026-08-09 | [`check_rules.rb`の融合保護 再計測 —— 型軸が生きた状態での初めての全数調査](20260809-check-rules-mutation-remeasure/) |

## 外部研究・エッセイレビュー

| Date | Note |
| --- | --- |
| 2026-05-18 | [Matsumoto & Minamide 2008（多相レコード型Ruby型推論） — Rigor観点考察](20260518-matsumoto-2008-poly-records-rigor-review/) |
| 2026-05-18 | [Matsumoto & Minamide 2010 (Ruby CFA) — Rigor観点考察](20260518-matsumoto-2010-cfa-rigor-review/) |
| 2026-06-01 | [「漸進的型付け言語の時代に必要なもの」（mizchi） — Rigor / TypeScript観点考察](20260601-gradual-typing-era-mizchi-rigor-ts-review/) |
| 2026-06-01 | [「Revenge of the Types」（Armin Ronacher） — ランタイム × 型チェッカー横断考察](20260601-revenge-of-the-types-runtime-checker-survey/) |
| 2026-06-01 | [「型システムポエム」（myuon） — Rigor観点考察](20260601-type-system-poem-rigor-review/) |
| 2026-06-04 | [Elixir v1.20の漸進的集合論型システム — Rigor観点考察](20260604-elixir-v1.20-type-system-rigor-review/) |
| 2026-07-12 | [Ren et al. 2013「The Ruby Type Checker（rtc）」— Rigor観点考察](20260712-ren-2013-ruby-type-checker-rigor-review/) |

## インフラストラクチャ・upstream

| Date | Note |
| --- | --- |
| 2026-05-20 | [Ractor worker pool crash — CRuby concurrent-Ractor use-after-free](20260520-ractor-pool-cruby-uaf/) |
| 2026-05-28 | [Upstream `ruby/rbs` PR — `Resolv::DNS` typeclass-narrowed return](20260528-rbs-upstream-pr-resolv-typeclass/) |
| 2026-06-03 | [プラグインファイルを`Plugin::Base`契約に対して型付けする — スパイク調査の所見](20260603-plugin-contract-self-typing-spike/) |
| 2026-06-03 | [セッションレポート — プラグイン契約を型付けする（6コミットの着地）](20260603-plugin-contract-typing-session-report/) |
| 2026-07-30 | [sig-genライターの更新パスに`RBS::Rewriter`を使う —— 評価](20260730-rbs-rewriter-sig-gen-writer-evaluation/) |
| 2026-07-30 | [インラインRBS: `rbs-inline` gem vs `RBS::InlineParser` —— 文法差分](20260730-inline-rbs-parser-grammar-diff/) |

## パフォーマンス・プロファイリング

| Date | Note |
| --- | --- |
| 2026-06-04 | [Profiling `rigor check` on Mastodon — allocation-bound analysis](20260604-mastodon-allocation-profile/) |
| 2026-06-04 | [Profiling `rigor check` on GitLab — plugin-contribution churn](20260604-gitlab-plugin-contribution-allocation/) |
| 2026-06-10 | [プラグインアーキテクチャ構造監査 — per-call消費経路の最適化余地](20260610-plugin-architecture-perf-audit/) |
| 2026-06-10 | [lib/rigor内部アーキテクチャ再検討 — 正式リリース前の構造監査](20260610-lib-rigor-architecture-rereview/) |
| 2026-06-10 | [キャッシュ機構監査 — ディスク使用量とwarm-runロードコスト](20260610-cache-disk-runtime-audit/) |
| 2026-06-13 | [プラグインインターフェイス最終レビュー — v1.0凍結前のBC-break機会監査](20260613-plugin-interface-bc-review/) |
| 2026-06-27 | [Corpus cold/warm re-profile — v0.2.6 new-bottleneck check](20260627-corpus-cold-warm-reprofile/) |
| 2026-07-18 | [CIテスト時間の伸び — 要因分解（instance gacha vsテスト増加vs binpacker）、カテゴリー分割・有料runnerの否定、md-only PRスキップの落としどころ](20260718-ci-test-time-growth-attribution/) |
| 2026-07-25 | [`rigor check lib`アロケーション帰属 — 55%は一度きりのRBS環境ビルド、#101ルールは0.24%](20260725-check-allocation-attribution/) |
| 2026-07-30 | [参照型スタブのパス1 —— 静的検出はビルダーと一致し（コールドラン比−32.8%）、スタブ合成の実バグを2件検出](20260730-stub-pass1-static-detection-evaluation/) |
| 2026-09-09 | [CIウォールタイム371秒 → 220秒 — シャードのばらつきは分割の問題ではなかった；1つのマトリクスアームに固定された作業、ワーカーごとの予算を超過した1ファイル、そしてspec分割が引き起こす3つの罠](20260909-ci-wall-time-shard-rebalance/) |

## プロセス・メタ

| Date | Note |
| --- | --- |
| 2026-06-05 | [ADR corpus rubric audit — scoring ADR-0…49 against ADR-49](20260605-adr-corpus-rubric-audit/) |
| 2026-06-10 | [ユーザー向けドキュメント レビュー・バッテリー設計 — chibirigor-reviewの移植検討](20260610-user-docs-review-battery-design/) |
| 2026-06-22 | [Rigor 0.2.x problem survey — 型理論とRubyランタイムの型モデル](20260622-rigor-0.2.x-problem-survey/) |
| 2026-06-22 | [Rigor 0.2.x compatibility-safe strengthening survey](20260622-rigor-0.2.x-compatibility-safe-strengthening-survey/) |
| 2026-07-04 | [`examples/`プラグイン近代化調査 — 最初期プラグインと現行契約面のギャップ](20260704-examples-plugin-modernization-survey/) |
| 2026-07-04 | [`plugins/`近代化スイープ — SKILL適用による本番プラグインのドリフト監査](20260704-plugins-modernization-sweep/) |
| 2026-07-19 | [Webサイトショーケース — 「これに型が付くの？！」推論例集（コア + プラグイン）](20260719-website-showcase-inference-examples/) |
| 2026-09-08 | [PR #788は停止指示のもとでマージされた — Draft規律のポストモーテム](20260908-pr-788-draft-discipline-postmortem/) |
| 2026-09-09 | [ADRコーパス監査 —— 埋もれた作業、実装の乖離、および陳腐化](20260909-adr-corpus-audit/) |

## ノートの追加

1. 執筆日を使ってファイルを`YYYYMMDD-<slug>.md`と名付けます。
2. `Status:`行（例: *「research note, no design commitments.」*）で始め、観測がどのRigorバージョンに対して行われたかを示します。
3. 上記の該当セクションに行を追加します（または新しいセクションを起こします）。
