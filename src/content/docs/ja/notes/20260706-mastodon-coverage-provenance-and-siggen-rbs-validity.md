---
title: "Mastodon 型カバレッジ穴の provenance 分析 + sig-gen の RBS 妥当性クラッシュ"
description: "Imported from rigortype/rigor docs/notes/20260706-mastodon-coverage-provenance-and-siggen-rbs-validity.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260706-mastodon-coverage-provenance-and-siggen-rbs-validity.md"
sourcePath: "docs/notes/20260706-mastodon-coverage-provenance-and-siggen-rbs-validity.md"
sourceSha: "bd972dcd9d427a9fa0895264ee4a613de01a7dff28278d7d10fa9327bf7a39a9"
sourceCommit: "3eb7b4c256e7aae802b605ef7897408bc25495b9"
sourceDate: "2026-07-06T20:29:30+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266706
---

Status: real-project triage + バグ発見/一部修正 + ADR提案の根拠メモ。2026-07-06、Rigor
v0.2.7（`[Unreleased]`）時点で`~/repo/ruby/rigor-survey/mastodon`（Rails 8.1.3,
v4.6.0-rc.1+186）に対して実施。非normative（設計コミットメントは[ADR-82](../../adr/82-dynamic-provenance-wiring/)
が持つ）。

Grounding: 直接の先行ノートは[2026-07-04 Railsカバレッジ強化オンボーディング](../20260704-rails-coverage-onboarding-carrier-trap/)
（以下「07-04ノート」）。本ノートはそのO5（provenance catch-all）とH3（sig env-crashの
silent化）を、mastodon app+libフルスコープで再確認・深掘りし、うちsig-genのRBS妥当性バグ
1クラスをengineで修正し、残るprovenance-wiringを[ADR-82](../../adr/82-dynamic-provenance-wiring/)
に切り出す。ラベルは[ADR-75](../../adr/75-dynamic-provenance/)（Dynamic provenance）/
[ADR-63](../../adr/63-type-protection-coverage/)（protection coverage）。

## 初期状態

mastodonは07-04ノートで既に`rigor-project-init`（acknowledgeモード / `severity_profile:
lenient`）済み。`.rigor.dist.yml`（Railsプラグイン9本）+ `.rigor-baseline.yml`（1,138バケット）
あり・未コミット、`sig/`なし。本セッションはこの状態から`coverage --protection`を再取得した
（07-04のplugin-aware + discovery-seed修正がlanded済みなので、数値はcheck忠実）。

## 1. カバレッジ全体像（`coverage --protection`, app+lib, ~53s, 1,312ファイル）

| 指標 | 値 |
| --- | --- |
| protection ratio | **0.3148 (31.5%)** |
| protected / total | 9,703 / 30,822 |
| parse errors | 0 |

31.5% は07-04ノートの「plugin-blind + discovery-unseededの2バグを修正した後のcheck忠実な
真の保護率 ~33%」と整合。coverage scope修正はlanded済みで、本測定はその上での再確認。

未保護のディレクトリ分布（count加重）:

```
app/lib 4138 / app/models 3889 / app/services 3583 / app/controllers 2655
app/serializers 1793 / lib/mastodon 1566 / app/helpers 835 / app/workers 624
```

最悪ファイル: `app/lib/feed_manager.rb`（435穴/19.6%）、`activitypub/process_account_service.rb`
（323/18.4%）、`post_status_service.rb`（194/13.4%）、`app/models/account.rb`（173/26.7%）。

Dynamic受信者上のトップメソッド: `[]`(2145) `id`(754) `present?`(545) `nil?`(501) `==`(453)
`!`(423) `account`(338) `to_s`(298) `map`(259) `blank?`(244) `where`(201)… — いずれも
ARモデル / ActionController params / Deviseヘルパのuntypedレシーバ上のイディオムの下流。
サンプル: `Tag.find_normalized(...).id`（カスタムARファインダ→untyped）、
`current_user&.account&.unavailable?`、`params[:limit].present?`。

## 2. provenanceはcatch-allでtractabilityを誤誘導（O5の再確認・深掘り）

