---
title: "Steep 2.0 cross-check triage (2026-05-03)"
description: "Imported from rigortype/rigor docs/notes/20260503-steep-cross-check-triage.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260503-steep-cross-check-triage.md"
sourcePath: "docs/notes/20260503-steep-cross-check-triage.md"
sourceSha: "cbea0934478f7b604f99519e316837f997fa75ec48f43624b40932875ec0ab75"
sourceCommit: "832dbf9f85f234b230c6b72dff329a2055fa34f1"
sourceDate: "2026-05-15T15:54:42+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266503
---

Steep 2.0.0を`tool/steep/`に独立bundleとして追加し、`make steep-check`
で`lib/`を`sig/`に対して走らせた結果のトリアージ。Rigor自身の`make
check`は引き続きクリーンに保つ前提で、外部チェッカーの観点からどの警告が
**Rigorでも検知すべき真の不一致**で、どれが**Rigorでは拾わないのが
正しい（= Steep側の限界）**で、どれが**より精密な型付けで偽陽性として
解消できる**ものかを切り分ける。

## サマリ

- 入力: `make steep-check`
- 集計: **17ファイル / 54件** (`Ruby::MethodBodyTypeMismatch` 42件、
  `Ruby::MethodParameterMismatch` 9件、`RBS::DuplicatedMethodDefinition`
  3件)
- 分類:

| カテゴリ | 件数 | 概要 |
| --- | --- | --- |
| A. Rigorも検知すべき（真のsig drift） | 48 | 戻り値型の宣言誤り、引数欠落、宣言重複。`sig/`修正で解消できる。 |
| B. Rigorでは検知しないのが適切（Steep固有の偽陽性） | 0 | 該当なし。今回の警告は全て事実に根拠がある。 |
| C. 適切な型付けで偽陽性として解消可能（Rigorの精密化で消える） | 6 | `Array()`強制変換と`Data.define`のキーワード合成を追えていないことに起因。 |

以下、カテゴリ別に内訳と推奨アクションをまとめる。

---

## カテゴリA — Rigorも検知すべき（真のsig drift）

`sig/`側の手書き宣言が`lib/`の実装に追従できていない。Robustness
Principle ([docs/type-specification/robustness-principle.md](../../type-specification/robustness-principle/))
の「strict on returns」を素直に適用すれば検出されるべき類のもの。

### A-1. 述語メソッド`top` / `bot` / `dynamic`の戻り値型（39件）

