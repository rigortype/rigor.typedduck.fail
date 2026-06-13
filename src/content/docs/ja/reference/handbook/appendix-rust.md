---
title: "付録 — Rustから来た場合"
description: "Imported from rigortype/rigor docs/handbook/appendix-rust.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-rust.md"
sourcePath: "docs/handbook/appendix-rust.md"
sourceSha: "5c6a066a3b1b1b7865e41ddc68877914087c73a46a3bf6b4ae5539946b2ae19c"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "Rustから来た場合"
---

「型」のメンタルモデルがRustで形作られているなら、この付録はRigorの語彙を既知の概念にマッピングする。RustとRigorは1本の軸の両端に位置する — Rustはアヘッドオブタイムで健全であり、安全だと証明できないものは一切コンパイルを拒む。一方Rigorはすでに動いているRubyを解析し、*誤り*だと証明できないものについては沈黙を守る — だがそれ以外の点では驚くほど頻繁に交わる。直和型（sum type）、網羅的マッチング、10億ドルのnullの不在などだ。

これは対応表に加え、ふたつのシステムが本当に異なる選択をしている箇所についての議論である。そうした箇所こそ、あなたのRustの反射が誤った方向へ導く場所だ。最大のものはこれである。Rustの型チェッカーはプログラムが存在する前に通過しなければならないゲートだが、Rigorのそれはすでに動いているプログラムに対する助言者だ。借用チェッカーもなければ所有権もなく、「コンパイルが通らない」もない — Rubyは動いてしまっており、Rigorは型がどこで誤ると証明できるかを伝える。

## 5秒ピッチ

| 問い | Rust | Rigor |
| --- | --- | --- |
| チェッカーはいつ動くか？ | コンパイル時。通過するまで何も動かない | 事後的に、すでに動いているコードに対して |
| 健全性のスタンス | 健全 — 型エラーはハードストップ | false-positiveなし — エラーを証明できない限り沈黙 |
| アノテーションはどこに書くか？ | ソース内。ローカルは推論、シグネチャは明示 | `.rbs`ファイル内。ボディ全体は推論 |
| 「分からない」型 | （なし — Rustにエスケープハッチはない） | `Dynamic[Top]` — 境界で沈黙 |
| Null | 存在しない（代わりに`Option<T>`） | `nil`は存在する。RustがOptionをナローイングするのと同様に除去される |
| 型の同一性 | 名前的、トレイトコヒーレンスを伴う | 名前的 + 構造的ファセット |

Rustは、すべての値が説明されるまで動くことを拒むことで、その保証を勝ち取る。Rigorは逆の賭けに出る。プログラムは動いており、その大半は問題なく、アナライザーは問題を*証明*できるときだけ口を開くべきであり — 排除できない最悪ケースを理由に正常なコードを怯えさせてはならない。「コンパイラは常に正しく、私はそれに従う」が反射になっているなら、再訓練すべきはこの点だ。Rigorはゲートではなく助言者である。

## 型語彙マッピング