`add_a_type_here`のsiteをtractability別に集計:

| tractability (cause) | sites | 割合 |
| --- | --- | --- |
| `engine_gap` (`unsupported_syntax`) | 17,727 | 84.0% |
| （cause未記録 / null） | 2,921 | 13.8% |
| `add_rbs` (`explicit_untyped`) | 471 | 2.2% |
| `enable_plugin` (`framework_dsl_boundary`) | **0** | 0% |
| `add_rbs` (`external_gem_without_rbs`) | **0** | 0% |

**98% がcatch-all（`unsupported_syntax` + null）に落ちる**。 Railsアプリなら本来
`framework_dsl_boundary`（Devise `current_user` / ActionController）や`external_gem_without_rbs`
（RBS欠落gem）に分類されるべき受信者が**1件も**そのcauseを持たない。ADR-75のtractability
誘導（「plugin有効化vs手書きRBS vs engine限界」の切り分け）は実在のRailsアプリ上で機能して
いない。

### 原因（engineを読んで特定した2つのギャップ）

`DynamicOrigin::UNSUPPORTED_SYNTAX`は定義上「未モデル構文への推論フォールバック」＝**キャッチ
オール**（`lib/rigor/inference/dynamic_origin.rb:22`）。具体causeが付かない全てがここに落ちる。

- **G1ルックアップのギャップ.** `ProtectionScanner#scan`はprovenanceをdispatchの
  **直接receiverノード**で引く（`protection_scanner.rb:49`, `scope.dynamic_origins[node.receiver]`）。
  一方`MethodDispatcher`が具体causeを記録するのは**Dynamic値を生んだcallノード**
  （`method_dispatcher.rb:113/141/166/178`）。`tag.id`のreceiverは`tag`（ローカル読み）で、
  真の出所`Tag.find_normalized(...)` callノードとは別。ローカル/ivar読みのreceiverノードには
  記録が無くnil（→ null 13.8%）か、`ExpressionTyper#fallback_for`の汎用`UNSUPPORTED_SYNTAX`
  （`expression_typer.rb:911-912`）に落ちる（→ 84%）。伝播は連鎖呼び出し`a.b.c`で`.c`の
  receiverがcallノード`a.b`の時にしか効かない。

- **G2記録条件のギャップ.** `FRAMEWORK_DSL_BOUNDARY`はプラグインが`dynamic_return`で
  **Dynamicを返した時のみ**記録（`method_dispatcher.rb:112`）だが、プラグインは大半で**具体型**を
  返す（＝そのサイトは保護済みで穴でない）ので、穴として残るサイトにこのcauseはほぼ付かない。
  `EXTERNAL_GEM_WITHOUT_RBS`はADR-10 dependency-source / `pre_eval:`のopt-inが前提で、
  stock Rails構成では発火しない。加えて`try_discovered_method`（`method_dispatcher.rb:246`）と
  `try_user_class_fallback`（`:210`）はDynamicを返すがcauseを**一切記録しない**。

→ provenance-wiringの拡充（G1の伝播 + G2の記録追加 + 新causeのtractability割当）を
[ADR-82](../../adr/82-dynamic-provenance-wiring/)に切り出した。precision-additive（型・診断・severity
不変）なので本体は安全だが、G1のbinding→origin伝播はjoin下でのside-table健全性・perfを
要設計で、拙速にlandしない。

## 3. sig-gen再計測 — env-crashがsigを「有害」に見せる（H3の再実演）

07-04ノートR1はenv-crashバグA（superclass欠落）修正後に「sigはカバレッジを +5〜10pp
上げる」と訂正した。本セッションでmastodon **app+libフル**に対しsig-gen再計測すると、**別の**
env-crashが再発した。

### 素の再計測（sig生成 → coverage）

| 構成 | ratio | protected | tract |
| --- | --- | --- | --- |
| sigなし | 0.3148 | 9,703 | engine_gap 17727, add_rbs 471 |
| sigあり（素） | **0.2627** | 8,098 | engine_gap 19473, **add_rbs 0** |

