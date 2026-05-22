---
title: "Rigor Roadmap"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "22481d7976d4228f96581731aa05e0bdcd9aeac256b9cc671c0fae54d4ac12e4"
sourceCommit: "75f1372f98e9b1b00cb79a72bf925849cead6956"
sourceDate: "2026-05-21T22:31:46+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

将来を見据えたコミットメント: 何が積極的に進行中で、次に何が計画されているか、何が意図的にスコープ外か。

このファイルは**計画資料**であり、リリースログではありません。「何が出荷されたか」の記録については、[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/main/CHANGELOG.md)（アクティブな`0.1.x`サイクル）と[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)（アーカイブ済み`0.0.x`）を参照してください。

このファイルがADRまたは仕様と矛盾する場合、ADR / 仕様が拘束力を持ち、このファイルは古くなっています。

## リリース済みマイルストーン（ポインターのみ）

完全なリリースノートは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

| バージョン | リリース日 | テーマ |
| --- | --- | --- |
| v0.0.3 — v0.0.9 | 2026-05-02 → 2026-05-05 | 型語彙、推論エンジン、永続キャッシュ。[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)を参照。 |
| v0.1.0 | 2026-05-07 | 最初のプラグイン契約（6スライス）;7つの動作例。`CHANGELOG.md` § `[0.1.0]`を参照。 |
| v0.1.1 | 2026-05-08 | リテラル文字列ナローイングの深化、クロスプラグインAPI、プラグイン作成DX。`CHANGELOG.md` § `[0.1.1]`を参照。 |
| v0.1.2 | 2026-05-09 | プラグイン例の戻り型移行、エンジン深化フォローアップ。`CHANGELOG.md` § `[0.1.2]`を参照。 |
| v0.1.4 | 2026-05-14 | ADR-10 / ADR-11 / ADR-13の延期キュー、ADR-14 `rigor sig-gen`エンドツーエンド、`Type::BoundMethod`キャリア、18の動作プラグイン例。（v0.1.3のコミットメントエンベロープがカット前に追加のトラックを吸収し、v0.1.4として出荷。）`CHANGELOG.md` § `[0.1.4]`を参照。 |
| v0.1.5 | 2026-05-16 | ADR-15 Ractor移行エンドツーエンド（フェーズ1〜4c + 4b.x）、実世界Railsサーベイ（14プロジェクト、31,840ファイル）が本番改善を駆動（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識sigディスカバリ）、ADR-16マクロ / DSL展開基板（WD13フロアでO2をクローズ）、O4レイヤー3スライス1+2+3（`Gemfile.lock`パース + `rbs_collection.lock.yaml`認識 + 欠落gemの`:info`診断）、DEFAULT_LIBRARIESのstdlibカバレッジ拡張（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決、24の動作プラグイン例。`CHANGELOG.md` § `[0.1.5]`を参照。 |
| v0.1.6 | 2026-05-19 | ADR-12 / ADR-17 / ADR-18フロア + 動作消費者;エディタモードv1 + 言語サーバーv1/v2;ADR-20軽量HKT;エコシステムプラグイン + `rigor-rails`メタgemスキャフォールド。`CHANGELOG.md` § `[0.1.6]`を参照。 |
| v0.1.7 | 2026-05-20 | ADR-22ベースラインメカニズム（スライス1+2） + プロジェクトオンボーディング基盤;サーベイ駆動のプラグイン / エンジン偽陽性修正;Pillar 2「あなたのspecが型である」スライス1+2+3。`CHANGELOG.md` § `[0.1.7]`を参照。 |
| v0.1.8 | 2026-05-21 | Mastodonサーベイ偽陽性削減: ADR-15フォークベースのワーカープール（アクティブな`workers > 0`バックエンド）、ADR-23 `rigor triage`診断トリアージサブコマンド、ADR-24暗黙的selfメソッド呼び出し解決。`CHANGELOG.md` § `[0.1.8]`を参照。 |

## リリース戦略 — v0.2.0への道

`0.1.x`ラインは**プレビュー**ラインです。`0.2.x`ラインは**評価**ラインを開きます — まだフォーマル / GAリリースではないが、実プロダクトでの試験デプロイを意図した最初の公式発表バージョンです。

