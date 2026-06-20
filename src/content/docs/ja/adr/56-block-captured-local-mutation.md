---
title: "ADR-56 — ブロックがキャプチャしたローカルのライトバックとループ本体の不動点（ミューテーション効果の健全性）"
description: "rigortype/rigor docs/adr/56-block-captured-local-mutation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/56-block-captured-local-mutation.md"
sourcePath: "docs/adr/56-block-captured-local-mutation.md"
sourceSha: "e6ad702fd51c7cde230502430e6e49881b7fe1e6b241686adab6b197db8f2f20"
sourceCommit: "95ff0e09e408504d17102725823e1978301d05ef"
translationStatus: "translated"
sidebar:
  order: 4056
---

ステータス: **Accepted、2026-06-11。スライスA＋Bは2026-06-11に実装。スライスC（レシーバー内容の要素型join、WD2.5）は2026-06-12に実装**。順序はスライスA（ブロックがキャプチャしたローカルのライトバック──**着地済み**）、続いてスライスB（ループ本体の不動点による広げ──**着地済み**）。ADR-55とは違い、これらは**精度追加ではなく健全性修正**である──現在の結果は単に広いのではなく*誤っている*──ので、コーパスゲートの「新しいdiagnosticゼロ」という読みは「新しいdiagnosticはどれも裁定する」へと緩められる（WD4を参照）。

アーキタイプ: deliberative。ステークス: high（フローエンジンのコア。現在の挙動は仕様のMUSTに違反する。修正は、他のdiagnosticが消費する畳み込み定数を動かす）。

## コンテキスト

フローエンジンはすべてのブロック本体を評価する（`StatementEvaluator#evaluate_block_if_present`、`lib/rigor/inference/statement_evaluator.rb`のおよそL1583）が、**ブロックの出口スコープを破棄する**。クロージャ脱出モデル（`record_closure_escape_if_any`のおよそL1608）は、キャプチャしたローカルを`Dynamic[top]`へ広げるのは`:escaping`ブロックに対してのみだ。`:non_escaping`分類（each / times / upto / map …）は呼び出し後のスコープを**変更しないまま**にする。帰結はこうだ。

```ruby
result = 1
1.upto(6) { |i| result *= i }
result  # typed Constant[1] — runtime value is 720. UNSOUND.

e = 1
[1].each { e = 99 }
e       # typed Constant[1] — runtime value is 99. UNSOUND.
```

ブロックキャプチャの書き込み形（`=`、`+=`、`*=`、多重代入。IntegerもStringも同様）はすべて落とされる。`while`は隣接しているが別物だ: `eval_loop`（およそL811）は事前スコープと**一度**の本体パスをjoinする（`d = 1; while …; d *= 2; end` → `1 | 2`、`4, 8, …`を取りこぼす）。

仕様はすでにこれを決めている: [`control-flow-analysis.md`](../../type-specification/control-flow-analysis/)の §「Fact stability and mutation」──*「Rubyの挙動が観測対象を変異・置換・脱出させうるとき、Rigor MUSTファクト（fact）を無効化または弱める」*とあり、**キャプチャされたローカルのファクト**が第一級のカテゴリーとして名指しされている。さらに § call-timing──*「即時の非脱出呼び出し、回数不明」*が、まさにeach/uptoのケースである。実装はこのMUSTに違反している。本ADRはその追いつきであって、新しい方針ではない。`MutationWidening.widen_after_block`（レシーバーの変異、`arr << x`）とブロック内のivar書き込みはすでに処理されている──ギャップは具体的には非脱出ブロックでの**ローカルの再束縛**だ。

## 決定

> **ブロック本体（またはループ本体）が再束縛しうるキャプチャされた外側のローカルは、継続スコープにおいて呼び出し前の束縛を未変更のまま決して保持してはならない**。継続の束縛は、事前状態を、保守的に広げられた反復後状態とjoinしたものである──本体は0..N回走って累積しうるので有界不動点で計算される──そして任意の非収束は、そのローカル（だけ）を`Dynamic[top]`へデグレードさせる。これは確立済みの脱出ブロックのフロアである。

### WD1 — スライスA: 非脱出ブロックがキャプチャしたローカルのライトバック

`sub_eval(block, block_entry)`の後、ブロックの出口スコープをキャプチャする。ブロック本体が書き込む外側のローカルごとに（`captured_local_writes`のおよそL1652を拡張する──現在は`LocalVariableWriteNode`しか見ていない──`LocalVariableOperatorWriteNode`、`LocalVariableOrWriteNode`、`LocalVariableAndWriteNode`、`MultiWriteNode`配下の`LocalVariableTargetNode`へ）、継続の束縛を**有界不動点**（上限3、ADR-55の形）として計算する: 種＝呼び出し前の束縛。「現在の束縛でブロック本体を評価し、書き込まれたローカルの出口型をjoinし戻す」を反復し、許される最後の反復で値ピン留め構成要素をその名前的基底へ広げ、なお不安定ならそのローカルを`Dynamic[top]`にする。0反復のケースもカバーされる、なぜなら呼び出し前の束縛が一貫してjoin構成要素として残るからだ。書き込まれないローカルはその束縛を手つかずのまま保つ（仕様の「無関係なローカル束縛のファクトを保つ」）。`:escaping`/`:unknown`のパスは不変である（すでにDynamic）。

