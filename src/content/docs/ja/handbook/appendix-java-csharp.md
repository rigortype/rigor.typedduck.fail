---
title: "付録 — Java / C#から来た場合"
description: "Imported from rigortype/rigor docs/handbook/appendix-java-csharp.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-java-csharp.md"
sourcePath: "docs/handbook/appendix-java-csharp.md"
sourceSha: "82f176737b06dc9bcc20cd6802069672bbe5a3827031e277454b306ad00e6414"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "Java / C#から来た場合"
---

「静的型」のメンタルモデルがJavaやC#で形成されたなら、この付録はRigorの語彙をすでに知っている概念へマッピングする。両言語はほぼ同じ反射をRubyに持ち込む — 名前的型（nominal type、公称型とも）優先、すべてにアノテーション、ジェネリクス、レコード、シールド階層、パターンマッチングする`switch` — ので、1ページで両方を扱い、JavaとC#が分かれる数少ない箇所はインラインで指摘する。

例はモダンなLTSベースラインを前提とする: **Java 21**（レコード、シールド型、パターンマッチングする`switch`、レコードパターン）と、.NET 8上の**モダンなC#**（ヌル許容参照型、レコード、`switch`式、宣言サイトの分散（variance））。機能がそれより新しい場合はページ内で明記する。

これは変換テーブルに加えて、Rigorが本当に異なる選択をしている箇所の議論である。そこがJava / C#の反射に裏切られる場所だ — そしてこの2言語で最大のものはデフォルトの方向だ: あなたは先にアノテーションを書き、コンパイラはローカルに推論する。Rigorは先に推論し、エッジでのみアノテーションを求める。

## 5秒ピッチ

| 問い | Java / C# | Rigor |
| --- | --- | --- |
| アノテーションはどこに書くか？ | ソース内、すべての宣言に | `.rb`の隣の`.rbs`ファイル |
| 誰が書くか？ | 作者（常に） | 作者OR推論 |
| アノテートされていない値のデフォルト | アノテートされていない値は存在しない（`var`ローカルを除く） | 精密に推論、または`Dynamic[Top]` |
| 型の同一性 | 名前的（クラスが`implements` / `: IFace`） | 名前的 + 構造的ファセット |
| 推論スコープ | ローカルのみ（`var` / `var`） | メソッドボディ全体、`def`境界を越えて |
| 診断はいつ発火するか？ | 型がチェックを通らないたびに | Rigorが不健全性を**証明**できるときだけ |

JavaとC#は*事前コンパイル型・健全性優先*の型システムだ: すべての宣言が型チェックを通るまで何も動かない。Rigorは逆のスタンス — すでに動いているRubyを解析し、誤りだと証明できないものについては沈黙する。再訓練すべき反射は「型チェッカーはプログラムが通過しなければならないゲートだ」というもの: Rigorではプログラムはすでに通過しており（動いている）、アナライザーは確信があるときだけ口を開く助言者だ。

## 型語彙マッピング

