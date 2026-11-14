---
title: "ADR-132 — すべての解析で共有する単一のリフレクティブ呼び出しビュー"
description: "rigortype/rigor docs/adr/132-reflective-call-view.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/132-reflective-call-view.md"
sourcePath: "docs/adr/132-reflective-call-view.md"
sourceSha: "cce34f5ee7b8dca4f368b5edc31c2414f40c82d523508bf80cb4df25df0bdc83"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-12T08:14:41+09:00"
translationStatus: "translated"
sidebar:
  order: 4132
---

ステータス: **Accepted、2026-11-12；まだどのスライスも着地していない**。メンテナーはD1〜D5を推奨どおりに批准した。最初のスライス（S0: シーム、そのユニットspec、スペリングマトリクス、および現在のカウントでのソースラチェット）は挙動を変更しない。アーキタイプ: 熟議型（deliberative）。
ステークス: 高 — シームはエンジン全体におよび、各挙動スライスは正しいコード上の診断を動かすが、各スライスは単独で可逆である。

根拠: [`docs/notes/20261112-reflective-call-inventory.md`](../../notes/20261112-reflective-call-inventory/)（36箇所のインベントリ、14プロジェクトの頻度調査、および2つの独立した設計コンサルテーションによる修正）。

## コンテキスト

Rubyには名前でメソッドに到達する方法が複数存在する。`send` / `__send__` / `public_send`、呼び出される`method(:m)`や`instance_method(:m)`のハンドル、そしてブロック渡しの`&:m`である。Rigorにはこれらに対する共有された解釈が存在しない。`lib/`内の36箇所が、`%i[send __send__ public_send]`に等しい26個の別個の定数を通じて`send`ファミリーを独自に認識している。それらには各種センサス、ミューテーションフロア、`$~` / `$_`の再束縛、returnバリア、可視性と`module_function`状態、`ScopeIndexer`の定義者ウォーカー、エフェクト、到達可能性、sig生成、チェックルール、およびタイパーのリテラルsendショートカットが含まれる。約16ファイルが`&:sym`を独立に分類し、1つのルールがメソッドハンドルチェーンをモデル化している。

各箇所は同じスペリング（書き方）に対して異なる解釈をしており、その不一致は名前リストにあるのではない。

- **抽出**。`send("push")`は、約28箇所にとっては`push`の呼び出しであるが、`SymbolNode`のみを読む残りの箇所にとってはそうではない。`send("#{m}_x")`のリテラル断片を読むのは1箇所のみである。
- **引数のシフト**。13箇所がセレクタ引数を手作業で落としている。タイパーはそれを引数の型から落とすが、外側のノードをディスパッチに渡すため、ディスパッチのティアが外側の引数リストを読み取り、`send(:Integer, "1", exception: false)`は直接呼び出しが`Integer?`と型付けされるところを`Integer`と型付けする（#1872）。
- **計算された名前に対するポリシー**。7箇所が7通りの答えを返している: テイント、`reached!`、`any_entry`、オープンワールド、「クリアしない」、`nil`、辞退。
- **見落とされたスペリング**。`send(:define_method) { }`はivarセンサスには計上されるが、ブロックselfルールでは絞り込まれず、同じブロックについて両者が食い違う（#2167）。

修正のたびに1つのコンシューマーに着地し、次のレビューでは別のコンシューマーで同じスペリングが欠落していることが見つかる。目標は、スペリングを1度だけ学習させ、すべてのコンシューマーがそれを同じように見つつ、未知の名前が何を意味するかは各コンシューマーが自身で決定できるようにすることである。

見返りは精度ではなく、一貫性とレビューコストである。リフレクティブなスペリングはまれである。調査対象とした49のチェックアウト全体で、`send`ファミリーは765万個の呼び出しノードの0.130%であり、`send`を通じて到達するメタプログラミングセレクタは0.003%、また`send`の36%はリテラル名を持たない。インベントリがこれらの箇所に対応付ける27件のイシューのうち、このビューは3件を完全にクローズし（#1872、#2167、#2704）、約11件から1項目を取り除き、約12件（レシーバー解決、クロージャ、evalセマンティクス）には触れない。本ADRは最後のグループについては約束しない。

