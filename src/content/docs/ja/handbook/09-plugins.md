---
title: "プラグイン"
description: "rigortype/rigor docs/handbook/09-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/09-plugins.md"
sourcePath: "docs/handbook/09-plugins.md"
sourceSha: "3a5548ab0a7cd186d5292abd3f83e9990194727b9523a565203047227ab32ff9"
sourceCommit: "e3eb424c3c88035e453246710c8df3dc5cc8e7e1"
translationStatus: "translated"
sidebar:
  order: 1009
---

プラグインが存在する理由はひとつ: 一部のメソッドの型が、どんなRBSシグでも表現できない方法で**ランタイムでの引数のシェイプ（shape）に依存する**からです。この章は、それがプラグインに値するのはいつか、そして値しないのはいつかを判断する助けになります。

この章はプラグインの*作成*は教え**ません**。それは[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)にあります。6個のチュートリアルウォークスルーで、それぞれが1つの拡張サーフェスにスポットを当てています。実際のフレームワーク向けのすぐにインストールできるgemは[`plugins/`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)にあり、その有効化は[マニュアル: プラグインの使用](../../manual/07-plugins/)です。プラグインが必要かどうかを判断するには読み進めてください;書きたくなったら`examples/`へ進んでください。

## プラグインを使うとき

典型的なケースはドメイン固有の評価器です:

```ruby
Lisp.eval([:+, 1, 2])           # ランタイムでInteger
Lisp.eval([:<, 1, 2])           # ランタイムでbool
Lisp.eval([:if, true, "a", 0])  # ランタイムでString | Integer
```

戻り値型は引数配列の先頭のリテラルシンボルに依存します。RBSはここで`untyped`しか言えません; Rigorの推論にはどうしようもありません; `RBS::Extended`ディレクティブは引数のシェイプで変えられません。**プラグインならできます**。

プラグインのニッチに当てはまる他の形状:

- **単位DSL**: `100.kilometers / 2.hours`は`Speed`を生成しますが、Rubyのランタイムはユーザークラスを返すIntegerのメソッドとして見ます。
- **ルートヘルパー**: `users_path`はStringを返しますが、ヘルパーが存在するかどうかは解析器が読む必要があるYAMLファイルに依存します。
- **ステートマシン**: `transition_to(:foo)`は、`:foo`がどこかで宣言された`state_machine do ... end`ブロック内にある場合には有効ですが、そうでなければタイポです。
- **カスタムバリデーター**: `validate(:email, value)`は解析時に名前付きパターンに一致しないリテラルを捕捉すべきです。

