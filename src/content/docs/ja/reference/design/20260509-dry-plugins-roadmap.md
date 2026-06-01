---
title: "dry-rb Ecosystem Plugins — Survey"
description: "Imported from rigortype/rigor docs/design/20260509-dry-plugins-roadmap.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260509-dry-plugins-roadmap.md"
sourcePath: "docs/design/20260509-dry-plugins-roadmap.md"
sourceSha: "10aed4d2f0b36175ad523758cb877eb3c56cf8e2fb6f5773f290c12f670dbe4e"
sourceCommit: "035915291e331f3bcd5ce804a1e30dc284ffbd48"
translationStatus: "translated"
sidebar:
  order: 20265509
---

ステータス: **research, 2026-05-09**。Rigorプラグインの観点からdry-rb gemファミリーのワンショットサーベイ。gem間の依存関係と各gemが公開する型シェイピングサーフェスをまとめ、後続の設計ドキュメントが単一の`rigor-dry`プラグイン、`rigor-dry-*`ファミリー、または中粒度の分割のいずれを出荷するかを証拠に基づいて決定できるようにする。

調査したコーパスは[`references/hanakai-rb/content/guides/dry/`](../../references/hanakai-rb/)のhanakai-rbガイドツリーで、hanami/dry/rom組織がhanakai-rbに統合された後のdry-rbの権威ある公開ガイド。以下の依存関係エッジはそのコーパス内の散文的な記述から取得した。gemspecの検証とバージョンピンの決定はプラグインごとの作成ステップに延期する。

このドキュメントは参考情報。拘束力のあるプラグイン契約は各プラグインの`README.md`とインテグレーションスペックに存在する。Railsプラグインロードマップの<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>（[`docs/design/20260508-rails-plugins-roadmap.md`](../20260508-rails-plugins-roadmap/)）を踏襲する。

## dry-rbがRigorにとって興味深い理由

dry-rbは慣用的なRubyの中で最も型意識の高いDSLファミリー。3つの特性がRigorに関係する:

1. **明示的な属性型付け**。`dry-struct`/`dry-initializer`/`dry-schema`はプラグインが構文的に辿ることのできる実際のRubyオブジェクト（`Types::String`、`Types::Coercible::Integer`等）を通じて属性ごとの型を宣言する。
2. **構造化された戻り値シェイプ**。`dry-monads`と`dry-operation`はメソッドに既知のモナドエンベロープ（`Result[T, E]`、`Maybe[T]`等）を与え、メソッド境界を越えて生存する — ナローイングへの明確な恩恵。
3. **合成的な基盤**。高レベルなgem（`dry-validation`、`dry-operation`、`dry-rails`）は低レベルなgem（`dry-types`、`dry-schema`、`dry-monads`）を合成する。ボトムアップのプラグイン順序は依存関係エッジに直接マッピングされる。クロスプラグインAPI（[ADR-9](../../adr/9-cross-plugin-api/)）はまさにマルチgemの`rigor-dry-*`ファミリーがファクト共有に消費するものである。

このサーベイは特定のプラグインへの関与の前置。目標は後続のスコーピング決定を証拠に基づかせること。

## 階層化

各gemは静的ファクトの種類によって6つの階層のひとつに分類される。

| 階層 | この階層のプラグインが行うこと | メンバー |
| --- | --- | --- |
| A — 型システム基盤 | 型付き属性/リーダー/強制変換シェイプを宣言 | dry-types, dry-struct, dry-schema, dry-validation, dry-logic, dry-initializer |
| B — 制御フローシェイプ | 戻り型をRigorがナローイングできるモナドエンベロープにラップ | dry-monads, dry-operation, dry-effects |
| C — DI/設定 | コンテナまたはデフォルト値から戻り型が来るリーダー/クラスメソッドを生成 | dry-auto_inject, dry-configurable, dry-system, dry-container |
| D — ユーティリティ | 静的型シェイプへの影響なし | dry-cli, dry-core, dry-events, dry-files, dry-inflector, dry-logger, dry-monitor |
| E — レガシー/置き換え済み | 完全性のためにリスト。置き換えが対応 | dry-equalizer, dry-matcher, dry-transaction, dry-view |
| F — フレームワーク統合 | 階層A-CのgemをRailsに組み込む | dry-rails |