設計に影響する2つの知見がある。

- `try_literal_send`は、すべての`send`が`Kernel#send`であると仮定している。`Mailer#send(message, flags)`が定義された状態で`Mailer.new.send(:hello, 0).even?`を書くと、`"0"`に対して`call.undefined-method`が報告されるが、Rubyは`false`を出力する。`SymbolNode`のみの抽出だけが`sock.send("payload", 0)`を同じ罠から遠ざけているため、タイパーをString名に広げることは単独では安全ではない。同じ仮定は構文的コンシューマーにも及ぶ。`ReturnBarrier.block_call?`は任意のレシーバー上の`send(:lambda) { return nil }`をラムダとして読むため、独自の`send`がyieldするクラスでは、`nil`を返すメソッドが`Integer`と型付けされる。呼び出しの過大近似は、その答えが広がる（widen）コンシューマーにとってのみ安全である。
- ノードの同一性が不可欠である。`TypeOfMemo`、`Scope#dynamic_origins` / `void_origins` / `plugin_typed_calls`、および`scope_index`（54箇所で参照）は、呼び出しノードを同一性キーとしている。`AliasMutationFloor.literal_send_target`はすでに`copy`で`CallNode`を合成しており、`StatementEvaluator`（約L2083）はコピーを`type_of`に渡しているため、そこではメモに決してヒットしない。

## 決定

1つの構文のみのシーム`Rigor::Source::ReflectiveCall`を追加し、`lib/`内のすべてのリフレクティブなスペリング認識をそこに通す。

**基準**。ビューがスペリングを正規化するのは、コアRubyがそれを1つの名前付きメソッドの1回の呼び出しとして定義しており、かつノード自身のサブツリーが次の4つの事実を確定する場合に限られる: メソッド名（またはリテラルがそれを確定しないこと）、ターゲットが受け取る引数ノードとブロックノード、`self`になるノードとルックアップの開始位置、およびRubyが可視性をチェックするかどうか。ターゲットのアリティや呼び出し可能性を変えるラッパー（`curry`、`unbind`）はチェーンを断ち切る。サブツリーを超える情報を必要とするもの（型、メソッドテーブル、ローカル変数の束縛、親ノードや兄弟ノード、コード文字列の意味、未知の名前に対する保守的な答え）は、すべてコンシューマー側に残る。

適用結果:

| スペリング | ビューに含めるか？ | 理由 |
|---|---|---|
| `send` / `__send__` / `public_send`（ネストも含む） | はい | 4つの事実がすべてサブツリーにある。名前は厳密、パターン、または計算されたものでありうる |
| `r.method(:m).call(a)`、`.()`、`[]`、`===`；`M.instance_method(:m).bind_call(o, a)`、`.bind(o).call(a)` | はい | ハンドルがレシーバーチェーンにある |
| `&:m` | はい | キャリアがyieldする最初の値が`self`、残りが引数: ノードではなく役割（role） |
| `&r.method(:m)` | はい | `self`は`r`。キャリアがyieldするすべての値が引数 |
| `r.method(:m).curry.call(a)`、`.unbind.call` | いいえ | ラッパーがアリティや呼び出し可能性を変更する |
| `m = r.method(:x); m.call`、`name = :x`を伴う`send(name)` | いいえ | 束縛を必要とする。型付きコンシューマーは`Type::BoundMethod`を使い、`ScopeIndexer#local_send_names`はローカルにとどまる |
| `instance_eval { }`、`class_exec { }` | いいえ | 名前付き呼び出しではなくフレームルール（ADR-116 WD5のコンテキスト、ブロックエントリモデル） |
| `eval("...")`、`class_eval "..."` | いいえ | コードが文字列である |
| 直接呼び出される`define_method`、`alias_method`、`instance_variable_set`、`const_get` | いいえ | 直接呼び出しである。`send`経由ではアンラップされて到達し、コンシューマーの役割チェックがその名前に対して実行される |
| ActiveSupportの`try(:m)` | いいえ | コアではない。プラグインが所有する（ADR-0） |

