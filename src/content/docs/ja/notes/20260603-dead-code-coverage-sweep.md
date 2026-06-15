---
title: "Dead code / coverage sweep — 2026-06-03"
description: "Imported from rigortype/rigor docs/notes/20260603-dead-code-coverage-sweep.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260603-dead-code-coverage-sweep.md"
sourcePath: "docs/notes/20260603-dead-code-coverage-sweep.md"
sourceSha: "b63c6881568d3c31b756e1c3c13ef1d05af6f56ad19119f21c810f3b39d8e688"
sourceCommit: "37d70ab9071b4a25e954d0157818f0b6ae88e2c2"
translationStatus: "translated"
sidebar:
  order: 20266603
---

## Motivation

次バージョンの内部最適化テーマ。最初のステップとして、ラインカバレッジの走査
（sweep）を実行しカバレッジ80%未満の全ファイルを精査することで、コードベースに
実行されないデッドコードがないことを検証する。

## Method

Rubyの組み込み`Coverage`モジュールを使い、`spec/spec_helper.rb`に`COVERAGE=1`の
インストルメンテーションを追加した（追加のgemは不要。ネイティブ拡張はすでにFlakeに
含まれている）。Nixシェル内で`COVERAGE=1 bundle exec rspec`を実行すると、カバレッジ比
の昇順でソートされた`coverage_report.txt`が生成される。

全スイート: 走査時点で**5 376 examples, 0 failures**。

## Files below 80% and their verdicts

| File | Coverage | Verdict |
|---|---|---|
| `rigor/mcp/loop.rb` | 38.1% | **テストの欠落** —— specが存在しなかった |
| `rigor/plugin/box.rb` | 52.9% | **環境ゲート付き**（`RUBY_BOX=1`、ADR-39） |
| `rigor/testing.rb` | 66.7% | **テストの欠落** —— `Rigor.dump_type` / `assert_type`の便宜エイリアスが未カバー |
| `rigor/cli.rb` | 72.5% | サブコマンドのパスは統合テスト経由で実行済み。残りの欠落はI/Oエラー分岐 |
| `rigor/inference/precision_scanner.rb` | 74.2% | **テストの欠落** —— `FileResult`ヘルパーとUnion/Intersection/Difference分類の分岐 |
| `rigor/plugin/isolation.rb` | 75.0% | **環境ゲート付き**（`ruby_box`戦略には`RUBY_BOX=1`が必要）。`fork`ベースのパスは既存のspecでカバー済み |
| `rigor/plugin/io_boundary.rb` | 77.2% | **意図的な境界** —— `DefaultHttpClient`は本物の`Net::HTTP`を使う。テストはフェイクのクライアントを注入する |
| `rigor/mcp/server.rb` | 77.6% | **テストの欠落** —— `rigor_triage`と`rigor_coverage`のツール呼び出しが未テスト |
| `rigor/language_server/server.rb` | 79.3% | LSPのパスはランナー経由で実行済み。残り＝エラーパスの分岐 |

## Dead code found

**なし**。

低カバレッジのファイルはいずれも、特定可能なデッドではない理由を持っていた——
環境ゲート付きのフィーチャーフラグ、意図的なI/O境界、あるいは単にまだ書かれて
いなかったテスト。

## Tests added (commit 9fae4cba)

| New / updated spec | What it covers |
|---|---|
| `spec/rigor/mcp/loop_spec.rb` *(new)* | 通常のディスパッチ、JSONパースエラーからの回復、空行スキップ、通知（nil → 書き込みなし）、複数リクエストのシーケンス |
| `spec/rigor/testing_spec.rb` *(new)* | `Rigor::Testing.dump_type` / `assert_type`、および`Rigor.dump_type` / `Rigor.assert_type`の委譲エイリアス |
| `spec/rigor/inference/precision_scanner_spec.rb` *(extended)* | `FileResult`の比率ヘルパー（合計ゼロを含むエッジケース）、`dynamic_count`、Union/Intersection分類 |
| `spec/rigor/mcp/server_spec.rb` *(extended)* | `rigor_triage`のラウンドトリップ、`rigor_coverage`のラウンドトリップ、`--top=`と`--params=`のargv受け渡し |

実施後のスイート: **5 402 examples, 0 failures**。
