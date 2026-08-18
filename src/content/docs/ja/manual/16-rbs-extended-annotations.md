---
title: "RBS::Extendedアノテーション"
description: "rigortype/rigor docs/manual/16-rbs-extended-annotations.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/16-rbs-extended-annotations.md"
sourcePath: "docs/manual/16-rbs-extended-annotations.md"
sourceSha: "48ca1377d484ae48763604c730197d56ab88493726f2db97929e1e93893caa8b"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 9016
---

素のRBSは、メソッドが`String`を返すと言えます。しかし、*空でない*文字列を返すとは言えませんし、述語が真分岐で引数をナローイングするとも、クラスが構造的インターフェースをチェック付きの契約として満たすことを意図しているとも言えません。Rigorはその追加情報を**`RBS::Extended`アノテーション（annotation）**（予約された`rigor:v1:`キー配下の通常のRBS `%a{...}`アノテーション）から読み取ります。そのため、RBSを離れることなく、また（アノテーションを保持または無視する）他のどのRBSツールも壊すことなく、シグネチャを先鋭化できます。

これらは`*.rbs`ファイルの中で、それらが精緻化するメソッドまたはクラスの宣言の上に書きます:

```ruby
%a{rigor:v1:return: non-empty-string}
def read_name: () -> String
```

素の`() -> String`は互換性のための契約のままです;アノテーションは、戻り値が空でない文字列だとRigorに伝えます。

これらはどれも、rbs-inlineの`# @rbs %a{…}`コメントとして**`.rb`ファイル内に**書くこともできます —— `%a{}`はrbs-inline自身のupstream文法であり、アノテーションは生成されるシグネチャと同じ経路でRigorに届きます:

```rb
# rbs_inline: enabled

class Reader
  # @rbs %a{rigor:v1:return: non-empty-string}
  # @rbs return: String
  def read_name = "x"
end
```

これには`rbs-inline`ライブラリのインストールが必要です;インストールされていれば、Rigorはインラインアノテーションをデフォルトで取り込みます（[ADR-93](../../adr/93-default-rbs-inline-ingestion/)）。Rigor専用のコメント方言はありません: `# rigor:`コメントは引き続き抑制専用です。

このページは*運用上*のリファレンス（書けるディレクティブとその構文）です。規範的なルール（衝突の扱い、マージ、由来）については[`docs/type-specification/rbs-extended.md`](../../type-specification/rbs-extended/)を、型モデルのウォークスルーについては[ハンドブック第7章](../../handbook/07-rbs-and-extended/)を参照してください。

## メソッド単位のディレクティブ

各ディレクティブは、適用先の`def`のすぐ上に書く1つの`%a{rigor:v1:<directive> …}`アノテーションです。1つのメソッドに複数のディレクティブを積み重ねられます;それらは順序に依存せず合成されます。

| ディレクティブ | 効果 |
| --- | --- |
| `rigor:v1:return: T` | RBS宣言された戻り値型を、すべての呼び出しサイトで`T`に上書きする。 |
| `rigor:v1:param: name [is] T` | パラメータ`name`を`T`に絞り込む（オーバーロード選択／引数チェックの時点*と*、推論中のメソッド本体の内側の両方で）。`is`というつなぎ語は任意。 |
| `rigor:v1:predicate-if-true target is T` | 呼び出しが条件として使われるとき、**真**分岐で`target`を`T`に絞り込む。 |
| `rigor:v1:predicate-if-false target is T` | **偽**分岐で`target`を`T`に絞り込む。 |
| `rigor:v1:assert target is T` | メソッドが正常にリターンした後で`target`を絞り込む。 |
| `rigor:v1:assert-if-true target is T` | メソッドが真値を返したとき`target`を絞り込む。 |
| `rigor:v1:assert-if-false target is T` | メソッドが`false`または`nil`を返したとき`target`を絞り込む。 |

`target`は、メソッド自身のシグネチャにあるRBSの*パラメータ名*、またはリテラルの`self`です。引数を参照するには、RBSメソッド型がそれに名前を付けていなければなりません（`(untyped)`ではなく`(untyped value)`）。

### 述語: ガードを通したナローイング

述語は、ある変数をテストするメソッドの分岐をまたいでその変数をナローイングするよう、Rigorに教えます。TypeScriptの型ガードやPythonの`TypeGuard` / `TypeIs`に相当します。真分岐のファクトだけで`TypeGuard`スタイルのナローイングには十分です;両方の分岐を与えると`TypeIs`スタイルのナローイングになります。

