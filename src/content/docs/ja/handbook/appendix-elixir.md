---
title: "付録: Elixirから来た場合"
description: "rigortype/rigor docs/handbook/appendix-elixir.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-elixir.md"
sourcePath: "docs/handbook/appendix-elixir.md"
sourceSha: "648d25d06209c3a62c19fe4d00c88cd327e04b510200871b3b77bb2b5362b40e"
sourceCommit: "98bd3fb5bcd0434c814c1d4e3c864e3888ddeae4"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "Elixirから来た場合"
---

「型」についてのあなたのメンタルモデルがElixirで形作られたなら（Dialyzerのサクセスタイピング、`@spec`/`@type`、そして今まさに言語に取り込まれつつある集合論的な漸進的（gradual）型）、この付録はRigorの語彙をそこにマッピングする。このシリーズのあらゆるページのなかで、その*哲学*がRigorに最も近いのがこのページだ。両者とも本質的に動的言語であり、両者とも型を漸進的に追加し、両者とも狼少年にならない。Elixirの型チェッカーは失敗すると証明できるものだけを指摘する。Rigorも同じだ。この本能（動いているコードを決して怖がらせない）は偶然ではなく共有されたDNAである。

直接の系譜さえある。Rigorの節到達可能性ルール（[ADR-47](../../adr/47-narrowing-driven-clause-reachability/)）は、ありえない`case`節を検出するElixir自身の取り組みをモデルにしている。あなたはRigorの設計上の影響源のひとつから来たのだ。

これは翻訳テーブルであると同時に、両者が分岐する点（Elixirは関数型でイミュータブルかつプロセス指向だが、Rigorはオブジェクト指向でミュータブルな言語を解析する）と、予想以上にうまく揃う点についての議論でもある。

## 5秒ピッチ

| 問い | Elixir | Rigor |
| --- | --- | --- |
| 起源 | 動的。型は漸進的に追加 | 動的。型は漸進的に追加 |
| 健全性のスタンス | サクセスタイピング（証明可能な失敗だけを指摘） | false-positiveなし（エラーを証明できない限り沈黙） |
| アノテーションはどこにあるか？ | ソース内の`@spec`/`@type` | `.rb`の隣の`.rbs`ファイル |
| 「分からない」型 | `dynamic()`/`term()` | `Dynamic[Top]`/`Top` |
| ナローイングエンジン | パターンマッチング + ガード | パターンマッチング + ガード + 述語メソッド |
| 型の代数 | 集合論的（ユニオン / インターセクション / 否定） | ユニオン + 型演算子（`~T`、`T - U`） |

ElixirとRigorは最も重要なことで一致している。動的言語の型チェッカーは、プログラムを拒絶するゲートではなく、決して誤警報を出さないことで信頼を勝ち取るアドバイザーであるべきだ、ということだ。Dialyzerの「成功*しえない*パスについてだけ伝える」は、Rigorの「エラーを証明できない限り沈黙する」と同じ契約（contract）である。そのスタンスこそがあなたがDialyzerを信頼する理由なら、Rigorはすぐに見覚えがあるだろう。

## 型語彙マッピング

