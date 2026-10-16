---
title: "推論型の確認"
description: "rigortype/rigor docs/manual/05-inspecting-types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/05-inspecting-types.md"
sourcePath: "docs/manual/05-inspecting-types.md"
sourceSha: "495cf6c734b810b80714857b1409f2cb287a9a4261994b37fad99b2eb406705a"
sourceCommit: "c9f6388da4707f3f26ed85dad75d5d8a66d85f11"
translationStatus: "translated"
sidebar:
  order: 9005
---

Rigorの解析はデフォルトでは不可視です。診断を報告するときだけ口を開きます。エンジンが式に割り当てた型を*確認*したいときは、2つのソースヘルパーと2つのCLIコマンドの4つのツールがあります。

## `dump_type`: ソースから型を出力する

`dump_type(expr)`はRigorに`info`重要度の`dump.type`診断を発行させ、`expr`の推論型を表示します。実行時にはno-opで`expr`をそのまま返すため、デバッグ中に残したり自由に散りばめても安全です。

```ruby
require "rigor/testing"
include Rigor::Testing

dump_type(1 + 2)   # rigor reports: dump.type — Constant<3>
```

Rigorはコールが`include Rigor::Testing`の後に`dump_type(…)`として書かれている場合、または完全修飾の`Rigor::Testing.dump_type(…)` / `Rigor.dump_type(…)`として書かれている場合に認識します。

## `assert_type`: ソースで型を固定する

`assert_type("TypeString", expr)`は`expr`の推論型をリテラル型文字列と比較します。不一致の場合、Rigorは`error`重要度の`assert.type-mismatch`診断を発行します。一致する場合は何も出力しません。`dump_type`と同様に実行時は`expr`をそのまま返します。

```ruby
assert_type("Constant<3>", 1 + 2)   # silent — matches
assert_type("Integer",     1 + 2)   # assert.type-mismatch
```

型文字列はエンジンの短い表示形式と照合されます。`assert_type`はハンドブックの例を正確に保つ方法であり、プロジェクト自身のテストソースに保持できるリグレッションチェックとしても機能します。

## `rigor annotate`: マージンの型

`rigor annotate FILE`はファイル全体を再表示し、各行に評価する式の型を末尾の`#=>`コメント（xmpfilter / seeing_is_believingの慣習）としてタグ付けします:

```ruby
two = 1 + 1   #=> 2
name = gets   #=> String | nil
```

