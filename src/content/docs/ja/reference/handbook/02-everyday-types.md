---
title: "日常的に出会う型"
description: "rigortype/rigor docs/handbook/02-everyday-types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/02-everyday-types.md"
sourcePath: "docs/handbook/02-everyday-types.md"
sourceSha: "3a9ef0f378f40b4a46de5959705e57268232be09c5a6b128a678baebf5105096"
sourceCommit: "0af2862f84982d9cfad4a1c0619340e15ba2f1bc"
translationStatus: "translated"
sidebar:
  order: 1002
---

この章が最も重要です。以下のキャリアを把握してしまえば、ハンドブックの残りはそれらに適用されるルールの話だけになります。また、用語集として戻ってくるページでもあります — 下の表がキャリアの図鑑全体を一望できます。

> **この章の内容**
> [なぜ「型」では粒度が荒いのか](#なぜ型では粒度が荒いのか) ·
> [キャリアを見る（`rigor annotate`）](#キャリアを自分で見る--rigor-annotate) ·
> [名前的型](#名前的型--馴染み深い出発点) ·
> [定数](#定数--単一のruby値) ·
> [整数範囲](#整数範囲--有界な区間) ·
> [リファインメント](#リファインメント--述語で制約された値) ·
> [差分](#差分--ベースから単一の値を引いた) ·
> [`Dynamic[Top]`](#dynamictop--漸進的キャリア) ·
> [タプルとハッシュシェイプ](#タプルとハッシュシェイプ--異種構造) ·
> [ユニオン](#ユニオン--このどれか) ·
> [実例](#実例)

## なぜ「型」では粒度が荒いのか

通常の静的チェッカーは「このオブジェクトはどのクラスか？」と問います。Rigorが問うのはもっと狭い問いです:「この式が実際に生成できる**値の部分集合**はどれか？」

```ruby
n = 1 + 2
```

通常のチェッカーは`n: Integer`と言います。Rigorは`n: Constant<3>`と言います。どちらも正しいですが、Rigorのほうがはるかに有用です。

```ruby
n = ARGV.size
```

通常のチェッカーは`n: Integer`と言います。Rigorは`n: int<0, max>`（非負の整数 — `Array#size`は負の値を返せない）と言います。

これが重要な理由: Rigorが出したい診断のほとんどは、より狭い事実を必要とします。「Integer」だけでは`n / 0`が常に例外を投げると証明できませんが、`Constant<0>`なら証明できます。「Array」だけでは`arr.first.upcase`が安全と証明できませんが、`non-empty-array[String]`なら証明できます。

まとめると: プログラムのすべての地点にある各値は**キャリア**（carrier）で記述されます。キャリアは広い（`Integer`、`Dynamic[Top]`）場合もあれば、狭い（`Constant<3>`、`non-empty-string`）場合もあります。この章の残りはキャリアの図鑑です。

図鑑に入る前に記法を一つ: 山括弧は具体的な値または境界を保持し（`Constant<3>`、`int<0, max>`）、角括弧はRBSと全く同じく型パラメータを保持します（`Nominal[String]`、`Hash[K, V]`、`Dynamic[Top]`）。

## キャリアを自分で見る — `rigor annotate`

以下のすべてのコード例では、各行の推論型を末尾の`#=> dump_type:`コメントとしてタグ付けしています:

```ruby
two = 1 + 1   #=> dump_type: Constant<2>
```

これは`rigor annotate FILE`が生成するコメント形式です: ソースファイルをその行が評価する式のキャリアでタグ付けして再出力します。自分のコードに対してこれを実行し、マージンにキャリアの図鑑が現れるのを確認してみてください。（`annotate`はキャリアをコンパクトな表示形式で出力するため、このハンドブックが`Constant<2>`とフルスペルで書くところを`2`と書きます。）

## 名前的型 — 馴染み深い出発点

最もシンプルなキャリアは、すでに知っている`Nominal[ClassName]`です。名前的型（nominal type）は公称型とも呼ばれます。追加情報なしに「これはそのクラスのインスタンスである」と言うものです。

```ruby
n = ARGV.first  #=> dump_type: Nominal[String] | Constant<nil>
                # RBSは`String?`と言う — String | nil
```

`Nominal[Integer]`、`Nominal[String]`、`Nominal[Symbol]`、`Nominal[Hash[K, V]]` — 期待通りです。表示形式は読みやすさのために`Nominal[]`ラッパーを省略します: `Integer`、`String`、`Hash[String, Integer]`。

RigorはRBSから名前的型を読みます。`def foo(s) -> ::String`と書くと、呼び出し元の戻り値は`Nominal[String]`になります。受信クラスがより豊富なカタログを持つ場合（組み込みの`String`、`Array`、`Integer`など）、Rigorは名前的型より狭いものを生成することがよくあります — 後述します。

## 定数 — 単一のRuby値

`Type::Constant`はRigorの「この値が正確にどれかを知っている」キャリアです。1つのRubyリテラルをラップします:

```ruby
n   = 42       #=> dump_type: Constant<42>
s   = "hello"  #=> dump_type: Constant<"hello">
sym = :foo     #=> dump_type: Constant<:foo>
t   = true     #=> dump_type: Constant<true>
```

すべてのオペランドがConstantのとき、Rigorは算術と文字列合成を積極的にたたみ込みます:

```ruby
two = 1 + 1               #=> dump_type: Constant<2>
ten = 5 * 2               #=> dump_type: Constant<10>
hi  = "Hello, " + "world" #=> dump_type: Constant<"Hello, world">
sym = "foo".to_sym        #=> dump_type: Constant<:foo>
```

たたみ込みはNumeric、String、Symbol、Array、Hashの「純粋な」メソッドの長いリストに及びます。リストはこのハンドブックには載せていません（数ページにわたる）。[`docs/types.md`](../../types/)とクラス別カタログ[`data/builtins/ruby_core/`](../../data/builtins/ruby_core/)を参照してください。

たたみ込みが**安全でない**とき（メソッドに副作用がある、環境に依存する、またはカタログに載っていない組み込みクラスにある）、Rigorは辞退して名前的型のキャリアか`Dynamic[Top]`を返します。

## 整数範囲 — 有界な区間

整数値を持つ式の中には、単一のリテラル値を生成せずに既知の範囲を生成するものがあります。Rigorはそれらを`Type::IntegerRange`で記述し、`int<min, max>`と表示します:

```ruby
n = ARGV.size               #=> dump_type: int<0, max>
m = n + 1                   #=> dump_type: int<1, max>
double = n * 2              #=> dump_type: int<0, max>
```

ここでの`max`は「正の無限大」を意味します — 上限は無制限です。下の表に出てくる`min`はその鏡像で、「負の無限大」です。乗算は下限を保持するため、`n * 2`は`int<0, max>`のままです。

よく使う範囲には短い名前があります:

| 表記 | 意味 |
| --- | --- |
| `positive-int` | `int<1, max>` |
| `non-negative-int` | `int<0, max>` |
| `negative-int` | `int<min, -1>` |
| `non-positive-int` | `int<min, 0>` |

`Array#size`、`Array#length`、`Hash#size`、`String#size`など、すべて`non-negative-int`を持ちます。`Array#count`も同様です。`non-negative-int`に`1`を加えると`positive-int`になります。`-1`を加えると制約のない`Integer`になります（ゼロ以下になる可能性があるため）。

## リファインメント — 述語で制約された値

「この名前的クラスからリテラル値を引いた/加えた」ではなく「述語で制約されたこの名前的クラス」という型があります。Rigorはこれらに`Type::Refined`キャリアを使い、ケバブケース名で表示します。カタログ:

| リファインメント | 意味 |
| --- | --- |
| `non-empty-string` | `#empty?`が証明可能に`false`の`String` |
| `lowercase-string` | `#downcase`と等しい`String` |
| `uppercase-string` | `#upcase`と等しい`String` |
| `numeric-string` | 数値としてパース可能な`String` |
| `decimal-int-string` | 十進整数としてパース可能な`String` |
| `octal-int-string` | 先頭`0o` / 八進数字 |
| `hex-int-string` | 先頭`0x` / 十六進数字 |
| `literal-string` | リテラルから構成されることが証明可能な`String` |
| `non-empty-lowercase-string` | 両方同時 |
| `non-empty-uppercase-string` | 両方同時 |
| `non-empty-literal-string` | 両方同時 |

これらのキャリアのほとんどは2つの方法で生まれます:

1. **ナローイングを通じて**（narrowing） — `if s.empty?`は偽のブランチで`s`に`non-empty-string`型を与えます（[第3章](../03-narrowing/)参照）。
2. **`RBS::Extended`アノテーションを通じて** — メソッドのRBSシグネチャが`String`と言っていても、著者がランタイムが常に非空を返すと知っている場合、`%a{rigor:v1:return: non-empty-string}`とタグ付けします（[第7章](../07-rbs-and-extended/)参照）。

リファインメント（refinement、篩型とも）はRBSとの相互運用のためにベースの名前的クラスに**消去**されます。シグネチャが`-> String`と言っているメソッドはその契約（contract）を保ちます — Rigorは自身の解析の中でのみ、より厳密なビューを加えます。

否定形`~T`は補完を意味します: `~lowercase-string`は「少なくとも1文字の小文字以外の文字を持つString」です。少数のリファインメントには手動でペアになった補完があります（`lowercase-string` ↔ `non-lowercase-string`）。Rigorはできるときにこれを優先し、それ以外は汎用的な`Difference`形にフォールバックします。

## 差分 — ベースから単一の値を引いた

`non-empty-string`は等価的に`String - ""`と書けます。Rigorはこの種のキャリアに`Type::Difference`を使います:

| キャリア | 等価表現 |
| --- | --- |
| `non-empty-string` | `String - ""` |
| `non-zero-int` | `Integer - 0` |
| `non-empty-array[T]` | `Array[T] - []` |
| `non-empty-hash[K, V]` | `Hash[K, V] - {}` |

ナローイングで最もよく見かけます:

```ruby
n = some_integer_call
if n.zero?
  n   #=> dump_type: Constant<0>
else
  n   #=> dump_type: non-zero-int
end
```

## `Dynamic[Top]` — 漸進的キャリア

Rigorが「これは任意のRuby値かもしれない」よりも厳密なことを証明できないことがあります。例えばベアなパラメータは呼び出し元からの情報を持ちません。それが`Dynamic[Top]`で、RBS消去後のビューでは`untyped`と短縮されることが多いです。

```ruby
def foo(x)
  x.bar   #=> dump_type: Dynamic[Top]
end
```

`Dynamic[T]`（Top以外の内部）はより具体的な漸進的（gradual）形式です: 「この値に対する静的契約はないが、静的ファセットは`T`のように振る舞う」。RBSで宣言された`untyped`境界が、Rigorがすでに何かを知っているクラスと出会うときに現れます。

`Dynamic[Top]`レシーバーに対して診断が出ることは**ありません**。これが偽陽性なし方針です — Rigorは特定できない値に対しては、報告するよりも沈黙を選びます。

## タプルとハッシュシェイプ — 異種構造

`[1, "two", :three]`は「混在要素のArray」より具体的です。Rigorはこれを`Type::Tuple`で記述します:

```ruby
arr = [1, "two", :three]
#=> dump_type: Tuple[Constant<1>, Constant<"two">, Constant<:three>]

first, second, third = arr
first   #=> dump_type: Constant<1>
second  #=> dump_type: Constant<"two">
third   #=> dump_type: Constant<:three>
```

リテラルキーを持つハッシュも同様:

```ruby
h = { name: "Alice", age: 30 }
#=> dump_type: HashShape{name: Constant<"Alice">, age: Constant<30>}

h[:name]  #=> dump_type: Constant<"Alice">
```

タプルとハッシュシェイプ（shape）はRBS境界を越えるときに`Array[…]`と`Hash[K, V]`に消去されます。Rigor内部では、位置ごと/キーごとの完全な型情報を持っているので、分解代入とスロットアクセスが精密に保たれます。

第4章でタプルとハッシュシェイプを詳しく説明します。

## ユニオン — 「このどれか」

値が有限個の型のいずれかになれるとき、Rigorは`Type::Union`を使います:

```ruby
label = case n
        when 0      then :zero
        when 1..9   then :small
        else             :large
        end
#=> dump_type: Constant<:zero> | Constant<:small> | Constant<:large>
```

定数のユニオン（union、合併型とも）は、Rubyが直和型（sum type）や識別可能ユニオンに最も近づく形です。Rigorはこれを真剣に扱います: `case`でリテラルユニオン値を切り替えると精密なナローイングが生まれます（[第3章](../03-narrowing/)参照）。

制限があります — Rigorは設定可能なサイズ予算を超えてユニオンを拡張しません。それを超えると、メンバーの名前的基底型のユニオンに広げます。これにより、デジェネレートな入力でも解析器は高速で予測可能に保たれます。

## 実例

まとめると:

```ruby
def classify(n)
  if n.zero?
    :zero
  elsif n.positive?
    :positive
  else
    :negative
  end
end

result = classify(some_integer_input)
#=> dump_type: Constant<:zero> | Constant<:positive> | Constant<:negative>
```

通常の型チェッカーは`result: Symbol`と言います。Rigorは正確な3要素のユニオンにナローイングします。後でこう書くと:

```ruby
case result
when :positive then "+"
when :negative then "-"
when :zero     then "0"
end
```

Rigorは`case`が網羅的であることを証明します — すべてのユニオンメンバーがいずれかの`when`に一致する — そして結果は`Constant<"+"> | Constant<"-"> | Constant<"0">`となります。

## 次に読むもの

第3章（ナローイング）は、これらのキャリアを受け取り、制御フローが通過するときにキャリアがどう変化するかを扱うエンジンです — `if` / `case` / `is_a?` / `nil?`。そこで上記の値ラティスキャリアが本領を発揮します。
