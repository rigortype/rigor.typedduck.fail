---
title: "Matsumoto & Minamide 2010 (Ruby CFA) — Rigor 観点考察"
description: "Imported from rigortype/rigor docs/notes/20260518-matsumoto-2010-cfa-rigor-review.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/notes/20260518-matsumoto-2010-cfa-rigor-review.md"
sourcePath: "docs/notes/20260518-matsumoto-2010-cfa-rigor-review.md"
sourceSha: "770499cdaeb725316f13ab705e99538175d7a4597ceb5e06b723184357a94494"
sourceCommit: "994b5435a3eeb1c178aad9a8b077e9950616b191"
sourceDate: "2026-05-18T04:21:23+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266518
---

Date: 2026-05-18.
Status: research note, no design commitments.
種別: 外部文献のRigor観点レビュー。

## 対象論文

- 松本 宗太郎,南出 靖彦
  「Rubyプログラムの制御フロー解析とその健全性の証明」
  情報処理学会論文誌 プログラミングVol.3 No.2, pp.9–25 (Mar. 2010)
- 出典URL: <https://ipsj.ixsq.nii.ac.jp/records/37907>
- ローカル写し: [IPSJ-TPRO0302003.md](https://github.com/rigortype/rigor/blob/main/IPSJ-TPRO0302003.md) /
  [IPSJ-TPRO0302003.pdf](../../IPSJ-TPRO0302003.pdf)

## 1. 論文要旨（一段落）

Rubyのサブセット**SemiRuby**（class定義は事前所与・`def`はクラス名・
メソッド名・定義識別子の三つ組へ簡約・blockはラムダ式・`return`/`break`
は`throw`/`catch`ペアに翻訳）に対して操作的意味論を与え、その上で
**半フロー感度（semi-flow-sensitive）な制御フロー解析**を設計する。各
プログラム点に「クラス×メソッド名 → メソッド定義」の写像である
**メソッド状況（method configuration）**を関連付け、`def`式の評価で
これを更新、`if`合流で集合的和をとる。値そのものはフロー非感度、
しかし*どの定義が見えているか*はフロー感度、という非対称設計が新規性。
最後にPalsberg–Schwartzbach型の安全性解析（未定義メソッド呼び出し
なし／`yield`の対象はラムダ式）を定義し、**保存 + Progress**で
健全性を証明する。実装はOCaml + BDDBDDB（Datalog処理系）。

## 2. Rigorの今の設計との対応関係

| 論文側の概念 | Rigor側の対応物 | 一致度・所見 |
| --- | --- | --- |
| **半フロー感度**という指針 | [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/)のエッジ感度ナローイング、trinary certainty、fact stability | 一致。値のフルフロー感度を避けるという論文の現実主義は、Rigorのcertainty/effectモデルとも整合。 |
| **メソッド状況D = {(C,f) → d}** | Rigorのdispatcher階層（plugin → dependency-source → bundled）+ Plugin::FactStore（[ADR-9](../../adr/9-cross-plugin-api/)） | Rigorは静的に "どの定義が見えるか" をper-walkerでしか決めていない。論文のDはプログラム点ごとに動的に切り替わる点でRigorより強力。 |
| **例1：トップレベルclass A再オープン** | [ADR-17 `pre_eval:`](../../adr/17-monkey-patch-pre-evaluation/) | 論文では半フロー感度CFAが "x:Fixnum / y:String" を**そのまま**区別する。Rigorは同等の精度を「先に一度走らせてproject-wideなProjectPatchedMethodsを作る」二段階アプローチで近似する設計。論文側の方が解析機構としては美しく、ADR-17は工学的妥協であることが浮き彫りになる。 |
| **例2：defの中でdefを上書き** | Rigorでは事実上ハンドルしていない | 論文の解析はこれも精度よく解析する。RigorはADR-5 robustness principle（Postel流の非対称規律）で「実務でそう頻繁には起きない」と切る側。代償として精度差は埋まらない。 |
| **例3：if分岐内のdef** | RigorのUnion narrowing | 双方とも保守的な和になる点で一致。論文もRigorも "本質的に静的解析不可能" と同じ判断。 |
| **SemiRubyのthrow/catchによるreturn/breakモデル化** | Rigorのnon-local-exit扱い（diagnostic familyの制御部分） | 設計判断としては同型。 |
| **インスタンス変数F[[l,@x]]** | Rigorのインスタンス変数推論（IVarのper-class shape） | 論文はロケーションごとに分割管理する点でRigorより細かい。Rigorはクラス単位＋初期化文脈で抑える。 |
| **安全性解析（未定義メソッド・yield健全性）** | Rigorの`call.method-not-found`系（[diagnostic-policy](../../type-specification/diagnostic-policy/)） | 検査対象はほぼ同じ。Rigorは加えて`def.return-type-mismatch`系まで踏み込むが、論文側はそこまで型を持たない（値の集合のみ）。 |
| **健全性の形式証明（保存 + Progress）** | **Rigorには存在しない** | 仕様コーパスはRFC 2119規範だが、機械検証も操作的意味論もない。論文側がスコープをSemiRubyに絞ったからこそ証明できた事実は重要。Rigorが同等の証明を狙うなら、まず「証明可能な核（Rigor Core）」の切り出しが先になる。 |
| **実装：OCaml + BDDBDDB (Datalog)** | Rigor：手書きRuby推論エンジン + ファイルベース キャッシュ（[ADR-4](../../adr/4-type-inference-engine/), [ADR-6](../../adr/6-cache-persistence-backend/)） | 論文のDatalog化はメンテ性で美しいが、（a）RBSとの結合、（b）pluginの任意Rubyロジック、（c）Ractor並列化（[ADR-15](../../adr/15-ractor-concurrency/)）といったRigorの制約とは噛み合わない。設計トレードオフの差。 |

## 3. 論文がRigorに示唆する具体ポイント

1. **「メソッド定義の見え方だけはフロー感度」というスライス**は、
   Rigorが次に精度を稼ぐ余地の一つを明確化している。現状Rigorは
   `:leaf`規律 + [ADR-17](../../adr/17-monkey-patch-pre-evaluation/)の
   事前評価でほぼ静的に決めてしまうが、**部分的にプログラム点単位の
   "method configuration" を持つ**という中間案は理論的に正当化可能だと
   本論文は示している。実装コストとキャッシュ整合性（ADR-6）次第。

2. **ADR-17のMVP（明示的ファイル列挙）で十分か**の議論補強材料に
   なる。論文の例1のようなtop-level上書きはまさにADR-17のユース
   ケースで、論文は「半フロー感度CFAで解ける」と示している。
   つまりADR-17の "explicit list" 路線は精度の下限を確実に押し上げる、
   安価で正しい第一歩であると追認される。

3. **健全性証明の不在**はRigorの戦略的な空白として残っている。論文と
   同じく**コア + 外周**の二層構造（SemiRuby ↔ Ruby全体）を取れば、
   Rigorも "Rigor Kernel" だけは保存・Progressを狙えるはず。これは
   現時点で[ROADMAP](../../roadmap/)にも入っていないが、長期で価値の
   高いトラックである。

4. **本論文の第一著者 = Soutaro Matsumoto = Steepの作者**という事実は、
   RigorがSteep互換性（[ADR-8](../../adr/8-steep-inspired-improvements/)）
   とRBS上位互換に置いている重みを再確認させる。Steepの現代的な実装の
   系譜的前史をこの論文に見ることができる：method configurationが
   Steepの中ではsubtyping + global envのサニタイズで隠蔽されている、
   という比較は単独でメモ価値がある。

5. **blockをlambda、return/breakをthrow/catchに翻訳するSemiRubyの
   スタイル**は、[ADR-16](../../adr/16-macro-expansion/)のマクロ展開
   基盤Tier A（block-as-method）の意味論基礎としてそのまま流用できる。
   SemiRubyの意味論をTier Aの「正しさ」の定義に採用する選択肢は
   検討に値する。

## 4. まとめ

論文はRigorの**「メソッド定義の動的性vs静的解析」**という最大級の
根本問題を、SemiRubyという最小核に絞ることで形式的に解いて見せた成果
である。Rigorは工学的にはより広いRuby表面をカバーしているが、
(a) `pre_eval`のような事前評価による近似に頼っており、（b）健全性の
機械的証明を持たない。論文の半フロー感度CFAとその健全性証明は、Rigor
の**将来の "Rigor Kernel" 切り出し**と**method configurationを部分
採用するナローイング強化**の両方向に、信頼できる出発点を提供している。

## 関連ADR / 仕様

- [ADR-5: Robustness Principle](../../adr/5-robustness-principle/)
- [ADR-8: Steep-Inspired Improvements](../../adr/8-steep-inspired-improvements/)
- [ADR-15: Ractor Concurrency](../../adr/15-ractor-concurrency/)
- [ADR-16: Macro / DSL Expansion Substrate](../../adr/16-macro-expansion/)
- [ADR-17: Monkey-Patch Pre-Evaluation](../../adr/17-monkey-patch-pre-evaluation/)
- [Control Flow Analysis仕様](../../type-specification/control-flow-analysis/)

## 姉妹ノート

- [Matsumoto & Minamide 2008（Polymorphic Record型）Rigor観点考察](../20260518-matsumoto-2008-poly-records-rigor-review/)
  — 同著者の2008年論文（本論文の参考文献11）のRigor観点レビュー。
