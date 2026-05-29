---
title: "Internal Type API"
description: "Imported from rigortype/rigor docs/internal-spec/internal-type-api.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/internal-type-api.md"
sourcePath: "docs/internal-spec/internal-type-api.md"
sourceSha: "1c2cad782ba0ec561779cd7e05b0cf43557519fef9ca7a7ede8f95f90ec30672"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

このドキュメントは、すべてのRigorの型オブジェクトがMUST満たすパブリック契約（contract）を規定します。不変性と等価性の規律、メソッドサーフェス（surface）、結果値オブジェクト、ラッパー合成ルール、そして正規化・消去・診断表示のルーティングが対象です。

これは[`docs/type-specification/`](../../type-specification/)の型言語セマンティクスと対になるエンジン内部の仕様です。ここでの記述が型言語の振る舞いと矛盾する場合は、型仕様が優先されます。

このドキュメントで定められた決定事項は安定しています。[`docs/adr/3-type-representation.md`](../../adr/3-type-representation/)で追跡されている2つの未解決問題——定数スカラー/オブジェクトキャリア（carrier）形状と三値返却メソッドの命名規約——はいずれも契約がそれらに依存しないよう、ここでは意図的に抽象化されています。

## スコープ

このドキュメントが拘束するもの：

- エンジンコード、プラグイン、CLIコンポーネント、テストが型を推論するために使用するRubyサーフェス。
- すべての型インスタンスがMUST満たす同一性・等価性・ハッシュ化・不変性のルール。
- メソッドサーフェスの分類（ケイパビリティ（capability）クエリ、リファインメント（refinement、篩型とも）射影、関係クエリ、構造クエリ、コンビネータ、メタ）と、各グループの結果形状契約。
- ラッパー形式（`Dynamic[T]`、リファインメント、ユニオン（union、合併型とも）、インターセクション、差分、補集合、ジェネリック位置キャリア）の合成ルール。
- パブリックメソッドから型仕様へのルーティングルール（`describe(verbosity)`から[`diagnostic-policy.md`](../../type-specification/diagnostic-policy/)、`erase_to_rbs`から[`rbs-erasure.md`](../../type-specification/rbs-erasure/)、`normalize`から[`normalization.md`](../../type-specification/normalization/)）。

このドキュメントが拘束しないもの：

- 具体的なクラスの正確なセット。[`docs/adr/3-type-representation.md`](../../adr/3-type-representation/)の未解決問題1が未解決なためです。そのADRにあるクラスカタログのドラフトは、縦断的なスライス（slice）の実装がオプションを選択するまでは例示にとどまります。
- 三値返却の命名規約（同ADRの未解決問題2）が未解決な場合の具体的なRubyメソッド名。命名が重要な箇所では、`?`サフィックスなしの抽象的な形式でメソッドを記述しています。最終的な規約はすべてのメソッドに一様に適用されます。

## 同一性と不変性

- すべての型インスタンスは構築の終わりに`freeze`されなければなりません（MUST）。構築後にインスタンスを変更することは、内部アクセサを通じても、契約違反です。
- 等価性はMUST構造的でなければなりません。`==`と`eql?`は一致しなければならず（MUST）、構造的に等価なデータを保持する2つのインスタンスに対して両方とも`true`を返さなければなりません（MUST）。
- `hash`は同じ構造的データから導出されなければならず（MUST）、`eql?`で等しいインスタンスは同一の`hash`値を生成しなければなりません（MUST）。
- 等価性はオブジェクト同一性に依存してはなりません（MUST NOT）。同じRubyオブジェクトでなくても、等しい構造を持つ2つの型インスタンスは等しいと比較されなければなりません（MUST）。
- 型インスタンスはハッシュキーとして再利用してもかまいません（MAY）。実装はキャッシュが有効な場合に共通インスタンスをフライウェイト化してもかまいませんが（MAY）、フライウェイト化を正確さのために依存してはなりません（MUST NOT）。

## 三値結果値

`Rigor::Trinary`値オブジェクトは、ケイパビリティクエリ、関係クエリ、および「証明されたyes」「証明されたno」「どちらも証明できない」を区別するアナライザサーフェスが使用する標準的な三値結果です。そのセマンティクスは[`relations-and-certainty.md`](../../type-specification/relations-and-certainty/)で規範的に定義されており、このセクションはパブリックなRuby契約を拘束します。

