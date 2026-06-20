---
title: "コーパス全体のコールド/ウォーム再プロファイル — 次のボトルネック分析（2026-06-20）"
description: "rigortype/rigor docs/notes/20260620-corpus-cold-warm-reprofile.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260620-corpus-cold-warm-reprofile.md"
sourcePath: "docs/notes/20260620-corpus-cold-warm-reprofile.md"
sourceSha: "9b1759b818bf208a74dcb085afd83ec8ce767e4eb50bc6168566f1f136f01318"
sourceCommit: "51a679f3ccd12f5bee48c24150401d10e978efce"
translationStatus: "translated"
sidebar:
  order: 20266620
---

**設定済みの`rigor-survey`プロジェクト28件すべて**をコールド（`--no-cache`）とウォーム（キャッシュヒット）で再プロファイルした。各プロジェクトは個別の`.rigor.dist.yml` / `.rigor.yml`設定を持つ新規プロセスで実行し、プラグインはcwd探索により自動ロードした（mastodon/redmineではRailsプラグイン、dependabot/mangrove/strapではrigor-sorbet、残りは純粋な推論）。`20260616`のフォローアップである（`constant_for_name`メモとRailsI18nのロケールアロケーション修正は取り込み済みで、これはその修正後の状況である）。

## 手法

`Rigor::CLI.start(["check", …])`をインプロセスで駆動し、**ウォールモード**のStackProfでラップした。ウォールモードはアロケーションを計測しないため、`GC.stat(:total_allocated_objects)`がクリーンで決定論的なメトリックとして残り、その間プロファイラはCPU/ウォール時間をフレームに帰属させ続ける。ウォール時間そのものはマシンノイズである（重いプロジェクトを連続実行すると、再実行時にmastodonが24.8秒→28.7秒へとスロットリングした）。**仮説を裁定するのはアロケーション差分と保持された診断件数のみである**。

## コーパスの形状

| プロジェクト | コールド秒 | コールドアロケーション | 診断 | ウォーム秒 | ウォームアロケーション | 高速化 | アロケーション↓ |
|---|--:|--:|--:|--:|--:|--:|--:|
| mastodon | 24.8 | 52.6 M | 2088 | 1.16 | 3.3 M | 21× | 16× |
| redmine | 10.5 | 22.6 M | 721 | 0.78 | 2.5 M | 13× | 9× |
| **mail** | **4.5** | **20.6 M** | 26 | **1.13** | **6.6 M** | **4×** | **3×** |
| textbringer | 3.6 | 8.4 M | 47 | 0.35 | 0.9 M | 10× | 10× |
| herb | 2.75 | 8.3 M | 11 | 0.27 | 0.6 M | 10× | 15× |
| kramdown | 1.72 | 4.2 M | 68 | 0.27 | 0.6 M | 6× | 7× |
| liquid | 1.54 | 4.5 M | 5 | 0.27 | 0.4 M | 6× | 11× |
| … 小規模ライブラリ | 0.5–0.9 | 1.5–2.9 M | — | 0.18–0.25 | 0.2–0.4 M | 3–4× | 7–8× |

ウォームの下限はおよそ0.18～0.20秒で、そのうち**55 %はRigor自身のコードのロード**（`Kernel#require_relative`/`require`）である。キャッシュは**mail**を除くすべての場所でうまく機能している。mailは明らかな外れ値で、ファイルあたりのアロケーション密度が最も高く（20.6 M / 196ファイル）、ウォームの挙動が*最悪*である（ウォームアロケーション6.6 M — mastodonの3.3 Mより多く、コーパスの7～16×に対してアロケーション削減はわずか3×にとどまる）。

## 4つのレジーム

1. **小規模ライブラリ**（rgl、erubi、oj、…）：コールドは**起動律速**である — コードの`require`が18～55 %＋RBS環境のビルド（`RBS::Parser._parse_signature`、RBSのハッシュ化、`IO.read`）＋GCが約11 %。推論は数パーセント。AOTなしでは削減不能で、RBS環境のビルドはウォームではキャッシュで緩和される。
2. **値/ASTビルダー系ライブラリ**（kramdown）：**型等価性のチャーン** — 下記参照。
3. **探索が密なライブラリ**（mail）：**ScopeIndexerのシードパス**が支配的 — 下記参照。
4. **Railsアプリ**（mastodon、redmine）：*フラット*な推論ディスパッチプロファイル（`expression_typer`＋`method_dispatcher`＋`statement_evaluator`＋`rbs_dispatch`がソース帰属で約25 %）、GCが約7 %、ディスパッチごとの`CallContext.new` / `Data#initialize`が約2.5 %（ADR-44で本質的と裁定済み）、プラグインの`resolved_dynamic_return_methods`が約1.8 %、`StructFoldSafety`が約4 %。単一の支配的なフレームは存在しない。

## 次のボトルネック：ScopeIndexerの13回ウォークのシードパス