期待される観測値: `upto`ブロックの後の`result` → `1 | Integer`（または`Integer`）であり、決して`Constant[1]`ではない。`[1].each { e = 99 }`の後の`e` → `1 | 99`。

**2026-06-11に実装**。`StatementEvaluator#write_back_block_captures`が`eval_call`内で`record_closure_escape_if_any`の後に走り、`:non_escaping`分類でゲートされる。有界不動点は新しい共有の`Inference::BodyFixpoint`に置かれる（上限3、`evaluate_body`callableでパラメータ化されているのでスライスBがそのまま再利用する）。`captured_local_writes`は5つの書き込み形すべてを収集するようになった。`Type::Combinator.widen_value_pinned`（`ExpressionTyper`から昇格し、それは現在委譲する）は`Refined` / `IntegerRange` → 名前的基底への広げを得たので、有界intのアキュムレータが収束する。非収束の崩れは新しい`BudgetTrace::BLOCK_WRITEBACK_CAP`を計上する。ゲート: `make verify`がグリーン（新しいセルフチェック／プラグインチェックの発火なし）。コーパス（Mastodonの`app/models`、hamlの`lib`、kramdownの`lib`）＝**除去1、新しいdiagnosticゼロ**──その除去は本物の勝利だ（`form/account_batch.rb`の`each`内`error ||= e`に続く`raise error if error.present?`が、もはや誤った常に偽の定数へ畳み込まれない）。perfはニュートラル（libセルフチェックがおよそ17.8秒、ベースラインのおよそ17.5秒に対して）。

### WD2 — スライスB: ループ本体の不動点

`eval_loop`（および同等の`until`パス）は、その単一パスのjoinを、本体が書き込むローカルに対する同じ有界不動点で置き換える: joinが安定するまで、joinされたスコープから本体評価を反復する（上限3、最終反復での値ピン留めの広げ、非収束時にローカルごとの`Dynamic[top]`）。`d = 1; while …; d *= 2; end` → `1 | Integer`（現在の不健全な`1 | 2`）。述語に対するループ持ち越しのナローイングは反復ごとにjoinされたスコープから再計算されるので、既存のbreak／出口エッジの挙動は保たれる。

**2026-06-11に実装**。`StatementEvaluator#eval_loop`は歴史的な単一パスのjoinをベースとして保ち（それはなお、再束縛されないローカルのレシーバー変異の広げ、本体が導入するnil注入、そしてループ値を担う）、本体が再束縛するローカルについては`BodyFixpoint.converge`の結果をオーバーレイする。`loop_body_local_writes`は本体が書き込むローカルを、既存（種＝述語後の束縛）と本体先（種＝0反復パス向けの`nil`）に分割する。`loop_body_exit_bindings`は述語のループ入りエッジ（`while`→真、`until`→偽）を反復ごとに再適用するので、ループ持ち越しのナローイングが健全に保たれる。本体がいかなるローカルも再束縛しないループは、単一パスのjoinとバイト単位で同一のまま留まる（高速パス）。非収束（`g = [g]`）はそのローカルを`Dynamic[top]`へフロアし、`BudgetTrace::BLOCK_WRITEBACK_CAP`ヒット（スライスAと共有）を計上する。**1つの盲点が表面化し、スライス内で修正された**: `nil`を種とする本体先ローカルは本体の再評価にオーバーレイしては**ならない**──本体が走るとき使用前にそのローカルを代入するので、`nil`をフィードし戻すと、エンジンが分岐へ通さない条件形の代入を越えて`nil`が漏れ（`while …; if x > (count = 3); (count + 1)…`）、`+`/nil-レシーバーを偽発火させる。`nil`は0反復の結果のためのjoin構成要素としてのみ保持される。ゲート: `make verify`がグリーン（新しいセルフチェック／プラグインチェックの発火なし──反復ごとの述語ナローイングがすでに解消する継承された`expression_typer.rb:461-462`のセルフチェック発火を含む）。プローブが`d = 1; while …; d *= 2; end` → `Integer`（不健全な`1 | 2`だった）、`until`の同等性、本体先 → `T?`、書き込みなしループのバイト同一、累積 → `Dynamic[top]`を確認する。コーパス（Mastodonの`app/models` 5/5、hamlの`lib` 13/13がバイト同一。kramdownの`lib`は**除去2**──`until stack.empty?`内の`converter/html.rb:455`の`item = stack.pop`が、もはや誤ってnilレシーバーへ畳み込まれない──と、同一箇所での5つのメッセージ言い換え（`undefined method 'value' for nil` → `possible nil receiver`、レシーバーが純粋な`nil`ではなく`T | nil`と型付けされるため）、本物の新発火ゼロ）。

