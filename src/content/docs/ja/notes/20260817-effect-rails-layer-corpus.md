---
title: "Railsエフェクト層 —— コーパス計測、前後（#387）"
description: "rigortype/rigor docs/notes/20260817-effect-rails-layer-corpus.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260817-effect-rails-layer-corpus.md"
sourcePath: "docs/notes/20260817-effect-rails-layer-corpus.md"
sourceSha: "08854a0f32614afe019336bc57e2c14ff2d5d21348940cc7dddceceb23054eff"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 20266817
---

ステータス: 計測ノート、設計上のコミットメントはなし。ブランチ`claude/effect-labels/11-rails-layer`で実施。「前」はそのベース、コミット`426d2e6d`（宣言レーンのスライス）: プラグインはエフェクトの契約をまったく運ばない。「後」は同じプラグインリストでの同じ実行で、今や各Railsプラグインが`effect_attributions:` / `effect_edges:`を運び、rigor-activerecordのバンドル済み`sig/active_record/relation.rbs`が`%a{…}`を運ぶ。「+railties」は新しい`rigor-railties`プラグインを加える。これは推奨されるRailsのセットアップであり、`Rails.`名前空間を運ぶものだ。

## ハーネス

[`20260817-effect-catalogue-corpus.md`](../20260817-effect-catalogue-corpus/)と同じ形。各スクラッチ設定はプロジェクト自身のコミットされた`.rigor.dist.yml`から`baseline:`を除き、3つのキーを追加したもの——`effects: {}`・`parallel: {workers: 0}`・スクラッチの`cache.path`。キャッシュディレクトリは毎回の実行前に消去されるので、すべての計測はコールドである。調査チェックアウトの中には何も書かれていない。

```sh
cd ~/repo/ruby/rigor-survey/<project>
BUNDLE_GEMFILE=<root>/Gemfile bundle exec <root>/exe/rigor \
  effects --format json --full app lib --config <scratch>/<project>-fx.yml

# the WD13 budget
BUNDLE_GEMFILE=<root>/Gemfile /usr/bin/time -l bundle exec <root>/exe/rigor \
  check --no-ci-detect app lib --config <scratch>/<project>-{check,fx-railties}.yml
```

すべてNix Flakeの中で走る（調査チェックアウト自身のバンドルはこのRuby向けにビルドされたネイティブ拡張を持たない）。調査チェックアウト: redmine `a12198ea0`、mastodon `163f96cee`（v4.6.3）。プラグインリストは各プロジェクト自身のもの: actionpack・activerecord・actionmailer・rails-routes・rails-i18n・activesupport-core-ext——加えて3列目にrailties。

## カバレッジ

| | redmine | | | mastodon | | |
| --- | --- | --- | --- | --- | --- | --- |
| | 前 | 後 | +railties | 前 | 後 | +railties |
| メソッド | 4,029 | 4,683 | 4,683 | 7,361 | 8,355 | 8,355 |
| **宣言**ラベル1つ以上 | 0 | **1,320** | **1,575** | 0 | **2,471** | **2,969** |
| 宣言ラベルのインスタンス | 0 | **3,134** | **3,967** | 0 | **3,959** | **7,647** |
| 証明済みラベル1つ以上 | 1,788 | 2,154 | 2,154 | 2,830 | 3,349 | 3,349 |
| 証明済みラベルのインスタンス | 3,975 | 5,280 | 5,280 | 4,543 | 5,287 | 5,287 |

メソッド数が上がるのは、フレームワークエッジがフレームワーククラス上の**合成単位**として実体化されるからだ（`Issue#save`はそのコールバックへ、`WelcomeJob.perform_now`は`perform`へエッジ）: redmineで654、mastodonで994。以下の同種比較はすべて、両方の実行に共通する4,029 / 7,361メソッド上で計算されている。

証明済みラベルが上がるのはエッジの仕業であって帰属のではない: プラグインの行は宣言レーンにのみ着地するが、合成された`Issue#save`単位は各モデルのコールバックを`save`のあらゆる呼び出し元へ引き込み、`UserMailer.welcome(u)`は今やメーラー本体に到達する。Redmineの`io.net` 25 → 214と`mutate.self` 1,275 → 1,635がそのクロージャだ。

### Rails層が実際に名指したもの

宣言ラベルのインスタンス、後 / +railties:

