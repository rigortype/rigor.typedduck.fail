---
title: "ホットファイルのコード変遷（churn）監査 — エンジンの変更プレッシャーが集中する箇所（2026-09-23）"
description: "rigortype/rigor docs/notes/20260923-hot-file-churn-audit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260923-hot-file-churn-audit.md"
sourcePath: "docs/notes/20260923-hot-file-churn-audit.md"
sourceSha: "b2cba537d4da854a1a65ef1848bde62bf65657b8efb7abe7320f50967f69671a"
sourceCommit: "74970d1ece5a858d82c9b2c8f1a5deb57831f984"
sourceDate: "2026-09-23T11:35:27+09:00"
translationStatus: "translated"
sidebar:
  order: 20266923
---

ステータス: 調査ノート、設計上のコミットメントなし；これが根拠とする決定は[ADR-116](../../adr/116-hot-file-restructuring/)である。観測は`master`の`16889728`におけるRigor 0.3.9に対して実施。期間は2026-09-23までの60日間のファーストペアレント（first-parent）マージコミット492件であり、そのうち363件が`lib/`に触れていた。

先行ノート: [`20260604-structural-repetition-audit.md`](../20260604-structural-repetition-audit/)。同ノートのテーマB（`scope_indexer.rb`のウォーカー統合）は[ADR-53](../../adr/53-scope-discovery-index-separation/)により要求ベース（demand-gated）として延期されていた。

## 調査方法

```sh
git log --first-parent master --merges --since="60 days ago" --format=%H > merges.txt
while read h; do git diff --numstat "$h^1" "$h" | sed "s|^|$h |"; done < merges.txt > pr_files.txt
# ファイルごとのPR数とコード変遷（churn）: pr_files.txtに対するawk；共変更: マージごとのホットファイルのペア
# 最もホットなメソッド: `*.rb diff=ruby`を付けたgit diffで、各ハンクヘッダーの`def`をカウント
```

メソッドとクラスのサイズは、各ファイルに対するPrismウォーク（`DefNode`の行スパン、ネストされた`ClassNode` / `ModuleNode`のスパン）から取得した。

## 集中度

| ファイル | 行数 | PR数 | 変遷（Churn） | Def数 | Def中央値 |
| --- | --- | --- | --- | --- | --- |
| `inference/expression_typer.rb` | 4,713 | 55 | 3,026 | 273 | 7 |
| `inference/scope_indexer.rb` | 8,317 | 49 | 7,616 | 441 | 9 |
| `analysis/runner.rb` | 2,330 | 39 | 1,395 | 120 | 8 |
| `analysis/check_rules.rb` | 3,746 | 38 | 1,127 | 200 | 9 |
| `inference/statement_evaluator.rb` | 3,995 | 34 | 1,558 | 248 | 9 |
| `scope.rb` | 1,883 | 32 | 1,151 | 154 | 4 |
| `environment/rbs_loader.rb` | 2,843 | 29 | 2,047 | 147 | 10 |
| `analysis/runner/pool_coordinator.rb` | 1,120 | 22 | 908 | 43 | 8 |
| `inference/method_dispatcher/rbs_dispatch.rb` | 1,428 | 22 | 1,127 | 64 | 10 |
| `cache/incremental_snapshot.rb` | 356 | 19 | 277 | — | — |
| `inference/narrowing.rb` | 3,307 | 18 | 873 | 214 | 9 |

- 1,000行以上の21の`lib/`ファイルが、`lib/`の全121,217行の40%を占めている。`lib/`に触れた363件のPRのうち161件（44%）が上位6つのファイルの少なくとも1つに触れていた。
- メソッドは小さく、クラスはそうではない。肥大化は関数単位ではなくファイルおよびクラス単位で発生している。
- 21ファイルすべてにインラインの`Metrics/ClassLength`または`Metrics/ModuleLength`の無効化が含まれており、クラスサイズのCopはそれらのファイルでは何も制限していない。メソッドレベルのCop（`AbcSize`、`MethodLength`）は有効なままであり、コメントがその結果を記録している — 例えば`scope_indexer.rb`の`fold_mixin_lists`には「ABCバジェットを維持するために`fold_ancestry_tables`から分割」とある。プレッシャーにより、同一クラス内により多くのプライベートメソッドが生成されている。
- メソッドレベルの外れ値も存在する: `MethodDispatcher#resolve` 184行（コード71行）、`Runner#initialize` 163行、`PoolCoordinator#analyze_files_in_pool` 159行、`ScopeIndexer#walk_methods_and_def_nodes` 126行、`CheckRules.undefined_method_diagnostic` 106行。

