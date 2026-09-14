---
title: "現在の作業 — セッションハンドオフ"
description: "rigortype/rigor の docs/CURRENT_WORK.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "6ae8fc768b5c437bce9792af15d6c621363568a7d9382c7da37e82cba6b31998"
sourceCommit: "d01a937b5d3d66d5ec4e6ba82036919d1bc91d10"
sourceDate: "2026-09-14T19:31:01+09:00"
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

## v0.3.9は完全にリリース完了 —— 前回のハンドオフの「公開途中」セクションは完了

推測ではなく検証済み: `gem list -r rigortype`は`0.3.9`を返し、`git ls-remote --tags origin v0.3.9`は解決され、`gh release view v0.3.9`は`[0.3.9] - 2026-09-12`の本文とともに存在します。リリースに関して未完了のものは何もありません。`changelog.d/`は再び次のサイクルのフラグメントを収集しています。

## 2026-09-12の推論ギャップバッチが2026-09-14に着地（LANDED）

ユーザーの指示により全5件のPRがマージされました: #999、#1005、#1000、#1001、続いて#1006; `4d6ac321`でmaster CIがgreenとなり、#991、#993、#994、#995、#997がクローズされました。その発端となったプレイグラウンドのスニペット —— `# @rbs num: Float`のあとの`p Foo.new.f` —— は今や`call.wrong-arity`を報告します。

PRごとのCIはバッチの相互作用を見ることができませんでしたが、ローカルの5者間マージはそれを見ることができました。#1001の`Float#to_s` → `non-empty-string`が#1006のタプルフィクスチャを先鋭化させ、#995のエイリアス展開と#994の吸収によって`StatementEvaluator#eval_branch_or_nil` / `#eval_class_body`が生成等価となり、`sig/rigor/inference.rbs`の残差ピンが88 → 86へドロップしました。双方がマージ前の#1006で修正され、4者間ツリーはmasterとなったものと同一であることが検証されました。

