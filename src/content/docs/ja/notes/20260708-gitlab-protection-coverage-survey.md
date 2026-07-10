---
title: "GitLab保護カバレッジ調査（2026-07-08）"
description: "rigortype/rigor docs/notes/20260708-gitlab-protection-coverage-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260708-gitlab-protection-coverage-survey.md"
sourcePath: "docs/notes/20260708-gitlab-protection-coverage-survey.md"
sourceSha: "8b5b7eed144b96e047c1d1910fa03e9ebb66d9f365bda9cd6b455ad09e18cba3"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
sidebar:
  order: 20266708
---

型保護カバレッジ（ADR-63 Tier 1、ADR-75/82に従って由来を配線）を、オンボードしたての
GitLab調査チェックアウト（`~/repo/ruby/rigor-survey/gitlab`、FOSSツリー、config `.rigor.dist.yml`: paths
`[app, lib]`、`ee/`除外、10プラグイン、lenientプロファイル）上で測定した。実行: `rigor coverage --protection --format json
app lib`、ウォームな`.rigor/cache`、実時間**約2時間17分**（12:20:46 → 約14:37 JST）、観測されたピークRSS約14.6 GB。
stderrはクリーン── "RBS environment build failed"なし、プラグインエラーなし、パースエラー0件。生JSON:
`~/repo/ruby/rigor-survey/_reports/init/gitlab.coverage.json`（4.9 MB、11,344ファイル、11,959個の相異なる
未保護メソッド名クラスター）。

目的: エンジン改善計画のためのデータ── どこに穴があり、何が原因で、どれが`tractability`（扱いやすさ）を持つか。
`20260706-mastodon-coverage-provenance-and-siggen-rbs-validity.md`内のMastodon/Redmine測定の姉妹資料。

## 1. 全体の保護率

| スコープ | 保護済み | 未保護 | 合計 | 比率 |
| --- | ---: | ---: | ---: | ---: |
| **app + lib** | 59,554 | 150,420 | 209,974 | **0.2836** |
| appのみ | 33,160 | 83,018 | 116,178 | 0.2854 |
| libのみ | 26,394 | 67,402 | 93,796 | 0.2814 |

比較対象（同一メトリック、カバレッジ忠実度修正後）: **Mastodon app+lib = 0.3148、Redmine app+lib =
0.339。**GitLabは両者より**3.1〜5.5 pp下**に位置する。

トップレベルディレクトリ別（合計ディスパッチサイト数でソート）:

| ディレクトリ | 保護済み | 未保護 | 合計 | 比率 |
| --- | ---: | ---: | ---: | ---: |
| lib/gitlab | 18,331 | 46,359 | 64,690 | 0.2834 |
| app/services | 9,778 | 24,762 | 34,540 | 0.2831 |
| app/models | 8,717 | 22,059 | 30,776 | 0.2832 |
| lib/(other) | 4,865 | 11,623 | 16,488 | 0.2951 |
| app/controllers | 4,746 | 8,228 | 12,974 | **0.3658** |
| lib/api | 3,198 | 9,420 | 12,618 | 0.2534 |
| app/graphql | 2,976 | 5,948 | 8,924 | 0.3335 |
| app/workers | 2,882 | 4,343 | 7,225 | **0.3989** |
| app/helpers | 1,304 | 5,626 | 6,930 | 0.1882 |
| app/finders | 1,106 | 4,379 | 5,485 | 0.2016 |
| app/(other) | 979 | 2,661 | 3,640 | 0.2690 |
| app/serializers | 236 | 1,935 | 2,171 | 0.1087 |
| app/presenters | 348 | 1,460 | 1,808 | 0.1925 |
| **app/policies** | 88 | 1,617 | 1,705 | **0.0516** |

この散らばりは示唆に富む。controllers（0.366）とworkers（0.399）── 専用のプラグインサポート
（rigor-actionpack、rigor-sidekiq）を持つ2つの階層── が最も保護されており、純粋なDSL階層
（policies 0.052、serializers 0.109）が最も低い。プラグインのカバレッジは目に見えて数値を動かす。

