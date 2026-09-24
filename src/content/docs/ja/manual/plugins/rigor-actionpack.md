---
title: "rigor-actionpack"
description: "rigortype/rigor docs/manual/plugins/rigor-actionpack.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-actionpack.md"
sourcePath: "docs/manual/plugins/rigor-actionpack.md"
sourceSha: "6f10443ac88b24c0d29f389a1787d39485a7c90da3dfa844eef64f5dd4dc6a6d"
sourceCommit: "32fcfb01032273679a99853a37f53a6e842b3330"
sourceDate: "2026-09-24T17:29:28+09:00"
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
      view_type_checks: false                        # default
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

## エフェクト単位としてのERBテンプレート

すべての`app/views/**/*.erb`はRubyへとコンパイルされ、1つの**エフェクト単位**として解析されます。キーは`view:users/show.html` ── ハンドラが除かれたRails自身の論理名であり、ERB → Hamlの書き換えがリネームになりません。何も有効化する必要はありません：プラグインのアクティブ化こそがテンプレートをクレームするトリガーです。

これによって得られるのは、`render`行を超えた「**このリクエストは実際には何を行うか**」への答えです。`@user.update`を呼び出すパーシャルは`app/views/users/_card.html.erb`で`io.db.write`を報告し、レイアウトの断片内の`Time.now`は`nondet.time`を報告し、残された`puts`は`io.output.stdout`を報告します ── そのすべてが`rigor effects`およびスナップショットに現れるため、書き込みを始めたテンプレートはdiffに浮上します。

```
$ rigor effects
view:users/_card.html: [mutate.local, nondet.time] ≤ [io.db.write] …?
view:users/show.html:  [mutate.local]              ≤ [io.db.read]  …?
```

**コンパイラ**は、プロジェクトのバンドルで解決できる場合はErubi（Rails自身が使用するもの）であり、そうでない場合は標準ライブラリの`ERB`です。ErubiがGemfileに追加されることは決してなく、Rigorの依存関係でもありません（[ADR-90](../../adr/90-target-library-resolution-from-project-bundle/)）。いずれの場合も行マップは仮定されるのではなく実測されるため、所見はテンプレート自身の行を指名します。列は常に1です。コンパイラが各行のテキストを書き換えるため、コンパイルされたRubyの列はユーザーが書いた何ものも指名しないからです。

**`self`は何であるか**。`ActionView::Base`です。名前が解決されるよう宣言されており、そのメソッドサーフェスが寛容であり続けるよう**オープン**になっています。これにより、`link_to`、`form_with`、`t`、`content_for`、ユーザー自身の`ApplicationHelper`メソッド、およびすべてのルートヘルパーが1行ごとに所見を引き起こすのを防ぎます。

**何がスコープ内にあるか**。`@ivars`は、そのテンプレートをレンダリングするコントローラーアクション ── 暗黙のrender（`UsersController#show` → `users/show`）および明示的な`render :edit` / `render "admin/form"` ── からシードされます。2つの制限により、シードがテンプレートで見つからない型をクレームすることを防ぎます。右辺が単一のレコードであり`nil`になり得ない代入のみが寄与します: `User.find(id)`や`Model.new`は寄与します。`find_by`は決して寄与せず、複数のレコードを返すように書かれた呼び出し ── `User.find(a, b)`、`User.find([1, 2])`、`User.find(*ids)`、`User.create([…])`、またはブロックを伴う`find` ── も寄与しません。実行時にのみArrayを保持する単一の引数（`User.find(ids)`）は、依然としてモデルをシードします。そして、アクションが**すべての**パスで到達する代入のみ ── `if`、`case`、`rescue`、ループ、ブロックの内部にあるものは除外され、`if:` / `unless:`を運ぶ`before_action`からのものも除外されます ── が寄与します。それ以外のすべてはivarを未シードのまま残し、これは`Dynamic`として読み取られて沈黙します。パーシャルは自身のディレクトリのassignを継承します。ivarはlocalではないためです。localsはRails 7.1のstrict-localsコメントから取得されます：

```erb
<%# locals: (user:, admin: false) %>
```

**テンプレート内ではデフォルトで`call.*`所見はオフです**。合成されたレシーバーがまだ粗い間、redmineとmastodonでの実測において、この機能はどちらに対しても新しい所見を**ゼロ件**追加しました（[測定ノート](../../notes/20260917-erb-template-units/)）。オプトインして`show.html.erb`内の`@user.nmae`を他の呼び出しと同様に報告させるには、`view_type_checks: true`を設定します。

