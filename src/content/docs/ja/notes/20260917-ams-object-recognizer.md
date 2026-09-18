---
title: "AMSの`object`認識機構 — Mastodonでの計測"
description: "rigortype/rigor docs/notes/20260917-ams-object-recognizer.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260917-ams-object-recognizer.md"
sourcePath: "docs/notes/20260917-ams-object-recognizer.md"
sourceSha: "b1ca756b777f589bf3d73a687b2bc59b09d1e8bb248b24c983a56c8c3183c513"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
translationStatus: "translated"
sidebar:
  order: 20266917
---

**日付:** 2026-09-17
**Issue:** [#534](https://github.com/rigortype/rigor/issues/534)項目6
**プラグイン:** `plugins/rigor-active-model-serializers/`

2026-09-01のコーパス不透明度スイープでは、`object`がMastodonにおいて未解決な暗黙的self送信の中で最大のものであると特定され、ActiveModelSerializersを所有するプラグインが存在しないことが記録された。これは、認識機構をリリースした際の変更前後の記録であり、さらに有益なこととして、診断の差分がゼロであるコーパスdiffでは**見落とされてしまうもの**（結果的に導出ルールの基礎となったもの）の記録でもある。

## 方法

計測状態を損なわないよう、サーベイ用チェックアウトのプライベートコピーを作成した（`rsync -a --exclude .rigor`）。プロジェクトの`.rigor.dist.yml`から派生させ、すべての診断が出力されるよう`baseline:`を削除した、`plugins:`のエントリー以外は同一の2つの設定を用意した。ウォーム実行では変更前の応答が返されてまさにこの種のdiffを沈黙のうちに隠蔽してしまう前例があったため、両方とも`--no-cache`で実行した。

## コーパスdiffでは見えないもの、そして名前だけでは不十分な理由

このプラグインの最初のバージョンは、その名前のモデルが存在するかどうかのみをチェックし、`<Model>Serializer`という命名規約のみから`object`を導出していた。これはMastodon上でバイト単位で完全に一致する診断セットを生成したが、**3つのシリアライザにおいて誤りであった**:

| シリアライザ | 導出されたもの | 実際のリソース |
| --- | --- | --- |
| `REST::ConversationSerializer` | `Conversation` | `AccountConversation` |
| `REST::InstanceSerializer` | `Instance` | `InstancePresenter` |
| `REST::V1::InstanceSerializer` | `Instance` | `InstancePresenter` |

Active Recordモデルのメソッド表面はオープンであるため、diffには何も変化が現れなかった。誤っているが実在するモデルがすべての読み取りを暗黙のうちに吸収してしまうためである。**コーパスの診断diffは、提供された型が正しいことの証拠ではない** — 型チェッカーの警告が増加しなかった証拠にすぎない。成果物のすべてが型であるプラグインにとって、チェックは回答を提供する前に肯定的な形で行われなければならない。

そのため、ルールには第2の独立したシグナルが追加された。モデルはシリアライザに**応答しなければならない（ANSWER）**。シリアライザが自身のリソースから読み取るすべての名前 — 自身で定義していない`attributes` / `attribute` / `has_many` / `has_one` / `belongs_to`の宣言、および本文内のすべての`object.<name>` — が、候補モデルのカラム、カラムごとの述語、アソシエーション、enum、エイリアス、スコープであるか、あるいはプロジェクトがそのモデルまたは祖先に定義しているメソッドでなければならない。1つでも応答しない名前があれば、シリアライザ全体が却下される。

上記の3行はすべて`Dynamic[top]`に解決されるようになり、それぞれに再オープンした`Rigor.dump_type(object)`プローブによって検証された。同じ実行で対照群（`REST::ScheduledStatusSerializer`）は依然として`ScheduledStatus`を導出している。

## 数値

| | プラグインoff | プラグインon |
| --- | --- | --- |
| 診断数 | 2358 | 2358 |
| 精密な式、`app/serializers` | 4893 / 9575（51.1%） | 5093 / 9575（53.2%） |

ソート済みの`path:line:column:rule:message`セットはバイト単位で一致している。到達度: **173個のシリアライザが発見され、52個が一意なモデル名に解決され、34個が導出された**。

このバイト単位で一致したセットは、バンドルされたシグネチャが行っている1つの危険な処理に対する答えでもある。`ActiveModel::Serializer`は空の本体で宣言されており、Mastodonのシリアライザのうち93個がそこから直接継承している。また、`ActiveModelSerializers::Model`は8個のモデルによってサブクラス化されている。マニフェストの`open_receivers:`行が意図しているとおり、シグネチャが省略したすべてのメンバーは寛容なまま維持された。

## 18件の却下と、そのうち15件がモデルインデックスのギャップである理由

名前を解決した52個のシリアライザのうち、18個は表面チェックによって却下された。3個は上記の本物の見落としである。残りの15個は正しいモデルを指定しているが、その表面を`:model_index`ファクトが完全には認識できていない:

| シリアライザ | 応答しなかった名前 | モデルが実際にはそれに応答する理由 |
| --- | --- | --- |
| `REST::AccountSerializer` | `followers_count`、`following_count`、`statuses_count`、`user`、`moved_to_account`、`avatar`、`header`、…… | `Account::Counters`内の`delegate … to: :account_stat`、コンサーンの`included do`内で宣言されたアソシエーション、Paperclipのアタッチメントマクロ |
| `REST::StatusSerializer` | `limited_visibility?` | コンサーンで宣言されたメソッド |
| `REST::MediaAttachmentSerializer` | `file`、`thumbnail` | アタッチメントマクロ |
| `REST::PreviewCardSerializer` | `image`、`image?`、`original_url` | アタッチメントマクロ + コンサーン |

原因は、1つのものが3つの姿をとっていることにある。`delegate`、コンサーンで宣言されたアソシエーション、およびアタッチメントマクロは、いずれも`rigor-activerecord`のディスカバラーが畳み込んでいないモデル表面である。#534の項目5ではコンサーンで宣言されたスコープについて同様の畳み込みが導入されたが、これら3つをカバーするものはなかったため、シリアライザごとの完全な一覧と後述の到達度プローブを再実行する受け入れゲートを添えて、フォローアップとして[#1049](https://github.com/rigortype/rigor/issues/1049)が起票された。この畳み込みはその後マージされた — 15件中7件を回収した再計測については、本ノート末尾の日付付きセクションを参照のこと。これは本プラグインではなく`rigor-activerecord`プラグインに属する。`:model_index`の他のコンシューマーは見えない名前に対してfail-openであり、そのため単に静かになるだけだが、このプラグインはfail-closedであるため、ギャップが可視化された原因となった。

却下は安全な方向であり — 呼び出し箇所は既存の回答を維持する — チェックを緩めるのではなく、現状のままリリースされた。比例配分や最適候補によるルールも検討されたが却下された。モデルのデコレーターはモデルの表面の大部分を共有するため、「ほとんどの名前が応答した」はまさに`InstancePresenter`のケースが持つ形状そのものであるためである。

## 祖先クロージャには`app/lib`が必要

デフォルトの`serializer_search_paths`は`["app/serializers", "app/lib"]`であり、2番目のエントリーは装飾ではなく耐荷重である。Mastodonのシリアライザのうち60個の親である`ActivityPub::Serializer`は、`app/lib/activitypub/serializer.rb`に存在する。計測されたインデックスサイズ:

| 探索パス | 発見されたシリアライザ |
| --- | --- |
| `["app/serializers"]` | 108 |
| `["app/serializers", "app/lib"]` | 173 |

そのクロージャのメンバーシップが唯一のシリアライザゲートである。以前のバージョンでは、名前が`Serializer`で終わるすべてのクラスも許可していたが、シリアライザの祖先を持たず独自の`object`メソッドを持つ`Json::ConversationSerializer`内の`object`に型付けしてしまい、真陽性を消去してしまった。`object`は一般的なメソッド名であり、接尾辞は証拠にはならない。

## チェックが読み取らないリーダーの記述形式

リソースを読み取る方法のいくつかは証拠として収集されないため、モデルが正しい場合であっても、それを使用するシリアライザは却下される: `object[:key]`、`object.title = x`、`object.try(:name)`、`object.present?`（ActiveSupportのメソッドであり、モデルのインデックス行には存在しない）、および`attribute(:x) { ... }`のブロック形式（ブロックがそれをレンダリングするにもかかわらず、名前はモデルに対して依然として要求される）。それぞれ安全な方向（誤った型ではなく却下）であり、Mastodonの`app/serializers`にはどれも出現しないため、上記の計測された到達度には影響しない。

## 意図的に計測しなかったもの

SimpleFormのinput。スイープにおける875箇所の`object`というカウントは、AMSシリアライザ（`app/serializers`内の751箇所）と`SimpleForm::Inputs::Base#object`（そのリソースはinputクラスではなく`simple_form_for`の呼び出し箇所によって名付けられる — 別のgemであり別の導出であり、まだ存在しない`rigor-simple-form`向けである）が混在している。

`rigor-pundit`（`authorize`、317箇所）および`rigor-devise`（`current_user`、196箇所）は、スイープが計測したとおり、Mastodon上でロードされているものの沈黙したままである。ここでの変更はいずれにも触れていない。

---

## 2026-09-17 — `:model_index`マクロ畳み込み後（#1049）

`rigor-activerecord` 0.10.0は、3つのマクロファミリーをモデルエントリーおよび公開ファクトに畳み込む: `delegate`（モデル本体、コンサーンの`included do`、およびコンサーンモジュール自身のトップレベル）、コンサーンが`included do`内で宣言するアソシエーション、ならびにPaperclip / Active Storageアタッチメントマクロ — さらに、上記の表ではコンサーンファミリーの下に数えられている`enum`の値ごとの述語。これは受け入れゲートが求めた再計測である。

### 方法

上記と同様であるが、1点変更がある。2つの比較対象は同一のプライベートコピー上での同一のプラグインセットであり、両者間で異なるのは`origin/master`における`plugins/`と、このブランチのHEADにおける`plugins/`である。計測対象は認識機構ではなく畳み込みであるため、プラグインは両方の比較対象で有効になっている。

到達度プローブは、2つ目のプライベートコピーにおいて`app/serializers`配下のすべてのクラスに挿入された`def __rigor_probe__ = Rigor.dump_type(object)`である。これにより、カウントはすでに`object`を読み取っているものだけでなく、すべてのシリアライザを網羅する。その方法により、上記の表との比較可能性において2つの数値が犠牲となる。ディスカバラーがインデックスする173クラスではなく256クラスをプローブし（ネストされたクラスやシリアライザ以外のクラスもプローブする）、変更前の導出カウントは34ではなく36である（これは上記で計測されたものよりも新しいサーベイコピーのチェックアウトであるため）。

### コーパス判定

| | origin/masterでの`plugins/` | このブランチでの`plugins/` |
| --- | --- | --- |
| Mastodonの診断数 | 2536 | 2536 |
| Redmineの診断数 | 1702 | 1702 |

ソート済みの`path:line:column:rule:message`セットは**両プロジェクトでバイト単位で一致**している。これはIssueが予測した結果であり、畳み込みが生み出さなければならない結果である。`:model_index`のすべてのコンシューマーはここで畳み込まれたものを用いて既知の名前セットを拡大するため、新たな発火は名前を捏造した畳み込みを意味することになる。

コンサーンの畳み込みは、純粋な拡大ではない処理を1つ行っており、名前を挙げておく価値がある。コンサーンの`has_one :account_stat`は、従来`Dynamic`であった`account.account_stat`を`AccountStat | nil`に狭めるようになり、狭められたレシーバーは呼び出しがチェックされるレシーバーとなる。バイト単位で一致したMastodonのセットは、これが新たな`call.undefined-method`に変わらなかった証拠である。

### 到達度

| | 前 | 後 |
| --- | --- | --- |
| プローブされたシリアライザクラス | 256 | 256 |
| `object`がモデルを導出 | 36 | 43 |

Issueで挙げられた15件の却下のうち7件が回収され、プロジェクトで最大の2つのシリアライザの両方が含まれている:

| シリアライザ | `object`の型付け結果 | ファミリー |
| --- | --- | --- |
| `REST::AccountSerializer` | `Account` | 1 + 2 + 3 |
| `REST::Admin::AccountSerializer` | `Account` | 1 + 2 |
| `REST::StatusSerializer` | `Status` | コンサーンからのenum述語 |
| `REST::MediaAttachmentSerializer` | `MediaAttachment` | 3 |
| `ActivityPub::NoteSerializer::MediaAttachmentSerializer` | `MediaAttachment` | 3 |
| `REST::CollectionItemSerializer` | `CollectionItem` | 2 |
| `REST::AccountRelationshipSeveranceEventSerializer` | `AccountRelationshipSeveranceEvent` | 2 |

以前に導出されていたものが導出されなくなることはなく、3つの真の見落とし（`REST::ConversationSerializer`、`REST::InstanceSerializer`、`REST::V1::InstanceSerializer`）は依然として`Dynamic[top]`に解決される — 表面チェックがそれらをその状態に保ち続けており、モデルにより多くの表面を畳み込んでもチェックが弱まることはない。

### 依然として却下される8件と、実際に何によってブロックされているか

これらは3つのファミリーによってブロックされているわけではない。それぞれから応答しなかった名前を読み取ると:

| シリアライザ | 畳み込み後も応答しなかった名前 | 何がそれを定義しているか |
| --- | --- | --- |
| `REST::PreviewCardSerializer`、`ActivityPub::NoteSerializer::PreviewCardSerializer` | `original_url` | `PreviewCard`上の`attr_accessor :original_url` |
| `REST::NotificationPolicySerializer`、`REST::V1::NotificationPolicySerializer` | `pending_requests_count`、`pending_notifications_count` | `NotificationPolicy`上の`attr_reader` |
| `REST::ReportSerializer` | `collection_ids` | Railsの`<singular>_ids`リーダー（`has_many :collections`によって生成） |
| `REST::CustomEmojiSerializer` | `association(:category)` | フレームワーク独自のインスタンスAPIである`ActiveRecord::Base#association` |
| `REST::TranslationSerializer::PollSerializer` | `poll_options` | そもそもActive Recordモデルではない — `TranslationService::Translation::Poll` |

3つの独立したフォローアップがあり、いずれも本変更がカバーするマクロファミリーではない。エンジンの`user_def_through_ancestors`走査が応答しないモデル上のプレーンな`attr_*`、コレクションアソシエーションが生成する`<singular>_ids` / `<singular>_ids=`リーダー（ファミリー2の1行の拡張であり`REST::ReportSerializer`を回収する）、およびモデル化されていないActive Record独自のインスタンス表面である。最後の行は畳み込みではなく`model_overrides`のケースである。

### 意図的に畳み込まなかったもの

コンサーンの`included do`内の`enums:`、`validations:`、および`callbacks:`は従来どおり維持された。ここで畳み込まれた名前のみのセットはコンシューマーを静かにさせることしかできない。一方`enums:`は`Analyzer#validate_enum_value`を駆動して発火するため、コンサーンのenumカラムを畳み込むと、受け入れゲートが「新たな診断ゼロ」であるコーパスに新たな`unknown-enum-value`診断をもたらすことになる。enumの値述語にはそのようなリスクはなく畳み込まれており、それが`REST::StatusSerializer`を回収した要因である。
