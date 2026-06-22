---
title: "Parallel spec suite: runtime-based distribution (2026-06-22)"
description: "Imported from rigortype/rigor docs/notes/20260622-parallel-suite-runtime-distribution.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260622-parallel-suite-runtime-distribution.md"
sourcePath: "docs/notes/20260622-parallel-suite-runtime-distribution.md"
sourceSha: "f9ac1ec95c2346cd0a8b262613cafbc0be55df9fdaca2119830bc8a8ba00ccdb"
sourceCommit: "29328304839fc7b2884314c6eca0c3ce0d3eb99f"
translationStatus: "translated"
sidebar:
  order: 20266622
---

## 背景

PR#24（`spec-suite-performance`ブランチ）は、不変な`Environment`をサンプル間で共有することで3つの低速なスペックグループを高速化した。

- `reflection_spec.rb` — `before(:all)`をファイルごとに1回実行（サンプルごとではなく）: 約22秒→約2秒
- `rails_routes_plugin_spec.rb` — プラグインキャッシュを共有（`default_run_plugin_cache_store: :shared`）: 約25秒→約4秒
- `incremental_session_spec.rb` — `IncrementalSession.new(environment:)`をオプション化: 約16秒→約6秒

`make test`の逐次実行での短縮: **約50秒**。

## CIリグレッションの発見

PR#22とPR#24のGitHub Actions「Tests（Ruby 4.0）」における実時間（wall-clock）を比較:

| PR  | Run 1 | Run 2 |
|-----|-------|-------|
| #22 | 473s  | 458s  |
| #24 | 493s  | 476s  |

PR#24は逐次スイートで約50秒速いにもかかわらず、並列スイートでは一貫して**約20秒遅い**。

## 根本原因: `--group-by filesize`が不適切なプロキシになっていた

`parallel_rspec --group-by filesize`はスペックファイルの合計バイト数でワーカーグループに振り分ける。ファイルサイズと実行時間が相関している場合はこれで十分だが、PR#24で「サイズは大きいが高速」なファイルが生まれた。`rails_routes_plugin_spec.rb`はスイート内で5番目に大きい1499行のファイルだが、実行時間が約25秒から約4秒に短縮されたのだ。

グループごとの内訳がその経緯を物語っている:

| グループ | PR#22の時間 | PR#22のサンプル数 | PR#24の時間 | PR#24のサンプル数 |
|----------|------------|------------------|------------|------------------|
| 1        | 6:02       | 1839             | **3:55**   | 1724             |
| 2        | 6:27       | 1744             | **4:50**   | 1759             |
| 3        | 6:45       | 1747             | **5:24**   | 1620             |
| 4        | 7:16       | 1689             | **7:38**   | **1916**         |

グループ1〜3は劇的に速くなっている（共有セットアップによる恩恵は本物だ）。しかし並列実行の実時間は**最も遅いグループ**で決まる。グループ4は7:16→7:38（+22秒）になった。これは、「大きいファイル」がもはやボトルネックでなくなったことで、ファイルサイズによるバランサーがグループ4に227個多くのサンプルを押し込んだためだ。

サンプルの総数は7019で変わっていない——テスト内容は同じで、分散方法だけが異なる。

## 修正: キャッシュされたランタイムログを用いた`--group-by default`への切り替え

`parallel_tests 5.7.0`は3つのモードを定義している:

- `filesize` — ファイルのバイト数による振り分け（旧来の挙動）
- `runtime` — 前回の実行で計測したファイルごとの実行時間による振り分け
- `default` — ログが存在すれば`runtime`、なければ`filesize`

`--group-by default --runtime-log tmp/parallel_runtime.log`に切り替え、`ParallelTests::RSpec::RuntimeLogger`でタイミングを記録することで:

1. **初回CIラン（ログなし）**: `filesize`にフォールバック——従来どおりで若干アンバランス。
2. **以降のすべてのラン**: 計測済みタイミングを使用→`rails_routes_plugin_spec.rb`を約25秒ではなく約4秒として正しく再重み付け。
3. **自己補正**: 将来スペックの速度が変化しても、次回のラン以降に自動的に再バランスされ、手動での介入は不要。

CIは`tmp/parallel_runtime.log`をラン間でキャッシュする（`run_id`ごとにユニークなキー、最新エントリーを常に見つけられるようプレフィックスマッチで復元キーを設定）。

### 変更ファイル

- `Rakefile` — `--group-by filesize`→`--group-by default` + `--runtime-log` + ワーカーがタイミングデータを書き出すための`-o`フォーマッタフラグ
- `.github/workflows/ci.yml` — `make test-parallel`の前にキャッシュのrestore/saveステップを追加

### コミット

- PR#24: `9c743701` — スペックスイートのセットアップ共有（高速化本体）
- 今回のフォローアップ: ランタイム分散の修正