### WD1 — 値: 元のノードのみ

```ruby
module Rigor::Source::ReflectiveCall
  Invocation = Data.define(:node, :method_name, :name_node, :argument_offset, :block_node,
                           :self_node, :owner_node, :via, :public_only)

  def invocation(node)         # Invocation | nil — sendファミリー、ハンドルチェーン、bind_call
  def block_pass(call_node)    # Invocation | nil — `&:m` / `&r.method(:m)`としてのcall_node.block
  def called_name(node)        # Symbol | nil、アロケーションなし — node.name、リテラルターゲット、またはnil
  def argument_nodes(inv)      # Array[Prism::node] | nil — オフセットがIntegerでない場合はnil
  def may_name?(inv, name)     # サブツリーが名前が`name`になり得ないことを証明する場合のみfalse
end
```

- `node`は解析対象ツリー自身のノードである。外側の`send` / `.call` / `bind_call`の`CallNode`、またはブロック渡しの場合は`BlockArgumentNode`（`ExpressionTyper#apply_hash_block`がすでに`call_node:`として渡しているもの、expression_typer.rb約L6642）である。コンシューマーがキーとしたり報告箇所としたりするのはこれのみである。
- `method_name`はエンコーディングガードを所有する`SymbolName.of`を通じたSymbol、またはリテラルが確定しない場合は`nil`である。`nil`は「未知」を意味し、「呼び出しなし」を意味することは決してない。`name_node`はそれを綴るオペランドであり、DiscoveryIndexの行（`record_definer_name_row`のようにその位置から構築される）や部分読み取りに用いられる。
- `argument_offset`はターゲットの引数がどこにあるかを示す。
  - Integer: `node.arguments.arguments`のそのインデックスから開始する（`send` 1段につき1、`.call`は0、`bind_call`は1）。
  - `:yielded_after_self`（`&:m`）: 最初にyieldされる値が`self`、残りが引数である。
  - `:yielded`（`&r.method(:m)`）: yieldされるすべての値が引数である。
  - `nil`: 未知。splatや`...`がセレクタや束縛されたレシーバーの終わりを隠しているため（`a.send(*[:push, x])`、`bind_call(*xs)`）。mustコンシューマーは辞退し、mayコンシューマーはすべての引数ノードが渡される可能性があるものとして扱う。

  `argument_nodes(inv)`はIntegerオフセットに対してはツリー自身のノードを返し、それ以外ではnilを返すため、どのコンシューマーもSymbolでインデックス参照することはなく、`type_of(arg)`はメモにヒットし続ける。
- `self_node`はノード、`:implicit`、`:yielded`（`&:m`のみ）、またはsplatが束縛されたレシーバーを隠す場合は`nil`（`bind_call(*xs)`、`.bind(*xs).call`）であり、`nil`オフセットと同じmust/mayルールに従う。`r.method(:m).call`と`&r.method(:m)`では`r`になる。キャプチャが`method`の時点で起きるためである。`owner_node`は`instance_method`チェーンの場合のみ設定される。ルックアップは`self`のクラスではなく、そのモジュールのインスタンス側から開始する。
- `via`は支配するスペリングを名付ける。`public_only`はターゲットがpublicでない限りRubyが例外を発生させる場合にtrueとなる。`public_send`、`public_method`、`public_instance_method`、および`&:m`（Ruby 4.0.5のプローブでは`[o].map(&:priv)`に対して`NoMethodError`が発生する）である。ネストしたsenderはアンラップされ、最内層のものが支配する: `o.send(:public_send, :priv)`は例外を発生させ、`o.public_send(:send, :priv)`は値を返す。

**コードアンカー**。シームは`Source::Literals`、`SymbolName`、`AliasNames`の隣の`lib/rigor/source/reflective_call.rb`に配置され、`spec/rigor/source/require_hygiene_spec.rb`に1行追加される。その種（seed）となるのは現在存在する4つの部分ビュー、すなわち`ReceiverWriterCall.called`（receiver_writer_call.rb約L55）、`ScopeIndexer#mixin_call_view`（約L8405）と`#visibility_call_parts`（約L9612）、および`RebindingBlockCallees::Dispatch.dispatch`（dispatch.rb約L28）である。

