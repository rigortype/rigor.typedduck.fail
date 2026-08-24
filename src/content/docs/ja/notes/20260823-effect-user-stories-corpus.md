---
title: "エフェクトラベル —— コーパスに対して裁定した10のユーザーストーリー（2026-08-23）"
description: "rigortype/rigor docs/notes/20260823-effect-user-stories-corpus.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260823-effect-user-stories-corpus.md"
sourcePath: "docs/notes/20260823-effect-user-stories-corpus.md"
sourceSha: "40af265ad17edfaf553929f9273edcbed90fc785931d127dbed94e16157b2d6d"
sourceCommit: "bed65a462b04db02312f208b9dda2dda3a26ef13"
translationStatus: "translated"
sidebar:
  order: 20266823
---

ステータス: **調査ノート、設計上のコミットメントはなし**。1つの問い——*ADR-103のエフェクトシステムは今日、実アプリケーションの上で、実際にどの問いに答えられるのか？*——に、Ruby/Railsチームがそこへ持ち込むであろうストーリーを書き出し、各ストーリーを2つの調査チェックアウトに対して走らせることで答える。ストーリーが失敗する場所では、このノートは症状ではなく機構を名指す。

[`20260822-effect-user-story-redmine.md`](../20260822-effect-user-story-redmine/)——最初の採用者が出会う*サーフェス*を歩いたもの——の姉妹編。このノートはサーフェスを前提とし、*価値*について問う。

## ハーネス

| | |
| --- | --- |
| Rigor | master `d4044170`（`0.3.4`）、Flakeを通じてリポジトリから実行 |
| ターゲット | `rigor-survey/redmine` @ `a12198ea0`、`rigor-survey/mastodon` @ `163f96cee`（v4.6.3） |
| 設定 | 各プロジェクト自身の`.rigor.dist.yml`に加えて、`rigor-railties`、`effects: {snapshot: {reach: [rails]}}`、そしてスクラッチのキャッシュ+スナップショットパス。ベースラインはオフ。 |
| クリーンアップ | すべてのスクラッチの設定・キャッシュ・スナップショットはチェックアウトの外に住むか削除される;両方のワーキングツリーはセッション前の状態とバイト同一 |

コスト、CIストーリー向け（`/usr/bin/time -p`、12コアDarwin）:

| | redmine | mastodon |
| --- | --- | --- |
| `rigor effects`（コールド） | 12.64秒、31,782行 | 24.02秒、37,057行 |
| `rigor effects update`（ウォーム） | 0.97秒 | 1.34秒 |
| `rigor effects check`（ウォーム） | 1.93秒 | 2.54秒 |

2つのアーティファクトの形:

| | redmine | mastodon |
| --- | --- | --- |
| レポート行 | 4,234 | 7,468 |
| ` …?`でヘッジされた行 | 3,954（93.4%） | 6,816（91.3%） |
| 何も言わない行（`[] …?`） | 1,480（35.0%） | 2,837（38.0%） |
| スナップショット`methods:` | 1,879、**41.2%が網羅的** | 3,227、**44.8%が網羅的** |
| スナップショット`reach:` | 491、**2.4%が網羅的** | 1,107、**8.7%が網羅的** |

> **計測の罠。1ラウンドを費やしたので記録する**。スナップショットのワイヤ形式は`exhaustive:`が*true*のときそれを省略する（`snapshot.rb:63`）ので、`v['exhaustive']`とする読み手はすべての網羅的な行で`nil`を得て**0%**と報告する。`v.fetch('exhaustive', true)`を使うこと。このノートの見出し数字の最初の版はそのアーティファクトだった。

## カタログ

