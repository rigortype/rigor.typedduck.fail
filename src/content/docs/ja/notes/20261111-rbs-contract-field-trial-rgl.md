---
title: "`rigor-rbs-contract`フィールドトライアル: rgl 0.6.7向け新規RBSエントリー"
description: "rigortype/rigor docs/notes/20261111-rbs-contract-field-trial-rgl.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20261111-rbs-contract-field-trial-rgl.md"
sourcePath: "docs/notes/20261111-rbs-contract-field-trial-rgl.md"
sourceSha: "6097ee34cb2f79917191b374b258898a50831f59c17922b1c673b55fe1a136b6"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-11T08:01:45+09:00"
translationStatus: "translated"
sidebar:
  order: 20267111
---

ステータス: フィールドレポート、2026-11-11。#3061（ADR-131）でマージされたスキルに従い、1回のエージェント実行（Claude Opus 5.5）で、RBSがアップストリームになくコレクションエントリーも存在しないpure-RubyかつYARDドキュメント付きのgemであるrgl 0.6.7向けの新しいgem_rbs_collectionエントリーを下書きした。この実行ではpushや起票は行われていない。本ノートが動機づけるスキルの変更は本ノートとともに着地し、RigorのギャップはIssueとして起票されている。

## セットアップ

- 対象: `monora/rgl`の`d01746e`（0.6.7）のコピー。スコープはgemの約半分: グラフコア、mutable/adjacencyグラフ、エッジ、走査とビジター、`ImplicitGraph`、トポロジカルソート（topsort）、`path?`、連結成分、Dijkstra。
- Flake経由のRigor master `a74be9197`。ランタイムおよびSteep作業用には別のRuby 4.0.6からrbs 4.2.0およびsteep 2.1.0を使用。
- `bin/test`は未実行（ネットワークが必要なため）。その3つのチェックはオフラインで実行した。
- エージェント時間で約2時間。

## 結果

5ファイルに約124個の宣言と`_test/test.rb`からなるドラフトを作成した。`rbs validate`、`steep check`（エラー0件）、`steep stats`（型なし呼び出し0件）、`lib/`および`_test/`に対する`rigor check --no-baseline`（0件）、`sig-gen --diff`（`tighter_return`なし）のすべてにパスした。ただし、そのままではアップストリームに送れない: rglのイテレータは`include Stream`しており、`stream` gemにはエントリーがないためである。

| | 件数 |
| --- | ---: |
| スコープ内の`sig-gen`候補 | 126（提案52、スキップ74） |
| 出力のまま採用した提案 | 約25 |
| 判断により戻り値を`void` / `bool` / `instance`に置き換えた提案 | 13 |
| ドキュメントからより精密化した提案 | 4 |
| ドキュメントから補完したスキップ済みメソッド | 約22 |
| `sig-gen`が認識しなかったメソッド（`class_eval`生成） | 14 |
| ランタイムウィットネスのみで変更した宣言 | 0 |

静的シグナルは候補を特定したものの、決定は何も下していない。ドキュメントの精査とランタイムウィットネスがすべてを決定した: ウィットネスは2つのYARD `@return`タグ（`Graph#reverse`、`#to_undirected`）とREADMEの例（`remove_edge … #=> true`;実際には`Set`を返す）を反証し、ドキュメントに記載された`nil`（到達不能なターゲットに対するDijkstra）を裏付けた。

## トライアルから得られた知見

