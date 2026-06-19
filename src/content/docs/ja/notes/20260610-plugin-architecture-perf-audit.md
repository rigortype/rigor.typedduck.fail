---
title: "プラグインアーキテクチャ構造監査 — per-call 消費経路の最適化余地"
description: "Imported from rigortype/rigor docs/notes/20260610-plugin-architecture-perf-audit.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260610-plugin-architecture-perf-audit.md"
sourcePath: "docs/notes/20260610-plugin-architecture-perf-audit.md"
sourceSha: "fbb1f4e8528e8e836bc4efd48a22ee962902bb0a8d635e17dc5ac975fc9931ff"
sourceCommit: "98bd3fb5bcd0434c814c1d4e3c864e3888ddeae4"
sourceDate: "2026-06-10T23:55:51+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266610
---

*2026-06-10. Status: structural audit feeding an ADR — informational, not normative. The
spec binds. Observations taken against Rigor v0.1.17 (working tree @ `54062b0a`).*

## Question

[Mastodon](../20260604-mastodon-allocation-profile/) /
[GitLab](../20260604-gitlab-plugin-contribution-allocation/)のアロケーション・プロファイル
とADR-44の対処で、プラグイン消費経路の*症状*（per-dispatchの`dup`連打、全プラグイン
線形走査）は大きく削れた。本監査の問いはその先 — **アーキテクチャ自体を、この種の最適化が
構造的に不要になる形へ変えられるか**。コードを読んだ静的監査であり、新規プロファイルは
取っていない（プロファイル手法と数値は上記2ノートが基準）。

## 現状の到達点（再掲・前提）

- `Registry::ContributionIndex`（`lib/rigor/plugin/registry.rb`）が「per-call経路を
  構造的に実装するプラグイン」をregistry構築時に1回だけ分類し、
  `MethodDispatcher` / `StatementEvaluator`両方の`collect_plugin_contributions`は
  その部分集合だけを訪問する（GitLab: 11 → 2）。
- `Plugin::Base.dynamic_returns` / `.type_specifiers`のスナップショットはメモ化済み。
  貢献の収集は遅延割り当て + 共有凍結空配列。

つまり「どのプラグインを見るか」の枝刈りは済んでいる。残るコストは
**（a）見ると決めた後のper-call処理**と、**（b）インデックス化できない不透明経路**にある。

## 所見（影響順）

### 1. レガシー`flow_contribution_for`がゲート不能 — 最大の構造問題

オーバーライドしているプラグインは**全コールノード × 2経路**（dispatcherの戻り値収集 +
statement evaluatorのassertion収集）で無条件に呼ばれる。ゲート条件はプラグイン内部の
コードに埋まっており、エンジン側からインデックス化できない。

残存ユーザーはproductionの最大手4つ + examples 3つ:

| プラグイン | 実際のゲート条件 | 宣言化に必要な語彙 |
| --- | --- | --- |
| rigor-activerecord | receiverがモデルクラス／Relation（`prepare`で構築する`model_index`のキー集合） | **run時解決のreceiver集合**（callable、`prepare`後に1回評価） |
| rigor-activestorage | 同上（attachment宣言インデックス） | 同上 |
| rigor-sorbet | `T.*`アサーション（静的名）**+ catalog経路（ingestしたsigを持つ任意のdefメソッド）** | **run時解決のメソッド名集合**（catalogキー、`prepare`後評価） |
| rigor-rspec | ファイルごとのlet名（per-file動的） | **per-file名前集合**フック |
| examples/rigor-units | receiverの*次元*（refinement carrier、nominal classなし）+ 静的メソッド名集合 | **静的メソッド名ゲート（receiver不問）** |
| examples/rigor-lisp-eval / -pattern | config由来の単一メソッド名 | run時メソッド名（config由来） |

> **2026-06-10訂正**: 当初この表は「rigor-activesupport-core-ext = メソッド名集合」
> を5番目に挙げ、sorbetを「静的メソッド名ゲート」に分類していた。実装時の精査で
> 両方とも誤りと判明した — **activesupport-core-extは`flow_contribution_for`を
> 持たない純RBSバンドル**（移行対象ですらない。grepはコメント言及にヒットした）、
> **sorbetはcatalog経路で任意defメソッドにマッチする**ため静的名前集合に収まらず
> run時集合が必要。結果、**静的メソッド名ゲートに収まる実プラグインは存在せず**、
> その最初の消費者はexamples/rigor-unitsだった（ADR-52 slice 2で移行済み）。

`dynamic_return` DSL（ADR-37 slice 2）は当初receiverを**静的なクラス名Array**でしか
宣言できなかった。ADR-52 WD2 slice 2で**receiver不問（`methods:`のみ）の静的ゲート**
を追加しunitsを移行。残るproduction 4 + config由来examples 2はrun時集合
（receiver / メソッド名 / per-file）が必要で、slice 3以降で対応する。

### 2. 同一コールノードへの二重問い合わせ

`MethodDispatcher#collect_plugin_contributions`（戻り値）と
`StatementEvaluator#collect_plugin_contributions`（post-return facts、
`apply_plugin_assertions`経由で**全コール文**に対して走る）が独立に収集する。
レガシープラグインは1コールにつき内部判定をフルに2回支払う。
GitLabプロファイルで`StatementEvaluator`側だけで3.5 % のアロケーションが
これに相当する。

### 3. メソッド名の横断インデックスがない