ファイルを概観する最速の方法です。アノテーションは冪等です。再実行すると前の`#=>`コメント（手書きのもの、およびv0.2.0以前の`#=> dump_type:`綴りを含む）を積み重ねる代わりに置き換えます。ttyの場合は出力がシンタックスハイライトされます。[`bat`](https://github.com/sharkdp/bat)が`PATH`上に見つかればbat経由で（`--no-bat`でオプトアウト）、見つからなければ組み込みのカラライザーで行われます。`--no-color`（および`NO_COLOR`環境変数）でカラーを無効化できます。

## `rigor type-of`: 厳密な位置、または行まるごと

いくつかの式の型が必要な場合（通常は診断が発火した/しなかった理由を追いかけているとき）、厳密な位置をまとめてクエリします。そうすればRigorはプロジェクトと各ソースファイルを1回だけロードします:

```sh
rigor type-of lib/example.rb:12:8 lib/example.rb:12:14
```

列を手で数えずに済ませたいときは列を省いてください。Rigorはその行から始まる最初の40個の式を、1始まりの各列で外側のものから順に表として印字し、表が切り詰められた場合はその旨を示します:

```sh
rigor type-of lib/example.rb:12
```

`--format=json`はツール向けのマシン可読な結果を出力します: 結果が1つならフラットなオブジェクトのまま、複数なら`results`配列を使います。行のクエリでは、表示された式の数と総数を持つ`line_enumerations`のメタデータが加わります。厳密な位置は、エディタ統合がホバー時に回答するのと同じクエリです。

`rescue`または`ensure`節の内側では、`type-of`とホバーが`rigor check`と一致しないことがあります。`check`は、本体が途中で例外を発生させた後にその節が実行される可能性があるため、`begin`本体が代入する変数をそこではuntypedとして読み取ります。`type-of`は変数が`begin`の前に持っていた値を表示します。`conn = nil; begin; conn = open_conn; work; rescue; conn.close; end`において、`type-of`は`conn`を`nil`として報告し、`check`は何も報告しません。

## `rigor trace`: 推論が進む様子を眺める

`annotate`と`type-of`が*答え*を見せるのに対し、`rigor trace FILE`は*導出*を見せます。エンジンをファイル上で再実行し、記録された推論イベントをステップ実行のターミナルアニメーションとしてリプレイするのです。ローカル変数がスコープに入る瞬間、2つの分岐型がユニオン型へ合流する瞬間、メソッドコールが解決される（あるいは`Dynamic[top]`へフェイルソフトする）瞬間。

```sh
rigor trace lib/example.rb            # キー押下で進む
rigor trace --delay=0.5 lib/example.rb # 自動再生
rigor trace --format=json lib/example.rb # 生のイベントストリーム
```

`--verbose`はタイパーが訪れるすべての式にenter / resultフレームを追加します。デフォルトでは教育的な3種類のイベントだけを残します。JSONストリームは、教材や図を組み立てられる程度に安定しています。

## `rigor lens` ── ファイルの宣言とそれらの型の由来

`rigor lens`は、ファイルが宣言するすべてのクラス、モジュール、メソッド、属性を、それぞれが持つ型およびその型がどこから来たか（`sig/`、インラインの`#:` / `@rbs`コメント、プラグイン、ライブラリ、または本体からのRigorの推論）とともに一覧表示します。実験段階の機能です: コマンドおよびその`lens/v0` JSONは今後変更される可能性があります。

```sh
rigor lens lib/shop.rb                    # 読書用のテキスト形式
rigor lens --format=json lib/*.rb         # 1つのJSONドキュメント
```

```text
lib/shop.rb  xxh3-64:845f7426b6acfe12  (2 omitted)
  4:7c90  class Shop
  8:e37e  Shop#label: (::Integer n) -> ::String  [contract inline]
  14:ce93  Shop#total: () -> Integer  [single_site inferred]
  16:182b  Shop#fetch  [contested; also lib/legacy_shop.rb:2]
  omitted constant Shop::LIMIT (line 5)
```

得られる答えは`rigor check`が到達するものと同じです。lensは`rigor check --incremental`と同じインクリメンタル解析を実行し、そのキャッシュを共有するため、初回実行はフルチェックのコストがかかりますが、以降の実行はそれを再利用します。ファイルに対して報告される診断は、`check`が報告するものと同じです。

- Rubyが複数の定義から採用しうるメソッド（2つのファイルで定義された同じメソッド）は`contested`（競合）となります。Rigorはどちらが実行されるかを推測しないため、それに対するシグネチャは印字されません。
- このバージョンがまだモデル化していない宣言（定数、`alias`、`define_method`）は、ドロップされるのではなくomitted（省略）として一覧表示されます。
- `LINE:HASH`はアンカーです: 宣言またはその上の型コメントが変更されたときに変化し、地の文のコメントが変更されても変化しません。

JSONドキュメントの仕様は、[lens出力仕様](../../internal-spec/lens/)に定められています。

## 使い分け

| したいこと | 使うもの |
| --- | --- |
| シェルから一つの式の型を確認したい | `rigor type-of` |
| ファイルの宣言、それらの型および各型の由来を確認したい | `rigor lens` |
| ファイルの全行を概観したい | `rigor annotate` |
| 導出を一歩ずつリプレイしたい | `rigor trace` |
| 解析途中にコンテキスト内で型を出力したい | `dump_type` |
| 型を**アサート**してリグレッションチェックしたい | `assert_type` |
