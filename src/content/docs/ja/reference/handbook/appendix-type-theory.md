---
title: "付録 — 型理論との接続"
description: "rigortype/rigor docs/handbook/appendix-type-theory.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/appendix-type-theory.md"
sourcePath: "docs/handbook/appendix-type-theory.md"
sourceSha: "ddbeba9fc09cbdaae77164cccb044ac897ffa8a19307793de9c58ebae0bd751f"
sourceCommit: "fe4e9a80df3829ee4f113e763e4bb9920c33da21"
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
| **行多相** | （ユーザー表面では露出されない） | `HashShape`は内部でclosed-vs-openキーセットを持ち回るが、量化可能な軸ではない。 |

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
| キャスト | ソース内キャスト演算子はない。オプトインの[`rigor-sorbet`](https://github.com/rigortype/rigor/blob/main/plugins/rigor-sorbet/)プラグインは`T.let` / `T.cast` / `T.must`をキャスト形式として読む;`RBS::Extended`の`assert_type`ディレクティブは`.rbs`から同じ役割を果たす。 |

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

## Rigorがモデル化しないこと

完全性のために、Rigorがユーザー表面で*現在公開していない*型理論的機能の短いリスト——探すのをやめられるようにここで名指しする:

- **高階型（HKT）**。`Functor[F[_]]`スタイルの抽象化。「将来の方向」として追跡されているが、出荷されたスライスには含まれていない。
- **higher-rank多相（System F⊤）**。すべてのRBSジェネリクスは述語的;型変数は多相型を量化できない。
- **完全な依存型**。`n : Integer`を持つ`Vec[n, T]`はない。整数範囲リファインメント（`int<min, max>`）が最も一般的な実用的ニーズをカバーする。
- **ユーザー量化可能な軸としての行多相**。`HashShape`は内部でopen-vs-closed意味論を持ち回るが、行変数を露出しない。
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
