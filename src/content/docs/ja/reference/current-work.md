---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "d4d7be6696b5850ece8340eecf4eb8bac8311a21c31d411c7520fb1cd386f5fc"
sourceCommit: "0af2862f84982d9cfad4a1c0619340e15ba2f1bc"
sourceDate: "2026-05-28T23:05:38+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.15リリース済み（2026-05-29）**。プレビューラインはv0.1.12のOSSリアリズムカットの後、さらに3つのパッチカットで延長された:

- **v0.1.13** — AI支援オンボーディング（`rigor skill`） + 単一ファイルスクリプト解析: `call.unresolved-toplevel`（[ADR-34](../adr/34-toplevel-unresolved-self-call-default/)） + `pre_eval:`プロジェクトモンキーパッチ事前評価メカニズム（[ADR-17](../adr/17-monkey-patch-pre-evaluation/)）。
- **v0.1.14** — 機械可読インストールガイド（`docs/install.md`、[ADR-27](../adr/27-tool-distribution-model/)）;`rbs collection install`後の`RBS::DuplicatedDeclarationError`修正。
- **v0.1.15** — リスコフのオーバーライド互換性診断ファミリー（`def.override-*`、[ADR-35](../adr/35-override-signature-compatibility/)、スライス1〜4）;`rigor plugin`ソースブラウジングコマンド;未インストールのプロジェクトモンキーパッチ / 生成DSLに対するより鋭い未定義メソッド報告。

`bundle exec rake release`が各回で実行済み;gemはRubyGems上にある。バージョンごとの詳細は`CHANGELOG.md` § `[0.1.13]` / `[0.1.14]` / `[0.1.15]`にある。v0.1.12カット時点の累積サーベイ結果（v0.1.13〜v0.1.15は新しいフルサーベイを実行せずオンボーディングと`def.override-*`ファミリーを追加したため、依然これがヘッドラインのリアリズム数値。ただしADR-35スライス4はMastodonコーパスを再検証した）:

v0.1.12カット時点の累積サーベイ結果:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

Mastodonの残り6件のエラーはすべてエンジン精度とは無関係: 5件はテストフィクスチャ内のnil-receiver + 1件は上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（narrowing）ギャップ（[`docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md`](../notes/20260528-rbs-upstream-pr-resolv-typeclass/)を参照）。

**進行中（v0.1.15以降、`[Unreleased]`に蓄積中）: プラグイン契約のインターフェース分離 + エルゴノミクス（ADR-37 / ADR-38 / ADR-39）——リリースゲート充足**。1.0前のプラグインメカニズムレビューが、2つの太いプラグインフック（`flow_contribution_for`・`diagnostics_for_file`）を、狭く・宣言的にゲートされ・エンジンがインデックス化し・インターフェースごとにテスト可能な拡張サーフェス（PHPStanスタイル）へ分割する大規模なリファクタリングを促した。これにはプラグイン横断のボイラープレートを削る作成者ヘルパー層が伴う。**リリースゲートはクローズされ、3つのADRが批准された（37/38/39 Accepted）:**
- **ADR-37/38**——バンドルされた14個の診断発行プラグインはすべて`node_rule`へ移行された（最後の`rigor-actionpack`は`NodeContext.ancestors`経由）;スライス2（`dynamic_return`／`type_specifier`）はきれいに収まるコンシューマーを担う;スライス3は`rigor plugins --capabilities`を出荷;ADR-38の`additional_initializers:`（def形式）。
- **ADR-39（今サイクルで新規）——プラグインは信頼されたターゲットライブラリの純粋な許可リスト済みメソッドを直接呼び出せる**（PHPStanスタイル）、**選択可能な分離戦略**を伴う（`Plugin::Isolation`: `none`／`ruby_box`／`process`、**`process`がデフォルト**——forkされた永続ワーカー、クラッシュ封じ込め、`fork`なしでは`none`にフォールバック）。実証コンシューマー`Plugin::Inflector`（実際の`ActiveSupport::Inflector`）——`rigor-rails-routes`／`activerecord`／`actionpack`／`actionmailer`／`factorybot`が手書きの語形変化から移行;Redmine + Mastodon + 全スペックスイートでバイト単位同一と検証済み。`Base.suggest`（DidYouMean）がlevenshteinコピーを退役させた。`activesupport` + `rack`が`rigortype`の**dev**依存として追加された（prod依存は各プラグインgemに属する）。`ruby_box`戦略はゲート付き実験的——上流`Ruby::Box` VMのsegfaultでブロック中（バグレポートのドラフトは[`docs/notes/20260602-ruby-box-segfault-bug-report.md`](../notes/20260602-ruby-box-segfault-bug-report/)）。
- **ドキュメント反映**: `docs/internal-spec/plugin.md` + 両方の`rigor-plugin-author` SKILL（gem同梱の`skills/` + リポジトリ内の`.claude/skills/`）がADR-37の狭いプロトコル + ADR-39のターゲットライブラリルールを教える。

