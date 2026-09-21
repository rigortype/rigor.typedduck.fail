---
title: "render箇所のlocalsとレイアウト — コーパス計測"
description: "rigortype/rigor docs/notes/20260917-render-locals-and-layouts.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260917-render-locals-and-layouts.md"
sourcePath: "docs/notes/20260917-render-locals-and-layouts.md"
sourceSha: "b04be1096d2a7146e1633726e3ec068e158933febc652fdb0e4d5986ac119cd7"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
translationStatus: "translated"
sidebar:
  order: 20266917
---

ステータス: [#1047](https://github.com/rigortype/rigor/issues/1047)の計測ノート。ブランチ`render-locals-and-layouts-1047`、ベース`63bbfa33`（#393のERBテンプレートユニット、#1053の`ProjectScan`インデックス、および#1057のコントローラー → テンプレートエッジを含む）、Ruby 4.0.5で計測。

設計ノート（[`20260816-effect-labels.md`](../../design/20260816-effect-labels/) § 11.3）が挙げ、#393が見送った2つの半分であり、それらは2つの側面から見た1つの作業である: render箇所の`locals:`を追跡することが`flow.`ルールをビューに戻す契機となり、`<%= yield %>`をコンパイル可能にすることがレイアウトにユニットを与える。

興味深い結果は**負**の結果であり、それこそが本スライスの主眼である: 計測された理由によって抑制されていたファミリーの抑制を解除でき、コーパスは1バイトも動かない。

## 方法

[#1048ノート](../20260917-controller-template-edge/) § 方法と同一であり、そこに`measurement.md`に欠けていたbundlerの呼び出し方法が記載されている。サーベイのツリーはその場で直接実行されることはないため、プライベートコピーを作成した:

```sh
rsync -a --exclude .rigor --exclude .git ../rigor-survey/<name>/ tmp/corpus/<name>/
```

両方のコピーには同一の最小限の`.rigor.yml`（`paths: [app]`、`plugins: [rigor-activerecord, rigor-actionpack]`、`effects: {enabled: true}`）が与えられ、両アームとも同一のFlakeシェルおよび同一のbundleの下で実行され、各実行の前に`.rigor`が削除された:

```sh
cd tmp/corpus/<name> &&
BUNDLE_GEMFILE=<w>/Gemfile BUNDLE_APP_CONFIG=<w>/.bundle BUNDLE_PATH=<w>/vendor/bundle \
  bundle exec <w>/exe/rigor check --format json --no-stats --no-cache
```

**前（before）**アームはベースコミットの作業ツリーであり、**後（after）**アームはこのブランチである。両方のコンパイラが依然として機能しており、計画というよりは幸運によるものである: redmineの`.bundle/config`は自身の`vendor/bundle`から`erubi-1.13.1`を解決し、mastodonにはインストールされたbundleがなく標準ライブラリの`ERB` 6.0.1.1でコンパイルする。

姿勢の変化が結果であるため、2つではなく4つのアームが取得された:

| アーム | 抑制セット |
| --- | --- |
| `before` | `["call.", "flow."]` — `master`がリリースしているもの |
| `before-flow` | `["call."]` — `master`において、#1047が対象とするファミリーを再度有効化したもの |
| `after` | `["call.", "flow."]` — このブランチ、従来の姿勢 |
| `after-flow` | `["call."]` — **このブランチ、リリースされる内容** |

## 1. 偽陽性ゲート

`rigor check --format json --no-stats --no-cache`を実行し、`(path, line, rule, message)`多重集合として差分をとった — 結果として、バイト単位で一致した。

| プロジェクト | `before` | `before-flow` | `after` | **`after-flow`（リリース）** |
| --- | ---: | ---: | ---: | ---: |
| redmine | 435 | **438** | 435 | **435** |
| mastodon | 1180 | 1180 | 1180 | **1180** |

`before-flow`は#393が計測した3件の偽陽性を正確に再現している:

```
app/views/common/_other.html.erb:5  flow.always-truthy-condition  condition is always falsey …
app/views/common/_other.html.erb:7  flow.always-truthy-condition  condition is always falsey …
app/views/common/_other.html.erb:11 flow.always-truthy-condition  condition is always falsey …
```

`after-flow`は両プロジェクトにおいて**`before`とバイト単位で一致**している — 同一の172,398バイトおよび475,466バイトのJSONである。したがって、1つの欠落した束縛のために抑制されていたファミリーは、束縛が導入されると何も報告しなくなり、`flow.`は`SUPPRESSED_VIEW_RULES`から脱退する。抑制は代理人であり、嗜好ではなかった。

`after`と`after-flow`も同一であることは、逆側からの同じ言明である: いずれのコーパスでもテンプレートが生成した唯一の`flow.`行はその3件であり、それらは解消された。

**レイアウトもここには何のコストももたらさない**。redmineは以前却下していた4つのテンプレートをコンパイルし、mastodonは2つをコンパイルするが、どちらのプロジェクトも診断を増やさない — パースエラーも、`call.`も、`plugin_loader`行もない。レイアウトはメソッドと最も似ていない本体を持つテンプレートであるため、これはレイアウトが壊す可能性のあった唯一の事象であった。

### localsインデックスが実際に見出したもの

| プロジェクト | 検出されたrenderターゲット | シードされた名前 | うち具体的に型付けされたもの |
| --- | ---: | ---: | ---: |
| redmine | 131 | 100 | 2 |
| mastodon | 60 | 4 | 0 |

`型付けされた`列は小さくなるように意図されている。型はエンジンがそれに基づいて動作する主張であるため、呼び出し自身が示すもの（定数上の非nil可能なファインダーやコンストラクタ、あるいはレンダリングアクション自身のシードがすでに型付けしたivar）からのみ、かつその名前を渡すすべての箇所が合意する場合にのみ決定される。それ以外はすべて型を持たない名前であり、それこそが偽陽性が必要としていたものである: `path`は*既知*である必要はなく、*束縛*されている必要があった。mastodonの60ターゲットに対して4つの名前という数値はHamlのギャップが現れている — そのrender箇所のほとんどは、本プラグインが一度もコンパイルしなかったテンプレートを指定している。

`common/_other`は3つの箇所から`{kind, path, download_link}`（すべて`Dynamic`）をシードする — そして3番目の箇所（`common/_pdf.html.erb`の生の`render :partial => 'common/other'`）はそれらの**どれも**渡さない。これはユニオンルールが自身の存在意義を発揮している例である: 一部の箇所でのみ束縛されている名前であってもシードされる。インデックスが存在への合意を要求していた場合、上記の計測値は438となっていたはずである。

## 2. レイアウトと、エッジが到達するもの

`rigor effects --format json --full`、`before`と`after-flow`の比較。

| プロジェクト | `view:`ユニット（前 → 後） | レイアウトユニット | `template-not-analysed`（前 → 後） |
| --- | ---: | ---: | ---: |
| redmine | 502 → **506** | 5 | 148 → **140** |
| mastodon | 44 → **46** | 2 | 329 → 329 |

redmineの5つのレイアウトユニットは`view:layouts/base.html`、`layouts/admin.html`、`layouts/mailer.html`、`layouts/mailer.text`、および`layouts/_file.html`である — 最後はパーシャルレイアウトであり、ビューの`render layout:`が指定するものである（`RenderingHelper#render`はブロックが与えられた場合に`layout:`を`partial:`へと書き換える。これは[#1057](https://github.com/rigortype/rigor/issues/1057)がすでに採用した解釈である）。それらのうち4つが新規である。`layouts/mailer.text`は`yield`を持たないため以前からコンパイルされていた。

**redmineの`ActionView::Base#render`汚染のうち8件が免除され**、72 → 64となった。8件すべてが同一の形状である — 6つの`attachments/*.html.erb`ビューおよび`layouts/admin.html`が`render :layout => 'layouts/file'`を行っており、`AttachmentsController#show`が伝播によってそのうち1つを継承している。それらのすべてが、以前は却下されていたファイルを指していたレイアウトrenderである。

mastodonは何一つ免除しないが、これは正しい回答である: その2つのレイアウトはERBの`render layout:`ではなくRailsのレイアウト機構によってレンダリングされ、356個のビューのうち310個はHamlである。

**意図的にエッジ付けされていないもの**。Railsが*アクション*のテンプレートをラップするレイアウト — `layouts/application`、または`layout "base"`が指定したもの — にはエッジが張られない。calleeルールは呼び出しの引数リテラル、ユニットのオーナークラス、およびユニット自身のキーを読み取ることができる（[`callee_rule.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/effects/callee_rule.rb)）。そしてレイアウトの名前はその3つのどれでもない: クラス本体の宣言に加え、コントローラー階層を通じて継承されたビューツリーに対する規約検索である。それを読み取ることは、プラグイン行の意味をビューツリーの関数にすることになり、そのモジュールのコメントがスキャンで行ってはならないと述べているまさにその行為となる。無条件に`layouts/application`を指定することは検討されたが、コーパスが具体化する理由によって拒否された: redmineの`ApplicationController`は`layout 'base'`を宣言しているため、推測は506個のテンプレートすべてにおいて誤りとなり、他所でも偶然にしか正しくならない。

## 3. 決定論

redmineにおける`rigor effects --format json --full`は、`RIGOR_RACTOR_WORKERS=2`とシーケンシャル実行の間で**バイト単位で一致**している — 同一の3,537,106バイト（レビューHEADでは3,533,152バイト、§ 5）、同一の506個の`view:`行、同一の140件の残余汚染。本スライスのいかなる部分もエッジやユニットにフィールドを追加しないため、#1057のソートキーのハザードは再発しない。計測は、親プロセス上で実行されすでに凍結された`TemplateUnit`データとしてのみワーカーに届く2つのインデックスに対する負の対照群である。

## 4. 計測が下した2つの決定

### `yield`の書き換えは継ぎ目の書き換えではなくテンプレートの書き換えである

継ぎ目は意図的にユニットの本体を合成メソッドでラップしない（[`macro-substrate.md`](../../internal-spec/macro-substrate/) § 位置: ラッパーはすべての行をずらし、プラグインのマップの上に第2のマップを合成してしまう）。したがって、*記述されたとおりにパースされなければならない*本体は、`BLOCK_EXPR`とトリムマーカーがすでに存在する同一の事前パスにおいて、*記述されたとおりに書き換えられなければならない*: ERBタグ内の`yield`キーワードは`__rigor_yield`（合成されたビューコンテキスト上の通常の暗黙的self呼び出しであり、プラグインのバンドルされた`sig/action_view.rbs`内で`(*untyped) -> String`として宣言される）になる。

他の2つの書き換えとは異なり、これは**等幅を保持しない**が、その必要もない — `line_map`が空でないユニットはその構造上1列目で報告されるためである（`Analysis::TemplateUnits#remap`）。書き換えられたレイアウト上のラインマップは依然として正確であり、specによって固定されている。

`String`は最も広い誠実な解釈であり、捏造ではない最も狭いものである。Railsの`yield`は内部テンプレートのバッファが保持するものを返し、`yield :sidebar`は`content_for`バッファを返す — 何も提供されなかった場合は空の`SafeBuffer`であり、決してnilではない。これ以上具体的なものは、1レイヤー上の`Parameters#[]`の罠となる。`content_for?(:x)`は何も必要としなかった — オープンレシーバー上の通常のメソッド呼び出しであったためである。

### インデックスは2つのリーダーのために1回コンパイルする

render-localsインデックスの構築はすべてのテンプレートを読み取ってコンパイルし、`#template_units_for_file`はそれらの各々を再度コンパイルしようとしていた。したがってビルダーは、パスをキーとしテンプレート自身のスクラブ済みバイトによって保護されたコンパイル結果を保持し、ユニットフックがそれを再利用する — そのため完全な`rigor check`は本機能の前に行っていたのとまったく同一のコンパイル作業（2パスではなく1パス）を行い、エディタバッファ（バイトが異なる）は古いユニットを提供されるのではなく自身のコンパイルへとフォールスルーする。

その主張は本ノートの第1ドラフトでは逆の方向で誤っていた: インデックスは長寿命の`ProjectContext`が保持するプラグインインスタンス上にメモ化されるため、パブリッシュによってインデックスが再構築されることは**なかった** — したがって真の代償は**陳腐化**であり、レビューがそれを発見した（§ 5）。

## 5. レビューが発見し、コーパスが発見できなかったこと

どちらも両コーパスが記述していない形状であり、どちらも正しいテンプレートに指摘箇所のコストを負わせることになったはずである。

### インデックスが読み取れないrender箇所

`flow.`が報告される状態では、標準的なオプショナルlocalプリアンブルは、インデックスがrender箇所を認識できないパーシャル（`locals: { **opts }`、`locals: some_hash`、`app/helpers/*.rb`内の`render`（スキャンされない）、および最も一般的な、*どの*箇所も渡さないデフォルト値付きオプショナルlocal）に対して`flow.always-truthy-condition`を依然として発火させていた。コーパスはそれらのいずれにも遭遇しなかったが、これはRailsというよりはredmineのスタイルを物語っている。

修正は、ユニオンと同様の過剰束縛の精神に基づいている: `defined?(path)`、`defined? path`、`local_assigns[:path]`、または`local_assigns.key?(:path)`（および`fetch` / `has_key?` / `include?`）を記述するテンプレートは、`path`をオプショナルlocalとして*宣言*しており、その宣言にはrender箇所を必要としない。そのような名前はすべて、render箇所のシードおよびstrict-localsコメントの下で`Dynamic`としてシードされる（`ViewUnits.self_declared_locals`）。4つの形状すべてがデフォルトの姿勢下で沈黙するよう固定されており、宣言の読み取りをoffにするとそれぞれ失敗する — したがって`flow.`は抑制されないまま維持される。

レビューHEADで再計測したところ、`rigor check`は両プロジェクトにおいて依然として**`before`とバイト単位で一致**しており（3つの`_other.html.erb`の名前はすでにそのrender箇所によって束縛されていた）、mastodonのエフェクトテーブルは変更されず、redmineのテーブルはまさに1つの方法でのみ動いた: **52個のユニットが不要な`unresolved-self-call`原因を失った** — 51件の`filedrop`および1件の`thumbnails`。`attachments/_form.html.erb`および`attachments/_links.html.erb`が`defined?(filedrop)` / `defined?(thumbnails)`をテストしており、テストされたlocalがビューコンテキスト上の呼び出しとして読み取られ、アタッチメントフォームをレンダリングするすべてのコントローラーアクションへと伝播していたためである。ラベルの移動はなく、`exhaustive`の反転もなく、`template-not-analysed`は140のままである。プール == シーケンシャルは依然としてバイト単位で成立している（3,533,152バイト）。

### render箇所よりも長生きしたメモ

`@render_locals ||=`はプラグインインスタンス上に存在し、`LanguageServer::ProjectContext`はそのインスタンスをパブリッシュをまたいで保持する（`invalidate!`は新しいインスタンスを構築するため、保存 — `didChangeWatchedFiles`を発火させる — は常に回復していた）。その一方で、#1038の持ち越しは各テンプレートを自身のバイトに対して再検証していた。エディタが保存を検知しない形でディスク上の`show.html.erb`内のlocalを削除すると（`git checkout`、フォーマッタ、別のツール）、何か無効化されるまで`_card`のユニットはすべてのパブリッシュを通じてシードを保持し続けた: ディスク上に原因のない`flow.`行が発生する。

2つの半分があり、両方が必要であり、両方が固定されている（それぞれのspecは半分を差し戻すと失敗する）:

- **コレクターはプラグインの全要求に対してその持ち越しを決定する**。そのテンプレートのいずれかが編集、追加、または削除された場合、そのユニットは一切持ち越されない — 変換がプラグインの他のテンプレートを読み取る可能性があるため、テンプレート自身の鮮度はそのユニットを保証できない。エディタのバッファは除外されるためキーストロークのコストは決してかからず、所有者が無効化を行っていないディスク上の編集でのみ影響する（保存はいずれにせよコールドで無効化および再構築を行う）。redmineで計測したところ、再コンパイルは0.1〜0.3秒である。ユニットなしで読み取られたテンプレート（却下）は素のstatパックとして持ち越されるため、プラグインがコンパイルできない1つのレイアウトがすべての実行で編集として読み取られることはない。ルールが認識しない唯一の変更は、そのような却下されたテンプレートの*削除*であり、兄弟が読み取れるものには何も貢献していなかった。
- **プラグインはコレクションパスごとに1回、インデックスを再検証する**。インデックスが読み取るすべてのコントローラー、ヘルパー、テンプレートのフィンガープリント（ファイルごとのglobおよび`stat`。バイト単位で一致する`touch`はインデックスを再構築するが、再構築のコストがかかるだけで誤った回答を返すことはない）に対して行われる。パスは新しいエンジンフック`Plugin::Base#template_units_pass_started`によって通知され、チェックはそのパスの最初の`#template_units_for_file`で実行される。2回目のレビューラウンドにより、パスの順序からパスを推論するだけでは不十分であることが示された — ウォームパスはエディタのバッファのみを提供するため、ディスク上の編集後にバッファを切り替えると、2つのパスがどちらの順序でソートされていても陳腐化したものが提供されていた — そして編集されたテンプレート自身のバイトが到着したときに再検証するのでは遅すぎる: `_card.html.erb`は`show.html.erb`よりも前にglobされる。

### `defined?`でテストされたヘルパー

共有パーシャル内の`<% if defined?(current_user) && current_user %>`はオプショナルlocalではなく*ヘルパー*をテストしており、それをシードするとその後のすべての`current_user`が呼び出しから`Dynamic`読み取りへと変わってしまう。したがって、`app/helpers`配下のプロジェクトヘルパーが`def`する名前はシードされない。gemやコンサーンが定義するヘルパーはそのスキャンによって認識されず、依然としてシードされる — ビューコンテキストはまだプロジェクトヘルパーを解決しないため、現状ではいずれにせよ`Dynamic`である。また、`defined?`は名前がそのオペランド全体である場合にのみlocalを指定し（`defined?(link_to "x", y)`は何の名前も指定しない）、`<%#`コメントタグは読み取られない。

残る事項はマニュアルに記載されているとおりである: 保存されていない`locals:`は保存されるまでパーシャルに届かない。インデックスはディスクから読み取るためである。

## 意図的に計測しなかったもの

- **Haml / Slim / Jbuilder**。依然として異なるコンパイラの背後にある同一の継ぎ目であり、mastodonはそれらを要求しないことの代償の計測であり続けている — 現在では、その60個のrenderターゲットのうち56個が本プラグインが一度もコンパイルしなかったテンプレートを指定しているという追加の知見を伴っている。
- **`.js` → `.html`フォーマットフォールバック**（[#1065](https://github.com/rigortype/rigor/issues/1065)）。エッジにおける最大の単一の残余ギャップであり、ここでは触れていない: redmineの`ActionView::Base#render`残余は64であり、その大半は#1057がカウントした34個のHTMLパーシャルをレンダリングする`.js.erb`ユニットである。
- **エッジとしてのコントローラーの`layout`宣言** — 上記の§ 2。
- **コーパス上での`view_type_checks: true`**。`call.`を有効化するが、これは#393ですでに計測されており、本スライスはそのファミリーが認識するものを新たに束縛されたlocals以上に変更するものではない。
