---
title: "GitLabオンボーディングの診断裁定（2026-07-08）"
description: "rigortype/rigor docs/notes/20260708-gitlab-diagnostic-adjudication.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260708-gitlab-diagnostic-adjudication.md"
sourcePath: "docs/notes/20260708-gitlab-diagnostic-adjudication.md"
sourceSha: "dd130e88dfb8bb906e1cf948ef18a9a17a63b4c20ab02152a42252c74d20fb83"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
sidebar:
  order: 20266708
---

ソース: `rigor-survey/gitlab`のまっさらな`rigor check`オンボーディング、診断3,909件
（error 289件 / warning 238件 / info 3,382件）。`~/repo/ruby/rigor-survey/gitlab`の
実際のGitLabソースに対し、`_reports/init/gitlab.check.txt`と`gitlab.triage.json`から
読み取り専用で裁定した。このノートのために`rigor` CLIは実行していない（並行実行との
キャッシュ競合のため）。

コンテキスト: `db/schema.rb`が存在しないため（GitLabは`structure.sql`を同梱）、
`rigor-activerecord`は**inert**（不活性）モードでロードされる──あらゆるAR呼び出しの
チェックがスキップされ、（このノートが記録するとおり）その不活性は通常のARクエリチェーン
呼び出しの誤推論にも**波及**する。ロックされたgem 729個はRBSを同梱していない。
有効なプラグイン: actionpack、activerecord（inert）、actionmailer、rails-routes、
rails-i18n、activesupport-core-ext、devise、sidekiq、dry-types、sorbet。

## 1. クラスタ表（error + warning、合計527行）

| ルール / パターン | 件数 | 共通メカニズム |
| --- | --- | --- |
| `call.possible-nil-receiver` | 218 | RBSどおり`Hash#[] : V?`──ハッシュルックアップから連鎖する呼び出し（`metrics[:k].set`、`payload[...]`など）。1ファイル（`ruby_sampler.rb`、24件）が支配的 |
| `plugin.rails-routes.unknown-helper` | 159 | 互いに素な2つのサブクラスタ: （a）マウントされたGrape APIから`grape-path-helpers` gemがランタイムに生成する`api_v4_*_path`ヘルパー（68/159）；（b）それ以外すべて──プラグインのルート名合成のギャップ（`scope(as:)`+素の`get`、`collection`ブロック内の複数セグメント文字列パス）とattr_reader/ルートヘルパー名の衝突（91/159）。（b）のサンプリングしたメンバーはすべて偽陽性だった。確定したタイポはゼロ |
| `call.undefined-method` | 116 | 寄せ集め: ARリレーションチェーンの誤推論（約40件、`Array[String]`）、ActiveSupport/ActionViewコア拡張のRBSギャップ（約18件: `advance`/`minutes`/`titlecase`/`dasherize`/`all_day`/`html_escape_once`）、`Struct`メンバーアクセス（5件、ADR-48で先送り）、`ActiveRecord`シングルトン設定アクセサ（5件）、モンキーパッチされたgem（`ruby-magic`、2件）、stdlibのRBSギャップ（`YAML.parse`/`Psych.parse`、1件）、`is_a?(URI)`のモジュールナローイングのギャップ（3件）、その他`nil`/`Hash`/`Numeric`（約15件） |
| `plugin.actionmailer.missing-view` | 12 | すべて`Notify`/`ApplicationMailer`内: `helper_method`宣言のアクセサ、アクション内部のヘルパーメソッド、`mail(body: ...)`のインラインボディ呼び出しがいずれも「アクションにビューが必要」と誤分類された。加えてミックスイン定義メソッドのファイル/行の誤帰属バグ |
| `call.wrong-arity` | 11 | stdlib/gemのRBSギャップ: `CSV::MalformedCSVError.new(msg, line)`（6件、コンストラクタのRBSが不完全）、`Date#to_time(form)`（1件、ASコア拡張のオーバーライドがモデル化されていない）、`Array`/`Redis::Cluster`/`Enumerator`（4件、未精査） |
| `call.argument-type-mismatch` | 5 | 2件はAR不活性カスケードの下流（`Array#from`）、3件はフローセンシティブな`T?`/`Dynamic[T]?`ナローイングの限界（いずれも実運用ではクラッシュしない） |
| `plugin.rails-routes.wrong-arity` | 3 | Railsの暗黙的な`(.:format)`オプションセグメント+末尾のオプションハッシュ規約（`path(id, format, options)`）がプラグインのアリティチェックにモデル化されていない |
| `def.ivar-write-mismatch` | 2 | 両方とも真正──§3を参照 |
| `plugin.activerecord.load-error` | 1 | `db/schema.rb`欠如の想定内/文書化済みの帰結 |

