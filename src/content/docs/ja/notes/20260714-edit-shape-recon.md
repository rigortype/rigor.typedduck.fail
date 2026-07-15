---
title: "GitLabにおける`--incremental`編集シェイプの比較プロファイリング"
description: "rigortype/rigor docs/notes/20260714-edit-shape-recon.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260714-edit-shape-recon.md"
sourcePath: "docs/notes/20260714-edit-shape-recon.md"
sourceSha: "f0fe937030e23d95f7b12ad042b5f8ffce3a3aa2c7e5121fbaa7ffbef304a43e"
sourceCommit: "eb8e9996d113a1b5e1778d0988597c979814a219"
translationStatus: "translated"
sidebar:
  order: 20266714
---

> PR `perf/incremental-wiring-gaps`（3つのインクリメンタル配線ギャップの解消──
> stat層による変更検出、フォークプールの配線、シングルトンのシンボル粒度）と、
> その後続作業`perf/recheck-floor-and-bundle-gate`（固定的なclosure_analysisの
> 下限＋B1バンドル等価性の伝播ゲート）のための地固めリコン（recon）。以下の測定値
> ＋file:lineアンカーが、両方の仕様ベースラインである。


ワークツリー`a75adb05`（origin/master、PR #85 / ADR-87のnullビルド下限を含む）。
調査対象リポジトリは`rigor-survey/gitlab` @ `1a15763b5119`、スコープは
`app/models app/controllers`（1,774ファイル＝1,225モデル＋549コントローラー）。
設定は`.rigor.dist.yml`から自動検出（Railsプラグイン: actionpack, activerecord,
actionmailer, rails-routes, rails-i18n, activesupport-core-ext, devise, sidekiq,
dry-types, sorbet）。Ruby 4.0.5。

コマンド形（1実行あたり）: gitlabのcwdから、
`nix develop <main> -c env BUNDLE_GEMFILE=<wt>/Gemfile BUNDLE_PATH=<main>/vendor/bundle
RIGOR_INCR_TRACE=1 bundle exec <wt>/exe/rigor check --incremental app/models app/controllers`。
Wall/RSSは`/usr/bin/time -l`で計測。フェーズ分割・クロージャ・エッジ種別・
diags-changed・memoカウンタは`IncrementalSession`＋`Runner`に仕込んだ使い捨ての
env制御インストルメンテーション（`RIGOR_INCR_TRACE`, `RIGOR_BUDGET_TRACE`,
`RIGOR_STACKPROF_OUT`）による。YJIT: 未設定（実際のUX）──5.0秒のデッドラインで発火
する（`jit.rb`）ので、≥1ファイルの再チェック（すべて>5s）はすべて実行途中でJITされる。
null実行（<5s）は決してJITしない。実行ごとのYJIT状態は以下に記録する。

## 0. ベースラインのプライム＋null下限

| 実行 | ウォーム | yjit | wall | closure_analysis / baseline | RSS | allocs | snapshot_write |
|-----|------|------|------|------|-----|--------|------|
| コールドベースライン（フル） | false | true | **22.75s** | baseline_full 20.91s（RBS env＋seed_fold 0.66sを含む） | 877 MB | 58.5M | 0.34s |
| null再チェック（0変更） | true | **false** | **2.63s** | closure_analysis 0.99s | 378 MB | 2.7M | **0.00s（SKIPPED）** |

null再チェックのフェーズ分割（wall 2.63s）: closure_analysis 0.993 · snapshot_load 0.235 ·
seed_fold 0.074（⊂ closure_analysis）· restore 0.070 · change_detect_digest 0.037 ·
change_detect_list 0.010 · closure_compute 0.000 · snapshot_write 0.000。インストルメント
されたフェーズの合計 ≈ 1.34s。残差 ≈ 1.3sはプロセスブート（nix/ruby/bundler＋require
rigor＋設定パース＋フィンガープリント＋probe glob）で、すべての実行で一定である。

**ADR-87 WD3を確認**: ゼロ変更の再チェックは`skip_save=true`と`snapshot_write=0.00s`を
報告する──無条件のスナップショット書き直しがスキップされている。null下限は本当に安価
（2.63s、2.7M allocs、YJITなし）である。

