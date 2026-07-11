---
title: "ADRステータス忠実度監査 —— ADR-0〜ADR-41（2026-07-11）"
description: "rigortype/rigor docs/notes/20260711-docs-audit-adr-0-41.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-audit-adr-0-41.md"
sourcePath: "docs/notes/20260711-docs-audit-adr-0-41.md"
sourceSha: "97faa74711fff34db8259d71a3237ee089e480c6c77bf3048b670733ab9ef014"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

観点: ステータスの正確性のみ（決定の質でも文章でもない）。各ADRについて、確認した4つの情報源は{ADRファイルの`Status:`フィールド・`docs/adr/README.md`のインデックス行・`CLAUDE.md`のADR箇条書き・実態（CHANGELOG-0.1.x / CHANGELOG.md / `lib/`）}である。

## ドリフト表

| ADR（ファイル）| ファイルのステータス | READMEのステータス | CLAUDE.md | 実態 | ドリフト | 深刻度 | 提案する修正 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ADR-19（`19-language-server-packaging.md`）| "Accepted, 2026-05-17"（実装ノートなし）| "Accepted"（実装ノートなし）| タイトルのポインタのみ | **出荷済み** —— `rigor lsp`コマンド（`lib/rigor/cli/lsp_command.rb` + `lib/rigor/language_server/`）；LSP v1/v2 + 後続対応がv0.1.x全般にわたる；ADR自身の本文13行目が「Language Server v1 landed in v0.1.6」と述べている | ステータスフィールドとREADME行が過小表現: どちらも素の"Accepted"としているが、ファイル本文**および**実態が実装を裏付けている。姉妹の実装済みフィーチャーADR（17/18/32/33/34）はステータス行とREADME行の両方に「implemented in v0.1.x」を記載しているが、ADR-19だけがそれを省いている。| 低（矛盾ではなく過小表現）| ステータス行 → "Accepted, 2026-05-17; LSP v1 implemented in v0.1.6"；README-19行 → "Accepted (LSP v1 implemented in v0.1.6; v2 + follow-ups across v0.1.x)"。|
| ADR-37（`37-plugin-interface-segregation.md`）| "Slices 1–3 implemented; `flow_contribution_for` REMOVED 2026-06-11 (ADR-52 WD3)" | "(Slices 1–3 implemented; all bundled walker plugins migrated)" —— **削除ノートなし** | "accepted, Slices 1–3" | フックは実際に削除済み —— 検証済み: `lib/rigor/plugin/registry.rb`に残る`flow_contribution_for`の参照はフェイルクローズのロード時ArgumentErrorガードであり、残りは歴史的なコメント；ADR-52 WD3/5bが削除を裏付ける | README（およびCLAUDE箇条書き）が、ADRファイルが記録している削除マイルストーンを省いている。矛盾ではない —— READMEは移行後の削除について古くなっているだけ。| 低 | README-37行に追記: "; the legacy `flow_contribution_for` hook was deleted 2026-06-11 (ADR-52 WD3)"。任意 —— 情報提供のみ。|

## 範囲内のその他すべて: 一貫している

- ADR-0–5, 8, 12: ファイル + README + CLAUDEで素の"Accepted"；基盤的／出荷済みで、未実装の主張も矛盾もない。欠陥ではない。
- バージョン刻印済みの実装済みADR —— 9（v0.1.1）、10/11/13/14（v0.1.4）、17（v0.1.13）、18（v0.1.6）、22（v0.1.7–0.1.9）、23（v0.1.9）、32/33（v0.1.10）、34（v0.1.13）: ファイルのステータス、README、CLAUDEのすべてがCHANGELOGと一致している。
- 部分的／延期されたADR —— 15（forkは有効／Ractorは延期）、16（slices 1–7 + 6a/6b）、20（部分的なHKT）、27（部分的；単一バイナリは延期）、35（slices 1–4；5は延期）、36（Slice A）、38（def形式；ブロックは延期）、39（Inflector + 3コンシューマー；slice 3は延期）、40（メカニズム + 13プラグイン）: WDごと／スライスごとのサブステータスが3つのドキュメント情報源すべてで一致している。
- 提案中／未実装のADR —— 21（Rubydex評価）、30（`rigor-ffi`；`plugins/`|`examples/`にffi gemが存在しないことを確認）、41（推論バジェット；仕様の`budgets:`テーブルは実際に未接続 —— `BudgetTrace`はトレース計装のみであり仕様テーブルではない）: 3つの情報源すべてで"Proposed"が正確である。
- ADR-24 → ADR-57のクロスリファレンス（"WD3 in-body adoption gate opened by ADR-57, 2026-06-12"）: 対象が存在し、README-24 + CLAUDE + ADR-57で関係が相互に対応している。
- ADR-26（ActiveRecordリレーション型付け／`open_receivers`）: ファイルは"implemented"、READMEは"Accepted"、CLAUDEはaccepted；`open_receivers`は`lib/rigor/plugin/manifest.rb` + `registry.rb`に存在する —— 実装済みで、情報源に互換性がある（READMEの"Accepted"は誤りではない）。
- ADR-7「partially superseded by ADR-54」（本文）—— ステータスは正しくAcceptedのまま；対象のADR-54は存在する。0–41の範囲に全面SupersededとなっているADRはない。

## 評決

ADR-0–41全体のステータス衛生は堅牢である: 42レコード中40がファイル／README／CLAUDE／実態で一致しており、ステータスの逆転はない（"Proposed/未実装"が出荷されたものも、"Accepted/実装済み"が実体のないものもない）。2つの発見事項はどちらも低深刻度の**過小表現**であって矛盾ではない: ADR-19のステータスフィールドとREADME行は、ADR自身の本文と比較可能なあらゆる実装済みフィーチャーADRが記録している「implemented in v0.1.6」マイルストーンを省いており、README-37は`flow_contribution_for`の削除についてファイルより遅れている。どちらも作業が出荷されたかどうかについて読者を誤解させはしない；いずれも1行の手直しである。確認のために挙げられたサイクルをまたぐ項目 —— ADR-26（実装済み）とADR-24→ADR-57のモジュールシングルトンゲート参照 —— は最新であり正しく反映されている。
