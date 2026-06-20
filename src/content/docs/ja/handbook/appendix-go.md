---
title: "付録 — Goから来た場合"
description: "rigortype/rigor docs/handbook/appendix-go.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-go.md"
sourcePath: "docs/handbook/appendix-go.md"
sourceSha: "3ded5c589cbac1d31eb213da16cd9f79de50e3d68585d9fecb77b811a586c76e"
sourceCommit: "98bd3fb5bcd0434c814c1d4e3c864e3888ddeae4"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "Goから来た場合"
---

「型」についてのメンタルモデルがGoで形作られたなら、この付録はRigorの語彙をあなたがすでに知っている概念にマッピングする。ふたつには人を驚かせる本物の接点がある: Goの*暗黙的に満たされる*インターフェースは、まさにRigorの構造的型付け（structural typing）の動き方そのものだ。Rigorで最も誤解される機能 — 「このクラスがインターフェースを実装すると、どこで宣言するのか？」 — は、Goプログラマーが反射的にすでに理解しているもので、Goであなたが常にそうしてきたのと同じやり方だ。

これは変換表に、ふたつが分岐する箇所の議論を加えたものだ。Goは小さく、コンパイルされ、意図的に切り詰められている — 直和型（sum type）なし、継承なし、値としてのエラー、いたるところにゼロ値。Rigorは、Goが省いたもの（ユニオン型、リファインメント、リテラル型、nilナローイング）を加え、Goがコンパイル言語として必要とするもの（ビルドゲートそのもの）を落とす。

## 5秒ピッチ

| 問い | Go | Rigor |
| --- | --- | --- |
| インターフェースのメンバーシップ | 暗黙的 — メソッドを持てばインターフェースを満たす | 暗黙的 — 同じ構造的ルール |
| チェッカーはいつ走るか？ | コンパイル時。通過するまで何も走らない | 事後的に、すでに走っているコードに対して |
| 「分からない」型 | `interface{}` / `any` | `Dynamic[Top]` — 直接の対応物 |
| アノテーションはどこに置くか？ | ソース内。`:=`がローカルを推論する | `.rbs`ファイル内。ボディ全体が推論される |
| 直和型 | なし — Goにはユニオン型がない | ファーストクラスの`T \| U`ユニオン型 |
| エラー | 値として返す（`(T, error)`） | raiseする。シグネチャでは追跡しない |

GoとRigorは構造的型付けの直感と、`any`をエスケープハッチとする直感を共有している。両者が袂を分かつのはビルドモデルだ: Goのチェッカーはプログラムが存在する前に通過するゲートだが、Rigorのチェッカーはすでに走っているプログラムに対する助言者だ。両者はリッチさでも袂を分かつ。GoがあえてミニマルなところでRigorはユニオン型、リテラル型、リファインメントを加える。

## 型語彙マッピング

