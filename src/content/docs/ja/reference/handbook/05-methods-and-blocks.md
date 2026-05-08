---
title: "メソッドとブロック"
description: "rigortype/rigor docs/handbook/05-methods-and-blocks.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/05-methods-and-blocks.md"
sourcePath: "docs/handbook/05-methods-and-blocks.md"
sourceSha: "429f52afb375caf7cbc7f11766e6bbe37e9d6fee94757186078c5eb859155da7"
sourceCommit: "b523ab36f62d89a1c16964a66864c27e3ebb0fe4"
translationStatus: "translated"
sidebar:
  order: 1005
---

この章では、Rigorがメソッド呼び出しについて知っていること — レシーバーの型、引数の型、推論された戻り値型、ブロックが付属している場合のブロックパラメーター — を扱います。

## メソッドディスパッチ — 呼び出し元でRigorが見るもの

Rigorが`receiver.method(args, &block)`に遭遇したとき、結果を生成する最初のものを採用しながら、固定されたディスパッチ層のシーケンスを実行します:

1. **定数たたみ込み**。 すべての引数が`Constant<...>`または定数のタプルで、レシーバーが既知の名前的クラスで、メソッドがクラスごとの「純粋な」カタログにある場合。Rigorは解析時にメソッドを実行して結果を返します。`1 + 2` → `Constant<3>`、`[1, 2, 3].first` → `Constant<1>`。
2. **シェイプディスパッチ**。 レシーバーが`Tuple` / `HashShape` / `IntegerRange` / リファインメントを持ち、メソッドにシェイプごとのルールがある場合。`Tuple[A, B, C].size` → `Constant<3>`; `int<0, max>.zero?` → `Constant<true> | Constant<false>`。
3. **RBSディスパッチ**。 クラスにそのメソッドのRBSシグがある場合。引数型がパラメーターコントラクトに対してチェックされます（後述）; 戻り値型はシグから読まれ、`RBS::Extended`ディレクティブによって締め付けられることがあります。
4. **インソースディスパッチ**。 クラスにRBSはないが、Rigorがプロジェクト内の`def`（または`define_method`、`attr_*`）を見つけた場合。パラメーター型はチェックされません（コントラクトがない）; 戻り値型はメソッド本体から推論されます。
5. **フォールバック**。 上記のいずれも当てはまらない — 呼び出しは`Dynamic[Top]`を返し、沈黙を保ちます。

「最初に一致したものが勝つ」カスケード構造が、厳密なRBSシグ + `RBS::Extended`ディレクティブを持つメソッドがインソース本体の推論された戻り値型をオーバーライドする理由です。シグレベルでの締め付けは、RBSが表現するよりも狭い戻り値型を持つドメイン固有のメソッドについてRigorに教える、サポートされた方法です。

## 引数型付け — `call.argument-type-mismatch`

メソッドにRBSシグ（または`RBS::Extended`パラメーターオーバーライド）がある場合、Rigorは各位置引数/キーワード引数を宣言されたパラメーター型に対してチェックします:

```ruby
class Slug
  %a{rigor:v1:param: id is non-empty-string}
  def normalise: (::String id) -> ::String
end
```

```ruby
Slug.new.normalise("hello")  # OK — Constant<"hello">はnon-empty-stringを満たす

Slug.new.normalise("")       # error: argument-type-mismatch
                             # ("" はnon-empty-stringが除外する
                             # 唯一の値)

Slug.new.normalise(some_str) # some_strが空であることをRigorが
                             # 証明できない場合はOK;
                             # 「どちらかの可能性がある」ケースでは
                             # Rigorは沈黙します
```

`call.argument-type-mismatch`は、Rigorが引数がパラメーターコントラクトを満たせないことを**証明**できる場合にのみ発火します。「空の可能性がある」は沈黙します — 偽陽性なしルール。

## アリティ — `call.wrong-arity`

レシーバークラスが静的に既知で、メソッドが発見可能（RBSシグまたはインソース`def`）な場合、Rigorは引数の数をメソッドのアリティに対してチェックします:

```ruby
[1, 2, 3].rotate(1, 2)
# error: wrong number of arguments to `rotate' on Array
#        (given 2, expected 0..1)
```

アリティチェックは省略可能な位置引数、スプラット、キーワード引数、オーバーロードシグネチャを考慮します。メソッドがオーバーロードされている場合、指定されたアリティを受け入れるすべてのオーバーロードが候補です — Rigorはどのオーバーロードも受け入れない場合に**のみ**アリティをフラグします。

## `call.undefined-method`

レシーバークラスが静的に既知で、メソッドが（RBSシグ、インソース`def`、インソースattr、`Data.define`アクセサーの）いずれにもない場合、Rigorは呼び出しをフラグします:

```ruby
"hello".no_such_method
# error: undefined method `no_such_method' for "hello"
```

このルールは**意図的に保守的**です: 呼び出しがフラグされるのは、レシーバー型が静的に既知で、メソッドカタログが列挙可能な場合のみです。`Dynamic[Top]`レシーバー、メソッド本体内の暗黙的selfの呼び出し、定数宣言エイリアスクラス（`YAML` → `Psych`）は沈黙します。

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

このルールはRigorが出荷する最も高価値な診断の1つです — 非自明なRubyコードベースに散在する`nil`への`NoMethodError`クラッシュのファミリー全体を捉えます。

## インソースメソッドの戻り値型推論

RBSシグなしで`def`を書くと、Rigorはメソッド本体から戻り値型を推論します。推論された型は最後の式が評価するものです:

```ruby
def double(n)
  n * 2
