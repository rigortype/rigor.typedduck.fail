---
title: "`plugins/` 近代化スイープ — SKILL 適用による本番プラグインのドリフト監査"
description: "Imported from rigortype/rigor docs/notes/20260704-plugins-modernization-sweep.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260704-plugins-modernization-sweep.md"
sourcePath: "docs/notes/20260704-plugins-modernization-sweep.md"
sourceSha: "e8a55373938541d68e53700bf4f9925b7dc2f7e61cdcc6988cc5b1b445ee2c66"
sourceCommit: "ee19f4b60fca3bd0ceb677ebb395593203f2ea48"
sourceDate: "2026-07-04T20:23:29+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266704
---

Status: 内部監査ノート、authored 2026-07-04（Rigorはrelease/0.2.xライン）。`examples/`近代化
（[`20260704-examples-plugin-modernization-survey.md`](../20260704-examples-plugin-modernization-survey/)、
PR #35でmasterマージ済み）で新設した`rigor-plugin-review`スキル
（[`skills/rigor-plugin-review/`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-review/SKILL.md)）を、今度は本番31
プラグイン（`plugins/`）に適用した記録。ブランチ`plugins-modernization`の実装PRを駆動。設計コミットメントなし。

## 要旨 — 本番プラグインは概ね近代化済み、ドリフトは外科的

本番プラグインはADR-60 WD4オーサリングヘルパ移行の*corpus*だったため、examplesほどの
ドリフトはない、という事前仮説はスキャンで裏付けられた。スキルの9観点で全31プラグインを
スキャンした結果：

| 観点 | 結果 |
| --- | --- |
| 1. ADR-40 configデフォルト | **ドリフトなし**（`DEFAULT_*`を持つplayground/sorbetはconfig非該当 — CLIポート・sigilレベル内部定数） |
| 3. `type_specifier`（→`narrowing_facts`）/ `flow_contribution_for` | **全移行済み**（author verb使用0、`flow_contribution_for`はコメントのみ） |
| 4. 手書きLevenshtein | **なし**（全プラグイン`Base.suggest`使用済み） |
| 7. manifest衛生（`external_files:`/`verbs:`/`name_arg_position:`） | **クリーン** |
| 2. AST走査の所有権 | genuine smell **1件**（hanami）— 他の`class_nodes`/`def walk`はdiscovery/collectパス（`#prepare`/`node_file_context`由来で正当） |
| 4. `Diagnostic.new` node-level | genuine smell **候補1件が誤検出**（rspec、下記） |
| 8. doc鮮度 | 微修正2件（activerecordコメント・sorbet READMEの`flow_contribution_for`考古学） |

## 実施した変更（外科的、各々specバイト同一ゲート）

1. **rigor-hanami — ActionCheckerを`node_rule(Prism::ClassNode)`へ**（観点2）。
   ADR-28 protocol-contractのcheck半分が`diagnostics_for_file` + 手書き`class_nodes`/`walk`
   だった（web exampleと完全同型）。`ActionChecker#check_class`に分解し`class_nodes`/`walk`を削除。
   本番のcanonicalなper-class検査形へ。hanami spec 12/12緑。examplesのweb修正の本番版。
2. **rigor-sorbet — 3つの`walk_for_*`を`node_rule(Prism::CallNode)`へ**（観点2）。
   `T.absurd`到達・`T.reveal_type`・`T.assert_type!`の各診断が`diagnostics_for_file` +
   3本の手書き全走査だった。各々、推論フェーズ（`dynamic_return`/`narrowing_facts`）で
   **object identityで記録**された集合（`@reachable_absurd_nodes`等）へのmembership照合。
   node_ruleは診断フェーズ（推論後）に発火するので集合はpopulate済み、同一parse treeで
   identity一致、membershipがgate。`diagnostics_for_file`はparse-error専用に縮小、6メソッド削除。
   sorbet spec 68/68緑。最複雑プラグインだが健全性の事前分析どおり。
3. **doc鮮度** — activerecordのコメントとsorbet README表から`flow_contribution_for`の
   考古学的言及を除去し、現行機構を直接記述（観点8）。

## 教訓 — スキルの「オラクル規律」が誤検出を捕捉

観点4の初期トリアージで**rspec/analyzerの`Diagnostic.new`をnode-level smellと誤判定**し、
`Diagnostic.from_location`へ置換したところspecが4例失敗（診断がnil化）。原因は
`Diagnostic`が`Rigor::Analysis::Diagnostic`ではなく**プラグインローカルの`Struct`**（中間値
オブジェクト）で、`from_location`を持たなかったこと（rspec.rbが後段で本物へ変換する二層構造）。
即座にrevert（47/47緑に復帰）。**教訓**: `Diagnostic.new`のgrepはengineのDiagnosticと
プラグインローカルの値オブジェクトを区別できない → 置換前に`Diagnostic`の実体を確認せよ。
スキルの「各ステップ後にspecをオラクルにする」規律が、複雑プラグインでの誤った近代化を
コスト最小で捕捉した実例。

## 触れなかったもの（churn回避）

- **discovery/collectウォーカー**（activerecord/analyzer, activestorage/attachment_discoverer,
  rails-routes/helper_discoverer, sorbet/catalog_walker等）— `#prepare`/`node_file_context`の
  collect半分で、走査は必須（スキル観点2の明示的除外）。
- **file-level `Diagnostic.new(line: 1)`**（各プラグインのload-error）— 位置すべきnodeが無く正当。
- **rspec/analyzerのローカル`Diagnostic` Struct** — 中間値オブジェクトでsmellでない（上記）。
- ADR-40 / `narrowing_facts` / `suggest` / WD4ヘルパ — 本番は既に採用済みで対象なし。

## 参照

- [`20260704-examples-plugin-modernization-survey.md`](../20260704-examples-plugin-modernization-survey/) — 姉妹作業（examples、PR #35）
- [`skills/rigor-plugin-review/`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-review/SKILL.md) — 適用したスキル（同PRで新設）
- ADR-37（`node_rule` engine-owned walk）・ADR-52（`dynamic_return`）・ADR-60 WD4（オーサリングヘルパ）
