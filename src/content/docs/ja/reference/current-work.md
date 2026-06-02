---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "7b2131d0182b6c75d6a54f2239bc194ae8b46565bdb3dc2f3e27d586fcf04562"
sourceCommit: "d5d6614800bfc53f00e23b51f4c914d0e42f237f"
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

**進行中（v0.1.15以降、`[Unreleased]`に蓄積中）: プラグイン契約のインターフェース分離（ADR-37 / ADR-38）——リリースゲート充足**。 1.0前のプラグインメカニズムレビューが、2つの太いプラグインフック（`flow_contribution_for`・`diagnostics_for_file`）を、狭く・宣言的にゲートされ・エンジンがインデックス化し・インターフェースごとにテスト可能な拡張サーフェス（PHPStanスタイル）へ分割する大規模なリファクタリングを促した。これにはプラグイン横断のボイラープレートを削る作成者ヘルパー層が伴う。**リリースゲートは現在クローズ済み:**バンドルされた14個の診断発行プラグインはすべて`node_rule`へ移行された（最後の`rigor-actionpack`は`NodeContext.ancestors`経由で、ゴールデンマスタースペックをグリーンにして着地）。スライス2（`dynamic_return`／`type_specifier`）はきれいに収まるコンシューマーを担い、スライス3は`rigor plugins --capabilities`カタログを出荷し、**ADR-37 / ADR-38はAccepted**である。残るのは非ゲートのエルゴノミクスのフォローオンのみ——下記のブランチDを参照。

## 復帰する実装者のための読書順

`make verify`はクリーン。**`[Unreleased]`は、現在ほぼ完成したプラグインメカニズムのインターフェース分離作業を保持している**（ADR-37 / ADR-38——§「Status」を参照）。リリースゲートは充足され、ADRはAcceptedである。下記のブランチDは残余の（非ゲートの）エルゴノミクス、ブランチA〜Cはその他のキューされたトラックである。

### ブランチD — プラグインインターフェース分離（ADR-37 / ADR-38）: リリースゲート完了、残るはエルゴノミクスのみ

着地済みと残りの全体像は[`docs/ROADMAP.md`](../roadmap/) §「Plugin contract — interface segregation + ergonomics (ADR-37 / ADR-38) — RELEASE GATES MET」にある。1画面サマリー:

- **着地済み**（`[Unreleased]`）: ADR-38の`additional_initializers:`（Accepted、def形式）;作成者ヘルパー層（`Source::Literals`・`Diagnostic.from_node`／`from_location`・`Base#diagnostic`）;ADR-37スライス1/1c/1d（`node_rule`エンジン所有ウォーク + `node_file_context` + `NodeContext`）と、`diagnostics_for_file`ウォーカーから移行された**バンドルの14個の診断発行プラグインすべて**——`rigor-actionpack`（最後;4フェーズ、名前空間修飾に敏感、コントローラー名を`NodeContext.ancestors`から再導出、ゴールデンマスタースペックグリーン）がセットをクローズした;スライス2（`dynamic_return` + `type_specifier`） + 3つのコンシューマー（mangrove / minitest / rspec-matcher）;スライス3（`rigor plugins --capabilities`カタログ）。**ADR-37 Accepted**。
- **残り（すべて非ゲート、需要駆動;それぞれが独自の振る舞いを保存するスライス——コミット前に検証）:**ボイラープレートのフェーズ0c（`Base.suggest`／SpellChecker——**着地済み**、statesman/rails-routes/activerecordのlevenshteinコピーを退役;自己チェックの同名衝突を避けるためのクラスメソッド）、サンプルプラグイン`rigor-lisp-eval`／`rigor-pattern`（`node_rule`へ**着地済み**、手書きの`Walker`を削除——SKILL整合性のギャップはクローズ）、0d（`config_schema`の`{kind:,default:}`デフォルト——小さなADRが必要、約17プラグイン）、0e（`Plugin::Inflector`——**[ADR-39](../adr/39-plugin-target-library-invocation/)経由で着地済み、Accepted:**許可リスト+rescueハーネスの背後で実際の`ActiveSupport::Inflector`を呼び出し、3つのコンシューマーすべてを移行、Redmine+Mastodonでバイト単位同一;**残り:** ADR-39スライス3（プロジェクト独自の語形変化のための`config/initializers/inflections.rb`の静的取り込み） + ADR-39スライス5（**選択可能な分離戦略**——`Plugin::Isolation`: `RIGOR_PLUGIN_ISOLATION`／`.rigor.yml`の`plugins_isolation:`経由で`none`／`ruby_box`／`process`、**3つすべて着地、`process`がデフォルト**（一度だけforkして再利用、クラッシュ封じ込め;`fork`なしでは`none`にフォールバック）。デフォルトはRedmine + 全スペックスイートでバイト単位同一、segfaultなしと検証済み;`ruby_box`はゲート付き実験的で、上流`Ruby::Box` VMのsegfaultでブロック中。残り: 正確なgemバージョンのロード + Rackカタログを`Isolation`経由でルーティング））;`Source::Literals`のシンボル専用バリアント;`dynamic_return`の一般化（脱出弁コンシューマーの移行パス）;ADR-38ブロック形式;`NodeRuleTest`／`DynamicReturnTest`ハーネス。
- **明示的にスコープ外**（現状維持）: 脱出弁コンシューマー（sorbet/activerecord/activestorage/rspec-let——`flow_contribution_for`は、それらのメソッドゲート戻り値／動的レシーバー形状に対する、サポートされた非推奨バルブ）、純粋なFactProviderプラグイン（dry-*/graphql）、hanami/web（ADR-28ベース、別軸）。
- **検証規律**（確立された移行パターン、残りのボイラープレートスライス向け）: それぞれが振る舞いを保存する——変更したプラグインの`spec/integration/plugins/<id>_plugin_spec.rb`を実行し、その後（Flake内で）`make verify`をコミット前に実行;解析器／メインプラグインの分割は`Analyzer.diagnose` → `Analyzer.*_violations_for`（ノードごと、ウォークなし）で位置情報のない`Violation`を返し、メインプラグインが`node_rule` + `Base#diagnostic`経由でラップする。

これらすべての動機となった1.0前レビュー: [`docs/design/20260601-plugin-mechanism-pre-1.0-review.md`](../design/20260601-plugin-mechanism-pre-1.0-review/);フェーズ別計画: [`docs/design/20260602-plugin-boilerplate-reduction-plan.md`](../design/20260602-plugin-boilerplate-reduction-plan/)。

### ブランチA — v0.2.0評価リリース

v0.1.12はv0.2.0の強いRCポスチャーでプレビューラインを残す。残りのゲートは[`docs/ROADMAP.md`](../roadmap/) §「v0.2.0 — 最初の評価リリース」に記載された3つ:

1. ADR-2プラグイン契約サーフェス（surface）が、このモノレポ外の外部`rigor-*` gemをサポートできるほど安定化されている。
2. subtree-split / RubyGems公開フローが少なくとも`rigor-rails`ファミリーに対して行使されている。
3. SKILLトリオが出荷済み（v0.1.9、✓）。

ゲート3は充足済み。ゲート1と2は明示的な計画が必要 — どのスライスでも良いわけではない。99.2%のMastodonエラー削減 + 全3件のG2ケースクローズのストーリーは、このカットの公表タイミングとして十分なものだ。

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
