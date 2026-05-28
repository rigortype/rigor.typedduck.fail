---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "3787034688a2a05951afad915763a21dbc877836c9192e1a1c4e69287cdb9660"
sourceCommit: "1881619b60b29439a03e7a1f8fee266031c9ca10"
sourceDate: "2026-05-28T22:28:23+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.11リリース済み（2026-05-27）**。バージョンバンプ、CHANGELOG封入、`make verify`パス済み**。`bundle exec rake release`はまだ実行されていない** — RubyGemsへの公開には明示的な承認が必要。

**`[Unreleased]`にはv0.1.11以降の28スライス（2026-05-27 / 28）が含まれている — Mastodon累積実測効果: エラー789 → 1（−788、−99.87%）**。主要な偽陽性クラスターをすべて解消: `unknown-helper` 567 → 0; `unknown-filter-method` 42 → 0; `missing-template` 27 → 0; `unknown-column` 12 → 0; `wrong-arity` 30 → 0; `unknown-action` 2 → 0; `unknown-key` 1 → 0。残り1件のエラーは上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイングギャップ（`app/validators/email_mx_validator.rb:49`）——[`docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md`](notes/20260528-rbs-upstream-pr-resolv-typeclass/)経由で並行`/Users/megurine/repo/ruby/rbs`セッションと連携済み。

**Redmine**（このセッションで計測した2番目のサーベイプロジェクト）: フルプラグインセット + lenientプロファイルで**エラー163 → 79（−84、−51%）**、同一パーサー追加サイクルによる。5つのエンジン領域がクロスプロジェクトのレバレッジポイントとして浮上;次の実装者の意思決定ポイントは以下の「読書順」を参照。

スライス（着地順）:

1. **`rigor plugins`有効化レディネスコマンド** — Mastodon調査により、間違ったcwdまたはGemfileコンテキストで`rigor check`を実行した場合に設定済みプラグインが無効のままになるサイレント失敗サーフェスが浮上した（元の1271エラーのMastodon実行は、mastodonの設定ではなくrigor自身の`.rigor.dist.yml`が使われたことによるものであり、エンジンの見逃しではなかった）。形状: プラグインごとのステータス行（loaded / load-error）と、すべてのマニフェスト宣言済み拡張サーフェス（`signature_paths:` / `.rbs`カウント、`open_receivers:`、`owns_receivers:`、`produces:`、`consumes:`、マクロ基板カウント、`protocol_contracts:`、`source_rbs_synthesizer:`、`type_node_resolvers:`、HKT登録カウント）。`--format json`でツール連携、`--strict`でロードエラー時に終了コード1（CIゲート）。付随変更: `rigor init`が`rigor plugins`を指す「次のステップ」ヒントを印字;`rigor-project-init` SKILLフェーズ4（[`skills/rigor-project-init/references/02-configure.md`](../skills/rigor-project-init/references/02-configure.md) §「プラグイン有効化の確認」）にload-error → 原因 → 修正テーブル付きの確認サブステップを追加。

2. **フローフォールディングG1 / G2コレクションミューテーション幅広げ** — ローカル変数またはivarにバインドされたリテラルシェイプキャリア（配列リテラルの`Tuple`、ハッシュリテラルの`HashShape`）は、インプレースミューテーター（`<<`、`push`、`pop`、`[]=`、`merge!`、`delete*`、`*!`兄弟など）が呼び出されると、非エスケープなブロック本体（`arr = []; xs.each { |x| arr << x }`）での呼び出しを含め、基底の`Nominal[Array, ...]` / `Nominal[Hash, ...]`に幅広げられるようになった。エンジン: 新しい`Rigor::Inference::MutationWidening`モジュール、`Inference::StatementEvaluator#eval_call`の2箇所の統合ポイント（直接 + ブロック本体）。`lib/rigor/inference/hkt_body_parser.rb:140 / :307`と`lib/rigor/inference/hkt_registry.rb:212`の3件の既存セルフチェック警告がサイレントになった — **`rigor check lib`はwarningクラスが導入されて以来初めて完全にクリーンになった**。Mastodon実測効果: エラー789 → 764（−25）、`call.undefined-method` 49 → 24（−25 — Tupleで幅広げられたレシーバーが狭いシェイプティアではなくArray RBSでディスパッチ）、`flow.always-truthy-condition` 9 → 8（残り8件はG2の残存ケース — `retry`フローエッジ、介在するメソッド呼び出しivar無効化、書き込み前読み取りnil — モジュールのdocstringに先送りとして記録）。

3. **`rigor-rails-routes`カスタムヘルパー検出 + `devise_for`認識** — Mastodon計測により`unknown-helper`が最大残存エラークラスター（764件中567件）として浮上。同じ`HelperTable`に対する2層のFix: （a）**`app/helpers/**/*.rb`をウォーク**してモジュールレベルの`def name(...)`のうち名前が`_path` / `_url`で終わるものを「既知だが未検証」のヘルパーとして登録——プロジェクト定義のURL builder（`full_asset_url`、`host_to_url`、`frontend_asset_url`）への呼び出しが偽陽性を出さなくなる。シングルトンをスキップ;ネストしたモジュールをウォーク。新しい`helper_paths:`設定（デフォルト`["app/helpers"]`）で追加ディレクトリをオプトイン。（b）**`RoutesParser`で`devise_for :resource [, skip: [...]]`を認識**し、標準Deviseヘルパーカタログ（sessions、passwords、confirmations、unlocks、registrationsとその`_url`バリアント）を生成。OmniAuthヘルパーのパターンマッチャーも追加（`<resource>_<provider>_omniauth_(authorize|callback)_(path|url)`）。新規ファイル: `helper_discoverer.rb`、`devise_routes.rb`。Mastodon実測効果: **エラー764 → 617（−147）、`unknown-helper` 567 → 420（−147）**。