| # | ストーリー | 判定 |
| --- | --- | --- |
| US-1 | *レビュアーとして、このPRがエントリーポイントのエフェクトフットプリントを増やしたかを見たい。* | ✅ **機能する。しかもこの機能の最良のサーフェスだ** |
| US-2 | *メンテナーとして、`Time.now` / `rand`をあるレイヤーから締め出し、そのテストを決定的に保ちたい。* | ✅ 機能する |
| US-3 | *監査者として、`ENV`を読むか、プロセスを終了させうるすべてのリクエストパスが欲しい。* | ✅ 機能する |
| US-4 | *CIとして、フットプリントがドリフトしたら失敗するゲートが欲しい。* | ✅ 機能する、ウォームで約2秒 |
| US-5 | *アーキテクトとして、「このレイヤーはデータベースに触れない」を強制したい。* | ⚠️ **スナップショットゲートは捕捉する;診断には決してできない** |
| US-6 | *オンコールエンジニアとして、どのコードがネットワークと話すかを知りたい。* | ⚠️ 誤った理由による正しい答え（redmine）;不在（mastodon）;設定1行でレポートは回復する |
| US-7 | *採用者として、証明可能に純粋な自分のメソッドが欲しい。アノテーションを付けられるように。* | ⚠️ 449個が存在し、既定で省略される |
| US-8 | *SREとして、読み取り専用レプリカへルーティングできるアクションが欲しい。* | ❌ **経験的に誤り: 27の`#update`アクションのうちDB書き込みを記録するものは0** |
| US-9 | *レビュアーとして、ジョブのエンキュー・メール送信・キャッシュ書き込みを追いたい。* | ❌ `job.*` / `email.*`は11,702行全体で**プロデューサーがゼロ** |
| US-10 | *新しい採用者として、自分のアプリが何をするかの最初の一望が欲しい。* | ❌ 31k〜37kのページングなしの行（[#434](https://github.com/rigortype/rigor/issues/434)） |

4つは機能し、3つは部分的に機能し、3つは機能しない。

---

## ✅ US-1——「このPRはエントリーポイントのフットプリントを増やしたか？」

ありそうなPRの代役となる1行の編集を、`Issue.load_visible_relations`に:

```ruby
Net::HTTP.get(URI("#{Setting.host_name}/api/relation-metrics")) if Setting.rest_api_enabled?
```

`rigor effects check`——10行、終了コード1:

```
methods:
  Issue.load_visible_relations  +symbol [io.net.http] …?

reach:
  IssuesController#index  + io.net.http
```

そして`rigor effects explain`は、どのシンボルかを尋ねられることなく経路を名指す:

```
reach:
  IssuesController#index → Issue.load_visible_relations → Net::HTTP.get [io.net.http]
```

これが約束の全体であり、それが果たされている: このファイルを見たことのないレビュアーが、イシュー一覧がいまやHTTPリクエストを行うことを知る。`explain`は一様に良い——触れていないコードに出力するチェーンも読みやすい（`IssuesController#index → QueriesHelper#query_to_csv → … → Redmine::Themes.scan_themes
→ Dir.glob [io.fs.read]`）。

1つの瑕疵: メソッド自身の行は「`io.net.http`を得た」ではなく`+symbol`と読める。編集前にこのメソッドはスナップショット行を持たなかったからだ——エフェクトがなかったので、[#411](https://github.com/rigortype/rigor/issues/411)が省略していた。ニュースを運ぶのは*reach*の行であり、それが重要な行だ。

## ✅ US-2——レイヤーの境界としての決定性

レイヤーに被せる`effects.envelopes:`、`effect: []`が、機能するサーフェスだ。redmineの`app/helpers/**/*.rb`では: **25ファイルに343の発見**（第03章の数字と一致）。mastodonの`app/serializers/**/*.rb`では: **4ファイルに56**。それらが名指すもの:

| ラベル | redmineヘルパー | mastodonシリアライザ |
| --- | --- | --- |
| `mutate.self` | 91 | 45 |
| `mutate.static` | 86 | 1 |
| `io.fs.read` | 83 | — |
| `mutate.instance` | 38 | — |
| `global.read` | 16 | 7 |
| `io.output.stderr` / `exit` | 13 / 13 | — |
| `nondet.time` | 3 | 3 |
| **`io.db.*`** | **0** | **0** |

これらはどれも本物であり、すべてのメッセージがそのチェーンを運ぶ。決定的レイヤーのストーリーにはそれで十分だ: `nondet.time`・`nondet.random`・`global.read`・`io.fs.*`はすべて証明済みラベルなので、それらに被せた境界は発火する。

## ✅ US-3——監査ストーリー

証明済みラベル、レポート全体の件数:

```
redmine   mutate.self 1648  mutate.local 660  mutate.static 642  io.fs.read 501  mutate.instance 350
          global.read 339   io.output.stderr 248  exit 248  io.net 215  io.fs.write 138
          nondet.time 100   io.process 94   io 84   nondet.random 62
mastodon  mutate.self 2659  global.read 669  mutate.static 616  nondet.time 569  nondet.random 401
          mutate.local 263  io.fs 118  io.fs.write 108  mutate.instance 50  global.write 47
          io 37  io.net 36  io.fs.read 18
```

抜き取り検査して真: redmineの248の`exit`行は、すべて遅延された設定ロードから降りてくる——

```
ApplicationController#user_setup → … → Redmine::Configuration.[] → Redmine::Configuration.load → Kernel#abort [exit]
```

——つまり*Redmineのすべてのリクエストパスは、不正な形式の`configuration.yml`でプロセスをabortしうる*。これはツールから学べて心底有用な類のことであり、目視でこれを見つけられたレビュアーはいないだろう。

## ✅ US-4——CIゲート

ウォームの`rigor effects check`は1.93秒（redmine）/ 2.54秒（mastodon）で、ドリフトがあれば1で終了する。ゲートについて疑問な点は何もない;この機能で最も安価なサーフェスだ。

---

## ⚠️ US-5——「このレイヤーはデータベースに触れてはならない」

旗艦のRailsポリシー。診断にはなりえず、ゲートにはなりうる。

**なぜ診断にならないか**。`io.db.read`と`io.db.write`は、2つのRailsアプリケーションの11,702のレポート行全体で、**証明レーンにただの一度も現れない**:

| | redmine | mastodon |
| --- | --- | --- |
| `io.db.read`の証明済み / 宣言済み | 0 / 709 | 0 / 1,975 |
| `io.db.write`の証明済み / 宣言済み | 0 / 644 | 0 / 1,283 |

これらはプラグインファクトであり、`plugin_facts.rb`はすべてのプラグイン行を`add_declared`に通す（`unit_scan.rb:296`）。`EnvelopeCheck`は証明レーンだけを読み、それは意図的で、荷重を支えるものとして文書化されている（`envelope_check.rb:14-20`）。したがって2つの規則は合成されてこうなる: *どのエンベロープも、どの`%a{pure}`も、どの`effect.envelope-exceeded`も、データベースアクセスに対して決して発火しえない。*

それが読み手の椅子からどう見えるかをコーパスが示す。`REST::V1::InstanceSerializer#invites_enabled`は`effect: []`エンベロープの下に座り、こう報告する:

```
warning: Method REST::V1::InstanceSerializer#invites_enabled performs mutate.self
  (receiver-mutation via UserRole.everyone → UserRole.create! → UserRole#set_position),
  but is declared effect: [] at .rigor.yml effects.envelopes[0], so mutate.self exceeds the envelope.
```

メッセージが出力するチェーンは**`UserRole.create!`**を通る。Rigorは書き込みを見て、そこを歩いて通り、その先のivar代入を報告した。シリアライザ自身のレポート行は`≤ [io.db.read, io.db.write]`と読める。つまりファクトはファイルの中にある——判定者が読むことを禁じられたレーンに。

**それでもゲートである理由**。スナップショットは宣言レーンを記録し、差分を取る。同じ呼び出しパスに`Journal.create!(:notes => "audit")`を追加すると、こうなる:

```
reach:
  IssuesController#index  + io.net
  IssuesController#index  ≤+ io.db.write
```

`≤+`は第一級のドリフトマーカーだ。したがって「このレイヤーに新しいデータベース書き込みなし」は、今日*確かに*強制可能だ——`effects.envelopes:`を通じてではなく、`rigor effects check`を通じて。マニュアルのどこにもそう書かれていない;第19章は宣言された境界をRigorが判定する場所として、スナップショットをRigorが観測する場所として提示しており、それはRailsチームが最も気にかけるラベルにとってちょうど逆さまだ。

## ⚠️ US-6——「どのコードがネットワークと話すか？」

**Redmineは答える。ただし誤った理由で**。215行が証明済みの`io.net`を運び、そこにはすべての`Mailer#*`、すべてのモデルの`save`/`create!`、そして`Redmine::IMAP.check`が含まれる。`WebhookEndpointValidator`の外で標本抽出したすべての行での起点:

```
Redmine::IMAP.check → MailHandler.safe_receive → … → Mailer#mail → Mailer.message_id_for
  → Mailer.token_for → Socket.gethostname [io.net]
```

`Socket.gethostname`——Message-IDの構築だ。そのメソッドが開くIMAP接続は見えない;SMTP配送も見えない。`Mailer.deliver_lost_password`は`[io.net, mutate.instance, mutate.local,
mutate.self] ≤ [global.read, rails.i18n.translate]`と読める——`email.send`なし、`io.net.smtp`なし、配送について`rigor-actionmailer`からは何ひとつなし。ラベルを信頼するレビュアーは運によって正しい結論に達し、アプリケーションの5%がホスト名ルックアップによって「ネットワーク」に色付けされている。

**Mastodonは答えない**。目的の全体が連合HTTPであるアプリケーションが、7,468行のうち36行で`io.net`を、1行で`io.net.http`を証明する。そのHTTPのチョークポイントはこう読める:

```
Request#perform: [mutate.self] …?
```

リクエストが`http.rb` gemを通じて発行されるからで、このgemにはシグネチャもプラグインもない——なので呼び出しは汚染し、何も証明しない。

**ユーザーが今日できること。そしてそれは機能する**。設定1行:

```yaml
effects:
  attribution:
    "Request#perform": [io.net.http]
```

で、mastodonは`io.net.http`を運ぶ行が1から**250**になり、そこには`AccountAlias#invalid?`が含まれる——これはバリデーション中に本当にリモートのActivityPubフェッチを行う:

```
AccountAlias#invalid? → AccountAlias#set_uri → ResolveAccountService#call → ResolveAccountService#fetch_account!
  → ActivityPub::FetchRemoteAccountService#call → … → ActivityPub::ProcessAccountService#call → Time.now [nondet.time]
```

これは機能全体の対価に値する発見であり——*モデルのバリデーションがネットワークフェッチを行う*——設定1行から到来する。しかしそれは宣言レーンに着地する（US-5の規則）ので、レビューに情報を与えられ、スナップショットをゲートでき、そして決して境界にはなれない。

## ⚠️ US-7——「自分のメソッドのうちどれが証明可能に純粋か？」

redmineでの`rigor effects --full`: 32,231行、そのうち**449行が網羅的で、`mutate.local`を超えるものが何もなく、宣言レーンもない**——`AnonymousUser#destroy`、`AnonymousUser#admin`、`ActiveRecord::Acts::Tree::InstanceMethods#root`、…… これらはまさに、`%a{pure}`をアノテーションする価値、メモ化する価値、ビューから呼ぶ価値のあるメソッドだ。既定のレポートは構成上それらを省略し、スナップショットも省略し、それらを求めるフラグは存在しない。

一般的な形はこうだ: **レポートにはクエリサーフェスがない**。`--label io.net`もなく、`--only-exhaustive`もなく、`--pure`もなく、アルファベット順以外の順序もない。このノートのすべての問いは、アーティファクトに対する`grep`とRubyスクリプトで答えられた。[#434](https://github.com/rigortype/rigor/issues/434)はレポートを*より小さく*することを提案している;それに何かを*尋ねられる*ことは別の機能だ。

---

## ❌ US-8——「どのアクションが読み取り専用レプリカへ行けるか？」

否定のクエリ。これは失敗する。しかも最悪の形で失敗する: 答えは自信ありげに見えて、誤っている。

| | redmine | mastodon |
| --- | --- | --- |
| `io.db.write`を運ぶ`reach:`エントリー | 27 / 491 | 114 / 1,107 |
| それを運ぶ`#create`アクション | 9 / 30 | 35 / 86 |
| それを運ぶ`#update`アクション | **0 / 27** | 8 / 41 |
| それを運ぶ`#destroy`アクション | 1 / 32 | 9 / 59 |

Redmineには27の`#update`アクションがあり、そのうちの1つとしてデータベース書き込みを記録しない。

**1つのコントローラー内でのA/B**。`GroupsController`——同じクラス、同じ`@group.save`呼び出し:

```ruby
def create
  @group = Group.new                    # ← assigned here
  @group.safe_attributes = params[:group]
  … if @group.save                      # → reach records ["io.db.read", "io.db.write"]

def update
  @group.safe_attributes = params[:group]   # @group comes from `before_action :find_group`
  … if @group.save                          # → reach records []
```

> **訂正、2026-08-24——このノートは最初、このペアを「`before_action`が代入するivarは型が付かない」と読んでいたが、それは誤りだった**。`find_group`は上位クラスではなく`GroupsController`自身にあるので、ここにクロスクラスのフローは何もない。2つの別々の機構が1つとして読まれていた:
>
> 1. **どのクラスにも射影されないユニオンレシーバー**（[#455](https://github.com/rigortype/rigor/issues/455)、2026-08-24修正）。[ADR-58](../../adr/58-ivar-field-typing/)は`initialize`が書き込まないすべてのivarに宣言由来の`nil`を寄与するので、*メソッドをまたぐivar読み取りはすべて`T | nil`*だ——そしてエフェクトコレクターのレシーバー射影にはユニオンのアームがなかった。この呼び出しはラベルもエッジも寄与せず、**それでいて行は網羅的と読めたままだった**。同じ穴はすべての`find_by` + `&.`サイトも飲み込んでおり、それがivarの枠組みより価値があった理由だ: Mastodonの`ActivityPub::Activity::Remove#remove_featured_tags`内の`featured_tag&.destroy!`は、そのivarなしの実例だ。
> 2. **`Group.visible.find(params[:id])`は`Dynamic`と型付けされる**——何もモデル化しないActiveRecordスコープチェーンだ——ので、`GroupsController#update`は素の`dynamic-receiver`であり、レポートはそれを*確かに*開示する。これは普通の推論ギャップであって沈黙のギャップではなく、ユニオンの修正はそれに触れない。2つのアクションを分けたのは、ivarがどこで代入されたかでは決してなく、それがどう*生成された*かだった: `Group.new`は型が付き、スコープチェーンは付かない。
>
> #455の修正後、表の事後の数字はこうなる: redmineの`io.db.write`のreachエントリーは**27 → 35**、`#update`は**0 / 27 → 3 / 27**;mastodonは**114 → 169**、`#update`は**8 / 41 → 21 / 43**、`#destroy`は**9 / 59 → 23 / 64**。`rigor check`の診断ストリームは両方でバイト同一だ。このストーリーの判定は変わらない——否定の読みは依然として認可されない——が、その大きさは変わる。

`IssuesController#update`は第2の機構を反対側から示す: そのreachは`save_issue_with_child_records`を通じて`mutate.self`・`mutate.local`・`mutate.static`・`global.read`を説明し、（#455以前は）`@issue.save`については何ひとつ説明しない。

**つまりエフェクトシステムのRailsでの価値はレシーバー型付けに上限づけられている**——上のユニオン射影と、その先の`Dynamic`と型付けされるActiveRecordスコープチェーンだ。このノートのUS-5とUS-8のすべての数字は、それらが動けば動く。

それに輪をかけるのが: `reach:`行が網羅的なのはエントリーポイントの**2.4%**（redmine）/ **8.7%**（mastodon）なので、否定の読みは91〜98%の場合に認可されない——そしてレポートがそう述べるのは、10行中9行に付いている末尾の` …?`を通じてだけだ。それはシグナルではなく、壁紙だ。

## ❌ US-9——ジョブ、メール、キャッシュ

アプリケーション意味のラベル——まさに、ポリシーが人の気にかけるものを名指せるようにと存在する語彙の層——には、どちらのアプリケーションでもプロデューサーがない:

| ラベル | redmine | mastodon |
| --- | --- | --- |
| `job.enqueue` | 0 | 0 |
| `email.send` | 0 | 0 |
| `cache.read` / `cache.write` | 0 / 0 | 宣言のみ、108 / 518 |
| `telemetry` | 宣言のみ、65 | 宣言のみ、265 |

Mastodonは`rigor-sidekiq`をロードしたSidekiqの上で走り、`perform_async` / `perform_later`形の呼び出しサイトを219持つ;redmineは`rigor-actionmailer`をロードして`deliver_*`呼び出しサイトを97持つ。どちらのプラグインも、自身のドメインが所有するラベルを帰属させない。`docs/manual/19-effect-labels.md`は5つの意味ラベルすべてを語彙テーブルに印字しており、何もそれらを生成しないという表示はない。

## ❌ US-10——最初の一望

2026-08-22のウォークスルーから変わっておらず、すでに[#434](https://github.com/rigortype/rigor/issues/434)として起票済み: 31,782 / 37,057のページングなしの行、行の35〜38%が内容なし。

---

## ストーリーより長生きする3つの発見

1. **証明レーンはプロセスについてであり、宣言レーンはアプリケーションについてだ——そして判定できるのは証明レーンだけだ**。`mutate.*`・`io.fs.*`・`nondet.*`・`global.*`・`exit`は証明済みで強制可能。`io.db.*`・`cache.*`・`telemetry`・すべての`rails.*`・ユーザーが書くすべての`attribution:`は宣言済みで強制不能。この分割はADR-103の弁別基準——未検証の主張は発見を製造してはならない——に照らして正しいが、その帰結は一度も述べられたことがない: **Railsアプリケーションでは、チームがポリシーを書きたくなるすべてのエフェクトが、判定不能なレーンにある**。スナップショットの`≤+`マーカーが脱出ハッチであり、そのようなものとして文書化されていない。
2. **Railsのエフェクト可視性はレシーバー型付けに等しい**。`GroupsController#create` / `#update`のA/Bは、アプリケーションコード9行の中の物語の全体だ——ただしUS-8の下の訂正を見ること: 機構は1つではなく2つある。第1の、どのクラスにも射影しないユニオンレシーバーはエフェクトのバグであり、[#455](https://github.com/rigortype/rigor/issues/455)として2026-08-24に修正された（書き込みを記録するエントリーポイントが+8 / +55）。第2の、`Dynamic`と型付けされるActiveRecordスコープチェーンは推論ギャップであり、依然として最高価値のレバーだ——そしてそれはエフェクトの問題ではない。
3. **否定の読みは決して認可されず、読む地点でそう言うものが何もない**。`reach:`で網羅的なのは2.4% / 8.7%。93%の密度では` …?`のヘッジはその重みを担えない;読み手には、行の前に*要約*（「エントリーポイントの2.4%が網羅的——ここでは不在は何も意味しない」）が要る。

## 起票済み

- [#454](https://github.com/rigortype/rigor/issues/454)——Railsポリシーが名指すであろうすべてのラベルが、どの診断も読めないレーンに住む（設計判断）
- [#455](https://github.com/rigortype/rigor/issues/455)——ユニオン型のレシーバーがどのクラスにも射影されず、メソッドをまたぐすべてのivar読み取りとすべての`find_by` + `&.`が、網羅的と読めたまま何も寄与しなかった（**2026-08-24修正**;誤りと判明した機構の下で起票された——US-8の下の訂正を見よ）
- [#456](https://github.com/rigortype/rigor/issues/456)——`job.*`と`email.*`にはプロデューサーがゼロ;Railsプラグインはどちらも帰属させない
- [#457](https://github.com/rigortype/rigor/issues/457)——`rigor effects`にはクエリサーフェスがない;純粋集合（redmineで449メソッド）は、誰も求めることのできない唯一の答えだ
- [#458](https://github.com/rigortype/rigor/issues/458)——`Socket.gethostname`が`io.net`を証明し、Redmineの行の5%をネットワークに色付けする

US-10は[#434](https://github.com/rigortype/rigor/issues/434)で、すでにオープン済み。
