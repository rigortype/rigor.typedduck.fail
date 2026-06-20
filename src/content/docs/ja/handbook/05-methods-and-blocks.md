---
title: "メソッドとブロック"
description: "rigortype/rigor docs/handbook/05-methods-and-blocks.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/05-methods-and-blocks.md"
sourcePath: "docs/handbook/05-methods-and-blocks.md"
sourceSha: "fb9e60c663cf986ae9888ffcbeeefbaa3f7b1a5ccb2c4c07c4a45124b22fddfd"
sourceCommit: "212f2c491920cc5c39a12d75aee385cb6c51fa0c"
translationStatus: "translated"
sidebar:
  order: 1005
---

この章では、Rigorがメソッド呼び出しについて知っていること（レシーバーの型、引数の型、推論された戻り値型、ブロックが付属している場合のブロックパラメータ）を扱います。いくつかのセクションは呼び出し元診断のリファレンスも兼ねており、見出しにルールIDが現れます。

## メソッドディスパッチ: 呼び出し元でRigorが見るもの

Rigorが`receiver.method(args, &block)`に遭遇したとき、結果を生成する最初のものを採用しながら、固定されたディスパッチ層のシーケンスを実行します:

1. **定数たたみ込み**。 すべての引数が`Constant<...>`または定数のタプルで、レシーバーが既知の名前的クラスで、メソッドがクラスごとの「純粋な」カタログにある場合。Rigorは解析時にメソッドを実行して結果を返します。`1 + 2` → `Constant<3>`、`[1, 2, 3].first` → `Constant<1>`。
2. **シェイプ（shape）ディスパッチ**。 レシーバーが`Tuple` / `HashShape` / `IntegerRange` / リファインメント（refinement、篩型とも）を持ち、メソッドにシェイプごとのルールがある場合。`Tuple[A, B, C].size` → `Constant<3>`; `int<0, max>.zero?` → `Constant<true> | Constant<false>`。
3. **RBSディスパッチ**。 クラスにそのメソッドのRBSシグがある場合。引数型がパラメータ契約（contract）に対してチェックされます（後述）;戻り値型はシグから読まれ、`RBS::Extended`ディレクティブによって締め付けられることがあります。
4. **インソースディスパッチ**。 クラスにRBSはないが、Rigorがプロジェクト内の`def`（または`define_method`、`attr_*`）を見つけた場合。パラメータ型はチェックされません（契約がない）;戻り値型はメソッド本体から推論されます。
5. **フォールバック**。 上記のいずれも当てはまりません。呼び出しは`Dynamic[top]`を返し、沈黙を保ちます。

「最初に一致したものが勝つ」カスケード構造が、厳密なRBSシグ + `RBS::Extended`ディレクティブを持つメソッドがインソース本体の推論された戻り値型をオーバーライドする理由です。シグレベルでの締め付けは、RBSが表現するよりも狭い戻り値型を持つドメイン固有のメソッドについてRigorに教える、サポートされた方法です。

## 引数型付け: `call.argument-type-mismatch`

メソッドにRBSシグ（または`RBS::Extended`パラメータオーバーライド）がある場合、Rigorは各位置引数/キーワード引数を宣言されたパラメータ型に対してチェックします:

```ruby
class Slug
  %a{rigor:v1:param: id is non-empty-string}
  def normalise: (::String id) -> ::String
end
```

```ruby
Slug.new.normalise("hello")  # OK（Constant<"hello">はnon-empty-stringを満たす）

Slug.new.normalise("")       # error: argument-type-mismatch
                             # ("" はnon-empty-stringが除外する
                             # 唯一の値)

Slug.new.normalise(some_str) # some_strが空であることをRigorが
                             # 証明できない場合はOK;
                             # 「どちらかの可能性がある」ケースでは
                             # Rigorは沈黙します
```

`call.argument-type-mismatch`は、Rigorが引数がパラメータ契約を満たせないことを**証明**できる場合にのみ発火します。「空の可能性がある」は沈黙します。偽陽性なしルールです。

## アリティ: `call.wrong-arity`

レシーバークラスが静的に既知で、メソッドが発見可能（RBSシグまたはインソース`def`）な場合、Rigorは引数の数をメソッドのアリティに対してチェックします:

