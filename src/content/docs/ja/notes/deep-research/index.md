---
title: "deep-research/ —— 取り込まれた外部リサーチレポート"
description: "rigortype/rigor docs/notes/deep-research/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/deep-research/README.md"
sourcePath: "docs/notes/deep-research/README.md"
sourceSha: "508bd90b002acad9954055a9faf0012d7038bc679b42d28b2dbc9e94d7b667c1"
sourceCommit: "92a275c30b379c62ee3593f6c727a195565c146f"
translationStatus: "translated"
sidebar:
  order: 6000
---

**由来であって知見ではない。** このディレクトリ配下のすべては**外部**の資料
です——参照用に取り込まれたLLMのdeep-research出力（例: Gemini Deep Research、
Google Docs経由でエクスポート）です。ここにあるものは、どれほど権威ありげに読
めても、Rigorのファーストパーティな主張・計測・評価ではありません。

## レジスタ規則（この資料をどう引用してよいか）

- *調査したコミュニティ／競合の状況*としてのみ使うこと。「Rigorのドキュメント
  にはこうある……」や「我々が計測した……」として引用してはいけません——それ
  らのレジスタにはファーストパーティな出典（`docs/notes/`、`docs/adr/`、
  CHANGELOG群）が必要です。
- 角括弧付きの引用番号（`[5]`、……）は生成モデル自身の参照文献です。本物のもの
  もあれば、出典の記述からずれているもの、合成されたものもあります。再利用する
  前に参照文献を検証してください。
- 既知の欠陥クラス: これらのレポートには**Rigor自体に関する事実誤認**が含まれ
  ます——2026-07-12のバッチは、rigor-rsのRustポートの内部実装（`ruby-prism`、
  `bumpalo`のアリーナ割り当て）をRigor本体に帰属させ、Rigorを「型定義を生成す
  る」ものとして記述しています。レポートが仕様コーパスやADRと矛盾する場合は、
  コーパスが拘束します。

## 2026-07-12バッチ —— Rails導入ガイド（Sorbet / Steep / Rigor）

同一の日本語プロンプトで、ツールのURLだけを変えた3回のGemini Deep Researchの実
行です:

> Railsプロジェクトに <tool repo URL> の導入を検討しています。セットアップの
> 手順、導入後に必要なこと、ベストプラクティス、期待通りに型がつかないときの
> トラブルシューティングなどを、公式資料と非公式資料に分けてまとめて。

| File | Tool |
| --- | --- |
| [`20260712/rails-sorbet-adoption-guide.md`](20260712/rails-sorbet-adoption-guide/) | Sorbet + Tapioca |
| [`20260712/rails-steep-adoption-guide.md`](20260712/rails-steep-adoption-guide/) | Steep + rbs_rails / rbs_collection |
| [`20260712/rails-rigor-adoption-guide.md`](20260712/rails-rigor-adoption-guide/) | Rigor |

Google DocsのMarkdownエクスポートは取り込み時に正規化されます——見出しの太字解
除、コードブロックのフェンス化、バックスラッシュエスケープの除去、インライン引
用番号の角括弧化（コミット`0a4adf48`を参照）。

## バッチの追加

`YYYYMMDD/`ディレクトリの配下に統一された英語スラッグでファイルを置き、プロン
プトと生成器をこのREADMEに記録し、コミット前にエクスポートを正規化してくださ
い。
