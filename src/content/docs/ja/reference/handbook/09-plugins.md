---
title: "プラグイン"
description: "rigortype/rigor docs/handbook/09-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/09-plugins.md"
sourcePath: "docs/handbook/09-plugins.md"
sourceSha: "fb88ecd8e72683405e70b82138b6c065b667e7cca0dd44a9291795f2ea8eb5b3"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
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
- **カスタムバリデーター** — `validate(:email, value)`は解析時に名前付きパターンに一致しないリテラルを捕捉すべきです。

これらのそれぞれに[`examples/`](https://github.com/rigortype/rigor/blob/main/examples/README.md)に実例があります。[`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md)ページは16の実例をアーキテクチャ軸（設定スキーマ、ファイルI/O、キャッシュプロデューサー、`Scope#type_of`を通じたエンジン連携、クロスプラグインファクト、戻り型コントリビューションなど）で比較し、読む順序を推奨しています。

## プラグインが今日できること

v0.1.0+プラグインコントラクト — [`docs/internal-spec/plugin.md`](../../internal-spec/plugin/)に固定されており、同ディレクトリのいくつかのスライス仕様に展開されています — はプラグインに5つの主要サーフェスを与えます:

1. **`#diagnostics_for_file(path:, scope:, root:)`** — ファイルごとの出力フック。解析されたASTを辿り、`Rigor::Analysis::Diagnostic`行の配列を返します。ランナーは各行に`source_family: "plugin.<your-id>"`をスタンプします。
2. **`#flow_contribution_for(call_node:, scope:)`** — コールサイトごとの戻り型コントリビューションフック（v0.1.1 Track 2スライス7）。プラグインはコールサイトでの推論された戻り型を命名した`Rigor::FlowContribution`バンドルを返します; 解析器のディスパッチャーはコントリビューションをマージし、マージされた戻り型をRBS宣言済みかのように使います。
3. **`Plugin::IoBoundary#read_file`** / **`#open_url`** — アクティブな`TrustPolicy`の下でサンドボックス化されたファイルおよび（v0.1.2以降）HTTPSの読み取り。プラグインがプロジェクトファイル（ルートテーブル、スキーマ、ロケールファイル）を読む、または安定したURLをフェッチする必要があるときに使います。
4. **`Plugin::Base.producer` + `#cache_for`** — プラグイン側キャッシュプロデューサー。クロスランキャッシングが欲しいほど高コストなパース/ルックアップに使います。IoBoundaryが結果を構築している間に読んだすべてのファイルのダイジェスト（およびURLのコンテンツハッシュ）で自動的に無効化されます。
5. **`Plugin::FactStore` + `#prepare(services)`** — クロスプラグインファクト公開サーフェス（v0.1.1 Track 2、ADR-9）。プラグインは`prepare`でファクトを公開します; 下流のプラグインは`services.fact_store`を通じてそれらを消費するため、プロデューサー側の解析（例: `config/routes.rb`）をすべてのコンシューマーで再利用できます。

v0.1.2リリースは4つの実例（`rigor-lisp-eval`、`rigor-pattern`、`rigor-units`、`rigor-activerecord`）を「診断専用」から「`flow_contribution_for`を通じてナロイングされた戻り型」に移行したため、プラグイン型の値へのチェーンされたコールがRBSレベルの`untyped`エンベロープではなく解析器の通常のディスパッチで解決されます。各プラグインのREADMEを参照して、それぞれがどのサーフェスをデモしているか確認してください。

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
