---
title: "rigor-factorybot"
description: "rigortype/rigor docs/manual/plugins/rigor-factorybot.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-factorybot.md"
sourcePath: "docs/manual/plugins/rigor-factorybot.md"
sourceSha: "d370fc11bad1d29f0850a4ffd1656fbe9f08a1f9a7618f7618a5d373d8669114"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

すべての`FactoryBot.create(:name, key: …)` / `.build(…)` / `.build_stubbed(…)` / `.attributes_for(…)` / `*_list`呼び出しを、ファクトリー定義のインデックスに照らして検証します。未知のファクトリー名や、そのファクトリーが宣言していない属性キーはフラグが立てられます（それぞれdid-you-mean付き）。[`rigor-activerecord`](../rigor-activerecord/)も有効な場合、属性キーはさらにモデルのカラムと相互チェックされます。FactoryBotの実行時依存はありません。

`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-factorybot
  # - rigor-activerecord   # optional: enables the AR column cross-check
```

## チェックする対象

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name  { "Alice" }
    email { "alice@example.com" }
  end
end

FactoryBot.create(:user, name: "X")     # ✓ info trace
FactoryBot.build(:post, headline: "Hi") # ✗ unknown-attribute (suggest :title)
FactoryBot.create(:usre)                # ✗ unknown-factory (suggest :user)
```

| ルール | 重大度 | 発火する条件 |
| --- | --- | --- |
| `plugin.factorybot.factory-call` | info | 呼び出しが既知のファクトリーに解決された。そのファクトリーが宣言する属性を一覧する |
| `plugin.factorybot.unknown-factory` | error | リテラルの`:name`がファクトリインデックスに存在しない（did-you-mean付き） |
| `plugin.factorybot.unknown-attribute` | error | キーワードキーが宣言された属性でない（did-you-mean付き）。`:model_index`が利用可能な場合はモデルのカラムとも照合される |

レガシーの`FactoryGirl`定数も同じ方法で認識されます。認識されるエントリメソッドは`create` / `build` / `build_stubbed` / `attributes_for`と`*_list`系です。ファクトリー内では`name { … }`（モダン）、`name "…"`（レガシーの位置引数）、`add_attribute(:name) { … }`を認識します。

## 設定

```yaml
plugins:
  - gem: rigor-factorybot
    config:
      factory_search_paths: ["spec/factories", "spec/factories.rb"]  # default
      # Minitest projects: ["test/factories"]
```

## 制限

- **リテラル引数のみ** — 変数名を渡す`FactoryBot.create(name)`は素通りします。
- **トレイト／シーケンス／関連はまだ収集されない** — `trait :admin do … end`の内側でのみ定義された属性は、トレイトのスライス（slice）が出荷されるまで、誤った`unknown-attribute`を表面化させることがあります。
- **明示的なレシーバーのみ** — 素の`create(:user)`（`include FactoryBot::Syntax::Methods`によるもの）は、このスライスでは認識されません。これにはレシーバーの型推論が必要で、それがなければ無関係なすべての`create`呼び出しで偽陽性を出してしまうためです。

## プラグインの内部構造

ファクトリーのディスカバラー／インデックス、キャッシュされたプロデューサー、`:model_index`の消費、デモ、そしてこのプラグインが用いる契約（contract）のサーフェス（surface）については[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-factorybot/README.md)に記載されています。プラグインを書くには[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