残るのは非ゲートのエルゴノミクスのフォローオンのみ——下記のブランチDを参照。

## 復帰する実装者のための読書順

`make verify`はクリーン。**`[Unreleased]`は、現在ほぼ完成したプラグインメカニズムのインターフェース分離 + エルゴノミクス作業を保持している**（ADR-37 / ADR-38 / ADR-39——§「Status」を参照）。リリースゲートは充足され、3つのADRすべてがAcceptedである。下記のブランチDは残余の（非ゲートの）エルゴノミクス——最大の2つのボイラープレート項目は完了した: **0a（`Source::Literals`）着地済み**（グリッド完成 + 10プラグイン + 1例が移行）と**0d（`config_schema`デフォルト、[ADR-40](../adr/40-config-schema-defaults/)）着地済み**（メカニズム + 13プラグインが`DEFAULT_*`から移行）。ブランチDに残るのはより小さく需要駆動のもの（ADR-39の語形変化フォローオン、`dynamic_return`の一般化、ADR-38ブロック形式、インターフェースごとのテストハーネス）。ブランチA〜Cはその他のキューされたトラックである。**次セッションのエントリーポイント: 残りのブランチD項目は独立した需要駆動スライス;より大きな戦略的レバーはブランチAの単一の残りゲート——v0.2.0ゲート1、*外部*のサードパーティ`rigor-*` gemのためのプラグイン契約安定化である（サブツリー分割／公開ゲートは単一バンドルgemモデルに置き換えられた）。これはもう1つの漸進的スライスではなく明示的な計画を必要とする**。

### ブランチD — プラグインインターフェース分離（ADR-37 / ADR-38）: リリースゲート完了、残るはエルゴノミクスのみ

着地済みと残りの全体像は[`docs/ROADMAP.md`](../roadmap/) §「Plugin contract — interface segregation + ergonomics (ADR-37 / ADR-38) — RELEASE GATES MET」にある。1画面サマリー:

**今サイクルで着地**（すべて`[Unreleased]`内;完全な詳細はROADMAP §「Plugin contract … RELEASE GATES MET」 + CHANGELOG）:
- ADR-37/38のnode_rule移行（14個のウォーカープラグインすべて、`rigor-actionpack`が最後） + スライス2（`dynamic_return`／`type_specifier`） + スライス3（`rigor plugins --capabilities`）;両ADRがAccepted。
- **ADR-39**（ターゲットライブラリ呼び出し、Accepted）: ルール + 実際の`ActiveSupport::Inflector`上の`Plugin::Inflector` + `Plugin::Isolation`の選択可能戦略（`none`／`ruby_box`／`process`、**`process`デフォルト**、一度だけforkする永続ワーカー、クラッシュ封じ込め、forkなしでは`none`フォールバック） + `Plugin::Box`（`ruby_box`ラッパー）。移行されたコンシューマー: rails-routes／activerecord／actionpack／actionmailer／factorybot。`rigor-rspec-rails`は`have_http_status`を実際の`Rack::Utils`テーブルに対して検証する。
- **ボイラープレート0c**——`Base.suggest`（DidYouMeanクラスメソッド）がlevenshteinコピーを退役させた（statesman／rails-routes／activerecord）。
- **ボイラープレート0b/c採用**——`Diagnostic.from_node`／`from_location`がプロダクション解析器（activerecord／activestorage／hanami／sorbet）で採用された;例プラグイン自身の`def diagnostic`が削除された（pattern／routes → 継承された`Base#diagnostic`;web → `from_location`）。例の`rigor-lisp-eval`／`rigor-pattern`も`node_rule`へ移行された（手書きの`Walker`を削除）。
- ドキュメント: `plugin.md` + 両方の`rigor-plugin-author` SKILLがADR-37 + ADR-39向けに更新された。

