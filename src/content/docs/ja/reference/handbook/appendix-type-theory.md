---
title: "付録 — 型理論との接続"
description: "rigortype/rigor docs/handbook/appendix-type-theory.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-type-theory.md"
sourcePath: "docs/handbook/appendix-type-theory.md"
sourceSha: "39f2cae63289f20d51a8a7698100b51943d3d62e4360dc49d8d09d27dbc47e8a"
sourceCommit: "b853a88b417654ef662a2cf37eef881fd018c9b8"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "型理論との接続"
---

Rigorの語彙と、プログラミング言語の教科書や別の型チェッカーのドキュメントで見たことがあるかもしれない形式的な型理論の概念とをつなぐ短い橋渡しです。ハンドブック本編は意識的に理論を抑えめにしています;この付録は背景にあるアイデアを名付けることで、すでにどれかを知っているなら、対応するRigorの表面を即座に認識できるようにします。

このページは記述的であり、規範的ではありません。ここでの形式的な言い回しが[型仕様](../../type-specification/)と矛盾する場合、仕様が拘束力を持ちます。

## 5秒で分かる要点

| 問い | 型理論の用語 | Rigorの表面 |
| --- | --- | --- |
| 型の宇宙は何で順序付けられているか？ | サブタイピング（`<:`）、束を成す半順序 | `Top` / `Bot`、`\|`（join）、`&`（meet）を持つキャリア群 |
| マッチするかしないか分からない型はどうか？ | グラデュアル一貫性（`~`） | `Dynamic[T]`キャリアと3値の確実性`yes / no / maybe` |
| ユーザー型はどう識別されるか？ | 名前的vs構造的 | **名前的優先のハイブリッド** — クラスは名前で、加えて構造的ファセット（`interface`、`HashShape`、ケイパビリティロール） |
| ジェネリクスはどう表現されるか？ | パラメトリック多相（System Fスタイル、ただし述語的） | RBSジェネリクス`class Array[Elem]`、メソッドジェネリクス`def map: [U] () { (Elem) -> U } -> Array[U]` |
| 「xは空でない文字列」はどう表現されるか？ | リファインメント / 述語サブタイピング | 第一級のリファインメントキャリア（`non-empty-string`、`int<min, max>`、……） |
| `if x.is_a?(String)`は`x`の型をどう変えるか？ | occurrence typing / フロー感応ナローイング | 3値の確実性を持つエッジ感応ナローイング |
| 副作用はどうか？ | エフェクトシステム | エンジンのエフェクトモデル（変異、例外、エスケープ）——内部、ユーザーから見えない |
| 健全性か完全性か？ | どちらか1つ（あるいは両方なし） | **どちらも完全には目指さない** — Rigorは偽陽性なしを最適化し、堅牢性原則バイアスを持つ |
| なぜ一部の機能はどこにでもアノテーションを強制するか？ | 推論の決定可能性 — 特定の組み合わせ（Rank-3以上、多相再帰、サブタイピング + インターセクション）は決定不能 | **3値の`maybe`** — 推論が決定できないとき、Rigorはユーザーにアノテーションを求めるのではなく沈黙を守る |

Rigorの設計はこのカタログから大いに引いていますが、Rubyの著者が自分で書いていないアノテーションを書くことを強制するような部分は避けています。

## 型の束

Rigorの型はサブタイピング関係`<:`の下で（有界）束を成します。標準的な教科書の絵がほぼそのまま適用されます:

- **`Top`**は最大元——あらゆる値が`Top`型を持つ。
- **`Bot`**は最小元——どんな値も`Bot`型を持たない。到達不能な分岐や「このメソッドは常にraiseする」に有用。
- **Join `T \| U`**（ユニオン）は最小上界。
- **Meet `T & U`**（インターセクション）は最大下界。

```ruby
# Top — あらゆる値がこれに住む
x = something_we_know_nothing_about
assert_type(x, "Dynamic[Top]")  # Dynamicマーカーで広げられたTop

# Bot — どんな値も住まない;raiseのみのメソッドはBotを返す
def boom!
  raise "no"
end
assert_type(method(:boom!).call, "Bot")  # 決して到達しない

# Join — 重ならない2つの型のUnion
n = rand < 0.5 ? 1 : "a"
assert_type(n, "Constant<1> | Constant<\"a\">")

# Meet — Intersection（表面レベルでは滅多に必要ない）
# 主にリファインメントの組み合わせ時に発生
```

仕様: [`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/)、
[`docs/type-specification/special-types.md`](../../type-specification/special-types/)。

## サブタイピングとグラデュアル一貫性

静的型理論は1つの関係を使う: **サブタイピング（`<:`）**。`Integer <: Numeric`はあらゆる`Integer`が`Numeric`であることを意味する。

グラデュアル型付けは第2の関係を加える: **一貫性（`~`）**。`Dynamic[T] ~ U`は「実行時の値が`U`を満たすかを静的には知らないが、満たすことは許容される」を意味する。一貫性は反射的かつ対称的だが**推移的ではない**——これがグラデュアル型付けを「単に束に`Any`型を加える」から区別する鍵となる技術的な動きである。

Rigorは**3値の確実性**を通じて両方の関係を露出させる:

| 確実性 | 読み方 | 使用箇所 |
| --- | --- | --- |
| `yes` | `T <: U`が証明可能に成立 | 呼び出しは安全;診断なし。 |
| `no` | `T <: U`が証明可能に失敗 | 診断が発火する。 |
| `maybe` | どちらも証明できない | 診断なし——Rigorは静かに留まる（堅牢性原則）。 |

```ruby
# yes: 証明可能にInteger <: Numeric
def add_one(n) = n + 1
add_one(42)  # 確実性: yes

# no: Constant<"a"> <: Integerが証明可能に偽
add_one("a")  # 確実性: no — call.argument-type-mismatchが発火

# maybe: Dynamic[Top] ~ Integerが成立;<:は決定できない
add_one(JSON.parse(input))  # 確実性: maybe — 静か
```

仕様: [`docs/type-specification/relations-and-certainty.md`](../../type-specification/relations-and-certainty/)。

## 名前的vs構造的型付け

Javaは名前的: `class Foo {}`と`class Bar {}`は同一のメンバーセットを持っても異なる型。TypeScriptは構造的: 同一のメンバーを持つ2つの型エイリアスは交換可能。

Rigorは**名前的優先 + 構造的ファセット**:

1. **名前的**がデフォルト。`Nominal[User]`と`Nominal[Admin]`は同一のメソッドを持っても異なる。
2. **`interface`経由の構造的**。RBSの`interface _Comparable`は形状を定義する——名指しされたメソッドを実装するものは何でも、クラスに関わらずそれを満たす。
3. **`HashShape`と`Tuple`経由の構造的**。Rubyリテラルの`{name: "x", age: 30}`と`[1, "a"]`は自動的にキーごと / インデックスごとの構造的型を得る。
4. **ケイパビリティロール**はRigor固有の構造的ファセット——隠されたキャリアを持つ名前付き構造的インターフェース（`_ReadableStream`、`_RewindableStream`、……）。これらは、ユーザーに`interface`を書かせることを強制せずに、堅牢性原則がユーザーメソッドのパラメータ型を「実際に使うケイパビリティをサポートする任意の値」に広げることを可能にする。

```ruby
# 名前的 — UserとAdminは異なる
class User; end
class Admin; end
u = User.new
def takes_user(u) end
takes_user(Admin.new)  # call.argument-type-mismatch

# HashShape経由の構造的 — リテラルはキーごとの型を得る
person = {name: "Alice", age: 30}
assert_type(person, "HashShape{name: Constant<\"Alice\">, age: Constant<30>}")

# interface経由の構造的
def shout(thing)
  thing.upcase
end
# Rigorはパラメータを「#upcase: () -> Stringを持つあらゆるもの」として推論する
```

仕様:
[`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)。

