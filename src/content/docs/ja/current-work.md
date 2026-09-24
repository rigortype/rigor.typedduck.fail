---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor の docs/CURRENT_WORK.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "fa67a2ebf2c5cad29f39dd519e5201c7202f9c14526a2d14504d58b4f8aa2530"
sourceCommit: "74970d1ece5a858d82c9b2c8f1a5deb57831f984"
sourceDate: "2026-09-23T13:54:05+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

<!--
セッションハンドオフ（ADR-98）。1つの問いにのみ答える: 次のセッションは何をすべきか？

- 作業を完了まで持っていった際は、このファイルの内容を置き換えること。下に追記してはならない。
  2セッション以上存続するようなものはここには属さない: バックログ → GitHub issue
  （docs/agents/issue-tracker.md）、運用の落とし穴 → ワークフローのスキル、決定事項 → ADR、
  測定結果 → docs/notes/、出荷済み → CHANGELOG.md。
- ハードキャップ: 120行（spec/docs/agent_index_spec.rbで強制）。追記せず圧縮すること。
- 引き継ぐ前に、プロキシではなく決定を下す実体によって主張を検証すること —
  このファイル内の主張も含め。3セッション連続で、自身のポインタが間違っていたことがある。
-->


一時的な文書であり、全体が置き換えられます。バックログはGitHub Issuesで、リリース計画はMilestonesで管理されます。
このファイルがADR、CHANGELOG、またはissueと食い違う場合、間違っているのはこのファイル側です。

## 2026-09-22/23の`-> untyped`監査セッションで着地した内容

すべてマージ済み、CIグリーン、敵対的レビュー（Fable/Grok）承認（Approved）:

- [#1169](https://github.com/rigortype/rigor/pull/1169) ── 付随的な戻り値API → `void`。
- [#1170](https://github.com/rigortype/rigor/pull/1170) ── `untyped`/`void`/`top`理論ノート（`docs/notes/20260922-untyped-void-top-return-contracts.md`）+ 77箇所の初期分類。
- [#1171](https://github.com/rigortype/rigor/pull/1171) ── `dump_type`/`assert_type`ジェネリクスのパススルー。
- [#1174](https://github.com/rigortype/rigor/pull/1174) → `a2387d66` ── バッチ1: 22個の`-> untyped`戻り値を精密に命名; `sig/rigor/sig_gen/skip_reason_catalog.rbs`の隔離を解除する`Rigor::SigGen`シェル宣言も追加。
- [#1176](https://github.com/rigortype/rigor/pull/1176) ── `instance_definition`の偽陽性。
- [#1178](https://github.com/rigortype/rigor/pull/1178) → `0765b45b` ── #1173 RBS既知モジュールの祖先フォールバック; `includes_of`を実行時MRO順に修正（文をまたぐincludeは後勝ち）、SCHEMA 26→27、`ExternalAncestorResolution`内の`declared_before_object?` + 再配置ガード。
- [#1179](https://github.com/rigortype/rigor/pull/1179) → `e890b0dc` ── #1175: 複合ivar書き込み（`||=`/`&&=`/`op=`）がクラスivarアキュムレータをシードするよう修正; ADR-58 WD5を実装; CIセルフチェックが`--fail-on=warning`を実行（`unit_scan.rb:560`警告は解消; master上で`make check`はグリーン）。
- [#1180](https://github.com/rigortype/rigor/pull/1180) → `b0dd3cc3` ── バッチ2: Manifest/Runner/Loader/Narrowingなどを厳格化; `produces`は`Array[Symbol]`（`to_sym`後）、`source_rbs_synthesizer`は意図的に`untyped`を維持（複数形状WD6/WD12の結果）。
- [#1184](https://github.com/rigortype/rigor/pull/1184) → `41b652e3` ── #1181スライス1: `Baseline::{Bucket,DriftRow}`宣言（初の`Struct.new`シグネチャ;メンバー行は#1183とマーク）。
- [#1185](https://github.com/rigortype/rigor/pull/1185) → `25300e01` ── #1181スライス2: `Plugin::AdditionalInitializer` + `Manifest`/`Registry#additional_initializers`。
- [#1186](https://github.com/rigortype/rigor/pull/1186) → `1b867b76` ── #1181スライス3: `Plugin::ProtocolContract`（+#1150とマークされた`ParamType` Dataメンバー）により`Manifest`/`Base#protocol_contracts`および新しい`Registry#protocol_contracts`/`contracts_for_path`のブロックを解除。
- [#1187](https://github.com/rigortype/rigor/pull/1187) → `4d06efee` ── #1181スライス4: `Analysis::ProjectScan`（Data.define）により`Runner#prepare_project_scan` + `prebuilt:`キーワード引数のブロックを解除; 3つのメンバーは`untyped`のまま（未署名のSyntheticMethodIndex / ProjectPatchedMethods / TemplateUnits）。
- [#1188](https://github.com/rigortype/rigor/pull/1188) → `99ea44e5` ── #1181スライス5: `Effects::*`束縛側（`Label`/`MethodKey`/`TaintCause`/`Origin`/`LabelSet`/`Envelope`/`ConfigEnvelopes`/`EnvelopeIndex`）、`Runner#effect_envelopes` + `RbsExtended.read_effect_envelope → Envelope?`。
- [#1189](https://github.com/rigortype/rigor/pull/1189) → `9b2d943e` ── #1181スライス6: `Effects::*`収集側（`Summary`、`EffectTable`+`Entry`、`FileCollection`+`Edge`、`PluginFacts`+`Row`/`Edge`）により4つの`Runner#effect_*`リーダーすべてのブロックを解除;レビューで`forced_file_effects`を削除（プライベートAPIは`sig/`で宣言しない）し、`#1154`マーカーをinitializeパラメータのリーダーのみにスコープ。
- [#1190](https://github.com/rigortype/rigor/pull/1190) → `c56c2ccf` ── #1181スライス7: `Effects::Registry`、`Plugin::{EffectAttribution,EffectEdge,EffectAncestry,EffectEntryPoints}`、`Registry::Contribution`; `Manifest`/`Base`/`Registry`の`effect_*`リーダー + `PluginFacts#extend_registry`/`contributions:`/`entry_points`を厳格化。Grok+Opusレビュー: `effect_owner`はローカル経由で絞り込み（抑制は不要）; `effects?`/祖先は#1200として起票。

以前の`queue-release`マージ（`#1158`〜`#1162`、`79fa99cf`/`9fd4b6d4`/`19c2af59`）はすべて着地済み;ハンドオフ時点でオープンなPRはありません。

## メンテナー待ち

新しいものはありません。長らく保留されている`ready-for-human`バックログは変更ありません（`gh issue list --label ready-for-human`）。

## 次に着手する価値があるもの

- **#1181** ── クラスBシグネチャカバレッジバックログ（着地済み: Baseline #1184、AdditionalInitializer #1185、ProtocolContract #1186、ProjectScan #1187、Effects束縛側 #1188、Effects収集側 #1189、語彙/Contribution #1190 ── `Effects::*`およびプラグインエフェクト行クラスは完了）。残り: `Plugin::Macro::*`（Manifest `block_as_methods` / `heredoc_templates` / `nested_class_templates` / `trait_registries`）、`Inference::HktRegistry::*`（`#hkt_registrations` / `#hkt_definitions`）、`Environment::Reflection` + 3つの`*_reporter`ダックタイプ、`RuleWalk::CollectorDriver`、`Cache::*`エントリー/ディスクリプタ型、および`Rigor::FlowContribution`（`RbsExtended.read_flow_contribution`）。プロセス: `docs/agents/type-authoring.md`に従いまず`rigor sig-gen --print`の由来を確認; `#1154`マーカーは`initialize`パラメータから代入されたリーダーのみをカバー ── `absorb`/`compute`で構築されたリーダーはマークなしで固定; `Data`/`Struct`メンバーには`#1150`;レビュアーはGrok 4.6 + Opus（`run-role.sh reviewer`、`PRINT=1` + プロンプト）。
- **#1177** ── メソッド境界を越えて`OptimisticOrigin`が失われる問題（要トリアージ;ディスク上に`rigor-wt/optimistic-origin-nil-predicate`ディレクトリが存在するが、登録されたworktreeではない ── 再利用前に確認すること）。
- **sig-genスキップバッチ** ── #1148〜#1157（要素型 / Dataメンバー / エンドレスdefのギャップ）; `type-authoring.md`に基づく正直な修正はsig-genギャップのissueであり、すでにいくつか起票済み。

## worktreeの所在

本セッションのすべての`rigor-wt/*` worktreeはマージ後に剪定されました。古い`/Users/megurine/repo/ruby/worktrees/rigor/pi-worktree-*`セットは`queue-release`レーンに属します;そのPRは着地したため、アイドル状態であれば剪定可能です（`git worktree remove`は`references/`サブモジュールのチェックアウトで拒否されるため ── `rm -rf` + `git worktree prune`）。