**残り（すべて非ゲート、需要駆動;それぞれが独自の振る舞いを保存するスライス——コミット前に検証）:**
1. **ボイラープレート0a——`Source::Literals`採用——着地済み**。前提条件のシンボル専用 + String返却バリアントが出荷された（抽出グリッドは両軸にわたって完成: `symbol`／`symbol_name`／`symbol_or_string_name` + 元の`symbol_or_string`、公開APIドリフトスペック + RBSシグで固定）。10個のバンドルプラグイン + 1個の例がヘルパーへ移行された（statesman／rspec／activestorage／factorybot／actionpack／rails-routes／graphql／actionmailer／dry-schema／activerecord + patternの例）、各々ゴールデンマスタースペックに対して振る舞いを保存;`make verify`クリーン。**残りのテール（需要駆動）:** assocキーの*名前一致*イディオム（`el.key.is_a?(SymbolNode) && el.key.unescaped == "x"`）は値抽出ではなくキー比較である——4ヘルパーグリッドの外;専用の`symbol_named?(node, name)`ヘルパーがそれを吸収できるが、独自のスライスである。
2. **ボイラープレート0d——`config_schema`の`{kind:, default:}`——着地済み（[ADR-40](../adr/40-config-schema-defaults/)）**。 `Base#config`がユーザー設定の下にマニフェスト宣言のデフォルトをマージする;13個のバンドルプラグインが`DEFAULT_*`定数イディオムから移行された（statesman／pundit／actioncable／activejob／sidekiq／actionpack／activestorage／factorybot／rails-i18n／actionmailer／activerecord／rails-routes／sorbet）、各々振る舞いを保存;`make verify`クリーン。動的デフォルト（sorbetの`paths`）は設計上`fetch`-with-defaultのまま。**残りのテール（需要駆動）:** `rigor-playground`コマンド（チェッカープラグインではない）と、同じ形式に乗る将来の設定可能なプラグイン作成者。
3. **ADR-39フォローオン:**スライス3（プロジェクト独自の語形変化のために`config/initializers/inflections.rb`を静的取り込み——ASデフォルトルールセットが一般的なケースを既にカバー;未解決の設計点は長命なLSPプロセスにおけるプロジェクトごとのルール分離）;`rigor-rspec-rails`のRackカタログも`Isolation`経由でルーティング（低価値——一度きりのフェッチ）;最大忠実度の正確なgemバージョンのロード（ターゲットの`Gemfile.lock`に固定されたワーカー）;分離パフォーマンスチェック（大規模プロジェクトでの`process`デフォルト下のコールごとIPC） + ADR-15のforkバックエンド内でのforkのネスト。
4. **`dynamic_return`の一般化**（オプションの`methods:`ゲート／動的レシーバー述語）——脱出弁コンシューマーを`flow_contribution_for`から移行するパス。
5. **ADR-38ブロック形式**の`additional_initializers`（ivar書き込みが呼び出しブロック内に存在するrspecの`before`／`let`）——ivar書き込み収集器が宣言された呼び出しブロックへ降りていく必要がある。
6. **インターフェースごとのテストハーネス**（`NodeRuleTest`／`DynamicReturnTest`）。
- **明示的にスコープ外**（現状維持）: 脱出弁コンシューマー（sorbet/activerecord/activestorage/rspec-let——`flow_contribution_for`は、それらのメソッドゲート戻り値／動的レシーバー形状に対する、サポートされた非推奨バルブ）、純粋なFactProviderプラグイン（dry-*/graphql）、hanami/web（ADR-28ベース、別軸）。
- **検証規律**（確立されたパターン）: それぞれが振る舞いを保存する——変更したプラグインのゴールデンマスター統合スペック（**プロダクションプラグイン**は`spec/integration/plugins/<id>_plugin_spec.rb`下;**例**は`spec/integration/examples/<id>_plugin_spec.rb`下）を実行し、その後（Flake内で）`make verify`をコミット前に実行。今サイクルのボイラープレート一掃からの2つの教訓: （i）すべての`start_column+1`が`Rigor::Analysis::Diagnostic`の慣習であるわけではない——`rigor-rspec`の`Analyzer::Diagnostic`はローカルの`Struct`、`rigor-actionmailer`のそれは発見インデックスの`def_column`なので、差し替える前に構築されるクラスを確認すること;（ii）プラグインごとのrescue境界が、発生した移行バグを「0診断」へ飲み込むので、それを捕まえるのはゴールデンマスタースペックである——常に実行すること。

