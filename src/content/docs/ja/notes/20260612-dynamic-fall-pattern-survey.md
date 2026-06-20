---
title: "Dynamic転落パターン調査（ADR-55/56後）"
description: "rigortype/rigor docs/notes/20260612-dynamic-fall-pattern-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260612-dynamic-fall-pattern-survey.md"
sourcePath: "docs/notes/20260612-dynamic-fall-pattern-survey.md"
sourceSha: "038a7459990782e1ca8317e3ec076aa9191478d67ad924cb9d6b01f50557a2f5"
sourceCommit: "95ff0e09e408504d17102725823e1978301d05ef"
translationStatus: "translated"
sidebar:
  order: 20266612
---

2026-06-12。読み取り専用のエンジン挙動調査。**`lib/`への変更なし**。

## 手法

11個の`/tmp/probe_*.rb`ファイルにまたがる139個の`dump_type(...)`シェイプ（shape）からなるプローブコーパス（統合コピー: `/tmp/probe_consolidated.rb`）を`nix … develop --command bundle exec exe/rigor check --no-cache <file>`に通し、各シェイプの推論型を`info: dump_type:`行から読み取った。シェイプは再帰、Enumerableチェーン、アキュムレータのイディオム、数値、文字列、Hash/Array構造、制御フロー、def間の合成にまたがり、ディスパッチ経路が異なりうる箇所ではクラスメソッドとトップレベルdefのバリアントも用意した。非定数のIntegerソースには`def some_int = [1,2,3].sample`を使い、「定数引数による値ピン留め」経路を回避してエンジンの*本来の*ジェネリック能力を行使させている。ADR-55（再帰的な戻り値）とADR-56（ブロックキャプチャされた書き戻し／ループ不動点）が直近でランドしており、それらが修正したシェイプ（階乗／文字列ビルダー再帰、`reduce(:sym)`、`while`ループのアキュムレータの存在、*アキュムレータ変数*の`each`ブロック書き戻し）は動作確認済みでギャップ目録から除外している。焦点は**次に何をすべきか**である。

## サマリーテーブル

| バケット | 代表例 | 判定 | 半径 | 難易度 |
| --- | --- | --- | --- | --- |
| **B1. ブロック／ループ書き戻しでの`<<`/`push`要素型ドロップ** | `out=[0]; [1,2,3].each{\|x\| out<<x}; out` → `Array[0]`（実際は`[0,1,2,3]`） | **WRONG（unsound）** | 非常に高い | mechanism |
| B2. トップレベル／クラスメソッドの非定数パラメータ → Dynamic | `def double(x)=x*2; double(some_int)` → `Dynamic[top]` | DYNAMIC | 非常に高い | mechanism |
| B3. `each_with_object`の戻り値が変更済みメモを採用しない | `arr.each_with_object([]){…}` → `Dynamic[top]` | DYNAMIC | 高い | mechanism |
| B4. ブロック／ループで構築したコレクションの要素型が失われる | `out=[]; arr.each{\|x\| out<<x*2}; out` → `Array[Dynamic[top]]` | IMPRECISE-SOUND | 高い | mechanism |
| B5. `Array#to_h { block }`のペア型が失われる | `[1,2,3].to_h{\|x\| [x,x*2]}` → `Hash[Dynamic[top],Dynamic[top]]` | IMPRECISE-SOUND | 中 | catalog/mechanism |
| B6. `flatten`の要素型が失われる | `[[1,2],[3,4]].flatten` → `Array[Dynamic[top]]` | IMPRECISE-SOUND | 中 | catalog |
| B7. ラムダ／procの本体引数が値ピン留めされない | `->(x){x*x}.call(3)` → `Dynamic[top]` | DYNAMIC | 中 | mechanism |
| B8. `case/in`のデコンストラクト束縛 → Dynamic | `case x in [a,b] then a+b` — `a` → `Dynamic[top]` | IMPRECISE-SOUND | 中 | mechanism |
| B9. `Hash.new(default/&block)`の読み取り → bare/Dynamic | `Hash.new(0)` → `Hash`; `Hash.new{…}; h[k]` → `Dynamic[top]` | IMPRECISE-SOUND | 中 | catalog |
| B10. 複数呼び出し／構築／相互再帰 → Dynamic | `fib(n)` → `1 \| Dynamic[top]`; `tree_sum`, `srev`, `even?` → `Dynamic[top]` | IMPRECISE/DYNAMIC | 低〜中 | mechanism |
| B11. `chunk_while.to_a`／遅延enumeratorチェーン | `arr.chunk_while{…}.to_a` → `Array[Dynamic[top]]` | IMPRECISE-SOUND | 低 | catalog |

