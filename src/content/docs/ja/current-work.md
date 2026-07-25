---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "e05ef167286356b20b187e2186cf9dc49a99c85b88142b1ebc77e1bf0e0b3ed2"
sourceCommit: "e3eb424c3c88035e453246710c8df3dc5cc8e7e1"
sourceDate: "2026-07-25T21:14:59+09:00"
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
- 主張を持ち越す前に検証すること。今回のカットそのものの教訓: このセッションで拾い上げた3つのissueの
  うち2つは、ファイルシステムとの接触に耐えられない前提を持っていた。issueが記述する形がまだ存在するか
  を、それに対して実装する前に確認すること —— `ready-for-agent`は記述の準備状態にラベルを付けるので
  あって、前提の準備状態ではない。
-->


一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestones
（`v0.3.0` / `v0.4.x` / `v1.0.0`）に存在する。このファイルがADR、CHANGELOG、またはissueと
矛盾する場合、間違っているのはこのファイルのほうだ。

## 現状

- **v0.3.0はリリース済み**（2026-07-19）;`CHANGELOG.md`の`[Unreleased]`にはそれ以降、
  Changed / Fixed / Performanceの項目が蓄積している。バージョンバンプは不要 —— リリースは明示的な
  要求を待つ。
- **2026-07-25のセッションは5つのPRを着地させ**、すべてマージ済み: #210（最後の単独ルールウォークを
  畳み込む）、#212（ADR-92 WD6ゲート）、#213（internal-specの一掃、31件の発見）、#214（シグネチャ
  生成のネストした更新パス）、#215（プロデューサー宣言のキャッシュ世代上限）。issue #151、#153、
  #163、#211はクローズ。
- `make verify`（8,199例）/ `make docs-check`はmasterでクリーン。

## 次のセッション

リリースをブロックするものはない。残っている2つのv0.4.x項目は**どちらも`ready-for-human`**であり
—— 実装ではなく判断を必要とする:

- **[#204](https://github.com/rigortype/rigor/issues/204)**（area:engine） —— ADR-46のクロスファイル
  の呼び出し元→呼び出し先パラメータエッジを配線し、`parameter_inference:`が`--incremental`と
  組み合わせられるようにする（WD6cの相互排他を解消する）。エッジ記録の設計判断が必要。
- **[#205](https://github.com/rigortype/rigor/issues/205)**（area:engine） —— `parameter_inference:`を
  デフォルトでオンにフリップするかを判断する（ADR-50ゲート;蓄積された保護エビデンスと、WD6bガードに
  対するミューテーションオラクルの正直さチェックが必要）。エビデンスが存在するより前ではない。

エージェント対応可能な作業、労力順:

- **[#207](https://github.com/rigortype/rigor/issues/207)**（area:perf） —— スコープが変わった:
  走査共有のレバーは尽きた（−0.49%がその全てだった）ので、残るのは**コレクターごとの
  アロケーション帰属**であり、v0.3.0の+45.7%のドリフトが実際にどこにあるのかを突き止めることだ。それは
  重複したウォークではなく、#101のルール本体と#102のHash/Kernel型付けが実際にノードごとの作業を
  していることによる。リファクタではなく調査だ。
- **[#216](https://github.com/rigortype/rigor/issues/216)**（area:perf） —— `evict!`が空のシャード
  ディレクトリを永遠に残す（ある実際のキャッシュでは16の有効エントリーに対して57ディレクトリ）。
  1行の修正、inodeのみの影響。
- **#121** —— 進行中のFP安全なビルトイン/標準ライブラリのフォールド（需要ゲート付き）。
- エディタクラスタ（**#144** / **#142** / **#146** / **#147**）は、v0.4.xマイルストーンで
  最大の未着手の`ready-for-agent`ブロックだ。

## このセッションが学んだこと、コミットにないもの

- **issueの前提はエビデンスではない**。#207は5つのルールが単独のウォークを走らせると述べていたが、
  4つは着地した日から`RuleWalk`にホストされていた。#163のADR-92クラスは14の文書のうち1つで再発した
  だけで、*別の*クラスが発見の大半を占めていた。`git log --diff-filter=A`と`rg`の10分がどちらにも
  答えた。まず確認し、それから実装すること。
- **機械的なリネームは文章を反転させうる**。ADR-80の`type_specifier` → `narrowing_facts`の一掃は、
  *削除された*サーフェスを名指ししていた括弧書きを書き換えてしまい、その結果`plugin.md`は1リリースの
  あいだ、生きていてドリフトピン留めされた3つのAPIが削除されたとプラグイン作者に伝え続けた。検索置換
  は、名前が*使われている*のと*削除されたものとして引用されている*のを区別できない —— リネーム後は
  文章中で旧名をgrepし、各ヒットを読むこと。

## その他のオープン項目、低優先度

- `static.value-use.top`、`static.incomplete-inference.*`（ADR-100 / ADR-41 / #158）は予約されたまま。
- 次のリリース（`0.3.1`）は、CHANGELOGのアーカイブルールを初めてトリガーする —— `0.2.x`サイクルを
  `docs/CHANGELOG-0.2.x.md`に移す（`rigor-release-prep`スキルに手順がある）。

## ユーザー待ち / 外部待ち

- dependabotのrubocop **PR #86**は意図的に保留のままだ（upstreamのautocorrectのバグ）。
- **ステージされた`ruby/rbs`のupstream修正を公開する** —— `references/rbs`のブランチ
  `widen-strscan-resolv-stdlib-sigs`;プッシュ + upstream PRはユーザーのアクションだ。#159として
  追跡されている。
- upstreamの`rbs-inline`のRDoc修正（[soutaro/rbs-inline#249](https://github.com/soutaro/rbs-inline/pull/249)）は
  ユーザーのフォークの下でオープンだ。
- **rigor-rs:**`rigor_rs.ruby`は私たちのスキーマで予約されている（ADR-99）;ハーネスは再ピンされ、
  バッテリーはクリーン。
