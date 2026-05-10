---
title: "Rigorハンドブック"
description: "rigortype/rigor docs/handbook/README.mdからインポートされたドキュメントの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/README.md"
sourcePath: "docs/handbook/README.md"
sourceSha: "bce01f7c0f4f80c52827e7ab402b91b6ae720b9ba10a3b746fbceadc4675c845"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
translationStatus: "translated"
sidebar:
  order: 1000
---

Rubyプログラマー向けに書かれた、Rigorの型モデルの解説です。静的型付けの予備知識は前提にしません。最初に読むときは順番どおり通読し、必要なときに章単位で参照してください。

## 想定読者

業務でRubyを書いていて、`nil`への`NoMethodError`に何度かぶつかったことがあり、次のような疑問を持っている人を想定しています:

- `rigor check`は実際に何を見ているのか？
- なぜこの式に警告を出したのか — もっとよくあるのは、なぜ自分が想定した式に警告を出さなかったのか？
- 推論が及ばないとき、`.rb`ファイルに注釈を書き散らさずにどう推論を補強すればよいか？

ハンドブックはこれらの疑問に答えます。一方、[正規型仕様](../type-specification/)を置き換えるものでは**ありません**。正規仕様は`docs/type-specification/`にあり、ハンドブックの記述と食い違ったときは正規仕様が拘束力を持ちます。

## 目次

1. [**はじめに**](01-getting-started/) — `rigor check`の実行、診断の読み方、「注釈は書かない」というスタンス。
2. [**日常的に出会う型**](02-everyday-types/) — キャリアの種類。定数、整数の範囲、リファインメント、ユニオン、`Dynamic[Top]`。「Rigorが見ているもの」を最短距離で把握できます。
3. [**ナローイング**](03-narrowing/) — `if`、`case`、述語メソッドが、分岐内で変数の型をどう絞り込むか。
4. [**タプルとハッシュシェイプ**](04-tuples-and-shapes/) — Rubyの`[a, b, c]`リテラルや`{key: value}`ハッシュが、Rigorが構造を証明できたときに受け取る構造的なキャリア。
5. [**メソッドとブロック**](05-methods-and-blocks/) — 引数の型付け、戻り値型の推論、ブロックパラメーター、引数個数（arity）。
6. [**クラス**](06-classes/) — インスタンス側とクラス側、`self`、`attr_accessor`、`Data.define`。
7. [**RBSと`RBS::Extended`**](07-rbs-and-extended/) — 推論で実際の戻り値型を証明できないとき、`.rbs`ファイルや`%a{rigor:v1:…}`ディレクティブで推論を後押しする方法。
8. [**エラーの読み方**](08-understanding-errors/) — ルールカタログ（`call.undefined-method`、`call.argument-type-mismatch`、`flow.always-raises`、…）、深刻度プロファイル、`# rigor:disable`による抑制。
9. [**プラグイン**](09-plugins/) — プラグインを書くべきタイミングと、[examples/](https://github.com/rigortype/rigor/blob/main/examples/README.md)ランディングページへの導線。
10. [**Sorbetとの共存**](10-sorbet/) — Sorbetを使用しているプロジェクトから来たユーザー向け: [`rigor-sorbet`](https://github.com/rigortype/rigor/blob/main/examples/rigor-sorbet/)アダプターが`sig { ... }`ブロック、RBIファイル、`T.let` / `T.cast` / `T.must` / `T.unsafe`アサーションをRBSで書き直さずに型ソースとして読み取ります。

## 読み方

各章は理論を最小限に抑え、例を多く載せています。すべての例はMRIで素のまま動く現実のRubyコードであり、その周りの解説文は`rigor check`がそのコードに対して言うであろう内容です。

スニペット中に`assert_type(...)`行が現れたら、それはRigorの内部観察用ヘルパーであり、実行時チェックではありません。プログラム上のその位置で推論された型を固定し、解説文と実際の解析器出力を比較できるようにするためのものです。`dump_type(...)`も同じ趣旨ですが、不一致でも失敗せずに通知を出力します。

スニペットの記法:

```ruby
n = 1 + 2
assert_type(n, "Constant<3>")  # Rigor がリテラル和をたたみ込む
```

これは「`assert_type`呼び出しの位置で、Rigorの`n`に対する推論が`Constant<3>`、つまりリテラル値`3`を持つ`Type::Constant`キャリアになっている」という意味です。

ある章でより形式的な文書に言及するとき、リンクはハンドブックを離れて拘束力のある仕様コーパスやADRに移ります:

- [`docs/types.md`](../types/) — 1ページのメンタルモデル。
- [`docs/type-specification/`](../type-specification/) — 正規の仕様コーパス。
- [`docs/internal-spec/`](../internal-spec/) — 解析器内部の契約（エンジン表面、型オブジェクトの公開API）。
- [`docs/adr/`](../adr/) — アーキテクチャ決定記録（ADR）。

## このハンドブックの非目標

ハンドブックは数時間で通読できることを目指しています。短く保つために:

- Rubyそのものの入門は**しません**。`def`、`class`、ブロック、モジュール、`attr_*`、正規表現、RBSの基礎などはすべて前提知識とします。
- 全エッジケースは扱い**ません**。エッジケースは仕様コーパスにあります。
- 内部契約（エンジン表面、型オブジェクトの公開API）には踏み込み**ません**。それらは[`docs/internal-spec/`](../internal-spec/)にあります。
- プラグインの**作成**にも踏み込み**ません**。これは[examples/](https://github.com/rigortype/rigor/blob/main/examples/README.md)の役割で、第9章は1ページの導線にとどめています。

ハンドブックで説明していないトピックが出てきても、関連する仕様文書はワンクリックで開けます。