これらのそれぞれに[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)に実例があります。[`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)ページは6の実例をアーキテクチャ軸（設定スキーマ、ファイルI/O、キャッシュプロデューサー、`Scope#type_of`を通じたエンジン連携、クロスプラグインファクト（fact）、戻り値型コントリビューションなど）で比較し、読む順序を推奨しています。

## 2つの作成パス

> まだここにいますか？ ほとんどの読者はまず[プラグインを書くべきか？](#プラグインを書くべきか)へ飛ぶべきです。答えはたいてい「いいえ、RBSと`RBS::Extended`で事足ります」です。以下は、「はい」のときのためのものです。

他のすべてを形づくる決定は、あなたのDSLが2つの作成パスの*どちら*に該当するかです。

**宣言する**。 DSLがリテラルシンボル引数を伴うクラスレベルの呼び出し ── Railsスタイルの`has_one_attached`、dry-structの`attribute`、Deviseの`devise :strategy`、Sinatraの`get "/foo" do … end` ── なら、**マクロ展開基板**（[ADR-16](../../adr/16-macro-expansion/)）はすでにその形状を知っています。呼び出しを記述するマニフェストエントリーを書けば、基板がリテラルシンボル抽出、名前補間、メソッドごとの合成を行います。このパス上のバンドルされた3つのプラグインは、ASTウォーキングをまったく伴わない60〜110行の宣言的なRubyです。基板は`ActiveSupport::Concern`の遅延された`included do … end`ブロックも理解するので、concern内に書かれたDSL呼び出しは、concernではなくそれをincludeするクラスに届きます。

**歩く**。型が、呼び出しの形状からは分からない何か ── 引数の*値*（上記の`Lisp.eval`）、プロジェクトの別の場所でなされた宣言、またはルートテーブルやスキーマダンプのような外部ファイルの内容 ── に依存するなら、代わりにウォーカーを書きます。そしてプラグイン契約（contract）がそのためのフックを与えます: ファイルごとの出力パス、コールサイトごとの戻り値型とフローナローイング（narrowing）のコントリビューション、トラストポリシー下でのサンドボックス化されたファイルおよびHTTPS読み取り、高コストなパースのためのキャッシュされたプロデューサー、そして1つのプラグインのパースが別のプラグインのチェックを養うクロスプラグインファクト（fact）ストア。

2つのパスは共存します ── 1つのプラグインが基板エントリーを宣言し*かつ*ファイルを歩けます ── そして次にどこへ進むかは、どちらが必要かによります:

- [`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md): 6つのウォークスルー。それぞれが1つの契約サーフェス（surface）にスポットを当て、どの実例がどれをデモするかのマップ付き。
- [`docs/internal-spec/plugin.md`](../../internal-spec/plugin/): 拘束力を持つプラグイン契約 ── マニフェスト、フック、サービス、レジストリ、ロード順。その兄弟[`plugin-trust.md`](../../internal-spec/plugin-trust/)と[`plugin-cache-producers.md`](../../internal-spec/plugin-cache-producers/)がI/Oとキャッシュのサーフェスを扱います。
- [`docs/internal-spec/macro-substrate.md`](../../internal-spec/macro-substrate/): 基板のティア、各ティアが宣言するマニフェストフィールド、そして各ティアがどれだけの戻り値型の精度を回復するか。
- [マクロ展開ライブラリサーベイ](../../notes/20260515-macro-expansion-library-survey/): どの実際のRubyライブラリがどのティアに収まり、どのライブラリが基板のスコープ外に完全に該当するか。

## プラグインを書くべきか？

おそらくそうではありません。ほとんどのプロジェクトは、プラグインのニッチに達する前にRBSと`RBS::Extended`から恩恵を受けます。プラグインに手を伸ばすのは以下の場合のみです:

- ドメインDSLの型付けが引数のシェイプ、ファイルの内容、またはクロスメソッド宣言に依存している。
- アプリケーションと共にプラグインgemを保守する意欲がある。
- チームがプラグインのソースを読める。それは誰も無視できるブラックボックスではありません。

これらが当てはまるなら、[`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)が出発点です。[`rigor-deprecations`](https://github.com/rigortype/rigor/tree/master/examples/rigor-deprecations/)の例は80行未満で、「最初のプラグインを書きたい」のための推奨テンプレートです。

## 次に読むもの

プロジェクトが[Sorbet](https://sorbet.org/)を使っているなら、[次の章](../10-sorbet/)で`rigor-sorbet`アダプタを扱います。Rigorは`sig { ... }`ブロック、RBIファイル、`T.let` / `T.cast` / `T.must` / `T.unsafe`アサーションを型ソースとして読み取るので、`srb tc`と並行して`rigor check`を実行し始めるためにRBSで何かを書き直す必要はありません。Sorbetを使っていないなら、第10章は読み飛ばして問題ありません。

ここからは:

- 通読しなおすことはほとんど有用ではありません。ほとんどの読者は疑問が生じたときに特定の章に戻ります。
- [ハンドブック索引](../)には[`docs/type-specification/`](../../type-specification/)、[`docs/internal-spec/`](../../internal-spec/)、[`docs/adr/`](../adr/)のより深い素材への相互参照があります。
- [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)はいつ何が出荷されたかのリリースごとの真実です。

静的Rubyを信じる小さな、成長中のコミュニティへようこそ。
