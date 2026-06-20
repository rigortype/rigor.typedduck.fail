---
title: "設計ノート"
description: "rigortype/rigor docs/design/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/README.md"
sourcePath: "docs/design/README.md"
sourceSha: "f78d1d6a73a0bd56b6f5c48d88768a0a6a9ce83d1dd26fb0b1c198297c1c27a7"
sourceCommit: "d966039262656ed4e9d1900ebe003c332990a0ce"
translationStatus: "translated"
sidebar:
  order: 5000
---

決定が批准される*前*に書かれる、将来を見据えた**設計ドキュメント** — ロードマップ、スライス分割の決定、機能スケッチです。問題空間を探索し、選択肢を比較検討し、方向性を提案します。

これらのドキュメントは**非規範的**です。ここでの設計が採用されると、[ADR](../adr/)（根拠）や[型仕様](../type-specification/)／[内部仕様](../internal-spec/)（拘束力のある挙動）へと昇格します。拘束力を持つのは仕様とADRであり、設計ノートには拘束力はありません。ノートは部分的に置き換えられたり、陳腐化したり、一度もスライスされないこともあります — 依拠する前に、各ノート冒頭の**Status**行を読んでください。

ファイル名は`YYYYMMDD-<slug>.md`で、執筆日を日付とします。

## 索引

| Date | Document | Status |
| --- | --- | --- |
| 2026-05-05 | [Cache slice taxonomy — pre-v0.1.0 design notes](20260505-cache-slice-taxonomy/) | Draft (informs [ADR-6](../adr/6-cache-persistence-backend/)) |
| 2026-05-05 | [v0.1.0 readiness — pre-plugin design notes](20260505-v0.1.0-readiness/) | Draft (historical) |
| 2026-05-08 | [Rails Ecosystem Plugins — Roadmap](20260508-rails-plugins-roadmap/) | Planning (live; linked from CLAUDE.md) |
| 2026-05-09 | [dry-rb Ecosystem Plugins — Survey](20260509-dry-plugins-roadmap/) | Research (informs [ADR-12](../adr/12-dry-rb-packaging/)) |
| 2026-05-09 | [Rigor and Tapioca — Comparison and Strategy](20260509-rigor-tapioca-comparison/) | Notes |
| 2026-05-09 | [`rigor-tapioca`? — Tapioca DSL-RBI Coverage Investigation](20260509-rigor-tapioca-investigation/) | Investigation |
| 2026-05-14 | [Ractor migration — staged plan](20260514-ractor-migration/) | Draft (Phase 1 landed; see [ADR-15](../adr/15-ractor-concurrency/)) |
| 2026-05-16 | [Editor mode — single-file fast-response analysis](20260516-editor-mode/) | Draft |
| 2026-05-17 | [`rigor-dry-validation` — slicing decision](20260517-dry-validation-slicing/) | Design note |
| 2026-05-17 | [Language Server — in-process Ruby LSP for Rigor](20260517-language-server/) | Draft (→ [ADR-19](../adr/19-language-server-packaging/)) |
| 2026-05-17 | [LSP v2 — type-aware hover + completion](20260517-lsp-hover-completion/) | Draft |
| 2026-05-18 | [CLI editor mode — disk-backed `ProjectScan` snapshot cache](20260518-cli-disk-snapshot-cache/) | Design note |
| 2026-05-22 | [VSCode extension — first-party marketplace client for `rigor lsp`](20260522-vscode-extension/) | Draft |
| 2026-06-01 | [Plugin mechanism — pre-1.0 review（過不足 / ペインポイント / ボイラープレート）](20260601-plugin-mechanism-pre-1.0-review/) | Research (pre-1.0 optimization; would inform an [ADR-2](../adr/2-extension-api/) revision) |
| 2026-06-02 | [Plugin boilerplate reduction — phased plan](20260602-plugin-boilerplate-reduction-plan/) | Plan (implements review §1; tied to [ADR-37](../adr/37-plugin-interface-segregation/)) |

## 設計ノートの追加

1. 執筆日を使ってファイルを`YYYYMMDD-<slug>.md`と名付けます。
2. 種別（Draft／Design note／Research／Investigation／Planning）と何がそれを置き換えるかを述べる`Status:`行で始めます。
3. 上記の索引テーブルに行を追加します。
4. 設計が批准されたら、ADRを起こすか仕様を改訂し、ノートのStatusを拘束力のあるドキュメントを指すよう更新します。
