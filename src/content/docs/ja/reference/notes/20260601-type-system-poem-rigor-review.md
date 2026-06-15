---
title: "「型システムポエム」(myuon) — Rigor 観点考察"
description: "Imported from rigortype/rigor docs/notes/20260601-type-system-poem-rigor-review.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260601-type-system-poem-rigor-review.md"
sourcePath: "docs/notes/20260601-type-system-poem-rigor-review.md"
sourceSha: "1c1801eec239e486b3697192f6e9965a4a2bbb7de0dfdf227a9e306dc39fd4cc"
sourceCommit: "e9143e5a24c59d43e2ea9f548835c91f029e19dc"
sourceDate: "2026-06-01T22:49:16+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266601
---

Date: 2026-06-01.

Status: **research note, no design commitments.**

種別: 外部論説のRigor観点レビュー。
三部作（外部論説 × 既存言語への型後付け）:
- 本ノート（myuon「型システムポエム」）
- [20260601-revenge-of-the-types-runtime-checker-survey.md](../20260601-revenge-of-the-types-runtime-checker-survey/)（Armin Ronacher「Revenge of the Types」）
- [20260601-gradual-typing-era-mizchi-rigor-ts-review.md](../20260601-gradual-typing-era-mizchi-rigor-ts-review/)（mizchi「漸進的型付け言語の時代に必要なもの」）

## 対象論説

- myuon「型システムポエム」
- 出典URL: <https://myuon.github.io/posts/type-system-poem/>

型理論寄りの著者による、型システムへの世間の（主に根拠のない）言説への
反論と、型システムの現在地・今後についての随想。論文ではなく意見表明で
あり、規範的主張ではないが、「型検査器はどうあるべきか」という実用上の
温度感が濃く出ているため、Rigorの設計憲法と突き合わせる価値がある。

## 1. 論説の主要論点（要約）

- **型システムは程度問題**。型の強さが正義ではなく、丁度いい着地点を探す
  べき領域。計算機科学への根拠なき批判はやめよ、というメタ主張が通底。
- **決定的な型推論を保つ着地点の成功**（OCaml等）。一方で**強い型システム
  の代償** — クソ長い型を書かされる/コンパイル時間増/型レベルプログラ
  ミングで消耗/実行時エラーをコンパイルエラーにするのに途方もないコスト。
- **現実世界は型がガバガバで、境界付近にすべてのしわ寄せが行く**(静的解析
  の宿命。Haskell/Scala/Rustで顕著)。
- よくある誤解への反論:
  - 「型のある言語は型を書かされる」は（一般には）嘘。型推論は存在する。
    Javaは理論的限界ではなく言語デザインで宣言を強制しているだけ。
  - 「型から実装を導ける」なわけない(Int→Intの関数がいくつあると思って
    いるんだ)。parametricityが効く特殊状況に限定。
  - 「IDEが教えてくれるから型いらない」→ そのIDEがやっているのは実質
    静的解析だぞ。
  - 「将来推論が発展したら型を書かなくてよくなる」→ System Fなど強い型
    システムは推論が決定的でないと示されている。理論進展ではどうにもなら
    ない。なお「型を書かなくてよい型システム」はすでに存在する。
  - 「依存型がいい」→ 定理証明と紙一重、まじで地獄なのでおすすめしない。
- **動的型付け言語への型付け**: 既存LL言語にちゃんと型をつけるのは結構
  難しい。**既存言語に型を入れるより、似た文法でちゃんと型のつく言語を
  作って既存のを駆逐するほうが早い**（著者の賭け）。
- **今後**: 強くしたり合体させたりするフェーズは終わりつつあり、特定状況に
  マッチした「一芸型システム」言語が増えると予想。Rustのregion推論が
  先陣。effect system等は「決定性の壁」と現実API連携が課題。

## 2. 総合評価（先に結論）

論説が**「型検査器はこうあってほしい」と望む価値観レベルの主張には
Rigorはほぼ忠実に答えている**（8〜9割）。むしろRigorは本論説を設計
憲法にしたかのように、偽陽性規律・robustness原則・inference budgets・
gradual fallbackを並べている。

一方、論説が投げる**言語デザイン論レベルの問い(特に「新言語を作るほうが
早い」)には、Rigorは"答えて"いない。Rigorはその反対側に"賭けて"いる**。
これはRigorが論破できる種類の問いではなく、経験的証拠の蓄積でしか
判定されない。

## 3. 論点別マッピング

### 3.1よく答えている（価値観が一致）