## 2. サンプリングしたサイトの裁定（30サイト/クラスタ）

判定の凡例: **GENUINE** / **FP-engine** / **FP-gem-RBS-gap** /
**FP-config-artifact**（AR不活性）/ **WORKS-BUT-WORST-CASE**。

| # | サイト | 判定 | 根拠 |
| --- | --- | --- | --- |
| 1 | `lib/gitlab/utils/mime_type.rb:15` `File.magic` | FP-gem-RBS-gap | `ruby-magic` gem（`require 'magic'`）が`File.magic`をモンキーパッチしている。gemはRBSを同梱していない |
| 2 | `lib/gitlab/utils/mime_type.rb:22` `string.type` | FP-gem-RBS-gap | 同じgemが`String#type`をモンキーパッチしている。specで実在を確認済み（`from_string('plain text') == 'text/plain'`） |
| 3 | `lib/release_highlights/validator.rb:13` `YAML.parse` | FP-gem-RBS-gap（コアstdlib） | `rbs-4.0.3`の`psych.rbs`は`load`/`load_file`/`safe_load`/`unsafe_load*`を宣言しているが`Psych.parse`は**宣言していない**──実在し要となるメソッド（`Psych::Nodes::Document`を返す）がRBSコアから単に欠けている。`core_overlay`の候補 |
| 4 | `lib/unnested_in_filters/dsl.rb:47` `Integer`に対する`use_unnested_filters!` | FP-engine | `module Relation`はメタプログラミング（`relation_delegate_class(mod).prepend(...)`）によってAR::Relationのデリゲートクラスに`prepend`される。素のモジュール本体内ではRigorは`self`がAR::Relationだと推論できないため、素の呼び出し`spawn`は`ActiveRecord::Relation#spawn`ではなく`Kernel#spawn`（pidの`Integer`を返す）に解決される |
| 5 | `lib/gitlab/tracking/snowplow_timeout_emitter.rb:20` `URI::Generic`に対する`request_uri` | FP-engine（本質的） | `URI(@collector_uri)`/`Kernel#URI`はRBSで`URI::Generic`を返すと型付けされている（正しい──実行時のスキーム分岐で`URI::HTTP`/`HTTPS`などにディスパッチする）。`#request_uri`は`URI::HTTP`にのみ宣言されている。https/httpのスキーム文字列をサブクラスに結びつけるナローイング規則が存在しない |
| 6 | `app/controllers/groups_controller.rb:152` `api_v4_groups_badges_path` | FP-engine/プラグインのギャップ | `grape-path-helpers`（Gemfile.lock、`~> 2.0.1`）が起動時にGrapeルートテーブル（`config/routes/api.rb`の`mount ::API::API => '/'`、Railsの`as:`なし）から`api_v4_*_path`メソッドを生成する。rigor-rails-routesは静的なRailsルートDSLをパースするだけで、このgemの動的なヘルパー生成をまったく知らない──159件中68件のunknown-helper発火を占める |
| 7 | `app/helpers/access_tokens_helper.rb:61-62` `granular_new_user_settings_personal_access_tokens_path` / `legacy_new_...` | FP-engine（監査で判定を訂正） | 当初GENUINEと裁定したが、Railsソースと突き合わせて覆した。当該ルートは`namespace :user_settings`内の`resources :personal_access_tokens`配下、`collection`ブロック内の`get 'granular/new'` / `'legacy/new'`（`config/routes/user_settings.rb:21-28`）である。actionpack-8.1.3の`mapper.rb`によれば: `prefix_name_for_action`は文字列パスをprefixとして使い、`Mapper.normalize_name`（`normalize_path(name)[1..-1].tr("/", "_")`、407行目）が`granular/new`を`granular_new`に変換する。`:collection`スコープの`Scope#action_name`（2476行目）は`[prefix, name_prefix, collection_name]`の順に並べ→`granular_new_user_settings_personal_access_tokens_path`──**まさにコードが呼んでいるヘルパー**になる。プラグインが算出した名前（およびその「もしかして」提案──memberスタイルの順序、単数化）のほうが誤りである: rigor-rails-routesは`collection`ブロック内の複数セグメント文字列パスの自動命名をモデル化していない。FP規律のクロスチェックも同意する: このページは本番のGitLabでレンダリングされるので、レンダリング時の`NoMethodError`はありえなかった |
| 8 | `app/controllers/repositories/git_http_controller.rb:117` `redirected_path` | FP-engine | 実在のメソッド: 祖先の`Repositories::GitHttpClientController`上の`attr_reader :redirected_path`（`@redirected_path`は`Gitlab::RepoPath.parse`から設定される）。rails-routesプラグインの`_path`サフィックスヒューリスティックは、「欠けているルートヘルパーに違いない」と仮定する前に、その識別子がローカル/祖先で定義されたインスタンスメソッドに解決されるかを先に確認していない |
| 9 | `app/controllers/users_controller.rb:57` `user_activity_path` | FP-engine | 実在のルート: `config/routes/user.rb:95-110`、`scope(path: 'users/:username', as: :user, ...) { get :activity }`が`user_activity_path`に合成される。プラグインのルートDSLパーサーは`scope(as: :user)`+素の`get :action`（明示的なpath/`as:`なし）を結果のヘルパー名に正しく合成できていない |
| 10 | `app/models/award_emoji.rb:46` `Array[String]`に対する`where`（約40サイトのARリレーションクラスタの代表） | FP-config-artifact | AR不活性（`db/schema.rb`なし）により、ARモデル上の`select(...)`/スコープチェーンが`ActiveRecord::Relation`ではなく`Array`型のレシーバーに退化する。その退化した型に対する後続の`.where`/`.order`/`.joins`/`.distinct`/`.find_by`呼び出しがすべて「undefined-method」になる |
| 11 | `app/models/concerns/loose_foreign_keys/deleted_record_concern.rb:51` `Array#from(Integer)`と誤型付けされた`.from(sql_fragment)` | FP-config-artifact | #10と同じ根本原因だが、ActiveSupportの実在する`Array#from(position)`コア拡張（Rigorが*知っている*）と衝突し、幻のundefined-methodではなく幻のargument-type-mismatchを生む──同じAR不活性カスケードの別の症状 |
| 12 | `lib/gitlab/database/background_operation/common_worker.rb:283`同じ`.from(...)`パターン | FP-config-artifact | #11と同じ |
| 13 | `lib/gitlab/metrics/samplers/ruby_sampler.rb:152-...`（24サイト）`metrics[:key].set(...)` | WORKS-BUT-WORST-CASE | RBSどおり`Hash#[] : (K) -> V?`。各キーは実際には使用前に`init_yjit_metrics`が投入するが、Rigorはメソッド間でハッシュ内容の不変条件を証明できない。教科書的な「acknowledgeモード」のnilable |
| 14 | `app/helpers/projects/project_members_helper.rb:58` `ERB::Util.html_escape(description)`、`description`が`nil`の可能性 | WORKS-BUT-WORST-CASE | `if/elsif/elsif`に`else`がないため、`share_with_group`も`share_with_members`も成立しなければ`description`は`nil`になりうる。実在するが、Railsの`ERB::Util.html_escape`は内部で`.to_s`を呼ぶのでクラッシュはしない──代わりに黙って空文字列を吐く。ボーダーライン: 真正なロジックの臭いだが、実行時クラッシュではない |
| 15 | `lib/gitlab/ci/ansi2json/state.rb:109` `Base64.urlsafe_decode64(encoded_state)`、`encoded_state: Dynamic[top]?` | WORKS-BUT-WORST-CASE | 2行上の`return if encoded_state.blank?`ですでにガードされている。`verify(data)`の戻り値型が具体的に推論されない（`Dynamic`のまま）ため、blankガードは存在をナローイングするが`String`にはナローイングしない |
| 16 | `lib/gitlab/redis/wrapper.rb:241` `CGI.parse(redis_uri.query)`、`String?` | WORKS-BUT-WORST-CASE | コードはすでに`query = redis_uri.query; unless query.nil?`でnullチェックしているが、ブロック内でチェック済みのローカルではなく`redis_uri.query`を再呼び出ししている。2回の呼び出しの間で`redis_uri`は変異しないため実運用では安全だが、Rigorは繰り返し呼び出し間のレシーバーの純粋性/メモ化を追跡しないので、2回目の呼び出しの静的型は本当に`String?`になる |
| 17 | `lib/system_check/incoming_email/imap_authentication_check.rb:39` `@error = error`（旧`String`、現`StandardError`） | **GENUINE BUG** | `check?`の失敗分岐（12行目）は`@error`に**String**を設定する；`try_connect_imap`のrescue（39行目）は**Exception**を設定する。`show_error`（19行目）は無条件に`@error.class` / `@error.message`を呼ぶ──`String#message`は存在しないので、「no mailboxes configured」分岐はエラー報告器そのものの内部で`NoMethodError`を送出する。「本番は動く」テストを生き延びるのはまさにそれに矛盾しないから: String経路は着信メール設定が壊れているとき、すなわち誤設定のインストールに対するめったに実行されない管理者向け診断（`gitlab:check` rake）でしか発火しない──報告器は必要とされるまさにそのときにクラッシュする。だからこのバグは本番では潜在する |
| 18 | `lib/uploaded_file.rb:42` `@upload_duration = 0`（旧`Float`） | GENUINE（軽微） | rescue分岐が`Float(kwargs[:upload_duration])`のハッピーパスと一貫せず、整数`0`を代入している。「本番は動く」テストは通る──Rubyの数値相互運用性のため実行時失敗はありえない──ので、これは実在するが*見た目上の*型不整合であり、`:error`ではなく`:warning`で正しく表出しており、幻ではない |
| 19 | `app/controllers/dashboard_controller.rb:151`、`app/helpers/labels_helper.rb:130,132` `*_path`のwrong-arity ×3 | FP-engine | 3件とも`path_helper(required_segment?, format, options_hash)`を呼んでいる──末尾のオプションハッシュの前に明示的なformatを位置引数として渡す慣用的なRailsパターンで、ルートの暗黙的な`(.:format)`オプションセグメントに依拠している。`plugin.rails-routes.wrong-arity`のアリティモデルは宣言された必須パスセグメントしか数えず、`:format`スロットや「末尾のHashは常に有効」を数えない |
| 20 | `advance`/`minutes`/`all_day`/`titlecase`/`dasherize`（8サイト、`activesupport-core-ext`ヒント） | FP-gem-RBS-gap | すべて`Date`/`Numeric`/`String`上の実在するActiveSupportコア拡張メソッド。有効な`rigor-activesupport-core-ext`プラグイン自身のメソッドカバレッジ表が不完全 |
| 21 | `singleton(ERB::Util)`に対する`html_escape_once`（9サイト） | FP-gem-RBS-gap | 実在する`ERB::Util`のActionView拡張。有効な`actionpack`/`activesupport-core-ext`プラグインのRBSでカバーされていない |
| 22 | `singleton(ActiveRecord)`に対する`ActiveRecord.writing_role` / `.dump_schema_after_migration[=]`（5サイト） | FP-gem-RBS-gap | 実在するRails 7.1+のモジュールレベルAR設定アクセサ。どこにもモデル化されていない（リレーション型付けの不活性とは別物──これは`ActiveRecord::Base`サブクラスではなくモジュールとしての`ActiveRecord`） |
| 23 | `Struct`に対する`Struct#new`/`#numbers`/`#final?`（5サイト、`app/helpers/application_settings_helper.rb`、`app/workers/bulk_imports/pipeline_worker.rb`） | FP-engine（既知/先送り） | `Struct.new(...)`で構築されたクラスは`Data.define`のようにメンバー形状に畳み込まれない（ADR-48は`Struct`を「その変異健全性の物語の後ろに」明示的に先送りした） |
| 24 | `CSV::MalformedCSVError.new(msg, line)`のwrong-arity（6サイト、`app/services/import_csv/base_service.rb`） | FP-gem-RBS-gap（コアstdlib） | `rbs-4.0.3`の`csv.rbs`は`MalformedCSVError`の実在する2引数コンストラクタ（`message, line_number`──`csv` gemの`lib/csv/malformed_csv_error.rb`の文書化された公開API）を一切宣言していない。継承した`StandardError#initialize(msg)`にフォールバックするため「expected 0..1」となる。`core_overlay`の候補、#3と同じ形 |
| 25 | `app/models/concerns/integrations/base/irker.rb:154-156`素の`URI`に対する`uri.scheme`/`uri.path` | FP-engine | `uri.is_a?(URI)`は実在する（Rubyの`URI::Generic`は`URI`モジュールを`include`している）が、`is_a?(SomeModule)`でのナローイングはナローイングされた値を素のモジュール`URI`として型付けし、具体的/既知のincludeクラス（`URI::Generic`）には解決しないので、`.scheme`/`.path`（`Generic`に定義されモジュールレベルには表出しない）がナローイング後に可視にならない |
| 26 | `plugin.actionmailer.missing-view` ×12（`Notify`/`ApplicationMailer`） | FP-engine、4つのサブメカニズム | (a) `member`/`member_source`/`member_source_organization`は`Emails::Members`で`helper_method :member, :member_source, ...`と宣言されている──ヘルパーアクセサであってアクションではない；（b）`group_email`/`notification_group`/`csv_email`/`member_access_granted_email`は他のメーラーアクションから*のみ*呼ばれる内部ヘルパー（直接配信されない）なので、Railsはそれらのビューを一切解決しない；（c）`test_email`は`body:`/`content_type:`を直接`mail_with_locale`に渡す、標準の「テンプレート不要」の慣用句；（d）**おまけの発見**: ミックスイン定義メソッド（`Emails::Members`、`Emails::Groups`、`Emails::Shared`）はすべて*モジュール自身の*行番号で`notify.rb`に誤帰属されている（例: `member_source`に対して`notify.rb:31`が報告されるが、実際は`app/mailers/emails/members.rb:31`）──偽陽性そのものとは独立した、プラグインの実在するファイル/行帰属バグ |
| 27 | `app/channels/application_cable/channel.rb:1` `plugin.activerecord.load-error` | FP-config-artifact（想定内） | `db/schema.rb`欠如の直接的で文書化された帰結。GitLabで修正すべきバグではない |