### WD2.5 — スライスC: レシーバー内容の要素型join（2026-06-12に追加）

2026-06-12のDynamic落ち調査（[`docs/notes/20260612-dynamic-fall-pattern-survey.md`](../../notes/20260612-dynamic-fall-pattern-survey/)、バケットB1/B3/B4）は、スライスA/Bのライトバックがローカルの**再束縛**はカバーするがレシーバーの**内容**変異はカバーしないことを見つけた: `out = [0]; [1, 2, 3].each { |x| out << x }`は`Array[0]`と型付けされる（ランタイムは`[0, 1, 2, 3]`）──**不健全**であり、伝播する（`out.first.zero? → true`）。既存の`MutationWidening`パスは変数を広げるが、追加された要素型をコレクションの要素パラメータにjoinすることは決してない。空でない種は種の要素しか保たない。スライスC: 非脱出ブロック本体（またはループ本体）が、キャプチャされた外側のローカルに対して内容変異メソッド（`<<`、`push`、`unshift`、`[]=`、`concat`、`merge!`、Stringの`<<`、…）を呼び出すとき、継続の要素／キー／値／内容の型は、同じ`BodyFixpoint`の上限／広げ／フロアの規律のもとで計算された、**事前状態の内容型と変異で入る型のjoin**となる（内容のフロアは`Array[Dynamic[top]]` / 素のコレクション──すでに健全な空の種の挙動だ）。`each_with_object`の戻り値は同じjoinされたmemo型を採用する（B3）。上の決定基準はすでにこれをカバーしている──「再束縛」は「再束縛または内容変異」と読める。スライスCは内容側の半分の到来である。

**2026-06-12に実装**。3つの合成する継ぎ目があり、いずれもスライスA/Bの`MutationWidening`キャリア広げヘルパーを再利用する。

1. **ブロック** — `StatementEvaluator#content_writeback_block_captures`が`eval_call`内で`MutationWidening.widen_after_block`（これはすでにリテラルのアリティを忘れるが、種の要素だけを保っていた）の後に走る。それはブロック本体を歩いて、キャプチャされた外側のローカルに対する内容変異子の呼び出し（`MutationWidening::CONTENT_ADDERS`＝Arrayの`<< push append prepend unshift concat insert []= fill replace`、Hashの`[]= store`、Stringの`<< concat prepend insert replace`）に加えてインデックス書き込み形（`h[k] ||= v`）を探し、各変異子の引数をブロック入りスコープで型付けし、追加／格納された要素／キー／値の型を、`MutationWidening.join_array_content` / `join_hash_content`を介して継続コレクションパラメータへJOINする。事前状態は`post_scope`から読まれるので、再束縛（スライスA）も内容変異もされたローカルが合成される。空の種の`Dynamic[top]`フロアは、実エビデンスが存在すれば落とされる（`out = []; arr.each { |x| out << x*2 }` → `Array[Integer | Dynamic[top]]`ではなく`Array[Integer]`）。

2. **ループ** — `eval_loop`は高速パスの単一パスjoinとスライスBの不動点結果の両方に`loop_content_writeback`をオーバーレイする。引数は不動点で広げられた`post_loop`に対して型付けされるので、追加されたループカウンタは入りの定数ではなく`Integer`と読まれる。

3. **`each_with_object`の戻り値（B3）** — `each_with_object_return`がmemoブロックパラメータの内容変異からjoinされたmemo型を計算し、それを呼び出しの戻り値として採用して、ディスパッチャーが他では生む`Dynamic[top]`を置き換える。