4. **`rigor-rails-routes`パーサー + ヘルパー検出フォローアップ** — スライス3の実測残余が3つの原因に分かれ、このスライスでクローズ: （a）**`helper_paths:`デフォルトを`["app"]`に拡張**（以前は`["app/helpers"]`）で`app/lib/`、`app/services/`、`app/controllers/`、`app/serializers/`下でMastodonが定義するURL helperメソッドをデフォルトで拾う。サフィックスフィルター（`_path` / `_url`のみ）によりディレクトリサイズに関係なく登録セットを締める。（b）**バグA**: `resources :foo, only: [:create]` / `only: [:update]` / `only: [:destroy]` / `except: [:show]`がヘルパーをまったく登録しなかった——`entry_for_action`がそれらのアクションに対してnilを返した。RailsはそれらのためにもFOOS_path（コレクションPOST）/ foo_path（メンバーPATCH / DELETE）を生成するので、登録漏れがMastodonの`admin_role_path(@role)`等で`unknown-helper`を産んでいた。アクションハンドラーがshow/index相当のエントリーを出力するよう修正。（c）**バグB**: 名前が複数形に見える単数形リソース`resource :foo`（`resource :relationships, only: [:show, :update]`）が`relationship_path`に単数化されていた;Railsは与えた名前（`relationships_path`）のままにする。Fix: 単数DSLでの単数化をスキップ。（d）**可視性に関係ないヘルパー検出**: `HelperDiscoverer`の`private` / `protected`フィルターを削除——コントローラー内の`private def page_url(page)`もペアのビューの`link_to "Next", page_url(2)`が偽陽性を出さないよう登録される;コアエンジンの`call.undefined-method`は引き続き本当に到達不能なレシーバーを捕捉する。プラグインバージョン`0.1.0 → 0.2.0`（キャッシュ無効化のため）。Mastodon実測効果: **エラー617 → 458（−159）、`unknown-helper` 420 → 261（−159）**。

5. **`rigor-actionpack`コントローラー検出器の全面改修** — `unknown-filter-method`クラスター（458件中42件）がMastodonのネストしたコントローラーに対する3つの検出器バグに起因。（a）**ネストモジュール修飾**: `module Admin; class AccountsController < BaseController; end; end`が以前はベアの`AccountsController`として登録され、トップレベルの`app/controllers/accounts_controller.rb`エントリーを上書きしていた。Fix: 新しい`enclosing_namespace`フィールドを`ControllerIndex::Entry`に追加し、ASTウォーク経由でモジュール修飾子を引き回す。（b）**複数段階の継承**: `effective_methods_for`が親レベル1段しか歩いていなかった。Mastodonの`Admin::AccountsController < BaseController < ApplicationController`で祖父クラス定義の`require_user!`が失われた。サイクルセーフな祖先ウォークとして書き直し。（c）**レキシカル親ルックアップ**: `module Admin`内のベア`BaseController`参照はまず`Admin::BaseController`に解決し、次にトップレベルにフォールスルーするべき——Rubyの定数解決セマンティクスに一致。新しい`resolve_constant_lexically`ヘルパー。プラグインバージョン`0.1.0 → 0.2.0`。Mastodon実測効果: **`unknown-filter-method` 42 → 8（−34）**。残り8件はgem同梱のconcern（Punditの`verify_authorized`等）と動的定義フィルターメソッド。

6. **`rigor-rails-routes`シャドーイングローカル + kwargs arityトレランス** — スライス3 + 4の残余は2つのパターンが支配。（a）**シャドーイングローカル（261件の`unknown-helper`のうち204件がspec/内）**: `let(:foo_url) { ... }` / `subject(:foo_url) { ... }` / `def foo_url` / `foo_url = ...`はそのファイルで登録されたヘルパーをシャドーする名前を導入する。プリウォークですべてのシャドーイング名を収集し、アナライザーがマッチする呼び出し名のルート検証をスキップ——RSpecの標準`let(:collection_url) { 'https://...' }`の後`expect(collection_url)`パターンがRailsの登録ヘルパーに対して`unknown-helper` / `wrong-arity`を発火しなくなった。（b）**kwargs専用呼び出し形式**: `short_account_status_url(account_username: u, id: i)`はarityが2の`get '/@:account_username/:id', as: :short_account_status`に対してRailsのsegment-via-kwarg形式を通す。arityチェックが末尾の`KeywordHashNode`が存在する場合は`positional ≤ expected`を受け入れるよう修正。プラグインバージョン`0.2.0 → 0.3.0`。Mastodon実測効果: **エラー424 → 320（−104）、`unknown-helper` 261 → 187（−74）、`wrong-arity` 30 → 0（完全解消）**。

7. **`rigor-actionpack`アナライザーサイドのネストモジュール修飾** — スライス5の検出器Fixがインデックス内の`module Admin; class DomainBlocksController`を`Admin::DomainBlocksController`として修飾したが、アナライザーサイドは依然として`first_class_node` + `qualified_name_for(class_node.constant_path)`経由でベアの`DomainBlocksController`としてクラス名を読んでいた。そのため`diagnose_filters`が`controller_index.known?("DomainBlocksController")`→サイレントミス（ネストコントローラーのフィルター検証での偽陰性）、`diagnose_renders`が`controller_path_for`をベア名に対して計算→`admin/domain_blocks/new.html.haml`の代わりに`domain_blocks/new.html.erb`。新しい`first_class_node_with_namespace`ウォーカーがASTディセント経由ですべての囲む`ModuleNode`修飾子を蓄積;得られた修飾名をインデックスルックアップとレンダーパス導出の両方に使用。プラグインバージョン`0.2.0 → 0.3.0`。Mastodon実測効果: **`missing-template` 27 → 3（−24）**。

