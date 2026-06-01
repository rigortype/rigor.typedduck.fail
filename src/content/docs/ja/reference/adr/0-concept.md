---
title: "ADR-0: Rigorの基盤とコアアーキテクチャ"
description: "rigortype/rigor docs/adr/0-concept.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/0-concept.md"
sourcePath: "docs/adr/0-concept.md"
sourceSha: "f2d498d41850121d8a6d1bcc004ab4ddf2b0f033e6a319ad927a3d12f660bf96"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 4000
---

## ステータス

採択済み

## コンテキスト

SorbetやSteep、RBSといったツールの登場によってRubyエコシステムが成熟するにつれ、**型推論**と<strong>実用的な<ruby>漸進的型付け<rp>（</rp><rt>gradual typing</rt><rp>）</rp></ruby></strong>を最大限に活かす静的解析器への需要が高まっています。既存のツールはアプリケーションコードに多くの型アノテーションを要求することが多く、それが人間の開発者にとっても、AIコーディングアシスタント（LLM）にとっても、ノイズになっています。さらに、Rubyの動的な性質とメタプログラミングは、従来の型チェッカーにとって依然として大きな障壁です。

次世代の静的解析ツールが必要です。AIネイティブな純粋性、ゼロランタイムオーバーヘッド、高性能なキャッシュ、そして堅牢なプラグインシステムによるメタプログラミングの実用的な解決を優先するツールです。

## 決定事項

**Rigor**（"Rigorous Inference for Ruby"）という名称で新しい静的解析ツールを構築します。設計は以下のコア原則に基づきます。

### 1. AIネイティブな純粋性とゼロランタイム依存

* **Rigor固有のインライン型DSLを持たない：** RigorはアプリケーションコードにカスタムのインラインアノテーションDSLを要求しません。既存のRBS、rbs-inline、Steep互換のアノテーションは標準的なRubyエコシステムの型ソースとして受け入れますが、RigorはRubyアプリケーション本体に独自の追加構文を持ち込みません。
* **ゼロランタイムオーバーヘッド：** Rigorは開発依存としてのみ機能します。実行時にアプリケーションにフックしません。

### 2. ハイブリッド型解決と高度な型システム

* **推論ファースト：**コアエンジンは深い制御フロー解析（CFA）とデータフロー解析に基づいて型を推定します。
* **高度な型：** Rigorはユニオン型（union type、合併型とも）、リテラル型（例：`1`、`"str"`）、仮想/精細化型（例：`non-empty-string`、`positive-int`）をサポートします。
* **外部依存はRBS経由：**標準的なgemの型は既存のRBSエコシステムを使って解決します。
* **`RBS::Extended`：**標準のRBSではまだサポートされていない高度な型を表現するため、Rigor固有のメタデータはRBSアノテーションや外部/生成済みシグネチャを通じてRBS宣言に添付します。新しいRubyコメントDSLは使いません。

### 3. PHPStanライクなプラグインアーキテクチャ

* Rubyのメタプログラミング（例：Railsの`ActiveRecord`、動的な`method_missing`）は純粋に**外部プラグイン**で処理します。
* **仮想プロトコル：** Rigorは（PHPStanと同様の）拡張APIを提供します。仮想「プロトコル」または型クラスを使うことで、プラグインが必要なフック（動的メソッド解決、戻り値型推論など）を正しく実装しているかをRigor自身が静的に検証できます。

### 4. 高性能なキャッシュとDX

* RigorはAST及び依存グラフのアグレッシブなキャッシュを実装します。
* コーディング中に即座のフィードバックを提供することが主目標です。まずは堅牢な**CLIエクスペリエンス**を優先し、LSP（Language Server Protocol）統合は後フェーズに延期します。
* **スマート初期化：** `rigor init`は`Gemfile.lock`を解析し、必要なプラグイン（Rails、RSpecなど）とプロジェクトディレクトリを自動的に提案・設定します。

### 5. MVPターゲット（CLI）

最小実行可能プロダクトは、ユニオン型に起因する潜在的な`NoMethodError`を検出するための基礎的な制御フロー解析に集中します。

**MVPの対象例：**

```ruby
# Rigor CFA must track branches and infer `v` as `Integer | String` (1 | "str")
if rand == 0
  v = 1
else
  v = "str"
end

# Rigor must report an error: Integer (1) does not respond to `upcase`
p v.upcase 
```

## 結果

* **ポジティブ：**アプリケーションコードはクリーンでAIフレンドリーな状態を保てます。プラグインアーキテクチャはコアエンジンを小さく、保守しやすく、高パフォーマンスに保ちます。CLIファーストのアプローチにより、非同期なエディタ状態を扱う前に推論エンジンが徹底的にテストされ、信頼性を確保できます。
* **ネガティブ/リスク：**制御フローグラフ（CFG）をゼロから実装する（`Prism`や`SyntaxTree`の活用が有力）には、多大な初期エンジニアリング工数が必要です。プラグインエコシステムの構築にはコミュニティの採用を促すか、当初は私たち自身でRailsなどのコアフレームワークプラグインを維持する必要があります。