**コスト**。非リフレクティブなノードでは、`invocation`と`called_name`は`node.name`に対する1回の凍結Setルックアップに加え、invoker名に対するレシーバーチェックのみを行う。どちらもアロケーションしない。リフレクティブなノードは`Data`を1つアロケートする。メモは持たない: ツリーをピン留めし、実行スコープのスロットを増やし（ADR-129）、それが対象とする0.13%よりも高いコストがかかるためである。

### WD2 — ガードレール: ビューがしてはならないこと

1. **解決や型付けをしない**。シームファイルは`Inference`、`Scope`、`Type`、`Reflection`、`Environment`のいずれの定数も参照しない（specでチェックする）。`send`が`Kernel#send`であるかどうかを判断しない。
2. **保守性を決定しない**。計算された名前は`method_name: nil`であり、「opaque」「any」「decline」ではない。コンシューマーは`method_name == :x`（must）か`may_name?(inv, :x)`（may）かを選択し、その選択が各呼び出しサイトに書かれたそのコンシューマー自身の保守性となる。
3. **ノードの生成、コピー、保存をしない**。ノード値を持つすべてのフィールドはツリー上のノードである。`Invocation`がHashキーになることはなく、DiscoveryIndex、シードバンドル、キャッシュ、forkペイロードに保存されることもなく、Marshalされることも決してない。行（row）にはオフセットを保存する。
4. **`CallNode`のように見せない**。`Prism::CallNode`のリーダーと同名のフィールドを持たない。それだけでは大声で失敗しない: ディスパッチティアは`respond_to?`とrescueでガードしているため、迷い込んだ`Invocation`は静かに「呼び出しではない」分岐を通り、再び#1872の形になってしまう。したがって、呼び出しコンテキストは`with`がバイパスできないよう自身の`Data`イニシャライザ内で`call_node`がPrismノードまたは`nil`であることをアサートする（WD3）。#1872は半分だけ対応していた値によるものだった。
5. **サブツリーの外を読まない**。親への遡り、ローカル変数、コード文字列、フレームワークのスペリングは扱わない。
6. **セレクタを分類しない**。`define_method`が定義を行うことや`instance_eval`が再束縛を行うことは知らない。役割名は別のテーブルに置く（WD4）。
7. **自身のスペリングセットを外に渡さない**。sender、reader、invoker、binderのセットはシーム内で`private_constant`とし、コンシューマーが`SENDERS`をインポートして独自の抽出を温存できないようにする。`invocation`を呼ばなければならない。
8. **プラグインAPIを変更しない**。プラグインは引き続き`call_node`を受け取る（ADR-2）。公開は値が落ち着くまで待つ（D4）。

### WD3 — ディスパッチはコンテキストを通じて呼び出しを読み、本物の`send`のみがリフレクティブ呼び出しとなる

**ディスパッチ**。ルールとして、各ティアは呼び出しの名前、引数ノード、レシーバー、可視性を`MethodDispatcher`の呼び出しコンテキストから読み取り、`call_node`からは決して読まない。`call_node`は同一性キーおよび報告位置としてのみとどまる。コンテキストには`argument_offset`（デフォルト0）と`public_only`が追加され、引数ノードは`ArgumentNodes.for(context)`を通じて読み取られる。変更対象となるリーダーには以下が含まれる: `RbsDispatch#splat_indices`（約L1502）、`#plain_positional_arguments?`（約L1835）、`#class_factory_argument?`（約L2011、現在サイズチェックがなくセレクタを引数として読んでいる）、`InterfaceShape`（約L119）、`KernelDispatch`（約L268）、`HashTransformKeysFolding`（約L167）、`SetFolding`（約L108）、`DataFolding`および`StructFolding`の`keyword_new?`、`ShapeDispatch`（約L356）、`MatchDataFolding`（約L71）、`ArgumentNodes.keyword_hash_last?`、`explicit_non_self_receiver?`（その外側ノードの読み取りにより現在`o.send(:priv)`がpublic-onlyになっている）、そしてプラグインコントリビューションゲート（`:send`を見て`x.send(:find, 1)`には決して適用されない）。リストが陳腐化しないよう、specがPrismで`method_dispatcher.rb`と`method_dispatcher/`を走査し、`context.call_node`、`call_node`パラメータ、またはそのどちらかから束縛されたローカル変数（`node = context.call_node`）をレシーバーとする`arguments`、`receiver`、`name`、`block`の読み取りがあれば失敗させる。コンテキストはそのイニシャライザ内で`call_node`がPrismノードまたは`nil`であることをアサートする。`try_literal_send`はその後、`call_node: inv.node`、オフセット、および`inv.public_only`を用いてディスパッチする。サイドテーブルはユーザーが書いたノードをキーとしたままになり、すべてのティアが直接呼び出しと同じ結果を見る。コンテキストはそのフィールド数で160バイトのスロット内に収まる（実測済み）。