階層Aと階層BがRigorの主要ターゲット。階層CはADR-9がランディングした後に魅力的になるストレッチゴール。階層D/E/Fはスコープ外（D、E）か既存プラグイン上の薄いラッパー（F）のいずれか。

## 階層A — 型システム基盤

### dry-types

**目的**。強制変換、制約、合成コンビネータを持つ拡張可能な値型システム。

**プラグイン関連DSL**。

- `Types = Dry.Types()`は名前付き型のモジュールを開く。
- `Types::String`、`Types::Coercible::Integer`、`Types::Strict::*`はビルド済みキャリアのレジストリに到達する。
- `T.optional`、`T.constrained(gteq: 18)`、`T.constructor { … }`、`T | U`、`T.default(0)`が日常的なコンビネータ。

**プラグインが発行する静的ファクト**。

- 型式はRigorの型キャリアにマッピングされる:
  `Types::String` → `String`、`Types::Coercible::Integer` →
  `Integer`、`T.optional` → `T | nil`、`T | U` → union。
- `T.constrained(gteq: 18)`は静的型を`T`に保ちつつ、ダウンストリームのナローイングが消費できる述語ファクトを追加する — v0.1.1の正規表現→リファインメント認識器が出荷されたらRigorのリファインメント名機構の候補となる。
- カスタム型ビルダー（`.constructor { ... }`）はキャリアをブロックの結果型にシフトする。そこでの精密な推論はv1のスコープ外であり、堅牢性の原則に従って`Dynamic[T]`に劣化できる。

**ドキュメントに記載されたdry-*依存関係**。なし — dry-typesは基盤。

**プラグイン結合**。基盤。dry-struct、dry-schema、dry-validation、dry-initializer、dry-monads（その`Validated`モナド）がすべてダウンストリームに位置する。

### dry-struct

**目的**。型付き属性で定義された不変値オブジェクト。

**プラグイン関連DSL**。

```
class User < Dry::Struct
  attribute :name, Types::String
  attribute :age, Types::Coercible::Integer
  attribute :address do
    attribute :city, Types::String
  end
end
```

**プラグインが発行する静的ファクト**。

- 各`attribute :name, T`はdry-typesプラグインが`T`から解決したキャリアを返すリーダー`#name`を宣言する。
- ブロック形式の属性（`attribute :address do ... end`）はネストした匿名の`Dry::Struct`サブクラスを定義する。プラグインは内部クラスのシェイプとそのクラスを返す外部リーダーの両方を発行する。
- コンストラクタシグネチャは宣言済み属性のユニオンから導出される。
- `transform_keys(&:to_sym)`等は静的属性セットを変更しない。

**ドキュメントに記載されたdry-*依存関係**。dry-typesの上に構築される。

**プラグイン結合**。dry-typesファクトのハードコンシューマー。

### dry-schema

**目的**。ハッシュ形式入力のバリデーションと強制変換。2つのフレーバー: `Schema.Params`（Webフォーム強制変換: 文字列 → 整数/ブール値）、`Schema.JSON`（文字列強制変換なし）。`_index.md`は明示的に「*`dry-schema`は`dry-types`の強制変換型を使用する*」と述べている。

**プラグイン関連DSL**。

```
UserSchema = Dry::Schema.Params do
  required(:name).filled(:string)
  required(:age).value(:integer, gt?: 18)
  required(:tags).array(:string)
  required(:address).hash do
    required(:street).filled(:string)
  end
end
```

**プラグインが発行する静的ファクト**。

- スキーマ定数は型付き入力 → 出力契約にマッピングされる。
- `schema.call(input)`の出力は、`#to_h`/`[]`のキーが宣言に従って型付けされた結果: `:name` → 非空文字列、`:age` → Integer、`:tags` → Array[String]、`:address.street` → 非空文字列。
- 述語サフィックス（`gt?: 18`）はv0.1.1がランディングされたらRigorのリファインメント名カタログ（positive-int等）に供給される。
- Params対JSONの区別が重要: Paramsのみが文字列を強制変換する — プラグインは強制変換型を解決する前にどのビルダーがスキーマを生成したかを記録しなければならない。

**ドキュメントに記載されたdry-*依存関係**。dry-types（強制変換バックエンド）、dry-logic（述語エンジン）。

**プラグイン結合**。dry-typesのハードコンシューマーであり、dry-logicの（軽量な）コンシューマー。

### dry-validation

