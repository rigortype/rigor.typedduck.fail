---
title: "TypeProf内部調査 — 推論ロジック + 内部型表現"
description: "Imported from rigortype/rigor docs/notes/20260531-typeprof-internals-survey.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260531-typeprof-internals-survey.md"
sourcePath: "docs/notes/20260531-typeprof-internals-survey.md"
sourceSha: "94576a604597a9405283d7d086555c2d704b5447cff3515b189f088acd281516"
sourceCommit: "9512274ab492510e555dc52fb0e13086a64959ac"
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
- **`if`／分岐**（`ast/control.rb`）: **両アームの結果頂点が**`if`の結果へと**ユニオン化される**。**値／フローのナローイング（narrowing）は実質的に存在しない**——`if x.is_a?(String)`は、Rigorの制御フロー解析がするようにアーム内で`x`を`String`に再型付けしない。これはRigorのリファインメント（refinement、篩型とも）に対する現実の精度ギャップであり、付録の「Rigorが持つもの: 自動ナローイングを伴うリファインメントキャリア（carrier）。TypeProfはそれらを拡大して消す」の行はここに根拠を持つ。（ナローイングのサポートはバージョンを追って狭い範囲で成長してきた。v0.31.1には一般的なoccurrence typingのパスは見つからなかった——後述でフラグを立てる。）

---

## 5. リテラルと精度のポリシー（検証済み）

`doc/doc.md:93-135`（「Abstract values」）+ ソースより:

- **クラスへ抽象化（値は捨てられる）:**クラスのインスタンス——`42` → `Integer`、`"str"` → `String`、`nil`/`true`/`false` → `NilClass`/`TrueClass`/`FalseClass`のインスタンス型（`type.rb:99-107`が`show`でこれらを特別にレンダリングする）**。`Constant<1>`に相当するものはない。**これがRigorとの最大の内部表現の違いである。
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

診断はボックスの`ChangeSet`に蓄積され、エッジとまったく同じようにdiffで出し入れされるので、編集に伴ってインクリメンタルに現れたり消えたりする。**キュレーション層／重大度モデル／偽陽性ディシプリンのゲートは存在しない**——ストリームは「抽象解釈がつまずいたもの」であり、これこそがドキュメントやトークがTypeProfを*「コードを判定するためではなく、理解するために最適化されている」*とフレーミングする理由である。

---

## これが付録の主張にどう対応するか

| 付録の主張 | 検証されたメカニズム |
| --- | --- |
| 「プログラム全体の抽象インタープリター」 | 不動点までのワークリストのデータフローグラフ。手続き間はエッジによる（§1、§3） |
| 「呼び出しサイトからパラメーターを推論する: はい」 | 実引数頂点 → 仮パラメーター頂点のエッジ。パラメーター = すべての呼び出し元のユニオン（§3） |
| 「呼び出し先のボディを再解釈する」（Rigorのカタログ参照に対して） | `MethodDefBox`がグラフノードとして再実行される。サマリーキャッシュなし（§2、§3） |
| 「リテラル精度: 名前的型へ拡大」 | `install0`で`42`→`Integer`。`Constant`なし（§5） |
| 「リファインメント／ナローイングキャリアなし」 | `if`アームがユニオン化される。v0.31.1には一般的なoccurrence typingなし（§4） |
| 「RBSが出力製品である」 | `Vertex#show` / `MethodDefBox#show`がRBSをレンダリングする。エラーは副産物（§6、§8） |
| 「必須の燃料としてのテスト」 | パラメーターは呼び出しサイト（またはドライバー）が引数を供給して初めて型を得る（§3） |
| インクリメンタル／IDEファースト（v2） | ChangeSetのdiffロールバック + 参照カウントされた頂点 + `update_rb_file`（§1） |

付録のどの主張もソースによって矛盾させられなかった。付録がいつか拡張される場合に取り込む価値のある2つの細部: (a) **シンボルはリテラル値として保持される**（付録の表が言及していない、TypeProfが*実際に持つ*小さな精度）、（b）v2の設計は単なる「バッチのプロトタイプ生成器」ではなく明示的に**インクリメンタル／IDEファースト**である——CLIはLSPの形をしたコアの上に乗ったひとつのフロントエンドである。

---

## 完全には確認できなかった点（正直なフラグ）

- **ブロック／`yield`パラメーターのファンアウト:**ブロックが`Type::Proc`頂点であり配線されていることは確認したが、正確な複数パラメーターのyield分配は1行ずつ追跡していない。
- **ナローイング:** v0.31.1に一般的なoccurrence typing／フローナローイングのパスは見つからなかったが、`ast/control.rb`を網羅的には読んでいない。特別扱いされたナローイングが存在するかもしれない。
- **正確な行番号**は、私の読み取りとExploreサブエージェントの読み取りの間でずれる。引用したメカニズムは検証済みだが、個々の行番号は±数行と捉え、規範的なドキュメントで引用する前に再grepすること。
- TypeProfは**Ruby 3.3+**を要求し、パーサーとして**Prism**を使う（gemspec／README）——ここでは再導出していない。

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

