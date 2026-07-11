---
title: "L1忠実度レビュー —— 診断 / エンジンの振る舞い（エリアB）"
description: "rigortype/rigor docs/notes/20260711-docs-review-fidelity-diagnostics.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-review-fidelity-diagnostics.md"
sourcePath: "docs/notes/20260711-docs-review-fidelity-diagnostics.md"
sourceSha: "fb128ba6628c84b138949ef37d1d92ca82f8d8e2913641dd89f077a0d28a1e9d"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

日付: 2026-07-11
レンズ: L1意味的忠実度、エリアB（診断＋エンジンの振る舞い）
章: `docs/manual/04-diagnostics.md`、`docs/handbook/08-understanding-errors.md`、`docs/handbook/03-narrowing.md`
参照した典拠: `lib/rigor/analysis/rule_catalog.rb`、`lib/rigor/analysis/check_rules.rb`、`lib/rigor/inference/narrowing.rb`、`lib/rigor/inference/scope_indexer.rb`（ADR-57経由）、型仕様コーパス。

## 所見

| # | 箇所（file:line ＋ 引用） | 問題 | 深刻度 | 提案する修正 |
| --- | --- | --- | --- | --- |
| 1 | `docs/handbook/08-understanding-errors.md:147` —— strict: "Everything → error including the `:warning` rules under `balanced`." | **文字どおり誤りであり、自己矛盾している。** `strict`のもとで`error`にならないルールが2つある。`call.self-undefined-method`は`:off`のまま（すべてのプロファイルでオフ出荷、オプトインのみ）、`flow.unreachable-clause`は`:warning`（`RuleCatalog::ENTRIES`、`severity_by_profile[:strict]`）。同じ章のフロー表（88行目）はすでに`unreachable-clause`が「strictでwarning」と述べており、プロファイル表は2セクション上のルール表と矛盾している。マニュアルの対応する行（`04-diagnostics.md:92`）は例外を正しく記述している。 | medium | `04-diagnostics.md:92`に整合させる。「ほぼすべてのルールがerror —— 例外は`call.self-undefined-method`（`off`のまま、オプトイン）と`flow.unreachable-clause`（`warning`）」。 |
| 2 | `docs/handbook/08-understanding-errors.md:145` —— lenient: "Most rules → `warning`; uncertain rules drop to `info`." | **誤り／誤解を招く。** `lenient`のもとでは、フラッグシップかつ最も多く発火するルール`call.undefined-method`は`:error`のまま（`call.wrong-arity`と`assert.type-mismatch`も同様）で、5つのルールは完全に`:off`へ落ちる（`self-undefined`、`unresolved-toplevel`、3つの`def.override-*`すべて）が、この文はそれを省いている。これを読んだレガシー移行者は、`undefined-method`が`warning`に降格されると期待するだろうが、実際にはなおCIを失敗させる。マニュアルの行（`04-diagnostics.md:90`）は正確だ。「実証済みの診断だけがerror。不確実なものは`warning`/`info`へ落ちる」。 | medium | マニュアルの立場に言い換える。実証済みのルールは`error`のまま、不確実なものは`warning`へ落ち、いくつかは完全に`off`へ落ちる。 |
| 3 | `docs/handbook/08-understanding-errors.md:146` —— balanced: "Most rules → `error`; `dump.type` → `info`." | **warningバケットを過小評価している。** 既定の`balanced`プロファイルのもとでは、`:warning`ルール（9個: `unresolved-toplevel`、`always-truthy`、`unreachable-branch`、`dead-assignment`、`return-type`、`ivar-write`、3つの`def.override-*`）が実際には`:error`ルール（7個）を上回っている。同じ章の`def.*`表（109–114行目）は`return-type`、`ivar-write`、およびオーバーライドについて「`balanced`でwarning」と述べており、ここでもこの要約行と矛盾している。マニュアルの行（`04-diagnostics.md:91`）はwarningバケットに言及している。「ほとんどのルールは`error`。`dump.type`は`info`。不確実なルールは`warning`」。 | low | warningバケットを追加する。「ほとんどのルールは`error`。不確実なものは`warning`。`dump.type`は`info`」。 |

## PASSした検証（欠陥なし）

