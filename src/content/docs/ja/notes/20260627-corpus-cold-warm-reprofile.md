---
title: "コーパスcold/warm再プロファイル — 新規ボトルネック点検（2026-06-27）"
description: "v0.2.6のADR-75/76/78/72が新規ボトルネックを持ち込んでいないかを確認するコーパス再プロファイルノート。redmineのDidYouMean::Jaro.distanceの裁定含む。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260627-corpus-cold-warm-reprofile.md"
sourcePath: "docs/notes/20260627-corpus-cold-warm-reprofile.md"
sourceSha: "fc21cb912e5abe5f0640eacb7e6e3e608d58fa850d68b49d9b9550d7f039ad9f"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
translationStatus: "translated"
sidebar:
  order: 20266627
---

Status: プロファイリングノート、spec/design上のコミットメントなし。**Rigor 0.2.6**
（`release/0.2.6`のビルド機構、master @ `23c5a990`）に対して実施。
[`20260620-corpus-cold-warm-reprofile.md`](../20260620-corpus-cold-warm-reprofile/)
の続報で、v0.2.6の機能ウィンドウ着地後に再実行した: ADR-75（`Dynamic[T]`
provenance側テーブル）、ADR-76 / ADR-78（`freeze`/`dup`/`clone`を通した
シェイプ・キャリア保全＋リフレクティブsendの過剰foldルート修正）、ADR-72
（Gemfile.lock連動のgemオーバーレイRBS）。このノートが答える問いは
**それらのいずれかが、これまでの4つのレジームになかった新規ボトルネックを
持ち込んでいないか**、である。

## 手法

`20260620`と同じハーネス。`Rigor::CLI.start(["check", …])`をin-processで
駆動し（`require`コストを1回だけ払い、warm実行がコードロードではなく解析＋
キャッシュ検証だけを切り出せるようにする）、**wall-mode** StackProfで包む。
wall-modeはアロケーションを計装しないため、`GC.stat(:total_allocated_objects)`
がクリーンで決定的なメトリクスであり続け、wall timeはマシンノイズとして扱う。
stackprofは使い捨ての`GEM_HOME`から実行する（ネイティブ拡張のABIはFlakeの
ruby 4.0.5と一致させる必要がある — 再ビルドすること、`/tmp`の古いビルドを
再利用しない）。

4レジームをまたぐ9プロジェクトを、並列サブエージェント経由でcold
（`--no-cache`）＋warm（キャッシュヒット）でプロファイルした。Railsアプリは
`app/models`のみをプロファイル対象とした（範囲を絞ったサブセットであり、
前回の完全な`app`+`lib`行と直接比較はできないが、レジームは同一）。

## コーパスの形状

| project | paths | cold s | cold allocs | warm s | warm allocs | speedup | vs 2026-06-20 |
|---|---|--:|--:|--:|--:|--:|---|
| mastodon | app/models | 4.3 | 9.34 M | 0.14 | 0.64 M | 30× | subset (regime ✓) |
| redmine | app/models | 7.2 | 13.4 M | 0.16 | 0.76 M | 45× | subset (regime ✓) |
| mail | lib | 4.1 | 18.9 M | 0.69 | 5.18 M | 6× | 4.5 s / 20.6 M → ↓ |
| kramdown | lib | 1.67 | 4.14 M | 0.07 | 0.34 M | 24× | 1.72 / 4.2 M = flat |
| liquid | lib | 1.52 | 4.43 M | 0.05 | 0.20 M | 33× | 1.54 / 4.5 M = flat |
| haml | lib | 0.88 | 2.78 M | 0.04 | 0.16 M | 25× | tiny-lib band ✓ |
| net-ssh | lib | 1.23 | 3.72 M | 0.07 | 0.34 M | 17× | tiny-lib band ✓ |
| faraday | lib | 0.65 | 2.11 M | 0.03 | 0.12 M | 24× | tiny-lib band ✓ |
| oj | lib | 0.58 | 1.64 M | 0.01 | 0.04 M | 58× | tiny-lib band ✓ |
| erubi | lib | 0.65 | 1.47 M | — | — | — | tiny-lib band ✓ |

アロケーションは、比較可能な箇所ではすべて`20260620`ベースラインに対して
**横ばいからわずかに減少**している（mail 20.6 M → 18.9 M、kramdown / liquid
はノイズの範囲内）。`bench/baseline.json`ノートはv0.2.6の機能が`lib`
自己チェックのアロケーションを**+5.3%**押し上げると記録しているが、そのコストが
このサーベイコーパスに現れないのは、これらの機能（provenance記録、シェイプ保全、
オーバーレイ）がこの対象群ではほとんど発火しないためである。

## 見出しの結果 — v0.2.6の機能による新規ボトルネックなし

**ADR-75 / 76 / 78 / 72のコードパスは10本のいずれのプロファイルにも
ホットスポットとして現れなかった**。cold・warmを問わずすべてのトップフレーム
一覧とファイル別ロールアップから、`dynamic_origins`/provenance記録、
シェイプ・キャリア保全／`freeze`/`dup`/`clone`のエフェクトモデリング、
リフレクティブsendのfoldガード、`data/gem_overlay`のロードは一貫して不在
だった。4つのレジームはそのまま健在:

1. **startup-bound**（oj / net-ssh / haml / faraday / erubi）—
   `require` + `RBS::Parser._parse_signature` + RBS環境のハッシュ構築
   （`RBS::Namespace#hash` / `TypeName#hash` / `Array#hash`）+ GC。