## 2. サイトごとの原因分布（`cause_site_counts`、サイト単位の正確な集計）

| 原因 | サイト数 | 未保護に占める割合 |
| --- | ---: | ---: |
| unsupported_syntax | 59,791 | 39.7% |
| inferred_return_untyped | 50,625 | 33.7% |
| none（原因なし） | 39,346 | 26.2% |
| explicit_untyped | 655 | 0.4% |
| analyzer_budget_cutoff | 3 | 0.0% |
| external_gem_without_rbs | 0 | 0% |
| framework_dsl_boundary | 0 | 0% |

`tractability_summary`: `{engine_gap: 110,419, add_rbs: 655}` ── すなわち**分類済みの穴の99.4%が
engine_gapに振り分けられ**、0.6%がadd_rbs、enable_pluginはゼロ。由来の完全性 = 73.8%（原因なし26.2%、
MastodonのWD8後26%と対比）。ユーザーが対処可能な2つの原因はゼロサイトで発火しており、まさにADR-82 G2の
パターンである。`framework_dsl_boundary`はプラグインがDynamicを返すときのみ記録される（プラグインは具体型
または何も返さないかのいずれか）し、`external_gem_without_rbs`にはオプトインのADR-10が必要だ── 806個の
ロックされたgemがありrbs_collectionもないため、gem由来の動的性は一切gemに帰属されない。`add_rbs`軸は
`explicit_untyped`（おそらくrigor-sorbet経由のSorbetスタイル`T.untyped`領域）によって丸ごと買われている。

## 3. 上位の未保護メソッド名クラスター（上位25個 = 57,952サイト = 穴の38.5%）

| # | メソッド | サイト数 | 主要な起源 |
| ---: | --- | ---: | --- |
| 1 | `[]` | 18,404 | unsupported_syntax |
| 2 | `id` | 4,075 | inferred_return_untyped |
| 3 | `==` | 3,589 | inferred_return_untyped |
| 4 | `present?` | 3,209 | inferred_return_untyped |
| 5 | `to_s` | 2,232 | inferred_return_untyped |
| 6 | `map` | 2,124 | inferred_return_untyped |
| 7 | `!` | 1,988 | unsupported_syntax |
| 8 | `[]=` | 1,863 | inferred_return_untyped |
| 9 | `each` | 1,721 | inferred_return_untyped |
| 10 | `is_a?` | 1,634 | inferred_return_untyped |
| 11 | `project` | 1,624 | inferred_return_untyped |
| 12 | `name` | 1,525 | inferred_return_untyped |
| 13 | `where` | 1,427 | unsupported_syntax |
| 14 | `nil?` | 1,392 | inferred_return_untyped |
| 15 | `new` | 1,385 | unsupported_syntax |
| 16 | `blank?` | 1,210 | inferred_return_untyped |
| 17 | `select` | 1,126 | unsupported_syntax |
| 18 | `merge` | 1,039 | unsupported_syntax |
| 19 | `to_i` | 966 | inferred_return_untyped |
| 20 | `first` | 961 | unsupported_syntax |
| 21 | `include?` | 924 | unsupported_syntax |
| 22 | `empty?` | 921 | inferred_return_untyped |
| 23 | `+` | 913 | unsupported_syntax |
| 24 | `any?` | 854 | unsupported_syntax |
| 25 | `fetch` | 846 | inferred_return_untyped |

シェイプはMastodonと一致する。Dynamicレシーバー上の普遍的な語彙のメソッド群で、`[]`が支配的
（単独で全穴の12.2%── オプションハッシュ／params／config添字アクセスのイディオム）。AR語彙のクラスター
（`where` 1,427、`find` 423、`exists?` 341、`find_by` 133、`includes` 104、`find_each` 105、`preload` 92、`not` 268）は
合計で約3,000となり、不活性なARプラグイン（§4.5）に直接帰属できる。ドメインのリーダー`project`（1,624）、`id`
（4,075）、`name`（1,525）、`user`（413）、`group`（522）、`current_user`（202）は、ADR-58/67が狙うモデル境界を
またぐ穴である。

