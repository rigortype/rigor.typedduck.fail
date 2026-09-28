---
title: "インラインに対するsig/ — 整合性ルールの偽陽性ゲート（#1075）"
description: "rigortype/rigor docs/notes/20260926-sig-inline-consistency-fp-gate.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260926-sig-inline-consistency-fp-gate.md"
sourcePath: "docs/notes/20260926-sig-inline-consistency-fp-gate.md"
sourceSha: "53d4c7fb54d422a57d13e5dc862de0c6ec7ca840948d18b920e3eaff5688162b"
sourceCommit: "e12ab45fa55707ed2acc0eae2e273b99a72dc077"
translationStatus: "translated"
sidebar:
  order: 20266926
---

ステータス: [#1075](https://github.com/rigortype/rigor/issues/1075)のための測定ノート。[ADR-112](../../adr/112-extrbs-comment-channel/) WD5が`rbs.contradicting-signature`をエラーとして出荷する前に設定したゲート: *「出荷前に、本ルールはherb、mastodon、redmine、およびRigor自身に対して実行される。偽陽性（誤検知）が発生した場合はルールを修正し、深刻度を引き下げることはしない。」* PRが出荷した内容を超える設計コミットメントはありません。ベース`698604d1`に対するブランチ`sig-inline-consistency-1075`、Ruby 4.0.5、rbs 4.2.0で取得。

## 方法

エンジンアームのレシピに従い、スクラッチパッド内に2つの実行可能なエンジンコピーを用意しました: `arm_base`は`git archive 698604d1 lib`を保持し、`arm_new`はブランチの`lib`を保持します。2つの`lib`ツリーの`diff -rq`はブランチが触れているファイルのみを示しました。各ターゲットは調査チェックアウトのプライベートな`rsync -a`コピーであり（`.git`、`node_modules`、`.rigor`、`tmp`、`log`は除外）、Rigor自身のツリーはブランチの`lib`、`sig`、および`.rigor.dist.yml`のコピーであるため、両アームは完全に同一の入力を読み込みます。一度に1つのターゲットを実行:

```sh
cd <copy> && BUNDLE_GEMFILE=<worktree>/Gemfile bundle exec ruby -I<arm>/lib <arm>/exe/rigor \
  check --no-cache --no-baseline --format json --workers=2 [lib]
```

診断セットは`(path, line, rule, severity, message)`のタプルとして差分比較されました。3つ目のコピーである`arm_instr`は、`RIGOR_MC_DUMP`が設定されている場合にすべての`MemberConsistency::Record`をファイルに追記し（`Environment.record_member_consistency`の先頭の4行）、`--workers=0`で各ターゲットを1回実行したため、以下の調査（census）はルールが報告したものだけでなく決定した内容もカウントしています。

## 結果

| ターゲット | インライン注釈付き`.rb` | `sig/` | 診断base → new | 矛盾（Contradictions） | 未決定（Undecided） | マージ（一致 / `sig/` / インライン） |
| --- | ---: | :---: | --- | ---: | ---: | --- |
| herb（`lib`） | 130 | あり | 2,519 → 37 | 0 | 0 | 2,482（1,944 / 538 / 0） |
| mastodon（`app`, `lib`） | 0 | なし | 2,549 → 2,549、完全一致 | 0 | 0 | — |
| redmine（`app`, `lib`） | 0 | なし | 1,716 → 1,716、完全一致 | 0 | 0 | — |
| Rigor（`lib`） | 0 | あり | 1 → 1、完全一致 | 0 | 0 | — |

**4つのターゲットすべてで`rbs.contradicting-signature`の行はゼロであり、他のルールも一切変動しませんでした**。 herbの差分のすべては、ADR-32 WD13が出力していた2,482件の`source-rbs-annotation-not-honoured` `:info`行であり、herbが両方の場所で宣言しているメンバーごとに1件ずつ出力されていたものです。それらはすべて整合性のあるペアとなり、沈黙するようになりました。herbに残るすべての診断（37件）は、アーム間でバイト単位で一致しています。herbになお残る9件の`source-rbs-annotation-not-honoured`行は無関係なWD12の原因によるものです: パースできない`#:`行（`#: type serialized_node = {`、`#: … as String`）。

herbの`sig/`は同じ注釈に対するrbs-inline自身の出力であるため、ほとんどのペアで一致（equality）が期待される結果です。`sig/`の方がより精密な側である538ペアはすべて、注釈付きファイル内の未注釈の`def`に対するrbs-inlineのスケルトンであり、それぞれが`%a{rigor:v1:inferred-signature}`を保持しています（ADR-93 WD6）: 作者がそのインライン側を書いたわけではないため、`sig/`は以前とまったく同様に行なしでバインドし続けます。インラインの`-> void`の隣にあるADR-93の`sig/ -> untyped`は、RBSが`untyped`、`void`、`top`を同じトップ型として定義しているため、一致として読み取られます。

## コスト

herb上のアロケーション（プロセス内、`Rigor::CLI#run`前後の`GC.stat(:total_allocated_objects)`、`--workers=0`）、アームを交互に実行し、各数値は2回の反復で同一に再現:

| herb | base | new |
| --- | ---: | ---: |
| cold（`--no-cache`） | 13,290,406 | 13,383,596（+0.7%） |
| warm（実行キャッシュヒット） | 444,944 | 408,937（−8.1%） |

warmヒットでも実行レベルの行を導出するため、ルールが1回実行されます。フォーマットされなくなった2,482件の`:info`メッセージの削減が、比較コストを上回ります。cold実行ではビルド用と行用の計2回ルールを導出し、インラインソースを余分に1回パースします。インラインRBSを持たないプロジェクトはルールに到達しません: ローダーは何のパースも行わずにリターンし、比較の依存関係は比較が実行されたときにのみロードされます。

## このゲートで検証されないこと

ルールに到達するのはherbのみです。mastodonとredmineは`sig/`もインライン注釈も同梱していないため、それらの差分ゼロは新コードパスがそれらに何もコストをかけないことだけを示しています。他の22の調査ターゲットでも同様であり、そのうち5つは`sig/`を同梱し（haml、kramdown、mangrove、rgl、textbringer）、インライン注釈を同梱するものはありません。Rigor自身のツリーには現在、両方の場所で宣言されたメンバーはありません: 9月に#824が測定した重複する17ファイルはその後調整され、`# @rbs`または`#:`に言及する9つの`lib/`ファイルは地の文として言及しています。矛盾（contradiction）を発生させたターゲットは存在しなかったため、ルールの肯定的な（矛盾を検出する）半分は`spec/rigor/environment/rbs_loader_spec.rb`および`spec/integration/plugins/rbs_inline_plugin_spec.rb`のフィクスチャに依存しており、それらはベースエンジンでは失敗します。

2つの制限はコーパスではなく定義から生じており、どちらも沈黙する側に倒れています。矛盾には両方になり得ないという証明が必要であり、絶対的に記述されたRubyコアまたはstdlibクラスのみがそれを与えます（明確なリテラル、そのようなクラスの外部のリテラル、または互いがもう一方のRBS祖先ではない2つのそのようなクラス）。プロジェクトが宣言するクラス、gemのクラス、相対名、モジュール、インターフェイス、ブロック位置、および呼び出しによって空のままになり得る位置は、決してそれを証明しません。そのようなペアは未決定（undecided、`:info`）として読み取られます。そしてどちら側がバインドするかは2つの宣言のみから決定されるため、サブクラス関係（`Numeric`に対する`Integer`）も未決定となります。

## レビューラウンド1（PR #1428）

最初のバージョンは「両方の`accepts`の答えが`no`である」ことを素（disjointness）として読み取り、オーバーロードを位置でzipしていました。レビューにより、正しいペアをエラーにしてしまうシェイプが見つかりました: 並べ替えられたオーバーロード、`Enumerable[untyped]`に対する`Comparable`、`Enumerable[untyped]`に対する`String`、`TrueClass`に対する`bool`、コアの`::Data`として読み取られた`module App`内の相対的な`Data`、位置引数の`Hash`または`*rest`に対するキーワード、そしてブロックのパラメータ数です。また、インライン側がバインドしたときの2つの沈黙した損失も見つかりました: `sig/`メンバーの`rigor:v1:predicate-if-true`（ナローイングが`String`から`Dynamic[top]`へ低下）とその`private`可視性です。素の証明、オーバーロードのペアリング、名前チェック、キーワードおよびブロックルール、そしてバインディング条件は仕様の現在の記載どおりに書き直され、それぞれに第1バージョンで失敗するスペックが追加されました。改定されたエンジンでherbが再実行されました（1ターゲット、`--workers=2`、加えて調査）: 上記の数値は変わらず — 2,519 → 37の診断、2,482レコード（1,944の一致、538の`sig/`がより精密）、矛盾ゼロ。

`rigor sig-gen`がデフォルトでインライン宣言されたメンバーを`sig/`に書き込むようになれば（#1076）、そのようなすべてのペアは構造上一致します。そのときルールの矛盾行は、古い生成シグネチャがどのように見えるかを示すものになります。

## レビューラウンド2（PR #1428）

ラウンド1の証明は、アナライザープロセスにロードされたRuby定数からクラス関係を読み取っていました。rbsは`Tempfile < File`と宣言しているのに対し、`tempfile`ライブラリは`Tempfile < Delegator`と定義しているため、インラインの`-> Tempfile`に対する`sig/ -> File`または`-> Object`は素のCLIからは未決定であり、`-rtempfile`の下では矛盾となりました — そして言語サーバーは`tempfile`を必要とします。証明は構築された環境のRBS階層を読み取るようになり（`MemberConsistency::RbsProof`）、どちら側がバインドするかの決定は階層をまったく読み取らないため、プロセスが何をロードしていようと同じ答えになります。プローブプロジェクトは`-rtempfile -rstringio`の有無にかかわらず同じ行を返します。同じラウンドで、プロジェクトのRubyソースが定義する相対名を証明不能にし（Ruby限定の`App::Set < Array`によって`Set`がコアの`::Set`として読み取られることがなくなりました）、省略可能引数、rest、省略可能キーワード、または省略可能ブロックの位置が矛盾を引き起こさないようにしました。最終エンジンでherbを再実行（1ターゲット、`--workers=2`、加えて調査）: 変化なし — 2,519 → 37の診断、2,482レコード（1,944の一致、538の`sig/`がより精密）、矛盾ゼロ。

## レビューラウンド3（PR #1428）

ラウンド2のRBSベースの証明は依然としてプロジェクトクラスを数えていました: Rubyに`Admin < User`が存在し`sig/`がスーパークラスを省略している場合、`::Admin`に対する`::User`がエラーとなり、同様に`::Struct[untyped]`に対する`Point = Struct.new`、`::Data`に対する`Data.define`、`::Base`に対する`Class.new(Base)`もエラーとなりましたが、Rigorの他の部分はこれらを素とは読み取りません。またシャドウスキャンにより、判定が実行のパスセットに依存するようになりました（`rigor check lib`は`:info`、`rigor check lib/box.rb`はエラー）。メンテナの保守的な解釈の下で、証明は主要なRBS宣言がRubyコアまたはstdlibから来る絶対的に記述されたクラスのみを受け入れるようになりました。ソーススキャンはなくなり、ブロック位置が矛盾することはありません。7つのプローブプロジェクトは`rbs.contradicting-signature`を出力せず、単一ファイルに対する`lib`も同じ行を返します。最終エンジンでherbを再実行（1ターゲット、`--workers=2`、加えて調査）: 変化なし — 2,519 → 37の診断、2,482レコード（1,944の一致、538の`sig/`がより精密）、矛盾ゼロ。
