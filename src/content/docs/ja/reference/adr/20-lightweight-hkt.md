---
title: "ADR-20: 軽量高階多相性（Lightweight HKT）"
description: "rigortype/rigor docs/adr/20-lightweight-hkt.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/20-lightweight-hkt.md"
sourcePath: "docs/adr/20-lightweight-hkt.md"
sourceSha: "2764cc5154ae72bd5fc050cc58b95cc8fe470a120e8507392dd577de9ab3b0b2"
sourceCommit: "fe4e9a80df3829ee4f113e763e4bb9920c33da21"
translationStatus: "translated"
sidebar:
  order: 4020
---

## ステータス

**Accepted（部分実装、2026-05-18）**。当初2026-05-18にproposedとして提出されたが、同日中にスライス（slice）1、2a、2c、2d、3がエンドツーエンドで着地し、`JSON.parse`が`untyped`の代わりに再帰的な`json::value`ユニオン（union、合併型とも）を返すようになった（`rigor type-of`で検証済み）ため、acceptedに昇格した。残りのオープンスライス（§ 実装スライス分けのスライス2b、4、5、6）はスケジュールコミットメントを持たず、需要駆動で出荷される。

### v0.1.6で着地したもの

- **スライス1** — `Rigor::Type::App`の不透明キャリア（carrier）（`uri`、`args`、`bound`）;`Rigor::Inference::HktRegistry`（`Registration` + `Definition`値オブジェクト + last-write-winsの`merge`）;`Rigor::RbsExtended::HktDirectives.parse_register` / `parse_define`（`%a{rigor:v1:hkt_register}` / `%a{rigor:v1:hkt_define}`ディレクティブ用のJSON-flowペイロードパーサー）。このスライスでは簡約なし、呼び出しサイトの配線なし。
- **スライス2a** — `Rigor::Inference::HktBody`（5つの`Data.define`ボディ木ノード型: `TypeLeaf`、`Param`、`AppRef`、`Union`、`NominalApp`）;遅延自己再帰処理のための呼び出しごとの進行中スタック（再帰的な直和が終了するための「結び目固め」トリック）と燃料予算（WD3に従いデフォルト64）を実装する`Rigor::Inference::HktReducer`によるD4評価ルール。`Definition#body_tree`スロットを追加;ボディ文字列はスライス2bパーサー用にそのまま並んで残る。`Type::App#reduce` + `HktRegistry#reduce`便宜ラッパー。
- **スライス2b** — `Rigor::Inference::HktBodyParser`（最小文法: union + アトム + nominal_app + app_ref + param、`JSON.parse`の再帰的直和と類似の再帰データ形シグネチャに十分;条件 / インデックスアクセス形はフォローアップに残る）。`HktDirectives.parse_define`は今、自動的にパーサーを呼び出しボディ文字列から`body_tree`を埋める;パース失敗はfail-softで`body_tree: nil` + `:info`レポーターエントリになる。エンドツーエンドのレデューサ等価性がプログラマティックなJSON_VALUEボディに対して検証された。
- **スライス2e** — `RbsLoader#each_class_decl_annotation` + `HktRegistry.scan_rbs_loader` + `Environment.for_project`配線。`%a{rigor:v1:hkt_register / hkt_define}`アノテーションを運ぶユーザー著作`.rbs`オーバーレイは今、`env.hkt_registry`に表面化し、バンドルされた組み込みの上にマージされる。URI衝突はlast-write-winsなので、ユーザーオーバーレイは望むならバンドルされたJSON_VALUEをオーバーライドできる。
- **スライス6** — プラグインマニフェスト宣言のHKT登録。`Plugin::Manifest`が`hkt_registrations:` / `hkt_definitions:`フィールドを獲得;`Plugin::Registry#hkt_overlay_registry`がロードされたすべてのプラグインのエントリを集約;`Environment#hkt_registry`は**builtins → プラグインオーバーレイ → RBS envスキャン**の順にマージ、URI衝突はlast-write-wins。
- **HktDirectives kv-formリファクター** — ペイロード形式がJSON-flow（`{"uri": "x", ...}`）からkv-form（`uri=x arity=1 ... body=...`）に移動、RBSの`%a{...}`アノテーション文法が`"`クォートを拒否するため。生のRBS::EnvironmentLoaderで検証済み。
- **スライス2c** — `Environment#hkt_registry` attr_readerが凍結されたレジストリをすべてのアナライザ呼び出しを通してスレッド化する。`Environment.default` / `.for_project`は新しい`Rigor::Builtins::HktBuiltins.registry`モジュール経由でそれをシードする。
- **スライス2d** — `%a{rigor:v1:return:}`ペイロード内の`App[<uri>, <ClassName>, ...]`ペイロード構文が`RbsExtended.parse_return_type_override`によってパースされ、envのレジストリを通じて積極的に簡約される。
- **スライス3** — `JSON.parse` / `JSON.parse!` / `JSON.load`をカバーする`Rigor::Builtins::HktBuiltins::METHOD_RETURN_OVERRIDES`テーブル;`RbsDispatch.try_dispatch`の**上**に位置する新しい`Inference::MethodDispatcher.try_hkt_builtin_return`層、したがってテーブルが上流のrbs gemの`untyped`スロットに勝つ。判別子サーフェス（`:json_symbolize_names`）は、呼び出しがリテラルな`symbolize_names: true`オプションを運ぶときに`K = String`を`K = Symbol`に差し替える。アノテーションベースの著作（再宣言されたメソッド上の`%a{rigor:v1:return: App[...]}`経由の元のD8計画）はこのスライスで調査され拒否された、RBSは拡張形の`def m: ...`宣言から解決された`RBS::Definition::Method`に`%a{...}`アノテーションを伝播しないため;ハードコードされたテーブルは実用的なショートカットであり、一方でアノテーションベースのパスは新しいメソッドを**宣言**する（上流のメソッドを再宣言するのではない）ユーザー著作sig用の一般的な拡張サーフェスのままである。

