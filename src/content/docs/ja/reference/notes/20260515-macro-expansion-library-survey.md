---
title: "マクロ／DSL展開 — ライブラリ別調査"
description: "rigortype/rigor docs/notes/20260515-macro-expansion-library-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260515-macro-expansion-library-survey.md"
sourcePath: "docs/notes/20260515-macro-expansion-library-survey.md"
sourceSha: "fc160a4af4c256b2aff73ee052233538907d17f8f7d14511a28ce97a3d4a6151"
sourceCommit: "fe4e9a80df3829ee4f113e763e4bb9920c33da21"
translationStatus: "translated"
sidebar:
  order: 20266515
---

日付: 2026-05-15。2026-05-15にdry-rbトリオ（dry-types, dry-schema,
dry-struct）を追加するためリビジョン。
ステータス: 調査メモであり、設計上のコミットメントではない。
[ROADMAP](../../roadmap/)のO2作業項目（「マクロテンプレート＋ヒアドキュメントRuby展開」）の前提条件であり、
[ADR-16](../../adr/16-macro-expansion/)（マクロ展開基盤）の根拠となる証拠。

このドキュメントは**ライブラリ別の調査結果のみ**である。集約された評価（rigorに対する決定の形）はADR-16にあり、本メモはその決定の入力となる。

各セクションは、対象サブシステムについて以下の5つの問いに答える。

1. ユーザー向けのDSL表面（短いスニペット1つ）。
2. 実装メカニズム — どのRubyメタプログラミングプリミティブがそれを担うか。
3. 呼び出し箇所で何が生成されるか（メソッド名、アクセサ、コールバック）。
4. 静的展開可能性 — 静的解析器はソースのみから生成された表面を復元できるか？
5. もっとも近い類似物 — Lispの`defmacro`、PHPStanのトレイトインライン展開、ランタイム登録、それ以外のいずれか。

ソースコードは`/tmp/<lib>-research/`内の浅いクローンで読んだ。これらのクローンはコミットされておらず、サブモジュールとしても参照されていない。引用箇所はクローンのファイルパスを指しており、将来の読者は再クローンして検証できる。

---

## ActiveSupport::Concern（Rails 8-0-stable）

1. **DSL**
   ```ruby
   module M
     extend ActiveSupport::Concern
     included    { scope :active, -> { where(active: true) } }
     class_methods do
       def foo; end
     end
   end
   class Host; include M; end
   ```

2. **メカニズム** — `Concern`は`Module#append_features` /
   `Module#prepend_features`をオーバーライドする（`activesupport/lib/active_support/concern.rb:129-153`）。
   最初の`include`時に次を行う: （a）キューに入った依存関係を実行する、（b）`super`を呼ぶ（本物の`include`）、（c）定義されていれば`base.extend const_get(:ClassMethods)`を実行（`:137`）、（d）`base.class_eval(&@_included_block)`を実行（`:138`）。
   `class_methods(&blk)`は`const_set`+`module_eval`によって`ClassMethods`サブモジュールを遅延的に作成する（`:209-215`）。
   `included(&blk)` / `prepended(&blk)`はブロックを保存するだけである（`:158-187`）。

3. **生成されるもの** — ホストは`M`のインスタンスメソッドを得て、ホストのシングルトンクラスは`M::ClassMethods`を得て、`included do … end`ブロックは`self`をホストとして実行される（したがってその中のDSL形式の任意の呼び出しはホストに着地する）。
   推移的: `@_dependencies`内のすべてのモジュールが`super`の前に再帰的にインクルードされる（`:135, :148`）。

4. **静的展開可能性** — 部分的に展開可能:
   - **自明に展開可能** — `ClassMethods`の`extend`とインスタンスメソッドの`include`の半分。ウォーカーは`include M`を「`M::ClassMethods`を`extend`＋`M`のdefをHostにミックスインする」と扱える。
   - **再帰的に展開可能** — `@_dependencies`チェーンは純粋にレキシカルである（モジュール本体内の`include OtherConcern`）。
   - **ブロック展開はブロック本体に依存する**。`included do … end`は*遅延`class_eval`*である: ブロックASTを逐語的にインライン展開し、インクルードする側に再バインドする。他のrigorウォーカーがすでに理解しているDSL呼び出し（例: `has_one_attached`、`has_many`、`scope`）は、*インクルードする側*でそれらのウォーカーを再トリガーする。
   - **困難なケース**: `included do`内での`Rails.env` / `defined?(…)`による分岐、補間されたヒアドキュメントの`class_eval`、ランタイムに具体的なbaseに対して実行される4引数の`included(base)`本体。

5. **もっとも近い類似物** — **PHPStanのトレイトインライン展開**。内容は静的なテキストでホストクラスに再バインドされる。Rustのderiveマクロと異なり、展開のターゲットはConcern自身ではなく*インクルードする側*である。展開はinclude箇所で発火し、concernの定義箇所では発火しない。

---

## ActiveStorageのattachedマクロ（Rails 8-0-stable）

1. **DSL**
   ```ruby
   class User < ApplicationRecord
     has_one_attached :avatar, service: :s3, strict_loading: true
   end
   class Gallery < ApplicationRecord
     has_many_attached :photos
   end
   ```

2. **メカニズム** — 両者は
   `activestorage/lib/active_storage/attached/model.rb`に存在し、`ActiveSupport::Concern`を拡張するモジュール（`:10`）内の`class_methods do … end`（`:54`）を通じて公開される。アクセサのペアは**`generated_association_methods`に対するヒアドキュメント`class_eval`**によって生成される（`has_one_attached`は`:111-126`、`has_many_attached`は`:213-230`）。リフレクションの帳簿管理は`add_attachment_reflection`を通じて行われる（`:146-154` /
   `:250-258`）。サポート関連付け（`has_one`、`has_many`、`scope`、
   `after_save`、`after_commit`）は追加のインラインDSL呼び出しである。

3. **生成されるもの** `has_one_attached :avatar`の場合（`:photos`の複数形サフィックス名についてはミラー）:
   - `def avatar`は`ActiveStorage::Attached::One`を返す（`:113-116`）。
   - `def avatar=(attachable)`（`:118-125`）。
   - `has_one :avatar_attachment`（リーダー＋ライター＋ARリフレクション）。
   - `has_one :avatar_blob, through: :avatar_attachment`。
   - `scope :with_attached_avatar`（クラスレベルのリレーション）。
   - `after_save`＋`after_commit`コールバック。
   - `User.reflect_on_attachment(:avatar)`はリフレクションを返す。
   - `has_many_attached`の場合: 同じ5名前パターンが複数形化される。
     主要アクセサは`ActiveStorage::Attached::Many`を返す。

4. **静的展開可能性** — 高度に展開可能:
   - **メソッド名はシンボルリテラル引数に対する純粋な文字列補間である**。
     `:113, :115, :118, :128-131`はすべて`"#{name}"`を使う。シンボルリテラルが可視ならば、生成されるすべての名前は計算可能である。既存の`rigor-activestorage`プラグインはすでにこれを活用している。
   - **戻り値の型は安定しており、レキシカルに決定される**。
   - **条件付き生成は浅い** — `if ActiveStorage.track_variants`は`with_attached_*`の本体のみを分岐させ、表面のシグネチャは分岐させない。
   - **困難なケース** — `has_one_attached(some_method)`のように非リテラルな名前。現在のプラグインは諦める。AST展開器も同じ制限を継承する。
   - **Concernとの合成** — ユーザー側の`extend ActiveSupport::Concern`の`included`ブロック内に`has_one_attached`が現れる場合、Concernウォーカーはまずそのブロックをインクルードする側に再ターゲットしなければならない。そうすればattachedマクロ展開器がそこで発火する。2つのパスはかみ合う。

5. **もっとも近い類似物** — **PHPStanのトレイトインライン展開**。リテラルなシンボル／文字列引数によってパラメータ化された固定的なテキストテンプレートで、使用箇所で1回展開される。Lispの`defmacro`と異なり、テンプレートは不透明なテキスト（ヒアドキュメント）なので、展開器は汎用のマクロ評価器ではなくマクロごとのテンプレートテーブルを必要とする。

---

## AASM

1. **DSL**
   ```ruby
   class Job
     include AASM
     aasm do
       state :sleeping, initial: true
       state :running, :cleaning
       event :run do
         transitions from: :sleeping, to: :running
       end
     end
   end
   ```
   複数マシンバリアント: `aasm(:work_status) do … end`
   （`lib/aasm/aasm.rb:28-37`）。

2. **メカニズム** — `include AASM`は`AASM::ClassMethods`で拡張し、ステートマシンスロットを登録する（`lib/aasm/aasm.rb:8-17`）。
   クラスレベルの`aasm(*args, &block)`は`state_machine_name`をキーとして`AASM::Base`を構築する（あるいは再利用する）。そして`@aasm[state_machine_name].instance_eval(&block)`によってブロックを実行する（`:28-64`）。
   ブロック内では`state` / `event`は*`AASM::Base`のインスタンスメソッド*であり、剥き出しのマクロではない。
   `state :pending`は状態を登録し、`safely_define_method`によってホストクラスに`pending?`を注入する
   （`lib/aasm/base.rb:90-108`）。
   `event :submit do … end`はイベントを登録し、`may_submit?`、`submit!`、`submit`、`submit_without_validation!`を注入する
   （`base.rb:111-143`）。

