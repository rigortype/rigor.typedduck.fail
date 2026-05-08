---
title: "プラグイン"
description: "rigortype/rigor docs/handbook/09-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/09-plugins.md"
sourcePath: "docs/handbook/09-plugins.md"
sourceSha: "544fdc2a12b67f2a10ecdaf163ca64ba9fbd014cb6bc89f1dbab52d7e3b9fb2c"
sourceCommit: "b523ab36f62d89a1c16964a66864c27e3ebb0fe4"
translationStatus: "translated"
sidebar:
  order: 1009
---

これが最も短い章です。プラグインが存在する理由はひとつ: 一部のメソッドの型が、どんなRBSシグでも表現できない方法で**ランタイムでの引数のシェイプに依存する**からです。

## プラグインを使うとき

典型的なケースはドメイン固有の評価器です:

```ruby
Lisp.eval([:+, 1, 2])           # ランタイムでInteger
Lisp.eval([:<, 1, 2])           # ランタイムでbool
Lisp.eval([:if, true, "a", 0])  # ランタイムでString | Integer
```

戻り値型は引数配列の先頭のリテラルシンボルに依存します。RBSはここで`untyped`しか言えません; Rigorの推論にはどうしようもありません; `RBS::Extended`ディレクティブは引数のシェイプで変えられません**。プラグインならできます。**

プラグインのニッチに当てはまる他の形状:

- **単位DSL** — `100.kilometers / 2.hours`は`Speed`を生成しますが、Rubyのランタイムはユーザークラスを返すIntegerのメソッドとして見ます。
- **ルートヘルパー** — `users_path`はStringを返しますが、ヘルパーが存在するかどうかは解析器が読む必要があるYAMLファイルに依存します。
- **ステートマシン** — `transition_to(:foo)`は、`:foo`がどこかで宣言された`state_machine do ... end`ブロック内にある場合には有効ですが、そうでなければタイポです。
- **カスタムバリデーター** — `validate(:email, value)`はリント時に名前付きパターンに一致しないリテラルを捕捉すべきです。

これらのそれぞれに[`examples/`](https://github.com/rigortype/rigor/blob/main/examples/README.md)に実例があります。[`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md)ページは6つのプラグインをアーキテクチャ軸（設定スキーマ、ファイルI/O、キャッシュプロデューサー、`Scope#type_of`を通じたエンジン連携など）で比較し、読む順序を推奨しています。

## プラグインが今日できること

v0.1.0プラグインコントラクト — [`docs/internal-spec/plugin.md`](../../internal-spec/plugin/)に固定されており、同ディレクトリのいくつかのスライス仕様に展開されています — はプラグインに3つの主要サーフェスを与えます:

1. **`#diagnostics_for_file(path:, scope:, root:)`** — ファイルごとの出力フック。解析されたASTを辿り、`Rigor::Analysis::Diagnostic`行の配列を返します。ランナーは各行に`source_family: "plugin.<your-id>"`をスタンプします。6つの実例すべてがこのフックを使います。
2. **`Plugin::IoBoundary#read_file`** — アクティブな`TrustPolicy`の下でサンドボックス化されたファイル読み取り。プラグインがプロジェクトファイル（ルートテーブル、スキーマ、ロケールファイル）を読む必要があるときに使います。`examples/rigor-routes`が参照例です。
3. **`Plugin::Base.producer` + `#cache_for`** — プラグイン側キャッシュプロデューサー。クロスランキャッシングが欲しいほど高コストなパース/ルックアップに使います。IoBoundaryが結果を構築している間に読んだすべてのファイルのダイジェストで自動的に無効化されます。

## プラグインが今日できないこと（意図的に）

プラグインは診断を出力できますが、**呼び出し元の推論された戻り値型を置き換えることはできません**。プラグインが戻り値型バンドルを出力できるようにする`FlowContribution`ベースのプラグイン貢献サーフェスは、後のv0.1.xスライスに予定されています。それまでの間、プラグインは推論された型を`:info`診断として公開します — トレースとして有用ですが、締め付けではありません。

これはまさに、各実例の`lib/rigor/plugin/<id>.rb`ファイルの冒頭が文書化している制約です: プラグインは正しい型を見て、ユーザーは正しい診断を見ますが、解析器の内部呼び出し元推論は変わりません。v0.1.xの戻り値型貢献スライスが出荷されると、同じプラグインコードは診断の出力からFlowContributionバンドルの生成に移行し、各実例の「将来の方向性」セクション周辺の散文が実装になります。

## プラグインを書くべきか？

おそらくそうではありません — ほとんどのプロジェクトは、プラグインのニッチに達する前にRBSと`RBS::Extended`から恩恵を受けます。プラグインに手を伸ばすのは以下の場合のみです:

- ドメインDSLの型付けが引数のシェイプ、ファイルの内容、またはクロスメソッド宣言に依存している。
- アプリケーションと共にプラグインgemを保守する意欲がある。
- チームがプラグインのソースを読める — それは誰も無視できるブラックボックスではありません。

これらが当てはまるなら、[`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md)が出発点です。[`rigor-deprecations`](../../examples/rigor-deprecations/)の例は80行未満で、「最初のプラグインを書きたい」のための推奨テンプレートです。

## 次に読むもの

ハンドブックの終わりに到達しました。ここからは:

- 通読しなおすことはほとんど有用ではありません — ほとんどの読者は疑問が生じたときに特定の章に戻ります。
- [ハンドブック索引](../)には[`docs/type-specification/`](../../type-specification/)、[`docs/internal-spec/`](../../internal-spec/)、[`docs/adr/`](../adr/)のより深い素材への相互参照があります。
- [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/main/CHANGELOG.md)はいつ何が出荷されたかのリリースごとの真実です。

静的Rubyを信じる小さな、成長中のコミュニティへようこそ。