```ruby
%a{rigor:v1:predicate-if-true value is String}
%a{rigor:v1:predicate-if-false value is ~String}
def string?: (untyped value) -> bool

%a{rigor:v1:predicate-if-true self is LoggedInUser}
def logged_in?: () -> bool
```

`if string?(x)`の後、Rigorは`then`分岐で`x`を`String`として型付けします;`else`分岐では、`~String`という否定のファクトが、その型から`String`を取り除きます。

### アサーション: 呼び出し後のナローイング

アサーションは、PHPStanが`assert`スタイルのヘルパーをモデル化するのと同じように、呼び出しがリターンした*後で*変数をナローイングします。ファクトが成り立たない限り例外を投げるメソッドには`assert`を、戻り値がそのファクトを運ぶメソッドには`assert-if-true` / `assert-if-false`を使います。

```ruby
%a{rigor:v1:assert value is String}
def assert_string!: (untyped value) -> void

%a{rigor:v1:assert-if-true value is String}
def valid_string?: (untyped value) -> bool
```

`assert_string!(x)`がリターンした後、`x`は残りのスコープで`String`になります。

## ペイロード型の文法

`return:`、`param:`、`assert*`、`predicate-if-*`の右辺は、次のいずれかを受け付けます:

- **RBSクラス名**: `String`、`::Foo::Bar`;または
- **リファインメントペイロード**: インポート組み込みカタログ（[`imported-built-in-types.md`](../../type-specification/imported-built-in-types/)）からのケバブケース名。たとえば`non-empty-string`や`positive-int`。

リファインメントペイロードは、パラメータ化された形`non-empty-array[Integer]`、`non-empty-hash[Symbol, Integer]`、および有界整数の形`int<min, max>`をサポートします。型引数の位置は、Symbol / Stringのリテラルトークンとそれらのユニオンも受け付けます（`pick_of[T, :name | :email]`、`Pick[T, "name" | "email"]`）。それぞれ`Constant<value>`へとリフトされます。

`~T`による否定は**クラス名**ペイロードで許可されます（述語の偽分岐は通常こう書きます）;リファインメント形のペイロードではまだ受け付け**られません**。明示的にユーザーがオーサリングする差型には、`T - U`を推奨します（[type-operators.md](../../type-specification/type-operators/)を参照）。

## `conforms-to`: チェック付きの構造的契約

Rigorは、値がインターフェースを必要とする位置へ流れ込むあらゆる箇所で、構造的な互換性を暗黙にチェックします。`conforms-to`ディレクティブは、その契約をクラス上で*明示的かつ常にチェックされる*ものにします。現在いずれかの呼び出しサイトがそれを行使しているかどうかに関係なく、ライブラリが自身の構造的契約を設計上の表明にしたいときに有用です:

```ruby
%a{rigor:v1:conforms-to _RewindableStream}
class MyBuffer
end
```

