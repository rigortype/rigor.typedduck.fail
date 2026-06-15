---
title: "推論型の確認"
description: "rigortype/rigor docs/manual/05-inspecting-types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/05-inspecting-types.md"
sourcePath: "docs/manual/05-inspecting-types.md"
sourceSha: "fefa2aa2ec5764781063d5008107657351f2885c77a121949ffae6cb03c158ba"
sourceCommit: "636f8725dd79aab2f711249ace6357a98b7e73a4"
translationStatus: "translated"
sidebar:
  order: 9005
---

Rigorの解析はデフォルトでは不可視です——診断を報告するときだけ口を開きます。エンジンが式に割り当てた型を*確認*したいときは、2つのソースヘルパーと2つのCLIコマンドの4つのツールがあります。

## `dump_type` — ソースから型を出力する

`dump_type(expr)`はRigorに`info`重要度の`dump.type`診断を発行させ、`expr`の推論型を表示します。実行時にはno-opで`expr`をそのまま返すため、デバッグ中に残したり自由に散りばめても安全です。

```ruby
require "rigor/testing"
include Rigor::Testing

dump_type(1 + 2)   # rigor reports: dump.type — Constant<3>
```

Rigorはコールが`include Rigor::Testing`の後に`dump_type(…)`として書かれている場合、または完全修飾の`Rigor::Testing.dump_type(…)` / `Rigor.dump_type(…)`として書かれている場合に認識します。

## `assert_type` — ソースで型を固定する

`assert_type("TypeString", expr)`は`expr`の推論型をリテラル型文字列と比較します。不一致の場合、Rigorは`error`重要度の`assert.type-mismatch`診断を発行します。一致する場合は何も出力しません。`dump_type`と同様に実行時は`expr`をそのまま返します。

```ruby
assert_type("Constant<3>", 1 + 2)   # silent — matches
assert_type("Integer",     1 + 2)   # assert.type-mismatch
```

型文字列はエンジンの短い表示形式と照合されます。`assert_type`はハンドブックの例を正確に保つ方法であり、プロジェクト自身のテストソースに保持できるリグレッションチェックとしても機能します。

## `rigor annotate` — マージンの型

`rigor annotate FILE`はファイル全体を再表示し、各行に評価する式の型を末尾の`#=>`コメント（xmpfilter / seeing_is_believingの慣習）としてタグ付けします:

```ruby
two = 1 + 1   #=> 2
name = gets   #=> String | nil
```

ファイルを概観する最速の方法です。アノテーションは冪等です——再実行すると前の`#=>`コメント（手書きのもの、およびv0.2.0以前の`#=> dump_type:`綴りを含む）を積み重ねる代わりに置き換えます。ttyの場合は出力がシンタックスハイライトされます——[`bat`](https://github.com/sharkdp/bat)が`PATH`上に見つかればbat経由で（`--no-bat`でオプトアウト）、見つからなければ組み込みのカラライザーで行われます。`--no-color`（および`NO_COLOR`環境変数）でカラーを無効化できます。

## `rigor type-of` — 1つの位置

1つの式の型だけが必要な場合——通常は診断が発火した/しなかった理由を追いかけているとき——単一位置をクエリします:

```sh
rigor type-of lib/example.rb:12:8
```

`--format=json`はツール向けのマシン可読な結果を出力します。これはエディタ統合がホバー時に回答するのと同じクエリです。

## `rigor trace` — 推論が進む様子を眺める

`annotate`と`type-of`が*答え*を見せるのに対し、`rigor trace FILE`は*導出*を見せます。エンジンをファイル上で再実行し、記録された推論イベントをステップ実行のターミナルアニメーションとしてリプレイするのです——ローカル変数がスコープに入る瞬間、2つの分岐型がユニオン型へ合流する瞬間、メソッドコールが解決される（あるいは`Dynamic[top]`へフェイルソフトする）瞬間。

```sh
rigor trace lib/example.rb            # キー押下で進む
rigor trace --delay=0.5 lib/example.rb # 自動再生
rigor trace --format=json lib/example.rb # 生のイベントストリーム
```

`--verbose`はタイパーが訪れるすべての式にenter / resultフレームを追加します。デフォルトでは教育的な3種類のイベントだけを残します。JSONストリームは、教材や図を組み立てられる程度に安定しています。

## 使い分け

| したいこと | 使うもの |
| --- | --- |
| シェルから一つの式の型を確認したい | `rigor type-of` |
| ファイルの全行を概観したい | `rigor annotate` |
| 導出を一歩ずつリプレイしたい | `rigor trace` |
| 解析途中にコンテキスト内で型を出力したい | `dump_type` |
| 型を**アサート**してリグレッションチェックしたい | `assert_type` |