8. **`rigor-rails-routes`メンバー/コレクション短縮形 + `_index_`サフィックス** — 2つのパーサー改善を同時着地（プラグインバージョン`0.3.0 → 0.5.0`）。（a）**メンバー / コレクションブロック短縮形**: `resources :accounts do member { post :memorialize }; collection { post :batch }; end`はインラインアクション宣言がシンボルのみの呼び出し形式だったため以前はサイレントスキップされていた。新しい`member_block` / `collection_block` Contextフレーム + `register_member_collection_action`がメンバーアクションに`memorialize_<singular>_path(id)`、コレクションアクションに`<action>_<plural>_path`を親スコープチェーンから正しいarityで導出。（b）**単数形 = 複数形のリソースへの`<name>_index_path`**: `resources :reblogged_by, only: :index`（`singularize(reblogged_by) == reblogged_by`の場合）は以前showヘルパーと衝突する`reblogged_by_path`を登録していた。Railsは曖昧さを避けるため`_index_`を付加する（例外: `news` / `series`等の不可算名詞リストはひとつの名前に保つ）。パーサーがその動作に一致するよう修正。Mastodon実測効果（スライス合算）: **エラー296 → 242（−54）、`unknown-helper` 187 → 133（−54）**。

9. **`rigor-activerecord`マイグレーションファイル除外** — `db/migrate/<timestamp>_*.rb`と`db/post_migrate/`のファイルはマイグレーション実行時点のスキーマ（例: `Account.where(suspended: true)`はsuspendedカラムを削除するマイグレーション内では動作する）を参照する。現在の`db/schema.rb`に対してこれらのファイルを検証するのはカテゴリエラー。`diagnostics_for_file`が`(?:\A|/)db/(?:post_)?migrate/`にマッチするパスについて早期リターンするよう修正。プラグインバージョン`0.1.0 → 0.2.0`。Mastodon実測効果: **`unknown-column` 12 → 4（−8）**。残り4件はMastodonの`Instance.where(domain: ...)`パターン——`Instance`はDatabaseビューに基づくモデルで`schema.rb`にテーブルがない;「テーブルなし登録モデル」除外メカニズムが追加されるまで先送り。

10. **`rigor-activesupport-core-ext` `Date#at_midnight`** — ActiveSupportは`Date#midnight` / `Date#at_midnight` / `Date#beginning_of_day` / `Date#end_of_day`ファミリー（と`at_*`エイリアス）を`Time`を返す`beginning_of_day`にエイリアスする（`core_ext/date/calculations`）。典型的なイディオム`Date.current.at_midnight`が`call.undefined-method`を発火していた。プラグインバージョン`0.1.0 → 0.2.0`。Mastodon実測効果: **`call.undefined-method` 24 → 22（−2）**。

11. **`rigor-rails-routes`単数リソースブロックプレフィックス** — 単数形`resource :foo do ... end`はネストした宣言のヘルパープレフィックスにリソースのそのままの名前を使うようになった。Fix前はパーサーがボディをウォークするがフレームをプッシュしなかったため、`resource :instance do scope module: :instances do resources :domain_blocks; end; end`が`instance_domain_blocks_path`の代わりに`domain_blocks_path`を生成していた。新しい`push_singular_resource`が`:singular_scope`フレームをContextスタックに追加——リソース名を`helper_prefix`と`/<name>`パスセグメントに貢献するが`:id` arityはなし（単数リソースには`:id`がない）。Mastodon `api_v1_instance_*`クラスターをクローズ。プラグインバージョン`0.5.0 → 0.6.0`。Mastodon実測効果: **エラー232 → 202（−30）、`unknown-helper` 133 → 103（−30）**。

12. **`rigor-rails-routes` concern注入ルートボディ** — `concern :name do ... end`ボディが定義時にキャプチャされ、すべての`resources :foo, concerns: :name do ... end`サイトで再生されるようになった。v0.1.11のFixはconcernボディをサイレントスキップして偽陽性の`wrong-arity`を避けていた;このスライスはその安全策（定義時の再生なし）を維持しつつ欠けていたピースを追加: リソースがconcernsを消費するとき、ボディがリソースのスコープ内で再生される。`concerns: :name`と`concerns: [:a, :b]`の両形式をサポート。Mastodonの`concern :account_resources do resources :followers; resource :outbox; resources :collections; resources :quote_authorizations; end`クラスター——`account_followers_url`、`account_outbox_path`、`account_quote_authorization_url`、`account_followers_synchronization_url`等が正しく登録される。プラグインバージョン`0.6.0 → 0.7.0`。Mastodon実測効果: **エラー202 → 166（−36）、`unknown-helper` 103 → 67（−36）**。

13. **`rigor-rails-routes` `use_doorkeeper` + 不規則単数形** — 2つの関連する追加を同時着地。（a）**`use_doorkeeper do ... end`認識**: Doorkeeperアプリの標準OAuthルート（token、revoke、introspect、token_info、userinfo、authorization、applications resources、authorized_applications）をカバーする新しい`DoorkeeperRoutes`カタログ。ブロック内の`skip_controllers :name`を尊重;`controllers <hash>`リマッピングは無視（サービスクラスを変更するだけでヘルパー名は変わらない）。Mastodonの`oauth_*`クラスター（`oauth_token_url`、`oauth_application_path(:id)`、`oauth_applications_path`等）をクローズ。（b）**ラテン語 / ギリシャ語の不規則単数形**: `media → medium`、`data → datum`、`criteria → criterion`、`phenomena → phenomenon`。Fix前`media`は不可算リストに入っていたため`resources :media`のindexとshowヘルパーが`media_path`に統一されていた;RailsはRubyに`medium`と格変化する。Mastodonの`medium_path(id: ...)`形式をクローズ。プラグインバージョン`0.7.0 → 0.8.0`。Mastodon実測効果: **エラー166 → 132（−34）、`unknown-helper` 67 → 33（−34）**。