**目的**。ドメインバリデーション契約: 型付きの`params { ... }`スキーマ（dry-schemaに委譲）にビジネスロジックのruleブロックを加えたもの。

**プラグイン関連DSL**。

```
class NewUserContract < Dry::Validation::Contract
  params do
    required(:email).filled(:string)
    required(:age).value(:integer)
  end

  rule(:email) do
    key.failure('has invalid format') unless EMAIL_RE.match?(value)
  end
end

contract.call(email: 'jane@doe.org', age: '17')
# => Dry::Validation::Result（型付きの:email/:age付き）
```

**プラグインが発行する静的ファクト**。

- `Contract#call`は`Dry::Validation::Result`を返す。`#success?`と`#failure?`が結果をナローイングする。`.to_h`はスキーマ型付きハッシュを公開する。
- `params { ... }`と`json { ... }`ブロックは本質的にdry-schemaのスキーマ — プラグインは内部シェイプのためにdry-schemaプラグインに処理を委ねられる。
- `rule(:email) { ... }`は`:email`の型を変更しない。ビジネスルールのファクトのみを追加する。

**ドキュメントに記載されたdry-*依存関係**。dry-schema（スキーマエンジン）、dry-types（強制変換）。

**プラグイン結合**。dry-schema（トランジティブにdry-types）のハードコンシューマー。

### dry-logic

**目的**。述語合成プリミティブ — `Rule::Predicate`、`&`/`|`コンビネータ、カリー化述語。dry-types（制約）とdry-schema（述語サフィックスDSL）が内部で使用する。

**プラグイン関連DSL**。ユーザーコードで一般的に手書きされない。ライブラリ基盤。

**プラグインが発行する静的ファクト**。ユーザーコードサーフェスではなし。専用の`rigor-dry-logic`プラグインは価値が低い可能性が高い。dry-typesとdry-schemaのプラグインが必要な述語対応ロジックを内部で持てばよい。

**ドキュメントに記載されたdry-*依存関係**。なし。

**プラグイン結合**。dry-typesとdry-schemaに埋め込み。

### dry-initializer

**目的**。`extend Dry::Initializer; param :foo, T; option :bar, T`で継承なしに型付きコンストラクタとアクセサを生成する。

**プラグイン関連DSL**。

```
class User
  extend Dry::Initializer

  param  :name, proc(&:to_s)
  param  :role, default: proc { 'customer' }
  option :admin, default: proc { false }
  option :phone, optional: true
  option :emails, [] do
    option :address, proc(&:to_s)
  end
end
```

**プラグインが発行する静的ファクト**。

- 各`param`/`option`はインスタンスリーダーを生成する。型は型制約引数。
- 3種類のリーダー型ソースを処理する必要がある:
  - `Dry::Types['…']`制約 → dry-typesプラグインに委ねる。
  - `proc(&:to_s)`/類似の強制変換proc → 結果型はメソッドの戻り値（`to_s` → `String`、`to_i` → `Integer`等のビルトインでは既知のことが多い）。
  - 制約なし/`default:`のみ → リーダーはデフォルト式の型を返す。ない場合は`untyped`。
- `optional: true`は`T | nil`に広げる（未セットのリーダーは`Dry::Initializer::UNDEFINED`をデフォルトにするが、ユーザー可視の境界では`nil`がRigorの適切な近似）。
- ネストした`option ... do option ... end`はリーダー自体が型付きの内部匿名struct風クラスを定義する。

**ドキュメントに記載されたdry-*依存関係**。ハードな依存なし。ユーザーがオプトインした場合はdry-typesと互換。

**プラグイン結合**。dry-typesファクトのオプショナルコンシューマー。スタンドアロンの`rigor-dry-initializer`プラグインは`rigor-dry-types`なしでも有用。

## 階層B — 制御フローシェイプ

### dry-monads

**目的**。戻り値のための代数的データ型: `Result`（Success/Failure）、`Maybe`（Some/None）、`Try`（例外捕捉）、`List`、`Task`、`Validated`、`Unit`。バインドチェーンのための`do`記法も含む。

**プラグイン関連DSL**。

```
include Dry::Monads[:result]

def call(input)
  Success(input.upcase)
rescue ArgumentError => e
  Failure(e)
end
```

**プラグインが発行する静的ファクト**。

