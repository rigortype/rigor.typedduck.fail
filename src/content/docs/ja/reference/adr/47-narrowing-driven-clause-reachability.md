---
title: "ADR-47 — Narrowing-driven clause reachability (`flow.unreachable-clause`)"
description: "Imported from rigortype/rigor docs/adr/47-narrowing-driven-clause-reachability.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/47-narrowing-driven-clause-reachability.md"
sourcePath: "docs/adr/47-narrowing-driven-clause-reachability.md"
sourceSha: "484bafae5b630df75f835bab97312dd83ea1e38ed8f41321d53bb3e8da7b805d"
sourceCommit: "9a4902b92ddbe883b915858b6dcb577785630502"
translationStatus: "translated"
sidebar:
  order: 4047
---

ステータス: **Proposed —— 設計。Rigorの既存の2つの`if`/`unless`到達可能性ルールを、フロー（flow）エンジンが既に計算しているナローイング（narrowing）を用いて`case`/`when`（および条件付きで`case`/`in`）節に拡張する。Elixir v1.20の冗長な`case`節報告に触発されたもの;Rigorの偽陽性（false positive）エンベロープ内に収まるようスコープを限定する**。

## 動機

Elixir v1.20の型システム（[`docs/notes/20260604-elixir-v1.20-type-system-rigor-review.md`](../../notes/20260604-elixir-v1.20-type-system-rigor-review/)を参照）は、`case`節をまたいで対象（subject）の型を絞り込み、**決してマッチしない節をデッドコードとして報告する** —— これは高シグナル・低偽陽性の診断クラスだ。型が到達不能だと証明する節は、ほぼ常に本物のロジックエラー（古い`when`、順序を誤った節、分岐の下から型が移動してしまったケース）だからだ。

Rigorはこの作業の難しい半分を既に行っている。欠けているのはその上に乗る診断であり、それも`case`に対してだけだ —— `if`/`unless`は既にカバーされている。

## 現状

到達可能性ルールは2つあり、いずれも`IfNode` / `UnlessNode`に限定されている:

1. **`flow.unreachable-branch`**（v0.1.2）—— 述語が**構文上のリテラル**（`if false`、`expr if true`、…）のときだけ発火する。デッドな分岐を指す。[`check_rules.rb:1013`](../../lib/rigor/analysis/check_rules.rb)で挙げられている推論された定数による偽陽性を避けるため、意図的にリテラルのみとしている。
2. **`flow.always-truthy-condition`** —— 推論された定数版。非リテラルの述語が`Type::Constant`に畳み込まれるときに発火し、保守的なエンベロープを持つ: **ループ / ブロック内**の述語をスキップ（ミューテーション追跡が不完全なため）し、**防御的な述語呼び出し**（`nil?` / `empty?` / `zero?` / `respond_to?` / …）をスキップする —— ここでは戻り値に厳格なRBSが実際の実行時チェックと日常的に食い違う（`Module#name -> String`対 無名クラスの`nil`）。[`always_truthy_condition_collector.rb`](../../lib/rigor/analysis/check_rules/always_truthy_condition_collector.rb)を参照。

フローエンジンは**既に`case`を絞り込んでいる**。`eval_case_when_branches`（[`statement_evaluator.rb:527`](../../lib/rigor/inference/statement_evaluator.rb)）は`falsey_scope`アキュムレータを`when`分岐にまたいで通し、`Narrowing.case_when_scopes`（[`narrowing.rb:338`](../../lib/rigor/inference/narrowing.rb)）は各分岐について、`body_scope`（節の真エッジによって絞り込まれた対象）と`falsey_scope`（先行するすべての節の否定の連言によって絞り込まれた対象）を返す。つまり各`when`において、*それより前の節がどれもマッチしなかったと仮定したときの*対象の型を既に計算している —— これはまさに到達可能性診断が必要とする事実だ。

2つのギャップ:

- **`case`節は到達可能性診断を一切生成しない**。ナローイングは分岐ボディの型付けにのみ消費される。
- **`in`（パターンマッチ）分岐は網羅性を追跡しない**。`branch_body_and_falsey_scopes`（[`statement_evaluator.rb:542`](../../lib/rigor/inference/statement_evaluator.rb)）は`InNode`に対して`falsey_scope`を変更しないままにする（「保守的: まだ網羅性追跡なし」）。

## 互いに素であることのシグナル

`when C`節は、その節に入る`falsey_scope`のもとでの対象の型が`C`のマッチ型と**互いに素（disjoint、交わりが空）**であるとき到達不能だ。これはまさにElixirの`dynamic()`の*compatibility*テスト（「受理型と供給型が互いに素なときだけ違反」）であり、Rigorはそれを表現するキャリア（carrier）代数を既に持っている。

基盤（substrate）はこのシグナルを無償で与える: 入口の`falsey_scope`を節`C`の真エッジで絞り込むと、`C`がマッチしえないとき正確に、対象のローカルが**`bot`**（空の交差）になる`body_scope`が得られる。新しいdisjointness述語は不要だ —— 計算された`body_scope`内の`bot`な対象ローカルが到達不能性の証明*そのもの*だ。2つの形が導かれる:

1. **節ごとのdisjointness** —— 対象型 ∧ 節型 = `bot`（例: 対象が`Integer`に絞られた後の、後続の`when String`）。
2. **先行網羅（prior-exhaustion）** —— 節に入る`falsey_scope`が既に`bot`な対象を持つ（先行するすべての節の和が対象型をカバーした）ため、この節とそれ以降のすべてがデッドになる。

## 設計

### 新ルール: `flow.unreachable-clause`

