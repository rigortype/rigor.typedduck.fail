---
title: "rigor-actionpack"
description: "rigortype/rigor docs/manual/plugins/rigor-actionpack.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-actionpack.md"
sourcePath: "docs/manual/plugins/rigor-actionpack.md"
sourceSha: "175184efef49898373a62203df26500201f06d9a9322a044d3e8db9efcd65d8c"
sourceCommit: "db7b23d42e9b47560438b67dfe16d53e03f70575"
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

## 何を型付けするか

コントローラーの内側では、`params`・`request`・`session`・`flash`・`cookies`はそれぞれのAction Packのクラスとして型付けされ、その上に組み立てられる連鎖も同様です:

```ruby
request.post?          # bool — and so do get? / put? / patch? / delete? /
                       # head? / options? / trace? / link? / unlink? /
                       # xhr? / xml_http_request? / ssl? / local? / form_data?
flash.now              # ActionDispatch::Flash::FlashNow
flash.keep             # ActionDispatch::Flash::FlashHash
flash[:notice] = "hi"  # "hi" — an assignment is its right-hand side
```

RigorはこれらのAction Packのクラスについて意図的に**シグネチャを出荷しません**: レシーバーは具体的になり（`rigor coverage --protection`がそのサイトを数えます）、一方でメソッドのサーフェスは寛容なままになるので、`request.headers`・`flash.now[:alert] = x`、その他フレームワークが追加するものはすべて診断なしで解決されます。部分的なシグネチャは、ないよりも悪くなります——省いたメンバーはすべて偽の`call.undefined-method`になってしまうからです。

これらの述語は`bool`——`true`と`false`のユニオン——として型付けされます。これは本物の契約でもあり（そのどれもがRailsまたはRackの中の`==`・`match?`・`include?`です）、そもそもこれらを型付けしても安全である理由でもあります: 畳み込まれる条件は*1つの*定数を証明する必要があり、両方のユニオンは決してそれを証明しないからです。`return unless request.post?`や`mode = request.get? ? :a : :b`は以前とまったく同じに読めます。

`request.format`は型付けされ**ません**。この不活性の議論は見た目より狭いのです——それが成り立つのは2つの真偽値の定数のユニオンについてであって、通常のクラスのユニオンについてではありません。後者はnilを含まないので条件を畳み込むことが*できます*——そして`format`がフォーマットのないときに返す値`Mime::NullType`は、実在するオブジェクトでありながら`nil?`に`true`と答えます。これを型付けするにはnilを意識した答えが必要です。

## フレームワーク定数の解決

このプラグインは、`ActionController`名前空間およびコントローラーがrescueするエラー —— `ParameterMissing`、`UnpermittedParameters`、`RoutingError`、`BadRequest`、`UnknownFormat`、`InvalidAuthenticityToken`およびそれらの兄弟 —— を名指しする小さなバンドル済みシグネチャを出荷します。`rescue ActionController::ParameterMissing => e`は、`e`を不透明なままにする代わりにそのクラスとして型付けするようになりました。

このシグネチャはそれら**のみ**を名指しします。`ActionController::Base`および`ActionController::API`は意図的に未宣言のまま残されています: アプリケーション内のすべてのコントローラーがそれらのいずれかを継承しており、スーパークラスの不完全な宣言は、それが省略したすべてのメンバー —— `render`、`before_action`、`head` —— を正常に動作するコードに対する指摘に変えてしまうためです。同じ理由で、`ActionController::Parameters`および上記の`ActionDispatch`リーダーも未宣言のまま保たれています;それらの寛容さこそが`params`の型付けを安全にしているものです。

## 制限事項

- **暗黙のselfヘルパーのみ**。明示的なレシーバーを持つ`*_path`／`*_url`呼び出し（`Rails.application.routes.url_helpers.x_path`）は素通りします。
- **パスベースのファイルフィルタ**。`controller_search_paths`下のファイルはクラス階層にかかわらずチェックされます。そこに置かれた非コントローラーファイル（まれ）もスキャンされてしまいます。
- **カバレッジはアップストリームのファクトに従う**。ヘルパーの検証は`rigor-rails-routes`が公開したものだけを把握し、`permit`の検証は`rigor-activerecord`が公開したものだけを把握します ── これらのプロデューサーを有効化すると、このプラグインがチェックできる範囲が広がります。
- **`params[:key]`は型なしのまま**。コントローラーの内側では`params`は`ActionController::Parameters`として型付けされ、常にそれを返すビルダーのメソッド——`require`・`permit`・`permit!`・`expect`・`slice`・`slice!`・`except`・`without`・`extract!`・`merge`・`merge!`・`reverse_merge`・`reverse_merge!`・`with_defaults`・`with_defaults!`・`compact`・`compact_blank`・`deep_dup`——の結果も同様なので、それらから組み立てた連鎖は全体を通じて具体的なレシーバーを保ちます。添字による読み取りは意図的に型なしのまま残されます: `params[:missing]`は実行時に`nil`であり、そうでないと述べる型は、フローのルールに生きた条件（`if params[:q]`・`url.nil?`）を定数へ畳み込ませ、動作するコードを報告させてしまうからです。結果が呼び出しに依存するメソッド——`dig`・`fetch`・`compact!`、およびブロックなしの`select` / `reject` / `transform_keys` / `transform_values`——も同じ理由で型なしです。
- **`flash[:key]`と`session[:key]`も型なしのまま**。同じ理由であり、同じやり方で計測しました。どちらも、格納されたものを——設定されていないキーには`nil`を——返す葉の読み取りです。nilでない型は`mode = flash[:notice] ? … : …`を片方の腕へ畳み込み、その後の生きたガードを報告します;nil許容の型は`note = flash[:notice]; note.upcase`に`call.possible-nil-receiver`を乗せます。これらを通じた書き込みは影響を受けません: `flash[:k] = v`が`v`なのは、Rubyで代入式が意味するものがそれだからであり、ルールは必要ありません。

## プラグインの内部

プラグイン横断のファクト契約（`:helper_table`／`:model_index`）、コントローラー／ビューの発見プロデューサー、デモ、そしてこのプラグインが行使する契約サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-actionpack/README.md)にあります。プラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