- `Success(x)`または`Failure(e)`を返すメソッドは、`T`が`Success`引数型のunionで`E`が`Failure`引数型のunionである戻り型`Result[T, E]`を持つ。
- `Maybe(x)`は`Some[T] | None`（== `Maybe[T]`）を返す。
- `result.value_or(default)`は`T | typeof(default)`にナローイングされる。`result.bind { |v| ... }`は`Success`上でフラットマップする。
- `case result; in Success[v]; ...; in Failure[k, v]; ...`はパターンマッチングで、Rigorのナローイングはプリミティブレベルで既に理解している — プラグインは`Success`/`Failure`のデコンストラクションを教える必要がある。
- `do`記法（`yield Success(...)`）は`Failure`での暗黙のショートサーキットと共に値をバインドする。推論においては`bind`チェーンと等価。

**ドキュメントに記載されたdry-*依存関係**。なし。

**プラグイン結合**。dry-operationの基盤。`rigor-dry-monads`がランディングされると`Result`/`Maybe`はすべてのdryユーザーのファーストクラスのナローイングターゲットになる。

### dry-operation

**目的**。ビジネスオペレーションのステップベースDSL。各`step ...`は`Result`をアンラップし、`Failure`でショートサーキットする。

**プラグイン関連DSL**。

```
class CreateUser < Dry::Operation
  def call(input)
    attrs = step validate(input)
    user  = step persist(attrs)
    step notify(user)
    user
  end
end
```

**プラグインが発行する静的ファクト**。

- `Dry::Operation#call`は常に`Result[T, E]`を返す。`T`は`call`内の最終の非`step`式の型。`E`は内部の`step`呼び出しからの失敗型のunion。
- `step expr`は`expr`を`Result[T, E]`から`T`（`Success`ペイロード）にナローイングする。
- `call`末尾のベア値（上記の`user`）は暗黙的に`Success`にラップされる。

**ドキュメントに記載されたdry-*依存関係**。dry-monads（ガイドが「*dry-monadsを中心とした軽量DSL*」で始まる）。

**プラグイン結合**。dry-monadsファクトのハードコンシューマー。

### dry-effects

**目的**。代数的エフェクト — `Dry::Effects.State(:counter)`、`Dry::Effects::Handler.State(:counter)`等。合成可能なハンドラを持つ副作用トラッキング。

**プラグイン関連DSL**。エフェクトは`include Dry::Effects.X(...)`でミックスインし、`include Dry::Effects::Handler.X(...)`でハンドルする。

**プラグインが発行する静的ファクト**。エフェクトはメソッドの戻り型を変更しない。ケイパビリティ要件を課す（マッチするハンドラが呼び出しサイトのスコープ内にあること）。Rigorの型ラティスでのモデリングは可能だが、v0.1.xキャリアとは直接整合しない**。推奨: 延期**。Rigorに明示的なエフェクトロウキャリアが現れた場合（現時点でこのADRはない）に再検討。

**ドキュメントに記載されたdry-*依存関係**。なし。

**プラグイン結合**。なし — ファミリーの残りに対して直交。

## 階層C — DI/設定

### dry-auto_inject

**目的**。`Import = Dry::AutoInject(Container); class X; include Import["users.repo"]; end` — `attr_reader :users_repo`とコンストラクタの配線を自動生成する。

**プラグインが発行する静的ファクト**。

- `include Import["x.y.z"]`は、名前がキーのリーフコンポーネント（またはその正規化形式）であり、コンテナのそのキーに登録された型が戻り型であるインスタンスリーダーを宣言する。
- リーダーの型はコンテナのイントロスペクションなしには解決できない → コンパニオンの`rigor-dry-container`/`rigor-dry-system`プラグイン、またはコンテナファクトを`FactStore`として消費するクロスプラグインAPI（[ADR-9](../../adr/9-cross-plugin-api/)）が必要。

**ドキュメントに記載されたdry-*依存関係**。`Dry::Container`と`Dry::System`のコンテナと互換。

**プラグイン結合**。クロスプラグイン（コンテナファクトを消費）。

### dry-configurable

**目的**。クラスまたはモジュールスコープの設定のために`extend Dry::Configurable; setting :foo, default: 1, reader: true`で、オプションのクラスレベルリーダー生成を行う。

**プラグインが発行する静的ファクト**。

