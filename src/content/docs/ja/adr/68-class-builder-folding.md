---
title: "ADR-68 — プラグインが宣言可能なクラスビルダー畳み込み（Struct / Dataを超えるメンバーシェイプキャリア）"
description: "rigortype/rigor の docs/adr/68-class-builder-folding.md から取り込み。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/68-class-builder-folding.md"
sourcePath: "docs/adr/68-class-builder-folding.md"
sourceSha: "ae23ec6afc6e90e95bcf38dc27acca23c8961b2d47bb32353d81f8f05e1947c1"
sourceCommit: "7c189bd84c14aa0f88b13306f3796c488c52a8b0"
translationStatus: "translated"
sidebar:
  order: 4068
---

ステータス: **Proposed — 需要ゲート付き（demand-gated）**。[ADR-48](../48-data-struct-value-folding/)のメンバーシェイプキャリア（member-shape carrier）基盤を、2つのハードコードされたビルダー（`Struct.new` / `Data.define`）から、Struct風クラスビルダーの**宣言された**ファミリーへ一般化する。これにより、カスタムビルダーから代入された定数──faradayの`ConnectionOptions = Options.new(:a, :b, …)`──が、`Dynamic`に落ちるのではなく、その定数に結びついた名前付きメンバーシェイプクラスとして型付けされる。唯一の新しい機構は認識（recognition）であり、キャリアと畳み込み層（folding tier）はすでに存在する。

根拠: 2026-06-16の保護向上パイロット
（[`docs/design/20260616-act-on-coverage-skill.md`](../../design/20260616-act-on-coverage-skill/)
— faradayの保護上限（約31%）は、`Options.new`で構築された定数（`Env`/`ConnectionOptions`/`RequestOptions`/`ProxyOptions`）が、RigorがRBS名前空間へ接続できない動的クラスオブジェクトとして型付けされることによって頭打ちになっている）である。

## コンテキスト

[ADR-48](../48-data-struct-value-folding/)は、`Foo = Struct.new(:x, :y)` / `Point = Data.define(:x, :y)`を、クロスファイルの`Scope#data_member_layouts`副テーブル経由で定数に結びついたメンバーシェイプクラスキャリア（`Type::StructClass` / `Type::DataClass`）へ畳み込む。これはスコープインデクサーの`data_define_call?` / Struct相当の述語によって認識される。メンバー読み取りはそこで畳み込まれ（`Point.new(1, 2).x → Constant[1]`）、精度加算的（precision-additive）で、偽陽性（FP）のサーフェス（surface）はない。だがその認識は**2つのコアビルダーにハードコードされている**。

多くのライブラリーは独自のStruct風ビルダーを定義する: faradayの`Options`（`ConnectionOptions = Options.new(:request, :proxy, …)`）や、`SomeBase < Struct`あるいはそれを模した広く使われる`Klass = SomeBase.new(*member_syms)`イディオムだ。それらの定数はRigorが畳み込まない動的構築クラスへ評価されるので、定数は`Dynamic`型になり、すべてのインスタンスが`Dynamic`になり、その上のすべてのメンバー／メソッド呼び出しが未保護になる──これがパイロットでのfaraday上限だ。これはADR-48がすでに解決した**同じメンバーシェイプの形**であり、塞がっているのはコアでないビルダーを*認識する*ところだけである。（これは[ADR-26](../26-activerecord-relation-typing/)のActiveRecordケースとは別物だ: ARのリレーション／モデルは*非有界な*メソッドサーフェス──オープンレシーバー（open receivers）──を持つのであって、固定のメンバーレイアウト（member layout）ではない。それはADR-26の領分のままだ。本ADRは固定メンバーのビルダーを対象とする。）

## 決定

ADR-48の基盤をそのまま再利用したうえで、適格となるビルダー集合を**宣言可能（declarable）**にする。

