---
title: "Profiling `rigor check` on Mastodon: it is allocation-bound"
description: "Imported from rigortype/rigor docs/notes/20260604-mastodon-allocation-profile.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260604-mastodon-allocation-profile.md"
sourcePath: "docs/notes/20260604-mastodon-allocation-profile.md"
sourceSha: "1416adf81363ea009ced46fe212954789175f726df6596da43093e872799da77"
sourceCommit: "1e82fa4a127682abbd0aa1b9030cabd425ed2754"
translationStatus: "translated"
sidebar:
  order: 20266604
---

*2026-06-04. プロファイリングノート — 情報提供目的、規範的ではありません。仕様が優先します。*

## 問い

大規模な実世界アプリケーションで`rigor check`は実際にどこで時間を使っているのか？
Mastodon `main`（コミット`d20d049`、2026-05-26）はサーベイコーパス最大のアンカーであり、
CPUおよびアロケーション（allocation）プロファイルとボトルネックランキングの自然な対象となる。

## セットアップ

- 対象: `rigor-survey/mastodon`、`app` + `lib` = **1,303個の`.rb`ファイル**。
- 設定: チューニング済みサーベイ用`.rigor.dist.yml`（Railsプラグイン6件、`severity_profile: lenient`）。
- 実行: `rigor check --workers 0 --no-cache` — シングルプロセス（プロファイラーが全推論を捕捉できるように。プールモードはforkしてしまうため）かつキャッシュ無効（キャッシュヒットではなく実際の推論を計測するため）。
- 結果概要: **実時間~30 s / ユーザーCPU ~28 s**、診断件数457件、ピークRSS ~220 MB。

## 方法論、および記録に値する落とし穴

バンドルに`stackprof` / `vernier`は含まれていない。
最初のパスでは`Thread.main.backtrace_locations`をサンプリングする自作サイドカースレッドを使った。
**それは嘘をついた**。 `File.read`のself-timeが38.7 %、プロジェクトプレパス（`run_project_pre_passes`）のインクルーシブが38.7 %と報告した。

純粋なRubyサンプラースレッドは、メインスレッドがGVLを*解放した*ときにしか動けない。
GVLの解放はGVL解放型IOで支配的に起きる。
そのため`File.read`を大幅に過剰サンプリングし、CPUバウンドな推論を過小サンプリングする。
確定的カウンターがこれを完全に否定した:

| 確定的に計測 | 値 |
|---|--:|
| `File.read`（全件、2,980回呼び出し、8.4 MB） | **0.08 s** |
| `Prism.parse`（全件、2,607回呼び出し、ファイルあたり2.0×） | **0.21 s** |
| プレパス: クロスファイルクラス探索 | 0.17 s |
| プレパス: クロスファイルdefインデックス | 0.34 s |
| プレパス: 合成メソッドスキャン | 0.00 s |
| **全プロジェクトプレパス** | **0.51 s（実時間の1.6 %）** |

パースとIOはノイズに過ぎない。
`run_project_pre_passes`での追加の全量パス2回分（そのコメント自体が将来のparse共有最適化として印付けている）のコストは**1.6 %**であり、39 %ではない。

実際のプロファイルは**stackprof**を使って取得した。
使い捨ての`GEM_HOME=/tmp/rigor_gems`にインストールし（Gemfileは編集しない）、`mode: :cpu`（ITIMER_PROF — CPU消費量でサンプリング、GVLバイアスなし）を使用。
`GC.stat`とクロスチェックし、`mode: :object`で帰属を確認した。

## 主要知見: アロケーションバウンド（parse/IO/computeバウンドではない）

エンジンは1,303ファイルに対して**8,780万オブジェクトをアロケーション**する — **ファイルあたり~67,000オブジェクト**。
推論のホットループではなく、メモリサブシステムがCPUを支配している。

stackprof `:cpu` self-time、上位フレーム:

| self % | フレーム |
|--:|---|
| **49.6 %** | `(sweeping)` |
| **5.9 %** | `(marking)` |
| 1.2 % | `(garbage collection)` |
| 1.5 % | `MethodDispatcher.dispatch_precise_tiers` |
| 1.4 % | `CallContext.build` |
| 1.2 % | `Scope#rebuild` |
| 0.9 % | `Scope#initialize` |
| 0.9 % | `ExpressionTyper#type_of` |

