---
title: "外部gemの由来: ディスパッチではなく定数ミスをラベリングする"
description: "rigortype/rigor docs/notes/20260711-external-gem-constant-provenance.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-external-gem-constant-provenance.md"
sourcePath: "docs/notes/20260711-external-gem-constant-provenance.md"
sourceSha: "2f9319e2595e0383be7b15d71eaf4837990f1c34861017504278e6552f983bfc"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

設計ノート、2026-07-11。GitLabプランの**P2項目7**
（[`20260708-gitlab-type-coverage-improvement-plan.md`](../20260708-gitlab-type-coverage-improvement-plan/)）、
[ADR-82](../../adr/82-dynamic-provenance-wiring/)の**WD9**として記録。

## このノートが閉じる発見と、プランへの修正

ADR-82のG2: `external_gem_without_rbs`は3つのコーパス全体で**ゼロ**箇所で発火する一方、GitLabの
ロックファイルにはRBSのないgemが806個ある。したがって`coverage --protection`はユーザーに、穴の99.4%が
`engine_gap`だと伝えるが、その大部分にはユーザーが実際にアクションできる唯一の答え──gemのRBSを
インストールするか書くか──が存在する。

プランの是正策──*「ディスパッチのレシーバークラスがRBSのないロック済みgemに所有されているとき
（`RbsCoverageReport`はすでにその集合を知っている）、外部gem由来を記録する」*──は**機械的に
不可能**であり、それがこのノートの要となる修正である。RBSのないgemでは、レシーバーはクラス名を
決して持たない: 定数読み取りそのもの（`Faraday`）が解決に失敗し
（`env.singleton_for_name`はミス、`discovered_classes`はミス）、`ExpressionTyper#fallback_for`で
汎用の`unsupported_syntax`由来とともに`Dynamic[top]`へと広がる。ディスパッチがレシーバーを見る頃には、
名前は消えている。この由来を記録する2つのディスパッチ層（プロジェクトパッチ済み／依存ソース）は
ADR-10／`pre_eval:`のオプトインを要求する──それこそがこのバケットがゼロと計測された理由である。

したがって誠実な記録箇所は**定数解決のミス**である。ADR-82 WD6のチェーン継承がその後、
`Faraday.new.get(...)`を通じて由来を追加作業なしに運ぶ。

## 健全な所有権: 推測せず、読み取る

誠実性の基準（ADR-82）は明白な近道──gem名のキャメル化
（`faraday` → `Faraday`）──を禁じており、それは正しい: この慣習はまさに重要な箇所で破綻し
（`activesupport` → `ActiveSupport`、`rack-attack` → `Rack::Attack`）、誤った「Xにrbsを追加せよ」という
ヒントはユーザーの時間を無駄にする。ADR-75が回避するために存在する失敗である。

代わりに、所有権は読み取りによって確立される。`RbsCoverageReport`によって`:missing`に分類された
各ロック済みgemについて:

1. インストール済みのソースルートを解決する。**主要なリゾルバーは対象プロジェクト自身のバンドル**
   （`<bundle>/ruby/*/gems/<name>-<version>/`、`BundleSigDiscovery`がすでに走査する純粋な
   ファイルシステムレイアウト──`Bundler` APIもgemコードも不要）である。これは要となる点だ: rigorは
   *自身の*バンドルの下で動作する（`BUNDLE_GEMFILE=<rigor>/Gemfile`）ので、
   `Gem::Specification.find_by_name`は対象のgemではなくrigorのgemを見る──両バンドルが共有する
   一握りのgemしか解決できず、Railsアプリの穴の根となるプロジェクト固有のgemをことごとく取り逃す。
   `Gem::Specification`は、発見可能なバンドルを持たないプロジェクトのための最終手段の
   **フォールバック**として残る（下記のカバレッジのノートを参照）。
2. その慣習的なエントリファイル（`lib/<name>.rb`、およびダッシュ → ディレクトリの変種）をPrismで
   パースし、ルート名の下で**トップレベル**のクラス／モジュール／定数の宣言を記録する。エントリ
   ファイルのパスは`Bundler.require`自身が依存するrequire名の慣習──定数名の推測ではなくファイル名の
   慣習──であり、定数はパースから得られる。

結果は`ルート定数 → gem`のインデックス（`"Faraday" → faraday`）である。ルート名をインデックスが
保持している未解決の定数では、`EXTERNAL_GEM_WITHOUT_RBS`を記録する。さもなくば今日の汎用由来を保つ。

**すべてがフェイルオープンする。** インストールされていないgem、存在しないかパースできない
エントリファイル、より深いファイルにしか宣言されていないルート定数、プロジェクトのタイポ
（`Farraday`）──すべてが汎用由来を保つ。失敗モードはラベルの欠落であって、決して誤ったラベルでは
ない。これこそが、この境界付きスキャンを許容可能にするものだ: カバレッジは後で（gemバージョン
ごとのキャッシュの背後で全ツリースキャンによって）健全性の疑問なしに拡大できる。

## カバレッジは対象がどうgemをインストールしたかに依存する

