---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "2157e34f242483d1513ef75acc9d851b5d52877dcff51219b10a21e9b9865be7"
sourceCommit: "f6764bdb6e31ef848e10dccabd863adf0de6f519"
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

## 2026-11-19時点の状態

2つの作業がここで終了した。どちらも消化すべきキューは残していない。

- **ADR-116の再構築キャンペーンは純粋な移動の時点で終了した**（ADR-116 §「着地点、2026-11-18」）。最後に残っていた項目も着地した（#3349: `make verify-quick`は`tool/spec_costs.tsv`からの時間予算によってミラーディレクトリのspecを選択する）。`lib/rigor/`配下で計画を立てる前に`docs/agents/code-map.md`を読むこと。`spec/docs/lib_file_budgets.yml`はファイルサイズを保持しており、`inference/statement_evaluator.rb`は予算の1行下にあるため、そこでの新しいロジックは独立したモジュールに置く。3つの大きなファイルの再設計はファイルごとに起票され、個別に扱われる: #3344（`StatementEvaluator`）、#3345（`ExpressionTyper`）、#3346（`ScopeIndexer`）。
- **Rigor自身のソースの型付け（#3315）は2つの終点で終了した**。
  - セルフチェックは`parameter_inference: true`（`.rigor.dist.yml`）かつissueに紐づく抑制なしで実行される。`spec/rigor/self_check_suppressions_spec.rb`は`lib/`配下のすべての`# rigor:disable`を表記された理由および現在も発火していることに固定する。`make coverage`、`check-incremental`、メモ監査、および`type_of`シャドウは`.rigor.gates.yml`を通じてこのキーをオフのまま維持する（`spec/rigor/self_check_gates_config_spec.rb`がこの分割を固定する; `acceptance-gates`に新しいrigor実行ステップを追加する場合はどちらか一方に置かなければならない）。
  - `make coverage`は式の精度とDynamic呼び出し箇所の割合を`tool/coverage_ratchet.yml`の一方向ピンに固定する（キーオフ）: #3356時点で59.58%と49.83%。キーオンでは手動計測で64.75%と43.89%。向上は`make coverage-tighten`で記録し、ピンを悪い方向へ動かす場合は承認キューのエントリーとなる。`docs/agents/measurement.md` §「セルフタイピングのラチェット」。
  - `sig/`内の手書きパラメータは`def`に対する形状が検査され（#3348）、戻り値がレンダー不能な間は残余とは別にカウントされる（#3329）。`docs/agents/type-authoring.md`。
  - 残りは利得順のバックログである: #3355（最大のDynamicルートの背後にある4つの推論ギャップ ── メモHashの読み戻しだけで宣言1バッチ分を上回る）、#3357（移動によって作られたモジュールの宣言; #3354が実例で、1バッチ約265呼び出し箇所）、#3307。
- **途中で見つかったエンジン不具合は起票済みであり、この作業の所有ではない**: #3327（ADR-67 WD6bの穴）、#3331〜#3334、#3336、#3343（ループ内容の結合）、#3351（既知の制限: エンジンがリンクしないエイリアスを通じたミューテーション後に非空ファクトが陳腐化する）、#3352、#3342、および#3350（ツール）。
- **この作業からの承認キューエントリーは批准待ち**: `statement-evaluator-clusters.md`、`expression-typer-clusters.md`、`verify-quick-time-budget.md`、`non-empty-fact-invalidation.md`、`self-check-parameter-inference-gates.md`、`self-typing-ratchet.md`。

## 次に取り組むこと

1. 現在のマイルストーンをトリアージする（`gh issue list --milestone <name>`）。展開する前に`docs/agents/parallel-lanes.md`を読むこと。
2. Rigor自身のソースの型付けを再開する場合は、宣言を増やすのではなく#3355のギャップAから始めること。