## 3. トリアージのgenuine-bugsヒント（11エントリ）──裁定済み

ヒントは「低件数・散在ルール」ヒューリスティックでクラスタリングする: `call.argument-type-mismatch` ×5、`def.ivar-write-mismatch` ×2、`plugin.activerecord.load-error` ×1、`plugin.rails-routes.wrong-arity` ×3。確信度ラベル: **likely**。

| サイト | ルール | 判定 |
| --- | --- | --- |
| `app/helpers/projects/project_members_helper.rb:58` | argument-type-mismatch | WORKS-BUT-WORST-CASE（上記#14） |
| `app/models/concerns/loose_foreign_keys/deleted_record_concern.rb:51` | argument-type-mismatch | FP-config-artifact（#11） |
| `lib/gitlab/ci/ansi2json/state.rb:109` | argument-type-mismatch | WORKS-BUT-WORST-CASE（#15） |
| `lib/gitlab/database/background_operation/common_worker.rb:283` | argument-type-mismatch | FP-config-artifact（#12） |
| `lib/gitlab/redis/wrapper.rb:241` | argument-type-mismatch | WORKS-BUT-WORST-CASE（#16） |
| `lib/system_check/incoming_email/imap_authentication_check.rb:39` | ivar-write-mismatch | **GENUINE**（#17） |
| `lib/uploaded_file.rb:42` | ivar-write-mismatch | GENUINE、軽微（#18） |
| `app/channels/application_cable/channel.rb:1` | activerecord.load-error | FP-config-artifact、想定内（#27） |
| `app/controllers/dashboard_controller.rb:151` | rails-routes.wrong-arity | FP-engine（#19） |
| `app/helpers/labels_helper.rb:130` | rails-routes.wrong-arity | FP-engine（#19） |
| `app/helpers/labels_helper.rb:132` | rails-routes.wrong-arity | FP-engine（#19） |

