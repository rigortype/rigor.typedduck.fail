---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "a225a4594f693013a555fa1c21d09d2095dacb7da68247febca3fd1a6bf1ac48"
sourceCommit: "7a69f1427bb5d1985ccc87080ee90023ffb42665"
sourceDate: "2026-07-18T04:45:17+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

<!--
セッション引き継ぎ（ADR-98）。たった1つの問いに答える: 次のセッションは何をすべきか？

- 作業をゴールまで運んだら、このファイルの内容を置き換えること;下に追記しないこと。
  2セッションを超えて生き延びるものはここに属さない: バックログ → GitHub issue
  （docs/agents/issue-tracker.md）、運用上の落とし穴 → ワークフローのスキル、決定 → ADR、
  計測 → docs/notes/、出荷済み → CHANGELOG.md。
- 主張を持ち越す前に検証すること。1週間で3つの項目がこれで死んだ: 「現存するバグ、まずこれを
  やれ」がそれ自身の再現で反証された（2026-05-01以降ガード済み）、「未解決」のARラムダ項目が
  2026-05-28以降修正済み（`fde760a2`）、そして旧ROADMAPバックログの約40%が既に出荷済み。
-->


一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestones
（`v0.3.0` / `v0.4.x` / `v1.0.0`）に存在する。このファイルがADR、CHANGELOG、またはissueと
矛盾する場合、間違っているのはこのファイルのほうだ。

## 現状

- **v0.3.0はほぼ組み上がった**。2026-07-17のトリアージの実装ウェーブは完了した: 本サイクルで
  10件のissueがクローズされ（#161 #164 #172 #174 #176 #177 #178 + 設定バッチ）、PR #175
  #179–#185はすべてマージされた。マイルストーンでオープンなのは: **#121**（進行中のフォールド
  カテゴリー、1スライスが着地）、**#162**（直接voidスライス、下記参照）、**#173**（rbs-inline、
  5スライス中スライス1がPR #186に）。`[Unreleased]`は**63個の項目**を抱えている —— それらを
  封印することは`make verify`が救済できないリリースステップだ;それに向けて予算を組むこと。
- **PR #186はオープンでレビュー待ちだ**: ADR-93 WD1のデフォルトフリップ（`require_magic_comment`
  → `false`、アノテーションの有無でゲート）。単体で検証済み: プラグインスペック18例、ブランチで
  完全な`make verify`がグリーン。すでにプラグインをロードしているプロジェクトにのみ影響する。
- ADR-100が着地した（`f6112ae3`）: `static.*`ファミリーの分割、最初のIDとしての
  `static.value-use.void`、`void_origins`インターフェース。#130のカットスコープの部分は#184で
  着地した;issueはマイルストーンを離れ、先送りのフォローオンだけを残している。
- `make verify`と`make docs-check`はmasterでクリーン;masterと`origin/master`は一致している。

## 次のセッション —— 3つのトラック、この順序で

**1. PR #187をレビュー/マージする —— #162のvoidスライスが着地した**。エージェントは引き継ぎが
最初に書かれた後に作業を終えた: 新しい`use-of-void-value`ブリーディングエッジ機能の背後の
`static.value-use.void`、`dynamic_origins`を鏡写しにした`void_origins`、同じコミット内の仕様の
行、`Advances #162`（推移的なケース + バジェットIDは追跡され続ける）。本セッションで検証済み:
ゲートはグリーン、teethは2+1、CHANGELOGのコンフリクトは解決され再検証済み（EXIT=0）、
mergeStateはCLEAN。レビュー時に知っておく価値のある正直な逸脱が1つ: issueの`x = puts(1)`という
例は誤りだった —— コアRBSは`puts`を`-> void`ではなく`-> nil`と宣言している（`references/rbs`に
対して検証済み）ので、フィクスチャは作者が宣言した`-> void`メソッドを使う。これがこのルールの
実際の規範的トリガーだ。

**2. #173のスライス2–5 —— 自動配線。これは慎重にやるものだ;拙速に流さないこと**。スライス1
（デフォルトフリップ）はPR #186だ。設計はすでに固まり、影響範囲も本セッションですでに計測済みで、
残るのは以下:

- **形は決まっている**: ローダーは汎用のままだ;自動配線は*設定レベル*のポリシーだ。
  `Plugin::Loader#resolve_entries`で`enabled: false`のエントリーをフィルタし（エントリー
  レベルのキー —— メンテナーは専用のトップレベルキーや`disable_plugins:`リストよりも
  `pluginEntry.enabled`の形を選んだ）、**`Configuration.load`のパスからのみ**（実プロジェクトの
  経路）`{gem: "rigor-rbs-inline", config: {require_magic_comment: false}}`を注入する ——
  `Configuration#initialize`ではない。さもないとスイート内のあらゆる素の`Configuration.new`が
  自動配線されてしまう。ゲート条件: 明示的にリストされていないこと（gem名`rigor-rbs-inline`
  *または*マニフェストID`rbs-inline` —— ローダーは重複IDで例外を投げる）、無効化されていない
  こと、そしてupstreamで解決可能なこと（`Gem::Specification.find_by_name("rbs-inline")`、ロードの
  副作用がないプローブ）。