## 1. シェイプ比較（データ点）

すべてのコメント／文字列編集: `diags_changed = 0`（振る舞いは不変）。closAは
closure_analysisフェーズ（秒）で、支配的なフェーズ。Wallは`/usr/bin/time`による。
すべてウォーム。すべてYJIT発火済み。

| shape | file | edit | closure | analyze_set | branch | changed_pairs | edge-kinds | diags_chg | closA | wall | allocs |
|-------|------|------|---------|-------------|--------|------|-----------|-----------|-------|------|--------|
| **S1** leaf ctrl | health_controller.rb | comment | **1** | 1 | file_level | 0 | changed=1 | 0/1 | 7.23 | 9.35 | 22.3M |
| **S2** integration | integration.rb | comment | **16** | 16 | symbol_gran | 0 | ancestry=15 +chg1 | 0/16 | 8.83 | 12.18 | 23.6M |
| S2 label | label.rb | comment | 19 | 19 | symbol_gran | 0 | ancestry=18 +chg1 | 0/19 | 9.20 | 11.13 | 27.2M |
| S2 label | label.rb | body（`def self.reference_prefix` `'~'`→`'~x'`） | 19 | 19 | symbol_gran | **0** | ancestry=18 +chg1 | 0/19 | 10.01 | 12.17 | 27.2M |
| **S4** concern | cache_markdown_field.rb（25 includers） | comment | **66** | 66 | symbol_gran | 0 | ancestry=65 +chg1 | 0/66 | 10.43 | 12.68 | 29.7M |
| **S3** max fan-out | application_record.rb | comment | **341** | 341 | symbol_gran | 0 | ancestry=340 +chg1 | 0/341 | 12.83 | 15.07 | 36.4M |
| **S5b** projteam | project_team.rb（anc=0） | comment | 9 | 9 | file_level | 0 | file_level=8 +chg1 | 0/9 | 8.19 | 10.34 | 23.3M |
| S5b projteam | project_team.rb | **未呼び出し**メソッド`truncate`内のbodyインラインコメント | **1** | 1 | symbol_gran | **1** | changed=1（8回避） | 0/1 | 7.90 | 9.84 | 23.0M |
| S5b projteam | project_team.rb | **呼び出し済み**メソッド`write_member_access_for_user_id`（8呼び出し元）内のbodyインラインコメント | **9** | 9 | symbol_gran | **1** | **symbol=8** +chg1 | 0/9 | 8.93 | 11.04 | 23.3M |
| **S5a** classmethod | application_record.rb | body `def self.safe_find_or_create_by`（13呼び出し元） | **341** | 341 | symbol_gran | **0** | ancestry=340 +chg1 | 0/341 | 12.15 | 14.04 | 36.4M |

置き換え（タスク指示に従い、rg＋スナップショットグラフで検証済み）:
- **S2 body** ── `integration.rb`は7行の薄いシェル（`class Integration < ApplicationRecord;
  include Integrations::Base::Integration; end`）で、編集できるメソッド本体がない。コメント／
  ancestryファンアウトの見出しにはこれを残したが、body版には`Label`（メソッド本体を持つ
  中程度のファンアウト）を用いた。Integrationの実際の振る舞いは、解析スコープ外のconcernに
  ある。
- **S5** ── タスクの`safe_find_or_create_by`は**クラス**メソッドである（§6参照）。これを
  **S5a**として実行し、加えて`project_team.rb`上のクリーンなインスタンスメソッドの対照
  （**S5b**、ancestry依存 = 0）を追加した。これはancestryノイズをゼロにしてシンボル粒度を
  分離する。
- **S3** ── `application_record.rb`は記録された340のancestry依存を持つ（真の最大は
  `each_batch.rb`の370で、これはApplicationRecordがincludeするconcern）。S3のwall 15.07sは
  30分の箱 ≪。フルには縮退しない（341/1774 = 19%）。

