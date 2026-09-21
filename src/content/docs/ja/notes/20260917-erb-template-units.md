---
title: "エフェクトユニットとしてのERBテンプレート — 偽陽性の計測"
description: "rigortype/rigor docs/notes/20260917-erb-template-units.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260917-erb-template-units.md"
sourcePath: "docs/notes/20260917-erb-template-units.md"
sourceSha: "f0e4ddf4c866bfbe2f3f83c50a4dcfb0e37f561389acf08c12bf0445c8d62080"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
translationStatus: "translated"
sidebar:
  order: 20266917
---

ステータス: [#393](https://github.com/rigortype/rigor/issues/393)の計測ノート。PRでリリースされたものを超える設計上のコミットメントはない。ブランチ`erb-template-units-393`（ベース`6e4929d3`、#392のテンプレートユニットの継ぎ目を含む）、Ruby 4.0.5で計測。2つのコーパスプロジェクトは**異なるコンパイラ**を解決したが、これは計画されたものではなく、今回の実行で最も有益な事象となった。redmineは`erubi-1.13.1`を含む`vendor/bundle`を同梱しているためADR-90の解決がそれを見つけてErubiでコンパイルし、mastodonにはインストールされたbundleがないため標準ライブラリの`ERB` 6.0.1.1がコンパイルした。

Issueが設定したゲートは*「Railsコーパス上で新たな偽陽性を出すことなくテンプレートに型付けすること — 正当化されない限りテンプレート内部の`call.*`診断はoffのまま維持する。計測して記録せよ」*である。本ノートはその計測であり、議論ではなく4つのリリース決定にどのように至ったかについての記録でもある — さらに、コーパスが実証し誰も予想していなかった1つの性質（§ 5）についても記す。

## 方法

両方のコーパスプロジェクトは、まずサーベイ用チェックアウトからコピーされた — サーベイのツリーはその場で直接実行されることはない（[`docs/agents/measurement.md`](../../agents/measurement/)）:

```sh
rsync -a --exclude .rigor --exclude .git ../rigor-survey/<name>/ tmp/corpus-<name>/
```

各コピーには同一の最小限の`.rigor.yml`（`paths: [app]`、`plugins: [rigor-activerecord, rigor-actionpack]`、`effects: {enabled: true}`）が与えられ、2回チェックされた:

- **前（before）** — `app/views`を退避させた状態。プラグインの`template_globs:`は何もマッチせず、実行はベースコミットの`.rb`のみの解析と完全に同一となる。
- **後（after）** — viewsを戻した状態。

両者で`rigor check --format json --no-stats`を実行し、`(path, line, rule, message)`多重集合として差分をとった。viewsを退避させることが単一のワークツリー内での比較を可能にする手段である。それ自体が単独で乱す唯一のルールは`render-target` / `missing-template`（viewsディレクトリを読み取る）であるが、以下の差分にはそのファミリーからのものは一切含まれていない。

## 結果

| プロジェクト | コンパイラ | `.erb`ファイル | 構築されたユニット | 診断数（前） | 後 | **新規** | 削除 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| redmine | erubi 1.13.1 | 506 | 502 | 433 | 435 | **2** | 0 |
| mastodon | erb 6.0.1.1 | 46 | 44 | 1180 | 1180 | **0** | 0 |

redmineの2件の新しい行はいずれも`plugin.activerecord.model-call`の**infoトレース**である — `issue_statuses/index.html.erb:29`の`WorkflowTransition.where`、および`users/_mail_notifications.html.erb:28`の`IssuePriority.where`。これらは正しい。それらのテンプレートは実際にそれらのクエリを発行しており、それが本機能の主目的である。いずれのプロジェクトでも、`call.*`行、`flow.*`行、パースエラー、`plugin_loader`行は一切発生しなかった。

変更後の`rigor effects`: redmineは502個の`view:`ユニットを報告し（含まれない4つのテンプレートはレイアウトである — § 3を参照）、そのうち35個が`io.db.*`行を保持している —

```
view:custom_field_enumerations/index.html: [mutate.local] ≤ [io.db.read] …? (17 reasons, --why)
view:documents/_form.html:                 [mutate.local] ≤ [io.db.read] …? (10 reasons, --why)
```

mastodonは44個の`view:`ユニットを報告し、`io.db.*`行は0件であった。これは、ERB表面がほぼ完全に管理画面とメーラーのクロムであるコードベース（ユーザー向けのビューはHamlであり、Hamlは異なるコンパイラである — 下記の*意図的に計測しなかったもの*を参照）にとって誠実な結果である。

## 計測によって変更されたこと

リリースされた決定のうち4つは、設計上の議論ではなく実行の結果によるものである。中間値が証拠であり、diffからは再構築できないため、それぞれを記録する。

### 1. `<%= form_with … do |f| %>` — redmineにおける431件のパースエラー

最初の実行ではredmineに**431件の新規診断**が発生した。そのすべてが`.erb`パス上のパースエラーであり、ペア（`unexpected ')'` + `expected a block beginning with do to end with end`）で生じていた。原因は、実際のRailsビューで最も一般的な単一の形状である「Rubyがブロックを開く*出力*タグ」であった。両方のコンパイラとも`_buf << (form_with(…) do |f|).to_s`を出力するが、これはRubyとして正しくない。

Railsでは自身のERBハンドラがルール（`ActionView::Template::Handlers::ERB::BLOCK_EXPR`）を持ち、式をラップせずに出力するためこの問題に遭遇しない。プラグインは現在、コンパイラの出力を書き換えるのではなく、*テンプレート*の等幅書き換え（`<%=` → `<% `）として同じルールを1ステップ手前で適用するため、どちらのコンパイラが解決されたとしても成立する。修正後の残余: 506件中87件。

### 2. トリムマーカー — さらに87件

その87件はすべて`-%>` / `<%-`であった。`trim_mode: nil`の下では、標準ライブラリのERBは出力されるRuby内に`-`を残し、単項マイナスとしてパースされてしまう。`trim_mode: "-"`を渡すとパースは修正されるがラインマップがコンパイラのトリムルールに委ねられてしまうため、同じ事前パスでマーカーを空白化（`<%-` → `<% `、`-%>` → ` %>`）し、同様に等幅・同一行を維持した。残余: redmineで**506件中4件**、mastodonで**46件中2件**。

### 3. 残りの数件と、コンパイルできないテンプレートが静かに却下される理由

6件すべてがレイアウトであり、6件すべてが`<%= yield %>`であった — Railsがレンダリングする正当なERBであるが、メソッド本体の外では正当なRubyではない。

（標準ライブラリの`ERB`の下では、redmineには5番目のファイル`app/views/issues/new.js.erb`が存在する。その`case`タグは最初の`when`タグと改行のみで隔てられている。Erubiはこれを飲み込むが標準ライブラリのERBはバッファへの追記として出力するため、`case`が不正になる。Erubiはこれをコンパイルし標準ライブラリのERBはコンパイルしない。これは552個のテンプレート全体で2つのコンパイラが見せた唯一の動作差であった — § 5を参照。）

それらを報告すると、正しいテンプレートに対して1ファイルあたり2件のパース診断が発生してしまう。そのためプラグインはコンパイルされたRuby自身をパースし、パースできない本体は継ぎ目自身の`[]`の出口を通じて**ファイルを却下する** — ユニットも診断もエフェクトも生成しない。これは本機能自体の障害モードに適用されたFP優先の順序付けであり、親プロセス上でテンプレートごとにPrismのパース1回分のコストがかかる。

したがって、現在レイアウトは何の貢献もせず、両方のコーパスで却下されたファイルがすべてレイアウトである理由もそこにある。これは誤差ではなく実質的なギャップである。レイアウトは`content_for`や`yield`が存在する場所であり、まさに`template → layout`エッジが必要とするユニットそのものである。[#1047](https://github.com/rigortype/rigor/issues/1047)として起票。

### 4. `flow.*`がデフォルトの抑制セットに`call.*`と共に加わる

パースエラーが解消された後も、redmineは標準的なオプショナルlocalプリアンブルにおいて、`app/views/common/_other.html.erb`内で**3件**の`flow.always-truthy-condition`警告を依然として報告していた:

```erb
<% path = nil unless defined? path %>
…
<% if path.present? %>
```

コンパイルされたRubyは実際にそこで`nil`を代入するため、フローのルールはRailsが正しくレンダリングするパーシャルにおいて、3つの生きている分岐を常に偽として畳み込んでしまう。ルールは渡されたコードに対しては正しいがテンプレートに対しては誤っており、その理由はまさにこのスライスが合成しない束縛、すなわちrender箇所の`locals:`にある。それらが追跡されるまで、テンプレートユニット内部では`call.`と並んで`flow.`が抑制され、`view_type_checks: true`によって両方が一緒に再度有効化される。

それが表の数値のすべてである。`call.`のみを抑制した状態ではredmineの新規行数は5件であったが、`flow.`も抑制すると2件となり、その2件はいずれもinfoトレースである。

### 5. 両方のコンパイラが実行され、そのプロローグが異なる — オフセットが計測される理由

これは設計されたものではなく発見されたものである。redmineの`.bundle/config`は`BUNDLE_PATH: vendor/bundle`を設定しており、そのツリーには`erubi-1.13.1`が含まれているため、`Isolation.require_with_target_bundle`がbundleのrequireパスを追加してErubiがロードされる。mastodonにはインストールされたbundleがなく、標準ライブラリの`ERB`が使われる。プローブの計測値:

| コンパイラ | プロローグオフセット | 4行テンプレートのマップ |
| --- | ---: | --- |
| erubi 1.13.1 | 0 | `{1=>1, 2=>2, 3=>3, 4=>4}` |
| erb 6.0.1.1 | 1 | `{2=>1, 3=>2, 4=>3, 5=>4}` |

ハードコードされたオフセットは、2つのうち一方に対してのみ正しくなり、もう一方のすべてのテンプレートのすべての指摘箇所で暗黙のうちに1行ずれてしまうことになる。両方のマップは、行をリフローするコンパイラを露呈させる形状である複数行タグのケース（`<%= b(\n 1) %>`）に対しても正確である。

### 既知の2つの過小読み取り（修正ではなく記録されたもの）

どちらも偽陽性を引き起こすことはなく（いずれもivarがシードされないままとなり、`Dynamic`として読み取られ沈黙する）、どちらもすべてのパスのルールが保守的である必要のない場所で保守的になっている例である:

- `return unless @u = User.find(1)`のようなガード、および早期`return`の後の代入は、フォールスルーにおいてすべてのパスとして扱われる。これはフォールスルーにとっては正しく、ルールが見た目よりも*寛容*である唯一のケースである。コントローラーアクションでは稀である。
- `respond_to do |format| … end`の内部で行われた代入は破棄される。ブロックが実行されない可能性があるためである。Railsでは常に実行されるため、フォーマットをディスパッチするアクションで実際のシードが失われる。

## 意図的に計測しなかったもの

- **Haml / Slim**。mastodonのユーザー向けビューはHamlである。`template_globs:`は`*.erb`のみを対象とするため、ここでは見えない。設計ノート（§ 11.3）では、それらは異なるコンパイラの背後にある同一の継ぎ目として扱われている。
- **診断に関するプール実行とシーケンシャル実行の比較**。エフェクトテーブルは、両プロジェクトにおいて`RIGOR_RACTOR_WORKERS=2`とシーケンシャル実行の間で完全に同一である（redmine: 同一の502個の`view:`行、`io.db.*`を持つ35行）。診断ストリームは1行だけ異なり、その行はrigor-activerecordのスキーマ欠落通知である — その1実行あたり1回のフラグはプラグインインスタンスごと、したがってワーカーごとである。その重複は`master`にも存在する（viewsを退避させた状態で434対433）。テンプレートユニットが追加する差異は、チャンクがビューから始まるワーカーがそのコピーを`.erb`パスに配置することである。[#1051](https://github.com/rigortype/rigor/issues/1051)として起票。
- **`views: lenient`対`views: strict`**。この2つのスタンザは[`docs/manual/plugins/rigor-actionpack.md`](../../manual/plugins/rigor-actionpack/)に記載されており、その背後にある仕組みは機能している — ビューユニットは現在`effects.envelopes:`の対象であり、指摘箇所はテンプレート内に位置付けられる。しかし、プラグインの帰属から到着する`io.db.read`が**declared**レーンに乗る一方で`Effects::EnvelopeCheck`がprovenレーンを読み取るため、2つのプリセットの動作にはまだ*差異*が生じない。これはRailsエフェクトレイヤー全体の性質であり（通常の`User.find`に対しても`UsersController#index`は`[mutate.self] ≤ [io.db.read]`を報告する）、テンプレートの性質ではないため、ここで回避策を講じるのではなく[#1048](https://github.com/rigortype/rigor/issues/1048)として個別に起票された。