**本物のレシーバー**。`send`が`Kernel#send`であるか、あるいは`method`が`Kernel#method`であるかはレシーバーに関する事実であるため、ビューはそれを知ることができない（WD2.1）。呼び出しが`send`という名前の通常のメソッドであると判明したとき、各コンシューマーの答えは次の2通りのいずれかになる。

- 答えが**広がる（widen）**コンシューマー（各種センサス、ミューテーションフロア、到達可能性、`$~` / `$_`のテイント、および`$?`をクリアする呼び出しとして読む`LastStatus`）は、それをリフレクティブとして読むことによる精度の低下のみを失う。チェックは不要である。
- 答えが**型を絞り込む（narrow）か診断を出力する**コンシューマー（タイパー、定数畳み込み、`ReturnBarrier`、`DefineMethodBlockSelf`および`Scope#block_self`、エフェクトエッジ、非推奨警告、可視性行）は、誤った型や偽陽性を生み出す。そのため、レシーバーの`send`（またはハンドルチェーンにおける`method` / `instance_method`）がプロジェクトやRBSのオーバーライドなしに`Kernel` / `BasicObject`へ解決されることをチェックする。スコープが利用可能な場所では型付きチェックを使う: `ReturnBarrier`の呼び出し元（`DefReturnTyper`、`StatementEvaluator`）はスコープを持っている。スコープがない場所では、より控えめな答えを取る: レシーバーが暗黙または`self`であり、かつディスカバリーインデックスが、囲むクラスの祖先にあるプロジェクトクラスにも、それがincludeまたはextendするモジュールにも、呼び出しが実行される側（`def`本体内ではインスタンス側、クラス本体または`def self.`ではシングルトン側）に`send`が定義されていないことを示す場合にのみ、その呼び出しをリフレクティブとして読む。RBSからのみ知られる祖先やまったく解決されない祖先は、定義しているものとして扱う。`__send__`と`public_send`は本物とみなす。

マトリクス（WD5）は各箇所がどちらの道を採るかを記録する。チェックを持たない絞り込み箇所は、イシューを明記した宣言済みの例外となる。

### WD4 — セレクタの役割は1回だけ宣言する

`Source::ReflectiveCall::Spellings`は役割ごとの凍結Symbol Setを保持する。ビュー自身のセット（sender、public sender、ハンドルリーダー、invoker、binder）はシームに対してプライベートにとどまり（WD2.7）、公開の役割（`BLOCK_EVALUATORS`、`STRING_EVALUATORS`、`DEFINERS`、`SINGLETON_DEFINERS`、`ALIASERS`、`IVAR_WRITERS`、`CONST_WRITERS`、`VISIBILITY_SETTERS`、…）をコンシューマーがアンラップ後にチェックする。より狭いセットを望むコンシューマーは、役割に対する式として理由を添えて記述する。一部の差異は正当なものである（`MatchRebinding::SelfCalls`は、呼び出し元の`$~`フレームを共有するのが`eval`のみであるため`EVALS = {eval}`を維持する）ため、これは1つのリストではなく役割テーブルとなり、今日の10個の不揃いなevalセットが可視化された算術となる。これはADR-116のC1（「増加する種別を1箇所で宣言する」）を名前に適用したものである。