| ライン | 役割 |
| --- | --- |
| `0.1.x` | プレビュー。**v0.1.9は最後のプレビューカット — 未解決のプレビュートラックのコミットメントをクローズする準完成版リリース**。 |
| `v0.2.0` | **最初の評価リリース**。実プロダクトでの試験デプロイを意図した最初のバージョンとして公式に発表される;評価期間を開き、外部のフィードバックを募る。 |
| `0.2.x` | 評価ライン。まだフォーマルバージョンではないが、目標は**Ractor並行性トラックを除くすべての計画された機能**を高い完成度 / 本番品質に持っていくこと。 |

### v0.1.9 — 最後のプレビュー（準完成）

最後の`0.1.x`カット。プレビュートラックのコミットメントをクローズし、v0.2.0が準完成のベースから評価ラインを始められるようにする:

- **外部ユーザーSKILLトリオ** — `rigor-project-init`、`rigor-baseline-reduce`、そして外部著者`rigor-plugin-author`バリアント（下記§「エージェントワークフロー / SKILL」を参照;[ADR-22 WD8](../adr/22-baseline-and-project-onboarding/)）。
- **ADR-22ベースラインスライス5** — `rigor baseline regenerate`に加え`--baseline-strict` CIゲート。
- v0.1.7 / v0.1.8サイクルにわたって収集された実証的なプロジェクトサーベイデータに対するデフォルト（プラグイン / 重要度 / ベースラインルールの推奨）の引き締め。

v0.2.0評価ラインのリリース候補として扱われる: バーは「既知のリリースブロッキング欠陥なし」であり、「すべての需要駆動バックログ項目がクローズ」ではない。

### v0.2.0 — 最初の評価リリース

実プロダクトでの試験デプロイを意図した最初の公式発表バージョン。v0.2.0は**評価**リリースであり、GA / フォーマルバージョンではない — 評価期間を開き、外部のフィードバックを募る。ゲート条件（このリリースが吸収するv0.1.xの「今日はスコープ外」リスト）:

- ADR-2プラグイン契約サーフェスが、このモノレポ外の外部`rigor-*` gemをサポートできるほど安定化されている。
- subtree-split / RubyGems公開フローが少なくとも`rigor-rails`ファミリーに対して行使されている。
- SKILLトリオが出荷済み（v0.1.9）で、新参者がオンボーディングパスを持つ。

### v0.2.x — 高完成度の評価ライン

`0.2.x`シリーズ全体で、目標は計画された機能セットを高い完成度 / 本番品質に持っていくこと。下記§「将来のサイクル」の需要駆動バックログは、この計画の下では、オープンエンドのキューではなく**v0.2.x完成ターゲット**である — そこのすべての項目が`0.2.x`のスコープ内である、**Ractor並行性トラックを除いて**。

**Ractorは意図的に除外されている**。ADR-15のRactorワーカープールはRuby 4.0.x上で使用不可と判明した（Ruby Bug #22075に加え決定論的な`Ractor::IsolationError`）;v0.1.8のフォークベースのプールがアクティブなバックエンドだ。Ractorプールは`RIGOR_POOL_BACKEND=ractor`とADR-15 § OQ1の背後にパークされたまま;それを完成させることは`0.2.x`の目標では**ない**し、上流CRubyの修正を待つ。

## v0.1.6 — 2026-05-19出荷（計画エンベロープを下記に保持）

テーマ: **3つのaccepted-and-implemented ADRが、クロスプラグインファクト経由の呼び出しサイトごとの精度向上、プロジェクト側のmonkey-patch認識、基礎となるdry-rbプラグインをアンロックする — プラスエディタ / IDE統合の最初の2カット（エディタモードv1 + 言語サーバーv1）、実質的なLSP / specスイートのパフォーマンス向上、そして4つの新エコシステムプラグイン（rigor-dry-schema、rigor-graphql、rigor-dry-validation）プラス`rigor-rails`メタgemスキャフォールド**。コミット`3c99eed` → `8530856`。

スライスごとの詳細は`CHANGELOG.md` § `[Unreleased]`。v0.1.6の6トラック:

1. **ADR-12 / ADR-17 / ADR-18フロア + 動作消費者** — `rigor-dry-types`スライス1〜4（推移的を含む完全なエイリアスカバレッジ）;`rigor-dry-schema`スライス1+2（認識 + `each`リストスロット）;`rigor-dry-validation`スライス1（Contract認識 + RBSオーバーレイ）;ADR-17スライス1+2+3a+4（`pre_eval:`配管、monkey-patchレジストリ、ディスパッチャーティア、glob）;ADR-18スライス1+2+3+5（`returns_from_arg:` DSL + エンドツーエンドのdry-struct向上）;ADR-10フェーズBヒューリスティック戻り型抽出。
2. **エディタモードv1 + 言語サーバーv1/v2 + LSPのポリッシュ/パフォーマンス** — `--tmp-file`/`--instead-of`ペアフラグ + `BufferBinding`;`rigor lsp`サブコマンド（8スライスv1;[ADR-19](../adr/19-language-server-packaging/)でのパッケージング）;v2型認識hover + `textDocument/completion`;LSPフォローアップ（signatureHelp + hash-key補完 + エディタガイド[`docs/lsp-integration.md`](../lsp-integration/) + e2e spec）;LSPポリッシュ（6スライス;9機能合計）;LSPパフォーマンス三冠（`ProjectScan`プレパスキャッシュ + Environment共有 + プラグインキャッシュディスクリプタ正確性修正）。設計ドキュメント: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/)、[`docs/design/20260517-language-server.md`](../design/20260517-language-server/)、[`docs/design/20260517-lsp-hover-completion.md`](../design/20260517-lsp-hover-completion/)。
3. **エコシステムプラグイン** — `rigor-graphql`スライス1+2a〜2d（Schema::Object / Enum / InputObject / Mutation;4つのクロスプラグインファクト;Tier 3D — 最後の保留中Tier 3スロットをクローズ）;`rigor-dry-schema` 1+2;`rigor-dry-validation` 1;`rigor-rails`メタgemスキャフォールド;`rigor-minitest`;`rigor-rspec-rails`;`rigor-shoulda-matchers`。合計29の`plugins/` + `examples/`エントリ。
4. **ADR-20軽量HKT** — 32コミット;キャリア + パーサー + 完全な§ D3条件文法;`JSON.parse` / `YAML.safe_load` / `CSV.parse` / `CSV.read`の`METHOD_RETURN_OVERRIDES`;3つのユーザー著作パス（`.rbs`ディレクティブ / プラグインマニフェスト / ビルトイン）。ハンドブック第12章。[ADR-20](../adr/20-lightweight-hkt/)を参照。
5. **エンジン改善** — レシーバーアフィニティ事前ソート + `Acceptance`祖先チェーンフォールバック（BigDecimal/Numeric偽陽性 −25）;`StaticReturnRefinements`ティア;パラメータデフォルトスコープ修正（prism-1.9.0での偽陽性 −97%）;`Module.new`/`Class.new`ブロックウォーク;モジュールミックスインの`self_type`;クロスファイルクラス発見プレパス;`FlowContribution::Fact :local`;Pillar 2スライス1+2+3（rigor-rspecマッチャーナローイング + `let`/`subject`クロスバインディング + ファクトリモデルクラス）;RBSオーバーレイ（prism / bundler / rubygems / did_you_mean）。Referencesサーベイ（`references/ruby/lib`）1,756 → 354エラー（-80%）。
6. **Spec-suite + リポジトリレイアウト** — デフォルトで並列（`217秒 → 60秒`、12コア）;コンテンツキー化sigディレクトリ（runner_spec 39.6秒 → 25.4秒）;オプトイン共有プラグインキャッシュ（sorbet_plugin_spec 13.1秒 → 4.7秒）;リポジトリレイアウト分割（27の本番プラグイン向け`plugins/<id>/`;5つのウォークスルー向け`examples/<id>/`）。

コミットされたすべてのv0.1.6トラックは純粋に加法的（既存のCLI消費者の動作変更なし）;基板修正（ADR-18）は新しい3ティアフォールバック下でv0.1.6以前の`returns:`セマンティクスを保持する。

### v0.1.6のスコープ外（キュー、需要駆動）

