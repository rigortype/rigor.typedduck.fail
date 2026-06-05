---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "3a46d7d9eb84f67014c6096b563f5716684afa136e868174abd86794c49665fa"
sourceCommit: "86367f26f62593f19f649f7cb9c8e1a00a751282"
sourceDate: "2026-06-05T07:47:09+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.15リリース済み（2026-05-29）。v0.1.16準備済み（2026-06-03）—— バージョンをバンプ + `CHANGELOG.md` § `[0.1.16]`を封印;`bundle exec rake release`は明示的なユーザー承認でゲートされており、まだ実行されていない**。

**未リリースのパフォーマンス / キャッシュ / インクリメンタルサイクル（計画中のv0.1.17「内部構造レビュー + パフォーマンスチューニング」）がv0.1.16の上に進行中 —— 出荷済みエントリーは`CHANGELOG.md` § `[Unreleased]`を参照;ここで再要約しないこと**。着地済み: Mastodon + GitLabでの`rigor check`のアロケーション（allocation）プロファイリング（ノート`docs/notes/20260604-mastodon-allocation-profile.md` + `…-gitlab-plugin-contribution-allocation.md`）→ ADR-44（ディスパッチ（dispatch）ごと / ナローイング（narrowing）ごとのアロケーションチャーン）とプラグイン寄与のデチャーンにより、Mastodonでアロケーション約−42% + GitLabで実時間約−14%;**ADR-45**は未変更プロジェクトの高速パス（record-and-validate全体実行キャッシュ —— 未変更のGitLab 2,630ファイルが113秒 → 約2.7秒、約42倍）;**ADR-46 —— ボディ層完成**`rigor check --incremental`（ファイル横断のクロスプロセスなインクリメンタル解析、未変更 / リーフ編集で約6〜9倍、`--verify-incremental`でCIゲート済み）;**ADR-47** `flow.unreachable-clause` WD1+WD2+WD3a（デッドな`case`/`when`/`in`節）;加えてエンジン精度 + type-coverageのアップリフト（`Hash === <chain>` case-equalityナローイング、`Runner#run_source`、Tuple `drop`/`rotate`/`uniq`/`index`/`rindex`、Hash `rassoc`、String `delete`/`count`/`squeeze`の各fold）。このサイクルはまだバージョンバンプもリリースもされていない。

v0.1.16は、完全なプラグイン契約のインターフェース分離 + エルゴノミクススイート（ADR-37/38/39/40）、ADR-43のRBS完全な祖先解決 + `make check-plugins`ゲート、v0.2.0ゲート1の実行可能な証拠（外部プラグインフィクスチャ + 適合性 / all-plugins-load / demos-runガード）、不正なプロジェクト`signature_paths:`に対するRBSロバストネス合成、`rigor-activerecord`のスキーマ欠如メモ化修正（Redmine −86%メモリ）を着地させる。完全な詳細は`CHANGELOG.md` § `[0.1.16]`にある;ここで再要約しないこと。

ヘッドラインのリアリズム数値（v0.1.12のOSSリアリズムカット時点で計測;依然有効——後続のカットは新しいフルサーベイではなくオンボーディング / `def.override-*` / プラグイン契約スイートを追加した）:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

Mastodonの残り6件のエラーはエンジン精度とは無関係: 5件はテストフィクスチャ内のnil-receiver + 1件は上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（narrowing）ギャップ（[`docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md`](../notes/20260528-rbs-upstream-pr-resolv-typeclass/)を参照）。

## 次セッションのエントリーポイント

> **推奨する次の作業（1つ選ぶ —— いずれも有界で、外部コーパス不要）:**
> 1. **ADR-46スライス4 —— シンボル粒度の依存追跡**（インクリメンタルトラックの自然な完成;CI価値が最も高い）。ボディ層は*ファイル*粒度で依存を記録する;スライス4はエッジを`(file, "Class#method")`に細分化し、あるメソッドを編集したときに*そのメソッド*の呼び出し元だけを再チェックし、そのファイルのすべての呼び出し元ではなくなる。必要事項: `DependencyRecorder.read_site`でシンボルを記録（既に`Class#method`を計算済み）、シンボル単位のボディフィンガープリント、`Analysis::Incremental` / `IncrementalSession`でのシンボルレベルの変更検出。中程度の作業量;下記インフラの直接的な拡張。
> 2. **`rigor:v1:conforms-to`ディレクティブ**（v0.1.1から未解決;[ROADMAP](../roadmap/) §「Type-language / engine」）—— 構造的インターフェース適合のRBS::Extendedディレクティブ。新しいディレクティブ文法（`lib/rigor/rbs_extended.rb`）+ 呼び出しサイトでの構造的適合チェック。中程度の作業量;設計が必要。
> 3. **`Cache::Store`のLRU立ち退き**（[ADR-6](../adr/6-cache-persistence-backend/)）—— シャード型キャッシュが立ち退きをしない。FPリスクなし（キャッシュ管理、診断ではない）。中程度の作業量;クロスプロセスアクセス追跡 + 立ち退きパス。
>
> **してはいけないこと:** check-rulesルート経由のADR-24スライス4を再起動しないこと（2026-06-05にリバート済み、135件のFP —— 下記参照）。シェイプキャリアの値foldingの層はこのサイクルで包括的になった（Tuple / Hash / Stringのギャップを解消）;これ以上のfoldは逓減収益か新しいキャリアが必要（Struct/Data、Float-range —— いずれもADR相当）。MathFoldingの範囲精緻化項目はFloat-rangeキャリアが先に必要（§「Type-coverage uplift」を参照）。

