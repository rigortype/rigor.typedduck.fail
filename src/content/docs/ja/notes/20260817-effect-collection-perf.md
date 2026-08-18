---
title: "エフェクト収集 —— WD13の予算がどこへ行き、何がそれを取り戻したか（#382）"
description: "rigortype/rigor docs/notes/20260817-effect-collection-perf.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260817-effect-collection-perf.md"
sourcePath: "docs/notes/20260817-effect-collection-perf.md"
sourceSha: "0a3b17e0eefc3b21239fc115eca3a31a80c8d06ccf686169013a69034455c24c"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 20266817
---

ステータス: 計測ノート、設計上のコミットメントはなし。カタログスライスの上に積んだブランチ`claude/effect-labels/05-collection-perf`のRigor 0.3.3に対して実施。[`20260817-effect-catalogue-corpus.md`](../20260817-effect-catalogue-corpus/) §WD13の予算が未決のまま残した問いに答える: 収集コストがredmine / mastodon / gitlabで実時間の+17% / +50% / +230%、プロジェクト規模に対して急激に超線形で、そのノートはプロファイリングを他の誰かの仕事と呼んでいた。

## ハーネス

カタログノートのものと同一で、再発明ではなくそこから読み直した: プロジェクト自身のコミットされた`.rigor.dist.yml`から`baseline:`を除き、3つのキーを追加——`parallel: {workers: 0}`、スクラッチの`cache.path`、そして（`+effects`列には）`effects: {}`。キャッシュディレクトリは毎回の実行前に消去されるので、**すべての計測はコールド**である。

```sh
cd ~/repo/ruby/rigor-survey/<project>
BUNDLE_GEMFILE=<rigor>/Gemfile /usr/bin/time -l bundle exec <rigor>/exe/rigor \
  check --no-ci-detect app lib --config <scratch>/<project>-check{,fx}.yml
```

調査チェックアウト: redmine `a12198ea0`、mastodon `163f96cee`、gitlab `1a15763b5119`。調査チェックアウトの中には何も書かれていない。

以下のフェーズ帰属は第2のハーネスから来る: `Propagator.propagate`・`Collector.collect_for`・`Scanner.scan`・`FileCollection#merge`を単調時計のスタンプで包んで、`Rigor::CLI.start`をプロセス内で駆動したもの。逐次なので、forkが作業を隠さない。

**実時間の列は1つのブロック内の比として読み、2つのブロックをまたいで読まないこと**。「前」と「後」は同じラップトップの別々のセッションで計測され、マシンはその間にひどくドリフトした——どちらの側にも収集のない`rigor check`単独が、mastodonで12.5秒対14.3秒、gitlabで174.5秒対231.7秒だった。各ブロックの2列は同時期なので各ブロックの比は健全だ;絶対秒数はブロックをまたいで比較可能ではない。前のブロックはカタログノートの公表した+17% / +50%を桁まで再現しており、それがハーネスが同じものだと言うものだ。

## 前——時間はどこにあったか

コールドかつ逐次。redmineとmastodonは3回の中央値;gitlabは各方向1回。

| プロジェクト | `rigor check` | 収集あり | Δ 実時間 | Δ ピークRSS |
| --- | --- | --- | --- | --- |
| redmine | 9.35秒 / 398 MB | 11.25秒 / 420 MB | **+20%** | +6% |
| mastodon | 14.27秒 / 657 MB | 21.38秒 / 703 MB | **+50%** | +7% |
| gitlab | 231.7秒 / 6.76 GB | 689.1秒 / 7.28 GB | **+197%** | +8% |

（redmineの収集する実行の1回が兄弟の10.86秒と11.25秒に対して21.28秒だった——マシン上の何か別のもので、判断ではなく中央値によって捨てられた。）

フェーズ帰属、mastodon（1,312ファイル、7,361メソッド）:

| フェーズ | 実時間 | n |
| --- | --- | --- |
| `FileCollection#merge`——実行の畳み込み | **5.077秒** | 1,312 |
| `Collector.build`（defごとの`Scanner`走査） | 0.228秒 | 1,312 |
| `Propagator.propagate` | 0.235秒 | 1 |
| `Collector.record_call` | 約0.26秒 | 492,592 |

Redmineは1サイズ下の同じ形だ: merge 1.120秒、build 0.233秒、propagate 0.151秒——約1.9秒のオーバーヘッドのうち1.50秒。**畳み込みが超線形の項のすべてであり、他はすべて線形だ**。

`Runner#effect_collection`は実行を`effect_collections.reduce(FileCollection.empty) { |merged, c| merged.merge(c) }`で畳み込んでおり、`FileCollection#merge`は値オブジェクトのマージとして書かれている: 蓄積されたすべてのテーブルを再構築し、`freeze_table`の`transform_values`をそのすべてに走らせ、**蓄積されたすべてのエッジリストを**再`uniq`し再ソートする——ファイルごとに。それはソートを内包したO（ファイル数 × メソッド数）であり、まさに観測された形だ: オーバーヘッド自体（1.90秒 / 7.11秒 / 457.3秒）は1 : 3.7 : 241で増え、メソッド数は1 : 1.8 : 16で増える。

他に超線形なものはなかった。タスクが挙げた容疑者と計測が晴らしたもの: 閉世界のオーバーライド結合はすでに実行ごとのインデックスだ;`Collector.active?`は本当に整数読み取りだ;`record_call`はサイトあたり0.5µsだ;defごとの`Scanner`走査はASTサイズに線形だ;そしてカタログノートの見出しの容疑者だったプール後の不動点は0.25秒だった。

## 何が変わったか

- **`Effects::FileCollection.merge_all`**（`lib/rigor/effects/file_collection.rb:88`）が実行を1パスで畳み込む——各キーのサマリーは一度結合され、各テーブルは一度構築されフリーズされ、エッジリストは最後に一度重複除去されソートされる。`#merge`は残り、そのコストモデルが合う2コレクションのケースのために委譲する。`Runner#effect_collection`（`lib/rigor/analysis/runner.rb:87`）がそれを呼ぶ。
- **伝播器の不動点は本物のワークリスト**（`lib/rigor/effects/propagator.rb:74`）。キーのクロージャが動くとその*呼び出し元*のクロージャしか動きえないので、各パスはテーブル全体をラウンドロビンするのではなくまさにそれらだけを再訪問する;逆隣接は一度構築される。原因は、すべてのエッジのすべての訪問で再連結され再`uniq`されるArrayではなく`Set`として不動点を通る（`:106`）。
- **エッジ解決は`(receiver class, kind, selector)`でメモ化され**、推移的サブクラスクロージャはクラス名でメモ化される（`lib/rigor/effects/propagator.rb:161`）。1つのトリプルは呼び出しサイトごとに1回問われ、`ApplicationRecord`のサブクラスの森は数千回再走査されていた。
- **`LabelSet#join`は結合が何も足さないときアロケートせずに`self`を返す**（`lib/rigor/effects/label_set.rb:84`）——結合するあらゆるループでの一般的なケースであり、収束した領域上のワークリストパスを無償にするもの。
- **`Collector.record_call`は何かを構築する前にノードがすでに記録済みかを問う**（`lib/rigor/effects/collector.rb:114`）。最初の書き込みが勝ち、`CheckRules`は同じノード上で`type_of`を再走させるので、記録呼び出しの約半分が`Data`を構築して起点ルックアップを走らせては結果を捨てていた。
- **あらゆるサイトで同じ値は一度構築される**: 構文の起点（`lib/rigor/effects/unit_scan.rb:54`）、合成された`attr_writer`サマリー（`lib/rigor/effects/scanner.rb:51`）、カタログ行の絞られていない`Entry`（`lib/rigor/effects/catalog.rb:246`）。

このどれも収集されるものを変えない。`rigor check`の診断ストリームは3プロジェクトすべてで`effects:`ありとなしでバイト同一（`cmp`;gitlabで710,800バイト）であり、それはすでに共存のゲートだったし今も成り立つ。

