---
title: "rigor-active-model-serializers"
description: "rigortype/rigor docs/manual/plugins/rigor-active-model-serializers.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-active-model-serializers.md"
sourcePath: "docs/manual/plugins/rigor-active-model-serializers.md"
sourceSha: "3abd9f0c7b66d42c0eaa879d36f87bc70b26f39c791ded511dcf07691e6dcc11"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
sourceDate: "2026-09-18T14:23:03Z"
translationStatus: "translated"
sidebar:
  order: 9050
---

`ActiveModel::Serializer`サブクラスの内部における`object`が何であるかをRigorに教え、その下の読み取り（`object.username`、`object.account.display_name`）が未知のレシーバーへのディスパッチではなくモデルに対して解決されるようにします。ソースのみを読み取り、ActiveModelSerializersのランタイム依存関係はありません。

`rigortype`にバンドルされて出荷されます。どのモデルが存在し何に応答するかをこのプラグインに伝える`rigor-activerecord`と並べて、`plugins:`の下でアクティブ化します：

```yaml
plugins:
  - rigor-activerecord
  - rigor-active-model-serializers
```

## 何を行うか ── 診断は出さない

このプラグインは独自には何も放出しません。1つの戻り値型とgemのフレームワーク定数を貢献するため、

```ruby
class REST::AccountSerializer < ActiveModel::Serializer
  attributes :id, :username, :display_name

  def display_name
    object.display_name
  end
end
```

において、`object`を`Account`として型付けし、`object.display_name`を`accounts.display_name`カラムの型として型付けします。ユーザーが気づくのは、これまで不可視であったシリアライザの`object`配下のタイポなどが、診断として発火**できるようになる**ことです：

```text
app/serializers/errors_serializer.rb:11:23: error: undefined method `nickname' for String [call.undefined-method]
```

また、`rigor coverage`が`app/serializers`のより大きな割合を精密（precise）として報告するようになります。Mastodonでは、診断セットに一切変更を与えることなく、その割合が51.1%から53.2%に向上しました（[測定ノート](../../../notes/20260917-ams-object-recognizer/)）。

## いつobjectが型付けされ、いつ型付けされないか

シリアライザのソース内の何ものも、どのクラスをシリアライズするかを明示していません ── AMSはシリアライザ構築時にリソースを束縛します。したがって型は常に**導出（derived）**され、プラグインが型を貢献する前に2つの独立した事項が一致しなければなりません：

1. **名前が解決される**。`<Model>Serializer`がプロジェクトにある正確に1つのモデルを指名している ── `REST::AccountSerializer` → `Account`。
2. **モデルがシリアライザに応答する**。シリアライザがそのリソースから読み取るすべての名前 ── 自身で定義していない`attributes` / `attribute` / `has_many` / `has_one` / `belongs_to`宣言、および本文内のすべての`object.<name>` ── が、そのモデルのカラム、カラムごとの述語、関連、enum、エイリアス、スコープ、マクロ定義メソッド、あるいはプロジェクトがそのモデルや祖先に定義したメソッドである。

応答しない名前が1つでもあるとシリアライザ全体が辞退されます。なぜなら、その場合リソースは別の何か（多くの場合、モデルのサーフェスの大部分を共有し、異なる1〜2個の名前によって正体が明かされるプレゼンターやデコレーター）だからです。Mastodonでは、このチェックこそが、リソースが`AccountConversation`であるときに`REST::ConversationSerializer`が`Conversation`として型付けされるのを防いでいます。

| あなたのコード | `object`の型付け |
| --- | --- |
| `REST::AccountSerializer`で、`Account`が存在しそれに応答する | `Account` |
| `Admin::AccountSerializer`で、`Admin::Account`と`Account`の両方が存在する | 変更なし ── 解釈が曖昧であり、ここでは一方を他方より優先することはない |
| `ConversationSerializer`で、その宣言に`Conversation`が応答できない | 変更なし（`Dynamic`） |
| リソースから何も読み取らないシリアライザ | 変更なし ── 名前を照合する対象が存在しない |
| `ContextSerializer`で、`Context`**モデル**が存在しない | 変更なし（`Dynamic`） |
| `model_overrides`にリストしたシリアライザ | 指定したモデル |
| シリアライザの外部で書かれた、または独自の`def object`の上の`object` | 変更なし（`Dynamic`） |

シリアライザとは、スーパークラスチェーンが`ActiveModel::Serializer`に到達する`serializer_search_paths`配下のクラスです ── 独自のベースシリアライザを経由するもの（`class ApplicationSerializer < ActiveModel::Serializer`、その後の`class AccountSerializer < ApplicationSerializer`）を含みます。チェーンが到達しないクラスは、どのように呼ばれていようともここではシリアライザではありません：`object`は通常のメソッド名であり、独自の`Json::ConversationSerializer`がそれを定義する権利があります。

`class << self`および`def self.`の本文はそのまま残されます。そこで読み取られる`object`は実行時に`NoMethodError`となります（AMSのリーダーはインスタンスメソッドです）。したがって型付けすべきものは何もなく、プラグインがそれについて述べるべきこともありません。

**プラグインは決して推測しません**。リソースを確立できない場合、何も貢献せず、`object`は以前持っていた答えを保持します。ここで誤ったクラスを割り当てると、動作しているコード上のすべての読み取りが偽の`call.undefined-method`になってしまうためです。

また、`rigor-activerecord`がない場合や、`db/schema.rb` / `db/structure.sql`のないプロジェクトでは、まったく何もしません：解決およびチェックの対象となるモデルセットはそのプラグインから提供され、スキーマがない場合は差し控えられます。

## 設定

```yaml
plugins:
  - gem: rigor-active-model-serializers
    config:
      serializer_search_paths: ["app/serializers", "app/lib"]
      serializer_base_classes: ["ActiveModel::Serializer"]
      model_overrides:
        REST::InstanceSerializer: InstancePresenter