- **発火対象:** `CaseNode` / `CaseMatchNode`内の`WhenNode`（および、ゲート付きで`InNode`）であって、計算された`body_scope`が対象ローカルを`bot`に絞り込むもの、または入口の`falsey_scope`が既に`bot`な対象を持つもの。
- **指す位置**: デッドな節の`statements`（決して実行されないボディ）—— `flow.unreachable-branch`の「デッドコードに波線」という配置をミラーする。空のボディを持つ節（有用な位置がない）はリテラルルールと同様にスキップする。
- **重大度:** `warning`、2つの`flow.*`兄弟に合わせる。`flow.unreachable-branch`と並べて[`severity_profile.rb`](../../lib/rigor/configuration/severity_profile.rb)の3つの層（`info` / `warning` / `error`）すべてに配線する。
- **抑制**: デッド節の行に`# rigor:disable unreachable-clause`、[`rule_catalog.rb`](../../lib/rigor/analysis/rule_catalog.rb)に登録する。

### 仕組み

ナローイングは`eval_case_when_branches`で既に計算されている;ルールは分岐ごとの`(body_scope, falsey_scope)`の組を診断パスに表出させる必要がある。`check_rules`でナローイングを再計算するよりも、**評価時に収集する**（`AlwaysTruthyConditionCollector`に類似した、対象 + 絞り込み済みスコープを与えられるコレクター）ことを優先する —— こうすればルールとボディ型付けが同一のナローイングを読み、乖離しえない。

### 偽陽性エンベロープ（継承、交渉の余地なし）

`flow.always-truthy-condition`のエンベロープをそのまま再利用する —— このルールは同じリスククラスだ:

- **対象は絞り込まれなければならない**。`case_when_scopes`は、対象が既知の型を持つ`LocalVariableReadNode`でない限り、既に入口スコープにバイルアウトする（[`narrowing.rb:364`](../../lib/rigor/inference/narrowing.rb)）。ナローイングなし ⇒ 発火なし。これだけで大半の危険な形が除外される。
- **ループ / ブロック内をスキップ** —— 同じミューテーション追跡のギャップ。
- **防御的な形の対象 / 節をスキップ** —— エンジンがnilになりえないと信じているRBS厳格な戻り値に対して防御する`when nil`を咎めない。
- **具体的な絞り込み済みキャリアを要求する** —— `Nominal` / `Constant` / `Tuple` / 互いに素なユニオン（union、合併型とも）で発火する;`Dynamic[T]`や未解決のシェイプ（shape）では決して発火しない。`Dynamic`に対するdisjointnessは決して証明できないため、そこでは決して発火しない —— <ruby>漸進的保証<rp>（</rp><rt>gradual guarantee</rt><rp>）</rp></ruby>が保たれる。

## 作業決定スライス

- **WD1 —— `when`のdisjointness（節ごと）**。狭く価値の高い中核: `body_scope`の対象が`bot`になる`when C`。リテラルクラスの`when`を最初に（`when String` / `when MyClass`）、`case_when_scopes`が既に認識する形。
- **WD2 —— 先行網羅**。先行する節の和によってデッドになった`when`（および末尾の`else`）をフラグする。`falsey_scope`の`bot`チェックが必要;同じアキュムレータで、新しいナローイングは不要。
- **WD3 —— `in`節（ゲート付き）**。`branch_body_and_falsey_scopes`が`InNode`のパターン網羅性を学習した後でのみ拡張する。その作業の後ろに先送り;パターンのdisjointnessはより大きく独立した精度プロジェクトだ（先送りされたADR-36の`is_a?`網羅性が隣接する）。網羅性をその場限りで推論してWD3を出荷**しない**こと。
- **WD4 —— コーパスFPゲート**。デフォルトオンにする前に、回帰コーパス（[`reference_survey_external_projects`]によるMastodon / GitLab / Redmine）に対して`--no-cache`でルールを実行し、すべてのヒットをトリアージしてネットの偽陽性をゼロにする —— ADR-43が`check-plugins`をゲートしたのとまったく同じやり方だ。そのゲートが緑になるまでは`info`（またはフラグの背後）で出荷する。

## 却下 / 先送りした代替案

- **`check_rules`でナローイングを再計算する**（エンジンのスコープを再利用しない）—— 却下: 2つのナローイング経路がドリフトし、ここでの乖離は偽陽性、すなわち大罪だ（[`feedback_false_positive_discipline`]）。評価時に収集すること。
- **`Dynamic[T]`な対象で発火する** —— 却下: 漸進的（gradual）な`Dynamic`のもとではdisjointnessは決して証明できないため、そこでの発火は不健全で*かつ*偽陽性だ。これはElixirの*compatibility*ルールも引く境界だ。
- **`in`の完全なパターンマッチ網羅性** —— 独自の作業に先送り（WD3 + ADR-36の隣接）。ここではスコープ外。
- **Elixir流のstrong arrowsによる健全性** —— 追求しない。Rigorはロバストネス原則（[ADR-5](../5-robustness-principle/)）のもとで意図的に不健全だ;このルールは*証明可能な*`bot`のケースだけを報告し、そのエンベロープ内に留まる。対比のために記録する、採用はしない。

## 根拠

- [`docs/notes/20260604-elixir-v1.20-type-system-rigor-review.md`](../../notes/20260604-elixir-v1.20-type-system-rigor-review/) —— 出典の比較（§4-2）。
- [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/) —— このルールが読むナローイング / ファクト安定性の契約（contract）。
- [`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/) —— `flow.*`の分類体系 + 重大度解決。
- [ADR-36](../36-mangrove-enum-nested-class-emission/) —— WD3が依存する、先送りされた`is_a?`網羅性の作業。