## 多相性

Cardelli/Wegnerの多相性分類はRigorにきれいに対応する:

| 多相性ファミリー | Rigorの表面 | 備考 |
| --- | --- | --- |
| **パラメトリック**（System Fスタイル、述語的） | RBSジェネリクス`class Foo[T]`、メソッドジェネリクス`def m: [U] (U) -> U` | ユーザー表面でhigher-rankやhigher-kinded量化はない。 |
| **サブタイプ** | 束の上の`<:` | 標準;メソッド呼び出しは推論されたレシーバ型でディスパッチ。 |
| **アドホック**（オーバーロード） | RBSメソッドオーバーロード（`def m: (Integer) -> Integer \| (String) -> String`） | 解決は最も具体的なアームを選ぶ。 |
| **強制（coercion）** | RigorのRuby強制モデル（`Integer#coerce`など） | 実行時意味論ごとに推論される;ユーザーから見える演算子ではない。 |
| **行多相** | （ユーザー表面では露出されない） | `HashShape`は内部でclosed-vs-openキーセットを持ち回るが、量化可能な軸ではない。系譜については§「オブジェクト形状」を参照。 |

```ruby
# パラメトリック — RBSのメソッドジェネリクス
# sig:  def first: [E] (Array[E]) -> E?
def first(arr) = arr[0]

# サブタイプ — Integer <: Numericがメソッド呼び出しを流れる
def total(ns) = ns.sum
total([1, 2, 3])      # ns: Array[Integer]
total([1, 2.0, 3])    # ns: Array[Numeric]

# アドホック — RBSオーバーロードは呼び出しサイトごとに選ぶ
"abc" * 3   # Stringオーバーロード
[1, 2] * 3  # Arrayオーバーロード
```

仕様: [`docs/type-specification/rbs-compatible-types.md`](../../type-specification/rbs-compatible-types/)。

## オブジェクト形状 — 行多相、Hack、そして`HashShape`の系譜

`HashShape{...}`キャリアと密接に関連する`Tuple[...]`は、§「名前的vs構造的型付け」で最初に登場し、§「純粋な推論を超えて」の精度テーブルでも再登場する。そこでは、それらが本来`Hash[Symbol, A | B | C]`に見えるjoinを、下流の呼び出し元が実際に使えるものに変える様子が示される。これらは学術的な根拠と産業的な系譜の両方を持つ*構造的形状*設計のファミリーに属する。それらのスレッドをたどることが、`HashShape`がなぜ現在の姿をしているかを説明する最も簡単な方法である。

### 学術的な根拠: 行多相

**行多相**（Wand、1987;Rémy、1989;Cardelli & Mitchell、1991）は「私が名指ししたフィールド以外の追加フィールドを持つかもしれないレコード」を型付けする形式的な機構である。*行変数*`ρ`はレコード型の末尾フィールドを量化する:

> `{ name: String; age: Integer | ρ }` — 「少なくともこの2つのフィールドを持つ任意のレコード;`ρ`は残り。」

Garrigue（1990年代）はこのフレームワークを**カインド**で拡張し、OCamlの多相レコードシステムが「`name: String`を持つレコードのクラス」と「`length: Int`を持つレコードのクラス」を区別できるようにした。OCamlのオープンオブジェクト型（`< get_name : string; .. >`）はこの基盤の上に立つ。

**松本 & 南出（2008）**はGarrigueカインド付きフレームワークをRubyに直接適用した——多相レコード型に基づくRubyプログラムの型推論。論文はRubyの「ダックタイピング」表面が行多相的な読み方を許すことを示した: メソッド`def shout(x); x.upcase; end`は大まかに`∀α, ρ. {upcase: () -> α | ρ} -> α`として推論される。推論アルゴリズムは機能するが、推論された型——それが引き連れるカインド制約とともに——は、ユーザーが構造的な行よりも名前的クラスで圧倒的に推論する日常のRubyコードにとっては難解である。

[論文のRigor観点のレビュー](../../notes/20260518-matsumoto-2008-poly-records-rigor-review/)はこの回顧を記録している: 実験は*機能した*が、行変数を主要なモデリングツールとして推薦するのではなく、**Rigorの名前的優先設計を遡及的に正当化した**。Rigorのキャリア群は、名前的クラスをモデリングの単位とし、構造的形状を推論精度のフォールバックとして扱う。

### 産業的な系譜: Hack → Psalm/PHPStan

