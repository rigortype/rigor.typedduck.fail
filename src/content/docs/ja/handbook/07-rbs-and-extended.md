---
title: "RBSと`RBS::Extended`"
description: "rigortype/rigor docs/handbook/07-rbs-and-extended.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/07-rbs-and-extended.md"
sourcePath: "docs/handbook/07-rbs-and-extended.md"
sourceSha: "1f2328a38b06ca0a2a33248ab4355d7d2688d18ad7120aae974b0805d0fbd5a1"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 1007
---

Rigorの推論が型を証明できないとき、次の逃げ道はRBS（Rubyのシグネチャ言語）です。RBSが求める精密な契約（contract）を表現できないとき、`RBS::Extended`がその上に小さなアノテーション表面を追加します。

この章では、通常手を伸ばす順序でその両方を扱います。

## RBSが必要なとき

以下の場合にRBSファイルを追加する必要があるでしょう:

- メソッド本体の戻り値型が、Rigorのバンドルされたstdlibがカバーしていない外部gemに依存している。
- 引数シェイプ（shape）エラーに対して`call.argument-type-mismatch`を発火させたい（インソース`def`はパラメータ契約を強制しません; RBS宣言メソッドのみが強制します）。
- 本体の推論された戻り値が宣言された戻り値からずれたときに`def.return-type-mismatch`を発火させたい。
- 将来のRBS対応ツール（Steep、ruby-lsp）が同じファイルを読んで、契約から恩恵を受けるでしょう。

以下の場合はRBSが**不要**でしょう:

- メソッドがプロジェクトのプライベートで、本体が短く、Rigorがすでに正しい戻り値型を推論している。
- メソッドがすでにシグを持つメソッドのラッパーである（Rigorは本体を辿って伝播する）。

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

`.rbs`ファイルを`sig/`に置けばRigorが自動的に拾います。`.rigor.yml`の変更は不要です。デフォルト設定には`signature_paths: [sig]`があります。

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
s.empty?     # Constant<false>（証明済み）
s.size       # positive-int（証明済み）
s == "hello-world"  # bool（等値ナローイングが適用される）
```

`.rbs`ファイルは**依然として有効なRBS**です。`%a{...}`はRBSアノテーション構文です。Steep / typeprof / ruby-lspはコメントとして見ます; Rigorは締め付けとして見ます。

## ディレクティブ文法

メソッド単位のディレクティブは7つあり、それらが運ぶ事実が*いつ*真になるかで分かれます: `return:`と`param:`はシグネチャそのものを型付けし直し、`predicate-if-true` / `predicate-if-false`は条件の分岐をまたいで変数をナローイング（narrowing）し、`assert` / `assert-if-true` / `assert-if-false`は呼び出しが返った後に1つをナローイングします。それぞれは、絞り込む対象の`def`の上に置く1つの`%a{rigor:v1:…}`アノテーションです;スタックでき、順序は問いません。

網羅的な表 ── すべてのディレクティブ、そのペイロード構文、そして`<type>`スロットが受け入れるもの（RBSクラス名、リファインメント（refinement、篩型とも）ペイロード、パラメータ化形式と境界付き形式、そして`~T`否定が許される箇所と許されない箇所）── は[マニュアル: RBS::Extendedアノテーション](../../manual/16-rbs-extended-annotations/#メソッド単位のディレクティブ)にあります;競合・マージ・由来に関する規範的なルールは[`docs/type-specification/rbs-extended.md`](../../type-specification/rbs-extended/)です。

この章の残りでは、ディレクティブを1つずつ例を挙げて説明していきます。

## リファインメント名

完全なカタログは[`docs/type-specification/imported-built-in-types.md`](../../type-specification/imported-built-in-types/)にあります。短いリファレンス:

| ファミリー | 名前 |
| --- | --- |
| 空/非空 | `non-empty-string`、`non-empty-array[T]`、`non-empty-hash[K, V]` |
| 整数範囲 | `positive-int`、`non-negative-int`、`negative-int`、`non-positive-int`、`non-zero-int`、`int<min, max>` |
| 文字列述語 | `lowercase-string`、`uppercase-string`、`numeric-string`、`decimal-int-string`、`octal-int-string`、`hex-int-string`、`literal-string` |
| ペアになった補完 | `non-lowercase-string`、`non-uppercase-string`、`non-numeric-string` |
| 合成 | `non-empty-lowercase-string`、`non-empty-uppercase-string`、`non-empty-literal-string` |
| シェイプ射影 | `pick_of[T, K]`、`omit_of[T, K]`、`partial_of[T]`、`required_of[T]`、`readonly_of[T]`。これらは既存の`HashShape`/`Tuple`から新しいキャリア（carrier）を派生させます。[第4章 §「新しいシェイプを派生させる」](../04-tuples-and-shapes/#deriving-new-shapes--pick_of--omit_of--partial_of--required_of--readonly_of)を参照。 |

## 適合を宣言する: `conforms-to`

上記のディレクティブは`def`に付きます。もう1つは`class` / `module`宣言に付き、クラス全体が名前付きの構造的インターフェースを満たすことを表明します:

```rbs
%a{rigor:v1:conforms-to _RewindableStream}
class MyBuffer
  def read: (Integer) -> String
  def rewind: () -> void