14. **`rigor-rails-routes` extended-singularize + `as:` + mount** — 3つの小さなパーサー追加。（a）**`singularize`が`*shes` / `*ches` / `*xes` / `*zes` → `*`のchomp（"es"）を認識**（Railsインフレクターに一致）。Mastodonの`async_refreshes → async_refresh`形式をクローズ。（b）**`resources :foo, as: :bar`** + **`resource :foo, as: :bar`**で`bar`をヘルパー名ルートとして使いつつ`foo`をパス / 内部リソースフレームとして保持。`actor_collection_path`形式をクローズ。（c）**`mount Foo::Engine, at: '/path', as: :name`**が`<helper_prefix><name>_path`と`_url`を登録（arity = 親セグメント数）。エンジンの内部ヘルパーはスコープ外;Mastodonの`mount Sidekiq::Web, at: 'sidekiq', as: :sidekiq` + 同様のマウント済みエンジンが正しく登録される。`as:`のない`mount`はサイレントスキップ。プラグインバージョン`0.8.0 → 0.9.0`。Mastodon実測効果: **エラー132 → 123（−9）、`unknown-helper` 33 → 24（−9）**。

15. **`rigor-rails-routes` `with_options`ブロック** — `with_options X do ... end`はブロック内のすべての呼び出しに`X`デフォルトを伝播する（Railsのrouteで用いるDSLイディオム）。Mastodonの`namespace :trends`内の`with_options only: [:index], concerns: :batch do resources :links; resources :tags; resources :statuses; end`は内側の宣言の`:batch` concernをサイレントスキップしていた（内側の`resources :links`自体に`concerns:`オプションがなかったため）。新しい`:with_options` Contextフレーム + `effective_options_for(node, context)`ヘルパーがスタックのデフォルトとノード自身のオプションハッシュをマージ;`restrict_actions_from`と`replay_concerns_from_options`がマージ済みマップを消費する。内側呼び出しのオプションは常にデフォルトをオーバーライドする。プラグインバージョン`0.9.0 → 0.10.0`。Mastodon実測効果: **エラー123 → 120（−3）、`unknown-helper` 24 → 21（−3）**。

16. **`rigor-actionpack`フィルターチェックをgem同梱の親でサイレント化** — `unresolved_include?`が`unknown-filter-method`を抑制すべきかどうかを判断するためにコントローラーの祖先チェーンをウォークする;未解決のgem同梱concernの`include`はすでにカバーしていたが、`< Devise::ConfirmationsController` / `< Doorkeeper::AuthorizedApplicationsController`（gem同梱の親自身の祖先は不可視）でループを抜けてしまっていた。1回目以降のイテレーションでの`current_entry`がnilの場合にtrueを返すよう修正（未解決includeとして扱う）。Mastodonの8件の`unknown-filter-method`クラスター（DeviseやDoorkeeperから継承した`check_self_destruct!`、`require_functional!`、`authenticate_resource_owner!`）をクローズ。プラグインバージョン`0.3.0 → 0.4.0`。

17. **`rigor-rails-routes` `unknown-helper` FPスクラブ** — 4つの小さな追加: （a）パスベース除外（`app/models/`、`lib/`、`db/`、`config/`へのルール除外）;（b）Deviseスコープベアヘルパー（`new_password_path(scope)`ファミリー、arity 1）;（c）`omniauth_authorize_path(scope, provider)` / `omniauth_callback_path(scope, provider)`（arity 2）;（d）`ss`保持のsingularize（`custom_css → custom_css`）。`BUILTIN_PASSTHROUGH`に`vite_asset_path` / `vite_asset_url`を追加。プラグインバージョン`0.10.0 → 0.11.0`。Mastodonの7件の`unknown-helper`残余をクローズ。

18. **`rigor-actionpack`ファイルパス由来のコントローラーパス + 抽象ベース** — `module Admin; class Users::RolesController`はランタイムに`Admin::Users::RolesController`を生成するが、AST由来の抽出はベア形式を取っていた;`app/controllers/`下のファイルパスをRails規約の真実のソースとして使用するよう修正。加えて抽象ベース検出: クラス名が`BaseController`で終わる、またはビューディレクトリにサブディレクトリのみ含まれる場合 → レンダーチェックをスキップ（Railsは`render :show`をリクエスト時のサブクラスに対して解決する）。プラグインバージョン`0.4.0 → 0.5.0`。Mastodonの3件の`missing-template`クラスターをクローズ。

19. **`rigor-activerecord`バーチャルテーブルモデル除外** — スキーマ側カラムセットが空のモデル（MastodonのInstanceのようなDBビューバックや外部ソースバック）はカラム検証を完全にスキップ。本物のARモデルは常に少なくとも`id`を持つので、empty-columnsは厳密な識別子。プラグインバージョン`0.2.0 → 0.3.0`。Mastodonの3件の`unknown-column`クラスターをクローズ。

20. **`rigor-actionmailer` `RESERVED_CLASS_METHODS`拡張** — `respond_to?`、`public_send`、`send`、`__send__`、`method`、`instance_method`、`methods`をメーラーアクションとして検証しないメソッド名セットに追加。Mastodonの`NotificationMailer.respond_to?(@notification.type)` / `.public_send(...)`が`unknown-action`を発火しなくなった。プラグインバージョン`0.1.0 → 0.2.0`。2件の`unknown-action`クラスターをクローズ。

21. **`rigor-rails-i18n` Rails同梱キープレフィックス** — `date.`、`time.`、`datetime.`、`support.array.`、`errors.format`、`errors.messages.`、`number.`、`helpers.{select,submit,label}.`、`i18n.transliterate.`、`activerecord.errors.{messages,models}.`というプレフィックスを持つキーの`unknown-key`をスキップ——これらはプロジェクト自身のロケールファイルが再宣言しなくても実行時にすべてのロケールに存在する。Mastodonの`I18n.t('date.order')`形式をクローズ。プラグインバージョン`0.1.0 → 0.2.0`。

