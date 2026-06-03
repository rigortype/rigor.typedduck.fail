---
title: "rigor-hanami"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-hanami.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-hanami.md"
sourcePath: "docs/manual/plugins/rigor-hanami.md"
sourceSha: "2c9c0ee33b1062f183c02b04b2493b7b35944ee8f64c49b366e7efce2008a651"
sourceCommit: "6e5bd55274e20dfb59183559c4971d34f878c907"
translationStatus: "translated"
sidebar:
  order: 9050
---

Hanami 3.xアプリに対して**Hanami::Actionプロトコル**を強制します。`app/actions/**/*.rb`配下のすべてのクラスは`#handle(request, response)`を定義しなければならず（MUST）、それらの本体の内部でRigorは2つのパラメータをそれぞれ`Hanami::Action::Request` / `Hanami::Action::Response`として型付けするため、誤用が的確に捕捉されます。これは[ADR-28](../../../adr/28-path-scoped-protocol-contracts/)のパススコープのメソッドプロトコル契約（contract）のリファレンス実装としてのプロダクション利用者です ── Rigorがパラメータ型を*提供し*、プラグインがメソッドのシェイプ（shape）を*検査*します。ソースのみを読み取り、`hanami`ランタイム依存を持ちません（Request / Response / Paramsのサーフェス（surface）に対するRBSスタブを同梱しています）。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-hanami
```

## What it checks

```ruby
# app/actions/books/index.rb
module Bookshelf
  module Actions
    module Books
      class Index < Bookshelf::Action
        def handle(request, response)
          response.status = 200                 # response: Hanami::Action::Response
          response.body = request.params[:q]    # request: Hanami::Action::Request
          request.no_such_method                # エラー: call.undefined-method
        end
      end
    end
  end
end
```

| ルール | 重大度 | 発火条件 |
| --- | --- | --- |
| `plugin.hanami.missing-handle-method` | error | マッチするファイル内のクラスが`#handle`を定義していない |
| `plugin.hanami.handle-arity-mismatch` | error | `#handle`が2以外のパラメータ数で定義されている |

適合する`#handle`の内部では、`request` / `response`の誤用はエンジン自身の`call.undefined-method`として顕在化します ── 型がRBSで宣言されていた場合とまったく同じです。戻り値型の適合性は検査*されません*。`#handle`は契約上voidであり（responseはインプレースで変更される）、戻り値を検査するとあらゆる条件分岐で偽陽性が発生してしまうためです。パラメータ名は任意です（バインドされるのは名前ではなく位置です）。検査されるのは直接定義された`#handle`のみで、継承されたものは対象外です。

## 設定

```yaml
plugins:
  - gem: rigor-hanami
    config:
      action_path: "app/actions/**/*.rb"   # デフォルト
```

カスタムなスライス（slice）レイアウトのために`action_path`を上書きできます（例: `"slices/main/actions/**/*.rb"`）。この上書きは、パラメータ型の提供と`#handle`の検査の両方を再ターゲットします。

## 制限事項

- **厳密なアリティ（arity）**。 `#handle`はちょうど2つのパラメータを取らなければなりません。オプショナルまたはキーワード専用の形式は`handle-arity-mismatch`としてフラグされます。
- **直接定義のみ**。基底クラスから継承された`#handle`（クラス自身で定義されたものではない）は検出されません。
- **スタブ化されたサーフェス**。バンドルされたRBSはドキュメント化されたRequest / Response / Paramsのメソッドをカバーします。そのサーフェス外への呼び出しは、稼働中のHanamiインストールではなくスタブに対して解決されます。

## プラグインの内部

`ProtocolContract`宣言、アクションチェッカー、RBSスタブ、ADR-28のprovide-and-check分割については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-hanami/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
