---
title: "ループの`break`パスにおける束縛の伝播 — FPの発見＋修正設計"
description: "rigortype/rigor docs/notes/20260615-loop-break-binding-propagation-design.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260615-loop-break-binding-propagation-design.md"
sourcePath: "docs/notes/20260615-loop-break-binding-propagation-design.md"
sourceSha: "d22bea214234253fff65157f867b0672e8a075ad6a6953dd552306850c17b3e9"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 20266615
---

2026-06-15。**ステータス: 2026-06-15に実装済み**——下記の「推奨アプローチ」、
すなわち`BREAK_SINK_KEY`スレッドローカルシンク＋`directly_targeting_breaks`
フィルタ＋`eval_loop`／`eval_for`の継続ジョインとして実装した。ADR-48の`Struct`
マージ（スライス1〜3）を`rigor-survey`に対してコーパス検証している最中に、ある
偽陽性（false positive）のクラスが表面化した。本ノートはその発見、診断、そして
実装が具現化する設計を記録する。ゲートは満たされた——対象の偽陽性は6つのコーパス
全体で新規発火ゼロのまま解消し、`make verify`はグリーン、回帰スペックは
`statement_evaluator_spec`に追加した。ADRへの昇格候補（ADR-56の非局所脱出における
兄弟分にあたる）。

## コーパスのコンテキスト（どう発見されたか）

ADR-48の`Struct`マージは、Structを使う8つの`rigor-survey`コーパス（kramdown、
algorithms、Algorithms-and-Data-Structures-in-Ruby、faraday、concurrent-ruby、
net-ssh、haml、jbuilder）に対するbefore/after差分（Struct導入前の`8023c337`
対`master`）で検証した。**8つすべてがバイト単位で同一**（新規／除去された発火は
ゼロ）であり、Structの精度変更はコーパス中立で、偽陽性のリグレッションは生じて
いない。この差分はまた、algorithm系コーパスに既存の偽陽性（下記）も表面化させた
（`ChekPairWithGivenSum.rb:18`、`PassingCars.rb:21`、`PassingCars1.rb:14`、そして
より広いコーパスにはおそらく他にも）。

## 偽陽性

```ruby
flag = false
for i in 0...arr.length
  if arr[i]
    flag = true
    break
  end
end
if flag            # ← `flow.always-truthy-condition`: "always falsey"  (FP)
  ...
end
```

`flag`は（`break`パスで設定されるので）`true`になりうる。したがって`if flag`は
`false | true`であり、常に偽（always falsey）ではない。「フラグを立てて`break`
する」という探索イディオムは極めて一般的なので、これは高頻度の偽陽性である。

## 診断

各ループ形態にわたって`flag`の推論型を`dump_type`で調べた。

| 形態 | `flag`の型 | 判定 |
| --- | --- | --- |
| `for` + `if … break` | `false` (Constant) | **FP**（always-falseyが発火） |
| `for` + `if`（breakなし） | `bool` | 正しい |
| `while` + `if … break` | `FalseClass` | **FP**（同様） |
| `each { … break }` | `Dynamic[top]` | FPなし（ブロックが広げる） |

つまりこれは`for`固有のものでは**ない**——`while`（`eval_loop`）と`for`
（`eval_for`）の両方で**`break`パスのバインディングが失われている**のである。
`each`ブロック形態は、キャプチャしたローカルをエスケープによって`Dynamic[top]`
に広げる（ADR-56のエスケープブロック処理）。これは真偽値として寛容なので、そこ
ではalways-Xが発火しない。

**メカニズム**。`if arr[i]; flag = true; break; end`の内側の`break`は、
`then`ブランチを*分岐脱出するもの（diverting）*にする——
`branch_unconditionally_exits?`
（[`statement_evaluator.rb:2971`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/statement_evaluator.rb)）
は`BreakNode`を認識し、`if`のジョインは分岐脱出するブランチを通常の継続から
*除外*する。これは正しい（`break`パスはフォールスルーしない）が、除外された
ブランチのスコープ（`flag = true`）は**代わりにループ出口へ到達しなければなら
ない**——そしてそこでそれを回収するものが何もない。

- 評価器には**`BreakNode`のディスパッチも、breakスコープのアキュムレータも存在
  しない**（grep: `eval_break`なし、`break_scopes`なし）。`break`は到達可能性の
  ためにのみ認識され、バインディング伝播（binding propagation）のために認識される
  ことは一度もない。
- `eval_loop`の不動点（fixpoint）は、追跡している各ローカルの*フォールスルー*
  出口を読む——`loop_body_exit_bindings`は`exit_scope.local(name)`を返し
  （[`statement_evaluator.rb:1087`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/statement_evaluator.rb)）、
  ここで`exit_scope`は本体の通常出口（`flag = false`）である。`break`パスの値は
  本体評価中に計算されたあと破棄される。
- `eval_for`（[`statement_evaluator.rb:1106`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/statement_evaluator.rb)）
  は本体を1回だけ通過させてプリループスコープとジョインするだけで、不動点を一切
  持たない。よって同じように`break`パスを失う（さらに別途、ADR-56のループ本体の
  不動点も欠いている——2つめの、より小さなギャップ）。

## 修正設計

**目標**。`break`のスコープ（そのローカルバインディング、および任意の
`break <value>`）は、`while`／`until`（`eval_loop`）と`for`（`eval_for`）の両方
について、ループの継続スコープへジョインされなければならない。

### 魅力的だが却下された近道（FP安全ではない）

