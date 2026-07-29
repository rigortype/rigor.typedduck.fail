---
title: "`rigor check lib`のアロケーション帰属 —— その32.4Mは実際どこにあるのか"
description: "rigortype/rigor docs/notes/20260725-check-allocation-attribution.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260725-check-allocation-attribution.md"
sourcePath: "docs/notes/20260725-check-allocation-attribution.md"
sourceSha: "d57e4111cce08857d1715f6c894c3b8e6153e47a42597f0ea8d587696cf0a2a2"
sourceCommit: "42402864a316beb0d5ba4357ec29454ab55f6657"
translationStatus: "translated"
sidebar:
  order: 20266725
---

Status: 計測ノート。設計上のコミットメントはなし。観測は`master` @ `4c6b5912`（v0.3.0後）、macOS arm64、Ruby 4.0.5、`RIGOR_DISABLE_YJIT=1`、2026-07-25に対して取得。[#207](https://github.com/rigortype/rigor/issues/207)のフォローアップ。

## なぜ

[#207](https://github.com/rigortype/rigor/issues/207)は、5つの[#101](https://github.com/rigortype/rigor/pull/101)診断ルールが単独のASTウォークとして走っており、それらを共有の`RuleWalk`に畳み込めばv0.3.0のアロケーション（allocation）ドリフト（`lib`セルフチェック22.24M → 32.40M、+45.7%）の一部を取り戻せる、という前提で立てられた。その前提は誤りだった: 5つのうち4つはすでに`RuleWalk`にホストされており、そうでなかった唯一のルール（`static.value-use.void`、[#210](https://github.com/rigortype/rigor/pull/210)）を畳み込んでも得られたのは−158k（−0.49%）だった。走査共有のレバーは尽きている。

本ノートは、それに取って代わった問いに答える: **`make bench-perf`が計測する32.4Mのアロケーションのうち、どのコードがそれらをアロケートしているのか？**

## 方法

単位は、インプロセスの`rigor check --no-cache --no-stats --format json lib`にわたる`GC.stat(:total_allocated_objects)`であり、つまり`tool/bench.rb`が計測するものそのものだ。`parallel.workers`はデフォルトで`0`なので、実行は1つのプロセス内で逐次的に進み、親のカウンタがすべてを見る —— forkの子プロセスによる計上の抜けはない。

3つの独立した計器（instrument）で、いずれも**`lib/`の外**にある（スクラッチスクリプトからの`Module#prepend`;ツリー内は何も編集していない）:

1. **排他的なフェーズ計上**。パイプラインの領域をラップし、各領域にその自身のアロケーションからネストした計装済み領域のアロケーションを差し引いた分を計上する。再帰的なフェーズ（`propagate`、`walk_class_ivars`）は最外周のみの再入ガードを持ち、それがないと再帰レベルごとに一度ずつ二重計上してしまう。
2. **アロケーションサイトの全数調査（census）**。スコープされたウィンドウにわたる`GC.disable`付きの`ObjectSpace.trace_object_allocations`。これにより、ウィンドウ内でアロケートされたすべてのオブジェクトがカウントされるまで生き残り、通常の「生存オブジェクトしか見えない」というバイアスが取り除かれる。`file:line`ごと、アロケートしたメソッドごと、クラスごとに集計する。
3. **プロセス全体のA/B**。1つのコンポーネントを抑制し、*まるごと*の未改変ベンチマークを再実行して、アロケーションと診断を差分する。

### 計器の検証

プローブ（probe）は計測対象を乱してはならず、かつシグナルを報告できなければならない:

- `GC.stat(:total_allocated_objects)`はアロケーションフリーだ: 10万回の呼び出しで2オブジェクトしかかからない。プローブは並列なスカラースタック（フレームオブジェクトなし）、凍結された`String`ラベル、`Integer`のアキュムレータ、そしてノードごとのパス上の固定アリティ（arity）のラッパーを使う —— そこで`*args`スプラットを使えば、訪問したノードごとに1つの`Array`が増えていただろう。
- **中立性**: 非計装の実行は32,433,047;完全に計装した実行は32,275,907（−0.49%、実行間のばらつきの範囲内）。プローブは自身のコストを上乗せしていない。
- **感度**: コレクターごとのプローブは、～ゼロと報告するコレクターに対しても発火する（`DuplicateHashKeyCollector`は2,344回の訪問 → 8,122アロケーション;`ReturnInEnsureCollector`は318回の訪問 → 14）。ここでのゼロは計測されたゼロであって、一度も走らなかったプローブではない。
- **独立した計器どうしの一致**が、荷重を支える検証だ。きめ細かいフェーズプローブは2回目のスタブパスを**7,842,517**と算出した;それとコードを共有しないプロセス全体のA/Bは、同じコンポーネントを**7,839,4xx**と算出した —— 0.04%の食い違いだ。設計の異なる2つの計器が収束することこそが、見出しの数字を裏付ける。

以下の各行は、**その行自身の計装済み実行の合計に対する**パーセンテージだ。各実行はそれぞれ別々だからだ（合計はプローブの重さに応じて32.28M–33.35Mの範囲だった）。絶対値は行をまたいで加算できない;パーセンテージなら加算できる。

## 結果

**1つのファイル、`lib/rigor/analysis/baseline.rb`が、実行の32.4Mのアロケーションのうち18.03M —— 55.8% —— を計上されている**。ファイルごとのコストは残酷なまでに偏っている: 平均90,133、中央値11,927で、343行の`baseline.rb`は中央値の1,500×だ。

これは`baseline.rb`の責任ではない。このコストは**一度きりの遅延ビルド**であり、それを最初に強制したファイルに計上されるだけだ。`baseline.rb`は単に`rigor check lib`が最初に解析するファイル（`lib/rigor/analysis/`配下でアルファベット順の先頭）にすぎない。

スケーリングテスト —— 1ファイル、それぞれivar書き込みコンストラクタを持つN個のクラス:

| クラス数 | アロケーション |
| --- | --- |
| 0 | 200,718 |
| 1 | 17,999,642 |
| 2 | 18,000,089 |
| 5 | 18,001,189 |
| 20 | 18,006,652 |
| 100 | 18,035,854 |

クラスあたりの限界コストは≈**360**。最初のクラスは**17.8M**かかる。*空の*クラス本体を持つファイルは200,922かかる —— トリガーはクラス本体の中に何かを型付けすることであり、それが`RbsLoader#instance_definition` → `#build_env`を強制する。

### 17.8Mの正体

最小の1クラスフィクスチャにわたるアロケーションサイトの全数調査（18.0Mのオブジェクトのうち14.5Mが列挙可能、80.8% —— 制限事項を参照）:

| サイト | オブジェクト数 |
| --- | --- |
| `rbs-4.0.3/lib/rbs/substitution.rb:25` | 3,196,786 |
| `rbs-4.0.3/lib/rbs/ast/type_param.rb:119` | 3,145,904 |
| `rbs-4.0.3/lib/rbs/substitution.rb:13` | 1,595,358 |
| `rbs-4.0.3/lib/rbs/substitution.rb:27` | 1,590,733 |
| `rbs-4.0.3/lib/rbs/types.rb:173` | 1,582,197 |
| `rbs-4.0.3/lib/rbs/parser_aux.rb:31` (`_parse_signature`) | 923,414 |
| `rbs-4.0.3/lib/rbs/definition_builder.rb:349` | 211,650 |

クラス別: `Array` 6.32M、`Hash` 3.52M、`Enumerator` 1.65M、`RBS::Substitution` 1.60M。これはRBS自身の`DefinitionBuilder`がジェネリックな型パラメータの置換（`Substitution.build`の`vars.zip(types).to_h`）を行っているのであって、Rigorのコードではない。

Rigor側のトリガーは単一の呼び出しサイト —— `Environment::RbsLoader.build_env_for` → `.stub_missing_referenced_types`（`lib/rigor/environment/rbs_loader.rb:158`）、[ADR-5](../../adr/5-robustness-principle/)のロバストネスの第2ティアだ。これは、**使い捨ての`RBS::DefinitionBuilder`で、プロジェクトのすべてのクラスをインスタンス側とシングルトン側の両方でビルドし**、送出された`NoTypeFoundError`から欠落した名前を読み取り、空のスタブを追記し、不動点までループする（`MAX_STUB_PASSES = 5`）ことで、参照されているが宣言されていない型を検出する。

このリポジトリでのパスごと:

| パス | ビルドしたプロジェクトの`class_decls` | 発見した欠落型 | アロケーション |
| --- | --- | --- | --- |
| 1 | 1,915 | 1 (`Inference::VoidOrigin`) | 7,833,818 |
| 2 | 1,917 | 0 | 7,842,517 |
| | | **合計** | **15,676,335**（一度きりのバーストの87.3%） |

パス2は1,917個すべてのクラスをゼロから再ビルドして、何も発見しない。それが存在するのは、パス1が何かを発見したからにすぎない。

## 帰属テーブル

各計装済み実行の自身の合計（≈32.4M）に対するパーセンテージ。

| 領域 | 割合 | 備考 |
| --- | --- | --- |
| **一度きりのRBS環境ビルド** | **54.2%** | クラス本体を持つ最初のファイルに計上される |
| — `stub_missing_referenced_types`パス1 | 24.2% | ADR-5のティア2検出そのもの |
| — `stub_missing_referenced_types`パス2 | 24.2% | 確認用;何も見つけない |
| — `build_env`の残り | 6.6% | RBSシグネチャのパース、`resolve_type_names`、名前空間の合成 |
| **ファイルごとの型付け —— `StatementEvaluator`** | **29.1%** | 実際の推論作業、346ファイル |
| `MainPassCollector#visit` | 5.0% | メインパスの全ルール、`call.raise-non-exception`を含む |
| `analyze_file`の外 | 3.4% | CLI、設定、プロジェクトスキャン、出力 |
| その他の`ScopeIndexer`の事前パス | 2.5% | ivar / cvar / グローバル / 定数 / メソッドのインデックス、最初以外の全ファイル |
| `RuleWalk`の走査そのもの | 2.0% | 共有のDFS、ディスパッチ、`Context`の下降 |
| `ScopeIndexer#propagate` | 1.8% | |
| Prismのパース | 1.2% | |
| #101以前のコレクター | 0.62% | always-truthy 0.41%、ivar-write 0.10%、void-value-use 0.07%、dead-assignment 0.04%、unreachable-clause 0.001% |
| **#101のルール** | **0.23%** | 下記参照 |
| `filter_suppressed` + self-undefined + explain | 0.08% | |

### #101のルール、項目別

[#207](https://github.com/rigortype/rigor/issues/207)が答えるために立てられた問い:

| ルール | アロケーション | 割合 |
| --- | --- | --- |
| `suppression.*`（コメントスキャン + マーカー診断） | 65,673 | 0.20% |
| `flow.duplicate-hash-key`（2,344回の訪問 + ビルダー） | 8,470 | 0.026% |
| `flow.shadowed-rescue-clause`（318回の訪問 + ビルダー） | 1,666 | 0.005% |
| `flow.return-in-ensure`（318回の訪問 + ビルダー） | 362 | 0.001% |
| `call.raise-non-exception` | — | `MainPassCollector`の内側、分離せず |
| **合計（測定可能分）** | **76,171** | **0.24%** |

5つの#101ルールのコストは、ベンチマークのおよそ4分の1パーセントだ。それらがどうホストされ走査されるかは、この桁では何も問題になりえない。これは、真に単独だった唯一のウォークを畳み込んだ[#210](https://github.com/rigortype/rigor/pull/210)の−0.49%と一致し、それを独立に裏付ける。

## これが示さないこと

- **これはv0.3.0のドリフトを帰属させるものではない**。22.24M → 32.40Mの上昇は2つのツリーの比較であり、このセッションはgitチェックアウトを伴わない計測のみだったので、ドリフト前のツリーに対するA/Bは実行していない。示されているのは*現在の*構成だ。1つの否定的なデータ: `stub_missing_referenced_types`は2026-06-01（`15845436`）に着地しており、22.24Mのベースライン（baseline）が2026-07-15（`8ed9f756`）に較正されるよりずっと前なので、このメカニズムは新しくない。その*コスト*はプロジェクトのRBSサーフェス（surface、この場合1,915個の`class_decls`）に応じてスケールし、そのサーフェスが約54回のマージにわたって増大したかどうかは**測定していない**。本ノートを、ドリフトがスタブスキャンだと言っているものとして読まないこと。
- **アロケーションサイトの全数調査は標本であって全数調査ではない**。`ObjectSpace.each_object`は`total_allocated_objects`の差分の80.8%（1クラスフィクスチャ）から85.5%（実行の中間ウィンドウ）に届く;残りは`each_object`が列挙しないVM内部の（`T_IMEMO`、`T_NODE`）スロットだ。サイトレベルの順位は信頼できる;サイトレベルの絶対数は下限だ。**フェーズレベルの`GC.stat`の数値にはそのようなギャップはない** —— 上記のすべての見出し数字は、全数調査ではなくそれらから来ている。
- **`call.raise-non-exception`は分離されていない**。これは`MainPassCollector#visit`の`case`の中で走るので、そのコストはその行の5.0%に畳み込まれている。コレクターごとの継ぎ目より下では、プローブは分解しない。
- **あるルールが誘発する型クエリは、そのルールに計上される**。これは「それを無効化したら何が節約できるか」に対する正しい答えだが、ルール自身のアロケーションと、それが強制する型付けとが分離されていないことを意味する。
- **`analyze_file`の外の3.4%**は、内訳に分けずバケットとして測定した。
- **実行間のばらつき**。計装済みの合計は、プローブの重さに応じて32.28M–33.35Mの範囲だった。割合は≈±2ポイントの精度;2つの大きなコンポーネントは、0.04%まで一致する独立した計器によって固定された。

## レバーがありそうな場所

実際の未改変の`rigor check --no-cache lib`上で、`unresolved_referenced_types`をパス2以降で抑制した状態で、エンドツーエンドに測定した。各条件2回ずつ:

| | アロケーション | 実時間 | 診断 |
| --- | --- | --- | --- |
| 未改変 | 32,419,273 / 32,419,278 | 9.64s / 9.53s | 1 |
| パス≥2を抑制 | 24,579,881 / 24,579,823 | 8.73s / 8.73s | 1 |
| **差分** | **−7,839,400（−24.2%）** | **−0.85s（−9%）** | **バイト単位で同一** |

診断出力をシリアライズしたJSONとして比較: 同一で、`rbs.coverage.missing-gem`の行が1つだけ。

これが測定されたヘッドルーム（headroom）であり、2つの候補となる方向の上限を与える —— どちらもそれ自体は測定していない:

1. **パスN > 1を、パスN−1で失敗したクラスに絞る**。新しいスタブはより深い参照を露呈させうるので、一般には2回目のパスが必要だ —— ただし1,917個すべてではなく、以前にビルドが送出したクラスに対してのみ。上記の−7.84Mはパス2を*まるごと*スキップした場合のヘッドルームだ;正しく絞ったパス2のコストは測定していないので、回収可能な割合はそれより下のどこか、おそらくその大部分だ。
2. **`Inference::VoidOrigin`をRigor自身の`sig/`で宣言する**。`sig/rigor/scope.rbs:14`と`:43`は`Inference::VoidOrigin`を参照しているが、`sig/`の中でそれを宣言しているものは何もない。この単一のぶら下がり参照こそが、パス1を空でなくする*唯一の*要因であり、したがってパス2が走る唯一の理由だ。それを修正すれば、このリポジトリのベンチマークは同じ−24.2%だけ下がるだろう —— しかしそれは他のどのプロジェクトにも**ゼロ**の効果しか持たないリポジトリローカルなsig修正なので、それを着地させると、Rigorを改善しないまま`bench/baseline.json`が追跡する数字を改善してしまう。もし着地させるなら、ベースラインを再較正したうえでの`sig/`への正しさ修正として着地させるべきであり、明示的にパフォーマンスの勝利として数えるべきではない。

3つ目の方向が見えているが未測定だ: パス1の7.83Mは、すべてのプロジェクトクラスの定義をビルドして**それらを捨てる**;その後アナライザーは、別のビルダーを使って`RbsLoader#instance_definition`経由でオンデマンドに再ビルドする。そのビルダーを共有することで何かが回収できるかはテストしておらず、それにヘッドルームの数字を付けるべきではない。

エビデンスが1つだけ決着させること: **ルール本体は、アロケーションのある場所ではない**。 `rigor check lib`の84%はRBS環境ビルドとファイルごとの型付けパスであり、組み込みの診断ルールをすべて合わせても6%未満だ。

## 再現

ツリーには何も残していない。計器は`Module#prepend`を使ったスクラッチスクリプトだった;ここのメソッド一覧から再作成すること:

- フェーズプローブ: `Analysis::Runner#{analyze_file, parse_source, seed_project_scope, node_rule_results_by_plugin, explain_diagnostics}`、`Inference::ScopeIndexer.{index, build_class_ivar_index, walk_class_ivars, collect_def_ivar_writes, gather_ivar_writes, propagate, …}`、`Inference::StatementEvaluator#evaluate`、`Analysis::CheckRules.{diagnose, filter_suppressed, suppression_marker_diagnostics, *_diagnostics}`、および各`CheckRules::*Collector#visit`にprependする。
- パスプローブ / A/B: `Environment::RbsLoader.unresolved_referenced_types`にprependする。
- YJITをオフに固定する（`RIGOR_DISABLE_YJIT=1`） —— それは期限で作動するので、>5秒の実行と<5秒の実行は比較できない —— そして常に`--no-cache`を渡すこと。