これ以外にプローブしたものはすべて**PRECISE**か、値の損失のみを伴う許容範囲のIMPRECISE-SOUNDである（例: `split.join` → `literal-string`、`gsub`ブロック付き → `String`、`rescue`値結合`5?`、`merge`ブロック形式、`dig`、デフォルト／ブロック付き`fetch`、デストラクチャリング`a,b = [1,"x"]`、`transform_values`、`then`/`tap`、`divmod`、ビット演算、`step`/`fdiv`のユニオン）。定数タプル上の`find`は定数畳み込みされた発見要素（`nil` / `2`）を返す ── これは**sound**であり、要素ごとのブロック評価であってnilドロップのバグではない。

## バケット別詳細

### B1 — 書き戻しでの`<<` / `push`要素ドロップ（UNSOUND ── 最優先）

ADR-56のスライスAはアキュムレータ*変数*をブロック／ループ書き戻しで生き残らせるようにしたが、追加された要素の型は**配列の要素パラメータに結合されない**。空でないシードの場合、結果はunsoundな過小近似になる:

```ruby
def b1
  out = [0]
  [1,2,3].each { |x| out << x }   # really becomes [0,1,2,3]
  out
end
dump_type(b1)            # Array[0]      <-- WRONG (should be Array[0|1|2|3])
dump_type(b1.first)      # 0             <-- WRONG
x = b1.first
dump_type(x.zero?)       # true          <-- concrete wrong fold
```

`x.zero? → true`はハードな誤った定数畳み込みである。実行時には`x`は`0|1|2|3`の範囲をとる。下流の`if x.zero?` / `x == 0`は誤って解析される（偽の`always-truthy`、ADR-47の下でのデッド節リスク）。*空の*シード（`out=[]`）の場合、このドロップは代わりにsoundな`Array[Dynamic[top]]`（B4）へ劣化する ── つまりunsoundさは、空でないシード経路がシード要素型のみを保持し追加された要素型を無視するという点に特有である。アンカー: ADR-56の書き戻し経路（`lib/rigor/inference/...`のブロックキャプチャされたローカルの変更）は束縛を広げるが、`<<`/`push`の引数型をレシーバー配列の要素にユニオン結合しない。**修正はprecision-additiveではない** ── unsoundな結果を取り除くものなので、widen-to-Dynamicのショートカットではなく結合と共にランドさせなければならない（とはいえ、追加書き込みがあったらシード配列を`Array[Dynamic[top]]`へ広げるのは安価な*sound*なストップギャップである）。

### B2 — 非定数パラメータ → Dynamic（最大半径のギャップ）

```ruby
def double(x) = x * 2
dump_type(double(some_int))        # Dynamic[top]
def trip(x) = x * 3
dump_type(trip(4))                 # 12   <-- constant arg DOES pin
class Calc; def self.double(x)=x*2; end
dump_type(Calc.double(some_int))   # Dynamic[top]   (class method no better)
def greet(name:, greeting:"hi")="#{greeting} #{name}"
dump_type(greet(name:"x"))         # Dynamic[top]   (kwargs too)
```

定数リテラル引数は値ピン留めされる（`trip(4)→12`）が、非定数引数はパラメータを`Dynamic[top]`のまま残し、本体全体を汚染する。これは実Rubyで最も一般的なシェイプである（計算値で呼ばれるあらゆるヘルパー）。ADR-24の採用ゲートの領域だ。本体は解析*される*が、`Dynamic`パラメータで解析される。シグネチャ推論／呼び出しごとの引数型採用パス（局所的な文脈的型付けの要領で、*実際の*呼び出し箇所の引数型に対して本体を解析する）がそのメカニズムである。本調査で最大のブラスト半径を持ち、単一項目としては最も困難。