3. **生成されるもの**ホストクラス上で:
   - **state**`:foo`ごと（`base.rb:99-106`）: `foo?`、定数`STATE_FOO`、そして`create_scopes`と永続化アダプタが`aasm_create_scope`に応答するならARスコープ`foo`が生成される（`persistence/base.rb:60-86`）。
   - **event**`:bar`ごと（`base.rb:120-141`）: `may_bar?(*args)`、
     `bar!(*args, &blk)`、`bar(*args, &blk)`、`bar_without_validation!`。
     `namespace:`を指定すると、追加のエイリアス`may_bar_NS?`などが生成される。状態述語は`NS_foo?`となる。
   - クラスレベル: `.aasm`、`.aasm(:name)`は`states`、`events`、`state_machine`、`human_event_name`などを公開する`AASM::Base`を返す。

4. **静的展開可能性** — おおむね扱える:
   - メソッド名は`state` / `event`に渡されるシンボルリテラルから決定論的に決まる。
   - クラスごとに複数のステートマシンが`aasm(:column_name) do … end`で存在しうる — それでもソース上は可視である。
   - `namespace:`オプションはオプション値を読む必要がある。値がリテラルの`Symbol` / `String`または`true`リテラル（`aasm(:name) do`からステートマシン名のシンボルを読む）の場合は復元できる。
   - `state :a, :b`のアリティオーバーロード: Hashでない先頭引数すべてを状態名として扱う。
   - 継承: 親クラスの定義はサブクラスより前にリプレイされる必要がある（`aasm.rb:21-25`）。
   - 真に動的かつまれなもの: 状態名が非リテラル、`Proc`値の`initial_state`、ランタイムの`respond_to?(:aasm_create_scope)`にゲートされたARスコープ生成。述語／イベントメソッド生成はアダプタチェックに依存しない。

5. **もっとも近い類似物** — **PHPStanのトレイトインライン展開／Lispマクロスタイル**の展開。`plugins/rigor-statesman/`がすでに`state_machine_class.state :foo`を歩いているのと精神的に同一である。AASMはstatesmanと同じプラグインアプローチの射程内にある。

---

## Devise

1. **DSL** — 3つの箇所:
   - モデル: `class User < ApplicationRecord; devise :database_authenticatable, :recoverable, …; end`
     （`lib/devise/models.rb:79`）。
   - ルーティング: `Rails.application.routes.draw`内の`devise_for :users`
     （`lib/devise/rails/routes.rb:226`）。
   - コントローラ（暗黙的）: `current_user`、`user_signed_in?`、
     `authenticate_user!`、`user_session`が`Devise::Controllers::Helpers.define_helpers`により合成される
     （`lib/devise/controllers/helpers.rb:113`）。

2. **メカニズム** — gemロード時の`Devise.add_module(:database_authenticatable, …)`
   （`lib/devise/modules.rb:9`、`Devise.with_options model: true`でラップ）。
   `add_module`（`lib/devise.rb:397-440`）は`ALL`に追加し（`:400`）、
   `STRATEGIES`/`CONTROLLERS`/`ROUTES`/`URL_HELPERS`を登録し、`model: true`のとき`Devise::Models::DatabaseAuthenticatable`をオートロードする（`:436`）。そして`Devise::Mapping.add_module module_name`を呼ぶ（`:439`）。これは述語`def #{m}?; modules.include?(:#{m}); end`を`class_eval`する
   （`lib/devise/mapping.rb:113-119`）。

   `devise(*modules)`（`lib/devise/models.rb:79-112`）はシンボルを`Devise::ALL.index(s)`でソートする（`:83`）。各`m`について
   `mod = Devise::Models.const_get(m.to_s.classify)`を実行する（`:91`）。
   `mod::ClassMethods`が存在すれば`extend`する（`:93-95`）。マッチする
   `available_configs`セッターを適用する（`:97-103`）。`include mod`を呼ぶ（`:106`）。

   `devise_for :users`は`Devise.add_mapping(:users, options)`を呼ぶ
   （`lib/devise/rails/routes.rb:242`）→`Devise::Mapping.new(:users, …)`が
   `@singular = :user`で生成される（`mapping.rb:56`）→登録された各ヘルパーホストが
   `define_helpers(mapping)`を得る（`lib/devise.rb:368`）。`define_helpers`は
   `<<-METHODS`ヒアドキュメントを`Devise::Controllers::Helpers`に対して`class_eval`する（`helpers.rb:116-134`）。

3. **生成されるもの** — `User`に対する`devise :database_authenticatable, :recoverable`の場合: `include Devise::Models::Authenticatable`（常に）
   `+ Devise::Models::DatabaseAuthenticatable + Devise::Models::Recoverable`
   に加えて、各モジュールの`included do`本体（例: `attr_reader :password`、
   `after_update :send_email_changed_notification`、
   `lib/devise/models/database_authenticatable.rb:34-40`）、インスタンスメソッド（`password=`、`valid_password?`、…）、`ClassMethods`（例: `Recoverable.reset_password_by_token`）。

   `devise_for :users`の場合: すべてのコントローラに`mapping.name`によってパラメータ化された**4つ**のメソッドが着地する: `authenticate_user!`、`user_signed_in?`、`current_user`、`user_session`。

4. **静的展開可能性** — 4つの正準な障害物すべてが現実である:
   - シンボル→`String#classify`経由の定数は機械的である（復元可能）。
   - `class_eval <<-METHODS`文字列は`#{mapping}` / `#{m}`を補間する — マッピング名がわかれば決定論的。
   - `Devise.mappings`は`devise_for :users`が実行されたときのみ追加される。ヘルパー名の集合を知るためには`config/routes.rb`を嗅ぎ取る必要がある。
   - インクルード順序は`Devise::ALL.index(s)`でソートされる — 安定しており、`lib/devise/modules.rb`をミラーするプラグインテーブルに焼き込める。
   - `ActiveSupport::Concern.included do`ブロックはターゲットクラスでリプレイされなければならない。`extend ClassMethods`はクラスレベルメソッドを追加する。
     `send(:"#{config}=", value)`はオプションからクラス状態をさらに変異させる。

5. **もっとも近い類似物** — **PHPStanのトレイトインライン展開＋同梱レジストリ**。Lispマクロではない — 呼び出し箇所（`devise :database_authenticatable, …`）は*テーブル駆動のincludeシーケンス*であり、その入力（シンボルリスト、
   `Devise::ALL`の順序）と出力（具体的な`Module`定数
   ＋`included do`の副作用＋`ClassMethods`拡張）は`lib/devise/modules.rb`をミラーするレジストリから静的に解決可能である。
   `rigor-devise`プラグインは以下を必要とする: （1）その同梱レジストリ、（2）`devise :a, :b, …`のモデル側ウォーカー、（3）`mapping.singular`によってパラメータ化された4つのメソッド定義を合成する`devise_for :foo`のルート側ウォーカー、（4）ユニオンリソースヘルパーの場合のための`devise_group`ウォーカー。マクロ入力がリテラルなシンボルである場合、Ruby実行は不要。ユーザーのイニシャライザからのサードパーティの`Devise.add_module`呼び出しは同梱レジストリの外にある — イニシャライザウォーカーまたは手動の拡張APIが必要。

---

## GraphQL-Ruby

1. **DSL**
   ```ruby
   class Types::User < GraphQL::Schema::Object
     field :name, String, null: false
     field :display_name, String, null: false do
       argument :upcase, Boolean, required: false
     end
     def display_name(upcase: false); … end
   end

   class Types::Status < GraphQL::Schema::Enum
     value "ACTIVE"
     value "DISABLED", value: :off
   end
   ```

2. **メカニズム** — `HasFields#field`は**純粋なメタデータレコーダー**である。`Schema::Field`を構築し（`lib/graphql/schema/member/has_fields.rb:89`）、`own_fields`に格納する（`:124-135`）。`Field#initialize`は`@resolver_method = (resolver_method || name_s).to_sym`を記録する
   （`lib/graphql/schema/field.rb:270`）。**field.rbには`define_method` / `class_eval` / `module_eval`呼び出しは1つもない**。

   解決は完全にランタイム動的である。`Field#resolve`は次のように振る舞う:
   `if obj.respond_to?(resolver_method) … obj.public_send(resolver_method, **ruby_kwargs)`
   （`field.rb:757-765`）。これに該当しない場合はHashルックアップまたは`@fallback_value`にフォールスルーする。

3. **生成されるもの** — graphql-rubyは`Types::User`に`define_method :display_name`を**しない**。ユーザーが手動で定義する（ドキュメントは`conflict_field_name_warning`、`has_fields.rb:318`で警告する）。自動定義されるメソッドは次のみ:
   - `HasFields#global_id_field`→`define_method(field_name)`
     （`has_fields.rb:154`）。
   - `Enum.generate_value_method`→`define_singleton_method`
     （`enum.rb:259`）、`value_methods(true)` / `value_method:`によってオプトイン。
   - `InputObject`の引数リーダー（`input_object.rb:304`）。
   - `BuildFromDefinition`（SDL→クラス）→`owner.define_method`
     （`build_from_definition.rb:538`）。

