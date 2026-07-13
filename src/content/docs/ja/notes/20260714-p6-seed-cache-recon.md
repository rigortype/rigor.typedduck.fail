---
title: "P6偵察 —— ファイルごとのシード寄与キャッシング（ADR-46完成の弧）"
description: "rigortype/rigor docs/notes/20260714-p6-seed-cache-recon.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260714-p6-seed-cache-recon.md"
sourcePath: "docs/notes/20260714-p6-seed-cache-recon.md"
sourceSha: "2e8ae958ae59a978d3fd8432eb95c4ca757e5b5433957dee71165bbdbaba98c4"
sourceCommit: "ca611a0fa195c049e8e56b0aa4a78145864c4d54"
translationStatus: "translated"
sidebar:
  order: 20266714
---

> [ADR-85](../../adr/85-seed-bundles-and-lazy-def-node-handles/)（ファイルごとのシードバンドル＋遅延def-nodeハンドル）の基礎となる偵察。この偵察が誤っていて実装中に判明した2点（`classes`のキーリスト仮定と、見落とした`symbol_fingerprints`ノード値コンシューマ）については、そのADRの「Divergences from the recon」節を参照。

計測日2026-07-13、`master` @ `a09b9e29`（PR #74–#80 ＋ ADR-84戻り値メモが着地済み）。
Ruby 4.0.5、Prism 1.8.1、`RIGOR_DISABLE_YJIT=1`。メトリクスは`GC.stat(:total_allocated_objects)`
（アロケーションで判断）＋ウォール。rigorプロセスは一度に1つ。計装はすべて
`scratchpad/perf/`内のドライバ側モンキーパッチで行い、**リポジトリは一切変更していない**（git statusはクリーン）。

対象: rigor `lib`（324ファイル、プラグインなし）、mail `lib`（111ファイル、プラグインなし）、
gitlab `app/models`（1225ファイル、**自動ロードされるRailsプラグイン10個**）。

---

## ヘッドライン

| run type | rigor lib | mail lib | gitlab models |
|---|---|---|---|
| **コールドフルミス** —— 総アロケーションに占めるプリパスの割合 | 3.2% | 6.0% | 2.0% |
| **ウォーム`--incremental`** —— 総アロケーションに占めるディスカバリプリパスの割合 | **82.7%** | **94.0%** | **4.9%** |
| gitlabのウォームインクリメンタルの支配要因 | — | — | プラグイン`#prepare` **86%** |

ディスカバリプリパスは**コールドミスでは丸め誤差**（ファイルごとの解析が支配的）だが、
**プラグインが少ないプロジェクトでのウォームインクリメンタル再チェックでは支配的なコスト**となる。Railsアプリでは
プラグイン`#prepare`に飲み込まれ、これはインクリメンタル呼び出しのたびに再実行される。

キャッシュ済みのファイルごとバンドルのMarshal.load＋マージ畳み込みは、パース＋ウォークによる再計算に**ウォールで36×–570×／
アロケーションで10×–48×**勝る —— ADR-54の「再計算に勝つ」バーは大きな余裕でクリアされる。インクリメンタルな
単一ファイル再チェックが要求するのは**わずか0–6個の別々のファイル**のdef-node本体だけなので、遅延オンデマンドパースが
触れるものはほぼ皆無だ。

**推奨: これを構築する。イーガーMarshal（プレーンデータ）＋遅延ハンドル（def-node）として、
IncrementalSnapshotホスト上で、ファイル順でバンドルから再構築する —— ただしスコープは
プラグインが少ないプロジェクト向けの`--incremental`パス最適化とし、Railsアプリでは
このスライスが効き始める前にまずプラグイン`#prepare`のキャッシング（別のレバー）が必要である点に注意する。**

---

## Q1 —— プリパスコストの内訳（パース vs ウォーク）、コールド

`ScopeIndexer.discovered_project_index_for_paths`ループ、フェーズごとのタイマー（rep-2、ウォーム済みメソッド。
アロケーションはJIT非依存）。パース ＝ `Prism.parse`、ウォーク ＝ `collect_class_decls` ＋
`accumulate_project_index`。

| target | files | total wall | total alloc | parse wall | walk wall | walk %wall | parse alloc | walk alloc | **parse %alloc** |
|---|---|---|---|---|---|---|---|---|---|
| rigor lib | 324 | 0.28 s | 439 k | 0.069 s | 0.201 s | **74%** | 349 k | 88 k | **80%** |
| mail lib | 111 | 0.53 s | 485 k | 0.076 s | 0.452 s | **86%** | 463 k | 21 k | **96%** |
| gitlab models | 1225 | 0.58 s | 846 k | 0.133 s | 0.414 s | **76%** | 623 k | 218 k | **74%** |

