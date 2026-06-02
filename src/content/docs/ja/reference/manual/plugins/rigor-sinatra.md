---
title: "rigor-sinatra"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-sinatra.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-sinatra.md"
sourcePath: "docs/manual/plugins/rigor-sinatra.md"
sourceSha: "dc34f16246a30cfe55a071c8188def6736176d3cd57bfe8277a4dfec0d5403b5"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`Sinatra::Base`のサブクラス上でSinatraのクラスレベルのルートDSL（`get` / `post` / `put` / `delete` / `head` / `options` / `patch` / `link` / `unlink`）を認識し、ルートブロックの`self`をナローイング（narrowing）します。これにより、素のヘルパー ── `params`、`redirect`、`halt`、`session`、`headers`、`content_type`、`erb`、`status`、`body`、… ── が未解決のままにならず、`Sinatra::Base`のRBSを通じて解決されます。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-sinatra
```

## 何をするか

```ruby
class MyApp < Sinatra::Base
  get "/users/:id" do
    halt 404 unless params["id"]
    redirect "/users/#{params['id']}/profile"
  end
end
```

ルートブロックの内側では`self`が`MyApp`（`Sinatra::Base`を継承）にナローイングされるため、`params` / `redirect` / `halt`は通常のRBSチェーンを通じて解決されます。このプラグインがないと、ブロック本体は`Singleton[MyApp]`として型付けされ、ブロックごとの解決が失われます。

ヘルパーが解決されるには、Sinatra自身のRBSが利用可能である必要があります ── RigorのBundler認識、ベンダリングしたsig、または（デモでは）ローカルのスタブを通じて。

## diagnosticなし、設定なし

このプラグインはルートのシェイプ（shape）を認識して`self`をナローイングするだけです。diagnosticは発行せず、設定キーも持ちません（verbのマッチテーブルはマニフェストで固定されています）。

## 制限事項

- **ルーティングのdiagnosticはなし** ── パスパターンの一意性、衝突検出、名前付きルートの逆引きは対象外です。
- **`helpers do … end`**ブロック（インスタンスメソッドを注入する）は扱われません（これはこのTier AのシェイプではなくTier B / Cの作業です）。
- **`configure` / `set`の設定DSL**は扱われません。
- **クラシックスタイルのトップレベルルート** ── `class < Sinatra::Base`で囲まれていない素の`get '/x' do … end` ── は先送りされています。認識には呼び出し箇所でレシーバーのクラスが可視である必要があります。

## プラグイン内部

宣言的な`BlockAsMethod`マニフェストと、それが乗っているマクロ基盤の`self`ナローイングは[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sinatra/README.md)に記述されています。プラグインの書き方は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
