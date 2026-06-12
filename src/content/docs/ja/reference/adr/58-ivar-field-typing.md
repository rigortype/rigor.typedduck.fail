---
title: "ADR-58 — Instance-variable field typing: declaration-sourced nil policy, homogeneous-write reads, ctor definite assignment"
description: "Imported from rigortype/rigor docs/adr/58-ivar-field-typing.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/58-ivar-field-typing.md"
sourcePath: "docs/adr/58-ivar-field-typing.md"
sourceSha: "445e6384260658bccf175cd7f3893f8f3ce453cd5d41b19a1a0409086ca90390"
sourceCommit: "95ff0e09e408504d17102725823e1978301d05ef"
translationStatus: "translated"
sidebar:
  order: 4058
---

ステータス: **Accepted、2026-06-12**。スライスはまだ実装されていない。
アーキタイプ: 熟議的（deliberative）。ステークス: 高 ── これは
`possible-nil-receiver`がivar由来のオプショナリティに対していつ発火してよいかを
規定するものであり、慣用的なデータ構造Rubyにおける最大の偽陽性（false positive、
FP）クラス（アルゴリズムコーパス全体でpossible-nilエラーの94%）であって、
偽陽性の規律という価値が拘束する。

根拠:
[`docs/notes/20260612-algorithm-corpora-survey.md`](../../notes/20260612-algorithm-corpora-survey/)
（バケットM1/M2/M5: 116件のpossible-nilエラーのうち109件がノードフィールドの
読み取りである。メカニズムは`type-of`で確認された: `attr_accessor`＋`@x = nil`の
コンストラクタシードにより、読み取りは`Dynamic[top] | nil`に型付けされ、`nil`が
発火する）と、CRuby標準ライブラリ調査の先送りされたC2クラスタ
（[`20260612-cruby-stdlib-survey.md`](../../notes/20260612-cruby-stdlib-survey/)）。

## Context

クラスivarのプリパス（`ScopeIndexer#build_class_ivar_index`）は、クラスをまたいだ
あらゆる`@x = …`書き込みを、フローインセンシティブにユニオンする。最も慣用的な
データ構造Rubyについて ──

```ruby
class Node
  attr_accessor :value, :next
  def initialize(value) = (@value = value; @next = nil)
end
current = current.next until current.next.nil?   # traversal
r = @right; b = r.colour                          # rotation under a tree invariant
```

── フィールド読み取りは`Dynamic[top] | nil`に型付けされ（コンストラクタの`nil`
シードと型付けされていないアクセサ書き込みのユニオン）、`nil`構成要素は、フローが
証明できないあらゆる不変条件で守られた読み取りに対して`possible-nil-receiver`を
発火する（回転、平衡木の形、「ここではリストに要素が1つ以上ある」）。これらの
プログラムは動作する。発火はそれらを怯えさせる（3コーパスで109件）。とはいえ、
ノードフィールドは**真にnil可能**である ── `leaf.next`はnilである ── ので、
メソッド間の確定代入（definite assignment）ではnilを除去できない。そして、精密さを
*追加*すること（読み取りを`Dynamic | nil`ではなく`Node | nil`に型付けすること）は、
発火ポリシーが先に変わらない限り、FPクラスを良くするのではなく悪化させる。
したがってポリシーが決定であり、精密化メカニズムはその後ろに順序付けられる。

先例: ADR-57のスライス3は、まさにこの理由で分解されたオプショナルタプルスロットを
ソフト化した ── フローが証明できない相関した不変条件をまたいでサイトごとに製造
されるオプショナリティは、動作しているコードを怯えさせる。

## Decision

> **`possible-nil-receiver`がivar由来のオプショナリティに対して発火してよいのは、
> nilが*フローライブ*であるとき ── すなわち、解析対象のメソッド内で読み取りに
> 到達する経路上で代入または観測されているとき ── のみである**（読み取りの前の
> ローカルな`@x = nil`書き込み、失敗したガードによって既にnilを含むよう
> ナローイングされた読み取り、または存在を確立する明示的なnil比較）。
> **宣言由来のnil** ── クラスivarインデックス経由で到来するコンストラクタシード／
> メソッド間書き込みユニオン ── は、本物の型情報である（表示される型`Node | nil`に
> 留まる）が、**それ自体では診断の燃料にはならない**: 動作しているプログラムの
> 不変条件は、ロバストネス原則に従って前提とされる。strictプロファイルは後に宣言
> 由来の発火を表出させてもよい（MAY）。デフォルトは決して表出させない。

