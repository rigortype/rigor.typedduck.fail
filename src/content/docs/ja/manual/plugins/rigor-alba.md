---
title: "rigor-alba"
description: "rigortype/rigor docs/manual/plugins/rigor-alba.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-alba.md"
sourcePath: "docs/manual/plugins/rigor-alba.md"
sourceSha: "8713799621de1a4d5cac93f20f50fff21cae6fde502eac3b18d1f558bea02188"
sourceCommit: "1c6f6ea59bac83a5227c3a879523151aeada9b3c"
sourceDate: "2026-10-10T02:26:43+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

[alba](https://github.com/okuramasafumi/alba) JSONシリアライザーについてRigorに教えます。albaはgem内にRBSを同梱していないため、このプラグインがない場合、プロジェクト内のすべてのalba呼び出しは`Dynamic[top]`と読まれます。このプラグインは誤った診断を除去し、`rigor unused`のルートを公開するのみです;診断や戻り値型は追加しません。

`rigortype`にバンドルされて同梱されます。`plugins:`の下で有効化します:

```yaml
plugins:
  - rigor-alba
```

## 機能

```ruby
# インラインリソース: ブロックは匿名のAlba::Resourceクラス上で実行されるため、
# call.unresolved-toplevelを発火させる代わりに`attributes`などが解決されます。
json = Alba.serialize(user) { attributes :id, :name }
hash = Alba.hashify(user) { attributes :id }
```

プラグインは戻り値型を貢献しません: `Alba.serialize(obj)`はユーザー自身の`<Class>Resource#serialize`を実行し、これは任意の値を返すようオーバーライドされる可能性があるためです。

ブロックは値が置ける場所ならどこにでも置くことができます: `render json: Alba.serialize(x) { ... }`は代入と同様に解決されます。

## `rigor unused`向けのルート

```ruby
class UserResource
  include Alba::Resource

  many :articles                               # albaはArticleResource、次いでArticleSerializerをロードする
  one :editor, resource: EditorResource        # 明示的: 何も推論されない
end
```

`ArticleResource`はソース内のどこにも現れないため、通常なら`rigor unused`がこれをリストします。プラグインはこれをルートとして公開します。これは`resource:` / `serializer:`、第2引数、およびブロックのいずれも与えられていない関連に対してのみ行われ、かつ推論された名前のクラスがプロジェクト内に存在する場合にのみ行われます（ネストを考慮: `module Admin`内ではalbaはまず`Admin::ArticleResource`を試行します）。名前は実際の`ActiveSupport::Inflector`によって分類されます;それがロードできない場合、プラグインは何も公開しません。

## 設定

```yaml
plugins:
  - gem: rigor-alba
    config:
      resource_search_paths: ["app"]   # デフォルト
```

`resource_search_paths`はプラグインがリソースクラスを検索する場所です。リソースが`app/`の外にある場合は、これを広げてください。

## 詳細

内部実装と既知の制限: [plugins/rigor-alba/README.md](https://github.com/rigortype/rigor/blob/master/plugins/rigor-alba/README.md)。