## 増大

| ファイル | 06-15 | 07-25 | 08-25 | 09-10 | 09-23 |
| --- | --- | --- | --- | --- | --- |
| `scope_indexer.rb` | 2,740 | 2,783 | 2,937 | 4,822 | 8,317 |
| `expression_typer.rb` | 3,068 | 2,947 | 3,019 | 4,518 | 4,713 |
| `statement_evaluator.rb` | 3,364 | 3,073 | 3,124 | 3,480 | 3,995 |
| `runner.rb` | 1,030 | 1,233 | 1,752 | 2,104 | 2,330 |
| `scope.rb` | 831 | 886 | 990 | 1,570 | 1,883 |

[#1135](https://github.com/rigortype/rigor/pull/1135)（Sorbet `sig` DSL）は`scope_indexer.rb`に正味2,817行を追加した。そのコミットメッセージが理由を物語っている: 「残りのスコープウォークにわたって名前付け不可能なselfとcrefを辞退」、「スコープ発見ウォークにおいてシングルトンselfをシングルトンcrefから分離」、「発見ウォークにわたってevalブロックのボディをレシーバーに帰属」。

## 共変更（Co-change）

| PR数 | ペア |
| --- | --- |
| 15 | `scope_indexer.rb` ↔ `scope.rb` |
| 14 | `cache/incremental_snapshot.rb` ↔ `scope_indexer.rb` |
| 14 | `expression_typer.rb` ↔ `statement_evaluator.rb` |
| 12 | `runner.rb` ↔ `scope_indexer.rb` |
| 12 | `expression_typer.rb` ↔ `scope.rb` |
| 12 | `runner/pool_coordinator.rb` ↔ `worker_session.rb` |
| 10 | `runner.rb` ↔ `runner/pool_coordinator.rb` |
| 10 | `check_rules.rb` ↔ `expression_typer.rb` |
| 9 | `runner/diagnostic_aggregator.rb` ↔ `runner/pool_coordinator.rb` |

## メカニズム

### M1 — 発見テーブルのリストが約10箇所で手作業で列挙されている

`prepends`テーブルの追加（[#1165](https://github.com/rigortype/rigor/pull/1165)）では、8つの`lib/`ファイル — `scope_indexer.rb`、`scope.rb`、`scope/discovery_index.rb`、`runner.rb`、`runner/project_pre_passes.rb`、`cache/incremental_snapshot.rb`、`cache/descriptor.rb`、`protection/discovery_seed.rb` — および`sig/rigor/scope.rbs`が編集された。リストの箇所:

- `Scope::DiscoveryIndex`フィールド（`scope/discovery_index.rb`約L13）。
- `ScopeIndexer#merge_project_method_indexes`（約L199）、`#fold_file_index`およびその`fold_*`ヘルパー（約L6756〜6865）、`#build_seed_bundle`（約L6871）、`#bundle_to_file_index`（約L6923）。
- `Runner#initialize`（約L401〜433）、`#apply_discovery_result`（約L1453、21個の`@project_*` ivarが1つずつコピーされる）、`#project_scope_seed_tables`（約L1958）。
- `accumulate_include_lists`、`accumulate_prepend_lists`、および`accumulate_extend_lists`のボディは同一である。

### M2 — 実行レベルのファクトリストが4〜6箇所で手作業で列挙されている

実行レベルのファクト（ファイルではなく実行に関するファクト）は、ワーカーによって排出（drain）され（`worker_session.rb`約L279〜296）、コーディネーターによって再生（replay）され（`pool_coordinator.rb`約L935〜1006）、`RunSnapshots`に格納され（3回宣言、約L18〜61）、スロットごとに1つのラムダを介してアグリゲーターによって読み取られ（`runner.rb`約L1732）、レンダリングされ（`diagnostic_aggregator.rb`約L818〜928）、整列され（`runner.rb`約L1137〜1165）、そして再生可能な場合はシリアライズされる（`incremental_snapshot.rb`約L188、約L303〜345）。これを支払ったPR: #725、#788、#801、#848、#854、#978、#1054。6つのコーディネーターパスがシグネチャ状態スロットを個別に書き込んでいる；逐次フォールバック（`pool_coordinator.rb`約L906）は5つのうち3つをコピーし、`synthesized_namespaces`と`conformance_results`を欠落させている — コードリーディングによって発見され、個別の修正に引き渡された。

### M3 — `ScopeIndexer`に21個の再帰的ウォーカーがあり、それぞれが独自のコンテキストルールを持つ

各ウォーカー（`walk_class_ivars`、`walk_class_cvars`、`walk_class_superclasses`、`walk_class_includes`、`walk_class_extends`、`walk_method_visibilities`、`walk_constant_write_census`、`collect_class_alias_map`など）が同じ分岐を再実装している: `class` / `module`宣言、`class <<`（ファイル内に20個の`when Prism::SingletonClassNode`分岐）、`K = Class.new { … }`ファミリー、および`class_eval` / `instance_eval`ファミリー。共有ヘルパーは存在するが（`meta_new_block_split` 11箇所、`eval_block_split` 6箇所、`decl_body_context` 6箇所）、ウォーカーあたり4〜7個の分岐メソッドがコピーされている: `walk_class_cvars`（約L1770〜1884）と`walk_class_superclasses`（約L4632〜4735）を比較。cref/selfモデルへの変更は21回適用される；#1135がまさにそのコストであった。

### M4 — `ExpressionTyper`は5つのクラスタを保持；ブロック評価は`StatementEvaluator`と重複している

| クラスタ | 行数 | 備考 |
| --- | --- | --- |
| ノードごとの`type_of_*`ハンドラ | ~361–1240 | |
| 呼び出しディスパッチ、レシーバー解決 | ~1241–1861 | |
| ユーザーメソッド戻り値推論 | ~1862–3527 | 10個のスレッドローカルキーを所有；`dynamic_top`と1つの`type_of`のみを介して残りにアクセス |
| ブロック戻り値の型付け | ~3601–4062 | 4つのメソッドとスレッド化フラグを介して次のクラスタと結合 |
| 要素ごと / inject / ハッシュ形状ブロックの畳み込み | ~4063–4713 | |

`expression_typer.rb` ↔ `statement_evaluator.rb`の14件の共変更PRのうち7件がブロック評価を変更した（#340、#620、#852、#865、#1030、#1103、#1106）。ブロックのエントリスコープ構築が3箇所に存在し（ET約L3690〜3726、SE約L2984〜3061、要素ごとの畳み込み）、乖離している: SEは`|x; y|`ブロックローカル変数をnilに束縛するがETはしない；ETの引数型は`...`と`**h`を展開するがSEはしない。ジャンプターゲットスキャン（ET約L3818、SE約L1327）は境界ノードの扱いで一致していない。またETは`h[k] += v`、`||=`、`&&=`を右辺単体として型付けするが（ディスパッチテーブル 約L132）、SEは格納される値を計算する — 個別の修正に引き渡された。

### M5 — `CheckRules`は1つのモジュール内に10個のルールを持つ

`call_node_diagnostics`（約L267）は10個のルールエントリーを順番に呼び出す。各ルールは連続したブロックである: 未定義メソッド 約L664〜1507（ファイル内で最も変更の激しいメソッド、9件のPRハンク）、不正アリティ 約L1508〜1752、nilレシーバー 約L1753〜1970、raiseルール 約L2087〜2328、引数型 約L2621〜3230、戻り値型 約L3231〜3365、オーバーライド 約L3366〜3746；抑制（suppression）のパースは約L447〜660。`check_rules/`にはすでにコレクター群が存在する。

### M6 — `Scope`と`RbsLoader`

- `Scope`で最もハンクが多かったメソッドは`initialize`（12）、`rebuild`（12）、および`build_joined_scope`（8）である: 新しいフィールドが追加されるたびにこれら3つすべてに書き込まれる。4つの同一性キー付きアドバイザリテーブル（`dynamic_origins`、`void_origins`、`plugin_typed_calls`、`optimistic_origins`）は1つの契約を共有している — 参照によってスレッド化され、`==`/`hash`から除外される。クラスグラフクエリ（約L630〜1500: `discovered_method?`、`user_def_for`、`superclass_of`、`includes_of`、祖先ウォーク、ヘッダーネスト解決）は`@discovery`のみを読み取る。
- `RbsLoader`のクラスレベル環境組み立て（約L64〜1410）はステートレスであり、ホットなメソッドのすべてを抱えている（`build_env_for` 9ハンク、`add_virtual_rbs` 5ハンク）；インスタンス側（約L1413〜2843）はクエリサーフェスに加えて約450行の定義構築失敗レポートである。
