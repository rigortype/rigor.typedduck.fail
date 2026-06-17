---
title: "`rigor-dry-validation` — スライシング決定"
description: "rigortype/rigor docs/design/20260517-dry-validation-slicing.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260517-dry-validation-slicing.md"
sourcePath: "docs/design/20260517-dry-validation-slicing.md"
sourceSha: "c7acacf9e9a814a0c66315257f3ed7a0464fc03ea24376d78ac3ed54426f8714"
sourceCommit: "dd1240d88f635b570b72ca36d1fccddc8df8ccd1"
translationStatus: "translated"
sidebar:
  order: 20265517
---

**ステータス:**設計ノート。`rigor-dry-types`スライス4コミットで2026-05-17に著作。`rigor-dry-types`と`rigor-dry-struct`（両方ともv0.1.6で着地）を超えた次のdry-rbアダプタのスライス順序を決定する。

## スコープ

[`docs/design/20260509-dry-plugins-roadmap.md`](../20260509-dry-plugins-roadmap/)
§「dry-validation」がgemの3つのプラグイン関連DSLサーフェスを記述する;ユーザー向けプログラミング形は次のいずれか:

```ruby
class NewUserContract < Dry::Validation::Contract
  params do                       # (1) params { ... }アダプター — dry-schemaに委譲
    required(:email).filled(:string)
    required(:age).value(:integer)
  end

  rule(:email) do                 # (2) rule { ... }ブロック — 型寄与なし
    key.failure('has invalid format') unless EMAIL_RE.match?(value)
  end
end

result = contract.call(...)       # (3) Contract#call → Dry::Validation::Result
result.success?                   # Resultをナローイング
result.to_h                       # 型付きparamsハッシュを表面化
```

プラグインは、Rigorが次に答えられるときにユーザー価値を得る:

- **`contract.call(...)`の型は何か？**
  → contract形に関係なく`Dry::Validation::Result`。
- **成功時の`result.to_h`の型付き形は何か？**
  → dry-schemaから派生した`HashShape`。dry-schemaが必要。
- **与えられたContractにどのparamsキーが存在するか？**
  → `params { ... }`ブロック（これは変装したdry-schema）からの`:email` / `:age` / ...のセット。dry-schemaが必要。
- **`rule(:email)`は型付けに何をするか？**
  → 何もしない;純粋なビジネスルール。

## 依存順序

```
            ┌──── rigor-dry-types  （v0.1.6 — スライス1+2+3+4）
            │
rigor-dry-schema （まだ）  ←── :dry_type_aliasesを消費
            │
            ↓
rigor-dry-validation （まだ）  ←── dry-schemaのparams形を消費
```

スタンドアロンの`rigor-dry-validation`（dry-schemaなし）は`Contract#call → Result`ファクトのみを寄与できる。リッチなペイロード — 型付き`result.to_h`、paramsキー、キーごとの型 — はdry-schemaから流れる。**dry-schemaなしでは、dry-validationは1行のRBS寄与**:

```ruby
module Dry
  module Validation
    class Contract
      def call: (Hash[Symbol, untyped]) -> Result
    end

    class Result
      def success?: () -> bool
      def failure?: () -> bool
      def to_h: () -> Hash[Symbol, untyped]
    end
  end
end
```

それは10行のRBSオーバーレイ。専用プラグインスライスの価値はない — 類似の境界と並んで将来の「dry-rbコアRBSバンドル」に畳み込む。

**決定: `rigor-dry-validation`の*前に*`rigor-dry-schema`をスライスする**。スキーマ認識なしのvalidationプラグインは非常に少ししか寄与しない;それを伴うと、価値はユーザーコード内のスキーマ使用でスケールする。

## `rigor-dry-schema`の最小実行可能形

dry-pluginsロードマップ §「dry-schema」エントリーに従い:

```ruby
NewUserSchema = Dry::Schema.Params do
  required(:email).filled(:string)
  required(:age).value(:integer)
end

result = NewUserSchema.call(input)
result.to_h        # => HashShape[{email: String, age: Integer}]
result.errors.to_h # => Hash[Symbol, Array[String]]
```

プラグイン契約（提案）:

- プロジェクトのトップレベルでまたはクラスレベル定数として`Foo = Dry::Schema.{Params,JSON,define} { ... }`を認識。
- ブロック本体を`required(:key).<predicates>`と`optional(:key).<predicates>`呼び出しで歩く。
- 各述語サフィックス（`filled(:string)`、`value(:integer)`、`value(:date)` …）を`rigor-dry-types`が使うのと同じCANONICAL_ALIASESテーブル経由で基底クラスにマップする（`:string` → `String`、`:integer` → `Integer`、……）。ユーザー著作の参照（`value(Types::Email)`はクロスプラグインファクトチャネルを通じて解決される）に対しては`:dry_type_aliases`ファクトを消費する。
- `:dry_schema_table`ファクトを公開: `{schema_const_fqn => {required: {key => underlying_class}, optional: {...}}}`。
- ADR-16基板（`:dry_schema_table`を消費する`returns_from_arg:`を持つTier C `HeredocTemplate`）または基板のパラメータ化された戻り値がその時点でスコープ外の場合はカスタムウォーカーのいずれかを経由して`result.to_h`の型付き戻りを合成する。

