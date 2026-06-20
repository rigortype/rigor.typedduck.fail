---
title: "マクロ／DSL展開基板"
description: "rigortype/rigor docs/internal-spec/macro-substrate.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/macro-substrate.md"
sourcePath: "docs/internal-spec/macro-substrate.md"
sourceSha: "59f109d8af5f5b9b94c86fa4a78d2c33fdc24d800e9c8e108e7805d7b9bc65ce"
sourceCommit: "212f2c491920cc5c39a12d75aee385cb6c51fa0c"
translationStatus: "translated"
sidebar:
  order: 3050
---

**マクロサーフェス**（macro substrate、マクロ基盤）は、メタプログラミング
ライブラリが利用者に公開する呼び出し形状をRigorに教えるために、プラグイン
作者が宣言するプラグインマニフェストの値オブジェクト群である。エンジンが
ソースを読むだけでは見えない`define_method` / `class_eval` / `const_missing`
パターンを指す。これは[ADR-16](../../adr/16-macro-expansion/)（4ティア）で
導入され、[ADR-18](../../adr/18-substrate-per-call-site-return-type/)（呼び出し
箇所ごとの戻り値型）と
[ADR-36](../../adr/36-mangrove-enum-nested-class-emission/)（ネストクラスの
発行）で拡張された。

本ドキュメントは**プラグイン作者向けの値オブジェクト形状**を規定する。
すなわち、フィールド、その型、検証、そして各エントリーが満たす同一性／
不変性の契約（contract）である。これらの形状は、プラグインgemが基づいて
記述される永続的な契約である。エンジン側での消費 ── ディスパッチャーの
合成メソッドティアと`Environment#synthetic_method_index` ──
は[`inference-engine.md`](../inference-engine/)が規範的に定める
（ディスパッチャーのティア順序＋`Environment`のクエリサーフェス）。
floor/ceiling配信ポリシーとティアごとの根拠はADRにある。