これらすべての動機となった1.0前レビュー: [`docs/design/20260601-plugin-mechanism-pre-1.0-review.md`](../design/20260601-plugin-mechanism-pre-1.0-review/);フェーズ別計画: [`docs/design/20260602-plugin-boilerplate-reduction-plan.md`](../design/20260602-plugin-boilerplate-reduction-plan/)。

### ブランチA — v0.2.0評価リリース

v0.1.12はv0.2.0の強いRCポスチャーでプレビューラインを残す。ゲートは[`docs/ROADMAP.md`](../roadmap/) §「v0.2.0 — 最初の評価リリース」に記載されており、**3つから2つに削減された**:

1. **ADR-2プラグイン契約サーフェス（surface）が、外部`rigor-*` gemをサポートできるほど安定化されている**（[ADR-31](../adr/31-contribution-and-supply-chain-policy/) WD4に基づく、`gem "rigortype"`に依存する独自リポジトリのサードパーティgem）——外部著者向けのオンボーディングパスと、ツリー外プラグインがロードされ実行されるテストを伴う。**実行可能な証拠が着地**（`spec/integration/external_plugin_spec.rb` + `spec/fixtures/external_plugin/`フィクスチャ）: 公開サーフェスのみ（`node_rule`／`#diagnostic`／ADR-40の`config_schema`デフォルト／`Source::Literals`）に依存するツリー外プラグインが、**実際の`require`**経由でロードされエンドツーエンドで実行される——外部契約の常設ドリフトガード。付随する**構造ガード**（`spec/integration/all_plugins_load_spec.rb`）はすべての`plugins/*`と`examples/*`ディレクトリを列挙し、各々がロードされ有効なマニフェストのプラグインを登録することを表明するので、バンドルされたプラグイン（や将来の追加）がロード／登録チェックを免れることはない。**デモのノークラッシュガード**（`spec/integration/demos_run_spec.rb`）はすべての`*/demo/`プロジェクトを実際の`rigor check`下で実行し（新鮮なサブプロセス、`--no-cache --format json`）、クラッシュなし（シグナル／非`{0,1}`終了／バックトレース／非JSON）を表明する——ロケール非依存（UTF-8 + `LC_ALL=C`）と検証済み;両方とも`make test-parallel`経由でCIで実行される。外部著者SKILL（`skills/rigor-plugin-author`）がオンボーディングパスを同梱する。**完全クローズに向けての残り:**固定された名前空間に対する明示的な「公開vs内部」安定性宣言（ドリフトスペックは既にそれらを固定している;欠けているのは0.2.x内で壊れないという*文書化されたコミットメント*）——それがもう1つのテストではなく計画に値する部分だ。
2. ~~subtree-split / RubyGems公開フローが少なくとも`rigor-rails`ファミリーに対して行使されている。~~ **置き換えられた**——配布モデルは今や単一バンドル`rigortype` gem（プラグインごとのgemspecはコミット`9769f5fa`で削除;[ADR-31](../adr/31-contribution-and-supply-chain-policy/)はサブツリー分割をデフォルトから撤回し、サブツリー*マージ*を稀な予約済みオプションとしてのみ残した）。行使すべきプラグインごとの公開フローはない;残りはゲート1（外部サードパーティパス）に畳み込まれる。
3. SKILLトリオが出荷済み（v0.1.9、✓）。