| ラベル | redmine | mastodon |
| --- | --- | --- |
| `io.db.read` | 680 / 680 | 1,922 / 1,922 |
| `io.db.write` | 238 / 238 | 469 / 469 |
| `io.db.transaction` | 86 / 86 | 78 / 78 |
| `io.db`（生SQL、動詞が非リテラル） | 57 / 57 | 25 / 25 |
| `rails.i18n.translate` | 664 / 664 | 394 / 394 |
| `rails.response.write` | 371 / 371 | 408 / 408 |
| `rails.config.read` | 0 / 502 | 0 / 1,365 |
| `rails.flash.write` | 123 / 123 | 8 / 8 |
| `rails.session.write` / `.read` | 51 / 33 | 2 / 1 |
| `rails.cookie.write` | 11 / 11 | 0 / 0 |
| `cache.read` / `cache.write` | 0 / 0 | 0 / 108 · 408 |
| `telemetry` | 5 / 63 | 1 / 264 |
| `global.read` | 512 / 727 | 362 / 1,263 |

保つ価値のある2つの読み。第一に、**動いたのはフレームワークラベルだ**: Railsアプリのエフェクトサーフェスは圧倒的に`io.db.read`、翻訳、応答の書き込みであり、そのどれも以前はまったく見えなかった。第二に、**railtiesは環境の半分が住む場所だ**: `rails.config.read`・`cache.*`・`telemetry`の大半はそれなしではゼロであり、それがプロジェクトがたまたま有効にしたどれかのRailsプラグインに散在する行ではなく独自のプラグインである理由のすべてだ。

`io.db`の57 / 25は先頭の動詞がリテラルでなかった生SQL——`sql_verb`ハンドラの正直な劣化。Redmineの`IssueQuery`にそのほぼすべてがある。

## 網羅性

| | redmine | mastodon |
| --- | --- | --- |
| 前 | 649 / 4,029（16.1%） | 1,288 / 7,361（17.5%） |
| 後 | 655（16.3%、**+0.2pp**） | 1,289（17.5%、**+0.0pp**） |
| +railties | 667（16.6%、**+0.5pp**） | 1,298（17.6%、**+0.1pp**） |

**ファーストパーティの解消はメソッド全体の網羅比率をほとんど動かさず、それは失望ではない——効果に対して指標の形が間違っているのだ**。解消は*サイト*ごとだ: `Rails.env`と`user.save`が汚染するのを止め、それは実在し、`Report#environment`の形のメソッドが今や網羅的と読める理由だ。だがメソッドが網羅的なのはその中の*すべての*サイトがそうであるときだけで、Railsアプリでは支配的な原因は`unresolved-self-call`（redmineで10,281 → 15,652）であり、それはRails層が何も言えないRubyのディスパッチのファクトだ。654の合成単位自体も654中98しか網羅的でない。コールバック本体は通常の未解決self呼び出しを含む通常のアプリケーションコードだからだ。

`template-not-analysed`が初めて現れる: redmineで249、mastodonで329——レンダリングするコントローラーメソッドごとに1つ。それがADR-103 WD11の負債を可視で数えられるものにしたものであり、汚染原因はそのためにある。

## WD13の予算: エフェクトオンのときのコスト

`app lib`上のコールドな`rigor check`、逐次、同じキャッシュ消去条件、`effects:`ブロックありとなし（`+railties`設定、つまり最も完全なプラグイン集合）:

| | 実時間 | Δ | ピークRSS | Δ |
| --- | --- | --- | --- | --- |
| redmine、エフェクトオフ | 8.77秒 | | 393.6 MB | |
| redmine、エフェクトオン | 9.07秒 | **+3.4%** | 406.5 MB | **+3.3%** |
| mastodon、エフェクトオフ | 12.82秒 | | 663.8 MB | |
| mastodon、エフェクトオン | 13.26秒 | **+3.4%** | 666.3 MB | **+0.4%** |

どちらもWD13の≦5%の作業予算の内側であり、プラグイン層は前のスライスがすでに計測した収集コストの上に計測可能なものを何も加えない: コンパイルされたテーブルはプロセスごと、呼び出しごとのルックアップはHash読み取り2回と上限付きスーパークラス走査、そして`Registry#effect_contributions`は遅延なので、エフェクト**オフ**の実行はキューアダプタのために`config/application.rb`を読みさえしない。

## この計測が見つけた1つのバグ

最初のパスはredmineの`io.db.read`を、ここでの680に対して**7**と示した。原因は、ランナーがコンパイルされたプラグインテーブルを初回使用時に無条件にメモ化していたことだ: 逐次パスではクロスファイルの発見事前パスは最初のファイルがすでに問うた*後で*スーパークラステーブルを埋めるので、実行全体が空の祖先関係に固定され、`Issue < ApplicationRecord < ActiveRecord::Base`上の`Issue.find`は何にもマッチしなかった。プールされた実行はそれを完全に隠した——そのワーカーはforkする前に完成したテーブルでシードされる——それがまさに、コーパス実行が捕まえるために存在する欠陥の形だ。メモは今や祖先関係テーブルの同一性でキー付けされ、`spec/rigor/effects/rails_layer_spec.rb`は捕まえ続けるためにフィクスチャを`workers: 0`で走らせる。
