---
title: "ADR-65 — Diagnostic evidence tier and documentation URL"
description: "Imported from rigortype/rigor docs/adr/65-diagnostic-evidence-tier-and-doc-url.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/65-diagnostic-evidence-tier-and-doc-url.md"
sourcePath: "docs/adr/65-diagnostic-evidence-tier-and-doc-url.md"
sourceSha: "a842026023bb135f82e66bbc2d480de46995b74b54122ef29aea8811446cd92f"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4065
---

Status: **Accepted — 2026-06-15に実装**。公開診断サーフェス（surface）に
追加した2つのフィールド。すべての組み込みルールが
**`evidence_tier`**（`high` / `medium` / `low`、情報提供用ヘルパーには
付かない）── 発火が真陽性であるというRigor自身の確信度 ── を持ち、さらに
公開された診断カタログ内のルールアンカーを指す安定した
**`documentation_url`**を持つ。どちらも`rigor check --format json`では
診断ごとに、ルールカタログ（`rigor explain` / `rigor explain --format
json`）ではルールごとに出力される。精度に対して加算的（precision-additive）
であり、新しい診断は出ず、深刻度も変わらず、診断集合はバイト単位で同一。
[ADR-61](../61-agent-friendly-diagnostic-statistics/)（ストリーム上の
構造化フィールド）の後続であり、ここでは*確信度*軸と*参照*軸を追加する。
同じ変更でカタログの欠落も塞ぐ ── `call.unresolved-toplevel`には
`RuleCatalog`エントリーがなかった ── うえで、この欠落が再発しないよう
網羅性スペックを追加する。

根拠: 2026-06-15の型ツール比較開発者フィードバックレポート
（`rigor-developer-feedback-2026-06-15.md`、§4＋§5.1）。§4が筆頭の要望で
ある。外部分類器はRigorの`signal_lower`を0につぶしてしまう。なぜなら、その
分類器は診断を「実在する潜在バグ」へ昇格させる手段としてツール横断の位置一致
しか持たず、Rigorの最も強いルールはピアツールが決して到達しない位置で発火する
からだ。*ツール自己申告の確信度フィールド*があれば、そうしたコンシューマーは
ピアの裏付けなしに高確信度の発火を昇格できる。§5.1は参照に関する要望である。
ピア（Sorbetの`srb-NNNN`）はルールごとのドキュメントURL（doc URL）を提供して
いるが、Rigorはルールに名前を付けながらどこも指していなかった。

## コンテキスト

Rigorはすでに、強力な偽陽性の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>
（`feedback_false_positive_discipline`）を通して診断を実行している。ルールが
発火するのは、その発火ゲートが満たされたときに限られる ── 具体的で静的に既知の
レシーバー、メタプログラミングによる抜け道がないこと、両側で記述された
（both-sides-authored）RBS、などである。この規律はコンシューマーからは
*見えない*。JSONストリームは`error` / `warning` / `info`（影響度）とルールIDを
言うが、個々の発火をアナライザーがどれだけ信頼しているかは何も言わない。
そのためフィードバックの外部分類器は、具体的な`String`上の
`call.undefined-method`（ほぼ確実に実在のバグ）を、たいていは解決の欠落である
`call.unresolved-toplevel`（定義ファイルが単に解析対象集合に入っていない）と
区別できなかった。

2つの構造的なファクト（fact）により、この欠落は安価に塞げた。

1. **確信度はすでにルールの属性である**。偽陽性規律は不確実なケースをルール
   発火の*前*にフィルタするので、残った確信度はそのルールがどのゲートを適用する
   かに支配される ── つまり、それは個々の呼び出しサイトの属性ではなく、ルール種別
   の属性である。フィードバック自身の§3もこのように推論している。すなわち、
   *新しい*ルール種別を「カバレッジ警告」対「実際の型ルール発火」へとグループ化
   している ── 発火ごとではなく種別ごとに。
2. **単一の信頼できる情報源となるルールカタログがすでに存在する**。
   [`RuleCatalog`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/rule_catalog.rb)はすべてのルールに
   ついて`summary` / `fires_when` / `does_not_fire_when` /
   `severity_by_profile` / `since`を持ち、`rigor explain`を裏で支えている。
   ティアとドキュメントURLは、同じテーブルにもう2列増やすだけである。

なぜ今か: ADR-50はv1.0で公開出力サーフェスを凍結する。本件は凍結前の期間に
着地するので、フィールド名は正しい状態で凍結に入る。

## 決定

### WD1 — `evidence_tier`は発火ごとの計算ではなくルールごとの属性である

ティアは`RuleCatalog::Entry`上に置かれ、ルールごとに1つの値を持ち、各診断
サイトで計算されることは**ない**。これは上記の偽陽性規律に関する観察から
導かれる。発火ごとのティアであれば、わずかな利得のために確信度シグナルを各
ルールの抑制ロジックと発火ロジックへ通さねばならないが、ゲートは発火ごとの
形式が測ろうとするサイト間の分散（variance）を*すでに*つぶしてしまっている。
ルールごとの形式はコンシューマーが望むものでもある ── ルールIDごとの安定して
ドキュメント化可能な契約（contract）であり、Sorbetの`srb-NNNN`ごとの
セマンティクスの双対である。

### WD2 — 深刻度に直交するティアのセマンティクス

ルールの発火ゲートが立脚する証拠の*種別*によって割り当てられる、3つのティア。

