---
title: "推論型の確認"
description: "rigortype/rigor docs/manual/05-inspecting-types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/manual/05-inspecting-types.md"
sourcePath: "docs/manual/05-inspecting-types.md"
sourceSha: "522e4dc7a1d366aa97a69a1ac0cb968bdaebfb47f589838015b870a841536e65"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
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

`rigor annotate FILE`はファイル全体を再表示し、各行に評価する式の型を末尾の`#=> dump_type:`コメントとしてタグ付けします:

```ruby
two = 1 + 1   #=> dump_type: 2
name = gets   #=> dump_type: String | nil
```

ファイルを概観する最速の方法です。アノテーションは冪等です——再実行すると前のコメントを積み重ねる代わりに置き換えます。ttyの場合は出力がシンタックスハイライトされます。`--no-color`（および`NO_COLOR`環境変数）でカラーを無効化できます。

## `rigor type-of` — 1つの位置

1つの式の型だけが必要な場合——通常は診断が発火した/しなかった理由を追いかけているとき——単一位置をクエリします:

```sh
rigor type-of lib/example.rb:12:8
```

`--format=json`はツール向けのマシン可読な結果を出力します。これはエディタ統合がホバー時に回答するのと同じクエリです。

## 使い分け

| したいこと | 使うもの |
| --- | --- |
| シェルから一つの式の型を確認したい | `rigor type-of` |
| ファイルの全行を概観したい | `rigor annotate` |
| 解析途中にコンテキスト内で型を出力したい | `dump_type` |
| 型を**アサート**してリグレッションチェックしたい | `assert_type` |