- `Rigor::Trinary`は、`yes`・`no`・`maybe`という名前のファクトリを通じてアクセス可能な3つのフライウェイトインスタンスを公開しなければなりません（MUST）。フライウェイトは同じ値に対して`equal?`・`==`・`eql?`を満たさなければなりません（MUST）。
- `Rigor::Trinary`は、`true`または`false`を返すブールな述語`yes?`・`no?`・`maybe?`を公開しなければなりません（MUST）。これらは`Trinary`上で`?`-returns-boolean規約に従う唯一のメソッドでなければなりません（MUST）。
- `Rigor::Trinary`は少なくとも標準コンビネータ`and(other)`・`or(other)`・`negate`（`yes`の否定は`no`、`no`の否定は`yes`、`maybe`の否定は`maybe`）を公開しなければなりません（MUST）。コンビネータは`Rigor::Trinary`インスタンスを返さなければなりません（MUST）。
- `Rigor::Trinary`値は暗黙にRubyのブール値に強制変換されてはなりません（MUST NOT）。ブール値が必要な呼び出し元は明示的な述語（`yes?`・`no?`・`maybe?`）を選択しなければなりません（MUST）。
- `maybe`は繰り返しの証拠によって`yes`に昇格されてはなりません（MUST NOT）。[`relations-and-certainty.md`](../../type-specification/relations-and-certainty/)の昇格ルールだけが確実性の変更の源です。

## 結果値オブジェクト

関係クエリは、アナライザが呼び出し元が消費してもよい（MAY）理由メタデータを持つ場合、裸のブール値や裸の`Rigor::Trinary`値ではなく、不変の結果値オブジェクトを返さなければなりません（MUST）。

- 部分型（subtype）クエリ（`subtype_of`）は、型APIの残りの部分で選ばれる三値命名規約に従ったメソッドを通じて`Rigor::Trinary`の回答を公開するオブジェクトに加え、どのルールが発動したか、どの動的起源ファクト（fact）が参照されたか、どの予算カットオフに達したかを説明する理由メタデータを持つオブジェクトを返さなければなりません（MUST）。
- 受容クエリ（`accepts`）は、受容固有のメタデータ（モード、変換パス、動的起源の来歴）をカバーする類似のオブジェクトを返さなければなりません（MUST）。スライス4フェーズ2cは、次の形状を持つ具体的な`Rigor::Type::AcceptsResult`値オブジェクトにこれを紐付けます：
  - `trinary` — 保持する`Rigor::Trinary`の回答。
  - `mode` — 回答が計算された境界モード（`:gradual`が現在利用可能；`:strict`は後のスライスのために予約）。
  - `reasons` — 発動したルールを発動順に説明する凍結された`Array<String>`。
  - 述語`yes?`・`no?`・`maybe?`は保持する`Rigor::Trinary`に委譲しなければならず（MUST）、`?`-returns-boolean規約に従う`AcceptsResult`上の唯一のメソッドでなければなりません（MUST）。
  - `with_reason(reason)`は同じ`trinary`と`mode`を持ちつつ`reason`を`reasons`に追加した新しい`AcceptsResult`を返さなければなりません（MUST）。レシーバを変更してはなりません（MUST NOT）。`nil`または空文字列を渡すことはno-op（同じインスタンスが返される）でなければなりません（MUST）。
  - `(trinary, mode, reasons)`の構造的等価性は、*同一性と不変性*セクションに従って保持されなければなりません（MUST）。
  - reasonsは人間が読めるログ以外のすべての呼び出し元から不透明として扱われなければなりません（MUST）。後のスライスはエントリを構造化レコード（ルールid、サポートファクト、動的来歴）にアップグレードしてもよく（MAY）、それに関する事前通知は不要です；より豊かなキャリアが必要な呼び出し元は文字列を解析するのではなく将来の名前付きアクセサを通じてそれを消費しなければなりません（MUST）。
- 単純なクエリ（`consistent_with`・`equal_value`）は有用な理由メタデータが存在しない場合に裸の`Rigor::Trinary`を返してもかまいません（MAY）。
- 結果オブジェクトは不変であり、型インスタンスと同じルールで構造的に比較可能でなければなりません（MUST）。

