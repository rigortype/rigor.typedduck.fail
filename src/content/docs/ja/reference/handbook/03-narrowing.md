---
title: "ナローイング"
description: "rigortype/rigor docs/handbook/03-narrowing.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/03-narrowing.md"
sourcePath: "docs/handbook/03-narrowing.md"
sourceSha: "3e1e3819482c7f6b589b0d10c3e42ddcee3c81c4eb0ac7f1f454484edb8bc8f1"
sourceCommit: "035915291e331f3bcd5ce804a1e30dc284ffbd48"
translationStatus: "translated"
sidebar:
  order: 1003
---

キャリア（carrier）はあるプログラム地点における値を記述します。**ナローイング**（narrowing）は、制御フローが述語を通過するときにキャリアがどう変化するかを記述します。この章では、Rigorが現在認識しているナローイングのあらゆる形式を解説します。

メンタルモデル: 各述語は2つのスコープを生成します — 真値のエッジと偽値のエッジです。各エッジの内側では、変数のキャリアが述語が証明したものに鋭利化されます。述語が認識されなければ、両エッジはエントリスコープをそのまま共有します。

## 真偽性ナローイング

最も単純な形式です。`if x`は「xが真値」と「xが`false`または`nil`」を分離します:

```ruby
def shout(name)
  if name
    # name: String — 真値エッジで `false | nil` が除去される
    name.upcase
  else
    # name: Constant<false> | Constant<nil>
    "(no name)"
  end
end
```

この形式こそ、`if value`がRubyで非常によく使われ解析時に有用な理由です: `if`本体の内側で、Rigorは`value`が非nilであることを知ります。

## `nil?`とその逆

```ruby
def length(s)
  return 0 if s.nil?
  # s: Nominal[String] (String?のnil成分が消えた)
  s.length
end
```

`s.nil?`は真値エッジを`Constant<nil>`にナローイングし、偽値エッジを「それ以外すべて」— 通常は`nil`が除去された元の型 — にナローイングします。

## `is_a?`、`kind_of?`、`instance_of?`

これら3つはすべてクラス階層に基づいてナローイングします:

```ruby
def kind(x)
  if x.is_a?(Integer)
    # x: Integer
    x + 1
  elsif x.is_a?(String)
    # x: String
    x.length
  end
end
```

サブクラスの関係が考慮されます: `is_a?(Numeric)`は`Integer`と`Float`を受け入れ、それに応じてナローイングします。`instance_of?`はより厳密で — 完全に一致するクラスのみ — Rigorもそれに応じてナローイングします。

偽値エッジでは一致したクラスが除外されます:

```ruby
x = some_call_that_returns_integer_or_string
unless x.is_a?(Integer)
  # x: String — Integerが除外される
  x.upcase
end
```

## リテラル値との等値比較

Rigorは信頼できるリテラル値に対して`==`と`!=`をナローイングします:

```ruby
state = some_call_returning_a_symbol
if state == :ready
  # state: Constant<:ready>
  send_request
elsif state == :pending
  # state: Constant<:pending>
  retry_in(5)
end
```

これは`state`自体が定数のユニオン（union、合併型とも）（`Constant<:ready> | Constant<:pending> | Constant<:failed>`）のときに最も有用です。各ブランチが1つのメンバーを剥がし、Rigorは最後の`else`が残りの定数のいずれかであると証明できます — 「任意のSymbol」ではありません。

## `case` / `when`

`case x; when …`は、等値チェックとクラスチェックに対するナローイング構文糖です。各`when`ブランチでは`x`が一致したメンバーにナローイングされます:

```ruby
case n
when 0      then :zero        # Constant<0>
when 1..9   then :small       # int<1, 9>
when 10     then :ten         # Constant<10>
else             :large       # それ以外すべて
end
```

結果型はブランチごとの結果のユニオンです。入力が有限リテラルユニオンのとき、すべてのメンバーが一致する場合、Rigorは`else`ブランチが到達不能であることを証明します。

`case x; in pattern`（1行パターンマッチング）も、Rigorが理解するパターン — クラスチェック、リテラル等値、配列/ハッシュ構造パターン — に対して同じようにナローイングします。

## 論理演算（`&&`、`||`、`!`）

```ruby
def safe_size(s)
  if s && !s.empty?
    # s: non-empty-string
    s.size
  end
end
```

`&&`は左から右へのナローイングを連鎖します: 右オペランドは左の真値エッジ下で評価されます。`||`は偽値エッジを連鎖します。`!`は2つのエッジを入れ替えます。

これは他のすべてと組み合わせられます:

```ruby
if x.is_a?(Integer) && x > 0
  # x: positive-int
end
```

`is_a?`が`x`を`Integer`にナローイングし、次に整数比較がさらに`int<1, max>`にナローイングしました。

## 整数比較

`<`、`<=`、`>`、`>=`、および`Integer#zero?` / `#positive?` / `#negative?` / `#nonzero?` / `Comparable#between?`はすべて整数範囲をナローイングします:

```ruby
def safe_index(arr, n)
  return :empty if arr.empty?
  return :out_of_range if n < 0 || n >= arr.size
  # n: int<0, arr.size - 1>  (実際には: int<0, max>
  # が `n >= arr.size` に対して締め付けられる)
  arr.fetch(n)
end
```

範囲比較はリテラルと組み合わせられます:

```ruby
n = some_input
if n.between?(1, 9)
  # n: int<1, 9>
end
```

## リファインメントに対する述語メソッド

Rigorは少数の「型キャリア述語メソッド」を認識します — 戻り値型が`bool`で、真値/偽値エッジがレシーバーをナローイングするメソッドです:

| メソッド | レシーバーをナローイングする先 |
| --- | --- |
| `String#empty?` | `Constant<"">`（真値） / `non-empty-string`（偽値） |
| `Array#empty?` | `Constant<[]>`（真値） / `non-empty-array[T]`（偽値） |
| `Hash#empty?` | `Constant<{}>`（真値） / `non-empty-hash[K,V]`（偽値） |
| `Integer#zero?` | `Constant<0>`（真値） / `non-zero-int`（偽値） |
| `Integer#positive?` | `positive-int`（真値） / `non-positive-int`（偽値） |
| `Integer#negative?` | `negative-int`（真値） / `non-negative-int`（偽値） |

期待通りに組み合わせられます:

```ruby
def first_word(s)
  return "" if s.empty?
  # s: non-empty-string
  s.split.first    # ランタイムでは常にStringを返す、
                   # nilではない — Rigorもそれを知っている
end
```

## 名前付きキャプチャ正規表現ナローイング（`if /(?<x>...)/ =~ str`）

名前付きキャプチャを持つ正規表現が`if` / `unless`の述語位置でマッチすると、キャプチャされたローカル変数はマッチ後に`String | nil`にバインドされ、真値ブランチでは`String`にナローイングされます:

```ruby
def parse_date(s)
  if /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/ =~ s
    # year, month, day: String  (String | nilからナローイングされた)
    "#{year}/#{month}/#{day}"
  else
    "no match"
  end
end
```

（将来のリリースでは、真値エッジがさらに特定のリファインメントキャリアにナローイングされる予定です — `\d{4}`は`decimal-int-string`を生成するはずです。[`docs/ROADMAP.md`](../../roadmap/) § "v0.1.1 — Planned"でトラッキングされています。）

## `!=`と`unless`

どちらも否定されていない形式の機械的な鏡です。ナローイング目的では`unless x`は`if !x`と同じです。`x != y`は`!(x == y)`と同じです。Rigorは2つのエッジを入れ替えます。

## ローカル変数の再バインドはナローイングをリセットする

ナローイングの事実は**スコープローカル**です。変数を再代入した瞬間に、その事実はリセットされます:

```ruby
def example(s)
  return if s.nil?
  # s: String

  s = some_other_call    # sが再バインド — ナローイングが除去される
  s.upcase               # s: 呼び出しの戻り値型によっては
                         # 再びString?になる
end
```

これがエンジンのナローイング事実が特定の変数名ではなく特定のスコープに紐付けられている理由です。再バインドは検出されますが、メソッド呼び出しを通じた変異は検出されません（Rigorは変異を追いません）。

## まだナローイングされないもの

Rigorが今日**ナローイングしない**形式でよく期待されるもの:

- `respond_to?(:method_name)` — 「このオブジェクトはそのメソッドに応答する」を証明するには、エンジンがまだ公開していない構造的ファセットが必要です。
- `frozen?`などの変異ガード — Rigorはまだミュータビリティをナローイング事実として追跡しません。
- 任意のユーザー定義`case_eq`に対する`===`によるオープンエンドのクラス比較 — Class / Module / Range / Regexpのみが認識されます。
- `self`ターゲットディレクティブ内のメソッドチェーンレシーバー（`get_user.admin?`）— ナローイングするスコープバインディングがありません。ローカル変数、インスタンス変数、明示的`self`、暗黙的selfのレシーバーはすべてサポートされています（v0.1.1 Track 1スライス（slice）3）。

ナローイングが認識されない場合、両エッジはエントリスコープをそのまま共有します — Rigorは間違った判断をするよりも保守的に留まります。

## ナローイングトレースを読む

特定の地点でRigorが何をナローイングしたかを確認したいとき:

```ruby
def foo(x)
  if x.is_a?(Integer)
    dump_type(x)     # この行にinfo診断を出力する
  end
end
```

`dump_type(...)`はイントロスペクションヘルパーです。ランタイムではno-op（Rigorのテストハーネスが使う`Kernel`拡張に存在）で、推論された型を名前付きの`dump.type`診断として出力します。ナローイングが発火したことを確認するデバッグ時に使います。

`assert_type(value, "expected-string")`はより厳密な兄弟です: 推論された型が文字列に**一致しない**とき診断を出力します。ハンドブックの例が動作を固定するために使っています。

## 次に読むもの

第4章は構造的キャリア — `Tuple`と`HashShape` — を扱います。これらは`Array`と`Hash`の要素ごとのナローイングによく似ています。