- **エビデンス階層（マニュアル`04-diagnostics.md`のカタログ、39–58行目）** —— 18個の組み込み行すべてと2つの`—`行（`rbs_extended.unsatisfied-conformance`、`dump.type`）が、`RuleCatalog::ENTRIES`の`evidence_tier`と厳密に一致する。`evidence_tier`/`documentation_url`の記述（04の§Evidence-tier、§jsonフィールド。08の37–58行目）はカタログと照合して正確だ。ルールごと、深刻度とは直交、決してゲートにならず、情報提供用ヘルパーではnilのとき省略される。
- **`documentation_url`のアンカースキーム**（`04:27–35`）は`RuleCatalog.doc_anchor`（`rule-<id with dots→dashes>`）および`DOCUMENTATION_BASE`と一致する。`<a id>`アンカーは存在する。`rbs_extended.unsatisfied-conformance`は`documentation_url`を持たず`rigor explain`がそれを解決できないという注記は正しい（`RULE_FAMILIES = call flow assert dump def`、`rbs_extended`エントリなし → `resolve`は`[]`を返す）。
- **ルールID／ファミリー** —— 3つの章すべてのルールIDはいずれも`CheckRules`定数と一致する。マニュアルのファミリー表（call/flow/def/assert/dump）は`RULE_FAMILIES`と一致する。
- **マニュアル`04`の深刻度プロファイル表（88–92行目）** —— `severity_by_profile`と照合して正確で、両方の`strict`例外を含む。
- **セッション変更1（ADR-57 WD3のモジュール特異メソッド解決）** —— スコープ内のどのドキュメントも、モジュールファサード呼び出しが`Dynamic`のままだとは主張していない。「診断が発火しない可能性がある理由」のリスト（`08:285–293`）はモジュールの沈黙を断言していない。矛盾なし。
- **セッション変更2（ユニオンアーム述語の極性、`present?`/`blank?`、`narrowing.rb:876`）** —— 実装済みと確認（ActiveSupportメソッド）。`present?`/`blank?`がnil許容レシーバをナローイングできないと主張するハンドブックの例はない。`03-narrowing.md`の述語表と「ナローイングされないもの」のリストは、それらを扱ってもいないし矛盾もしていない。
- **セッション変更3（ADR-78の反射的な過剰畳み込み／ADR-76 WD2のfreeze/dup/cloneによるシェイプ保持）** —— `flow.always-truthy-condition`の記述（`04:47`、`08:87`、カタログの`does_not_fire_when`）は依然として正確だ。いずれの章も`freeze`/`dup`/`clone`のキャリアの振る舞いや`public_send`の畳み込みを記述していないので、矛盾するものはない。

## 意図的な単純化のセクション（欠陥ではないとしてフラグ）

- **`03-narrowing.md`は`present?`/`blank?`のナローイングを省略している。** これはActiveSupportであってコアRubyではない。ハンドブックのナローイング章は意図的にコアメソッドにスコープを絞っている（その述語表は`String#empty?`、`Array#empty?`、`Hash#empty?`、`Integer#zero?/positive?/negative?`だけを列挙している）。gemメソッドのナローイングを追加するのは深さのための深さであって、忠実度の修正ではない。そのまま残す。
- **マニュアル`04`のlenient行**（"uncertain ones drop to `warning`/`info`"）は、`def.override-*`/`self-undefined`/`unresolved-toplevel`がlenientのもとで`off`へ落ちることを列挙していない。これは立場の記述であって列挙ではなく、擁護可能に読める —— 変更不要。（所見#2は*ハンドブック*に限定されており、その文はさらに実証済みルールがwarningになると誤って示唆している。）
- **いずれの章も、モジュールファサード解決、`present?`/`blank?`のナローイング、freezeによるキャリア保持、`public_send`の畳み込み抑制を扱っていない。** これらは診断表面の契約を持たない精度加算的なエンジン改善だ。ユーザードキュメントはそれらを列挙する義務はなく、そうすればソフトウェアリファレンスドキュメントを肥大化させる。省略するのが正しい。

## 評決

**マニュアル`04-diagnostics.md`はスコープ内のすべての主張にわたって実装に完全に忠実だ** —— エビデンス階層、深刻度プロファイル、ドキュメントURL、ルールID、発火条件がすべて`RuleCatalog`/`CheckRules`と一致し、今回のセッションの4つのエンジン変更のいずれもそれと矛盾しない。**ハンドブック`03-narrowing.md`はクリーンだ** —— そのコアにスコープを絞ったナローイングカタログは、新しい`present?`/`blank?`とモジュールファサードの振る舞いを過剰主張することも矛盾することもない。唯一の本物の欠陥は**ハンドブック`08-understanding-errors.md`の深刻度プロファイル要約表（143–147行目）**だ。3つの行すべてがルールごとの実態からドリフトしており、そのうち2つ（`strict`、`balanced`）は同じ章の詳細な`flow.*`/`def.*`ルール表と直接矛盾する。`strict`の「everything → error」行は、`unreachable-clause`（`warning`）と`self-undefined-method`（`off`）が例外であるため文字どおり誤りだ。修正は、これら3つの行を正確なマニュアル`04`のプロファイル表に整合させることだ —— コード変更なし、そして他に古いルールID、誤った深刻度、誤った発火条件は見つからなかった。