| Elixir | Rigor | 備考 |
| --- | --- | --- |
| `integer()` | `Integer` | 両者とも任意精度。 |
| `float()` | `Float` | `Numeric`が共通のスーパータイプ。 |
| `boolean()`（`true \| false`） | `bool`（`Constant<true> \| Constant<false>`） | どちらのシステムでも構造的には2つの定数のユニオン。 |
| `:foo`（アトム） | `Constant<:foo>`（Symbol） | アトム ↔ シンボル。直接対応。[アトム ↔ シンボル](#アトム--シンボル)参照。 |
| `nil` | `nil`（`Constant<nil>`） | Elixirの`nil`はアトムの`nil`。Rubyのものは独自のシングルトン。どちらもfalsy。 |
| `binary()`/`String.t()` | `String` | |
| `term()`/`any()` | `Top`/`Dynamic[Top]` | `any()`は「なんでも」用。`dynamic()`は漸進的エスケープハッチ用。 |
| `none()` | `Bot` | 空の型。住人がいない。 |
| `[t]`（リスト） | `Array[T]` | |
| `{a, b}`（タプル） | `Tuple[A, B]` | 同じ位置ごとのモデル。 |
| `%{optional(k) => v}`（マップ） | `Hash[K, V]` | |
| `%{a: t}`（既知のキーを持つマップ） | `HashShape{a: T}` | 既知のキーを持つクローズドなシェイプ（shape）。 |
| `%User{}`（構造体） | `User = Data.define(...)` | 名前付きでメンバー形状の値。 |
| `[key: t]`（キーワードリスト） | `Hash[Symbol, T]`または`Array[Tuple]` | Rubyのキーワード的なデータは`Hash`。 |
| `t \| u`（集合論的ユニオン） | `T \| U` | 同じ表示。同じ発想。 |
| `dynamic()` | `Dynamic[Top]` | 「ここでは黙る」漸進的キャリア（carrier）。 |
| `(integer() -> binary())` | `^(Integer) -> String`（RBSのproc構文） | |

## パターンマッチング＆ガード ↔ ナローイング

ここはElixirプログラマーが我が家のようにくつろげるセクションだ。なぜならRubyはElixirに近い形でパターンマッチングを借用しており（ピン演算子`^`も含めて）、Rigorのナローイング（narrowing）エンジンはそれを軸に作られているからだ。

| Elixir | Rigor |
| --- | --- |
| `case x do {:ok, v} -> … end` | `case x; in [:ok, v] then …` |
| 関数ヘッドのマッチ`def f(%Circle{} = c)` | `case x; in Circle => c`（Rubyに複数節ヘッドはない） |
| ガード`when is_integer(x)` | `if x.is_a?(Integer)`、または`in Integer` |
| ガード`when x > 0` | `n > 0`は`positive-int`にナローイングする。[リファインメント](#リファインメント--ガード)参照 |
| パターン内の`^pinned` | `case`/`in`内の`^pinned`ピン（同じ演算子、同じ意味） |
| `with {:ok, a} <- step1(), … do` | 連鎖した`case`/`in`、または早期returnを伴うガード節 |
| 複数節関数 + ガード | 1つのメソッド内で`if`ガードを伴う`case`/`in` |

構造上の唯一の違い: Elixirはパターンとガードを持つ*複数の関数ヘッド*を書いてディスパッチし、ランタイムが最初にマッチするものを選ぶ。Rubyに複数節`def`はなく、節を1つのメソッド本体に`case`/`in`で畳み込む。Rigorが各`in`節に沿って行うナローイングは、Elixirのコンパイラが各関数ヘッドに対して今や推論する型の対応物である。

そして系譜は逆向きにも流れる。Rigorの`flow.unreachable-clause`ルール（より前の節がすでにその型をカバーしているために決してマッチしえない`case`/`in`節を指摘する）は、Elixirの節到達可能性の取り組み（[ADR-47](../../adr/47-narrowing-driven-clause-reachability/)）を直接モデルにしている。これはありえない`case`節についてElixirが警告してくれる機能としてあなたが知っているかもしれないものを、Rubyに持ち込んだものだ。

## 集合論的型と漸進的な`dynamic()`

Elixirの型システムは*集合論的*だ。型は値の集合であり、ユニオン・インターセクション・否定で組み立て、`dynamic()`型が漸進的境界（gradual boundary）を示す。Rigorも同じ「値のユニオン」という直観（[値束](../../type-specification/value-lattice/)）の上に作られており、一般的なケースに対応する演算子の語彙を持っている。

| Elixir | Rigor |
| --- | --- |
| `t \| u`（ユニオン） | `T \| U` |
| インターセクション`t and u` | `Intersection[T, U]` |
| 否定`not t` | `~T`（補集合） |
| 差（集合の引き算） | `T - U`（型差） |
| `dynamic()` | `Dynamic[Top]` |

漸進的なストーリーは精神的にほぼ同一だ。Elixirで`dynamic()`と型付けされた値は、Rigorの`Dynamic[Top]`レシーバーと同様、チェッカーが一歩引いて推測する代わりに沈黙を保つ点である。どちらのシステムも実際のコードで実用的であり続けるためにこれに頼り、どちらもそれに手を伸ばすことを当たり前のこととして扱う。

Elixirがさらに先を行く点: Elixirではインターセクションと否定を普通の`@type`式として*記述*でき、推論がそれらについて隅々まで推論する。Rigorは`~T`と`T - U`を内部や一部のディレクティブで使うが、`.rbs`にはまだ完全な集合論的オーサリングサーフェス（surface）を公開していない。日常的な重なり（ユニオンと漸進的な`dynamic()`境界）こそ、両者が同じに感じられる部分だ。

## タグ付きタプル ↔ `case`/`in`

Elixirの代名詞的なイディオム（返されてマッチされる`{:ok, value}`/`{:error, reason}`）はほぼそのまま翻訳できる。Rubyは配列と`case`/`in`で同じ形状を表現するからだ。

```elixir
case Integer.parse(s) do
  {n, ""} -> {:ok, n}
  _       -> {:error, :invalid}
end
```

```ruby
def parse(s)
  n = Integer(s, exception: false)
  n ? [:ok, n] : [:error, :invalid]
end

case parse(s)
in [:ok, n]      then n
in [:error, why] then handle(why)
end
```

Rigorは`Tuple`を位置ごとに、そして2つのタグ付き形状のユニオンを精密に型付けし、`in [:ok, n]`はElixirのパターンとまったく同じようにその節に沿ってナローイングする。（Rubyのイディオムはエラーパスで例外を上げる方にも手を伸ばすが、タグ付きタプルのスタイルを保ちたいなら、それは綺麗に移植できる。）

## アトム ↔ シンボル

ElixirのアトムとRubyのシンボルは同じ発想（インターンされ同一性比較される名前定数）であり、Rigorはシンボルを単なる`Symbol`ではなく、精密なシングルトン型である`Constant<:foo>`に畳み込む。

```ruby
status = :ok
assert_type(":ok", status)

# a discriminated union over atoms/symbols:
def describe(s)         # s : Constant<:ok> | Constant<:error>
  case s
  in :ok    then "fine"
  in :error then "broken"
  end
end
```

これはElixirの集合論的型がアトムに与えるモデリング（特定のアトムに対するシングルトン型）と同じであり、Elixirでアトムキーを使って書く判別ユニオンのディスパッチと同じものを動かす。

## プロトコル＆ビヘイビア

Elixirの2つの概念がRigorの構造的型付けにマッピングされる。それぞれに1つずつ違いのひねりがある。

- **ビヘイビア**（ビヘイビアモジュール内の`@callback`、実装側の`@behaviour`）は、モジュールが提供しなければならない関数の集合を記述する。Rigorの最も近い対応物はRBSの`interface`（メソッドの名前付き集合）だが、重要な違いがある。RBSのインターフェースは**構造的に**満たされる（メソッドを持っていれば満たす）のに対し、Elixirの`@behaviour`は宣言される。
- **プロトコル**（`defprotocol`/`defimpl`）はデータ型でディスパッチし、プロトコルはその型に対する*明示的な*`defimpl`によって満たされる。Rustのトレイトのように名前的だ。Rigorに型ごとの`defimpl`はない。オブジェクトはメソッドに応答することで構造的なインターフェースを満たす、それだけだ。

つまりElixirの「実装を抽象化する」2つの仕組みは、どちらもRigorの1つの構造的インターフェースの仕組みになる。これはElixirのどちらの構文よりもGoの暗黙的インターフェースに近い。[構造的型付けの付録](../appendix-protocols-and-structural-typing/)が正規の解説だ。

## リファインメント ↔ ガード

`when x > 0`のようなElixirのガードは節の境界で値を制約し、新しい型システムはそうしたガードのいくつかについて推論する。Rigorは同じガードを、普通の型に乗る名前付きの**リファインメントキャリア**に変える。

```ruby
def reciprocal(n)
  return nil unless n > 0
  # n is positive-int here when typed as Integer; untyped params stay Dynamic[top]
  1.0 / n
end
```

| Rigorのリファインメント | Elixirのガード / イディオム | コメント |
| --- | --- | --- |
| `positive-int` | `when n > 0` | Rigorは結果に名前を付けて運ぶ。 |
| `non-empty-string` | `when s != ""`/`byte_size(s) > 0` | Rigorは`unless s.empty?`から生成する。 |
| `int<1, 9>` | `when x in 1..9` | Rigorの範囲キャリアは任意の境界を扱う。 |
| `non-empty-array[T]` | `when xs != []` | Rigorは`unless arr.empty?`から生成する。 |
| `numeric-string` | `Integer.parse/1` + マッチ | Elixirに直接の対応物なし。 |

概念的な一致は強い。どちらのシステムも*ランタイムガード*を、より精密な型が判明する場所として使う。Rigorが付け加えるのは、その精密な型に名前を付けて先へ流すことだ。

## 深刻度、抑制、「strictモード」

| Elixir | Rigor |
| --- | --- |
| Dialyzerの警告選択 | `severity_profile: lenient`/`balanced`/`strict` |
| `@dialyzer {:nowarn_function, …}` | `# rigor:disable <rule>` |
| モジュールレベルのDialyzerスキップ | `# rigor:disable-file all` |
| `mix dialyzer`（助言的） | `rigor check lib`（助言的） |

どちらも本質的に助言的であり、どちらもプログラムの実行をブロックしない。違いはいつ実行されるかだ。DialyzerはコンパイルされたBEAMバイトコードに対して、RigorはRubyソースに対して。採用の形（深刻度を調整し、狭く抑制し、残りはベースラインに採る）は同じだ。

## ElixirにあってRigorにないもの

何が違うかを正直に。

- **記述されたインターセクションと否定**。Elixirではインターセクション型と否定型を普通の`@type`式として書け、隅々までそれについて推論する。Rigorは`~T`/`T - U`を内部で使うが、完全な集合論的オーサリングサーフェスを公開していない。
- **複数節の関数ヘッド**。別々の関数ヘッドにまたがるパターンマッチングのディスパッチで、ランタイムがマッチを選ぶものには、Rubyの`def`レベルの対応物がない。`case`/`in`に畳み込む。
- **遍在する代入としてのパターンマッチング**。Elixirの`=`はどこでもマッチ演算子だが、Rubyのパターンマッチングは`case`/`in`（および`=>`/`in`のワンライナー）にスコープされる。
- **プロセスと並行性の型**。BEAMのプロセスモデルにRigorの対応物はない。
- **デフォルトでのイミュータビリティ**。Elixirのデータはイミュータブルだが、Rubyはミュータブルであり、RigorはElixirでは単に生じない変更の作用について推論しなければならない。

## RigorにあってElixirにないもの

逆方向。

- **今日、Rubyのために出荷されている**。Elixirの集合論的型は段階的に言語へ取り込まれつつあるが、RigorのアナライザーはRubyのために今ここにあり、false-positiveなしのスタンスはすでに発効している。
- **メソッド呼び出しを通じた定数folding**。`"foo".upcase`は`String`ではなく`Constant<"FOO">`だ。Rigorはどのビルトインメソッドが純粋かをカタログ化し、それらを通じてfoldする。DialyzerやElixirの型は、呼び出し結果をこのようにシングルトン型へfoldしない。
- **名前付きのリファインメントキャリア**。`non-empty-string`、`positive-int`、`int<1, 9>`、`numeric-string`等。ファーストクラスで、名前付きで、ガードから先へ流れる。
- **推論されたオブジェクトシェイプとケイパビリティロール**。ビヘイビアやプロトコルを超えて、Rigorは値の使われ方から無名の構造的シェイプを推論する。
- **アノテーション税なし**。`.rbs`ファイルがゼロのRubyプロジェクトに対する`rigor check`は、推論だけから有用な診断をもたらす。`.rbs`を加えるのは段階的だ。

## マイグレーションvignette

Elixirのモジュール（構造体に対するパターンマッチされた関数ヘッドが2つほどと、タグ付きタプルのパーサ）をRubyに移植しているとしよう。元のコード:

```elixir
defmodule Shape do
  def area(%{kind: :circle, radius: r}),    do: :math.pi() * r * r
  def area(%{kind: :rectangle, w: w, h: h}), do: w * h
end

def parse_radius(s) do
  case Float.parse(s) do
    {r, ""} -> {:ok, r}
    _       -> {:error, :invalid}
  end
end
```

Rigorのアプローチ（節を1つのメソッドに畳み込むハッシュパターンを伴う`case`/`in`と、そのまま移植できるタグ付きタプルのパーサ）:

```ruby
# lib/shape.rb
def area(shape)
  case shape
  in {kind: :circle, radius:}      then Math::PI * radius * radius
  in {kind: :rectangle, w:, h:}    then w * h
  end
end

def parse_radius(s)
  r = Float(s, exception: false)
  r ? [:ok, r] : [:error, :invalid]
end
```

何が引き継がれ、何が変わるか:

- 複数の関数ヘッドは1つの`case`/`in`に畳み込まれる。キーのバインドを伴うRubyのハッシュパターン（`in {radius:}`）は、Elixirのマップパターン（`%{radius: r}`）をほぼ正確に映す。
- アトムキー（`:circle`、`:ok`）はシンボルになり、`Constant<:circle>`/`Constant<:ok>`に畳み込まれる。Elixirのアトムが得るのと同じシングルトン型付けだ。
- `{:ok, r}`/`{:error, _}`のタグ付きタプルは`[:ok, r]`/`[:error, _]`の配列になり、精密な`Tuple`ユニオンとして型付けされ、`case`/`in`でマッチされる。
- 決してマッチしえない`in`節を加えると（たとえば2つ目の`:circle`の腕など）、Rigorの`flow.unreachable-clause`がそれを指摘する。これはありえない節についてElixirが出すであろう警告と同じだ。

## 次のステップ

ハンドブックの残りを順番に読む必要はおそらくない。有用なポインタ:

- [第3章: ナローイング](../03-narrowing/): フロールール。ガードとパターンマッチのナローイングの対応物。
- [第7章: RBSと`RBS::Extended`](../07-rbs-and-extended/): ディレクティブ文法。`predicate-if-true`はユーザー定義ガードの対応物で、Rigorにカスタムの`is_*`ガードを教えることに最も近いものだ。
- [プロトコルと構造的型付け](../appendix-protocols-and-structural-typing/): ビヘイビアとプロトコルがどちらもRigorの単一の構造的インターフェースの仕組みにどうマッピングされるか。

別のツールと比較したい場合は、兄弟付録ページが[TypeScript](../appendix-typescript/)、[PHPStan](../appendix-phpstan/)、[mypy](../appendix-mypy/)、[Steep](../appendix-steep/)、[TypeProf](../appendix-typeprof/)、[Java / C#](../appendix-java-csharp/)、[Rust](../appendix-rust/)、[Go](../appendix-go/)をカバーしている。
