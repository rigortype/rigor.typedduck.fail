---
title: "エフェクトカタログ —— コーパス計測、前後（#380）"
description: "rigortype/rigor docs/notes/20260817-effect-catalogue-corpus.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260817-effect-catalogue-corpus.md"
sourcePath: "docs/notes/20260817-effect-catalogue-corpus.md"
sourceSha: "b4fba85d05ecfea2f5a94a7d3fb6bafb5524ae60dcf20751b6d94d4e6098dc59"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 20266817
---

ステータス: 計測ノート、設計上のコミットメントはなし。ブランチ`claude/effect-labels/04-catalogue`のRigor 0.3.3に対して実施。「前」はトレーサースライスのコード内シードテーブル（コミット`ae1c735d`、約30行）;「後」は`data/effects/core.yml`（80クラス）にクラスごとの姿勢と引数依存のナローイングを加えたもの。

## ハーネス

以下のすべては、Nix Flakeの中で、プロジェクトを1つずつ、これらのコマンドで生成した。各スクラッチ設定はプロジェクト自身のコミットされた`.rigor.dist.yml`から`baseline:`を除き、3つのキーを追加したもの——`effects: {}`、`parallel: {workers: 0}`（`rigor effects`は逐次なので、比較のために`rigor check`も逐次に固定）、そしてスクラッチの`cache.path`。キャッシュディレクトリは毎回の実行前に消去されるので、**以下のすべての計測はコールド**である;ウォームな`rigor check`はADR-45の結果キャッシュによって丸ごと提供され、収集する実行はそれを辞退するので、その2つを比較すると収集ではなくキャッシュを計測することになる。

```sh
# the census
cd ~/repo/ruby/rigor-survey/<project>
BUNDLE_GEMFILE=<rigor>/Gemfile bundle exec <rigor>/exe/rigor \
  effects --format json --full app lib --config <scratch>/<project>.yml

# the WD13 budget: the same analysis with and without the effects: block
BUNDLE_GEMFILE=<rigor>/Gemfile /usr/bin/time -l bundle exec <rigor>/exe/rigor \
  check --no-ci-detect app lib --config <scratch>/<project>-check.yml
BUNDLE_GEMFILE=<rigor>/Gemfile /usr/bin/time -l bundle exec <rigor>/exe/rigor \
  check --no-ci-detect app lib --config <scratch>/<project>-checkfx.yml
```

`<rigor>`は「後」ではこのworktree、「前」では`ae1c735d`のスクラッチworktreeだ。調査チェックアウト: redmine `a12198ea0`、mastodon `163f96cee`（v4.6.3）、gitlab `1a15763b5119`。調査チェックアウトの中には何も書かれていない——設定とキャッシュはその外側に住む。

## Redmine——4,029メソッド

| | 前 | 後 |
| --- | --- | --- |
| 収集されたメソッド | 4,029 | 4,029 |
| 網羅的 | 650（16.1%） | 649（16.1%） |
| 証明済みラベル1つ以上 | 1,762（43.7%） | 1,788（44.4%） |
| 証明済みラベルのインスタンス | 3,195 | **3,975**（+24.4%） |
| 異なるラベル | 12 | 18 |

| ラベル | 前 | 後 |
| --- | --- | --- |
| `mutate.self` | 1,275 | 1,275 |
| `mutate.static` | 547 | 547 |
| `mutate.local` | 456 | 456 |
| `io.fs.read` | 379 | 424 |
| `global.read` | 279 | 284 |
| `exit` | 4 | 211 |
| `io.output.stderr` | 2 | 211 |
| `mutate.instance` | 187 | 187 |
| `io.fs.write` | 0 | 95 |
| `io.process` | 13 | 91 |
| `io` | 0 | 81 |
| `nondet.time` | 45 | 50 |
| `io.net` | 0 | 25 |
| `nondet.random` | 0 | 21 |
| `global.write` | 6 | 6 |

`exit`と`io.output.stderr`が一緒に動くのは、`Kernel#abort`が今や両方を運ぶ1つの行であり、`Redmine::Configuration.load`が4つの別々の不正設定パスでそれを呼ぶからだ。それを得た207のメソッドは、コントローラーから`Redmine::Configuration[]`——初回使用時にロードする——に到達する。それが真実の読みだ: それらのリクエストは本当にプロセスをabortしうる。

| 汚染原因（それを運ぶメソッド） | 前 | 後 |
| --- | --- | --- |
| `unresolved-self-call` | 10,284 | 10,281 |
| `dynamic-receiver` | 7,183 | 7,445 |
| `unknown-ownership` | 1,031 | 1,136 |
| `dynamic-send` | 237 | 425 |
| `opaque-callable` | 81 | 122 |

## Mastodon——7,361メソッド

