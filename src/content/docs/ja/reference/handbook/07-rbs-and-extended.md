---
title: "RBSと`RBS::Extended`"
description: "rigortype/rigor docs/handbook/07-rbs-and-extended.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/07-rbs-and-extended.md"
sourcePath: "docs/handbook/07-rbs-and-extended.md"
sourceSha: "adcc13413121eb66941dd2e88a760618ccfe787c3da86e9224da283665b7395a"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 1007
---

Rigorの推論が型を証明できないとき、次の逃げ道はRBS — Rubyのシグネチャ言語 — です。RBSが求める精密な契約（contract）を表現できないとき、`RBS::Extended`がその上に小さなアノテーション表面を追加します。

この章では、通常手を伸ばす順序でその両方を扱います。

## RBSが必要なとき

以下の場合にRBSファイルを追加する必要があるでしょう:

- メソッド本体の戻り値型が、Rigorのバンドルされたstdlibがカバーしていない外部gemに依存している。
- 引数シェイプ（shape）エラーに対して`call.argument-type-mismatch`を発火させたい（インソース`def`はパラメータ契約を強制しません; RBS宣言メソッドのみが強制します）。
- 本体の推論された戻り値が宣言された戻り値からずれたときに`def.return-type-mismatch`を発火させたい。
- 将来のRBS対応ツール（Steep、ruby-lsp）が同じファイルを読んで、契約から恩恵を受けるでしょう。

以下の場合はRBSが**不要**でしょう:

- メソッドがプロジェクトのプライベートで、本体が短く、Rigorがすでに正しい戻り値型を推論している。
- メソッドがすでにシグを持つメソッドのラッパーに過ぎない（Rigorは本体を辿って伝播する）。

## 最初のシグ

新しいプロジェクトで:

```text
my-app/
├── lib/
│   └── slug.rb
└── sig/
    └── slug.rbs       # ← あなたのシグ
```

```ruby
# lib/slug.rb
class Slug
  def normalise(id)
    id.downcase.gsub(/\s+/, "-")
  end
end
```

```ruby
# sig/slug.rbs
class Slug
  def normalise: (String) -> String
end
```

`.rbs`ファイルを`sig/`に置けばRigorが自動的に拾います — `.rigor.yml`の変更は不要です。デフォルト設定には`signature_paths: [sig]`があります。

その後、このコード:

```ruby
Slug.new.normalise(42)
```

は`call.argument-type-mismatch`を発火させます: `42`はIntegerで、パラメータは`String`です。

## RBSシェイプが広すぎるとき

Slugの例のランタイムは常に非空の小文字文字列を返しますが、RBSシグは`String`としか言っていません。Rigorにより狭い事実を知らせたい場合、`RBS::Extended`アノテーションを付けます:

```ruby
class Slug
  %a{rigor:v1:return: non-empty-lowercase-string}
  def normalise: (String) -> String
end
```

これで:

```ruby
s = Slug.new.normalise("Hello World")
# s: non-empty-lowercase-string
s.empty?     # Constant<false>  — 証明済み
s.size       # positive-int     — 証明済み
s == "hello-world"  # bool — 等値ナローイングが適用される
```

`.rbs`ファイルは**依然として有効なRBS**です — `%a{...}`はRBSアノテーション構文です。Steep / typeprof / ruby-lspはコメントとして見ます; Rigorは締め付けとして見ます。

## ディレクティブ文法

`RBS::Extended`は[`docs/type-specification/rbs-extended.md`](../../type-specification/rbs-extended/)にあります。5つのディレクティブ:

| ディレクティブ | 意味 |
| --- | --- |
| `%a{rigor:v1:return: <type>}` | メソッドの戻り値型を締め付ける。 |
| `%a{rigor:v1:param: <name> is <type>}` | 呼び出し元でのパラメータの受け入れ型を締め付け、かつ本体内のローカル変数をナローイング（narrowing）する。 |
| `%a{rigor:v1:assert: <name> is <type>}` | このメソッドが返った後、呼び出し元スコープの名前付きローカル変数は`<type>`である。 |
| `%a{rigor:v1:predicate-if-true: <name> is <type>}` | このメソッドが真値を返したとき、呼び出し元スコープの名前付きローカル変数は`<type>`である。（対称な`predicate-if-false`。） |
| `%a{rigor:v1:assertion-on: <name>}` | メソッドをアサーションゲートとしてマークする — 本体の最後の式の型が`<name>`に関する事実になる。 |