| 論説の主張 | Rigorの対応 |
| --- | --- |
| 型は程度問題、丁度いい着地点 | RBS厳密スーパーセット + 三値certainty(yes/no/maybe)+ inference budgets。証明できなければ`Dynamic[T]`に退避する"降参の自由"が一級市民。`overview.md`設計優先度全体。 |
| soundnessは正義ではない | **偽陽性規律**（`overview.md` § False-positive discipline / 設計優先度8）。「動いているプログラムこそ最重要の事実。実行時が到達しない最悪ケースで作者を脅かしてはならない」= 最悪ケース健全性を意図的に捨てる宣言。論説の温度感に最も忠実な一致点。 |
| 型を書かされる、は嘘（推論がある） | ADR-0 "AI-Native Purity": アプリ本体にRigor独自型DSLを入れない、推論ファースト。足りない所だけRBS/rbs-inlineを外部に置く。 |
| 境界にしわ寄せが行く | robustness原則（戻り値は厳しく/引数は緩く）+ `Dynamic[T]` provenance。clause 2のworkaround-multiplication anti-pattern（引数を過度に厳しくすると呼び出し側に回避コードが増殖）は、論説の境界摩擦の問題意識をそのまま設計判断に言語化したもの。 |
| 依存型は地獄 | 依存型を採らず、有界なrefinement（`non-empty-string`/`positive-int`）で実用に効く一握りの精度だけ取りに行く中庸。論説の依存型懐疑への具体的折衷例。 |

### 3.2「答えている」より「同じ誤解をしていない」だけ

- 「型から実装を導ける、なわけない」「IDE = 実質静的解析」 — Rigorは
  そもそもこれらの過剰主張をしていない（Rigor自身が"その静的解析"）。
  整合的だが地雷を踏んでいないだけ。
- 論説が誉める「過剰な約束をしない誠実さ」の側に、Rigorのドキュメント群
  （RFC 2119 / ADR / budgetsで推論の限界を明記）は立っている。「型システム
  について適当を言うな」というメタ主張には姿勢として答えている。

### 3.3答えていない/反対に賭けている

- **「既存言語に型を入れるより新言語を作るほうが早い」** — 本質的すれ違い。
  Rigorは文字どおり「既存言語（Ruby）に型を入れる」陣営そのもので、論説が
  「遠回り」と評する道を選んでいる。Rigorの反論は技術的でなく戦略的:
  「Rubyを壊さない・独自DSLを入れない・メタプログラミングはプラグインに
  隔離・gradual + 偽陽性規律で実用に振る」という設計選択がその難しさの
  緩和策だ、という賭け。著者なら依然「クリーンな型付きRubyライク言語の
  ほうが早い」と返すだろう。"答え"ではなく"異なる賭け"。
- **型理論フロンティア(System Fの決定不能性 / effect systemの決定性の壁 /
  region推論 / 一芸型システム言語の増加)** — Rigorは言語処理系でなく単一
  既存言語向けツールなので、そもそも土俵が違う。ゆるい対応物として、
  プラグイン機構（Rails/dry-rb/FFIごとにドメイン特化の型付けを足す）は
  「一芸型システムの合成」に少し似る。CFAのmutation effectモデルは
  effect systemの遠い反響。ただし比喩レベルで、言語デザイン論には正面から
  答えていない。

## 4. 賭けの判定材料（経験的証拠）

「新言語のほうが早い」へのRigorの賭けの当否は、論破ではなく実証で判定
される。現時点の証拠:

- Mastodon v4.5系16リリースタグで`surfaced = 0`(正常な保守で新規偽陽性
  ゼロ): [20260521-mastodon-v4.5-regression-sweep.md](../20260521-mastodon-v4.5-regression-sweep/)、
  v0.1.9再走[20260523-mastodon-v4.5-regression-sweep-v0.1.9.md](../20260523-mastodon-v4.5-regression-sweep-v0.1.9/)、
  ADR-35 FP検証[20260529-adr35-mastodon-fp-verification.md](../20260529-adr35-mastodon-fp-verification/)。
- 偽陽性規律はこの「既存コードを脅かさない」賭けの中核であり、regression
  sweep群がその経験的裏付けを積み上げる構造。

## 5. ひとことで

論説が「型検査器はこうあってほしい」と望む実用上の温度感にはRigorは
極めて忠実に答えている。ただし論説が「そもそもこのアプローチは遠回りでは」
と問う根っこの懐疑には、Rigorは答えるのではなく賭けで応じており、その
賭けの当否はregression-sweep群のような経験的証拠が積み上がるかどうかで
判定されていく。