`flow.*`は**他の場所と同様にテンプレート内でも報告されます**。以前は1つの実測された理由 ── パーシャルのオプショナルlocalプリアンブル（`<% path = nil unless defined? path %>`）において、レンダー箇所が`path`を束縛したことがユニットに伝わっていなかったため、実際にnilを代入していた ── により`call.*`とともに抑制されていました。現在ではレンダー箇所の`locals:`が追跡されるようになり、このファミリーを報告させた状態で再測定された同じ2つのプロジェクトは、抑制した状態での実行とバイト単位で同一でした（[#1047のノート](../../notes/20260917-render-locals-and-layouts/)）。

### レンダー箇所から来るlocals

パーシャルのパラメータはそれをレンダリングする側によって束縛され、そのあらゆる綴りが読み取られます ── レンダーの両側において：

```erb
<%= render partial: "card", locals: { user: @user } %>
<%= render "card", user: @user %>          <%# ビューの末尾のハッシュはlocalsである %>
<%= render partial: "card", collection: @users, as: :row %>
<%= render partial: "card", object: @user %>
```

`collection:`は`row`、`row_counter`、`row_iteration`を束縛します。`object:`と`as:`はパーシャルまたは`as:`にちなんで命名された1つのlocalを束縛します。コントローラーの`render partial: …, locals: …`も同様に読み取られます ── ただし、コントローラーの*末尾のハッシュ*はオプションであるため、`render :show, status: :ok`は何も束縛しません。

複数の箇所からレンダリングされるパーシャルは、名前の**結合（union）**を取得します。一部の箇所からしか渡されない名前であっても依然として束縛され、`Dynamic`として型付けされます ── 不在こそが上記の偽陽性を引き起こしていたものです。**型**がクレームされるのは、すべての箇所が呼び出し自体から確定できた型（`User.find(1)`、またはレンダリングアクション自身のシードが型付けしたivar）に同意している場合のみです。それ以外のすべては`Dynamic`になります。テンプレートがstrict-localsコメントを保持している場合は、引き続きそれが勝ちます。

パーシャル**自身**のオプショナルlocalテストもカウントされます：
`<% size = nil unless defined?(size) %>`、`local_assigns[:size]`、および`local_assigns.key?(:size)`は、プラグインが読み取れるレンダー箇所のいずれもそれを渡していない場合であっても ── `locals: opts`ハッシュ、ヘルパーからの`render`、誰も渡さないデフォルトを持つlocal ── `size`を束縛します。`app/helpers`配下のヘルパーが定義する名前はそのまま残されるため、`<% if defined?(current_user) %>`はヘルパー呼び出しのままとなります。gemやconcernが定義するヘルパーはそのスキャンからは見えず、その名前は代わりに`Dynamic`のlocalとして束縛されます。

### コントローラー → テンプレートのエッジ

コントローラーアクションのサマリーには、**そのテンプレートが行うことが含まれます**。
`render :show`、`render "show"`、`render "admin/form"`、`render template:`、`render action:`、`render partial:`（`collection:`の有無に関わらず）、および`<controller>/<action>`の暗黙のrenderはすべてテンプレート自身のユニットに到達し、テンプレートは*自身が*レンダリングするパーシャルに到達します ── したがって、`app/views/users/_card.html.erb`内の`io.db.write`は3ホップ離れた`UsersController#show`に現れ、`rigor effects explain`はそのパスを出力します。

パーシャルはレンダリングするテンプレート自身のフォーマットで探索され、Action View自身がハードコードしている1つのフォールバックを伴います：`.js.erb`テンプレートは、それが存在する場所では`_list.js.erb`に到達し、そうでない場合は`_list.html.erb`に到達します。これこそが「レンダリングされたHTMLを注入するJSレスポンス」がそもそも機能する仕組みです。2つのうち1つのみが結合され、両方が結合されることは決してありません。`.json`、`.xml`、または`.turbo_stream`テンプレートにはフォールバックはありません ── それらが何にフォールバックするかはリクエストの`Accept`ヘッダーに依存し、ソースはそれを語らないためです。自身のフォーマットを明示するレンダー箇所（`formats: [:js]`、`render "list.js"`）やコントローラー側の`render`も同様です。

フォールバックは、**存在し、かつユニットを生成しなかった**テンプレートで停止します：`_list.js.haml`、またはコンパイルされたRubyがパースできない`_list.js.erb`です。Railsはそのファイルを実行するため、`.html`ファイルのエフェクトはレンダーが生成するものではなく、汚染が残ります。このプラグインが`app/views/**/*.{haml,slim,jbuilder,builder,rabl,ruby}`をクレームし、それらを一切コンパイルしないのはそのためです：クレームこそが、エンジンがテンプレートの存在を知る方法です。そのリスト以外のハンドラは不可視であり、そのレンダーは依然としてフォールバックします。

2つの近似が伴い、それぞれは汚染ではなくラベルを犠牲にします。フォールバックを*通じて*到達したパーシャルは、Action Viewのコンテキストが依然として`[:js, :html]`であるにも関わらず、自身のパーシャルを`html`でレンダリングします。ネストされたパーシャルが両方のフォーマットで存在する場合、`.js`テンプレートは`.html`テンプレートのラベルを取得します。また、名前にフォーマットをまったく持たないテンプレート（`_row.jbuilder`）は何もブロックしません。そのキーにはブロックすべきフォーマットがないためです ── これはフォーマット付きテンプレートをそれよりも上位にランク付けするRailsの挙動とたまたま一致します。どちらも実測コーパスでの発生件数はゼロです。

`render`上の`template-not-analysed`汚染は、エッジが実際のユニットに着地したときに正確に解消されます。着地しないときは**残り続け**、どちらのケースも挙げるのに十分なほど一般的です：

- ターゲットが計算されている ── `render params[:view]`、または`render formats: some_format`。レンダー箇所はリテラルからのみ読み取られるため、計算されたものはすべて「さらに存在する可能性がある」という誠実さを保ちます。
- ターゲットがこのプラグインがコンパイルしたテンプレートを指名していない ── `render partial: @thing`、または要求されたフォーマットにもそのフォールバックにも存在しないパーシャル。
- テンプレートが`app/views/**/*.erb`の外部にある ── このプラグインがクレームしないHaml、Slim、またはJbuilderのビュー。

`render json:`、`render plain:`、およびその他のテンプレート以外のファミリーはそのまま残されます：それらはテンプレートをレンダリングせず、ルールは辞退し、行は以前とまったく同じように読み取られます。

自身で応答したアクションは、慣例のテンプレートにエッジで**結ばれません**。`redirect_to`、`head`、`send_data`、`send_file`はそれぞれ暗黙のrenderが発生しなかったことを意味し、リダイレクトするアクションに`users/away`を帰属させることは、それが決して実行しないビューになってしまいます。

### ビューをエフェクト予算に収める

ビューユニットは他のクラスと同様に`effects.envelopes:`の対象であり、所見はテンプレート内に位置付けられます:

```yaml
effects:
  envelopes:
    - match: "app/views/**/*"
      effect: [mutate.local]
```

境界（bound）はRigorがコードを読むことで証明したもののみを判定するため、これがビュー内で捕捉するのはRigor自身のカタログが証明するもの（`puts`（`io.output.stdout`）や`Time.now`（`nondet.time`））です。

**プラグイン由来のラベルは、エンベロープによって判定されることは決してありません**。フレームワークメソッドに関するプラグインの言明 ── `User.find`は`io.db.read`、`@user.update`は`io.db.write`、`perform_later`は`job.enqueue` ── は宣言（`≤`）レーンに乗り、エンベロープチェックは証明レーンを読み取ります。ビューのエンベロープに`io.db.read`をリストしても、外しても、何も変わりません：遅延した`<%= user.posts.count %>`はどちらにしても所見にはなりません。これはビューというよりRailsエフェクト層全体の特性です（[ADR-103](../../adr/103-effect-labels/) WD17、[#1059](https://github.com/rigortype/rigor/issues/1059)で裁定）。

ビューがデータベースの読み取りを開始したことに気づくのは、エフェクトスナップショットです。`.rigor-effects.yml`をコミットしておくと、`rigor effects check`はどちらのレーンのドリフトに対してもデフォルトで失敗し、クエリを獲得したテンプレートは宣言レーンの追加としてdiffに現れます:

```
view:users/show.html  ≤+ io.db.read
```

これは`app/views/**/*`にスコープされたポリシーではなく、diffとしてレビューされるプロジェクト全体の記録されたエフェクトに対するラチェットです。[エフェクトラベル](../19-effect-labels/#境界が見ることができるものとできないもの)を参照してください。

## 制限事項

- **コントローラー自身のレイアウトはエッジで結ばれない**。レイアウトはいまやユニットであり、**ビューの内部での**`render layout:`はそれに到達します ── しかし、Railsがアクションのテンプレートをラップするレイアウト（`layouts/application`、または`layout "base"`が名指した任意のもの）はそのアクションに帰属しません。calleeルールは呼び出しのリテラル、ユニットのオーナー、およびユニットのキーを読み取ることができ、レイアウトの名前はそのいずれでもありません：それはクラス本文の宣言＋ビューツリーに対する慣例によるルックアップです。そのため、レイアウト自身のエフェクトはそれを明示的にレンダリングするビューに到達し、それ以上には到達しません。
- **レイアウト内の`yield`は`String`でありそれ以上ではない**。本文がパースできるよう、キーワードはビューコンテキスト上の宣言された呼び出しへと書き換えられます。内側のテンプレートが何を生成したかがモデル化されることはありません。
- **未保存のレンダー箇所はエディタ内で読み取られない**。レンダー箇所のインデックスはディスクからテンプレートとコントローラーを読み取るため、入力したものの保存していない`locals:`は保存するまでパーシャルに到達しません。キーストロークはバッファのみを再コンパイルし、保存は従来どおりプロジェクトの解析を再構築します。エディタに見えない保存**なしで**ディスク上で変更されたビュー（`git checkout`、他所で実行されたフォーマッタ）は、次の公開時にすべてのビューを再コンパイルします。パーシャルのlocalsはそれらのいずれからでも来る可能性があるためです。完全な`rigor check`は以前と同じコンパイル作業を行います ── インデックスは2回コンパイルするのではなく、コンパイルされたソースをユニット変換に引き渡します。
- **`app/views`配下のERBのみ**。`template_globs:`はプラグインコードを実行せずに読み取られるマニフェスト行であるため、`view_search_paths:`を参照できません。Haml、Slim、およびJbuilderは異なるコンパイラの背後にある同じ継ぎ目であり、クレームされません。
- **暗黙のselfヘルパーのみ**。明示的なレシーバーを持つ`*_path`／`*_url`呼び出し（`Rails.application.routes.url_helpers.x_path`）は素通りします。
- **パスベースのファイルフィルタ**。`controller_search_paths`下のファイルはクラス階層にかかわらずチェックされます。そこに置かれた非コントローラーファイル（まれ）もスキャンされてしまいます。
- **カバレッジはアップストリームのファクトに従う**。ヘルパーの検証は`rigor-rails-routes`が公開したものだけを把握し、`permit`の検証は`rigor-activerecord`が公開したものだけを把握します ── これらのプロデューサーを有効化すると、このプラグインがチェックできる範囲が広がります。
- **`params[:key]`は型なしのまま**。コントローラーの内側では`params`は`ActionController::Parameters`として型付けされ、常にそれを返すビルダーのメソッド——`require`・`permit`・`permit!`・`expect`・`slice`・`slice!`・`except`・`without`・`extract!`・`merge`・`merge!`・`reverse_merge`・`reverse_merge!`・`with_defaults`・`with_defaults!`・`compact`・`compact_blank`・`deep_dup`——の結果も同様なので、それらから組み立てた連鎖は全体を通じて具体的なレシーバーを保ちます。添字による読み取りは意図的に型なしのまま残されます: `params[:missing]`は実行時に`nil`であり、そうでないと述べる型は、フローのルールに生きた条件（`if params[:q]`・`url.nil?`）を定数へ畳み込ませ、動作するコードを報告させてしまうからです。結果が呼び出しに依存するメソッド——`dig`・`fetch`・`compact!`、およびブロックなしの`select` / `reject` / `transform_keys` / `transform_values`——も同じ理由で型なしです。
- **`flash[:key]`と`session[:key]`も型なしのまま**。同じ理由であり、同じやり方で計測しました。どちらも、格納されたものを——設定されていないキーには`nil`を——返す葉の読み取りです。nilでない型は`mode = flash[:notice] ? … : …`を片方の腕へ畳み込み、その後の生きたガードを報告します;nil許容の型は`note = flash[:notice]; note.upcase`に`call.possible-nil-receiver`を乗せます。これらを通じた書き込みは影響を受けません: `flash[:k] = v`が`v`なのは、Rubyで代入式が意味するものがそれだからであり、ルールは必要ありません。

## プラグインの内部

プラグイン横断のファクト契約（`:helper_table`／`:model_index`）、コントローラー／ビューの発見プロデューサー、デモ、そしてこのプラグインが行使する契約サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-actionpack/README.md)にあります。プラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