−5.2pp。**しかしこれはenv-crashアーティファクト**。stderr:

```
RBS environment build failed: RBS::ParsingError:
  sig/helpers/application_helper.rbs:4: unexpected record key token, token=`data`
```

sig-genが**不正なRBSを生成**しenvビルドが丸ごと落ち、「Rigor will continue analyzing with
no RBS env in scope, so most type-of queries will return Dynamic[top]」= 全type-ofがDynamicに
劣化 → 保護が消えて**sigが害に見えた**（add_rbs=0はRBS dispatchが一切効いていない証拠）。
07-04ノートH3「診断減少がenv崩壊を意味しうる」の再実演で、今度はcoverage側で顕在化。

### sig-genのRBS妥当性バグ（2クラス）

生成333ファイルを個別に`RBS::Parser.parse_signature`にかけると**330 valid / 3 invalid**。
不正は2クラス:

1. **非識別子recordキー（2→本セッションでengine修正済み）.** mastodonの`html_attributes`が
   `{ lang:, class:, :"data-contrast" => …, :"data-color-scheme" => … }`を返し、`HashShape`が
   symbolキー`:"data-contrast"`を**bare `data-contrast:`**と出力 → RBSパース不能。RBS文法は
   bare非識別子キーも`"data-contrast":`（引用符+コロン）も拒否し、`"data-contrast" =>`
   （引用符+ファットアロー）のみ受理する。**修正**: `Type::HashShape#erase_key_prefix`がbare識別子
   symbolは`key:`、それ以外は`"key" =>`を出力（`describe`は表示専用なので従来の`"a":`を維持し
   blast radius最小化）。回帰テスト追加、`hash_shape_spec` 27/27 green。

2. **ブロックパラメータの誤レンダリング（3ファイル、未修正）.**
   `def initialize: (**untyped, ?{ (?) -> void }) -> void` — optional blockを括弧内にカンマ付きで
   出力し（正しくは括弧の外）、`(?)`も不正なブロック引数。`connection_pool/*`,
   `elasticsearch/client_extensions`の3件。sig_genのwriter領域の別欠陥で、本セッションでは
   characterizeのみ（whack-a-moleを避ける）。

### 健全envでのgenuineな数字（不正3ファイル除外, 330 files）

| 構成 | ratio | protected | env |
| --- | --- | --- | --- |
| sigなし | 0.3148 | 9,703 | — |
| sigあり（330 valid, env HEALTHY） | **0.3195** | 9,848 | healthy |

**genuineなsig効果は +0.47pp（protected +145）に過ぎない**。素の −5.2ppとgenuine +0.47ppの
**5.7ppスイングは、たった1つの不正sigファイルがenv全体を落とした**ことに起因する。07-04の
app/models単独 +5.4ppと違い、app+libフルはcontrollers/services/libが支配的でsigの寄与が薄い。
加えて07-04 R2のcarrier-trap（クラス再宣言でメンバ脱落 → sig-quality FP +150）は健在。
**結論: app+libスケールではsig-genは保護カバレッジの有効レバーでない**（微増vs FP・crashリスク）。

## 4. 障害の真因ランキング（レバーの大きさ順、mastodon app+lib）

1. **provenance-wiring（計測の信頼性）— [ADR-82](../../adr/82-dynamic-provenance-wiring/).**
   84% catch-allをactionableに割る。engine変更だがprecision-additive。
2. **env-build resilience（sig実用化の前提）.**不正sigファイル1つがenv全体を落とす
   不均衡（07-04 H2(b)/H3）。quarantine/skipすればsig-genの残バグに対しても頑健になり、
   「診断減 = env崩壊」のsilent failureも塞げる。専用診断 / 非ゼロexitも要（07-04 H3、未着手）。
3. **sig-genのRBS妥当性（block-paramクラス）.**上記3.2、writer修正。
4. **ADR-67 parameter inference / ADR-58 ivar typing.**残る素のDynamic ivar/param/association。
   protection天井の本丸（07-04 H4/§境界）。config/plugin/sigでは動かない。

