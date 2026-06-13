---
title: "はじめに"
description: "rigortype/rigor docs/handbook/01-getting-started.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/01-getting-started.md"
sourcePath: "docs/handbook/01-getting-started.md"
sourceSha: "43b3030d986c8a964239bca058cbff7f6a77d765670972c5f3fc7ce8206f6099"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 1001
---

この章を読み終えると、次のことができるようになります:

- `rigor`を`PATH`に乗せる（速いAI支援の方法、または手作業で）;
- `rigor check`を実行し、出力される診断を読む;
- ほとんどのチェッカーとRigorを分かつ「注釈不要」のスタンス——そして推論が及ばないときの抜け道——を理解する。

これは唯一、最初から最後まで読むべき章です。ハンドブックの残りは、あとから拾い読みできるリファレンスです。

## Rigorのインストール

Rigorはライブラリではなくツールです — リンターやコンパイラと同様に、プロジェクトを解析しますがランタイムの一部にはなりません。**アプリケーションの`Gemfile`に追加しないでください**。単独でインストールし、プロジェクトを指して実行します。

Rigor自体はRuby 4.0上で動作し、あなたのコードがターゲットとするRubyとは独立しています — [`target_ruby:`設定キー](#設定ファイル)がRigorにあなたのプロジェクトが動作するRubyを伝えます。

### 速いパス: AIエージェントにセットアップさせる

AIコーディングエージェント（Claude Code、または[Agent Skills](https://agentskills.io/)をサポートする任意のアシスタント）を使っているなら、このプロンプトを渡してください:

```
Install Rigor in this project by following the instructions at
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

エージェントは環境を検出し、Rigorをインストールし、そして**`rigor-project-init`スキル**を実行します——これはあなたの`Gemfile`を辿り、フレームワークに合ったプラグインセットを提案し、導入モードを選び、`.rigor.dist.yml`を書き出してくれます。手動のYAML編集は不要です。これが推奨パスです;下記の[設定ファイル](#設定ファイル)セクションが、スキルが生成するものを示すので、あとから読んで調整できます。

同じプロンプトは[Railsクイックスタート](../../manual/14-rails-quickstart/#ステップ1--ruby-40とrigorのインストール両pathに共通)で16言語で利用できます。

### 手動パス: mise

自分でセットアップを進めたいなら、推奨のランタイムバージョンマネージャーは[`mise`](https://mise.jdx.dev/)で、Ruby 4.0とRigorの両方をプロビジョニングします:

```sh
mise use ruby@4.0
mise use gem:rigortype
```

miseがシェルでアクティベートされていると、`rigor`が`PATH`上に置かれます。gemの名前は`rigortype`です（`rigor`という名前はRubyGemsで取得済みでした）;インストールされる実行ファイルは`rigor`です。すでにRuby 4.0があるなら、`gem install rigortype`でも動きます。

シェルアクティベーションとshims、`asdf`、コンテナ内開発については[Rigorのインストール](../../manual/01-installation/)を、継続的インテグレーションについては[CIでのRigor実行](../../manual/11-ci/)を参照してください。

## `rigor check`は何を見ているのか？

Rigorはプロジェクトの`.rb`ファイルを読み、各ファイルにフローセンシティブ（flow-sensitive）な型推論エンジンをかけ、利用可能な`sig/*.rbs`宣言を参照したうえで、限られた種類のバグを報告します:

- 受信側のクラスが間違っているメソッド呼び出し
- 引数の数が間違っているメソッド呼び出し
- 必ず例外を送出する算術（`5 / 0`）
- リファインされたパラメータ契約（contract）を満たさない引数の型
- そのほか、すべて[第8章 — エラーの読み方](../08-understanding-errors/)に列挙してあります。

重要なのは、RigorはRubyソースに型注釈を書くことを**要求しない**ことです。証明できる範囲だけ推論し、絞り込めない箇所では沈黙します。十分な静的情報があり確信をもって判断できるときだけ、診断を出します。

## 最小の動作セッション

プロジェクトのルートで次を実行します:

```sh
rigor check lib
```

これで`lib/`以下のすべての`.rb`を辿ります。解析器が文句をつけるものを何も見つけなければ、`No diagnostics`と表示して`0`で終了します:

```text
No diagnostics
```

何かを見つけたときは、各診断が1行になります。次のファイルがあるとして:

```ruby
# lib/demo.rb
"hello".no_such_method        # typo'd method name
[1, 2, 3].rotate(1, 2)        # too many arguments
```

`rigor check lib/demo.rb`は次を出力します:

```text
lib/demo.rb:1:9: error: undefined method `no_such_method' for "hello" [call.undefined-method]
lib/demo.rb:2:11: error: wrong number of arguments to `rotate' on Array (given 2, expected 0..1) [call.wrong-arity]
```

単一ファイルだけを対象にしたいときは、ディレクトリの代わりにファイルを渡します:

```sh
rigor check path/to/file.rb
```

そして特定の位置でRigorが何を推論したか尋ねるには:

```sh
rigor type-of lib/foo.rb:10:5
```

これはRigorのリッチな型と、保守的なRBS消去（Rigor以外のRBSツールが見るであろう型）の両方を表示します。「この式はRigorからどう見えるか？」を確かめる最速の方法です。

## 診断の読み方

上の実行の最初の行を取り上げます:

```text
lib/demo.rb:1:9: error: undefined method `no_such_method' for "hello" [call.undefined-method]
```

| 部分 | 意味 |
| --- | --- |
| `lib/demo.rb:1:9` | ファイル、1始まりの行、1始まりの列 |
| `error` | 深刻度（`error` / `warning` / `info`） |
| `undefined method ...` | 人間向けのメッセージ |
| `[call.undefined-method]` | 修飾されたルール識別子 |

修飾ルール識別子は、ルールを抑制・降格・参照するために使うハンドルです。最も手早いのは、問題のある行へのインソースコメントです:

```ruby
"hello".no_such_method  # rigor:disable call.undefined-method
```

同じ識別子は`disable:`と`severity_overrides:`設定キーも駆動し、ファミリー単位のワイルドカードも使えます（`# rigor:disable call`はその行の`call.*`ルールをすべて抑制します）。ファミリーとルールの全リスト、そしてどの抑制メカニズムをいつ使うべきかは、[第8章 — エラーの読み方](../08-understanding-errors/)にあります。

## 「注釈なし」のスタンス

多くの静的チェッカーはユーザーに型を注釈するよう求めます。Rigorは逆方向です — Rubyコードが何をしているかを見て、値そのものから型を**証明**します。簡単な例を3つ挙げます:

```ruby
n = 100
m = n + 1
assert_type("101", m)     # 算術がたたみ込まれる
```

```ruby
def kind(x)
  case x
  when Integer then :int
  when String  then :str
  end
end
assert_type(":int | :str | nil", kind(7))  # すべての case 分岐のユニオン
```

```ruby
greeting = "Hello, "                 # Constant<"Hello, ">
name     = ARGV.first                # String?  (RBS 由来)
hello    = "#{greeting}#{name}!"     # リテラル文字列キャリア:
                                     # 補間部分がいずれもリテラル文字列互換なので、
                                     # 結果は「ソース由来であることが証明できる」
                                     # 型になる
```

注釈を1行も書かずに、Rigorは値そのものについて推論しています。

> `assert_type(...)`の行はRigorのイントロスペクションヘルパーであり、ランタイムチェックではありません——その時点で推論された型を固定するので、地の文を解析器の実際の出力と比較できます。完全なスニペット規約については[このハンドブックの読み方](../#読み方)を参照してください。

推論で型を絞り込めないとき、エンジンは`Dynamic[Top]`（漸進的（gradual）キャリア — 「任意のRuby値の可能性がある」）を返し、診断は出しません。Rigorは証明できない診断を勝手に作り出すことはありません。

## 推論だけでは足りないとき

*初読ですか？ このセクションは飛ばしてください。*デフォルトのままでも、推論に加えてgemがすでに同梱しているRBSがほとんどのコードをカバーし、続く各章がその出力の読み方を教えます。Rigorが「もっと知っていてほしい」と思う何かを`Dynamic[Top]`に解決したときに、ここへ戻ってきてください。ほとんどのプロジェクトでは抜け道（1）と（2）しか登場しません。

5つの抜け道があります。おおよそよく使う順に並べると:

1. **`.rbs`ファイルを追加する**。署名を`sig/`に置けばRigorが自動的に拾います。ローカルの`def`から先が見えない理由として最も多いのがこれです — デフォルトでは解析器は外部のgemをすべて`Dynamic[Top]`として扱います。gemがRBSを同梱していないかぎり、または以下の（4）でgemソース推論をオプトインしないかぎり、内部は見えません。
2. **既存のRBS署名を`RBS::Extended`で締める**。メソッドの`def ... -> ::String`の上に`%a{rigor:v1:return: non-empty-string}`のような注釈を足します。Rigorはリファインメントを認識しますが、通常のRBSツールはコメントとしてしか見ません。
3. **プラグインを書く**。プロジェクトに汎用解析器が知り得ないドメインDSL（`Lisp.eval`、`100.kilometers`、`transition_to(:foo)`など）があるなら、プラグインでRigorにそれを教えます。
4. **gemソース推論をオプトインする**。RBSを持たないgemのメソッドが`Dynamic[Top]`に解決されてしまうとき、そのgemを`.rigor.dist.yml`の`dependencies.source_inference:`に列挙すれば、Rigorはそのgemの`lib/`をプロジェクトソースと同じように辿ります。戻り値は`Dynamic[T]`でラップされ、呼び出し元には出所情報が保持されます。トレードオフは[ADR-10](../../adr/10-dependency-source-inference/)を参照してください（広いデフォルトは予算を圧迫し`bundle update`をノイジーにするため、gem単位のオプトイン設計です）。
5. **`rigor-sorbet`アダプタを使う**。プロジェクトがすでに[Sorbet](https://sorbet.org/)を使っているなら、Rigorは既存の`sig { ... }`ブロック、RBIファイル、`T.let` / `T.cast` / `T.must` / `T.unsafe`アサーションを何も書き直さずに型ソースとして読み取れます。移行パターンと対応表は[第10章](../10-sorbet/)を参照してください。

第7章と第9章は（1）〜（3）を詳しく扱います;第10章は（5）を扱います。

## 設定ファイル

最小限の有用な実行に設定ファイルは一切不要です — `rigor check lib`はそのままで動きます。設定ファイルは、追加の`paths`、別の`severity_profile`、プロジェクト全体のルール無効化、プラグインなど、デフォルト以外の挙動のために用意します。

[AI支援セットアップ](#速いパス-aiエージェントにセットアップさせる)を使ったなら、`rigor-project-init`スキルが既に1つ書いてくれています。手書きでスターターを書くには、`rigor init`が`.rigor.dist.yml`を出力します — これはコミット対象のプロジェクトデフォルトです:

```yaml
target_ruby: "3.4"   # あなたのプロジェクトのRuby — Rigor自身の4.0ではない

paths:
  - lib

# signature_paths: [sig]   # 省略時は自動検出されます

severity_profile: balanced

# severity_overrides:
#   call.argument-type-mismatch: warning

# disable: []

# plugins: []
```

ほとんどのプロジェクトに必要なのはこれだけです。残りのメカニズム——同梱のJSONスキーマによるエディタオートコンプリート、`.rigor.yml`対`.rigor.dist.yml`の優先順位ルール、`includes:`による合成、そしてパスを取るキーが宣言ファイルを基準にどう解決されるか——は[設定](../../manual/03-configuration/)で扱います。最初に知っておく価値のある唯一のルール: 開発者がローカルの`.rigor.yml`を保持しているとき、それはその実行における設定の*唯一の*ソースであり（2つのファイルが自動的にマージされることは決してありません）、共有デフォルトを拡張するにはそれを`includes:`に列挙しなければなりません。

## 次に読むもの

第2章は、Rigorが型を表現するために使うキャリア（carrier）を紹介します。これがRigorを通常のRBSから区別するモデルの中核です。続く第3章（ナローイング（narrowing））でキャリアが活きてきます — キャリアは値を記述し、ナローイングは制御フローが`if` / `case` / 述語メソッドを通過するときにキャリアがどう変化するかを記述します。