ゲート2と3は決着済み。**残る唯一の実質的なゲートはゲート1**——明示的な計画が必要で、どのスライスでも良いわけではない。99.2%のMastodonエラー削減 + 全3件のG2ケースクローズのストーリーは、このカットの公表タイミングとして十分なものだ。

### ブランチB — 残存エラーのクローズを続ける

v0.1.12時点のMastodon`app + lib`残余は6件;これらのクローズにはrails-routes反復ではなく**新しいスコープ**が必要:

1. **specフィクスチャ内の本物のnilチェーンバグ（5件）** — ほとんどが`spec/models/` / `spec/lib/`内の`*_for_nil`スタイルのフィクスチャ。本物の診断であり偽陽性ではない。Mastodon側での修正;Rigorに作業はない。
2. **上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（1件）** — `references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`がステージ済み。ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

Mastodon以外では、Redmine / GitLab FOSSの残余はより大きなサーフェス;それぞれの数値を下げたい場合は独自のサーベイサイクルが必要。

### ブランチC — サーベイに駆動されないエンジン内部項目

v0.1.12サイクルの影響を受けていないキュー済みエンジン項目:

1. **ADR-24スライス4** — 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。下記「ADR-24 — 暗黙的selfメソッド呼び出し解決、残り」を参照。
2. **ARスコープボディのラムダ`self`** — `scope :x, -> { select(...).group(...) }`のインスタンスラムダ内でラムダの`self`がモデルクラスにリバインドされる必要が依然ある。v0.1.12は通常のメソッドボディに対する暗黙的selfのクラス側解決をクローズした;ラムダボディは残る。経験的なケースは[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「何が増えているか」項目2 / ADR-26領域にある。

### 参照読書

判断に迷う場合の正規エントリーポイント:

1. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.1.12]` — v0.1.12カットの完全なリリースノート（OSSリアリズムサイクル）。
2. [`docs/ROADMAP.md`](../roadmap/) §「リリース戦略 — v0.2.0への道」— v0.2.0をゲートするもの。
3. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。v0.2.0は外部`rigor-*` gem向けにプラグイン契約サーフェスを安定化させる;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。
4. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/) — v0.2.0が安定化させなければならないプラグイン契約。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログ（エディタモード、LSP機能、dry-rb継続、ADR-10/13/16フォローアップ、パフォーマンスレバー）は[`docs/ROADMAP.md`](../roadmap/) §「将来のサイクル」にあり、v0.2.x完成ターゲット。この節はそこに捕捉されていないエンジン内部の詳細のみを保持する。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4** — 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。独自のFP評価ゲート（[ADR-24 WD4](../adr/24-self-method-call-resolution/)）— メタプログラミング密度の高いコードに対する大きな新しい偽陽性サーフェスのため、v1は意図的に精度加法的のみとした。
- **クラスボディ内の非`Bot`一般採用** — 解決されたセルフ呼び出しの戻り型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ADR-23 — `rigor triage`スライス4プラグイン認識器

残り: プラグインが自身の認識器を貢献できる`Plugin`フック（先送り）。（`Analysis::Diagnostic`の`receiver_type` / `method_name`構造化フィールドはv0.1.8で出荷;SKILL統合はv0.1.9トリオとともに出荷。）

### フローフォールディング — G1 / G2ケースがすべてクローズ済み（v0.1.12）

**ステータス: クローズ済み**。v0.1.12が残り3件のG2ケースを封入:

- **`retry`フローエッジ** — `eval_begin`がリバインドされたローカル / ivarをNominalエンベロープに幅広げ、幅広げられたエントリーでbeginボディを再評価する。
- **介在するメソッド呼び出しの無効化** — 暗黙的self / `self.foo`呼び出しが各ivarをクラス全体のシードに幅広げる。
- **書き込み前読み取りnil** — クラスivarプリパスが、同ivarへの書き込み前にメソッドボディがivarを読む場合に`nil`を貢献する（`initialize`書き込み / クラスボディレベル書き込み / 既存エントリーのみでゲート）。

この領域にキュー済み項目はない。

### Stdlib RBSカバレッジギャップパターン

上流の`ruby/rbs` RBSギャップが単一の内部Rigor呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable`ディレクティブ + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）は上流PR向けにステージされている — ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

