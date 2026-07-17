---
title: "ADR-67 WD2（in-body 構造パラメータ推論）設計スパイク — 測定付き見送り判断"
description: "Imported from rigortype/rigor docs/notes/20260706-adr67-wd2-in-body-inference-design-spike.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260706-adr67-wd2-in-body-inference-design-spike.md"
sourcePath: "docs/notes/20260706-adr67-wd2-in-body-inference-design-spike.md"
sourceSha: "e89c0ec9f5a30051f62d5b62d0beac01ec63a4e733233c8f97b37f1150e7cccc"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
sourceDate: "2026-07-06T20:10:24+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266706
---

Status: design spike / 測定に基づく判断メモ。2026-07-06、Rigor v0.2.7（`[Unreleased]`）。
非normative（設計コミットメントは[ADR-67](../../adr/67-parameter-type-inference/)が持つ）。本メモは
そのWD2を本実装に踏み込む前にde-riskするための測定と結論。

Grounding: 直接の親は[2026-07-06 Mastodon provenanceノート](../20260706-mastodon-coverage-provenance-and-siggen-rbs-validity/)
（provenance-wiringアークが「残るactionabilityレバー = 実inference（ADR-67 param / ADR-58 ivar）」
と結論した）。本スパイクはその「ADR-67の唯一残るレバー = WD2 in-body推論」に絞り、測定でpayoffを
検証する。

## 問い

provenanceアークはprotection天井の地図を描いた（mastodon app+lib、unprotected 21,119、ratio
0.3148）。actionableな`inferred_return_untyped`バケツは**per-site正確値で5,399（26%）**、うち
param由来が ~3,100・unbound ivar由来が ~1,900（WD7/WD8のenrichment差分）。call-site推論（WD3、
実装済み）はparamのcall-siteが解決するものを既に型付け、残った ~3,100 paramサイトは
**「call-siteが解決しない（動的ディスパッチ / frameworkコールバックで呼ばれる）untyped param」** —
これがWD2 in-body推論の対象母集団。

WD2はbody内でparamに対して呼ばれるメソッド集合から**structural lower bound**（responds-to
セット）を導く。ADR-67の2026-06-26 implementation findingは「型zooにstructural-interface
carrierが無い → 新carrierが必要、これは『cheapest』の枠を超える大改修」と記録した。

**スパイクの検証点**: そのcarrierを作る価値があるか。具体的には「untyped paramのbody内メソッド
集合は、実protectionを生むnominalを一意に固定できるか、それともstructural bound止まりか」。

## 測定（純AST probe、`scratchpad/wd2_probe.rb`）

req+opt paramごとにbody内で「そのparamをbare receiverに呼ぶメソッド名集合」を収集し分類:
- **no-calls**: paramがbody内で一度もreceiverにならない → WD2は原理的に無力
- **all-universal**: 集合が全てuniversal/duckメソッド（`to_s`/`==`/`nil?`/`present?`/`[]`/`each`/
  `map`/`id`…、Object+top-Dynamic-receiverメソッド由来の寛大なリスト）→ nominalを何も固定しない
- **has-distinctive**: universalでないメソッドを1つ以上含む → WD2が効きうる候補の上限

| corpus | params(req+opt) | no-calls | all-universal | has-distinctive |
| --- | ---: | ---: | ---: | ---: |
| mastodon app+lib | 2,318 | 1,344 (58.0%) | 435 (18.8%) | **539 (23.3%)** |
| redmine app+lib | — | — | — | ~29% |
| rigor lib（sanity） | 5,785 | 2,551 (44.1%) | 1,568 (27.1%) | **1,666 (28.8%)** |

**has-distinctiveの内訳（mastodon 539）**: distinctiveメソッド数1が317（59%）、2+ が222（41%）。
distinctive-1の大半はcore-duckでnominalを固定しない（`clamp`→Comparable、`merge!`→Hash/Relation、
`group_by`/`zero?`→Enumerable/Numeric）。2+（222 = 全paramの**~10%**）だけがdomain固有でnominal
を固定しうる（`account -> display_name, username, emojis`、`keypair -> revoked?, expired?`、
`log -> target_type, human_identifier, permalink`…）。

## 判断に効く3つの事実

