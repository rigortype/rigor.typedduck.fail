---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "1f07365d5b407a24251d21cae6ebbe8a7648372411600b3bfce7f4853eb7fade"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-14T05:07:42+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

<!--
セッションハンドオフ（ADR-98）。1つの問いにのみ答える: 次のセッションは何をすべきか？

- 作業を完了まで持っていった際は、このファイルの内容を置き換えること。下に追記してはならない。
  2セッション以上存続するようなものはここには属さない: バックログ → GitHub issue
  （docs/agents/issue-tracker.md）、運用の落とし穴 → ワークフローのスキル、決定事項 → ADR、
  測定結果 → docs/notes/、出荷済み → CHANGELOG.md。
- ハードキャップ: 120行（spec/docs/agent_index_spec.rbで強制）。追記せず圧縮すること。
- 引き継ぐ前に、プロキシではなく決定を下す実体によって主張を検証すること —
  このファイル内の主張も含め。3セッション連続で、自身のポインタが間違っていたことがある。
-->

一時的な文書であり、全体が置き換えられます。バックログはGitHub Issuesで、リリース計画はMilestonesで管理されます。
このファイルがADR、CHANGELOG、またはissueと食い違う場合、間違っているのはこのファイル側です。

## 2026-11-06時点の状態（v0.4.7リリース済み）

- **v0.4.7が出荷されました**（タグ`v0.4.7`、2026-11-03）。perf-gateコーパスはこれに進められています（`bench/baseline.json`、`bench-corpus-v0.4.7`）。v0.4.8マイルストーンがオープンなフォローアップを保持しています。
- **承認キューはバッチで批准されています**: メンテナーは2026-11-14に`process`、`scope`、`gate-row`クラスを批准し（#3226、#3228、#3230）、58エントリーが残っています ── 57個の`open-choice`と1つの`process`（`adr129-s3-ci-shadow.md`、type_ofシャドウがゲートになるという約束を担保するものがまだないため保留中）です。リリース前のバッチ批准が長期ウィンドウにおける`approval-queue.d/README.md`のパスであり、`/rigor-release-prep`が残りをすべて批准します。
- **ADR-129（型付け状態）がアクティブなエンジンキャンペーンです**: ステージ3のスライスが`adr129-s3-*` PRとして着地しています。そのオープンなフォローアップは`ADR-129`のissueです（例: #2798、#2805、#2813、#2853）。
- **Piハーネス（ADR-115）**は現在、レビューを共同プライマリペアであるGrok:xhighと`devin/swe-2`:highにルーティングしており、両方のApproveが必要です（PR #2885）。`devin/swe-2`は「今月」の無料枠であるため、終了時にバインディングを再確認してください。
- **dev-loopポストモーテムは各リリース後に繰り返されます**（`rigor-release-prep` § "File the next dev-loop post-mortem"）。v0.4.7のものは#2333であり、v0.4.8のものはそのマイルストーンに起票されています。

## 次に取り組むこと

1. v0.4.8マイルストーンをトリアージする（`gh issue list --milestone v0.4.8`）。展開する前に`docs/agents/parallel-lanes.md`を読むこと。
2. メンテナーがまだ判断を下していない任意のクリーンアップ: PRはマージされたものの、ローカルブランチに`master`上にないコミット（おそらくマージキューのリベース）が依然として表示される`rigor-wt/`配下のworktree。削除する前に`git range-diff`で確認すること。