- `setting :foo, default: 1, reader: true`は`Integer`（デフォルトの型）を返す`Klass.foo`/`instance.foo`を生成する。
- ネストした`setting :db do setting :dsn, default: '…' end`は`Klass.config.db.dsn`としてアクセスできるネストした設定オブジェクトを生成する。
- `setting :foo, constructor: Types::String`（サポートされる場合）はdry-typesにフィードバックする。

**ドキュメントに記載されたdry-*依存関係**。なし。

**プラグイン結合**。スタンドアロン。コンストラクタ形式が使用される場合はdry-typesへのフック付き。

### dry-system

**目的**。コンポーネントディレクトリからの自動登録を持つ依存関係コンテナ — Hanamiスライスの基盤。

**プラグインが発行する静的ファクト**。

- `container.register(:key, instance)`とコンポーネントディレクトリの自動登録がコンテナのkey→型マップを埋める。
- `container[:key]`/`container.resolve(:key)`は登録された型を返す。
- Hanamiスライス（`Hanami.app["users.create"]`）は親のdry-systemコンテナを通じて解決される。

**ドキュメントに記載されたdry-*依存関係**。dry-core（Container）、dry-auto_inject。

**プラグイン結合**。dry-auto_injectプラグインが消費するファクトのプロデューサー。クロスプラグインAPI（[ADR-9](../../adr/9-cross-plugin-api/)）が必要になる可能性が高い。

### dry-container

**目的**。スタンドアロンのスレッドセーフDIコンテナ。現在dry-coreにバンドルされている。`dry-container` gem自体は薄い再エクスポート。

**静的ファクト**。dry-systemのコンテナと同一のサーフェス（自動登録を除く）。

**プラグイン結合**。実際にはdry-systemに包含される。

## 階層D — ユーティリティ（静的型シェイプへの影響なし）

これらのgemは型付きアクセサを宣言せず、DSLを通じてシェイプを持つ値を返さず、設定によって戻り型が変わるメソッドを生成しない。Rigorプラグインは基となるRBSが既にカバーするもの以上のものを発行することがない。

- **dry-cli** — コマンドクラスへの引数パース。引数はランタイムに関係なく文字列型。
- **dry-core** — 各種ヘルパー（キャッシュ、クラス属性、equalizer、コンテナ — レガシー分割については階層Eを参照）。各ヘルパーはその使用が現れるプラグインで最もよく処理される（例: dry-struct内の`Equalizer`コンシューマー）。
- **dry-events** — pub/subバス。サブスクライバーはシェイプがアプリケーション定義のイベントハッシュを受け取る。
- **dry-files** — ファイルシステム操作。
- **dry-inflector** — 文字列変換。
- **dry-logger** — 構造化ログ。
- **dry-monitor** — インストゥルメンテーションフック。

## 階層E — レガシー/置き換え済み

一度のみリスト。現役の置き換えがプラグイン作業を担う。

- **dry-equalizer** → `dry-core`に統合（`Dry::Core::Equalizer`）。
- **dry-matcher** → `dry-monads`のパターンマッチングに置き換え済み。
- **dry-transaction** → `dry-operation`に置き換え済み。
- **dry-view** → Hanami Viewにリネーム（dryファミリーのスコープ外。Hanamiプラグイントラックが開かれた場合は別途対応）。

## 階層F — フレームワーク統合

### dry-rails

dry-railsはdry-rb gemをRailsアプリに組み込むRailsのrailstie:

- strong parametersを置き換えるコントローラーヘルパー`safe_params`（dry-schemaで動作）。
- `ApplicationContract`（dry-validationで動作）。
- 自動インジェクション用の`Deps`ミックスイン（dry-auto_injectで動作）。
- 自動登録されるアプリケーションコンテナ（dry-systemで動作）。

`rigor-dry-rails`プラグインは新しいDSLサーフェスを追加しない。規約を宣言する — 「このアプリのコントローラーはdry-schemaの`safe_params`を使用する」 — ためRigorはRailsレイアウトでdry-rbプラグインのファクトをどこで見つけるかを知る。プラグイン作者の観点からは、基底の`rigor-dry-schema`/`rigor-dry-validation`/`rigor-dry-auto_inject`/`rigor-dry-system`プラグイン上の薄いコーディネーター。Railsプラグインロードマップとも重複する。将来の決定として`rigor-dry-rails`が`rigor-rails-routes`等のピアかあるいは両ファミリーに依存するグルーレイヤーかを解決すべき。

## 依存関係グラフ