22. **`rigor-activesupport-core-ext` `Hash#without`** — ActiveSupportが`Hash#without`を`Hash#except`（Hashを返す）にエイリアスしている。Mastodonの`options.without('type').merge('@context' => CONTEXT)`チェーンが`Array#without`（Enumerableの兄弟）経由で解決し`merge`がArrayとして型付けされていた。linked_data_signature.rbのFPをクローズ。

23. **`rigor-rails-routes` Redmineサーベイ駆動追加** — Redmineコードベースに対してフルプラグインセットを実行して浮上した6つの小さなパーサー追加: （a）`match 'path', :as => :name, :via => [...]`が`get` / `post`ハンドラーを共有;（b）オプショナルパスセグメントarityレンジ（`'settings(/:tab)'` → arity {1, 2}）;（c）インライン`:on => :collection` / `:on => :member`形式;（d）`collection`ブロック内の文字列名メンバー / コレクション短縮形（`get 'report'`）;（e）resourcesブロック内の明示的`:as`に対するメンバー形式`<as>_<singular>_path`;（f）`singular == plural`（不可算名詞を含む）の場合のindexヘルパーへの`_index_`サフィックス（以前の「不可算をスキップ」という除外は経験的に誤りだった）。プラグインバージョン`0.11.0 → 0.12.0`。Redmineへの実測効果: **エラー163 → 79（−84、−51%）;`unknown-helper` 92 → 11**。Mastodonは6件で安定**。Mastodon全体のv0.1.11以降の累積効果: エラー789 → 6（−783、−99.2%）**。

24. **`Class.new(Parent) { |c| ... }`ブロックパラメーター + 戻り型リフト** — レシーバーが`Singleton[Class]`で最初の位置引数が`Singleton[Parent]`の場合、ブロックパラメーターと呼び出し結果の両方を`Singleton[Parent]`にリフトする（親なしは`Singleton[Object]`）。Fix前はRBSのジェネリック`Class#new`が両サイドで`Nominal[Class]`を返していたため、`klass = Class.new(ApplicationRecord) do |c| c.table_name = '...' end`（Mastodonの`lib/mastodon/cli/statuses.rb:76 / :152`、Railsマイグレーション内の同イディオム、Sequelテストフィクスチャ、Ractor共有可能クラスフィクスチャも同様）が`Classに対してtable_name=が未定義`と報告していた。2つのエンジン変更: `IteratorDispatch.block_param_types`内の`:new`アーム、`MethodDispatcher#meta_new`内の`class_new_lift`;ともにSingleton以外の親引数（dynamic / nominal / constant）では保守的に判断を見送り、既存の`Nominal[Class]`フォールバックに流す。Mastodon実測効果: **エラー6 → 4（−2）**。

25. **`rigor-rails-routes` GitLab FOSSサーベイ駆動追加** — GitLab FOSSコードベースに対してプラグインを実行して浮上した3つの追加: （a）`draw_all :name`（`action_dispatch-draw_all`由来、`draw :name`と同じ単一ファイル読み込みセマンティクス）;（b）キーワード形式の`scope(path: ':project_id', as: :project)`——最初の位置引数ではなくキーワード引数としての`path:`;（c）反復的な`direct(name.sub(FROM, TO)) do |...| ... end`エイリアス生成の検出——GitLabがすべての`namespace_project_*`ヘルパーに対して`project_*`短縮エイリアスを作成するループ。新しい`detect_alias_rule_in_each`ウォーカー + ポストプロセス`apply_alias_rules`で実装。プラグインバージョン`0.12.0 → 0.15.0`。GitLab FOSS `app/controllers`（542ファイル）への実測効果: **エラー502 → 100（−402、−80%）;`unknown-helper` 486 → 71**。

26. **ブロックオートスプラット: 単一Tuple yieldが複数パラメータブロックで分解** — `BlockParameterBinder`がRubyのオートスプラットルールを再現するようになった。レシーバーが正確に1つの値をyield（`expected_param_types.size == 1`）し、ブロックが複数の位置スロットを宣言し、単一の期待要素がTupleの場合、バインダーがスロットごとのバインディングの前に`expected_param_types`をTupleの要素で置き換える。`Hash#each { |k, v| ... }`形式をクローズ;任意のイテレーター（単一Tupleをyieldするもの）が同じパスで恩恵を受ける。複数引数yield（`each_with_index`の`(element, index)`）はスプラットしない——Rubyの動作に一致。Mastodon実測効果: **エラー4 → 3（−1）** — `lib/chewy/strategy/mastodon.rb:23`の`@stash.each do |type, ids| pipeline.sadd("chewy:queue:#{type.name}", ids) end`が解決。

27. **`rigor-activerecord` Postgres配列カラム伝播** — `t.<type> "name", array: true`（と`t.column`ジェネリック形式）がインスタンスアクセサーで`Nominal[Array, [<inner>]]`として流れるようになった（以前はベアの`<inner>`）。3つの小さな変更: `SchemaParser`が新しい`keyword_true?`ヘルパーで`array:`キーワードを読む（既存の`references_polymorphic?`からリファクタリング）;`SchemaTable::Column`構造体に`array:`フィールドと`array?`述語を追加;`column_return_type`がカラムが配列フラグ付きの場合に内側の型をラップ。プラグインバージョン`0.3.0 → 0.4.0`。Mastodon実測効果: **エラー3 → 2（−1）** — `app/models/admin/status_batch_action.rb:30`の`@report.status_ids = (@report.status_ids + allowed_status_ids).uniq`が解決（`reports.status_ids` bigint配列カラム）。

