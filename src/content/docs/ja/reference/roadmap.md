---
title: "Rigor Roadmap"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "1e3c45f2ea57efece8a180f6e39b7025f685363f795a89e332db3981f5d9b2ba"
sourceCommit: "9912e76c7eaca91151a5a172cd5dcc2ea61d8063"
translationStatus: "translated"
sidebar:
  order: 9050
---

将来を見据えたコミットメント: 何が積極的に進行中で、次に何が計画されているか、何が意図的にスコープ外か。

このファイルは**計画資料**であり、リリースログではありません。「何が出荷されたか」の記録については、[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)（アクティブな`0.1.x`サイクル）と[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)（アーカイブ済み`0.0.x`）を参照してください。

このファイルがADRまたは仕様と矛盾する場合、ADR / 仕様が拘束力を持ち、このファイルは古くなっています。

## リリース済みマイルストーン（ポインターのみ）

完全なリリースノートは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

| バージョン | リリース日 | テーマ |
| --- | --- | --- |
| v0.0.3 — v0.0.9 | 2026-05-02 → 2026-05-05 | 型語彙、推論エンジン、永続キャッシュ。[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)を参照。 |
| v0.1.0 | 2026-05-07 | 最初のプラグイン契約（6スライス（slice））;7つの動作例。`CHANGELOG.md` § `[0.1.0]`を参照。 |
| v0.1.1 | 2026-05-08 | リテラル文字列ナローイング（narrowing）の深化、クロスプラグインAPI、プラグイン作成DX。`CHANGELOG.md` § `[0.1.1]`を参照。 |
| v0.1.2 | 2026-05-09 | プラグイン例の戻り型移行、エンジン深化フォローアップ。`CHANGELOG.md` § `[0.1.2]`を参照。 |
| v0.1.4 | 2026-05-14 | ADR-10 / ADR-11 / ADR-13の延期キュー、ADR-14 `rigor sig-gen`エンドツーエンド、`Type::BoundMethod`キャリア（carrier）、18の動作プラグイン例。（v0.1.3のコミットメントエンベロープがカット前に追加のトラックを吸収し、v0.1.4として出荷。）`CHANGELOG.md` § `[0.1.4]`を参照。 |
| v0.1.5 | 2026-05-16 | ADR-15 Ractor移行エンドツーエンド（フェーズ1〜4c + 4b.x）、実世界Railsサーベイ（14プロジェクト、31,840ファイル）が本番改善を駆動（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識sigディスカバリ）、ADR-16マクロ / DSL展開基板（WD13フロアでO2をクローズ）、O4レイヤー3スライス1+2+3（`Gemfile.lock`パース + `rbs_collection.lock.yaml`認識 + 欠落gemの`:info`診断）、DEFAULT_LIBRARIESのstdlibカバレッジ拡張（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決、24の動作プラグイン例。`CHANGELOG.md` § `[0.1.5]`を参照。 |
| v0.1.6 | 2026-05-19 | ADR-12 / ADR-17 / ADR-18フロア + 動作消費者;エディタモードv1 + 言語サーバーv1/v2;ADR-20軽量HKT;エコシステムプラグイン + `rigor-rails`メタgemスキャフォールド。`CHANGELOG.md` § `[0.1.6]`を参照。 |
| v0.1.7 | 2026-05-20 | ADR-22ベースライン（baseline）メカニズム（スライス1+2） + プロジェクトオンボーディング基盤;サーベイ駆動のプラグイン / エンジン偽陽性修正;Pillar 2「あなたのspecが型である」スライス1+2+3。`CHANGELOG.md` § `[0.1.7]`を参照。 |
| v0.1.8 | 2026-05-21 | Mastodonサーベイ偽陽性削減: ADR-15フォークベースのワーカープール（アクティブな`workers > 0`バックエンド）、ADR-23 `rigor triage`診断トリアージサブコマンド、ADR-24暗黙的selfメソッド呼び出し解決。`CHANGELOG.md` § `[0.1.8]`を参照。 |
| v0.1.9 | 2026-05-23 | 指定の「最後のプレビューカット」: 外部ユーザーSKILLトリオ（`rigor-project-init`、`rigor-baseline-reduce`、[ADR-22 WD8](../adr/22-baseline-and-project-onboarding/)に基づく外部著者`rigor-plugin-author`バリアント）;ADR-22ベースラインスライス5（`rigor baseline regenerate` + `--baseline-strict` CIゲート）;v0.1.7 / v0.1.8サーベイデータによる実証的デフォルトの引き締め。`CHANGELOG.md` § `[0.1.9]`を参照。 |
| v0.1.10 | 2026-05-27 | `rigor mcp --transport stdio`（ADR-33、7つの読み取り専用ツール）;`rigor sig-gen --params=observed` attr_reader推論;`rigor coverage`精度ゲート;`rigor check --treat-all-as-inline-rbs`;`rigor-rbs-inline`プラグイン（ADR-32）;ブラウザプレイグラウンド（ADR-29スライス1〜4）;`rigor annotate`戻り型アノテーション;ADR-28パススコープのプロトコル契約 + `rigor-hanami`;定数畳み込み（Date/DateTime/Time、Math、String/Integer/Float中優先度、Hashシェイプハンドラー）;`return if @ivar.nil?` ivarガードナローイング修正。`CHANGELOG.md` § `[0.1.10]`を参照。 |
| v0.1.11 | 2026-05-27 | プラグインを`rigortype` gemにバンドル;ポータブルベースラインパス;`rigor-rails-routes`でkaigionrails conference-app + Mastodonトライアルに基づく5つの偽陽性ソースを解消（`new_` / `edit_`プレフィックス順序、匿名`get`ルート、`scope as:`プレフィックス + arity、`draw(:name)`部分的読み込み、`concern`ボディnoop、末尾オプションハッシュ +1 arityルール）;`rigor-rails-i18n`コントローラー内のレイジー翻訳キー;Railsクイックスタートマニュアル。`CHANGELOG.md` § `[0.1.11]`を参照。 |
| v0.1.12 | 2026-05-28 | Mastodon / Redmine / GitLab FOSSに対するOSSリアリズムサイクル: Mastodon`app + lib`エラー**789 → 6（−99.2%）**、Redmine**163 → 79（−51%）**、GitLab FOSS `app/{controllers,mailers,workers,services}`**〜670 → 〜140**。6つの`flow.always-truthy / always-falsey` FPパターンをクローズ（書き込み前読み取りnil、介在するメソッド呼び出し、retryエッジ、falsey-rvalue防御的初期化、極性認識ガード、ミューテーターの幅広げ）。新しいナローイングプリミティブ（`receiver[key] ||= default`、単一ホップメソッドチェーン`is_a?`）。`Class.new(Parent) { |c| ... }`と`Hash#each { |k, v| ... }`オートスプラット型付け。プラグインの包括的拡張: `rigor-rails-routes`がdevise_for / use_doorkeeper / mount / concern / with_options / member-collection-shorthand等を認識;`rigor-actionpack`のネストモジュール修飾付きフィルター & レンダー;`rigor-activerecord`のマイグレーション除外 / バーチャルテーブルモデル / Postgres配列カラム / スコープボディ解決;`rigor-actionmailer`のinclude-of-concerns;`rigor-rails-i18n`のRails同梱キープレフィックス。新しい`rigor plugins`サブコマンド。`CHANGELOG.md` § `[0.1.12]`を参照。 |

