---
title: "サーベイコーパスの型付けホール調査 ── 32ターゲットにおけるノードごとの`Dynamic[top]`位置（2026-09-19）"
description: "rigortype/rigor docs/notes/20260919-survey-typing-holes.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260919-survey-typing-holes.md"
sourcePath: "docs/notes/20260919-survey-typing-holes.md"
sourceSha: "6108bc2114d507c6cd6f49a18c0503e1cbd214f2b91e01b5ae56708493c9261f"
sourceCommit: "0f252e3218936e8dc7004b574c709a434b996d2a"
translationStatus: "translated"
sidebar:
  order: 20266919
---

ステータス：測定メモ。Master `7836b2e7`（v0.4.x後）、worktreeブランチ`survey-typing-holes`。[`20260901-corpus-opacity-attribution.md`](../20260901-corpus-opacity-attribution/)および[`20260901-post-campaign-opacity-recheck.md`](../20260901-post-campaign-opacity-recheck/)の続編：現在のmasterで再実行された同じlensであり、これまで共有設定がなかった5つのサーベイチェックアウト（gitlab、rails、dependabot-core、mangrove、strap）へと拡張されています。

## 方法

`~/repo/ruby/rigor-survey/`下の`_`で始まらないすべてのディレクトリが、`rigor-project-init`の形状（承認／非厳格モード：`severity_profile: lenient`、検出されたスタックに一致するプラグイン ── `.rigor.dist.yml`が欠けていた9つには新しいものが与えられ、凍結されたスイープ設定を含む既存の設定は逐語的に維持）へとオンボーディングされました。3つのターゲットは、検出順序で`.rigor.dist.yml`をシャドウする過去の実験用`.rigor.yml`を保持しています（dependabot-core、mangrove、strap）；それらの実行には明示的にdist設定が渡されました（`--config` / `PROBE_CONFIG`）。

3つの測定機器があり、すべてFlake内のworktreeの`exe/rigor` / `lib`に対して実行されました：

- `rigor check --no-baseline --format json` ── 生の診断ストリーム（gitlab/mastodon/redmine/textbringerのベースラインは意図的にバイパス）。
- `hole_scan.rb` ── checkパスのファイルセット（`PathExpansion` + `exclude_patterns`、プラグイン認識`ProjectContext`環境、`discovery_seeded_scope`）に対するPrecisionScanner探索 + 分類器で、すべての`dynamic_top`および`top`ノードについてfile:line / ノードクラス / スニペットを記録。
- `probe_attrib.rb` ── 保存されていた2026-09-01の帰属プローブ（`origin/opacity-sweep-harness-20260901`）、`PROBE_CONFIG`オーバーライドを除いてバイト単位で同一。そのファイルglobは`exclude:`を無視するため（`rigor coverage`と同様）、`.`ルートのターゲットでのカウントはhole_scanのものとわずかに異なります。

成果物：`rigor-survey/_reports/typing-holes/`（`<proj>.check.json`、`<proj>.holes.jsonl`、`<proj>.attrib.json`、ドライバ、`baseline-20260901/`比較コピー）。今回はサイトごとの検証エージェントはありません ── 以下のペアレベルの主張は機器の出力であり、名指しされたソースの読解によってスポットチェックされています。

## 要約（Headline）

コーパス：**32ターゲットにわたる3,231,851の式、63.7%が正確、1,170,398の不透明サイト**（`dynamic_top` + `top`）。mailのragelテーブル定数の膨張（98%で422k式）を除外すると：**58.5%が正確** ── 9/1の再実行におけるmail以外のターゲットに対する同じlensでの56.6%に対して向上。

