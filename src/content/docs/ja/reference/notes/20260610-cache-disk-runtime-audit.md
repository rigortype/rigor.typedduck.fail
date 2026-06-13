---
title: "キャッシュ機構監査 — ディスク使用量と warm-run ロードコスト"
description: "Imported from rigortype/rigor docs/notes/20260610-cache-disk-runtime-audit.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260610-cache-disk-runtime-audit.md"
sourcePath: "docs/notes/20260610-cache-disk-runtime-audit.md"
sourceSha: "f6bc81d81660e46f7f0334fa103cd94ff93f5a7ee0b1590414901bf2c693e6a7"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
sourceDate: "2026-06-10T22:50:23+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266610
---

*2026-06-10. Status: measurement note feeding an ADR — informational, not normative. The
spec binds. Observations taken against Rigor v0.1.17 (working tree @ `69aed050`),
macOS / APFS / Apple Silicon。実プロジェクトキャッシュは`rigor-survey/`コーパス
（約30プロジェクト + sweepディレクトリ）とMastodonを分析。GitLabのキャッシュは
手元にcheckoutがなく対象外。Redmineの`.rigor`は248KBしかなくRBSブロブを
欠いていた（`--no-cache`運用かenv build失敗の形跡 — 本監査の結論に影響なし）。*

## Question

ADR-6のファイルシステムキャッシュ（`.rigor/cache`）は、ディスク使用量と
実行時（warm-run）パフォーマンスの観点で改善余地があるか。実際に生成された
キャッシュファイルを測って答える。

## 現状の構成（前提）

- ルートはプロジェクトローカル`.rigor/cache`（`Analysis::Runner::DEFAULT_CACHE_ROOT`）。
- エントリはproducer別シャーディング + `RIGOR\x00\x01`ヘッダ + varint長 +
  Marshal値 + SHA-256トレーラ（`Cache::Store`）。
- RBS由来producerは7つ(`rbs.environment` / `rbs.instance_definitions` /
  `rbs.singleton_definitions` / `rbs.known_class_names` / `rbs.constant_type_table` /
  `rbs.class_ancestor_table` / `rbs.class_type_param_names`)。いずれも
  単一ブロブ（ADR-7 slice 6-D: per-classディスクエントリは遅かったため）。
- `max_bytes`のデフォルトはnil = `Store#evict!`は**no-op**。

## 実測1 — ディスク使用量: ほぼ全プロジェクトが一律 ~32MB、内容は重複

surveyコーパスの`.rigor`はプロジェクト規模によらずほぼ一律**~32MB**
（oj / ox / rbnaclのような小型gemでも）。Mastodonは37MB。内訳は
3つのRBSブロブが支配的:

| producer | Mastodon実測 | gzip後（比率） |
| --- | --: | --: |
| `rbs.instance_definitions` | 14.5MB | 2.1MB (14.4%) |
| `rbs.environment` | 10.6MB | 1.7MB (16.1%) |
| `rbs.singleton_definitions` | 9.0MB | 1.2MB (13.3%) |
| （残り7 producer + plugin.*合計） | ~3MB | — |

さらに、独自`signature_paths:`を持たないプロジェクト（oj / slim / parser …）は
**キャッシュキーも内容もbyte同一**(`rbs.environment`のentryが同一キー
`a9a23d…`、内容md5一致)。つまりこのマシン上の30+ プロジェクト×32MB ≈
**1GB超が同一データの重複**である。

## 実測2 — warm-runロードコスト: Marshal.loadが支配、検証は誤差

`Store#read_entry`の3ブロブぶんの内訳（Mastodonキャッシュ、Flake内実測）:

| producer | read | SHA-256検証 | Marshal.load | 計（`read_entry`） | allocs |
| --- | --: | --: | --: | --: | --: |
| `rbs.environment` | 1ms | 3ms | 154ms | 163ms | 0.56M |
| `rbs.instance_definitions` | 2ms | 5ms | 366ms | 406ms | 1.06M |
| `rbs.singleton_definitions` | 1ms | 3ms | 180ms | 190ms | 0.58M |
| **計** | **4ms** | **11ms** | **700ms** | **759ms** | **2.2M** |

- ディスクreadとSHA-256エンベロープ検証は合計 ~15msで誤差。**対処不要**。
- zlib inflateは3ブロブ計 ~49ms — Marshal.loadの7% に過ぎず、
  **値ペイロードの圧縮は実行時ほぼ中立でディスク −85% が取れる**。

## 実測3 — definitionsブロブ2つはenvキャッシュ前提下でネット負け

ADR-7 slice 6-Dの単一ブロブ化は「per-class *ディスク*エントリvs単一ブロブ」の
比較であり、「ブロブvsキャッシュ済みenvからの再構築」は測っていなかった。
測ると:

| 経路 | 時間 | allocs |
| --- | --: | --: |
| `rbs.instance_definitions`ブロブMarshal.load（全クラス） | 366ms | 1.06M |
| キャッシュ済みenvから`build_instance` **全492クラス** | **137ms** | **0.5M** |
| `rbs.singleton_definitions`ブロブMarshal.load | 180ms | 0.58M |
| envから`build_singleton`全491クラス | 178ms | 0.6M |
| （参考）主要12クラスだけオンデマンド構築 | 0.0ms | — |

instance側は**再構築の圧勝**（2.7倍速・allocs半分）、singleton側は同等。
しかも実ランが消費するdefinitionは既知クラスの一部なので、遅延構築なら
実コストはさらに小さい(loaderにはper-process memo
`@instance_definition_cache` / `@singleton_definition_cache`が既にある)。
つまりこの2ブロブは**ディスク23.4MB/プロジェクトを払ってwarm-runを
最大 ~550ms遅くしている**。cold-run側も「全クラスeager構築 + 23MB書き込み」
が消えるぶん速くなる。