### 残るオープン項目

- （元はリストされていた: スライス2e — `Environment.for_project` HKTアノテーションスキャン。**2026-05-18着地** — 上記「着地したもの」参照。）
- **スライス4** — `rigor-dry-monads`の`Result[T, E]` / `Maybe[T]`キャリア経由の複数引数HKT検証。基底の値オブジェクト表現のためのADR-3修正の背後にキュー。
- **スライス5** — 再帰的`type`エイリアス経由の糖衣構文。明示的`%a{...}`形が冗長すぎるというユーザーフィードバックにゲート。
- （元はリストされていた: スライス6 — プラグイン側のリゾルバフックアップ。**2026-05-18着地** — 上記「着地したもの」参照。）

## コンテキスト

### `JSON.parse`問題

バンドルされたstdlib RBSは次のように宣言する:

```ruby
# references/rbs/stdlib/json/0/json.rbs:1113
def self?.parse: (string source, ?options opts) -> untyped
```

`untyped`は上流のrbs gemの選択である。Rigorのアナライザにとってこれは:

- すべての`JSON.parse(...)`呼び出しサイトが`Dynamic[Top]`に広がる。
- 下流のナローイング（narrowing）（`is_a?`、`case/in`、`dig`）が情報を回復する唯一の方法。
- `make check`は構造的に間違ったパース後アクセスを何もフラグできない — 型は*最大*の動的キャリアである。

`JSON.parse`に対して実際に健全（soundness）な最小精度フロアは**再帰的直和**:

```ruby
type json::value =
    nil
  | bool
  | Integer
  | Float
  | String
  | Array[json::value]
  | Hash[String, json::value]

def self?.parse: (string source) -> json::value
```

RBSはすでに再帰的型エイリアスを受け入れるので、この単一の置換は新しい機構なしで**今日**利用可能な精度向上である。我々が依然HKTを望む理由は、*第2*レベルの精度のため:

1. **オプションによるキー型判別**。`JSON.parse(s, symbolize_names: true)`は`Symbol`でキー付けされたHashを返す;オプションなしでは`String`で。素朴なRBSオーバーロードはこれをエンコードするが、より多くのオプションが追加されてもよく合成されない。
2. **スキーマ駆動パース**。`MySchema.from_json(str): MySchema`を書くライブラリ作者は、スキーマの静的型がパース戻り型を駆動することを望む。
3. **`rigor-lisp-eval`デモ**。
   [デモシグネチャ](https://github.com/rigortype/rigor/blob/master/examples/rigor-lisp-eval/demo/sig/lisp.rbs)
   は、リテラルASTをパターンマッチする条件型ボディで`def self.eval: [E] (E expr) -> lisp_type[E]`をスケッチする。デモは現在、評価サーフェスが存在しないため`(untyped) -> untyped`で出荷される。
4. **`rigor-dry-monads`キャリア**（[ADR-12](../12-dry-rb-packaging/)に従いdry-rbメタアンブレラ用にキュー済み）は、ユーザーが抽象化できる名前付き*型コンストラクタ*として`Result[T, E]`と`Maybe[T]`を必要とする — まさにYallop-White HKTが発明された目的。

### なぜ「軽量」HKT特に

完全な高階多相性 — 型コンストラクタ`F[_]`を量化する — は次のいずれかを必要とする:

- ホスト言語自体にカインドシステムを追加する（OCaml + モジュール、Scala 2/3、Haskell）。RBSは持たない。
- Rigorが[ADR-0](../0-concept/)（「アプリケーションのRubyコードはRigor専用のアノテーション構文がないままにとどまる」）と[ADR-1](../1-types/)（「RigorはRBSスーパーセット」）に違反することなく出荷できない非自明なソース言語拡張。

Yallop & White（2014）は、型コンストラクタ量化*なしの*言語で次のようにしてHKTをシミュレーションできることを示した:

1. 関心のある各型コンストラクタに対し**脱関数化されたタグ**（URI / Symbol / ブランド）を選ぶ。
2. タグと引数でパラメータ化された単一の抽象キャリア`App[F, A]`を導入する。
3. 各タグをその具体的インスタンス化にマップする**型レベルのレジストリ**を、ラウンドトリップのための`inj`/`prj`関数（`Kind`と呼ばれることもある）と共に保守する。

fp-tsはこれをTypeScriptで宣言マージ経由でそのまま実装する:

```typescript
// fp-ts/src/HKT.ts
export interface URItoKind<A> {}                  // open registry
export type URIS = keyof URItoKind<any>           // all registered tags
export type Kind<URI extends URIS, A> =           // indexed projection
    URI extends URIS ? URItoKind<A>[URI] : any
export interface HKT<URI, A> {                    // brand carrier
  readonly _URI: URI
  readonly _A: A
}
```

ライブラリは`URItoKind<A>`に単一行をマージすることでタグを登録する:

```typescript
declare module 'fp-ts/HKT' {
  interface URItoKind<A> {
    readonly Option: Option<A>
  }
}
```

登録後、ジェネリックコードは`URI extends URIS`を量化し`Kind<URI, A>`経由で基底の型を回復できる。これは**本当のHKTではない** — TypeScriptには型コンストラクタレベルの抽象化はない — が、`Functor<F>`形のライブラリを書く目的には十分である。

### 階層化された設計空間: L1 / L2 / L3

本ADRの機構は、**3階層の設計空間の上位層**である。階層を明示的に命名しておくと、各下流消費者がどのレベルの機構を実際に必要としているかを判断しやすくなる。

| 層 | サーフェス | 機構コスト |
| --- | --- | --- |
| **L1** | パラメトリックな再帰`type`エイリアス — `type json::value[K] = nil | bool | ... | Array[json::value[K]] | Hash[K, json::value[K]]`。Python PEP 695の`type Json[K] = ...`、TypeScriptの前方参照を持つ再帰エイリアスと精神的に同等。 | ゼロ。RBSはすでに再帰`type`エイリアスを受け入れる（§「JSON.parse問題」参照）。 |
| **L2** | L1 + 呼び出しサイトごとの`return_override`ディレクティブ — 呼び出しサイトで`JSON.parse(s, symbolize_names: true) -> Json[Symbol]`と`Json[String]`を判別する。 | 1つのディレクティブ。`return_override`は`App[F, A]`キャリアから独立しており、HKTレジストリなしで出荷可能。ADR-18の基板修正と同じ形をユーザーRBSに昇格したもの（WD6）。 |
| **L3** | L1 + L2 + URIレジストリ + `App[F, A]`キャリア + 条件型ボディ。 | ADR-20機構の全体（HktRegistry、HktReducer、HktBody、燃料予算、3層マージ）。アンロックするもの: （a）クロスプラグインの型コンストラクタ拡張性、（b）型レベル条件計算（rigor-lisp-evalの`eval`）、（c）`Result[T, E]` / `Maybe[T]`のための複数引数HKT。 |

Pythonの型システムは**意図的にL1で止まる**: `json.loads`は`-> Any`と型付けされ、ユーザー著作の`Json[K]`エイリアスは呼び出し元が再`cast`する便宜のためにある。TypeScript / fp-tsは`URItoKind<A>`への宣言マージ + 組み込み条件型を通じて**L3**まで登る。

ADR-20の重要性 — そしてL1+L2を先に着地させてL3を需要にゲートするのではなく初日からL3を出荷することの正当性 — は、**L1+L2では到達できない2つの第2レベル精度ターゲット**にかかっている:

1. **条件型評価**。rigor-lisp-evalデモの`eval`は「リテラルASTの形`E`が結果型を決定する」をエンコードするために`App[lisp_type, E]`を必要とする。これを表現するL1形はない;条件型ボディ（D3）が必要であり、開いたレジストリがそれらの自然な居場所。
2. **開いた型コンストラクタレジストリ**。`rigor-dry-monads`が`Result[T, E]`と`Maybe[T]`を名前付きコンストラクタとして出荷すれば、下流コードは*任意の*そうしたキャリアを抽象化したくなる（単一の`traverse`シグネチャ、ジェネリックな`Functor<F>`形のライブラリ）。L1の再帰エイリアスは閉じている;脱関数化されたタグ + URIレジストリこそが「アナライザを再コンパイルすることなく、将来の任意のプラグインが新しいコンストラクタを登録し、汎用コンビネータが適用される」ことを許す。

JSON.parse形の再帰直和を**オプションごとの判別なしで**必要とするだけの消費者にはL1のみで十分 — そして今日すでに`type json::value[K] = …`経由で動作する。著作ガイダンスへの含意は: **L1から始め、単一のオプションが判別を必要としたらL2に登り、型レベル計算やクロスプラグイン拡張性が実際に関与するときにのみL3レジストリに手を伸ばす**。スライス5（WD5に従う再帰`type`エイリアス経由の糖衣構文）は、L3と並行してL1を人間工学的にするパス;入口ではなくフォローアップなのは意図的で、上記の第2レベル精度ターゲットがL3を必要とし、JSON.parseのショーケースが初日からL2の`return_override`を必要としたからである。

ADR-20はしたがって**L1を内側の層として内包する**（スライス5がそれを直接公開する）のであって、置き換えるのではない: 包含は精度において単調であり、代替パスではない。`App[...]`や`%a{rigor:v1:hkt_*}`ディレクティブに決して手を伸ばさないライブラリ作者も再帰`type`エイリアスから恩恵を受け続けるし、Rigorのバンドル済みJSON_VALUE定義もスライス5の糖衣構文パーサが整い次第、単一の再帰エイリアスとして表現可能なままになる。

### Rigorがすでに持つ近いもの

Rigor拡張カタログはすでに「ライブラリシグネチャ向けにMAYサポート」として次を列挙している:

> [`docs/type-specification/rigor-extensions.md`](../../type-specification/rigor-extensions/)
> の行22 + 23 + §「拡張が型システムの残りとどう相互作用するか」
>
> - **条件型** — ライブラリシグネチャに必要なときに型レベルの分岐をモデル化。RBS消去: 保守的なユニオンまたは境界。
> - **インデックスアクセス型** — メンバー、タプル、レコード、または形状コンポーネント型を射影。RBS消去: 表現可能な場合は射影されたRBS型、そうでなければ保守的な基底。

これら2つの行は軽量HKTが上に構築される基底の機構である: 脱関数化されたタグルックアップはインデックスアクセス;タグごとの具体的インスタンス化は条件型ボディ。ADR-20はそれらの行を規範的に固定し、`App[F, A]`キャリアを追加し、著作サーフェスを標準化する。

プラグイン側はすでに[ADR-13の`Plugin::TypeNodeResolver`](../13-typenode-resolver-plugin/)を持つ — プラグインがアノテーションペイロード型名をRigor型に翻訳するチェーン。ADR-20のレジストリはそのチェーンに自然に座る。

## ゴール

1. **`JSON.parse`の`untyped`スロットをRigorのナローイングが動作できる再帰的でオプション判別する戻り型に置き換える**。
2. **単一の宣言的な著作サーフェスを提供する**、型コンストラクタタグの登録とそれらに対する型レベル関数の記述のためのRBS-extendedアノテーションで。
3. **素のRBSと後方互換である**。軽量HKT形は健全なRBS式に消去されなければならない（[ADR-1](../1-types/)）。
4. **既存の条件 / インデックスアクセス行を再利用する**、`rigor-extensions.md`の中で、別個の評価システムを導入するのではなく。
5. **ライブラリ作者とプラグイン作者の両方をサポートする**。ライブラリ作者は出荷された`.rbs`のアノテーション経由でタグを登録する;プラグイン作者は`Plugin::TypeNodeResolver`チェーン（[ADR-13](../13-typenode-resolver-plugin/)）経由でタグを登録する。
6. **`rigor-lisp-eval`デモの`untyped`境界を削除可能にする**、機構が十分表現力豊かであることを最初のクロスカット検証として。

## 非ゴール

- **本物のHKT**。ユーザーサーフェスでの型コンストラクタの量化なし。軽量HKTは脱関数化エンコーディングであり、カインドシステムではない。
- **higher-rank多相性**。[型理論付録](../../handbook/appendix-type-theory/) §「Rigorがモデル化しないこと」に従い、System F⊤はスコープ外のまま。
- **SMT駆動のリファインメント（refinement、篩型とも）評価**。ここでの型レベル計算は決定可能な構造的パターンマッチであり、Liquid Typesスタイルの述語ソルビングではない。
- **新しい「.rbsx」ファイル形式**。すべての著作は既存の`.rbs`ファイル内の`%a{rigor:v1:…}`アノテーション内で行われる（ADR-0境界）。
- **Rubyコードからの新しいHKT登録の推論**。プラグインが登録に貢献する;アナライザがタグを発明することは決してない。
- **自動モノモーフィゼーション**。軽量HKT型が呼び出しサイトで解決できないとき、それは合成モノモーフィックコピーではなく、宣言された境界（典型的には`Dynamic[Top]`）に消去される。

## 決定（提案された形）

### D1 — `App[F, A]`キャリア

新しい内部Rigorキャリア`Type::App`は、脱関数化された型コンストラクタタグ`F`の引数リスト`A`への抽象的な適用を表す:

- `F`は**URI**である — 型コンストラクタを一意に識別するシンボル。URIはプラグイン間の衝突を防ぐため`<author>::<name>`として名前空間化される（例: `:json::value`、`:dry_monads::result`、`:rigor_lisp_eval::lisp_type`）。
- `A`は引数リスト（空かもしれない、fp-tsの`Kind2` / `Kind3`の先例に従い複数引数かもしれない）。

`App`は**不透明**である、（a）URIの登録がアナライザに既知で簡約が成功するまで、その場合`App`は登録された具体型に展開する;または（b）URIが未知または簡約がブロックされるとき、その場合`App`は宣言された境界に消去する。

### D2 — タグ登録

ライブラリまたはプラグインは出荷された`.rbs`のトップレベルアノテーションでタグを登録する:

```ruby
%a{rigor:v1:hkt_register:
  uri: json::value
  arity: 1
  variance: [out]
  bound: untyped       # App[json::value, K]が未解決のとき消去先
}

%a{rigor:v1:hkt_define:
  uri: json::value
  body: |
    nil
    | bool
    | Integer
    | Float
    | String
    | Array[App[json::value, K]]
    | Hash[K, App[json::value, K]]
  params: [K]
}
```

コンパクトな糖衣構文での同じ登録（提案;最終構文はオープン質問OQ4でTBD）:

```ruby
type json::value[K] =
    nil | bool | Integer | Float | String
  | Array[json::value[K]]
  | Hash[K, json::value[K]]
```

— アナライザがRHSで自身を名指す再帰的`type`エイリアスをタグの暗黙的登録として認識することで。これは*糖衣構文*パス;明示的な`%a{rigor:v1:hkt_register}` / `%a{rigor:v1:hkt_define}`ペイロードが正準形のまま。

### D3 — 条件型による型レベル関数

型レベル関数は[`rigor-extensions.md`](../../type-specification/rigor-extensions/)行22にすでに列挙された条件型形で書かれる。ボディ文法:

```text
<type_fn_body> ::= <conditional_chain>

<conditional_chain> ::=
    <type_expr>
  | "(" <test> "?" <type_expr> ":" <conditional_chain> ")"

<test> ::=
    <type_expr> "<:" <type_expr>
  | <type_expr> "==" <type_expr>
  | <type_expr> "in" "[" <type_expr_list> "]"
```

`lisp-eval`デモの既存の型関数スケッチは、この文法内にそのまま住む:

```ruby
%a{rigor:v1:hkt_define:
  uri: rigor_lisp_eval::lisp_type
  params: [E]
  body: |
      (E <: Integer ? Integer
    : (E <: Float    ? Float
    : (E <: bool     ? bool
    : (E <: [(:+ | :- | :* | :/), A, B]      ? numeric_join[lisp_type[A], lisp_type[B]]
    : (E <: [(:< | :> | :<= | :>= | :==), _, _] ? bool
    : (E <: [(:and | :or | :not), *_]           ? bool
    : (E <: [:if, _, A, B]                      ? (lisp_type[A] | lisp_type[B])
    : untyped))))))
}

def self.eval: [E] (E expr) -> App[rigor_lisp_eval::lisp_type, E]
```

### D4 — 評価ルール

`App[F, A]`の簡約は次のように進行する:

1. **`F`を解決**。アナライザのHKTレジストリ経由で登録されたボディをルックアップする;不在の場合、D5（消去）にフォールスルー。
2. **引数を代入**。形式パラメータを`A`で置き換える。
3. **条件テストを評価**。各`<test>`に対し、標準のサブタイピング（subtyping） / 構造的チェック経由で決定する。テストが`maybe`（決定できない）のとき、囲む`?:`アームは両方の枝のユニオンに広げられる。
4. **入れ子の`App`に再帰**。簡約は構造的;再帰深さは[`inference-budgets.md`](../../type-specification/inference-budgets/)に追加された**HKT-eval予算**で制限される。
5. **キャッシュ**。簡約は参照透過;`(F, normalised(A))`ごとにアナライザパスごとにメモ化する。

### D5 — RBSへの消去

`App[F, A]`が簡約できない（未知のURI、予算枯渇、解決不可能な条件テスト）とき、次に消去される:

- `%a{rigor:v1:hkt_register}`時に宣言された`bound:`値、デフォルトは`untyped`。
- JSON.parseケースの場合: 登録が解決されるまで`untyped`（現状）、解決された後は境界が簡約された`json::value`再帰型エイリアスになる。

`Type#erase_to_rbs`はこの境界を通じて`App[F, A]`をラウンドトリップしなければならない。ラウンドトリップは生成されたRBS出力で`App[...]`を決して生成しない（ADR-1に従う）。

### D6 — 著作サーフェスはRBS-extendedにのみ存在する

[ADR-0](../0-concept/)に従い、軽量HKTアノテーションは`.rbs`ファイル内にのみ現れなければならず、`.rb`ファイルには決して現れない。ディレクティブは:

- `%a{rigor:v1:hkt_register: …}` — URIのarity、分散、消去境界を登録する。
- `%a{rigor:v1:hkt_define: …}` — URIを型関数ボディにバインドする。

両方のディレクティブはクラス/モジュールスコープでトップレベル、既存の`RBS::Extended`アノテーションパイプラインによってパースされる。[`rigor-extensions.md`](../../type-specification/rigor-extensions/)カタログがこれらのディレクティブを固定する2つの新しい行を追加する。

### D7 — `Plugin::TypeNodeResolver`経由のプラグイン側登録

（出荷された`.rbs`からではなく）RubyコードからHKTタグを登録したいプラグインは、既存の[`Plugin::TypeNodeResolver`](../13-typenode-resolver-plugin/)チェーンを新しいリゾルバ種別で拡張する:

```ruby
class MyPlugin
  def manifest
    {
      type_node_resolvers: [
        { uri: :"my_plugin::container", arity: 1, ... },
      ],
      hkt_definitions: [
        { uri: :"my_plugin::container", body: ->(env, args) { ... } },
      ],
    }
  end
end
```

ボディコールバックはアナライザの環境とすでに簡約された引数型を受け取る;`Type`値を返す。これは、条件 / インデックスアクセス式として綴れないボディを持つ型レベル関数のための**エスケープハッチ** — 一部の統合に必要だが、宣言的形が動作する場所では推奨されない。

### D8 — JSON.parse特に

最初の具体的な見返り。Rigorはstdlibの`JSON`モジュール用の*コアオーバーレイ*を出荷する（今日`core_ext`スタイルのオーバーレイが動作するのと同様;[ADR-17](../17-monkey-patch-pre-evaluation/)参照）:

```ruby
# sig/rigor-core/json-overlay.rbs（Rigorバンドル、上流のrbs gemを変更しない）
module JSON
  %a{rigor:v1:hkt_register:
    uri: json::value
    arity: 1
    variance: [out]
    bound: untyped
  }

  %a{rigor:v1:hkt_define:
    uri: json::value
    params: [K]
    body: |
      nil | bool | Integer | Float | String
      | Array[App[json::value, K]]
      | Hash[K, App[json::value, K]]
  }

  %a{rigor:v1:return_override:
    when: { symbolize_names: true }
    type: App[json::value, Symbol]
  }
  def self?.parse: (string source, ?options opts) -> App[json::value, String]
  def self?.parse!: (string source, ?options opts) -> App[json::value, String]
end
```

`return_override`ディレクティブ（[`rbs-extended.md`](../../type-specification/rbs-extended/)へのADR-20修正）は、オーバーロードセットを爆発させずに単一の宣言済みシグネチャがオプションごとの判別を運べるようにする。判別オプションが不在のときは宣言済み基底戻り値が勝つ。

## 作業上の決定

- **WD1.** URIは`:<author>::<name>`形の名前空間化されたシンボル。アナライザはURIが`::`を含まないHKT登録を拒否する。理由: プラグイン間の衝突回避。
- **WD2.**デフォルト消去境界は`Top`ではなく`untyped`。理由: `untyped`は既存のRBS認識ツール（Steep、ruby LSP）がすでに優雅に処理する;`Top`は`Dynamic[Top]`を下流全体に表面化させ、同じ`.rbs`の非Rigor消費者の体験を低下させる。
- **WD3.** HKT-eval予算はデフォルトで**呼び出しサイト評価あたり64簡約ステップ**。枯渇は境界に消去し、`info`深刻度の診断`hkt.budget-exhausted`を発する。理由: 構造的再帰チェックを強制せずに終了を境界する;64はlisp-evalデモの1レベルの再帰を持つ7アームの条件に対して十分寛大。
- **WD4.** `%a{rigor:v1:hkt_register}`の分散注釈はサブタイピング時に尊重される: `App[F, Sub] <: App[F, Sup]`は`F`がその引数で`out`-variantに登録されている*かつ*`Sub <: Sup`のとき。デフォルトは`inv`（不変）、RBSジェネリクスに一致。
- **WD5.**再帰的`type`エイリアス経由の糖衣構文（D2の2番目のブロック）は*aspirational*;v1は明示的な`%a{…}`形のみを出荷する。糖衣構文はユーザーフィードバックにゲートされたフォローアップスライス。
- **WD6.** JSON.parseが使う`return_override`ディレクティブは一般化されている — ADR-20ではなく`rbs-extended.md`に住む。これは基板用のADR-18の呼び出しサイトごとの戻り型修正がすでに確立した同じ機構を、ユーザーRBSに昇格したもの。
- **WD7.**軽量HKTは既存の[3値の確実性](../../type-specification/relations-and-certainty/)と統合する: 条件ボディ内の解決不可能なサブタイピングテストは両方の枝のジョインに広がる、*確実性 = `maybe`*。堅牢性原則（[ADR-5](../5-robustness-principle/)）が呼び出しサイトでジョインのどちら側が「勝つ」かを支配する。

## 実装スライス分け

すべてのスライスは、v0.1.x安定化中`dependencies.lightweight_hkt: true`オプトインの背後で出荷される;最初のv0.2.xリリースまでにデフォルトで`true`になる。

### スライス1 — キャリア + パーサーのみ

- 簡約ロジックなしの`Type::App[uri, args]`キャリアを追加。
- `%a{rigor:v1:hkt_register}` / `%a{rigor:v1:hkt_define}`アノテーションをインプロセスレジストリにパース。
- `erase_to_rbs`を通じたラウンドトリップは宣言された境界を返す。
- **呼び出しサイト変更なし**。no-op型関数を宣言する手書きの`.rbs`に対する`bundle exec rigor type-of`で実証可能。

### スライス2 — レジストリ上の条件評価器

- rigor-extensions.mdにすでにドラフトされた条件 / インデックスアクセス形の上に簡約（D4）を実装。
- HKT-eval予算が強制される。
- キャッシュメモ化が既存の推論キャッシュにフックされる。
- **最初のユーザー可視の勝利**: rigor-lisp-evalデモのシグネチャが`(untyped) -> untyped`を`App[lisp_type, E]`に置き換え、`examples/rigor-lisp-eval/demo/spec/`下の統合specが「診断発行」から「推論された戻り型」にアップグレード。

### スライス3 — JSON.parseオーバーレイ

- § 決定D8の登録を持つ`sig/rigor-core/json-overlay.rbs`を出荷。
- 基板テンプレート用のADR-18修正経由でまだ出荷されていない場合、`rbs-extended.md`に`return_override`サポートを追加。
- バンドルされたJSON RBSディスパッチパスを更新、`JSON.parse(str)`が`App[json::value, String]`に解決され、ナローイング時に再帰的直和に簡約されるように。
- **統合spec**: `JSON.parse(...).fetch("key").upcase`を呼び出す下流メソッドボディが、成功裏にナローイングするか、精密な`call.method-not-found`診断を表面化するか（`Dynamic[Top]`サイレンシングなし）をアサート。

### スライス4 — `rigor-dry-monads`キャリア

- 2つのURI登録経由で`Result[T, E]`と`Maybe[T]`を追加。
- 2引数HKT登録が動作することを検証（fp-tsの`Kind2`をミラー）。
- [ADR-12](../12-dry-rb-packaging/)下にキューされたdry-monadsアダプタープラグインのブロックを解除。

### スライス5 — 糖衣構文（再帰的`type`エイリアス）

- WD5に従ったオプションの糖衣構文。
- 明示的`%a{…}`形が一般的なケースに対して冗長すぎるというユーザーサーベイのフィードバックにゲート。

### スライス6 — プラグイン側のリゾルバフックアップ

- `Plugin::TypeNodeResolver`（ADR-13）をD7に記述された`hkt_definitions:`マニフェストエントリで拡張。
- 需要駆動;プラグインがそれを必要とするときのみ出荷（最初の消費者として最も可能性が高い: スキーマ駆動クエリ結果型のための`rigor-graphql`）。

## 既存ADRとの境界

- **[ADR-0](../0-concept/)** — すべての軽量HKT著作は`.rbs`アノテーションに留まる。`.rb`ファイルはRigor専用構文がないままにとどまる。
- **[ADR-1](../1-types/)** — すべての`App[F, A]`キャリアは登録された`bound:`経由のRBS消去を持たなければならない。ラウンドトリップは精度損失許容。
- **[ADR-2](../2-extension-api/)** — プラグインマニフェストはオプションの`hkt_definitions:`エントリ（スライス6）を獲得する;契約は既存の`type_node_resolvers:`エントリと前方互換。
- **[ADR-5](../5-robustness-principle/)** — 型関数評価が`maybe`のとき、堅牢性原則が位置ごとにジョインのどちら側が勝つかを選ぶ（負 = 寛容、正 = 厳密）。
- **[ADR-6](../6-cache-persistence-backend/)** — HKT簡約はキャッシュキーの入力;タグごとのレジストリ変更は関連スライスを無効化する。
- **[ADR-13](../13-typenode-resolver-plugin/)** — `App[F, A]`は、URIが登録されたHKTタグに一致する`Plugin::TypeNodeResolver`の自然な出力型。リゾルバチェーンが配線層。
- **[ADR-14](../14-rbs-sig-generation/)** — `rigor sig-gen`は`App[F, A]`または`%a{rigor:v1:hkt_*}`アノテーションを決して発行しない。HKT著作は人間が書いたまま。
- **[ADR-15](../15-ractor-concurrency/)** — HKTレジストリは`Environment`ごと;Ractor移行下で凍結されたreflectionファサードに住む。
- **[ADR-17](../17-monkey-patch-pre-evaluation/)** — `pre_eval:`は無関係;HKTはシグネチャ側機構であり、Rubyソーススキャンではない。
- **[ADR-18](../18-substrate-per-call-site-return-type/)** — このADRがJSON.parseに使う`return_override`機構は、ADR-18の呼び出しサイトごと基板修正のユーザーRBSレベルの一般化。

## 検討された代替案

| 代替案 | 拒否理由 |
| --- | --- |
| **RBSでの完全なHKT** | RBSへのカインドシステム拡張（Rigorの権限外）か、ADR-1のスーパーセット姿勢を破るRigor専用RBS方言のいずれかを必要とする。 |
| **呼び出しサイトでのインラインキャスト（`JSON.parse(s) as MySchema`）** | 作業をすべてのユーザーに押し付け、再帰的直和を推論する目的を打ち消す。最も近い現在の同等物は`rigor-sorbet`の`T.cast`、それを好むユーザーには引き続き利用可能。 |
| **素のRBSでの列挙されたオーバーロード** | 1つのboolオプションを持つ`JSON.parse`に対しては動作、オプション数 × 判別される値の数で線形にスケール。再帰を持つLisp-evalデモの7アーム条件は表現不能。 |
| **Python PEP 695スタイルの再帰`type`エイリアスのみ（L1キャップ）** | RBSはすでに再帰`type`エイリアスを受け入れるので、JSON.parseの再帰直和フロア（`type json::value[K] = nil | ... | Hash[K, json::value[K]]`）は新しい機構ゼロで今日出荷される — Pythonの`type Json[K] = ...`（PEP 695）やTypeScriptの前方参照を持つ再帰エイリアスと直接同等。次に対しては不十分: （a）呼び出しサイトごとのオプション判別（`symbolize_names: true` ↔ `K = Symbol` — Pythonはこれに`-> Any`で答える）、（b）型レベル条件評価（rigor-lisp-evalの`eval`がリテラルAST `E`上で）、（c）プラグイン登録の開いた型コンストラクタ（fp-tsの`URItoKind`ユースケース、`rigor-dry-monads`の`Result` / `Maybe`と将来の`Functor<F>`形のライブラリが必要とする）。ADR-20はこの層をその設計空間内のL1として*内包*し（スライス5 / WD5がそれの糖衣構文を出荷）、L2の`return_override`とL3の`App[F, A]`レジストリへ上方に拡張する;L1のみにキャップすると下流の精度がPythonの天井にロックされ、（a）〜（c）を放棄することになる。§「階層化された設計空間: L1 / L2 / L3」を参照。 |
| **プラグインのみの`FlowContribution`** | 現在のrigor-lisp-evalアプローチ。プラグインごとには動作するが、ライブラリ著作のシグネチャに一般化しない;すべてのライブラリがプラグインを必要とする。ADR-20の著作サーフェスがこれを修正する。 |
| **Liquid Types / SMT駆動リファインメントの実装** | § 非ゴールに従いスコープ外;SMT依存、一般に決定不可能、既存の確実性モデルと合成しない。 |
| **fp-tsの`URItoKind`形をそのまま採用** | TypeScriptの宣言マージにはRBSの類似がない。`%a{rigor:v1:hkt_register}`アノテーションが道徳的同等物 — 明示的、言語拡張不要。 |

## オープン質問

- **OQ1.** URIはシンボル（`:json::value`）またはRBS型名のような文字列（`"JSON::Value"`）のどちらを使うべきか？ シンボルはRubyイディオム的;文字列はRBSイディオム的。暫定: シンボル。スライス1プロトタイプ中に再検討。
- **OQ2.** HKT-eval予算は呼び出しサイトごと（WD3デフォルト）または`Analysis::Runner`パスごとのどちらか？ 呼び出しサイトごとはより単純;パスごとはグローバル爆発ケースを捕える。暫定: 診断用の別個のグローバルカウンタを持つ呼び出しサイトごと。
- **OQ3.** 2つのプラグインが同じURIを登録するとき何が勝つか？ 暫定: `:warning`にデフォルトする`dependencies.warn_hkt_uri_clash`フラグでlast-wins。スライス6中に再検討。
- **OQ4.**糖衣構文: どの形を出荷するか？ 3つの候補: （a）再帰的`type`エイリアス（D2 2番目のブロック）;(b) Sorbetの`T.type_alias`風;（c）明示的な`%a{…}`ペイロードのみを残す。暫定: スライス1〜3は（c）、フィードバックが要求すればスライス5で（a）。
- **OQ5.** `App[F, A]`は診断出力で`App[F, A]`（忠実）、`F<A>`（TS風）、または`F[A]`（RBS風）のどれとして表示すべきか？ 暫定: `F[A]` — RBSサーフェスに一致。
- **OQ6.** HKTは`Dynamic[T]`代数とどう相互作用するか？`A`が`Dynamic[T]`のとき、簡約は`Dynamic[App[F, T]]`または`App[F, Dynamic[T]]`を生成するか？ 暫定: 前者（Dynamicが外側に残る）、value-lattice.mdの代数に一致。スライス2中に検証。
- **OQ7.** `Environment`リロード（LSPサーバー、watchモード）をまたいだ登録済みURIの寿命は何か？ 暫定: `Environment`ごと;リロードがレジストリを再読する。ADR-15境界ノートとコーディネート。
- **OQ8.** `rigor type-of`は簡約されたHKTキャリアの新しい表示モード（簡約チェーンを表示する）を必要とするか？ 暫定: ユーザーフィードバックが望むなら`--explain-hkt`フラグを追加。

## 関連ADR

- [ADR-0](../0-concept/)、[ADR-1](../1-types/)、
  [ADR-2](../2-extension-api/)、[ADR-5](../5-robustness-principle/)、
  [ADR-13](../13-typenode-resolver-plugin/)、
  [ADR-14](../14-rbs-sig-generation/)、[ADR-15](../15-ractor-concurrency/)、
  [ADR-18](../18-substrate-per-call-site-return-type/) — § 既存ADRとの境界を参照。

## 背景となる研究ノート

- Yallop, J. & White, L. "Lightweight Higher-Kinded Polymorphism." *FLOPS 2014*。元の脱関数化タグ + インデックス射影エンコーディング。このADRが提案する`App[F, A]`形のソース。<https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf>
- gcanti, *fp-ts* `src/HKT.ts`。`URItoKind<A>`での宣言マージを使ったYallop-WhiteのTypeScript適応。URIレジストリ / `Kind<URI, A>`形のソース。TypeScriptの`interface URItoKind<A> {}`オープンレジストリはRigorの`%a{rigor:v1:hkt_register: …}`アノテーションサーフェスに1対1で対応。
  <https://github.com/gcanti/fp-ts/blob/master/src/HKT.ts>
- [`docs/notes/20260518-matsumoto-2008-poly-records-rigor-review.md`](../../notes/20260518-matsumoto-2008-poly-records-rigor-review/)
  — 松本＆南出2008は、多相メソッド型の欠如が、`map`呼び出しチェーンを型付けするときにクラス定義（`Array#0` / `Array#1`）を*手動で展開*することを彼らに強制したと明示的に指摘する。Rigorの軽量HKTは、その展開を機械的にではなく宣言的に行う*シグネチャ作者*の同等物である。

## リビジョン履歴

- 2026-05-18 — 初回提案。ユーザーの要求が発端、[ROADMAP](../../roadmap/) § 将来のサイクル（「DSLシグネチャでの軽量HKT（高階型）」）にキューされた軽量HKT方向の設計を開始する、`JSON.parse`の`untyped`スロットを置き換えるという具体的な目標で。スコープはユーザーが選んだ参考文献（Yallop & White 2014論文とfp-tsの`HKT.ts`）で設定された。
- 2026-05-18 — **スライス1着地**。キャリア + レジストリ + パーサー。56のspec例。まだ簡約なし。
- 2026-05-18 — **スライス2a着地**。HktBodyノード型 + 遅延自己再帰 + 燃料予算を持つHktReducer。33の新しいspec例（HKT spec合計: 89）。
- 2026-05-18 — **スライス2c + 2d + 3着地 + ステータスがacceptedに昇格**。Environment#hkt_registry;%a{rigor:v1:return:}内のApp[uri, args]構文;METHOD_RETURN_OVERRIDESテーブル + ディスパッチャ層。エンドツーエンドのJSON.parse目標達成（`rigor type-of`で検証済み）。9の新しい統合specケース（HKT spec合計: 98）。
- 2026-05-18 — **スライス3フォローアップ着地**。`:json_symbolize_names`判別子が呼び出しがリテラルsymbolize_names: trueを運ぶときK = StringをK = Symbolに差し替える。3つの新しいspecケース（HKT spec合計: 101）。
- 2026-05-18 — **スライス2b着地**。最小実行可能文法（union + アトム + nominal_app + app_ref + param）を持つボディ文字列文法パーサー。HktDirectives.parse_defineは今、ボディ文字列から自動的にbody_treeを埋める。33の新しいspecケース（HKT spec合計: 134）。
- 2026-05-18 — **METHOD_RETURN_OVERRIDES拡張**、YAML.safe_load / YAML.safe_load_file / Psych.safe_load / Psych.safe_load_fileへ（JSON_VALUE_SPECを再利用）。4の新しいディスパッチケース（HKT spec合計: 138）。
- 2026-05-18 — **HktDirectives kv-formリファクター**（バグ修正）。JSON-flowペイロードはRBSアノテーション文法と非互換;空白区切り`key=value`形式でbody=が末尾まで飲み込むようリファクター。22のディレクティブspec + 2のディレクティブ統合specが書き直された（HKT spec合計は変わらず138）。
- 2026-05-18 — **スライス2e着地**。RbsLoader#each_class_decl_annotation + HktRegistry.scan_rbs_loader + Environment.for_project配線がユーザー著作ループをクローズする。ユーザー.rbsオーバーレイが今、env.hkt_registryに表面化する。4の新しい統合ケース（HKT spec合計: 142）。
- 2026-05-19 — **L1 / L2 / L3階層フレーミングでコンテキストを拡張**。新しい §「階層化された設計空間」サブセクションが3階層を明示的に命名（L1 = Python PEP 695 / RBSネイティブ風のパラメトリック再帰`type`エイリアス;L2 = + `return_override`ディレクティブ;L3 = HKT機構の全体）し、L1+L2では到達できない2つの第2レベル精度ターゲット（条件型評価、開いた型コンストラクタレジストリ）に対してADR-20が初日からL3を選択することを正当化する。著作ガイダンス: L1から始め、単一オプションの判別のためにL2に登り、型レベル計算やクロスプラグイン拡張性が関与するときのみL3に手を伸ばす。新しい代替案行が「Python PEP 695スタイルの再帰`type`エイリアスのみ（L1キャップ）」を拒否されたバリアントとして固定 — ADR-20はこの層を内側の層として内包するのであって、置き換えるのではない。