- `type_specifiers`は**純粋にメソッド名ゲート**なのに、照合は
  プラグインごと・ルールごとの線形`rule[:methods].include?(name)`
  （`Plugin::Base#type_specifier_facts`）。
- `dynamic_return_type`はルールごとにreceiver祖先照合
  （`class_matches_receiver?` → `environment.class_ordering`）をper-dispatchで
  やり直す。`methods:`ゲートがあるルールでもreceiver照合が先に走る。

圧倒的多数のコール（`each` / `map` / `+` …）はどのプラグインも関知しないのに、
「関知しない」ことの確認がO（対象プラグイン × ルール）かかる。registry構築時に
`Hash[Symbol → [(plugin, rule)]]`の逆引きを作れば典型パスはHash 1引きで終わる。

### 4. Registry集約クエリが毎回flat_map再計算

Registryは構築時にfreezeされるのに、以下は呼び出しごとにその場で集約する:

| クエリ | 呼び出し頻度 | 現状コスト |
| --- | --- | --- |
| `Registry#open_receiver?` | `call.undefined-method`候補ごと（`Analysis::CheckRules`） | flat_map + Array#include? |
| `Registry#additional_initializers` | defノードごと ×2箇所（`ScopeIndexer`） | flat_map |
| `Registry#contracts_for_path` | defごと（`MethodParameterBinder#apply_protocol_contract`） | flat_map + 全contract fnmatch |
| `MethodDispatcher#plugin_owns_receiver?` | user-class fallbackに届いたdispatchごと | 全プラグイン × owns_receivers × `class_ordering` |

すべてContributionIndexと同様の「構築時1回の前計算」に置き換え可能
（Set化・union凍結・per-path / per-classメモ）。クラスグラフはrun中不変なので
`(class_name, constraint) → bool`のメモ化は健全。

### 5. node_ruleのAST walkがプラグインごと

`Plugin::Base#node_rule_diagnostics`は各プラグインが自分用に
`Source::NodeWalker.each_with_ancestors`をフル実行する。node_ruleを持つプラグインが
N個あればファイルごとN回の全ノード走査。加えて`NodeContext`が
**マッチするルールごと**に割り当てられる（ノードごと1回で足りる）。
ADR-37の「エンジンがwalkを所有する」原則はper-plugin単位でしか実現されておらず、
エンジンが**ファイルごと1回**のwalkに全プラグインのルールを
`node_type → [(plugin, rule)]`でマージ消費する形が自然な完成形。

### 6. `MacroBlockSelfType`の線形照合

ブロック付きコールサイトごとに 全プラグイン × `block_as_methods`を線形照合
（`lib/rigor/inference/macro_block_self_type.rb`）。verb（メソッド名Symbol）で
Hash引きできる形をしている。

### 補遺（小粒）

- `Environment#class_ordering`の`normalize_class_name`は`delete_prefix`で毎回
  文字列を新規割り当てする（prefixが無くても）。
- runnerの`plugin_emitted_diagnostics`は全プラグインに`diagnostics_for_file`を
  毎ファイル呼ぶが、デフォルト実装（`[]`）かどうかは構築時に判別できる
  （ContributionIndexの`flow_overridden?`と同じ`Method#owner`判定）。

## 提案 — 3段階

### 短期: Registry構築時前計算の徹底（機械的、診断不変が自明）

所見3・4・6・補遺をContributionIndexの拡張（ないし後継の単一テーブル）として実装:
type_specifier / dynamic_return（methods: 付き） / block_as_methodsのメソッド名逆引き
Hash、open_receiversのSet化、additional_initializers / owns_receiversのunion
凍結、contracts_for_pathのper-pathメモ、`(class, constraint)`祖先判定メモ、
NodeContextのノードごと1回割り当て。ADR-44と同種の純アロケーション削減でFPリスクなし。

### 中期: DSL語彙の拡張 → レガシーフック廃止（本丸、要ADR）

所見1の右列3語彙 — (a) run時解決receiver集合（callable）、（b）メソッド名のみ
ゲート、（c）per-file名前集合フック — を`dynamic_return` / `type_specifier`系DSLに
追加し、5プラグインを移行。完了後`flow_contribution_for`をdeprecate。
正式リリース前（ADR-50のfreezeはv1.0）なのでBC制約はない。
PHPStanの`DynamicMethodReturnTypeExtension`（クラス名キーのregistry）と同型の着地。

### 長期: コンパイル済み貢献テーブルへの一本化

宣言化された全貢献をrun開始時に1つの凍結ディスパッチテーブルにコンパイルし、
エンジンのホットサイトは「手元の値（メソッド名Symbol / receiverクラス名）でHashを
引くだけ」にする。所見2の二重問い合わせもテーブル経由でper-call-node 1回の収集に
統合。凍結テーブルはRactor-shareableなのでADR-15 Phase 4のBlueprint再構築コスト
低減にも効く。

## 検証プロトコル

各段階とも既存手法で測る: stackprof（throwaway GEM_HOME）+ allocカウントを
Mastodon `app/models`（6プラグイン）/ GitLab構成サブセット（11プラグイン）で取得し、
**診断byte-identical**を合格条件にする。cwd=target + 当該プロジェクトの
`.rigor.yml`で実行（cwd=rigorだとplugin相対パス探索が壊れる —
[Mastodonノート](../20260604-mastodon-allocation-profile/)の方法論）。

## Follow-up

- この監査を入力としてADR（プラグイン貢献の宣言化完遂 + 単一ディスパッチテーブル）を
  起票する。