ファイルごと（ms）: rigor パース平均0.21／p95 0.82、ウォーク平均0.62／p95 2.27、合計p95 3.14。
mail パース平均0.68／p95 1.02、ウォーク平均**4.07**／p95 **5.80**、合計p95 6.77（mailはウォークコストの
外れ値 —— 大きなモノリシックファイル）。gitlab パース平均0.11／p95 0.29、ウォーク平均0.34／
p95 0.97、合計p95 1.27（小さなモデル）。

**相反する2つの事実、どちらも load-bearing**: ウォークが**ウォール**を支配する（74–86%）が、パースが
**アロケーション**を支配する（74–96%）。両方をスキップするキャッシュは両方で勝つ。オンデマンドでパースを払い直す
遅延方式は、ウォークの勝ち（ウォールの大部分）を保つが、パースアロケーションの勝ちは*要求されない*ファイルの分だけ保つ（Q5）。

---

## Q2 —— ファイルごとの寄与の分離可能性＋マージ意味論

`accumulate_project_index`（scope_indexer.rb:2110）でファイルごとに畳み込まれるテーブル、値のシェイプと
マージ規則:

| table | value shape | merge rule (folding files in order) |
|---|---|---|
| `def_nodes` | `{class => {method => Prism::DefNode}}` | **後勝ち**（`merge!`）—— *ライブなノード参照* |
| `singleton_def_nodes` | `{class => {method => Prism::DefNode}}` | 後勝ち（`merge!`）—— *ライブなノード参照* |
| `def_sources` | `{class => {method => "path:line"}}` | **先勝ち**（`\|\|=`） |
| `superclasses` | `{class => super_name(String)}` | 後勝ち（`merge!`） |
| `includes` | `{class => [module_names]}` | **累積**（`(a+b).uniq`） |
| `method_visibilities` | `{class => {method => :public/:private/…}}` | 後勝ち（ネストした`merge!`） |
| `methods` | `{class => {method => kind}}`（存在） | 後勝ち（ネストした`merge!`） |
| `class_sources` | `{class => Set<path>}` | **累積**（Setの合併） |
| `data_member_layouts` / `struct_member_layouts` | member-shapeテーブル | 後勝ち（`merge!`） |
| `classes`（`collect_class_decls`由来） | `{full_name => Singleton[full]}` | 後勝ち（上書き）。値はキーの純関数 |

- (a) **孤立して構築可能**: 可 —— `accumulate_project_index(fresh_acc, path, root)`はちょうど
  1ファイル分の寄与を生む。
- (b) **ファイル順でマージ可能**: 可 —— それはまさに現在のループそのものである。
- (c) **変更ファイルの除去・置換（デルタ更新）**: **一般には健全でない。**
  `includes` / `class_sources`は累積し（Setの合併は他のすべての寄与者を知らずには元に戻せない）、
  `def_nodes` / `superclasses` / `methods`は後勝ちである（正準順でファイルFの後続にあるファイルGを、
  ファイルFを「最後」に置いて置換すると誤って上書きしうる）。**健全なマージは
  キャッシュ済みバンドルからファイル順で再構築すること**である（各ファイルのキャッシュ済みバンドルを既存の
  意味論で畳み込む。変更ファイルは新鮮なウォークを寄与し、未変更ファイルはそのキャッシュ済みバンドルを寄与する）。

**経験的には順序依存がかみつくことはほぼない**: ファイルをまたぐ重複した`(class,method)`インスタンスペア ＝
**0 / 0 / 0**（rigor 3483個の別々のペア、mail 650、gitlab 7977 —— クロスファイルの重複はゼロ）。
再オープンされたクラス: rigor 0、**mail 1**（1クラスが2ファイル、メソッドの衝突なし）、
gitlab 0。衝突するスーパークラス: どこでも0。したがってデルタ置換は*実践的には*健全だが、
バンドルからの再構築はそのリスクを冒す理由がないほど安価である（Q3の畳み込みコスト参照）。

