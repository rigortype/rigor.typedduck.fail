---
title: "Reflection Facade — `Rigor::Reflection`"
description: "Imported from rigortype/rigor docs/internal-spec/reflection.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/reflection.md"
sourcePath: "docs/internal-spec/reflection.md"
sourceSha: "adf951b9848aecc184b87b72fde2d70a8a508c2620b17fa824b3499460c0afdf"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**パブリック読み取り形状（v0.0.7）**。このモジュールはRigorの3つのリフレクションソースに対する統合された読み取り側ファサードです。v0.1.0プラグインAPIが設計される基盤となります；[`docs/design/20260505-v0.1.0-readiness.md`](../../design/20260505-v0.1.0-readiness/)に従い、ファサードの実装はv0.1.0準備のための最もレバレッジの高いコールドスタートスライスでした。

このモジュールは**読み取り専用で追加的**です。`Rigor::Scope`や`Rigor::Environment::RbsLoader`から直接読み込む既存の呼び出しサイトは変更なく動作し続けます；それらは自分たちのペースでファサードに移行します。

## 結合されるリフレクションソース

| ソース | 提供するもの | 変更可能性 |
| --- | --- | --- |
| `Rigor::Environment::ClassRegistry` | 起動時に登録されたRubyの`Class`/`Module`オブジェクト（Integer・Float・Set・Pathname等）。 | `rigor check`実行中は静的。 |
| `Rigor::Environment::RbsLoader` | RBS側の宣言：インスタンス/シングルトンメソッド・クラス階層・定数。 | プロジェクトの`sig/`ディレクトリとバンドルされた標準ライブラリRBSからオンデマンドで読み込まれる。 |
| `Rigor::Scope`で発見されたファクト | `Rigor::Inference::ScopeIndexer`によるソース側の発見：ユーザー定義のクラス/モジュール・ソース内定数・発見されたメソッドノード・クラスのインスタンス変数/クラス変数宣言。 | スコープごと；推論エンジンを通じてスレッド化される。 |

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

- `Rigor::Reflection.instance_method_definition(class_name, method_name, scope: Scope.empty)` — インスタンスメソッドのRBSの`RBS::Definition::Method`、またはクラスやメソッドがRBSにない場合は`nil`。
- `Rigor::Reflection.singleton_method_definition(class_name, method_name, scope: Scope.empty)` — RBS側のシングルトン（クラス側）メソッド定義、または`nil`。

### ソース側の発見

- `Rigor::Reflection.discovered_class?(class_name, scope: Scope.empty)` — 解析対象ソースにクラス/モジュール宣言が含まれる場合に`true`。RBSローダーを参照しない（ユニオンには`class_known?`を使用）。
- `Rigor::Reflection.discovered_method?(class_name, method_name, kind: :instance, scope: Scope.empty)` — `ScopeIndexer`が指定のクラスの指定のメソッドに対して一致する種類の`def`を記録した場合に`true`。

## 来歴

APIの来歴側（どのソースファミリーが各ファクトを提供したか）はv0.0.7の初回実装の**スコープ外**です。v0.1.0のプラグインAPIはそれを別の関心事として追加します——ADR-2 §「プラグイン診断来歴」と、プラグイン作成者が診断説明のために来歴を必要とするまでファサードを狭く保つというreadiness分析の推奨に従います。

## 安定性

ファサードのメソッドシグネチャはv0.0.xのパブリック読み取り形状として安定しています。新しいメソッドの追加は追加的な変更です；既存のメソッドの名称変更や削除はメジャーまたはマイナーバージョンバンプが必要な破壊的変更です。

基底の真実ソースのディスパッチは予告なく変更される可能性があります。例えば、`constant_type_for`のソース内対RBS優先ルールは文書化されたコントラクトであり安定を保ちます；各ソースが内部的にルックアップをキャッシュする方法はそうではありません。

## 将来の進化

v0.1.0プラグインAPIはこのモジュールを[`docs/design/20260505-v0.1.0-readiness.md`](../../design/20260505-v0.1.0-readiness/)で言及される3つの軸に沿って拡張します：

- **来歴** — すべての読み込みが`(value, source_family)`ペアを返すため、プラグイン診断がファクトがソース/RBS/生成済み/プラグインのどこから来たかを説明できます。
- **統合された`MethodDefinition`キャリア** — 現在`instance_method_definition`は生の`RBS::Definition::Method`を返します；v0.1.0はソースの`def`ノード・RBSシグネチャ・プラグインの動的メンバーを1つの形状に結合するRigor側のキャリアを導入します。
- **キャッシュスライスディスクリプタ** — 各読み込みがADR-2 §「キャッシュ無効化には宣言的なAPIが必要」の型付きスロットスキーマから導出されたキャッシュキーを返すまたは受け取るため、リフレクションルックアップに依存するプラグインファクトは基底ソースが変更されたときに正しく無効化されます。

これらはv0.0.xコントラクトの一部ではありません。