**結果: 2/11（18%）が真に対処可能**、両方とも`def.ivar-write-mismatch`から。ヒントの「likely」確信度は、このプロジェクトの`argument-type-mismatch`と`rails-routes.wrong-arity`のサブ母集団については実質的に過大である──どちらも一度きりのコード欠陥ではなく体系的なFPメカニズム（AR不活性カスケード；モデル化されていない`:format`+オプションハッシュの呼び出し規約）が支配的である。`def.ivar-write-mismatch`（このサンプルで2/2が真正）はこのバケット内で最も強いシグナルとして持ちこたえた。

（このノートの初期の草稿は、159件の`unknown-helper`バケット内にさらに2件の真正バグ──`access_tokens_helper.rb:61-62`のサイト、#7──があると主張していた。その判定はactionpack-8.1.3のルート命名ソースに対して**監査で覆された**: コードが呼んでいるヘルパーはまさにRailsが生成するものであり、プラグインが算出した名前のほうが誤りである。#7を参照。訂正後の真正合計は2件、両方とも`def.ivar-write-mismatch`から。）

## 4. （おおよその）サイト件数によるFPメカニズムのランキング

| 順位 | メカニズム | サイト数 | エンジン修正の候補 |
| --- | --- | --- | --- |
| 1 | `Hash#[] : V?`のnilableインデックスチェーン（RBSは正しく、内容不変条件が追跡されない） | 約200+ | 仕様に本質的（Hash#[]は真に部分的）。実際には「修正可能」ではない──候補: 繰り返しリテラルキーのハッシュ構築に対する`key?`スタイルのガード拡張でナローイングする（ニッチ） |
| 2 | AR不活性から波及するARリレーションチェーンの誤推論（`Array[String]`/`Array#from`の衝突） | 約42 | ADR-26スタイル: `rigor-activerecord`が不活性のとき、`select`/スコープを返す呼び出しを`Array`に落とすのではなく`Dynamic`/`ActiveRecord::Relation`名前的型に退化させる；あるいは`structure.sql`をARスキーマソースとしてサポートするADR（根本で不活性を解消する──GitLab級のプロジェクトは`schema.rb`ではなく`structure.sql`を使う） |
| 3 | `grape-path-helpers`が生成する`api_v4_*_path`ルートヘルパーがモデル化されていない | 68 | `rigor-rails-routes`プラグイン: `mount SomeGrapeAPI => path`+Gemfile.lockの`grape-path-helpers` gemを認識し、導出されたprefixに対するunknown-helperを抑制するか、（より良くは）Grapeルートツリーをパースして実際のヘルパー集合を生成する |
| 4 | ActiveSupport/ActionViewコア拡張のRBSカバレッジのギャップ（`advance`、`minutes`、`titlecase`、`dasherize`、`all_day`、`to_time(form)`、`html_escape_once`） | 約18 | `rigor-activesupport-core-ext`プラグインのメソッド表（またはADR-72の`data/gem_overlay/activesupport`オーバーレイ）を、欠けている`Date`/`Numeric`/`String`拡張とActionViewの`ERB::Util`追加で拡張する |
| 5 | `rails-routes`プラグインが、`_path`/`_url`サフィックスの呼び出しを未知のルートヘルパーとしてフラグする前に、ローカル定義のインスタンスメソッド（`attr_reader`）をチェックしない | ≥1（スポットチェック。`_path`/`_url`命名規約は素のアクセサでも一般的なので、おそらくさらに数件） | `unknown-helper`を出す前に、識別子がまずスコープ内のインスタンスメソッド（自クラスまたは祖先）に解決されるかチェックする |
| 6 | `rails-routes`プラグインのルート名合成のギャップ: (a) `scope(..., as: :x)`+素の`get :action`；（b）`collection`ブロック内の複数セグメント文字列パス──Railsは`get 'granular/new'`を`Mapper.normalize_name`（スラッシュ→アンダースコア）+`:collection`の順序`[prefix, name_prefix, collection_name]`によって`granular_new_<scope-as>_<collection>_path`と命名するが、プラグインは順序と複数化の両方を誤る | ≥3（サンプリング。bメカニズムはこの裁定そのものにおいて、監査が捕捉する前に2件の誤ったGENUINE判定を生んだ） | プラグインのルートDSLウォーカーをactionpack `mapper.rb`の`name_for_action`/`action_name`/`normalize_name`の三つ組と突き合わせて監査する──文字列パスのprefixとスコープレベルごとの名前順序を厳密にモデル化する |
| 7 | `rails-routes.wrong-arity`が暗黙的な`(.:format)`セグメント+末尾オプションハッシュのRails規約をモデル化しない | 3 | アリティチェックにおいて、オプションハッシュの前のシンボル/文字列format位置引数に+1の許容を加える |
| 8 | `Struct.new`で構築されたクラスがメンバー形状に畳み込まれない（ADR-48で先送り） | 5 | ADR-48の`DataClass`/`StructClass`キャリアを`Struct.new`をカバーするよう拡張する（その変異健全性の物語を条件とする） |
| 9 | コアstdlibのRBSギャップ（`Psych.parse`、`CSV::MalformedCSVError.new(msg, line)`） | 7 | `psych`と`csv`の`core_overlay`エントリ（ADR-79が`StringScanner#peek_byte`ですでに使っているのと同じメカニズム） |
| 10 | `ActiveRecord`モジュールレベルのシングルトン設定アクセサ（`writing_role`、`dump_schema_after_migration[=]`）がモデル化されていない | 5 | リレーション型付けの不活性とは独立に、`activerecord` gemの同梱RBS/オーバーレイに追加する |
| 11 | `is_a?(SomeModule)`ナローイングが、ナローイングされた値を具体的なincludeクラスではなく素のモジュールとして型付けする | 3 | ニッチ；プロジェクト宣言の「既知のincluder」ヒント、または使えないモジュール型ではなくナローイング後に`Dynamic`へフォールバックすることが必要 |
| 12 | `actionmailer.missing-view`: `helper_method` DSL、内部（非トップレベル）ヘルパーアクション、`mail(body: ...)`インラインボディがすべて「ビューが必要」と誤分類；加えてミックスイン定義メソッドがincludeクラスのファイルに誤帰属 | 12 | 4つの独立した修正可能なプラグインのギャップ: (a) `helper_method`宣言の名前を除外する、（b）どの公開メソッドが内部からのみ呼ばれるのか、それともリテラルなメーラー配信のエントリポイントとして呼ばれるのかを追跡する（難しく、ヒューリスティック/`:info`のままにする必要があるかも）、（c）`mail`/`mail_with_locale`が`body:`キーワード引数付きで呼ばれるときはスキップする、（d）ファイル/行をincludeクラスではなく実際の`def`サイトを指すよう修正する |
| 13 | Grape/URI/モンキーパッチgemのギャップ（`ruby-magic`） | 2 | このパターンが調査対象プロジェクト全体で再発するなら`ruby-magic`のADR-72スタイルgem_overlayエントリ（現状は一度きり、低優先度） |
| — | `URI()`/`URI.parse`が、既知のhttp（s）スキームでも`URI::Generic`スーパー型を返す | 1 | 本質的/低優先度；スキーム文字列のナローイングが必要（需要ゲート、低価値） |