学術的なラインと並行して、実践的な「型付き辞書」の軌跡は別の方向に進んだ。Facebookの[**Hack `shape(...)`**](https://docs.hhvm.com/hack/built-in-types/shape/)は、動的PHP配列から型付き表面への移行ストーリーの一部として第一級の形状型を導入した:

- キーごとの型付け——`shape('name' => string, 'age' => int)`。
- `?'key' => T`経由のオプショナルキー。
- デフォルトではclosed;`...`で形状を追加キーに開く。

**Psalm**と**PHPStan**は`array{name: string, age: int}`というPHPDoc構文で同じアイデアを採用したが、重要な一点が逆転している: 形状は事前に宣言されるのではなく、使用サイトのリテラルから*推論*される。TypeScriptのオブジェクト型リテラル`{ name: string; age: number }`はデフォルトで構造的サブタイピングが有効な、異なる構文での同じアイデアである。

産業的な設計は**意図的に行変数を避ける**。末尾キーを量化する`array{name: string, ...ρ}`はない;すべての形状はclosed（または完全にopen）であり、量化可能な中間はない。代償は完全な行多相的表現力の喪失;利益は扱いやすい推論と*読みやすい*推論型である。

### `HashShape`の位置づけ

Rigorの`HashShape{...}`は行多相的なものよりHack / Psalm系譜に明確に属する:

| 特性 | 行多相 | Hack `shape(...)` | Psalm `array{...}` | Rigor `HashShape{...}` |
| --- | --- | --- | --- | --- |
| キーごとの型付け | あり | あり | あり | あり |
| オプショナルキー | あり（行制約経由） | あり（`?'k'`） | あり（`?k:`） | あり（内部でopen/closedフラグ） |
| ユーザーが量化可能な行変数 | **あり** | なし | なし | **なし** |
| リテラルから推論 | （推論はグローバル） | なし——ユーザー宣言 | あり（呼び出しサイトごと） | **あり** — ハッシュリテラルに組み込み |
| ユーザーの主要なモデリング手段 | あり（それを採用するML系言語で） | あり（慣用的なHack） | 場合による（クラスと並んで） | **なし** — 名前的クラスが主;`HashShape`は推論精度のフォールバック |

2つの具体的な選択が際立つ:

1. **ユーザー表面での行変数なし**。 HackとPsalmと同様に、Rigorはユーザーが末尾キーを量化した`HashShape{name: String, *rest}`を書くことを許さない。内部的に`HashShape`はopen/closedフラグを持つため、アナライザーは「このキーセットは有限か？」に答えられるが、型言語に`ρ`はない。これはHackが行ったトレードと同じ: より読みやすい推論型と扱いやすい推論を、完全な行多相的表現力を犠牲にして得る。
2. **宣言ではなく推論**。 HackがユーザーにA`shape(...)`を明示的に書くことを期待するのに対し、Rigorはハッシュリテラルから`HashShape`を自動的に生成する。一般的なRuby作者の体験は「`{a: 1, b: 'x'}`と書いたら、Rigorが`HashShape{a: Constant<1>, b: Constant<"x">}`と報告した」であり、「形状型を宣言してRigorがリテラルをチェックした」ではない。これはHackの宣言優先設計よりもPsalm / PHPStanの強調に近い。

この組み合わせ——リテラルからの推論 + Hack/Psalm型の表面 + 名前的優先エコシステム——が`HashShape`を**精度キャリア**（§「純粋な推論を超えて」）にしているのであり、*モデリングプリミティブ*ではない。これは、そうでなければ`Hash[Symbol, A | B | C]`に広がってしまうハッシュリテラルの型を鋭くするために存在する。ドメインオブジェクトを記述するためにRigorユーザーが手を伸ばす単位ではない——その役割は`class User; end`と周辺のRBSに属し、松本レビューが推薦するとおりである。

### `Tuple`と同じ系譜

`Tuple[A, B, C]`は配列の類似物であり、同じ系譜が適用される——TypeScriptの`[A, B, C]`、Hackの`tuple(A, B, C)`、Psalm/PHPStanの`array{0: A, 1: B, 2: C}`短縮形。動機は同一: リテラル`[1, "a", :sym]`は、`Array[Integer | String | Symbol]`のjoinが捨ててしまうインデックスごとの情報を持つ。

### なぜRigorに完全な行多相がないのか？

誘惑——欲しいユーザーのために行変数を表面化する——は本物であり、その問いはADRレベルでオープンのままである。v0.1.xでユーザー表面に着地していない理由:

- **推論コスト**。 Garrigueカインド付き推論は決定可能だが、Rigorのローカルウォーカーより高コスト;アナライザーのファイルごとのバジェット（[`inference-budgets.md`](../../type-specification/inference-budgets/)を参照）はグローバルな行制約解決を収容しなければならない。
- **可読性**。松本実験は、日常のRubyコードの推論された行多相型が密で概観しにくいことを見出した——これはRigorの偽陽性なしの立場によって増幅される問題であり、推論された型はユーザーが`rigor annotate`で実際に読むものになる。
- **実証的な需要**。実際のRubyコードでのハッシュリテラルは、複数の操作を流れる多相レコード値ではなく、通常、呼び出しごとのアドホックな辞書である。呼び出しごとのclosedまたはopenな構造的型が観察された使用に合致する;行量化はほとんどの場合その複雑さに見合わない。

行変数がいつか本当に必要になれば——行を量化することから恩恵を受ける型付き`merge` / `transform_keys` / `slice`ストーリーのために——その問いはデフォルトでユーザー表面に追加されるのではなく、ADR経由で開かれる。

## 分散

RBS（したがってRigor）はジェネリックパラメータに対する標準的な分散語彙を継承する:

- **共変（`out T`）** — `Sub <: Sup`のとき`Foo[Sub] <: Foo[Sup]`。生産者位置。
- **反変（`in T`）** — `Sub <: Sup`のとき`Foo[Sup] <: Foo[Sub]`。消費者位置。
- **不変（デフォルト）** — どちらでもない。

Rubyの可変コンテナ（`Array`、`Hash`、`Set`）は健全性のために要素型に対して不変——標準的な「Javaの配列は共変」という戒めの物語が適用される。RBSはそれらをそのように宣言する;Rigorはその宣言を尊重する。

## リファインメント型と述語サブタイピング

**リファインメント型**（refinement type、篩型とも）は基底型を述語で制限する: Liquid Types / SMT駆動システムではこれは`{x: Int | x > 0}`と書かれる。Rigorは予約名を持つリファインメントの厳選されたカタログを露出する:

| リファインメント | 述語（非形式的） | キャリア |
| --- | --- | --- |
| `non-empty-string` | `s : String, s.size >= 1` | `String`のリファインメント |
| `numeric-string` | `s : String, s =~ /\A[+-]?\d+(\.\d+)?\z/` | `String`のリファインメント |
| `literal-string` | 「リテラルから組み立てられたと証明可能」 | `String`のリファインメント |
| `int<min, max>` | `n : Integer, min <= n <= max` | 範囲キャリア |
| `non-zero-int` | `n : Integer, n != 0` | `Integer`のリファインメント |
| `positive-int` | `n : Integer, n > 0` | `Integer`のリファインメント |
| `non-empty-array[T]` | `arr : Array[T], arr.size >= 1` | `Array[T]`のリファインメント |
| `non-empty-hash[K, V]` | `h : Hash[K, V], h.size >= 1` | `Hash[K, V]`のリファインメント |

リファインメントは期待どおりにサブタイピングと合成する: `positive-int <: non-zero-int <: Integer <: Numeric`。決定的に、**Rigorは制御フロー解析が述語を証明したときに自動的にリファインメントキャリアへナローイングする**:

```ruby
def length_of(s)
  return 0 if s.empty?
  s.size  # このプログラムポイントでは: s : non-empty-string
end
```

これがユーザーにリファインメントを書かせることなくリファインメント・サブタイピングの実用的な見返りである。

仕様: [`docs/type-specification/imported-built-in-types.md`](../../type-specification/imported-built-in-types/)、
[`docs/type-specification/rigor-extensions.md`](../../type-specification/rigor-extensions/)。

## Occurrence typing（フロー感応ナローイング）

「`if x.is_a?(String)`が分岐内で`x : String`にする」の技術用語は**occurrence typing**（Tobin-Hochstadt & Felleisen、2008）である。TypeScriptはこれを*narrowing*、mypyは*type guards*と呼ぶ。背後にある機構は同じ: 型チェッカーが制御フローグラフを歩き、述語が成立していなければならないエッジに沿って各変数を絞り込む。

RigorはRuby固有のいくつかの拡張を持つ**エッジ感応ナローイング**としてoccurrence typingを実装する:

- 標準述語: `is_a?`、`kind_of?`、`instance_of?`、`respond_to?`、`nil?`、`==`、`===`、`frozen?`、`empty?`、比較演算子。
- パターンマッチ: `case x; in pattern`はマッチした分岐に沿ってナローイングする。
- 等価性意味論はRubyが区別する箇所で構造的等価と参照等価に分割される。
- ナローイングされた変数への変異エフェクトは次の読み出しでナローイングを無効化する——*fact stability*。
- `predicate-if-true` / `predicate-if-false`ディレクティブ経由のユーザー拡張述語（TypeScriptの`x is Foo`型ガードに対応）。

```ruby
def describe(x)
  if x.is_a?(String)
    # ここで x : String
    x.upcase
  elsif x.nil?
    "(nil)"
  else
    # ここで x : Top - String - nil  （他のすべてはナローイングで取り除かれる）
    x.inspect
  end
end
```

仕様: [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/)、
[`docs/type-specification/rbs-extended.md`](../../type-specification/rbs-extended/)。

## グラデュアル型付け

グラデュアル型付け（Siek & Taha、2006;Garcia, Clark & Tanter、2016）は、静的に型付けされたコードと動的に型付けされたコードを1つのプログラムで共存させる規律である。技術的な機構は:

1. 区別された「動的」型（元論文では`?`）。
2. 動的型を具体型が期待される場所に許容し（その逆も）、しかし無関係な2つの具体型を橋渡しするのを拒否する*一貫性*関係`~`。
3. 静的／動的境界でのオプションの実行時キャスト。

Rigorはこれに次のように対応する:

| グラデュアルの概念 | Rigorの表面 |
| --- | --- |
| 動的型`?` | **`Dynamic[T]`** — 値を静的に検証されていないとマークしつつ「最善推測」型`T`を*ラップ*するキャリア。`Dynamic[Top]`は最大限に動的な形。 |
| 一貫性`~` | 3値の確実性の`maybe`アーム — `T ~ U`が成立するときに`Dynamic[T] ~ U`が成立。 |
| 静的／動的境界 | メソッドごと、ファイルごと、プラグインごとの寄与 — Rigorは値が`Dynamic[T]`になった*理由*を動的起源代数に記録する。 |
| キャスト | ソース内キャスト演算子はない。オプトインの[`rigor-sorbet`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sorbet/)プラグインは`T.let` / `T.cast` / `T.must`をキャスト形式として読む;`RBS::Extended`の`assert_type`ディレクティブは`.rbs`から同じ役割を果たす。 |

Rigor固有の2つの拡張が重要:

1. **`Dynamic[T]`はパラメータ化されている**。元のグラデュアル型付け論文は単一の`?`を持つ;Rigorは不確実性マーカーと一緒に「もしコミットするよう求められたら型を*推測*するであろうもの」を持ち回るので、リファクタリングツールがより良い提案を提供できる。
2. **堅牢性原則（型に対するPostelの法則）** — パラメータは寛容に受け入れられ（`Dynamic[T]`に近い）、戻り値は厳密に報告される。[ADR-5](../../adr/5-robustness-principle/)を参照。

仕様: [`docs/type-specification/special-types.md`](../../type-specification/special-types/)、
[`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/)。

## エフェクトシステム

教科書の**エフェクトシステム**は、各式を2つのもので注釈する: 型*と*エフェクトの集合（Lucassen & Gifford、1988）。エフェクトはI/O、変異、例外、発散、割り当てを含む。

Rigorはエフェクトモデルを持つが、それはユーザー表面ではなく**エンジン内部**に存在する:

| エンジン内部エフェクト | 追跡対象 | ユーザーから見える結果 |
| --- | --- | --- |
| 変異 | `arr << x`、`h[k] = v`、ivar書き込み | ナローイングされた型は変異読み出し後にfact stabilityを失う。 |
| 例外 / 非局所脱出 | `raise`、`throw`、`return`、`break` | 分岐はjoinに何も寄与しない;常にraiseするメソッドは`Bot`を返す。 |
| クロージャエスケープ | レキシカルスコープ外に保存またはyieldされたブロック | ブロック内のナローイングは外側スコープにエクスポートされない。 |

これらのエフェクトは著作されたシグネチャの一部ではない。それらはASTウォークから推論され、ナローイングロジックによって参照される。エフェクトをユーザーレベルで表面化する将来のプラグイン / アノテーション拡張は仕様コーパスで追跡されているが、v0.1.xの一部ではない。

仕様: [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/)
（「Mutation effects」サブセクション）。

## 健全性、完全性、そして偽陽性なしの姿勢

静的型システムは:

- **健全（sound）**であるとは、それが受け入れるあらゆるプログラムが、型システムが捕えるはずだった実行時エラーを持たない場合（「実行時に偽陰性なし」）。
- **完全（complete）**であるとは、それらの実行時エラーを持たないあらゆるプログラムが型システムに受け入れられる場合（「型チェック時に偽陽性なし」）。

Riceの定理は一般性のあるまま両方を持つことはできないことを含意する。主流の静的型システムは**健全だが不完全**を選ぶ（Java、Haskell、Rust（unsafeを除く））。Rigorは逆のデフォルトを採用する:

> Rigorは不健全性を**証明**できるときにのみ診断を発火する。決定できないケースは静かである。

これはプロジェクトのオーディエンスに根ざした意図的な設計選択である: そうでなければ型チェッカーをまったく走らせないであろうRubyプログラマー。初日のうるさい偽陽性は、30日目に見落とされたバグよりも採用を速く殺す。堅牢性原則（[ADR-5](../../adr/5-robustness-principle/)）はこの姿勢の形式的表現である: パラメータには寛容（「誰でも何でも渡してこの関数を呼べる」）、戻り値には厳密（「我々が実際に返すものにコミットする」）。

注意すべきトレードオフ:

- **Rigorは健全なチェッカーが捕えるバグを見逃す**。これは設計上の選択である;代替案はそれが捕えるバグよりも多くの摩擦である。
- **3値の確実性（`yes` / `no` / `maybe`）**は不完全性の形式的承認である。ほとんどのチェッカーは2値に潰す;Rigorは第3のアームを保持する。それが沈黙を獲得するアームだからである。
- **`Dynamic[T]`はRigorのモデルでは失敗モードではない**。完全な代数的同一性を持つ第一級のキャリアである。

## 推論の決定可能性

型システムの*表現力*と*型の推論の決定可能性*は反対方向に引っ張る。誤った機能の組み合わせを加えると、推論は決定不能な領域に押し込まれる——停止問題と同等の困難さになる。言語設計者はしたがって推論に対して決定可能なフラグメントを選び、それを超えるものにはアノテーションを要求する。

この分野の最も親しみやすい日本語のアクセシブルレベルのサーベイは、水野雅之「計算機に推論できる型、できない型」（Wantedly Advent Calendar、2021;下記の読書リストを参照）である。そこで歩まれる主要な結果を、Rigorの立ち位置の観点で:

| 機能 | 推論の状態 | Rigorの立場 |
| --- | --- | --- |
| Let多相（Hindley–Milner） | 決定可能;実践では約線形 | Rigorの戦略ではない。Rigorはグラデュアルであり、HMベースではない——RBSジェネリクスはグローバルなユニフィケーションではなく、呼び出しサイトを歩きシグネチャを参照することで解決する。 |
| higher-rank多相、Rank-2 | アノテーション付きで決定可能（Kfoury & Wells、1994） | ユーザー表面では露出されない。RBSジェネリクスは述語的。 |
| higher-rank多相、Rank-3以上 | **決定不能**（Wells、1999） | 露出されない。多相的な値が流れる場所どこにでもアノテーションを強制する。 |
| 多相再帰 | **決定不能**（Henglein、1993） | 露出されない。ジェネリックメソッド本体は呼び出しサイトで型パラメーターが固定されて見える——再帰呼び出しはそれを再インスタンス化しない。 |
| 推論対象としての再帰型 | equi/iso再帰形式では決定可能だが、ほとんどの言語は推論から除外する | RBS型エイリアスは名前的——再帰的形状（ツリー、JSON値）は名前の背後に存在する。Rigorは推論中に匿名の不動点型を合成しない。OCamlの戒めの例`let f g x = x x`は無制限の再帰型の下では型付け可能——これが除外を動機付ける「受け入れられるが望ましくない」判断の典型例である。 |
| サブタイピング + インターセクション型（完全版） | **一般には決定不能** | Rigorは`<:`と`&`（meet）の両方を露出する。決定可能性を回復するために言語を制限するのではなく、3値の確実性のために完全性をトレードする——`maybe`アームがギャップを埋める。 |

### Rigorの実用的な応答: 第3のアーム

教科書的な健全な型チェッカーは、推論が決定できないとき2つの反応方法を持つ:

1. **言語を制限する** — 問題のある機能を諦める（HMはランク-N多相を諦めることで推論を全域に保つ）。
2. **アノテーションを要求する** — 負担を著者に押し付ける（System FはユーザーにA`Λα.`を自分で書かせる）。

Rigorの偽陽性なしの立場はグラデュアルな設定でのみ利用可能な第3のルートを可能にする:

> 推論が決定できないとき、`maybe`を返して沈黙を守る。

3値の確実性の`maybe`アームはしたがって、*実行時*の不確実性のみの承認（前節のグラデュアルな懸念）ではなく、静的システムが*推論可能性の意味において意図的に不完全である*ことの形式的な承認でもある。2つの不完全性はRigorの代数で1つの表現を共有する。なぜなら、どちらの場合の実用的な答えも同じだからである: システムが正当化できない診断を発火しない。

```ruby
# サブタイピング+インターセクション制約を決定するのに
# グローバルな決定不能な推論が必要な呼び出し。
# Rigorは`maybe`を返し、診断を出さない。
def consume(x)
  x.frobnicate if x.respond_to?(:frobnicate)
end
consume(some_value_from_a_dynamic_source)  # 確実性: maybe — 静か
```

この立場は、Rigorの設計における繰り返し登場する形状も説明する: ある機能がグローバルな推論時の爆発コストなしにしか追加できない場合（closedな行変数、第一級のhigher-rank多相、完全なGADTスタイルのコンストラクタ駆動ナローイング）、Rigorは名前的な代替物を出荷するか（行多相のためのケイパビリティロール、存在型のための`interface`）、騒々しい近似に劣化するのではなくADRの背後に機能を先送りする。

## Hindley–Milner、主型、そしてRigorの推論アーキテクチャ

前の2つのセクションは**健全性**（システムは本当にクラッシュするプログラムだけを拒否するか？）と**決定可能性**（システムは常に有限時間で答えを出すか？）を議論した。型理論の教科書はこれらを第3の性質と束ねるが、この付録はまだその名前を出していない:

- **主型性質（principal type property）** — 型付け可能なすべての式には*最も一般的な*型があり、他のすべての有効な型付けはその代入インスタンスである。主型性質を持つシステムでは、「`e`の型」は標準的で曖昧のない答えである——多くのうちの推測ではない。

これらの3つの性質は理解する価値のある方法で相互作用する。なぜなら、**Hindley–Milner（HM）**——ML、OCaml、Haskellの根底にある型システム——が3つすべてを同時に持つ標準的な例だからである。

### HMが達成することと諦めること

古典的なDamas–Milner定理（1982）は大まかにこうである:

> HMで型付け可能なすべての項は一意の主型を持ち、ユニフィケーション（Algorithm W）によって計算可能である。システムは健全、決定可能で、推論は「無料」——ユーザーは型アノテーションを書かない。

代償は構造的である。HMは以下のない言語のみを受け入れる:

- let-bound汎化を超えるrank-N多相;
- サブタイピング;
- インターセクション型;
- ユーザー表面での無制限の再帰型;
- 多相再帰。

除外された機能はそれぞれ、追加したときに3つの性質のうちの1つを最初に破るものである:

| 追加された機能 | 最初に破れる性質 |
| --- | --- |
| Rank-3以上の多相 | 決定可能性（Wells、1999） |
| 多相再帰 | 決定可能性（Henglein、1993） |
| 一般的なサブタイピング | 主型（値はいくつかの比較不能なインターフェースを満たせる;「最も一般的」は一意でなくなる） |
| サブタイピング + インターセクション（完全版） | 決定可能性 |
| 無制限の再帰型 | 「最小驚き の原則」——`λx. x x`のような項が型付け可能になる |

### RigorがHMになれない理由

Rigorの表面は**HMが除外する機能をすでに含んでいる**。サブタイピングは束の基盤（`<:`）;インターセクション（`&`）は代数にある;リファインメントは述語サブタイピングを加える;ジェネリクス + occurrence typing + ケイパビリティロールは、Rubyプログラマーが実際に持つ多相の用途をカバーする。HMスタイルの「グローバルなユニフィケーションによってすべての式の主型を推論する」アーキテクチャは、原理的にRigorには利用できない——不足している機能ではなく、Ruby作者が期待する型言語の構造的帰結である。

Rigorの推論は代わりに**ローカルでウォーカー駆動**:

- ウォーカーはASTを一度降下する。
- 各式サイトでRBSシグネチャ、ナローイングファクト、変異エフェクト、プラグインの寄与を参照する。
- *制御フローのそのポイントでの*式の型を返す——標準的に最も一般的なものではなく、ローカルウォークが正当化できる最も具体的な型。

同じ式が2つのプログラムポイントに現れると、2つの異なる型を生じるかもしれない（ナローイング、フローのマージ、変異、プラグインの寄与がすべて入り込める）。これはHMのユニフィケーションよりもTypeScriptの文脈的 / フロー感応型付けに精神的に近く、Rubyの作者が実際に自分のコードを推論する方法に合致する——`arr.compact!`後の`arr`は`arr`の前と「同じ型」ではない。

### 性質台帳

RigorとHMに対して3つの性質を比較する:

| 性質 | Hindley–Milner | Rigor |
| --- | --- | --- |
| **健全性** | あり | **なし、設計上** — `maybe`ケースは沈黙を守る（§「健全性、完全性、そして偽陽性なしの姿勢」）。 |
| **決定可能性** | あり（最悪ケースDEXPTIME、実践では約線形） | ローカルウォークごとに決定可能;ウォーカーが決定できないものは`maybe`を返す（§「推論の決定可能性」）。 |
| **主型性質** | あり | **なし** — サブタイピング + インターセクションがそれを破る。Rigorは標準的に最も一般的なものではなく*出現ごとの*型を報告する。 |

見出しとなる観察: HMは表現力を3つの性質（健全性 + 決定可能性 + 主型性質）のためにトレードする。Rigorは3つの性質を表現力のためにトレードし、3値の確実性と偽陽性なしの立場によって取り戻せるものを取り戻す。

### 双方向 / ローカル型推論についての補足

サブタイピングが登場すると、HMスタイルのグローバルなユニフィケーションの教科書的なフォールバックは**双方向**または**ローカル型推論**（Pierce & Turner、2000）である: 型付けルールを*合成*モード（`e`から`e`の型を計算する）と*検査*モード（`e`が期待される型を持つことを検証する）に分ける。Steepはこの系譜にある。Rigorのウォーカーはこの非形式的な意味で双方向である——呼び出しサイトは合成する;RBSシグネチャは合成された引数型に対してパラメーターを検査する——しかしRigorは双方向ルールを形式化しない。なぜなら、グラデュアルな設定と3値の確実性が「決定できなかった」ケースを型付けルールの失敗ではなく明示的にするからである。

## 純粋な推論を超えて: リーチと精度

前のセクションは「静的に推論できないもの」を理論的決定可能性の観点でフレーミングした——証明が利用できないときの応答としての`maybe`。これは設計空間の半分をカバーする。もう半分があり、この付録の読み順が示唆していたが名前を付けていなかった: 理論的に決定不能*ではなく*、純粋なAST歩き推論が型を返せるが、それが返す型が（a）ASTに全くないか、（b）存在するが有用なほど十分に具体的でないという現象。

両方の半分は同じ基盤——`RBS::Extended`ディレクティブ、プラグインの寄与、特化されたキャリア群——によって対処されるが、異なる理由のためである。別々の名前を付ける価値がある。

### リーチ: ASTはプログラムを記述しない

ウォーカーはASTを読む。Rubyプログラムにとって、ASTはプログラムの実行時動作の完全な記述ではない:

- `define_method`は評価時に名前が計算されるメソッドを合成する。
- `attr_accessor :name`は`#name` / `#name=`を定義するが、ウォーカーはそれらの存在をパターンによって認識し、一般的な推論によってではない。
- ブロックに対する`class_eval` / `instance_eval`は異なる`self`の下にコードを注入する。
- `has_many :posts`や`attribute :name, Types::String`のようなDSL形式は、単一のヘルパー呼び出しを通じてメソッド*と*型コントラクトの両方を宣言する。
- 任意の文字列を持つ`eval(string)`はASTの外に本当に出てしまう。

これらのいずれも前の2つのセクションの意味での「決定不能」ではない。意味論は完全に定義されている;ウォーカーが単にASTから*読めない*だけである。これは決定可能性の問題とは異なる**リーチ**の問題:

| 問題クラス | 例 | Rigorの応答 |
| --- | --- | --- |
| 推論の理論的決定不能性 | Rank-3多相;サブタイピング + インターセクション | 3値の`maybe` |
| リーチ — ASTが意味論を含まない | `define_method`、Rails DSL、`attr_*` | プラグインの寄与 + `RBS::Extended` + [ADR-16](../../adr/16-macro-expansion/)マクロ基板 |
| 真の実行時不透明性 | `eval(user_input)` | `Dynamic[Top]`、その後使用サイトで`maybe` |

プラグインはRubyで書かれる。なぜなら、リーチの問題は型言語だけでは解決できないからである——RubyサイドのレコグナイザーがASTを歩き、「この`has_many :posts`は`Relation[Post]`を返すアクセサを宣言する」と判断し、そのファクトをウォーカーの世界観に寄与する必要がある。
[ADR-2](../../adr/2-extension-api/)、
[ADR-16](../../adr/16-macro-expansion/)、
[ADR-25](../../adr/25-plugin-contributed-rbs/)、
[ADR-28](../../adr/28-path-scoped-protocol-contracts/)はこの知識が入る構造化された拡張点を定義する。

### 精度: ナイーブな推論は無用なjoinを生む

第2の動機はより微妙だが、少なくとも同等に重要である。複合式に対する最も単純な「正しい」推論ルールは、ユーザーに何も有用なことを伝えないほど広い型を生む:

| 式 | ナイーブなjoin | より有用な型 | Rigorの機構 |
| --- | --- | --- | --- |
| `{user: u, count: 3, msg: "ok"}` | `Hash[Symbol, User \| Integer \| String]` | `HashShape{user: User, count: Integer, msg: String}` | `HashShape`キャリア（ハッシュリテラルに組み込み） |
| `[1, "a", :sym]` | `Array[Integer \| String \| Symbol]` | `Tuple[Integer, String, Symbol]` | `Tuple`キャリア（配列リテラルに組み込み） |
| 証明可能な定数値（例: `42`、`"ok"`） | `Integer`、`String` | `Constant<42>`、`Constant<"ok">` | `Constant<T>`キャリア |
| `JSON.parse(input)` | `Hash[String, untyped] \| Array[untyped] \| String \| Integer \| Float \| true \| false \| nil` | オプション`K`ごとの`App[json::value, K]` | [ADR-20](../../adr/20-lightweight-hkt/)軽量HKT + `METHOD_RETURN_OVERRIDES` |
| 引数に依存して戻り値が変わるメソッド | 観察されたすべての出口の広いunion | 呼び出しサイトごとの識別された戻り値 | `RBS::Extended`の`return_override`ディレクティブ |
| DSL管理のアクセサ（`has_many`、`attribute`） | `Dynamic[Top]` | `Relation[Model]`、モデル固有の形状 | プラグインの`flow_contribution_for` + マクロ基板 |

これらは決定不能性のケースではない——推論は型を決定できるが、*無用な*ものを決定する。`Hash[Symbol, Foo | Bar | Buz]`や`true | false | String | Integer | Float`のような型は、技術的には観察された値の正しいjoinだが、その消費者は最初にナローイングせずに何もできない;unionは型システムが運ぶために存在した情報をちょうど消去してしまった。

共有する設計原則は**戻り値に対する厳密性**——堅牢性原則（[ADR-5](../../adr/5-robustness-principle/)）は「解析が正当化できる最も具体的な型」を目標として扱い、「観察されたすべての出口をカバーする最小の型」ではない。ナイーブなjoin広げは、入力が異種の場合にほぼすべてのケースでそのテストに失敗する。

これはまた、`HashShape`と`Tuple`が「エキゾチックなリファインメント」ではなく**基礎的なキャリア**である理由でもある——それらなしには、すべてのハッシュリテラルが`Hash`-with-unionに劣化し、推論された型言語は実践的にほとんど何も有用なことを記述しなくなる。

### 1つの基盤、2つの問題

プラグインコントラクトと`RBS::Extended`ディレクティブファミリーはしたがって2つの補完的な役割を果たす。Rigorが*どこで*型を全く生成できるかを拡張し（リーチ）、生成されたときにその型が*どれほど具体的*かを高める（精度）。2つの役割は基盤を共有するが、異なる制限に答える——一方は静的解析のスコープの制限、もう一方は有用な型設計の制限——そして、3値の`maybe`が答える決定可能性の問題とどちらも同じではない。

## Rigorがモデル化しないこと

完全性のために、Rigorがユーザー表面で*現在公開していない*型理論的機能の短いリスト——探すのをやめられるようにここで名指しする:

- **高階型（HKT）**。`Functor[F[_]]`スタイルの抽象化。「将来の方向」として追跡されているが、出荷されたスライスには含まれていない。（一般的なHKT推論は決定不能;ADR-20は関数適用を外し、アノテーション駆動のアプローチでこれを回避する。）
- **higher-rank多相（System F⊤）**。すべてのRBSジェネリクスは述語的;型変数は多相型を量化できない。（Rank-3推論はWells、1999により決定不能;述語的制限はRigorの表面を呼び出しごとのアノテーションなしで推論可能に保つ。）
- **多相再帰**。ジェネリックメソッド本体が*異なる*インスタンス化で自分自身の中に再適用される。推論は決定不能（Henglein、1993）;RBSはその構文を提供せず、Rigorはそれを合成しない。
- **完全な依存型**。`n : Integer`を持つ`Vec[n, T]`はない。型チェックは決定可能だが推論はそうではない;整数範囲リファインメント（`int<min, max>`）は最も一般的な実用的ニーズをラインを越えずにカバーする。
- **ユーザー量化可能な軸としての行多相**。`HashShape`は内部でopen-vs-closed意味論を持ち回るが、行変数を露出しない。設計根拠については§「オブジェクト形状 — 行多相、Hack、そして`HashShape`の系譜」を参照。
- **存在型**。`pack` / `unpack`はない。最も近い類似は構造的`interface`。
- **GADT**。コンストラクタによる型リファインメントはない;パターンマッチは型インデックス伝播ではなく標準的なoccurrence typingパス経由でナローイングする。
- **線形 / アフィン型**。ムーブチェックや使用回数強制はない。
- **セッション型、型としてのケイパビリティ**。スコープ外。
- **機械化された健全性証明**。意図的に延期されている;Rigorがまだ採用していない「小さな核で健全性を証明する」上流のアプローチについては[Matsumoto & Minamide 2010レビュー](../../notes/20260518-matsumoto-2010-cfa-rigor-review/)を参照。

このリストの話題が後でユーザーベースにとって重要になれば、実装スライスの前にADRで議論される。それまでは、不在は機能である。

## 短い読書リスト

上記の選択の背後にある論文や書籍を、この付録のセクションに対応する順序で:

- B.C. Pierce. *Types and Programming Languages.* MIT Press、
  2002。この付録の前半すべての標準参照。
- Cardelli & Wegner. "On Understanding Types, Data
  Abstraction, and Polymorphism." *ACM Computing Surveys*、
  1985。多相性分類の起源。
- Wand, M. "Complete Type Inference for Simple Objects."
  *LICS*、1987。行多相の種——「追加フィールドを持つオブジェクト型を推論する」の最初の定式化。
- Rémy, D. "Type Checking Records and Variants in a Natural
  Extension of ML." *POPL 1989.*最もよく引用される形の行変数機構。
- Cardelli, L. & Mitchell, J.C. "Operations on Records."
  *Mathematical Structures in Computer Science*、1991。
  行多相の下でのレコード操作の代数的扱い——GarrigueそしてMatsumoto & Minamideが構築する基板。
- Siek & Taha. "Gradual Typing for Functional Languages."
  *Scheme Workshop*、2006。元のグラデュアル型付け論文。
- Garcia, Clark & Tanter. "Abstracting Gradual Typing."
  *POPL 2016.*抽象解釈の観点でのグラデュアル型付けの現代的再定式化。
- Tobin-Hochstadt & Felleisen. "The Design and Implementation
  of Typed Scheme." *POPL 2008.*occurrence typingの起源。
- Rondon, Kawaguchi & Jhala. "Liquid Types." *PLDI 2008.*
  `int<min, max>`キャリアに情報を与えるSMTを使ったリファインメント型フレームワーク（Rigorははるかに弱い決定可能なフラグメントを使う）。
- Lucassen & Gifford. "Polymorphic Effect Systems."
  *POPL 1988.*エフェクトシステムの起源。
- Milner, R. "A Theory of Type Polymorphism in Programming."
  *JCSS*、1978。元の形でのHindley–Milnerシステム——言語を制限することで健全性、決定可能性、主型性質を同時に達成する標準的な型システム。
- Damas, L. & Milner, R. "Principal Type-Schemes for Functional
  Programs." *POPL 1982.*主型定理とAlgorithm W。Rigorが意識的に試みない*ことの*参照。
- Pierce, B.C. & Turner, D.N. "Local Type Inference." *ACM
  TOPLAS*、2000。サブタイピングが登場したときにHMスタイルのグローバルなユニフィケーションの教科書的なフォールバックである双方向 / ローカル推論設計——RubyのA静的型付け景観（特にSteep）がそれらの条件の下で参照する実用的な後継者であり、Rigorのウォーカーに最も近い教科書的な類似物。
- Wells, J.B. "Typability and Type Checking in System F are
  Equivalent and Undecidable." *Annals of Pure and Applied
  Logic*、1999。Rank-3（およびそれ以上）の型推論が決定不能であることの証明——RBSジェネリクスが述語的に留まる理由。
- Henglein, F. "Type Inference with Polymorphic Recursion."
  *ACM TOPLAS*、1993。多相再帰の推論が決定不能であることを確立する。
- 水野雅之.「計算機に推論できる型、できない型」.
  *Wantedly Advent Calendar*、2021.
  <https://www.wantedly.com/companies/wantedly/post_articles/349494>.
  決定可能性の境界——Let多相、Rank-N、多相再帰、再帰型、サブタイピング+交差型——のフレンドリーな日本語ツアーで、上記「推論の決定可能性」セクションの最もアクセシブルな伴侶。
- 松本 宗太郎、南出 靖彦. 「Rubyプログラムの制御フロー解析と
  その健全性の証明」*IPSJ TPRO Vol.3 No.2*、2010。上流のRuby-CFA健全性証明;Rigor観点のレビューは
  [`docs/notes/20260518-matsumoto-2010-cfa-rigor-review.md`](../../notes/20260518-matsumoto-2010-cfa-rigor-review/)。
- 松本 宗太郎、南出 靖彦. 「多相レコード型に基づくRubyプログラム
  の型推論」*IPSJ TPRO Vol.49 No.SIG 3*、2008。Rigorの名前的優先キャリア選択を遡及的に正当化するGarrigueカインド付き多相レコード実験;Rigor観点のレビューは
  [`docs/notes/20260518-matsumoto-2008-poly-records-rigor-review.md`](../../notes/20260518-matsumoto-2008-poly-records-rigor-review/)。

## 次に何を読むか

「Rigorは型理論の地形のどこに立つか見せて」という問いから入ってきたなら、ハンドブックの残りが実践的な伴侶になる:

- 表面レベルのキャリア群については[第2章 — 日常的に出会う型](../02-everyday-types/)。
- 実践でのoccurrence typingについては[第3章 — ナローイング](../03-narrowing/)。
- カスタム述語についてRigorに教えられるディレクティブ文法については[第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/)。
- ルールカタログ（3値の確実性のユーザーから見える端）については[第8章 — エラーの読み方](../08-understanding-errors/)。

*理論*ではなく別の*ツール*と比較したいなら、姉妹の付録が
[TypeScript](../appendix-typescript/)、
[PHPStan](../appendix-phpstan/)、
[mypy / Pyright](../appendix-mypy/)、
[Steep](../appendix-steep/)をカバーする。