| プロジェクト | ファイル数 | 式数 | 精度 | 不透明 | check err/warn/info |
| --- | --: | --: | --: | --: | --: |
| gitlab | 11,688 | 1,472,166 | 59.7% | 592,385 | 157/235/4,372 |
| dependabot-core | 896 | 401,688 | 57.2% | 171,831 | 5/14/1 |
| mail | 111 | 422,090 | 98.0% | 8,421 | 5/13/1 |
| rails | 1,453 | 284,798 | 52.8% | 133,779 | 361/66/64 |
| mastodon | 1,328 | 150,532 | 56.9% | 64,797 | 10/21/2,517 |
| redmine | 351 | 130,004 | 54.4% | 59,029 | 90/21/1,610 |
| herb | 146 | 62,763 | 72.9% | 16,947 | 20/18/2,492 |
| Data-Structures-and-Algorithms-in-Ruby | 113 | 49,743 | 61.3% | 18,952 | 14/0/9 |
| textbringer | 77 | 32,923 | 66.5% | 10,682 | 57/64/5 |
| concurrent-ruby | 178 | 23,761 | 58.3% | 9,853 | 7/17/1 |
| kramdown | 55 | 21,329 | 65.6% | 7,297 | 26/15/0 |
| net-ssh | 97 | 20,716 | 58.6% | 8,511 | 9/6/2 |
| tdiary-core | 71 | 20,352 | 57.4% | 8,661 | 5/239/1 |
| Algorithms-and-Data-Structures-in-Ruby | 256 | 18,755 | 53.1% | 8,574 | 11/2/8 |
| Ruby | 188 | 17,755 | 64.2% | 6,267 | 21/0/3 |
| parser | 56 | 12,831 | 52.8% | 6,048 | 0/0/5 |
| rubocop-ast | 101 | 11,732 | 65.9% | 3,992 | 7/3/1 |
| liquid | 63 | 10,701 | 56.3% | 4,592 | 1/1/3 |
| protobuf | 24 | 10,091 | 60.2% | 4,010 | 3/0/0 |
| hamlit | 61 | 10,000 | 57.1% | 4,276 | 6/1/1 |
| haml | 52 | 8,513 | 60.3% | 3,369 | 16/3/1 |
| faraday | 33 | 5,853 | 50.7% | 2,874 | 0/0/1 |
| slim | 27 | 4,864 | 58.8% | 2,003 | 1/5/1 |
| rbnacl | 37 | 4,286 | 69.7% | 1,299 | 0/0/1 |
| mangrove | 14 | 4,054 | 37.6% | 2,528 | 0/1/1 |
| algorithms | 14 | 4,076 | 38.8% | 2,485 | 0/3/1 |
| rgl | 28 | 3,938 | 52.2% | 1,881 | 5/16/1 |
| pycall | 22 | 3,103 | 63.3% | 1,133 | 0/10/1 |
| oj | 11 | 1,650 | 69.6% | 496 | 1/0/1 |
| jbuilder | 12 | 1,481 | 48.9% | 757 | 2/2/1 |
| ox | 15 | 1,752 | 54.5% | 798 | 2/0/1 |
| numo-narray | 2 | 2,324 | 40.0% | 1,280 | 0/1/1 |
| erubi | 3 | 866 | 48.8% | 431 | 1/2/0 |
| strap | 6 | 361 | 55.7% | 160 | 0/0/4 |

## 2026-09-01の再実行との差分（ペア化された28ターゲット）

共有ターゲットのみ；9/1再実行の`rigor-lib`はここでは対象外であり、新しく設定された5つのターゲットにはベースライン行がありません。

| ターゲット | ファイル数9/1→現在 | 精度Δ | 名前付きレシーバーの不透明サイト |
| --- | --- | --: | --: |
| mastodon | 1,325→1,328 | 54.8→56.9% (+2.1) | 2,067→1,374 |
| redmine | 346→351 | 50.2→54.4% (+4.3) | 2,719→1,756 |
| herb | 42→146 | 63.4→72.9% (+9.5) | 171→609 |
| haml | 51→52 | +0.8 | 89→92 |
| Data-Structures-and-Algorithms-in-Ruby | 113→113 | +0.7 | 1,614→1,333 |
| concurrent-ruby | 178→178 | +0.5 | 446→438 |
| jbuilder | 12→12 | +0.5 | 15→17 |
| algorithms | 14→14 | **−0.7** | 46→46 |
| rubocop-ast | 101→101 | **−0.5** | 54→56 |
| その他19件 | | ±0.4 | ±30混在 |