## リリース戦略 — v0.2.0への道

`0.1.x`ラインは**プレビュー**ラインです。`0.2.x`ラインは**評価**ラインを開きます — まだフォーマル / GAリリースではないが、実プロダクトでの試験デプロイを意図した最初の公式発表バージョンです。

| ライン | 役割 |
| --- | --- |
| `0.1.x` | プレビュー。v0.1.9は当初の指定「最後のプレビューカット」だったが、Mastodon / Redmine / tdiary / GitLab FOSSに対するトライアル作業が偽陽性削減サイクルを経てラインをv0.1.10 / v0.1.11 / v0.1.12まで延長した。v0.1.12はMastodon`app + lib`を6件の無関係なエラーで残す（5件はテストフィクスチャのnil-receiver + 1件はstdlib RBSギャップ）。 |
| `v0.2.0` | **最初の評価リリース**。実プロダクトでの試験デプロイを意図した最初のバージョンとして公式に発表される;評価期間を開き、外部のフィードバックを募る。 |
| `0.2.x` | 評価ライン。まだフォーマルバージョンではないが、目標は**Ractor並行性トラックを除くすべての計画された機能**を高い完成度 / 本番品質に持っていくこと。 |

### v0.1.12以降の状況

v0.1.9の「最後のプレビューカット」の意図は達成済み（SKILLトリオ、ADR-22スライス5、実証的デフォルトの引き締めが出荷）し、ラインはMastodon / Redmine / GitLab FOSSのリアリズムストーリーによって追加のトライアル駆動パッチカット（v0.1.10 / v0.1.11 / v0.1.12）を経て*延長*された。プレビューラインはv0.2.0に向けた強いRCポスチャーに今ある:

- 99.2%のMastodon FP削減が経験的に実証済み;Redmine 51%、GitLab FOSS〜80%（調査済みスコープ）。
- 全3件のフローフォールディングG2フォローアップ（`retry`、介在する呼び出し、書き込み前読み取りnil）がクローズ済み（v0.1.12）。
- `rigor plugins`有効化レディネスサブコマンドがプラグイン設定のサイレント失敗ギャップをクローズ（v0.1.12）。

残りのv0.2.0ゲートは以下に示す同じ3つ — 変わっていない。

### v0.2.0 — 最初の評価リリース

実プロダクトでの試験デプロイを意図した最初の公式発表バージョン。v0.2.0は**評価**リリースであり、GA / フォーマルバージョンではない — 評価期間を開き、外部のフィードバックを募る。ゲート条件（このリリースが吸収するv0.1.xの「今日はスコープ外」リスト）:

- ADR-2プラグイン契約サーフェスが、このモノレポ外の外部`rigor-*` gemをサポートできるほど安定化されている。
- subtree-split / RubyGems公開フローが少なくとも`rigor-rails`ファミリーに対して行使されている。
- SKILLトリオが出荷済み（v0.1.9）で、新参者がオンボーディングパスを持つ。