4つのクラスはすべて`Rigor::Plugin::Macro`名前空間
（`lib/rigor/plugin/macro/`）の下にあり、[`plugin.md`](../plugin/#rigorpluginmanifest)
で文書化された対応する`Manifest`スロットを通じて宣言される。
`block_as_methods:`、`heredoc_templates:`、`trait_registries:`、
`nested_class_templates:`。（ティアDの`ExternalFile`値オブジェクトとその
`external_files:`スロットは
[ADR-60 WD1](../../adr/60-pre-freeze-plugin-contract-consolidation/)で
削除された ── このフィールドにはエンジンコンシューマーがなく、スキャナと
ともに需要を条件として復帰する。）

## 共通の値オブジェクト契約

すべてのマクロ値オブジェクトは、同じ同一性および不変性の規則をMUST満たす
（残りのプラグイン契約キャリア（carrier）と一貫している）。

- **構築時にフリーズ**。すべてのフィールドは`#initialize`内でdup-freeze
  され、インスタンス自体もフリーズされる。構築後`Ractor.shareable?`は
  trueをMUST返す（ADR-15 Phase 1）。これにより、実体化されたプラグインは
  fork/Ractor境界を越えてサーフェス宣言を運ぶ。
- **構築時に検証**。各フィールドは`#initialize`内でチェックされる。
  不正な宣言は、スキャン時に黙って失敗するのではなく、マニフェスト
  ビルド時（ロード時）に`ArgumentError`をMUST送出する。`Manifest`
  スロットは、すべてのエントリーが期待されるクラスのインスタンスであることを
  再検証する。
- **値による同一性**。`#==` / `#eql?` / `#hash`はフィールド値によって
  比較する（ほとんどは正準的な`#to_h`を介する）ため、構造的に等しい2つの
  宣言は交換可能である。
- **`#to_h`はキャッシュキーへとラウンドトリップする**。すべてのクラスは
  文字列キーの`#to_h`を公開する。マニフェストはそれを`Manifest#to_h`に
  畳み込み、これはキャッシュキーとして安定している。プラグイン作者は、
  エンジン統合が先送りされている場合（後述の_実装状況_を参照）でも、
  今日どのティアでもMAY宣言できる。宣言はラウンドトリップし、対応する
  `Manifest`リーダーで公開され、エンジンスライス（slice）が着地したときに
  前方互換となる。
- **`receiver_constraint`のマッチング**。すべてのティアが
  `receiver_constraint`を運ぶ。呼び出しの字句的レシーバー
  クラスがその完全修飾名と**等しいか、それを継承している**ときにエントリーが
  発火し、`Environment#class_ordering`を通じてマッチされる。

## ティアA ── `BlockAsMethod`（`block_as_methods:`）

「`method_names`のいずれかのクラスレベルDSL呼び出しに渡されたブロックは、
`receiver_constraint`のサブクラスツリー上のインスタンスメソッドとして
実行され、`self`はそれに応じて型付けされる。」正準的なターゲット：
Sinatraの`get '/path' { ... }`（ブロックは文字どおりルートメソッド本体に
なる）。

| フィールド | 型 | 注記 |
| --- | --- | --- |
| `receiver_constraint` | 空でない`String` | 呼び出しの字句的レシーバーがそれであるか、それを継承していなければならないFQクラス名。 |
| `method_names` | 空でない`Array<Symbol>` | ブロックがインスタンスメソッドとして実行されるDSLメソッド名（`Symbol`／空でない`String`から強制変換）。 |
| `self_type` | `Symbol` | ブロック内の`self`バインディングの種類。デフォルトかつ現在唯一の有効な値：`:receiver_instance`。`:receiver_singleton` / `:dsl_recorder`は予約名であり、まだ受理されない。 |

## ティアC ── `HeredocTemplate`（`heredoc_templates:`）

「クラスレベル呼び出し`<receiver_constraint>.<method_name>(name_arg, …)`は、
呼び出し元クラスに合成メソッドを発行し、その名前は`symbol_arg_position`の
ソースで可視なリテラル引数を補間する。」正準的なターゲット：dry-structの
`attribute :name, T`とActiveStorageの`has_one_attached :avatar`。

| フィールド | 型 | 注記 |
| --- | --- | --- |
| `receiver_constraint` | 空でない`String` | FQクラス名（等しいか継承）。 |
| `method_name` | `Symbol` | DSLメソッド（`Symbol`／空でない`String`から）。 |
| `symbol_arg_position` | `Integer >= 0` | デフォルト`0`。各emit行に補間される`name`となる、リテラルSymbol値を持つ引数のインデックス。 |
| `emit` | `Array<Emit>` | 呼び出し元クラスに合成するインスタンスメソッド（`Hash`から強制変換）。 |
| `class_level_emit` | `Array<Emit>` | 同じ形状。合成されるメソッドはシングルトン（クラスレベル）。 |

`NAME_PLACEHOLDER`は、emit行の`name:`テンプレートが補間のために運ぶ
リテラル`"#{name}"`トークンである。

### `HeredocTemplate::Emit`

emitテーブルの1行。

| フィールド | 型 | 注記 |
| --- | --- | --- |
| `name` | 空でない`String` | 合成メソッドの名前テンプレート。`"#{name}"`プレースホルダーは`symbol_arg_position`の呼び出し箇所リテラルシンボルで補間される。 |
| `returns` | 空でない`String`または`nil` | 宣言された戻り値型名。`Environment#nominal_for_name`を介して解決される。`returns`と`returns_from_arg`の両方が`nil`のとき、合成メソッドの戻り値はADR-16 WD13のfloorに従って`Dynamic[top]`にフォールバックする。 |
| `returns_from_arg` | `ReturnsFromArg`または`nil` | 呼び出し箇所ごとの戻り値型（ADR-18）。`Hash`から強制変換される。 |

### `HeredocTemplate::ReturnsFromArg`（ADR-18）

`HeredocTemplate`の下の`Emit`の兄弟クラス（`Emit`の中にネストされて
いない）で、`Emit#returns_from_arg`から参照される。合成メソッドの戻り値型が
**呼び出し箇所の引数のソース表現**から来ることを宣言し、それはプラグイン
横断のファクト（fact）チャネル（[ADR-9](../../adr/9-cross-plugin-api/)の
`FactStore`）で探索される。記述形状：

```ruby
returns_from_arg: { position: 1, lookup_via: { plugin_id: "dry-types", fact: :dry_type_aliases } }
```

| フィールド | 型 | 注記 |
| --- | --- | --- |
| `position` | `Integer >= 0` | ソース表現が探索キーとなる呼び出し箇所の引数インデックス。 |
| `plugin_id` | 空でない`String` | 生成側のプラグイン（`lookup_via:`から）。 |
| `fact` | `Symbol` | そのプラグインの`FactStore`バケットから読むファクト名（`lookup_via:`から）。 |

`.coerce(value)`は`Hash`（`lookup_via:`のHashを要求する）、`ReturnsFromArg`、
または`nil`を受理し、それ以外の形状ではすべて送出する。

## ティアB ── `TraitRegistry`（`trait_registries:`）

「クラスレベル呼び出し`<receiver_constraint>.<method_name>(:trait_a,
:trait_b, …)`は、`modules_by_symbol[:trait_a]` + `[:trait_b]`で名指された
モジュール（および任意の`always_included`モジュール）を、呼び出し元
クラスに実質的にincludeする。」正準的なターゲット：Deviseの`devise
:database_authenticatable, :recoverable`。

| フィールド | 型 | 注記 |
| --- | --- | --- |
| `receiver_constraint` | 空でない`String` | FQクラス名（等しいか継承）。 |
| `method_name` | `Symbol` | DSLメソッド（例：`:devise`）。 |
| `symbol_arg_position` | `:rest`または`Integer >= 0` | `:rest`（デフォルトであり、スキャナが尊重する唯一の形式）はすべての位置Symbol引数をトレイトとして扱う。Integerインデックスは将来の単一トレイト形状のために予約されている。 |
| `modules_by_symbol` | `Hash<Symbol, String>` | 認識された各トレイトシンボルをFQモジュール名にマッピングする。テーブルに存在しないシンボルは素通りする（スキャナは`macro.tier_b.unknown-trait`の`:info`マーカーを発行する）。 |
| `always_included` | `Array<String>` | シンボルが1つもマッチしない場合でも、マッチするすべての呼び出し箇所で追加されるFQモジュール名。 |

`#module_for(symbol)`はトレイトシンボルに対するFQモジュール名を返し、
不明な場合は`nil`を返す。ティアBはティアCの`Dynamic[T]`のfloorの対象では
**ない**。合成されるメソッドは、includeされたモジュールが記述したRBS戻り値型を
再生する（ADR-5のロバストネス ── サーフェスは与えられていない精度を捏造
しない）。

## ネストクラスティア ── `NestedClassTemplate`（`nested_class_templates:`、ADR-36）

ティアCが*メソッド*を合成するのに対し、このティアはenum形状のブロックDSLで
宣言された*ネストされたサブクラス*を合成する。動機となる形状：Mangroveの
`variants do variant Circle, Float end`。ここで各`variant <Const>, <Type>`
行は、`#inner : <Type>`を運ぶネストされたサブクラス`Shape::Circle < Shape`を
鋳造する。

| フィールド | 型 | 注記 |
| --- | --- | --- |
| `receiver_constraint` | 空でない`String` | ブロックが認識されるために、囲んでいるクラスが`extend`しなければならないFQモジュール名（例：`"Mangrove::Enum"`）。 |
| `block_method` | `Symbol` | 囲んでいるDSLブロック。デフォルト`:variants`。 |
| `variant_method` | `Symbol` | ブロック内の各宣言呼び出し。デフォルト`:variant`。 |
| `symbol_arg_position` | `Integer >= 0` | デフォルト`0`。ネストされたサブクラスを名指すリテラル定数を持つ引数のインデックス。 |
| `inner_arg_position` | `Integer >= 0` | デフォルト`1`。型式が`#inner`リーダーの戻り値型となる引数のインデックス。定数型引数は解決される。定数でないinner形状は`Dynamic[top]`に降格する。 |
| `inner_reader` | `Symbol` | 各バリアントサブクラスに合成されるペイロードリーダー。デフォルト`:inner`。 |

`sealed`-親ファクト＋`is_a?`バリアント横断の網羅的ナローイング
（ADR-36 WD3）は、先送りされたceilingである。

## 実装状況

| ティア | クラス | マニフェストスロット | エンジン状況 |
| --- | --- | --- | --- |
| A | `BlockAsMethod` | `block_as_methods:` | 稼働中（実装済みコンシューマー：`rigor-sinatra`）。 |
| B | `TraitRegistry` | `trait_registries:` | 稼働中（実装済みコンシューマー：`rigor-devise`）。 |
| C | `HeredocTemplate`（＋`Emit` / `ReturnsFromArg`） | `heredoc_templates:` | 稼働中（実装済みコンシューマー：`rigor-dry-struct` / `rigor-dry-types`）。`returns_from_arg`の呼び出し箇所ごとの探索はADR-18のレイヤー。 |
| ネストクラス | `NestedClassTemplate` | `nested_class_templates:` | 稼働中、スライスA（実装済みコンシューマー：`rigor-mangrove`）。sealed-親の網羅性は先送り。 |

[ADR-16 WD13](../../adr/16-macro-expansion/)に従い、サーフェスが生成する
出力は**floor**（「サーフェスの影響を受けるコードはクリーンにパースされ、
識別子が解決される」）で提供される。精密な戻り値型の発行はceilingであり、
ティアごとにレイヤー化される（ティアCの`returns:`文字列は
`Environment#nominal_for_name`を介して。より豊かな形式にはADR-13の
`TypeNodeResolver`チェーンを介して）。

## ドリフトピン状況

public-APIドリフト仕様
（[`spec/rigor/public_api_drift_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/rigor/public_api_drift_spec.rb)）は、
`BlockAsMethod`、`HeredocTemplate`、`HeredocTemplate::Emit`、
`HeredocTemplate::ReturnsFromArg`、`TraitRegistry`、
`NestedClassTemplate`のインスタンスメソッド集合をピン留めする ──
**publicマニフェストサーフェス上の出荷済みの値オブジェクトはすべて、いまや
同じ偶発的変更ガードを運ぶ。**かつてピン留めされていなかった2つの
オブジェクト（ADR-36の`NestedClassTemplate`とADR-18の
`HeredocTemplate::ReturnsFromArg`）は、
`PLUGIN_MACRO_NESTED_CLASS_TEMPLATE_INSTANCE`および
`PLUGIN_MACRO_HEREDOC_TEMPLATE_RETURNS_FROM_ARG_INSTANCE`スナップショット
定数を介してピン留めされた。これらのオブジェクトはまだ`sig/rigor/*.rbs`
シグネチャを運ばないため、RBSのsig-driftの対ではなく、ランタイムの
インスタンスメソッドスナップショットのみによってガードされている。