> **基準:** **宣言された**Struct風クラスビルダーから代入された定数（あるいはサブクラス／ローカル変数）は、その定数に結びついたADR-48のメンバーシェイプキャリアへ畳み込まれ、メンバーはビルダー呼び出しのシンボル引数から取られる。ビルダーは**宣言されている**（プラグインの寄与か組み込みのアローリスト）か、**Struct祖先の定義まで辿れる**ものでなければならない──任意の`X = Y.new`から推測してはならない。クラスを返さない`.new`を誤って畳み込んではならないからだ。精度加算的に限る: 認識されないビルダーは今日どおり`Dynamic`を保つ（ADR-48の偽陽性サーフェスなしの契約（contract））。

## ワーキングデシジョン

- **WD1 — ADR-48のキャリアと層を再利用し、認識だけを足す**。新しいキャリアは設けない: 畳み込まれたクラスは`data_member_layouts`エントリーを持つ`StructClass`/`DataClass`ファミリーのメンバーシェイプである。唯一の新しいサーフェスは*どのビルダー呼び出しが適格か*──今日はハードコードされた`data_define_call?`述語、これをレジストリへ一般化する。
- **WD2 — ADR-16基盤を介したプラグイン宣言のビルダー**。プラグインは「ビルダー`Options`上のシンボル引数付き`.new`はStruct風メンバークラスを生成する。メンバー = そのシンボル引数」と宣言する（[ADR-16](../16-macro-expansion/)のマクロ／DSL認識サーフェス、`data_define_call?`が概念上存在するのと同じ場所）。faradayの`Options.new`が最初の利用者だ（`rigor-faraday`の寄与）。機能の範囲を限る: 宣言されたビルダーだけが畳み込まれる。
- **WD3 — ビルダー定義を辿る推論的認識（延期）**。`Foo = Builder.new(*syms)`を、`Builder`自身が`Struct`サブクラスかADR-48で畳み込まれたクラスであるとき、`Builder`自身の定義を辿って認識する──こうすればビルダーごとの宣言は不要になる。予算と健全性でゲートする（ビルダーは`.new`をオーバーライドしてメンバーシェイプインスタンス以外を返しうる）。WD2の宣言ルートの後ろに延期する。
- **WD4 — ADR-26のオープンレシーバーと合成し、再導出しない**。ビルダークラスはしばしば動的メソッドもミックスインする（faradayの`Options`はそのメンバーを超えるヘルパーを足す）。畳み込まれたビルダークラスは**既知**（具体的、保護済み）だが、その動的サーフェスが`call.undefined-method`を発火させないように、[ADR-26](../26-activerecord-relation-typing/)の`open_receivers`未定義メソッド免除をMAY必要とする。その免除を再利用する。2つの機構は合成される（宣言されたメンバーへのメンバー畳み込み＋残りへのオープンレシーバー許容）。
- **WD5 — 精度加算的に限る／誤認識ガード**。ADR-48と同様、新しい診断ファミリーはない。宣言された（WD2）あるいは定義を辿った（WD3）ビルダーだけが畳み込まれ、認識されない`X = Y.new`は今日とまったく同じく`Dynamic`のままなので、実際にはメンバーシェイプクラスを返さないビルダーが誤ってそれへ畳み込まれることは決してない。

## 却下／延期した代替案

| 代替案 | 判定 |
| --- | --- |
| カスタムビルダー用に新しいキャリアを設ける | **却下** — ADR-48の`StructClass`/`DataClass`ファミリー＋`data_member_layouts`を再利用する。欠けているのは認識だけ。 |
| 任意の`X = Y.new(*syms)`をクラスビルダーと推測する | **却下** — クラスを返さない`.new`が誤って畳み込まれる。認識は宣言された（WD2）か定義を辿った（WD3）ものでなければならない。 |
| ActiveRecordのモデル／リレーションケースをここで畳み込む | **スコープ外** — それは*オープンレシーバー*（非有界なメソッドサーフェス）であって、固定のメンバーレイアウトではない。それは[ADR-26](../26-activerecord-relation-typing/)のままだ。 |
| 宣言ルートより先に推論的ビルダー追従（WD3）を行う | **延期** — `.new`はオーバーライドされてメンバー以外の値を返しうる。宣言ルート（WD2）が偽陽性安全な第一歩だ。 |

## 再評価のトリガー