収集**オフ**ではここのものは何も走らず、計測はそう言っている: Rigor自身のツリー上の`exe/rigor check lib`は親コミットと診断が同一で（実時間 / RSSのレポート行だけが違う）、実行全体のアロケーション数は17,926,639 → 17,939,795へ動く——ロード時に構築されるようになった11個のフローズン値、+0.07%。その実行のピークRSSは8%高く読めるが、それはノイズ床だ: 同じバイナリを3回計測すると266〜296 MBに広がる。

## 後

| プロジェクト | `rigor check` | 収集あり | Δ 実時間 | Δ ピークRSS |
| --- | --- | --- | --- | --- |
| redmine | 8.61秒 / 384 MB | 9.08秒 / 420 MB | **+5.5%** | +9% |
| mastodon | 12.54秒 / 663 MB | 13.03秒 / 668 MB | **+3.9%** | +0.8% |
| gitlab | 174.5秒 / 8.33 GB | 178.7秒 / 8.00 GB | **+2.4%** | −4% |

Redmineとmastodonは3回の中央値;gitlabは各方向1回のコールド実行。

**オーバーヘッドは今やプロジェクト規模とともに増えるのではなく減る**。それはそれ自体超線形なベースに対してファイルごとの線形コストが持つ形だ。MastodonはWD13の≦約5%の実時間 / RSSの内側にいる。Redmineは実時間で+5.5%とわずかに外側にいる: 3つの中で最小であり、ファイルごとのスキャンは最小のベースの最大の割合なので、これは古い項の残余ではなく線形の項が見えているのだ。

RSSはノイズの多い列だ。カタログノートが警告したとおり——redmineでの*同じ*`rigor check`設定の3回の実行が371〜403 MBに広がった。8 GBに対するgitlabの−4%と663 MBに対するmastodonの+0.8%が信頼すべき数字であり、どちらもコレクション自体は安価だと言っている。

### gitlab規模での不動点

グラフは65,148メソッド、エッジを持つ47,441メソッド、解決後133,565エッジ。

| ステップ | 実時間 |
| --- | --- |
| エッジ解決（祖先関係 + 閉世界のオーバーライド結合） | 0.446秒 |
| **不動点そのもの** | **0.642秒** |
| テーブルの65,148エントリーの構築 | 0.202秒 |
| `Propagator.propagate`エンドツーエンド | 1.340秒 |

WD13は「gitlab規模で不動点≦1秒」と予算を組む。不動点は0.64秒でその内側だ;伝播ステップ全体——すべてのエッジも解決しすべての行も実体化する——は1.34秒——それが末尾に座る実行の0.7%。都合の良いほうを選ぶのではなく両方の言い方で述べる。

### アロケーション

Mastodon、プロセス内、実行全体の`GC.stat(:total_allocated_objects)`:

| | アロケーション |
| --- | --- |
| `rigor check` | 37.2 M |
| 収集あり、前 | 87.2 M |
| 収集あり、後 | 38.7 M |

収集は**+134%**のアロケーションから**+4%**へ。アロケーションバウンドなコーパス（mastodonでGC ≈ CPUの57%、`20260620-corpus-cold-warm-reprofile.md`）では、それが実時間の列の背後の数字だ。

## 残るもの

WD13が予期しつつ予算で消し去らないファイルごとの線形コスト: エフェクトスキャンはファイルごとの**別個のPrism降下**（gitlabの178.7秒のうち3.77秒、mastodonの13.0秒のうち0.24秒）であり、`ScopeIndexer`の既存の`def`走査に乗るのではなくそうしている。スキャナは記録された各呼び出し*ノード*をその囲む単位に帰属させねばならず、それをインデクサーの内側で行うと、あらゆる実行——収集オフの実行を含む——のホットパスにエフェクトの形をした関心事を置くことになるからだ。2つの走査を1つに畳むことが残る約2%であり、収集ではなくインデクサーへのWD13スコープの変更だ。
