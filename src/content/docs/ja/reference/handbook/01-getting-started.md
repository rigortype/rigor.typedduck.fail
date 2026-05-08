---
title: "はじめに"
description: "rigortype/rigor docs/handbook/01-getting-started.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/01-getting-started.md"
sourcePath: "docs/handbook/01-getting-started.md"
sourceSha: "26fbbee4fa487b5e33e4e079ece835d2d79c79c93e12f9271f0ebf5204f5ef5e"
sourceCommit: "b523ab36d3e3e9b07f2ba2b1a4b842dadcd29b58"
translationStatus: "translated"
sidebar:
  order: 1001
---

## `rigor check`は何を見ているのか？

Rigorはプロジェクトの`.rb`ファイルを読み、各ファイルにフローセンシティブな型推論エンジンをかけ、利用可能な`sig/*.rbs`宣言を参照したうえで、限られた種類のバグを報告します:

- 受信側のクラスが間違っているメソッド呼び出し
- 引数の数が間違っているメソッド呼び出し
- 必ず例外を送出する算術（`5 / 0`）
- リファインされたパラメーター契約を満たさない引数の型
- そのほか、すべて[第8章 — エラーの読み方](../08-understanding-errors/)に列挙してあります。

重要なのは、RigorはRubyソースに型注釈を書くことを**要求しない**ことです。証明できる範囲だけ推論し、絞り込めない箇所では沈黙します。十分な静的情報があり確信をもって判断できるときだけ、診断を出します。

## 最小の動作セッション

プロジェクトのルートで次を実行します:

```sh
bundle exec rigor check lib
```

これで`lib/`以下のすべての`.rb`を辿り、診断を出力します。問題がなければ`No diagnostics`と表示されます。

単一ファイルだけを対象にしたいときは:

```sh
bundle exec rigor check path/to/file.rb
```

特定の位置でRigorが何を推論しているか確認したいときは:

```sh
bundle exec rigor type-of lib/foo.rb:10:5
```

これはRigorのリッチな型と、保守的なRBS消去（Rigor以外のRBSツールが見るであろう型）の両方を表示します。「この式はRigorからどう見えるか？」を確かめる最速の方法です。

## 診断の読み方

Rigorの診断はこのような形をしています:

```text
lib/user.rb:42:7: error: undefined method `upcas' for "alice" [call.undefined-method]
```

| 部分 | 意味 |
| --- | --- |
| `lib/user.rb:42:7` | ファイル、1始まりの行、1始まりの列 |
| `error` | 深刻度（`error` / `warning` / `info`） |
| `undefined method ...` | 人間向けのメッセージ |
| `[call.undefined-method]` | 修飾されたルール識別子 |

修飾ルール識別子は次の場面で使います:

- `# rigor:disable call.undefined-method`（行末でのインソース抑制）
- `.rigor.yml`の`disabled_rules:`キー
- `severity_overrides:`マップ（ルールを`:warning` / `:info`に下げたり、`:off`で無効化する）

ファミリー単位のワイルドカードも使えます: `# rigor:disable call`はその行の`call.*`ルールをすべて抑制します。ファミリーとルールの全リストは[第8章 — エラーの読み方](../08-understanding-errors/)にあります。

## 「注釈なし」のスタンス

多くの静的チェッカーはユーザーに型を注釈するよう求めます。Rigorは逆方向です — Rubyコードが何をしているかを見て、値そのものから型を**証明**します。簡単な例を3つ挙げます:

```ruby
n = 100
m = n + 1
assert_type(m, "Constant<101>")     # 算術がたたみ込まれる
```

