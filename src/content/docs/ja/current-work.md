---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor の docs/CURRENT_WORK.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "67253d100825c6c44bfc820379ec764ff0545824e7bbf8d7bc54e434822621bb"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
sourceDate: "2026-09-18T04:21:19+09:00"
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

## メンテナー待ち

**[PR #1027](https://github.com/rigortype/rigor/pull/1027)はDraftとしてオープンされており、裁定なしではマージできません**。エージェントの指示セットを再編成します: 条件付きルールをポインタ（`docs/agents/contribution-flow.md`、`docs/agents/type-authoring.md`、および新規の`docs/agents/measurement.md`）の背後に移動することでAGENTS.mdが231行から127行へ削減され、スキルの説明が実装の詳細ではなくタスクの境界に基づいてルーティングされるようになります。ベースは`master`で、`make docs-check`はgreenです。

触れる前にその形状について知っておくべきことが2点あります。ブランチ`codex/optimize-agent-instructions`がリモートに存在し、**独自のPRを持ちません** ── そのコミットは#1027の5つのうち最初のものであるため、#1027をマージすればそれもマージされます;そのブランチに対して2つ目のPRを開かないでください。そしてブランチ名にはツールのプレフィックスが含まれており、PR自体は現在これを禁止しています: オープンなPRの配下でブランチ名を変更するとPRがクローズされるため（GitHubの改名APIが古いrefを削除する）、#1027がマージされるまで名前はそのまま維持されます。

**[ADR-111](../adr/111-inline-refinement-carrier/)はProposed状態でメンテナーの裁定待ちです**（[#996](https://github.com/rigortype/rigor/issues/996)）。不可視性ではなく有界性の基準に基づいて、Rigorが独自のコメント方言を持たないことを再確認することを推奨し、同一行の`%a{}`表記のみを推奨しています ── Steepはマニュアルに記載されている単独行形式をユーザー可視のエラーとして報告しますが、同一行形式は3つのリーダーすべてでクリーンです。[`docs/notes/20260912-inline-refinement-carrier-probe.md`](../notes/20260912-inline-refinement-carrier-probe/)に基づきます。何も実装されていません;メンテナーが決定します。

## 2026-09-17および2026-09-18に着地した内容

6つのバッチ。各PRは独自のworktree内のOpusレーンによって実装され、マージ前に1〜4回の敵対的レビュー（adversarial review）ラウンドを経ています。masterはc22278b7までgreenです。

- バッチ1: #1029（#986）、#1030（#963項目1）、#1031（#1014）、#1032（#1002）。
- バッチ2: #1034（#534項目5）、#1035（#963項目3）、#1036（#391）、#1037（#392）、#1041（#987）、#1042（#1039）、#1044（#534項目6、#534をクローズ）、#1050（#393スライス）。
- バッチ3: #1052（#1049）、#1053（#1038）、#1054（#1051）、#1057（#1048エッジのみ; `Refs`）。
- バッチ4: #1061（#1055）、#1062（#1056）、#1063（#963項目2）。
- バッチ5: #1066（#1047）、#1067（#1060）、#1068（#1064項目1および4; `Refs`）。
- バッチ6: #1069（#1040）、#1070（#1065）。

レビューラウンドにこそ価値がありました: #1057、#1063、#1069、#1070はいずれも最初のドラフトで「自信を持って間違った回答（CONFIDENTLY AND WRONGLY）」を出していました ── オーナーの裁定に反するレーン移動、プラグインによって置き換えられたRBS型、異なる識別子を型付けした列ルール、Railsが実行しない実行にラベルを付けたフォーマットフォールバックなどです。これらのドラフトのすべてにおいてCIはgreenでした。

## メンテナー待ち

- [#1059](https://github.com/rigortype/rigor/issues/1059) ── ファーストパーティの`discharge: true`プラグイン行が証明可能かどうか。ADR-103 WD17（オーナーの裁定、2026-08-24）は不可としています;#1048のstrict/lenient受け入れラインはこれを必要としています。裁定が出るまで、`views: strict`と`views: lenient`に違いはなく、#1048と#393はそのラインでオープンのままです。
- [#1011](https://github.com/rigortype/rigor/issues/1011) ── `sig-gen gap:`マーカーの規約。`sig/rigor/scope.rbs`内の2つの`Scope`行がこれを引用しています;別の方針が下された場合、それぞれ1行の向け直しとなります。

## 次に着手する価値があるもの

- [#1046](https://github.com/rigortype/rigor/issues/1046)および[#1043](https://github.com/rigortype/rigor/issues/1043) ── リリースゲートのアロケーション帯域。計測作業です;他のレーンがアクティブでない状態で実行し、まず`docs/agents/measurement.md`を読んでください。
- [#1064](https://github.com/rigortype/rigor/issues/1064) ── Ractorの末尾。項目1と4は#1068で着地しました;項目6（ワーカーが事前ウォームされたRBS環境キャッシュを見逃す）はRigor側の課題でオープン、項目2と3はupstreamです。
- [#1071](https://github.com/rigortype/rigor/issues/1071) ── `respond_to { format.js }`アームはそのアクションの`.js`テンプレートへエッジを張るべきです;#1070がコントローラアクションのラベルを獲得できなかった理由がこれです。
- [#1072](https://github.com/rigortype/rigor/issues/1072) ── redmineにおいて、`rigor check`が解決する定数に対して`rigor type-of`がDynamicと答えてしまう。
- [#394](https://github.com/rigortype/rigor/issues/394)（views V2/V3、ブロック解除済み）、[#963](https://github.com/rigortype/rigor/issues/963)の非メタ定数書き込みの非対称性。

## worktreeの所在

残りは1つです: `rigor-wt/perfbench-harness-775`（意図的に保持されています ── 残留したスクラッチではなく、#775のアロケーション作業の背後にある計測ツールです）。前回のハンドオフに記載されていた15個のworktreeは削除され、それらが担っていたすべてのPRはマージされました。
