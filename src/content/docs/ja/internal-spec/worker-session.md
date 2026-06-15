---
title: "Worker Session Protocol"
description: "Imported from rigortype/rigor docs/internal-spec/worker-session.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/worker-session.md"
sourcePath: "docs/internal-spec/worker-session.md"
sourceSha: "ec86710857d42926516ee9e29b318ea5f4a77ff2a836f76915a1dbdbde28fe3f"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
sidebar:
  order: 3050
---

`Rigor::Analysis::WorkerSession`は、並列解析を可能にするワーカーごとの解析基盤です。このページはセッションが満たす**契約（contract）**――共有可能な入力、所有権の境界、そして並列出力を逐次出力と同一に保つ等価性保証――を確定させます。並行性の*根拠*、フェーズのロードマップ、そしてforkかRactorかの決定は[ADR-15](../../adr/15-ractor-concurrency/)にあります。このプロトコルが依存する値オブジェクトの共有可能性要件は
[`plugin.md`](../plugin/#concurrency-and-value-object-shareability-adr-15)にあります。

## ステータス

出荷されている並列バックエンドは**forkされた永続ワーカー**プールです（ADR-15の修正）。Ractorで隔離されたプールは先送りされた目標です。`WorkerSession`基盤（ADR-15 Phase 4a）は、入力が`Ractor.shareable?`になるように作られています。forkバックエンドは今日これを使っており、同じセッションは将来のRactorプールが`Ractor.new`でラップするものでもあります。

## 共有可能な入力

コンストラクタは、ワーカー境界を安全にまたぐ入力のみを受け付けます。

- `configuration` ── `Rigor::Configuration`（`Ractor.shareable?`）。
- `cache_store` ── `Rigor::Cache::Store`、またはキャッシュを無効化する`nil`。fork／Ractorワーカーは、`Store`を渡される代わりに共有キャッシュルートディレクトリで自前の`Store`を構築してもよい（MAY）。
- `plugin_blueprints` ── `Array<Rigor::Plugin::Blueprint>`
  （`Ractor.shareable?`）。ワーカーごとのプラグインインスタンスはこれらから具体化されます（[`plugin.md`](../plugin/#concurrency-and-value-object-shareability-adr-15)を参照）。
- `explain` ── Boolean。
- `synthetic_method_index` / `project_patched_methods` / `project_scope_seed` ── 任意、デフォルトは`nil` / `{}`。これらは`Ractor.shareable?`では**ありません**（シードテーブルがPrismのdefノードを保持するため）。そのためRactorプールはこれらを未設定のままにします。forkバックエンド（親プロセスでfork前にセッションを構築する）はランナーのプロジェクトスキャン結果をここに通し、ファイルごとの推論が逐次パスと正確に一致するようにします。`project_scope_seed`はランナーのクロスファイル事前パステーブル群（`Runner#project_scope_seed_tables` ── 逐次パスで`seed_project_scope`が適用するのと同じテーブル群）です。これを渡さずに構築したセッションは、プロジェクト内の他ファイルで定義されたメソッドへの呼び出しを解決できず、偽の`call.undefined-method`診断を出して等価性契約に違反します。

## 所有権の境界

セッションは、実行が蓄積する可変な機構を**所有し、決して共有しません**。

- ワーカーごとの`Store`に束縛された`Rigor::Plugin::Services`。
- ブループリントから具体化された`Rigor::Plugin::Registry`。すべてのプラグインインスタンスと、その可変な実行ごとのアキュムレータ（探索インデックス、到達可能性集合）を含む。
- `RbsExtended::Reporter`と、依存元の`BoundaryCrossReporter`（どちらもMutexを持ち、意図的にワーカーごと。ランナーはプール後に`#drain_reporters`でそれらのエントリーをマージする）。
- ワーカーごとのレポーターを通した`Rigor::Environment`。これにより推論／ディスパッチからのレポーター書き込みがワーカー自身の状態に蓄積されます。

プラグインの`#prepare`は**構築時に一度**実行され、各ワーカーが最初の`#analyze`呼び出し前にウォームになるようにします。`prepare`からのraiseはすべて`#prepare_diagnostics`に捕捉され、ワーカーを中断する代わりにランナーがファイルごとのストリームと並べて顕在化させます。

## 等価性契約

同一の`(configuration, cache_store, plugin_blueprints)`が与えられたとき、`paths.flat_map { |p| session.analyze(p) }`からのdiagnosticの多重集合に`#prepare_diagnostics`と排出されたレポーターのエントリーを加えたものは、`Rigor::Analysis::Runner#run`の出力の対応する部分集合と等しくなければなりません（MUST）。ただし深刻度プロファイルの再スタンプは除きます。セッションはこれを意図的に呼び出し側に委ねます。なぜならそれは実行ごとの集約的な関心事だからです（[深刻度解決](../../type-specification/diagnostic-policy/#severity-resolution)を参照）。これは、`rigor check`が報告する内容を変えることなく、ランナーがファイルをワーカー間でシャーディングできるようにする性質です。これはspecによって証明されています。
