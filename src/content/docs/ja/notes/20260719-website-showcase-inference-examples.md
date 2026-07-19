---
title: "Webサイトショーケース — 「これに型が付くの？！」推論例集（コア + プラグイン）"
description: "rigortype/rigor docs/notes/20260719-website-showcase-inference-examples.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260719-website-showcase-inference-examples.md"
sourcePath: "docs/notes/20260719-website-showcase-inference-examples.md"
sourceSha: "27b72eb60bc73df4c03f3c9dcf1af6baeec46e0d2c737e1704e395f560e8e872"
sourceCommit: "d88effcae8b2998d1f4f40432e6d4f20ce17946e"
translationStatus: "translated"
sidebar:
  order: 20266719
---

Status: research note, no design commitments. v0.3.0のローンチWebサイト向けの候補インベントリ;観測は**master @ e5a1acb3**（v0.2.9 + v0.3.0として出荷される`[Unreleased]`セクション）に対して行われた。

以下のスニペットはすべて、仕様フィクスチャ、プラグインの`demo/`、または出荷済みのドキュメントから引用あるいは軽微に改変したもので、出典を隣に添えてある —— 示された推論型は、注記がない限り引用元の仕様における厳密なアサーションだ。どのスニペットも公開する前に、masterで`rigor type-of` / `rigor annotate`を通して再実行し、サイトが実際のツール出力を表示するようにすること（フィクスチャは内部の表示形式をアサートする;末尾の「表示規約」を参照）。

## このノートの使い方

- **ヒーロー候補** —— ランディングページを飾れるほど強力な少数精鋭。
- **コアエンジンカタログ** —— 機構ごとに分類、プラグインなし、アノテーションなし。
- **v0.3.0の新機能** —— ローンチ固有の語り口となる項目。
- **プラグインカタログ** —— プラグイン層が上乗せするもの、驚き度で階層化。
- **すぐに使えるサイト素材** —— ドキュメントがすでに洗練された形で提示している例。

---

## ヒーロー候補

この4つはそれ自体でセールスポイントを担う。

### H1. タイポが*計算された値*とともに報告される（[README.md:38](https://github.com/rigortype/rigor/blob/master/README.md)）

```ruby
def slug(title) = title.downcase.gsub(/\s+/, "-")

s = slug("Hello World")
s.lenght
# => error: undefined method `lenght' for "hello-verse"… no — for "hello-world"
```

アノテーションはゼロ;診断はトレースされた値`"hello-world"`を名指す。`String`ではない。READMEではすでに「Hello, Rigor」として提示されている —— ランディングページのヒーローとして再利用しよう。

### H2. 階乗が`120`に畳み込まれる（[README.md:63](https://github.com/rigortype/rigor/blob/master/README.md)、[constant_reduce_fold.rb](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/constant_reduce_fold.rb)）

```ruby
def factorial(n)        #=> Integer
  (1..n).reduce(1, :*)
end

answer = factorial(5)   #=> 120
```

シグネチャのないメソッドは`Integer`と型付けされるが、呼び出し箇所は計算全体を値`120`に畳み込む。ブロック形式の`inject { |acc, i| acc * i }`も畳み込まれ、296ビットのbignum結果は`Integer`へと優雅に広げ直される（[constant_reduce_fold.rb:83](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/constant_reduce_fold.rb)）。

### H3. 再帰が実際に展開される（[recursive_constant_fold.rb:31](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/recursive_constant_fold.rb)）

```ruby
class Stars
  def render(n) = n <= 0 ? "" : "*" + render(n - 1)
end