---

## 9. Rigor ↔ TypeProf: フィードバックvs根本的な分岐

このセクションは比較をRigorの側からとらえ直す: *Rigorの設計はTypeProfに何を教えられるか*、そして*Rigorの設計はどこで根本的に異なっていて、そのギャップが直すべきバグではなく異なる賭けの帰結なのか*。この区別が重要なのは、両者が同じゴールを持つ競合相手ではないからである——TypeProfは*コードを理解する*こと（RBSを推論・出力、IDEファースト、寛容）、Rigorは*コードを判定する*こと（バグを証明、偽陽性ディシプリン、リポジトリ全体にわたってスケール）。以下の各行は§1〜§8で確立したメカニズムに固定されている。

### 9a. RigorがTypeProfにフィードバックできる要素（移植可能——アイデンティティの喪失なし）

これらは、Rigorが実証した精度／エルゴノミクスのアイデアであり、TypeProfが**プログラム全体の型レベル実行を放棄することなく**採用できるものである。それらはTypeProfを、それが既にそうであるものとして強化する。

1. **出力時拡大を伴うリテラル／リファインメントキャリア**。
   TypeProfは`install0`でリテラル値を捨てる（`42`→`Integer`、`value.rb`）が、それでも具体的なシンボル（`Type::Symbol(:foo)`）や構造的なArrayの`@elems`／Recordのフィールド（§5）を*既に*保持している。つまり「具体値を運ぶTypeサブクラス」という前例が内部に存在する。Rigorの貢献は*その周辺のディシプリン*である: 内部的に保持されるが**境界で名前的型のRBSへ消去される**`Constant`/`Refined`/`IntegerRange`キャリア（RigorのRBS消去契約、§6が自然な消去ポイント——`Vertex#show`）。TypeProfはホバー精度と組み込みの定数foldingのためだけに`IntegerLiteral`/`StringLiteral`を追加し、`show`で拡大できるだろう**。注意点:**型のマルチセットが膨れ上がる（`42`と`43`は別個の型）——TypeProfのプログラム全体のグラフは、Rigorのバジェット付きメソッドごとエンジンよりもはるかに膨張に敏感なので、これにはRigorがほぼスキップできる明示的な「N個のリテラルの後に拡大する」戦略が*必要になる*。

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

2. **判定vs理解——偽陽性ディシプリンの核**。
   Rigorの最上位の価値は「最悪ケースの静的解釈よりもプログラムが動くことが上位。動いているコードを決して脅かさない」である。バグが*証明可能*でない限り沈黙を保つ。TypeProfの核は「不確実なときは`untyped`を推論する」（§5、`doc.md:122`）であり——寛容で、明示的に*ゲートではない*。偽陽性ディシプリンを**デフォルト**の姿勢にすること（9a.2のオプトインのリント層に対して）は、メカニズムの変更ではなく*目的*の変更である。デフォルトでCIをゲートするTypeProfは、別の名前を持つ別のツールである。

3. **ナローイングがないことは構造的であり、単に未実装なのではない**。
   Rigorのリファインメントナローイング（`unless s.empty?`からの`non-empty-string`、分岐ごとのフローセンシティブ（flow-sensitive）な再型付け）は第一級の制御フロー解析である。TypeProfは両方の`if`アームをユニオン化する（§4、`control.rb`）。そのグラフが「スコープごと・変数ごとに1頂点」だからである——フローセンシティビティは、単調なデータフロースケルトンの上に重ねたSSAスタイルの頂点分割を必要とする。これは*追加可能*である（先行する分析で9aに隣接する難項目として挙げられている）が、チューニングのつまみではなく構造的なレトロフィットである——「重い投資を伴えば移植可能」と「既存のグラフモデルと戦う」の境界に位置する。

4. **アナライザ全体の法則としての非対称な著述（厳格な戻り／寛容なパラメーター）**。
   Rigorにとってこれは、単なる出力フォーマッタではなく、*すべての*著述された型と受理述語の全体を形づくる広範な原則（ADR-5）である。TypeProfには著述の非対称性という概念がない——フローを対称的に記録する（引数が入り、戻りが出て、どちらも観測される）。9a.3は*出力側の半分*を後付けできるが、内部の受理ディシプリンとしての原則は、「流れたものを記録する」インタープリターには居場所がない。

### 9c. 1行の総合

TypeProfは**精度**（9a.1のリテラル／リファインメント、9a.3に隣接するナローイング）と**出力の作法**（9a.2の診断、9a.3の頑健性、9a.4のプラグイン）でRigorへ近づける——いずれもそのアイデンティティを手放すことなく**。スケール**（9b.1）や**判定の哲学**（9b.2）でRigorへ近づくことは、別のツールにならずには**できない**。なぜならそれらは、まさにRigorがプログラム全体の型レベル実行ではなくローカル推論＋カタログに賭けることで手に入れたものだからである。この移植不可能性こそが、一方が他方を包摂するのではなく*両者が共存する理由*（付録の並列パターン）である。