### v0.2.x — 高完成度の評価ライン

`0.2.x`シリーズ全体で、目標は計画された機能セットを高い完成度 / 本番品質に持っていくこと。下記§「将来のサイクル」の需要駆動バックログは、この計画の下では、オープンエンドのキューではなく**v0.2.x完成ターゲット**である — そこのすべての項目が`0.2.x`のスコープ内である、**Ractor並行性トラックを除いて**。

**Ractorは意図的に除外されている**。ADR-15のRactorワーカープールはRuby 4.0.x上で使用不可と判明した（Ruby Bug #22075に加え決定論的な`Ractor::IsolationError`）;v0.1.8のフォークベースのプールがアクティブなバックエンドだ。Ractorプールは`RIGOR_POOL_BACKEND=ractor`とADR-15 § OQ1の背後にパークされたまま;それを完成させることは`0.2.x`の目標では**ない**し、上流CRubyの修正を待つ。

## 将来のサイクル（特定のリリースにコミットされていない）

v0.1.x作業を通じて浮かび上がった項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。

### 型言語 / エンジン
- **O2 — マクロテンプレート / heredoc-Ruby展開（ADR-16）**。需要駆動の残り項目: **スライス5b**（Tier Dエンジン統合 — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド）と合成メソッドティア向けの**完全なADR-13リゾルバチェイン配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名をリゾルバチェイン経由でルーティング）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **軽量HKT（ADR-20）**。コアキャリア + パーサー + 条件文法 + 主要な`METHOD_RETURN_OVERRIDES`（`JSON.parse`、`YAML`、`Psych`、`CSV`）はすべて着地;ハンドブック第12章も出荷済み。残り（需要駆動）: スライス4（`dry-monads`の`Result[T, E]` / `Maybe[T]`、ADR-3修正が必要）、スライス5（糖衣構文`type`エイリアス）、`rigor-lisp-eval`でのパターンバインディング抽出、追加の`METHOD_RETURN_OVERRIDES`。[ADR-20](../adr/20-lightweight-hkt/)を参照。
- **`rigor:v1:conforms-to`ディレクティブ**。元々v0.1.1の「スコープ外」にキューされていた;まだオープン。メソッドパラメーターが名前付き構造インターフェースを満たす任意の値を受け付けられるようにする。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価（ADR-17）**。`pre_eval:`設定はライブ。残りの需要駆動フォローアップ: スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。（注: クロスプラグインファクト（fact）経由の呼び出しサイトごとの戻り型ルックアップはv0.1.6で[ADR-18](../adr/18-substrate-per-call-site-return-type/)を介して出荷;上記のADR-13配線は直交する「パラメータ化形パーサー」拡張。）
- **Struct / Data値fold**。[`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)（2026-05-23）の監査、type-coverage-upliftラインのPhase 5成果物。精密な`Struct` / `Data`メンバーアクセスfold（`Point = Struct.new(:x, :y); Point.new(1, 2).x` → `Constant[1]`）はディスパッチティアのエントリでは到達不能 — **新しいキャリアが2つ**必要: 順序付きメンバー名リスト（+ `keyword_init:`フラグ）でパラメータ化されたstruct-classキャリアと、`HashShape`の形をしたクラスタグ付きstruct-instanceキャリア。加えて`Struct.new`クラスボディブロックの劣化契約、位置指定vs `keyword_init:` struct、struct継承。ADR相当;不変な`Data.define`きょうだいがおそらくより良い最初のターゲット（凍結インスタンスが健全性（soundness）ストーリーを単純化する）**。リリース未確定**。`Encoding`値foldは同じ監査で*恒久的除外*として記録 — `Constant[Encoding]`キャリアがfoldできるのはごく小さなサーフェス（`.name` / `.dummy?`）のみ、実際のプログラムは`Encoding`を不透明タグとして使い、キャリア増加のコストは見合わない;`Nominal[Encoding]`が答えのまま。
- **カバレッジ認識の診断姿勢（将来のコンセプト — まだ設計されていない）**。アイデア: spec / テストカバレッジによって診断の*姿勢*を変調する — コードがテストで実行される箇所では楽観的に解析し、そうでない箇所では保守的なまま（または注意をエスカレートする）。これは[`overview.md`](../type-specification/overview/) §「偽陽性の規律」の価値（実行され、テストでカバーされたプログラムはそれ自身の正確性の証拠である）を、「動作している」ことを機械可読かつ*局所的*にすることで運用化する: カバレッジマップが、推論後の診断重要度を変調する新しいファクトソースになり、WD6パイプラインの`severity_profile`の近くに位置する — 型推論自体は変わらない。柱2（spec → 型ファクト）とは別物;これはカバレッジ → 信頼度だ**。これが設計可能になる前に解決すべき懸念:**（1）*カバレッジ ≠ 正確性* — 「実行された」は「型に関連するエッジケースが実行されアサートされた」ではないので、カバーされたコードに対する楽観的な姿勢は、テストが実行するがアサートしない実バグを抑制しうる;行カバレッジは特に弱く、分岐カバレッジはより良いが依然部分的だ。（2）2つの半分は**リスクが非対称**だ — 「未カバー → エスカレート」は再優先順位付けするだけで何も抑制しない（安全、純粋にアップサイドのみ）一方、「カバー済み → 抑制」は誤った安心のリスクを持つ;最初のスライスはおそらく未カバーの半分のみであるべき。（3）カバレッジアーティファクト（SimpleCovの`.resultset.json` / `Coverage` stdlibモジュール）はprovenance + 陳腐化処理を必要とする外部ファクトソースであり、不在または陳腐化時にフェイルソフトする。（4）[ADR-22](../adr/22-baseline-and-project-onboarding/)ベースラインとの可能なシナジー — カバレッジはどのベースラインバケットが「未テスト、ゆえに最初にレビューに値する」かをランク付けできる。ADRなし、スライスなし、コミット済みマイルストーンなし — 方向性としてここに記録。

### プラグイン / エコシステム

ガバナンス: [ADR-31](../adr/31-contribution-and-supply-chain-policy/)はプロジェクト全体の貢献・サプライチェーンポリシーである。**変更の大きさ**で貢献を整理する: 軽微で焦点の絞られた変更（バグ修正、ドキュメント改善、タイポ修正、スコープ化されたリファクター、テスト、既存バンドルプラグインのバグ修正）は任意のパスへの直接PRとして歓迎される;広範な変更（アーキテクチャ的書き換え、コードスタイル一括変更、新規アナライザー機能、新規バンドルプラグイン、ADR / 仕様の撤回）はチームが著作した実装に`Co-authored-by:`属性を付けたうえで、issue先行の提案を経る。WD2〜WD5のプラグイン固有の想定パス:（1）`gem "rigortype"`に依存する著者自身のリポジトリ内の**サードパーティ`rigor-<gem>` gem**（ADR-31 WD4 — [MPL §3.3](../LICENSE)下のLarger Work、完全サポート、デフォルトの想定）;（2）ラップ対象gemがコミュニティ認知に達したときの`Co-authored-by:`属性付き**issue経由のバンドル化昇格**（ADR-31 WD2、判断基準はWD3に従って意図的に曖昧）;エンジン / 仕様 / リファクターの提案はWD3の採用エビデンス要件を除き、同じWD2のissue駆動の形に従う。実績あるサードパーティプラグインのsubtreeマージはオプションのパスとして留保される（ADR-31 WD5） — サードパーティ著者が前提とすべきパスではない。

- **`rigor-graphql`** — 将来のスライス（需要駆動）: リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け。
- **dry-rbアダプタープラグイン（[ADR-12](../adr/12-dry-rb-packaging/)）**。**残り**: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断;需要駆動）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json { ... }`パリティ）;`rigor-dry-monads`（依然`Result[T, E]` / `Maybe[T]`キャリア決定が必要 — スライシング計画を参照）。基礎サーベイは[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)。
- **ADR-10 — gemソースからの呼び出しごとの戻り型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り型を推論すること（`mode: :full`が`Dynamic[Top]`より豊富に貢献できるように）は、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **プラグイン提供のRBSシグネチャ**。[ADR-25](../adr/25-plugin-contributed-rbs/)が提案された（2026-05-21）: オプションの`signature_paths:` `Manifest`フィールドにより、プラグインgemがRBSディレクトリを貢献でき、`Plugin::Loader`によって解決されRBS環境にマージされる。今日RBSのみのバンドルgem（`rigor-activesupport-core-ext`）を非ポータブルな`signature_paths:`パス経由で手配線することを強いるギャップをクローズする。3スライス（マニフェストフィールド + ローダー解決 + 環境マージ → `rigor-activesupport-core-ext`を些細なプラグインに変換 → `rigor-project-init` SKILLのフォロースルー）;pre-1.0プラグイン契約に加法的、v0.1.x内で安全。コンパニオンフォローアップ（別個、より小さい）: `Environment::BundleSigDiscovery`の自動検出を`vendor/bundle` / `.bundle/config`レイアウトを超えてデフォルトの`bundle install` gemパスに拡張する。
- **ADR-28パススコープのプロトコルコントラクト — オープンエコシステム項目**。`rigor-actioncable`の`#receive(data)`パラメーター型提供: `method_name: :receive, param_types: [{index: 0, type_name: "Hash"}]`のコントラクトにより、すべてのチャネルのreceiveボディ内で`data`が`Hash`として型付けされる。需要駆動。
- **インラインRBSコメント取り込み（[ADR-32](../adr/32-rbs-inline-comment-ingestion/)）— 着地済み**。3スライスすべてとWD10 CLIキャリーオーバーがv0.1.xサイクルで出荷: スライス1（エンジンフック + バンドル`rigor-rbs-inline`プラグイン） + スライス2（`（コンテンツSHA、プラグインID + バージョン + config_hash）`をキーとするファイルごとキャッシュ + envキャッシュ無効化 + 新しい`Plugin::SourceRbsSynthesisReporter`経由の`source-rbs-synthesis-failed`インフォ診断） + スライス3（プラグインREADME + ハンドブック第7章 §「RubyソースへのインラインRBS」） + 単一ファイルアドホックCI用途向け`rigor check --treat-all-as-inline-rbs` CLIフラグ。WD9のトップレベル`def`キャビアットはrbs-inline 0.14.0に対して確認済み（裸のトップレベルdefへの出力なし;エンゲージするにはクラスラップが必要）。残りの需要駆動フォローアップ: 新しい`source_rbs_synthesizer:`フックを取り巻くLSPインクリメンタルフロー統合（ADR-19 LSPロードマップ下にキュー済み）。公開APIドリフトサーフェスの全リストは`CHANGELOG.md` § `[Unreleased]`を参照。
- **`rigor-ffi`プラグインファミリー（[ADR-30](../adr/30-rigor-ffi-plugin-shape/)）**。コアの`rigor-ffi`は`ffi` gemの共通機構（`extend FFI::Library`、`attach_function`、`callback`、`typedef`、`enum`、`bitmask`、`FFI::Struct`/`Union`/`AutoPointer`/`MemoryPointer`/`Pointer`/`Function`/`Buffer`）をカバーし、tenderloveの`ffx` gemが同じDSLの厳密なサブセットを出荷しているため、ffx対象プロジェクトも追加コストなしでサポートする — さらにgemインストール時にffxが拒否する宣言を表面化する新しい`ffx.unsupported-*`診断ファミリーも提供する。ライブラリごとのサブプラグイン（`rigor-rbnacl`、`rigor-ethon`、`rigor-ffi-rzmq`、`rigor-sassc`）はDSL認識器、オプションカタログ → セッター生成、高レベルAPIのRBSリファインメント（refinement、篩型とも）を貢献する。WD9: 実装は直接の需要よりも非ユーザーオーバーヘッドゼロ（サブプラグインは解決済み依存マッチ時のみアクティブ化）によって正当化される — 想定された4つの消費者すべてで需要は弱い（sassc-rubyはEOL、typhoeus/ethonとrbnaclは特化型、ffi-rzmqはニッチ）。WD10:「バニラ」FFI gem（リテラルな`attach_function` + 薄いRubyラッパークラス）にはコアで十分であり、プラグインは不要 — 依存を宣言するだけでよい。新しいSKILL [`.claude/skills/rigor-ffi-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-ffi-plugin-author/SKILL.md)は著者を最初にカバレッジ評価へ案内し（コアで十分なときは*著者を著作から思いとどまらせる*ように設計）、残るケースをプロジェクト全体の[ADR-31](../adr/31-contribution-and-supply-chain-policy/)貢献ポリシーへルーティングする。FFI固有の追加: プラグインのgemspecでラップ対象gemのバージョン範囲をピン留めする（孤立プラグインリスクはADR-31 WD4に従いプラグイン著者の責任）。スケッチされた6スライス: コアMVP → `rigor-sassc`（経験構築） → `rigor-ethon` → `rigor-rbnacl` + `Plugin::FFI::BindingRecognizer`拡張ポイント → ffx対象検出 + 診断 → `rigor-ffi-rzmq`（ADR-10呼び出しごとの戻り型精度にゲート）。基礎サーベイ: [`docs/notes/20260525-ffi-library-survey.md`](../notes/20260525-ffi-library-survey/)。姉妹の`rigor-fiddle`プラグイン（FiddleのDSLは別個の著作を必要とするほど分岐している）はADR-30のスコープ外と明示される。スライスはスケジュールされていない。

### エディタ / IDE統合
- **LSP — 並列マルチバッファpublishのためのRactorプール**。LSP設計ドキュメントのスライス8は2つの関心事を列挙した: デバウンス（着地）AND Ractorプール統合。プール部分は需要駆動のまま — ワーカーをLSP `initialize`で1度事前ウォームしpublish全体で再利用できるよう、`Analysis::Runner`が事前ビルドされた永続的`Environment`を受け入れるリファクターが必要。ProjectContext（スライス7）はすでに読み取り専用`Cache::Store`経由でpublish + hoverにウォームEnvironmentの勝利を与える;ディスパッチ側並列性（コア全体のマルチバッファpublish）が残りのレバー。需要駆動。
- **LSP — `textDocument/definition`**（設計ドキュメントのスライス9、先送り）。`FILE:LINE`でキー化された`Reflection`側のシンボルインデックスが必要。需要駆動。
- **LSP — インクリメンタル`didChange`同期**（設計ドキュメントのスライス10、先送り）。現在、サーバーは`TextDocumentSyncKind::Full = 1`をアドバタイズするため、各キーストロークがバッファ全体を再送信する。インクリメンタル（`TextDocumentSyncKind::Incremental = 2`）はUTF-16オフセット帳簿 + 編集ごとの適用が必要。帯域幅はローカルstdioなのでコストはワイヤではなくパースにある;需要駆動。
- **LSP — まだキューされた拡張機能**（v2以降 + フォローアップ後 + ポリッシュ後）: `textDocument/codeAction`、`textDocument/rename`、`textDocument/semanticTokens`、`textDocument/inlayHint`、`textDocument/definition`（LSP v1設計のスライス9 — Reflectionシンボルインデックスが必要）、インクリメンタル`didChange`同期（LSP v1設計のスライス10 — UTF-16オフセット帳簿）、並列マルチバッファpublishのためのRactorプールディスパッチ（LSP v1設計のスライス8後半 — Runnerリファクター）、マルチルートワークスペース、TCP / Unixソケット輸送、スニペット展開、素の名前（暗黙のself）補完、シンボル補完、シグネチャ内ハイライトのための`ParameterInformation`オフセットタプルラベル、`completionItem/resolve`遅延ペイロード、プラグイン側の補完貢献。
- **エディタモードオプションB — ファイルごとの診断キャッシュ**。今日のエディタモードはオプションA（単一ファイルスコープ）を出荷: バッファのみがファイルごとの診断を生成する。オプションB（PHPStan形: プロジェクト全体の解析と1つの代入されたファイル、「編集ファイル + ディペンデントのみ再解析」）にアップグレードするには、`（ファイルダイジェスト、プロジェクトEnvironmentダイジェスト）`でキー化されたファイルごとの診断キャッシュが必要。ADR-17スライス3bのファイルごとのキャッシュディスクリプタが最も近い既存のレバー。設計: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「スコープの選択」。需要駆動。
- **CLIエディタモード — ディスクバック`ProjectScan`スナップショットキャッシュ**。実装パスは[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)に文書化。`rigor check --tmp-file=X --instead-of=Y`シェルアウトパスをターゲット: プロジェクトのプレパス出力（スキャナ + dep-sourceインデックス + プラグイン公開ファクト）を`.rigor/cache/`に永続化し、`(config + plugin manifest + project file mtime+size + pre_eval mtime+size)`でキー化することで、ウォームCLI呼び出しがプレパスをスキップできるようにする。期待される勝利: CLI呼び出しあたり-200 ms（小プロジェクト）から>-1.3秒（基板プラグインを持つ大規模モノレポ）。新しい不変条件: `Plugin::FactStore`スナップショットAPI、プラグインファクトのMarshalフレンドリーさ。5フェーズ（Marshal可能なscan / キー導出 / キャッシュプロデューサー / Runner統合 / FactStoreスナップショットAPI）。需要駆動;LSPパスはすでにエディタケースのほとんどをpublishあたり≤5 msでカバーしているので、このスライスは具体的なCLIシェルアウトのエディタ拡張が約1秒の壁をUX問題として報告したときに着手される。
- **エディタモード — プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ**。LSPパスで**着地**（v0.1.6、CHANGELOG `[Unreleased]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan`ビルダー + `Runner.new(prebuilt:)`採用パス;LSPの`ProjectContext`がスナップショットを遅延ビルドし、`invalidate!`でドロップする。CLIエディタモード（`rigor check --tmp-file`）はまだスナップショットを消費**しない**、各呼び出しが新鮮なプロセスのため — `（plugin-manifestダイジェスト、プロジェクトファイルmtime + サイズリスト）`でキー化されたディスクバックのスナップショットキャッシュが、ワンショットCLI呼び出しもプレパスをスキップできるようにする。需要駆動;LSP側の勝利が典型的なエディタ消費者。
- **エディタモード — `--also=path,path`呼び出し元宣言のディペンデント**。エディタ拡張は現在、ディペンデントを更新するためにN個の単一ファイル呼び出しを発行する必要がある。`--also`付きの単一の呼び出しがそれらをバッチする。些細なCLI拡張;設計ノートは`docs/design/20260516-editor-mode.md`。需要駆動。
- **マルチバッファエディタモード**（`--buffer A=B --buffer C=D`）。LSP v1がほとんどのユースケースでこれを置き換える（LSP `BufferTable`はすでにNバッファを保持する）;非LSPバッチツーリングには引き続き関連。需要駆動。

### パフォーマンス / スケーラビリティ
- **O4レイヤー3 — `Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング**。v0.1.5の`BundleSigDiscovery` MVPの上に座る。MVPの自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）はバージョン管理された解決テーブルになる;rigorは`Bundler::LockfileParser`出力を消費 + `ruby/gem_rbs_collection`で最適マッチバージョンをクエリする。O7の失敗メモでアンブロック（競合は今ハングするのではなく警告する）。
- **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリー;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。
- **Spec-suiteランタイムブレークダウン（2026-05-17調査;部分的に着地）**。`make verify`デフォルトが並列rspec（コミット`086e507`）に切り替わった: wall時間217秒 → 60秒（12コアで3.6×）。フォローオンサイクルが実際のボトルネックは**各`analyze(sig: …)`での呼び出しごとのRBS env再構築**であることを確認した: `Cache::Store`は`RbsDescriptor::FileEntry`ごとに`(path, sha256)`でenvをキーするため、各呼び出しの一意の`Dir.mktmpdir`ルートのsigパスが新鮮な約1.8秒のenv構築を強制した**。ヘルパー側の修正が着地**（`spec/support/runner_helpers.rb`）: コンテンツキー化sigディレクトリ + ソースのみの呼び出しに対する共有ワークスペース。`runner_spec.rb` 39.6秒 → **25.4秒孤立（-36%）**、`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。元々キューされた2つのレバーは小さな残りのヘッドルームでオープンのまま:
  - **(a) `runner_spec.rb`の例間で`Environment`を共有**、`before(:context)`または`let_it_be`形のヘルパー経由で。キャッシュキー修正が呼び出しごとのコストのsig関連コンポーネントをクリアしたので、残りの勝利はソースのみの高速パスを打つ約80%の例に対するEnvironment構築自体。例ごとのプラグイン変動は依然共有を複雑化する。需要駆動;ヘルパー側の修正がすでにほとんどのヘッドルームを吸収した。
  - **（b）インメモリ`Analysis::Runner.run_source(source:, path:, ...)`エントリーポイント**。各呼び出しでパス展開 + ワークスペースchdirをスキップ;埋め込み者（LSP / エディタモード）のための今日`Runner.new(configuration:).run`経由でルーティングされるクリーンなパブリックAPI。ヘルパー修正の上に小さなインクリメンタルなテストデルタ（約5%）だが、安定したパブリックサーフェスとして有用。需要駆動。
- **インメモリ`Analysis::Runner.run_source`エントリーポイント（パブリック + テスト専用）**。上記の「Spec-suiteランタイムブレークダウン」フォローアップ（b）と同じ項目;レガシークロスリファレンスのためにここに保持。

### Sig-gen（ADR-14）
- **`--params=observed` attr_reader / attr_writer / attr_accessorの`initialize`観測からの推論 — 着地済み**（コミット`f2aa8de`、v0.1.9サイクル）。`rigor sig-gen --params=observed --write`は、`def initialize`の`@ivar = param`代入経由で観測された呼び出しサイト引数型を`attr_reader` / `attr_accessor`メソッドに伝播するようになり、`:untyped_return`としてスキップされる代わりに具体的なユニオン（union、合併型とも）戻り型を受け取る。実装: `build_observed_ivar_map` → `collect_init_ivar_obs` → `ivar_obs_from_initialize`（+ `build_ivar_obs_type_map` / `collect_param_obs_types`）。新しいロジックはすべて`Generator`に留まり`ScopeIndexer`には触れない。TypeProfコンパチビリティスペック追加（`spec/rigor/sig_gen/typeprof_compat_spec.rb`）。
- **`--params=observed`後の残りギャップ**（需要駆動フォローアップ）: `initialize`以外のソース（DB読み込み、設定、副作用）からivarが設定される`attr_reader`は依然`:untyped_return`にフォールバック;修正は手書きのsigアノテーション。untyped受信者への深いチェーンは`rbs collection install` / ADR-10が必要。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグインが必要。
- **`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。

### ブラウザプレイグラウンド（ADR-29）

リアルタイム診断と`annotate`スタイルの型コメントを備えたCodeMirror 6エディターを持つブラウザベースのプレイグラウンド。Fly.io上の薄いRack/Puma APIとCloudflare Pagesの静的フロントエンドでバックアップされる。**スライス1〜4がv0.1.xサイクルで着地済み:** `Tempfile`per-request分離 + 64 KB上限 + CORSプリフライトを伴うバックエンド`/check`エンドポイント（スライス1）;デバウンスされたlintマーカーを持つCodeMirror 6エディター（スライス2）;`/annotate-lines`トグルビュー（スライス3）;CodeMirrorの`hoverTooltip`拡張経由の`/type-of`ホバー（スライス4）。スライス1のFly.ioデプロイ成果物（`plugins/rigor-playground/Dockerfile` + `plugins/rigor-playground/fly.toml`）とスライス2のCloudflare Pagesデプロイ設定（`plugins/rigor-playground/frontend/_headers` + `_redirects` + README）はコミット可能なconfigとして同梱される;実際の`fly deploy` / `wrangler pages deploy`ステップはクレデンシャルが必要で、いかなるランディングサイクルの一部でもない。スライス5（ruby.wasm移行）は需要駆動のまま、3つの外部条件にゲートされている（公式Ruby 4.0 WASMビルド + `prism`/`rbs`のWASMパッケージ + WASM下でのRigorテストスイートのパス）。

**ADR-29 WD4修正（2026-05-25）が有効**: バックエンドは`require_magic_comment: false`で`rigor-rbs-inline`を事前ロードする（[ADR-32](../adr/32-rbs-inline-comment-ingestion/)のWD10に従い）。`# @rbs`形コメントを持つスニペットは最初のリクエストからインラインRBSとして解析される。`index.html`のシードSAMPLEはADR-32 ascdescパターンでこれを紹介する。[ADR-29](../adr/29-browser-playground/)を参照。

### ADRにキューされたオープン研究質問
- **ADR-15 § OQ1** — Ractorごとの`Cache::Store`共有ファサード。今日各ワーカーはキャッシュから自身のRBS envを構築する;OQ1は共有可能なファサード経由でワーカー全体でインメモリenvを共有することを探る。プールのwall-clockがシーケンシャルを上回るクロスオーバー（現在は約1.3〜1.8Kファイル）を下げる。
- **ADR-13 §「オープンクエスチョン」** — 5つのコア関数（`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`）を超えるシェイプ射影サーフェスの拡張。新しいマップ型語彙を追加するときに権威的。

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（v0.1.4 → v0.1.6）:**

- **Tier 1**: [`rigor-rails-routes`](../plugins/rigor-rails-routes/)（`:helper_table`）、[`rigor-rails-i18n`](../plugins/rigor-rails-i18n/)、[`rigor-actionmailer`](../plugins/rigor-actionmailer/)、[`rigor-activejob`](../plugins/rigor-activejob/)。
- **Tier 2**: [`rigor-activerecord`](../plugins/rigor-activerecord/)（`:model_index`;アソシエーション / enum / スコープ / バリデーション / コールバック）;[`rigor-actionpack`](../plugins/rigor-actionpack/)（ルート / フィルター / レンダー / ストロングパラメーター）;[`rigor-factorybot`](../plugins/rigor-factorybot/)（フェーズ1 (a)+（c））。
- **Tier 3**: [`rigor-pundit`](../plugins/rigor-pundit/)、[`rigor-sidekiq`](../plugins/rigor-sidekiq/)、[`rigor-rspec`](../plugins/rigor-rspec/)（Pillar 2スライス1+2+3）、[`rigor-actioncable`](../plugins/rigor-actioncable/)、[`rigor-activestorage`](../plugins/rigor-activestorage/)（v0.1.5）;[`rigor-graphql`](../plugins/rigor-graphql/)（v0.1.6 — Tier 3D、スライス1+2a〜2d、4つのクロスプラグインファクト）;[`rigor-minitest`](../plugins/rigor-minitest/)、[`rigor-rspec-rails`](../plugins/rigor-rspec-rails/)、[`rigor-shoulda-matchers`](../plugins/rigor-shoulda-matchers/)（v0.1.6）。
- **オプトインバンドル**: [`rigor-activesupport-core-ext`](../plugins/rigor-activesupport-core-ext/)（オプトインRBSバンドル）;[`rigor-typescript-utility-types`](../plugins/rigor-typescript-utility-types/)（ADR-13スライス6）。
- **メタgem**: [`rigor-rails`](../plugins/rigor-rails/)（v0.1.6スキャフォールド;Tier 1+2の`add_dependency`宣言;`.rigor.yml`でのアクティベーションはプラグインごとのまま）。
- **ADR-16基板消費者（v0.1.5）**: [`rigor-sinatra`](../plugins/rigor-sinatra/)（Tier A）、[`rigor-dry-struct`](../plugins/rigor-dry-struct/)（Tier C;v0.2.0 ADR-18精度向上）、[`rigor-devise`](../plugins/rigor-devise/)（Tier B）。
- **dry-rb基礎（v0.1.6）**: [`rigor-dry-types`](../plugins/rigor-dry-types/)（`:dry_type_aliases` — 正準 + ネスト + ユーザー著作コンポジション + 推移的参照）;[`rigor-dry-schema`](../plugins/rigor-dry-schema/)（`:dry_schema_table` — 認識 + `each`リストスロット）;[`rigor-dry-validation`](../plugins/rigor-dry-validation/)（`:dry_validation_contracts` + `Contract#call → Result`のRBSオーバーレイ）。`rigor-dry-struct` v0.2.0はADR-18の`returns_from_arg:`経由で`:dry_type_aliases`を消費。

**Railsエコシステム以外（v0.1.9でランド済み）:**

- [`rigor-hanami`](../plugins/rigor-hanami/) — Hanami::ActionのためのADR-28 provide-and-check。プロトコル: `app/actions/**/*.rb`内での`#handle(Hanami::Action::Request, Hanami::Action::Response) → void`。カスタムスレイアウトのための`action_path:`で設定可能。

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`スライス3+（リゾルバメソッド型チェック;ブラケット形を超える`<Type>.array` / `<Type>!`連鎖形;文字列形`field :foo, "User"`診断;`Schema.execute(...)`結果型付け）。
- `rigor-dry-schema`スライス2+（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2+3（`:dry_schema_table`消費経由のparamsブロック型付け + `json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。
- `rigor-actioncable` `#receive(data)`パラメーター型提供強化（上記のADR-28エコシステムエントリを参照;需要駆動）。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`plugins/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。`rigor-rails`メタgemスキャフォールド（v0.1.6）はTier 1+2アンブレラのための公開可能なテンプレート — gemspec + `add_dependency`宣言はすべて整っている;野生でのアクティベーションはサブプラグインのsubtree-split + RubyGems公開を待つ。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5でリリース。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。

[ADR-18](../adr/18-substrate-per-call-site-return-type/)（基板の呼び出しサイトごとの戻り型DSL）はv0.1.6に向けて`master`に蓄積中。`Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（+ `lookup_via:`クロスプラグインファクトチャネル）を追加;`rigor-dry-struct` v0.2.0は最初の動作消費者（`rigor-dry-types`が公開する`:dry_type_aliases`経由で`attribute :city, Types::String`を`Nominal[String]`に解決）。スライス4（TraitRegistryパリティ） + 連鎖呼び出し引数抽出は需要駆動のまま。
