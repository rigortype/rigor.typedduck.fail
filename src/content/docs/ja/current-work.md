---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "c027138ca861ce7b7bcc1d2cc0db085c9677c1d0378c2707f128f272a8a58e6a"
sourceCommit: "d88effcae8b2998d1f4f40432e6d4f20ce17946e"
sourceDate: "2026-07-19T11:27:20+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

<!--
セッション引き継ぎ（ADR-98）。たった1つの問いに答える: 次のセッションは何をすべきか？

- 作業をゴールまで運んだら、このファイルの内容を置き換えること;下に追記しないこと。
  2セッションを超えて生き延びるものはここに属さない: バックログ → GitHub issue
  （docs/agents/issue-tracker.md）、運用上の落とし穴 → ワークフローのスキル、決定 → ADR、
  計測 → docs/notes/、出荷済み → CHANGELOG.md。
- 主張を持ち越す前に検証すること。最近の2つの救済: #194の「自動配線がインソース推論を
  リグレッションさせる」は根本原因が判明すると撤回された（エンジンのバグではなく、
  インストール済みgemとチェックアウトのプラグインのバージョンずれだった）。そして初期メモリでの
  #162のティア帰属は`rigor type-of`のアーティファクトだった —— #196が根本から修正し、
  checkのプラグイン認識環境をプローブに与えた。
-->


一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestones
（`v0.3.0` / `v0.4.x` / `v1.0.0`）に存在する。このファイルがADR、CHANGELOG、またはissueと
矛盾する場合、間違っているのはこのファイルのほうだ。

## 現状

- **#162は完了しクローズ**。ADR-100 WD4のアデンダム（`2ffa3b40`）は2つのサービングティアと
  その機構に名前を与えた;PR #195（マージ済み、`2c7b68e5`）がそれを実装した: 遅延評価・純粋・
  def単位の`Inference::VoidTailSummary`を介した推移的な`static.value-use.void`で、
  `MethodDispatcher.dispatch`ラッパーから結果に依存せず参照される。コーパスゲートは
  mail/kramdown/haml/liquidがバイト同一、新たなブリーディングエッジの発火はゼロ;いまだ
  `use-of-void-value`の背後にある（デフォルトでオフ）。デフォルトプロファイルへの昇格は別個の、
  エビデンスゲート付きの判断だ（ADR-50 WD1）。
- **PR #196（マージ済み、`48a26c20`）は#162の設計を誤らせていたプローブ/checkの環境の
  非対称性を修正した**: `type-of` / `type-scan` / `trace` / `annotate`は今や
  `CLI::ProbeEnvironment`を介してプラグイン認識環境を構築する（ローダーのみ —— プロデューサー
  プラグインの事前パスなし）ので、プローブはADR-93の自動配線シンセシスを見る。`coverage_scan`は
  意図的に残された（計測面であり、ベースラインがずれてしまう）。
- **#194は完了しクローズ**。ユーザーは統一ルール —— エンジンにバンドルされたすべてのプラグインは
  エンジンにアンカーする —— を選び、ADR-93 WD5のアデンダム（`8e75fa9f`）として記録され、3つの
  スライスとして着地した: **#197**は`rigor plugins`での解決済みパスの可視化 + ロードエラー診断
  （新しい`Registry#resolved_gem_paths`パブリックリーダー）、**#198**は修正
  （`Loader.bundled_plugin_path`のエンジンにアンカーしたrequire、gem名フォールバック、
  `requirer`のシームを名前かパスのいずれかに拡張）、そして**#200**は`doctor`の`plugin_skew`
  チェック（#199の再着地。そのスタックされたマージはmasterではなくベースブランチに着地した ——
  スタックされたPRはボトムアップでマージするか、ベースをリターゲットした後にマージすること）。
  doctorのチェックは`:warn`で報告する。これは#116の`:fail`からの意図的な逸脱だ（パス比較は
  ロックファイルのパースよりも曖昧だ）;望むならフリップは1行だ。
- **v0.3.0マイルストーン: オープンなのは#121（進行中の需要ゲート付きフォールド、ブロッカーでは
  ない）のみ**。
- `make verify` / `make docs-check`はマージ後のmasterでクリーン;masterと`origin/master`は
  一致している。

## 次のセッション —— リリースの封印

`[Unreleased]`は**73個**の項目を抱えている。`rigor-release-prep`をバージョンバンプの手前まで
（それを含めずに）実行し、封印を承認のために提示すること;バージョンバンプ + `rake release`は
ユーザーゲート付きのまま（AGENTS.md §「Release Cadence」、単一桁のバージョンコンポーネント ——
`0.2.x`の後継計画はそこに記録されている）。

## その他のオープン項目、低優先度

- **#121** —— 進行中のFP安全なビルトイン/標準ライブラリのフォールド（需要ゲート付き、リリース
  ブロッカーではない）。
- `static.value-use.top`の兄弟診断と`static.incomplete-inference.*`のバジェットIDは予約された
  まま（ADR-100 / ADR-41 / #158） —— 需要シグナルなしに着手しないこと。

## ユーザー待ち / 外部待ち

- dependabotのrubocop **PR #86**は意図的に保留のままだ（upstreamのautocorrectのバグ）。
- **ステージされた`ruby/rbs`のupstream修正を公開する** —— `references/rbs`のブランチ
  `widen-strscan-resolv-stdlib-sigs`;プッシュ + upstream PRはユーザーのアクションだ。#159として
  追跡されている。
- upstreamの`rbs-inline`のRDoc修正（[soutaro/rbs-inline#249](https://github.com/soutaro/rbs-inline/pull/249)）は
  ユーザーのフォークの下でオープンだ;upstreamが応答するまでリポジトリ側ですることはない。
- **rigor-rs:**`rigor_rs.ruby`は私たちのスキーマで予約されている（ADR-99）。そのハーネスは
  オラクルをチェックアウトのプラグインパスに再ピンし（rigor-rs PR #29）、その再実行バッテリーは
  クリーンで返ってきた;WD5がマージされたことでエンジンは今や自身をアンカーするので、アドホックな
  プローブも安全だ。