各タイプキャリア(`Top`, `Bot`, `Dynamic`, `Constant`, `IntegerRange`,
`Nominal`, `Singleton`, `Union`, `Difference`, `Refined`, `Intersection`,
`Tuple`, `HashShape`)が公開している述語メソッド`top` / `bot` / `dynamic`
は実装上`Trinary.yes/no/maybe`を返す（[lib/rigor/type/top.rb:26-36](https://github.com/rigortype/rigor/blob/master/lib/rigor/type/top.rb)）
が、[sig/rigor/type.rbs:11-13](https://github.com/rigortype/rigor/blob/master/sig/rigor/type.rbs)は

```ruby
def top: () -> Top
def bot: () -> Bot
def dynamic: () -> Dynamic
```

と宣言している。**戻り値型の意味そのものが取り違えられている**:
sigは「`top`と呼ぶと`Top`型インスタンスが返る」と読めるが、実際は
「この型はtopか？」という述語でありTrinaryを返す。

- 検知すべきか: **Yes** — strict on returnsの素直な違反。Rigorが完成
  すれば自動で検出可能。
- 修正: sig側を`def top: () -> Trinary`等に揃える。13ファイル × 3
  メソッド = 39箇所。
- 影響範囲: `sig/rigor/type.rbs`のみ。`lib/`側は変更不要。

注: `Refined#dynamic`と`Difference#dynamic`の警告はbody推定が
`(Type::Dynamic | Trinary)`になっているが、これも上記と同一原因
(継承先 / 委譲先で誤って`Type::Dynamic`を返している経路をSteepが
拾った副次効果)なので同じ修正で消える。

### A-2. `IntegerRange#lower` / `upper`の戻り値（2件）

[lib/rigor/type/integer_range.rb:67-71](https://github.com/rigortype/rigor/blob/master/lib/rigor/type/integer_range.rb)は
`NEG_INFINITY` / `POS_INFINITY`をSymbol番兵で表現しており、`lower` /
`upper`は`Integer | Float | Symbol`を返し得る。一方
[sig/rigor/type.rbs:71-72](https://github.com/rigortype/rigor/blob/master/sig/rigor/type.rbs)は`() -> Numeric`。
Symbolは`Numeric`の部分型ではないので不整合。

- 検知すべきか: **Yes** — 戻り値の集合が宣言より広い、明確なstrict-on-returns違反。
- 修正パスは2通り:
  1. sigを`() -> (Integer | Float | Symbol)`（実体に合わせる）
  2. implを`Float::INFINITY`番兵に置換しsigの`Numeric`を維持
- どちらが望ましいかはADR 3（型表現）と擦り合わせる必要があるが、現状
  Symbol番兵を採用している以上、当面はsig側更新が現実的。

### A-3. `record_declarations`の引数欠落（1件）

[lib/rigor/inference/scope_indexer.rb:473](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/scope_indexer.rb)
は4引数:

```ruby
def record_declarations(node, qualified_prefix, identity_table, discovered)
```

[sig/rigor/inference.rbs:135](https://github.com/rigortype/rigor/blob/master/sig/rigor/inference.rbs)は3引数:

```ruby
def self?.record_declarations: (untyped node, Array[String] qualified_prefix, Hash[untyped, Type::t] table) -> void
```

第4引数`discovered`がsigから落ちている、典型的なsig drift。

- 修正: sigに`Array[untyped] discovered`（実型は要確認）を追加。

### A-4. `RbsLoader#instance_definition` / `singleton_definition`の重複宣言（3件）

[sig/rigor/environment.rbs:41,48](https://github.com/rigortype/rigor/blob/master/sig/rigor/environment.rbs)と
[同:43,49](https://github.com/rigortype/rigor/blob/master/sig/rigor/environment.rbs)で同名メソッドが二度宣言され、
戻り値型が`untyped`と`untyped?`で食い違う:

```ruby
def instance_definition: (String | Symbol class_name) -> untyped
...
def instance_definition: (String | Symbol class_name) -> untyped?
```

RBS仕様ではオーバーロード以外の重複は許されない。`instance_definition`
/ `singleton_definition`の各1行を削除して`untyped?`側に統一するの
が妥当（実装が`nil`を返し得るかは要確認のうえ確定）。

- 検知すべきか: **Yes** — RBS仕様レベルのエラー、RigorがRBSパーサ経由
  で読む段階で同様にエラーになる（なるべき）。

### A-5. `CLI#initialize`の必須キーワード（3件）

[lib/rigor/cli.rb:31](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli.rb):

```ruby
def initialize(argv, out:, err:)
```

[sig/rigor.rbs:23](https://github.com/rigortype/rigor/blob/master/sig/rigor.rbs):

```ruby
def initialize: (?Array[String] argv, ?out: untyped, ?err: untyped) -> void
```

sigは`argv`も`out:`も`err:`も全てoptionalだが、implは全て
required（`out:`には既定値が無い）。callerがsigを信じて`CLI.new`
を引数なしで呼ぶと`ArgumentError`で落ちる。

- 検知すべきか: **Yes** — 契約上のlenienceがimplで守られていない。
- 解消方向: ADR 5（Robustness Principle）に従えばimpl側を寛容化、
  すなわち`def initialize(argv = [], out: $stdout, err: $stderr)`に
  揃えるのが筋。これで`self.start`の挙動も維持される。

---

## カテゴリB — Rigorでは検知しないのが適切（Steep固有の偽陽性）

**今回は該当ゼロ**。Steep 2.0が出した警告はすべて何らかの実体的な
不一致を反映していた。Rigorが独自の寛容性ポリシーで意図的に「検出
しない」と決めた領域が今回ヒットしなかったのは、`sig/`側がそもそも
かなり手書きで実装と乖離していて、寛容性の議論に到達するより先に基本
契約違反が露出したため。今後sigを修正したあと再走させると、本カテ
ゴリに分類すべきケースが現れる可能性は高い(例: `untyped`経由の
gradual受け入れをSteepが拒む等)。

---

## カテゴリC — 適切な型付けで偽陽性として解消可能

Steep側のフローセンシティブ性または核ライブラリのモデリングが粗いた
めに発生している警告。Rigorのrobustness principleとcontrol-flow
analysis ([docs/type-specification/control-flow-analysis.md](../../type-specification/control-flow-analysis/))
が完成すれば自然に消えるはず、という意味で偽陽性扱い。

### C-1. `Array(union)`強制変換（1件）

[lib/rigor/analysis/fact_store.rb:128](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/fact_store.rb):

```ruby
def fact_targets(fact)
  Array(fact.target)
end
```

`fact.target`は`Target | Array[Target]`。Rubyの`Array()`カーネル
メソッドは「`Array[T]`ならそのまま、`T`なら`[T]`でラップ」する規約
なので、戻り値は当然`Array[Target]`。Steepは`Array()`の戻り値を
`[T | Array[T]]`（要素1のタプル）と推論しており、ユニオン分岐越しの
specializationに踏み込めていない。

- Rigor視点: `Kernel#Array`の組み込みカタログ(
  [data/builtins/](https://github.com/rigortype/rigor/tree/master/data/builtins/))に「ユニオン引数の場合は
  各メンバを正規化してunify」という仕様を入れれば消せる。
- 当面のworkaroundは不要 — 偽陽性としてlenient設定下で
  warningに留まる。

### C-2. `Data.define`派生クラスの`initialize`オーバーライド（5件）

[lib/rigor/analysis/fact_store.rb:26,32](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/fact_store.rb)
の`Target` / `Fact`は`Data.define(:kind, :name)`等で生成されたクラ
スに`def initialize(kind:, name:) ...`で前処理を被せている。Steepは
`Data.define`の自動生成シグネチャと手書きオーバーライドのキーワード
合致を解析しきれず、`MethodParameterMismatch`を5箇所で出している。

- Rigor視点: `Data.define(*members)`の特化推論
  ([docs/type-specification/structural-interfaces-and-object-shapes.md](../../type-specification/structural-interfaces-and-object-shapes/))
  に加え、明示的に書かれた`initialize`シグネチャを優先する規則を入れ
  れば消える。これはv0.0.4 / v0.1.0のロードマップに直接乗りそうな
  特徴量。
- 暫定: sig側で`Target` / `Fact`の`initialize`が`Data`由来の
  自動生成シグネチャと矛盾しないよう**明示的に書ききる**ことでSteep
  も黙る（現状のsig側はすでに手書きしてある）。Steepが拾えていないの
  は`Data`由来の合成シグネチャ側で、Rigorが`Data.define`専用の
  認識器を持てば優位に立てる領域。

---

## アクション提案

優先度順:

1. **`sig/rigor/type.rbs`の述語メソッド戻り値型修正**（A-1, 39件）
   - 機械的置換に近い。`def (top|bot|dynamic): () -> Trinary`に揃える。
   - これだけで全54件中39件が消える。
2. **`environment.rbs`の重複宣言整理**（A-4, 3件）
   - 余分な行を削除し`untyped?`側に統一。
3. **`scope_indexer`のsigに第4引数を追加**（A-3, 1件）
4. **`IntegerRange#lower/upper`のsig修正**（A-2, 2件）
   - 短期: sigを`Integer | Float | Symbol`に。長期: ADR 3で番兵
     表現を再検討。
5. **`CLI#initialize`の寛容化**（A-5, 3件）
   - `def initialize(argv = [], out: $stdout, err: $stderr)`に修正。
6. **カテゴリC系は当面lenient warningとして放置**。Rigor側の
   `Kernel#Array`モデリング / `Data.define`認識器が入った時点で再走
   させ、消えたことを確認する。

---

## 再現手順

```sh
# 一回限り (依存解決)
nix develop --command make steep-install

# 走らせる
nix develop --command make steep-check

# 個別ターゲット (オプション渡し)
nix develop --command make steep ARGS="check --severity-level=error"
```

`Steepfile`は現状`D::Ruby.lenient`構成。互換性チェック目的でwarning
を網羅的に拾うため（= strictより広く検出するため）この設定にしている。
将来`make verify`チェーンに組み込むかどうかは、A-1〜A-5を解消した後
の残件を見て判断する。

---

## v0.1.1リリース直前follow-up (2026-05-08)

A-1〜A-5はすべてv0.1.xのTrack 4で着地済(`docs/ROADMAP.md` v0.1.1
Track 4 item 11 / 13 / 12参照)。再走（`make steep-check`）の結果を
v0.1.1リリース直前に再分類:

- **入力:** `make steep-check`（v0.1.1リリース候補ブランチ）
- **集計:** 8件 / 2ファイル（warning 8件のみ、error 0件）

| カテゴリ | 件数 | 内容 |
| --- | --- | --- |
| A. 真のsig drift | 0 | A-1〜A-5は全て解消済 |
| B. Rigorでは検知しないのが適切 | 8 | `Data.define do ... end` override block / `Kernel#Array` narrowing / `def`のlambda default — SteepのRuby idiomサポートの限界に起因 |
| C. 偽陽性（Rigorの精密化で消える） | 0 | カテゴリBに再分類 |

### v0.1.1で解消したerror（1件）

- `sig/rigor.rbs:67` `RBS::UnknownTypeName: Rigor::Cache::Store` — `Rigor::Cache::Store`はv0.1.1時点でもsig未整備（`UNSIGNED_NAMESPACES`入り）なので、参照を`untyped`に変更して落とした。同時に`attr_reader plugin_registry: untyped`と`?plugin_requirer: untyped`を`Runner`宣言に追加（Track 2 slice 7で導入されたRunnerサーフェスをsigに反映）。
- `Rigor::Cache::Store`の本格sigはv0.1.x維持タスクとしてdeferred（`UNSIGNED_NAMESPACES`から外す段階で書く）。

### 残る8件（warning）の分類

すべてSteepのRuby idiom認識の限界に起因し、Rigorのコードベース側に
直すべき不一致は無い:

| 件数 | 場所 | 種類 | 性質 |
| --- | --- | --- | --- |
| 5 | `lib/rigor/analysis/fact_store.rb:26-32` | `Ruby::MethodParameterMismatch` | `Target = Data.define(...) do def initialize(kind:, name:); ...; end; end`のoverride-block内`def initialize`をSteepが外側`FactStore`の`initialize`宣言と照合してしまう。Data subclassのsigと紐付けられない既知のSteep限界。runtimeは`super(...)`で正しくData#initializeを呼び出している。 |
| 1 | `lib/rigor/analysis/fact_store.rb:128` | `Ruby::MethodBodyTypeMismatch` | `Array(fact.target)`で`fact.target: Target \| Array[Target]`の`Kernel#Array`強制変換をSteepが`[Target \| Array[Target]]`ではなく`Array[Target]`にnarrowできない。書き換え（`fact.target.is_a?(Array) ? fact.target : [fact.target]`）で消えるが、可読性はむしろ落ちるので保留。 |
| 2 | `lib/rigor/plugin/loader.rb:41` | `Ruby::MethodParameterMismatch` | `def self.load(configuration:, services:, requirer: ->(name) { require name })`のlambda defaultをSteepが`Kernel#require`のsig形と取り違える。Plugin名前空間にsigが無い（`UNSIGNED_NAMESPACES`）ことの副作用。 |

### 結論

`make steep-check`は**error 0 / warning 8**で安定。`make verify`
チェーンには引き続き含めない（warning段階での意図的な乖離は許容）。
`Plugin::*` / `Cache::Store`のsigが整備されたタイミングでwarningは
全て解消する見込み。