finalizeに関する1つの機微: `finalize_def_index`は`subtract_def_methods`を実行する（`def`ノードが
**どこかに**ある`(class,method)`を`methods`から落とす）。これは*マージ後*のプロジェクト全体の操作なので、
キャッシュ済みバンドルは**finalize前**の`methods`テーブル＋`def_nodes`を格納し、すべてのバンドルを
畳み込んだ後に`finalize_def_index`を一度だけ実行する（ファイルごとではなく）必要がある。

---

## Q3 —— バンドルの内容、サイズ、ADR-54「再計算に勝つ」テスト

ファイルごとのバンドルの分割: **プレーンデータのサブセット**（def-node以外のすべてのテーブル。`classes`は
値が再構築可能なのでキーリストとして格納）＋ **def-node参照**（`def_nodes` /
`singleton_def_nodes`を`{class => {method => [path, node_id, name]}}`として再表現）。

| target | files | plain total | plain mean / p95 | def-ref total / p95 | whole blob (raw / **zlib**) | **Marshal.load ALL** | recompute parse+walk | **load ÷ recompute (wall)** |
|---|---|---|---|---|---|---|---|---|
| rigor lib | 324 | 439 KB | 1389 B / 3589 B | 272 KB / 2694 B | 639 KB / **127 KB** | **6 ms, 41 k allocs** | 290 ms, 440 k allocs | **0.022 (45× faster)** |
| mail lib | 111 | 90 KB | 832 B / 2039 B | 41 KB / 1011 B | 122 KB / **24 KB** | **1 ms, 10 k allocs** | 572 ms, 485 k allocs | **0.003 (330× faster)** |

マージ畳み込みコスト（N個の孤立したファイルごとテーブルを順に畳み込む＋finalize）、Q2のスクリプトより:
rigor **2 ms / 2.9 k allocs**、mail **~0 ms / 0.8 k allocs**、gitlab **5 ms / 10 k allocs**。

**キャッシュパスの合計 ＝ Marshal.load ＋ マージ畳み込み vs 再計算 ＝ パース＋ウォーク:**
- rigor: **8 ms / 44 k allocs** vs 290 ms / 440 k → **36×ウォール、10×アロケーション**
- mail: **1 ms / 11 k allocs** vs 572 ms / 485 k → **570×ウォール、44×アロケーション**

ADR-54のバー（definitions blobはロード366 ms vs リビルド137 ms —— *負け*——で撤去された）は、
*逆方向*に1.5–2.5桁の余裕でクリアされる。プレーンデータ＋def-refバンドルは
極小（プロジェクト全体でzlib 24–127 KB）で、再計算をはるかに下回るロードとなる。**バンドルはそのバイト数を
決定的に正当化する** —— ただしマージステップに限る。def-nodeの*本体*は依然として解決が必要である（Q5/Q6）。

---

## Q4 —— node_idの安定性

Prism 1.8.1は`Prism::Node#node_id`を公開する。サンプルしたファイルで経験的に検証:
- **すべてのDefNodeが非nilのnode_idを持つ**（`node_id_nil_count = 0`）。
- **同一バイト列の反復パースにわたって安定**（`node_id_mismatch_repeat_parse = 0`、mail 169 defs）。
- **プリパスのパース vs 同一バイト列の新鮮なパース**にわたって安定（同じテスト）。
- `[start_offset, name]`も**同等に安定**（`startoffset_name_mismatch = 0`）。

どちらのキーも動作する。**`node_id`を推奨する**（コンパクトなネイティブInteger、パース内でノードごとに一意、
文字列構築なし）を主たる参照とし、`[start_offset, name]`を解決時の安価なクロスチェックとして保持する
（Prismのマイナーバージョン間でnode_id割り当てが変わることに対する防御 —— 参照はスキーマ／ABIバージョン付きの
blob（Q7）の下に格納されるので、不一致はコールド再ウォークを強制するだけで、誤ったノードにはならない）。`name`は
解決時のアサーションのためにいずれにせよ格納される。（`node_id_supported:false`が
rigorでのみ出現したのは、そのサンプラの最初のファイルにDefNodeがなかった → `nil.respond_to?` —— という
アーティファクトで、スタンドアロンチェックで訂正済み: prism 1.8.1は2つのdefに対しid `[6, 9]`を返す。）

---

## Q5 —— 需要統計（オンデマンドパース）

ADR-46の3つのアクセサのチョークポイントを計装し、def-nodeが解決された（非nil）別々の**ソースファイル**を
数えた。

**フルコールドラン**（`check --no-cache`）: 需要された別々のファイル ——
- rigor lib: **213 / 324 = 66%**（24.7 k個の解決が戻り値メモを介して213ファイルに畳み込まれる）
- mail lib: **43 / 111 = 39%**