クラスがインターフェースの要求するメソッドを欠いている場合、Rigorは[`rbs_extended.unsatisfied-conformance`](../04-diagnostics/#rule-rbs_extended-unsatisfied-conformance)を発火します;満たされたディレクティブは沈黙します。1つのクラスに複数の`conforms-to`ディレクティブがあると、インターフェースのインターセクションのように組み合わさります。このディレクティブは純粋に加算的です。すでにインターフェースを満たすクラスは、それがあってもなくても型チェックを通ります。

## エフェクトエンベロープ —— メソッドが*何をするか*を制限する

上のディレクティブはどれも、メソッドが何を返すかを記述します。メソッドが*何をするか*を記述するものが2つあります: `%a{pure}` —— rbs自身の純粋性アノテーションで、「何もしない」と読む —— と、`%a{rigor:v1:effect <labels>}` —— メソッドが超えてはならない、素の[エフェクトラベル](../../type-specification/effect-labels/)のカンマ区切りリスト —— です。どちらもメソッドまたは`class` / `module`に付けられ、後者の場合はそのクラス自身のメソッドへ分配されます（最も近いものが勝つ）。また、どちらも、メソッド自身が確保して決して外に出さないオブジェクトの変更は許容します:

```rbs
class UserRepository
  %a{rigor:v1:effect io.db, nondet.time}
  def find: (Integer) -> User

  %a{pure}
  def slug: (String) -> String
end
```

同じ2つは、`.rb`ファイル内のrbs-inlineコメントとしても機能します:

```rb
# rbs_inline: enabled

class UserRepository
  # @rbs %a{rigor:v1:effect io.db}
  # @rbs id: Integer
  # @rbs return: User
  def find(id) = User.find(id)

  # @rbs %a{pure}
  # @rbs return: String
  def slug(s) = s.strip.downcase
end
```

これから3つのことが導かれ、3つとも`.rigor.yml`の`effects:`ブロックを必要とします —— アノテーションだけでエフェクト収集がオンになることは決してありません:

- 証明されたエフェクトが境界を逸脱するメソッドは、Rubyの`def`に位置付けて[`effect.envelope-exceeded`](../04-diagnostics/#rule-effect-envelope-exceeded)を発火します。
- レジストリが認識しないラベルは**アノテーション全体**を無制限として読ませ —— タイポが指摘をでっち上げることは決してない ——、その綴りが明らかにラベルのつもりである場合には、宣言位置で[`effect.unknown-label`](../04-diagnostics/#rule-effect-unknown-label)としてそのことを伝えます。
- ブロックがなければ、ランごとに1件の[`effect.annotations-unchecked`](../04-diagnostics/#rule-effect-annotations-unchecked)（`:info`）が、アノテーションが不活性であることを伝えます。

## 高カインド型ディレクティブ

2つの宣言レベルのディレクティブが、Rigorの軽量HKT機構（[ADR-20](../../adr/20-lightweight-hkt/)）の背後にある脱関数化された型コンストラクタを登録・定義します。メソッド単位のディレクティブと違い、これらは`class` / `module`に付き、**空白区切りの`key=value`ペア**を取ります（RBSのアノテーション文法は入れ子の区切り記号を受け付けないため）:

| ディレクティブ | 効果 |
| --- | --- |
| `rigor:v1:hkt_register: uri=<uri> arity=<int> variance=<v1>,… bound=<class\|untyped>` | 型コンストラクタのURIを、そのアリティ、位置ごとの分散、消去境界とともに登録する。 |
| `rigor:v1:hkt_define: uri=<uri> params=<P1>,… body=<body-text>` | URIを型関数の本体に束縛する;`body=`はペイロードの残りを消費し、ユニオンツリーへとパースされる。 |

```ruby
%a{rigor:v1:hkt_register: uri=json::value arity=1 variance=out bound=untyped}
%a{rigor:v1:hkt_define: uri=json::value params=K
   body=nil | true | false | Integer | Float | String |
        Array[App[json::value, K]] | Hash[K, App[json::value, K]]}
module JsonOverlay
end
```

これは高度なオーサリングのサーフェスです;実践的なウォークスルーは[ハンドブック第12章](../../handbook/12-lightweight-hkt/)です。

## オーサリングのルール

- 素のRBSシグネチャは常に互換性のための契約です;アノテーションはそれを精緻化または説明するだけです。
- 常に明示的でバージョン付きの`rigor:v1:`プレフィックスを使ってください。バージョンなしの`rigor:`ディレクティブは無効です。
- 1つのノードに複数のアノテーションがある場合、ソースの順序に依存せず解釈されます;完全な重複は冪等です。
- RBSシグネチャと**衝突する**ディレクティブ、あるいは同じターゲットとフローエッジ上の2つの矛盾するディレクティブは、診断として報告されます。Rigorは決して黙って勝者を選びません。
- 無関係なキー配下のアノテーションは他のツールに属します;Rigorはそれらを手を付けずに保持します。逆に、エクスポートされた素のRBS（[RBS消去](../../type-specification/rbs-erasure/)）は、保持するよう求めない限りRigor専用のアノテーションを落とします。

## 関連項目

- [`docs/type-specification/rbs-extended.md`](../../type-specification/rbs-extended/): 規範的な文法とマージのルール。
- [`imported-built-in-types.md`](../../type-specification/imported-built-in-types/): 予約されたリファインメント名のカタログ。
- [ハンドブック第7章](../../handbook/07-rbs-and-extended/): 型モデルのウォークスルー。
- [推論型の確認](../05-inspecting-types/): `assert_type` / `dump_type`ソースヘルパー。これらのRBS側のアノテーションに対するRuby側の対応物。