4. **静的展開可能性** — 重い障害:
   - **型表現は多態的なブラックボックスである**。`Member::BuildType.parse_type`
     （`build_type.rb:12-97`）は`String`（"User"、"[User]!"）、`Array`、
     `Class`、`Module`、`LateBoundType`、`NonNull` / `List`ラッパー、そして`Proc`を受け付ける（`:75-76`はprocを呼ぶ）。procと文字列定数化はスキーマを実行しない限り静的解決を打ち破る。
   - **インラインするためのメソッド発行はない**。DSLは型にRubyメソッドを追加しない。追加するのはランタイムにしか存在しないGraphQLスキーマグラフである。
   - **`resolver:` / `mutation:`**は別のクラスにディスパッチをリルートする
     （`has_fields.rb:62-65`）。
   - **コネクションラッピング**は名前駆動の遅延バインディングである
     （`field.rb:127`、`:124`）。
   - **ブロック形式のフィールド**は`Field`インスタンス上で`instance_exec`される（`field.rb:380-388`）。

5. **もっとも近い類似物** — **Lispマクロでもなく、PHPStanトレイトでもない**。
   展開すべきRubyメソッドが存在しない — DSLはスキーマグラフレコーダーである。
   フィールドリーダー／呼び出し箇所に有用な型を与えるために、rigorは**スキーマ解決パス**を必要とする（`Schema::Member`走査を再実装するか、あるいは実際にスキーマを`require`して`Schema.types`を読む）。もっとも近い比較対象はGraphQL自身のスキーマロードフェーズである。純粋なASTレベルのマクロ展開は実行不能である。なぜなら`Proc`の遅延型と`String`の定数化参照が第一級だからである。リゾルバメソッド自体は普通のRubyである。スキーマグラフが存在すれば、戻り値型のアサーションは`@rbs`オーバーライドとして表現できるが、どのメソッドがどの戻り値型を持つかの*発見*は完全なスキーマ評価であり、マクロ展開ではない。

---

## factory_bot

1. **DSL**
   ```ruby
   FactoryBot.define do
     factory :user do
       name { "Alice" }
       sequence(:email) { |n| "user#{n}@example.com" }
       association :account
       trait :admin do
         role { "admin" }
       end
     end
     factory :admin_user, class: User, parent: :user do
       role { "admin" }
     end
   end

   FactoryBot.create(:user, :admin, name: "Bob")    # => User
   FactoryBot.build(:user)                           # => User
   FactoryBot.build_stubbed(:user)                   # => User
   FactoryBot.attributes_for(:user)                  # => Hash
   FactoryBot.create_list(:user, 3)                  # => Array[User]
   ```

2. **メカニズム** — `FactoryBot.define { … }`
   （`lib/factory_bot/syntax/default.rb:6-8`）はブロックを`DSL.run`に渡す。これは新しい`DSL`上で`instance_eval`する（`syntax/default.rb:36-38`）。
   `factory(name, opts, &block)`（`:15-26`）は`Factory.new(name, options)`を構築し
   （`factory.rb:9-18`）、それを`DefinitionProxy`でラップし、プロキシ上でブロックを`instance_eval`してから`Internal.register_factory`経由で登録する
   （`internal.rb:79-84`）。属性行（`name { "Alice" }`）は
   `DefinitionProxy#method_missing`に到達し（`definition_proxy.rb:91-104`）、`__declare_attribute__`にルーティングされる（`:247-254`）。

   `FactoryBot.create / build / build_stubbed / attributes_for`は`Syntax::Methods`内に静的に定義されてい**ない** — ロード時に`define_method`によってインストールされる。`Internal.register_default_strategies`
   （`internal.rb:99-105`）は`StrategySyntaxMethodRegistrar`を呼ぶ。これは`FactoryBot::Syntax::Methods`に対して`define_method`を`module_exec`する
   （`strategy_syntax_method_registrar.rb:55-63`）。`_list` / `_pair`バリアントは単数形を`Array.new(amount) { … }`でラップする（`:35-52`）。

3. **生成されるもの** — ユーザーのモデルクラスには*何も*生成されない。生成されるのは2つ:
   - **シンボルでキー付けされたレジストリ内のファクトリー定義**。
     `Factory#build_class`は`class_name.to_s.camelize.constantize`を介してターゲットクラスを遅延解決する。`class:`が指定されない場合は`name`をデフォルトとする（`factory.rb:24-32, 109-111`）。
   - **`FactoryBot::Syntax::Methods`上のトップレベルストラテジメソッド**:
     `build`、`create`、`attributes_for`、`build_stubbed`、加えて
     `_list` / `_pair`バリアント — 合計12のデフォルトメソッド。戻り値の階梯:
     - `Strategy::Build#result` / `Create#result` / `Stub#result`→
       `build_class`のインスタンス。
     - `Strategy::AttributesFor#result`→`Hash`。
     - `_list`→`Array[T]`、`_pair`→サイズ2の`Array[T]`。

4. **静的展開可能性** — `create(:user)`に型を付けるには3つの材料で十分:
   1. **ファクトリー名→モデルクラスのマップ**。
      `FactoryBot.define { factory :foo[, class: Bar][, parent: :baz] … }`ブロックを歩く。戻り値型の問いに対してブロック本体の評価は不要。
      `class:`はリテラル。指定がなければ`name.to_s.camelize.constantize`。
      `parent:`はクラス継承を連鎖させる。
   2. **ストラテジメソッド→戻り値の形のテーブル**。ハードコード: `build/create/build_stubbed`
      →モデルクラス、`attributes_for`→`Hash`、`*_list`→`Array[T]`、
      `*_pair`→サイズ2の`Array[T]`。
   3. **トレイト名は戻り値型に無関係**。呼び出し箇所での属性カバレッジをゲートするだけで、クラスはゲートしない。

   ランタイムを必要とするもの: `FactoryBot.modify`、`define`の外での動的登録、ユーザー登録のカスタムストラテジ、インスタンス化セマンティクスを変える`to_create` /
   `initialize_with`ブロック（`factory.rb:140-146`）。

5. **もっとも近い類似物** — **PHPStanスタイルの「リテラルなシンボル引数から戻り値型が計算される汎用メソッド」**。Railsの`find_by_*`ファミリーやPHPStanの`DynamicMethodReturnTypeExtension`と同じ形である。Lisp／PHPStanトレイトの意味でのマクロ展開では**ない** — factory_botは`User`上にメソッドを生成しないので、ユーザークラスの呼び出し箇所でインラインするものがない。モデルは「ブート時に1回のレジストリウォーク＋ストラテジメソッドごとに1つの戻り値型ルール（最初のシンボル引数をキーとする）」である。
   rigorはすでに`plugins/rigor-factorybot/`に正しいフックを持っている。マクロ機構なしで到達可能な拡張には、`*_list` / `*_pair`のラッピング、`parent:`チェーンの解決、`aliases:`登録、トレイト名のバリデーションが含まれる。

---

## Sinatra

1. **DSL**
   ```ruby
   # classic
   require 'sinatra'
   get '/hello' do
     "Hello #{params['name']}"
   end

   # modular
   class MyApp < Sinatra::Base
     get '/hello' do
       "Hello #{params['name']}"
     end
   end
   ```

2. **メカニズム** — `get`、`put`、`post`、`delete`、`head`、`options`、
   `patch`、`link`、`unlink`は`Sinatra::Base`のクラスメソッドである
   （`lib/sinatra/base.rb:1531-1553`）。それぞれ
   `route(verb, path, options, &block)`（`:1776-1782`）に転送する。これは
   `compile!`を呼ぶ（`:1795-1813`）。`compile!`の内部で、ブロックは
   `generate_method`によって本物のメソッドに変換される（`:1788-1793`）:

   ```ruby
   def generate_method(method_name, &block)
     define_method(method_name, &block)
     method = instance_method(method_name)
     remove_method method_name
     method
   end
   ```

   合成名は`"#{verb} #{path}"`、例えば`"GET /hello"`である。メソッドは*定義されてすぐ削除される*。`UnboundMethod`のみが保持され、後でリクエストごとに再バインドされる:
   `unbound_method.bind(a).call(...)`
   （`:1808-1810`）。classicモードのトップレベルの`get`は`Sinatra::Delegator`であり、`Sinatra::Application`に転送する（`:2101-2127`、`lib/sinatra/main.rb:52, 55`でミックスインされる）。

3. **生成されるもの** — `get '/hello' do … end`の場合: アプリクラスへの一時的な`define_method("GET /hello", &block)`が、`UnboundMethod`としてキャプチャされ、その後`remove_method`される。unboundメソッドはラッパーprocの中に保存され、`@routes['GET']`に`[pattern, conditions, wrapper]`として追加される。ブロックはリクエストごとに新しいアプリインスタンスにバインドされて実行される。`params`、`request`、`response`、`env`、`app`は`Sinatra::Base`インスタンスの`attr_accessor`である（`:978`）。ヘルパー
   （`erb`、`redirect`、`halt`、`session`）は普通の`Sinatra::Base`のインスタンスメソッドである。