- **`Parameters#[]`の壁は消滅した**：mastodon 496→0、redmine 581→0の名前付きペアサイト ── 9/1ランキングの#534ヘッドライン項目が着地しました。`singleton(Rails)#configuration/cache/logger`（mastodon、約200サイト）およびredmineの`singleton(*)#table_name`ファミリー（約470サイト）も同様に消滅しました。
- **redmineのARカバレッジがアンロックされた**：#569のスキーマなしゲートが修正されました ── プラグインは`db/structure.sql`（`StructureSqlParser`）および縮小されたモデルインデックスへとフォールバックするようになり、gitlab（structure.sqlのみ、11.7kファイル）は機能する`model-call`認識とカラム型を無償で獲得しました。本番で確認済み：`ProjectFeature.where`はそのテーブルへと解決されます。
- **新しい名前付きペアは下流の露出であり、リグレッションではない**。レシーバーの型付けが十分に改善されたため、以前は動的レシーバーのバケットに入っていた呼び出しが、そのレシーバーを指名するようになりました：`ActionController::Parameters?#present?/==/to_s`（`T − nil`のDifferenceレシーバー）、`ActiveSupport::BroadcastLogger#debug/error/warn`、`ActiveSupport::Cache::Store#fetch/delete`、`Rails::Application::Configuration#x`（`config.x.*`、mastodonで102サイト）。それぞれが次に浮上したレバー層です。
- **わずかな負のドリフト（−0.3…−0.7pp）**（algorithms、Algorithms-and-DS、pycall、rubocop-ast）：1桁台のシャッフル（それぞれconstant→dynamic_top約20〜30サイト）であり、9/1再実行が#537に帰属させたのと同じ誠実な拡幅ファミリーです ── もっともらしいですが、ここではサイトごとの検証は行っていません。
- **ターゲットのドリフト：** 9/1以降、いくつかのチェックアウトが移動しました ── herb 42→146ファイル（その精度向上はエンジンの改善ではなく主に*それ*によるもの）、haml 51→52、redmine 346→351、mastodon 1,325→1,328、tdiary-core 69→71。ペア化された数値は有効ですが、herbの+9.5ppはそのままではありません。

## コーパスのホールの解剖（プローブの視点）

不透明な式のノードクラス（1.17Mサイト）：`CallNode` 579k、`LocalVariableReadNode` 275k、`BlockNode` 54k、`LocalVariableWriteNode` 39k、`ConstantReadNode` 37k、`ConstantPathNode` 34k、`InstanceVariableReadNode` 27k、`IfNode` 23k、`EmbeddedStatementsNode` 21k ── コンテナ／条件付きクラスは主にミラー伝播（9/1ノートのカテゴリーG）であり、独立したホールではありません。

レシーバー階層ごとの不透明な呼び出し：**暗黙のself 236k・ 動的レシーバー285k・ 正確なレシーバーだが依然として不透明56k**。ローカル読み出し：`def_param` 150k・`assigned_local` 78k・`block_param` 46k。

### ファミリー

1. **パラメータレーンが依然として最大の単一バケット** ── `def`パラメータの不透明なローカル読み出し150k（および`assigned_local`を通じたその算術／ivarカスケード）。すべてのサーベイ設定は`parameter_inference:`をオフのままにしています（ADR-67ゲート）；このレーンは測定されたものであり、再議論されたものではありません。

2. **暗黙のselfフレームワークDSL** ── 236kの不透明な暗黙の送信。上位の名前は、どのフレームワークがホールを所有しているかのマップです：
   - Railsアプリサーフェス：`params` 11.7k、`current_user` 6.0k、`before_action` 1.7k、`render` 1.4k、`can?` 1.1k ── #534の領域、部分的に解消（Parameters#[]修正済み；`params`自体は依然として不透明）。
   - **Grape**（gitlab `lib/api`）：`expose` 3.9k、`desc` 1.4k、`requires` 1.4k、`optional` 2.2k、`route_setting` 1.5k、`params`の重複 ── プラグインが存在しません。
   - **GraphQL**（gitlab `app/graphql`）：`field` 3.4k、`argument` 1.7k ── `rigor-graphql`は存在しますが、ADR-9のファクトテーブルを記録するだけであり、DSL呼び出しサイトを型付けせず、gitlabのサーベイ設定でも有効化されていませんでした。
   - ARクラスマクロ：`scope` 2.5k、`validates` 2.2k、`belongs_to` 1.3k。
   - i18n `_`/`s_`合計4.4k。
   - Railsフレームワーク自身の内部（`rails`ターゲット）：`class_attribute` 170、`initializer` 151、`delegate` 159、`ActiveSupport.on_load` 109 ── フレームワーク自身のDSL層自体が大部分不透明です。
   - GitLab固有：`strong_memoize` 805、`feature_category` 1.3k、`not_found!` 390 ── プロジェクトDSLの領域（エスカレーションパスA：プロジェクトプラグイン）。

