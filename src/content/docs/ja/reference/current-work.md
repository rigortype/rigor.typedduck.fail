---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "61ae2a25fe45328712ecc9b6ddaa45b5ab852764112d4455efd528e16462645e"
sourceCommit: "37d70ab9071b4a25e954d0157818f0b6ae88e2c2"
sourceDate: "2026-06-03T23:06:21+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.15リリース済み（2026-05-29）。v0.1.16準備済み（2026-06-03）—— バージョンをバンプ + `CHANGELOG.md` § `[0.1.16]`を封印;`bundle exec rake release`は明示的なユーザー承認でゲートされており、まだ実行されていない**。

v0.1.16は、完全なプラグイン契約のインターフェース分離 + エルゴノミクススイート（ADR-37/38/39/40）、ADR-43のRBS完全な祖先解決 + `make check-plugins`ゲート、v0.2.0ゲート1の実行可能な証拠（外部プラグインフィクスチャ + 適合性 / all-plugins-load / demos-runガード）、不正なプロジェクト`signature_paths:`に対するRBSロバストネス合成、`rigor-activerecord`のスキーマ欠如メモ化修正（Redmine −86%メモリ）を着地させる。完全な詳細は`CHANGELOG.md` § `[0.1.16]`にある;ここで再要約しないこと。

ヘッドラインのリアリズム数値（v0.1.12のOSSリアリズムカット時点で計測;依然有効——後続のカットは新しいフルサーベイではなくオンボーディング / `def.override-*` / プラグイン契約スイートを追加した）:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

Mastodonの残り6件のエラーはエンジン精度とは無関係: 5件はテストフィクスチャ内のnil-receiver + 1件は上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（narrowing）ギャップ（[`docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md`](../notes/20260528-rbs-upstream-pr-resolv-typeclass/)を参照）。

## 次セッションのエントリーポイント

`make verify`はクリーン。プラグイン契約の取り組みはv0.1.16でリリースされた;v0.2.0カットまでに残る2つの戦略的レバーは:

1. **v0.2.0ゲート1 —— 外部プラグイン契約に対する文書化された安定性コミットメント**。実行可能な証拠（外部プラグインフィクスチャ + 適合性 / load / demoガード、すべてCI内）はv0.1.16で着地した;残るのは、固定されたプラグイン契約名前空間に対する*文書化された*「0.2.x内では壊れない」という宣言だ（ドリフトスペックは既にそれらを固定している）。**これはもう1つの漸進的スライスではなく明示的な計画を必要とする**。 [`docs/ROADMAP.md`](../roadmap/) §「v0.2.0 — first evaluation release」を参照。
2. **v0.1.17 —— 内部構造レビュー + パフォーマンスチューニング**（v0.2.0カット前）: ADR-24スライス4（解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method`）、v0.1.16の作業で表面化したエンジン内部の精度向上、推論バジェットサーベイ / `RIGOR_BUDGET_TRACE`からのパフォーマンスフォローアップ。

それ以外はすべて需要駆動で[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」（プラグイン契約エルゴノミクスのフォローオン、dry-rb継続、LSP機能、パフォーマンスレバー）にある —— 具体的なニーズが表面化したときにそこから引き出すこと。

### 参照読書

1. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.1.16]` —— プラグイン契約スイート + ADR-43;§ `[0.1.12]`はOSSリアリズムサイクル。
2. [`docs/ROADMAP.md`](../roadmap/) §「Release strategy — the road to v0.2.0」—— v0.2.0をゲートするもの。
3. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) —— パブリック対内部の安定性境界;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。
4. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/) —— v0.2.0が安定化させなければならないプラグイン契約。

## キュー済みトラック

### 残存診断