`make verify`はクリーン。**ADR-46のインクリメンタル解析トラック（v0.1.17パフォーマンスサイクルの目玉）のボディ層は完成しユーザー向けに公開済み**（[`docs/adr/46-incremental-dependency-graph.md`](../adr/46-incremental-dependency-graph/)、現在Accepted —— 実装済み）。`rigor check --incremental`は`ΔF ∪ dependents[ΔF]`だけを再解析し、残りはクロスプロセスのディスクスナップショットから提供する;健全性は`--verify-incremental`（`make check-incremental`でCIゲート済み）で担保される。Rigor自身の`lib`（262ファイル）で計測: ウォームな無変更0.75秒 対フル7.2秒（約9.6倍）、1ファイルのリーフ編集1.15秒（約6.3倍）、診断結果はバイト同一。完全なランディングは`CHANGELOG.md` § `[Unreleased]`とADRにある。**配信済みスライス（1a〜1c: 記録 + 反転 → 健全性コア → サブセットフック → インメモリオーケストレーター → `--verify-incremental`ゲート + CI → ディスク永続化 + `--incremental`フラグ）**。キーとなる実装: `Analysis::DependencyRecorder`、`Analysis::Incremental`（`affected`/`changed_files`/`invert`）、`Analysis::IncrementalSession`（`baseline`/`recheck`/`run_incremental`）、`Cache::IncrementalSnapshot`（フィンガープリント付きディスクストア）、`Runner#{file_dependents,analyzed_files,analysis_file_set,analyze_only:,record_dependencies:}`。

**ADR-46残り（需要駆動の精緻化、ブロッキングでない）:**スライス3（構造層のネガティブ依存追跡 —— 構造的編集は現在フィンガープリント経由でフルリビルドにフォールバックし、健全だが粗い）+ スライス4（シンボル粒度: `(file, symbol)`の依存により、あるモデルのメソッドを編集したとき*そのメソッド*の呼び出し元だけを再チェック）。さらに: Mastodon + GitLabのサーベイツリーへの`--verify-incremental` CIゲートの拡張、および`--incremental` / `--verify-incremental`のマニュアルエントリー（CLIリファレンス + キャッシュの章）。