## 5. 確定した真正バグ（2）

1. **`lib/system_check/incoming_email/imap_authentication_check.rb:39`**──`@error`は「no mailboxes configured」経路で`String`を代入されるが、`show_error`は無条件に`@error.class` / `@error.message`を呼び、これらは`Exception`のみがサポートする。「本番は動く」ヒューリスティックに敗北するのではなくむしろ整合する: クラッシュする分岐は*誤設定の*インストールに対する`gitlab:check`スタイルの管理者向け診断のときにのみ実行されるので、エラー報告器は必要とされるまさにそのときにクラッシュする──本番トラフィックが決して実行しない潜在バグである。
2. **`lib/uploaded_file.rb:42`**──`@upload_duration`のrescue分岐のデフォルトが、ハッピーパスで使われる`Float`の`0.0`ではなく整数`0`である。実行時には無害（Rubyの数値強制変換）だが、実在し修正可能な不整合。`:warning`として重大度は妥当。

（さらに2件の候補──`access_tokens_helper.rb:61-62`のルートヘルパー呼び出し──は当初GENUINEと裁定され、**監査で撤回された**；§2の#7を参照。Rails自身の`mapper.rb`の命名規則がコードの呼ぶヘルパーをまさに生成する。）

## 6. 記録に値する異常

