---
title: "ADR-36 — Macro-substrate nested-class emission tier (Mangrove `Enum`)"
description: "Imported from rigortype/rigor docs/adr/36-mangrove-enum-nested-class-emission.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/36-mangrove-enum-nested-class-emission.md"
sourcePath: "docs/adr/36-mangrove-enum-nested-class-emission.md"
sourceSha: "ddcbbc35cd845f925d63ed2f80a4c13ee93b409a806ad2446df444f8e8c748fc"
sourceCommit: "a5d648b126d5ed7b1e04a16a87927bca7883e069"
translationStatus: "translated"
sidebar:
  order: 4036
---

ステータス: **Accepted, 2026-05-30; Slice A implemented.**

[ADR-16](../16-macro-expansion/)のマクロ展開基層（substrate）を、クラスレベルのDSLブロックから（メソッドだけでなく）**ネストしたサブクラス**を生成する新しいティアで拡張するという決定を記録する。動機となったのは[Mangrove](https://github.com/kazzix14/mangrove)の`Enum` DSLである。Mangroveサポートのうち出荷可能で契約（contract）の範囲内にある部分（アンラップ呼び出しサイトでのキャリア（carrier）ジェネリックなインスタンス化）は`plugins/rigor-mangrove`として別途ランディングした。このADRは、今日のプラグイン契約が表現できなかった部分をスコープする。

**Slice A実装済み（2026-05-30）:** `Plugin::Macro::NestedClassTemplate`（マニフェストスロット`nested_class_templates:`）と`SyntheticMethodScanner`内のスキャナパスを追加した。これは、`receiver_constraint`を`extend`するクラス上の`<block_method> do … end`ブロック内の各`variant <Const>, <Type>`行について、バリアントサブクラス名を記録し（よって`Environment#class_known?`がそれを解決する → 定数参照 + `meta_new`経由の`.new`ディスパッチ）、既存の`SyntheticMethodIndex`を通じてリテラル定数のペイロード型を返す`#inner`リーダーを合成する。`Mangrove::Enum`のために`rigor-mangrove`へ配線した。`Shape::Circle.new(1.0).inner`はいまや`Float`と型付けされる**。保留（WD3の上限）:** `sealed`な親ファクト（fact）+ `is_a?`によるバリアント横断の網羅的ナローイング（narrowing）。これには合成クラスの階層を`Environment#class_ordering`へスレッディングする必要がある。また、非定数な内部シェイプ（shape、シェイプハッシュ）も保留で、今日は`Dynamic[Top]`へ退化する。

基礎調査:
[`docs/notes/20260530-mangrove-library-survey.md`](../../notes/20260530-mangrove-library-survey/)。

## コンテキスト

Mangroveの`Enum`は代数的データ型のDSLである:

```ruby
class Shape
  extend Mangrove::Enum

  variants do
    variant Circle, Float
    variant Rectangle, { width: Float, height: Float }
    variant Unit, NilClass
  end
end
```

各`variant Const, Type`宣言は、`#inner : <Type>`を担う**ネストしたサブクラス**`Shape::Circle < Shape`を生成する（加えて固定のメソッド集合 — `inner`、`as_super`、`serialize`、`==`）ことを意図している。下流のコードは、それらのバリアントを構築しマッチする:

```ruby
shape = Shape::Circle.new(1.0)
case shape
when Shape::Circle then shape.inner.floor   # inner : Float
end
```

### なぜ現在の契約サーフェスが合わないか

Mangroveはこれを`const_missing` + 文字列化されたRubyヒアドキュメントの`class_eval`で実装している — バリアントサブクラスは`Shape::Circle`が初めて参照されたときに遅延的に定義される（調査メモ§「Enum DSL」）。生成されるサーフェスはソースから完全に回復可能である — `variant Const, Type`の対はリテラル引数であり、emitされるメソッド集合は固定である — が、v0.1.xのどの基層ティアもそれをemitできない:

- **ADR-16のティアC（`Macro::HeredocTemplate`）**は`symbol_arg_position`でリテラル**Symbol**を抽出し、**呼び出し元クラス上のメソッド**をemitする。Mangroveの`variant`は**定数**（バリアントクラス名）を取り、emit先は`Shape`上のメソッドではなく**新しいネストクラス**である。`rigor-dry-struct`はすでにこの正確なギャップを文書化している: 「ネストブロック形式（`attribute :details do ... end`が`Address::Details`を生成する）はスコープ外 …… そのパターンはティアA + ティアCの合成 + `const_set`によるemitを必要とする。保留。」
- **ティアA（`BlockAsMethod`）**はブロック本体の`self_type`を再ターゲットする。定数は生成しない。
- **ティアB（`TraitRegistry`）**はシンボルを*既存の*モジュールへ写して`include`する。型は作らない。

基層の下限（ADR-16のWD13）は「合成**メソッド**を名前でemitする」である。「合成**クラス**emit」のプリミティブは存在しない。だからMangroveの`Enum`はその標準的な動機付けケースである。

調査からのもう2つのMangroveサーフェスは、このADRでは明示的に**スコープ外**である:

- sealedなバリアント集合に対する`is_a?(Shape::Circle)`の網羅的ナローイングは、コアの制御フロー解析であり（型の宇宙が知るどのsealed階層であれそれを消費する）、基層の関心事ではない。これは、このADRのemitティアが、バリアントが存在することと`Shape`がそのsealedな親であることを宇宙に教えたときに*有用*になるが、ナローイング自体はエンジンの仕事である。
- キャリアジェネリックなインスタンス化（`unwrap!` → `OkType`）は`plugins/rigor-mangrove`で出荷済みで、ここでは何も必要としない。

## 決定

ADR-16の基層に**ネストクラスemitティア**を追加する。作業上の形（実装中の精緻化を要する）:

```ruby
nested_class_templates: [
  Rigor::Plugin::Macro::NestedClassTemplate.new(
    receiver_constraint: "Mangrove::Enum",   # extend-side marker
    block_method: :variants,                 # the enclosing DSL block
    variant_method: :variant,                # each declaration call
    name_arg_position: 0,                     # constant arg → nested class name
    inner_arg_position: 1,                    # type arg → #inner return
    superclass: :enclosing,                   # Shape::Circle < Shape
    emit: [
      { name: "inner",    returns_from_arg: { position: 1 } },
      { name: "as_super", returns: :enclosing },
      { name: "==",       returns: "bool" }
    ],
    sealed: true                              # mark the parent sealed
  )
]
```

実装前にADR本文で確定すべき作業上の決定:

- **WD1 — emitプリミティブ**。プリパスは、各`variant Const, Type`行について、囲むクラスを親とする名前的型（nominal type、公称型とも）`<<Enclosing>>::<<Const>>`を合成し、ディスパッチャーがすでに参照する同じ`SyntheticMethodIndex`基層に登録する — ただし定数リゾルバと`.new`ディスパッチの両方が見られる**クラス**エントリーとしてキー付けする。これが新しい基層のケイパビリティ（capability）である。
- **WD2 — `#inner`の戻り値精度**。`inner_arg_position`はADR-18の`returns_from_arg:`機構を再利用する。リテラルな第2引数（`Float`、シェイプハッシュ、`NilClass`）は`Environment#nominal_for_name`（またはシェイプリテラル）を通じてバリアントの`#inner`戻り値へ解決する。ADR-16のWD13に従う下限: リゾルバチェーンが配線されるまでは`Dynamic[T]`。
- **WD3 — sealed性**。`sealed: true`は親 → バリアント集合を公開し、エンジンの制御フローナローイング（保留中の`is_a?`サーフェス）が後でバリアント集合を網羅的として扱えるようにする。ファクトをemitすることはスコープ内で、ナローイングのためにそれを消費することはスコープ外である。
- **WD4 — 需要ゲーティング**。今日のティアDと同様に、まず値クラス + バリデーションを出荷し、バンドルされたコンシューマー（`rigor-mangrove`のEnumスライス（slice））がそれに対して構築されるときにプリパス + ディスパッチャー統合を配線する。

## 帰結

- Mangroveを超えてADT / sealedバリアントのDSLのクラス全体（`Dry::Struct`のネストした`attribute … do … end`、`const_set`で生成するあらゆるマクロ）をアンブロックする。`rigor-dry-struct`の保留メモが対処可能になる。
- ティアがランディングすると`rigor-mangrove`は第2のスライス（Enum）を得て、すべてのMangroveサポートを1つのバンドルプラグインに保つ。
- 真に新しい基層プリミティブ（クラスemit）を追加する。エンジンのサーフェス面積を増やすので、ADR-16の他の部分と同じ偽陽性の規律の背後でゲートされなければならない — 合成されたバリアントクラスは、動作しているプログラムの挙動を決して*取り除いて*はならず、`Dynamic[Top]`だったところに解決を*加える*だけでなければならない。
- 保留はv0.1.xの契約を誠実に保つ: これが出荷されるまで、`rigor-plugin-author`スキルは、Mangroveの`Enum`リクエストを、ウォーカーの回避策をでっち上げるのではなく「止まって尋ねる / ADRを開く」へ正しくルーティングする。