| Go | Rigor | 備考 |
| --- | --- | --- |
| `int` / `int64` / `uint` | `Integer` | Rubyの整数は任意精度。幅も符号もない。 |
| `float64` / `float32` | `Float` | `Numeric`が共通のスーパータイプ。 |
| `bool` | `bool`（`Constant<true> \| Constant<false>`） | 構造的にはふたつの定数のユニオン型。 |
| `string` | `String` | |
| `byte` / `rune` | `Integer` | Rubyには独立したbyte/rune型がない。 |
| `nil` | `nil`（`Constant<nil>`） | Goのtyped-nilの機微はRubyに対応物がない — `nil`はひとつだけ。 |
| `interface{}` / `any` | `Dynamic[Top]` | 「ここは黙っていて」キャリア（carrier） — 直接の一致。 |
| `error` | （型なし — Rubyはraiseする） | [値としてのエラー](#値としてのエラー-vs-raise)を参照。 |
| `[]T`（スライス） | `Array[T]` | |
| `[N]T`（配列） | `Tuple[…]`または`Array[T]` | 固定長リテラルは`Tuple`になる。それ以外は`Array[T]`。 |
| `map[K]V` | `Hash[K, V]` | |
| `struct{ X int; Y int }` | `Point = Data.define(:x, :y)` | [構造体 ↔ Data.define](#構造体--datadefine)を参照。 |
| `interface{ Draw() string }` | RBSの`interface`（構造的） | 直接の対応物 — 下記参照。 |
| `*T`（ポインタ、nil可能） | `T?`（すなわち`T \| nil`） | nil可能ポインタは`T?`のようにナローイングされる。 |
| `iota`定数グループ | `Constant<…>`ユニオン型 | Goのenumイディオム。Rigorは定数またはシンボルのユニオン型を使う。 |
| `[T any]`（ジェネリクス、1.18+） | RBSの`[T]`型パラメータ | |
| （直和型なし） | `T \| U` | Goにはユニオン型がまったくない。Rigorの追加。 |
| （リテラル型なし） | `Constant<42>` / `Constant<"hi">` | Goにはリテラル型がない。Rigorの新機軸。 |

## 構造的インターフェース — すでに知っている部分

ここはGoプログラマーに我が家のような安心感を与えるセクションだ。Goでは、型は*そのメソッドを持つ*ことでインターフェースを満たす — `implements`キーワードも、意図の宣言もない:

```go
type Drawable interface { Draw() string }

type Button struct{ /* … */ }
func (b Button) Draw() string { return "[button]" }
// Button satisfies Drawable. You never said so.
```

RigorのRBSの`interface`はまさにこのように動く:

```ruby
# An RBS structural interface
interface _Drawable
  def draw: () -> String
end
```

`draw`に応答して`String`を返す任意のRubyオブジェクトは`_Drawable`を満たす — `implements`を書くことも、適合を宣言することも決してない。これはJavaやC#から来た読者をつまずかせる、Rigorの**唯一**の語だ。そこでは`interface`は宣言が必須の*名前的*契約（contract）を意味する。あなたには説明不要だ: これはGoのインターフェースであり、インターフェースを小さく保つ慣習も含めて同じだ。

RigorはGoよりさらに一歩進む: インターフェースがまったく宣言されていないときでさえ、無名オブジェクトの*シェイプ*（shape）とケイパビリティ（capability）ロールを推論する — ある値の使い方からGoが`interface{ Draw() string }`を推論するのに相当する。[構造的型付けの付録](../appendix-protocols-and-structural-typing/)が正規の解説だ。

## ナローイング — type switch / アサーション

Goは`interface{}`の値を型アサーションとtype switchでナローイング（narrowing）する。Rigorには直接の対応物がある。

| Go | Rigor |
| --- | --- |
| `if x != nil` | `if x`（`nil`を剥がす）、または`unless x.nil?` |
| `v, ok := x.(string)`（comma-okアサーション） | `if`内での`x.is_a?(String)`ナローイング |
| `switch v := x.(type) { case string: … }` | `case x; in String => v` |
| `x.(T)`（アサーション、失敗でpanic） | （panicするアサーションなし） — `is_a?`ガード、または[`rigor-sorbet`](../../manual/plugins/rigor-sorbet/)経由の`T.cast` |
| `bool`を返すユーザー関数 | `%a{rigor:v1:predicate-if-true: x is Foo}`ディレクティブ |

Goのtype switchは*網羅的ではない* — caseを省略して`default`に落とすことができる — そしてRigorの`case`もそうだ。両者とも、証明できることを報告するのであり、あなたが忘れたことを報告するのではない。（Rigorが価値を加えるのはその双対だ: `case`/`in`の節が、先行する節がすでにその型をカバーしているために*決して*マッチしえないなら、[ADR-47](../../adr/47-narrowing-driven-clause-reachability/)の`flow.unreachable-clause`ルールがそう告げる。）

## 値としてのエラーvs raise

Goを特徴づけるイディオム — `(T, error)`をまとめて返し、`if err != nil`でチェックする — にはRigorに直接の対応物がない。Rubyは失敗を*raise*で通知し、返却では通知しないからだ。Goの関数は、`T`を返してエラーパスでraiseするRubyのメソッドになる:

```go
func parse(s string) (int, error) { return strconv.Atoi(s) }

n, err := parse("x")
if err != nil { return err }
```

```ruby
def parse(s)             # returns Integer, raises on bad input
  Integer(s)
end

n = parse("x")           # raises ArgumentError on the error path
```

Rigorは例外をシグネチャの一部として追跡しない — 型付きのエラー返却もなければ、ナローイングする`if err != nil`の形もない。Goの値返却スタイルを維持したいなら、`Tuple`（`[value, error]`または`[:ok, value]` / `[:error, reason]`）を返して`case`/`in`でパターンマッチすることが*できる*。Rigorは`Tuple`とユニオン型を精密に型付けする。ただしそれはGoイディオムの移植であり、慣用的なRubyではない。

## nil、ゼロ値、不在

Goにはnull型はないが、nil可能なポインタ、マップ、スライス、インターフェースがある — そして*ゼロ値*がある: 未設定の`int`は`0`、未設定の`string`は`""`、未設定のポインタは`nil`だ。

Rubyにはゼロ値のルールがない。未設定のインスタンス変数は`nil`を読み出すが、未設定の*ローカル*は`NameError`をraiseする（暗黙にゼロにはならない）。したがって:

- Goのnil可能な`*T`はRigorの`T?`にマッピングされる — `T | nil`であり、`x.nil?` / `if x`ガードでナローイングされる。Goで`if p != nil`と書くのと同じやり方だ。
- Goの宣言時ゼロ値という便利さにはRubyに対応物がない。Rubyは使用前の代入を強制し、Rigorのフロー解析は、一度も代入されていないローカルはスコープにないと追跡する。

要点: `if err != nil` / `if ptr != nil`の反射はそのまま`unless x.nil?`に翻訳され、Rigorは期待どおりに非nil分岐をナローイングする。

## 構造体 ↔ `Data.define`

イミュータブルな値として使われるGoの`struct`は、Rubyの`Data.define`にマッピングされる — 値で等価、メンバーでシェイプされ、frozen。Rigorはこれをネイティブにモデル化する（[ADR-48](../../adr/48-data-struct-value-folding/)）。

```go
type Point struct{ X, Y int }
p := Point{X: 1, Y: 2}
a := p.X            // a : int
q := p
q.X = 9            // Go structs are mutable; this copies-then-mutates
```

```ruby
Point = Data.define(:x, :y)
p = Point.new(1, 2)
assert_type("1", p.x)   # member value is folded, not just Integer
q = p.with(x: 9)                  # immutable update — returns a new Point
```

Go読者への注意がふたつ:

- **メンバー値はfoldされる**。`Point.new(1, 2).x`は`1`であり、単なる`Integer`ではない。Goはリテラルを消すが、Rigorはそれを保持する（foldの予算の範囲内で）。
- **`Data`はイミュータブル**。Goの`struct`と違い、`Data.define`はfrozenな値を生む。新しいものは`Data#with`で得る。Goのミュータブルな構造体が必要なら、Rubyの`Struct`のほうが近い — ただしRigorはまだ`Struct`を値foldしない。そのミュータビリティが健全性のストーリーを壊すからだ（[第6章](../06-classes/)参照）。

## Goにない直和型

ここはGoプログラマーを最も悩ませるギャップであり、Rigorが最も明確に何かを加える場所だ。Goには**ユニオン型がない** — 「これは`Circle`または`Rectangle`だ」と言う方法がない。回避策は、非公開メソッドを持つsealedなインターフェースか、`interface{}`に`default: panic`付きのtype switchを加えるかだ。

Rigorにはファーストクラスのユニオン型があり、バリアントの閉じた集合は、単に`case`/`in`でディスパッチされる`Data.define`型のユニオン型だ:

```ruby
Circle    = Data.define(:radius)
Rectangle = Data.define(:w, :h)

def area(s)             # s : Circle | Rectangle
  case s
  in Circle    then Math::PI * s.radius * s.radius
  in Rectangle then s.w * s.h
  end
end
```

マーカーインターフェースも、`panic`のdefaultもない。ユニオン型はRigorが追跡する本物の型であり、`in Circle`はその節に沿って`s`を`Circle`にナローイングする。これはGoの型システムからRigorのそれへ移るときの、表現力における単一最大の利得だ。

## リファインメントと定義型

Goの`type Celsius float64`は`float64`とは*名前的に別の*型を作る — だが「正の`Celsius`」や「空でない文字列」とは言えない。RigorはGoの定義型の名前的な別物性を再現できない（`type Celsius float64`はRigorでは`Float`に潰れる）が、Goに欠けているものを加える: 値の不変条件をエンコードするリファインメントキャリアだ。

| Rigorのリファインメント | Goのイディオム | コメント |
| --- | --- | --- |
| `non-empty-string` | ランタイムの`if len(s) == 0`チェック | Rigorは`unless s.empty?`から生成する。 |
| `positive-int` | ランタイムの`if n <= 0`チェック | Rigorは`n > 0`からナローイングする。 |
| `int<1, 9>` | ランタイムの範囲チェック | Rigorの範囲キャリアは任意の境界を扱う。 |
| `numeric-string` | `strconv.Atoi` + エラーチェック | Goには型レベルの対応物がない。 |
| `non-empty-array[T]` | ランタイムの`len(xs) == 0`チェック | Rigorは`unless arr.empty?`から生成する。 |

つまりトレードは双方向に走る: Goはあなたに、Rigorが平坦化する名前的newtypeを与え、Rigorはあなたに、Goがランタイムでチェックせねばならない値レベルのリファインメントを与える。

## ジェネリクス

Goは1.18でジェネリクスを加えた。RBSはそれより長く持っており、Rigorはそれを読む。一般的なケースではサーフェス（surface）が近い。

| Go | Rigor（RBS経由） |
| --- | --- |
| `func Id[T any](x T) T` | `def id: [T] (T) -> T` |
| `[]T` | `Array[T]` |
| `map[K]V` | `Hash[K, V]` |
| `[T constraints.Ordered]` | `[T < Comparable[T]]`バウンド |
| 制約内のtype set / ユニオン | RBSバウンド（より狭い） |

Goの制約type setとRigorのRBSバウンドはどちらも設計上控えめだ。どちらも完全に依存的なシステムほど型レベルで表現力豊かであろうとはしない。

## 深刻度、抑制、「strictモード」

| Go | Rigor |
| --- | --- |
| `go vet` / リンターの深刻度 | `severity_profile: lenient` / `balanced` / `strict` |
| `//nolint:rule`（golangci-lint） | `# rigor:disable <rule>` |
| ファイルレベルのリント無効化 | `# rigor:disable-file all` |
| `go build`（ゲート） | `rigor check lib`（助言者） |

メンタルシフト: `go build`はゲートだ — コードはコンパイルが通るまで出荷されない。`rigor check`はすでに走っているコードに対する助言者で、深刻度プロファイルでチューニングし、ベースライン（baseline）経由で段階的に採用する。

## GoにあってRigorにないもの

何を手放すかを正直に言おう:

- **コンパイルゲート**。Goはビルドが通るまで走らない。Rigorは助言的で、プログラムは報告内容にかかわらず走る。
- **定義型の名前的な別物性**。`type Celsius float64`はGoでは別の型だが、Rigorはそれを`Float`に平坦化する。
- **goroutineとチャネル型**。`chan T`、`select`、並行性の型機構 — Rigorに対応物はない。
- **ゼロ値**。Goの「宣言すればゼロ」という便利さは、Rubyの使用前代入モデルに居場所がない。
- **単一バイナリとコンパイル時の保証**。ランタイムの助言者が提供しないコンパイルモデルの恩恵だ。

## RigorにあってGoにないもの

逆方向 — Goにとってこのリストは長い。Goがあえてミニマルだからだ:

- **ユニオン型 / 直和型**。大物: `T | U`はRigorではファーストクラスで、Goにはない。閉じたバリアント集合にマーカーインターフェースは要らない。
- **リテラル型 / 定数型**。`Constant<42>`、`Constant<:ok>`、`Constant<"FOO">`。Goにはリテラル型がない。最も近いのは`iota`定数グループだ。
- **メソッド呼び出しを通じた定数fold**。`"foo".upcase`は`Constant<"FOO">`であり、`string`ではない。
- **リファインメント**。`non-empty-string`、`positive-int`、`int<1, 9>` — 値の不変条件で、それを静的に知るためのランタイムチェックは要らない。
- **インターフェースを超える推論されたシェイプ**。Rigorは無名オブジェクトのシェイプとケイパビリティロールを推論する。宣言された`interface`の充足だけではない。
- **偽陽性なしのスタンス**。`Dynamic[Top]`レシーバーについては文句を言わず沈黙する。まだナローイングしていない`interface{}`は何のコストもかからない。
- **`:=`を超えるアノテーション税なし**。Goは`:=`のローカルを推論する。Rigorはメソッドボディ全体を*そして*`def`境界を越えて推論する。`.rbs`がゼロのプロジェクトでも有用な診断が得られる。

## マイグレーションvignette

Goパッケージ — インターフェース、いくつかの実装、失敗しうるコンストラクタ — をRubyに移植している。元のコード:

```go
type Shape interface{ Area() float64 }

type Circle struct{ Radius float64 }
func (c Circle) Area() float64 { return math.Pi * c.Radius * c.Radius }

type Rectangle struct{ W, H float64 }
func (r Rectangle) Area() float64 { return r.W * r.H }

func parseRadius(s string) (float64, error) { return strconv.ParseFloat(s, 64) }
```

Rigorのアプローチ — ダックタイピングされた実装、推論された構造的インターフェース、raiseするパーサ:

```ruby
# lib/shape.rb
Circle    = Data.define(:radius) do
  def area = Math::PI * radius * radius
end

Rectangle = Data.define(:w, :h) do
  def area = w * h
end

def parse_radius(s)        # returns Float, raises on bad input
  Float(s)
end
```

何が持ち越され、何が変わるか:

- `Shape`インターフェースにRubyの宣言は要らない。`area`を持つ任意のオブジェクトが構造的インターフェースを満たす。名前を付け*たい*なら、RBSの`interface _Shape`がGoのそれとまったく同じように動き、暗黙的に満たされる。
- `Circle`と`Rectangle`はメソッド付きの`Data.define`値になる — Goの構造体がミュータブルだったところでイミュータブルだ。
- `(float64, error)`はraiseする`Float`返却になる。呼び出し側の`if err != nil`チェックは`rescue`になる。あるいは`Tuple`を返して`case`/`in`でマッチすることで値スタイルを維持する。
- シェイプ上で`case`/`in`でディスパッチすれば、Goには表現できなかったユニオン型が得られる — そしてRigorの`flow.unreachable-clause`が、決してマッチしえない節をフラグする。

## 次のステップ

ハンドブックの残りを順番に読む必要はおそらくない。有用なポインタ:

- [プロトコルと構造的型付け](../appendix-protocols-and-structural-typing/) — RBSインターフェース、Goの暗黙的インターフェースの直接の対応物、そしてそれらがADR-28のプロトコル契約とどう異なるかについての正規ページ。
- [第3章 — ナローイング](../03-narrowing/) — フローのルール — type switchとアサーションの対応物。
- [第6章 — クラス](../06-classes/) — `Data.define`、`struct`の対応物、そしてその値folding。

別のツールと比較したい場合は、兄弟付録ページが[TypeScript](../appendix-typescript/)、[PHPStan](../appendix-phpstan/)、[mypy](../appendix-mypy/)、[Steep](../appendix-steep/)、[TypeProf](../appendix-typeprof/)、[Java / C#](../appendix-java-csharp/)、[Rust](../appendix-rust/)、[Elixir](../appendix-elixir/)をカバーしている。