## 4. GitLabイディオムのサンプリング（12サイト、判定）

1. **`Feature.enabled?`** ── `app/controllers/activity_pub/application_controller.rb:26`
   `::Feature.enabled?(:activity_pub)`。`Feature`は解析対象ツリー内にある（`lib/feature.rb`）し、当該メソッドは
   `class << self`の下に定義されている（95行目、`def enabled?`は141行目）。未保護、unsupported_syntax。
   **判定: モジュールのシングルトン（`class << self` / `def self.x`）解決のギャップ── ADR-57で名付けられた将来の
   スライス。** `enabled?`クラスターだけで619サイト（＋`disabled?` 76）にのぼり、この1つのエンジンスライスは
   GitLabで単独として最も普及したイディオムを保護することになる。
2. **`declarative_policy`の条件** ── `app/policies/project_policy.rb`（比率**0.039**、319/332
   が未保護、app/policies全体では0.0516）。`condition(:guest) { team_member? }`、
   `user&.project_bot?`、`project.public_builds?` ── `condition`/`rule`ブロック内のすべては、
   DeclarativePolicy gem（RBSなし）がDSLで提供する`user`/`project`/`subject`リーダーに対して走る。
   **判定: 純粋なDSL境界、`framework_dsl_boundary`の帰属はゼロ（ADR-82 G2/WD4）。`user`/`subject`に型を
   付けるにはrigor-declarative-policyプラグイン（またはADR-16のサブストレート宣言）が必要。**
3. **`can?`能力チェック** ── `app/controllers/concerns/authenticates_with_two_factor.rb:22`
   `user.can?(:log_in)`: `user`は型なしのメソッド引数。**判定: ADR-67の引数推論ギャップ
   （呼び出しサイトのシード）であり、それ自体はポリシーDSLのギャップではない。未保護の`can?`サイトは343。**
4. **params上のARリレーション** ── `app/controllers/concerns/group_tree.rb:40`
   `groups.where(parent_id: safe_params[:parent_id])`: `groups`は型なしの引数であり、型付きの
   引数であってもリレーションの語彙にはARプラグインが必要だ。**判定: ADR-67＋AR不活性の複合的な穴**。
5. **ARモデル定数** ── `app/controllers/abuse_reports_controller.rb:60` `User.find_by(id: …)`、
   ワーカーのサンプル`User.where(id: range).find_each` ── プロジェクトのモデル定数はDynamicに型付けされる（既知の
   ADR-52のブロッカー: 発見されたクラスにはSingleton型付けがない）うえに、ARプラグインは**不活性**である。stderrが
   `plugin.activerecord.load-error: schema file db/schema.rb not found; AR call checks skipped`を確認している
   （GitLabは`db/structure.sql`のみを同梱）。**判定: ARプラグインは予想どおり不活性── structure.sqlの
   サポート（またはスキーマダンプのフォールバック）は、GitLabでのAR階層の勝利すべての前提条件である。**
6. **strong paramsのチェーン** ── `app/controllers/abuse_reports_controller.rb:54`
   `params.require(:abuse_report).permit(…)`。rigor-actionpackは`params →
   ActionController::Parameters`と型付けし、`params`/`require`のディスパッチは保護されている（`require`クラスター:
   プロジェクト全体で未保護は2サイトのみ。未保護の70個の`params`サイトはすべてプラグインが適用されない
   ActionCableのチャンネル／ルート制約）。しかし`require`の戻り値は型なし（Parameters RBSがない）なので、
   `.permit`は未保護（108サイト）。**判定: rigor-actionpackは1リンク分だけ動作を検証済み。
   チェーンの戻り値ギャップは`require`→Parametersの一行プラグイン`dynamic_return`で済む。**
7. **`Gitlab::Utils.to_boolean`** ── `app/controllers/chaos_controller.rb:90`。`Gitlab::Utils`は
   モノレポローカルなgem `gems/gitlab-utils/`に存在する── 解析対象の`[app, lib]`パスの**外側**。144
   個の未保護`to_boolean`サイト。**判定: モノレポローカルなgem（`gems/*`、30個以上）は不可視── それらは
   paths指定が除外しているプロジェクトコードである。安価なconfig修正: `gems/*/lib`をpathsに追加する（または
   ADR-10の依存ソースエントリ）。エンジン作業は不要。**