結果オブジェクトサーフェスは、[`docs/adr/3-type-representation.md`](../../adr/3-type-representation/)に記録されたPHPStanの`IsSuperTypeOfResult`と`AcceptsResult`設計を反映しています。

## メソッドサーフェス

すべての具体的な型実装は以下に列挙するメソッドサーフェスを公開しなければなりません（MUST）。`?`サフィックスなしのメソッド名はこの仕様で使用される抽象形式に従います；最終的な具体的なスペルはADR-3の未解決問題2の解決によって固定され、`Rigor::Trinary`を返すすべてのメソッドに一様に適用されます。

### ケイパビリティ述語

ケイパビリティ述語は型が特定のRubyの種類として振る舞うかどうかを問います。`Rigor::Trinary`を返さなければなりません（MUST）。最小サーフェスは：

`string`・`integer`・`float`・`symbol`・`boolean`・`nil_value`・`array`・`hash`・`tuple`・`record`・`proc`・`callable`・`iterable`・`void`・`dynamic`・`class_object`・`module_object`。

実装は型仕様が対応する区別を得た場合に追加の種類のケイパビリティ述語を追加してもかまいません（MAY）。実装は振る舞い的に弱いチェックでケイパビリティ述語を置き換えてはなりません（MUST NOT）。

### リファインメント射影

リファインメント射影は特定のリファインメントファミリーの証人を列挙します。Rubyの`Array<Rigor::Type>`を返さなければなりません（MUST）。空の配列は「この射影の証明された証人がない」ことを意味します。空でない配列はアナライザが証人を列挙できることを意味します。最小サーフェスは：

`constant_strings`・`constant_integers`・`constant_floats`・`constant_symbols`・`constant_booleans`・`constant_arrays`・`arrays`・`tuples`・`records`・`hashes`・`enum_cases`・`finite_values`。

合成ルール：

- ユニオンは各射影をメンバーに転送し、結果を順序を保持しながら連結しなければなりません（MUST）。
- インターセクションは各射影をメンバーに転送し、結果を交差させなければなりません（MUST）。
- `Dynamic[T]`ラッパーは[`value-lattice.md`](../../type-specification/value-lattice/)に従って静的ファセット`T`への射影を転送しなければなりません（MUST）。`Dynamic[T]`を通じて取得された証人は自身に動的起源の来歴を持たなければなりません（MUST）。
- リファインメントラッパー（精緻化された名前的型（nominal type、公称型とも）、整数範囲、有限リテラルユニオン等）は基底型を通じて射影を転送し、適用可能な場合は独自の貢献を追加しなければなりません（MUST）（例えば、文字列の有限リテラルユニオンは`constant_strings`にそのメンバーを提供しなければなりません）。

### 関係クエリ

関係クエリは（理由メタデータが意味を持つ場合）結果値オブジェクトを、（持たない場合）`Rigor::Trinary`を返さなければなりません（MUST）。最小サーフェスは：

- `subtype_of(other)` — 部分型結果オブジェクトを返す；セマンティクスは[`relations-and-certainty.md`](../../type-specification/relations-and-certainty/)を参照。
- `accepts(other, mode:)` — 受容結果オブジェクトを返す；`mode:`キーワードは境界モード（strict、gradual、プラグイン提供）を持つ。
- `consistent_with(other)` — `Rigor::Trinary`を返す；セマンティクスは[`relations-and-certainty.md`](../../type-specification/relations-and-certainty/)を参照。
- `equal_value(other)` — `Rigor::Trinary`を返す；型セット等価性ではなく値等価性の絞り込みを意図している。

関係クエリは[`value-lattice.md`](../../type-specification/value-lattice/)に従って`Dynamic[T]`の静的ファセットを扱わなければなりません（MUST）。動的な値が型付き境界を越えるかどうかを支配するのは、サブタイピング（subtyping）ではなく漸進的一貫性（gradual consistency）です。

### 構造クエリ

構造クエリはADR-2の拡張APIに必要なメンバーレベルのサーフェスを公開します。最小サーフェスは：