- **Mastodon `app + lib`残余 = 6件** —— 5件は`spec/`フィクスチャ内の本物のnilチェーンバグ（Mastodon側、Rigorに作業なし）;1件は上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスギャップ。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`はステージ済み —— ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。
- **Redmine / GitLab FOSSの残余**はより大きなサーフェス;それぞれの数値を下げたい場合は独自のサーベイサイクルに値する。

### エンジン内部（サーベイ駆動ではない）

1. **ADR-24スライス4** —— 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。下記「ADR-24 — 暗黙的selfメソッド呼び出し解決、残り」を参照。
2. **ARスコープボディのラムダ`self`** —— `scope :x, -> { select(...).group(...) }`のインスタンスラムダ内で、ラムダの`self`がモデルクラスにリバインドされる必要が依然ある。v0.1.12は通常のメソッドボディに対する暗黙的selfのクラス側解決をクローズした;ラムダボディは残る。経験的なケースは[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「What is increasing」項目2 / ADR-26領域にある。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログ（エディタモード、LSP機能、dry-rb継続、ADR-10/13/16フォローアップ、パフォーマンスレバー、プラグイン契約エルゴノミクスのフォローオン）は[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」にあり、v0.2.x完成ターゲット。この節はそこに捕捉されていないエンジン内部の詳細を持つ項目のみを保持する。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4** —— 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。独自のFP評価ゲート（[ADR-24 WD4](../adr/24-self-method-call-resolution/)）—— メタプログラミング密度の高いコードに対する大きな新しい偽陽性サーフェスのため、v1は意図的に精度加法的のみとした。
- **クラスボディ内の非`Bot`一般採用** —— 解決されたセルフ呼び出しの戻り型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた（既存の呼び出し先戻り推論の不精度が下流で表面化した）;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ADR-23 — `rigor triage`スライス4プラグイン認識器

残り: プラグインが自身の認識器（recognizer）を貢献できる`Plugin`フック（先送り）。（`Analysis::Diagnostic`の`receiver_type` / `method_name`構造化フィールドはv0.1.8で出荷;SKILL統合はv0.1.9トリオとともに出荷。）

### 推論バジェット — 仕様表は未配線;Layer 1のドキュメント衛生が残る

仕様の設定可能な`budgets:`表（[`docs/type-specification/inference-budgets.md`](../type-specification/inference-budgets/)）はv1向けに規範的でありながら**配線されていない** —— 実際に効いているカットオフは、ハードコードされた3つのサイレントガード（再帰の再入≈深さ1、祖先ウォーク100、HKT fuel 64）とADR-10の`budget_per_gem`だけ。サーベイ + `RIGOR_BUDGET_TRACE` / `RIGOR_HEAP_PROFILE` / `RIGOR_HEAP_TRACE`プローブは2026-06-03に着地（ノート[`docs/notes/20260603-inference-budget-reality-survey.md`](../notes/20260603-inference-budget-reality-survey/)）;プローブは再利用可能。

**Layer 2は解決済み、そしてそれはバジェットではなかった**。大規模アプリのコストの崖は、`rigor-activerecord`の1件のメモ化漏れ（`db/schema.rb`欠如時の`schema_table_or_nil`）に起因する4.2 M個の保持Stringまで追跡された —— v0.1.16で修正（Redmine 1518 MB / 173秒 → 217 MB / 84秒）。`union_size`はメモリと無相関と反証された。バジェット配線は現在**需要先送り** —— バジェット型のコストを示すコーパスプロジェクトは存在しない;もし将来現れたら、まず2a形式の分布プローブを再実行する（[ADR-41 WD3](../adr/41-inference-budget-design/)）。

**Layer 1（需要ゲート付きのドキュメント/仕様衛生、ADR-41の受け入れ待ち）:** `docs/manual/03-configuration.md`の`budget_per_gem`の記述を修正（「時間バジェット、ミリ秒、デフォルト1000」とあるが、実際にはメソッド定義の**個数**、デフォルト**5000**）;`recursion_depth`を整合させる（仕様5対 配線済みの深さ1終了ガード —— 「終了フロア」と「精度アンロール深さ」を分離）;文書化された表に`ancestor_walk`（100）+ `hkt_fuel`（64）の行を追加;欠けているユーザー向けのバジェット説明を執筆（配置は未定）。

### Stdlib RBSカバレッジギャップパターン

上流の`ruby/rbs` RBSギャップが単一の内部Rigor呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable`ディレクティブ + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）は上流PR向けにステージされている —— ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

### より小さなキュー項目

- **Sig-genの`update_existing`**は兄弟の親 / 子クラスブロックを畳み込まない —— `merge_class`は各候補の`class_name`を独立して解決するため、フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするのはスコープ外;回避策はターゲットsigファイルを削除してゼロから再生成すること。
- **`Hash === expr` case-equalityナローイング**（`open3.rb:226`の形）—— 引き続きオープン。
- **インメモリの`Analysis::Runner.run_source(source:, path:, …)`エントリーポイント** —— `RunnerHelpers#analyze`の呼び出しごとのtmpdir + chdirをバイパスする;約5%のspec-suite勝利に加え、埋め込み者（LSP / エディタモード）向けのクリーンなパブリックAPI。需要駆動。
- **`--params=observed`後のSig-gen残りギャップ** —— `initialize`以外のソース（DB読み取り、設定、副作用）からivarが設定される`attr_reader`は依然`:untyped_return`を生成;修正は手書きのsigアノテーション。untypedレシーバーへの深いチェーンは`rbs collection install`またはADR-10の`source_inference:`。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグイン（SKILL内のエスカレーションパスA）。これらは`skills/rigor-project-init/references/04-sig-uplift.md` §「Step 5-d」に記載。

### Type-coverage uplift — ライン状況（2026-05-23）

Phases 1〜4着地済み（String / Integer / Float / Comparable / Math / HashShape / Date / DateTime / Time）。残り項目はすべて**リリース未確定**で、[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」→「Type-language / engine」に完全な詳細が追跡されている:

- **Struct / Data値fold** —— ADR相当（新しいキャリア（carrier）が2つ必要）;`Data.define`が最初のターゲットとして恐らくより良い。`Encoding`値foldは*恒久的除外*。
- **`MathFolding`結果の精緻化** —— 値精確な28関数foldへの範囲精緻化の付与（`Math.exp` → `positive-float`、`Math.sqrt` / `hypot` → `non-negative-float`）。需要駆動。
- **Hash `rassoc`シェイプ（shape）ハンドラ** —— 唯一残っている低優先度Hashハンドラ;値 → `[k, v]`の逆引きで、すべての値が`Constant`のときfold可能。需要駆動。

## リリース後フォローアップ

- **`data/oss-sweep/mastodon-thresholds.json`** —— 保存済み閾値を〜6のベースライン（baseline）に対してリフレッシュし、週次OSSスイープゲートが較正されるようにする（現在のファイルは未較正、`max_diagnostics: 999999`）。