```ruby
def kind(x)
  case x
  when Integer then :int
  when String  then :str
  end
end
assert_type(kind(7), "Constant<:int>")  # ナローイングが case をたたみ込む
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

推論で型を絞り込めないとき、エンジンは`Dynamic[Top]`（グラデュアルキャリア — 「任意のRuby値の可能性がある」）を返し、診断は出しません。Rigorは証明できない診断を勝手に作り出すことはありません。

## 推論だけでは足りないとき

3つの抜け道があります。よく使う順に並べると:

1. **`.rbs`ファイルを追加する**。署名を`sig/`に置けばRigorが自動的に拾います。ローカルの`def`から先が見えない理由として最も多いのがこれです — 解析器は外部のgemに対し、そのgemのRBSなしには内部を覗けません。
2. **既存のRBS署名を`RBS::Extended`で締める**。メソッドの`def ... -> ::String`の上に`%a{rigor:v1:return: non-empty-string}`のような注釈を足します。Rigorはリファインメントを認識しますが、通常のRBSツールはコメントとしてしか見ません。
3. **プラグインを書く**。プロジェクトに汎用解析器が知り得ないドメインDSL（`Lisp.eval`、`100.kilometers`、`transition_to(:foo)`など）があるなら、プラグインでRigorにそれを教えます。

詳細は第7章と第9章で扱います。多くのプロジェクトは（1）と（2）で十分です。

## 設定ファイルをひと巡り

`rigor init`は`.rigor.dist.yml`に初期設定を書き出します — これはコミット対象のプロジェクトデフォルトです:

```yaml
target_ruby: "3.4"

paths:
  - lib

# signature_paths: [sig]   # 省略時は自動検出されます

severity_profile: balanced

# severity_overrides:
#   call.argument-type-mismatch: warning

# disabled_rules: []

# plugins: []
```

最小限の有用な実行に設定ファイルは不要です — `rigor check lib`はそのままで動きます。設定ファイルは、追加の`paths`、別の`severity_profile`、プロジェクト全体のルール無効化、プラグインなど、デフォルト以外の挙動のために用意します。

### 2つのファイル名、暗黙のマージはしない

Rigorは次の優先順位で設定を自動検出し、**最初に見つかったファイル**を読みます:

| 優先度 | ファイル | 用途 |
| --- | --- | --- |
| 1 | `.rigor.yml` | 開発者ローカルのオーバーライド（通常はgitignoreする） |
| 2 | `.rigor.dist.yml` | プロジェクトデフォルト（リポジトリにコミット） |

**両方のファイルが暗黙にマージされることはありません** — 開発者が`.rigor.yml`を持っているなら、その実行ではそのファイルだけが設定の唯一のソースになります。プロジェクトデフォルトを明示的に拡張したい場合は、オーバーライド側で`includes:`にdistファイル（および必要なら他のファイル）を列挙します:

```yaml
# .rigor.yml
includes:
  - .rigor.dist.yml

# 自分のローカル追加:
disable:
  - call.undefined-method   # 作業中なので一旦無視
```

`includes:`は宣言順に処理され、後の内容が前の内容を上書きします**。現在のファイル**のキーはincludeされたすべてのファイルを上書きします。これはPHPStanが`.neon`設定で採用しているのと同じ形式です。

### パス解決のルール

パスを取るキー（`paths:`、`signature_paths:`、`plugins_io.allowed_paths:`、`includes:`）は、**そのキーを宣言しているファイルのディレクトリを基準**に解決されます。したがって`<project>/.rigor.dist.yml`の`paths: [lib]`は`<project>/lib`を意味し、同じ行を`<project>/sub/extra.yml`に書くと`<project>/sub/lib`を意味します。設定ファイルを別ディレクトリに動かしても影響を受けるのはそのファイル自身の相対パスだけで、include側のファイルが宣言したパスは影響を受けません。これは[PHPStanのパス解決ルール](https://phpstan.org/config-reference#paths)に倣ったものです。

`cache.path:`だけは例外で、ユーザーが書いた文字列をそのまま保持します。`--cache-stats` / `--clear-cache`のメッセージ表示でユーザーに値が返るため、プロジェクト相対表記のほうが読みやすいからです。

## 次に読むもの

第2章は、Rigorが型を表現するために使うキャリア（carrier）を紹介します。これがRigorを通常のRBSから区別するモデルの中核です。続く第3章（ナローイング）でキャリアが活きてきます — キャリアは値を記述し、ナローイングは制御フローが`if` / `case` / 述語メソッドを通過するときにキャリアがどう変化するかを記述します。