2種類のエッジが混在しており、それぞれラベル付き:

- **runtime** — gemspecまたはガイドが直接requireを記述。
- **plugin** — ソースのRigorプラグインはターゲットのRigorプラグインが生成したファクトを消費しなければならない。

```
dry-types          — 基盤。dry-* 依存なし。
dry-logic          — 基盤。dry-* 依存なし。
dry-monads         — 基盤。dry-* 依存なし。
dry-effects        — 基盤。dry-* 依存なし。
dry-configurable   — 基盤。dry-* 依存なし。

dry-struct         -> dry-types        (runtime, plugin)
dry-schema         -> dry-types        (runtime, plugin)
                   -> dry-logic        (runtime; 述語ファクトが浮上した場合のみplugin)
dry-validation     -> dry-schema       (runtime, plugin)
                   -> dry-types        (runtime; pluginではdry-schema経由でトランジティブ)
dry-initializer    -> dry-types        (runtime依存なし; ユーザーがTypesをオプトインした場合plugin)
dry-operation      -> dry-monads       (runtime, plugin)

dry-container      -> dry-core         (runtime; plugin: 低影響)
dry-auto_inject    -> dry-container OR dry-system  (runtime; plugin: コンテナファクト)
dry-system         -> dry-container    (runtime, plugin)
                   -> dry-auto_inject  (runtime; plugin: そのプロデューサー)

dry-rails          -> dry-system       (runtime, plugin)
                   -> dry-schema       (runtime, plugin)
                   -> dry-validation   (runtime, plugin)
                   -> dry-auto_inject  (runtime, plugin)
```

フラグを立てるふたつのサイクル: **dry-system ↔ dry-auto_inject**（各gemのガイドが相手を参照）と**dry-types ↔ dry-schema ↔ dry-validation**（バリデーション契約がdry-schemaがdry-types経由で解釈するアドホック型をインラインで宣言できる）。両者はプラグイン作者が順序付けで解決できる依存関係の*方向*: まずプロデューサープラグイン（`dry-types`、`dry-system`）を構築し、次にコンシューマー（`dry-schema`/`dry-validation`、`dry-auto_inject`）を構築する。

## パッケージング戦略

3つの現実的な切り分け案。それぞれのトレードオフを伴う。**このドキュメントでは推奨しない** — 選択は後続の設計ステップに委ねる。以下はトレードオフの説明であり、支持表明ではない。

### 戦略1 — 単一の`rigor-dry`

階層AとB（オプションでC）をカバーするひとつのプラグインgem。

- **賛成**。単一のGemfileエントリー、単一のsemver、プラグイン間ファクトプロトコル不要（すべてが1つのプラグインのプロセスに収まる）。
- **賛成**。シンプルな初期作成 — v0.1.0プラグイン契約は実績がある。新しいクロスプラグインAPIサーフェスは不要。
- **反対**。リリースが無関係な変更を結合する（dry-monadの微調整がdry-structの修正と一緒に出荷される）。
- **反対**。部分的なdry-rb採用のユーザー（例: dry-struct + dry-typesのみ）がプラグインを明示的に内部でモジュラー化しない限り、使用していないgemの解析コストを負担する。
- **反対**。上流のgemのバージョンロックステップが乖離した場合（そして実際に乖離する — `dry-types` 1.7対1.8は異なるケイデンスで出荷される）、モノリシックなプラグインは最も遅いgemに追従しなければならない。

### 戦略2 — フルの`rigor-dry-*`ファミリー

上流のgemごとにひとつのプラグイン（階層A: 5プラグイン、階層B: 2、階層C: 3 = dry-railsを除いて10個のgem）。

- **賛成**。各プラグインが上流gemのバージョンケイデンスをきれいに追跡する。
- **賛成**。ユーザーはアラカルトでオプトイン。Gemfileには実際に依存するdry-rbサーフェスのみをリスト。
- **賛成**。dry-rbの組織原則を反映 — 合成する小さく焦点を絞ったユニット。
- **反対**。`rigor-dry-validation`/`rigor-dry-auto_inject`等のプラグインがジョブをこなすには、クロスプラグインAPIが必要（[ADR-9](../../adr/9-cross-plugin-api/)）。ADR-9はv0.1.xにキューイングされているが未実装。
- **反対**。10のプラグインリポジトリ、10のCIパイプライン、10のCHANGELOG、10のsubtreeスプリット。