*構文的な過剰近似（over-approximation）*——「ループ本体で書き込まれる各ローカル
について、本体が`break`を含むなら、代入されたすべての右辺型のユニオンをポスト
ループのバインディングへジョインする」——のほうがシンプル（breakスコープの配管
が不要）で、always-Xクラスに対しては健全である（可能性をジョインすることは定数
畳み込みを*減らす*だけ）。**だがこれは`possible-nil`に対してFP安全ではない**：
出口に決して到達しないパスからの書き込み（`x = nil; …; x = 5; break`——`x = nil`
は`break`の前に必ず上書きされる）までジョインしてしまい、`x`を、ループから実際に
は運び出せない`nil`を含むよう過剰に広げ、結果として後続の`x.foo`に偽の
`possible-nil-receiver`を製造してしまう。過剰な拡幅は*型*については健全だが、
possible-nilルールが推論する*nilの来歴（nil-provenance）*については健全でない。
よって修正は、近似ではなく各`break`時点の**実際の**スコープを回収しなければなら
ない。

### 推奨アプローチ —— breakスコープの回収＋ジョイン（精密）

1. **評価器上のbreakシンクスタック**。ループ本体に入るとき新しいシンク（各
   `break`時点での`(scope, value_type)`のアキュムレータ）をプッシュし、出るとき
   ポップする。スタックはネストしたループを扱う——`break`は最も内側の囲みループ
   （スタックの先頭）を対象とする。ループ内の*ブロック*の内側にある`break`もまた
   ループを対象とする（Rubyのセマンティクス）ので、ブロック評価はループのシンク
   をシャドウしてはならない——ただしメソッドに渡されるブロック（ループでない
   `each`）はすでに別途扱われているエスケープブロックのケースである。シンクの
   スコープはレキシカルなループ本体に限定する。
2. **`BreakNode`の評価**は`(current_scope, break_value_type)`をアクティブな
   シンクへ追記し、（現状どおり）分岐脱出の／`bot`継続を返す。値なしの`break`は
   ループ値に`nil`を寄与し、`break x`は`x`の型を寄与する。
3. **ループ出口のジョイン**。`eval_loop`／`eval_for`は、回収した各breakスコープ
   のローカルバインディングを継続スコープへジョインし（既存の通常出口スコープと
   ADR-56の不動点結果とともに）、ループの*値*は`nil`（通常完了）と各
   `break <value>`型のジョインになる（現状では`while`／`for`の値は常に
   `Constant[nil]`であり、`break x`はそれを`nil | typeof(x)`にする）。
4. **出口エッジのナローイングはbreak時にすでに無効化されている**。
   `narrow_loop_exit_edge`
   （[`statement_evaluator.rb:951`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/statement_evaluator.rb)）
   は本体が`break`を含むときすでに脱出する（述語出口の証明が成立しない）ので、
   新しいbreakジョインはこれと衝突しない。

アーキテクチャ上の選択は、シンクを*どう*通すかである：評価器インスタンスの
スタック（可変、最もシンプル、push／popのバランスと再入安全性が必須）か、
`sub_eval`の戻り値を拡張してbreakスコープを関数的に運ばせる（よりクリーンだが
あらゆる`eval_*`に波及する）か。インスタンススタックのほうが軽い変更で、エンジン
既存の`on_enter`／記録のサイドチャネルとも整合する。実装時に決定する。

### カバーすべきエッジケース

- **ネストしたループ**——`break`は最も内側を対象とする。スタックがこれを扱う。
- **ループ内の`if`／`case`／`begin`内の`break`**——シンクはネストの深さに関わら
  ず`break`時点のスコープを回収する。
- **`break <value>`**——バインディングだけでなくループ値の型に寄与する。
- **`next`／`redo`**——関連するが別件：`next`パスの書き込みもまた不動点のフォール
  スルー読み取りから脱落しうる。本ノートは`break`にスコープを限定し、`next`は
  フォローアップとして評価する（そのスコープは*次のイテレーション*に再ジョイン
  されるので、理想的には不動点がそれを畳み込むべき——別の修正）。
- **`each`ブロックの`break`**——すでに`Dynamic[top]`へ広がる。そのまま放置（FP
  なし）するか、後で統一する。

## ADR-56との関係

ADR-56（ブロックがキャプチャしたローカルの変異＋ループ本体の不動点）は、ループ
本体の書き込みの*フォールスルー*での累積（`d *= 2` → `1 | 2 | …`）を伝播する。
本件はその欠けていた兄弟分である：*非局所脱出*（`break`）パスのバインディングだ。
修正は同じ`eval_loop`継続構築の上に重なる。ADR-56の付録として記録するか、break
シンクのメカニズムが独立した論拠を要するなら新規ADRとして記録することを検討
する。

## ゲート

- 検証済みの8コーパス（＋探索ループを持つものをいくつか追加）にわたる
  **コーパスbefore/after差分**：always-Xの偽陽性（`ChekPairWithGivenSum`、
  `PassingCars`×2、…）は解消しなければならず、**新規の`possible-nil`発火はすべて
  裁定されなければならない**（真に到達可能なbreakパスのnilは正しい発火、過剰に
  拡幅されたものは精密な回収が生じさせてはならないリグレッションである）。
- `make verify`がグリーン（セルフチェック＋プラグイン。エンジンには多数の
  フラグ&breakループがあり、ライブなリグレッションガードになる）。
- 弁別力のある形態を手作業で調査：上記の4つのループ形態、ネストしたループ、
  `break <value>`、`if`／`case`内の`break`、そして`x = nil; …; x = 5; break`形態
  （偽のpossible-nilを表面化させては**ならない**——過剰近似の罠）。

## 再現

```ruby
# /tmp/probe.rb — `rigor check --no-cache` reports "always falsey" at `if flag`
def check(arr)
  flag = false
  for i in 0...arr.length
    if arr[i] then flag = true; break end
  end
  if flag then "yes" else "no" end
end
```
