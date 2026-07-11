---
title: "rigor-actionpack"
description: "rigortype/rigor docs/manual/plugins/rigor-actionpack.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-actionpack.md"
sourcePath: "docs/manual/plugins/rigor-actionpack.md"
sourceSha: "68148018c4381f1be5611fabcec8ffd45b2cc4edf51fd12a673e3e6c783eb0cc"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 9050
---

他のRailsプラグインが公開するファクト（fact）を消費することで（ADR-9）、コントローラー側のAction Packコードを4つの領域にわたってチェックします:

- **ルートヘルパー呼び出し** ── `redirect_to user_path(@user)`を、[`rigor-rails-routes`](../rigor-rails-routes/)の`:helper_table`に対して照合します。
- **フィルタチェーン** ── `before_action :name`を、コントローラー（およびその親）に定義されたメソッドに対して照合します。
- **レンダーターゲット** ── `render :show`／`render partial:`を、`view_search_paths`下のビューテンプレートに対して照合します。
- **ストロングパラメータ** ── `params.require(:user).permit(:name, …)`のキーを、モデルのカラム（[`rigor-activerecord`](../rigor-activerecord/)の`:model_index`経由）に対して照合します。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で、それが消費するファクトのプロデューサーと並べて有効化します:

```yaml
plugins:
  - rigor-rails-routes   # publishes :helper_table  (optional)
  - rigor-activerecord   # publishes :model_index   (optional)
  - rigor-actionpack
```

どちらの依存も`optional`として宣言されています ── プロデューサーを省略したプロジェクトでも引き続きロードされます。そのファクトを必要としていた領域は、エラーになる代わりにno-opへと縮退します。

## 何をチェックするか

| ルール | 重大度 | 発火するとき |
| --- | --- | --- |
| `plugin.actionpack.helper-call` | info | `*_path`／`*_url`呼び出しがヘルパーテーブルに対して解決された |
| `plugin.actionpack.unknown-helper` | error | ヘルパー名がテーブルにない（「もしかして」付き） |
| `plugin.actionpack.wrong-helper-arity` | error | 呼び出しの位置引数の個数がヘルパーの記録されたアリティ（arity）と一致しない |
| `plugin.actionpack.filter-call` | info | フィルタ参照（`before_action :name`、`skip_around_action`、…）が定義済みメソッドに解決された |
| `plugin.actionpack.unknown-filter-method` | error | フィルタ参照がコントローラーまたは親に定義されていないメソッドを指している（「もしかして」付き） |
| `plugin.actionpack.render-target` | info | 明示的な`render :symbol`／`"string"`／`partial:`がビューテンプレートに解決された |
| `plugin.actionpack.missing-template` | error | 明示的な`render`が、いずれの`view_search_paths`下にも存在しないビューパスに解決された |
| `plugin.actionpack.permit-call` | info | `params.require(:m).permit(:key, …)`チェーンが既知のモデルに解決された。キーはそのカラムに対して照合された |
| `plugin.actionpack.unknown-permit-key` | error | リテラルの`permit(:key)`が実在するカラムの近傍ミス（編集距離 ≤ 2）だがそのカラムではない —— タイポの可能性が高い（「もしかして」付き）。どのカラムにも似ていないキー（正当な仮想属性）は発火しない |

フィルタとレンダーの解決は、ネストしたモジュールによるコントローラーの修飾（`module Admin; class WidgetsController`は`admin/widgets/…`下のビューを解決する）を尊重し、参照できないgem提供の親クラスについては沈黙します。

## 設定

```yaml
plugins:
  - gem: rigor-actionpack
    config:
      controller_search_paths: ["app/controllers"]  # default
      view_search_paths: ["app/views"]               # default
```

## 制限事項

- **暗黙のselfヘルパーのみ**。明示的なレシーバーを持つ`*_path`／`*_url`呼び出し（`Rails.application.routes.url_helpers.x_path`）は素通りします。
- **パスベースのファイルフィルタ**。`controller_search_paths`下のファイルはクラス階層にかかわらずチェックされます。そこに置かれた非コントローラーファイル（まれ）もスキャンされてしまいます。
- **カバレッジはアップストリームのファクトに従う**。ヘルパーの検証は`rigor-rails-routes`が公開したものだけを把握し、`permit`の検証は`rigor-activerecord`が公開したものだけを把握します ── これらのプロデューサーを有効化すると、このプラグインがチェックできる範囲が広がります。

## プラグインの内部

プラグイン横断のファクト契約（`:helper_table`／`:model_index`）、コントローラー／ビューの発見プロデューサー、デモ、そしてこのプラグインが行使する契約サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-actionpack/README.md)にあります。プラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