## 実測4 — 周辺コスト（いずれも現状は軽微）

- **`RbsDescriptor.build`**（producerごとに呼ばれ計7回/run）: 18ファイルの
  vendored sig + プロジェクトsigのSHA-256 sweep。実測1.3ms × 7。現状は
  誤差だが、大きな`signature_paths:`（`gem_rbs_collection`等）では線形に
  効くのでloaderへのper-run memoは安い保険。
- **ADR-45 `fresh?`検証**(`analysis.run-diagnostics`): Mastodonは
  2,312ファイル / 15.5MBを全件re-digest。digest sweep実測は
  248ファイル/0.5MBでcold 24ms / warm 5ms — 全体でもwarm ~50–150ms規模。
  mtime fast-pathは節約が小さいわりに健全性を落とす（ADR-45の教訓に逆行）
  ので**非推奨**。

## 実測5 — evictionとエントリ蓄積

現状survey各ディレクトリは1 entry/producerだが、これは
`Descriptor::SCHEMA_VERSION` bumpがルートを全消去してきたため。
schemaが安定すると、**rbs gemのバージョンbumpや`signature_paths:`変更は
古いキーの ~33MBブロブを孤児として残す**(content-keyedなので新キーで書き、
旧キーは誰も消さない)。`max_bytes`デフォルトnilで`evict!`は動かない。

## 所見（改善ポイント、優先順）

1. **definitionsブロブ2つの廃止**（実測3）— `cached_instance_definition` /
   `cached_singleton_definition`をキャッシュ済みenvからのオンデマンド構築 +
   既存per-process memoに切り替える。ディスク −23.4MB/プロジェクト（−70%）、
   warm-run最大 −550ms / −1.6M allocs、cold-runも短縮。診断byte-identical +
   `make bench-perf`でゲート。
2. **値ペイロードのzlib圧縮**（実測2）— フォーマットバージョンbump
   （`Store::HEADER`のformat byte）でdeflate書き込み。残るenvブロブ
   10.6MB → 1.7MB。inflateコストはMarshal.loadの1割未満。
   1と合わせて**33.7MB → ~1.7MB(−95%)**。
3. **evictionの既定動作**（実測5）— 妥当なデフォルト上限（例256–512MB）
   か起動時age-based sweep。schema安定後の孤児ブロブ蓄積を防ぐ。
4. （小）`RbsDescriptor.build`のper-run memo（実測4）。

### 対処不要と判断した点

- SHA-256エンベロープ検証・ディスクread（計 ~15ms、誤差）。
- クロスプロジェクト共有ルート（XDG `~/.cache/rigor`に`rbs.*`だけ置く案）:
  content-keyedなので安全に共有でき、ADR-6がdeferしたのはcross-*machine*
  のみ — だが1+2後は重複が ~1.7MB×Nに縮み、複雑さに見合わない。
- ADR-45 `fresh?`のmtime fast-path（実測4、健全性とのトレードに見合わない）。

## Follow-up

所見1–3は[ADR-54](../../adr/54-cache-slimming/)に設計判断としてまとめ、
**同日WD1–WD4として実装着地**(commits `5f53db09` / `0c671e04` /
`d2465fe1` / `5ced88f1`)。着地時の実測:

- 圧縮後の`rbs.environment`エントリ = **1.76MB**（raw 11.0MBの16%）。
  アクティブセット全体で**~2.2MB/プロジェクト**（実測5の予想どおり）。
- WD3の孤児ストーリーはこのリポジトリ自身で生体確認: `.rigor/cache`に
  **~180MB / 47エントリ**が堆積（アクティブは ~2MB / 14エントリ）。
  4MB上限の試行ランがstale分だけを刈り、次ランはwarmのまま。
- スライスゲート: cache / environment / configurationスペック、
  self-check診断の`--no-cache` / cold / warm一致、Mastodonコーパスの
  no-cache / cold / warm一致(`--format json`のdiagnostics配列2,061件が
  3ラン完全一致; `stats.wall_seconds`等のメタデータは比較から除外)。
- Mastodonの`.rigor`ディレクトリ実測: **37MB → 2.6MB**。warmラン
  （ADR-45ヒット経路）は新フォーマット下でreal ~15s / user ~2.6s
  （並行スペック実行下の参考値; coldはreal ~171s）。
- 検証手法の教訓: 旧バージョン比較を`git worktree` + `bundle exec ruby
  <worktree>/exe/rigor`で行うと**両ツリーのRigorが混載ロード**される
  （`already initialized constant Rigor::VERSION`）。健全なゲートは同一コードでの
  `--no-cache` vs cold vs warm比較（分析ロジックはキャッシュ非依存）。
- 追補（同日`8c65c0c5`）: フォーマットbumpだけでは旧v1エントリは
  「読めないが消えない」（32MBは256MBキャップ未満でeviction対象外）
  ことが判明 → `schema_version.txt`マーカーを
  `"<SCHEMA_VERSION>.<FORMAT_VERSION>"`に拡張し、既存のroot-clear経路で
  初回書き込みラン時に回収する(本リポジトリで生体確認: marker 3 → 3.2、
  ルート再構築、診断不変)。Storeを経由しないADR-46 incremental snapshot
  も同様にdeflate（SCHEMA 4→5）。サーベイコーパスに残る旧キャッシュは
  各プロジェクトの次回ランで自動回収される。