8. **`strong_memoize`** ── `app/models/merge_request.rb:1176` `strong_memoize(:discussions_diffs) do …`。
   `gems/gitlab-utils`内に定義されている（#7と同じ穴）。ブロック形式の呼び出しが未解決 → その戻り値が
   型なし → 消費側が型なし。`strong_memoize_attr :name`という事後形式は無害である（その上の素の`def`が
   依然として解決され推論される）。**判定: ブロック形式 = 実際の穴、attr形式 = 既に問題なし。
   #7のpaths修正で無償で修正される（インクルードされたモジュール経由の暗黙self解決がその後に適用される）。**
9. **ActionCableチャンネル** ── `app/channels/application_cable/connection.rb:29`
   `cookies[Gitlab::Application.config.session_options[:key]]`: チャンネル／コネクション内の
   `cookies`、`request`、`params`にはプラグインのカバレッジがない（rigor-actionpackはコントローラーを
   カバーする）。**判定: ActionCableはカバーされていないRailsサーフェス。サイト数は少なく、優先度は低い**。
10. **サービスオブジェクトの`execute`** ── `app/controllers/concerns/boards_actions.rb:16`
    `board_create_service.execute.payload[:board]`: レシーバーはサービスインスタンスを返す暗黙selfの
    リーダーであり、未保護の`execute`サイトは417。**判定: チェーン起源のケース── レシーバーは
    解決されるがその推論された戻り値がDynamicになる（コンストラクタ引数のフロー、ADR-67）。GitLabの
    ServiceResponseベースのイディオムは`execute → ServiceResponse`型付けで報われる（プラグインまたはADR-67 WD3）。**
11. **Sidekiqのperform引数** ── `app/workers/authorized_project_update/user_refresh_over_user_range_worker.rb:26`
    `def perform(start_user_id, end_user_id)` ── 型なしの引数だが、workersは最も保護されている
    ディレクトリ（0.3989）であり、未保護なのは`perform_async` 13サイトと`perform_in` 3サイトのみ。**判定:
    rigor-sidekiqはエンキュー側をよく保護している。perform引数の型付けは通常のADR-67の領分である。**
12. **ViewComponentのヘルパー** ── `app/components/pajamas/avatar_component.rb:49` `helpers.current_user`:
    `helpers`は型なしを返す（ViewComponent gem、RBSなし）。未保護の202個の`current_user`サイトは
    コンポーネントに集中している。**判定: 外部gemの穴がunsupported_syntaxと誤ラベル付けされている（またしても
    発火ゼロの`external_gem_without_rbs`）。**

## 5. Mastodon（0.3148）／Redmine（0.339）との差分: ドライバーのランキング

GitLabの0.2836はMastodonより3.1 pp下だ。上記のサンプルに基づき、証拠づけられた重みでランク付けする。

1. **ARプラグイン不活性**（structure.sqlのみ、`plugin.activerecord.load-error`）: 約3,000個の直接的な
   AR語彙の穴（§3）に加え、リレーション／モデル読み出しに根ざした下流チェーンすべて。MastodonとRedmineは
   ともに生きたschema.rb → 生きたARプラグインを持っていた。単独として最大の差分ドライバー。
2. **モデル定数のDynamic＋`class << self`シングルトン**: `Feature.enabled?`（619+76）、
   `Gitlab::Utils.*`、モデルの`.find/.where` ── GitLabのハウススタイルは、Mastodonよりはるかに多くの
   トラフィックをモジュールシングルトンのファサード経由でルーティングする（サンプル1、5、7）。
3. **プラグインのないDSL重視の階層**: policies 0.0516（1,617個の穴）、serializers 0.1087（1,935）、
   finders 0.2016（4,379）、GraphQL 0.3335 ── declarative_policy／grape-entityスタイルのserializers／
   finderフレームワークはすべて、Rigorがプラグインを持たないGitLab固有のフレームワークである（サンプル2）。
   Redmineのより素朴なRailsスタイルには同等の量は存在しない。
