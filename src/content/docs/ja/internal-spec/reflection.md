---
title: "リフレクションファサード — `Rigor::Reflection`"
description: "rigortype/rigor docs/internal-spec/reflection.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/reflection.md"
sourcePath: "docs/internal-spec/reflection.md"
sourceSha: "165fe4e4f73847c3bbeb8e6de88a8514005bc2b1a7b18aa7e39404ae5917ffff"
sourceCommit: "2a65ec8e52462c931fbfec94df68a18139259a43"
sourceDate: "2026-09-04T09:54:10+09:00"
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
- `Rigor::Reflection.project_declared_class?(class_name, scope: nil, environment: nil)` — バンドルされたcore / stdlib / gem RBSではなく、プロジェクト自身の`signature_paths:`配下にそのクラスのRBS宣言が存在する場合に`true`。この区別はAUTHORITY（権威）の区別である: バンドルされたシグネチャはプロジェクトが所有していないクラスを記述するため、それに対するプロジェクトの`def`はモンキーパッチとなる。プロジェクトのサイドカーは解析対象のまさにそのソースを記述するため、プロジェクトの別のファイル内の`def`はそのクラス自身の定義である。帰属は宣言バッファ名によって行われ、特定できない場合（ローダーがない、環境がない、バッファ名の保持以前の環境BLOBなど）は常に`false`を返さなければならない（MUST）—— フェイルソフトな回答は診断を変更しない回答である。

RBSを参照するメソッドは`scope:` **または** `environment:`の**どちらか**を受け付ける（後者は`Scope`を持たないディスパッチャー呼び出しサイト向け）;どちらも与えられないときは`Scope.empty`の環境にフォールバックする。

### ソース側の発見

- `Rigor::Reflection.discovered_class?(class_name, scope: Scope.empty)` — 解析対象ソースにクラス/モジュール宣言が含まれる場合に`true`。RBSローダーを参照しない（ユニオン（union、合併型とも）には`class_known?`を使用）。
- `Rigor::Reflection.discovered_method?(class_name, method_name, kind: :instance, scope: Scope.empty)` — `ScopeIndexer`が指定のクラスの指定のメソッドに対して一致する種類の`def`を記録した場合に`true`。背後のテーブルはメソッド名ごとに1つの値しか保持しないため、クラスの**両側**に定義された名前（`def helper`と`class << self`側の双子）は`Scope::DiscoveryIndex::METHOD_KIND_BOTH`として記録され、どちらの種類に対しても`true`を返さなければならない（MUST）—— 一方の側の種類をもう一方で上書きしてしまうライターは、実際に動作するコードに対して偽の`call.undefined-method`を生む。**ミス**は、`Analysis::DependencyRecorder`が有効なときは常にADR-46の負の依存関係`method:<Class>#<name>`（`kind: :singleton`なら`method:<Class>.<name>`）を記録しなければならない（MUST）: このファサードはプラグインのプロジェクト定義のゲートが参照する読み取りであり、寄与の層はディスパッチがエンジン自身の記録用アクセサ（`Scope#user_def_for` / `#singleton_def_for`）へ届くより前に答えるので、他の何もそのエッジを記録せず、ウォームな`--incremental`の再チェックは、プロジェクトがそのメソッドを定義した後もプラグインの答えを提供してしまう。キーの文法は`Analysis::IncrementalSession#negative_key_for`が逆変換するものである。ファイルをまたぐと、`kind: :instance`の答えがカバーするのは、インデクサーがクロスファイルのテーブルへ公開する名前だけ——アクセサ / エイリアス / `define_method`の名前とシングルトンの半分——であり、素のインスタンス`def`はそこでは意図的に差し控えられる（ADR-17のモンキーパッチの契約、`ScopeIndexer#finalize_def_index`）。したがって、プロジェクトの素のインスタンス`def`を見なければならないゲートは、この述語ではなくエンジンのディスパッチ（`Scope#user_def_for`）を参照する。その差し控えはTABLE（テーブル）に関するものであり、すべてのコンシューマーに関するものではない: レシーバーの宣言がプロジェクトのサイドカー（`project_declared_class?`）である場合、いずれの側であってもプロジェクトが自身のファイルのいずれかで定義しているメソッドに対して`call.undefined-method`を発火してはならない（MUST NOT）—— そこでの「パッチ」はそのクラス自身の2番目のファイルであり、診断が持つ`pre_eval:`のアドバイスはユーザーに自身のアプリケーションを事前評価するよう求める。トップレベルの擬似クラスはエンジンによって`method:<toplevel>#<name>`ではなく`toplevel:<name>`でキー付けされる;今日それを問い合わせる呼び出し元はない——追加する前に2つを統一すること。

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