**エンジン精度: [ADR-47](../adr/47-narrowing-driven-clause-reachability/) WD1 + WD2 + WD3a着地済み** —— `flow.unreachable-clause`は、フローエンジンのナローイングがデッドと証明した`case`/`when`（および`case`/`in`の裸クラス）節にフラグを立てる（整数（`Integer`）サブジェクトに対する`when String`；先行して網羅済みの節）。エンジン自身の`scope_index`からの節単位の`body_scope`を読む（乖離なし）、FPエンベロープは狭い（クラス/モジュール定数の`when`のみ、`Dynamic`は決してなし、ループ / ブロックはスキップ）、Rigor自身のコーパスでクリーン。WD4コーパスゲート待ちで、緩慢 / バランスで`:info`、厳格で`:warning`として出荷。`UnreachableClauseCollector` + `RULE_UNREACHABLE_CLAUSE`。**WD2着地済み**: メッセージは`:prior_exhaustion`（「より早い`when`で既にカバー済み」）と`:disjoint`を区別し、エンジンが各節の最初の条件ノードで記録するようになったエントリー`falsey_scope`で識別される（`eval_case_when_branches`内の`record_clause_entry_scope`、`on_enter`のみなので新たに型付けされるものはない;`propagate`がそれを保持する）;また、デッドな末尾の`else`にもフラグが立つ（`:exhausted_else`）、ただしそのボディが防御的な`raise`/`fail`/`throw`/`abort`/`exit`ガードでない限り。**WD3a着地済み**: `case`/`in`の裸クラスパターン（`in C` / `in C => x`、純粋な`is_a?`）は`when C`と同様に健全なナローイングを行う（`in_branch_body_and_falsey_scopes` + `bare_class_pattern_node`が`Narrowing.case_when_scopes`を経由）;コレクターは`CaseMatchNode` + `InNode`を処理;分解 / 値 / 変数パターンは保守的なまま（先行網羅のみで発火）。**WD4スイープ実施済み**（2026-06-05）: 16のOSSコーパス（Mastodon / Redmineのapp+lib; parser / rubocop-ast / kramdown / mail / liquid / haml / hamlit / herb / slim / oj / ox / protobuf / textbringer / rgl lib）→ **ゼロ発火**、FPゼロ（GitLab `lib`は遅すぎるため中止、除外）。空虚なパス ≠ 安全性の証拠なので、バランスは**`:info`のまま**（厳格は`:warning`）;昇格には実際の発火を待つ。注記: [`docs/notes/20260605-adr47-unreachable-clause-corpus-sweep.md`](../notes/20260605-adr47-unreachable-clause-corpus-sweep/)。**ADR-47残り（ゼロ発火スイープにより需要駆動・優先度引き下げ）:** WD3b（分解 / 値 / 変数キャッチオール（catch-all）パターンの網羅性 —— より大きく、ADR-36の隣接領域、アドホックに推論しないこと）。**その他のv0.1.17の継続目標:** ADR-24スライス4（解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method`）。**試み1（check-rulesの再実装）はプロトタイプ化の後、2026-06-05にリバート** —— 超保守的なclosednessゲート（スタンドアロンのプロジェクトクラス、スーパークラス / includes / method_missingなし、プラグイン非公開）+ 自クラスのRBS解決を組み合わせても、**Rigor自身の`lib`で135件の偽陽性**を生じた: `module_function`モジュール（`Narrowing` / `Combinator`の兄弟セルフ呼び出し）、`Data.define` / `Struct`の合成アクセサ、テンプレートメソッドモジュール（`Renderable#render_text`）。教訓は[ADR-24 §「Slice 4」](../adr/24-self-method-call-resolution/)に記録: check-rulesによる解決の再実装は、エンジン実際の解決（これらすべてを精度のために処理する）から乖離する;正しいルートは`try_user_method_inference`ミスチョークポイントでの**評価時レコーダー**（ADR-46 / 47の「collect, don't recompute」の教訓）であり、default-on前にWD4コーパスFP評価でゲートされる。

**Gotcha（ADR-46のメモリノートに記録）:** `Runner#initialize`のivar事前シードをヘルパに抽出**しない**こと —— `@class_decl_paths_snapshot = {}`等をコンストラクタの外に移すと、エンジン自身のフロー解析からそれらが隠れ、`make check`が`snapshot.size`をnil-receiver偽陽性として自己フラグする。インラインに保つこと;コンストラクタは`AbcSize`のdisableを持つ。

v0.2.0カット前の2つの戦略的レバーは依然残る（準備ができたら引き出す、両方とも独自の計画が必要）:

1. **v0.2.0ゲート1 —— 外部プラグイン契約に対する文書化された安定性コミットメント**（実行可能な証拠はv0.1.16で着地;「0.2.x内では壊れない」という宣言が残る）。[`docs/ROADMAP.md`](../roadmap/) §「v0.2.0 — first evaluation release」を参照。
2. **v0.1.17の残り** —— ADR-24スライス4（解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method`）+ さらなるエンジン内部の精度向上;パフォーマンス / キャッシュの半分（ADR-44/45/46）はサイクルのもう半分で、進行中。

それ以外はすべて需要駆動で[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」にある —— 具体的なニーズが表面化したときにそこから引き出すこと。

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

### パフォーマンス / キャッシュ / インクリメンタル（ADR-44 / 45 / 46）—— 進行中

未リリースのv0.1.17パフォーマンスサイクル。出荷済みエントリーは`CHANGELOG.md` § `[Unreleased]`にある;これはエンジン内部の再開用詳細。

- **ADR-44 —— ディスパッチごと / ナローイングごとのアロケーションチャーン（着地済み）**。`rigor check`はアロケーションバウンド。ボディスコープの`with_*`チェーンを1つの`Scope.new`に畳み込んだ（GC実行−29%）;`owners_for` / `CallContext`の衛生。**却下:**ミュータブルなプール化`Scope` / `CallContext`（再入可能なディスパッチ → サイレントなナローイング破損 → 偽陽性）。**格下げ:** `ProjectScope`のフィールド再グループ化 —— Ruby 4.0のオブジェクトシェイプ（object shape）マイクロベンチマークが、3〜24個のivarがすべて1個のオブジェクトをアロケートすることを証明したため、再グループ化はヒープスロットの*サイズ*を削るのであって、アロケーションの*個数*ではない;これはメモリフットプリントのレバーにすぎず、投資前に計測すること。[ADR-44](../adr/44-dispatch-allocation-churn/)を参照。
- **ADR-45 —— 未変更プロジェクトの高速パス（着地済み）**。record-and-validate全体実行診断キャッシュ（`Cache::Store#fetch_or_validate` + `Descriptor#fresh?`）: 事前に判明している入力をキーにし、実行が実際に読み取った依存集合（解析中にプラグインが読むファイルを含む —— Punditポリシーの危険）とともに結果を保存し、次回実行時に再ダイジェストする。**設計上粗い** —— 解析対象ファイルが変更されれば全体を再実行する（これがADR-46で精緻化される点）。`make check` / `check-plugins`は`--no-cache`で実行されるため、ゲートはキャッシュ結果を決して信頼しない。メモリノートのGotcha: `@collect_stats`はデフォルトで真（キャッシュをこれでゲートできない;ヒット → nil統計）;フリーズ済みプラグインへの遅延`@io_boundary ||=` → `FrozenError`（`instance_variable_get`を使う）;キャッシュの書き込み / シリアライズ失敗は握り潰される（実行を決して壊さない）。[ADR-45](../adr/45-unchanged-project-fast-path/)を参照。
- **ADR-46 —— インクリメンタル依存グラフ（ボディ層完成、着地済み）**。`rigor check --incremental`はクロスプロセスのファイル単位インクリメンタル解析を出荷: ファイル単位の依存を`Scope`アクセサのチョークポイントで記録 → `dependents`インデックス → フィンガープリント付きディスクスナップショット（`Cache::IncrementalSnapshot`）→ `ΔF ∪ dependents[ΔF]`だけを再解析し、残りはスナップショットから提供する。健全性は`--verify-incremental`（`make check-incremental`）でCIゲート済み。キーとなる実装: `Analysis::DependencyRecorder`、`Analysis::Incremental`、`Analysis::IncrementalSession`、`Runner#{file_dependents,analyzed_files,analysis_file_set,run_source,analyze_only:,record_dependencies:}`。**残り（需要駆動）:**スライス3（構造層のネガティブ依存追跡 —— 構造的編集はフィンガープリント経由でフルリビルド、健全だが粗い）、スライス4（シンボル粒度 —— 上記の推奨次セッション項目）。[ADR-46](../adr/46-incremental-dependency-graph/)とそのメモリノートを参照。
- **CIキャッシュはほぼノーオペ（計測済み）**。コード変更時（典型的なCIのケース）はADR-45の全体実行キャッシュがミスし、中間のRBS / プラグインキャッシュは約113秒のGitLab実行で<1秒しか節約しない;リストア / セーブのオーバーヘッドがそれを上回る可能性が高い。キャッシュの真の勝利はローカル開発 / エディタ / 同一SHAの再実行 / ドキュメントのみのPR。*CI*を高速にするのはADR-46（変更ファイル + dependentsのみを再解析）。

### Stdlib RBSカバレッジギャップパターン

