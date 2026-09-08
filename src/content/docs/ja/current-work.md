---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "e50292b0fedffc74bb8349b46fc0efc603469f82f12f285677b432a031e04d43"
sourceCommit: "ffb456b0cc9e068a59d0ba03ba464b60ad83280a"
sourceDate: "2026-09-08T06:33:19+09:00"
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
- 主張を持ち越す前に、代理ではなく決定するものによって検証すること ── このファイル内の主張も含めて。
  3セッション連続で、このファイル自身のポインタが間違っていた。
-->


一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestonesに存在する。
このファイルがADR、CHANGELOG、またはissueと矛盾する場合、間違っているのはこのファイルのほうだ。

## サイクルの現在地

**v0.3.8は`master`上にあり未公開である**。リリースPR（`release/0.3.8`、`Bump up version to 0.3.8`）が2026-09-08にマージされた。`Rigor::VERSION`は`0.3.8`である;封印されたセクションは`CHANGELOG.md`にある; `changelog.d/`はそのREADMEのみを保持している。`v0.3.8`タグはなく、RubyGemsへのプッシュもなく、GitHub Releaseもない: リリースを準備した環境にはRubyGemsの認証情報がないため、公開はユーザーの手順である（ADR-50 § WD5;タグ付け、プッシュ、公開を行う）:

```sh
git switch master && git pull
nix --extra-experimental-features 'nix-command flakes' develop --command bundle exec rake release
```

## v0.3.8が修正したもの（2026-09-07トリアージバッチ）

マージ前にそれぞれ監査され、`make verify`がグリーン、CIがグリーンとなって着地済み: #788（#784、#793）、#800（#795）、#803（#798）、#802（#791）、#801（#785）、#804（#799）、#808（#805 ── #785レーンのレビューで発見され同日午前に修正）。レーンのレビューから起票され、現在もオープン: [#806](https://github.com/rigortype/rigor/issues/806)（`Plugin::Registry#type_node_resolvers`が`Environment`構築時に保護されていない ── 潜在的であり、到達可能なトリガーはない）。今回のカットから意図的に除外されたもの: #790（ハーネス側）、#792 / #794 / #789（設計またはレイテンシの判断）、#796（その適合側の半分は#788ラウンド11で着地済み;ファイルごとの解析側の半分はスナップショット永続化の設計）。

## 次のエンジニアリング作業の優先順位

1. **[#775](https://github.com/rigortype/rigor/issues/775)** ── `rigor check lib`のアロケーション数をv0.3.6の18.8Mに向けて回復させる。前回の引き継ぎから変更なし;引き続き性能の最優先項目。
2. `make check lib`が`lib/rigor/inference/expression_typer.rb:274`（`return_type_for`）で1件の`def.return-type-mismatch`警告を出力する。v0.3.7ラインで以前から存在していた（3つのレーンがそれぞれのベースコミットに対して独立して確認）;警告であるためゲートは終了コード0で通過するが、AGENTS.mdはセルフチェックがクリーンでなければならない（MUST）としている。根本原因を修正すること。
3. **[#807](https://github.com/rigortype/rigor/issues/807)** ── `spec/rigor/cache/store_spec.rb:628`は真因のあるCIフレークである: 16スレッドがそれぞれ新しいルートで`Store`を構築し`repair_writable_marker!`を競合するため、あるスレッドが破損した（torn）`schema_version.txt`を読み取って兄弟スレッドの`binread`の最中に`clear_cache_root!`を実行してしまうことがある。#804のシャード1で一度発生;ローカルで25回繰り返してクリーン。

## パイプラインの注意点（それぞれインシデントによって得られたもの）

- **拘束力を持つドキュメントの行を編集するすべてのレーンは、他のすべてのレーンと衝突する**。`docs/type-specification/diagnostic-policy.md`の`rbs.coverage.*`および`rbs_extended.*`の行は単一の非常に長い行である;ある日の午前中に6つのPRが`master`へのマージのたびにそれぞれ再衝突した。masterの行を取得して自前のフレーズを再適用することで解決し（トークンレベルの3方向マージスクリプトが機械的に実行した）、`git diff --word-diff origin/master HEAD -- docs`で自前のフレーズのみが異なることを検証し、マージされた文章を再読すること ── masterのある文（`a6af7f24`）は#803が着地した瞬間に偽となり、同じPR内で削除されなければならなかった。
- **`Environment.default`はプロセス全体の`@default ||=`シングルトンである**。共有ビルドをスタブした上で`.default`に対して要求するspecは、ビンパッカーワーカー内で実行順序に依存し（#784のシームspecが一度レッドになった）、最初に実行されると以降のすべての`.default`利用者を汚染する。メモ化されたビルドをスタブまたは縮退させるspecでは、常に新しい`for_project`環境を構築すること。
- **ワークツリーは`.git`を共有し、サブモジュールはワークツリー内では展開されない**。ワークツリーにチェックアウトを追加することは問題ないが、そこでの`git submodule deinit`はメインのクローンの登録を解除してしまう。
- `mkdir /tmp/rigor-verify.lock`ミューテックスを使って**並列レーン間でフルゲートを直列化する** ── 並列な`make verify`の実行はこのホストをOOMキルさせたことがある。PRがマージされたら、そのレーンの冗長な再検証をkillすること;次のレーンが必要とするミューテックスを4分間保持してしまうためである。
- **GitHubはカンマ区切りのリストで最初の`Fixes #N`のみをクローズする**。1行につき1つの`Fixes #N`とすること。
- **バッチの後に統合されたmasterを検証すること**。単一のPRのCIがその組み合わせを見ることはない。