`lib/rigor/inference/scope_indexer.rb#index`（L61）は、ファイルごとに**13回の独立した、ルート起点の、AST全体を辿る降下**を実行する — それぞれが`node.compact_child_nodes.each { recurse }`である：

`walk_class_ivars`（L253）・`walk_class_cvars`（L1268）・`walk_constant_writes`（L1354）・`walk_methods`（L1417）・`walk_def_nodes`（L1621）・`walk_singleton_def_nodes`（L1692）・`walk_class_superclasses`（L1827）・`walk_data_member_layouts`（L1868）・`walk_struct_member_layouts`（L1917）・`walk_class_includes`（L1991）・`walk_method_visibilities`（L2050）・`collect_class_decls`（L2310**かつ**L2428 — 2回）— さらに`collect_class_alias_map`（L2177）と`collect_class_method_defs`。

これはmailのコールドの約11 %であり、決定的なのは**ウォームの約50 %超**である点だ。実行結果キャッシュ（ADR-45）は*解析*をカバーするが、プロジェクトスコープの**シードはキャッシュ状態にかかわらず実行のたびに再パース・再ウォークされる**（確認済み — Prism.parseとScopeIndexerのウォークがmailのウォームプロファイルのすべてである）。これらのウォークは同じ走査の骨格を共有しており（クラス/モジュールを降下し、`qualified_prefix`を追跡し、特異クラスを処理する）、ノードごとに何を収集するかだけが異なる — すなわち、**ADR-53のトラックB**が`CheckRules`の5回のファイルごとのウォークをエンジン所有の1回の降下へと統合したのとまさに同じ形状である。

**推奨：** 13回の降下を、すべてのコレクタへディスパッチする1つの共有ビジターへ統合すること。これはコールドのシードコストと支配的なウォームコストの両方を削減し、ADR-46のインクリメンタル化（キャッシュが既に計算しているダイジェストをキーにして、ファイルごとのシード寄与をキャッシュする — 本当のウォーム修正）の自然な前段となる。ADR-53のトラックBで必須とされるシャドウラン等価性ハーネス（バイト単位で同一の診断）でゲートすること。

## 計測によって排除された2つのレッドヘリング

kramdownのプロファイルは、見出しになりそう*に見えた*：`Combinator.union`が累積で**20 %**、`Combinator.unique_members`が**18 %**、`Tuple#==` / `Array#==` / `Constant#==`が自己時間で約15 %。2つの安価な修正をプロトタイプして**計測**し、その後リバートした：

1. **`unique_members`のO（n²）の`==`スキャン → `types.uniq`**（ハッシュベース）：**バイト単位で同一**（kramdown 68 / liquid 5 / mastodon 2088 / redmine 721の診断はすべて保持された）だが、**アロケーション中立**（4,188,064対4,189,658）であった。18 %は2次的な爆発*ではない* — 小さな`n`に対する高頻度呼び出しであり、コストは本質的な構造比較にあって、`.uniq`はそれを（`eql?`経由で）依然として実行し、加えて`hash`呼び出しが入る。安全だが速くはならない。（すべてのキャリア（carrier）は確かに一貫した`eql?`＋`hash`を持つ：ValueSemanticsは両方をコード生成して`eql?`を`==`へエイリアスし、`Constant`/`Top`/`Bot`は一貫した3つ組を手書きする。`hash_shape`/`difference`に対する`def hash`のgrepヒットは`hash_erasure`/`hash_canonical_name`という名前一致であってオーバーライドではなかった — したがって`.uniq`は*正しく*、ただパフォーマンス中立なだけである。）
2. **`equal?`による同一性ファストパス**をValueSemanticsが生成した`==`と`Constant#==`に追加：これもバイト単位で同一であり、これも**アロケーション中立**であった。比較は同一性が等しいオブジェクトではなく、*別個の*構造的に等しいオブジェクト同士で行われるため、ショートサーキットがほとんど発火しない。

結論：型等価性のコストは**安価でローカルな手段では削減不能**である。唯一のレバーはグローバルな型キャリアのハッシュコンシング/インターン化（構造的に等しいキャリアが*同一の*オブジェクトとなり、`equal?`がヒットするようにする）だが — これはペイオフが不確実で、実際の偽陽性/同一性のリスクを伴う大規模なアーキテクチャ変更である。次のステップとしては**非推奨**である。

## 非ターゲット（蒸し返さないよう記録）

- **小規模ライブラリの`require`起動**（ウォーム下限55 %）：AOT/バンドリングなしでは削減不能。
- **RBSコア環境のビルド**（コールド、極小＋小規模ライブラリ）：upstreamの`rbs`の領分であり、ウォームではキャッシュで緩和される。
- **ディスパッチごとの`CallContext.new` / `Data#initialize`**（Railsで約2.5 %）：ADR-44が既に本質的と裁定済み（可変/プール化スコープは再入可能性/偽陽性を理由に却下された）。
- **プラグインの`resolved_dynamic_return_methods`**（Railsで約1.8 %）：メモ化はあり得るが、小さくRails限定である。