## Follow-up

- **[ADR-82](../../adr/82-dynamic-provenance-wiring/)** — provenance-wiring（G1伝播 + G2記録 +
  新cause）。本ノートが根拠。**WD1+WD2+WD3+WD6+WD7+WD8 LANDED 2026-07-06**（下記「実装」節）。
  WD7 = 正確per-siteメトリクス + param enrichment（ADR-67）、WD8 = unbound ivar enrichment
  （ADR-58）。累積causeless 49%→26%、inferred 15倍。actionabilityレバーはほぼ出し切り。
- **sig-gen record-key修正** — LANDED（`Type::HashShape#erase_key_prefix`、本セッション、CHANGELOG）。
- **env-build resilience** — **quarantine + 可視化LANDED 2026-07-06**（`RbsLoader.add_project_signatures`
  がproject `signature_paths:`を1ファイルずつロードし、parse失敗をquarantine → env全体は生存。
  `RbsLoader#warn_about_quarantined_signatures`がskipしたファイル名 + parseエラーを一度警告）。
  実証: good+broken混在sigで`RBS classes available`が0でなく生存（good側のクラスは型付く）。
  これでsig-gen block-param等の残バグに対してもenvは頑健化。**残**: 専用診断 / 非ゼロexit
  （07-04 H3、CI可視性）は未着手（新rule idはADR-50のvocabulary freeze対象なので要検討）。
- **sig-gen block-paramレンダリング** — **FIXED 2026-07-06**（`Generator#block_signature_suffix`）。
  `def initialize(**opts, &block)`が`(**untyped, ?{ (?) -> void })` = blockを括弧内にカンマ結合
  （RBSは`optional keyword argument type is expected`で拒否、`(?)`も不正）で出していた。RBSでは
  blockは括弧の**外**なので`(**untyped) ?{ (*untyped) -> untyped } -> void`に修正（block signatureは
  未観測なのでADR-5で最も寛大な`*untyped`→`untyped`）。generator/writerのblock出力箇所は
  `render_initialize_param_list`のみ（`render_param_list`はblockを出さない）。回帰テスト2本
  + RBS::Parserパース検証。env-resilience（上記）で被害は既に封じ込め済みだが、そもそも不正RBSを
  出さなくなった。3.2の残バグ解消。

## 実装（2026-07-06）: ADR-82 WD2+WD3 + re-bucketing計測

ADR-82のWD5（「WD2+WD3を先にlandしてre-bucketingを測り、WD1のコストを判断」）を実施。

- **WD3**: 新cause `DynamicOrigin::INFERRED_RETURN_UNTYPED`（tractability = `engine_gap`）。
  「callは解決したが戻りを推論できない」= `unsupported_syntax`（未モデル構文）でも
  `explicit_untyped`（RBSでuntyped宣言）でもない、推論ギャップ。CLIは
  `DynamicOrigin.tractability`を中央参照するのでrenderer変更不要。
- **WD2**: `MethodDispatcher`の`try_discovered_method`と`try_user_class_fallback`が
  Dynamicを返す時にcallノードへ`INFERRED_RETURN_UNTYPED`を記録（各1行の
  `record_dynamic_origin`）。連鎖`a.b.c`で`.b`が解決済みユーザメソッドの時、`.c`の
  receiver（= `a.b` callノード）が正しいcauseを得る。

### 計測（mastodon app+lib, no-sig, cause別site数）

| cause | baseline | WD2/3 | Δ |
| --- | --- | --- | --- |
| unsupported_syntax | 17,727 | 17,565 | −162 |
| (null) | 2,921 | 2,872 | −49 |
| **inferred_return_untyped** | 0 | **211** | +211 |
| explicit_untyped | 471 | 471 | 0 |
| protection ratio | 0.3148 | 0.3148 | 0（precision-additive確認） |