### より小さなキュー項目

- **Sig-genの`update_existing`**は兄弟の親 / 子クラスブロックを畳み込まない。`merge_class`は各候補の`class_name`を独立して解決するため、フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするのはスコープ外;回避策はターゲットsigファイルを削除してゼロから再生成すること。
- **`Hash === expr` case-equalityナローイング**（`open3.rb:226`の形）— 引き続きオープン。
- **インメモリの`Analysis::Runner.run_source(source:, path:, …)`エントリーポイント** — `RunnerHelpers#analyze`の呼び出しごとのtmpdir + chdirをバイパスする;埋め込み者（LSP / エディタモード）向けのクリーンなパブリックAPI（約5%のspec-suite勝利）。需要駆動。
- **`--params=observed`後のSig-gen残りギャップ** — `initialize`以外のソースからivarが設定される`attr_reader`は依然`:untyped_return`を生成;修正は手書きのsigアノテーション。untypedレシーバーへの深いチェーンは`rbs collection install`またはADR-10が必要。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグインが必要。これらは`skills/rigor-project-init/references/04-sig-uplift.md` §「ステップ5-d」に記載され、`--params=observed`でもギャップが残る場合の自然な次のアクション。

### Type-coverage uplift — ライン状況（2026-05-23）

Phases 1〜4着地済み（String / Integer / Float / Comparable / Math / HashShape / Date / DateTime / Time）。残り項目はすべて**リリース未確定**:

- **Struct / Data値fold** — 先送りすべきADR相当の機能（新しいキャリア（carrier）が2つ必要）。`docs/ROADMAP.md` §「将来のサイクル」→「型言語 / エンジン」と[`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)を参照。`Encoding`値foldは同じ監査で*恒久的除外*として記録。
- **`MathFolding`結果の精緻化** — 28関数のfoldは値精確;範囲精緻化の付与（`Math.exp` → `positive-float`、`Math.sqrt` / `hypot` → `non-negative-float`）は需要駆動のフォローアップ（[`docs/notes/20260522-stdlib-deterministic-module-coverage.md`](../notes/20260522-stdlib-deterministic-module-coverage/) § 1）。
- **Hash `rassoc`シェイプ（shape）ハンドラ** — 唯一残っている低優先度Hashハンドラ（[`docs/notes/20260522-hash-method-coverage.md`](../notes/20260522-hash-method-coverage/)）;需要駆動。

## リリース後フォローアップ

- **`data/oss-sweep/mastodon-thresholds.json`** — 保存済み閾値をv0.1.12のベースライン（baseline）に対してリフレッシュし、週次OSSスイープゲートが新しい〜6ベースラインを反映するようにする。現在のファイルは未較正（`max_diagnostics: 999999`）。