end

double(5)   # Constant<10>  — Rigorが呼び出しをたたみ込む
```

本体に複数のブランチがある場合、戻り値型は到達可能なすべての終端式のユニオンです:

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
kind(:nope)    # Constant<nil>  — ifのelse分岐が欠けている
               # ことによる暗黙のnil
```

本体途中の`return`は期待通りに動作します; 明示的な`raise`はそのブランチをユニオンから除外します（内部的に`bot`キャリア）。

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

このルールは`call.argument-type-mismatch`の対称的な対応物です: 引数側は「呼び出し元が間違った型を渡した」; 戻り値側は「私が呼び出し元に間違った型を返した」。

## ブロックパラメーター

メソッドがブロックを受け取るとき、Rigorはレシーバーメソッドのシグネチャに基づいてブロックパラメーターをバインドします。バンドルされたカタログのすべてのブロック使用メソッドにはメソッドごとのルールがあります:

```ruby
[1, 2, 3].each do |n|
  assert_type(n, "Constant<1> | Constant<2> | Constant<3>")
end

%w[a b c].each_with_index do |word, idx|
  assert_type(word, "Constant<\"a\"> | Constant<\"b\"> | Constant<\"c\">")
  assert_type(idx,  "non-negative-int")
end

{name: "Alice", age: 30}.each_pair do |key, value|
  assert_type(key,   "Constant<:name> | Constant<:age>")
  assert_type(value, "Constant<\"Alice\"> | Constant<30>")
end
```

位置ごとのバインディングはタプル、ハッシュシェイプ、範囲に対して機能します。レシーバーが拡幅されている（`Tuple[…]`ではなく`Array[T]`）場合、ブロックパラメーターは要素型`T`です。

受信メソッドにメソッドごとのルールがない場合、ブロックパラメーターは`Dynamic[Top]`にフォールバックします。プロジェクトソースに書いたカスタムなブロック使用メソッドは、インソースディスパッチ層によって見られます — Rigorが本体を走査して`yield`呼び出しからパラメーター型を推論します — しかしその解析はカタログに載っている組み込みよりも制限があります。

## 番号付きパラメーターと`it`

`_1`、`_2`、...、およびRuby 3.4の`it`は明示的なパラメーターとまったく同じようにバインドされます:

```ruby
[1, 2, 3].each { _1.succ }
# _1: Constant<1> | Constant<2> | Constant<3>

[10, 20, 30].each { it.to_s }
# it: 明示的な形式と同じ
```

## ブロックローカル宣言（`do |i; x|`）

`;`を接頭辞にした名前は、同名の外側ローカル変数をシャドウする新しいブロックローカル変数を導入します。Rigorはブロックエントリ時にこれらのローカル変数を`Constant<nil>`にバインドします — Rubyのランタイムセマンティクス — そしてブロック内の書き込みをそのブロックにローカルなものとして扱います:

```ruby
x = 100
[1, 2, 3].each do |i; x|
  # x: Constant<nil>  この時点で — ブロックローカルなシャドウ
  x = i * 2
  # x: Constant<2> | Constant<4> | Constant<6>
end

assert_type(x, "Constant<100>")  # 外側のxは変更されていない
```

## クロージャエスケープとキャプチャされたローカル変数

ブロックが外側のローカル変数をキャプチャすると、そのローカル変数へのブロックの書き込みが呼び出し後のローカル変数のビューに影響します。非エスケープとして既知のメソッド（`Array#each`、`tap`など）では、呼び出し後のナローイングが保持されます; エスケープするメソッド（`Thread.new`、`define_method`など）では、ブロックが任意の後のタイミングで発火する可能性があるため、解析器はキャプチャされたローカル変数のナローイングを除去します。

これは保守的な判断です: エスケープ後のナローイング事実をランタイムが違反するかもしれないという主張をするよりも、広げすぎるほうがよいです。

## 次に読むもの

第6章はクラス側を扱います: Rigorが`self`、定数ルックアップ、`attr_*`宣言、クラスメソッドとインスタンスメソッドの区別をどう型付けするか。
