---
title: "Ren et al. 2013「The Ruby Type Checker (rtc)」— Rigor 観点考察"
description: "Imported from rigortype/rigor docs/notes/20260712-ren-2013-ruby-type-checker-rigor-review.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260712-ren-2013-ruby-type-checker-rigor-review.md"
sourcePath: "docs/notes/20260712-ren-2013-ruby-type-checker-rigor-review.md"
sourceSha: "c92df76aca26d26d0f17439ab1b2b3e70d16b4c5f86f6054d4f48a16adc64dc7"
sourceCommit: "c6b91b9ed767a5fb70204890947e31fa87e53e68"
sourceDate: "2026-07-12T23:14:14+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266712
---

**Status:** research note, no design commitments. 外部文献のRigor観点レビュー。
**Date:** 2026-07-12。
**Rigor version:** master @ `138bf2c4`（v0.2.9リリース直後）に対する観察。

## 対象論文

- Brianna M. Ren, John Toman, T. Stephen Strickland, Jeffrey S. Foster
  **"The Ruby Type Checker"**
  Proc. 28th ACM Symposium on Applied Computing (SAC '13), pp. 1565–1572,
  Coimbra, Portugal, March 2013. ACM 978-1-4503-1656-9/13/03.
  （University of Maryland, College Park。配布URLのファイル名は`oops13.pdf`だが
  奥付の刊行はSAC'13。）
- 一次資料URL: <https://www.cs.tufts.edu/~jfoster/papers/oops13.pdf>

**Why:** rtcはRigorと**同じゴール（Rubyに型安全性を、動いているコードを壊さずに）**を
掲げながら、機構が正反対の設計点にある — Rigorが「静的・推論優先・注釈不要」なのに対し、
rtcは「実行時・注釈をルートとする検査・pay-for-what-you-use」。この対極を突き合わせて
(a) Rigorの設計判断がどの軸で意図的に分岐しているかの確認、（b）rtcが「実行時なので自然に解ける」
としている難所（eval / method_missing / reflection）がRigorでは何の代償で近似されているかの棚卸し、
（c）両者が独立に同じ実バグ形（`false`/`nil`の戻りアーム）へ収束している事実の記録、を行う。
本論文はFoster研のDRuby → Rubydust → **rtc** → （後の）RDLという米国側Ruby型付け系譜の中核であり、
[Matsumoto & Minamide 2010（Steep前史）](../20260518-matsumoto-2010-cfa-rigor-review/)の日本側系譜と対になる
継続ベンチマークとして価値がある。

**読み順.** §1がrtcのサーフェス棚卸し、§2が型言語の対応、§3が設計判断の分岐（最重要）、
§4がRigorに効く具体示唆、§5が系譜とベンチマークとしての位置づけ。

---

## 1. rtc側のサーフェス棚卸し

1. **実行時型検査 — ただしメソッド入口／出口で**。 rtcはRubyライブラリとして実装され、
   型検査は実行時に走る。だが「純粋な動的型付けより早く（メソッドentry/exitで）、
   純粋な静的型付けより遅く」という**中間点**に自らを置く。静的検査が苦手な高度に動的な機能
   （eval・reflective method invocation）を実行時ゆえ自然に扱える、というのが売り。

2. **"pay for what you use" — 注釈をルートとする検査**。注釈のないプログラムは通常どおり走る。
   オブジェクトは**raw（未型付け）**と**annotated（型付き）**に分割され、
   **型検査はannotated値がレシーバになったときだけ**発火する。注釈はプログラマが明示するか、
   型検査対象の呼び出しへ引数として渡された値に暗黙に付与される。

3. **注釈DSL（クラス・メソッド・オブジェクトに付与）**。
   - `rtc_annotated` — クラスを注釈対象に。
   - `typesig "personnel_id : () -> Fixnum"` — メソッド型を**文字列**で宣言。
   - `rtc_annotate` — 値に型を載せたannotated版を作る（安全なupcastのみ）。
   - `rtc_cast` — union型などでdowncastしたいとき用の別メソッド（castは概念的にupcastと異なるので分離）。
   - `rtc_instantiate` — 型パラメータを明示的に具体化。
   - `rtc_autowrap` — クラスの全インスタンスを自動annotate（非パラメータ化クラスのみ）。

4. **型システムの表現力**。 nominal型／**union**（`Manager or %false`）／**intersection**（同一メソッドへ
   複数`typesig`を書くと交差＝オーバーロード相当）／**block（高階メソッド）型**
   （`() { (String) -> %any } -> String`）／**パラメトリック多相**（`Array<t>`, `map<u>: () {(t) -> u} -> Array<u>`）／
   **type cast**／**Tuple型**（`Tuple<t1,…,tn>`、i番目がti）／型エイリアス（`%true`, `%bool`, `%any`, `%false`）。

5. **プロキシによる実装**。 annotatedオブジェクトは`method_missing`を持つ**Proxy**で包まれ、
   呼び出しを横取りしてentry/exitで型検査し、下層オブジェクトへdelegate、引数と戻り値もannotateする。
   Proxy実装の細部: `self`上のプロキシ追跡（Proxyスタック）、nativeメソッドがProxyを嫌う問題への
   `:unwrap => [0]`（呼び出し前にプロキシを剥がす引数位置指定）、`false`/`nil`は包まない
   （boolean比較を横取りできないため）、`define_method`より`eval`生成メソッドの方が呼び出しが速い、等。

6. **non-strictモード（既定）**。 raw配列をannotateする際、`Array`のような容器では要素型まで検査すると
   反復コストが高い。既定のnon-strictでは**型コンストラクタ（容器の種類）だけ**を照合し、
   型パラメータ（要素型）は検査しない。`$RTC_STRICT = true`で厳格モード（要素も反復検査）に切り替え。
   非厳格でも「格納値を**使った**時点」で誤りは捕まる。

7. **評価.**被験プログラム = Sudoku / Ascii85 / ministat / finitefield / hebruby / set / RDS
   （SinglyLinkedList等）＋ 組込Array/Hash/Set。最初の5本はRubydustベンチ由来。
   相対オーバーヘッドは大きい（Sudoku 0.04s → 非厳格5.34s → 厳格7.58s、method横取りコストが主因）が
   絶対時間ではテストは速い。本番は`RTC_DISABLED`で無効化可。使用頻度は被験プログラムでunion / 多相が最多、
   標準ライブラリでintersection / block型が最多、tupleと`rtc_cast`はごく稀。**実バグを1件検出**
   （Sudokuの`search`が解なし時に`false`を返すが`string_solution`は妥当解を仮定 → 注釈不整合で発火）。

---

## 2. 型言語の対応（rtc ↔ Rigor）

| rtcの型構成子 | Rigor側の対応物 | 所見 |
| --- | --- | --- |
| nominal型 | Nominalキャリア（RBSスーパーセット） | 直対応。 |
| union（`A or B`） | Union（[value-lattice.md](../../type-specification/value-lattice/)） | 直対応。rtcは「正規union、disjoint unionではない」と明記 — Rigorのunionと同義。 |
| intersection（複数`typesig`） | メソッドオーバーロード（RBS overload） | rtcは同名メソッドへ複数`typesig`を書き、交差＝全注釈を満たす、と定義。Rigorのオーバーロード解決（`OverloadSelector`）と同型。 |
| block（高階）型 | block型（[structural-interfaces](../../type-specification/structural-interfaces-and-object-shapes/), [ADR-16](../../adr/16-macro-expansion/) Tier A） | 直対応。rtcの`() { (String) -> %any } -> String`はRigorのblock型注釈にそのまま写る。 |
| パラメトリック多相（`Array<t>`, `map<u>`） | ジェネリクス＋軽量HKT（[ADR-20](../../adr/20-lightweight-hkt/)） | 対応。rtcは`map`の`u`を「ブロック初回呼び出し結果から推論、未呼出なら`%none`＝bot」とする — Rigorのblock戻り推論と同じ着想。 |
| Tuple型（`Tuple<t1,…,tn>`） | Tupleキャリア＋Data/Struct member shape（[ADR-48](../../adr/48-data-struct-value-folding/)） | 対応。rtcは「配列を均質コレクションと固定長タプルの両用途で使う」ことをTupleで区別 — RigorのTuple/HashShape分離と同じ動機。rtcはDRubyと違い「Tuple用メソッドが使われている間はTuple、非Tupleメソッドが来たらArrayに昇格」と明言。 |
| type alias（`%true`/`%bool`/`%any`/`%false`） | special types（[special-types.md](../../type-specification/special-types/)） | `%any` = untyped = **Rigorの`Dynamic[top]`**。`%false`/`%true`/`%bool`はRigorの`false`/`true`/`bool`リテラル・boolishに対応。`%none` = bot。ほぼ一対一。 |
| `rtc_cast`（実行時downcast） | assertion注釈（[rbs-extended.md](../../type-specification/rbs-extended/)の`rigor:v1:assertion`） | 概念対応。rtcは実行時に値をテストしてから型を貼り替える。Rigorは静的にnarrowingで同じ効果を得るか、明示assertionを書く。 |
| union/intersectionの**曖昧性禁止** | オーバーロード解決の一意性（value-pinning／consistency） | rtcは型変数束縛が曖昧になるunion/intersectionを**注釈時に禁止**し、曖昧なメソッド呼び出しでerror。Rigorは**検査時に**整合性で解く。同じ難所への対処時点が違う（§3-4）。 |

型言語の表現力はほぼ等価で、rtcの文字列DSLはRigorが上位互換とするRBS/RDL系譜の直系前身
（rtc → RDLの注釈文字列は本論文の`typesig`がルーツ）。

---

## 3. 異なる設計判断（最重要）

1. **静的vs実行時 — 設計空間の対極**。
   rtcは実行時にメソッド境界で検査する。含意: (a) **観測された実行パスしか守らない**
   （走らなかった分岐・メタプロされたメソッドは無検査）、（b）プロキシ横取りの**実行時オーバーヘッド**、
   （c）反面eval/reflection/`method_missing`を**自然に**扱える。
   Rigorは静的・注釈不要・実行時コストゼロで**全パス**を守るが、動的機能を静的近似する代償を払う。
   **ゴール（低FPのRuby型安全）は同一、機構は正反対** — [Elixirレビュー](../20260604-elixir-v1.20-type-system-rigor-review/)で見た
   「同ゴール・逆機構」構図の、実行時側の実例。

2. **動的機能の扱いが交換されている（Rigorの最大の難所をrtcは実行時で回避）**。
   rtcは関連研究比較で「実行時に動くのでrealizableな実行パスだけを観測し、
   eval・reflective method invocation・`method_missing`を伴う動的機能の存在下でも容易に動く」と明言する。
   これはまさにRigorが静的に苦闘してきた領域そのもの — `pre_eval`（[ADR-17](../../adr/17-monkey-patch-pre-evaluation/)）、
   マクロ展開基盤（[ADR-16](../../adr/16-macro-expansion/)）、implicit-self呼び出し解決（[ADR-24](../../adr/24-self-method-call-resolution/)/[ADR-57](../../adr/57-self-call-return-adoption/)）、
   そして`Dynamic[T]` provenanceの全アーク（[ADR-75](../../adr/75-dynamic-provenance/)/[ADR-82](../../adr/82-dynamic-origin-algebra/)）。
   rtcはこれらを「実行時に払う」ことで**構造的に消している**。Rigorは「静的近似＋プラグイン脱出口」で払う。
   **これは根本トレードで追従不可 — 記録のみ**。ただし裏を返せば、rtcが守れない
   「走らなかったパス／未起動のメタプロメソッド」こそRigorが静的に守れる領域であり、優位も対称に存在する。

3. **推論vs検査（Rubydustとの対比がRigorに効く）**。
   本論文は自らをRubydust（An et al., POPL 2011 — 制約ベース型**推論**）と対置し、rtcは型**検査**だと言う。
   Rigorは推論優先（DRuby/Rubydust側の系譜）**かつ**静的**かつ**低FP、という第三の点にいる。
   rtcが検査を選んだ理由 — (a) Rubyフロントエンドの保守を避ける、（b）動的機能を扱う、
   （c）エラーを**発生と同時に**報告（Rubydustは制約を末尾で解くため報告が分かりにくい）— のうち
   （c）はRigorも「検査時に発生源つきで即報告」で満たすが、（a）（b）はRigorが**あえて逆を選んだ**
   （フルフロントエンドと静的近似のコストを引き受けて全パス保護とゼロ実行時コストを得る）。

4. **union/intersection曖昧性の対処時点**。
   rtcは型変数束縛が曖昧になるunion/intersectionを**注釈時に構文で禁止**し、
   曖昧なメソッドが呼ばれたら実行時errorにする（`m1<t,u>: (t or u) -> ...`はt/uが同位置に現れ曖昧、等）。
   Rigorは同じ曖昧性を**検査時のオーバーロード解決**（value-pinning・gradual consistency）で解く。
   Rigorの方が「禁止せず解く」ぶん表現力に寛容だが、解けない曖昧を静かに`Dynamic`へ落とす危険もある。
   rtcの「曖昧は明示エラー」は、Rigorのオーバーロード解決が沈黙でDynamic化する箇所のprovenanceを
   **`framework_dsl_boundary`ではなく`analyzer-budget-cutoff`系で明示する**設計判断の参考になる。

5. **容器検査コストのnon-strict/strict二値モード**。
   rtcは「容器の要素型まで見ると反復が高い」をnon-strict（コンストラクタのみ）/strict（要素も）の
   **グローバルモードフラグ**で解決する。Rigorは同じコスト問題を**per-carrierの予算**
   （[ADR-41 inference budgets](../../adr/41-inference-budget-design/)、[inference-budgets.md](../../type-specification/inference-budgets/)）と
   shape-carrierの要素型join（[ADR-56](../../adr/56-block-captured-local-mutation/) slice C、ADR-48 member layout）で解く。
   rtcの二値フラグは粗いが「容器か中身か」という軸の存在自体は共通の本質。Rigorの予算制は
   「容器の種類は常に無料・中身はfuelが尽きたらDynamic」という連続版と読める。

---

## 4. Rigorに効く具体示唆

1. **`false`/`nil`戻りアームが両システムで最高価値の実バグ形（独立収束）**。 ✅ Rigorは既に着手済み。
   rtcの唯一の実バグ検出も、注釈反復で見つけた「最も多い誤り」も、いずれも
   **「メソッドが時々`false`を返す」エッジケースの取りこぼし**と**「intersectionのアームを1本忘れる」**だった。
   これはRigorのunion-arm predicate polarity（[ADR-57 WD3](../../adr/57-self-call-return-adoption/)、
   [union-arm-predicate-polarityノート](../20260710-union-arm-predicate-polarity/)）とpossible-nil系
   （[ADR-58](../../adr/58-ivar-field-typing/)）が狙う領域そのもの。**独立した二つのRuby型システムが
   「money bugは`false`/`nil`の戻りアーム」に収束した**事実は、Rigorがここへ投じてきた工数の妥当性を外部から裏書きする。
   追加アクション不要だが、Rigorのdiagnostic例集・ハンドブックに「rtcも同じ結論」を引く価値はある。

2. **rtcは「型注釈をtest-protectionに変換する装置」— ADR-70のtest-protected軸のデータ点**。
   rtcの本質は「注釈が実行時アサーションになり、テストスイートにexerciseされる」こと。
   これは融合保護（[ADR-70](../../adr/70-fused-protection-coverage/)）の**test-protected軸を、
   ただのテストではなく型契約で実現した形**にほかならない。含意:
   - rtcの「保護」はテストカバレッジで上限が決まる（走らないパスは無保護）— ADR-70が
     「test-protectionはスイートの仕事、依存グラフで選んではいけない」とした理由と同じ構造。
   - Rigorのtype-protection（静的・全パス・推論精度で上限）とrtc型のruntime-protectionは**相補**。
     ADR-70のattribution（「型を足せ」vs「テストを足せ」）に、rtcは
     「注釈をruntime契約化すればテストが型をexerciseする」という**第三の中間手**を示唆する。
   記録価値: ADR-70のフレーミングが「静的型 ∪ 走るテスト」だったところに、rtcは
   「静的型 ∪ **型契約化された**走るテスト」という中間層が存在することを歴史的に実証している。

3. **`%any`=Dynamicの位置づけとprovenance**。
   rtcの`%any`は「ブロックが何を返してもよい」を表す明示的untypedで、非厳格モードやnative境界で頻出する。
   Rigorの`Dynamic[T]`と役割は同じだが、Rigorはprovenance（[ADR-75](../../adr/75-dynamic-provenance/)/[ADR-82](../../adr/82-dynamic-origin-algebra/)）で
   「なぜDynamicか」を追う。rtcは追わない（実行時なので不要）。逆に言えば**Rigorのprovenanceアークは
   「静的だからこそ必要になったメタデータ」**であり、rtcとの対比はその存在理由を鮮明にする
   — 実行時チェッカはDynamicの由来を知る必要がない（値が来た時点で実物を見る）。

4. **`rtc_cast` / assertionの稀少性は「注釈は書きたくない」の裏書き**。
   rtcの評価でtuple型と`rtc_cast`は「ごく稀」だった。cast（＝人が型を手で貼り替える操作）が
   実プログラムで滅多に要らないという観測は、Rigorの「手書きRBSより`sig-gen`・推論精度」志向
   （`feedback_no_ai_generated_rbs`）と同じ方向の外部証拠。人はnarrowingを書きたがらない → 推論・narrowingで自動的に効かせよ。

---

## 5. 系譜とベンチマークとしての位置づけ

- **Foster研のRuby型付け系譜の中核**。 DRuby（Furr, An, Foster, Hicks — "Static Type Inference for Ruby",
  OOPS'09。静的・制約ベース推論）→ Rubydust（POPL 2011。動的・実行時制約収集、末尾で解く）→
  **rtc（本論文、SAC'13。実行時検査、注釈をルート）** → （後の）RDL。
  RigorはDRubyの「推論で型を立ち上げる」ゴールを継ぎつつ、Rubydust/rtcが実行時に逃した
  「静的・全パス・ゼロ実行時コスト」を取りに行った設計と読める。rtcの`typesig`文字列DSLは
  RDLを経て現在のRBS/Sorbet期の型注釈文化の一源流であり、RigorがRBS上位互換を選んだ判断の下流にある。

- **日本側系譜（Steep前史）との対**。既存の[Matsumoto & Minamide 2010（Ruby CFA）ノート](../20260518-matsumoto-2010-cfa-rigor-review/)が
  Steepの前史（method configurationのsemi-flow-sensitive CFA）を扱ったのに対し、本ノートは
  米国Foster研の系譜を扱う。**両系譜とも最終的に「RBS＋実用チェッカ」へ収束**し、Rigorはその合流点の下流にいる。
  method configuration（誰が見えるか＝フローセンシティブ）とrtc（実行時に実物を見る）は、
  「動的ディスパッチの可視性をどう確定するか」という同一問題への静的／実行時の二解答であり、
  Rigorのdispatcher階層＋`pre_eval`はその**静的近似**という位置づけが両ノートを合わせると明瞭になる。

- **継続ベンチマークとしての再訪契機.** rtc単体は2013年で古く追随項目はないが、
  Foster研系（RDLとその後継、runtime-contract × 型推論のハイブリッド）が新作を出したら、
  ADR-70融合保護の「型契約をruntime化してtest-protectionにする」中間手の実装例として再ベンチする価値がある。

---

## 6. まとめ

rtcはRigorと**同じゴール（動くコードを壊さないRuby型安全）を正反対の機構で追った**
実行時型チェッカである。最大の含意は二つ。

1. **動的機能（eval/method_missing/reflection）をrtcは実行時で構造的に消し、Rigorは静的近似＋プラグインで払う**
   — これは根本トレードで、Rigorの`Dynamic` provenanceアーク・`pre_eval`・マクロ基盤・self-call解決の
   すべてが「静的を選んだ代償」であることを外から照らす（追従せず記録）。対称に、rtcが守れない
   未実行パス・未起動メタプロメソッドはRigorの静的優位領域。

2. **二つの独立したRuby型システムが「`false`/`nil`の戻りアーム取りこぼし」を最高価値の実バグ形として収束させた**
   — Rigorのunion-arm polarity（ADR-57）・possible-nil（ADR-58）への投資は業界前線と一致している。
   加えてrtcは「型注釈をtest-protectionに変換する装置」として、融合保護（ADR-70）の
   test-protected軸に**型契約化という中間手**が存在することを歴史的に実証しており、これは記録価値が高い。

型言語（union/intersection/block/多相/tuple/alias）はほぼ等価で、rtcの`typesig`文字列は
Rigorが上位互換とするRBS/RDL注釈文化の直系前身。本ノートは設計コミットを持たないが、
ADR-70のattribution説明とハンドブックのdiagnostic例集に「rtcも同じ結論／同じ実バグ形」を
引く小改善余地を残す。

## 関連ADR / 仕様

- [ADR-16: Macro / DSL Expansion Substrate](../../adr/16-macro-expansion/)
- [ADR-17: Monkey-Patch Pre-Evaluation](../../adr/17-monkey-patch-pre-evaluation/)
- [ADR-41: Inference Budget Design](../../adr/41-inference-budget-design/)
- [ADR-48: Data / Struct Value Folding](../../adr/48-data-struct-value-folding/)
- [ADR-57: Self-Call Return Adoption（union-arm polarity）](../../adr/57-self-call-return-adoption/)
- [ADR-58: Instance-Variable Field Typing](../../adr/58-ivar-field-typing/)
- [ADR-70: Fused Static∪Dynamic Protection Coverage](../../adr/70-fused-protection-coverage/)
- [ADR-75: Dynamic[T] Provenance](../../adr/75-dynamic-provenance/)
- [Special Types仕様](../../type-specification/special-types/)
- [Value Lattice仕様](../../type-specification/value-lattice/)
- [Control Flow Analysis仕様](../../type-specification/control-flow-analysis/)

## 姉妹ノート

- [Matsumoto & Minamide 2010 (Ruby CFA) — Rigor観点考察](../20260518-matsumoto-2010-cfa-rigor-review/)
  — 日本側のSteep前史。本ノート（米国Foster研系譜）と対をなす。
- [Elixir v1.20の漸進的集合論型システム — Rigor観点考察](../20260604-elixir-v1.20-type-system-rigor-review/)
  — 「同ゴール・逆機構（健全vs非健全）」構図の別実例。