依存順のスライス:

### WD1 — スライス1: 宣言由来のnilは発火しない（109件のFP修正）

possible-nil診断経路において、レシーバーの`nil`構成要素の出自を区別する:
ivarインデックス由来（宣言）か、フロー観測（ライブ）か。発火するのはライブnilの
ときのみ。実装スケッチ: ivar読み取り経路は、束縛がメソッドローカルな書き込みや
ナローイングではなくクラスivarインデックスから来たことを知っている。その1ビット
（束縛上の出自フラグまたはファクト）を診断地点へ運ぶ。ローカル書き込み、
パラメータのnil、ガード由来のnilは今日とまったく同じく発火し続ける。
ゲート: アルゴリズムコーパスの109件の発火が消える。Mastodon／haml／kramdown／
ruby-libのデルタはゼロまたは除去。セルフチェックはクリーン。

### WD2 — スライス2: 同質書き込みのフィールド読み取り（精密化）

WD1が有効な状態では、精密化はもはやFPを製造しない: クラスをまたいだ`@x`への
記録された書き込みがすべて型互換であるとき、読み取りは`Dynamic[top] | nil`では
なく`join(written types) | nil-if-seeded`になる ── `current.next`は`Node | nil`に
型付けされるので、走査チェイン（ガード後の`current.next.value`）が精密に
型付けされ、`node = node.next`ループがDynamicへ流出するのを止める（アルゴリズム
調査M1/M2のカバレッジフロア、コンテナコードで35〜48%のdyntop）。アトリビュート
ライター／不明な書き込みは今日のDynamicを保つ。既に着地済みの死んだ一時nil書き込み
の省略（77a4bd0a）を再利用する。

### WD3 — スライス3: 同一クラス呼び出しを通したコンストラクタの確定代入

標準ライブラリのC2クラスタ（ipaddrの`@mask_addr`）にはもう1ステップ必要である:
コンストラクタは同一クラスのメソッド（`mask!`）経由で間接的に代入する。
コンストラクタから到達可能な同一クラス呼び出しのメモ化されたクラスごとのスキャン
（深さ制限あり、ADR-41風）が、すべてのコンストラクタ経路上で確定代入される
フィールドを印付ける。それらはシードnilを完全に落とす（単に発火しないのではなく
── 不在になる）。ipaddrの6サイト＋uri/ldapを解消する最小のスライス。

### WD4 — ゲート

スライスごと: `make verify`＋常設の3コーパス＋ruby/lib＋アルゴリズムコーパス、
新規ゼロ／裁定された勝利（ADR-56 WD4プロトコル）。識別的な形を手でプローブする
ことが必須（走査ループ、回転読み取り、発火し続けるべき（MUST）真の
ローカル`@x = nil; @x.foo`、発火し続けるべき（MUST）失敗ガード読み取り）。

## 却下／先送りした代替案

- **メソッド間ivar確定代入を目玉修正とする**。不十分として却下 ── ノード
  フィールドは真にnil可能である。FPの駆動要因は証明不能な*使用地点*の不変条件で
  あって、代入のギャップではない。確定代入は、真に常に代入されるクラスタのために
  WD3として生き残る。
- **`Dynamic`を含むあらゆるユニオンでpossible-nilを抑圧する**。検討した
  （1行で今日の同じ109件を消す）が、基準としては却下 ── WD2が着地した瞬間に
  真でなくなり（`Node | nil`にDynamic構成要素はない）、真にライブなnilユニオンを
  黙って弱める。安定した規則はキャリアの形ではなく出自である。
- **宣言由来の発火に対するstrictモードのデフォルト**。先送り ── ユーザーが
  求めたときにADR-50のbleeding-edge／プロファイル機構に適合する。

## 他のADRとの関係

- **ADR-5／FPの規律** ── 決定基準はその直接的な適用である: プログラムのテストが
  日々証明する不変条件は、最悪ケースの静的読みより優先される。
- **ADR-57** ── スライス3の分解ソフト化が先例である。クラスごとに裁定するゲート
  プロトコルが引き継がれる。
- **ADR-41** ── WD3のコンストラクタ呼び出しスキャンは、標準的な停止規則の下で深さ
  制限される。
