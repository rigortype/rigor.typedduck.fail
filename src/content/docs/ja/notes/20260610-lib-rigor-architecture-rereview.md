---
title: "lib/rigor 内部アーキテクチャ再検討 — 正式リリース前の構造監査"
description: "Imported from rigortype/rigor docs/notes/20260610-lib-rigor-architecture-rereview.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260610-lib-rigor-architecture-rereview.md"
sourcePath: "docs/notes/20260610-lib-rigor-architecture-rereview.md"
sourceSha: "28406574e941ec0050e6c42a67923f820b00b7180b9d3400059506ebfe2050a4"
sourceCommit: "7c189bd84c14aa0f88b13306f3796c488c52a8b0"
sourceDate: "2026-06-10T10:27:08+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266610
---

*2026-06-10. Status: structural audit feeding ROADMAP entries + an ADR — informational,
not normative. The spec binds. Observations taken against the working tree @
`75484162` (post-v0.1.17, pre-v0.1.18 cut). 4サブシステムを並列調査し、影響の
大きい指摘は本体grepで裏取りした。*

## Question

正式リリース（ADR-50: v0.2.0評価リリース → v1.0契約凍結）前に、`lib/rigor`の
内部アーキテクチャを**（a）論理的な役割分担の明確さ**と**（b）冗長なボイラー
プレート・無駄なメソッドコールの削減**の2軸で再点検する。先行監査
([builtin boilerplate](../20260603-builtin-typing-boilerplate-audit/) /
[structural repetition](../20260604-structural-repetition-audit/) /
[plugin architecture](../20260610-plugin-architecture-perf-audit/))が消化済みの
領域を再掲せず、**残っている構造課題だけ**を棚卸しする。

## 前提 — 消化済みの領域

- ボイラープレート: Theme A (ValueSemantics/AcceptanceRouter) / C (CLI::Command) /
  D（Diagnosticファクトリ + RbsCacheProducer + LSP mixin）、builtin Finding 1–4
  （SingletonFolding / CallContext単一インターフェイス / `MethodCatalog.for_topic`）
  はすべてDONE（各ノートのprogress log参照）。
- アロケーション: ADR-44（body-scope collapse、−42% allocs）LANDED。
- プラグイン消費経路: ADR-52が**提案済み・未実装**。本監査のA-1がその実装を
  最優先に置く根拠を再確認した。

## 全体評価 — 土台は健全

- **依存方向に循環なし**: `cli → analysis → inference → type`の一方向。
  逆流は2件のみで、いずれも許容範囲 — `type/combinator.rb:19`の
  `Inference::BudgetTrace`（計測のみ）と、`Scope`が`Analysis::FactStore`を
  運ぶ名前空間のねじれ（機能上問題なし、低優先の改名候補）。
- Scope不変規律・fail-soft・`try_dispatch(CallContext)` tier統一は
  internal-specの宣言どおり機能している。
- `ExpressionTyper`（型値）/ `StatementEvaluator`（スコープ遷移）/
  `Narrowing`（狭窄）/ `MethodDispatcher`（解決）の四役分担は概ね成立。
  循環参照なし。

## 所見A — 無駄なメソッドコール（性能軸）

### A-1. プラグイン貢献ディスパッチ（ADR-52、本丸）

レガシー`flow_contribution_for`は全コールノード × 2経路で無条件に呼ばれ、
node_ruleはプラグインごとにファイル全walk。
[ADR-52](../../adr/52-compiled-plugin-contribution-dispatch/)のWD1–WD6実装が
このテーマ最大の一手。詳細は
[プラグインアーキテクチャ監査](../20260610-plugin-architecture-perf-audit/)。

### A-2. 組み込みtierも「全tier試行」をしている

`String#+`のような典型コールでも`PRECISE_TIERS`の14 tier全部が
`CallContext`を受けてnilを返してからRbsDispatchに到達する
（`method_dispatcher.rb:738`周辺、1コールあたり50–70マイクロ操作の空振り）。
singleton folder群はreceiverが`Singleton[Math]`等でなければ絶対に当たらない
ので、**ADR-52と同じ「エンジンが既に持っているキーで1回引く」思想を組み込み
tierにも適用できる**（receiverクラス / メソッド名キーの前置フィルタ）。
ADR-52のWD追補ないし姉妹スライスが自然。計測ゲートはADR-52 WD6と同一
（診断byte-identical + stackprof + `make bench-perf`）。

### A-3. CallContextの重複構築

1 dispatchで最大3個生成される — 入口`method_dispatcher.rb:86`に加え、
Tier B昇格`:476`とユーザークラス落下`:791`が`CallContext.build`を
やり直す。`Data#with`の差分コピーで機械的に削減可能。ADR-44メモの
「CallContext per-dispatch (intrinsic) still open」の実態はこれで、
intrinsicな1個以外は削れる。

### A-4. ファイルあたりのAST walk回数

1ファイルにつきScopeIndexer 1回 + CheckRulesの`NodeWalker.each` 1回
(`check_rules.rb:167`)+ 独立collector 4回(`:228` IvarWrite / `:242`
DeadAssignment / `:255` AlwaysTruthyCondition / `:265` UnreachableClause)
+ node_ruleを持つプラグイン数 = **最低6 + N回**。プラグイン分はADR-52 WD4
（エンジン所有の単一walk）が解消する。CheckRulesの4 collector統合は
**走査順が正しさに効く**ため、shadow-run等価性ハーネスなしに触らない
（structural-repetitionノートのTheme Bと同じ判断）。→ 所見B-4 / ADR行き。