3. **Sorbetのsig DSLは、Sorbet型付けされたプロジェクトにおけるホールとなっている**。`sig`、`params`、`returns`、`void`、`abstract`、`override`、`type_member`、`T.*`の呼び出しは`Dynamic[top]`として型付けされます。sorbet-runtimeはRBSではなくRBIを出荷しており、`rigor-sorbet`はsig*式*を型付けすることなくカタログへとsigを消費するためです。各ターゲットの不透明サイトに占める割合：**mangrove 47%**（その*全*式の29%）、**dependabot-core 33%**（約56kサイト）、**strap 21%**。選択肢：rigor-sorbet内に最小限の`T`/`T::Sig`/`DeclBuilder` RBSバンドルを出荷するか、精度lensにアノテーションサーフェスを割り引くように教えるかです。

4. **名前付きレシーバーだが不透明なペア ── アクション可能なレーン**（コーパス全体で56kサイト、ターゲットごとの上位80ペアは`*.attrib.json`に保持）：
   - **GitLabユーティリティシングルトン**：`Feature.enabled?` 549、`Gitlab.config` 542、`Ability.allowed?` 393、`ServiceResponse#success?/message/payload/error?/[]`合計約900、`Gitlab::ErrorTracking.track_exception` 257、`CurrentSettings` 162、`Metrics.counter` 143、`Json.dump` 132、`Redis::SharedState.with` 126。
     スポットチェック：`Feature.enabled?`は`lib/feature.rb`内のリテラルな`def self.enabled?`です ── ディスパッチは解決されます（`undefined-method`診断なし）；推論された*戻り値*が型付けされていないため、呼び出しは不透明に着地します（本体はRBSを持たないgemであるFlipperに突き当たります）。このクラスタのほとんどは、ディスパッチの欠落ではなく、同じ「解決されたメソッド、Dynamicな戻り値」の形状です ── #522のレーン。
   - **Dynamicのコンテナ**：`Hash#[]` 632 + `Hash[Dynamic]#[]`/`[]=`さらに約700 ── `Hash[K, Dynamic]#[]`の伝播；起源は1ホップ上（param/ivarレーン）であり、既知の#560/#531の領域です。
   - `singleton(User)#current`（redmine）510 ── CurrentAttributesマクロ；依然として9/1からの辞退されたレバーです。
   - **`singleton(Mangrove::Result)#[]` 97**（+ `Option#[]`、`Ok/Err#[]`約30）：キャリアシングルトン上のSorbetジェネリック適用構文`Result[Ok, Err]` ── rigor-mangroveはアンラップをカバーしますが、`[]`適用はカバーしません。小さく具体的なプラグインのギャップです。
   - `singleton(Arel)#sql` 247、`Time.zone` 155、`rails`ターゲット上の`Rails.application/env/root`約180 ── フレームワーク自身のRBSの薄い箇所です。
   - `FileUtils.mkdir_p` 116 ── stdlibですが、FileUtilsのRBSはプロジェクトがそれをrequireしたときにのみロードされます；いくつかのターゲットでの誠実なロード欠落です。
   - `Proc#call` 151 ── その`call`が依然として不透明と読まれる正確な`Proc`レシーバー。コアRBSは`Proc#call`を`(*untyped) -> untyped`と宣言しているため、これはディスパッチの欠陥ではなく、誠実なuntypedレーンです。
   - kataコーパスのアクセサ（`Heap#arr` 147、`TreeNode#*`…） ── 別名によるADR-67レーン。

5. **未解決の定数**：`ConstantReadNode`+`ConstantPathNode`約71kの不透明 ── Zeitwerkの暗黙の名前空間、未宣言のgem定数、および（mangrove/dependabot上の）`T`/`T::Sig`自身。

## 新規ターゲットのスポットライト

