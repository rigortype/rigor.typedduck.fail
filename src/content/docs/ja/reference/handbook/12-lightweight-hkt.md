---
title: "軽量HKT（`JSON.parse`とその仲間たち）"
description: "rigortype/rigor docs/handbook/12-lightweight-hkt.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/12-lightweight-hkt.md"
sourcePath: "docs/handbook/12-lightweight-hkt.md"
sourceSha: "b062fdc3123b22fb3558afdc1fdd7cc7959b2511f90c28caf2a3fcf4790fc47e"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 1012
---

`JSON.parse(str)`は「何らかのJSON値」を返します: `nil`、bool、数値、文字列、JSON値の配列、またはJSON値のハッシュ。RBSはこれを`untyped`として記述します。型コンストラクタを量化することなく再帰的な直和型（sum type）を綴る方法がないからです。ほとんどの型チェッカーは肩をすくめ、`JSON.parse(str)`を`Dynamic[Top]`に消え去らせます。

Rigorはこれを正確にモデル化します:

```ruby
parsed = JSON.parse('{"name": "Alice"}')
assert_type(
  "Array[json::value[String]] | Float | " \
  "Hash[String, json::value[String]] | Integer | " \
  "String | false | nil | true",
  parsed)
```

この背後にある仕組み——そして自前のDSLやstdlibメソッドに同じ形状を配線できるようにするもの——が**軽量HKT**（[ADR-20](../../adr/20-lightweight-hkt/)）です。Rigorによる、[Yallop & White 2014](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf) /
[fp-tsの`URItoKind`](https://github.com/gcanti/fp-ts/blob/master/src/HKT.ts)
スタイルでの、高階型の脱関数化エンコーディングです。本章ではそれが何をするのか、いつ使うべきか、自前のオーバーレイをどう作るかを順に見ていきます。

本章はハンドブックの中で最も高度な章です。ほとんどの読者に必要なのは最初の2つのセクション——キャリアがどう見えるか、そしてどのstdlibメソッドが最初から配線されているか——だけです。「自前のオーバーレイを書く」以降はすべて、自分自身の再帰的な直和型をモデル化したいという稀なケースのためのものです。

## 5秒で分かる要点

| 概念 | Rigorでの綴り | 見かける場所 |
| --- | --- | --- |
| 型コンストラクタの「タグ」 | 名前空間付きシンボルURI（`:json::value`、`:dry_monads::result`） | `%a{rigor:v1:hkt_register: uri=…}`ディレクティブ |
| 抽象適用`F<A>` | `Type::App[uri, args]` | ディスパッチャー出力のキャリア（carrier） |
| 型レベル定義 | `%a{rigor:v1:hkt_define: uri=… params=… body=…}`ディレクティブ | `.rbs`オーバーレイファイル |
| `App[F, A]`を実型に簡約 | `env.hkt_registry.reduce(app)`（または`app.reduce(registry)`） | 既知のstdlibメソッドに対しディスパッチャー層が積極的に呼び出す |
| メソッドへのフック | `Builtins::HktBuiltins::METHOD_RETURN_OVERRIDES`テーブル | プラグイン / Rigorバンドルの配線 |

次節以降でこれらをひとつずつ動作とともに示します。

## 今日バンドルされているもの

Rigorは最初から2つのHKT登録を出荷しています。主要なものは**`json::value[K]`**、再帰的なJSON値の直和です（2つ目の`csv::parsed[K]`は本セクションの最後で扱います）。`json::value`は2つの部分から成ります:

```ruby
# 登録 — タグを命名し、そのarity、分散、消去境界を宣言する。
# 境界は、簡約がブロックされたときにRigorのRBSラウンドトリップが
# フォールバックする先である。
uri=json::value arity=1 variance=out bound=untyped

# 定義 — 実際のボディ。K（ハッシュキー型）でパラメータ化されている。
# 自己参照する`App[json::value, K]`アームに注意 — Rigorのレデューサは
# 遅延「結び目固め」セマンティクスで再帰を扱う。
params=K body=
  nil | true | false | Integer | Float | String
  | Array[App[json::value, K]]
  | Hash[K, App[json::value, K]]
```

9つのstdlibメソッドがこれを経由します:

- `JSON.parse` / `JSON.parse!` / `JSON.load` / `JSON.load_file` / `JSON.load_file!`
- `YAML.safe_load` / `YAML.safe_load_file`
- `Psych.safe_load` / `Psych.safe_load_file`

HKT組み込みディスパッチャー層は標準RBSディスパッチの**上**に位置するので、上流のRBSが`JSON.parse: (string, ?options) -> untyped`と宣言していても、Rigorの答えは簡約されたUnionになります。`YAML.load` / `YAML.unsafe_load`は意図的に外しています——これらはどんなRubyオブジェクトでも返しうるので、有用なHKTエンベロープを持たないからです。

2つ目のバンドル登録**`csv::parsed[K]`**は、`CSV.parse` / `CSV.read`を`Array[Array[K | nil]]`——ヘッダーなしの形状——としてモデル化します。`headers: true`を渡す呼び出し（`CSV::Table`を返す）と`CSV.foreach`（返すのではなくyieldする）は上流のRBS型にフォールスルーします。

## 呼び出しサイトの2種類の判別

バンドルされたオーバーライドは単なる`(receiver, method) → 固定型`ではありません。2つの**判別子**が呼び出しの実引数を覗き込みます:

### `symbolize_names: true`がKを差し替える

```ruby
JSON.parse(str)
# parsed: ... | Hash[String, json::value[String]] | ...

JSON.parse(str, symbolize_names: true)
# parsed: ... | Hash[Symbol, json::value[Symbol]] | ...
```

`:json_symbolize_names`判別子は、呼び出しの第二引数`HashShape`を覗き、リテラルな`symbolize_names: true`エントリーを探します。マッチするとレデューサ実行前に`K = String`を`K = Symbol`に差し替えます。リテラルでない`symbolize_names: x`（変数、`Constant<true>`でない値）はデフォルトの`String`枝に残ります。

### `permitted_classes:`が追加のアームをユニオンする

```ruby
require "date"
parsed = YAML.safe_load(str, permitted_classes: [Date])
# parsed: ... | Date | ...
```

`:yaml_permitted_classes`の**簡約後フック**はレデューサの後で動き、結果を増補します。第二引数`HashShape`を歩いて、値がSingletonクラスのリテラルな`Tuple`または`Array`である`permitted_classes:`キーを探し、各々を`Nominal`にマップし、ベースの`json::value` Unionとユニオン（union、合併型とも）します。`[Date, Symbol]`は両方のアームを加えます。

リテラルでない`permitted_classes:`の値（変数、`Dynamic`、Singletonでない要素）は静かにno-opになるので、Rigorが静的に見られないクラスをでっち上げることはありません。

## 自前のオーバーレイを書く

`signature_paths:`配下の`.rbs`ファイルで自前のHKT URIを登録できます。アノテーションはクラスまたはモジュール宣言にアタッチします（RBSのアノテーション文法がそれを要求します）:

```ruby
%a{rigor:v1:hkt_register: uri=my_app::box arity=1 variance=out bound=untyped}
%a{rigor:v1:hkt_define: uri=my_app::box params=K body=K | nil}
class MyAppBoxOverlay
end
```

いくつかのルール:

- **URIは名前空間付きでなければならない**（`<author>::<name>`）。`::`セパレータがADR-20 WD1に従いクロスプラグイン衝突を防ぐ。
- **ペイロード形式はスペース区切りの`key=value`ペア**。RBSの`%a{...}`アノテーション文法はクォートを拒否するので、JSONペイロードは動作しない——kv形式がRBSが実際に届ける形である。
- **`body=`は特殊扱いで、ペイロードの末尾までを丸ごと飲み込む**ので、ボディ文字列はエスケープなしでスペース、`|`、`[]`などを含められる。
- **`params=`はUCName識別子のカンマ区切りリスト**（`params=K`または`params=T,E`）。
- **`bound=`は`untyped`（デフォルト）または素のクラス名を受け付ける**。より豊富なbound形式（パラメータ化ジェネリクス、ユニオン、リファインメント（refinement、篩型とも））はフォローアップスライスの式パーサ待ち。

`Environment.for_project`がenvを構築するとき、ロードされたRBSをこれらのアノテーションでスキャンし、バンドルされた組み込みの上に`env.hkt_registry`にマージします。URI衝突はlast-write-winsなので、オーバーレイで`json::value`を上書きすることも望めば可能です。

## ボディの文法

`body=`は`HktBodyParser`がレデューサが歩く木にパースします。文法はADR-20 § D3を完全にカバーします:

| 形式 | 例 | 意味 |
| --- | --- | --- |
| アトム | `nil` / `true` / `false` / `bool` / `untyped` | 定数と`Dynamic[Top]`キャリア |
| 名前的クラス | `Integer` / `String` / `Foo::Bar` / `::String` | `Nominal[class_name]` |
| パラメータ参照 | `K`、`T`、`E`（`params`にあるとき） | 簡約時に代入される |
| パラメータ化された名前的型（nominal type、公称型とも） | `Array[K]`、`Hash[K, V]` | `Nominal[..., type_args: [...]]` |
| 軽量HKT適用 | `App[json::value, K]` | 別の`Type::App`キャリア、遅延簡約される |
| ユニオン | `A \| B \| C` | `Type::Union`（正規化済み） |
| **条件** | `(K <: String ? Integer : Float)` | テスト評定で分岐 |

曖昧性解消: `params`のひとつにマッチするUCNameは`Param`ノードになる。**ただし**それに`::`（qualifiedクラス継続）や`[`（パラメータ化適用）が続く場合は名前的型として扱う。だから`K`はparam参照、`K[X]`は`X`に適用されたクラス`K`になる。

### 条件型（§ D3）

条件型は境界型でボディを分岐させられる——単一の登録の中で形状駆動の判別をするのに有用:

```ruby
%a{rigor:v1:hkt_define: uri=my_app::result params=K body=
  (K <: String ? Integer : Float)
}
```

3つのテスト演算子:

| テスト | 例 | 意味 |
| --- | --- | --- |
| `<:`（部分型） | `K <: String` | `K`の簡約型が`String`の部分型のとき真 |
| `==`（構造的等価） | `K == :symbol` | `K`の簡約型が右辺と構造的に等しいとき真 |
| `in [...]`（メンバーシップ） | `K in [String, Symbol]` | `K`の簡約型が選択肢のいずれかと構造的に等しいとき真 |

レデューサの評定ポリシーは**3値**:

- `:yes` → `then_branch`を簡約。
- `:no` → `else_branch`を簡約。
- `:maybe`（未決——例えばどちらかの辺が`Dynamic[T]`） → 両方の簡約された枝のユニオンに広げる（ADR-20 WD7 / 堅牢性原則に従い——どちらのアームが発火するかを証明できないとき、Rigorは保守的に留まる）。

現スライスの評定ポリシー: 構造的等価 → `:yes`;互いに素な名前的型（異なる`class_name`）または互いに素な定数（異なる`value`） → `:no`;それ以外すべて → `:maybe`。

枝はユニオンと入れ子の条件を受け付ける:

```ruby
%a{rigor:v1:hkt_define: uri=my_app::numeric params=E body=
  (E <: Integer ? Integer
    : (E <: Float ? Float
      : (E <: String ? Integer | Float | nil
        : untyped)))
}
```

テストの両辺自体は単一のアーム（テスト辺に直接ユニオンは置けない——そこにユニオンが必要なら`App[my_union, ...]`でラップせよ）。

## 簡約のセマンティクス——遅延「結び目固め」

おもしろい部分: `json::value`のボディは`Array[App[json::value, K]]`を含む——**自己参照**である。素朴な再帰レデューサは無限ループする。

Rigorのレデューサは`(uri, reduced_args)`をキーとする**進行中スタック**を持ち回ります。`AppRef`を評価するときその`(uri, args)`がスタックにあるものと一致したら、展開せずに進行中の`Type::App`キャリアをそのまま返します——遅延的に。再帰的型エイリアスのための標準的な不動点トリックです。

つまり`App[json::value, [String]]`を簡約すると次のようになります:

```
Union[ nil, true, false, Integer, Float, String,
       Array[ Type::App[json::value, [String]] ],  ← キャリアはそのまま残る
       Hash[ String, Type::App[json::value, [String]] ] ]
```

入れ子の`Type::App`は通常のRigor型です;下流の消費者（受容、ナローイング（narrowing）、ディスパッチ）はそれを`bound`（デフォルト`Dynamic[Top]`）に委譲して扱います。もう1段の展開が必要なら、再度`app.reduce(env.hkt_registry)`を呼びます——しかし典型的な消費者はそれを必要としません。

**燃料予算**（呼び出しサイト評価あたりデフォルト64簡約ステップ）が暴走する展開を制限します。枯渇は`app.bound`に巻き戻ります。

## まだしないこと

軽量HKTは——まあ、軽量です。意識的な非目標:

- **バインダー抽出を伴うパターンマッチ**
  （`E <: [:if, _, A, B] ? lisp_type[A] | lisp_type[B] : ...`）。
  上で述べた条件文法はyes/no/maybeをテストするが、
  パターンから新しい型変数を束縛しない。
  `rigor-lisp-eval`は完全なASTシェイプ（shape）判別のために
  バインダー抽出を必要とする;パターンバインディングが着地するまでは
  診断エミッターパスに留まる。
- **非再帰コンテナのための複数引数HKT**
  （`Result[T, E]` / `Maybe[T]`）——レジストリは複数引数URIを
  サポートするが、Rigorの既存のキャリアは`Result`が必要とする
  封印ユニオン形状を持たない（ADR-3の改訂がゲート要素）。
- **糖衣構文**。明示的な`%a{rigor:v1:hkt_register /
  hkt_define}`ペアが正規形。再帰的な`type alias`の略記は
  将来のオプションで、明示形式が冗長すぎるというユーザー
  フィードバックでゲートされる。
- **プラグイン側のリゾルバフックアップ**。プラグインはまだ
  マニフェスト経由でHKT URIを登録できない;今日は
  Rigorバンドルの登録とユーザー`.rbs`オーバーレイのみが
  レジストリを埋める。

これらのどれかに当たったら、ADR-20の § 実装のスライス分けメニューがそれに対処するスライスを名指ししています。

## コード上の場所

| レイヤー | 場所 |
| --- | --- |
| キャリア | [`lib/rigor/type/app.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/type/app.rb) |
| レジストリ値オブジェクト | [`lib/rigor/inference/hkt_registry.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/hkt_registry.rb) |
| ボディ木ノード型 | [`lib/rigor/inference/hkt_body.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/hkt_body.rb) |
| レデューサ（遅延自己参照 + 燃料） | [`lib/rigor/inference/hkt_reducer.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/hkt_reducer.rb) |
| ボディ文字列文法パーサ | [`lib/rigor/inference/hkt_body_parser.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/hkt_body_parser.rb) |
| ディレクティブパーサ（`hkt_register` / `hkt_define`） | [`lib/rigor/rbs_extended/hkt_directives.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/rbs_extended/hkt_directives.rb) |
| バンドルされた`json::value` + `METHOD_RETURN_OVERRIDES` | [`lib/rigor/builtins/hkt_builtins.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/builtins/hkt_builtins.rb) |
| ディスパッチャー層 | [`lib/rigor/inference/method_dispatcher.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/method_dispatcher.rb)（`try_hkt_builtin_return`） |
| 環境統合 | [`lib/rigor/environment.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment.rb)（`#hkt_registry` + `HktRegistryHolder`） |
| RBSスキャン | [`lib/rigor/environment/rbs_loader.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/rbs_loader.rb)（`each_class_decl_annotation`） |

## 次に何を読むか

「JSON.parseはどこから型を得ているのか？」という疑問でここに来たなら、ハンドブックの残りが周辺機構をカバーします:

- レデューサが出力するキャリア一覧については[第2章 — 日常的に出会う型](../02-everyday-types/)。
- HKTディレクティブが並んで座るより広いアノテーション文法（`%a{rigor:v1:return:}`、`%a{rigor:v1:predicate-if-true:}`、……）については[第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/)。
- Rigorが本物のHKTではなく軽量エンコーディングを採用した理由を説明する形式型理論の文脈については[付録 — 型理論との接続](../appendix-type-theory/)
  § 「Rigorがモデル化しないこと」。

自前のオーバーレイをend-to-endで書きたいなら、
[`spec/rigor/environment_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/rigor/environment_spec.rb)
（「ADR-20 HKTレジストリスキャン」コンテキスト）にある実例が最小の参照——ディレクティブペアを持つフィクスチャ`.rbs`ファイル、それらを留めるクラス宣言、そして`env.hkt_registry`経由で登録を表面化する`Environment.for_project`呼び出し。
