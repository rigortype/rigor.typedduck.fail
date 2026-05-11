---
title: "Rails Ecosystem Plugins — Roadmap"
description: "Imported from rigortype/rigor docs/design/20260508-rails-plugins-roadmap.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/design/20260508-rails-plugins-roadmap.md"
sourcePath: "docs/design/20260508-rails-plugins-roadmap.md"
sourceSha: "f5721d702f770a744dfa12499411c47406e78373ad264720289c854421569d26"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 20265508
---

ステータス: **計画中、2026-05-08**。このドキュメントはRailsアプリ向けの`rigor-*`プラグインファミリーの計画をキャプチャしています。情報提供目的であり、個々のプラグイン契約の拘束力のあるソースは各プラグインのディレクトリ下の`README.md`と統合仕様に残ります。

このファミリーの最初のプラグイン——[`rigor-activerecord`](../../examples/rigor-activerecord/)——は`master`（コミット`e8fda84`）に着地し、[`.codex/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md)の「モノリポでスタート、契約が安定したら`git subtree split`で抽出」規律に従ってモノリポにステージされています。

## 作業原則

1. **各プラグインはサブツリー分割されます** — 実際のRailsコンシューマーに対してその契約が安定したら、独自のリポジトリ（`rigortype/rigor-<id>`）に。モノリポはインキュベーター;最終的な置き場は独立したgemです。
2. **プラグインごとの`demo/`ディレクトリがプラグインとともにリリースされます**。プラグイン間で共有されるRailsアプリスケルトンなし——サブツリー分割後、各`demo/`はプラグインとともに移動し、自己完結していなければなりません。Railsシェイプのディレクトリツリー（例: `app/models/application_record.rb`）の重複は、クリーンな抽出と引き換えに許容されます。
3. **Railsへの実際のアラインメントは目標であり、ランタイム依存関係ではありません**。プラグインのソースコードは`require "rails"` / `require "active_record"`を**しません**。プロジェクトのソースファイルを解析します。しかし、プラグインの動作（生成されるパスヘルパー、受け入れられるカラム型、認識されるフィルターチェーン）は、同じ入力に対してRailsが実際に生成 / 受け入れるものとMATCHしなければなりません。同じ`config/routes.rb`に対して小さなRailsアプリの`rails routes -E` / スキーマダンプ出力とプラグイン出力を比較する統合仕様を推奨します。
4. **クロスプラグインファクトは共有APIを通じて流れます**。 `rigor-actionpack`のストロングパラメーターコンシューマーは`rigor-activerecord`が構築するモデルインデックスを必要とします。そのクロスプラグインハンドオフはv0.1.xのクロスプラグインAPI（[ADR-9](../../adr/9-cross-plugin-api/)）を通じて行われ、重複した読み取りや共有キャッシュプロデューサーIDを通じてではありません。

## プラグインティアテーブル

Tier 1プラグインは最高のユーザー価値を持ち、かつ解析器側の新しいAPIを必要としないため最初に着地します。Tier 2は既存プラグインを拡張するかADR-9がリリースするクロスプラグインAPIを必要とします。Tier 3は特化型——具体的なユーザー需要があれば作成します。

| ティア | プラグイン | スコープ | API要件 |
| --- | --- | --- | --- |
| 1A | [`rigor-rails-routes`](#rigor-rails-routes) | 実際の`config/routes.rb` DSL → `*_path` / `*_url`バリデーション | 現行API |
| 1B | [`rigor-rails-i18n`](#rigor-rails-i18n) | `config/locales/*.yml` → `t('key.path')`バリデーション | 現行API |
| 1C | [`rigor-actionmailer`](#rigor-actionmailer) | メーラーメソッド + ビューテンプレート存在確認 | 現行API |
| 1D | [`rigor-activejob`](#rigor-activejob) | ジョブ`perform`の引数アリティ | 現行API |
| 2A | `rigor-activerecord`拡張 | アソシエーション、enum、スコープ、バリデーション、コールバック | 現行API;既存gemの0.2.0+として着地 |
| 2B | [`rigor-actionpack`](#rigor-actionpack) Phase 1 | ストロングパラメーター → ARカラムバリデーション | **クロスプラグインAPI（ADR-9）** |
| 2C | [`rigor-factorybot`](#rigor-factorybot) | ファクトリー属性 → ARカラムバリデーション | クロスプラグインAPI |
| 2D | `rigor-actionpack` Phase 2-4 | フィルターチェーン、レンダーターゲット、ルートヘルパー消費 | クロスプラグインAPI |
| 3A | [`rigor-rspec`](#rigor-rspec) | `let` / `subject` / モックターゲットバリデーション | 現行API |
| 3B | [`rigor-pundit`](#rigor-pundit) | ポリシーメソッド存在 + `authorize`引数バリデーション | 現行API |
| 3C | `rigor-sidekiq` | ワーカー`perform`のアリティ、キュー設定 | 現行API |
| 3D | `rigor-graphql` | スキーマ → リゾルバー引数型 | 現行API |
| 3E | `rigor-activestorage` | `has_one_attached`マクロ + 生成メソッド | クロスプラグインAPI |
| 3F | `rigor-actioncable` | チャンネルメソッド + ブロードキャスト名 | 現行API |

Tier 1+2が着地した後、**`rigor-rails`**はこれらの依存関係をgemspecで宣言し、ユーザーがGemfileに1行追加するだけでスタック全体にオプトインできるメタgemになります。

## プラグインスケッチ

### rigor-rails-routes

**Tier 1A — 現行API**。実際の`config/routes.rb`を解析します（教育目的で`examples/rigor-routes/`が使用するYAML簡略化ではなく）。

プラグインのv0.1.0向けDSLサーフェス:

- `Rails.application.routes.draw do ... end`ブロック
- `resources :name [, only: [...] | except: [...]]`
- `resource :name`
- `get/post/patch/put/delete "/path", to: "controller#action", as: :name`
- `root to: "controller#action"`
- ネストされた`resources`（1レベル深さ）
- `member do ... end` / `collection do ... end`
- `namespace :admin do ... end`（パス + ヘルパー名にプレフィックスを付ける）

v0.1.0のスコープ外:
- `scope :module:` / `scope :path:` / `scope :as:`
- 制約（`constraints: { id: /\d+/ }`）
- カスタム`direct(:name) { |obj| ... }`
- マウント可能エンジン（`mount Sidekiq::Web => "/sidekiq"`）
- フォーマット制限

**診断:**

```text
controllers/users_controller.rb:42:7: info: `user_post_path` → GET /users/:user_id/posts/:id
controllers/users_controller.rb:50:1: error: no route helper `widgts_path` (did you mean `widgets_path`?)
controllers/users_controller.rb:51:1: error: `user_path` expects 1 argument (:id), got 0
```

**アーキテクチャ:** `rigor-activerecord`のPrism上の`SchemaParser`再帰下降と`rigor-routes`のヘルパー名テーブルを組み合わせます。ヘルパー生成ルールは実際のRailsによる慎重な検証が必要——下記「Railsへの実際のアラインメント」を参照。

**Railsへの実際のアラインメント:**統合仕様は同じ`config/routes.rb`に対してプラグインの`HelperTable`を`rails routes -E`の出力と比較します。`demo/`下の小さなRailsアプリがリファレンスを提供します。

---

### rigor-rails-i18n

**Tier 1B — 現行API**。 `config/locales/*.yml`に対して`t('key.path')`を検証します。

サーフェス:

- `t('key.path')` / `I18n.t('key.path')` / `I18n.translate('key.path')`
- `t('key.path', interpolation_var: value)` — ロケール値内の`%{var}`プレースホルダーに対して補間キーを検証します
- `l(time, format: :short)` — ロケールの日付フォーマットキーに対して`:short`を検証します

v0.1.0のスコープ外:
- 遅延ルックアップ（レンダリングされたコントローラー / ビューパスに対して解決される`t('.title')`——`rigor-actionpack`が必要）
- ロケールフォールバックチェーン
- 複数形ルール

**診断:**

```text
view.html.erb:5:1: info: `t('users.welcome')` resolves in en, ja
view.html.erb:8:1: error: missing key `users.welcom` in en (did you mean `users.welcome`?)
view.html.erb:12:1: error: `users.welcome` expects interpolation `name`, got `username`
```

**アーキテクチャ:** `rigor-routes`（YAML読み取り） + `rigor-pattern`（`t(literal_key)`のリテラル文字列ゲーティング）。`IoBoundary`を通じてロケールパスをグロブループします。

---

### rigor-actionmailer

**Tier 1C — 現行API**。メーラーコールの形状とビューパスの存在を検証します。

サーフェス:

```ruby
class UserMailer < ApplicationMailer
  def welcome(user)
    @user = user
    mail(to: user.email)
  end
end

UserMailer.welcom(user).deliver_now    # error: undefined method
UserMailer.welcome.deliver_now          # error: missing required arg
UserMailer.welcome(user, foo: 1)        # error: wrong arity
```

さらに`app/views/<mailer_underscore>/<method_name>.{html,text}.erb`の存在チェック。

**アーキテクチャ:** `rigor-activerecord`の`ModelDiscoverer`パターンをメーラークラス（`ApplicationMailer` / `ActionMailer::Base`のサブクラス）に適用。ビューパスは`IoBoundary`経由でチェック。

---

### rigor-activejob

**Tier 1D — 現行API**。ジョブクラスの`#perform`定義に対して`Job.perform_later`の引数アリティを検証します。

サーフェス:

```ruby
class WelcomeEmailJob < ApplicationJob
  def perform(user_id, locale = "en")
    ...
  end
end

WelcomeEmailJob.perform_later(123)              # info
WelcomeEmailJob.perform_later                   # error: missing user_id
WelcomeEmailJob.perform_later(123, "ja", :foo)  # error: wrong arity
```

**アーキテクチャ:**小規模——クラス発見 + コールごとのアリティチェック。`rigor-actionmailer`と同じパターン。

---

### rigor-actionpack

**Tier 2B+2D — クロスプラグインAPI（ADR-9）が必要**。「Railsアプリがこれを望む」旗艦プラグインですが、主な価値は`rigor-activerecord`のモデルインデックスとのクロスチェックから生まれます。段階的なロールアウト:

#### Phase 1 — ストロングパラメーター

```ruby
def user_params
  params.require(:user).permit(:name, :emial)
  # error: column `:emial` not on table `users` (did you mean `:email`?)
end
```

ADR-9の`services.fact_store`から`rigor-activerecord`の`:model_index`ファクトを読みます。`require`のSymbol引数`:user`を`User`モデルに解決し、`permit`キーをテーブルに対して検証します。

#### Phase 2 — フィルターチェーン

```ruby
class UsersController < ApplicationController
  before_action :authenticate, only: [:create, :update]
  # validates :authenticate exists as an instance method
  # validates :create, :update exist as actions
end
```

コントローラークラス内での2パス: アクションメソッド宣言を収集し、フィルター`:method_name`と`only:` / `except:` Symbolリストを検証します。

#### Phase 3 — レンダーターゲット

```ruby
def show
  render partial: "users/profile", locals: { user: @user }
  # validates app/views/users/_profile.html.erb exists
end
```

`IoBoundary`でパーシャルファイルの存在を確認します。

#### Phase 4 — ルートヘルパー消費

```ruby
def show
  redirect_to user_path(@user)
end
```

ADR-9を通じて`rigor-rails-routes`の`:helper_table`ファクトを消費します。コールサイトでヘルパー名 + アリティを検証します（コントローラー定義ファイルではなく——コントローラーはどこからでも呼び出される可能性があります）。

---

### rigor-factorybot

**Tier 2C — クロスプラグインAPIが必要**。ファクトリー属性のARカラムに対するバリデーション。

```ruby
FactoryBot.define do
  factory :user do
    name { "Alice" }
    invlid_attribute { "x" }   # error if rigor-activerecord is loaded
  end
end

create(:usre)                  # error: factory undefined (did you mean :user?)
build(:user, emial: "x")       # error: column mismatch
```

2フェーズ: ファクトリー定義を発見（`rigor-statesman`に類似）し、使用サイトを検証。ADR-9の`fact_store`を通じて`rigor-activerecord`のモデルインデックスを消費します。

---

### rigor-rspec

**Tier 3A — 現行API**。テストDSLのフロー追跡。

```ruby
RSpec.describe User do
  let(:user) { User.new(name: "Alice") }
  subject(:greeting) { "Hello, #{user.name}" }

  it "greets" do
    expect(greeting).to eq("Hello, Alice")
    expect(user).to receive(:nme).and_return("X")  # error: no method :nme on User
  end
end
```

実装が重い（RSpec DSLは幅広い）。予想サイズ: 600行超。テスト側のバリデーションが明確な優先事項になったら作成——Railsアプリはコントローラー / モデル / ビューのバリデーションからより多くの恩恵を受けるため、おそらくTier 3。

---

### rigor-pundit

**Tier 3B — 現行API**。ポリシーメソッドの存在 + `authorize`引数バリデーション。

```ruby
authorize @user, :update?
authorize @user, :destory?      # error: undefined policy method (did you mean :destroy?)
```

ポリシークラス発見器 + コールごとのバリデーション。慣習的なマッピング: `User` → `UserPolicy`、アクションメソッド`:update?` → `UserPolicy#update?`。`cancancan`は類似した形状だが異なる慣習を持つ別のプラグイン。

---

## プラグイン依存関係グラフ

```
                                   ┌────────────────────────┐
                                   │ rigor-activerecord     │
                                   │  (already landed)      │
                                   └──┬─────────────────────┘
                                      │ publishes :model_index via fact_store
                ┌─────────────────────┼─────────────────────┐
                ▼                     ▼                     ▼
   ┌────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐
   │ rigor-actionpack   │  │ rigor-factorybot     │  │ rigor-active-   │
   │  Phase 1 (params)  │  │                      │  │  storage        │
   └────────────────────┘  └──────────────────────┘  └─────────────────┘
              ▲
              │ consumes :helper_table
              │
   ┌──────────┴───────────┐
   │ rigor-rails-routes   │
   │  publishes :helper_  │
   │  table               │
   └──────────────────────┘

   ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
   │ rigor-rails-i18n     │  │ rigor-actionmailer   │  │ rigor-activejob  │
   │  (independent)       │  │  (independent)       │  │  (independent)   │
   └──────────────────────┘  └──────────────────────┘  └──────────────────┘

   ┌──────────────────────┐  ┌──────────────────────┐
   │ rigor-rspec          │  │ rigor-pundit         │
   │  (independent)       │  │  (independent)       │
   └──────────────────────┘  └──────────────────────┘
```

`rigor-rails`（メタgem）はこれらすべての上位に位置し、gem依存関係を通じてすべてを取り込みます。スタック全体を欲しいユーザーには: `gem "rigor-rails"`。

## デモ / テストアプリ戦略

**プラグインごとの自己完結型デモ**。各`examples/rigor-<id>/demo/`はプラグインのスコープに適した小さなRailsシェイプのディレクトリツリーをリリースします。`git subtree split`後、デモは手動での修正なしにプラグインとともに移動します。

クロスカットなRailsアプリ（ストロングパラメーター + AR + ルート）を必要とするTier 1+2プラグインの場合でも、デモはプラグインごとです——各プラグインのデモは**そのプラグイン**が必要とするRailsサーフェスのみを含みます。`rigor-actionpack`のデモはコントローラーファイルとモデルフィクスチャーの`application_record.rb`を持ちますが、フルRailsディレクトリツリーはありません。

Railsへの実際の検証: 統合仕様はtmpdirに小さな`rails new`スケルトンをexecし、プラグイン出力を`rails routes -E` / `db:schema:dump`等と比較することがありますが、それはTESTツールであり、デモ時のフィクスチャーではありません。

## サブツリー分割準備チェックリスト

プラグインごとに、分割前に確認:

- [ ] `examples/rigor-<id>/`ディレクトリが自己完結している（外部を指す`require_relative`がない）。
- [ ] `examples/rigor-<id>/demo/`が`RUBYLIB=$PWD/../lib bundle exec rigor check`でクリーンに実行される。
- [ ] `spec/integration/examples/<id>_plugin_spec.rb`の統合仕様が実際の`Plugin::Loader.load`コンシューマーとしてプラグインがロードされた状態でパスする。
- [ ]プラグインの`gemspec`が`rigortype`に対する正しいsemver範囲を宣言している（例: `>= 0.1.0, < 0.2.0`）。
- [ ]クロスプラグインファイル参照なし——クロスプラグインデータは`services.fact_store`（ADR-9以降）または重複した読み取り（ADR-9以前）のみを通じて流れる。
- [ ] READMEに抽出後にキューに入れられているものを説明する「将来の方向性」セクションがある。

すべてチェックが付いたら実行:

```sh
git subtree split --prefix=examples/rigor-<id> -b rigor-<id>-extracted
git remote add rigor-<id> git@github.com:rigortype/rigor-<id>.git
git push rigor-<id> rigor-<id>-extracted:master
```

その後モノリポで: `examples/rigor-<id>/`を削除し、対応する`spec/integration/examples/<id>_plugin_spec.rb`を削除し、`examples/README.md`の比較表からその行を削除し、`README.md`のプラグインリストを更新します。

## 操作順序

1. **計画を文書化する** — このファイル + [ADR-9](../../adr/9-cross-plugin-api/)。（現在のコミット。）
2. **Tier 1プラグインを実装する（現行API）** — `rigor-rails-routes`、`rigor-rails-i18n`、`rigor-actionmailer`、`rigor-activejob`。各々を独自のコミットとして、サブツリー分割の準備を念頭に置いて。
3. **クロスプラグインAPIを実装する（ADR-9）** — `Plugin::FactStore` + `prepare(services)`フック + `consumes:`マニフェストフィールド + `Plugin::Loader`でのトポロジカルソート。パブリックAPIドリフトスナップショットを更新。SKILLセクションを追加。
4. **Tier 2プラグインを実装する（クロスプラグイン）** — `rigor-actionpack` Phase 1（ストロングパラメーター）、次に`rigor-factorybot`。これらは実際のコンシューマーに対してADR-9を実証します。
5. **安定化 + 抽出** — 各プラグインの`examples/`ディレクトリが2リリース以上安定したら、サブツリー分割フローを実行し、独立したリポジトリに移行します。
6. **Tier 3 + メタgem** — ユーザー需要が表面化したらTier 3プラグインを作成。Tier 1+2が抽出されたら、依存関係の集約とともに`rigor-rails`メタgemを公開します。

Tier 1プラグイン（現行API）は作成時間のみのブロッカーであり、契約設計のブロッカーではありません。必要に応じて独立した実装者が並行して着地させることができます。Tier 2はADR-9の実装をブロッカーとします。
