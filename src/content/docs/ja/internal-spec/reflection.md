---
title: "リフレクションファサード — `Rigor::Reflection`"
description: "rigortype/rigor docs/internal-spec/reflection.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/reflection.md"
sourcePath: "docs/internal-spec/reflection.md"
sourceSha: "dd416d51adffd0c0a4a0ccbdc9523dde865c7c842298287a022636594166f3a6"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-09T19:49:45+09:00"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**パブリック読み取り形状、v0.0.7で実装されて以来不変**。このモジュールはRigorの3つのリフレクションソースに対する統合された読み取り側ファサードです；[`docs/design/20260505-v0.1.0-readiness.md`](../../design/20260505-v0.1.0-readiness/)に従い、ファサードの実装はv0.1.0準備のための最もレバレッジの高いコールドスタートスライス（slice）でした。v0.1.0プラグインAPIはこれを基盤に設計されましたが、§「将来の進化」がそのリリースで見込んでいた3つの拡張のいずれも実装されていません——そこにあるマーカーを参照してください。

このモジュールは**読み取り専用で追加的**です。`Rigor::Scope`や`Rigor::Environment::RbsLoader`から直接読み込む既存の呼び出しサイトは変更なく動作し続けます；それらは自分たちのペースでファサードに移行します。

## 結合されるリフレクションソース

| ソース | 提供するもの | 変更可能性 |
| --- | --- | --- |
| `Rigor::Environment::ClassRegistry` | 起動時に登録されたRubyの`Class`/`Module`オブジェクト（Integer・Float・Set・Pathname等）。 | `rigor check`実行中は静的。 |
| `Rigor::Environment::RbsLoader` | RBS側の宣言：インスタンス/シングルトンメソッド・クラス階層・定数。 | プロジェクトの`sig/`ディレクトリとバンドルされた標準ライブラリRBSからオンデマンドで読み込まれる。 |
| `Rigor::Scope`で発見されたファクト（fact） | `Rigor::Inference::ScopeIndexer`によるソース側の発見：ユーザー定義のクラス/モジュール・ソース内定数・発見されたメソッドノード・クラスのインスタンス変数/クラス変数宣言。 | スコープごと；推論エンジンを通じてスレッド化される。 |

ファサードはキャッシュなしでこれらのソースを結合します；基底ソースは重要な箇所でキャッシュ済みです（`RbsLoader`はクラス定義をメモ化；`ClassRegistry`は定数；`Scope`は不変値オブジェクト）。

## パブリックAPI（v0.0.7初回実装）

### 存在確認と順序付け

- `Rigor::Reflection.class_known?(class_name, scope: Scope.empty)` — いずれかのソースがそのクラス/モジュール名を認識する場合に`true`。
- `Rigor::Reflection.class_ordering(lhs, rhs, scope: Scope.empty)` — 2つのクラス名の順序関係を`:equal` / `:subclass` / `:superclass` / `:disjoint` / `:unknown`で返す。`Environment#class_ordering`に委譲。

### 型キャリア

- `Rigor::Reflection.nominal_for_name(class_name, scope: Scope.empty)` — クラス名の`Rigor::Type::Nominal`、またはいずれのソースもクラスを知らない場合は`nil`。
- `Rigor::Reflection.singleton_for_name(class_name, scope: Scope.empty)` — クラス名のクラスオブジェクトの`Rigor::Type::Singleton`、または`nil`。

### 定数

- `Rigor::Reflection.constant_type_for(constant_name, scope: Scope.empty)` — 名前付き定数の型。ソース内定数（`ScopeIndexer`が記録）とRBS側定数を結合する。**競合時はソース内が優先**（ユーザーのソースが権威ある宣言のため）。

### メソッド