**`--incremental`サブセット再チェック**（`IncrementalSession#reanalyze_subset`によるリーフサブセット、
ソース変更なし）: 需要された別々のファイル ——

| subset size | rigor | mail |
|---|---|---|
| 1 (leaf) | **0** | **0** |
| 5 | 1 (0.3%) | 2 (1.8%) |
| 20 | 4 (1.2%) | 6 (5.4%) |

単一ファイル／小サブセットのインクリメンタル再チェックが需要するのは**0–6個の別々のファイルの本体**
（プロジェクトの5%以下）だ。*変更ゼロ*のインクリメンタルは**0**を需要する（解析集合が空 → `analyze_files([])`が
本体評価の前に戻る）。したがって遅延ハンドル方式はインクリメンタルパスで**本質的に何もパースしない**し、
パースがプリパスのアロケーションを支配する（Q1）ので、遅延解決は、イーガーに全解決した場合には
失われるパースアロケーションの勝ちをほぼ丸ごと保つ。フルコールドランでは依然としてオンデマンドで
39–66%をパースするが、コールドランはいずれにせよすべてを再ウォークするので、そのパスは対象ではない。

**評決: 遅延ハンドルはインクリメンタルパスでイーガーMarshal＋解決を厳密に支配する。**

---

## Q6 —— 遅延ハンドルがどこで解決されるか（`discovered_def_nodes`のコンシューマ）

full lib/rigorスイープからの2つのコンシューマクラス:

**(A) ライブな`Prism::DefNode`値を必要とする —— 唯一の解決サイト（3個）:**
- `Scope#user_def_for`（scope.rb:370）
- `Scope#singleton_def_for`（scope.rb:383）
- `Scope#top_level_def_for`（scope.rb:412）

これらはADR-46の依存記録チョークポイントであり、ノード本体が引き渡される唯一の場所である
（→ `ExpressionTyper#infer_user_method_return`）。`(path, node_id)`ハンドルは、アクセサの契約を変えずに
実行ごとのパースメモを介してここで解決される（呼び出し側は依然として本物のDefNodeを受け取る）。

**(B) テーブルの構造（クラス名／メソッド名のキー）のみを読む —— ノードのデリファレンスなし、参照テーブルで
直接作業:**
- `known_user_class?`（expression_typer.rb:1438: `discovered_def_nodes.key?(name)`）
- `method_definers_index` / `build_method_definers_index`（expression_typer.rb:1523/1528: クラス名
  ＋メソッド名のキーを反復）
- `check_rules.rb:2339`（`discovered_def_nodes.key?(name)`）
- `parameter_inference_collector.rb:346`（パラメーター推論のためにテーブルを読む —— キー）
- 実行スコープのメモは`class_graph_buckets` / `override_gate_buckets` /
  `method_definers_index`（expression_typer.rb:1353/1476/1523）を格納し、ノード値ではなく**テーブルの
  オブジェクト同一性**でキー付けする —— 実行ごとの新しいマージ済み参照テーブルは自動的に新鮮なバケットに落ちる。

**戻り値メモとの相互作用（ADR-84 WD2）—— load-bearingな制約。** 戻り値メモ
（`return_memo_bucket`、expression_typer.rb:1934）は、実行世代トークンでキー付けし、次いで
解決された**def_nodeのオブジェクト同一性**でキー付けする（RETURN_MEMO_KEYのドキュメント、1633–1637）。したがって
ハンドル解決は**実行ごと・`(path, node_id)`ごとに1つの安定したノードオブジェクトを生まなければならない**（実行ごとに
メモ化されたパース: 需要されたファイルを一度パースし、そのASTを保持し、node_id → すべての呼び出しで同じ
オブジェクトへと解決する）。呼び出しごとに再パースすると毎回新鮮な同一性を鋳造する → すべてのメモ検索が
ミスする → 断片化する。今日、被呼び出し側はすでに**実行ごとに≤2個のノード同一性**を持つ（プロジェクトインデックスの
パース＋定義ファイル自身の解析パース）。実行ごとの遅延パースメモはその上限を保つ（かつクロスファイルの腕を
1同一性に減らす）ので、メモの一貫性を害するどころか*改善する*。メモストアのキー（上記クラスB）は
影響を受けない —— それらはノード値を決して見ない。

---

## Q7 —— 永続化ホスト