Stars.new.render(3)     #=> "***"
Factorial.new.of(5)     #=> 120
Factorial.new.of(100)   #=> Integer   (fuel exhausted → graceful widen)
```

値にピン留めされた再帰は燃料バジェットの下で厳密な結果まで走る;決して返らないメソッドは`bot`と推論される（[recursive_fixpoint_summary.rb:102](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/recursive_fixpoint_summary.rb)）。

### H4. プラグインによる次元解析（[examples/rigor-units/demo/demo.rb:15](https://github.com/rigortype/rigor/blob/master/examples/rigor-units/demo/demo.rb)）

```ruby
distance = 100.kilometers
time     = 2.hours
speed    = distance / time     # inferred: Speed
distance + time                # error: dimensional mismatch: 'Distance + Time'
```

数値リテラルは物理次元を帯びる;算術はそれらを合成し検証する（[units_plugin_spec.rb:42](https://github.com/rigortype/rigor/blob/master/spec/integration/examples/units_plugin_spec.rb)）。「プラグインAPIはこれほど強力だ」を示す唯一にして最高のデモ。

---

## コアエンジンカタログ

どの例もプラグインなし、アノテーションなし。

### 定数畳み込み —— エンジンがあなたの式を実行する

| スニペット | 推論 | 出典 |
| --- | --- | --- |
| `Math.hypot(3.0, 4.0)` | `5.0` | [math_folding.rb:8](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/math_folding.rb) |
| `Math.sqrt(-1)` | `Float`（定義域エラー → 断念） | 同ファイル |
| `Shellwords.split("git commit -m 'initial commit'")` | `["git", "commit", "-m", "initial commit"]` | [shellwords_folding/demo.rb:16](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/shellwords_folding/demo.rb) |
| `CGI.escapeHTML("<b>")` | `"&lt;b&gt;"` | [module_function_folding/demo.rb:28](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/module_function_folding/demo.rb) |
| `100.pow(50, 17)` | `4`（モジュラ冪剰余） | [two_arg_fold.rb:36](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/two_arg_fold.rb) |
| `"az".succ` / `"ff".hex` | `"ba"` / `255` | [string_array_catalog.rb:38](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/string_array_catalog.rb) |
| `123.digits` | `[3, 2, 1]` | [numeric_fold.rb:24](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/numeric_fold.rb) |
| `2.5.numerator` / `2.5.denominator` | `5` / `2` | 同ファイル |
| `Set[:a, :b, :c] ^ Set[:b, :c, :z]` | `Set[:a, :z]` | [set_constant_folding.rb:23](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/set_constant_folding.rb) |
| `format("%05d", 42)` | `"00042"` | [kernel_functions.rb:58](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/kernel_functions.rb) |

Webサイトでの切り口: 「Rigorは証明できるプログラムの部分を評価する」 —— シェルのクォート、HTMLエスケープ、モジュラ冪剰余を型チェック時に行い、できないところ（定義域エラー、bignum、ユーザーによる`format`の再定義 —— 所有権ゲート）ではクリーンに断念する。

### タプル、ハッシュシェイプ、値オブジェクト

```ruby
xs = [10, 20, 30]
xs.rotate(2)            #=> [30, 10, 20]
xs.minmax               #=> [10, 30]
[1, 2, 2, 3].uniq       #=> [1, 2, 3]
```
[tuple_access.rb:8](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/tuple_access.rb) —— 他のチェッカーがせいぜい`Array[Integer]`しか持てないところで、位置ごとの精度を出す。

```ruby
q, r = 11.divmod(4)     # q => 2, r => 3   (and -7.divmod(3) #=> [-3, 2])
```
[divmod_tuple.rb:13](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/divmod_tuple.rb) —— 床除算の符号セマンティクスを、分配束縛を通して伝える。

```ruby
h = { 1 => 1, 1 => 2, 1.0 => 3, 1.00 => 4 }   #=> { 1 => 2, 1.0 => 4 }
h[1]    #=> 2
h[1.0]  #=> 4      # 1 and 1.0 are distinct keys, exactly as in Ruby
```
[hash_scalar_keys.rb:10](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/hash_scalar_keys.rb) —— `Hash#eql?`のキー同一性と、後勝ちの重複をモデル化する（v0.3.0の新しいHashShapeカバレッジ）。