4. **静的展開可能性** — 非常に扱いやすい。ブロック本体は手を加えていないRubyである。内部の`self`はアプリクラスのインスタンスである。機械的な展開: `class X < Sinatra::Base`内の任意の`<verb>(path, opts = {}, &block)`を、ブロック本体をインライン化し`self`を`X`として型付けした、`X`上の合成プライベートインスタンスメソッドとして扱う。`Sinatra::Base`のインスタンスメソッド表面をスコープに注入する。classicモードのトップレベルでは、`Sinatra::Delegator`を認識し、剥き出しの`get`を`Sinatra::Application.get`として扱う必要もある。

5. **もっとも近い類似物** — RubyのDSL動物園でもっともきれいなケース: **ブロックがすでにメソッド本体である、バイトごとに**。Lispマクロ（構文を書き換える）やPHPStanのトレイトインライン（ASTをコピーする）と異なり、Sinatraは書き換えを必要としない — `generate_method`は文字通り`define_method(name, &block)`である。
   アナライザーが「このブロックは`Sinatra::Base`のインスタンスメソッドとして実行される」と受け入れれば、展開は不要である。

---

## Sequel

1. **DSL**
   ```ruby
   class User < Sequel::Model        # implicit table :users + DB schema lookup
     one_to_many :posts
     many_to_one :account
     many_to_many :groups
   end

   User.plugin :timestamps, update_on_create: true
   User.plugin :validation_helpers

   user = User[1]
   user.name           # column accessor — synthesised from DB schema
   user.posts          # association accessor
   user.add_post(p)
   ```

2. **メカニズム — ライブデータベース駆動のカラムアクセサ**。
   `Sequel::Model.inherited`は`subclass.set_dataset(subclass.implicit_table_name)`をパース時に呼ぶ
   （`lib/sequel/model/base.rb:987`）。`set_dataset`はその後`@db_schema = get_db_schema`を呼ぶ（`:634`）。
   `get_db_schema`は本物のスキーマパースクエリを発行し（`:901`、"if db.supports_schema_parsing?"）、結果のカラムを
   `def_column_accessor(*schema_hash.keys)`に供給する（`:918`）。
   各カラムは
   `overridable_methods_module.module_eval("def #{column}; self[:#{column}] end", …)`
   によって発行される（`:797-801`）。識別子でないカラム名のための低速パスのブロックベースのフォールバックもある（`def_bad_column_accessor`、`:772-785`）。

   **ActiveRecordとの違い**。ARはアクセサを最初のアクセス時に`method_missing` /
   `define_attribute_methods`で遅延的に定義し、`db/schema.rb`（マイグレーション時に書かれるRubyソースファイル）にスキーマをキャッシュする。Sequelには素のSequelに**ディスクにコミットされる同等のスキーマアーティファクトはない** — クラスロード時にDDLプローブを行い、`def_column_accessor`を同期的に実行する。

3. **関連付けに対して生成されるもの**（`lib/sequel/model/associations.rb:2238-2285`）:
   - `one_to_many :posts`（または`many_to_many`）: `returns_array?`がtrueなので、メソッド名テーブル（`:2243-2249`）は`posts`、`posts_dataset`、
     `_add_post`、`add_post`、`_remove_post`、`remove_post`、`_remove_all_posts`、
     `remove_all_posts`を生成する。`:2243`での`singularize(opts[:name])`による単数形化。
   - `many_to_one :account`: 単数分岐（`:2250-2253`）は
     `_account=` / `account=` + `account`と`account_dataset`を追加する。writableでない限りadd/remove/clearはない。

   すべてのメソッドは`association_module_def`によってインストールされる。これは
   `mod.send(:define_method, name, &block); mod.send(:alias_method, name, name)`を呼ぶ
   （`:2198-2202`）。受け取るモジュールはデフォルトで`overridable_methods_module`である。

4. **静的展開可能性**:
   - **DBスキーマ依存**。カラムアクセサはライブの`get_db_schema_array`呼び出しの後にのみ存在する。静的アナライザーはユーザー供給のDDL、データベース発行の`DESCRIBE`、あるいはマイグレーションから推論されたソースのいずれかを消費しなければならない。素のSequelには正準な静的スキーマソースはない。
   - **プラグインのシーケンシングは順序依存かつ副作用的である**。
     `Model.plugin`（`base.rb:496-520`）は`apply`を1回実行し、その後`extend
     ClassMethods`、`include InstanceMethods`、`dataset_extend(DatasetMethods)`を行い、呼び出しごとに`configure`を実行する。プラグインは`apply` / `configure`の内部からさらに`define_method` /
     `class_eval`を追加することがある。静的展開には、単純な名前→メソッドテーブルではなく、プラグインリプレイエンジンが必要。
   - **関連付け名は動的でありうる。オプションがメソッドをリネームできる**。
     `:methods_module`はメソッドが着地する場所をオーバーライドする（`:2192`）。単数／複数形の名前は`singularize`から派生する。
   - **計算された本体を持つ`class_eval`文字列**が
     `def_initialize_nil_instance_variables`（`base.rb:858-865`）、
     `def_model_dataset_method`（`:825-828`）、
     `Plugins.def_dataset_methods`（`plugins.rb:31-37`）で使われている。これらを発行するにはSequelと同じロジックを実行する必要がある。
   - **`Plugins.def_sequel_method`は一意のメソッド名を作り出す**
     （`plugins.rb:73-75, 92-138`） — 展開時のカウンタ状態は観察不能だが、メソッドはプライベートな呼び出し先のみ。

5. **もっとも近い類似物** — **ハイブリッド: 関連付けレイヤーはPHPStanのトレイトスタイル＋カラムレイヤーはスキーマソース依存＋プラグインリプレイエンジン**。
   - `one_to_many` / `many_to_one` / `many_to_many`はトレイトインライン展開スタイル: 固定テーブルからの名前駆動メソッド合成、機械的に展開可能。
   - カラムアクセサは純粋なマクロではない — スキーマオラクルを必要とする（PHPStanのPDOリフレクション拡張、または`kphp`の`.sql`取り込みにもっとも近い）。ADR-10スタイルのオプトイン推論は役に立たない。カラムはRubyの外、no-RBS依存の中ではなく、Rubyの外に存在するからである。
   - プラグインシステムは「副作用的なapplyフックを持つトレイトインライン展開」にもっとも近い — モジュールは静的に既知だが、`apply` / `configure`ブロックはアナライザーがシンボリックに実行するか、宣言的にモデル化する必要のあるランタイムデータを運ぶ。

   小さな「Sequel関連付け」プラグインは関連付けDSLをきれいに展開できる。
   完全なSequelチェッカーには次が必要: （a）スキーマソースアダプタ — おそらく
   `Sequel::Database#schema`ダンプ、ユーザーが指定する`schema.rb`相当物、あるいはマイグレーション走査 — そして（b）プラグインリプレイサブシステム。

---

## Redmine（ERBで構築されたRuby）

### 1. 具体的な箇所

| # | 箇所（path:line） | パターン |
| --- | --- | --- |
| A | `lib/redmine/views/labelled_form_builder.rb:25-33` | ヒアドキュメント＋補間されるリテラルリスト（`field_helpers - blocklist + %w(date_selec)`） |
| B | `lib/plugins/acts_as_event/lib/acts_as_event.rb:48-62` | ヒアドキュメント＋リテラル`%w(datetime title description author type)` |
| C | `app/models/setting.rb:333-350` | 設定名でパラメータ化されたヒアドキュメント。名前は`config/settings.yml`＋`Redmine::Plugin.all`から来る |
| D | `app/models/user.rb:30, 293-303` | `eval('"' + f[:string] + '"')`。`f[:string]`は`USER_FORMATS`内のリテラル値 |
| E | `app/models/webhook_payload.rb:71` | `instance_eval(File.read(Rails.root.join(path)), path, 1)` |
| F | `lib/redmine/plugin.rb:69-77` | `def_field` — リテラルシンボルリストに対するブロック形式の`class_eval do … define_method` |
| G | `lib/redmine/nested_set/traversing.rb:23-28` | includerのスコープを再オープンするブロック形式の`class_eval`（文字列ヒアドキュメントなし） |

代表的な例 — 箇所C:
```ruby
def self.define_setting(name, options={})
  available_settings[name.to_s] = options
  src = <<~END_SRC
    def self.#{name}
      self[:#{name}]
    end
    def self.#{name}?
      self[:#{name}].to_i > 0
    end
    def self.#{name}=(value)
      self[:#{name}] = value
    end
  END_SRC
  class_eval src, __FILE__, __LINE__
end
# … later …
load_available_settings   # iterates YAML.load_file('config/settings.yml')
load_plugin_settings      # iterates Redmine::Plugin.all
```

### 2. パターン分類

| パターン | 箇所 | 説明 |
| --- | --- | --- |
| （a）静的テキストヒアドキュメント、補間なし | なし — Redmineのすべてのヒアドキュメントは少なくともメソッド名を補間する |
| （b）ソース可視リテラルを補間するヒアドキュメント | A, B |
| （b′）ファイル駆動リテラルを補間するヒアドキュメント | C |
| （b″）リテラルシンボルリストのブロック形式`class_eval`＋`define_method` | F |
| （b‴）ブロック形式`class_eval`（文字列なし）、includerを再オープン | G |
| （c）外部ファイルからロードされたコードのeval | E |
| （d）ランタイムデータと連結された文字列のeval | 厳密な意味では存在しない — Dのテンプレート文字列はソース可視リテラルであり、ランタイムキーによって選択されるだけ |

