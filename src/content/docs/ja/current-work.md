---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor の docs/CURRENT_WORK.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "6cb08ecb45b6f2fdff732f2dd067896a8d7909cee96274a72be4ef1e368d2c9c"
sourceCommit: "0f252e3218936e8dc7004b574c709a434b996d2a"
sourceDate: "2026-09-19T04:46:09+09:00"
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

## 2026-09-19のセッションで決着した内容

徹底的な検討セッション（grilling session）により、前回のハンドオフで未解決だったメンテナーへの質問すべてに裁定が下されました。その後、裁定は敵対的レビュー（adversarial review）を経て、2つの初稿が覆されました: 1つは#1046の裁定と矛盾しており、もう1つはRailsの`default_render`を読み違えていました。裁定はそれが拘束力を持つ場所に記録されています:

- **#996 → [ADR-112](../adr/112-extrbs-comment-channel/)**（Accepted; ADR-111は失効）。RigorはRBSで表現できないもののために`# @extrbs`チャンネルを読み取り、プレーンなRBSは`@rbs` / `#: `に残ります。sig-genはリファインメントを`%a{rigor:v1:…}`として`sig/`に書き出します。整合性ルールがADR-32 WD13の「`sig/`が勝つ」を置き換えます。実装: #1073（リーダー）、#1074（ペイロード文法とエスケープ）、#1075（整合性ルール）、#1076（sig-gen;#1073と#1074によってブロック）。
- **#1059**: ADR-103 WD17を維持。マニュアルの`views: strict` / `lenient`のペアは1つの例に統合されました。#1048と#393はクローズされ、#394はブロック解除されました。
- **#1011、#1071**: 裁定を投稿済み;いずれも`ready-for-agent`。#1072は#512の重複としてクローズ。
- **`rigor lens` → [ADR-113](../adr/113-rigor-lens/)**（Accepted;敵対的レビューも実施済み）。型の来歴（provenance）とlisplens互換のアンカーを持つ宣言マップであり、1ファイルの`check`として計算されます。`type-of`も同じ計算を採用し、これは#512の「シードなし」の裁定を置き換えます;#512は#1083とともにクローズされます。Issue: #1080（`def_sites`）、#1081（xxh3）、#1082（`declared_members`）、#1083（フェーズ1）、#1084（MCP / スキル）、#1085（フェーズ2 `--annotate`、`ready-for-human`）。
- **#1046**: 2026-09-17の裁定を維持（受け入れ、リリース準備時に再調整）。#1043はクローズ。ゲートではないフォローアップ: #1077（#1010のアリティの無駄を削減）および#1078（`release-gate.yml`をスケジュールで実行）。
- ZARD初稿へのフィードバック: [`docs/notes/20260919-zard-first-draft-feedback.md`](../notes/20260919-zard-first-draft-feedback/)。

## メンテナー待ち

このリストからは何もありません。残っている裁定タイプのissueは、長らく保留されている`ready-for-human`バックログ（`gh issue list --label ready-for-human`）のみです。

## 次に着手する価値があるもの

委任可能・独立: #1071、#1011、#1077、#1078、#1081、#1082、および#394のV3スライス（Jbuilder、ViewComponent、Haml/Slim）。コア: #1073 → #1074 → #1075 / #1076（この順序で、1つのレーン）; #1080 → #1083 → #1084（lensレーン）; #394 V2、#963の非メタ定数書き込みの残余、および#1064項目6（ADR-15がオープンの間は低価値）。他の測定レーンがアクティブでない状態で#1077を測定すること;まず`docs/agents/measurement.md`を読んでください。

## worktreeの所在

`rigor-wt/perfbench-harness-775`は意図的に保持されています: #775のアロケーション作業の背後にある計測ツールです。