### B3 — `each_with_object`の戻り値ドロップ

```ruby
arr.each_with_object({}) { |x, h| h[x] = x*2 }   # Dynamic[top]
arr.each_with_object([]) { |x, acc| acc << x*2 } # Dynamic[top]
```

`iterator_dispatch.rb:130 each_with_object_block_params`はメモを*ブロックパラメータ*に通すが、ディスパッチは（変更済みの）メモ型ではなく`Dynamic[top]`を返す。これは「1つの式でハッシュを構築する」正準的イディオムであり、半径は非常に高い。メモの*エントリー*型（`{}`→`Hash[…]`、`[]`→`Array[…]`）を変更せず返すだけでも`Dynamic`に勝る。完全な精度にはB1/B4と同じ要素／ペア結合が必要。

### B4 — ブロック／ループで構築したコレクションの要素型（sound、高半径）

```ruby
out=[]; [1,2,3].each { |x| out << x*2 }; out   # Array[Dynamic[top]]
def countdown(n); acc=[]; while n>0; acc<<n; n-=1; end; acc; end
dump_type(countdown(some_int))                 # Array[Dynamic[top]] | []
```

空シード側から見たB1/B3の兄弟 ── soundだが要素ブラインドである。ループの*存在*は動作する（ADR-56）が、要素型は`Dynamic`になる。修正レバーはB1と同じ（追加型を要素パラメータに結合する）。B1をsoundにランドさせればこれを大方包含するはずである。

### B5 — `Array#to_h { block }`

```ruby
[1,2,3].to_h { |x| [x, x*2] }        # Hash[Dynamic[top], Dynamic[top]]
arr.to_h { |x| [x, x*2] }            # Hash[Dynamic[top], Dynamic[top]]
```

`shape_dispatch.rb:87`は*タプル*レシーバー（`tuple_to_h`）とData上でのみ`to_h`を畳み込む。ペアを生成するブロック付きの`Array#to_h`には畳み込みがないため、RBSジェネリックにヒットし、ブロックの`[K,V]`戻り値が代入されない。中半径（設定／ルックアップテーブルの構築）。

### B6 — `flatten`

```ruby
[[1,2],[3,4]].flatten     # Array[Dynamic[top]]   (ideal [1,2,3,4])
[1,[2,[3]]].flatten       # Array[Dynamic[top]]
[[1,2],[3,4]].flatten(1)  # Array[Dynamic[top]]
```

`flatten`（非bang）にはタプル／シェイプ畳み込みがない ── `array_catalog.rb:23`は`flatten!`のみを挙げている。リテラルのリテラルの一段flattenですらすべてを失う。純粋なカタログ／シェイプのギャップ。タプルのタプルなら結果は正確に計算可能である。

### B7 — ラムダ／procの引数が値ピン留めされない

```ruby
->(x) { x*x }.call(3)            # Dynamic[top]   (def trip(3) would pin)
sq = ->(x){x*x}; sq.call(3)      # Dynamic[top]
proc { |x| x+1 }.call(3)         # Dynamic[top]
```

B2とは別物。`def`は*定数*引数を値ピン留めする（`trip(4)→12`）が、ラムダ／procの本体は定数であっても値ピン留め**しない**。`call`箇所の引数からのブロック本体パラメータ型付けは未実装である。中半径。

### B8 — `case/in`のデコンストラクト束縛

```ruby
case x
in [a, b] then a + b      # a, b → Dynamic[top]
in Integer => n then n    # n narrows fine
else 0
end
# classify([1,2]) → 0 | Dynamic[top] | Integer
```

`in Integer => n`は正確に束縛される。配列／findパターンの要素束縛（`[a, b]`）は、subjectが既知のタプルであっても`Dynamic[top]`に型付けされる。`data_instance`/`shape_dispatch`がData/HashShapeに対してすでに行っているデコンストラクション射影が、パターン束縛経路（`statement_evaluator.rb`のパターン処理）に配線されていない。

### B9 — `Hash.new`のデフォルト

```ruby
Hash.new(0)                                  # Hash    (bare, no value type)
h = Hash.new { |hh,k| hh[k]=k*2 }; h[k]      # Dynamic[top]
def counter; h=Hash.new(0); h[:x]+=1; h; end # Hash; counter[:x] → Dynamic[top]
```

