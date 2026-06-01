---
title: "クラス"
description: "rigortype/rigor docs/handbook/06-classes.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/06-classes.md"
sourcePath: "docs/handbook/06-classes.md"
sourceSha: "8eeea260215e63f1d11cff4fabe0e7680152041d39daf42cfc1354eb323a2d5e"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
translationStatus: "translated"
sidebar:
  order: 1006
---

この章はクラス側の型付けを扱います — 異なる位置での`self`の意味、定数の解決、そしてRigorが`attr_*`と`Data.define`宣言をどう読むか。

## インスタンス側とクラス側の`self`

インスタンスメソッド本体の内側では、`self`は囲むクラスの`Nominal[T]`です:

```ruby
class User
  def name
    self      # Nominal[User]
  end
end
```

シングルトンメソッド本体の内側（`def self.foo`または`def User.foo`）では、`self`は`Singleton[T]` — インスタンスではなくクラスオブジェクト自体 — です:

```ruby
class User
  def self.find(id)
    self    # Singleton[User]
  end
end

User       # Singleton[User]
User.find(1)  # Nominal[User]  (RBSで宣言)
User.new      # Nominal[User]
```

この区別はメソッドディスパッチで重要です: インスタンスメソッドは`Nominal[User]`で実行され、シングルトンメソッドは`Singleton[User]`で実行されます。Rigorはメソッドがどちら側にあるかを知るために、RBSシグのコロンの右側（`def self.find: (Integer) -> User`）を読みます。

## 定数

定数ルックアップは4つのソースを順に辿ります:

1. **字句スコープ**。`Foo`が`class A; module B; ...`の内側で参照されている場合、Rigorは`A::B::Foo`、`A::Foo`、`Foo`を探します。
2. **RBSコアとバンドルされたstdlib**。`String`、`Integer`、`Symbol`、`Array`、`Pathname`、`URI`、`OptParse`、`JSON`、`YAML`など。
3. **プロジェクトRBS**。 プロジェクトの`sig/`ファイルがルックアップに追加されます。
4. **インソースクラス探索**。RBSが存在しない場合、Rigorは`class Foo`、`module Bar`、定数代入（`MAX = 100`）を辿ります。

```ruby
MAX = 100
class Counter
  def initial = MAX
end

Counter.new.initial   # Constant<100>  — 定数値が
                      # インソースクラスルックアップを
                      # 通じて伝播する
```

Rigorがたたみ込める右辺を持つ定数には`Constant<value>`型が付きます。そうでない定数には、より広いRBS消去形式が付きます。

## `attr_reader`、`attr_writer`、`attr_accessor`

Rigorは`attr_*`宣言を読み、メソッド定義として扱います。リーダーの戻り値型は対応するインスタンス変数の推論された型と一致します:

```ruby
class User
  attr_reader :name

  def initialize(name)
    @name = name
  end
end

u = User.new("Alice")
u.name    # Constant<"Alice">  — インソースディスパッチ +
          # インスタンス変数追跡を通じて
```

`attr_writer`はセッターを公開します; `attr_accessor`は両方を公開します。セッターの引数型は呼び出し元が提供するものです。`def.ivar-write-mismatch`ルール（v0.1.2）は、同じクラスボディ内の同じインスタンス変数への2つの書き込みが具体クラスで一致しているかチェックします — 正確な契約（contract）については[第8章 — エラーの読み方](08-understanding-errors/)を参照してください。明示的なインスタンス変数型を作成せずに、同じクラス内での`String`から`Array`への誤ったリバインドをキャッチできます。

## メソッドをまたいだインスタンス変数

Rigorはクラスのすべてのメソッドにわたってインスタンス変数の事実を蓄積します:

```ruby
class Counter
  def initialize
    @count = 0    # init後の@count: Constant<0>
  end

  def bump
    @count += 1   # @countがint<1, max>に再バインドされる
  end

  def value
    @count        # int<0, max>  (見られた書き込みのユニオン)
  end
end
```

各読み取り地点でのインスタンス変数型は、静的に見えるすべての書き込みのユニオン（union、合併型とも）です — 同じクラスの別のメソッドからの書き込みも含みます。

## `Data.define`

`Data.define`は小さなイミュータブルな構造体を生成します。Rigorは宣言を認識し、コンストラクタのアリティ（arity）、フィールドごとのアクセサ、結果のクラス型を公開します:

```ruby
Point = Data.define(:x, :y)

p = Point.new(x: 3, y: 4)
assert_type(p, "Nominal[Point]")
assert_type(p.x, "Constant<3>")
assert_type(p.y, "Constant<4>")
```

