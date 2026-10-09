---
title: "rigor-typelizer"
description: "rigortype/rigor docs/manual/plugins/rigor-typelizer.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-typelizer.md"
sourcePath: "docs/manual/plugins/rigor-typelizer.md"
sourceSha: "05a687192a04597dd8c37ef6368e77aec25da91f681afa479dbac82e7bf635c5"
sourceCommit: "1c6f6ea59bac83a5227c3a879523151aeada9b3c"
sourceDate: "2026-10-10T04:20:13+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

[typelizer](https://github.com/skryukov/typelizer) gemがTypeScript型を生成するシリアライザークラスについて`rigor unused`に教えます。typelizerは、`include Typelizer::DSL`または`extend Typelizer::DSL`を行うすべての名前付きクラス、およびそのすべてのサブクラスに対してインターフェースを出力します。このようなクラスはRubyから一度も参照されていなくても、生成された型を通じてフロントエンドから使用されている可能性があるため、このプラグインがない場合、`rigor unused`はそれを削除候補としてリストしてしまいます。このプラグインは診断や戻り値型を追加しません。

`rigortype`にバンドルされて同梱されます。`plugins:`の下で有効化します:

```yaml
plugins:
  - rigor-typelizer
```

## ルート化されるもの

```ruby
# app/serializers/application_serializer.rb
class ApplicationSerializer
  include Typelizer::DSL           # ルート化される
end

# app/serializers/user_serializer.rb
class UserSerializer < ApplicationSerializer   # ルート化される: DSLクラスのサブクラス
end

# app/serializers/event_serializer.rb
class EventSerializer
  extend Typelizer::DSL            # ルート化される
end

class PlainFormatter               # ルート化されない: チェーン上にTypelizer::DSLがない
end
```

サブクラスはプロジェクトクラスの任意のチェーンを通じて追跡され、`class Admin::UserSerializer < Base`のようなコンパクトヘッダーは、Rubyと同じ方法で`Base`を解決します（`Admin`ではなく字句スコープに対して）。

## ルート化されないもの

- 設定された`dirs`外のクラス。typelizerはロードされた任意のDSLクラスを生成しますが、ロードするのは`dirs`のみです;他の場所にあるクラスは、何かがそれを参照したときにロードされるため、デッドではありません。
- `Typelizer::DSL`をインクルードする`module`。typelizerはモジュール自身の名前を登録してからその上で`.descendants`を呼び出しますが、素のモジュールはこれを持たないため、インターフェースを生成しません。
- クラスを`self`として実行されないDSL呼び出し: メソッド内、ブロック内、ラムダ内、または`class << self`内。
- DSLが`ActiveSupport::Concern`の`included do include Typelizer::DSL end`ブロックからのみもたらされるクラス。typelizerはそのようなクラスを登録しますが、プラグインはモジュールのフックを追跡しないため、これは見逃されたルートとなり、クラスは候補のまま残ります。

`reject_class`（typelizerの設定が出力からクラスを除外するために使用するラムダ）はランタイムで評価されるため、モデル化されません。除外されたクラスも依然としてルート化されますが、これにより候補が隠されるだけであり、誤った指摘を捏造することはありません。

## 設定

```yaml
plugins:
  - gem: rigor-typelizer
    config:
      dirs: ["app/resources", "app/serializers"]   # デフォルト
```

`dirs`は`Typelizer.dirs`を反映します;デフォルトは何も設定しなかった場合に`Typelizer::Railtie`が設定する値です。typelizerに渡すのと同じリストを設定してください。スーパークラスはプロジェクトのすべての`paths:`にわたって解決されるため、`dirs`外のベースクラスをシャドウするクラスも認識されます。

## 詳細

内部実装と既知の制限: [plugins/rigor-typelizer/README.md](https://github.com/rigortype/rigor/blob/master/plugins/rigor-typelizer/README.md)。