- **ADR-17スライス3b**（ファイルごとのキャッシュディスクリプタ）、スライス5 / 6（フルプロジェクト2パス / プラグインAPIフック）。
- **ADR-18スライス4**（`returns_from_arg:`のTraitRegistryパリティ） + 連鎖呼び出し引数拡張（`Types::String.constrained(...)`チェインヘッド解決）。
- **ADR-12**継続: `rigor-dry-types`スライス4 + `rigor-dry-schema`スライス1+2 + `rigor-dry-validation`スライス1がすべて着地済み（CHANGELOG `[Unreleased]` § Added）。残り: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断;需要駆動）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json { ... }`パリティ）;`rigor-dry-monads`（依然`Result[T, E]` / `Maybe[T]`キャリア決定が必要 — スライシング計画を参照）。
- **ADR-10オプションC**（遅延 / オンデマンドの呼び出しごとのgem-source推論）。
- 合成メソッドティアの`returns:`文字列（ユーティリティ型戻り値）向けの**ADR-13リゾルバチェイン配線**。
- **ADR-16スライス5b**（Tier Dエンジン統合）。
- **エディタモードフォローアップ**（[`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「v1のスコープ外」）: ファイルごとの診断キャッシュ（単一ファイルスコープ（オプションA） → 代入付きプロジェクトスコープ（オプションB）にアップグレードするレバー）、プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ、マルチバッファ（`--buffer A=B --buffer C=D`）、`--also=dep1,dep2`呼び出し元宣言のディペンデント、LSPデーモン / ファイルウォッチ。
- **`rigor-graphql`スライス1+2a+2b+2c+2dすべて着地**（Tier 3D — `Schema::Object` + リストラッパー + `Schema::Enum` + `Schema::InputObject` + `Schema::Mutation`認識、4つのクロスプラグインファクトを公開;CHANGELOG `[Unreleased]` § Added）。残りの将来スライス（リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け）は需要駆動。
- **O4レイヤー3 gemバージョンごとのキャッシュ**（スライス3アーキテクチャ;将来のRuby::BoxスタイルのBundler拡張が優先順位を上げる）。

## v0.1.7 / v0.1.8 — ユーザー向けポジショニングトラック（出荷済み）

3本柱のメッセージング枠組みがREADME / handbookのフロントマターを駆動し、v0.1.7 / v0.1.8のリリースナラティブを形作る。**柱1と柱3はすでにv0.1.5 / v0.1.6の推論 + プラグイン / 基板作業から出荷されており、v0.1.6以降のREADMEリードに反映されている;柱2はREADMEに昇格される前に下記の実装スライスを必要とする**。

| 柱 | タグライン | ステータス |
| --- | --- | --- |
| 1. 願望ではなく事実としての型 | 「あなたのコードの型は事実を表明していますか、それとも実装に遅れを取っていますか？」 | 出荷済み（推論優先 + `rigor sig-gen` + `tighter-return`）。READMEリードはv0.1.6からこれを反映。 |
| 2. specが型である | 「本当に型を書く必要がありますか？`spec/`はすでに型情報です。」 | 下記の実装トラック。スライス1〜3が着地したらREADMEに昇格。 |
| 3. ユニオンを超えるプログラマブルな推論 | 「型安全性にユニオン型だけでは足りない。プログラマブルな推論がメタプログラミングと安全性を共存させる。」 | 出荷済み（キャリア群 + プラグイン契約 + ADR-16基板 + ADR-18呼び出しサイトごとの精度）。READMEリードはv0.1.6からこれを反映。 |

### 柱2の実装トラック（出荷済み — スライス1+2+3がv0.1.7で着地）

「specが型である」というナラティブを過剰約束せずに裏付けるには、既存の[`rigor-rspec`](../plugins/rigor-rspec/)と[`rigor-factorybot`](../plugins/rigor-factorybot/)プラグインの上に加法的な3つの具体的な能力が必要:

- **スライス1 — RSpecアサーションからのspec由来フローファクト**。
  `it`ブロック内の`expect(x).to be_a(T)` / `eq(literal)` / `be_kind_of(T)` / `be_instance_of(T)` / `be_nil` / `be_truthy|falsey`が、アサーション以降の`x`についてRigorのナローイングファクトに寄与する。`rigor check`がspecを不透明なRubyとして読み、spec内部バグ（間違った変数に対するアサーション）とspec由来契約（ナローイングされたレシーバーから恩恵を受ける同じ`it`本体の下流呼び出し）の両方を見逃す今日のギャップをクローズ。スライスは`rigor-rspec`を拡張する;コアエンジン変更なし。6マッチャーテーブルが自然なフロア。
- **スライス2 — SUTへの`subject` / `let`クロスバインディング**。
  `describe User do … end`本体が`subject { described_class.new(...) }`または`let(:user) { User.new(name: "a") }`を宣言するとき、コンストラクタarityと属性ごとの存在の証拠としてブロックを扱う;`rigor-activerecord` / `rigor-factorybot`の既存の`:model_index`チャネルにフィードバックし、`let`で導入されたローカルが下流の`it`本体で正しいキャリアに表面化するように。
