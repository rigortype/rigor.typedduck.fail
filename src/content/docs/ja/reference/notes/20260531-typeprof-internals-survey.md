---
title: "TypeProf内部調査 — 推論ロジック + 内部型表現"
description: "Imported from rigortype/rigor docs/notes/20260531-typeprof-internals-survey.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260531-typeprof-internals-survey.md"
sourcePath: "docs/notes/20260531-typeprof-internals-survey.md"
sourceSha: "ea7ec282c998dc1f37ae85a0d8b209a4114210444371973d1b3460d13ad4bc26"
sourceCommit: "cb6b329f5b70369b8e4ebdd4f4a69f28aa85937d"
translationStatus: "translated"
sidebar:
  order: 20266531
---

**日付:** 2026-05-31
**対象:** [TypeProf](https://github.com/ruby/typeprof) v0.31.1。`references/typeprof/`に読み取り専用でベンダリング済み（ピン`19ff60cf`）。
**理由:**ハンドブック付録[`docs/handbook/appendix-typeprof.md`](../../handbook/appendix-typeprof/)を裏づけるディープダイブ。この付録はTypeProfを「プログラム全体の抽象インタープリター（whole-program abstract interpreter）」であり、リテラル値の精度を持たず、呼び出しサイトからパラメーターを推論すると主張している。本ノートはこれらの主張を実際のソースに固定し、将来の付録編集（および「Rigorはこれを取り入れるべきか」というあらゆる問い）が伝聞ではなく検証されたメカニズムに依拠するようにする。

すべての`file:line`引用はベンダリングしたv0.31.1ツリーに対するもの。一次ソース: ソース自体 + プロジェクト自身の[`doc/doc.md`](https://github.com/rigortype/rigor/blob/master/references/typeprof/doc/doc.md)。二次ソース（設計意図／歴史）: 末尾に列挙した遠藤氏のRubyKaigiトーク。

---

## 0. 1段落のオリエンテーション

TypeProfは制約ソルバーではなく、教科書的なHindley–Milner推論器でもない。**単調なデータフローグラフとして実装された型レベルの抽象インタープリター**である。ソースコードは、**頂点**（vertex、型の集合）を**エッジ**（edge、データフロー）でつなぎ、メソッド呼び出し・定数読み取り・ivar読み取りなどの上に**ボックス**（box、計算ノード）が乗ったグラフへと落とし込まれる。型はリテラルや既知のポイントで注入され、**グラフが不動点（fixpoint）に達するまでエッジに沿って伝播する**（ワークリストが空になる）。メソッドパラメーターの型は文字どおり「すべての呼び出しサイトにわたってそこに流れ込んだあらゆる実引数型のユニオン（union）」であり、これこそがTypeProfがパラメーターを推論するのに呼び出しサイト（またはドライバー）を必要とする理由であり、その看板の製品がキュレートされた診断ストリームではなく生成されたRBSである理由でもある。プロジェクト自身のフレーミング: *「Rubyプログラムを型レベルで抽象的に実行するRubyインタープリター」*（[doc.md:29](https://github.com/rigortype/rigor/blob/master/references/typeprof/doc/doc.md)）。

これは、付録の「プログラム全体vsローカル」というRigorとの対比（カタログに対するメソッドごとの推論、推論バジェット（inference budget）で境界づけ）に対するメカニズム面の裏づけである。

---

## 1. 収束／ワークリストのメカニズム

解析全体は、`GlobalEnv`（`lib/typeprof/core/env.rb`）に保持される**不動点までのFIFOワークリスト**である:

```ruby
def add_run(obj)
  unless @run_queue_set.include?(obj)
    @run_queue << obj
    @run_queue_set << obj
  end
end

def run_all
  until @run_queue.empty?
    obj = @run_queue.shift
    @run_queue_set.delete(obj)
    obj.run(self) unless obj.destroyed
  end
end
```

- キューは（再）実行する**ボックス**（と呼び出しサイト）を保持する。`@run_queue_set`が重複排除し、ボックスは最大1回しかキューに入らない。
- 不動点 = `@run_queue`が空になること。束（lattice）が単調である（型は前方パスの間に追加されるだけ。削除／インクリメンタルについては後述の§を参照）ため、これは停止する。
- ボックスは**その入力頂点のひとつが変化したときに（再）エンキュー**される。トリガーは`Vertex#on_type_added`（`graph/vertex.rb:145-166`）にある: 頂点に新しい型を追加すると、`@next_vtxs`内のすべての後続に対して`on_type_added`が呼ばれ、ボックスは自身を入力の後続として登録する（例えば`MethodCallBox`はコンストラクタで`@recv.add_edge(genv, self)`と`arg.add_edge(genv, self)`を行う、`graph/box.rb:1011-1015`）。つまり「レシーバが新しい型を得た」⇒ 呼び出しボックスが再実行される ⇒ 新しいエッジ／型を追加しうる ⇒ 下流のボックスが再実行される。

### 頂点は参照カウントされる型の*マルチセット*

`Vertex`（`graph/vertex.rb:125-208`）は型のフラットな集合を**格納しない**。`@types[ty] => Set(source_vars)`を格納する——つまり各型が*どの上流ソースがそれを寄与したか*を覚えている。`on_type_added`は真に新しい型（`new_added_types`）だけを前方伝播し、`on_type_removed`（`vertex.rb:168-183`）はデクリメントする: 型が頂点から削除される（そして削除として伝播される）のは、**それを寄与する最後のソースが消えたときに限られる**。この参照カウントこそが**インクリメンタルな再解析**を正しくするもの: 世界を再計算することなく、あるファイルの寄与を撤回できる。

`Source`（`vertex.rb:73-123`）はその不変な対応物——リテラルと既知の型に使われる固定の型集合である。入力を持たず、決して再実行されない。エッジを*供給する*だけである。

### ChangeSet — ボックス実行ごとのdiffとロールバック

各ボックスは、**前回の**実行で生成したエッジ・サブボックス・診断を記録する`ChangeSet`（`graph/change_set.rb`）を所有する。再実行時には、新しい実行の出力が記録された集合に対して**diffされる**: 古くなったエッジ／ボックス／診断は削除され、新しいものがインストールされる。これがインクリメンタリティの単位である——「ファイルを編集 → 影響を受けたボックスだけを再実行し、それらが以前に出力したものを正確にロールバックする」。

### インクリメンタルなエントリーポイント

`Service#update_rb_file`（`core/service.rb`、~60-75行）が編集サイクルを駆動する: `node.define` / `prev_node.undefine`の後に`define_all`、続いて`node.install` / `prev_node.uninstall`の後に`run_all`。`define`/`install`の分割は2パス構成: `define`はエンティティ（クラス・メソッド・定数）をグローバル名前空間に登録する。`install`はデータフローグラフ（頂点 + ボックス）をマテリアライズし、ワークリストにシードを与える。

> 付録との結びつき: これは遠藤氏がRubyKaigi 2023の「Revisiting TypeProf」トークで述べた、v2の「最初からIDE向け／インクリメンタルに設計された」アーキテクチャである——元のバッチ設計にインクリメンタルなIDE更新を後付けできなかった*ため*に、このリブートは存在する。

---

## 2. 「ボックス」とは何か、そしてその分類

**ボックス** = **入力頂点を（エッジ経由で）消費し、ドメインロジックを実行し、出力頂点（典型的には`@ret`頂点）に書き込む**グラフノード。基底の`Box#run`（`graph/box.rb:36-`）は`run0`（サブクラスごとのボディ）をChangeSetの記帳でラップする。付録のフレーミング（「TypeProfは呼び出し先のボディを再解釈する」）はここで実現される: `MethodCallBox`が再実行されること*こそ*が再解釈である。

サブクラス（すべて`graph/box.rb`内）、それぞれ1行で:

| ボックス | 役割 |
| --- | --- |
| `MethodCallBox` (1006) | 呼び出しサイト: レシーバを解決 → 呼び出し先を見つける → 引数↔パラメーターを配線し、呼び出し先の戻り→`ret`。心臓部。§3を参照。 |
| `MethodDefBox` (669) | Rubyの`def`: 仮パラメーター頂点を保持し、すべての`return`パスを戻り頂点にユニオン化し、すべての呼び出し元から実引数を受け取る。 |
| `MethodDeclBox` (237) | RBSのメソッド宣言: オーバーロード集合を保持する。実引数を宣言された仮引数に対して**型検査**し、宣言された戻り型を寄与する。ボディは実行しない。 |
| `MethodAliasBox` (974) | `alias`: あるメソッド名を別の名前にリダイレクトする。 |
| `ConstReadBox` (53) | 定数参照 → 解決された値型。 |
| `TypeReadBox` (73) | RBS型アノテーションを伝播する頂点へとマテリアライズする。 |
| `IVarReadBox` (1263) | `@ivar`の読み取り。**クラスごと**に集約される（インスタンスごとではない——doc.md:64を参照）。 |
| `CVarReadBox` (1329) | `@@cvar`の読み取り。 |
| `GVarReadBox` (1248) | `$gvar`の読み取り。 |
| `SplatBox` (602) | `*arr`の展開 → 要素頂点。 |
| `HashSplatBox` (643) | `**hash`の展開 → キー／値頂点。 |
| `EscapeBox` (568) | `return`/`next`——エスケープする値を捕捉し、宣言された戻りに対してチェックする。 |
| `MAsgnBox` (1372) | 多重代入`a, b = ...`の分解。 |
| `InstanceTypeBox` (1416) | 型引数付きのインスタンス型を構築する（ジェネリックのインスタンス化サポート）。 |

「Ruby呼び出しは引数を渡す／RBS呼び出しは引数を型検査する」という分割（`MethodDefBox`と`MethodDeclBox`の双対）が、推論vs検査の負荷を担う区別である。

---

## 3. メソッド呼び出しの解決と手続き間フロー（心臓部）

これは、付録の「呼び出しサイトからパラメーターを推論するか: **はい**」の行が依拠するメカニズムである。`MethodCallBox`のコンストラクタ（`box.rb:1006-1018`）:

```ruby
def initialize(node, genv, recv, mid, a_args, subclasses)
  super(node)
  @recv = recv
  @recv.add_edge(genv, self)          # re-run when receiver type changes
  @a_args = a_args
  @a_args.each_arg { |arg| arg.add_edge(genv, self) }  # ...or when any arg type changes
  ...
end
```

`run0`では、**レシーバ型を**具体的な`Type::Instance` / `Singleton`へ**解決し**、**メソッド探索チェーン**（prependされたモジュール → 自身のクラス → includeされたモジュール → スーパークラス）を歩き、解決された各呼び出し先について`MethodDecl`（RBS）または`MethodDef`（Ruby）のいずれかをyieldする。続いて:

- **Ruby defパス（推論）:**呼び出し先の`MethodDefBox`が**各実引数頂点 → 対応する仮パラメーター頂点**を接続する（`changes.add_edge(genv, a_args.positionals[i], f_vtx)`）。`Vertex`はすべての入力エッジから型の*マルチセット*を蓄積するため、パラメーターの推論された型は**すべての呼び出しサイトからの引数型のユニオン**になる。呼び出し先の戻り頂点（すべての`return`／暗黙パスのユニオン）が呼び出しサイトの`@ret`へとエッジで戻される**。これがプログラム全体の手続き間フローである**: 型はグラフのエッジによって呼び出し元→呼び出し先（引数）および呼び出し先→呼び出し元（戻り）へと流れ、別個のサマリーや制約集合は存在しない。
- **RBS declパス（検査）:** `MethodDeclBox#resolve_overloads`が実引数を宣言された仮引数型に対してマッチさせ（`match_arguments?`）、マッチすると**宣言された**戻り型を呼び出しの`@ret`へエッジで渡す。ここでは引数は*検査される*のであって、*そこから学習される*のではない——宣言が権威を持つ。

**ブロック／`yield`:**ブロック引数は`Type::Proc`値を保持する頂点として運ばれる（`type.rb:196-210`、Procはブロックのコードオブジェクトをラップする）。ブロックパラメーターも同じエッジのやり方で配線される。`yield`はyieldされた引数をブロックのパラメーターへ流し、ブロックの結果を戻す。（配線レベルでは確認済みだが、正確なブロックパラメーターのファンアウトは1行ずつ追跡していない——後述でフラグを立てる。）

**付録にとっての帰結:** `String`でしか呼ばれないアノテートされていないパラメーターは`(String)`を推論する**。頑健性に基づく拡大は存在しない**——TypeProfは流れたものを報告する。これはまさに「推論の燃料としてのテスト」セクションが描くADR-5の対比である: Rigorの`--params=observed`は、その同じ観測を契約（contract）ではなく*レビューすべき提案*として意図的に扱う。

---

## 4. AST → グラフの構築

`lib/typeprof/core/ast.rb`（+ `ast/*.rb`）はPrismのASTノードをグラフのフラグメントへと落とし込む。各`AST::Node`は、その値を表す頂点を返す`install0(genv)`を実装する。

- **リテラル**（`ast/value.rb`）: `IntegerNode#install0` → `Source.new(genv.int_type)`、`FloatNode` → `Source.new(genv.float_type)`**。値は捨てられる**——`42`は`Integer`インスタンス型になる。例外は`SymbolNode#install0` → `Source.new(Type::Symbol.new(genv, @lit))`であり、これは**リテラルのシンボルを保持する**。（§5を参照。）
- **ローカル変数:** `LocalEnv`（`@locals[name] => Vertex`）に**変数ごと・レキシカルスコープごとに1頂点**で格納される。読み取りはその頂点を返し、書き込みはRHSをそこへエッジでつなぐ。完全なSSAではないが、外側の変数を変異させうるブロックには新しい頂点が差し込まれる（`new_var`/`set_var`）ので、クロージャの効果がモデル化される。
- **メソッド呼び出し**（`ast/call.rb`）: `ActualArguments`（位置／キーワード／スプラット／ブロックの頂点）を構築し、`MethodCallBox`を発行する。ボックスの`@ret`が呼び出しの値頂点である。
- **`def`**（`ast/method.rb`）: `MethodDefBox`を登録する。ボディスコープ内で仮パラメーターごとに1頂点を作成する。
- **`if`／分岐**（`ast/control.rb`）: **TypeProfはフローセンシティブにナローイング（narrowing）を行う**。`BranchNode#install0`は`@cond.narrowings`（`[then_narrowing, else_narrowing]`のペア）を呼び、各アームごとに変更される変数1つにつき新鮮な頂点をクローンし、アーム内でナローイング制約を`AST.with_narrowing`経由で適用したうえで、アームの結果を`if`の値へとユニオン化する。したがって`if x.is_a?(String)`は、then-アーム内で`x`を`String`へ**実際に**再型付けする。完全なメカニズムは§10aを参照——これは本ノートの初期ドラフトが誤って「フローナローイングなし」と主張していたのを訂正するものである。

---

## 5. リテラルと精度のポリシー（検証済み）

`doc/doc.md:93-135`（「Abstract values」）+ ソースより:

- **クラスへ抽象化（値は捨てられる）:**クラスのインスタンス——`42` → `Integer`、`"str"` → `String`、`nil`/`true`/`false` → `NilClass`/`TrueClass`/`FalseClass`のインスタンス型（`type.rb:99-107`が`show`でこれらを特別にレンダリングする）**。`Constant<1>`に相当するものはない**。これがRigorとの最大の内部表現の違いである。
- **具体的に保持:**
  - **クラスオブジェクト**——`Integer`、`String`の定数は`Type::Singleton`であり、`Class`へ*抽象化されない*。定数参照とクラスメソッドのディスパッチがその同一性を必要とするためである（`doc.md:113-116`）。
  - **シンボル**——`:foo`は`Type::Symbol(:foo)`のまま留まる。キーワード引数・JSONキー・`attr_reader`名などのために具体値が必要だからである（`doc.md:118-120`）。ただし*動的な*シンボル（`:"foo_#{x}"`、`String#to_sym`の結果）は`Symbol`インスタンス型にフォールバックする。
- **構造は保持（RigorとTypeProfがともに持つ精度）:**
  - `Type::Array`（`type.rb:110-169`）は、**タプル状リテラル**（`[1, "a"]` → `[Integer, String]`）のためのオプショナルな頂点の`@elems`配列に加え、拡大されたビューのための統一された`@base_type`（`Array[Integer | String]`）を運ぶ。
  - `Type::Hash`（`type.rb:171-194`）と`Type::Record`（`type.rb:277-310`）は、リテラルキーのハッシュ（`{name: ..., age: ...}`）について**キーごとのフィールド型**を保持する。
- **`untyped`**は明示的なギブアップ値である（`doc.md:122-123`）: トレースが失敗したときに生成され、それに対するあらゆる操作は`untyped`を生む。これはTypeProfの保守性のつまみである——*「不確実性に直面したら、誤った診断を出すよりも`untyped`を推論することを好む」*（二次ソース、ドキュメントと整合）。

これらを付録の語彙表に対応づけると: TypeProfの出力列（`1`→`Integer`、`"foo".upcase`→`String`）は、RigorのRBS消去が境界で生成するものと*まったく*同じである——違いは、Rigorが`Constant`/`Refined`/`IntegerRange`を*内部的に*保持し境界でのみ消去するのに対し、TypeProfはそもそもそれらを持っていなかった点である。

---

## 6. RBSエクスポート（CLIの主たる製品）

レンダリングは`Vertex#show`（`vertex.rb:24-66`）が`Type#show`（`type.rb`、各サブクラス）を合成して行う。`Vertex#show`で注目すべき点:

- 型のマルチセットを反復し、**`TrueClass`+`FalseClass` → `bool`に畳み**、`NilClass`を末尾の`?`（オプショナル）として持ち上げ、`bot`を落とす。
- 0型 → `untyped`（または`nil`/`bot`）、1型 → その型（+`?`）、複数 → `(A | B | C)`（+`?`）。
- 決定性のためにソート + uniq化される。

メソッドシグネチャは`MethodDefBox#show`が組み立てる: 仮パラメーターの`show`をパラメーターリストとして連結し、`-> #{@ret.show}`（`initialize`の場合は`void`）。再帰ガード（`Fiber[:show_rec]`、`vertex.rb:25-30`）はサイクルで`untyped`を出力する——再帰型はループするのではなく`untyped`へ劣化する。**名前的型（nominal type、公称型とも）への拡大が「起こる」のは、単に頂点がそれより狭いものを決して保持しなかったからである**——出力に対する別個の拡大パスは存在しない。抽象化はリテラル注入の時点（§5）で既に起きている。

---

## 7. RBSの*入力*

`Service#load_core_rbs`（`core/service.rb`、~10行）は`rbs` gem経由でコア／stdlibのRBSをロードし、各宣言を`AST.create_rbs_decl`を通して変換し、続いて`define`/`install`/`run_all`を行う——つまり**RBS宣言は推論されたコードとまったく同じグラフ**に、`MethodDeclBox`ノードとして入る。ユーザーの`sig/`はCLIで与えられる（`typeprof sig/app.rbs app.rb`、`doc.md:11-15`）。メソッドエンティティは`decls`（RBS）と`defs`（Ruby）の**両方**を運べる。呼び出しサイトでは`MethodCallBox`が両方を参照する——宣言された型は権威ある制約／戻りソースとして振る舞い、推論された`def`は学習されたパラメーター／戻り型を寄与する。こうして手書きのRBSと推論はひとつのメソッド上で共存する。

> これはSteepの付録とTypeProfの付録の共存セクションが述べるのと同じ「共有入力としてのRBS」のポイントである: 3つのツール（Steep、TypeProf、Rigor）はすべて同じ`.rbs`を読む。

---

## 8. 副産物としての診断

エラーは別個のリンターパスではなく**ボックス実行の内部**で発行される——付録の「診断は副作用であるvs Rigorの主たる製品」というフレーミングを裏づける:

- 未定義メソッド: `MethodCallBox`の解決中、呼び出し先が見つからなかったとき（`changes.add_diagnostic(..., "undefined method: ...")`）。サイトごとに小さなエラー上限がある。
- アリティ（arity）／引数の不一致: `MethodDefBox`での引数→パラメーター配線中、または`MethodDeclBox`でのオーバーロードマッチング中。
- 戻り型の誤り: `EscapeBox`がエスケープする値を宣言された戻りに対してチェックする。

診断はボックスの`ChangeSet`に蓄積され、エッジとまったく同じようにdiffで出し入れされるので、編集に伴ってインクリメンタルに現れたり消えたりする。**キュレーション層／重大度モデル／偽陽性の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>のゲートは存在しない**——ストリームは「抽象解釈がつまずいたもの」であり、これこそがドキュメントやトークがTypeProfを*「コードを判定するためではなく、理解するために最適化されている」*とフレーミングする理由である。

---

## 9. Rigor ↔ TypeProf: フィードバックvs根本的な分岐

このセクションは比較をRigorの側からとらえ直す: *Rigorの設計はTypeProfに何を教えられるか*、そして*Rigorの設計はどこで根本的に異なっていて、そのギャップが直すべきバグではなく異なる賭けの帰結なのか*。この区別が重要なのは、両者が同じゴールを持つ競合相手ではないからである——TypeProfは*コードを理解する*こと（RBSを推論・出力、IDEファースト、寛容）、Rigorは*コードを判定する*こと（バグを証明、偽陽性の規律、リポジトリ全体にわたってスケール）。以下の各行は§1〜§8で確立したメカニズムに固定されている。

### 9a. RigorがTypeProfにフィードバックできる要素（移植可能——アイデンティティの喪失なし）

これらは、Rigorが実証した精度／エルゴノミクスのアイデアであり、TypeProfが**プログラム全体の型レベル実行を放棄することなく**採用できるものである。それらはTypeProfを、それが既にそうであるものとして強化する。

1. **出力時拡大を伴うリテラル／リファインメントキャリア**。
   TypeProfは`install0`でリテラル値を捨てる（`42`→`Integer`、`value.rb`）が、それでも具体的なシンボル（`Type::Symbol(:foo)`）や構造的なArrayの`@elems`／Recordのフィールド（§5）を*既に*保持している。つまり「具体値を運ぶTypeサブクラス」という前例が内部に存在する。Rigorの貢献は*その周辺の規律*である: 内部的に保持されるが**境界で名前的型のRBSへ消去される**`Constant`/`Refined`/`IntegerRange`キャリア（RigorのRBS消去契約、§6が自然な消去ポイント——`Vertex#show`）。TypeProfはホバー精度と組み込みの定数foldingのためだけに`IntegerLiteral`/`StringLiteral`を追加し、`show`で拡大できるだろう**。注意点:**型のマルチセットが膨れ上がる（`42`と`43`は別個の型）——TypeProfのプログラム全体のグラフは、Rigorのバジェット付きメソッドごとエンジンよりもはるかに膨張に敏感なので、これにはRigorがほぼスキップできる明示的な「N個のリテラルの後に拡大する」戦略が*必要になる*。

2. **オプトインのキュレートされた診断層 + 重大度モデル**。
   TypeProfのエラーは`run0`の途中で発行される副産物（§8）であり、キュレーションも重大度プロファイルも抑制文法もない。Rigorの`diagnostic-policy`（ドット区切り識別子の分類体系、`severity_profile`、`# rigor:disable`）は**同じシグナルの上に乗った純粋な層**であり——推論の内部には一切触れない。TypeProfはこれをデフォルトでは判定者にならずに*オプションのリントモード*として出荷できるだろう（「デフォルトで」がなぜそれを壊すかは9b.2を参照）。

3. **パラメーターに対する頑健性原則の出力ポリシー（ADR-5）**。
   TypeProfは観測された狭いパラメーターをそのまま出力する: `String`でしか呼ばれないメソッドは`(String)`になる（§3——パラメーターは実引数頂点のユニオン）。Rigorのスタンスは、この観測が契約ではなく*レビューすべき提案*であるというものであり、ケイパビリティ（capability）ロールへ向けて拡大する。TypeProfのRBS出力（`MethodDefBox#show`、§6）が「寛容なパラメーター、厳格な戻り」のリライトを適用するまさにその場所である——その「流れたものを記録する」モデルと完全に互換である。

4. **戻り型の寄与のための公開プラグインサーフェス（surface）**。
   TypeProfは*種*を持っている——`me.builtin[...]`経由でディスパッチされる組み込みフック（`box.rb:1037`）。Rigorはこのアイデアを第一級のプラグインAPI（`flow_contribution_for`、リテラル引数をキーとする戻りのオーバーライド）へと昇格させた。TypeProfはそのハードコードされた`builtin.rb`のディスパッチを、登録済みでサードパーティ拡張可能なAPIへと卒業させられるだろう。コアモデルとの衝突はない。

5. **参照カウントによるインクリメンタリティは既に共有のDNA——Rigorがこの賭けを検証している**。
   TypeProf*への*フィードバックというよりは収束的な確認である: TypeProfの参照カウントされた型マルチセット + ChangeSetのdiffロールバック（§1）と、Rigorのファイルごとキャッシュ（ADR-6）は、独立に「世界を再計算することなくあるソースの寄与を撤回する」へ到達した。両方のエコシステムがここに着地したことは記録に値する。

### 9b. Rigorが根本的に分岐する箇所（移植不可——異なる賭け）

これらはTypeProfが「欠いている」改善ではない。Rigorが異なる土台の賭けをすることで*手に入れた*性質であり、TypeProfはTypeProfであることをやめずにそれらを採用できない。

1. **スケール: ローカル推論 + 境界カタログ + バジェットvsプログラム全体の再解釈**。
   Rigorは一度に1メソッドを推論し、呼び出し先を*カタログ*（コア／stdlib／gemのRBS、プラグイン貢献）で引き、推論バジェットで境界づけられ、ファイルごとにキャッシュされる。TypeProfの手続き間フローは、呼び出し先の`MethodDefBox`を生きたグラフノードとして再解釈するエッジ*そのもの*である（§3）——メソッドサマリーはなく、ボディが再実行される。これがTypeProfの「小さなプログラム向け／プロトタイピングパスとして設計された」という位置づけの根本である。**負荷を担うポイント:** TypeProfの看板能力である*呼び出しサイトからのパラメーター型推論*は、プログラム全体のエッジ配線の直接的な帰結である。Rigorのスケールを得るためにそれをローカル+カタログで置き換えることは、**TypeProfを定義するまさにその機能を削除する**ことになる。これは単に高コストなのではなく、構造的に和解不能な唯一の分岐である。

2. **判定vs理解——偽陽性の規律の核**。
   Rigorの最上位の価値は「最悪ケースの静的解釈よりもプログラムが動くことが上位。動いているコードを決して脅かさない」である。バグが*証明可能*でない限り沈黙を保つ。TypeProfの核は「不確実なときは`untyped`を推論する」（§5、`doc.md:122`）であり——寛容で、明示的に*ゲートではない*。偽陽性の規律を**デフォルト**の姿勢にすること（9a.2のオプトインのリント層に対して）は、メカニズムの変更ではなく*目的*の変更である。デフォルトでCIをゲートするTypeProfは、別の名前を持つ別のツールである。

3. **リファインメント型の*キャリア*——フローナローイングそのものではない（訂正）**。
   初期ドラフトはここに「ナローイングなし」と書いていた。それは誤りである: TypeProfは型同一性述語（`is_a?`／`nil?`／`case-when`／`&&`／`||`。§10a）に対して既にフローセンシティブ（flow-sensitive）なoccurrence typingを行う——分岐ごとに頂点をクローンし、`IsAFilter`／`NilFilter`を適用する。真の分岐はもっと狭い: Rigorは**値述語**（`s.empty?`、`n > 0`）を、リファインメントの束（lattice）から引かれた**名前付きのリファインメントキャリア**（`non-empty-string`、`positive-int`）へとナローイングし、それらのキャリアを推論とRBS::Extendedに通す。TypeProfにはリファインメントキャリアの概念がない——そのナローイングはクラス同一性とnil性でフィルタするのであって、値述語で名付けられた部分型でフィルタするのではない。したがってこれは「原理上は移植可能だが大きな追加」（新しい制約／フィルタのファミリー + キャリアの束）であって、初期ドラフトがほのめかした構造的な不可能性ではない。

4. **アナライザ全体の法則としての非対称な著述（厳格な戻り／寛容なパラメーター）**。
   Rigorにとってこれは、単なる出力フォーマッタではなく、*すべての*著述された型と受理述語の全体を形づくる広範な原則（ADR-5）である。TypeProfには著述の非対称性という概念がない——フローを対称的に記録する（引数が入り、戻りが出て、どちらも観測される）。9a.3は*出力側の半分*を後付けできるが、内部の受理規律としての原則は、「流れたものを記録する」インタープリターには居場所がない。

### 9c. 1行の総合

TypeProfは**精度**（9a.1のリテラルキャリア。9b.3に沿ったリファインメントキャリアのナローイング——TypeProfは既に型同一性のoccurrence typingを持つ、§10a）と**出力の作法**（9a.2の診断、9a.3の頑健性、9a.4のプラグイン）でRigorへ近づける——いずれもそのアイデンティティを手放すことなく**。スケール**（9b.1）や**判定の哲学**（9b.2）でRigorへ近づくことは、別のツールにならずには**できない**。なぜならそれらは、まさにRigorがプログラム全体の型レベル実行ではなくローカル推論＋カタログに賭けることで手に入れたものだからである。この移植不可能性こそが、一方が他方を包摂するのではなく*両者が共存する理由*（付録の並列パターン）である。

---

## 10. 検証パス（2026-06-01）——正直なフラグの解消

フラグを立てた4項目をベンダリング済みソースに対して直接再検証した。このセッションのツール出力は断続的に壊れていた（Readが誤ったオフセットを返す。複数マッチのgrepが1行に切り詰められる）ため、**首尾一貫し、再現性があり、内部的に整合した**コード抜粋に裏づけられた発見のみを確認済みとして記録し、残りは明示的に部分的なままとする。

> **訂正告知**。この§10の最初の版（同日早くにコミット）は「確認: フローセンシティブなナローイングはゼロ」と述べていた。**それは誤りだった**——劣化したセッションに起因する検証ミスであり、その中で`grep narrow`が空を返し（コマンドが実際には走っていなかった）、`ast/control.rb`は一度も完全には読まれなかった。クリーンな2回目のパス（`control.rb`の直接の完全読解 + 2つの独立したサブエージェントのトレース、すべて一致）は、TypeProf v0.31.1が**実質的なoccurrence typingのナローイングサブシステム**を持つことを示している。以下のテキストは訂正後の発見である。本ノートは規範的なリファレンスを意図しているため、この教訓を正直に記録する。

### 10a. ナローイング——存在を確認（型同一性述語に対するoccurrence typing）

`ast/control.rb`（737行）に加えて`env/narrowing.rb`と`graph/filter.rb`が、実際のフローセンシティブなナローイングパスを実装している。`grep -rin "narrow" lib/`は**94**件の出現を返す。

**エンジン**（`AST.with_narrowing`、`control.rb:17-50`）: `Narrowing`（`{var => Constraint}`のマップ）が与えられると、各変数の現在の頂点を保存し、`narrowed_vtx = original_vtx.new_vertex(...)`を導出してから`constraint.narrow(...)`し、ナローイングされた頂点をローカル環境にセットし、`yield`経由で分岐ボディを実行し、その後復元する。インスタンス変数はpush/popのナローイングスタックを使う（`env.rb:403-416`）。

**制約**（`env/narrowing.rb`）: `IsAConstraint`、`NilConstraint`、加えて合成のための`AndConstraint`／`OrConstraint`**。フィルタ**（`graph/filter.rb`）: `IsAFilter`（クラス同一性によって保持／除外）、`NilFilter`（`nil`を保持／除去）、`BotFilter`（到達不能なアームを刈る）。

**ナローイングがどこから来るか**（`narrowings`は`[then, else]`のペアを返す）:
- `CallNode#narrowings`（`call.rb:266-305`）: `recv.is_a?(Klass)` → レシーバーに対する`IsAConstraint`（then = is-a、else = is-not-a）。`recv.nil?` → `NilConstraint`。`!e`はペアを入れ替える。**レシーバーがローカル変数またはインスタンス変数の読み取りである場合に限る**——任意の式ではない。
- `LocalVariableReadNode#narrowings`／ivar／`it`（`variable.rb:21-24, 71-74, 107-110`）: 裸の真偽`if x` → then-アームに対する`NilConstraint(false)`（`nil`を除去）。
- `AndNode`／`OrNode`（`control.rb:461-467, 506-512`）: 子のナローイングを`.and`／`.or`で合成し、インストール時に左オペランドのナローイングを右オペランドへ適用する（`control.rb:446-453, 490-498`）。

**消費側:**
- `BranchNode#install0`（if/unless、`control.rb:70-124`）: アームごとの頂点クローン + `with_narrowing`。その後アームは`BotFilter`で刈られて結合される。
- `CaseNode`／`WhenNode`（`control.rb:254-395`）: **ピボットナローイング**——`case x; when Konst`は節の内側で`x`を`IsAFilter`によってナローイングする（`static_ret`を持つ`ConstantReadNode`条件に限り、かつピボットがローカル変数の場合に限る）。`else`節は否定された除外フィルタを適用する。
- `LoopNode`（while/until、`control.rb:159-162`）: 裸の変数条件に対する真偽の`NilFilter`。

**これがRigorの比較にとって何を意味するか（重要な訂正）:** TypeProfは「ナローイングなし」では**ない**。**型同一性述語**（`is_a?`、`nil?`、`case/when`でのクラスマッチ、`&&`／`||`の伝播）に対するoccurrence typingを持つ。Rigorに比べて欠けているのは**リファインメント型のキャリア**である——*値述語*（`s.empty?`、`n > 0`）を**名前付きのリファインメント型**（`non-empty-string`、`positive-int`）へとナローイングすること。Rigorの際立ったサーフェス（surface）はリファインメントの束（lattice）であって、「そもそもナローイングを持つこと」ではない。付録の文言はこのより微妙な線を反映しなければならない（本ノートと併せて付録で修正済み）。

正直な既知の限界: 述語ナローイングはレシーバー／対象が裸の変数読み取りであることを要求する。`case/in`のパターンマッチング（`CaseMatchNode`、`control.rb:397-425`）はパターンをインストールして節の結果をユニオン化するが、**ピボットナローイングは示さない**。リファインメントスタイルの値述語はモデル化されていない。

### 10b. パーサー——確認: Prism ≥ 1.4.0、Ruby ≥ 3.3

`ast.rb`は`Prism.parse(src)`（`ast.rb:~4`）でパースし、`AST.create_node`はPrismのノード型シンボルでディスパッチする——`:if_node`／`:unless_node` → `IfNode`／`UnlessNode`、`:and_node`／`:or_node` → `AndNode`／`OrNode`、`:case_node` → `CaseNode`、`:case_match_node` → `CaseMatchNode`、`:while_node`／`:until_node` → `WhileNode`／`UntilNode`（`ast.rb:85-92`）。gemspec: `required_ruby_version >= 3.3`、`add_runtime_dependency "prism", ">= 1.4.0"`と`"rbs", ">= 3.6.0"`（`typeprof.gemspec:17, 31`）。

### 10c. yield／ブロックパラメーターのファンアウト——確認

呼び出しサイトで渡されたブロックは`ast/call.rb`でパースされる: ブロックの仮パラメーターは`blk_f_args`（それぞれ1頂点）に加えて`blk_f_ary_arg`の配列頂点となり、`Block.new(self, blk_f_ary_arg, blk_f_args, block_body.lenv.next_boxes)`としてラップされ、`Source.new(Type::Proc.new(genv, block))`として運ばれる（`call.rb:191`）。`Block`クラスは`env/method.rb:254-280`にある。

ファンアウト（`Block#accept_args`、`env/method.rb:265-273`）は、`a_args.positionals`を伴う`builtin.rb`の`proc_call`（`builtin.rb:28-29`）が駆動する:

```ruby
def accept_args(genv, changes, caller_positionals)
  if caller_positionals.size == 1 && @f_args.size >= 2
    changes.add_edge(genv, caller_positionals[0], @f_ary_arg)   # yield [x,y] → |a,b| auto-destructure
  else
    caller_positionals.zip(@f_args) do |a_arg, f_arg|           # yield x,y → |a,b| : a<-x, b<-y
      changes.add_edge(genv, a_arg, f_arg) if f_arg
    end
  end
end
```

つまり: 通常のケースでは位置引数の1対1の`.zip`。**単一のyield引数が≥2パラメーターのブロックに入ると**、`@f_ary_arg`（ブロックのインストール時に`SplatBox`を介して各`@f_args[i]`へ配線される）を通じて**自動分解（auto-destructure）される**。余分なyield引数は捨てられる（`if f_arg`ガード）。このパスに明示的なアリティ（arity）不一致の診断はない。ブロックの戻りは`Block#add_ret`（`env/method.rb:275-279`）を介して戻り、各ブロックボディのエスケープボックスの戻り（`box.a_ret`）を`yield`式の`ret`頂点へエッジする。

### 10d. 診断に関する注記

ブロックのファンアウトとナローイングの発見は§8を変えない: 診断はボックス実行の副産物のままである。

### 10e. 行番号の監査——正確であることを確認

§1〜§8の引用をソースに対してスポットチェックした: すべて±数行以内、ほとんどは正確。`env.rb`の`add_run` 176／`run_all` 183-194 ✓。`vertex.rb`の`on_type_added` 145-166 ✓、`BasicVertex#show` 24-66 ✓。`box.rb`の`MethodCallBox` 1006／`run0` 1024-1083／コンストラクタのエッジ1010-1015 ✓、`MethodDefBox` 669 ✓、`MethodDeclBox` 237 ✓。`type.rb`の`Type::Symbol` 229-244 ✓、`Type::Array` 110-169 ✓。`value.rb`の`IntegerNode#install0` → `Source.new(genv.int_type)`（~66）✓、`SymbolNode#install0`はリテラルシンボルを保持（~98）✓。

---

## これが付録の主張にどう対応するか

| 付録の主張 | 検証されたメカニズム |
| --- | --- |
| 「プログラム全体の抽象インタープリター」 | 不動点までのワークリストのデータフローグラフ。手続き間はエッジによる（§1、§3） |
| 「呼び出しサイトからパラメーターを推論する: はい」 | 実引数頂点 → 仮パラメーター頂点のエッジ。パラメーター = すべての呼び出し元のユニオン（§3） |
| 「呼び出し先のボディを再解釈する」（Rigorのカタログ参照に対して） | `MethodDefBox`がグラフノードとして再実行される。サマリーキャッシュなし（§2、§3） |
| 「リテラル精度: 名前的型へ拡大」 | `install0`で`42`→`Integer`。`Constant`なし（§5） |
| 「リファインメント*キャリア*なし」（訂正——TypeProfはoccurrence typingのナローイングを持つ） | TypeProfは`is_a?`／`nil?`／`!`／`case-when`／`&&`／`\|\|`でナローイングする（§10a）。Rigorに比べて欠けているのは*リファインメント型のキャリア*（値述語 → `non-empty-string`のような名前付き型）であって、フローナローイングそのものではない |
| 「RBSが出力製品である」 | `Vertex#show` / `MethodDefBox#show`がRBSをレンダリングする。エラーは副産物（§6、§8） |
| 「呼び出しサイトがパラメーター推論を駆動する（テストは呼び出しサイトの一種にすぎず——TypeProfに「テスト」という概念はない）」 | パラメーターはいずれかの呼び出しサイトが引数を供給して初めて型を得る。テストは通常の呼び出しサイトの供給源であり、特別に認識されるわけではない（§3） |
| インクリメンタル／IDEファースト（v2） | ChangeSetのdiffロールバック + 参照カウントされた頂点 + `update_rb_file`（§1） |

付録のどの主張もソースによって矛盾させられなかった。付録がいつか拡張される場合に取り込む価値のある2つの細部: (a) **シンボルはリテラル値として保持される**（付録の表が言及していない、TypeProfが*実際に持つ*小さな精度）、（b）v2の設計は単なる「バッチのプロトタイプ生成器」ではなく明示的に**インクリメンタル／IDEファースト**である——CLIはLSPの形をしたコアの上に乗ったひとつのフロントエンドである。

---

## 完全には確認できなかった点（正直なフラグ）

2026-06-01の検証パス後のステータス（次のセクションを参照）: **ナローイング**と**パーサー**は一次資料で確認済みとなった**。yield分配**と**行番号の監査**は部分的なままである。なぜならそのセッションでは作業環境のツール出力が劣化しており（誤ったReadオフセット、複数マッチgrepの切り詰め）、壊れた出力から細部を記録することは規範的なノートの目的に反するからである。

- **ブロック／`yield`パラメーターのファンアウト——解決済み**。§10cを参照。位置引数の`.zip`ファンアウトと、単一引数／複数パラメーターの自動分解の分岐。戻りはエスケープボックス経由。
- **ナローイング——解決済み（不在ではなく存在を確認）**。§10aを参照。本ノートの初期ドラフトは誤って「ナローイングゼロ」と述べていた。TypeProf v0.31.1は完全なoccurrence typingのナローイングサブシステムを持つ（`env/narrowing.rb`、`graph/filter.rb`、分岐ごとの頂点クローン）。
- **パーサー——解決済み（gemspecからPrism ≥ 1.4.0、Ruby ≥ 3.3を確認）**。§10bを参照。
- **正確な行番号——解決済み**。スポット監査は引用したすべてのエンティティが±数行以内（ほとんどは正確）であることを見出した。§10eを参照。

---

## ソース

一次（ベンダリング済み、v0.31.1にとって権威ある）:
- `references/typeprof/lib/typeprof/core/{env,service,builtin,type}.rb`
- `references/typeprof/lib/typeprof/core/graph/{vertex,box,change_set}.rb`
- `references/typeprof/lib/typeprof/core/ast/*.rb`
- [`references/typeprof/doc/doc.md`](https://github.com/rigortype/rigor/blob/master/references/typeprof/doc/doc.md) — 「What is TypeProf」+「Abstract values」

二次（設計意図／歴史——補強であり、権威ではない）:
- [GitHub: ruby/typeprof](https://github.com/ruby/typeprof) — 「experimental type-level Ruby interpreter」
- 遠藤侑介（Mame）、[Revisiting TypeProf — IDE support as a primary feature, RubyKaigi 2023](https://rubykaigi.org/2023/presentations/mametter.html) — v2／インクリメンタルのリブート
- 遠藤侑介、[TypeProf for IDE, RubyKaigi Takeout 2021](https://rubykaigi.org/2021-takeout/presentations/mametter.html)
- 遠藤侑介、[Good first issues of TypeProf, RubyKaigi 2024](https://speakerdeck.com/mame/good-first-issues-of-typeprof) — Source/Vertex/Boxアーキテクチャのスライド
- [Ruby News: TypeProf — Abductive Reasoning for Abstract Interpretation](https://ruby.news/2021/08/23/TypeProf-Abductive-Reasoning-for-Abstract-Interpretation.html)
