---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor の docs/CURRENT_WORK.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "4b07ffe85aa5fbfbb42a371c70ce0300843c90482a8cfc8fa6fe2868c953f133"
sourceCommit: "b5af5cf72f6b666f74479df959b1ee467feda5c6"
sourceDate: "2026-09-22T02:49:55+09:00"
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

## 2026-09-21の`/queue-release`セッションで着地した内容

Grok-maxレビューが承認（Approved）され、その後マージされました（マージコミット、着地指示が出るまではDraft対応可能な状態）：

- [#1159](https://github.com/rigortype/rigor/pull/1159) → `79fa99cf` ── #1130ブロックパラメータの`SelfSubstitute`判定（候補B：保持対縮退のみ；リターンパスの拡幅なし）。
- [#1160](https://github.com/rigortype/rigor/pull/1160) → `9fd4b6d4` ── #1071アームごとの`respond_to`エッジ。
- [#1161](https://github.com/rigortype/rigor/pull/1161) → `19c2af59` ── #1089 enumカラムの読み取りをキーのユニオンとする。

そのバッチから依然としてオープンなもの：

- [#1158](https://github.com/rigortype/rigor/pull/1158)（#1011）── Approved。最初のCIはshard-1のアーティファクトアップロード403で終了；失敗したジョブは再実行された。その実行がグリーンになったらマージすること。403をテスト失敗として扱ってはならない。
- [#1162](https://github.com/rigortype/rigor/pull/1162) ── プロセスノート`docs/notes/20260921-queue-release-lane-experience.md`。Draft；敵対的レビューのセットには含まれない。裁量で着地させるかクローズすること。

レーンの経験（バンドルパス、`--body-file`、30分のコーパスタイムアウト、Flashモデルid）はそのノートにあり、ここにはありません。

`v0.4.0`は依然としてコンテキストのままです。Changelogの封印なし、VERSIONバンプなし、`release/x.y.z`なし。

## メンテナー待ち

新しいものはありません。長らく保留されている`ready-for-human`バックログは変更ありません（`gh issue list --label ready-for-human`）。

## 次に着手する価値があるもの

`/queue-release`を**#1123**（検出された祖先の順序付けにおいて`Module#prepend`が無視される）から再開し、次に #1122、#1125、#1121と進めること。

前回のハンドオフから引き続き委任可能なもの：#1073 → #1074 → #1075 / #1076（ADR-112、順序固定）；#1080 → #1083 → #1084（lens）；#963の残余；#1077 / #1078（ゲート外）。#1046はリリース準備の再調整にとどまる。

## worktreeの所在

`rigor-wt/perfbench-harness-775`は意図的に保持されています。本セッションでは`/Users/megurine/repo/ruby/worktrees/rigor/`下に管理対象のpi-subagents worktreeも残されました；#1158が着地した後にアイドル状態であれば剪定（prune）してください。