- **計測された影響範囲**（ローダーレベルのプロトタイプを本セッションで作り、実行し、差し戻した）:
  `make verify`は6ファイルにまたがる約30例で失敗する —— `plugin/loader_spec`（18;自動配線が
  ローダーの外へ移れば手つかずのまま）、`analysis/plugin_fact_fingerprint_spec`（8）、
  `integration/plugins/activerecord_plugin_spec`、`integration/examples/routes_plugin_spec`、
  `integration/precision_snapshot_spec`、`ractor_readiness_spec`。それぞれの統合の失敗は**個別に
  裁定**しなければならない: プラグインのない世界の古びたアサーション（更新）か、本当の
  リグレッション（修正）か。一括更新しないこと;本サイクルの教訓は、この2つが一見すると同一に
  見えるということだ。
- スライス3: `schemas/rigor-config.schema.json`の`pluginEntry`に`enabled`（ブーリアン）を追加
  （ADR-99はスキーマを信頼できる情報源にする;このキーは公開語彙になる）。スライス4: WD3の
  スタンドアロンの残余 —— シンセサイザーが利用できない状態でアノテーション形のコメントが
  見えたときの`rbs.coverage.*`スタイルの`:info`ヒント（`rbs-inline`をコア依存にしないこと;
  ADR-0）。スライス5: ADR-93をAcceptedに切り替え、そのテキスト内でWD2/WD3を解決し + `overview.md`
  の分岐マーカーを更新する。
- 最後にコーパスゲート: mail / kramdown / haml / liquidはバイト同一、herbは−3の勝ちを保つ
  （WD4のコーパス、すべて`~/repo/ruby/rigor-survey/`の下）。

**3. リリース —— CHANGELOGを封印する**。`[Unreleased]`は63個の項目。`rigor-release-prep`スキルが
そのフローだ;**バージョンバンプと`rake release`はユーザーゲート付きのまま** —— エントリーを着地
させ、止まり、切り替えはユーザーに委ねること（AGENTS.md §「Release Cadence」）。

## 本サイクルで決定 —— 蒸し返さないこと

- **`enabled: false`のオプトアウトの形**（pluginEntryのキー）—— 2026-07-18にメンテナーが決定、
  専用のトップレベルキーや`disable_plugins:`リストよりも優先。
- **#152**（`&&`/`||`の極性を広げる）はエビデンスにより却下、需要ゲート付き、マイルストーンから
  外れている —— 計測された評価はissueにある。**#126**（length-rangeキャリア）: その設計パス自身が
  作るなと言っている;需要ゲート付き。**#120**（`--incremental`のデフォルト化）: このカットでは
  オプトイン;ギャップ分析はissueにあり、残る唯一の人間の判断はADR-45のキャッシュ対
  インクリメンタルの優先順位だ。**#178**は意図された挙動としてクローズ（`5d5a9359`が楽観を記録し、
  確実性がそれに依拠することを禁じる）。**#155**は`01491c63`以降すでに実装済みとしてクローズ。
- **#130の先送りされた残り**（RBSのみの祖先 + シングルトン）は、まずコーパスのFP受け入れの判断を
  要する —— ライブラリメソッドのユーザーオーバーライドで発火してしまうからだ。スライス5は#156に
  ブロックされたままだ。

## ユーザー待ち

- **PR #186をレビュー/マージする**（rbs-inlineのデフォルトフリップ;スライス2がこの上に構築
  される）。そしてdependabotのrubocop PR #86は意図的に保留のままだ（upstreamのautocorrectの
  バグ）。
- **ステージされた`ruby/rbs`のupstream修正を公開する** —— `references/rbs`のブランチ
  `widen-strscan-resolv-stdlib-sigs`;プッシュ + upstream PRはユーザーのアクションだ。#159として
  追跡されている。
- upstreamの`rbs-inline`のRDoc修正（[soutaro/rbs-inline#249](https://github.com/soutaro/rbs-inline/pull/249)）は
  ユーザーのフォークの下でオープンだ;upstreamが応答するまでリポジトリ側ですることはない。
- **rigor-rs:**`rigor_rs.ruby`は私たちのスキーマで予約されている（ADR-99）;ポートはそれに対して
  実装する。
</content>
</invoke>