| Java | C# | Rigor | 備考 |
| --- | --- | --- | --- |
| `String` | `string` | `String` | 表示は`Nominal[]`を省く。 |
| `int` / `long` | `int` / `long` | `Integer` | Rubyの整数は任意精度。`int`/`long`の分割はない。 |
| `double` / `float` | `double` / `float` | `Float` | `Numeric`が共通のスーパータイプ。 |
| `boolean` | `bool` | `bool`（`Constant<true> \| Constant<false>`） | `bool`は構造的にはふたつの定数のユニオン型。 |
| `null` | `null` | `nil`（`Constant<nil>`） | Rubyには「値なし」が1つ。C#の`null`と`default`は`nil`に潰れる。 |
| `Object` | `object` | `Object` / `Top` | 「何でも」を意味するときの普遍的なスーパータイプが`Top`。 |
| `void` | `void` | `void` | 同じ考え方 — 呼び出し側は値を消費してはならない。 |
| （なし） | （なし） | `Bot` | 空の型 — 到達不能な分岐、`raise`のみのボディ。Javaの`Void` / C#の`Never`（提案中）が最も近い表記。 |
| `Object`（型なし境界） | `dynamic` | `Dynamic[Top]` | C#の`dynamic`が最も近い類似物 — 「ここは黙っていて」キャリア（carrier）。 |
| `T[]` / `List<T>` | `T[]` / `List<T>` / `IEnumerable<T>` | `Array[T]` | |
| `Map<K, V>` | `Dictionary<K, V>` / `IDictionary<K, V>` | `Hash[K, V]` | |
| `Set<T>` | `HashSet<T>` / `ISet<T>` | `Set[T]` | |
| `record Point(int x, int y)` | `record Point(int X, int Y)` | `Point = Data.define(:x, :y)` | [レコード ↔ Data.define](#レコード--datadefine)を参照。 |
| `Optional<T>` | `T?`（ヌル許容参照型） | `T?`（すなわち`T \| nil`） | Javaは*コンテナ*としてモデル化、C#は*型修飾子*として。[ヌル許容性](#ヌル許容性)を参照。 |
| `enum Color { RED, GREEN }` | `enum Color { Red, Green }` | `Constant<:red> \| Constant<:green>`（Symbolのユニオン型） | Rubyにはネイティブのenumがない。[`rigor-mangrove`](../../plugins/)プラグインがよりリッチなenum DSLに型を付ける。 |
| `sealed interface Shape permits …` | `abstract`基底 + シールド階層 | 部分型（subtype）のユニオン型 | [シールド型と網羅性](#シールド型と網羅性)を参照。 |
| `<T>`（ジェネリック） | `<T>`（ジェネリック） | RBSの`[T]`型パラメータ | |
| `? extends T`（使用サイト） | `out T`（宣言サイト） | 共変（covariant）型パラメータ | [ジェネリクスと分散](#ジェネリクスと分散)を参照。 |
| `? super T`（使用サイト） | `in T`（宣言サイト） | 反変（contravariant）型パラメータ | |
| `var x = …` | `var x = …` | （表記なし — すべてのローカルが推論される） | Rigorは`var`宣言されたものだけでなく*すべて*のローカルを推論する。 |
| （リテラル型なし） | （リテラル型なし） | `Constant<42>` / `Constant<"hi">` | どちらの言語もリテラル型を持たない。これはRigorの新機軸 — 下記参照。 |
| `Stream<T>` / Streams API | `IEnumerable<T>` / LINQ | `Enumerable`（型付きで返すが、クエリ層はなし） | 要素型は流れる。型レベルのクエリ代数はない。 |

## 名前的型優先vs推論優先

JavaとC#では、値の型はその宣言が言うとおりのものだ。`var`は存在するが、それは*ローカル*推論 — コンパイラはあなたが書けたはずの型を埋めるだけで、メソッド境界を越えることはない。フィールド型、パラメータ型、戻り型は常に作者が書く。

Rigorはこれを逆転させる。メソッドボディ全体、そしてソース内の`def`境界を*通り抜けて*推論する — `.rbs`を持たないメソッドでも、そのボディから推論された戻り型に呼び出し側を縛る:

```ruby
def classify(n)
  return :zero     if n.zero?
  return :positive if n.positive?
  :negative
end

result = classify(7)
```

C#の対応物はパラメータ型と戻り型を作者が書くアノテーションとして要求し、両方を書いても`switch`は3分岐のリテラルユニオン型ではなく`string`を返す — C#にはそれを運ぶリテラル型がない:

```csharp
string Classify(int n) =>
    n == 0  ? "zero"
  : n > 0   ? "positive"
  :           "negative";
// result : string
```

sigを書く必要が本当にあるとき — パブリック境界で、ボディが動的すぎるとき、パラメータの形状（shape）を観察するのではなく*強制*したいとき — それは`.rb`ソースではなく`sig/<file>.rbs`に入る。この分離は意図的だ（[ADR-1](../../adr/1-types/)と[ADR-5](../../adr/5-robustness-principle/)を参照）。宣言をメソッドボディの外に保つのと同じことだが、Rigorはそれを*ファイル*の外に保つ。

## ナローイング — `instanceof`、`is`、パターン`switch`

両言語ともフローセンシティブ（flow-sensitive）なナローイング（narrowing）を持ち、モダンなJava / C#はパターンバインディング（`instanceof String s`、`is string s`）を追加した。Rigorには直接対応するものがある。語彙は異なるが、振る舞いは一致する。

| Java | C# | Rigor |
| --- | --- | --- |
| `if (x != null)` | `if (x is not null)` | `if x`（`false` / `nil`を除去）または`unless x.nil?` |
| `x instanceof String` | `x is string` | `x.is_a?(String)` |
| `x instanceof String s`（バインディング） | `x is string s`（バインディング） | `case x; in String => s` |
| `switch (x) { case Foo f -> … }` | `switch (x) { case Foo f => … }` | `case x; in Foo => f` |
| `(Foo) x`（キャスト） | `(Foo)x`（キャスト） | （ソース内キャストなし） — `is_a?`ガード、または[`rigor-sorbet`](../../plugins/rigor-sorbet/)経由の`T.cast` |
| `Objects.requireNonNull(x)` | `x!`（null-forgiving） | （ソース内アサーションなし） — `unless x.nil?`、または`rigor-sorbet`経由の`T.must` |
| `boolean`を返すユーザーメソッド | `bool`を返すユーザーメソッド | 述語に`%a{rigor:v1:predicate-if-true: x is Foo}`ディレクティブ |

捨てるべき反射は**キャスト**だ。Java/C#では、コンパイラと意見が食い違うたびに`(Foo) x`やC#のnull-forgivingな`x!`に手を伸ばす。Rigorにはソース内キャストがない。等価物は:

1. **ガードを足す**。`unless x.nil?; x.upcase; end`が慣用的な手 — そして`x!`と違い、これはアサートではなくチェックされる。
2. **`.rbs`を絞る**。多くの場合、根本的な問題はライブラリのsigが緩すぎることだ。
3. **`rigor-sorbet`プラグインを使う**。ソース内アサーションが欲しければ`T.let` / `T.cast` / `T.must`を採用する。[第10章](../10-sorbet/)を参照。

## レコード ↔ `Data.define`

Javaの`record`やC#の位置指定`record`は、Rubyの`Data.define`にほぼ正確にマッピングされる — イミュータブルで、値等価で、メンバー形状の集約体だ。Rigorはこれをネイティブにモデル化する（[ADR-48](../../adr/48-data-struct-value-folding/)）。

```java
// Java 21
record Point(int x, int y) {}
var p = new Point(1, 2);
int a = p.x();          // a : int
Point q = p.withX(...); // (no built-in wither; you write it)
```

```csharp
// modern C#
record Point(int X, int Y);
var p = new Point(1, 2);
int a = p.X;            // a : int
var q = p with { X = 9 };  // non-destructive mutation
```

```ruby
Point = Data.define(:x, :y)
p = Point.new(1, 2)
assert_type("1", p.x)   # member value is folded, not just Integer
q = p.with(x: 9)                  # Data#with ↔ C#'s `with` expression
```

どちらの言語よりも踏み込んでいる点がふたつ:

- **メンバー値がfoldされる**。`Point.new(1, 2).x`は単なる`Integer`ではなく`1`だ。JavaとC#は構築時にリテラルを消去する。Rigorはそれを保持する（通常のfolding予算に従う）。
- **`with`がファーストクラス**。Rubyの`Data#with`はC#の`with`式の直接対応物であり、Rigorはオーバーライドされたメンバーをfold込んで結果に型を付ける。（Javaには組み込みのwitherがない。）

`Struct` — Rubyの*ミュータブル*な兄弟 — は意図的にまだ同じようにfoldされない。そのミュータビリティが値foldingの健全性のストーリーを壊すからだ。[第6章](../06-classes/)を参照。

## ヌル許容性

ここがJavaとC#が無視できないほど分かれる唯一の軸であり、C#がJavaよりもRigorに近づく場所だ。

**C#**（ヌル許容参照型、C# 8+）: `string?`は*型修飾子*だ。コンパイラはヌル許容性をフローセンシティブに追跡し、null可能性のあるデリファレンスについて警告する。これはほぼ正確にRigorのモデルだ — `T?`は`T | nil`であり、ナローイングも同じ:

```csharp
int Length(string? s) {
    if (s is null) return 0;
    return s.Length;   // s : string — null stripped by the flow
}
```

```ruby
def length(s)            # s : String?  (RBS-declared)
  return 0 if s.nil?
  s.length               # s : String — nil stripped by .nil?
end
```

**Java**: ヌル許容な*型*は存在しない。`Optional<T>`（`.map` / `.orElse`を通さねばならないコンテナ）に手を伸ばすか、コンパイラが強制しない`@Nullable`のようなアノテーションを使うかだ。Rigorの`T?`はJavaの`Optional<T>`よりもC#の`string?`に近い — それはアンラップするラッパーではなく、フローがナローイングするユニオン型だ。Javaの`Optional<T>`を返すコードを移植しているなら、慣用的なRubyはラッパーオブジェクトではなく、素の`T?`戻り値に呼び出し側での`nil?`ガードを足したものだ。

C#との違いがひとつ: Rigorのヌル許容性は**常にオン**であり、**決して強制しない**。C#のNRT警告は`!`で黙らせられる。Rigorは、あるパスでレシーバーが`nil`だと証明できない限り`possible-nil`を発火させない — 有効化すべきヌル許容コンテキストもなければ、手を伸ばすforgivingオペレーターもない。

## ジェネリクスと分散

Rigorが読むのはRBSのジェネリクスであり、それはどちらの言語のものよりも保守的だ。RBSはバウンド付きのクラスレベル・メソッドレベルの型パラメータをサポートするが、C#やJavaのターゲット型付けほど積極的に呼び出しサイトのインスタンス化を推論しない。

| Java | C# | Rigor（RBS経由） |
| --- | --- | --- |
| `<T> T id(T x)` | `T Id<T>(T x)` | `def id: [T] (T) -> T` |
| `List<T>` | `List<T>` | `Array[T]` |
| `Map<K, V>` | `Dictionary<K, V>` | `Hash[K, V]` |
| `List<? extends Animal>`（使用サイト） | `IEnumerable<out Animal>`（宣言サイト） | 共変`[out T]`パラメータ |
| `Consumer<? super Cat>`（使用サイト） | `IComparer<in Cat>`（宣言サイト） | 反変`[in T]`パラメータ |
| バウンド付き`<T extends Comparable<T>>` | `where T : IComparable<T>` | `[T < Comparable[T]]`バウンド |

分散のストーリーが注目すべきギャップだ。C#は分散を*宣言*に固定し（インターフェースの`in` / `out`）、Javaは*使用*に固定する（各参照のワイルドカード）。RBSはC#のように宣言サイトの分散マーカーを使うが、サーフェス（surface）はより狭く、RigorはあなたがJavaでワイルドカードに手を伸ばすようなケースでは構造的ファセットとリファインメント（refinement、篩型とも）に頼る。

## シールド型と網羅性

Javaの`sealed interface … permits`とC#のシールド階層は、コンパイラが`switch`の網羅性を証明できるようにする — そして網羅的でなければ*エラー*にする。Rigorは同じ形状に反対側からアプローチする。

部分型のクローズドな集合はRigorではユニオン型であり、フローエンジンはどの`case`/`when`と`case`/`in`節がまだマッチしうるかを追跡する。[ADR-47](../../adr/47-narrowing-driven-clause-reachability/)の`flow.unreachable-clause`ルールは、節が証明可能に死んでいるとき — その対象がすでに先行する節（節ごとの素性）または先行する網羅によって`Bot`にナローイングされているとき — に発火する:

```ruby
case shape
in Circle    then shape.radius
in Rectangle then shape.width * shape.height
in Circle    then "…"   # flow.unreachable-clause — Circle already covered
end
```

決定的な*方向*の違い: JavaとC#は網羅性を**要求**し、ケースを取りこぼす`switch`を拒否する。Rigorはその双対をする — 決して動かない節を報告するが、すべてのバリアントを処理することを**強制しない**。網羅的でない`case`はRigorではエラーではない。*到達不能な*節が診断だ。これはRigorの偽陽性なしのスタンスに従う: 分岐を省略した`case`は意図的かもしれず（省略されたバリアントはこの地点に到達できない）、Rigorは動いているコードをそれで脅かさない。

## リファインメントキャリア — どちらの言語も持たない部分

JavaもC#も「長さ≥1の文字列」や「1..9の整数」を型レベルで言うことはできない。例外を投げるコンストラクタ、値オブジェクト、ランタイムチェックに手を伸ばすことになる。Rigorはファーストクラスのリファインメントキャリアを持ち、ナローイングによって自動的に生成される。

| Rigorのリファインメント | Java / C#で最も近いもの | コメント |
| --- | --- | --- |
| `non-empty-string` | バリデーションをラップする`NonEmptyString`値クラス | Rigorは`unless s.empty?`から生成、ラッパー型なし。 |
| `positive-int` | `PositiveInt`値オブジェクト、またはランタイムガード | Rigorは`n > 0`からナローイングする。 |
| `int<1, 9>` | 9個の定数の`enum`、または範囲チェック | Rigorの範囲キャリアは列挙せずに任意のバウンドを扱う。 |
| `numeric-string` | `string` + `int.TryParse`の規律 | どちらの言語にも型レベルの類似物がない。 |
| `non-empty-array[T]` | 非空コレクションの値クラス | Rigorは`unless arr.empty?`から生成する。 |

型システムでは表現できない不変条件をエンコードするためだけに`PositiveInt`値クラスを書いたことがあるなら、ここがRigorが真価を発揮する部分だ — 不変条件は通常の`Integer`に乗り、ラッパーの確保はなく、素の`if`からナローイングされる。

## 深刻度、抑制、「strictモード」

| Java / C# | Rigor |
| --- | --- |
| `-Xlint` / `<TreatWarningsAsErrors>` / アナライザーの深刻度 | `severity_profile: lenient` / `balanced` / `strict` |
| C#の`<Nullable>enable</Nullable>` | Rigorでは常時オンのnilナローイング（有効化するコンテキストなし） |
| `@SuppressWarnings("…")` / `#pragma warning disable` | `# rigor:disable <rule>` |
| 先頭のファイルレベル`#pragma warning disable` | `# rigor:disable-file all` |
| `javac` / `dotnet build`（ゲート） | `rigor check lib`（助言者） |

メンタルシフト: Java/C#では型チェッカーはビルドの一部だ — 通過するまでコードは出荷されない。`rigor check`はプログラムが通過しなければならないビルドステップではない。深刻度プロファイルでチューニングし、ベースライン（baseline）経由でインクリメンタルに採用する診断ゲートだ。プログラムはすでに動いている。

## JavaとC#が異なる箇所

このページの大部分でJavaとC#は足並みを揃える。揃わない箇所と、それぞれがRigorに対してどちらに傾くか:

- **ヌル許容性**（上記でカバー済み）: C#の`string?`はRigorの`T?`に近い。Javaの`Optional<T>`はコンテナであり、より遠い。
- **分散**: C#はRBSのように宣言サイト（`in` / `out`）。Javaは使用サイト（ワイルドカード）。C#出身のRBS読者は分散マーカーを馴染み深く感じるだろう。
- **`dynamic`**: C#は本物の`dynamic`型を持つ — `Dynamic[Top]`の直接対応物だ。Javaの最も近い等価物は`Object`参照にリフレクションを足したもので、「チェッカーを黙らせる」意味論はない。
- **値型**: C#の`struct` / `record struct`はRigorがモデル化しない値意味論を持つ（Rubyにはこの層で値とリファレンスの区別がない）。Javaはモダンなものではユーザー値型を持たない（Project Valhallaはまだ正式リリースされていない）。
- **検査例外**: Javaの`throws`句はRigorに類似物のない型付きエフェクトだ。C#は（Rigorと同様）型システムで例外を追跡しない。

## Java / C#にあってRigorにないもの

何を諦めるのかについて正直になろう:

- **強制される網羅性**。バリアントを取りこぼすシールドな`switch`はJava/C#ではコンパイルエラーだ。Rigorは*到達不能*な節を報告し、*欠けている*節は報告しない — 設計上そうだ（上記参照）。
- **コンパイラが強制するヌル許容性**。C#のNRTはnullを処理するよう*警告*する。Rigorはnilをナローイングするが、必要だと証明できないガードを決して強制しない。
- **検査例外**。Javaの`throws`にRigorの類似物はない。
- **値型の意味論**。C#の`struct` / `record struct`の値モデルはRigorのサーフェスの外だ。
- **型レベル計算**。JavaもC#も例えばTypeScriptほど型レベルで表現力が高くはないが、両者ともRBSが公開するよりも多くのジェネリック機構（高階種っぽいパターン、複雑なバウンド）を持つ。Rigorのジェネリクスは、アナライザーが実際のRubyで高速に保たれるよう意図的に控えめだ。
- **IDEの完成度**。数十年のIntelliJ / Visual Studioへの投資がJavaとC#を支える。Rigorは今日、診断と`rigor type-of`を出荷している。LSPベースのエディタ統合はロードマップにある。

## RigorにあってJava / C#にないもの

逆方向 — そしてこの2言語については、どちらもリテラル型を持たないため、リストはあなたが思うより長い:

- **リテラル / 定数型**。`Constant<42>`、`Constant<:zero>`、`Constant<"FOO">`。JavaとC#はリテラル型を*持たない* — 最も近いのは`enum`で、それも手で宣言した集合しかカバーしない。Rigorは通常の値からそれらを推論する。
- **メソッド呼び出しを通じた定数folding**。`"foo".upcase`は`String`ではなく`Constant<"FOO">`だ。Rigorはどのビルトインメソッドが純粋かをカタログ化し、それを通じてfoldする。
- **ファーストクラスのリファインメント**。`non-empty-string`、`positive-int`、`int<1, 9>`、`numeric-string` — 通常の型に乗る不変条件で、値クラスのラッパーはない。
- **宣言なしの構造的ファセット**。正しいメソッドを持つRubyオブジェクトはRBSの`interface`を満たす（*構造的*なインターフェース — Goの`interface`であって、Javaの名前的な`implements`ではない）。適合を宣言する必要はない。Rigorが形状を推論する。[構造的型付けの付録](../appendix-protocols-and-structural-typing/)を参照。
- **偽陽性なしのスタンス**。Rigorは`Dynamic[Top]`レシーバーについて文句を言うのではなく沈黙する。正直な答えが「まあ、技術的にはチェッカーには分からない」であるようなRigor診断を目にすることは決してない。
- **アノテーション税なし**。`.rbs`ファイルがゼロのRubyプロジェクトに対する`rigor check`でも、推論から有用な診断が得られる。JavaとC#は`var`ローカルしか推論しない。それ以外はすべてあなたが書く。Rigorに`.rbs`を足すのはインクリメンタルだ — スキップしたファイルは境界で`Dynamic[Top]`になるのであって、エラーにはならない。

## マイグレーションvignette

C#のドメインモデル — その上に`switch`を持つシールド気味の形状階層 — をRubyに移植している。元のコード:

```csharp
abstract record Shape;
record Circle(double Radius)          : Shape;
record Rectangle(double W, double H)  : Shape;

double Area(Shape s) => s switch {
    Circle c    => Math.PI * c.Radius * c.Radius,
    Rectangle r => r.W * r.H,
    _           => throw new ArgumentException(),
};
```

Rigorのアプローチ — レコードには`Data.define`、ディスパッチには`case`/`in`、アノテーションなし:

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
```

引き継がれるものと変わるもの:

- レコードは`Data.define`になる — イミュータブルで、値等価で、メンバー形状で、Rigorはそのメンバー読み取りをfoldする（[レコード ↔ Data.define](#レコード--datadefine)を参照）。
- `switch`パターンは`case`/`in`になる。`in Circle`はその節に沿って`s`を`Circle`にナローイングする — C#の`case Circle c`がするのとまったく同じように。
- `_ => throw`の腕は消える。C#は網羅性を満たすためにそれを必要とする。Rigorはそれを要求しない。後で3つ目のバリアントが現れて`area`に到達すると、結果はマッチしないパスでの`nil`戻りだ — そして決してマッチしえない`in OtherShape`節を足すと、`flow.unreachable-clause`が教えてくれる。Rigorは*死んだ*節を報告し、*欠けている*節は決して報告しない。

欠けた腕の安全性を取り戻したいなら、それはデフォルトではなく意図的なオプトインだ: 末尾の`else raise`が省略を明示し、Rigorはそれに応じてボディに型を付ける。

## 次のステップ

このハンドブックの残りを順番に読む必要はおそらくない。有用なポインタ:

- [第3章 — ナローイング](../03-narrowing/) — フローのルール — `instanceof` / `is`のパターンナローイングの直接対応物。
- [第6章 — クラス](../06-classes/) — `Data.define`、インスタンス側vsクラス側、`attr_accessor`。
- [第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/) — ディレクティブ文法 — `predicate-if-true`はユーザー定義の型ガードの類似物。

他のツールと比較したい場合は、兄弟付録ページが[TypeScript](../appendix-typescript/)、[PHPStan](../appendix-phpstan/)、[mypy](../appendix-mypy/)、[Steep](../appendix-steep/)、[TypeProf](../appendix-typeprof/)、[Rust](../appendix-rust/)、[Go](../appendix-go/)、[Elixir](../appendix-elixir/)をカバーしている。