### A-5. OverloadSelectorのacceptance呼び出し回数

`overload_selector.rb:259`で全overload × 全paramの`accepts`が走り、
Union receiverではmember数が乗じる(例: 3-member Union × 5 overload ×
3 param = 45回)。`Acceptance`自体はTYPE_HANDLERSテーブル + 構造等値
short-circuit済みで1回は軽い。**計測してから**の最適化候補(現プロファイル
では支配項ではない)。

## 所見B — 役割分担（構造軸）

### B-1. `Analysis::Runner`（2011行）が最大のモノリス

ファイル列挙 / 7つのプロジェクト事前パス（`runner.rb:448-514`）/
Ractor・forkプール調整（約400行、`:747-1163`）/ run-resultキャッシュキー /
12+ 系統の診断源集約（`:297-338`, `:613-628`）/ severity適用 / reporter drain /
プラグイン実行が1クラスに同居。**`PoolCoordinator` / `ProjectPrePasses` /
`DiagnosticAggregator`の3分割**でorchestrator本体は ~600行に収まる。
挙動不変のコンテナ分割でリスク低。ADR-46後続スライスやLSPの
「pre-built Environmentを受けるRunner」要望（ROADMAP § LSP Ractor pool）の
足場としても効く。

### B-2. 確定性（certainty）判定の二重実装

`case/when`の枝確定性（`:yes/:no/:maybe`）を`expression_typer.rb:791-862`
（`case_when_branch_certainty` / `case_when_pattern_certainty`）が独自実装して
おり、同じパターン解析が`narrowing.rb:365`（`case_when_scopes`）にもある。
`StatementEvaluator`は`Narrowing.case_when_scopes`委譲済み
（`statement_evaluator.rb:560-584`）なので**二重**（三重ではない）。
`if/unless`のtruthy/falsey確定性も`expression_typer.rb:678`
（`constant_predicate_polarity`）と`statement_evaluator.rb:492`
（`predicate_certainty`）が同じ`Narrowing.narrow_truthy → Bot?`イディオムを
別々に書いている。**「確定性判定はNarrowingが唯一の所有者、Typer / Evaluator
は問い合わせる側」への一本化**が役割分担として正しい形。ただし推論ホットパスの
正しさ中枢なので、機械的リファクタではなく専用スライス + 全suite + 診断不変
ゲートで。

### B-3. `cli.rb`の`run_check`残留

他14コマンドは`CLI::Command`委譲済みなのにcheckだけ本体に残る
（`cli.rb:83-287`約200行 + `parse_check_options` 256行）。`CheckCommand`
への移譲で対称性が完成。低リスク。

### B-4. Scopeのメタテーブル過多（設計判断案件 → ADR）

`scope.rb`は「束縛 + facts + narrowing状態」というflow-sensitiveな本務に
加え、`discovered_*`系 ~10個の**プロジェクト全体索引**(クラス / def /
可視性 / superclass / includes / class_sources / `data_member_layouts` …)を
運んでいる。後者はrun中不変であり、スコープ遷移のたびに`rebuild`で運搬する
必要は本来ない。`ProjectIndex`的分離は役割分担として最も筋が良い一方:

- ADR-44で類似の`ProjectScope`再編成が「Ruby 4.0 object-shapeでは
  アロケーション削減にならない」と降格された経緯がある(動機を性能でなく
  **境界明確化**に置き直して判断する必要がある)。
- プラグインが`Scope`経由で索引を読むpublic面（`user_def_for`等）に触る。
- A-4のCheckRules collector統合・structural-repetition Theme B
  （scope_indexer walker統一）と同じく**等価性ハーネスが前提**。

性能ではなく境界の問題としてADRで決める。→ ADR-53起票。

## 所見C — v1.0凍結前に塞ぐpublic API境界違反

[rigor-sorbet](../../plugins/rigor-sorbet/lib/rigor/plugin/sorbet.rb) `:585`が
`Rigor::Inference::Acceptance.accepts`を直接呼んでいる。`public-api.md`は
`Inference::*`をinternalと宣言しており、ADR-50の凍結前に解消必須。
`Type#accepts`はpublic surfaceなので`asserted.accepts(inferred)`への
書き換えでほぼ一行修正（AcceptanceRouterが同じ実装へ委譲）。
ほか: `rigor-sinatra:27`はコメント言及のみ（無害）、各プラグインの
`Diagnostic.new`直呼びはpublic面なので違反ではない(`Plugin::Base#diagnostic`
ラッパー推奨に寄せる余地はある)。

## 提案 — 4フェーズ

| Phase | 内容 | リスク | ゲート |
| --- | --- | --- | --- |
| 1（機械的） | C sorbet境界修正 / A-3 CallContext `with`化 / B-3 `run_check` → CheckCommand | 低 | `make verify` + 診断不変 |
| 2（本丸） | ADR-52実装WD1→WD6（+ A-2組み込みtier前置フィルタをWD追補） | 中 | ADR-52 WD6(byte-identical + stackprof + bench-perf) |
| 3（構造） | B-1 Runner 3分割 / B-2 certainty判定のNarrowing一本化 | 中 | 全suite + 診断不変 |
| 4（要ADR） | B-4 Scopeプロジェクト索引分離 / A-4 collector統合（shadow-run前提） | 高 | ADR-53 + 等価性ハーネス |

## Follow-up

- 全フェーズを`docs/ROADMAP.md` § Future cyclesに作業対象として登録する。
- Phase 4の設計判断をADR-53として起票する（deliberative / high stakes）。
- Phase 1はADR不要で即着手可能。