### WD5 — 移動前にピン留めし、移動後にラチェットする

コーパスには移動が挙動を保存したことを証明できるほどのリフレクティブなスペリングが含まれていない。そのため、現在の答えの状態で2つのspecを先に着地させる。

- **スペリングマトリクス**（`spec/rigor/inference/reflective_spelling_matrix_spec.rb`）。行はスペリングである: 3つのsender × Symbol / String / 無効エンコーディングString / 式展開 / 計算 / splat名 × 暗黙 / `self` / 定数 / その他のレシーバー、ネストしたsender、ハンドルチェーン、`bind_call`、`&:m`、`&r.method(:m)`、および独自の`send`を定義するクラス。列はコンシューマーファミリーごとではなく、認識する**箇所（site）ごと**に1つとする: ファミリー列では、ファミリーのフィクスチャが別の箇所を観測している間に移動が1つの箇所の答えを変えてしまっても見逃すためである。各セルは「直接呼び出しと同じ」か、イシューまたは以下の決定の1つを名指しした宣言済み例外である。純粋なスライスは例外を追加しない。対になる箇所（#2167のセンサスと絞り込み）は列が等しいことをアサートする。
- **ソースラチェット**（`spec/rigor/source/reflective_spelling_ratchet_spec.rb`）。シーム外の`lib/**/*.rb`に対するPrismスキャンにより、sender、ハンドルリーダー、binderを名指すSymbolおよびStringリテラル、レシーバーがハンドルリーダー呼び出しである場合のinvoker名、および`Spellings`役割定数への参照をカウントする。行はファイルではなく囲む定数またはメソッド（`file#method`）をキーとするため、1行が1箇所に対応する。テーブルは厳密でS0着地時に生成され（現在約116個のsender用SymbolNode）、`spec/docs/plugin_io_boundary_spec.rb`のスタイルに倣う。無関係な用途（オプションキーとしての`:bind`、Hashキーとしての`:method`）は理由付きの独立した行とし、同じファイル内の実際の使用を隠せないようにする。カウントがどちらの方向に異なっても失敗するため、スライスはその行を減らしていくことになる。同じspecはノードの生成（`.copy(`および`Prism::*Node.new`）も現在の呼び出し元にのみ許可する。

ラチェットはどこにスペリングが書かれているかを測定し、マトリクスは各箇所が何を答えるかを測定する。どちらか一方だけでは、抽出がビューへ移ったことを示せない。ある箇所が移植済みとみなされるのは、そのラチェット行が0であり、かつそのマトリクス列にビューの答えによって取り除かれるような例外がない場合のみである。プライベートメソッドである箇所は、そこに到達する最も近い公開エントリポイントを通じて観測されるため、マトリクスのコストはプライベートサーフェスではなく列数に比例したままとなる。

その後、各スライスが名指しされたマトリクスセルを反転させる。`ScopeIndexer`が記録する内容を変更するスライスはDiscoveryIndexの`SCHEMA`をバンプする。さもなければ、ウォーム実行や`--incremental`実行が古い解釈を返してしまう。

### WD6 — スライス

純粋なスライスは、マトリクス、`make check`、`make check-plugins`においてバイト単位で同一であり、空の`tool/engine_diag_diff.rb`を示し、`tool/engine_alloc_ab.rb`においてニュートラルである（ADR-116のガードレール: 挙動変更を移動に乗せてはならない）。ビューからの箇所ごとの逸脱は、純粋な移動の間は呼び出し箇所にカウントされラベル付けされたクセ（quirk）として生き残り、後のスライスがそれを取り除く。挙動スライスは1つにつき1 PRとし、裁定済みのコーパス差分を伴う。