上流の`ruby/rbs` RBSギャップが単一の内部Rigor呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable`ディレクティブ + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）は上流PR向けにステージされている —— ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

### より小さなキュー項目

- **Sig-genの`update_existing`**は兄弟の親 / 子クラスブロックを畳み込まない —— `merge_class`は各候補の`class_name`を独立して解決するため、フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするのはスコープ外;回避策はターゲットsigファイルを削除してゼロから再生成すること。
- ~~**`Hash === expr` case-equalityナローイング**（`open3.rb` `if Hash === cmd.last`の形）~~ —— 着地済み（v0.1.17）。`Narrowing.analyse_case_equality_predicate`が安定した単一ホップのメソッドチェーン引数（`Class === <local/ivar>.<method>`）を処理するようになった（ローカルだけでなく）: `analyse_class_predicate_on_chain`（`x.last.is_a?(C)`パス）を模倣し、チェーンアドレスをキーにした`method_chain_narrowing`を記録する。静的クラス / モジュールのレシーバーのみ;引数 / ブロック付きチェーン（`cmd.fetch(0)`）は再評価健全性のためにナローイングされないまま。4つのrunnerスペック（truthy / ivar-root / `unless`のfalsey / 非安定チェーンのネガティブ）。
- ~~**インメモリの`Analysis::Runner.run_source(source:, path:, …)`エントリーポイント**~~ —— 着地済み（v0.1.17）。`Runner#run_source(source:, path:)`はRuby文字列をメモリ内で解析する（`parse_source` + `accept_as_ruby_file?`が従う`@in_memory_sources`マップ経由）;フルな実行機構（env構築、プラグイン準備、severity profile）が動作し、ファイル横断のプレパスだけ空（1ファイル;ファイル単位のインデクサーが自己検出）。素の`analyze(source)`スペックヘルパーはこれを経由し、全5461スペックにわたる等価性を検証済み。**パフォーマンス注記:**仮説していた約5%のspec-suite勝利は**実現しなかった** —— 共有ワークスペースのヘルパーパスは既に最適化されていた（ディレクトリ再利用 + envキャッシュ）ため、勝利はノイズ以下;真の価値はクリーンな埋め込み者（LSP / エディタ）向けパブリックAPIにある。
- **`--params=observed`後のSig-gen残りギャップ** —— `initialize`以外のソース（DB読み取り、設定、副作用）からivarが設定される`attr_reader`は依然`:untyped_return`を生成;修正は手書きのsigアノテーション。untypedレシーバーへの深いチェーンは`rbs collection install`またはADR-10の`source_inference:`。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグイン（SKILL内のエスカレーションパスA）。これらは`skills/rigor-project-init/references/04-sig-uplift.md` §「Step 5-d」に記載。

### Type-coverage uplift — ライン状況（2026-05-23）

Phases 1〜4着地済み（String / Integer / Float / Comparable / Math / HashShape / Date / DateTime / Time）。残り項目はすべて**リリース未確定**で、[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」→「Type-language / engine」に完全な詳細が追跡されている:

- **Struct / Data値fold** —— ADR相当（新しいキャリア（carrier）が2つ必要）;`Data.define`が最初のターゲットとして恐らくより良い。`Encoding`値foldは*恒久的除外*。
- **`MathFolding`結果の精緻化** —— 値精確な28関数foldの**非定数入力パス**に範囲精緻化を付与（`Math.exp` → `positive-float`、`Math.sqrt` / `hypot` → `non-negative-float`）（定数入力は既に`Constant[Float]`にfold済み）。**軽微ではない —— まず新しいキャリアが必要**。スコーピング確認（2026-06-05）: int精緻化（`positive_int` / `non_negative_int`）は`IntegerRange`キャリア;**Float-rangeキャリアは存在せず**、`positive-float` / `non-negative-float`の名前は`imported-built-in-types.md`で予約済みだが未実装（`Type::Combinator` + `ImportedRefinements::REGISTRY`に不在）。これらを追加するにはキャリア導入の全チェックリスト —— `describe`表示、サブタイピング（`<:`）、漸進的（gradual）`accepts`、ナローイング、正規化、RBS消去、内部型API適合 —— を伴う「キャリア動物園」の拡張（`FloatRange`キャリアまたは`Refined(Float, :positive)`）。ADR相当、Struct / Data foldingの作業量レベル;需要駆動。
- ~~**Hash `rassoc`シェイプ（shape）ハンドラ**~~ —— 着地済み（v0.1.17）。`ShapeDispatch#hash_rassoc`が`shape.rassoc(value)`をfoldする（すべての値が`Constant`のとき、最初にマッチした値に対して`Tuple[Constant[k], V]`、またはそれ以外は`Constant[nil]`）;`hash_assoc`の逆で、`hash_key`を模倣。ユニット + インテグレーションフィクスチャカバレッジ。
- ~~**Tuple + String値foldingのギャップ**~~ —— 着地済み（v0.1.17）。`ShapeDispatch`: `Tuple#drop` / `#rotate`（サブTuple）、`#uniq` / `#index` / `#find_index` / `#rindex`（Constant要素の決定可能性）。`ConstantFolding`: `String#delete` / `#count` / `#squeeze`。すべて精度加法的、FPなし、決定可能な入力にゲート。**シェイプキャリアの値foldingの層はこれで包括的** —— 残りのfoldギャップには新しいキャリアが必要（Struct / Dataインスタンスキャリア; MathFolding精緻化向けFloat-range）でADR相当、またはブロックfoldingが必要なブロック / 2引数形式。マイクロfoldを追わないこと。

## リリース後フォローアップ

- **`data/oss-sweep/mastodon-thresholds.json`** —— 保存済み閾値を〜6のベースライン（baseline）に対してリフレッシュし、週次OSSスイープゲートが較正されるようにする（現在のファイルは未較正、`max_diagnostics: 999999`）。