探索は`define_method`スタイルのブロック本体も辿るので、`Point = Data.define(:x, :y) do ... end`でも動作します。合成されたキーワード引数コンストラクタをオーバーライドするブロック定義の`def initialize(...)`も含みます（v0.1.2）。同じルールが`Const = Struct.new(*Symbol) do ... end`にも適用されます — ブロックボディのメソッド発見が両方の形式にわたって均一に組み合わせられます。

## `Struct.new`

`Struct.new(*Symbol)`は位置引数コンストラクタに加えて`Data.define`と同じアクセサを生成します。Rigorは両方の形式を処理します:

```ruby
Coord = Struct.new(:x, :y)

c = Coord.new(10, 20)
assert_type(c.x, "Constant<10>")
assert_type(c.y, "Constant<20>")
```

`Struct`はミュータビリティを追加します（アクセサはライターでもある）ので、インスタンス変数スタイルの蓄積が適用されます。`Data`は読み取り専用です。

## 継承とメソッド解決

`Nominal[Subclass]`でメソッドを呼び出すと、Rigorはクラス階層を辿ります: まずサブクラスのRBS / インソース本体、次に各祖先のRBS / 本体、次に宣言順に含まれるモジュール。メソッドを定義した最初のものが勝ちます。

階層は次から読まれます:

- RBSの`class Foo < Bar`宣言。
- インソースの`class Foo < Bar`行。
- Rigorが辿った`include` / `prepend` / `extend`呼び出し。

階層が静的に不完全な場合（クラスがRigorが見つけられない親を参照している）、レシーバー型は最も深い既知の祖先にフォールバックします — Rigorが宣言を見たクラスに対しては、`Dynamic[Top]`になることはありません。

## `class`型と`singleton(C)`型

メソッドシグネチャが「クラスオブジェクト自体」を返すことがあります:

```ruby
class Foo
  def self.factory: () -> Foo            # インスタンスを返す
  def self.subclasses: () -> Array[singleton(Foo)]  # クラスオブジェクトを返す
end
```

`singleton(Foo)`はクラスオブジェクト`Foo`の型です。`Singleton[Foo]`（Rigorの内部キャリア（carrier）表示形式）も同じ概念です。（`Array[Foo]`での）`Foo`は「`Foo`のインスタンス」/ `Nominal[Foo]`を意味します。

`singleton(Foo)`でインスタンスメソッドを呼び出すのはエラーです。ただし`Foo`自体がそのシングルトンメソッドを定義している場合は除きます — `String`は`singleton(String)`で、`String#upcase`はインスタンスにあるので、`String.upcase`は`call.undefined-method`をフラグします。

## カスタム`case_eq`（`===`）

Rigorは`Class` / `Module` / `Range` / `Regexp`に対して`===`を認識します — これらは標準の`case x; when …`の形式です。ユーザークラスへのカスタム`case_eq`実装は認識されません:

```ruby
class IPv4
  def self.===(s)
    s.match?(/\A\d+\.\d+\.\d+\.\d+\z/)
  end
end

case some_input
when IPv4
  # Rigorはここで`some_input`をナローイングしません —
  # IPv4.===はユーザー定義のcase等値で、エンジンは
  # 特定のクラスにナローイングするとは証明できません。
  some_input
end
```

このような場合、明示的な`is_a?` / `respond_to?`ガードを書くか、`===`メソッドに`RBS::Extended`の`predicate-if-true`ディレクティブを使ってください（[第7章](../07-rbs-and-extended/)参照）。

## 定数宣言エイリアスクラス

一部のRubyイディオムは定数代入でクラスエイリアスを作ります:

```ruby
YAML = Psych
```

右辺がクラス自体の場合、Rigorはレシーバー型付けのためにエイリアスを追います — `YAML.load(...)`は`Psych.load(...)`として扱われます。しかしメソッド存在チェックはエイリアス名に対して意図的に沈黙します;解析器はより多くのコンテキストなしに意図的なエイリアスと偶発的なシャドウを区別できないので、`YAML.unknown`は`call.undefined-method`を発火しません。診断が必要な場合は正規名を使ってください。

## モジュール

型付けの目的では、`module M; def foo; end; end`はクラスと構造的に似ています。メソッドは同じように参照されます; `include M`は`M`のメソッドをインクルードするクラスの階層に追加します。

`extend self`スタイルのミックスインパターン（`module_function` / `extend self`）が認識されます — インスタンス側とシングルトン側の両方が同じメソッドを公開します。

## `protected`と`private`

Rigorは可視性修飾子を読み、`def.method-visibility-mismatch`ルール（将来）の限定的なコンテキストでそれらを考慮します。今日、外部レシーバーへのプライベートメソッド呼び出しは診断を発火しません — 可視性は型システムの問題というよりも`rubocop-style`リンターの関心事です。

## 次に読むもの

第7章はRBSと`RBS::Extended`を扱います — 推論だけでは証明できないものを超えるための外部シグネチャ表面です。