`rigor-dry-schema`のスライス1フロア: 認識 + ファクト公開（まだ診断なし）、`rigor-dry-types`スライス1の形をミラー。

## `rigor-dry-validation`のスライシング — 提案された3つのスライス

`rigor-dry-schema`が基底の形を提供したら、validationプラグインは基板にクリーンにマップする。

### スライス1 — Contract認識 + Resultキャリア

- プロジェクトを`class X < Dry::Validation::Contract`サブクラスのために歩く。
- `X#call(Hash[Symbol, untyped]) → Result`を合成する（ジェネリックな`Result`、まだスキーマ認識なし）。
- `Dry::Validation::Result#{success?, failure?, to_h}`の手書きRBSオーバーレイ、そのため`contract.call(...).to_h`チェーンが`Hash[Symbol, untyped]`に解決する。

フロア: すべてのcontract呼び出しサイトは下流のメソッドチェーン推論のために型付きの`Result`レシーバーを持つ。

### スライス2 — `params { ... }`のdry-schemaとの統合

- contractボディ内の`params do ... end`ブロックを認識。
- それをdry-schema宣言として扱う（`rigor-dry-schema`のウォーカーに委譲するか、プラグインカップリングが問題なら関連サブセットを複製する）。
- `:dry_validation_params`ファクトを公開: `{contract_const_fqn => HashShape}`。
- `Contract#call`の戻りを精緻化し、`result.to_h`が`untyped`値ではなくcontractごとの形に対して型付けされるように。

フロア: `NewUserContract.new.call(email: "x@y", age: 17).to_h`が`HashShape[{email: String, age: Integer}]`に解決する。

### スライス3 — `json { ... }`アダプタパリティ

`json { ... }`ブロックは`params`と同じ形だがより厳密な型期待を適用する（文字列から整数への強制なし）。同じウォーカーを適用;同じファクトを別のキー（`:dry_validation_json`または`kind:`判別子を持つ共有された`:dry_validation_schema`）で発行。

フロア: `params`とのパリティ。プロジェクトが`json { ... }`を使わない場合は需要駆動。

## 必要なADR修正（あれば）

上記のスライシングに対しては何もなし。dry-validationは`rigor-dry-monads`が必要とする`Result[T, E]`キャリア修正を必要としない（下記 §「オープン観察」を参照） — `Dry::Validation::Result`は直和型ではなくジェネリッククラス。その`#to_h`ペイロードが型付き形*そのもの*であり、`#success?` / `#failure?`述語は既存の`bool`フローファクトを通じて下流チェーンをナローイングする。

## オープン観察 — `rigor-dry-monads`は別途ブロックされている

ロードマップは両方とも次のティアのdry-rbプラグインであるため、`rigor-dry-validation`と`rigor-dry-monads`をグループ化する。しかしdry-monadsは別の軸でブロックされている: メソッドごとの戻り値型ラッピング（`def x; Success(42); end → Result[Integer, untyped]`）を望む。ラップされた`Result[T, E]` / `Maybe[T]`キャリアは今日の`Rigor::Type::*`階層には存在しない。

2つのルート:

- **(a)** `Result[T, E]` / `Maybe[T]`キャリアを新しい`Rigor::Type::*`値クラスとして実装する。ADR-3修正レベルの作業（新しい型種別、正規化ルール、RBS消去、表示契約、等価性 / 確実性サーフェス）。
- **(b)** `Result[T, E]`を`Union[T, E]`として、`Maybe[T]`を`Union[T, NilClass]`として表現する。`Success(v)`対`Failure(e)`を精密にする「タグ」曖昧性解消を失うが、フロアとして機能するかもしれない。

決定: 2つのルートの少なくとも1つが具体的になるまでdry-monadsを先送り。dry-validationはmonadsなしで出荷可能 — 依存は逆方向に行く（dry-validationはdry-monadsではなくdry-types + dry-schemaを使う）。

## 結論

**作業順（キュー、需要駆動）:**

1. `rigor-dry-schema`スライス1（認識 + ファクト公開）
2. `rigor-dry-schema`スライス2+（スキーマごとの形合成）
3. `rigor-dry-validation`スライス1（Contract認識 + `Result`キャリア）
4. `rigor-dry-validation`スライス2（paramsのdry-schema統合）
5. `rigor-dry-validation`スライス3（jsonアダプタパリティ）
6. `rigor-dry-monads` — （a）または（b）が`Result` / `Maybe`キャリア質問を解決した後にのみ

合計: 5〜6の小〜中スライス。特定の層に対する具体的なユーザー需要はそれを前倒しすることを正当化する。