| | 前 | 後 |
| --- | --- | --- |
| 収集されたメソッド | 7,361 | 7,361 |
| 網羅的 | 1,308（17.8%） | 1,288（17.5%） |
| 証明済みラベル1つ以上 | 2,785（37.8%） | 2,830（38.4%） |
| 証明済みラベルのインスタンス | 4,176 | **4,543**（+8.8%） |
| 異なるラベル | 10 | 16 |

| ラベル | 前 | 後 |
| --- | --- | --- |
| `mutate.self` | 2,162 | 2,169 |
| `global.read` | 599 | 608 |
| `mutate.static` | 542 | 542 |
| `nondet.time` | 428 | 438 |
| `nondet.random` | 197 | 237 |
| `mutate.local` | 156 | 156 |
| `io.fs` | 0 | 118 |
| `io.fs.write` | 0 | 108 |
| `mutate.instance` | 50 | 50 |
| `global.write` | 0 | 43 |
| `io` | 29 | 37 |
| `io.fs.read` | 12 | 18 |
| `io.net` | 0 | 16 |
| `io.net.http` | 0 | 1 |
| `io.ipc` | 0 | 1 |

`io.fs`が118に対して`io.fs.read`が18なのは、`fs`の姿勢が行のしない仕事をしているからだ: その直接の起点は`Tempfile#close` / `#binmode` / `#unlink`、`FileUtils.rmdir` / `.remove_file`、`File#seek`、`File.umask`——カタログが個別に行にしないファイルシステム呼び出しで、方向を推測するのではなくサブシステムの親で答えられる。

| 汚染原因 | 前 | 後 |
| --- | --- | --- |
| `dynamic-receiver` | 11,011 | 11,034 |
| `unresolved-self-call` | 10,152 | 10,158 |
| `unknown-ownership` | 1,014 | 1,097 |
| `dynamic-send` | 214 | 214 |
| `opaque-callable` | 132 | 132 |

## GitLab——65,148メソッド

| | 前 | 後 |
| --- | --- | --- |
| 収集されたメソッド | 65,148 | 65,148 |
| 網羅的 | 17,314（26.6%） | 17,339（26.6%） |
| 証明済みラベル1つ以上 | 22,984（35.3%） | 23,592（36.2%） |
| 証明済みラベルのインスタンス | 46,164 | **54,518**（+18.1%） |
| 異なるラベル | 16 | 23 |

| ラベル | 前 | 後 |
| --- | --- | --- |
| `mutate.self` | 17,239 | 17,247 |
| `global.read` | 6,905 | 7,479 |
| `mutate.static` | 6,898 | 6,898 |
| `mutate.instance` | 5,920 | 5,921 |
| `io.fs.read` | 4,469 | 5,483 |
| `global.write` | 1 | 4,358 |
| `mutate.local` | 2,347 | 2,349 |
| `nondet.time` | 1,253 | 1,694 |
| `io` | 772 | 980 |
| `nondet.random` | 80 | 891 |
| `io.fs.write` | 29 | 487 |
| `io.fs` | 0 | 165 |
| `telemetry` | 0 | 161 |
| `io.output.stdout` | 144 | 144 |
| `io.output.stderr` | 51 | 64 |

`global.write`が1 → 4,358へ動くのは全数調査全体で最大の単一の動きであり、それは`Thread.current[:key] = value`がリクエストパスの大半に到達していることだ: ファイバーローカルストレージはフレームを越えて共有される状態であり、カタログの前はその書き込みはラベルではなく所有不能なレシーバー変更（`unknown-ownership`の汚染）として分類されていた。`unknown-ownership`が12,205 → 11,966へ落ちるのは同じ理由だ——行が汚染を証明済みラベルで置き換える。

| 汚染原因 | 前 | 後 |
| --- | --- | --- |
| `unresolved-self-call` | 196,367 | 196,299 |
| `dynamic-receiver` | 94,329 | 94,326 |
| `unknown-ownership` | 12,205 | 11,966 |
| `opaque-callable` | 4,208 | 4,473 |
| `dynamic-send` | 1,630 | 1,630 |

## WD13の予算

12コアのApple Siliconマシンでコールドかつ逐次;redmineとmastodonは3回の中央値、gitlabは1回の実行。対は`rigor check`と**設定に`effects: {}`を加えた同じコマンド**——収集と伝播、レポートなし——であり、それがWD13が予算を組む量だ。

| プロジェクト | `rigor check` | 収集あり | Δ 実時間 | Δ ピークRSS |
| --- | --- | --- | --- | --- |
| redmine | 8.93秒 / 372 MB | 10.42秒 / 430 MB | **+17%** | +16% |
| mastodon | 12.94秒 / 661 MB | 19.36秒 / 718 MB | **+50%** | +9% |
| gitlab | 185.0秒 / 7.78 GB | 611.2秒 / 7.88 GB | **+230%** | +1% |