| option | fs-ops on 11 k files | eviction | schema/ABI story | fit for rebuild-from-all-bundles |
|---|---|---|---|---|
| **`Cache::IncrementalSnapshot`に相乗り**（単一のzlib-Marshal blob、フィンガープリントで門番） | **1 read + 1 write** | blob全体（すでにライフサイクル管理済み、フィンガープリントミスで破棄） | `SCHEMA`定数（現在5）のバンプ。#57 ABIは`engine:#{VERSION}`経由でフィンガープリントに畳み込まれる | **最良** —— マージには*すべての*バンドルが必要で、1回のMarshal.loadがすべてを賄う |
| 新しいファイルごとの`Cache::Store`プロデューサファミリー（ファイルごとに1エントリ、ダイジェストでキー付け） | **~N reads**（11 k回のstat＋open＋inflate） | ADR-54の`evict!` ＋ 256 MB上限がエントリごとに適用 | `PAYLOAD_ABI_VERSION = Rigor::VERSION` ＋ `Descriptor`スキーマ | **不良** —— リビルドはすべての未変更バンドルをロードするので、実行ごとにN回のfs-ops。syscallオーバーヘッドは再ウォークに匹敵しかねない |
| 実行構成ごとに1つのシャード化blob（専用アーティファクト） | 1 read + 1 write | 独自 | 独自 | 良いが、スナップショットのフィンガープリント＋ライフサイクル機構を重複させる |

**推奨: `Cache::IncrementalSnapshot`を拡張する。** `Payload`に`seed_bundles`フィールドを追加し
（`{path => Marshal可能なファイルごとバンドル}`）、`SCHEMA`をバンプする。これはすでに(i) `--incremental`の
ホストであり、(ii) フィンガープリントが一致するとき無条件でロードされ（1回のfsリード —— まさに
すべてをマージするアクセスパターン）、(iii) すでにエンジンバージョン＋設定＋ルート＋gem＋プロジェクトRBSを
ダイジェストするフィンガープリントでキー付けされているので、#57 ABIマーカーとキャッシュ無効化がタダで手に入り、
(iv) 全体blob計測で示された13–16%と同じ圧縮率のzlib-Marshal（127 KB / 24 KB）である。
ファイルごとの`Cache::Store`ファミリーが誤ったホストであるのはまさに、健全なマージが*すべての*
バンドルを必要とするからだ —— 1回のMarshal.loadを~N回のfs-opsに変えてしまう、ADR-54のアンチパターンである。一般の
（非`--incremental`）ADR-45のキャッシュ済みMISSも恩恵を受けるには、同じenvディスクリプタでキー付けした*姉妹*の
単一blobを後で追加できるが、そのパスの勝ちは小さい（Q8）ので優先ではない。

---

## Q8 —— このスライスは価値があるか？

プリパスの絶対数値と、それが位置する実行との対比:

| scenario | total allocs | discovery pre-pass | **pre-pass share** | slice ceiling |
|---|---|---|---|---|
| (b) mail **コールドフルミス** | 8.13 M | 485 k | **6.0%** | ~0%（コールドランでは何もキャッシュされていない）。後のキャッシュ済みMISSで~6% |
| rigor **コールドフルミス** | 13.96 M | 440 k | 3.2% | 同じ性質 |
| gitlab **コールドフルミス** | 42.94 M | 846 k | 2.0% | 同じ性質 |
| (c) rigor **`--verify-incremental`** | 35.29 M | ~2–3×440 k | **~3–4%** | 小（verifyはフルベースライン＋サブセットを実行） |
| (a) gitlab **単一編集インクリメンタル**（badge.rb） | 24.12 M | 811 k | **3.4%**（計測値） | 小 —— プラグイン`#prepare` 86%、env構築4.9% |
| gitlab **変更ゼロインクリメンタル** | 16.6 M | 811 k | 4.9% | envは構築されない（解析集合が空） |
| **rigor 単一編集ウォームインクリメンタル** | 0.53 M | 436 k | **82.7%** | **大** |
| **mail 単一編集ウォームインクリメンタル** | 0.52 M | 485 k | **94.0%** | **大** |

タスクの3つの文字通りのシナリオ（a/b/c）では、天井は**3つとも<10%** —— それらにとっては計測された
「限界的」だ。価値は、それらが列挙しないシナリオに宿る: **プラグインが少ないウォームインクリメンタルな単一編集**であり、
そこではディスカバリプリパスが実行の**83–94%**を占め、スライスがそのほぼすべてを取り除く
（ロード＋畳み込みの~44 k / 11 kアロケーション＋0–6個のオンデマンドパースまで下がる）。