### 3. プラグインローダー

`Redmine::PluginLoader`（`lib/redmine/plugin_loader.rb:30-32`）は
`<plugin>/init.rb`を**`load`**でロードする。`instance_eval`ではない — したがってプラグインの`init.rb`内の`self`は`main`であり、`require`されたスクリプトと同じ。

`instance_eval`はもう1段階深いところ、`Redmine::Plugin.register`の内部に存在する
（`lib/redmine/plugin.rb:93-95`）:
```ruby
def self.register(id, &)
  p = new(id)
  p.instance_eval(&)
  …
end
```
`Redmine::Plugin.register :foo do … end`の内部では、`self`は新しい
`Redmine::Plugin`インスタンスである。barewords（`name 'X'`、`author 'Y'`、
`settings :default => {…}`）は`def_field`生成のアクセサに到達する（箇所F）。
`:381-385`にある2番目の`instance_eval`は
`project_module name do … end`の下にネストする — `self`はプラグインインスタンスのまま、`@project_module`はブロック内の`permission`呼び出しのためのサイドチャネルとしてセットされる。

### 4. 箇所ごとの静的展開可能性

- **A** — 展開可能。ソース可視の`%w(...)`集合演算。ただし
  `field_helpers`は
  `ActionView::Helpers::FormBuilder.field_helpers`（上流の定数）から来る。
  そのリスト（Railsバージョンごとに安定）を解決し、約12個の
  `def text_field/email_field/…`スタブを発行する。
- **B** — 完全に展開可能。5つのリテラルシンボル→5つの
  `def event_datetime / event_title / event_description / event_author /
  event_type`が同じ式を返す。
- **C** — アナライザーが`config/settings.yml`（約70の設定キー）を読み、
  `Redmine::Plugin.register :id do settings :default => {...} end`ブロックを歩く場合にのみ展開可能。
  各`name`は3つのクラスメソッド（`name`、`name?`、`name=`）を生成する。
  形は静的に既知だが、キーの*集合*はYAMLとプラグインのinit.rbファイルを読む必要がある。これはユーザーの
  「activesupport-core-ext＋プロジェクト側のmonkey-patch事前評価」メモが記述するケースである。
- **D** — *見かけ上*扱えないが、実際は（b′）である: `USER_FORMATS`はソース可視の定数で、その`:string` / `:initials`値は静的なテンプレート文字列である。マクロ展開器は`eval('"' + f[:string] + '"')`を9個のテンプレートに渡る`String`の∨に変えられる。その特例なしでは、`Dynamic[String]`を発行する。
- **E** — パターン（c）。設定されたパスでwebhook payloadの`.rb`テンプレートを読む必要がある。`self`は呼び出し側によって`@`ivarが注入された`WebhookPayload`インスタンスである。アナライザーがpayloadテンプレートディレクトリを追加のソースルートとして扱う場合、扱える（PHPStanのスタブファイルパターン）。
- **F** — リテラルシンボル引数でのブロック形式`class_eval`＋`define_method`。自明に展開可能: 各名前にgetter/setterのペアを発行する（セマンティクスは`attr_accessor`と異なる）。
- **G** — includerのスコープを再オープンするブロック形式`class_eval`。文字列evalではない。標準の`included`フック。

### 5. もっとも近い類似物

- A, B, F, G→ソース可視のリテラルリストに対する**Lispの`defmacro`**。展開器にとって無料の勝利。
- C→**PHPStanのクラスごとの生成スタブ**（レジストリをスキャンしメソッド宣言を発行する拡張）。展開器コードLOCあたりの最大のペイオフ: 約70＋N（プラグイン）のアクセサトリプレットをカバーする。
- D→`USER_FORMATS`がマクロテーブルとして認識されれば、これも`defmacro`風。
- E→**PHPStanのスタブファイルパターン**（`instance_eval`セマンティクス下で呼び出し箇所にペーストされたかのように外部の`.rb`をパースする）。

**Redmineのどの箇所も真に扱えないパターン（d）に達していない**。すべての
`class_eval` / `eval`箇所は、ソース可視リテラルか、1つの間接参照（YAML、プラグインレジストリ、兄弟定数）で到達可能な値を補間する。既存のメモにあるマクロテンプレート＋ヒアドキュメントRubyの方向性を裏付ける: 「リテラルリスト反復ヒアドキュメント」＋「リテラルキーHashテーブルeval」＋「宣言された`self`コンテキストを持つ外部Rubyファイルeval」を扱うRedmine向け展開器は、コードベース内のメタプログラム化されたメソッドのほぼすべてを回収する。

---

## dry-types

1. **DSL**
   ```ruby
   module Types
     include Dry.Types()   # imports Types::String, Types::Integer, ...
   end

   StrippedString = Dry::Types['string'].constructor { |s| s.strip }
   Email          = Dry::Types['string'].constrained(format: /@/)
   NilableInt     = Dry::Types['integer'].optional  # Sum of nil | integer
   ```

2. **メカニズム** — `Dry.Types(...)`は新しい`Dry::Types::Module`インスタンスを返す（`lib/dry/types.rb:252-254`）。`Dry::Types::Module < ::Module`なので、`include`は普通のRubyのincludeである。`Module#initialize`
   （`lib/dry/types/module.rb:20-37`）は`Dry::Types.container`の**フラットレジストリキー**（`"strict.string"`、`"coercible.hash"`、…）を
   `registry_tree`によってネストした定数ツリーに投影する
   （`module.rb:74-84`）。その後ツリーを歩いて`define_constants`が各リーフに対して`mod.const_set(name, value)`を呼ぶ
   （`module.rb:109-124`）。レジストリは`lib/dry/types/core.rb`によって**gemロード時に1回**追加される: 4つのループが
   `ALL_PRIMITIVES` / `KERNEL_COERCIBLE` / `METHOD_COERCIBLE` /
   `NON_NIL`（`core.rb:6-46`のリテラル凍結Hash）を反復し、
   `register("nominal.string", …)`などを呼ぶ（`core.rb:49-99`）。

   `Dry::Types[name]`（`lib/dry/types.rb:114-141`）は呼び出し箇所でパースされる1回の再帰を持つランタイムルックアップである: `"array<string>"`文字列は`TYPE_SPEC_REGEX`で分割され、
   `container[type_id].of(self[member_id])`を介して再ルーティングされる。合成演算子は`Dry::Types::Builder`に存在する（`lib/dry/types/builder.rb`）:
   `|`→`Sum`（`:28`）、`&`→`Intersection`（`:37`）、`>`→
   `Implication`（`:46`）、`.optional`→`nil | self`（`:53-62`）、
   `.constrained`→`Constrained.new`（`:71-73`）。メソッド呼び出しの強制変換関数自体は
   `lib/dry/types/constructor/function.rb:63-75`内の`module_eval(<<~RUBY, …)`で構築される — リテラルな強制変換メソッド名を補間するヒアドキュメント。

3. **生成されるもの** — デフォルトの`:strict`での`include Dry.Types()`の場合:
   - includer上の定数: `String`、`Integer`、`Float`、
     `Decimal`、`Array`、`Hash`、`Symbol`、`Nil`、`Class`、`True`、
     `False`、`Bool`、`Date`、`DateTime`、`Time`、`Range`、`Any`。
     それぞれ`Dry::Types::Constrained`キャリアである（`core.rb:55-59`）。
   - レジストリのドット区切りプレフィックスをミラーする名前空間サブモジュール:
     `Strict::Integer`、`Nominal::Integer`、`Coercible::Integer`、
     `Optional::Strict::Integer`、`Params::Integer`、`JSON::Integer`、
     など — `container.keys`の正確な投影（`module.rb:74-84`）。
   - `BuilderMethods`がincluderにextendされる（`module.rb:25` +
     `builder_methods.rb:11-14`）: モジュールメソッド`Array(type)`、
     `Hash(type_map)`、`Instance(klass)`、`Strict(klass)`、
     `Value(v)`、`Constant(v)`、`Constructor(klass, &)`、
     `Nominal(klass)`、`Map(k, v)`、`Interface(*methods)`。
   - ユーザークラス上のインスタンスメソッドはない。すべては定数形状のデータである。

4. **静的展開可能性** — 扱える:
   - 定数集合は**レジストリのリテラルキーリストの純粋関数**であり、レジストリの内容は`core.rb`の凍結Hashからgemロード時に計算される。プラグインはそれらのHashをミラーする同梱レジストリを出荷できる（`rigor-devise`が`lib/devise/modules.rb`をミラーするのと同じ形）。
   - 各定数は既知のキャリア形状にバインドされる
     （`Types::Integer`の場合は`Constrained<Nominal<Integer>>`など）。
   - `Dry.Types(:strict, default: :coercible)`のチェリーピッキングと
     `Dry.Types(coercible: :Kernel)`のエイリアスkwargsはAST可視である。
   - `Dry::Types["integer"]`は**動的戻り値型拡張**にフィットする
     （ADR-2、factory_botの形） — 基盤*ではない*。
   - `Dry::Types[String]`（Class引数）と`Dry::Types["array<string>"]`
     （正規表現パースされたネスト形式）は追加のリゾルバルールを必要とする。
   - エッジケース: `.constructor { |x| … }`は出力型が本体に依存する`Proc`を受け付ける — フォールバックは`Dynamic[T]`。
   - `.optional` / `|` / `&` / `>` / `.constrained`はキャリアを代数的に合成する — 静的評価器は格子代数を実装しなければならない（すでにrigorのロードマップ上）。
   - `.define_builder(:or_nil)`（`lib/dry/types.rb:196-200`）は
     `Builder.define_method(method, …)`をランタイムに行う — ソース可視のリテラルシンボル、追跡可能。