- `Rigor::Reflection.instance_method_definition(class_name, method_name, scope: nil, environment: nil)` — インスタンスメソッドのRBSの`RBS::Definition::Method`、またはクラスやメソッドがRBSにない場合は`nil`。
- `Rigor::Reflection.singleton_method_definition(class_name, method_name, scope: nil, environment: nil)` — RBS側のシングルトン（クラス側）メソッド定義、または`nil`。
- `Rigor::Reflection.instance_definition(class_name, scope: nil, environment: nil)` — インスタンス側の完全な`RBS::Definition`（メソッドテーブル / メンバーリスト全体）、または`nil`。1メソッドではなくクラスを歩く呼び出し元向け。
- `Rigor::Reflection.singleton_definition(class_name, scope: nil, environment: nil)` — シングルトン側の完全な`RBS::Definition`、または`nil`。
- `Rigor::Reflection.class_type_param_names(class_name, scope: nil, environment: nil)` — RBS宣言された型パラメータ名を`Array<Symbol>`で（例: `Array[Elem]`なら`[:Elem]`）、非ジェネリックまたは未知のクラスなら`[]`。ジェネリックなメソッド型を具体的なレシーバーにバインドするときに使う。
- `Rigor::Reflection.project_declared_class?(class_name, scope: nil, environment: nil)` — バンドルされたcore / stdlib / gem RBSではなく、プロジェクト自身の`signature_paths:`配下にそのクラスのRBS宣言が存在する場合、またはそのクラスのすべての宣言がそこにあるか`rigor-rbs-inline`のようなソースRBSシンセサイザ（[#1934](https://github.com/rigortype/rigor/issues/1934)）によってプロジェクト自身のソースから合成された場合に`true`。インライン注釈付きファイルが再オープンするバンドルクラスは、そのバンドルされた宣言を保持し、対象外にとどまる。この区別はAUTHORITY（権威）の区別である: バンドルされたシグネチャはプロジェクトが所有していないクラスを記述するため、それに対するプロジェクトの`def`はモンキーパッチとなる。プロジェクトのサイドカーは解析対象のまさにそのソースを記述するため、プロジェクトの別のファイル内の`def`はそのクラス自身の定義である。帰属は宣言バッファ名によって行われ、特定できない場合（ローダーがない、環境がない、バッファ名の保持以前の環境BLOBなど）は常に`false`を返さなければならない（MUST）—— フェイルソフトな回答は診断を変更しない回答である。

RBSを参照するメソッドは`scope:` **または** `environment:`の**どちらか**を受け付ける（後者は`Scope`を持たないディスパッチャー呼び出しサイト向け）;どちらも与えられないときは`Scope.empty`の環境にフォールバックする。

### ソース側の発見

- `Rigor::Reflection.discovered_class?(class_name, scope: Scope.empty)` — 解析対象ソースにクラス/モジュール宣言が含まれる場合に`true`。RBSローダーを参照しない（ユニオン（union、合併型とも）には`class_known?`を使用）。
- `Rigor::Reflection.discovered_method?(class_name, method_name, kind: :instance, scope: Scope.empty)` — `ScopeIndexer`が指定のクラスの指定のメソッドに対して一致する種類の`def`を記録した場合に`true`。背後のテーブルはメソッド名ごとに1つの値しか保持しないため、クラスの**両側**に定義された名前（`def helper`と`class << self`側の双子）は`Scope::DiscoveryIndex::METHOD_KIND_BOTH`として記録され、どちらの種類に対しても`true`を返さなければならない（MUST）—— 一方の側の種類をもう一方で上書きしてしまうライターは、実際に動作するコードに対して偽の`call.undefined-method`を生む。**ミス**は、`Analysis::DependencyRecorder`が有効なときは常にADR-46の負の依存関係`method:<Class>#<name>`（`kind: :singleton`なら`method:<Class>.<name>`）を記録しなければならない（MUST）: このファサードはプラグインのプロジェクト定義のゲートが参照する読み取りであり、寄与の層はディスパッチがエンジン自身の記録用アクセサ（`Scope#user_def_for` / `#singleton_def_for`）へ届くより前に答えるので、他の何もそのエッジを記録せず、ウォームな`--incremental`の再チェックは、プロジェクトがそのメソッドを定義した後もプラグインの答えを提供してしまう。キーの文法は`Analysis::IncrementalSession#negative_key_for`が逆変換するものである。ファイルをまたぐと、`kind: :instance`の答えがカバーするのは、インデクサーがクロスファイルのテーブルへ公開する名前だけ——アクセサ / エイリアス / `define_method`の名前とシングルトンの半分——であり、素のインスタンス`def`はそこでは意図的に差し控えられる（ADR-17のモンキーパッチの契約、`ScopeIndexer#finalize_def_index`）。したがって、プロジェクトの素のインスタンス`def`を見なければならないゲートは、この述語ではなくエンジンのディスパッチ（`Scope#user_def_for`）を参照する。その差し控えはTABLE（テーブル）に関するものであり、すべてのコンシューマーに関するものではない: レシーバーの宣言がプロジェクトのサイドカーまたはプロジェクトのインライン注釈（`project_declared_class?`）である場合、いずれの側であっても、プロジェクトが`def`または`alias_method`のどちらで定義しているかに関わらず自身のファイルのいずれかで定義しているメソッドに対して`call.undefined-method`を発火してはならない（MUST NOT）—— そこでの「パッチ」はそのクラス自身の2番目のファイルであり、診断が持つ`pre_eval:`のアドバイスはユーザーに自身のアプリケーションを事前評価するよう求める。トップレベルの擬似クラスはエンジンによって`method:<toplevel>#<name>`ではなく`toplevel:<name>`でキー付けされる;今日それを問い合わせる呼び出し元はない——追加する前に2つを統一すること。
- `Rigor::Reflection.project_method_defined(class_name, method_name, kind:, source:, scope:)` → `Rigor::Trinary`（ADR-128 WD1）— プロジェクトが`class_name`またはプロジェクト自身が宣言する祖先上で`method_name`を定義しているか。`kind:`は`:instance`または`:singleton`であり、それぞれ独自のチェーンを歩く；それ以外の値は`ArgumentError`を送出し、未知の`source:`も同様である。`source:`はウォークそのものを既存の順序と決着規則ごと指定する：
  - `:def` — 最初のプロジェクト`def`（`Scope#user_def_through_ancestors`；`kind: :singleton`なら`Scope#singleton_def_through_ancestors`）。`attr_*`や`define_method`は数えない。
  - `:discovered` — 発見テーブル（`Scope#discovered_method_through_ancestors?`）。こちらは`attr_*`や`define_method`も数える。
  - `:either` — 3値ORとしての両者の和集合：`yes`が勝ち、次に`maybe`、次に`no`。

  ウォークが定義元を見つけた場合は`yes`、見つからずかつその`ResolutionChain`が打ち切られなかった場合は`no`、定義元が見つかる前にチェーンがバジェット（ADR-41 WD4）で打ち切られた場合は`maybe`を返す；打ち切られたチェーンの内側で見つかった定義元は依然として`yes`である。`:discovered`ウォーク（したがって`:either`も）は、定義元が見つからなかったものの、歩いたチェーン上のエントリーが歩いた側のオープン名マーク——`ENVELOPE_OPEN_NAMES_MARK`、または`kind: :instance` / `:singleton`に対する`ENVELOPE_OPEN_INSTANCE_NAMES_MARK` / `ENVELOPE_OPEN_SINGLETON_NAMES_MARK`、すなわち`call.undefined-method`がオープンな側として読み取るマーク：スプラットされた`Struct.new(*FIELDS)`、`attr_accessor(*NAMES)`、計算された名前での`define_method`はいずれのテーブルにも載らない名前を定義する（[#2968](https://github.com/rigortype/rigor/issues/2968)）——を持つ場合も`maybe`を返す。`kind: :instance`については、歩いたチェーンがいずれのテーブルにも名前がないモジュールをミックスインしている場合（チェーン上の`ResolutionChain#unnamed_mixin?`、または外部エントリーとしてその上に載るプロジェクトクラス自身のチェーン上のそれ：`Scope::DiscoveryIndex.unnamed_mixin_on_chain?`；`include(*MODS)`、`include helper`、フックの`base.include`）も、そのモジュールがその名前を定義している可能性があるため`maybe`を返す（[#2994](https://github.com/rigortype/rigor/issues/2994)）。エンジンのトップレベル`def`拒否権も同じマークを読むため、この`maybe`で引き下がるプラグインは呼び出しをトップレベル`def`に渡さない。既存の2つのウォークは打ち切りを異なる形で解釈しており——defウォークは不在（`[nil, nil]`）、発見ウォークは存在（`true`）——そのまま維持する。呼び出し元は`:def`に対して`yes?`を、`:discovered`と`:either`に対して`!no?`をテストすることで、それぞれのウォークの解釈を保つ。`nil`の`class_name`は`no`を返す。`Analysis::DependencyRecorder`が有効な間のミス読み取りは、歩いたチェーン上のすべてのプロジェクトエントリーについてADR-46の負の依存関係`method:<Entry>#<name>`（シングルトンチェーン上のクラスオブジェクトには`method:<Entry>.<name>`；そこにあるモジュールはインスタンスメソッドで答えるため`#`）および`class:<Entry>`を、またすべてのEXTERNALエントリー——プロジェクトがメソッドなしで宣言している、まだ宣言していない、またはRBSから取得している祖先——について`class:<記述された名前の最後のセグメント>`（その名前を新たに宣言するファイルが発火するキー）を記録しなければならない（MUST）。これは上記の`discovered_method?`が単一クラスに対して行うことをチェーンに広げたものである：`no`を読んだプラグインのゲートはその答えを、後の編集でチェーン上にそのメソッドが定義されるか、新しいファイルがその上のクラスまたはモジュールを宣言もしくは再オープンするまで保持し、そのときウォームな`--incremental`実行は再チェックしなければならない（#2689）。`:def`ウォークはこれらを`Scope#user_def_for` / `#singleton_def_for`、`ResolutionChain#settle`および`ResolutionChain#record_external_absence`を通じて記録し、`:discovered`ウォークは`Scope#discovered_method_through_ancestors?`を通じて記録する。後者はヒット時には何も記録しない：存在は和集合であるため、他のどのエントリーがメソッドを獲得しても、見つかった答えは覆らない。
- `Rigor::Reflection.rbs_method_defined(class_name, method_name, kind:, scope:)` → `Rigor::Trinary` — RBSが`class_name`上またはそのプロジェクト祖先が到達する祖先上で`method_name`を宣言しているか。プロジェクトクラスがそれ自体RBSに載ることはまれであるため、その名前をキーとする上記のRBS読み取りはRBS既知のスーパークラスやモジュールから継承するものを見落とす（`class ArticlesController < ActionController::Base`）。これは`project_method_defined`と同じ`ResolutionChain`を歩き、各エントリー——外部エントリーについてはすべての候補スペリング——について、そのエントリーが位置する側のRBSに問い合わせる。いずれかのエントリーのRBSが宣言していれば`yes`、いずれも宣言せずチェーンが打ち切られなかった場合は`no`、その前にチェーンがバジェット（ADR-41 WD4）で打ち切られた場合は`maybe`。`kind:`は`:instance`または`:singleton`であり、それ以外の値は`ArgumentError`を送出する；`nil`の`class_name`は`no`を返す。このウォークは`ResolutionChain#search`のADR-46エッジを記録する。
- `Rigor::Reflection.ancestry_reaches(class_name, ancestor_names, kind:, scope:)` → `Rigor::Trinary` — `class_name`のプロジェクト祖先が`ancestor_names`（修飾名；先頭の`::`は無視される）のいずれかに到達するか。外部祖先は任意の候補スペリングでカウントされるため、プロジェクトが名前を挙げているが宣言していないスーパークラス（RBSが読み込まれていない`ActionController::Base`）も見つかる。`Trinary`、`kind:`および記録の仕様は`rbs_method_defined`と同じである。
- `Rigor::Reflection.class_declarations_in(root) { |declared_call| … }` → `Array[Rigor::Reflection::ClassDeclaration]`（#2708）— パースされたファイルの`Prism::Node`（`Prism.parse(source).value`）に対する、プラグイン向けのファイルごとの宣言ウォーク。これはプラグインが到達できない内部の`Rigor::Inference::DeclarationWalk`のパブリックな顔である。
  - その本体に修飾名が到達する各`class`ヘッダーは、ソース順に`ClassDeclaration`をyieldする：`name`（本体がキー付けされる`Module.nesting`的に正しい修飾名、空になることはない）、`nesting`（ヘッダーが書かれた場所の`Module.nesting`、最も内側が先頭、クラス自身は含まない；トップレベルでは`[]`；freezeされたArray）、および`node`（`Prism::ClassNode`）。ファイル内で再オープンされたクラスはヘッダーごとに1回現れる。`module`、`class << self`、および名前が到達しないクラス（`Class.new { … }`、`class << self`配下のヘッダー）は何もyieldしない。ベースが動的であり定数でも`self`でもないヘッダー（`class foo::Bar`、`class Foo.bar::Baz`）については、`name`、`nesting`、およびその本体内の呼び出しの所有者は未指定である：Rubyが`#<Module:…>::Bar`と名付けるところを、現在エンジンは緩やかなレンダリングで名付けているが（`Outer::Bar`、またはトップレベルでは`Bar`）、後のリリースでそのようなヘッダーを取り下げる（「名前が到達しない」）可能性がある。現在の名前を固定するスペックはない。モジュールはこの配列ではなく別のメソッドとして登場することになる。
  - ブロック付きの場合、このウォークは宣言ウォークが訪れる各呼び出しについても`DeclaredCall`（`node`: `Prism::CallNode`；`owner`: 呼び出しが字句的に内包されている最も内側の`class` / `module`の修飾名、または該当がない場合は`nil` — トップレベル、または`class << self`本体内の裸のヘッダー配下）を外側の呼び出しから内側の呼び出しの順にyieldする。ブロックは文の中および`class` / `module` / `class << self`とブロックの本体内の呼び出しを見る。所有者は`self`ではなく字句的なものである：`class << self`内または`Class.new { … }`ブロック内の呼び出しはその周囲のクラスを報告する。ブロックなしの場合、呼び出しはディスパッチされない。
  - ブロックはファイルの**すべての**呼び出しノードを見るわけではない。以下は決して見ない：`class` / `module`ヘッダー自身の式の中にある呼び出し（`class Foo < Struct.new(:a)`のようなスーパークラスや、`class foo::Bar`のような定数パス）、定数書き込みが束縛するファクトリー呼び出し（`K = Class.new { … }`。そのレシーバー・引数・ブロック本体は歩かれる）、そのような書き込みの末尾（`K = Class.new { x }.freeze`は`freeze`ではなく`x`をyieldする）、および書き込みターゲットの定数パスの親（`P::K = …`における`P`）。これらの位置は`spec/rigor/reflection_class_declarations_in_spec.rb`でピン留めされており、これらをyieldするとこの上に構築されたプラグインが見るものが変わってしまう。
  - ウォークのコンテキスト規則（`self`、cref、eval系およびファクトリーブロック、`Module.nesting`）はエンジンのものである；ファサードはその答えのみを公開し、`DeclarationWalk::Context`、`Collector`、および`DESCEND` / `DECLINE`定数のいずれも公開しない。後から`DeclaredCall`に追加されるフィールド（本体、`def`、`class << self`などの呼び出しサイトコンテキスト）は、`node`と`owner`を読み取る呼び出し元を壊さない。

## 来歴

APIの来歴側（どのソースファミリーが各ファクトを提供したか）はv0.0.7の初回実装の**スコープ外**であり、いまだ実装されていません——それはプラグインAPIの別の関心事となるはずでした。ADR-2 §「プラグイン診断来歴」と、プラグイン作成者が診断説明のために来歴を必要とするまでファサードを狭く保つというreadiness分析の推奨に従います。どのプラグイン作成者も要望していないため、ファサードはいまだ狭いままです；§「将来の進化」のマーカーを参照してください。

## 安定性

ファサードのメソッドシグネチャはv0.0.xのパブリック読み取り形状として安定しています。新しいメソッドの追加は追加的な変更です；既存のメソッドの名称変更や削除はメジャーまたはマイナーバージョンバンプが必要な破壊的変更です。

基底の真実ソースのディスパッチは予告なく変更される可能性があります。例えば、`constant_type_for`のソース内対RBS優先ルールは文書化された契約（contract）であり安定を保ちます；各ソースが内部的にルックアップをキャッシュする方法はそうではありません。

## 将来の進化

> **ステータス — 以下の3つの軸はいずれも（本稿執筆時点で）実装されていない**。これらはv0.1.0プラグインAPIで見込まれていたが、そのリリースは過ぎ去り、`lib/rigor/reflection.rb`はいまだ来歴サーフェスも、Rigor側の`MethodDefinition`キャリアも、キャッシュスライスディスクリプタも持たない。これらは契約ではなく意図としてここに記録される——このドキュメントに対して実装する読者（特に`rigor-rs`ポート）はそれらを期待してはならない。[ADR-92](../../adr/92-normative-status-fidelity/) WD2に従い、意図は削除ではなくマークされる。

3つの軸が[`docs/design/20260505-v0.1.0-readiness.md`](../../design/20260505-v0.1.0-readiness/)で言及されました：

- **来歴** — すべての読み込みが`(value, source_family)`ペアを返すため、プラグイン診断がファクトがソース/RBS/生成済み/プラグインのどこから来たかを説明できます。
- **統合された`MethodDefinition`キャリア** — `instance_method_definition`は生の`RBS::Definition::Method`を返します；この軸はソースの`def`ノード・RBSシグネチャ・プラグインの動的メンバーを1つの形状に結合するRigor側のキャリア（carrier）でした。
- **キャッシュスライスディスクリプタ** — 各読み込みがADR-2 §「キャッシュ無効化には宣言的なAPIが必要」の型付きスロットスキーマから導出されたキャッシュキーを返すまたは受け取るため、リフレクションルックアップに依存するプラグインファクトは基底ソースが変更されたときに正しく無効化されます。

これらはv0.0.x契約の一部ではありません。