**実時間は約5%の予算を大きく超えており、超過はプロジェクトの規模とともに急激に増える**。これはASTサイズに線形なファイルごとのスキャンには見えない: redmineとmastodonはメソッド数で1.8倍、収集のオーバーヘッドで3倍違い、gitlabはさらに一桁外れている。容疑者は伝播器のラウンドロビンのワークリストで、マージされたメソッドテーブル全体をソートされたキー順で不動点まで反復する——テーブルのサイズに超線形で、プールの後に一度走る。これは計測であって診断ではない;それをプロファイルするのは予算を引き受ける人の仕事だ。

*（[`20260817-effect-collection-perf.md`](../20260817-effect-collection-perf/)でフォローアップ。上の容疑者は間違っていた: 不動点は0.25秒だった。超線形の項はコレクションのファイルごとの畳み込みであり、もう消えている。）*

RSSの列はノイズを念頭に読むこと。redmineでの*同じ*`rigor check`設定の3回の実行が367〜401 MBの範囲だったので、372 MBのベースに対する+16%の差は床に近い;7.8 GBに対するgitlabの+1%が信頼すべき数字であり、それはファイルごとのコレクションが安価だと言っている——Stringのフローズンなハッシュと`LabelSet`であるその形が予測するとおりだ。

カタログ自体は無償だ。`rigor effects --format json --full`の前対後、3回中最良:

| プロジェクト | 前 | 後 |
| --- | --- | --- |
| redmine | 10.02秒 / 381 MB | 9.98秒 / 383 MB |
| mastodon | 23.20秒 / 658 MB | 23.33秒 / 642 MB |
| gitlab | 632.5秒 / 8.10 GB | 762.8秒 / 7.60 GB |

Redmineとmastodonは3回中最良;gitlabは各側1回の実行で、1回10分では2つの数字は差というより±20%のばらつきだ——そこに退行を読み込まないこと。

## 共存

`rigor check`と`effects: {}`付きの`rigor check`の診断ストリームは**3プロジェクトすべてでバイト同一**（キャプチャしたstdoutに対する`cmp`、gitlabで710,800バイト）。Rigor自身のツリー上の`exe/rigor check lib`は`ae1c735d`とこのブランチの間でバイト同一。

## 計測が見つけたもの

**プロジェクトメソッドを覆い隠す`Kernel`の行**。Redmineは`CustomField#format`を定義し、`Kernel#format`はカタログの行だ。非修飾の`format`はまずselfの祖先に対して解決されるので、実行時にはプロジェクトメソッドが勝つ——だがマッチした行がプロジェクトエッジを抑制し、17のRedmineメソッドが推移的に証明されたラベルを黙って失った。トレーサーはその30行で同じ危険を持っていた;カタログを広げることはそれを広げた。**和**を取ることで修正: 主張された暗黙的self呼び出しはそのプロジェクトエッジを保ち、姿勢の答えもそうする。プロジェクト定義に到達しないエッジはいずれにせよ伝播器によって落とされるからだ。上の`後`の列は修正後;ラベルの損失は消えている。

**和は汚染のコストを伴い、それが正直なトレードだ**。それらのエッジを保つことは呼び出し先のラベルだけでなく汚染原因も伝播させ、それがmastodonの網羅数が1,308 → 1,288へ動き、redmineの`dynamic-send`のリーチがほぼ倍増する場所だ。今や呼び出し先を知っているために「そしておそらくそれ以上」と言うサマリーは、呼び出し先を切り離していたために網羅的だったものより真実に近い。

**全数調査が捕まえた2つの誤ったラベル、どちらも姿勢が鈍すぎたことから**。`IO#respond_to?`が`io`と読まれ、`Kernel.Float(x)`が`io`と読まれた。世界に向いた既定がクラスが行にしないすべてのセレクタに答えるからだ——あらゆるレシーバーに存在する`Object`レベルのものを含み、純粋な変換ファミリーである`Kernel`の`module_function`側を含めて。あらゆる姿勢の前に参照される普遍的な∅セレクタリストと、オプションのクラスごとの`singleton_posture:`で修正。どちらも正しいコードに対するラベルであり、それはADR-5が予算を組む失敗モードだ;どちらも全数調査を走らせなければ見えなかっただろう。

**網羅性ビットはほとんど動かない**（16.1% → 16.1%、17.8% → 17.5%、26.6% → 26.6%）。それが期待される形だ: 姿勢の既定はトレーサーが何も答えなかった場所で答え、どちらも汚染しないので、カタログの仕事はすべて証明レーンにある。このビットは`dynamic-receiver`と`unresolved-self-call`に統治されており、それらはディスパッチ品質の問いであってカタログカバレッジの問いではない。
