---
title: "プラグインの使用"
description: "rigortype/rigor docs/manual/07-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/07-plugins.md"
sourcePath: "docs/manual/07-plugins.md"
sourceSha: "99fb85648f491f054fcb3ca2bbcfc594f71e1cc4011b77fc55d528cf50c6e9d9"
sourceCommit: "568138c239ec5b7b39833ed6a2a21fd027e3d319"
sourceDate: "2026-09-11T02:06:27+09:00"
translationStatus: "translated"
sidebar:
  order: 9007
---

プラグインはRigorにフレームワーク、gem、またはアプリケーションDSLについて教えます。Railsのルートヘルパー、RSpecの`let`バインディング、dry-rbのstruct属性など、通常の推論では見えないものです。このページはプラグインの*有効化*について説明します。プラグインの作成は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`スキル](../08-skills/)でカバーされています。

## プラグインを有効化する

設定ファイルの`plugins:`キーの下にプラグインを列挙します:

```yaml
plugins:
  - rigor-activerecord
  - rigor-rspec
```

設定ファイルが存在しない場合、Rigorはプラグインなしで動作します。

各名前は`rigortype` gem内にバンドル済みのプラグインです。追加のインストールは不要です。`plugins:`の下に列挙するだけで有効化できます。設定が必要なプラグインはオブジェクト形式を使います:

```yaml
plugins:
  - gem: rigor-activerecord
    config:
      schema_file: db/schema.rb
```

## 利用可能なプラグイン

Rigorは[`plugins/`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)配下にプロダクションプラグインのカタログを同梱しています。リリース間でセットは増えます（現在のリストと各プラグインのオプションはそのディレクトリを参照してください）。現在のファミリーは以下のとおりです:

- **Rails**: `rigor-activerecord`、`rigor-actionpack`、`rigor-rails-routes`、`rigor-rails-i18n`、`rigor-actionmailer`、`rigor-activejob`、`rigor-activestorage`、`rigor-actioncable`。使いたいものを`plugins:`の下に列挙してください。Railsセットをグループとしてまとめて有効化する包括的なエントリーはありません（[ADR-96](../adr/96-plugin-target-gems/) WD3が1つ提案しています）。
- **Testing**: `rigor-rspec`、`rigor-rspec-rails`、`rigor-minitest`、`rigor-shoulda-matchers`、`rigor-factorybot`。
- **dry-rb**: `rigor-dry-types`、`rigor-dry-schema`、`rigor-dry-struct`、`rigor-dry-validation`。
- **FFI**: `rigor-ffi`およびサブプラグイン（`rigor-ffi-rzmq`、`rigor-rbnacl`、`rigor-sassc`、`rigor-ethon`）。プラグイン作者向けには、`rigor-ffi`はカスタムバインディング定義を認識するための`ffi_binding_recognizer`クラスDSLを`Rigor::Plugin::Base`上に提供します。
- **その他のエコシステム**: `rigor-sinatra`、`rigor-hanami`、`rigor-devise`、`rigor-pundit`、`rigor-sidekiq`、`rigor-graphql`、`rigor-statesman`、`rigor-sorbet`、`rigor-typescript-utility-types`、`rigor-activesupport-core-ext`。

## `plugins/` vs `examples/`

[`plugins/`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)は実際のgemとフレームワーク向けのプロダクションプラグイン（有効化するもの）を保持しています。[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)ツリーは意図的に単純化されたDSL上のチュートリアルプラグインを保持しています。プラグイン作者向けの読み物であり、実際のプロジェクトで有効化するためのものではありません。

## サンドボックス

プラグインはファイル（スキーマダンプ）を読み込んだりネットワークに接続したりしたい場合があります。それらは`plugins_io:`設定キーでゲートされています——ネットワークはデフォルトで`disabled`で、プラグインはリストしたパスのみ読み込めます。[設定](../03-configuration/)を参照してください。プラグインの読み取りが設定されたすべてのパスから外れた場合——読み取りルートが実パスを保持しているのに対してシンボリックリンクのエイリアス経由で指定されたパス（macOSの`/tmp`がその一例です）や、真にツリー外のファイルなど——Rigorはサイレントに失敗するのではなく、プラグイン名、拒否されたパス、および最も近い読み取りルートを名指しする`plugin_trust.read-refused` `:info`診断を表出します。診断の読み取りルートが表記している方法でパスを記述するか、`plugins_io.allowed_paths:`の下にそれを追加してください。

### 隔離戦略

いくつかのプラグインは、ターゲットライブラリを直接呼び出します（たとえば、ActiveSupportの実際のinflectorにクラス名の複数形化を尋ねるなど）。その呼び出しは**隔離戦略（isolation strategy）**のもとで実行され、`plugins_isolation:`設定キーまたは`RIGOR_PLUGIN_ISOLATION`環境変数で設定します:

| 値 | 振る舞い |
| --- | --- |
| `process`（デフォルト） | 呼び出しをフォークされたクラッシュ隔離ワーカーで実行し、ターゲットライブラリのモンキーパッチやあらゆるクラッシュがRigorを汚染しないようにします。`fork`が利用できない環境（Windows / JRuby）では`none`にフォールバックします。 |
| `none` | ライブラリをRigor自身のプロセスに読み込み、直接呼び出します。 |
| `ruby_box` | 実験的な`Ruby::Box`サンドボックス内で実行します。これには`RUBY_BOX=1`起動フラグが必要なので、この戦略を選ぶと`rigor`ランチャーはそのフラグを設定して自身を再実行（re-exec）します。**環境変数限定** —— 設定ファイルはRubyが起動したずっと後に読み取られるため、`plugins_isolation: ruby_box`は代わりに設定エラーとして報告されます。 |

環境変数は`plugins_isolation:`よりも優先されるため、コミットされたプロジェクトの選択を1回の呼び出しに対してオーバーライドできます。レガシーの`RIGOR_BOX`環境変数は、`RIGOR_PLUGIN_ISOLATION=ruby_box`への後方互換エイリアスです。デフォルト（`process`）はほぼすべての人にとって正しい選択です。この変数は、フォークが利用できない稀なプラットフォームや、より強い封じ込めが欲しい場合のために存在します。