GCのCPUサンプルは**≈57 %**を占める。
Rigorのロジックで1.5 %を超えるものはない: 推論コストは`expression_typer`（5.3 %）、`scope`（3.7 %）、`method_dispatcher`（3.5 %）、`statement_evaluator`（2.4 %）に薄く分散している。
**最適化すべきホットループは存在しない — 削減すべきアロケーション量がある**。

### 57 %（stackprof）と9.7 %（GC.stat）の整合

`GC.stat[:time]`は離散的なstop-the-world GCポーズとして**2.93 s（実時間の9.7 %）**しか報告しない（248回実行、8回メジャー）。
これは矛盾ではない: Rubyの**遅延インクリメンタルスウィープ**は*すべてのアロケーション*で少しずつ実行され、GCポーズとしてカウントされるのではなくアロケーションパスに融合している。
stackprofは`gc_sweep_step`内のIPを常に捕捉する。クロックはそれをアロケーションに帰属させる。
どちらの数値も正しく、異なるものを計測している。

決定的なテスト: 大きめのヒープで再実行（`RUBY_GC_HEAP_INIT_SLOTS=4M`、`MALLOC_LIMIT*`を引き上げ）しても**改善はゼロ**（30.22 s → 29.49 s、ノイズの範囲内）で、ポーズが減るどころかGC実行回数は*増えた*。
コストはアロケーションの**頻度**ではなく**量**に比例する。
GCチューニングはレバーではない。アロケーションを減らすことがレバーだ。

## アロケーション帰属（stackprof `:object`）

サンプリングされたアロケーション1,755,722件 × インターバル50 ≈ 8,780万（`GC.stat`と一致）。
上位のself-allocation箇所:

| alloc % | 箇所 |
|--:|---|
| **10.9 %** | `String#split`（全体1位） |
| **9.8 %** | **`ExpressionTyper#resolve_ancestor_class_name`**（Rigor内最上位） |
| 4.1 % | `Array#join` |
| 3.9 % | `Array#[]` |
| 3.4 % | `RBS::TypeName.parse` |
| 3.0 % | `Scope#rebuild` |
| 2.8 % | `Hash#keys` |
| 2.7 % | `Data#initialize` |
| 2.5 % | `String#rpartition` |
| 2.1 % + 2.1 % | `CallContext.new` + `CallContext.build` |
| 1.8 % | `String#delete_prefix` |

ファイル別: `expression_typer.rb` 14.2 %、`scope.rb` 7.8 %、
`prism/node.rb` 5.9 %、`rbs/type_name.rb` 3.7 %、`combinator.rb` 3.4 %。

### 1位/2位クラスターの根本原因: 修飾名文字列のチャーン

`ExpressionTyper#resolve_ancestor_class_name`
（[`expression_typer.rb:1400`](../../lib/rigor/inference/expression_typer.rb)）:

```ruby
def resolve_ancestor_class_name(subclass_qualified, raw_superclass)
  segments = subclass_qualified.split("::")
  (segments.length - 1).downto(0) do |i|
    candidate = (segments[0, i] + [raw_superclass]).join("::")
    return candidate if known_user_class?(candidate)
  end
  nil
end
```

呼び出しのたびに修飾定数名を`split`して再`join`する。
これは`enqueue_ancestors` → `resolve_user_def_through_ancestors`によって駆動される。
つまり、祖先BFS探索中の**メソッド呼び出し箇所のディスパッチ（dispatch）ごとに1回**呼び出される。
しかし、探索する入力（`discovered_superclasses`、`discovered_includes`、`discovered_def_nodes`）は**実行中ずっとプロジェクト全体で凍結**されている（`run_project_pre_passes`で一度だけ構築）。
同じ`(subclass, raw_superclass)`ペアと同じ`(class, method)`の解決が何千回も再計算される。
文字列ファミリー（`split` 10.9 %、`join` 4.1 %、`rpartition` 2.5 %、`delete_prefix` 1.8 %、`RBS::TypeName.parse` 3.4 %）は主にこのパスと繰り返しの型名再パースによるものだ。

二次的なクラスターは構造的なものだ: `Scope`はナローイング/バインディング変更のたびに全体を`rebuild`するイミュータブルな~20フィールドの値オブジェクトであり（アロケーション3.0 %）、`CallContext`はディスパッチごとに構築される`Data`だ（アロケーション4.2 %）。

## ボトルネックランキングと推奨事項

