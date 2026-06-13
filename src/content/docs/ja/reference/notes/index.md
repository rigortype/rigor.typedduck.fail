---
title: "Research & Survey Notes"
description: "Imported from rigortype/rigor docs/notes/README.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/README.md"
sourcePath: "docs/notes/README.md"
sourceSha: "5d89bdc07b2740cd5fa3568eeac75d7f8b6799fd736ada4dde247b74db45ab08"
sourceCommit: "222d8e03ee0f4252795f6c7294672a76c20b7ae3"
translationStatus: "translated"
sidebar:
  order: 6000
---

経験的な**作業ノート** — ライブラリ調査、カバレッジ監査、リグレッションスイープ、実プロジェクトのトリアージ、外部研究の考察です。*何が観測されたか*（いつ観測されたか）、それが促した分析、そして着地したフォローアップを記録します。

これらのノートは**非規範的であり、執筆時点を日付として刻まれています** — 内部で示されたRigorのバージョンに対して、書かれた時点で真であった内容を反映します。多くは`Status:`行を持ちます。調査／エッセイレビューのノートは明示的に*「research note, no design commitments.」*です。ノートは[ADR](../adr/)・[設計ノート](../design/)・エンジン作業の材料になることがあります — ただし拘束力を持つのは仕様とADRであり、ノートではありません。記載されたファイル・メソッド・フラグが今も存在するか、それに基づいて行動する前に確認してください。

ファイル名は`YYYYMMDD-<slug>.md`で、執筆日を日付とします。

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

## 外部研究・エッセイレビュー

| Date | Note |
| --- | --- |
| 2026-05-18 | [Matsumoto & Minamide 2008（多相レコード型Ruby型推論） — Rigor観点考察](20260518-matsumoto-2008-poly-records-rigor-review/) |
| 2026-05-18 | [Matsumoto & Minamide 2010 (Ruby CFA) — Rigor観点考察](20260518-matsumoto-2010-cfa-rigor-review/) |
| 2026-06-01 | [「漸進的型付け言語の時代に必要なもの」（mizchi） — Rigor / TypeScript観点考察](20260601-gradual-typing-era-mizchi-rigor-ts-review/) |
| 2026-06-01 | [「Revenge of the Types」（Armin Ronacher） — ランタイム × 型チェッカー横断考察](20260601-revenge-of-the-types-runtime-checker-survey/) |
| 2026-06-01 | [「型システムポエム」（myuon） — Rigor観点考察](20260601-type-system-poem-rigor-review/) |
| 2026-06-04 | [Elixir v1.20の漸進的集合論型システム — Rigor観点考察](20260604-elixir-v1.20-type-system-rigor-review/) |

## インフラストラクチャ・upstream

| Date | Note |
| --- | --- |
| 2026-05-20 | [Ractor worker pool crash — CRuby concurrent-Ractor use-after-free](20260520-ractor-pool-cruby-uaf/) |
| 2026-05-28 | [Upstream `ruby/rbs` PR — `Resolv::DNS` typeclass-narrowed return](20260528-rbs-upstream-pr-resolv-typeclass/) |
| 2026-06-03 | [プラグインファイルを`Plugin::Base`契約に対して型付けする — スパイク調査の所見](20260603-plugin-contract-self-typing-spike/) |
| 2026-06-03 | [セッションレポート — プラグイン契約を型付けする（6コミットの着地）](20260603-plugin-contract-typing-session-report/) |

## パフォーマンス・プロファイリング

| Date | Note |
| --- | --- |
| 2026-06-04 | [Profiling `rigor check` on Mastodon — allocation-bound analysis](20260604-mastodon-allocation-profile/) |
| 2026-06-04 | [Profiling `rigor check` on GitLab — plugin-contribution churn](20260604-gitlab-plugin-contribution-allocation/) |
| 2026-06-10 | [プラグインアーキテクチャ構造監査 — per-call消費経路の最適化余地](20260610-plugin-architecture-perf-audit/) |
| 2026-06-10 | [lib/rigor内部アーキテクチャ再検討 — 正式リリース前の構造監査](20260610-lib-rigor-architecture-rereview/) |
| 2026-06-10 | [キャッシュ機構監査 — ディスク使用量とwarm-runロードコスト](20260610-cache-disk-runtime-audit/) |
| 2026-06-13 | [プラグインインターフェイス最終レビュー — v1.0凍結前のBC-break機会監査](20260613-plugin-interface-bc-review/) |

## プロセス・メタ

| Date | Note |
| --- | --- |
| 2026-06-05 | [ADR corpus rubric audit — scoring ADR-0…49 against ADR-49](20260605-adr-corpus-rubric-audit/) |
| 2026-06-10 | [ユーザー向けドキュメント レビュー・バッテリー設計 — chibirigor-reviewの移植検討](20260610-user-docs-review-battery-design/) |

## ノートの追加

1. 執筆日を使ってファイルを`YYYYMMDD-<slug>.md`と名付けます。
2. `Status:`行（例: *「research note, no design commitments.」*）で始め、観測がどのRigorバージョンに対して行われたかを示します。
3. 上記の該当セクションに行を追加します（または新しいセクションを起こします）。