Stringのアキュムレータは`String`の名前的基底へ広がる（要素パラメータはない。定数値はもはや健全ではない）。ネストしたコレクションを介してHashを内容変異するインデックス書き込み（`h[k] ||= []; h[k] << v`）は値を`Dynamic[top]`へフロアするが、もはや`h`を空の`{}`のまま残さない（それは`h.empty?`を誤った`true`へ畳み込んでいた）。ゲート: `make verify`がグリーン（新しいセルフチェック／プラグインチェックの発火なし）。プローブテーブルが調査の4つの再現形すべてを確認する（`Array[0]` → `Array[0 | 1 | 2 | 3]`、`out.first.zero?`がもはや誤った`true`でない、空の種 → `Array[Integer]`、`each_with_object` → joinされたmemo、Hash構築 → `Hash[K, V]`）。コーパス（Mastodonの`app/models`はバイト同一。hamlの`lib`は**除去1**──`each`内`parser.rb:746`の`dynamic_attributes << …`に続く`dynamic_attributes == "{}"`が、もはや誤った常に偽へ畳み込まれない。kramdownの`lib`は同一箇所での1つのメッセージ言い換え（`undefined method 'strip!' for nil` → `possible nil receiver`、レシーバーが`T | nil`と型付けされるため）、本物の新発火ゼロ）。perfはニュートラル（libセルフチェックがおよそ19.9秒）。`loop_body_fixpoint`フィクスチャの`acc.push(m)`ケースは、不精密だが健全な`Array[Dynamic[top]] | []`から`Array[Integer]`へ締められた（スライスCの精度の勝利、フィクスチャと仕様を更新）。

### WD3 — 一つの機構、共有

スライスAとBは**一つ**の不動点ヘルパー（入力として本体評価器＋書き込みローカルの集合＋上限＋広げ方針）を実装するのであって、2つのコピーではない──ADR-55の手書きコピーコンストラクタの教訓（2つの沈黙したテーブルドロップのバグ）が適用される。予算上限はハードかつ設定不可である（ADR-41 WD4）。新しい`BudgetTrace`カウンタが非収束の崩れを記録する。

### WD4 — ゲート: ゼロ差分ではなく裁定

スライスごとに`make verify`＋コーパス実行（Mastodonの`app/models`、haml、jbuilder、kramdown）、加えて手でプローブした弁別形（ADR-55の教訓: バイト同一のコーパスが`bot`の健全性バグを見逃した──型ダンププローブはゲートの一部であって省略可能ではない）。修正が*誤った定数を訂正する*ため、新しいdiagnosticはありうるし、**本物**でありうる（本当にnil／より広い型を見うるコード）──新しい発火はどれも裁定される: 本物 → 残し、その発火をスライスノートに記録する。エンジンの人工物（新たに覆いが外れた盲点）→ 着地前に修正または狭める。diagnosticの*除去*は期待される勝利である（それらは潜在的な誤定数のFPだった）。perfはニュートラルに保たれなければならない: ブロック本体が上限回まで再評価されるのは、キャプチャされたローカルに書き込む場合のみだ──圧倒的多数のブロックは何も書き込まず、現在どおり1回の評価で済む。

## 却下／先送りした代替案

- **無差別な「どんなブロックもキャプチャされたローカルをDynamicへ無効化する」**。却下──仕様は「yieldがすべてを無効化する」よりcall-timingモデル化を明示的に好み、それはあらゆるコーパスのあらゆるeach/mapにわたってナローイングの精度を破壊するだろう。
- **単一パスjoin（不動点なし）、常に名前的へ広げる**。主機構としては却下──累積する形（`a = [a]`式の構造的成長）は単一パスを逃れる。Dynamicフロア付きの有界不動点は厳密に安全であり、ADR-55のパターンを再利用する。（最初の実装は同じヘルパーの反復1の本体として単一パス＋広げを着地させてMAYだが、上限／フロアは最初から存在しなければならない。）
- **`:non_escaping`ブロックを1回限り（出口スコープを直接採用）として扱う**。却下──0反復パス（`[].each`）とN反復累積に対して不健全。
- **メソッドごとの反復回数サマリー（each＝N、tap＝1、…）**。先送り──仕様のcall-timingカテゴリーはこれを誘うが、事前状態とのjoin不動点はそれらなしで健全である。サマリーは後の精度リファインメントである（例: `tap`が正確に1回として出口スコープを採用する）。

## 帰結

- `fact3`式のアキュムレータループが誤った定数を生むのをやめる──エンジンで既知の最大クラスの不健全な畳み込みであり、下流の常に真／到達可能性のdiagnosticがそれらを消費するのをやめる。
- 現在畳み込まれている一部の定数が広がる。誤った畳み込みに沈黙して依存していたdiagnosticはどれも表面化し、裁定される（WD4）。
- 実装がついに §「Fact stability and mutation」のキャプチャされたローカルのMUSTを満たす。仕様の変更は不要である。

## 他のADRとの関係

- **ADR-55** — 有界不動点＋最終広げ＋崩れのパターンと、ゲートの規律（コーパス＋弁別プローブ）を供給する。本ADRはそれを再帰戻り値から反復状態へ一般化する。
- **ADR-41** — 上限はハードな停止ガードである（WD4）。新しい崩れカウンタが`RIGOR_BUDGET_TRACE`に加わる。
- **ADR-5 / FPの規律** — 誤った定数を広げることはFPの規律として正しい方向だ。WD4の裁定は、訂正された型が正当に発火する箇所でエンベロープを誠実に保つ。