```

| キー | デフォルト | 意味 |
| --- | --- | --- |
| `serializer_search_paths` | `["app/serializers", "app/lib"]` | シリアライザクラスを探索する場所。ベースシリアライザが`app/serializers`の外に配置されることが日常的であるため（Mastodonの`ActivityPub::Serializer`、その60個のシリアライザの親がその一例）、`app/lib`がデフォルトセットに含まれています。存在しないディレクトリのコストは1回のプローブです。 |
| `serializer_base_classes` | `["ActiveModel::Serializer"]` | 祖先探索が開始されるルート。 |
| `model_overrides` | `{}` | 導出が到達できないシリアライザ（プレゼンター、デコレーター、またはJSONの形状にちなんで命名されたクラス）に対する、シリアライザクラス名 → リソースクラス名。ユーザーのアサーションであり、再チェックはされません。 |

## 制限事項

- **SimpleFormのinputs**。`SimpleForm::Inputs::Base#object`は名前のみを共有し、それ以外は何も共有しません ── そのリソースはinputクラスからではなく、`simple_form_for`の呼び出し箇所から来ます。
- **`serializer:` / `each_serializer:`オプション**。これらは関連に対するシリアライザを名指すものであり、シリアライザに対するモデルを名指すことは決してありません。
- **スキーマとソースが述べていないモデルサーフェス**。`method_missing`からモデルが取得するメソッド、`rigor-activerecord`が認識しないgemのマクロからのメソッド、あるいは実行時にincludeされたモジュールからのメソッドはモデルインデックスから不可視であるため、それらを読み取るシリアライザは辞退されます。`rigor-activerecord`は`delegate`、concernがその`included do`内で宣言する関連、Paperclip / Active Storageのアタッチメントマクロ、および`enum`値の述語を読み取ります（[#1049](https://github.com/rigortype/rigor/issues/1049)）。マクロが定義するそれ以外のものはまだ折りたたまれません。
- **リソースの読み取り方の一部**。`object[:key]`、`object.title =`、`object.try(:name)`、`object.present?`、および`attribute(:x) { ... }`ブロックは証拠として読み取られないため、それらを使用するシリアライザは、モデルが正しい場合であっても辞退することがあります。これは常に安全な方向（誤った型ではなく、辞退）です。
- **プレーンなオブジェクトに対するシリアライザ**。`ActiveModelSerializers::Model`サブクラス、Struct、プレゼンターなど。対象としたいクラスが検査しても問題のない実際の定数である場合は、`model_overrides`を使用してください。

## プラグインの内部

シリアライザのディスカバラー / インデックス、祖先のクロージャ、およびこのプラグインが行使する契約サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-active-model-serializers/README.md)にあります。プラグインを作成するには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)および[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