5. **もっとも近い類似物** — **`Dry::Types[...]`に対するPHPStanの`DynamicMethodReturnTypeExtension`（レジストリ＋シンボル→型ルックアップ）、加えて`Dry.Types()`定数のためのTier C風合成定数発行**。後者はヒアドキュメントテンプレートではない（includer上で`class_eval`文字列は実行されない — `const_set`が直接使われる）が、プラグイン作者の視点からは形は同一である: 名前の固定レジストリが固定キャリア形状にマップする。
   `(constant_name, namespace, primitive, carrier_shape)`の行を列挙する`Tier-C-as-const_set`宣言がそれを捉える。

---

## dry-schema

1. **DSL**
   ```ruby
   UserSchema = Dry::Schema.Params do
     required(:email).filled(:string)
     required(:age).value(:integer, gt?: 0)
     optional(:tags).value(:array).each(:string)
   end

   UserSchema.(email: "a@b", age: 21)   # => Dry::Schema::Result
   ```

2. **メカニズム** — `Dry::Schema.Params(&)`は
   `define(processor_type: Params, &)`である（`lib/dry/schema.rb:86-89`）。
   `define(...)`は文字通り`DSL.new(...).call`である（`lib/dry/schema.rb:67-69`）。
   `DSL.new`（`lib/dry/schema/dsl.rb:81-86`）は`super`を呼び
   （Dry::Initializer）、その後`dsl.instance_eval(&)`を呼ぶ。**ブロックは`Dry::Schema::DSL`インスタンス上のインスタンスメソッドとして実行される** —
   `required` / `optional` / `key` / `before` / `after` / `array`は
   `DSL`の本物のインスタンスメソッドである（`dsl.rb:144-188`）。

   `required(:email)`→`key(:email, macro: Macros::Required)`
   （`dsl.rb:144-146`）は`Macros::Required`を構築し、`set_type`で`:email`のプレースホルダー型として`Types::Any`を保存し
   （`dsl.rb:176, 316-321`）、マクロを`@macros`にプッシュする
   （`dsl.rb:186-187`）。`.filled(:string)`は`Macros::DSL#filled`
   （`lib/dry/schema/macros/dsl.rb:80-86`）である。これは
   `extract_type_spec(args)`（`macros/dsl.rb:222-257`）→
   `schema_dsl.resolve_type(:string)`（`dsl.rb:339-346`）→
   `type_registry[:string]`→`TypeRegistry#[]`（`type_registry.rb:37-41`）
   →`Dry::Types["strict.string"]`を呼ぶ。解決された型は
   `schema_dsl.set_type(name, resolved_type)`で記録され、
   `Macros::Filled`が`append_macro`で追加される
   （`macros/dsl.rb:205-216`）。

   `dsl.call`（`dsl.rb:195-207`）は**終端ビルダー**である: 
   `parents.steps`を収集し、`key_validator`、`key_coercer`、
   `value_coercer`、`rule_applier`を構築し、
   `processor_type.new(schema_dsl: self, steps: result_steps)`を生成する。返されるオブジェクトがスキーマである — `#call(input)`を持つ`Dry::Schema::Processor`インスタンス（`processor.rb:77-80`）。
   `Macros::Value#method_missing`（`macros/value.rb:115-121`）は
   `?`で終わる任意のシンボル（例: `min_size?`）をキャッチして`trace`に転送する — 述語はユーザーソース内の*剥き出しのbareword symbol*である。

3. **生成されるもの** — **ユーザーのクラス上には`define_method`されたものは何もない**。`UserSchema`は`Dry::Schema::Params`インスタンスへのローカルバインディングである。最終的な成果物:
   - `@steps`、`@schema_dsl`、内部`key_map`、`key_coercer`、
     `value_coercer`、`rule_applier`を保持する`Dry::Schema::Processor`インスタンス（`processor.rb:15`）。`schema.(input)`として呼び出し可能で、`Dry::Schema::Result`を返す。
   - `@types`から派生した`[:email, :age, :tags]`を列挙する`KeyMap`（`dsl.rb:408-417`）。
   - キーごとの型割り当てを運ぶ`Dry::Types::Schema`（**strict_type_schema**、`dsl.rb:295-297`）。
   - クラス形式（`class UserSchema < Dry::Schema::Params; define do …
     end; end`）は`@definition`をクラスに保存し（`processor.rb:46-50`）、`UserSchema.new`は構築されたプロセッサを返す（`processor.rb:57-67`）。

4. **静的展開可能性** — 混合:
   - **述語名はリテラルなSymbolである**。`required(:email).filled(:string)`は完全にリテラルである。`:string`は`TypeRegistry`
     →`Dry::Types[…]`を介して解決される。レジストリ名前空間（`define`の場合は`:strict`、`Params`の場合は`:params`、`JSON`の場合は`:json`）は`Dry::Schema`上の呼び出し箇所のメソッド名によって決定される。すべてソース可視。
   - **ブロックの戻り値は`Dry::Schema::Processor`である**（あるいはそのサブクラス）。内容に関わらず — 自明に型付け可能。
   - **`schema.(input)`は`Dry::Schema::Result`を返す**。その`#to_h`の形はキーマップである。キー集合は静的に
     `required(:key)` / `optional(:key)`の位置から抽出可能。キーごとの型は対応する
     `.value(:type)` / `.filled(:type)` / `.maybe(:type)`引数から。
     これは`rigor-factorybot`が定義側で使っている「ASTレコーダー」と同じ形である。
   - **ブロックは`DSL`インスタンス上で`instance_eval`される**
     （`dsl.rb:83`）。基盤のTier Aが適用される: `self : Dry::Schema::DSL`とbareword表面
     （`required`、`optional`、`key`、`before`、`after`、`array`）を宣言する。
   - **`.filled { … }` / `.value { array? | str? }`**は
     `Dry::Logic::Operators`と`method_missing`を使う
     （`macros/value.rb:115-121`）。ブロック本体は再度、新しいマクロ`Core`上で`instance_exec`される — Tier Aのネスト。
   - 真に動的なもの: `required(:name).value(SomeCustomType)`であって、`SomeCustomType`が`Dry::Types::Type`インスタンスの場合（同じ
     `resolve_type`パス）、`array(:string).filled(min_size?: 2)`の述語演算子チェーン、ブロック内の`Dry::Logic`述語合成（`array? | str?`）は演算子オーバーロード追跡を必要とする。

5. **もっとも近い類似物** — **ハイブリッド: ルールトレースレベルでのスキーマグラフレコーダー（graphql-ruby風）＋`Dry::Schema.Params { … }.call(input)`に対するPHPStanの動的戻り値型拡張**。graphql-rubyと異なり、ブロック内容自体はキー集合＋キーごと型テーブルに静的に展開可能である。
   `rigor-dry-schema`プラグインは次を合成できる: 「スキーマプロセッサの
   `#call(input)`は`Result[T]`を返し、その`#to_h`は形
   `{email: String, age: Integer, …}`を持つ」。これはTier A（ブロックを`Dry::Schema::DSL`上の`instance_eval`として宣言）**プラス**、ブロック内の
   `required`/`optional`/`filled`/`value`/`maybe`/`each`/`array`を歩いてキーマップを構築するカスタム呼び出しレコーダーを必要とする。**ユーザーのクラスはどのtierもインライン展開しない** — 価値はスキーマ呼び出しの*戻り値の形*を型付けすることにある。

---

## dry-struct

1. **DSL**
   ```ruby
   class Address < Dry::Struct
     attribute :city,    Types::String
     attribute :country, Types::String.optional
     attribute? :postcode, Types::String    # omittable
     attribute :details do                  # nested struct
       attribute :building, Types::String
     end
   end

   a = Address.new(city: "Tokyo", country: "JP",
                   details: { building: "X" })
   a.city                # "Tokyo"
   a.details.building    # "X"
   a[:city]              # "Tokyo"
   a.to_h                # {city: "Tokyo", country: "JP",
                         #  details: {building: "X"}}
   ```