end
```

`MyBuffer`が`_RewindableStream`インターフェースの要求するメソッドを欠いている場合、Rigorは`rbs_extended.unsatisfied-conformance`を報告します;インターフェースを満たすクラスは沈黙します。

これに手を伸ばす理由は、Rigorが構造的インターフェースを必要とする位置に値が流れ込むところではどこでも、構造的互換性を*暗黙に*すでにチェックしているからです ── つまり、現在どこにも渡されていないクラスはまったくチェックされません。`conforms-to`はこの契約を、呼び出し箇所がそれを行使するかどうかに関わらず成り立つ設計アサーションに変えます。これは、構造的なシェイプこそが要点であるときにライブラリが求めるものです。これは純粋に追加的です: それを付けたからといって、以前に型チェックを通っていたものが通らなくなることはありません。スタックと診断のセマンティクスは[マニュアル: `conforms-to`](../../manual/16-rbs-extended-annotations/#conforms-to-チェック付きの構造的契約)にあります。

## メソッドが*何をするか*を制限する: エフェクトエンベロープ

ここまでのディレクティブはどれも、メソッドが何を返すかを記述します。メソッドが*何をするか*を記述するものが1つあります:

```rbs
class UserRepository
  %a{rigor:v1:effect io.db}
  def find: (Integer) -> User

  %a{pure}
  def slug: (String) -> String
