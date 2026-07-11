---
title: "ドキュメント監査 —— ツリー全体のリンク整合性（2026-07-11）"
description: "rigortype/rigor docs/notes/20260711-docs-audit-link-integrity.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-audit-link-integrity.md"
sourcePath: "docs/notes/20260711-docs-audit-link-integrity.md"
sourceSha: "6516d252753a8c3c4029fe594db0b564af21b10e6d2b9cadd368693bb412e31d"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

包括的な「その他ドキュメント」の整合性監査（ステップ2のフォローアップ）の一部です。L0の`link_integrity_spec`はこれまで`docs/handbook/`＋`docs/manual/`しかカバーしていませんでした。`docs/`ツリー全体＋トップレベルのREADMEにわたる相対マークダウンリンクをすべて洗い出しました。

## 結果

**出荷／規範ドキュメントはリンク的にクリーン: 259ファイル／2,664本の相対リンクにわたって破損0本**（`#anchor`フラグメントと`:line`ソースポインタ接尾辞を取り除き、コードスパンを無視した状態で）。これは`docs/{type-specification,internal-spec,adr,design}`、トップレベルの`docs/*.md`（ROADMAP、compatibility、types、install、CURRENT_WORK）、そしてREADME／plugins／examplesをカバーします。

## 唯一の本物のクラスタ —— 凍結アーカイブのチェンジログ（決定により未修正）

`docs/CHANGELOG-0.0.x.md`と`docs/CHANGELOG-0.1.x.md`は、約200本の破損した相対リンクを抱えています。根本原因: これらはルートの`CHANGELOG.md`（そこでは`docs/adr/…`／`lib/…`のルート相対リンクが正しく解決される）から**リンクを書き換えないまま**`docs/`へ切り出されたため、新しい配置場所からは`docs/adr/…`が`docs/docs/adr/…`に解決されてしまいます。加えて、いくつかのターゲット（`lib/rigor/flow_contribution.rb`、`docs/internal-spec/cache.md`、`docs/MILESTONES.md`、…）は、0.1.x時代以降にリネームまたは削除されたファイルを指しています。

**決定: そのまま残す。** これらは凍結された歴史的記録であり、リンクは執筆当時にはリポジトリルート基準で正しく、約200本のリンク —— そのいくつかはもはや存在しないファイル向け —— を一括で書き換えるのは、チェンジログのアーカイブに対する高チャーンで部分的に不可能な歴史改変です。ここに記録し、ゲートからは除外します。

`docs/notes/`もまた、ルート相対リンクや外部論文へのリンクを抱えています（一時的なレビュー／セッションのメモであり、出荷ドキュメントではない）—— これも同様に除外します。

## 着地した変更

`spec/docs/link_integrity_spec.rb`を拡張し、`docs/notes/`と`CHANGELOG-0.*.x.md`アーカイブを除いた**`docs/`ツリー全体**（handbook＋manualだけではない）をゲートするようにし、存在チェックの前に末尾の`:line`／`:line:col`ソースポインタ接尾辞を取り除くようにしました。`make docs-check`の230個の例がグリーンです。