- `has_method(name)` — `Rigor::Trinary`を返す。
- `method(name, scope:)` — メソッドリフレクション結果または「利用不可」のセンチネルを返す。
- `members` — [`structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)の構造化された形状を返す。
- `key_type`・`value_type`・`tuple_arity`・`iterable_key_type`・`iterable_value_type` — `Rigor::Type`または「適用不可」のセンチネルを返す。

メンバーを持つ型（オブジェクト形状、ケイパビリティロール、ハッシュ形状、レコード）はこれらの結果を埋める際に[`structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)のスキーマを参照しなければなりません（MUST）。

### 操作とコンビネータ

コンビネータはファクトリモジュール（仮称`Rigor::Type::Combinator`）に置かれ、すべてのパブリック構築を[`normalization.md`](../../type-specification/normalization/)の決定論的な正規化ルールを通じてルーティングしなければなりません（MUST）。最小サーフェスは：

- `union(*types)`・`intersect(*types)`・`difference(left, right)`・`complement_within(domain, type)`。
- `refine(base, predicate)` — リファインメントを既存の型に付加する。`predicate`の正確な形状は適用されるリファインメントファミリーに依存する（[`rigor-extensions.md`](../../type-specification/rigor-extensions/)を参照）。
- `dynamic(static_facet)` — `Dynamic[T]`ラッパーを構築する。`dynamic(top)`は`untyped`の標準形でなければなりません（MUST）。

型インスタンスは変更するコンビネータを公開してはなりません（MUST NOT）。追加のリファインメントを持つ新しい型を返すインスタンスメソッド（仮称`with_refinement`）はADR-3の未解決問題1が解決されたら追加してもかまいません（MAY）。

ファクトリの正規化ルートを迂回する直接コンストラクタ呼び出しはテストと移行のために予約された内部エスケープハッチです。本番コードパスはファクトリを通じなければなりません（MUST）。

### ラッパー合成

ラッパー（`Dynamic[T]`、リファインメントキャリア、`Union`・`Intersection`・`Difference`・`Complement`、ジェネリック位置キャリア）は基底クラスを継承するのではなく、内部の`Rigor::Type`参照を保持しなければなりません（MUST）。振る舞いは内部型に以下に従って委譲されます：

- `Dynamic[T]`については[`value-lattice.md`](../../type-specification/value-lattice/)の動的起源代数。
- 負形式と差分形式については[`type-operators.md`](../../type-specification/type-operators/)のコンビネータ代数。
- リファインメントキャリアについては[`rigor-extensions.md`](../../type-specification/rigor-extensions/)のリファインメント合成ルール。
- ジェネリック位置キャリアについては[`value-lattice.md`](../../type-specification/value-lattice/)のジェネリックスロット保全ルール。

ラッパーはケイパビリティと射影クエリを内部型に転送してから独自の貢献を適用しなければなりません（MUST）。ラッパーは転送中に来歴を暗黙に除去してはなりません（MUST NOT）（例えば、`Dynamic[T]`は返す値に動的起源の来歴を記録し続けなければなりません）。

### メタ操作

すべての型インスタンスは以下を公開しなければなりません（MUST）：

