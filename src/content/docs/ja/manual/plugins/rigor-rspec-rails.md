---
title: "rigor-rspec-rails"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-rspec-rails.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rspec-rails.md"
sourcePath: "docs/manual/plugins/rigor-rspec-rails.md"
sourceSha: "7316681db8290a8ba6bac919f0a49a5487535feb62d8a7a305bc1c8be6d5dedd"
sourceCommit: "6e5bd55274e20dfb59183559c4971d34f878c907"
translationStatus: "translated"
sidebar:
  order: 9050
---

引数が静的に検査可能な[rspec-rails](https://github.com/rspec/rspec-rails)の**振る舞い系**マッチャーを検証します ── 現在は`have_http_status(int_or_symbol)`で、範囲外のステータスコードとタイポされたステータスシンボルをフラグします。これは[rigor-rspec](../rigor-rspec/)の振る舞い系の兄弟分です。rigor-rspecが`be_a` / `be_nil` / `eq(literal)`のようなマッチャーを通じて*ローカル変数の型をナローイング*するのに対し、rigor-rspec-railsは何もナローイングせずにマッチャー引数に対して*ドメインdiagnostic*を出します。両者は独立して有効化され、合成されます。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で（通常はrigor-rspecと並べて）有効化します。

```yaml
plugins:
  - rigor-rspec
  - rigor-rspec-rails
```

## What it checks

```ruby
RSpec.describe HomeController do
  it "returns 200" do
    expect(response).to have_http_status(200)       # OK
    expect(response).to have_http_status(:ok)       # OK
    expect(response).to have_http_status(:success)  # OK（Rails 2xxグループエイリアス）
    expect(response).to have_http_status(99)        # 警告: 範囲外
    expect(response).to have_http_status(:succes)   # 警告: 未知のシンボル（タイポ）
  end
end
```

| ルール | 重大度 | 発火条件 |
| --- | --- | --- |
| `plugin.rspec-rails.have_http_status.out-of-range` | warning | 整数引数が`100..599`の範囲外である |
| `plugin.rspec-rails.have_http_status.unknown-symbol` | warning | シンボル引数が既知のRackステータスコードでもRailsステータスグループエイリアスでもない（did-you-mean付き） |

受理されるステータスシンボルは、vendoringされたスナップショットではなく、解析時に読み取られる**本物の**`Rack::Utils::SYMBOL_TO_STATUS_CODE`（`have_http_status`自身が使うのと同じ権威）に由来します ── そのため新たに追加されたRackシンボルがタイポと誤認されることはありません（[ADR-39](../../../adr/39-plugin-target-library-invocation/)）。Rackをロードできない場合、プラグインはどのシンボルもフラグすることを**控えます**（カバレッジは縮小しますが、偽陽性は決して出しません）。8つのRailsステータスグループエイリアス（`:success`、`:successful`、`:missing`、`:redirect`、`:error`、`:client_error`、`:server_error`、`:informational`）は、小さく安定した定数集合です。検査されるのはリテラルの整数 / シンボル引数のみで、文字列・変数・計算式は素通りします。

## 設定なし

このプラグインに設定ノブはありません。

## 制限事項

- **`have_http_status`のみ**。他のrspec-railsマッチャーは、プラグイン間の調整待ちのキューに入っています。`render_template`（rigor-actionpackのレンダーターゲット検証と重複）、`route_to` / `redirect_to` / `be_routable`（rigor-rails-routesのテーブルが必要）、`have_enqueued_job` / `have_received`（エンジンの定数 / undefined-methodルールと重複）。
- **リテラル引数のみ** ── 変数やメソッド呼び出し経由で渡されたステータスは静的に検査できないため、黙って受理されます。

## プラグインの内部

マッチャーの認識器（recognizer）、Rackテーブルのルックアップ、このプラグインが行使する契約（contract）のサーフェス（surface）については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-rspec-rails/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