### スケーリング則
固定的な1ファイル下限 ≈ **7.2～7.9s**のclosure_analysis（S1 7.23、S5b-uncalled 7.90）。
クロージャファイルあたりの限界コスト ≈ **16～49 ms**（S3: (12.83−7.23)/340 = 16 ms；
S4: (10.43−7.23)/65 = 49 ms；YJITウォームアップ＋ファイルサイズにより変動）。0→1ファイルの
跳躍は+6.2s（null closA 0.99 → S1 7.23）: **どれか**1ファイルを解析すると、0ファイルのnull実行が
完全にスキップするRBS-env／定義の実体化＋ハンドル解決パース＋プラグインの
プレパス走査がトリガーされる。**固定下限は数百ファイル未満のあらゆるクロージャを支配する。
クロージャサイズは二次的なレバーである。**

## 2. フェーズ分割（代表的なウォーム再チェック、S4、wall 12.68s）

closure_analysis 10.434 · snapshot_write 0.298 · snapshot_load 0.245 · change_detect_digest
0.107 · seed_fold 0.096（⊂ closure_analysis、ADR-85）· restore 0.062 · change_detect_list 0.011
· closure_compute 0.004 · [boot ~1.3s残差]。

- **change-detect**（list 0.01＋digest 0.11）は、再チェックのたびに**全1,774ファイルを
  再グロブしSHA-256する**（`IncrementalSession#digest`、ADR-87 WD1のCache::Store stat層とは
  独立）。今は安価（ページキャッシュ済み）だがO（全ファイル）。
- **snapshot-load** 0.235s = 3.3 MBのスナップショットのinflate＋Marshal.load。
- **seed-fold**（ADR-85 WD2）0.07～0.12s: 全1,774のseedバンドルをフォールドし、変更ファイル
  のみ再走査する。**ADR-85は機能している**──プレパスはもはやボトルネックではない。
- **snapshot-write**変更のある再チェックで~0.3s。nullでは0.00s（ADR-87 WD3）。
- **closure-analysis**はあらゆるシェイプで再チェックの80～90%を占める。

### closure_analysisの内部（wallモードstackprof、step 4）
S2-body（19ファイル）とS4（66ファイル）のプロファイルは、形状**および**絶対値がほぼ同一
である:

| frame | S2-body（19f）self% | S4（66f）self% |
|-------|------|------|
| **Prism.parse** | 21.3%（~2.26s） | 18.8%（~2.29s） |
| Dir.glob | 8.0% | 9.5% |
| IO.binread + IO.read | 11.2% | 12.1% |
| GC（mark+sweep） | 9.2% | 9.2% |
| DryTypes::AliasScanner（plugin walk） | ~7.2% total | ~5% total |
| Sorbet::CatalogWalker（plugin walk） | ~1% | <1% |

**Prism.parseは19ファイルでも66ファイルでも同じ~2.3sの絶対コストを要する** → パースは
クロージャ比例ではなく*固定*コストである。これはディスカバリーの再パス＋**ADR-85 WD3の遅延
def-handle解決**（クロージャが呼ぶメソッドを*定義する*ファイルを、そのASTを実体化
するために再パースする）＋クロージャファイル自体のパースに由来する。Dir.glob（ファイル
セットの繰り返し展開）、再チェックごとのプラグインプレパス走査（DryTypes/Sorbetが
プロジェクトファイルをスキャン）、IO、GCが固定下限を締めくくる。**ファイルごとの型推論は
最上位コストではなく、被呼び出し側の本体評価の繰り返しは大部分が重複排除されている（§4）。**

## 3. エッジ種別の分析

3つのエッジ種別がクロージャを埋める（`DependencyRecorder`、dependency_recorder.rb:157-190）:
- **ancestry**（`ancestry_sources`、symbol=nil）: 解析がクラスの*宣言／ancestry*を読むとき
  ──サブクラス化、`include`、または裸の定数参照──に必ず記録される。ファイル粒度
  （「スーパークラスのエッジはクラス全体に触れる」）。これは*「誰かがこのクラスを参照した」*
  であり、テキスト上のサブクラス化よりはるかに広い──S2 Labelの18のancestry依存には
  `issue.rb`、`merge_request.rb`、`project.rb`、`user.rb`が含まれる（これらは`Label`を
  *参照する*のであってサブクラス化はしない）。
