---
title: "タプルとハッシュシェイプ"
description: "rigortype/rigor docs/handbook/04-tuples-and-shapes.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/04-tuples-and-shapes.md"
sourcePath: "docs/handbook/04-tuples-and-shapes.md"
sourceSha: "2fb4b6348453139c5fc820c3b06725c3ff89bbd1bf3291d80e2a4f9f6db1d5d1"
sourceCommit: "fe4e9a80df3829ee4f113e763e4bb9920c33da21"
translationStatus: "translated"
sidebar:
  order: 1004
---

`Tuple`と`HashShape`は、Rigorが異種配列と既知キーのハッシュに精密な型を与える方法です。外見上はRubyの`Array`と`Hash`によく似ており（RBS境界を越えるとこれらの名前的型（nominal type、公称型とも）に消去されます）、Rigorの内部では通常の`Array[T]` / `Hash[K, V]`が失ってしまう、位置ごと/キーごとの型情報を持ちます。

## タプル — 異種配列

解析器が配列リテラルのレイアウトを証明できるとき、`Array[T]`ではなく`Tuple[…]`を生成します:

```ruby
arr = [1, "two", :three]
# Tuple[Constant<1>, Constant<"two">, Constant<:three>]
```

実際のコードでタプルが現れる最もよくある場面:

```ruby
# 多重代入の分解は位置ごと
first, second, third = [10, 20, 30]
assert_type(first,  "Constant<10>")
assert_type(second, "Constant<20>")
assert_type(third,  "Constant<30>")

# divmodは2要素タプルを返す
quotient, remainder = 17.divmod(5)
assert_type(quotient,  "Constant<3>")
assert_type(remainder, "Constant<2>")

# each_with_indexは2要素タプルをyieldする
%w[a b c].each_with_index do |elt, idx|
  assert_type(elt, "Constant<\"a\"> | Constant<\"b\"> | Constant<\"c\">")
  assert_type(idx, "non-negative-int")
end
```

タプルへのインデックスアクセスは位置ごとに保たれます:

```ruby
arr = [1, "two", :three]
arr[0]   # Constant<1>
arr[1]   # Constant<"two">
arr[-1]  # Constant<:three>
arr[5]   # Constant<nil> — 範囲外
```

`[start, length]`や`[range]`でのスライス（slice）は、一致する要素のタプルを生成します:

```ruby
arr = [10, 20, 30, 40, 50]
arr[1..3]    # Tuple[Constant<20>, Constant<30>, Constant<40>]
arr[2, 2]    # Tuple[Constant<30>, Constant<40>]
```

## `map`、`select`などを通じたタプル

タプルに対してEnumerableメソッドを呼び出すと、Rigorはブロックを要素ごとの型を代入して各要素について1回評価し、結果をユニオン（union、合併型とも）します:

```ruby
arr = [1, 2, 3]
doubled = arr.map { |n| n * 2 }
# Tuple[Constant<2>, Constant<4>, Constant<6>]

mixed = [1, "two", :three]
strings = mixed.map { |x| x.to_s }
# Tuple[Constant<"1">, Constant<"two">, Constant<"three">]
```

`select`と`filter_map`は`Array[Element]`に広げます。なぜなら結果のサイズが述語に依存し、位置に依存しないからです。`find`は要素のユニオン（または静的にどの要素も一致しないとき`nil`）を返します。

## タプルの拡幅 — いつ、なぜ

`Tuple`は、サイズが設定可能なユニオン予算を超えたとき、未知の形状の配列が連結されたとき、またはRBSで`Array[T]`として型付けされたパラメータを越えるときに`Array[T]`に拡幅されます。拡幅は決定論的で、[`docs/type-specification/inference-budgets.md`](../../type-specification/inference-budgets/)に文書化されています。

拡幅は安全です — `Array[T]`は同じ値のより精度が低いビューです — しかし位置ごとの情報が失われます。`[a, b, c]`が精密に型チェックされるべきなのにされない状況に遭遇したら、チェーン内のタプルではなく`Array[T]`を受け取るメソッド、または広い配列に対する`+` / `concat`を探してください。

## ハッシュシェイプ — 既知キーのハッシュ

ハッシュの類似物は`HashShape`です:

```ruby
user = { name: "Alice", age: 30, admin: false }
# HashShape{name: Constant<"Alice">, age: Constant<30>, admin: Constant<false>}

assert_type(user[:name],  "Constant<\"Alice\">")
assert_type(user[:age],   "Constant<30>")
assert_type(user[:admin], "Constant<false>")
```

ハッシュシェイプ（shape）にはタプルよりいくつか追加の次元があります:

- **必須キーと省略可能キー**。 キーがリテラルに無条件に書かれたか、条件付きでマージされたか？
- **オープンとクローズ**。 列挙されたキー以外の追加キーを持てるか？
- **読み取り専用エントリー**。Rigorがそのキーへの書き込みを見たか、読み取りだけか？

Rigorは3つすべてを追跡しますが、ほとんどはナローイングルールを通じて公開します — ほとんどのユーザーはこれらを直接考える必要はありません。

## メソッド呼び出しを通じたハッシュシェイプ

```ruby
config = { host: "example.com", port: 8080 }
# HashShape{host: Constant<"example.com">, port: Constant<8080>}

config.fetch(:host)        # Constant<"example.com">
config.fetch(:host, "x")   # Constant<"example.com"> (デフォルト未使用)
config[:port]              # Constant<8080>
config.key?(:host)         # Constant<true>  — 証明済み
config.empty?              # Constant<false> — 証明済み
config.size                # Constant<2>
```

## キーワード引数ハッシュ

キーワード引数でメソッドを呼び出すとき、暗黙のハッシュシェイプがRigorの型チェックの対象です:

```ruby
def connect(host:, port: 80)
  # ...
end

connect(host: "example.com")            # OK (portはデフォルト)
connect(host: "example.com", port: 80)  # OK
connect(host: "example.com", port: "8080")  # warning:
                                            #  port: Integer
                                            #  が必須のとき
```

ハッシュシェイプは`**`スプラットとダブルスプラット操作を通じて流れるので、`opts`が既知のシェイプのとき`connect(**opts)`は正しくナローイングされます。

## スプラット合成

1つのタプルを別のタプルにスプラットすると、スプラットが固定位置にある場合に位置ごとの情報が保持されます:

```ruby
head = [1, 2]
tail = [3, 4]
arr = [*head, *tail]
# Tuple[Constant<1>, Constant<2>, Constant<3>, Constant<4>]

with_middle = [*head, "X", *tail]
# Tuple[Constant<1>, Constant<2>, Constant<"X">,
#       Constant<3>, Constant<4>]
```

ハッシュシェイプへのダブルスプラットも同様:

```ruby
defaults = { port: 80, ssl: false }
overrides = { port: 443, ssl: true }
final = { **defaults, **overrides }
# HashShape{port: Constant<443>, ssl: Constant<true>}
# (Rubyのセマンティクスに従いオーバーライドが勝つ)
```

## パターンマッチング分解

`case x in [a, b, c]`は多重代入とまったく同じく`a` / `b` / `c`を位置ごとにナローイングします:

```ruby
case [10, 20, 30]
in [first, _, third]
  assert_type(first, "Constant<10>")
  assert_type(third, "Constant<30>")
end
```

ハッシュパターンも同様:

```ruby
case { name: "Alice", age: 30 }
in { name:, age: }
  assert_type(name, "Constant<\"Alice\">")
  assert_type(age,  "Constant<30>")
end
```

`AlternationPatternNode`（`Integer | String => x`）はキャプチャされたローカルに対してユニオンを生成します — 基礎となるナローイングルールについては[第3章](../03-narrowing/)を参照してください。

## レイアウトが証明できないとき

配列リテラルの要素の1つでもConstantでも、タプル形状でもない型を持つとき、Rigorは`Array[T]`にフォールバックします。ここで`T`は要素型のユニオンです — まだ有用ですが、位置ごとではありません:

```ruby
arr = [1, ARGV.first]
# Array[Constant<1> | String?]
```

キーが証明可能にシンボル/文字列リテラルでないハッシュも同様 — Rigorは`HashShape`ではなく`Hash[K, V]`を生成します。

## 新しいシェイプを派生させる — `pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`