2. **メカニズム** — `Dry::Struct`は`ClassInterface`を拡張する
   （`lib/dry/struct.rb:87`）。継承するクラスは
   `attribute` / `attribute?` / `attributes` / `transform_types` /
   `transform_keys`をクラスメソッドとして継承する。`attribute(:city, Types::String)`
   （`lib/dry/struct/class_interface.rb:86-88`）は
   `attributes(city: build_type(:city, Types::String))`に委譲する。

   `attributes(new_schema)`（`class_interface.rb:173-189`）は3つのことを行う: (a)**スキーマ更新** —
   `schema schema.schema(new_schema)`は新しいキー／型ペアで補強された新しいスキーマでクラスレベルの`schema`（`Dry::Types::Hash::Schema`）を置き換える（`:177`）、（b）**アクセサ合成** —
   `define_accessors(keys)`（`:179`→`:452-464`）、（c）**継承の伝播** — 各サブクラスについて、再帰的に
   `d.attributes(inherited_attrs)`を呼ぶ（`:183-186`）。

   `define_accessors(keys)`はキーごとにgetterを発行する:
   ```ruby
   class_eval(<<-RUBY, __FILE__, __LINE__ + 1)
     def #{key}                       # def city
       @attributes[#{key.inspect}]    #   @attributes[:city]
     end
   RUBY
   ```
   識別子の形をしていない名前については`define_method(key) { @attributes[key] }`にフォールバックする（`:468`の`valid_method_name?`正規表現チェック）。

   `.new(city: "Tokyo", …)`（`class_interface.rb:239-258`）はクラスレベルの`schema.call_unsafe(attributes)`で強制変換し、`load(attributes)`→`allocate`＋`initialize(attributes)`を行う
   （`:279-283`）。ネストブロック形式（`attribute :details do …`）は
   `StructBuilder#call`を経由する
   （`lib/dry/struct/struct_builder.rb:18-42`）。これは
   `Class.new(parent_struct)`＋`class_exec(&block)`＋親クラスへの
   `const_set(:Details, new_type)`を行う。

3. **生成されるもの** — `class Address < Dry::Struct; attribute :city, Types::String; end`の場合:
   - **クラスレベルの状態**: `Address.schema`は
     `Dry::Types::Hash::Schema`であり、その`:city`キーは
     `Types::String`にマップする。`Address.attribute_names`は`[:city]`を返す
     （`class_interface.rb:357-359`）。
   - **インスタンスメソッド`Address#city`**: `class_eval`ヒアドキュメントによって合成される（`class_interface.rb:455-459`） — 
     `@attributes[:city]`を返す。戻り値型は属性の
     `Types::String`キャリアに従う⇒`String`。
   - **ライターなし** — `Dry::Struct`はイミュータブルである。リーダーのみ存在する（コピー＆オーバーライドのための`#new(changeset)`は`:202-211`にある）。
   - **`Address#[](key)`と`Address#to_h`**は`Dry::Struct`から継承される（`lib/dry/struct.rb:147-178`）。形はクラススキーマから派生した`{city: String}`である。
   - **`Address.new(city:)`**は型付きコンストラクタ
     （`class_interface.rb:239`）。
   - `attribute? :postcode, …`の場合: `required: false`の同じパス。アクセサ名は依然`postcode`（`?`は`:174`で取り除かれる）。
   - **ネストブロック形式**: `Address::Details`は`const_set`され
     （`struct_builder.rb:33`）、それ自身が`Dry::Struct`サブクラスである。親は`Address::Details`を返す`details`リーダーを得る。

4. **静的展開可能性** — 3つの中でもっともきれい:
   - **属性名はリテラルなSymbolである**。`class_interface.rb:455-459`の`class_eval`ヒアドキュメントは`#{key}`と`#{key.inspect}`を補間する。ADR-16のTier Cに直接フィットする。
   - **属性型**は`Dry::Types::Type`インスタンス
     （例: `Types::String`）**または**String（`"integer"`）であり、後者は`Dry::Types[...]`にルーティングされる（`class_interface.rb:430-441`）。String形式はdry-schemaの`:string`と同じレジストリルックアップである。
   - **合成演算子**（`Types::String.optional`、
     `Types::Integer | Types::Nil`、`Types::String.constrained(…)`）は
     dry-typesのBuilder代数に従う。`attribute :x, Types::Integer.optional`に対するTier Cの発行は、リーダーが`Integer | nil`を返すことを知っている。
   - **ネストブロック形式**`attribute :details do …`は定数`Address::Details`を作り出し、その本体自体がさらに`attribute`呼び出しを含む — Tier Cは再帰しなければならない（あるいはTier Aのinstance-evalフレーミングをTier Cの発行と合成する）。定数名は
     `Inflector.camelize(attr_name)`に従う（`struct_builder.rb:64-73`）。Symbolから決定論的。
   - **`attributes_from(SomeStruct)`**（`:114-123`）は別のstructのスキーマからキーをコピーする — ソースstruct自体が歩ける場合は復元可能。
   - **`transform_keys(&:to_sym)`** / **`transform_types`**（`:204-223`）
     — 表面のメソッド名を変えないメタレベルの変更。アクセサ合成のために安全に無視できる。
   - **`Dry.Struct(name: Types::String, age: Types::Integer)`**
     （`lib/dry/struct.rb:30-35`） — proc形式コンストラクタ。キーワード引数Hashは通常の呼び出し形でソース可視リテラルである。継承形式の`attribute :…`と同じTier Cの到達範囲。
   - エッジケース: `attribute :name, SomeCustomType`であって
     `SomeCustomType`がプロジェクトローカル変数で`Type`を保持する場合 — キャリアをバインドするためにフロー解析が必要（通常のrigor作業であり、基盤ではない）。

5. **もっとも近い類似物** — **ADR-16のTier C（リテラルシンボルパラメータでのヒアドキュメントテンプレート展開）、教科書通りの形**。形はActiveStorageの`has_one_attached :avatar`と同一である: クラスレベルのDSL呼び出しがリテラルなSymbol引数を列挙する。フレームワークはそのSymbolを補間するヒアドキュメントを`class_eval`する。発行テーブルは固定である。dry-structの`attribute :city, T`に対する発行テーブルは:

   | 合成物 | 戻り値 |
   | --- | --- |
   | `def city`インスタンスメソッド | `T#primitive` |
   | `schema`キー`:city` | `T` |
   | `to_h`の行`city: …` | `T` |
   | `[:city]`アクセス | `T` |
   | `.new(city: …)`キーワード引数 | `T`（強制変換済み） |

   ネストブロック形式はTier A＋Tier Cの合成を追加する（ブロックは新しい`StructBuilder`バインドの`Class.new(parent)`上で`instance_eval`スタイルで実行される。外側の呼び出しは親クラス上に新しい定数を`const_set`する — 定数名はSymbolから計算可能）。

---

## 合成（dry-types⇒dry-schema / dry-struct）

3つのgemは依存関係の順序**dry-types→{dry-schema,
dry-struct}**で合成する。

- **dry-schemaはdry-typesを必要とする**（`lib/dry/schema.rb:8` —
  `require "dry/types"`）。ルール述語推論器は
  `::Dry::Types::PredicateInferrer`をサブクラス化する
  （`lib/dry/schema/predicate_inferrer.rb:6`）。スキーマモジュール自身の
  `Types`名前空間は`include ::Dry.Types`である
  （`lib/dry/schema/types.rb:11`）。`TypeRegistry`は
  `Dry::Types`の直接的なラッパーである（`lib/dry/schema/type_registry.rb:21-29`）。`required(:x).filled(:string)`内のすべての
  `:string` / `:integer` / `:array`は`Dry::Types["strict.string"]`（あるいはプロセッサ名前空間ごとに`"params.string"`
  / `"json.string"` —
  `type_registry.rb:37-41`）を介して解決される。
- **dry-structはdry-typesを必要とする**（`lib/dry/struct.rb:6`）。
  `Dry::Struct::ClassInterface`は`Types::Type`と
  `Types::Builder`を`include`する（`class_interface.rb:11-12`）。`Dry::Struct.schema`自体が
  `Dry::Types::Hash::Schema`である（`struct.rb:115-116`）。
  `attribute :name, "integer"`（String形式）は
  `Dry::Types["integer"]`を介してルーティングされる（`class_interface.rb:432-433`）。
- **dry-structはdry-schemaを必要としない**。dry-schemaもdry-structを必要としない — dry-typesを共有する兄弟。

**rigor-`*`プラグインのシーケンシングへの含意**。最初に書かれる`rigor-dry-types`プラグインは**下流の両方のgemを部分的にアンロックするが、それらを包含しない**:

- `rigor-dry-types`は次を出荷する: (a)`core.rb`のALL_PRIMITIVES /
  KERNEL_COERCIBLE / METHOD_COERCIBLE / NON_NIL Hashをミラーする同梱の名前レジストリ、（b）`include Dry.Types(…)`のためのTier C形式の定数発行、（c）`Dry::Types[<literal>]`のための動的戻り値型ルール、（d）`|`、
  `&`、`>`、`.optional`、`.constrained`、`.constructor`のためのキャリア代数処理。これがあれば、`Dry::Types::Type`キャリアを生成する任意の式は、dry-schema、dry-struct、あるいは独立したコードのいずれに現れても、型付けされる。
- `rigor-dry-schema`は依然自身のプラグインを必要とする: `Dry::Schema.Params { … }`内のスキーマグラフ記録ウォーク（Tier Aのスコープ注釈＋`required` / `optional` / `value` / `filled` /
  `maybe` / `each` / `array`レコーダー）、加えて
  記録されたキーマップから`T`が派生する`Processor#call(input) -> Result[T]`の型付け。これはキーごとのキャリア解決のために`rigor-dry-types`を**消費する**（`:string`→`Types["strict.string"]`）。
- `rigor-dry-struct`は依然自身のプラグインを必要とする: 各`attribute :name, T`呼び出しのためのTier Cヒアドキュメント発行、加えて
  `Const_name`サブクラスを作るネストブロック合成。これは属性ごとの`T`キャリアのために`rigor-dry-types`を**消費する**。

