---
title: "rigor-actioncable"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-actioncable.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-actioncable.md"
sourcePath: "docs/manual/plugins/rigor-actioncable.md"
sourceSha: "3f36f591674aa72d98526af2b106f9b56c82053518f087504afbb2092625348b"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

ActionCableのブロードキャスト呼び出し箇所を、静的に発見したチャネルインデックスに対して検証します。`<X>Channel.broadcast_to(record, data)`はチャネルクラスが存在することをチェックし、`ActionCable.server.broadcast("stream_name", data)`はリテラルのストリーム名がいずれかのチャネルで`stream_from`によって登録されていたことをチェックします。ソースのみを読み、`actioncable`のランタイム依存はありません。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化します:

```yaml
plugins:
  - rigor-actioncable
```

## 何をチェックするか

```ruby
# app/channels/chat_channel.rb
class ChatChannel < ApplicationCable::Channel
  def subscribed
    stream_from "chat_room_5"
  end
end

ChatChannel.broadcast_to(room, message: "hi")               # info:  channel exists
ActionCable.server.broadcast("chat_room_5", body: "hi")     # info:  registered stream
ChartChannel.broadcast_to(room, message: "hi")              # error: no channel (did you mean ChatChannel?)
ActionCable.server.broadcast("chat_room_42", body: "hi")    # warning: no such stream registration
```

| ルール | 重大度 | 発火するとき |
| --- | --- | --- |
| `plugin.actioncable.broadcast-target` | info | `<X>Channel.broadcast_to(...)`が発見されたチャネルにマッチした |
| `plugin.actioncable.broadcast-stream` | info | `ActionCable.server.broadcast("...", ...)`が登録済みの`stream_from`リテラルにマッチした |
| `plugin.actioncable.unknown-channel` | error | レシーバーが`Channel`で終わるがインデックスにない（「もしかして」付き） |
| `plugin.actioncable.unknown-stream` | warning | リテラルのストリーム名がどの`stream_from`登録にもマッチしなかった（「もしかして」付き） |
| `plugin.actioncable.load-error` | warning | チャネルの発見に失敗した（パース／読み取りエラー）── ファイルごとに1回 |

`unknown-stream`チェックは、発見されたいずれかのチャネルが動的ストリーム（`stream_from interpolated_string`または`stream_for record`）を登録している場合は**抑制**されます ── リテラルのマッチが存在しないことは、そのストリームが無効である証明にはならないためです。`Channel`以外のレシーバーや、リテラルでないストリーム引数は、何も言わずに素通りします。

## 設定

```yaml
plugins:
  - gem: rigor-actioncable
    config:
      channel_search_paths: ["app/channels"]                                            # default
      channel_base_classes: ["ApplicationCable::Channel", "ActionCable::Channel::Base"] # default
```

## 制限事項

- **直接のスーパークラスのみマッチ**。間接的なチェーン（`AdminChannel < BaseChannel < ApplicationCable::Channel`）には、`BaseChannel`を`channel_base_classes`に列挙する必要があります。
- **アクションメソッドはインデックス化されるが、検証はされない**。チャネルのアクションはクライアント側で`subscription.perform("action", data)`を介して呼び出されます。RigorはJavaScriptを解析しないため、アクションインデックスは情報提供にとどまります。
- **`broadcast_to`のアリティ（arity）はチェックされない** ── 任意のレコード＋任意のデータハッシュを受け付けます。
- **間接的な`stream_from`**（チャネル本体に直接ではなく、ヘルパーメソッド内で登録されたもの）は対象外です。
- **裸の`broadcast(...)`**（明示的な`ActionCable.server`レシーバーを伴わないもの）は、無関係なメソッドでの偽陽性を避けるためにスキップされます。

## プラグインの内部

チャネルの発見器／インデックスと、このプラグインが行使する契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-actioncable/README.md)にあります。プラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