```ruby
Point = Data.define(:x, :y)
p = Point.new(1, "two")
p.x               #=> 1
p.with(x: 99).x   #=> 99
```
[data_folding_spec.rb:49](https://github.com/rigortype/rigor/blob/master/spec/rigor/inference/method_dispatcher/data_folding_spec.rb) —— モダンなイミュータブルレコードのための完全な値セマンティクス;`Struct`のセッターは古びる代わりに束縛を再型付けする（[struct_catalog.rb:53](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/struct_catalog.rb)）。

```ruby
config = { host: "example.com", port: 8080 }
config.key?(:host)   #=> true    — proven
config.empty?        #=> false   — proven
```
[docs/handbook/04-tuples-and-shapes.md:126](../../handbook/04-tuples-and-shapes/) —— 「証明された述語」という言い回しは、デモでは魔法のように映る。

### ブロック —— 要素ごとの型付けとキャプチャされたローカルへの書き戻し

```ruby
[1, "two", :three].map { |x| x.to_s }               #=> ["1", "two", "three"]
[1, 2, 3].filter_map { |n| n.even? ? n.to_s : nil } #=> ["2"]
```
[tuple_map.rb:14](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/tuple_map.rb) —— ブロック本体はタプルの位置ごとに1回ずつ再型付けされ、定数の述語では分岐が省略される。

```ruby
table = {}
[1, 2, 3].each { |x| table[x] = x.to_s }
table   #=> Hash[1 | 2 | 3, "1" | "2" | "3"]
```
[block_captured_writeback.rb](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/block_captured_writeback.rb) —— ハッシュを命令的に組み立てる定番のイディオムを、健全にキャプチャする（ADR-56 BodyFixpoint）。

```ruby
[1, 2, 3].inject(0) { |memo, elem| ... }   # memo => 0, elem => 1 | 2 | 3
```
[enumerable_memo.rb:18](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/enumerable_memo.rb) —— RBSが`untyped`と言うところで、シード型がブロックパラメータへ流れる。

### フローセンシティブなナローイング

```ruby
if @current_journal          # @x : Journal | nil
  @current_journal.save      # Journal — no possible-nil warning
end
```
[ivar_guard_narrowing.rb:26](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/ivar_guard_narrowing.rb) —— インスタンス変数もナローイング（narrowing）される。フローセンシティブ（flow-sensitive）な精度の及ぶ範囲がローカル変数に留まらないということだ;この正確なパターンはRedmineで6件の偽陽性だった。まるで本物のRailsのバグ修正のように読める。

```ruby
case kind
when 1 then v = "a"
when 2 then v = "b"
else raise ArgumentError
end
v   #=> "a" | "b"    — no phantom nil
```
[case_else_terminates_exhaustion.rb:11](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/case_else_terminates_exhaustion.rb);同じ認識は`x = src or fail_now`でも働く。ここで`fail_now`は*解決済み*の常に例外を投げるヘルパーだ（[or_guard_narrowing.rb:26](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/or_guard_narrowing.rb)）。

```ruby
return unless v&.start_with?("[") && v.end_with?("]")
v   #=> "[x]"    — &. proved v non-nil, so the bare call after && is clean
```
[safe_nav_truthy_narrows_and_rhs.rb:11](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/safe_nav_truthy_narrows_and_rhs.rb)

```ruby
until line = read_next   # exits only when the assignment is truthy
end
line   #=> non-nil
```
[loop_exit_assignment_narrowing.rb:13](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/loop_exit_assignment_narrowing.rb)

```ruby
params[:f] ||= []
params[:f] << :status    # slot known non-nil, dispatches on Array
```
[indexed_or_narrowing.rb:11](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/indexed_or_narrowing.rb) —— ハッシュのキー存在によるナローイング;Redmineで6回繰り返される`as_params`イディオム。

```ruby
case m                    # m : Integer
when 1..10   then m       #=> int<1, 10>
when (100..) then m       #=> int<100, max>
end
```
[case_when.rb:22](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/case_when.rb);比較は合成される —— `words.size`は`non-negative-int`で、`if n > 0`の後は`positive-int`だ（[container_size.rb:13](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/container_size.rb)）。

```ruby
if /(\d+)-(\d+)/ =~ line
  $1   #=> String     — group is unconditional
end
$1 if /x(y)?/ =~ s   #=> String?   — optional group stays nilable
```
[regex_global_narrowing.rb](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/regex_global_narrowing.rb) —— 正規表現のAST自体を解析して、グループごとのnil可能性を決める。定数パターン`str =~ RE`もv0.3.0では同じ扱いを受ける。

```ruby
state == :ready   # narrows a symbol union member-by-member;
                  # the final else is proven to be the remaining constants
```
[docs/handbook/03-narrowing.md:84](../../handbook/03-narrowing/) —— enumなしでのシンボルユニオンに対する網羅性。

### ミューテーション下での健全性（正直さのデモ）

```ruby
return if arr.empty?     # arr : non-empty-array
arr.clear
puts "emptied" if arr.size == 0   # correctly NOT folded to false
```
[non_empty_refinement_mutation_widening.rb:23](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/non_empty_refinement_mutation_widening.rb) —— ミューテーターはフローのリファインメント（refinement）を撤回する。プロジェクトの「偽陽性ファースト」のセールスポイントと相性が良い: 嘘をつくのではなく*自ら引き下がる*精度だ。

### ユニオン算術と手続き間フロー

```ruby
a = [1, 2].sample; b = [2, 3].sample
a + b                                            #=> 3 | 4 | 5
[10, 20, 30].sample * 0                          #=> 0
[1,2,3,4,5].sample + [10,20,30,40,50].sample     #=> int<11, 55>
```
[union_arithmetic.rb:23](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/union_arithmetic.rb) —— 吸収を伴うデカルト評価と、濃度の上限を超えたところでの区間の広げ。

```ruby
def find(n)
  [1, 2, 3].each { |i| return i if i == n }
  nil
end
find(2)   #=> 1 | 2 | 3 | nil
```
[recursive_unroll_clamp.rb](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/recursive_unroll_clamp.rb) —— ブロック内部からの非局所的な`return`が呼び出し元まで届く。

```ruby
case value
in { name: String => n, age: Integer => a } then [n, a]  # n: String, a: Integer
end
```
[statement_evaluator_spec.rb:2096](https://github.com/rigortype/rigor/blob/master/spec/rigor/inference/statement_evaluator_spec.rb) —— `case/in`パターンのキャプチャは、マッチした型に束縛される。

### `rigor sig-gen` —— 保持できる推論

```ruby
class Widget
  def n = 42
end
# sig-gen emits:  def n: () -> 42
```
[generator_spec.rb:36](https://github.com/rigortype/rigor/blob/master/spec/rigor/sig_gen/generator_spec.rb) —— アノテーションのないdefからリテラル精度のRBSを生成する;`module_function`は`def self?.`として描画される。v0.3.0以降、生成されたシグネチャはすべて、書き出す前に`rbs`で再パースされる。

---

## v0.3.0の新機能（ローンチの語り口）

現在の`[Unreleased]`セクションから —— これらは*このリリースの*精度面の成果だ:

- **アンカー付き正規表現による文字列リファインメント** —— `if s.match?(/\A\d+\z/)`は`s`を10進整数の文字列にリファインするので、後続の`Integer(s)`は証明可能に安全だ。
- **`["a", "b"].join("-")` → `"a-b"`** —— `String`ではなく厳密な文字列。
- **スカラーキーのハッシュシェイプ** —— `{ 1 => 2, 1.0 => 4 }`（上のH/カタログ）はここで新しく、加えて暗黙に後勝ちとなるリテラルのための`flow.duplicate-hash-key`ルールも。
- **rbs-inlineが箱から出してすぐ** —— `#: (Integer) -> String`のコメントアノテーションが設定なしで推論に供給される（ADR-93）。
- **定数パターンのマッチグローバルのナローイング** —— `str =~ RE`はリテラル正規表現のように`$1`/`$~`をナローイングする;`$+`のnil可能性は今やグループを認識する。
- **新しい「常にバグ」ルール** —— `flow.return-in-ensure`、`flow.shadowed-rescue-clause`、`call.raise-non-exception`、`static.value-use.void`（最先端）。
- **セッターとブロック定義クラスを通したStruct/Data** —— さらに2つの畳み込みケース。
- **ウォームラン性能** —— キャッシュヒットの実行はエンジンのロードを完全にスキップする;YJITは償却の締め切りを超えると自らを起動する。「保存時に走らせても十分速い」という一文に使える。

---

## プラグインカタログ

### ティア1 —— DSLとメタプログラミングから精密な型

**rigor-mangrove —— Result/Optionのunwrapが運ばれる型を解決する**
([demo](https://github.com/rigortype/rigor/blob/master/plugins/rigor-mangrove/demo/demo.rb), [spec:81](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/mangrove_plugin_spec.rb))
```ruby
session.token.unwrap!.upcase              # unwrap! : String — typo after it is caught
session.cached_user.unwrap_or("guest").reverse
```
ジェネリックなキャリア（carrier）の`type_args[0]`は、そのRBSの戻り値が`untyped`であっても、unwrap箇所でインスタンス化される。Enum DSLも同様に型付きのバリアントクラスを鋳造する: `Shape::Circle.new(1.5).inner.floor`は`inner`を`Float`と型付けする（[enum_demo.rb](https://github.com/rigortype/rigor/blob/master/plugins/rigor-mangrove/demo/enum_demo.rb)）。

**rigor-sorbet —— `sig`ブロックを静的に読む**
([demo:37](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sorbet/demo/demo.rb), [spec:37](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/sorbet_plugin_spec.rb))
```ruby
sig { returns(Integer) }
def self.default_length = 32
Slug.default_length.even?      # Integer, no sorbet-runtime needed
T.must(T.let(42, T.nilable(Integer))).bit_length   # nil stripped
```
移行のストーリー: あなたのSorbetのsigはRigorの下でも動き続ける。

**rigor-dry-struct / rigor-dry-types —— スキーマ → ファイル横断の型付きリーダー**
([demo](https://github.com/rigortype/rigor/blob/master/plugins/rigor-dry-struct/demo/demo.rb), [spec:160](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/dry_struct_plugin_spec.rb))
```ruby
class User < Dry::Struct
  attribute :name,  Types::String
  attribute :admin, Types::Bool
end
# another file:
user.name    # synthesized reader, return type String
```
dry-typesのエイリアス合成は推移的に解決される（`Types::Email = String.constrained(format: /@/)` → `String`、[spec:46](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/dry_types_plugin_spec.rb)）。

**rigor-typescript-utility-types —— ハッシュシェイプ上のマップ型**
([spec:128](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/typescript_utility_types_plugin_spec.rb))
```ruby
Partial(Address)    # every key optional     Required(Address)  # all required
Pick / Omit / Readonly …
```
TypeScriptのユーティリティ型の代数を、Rubyの構造的型の上で —— TSに興味のある層にはたまらない。

**examples/rigor-lisp-eval —— ミニ言語を解釈するプラグイン**
([spec:27](https://github.com/rigortype/rigor/blob/master/spec/integration/examples/lisp_eval_plugin_spec.rb))
```ruby
Lisp.eval("(+ 3 4)")        #=> Constant<7>
Lisp.eval("(if c 1 2.0)")   #=> Constant<1> | Constant<2.0>
```
チュートリアルプラグインだが、rigor-unitsと並んで「プラグインAPIは型を計算できる」を示す印象的なデモだ。

### ティア2 —— スキーマ/DSLを認識するバリデーションとdid-you-mean診断

どれも同じ心地よい形に従う: 実プロジェクトのアーティファクトを読み、すべての呼び出し箇所を検証し、惜しい候補を提案する。

| プラグイン | 検査 | シグネチャ診断 | 出典 |
| --- | --- | --- | --- |
| **rigor-activerecord** | `find_by`/`where`のkwargs対`db/schema.rb` | `unknown column 'emial' … did you mean :email?` | [spec:103](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/activerecord_plugin_spec.rb) |
| **rigor-rails-routes** | `routes.rb`に対するパスヘルパーの存在 + アリティ（arity） | `usres_path … did you mean users_path?` | [spec:65](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/rails_routes_plugin_spec.rb) |
| **rigor-rails-i18n** | `t("...")`のキー + 遅延`.key`スコープ + 補間変数 対 ロケールYAML | キー欠落 / `name:`補間の欠落 | [spec:56](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/rails_i18n_plugin_spec.rb) |
| **rigor-pundit** | `authorize(post, :destory?)`対 レコードの推論されたポリシークラス | `did you mean destroy?` | [spec:80](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/pundit_plugin_spec.rb) |
| **rigor-statesman** | `transition_to(:approval)`対 宣言された状態 | `did you mean :approved?` | [spec:42](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/statesman_plugin_spec.rb) |
| **rigor-sidekiq** | `perform_async`の引数 対 ワーカーの`#perform`アリティ（スケジュール認識） | アリティ不一致 | [spec:53](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/sidekiq_plugin_spec.rb) |
| **rigor-factorybot** | `create(:usre, rol: …)`対 ファクトリー属性 + モデルのカラム | 両方でdid-you-mean | [spec:69](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/factorybot_plugin_spec.rb) |
| **rigor-actioncable** | `broadcast_to` / `stream_from`対 発見されたチャンネル | 近似マッチのヒント | [spec:79](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/actioncable_plugin_spec.rb) |

Railsのクラスタ（routes + i18n + pundit + AR + factorybotをまとめて）は、「RigorはあなたのRailsアプリを知っている」という強力なセクションになる。エコシステムの幅の統計に注目: masterで**本番プラグイン30個 + チュートリアル例6個**（数は変動する —— 公開時にREADMEから数え直すこと。AGENTS.mdに従う）。

### ティア3 —— 幅広さ

- **rigor-sinatra** —— verbブロックDSLをマクロ展開;素の`params`/`halt`/`redirect`は`Sinatra::Base`経由で解決される（[spec:57](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/sinatra_plugin_spec.rb)）。
- **rigor-hanami** —— アクションプロトコル（ADR-28）: 型付きの`request`/`response`、加えて`handle-arity-mismatch`（[spec:233](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/hanami_plugin_spec.rb)）。
- **rigor-activesupport-core-ext** —— `5.minutes`、`"user_account".camelize`、`Array.wrap(nil)`、`nil.blank?`がすべて解決される;プラグインがなければそれぞれ未定義メソッドだ（[spec:29](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/activesupport_core_ext_plugin_spec.rb)）。
- **rigor-devise** —— `devise :database_authenticatable`が`valid_password?` / `remember_me!`を合成する（[consumer](https://github.com/rigortype/rigor/blob/master/plugins/rigor-devise/demo/consumer.rb)）。
- **rigor-graphql** —— クラスDSLから引数/フィールド/enumのテーブルを抽出する（[spec:45](https://github.com/rigortype/rigor/blob/master/spec/integration/plugins/graphql_plugin_spec.rb)）。
- **rigor-rbs-inline** —— `#:` / `# @rbs`のコメントアノテーションチャンネル、v0.3.0で自動配線される。

---

## すぐに使えるサイト素材

- **Playground** —— [apps/rigor-playground/frontend/index.html:609](../../apps/rigor-playground/frontend/index.html)は、nilレシーバー、インラインRBSのユニオン不一致、挨拶の畳み込みをカバーする15行のサンプルで起動する;rigor.typedduck.fail/playground/でライブ。埋め込もう;`rigor trace`のターミナルアニメーション（[manual/05](../../manual/05-inspecting-types/)）は良いasciinema/GIFの相棒になる。
- **[docs/types.md:19](../../types/)** —— 7行の「carriers at a glance」ブロックは、「Rigorの何が違うのか」を示す単一の表として最良だ。
- **[docs/handbook/12-lightweight-hkt.md](../../handbook/12-lightweight-hkt/)** —— `JSON.parse`が精密な再帰的直和型（sum type）として型付けされる;技術力を誇示する例。
- **信頼性の数字**（[docs/CHANGELOG-0.1.x.md:325](../../changelog-0.1.x/)）—— Mastodon 789 → 6診断（−99.2%）、Redmine 163 → 79、GitLab FOSS ~670 → ~140。公開前にv0.3.0に対して再検証すること（リグレッションスイープのノートに手法がある）。
- **比較リンク** —— TypeScript / mypy / Steep / TypeProf / Sorbet / PHPStanの読者向けのハンドブック付録。

## 表示規約（スクリーンショットのドリフト回避）

3つの表示形式が共存する（[docs/types.md:29](../../types/)）: ハンドブックは`Constant<3>`と書き、内部の仕様は`Constant[3]`、そしてCLI（`rigor annotate`、`type-of`）は**素の値**を表示する（`#=> 120`、`#=> "hello-world"`）。Webサイトのコピーは素の値のCLI形式を使い、スクリーンショットとテキストが一致するようにすべきだ —— 上の表はすでにそうしている。仕様の厳密なアサーション文字列が重要だった箇所を除いて。

## 推奨される次のステップ

1. ヒーローセット（H1–H4）と、オーディエンスページごとに約10個のサポート例を選ぶ（プレーンRubyの精度 / Rails / Sorbetからの移行）。
2. 選んだ各スニペットをmasterで`rigor annotate`を通して実行し、実際の出力をキャプチャする。
3. 引用する前に、v0.3.0で信頼性スイープ（MastodonまたはRedmine）を1つ再実行して、偽陽性の数字を更新する。
