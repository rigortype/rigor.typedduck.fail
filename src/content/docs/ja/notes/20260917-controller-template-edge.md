---
title: "コントローラー → テンプレートのエフェクトエッジ — コーパス計測"
description: "rigortype/rigor docs/notes/20260917-controller-template-edge.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260917-controller-template-edge.md"
sourcePath: "docs/notes/20260917-controller-template-edge.md"
sourceSha: "ba77d5dbd0e28ce4706229e78072b810bef05c969d64991a4fdd3be0963632af"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
translationStatus: "translated"
sidebar:
  order: 20266917
---

ステータス: [#1048](https://github.com/rigortype/rigor/issues/1048)の計測ノート。設計上のコミットメントはPRおよび[`effect-labels.md`](../../type-specification/effect-labels/) § プラグイン層（The plugin stratum）にある。ブランチ`controller-template-effect-edge-1048`、ベース`00714154`（#393のERBテンプレートユニットを含む）、Ruby 4.0.5で計測。

2つのものが構築された。**1つがリリースされた:**

1. **エッジ** — `render`呼び出し箇所をテンプレート自身の`view:`ユニットへのコールグラフエッジに変換する`EffectAttribution#callee:`ルール、およびRailsの暗黙的renderに対するユニットレベルのルール。

**もう1つはリリースされなかった**。ファーストパーティのバンドルプラグインの免除行を、宣言されたレーン（declared）から証明されたレーン（proven）へ移動させることが`views: strict`と`views: lenient`に差異を生じさせる手段であったが、これは[ADR-103](../../adr/103-effect-labels/) WD17（まさにそれを検討した上で却下したオーナー裁定）に反する。構築および計測された後に差し戻された。§ 3はその計測結果であり、未解決の課題（[#1059](https://github.com/rigortype/rigor/issues/1059)）が影響範囲を必要とするため記録として残されている。**計測されたが、リリースはされていない**。

## 方法

両方のコーパスプロジェクトは、まずサーベイ用チェックアウトからコピーされた — サーベイのツリーはその場で直接実行されることはない（[`docs/agents/measurement.md`](../../agents/measurement/)）:

```sh
rsync -a --exclude .rigor --exclude .git ../rigor-survey/<name>/ tmp/corpus/<name>/
```

各コピーには同一の最小限の`.rigor.yml`（`paths: [app]`、`plugins: [rigor-activerecord, rigor-actionpack]`、`effects: {enabled: true}`）が与えられた。**ベースライン側の検証対象は、第2のワークツリーではなく`git archive`で展開されたベースコミット**である。ワークツリーチェックアウトのbundlerはそのワークツリーの`Gemfile`パスのgemを実体化できず、ベースラインのすべての実行が空のJSONエラーとなって誤った`base=0`を報告してしまうためである。両側の検証対象は同一のFlakeシェルおよび同一のbundleの下で実行される:

```sh
cd tmp/corpus/<name> &&
BUNDLE_GEMFILE=<w>/Gemfile BUNDLE_APP_CONFIG=<w>/.bundle BUNDLE_PATH=<w>/vendor/bundle \
  bundle exec <engine>/exe/rigor check --format json --no-stats --no-cache
```

これら3つのbundler変数はすべて耐荷重であり、いずれも`measurement.md`のレシピには記載されていない。redmineは自身の`vendor/bundle`を指す`BUNDLE_PATH`を持つ`.bundle/config`を同梱しており、cwdはターゲットでなければならない — そのため、これらがないとbundlerは*redmineの*Gemfileを読み取り（"Please configure your config/database.yml first"）、別のnixpkgs Rubyに対してredmineの`json`ネイティブ拡張をロードしようとして異常終了する。ADR-90のターゲットbundle解決は、プロセスの設定ではなくターゲット自身の設定を読み取るため、依然としてredmineのErubiを見つけ出す。

各実行の前に`.rigor`キャッシュディレクトリは削除される。

## 1. 偽陽性ゲート

`rigor check --format json --no-stats --no-cache`を実行し、`(path, line, rule, message)`多重集合として差分をとった — 結果として、バイト単位で一致した:

| プロジェクト | 診断数（前） | 後 | **新規** | 削除 |
| --- | ---: | ---: | ---: | ---: |
| redmine | 435 | 435 | **0** | 0 |
| mastodon | 1180 | 1180 | **0** | 0 |

両方のJSONファイルは実行間で**バイト単位で一致**している。これは幸運な結果というよりは期待された形状である。エッジはコールグラフのエッジを追加して汚染を除去するものであり、汚染が診断になることは決してない。リリースされなかったレーン移動についても別の理由から同様であった — レーン移動はプロジェクトが`effects.envelopes:`スタンザを宣言している場合にのみ影響するが、どちらのコーパス設定も宣言していない。このこと自体が知る価値のある事実である。コーパスはその構造上、レーンに関して沈黙している。

## 2. エッジが到達するもの

`rigor effects --format json --full`、同一の2つの検証対象。

| プロジェクト | `.erb` | Haml | `view:`ユニット | `template-not-analysed`の原因（前 → 後） |
| --- | ---: | ---: | ---: | ---: |
| redmine | 506 | 0 | 502 | 253 → 148 |
| mastodon | 46 | 310 | 44 | 329 → 329 |

ネットの集計値は報告に値する事象を覆い隠してしまうため、原因をそれを生成した行ごとに分解した:

| プロジェクト | `ActionController::Base#render` | `ActionController::Base#render_to_string` | `ActionView::Base#render` |
| --- | ---: | ---: | ---: |
| redmine | 251 → **76** | 2 → **0** | 0 → **72** |
| mastodon | 328 → 328 | 0 → 0 | 0 → 0 |

**redmineのコントローラー側のrender汚染のうち177件が免除された** — これが本機能の成果である。テンプレート側に現れた72件はリグレッションでも損失でもない。この変更の前は、テンプレート*内部*の`render`は何も提供せず、パーシャルをレンダリングするビューは自身が何をレンダリングしたかについて何も語らないまま網羅的と判定されていた。これらはプラグインが初めて「このテンプレートは未解析の何かをレンダリングしている」と述べたことによるものである。それらは他の原因と同様にコントローラーへと伝播し、それが177件とネットの105件との差分のすべてを占めている。

### その72件の実態

明白な推測が誤りであるため、一覧にする価値がある。57個の`view:`ユニットが独自の原因を保持しており、残りの約15件は伝播である。**どちらのグループのエッジも、実在するユニットを指しているものは存在しない**。したがって、リゾルバが見つけられたはずのものを落としているわけではない — そして57件中34件は単一の形状である:

| グループ | ユニット数 | 内容 |
| --- | ---: | --- |
| HTML専用パーシャルをレンダリングする`.js.erb` | **34** | `watchers/_set_watcher.js.erb`が`render partial: 'watchers/watchers'`を行っているが、これは`_watchers.html.erb`としてしか存在しない。フォーマットは囲んでいるユニットから伝播するため、キーは`view:watchers/_watchers.js`となる — そして`[:js]`のリクエストは`[:js, :html]`へとフォールバックするためRailsはこれを解決する。[#1065](https://github.com/rigortype/rigor/issues/1065)として起票。 |
| `.html.erb`、混在 | 22 | 動的なパーシャル名（`render partial: @thing`）、ビュー側の`render :layout => "…"`形式、およびレイアウト（依然として却下ユニットである、[#1047](https://github.com/rigortype/rigor/issues/1047)）。 |
| 1件の`.js`レイアウトrender | 1 | 上記の行と同じ、フォーマットが異なるもの。 |

したがって、残された最大の単一のギャップはレイアウトのギャップではなく**フォーマットのフォールバック**である。それがこの帰属が生み出した有益な成果であり、ネットの数値からは見えないものであった。

**redmineのコントローラーアクションのうち298個が少なくとも1つのエフェクトラベルを獲得**し、合計で342個のユニットがラベルを獲得した。すべてのラベルは、実際にレンダリングするテンプレートが保持しているものである。`io.db.*`行を保持するredmineのビューユニットは35個（#393のカウント）から**60個**に増加した。これはテンプレート → パーシャルのエッジによるものであり、それ以外ではない — レーンの移動はその数値を動かさない。

4つのルールがカウントを動かしており、そのすべてがコーパスからではなくレビューから生じたものである — この点は率直に述べる価値がある。**コーパスはいずれも発見できなかったはずである**。それぞれの代償は欠落したラベルまたは不要なラベルであり、いずれも診断ではないためである。

- `responds:`の呼び出しはユニットの**トップレベル**でのみ記録され、**ブロックやラムダは分岐である**。
  `redirect_to "/" if @user.nil?`はあるパスで応答し、もう一方のパスには暗黙的renderを取らせる。`User.transaction { redirect_to "/" }`も同様であり、`respond_to { |f| f.html; f.json { render json: @user } }`（JSON側のアームの応答がHTML側のアームのテンプレートを立ち退かせていた、Railsで最も一般的なイディオム）のHTMLアームも同様である。`@after = -> { redirect_to "/" }`（応答を実行するのではなく保存する）も同様である。これらいずれかの中で応答を記録すると、テンプレートエッジが脱落する*上に*アクションが網羅的と判定されてしまう。これにより、コントローラーアクションのカウントは270から298に増加した。
- 例外は`respond_to`**自身**のブロックであり、これは分岐ではなくフォーマットディスパッチャーである。そのアームは通常のブロックであるため、`format.html { render :show }`は`render`が指定するエッジの隣に規約に基づくエッジを保持する — エッジはラベルであり汚染ではないため、これは受け入れられた過剰近似である。
- **`private` / `protected`**メンバーが暗黙的renderを取ることはない。Railsの`action_methods`はpublicのみであるためである — そうでなければ、`app/views/users/card.html.erb`の隣にある`private def card`にそのテンプレートのエフェクトが渡されてしまう。`public :foo`は差し引かれ、リージョン内の`def self.x`は何のマークも付けない。そうでなければ同じルールが逆側からpublicアクションをprivateとしてマークしてしまうためである。
- 記述されたハンドラまたはフォーマットは名前から切り離されるため、`render template: "users/show.html.erb"`は決して応答されることのない`view:users/show.html.erb.html`というキーではなく、`view:users/show.html`に到達する。

**mastodonは何一つ免除せず、それはギャップではなく誠実な結果である**。356個のビューのうち310個がHamlであり、`template_globs:`は`*.erb`のみを対象とし、そのコントローラーは圧倒的にHamlをレンダリングする — したがって、レンダリング箇所はどのユニットも応答しないキーへと解決され、エッジは破棄され、その行の汚染はプロパゲーターによって再びシードされる。これは本機能が最も必要としていた負の対照群である。一度も解析されていないテンプレートを持つrenderが決して網羅的と判定されてはならず、329個の箇所が依然として網羅的ではないと判定されている。

維持すべき2つの数値は、**免除されたコントローラー側のrender汚染177件と、0件の新規診断**である。

### プール実行とシーケンシャル実行

redmineにおいて、`RIGOR_RACTOR_WORKERS=2`とシーケンシャル実行の間で**エフェクトテーブルはバイト単位で一致**している — 3,653,853バイトの`effects --format json --full`、同一の502個の`view:`行、同一の148件の残余汚染。新ルールが記録するエッジは`freeze_edges`によってソートされる通常の`FileCollection::Edge`値であり、`taint_if_unresolved`はそのソートキーに含まれている。これは、マーシャリングされたワーカーコレクションとシーケンシャルコレクションが`==`を保つために、エッジに追加されるDataメンバーに要求される要件である。

## 3. レーン移動: 計測されたが、リリースはされなかったもの

以下に記載する内容はすべて、本PRが**差し戻した**変更に関するものである。`EnvelopeCheck`はprovenレーンを読み取り、プラグインの帰属はdeclaredレーンに乗るため、エンベロープはRailsプラグインが提供するいかなるラベルも判定できず、`views: strict` / `views: lenient`のペアに差異が生じることはない。ファーストパーティのバンドルされた免除行を`proven`に昇格させることでそれが修正されるが、ADR-103 WD17のオーナー裁定に矛盾する。これはレーン側の一存で覆せるものではない。数値がここに保持されているのは、[#1059](https://github.com/rigortype/rigor/issues/1059)がそれを必要としているためである。

計測された影響範囲は「Railsレイヤー」ではなく、**10個のバンドルプラグイン**である: rigor-actionpack（12個の`discharge: true`行）、railties（8個）、activejob（3個）、activerecord（3個）、actionmailer（2個）、activesupport-core-ext（2個）、rails-i18n（2個）、sidekiq（2個）、actioncable（1個）、activestorage（1個） — いくつかはセレクタリスト上の`map`で構築されているため、各行はレポートにおいてファミリー全体に相当する。specスイートの反応は`spec/rigor/effects/rails_layer_spec.rb`内の18個のexampleであり、すべて機械的な`declared` → `proven`であった。コーパスの診断はそれがあってもなくてもバイト単位で一致していた。

### サブ変更を個別に計測しなければならなかった理由

素朴な前後のラベルdiffでは、実際にはもたらしていない利得をレーン移動の手柄にしてしまう。その理由は**レンダリングルール**にある。サマリーが出力される際、同じサマリーのprovenレーンがすでに認めているdeclaredラベルは省略される。mastodon上の`Settings::ImportsController#create`は、変更前は

```
effects: [io, mutate.self, nondet.time]        declared: [rails.response.write]
```

と表示され、変更後は`io.db.read` / `io.db.write` / `io.db.transaction`と表示された。何も新たに発見されたわけではない。provenレーンが生の`io`を保持しており`io.db.read`はその下位にあるため、これら3つは*すでに*declaredレーンに存在し隠蔽されていたにすぎない。それらをprovenに移動したことで可視化されただけである。

そのため、第3の検証対象 — エッジは保持し、レーン移動は差し戻したもの — が両プロジェクトで実行され、差分がきれいに帰属された（上記の4つのルールの前に取得されたため、エッジ列はリリース時の342 / 298 / 175引く72ではなく314 / 270 / 109となっている）:

| プロジェクト | サブ変更 | ラベルを獲得したユニット | うちコントローラーアクション | 免除された汚染 |
| --- | --- | ---: | ---: | ---: |
| redmine | エッジ | 314 | 270 | 109 |
| redmine | レーン | 1 | 0 | 0 |
| mastodon | エッジ | 1 | 0 | 0 |
| mastodon | レーン | 9 | 2 | 0 |

**レーン移動が「獲得」した10個のユニットはすべて、この種のレンダリングルールによる覆い隠しの解除であり、新たなファクトは1つもない**。これがこの実行が#1059に対して生み出した最も有用な結果である。2つの実際のRailsアプリケーションに対する昇格の目に見える効果は、すでにそこに存在していたラベルを明らかにすることであり、これは`proven`が何を意味するかという議論ではなく、表現方法に関する議論である。

## 意図的に計測しなかったもの

- **`effects.envelopes:`スタンザを持つプロジェクト**。レーン移動のユーザーに見える唯一の影響は、ファーストパーティプラグインがフレームワークメソッドの動作として主張する内容をエンベロープが判定することである。どちらのコーパス設定もそれを宣言していないため、コーパスはその構造上沈黙している — これこそが、#1059における決定をコーパススイープによって解決できない理由である。
- **レイアウト**。すべてのレイアウトは依然として却下ユニットである（[#1047](https://github.com/rigortype/rigor/issues/1047)）。そのため、テンプレート内部の`render layout:`はその汚染を保持する。これは意図的でありspecによって固定されている。それは計測結果というよりはredmineにおける148件の残余汚染の一部であり、[#1065](https://github.com/rigortype/rigor/issues/1065)の`.js` → `.html`フォーマットフォールバック（汚染された`view:`ユニット57個中34個）よりも小さな割合を占める。
- **Haml / Slim / Jbuilder**。同一の継ぎ目、異なるコンパイラ、依然として未請求 — そしてmastodonは現在、その代償がどれほどであるかの証拠となっている。
- **到達ではなくカウントされた`render partial:, collection:`**。`collection:`はパーシャルが実行される回数を変えるだけであり、どのパーシャルが実行されるかを変えるわけではない。エフェクトサマリーはカウントではなく本文に対する上限であるため、ルールはオプションを読み取り無視する。

## 2026-09-18 — `.js` → `.html`フォーマットフォールバック（[#1065](https://github.com/rigortype/rigor/issues/1065)）

ブランチ`js-format-html-fallback-1065`、ベース`121620ed`（#1066のrender箇所のlocalsおよびレイアウトユニットを含むため、ベースの数値は§ 2のものではない）に対して上記の方法で実施: プライベートな`rsync`コピー、`git archive`で展開したベースライン、同一のbundler変数、各実行前に`.rigor`を削除。

変更内容: rigor-actionpackのビュー`render`行が`callee_fallbacks: { "js" => ["html"] }`を保持し、`rails_render_partial`が囲んでいるユニットから継承したフォーマットのためにそれをエッジにコピーし、プロパゲーターがユニットが応答する`js`、`html`の最初のものを採用し、両方とも応答しない場合にのみその行の汚染をシードする。

### 偽陽性ゲート

| プロジェクト | 診断数（前 → 後） | エフェクトoff |
| --- | ---: | --- |
| redmine | 435 → 435、**バイト単位で一致** | バイト単位で一致 |
| mastodon | 1180 → 1180、**バイト単位で一致** | 未実行 — そのエフェクトテーブルもバイト単位で一致しているため |

### 生成行ごとの汚染

| プロジェクト | `ActionController::Base#render` | `#render_to_string` | `ActionView::Base#render` | 合計 |
| --- | ---: | ---: | ---: | ---: |
| redmine | 76 → 76 | 0 → 0 | 64 → **31** | 140 → 107 |
| mastodon | 328 → 328 | 0 → 0 | 0 → 0 | 329 → 329（1件の`render_to_body`） |

redmineにおいて`template-not-analysed`の原因を保持する`view:`ユニット: **50 → 17**。64個の`.js`ユニットのうち、**34個がそれを保持していたが、1個のみが依然として保持している** — `imports/mapping.js.erb`であり、その`render :partial => "#{import_partial_prefix}_mapping"`はフォーマットの問題が生じる前にルールが却下する計算された名前である。15個の`.html`ユニットは変更されていない。mastodonの`effects --format json --full`出力全体はバイト単位で一致しており、これは期待された回答である（`.js.erb`ビューを持たないため）。

### 解決された33本のエッジがもたらしたもの

汚染のカウントが示唆するよりも少なく、そう明記する価値がある:

- **網羅的になったユニットは0個**。33個の各ユニットは、その`template-not-analysed`原因をHTMLパーシャルが実際に保持している原因（それらにまたがる348個の`unresolved-self-call`、30個の`dynamic-receiver`、10個の`unknown-ownership`エントリー）と交換した。これは誠実な方向である。以前の原因は「未解析」と述べていたのに対し、新しい原因は解析が見出したものを述べている。
- **4つのユニットがラベルを獲得した**（すべてビュー）: `groups/add_users.js`と`members/edit.js`が`io.db.read`を獲得し、`issues/edit.js`と`issues/new.js`が`io.db.read`および`mutate.self`を獲得した。ラベルを失ったユニットはない。
- **コントローラーアクションが得たものは0個**。redmineはその`.js.erb`テンプレートに`respond_to { |format| format.js }`経由で到達し、暗黙的renderルールはアクションを`<controller>/<action>.html`のみにエッジ付けする。そのため、パーシャルのエフェクトは現在`.js`テンプレートには到達するが、アクションの`format.js`アームがその`.js`ユニットにエッジ付けされるまではそこで停止する — これはフォールバックに対する変更ではなく、ユニットルールに対する独立した変更である。

フォールバックが新たに到達可能にした1つの過剰近似: フォールバック経由で到達したパーシャルは自身のパーシャルを`html`でレンダリングするが、Action Viewのコンテキストは依然として`[:js, :html]`であり、まず`.js`を試みる。ネストされたパーシャルが両方のフォーマットで存在する場合、`.js`テンプレートは`.html`パーシャルのラベルを受け取る。redmineにおけるカウントは**0**である — 唯一のデュアルフォーマットパーシャルである`imports/_{issues,users,time_entries}_mapping`は、計算された名前を通じてのみレンダリングされる。

フォールバックが解決を越えてはならない2つの形状（レビューで発見され、マージ前に修正された）: ファイルが存在するがプラグインがユニットを生成しなかったテンプレート（コンパイルされたRubyがパースできないERB、およびプラグインがまったくコンパイルしないハンドラ）。Action Viewはそれらのファイルを実行するため、もう一方のフォーマットのエフェクトはrenderが生成するものではない。`TemplateUnits#declined_unit_keys`がそれらを保持し（プラグインが読み取ったパスと自身の論理名が暗示するルートプレフィックスから導出される）、プロパゲーターはそこで停止する。rigor-actionpackは現在`app/views/**/*.{haml,slim,jbuilder,builder,rabl,ruby}`を要求してそれらのすべてを却下する。これが、エンジンがそれらのテンプレートが存在することを知る方法である: **mastodonにおける313個の却下キー**（そのHamlビュー）と、**redmineにおける2個**（`common/feed.atom.builder`、`journals/index.builder`）。どちらのプロジェクトにもブロックがエッジを変更するケースはない（redmineの33件の解決は変更されず、mastodonのエフェクトテーブルはバイト単位で一致している）ため、このブロックは計測された回復というよりは保護である。要求されていないハンドラは見えないままであり、そのフォールバックはあたかもテンプレートが存在しないかのように発火する。

コントローラーアクションの行のゼロは[#1071](https://github.com/rigortype/rigor/issues/1071)である: `respond_to { |format| format.js }`アームはredmineが`.js.erb`に到達する方法であり、暗黙的renderユニットルールは`<action>.html`のみにエッジ付けする。

### プール実行とシーケンシャル実行

redmineの`effects --format json --full`は、`RIGOR_RACTOR_WORKERS=2`と`0`の間で**バイト単位で一致**している — 3,562,580バイト。`fallback_selectors`は`freeze_edges`のソートキーに含まれている。