```ruby
[1, 2, 3].rotate(1, 2)
# error: wrong number of arguments to `rotate' on Array
#        (given 2, expected 0..1)
```

アリティチェックは省略可能な位置引数、スプラット、キーワード引数、オーバーロードシグネチャを考慮します。メソッドがオーバーロードされている場合、指定されたアリティを受け入れるすべてのオーバーロードが候補です。Rigorはどのオーバーロードも受け入れない場合に**のみ**アリティをフラグします。

## `call.undefined-method`

レシーバークラスが静的に既知で、メソッドが（RBSシグ、インソース`def`、インソースattr、`Data.define`アクセサの）いずれにもない場合、Rigorは呼び出しをフラグします:

```ruby
"hello".no_such_method
# error: undefined method `no_such_method' for "hello"
```

このルールは**意図的に保守的**です: 呼び出しがフラグされるのは、レシーバー型が静的に既知で、メソッドカタログが列挙可能な場合のみです。`Dynamic[top]`レシーバー、メソッド本体内の暗黙的selfの呼び出し、定数宣言エイリアスクラス（`YAML` → `Psych`）は沈黙します。

## `call.possible-nil-receiver`

レシーバーの型が`T | nil`で、呼び出されたメソッドが`NilClass`で定義されていない場合、Rigorはフラグします:

```ruby
def shout(name)
  name.upcase  # warning: name: String?のとき
end
```

修正は通常ガードを追加することです:

```ruby
def shout(name)
  return "" if name.nil?
  name.upcase  # name: Stringになった
end
```

このルールはRigorが出荷する最も高価値な診断の1つです。非自明なRubyコードベースに散在する`nil`への`NoMethodError`クラッシュのファミリー全体を捉えます。

## インソースメソッドの戻り値型推論

RBSシグなしで`def`を書くと、Rigorはメソッド本体から戻り値型を推論します。推論された型は最後の式が評価するものです:

```ruby
def double(n)
  n * 2
end

double(5)   # Constant<10>（Rigorが呼び出しをたたみ込む）
```

本体に複数のブランチがある場合、戻り値型は到達可能なすべての終端式のユニオン（union、合併型とも）です:

```ruby
def kind(x)
  if x.is_a?(Integer)
    :int
  elsif x.is_a?(String)
    :str
  end
end

kind(7)        # Constant<:int>
kind("hi")     # Constant<:str>
kind(:nope)    # Constant<nil>（ifのelse分岐が欠けている
               # ことによる暗黙のnil）
```

本体途中の`return`は期待通りに動作します;明示的な`raise`はそのブランチをユニオンから除外します（内部的に`bot`キャリア（carrier））。

### 再帰メソッド

再帰メソッドは`Dynamic[top]`に潰れるのではなく、精密な戻り値型を推論します。再帰呼び出しの引数が完全に定数のとき、Rigorは（厳格なフレーム予算の下で）それを展開して結果をたたみ込みます:

```ruby
def factorial(n)
  n <= 1 ? 1 : n * factorial(n - 1)
end

factorial(5)   # Constant<120>
```

引数が定数でないときは、Rigorは代わりに不動点の*戻り値サマリー*に到達します。そのため素通しの再帰は汚染された型ではなく正しい型を返します:

```ruby
def last_step(n)
  n <= 0 ? :done : last_step(n - 1)
end

last_step(some_int)   # Constant<:done>
```

どちらの経路も厳格な上限が設けられており、収束できないときは従来のベース型の挙動へと劣化します。2つのメソッドにまたがる相互再帰は終了し、精密なサマリーが得られない場合は安全な`Dynamic[top]`の下限へと劣化します。

## `def.return-type-mismatch`

メソッドにRBS宣言の戻り値型と推論された型の両方がある場合、Rigorは推論された型が宣言された型に適合するかチェックします:

```ruby
class Slug
  def normalise: (::String) -> ::String
end
```

```ruby
class Slug
  def normalise(s)
    s.empty? ? nil : s.upcase   # warning:
                                # def.return-type-mismatch
                                # (宣言はString、推論は
                                # String | nil)
  end
end
```

このルールは`call.argument-type-mismatch`の対称的な対応物です: 引数側は「呼び出し元が間違った型を渡した」;戻り値側は「私が呼び出し元に間違った型を返した」。

## ブロックパラメータ

メソッドがブロックを受け取るとき、Rigorはレシーバーメソッドのシグネチャに基づいてブロックパラメータをバインドします。バンドルされたカタログのすべてのブロック使用メソッドにはメソッドごとのルールがあります:

```ruby
[1, 2, 3].each do |n|
  assert_type("1 | 2 | 3", n)