したがって`rigor-dry-types`は他の2つの**共有依存**であり、gem依存グラフを1対1でミラーする。それなしでは、下流gem内の属性ごと／キーごとの型表現は
`Dynamic[T]`に劣化する。それがあれば、下流プラグインは薄いASTレコーダーである。

dry-rbファミリーは**マクロ基盤への強い適合**である:
dry-structはTier Cにきれいにスロットインする。dry-schemaはTier A＋Tier A駆動のレコーダーにスロットインする。dry-typesは同梱定数レジストリ（Tier-C-as-method-definitionよりもTier-C-as-`const_set`に近い）＋`Dry::Types[…]`のための`dynamic_return_type`拡張としてもっともよくモデル化される。3つのどれにもGraphQL-Ruby形式の扱えなさや、Sequel-column-accessor形式のスキーマオラクル要件は現れない。

---

## ライブラリ横断のサマリー

静的展開／リプレイの扱いやすさの降順でソート。「shape」列はexpanderが扱う必要のあるメタプログラミングプリミティブを命名する。「rigor today」列は現在のプラグイン／処理状態を記録する。

| ライブラリ／サブシステム | 展開の形 | もっとも近い類似物 | rigor today |
| --- | --- | --- | --- |
| Sinatraルート | `define_method(&block)`によりブロック＝メソッド | 「`self`が型付けされれば展開不要」 | プラグインなし |
| ActiveStorage attached | リテラルシンボルでパラメータ化されたヒアドキュメント | PHPStanトレイトインライン展開 | `rigor-activestorage`がすでに展開 |
| dry-struct `attribute :name, T` | リテラルシンボルでパラメータ化されたヒアドキュメント | PHPStanトレイトインライン展開（教科書通りのTier C） | プラグインなし |
| AASM | DSLブロック＋リテラルシンボル`state` / `event` | トレイトインライン展開／statesmanの形 | プラグインなし（statesmanが先例） |
| Redmine A/B/F/G | ブロック形式`class_eval`＋リテラルシンボルリスト`define_method` | Lispの`defmacro` | 処理なし |
| Redmine C | YAML/プラグインレジストリの名前でパラメータ化されたヒアドキュメント | PHPStanのクラスごとスタブ（YAMLリーダーが必要） | 処理なし |
| dry-types `include Dry.Types()` | 同梱名前レジストリ＋`const_set`発行 | トレイトインライン展開（Tier-C-as-`const_set`）＋`Dry::Types[…]`の動的戻り値型 | プラグインなし |
| factory_bot | レジストリ＋リテラルシンボル引数から計算される戻り値型 | PHPStanの`DynamicMethodReturnTypeExtension` | `rigor-factorybot` |
| Deviseモデル側 | 同梱レジストリ駆動のtrait includeシーケンス | PHPStanトレイトインライン展開＋レジストリ | プラグインなし |
| Deviseルート／コントローラ | `mapping.singular`でパラメータ化されたヒアドキュメント | トレイトインライン展開（ルートウォーカーが必要） | プラグインなし |
| Sequelの関連付け | リテラルシンボルからの名前テーブル発行 | トレイトインライン展開（statesman風） | プラグインなし |
| dry-schema `Dry::Schema.Params do … end` | ブロック`instance_eval`＋`required` / `optional` / 型仕様のリテラルシンボルレコーダー | Tier A＋ASTレコーダー＋`Processor#call`の動的戻り値型 | プラグインなし |
| ActiveSupport::Concern | ブロックの遅延`class_eval`、ターゲット=includer | トレイトインライン展開＋DSL再ターゲット | 部分的（再ターゲット後に下流ウォーカーが発火） |
| Redmine E | `instance_eval(File.read(path))` | PHPStanスタブファイルパターン | 処理なし |
| Redmine D | `eval('"' + literal_template + '"')` | `defmacro`＋テンプレートテーブル | 処理なし |
| Sequelのカラムアクセサ | DBスキーマオラクルが必要 | PHPStanのPDOリフレクション拡張 | 処理なし |
| GraphQL-Ruby | スキーマグラフレコーダー、メソッド発行なし | スキーマ解決パス（マクロ展開**ではない**） | 延期（需要なし） |

## 持ち越される観察（まだ決定ではない）

これらは合成が浮かび上がらせる観察である。ユーザーはこれらをどうするか指示する。

- **既存のプラグイン契約の範囲内にあるクリーンなPHPStanトレイトインライン展開のターゲットが2つすでにある**: AASM（statesmanの形）とDeviseのモデル側（同梱レジストリ＋モジュールinclude）。両方ともマクロ評価機構を導入せずに到達可能。

- **Sinatraは「ブロック→メソッド」展開器の最小実用ターゲット**である。rigorが「このブロックはクラスX上のインスタンスメソッドとして実行される」という契約を受け入れれば、Sinatraは書き換えを必要としない。この形を共有する隣接DSL（RSpecのネストコンテキスト、factory_botの`evaluator`、ActiveRecordのクラスレベルマクロ）も同じフックから到達可能になる。

- **Redmineは「マクロテンプレート＋ヒアドキュメントRuby」の方向性を検証する**。
  箇所A、B、F、Gはリテラルリストに対する純粋な`defmacro`である — ランタイム評価なしのASTレベル展開器で扱える。箇所Cはペイオフが最大だが、`config/settings.yml`＋プラグインの`init.rb`を読む必要がある。「プロジェクト側のmonkey-patch事前評価」メモに合う。箇所Eは宣言された`self`コンテキストを持つ`instance_eval(File.read(...))`である — 
  PHPStanスタブファイルの形。Redmineにはランタイムデータでの真のパターン（d）の文字列evalは存在しない。

- **GraphQL-Rubyはマクロフレームに合わない唯一のライブラリである**。
  これは*スキーマグラフレコーダー*である — 型クラスレベルで展開すべきRubyメソッドが存在しない。`rigor-graphql`は`Schema::Member`走査を再実装する（あるいはリプレイする）スキーマ解決パスを必要とする。これは具体的なユーザー需要が現れるまで`rigor-graphql`を延期するrigorの既存の立場に合致する。

- **Sequelは2つのレイヤーに分かれる**: 関連付けはトレイトインライン展開スタイル（扱えるプラグイン）、カラムアクセサはスキーマオラクルを必要とする（スキーマソースなしには扱えない）。プラグインレイヤーは「副作用的なapplyフックを持つトレイトインライン展開」である。

- **ActiveSupport::Concernの`included do … end`はほとんどのRails形式のDSLプラグインを接続する蝶番である**。ブロックの内容をincluderのクラスに再ターゲットすることで、すべての下流DSLウォーカー（`has_one_attached`、`has_many`、`scope`、Concern経由のAASM、Concern経由のDevise、…）が正しいコンテキストで発火できる。マクロ評価は不要。単なるウォーカー再ターゲット。

- **dry-rbトリオ（dry-types、dry-schema、dry-struct）は基盤への強い適合である**。
  dry-structは教科書通りのTier C（リテラルSymbol`attribute :name, T`→`class_eval`ヒアドキュメント発行）である。dry-typesは同梱レジストリの形（Tier-C-as-`const_set`＋`Dry::Types[…]`のためのdyn-return-typeルール）である。dry-schemaはTier A（`Dry::Schema::DSL`上の`instance_eval`）＋ブロックを歩いて`key → type`マップを構築するレコーダーである。**それらはgem依存を介して1対1で合成する**:
  `rigor-dry-types`は他の2つのプラグインの共有依存であるが、それらを包含しない。`rigor-dry-types`なしでは、下流の属性ごと／キーごとの型は`Dynamic[T]`に劣化する。それがあれば、下流プラグインは薄いASTレコーダーである。ADR-12（dry-rbパッケージ決定）は3つのプラグインがどう出荷されるかを統治するのであり、それらが適用されるかどうかではない。

## このメモにないもの

マクロ評価設計議論に意図的に延期されている事項:

- rigorが汎用のマクロ評価器（Lispスタイル）、パターンごとのテンプレートテーブル（PHPStanトレイトスタイル）、あるいはその両方を備えるべきか。
- 展開がパース／推論／新しい「ASTリライト」フェーズのいずれで発火するか。
- マクロ衛生がrigorの`name_scope`リゾルバとどう相互作用するか。
- Redmine E形式の外部Rubyファイルに対する`instance_eval`バインドの`self`と`name_scope`がどう相互作用するか。
- 同梱レジストリ（Deviseモジュール、AS core_ext）がプラグイン契約のどこに住むか。
- ADR-15 Ractor共有下でのマクロ展開ASTのキャッシュ挙動。

---

**参照したクローン**（`/tmp/`配下、コミットなし、サブモジュールなし）:

- `/tmp/rails-research/`（`rails/rails`の`8-0-stable`）
- `/tmp/aasm-research/`
- `/tmp/devise-research/`
- `/tmp/graphql-ruby-research/`
- `/tmp/factory_bot-research/`
- `/tmp/sinatra-research/`
- `/tmp/sequel-research/`
- `/tmp/redmine-research/`
- `/tmp/dry-types-research/`
- `/tmp/dry-schema-research/`
- `/tmp/dry-struct-research/`