| # | スライス | 種別 | クローズまたは削減する対象 |
|---|---|---|---|
| S0 | シーム、ユニットspec、`Spellings`、マトリクス、ラチェット | 追加 | — |
| S1 | 4つの部分ビューと`CalleeWriteCensus.literal_send?`を載せ替える。次に、抽出がすでにビューと一致している箇所をファミリーごとに1 PRずつ移植する（センサス、フレームグローバルとフロー、`ScopeIndexer`、ルール・到達可能性・sig生成・エフェクト） | 純粋 | 定数26 → 1（`ConstantFolding`の型レベルセット） |
| S2 | SymbolNodeのみの箇所がString名も読むようにする（繰り返しの`\|\|=`、`send_extend?`）。絞り込み箇所（非推奨警告、returnバリア）はWD3のレシーバーチェックを伴う場合のみ。`private_class_method`に対する偶発的な`public_send`除外を削除する | 挙動 | 型付け以外の不一致1件、`ReturnBarrier`の誤った型 |
| S3 | WD3: オフセットチャネル、本物の`send`チェック、次にタイパーにおけるString名 | 挙動 | #1872、ユーザー定義`send`の偽陽性 |
| S4 | `send`を見落とす箇所: `DefineMethodBlockSelf`と`Scope#block_self_narrowing_unknown?`および`CensusForeignBlock`を1 PRで。Lensの`visibility_call?`、`LexicalMethodSites` | 挙動 | #2167；#2160、#2087、#2984の項目 |
| S5 | 計算された名前、1コンシューマーにつき1 PR。`may_name?`を通じたエイリアスフロアから開始 | 挙動 | #2704；#2697、#2376の項目 |
| S6 | `block_pass`上のブロック渡しリーダー | 挙動 | #2913、#1417の項目 |
| S7 | 役割セットのコンシューマーをWD4へ移し、`send`経由でこれらの呼び出しを見られるようにする | 挙動 | #3057、#2983、#1377の項目 |

シームが完了するのは、すべての箇所がWD5の意味で移植され、`reflective_call.rb`の外でラチェットが0を示し（`ConstantFolding`などの許可リストにある型レベルの用途を除く）、残るすべてのマトリクス例外がオープンなイシューまたは批准済みの決定を名指ししており、かつ新しいスペリングの追加がシーム内の1編集とマトリクス行の1追加で済むようになったときである。

## 却下された代替案

| 代替案 | 採用しない理由 |
|---|---|
| 解析前にASTを脱糖（desugar）する（Prism書き換え、またはADR-17流のプリパス） | Prismノードはイミュータブルであるため、書き換えはすべての祖先を再生成し、すべての同一性キーと位置を無効化する。書き換え後の`a.push`は可視性チェックを受けるため、`send(:private_m)`が偽陽性となり、`public_send`は`send`と区別できなくなる。`&:m`、`bind_call`、およびリテラル名を持たない36%の`send`には忠実な書き換えが存在しないため、コンシューマーは結局第2のパスを維持することになる。また、すべてのコンシューマーに単一の保守性を強いることになる。 |
| 箇所ごとのロジックを維持し、1つの定数だけを共有する | 26個の定数はすでに同一である。不一致は抽出、シフト、レシーバーフィルタリング、およびポリシーにある。3つの名前の共有定数は、意図的な3つの`public_send`除外（ターゲットがprivateである`module_function`と`main.include`、および`ruby2_keywords`非推奨警告）を平坦化することを誘発し、偽陽性を増やすことにもなる。 |
| `literal_send_target`を一般化して`CallNode`を合成する | コピーは新しい同一性になるため、`TypeOfMemo`と`scope_index`を外し、誰も読まないサイドテーブル行を書き込む。使用ごとに2つのノードをアロケートする。直接呼び出しに見えるため、すべてのコンシューマーが由来を覚えていない限り`send(:priv)`で可視性警告が発火する。`:yielded`や`owner_node`を表現できない。 |
| `MethodDispatcher`ティアとしてのみリフレクションを解決する | 型付け専用になる。36箇所のうち約30箇所は型なしで実行される構文パスである。そのティアはシームのコンシューマーであるWD3として生き残る。 |
| ファイルごとのリフレクティブ呼び出しインデックス | 0.13%の呼び出しのために、もう1つのウォークと実行スコープのスロットを増やすことになる。箇所をまたぐ解決だけがそれを正当化するが、基準はそれを除外している。 |
| ビューをADR-116 WD5の宣言ウォークのイベントにする | そのウォークを使うのは`ScopeIndexer`のみである。ビューがプリミティブでなければならず、ウォークの呼び出しイベントが後から`Invocation`を運ぶことはできる。 |
| 1つの移行PRにまとめる | 挙動を移動に乗せてはならないというADR-116のルールに反し、ホットファイルが並行レーンと衝突する。 |