28. **`rigor-activerecord`暗黙的selfのクラス側ARコール解決** — `flow_contribution_for`が囲む`scope.self_type`が`Singleton[Model]`のとき暗黙的selfコール（`call_node.receiver`がnil）を処理するようになった。`Model.where(...)`を処理するのと同じfinder / scope / relation entry-pointの解決が適用される。標準的なスコープボディイディオム`scope :duplicate_uris, -> { select(:uri).group(:uri).having(...) }`をクローズ——Fix前は`select(:uri)`が`Kernel#select`（IOマルチプレクサー、`core/kernel.rbs`で`Array[String]`を返す）経由でルーティングされていた。`:select`もrelation entry-pointリストに追加。プラグインバージョン`0.4.0 → 0.5.0`。Mastodon実測効果: **エラー2 → 1（−1）** — `app/models/account.rb:177`のスコープボディが解決。残り1件のエラーは上流`ruby/rbs`のResolvの型クラスナローイングギャップ。

v0.1.11は2回連続のパッチサイクルの実世界トライアル作業を総括する:

- **v0.1.10**（2026-05-27） — `rigor mcp --transport stdio`（ADR-33、7つの読み取り専用ツール）;`rigor sig-gen --params=observed` attr_reader推論;`rigor coverage`精度ゲート;`rigor check --treat-all-as-inline-rbs`;`rigor-rbs-inline`プラグイン（ADR-32）;ブラウザプレイグラウンド（ADR-29スライス1〜4）;`rigor annotate`戻り型アノテーション;ADR-28パススコープドプロトコル契約 + `rigor-hanami`;定数畳み込み（Date / DateTime / Time、Math、String / Integer / Float中優先度、Hashシェイプハンドラー）;`return if @ivar.nil?` ivarガードナローイング修正。
- **v0.1.11**（2026-05-27） — プラグインを`rigortype` gemにバンドル;ポータブルベースラインパス;`rigor-rails-routes`の**5つの偽陽性ソースを解消**（kaigionrails conference-app + Mastodonトライアルに基づく）: `new_` / `edit_`プレフィックス順序、匿名`get`ルート登録、`scope as:`プレフィックス + arity、`draw(:name)`部分的読み込み、`concern`ボディnoop、末尾オプションハッシュ +1 arityルール;`rigor-rails-i18n`コントローラー内のレイジー翻訳キー;Railsクイックスタートマニュアル（[`docs/manual/14-rails-quickstart.md`](manual/14-rails-quickstart/)）。

リリースラインの計画は[`docs/ROADMAP.md`](../roadmap/) §「リリース戦略 — v0.2.0への道」にある。v0.1.9は「最後のプレビューカット」として指定されていたが、トライアル作業がプレビューラインをv0.1.10 / v0.1.11まで延長した;v0.2.0は次の名前付きマイルストーン（最初の評価 / 公式発表リリース）のまま。

## Mastodonトライアル — 結果まとめ（2026-05-27 / 28）

`/Users/megurine/repo/ruby/mastodon`は完全に設定済み:

- `.rigor.dist.yml`記述済み（すべての関連Railsプラグイン有効、`severity_profile: lenient`）
- `.rigor-baseline.yml`生成済み — 2496件の診断をカバーする1258バケット
- ベースライン有効状態で`rigor check`がクリーンに終了

**v0.1.11以降の14スライス（エンジン + プラグイン）がMastodonの`--no-baseline`エラー数を789 → 120（−84.8%）に削減**。クラスター別内訳:

| ルール | v0.1.11 | 現在 | Δ |
|---|---:|---:|---:|
| `unknown-helper` | 567 | 21 | −546 |
| `unknown-filter-method` | 42 | 8 | −34 |
| `call.undefined-method` | 49 | 22 | −27 |
| `missing-template` | 27 | 3 | −24 |
| `wrong-arity` | 30 | 0 | −30 |
| `unknown-column` | 12 | 4 | −8 |
| `flow.always-truthy`（warn） | 9 | 8 | −1 |
| 合計エラー | **789** | **120** | **−669** |

**残り120件のエラー**は4つのカテゴリに分類され、いずれも既存のプラグインセットでは新しいスコープなしに対処できない:

1. **テストフレームワークヘルパー（〜12件）** — `have_current_path` × 10（Capybaraマッチャー） + `file_fixture_path` × 2（Railsテストヘルパー）。`rigor-capybara`プラグインまたは`rigor-rspec-rails`拡張が必要。
2. **gem同梱concernシグ（8件）** — `unknown-filter-method`残余8件はPunditの`verify_authorized`、Deviseの`authenticate_resource_owner!`等。ADR-25パス経由のgem concern向けのプラグイン提供RBSシグ、または「このコントローラーはgem側のconcernをincludeしている」ヒントが必要。
3. **本物のnilチェーンバグ（〜22件）** — `call.undefined-method`残余のほとんどはspecフィクスチャ内の`*_for_nil`;これらは診断であり偽陽性ではない。Mastodon側の修正。
4. **単発のもの（〜10件）** — Deviseベアフォーム（`new_password_path`、`sign_in_url` × 1ずつ）、Viteヘルパー（`vite_asset_path` × 1）、カスタムの`default_url` / `shared_inbox_url` / `settings_preferences_path`、`Instance.where(domain:)`バーチャルモデルケース（4件）。各々が独自のターゲットFixを必要とする;コールサイトあたりのROIが低い。

ベースライン閾値0で事前サイクルに浮上した本物のバグ: `instances.domain` unknown column × 3（まだフラグ立て — バーチャルモデル）、`NotificationMailer`アクション誤用 × 2、ビューテンプレート欠落 × 1、i18nキー欠落 × 1、Pundit info × 2。これらはファイル編集時に再浮上する。

