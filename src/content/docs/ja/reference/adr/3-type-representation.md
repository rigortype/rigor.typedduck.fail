---
title: "ADR-3: 内部型表現"
description: "rigortype/rigor docs/adr/3-type-representation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/3-type-representation.md"
sourcePath: "docs/adr/3-type-representation.md"
sourceSha: "4d22c6b768aa230c9da01207885cde423c2dbbac5d3d00b1392e2b882b198c54"
sourceCommit: "db8d01bf94926a72e6a2aaf15639d1591b7e142e"
translationStatus: "translated"
sidebar:
  order: 4003
---

## ステータス

Accepted;実装・出荷済み。内部の型オブジェクトレイアウト（OQ1〜OQ3の作業決定を含む）はライブである;`Rigor::Type::*`キャリア（carrier）と[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)契約（contract）がそれを実現する。

ADR-3は、Rigorの内部型オブジェクトレイアウト（型モデルを実装するRubyのクラス、モジュール、メソッド、値オブジェクト）の設計空間を記録します。ADR-3はセマンティクスを再定義**しません**——それはADR-1と型仕様が所有します——そしてプラグイン契約（contract）も定義**しません**——それはADR-2が所有します。ADR-3は、ADR-1とADR-2が付着する解析器側のデータ形状を取り巻く根拠とオープンクエスチョンを捉えます。

安定した決定は[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)において規範的です。そのドキュメントとこのADRが一致しない場合、仕様が拘束力を持ち、このADRはそれに合わせて更新されます。型仕様についても同様です。[`docs/type-specification/`](../type-specification/)がこのADRと観察可能な動作について一致しない場合、型仕様が拘束力を持ちます。

## コンテキスト

Rigorは、垂直スライス（slice）実装が着地する前に内部型表現が必要です。型仕様は、表現がカバーしなければならない形式を列挙するのに十分なほど安定しています（[`docs/type-specification/rbs-compatible-types.md`](../../type-specification/rbs-compatible-types/)、[`docs/type-specification/rigor-extensions.md`](../../type-specification/rigor-extensions/)、[`docs/type-specification/special-types.md`](../../type-specification/special-types/)、[`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)を参照）。ADR-1は関係と動的起源代数を決定します（[`docs/adr/1-types.md`](../1-types/)、[`docs/type-specification/relations-and-certainty.md`](../../type-specification/relations-and-certainty/)、[`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/)）。ADR-2は型値を消費する拡張サーフェス（surface）を決定します（[`docs/adr/2-extension-api.md`](../2-extension-api/)、特に「型システムオブジェクトモデル」と「Scopeオブジェクト」セクション）。

残る決定は、解析器がRubyコード内でそれらの形式をどのように表現するか——どのクラスが存在するか、メソッドがどのようにグループ化されるか、関係的な回答がどのように返されるか、そして「決定済み」と「実装に委ねる」の境界がどこにあるべきか——です。

## 参照モデル: PHPStan `Type`

最も近い実用的な参照は、`phpstan/phpstan-src`のPHPStanの`Type`インターフェースとその`TrinaryLogic`コンパニオンです。代表的なアップストリームパス:

- [`src/Type/Type.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Type/Type.php) — すべての型が実装する中心的なインターフェース。
- [`src/Type/Constant/ConstantStringType.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Type/Constant/ConstantStringType.php) — 代表的なリテラル値実装。
- [`src/Type/Accessory/`](https://github.com/phpstan/phpstan-src/tree/2.2.x/src/Type/Accessory) — `IntersectionType`を通じて合成するリファインメント（refinement、篩型とも）のみの型。
- [`src/Type/Generic/`](https://github.com/phpstan/phpstan-src/tree/2.2.x/src/Type/Generic) — テンプレートパラメーター、変性、汎用キャリア（carrier）。
- [`src/TrinaryLogic.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/TrinaryLogic.php) — ケイパビリティ（capability）クエリと関係クエリが共有する3値結果クラス。
- [`src/Type/IsSuperTypeOfResult.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Type/IsSuperTypeOfResult.php)と[`src/Type/AcceptsResult.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Type/AcceptsResult.php) — 3値の回答とleasonメタデータをバンドルする結果オブジェクト。

`phpstan-src`リポジトリはRigorのサブモジュールの一部**ではありません**——`references/phpstan`はウェブサイト（`website/`）のみを持ちます——そのため、これらの引用は外部ポインターです。Rigorのチェックアウト内の`references/phpstan/website/src/developing-extensions/type-system.md`ドキュメントが最も近いリポジトリ内の説明です。

Rigorがこの参照から採用するパターンは、後でどのオープンクエスチョンが解決されるかに関わらず:

- **型を切り替えるために`instanceof`を使わない**。PHPStanのインターフェースコメントは明示的です: 呼び出し元は`$type instanceof StringType`ではなく`$type->isString()->yes()`と聞きます。Rigorは同じルールに従います。具体的なクラスは実装の詳細です。
- **モナドのような証人リストとしての空/非空配列**。PHPStanの`getConstantStrings(): list<ConstantStringType>`のようなメソッドは、解析器が定数文字列の証人を証明できない場合に空の配列を返し、そうでなければ非空のリストを返します。ユニオン（union、合併型とも）と積はメンバーリストを組み合わせることで合成します。Rigorはリファインメントプロジェクション用にこのパターンを採用します。
- **ブール値から分離された3値の結果**。ケイパビリティの質問は3値の結果（`yes`/`no`/`maybe`）を返します。特定の結果クラスのみがその値を理由でラップします。RigorはRubyイディオムで同じ分離を採用します。
- **サブクラスではなくラッパーとしての複合型**。PHPStanの`IntersectionType`、`UnionType`、`GenericObjectType`、`ConstantArrayType`、そしてアクセサリー型は、内部の`Type`参照を保持することで合成します。Rigorのラッパー（`Dynamic`、`Refined`、`Union`、`Intersection`、`Difference`、汎用キャリア）は同じ合成に従います。

PHPStanはコードの再利用のために内部的にクラス継承も使用します（例: `ConstantStringType extends StringType`）。Rigorはここで意図的に分岐します: Rigorの型表現は**型クラス間に継承がありません**。次のセクションでその理由を説明します。

## Ruby固有のフレーミング

RigorはRubyを対象とします。Rubyの3つの特性がPHPStanモデルからの偏差を駆動します:

- **すべての値はオブジェクトです**。PHPのスカラー値とオブジェクト値の分割はRubyには存在しません。整数リテラル`1`はすでに`1.class == Integer`を通じてクラス情報を持ちます。「定数文字列」型と「定数整数」型は原則として、識別が`value.class`である単一のRubyキャリアを共有できますが、クラスごとのレイアウトも可能です。これはオープンクエスチョン1の実質です。
- **`?`サフィックスのメソッドは慣例的にブール値を返します**。Rubyの読者は`string?`が`true`または`false`を返すことを期待します。Rigorのケイパビリティクエリは3値の結果を返します。命名規則は`?`を削除するか、ローカルで再定義するか、または2つの並行サーフェスを公開する必要があります。これはオープンクエスチョン2の実質です。
- **ミックスイン基盤の合成が慣用的です**。RubyモジュールはクラスHierarchyを強制せずにトレイトのような動作を共有できます。Rigorはモジュールを、型分類ではなく共有の構造的等値性とidentity契約に狭く使用します。

このADRの残りは、設計の根拠、作業決定、却下/延期された選択肢、および計画チェックリストを記録します。安定した決定は[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)において規範的です。このADRとそのドキュメントが一致しないように見える場合、仕様が拘束力を持ちます。

## 規範的契約

内部型表現の決定済みの部分——不変値オブジェクト、構造的等値性、型クラス間の継承なし、`Rigor::Trinary`を返すケイパビリティクエリ、`Array<Type>`を返すリファインメントプロジェクション、ラッパーとしての複合形式、結果オブジェクトを返す関係クエリ、ファクトリールートの正規化、メソッドサーフェス、モジュールレイアウト、診断表示ルーティング——は[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)において規範的です。エンジンとプラグインのコードはそのドキュメントに従わなければなりません（MUST）。このADRは設計の根拠、以下の却下/延期オプション、および計画チェックリストのために保持されます。移動した契約に対して拘束力があるものとして扱ってはなりません（MUST NOT）。

それらの型オブジェクトを取り囲むエンジンサーフェス契約（`Scope`、ファクト（fact）ストア、エフェクトモデル、ケイパビリティロール推論、正規化、RBS消去ルーティング、公開安定性ルール）は[`docs/internal-spec/implementation-expectations.md`](../../internal-spec/implementation-expectations/)において規範的です。

## 作業決定

3つの設計上の問いは、最初は選ばれた回答を実際のコードで試せるように延期されていました。最初の2つは既存の実装によって解決されています。3つ目は後続のスライスが一貫したターゲットを持てるように設計レベルで解決されています。以下の各セクションは作業決定、それを着地させた根拠、および却下/延期された選択肢をその元の「検討されたオプション」形式で記録します。

### オープンクエスチョン1: 定数スカラーとオブジェクトシェイプ

解析器が値が特定のRubyリテラル（`1`、`"aaa"`、`:sym`、`true`、`false`、`nil`）と等しいことを証明できる場合、その事実はどのように型表現に持ち込まれるべきですか？

**作業決定: オプションC（ハイブリッド）**。単一の`Rigor::Type::Constant`クラスがスカラーリテラル（`Integer`、`Float`、`String`、`Symbol`、`Rational`、`Complex`、`true`、`false`、`nil`、整数エンドポイントの`Range`）を持ちます。専用のキャリア（`Tuple`、`HashShape`、`IntegerRange`など）は、内部構造が単一のRuby値に圧縮できない複合形状とリファインメント形状を持ちます。実装は[`lib/rigor/type/constant.rb`](../../lib/rigor/type/constant.rb)（`SCALAR_CLASSES`が受け入れるクラスを列挙）、[`lib/rigor/type/tuple.rb`](../../lib/rigor/type/tuple.rb)、[`lib/rigor/type/hash_shape.rb`](../../lib/rigor/type/hash_shape.rb)、[`lib/rigor/type/integer_range.rb`](../../lib/rigor/type/integer_range.rb)にあります。

ハイブリッドは元の分析でスコアが最も高かったのと同じ理由で着地しました。スカラーキャリアはコンパクトでRubyイディオムを保ち、既存のキャリアはすでに内部型参照とシェイプ（shape）ポリシーのために独自の構造を必要とし、「スカラーリテラル」と「複合シェイプ」の境界は[`rigor-extensions.md`](../../type-specification/rigor-extensions/)の概念的な分離と一致します。

**検討して却下されたオプション:**

- *オプションA — 統一キャリア（複合リテラルを含むすべてのものに単一の`Constant`）。*複合シェイプ（`Tuple`、`HashShape`、`Record`）は内部の`Rigor::Type`参照とelement単位のポリシーを持ち、単一のRuby値に圧縮できないため却下。統一された`Constant`はすべてのインスタンスにそれらのポリシーを埋め込む必要があり、スカラーキャリアとシェイプポリシーを混同します。
- *オプションB — Rubyクラスごとの専門化（`String::Constant`、`Integer::Constant`など）。*クラスごとのレイアウトはサポートされるリテラル種類に比例してクラス数を増やし、Rubyでそのレイアウトが購入するクラスごとの動作は何も必要ありません——統一キャリアでの`value.class`ディスパッチはクラスパターンマッチと同様に直接的であり、リファインメントプロジェクションは統一されたシェイプに対してクリーンに合成するため却下（OQ3の作業決定を参照）。

### オープンクエスチョン2: 3値を返す述語の命名

ケイパビリティメソッドは`Rigor::Trinary`を返し、Rubyのブール値ではありません。Rubyの慣例は`?`サフィックスのメソッドがブール値を返すことです。この2つの事実が衝突します。

**作業決定: オプションA（3値を返すメソッドの`?`を削除）**。型側のケイパビリティと関係クエリは`Rigor::Trinary`（`type.top`、`type.bot`、`type.dynamic`）または結果オブジェクト（`type.accepts(other, mode:)`は`Type::AcceptsResult`を返す）を返す名詞/動詞形式です。ブールクエリ——`Trinary`自体を含む——は、それが本当にブール値を返すから`?`サフィックスを保持します（`Trinary#yes?`、`Trinary#no?`、`Trinary#maybe?`、`AcceptsResult#yes?`/`#no?`/`#maybe?`）。

実装はスライス1からこのルールと一致しています。すべての`Rigor::Type`キャリアは`top`、`bot`、`dynamic`（3値を返す、`?`なし）と`accepts(other, mode:)`（結果オブジェクトを返す）を公開し、`Trinary`はブールプロジェクションのために`yes?`/`no?`/`maybe?`を公開します。

クロスカット要件は引き続き有効です:

- `Rigor::Trinary`値オブジェクトは`yes?`、`no?`、`maybe?`メソッドを持たなければなりません（MUST）。
- `Rigor::Type`のすべてのメソッドが3値を返す場合、このルールに従わなければなりません（MUST）（クラスごとの偏差なし）。
- ケイパビリティサーフェスと関係サーフェスは一致します。

**検討して却下されたオプション:**

- *オプションB — `?`を保持して偏差を文書化。* `?`サフィックスのメソッドから非ブール値を静かに返すことは広く保持されているRubyの期待と矛盾し、コントリビューター、RuboCop/Rubyルール、RBS著者、IDEのインレイヒントを混乱させるため却下。
- *オプションC — デュアルAPI（3値のための`type.string`と`.yes?`上のBool糖衣構文のための`type.string?`）。*サーフェスを2倍にし、呼び出し元が`?`をデフォルトに使用して`maybe`を認識する動作を静かに失う誘惑を与え——[`relations-and-certainty.md`](../../type-specification/relations-and-certainty/)が警告する正確な失敗モード——2つの並行サーフェスを同期する保守負担はすべての新しいクエリメソッドとともに増大するため却下。

### オープンクエスチョン3: リファインメントキャリア戦略

[`imported-built-in-types.md`](../../type-specification/imported-built-in-types/)はリファインメント名のカタログを予約します——`non-empty-string`、`lowercase-string`、`numeric-string`、`decimal-int-string`、`positive-int`、`non-empty-array[T]`、`non-empty-hash[K, V]`など——これらは既存の名前的型（nominal type、公称型とも）の*サブセット*を命名します。問いは、解析器がそれらのサブセットをどのように内部的に表現するかです。

**作業決定: オプションC（2層ハイブリッド: 点除去`Difference`、述語サブセット`Refined`）**。カタログは自然な数学的境界に沿って分割されます:

- **点除去リファインメント** — 値集合が基底型から有限で静的に記述可能な値の集合を引いたもの — 既存の`Difference[BaseType, RemovedSet]`キャリアを使用:
  - `non-empty-string` = `String - ""`
  - `non-zero-int` = `Integer - 0`
  - `non-empty-array[T]` = `Array[T] - []`
  - `non-empty-hash[K, V]` = `Hash[K, V] - {}`
  - `positive-int`と`non-negative-int`はすでに`IntegerRange`を通じて実現されています。
- **述語サブセットリファインメント** — 値集合が要素ごとの述語によって定義される — 基底型と述語識別子をラップする`Type::Refined`キャリアを使用:
  - `lowercase-string` = `Refined[String, :lowercase]`
  - `uppercase-string` = `Refined[String, :uppercase]`
  - `numeric-string` = `Refined[String, :numeric]`
  - `decimal-int-string`、`octal-int-string`、`hex-int-string` — それぞれ`Refined[String, :…]`
  - ADR-2を介したプラグイン提供の述語リファインメント

複合リファインメント名は`Intersection`を通じて合成します: `non-empty-lowercase-string` = `Difference[String, ""] & Refined[String, :lowercase]`。

正規名レジストリはケバブケース名をそのキャリア形状（`Difference`または`Refined`+述語）にマッピングします。

**ステータス（v0.0.4以降）:**両方の半分と合成`Intersection`キャリアはv0.0.4で出荷されました。`Type::Difference`は[`lib/rigor/type/difference.rb`](../../lib/rigor/type/difference.rb)、`Type::Refined`は[`lib/rigor/type/refined.rb`](../../lib/rigor/type/refined.rb)、`Type::Intersection`は[`lib/rigor/type/intersection.rb`](../../lib/rigor/type/intersection.rb)にあります。

**検討して却下されたオプション:**

- *オプションA — アクセサリーキャリアごとの`IntersectionType`。* PHPStanスタイル。リファインメントごとのクラス成長はカタログに対して無限であり、点除去半分の`Difference`と述語半分の共有`Refined`キャリアによってすでに表現可能な動作をクラスごとのレイアウトが購入するため却下。
- *オプションB — Difference型のみ。*述語定義のリファインメント（`lowercase-string`、`numeric-string`）をカバーできないため却下。

## クラスカタログドラフト

このカタログは**規範的ではありません**。型仕様が計画された表現によってカバーされているかのチェックリストです。

- **特殊型**: `Top`、`Bot`、`Dynamic`、`Void`。`Untyped`は構築時に`Dynamic[Top]`に解決されます。
- **名前的型**: `Nominal`、`Singleton`、`Self`、`Instance`、`ClassMarker`。
- **構造的型**: `Interface`、`ObjectShape`、`Capability`、`MethodSignature`、`ProcSignature`、`BlockSignature`。
- **コンテナ**: `ArrayShape`、`Tuple`、`HashShape`、`Record`。
- **定数**: `Constant`はスカラーリテラルを持ちます（OQ1オプションCで解決）。
- **コンビネータ**: `Union`（実装済み）、`Intersection`、`Difference`、`Complement`。
- **リファインメント**: OQ3オプションCごとに、リファインメントは2層に分割されます。点除去は`Difference[BaseType, RemovedSet]`を使用。述語サブセットは`Refined[BaseType, predicate]`を使用。`IntegerRange`は専用の有界整数キャリアとして残ります。
- **汎用位置キャリア**: `Generic`、`TemplateParameter`、`Variance`。

すべてのエントリは[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)のメソッドサーフェスを満たさなければなりません（MUST）。

## 実装ロードマップ

ロードマップは情報提供のためであり、規範的ではありません。

OQ1+OQ2キャリアは着地しています: `Type::Constant`、`Type::Tuple`、`Type::HashShape`、`Type::IntegerRange`、`Type::Union`、`Type::Top`、`Type::Bot`、`Type::Dynamic`、`Type::Nominal`、`Type::Singleton`、3値を返すケイパビリティメソッド、`Type::AcceptsResult`など。

OQ3は`Type::Difference`の着地（点除去半分）と`Type::Refined`（述語サブセット半分）によって解決されています。

**ステータス（v0.0.4以降）:**両方のフォローアップスライスが出荷しました。`Type::Refined[base, predicate_id]`（述語レジストリ、正規名テーブル、カタログ層プロジェクションルール付き）と`Type::Intersection`（合成された`non-empty-lowercase-string`/`non-empty-uppercase-string`名のため）がすべて着地しました。6つの述語リファインメントがカタログ化されています（`lowercase-string`、`uppercase-string`、`numeric-string`、`decimal-int-string`、`octal-int-string`、`hex-int-string`）。

## 参照

Rigorドキュメント:

- [`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/) — このADRによって決定された型オブジェクトサーフェスの規範的公開契約。
- [`docs/internal-spec/implementation-expectations.md`](../../internal-spec/implementation-expectations/) — 型オブジェクトを取り囲むエンジンサーフェス契約。
- [`docs/adr/1-types.md`](../1-types/) — 型モデルセマンティクス、動的起源代数、3値の確実性。
- [`docs/adr/2-extension-api.md`](../2-extension-api/) — 型値を消費する拡張サーフェス。
- [`docs/type-specification/relations-and-certainty.md`](../../type-specification/relations-and-certainty/) — サブタイピング（subtyping）、<ruby>漸進的一貫性<rp>（</rp><rt>gradual consistency</rt><rp>）</rp></ruby>、3値の確実性。
- [`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/) — 束のidentityと`Dynamic[T]`代数。
- [`docs/type-specification/special-types.md`](../../type-specification/special-types/) — `top`、`bot`、`untyped`/`Dynamic[T]`、`void`、`nil`/`NilClass`、`bool`/`boolish`。
- [`docs/type-specification/rbs-compatible-types.md`](../../type-specification/rbs-compatible-types/) — RBS形式と文脈的ルール。
- [`docs/type-specification/rigor-extensions.md`](../../type-specification/rigor-extensions/) — RigorがRBSを超えて追加するリファインメント。
- [`docs/type-specification/imported-built-in-types.md`](../../type-specification/imported-built-in-types/) — 予約された組み込みリファインメント名。
- [`docs/type-specification/type-operators.md`](../../type-specification/type-operators/) — 演算子形式と表示契約。
- [`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/) — インターフェース、シェイプ、ケイパビリティロール。
- [`docs/type-specification/normalization.md`](../../type-specification/normalization/) — 決定論的正規化ルール。
- [`docs/type-specification/rbs-erasure.md`](../../type-specification/rbs-erasure/) — RBSへの保守的消去。
- [`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/) — 識別子分類体系と表示ルール。

背景となる研究ノート（外部文献のRigor観点レビュー）:

- [`docs/notes/20260518-matsumoto-2008-poly-records-rigor-review.md`](../../notes/20260518-matsumoto-2008-poly-records-rigor-review/) — 松本＆南出2008（Ruby向けGarrigueカインド付き多相レコード）のレビュー。80行のプログラムに対して約57k個の束縛型変数まで膨張する型変数爆発と、ADR-3の名前的型優先のキャリア選択が回避している構造的レコードの限界を記録する。
- [`docs/notes/20260518-matsumoto-2010-cfa-rigor-review.md`](../../notes/20260518-matsumoto-2010-cfa-rigor-review/) — 松本＆南出2010（SemiRubyに対するセミフローセンシティブなRuby CFA）のレビュー。Rigorのウォーカーごとの静的ディスパッチャ層と、論文のプログラムポイントごとのメソッド設定を対比する。