- **gitlab 59.7%** ── これまでスイープされた最大のターゲット。Grapeがプラグインを持たず、rigor-graphqlが有効化されておらずDSL呼び出しサイトを型付けしていないにもかかわらず、精度は中盤に位置しています；ARプラグインは`structure.sql`を介してエンドツーエンドで動作します。ホールの塊はDSLのトリオ（Grape `expose`/`params`、GraphQL `field`/`argument`、コントローラー`params`/`current_user`）+ GitLab内部のシングルトンクラスタです。49のプロジェクト`.rbs`ファイルが自動検出されました（gems/*/sigサブツリー）。
- **rails 52.8%** ── プレーンなRubyとして解析されたフレームワークソース（アプリ向けのプラグインは適用されません）。それ自身のDSL層（`class_attribute`、`initializer`、`on_load`）およびそれ自身のパブリックAPI（`Rails.application`、`Rails.env`、`Mime.[]`）が、繰り返し現れる不透明な形状です。
- **dependabot-core 57.2%** ── 大規模ターゲットの中で最もクリーンな`check`実行（20の診断）：Sorbet型付けされたコードは良好にオンボーディングされます；その不透明な塊の3分の1はsig DSL自身です。
- **mangrove 37.6%** ── コーパス中で最も低い精度であり、そのほぼ半分はsigアノテーションDSL（型付けされたコード自身のセレモニー）です。そのサーフェスを取り除くと、mangroveは中盤に位置します。
- **strap 55.7%** ── 6ファイル；`rigor-activerecord`はload-error警告（`db/schema.rb`/`structure.sql`が存在しない ── アプリにDBがない）を伴って正しく縮退しました。

## 本スイープが示唆するイシュー／レバー候補

2026-09-19に提出（すべて独立）：

- **#1097（area:plugins）** ── rigor-sorbet：`sig {…}` DSL呼び出し自身を型付けする（同梱の`T`/`T::Sig` RBS）か、精度lensからそれらを除外する ── コーパス全体で約58kの不透明サイトであり、すべてのSorbet型付けされたターゲットで支配的な成果物です。
- **#1098（area:plugins）** ── rigor-mangrove：`Result[…]`/`Option[…]`シングルトン添字ジェネリック適用（約130のmangroveサイト）。
- **#1099（area:plugins）** ── rigor-grape：GrapeエンドポイントDSL用の新しいプラグイン；約10kのgitlab暗黙のselfサイト（`expose`/`requires`/`optional`/`route_setting`/`desc`/`params`）。完了 ── #1111としてマージ済み。
- **#1100（area:plugins）** ── rigor-graphql：`field`/`argument` DSL呼び出しサイトを型付けする（約5kのgitlabサイト）；プラグインはファクトテーブルを公開していますが式型付けを行っておらず、gitlabの設定でも有効化されていませんでした。#136（リゾルバ検査）に隣接。完了 ── #1106としてマージ済み。
- **#1117（area:plugins）** ── rigor-grape `desc … do`本体が`self`を`Grape::DSL::Desc::ConfigContext`に束縛。完了 ── #1118としてマージ済み。
- **#1101（area:engine）** ── `Parameters?`（Differenceレシーバー）ディスパッチ：`Parameters − nil`上の`present?`/`==`/`blank?`/`to_s`がmastodon/redmine/gitlab上で不透明と読まれる；修正された`Parameters#[]`の下の次の層。
- **#1102（area:plugins）** ── mastodon/redmine上で新たに可視化された`BroadcastLogger#debug/error/warn` + `Cache::Store#fetch/delete`のRBSサーフェスのギャップ。

意図的に提出されなかったもの：`Proc#call`の不透明度（コアRBS `(*untyped) -> untyped` ── 欠陥ではなく誠実なuntyped）、`Hash[Dynamic]#[]`ファミリー（すでに#531/#542の領域）、`singleton(User)#current`（辞退されたレバー）、およびGitLabユーティリティシングルトンクラスタ（大部分が解決されたメソッドの型なし戻り値の伝播、#522のレーン）。

## 実装のフォローアップ（2026-09-20）：#1100 + #1099の測定

2つのDSLプラグインのイシューが実装され、gitlab上で再測定されました（同じ設定、`severity_profile: lenient`、`rigor-graphql` + `rigor-grape`有効化；生の成果物は`_reports/typing-holes/`下の`gitlab.graphql.*` / `gitlab.grape.*`）：

| 実行 | 正確 | 精度 | lib/apiホール |
| --- | --- | --- | --- |
| ベースライン | 878,626 / 1,472,166 | 59.68% | 62,091 / 169,043 |
| + rigor-graphql (#1106) | 887,957 | 60.32% | 62,062 |
| + rigor-grape (#1111) | 911,416 | **61.91%** | **47,783** |

graphql実行に対するlib/apiのホール名の差分：`params` −2,288、`expose` −2,171、`optional` −1,775、`route_setting` −1,337、`requires` −1,276、`desc` −1,064、`detail` −1,034、`Grape`定数読み出し −807、動詞マクロ 各−0.5k。導入された新しい診断：`app/graphql/resolvers/`における3つの`call.possible-nil-receiver`警告（`[…].compact.min`が`limit <= 0`に供給される ── FPではなく、誠実なnil許容の露出）。

lib/apiで依然として不透明と読まれるもの（保留中、すべてプラグインマニュアルに文書化）：`desc … do`本体（DescContainerの`detail`/`success`/`tags` ── +0の`detail`/`tags`残差）、`helpers do … end`本体（匿名モジュールの`self`）、ヘルパーが提供する送信（`current_user`、`user_project`、`find_*`）、および値レベルの`present`/`declared`結果。

測定が露出しブランチが担う2つの基盤の修正：`BlockAsMethod`の`self_type:`文法が名前付きクラス束縛（`"Grape::Validations::ParamsScope"`、`"singleton(Grape::API::Instance)"`）を獲得し、両方の祖先探索（ADR-43ブリッジと新しいマクロナローイング）が書かれたままのスーパークラス名を`ancestor_name_candidates`を通じて解決するようになりました ── 生のテーブルルックアップは`class AccessRequests < ::API::Base`スタイルのルート付きの記述で失敗しており、これはgitlabで支配的な形状でした。

## マージ後のコーパススイープ（2026-09-20）：#1106 + #1111 + #1118が着地

両方のプラグインPRはマージ前に（Codexを通じた）GPT-5.6-Sol敵対的レビューを通過しました；レビューで確認された発見事項 ── 実行時と不一致の戻り値型、サポート対象バージョンに存在しないメソッド、およびブリッジされた祖先がより近いソース定義メソッドをシャドウしていたRBSブリッジ優先順位バグ ── は修正され、上流で再検証されました。フォローアップのパスにより`desc … do`本体が`Grape::DSL::Desc::ConfigContext`へと束縛され（#1117、#1118としてマージ）、grapeの実行が残した最大の保留クラスタが解消されました。

完全な32ターゲットのコーパスがマージ後のmaster（`faae6273`、成果物`*.merged.*`）のworktreeで再実行され、その後gitlabが`desc`修正（`gitlab.descfix.*`）を伴って`9ec52001`で再び再実行されました：

| スコープ | ベースライン | マージ後 |
| --- | --- | --- |
| コーパス精度 | 63.67% (2,057,615 / 3,231,851) | **64.80%** (+1.13pp) |
| コーパス不透明サイト | 1,170,398 | **1,133,693** (−36,705) |
| gitlab精度 | 59.68% | **62.08%** (+2.40pp) |
| gitlab lib/apiホール | 62,091 | **44,553** (−28.2%) |

`desc`束縛単独でlib/apiホールが48,811 → 44,553へと移動しました；回復したすべての名前はConfigContextセッター（`is_array` −181、`success`/`failure`/`tags`/`hidden`ファミリー 合計約−1,900）であり、新しいホール名はゼロ、同一の診断数（4,773 ── FPなし、失われた警告なし）でした。スイープ内のgitlab以外の差分は、国勢調査（census）とマージ後のworktreeの間に着地した他のmasterコミットから来ています。

残りのレバー（測定された順序）：#1097（Sorbet `sig` DSL、約58kのコーパスサイト ── 最大の単一成果物）、#1101（Differenceレシーバーディスパッチ）、#1102（BroadcastLogger / cache-store RBSのギャップ）、#1098（mangroveジェネリクス）。

## 本ノートが主張しないこと

- 今回のラウンドでは、サイトレベルの原因割り当ては同一ファイルコントロールで再検証されていません（9/1スイープの検証済みメカニズムマップは依然として有効です）；ファミリーバケットは機器の出力として扱ってください。
- hole_scanは`exclude:`を適用し（checkセマンティクス）；probe_attribは適用しません（coverageセマンティクス） ── 2つのファイルセットは`.`ルートのターゲットでわずかに異なります。
- プローブはターゲットごとに最大80ペア／ペアあたり3つの例を記録します ── それを超える末尾は`*.holes.jsonl`にのみ存在します。
- パースエラーはターゲット自身のものである：コーパス全体で15ファイル（kataリポジトリのRuby 2.x時代の構文、2つのjbuilderファイル、1つのredmineマイグレーション）。
- 測定機器の保存：本レポートのスクリプトと生の出力は`rigor-survey/_reports/typing-holes/`に存在します；スキャンはworktreeブランチ`survey-typing-holes`（master `7836b2e7`）で実行され、来歴（provenance）は成果物ごとに記録されています。
