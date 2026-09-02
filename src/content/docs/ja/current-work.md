---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "274b4fe9528b77d24680f2fd308aed32618d64b6c8cbbc671282b9b3696a1c79"
sourceCommit: "8e1432f5ada5240b33f140cb2024e6025450b2f9"
sourceDate: "2026-09-02T14:39:41+09:00"
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
- 主張を持ち越す前に、代理ではなく決定するものによって検証すること —— **このファイル内の**主張も
  含めて。前回セッション自身の「次の未監査セクション」ポインタは間違っていた。
-->


一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestonesに
存在する。このファイルがADR、CHANGELOG、またはissueと矛盾する場合、間違っているのは
このファイルのほうだ。

## サイクルの現在地

**2026-09-01/02に23本のPRが着地した**。逐次の着地パイプライン（ワークツリーのフリート → コーパスの腕 → 独立した批判的レビュー → ドラフトPRのリモートCI → 連鎖したマージ）を通じてだ。バッチ1（#571 #576 #578 #579 #581 #582 #584 #585）: redmineは50.2→53.4%（#569のARの解放）。バッチ2〜3（#591 #592 #593 #596 #598 #603 #604 #607＋修正の追い送り#602 #608）: 正しさが主で、コーパスは計測上フラット。バッチ4（2026-09-02、回収されたエンジンのバグのバッチ）: #612（不在の辺のキャッシュ依存関係、#577）、#616（宣言された/型なしのArrayのキャリアがブロックのjoinを生き延びる、#586——masterの誤った精密な閉じ4件を修正）、#619（定数に代入された`Struct.new … do`の本体をクラス本体として入る、#590——hamlは偽陽性−2、正直な`String?`の報告+1）、#620（キャプチャされた内容の変異を通じたブロックの戻りのスレッディング＋再束縛されたキャプチャの収束した束縛での要素ごとの畳み込み、#587——CPUの差分はtextbringer/redmineで計測上ゼロ）。すべてのエンジンのPRのレビューが、コーパスの腕には**見えなかった**誤った型の偽陽性を少なくとも1件見つけた——両方の計器が必須のままである。

**引き継ぎ時に飛行中:** #624（#583のde-rootedなモデルのキー＋開き直しのマージ。差分レビューはAPPROVE、腕はルート付き`::Model`の呼び出しサイトでinfoのみの認識+11）はその着地の連鎖の中にある;#588のブランチ（`rails-surface-follow-ups`、ワークツリー`rigor-wt-f588`）は2巡目のブロッカーを修正し（railtiesのリーダーのゲートが`Reflection.discovered_method?`からADR-46の負の辺を記録するようになった）、差分の再チェックを待っている;ワークツリーで実装中の次のバッチ: #613（`rigor-wt-x613`）・#614（`rigor-wt-c614`）・#615（`rigor-wt-y615`）・#618（`rigor-wt-s618`）——それぞれ同じ連鎖を通して着地させ、重いジョブ（コーパスの腕）は一度に1つだけにすること。

## バックログ、順位付け