需要ゲート付き。[ADR-63](../63-type-protection-coverage/)の保護カバレッジが、カスタムビルダー定数を繰り返し現れる`add_a_type_here`の上限として浮上させたとき（faradayが最初）、あるいは`rigor-faraday`プラグインがスコープされたときに進める。

## 帰結

- **正** — ビルダー定義の定数を名前付きメンバーシェイプクラスとして型付けすることで、faraday級の保護上限を引き上げる。精度加算的で、実証済みの基盤を再利用する。認識レジストリ1つのコストで、ADR-48をStruct風ビルダーのファミリー全体へ一般化する。
- **負** — WD2はビルダーごとの宣言（プラグイン）を要するので、WD3まで未宣言の社内ビルダーは畳み込まない。オープンレシーバーとの合成（WD4）は、動的サーフェスを足すビルダーごとに配線せねばならない。
- **持ち越し** — WD2（宣言、faraday）は偽陽性安全な第一歩だ。WD3（定義追従）はビルダーごとの宣言を取り除くが、`.new`オーバーライドの健全性問題を抱える。

## 実装ノート（スコーピング、2026-06-16）

実装前の掘り下げで拡張点と本当の核心が特定され、専用セッションがリスクを下げた状態で始められるようになった:

- **拡張点** — `Inference::ScopeIndexer#struct_new_call?`（`scope_indexer.rb`の約L2615）はリテラルの`Struct`レシーバーだけにマッチする（`meta_constant_receiver?`）。*別の* `struct_builder_new_call?`を追加する──共有の`struct_new_call?`を広げては**ならない**。それは`record_meta_superclass_members`とcheck-rulesのアリティパスもゲートしているからだ。新述語は、レシーバー定数が`discovered_superclasses`マップを介して`Struct`から**推移的に派生する** `<Const>.new(*symbols)`を受け入れ、それを`record_struct_member_layout`だけへ振り分ける。`meta_member_names` / `struct_new_keyword_init?`はそのような呼び出しに対してすでに変更なしで動く（非`Struct.new`分岐はシンボル引数を保ち、末尾のキーワードハッシュをノード型で落とす）。構成上、偽陽性安全だ: 解決不能なレシーバーは畳み込まれない（`Dynamic`のまま）。faradayは扱いやすい── `class Options < Struct`; `ConnectionOptions = Options.new(:request, …)`。
- **核心 — クロスファイルのビルダー畳み込みには2フェーズのプロジェクト事前パスが要る**。レイアウトは2か所で構築される: ファイル単位パス（`merge_member_layouts`、これはプロジェクトシードからの*完全な*クロスファイル`discovered_superclasses`をすでに持つ）と、プロジェクト事前パス（`accumulate_project_index`の約L2401、これはファイルごとに`acc[:superclasses]`を*インクリメンタルに*累積する）だ。ビルダー定数（`ConnectionOptions`）は**ファイルをまたいで使われる**ので、そのレイアウトは事前パスが構築するクロスファイルシードへ収まらなければならない──だが事前パスは*定義*ファイル（`Options < Struct`）より前に*使用*ファイルを処理しうるので、畳み込み時にスーパークラスマップが不完全なまま残ってしまう。健全な修正は、`accumulate_project_index`を2フェーズに分割すること（まず全スーパークラスを累積し、次に完全なマップに対してビルダーレイアウトを計算する）であって、インクリメンタルなマップに対して畳み込むことではない。ファイル単位のみの畳み込みはゲートをグリーンにするが、faradayの勝利はほぼ生まない（クロスファイル使用が支配的）──この2フェーズの再構成こそ慎重を要する部分であり、これが別セッションの作業である本当の理由だ。faradayの破るべきベースライン（baseline）: 227/1066（21.3%）保護。
- **検証済みの価値の留保（2026-06-16）── 畳み込みはM3（[ADR-67](../67-parameter-type-inference/)）に縛られる**。faradayの*使用*サイトを精査すると、それら自身がM3でブロックされていた: `def match(env)` / `def call(env)`はOptions型を**型なしパラメータ**として受け取り（`# @param env [Faraday::Env]`はコメントでありコアRigorは消費しない）、インスタンスは`ConnectionOptions.from(options)` / `Env.from(env)`──型なしのカスタムクラスメソッドの戻り値──を介して流れるのであって、直接の`Const.new(...)`構築ではない。したがって定数を畳み込んでも保護されるのは*直接構築*サイト`Const.new(...).x`だけであり、faradayはそれをめったに書かない。ゆえに実世界での保護の勝利はADR-67（パラメータ推論）と`.from`スタイルの戻り値の型付けに縛られる。**2フェーズの再構成がそれ単独でfaradayの代表比率を大きく動かすとは期待しないこと**。（同じ精査がastパイロットの「`Parser::AST::Node`のRBSが要る」という診断を反証した: `builders/default.rb:309`でのparserの`numeric.loc`レシーバーは`def unary_num(unary_t, numeric)`の*パラメータ*であり──純粋なM3で、ノードのRBSを足しても変わらない。）これにより、ADR-66とADR-68の両方が実アプリで実を結ぶための基礎的前提条件はADR-67となる。
- **修正されたスコープ（2026-06-16、二度目の掘り下げ──上記の「拡張点は1つ」という枠組みを置き換える）**。 より深い配線の掘り下げで、このノートが特定した拡張点（`struct_member_layouts`へ供給する`struct_builder_new_call?`）は作業の*半分*にすぎないと分かった。`Const.new(...).x`を畳み込むには、`Inference::MethodDispatcher::StructFolding`層の`fold_named_new`パス（`struct_folding.rb:62`/`73`）が要る。これは**レシーバーが`Singleton[Const]`として型付けされ**、かつ`Scope#struct_member_layout(Const)`がレイアウトを返すときにのみ発火する。だからビルダー定数には1つではなく**2つ**の副テーブルが要る:
  1. `struct_member_layouts[Const] = {members:, keyword_init:}` ── 特定された拡張点（`build_struct_member_layouts` / `accumulate_project_index`）。
  2. `discovered_classes[Const] = Singleton[Const]` ── 定数を既知のシングルトンにし、そもそも当該層が発火するようにする。今日、定数をこう型付けするのは`record_meta_new_constant?`（`data_define_call?` / `struct_new_call?`でゲートされる）だけだ。ビルダー定数は`Dynamic`に落ち、だから`.new`は`Dynamic`になり、当該層は決してディスパッチしない。

  難所: （2）は**別の**事前パス`discovered_classes_for_paths` → `collect_class_decls`で構築されるが、これはビルダー認識が必要とする`discovered_superclasses`マップを**運ばない**（それを構築するのは`discovered_def_index_for_paths`だけだ）。だから正しい実装は**3ウォーク・2フェーズ**の変更になる──`collect_class_decls`（シングルトン型付け。スーパークラスを通す必要がある）、def-indexの`struct_member_layouts`（レイアウト。上記ノートに沿った2フェーズ）、そして両方のファイル単位パス（`merge_project_method_indexes`の宣言＋`merge_member_layouts`、これらは*完全な*クロスファイルのスーパークラスシードを持つ）──さらにレシーバー定数のレキシカルな名前解決（`Const = Options.new` → `Faraday::Options`）と推移的`< Struct`派生チェックだ。「述語を1つ足す」より実質的に大きい。別セッションの見積もりは、この修正されたスコープのまま維持される。部分的な勝利が欲しいなら、**より小さく偽陽性安全な中間スライス**がある: ビルダー認識を**2つのファイル単位パスだけ**で行う（それらはすでに完全なスーパークラスシードを持つ）。これは*同一ファイル*の`Builder.new`宣言＋使用を畳み込むが、クロスファイルケース（faradayの支配的な形）は畳み込まない──ゲートはグリーンになり、機構は実証され、クロスファイルの2フェーズと`collect_class_decls`へのスーパークラスの通しは延期される。

## 他のADRとの関係

- **ADR-48** — 本ADRが一般化するキャリア基盤。認識が唯一の追加点だ。
- **ADR-16** — WD2の宣言が乗るプラグイン／DSL認識サーフェス。
- **ADR-26** — 兄弟である動的クラスケース（オープンレシーバー）。WD4はその`undefined-method`免除を再導出せず合成する。
- **ADR-63** — faradayのビルダーにゲートされた上限を浮上させた保護パイロット。
