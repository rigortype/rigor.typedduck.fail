---
title: "Struct value folding — slice 3 (fold-safe bound locals) + slice 4 (precise mutated-member re-typing) design"
description: "rigortype/rigor docs/notes/20260615-struct-folding-slice3-design.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260615-struct-folding-slice3-design.md"
sourcePath: "docs/notes/20260615-struct-folding-slice3-design.md"
sourceSha: "997868d7d42c8c92f4736d62af8fc03cd457dc38b4f5c862dab01a64898fd965"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 20266615
---

2026-06-15。**スライス3は2026-06-15に着地**、以下の設計どおりだ（[`Inference::StructFoldSafety`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/struct_fold_safety.rb) + `Scope#struct_fold_safe?`フィールド + トップレベル / メソッド本体の配線）;このノートはその設計記録、そして依然先送りされている**スライス4**（変異済みメンバーの精密な再型付け）の生きた仕様として保持される。スライス1 + 2はそれ以前に着地した（健全な*トランジェント*（transient）形式）。以下の健全性の議論が、実装が実現するものだ。

## 着地したもの（スライス1 + 2）

- キャリア（carrier）`Type::StructClass` / `Type::StructInstance`（`lib/rigor/type/struct_{class,instance}.rb`）。`Data*`キャリアの可変な姉妹だ。`StructClass`は`keyword_init`フィールドを追加する。
- ディスパッチ層`Inference::MethodDispatcher::StructFolding`（`lib/rigor/inference/method_dispatcher/struct_folding.rb`）。`DataFolding`の直後で`dispatch_precise_tiers`に配線される（`meta_new`の前 — さもなくば`meta_new`が`Singleton[*].new`を横取りする）。
- サイドテーブル`Scope#struct_member_layout`（`{ members:, keyword_init: }`）。`ScopeIndexer#build_struct_member_layouts`が充填し、`data_member_layouts`とまったく同様に`DiscoveryIndex` / プロジェクト前処理パスを通じてスレッドされる。
- **健全性ゲート: `StructFolding#fresh_receiver?`** — メンバー読み取りが精密に畳み込まれるのは、`context.call_node.receiver.is_a?(Prism::CallNode)`であるとき（`.new(...)` / `.with(...)`チェーンのトランジェントな結果）に限る。*格納された*バインディング（変数 / 定数の読み取り）からの読み取りは`Dynamic[top]`を返す。

フレッシュレシーバゲート（fresh-receiver gate）が健全なのは、トランジェントなインスタンスが、それを実体化する文と*同じ式*内のチェーン読み取りとの間で変異され得ないからだ — 介在する文が存在しない。これは書き込みサイトに一切触れないので、エスケープ経路を取りこぼしようがない（偽陽性を製造する失敗モードだ）。

代償: 一般的な形式`p = Point.new(1, 2); p.x`は畳み込ま**れない**（`.x`のレシーバーが`LocalVariableReadNode`であり、フレッシュでない）。スライス3 + 4がそのギャップを埋める。

## スライス3 — 変異のないバインドローカルからのメンバー読み取りを畳み込む

ゴール: `p = Point.new(1, 2); p.x` → `Constant[1]`。ただし**`p`がそのスコープ内で決して変異・エイリアス・エスケープされないと証明可能なとき**に限る。バインドローカルが*畳み込み安全（fold-safe）*なとき、`fresh_receiver?`を緩めて格納されたレシーバーの読み取りも畳み込む。

### 健全性の問題（なぜこれが難しいスライスなのか）

`Struct`インスタンスは可変であり、その変異はローカルを**再バインドしない**ので、素のフロー再型付けはそれを見逃す:

```ruby
p = Point.new(1, 2)   # p : StructInstance{x:1, y:2}
p.x = 5               # セッターはpを再バインドしない;フローは依然 {x:1,...} を見る
p.x                   # 素朴な畳み込み → 1、だが実行時は5 → 不健全 → 誤った型
```

さらに悪いことに、エイリアシングは*別の*バインディングを通じた変異が`p`を無効化することを意味する:

```ruby
q = p                 # エイリアス: p と q は同じオブジェクトを参照する
q.x = 5
p.x                   # 素朴な畳み込み → 1、実行時5 → 不健全
```