1. **[#574](https://github.com/rigortype/rigor/issues/574)**（ready-for-HUMAN）——ウィットネスのゲートの空虚さ。`Parameters#[]`（redmine 581＋mastodon 496）の唯一のブロッカー。計測は**完了**: 締め上げは反証された（偽陽性7 : 真陽性27）、#607後はnil許容の`Parameters#[]`単独で+2;選択肢はissueにある。エージェントが裁定できるものではない。
2. **外部ユーザーからの報告、未トリアージ:** [#610](https://github.com/rigortype/rigor/issues/610)（rigor-activerecordのジェネリックな`Relation[Elem]`が、gem_rbs_collectionの非ジェネリックな`Relation`と衝突する → collectionを使うアプリではすべてのARのリレーションが`Dynamic[top]`へ劣化する;パッチではなく調整の設計が要る）、[#609](https://github.com/rigortype/rigor/issues/609)（`sig-gen --write`が、次の実行ではロードできないsig/を出力する。SystemStackErrorなのに終了コードは0）、[#611](https://github.com/rigortype/rigor/issues/611)（バンドルから発見されるsig/がgit由来のgemを飛ばす）。
3. 再現手順のある、エージェントが対応可能なエンジン／プラグインのバグ。今サイクルのレビューから起票: [#617](https://github.com/rigortype/rigor/issues/617)（ブロックの戻りの残余: find/detectの初回反復のnil、上限8超の変異、複合代入の末尾、`String#<<`）、[#621](https://github.com/rigortype/rigor/issues/621)（ルート付きキー＋兄弟6プラグイン自身のインデックスでのリトライ）、[#622](https://github.com/rigortype/rigor/issues/622)（未解決の定数レシーバーが不在の辺を記録しない）、[#623](https://github.com/rigortype/rigor/issues/623)（`Blog::Post`が`blog_posts`へテーブル名化される）、加えて上記の飛行中の4件。
4. 構造体のフロンティア、計測によって確定（再導出しないこと）: [#597](https://github.com/rigortype/rigor/issues/597)（反復ごとのセッターのモデル化＝mailのレバー）、[#599](https://github.com/rigortype/rigor/issues/599)、[#601](https://github.com/rigortype/rigor/issues/601)（エイリアシングのアンブレラ——追加の隅はそこへ）。
5. 設計／方針: [#594](https://github.com/rigortype/rigor/issues/594)、[#580](https://github.com/rigortype/rigor/issues/580)、#541 / #542 / #531 / #527 / #530。
6. レバーでないことを検証済み: mastodonの`Rails.*`の残余＝そのサーベイの設定がrigor-railtiesを省いている（修正は次のフルスイープで——保存された基準の腕を無効化するため）;`User.current`は正直。

## 着地パイプライン（今サイクルでコーパスが取り逃がした偽陽性を10件以上捕まえた）

- 実装はワークツリーで並列に（`.bundle/config`のコピー＋`vendor`のシンボリックリンク;`git stash`は**決して**使わない——スタックが共有だからだ;`git checkout <sha> -- <file>`によるベースラインの入れ替えの前には必ずコミットすること）。ワーカーへの説明書＝契約のファイル（Flake、フルゲートなし、スペックの対応付け、フラグメントの文法）。
- マシン上で重いジョブは一度に**1つ**（4並列の`make verify`のフリートが200GB超でホストをOOMキルした）。ワーカーは単一のスペックファイルと`--workers=0`のフィクスチャだけ;コーパスの腕はローカル（CIにはない）かつ逐次。
- ドラフトPRのリモートCI＝リベース後の検証であり、PRは**すべてのゲートがグリーンになるまでDraftのまま**。成り立つ連鎖はこうだ（2度のmasterのレッドは、ここから外れたことによる）: リベース → `push --force-with-lease` → headのチェックを終了コードで監視する`set -e`のスクリプト**1つ**（8＝保留中;「チェックが報告されていない」は許容する）、0のときだけ`gh pr ready`＋マージ、それから**master**のマージコミットの実行が結論に至るまで監視する。逐次に: 次のPRの連鎖は、前のmasterの実行が結論に至ってから始める。PR番号は、フラグメントへ書き込む前に検証すること。
- 同じ日のPRが1つのADRへそれぞれWDの節を**追記**する（あるいは1つのスペックファイルへ`describe`を追記する）と、リベースで衝突する——両方を残し、番号を振り直し（WD2.9 → WD2.10）、先のものが着地してから再リベースすること。
- すべてのエンジンのPRは、**検証された**指摘を伴う敵対的レビューを受ける;REQUEST-CHANGESは実装したワーカーへ往復する;レビュアー自身の計測が間違っていることもある——双方向に中継すること。差分の再チェックは、SendMessageで**同じ**レビュアー（コンテキストが保たれている）へ渡す。

## いまも縛る落とし穴

- `rigor type-of`は発見でシードされたjoinを見られず、`rigor type-scan`はDynamic→精密の変化を見られない——問いに応じて計器を選ぶこと。精度の比は`dynamic_specific`を過小評価する;偽陽性の集計と対にすること。`model-call`の行はinfoの認識のトレースである。
- 複合シェルのA/Bの腕は、同じBashの呼び出しの中の先行する行から`cd`を引き継ぐ;腕ごとに1回の呼び出しにし、cwdを明示すること。CPUのA/Bには対象の`--config`が要る。さもなければブートを計測することになる。
- フィクスチャの自動フォーマッタは「無用な」ifガードと再代入を剥がす——そのようなフィクスチャはスクリプト経由か、スペックのヒアドキュメントとして書くこと。
- GitHubのマージ可能性はプッシュに遅れる;バックオフ付きでリトライすること。ゲートの終了ステータスはそれ自身の呼び出しで読むこと。