- **トリアージの「genuine-bugs」ヒューリスティックはその確信度ラベルを下回る成績である**。 11件のヒントエントリのうち真正だったのは2件だけ（18%、「likely」ラベルに対して）。低件数/散在ルールのシグナルはここでは「真正」の弱い代理指標である──`def.ivar-write-mismatch`（2/2）は強かったが、`call.argument-type-mismatch`（0/5）と`plugin.rails-routes.wrong-arity`（0/3）は強くなく、どちらも一度きりの欠陥ではなく体系的なFPメカニズムが支配的だった。
- **裁定そのものが「本番は動く」クロスチェックを必要とする**。 2件の`unknown-helper`サイトは当初（かつ自信をもって）Railsルート命名の手計算からGENUINEと裁定されたが、その後実際のactionpack `mapper.rb`を読んで覆された──コードが正しくプラグインのモデルが誤りだった。ホットな本番経路（明白にレンダリングされるページ）でのGENUINE判定は、フレームワーク自身のソースに対して確認されるまで暫定的にFPとして扱うべきであり、まさに規律が定めるFPコストの重み付けである。逆に#17は反対方向の注意を示す: 「本番は動く」は、本番が決して実行しない冷たいエラー処理経路のコードを免罪*しない*。
- **AR不活性は「ARチェックがスキップされる」よりも広い爆発半径を持つ**。それは通常のスコープチェーン呼び出しも`Array`型のレシーバーに退化させ、それが実在するActiveSupportの`Array`コア拡張メソッド（`#from`）と衝突して、幻のundefined-methodだけでなく幻のargument-type-mismatch診断を生む。（限界を文書化するだけでなく）`structure.sql`をスキーマソースにする能力があれば、あらゆる`structure.sql`使用のRailsプロジェクトに対してこれを根本で解消でき、それはGitLab級の規模では一般的である。
- **`actionmailer.missing-view`のミックスイン誤帰属は、偽陽性としての妥当性の議論とは独立した、機械的に検証可能な明確なバグである**: 報告される行番号は*定義している*モジュールファイルに対して正しいが、報告されるファイルパスは*includeしている*クラスのファイルである。安価で確信度の高い修正。
- **`grape-path-helpers`は実質的に大きな単一メカニズムである**（`unknown-helper`の68/159 = 43%、全error+warningの68/527 = 13%）──2つの「想定内/本質的」メカニズム（Hash#[]のnilability、AR不活性）に次いで、生の件数で最も価値の高い単一修正候補。