1. **祖先/名前解決をメモ化する** —
   凍結されたプロジェクトインデックスをキーとして、`resolve_ancestor_class_name`と`resolve_user_def_through_ancestors`をメモ化（memoise）する。
   イミュータブルな状態の純粋関数であり、**振る舞いの変更なし**。
   かつ、単一最大の修正可能なアロケーター（全アロケーションの~10–15 %）を標的にする。
   レバレッジ最大、リスク最小。**→ 着地済み。以下の「着地済み」節参照（アロケーション−27 %、実時間−9 %、診断はバイト単位で同一）**。
2. **`RBS::TypeName.parse` / `RbsLoader#parse_type_name`の結果をインターン化する**
   — 同じ型名文字列が繰り返しパースされる（3.4 % + 0.9 %）。
   **→ 着地済み。「着地済み」節参照（累積アロケーション−36 %）**。
3. **`Scope#rebuild` / `CallContext`のアロケーションを削減する** —
   より広範囲だが、よりアーキテクチャ的な変更（ディスパッチごとの`Data`、ナローイングのたびの全値オブジェクト再構築）。
   個々の修正は小さいが、広い影響範囲を持つ。**→ サージカルなサブ改善が着地済み（`join_bindings`、`lexical_constant_candidates`）。構造的な`Scope#rebuild` / `CallContext`の書き直しは未完了**。
4. **ユニオン型の構築** — `Type::Union`の構築が199,995件、p99のアリティ（arity）は5、最大184（≥40のユニオンが6件）。
   時間への影響は軽微だが、太いテールは精度上の問題の兆候であり、別途確認に値する。

今回の実行での`RIGOR_BUDGET_TRACE`: `recursion_guard` 150件、`ancestor_walk_limit` 0件、`hkt_fuel_exhausted` 0件 —
サイレントカットオフが時間を消費しているわけではない
（[`20260603-inference-budget-reality-survey.md`](../20260603-inference-budget-reality-survey/)参照）。

## 着地済み: 4件のアロケーション削減（推奨事項1、2、サージカルな3）

4件の変更が着地した。いずれも診断結果をバイト単位で同一に保つ:

- **推奨1 — 祖先/名前解決**。 `resolve_user_def_through_ancestors`と`resolve_ancestor_class_name`は、凍結されたプロジェクトインデックス三つ組の*同一性*をキーとするランスコープのメモを共有する
  （`compare_by_identity`の入れ子ストアを`Thread.current`に保持し、BFS結果と各`(subclass, raw_superclass)`解決をキャッシュ）。
- **推奨2 — RBS型名パース**。 `RbsLoader#parse_type_name`がローダーごとの`@state`ストアで`RBS::TypeName.parse`をメモ化する。
  パースは正規化された文字列の確定的な関数であり、共有安全な凍結値オブジェクトを返す。同じ少数のクラス名がほぼ全ディスパッチでパースされる。
- **推奨3a — 制御フロージョイン**。 `Scope#join_bindings`（全分岐マージで実行、`Hash#keys`アロケーションの75 %）で、`left.keys & right.keys`（キー配列2本と積集合）を、`left.each` / `right.key?`プローブで結果ハッシュを1パスで構築する方式に置換した（同一順序で同一キー）。
- **推奨3b — 字句定数候補**。 `lexical_constant_candidates`（プロファイルされた`String#rpartition`の唯一の呼び出し元）で、`prefix.rpartition("::").first`（ネストレベルごとに使い捨ての3要素配列＋余分な部分文字列）を`rindex`＋単一スライスに置換した。

同一対象での累積結果（Mastodon `app`+`lib`、1,303ファイル）:

| メトリクス | ベースライン | +推奨1 | +推奨2 | +推奨3a/3b | Δ合計 |
|---|--:|--:|--:|--:|--:|
| アロケーション済みオブジェクト数 | 87.8 M | 64.0 M | 56.1 M | **51.3 M** | **−42 %** |
| オブジェクト数/ファイル | 67,370 | 49,093 | 43,078 | **39,358** | −42 % |
| 実時間 | ~30.2 s | ~27.4 s | ~26.5 s | **~26.1 s** | −14 % |
| `GC.stat[:time]` | 2.93 s | 2.19 s | 2.08 s | **2.01 s** | −31 % |
| GC実行回数 | 248 | 165 | 126 | **127** | −49 % |
| 診断件数 | 457 / 419件エラー | identical | identical | **identical** | byte-identical |