`<type>`スロットは以下を受け入れます:

- **RBSクラス名** — `String`、`Integer`、`::Foo::Bar`。
- **インポートされたリファインメント（refinement、篩型とも）名** — `non-empty-string`、`lowercase-string`、`numeric-string`、`int<5, 10>`、`non-empty-array[Integer]`、`literal-string`など。
- **否定`~T`** — `~lowercase-string`は「非小文字string」を意味します。

## リファインメント名

完全なカタログは[`docs/type-specification/imported-built-in-types.md`](../../type-specification/imported-built-in-types/)にあります。短いリファレンス:

| ファミリー | 名前 |
| --- | --- |
| 空/非空 | `non-empty-string`、`non-empty-array[T]`、`non-empty-hash[K, V]` |
| 整数範囲 | `positive-int`、`non-negative-int`、`negative-int`、`non-positive-int`、`non-zero-int`、`int<min, max>` |
| 文字列述語 | `lowercase-string`、`uppercase-string`、`numeric-string`、`decimal-int-string`、`octal-int-string`、`hex-int-string`、`literal-string` |
| ペアになった補完 | `non-lowercase-string`、`non-uppercase-string`、`non-numeric-string` |
| 合成 | `non-empty-lowercase-string`、`non-empty-uppercase-string`、`non-empty-literal-string` |
| シェイプ射影 | `pick_of[T, K]`、`omit_of[T, K]`、`partial_of[T]`、`required_of[T]`、`readonly_of[T]` — 既存の`HashShape`/`Tuple`から新しいキャリア（carrier）を派生させます。[第4章 §「新しいシェイプを派生させる」](../04-tuples-and-shapes/#deriving-new-shapes--pick_of--omit_of--partial_of--required_of--readonly_of)を参照。 |

## 実例: アサーションゲート

```ruby
class Validator
  %a{rigor:v1:assert: x is non-empty-string}
  def assert_non_empty: (String x) -> void
end
```

```ruby
def configure(host)
  Validator.new.assert_non_empty(host)
  # この呼び出し後、host: non-empty-string
  host.size   # positive-int — 証明済み
end
```

ランタイム側は`assert_non_empty`が何をするかです（空のとき例外、ログなど）— Rigorはディレクティブのみを読みます。

## 実例: 型述語

```ruby
class Range
  %a{rigor:v1:predicate-if-true: value is Integer}
  def integer?: (untyped value) -> bool
end
```

```ruby
def double_if_int(value)
  if (1..10).integer?(value)
    # 真値ブランチでvalue: Integer
    value * 2
  else
    value
  end
end
```

これは、エンジンの組み込み`is_a?` / `nil?`ルールが認識できないカスタム型述語メソッドについてRigorに教えるためのサポートされた方法です。

## 実例: パラメータオーバーライド

```ruby
class Slug
  %a{rigor:v1:param: id is non-empty-string}
  def normalise: (String id) -> String
end
```

これには2つの効果があります:

1. **呼び出し元チェック**。`Slug.new.normalise("")`は`Constant<"">`が`non-empty-string`を満たさないため、`call.argument-type-mismatch`になります。
2. **本体側ナローイング**。`normalise`のメソッド本体内側で、パラメータ`id`は`non-empty-string`です。したがって`id.empty?`は`Constant<false>`に還元され、`id.size`は`positive-int`に還元されます。

## ランタイムが強制できないパラメータオーバーライドが必要なとき

ランタイム関数が不正な入力で例外を投げない場合 — nilを返す、デフォルトを返す、またはエラーを飲み込む — があります。Rigorの`param:`ディレクティブは依然として呼び出し元の契約を締め付けます:

```ruby
class FileLoader
  %a{rigor:v1:param: path is non-empty-string}
  def load: (String path) -> String?
end
```

`FileLoader.new.load("")`は、ランタイムで`load`が穏やかに失敗するにもかかわらず、`call.argument-type-mismatch`を発火させます。ディレクティブは「本体が何を強制するか」ではなく**「呼び出し元が何を渡すべきか」**を表現します。

## アノテーションの置き場所

`RBS::Extended`アノテーションは、それが絞り込む`def`と同じ`.rbs`ファイル内の同じ`def`の上に置きます。メソッドの上にグループ化します:

```ruby
class Slug
  %a{rigor:v1:return: non-empty-string}
  %a{rigor:v1:param: id is non-empty-string}
  def normalise: (String id) -> String
end
```

これらの`%a{rigor:v1:…}`ディレクティブを`.rb`ファイルの内側に置くことは**できません**。ディレクティブはRBSから読まれたときのみ発火します — これは設計上の選択です（ADR-5、堅牢性の原則: 戻り値に対して厳密、パラメータに対して寛大を参照）。

## RubyソースへのインラインRBS — `rigor-rbs-inline`プラグイン

オプトイン型の別プラグインを使うと、Rubyファイル内の`def`の直上にメソッド型を直接書けます。上流の[rbs-inline](https://github.com/soutaro/rbs-inline)が定義するコメント語彙を使います:

```rb
# rbs_inline: enabled

class AscDesc
  # @rbs asc_or_desc: :asc | :desc
  def ascdesc(asc_or_desc)
    asc_or_desc
  end
end

AscDesc.new.ascdesc(:bad)
# => error: argument type mismatch at parameter `asc_or_desc' of
#    `ascdesc' on AscDesc: expected :asc | :desc, got :bad
```

docスタイルの`# @rbs name: T`アノテーション、インラインメソッド型コメント`#: () -> T`、`# @rbs return: T`、属性`#:`キャスト、`# @rbs @ivar: T`、`# @rbs override`、`# @rbs!`生RBS埋め込みのいずれも動作します——上流rbs-inlineが受け入れるものはすべて、手書きの`.rbs`ファイルと同等の形でRigorのRBS環境に流れ込みます。

これは**RBS::Extendedではありません**。`# @rbs`コメントは上流rbs-inlineの文法であり、プラグインがenv構築時にそれらを通常のRBSにトランスクライブします。これに対しRBS::Extendedの`%a{rigor:v1:…}`ディレクティブはRigor固有のアノテーションであり`.rbs`ファイルに記述します（その他のディレクティブについてはこの章の残りを参照）。

有効にするには、プラグインgemをbundleに追加し、以下のように設定します:

```yaml
# .rigor.yml
plugins:
  - rigor-rbs-inline
```

ファイルごとに、先頭に上流の`# rbs_inline: enabled`マジックコメントを書いてオプトインします——それがないファイルは影響を受けません。

注意事項:

- コアの`rigortype`アナライザーはゼロランタイム依存のまま（ADR-0）。`rbs-inline`上流ライブラリはコアのgemspecではなくプラグインgemの依存関係なので、オプトインしないプロジェクトは何も支払いません。
- 裸のトップレベル`def`は上流rbs-inlineを通じてRBS出力を生成しません。アノテーションを有効にするには、メソッド定義をクラスまたはモジュールでラップしてください。
- rbs-inlineのパース失敗は`source-rbs-synthesis-failed` `:info`診断として表面化し、そのファイルはインラインRBSの貢献なしにフォールバックして解析が続行されます。

完全なプラグインドキュメント、設定オプション（ブラウザプレイグラウンドが使用する`require_magic_comment: false`ホストコンテキストオーバーライドを含む）、キャッシュの契約については[`plugins/rigor-rbs-inline/README.md`](../../plugins/rigor-rbs-inline/)を参照してください。

## `untyped`へのフォールバック

メソッドのシグネチャにRBSが表現できない型が含まれる場合、保守的な対処は`untyped`です:

```ruby
def deserialize: (String) -> untyped
```

`untyped`は契約フリーのハッチ — あらゆるメソッドがそれに存在し、あらゆる引数シェイプが受け入れられます。Rigorの診断は`untyped`レシーバーに対して沈黙します。正当に動的な境界（デシリアライズ、`eval`、プラグインエントリーポイント）に使います。失う静的解析は「これは何でもあり得る」と認めることの誠実さで補われます。

## PHPStanから来た方へ — `@phpstan-assert`ファミリー

PHPStanのPHPDocアノテーションに慣れている場合、RigorのRBS::Extendedディレクティブは、PHPStanが「アサート」や「型指定関数」と呼ぶポストリターン / 条件付きナローイングのプリミティブに直接マッピングされます。挙動は同一です:

> 「このメソッドが返した後、名前付き引数は`T`です。」

PHPStanでは`@phpstan-assert`、Rigorでは`%a{rigor:v1:assert:}`です。

| PHPStan PHPDoc | Rigor RBS::Extended | 効果 |
| --- | --- | --- |
| `@phpstan-assert T $x` | `%a{rigor:v1:assert: x is T}` | このメソッドが正常に返った後、呼び出し元の`x`は`T`。 |
| `@phpstan-assert-if-true T $x` | `%a{rigor:v1:predicate-if-true: x is T}` | このメソッドが真値を返した場合、呼び出し元の`x`は`T`。 |
| `@phpstan-assert-if-false T $x` | `%a{rigor:v1:predicate-if-false: x is T}` | このメソッドが偽値を返した場合、呼び出し元の`x`は`T`。 |
| `@phpstan-assert !T $x` | `%a{rigor:v1:assert: x is ~T}` | このメソッドが返った後、呼び出し元の`x`は`T`**ではない**（否定形式）。 |
| `@phpstan-assert-if-true !T $x` | `%a{rigor:v1:predicate-if-true: x is ~T}` | 条件付き否定。`predicate-if-false`と対称。 |

実践例 — PHPStanのドキュメントからの典型的な「assertNotNull」パターン:

```rbs
# sig/asserts.rbs
class Asserts
  %a{rigor:v1:assert: x is ~nil}
  def self.not_nil: (untyped x) -> void
end
```

```ruby
# lib/configure.rb
def configure(maybe)
  Asserts.not_nil(maybe)
  # maybe: (~nil)、ナローイングされた型で.upcaseが解決される
  maybe.upcase
end
```

selfターゲット形式もサポートされています — PHPStanのアナログは`$this`をナローイングするメソッドになります。レシーバーを`self`で名指しします:

```rbs
class Connection
  %a{rigor:v1:assert: self is Connected}
  def assert_connected!: () -> void
end
```

RigorのディレクティブのグラマーはPHPStanが`@phpstan-assert*`ファミリーで提供するものをカバーします。ディレクティブは**RBSからのみ**発火します（ADR-5に従い: 戻り値では厳格に、パラメータでは寛容に）; PHPStan側では関数のすぐ上のPHPDocに`@phpstan-assert`を直接書けます — Rigorでの等価表現は同じRBSファイルの`def`行です。

**コールシェイプ**によってアサーションを認識するプラグイン側の等価表現が必要な場合（PHPStanの「型指定拡張」）は[第9章](09-plugins/)を参照してください。プラグイン契約はディレクティブが使うのと同じ`Fact(target_kind: :self)`と`Fact(target_kind: :parameter)`キャリアを提供しているため、プラグイン作者はRubyからPHPStanの`StaticMethodTypeSpecifyingExtension`に相当するものを書けます。

## RBSが助けにならないとき — プラグインの逃げ道

メソッドの動作が**ランタイムでの引数のシェイプに依存する**場合（`Lisp.eval([:+, 1, 2])`はIntegerを返すが、`Lisp.eval([:<, 1, 2])`はboolを返す）、どんなRBSシグもその関係を表現できません。それがプラグインのためのものです — [第9章](../09-plugins/)と[examples/](https://github.com/rigortype/rigor/blob/master/examples/README.md)ディレクトリを参照してください。

## 次に読むもの

第8章はルールカタログを扱います — 各診断の意味、発火するタイミング、それが間違いまたはノイズのときの抑制方法。