### 戦略3 — 中粒度バンドル

階層でグループ化した3〜4つのプラグイン:

- `rigor-dry-types-family` — dry-types、dry-struct、dry-schema、dry-validation、dry-initializerをカバー（dry-logicを除く階層A）。
- `rigor-dry-monads-family` — dry-monads、dry-operationをカバー（dry-effectsを除く階層B、延期）。
- `rigor-dry-system-family` — dry-container、dry-auto_inject、dry-system、dry-configurableをカバー（階層C）。
- `rigor-dry-rails` — 3つすべてに依存するコーディネーターgem。

- **賛成**。各バンドルは内部的に結束している: 共有された内部ファクトバス、ひとつのリリースサイクル、ひとりの作者がバンドル全体を頭の中に入れられる。
- **賛成**。バンドル間の受け渡し（dry-railsでの階層A ↔ 階層C、またはdry-typesからプルするdry-validation）だけがクロスプラグインAPIを必要とする — 戦略2よりADR-9への依存が少ない。
- **反対**。バンドル境界は部分的に慣習的。dry-structのみを使うユーザーでもschema/validationプラグインコードを引き込む。
- **反対**。各バンドル内部のモジュラリティはまだ設計する必要がある — そうしなければバンドルはより小さいスケールで戦略1と同じバージョニングリスクを持つミニモノリスになる。

## Rigor v0.1.x作業への依存

パッケージング選択は2つの今後のアナライザー作業に影響される:

- **ADR-9クロスプラグインAPI**（[`docs/adr/9-cross-plugin-api.md`](../../adr/9-cross-plugin-api/)）
  — 別のプラグインのファクトを消費するプラグイン（dry-schemaの強制変換シェイプを必要とするdry-validation、dry-systemのコンテナマップを必要とするdry-auto_inject）には必須。戦略1はそれを回避する。戦略2と3はクロスプラグインの受け渡しにブロックされる。
- **v0.1.1正規表現→リファインメント名認識器**
  （[`docs/ROADMAP.md`](../../roadmap/)参照）
  — スライス1は未リリースでランディング済み。フルの認識器が出荷されると、`gt?: 18`や`format?: /\A.../`等のdry-schemaの述語がビルトインのリファインメント名にきれいにマッピングされる。それまでは述語ファクトは記録されるが型ナローイングはされない。

どちらも、ドライを限定するMVP（dry-types + dry-struct + dry-monadsの3つのgem: 別のプラグインからファクトを消費する必要なくローカルにファクトを生成するもの）をブロックしない。その密接なサブセットは3つの戦略いずれでも妥当なv1である。

## 解決事項とオープンアイテム

2026-05-09のこのサーベイのランディング後の議論でキャプチャされた解決事項。オープンアイテムは真に未決定。

1. **MVPタイミング — RESOLVED**。dryプラグインを急がない。まず[ADR-9クロスプラグインAPI](../../adr/9-cross-plugin-api/)をランディングし、その後パッケージングを再検討する。これによりADR-9以前の唯一の実行可能なパスとして戦略1を強いたプレッシャーが取り除かれる。戦略2と3はADR-9が出荷された後のライブ候補になる。
2. **`rigor-dry-rails`の配置 — DELEGATED**。強い好みなし — 作成が容易なファミリー下で実装する。プラグインがスキャフォールドされる時点で決定できる。事前にコミットしない。
3. **dry-effects — DEFERRED**。エフェクトシステムサポートは原則として望ましいが具体的な計画はない。Rigorの型ラティスにエフェクトロウキャリアまたは類似のものが現れた場合に再検討。
4. **Hanami/romプラグイン — QUEUED**。dry-rbプラグインがランディングした後のバージョンを対象とする。Hanamiプラグインはdry-systemプラグインを引き込む。romプラグインのスコープはここでスコープ未定。
5. **dry-rb gemspecの検証 — OPEN**。まだ強い意見なし。ADR-12でパッケージング戦略を確定する前に価値がある可能性が高いが、ブロッキングではない。

## 次のステップ

[ADR-9クロスプラグインAPI](../../adr/9-cross-plugin-api/)をランディングする。その後dry-rbパッケージング戦略の選択をキャプチャするADR-12を提出する。最初に作成するプラグイン — どの戦略でも — は`rigor-dry-types`。他のすべての階層Aプラグインがそれに依存するため。