OSSスイープCIジョブ（`.github/workflows/oss-sweep.yml`）は次の`rigortype`公開後、新しい診断数を反映するためにストアド閾値をリフレッシュする必要がある。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログは[`docs/ROADMAP.md`](../roadmap/) §「将来のサイクル」にある。この節はそこに捕捉されていないエンジン内部の詳細のみを保持する。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4** — 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。独自のFP評価ゲート（[ADR-24 WD4](../adr/24-self-method-call-resolution/)）— メタプログラミング密度の高いコードに対する大きな新しい偽陽性サーフェスのため、v1は意図的に精度加法的のみとした。
- **クラスボディ内の非`Bot`一般採用** — 解決されたセルフ呼び出しの戻り型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ADR-23 — `rigor triage`スライス4プラグインレコグナイザー

残り: プラグインが自身のレコグナイザーを貢献できる`Plugin`フック（先送り）。（`Analysis::Diagnostic`の`receiver_type` / `method_name`構造化フィールドはv0.1.8で出荷;SKILL統合はv0.1.9トリオとともに出荷。）

### フローフォールディング — ループミューテーション追跡（ギャップG1 / G2）

**コレクションミューテーション部分はクローズ済み**（2026-05-27、`[Unreleased]`スライス2を参照）: リテラルシェイプキャリア（`Tuple` / `HashShape`）がローカルまたはivarにバインドされている場合、非エスケープなブロック本体内を含め、インプレースミューテーターが呼び出されると基底の`Nominal[Array, ...]` / `Nominal[Hash, ...]`に幅広げられる。3つの`rigor check lib`セルフチェック警告（`hkt_body_parser.rb:140 / :307`、`hkt_registry.rb:212`）が解消。エンジン: `Rigor::Inference::MutationWidening`。

このスライスが意図的に**対処しなかった**残りのG2ケース（スコープ外としてモジュールのdocstringに記録）:

- ~~**`retry`フローエッジ**~~ — **着地済み**（B2.1スライス）。`StatementEvaluator#eval_begin`がrescueボディ内の`Prism::RetryNode`を検出し、リバインドされたローカル / ivarをNominalエンベロープに幅広げ（Constant → Nominal[<class>]、Tuple → Array、HashShape → Hash）、プライマリボディ + rescueチェーンを幅広げたエントリーで再評価するようになった。`lib/mastodon/snowflake.rb:19`の`tries > 100`の常偽FPをクローズ。スコープインデックスも「最終訪問勝ち」に切り替えられ、再評価の幅広げエントリーが診断レイヤーに届くようになった。
- ~~**介在するメソッド呼び出しがivarバインディングを無効化**~~ — **着地済み**（B2.2スライス）。メソッドボディ内のすべての暗黙的self / `self.foo`呼び出しの後、ローカルナローイングがクラスivarアキュムレーターシードと異なる各ivarが`union(local, seed)`にリセットされる。外部レシーバーの呼び出しはそのまま通る（別オブジェクトのメソッドは呼び出し元のivarに届けない）。`app/workers/activitypub/delivery_worker.rb:39 / :41`のFPをクローズ。
- ~~**書き込み前読み取りnil**~~ — **着地済み**（B2.3スライス）。クラスivarプリパスが各メソッドボディをAST順でウォークして`seen_writes`を追跡;まだ書き込まれていないivarへの`InstanceVariableReadNode`が記録され、クラス全体のアキュムレーターがファイナライズ時に`Constant[nil]`ユニオンを得る。3つの健全性ゲート: `initialize`書き込み免除、クラスボディレベル書き込み免除（承認済みnull許容性）、既存エントリーのみターゲット。`lib/chewy/strategy/bypass_with_warning.rb:7`のFPをクローズ。

これら3件は引き続き`docs/type-specification/control-flow-analysis.md` §「mutation effects」下にキュー済み;各々が独自の精度リグレッションリスクプロファイルを持つ別個の中規模エンジン変更。

### Stdlib RBSカバレッジギャップパターン

上流の`ruby/rbs` RBSギャップが単一の内部Rigor呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable`ディレクティブ + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）は上流PR向けにステージされている — ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

### Mastodonクロスバージョンスイープ — FP発見事項（2026-05-23）

v3.5.19→v4.5.10クロスバージョンリグレッションスイープ（[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「何が増えているか」）は4つのクラスターを特定した。2つはすでに追跡済み;2つは新規:

1. **`StringScanner#[]` Symbolオーバーロード**（FP、`signature_parser.rb`の3箇所）— **すでに追跡済み**。上記「Stdlib RBSカバレッジギャップパターン」項目を参照——`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`がまさにこれを拡張する。
2. **ARの`scope`ボディのメソッド解決**（誤推論、新規）— `scope :x, -> { select(...).group(:uri) }`の中でラムダの`self`はモデルクラスだが、`select`が`ActiveRecord::Querying#select`ではなく`Enumerable#select`に解決するため、連鎖する`.group`が`undefined-method`と判定される**。ADR-26**の経験的根拠;ADR-26スライシングに折り込む。
3. **Ivar nil-guard / ivar-write型付け**（誤推論、**修正済み2026-05-26**）— `return if @ivar.nil?`ガードの後で`@ivar.method`が`undefined-method … for nil`を報告しなくなった。`statement_evaluator.rb`の`eval_if` / `eval_unless`で修正（コミット`36d6b1f`）。
4. **フローフォールディングの過剰主張**（FP）— **コレクションミューテーション部分は修正済み2026-05-27**（`Rigor::Inference::MutationWidening`）。G2の残存ケース（`retry`フローエッジ、介在するメソッド呼び出しivar無効化、書き込み前読み取りnil）は引き続きキュー済み——上記「フローフォールディング」項目のカタログを参照。

### より小さなキュー項目

- **Sig-genの`update_existing`**は兄弟の親 / 子クラスブロックを畳み込まない。回避策はターゲットsigファイルを削除してゼロから再生成すること。
- **`--params=observed`後のSig-gen残りギャップ** — `initialize`以外のソースからivarが設定される`attr_reader`は依然`:untyped_return`を生成。
- **`Hash === expr` case-equalityナローイング**（`open3.rb:226`の形）— 引き続きオープン。
- **インメモリの`Analysis::Runner.run_source(source:, path:, …)`エントリーポイント** — `RunnerHelpers#analyze`の呼び出しごとのtmpdir + chdirをバイパスする;需要駆動。