| Rust | Rigor | 備考 |
| --- | --- | --- |
| `i8` / `i32` / `i64` / `u32` / `usize` | `Integer` | Rubyの整数は任意精度。型に幅や符号の有無はない。 |
| `f32` / `f64` | `Float` | `Numeric`が共通のスーパータイプ。 |
| `bool` | `bool`（`Constant<true> | Constant<false>`） | 構造的にはふたつの定数のユニオン型（union type、合併型とも）。 |
| `char` / `&str` / `String` | `String` | Rubyの文字列型はひとつ。借用による区別はない。 |
| `()`（unit） | `nil` / `void` | 呼び出し側が結果を無視すべきとき`void`。値としては`nil`。 |
| `!`（never） | `Bot` | 空の型 — 到達不能な分岐、`raise`のみのボディ。 |
| `Option<T>` | `T?`（すなわち`T | nil`） | [OptionとResult](#optionとresult)を参照。 |
| `Result<T, E>` | （単一のキャリアなし — Rubyはraiseする） | [OptionとResult](#optionとresult)を参照。 |
| `Vec<T>` / `&[T]` | `Array[T]` | |
| `HashMap<K, V>` | `Hash[K, V]` | |
| `HashSet<T>` | `Set[T]` | |
| `(i32, String)`（タプル） | `Tuple[Integer, String]` | 同じ位置ごとのモデル。 |
| `struct Point { x: i32, y: i32 }` | `Point = Data.define(:x, :y)` | [構造体 ↔ Data.define](#構造体--datadefine)を参照。 |
| `enum E { A, B(i32) }`（直和型） | バリアントのユニオン | [直和型と網羅性](#直和型と網羅性)を参照。 |
| `trait T { … }` | RBSの`interface`（構造的） | Rustでは名前的、Rigorでは構造的 — 後述。 |
| `<T: Trait>` / `where T: Trait` | RBSの`[T < Bound]`バウンド付きパラメータ | |
| `dyn Trait` | 構造的インターフェース型 | メソッドセットに対する動的ディスパッチ。 |
| `Box<dyn Any>` | `Dynamic[Top]` | Rustが持つ「チェッカーを黙らせる」に最も近いもの。Rigorは日常的に手を伸ばすが、Rustはほとんど使わない。 |
| （リテラル型なし） | `Constant<42>` / `Constant<"hi">` | Rustにリテラル型はない（const genericsは別として）。Rigor独自のもの。 |

## OptionとResult

Rustの有名なふたつのenumははっきり分かれる。一方はほぼ完全にRigorへ対応するが、もう一方は対応しない。Rubyが異なるエラー処理モデルを選んだからだ。

**`Option<T>` ↔ `T?`**。これはほぼ完璧な一致だ。`Option<T>`は「`T`または何もなし」であり、Rigorの`T?`は`T | nil`で、ナローイング（narrowing）は`match` / `if let`を映し出す。

```rust
fn length(s: Option<String>) -> usize {
    match s {
        Some(v) => v.len(),
        None => 0,
    }
}
```

```ruby
def length(s)            # s : String?  (RBS-declared)
  return 0 if s.nil?
  s.length               # s : String — nil stripped by the guard
end
```

捨てるべき反射は`unwrap()`だ。Rustでは、`Some`だと*分かっている*ときに`.unwrap()` / `.expect()`に手を伸ばす。Rigorにはチェッカーを欺くソース内アサーションがない。等価なのは`nil?`ガード（アサートではなくチェック）か、[`rigor-sorbet`](../../plugins/rigor-sorbet/)プラグイン経由の`T.must`だ（[第10章](../10-sorbet/)を参照）。

**`Result<T, E>` ↔ 例外**。ここでモデルは分岐する。Rubyはタグ付きの値を返すのではなく*raise*することで失敗を伝えるので、単一の`Result`キャリアは存在しない。`Result<T, E>`を返すRust関数は、`T`を返しエラーパスでraiseするRubyメソッドになる。

```rust
fn parse(s: &str) -> Result<i32, ParseIntError> { s.parse() }
```

```ruby
def parse(s)             # returns Integer, raises on bad input
  Integer(s)
end
```

Rigorは例外型をシグネチャの一部として追跡しない — 型付きの`throws`も`?`演算子もない。Rustの値を返すスタイルを保ちたいなら、タグ付きタプル（`[:ok, value]` / `[:error, reason]`）を返して`case`/`in`でパターンマッチでき、Rigorは`Tuple`とユニオンを精密に型付けする — だがそれはRustのイディオムを意図的に移植したものであり、慣用的なRubyではない。

## ナローイング — `match` / `if let`

Rustは`match`、`if let`、パターン束縛を通じてナローイングする。Rigorには直接対応するものがあり、サーフェス（surface）は異なっても挙動は一致する。

| Rust | Rigor |
| --- | --- |
| `match x { … }` | `case x; in …` |
| `if let Some(v) = x` | `if x`（`nil`を除去）、または`case x; in val` |
| `if let Pat = x { … }`（束縛） | `case x; in Pat => v` |
| `x as i64`（数値キャスト） | `x.to_i` / `Integer(x)` — 型キャストではなく実際の変換 |
| `x.unwrap()` | （ソース内アサーションなし） — `nil?`ガード、または`rigor-sorbet`経由の`T.must` |
| `matches!(x, Pat)` | `case x; in Pat then true; else false; end`、または`is_a?`述語 |
| ガード`Pat if cond =>` | `in Pat if cond`（パターンガード） |

`match`の構造的パターンの部分は`case`/`in`に1対1で対応する。`in Circle => c`は、Rustの`Circle(c) =>`がそうするのとまったく同じように、その節に沿って`x`を`Circle`にナローイングする。

## 直和型と網羅性

Rustの`enum`は代数的な直和型であり、それに対する`match`は*コンパイラが強制する*網羅性を持つ — バリアントを取りこぼせばコンパイルが通らない。Rigorは同じようにデータをモデル化するが、網羅性には双対の側から取り組む。

データを持つバリアントを伴うRustの`enum`は、Rubyではバリアントごとにひとつの`Data.define`と、それらのユニオンになる。

```rust
enum Shape {
    Circle { radius: f64 },
    Rectangle { w: f64, h: f64 },
}

fn area(s: Shape) -> f64 {
    match s {
        Shape::Circle { radius } => PI * radius * radius,
        Shape::Rectangle { w, h } => w * h,
    }
}
```

```ruby
Circle    = Data.define(:radius)
Rectangle = Data.define(:w, :h)

def area(s)
  case s
  in Circle    then Math::PI * s.radius * s.radius
  in Rectangle then s.w * s.h
  end
end
```

決定的な違いは*方向*だ。[ADR-47](../../adr/47-narrowing-driven-clause-reachability/)の`flow.unreachable-clause`ルールは、節が証明可能に*死んでいる*とき — その対象が先行する節や先行する網羅によってすでに`Bot`へナローイングされているとき — に発火する。

```ruby
case shape
in Circle    then shape.radius
in Rectangle then shape.width * shape.height
in Circle    then "…"   # flow.unreachable-clause — Circle already covered
end
```

Rustはすべてのバリアントをカバーすることを**要求**し、網羅的でない`match`を却下する。Rigorは双対をなす — 決して動かない節は報告するが、すべてのバリアントを扱うことを**強制しない**。分岐を省略した`case`はエラーではない。*到達不能な*節がエラーなのだ。これはfalse-positiveなしのスタンスに従う。省略された分岐は意図的かもしれず（そのバリアントはこの地点に到達できない）、Rigorはそれを理由に正常なコードを怯えさせない。欠けたアームの安全性を取り戻したいなら、末尾の`else raise`が省略を明示的にする — Rustの`_ => unreachable!()`に対応するものだ。

## 構造体 ↔ `Data.define`

Rustの`struct`はRubyの`Data.define`に対応する — イミュータブルで値等価、メンバー形状の集約体だ。Rigorはこれをネイティブにモデル化する（[ADR-48](../../adr/48-data-struct-value-folding/)）。

```rust
struct Point { x: i32, y: i32 }
let p = Point { x: 1, y: 2 };
let a = p.x;                       // a : i32
let q = Point { x: 9, ..p };       // functional update
```

```ruby
Point = Data.define(:x, :y)
p = Point.new(1, 2)
assert_type("1", p.x)    # member value is folded, not just Integer
q = p.with(x: 9)                   # Data#with ↔ Rust's ..p update
```

ここではふたつの点でRustを超える。

- **メンバー値がfoldされる**。`Point.new(1, 2).x`は単なる`Integer`ではなく`1`だ。Rustは構築時にリテラルを消去するが、Rigorは（foldingバジェットの範囲内で）それを保持する。
- **`with`がファーストクラス**。`Data#with`はRustの`..p`関数的更新構文に対応するもので、Rigorはオーバーライドされたメンバーをfoldし込んだ結果を型付けする。

Rubyのミュータブルな`Struct`は意図的にまだ同じ方法ではfoldされない。そのミュータビリティが値foldingの健全性の話を壊すからだ。[第6章](../06-classes/)を参照。

## トレイト ↔ RBSインターフェース

RustのトレイトとRigorの構造的インターフェースはどちらも「これらのメソッドを持つ型」を記述するが、*メンバーシップがどう決まるか*で異なる — そしてその違いは、Goのプログラマーが反対側から感じるものと同じだ。

Rustのトレイトは**コヒーレンスを伴う名前的**だ。型がそのトレイトを持つのは明示的な`impl Trait for Type`があるときのみで、その`impl`がどこに置けるかは孤児ルールが司る。RigorのRBSの`interface`は**構造的**だ。正しいメソッドを持つあらゆるオブジェクトがそれを満たし、意図の宣言もコヒーレンスルールもない。これはRustの`trait`ではなくGoの`interface`だ。

```ruby
# An RBS structural interface
interface _Drawable
  def draw: () -> String
end
```

`String`を返す`draw`に応答するあらゆるRubyオブジェクトが`_Drawable`を満たす — `impl _Drawable for …`を書くことは決してない。Rigorはさらに、インターフェースが一切宣言されていなくても、匿名オブジェクトの*シェイプ*（shape）とケイパビリティ（capability）ロールを推論する。[構造的型付けの付録](../appendix-protocols-and-structural-typing/)が正規の解説だが、短く言えば「意図的に実装する必要のないトレイト」である。

## リファインメントvs newtypeパターン

Rustの不変条件が型システムを超えるとき — 「空でない文字列」「1..=9の整数」 — newtypeパターンに手を伸ばす。検証付きコンストラクタを持つ`struct NonEmptyString(String)`だ。Rigorには代わりにファーストクラスのリファインメント（refinement、篩型とも）キャリアがある。不変条件は通常の型に乗り、ナローイングによって自動的に生み出される。

| Rigorのリファインメント | Rustのイディオム | コメント |
| --- | --- | --- |
| `non-empty-string` | `struct NonEmptyString(String)` newtype | Rigorはラッパーなしで`unless s.empty?`から生み出す。 |
| `positive-int` | `struct PositiveInt(u32)` newtype | Rigorは`n > 0`からナローイングする。 |
| `int<1, 9>` | newtype + 範囲チェック、またはconst genericsの曲芸 | Rigorのレンジキャリアは任意の境界を直接扱う。 |
| `numeric-string` | 検証済みパースをラップするnewtype | 型レベルの対応物なし。 |
| `non-empty-array[T]` | `Vec<T>`上のnewtype | Rigorは`unless arr.empty?`から生み出す。 |

ベース型では表現できない不変条件をエンコードするためだけにnewtypeを書いたことがあるなら、これはRigorがその価値を発揮する部分だ — ラッパーのアロケーションはなく、不変条件はただの`if`からナローイングされる。

## ジェネリクス

Rigorが読むのはRBSのジェネリクスであり、それはRustのものより保守的だ。RBSはバウンド付きのクラスレベルおよびメソッドレベルの型パラメータをサポートするが、呼び出し箇所のインスタンス化をそれほど積極的に推論せず、トレイトバウンドに基づくディスパッチ解決のようなものは持たない。

| Rust | Rigor（RBS経由） |
| --- | --- |
| `fn id<T>(x: T) -> T` | `def id: [T] (T) -> T` |
| `Vec<T>` | `Array[T]` |
| `HashMap<K, V>` | `Hash[K, V]` |
| `fn f<T: Ord>(x: T)` | `def f: [T < Comparable[T]] (T) -> void` |
| `impl Trait`の戻り | 構造的インターフェースの戻り型 |

Rustの関連型、高階トレイトバウンド、const genericsにはRBSの対応物がない。Rigorのジェネリクスは意図的に控えめであり、アナライザーが実際のRubyに対して高速であり続けるためだ。

## 深刻度、抑制、「strictモード」

| Rust | Rigor |
| --- | --- |
| `#![deny(warnings)]` / lintレベル | `severity_profile: lenient` / `balanced` / `strict` |
| `#[allow(lint_name)]` | `# rigor:disable <rule>` |
| クレートレベルの`#![allow(…)]` | `# rigor:disable-file all` |
| `cargo check`（ゲート） | `rigor check lib`（助言者） |

メンタルな転換: `cargo check`はビルドの一部だ — 通過するまでコードは出荷されない。`rigor check`はプログラムがクリアしなければならないゲートではない。深刻度プロファイルでチューニングし、ベースラインを通じて段階的に採用する診断サーフェスだ。プログラムはすでに動いている。

## RustにあってRigorにないもの

何を手放すかについて正直になろう。

- **所有権と借用**。Rustの定義的な機能にRigorの対応物はない — RubyはガベージコレクションされエイリアスもFreeだ。Rigorはライフタイム、ムーブ、`&mut`の排他性をモデル化しない。（これはRigorが埋めようとしているギャップではなく、別の言語の契約（contract）だ。）
- **強制された網羅性**。網羅的でない`match`はRustのコンパイルエラーだ。Rigorは*欠けた*節ではなく*到達不能な*節を報告する — 設計上のことだ（前述）。
- **nullなしの保証**。Rustはnullを*排除*する。`Option<T>`が唯一の不在だ。Rigorの`nil`は依然として存在する — それをナローイングで除去はするが、Rustの型システムができるようには、値が決して`nil`にならないと約束できない。
- **`Result` / `?`演算子**。型付きの値レベルのエラー伝播にRigorの対応物はない。Rubyはraiseする。
- **トレイトコヒーレンスと関連型**。`impl`ベースで孤児ルールに支配されるトレイトの機構は、RBSの構造的モデルの外にある。
- **const generics、ゼロコスト保証、`unsafe`**。いずれもコンパイルモデルの概念であり、ランタイムの助言者には居場所がない。

## RigorにあってRustにないもの

逆方向では。

- **リテラル型／定数型**。`Constant<42>`、`Constant<:ok>`、`Constant<"FOO">`。Rustにリテラル型はなく、最も近いのは手で宣言したunitバリアントの`enum`だ。Rigorは通常の値からそれらを推論する。
- **メソッド呼び出しを通じた定数folding**。`"foo".upcase`は`String`ではなく`Constant<"FOO">`だ。Rigorはどのビルトインメソッドが純粋かをカタログ化し、それらを通じてfoldする。
- **newtypeなしのリファインメント**。不変条件は通常の型に乗り、ラッパー構造体も検証付きコンストラクタもない。
- **`impl`なしの構造的ファセット**。正しいメソッドを持つRubyオブジェクトは、意図の宣言なしにRBSの`interface`を満たす — そしてRigorはそれに加えて匿名シェイプとケイパビリティロールを推論する。
- **false-positiveなしのスタンス**。Rigorは`Dynamic[Top]`のレシーバーについて文句を言うのではなく沈黙を守る。正直な答えが「まあ、チェッカーには知りようがない」であるような診断を目にすることは決してない。
- **アノテーション税なし**。`.rbs`ファイルがゼロのRubyプロジェクトに対する`rigor check`でも、推論から有用な診断が得られる。`.rbs`の追加は段階的だ — スキップしたファイルはすべて境界では`Dynamic[Top]`であって、エラーではない。

## マイグレーションvignette

Rustのモジュール — 網羅的な`match`を持つ直和型と、`Option`を返すルックアップ — をRubyに移植している。元のコード:

```rust
enum Shape {
    Circle { radius: f64 },
    Rectangle { w: f64, h: f64 },
}

fn area(s: &Shape) -> f64 {
    match s {
        Shape::Circle { radius } => PI * radius * radius,
        Shape::Rectangle { w, h } => w * h,
    }
}

fn first_circle(shapes: &[Shape]) -> Option<&Shape> {
    shapes.iter().find(|s| matches!(s, Shape::Circle { .. }))
}
```

Rigorのアプローチ — バリアントには`Data.define`、ディスパッチには`case`/`in`、オプショナルには`T?`、アノテーションなし:

```ruby
# lib/shape.rb
Circle    = Data.define(:radius)
Rectangle = Data.define(:w, :h)

def area(s)
  case s
  in Circle    then Math::PI * s.radius * s.radius
  in Rectangle then s.w * s.h
  end
end

def first_circle(shapes)
  shapes.find { |s| s.is_a?(Circle) }   # returns Circle?  (Circle | nil)
end
```

持ち越されるものと変わるもの:

- `enum`のバリアントは`Data.define`になる — イミュータブルで値等価、メンバー形状で、Rigorはそのメンバー読み出しをfoldする。
- `match`は`case`/`in`になる。`in Circle`は`Shape::Circle { .. }`がそうするのとまったく同じように`s`をナローイングする。
- `Option<&Shape>`はただの`Circle?`の戻りになる — `Array#find`は要素または`nil`を返し、呼び出し箇所の`nil?`ガードが、`if let Some(c)`がそうするようにそれをナローイングする。
- 網羅的な`match`は強制された全域性を失う。Rigorは書いていない3番目のバリアントを要求しない。*書いた*節が決して動けないかどうかだけを教える。Rustの`_ => unreachable!()`が欲しいなら、末尾の`else raise`を加える。

## 次のステップ

ハンドブックの残りを順番に読む必要はおそらくない。有用なポインタ:

- [第3章 — ナローイング](../03-narrowing/) — フロールールについて — `match` / `if let`のナローイングの直接対応物。
- [第6章 — クラス](../06-classes/) — `Data.define`、`struct`の対応物とその値foldingについて。
- [第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/) — ディレクティブ文法について — `predicate-if-true`はユーザー定義ナローイングの対応物。

別のツールと比較したい場合は、兄弟付録ページが[TypeScript](../appendix-typescript/)、[PHPStan](../appendix-phpstan/)、[mypy](../appendix-mypy/)、[Steep](../appendix-steep/)、[TypeProf](../appendix-typeprof/)、[Java / C#](../appendix-java-csharp/)、[Go](../appendix-go/)、[Elixir](../appendix-elixir/)をカバーしている。