1. **ランタイムチェッカーには静かな盲点があるため、ウィットネスには陰性対照（negative control）が必要である**。ランタイムチェッカーは、メソッドを定義しているクラスまたはモジュール上の宣言に対してのみメソッドを検査するため、モジュールやスーパークラスから継承した宣言は、そのメソッドをオーバーライドするクラスではスキップされる: `MutableGraph`上で`-> bool`と宣言され`DirectedAdjacencyGraph`でオーバーライドされた`remove_edge`は`Set`を返したが、実行は終了コード0で終了した。rglのテストスイート（77テスト、期待された失敗1件）は`rbs/test/setup`の下で実行されたが、そのような宣言はすべて未検査のままだった。宣言ミューテーションパス（各戻り値を順番に壊して再実行し、どの実行でも検出されないものをリスト化する）によってこれらを機械的に発見した: ドラフトに対して61個のミュータントを生成し、56個がkill、5個がsurviveした — うち3個はこのスキップルール（`Graph#directed?`、`#has_vertex?`、`#has_edge?`）、1個は一度も呼ばれない`Graph#to_s`、1個はウィットネスのない`Edge::DirectedEdge#<=>`の`?`であった。このパスの初期バージョンは誤計測していた（エラー行全体を比較していたため値のノイズがkillとみなされ、`[]`メソッドやエイリアス経由の呼び出しを見落としていた）が、#3073のレビューで発見された。ADR-131 WD7。
2. **新規エントリーはコレクションへのコントリビューションとして最も一般的であるにもかかわらず、スキルにはそのためのパスがなかった**。ループが監査（audit）中心の形になっていた。「`new_method`の提案をそのまま採用する」とすると、`set_source -> 0`、`reset -> {}`、`find_shortest_paths -> nil`、`Graph#directed? -> false`（サブクラスが`true`でオーバーライドするデフォルト値）、`set_to_begin -> Hash`をコントラクトとして出荷してしまうところだった。これを禁止する`void`ルールは既存の宣言に対してのみ書かれていた。
3. **`sig-gen`は型を書くものであり、スケルトンを書くものではない**。 `include`、`attr_*`、`alias`、定数、メタプログラミングされたメソッドは出力されないため、`Graph`から`Enumerable`が欠落した。`rbs prototype runtime -r FEATURE`でスケルトンを補った;そのフラグは試行錯誤で見つけた（`-R`は`require_relative`であり、`-I`はない）が、rbs 4.2では非推奨（deprecated）とマークされている。
4. **ドキュメント自体に矛盾がある**。 `Graph#reverse`は`@return [DirectedAdjacencyGraph]`とタグ付けされている一方、本文では無向グラフの場合は`self`を返すと書かれている; `sig-gen`のユニオンが正しかった。ウィットネスがこれに決着をつけた。スキルでは現在、gemのYARDタグはオラクルではなく評価対象となるドキュメントであり、矛盾が生じた場合はウィットネスが決定すると明記している。
5. **残りは環境面の問題であった**。 `bin/test`はネットワークを前提としており、ウィットネス行はターゲットのbundle内に`rbs`があることを前提としていたため、ウィットネス用に`GEM_PATH`をエクスポートするとSteepのgem解決が壊れた;エントリーのない依存関係（`stream`）に対するルートがなく、ブロックやクラッシュするドキュメント記載のコントラクト（ブロックなしの`depth_first_search`は`NoMethodError`を送出する）に対するルールもなかった。

書かれた通りに機能した点: 早期リターンの警告は、`def.return-type-mismatch`がどの誤った宣言を見落とすかを正確に予測した;メモ化された値のトリアージ行は`GraphVisitor#color_map`にそのまま適用できた;「未解決の疑問を本体が一致する選択肢で解決してはならない」というルールは`remove_edge -> Set`コントラクトの採用を阻止した; Rubyコードが正しければウィットネスレシピは最初から一発で動作した。

## 発見されたRigorのギャップ

| ギャップ | Issue |
| --- | --- |
| 非fold対象の呼び出し先に渡されたブロック内で再束縛されたローカル変数が呼び出し後に`Dynamic[top]`として読まれるため、カウンタ風のメソッドがスキップされる | #3066 |
| `sig-gen`が`yield … if block_given?`メソッドのオプショナルブロックを落とす | #3067 |
| `sig-gen`が`block_given?`のときに`self`をyieldする`initialize`を黙って省略する | #3068 |
| `sig-gen`が特異メソッド内の`new`および`self.class.new`を`instance`ではなくレキシカルクラスとして出力する | #3069 |
| `yield`後に再読み込みされるメモ化されたivarに対する`def.return-type-mismatch`（ADR-131の設計レビューで発見され、これらとともに起票） | #3070 |
| 早期リターンが`def.return-type-mismatch`から見えない問題（`Graph#reverse`で再確認） | #3062 |

`sig-gen`が`include` / `attr` / `alias` / 定数を出力しないのは設計によるものかもしれない;スキルでは現在その旨を明記している。

## 対象外

Bellman-Ford、双方向探索（bidirectional）、二部グラフ（bipartite）、DOT、Edmonds-Karp、GraphXML、Prim、推移性（transitivity）、縮約（condensation）は未宣言のまま残した。ドラフトが依存している`stream`スタブは、エントリーとしてのレビューを行っていない。