1. **天井が小さい.** WD2が効きうる上限はhas-distinctiveの23-29%。実nominalを固定しうるのは2+
   distinctiveの**~10%（mastodon 222 param）**のみ。残り44-58% のno-callsはWD2の領域ですらない
   （paramがivar保存 / 戻り値 / 別メソッド引数に流れる = WD3 or ADR-58）。しかもprobeはWD3で
   既に型付くparamを除外していないので、真の増分上限はこれより更に小さい。

2. **AR-attributeトラップが最有望層を潰す.** 2+ distinctiveのdomain paramはRailsヘルパの
   `account`/`status`等で、そのdistinctiveメソッド（`username`/`display_name`/`following_count`）は
   **AR動的アクセサ（カラム/association）= 静的`discovered_methods`（defスキャン）に存在しない**。
   method-set→nominal解決をdiscovery index上に組んでも、まさにpinできそうなARモデルparamで
   マッチが0になりuntypedへ落ちる。mastodonは`schema.rb`をcommitするが、それを知るのは
   rigor-activerecordプラグインのschema知識で、汎用method-setリゾルバが引くdef-indexではない。
   redmineは`schema.rb`未commit（AR inert）で更に不利。→ 07-04 carrier-trapノートの系。

3. **structural boundはprotectionメトリクスに対して循環的.** carrierを作ってno-nominal層にcredit
   を与えても、boundはbody自身の呼び出しから導くので**同じbodyのsiteをtrivially protectedと
   マークするだけ**（`concrete_receiver?`は非Dynamicを全てprotectedと数える）。同一bodyのtypo
   （`x.fooo`）はbound集合に自分自身が入るのでbiteできない。実protection（mutationを殺す、
   ADR-63の本旨）を得るにはcarrierをcheck-walkのundefined-methodディスパッチに載せる必要があり、
   それはCURRENT_WORKが警告するFP-risky経路（param使用箇所に`call.undefined-method`誤発火）。

## 結論と推奨

**WD2を仕様どおり（structural-interface carrier）実装するのはpayoffがcostに見合わない。見送りを維持**。
- carrier経路: 高stakesな型zoo拡張（value-lattice / ADR-3 internal-type-api契約に波及）を、循環的で
  意味の薄いメトリクス膨張のために払うことになる。ADR-67自身の「メトリクスの意味を劣化させる」懸念の実証。
- 新carrier不要のnominal-resolution経路: FP-safe（0 or複数マッチ時untyped）だが対象は ~10% param、
  かつ最有望のARモデル層が事実2で潰れる。増分は僅少と予測。

これはprovenanceノート §4のレバー順位（1 provenance-wiring[済] → 2 env-build resilience →
3 sig-gen RBS validity → 4 ADR-67/58大型feature）とも整合する。WD2は #4の中でも最も割の悪い部分。

**次レバーの推奨（本スパイクの含意）**: protection天井を直接押すのは大型featureでしか動かず割が悪い。
より高ROIの近接レバーは（a）**env-build resilience**（不正sig 1ファイルがenv全体を落とす不均衡の
quarantine + 可視化 — sig-genを実用化し、07-04 H3のsilent failureを塞ぐ、bounded）、（b）`0.2.x`
評価ラインのconsolidation / 外部フィードバック収集（v1.0 freezeへの本来目的）。WD2/ADR-67大型化は
外部からM3がtop `add_a_type_here`として繰り返し来る具体需要が出るまでdefer（ADR-67 re-eval
triggerのまま）。

## 再評価トリガ（更新なし、ADR-67のまま）

- 外部プロジェクトでM3（untyped param）がtop `add_a_type_here`として反復surfaced、**かつ**
  AR-attributeトラップの影響が薄いコードベース（schema+plugin完備or非Railsのdomain-object中心）
  であること。本スパイクは「Rails appではAR動的アクセサが最有望層を潰す」を新たな反証条件として追加。
- ADR-46 incrementalがWD3 call-siteパスをper-file model内でaffordableにする（in-bodyより先に
  call-siteの天井を上げる方が高ROI）。

## 成果物 / 再現

測定は純Prismの使い捨てprobe（env不要、リポジトリ未コミット）。上の「測定」節のアルゴリズム
（req+opt param → body内bare-receiver呼び出し集合 → no-calls / all-universal / has-distinctive
分類、universalリストはObject+top-Dynamic-receiverメソッド）で再現可能。3 corpus
（mastodon/redmine/rigor-lib）で分類分布が一致。
