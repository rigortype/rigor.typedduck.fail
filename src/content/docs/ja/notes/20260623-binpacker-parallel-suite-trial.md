---
title: "binpacker parallel suite — CI trial results (2026-06-23)"
description: "Imported from rigortype/rigor docs/notes/20260623-binpacker-parallel-suite-trial.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260623-binpacker-parallel-suite-trial.md"
sourcePath: "docs/notes/20260623-binpacker-parallel-suite-trial.md"
sourceSha: "2a917d98c785cbce7070bc1d779f00b95d4cde29d7a72b50724672080375866a"
sourceCommit: "29328304839fc7b2884314c6eca0c3ce0d3eb99f"
translationStatus: "translated"
sidebar:
  order: 20266623
---

## 背景

PR #26で[binpacker](https://rubygems.org/gems/binpacker)をrigorのspecスイートにおける`parallel_tests`の候補後継として導入した。試用期間中はCIで両方のランナーを並行稼働させる。`test`（parallel_tests、`required`）と`test-binpacker`（binpacker、non-required）である。このノートはマージ後に実施した最初の2回のCI全実行を記録する。

参照実行: `27972316861`（マージ前）および`27973217998`（マージ後）。

---

## 結果サマリー

| ランナー | テスト数 | 失敗数 | メイクスパン（makespan）（CI、4ワーカー） |
|---|---|---|---|
| parallel_tests（`make test-parallel`） | 7019 | 0 | 5:17 |
| binpacker（`make test-binpacker`） | 7019 | 0 | 14:10 |

正確性：同一 — 両ランナーとも7019テスト、失敗0。

---

## パフォーマンス差の根本原因

binpackerのワーカーが**逐次的に**実行されており、並列になっていなかった。個々のワーカーの実行時間（CIログより）：

```
W0: 3:50  (1648 examples, 2 pending)
W1: 3:29  (1576 examples)
W2: 3:20  (1728 examples)
W3: 3:22  (2067 examples)
```

真に並列であれば、メイクスパンはmax(3:50, 3:29, 3:20, 3:22) ≈ **3:51**になるはずである。実際は**14:10** — 全ワーカーの実行時間の合計 — つまり完全に直列だった。

### 原因

`Orchestrator#run`が`worker.finish`を逐次ループで呼び出している：

```ruby
workers.each do |worker|
  worker.finish          # ← sends "done", then blocks reading stdout
  all_timings.concat(worker.timings)
  …
end
```

`Worker#finish`は`{"type":"done"}`シグナルを送信してstdinをクローズし、そのワーカーのstdoutからEOFが届くまでブロックする。ワーカーはstdinで「done」を受け取って初めてRSpecを実行し始める。`finish`が1つずつ呼ばれるため、各ワーカーは**前のワーカーが完了してから**「done」を受け取ることになり、4並列が直列チェーンに縮退してしまう。

### binpackerに必要な修正

「全ワーカーへのdoneシグナル送信」と「全結果の収集」を分離する必要がある：

```ruby
# 1. Signal all workers to start
workers.each { |w| w.signal_done }   # send {"type":"done"} + close stdin

# 2. Collect results (workers now run in parallel)
workers.each do |worker|
  worker.collect_results
  …
end
```

あるいは同等の方法として、`{"type":"done"}`送信を`finish`から`send_tests`（ファイルリストの最後のメッセージとして送る）へ移動させる。こうするとワーカーはオーケストレーターのループを待たずに、ファイルリストを受け取り次第RSpecを開始できる。

---

## 副次的に判明した問題

### UTF-8エンコーディング（0.0.3で修正済み）

Nix Flake（US-ASCIIのデフォルトロケール）上で実行したところ、binpacker ≤ 0.0.2に2件のエンコーディングバグが発見された：

- `Worker#start`がパイプを`encoding: "UTF-8"`なしで開いていたため、RSpec出力に非ASCII文字（例：テスト説明中の`→`）が含まれると`Encoding::InvalidByteSequenceError`が発生していた。
- `Timing#load_raw` / `#append_all`がタイミングファイルをデフォルトの外部エンコーディングで読み書きしていた。
- `binpacker-worker`：`File.read(outfile.path)`がRSpecのJSON出力をデフォルトエンコーディングで読み込んでいた。

3件ともbinpacker 0.0.3で修正された。rigorのgemspecの下限を`>= 0.0.3`に引き上げた。

### `--out $stderr.fileno.to_s`の副作用（0.0.3で修正済み）

`binpacker-worker`がRSpecのprogress formatterに`--out`引数として`$stderr.fileno.to_s`（= `"2"`）を渡していた。macOSではfd 2への書き込みではなく、作業ディレクトリに`"2"`という名前のファイルが作成されてしまう。0.0.3で`"/dev/stderr"`を使用するよう修正された。

### Gemfile.lockのプラットフォーム（一度限りの修正）

`bundle lock --add-platform x86_64-linux`の実行が必要だった。arm64-darwinホストで生成されたロックファイルを、Linux CIランナーのバンドラーのデプロイメントモードが拒否してしまうためである。

### RigorのanalysisキャッシュリストアキーをGemfile.lockにスコープ設定

binpackerをロックファイルに追加したことで`gem-without-rbs`の診断数が変化した（31 → 32 gems）。ウォームのself-checkが、ロックファイル変更前の古いキャッシュを（ベアな`rigor-cache-${{ runner.os }}-`リストアキープレフィックス経由で）復元してしまい、ウォーム/コールドの診断差分ゲートが失敗した。

修正：リストアキーにGemfile.lockのハッシュを必須セグメントとして含めるよう変更した（`rigor-cache-${{ runner.os }}-${{ hashFiles('Gemfile.lock') }}-`）。これによりロックファイルが変更されると、ウォームとコールドの両方がコールド実行を強制され、同一の出力が得られる。

---

## binpacker 0.1.0 — 並列ワーカー修正の確認（PR #27）

参照実行：`27976146417`（PR #27、binpackerを0.1.0にバンプ）。

| ランナー | テスト数 | 失敗数 | メイクスパン（CI、4ワーカー） |
|---|---|---|---|
| parallel_tests（`make test-parallel`） | 7019 | 0 | 6:08 (368 s) |
| binpacker 0.1.0（`make test-binpacker`） | 7019 | 0 | **4:47** |

### ワーカーのタイミング（binpacker 0.1.0）

```
W0: 4:15  (1507 examples)
W1: 4:19  (1855 examples)
W2: 4:21  (1427 examples)
W3: 4:44  (2230 examples, 2 pending)
```

メイクスパン = max（ワーカー実行時間）＋小さなオーケストレーションオーバーヘッド = **4:47**（開始18:49:21 → 終了18:54:08 UTC）。ワーカーが真の並列で動作している。

### 根本原因の解消を確認

修正（`Orchestrator#run`が`workers.each(&:signal_done)`と`workers.each { |w| w.collect_results }`を分離）により、全ワーカーがRSpecを同時に開始できるようになった。4ワーカー並列のメイクスパン**4:47**はparallel_tests（6:08）と比べて**約22%高速**で、期待されるmax-worker-time境界内に収まっている。

---

## 結論

試用は合格。PR #27以降：

- `make verify`は`test-binpacker`を使用する（旧：`test-parallel`）。
- CIの`test`ジョブはbinpackerのタイミングキャッシュとともに`make test-binpacker`を実行する。`test-binpacker`試用ジョブは廃止される。
- `make test-parallel`および`parallel_tests` gemは手動比較またはロールバック用として引き続き利用可能。
