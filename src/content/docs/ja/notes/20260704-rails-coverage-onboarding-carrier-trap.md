---
title: "Rails アプリのカバレッジ強化オンボーディング — sig-gen carrier トラップと engine-bound な天井"
description: "Imported from rigortype/rigor docs/notes/20260704-rails-coverage-onboarding-carrier-trap.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260704-rails-coverage-onboarding-carrier-trap.md"
sourcePath: "docs/notes/20260704-rails-coverage-onboarding-carrier-trap.md"
sourceSha: "4f08b103b994fcdedc1a30a16ed2838d0fab6dd4d81d479634237a4de5e4d212"
sourceCommit: "5802c990ff226483b4cfa421090900fd2b8ace2c"
sourceDate: "2026-07-04T23:06:52+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266704
---

Status: real-project triage + 仮説メモ。2026-07-04、Rigor v0.2.6（`[Unreleased]`）時点で
`~/repo/ruby/rigor-survey/{redmine,mastodon}`に対して実施。非normative（設計コミットメント
なし）。redmineはRails 8.1.3（git a12198ea0）、mastodonはRails 8.1.3（v4.6.0-rc.1+186）。

Grounding: [`rigor-project-init`](https://github.com/rigortype/rigor/blob/master/skills/rigor-project-init/SKILL.md)スキルの手順に沿った
オンボーディング中に観測。[`rigor-protection-uplift`](https://github.com/rigortype/rigor/blob/master/skills/rigor-protection-uplift/SKILL.md)
が警告するcarrier-additivityトラップの実測ケース。狙う穴は
[ADR-58](../../adr/58-ivar-field-typing/)（ivar field typing）+ [ADR-67](../../adr/67-parameter-type-inference/)
（parameter inference）、tractabilityラベルは[ADR-75](../../adr/75-dynamic-provenance/) /
[ADR-63](../../adr/63-type-protection-coverage/)。

> **⚠️ 訂正（2026-07-04再調査、バグA修正後）** — 本ノート初版の見出し的主張
> 「sig-genの生成`sig/`はカバレッジを下げる／目的に純負」は**誤り**だった。それは終始
> **RBS環境クラッシュ（バグA）のアーティファクト**で、sig/ をロードするたびにenvが壊れ
> 全type-ofがDynamicに落ちていたためカバレッジが低く見えていた（手動git修正1件では他の
> bare-classアダプタ等でenvが再クラッシュし続け0.1576のままだった）。バグAをエンジンで
> 修正すると、**生成`sig/`はカバレッジを大きく上げる**（redmine +10.3pp / mastodon +5.4pp）。
> carrier-additivityトラップは実在するが、その顕在化は「カバレッジ減」ではなく
> **「非掲載メンバ脱落によるsig-quality FPの増加」**（下記「再調査」節）。以下 §2・バグB・H1は
> この訂正で置き換わる。§4の最終状態・§1（プラグイン中立）・H4（engine-bound）は有効。

## 目的と初期状態

ユーザ要求は「redmine / mastodonの型カバレッジを強化したい」。両プロジェクトとも`.rigor.yml`・
baseline・`sig/`の一切なし（未オンボード）。`rigor plugins`は**0プラグインloaded** — 素の
エンジンでの計測だった。

## 実施手順（project-init）

`.rigor.dist.yml`を両者に作成（`target_ruby: "3.3"`, `paths: [app, lib]`, `severity_profile:
lenient`, acknowledgeモード）。プラグイン集合は検出結果から:

- **redmine**（素のRails）: actionpack / activerecord / actionmailer / rails-routes / rails-i18n /
  activesupport-core-ext（6）
- **mastodon**（+Devise/Pundit/Sidekiq/rails-i18n）: 上記 + devise / pundit / sidekiq（9）

`rigor plugins`で全ロード確認（load-error 0）。以降`cwd=target` + `BUNDLE_GEMFILE=<rigor>/Gemfile`
でFlake経由実行。

## 観測データ

### 1. プラグインはカバレッジ中立

redmine `app/models`のprotectionカバレッジ（`coverage --protection`）:

| 構成 | ratio | protected/total | tractability |
| --- | --- | --- | --- |
| プラグイン0 | 0.1868 | 1924 / 10300 | engine_gap 6980, add_rbs 33 |
| プラグイン6（上記） | **0.1868** | 1924 / 10300 | engine_gap 6980, add_rbs 33 |

**バイト単位で同一**。 Railsプラグインは*診断*と一部の戻り値/relation型付けには効くが、
protectionの分母である**dispatch siteの受信者型付けは動かさない**。

### 2. sig-gen生成`sig/`はカバレッジを下げる（本命の現象）

`rigor sig-gen --params=observed --write app lib`で169ファイル生成後、redmine全体（app+lib、
28267 dispatch sites）でA/B（キャッシュ排除、git_adapterのsuperclass修正済み＝下記バグ対処後）:

| 構成 | ratio | protected | tractability |
| --- | --- | --- | --- |
| sigあり | 0.1576 | 4454 | engine_gap 19572, add_rbs 0 |
| **sigなし** | **0.1953** | **5520** | engine_gap 18437, add_rbs 116 |

生成`sig/`は保護率を**0.195 → 0.158（保護サイト1066減）**させた。一方`app/models`の
`check`診断数は**57（sigなし）= 57（fix済みsigあり）**で不変。**診断を1件も減らさずに
保護だけを削る。**

### 3. mastodonも同一パターン

`app/models`（sigなし、プラグイン込み）: ratio 0.1773（1043 / 5884）、engine_gap 3786, add_rbs 20。
triage（app+lib 1312ファイル, ~27s）: total 2358（error 4 / warning 26 / info 2328）、hintは
`gem-without-rbs`（323 gemがRBSなし＝想定内）と`genuine-bugs` ×6のみ。project-monkey-patch /
unresolved-toplevel / activesupport-core-extのhintは**無し**（AS overlay + プラグインが
undefined-methodクラスタを解消済み）。

### 4. 最終オンボード状態（sig破棄、クリーンbaseline）

| | redmine | mastodon |
| --- | --- | --- |
| baseline | 225バケット / 796診断 | 1138バケット / 2358診断 |
| `check`（baseline上） | No diagnostics | No diagnostics |

baselineの大半はプラグイン認識トレース`:info`（rails-routes.helper, actionpack.filter-call,
activerecord.model-call等）。実型診断は小さい（redmine: undefined-method 12, possible-nil 10,
argument-type-mismatch 1 / mastodon: possible-nil 14, always-truthy 2）。

## 遭遇したバグ

### バグA — sig-genのsuperclass欠落 → RBS環境クラッシュ（危険）

`rigor baseline generate`が`sig/lib/redmine/scm/adapters/git_adapter.rbs`で
`RBS::DuplicatedDeclarationError: ::Redmine::Scm::Adapters::GitAdapter`を出して失敗。

原因: ソースは`class GitAdapter < AbstractAdapter`だが、sig-genはsuperclassを省いて
`class GitAdapter`を生成。RigorのRBS環境ビルドは**sig宣言と解析ソースから収集した宣言
（superclass付き）をマージ**しようとし、superclassの有無不一致がRBS上で二重宣言として衝突する。
sig単体（+core）ロードでは再現せず、フル環境ビルド時のみ発火。`< AbstractAdapter`を追記すると解消。

**危険な点: 失敗が「改善」に化ける**。環境ビルドが落ちるとRigorは*RBS環境なし*で解析続行し、
全type-ofクエリが`Dynamic[top]`に劣化 → undefined-methodを証明できず**偽の診断減少**が起きる。
実際、壊れたsigで`app/models`の`check`は26件（undefined-method 23件が偽消失）、fix後は57件。
この57→26を「sigがFPを半減させた」と誤読しかけた（後述の対処で判明）。

### バグB — 生成`sig/`のcarrier-additivity（診断利得ゼロで保護減）

上記データ2。sigをfixしても保護は下がる（診断は不変）。sidecar `sig/`にクラスを宣言すると
そのクラスは推論モードからRBS宣言モードに切り替わり、**推論が付けていた非宣言メンバが落ちる** →
`x.foo.bar`の`foo`（sig非掲載）がDynamicを返す → `bar`の受信者がDynamic化。undefined-method
はFP-disciplineで発火しない（Dynamic受信者は不問）ため診断は増えないが、protectionは失われる。
`untyped`は主に**引数**位置（`(untyped, untyped) -> 具体型`）で無害、損失はクラス再宣言による
メンバ脱落側。`rigor-protection-uplift`スキルが明記する「sidecar sigはpurely additiveではない」
の実測。

## 対処の経緯（誤読 → 反証 → 確定）

1. sig生成後、`app/models`保護0.187→0.156かつ診断57→26を観測 → 当初「carrierトラップで
   保護減、代わりにFP半減」と両立解釈。
2. baseline generateがRBS二重宣言でクラッシュ → 環境が壊れている疑い。
3. sig単体ロードはOK、フル環境のみNG → ソース収集宣言とのsuperclass衝突と特定、`< AbstractAdapter`
   で修正。git_adapterだけが発火（RBSは最初の衝突でabort、解決順でgitが先頭だった）。
4. **fix後に再計測すると`check`は57=57**（sigの診断利得は幻）。つまり「57→26」は壊れた環境の
   副産物だった。保護低下だけが本物（キャッシュ排除・全体A/Bで0.195→0.158と再現）。
5. 目的（カバレッジ）に対しsigは純負（保護減・診断利得ゼロ）と結論 → 生成`sig/`を破棄し、
   sigなしでクリーンなbaselineを再生成・配線。

## 仮説

- **H1（REFUTED — 下記「再調査」節）: 「sig-genのsidecar `sig/`はprotectionカバレッジに
  純負」は誤り。**真相はenvクラッシュ（バグA）のアーティファクト。env修正後はsigが
  カバレッジを +5〜10pp上げる。carrierトラップは「メンバ脱落 → undefined-method FP増」として
  顕在化する（coverage増vs FP増のトレードオフ）。

- **H2: superclass欠落はsig-genの一般的欠陥**。全169ファイルで`class X < Y`が`class X`に
  なる。多くはenv内で衝突相手を持たず顕在化しないだけで、subclassが解析対象に含まれると
  RBS環境全体を落とす潜在地雷。修正候補は（a）sig-genがsuperclassを出力、（b）envビルドが
  「superclass無しの冗長reopen」をDuplicatedDeclarationErrorにせずマージ許容。**（b）は特に重要** —
  1ファイルのsig不備で*全体*がDynamicに落ちる挙動は影響が不均衡。

- **H3: 環境ビルド失敗のサイレントさ自体がUXバグ**。「診断が減った」が「RBS環境が壊れた」を
  意味しうる。env build失敗をより強く可視化（専用診断 / 非ゼロexit / triage hint）すべき。
  今回はstderrの1行警告のみで、`baseline generate`は壊れたenvのまま748診断を書き出した
  （信頼できないbaseline）。

- **H4: カバレッジ天井はengine-bound**。未保護の**~94% がengine_gap**（redmine 18437/28267）、
  手書きRBSで閉じられる`add_rbs`は**<0.5%**（redmine 116, mastodon 20）。正体はuntyped引数
  → Dynamic ivar/receiver連鎖で、これはADR-58 / ADR-67が狙う領域そのもの。config/plugin/sig
  では動かず、実際のレバーはエンジン実装。redmine/mastodonはその優先度づけの実証コーパスになる。

## Follow-up

- sig-genのsuperclass出力 / envマージ許容（バグA、H2）— **両方FIXED（2026-07-04）**。
  真因はsuperclass不一致そのものではなく、生成sigがinherited nested type
  （`GitAdapter::Revision`）を参照 → `stub_missing_referenced_types`のstub掃引が
  既宣言の`class GitAdapter`を囲み名前空間として`module`再宣言 → class/module kind
  衝突で`DuplicatedDeclarationError`（superclassを足すとnested typeが継承経由で解決 →
  stub不要 → 衝突回避、で「効いた」）。修正（a）`Generator#record_superclass` +
  `Writer#superclass_suffix`：plain-constant親を`class X < Y`として出力（`Struct.new`
  等のcomputed親は従来どおり無出力）。修正（b）`RbsLoader.append_stub_declarations`：
  envに既宣言の名前をstubしない（`collect_missing_namespaces`の`declared.include?`
  ガードを掃引側にも適用）。**（b）単独でenv崩落を防ぐ** = H2（b）の「1ファイルで全体Dynamic」
  という不均衡を解消。回帰テスト：generator_spec / writer_spec / rbs_loader_spec。
- envビルド失敗の可視化強化（H3）— 未着手（`warn_about_env_build_failure_once`の1行
  警告のみ。専用診断 / 非ゼロexit / triage hintはdemand-gated）。
- ADR-58 WD1b/WD2・ADR-67の実装がカバレッジ最大レバー（H4）。in-place additive carrierでの
  protection A/B（H1の裏取り）。

## 再調査（2026-07-04、バグAエンジン修正後）

バグA（superclass出力 + stub掃引ガード）を修正したworking treeで全て再計測。affected specs
155/0 green。redmineで修正済みエンジンによりsigを再生成 → superclass出力確認
（`class GitAdapter < AbstractAdapter`、127 with-superclass / 51 bare）、`baseline generate`
クラッシュ解消（281バケット / 956診断を正常書き出し）。

### 訂正R1 — 生成`sig/`はカバレッジを大きく上げる（§2を置換）

redmine全体（app+lib、28267 sites、キャッシュ排除A/B、**sig-genがenvを壊さなくなった状態**）:

| 構成 | ratio | protected | tractability |
| --- | --- | --- | --- |
| **sigあり（修正済みエンジン）** | **0.2986** | **8440** | engine_gap 16168, add_rbs 49 |
| sigなし | 0.1953 | 5520 | engine_gap 18437, add_rbs 116 |

**+10.3pp（保護サイト +2920）**。初版 §2の0.1576（sigあり）は、手動git修正1件では他ファイルで
envが再クラッシュしていた*壊れたenv*の数字だった。mastodon `app/models`でも同傾向:
sigあり0.2311（1360/5884）vsなし0.1773（1043/5884）→ **+5.4pp**。

### 訂正R2 — carrierトラップの真の顕在化 = sig-quality FP増（バグBを再定義）

envが健全化すると、sigがクラス再宣言時に落とす非掲載メンバが**今度は証明可能な
`call.undefined-method`として噴出**する。redmine triage A/B（baseline非依存）:

| rule | sigあり | sigなし |
| --- | --- | --- |
| call.undefined-method | 155 | 33 |
| call.wrong-arity | 22 | 0 |
| def.return-type-mismatch | 10 | 0 |
| （error合計） | 201 | 57 |

adjudication（全てsig-quality FP）:
- **undefined-method +122**: メッセージが`undefined method 'scope_select' … the project defines
  'Redmine::Activity::Fetcher#scope_select'`と自白 — sigがクラス宣言時に**実在メンバを落とした**。
- **wrong-arity +22**: `Struct.new`サブクラス（`Webhook::Executor`, `Redmine::Notifiable`,
  `MultipleValuesDetail`等）の生成initializeをsigが欠く → `given 3, expected 0`。
- **return-type-mismatch +10**: 過度に狭い推論戻り（`declared nil, inferred X` / `declared bool`）。

つまり**coverage +10ppとFP +150のトレードオフ**。protection-upliftの二重ゲート
（coverage増AND新規診断ゼロ）をFP側で破る。acknowledgeモードではbaselineが吸収するが、
「実在メソッドをundefinedと言う」FPでbaselineを汚す。

### 訂正R3 — 再調査で見えた最大のエンジンレバー: **プロジェクト自身の`sig/`をadditiveに**

FPの根は「sigにクラスを宣言するとそれが*完全*とみなされ、推論が付けていたメンバが落ちる」
（RBS宣言モードのall-or-nothing）。もし**プロジェクト自身の`sig/`を推論とマージ（additive）**
できれば、coverage +10ppを**FPゼロ**で得られる。候補: (a) sig-genが宣言クラスの全メソッドを
（un-inferrableは`untyped`戻りで）出力し脱落を無くす、（b）エンジンがプロジェクトsigを
authoritative-completeでなくinference-additiveに扱う。（b）はバグAのクラッシュ修正より
射程が大きく、Railsアプリ全般の「sig-genでcoverageを上げたいがFPを出したくない」を解く。
H1のin-place additive carrier案（rbs-inline `#:` / return-override）は（a）の手動版に相当。

## さらなる型付け障害の調査（2026-07-04、sigなしクリーン状態で）

`coverage --protection --format json`の`add_a_type_here`（method × count × dynamic_origin）を
集計 + `Rigor.dump_type(x)`プローブで実型を確認し、Dynamicの**発生源**を特定した。

### 障害の分布（redmine app+lib,未保護22747, count加重）

| dynamic_origin | 割合 | tractability |
| --- | --- | --- |
| unsupported_syntax | 81.1% | engine_gap |
| （nil / 未分類） | 18.4% | — |
| explicit_untyped | 0.5% | add_rbs |

Dynamic受信者上のトップメソッド: `[]`(2378) `==`(716) `to_s`(632) `table_name`(514) `current`(493)
`id`(472) `where`(406) `+`(400) `present?`(363) `each`(359) `new`(355) `[]=`(324) `is_a?`(323)…
— いずれも受信者がDynamic化した後の下流。`dump_type`プローブが真の発生源を明かした:

### O1（redmine最大・config修正可）: rigor-activerecordがinert

`load-error: rigor-activerecord: schema file db/schema.rb not found; AR call checks skipped`。
Redmineは`db/schema.rb`をコミットしない（327 migrationから生成）ためmodel_indexにschemaが
無く、**ARチェック全体がスキップ**。結果、`User` `Issue`などモデル定数・`Issue.where(…)`・
`Issue.find(…)`・AR由来ivarが**すべて`Dynamic[top]`**（プローブ実測）。対比: mastodon
（`db/schema.rb`あり）では`Account.where(id:1)` → `ActiveRecord::Relation[Account]`、
`User.find(1)` → `User`と型付く。ただしO1の上限はO2で頭打ち（下記）。

### O2（両者・plugin/engine gap）: モデル定数が`Dynamic[top]`

AR稼働時（mastodon）でも**裸のモデル定数`Account`は`Dynamic[top]`**。プラグインは
recognizedなcallの*結果*（`.where`→Relation, `.find`→Model）は型付けるが、モデル定数自身を
`singleton(Account)`に型付けない。ゆえにmastodonのworking ARでもapp/modelsの保護は
~0.177止まり（inert ARのredmine 0.187とほぼ同じ）— **ARスキーマ導入は銀の弾丸ではない**。
model_indexは存在を知っているので、定数を`singleton(Model)`へ型付ける拡張がO2の解。

### O3（両者・plugin gap）: `params` / `session` / `request`が未型付

最大のmethodクラスタ`[]`(2378) + `[]=`(324) ≈ 2700サイトは、サンプルした限り
`params[:x]` / `session[:x] =` / `request.query_parameters[:x]`が支配的。ActionControllerの
これらを型付けるプラグインは無く、全て`Dynamic[top]`（プローブ実測）。rigor-actionpackが
paramsをhash-shape / `ActionController::Parameters`に型付ければ最大の単一クラスタが閉じる。

### O4（両者・engine）: untyped ivar → メンバ

`@object.project` `@author.name`等。AR由来ivarはO1/O2で改善するが、非AR ivarは
[ADR-58](../../adr/58-ivar-field-typing/)領域。

### O5（横断・計測の質）: provenanceがcatch-allで誤誘導

上記O1（config gap）・O2/O3（plugin gap）は本来`framework_dsl_boundary`（→ enable_plugin）や
config-gapに分類されるべきだが、**81% が`unsupported_syntax`（→ engine_gap）に一括りにされ**、
`coverage --protection`のtractability誘導が「engine_gap = ユーザclosableでない」と誤って伝える。
[ADR-75](../../adr/75-dynamic-provenance/)のcause setは粗く、Dynamic受信者の真因（未型framework
オブジェクト / 未認識モデル定数 / inert pluginのload-error）を区別できていない。**H4の「94%
engine-bound」は過大評価**で、相当部分はplugin/configで閉じられる。

### 障害ランキング（レバーの大きさ順）

1. **O3 params/session型付け**（~2700, plugin,両者）— 最大の単一クラスタ、rigor-actionpack拡張。
2. **O2モデル定数 → `singleton(Model)`**（plugin,両者）— ARのrecognized範囲を定数へ拡張。
3. **O1 redmineのschema供給**（config, redmineのみ）— ARを稼働させる。上限はO2が規定。
4. **O5 provenance精緻化**（計測）— 誤誘導の是正。coverageの信頼性。
5. **O4 ADR-58 / ADR-67**（engine）— O1-O3で残る素のDynamic ivar/param。

## 実装（2026-07-04）: O3 params型付け + coverageのplugin-blind修正

O3の実装中に、より大きな計測バグが露見した。

### 実装I1 — rigor-actionpackがcontrollerの`params`を型付け

`dynamic_return methods: [:params]`（implicit-self + controller `self`でgate）が
`params`を`ActionController::Parameters`に型付ける。**RBSは敢えて同梱しない**: 受信者は
concrete（`params[:x]`の ~2400 dispatchが保護される）だが、クラスのメソッド面はengine-lenient
のまま（RigorはRBS未知クラスにundefined-methodを出さない）→ `params.require(...).permit(...)`・
`params.to_unsafe_h`等が全てFP-safe。部分RBSを同梱するとcarrierトラップ（宣言クラスは
非掲載メンバを落とす）を再発させるため。ADR-5: コンテナを型付け、値はlenient。`check`/`dump_type`
で検証、FPゼロ。

### 発見I2（I1より重大）— `coverage --protection`が**plugin-blind**だった

I1実装後も`coverage`の比率が動かなかった。原因: protection scanのscopeが
`Scope.empty(environment: Environment.for_project(libraries, signature_paths))` = **RBS環境のみで
plugin registryをwireしていない。**ゆえにcoverageは**pluginが`dynamic_return`で型付けた
受信者を一切見ていなかった**（paramsも、`Model.where`→`Relation[Model]`も）→ 全てDynamic扱いで
未保護に誤カウント。dump_typeプローブ（`check`経由）はpluginを見るので正しかったが、
**coverageの比率はplugin貢献を構造的に過小評価**していた。

**重要な含意**: 本ノート §1の「プラグインはcoverage中立（0.187→0.187）」と、§O1–O5のcoverage
比率・engine_gap割合は**すべてplugin-blindな計測**で、実際の保護を過小評価していた（dump_type
ベースの型判定＝O1–O5の質的結論は有効）。

修正: coverageのprotection scopeを`LanguageServer::ProjectContext#environment`（runner/LSPと
同じplugin-aware environment: registry materialize + prepare pass）で構築。

### 修正後の実測（plugin-aware coverage + params型付け）

| 対象 | 修正前（plugin-blind） | 修正後 | 差 |
| --- | --- | --- | --- |
| redmine app+lib | 0.1953 (5520/28267) | **0.2227** (6295/28267) | +2.7pp（主にparams, `[]` 2378→1782） |
| mastodon app/models | 0.1773 (1043/5884) | **0.2364** (1391/5884) | +5.9pp（**AR relation型付けが可視化**） |

mastodonの +5.9ppはparams無しのapp/modelsなので、丸ごと「従来coverageに不可視だったAR
`dynamic_return`貢献」。これがplugin-blindバグの規模を示す。コミット`ec4d7a6d`（params + coverage）、
`7afa4aa5`（sig-gen env修正）。

### 発見I3 — O2は誤り、真のgapはcoverageの**discovery未seed**

O2「モデル定数がDynamic」を実装しようとして、まず再検証 → **全app/modelsを発見対象にすると
`Account` → `singleton(Account)`、`User` → `singleton(User)`と正しく型付く**（`Status.where` →
`Relation[Status]`も）。先の「Account → Dynamic」は**単一ファイルprobeのアーティファクト**
（`_rigor_probe.rb`単体checkではsiblingのapp/modelsが発見されない）だった。O2はエンジンgap
ではない。

真のgapはplugin-blindと同種: **coverageのprotection scanが`Scope.empty`でcross-file
発見（`discovered_classes`）をseedしていなかった** → siblingファイルのクラス定数がcoverage内で
Dynamic化し未保護に誤カウント。`check`はper-fileで`seed_project_scope`するので、またcoverage
だけが乖離。修正: scan scopeに`ScopeIndexer.discovered_classes_for_paths(paths)`をseed。

### 修正後の実測（plugin-aware + discovery-seed、= check忠実）

| 対象 | 原初（plugin-blind） | +plugin-aware | +discovery-seed | 総差 |
| --- | --- | --- | --- | --- |
| redmine app+lib | 0.1953 | 0.2227 | **0.3278** | **+13.2pp** |
| mastodon app/models | 0.1773 | 0.2364 | **0.3112** | **+13.4pp** |

**真の保護率は ~33%**。「~18-20% / 94% engine_gap」はcoverageの2つのscope欠落
（plugin registry未wire + discovery未seed）による約**13ppの過小評価**だった。両変更
`make verify` green、actionpack spec +3、coverage_command_spec不変。コミット`2273f2c1`
（discovery-seed）。discovery-seed後のmastodon modelsトップ未保護は`[]`(288) `present?`(161)
`nil?`(136) `!` `id` `==` `to_s` `each` — 残りはivar / association / method-chain結果の素の
Dynamic。

### I4 — request-context readerファミリ完成（session/request/flash/cookies）

paramsと同じlenient-nominal手法を`session`→`ActionDispatch::Request::Session`、`request`→
`ActionDispatch::Request`、`flash`→`ActionDispatch::Flash::FlashHash`、`cookies`→
`ActionDispatch::Cookies::CookieJar`に拡張（コミット`53fec3eb`, `ec8b6e84`）。全てFPゼロ
（`session.delete`/`request.xhr?`/`flash.now`等はengine-lenient）。`flash[`はredmine controllers
で129使用と多く、app/controllers 0.045→0.229に。

### 最終累積カバレッジ（全修正後 = check忠実）

| 対象 | 原初（plugin-blind） | 最終 | 総差 |
| --- | --- | --- | --- |
| redmine app+lib | 0.1953 | **0.3386** | **+14.3pp** |
| mastodon app/models | 0.1773 | **0.3112** | **+13.4pp** |
| mastodon app/controllers | ~0.04（params前） | **0.2736** | — |

### 境界と次レバー

well-scopedなquick-sliceはここまで（readerファミリ + coverage忠実度2修正）。残る未保護は
**素のDynamic ivar / association / method-chain結果**で、その真因はuntyped param → Dynamic ivar
連鎖。**ADR-58は発火ポリシー（possible-nil FP削減）が主題でprotection向上ではなく**（ADR自身
「ivarを`Node | nil`に精緻化するとFPが悪化」と明記、実質実装済）、真のレバーは
**ADR-67（parameter inference、proposed）** = call-siteからparam型を推論してivar/receiverを
sharpenする大規模機能。これは独立した本格作業で、quick-sliceの継続ではない。

## GOTCHAs（再実行者向け）

- 診断メッセージはi18n由来の非ASCIIを含む → JSONパースは`File.read(f, encoding:"UTF-8").scrub`。
- `coverage`に`--no-cache`は無い → `rm -rf .rigor/cache`でバスト。`coverage --protection`の
  数値は複数回・キャッシュ排除で安定（交絡なし）。
- 生成物（`.rigor.dist.yml` / `.rigor-baseline.yml` / `.rigor/cache/`）はsurveyチェックアウト内で
  untracked。sweepのtag切替でも残存する。
