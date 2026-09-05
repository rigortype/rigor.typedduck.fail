---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "c2ee4dbca5b268f52405528549f749030dfec1c8f80c2fa042d0f5b31ef6174b"
sourceCommit: "2a65ec8e52462c931fbfec94df68a18139259a43"
sourceDate: "2026-09-05T14:08:29+09:00"
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
- ハードキャップ: 120行。spec/docs/agent_index_spec.rbが強制する。追記せず圧縮すること。
- 主張を持ち越す前に、代理ではなく決定するものによって検証すること ── **このファイル内の**主張も含めて。
  3セッション連続で、このファイル自身のポインタが間違っていた。
-->


一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestonesに存在する。
このファイルがADR、CHANGELOG、またはissueと矛盾する場合、間違っているのはこのファイルのほうだ。

## サイクルの現在地

**v0.3.7は`master`上にあり未公開である**。 [#774](https://github.com/rigortype/rigor/pull/774)が2026-09-05にマージされた（`e131c4a3`）。`Rigor::VERSION`は`0.3.7`である。`v0.3.7`タグはなく、RubyGemsへのプッシュもなく、GitHub Releaseもない。`bundle exec rake release`には依然として明示的な要求が必要である（ADR-50 § WD5;タグ付け、プッシュ、公開を行う）。

公開を求められた次のセッションは: `git switch master && git pull`を行い、マージコミットのクリーンなツリーから`nix … develop --command bundle exec rake release`を実行すること。

## 次のエンジニアリング作業の優先順位

1. **[#775](https://github.com/rigortype/rigor/issues/775)** ── `rigor check lib`のアロケーション数をv0.3.6の18.8Mに向けて回復させる。リリースを着地させるためにカット時に許容された: Linux CIでは、約9%の`lib`行数増加に対して36,171,454アロケーション（+91.9%）および417,716 KB RSS（+32.4%）が計測された。同じ実行でのMastodon OSSスイープはその閾値内に留まった。v0.3.6..v0.3.7の*どの*変更が余分な17Mのコストを支払ったのかを計測することなく再キャリブレーションを行わないこと。
2. その後に再順位付けする。2026-09-05キューのトップ3はクローズされた;残っているものは第2階層である。

## 他の場所で進行中の作業 ── 開始前に確認すること

**[#768](https://github.com/rigortype/rigor/pull/768)（#718）と[#769](https://github.com/rigortype/rigor/pull/769)（#713）がコミットを伴うDRAFTとしてオープンされている**（`~/repo/ruby/rigor-wt/`内）。それらは他の誰かのレーンである;マージしてはならない。`spec/integration/precision_snapshot_spec.rb`、`spec/integration/snapshots/`のゴールデン、または`lib/rigor/environment/rbs_loader.rb`に手を触れる前に調整すること。

## パイプラインの注意点（それぞれインシデントによって得られたもの）

- **ワークツリーは`.git`を共有し、サブモジュールはワークツリー内では展開されない**。新鮮なワークツリーでは`references/ruby`が空であるため、それを読むゲートは沈黙のうちに**スキップ**する ── そのようなゲートが単にグリーンであったことだけでなく、**実行された**ことを検証すること。あるワーカーの`git submodule deinit`は、メインのクローンのサブモジュールの登録を解除してしまった。ワークツリーにチェックアウトを追加することは問題ないが、登録を削除することは決して許されない。
- `mkdir /tmp/rigor-verify.lock`ミューテックスを使って**並列レーン間でフルゲートを直列化する** ── 並列な`make verify`の実行はこのホストをOOMキルさせたことがある。
- **GitHubはカンマ区切りのリストで最初の`Fixes #N`のみをクローズする**。各`Fixes #N`をそれぞれの行に置くこと。順位付けする前にissueの再現を実行すること; `OPEN`はLIVEを意味しない。
- **バッチの後に統合されたmasterを検証すること**。単一のPRのCIがその組み合わせを見ることはない。
- **`CHANGELOG.md`の`merge=union`は沈黙する**。リリースカット中に`master`に着地した`[Unreleased]`エントリーは、間違った見出しの下に折りたたまれる。`changelog.d/`内のフラグメントは衝突し得ない;スキップしてはならない。