- `describe(verbosity)` — 診断表示ルールに従った文字列を返す。実装は[`diagnostic-policy.md`](../../type-specification/diagnostic-policy/)（`Dynamic[T]`ファミリーの例外を含む）、[`type-operators.md`](../../type-specification/type-operators/)（否定ファクトと演算子省略ルール）、[`structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)と[`rbs-erasure.md`](../../type-specification/rbs-erasure/)（ハッシュ形状とタプル表示）を遵守しなければなりません（MUST）。
- `erase_to_rbs` — [`rbs-erasure.md`](../../type-specification/rbs-erasure/)に従った保守的なRBS消去を返す。消去は証明された型以上に広くなければならず（MUST）、有効なRBS構文でなければなりません（MUST）。
- `normalize` — 冪等でなければなりません（MUST）。すでに正規化された型は`self`を返さなければなりません（MUST）。ファクトリルート外で構築された型は、同じ入力に対してファクトリが生成するのと同じインスタンスに正規化されなければなりません（MUST）。
- `traverse(&block)` — コンビネータとラッパーの内部型参照を歩き、各内部型を決定論的な順序でブロックにyieldします。リーフ型はno-opとして`traverse`を実装してもかまいません（MAY）。
- 上記の*同一性と不変性*セクションに従った構造的`==`・`eql?`・`hash`。

`inspect`は開発の便宜のために存在してもかまいません（MAY）。`inspect`を診断サーフェスとして使用してはなりません（MUST NOT）；`describe(verbosity)`が診断と説明の拘束契約です。

## モジュールレイアウト

Rubyモジュールのレイアウトは上記の契約に必要な粒度で固定されています。名前はプレースホルダーであり、実装中に変更されるかもしれません（MAY）。

- `Rigor::Type`はドキュメントのみのモジュールであり、ダックタイプ契約を名付けるものでなければなりません（MUST）。具体的な型クラスは`Rigor::Type`を継承してはならず（MUST NOT）、振る舞いを得るために`Rigor::Type`を`include`してはなりません（MUST NOT）。ミックスインは狭いトレイト的な共有に使用してもかまいませんが（MAY）、部分型関係を表すための継承の代わりとして使用してはなりません（MUST NOT）。
- 具体的な型クラスは`Rigor::Type::*`以下に置かれます。正確なリストは[`docs/adr/3-type-representation.md`](../../adr/3-type-representation/)の未解決問題1に依存します。
- `Rigor::Trinary`は型ネームスペースとは別のトップレベル値オブジェクトです。制御フロー解析、プラグインのスコープクエリ、および三値確実性を返すその他のサーフェスと共有されます。
- コンビネータファクトリ（仮称`Rigor::Type::Combinator`）は正規化された構築のエントリポイントです。直接クラスコンストラクタは本番コードパスで使用してはなりません（MUST NOT）。

`sig/rigor.rbs`はサーフェスが安定したらここで説明するパブリックサーフェスと一貫した状態に保たれなければなりません（MUST）。ADR-3で追跡される最初の縦断的スライスは、対応するRBSシグネチャを導入する場所です。

## 安定性とバージョニング

このドキュメントの契約は、[`implementation-expectations.md`](../implementation-expectations/)と同じ意味で、メジャーバージョン内で安定しています。以下も追加的に安定しています：

- ケイパビリティ述語・リファインメント射影・メタ操作のリスト。
- `subtype_of`と`accepts`の結果値オブジェクトの形状。
- ファクトリ正規化ルーティング。
- ラッパー合成ルール。

以下はADR-3が昇格させるまで安定性契約の外です：

- 定数スカラー/オブジェクトキャリア形状（ADR-3の未解決問題1）。
- 三値返却メソッドの命名規約（ADR-3の未解決問題2）。
- 型仕様が要求するもの以外の`Rigor::Type::*`以下の具体的なクラスの正確なカタログ。

プラグイン作成者とエンジンコンシューマは、リストされた安定契約を拘束力があるものとして扱い、リストされた不安定な項目は最初の縦断的スライス中に精緻化の対象とされることを理解しなければなりません（MUST）。

## 関連ドキュメント

- [`docs/internal-spec/implementation-expectations.md`](../implementation-expectations/) — エンジンサーフェス契約（スコープ、ファクトストア、エフェクトモデル、ケイパビリティロール推論、正規化、RBS消去ルーティング）。
- [`docs/type-specification/relations-and-certainty.md`](../../type-specification/relations-and-certainty/) — サブタイピング、漸進的一貫性、三値セマンティクス。
- [`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/) — 束恒等式と`Dynamic[T]`代数。
- [`docs/type-specification/normalization.md`](../../type-specification/normalization/) — ファクトリルートが使用する決定論的な正規化ルール。
- [`docs/type-specification/rbs-erasure.md`](../../type-specification/rbs-erasure/) — `erase_to_rbs`を通じてルーティングされる保守的なRBS消去。
- [`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/) — `describe(verbosity)`を通じてルーティングされる診断識別子の分類と表示ルール。
- [`docs/type-specification/type-operators.md`](../../type-specification/type-operators/) — 演算子サーフェスと否定ファクト表示契約。
- [`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/) — インターフェース、オブジェクト形状、ケイパビリティロール、メンバー形状エントリ。
- [`docs/type-specification/rigor-extensions.md`](../../type-specification/rigor-extensions/) — リファインメントカタログと合成。
- [`docs/adr/3-type-representation.md`](../../adr/3-type-representation/) — このドキュメントの契約の設計根拠と未解決問題。
