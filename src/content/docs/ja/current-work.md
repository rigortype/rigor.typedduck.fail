---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor の docs/CURRENT_WORK.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "4826ccb1713bb1047feded93a15369cfad2f76ba79f6f85fc6ff0c11a727f1c4"
sourceCommit: "db7b23d42e9b47560438b67dfe16d53e03f70575"
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

## サイクルの現在地

**v0.3.8は公開済みです**。`[Unreleased]`は空であり、`changelog.d/`がサイクル全体を保持しています（2026-09-09の約30件のPR、および以下の2026-09-10の2バッチ）。次のリリース作業は、ユーザーが`/rigor-release-prep`を呼び出したときにのみ行われます。

## 2026-09-10 — v0.3.9マイルストーンスイープ、15の並行レーン

1つのセッションで、ワークツリー内のSonnet/Opusレーンを用い、ローカルでのフルgateなし、リモートCIをgateとし、各マージ前の敵対的レビューを経て`gh issue list --milestone v0.3.9`を推進しました。着工・マージ完了（すべてマージ済み、最後の統合実行時点でmasterはgreen）:

- エンジンFP: #946（#917未宣言コンストラクタにおける`.new`のarity）、#945（#909 `class << self`のivarファセット）、#955（#633自身のメソッドvetoが継承元/`Object`以前/シングルトンのソースに到達）、#951（#645 unionミューテータの拡大）、#964（#643要素読み取りのミューテーション）、#965（#617ブロック戻り値の残差: 複合書き込み末尾、`String#<<`、findファミリーのフロア、capフロア）、#961（#722コンパクトヘッダーの先頭セグメント。`IncrementalSnapshot::SCHEMA` 20）。
- キャッシュ: #954（#629/#630プラグインの`IoBoundary`読み取り + `list_directory`行）、#958（#639クラス存在エッジ。#640は修正済みでgate追加）、#966（#960エディタモードの`--instead-of`の綴り + バッファダイジェスト）。
- CLI/プラグイン: #949（#925 `target_gems:` + プラグインギャップアドバイザリー、DIRECT依存のみ + `rails` umbrella）、#968（#936項目3、`Difference`ミューテータアーム。#936はクローズ）、#944（#918 rigor-ffiの`config_schema`）、#947（#920 `ALL_RULES`からの`rigor init`ルール一覧）、#950（#921 `:factory_index`事実 + プローブコマンドの`#prepare`実行）、#957（#609 sig-genの`::`アンカー付きスーパークラス、致命的エラー時のexit 70、`sig/`の自動検出）、#952（#530 lockfileのないgemの出所）、#962（#936項目1/4/5/7）、#967（ロード済みクラスからのdoctorカタログ — masterを一度redにした順序依存のシャードflake）。
- ドキュメント（masterへ直接マージ）: #919、#940（コード証拠を伴う17件のADRステータス再設定）、#941、#942、#943（ADR-49の部分的代替マーカー、10件のADR）、#948（#939ヘッダー対インデックスのステータスgate）、#956（#938残差）。
- コード変更なしでの判定: #533クローズ（8件中6件は修正済み。項目5は #953に分割）。

## 2026-09-10、第2バッチ — 5つの`ready-for-agent`レーン、すべて着工・マージ完了

- #975（#580）: ミューテーションで拡大された`Nominal`が後のstoreと再合流（re-join）する。すでに`Dynamic[top]`アームを保持しているパラメータに対してインバンドでgateされる（`Type::Nominal`には出所スロットが存在しないため、漸進的アームがその印となる）。`a = []; a.push(1); a.push("s")`は`Array[Dynamic[top] | Integer | String]`と読まれる。
- #972（#599）: ファクトリメソッドの鮮度 — 呼び出し先が安価に解決可能で、その戻り値位置（RETURN POSITION）が実体化（materialisation）であるようなチェーンレシーバーをgateが受け入れる（self-aliasスキャンではない。理由は文書化済み）。
- #971（#911）: `.rigor.yml`の`plugins_isolation:`（`none` | `process`）。ENVが優先。`ruby_box`は変数を名指しする設定エラー。
- #974（#534項目7のみ — 項目1〜4はすでにマージ済み。5と6はオープンのまま）: Railsプラグインが例外階層/名前空間を寛容に宣言し、`open_receivers:`内のすべてのクラスを対象とする。
- #973（#915）: `class << self; include M; end`をextendとして記録する。RBSで宣言された`extend`は`Environment#singleton_extended_modules`を通じて絞り込みに到達する。`IncrementalSnapshot::SCHEMA` 21。

## オープンスレッド

- #424はWD16ターゲット（gitlab規模での`Propagator.propagate`）でオープンのまま。プロジェクトごとの半分は測定されてクローズ済み: `docs/notes/20260910-effect-collection-profile.md` — プラグインのないredmineでwall time +11.3 %、2回目の走査が差分の約36 %、共有可能な降下が約12 %であるため、収集が証明するものを変更しない限り ≤ 5 % の上限は達成不可能（#409に対するNo-Go入力）。
- 今セッションで起票、`ready-for-human`: #959（シンボリックリンクされたプロジェクトルート配下でTrustPolicyがすべてのプラグイン読み取りを無言で拒否する）、#953（リテラルlambdaの呼び出し形式）、#963（#633残差: block-self形状、プラグイン提供メソッド）。
- v0.3.9で依然オープンかつhuman-gated: #928、#796、#794、#476、#378。#697は #660待ち。

## 参加手順

1. このセッションの作業でオープンまたは未コミットのものはありません。レーンのワークツリーは削除済みです。他のセッションが随時masterにマージしていたため、現在のHEADでファイルと行番号を再導出してください。
2. 機能したレーン契約: レーンごとにワークツリーを作成、対象スペック + rubocopのみ実行、`git push`したら終了（CIのポーリングはしない — `gh run watch`ループを回す15レーンにより、5000回/時のGitHub API上限を2度使い果たしました。PRごとに`statusCheckRollup`経由で1分に1回ポーリングすること）。レーンのブランチにコミットを追加するには、リモートのtipにリセットしてcherry-pickすること。rebaseしてからpushするとnon-fast-forwardとなり、force pushはブロックされています。
3. すべてのエンジンレーンがつまずいた3つの事項: 手書きの行が追加されるか推論がsig-genの出力内容を変更するたびに`sig/`の出所残差ピン（`spec/rigor/sig_gen/provenance_spec.rb`）が移動する — #965の`@x ||= new`の読み取りにより、未束縛ケースがrvalueを保持するようになるまで3つの`.default`リーダーが`sig.skipped.untyped-return`に移動した。新しい適合性フィクスチャにはgoldenが必要（`UPDATE_SNAPSHOTS=<fixture>`）。gem名でバンドルプラグインを有効にするスペックは、自身でクラスを登録しない限り順序依存となる（`Rigor::Plugin.unregister!` + no-op `require`）。
4. `gh issue list --label ready-for-agent`がバックログです。v0.4.0マイルストーンが1.0前の区切りとなります。