**211サイト（全体の ~1%）のみ再バケット**。 adjudication（正しい帰属を確認）: 移動した
サイトは`<解決済みユーザメソッド>.foo`の連鎖 — `parsed_uri.path`（`def parsed_uri`あり）、
`media_attachment_file.path`（`def media_attachment_file`）等で、いずれも「戻りを推論できない
ユーザメソッド」= `inferred_return_untyped`が正当。少数派の`directory_url.path`
（`directory_url = Addressable::URI.parse(...)`のローカル）はgroupのdominant-origin表示に
混ざるだけで、これこそG1（local receiverはcall-node記録に届かない）の実例。

**結論（WD5の解決）**: 小ささがG1診断を実証した。残る84% はlocal/ivar receiverで、
callノードにいくらcauseを記録してもreceiver-nodeルックアップが届かない。ゆえに
**WD1（ルックアップ伝播）はdemand-gatedでなく必須**。WD2+WD3は「安価な診断確認」として
役目を果たし、次はWD1の設計（flow-varyingな`Scope` binding→origin-nodeアソシエーション、
`make bench-perf` + discovery/self-checkゲート）。

## 実装（2026-07-06）: ADR-82 WD1 + 計測（modest、次レバー = WD6にredirect）

WD1（bare receiverへのbinding origin伝播）を実装。`Scope#local_origins`/`#ivar_origins`
（name→cause側テーブル、==/hash除外、メソッド境界でリセット）を代入時にset
（`StatementEvaluator#eval_local_write/#eval_ivar_write`、rhsがorigin付きDynamicの時）、
`ProtectionScanner#propagated_origin`がreceiver自身のノードにoriginが無い時に辿る。

### 計測（mastodon app+lib, no-sig, cause別site数、group-dominant集計）

| cause | baseline | WD2/3 | WD1 |
| --- | --- | --- | --- |
| unsupported_syntax | 17,727 | 17,565 | 17,854 |
| (null) | 2,921 | 2,872 | **2,550** |
| explicit_untyped | 471 | 471 | 462 |
| inferred_return_untyped | 0 | 211 | 253 |
| ratio | 0.3148 | 0.3148 | 0.3148 |

**WD1はnullバケット（cause無し）を ~322サイト削減**（2,872→2,550、ratio不変）。だが
**dominantな84% unsupported_syntaxはほぼ不変**（むしろ +289、nullだったlocalが「未解決RHS」
由来unsupportedを伝播）。

### adjudication → 「primary lever」は誤り、次レバーはWD6

residualを実サンプルすると、dominantなホールreceiverは**bare変数読みではなく中間式/チェーン**:
- `signed_request_account.uri[…]`（`[]`のreceiverはcallチェーン）
- `account_id_param.present?`（receiverはmethod call）
- `Status.tagged_with(tag.id)`

チェーンの`.foo`が**Dynamic receiver上でディスパッチされると結果に汎用`unsupported_syntax`を
記録し、上流のcauseを失う**。WD1（local/ivar読みのみ）はこれに届かない。制御ケースで伝播自体は
発火確認済み（`y = helper; y.save`で`y.save` receiverがbinding originを継承）。

→ **次レバー = WD6チェーンorigin継承**（Dynamic receiver上の呼び出し結果がreceiverのoriginを
継承）。84% の大半がここ。ただし最ホットなdispatch経路に触れFP/perfリスクが高いため、独立した
measured/adjudicated/bench-perf-gatedスライスにdefer（WD2/3→WD1と同じ規律）。WD1は保持
（正しい・perf-neutral・null削減・WD6の基盤）。

### perf

`make bench-perf`はFAILするが、**master自身もFAIL**: committed baseline（19.77M alloc / 16.6s
wall）がstaleで、master 27.51M/7.2s・WD1 27.54M/7.2s（**+0.1%、perf-neutral**）。baseline
再取得（CI Linux計測）は別follow-up。

## 実装（2026-07-06）: ADR-82 WD6チェーンorigin継承

WD1の計測が示した「dominantはチェーンreceiver」を受け、WD6を実装。`call_type_for`の
**既存コメント**（「Dynamic receiverの結果はdynamic originを継承する」— 未実装だった）を実装:
`ExpressionTyper#inherit_receiver_origin`がDynamic receiverの呼び出し結果callノードに
receiverの実効originを記録（`return dynamic_top`は不変）。実効originは共有
`Inference::OriginLookup.origin_for`（`dynamic_origins[node] || local/ivar 伝播`）で、WD1の
ルックアップと統一（`ProtectionScanner`も同ヘルパへ）。