`HashShape`（または`Tuple`）があって、フィールドの一部だけを残したい、特定のものを落としたい、必須/任意を反転させたい — そんなときのために、Rigorは`Type::Combinator`上に5つの**シェイプ射影型関数**を公開しています。これらはTypeScriptの`Pick`/`Omit`/`Partial`/`Required`/`Readonly`ユーティリティ型に対応しますが、TSの後付けではなく第一級のRigor操作です。各関数は、残したエントリーに対してソースの既存の分類（必須/任意/読み取り専用/追加キーのポリシー）を保ちます。

| 射影 | 動作 | TypeScriptでの対応 |
| --- | --- | --- |
| `pick_of[T, K]` | リテラルキーユニオン`K`にキーが含まれるエントリーだけを残す。`Tuple`の場合、`K`は整数インデックスのユニオン。 | `Pick<T, K>` |
| `omit_of[T, K]` | `K`にキーが含まれるエントリーを落とし、残りを保つ。 | `Omit<T, K>` |
| `partial_of[T]` | 必須エントリーすべてを任意に反転させる。値型を`nil`に**広げない** — Rigorは「キーが存在しない」と「キーは存在し値が`nil`」を区別する。 | `Partial<T>` |
| `required_of[T]` | `partial_of`の逆。任意エントリーすべてを必須に反転させる。 | `Required<T>` |
| `readonly_of[T]` | 現在のビューで各エントリーを読み取り専用としてマークする。基底オブジェクトが凍結されていることを証明するもの**ではない** — あくまでビュー層のマーカー。 | `Readonly<T>` |

これらは2つの表面に現れます:

### `RBS::Extended`ディレクティブのペイロードとして

射影名はディレクティブグラマーの一部であり、パーサは型引数位置でSymbol/Stringリテラルと`|`ユニオンを受け付けるため、キー集合をその場で書けます:

```rbs
class UserView
  # ランタイムはユーザーハッシュ全体を返すが、ビューは呼び出し元へ
  # :nameと:emailだけを公開する。ディレクティブは戻り値側の
  # HashShapeをその2エントリーに絞り込む。
  %a{rigor:v1:return: pick_of[UserHash, :name | :email]}
  def public_attrs: () -> ::Hash[::Symbol, ::String]
end
```

解析対象のファイル内では、呼び出しサイトの結果型は、基底のRBSシグが宣伝する素の`Hash[Symbol, String]`ではなく、射影された`HashShape`になります。

### オプトインのTypeScriptユーティリティ型プラグイン経由で

ディレクティブでTSの綴り（`Pick<T, K>`など）を使いたい場合は、[`rigor-typescript-utility-types`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-typescript-utility-types/)プラグインをオプトインしてください。このプラグインは`Plugin::TypeNodeResolver`を登録し、各TS名を正準射影に変換します:

```yaml
# .rigor.yml
plugins:
  - gem: rigor-typescript-utility-types
```

```rbs
%a{rigor:v1:return: Pick[UserHash, "name" | "email"]}
```

プラグインチェインは解析器が見る前に`Pick[…]`を`pick_of[…]`に解決します — 推論結果は直接`pick_of`と書いたときと同じです。プラグインは純粋に命名上の利便性のためのものです。

### 損失のある射影

射影は、シェイプ情報を保つキャリア（carrier）（`HashShape`、および`pick_of`/`omit_of`の場合の`Tuple`）にのみ発火します。素の`Hash[K, V]`やその他の非シェイプ入力に適用するのは**損失のある（lossy）**処理です — 射影は静かに入力型へ縮退し、Rigorは[`dynamic.shape.lossy-projection`](../../type-specification/diagnostic-policy/)`:info`診断を記録するので、呼び出しサイトを監査できます。

```rbs
class C
  # `User`はHashShapeではなく`Nominal[User]`なので、射影は何も
  # 絞り込めない。ディレクティブは受理されるが、`:info`が損失のある
  # 縮退を記録する。
  %a{rigor:v1:return: pick_of[User, :name]}
  def render: () -> ::User
end
```

修正は通常、`HashShape`キャリアを書く（あるいは`Data.define`/`Struct`を使う）ことで、素の`Nominal`を使わないことです。

## 次に読むもの

第5章は関数の側を扱います: Rigorがメソッドのパラメータと戻り値型をどう型付けするか、Enumerable反復を通じてブロックパラメータがどうバインドされるか、アリティ/パラメータ型のミスマッチが`call.*`診断としてどう現れるか。
