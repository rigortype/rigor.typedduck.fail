---
title: "Matsumoto & Minamide 2008 (多相レコード型 Ruby 型推論) — Rigor 観点考察"
description: "Imported from rigortype/rigor docs/notes/20260518-matsumoto-2008-poly-records-rigor-review.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260518-matsumoto-2008-poly-records-rigor-review.md"
sourcePath: "docs/notes/20260518-matsumoto-2008-poly-records-rigor-review.md"
sourceSha: "3e43a147510bc06cb411af0ffae1c5ece17df6c76d8cd1749bb4d4718a242972"
sourceCommit: "3ea20b239bba8b7cdcd0b5e759a36ac849253e04"
sourceDate: "2026-06-14T00:35:49+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266518
---

Date: 2026-05-18.

Status: **research note, no design commitments.**

種別: 外部文献のRigor観点レビュー。

## 対象論文

- 松本 宗太郎,南出 靖彦
  「多相レコード型に基づくRubyプログラムの型推論」
  情報処理学会論文誌: プログラミングVol.49 No.SIG 3 (PRO 36),
  pp.39–54 (Mar. 2008)
- 出典URL: <https://ipsj.ixsq.nii.ac.jp/records/16465>
- ローカル写し: [IPSJ-TPRO4903005.md](https://github.com/rigortype/rigor/blob/master/IPSJ-TPRO4903005.md) /
  [IPSJ-TPRO4903005.pdf](../../IPSJ-TPRO4903005.pdf)

## 1. 論文要旨（一段落）

MLの型システムにGarrigueのカインド付き多相レコード型(maskable fields
付き)を載せて、Rubyプログラムの型推論ツールを設計・実装した。オブジェクト
型は`α :: (L, U, R) ▷ α`の三つ組カインドで表現し、`L`は要求メソッド
集合、`U`は定義メソッド集合、`R`はメソッド名→関数型の関係述語。
インスタンス変数はTofteの**命令的型変数（`_β`）**で扱い、多相性を抑制
して副作用との健全性を保つ。組込みクラスは独自のシグネチャ言語
（`def m :: C → C'`）で記述し、Rubyのクラス再オープン文化に合わせて
**シグネチャとRuby実装が同一クラスに共存**する型システムを設計。
負の位置（引数）はシグネチャのみから、正の位置（返り値）はシグネチャ
+ Ruby定義の両方から型を構築する非対称設計を採用。多相再帰
（Array/String/Integerの相互再帰）と`map`のような正則でない多相
メソッドは**クラス定義の有限回展開（複製）**で近似する。実装はOCaml +
改造NodeDump、Ruby 1.8.5サンプル39本中21本を型推論可能
（`list.rb`：80行で1.26秒、ただし束縛型変数数**57,479個**）。健全性は
「Rubyのごく制限されたサブセットでのみ成立する」設計と明言。

## 2. Rigorの今の設計との対応関係

| 論文側の概念 | Rigor側の対応物 | 一致度・所見 |
| --- | --- | --- |
| **シグネチャ言語`def m :: C → C'`** | [RBS（およびそのRigor上位互換）](../../type-specification/rbs-compatible-types/) | 本論文はRBS標準化（2020年頃）の12年前。事実上の**RBS前史**。同じく "Rubyプログラム本体に型は書かない／シグネチャを別途与える" という分離戦略は同じだが、RBSは`.rbs`ファイル分離、本論文は同一クラスへの共存という構文上の違い。 |
| **多相レコード型 + Garrigueカインド** | RBSの**公称型 + interface部分構造**ハイブリッド | Rigorは**公称型優位**。多相レコード型の構造的アプローチは取らない。論文が苦しんだ「型表記が肥大化する／57k型変数」問題は、RBSが公称名を前面に出すことで概ね回避できている。これはSteep時代に同著者がたどり着いた工学的結論と整合。 |
| **命令的型変数（IVarの多相制限）** | Rigorのper-class IVar shape + initialization tracking（仕様は[internal-spec](../../internal-spec/inference-engine/)） | 問題領域は完全に同じ：副作用持つivarを多相に汚染させない。論文はTofte流の型変数分類、Rigorはper-class shapeの固定化＋カインド分離なしの実装で対処。**論文の解は理論的に綺麗、Rigorの解は実用的に十分**、というトレードオフの違い。 |
| **正の位置／負の位置の非対称扱い** | [ADR-5ロバストネス原則](../../adr/5-robustness-principle/) | これは興味深い**正味同方向**の非対称性。論文「呼び出し側に課す要求（負位置）は少なめ、提供側として認める実装（正位置）は寛大に」。Rigor「引数（負位置）は寛容、返り値（正位置）は厳格」。**呼ぶ側に楽をさせる側**は両者一致、**返り値側の厳格／寛容の向き**が逆だが、これは「型推論ツールとして引っかかりを減らしたい（論文）」vs「型カタログとして信頼を作りたい（Rigor）」という目的差から自然に出てくる差。Rigorがロバストネス原則を選んだ正当化材料として、本論文の対義設計と比較するメモは[ADR-5](../../adr/5-robustness-principle/)に追記する価値がある。 |
| **多相再帰の "クラス展開" 対応** | RBSの宣言済み公称型 + 個別ジェネリクス | 論文ではArray/String/Integerの相互再帰が単相に潰れ、誤検出を生むため`Array#0`/`Array#1`のように**手で展開**。Rigor側はそもそもRBSが`class Array[Elem]`を最初から多相で宣言できるので構造的な単相崩壊が起きない。Rigorが「**手書きRBS（および将来sig-gen）を信頼する**」（[ADR-14](../../adr/14-rbs-sig-generation/), [AGENTS.md § RBS Authorship](https://github.com/rigortype/rigor/blob/master/AGENTS.md)）と決めている理由の傍証。 |
| **`map`の正則でない型（多相再帰 + 多相メソッド）** | RBSの`def map: [U] () { (Elem) -> U } -> Array[U]` | 論文は表現不能で「結果配列の要素型 = 入力配列の要素型」と保守的に近似 → 実用例`[1,2,3].map{\|x\|x.to_s}.map{\|x\|(x+"0").to_i}`で誤検出。RBS（Rigor）は自然に書ける。**ML型推論の限界が公称ジェネリクスでの宣言主義に押し出された理由**を本論文が明示している。 |
| **異種混合コレクション** | RigorのUnion型（[value-lattice.md](../../type-specification/value-lattice/)） | 論文は要素型を「共通フィールドのみ持つ構造型」で扱う（フィールドアクセス可、識別不可）。RigorはUnion（識別可、絞り込み必要）。Unionの方が**narrowing/refinementと相性が良い**、Garrigue流の方が**アクセスの自由度が高い**、というのが本質的な差。Rigorがcontrol-flow narrowingを重視する設計なのでUnion寄りで正解。 |
| **`as(Integer)`キャスト案** (§7) | RBS::Extendedの`%a{rigor:v1:assert_type ...}` / `%a{rigor:v1:return_override ...}` ([rbs-extended.md](../../type-specification/rbs-extended/)) | **同方向の発想が12年の隔たりを超えて再合流**している。論文の「`as`メソッドはランタイムでは何もしない・型推論側にだけ意味を持つ」設計は、Rigorのpredicate / assertion annotationと完全に同じ哲学。 |
| **健全性に対するスタンス** | Rigorの "RFC 2119仕様＋実装は実用優先" | **完全一致**。論文「実用的なRubyプログラムへの対応を理論的正当性より優先」。Rigor「robustness principleを採用、機械化された健全性証明は持たない」（[ADR-5](../../adr/5-robustness-principle/), [implementation-expectations.md](../../internal-spec/implementation-expectations/)）。同著者の2010年CFA論文（[姉妹ノート](../20260518-matsumoto-2010-cfa-rigor-review/)）でだけ証明を与えていたのは、対象をSemiRubyに絞れたからこそ。 |
| **varargsを扱えない** | RBSの`*args: T` / `**kwargs: T`ネイティブサポート | 論文では`print`を手で`print1`/`print2`/`print3`に分割していた。RBS言語の表現力が**何を解決したのか**が具体的に見える例。 |
| **エラー出力が内部表現の生dump（§7課題）** | Rigorのdiagnostic policy / family hierarchy ([diagnostic-policy.md](../../type-specification/diagnostic-policy/), [ADR-8](../../adr/8-steep-inspired-improvements/)) | 同著者がこの問題を**早期から認識**していたことが分かる。Steep〜Rigorの長年の投資が診断UXに集中している直接の系譜。 |
| **クラス継承の "親メソッドのコピー" 実装** | Rigor / RBSのlookupチェーン | 論文の実装単純化のための妥協。RigorはRubyの真の継承探索を保ったまま解析を回せる（identity維持）。 |

## 3. 論文がRigorに示唆する具体ポイント

1. **「型変数が万単位に爆発する」現象の証拠**として、本論文の`list.rb`
   結果（束縛型変数57,479個）は引用価値が高い。Rigorが**構造的多相
   レコードを採用しなかった選択**の正当化材料として、
   [ADR-1](../../adr/1-types/)もしくは[ADR-3](../../adr/3-type-representation/)
   に脚注を入れられる。

2. **ADR-5ロバストネス原則の対照例**として、本論文の「負位置は
   シグネチャのみ・正位置は実装も含める」設計は、**同じ "非対称性を
   入れる" という方針の別解**である。Rigorが選んだ方向と論文の方向の
   対比を、[ADR-5](../../adr/5-robustness-principle/)または
   [`docs/type-specification/robustness-principle.md`](../../type-specification/robustness-principle/)
   の "Why this asymmetry, not the other" 節として整理する余地がある。

3. **`as(klass)`キャストとRigorの`%a{rigor:v1:assert_type}`の系譜的
   近さ**は、RigorのRBS-extendedアノテーション設計の正当化材料。
   同じ著者が12年隔てて同じ結論に達している事実は、設計選択の頑健性を
   示す。

4. **多相再帰の手動展開アプローチ**はRigorのsig-gen
   （[ADR-14](../../adr/14-rbs-sig-generation/)）のスコープ判断に示唆を
   与える：完全自動な多相再帰解析を狙うのではなく、**公称ジェネリクス
   の宣言コストを開発者に払ってもらう代わりに、推論側はその宣言を絶対視
   する**というRigorの戦略は、本論文が機械的な解として持ち込んだ
   「クラス複製展開」を**人間（ライブラリ作者）に肩代わりさせている**
   構造として理解できる。

5. **健全性証明の戦略的不在**が、同著者の2008 → 2010 → Steep → 現在
   という流れの中で**一貫した工学的判断**であることを本論文が裏付ける。
   Rigorが同じ判断を継承しているのは正統な路線にあり、独自に弁護する
   必要はない。

6. **Steepへの系譜の起点**として、本論文 → CFA論文 → Steep → RBSと
   いう流れの第一段がここにある。RBSの表現力(公称ジェネリクス・
   varargs・block引数・多相メソッド)は、すべて**本論文がML+カインド
   では表現できなくて困った場所**に対応している。RBSの設計理由を
   読み解くための「失敗ケース集」として価値が高い。

## 4. まとめ

論文は、RubyをML流の構造的多相レコード型で型付けする試みが、
**多相再帰・多相メソッド・varargs・健全性・型表記サイズ**という五つの壁
に同時にぶつかることを実証的に示した。Rigorは同じ著者の系譜の延長線上
にあるが、これらの壁を**RBSという別の選択肢** (公称型優位 + 宣言主義
+ pluginによる拡張 + 部分構造のinterface)で迂回している。本論文は、
Rigorが**なぜGarrigue風の構造的型推論を採らないか・なぜRBS互換を
最優先するか・なぜ完全健全性を狙わないか**という設計判断の**歴史的な
妥当性検証**として読める一級の資料である。特に[ADR-1](../../adr/1-types/),
[ADR-5](../../adr/5-robustness-principle/),
[ADR-14](../../adr/14-rbs-sig-generation/),そしてRBS-extended
アノテーション仕様の**背景文献として明示引用するのに最適**。

## 関連ADR / 仕様

- [ADR-0: Concept](../../adr/0-concept/)
- [ADR-1: Type Model and RBS Superset Strategy](../../adr/1-types/)
- [ADR-3: Internal Type Representation](../../adr/3-type-representation/)
- [ADR-5: Robustness Principle](../../adr/5-robustness-principle/)
- [ADR-8: Steep-Inspired Improvements](../../adr/8-steep-inspired-improvements/)
- [ADR-14: RBS Signature Generation](../../adr/14-rbs-sig-generation/)
- [RBS::Extendedアノテーション仕様](../../type-specification/rbs-extended/)
- [Robustness Principle仕様](../../type-specification/robustness-principle/)

## 姉妹ノート

- [Matsumoto & Minamide 2010 (Ruby CFA) Rigor観点考察](../20260518-matsumoto-2010-cfa-rigor-review/)
  — 同著者の2010年論文（本論文の続編に当たるCFA論文）のRigor
  観点レビュー。