### 計測（mastodon app+lib, no-sig, cause別site数、group-dominant集計）

| cause | WD1 | WD6 |
| --- | --- | --- |
| unsupported_syntax | 17,854 | 19,405 |
| **(null)** | 2,550 | **1,356** |
| explicit_untyped | 462 | 217 |
| inferred_return_untyped | 253 | 141 |
| ratio | 0.3148 | 0.3148 |

**WD6はnull（causeless）バケットを2,550 → 1,356（−1,194）削減** — WD1（−322）の約4倍。累積
baseline 2,921 → 1,356（nullの半分超をラベル化）。probeで3ホップ伝播確認（`y.foo.bar.baz`の
全ホップが`y`のbinding originを継承）。ratio不変（precision-additive）。

### 正直な読み: 完全性↑、actionabilityは限定的 → 次レバー = root cause充実

ラベルは**unsupported_syntax支配**（null→unsupported +1,551）。理由: チェーンの**root**が
unsupportedを記録する — implicit-selfのmemoized reader、`params[:x]`のindex、metaprog accessor。
`unsupported_syntax`もnullもtractabilityはengine_gapなので、WD6は**provenance完全性**
（causelessホール半減）を買うが**actionability**（enable_plugin/add_rbsへのルーティング）は
あまり動かさない。inferred/explicitのgroup-dominant減は集計ノイズ（rootがunsupported化した
チェーンがgroupをflip）。

→ **次レバー = chain rootのcause充実**: implicit-self解決経路が`inferred_return_untyped`を
記録（WD2のexplicit-receiver tierと同様）、framework index read（`params`/`session`）にframework
cause。これらをWD1/WD6の伝播がchain全体に無料で広げる。demand-gated follow-up。

### perf

`make bench-perf`はstale baselineでFAILするがA/Bはperf-neutral: master 27,540,795 alloc /
7.77s、WD6 27,548,368 / 7.83s（**+0.03%、+7,573 alloc**）。recordはDynamic-receiver呼び出し
毎のO(1) hash write。self-check `lib`はDynamicチェーンが少なく影響最小。

## 実装（2026-07-06）: ADR-82 WD7 — 正確per-siteメトリクス + param root-enrichment

WD6までgroup-dominant集計で測っていたが、それがlossyと判明。2つの結合した変更。

### 正確メトリクス（+ WD1/WD6計測の訂正）

`coverage --protection`はholesをmethodでグループ化し各groupの**dominant** causeを報告、
`tractability_summary`もそれをgroup countで加重していた。mixed groupの少数派cause（特に
causelessサイト）が消える。per-site正確な`cause_site_counts`（`"none"`含む、tractability_summary
もこれ由来に修正）を追加すると**真の状態**が判明:

| cause | per-site正確（WD1+2+3+6後） |
| --- | --- |
| **none（causeless）** | **10,390（49%）** |
| unsupported_syntax | 10,126（48%） |
| inferred_return_untyped | 351 |
| explicit_untyped | 252 |

**本ノート/ADRのWD1/WD6の「null 2,921→1,356」はgroup-dominantアーティファクトだった**。真の
causelessはWD6後も**10,390（49%）**。WD1/WD6は実仕事をした（ラベル済みは維持）が、その規模は
lossyメトリクスで過大表示されていた。provenance完全性は ~51%（~94% ではない）。

### param enrichment（causelessの最大actionableスライス）

49% causelessの最大actionable部分は**未宣言param**（`def f(x); x.foo`は`x`をuntypedに
bind、bare param receiverはcause無し）。`build_method_entry_scope`がuntyped paramの
`local_origins`を`inferred_return_untyped`でseed（untyped paramはADR-67の典型ギャップ）→
WD1ルックアップが`x.foo`をラベル、WD6が`x.foo.bar`へ伝播。seed-timeのみ（hot read path不変）。