- **symbol**（`symbol_sources`、`"Class#method"`）: 解決された*インスタンス*メソッド呼び出し
  で、メソッド粒度で記録される──ADR-46スライス4の精度層。
- **file-level**（`sources`、粗いユニオン）: シンボルペアが変更されず**かつ**そのファイルが
  ancestry依存を持たない場合にのみ用いられる（S1、S5b-comment）。
- **negative**（`missing`）: どのシェイプでも一度も発火しなかった（0件の削除／追加ファイル、
  出現シンボルなし）。

**ancestryエッジはあらゆる実クラス編集を支配する**。記録エッジの精度は、基底クラスの
クロージャがそのテキスト上のサブクラス数より小さいことを意味する（Integration: 記録15対
テキスト50──残り35は、Integrationそのものではなくスコープ外の
`Integrations::Base::Integration` concern経由で解決する）。ApplicationRecord: 記録された
ancestry依存340対1,225モデル。

## 4. memo重複排除の回答（ADR-84の実行スコープのreturn memo）

`RIGOR_BUDGET_TRACE`カウンタ（単一プロセス、正確──インクリメンタルは常に
`--workers 0`、§5）。インクリメンタルパスは`dispatch_special_check_mode`
（check_command.rb:59）から`write_trace_appendices`（:73）の*前に*リターンするので、
ネイティブのmemoプロファイルは決して印字されない──インストルメンテーションの
`BudgetTrace.snapshot`で捕捉した。

| shape | memo_entries | memo_hits | memo_misses | body_evals | ヒット率 | refuse_transient |
|-------|------|------|------|------|------|------|
| S2-body（Label、19f） | 4,787 | 4,092 | 695 | 695 | **85.5%** | 0 |
| S4（concern、66f） | 9,697 | 8,259 | 1,314 | 1,438 | **86.3%** | 52 |

**はい──ADR-84の実行スコープmemoは、実行内でクロージャファイル横断的に被呼び出し側の
本体評価を大きく重複排除する。** S4クロージャ内の~9,700件のメソッドreturn推論のうち、実際の
本体評価はわずか1,438件であり、8,259件はmemoヒットだった（編集／継承された被呼び出し側の
本体は、呼び出し元ファイルごとに再評価される代わりに実行スコープのバケットから提供された）。
`refuse_transient`（ADR-84 WD3のイベントtaintゲート）はS4で52回のみ、S2で0回発火した──
taintゲートは意味のある重複排除のコストにはなっていない。これはまさにADR-84 WD2が設計した
ファイル横断の重複排除であり、ファイルごとの推論がclosure_analysisのボトルネックでない理由
である（§2）──**被呼び出し側のASTを*得る*ためのパース（ADR-85のハンドル再パース）が残余
コストであり、それを再*推論*することではない。**

## 5. 並列性の監査 ── 決定的: クロージャ再解析はプールに配線されていない

`run_incremental_check`（`lib/rigor/cli/check_command.rb:189`）は`workers:`なしで
`Analysis::IncrementalSession.new(...)`（**:197**）を構築し、`CheckRunnerFactory.resolve_workers`
を決して呼ばず`options[:workers]`も読まない（標準パスの`build_check_runner` →
`CheckRunnerFactory.build`（:320）はこれを行うが、インクリメンタルはそれをバイパスする）。
`IncrementalSession#build_runner`（`lib/rigor/analysis/incremental_session.rb:406-407`）は
`workers:`なしで`Runner.new(...)`を呼ぶ → Runnerは`workers: 0`をデフォルトにする（Runner
コンストラクタ） → `PoolCoordinator#pool_mode?`はfalseを返す（`pool_coordinator.rb:79-80`、
`@workers.positive?`） → 逐次の`analyze_files_sequentially`。

**実証的確認**: `--workers 4`付きのS4再チェック → closure_analysis **10.449s**、`--workers`
なし**10.434s**（同一、ノイズの範囲内）。`--workers` / `RIGOR_RACTOR_WORKERS` /
`parallel.workers:`は`--incremental`モードで**黙って無視される**。あらゆるインクリメンタル
クロージャ再解析は、いずれにせよシングルスレッドで実行される。