## 本ADRとともに批准された決定

メンテナーは2026-11-12に以下の各推奨事項を受諾した。

- **D1 — コンシューマーごとにmustかmayかを決める**。センサス、フロア、フレームグローバル、エフェクトテイント、到達可能性は*may*、型付け、畳み込み、可視性行、非推奨警告、sig生成は*must*とする。マトリクスが列ごとにその選択を記録する。
- **D2 — 型付けにおけるprivateターゲットへの`public_send`**。ADR-5の楽観主義（expression_typer.rb約L2733が文書化しているように成功パスを型付けする）を維持し、診断は追加しない。ターゲットがprivateであるコンシューマー（`main.include`、`module_function`、`ruby2_keywords`非推奨警告）は`public_only`で辞退する。`private_class_method`はpublicであるため、その除外はS2が取り除く事故である。
- **D3 — `copy`アダプタ**。`literal_send_target`をラチェットの許可リストの背後に隔離し、フロアが`(node, name, receiver, offset)`を受け取るようになったときにのみ廃止する。これは6つのモジュールを貫通しているためである。`type_of`に渡される`StatementEvaluator`のコピーには独自のイシューを立てる。
- **D4 — プラグイン**。S7までプラグインへの公開は行わず、その後ADR-128のもとで再検討する。
- **D5 — 型で絞り込まれた名前**（`m = :push; a.send(m)`）。型付きコンストラクタの余地は残すが、計算された名前のうちどれだけが定数に型付けされるかを誰かが測定するまでは構築しない。

## 結果・影響

肯定的な影響:

- スペリングが1つのファイルで学習され、マトリクスがどのコンシューマーがそれを尊重するかを示す。
- 意図的な`public_send`の除外が、コード内に理由を伴う`public_only`のテストになる。
- #1872の誤った型とユーザー定義`send`の偽陽性が、合成ノードなしでクローズする。

否定的な影響:

- S0のマトリクスは見返りの前に相応の実作業を必要とし、すべての挙動スライスにコーパスの裁定が必要となる。
- 計算された名前を正直に扱うこと（S5）は解析を広げる: `public_send(attr)`はRailsコードで一般的である。1 PRにつき1コンシューマーとし、発火し続けなければならない形状にはフロア行（`--require-rows-in`）を置く。
- より多くの`send`を辿ることで呼び出し先フロアのグラフが成長する（ADR-127）。S4とS5でウォールタイムを確認する。

持ち越し（Carry-over）: 役割テーブル（WD4）とフレームモデルは別個である。ADR-116 WD5が呼び出しを読むウォーカーを移植する際、その呼び出しイベントはWD5の修正ルールのもとで、名前付きバリアントとして`Invocation`を運ぶ。

## 他のADRとの関係

- [ADR-116](../116-hot-file-restructuring/) — WD4はそのC1をセレクタ名に適用したものである。WD5の「ピン留めしてからラチェット」および「移動に挙動を乗せない」ルールがそのガードレールである。そのWD5宣言ウォークがフレームを所有し、本ADRがスペリングを所有する。
- [ADR-5](../5-robustness-principle/) — D2の楽観主義、およびシームが保守的なデフォルトを選ばない理由。
- [ADR-17](../17-monkey-patch-pre-evaluation/) — 却下された脱糖案が再利用していたであろう事前評価パス。
- [ADR-129](../129-type-of-result-memo/) — ビューが元のノードを保持し、メモを持たない理由。
- [ADR-127](../127-callee-floor-graph-budget/) — S4とS5が消費するバジェット。
- [ADR-2](../2-extension-api/) — D4が変更せずに残すプラグインサーフェス。