2. **値/AST等価性のchurn**（kramdown）— `Array#== / Constant#== / Tuple#==`
   + `Combinator.unique_members`（tot 18.5%）が依然として支配的で、
   `20260620`が診断し安価な手段では削減不能と裁定した通りである。
   - （liquidはこのレジーム内で、値等価性からRBSハッシュコンスのchurn
     ── `Array#hash / RBS::TypeName#hash / Hash#fetch` + `lib/rbs/*`
     ── 側へシフトしている。それでも古典的なRBS環境領域であり、新規コスト
     ではない。）
3. **discovery-dense seed walk**（mail）— `ScopeIndexer`のseedパス
   （`walk_methods_and_def_nodes` / `walk_method_visibilities` /
   `collect_class_decls`）はcoldでファイル別 ~22%、warmの支配的要因
   （46%）であり、まさに`20260620`の「次のボトルネック」仮説通りである。
4. **Rails flat-inference**（mastodon / redmine）— `expression_typer` /
   `method_dispatcher` / `statement_evaluator` / `rbs_dispatch` +
   dispatch単位の`CallContext.new` / `Data#initialize`（ADR-44の本質的コスト）
   + GC。

warm実行はどこでも**ScopeIndexerのseed再walk＋Prism再パース**が支配的
── ADR-45でロックされたwarmパス（キャッシュは解析をカバーするが、
ファイル単位のseed再パースはカバーしない）。真のwarm側のレバーは
`20260620`から変わらずADR-46のファイル単位インクリメンタルのままである。

## 分類外の1フレーム — redmine `DidYouMean::Jaro.distance`（cold self約6%）

前回ベースラインの内訳の外側にある唯一のフレームが、**redmine coldの
自己時間トップフレーム、`DidYouMean::Jaro.distance`（self 5.9% / tot 6.4%）**
であり、ファイル別ロールアップでは`did_you_mean/jaro_winkler.rb`が5.9%を
占める。

出典: [`lib/rigor/plugin/base.rb:776`](https://github.com/rigortype/rigor/blob/master/lib/rigor/plugin/base.rb)
── `Plugin::Base.suggest`が呼び出しのたびに新規`DidYouMean::SpellChecker.new(dictionary:)`
を構築し、`.correct`（Jaro-Winkler、O（dictionary × name））を実行して
未定義メソッド／未解決定数の診断に「did you mean …?」のヒントを構築している。

このコストは、`DidYouMean::SpellChecker#correct`（Jaro-Winkler）呼び出しに
起因するもので、Railsプラグイン群（`rigor-actionpack` / `rigor-activerecord`
/ `rigor-pundit` / …）が未解決名の診断ごとに「did you mean …?」のヒントを
構築するために実行している。`rigor-activerecord`と`rigor-rails-routes`は
`Plugin::Base.suggest`を経由し、`rigor-actionpack` / `rigor-pundit` /
`rigor-factorybot`は`SpellChecker`を直接構築するが、すでにループ内で
再利用している（つまり`.new`は償却済みで、コストは`#correct`側にある）。

裁定:
- **v0.2.6のリグレッションではない**。このヒントパスはADR-75/76/78の
  ウィンドウより前から存在する。`20260620`のredmine行に現れなかったのは、
  あのプロファイルがredmineを集約値（10.5 s / 22.6 M）として報告し、
  フレーム別内訳を出していなかったからにすぎない。
- **診断1件あたりの本質的コストであり、メモ化では対処不能** ── 検証済み。
  仮説: 同じ未解決名が同じ辞書に対して繰り返し出現するはずなので、
  `Plugin::Base.suggest`を`(name, dictionary)`でメモ化して結果を再利用する。
  実装したところ（byte-identical: redmineの26診断は変化なし、`make check`
  + `make check-plugins`はクリーン、`base_spec` 70/70）**再プロファイルの
  結果は変化ゼロ**だった── Jaroは6.3% selfのまま、アロケーションも同一
  （13.384 M → 13.383 M）。redmineの`app/models`では`(name, dictionary)`
  の組がほぼすべて**別個**（未知のカラムはモデルごとに辞書が異なる）なので、
  メモ化がヒットすることがない。この約6%は`診断件数 × 辞書サイズ`の
  Jaro計算が、別個のクエリごとに1回ずつ発生するという本質的なコストであり、
  出力されるヒントの内容を変えない限り削減不能である（Jaroの前に
  長さ／先頭文字での事前フィルタを挟むのが唯一のレバーだが、DidYouMean自体が
  すでに内部でそれを適用している）。この投機的メモ化は**revert済み**
  ── 未計測のパフォーマンス変更はこのリポジトリの計測ゲート規則の下では
  居場所がない。
- **プロジェクト固有**。redmineに集中するのは、大規模なモデル／カラムの
  辞書に対して未解決名の診断を多数発するためで、診断件数の少ないlibでは
  ほぼ不可視である。mastodonの`inspect_runtime_string`によるNameError提案の
  所見（`20260616`）と同系統だが、あちらと違い呼び出しごとの再構築アーティ
  ファクトではないため、安価な改善余地はない。

## まとめ

対応不要。v0.2.6の機能はコーパス上でプロファイル上不可視であり、
アロケーションも中立からやや好転しており、新規ボトルネックはない。
ScopeIndexerのseed warmパス（レジーム3、ADR-46）と削減不能な値等価性の
churn（レジーム2）は、`20260620`から変わらず定常的なボトルネックとして
残っている。分類外だった唯一のフレーム（redmineの
`DidYouMean::Jaro.distance`）は調査の結果、本質的コストであり安価には
削減できないと判明した ── 次のプロファイラーが再度追いかけずに済むよう
ここに記録する。