## 6. S5のシンボル粒度の判定

根本メカニズム（コード＋probe）: `symbol_fingerprints_for`（incremental_session.rb）は、
シンボルごとの本体フィンガープリントをインスタンス側の`def_sources`/`def_nodes`テーブル
からのみ計算する。シングルトン／クラスメソッドは、それが**読まない**並列の
`singleton_def_nodes`テーブルに存在する。`Label`のprobe: `reference_prefix` ∈
`singleton_def_nodes`（true）、∉ `def_sources`（false）；インスタンスの`to_reference` ∈
`def_sources`（true）。したがって**クラス／シングルトンメソッドの本体編集は、変更された
シンボルペアを決して生成しない**（`changed_pairs=0`）。

実証的（project_team.rb、ancestry依存 = 0なので、クロージャは*純粋に*シンボル／ファイル
駆動──グラフprobeが顕在化させたクリーンな分離: sym=8、anc=0、8つの依存すべてが1つの
メソッドを呼ぶ）:

| edit | branch | changed_pairs | closure | 解釈 |
|------|--------|------|---------|------|
| comment（どのメソッドの外） | file_level | 0 | **9** | 粗い`dependents`に落ちる──全8つのファイルレベル呼び出し元 |
| body: **未呼び出し**インスタンスメソッド`truncate` | symbol_gran | **1** | **1** | 0呼び出し元にスコープされる → **8回避**（`file_level_would_add=8`） |
| body: **呼び出し済み**インスタンスメソッド（8呼び出し元） | symbol_gran | **1** | **9** | ちょうどその8つのシンボル呼び出し元にスコープされる |
| S5a: **クラス**メソッド`safe_find_or_create_by`（13呼び出し元、ApplicationRecord上） | symbol_gran | **0** | **341** | changed_pairs=0 → フルなancestryファンアウトに縮退、コメント編集と同一 |

**判定:**
- **インスタンスメソッドの本体編集は真のシンボル粒度を得る**──クロージャは*そのメソッドの*
  呼び出し元にスコープされる。未呼び出しのインスタンスメソッドを編集するとそれ自身のみを再解析し
  （1ファイル、8つのファイルレベル依存を回避）、呼び出し済みのものを編集するとちょうどその
  呼び出し元を再解析する。
- **クラス／シングルトンメソッドの本体編集はそうならない**──`changed_pairs=0`により、それらは
  *コメント編集と同一に*振る舞う: クロージャはメソッドの呼び出し元ではなく、ファイルのフルな
  ancestry／ファイルレベルの依存に落ちる。S5a（`safe_find_or_create_by`、13呼び出し元）は
  全**340**のApplicationRecord ancestry依存を再解析し、S3コメントとバイト単位で同一のクロージャ
  だった。
- よってタスクの問い（「クロージャは*メソッドの*呼び出し元にスコープされるのか、それとも
  ファイルの全依存にスコープされるのか？」）への回答は、*クラスメソッド*ユーティリティに
  ついては**ファイルの全依存**である──シンボル層はシングルトンメソッドをカバーしない。これは
  具体的でコードに根ざしたギャップである: **`symbol_fingerprints_for`（および
  `record_cross_file_method`内の`def_sources`ルックアップ）をシングルトンメソッドに拡張し**、
  クラスメソッドユーティリティにもインスタンスメソッドが享受するのと同じ精度を与えること。

## 7. サマリーゲーティングの上限（シェイプごと）

ADR-46の遅延「依存の推論サマリーが不変 → 依存をスキップ」層: ここでのあらゆるコメント／文字列
編集で、編集ファイルの公開*サマリー*（メソッドシグネチャ）は不変なので、その層は依存集合全体を
スキップするだろう。全シェイプで`diags_changed = 0`であることは、あらゆる依存の再解析が無駄で
あったことを裏付ける。回避可能な再解析 = クロージャ − 1（編集ファイルは、そのサマリーが不変で
あると*学習する*ために常に再チェックされねばならない）:

| shape | closure | diags_changed | 回避可能な依存 | closA節約（推定、~限界） |
|-------|---------|---------------|----------------------|------|
| S1 leaf | 1 | 0 | 0 | 0 |
| S5b uncalled（instance） | 1 | 0 | 0 | 0（既に0にシンボルスコープ済み） |
| S5b comment / called | 9 | 0 | 8 | ~0.3～0.7s |
| S2 integration | 16 | 0 | 15 | ~0.7s |
| S2 label | 19 | 0 | 18 | ~0.9s |
| S4 concern | 66 | 0 | 65 | ~3.2s |
| S3 / S5a app_record | 341 | 0 | 340 | ~5.6s |

上限: サマリーゲーティング層は最大**340**件の依存再解析（S3/S5a）、65件（S4）、18件（S2）を
回避するだろう。ただしwallの節約は固定下限ではなく*限界*のファイルごとコスト（16～49 ms）に
束縛される: S3は~12.8s → ~7.2s、S4は~10.4s → ~7.2s、S2は~9.2s → ~7.2sに落ちるだろう。~7sの
固定下限はサマリーゲーティングを完全に生き延びる。

## 8. 異常／注記

1. **0→1ファイルの崖**: null closure_analysis 0.99s対1ファイル7.23s（+6.2s）。*どれか*1
   ファイルを解析すると、0ファイル実行がスキップする再チェックごとの機構一式（env／定義の
   実体化＋ハンドルパース＋プラグイン走査）がトリガーされる。null下限は実際の単一
   編集を代表しない。
2. **YJITの交絡**: ≥1ファイルのあらゆる再チェックは5.0秒のデッドラインを超える → 実行途中で
   JITする。null（<5s）はしない。すべての編集シェイプ行は同条件（すべてYJIT発火済み）である。
   nullのみが異なる。
3. **記録エッジ < テキスト**: クロージャはテキスト上のサブクラス／include数より小さい
   （Integration 15/50、ApplicationRecord 340/1225）──精度特性であり、ゲートは健全。
4. **プラグインプレパス走査が再チェックごとに再発する**: DryTypes `AliasScanner`
   （closure_analysisの~7%）とSorbet `CatalogWalker`は、ADR-85 WD1のキャッシュスレッディングに
   もかかわらず再チェックごとにプロジェクトファイルを走査する──それらのプロデューサーが
   インクリメンタルパスで実際にキャッシュ提供されているか確認する価値がある。
5. **change-detectは再チェックごとに全1,774ファイルをdigestする**（`IncrementalSession#digest`、
   フルSHA-256、ADR-87 WD1のstat層ではない）──今は0.11sだがO（全ファイル）。
6. **シングルトンメソッドのフィンガープリントギャップ**（§6）──最も具体的で正しさに隣接する
   発見: クラスメソッド編集は黙ってシンボル粒度を失う。
7. インストルメンテーションの注意: `RIGOR_BUDGET_TRACE`/stackprof実行はwallが膨張している
   （mutexカウンタ＋サンプリング）。それらのタイミングは§1には使わない──memo／プロファイル
   データのみを使う。

## 9. ランク付けされたレバー（どれをシェイプが正当化するか）

1. **固定的な~7sのclosure_analysis下限を攻める**──それは~数百ファイル未満のあらゆる編集
   （S1～S4、すなわち実編集の圧倒的多数）を支配する。最も価値が高く、エビデンスの裏付けがある:
   - **ADR-85のdef-handle ASTパースをプロセス横断でキャッシュする**（Prism.parse ~2.3s、固定）:
     呼び出し済み／継承メソッドの解決は、再チェックのたびにそれを定義するファイルを再パースする。
     実行ごとのパースmemoは存在する（ADR-85 WD3）がプロセスを生き延びない。プロセス横断の
     AST／ハンドルキャッシュは最大のフレームを削減するだろう。
   - **再チェックごとのプラグインプレパス走査をキャッシュ／スキップする**（DryTypes/Sorbet
     ~8%）: #prepareプロデューサーがインクリメンタルパスでADR-85 WD1ストアから提供しているか
     検証する（異常4）。
   - **Dir.globを重複排除する**（~8～9%）: ファイルセットは再チェックごとに数回展開される
     （probe、current_files、runner展開）。