`Hash.new(default)`はbareな`Hash`に型付けされる（デフォルト値の型が値パラメータに持ち上げられない）。ブロック形式の`[]`読み取りは`Dynamic`である。`Hash.new(0)`のカウンタイディオムは極めて一般的であり、デフォルト引数／デフォルトブロックの値型をモデル化するカタログ作業が必要。

### B10 — ADR-55でカバーされない再帰

ADR-55は単一呼び出しの値構築再帰を修正した。なお落ちるもの:

```ruby
def fib(n)=n<2 ? n : fib(n-1)+fib(n-2)        # 1 | Dynamic[top]   (two calls)
def tree_sum(n); return n if n.is_a?(Integer); n.sum{|c| tree_sum(c)}; end # Dynamic[top]
def srev(s)=s.empty? ? s : srev(s[1..])+s[0]  # Dynamic[top]      (string concat recursion)
def even?(n)=n==0 ? true : odd?(n-1)          # Dynamic[top]      (mutual)
def hanoi(...); moves<<[from,to]; moves; end  # Array[Dynamic[top]]
```

`gcd`/`ackermann` → `Integer`（正確 ── `Integer#%`/`+`がサイクル内の`Dynamic`を吸収する）。不動点サマリーが収束しないのは: 1つの式に2つの自己呼び出し（`fib`）、`+`で構築するString再帰（`srev` ── 文字列連結は`Integer#*`のようにはDynamicを吸収しない）、相互再帰（`even?`/`odd?` ── ADR-24のキーは`(receiver,method)`単位であり、相互ペアはDynamicとして再入する）、`<<`を通したアキュムレータ再帰（`hanoi` ── B1と複合する）。B1〜B4より半径は低い。相互再帰と文字列ビルダーのケースが最もイディオマティックである。

### B11 — 遅延enumeratorチェーンの末尾

`chunk_while{…}.to_a` → `Array[Dynamic[top]]`である一方、`each_slice(2).to_a`と`each_cons(2).to_a`は正確（`Array[Array[1|2|3]]`）。孤立した`chunk_while`/`chunk`/`slice_when`のenumerator `.to_a`のカバレッジギャップ。低半径。

## 推奨される攻略順

1. **B1 — `<<`/`push`要素型ドロップ（UNSOUND）**。発見された唯一のsoundness欠陥。実際は`[0,1,2,3]`の配列に対する`Array[0]`は具体的な誤った畳み込み（`x.zero? → true`）を生む。ADR-56の書き戻しにおいて追加された要素型を配列の要素パラメータに結合して修正する。安価な*sound*な暫定策は、書き込まれたシード配列を`Array[Dynamic[top]]`へ広げること。soundness優先。
2. **B4 + B3（要素／メモ結合）**。B1と同じレバーをsound-but-imprecise側から。B1の結合をランドさせればB4を大方包含するはずであり、`each_with_object`が（結合された）メモを返すことで最大半径の*精度*イディオムを閉じる。同時にやる。
3. **B2 — 非定数パラメータ採用**。全体で最大のブラスト半径。最大のメカニズム（実際の引数型に対する呼び出しごとの本体再型付け）。B1〜B4より下位にランクするのは、最大規模のビルドでありかつprecision-additive（soundnessの圧力なし）だからである。
4. **B6 `flatten` + B5 `Array#to_h{block}` + B9 `Hash.new`デフォルト**。カタログ／シェイプ畳み込みのギャップ。それぞれprecision-additiveで自己完結的。`Hash.new(0)`と`to_h`のイディオム頻度は高い。
5. **B8 case/inデコンストラクト束縛 + B7ラムダ／proc引数ピン留め**。既存の射影機構を再利用（B8）／値ピン留めをブロック本体へ拡張（B7）。precision-additive。
6. **B10再帰末尾（相互＋文字列ビルダー＋2呼び出し）**。最低半径。相互再帰キーと文字列連結不動点が価値あるサブケース。B11 `chunk_while.to_a`は1行のカタログ追加として組み込める。

B2〜B11はすべてprecision-additive（今日の挙動へ劣化する）。B1は唯一の非加法的項目であり、唯一のsoundnessバグである。