### Type-coverage uplift — ライン状況（2026-05-23）

Phases 1〜4着地済み（String / Integer / Float / Comparable / Math / HashShape / Date / DateTime / Time）。残り項目はすべて**リリース未確定**:

- **Struct / Data値fold** — 先送りすべきADR相当の機能。`docs/ROADMAP.md` §「将来のサイクル」→「型言語 / エンジン」と[`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)を参照。
- **`MathFolding`結果の精緻化** — 範囲精緻化の付与は需要駆動のフォローアップ。
- **Hash `rassoc`シェイプハンドラ** — 唯一残っている低優先度Hashハンドラ;需要駆動。

## 復帰する実装者のための読書順

**`[Unreleased]`にはv0.1.11以降の15スライス（15コミット、masterは`origin/master`より14件先行）が含まれている**。 `make verify`はクリーン。以下の3つのブランチのいずれかを選ぶ;特定の順序は強制されない。

### ブランチA — リリースをカットする

次の意図が蓄積された作業を出荷することであれば、すべてのスライスが後方互換のプラグインまたはアナライザー改善なのでパッチバンプ（`v0.1.12`）が自然なカデンスとなる。手順:

1. `rigor-release-prep` SKILLを実行する（または`AGENTS.md` §「リリースカデンス」の手動チェックリスト）。`lib/rigor/version.rb`でバージョンバンプ、CHANGELOGを`[0.1.12] - YYYY-MM-DD`下に再セクション化、`Gemfile.lock`を再生成、`make verify`。
2. **リリース承認が必要** — `bundle exec rake release`がタグ付け + プッシュ + RubyGemsへの公開を行う。
3. 公開後: `data/oss-sweep/mastodon-thresholds.json`をリフレッシュしてOSSスイープゲートが新しい〜120ベースラインを反映するようにする。

あるいは、この作業体を評価カットとして位置づけることが意図であれば`v0.2.0`（「最初の評価リリース」、ROADMAP §「リリース戦略」による）にロールアップする。v0.2.0は常に「公式発表」ラインであり、84.8%のMastodonエラー削減は防衛可能な公表ストーリー。

### ブランチB — Mastodonエラー数のクローズを続ける

Mastodonの残余（120件）は4つの明確に定義されたサブクラスターが支配しており、各々が単なるrails-routes / actionpackの反復ではなく**新しい方向**を必要とする:

1. **`rigor-capybara`プラグイン（〜10件）** — Capybaraマッチャー（`have_current_path`、`have_link`等）を既知のメソッド名として認識し、specファイルに現れたときに既存のルールが偽陽性を発火しないようにする。パターン: 小さなRBSバンドル + 認識リスト。`rigor-rspec-rails`の形状を踏襲。おそらく残余の中で最もユーザー向け（Capybara使用のRailsアプリすべてが恩恵を受ける）。
2. **gem同梱concernシグサポート（〜8件）** — Mastodonの`unknown-filter-method`残余は`verify_authorized`（Pundit）と`authenticate_resource_owner!`（Devise/Doorkeeper）。actionpackの検出器は未解決モジュールをincludeするコントローラーを正しく認識し`unknown-filter-method`をサイレント化するが、未解決ヒントが失われるのは解決済みincludeと未解決includeが共存する場合のみ。（a）「any unresolved include = 曖昧」にサイレンスルールを緩和するか、（b）Pundit / Devise concernへのプラグイン提供RBSシグ（ADR-25パス）を出荷する。
3. **「テーブルなし登録モデル」除外（〜4件）** — MastodonのInstanceはDatabaseビューに基づく;`db/schema.rb`に`instances`テーブルがないため`Instance.where(domain:)`がunknown-columnに見える。`Plugin::Manifest`への`virtual_models: ["Instance"]`フィールド（または`.rigor.yml`の`dependencies.virtual_models:`ノブ）を追加してカラム検証から除外する。
4. **単発のもの（〜10件）** — `vite_asset_path`、`default_url`、`shared_inbox_url`等。各々プロジェクト作者が書いたカスタムヘルパー。体系的なFix不可;ユーザーが`# rigor:disable unknown-helper`ディレクティブを追加するか`.rigor.yml`の`helper_paths:`を拡張する。

### ブランチC — Mastodonに駆動されないエンジン内部項目

このサイクルの影響を受けていないキュー済みエンジン項目:

1. **ADR-24スライス4** — 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。上記「ADR-24」を参照。
2. **G2フローフォールディングの残存ケース** — `retry`フローエッジ、介在するメソッド呼び出しivar無効化、書き込み前読み取りnil。上記「フローフォールディング」を参照。各々が独自の中規模エンジン変更。
3. **ARスコープボディのメソッド解決** — `scope :x, -> { select(...).group(:uri) }`ラムダの`self`がモデルクラスにリバインドされない。上記「Mastodonクロスバージョンスイープ」項目2を参照。ADR-26の次のスライシングの経験的根拠。
4. **Stdlib RBSギャップのプッシュ** — `references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`は上流`ruby/rbs` PRのためにステージ済み;まだプッシュ / オープンされていない。

### 参照読書

判断に迷う場合の正規エントリーポイント:

1. `CHANGELOG.md` § `[Unreleased]` — v0.1.11以降の15スライスの完全なまとめ（スライスごとの実測効果付き）。
2. [`docs/ROADMAP.md`](../roadmap/) §「リリース戦略 — v0.2.0への道」 — v0.2.0マイルストーンをゲートするもの。
3. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。v0.2.0は外部`rigor-*` gem向けにプラグイン契約サーフェスを安定化させるので、ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。
4. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/) — v0.2.0が安定化させなければならないプラグイン契約。