end

%w[a b c].each_with_index do |word, idx|
  assert_type("\"a\" | \"b\" | \"c\"", word)
  assert_type("non-negative-int", idx)
end

{name: "Alice", age: 30}.each_pair do |key, value|
  assert_type(":age | :name", key)
  assert_type("\"Alice\" | 30", value)
end
```

位置ごとのバインディングはタプル、ハッシュシェイプ、範囲に対して機能します。レシーバーが拡幅されている（`Tuple[…]`ではなく`Array[T]`）場合、ブロックパラメータは要素型`T`です。

受信メソッドにメソッドごとのルールがない場合、ブロックパラメータは`Dynamic[top]`にフォールバックします。プロジェクトソースに書いたカスタムなブロック使用メソッドは、インソースディスパッチ層によって見られます（Rigorが本体を走査して`yield`呼び出しからパラメータ型を推論します）。しかしその解析はカタログに載っている組み込みよりも制限があります。

## 番号付きパラメータと`it`

`_1`、`_2`、...、およびRuby 3.4の`it`は明示的なパラメータとまったく同じようにバインドされます:

```ruby
[1, 2, 3].each { _1.succ }
# _1: Constant<1> | Constant<2> | Constant<3>

[10, 20, 30].each { it.to_s }
# it: 明示的な形式と同じ
```

## ブロックローカル宣言（`do |i; x|`）

`;`を接頭辞にした名前は、同名の外側ローカル変数をシャドウする新しいブロックローカル変数を導入します。Rigorはブロックエントリー時にこれらのローカル変数を`Constant<nil>`にバインドし（Rubyのランタイムセマンティクス）、そしてブロック内の書き込みをそのブロックにローカルなものとして扱います:

```ruby
x = 100
[1, 2, 3].each do |i; x|
  # x: Constant<nil>  この時点で（ブロックローカルなシャドウ）
  x = i * 2
  # x: Constant<2> | Constant<4> | Constant<6>
end

assert_type("100", x)  # 外側のxは変更されていない
```

## クロージャエスケープとキャプチャされたローカル変数

ブロックが外側のローカル変数をキャプチャすると、そのローカル変数へのブロックの書き込みが呼び出し後のローカル変数のビューに書き戻されます。非エスケープとして既知のメソッド（`Array#each`、`tap`など）では、書き戻しが適用されます;エスケープするメソッド（`Thread.new`、`define_method`など）では、ブロックが任意の後のタイミングで発火する可能性があるため、解析器はキャプチャされたローカル変数のファクト（fact）を除去します。

書き戻しはローカル変数の*再バインド*と、ブロックが組み立てていた*コレクションの変異*の両方をカバーします。再バインドされたアキュムレータは古いシードを保持するのではなくそのベース型へと拡幅され、ブロック内で育てられたコレクションは追加された要素型を保持します:

```ruby
total = 0
[1, 2, 3].each { |n| total += n }
# total: Integer  — the rebind is written back (not a stale 0)

out = [0]
[1, 2, 3].each { |x| out << x }
# out: Array[Integer]  — the appended element type joins in,
#                        not just the seed's Constant<0>

squares = [1, 2, 3].each_with_object([]) { |n, acc| acc << n * n }
# squares: Array[Integer]
```

同じ書き戻しは`while` / `until`ループ本体にも適用されます。ループが再バインドするアキュムレータは、もはや古い1パス分の定数を保持しません。解析は本体を小さな不動点まで実行して拡幅します（ランタイムが超えるであろう値にループアキュムレータをたたみ込むことは決してありません）。`for`ループはこの不動点を実行する代わりに、本体の1パスをjoinします。キャプチャされたコレクションを変異させる*エスケープする*ブロックや未知のブロックでは、ローカル変数は健全でない精密なシードではなく、その素のコレクションの下限へと拡幅されます。

これは保守的な判断です: エスケープ後のナローイング（narrowing）事実をランタイムが違反するかもしれないという主張をするよりも、広げすぎるほうがよいです。

## 次に読むもの

第6章はクラス側を扱います: Rigorが`self`、定数ルックアップ、`attr_*`宣言、クラスメソッドとインスタンスメソッドの区別をどう型付けするか。