- **スライス3 — 構造体形ファクトとしてのファクトリ定義**。
  `rigor-factorybot`は今日ファクトリ呼び出しを検証する;ファクトリごとの属性セットをADR-9ファクトとして公開しない。スライスは`spec/factories/`を`:factory_index` / `:factory_attributes`チャネルに昇格させ、`let(:user) { create(:user) }`がファクトリの属性形がローカルにバインドされた`User`キャリアを生み出すようにする。スライス2と組み合わせて`let` ↔ ファクトリチェーンに合成される。

各スライスはオプトイン（マニフェストエントリまたは`.rigor.yml`トグル）;`rigor-rspec` / `rigor-factorybot`を実行していないユーザーには動作変更なし。スライスが着地したらREADMEの「2つの設計コミットメント」リードは3つに拡張される。

3つすべてのスライスがv0.1.7カット（CHANGELOG § `[0.1.7]`）でv0.1.8シーリングに先行して着地した;READMEの「2つの設計コミットメント」リードは3つに拡張された。

## 将来のサイクル（特定のリリースにコミットされていない）

v0.1.x作業を通じて浮かび上がった項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。

### 型言語 / エンジン
- **O2 — マクロテンプレート + heredoc-Ruby展開**。基板フロア + 精度プロモーションは[ADR-16](../adr/16-macro-expansion/)スライス1〜5a + 7（コミット584ae85…56706a5） + スライス6a-TierB / 6b-TierC精度（コミットd174fff / d7b1943）を通じて配信: Tier A（ブロック-as-メソッド） + Tier B（トレイトインライニングレジストリ） + Tier C（heredocテンプレート）エンジン統合が新しい`SyntheticMethodIndex` + プレパススキャナを通じて;Tier D（外部ファイルインクルージョン）はスライス5aの先送りに従いエンジン統合を先送りした契約のみを出荷;Concern（`included do`）再ターゲティングはスキャナで処理;**スライス6**精度プロモーションはTier B発行を`origin_module:`provenance経由で`RbsDispatch.try_dispatch`にルーティングする（Deviseの`valid_password?`は今`Dynamic[T]`ではなく`bool`を返す）し、Tier Cの素のクラス名`returns:`文字列を`environment.nominal_for_name`経由で解決する。3つの動作消費者が着地: `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。残り項目: **スライス5b**（Tier Dエンジン — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド;キュー、需要駆動）、**ADR-13リゾルバチェインの完全な配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名`Pick<T, K>`をリゾルバチェイン経由でルーティング;キュー、需要駆動）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **DSLシグネチャでの軽量HKT（高階型）**。[ADR-20](../adr/20-lightweight-hkt/)が提案された（2026-05-18）。Yallop & White 2014 / fp-tsに従う脱関数化されたタグ + `App[F, A]`キャリア、すでに`docs/type-specification/rigor-extensions.md`に列挙されている条件型 / インデックスアクセス行の上に構築される。最初の具体的な採用者: `JSON.parse`の`untyped`スロット（6つの実装スライスがスケッチされており、スケジュールされたスライスはまだない）。背後にキューされた横断的な採用者: `rigor-lisp-eval`デモ、`rigor-dry-monads`の`Result[T, E]` / `Maybe[T]`、スキーマ駆動の`rigor-dry-validation`結果。
- **`rigor:v1:conforms-to`ディレクティブ**。元々v0.1.1の「スコープ外」にキューされていた;まだオープン。メソッドパラメーターが名前付き構造インターフェースを満たす任意の値を受け付けられるようにする。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価**。[ADR-17](../adr/17-monkey-patch-pre-evaluation/) accepted（2026-05-16）。スライス1+2+3a+4はv0.1.6で**着地**（`pre_eval:`配管 + レジストリ + ディスパッチャーティア + ヒューリスティック戻り型 + 重複宣言`:info` + globサポート）。残りの需要駆動フォローアップ: スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。（注: クロスプラグインファクト経由の呼び出しサイトごとの戻り型ルックアップはv0.1.6で[ADR-18](../adr/18-substrate-per-call-site-return-type/)を介して出荷;上記のADR-13配線は直交する「パラメータ化形パーサー」拡張。）
- **カバレッジ認識の診断姿勢（将来のコンセプト — まだ設計されていない）**。アイデア: spec / テストカバレッジによって診断の*姿勢*を変調する — コードがテストで実行される箇所では楽観的に解析し、そうでない箇所では保守的なまま（または注意をエスカレートする）。これは[`overview.md`](../type-specification/overview/) §「偽陽性の規律」の価値（実行され、テストでカバーされたプログラムはそれ自身の正確性の証拠である）を、「動作している」ことを機械可読かつ*局所的*にすることで運用化する: カバレッジマップが、推論後の診断重要度を変調する新しいファクトソースになり、WD6パイプラインの`severity_profile`の近くに位置する — 型推論自体は変わらない。柱2（spec → 型ファクト）とは別物;これはカバレッジ → 信頼度だ**。これが設計可能になる前に解決すべき懸念:**（1）*カバレッジ ≠ 正確性* — 「実行された」は「型に関連するエッジケースが実行されアサートされた」ではないので、カバーされたコードに対する楽観的な姿勢は、テストが実行するがアサートしない実バグを抑制しうる;行カバレッジは特に弱く、分岐カバレッジはより良いが依然部分的だ。（2）2つの半分は**リスクが非対称**だ — 「未カバー → エスカレート」は再優先順位付けするだけで何も抑制しない（安全、純粋にアップサイドのみ）一方、「カバー済み → 抑制」は誤った安心のリスクを持つ;最初のスライスはおそらく未カバーの半分のみであるべき。（3）カバレッジアーティファクト（SimpleCovの`.resultset.json` / `Coverage` stdlibモジュール）はprovenance + 陳腐化処理を必要とする外部ファクトソースであり、不在または陳腐化時にフェイルソフトする。（4）[ADR-22](../adr/22-baseline-and-project-onboarding/)ベースラインとの可能なシナジー — カバレッジはどのベースラインバケットが「未テスト、ゆえに最初にレビューに値する」かをランク付けできる。ADRなし、スライスなし、コミット済みマイルストーンなし — 方向性としてここに記録。

### プラグイン / エコシステム
- **`rigor-graphql`** — Tier 3DプラグインがスライスでLANDED（v0.1.6、1+2a+2b+2c+2d）: `Schema::Object` + リストラッパー + `Schema::Enum` + `Schema::InputObject` + `Schema::Mutation`認識、4つのクロスプラグインファクト（`:graphql_type_table`、`:graphql_enum_table`、`:graphql_input_object_table`、`:graphql_mutation_table`）を公開。ADR-16基板消費者ではなくメタデータレコーダーの形（graphql-rubyの`field` DSLはRubyメソッドを発行しない — [サーベイ §「GraphQL-Ruby」](../notes/20260515-macro-expansion-library-survey/)を参照）。将来のスライス（リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け）は需要駆動。
- **dry-rbアダプタープラグイン** — [ADR-12](../adr/12-dry-rb-packaging/) accepted（2026-05-16）: gemごとのプラグイン + 計画されている`rigor-dry-rb`メタアンブレラ、Railsプラグインファミリーパターンに一致**。着地**: `rigor-dry-struct`（v0.1.5;ADR-18精度向上を持つv0.1.6でv0.2.0）、`rigor-dry-types`（v0.1.6でスライス1+2+3+4 — 完全なエイリアスカバレッジ、サイクル検出付きの推移的コンポジション参照を含む）、`rigor-dry-schema`（v0.1.6でスライス1+2 — Schema宣言認識 + `each(<T>)`リストスロット）、`rigor-dry-validation`（v0.1.6でスライス1 — Contract認識 + RBSオーバーレイ）**。残り**: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。基礎サーベイは[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)。
- **ADR-10 — gemソースからの呼び出しごとの戻り型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り型を推論すること（`mode: :full`が`Dynamic[Top]`より豊富に貢献できるように）は、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **`rigor-sorbet`の呼び出しサイトごとのsigilゲーティングを超えるフォローアップ** — v0.1.4で着地。未解決のキュー項目なし。
- **プラグイン提供のRBSシグネチャ**。[ADR-25](../adr/25-plugin-contributed-rbs/)が提案された（2026-05-21）: オプションの`signature_paths:` `Manifest`フィールドにより、プラグインgemがRBSディレクトリを貢献でき、`Plugin::Loader`によって解決されRBS環境にマージされる。今日RBSのみのバンドルgem（`rigor-activesupport-core-ext`）を非ポータブルな`signature_paths:`パス経由で手配線することを強いるギャップをクローズする。3スライス（マニフェストフィールド + ローダー解決 + 環境マージ → `rigor-activesupport-core-ext`を些細なプラグインに変換 → `rigor-project-init` SKILLのフォロースルー）;pre-1.0プラグイン契約に加法的、v0.1.x内で安全。コンパニオンフォローアップ（別個、より小さい）: `Environment::BundleSigDiscovery`の自動検出を`vendor/bundle` / `.bundle/config`レイアウトを超えてデフォルトの`bundle install` gemパスに拡張する。

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
- **`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。