4. **モノレポローカルな`gems/*`のpathsからの除外**: strong_memoize、Gitlab::Utils、および30個以上の
   兄弟gemは、`[app, lib]`スコープが隠すファーストパーティのコードである（サンプル7、8）。GitLabの
   レイアウトに固有。利用可能な最も安価な修正（エンジンではなくconfig）。
5. **806個のロックされたgem、RBSコレクションなし**: grape（lib/apiは0.2534）、ViewComponent（サンプル12）、
   gitaly-clientのprotobuf ── 素の外部gemの動的性であり、`external_gem_without_rbs`が決して発火しないため
   帰属では不可視。Mastodonも同じドライバーを共有するが、より小さいgemサーフェスを伴う。
6. **`prepend_mod`によるEE注入**: 存在する（例: `Project.prepend_mod_with('Project')`）が、この
   FOSSチェックアウトではEEモジュールが存在しないため、未解決呼び出しのルートであって大量の誤ラベル付け元では
   ない── このスコープでは主要なドライバーではない（これに根ざしたサンプルチェーンはない）。

## 6. エンジン計画への含意（データであり、コミットメントではない）

- **モジュールシングルトンの解決（ADR-57の将来スライス）**には、名前が付き数え上げ可能なGitLabでの
  ペイオフがある: `Feature.enabled?/disabled?` 695サイト ＋`Gitlab::Utils`／ファサードのファミリー。
  このコーパスで観測されたなかで、おそらく最も高いエンジン作業対サイト比。
- **ARプラグインのstructure.sqlサポート**が最上位のプラグイン作業項目。これなしでは、Mastodon/Redmineとの
  あらゆるAR比較が構造的にGitLabに不公平となる。
- **ADR-82 G2は2つ目のコーパスでも未修正のまま**: ユーザーが対処可能な2つの原因は、150kの穴に対して
  ゼロ発火した。gem/DSLの帰属が記録されるまで、`tractability`のラベルは実アプリのユーザーにとって
  無情報のままである（ADR-82 WD4のプラグインごとのフォローアップ ＋ オプトインのADR-10を要求しない
  `external_gem_without_rbs`記録階層）。
- **オンボーディングのガイダンス**: ローカルな`gems/*`を持つモノレポには、`rigor-project-init`が
  それらを`paths`に追加するよう提案すべきである── 純粋なconfigで、ファーストパーティのユーティリティ型付けを
  即座に回復する。
- 由来の完全性（73.8%）はMastodonのWD8後（約74%）と一致する── ADR-82の配線は一般化する。残った
  原因なしのバケットは、同じyield/super/block＋cvar/gvarの下限である。

## 付録: 未保護サイト数によるトップ10ファイル

| 未保護 | 合計 | 比率 | ファイル |
| ---: | ---: | ---: | --- |
| 1,157 | 1,504 | 0.231 | app/models/project.rb |
| 924 | 1,200 | 0.230 | app/models/merge_request.rb |
| 783 | 1,104 | 0.291 | app/models/user.rb |
| 596 | 807 | 0.262 | app/models/ci/pipeline.rb |
| 493 | 638 | 0.227 | app/models/ci/build.rb |
| 440 | 542 | 0.188 | app/services/notification_service.rb |
| 370 | 470 | 0.213 | lib/gitlab/gitaly_client/commit_service.rb |
| 355 | 449 | 0.209 | app/models/repository.rb |
| 350 | 461 | 0.241 | app/models/group.rb |
| 343 | 473 | 0.275 | app/models/merge_request_diff.rb |

実行メタデータ: rigorブランチ`cache/schema-marker-and-compaction-hardening` @ 0f566a87、GitLabチェックアウトは
2026-07-08にオンボードしたもの、コマンド`rigor coverage --protection --format json app lib`、ウォームキャッシュ、単一
プロセス。`analyzer_budget_cutoff`はプロジェクト全体でちょうど3サイトで発火した。