2. **クロージャ再解析をフォークプールに配線する**（§5）──現在は`--workers`にかかわらず逐次。
   限界のファイルごとコストのみを助けるので、大きなクロージャで報われる（S3: 341ファイル、
   ~5.6sの限界が並列化可能）が、一般的な小クロージャ編集（下限束縛）では中立。基底クラス／
   concern編集に特化した、安価で正しい勝ち。
3. **シンボル粒度をシングルトン／クラスメソッドに拡張する**（§6）──クラスメソッド
   ユーティリティ編集がフルなancestryファンアウトに縮退する精度ギャップを閉じる（S5a:
   13呼び出し元のメソッドに341ファイル）。正しさに隣接し自己完結（フィンガープリント＋
   `def_sources`ルックアップ）。
4. **サマリーゲーティング層**（§7）──実在するが二次的: 基底クラス／concern編集で最大340件の
   依存再解析を回避するが、wallの節約は限界のファイルごとコストのみ（触れられない下限に束縛
   される）。主にレバー1に積み重ねて、主にS3/S4のテールに対して価値がある。

レバー1が見出しだ: このコーパスでは単一の実編集が~9～15sのwallを要し、そのうち~7sは固定的で
クロージャ非依存の下限であり、出荷済みのシンボル粒度（ADR-46）も将来のサマリーゲーティング層も
これに対処しない。

## 再チェック下限＋バンドルゲート（後続、`perf/recheck-floor-and-bundle-gate`）

後続PRからの発見＋修正。同じGitLabコーパス（`app/models app/controllers`、フレッシュスキーマ
スナップショット上で再プライムしたコールドベースライン19.0s）。すべての数値はホスト計測、
`/usr/bin/time` wall＋env制御のフェーズトレース、各1実行。

### ~7 sの`closure_analysis`下限は本質的である

**S1**（`health_controller.rb`上のインプレースコメント、クロージャ = 1）を再計測:
change_detect 0.035 s · closure_compute 0.001 s · **closure_analysis 6.27 s** · wall 8.03 s。
下限はリコンの7.23 sからほとんど動いていない（以下のエンジン修正はすべて`closure_analysis`の
*外*にあり、残差の差はマシン状態／YJITウォームアップのノイズ）。それはクロージャ非依存である
──あらゆるコメント編集の再チェック（S1～S4、次節）は、元のクロージャサイズにかかわらず
`closure_analysis` 6.3～6.6 sに着地する。分解（リコン§2のstackprof＋ソース監査）:

- **プラグインのツリー全体の再スキャン（1a）── 本質的**。 DryTypes `AliasScanner`とSorbet
  `CatalogWalker`は、再チェックのたびにすべてのプロジェクトファイルを再パースする。DryTypesは
  キャッシュゲート済み（ADR-85 WD1）だが、その`producer watch:` globは`paths:`ツリー全体を
  カバーするので、**どんな**編集も集約されたstatシグネチャを動かす → キャッシュMISS →
  フル再スキャン（プロデューサーキャッシュは0変更のnull再チェックのみを提供する。ADR-87 WD2は
  ファイルごとのwatchテーブルを既に試み、Marshalコストを理由に差し戻した）。SorbetにはNO
  プロデューサー──そのカタログはインスタンス寿命のmemoで、再チェックごとにフレッシュな
  Runnerが破棄する。両者は粒度の点でのみ「バグ形」であり、真の修正はプラグインごとの
  インクリメンタルスキャン（ADR-85のseedバンドルパターンをプラグインスキャンに適用）で、より
  大きな後続作業である。これらが駆動するプロジェクト全体の`Prism.parse`がリコンの固定的な
  ~2.3 sである。