- **`high`** — 具体的で静的に既知の型に対して、メタプログラミングの抜け道なしに
  のみ発火する。偽陽性規律が不確実なケースをフィルタ済みなので、発火はほぼ常に
  本物の問題であり、コンシューマー（または分類器）はクロスチェックなしにそれに
  基づいて行動できる。（`call.undefined-method`、`call.wrong-arity`、
  `call.argument-type-mismatch`、`call.possible-nil-receiver`、
  `def.method-visibility-mismatch`、`flow.always-raises`、
  `flow.unreachable-branch`（リテラルのみ）、`def.ivar-write-mismatch`、
  `def.override-*`ファミリー、`assert.type-mismatch`。）
- **`medium`** — *ドキュメント化された*偽陽性の許容範囲を受け継ぐ、フローレベル
  または推論レベルの証明に立脚する（ループ／ミューテーション／RBS厳格性の
  モデリングギャップ。ルールの`does_not_fire_when`リストで絞り込まれる）。
  たいていは正しいが、リテラルに証明可能ではない。
  （`flow.always-truthy-condition`、`flow.unreachable-clause`、
  `flow.dead-assignment`、`def.return-type-mismatch`。）
- **`low`** — 解決ギャップまたはカバレッジギャップのシグナル。発火は確定的な
  バグというより、アナライザーが見られないコンテキストを反映していることが多く、
  レビュー経路へ送られる（例: `call.unresolved-toplevel` → `pre_eval:`）。
  （`call.self-undefined-method`、`call.unresolved-toplevel`。）情報提供用
  ヘルパー（`dump.type`）はティアを持たない。

ティアは**深刻度に直交し**、深刻度プロファイルにも直交する。診断が表面化する
かどうかを変えることは決してなく、ゲーティングに供給されることも決してない ──
注意を振り向けるだけである。これは偽陽性規律のガードレール（ADR-61が観察した
ものと同じ）を保つ。深刻度に供給される確信度軸があれば、「これは低確信度だ」が
実在のエラーをひそかに格下げしたり、「high」がゲートをでっち上げたりしてしまう
が、そのどちらもユーザーは求めていない。

### WD3 — `documentation_url`は公開カタログ内のルールごとのアンカーである

URLはルールごとにアンカーが付いた公開診断マニュアルページ ──
`…/docs/manual/04-diagnostics.md#rule-<id-with-dots-as-dashes>` ── であり、
gemspecの`documentation_uri`方式を踏襲する。カタログページは対応する
`<a id>`アンカーを持ち、`rigor explain <rule>`をルールごとの権威ある参照と
して名指す。カタログ（別個のドキュメントサイトではなく）が単一の信頼できる
情報源であり続ける。`rigor.dev/rules/<kind>`のようなサイトはでっち上げない。
存在しないページへのURLを提供するのは何もないより悪く、偽陽性／誠実さの精神は
解決するものだけを出力せよと言う。設定可能なベース（`<base>/<rule>`。自前の
ルールドキュメントをホストする組織向け）は明らかな拡張だが、需要が生じるまでは
先送りする。

### WD4 — 表面化、およびフラットなフィールドのシェイプ

両フィールドとも出力される。

- **診断ごと**に`rigor check --format json`で出力 ── ルールIDから（純粋な
  カタログ参照によって）CLIのJSON経路で補強されるので、診断の構築サイトは何も
  変わらない。メタデータを持つのは組み込みルールだけである。プラグイン／
  `rbs_extended`／パースエラーの診断はそのまま手を付けない（それらは自前の
  ドキュメントと確信度をホストする）。`evidence_tier`はnilのとき省かれる。
- **ルールごと**にカタログ上で出力: `rigor explain <rule>`は両方を表示し、
  `rigor explain --format json`はそれらを持つ ── これにより、そのコマンドは
  フィードバックの§5.1も望んでいたドキュメントURL付きの機械可読なルール分類
  体系に、無料でなる。

フィールドは**フラット**（`"evidence_tier": "high"`）であり、既存の
`receiver_type` / `method_name`規約に合わせている。フィードバックが提案した
入れ子の`{ "evidence": { "tier", "rationale", "fp_suppression_considered" }}`
オブジェクトではない。`rationale`はまさにカタログの`fires_when` /
`does_not_fire_when`であり、すでに`rigor explain`経由で到達できる。診断ごとに
それを複製するとストリームが肥大しドリフトする。`fp_suppression_considered`は
構造上すべてのRigor診断で真なので（規律はどのルールが発火するより前に走る）、
情報を持たない。

## 却下された代替案

- **発火ごとの動的ティア** — 各サイトで実際のレシーバーの具体性／メタ
  プログラミングのシグナルから確信度を計算する。却下: 発火ゲートがその分散を
  すでにつぶしている（WD1）ので、わずかな利得のための大きなルール横断サーフェス
  になり、間違った動的ティアは人を誤らせる新たな手口になる。
- **`rationale` / `fp_suppression_considered`を持つ入れ子の`evidence`
  オブジェクト** — WD4により却下（rationaleは`rigor explain`にある。抑制
  フラグは普遍的に真）。
- **`rigor.dev/rules/<kind>`ドキュメントサイト** — v1では却下: 存在しない
  ページへのURLは不誠実である。カタログ＋`rigor explain`が本物のルールごとの
  参照であり、マニュアルのアンカーは今日すでに解決する。
- **ティアを深刻度または終了コードに供給する** — 却下: ティアは注意を振り向ける
  のであって、ゲートはしない（WD2のガードレール）。
