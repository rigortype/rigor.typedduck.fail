---
title: "rigor-activestorage"
description: "rigortype/rigor docs/manual/plugins/rigor-activestorage.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activestorage.md"
sourcePath: "docs/manual/plugins/rigor-activestorage.md"
sourceSha: "f5129e1a7b09a1e0027980044f53056a2f445894b47b122eb6d85f9b7a5dbaeb"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
translationStatus: "translated"
sidebar:
  order: 9050
---

ActiveRecordのモデルファイルを走査して`has_one_attached`／`has_many_attached`マクロを探し、それらが生成するアタッチメントアクセサを型付けします。これにより、アタッチメントをナビゲートする際に、型のないエンベロープに落ちる代わりにActiveStorage自身のRBSサーフェス（surface）を通じて解決されます。ソースのみを読み、Railsのランタイム依存はありません。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化します:

```yaml
plugins:
  - rigor-activestorage
```

## 何を推論するか

```ruby
class User < ApplicationRecord
  has_one_attached :avatar
  has_many_attached :photos
end

user = User.find(1)
user.avatar           # Nominal[ActiveStorage::Attached::One]
user.avatar.attached? # resolves through ActiveStorage's RBS
user.photos           # Nominal[ActiveStorage::Attached::Many]
```

| マクロ | アクセサ | 提供される型 |
| --- | --- | --- |
| `has_one_attached :avatar` | `user.avatar` | `Nominal[ActiveStorage::Attached::One]` |
| `has_many_attached :photos` | `user.photos` | `Nominal[ActiveStorage::Attached::Many]` |

セッター（`user.avatar = …`）や引数付きのアタッチメント名呼び出しについては関与を控えます ── それらはActiveStorage自身のRBSがカバーします。

## 診断

| ルール | 重大度 | いつ |
| --- | --- | --- |
| `plugin.activestorage.attachment-call` | info | 認識された`model.attachment_name`呼び出しが表面化したとき。モデル → アタッチメントのマッピングを確認する |
| `plugin.activestorage.load-error` | warning | 発見に失敗したとき（例: IoBoundaryの信頼ポリシーの下でモデルディレクトリにアクセスできない） |

このスライスには`:error`診断はありません ── 価値は戻り値型の提供にあります。「未知のアタッチメント名」ルールは将来のスライスです。

`load-error`警告は実行スコープです: これは任意の一つのソースファイルについてではなく設定に関するファクトであるため、解析されるすべてのファイルで繰り返されるのではなく、実行ごとに1回`.rigor.yml`上で報告されます。これは`:warning`であるため、旧位置でベースライン化していた場合、そのエントリーはマッチしなくなり、`--fail-on=warning`の実行で失敗します —— `rigor baseline regenerate`で再生成してください。

## 設定

```yaml
plugins:
  - gem: rigor-activestorage
    config:
      model_search_paths: ["app/models"]   # default
```

## rigor-activerecordの有無について

このプラグインはモデルファイルを独立して発見するため、単体で動作します。[`rigor-activerecord`](../rigor-activerecord/)も有効な場合、両者は共存します（それぞれが呼び出しごとの戻り値型を提供し、提供のマージャーが調整します）。`:model_index`依存は`optional`として宣言されており、アタッチメントの認識を発見済みのARクラスに限定する将来のスライスのために予約されています。

## プラグインの内部

発見パス、`AttachmentIndex`、そしてこのプラグインが行使する契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activestorage/README.md)にあります。プラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