end
```

`%a{rigor:v1:effect io.db}`は「このメソッドはデータベースに触れてよいが、ボキャブラリーが名指しする他の何にも触れない」と言います。`%a{pure}`は「何もしない」と言います —— これはrbs自身の純粋性アノテーションで、Steepが既に読んでいるものなので、Rigorは同義語を発明するのではなく既存の綴りを尊重します。どちらも、メソッド自身が確保して決して外に出さないオブジェクトの変更は許容するので、`%a{pure}`のメソッドでもローカルな配列を組み立てて埋めることはできます。

ペイロードは、[effect-labels.md](../../type-specification/effect-labels/)のボキャブラリーから取った、素のラベルのカンマ区切りリストです（`%a{rigor:v1:effect io.db, nondet.time}`）。代わりに`class`や`module`宣言にアノテーションを書けば、そのクラスのすべてのメソッドに適用されます —— 再オープンや`attr_writer`が生成したメソッドも含みますが、サブクラスには決して及びません。自前のエンベロープを持つメソッドはそれを保ちます;最も近いものが勝ちます。

境界はメソッドの*コード*全体をカバーし、そのメソッドが呼ぶものも含みます。`io.db`と宣言された`find`がヘルパー経由でHTTPリクエストに到達すればエンベロープを超えており、Rigorはそう言います —— Rubyの`def`の位置で、たどった経路を名指しして:

```text
lib/user_repository.rb:12: warning: Method UserRepository#find
performs io.net.http (Net::HTTP.get via PaymentGateway#charge),
but is declared %a{rigor:v1:effect io.db} at sig/repo.rbs:3,
so io.net.http exceeds the envelope.
```

しないことが2つあります。単に*疑わしい*だけのエフェクトは決して報告しません: Rigorが解決できなかった呼び出しはサマリーを「and possibly more（そしておそらくそれ以上）」と読ませますが、「おそらく」は指摘ではありません。そして、あなたが求めない限りこれらは何も起きません —— このチェックには`.rigor.yml`の`effects:`ブロックが必要なので、Steepのためにシグネチャに既に置いてある`%a{pure}`は、あなたがオプトインするまで不活性のままです。`effects.check: false`を設定すれば、`rigor effects`レポートとそのスナップショットは保ったまま診断を黙らせられます。不活性は言及なしと同じではありません: `effects:`ブロックのないアノテーションはランごとに1件の[`effect.annotations-unchecked`](../../manual/04-diagnostics/#rule-effect-annotations-unchecked)（`:info`）を受け取るので、誰もチェックしない境界が見過ごされることはありません。

ラベルの綴りを間違えても、アノテーションはRigorが認識した部分にナローイングされはしません —— タグ**全体**が無制限として読まれるので、タイポが正しいコードに対する指摘に化けることは決してありません。それは、あなたが持っているつもりだった契約の静かな喪失になるので、綴りが明らかにラベルのつもりである場合にはRigorはそう言います: [`effect.unknown-label`](../../manual/04-diagnostics/#rule-effect-unknown-label)を、あなたが書いた行に、最も近い実在のラベルを名指しして。ボキャブラリーの何にも似ていない語は沈黙のままです —— あなたは自前のルートを開こうとしているのかもしれないからです。

機能の全体 —— ラベルのボキャブラリー、コミット対象のエフェクトスナップショット、そして`rigor effects`自身 —— は[ADR-103](../../adr/103-effect-labels/)です;まずは[`rigor effects`](../../manual/02-cli-reference/#rigor-effects)から始めてください。

## 実例: アサーションゲート

```ruby
class Validator
  %a{rigor:v1:assert x is non-empty-string}
  def assert_non_empty: (String x) -> void
end
```

```ruby
def configure(host)
  Validator.new.assert_non_empty(host)
  # この呼び出し後、host: non-empty-string
  host.size   # positive-int（証明済み）
end
```

ランタイム側は`assert_non_empty`が何をするかです（空のとき例外、ログなど）。Rigorはディレクティブのみを読みます。

## 実例: 否定のアサート

アサーションのペイロードは`~T`で否定できます。これは、どんなコードベースにも育つ「これはもう確実にnilではない」というヘルパーをモデル化する方法です:

```rbs
# sig/asserts.rbs
class Asserts
  %a{rigor:v1:assert x is ~nil}
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

ターゲットはレシーバー自身にもできます ── `self`で名指しすれば、事実はメソッドが呼び出されたオブジェクトに届きます:

```rbs
class Connection
  %a{rigor:v1:assert self is Connected}
  def assert_connected!: () -> void
end
```

PHPDocの`@phpstan-assert`ファミリーがこのすべてのメンタルモデルなら、読み方はほぼ一対一です;マッピング表は[付録: PHPStanから来た人へ](../appendix-phpstan/#phpstan-assertファミリー)にあります。

## 実例: 型述語

```ruby
class Range
  %a{rigor:v1:predicate-if-true value is Integer}
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

ランタイム関数が不正な入力で例外を投げない場合（nilを返す、デフォルトを返す、またはエラーを飲み込む）があります。Rigorの`param:`ディレクティブは依然として呼び出し元の契約を締め付けます:

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

これらは、rbs-inlineの`# @rbs %a{…}`コメントとして**`.rb`ファイル内に**書くこともできます:

```rb
# rbs_inline: enabled

class Slug
  # @rbs %a{rigor:v1:return: non-empty-string}
  # @rbs id: String
  # @rbs return: String
  def normalise(id) = id.strip
end
```

`%a{}`は*rbs-inline自身の*文法であってRigorの方言ではなく、アノテーションは通常の経路でRigorに届きます: rbs-inlineのライターがそれを生成するシグネチャへそのままコピーし、そのシグネチャはあなたの`sig/`ツリーが着地するのと同じRBS環境に合流します。つまりこれはディレクティブ単位の機能ではありません —— どのバッファから届いたものであれ、すべての`RBS::Extended`ディレクティブは同じアノテーションオブジェクトから読まれます —— 上のエフェクトエンベロープ（`%a{pure}`、`%a{rigor:v1:effect …}`）も含めて。これらを読むにはrbs-inlineライブラリが必要で、インストールされていればRigorはデフォルトで取り込みます（[ADR-93](../../adr/93-default-rbs-inline-ingestion/)）。

Rigorが提供**しない**のはRigor専用のコメント方言です —— `# rigor:effect`ディレクティブも、ファイルプラグマもありません。`# rigor:`コメントファミリーは抑制専用（`disable`、`disable-file`）のままです。アプリケーションコードがRigor固有の構文を運ばなければならないことは決してありません（[ADR-0](../../adr/0-concept/)）;望むなら使ってよいupstreamのアノテーション形式は、要件とは別物です。

## RubyソースへのインラインRBS: `rigor-rbs-inline`プラグイン

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

docスタイルの`# @rbs name: T`アノテーション、インラインメソッド型コメント`#: () -> T`、`# @rbs return: T`、属性`#:`キャスト、`# @rbs @ivar: T`、`# @rbs override`、`# @rbs!`生RBS埋め込みのいずれも動作します。上流rbs-inlineが受け入れるものはすべて、手書きの`.rbs`ファイルと同等の形でRigorのRBS環境に流れ込みます。

これは**RBS::Extendedではありません**。`# @rbs`コメントは上流rbs-inlineの文法であり、プラグインがenv構築時にそれらを通常のRBSにトランスクライブします。これに対しRBS::Extendedの`%a{rigor:v1:…}`ディレクティブはRigor固有のアノテーションであり`.rbs`ファイルに記述します（その他のディレクティブについてはこの章の残りを参照）。

有効にするには、プラグインgemをbundleに追加し、以下のように設定します:

```yaml
# .rigor.yml
plugins:
  - rigor-rbs-inline
```

ファイルごとに、先頭に上流の`# rbs_inline: enabled`マジックコメントを書いてオプトインします。それがないファイルは影響を受けません。

注意事項:

- コアの`rigortype`アナライザーはゼロランタイム依存のまま（ADR-0）。`rbs-inline`上流ライブラリはコアのgemspecではなくプラグインgemの依存関係なので、オプトインしないプロジェクトは何も支払いません。
- 裸のトップレベル`def`は上流rbs-inlineを通じてRBS出力を生成しません。アノテーションを有効にするには、メソッド定義をクラスまたはモジュールでラップしてください。
- rbs-inlineのパース失敗は`source-rbs-synthesis-failed` `:info`診断として表面化し、そのファイルはインラインRBSの貢献なしにフォールバックして解析が続行されます。

完全なプラグインドキュメント、設定オプション（ブラウザプレイグラウンドが使用する`require_magic_comment: false`ホストコンテキストオーバーライドを含む）、キャッシュの契約については[`plugins/rigor-rbs-inline/README.md`](../../manual/plugins/rigor-rbs-inline/)を参照してください。

## `untyped`へのフォールバック

メソッドのシグネチャにRBSが表現できない型が含まれる場合、保守的な対処は`untyped`です:

```ruby
def deserialize: (String) -> untyped
```

`untyped`は契約フリーのハッチです。あらゆるメソッドがそれに存在し、あらゆる引数シェイプが受け入れられます。Rigorの診断は`untyped`レシーバーに対して沈黙します。正当に動的な境界（デシリアライズ、`eval`、プラグインエントリーポイント）に使います。失う静的解析は「これは何でもあり得る」と認めることの誠実さで補われます。

## RBSが助けにならないとき: プラグインの逃げ道

メソッドの動作が**ランタイムでの引数のシェイプに依存する**場合（`Lisp.eval([:+, 1, 2])`はIntegerを返すが、`Lisp.eval([:<, 1, 2])`はboolを返す）、どんなRBSシグもその関係を表現できません。それがプラグインのためのものです。[第9章](../09-plugins/)と[examples/](https://github.com/rigortype/rigor/blob/master/examples/README.md)ディレクトリを参照してください。

## 次に読むもの

第8章は診断を読むことについてです ── 各ルールファミリーが何を主張するか、期待していないときになぜ1つが発火するか、そして静かにしたいときにどのレイヤーに手を伸ばすか。