`resolve_ancestor_class_name`（アロケーションの9.8 %だったもの）、
`RBS::TypeName.parse`（4.7 %）、`String#rpartition`（3.9 %）はプロファイルから消えた。
`Hash#keys`は4.4 %からわずかな割合に低下した。
`make verify`は各ステップ後にグリーン（例5,418件、セルフチェック＋プラグイン契約チェックがクリーン）。
残るのは構造的なコアだ — `Scope#rebuild`（4.8 %。`with_*`のたびに再構築されるイミュータブルな~20フィールドの値オブジェクト）と`CallContext` / `Data`（合計~10 %。ディスパッチごとに1つの`Data`）。
これらは推奨3のアーキテクチャ的な半分であり、専用の変更に委ねられている。
ローカルな書き直しではなく、設計上の判断（ミュータブルなスクラッチスコープ、またはより軽量なコールコンテキストキャリア）が必要だ。

## ランタイム特性: プラグインとキャッシュ

フォローアップの実時間マトリクスは、同一対象でプラグインのON/OFFとキャッシュのコールド/ウォームという2つの運用変数を分離した
（こちらはわずかに後のMastodonチェックアウト`fe885d57`で、引き続き1,303ファイル。診断件数は上記`d20d049`実行と異なるが、以下の全セルは*同一*チェックアウトを使用しているため比較は内部的に有効）。
4件のアロケーション削減後、`--workers 0`で実行。

| | プラグインON（6件） | プラグインOFF |
|---|--:|--:|
| コールド（キャッシュ構築＋書き込み） | 37.9 s | 29.7 s |
| ウォーム1回目 | 35.2 s | 28.0 s |
| ウォーム2回目 | 35.7 s | 28.1 s |
| `--no-cache` | 35.2 s | 27.4 s |
| 診断件数 | **85** | **422** |

**プラグインは精度と速度のトレードオフで、~+7.5 s（~27 %）**。 6件のRailsプラグインはノードルール、`dynamic_return`、1,303ファイル全体に適用される追加RBSにより実時間~7.5 sを加算し、その代わり**337件のRails-DSL偽陽性を抑制**する（422 → 85件）。
プロジェクトの偽陽性の規律と整合している: そのコストは、追加の発見ではなく有効なRailsコードでの正確性を買う。

**キャッシュはここでは*軽微な*レバーであり、~2–3 s（~6–7 %）**。コールド→ウォームで節約できるのは~2.7 s（ON）/ ~1.7 s（OFF）のみ。`--no-cache` ≈ ウォームだ。
理由は構造的だ: 永続キャッシュが保存するのは**RBS環境＋プラグインルックアップテーブル**（実行ごとに1回構築）であり、**ファイルごとの解析結果ではない**。
そのためウォーム実行でもファイルごとの全推論 — 支配的な~28–35 s — を再実行し、キャッシュは1回限りのRBS/プラグイン構築を除去するだけだ。
これはCPUプロファイルを裏付ける: ホットパスはファイルごとの推論（上記で削減したアロケーションバウンドの作業）であり、RBS環境の構築やIOではない。
キャッシュはコールド/CI全量スキャンで最も効果を発揮し、ウォーム再実行ではほぼ効かない。このターゲットの実時間はそこには存在しない。

## 再現手順

FlakeのdevシェルからRigorチェックアウト内で:

```sh
# real CPU profile (stackprof in a throwaway GEM_HOME — no Gemfile edit)
GEM_HOME=/tmp/rigor_gems gem install --no-document stackprof
env GEM_PATH=/tmp/rigor_gems:$(ruby -e 'puts Gem.path.join(":")') \
  BUNDLE_GEMFILE=$PWD/Gemfile bundle exec \
  ruby -I/tmp/rigor_gems/gems/stackprof-0.2.28/lib /tmp/rigor_stackprof.rb \
  ../rigor-survey/mastodon/app ../rigor-survey/mastodon/lib

# deterministic GC + parse/IO accounting (no profiler gem needed)
bundle exec ruby /tmp/rigor_gc.rb          ../rigor-survey/mastodon/{app,lib}
bundle exec ruby /tmp/rigor_deterministic.rb ../rigor-survey/mastodon/{app,lib}
```

ハーネススクリプト（`rigor_stackprof.rb`のobject/cpuモード、`rigor_deterministic.rb`、`rigor_gc.rb`）は使い捨てのインストルメンテーションであり、リポジトリと`Gemfile.lock`はこの作業で変更されていない。