ラベルはrigorがgemのエントリファイルを*読める*場所にのみ着地し、それはインストールレイアウトによって
変わる:

- **`vendor/bundle`／`BUNDLE_PATH`のプロジェクト**（Docker／CIの標準）── 主要なリゾルバーが
  対象の実際のgemを読むので、RBSのないgemが**すべて**カバーされる。これはこの修正が想定して
  作られたケースである。
- **グローバルgemのプロジェクト**（`mise`／`rbenv`／システム、`vendor/bundle`なし）── バンドル
  リゾルバーは何も見つけられず（rigorは対象の`GEM_PATH`を見られない。それは別のRubyの下にある）、
  カバレッジは`Gem::Specification`フォールバックに落ちる: **rigor自身がバンドルするgemのみ**、
  それも健全に読めるときだけ（gemのトップレベル名前空間定数──`I18n`、`Rack`、`ActiveSupport`──は
  バージョンをまたいで安定なので、*名前*のためにrigorのコピーを読むのはバージョンのずれがあっても
  正しい）。両方の調査コーパス（Mastodon、GitLab）はこのケースであり、それが計測された収穫が
  共有gemの部分集合である理由だ──正しいが、床であって、`vendor/bundle`実行が到達する天井では
  ない。

グローバルgemのギャップを閉じるには、rigorが対象の`GEM_PATH`を知る必要がある──gem同梱の`sig/`
ディレクトリを見つける上で`BundleSigDiscovery`がすでに持つ*同じ*制約である（miseグローバルの対象の
sigも発見されない）。これは共有のフォローアップであり、ここではスコープ外だ。フェイルオープンの
設計は、欠落したカバレッジが欠落したラベルであって決して誤ったラベルではないことを意味する。

### 既知の不正確さ、受容する

汎用のトップレベル定数（`module Util`）を宣言するgemは、プロジェクトが**未解析の**パスに存在する
自身の`Util`を意図していた参照の所有権を主張しうる（解析済みのプロジェクト宣言は`discovered_classes`で
より早く勝つ）。回避策を工夫するのではなく受容する3つの理由: ラベルはサイドチャネルのヒントであり
診断を一切発火できない。ランタイムでは2つの定数が実際に衝突し、どちらが勝つかはロード順に依存する。
そして代替案（汎用に見える名前を一切拒む）はそれ自体がヒューリスティックである。再び蒸し返されない
よう、ここに記録しておく。

## コスト

インデックスは最初の未解決定数で**遅延的に**構築される──定数がすべて解決するプロジェクトは決して
支払わない──し、スキャンはエントリファイル（gemあたり1つか2つ）に境界付けられているので、
その支払いは806個のgemがあってもサブ秒だ。フォークプールの下では各ワーカーが最初の必要時に自身の
コピーを構築する。エントリファイル規模ではそれは許容可能であり、脱出ハッチ（フォーク前に先行構築、
またはgemバージョンごとにキャッシュ）はプロファイルがそれを要求するときのために記録してある。
`make bench-perf`はグリーンだ（29.17Mの上限に対して28.64Mのアロケーション）。

## ゲート

ADR-75のサイドチャネル契約に沿った精度加算的なもの──型、診断、深刻度の変更なし:
Redmineの`app`+`lib`診断はバイト単位で同一である。機能的なゲートはADR-82 WD5型の
**再バケット計測**である: 実際のコーパスでの前後の由来分布（`cause_site_counts`）、加えて
新たにラベル付けされた箇所のサンプルの手動裁定（その定数は本当にそのgemのものか？）。

**結果（両方の調査コーパスはグローバルgemインストール → 上記の共有gemの床）:**

- Mastodon `app/models`、同一の分母: 47箇所が`unsupported_syntax` →
  `external_gem_without_rbs`。他のバケットはすべてバイト単位で安定。サンプリングされた各箇所は
  **正しい**と裁定された──すべて`I18n`に根がある（`I18n.t`バリデーションメッセージ、`I18n.locale`、
  `I18n.available_locales`）。
- GitLab `lib`、同一の分母: 124箇所が`unsupported_syntax` → `external_gem_without_rbs`、
  他のバケットはすべてバイト単位で安定。すべて共有gem（`i18n`、`rack`、`activesupport`）経由で
  解決された──`add_a_type_here`グループの例はグループ優勢である（WD7の非可逆な集約の注意点）ので、
  権威ある信号は`cause_site_counts`の集計であり、機構はそのすべてがgem定数の読み取りに根を持つことを
  保証する（`external_gem`は`unresolved_constant_fallback`で*のみ*発生する。プロジェクト所有または
  未解決の非gem定数は汎用由来を保つ）。

i18n gemのRBSは`gem_rbs_collection`に存在するので、`add_rbs`ルーティングはこれがラベル付けする
箇所において本当にアクション可能だ。いずれかのコーパスの`vendor/bundle`実行なら、rigor共有の
部分集合だけでなく外部gemの全母集団（`grape`、`banzai`、`globalid`……）をラベル付けするだろう──
それがこの修正が解き放つカバレッジであり、グローバルgemの制約がここで差し控えているものだ。