### ADRにキューされたオープン研究質問
- **ADR-15 § OQ1** — Ractorごとの`Cache::Store`共有ファサード。今日各ワーカーはキャッシュから自身のRBS envを構築する;OQ1は共有可能なファサード経由でワーカー全体でインメモリenvを共有することを探る。プールのwall-clockがシーケンシャルを上回るクロスオーバー（現在は約1.3〜1.8Kファイル）を下げる。
- **ADR-13 §「オープンクエスチョン」** — 5つのコア関数（`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`）を超えるシェイプ射影サーフェスの拡張。新しいマップ型語彙を追加するときに権威的。

### エージェントワークフロー / SKILL（コミット済み: v0.1.9）

3つのSKILLが**自分自身のプロジェクトでRigorを新たに採用するエンドユーザー**（gem著者、アプリケーション開発者、`gem install rigortype`を実行するプロジェクトプライベートプラグインメンテナー）をターゲットとする。3つすべてが**トップレベルの`skills/`ツリー**の下に置かれる — コミット`1a3c342`で`rigor-plugin-author`が`.claude/skills/`に再ホームされたときに空いたスロット — そして[agentskills.io](https://agentskills.io/)ポータブルSKILL規約（自己完結した`SKILL.md` + `references/`、クロスリポジトリ参照のための絶対GitHub URL、kebab-case名、パブリックCLIサーフェスのみ）に従う。

v0.1.7 / v0.1.8サイクルはリードアップだった — 拡大するプロジェクトサーベイに対してrigorを実行することで**実プロジェクトのエラーデータを収集・対処**し（Mastodonサーベイがv0.1.8の偽陽性削減作業を駆動した）、観察されたシグナルからデフォルトを引き締め、第一原理の推測ではなく実証的証拠に対してSKILLトリオのプラグイン / 重要度 / ベースラインルールの推奨をキュレートした。v0.1.9はトリオ自体を最後のプレビューカットとして出荷する（§「リリース戦略 — v0.2.0への道」を参照）。

- **`skills/rigor-project-init/`** — **着地済み（v0.1.9サイクル）**（[ADR-22 § "WD8"](../adr/22-baseline-and-project-onboarding/)、[§ "SKILL: rigor-project-init"](../adr/22-baseline-and-project-onboarding/)）。初回オンボーディングワークフロー: Gemfile / Gemfile.lockウォーク → 検出されたスタックに合致するプラグインセットを提案（Rails / dry-rb / Sinatra / プレーンRuby） → **採用モード選択**（acknowledge / ベースライン対strict — 重要度プロファイル + ベースラインフェーズの実現された形） → `.rigor.dist.yml`を書く → `rigor triage --format json`を実行 → （acknowledgeモード）`.rigor-baseline.yml`とマッチする`baseline: .rigor-baseline.yml`行を設定に書く → 集中したルールを本物のバグの可能性として表面化 → 2つのエスカレーションパス（プロジェクトプライベートプラグイン / Rigor issue）を提示。SKILL.md + 3つの`references/`モジュール;ADR-23スライス3の`rigor-project-init`の半分を担う。対象: 初めてプロジェクトで`gem install rigortype`を入力するユーザー。

- **`skills/rigor-baseline-reduce/`** — **着地済み（v0.1.9サイクル）**（[ADR-22 § "WD8"](../adr/22-baseline-and-project-onboarding/)、[§ "SKILL: rigor-baseline-reduce"](../adr/22-baseline-and-project-onboarding/)）。継続的品質改善ワークフロー: `rigor triage`ヒントカタログ + `rigor baseline dump --format json`で優先順位付け（ADR-23スライス3の`rigor-baseline-reduce`の半分） → `.rigor-baseline.yml`をルールごとに歩く → ルールごとに3〜5サイトをサンプリング → それぞれを分類（実バグ / スタイル的・安全 / FP） → 修正の適用 / 行ごとの`# rigor:disable` / rigorに対するGitHub issueを開く → `rigor baseline drift` + `rigor baseline regenerate`でベースラインを更新。SKILL.md + 2つの`references/`モジュール。対象: project-initと同じ;プロジェクトにベースラインができた後の自然な次セッションのSKILL。

- **`skills/rigor-plugin-author/`** — **着地済み（v0.1.9サイクル）**（外部著者バリアント — `.claude/skills/rigor-plugin-author/`コントリビューターSKILLとは別）。独自のリポジトリでプラグインを書くユーザー — スタンドアロンの`rigor-`プレフィックスのgem（`gem "rigortype"`に依存）またはプロジェクトプライベートプラグイン — のために再ターゲットされたプラグイン著作ワークフロー。SKILL.md + 3つの`references/`モジュールが、gem対プロジェクトプライベートのパッケージング、`rigor-<id>` gemspec / path-gem / `RUBYLIB`アクティベーション、`Rigor::Plugin::Base`スケルトン + `diagnostics_for_file`ウォーカー + オプションの`flow_contribution_for`、`sig/` RBS、RSpecまたはMinitest下での`rigor check --format json`経由のフィクスチャベースのテストをカバーする。pre-1.0プラグイン契約のキャビアットを全体に織り込む（`rigortype`を`< 0.2.0`にピン留め）。

トリオはv0.2.0外部ユーザートラック向けの一貫した**オンボーディング → 継続的品質 → 拡張**プログレッションを形成する。今日（v0.1.x）はスコープ外: このモノレポ外に外部の`rigor-*` gemは存在しない;ADR-2プラグイン契約サーフェスは依然pre-1.0;subtree-split / RubyGems公開フローは内部のまま — これらがv0.2.0が吸収するゲート条件。

SKILLトリオに先行するコンパニオン非SKILLデリバラブル:

- **ベースラインメカニズムコア**（[ADR-22](../adr/22-baseline-and-project-onboarding/)）: `(file, rule, count)`スナップショットを記録するPHPStan形の`.rigor-baseline.yml`（WD1に従うルールIDデフォルト + オプトインメッセージパターンモード）;`rigor check`がALL-or-NOTHINGバケット閾値セマンティクス（WD4）でベースライン化された診断をフィルタリング;`.rigor.yml`の`baseline: <path>`経由の明示的ロードのみ（WD2（b））。新CLIサブコマンドファミリー: `rigor baseline {generate, regenerate, dump, drift, prune}` + `rigor check`への`--baseline=PATH` / `--no-baseline` / `--baseline-strict`。成熟したコードベースが初回接触で数百〜数千の診断を抱える5プロジェクトサーベイ（[`docs/notes/20260519-oss-library-survey.md`](../notes/20260519-oss-library-survey/)）が駆動。スライス1 + 2（ファイルI/O + ドリフト検査）はv0.1.7で出荷 — v0.1.7 / v0.1.8サーベイ作業がSKILL着地前に経験的ベースラインデータを収集できるよう**。スライス5（`rigor baseline regenerate` + `--baseline-strict` CIゲート）はv0.1.9サイクルで着地**し、サブコマンドファミリーを完成させた;SKILLトリオも最後のプレビューカットであるv0.1.9の下で着地する。

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

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`スライス3+（リゾルバメソッド型チェック;ブラケット形を超える`<Type>.array` / `<Type>!`連鎖形;文字列形`field :foo, "User"`診断;`Schema.execute(...)`結果型付け）。
- `rigor-dry-schema`スライス2+（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2+3（`:dry_schema_table`消費経由のparamsブロック型付け + `json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`plugins/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。`rigor-rails`メタgemスキャフォールド（v0.1.6）はTier 1+2アンブレラのための公開可能なテンプレート — gemspec + `add_dependency`宣言はすべて整っている;野生でのアクティベーションはサブプラグインのsubtree-split + RubyGems公開を待つ。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5でリリース。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。

[ADR-18](../adr/18-substrate-per-call-site-return-type/)（基板の呼び出しサイトごとの戻り型DSL）はv0.1.6に向けて`master`に蓄積中。`Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（+ `lookup_via:`クロスプラグインファクトチャネル）を追加;`rigor-dry-struct` v0.2.0は最初の動作消費者（`rigor-dry-types`が公開する`:dry_type_aliases`経由で`attribute :city, Types::String`を`Nominal[String]`に解決）。スライス4（TraitRegistryパリティ） + 連鎖呼び出し引数抽出は需要駆動のまま。