そしてエスケープは、任意のメソッドがそれを変異させ得ることを意味する:

```ruby
mutate!(p)            # p がエスケープする;呼び出し先が p.x = 5 をするかもしれない
p.x                   # 素朴な畳み込み → 1、誤りの可能性 → 不健全
```

不健全なメンバーマップは**誤った型**であり、下流の偽陽性を製造し得る（`p.x.zero?`が誤った`true`/`false`に畳み込まれる、誤った`always-truthy`、誤った`argument-type-mismatch`）。これは畳み込まないことより厳密に悪い。したがってスライス3は、変異・エイリアシング・エスケープの**すべて**に対して健全でなければならない。

### 畳み込み安全スキャン（ルートb、保守的な許可リスト）

エスケープ経路を列挙して無効化する（ルートa）ことは**しない** — 経路を1つでも取りこぼせば不健全だ。代わりに、保守的な**許可リスト**（allow-list）スキャンによってローカルが畳み込み安全であることを証明する: ローカルが畳み込み安全であるのは、その*すべての*使用が短く既知の純粋な許可リスト上にあり、かつ**それ以外のものはすべて失格にする**とき、かつそのときに限る。許可リストでケースを取りこぼすと、スキャンは過度に保守的になる（畳み込みなし）だけで、決して不健全にはならない — FPセーフな方向だ。

メソッド本体ごと（またはトップレベルのプログラム領域ごと）に、畳み込み安全なstructローカル名の集合を計算する:

> struct型のローカル`n`が**畳み込み安全**であるのは、本体内で名前`n`を持つすべての`LocalVariableReadNode`が、メソッド名が`SAFE` = 固定のStruct読み取りメソッド（`[] dig to_h to_hash to_a values members deconstruct deconstruct_keys == != eql? equal? hash inspect to_s size length frozen? each each_pair values_at with`）**∪ `n`のstructレイアウトのメンバーリーダー名**に含まれる`CallNode`の**レシーバー**であり、かつその呼び出しがメンバーセッター / `[]=` / 変異子でないとき、かつそのときに限る。

要点:

- **すべての読み取りは安全レシーバー読み取りでなければならない**。それ以外の位置での読み取り — 呼び出しの*引数*（`foo(n)`）、エイリアスのRHS（`m = n`）、コンテナの要素（`[n]`、`{k: n}`）、素の値 / 戻り値、ブロックキャプチャ — は安全レシーバー読み取りではないので、ローカルは失格になる。これはエスケープ**と**エイリアシングを、列挙することなく包摂する: あらゆるエスケープ/エイリアスは`n`の*何らかの*非レシーバー出現だ。実装: 本体を一度走査し、`LocalVariableReadNode(n)`の総数と安全レシーバー読み取りの数を数える;等しい ⇒ すべての読み取りが安全なレシーバーだった。（セッター`n.x = v`はレシーバー読み取りがカウントされるが安全でない ⇒ 不一致 ⇒ 自動的に失格となる。）
- **未知のメソッド呼び出しは失格にする**。`n.some_user_method`は内部の`self.x = …`を通じて変異し得るので、`SAFE`許可リストだけが畳み込まれる;未知の名前は変異の可能性ありとして扱う。これがスキャンが**レイアウト認識**でなければならない理由だ — メンバー読み取り（`n.x`、安全）を未知のメソッド（`n.frobnicate`、危険）と区別するために`n`のメンバーリーダー名が必要となる。`n → members`の対応付けは、実体化する代入（構文的に`n = <Struct.newチェーン>`、またはレイアウトサイドテーブル経由で解決される`n = Const.new(...)`）を検出して行う。あるブランチでstructを、別のブランチで非structを代入されるローカル、または再代入されるローカルは、保守的に失格となる。
- **ブロックは問題ない** — 走査がブロック内へ降りる限りは: ブロック内の`n`の使用（`n.each { … n … }`）はそれ自体としてチェックされる;`n.each`自体は安全なレシーバー読み取りだ。

### どこにフックするか

2つの実行可能な形式がある。実装時にコードベースに対して最もクリーンに読めるほうを選ぶ:

1. **領域ごとのサイドテーブル**（`struct_member_layouts`を映す）: スコープインデクサがメソッド本体ごとに`struct_fold_safe_locals`集合を計算し、畳み込みがスコープ経由でそれを参照する。`fresh_receiver?`は`fresh OR (stored-local AND scope.struct_fold_safe?(local_name))`になる。*本体ごと*（プロジェクトごとではない）の集合をスコープを通じてスレッドすることが新しいサーフェスだ — メソッド本体の事前スキャンが現在どうスレッドされているかを調べよ（`build_user_method_body_scope`は`discovery`を丸ごと継承する;本体ごとのテーブルは本体エントリーで計算する必要がある）。
2. **バインド時劣化、その反転**: デフォルトでは（今日のように）バインディング内に`StructInstance`を保持し、畳み込みサイトでスキャンを参照する。（バインドされたキャリアはすでに保持されている — スライス2はバインド時に劣化しない。）

どちらにせよスキャン結果はローカルごとの同じブール値だ。

## スライス4 — 変異済みメンバーの精密な再型付け（ルートa、狭い安全なケース）

スライス3が畳み込み安全なローカルを畳み込むようになれば、スライス4は畳み込み安全性を、**同じ構文的バインディング上の直接のセッターを通じてのみ**変異されるローカルへ*拡張*する（エイリアシングなし、エスケープなし、動的キーの`[]=`なし）:

```ruby
p = Point.new(1, 2)
p.x = 5               # メンバー :x を p のバインディング上で RHS の型（5）に再バインド
p.x                   # → 5  （健全: セッターの効果が流れ戻った）
p.y                   # → 2  （姉妹メンバーは精密なまま）
```

これはルート（a）のフローセンシティブな無効化だが、スライス3スキャンがすでに安全と証明する狭く決定可能なケース（エイリアスなし / エスケープなし）に**のみ**適用される。セッター`p.x = v`は、メンバー`:x`を`v`の型で置き換えた`StructInstance`に`p`を再バインドする（セッターはすでに`v`を返す — スライス2 — のでこれはバインディング側の効果だ）。チョークポイントは`MutationWidening.widen_after_call`（`eval_call`のポストスコープ）;先行事例はADR-56スライスCのレシーバー内容書き戻し（`content_writeback_block_captures` / `loop_content_writeback`）であり、これはすでに変異の効果を継続バインディングへ流し戻している。エイリアシング/エスケープは構成上除外される — スライス3スキャンがエイリアスまたはエスケープするローカルをすべて失格にするからだ。

## ゲート（両スライス）

精度加算的（診断なし）だが、健全性のバーは難しい:

- 健全と不健全を区別する弁別的な形式を手でプローブする: `p.x = 5; p.x`（スライス4 → 5;スライス3単独では変異済みローカルを畳み込んで**はならない**）、`q = p; q.x = 5; p.x`（エイリアス → 畳み込んではならない）、`mutate!(p); p.x`（エスケープ → 畳み込んではならない）、どこにも変異のない`p.x`（→ 畳み込む）。
- `make verify` — Rigor自身の`lib` + バンドルされたコーパスが、意図した精度向上以外はバイト同一であること。
- バインドローカルの畳み込みを信頼する前の、`rigor-survey`コーパス差分（型を取り違えたバインドstructレシーバーは、まさにセルフチェックが露出できない外部コードのFPだ）。

## 先行事例 / ポインタ

- `lib/rigor/inference/method_dispatcher/struct_folding.rb` — スライス1/2の層と、緩めるべき`fresh_receiver?`ゲート。
- `ScopeIndexer#widen_member_for_observed_mutators` — 観測された変異子名でのクラスivar Tuple→Array / HashShape→Hash拡大（ルートaの先行事例）。
- ADR-56スライスC（`content_writeback_block_captures`、`loop_content_writeback`、`MutationWidening::CONTENT_ADDERS`） — 継続バインディングへ流れ戻るレシーバー内容変異（スライス4の書き戻し形式）。
- `DataFolding` — 不変の姉妹であり、バインドされた読み取りを無条件で畳み込む（Dataは凍結されているので畳み込み安全スキャンを持たない）。