- **要求されたASTのパース（1b）── 本質的、1つの重複排除を修正済み**。 DefHandle解決（ADR-85
  WD3）は正しく要求駆動である（再チェックあたり0～6ファイル、実行ごとにmemo化。
  `symbol_fingerprints`はパースせずにハンドルフィンガープリントを読む）。1つの冗長性──
  `affected_closure`が変更セットを2回パースした（`symbol_fingerprints_for`と
  `class_declarations_for`がそれぞれ`discovered_def_index_for_paths`を呼んだ）──は修正済み: 
  1回の`ScopeIndexer.scan_summary_for_paths`パースが、フィンガープリント、クラス宣言、**および**
  B1コードフィンガープリントを生むようになった。それは`closure_analysis`ではなく
  `closure_compute`（0.001 s）に存在する。
- **Dir.glob（1c）── 3つのうち1つを除去**。解析ツリーは3つのRunnerインスタンスにわたって
  再チェックごとに3回`Dir.glob`された（バナーprobe、`current_files`、再チェックrunner）。
  バナーprobeは除去済み（カウントは今やセッションの解析済み集合から来る）。残り2つは別々の
  Runnerインスタンスにまたがる──重複排除には展開集合をそれらの間でスレッディングする必要が
  あり、延期した。

### B1 ── バンドル等価性の伝播ゲート

CODE（コメント除去済み、`ScopeIndexer.code_fingerprint`）がスナップショットとバイト単位で
同一である変更ファイルは宣言安定である: そのancestry／ファイルレベルの依存が消費するあらゆる
ファイル横断ファクトはコード由来で不変なので、それらはスキップされる。コメント取り込み
プラグイン（inline-RBS）が設定されているときはゲートOFF──Sorbetシグ／dry-typesのincludeは
CODEでフィンガープリントがカバーする。コメントを入力とするプラグインのみがそれを逃れる。

計測（インプレースコメント編集──コードフィンガープリントはコメント改行を保持し、あらゆる
defの開始行を保存するのでADR-17のdefサイト診断は健全なまま）:

| 実例 | リコンのcommentクロージャ | B1あり | wall |
|---|---|---|---|
| S2 `label.rb` | 19 | **1** | 8.14 s |
| S4 `cache_markdown_field.rb`（25 includers） | 66 | **1** | 8.07 s |
| S3 `application_record.rb` | 341 | **1** | 7.94 s |
| 対照: `application_record.rb` BODY編集 | 341 | **341**（ゲートがコード編集を拒否） | 12.30 s |

どこかのコメント編集は固定下限（~8 s）に収束する。body編集はフルクロージャを保つ（S3 12.3 s =
下限＋340限界）。B1は限界のファイルごとコストを除去する。固定下限はそれを生き延びる。
**境界（健全）:** B1はdef行番号をずらさないコメント編集（インプレーステキスト）でのみ発火する。
行を*追加する*コメントは後続のdefをずらす → コードフィンガープリントが変わる（追加された`\n`）
→ ゲートは保守的に依存を保つ。より完全な収束（不変シグネチャでのbody編集を通した宣言サマリー
等価性）は延期されたB2層である（ADR-88）。

**健全性**。監査済み: 依存がファイルから消費するあらゆるADR-46 / DiscoveryIndexのファイル横断
読み取りサーフェスは、そのseedバンドルによって捕捉される。4つのリコン容疑者
（`in_source_constants`、`class_ivars`/`class_cvars`/`program_globals`）はファイルごと専用で
決してファイル横断にseedされないので、定数／クラス状態の編集は依存の再チェックを必要としない
（エンジンは継承された本体を*消費側*のディスカバリーの下で走査する）。唯一カバーされていない
サーフェスはプラグインのファクトチャネルである──コードフィンガープリント（コード読み取り
プラグイン: Sorbet、dry-typesをカバー）＋inline-RBSゲート（唯一のコメント読み取り）によって
処理される。捏造編集バッテリー（定数／ivar／cvar／グローバル編集がフル実行とバイト単位で同一
のまま）、コメント収束のバイト単位同一の仕様、`make check-incremental`（lib＋プラグインツリー）
がバックストップとなる。GitLabの`--verify-incremental`は既存レッド（masterは同一に失敗する
──Railsプラグインの`:info`認識トレース診断がサブセット解析とフル解析で異なり、この変更とは
無関係）なので、計画に従い捏造編集の仕様が成立する。