| cause | before | param-enrich |
| --- | --- | --- |
| none | 10,390 | **7,305** |
| inferred_return_untyped | 351 | **3,460** |
| unsupported_syntax | 10,126 | 10,102 |

**~3,100サイトがcauseless → inferred_return_untyped（ADR-67ルーティング）** = 本物の
actionability利得。ratio不変（precision-additive）、perf-neutral（A/B +0.15% alloc）。残る
causeless 7,305は主にunbound ivar read（ADR-58）+ dynamic_topノード種（yield/super/block）。

### WD8 = unbound ivar enrichment（ADR-58ルーティング）

`type_of_instance_variable_read`がunbound ivar（`scope.ivar` nil）で`inferred_return_untyped`を
記録（untyped field = ADR-58の典型ギャップ）→ WD6が`@x.foo.bar`へ伝播。paramと違いmethod
entryでseed不可（read地点でunboundが判明）なのでread時記録だが、already-`dynamic_top`分岐
のみ・perf-neutral（A/B +0.03%）。

| cause | param(WD7) | ivar(WD8) |
| --- | --- | --- |
| none | 7,305 | **5,405** |
| inferred_return_untyped | 3,460 | **5,399** |
| unsupported_syntax | 10,102 | 10,063 |

**~1,900サイトcauseless→inferred。累積WD7+WD8: causeless 10,390(49%)→5,405（26%）、actionable
inferred 351→5,399（15倍）。** ratio不変。残るcauselessはdynamic_topノード種（yield/super/
block）+ cvar/gvarで概ね真に未モデル → actionabilityレバーはほぼ出し切り。unsupported 10,063
（48%）は未解決call根のチェーン = honestなengine-gap floor。

## 検証（2026-07-06）: redmineでprovenance-wiringが一般化する

ADR-82の全スライスはmastodon駆動だったので、redmine（同オンボード、6プラグイン、ARはinert
＝`db/schema.rb`未コミット）で正確per-siteメトリクスを取り一般化を確認。

| cause | mastodon (18,695→21,119 unprot) | redmine (18,695 unprot) |
| --- | --- | --- |
| none（causeless） | 5,405（26%） | 6,913（37%） |
| unsupported_syntax | 10,063（48%） | 6,019（32%） |
| **inferred_return_untyped** | **5,399（26%）** | **5,634（30%）** |
| explicit_untyped | 252 | 127 |
| analyzer_budget_cutoff | 0 | 2 |

**両アプリでactionableな`inferred_return_untyped`（param+ivar → ADR-67/58）が26-30%**を占め、
provenance-wiringがmastodon専用でないことを実証。redmineのinert ARでcauselessがやや多い
（37% vs 26%）が構造は一致。redmineでは`analyzer_budget_cutoff`（2）も捕捉（budget由来Dynamicも
provenanceが拾う）。ratio redmine 0.3386 / mastodon 0.3148。

**結論: provenance-wiringアークは完了・一般化検証済み**。残るactionabilityレバーはprovenance配線
ではなく**実inference**（ADR-67 param inference / ADR-58 ivar typing = untyped param/ivarを
*concrete*に型付けて実際に保護 → ratioを上げる大型feature）。provenance作業はその穴マップを
正確に描いた: 保護天井は両アプリでparam/ivar inference + 未解決callが支配。

## GOTCHAs（再実行者向け）

- `coverage --protection`のwith-sig数値は**env-build成否を必ず確認**すること（stderrの
  `RBS environment build failed`）。envが落ちるとsigが「害」に見える偽の低下が出る。
- 生成sigのRBS妥当性は`RBS::Parser.parse_signature`で個別検査（envは最初の1件でabortする
  ため、env-crashだけでは何ファイルが不正かは分からない）。
- `coverage`に`--no-cache`は無い → `rm -rf .rigor/cache`でバスト。
- 生成物（`sig/`, `.rigor/cache/`）はsurveyチェックアウト内でuntracked。計測後は破棄して
  clean baseline状態（sigなし）に戻す。