PR [#990](https://github.com/rigortype/rigor/pull/990)（プレイグラウンドエディタ）は別セッションの管轄です。手を触れないこと。

## 2026-09-14に着地した第2波: #1009、#1004、#1003

- [#1012](https://github.com/rigortype/rigor/pull/1012)が#1009をクローズ。古いスロットは`plugin.source_rbs_synthesizer`であり、ソースのダイジェスト＋プラグインマニフェストのみでキー付けされていたため、rbs-inlineシンセサイザーを編集したチェックアウトが直前のビルドのRBSを提供し続けていました;プラグインプロデューサーのキーも同じギャップを抱えていました。双方が今や`Cache::EngineSource.key_config_entries`を運びます。この種別は`rigor check --cache-stats`で診断してください。**依然として未検証:** `RbsDescriptor`でキー付けされる`rbs.*`変換値プロデューサー（[#1014](https://github.com/rigortype/rigor/issues/1014)）—— これがクローズするまでは、「これが発火するか？」をコールドで判定してください。
- [#1013](https://github.com/rigortype/rigor/pull/1013)が#1004をクローズ: `to_s(8)` / `to_s(16)`および素の16進／8進数字クラス正規表現の行が、その値が不合格となるプレフィックス要求リファインメントではなく、`non-empty-string`を生成するようになりました。
- [#1015](https://github.com/rigortype/rigor/pull/1015)が#1003をクローズ。ギャップは三項演算子対`if`ではなく文位置対値位置にありました: `ExpressionTyper#type_of_if`は2つ目の型付け器であり削除されました;値位置の条件式は`scope.evaluate`を経由するようになりました。コーパスは21ターゲットで変化なし; `rigor check lib`のウォールタイムはノイズの範囲内で不変です。

## ADR-111はProposed状態でメンテナー待ち

[`docs/adr/111-inline-refinement-carrier.md`](../adr/111-inline-refinement-carrier/)、[`docs/notes/20260912-inline-refinement-carrier-probe.md`](../notes/20260912-inline-refinement-carrier-probe/)に基づく —— 3つのリーダー（`rbs-inline` gem、rbs 4.2.0の`RBS::InlineParser`、`check "lib", inline: true`のSteep 2.0.0）を通じて14の表記を測定。

不可視性ではなく有界性の基準に基づいて、Rigorが独自のコメント方言を持たないことを**再確認**することを推奨しています。2つの測定が表記を決定づけました: Steepは単独行の`%a{rigor:v1:…}`形式 —— `docs/manual/16-rbs-extended-annotations.md`が記載する形式 —— をユーザー可視のエラーとして報告し（`%a{pure}`も同様）、一方で同一行形式はクリーンで真に束縛されること;そして`# @rbs-ext`は名前として除外された（`@rbs\b`がハイフンの前でマッチする）のに対し、`# @extrbs`は3つのリーダーすべてでクリーンだったこと。したがって、同一行形式がADRが推奨する唯一の表記であり、[#998](https://github.com/rigortype/rigor/issues/998) —— Rigor自身のリーダーがそれを静かにドロップすること —— はマニュアルが何かを推奨するための前提条件であり、フォローアップではありません。再評価トリガー（i）は半分引かれています。メンテナーが決定します;何も実装されていません。

## 2026-09-14に着地した第3波: #998、#1016、#1017、#1019、#1021

- [#1018](https://github.com/rigortype/rigor/pull/1018)が#998をクローズ: 同一行の`%a{}`形式の双方（`# @rbs %a{…} () -> T`、`#: %a{…} () -> T`）がRigorで束縛されるようになり、正当な`#:`表記に対して#1005が出し始めていた誤った「パースできなかった」通知は解消されました。[#1023](https://github.com/rigortype/rigor/pull/1023)が#1019をクローズ: `# @rbs-ext …`および`# @rbs n: Integer[1..10]`がドロップされる代わりに報告されるようになりました。`docs/notes/20260912-inline-refinement-carrier-probe.md`のどの行も、今やRigorによって静かにドロップされることはありません。
- [#1022](https://github.com/rigortype/rigor/pull/1022)が#1021をクローズ: `Dynamic[top] | nil`と型付けされた引数がその`nil`アームによってオーバーロードを固定することがなくなったため、`Regexp#match?(maybe_untyped)`が`false`と型付けされなくなりました。コーパス: 8件の「常に偽」の偽陽性を除去（mail 4、redmine 3、tdiary-core 1）、追加はゼロ。
- [#1020](https://github.com/rigortype/rigor/pull/1020)が#1016をクローズ: 文位置と値位置のための単一のand/or実装で、#313ゲートを運びます。#1022が着地するまで**保留（held）**されていました —— 単独ではオーバーロード原因による3つ目の`mail`偽陽性を追加していましたが、#1022上にリベースしたことで何も動かなくなりました。
- [#1024](https://github.com/rigortype/rigor/pull/1024)が#1017をクローズ: 条件として使われる条件式が、その`&&` / `||`等価物と同様にナローイングします（深さ上限2）。コーパスは21ターゲットで変化なし。

## オープンなフォローアップと、次に着手する価値のあるもの

これらの波からオープンなもの: #996（ADR-111、メンテナーの裁定）、#1002、#1007、#1008、#1011、#1014。

- [#1014](https://github.com/rigortype/rigor/issues/1014) —— `rbs.*`キャッシュプロデューサーの再現先行チェック;クローズにより上記の「コールドで判定」の注意書きが引退します。
- [#1002](https://github.com/rigortype/rigor/issues/1002) —— `Rigor::Type::t`がすでにそれを命名している箇所でsig-genが22分岐のユニオンをレンダリングする;エージェント向けに準備完了。
- [#1011](https://github.com/rigortype/rigor/issues/1011)はまず裁定が必要（`sig-gen gap:`マーカーが間違っているのか、ゲートの文言か？）; #1007 / #1008はマークされた2つの`sig/`行の背後にあるエンジンギャップ。

[#992](https://github.com/rigortype/rigor/issues/992)は2026-09-14にPR [#1010](https://github.com/rigortype/rigor/pull/1010)として着地（LANDED）、デフォルト有効: `call.wrong-arity`が、誰も宣言しなかった`def`に対して位置アリティをチェックするようになり、不一致の形状を不透明（opaque）に結合するクラスごとのパラメータエンベロープテーブルを1つ読み取ります。34の調査ターゲット全体で新規発火はゼロ —— 約8,400の呼び出しサイトがエンベロープに到達し、わずか4件の外れ値は辞退（decline）となりました（2件はロード順序に依存する本物のバグでした）。間違ったアリティを持つリテラルの`Base.new.x`は、サブクラスオーバーライドの辞退が`Nominal[Base]`に適用されるため沈黙を保ちます;これは意図的な偽陰性です。キーワード引数は対象外です。それが名指す残余リスク: `--incremental`実行は、フル実行まで新しく追加されたサブクラスオーバーライドを見落とします。

## ワークツリーの所在

`rigor-wt/{arity-declared-source-methods,sig-gen-untyped-declared-return,numeric-to-s-refinements,inline-annotation-parse-diagnostics,tuple-union-absorption,arity-undeclared-source-methods,cross-build-synthesis-cache,hex-octal-int-string-soundness,ternary-predicate-narrowing,inline-sameline-annotation-forms,and-or-value-position-narrowing,overload-optional-untyped-args,nested-conditional-guard-narrowing,inline-silent-drop-remainder,adr-inline-refinement-dialect}`、
PRごとに1つ（14件すべてマージ済み;削除して安全）＋ADR用のもの。`adr-inline-refinement-dialect`は、別のSteep測定を望む場合のためにインストール済みの`tool/steep/`バンドル（無視対象）も保持しています —— CoWコピーされたバンドルはネイティブ拡張が異なるRubyストアパスに対してビルドされているため、実行前に`bundle pristine`が必要です。