内訳の理由: `--incremental`だけが未変更ファイルのファイルごと解析をスキップする（ADR-46）。単なる
キャッシュ済みMISSはすべてを再解析するので、そこではプリパスは2–6%の薄片だ。そしてRailsアプリでは
`--incremental`再チェックはディスカバリプリパスではなく**プラグイン`#prepare`**に支配される
（gitlab: 自動ロードされるRailsプラグイン10個、`#prepare` ＝ 16.6 Mウォームインクリメンタル実行の**14.2 M / 86%**。
ディスカバリプリパス811 k ＝ 4.9%、synthetic-scan 0.67 M、スナップショットI/O 0.38 M）。`#prepare`は
すべてのインクリメンタル呼び出しで再実行される（`ProjectPrePasses#run` → `plugin_prepare_diagnostics`、
再チェックごとに新鮮なランナー）。**したがってRailsではディスカバリスライスはプラグイン`#prepare`キャッシングが
先に着地することに依存する** —— もし`#prepare`がキャッシュされれば、gitlabのウォームインクリメンタルは~2.4 Mまで下がり、
ディスカバリプリパスは5%から~34%へ跳ね上がり、その時点でこのスライスはそこでも価値を持つようになる。

**結論:** 構築する価値はある。ただし*どこで*効くかについて目を開いておくこと。これは`--incremental`パスの
最適化で、プラグインが少ないプロジェクト（ライブラリ、プラグインなしのアプリ —— mail / rigor-libのクラス）で
ウォームインクリメンタルコストの80–94%を取り除き、FPフリー／精度中立である（決定的なプリパスの純粋なキャッシング）。
Railsの読者にとっては、プラグイン`#prepare`キャッシングも完了するまでは~5%の動きだ。Railsのインクリメンタル
レイテンシが目標なら、そのレバーを先にシーケンスすること。

---

## 設計上の推奨（ADR向け）

1. **メカニズム: イーガーMarshal（プレーンデータ）＋遅延ハンドル（def-node）。** 各ファイルの
   finalize前のプレーンデータテーブル*と*、`(path, node_id, name)`ハンドルとして再表現したdef-nodeテーブルを
   キャッシュする。ミス時は、変更ファイルだけを再ウォークし、残りはキャッシュ済みバンドルをロードし、**すべての
   バンドルを正準ファイル順で畳み込んでマージ済みインデックスを再構築**してから`finalize_def_index`を一度だけ実行する
   （Q2 —— デルタ置換は累積／後勝ちテーブルに対して健全でない。畳み込みは2–5 msなので、そうしない
   理由はない）。構造のみのコンシューマ（Q6クラスB）はマージ済み参照テーブルを直接読む。
2. **def-nodeの解決: 遅延に、3つのアクセサ（Q6クラスA）で、実行ごとのパースメモを介して。** これは
   需要されたファイルを一度パースし、そのASTを実行のあいだ保持し、`node_id` → **1つの安定したノード
   オブジェクト**へと解決する（ADR-84の戻り値メモが要求する）。インクリメンタル再チェックでは0–6ファイルしか
   需要されない（Q5）ので、これはほぼ何もパースしない。
3. **ホスト: `Cache::IncrementalSnapshot`を拡張**し、`seed_bundles`ペイロードフィールド＋`SCHEMA`バンプを
   加える（Q7）。1回のfsリードで済み、フィンガープリントはすでにABI／設定／gem／RBSをカバーする。
4. **スコープ: `--incremental`パスの最適化。** プラグインが少ないプロジェクト（mail、rigor-lib: ウォーム
   インクリメンタルのアロケーション−80–94%を期待）で計測して勝ちに門を設ける。Railsの
   インクリメンタルのボトルネックがプラグイン`#prepare`（86%）であり、それはこのスライスが触れない別の
   キャッシュレバーであることをADRで明記する —— ディスカバリスライスがRailsで~34%の関連性に達するのは、それが
   着地した*後*だけである。
5. **正当性ゲート:** 既存の`--verify-incremental`バイト同一クロスチェックがすでにマージを裏打ちする。
   解決されたハンドルのノードが`node.name == stored_name`（Q4クロスチェック）を満たし、メモキーが安定に保たれる
   （実行ごと・`(path, node_id)`ごとに1つのノード同一性）ことのspecを追加する。
