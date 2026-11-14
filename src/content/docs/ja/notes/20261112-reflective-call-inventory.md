---
title: "`lib/`におけるリフレクティブ呼び出しのスペリング: インベントリと頻度調査"
description: "rigortype/rigor docs/notes/20261112-reflective-call-inventory.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20261112-reflective-call-inventory.md"
sourcePath: "docs/notes/20261112-reflective-call-inventory.md"
sourceSha: "f202ec911bc63a9e88a671d272f770a75a4384c387486cc2ed99fb71790a2929"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-12T08:12:52+09:00"
translationStatus: "translated"
sidebar:
  order: 20267112
---

日付: 2026-11-12、master `4f227e24d`時点。[ADR-132](../../adr/132-reflective-call-view/)の根拠資料である。行番号はそのコミット時点のものであり今後ずれる可能性があるが、シンボル名は安定したアンカーである。

本ノートは3つのパスで作成された。`lib/`の箇所別インベントリ（以下のセクションA〜C）と、依存する行を再確認してRuby 4.0.5上でプローブを実行した2つの独立した設計コンサルテーションである。コンサルテーションによる修正は各行を書き換えるのではなく、「修正点」セクションにまとめている。

## 頻度調査

`~/repo/ruby/rigor-survey/`配下の全49チェックアウト（[`docs/agents/measurement.md`](../../agents/measurement/)に記載の調査コーパス。72,127ファイル、パースエラーによるスキップなし、7,651,449個の呼び出しノード、`vendor/`および`node_modules/`はスキップ）を、「調査スクリプト」セクションのPrismウォークで集計した。再現手順は`ruby survey.rb ~/repo/ruby/rigor-survey/*/`および`ruby handles.rb ~/repo/ruby/rigor-survey/*/`である。

| スペリング | 箇所数 | 呼び出し全体に占める割合 |
|---|---|---|
| `send`ファミリー全体 | 9,947 | 0.130% |
| リテラル名 | 6,355 | 0.083% |
| ... 通常メソッドの命名（private呼び出しイディオム） | 6,095 | |
| ... メタプログラミングセレクタの命名 | 260 | 0.003% |
| ... `StringNode`としての記述 | 6 | |
| ... `public_send`経由 | 20 | |
| 式展開された名前 | 919 | |
| 計算された名前（その他すべて、splatを含む） | 2,673 | |
| `&:sym` | 17,601 | 0.230% |

メタプログラミングの`send` 260件の内訳は、`remove_const`が107、`include`が47、`define_method`が27、`alias_method`が19、`remove_method`が12、`instance_variable_set`が10、`const_set`が9、`undef_method`が9、その他10個のセレクタにわたって20件である。`handles.rb`は同じチェックアウト群でリテラルなハンドルチェーン（任意の`bind`、`unbind`、`to_proc`、または`curry`ラッパーを介し、`call`、`yield`、`===`、`[]`、または`bind_call`で読み取られる`r.method(:m)` / `instance_method(:m)`）を集計し、92件（うち16件が`bind_call`）およびハンドルのブロック渡し（`&r.method(:m)`）25件を得た。

このように、コーパスは36箇所のうちごく一部しか踏んでおらず、`send`の36%はリテラル名を持たない。バイト単位で同一のコーパス差分が出ても、移行によって挙動が保存された証拠としては弱いため、ADR-132では何かを動かす前に、1箇所につき1列の合成スペリングマトリクスを固定する。

14チェックアウトの部分集合（22,867ファイル）を対象とした以前のパスでも同様の結果が得られていた（`send`ファミリー0.167%、メタプログラミング`send` 0.010%、リテラル名なし45%）。

## 修正点

- `:"\xff"`はパースできない（`invalid symbol`）ため、SymbolNodeのみの箇所（行4および8）は`to_sym`で例外を送出しない。`CalleeWriteCensus`（行12）の`StringNode`に対するガードなしの`to_sym`はコード読解上実在するが、あるプローブでは到達しなかった。
- Prism `Node#copy`の呼び出し元は2箇所ではなく3箇所である。`StatementEvaluator`もコピーを`type_of`に渡しており（statement_evaluator.rb約L2083）、同一性キーのメモには決してヒットしえない。
- 行単位のgrepでは`send`系メソッド名を保持する定数が39個見つかる（`%i[]`が27個、`Set[...]`が12個）。Prismウォークでは`{send, __send__, public_send}`に厳密に等しい定数が26個（インベントリの23個では3個見落としていた）、`send`系メソッド名のSymbolNodeは合計約116個見つかる。
- セレクタ引数を手作業で落としている箇所は11箇所ではなく13箇所である（カバレッジ表では13行を挙げている）。
- `public_send`の除外で意図的なものは3箇所のみである。`ModuleFunctionState::Spellings`と`toplevel_include_owner`（ターゲットがprivate）、および`RubyDeprecations::SEND_NAMES`（`ruby2_keywords`がprivate）である。`VISIBILITY_SEND_CALLS`の`private_class_method`側は偶発的である（`Module#private_class_method`はpublicであるため、`public_send(:private_class_method, :x)`は動作する）。
- `#1872`は型が失われるだけでなく誤った型を生成する。`Integer("1", exception: false)`は`Integer?`と型付けされる一方、`send(:Integer, "1", exception: false)`は`Integer`と型付けされる。
- `ExpressionTyper#try_literal_send`はすべての`send`が`Kernel#send`であると仮定している。独自の`send(message, flags)`を定義するクラスは現状で偽陽性を受ける。`Mailer.new.send(:hello, 0).even?`は`"0"`に対して`call.undefined-method`を報告するが、Rubyは`false`を出力する。タイパーがSymbolNodeのみを抽出していることだけが、ソケットのイディオム`sock.send("payload", 0)`を同じ罠から遠ざけている。
- 同じ仮定はタイパーの外でも誤った型を与える。`ReturnBarrier.block_call?`は任意のレシーバー上の`send(:lambda) { return nil }`をラムダバリアとして読み取る。独自の`send(_name)`がyieldするクラスでは、`rigor type-of`はそのメソッドを`Integer`と型付けするが、Rubyは`nil`を返す。呼び出しの過大近似は、その答えが型を絞り込んだり診断を出したりするコンシューマーにとっては安全な方向ではない。
- `&:m`と`&r.method(:m)`は異なる。`&:m`では最初にyieldされる値が`self`で残りが引数になるが、`&r.method(:m)`ではレシーバーが`r`であり、yieldされるすべての値が引数になる（Ruby 4.0.5）。
- インベントリが対応付ける27件のイシューのうち、このビューは3件を完全にクローズする（#1872、#2167、#2704）。約11件から1項目を取り除き、約12件はビューが触れないレシーバー解決・クロージャ・evalセマンティクスの問題である。

## インベントリ

スコープ: `lib/`配下でPrism `CallNode`自体の上のリフレクティブなスペリングを認識するすべての場所。`plugins/`配下のプラグイン（4ファイルが`send`に言及）はスコープ外である。行番号は調査時点のチェックアウトのものである。`S` = `send`、`P` = `public_send`、`_` = `__send__`。「lit」= ターゲット名がリテラル。ターゲット抽出の凡例: **SY** = 第1引数が`SymbolNode`のみ、**SS** = `.unescaped`経由の`SymbolNode`/`StringNode`、**SS/str** = 同上だがStringとして比較（不正エンコーディングのリテラルが`to_sym`で例外を起こさない）、**SS/sym** = 同上、`valid_encoding?`ガード付きで変換、**INT** = 式展開された名前も読み取る（ScopeIndexerの`literal_send_name`のみ）。

実装を共有している箇所は1つもない。36の独立した箇所が`send`ファミリーを認識しており（行1〜36）、認識すべき2箇所が認識しておらず（行37〜38）、行39以降は`send`以外のリフレクティブなスペリングである。

### A. `send` / `public_send` / `__send__`の箇所

| # | file:line | 定数 / メソッド | 目的 | スペリング | 名前抽出 | レシーバー / 引数 / ブロック | 可視性セマンティクス | 見落とし（兄弟箇所が扱うもの） |
|---|---|---|---|---|---|---|---|---|
| 1 | analysis/check_rules/rebinding_block_callees.rb:39,262 | `SEND_CALLS`, `send_target` | チェックルール`rebinding-block-callees`（再束縛ブロックがdefに到達するか） | S P _ | SS/sym（`literal_name`, :259-266） | 任意のレシーバー；名前 -> テーブル参照；引数シフトなし（名前のみ） | なし；PをSとして扱う | `&:sym`は同ファイル内の別箇所で処理（:153,:224はsymではなくprocローカル）；式展開なし |
| 2 | analysis/check_rules/rebinding_block_callees/dispatch.rb:16,31,60 | `METHOD_OBJECT_CALLS = call yield === [] bind_call`, `method_reader`, `dispatch` | 同ルール；メソッドオブジェクトの呼び出し先 | `m.method(:x).call/.()/[]/yield/===/bind_call`；ラッパー`bind unbind to_proc curry`；リーダー`METHOD_READERS`/`BOUND_METHOD_READERS` | リーダー引数0に対するSS/sym | `receiver`を辿ってラッパーを剥がす；`instance_method`チェーンはレシーバーnilを返す | n/a | `Method`/`UnboundMethod`チェーンをモデル化する唯一の箇所；`bind(x).call`は部分的（ラッパー） |
| 3 | analysis/reachability/scan.rb:603,613,630 | `SENDS`, `record_mixin`, `mixin_arguments` | 到達可能性: mixinの祖先エッジ | S P _、ターゲットは`include prepend extend` | SS/str（`unescaped`） | 引数シフト（`args.drop(1)`）；`mixin_target`内の任意のレシーバー；レシーバーなしのみのショートカットがsendを除外（:613） | なし；Pを許可（妥当: `include`はpublic） | `send(:const_get)`/`send(:class_eval)`；mixin名のみ |
| 4 | analysis/check_rules/ruby_deprecations.rb:53,110,197 | `SEND_NAMES`, `send_target` | チェックルール`ruby-deprecations` | S _のみ | **SY** `unescaped.to_sym`（:112） | 名前が呼び出し名を置換；レシーバーは保持；`via_send`フラグを伝播 | Pを除外（private専用ターゲット、Rubyと一致） | StringNode名（`send("ruby2_keywords")`）、P（意図的） |
| 5 | sig_gen/generator.rb:2735,2746 | `SEND_NAMES`, `attr_writer_names` | sig生成: `attr_*`からのwriter名 | S P _；ターゲット`attr_writer attr_accessor` | `Source::Literals.symbol_arg(node,0)`（SS） | self/暗黙レシーバーのみ；`names.drop(1)` | なし | - |
| 6 | inference/last_status.rb:37,94 | `SENDS`, `clears?` | `$?`のクリア/待機検出 | S P _ | SS（`unescaped`の文字列比較） | 任意のレシーバー；名前のみ | なし | 非リテラル => `false`（他所は"unknown" => テイントとする） |
| 7 | inference/census_foreign_block.rb:32,332 | `SEND_CALLS`, `define_method_call?` | ivarセンサス: `define_method`ブロック | S P _；ターゲット`define_method` | SS（`first.unescaped == "define_method"`） | `self_node?(receiver)`とリテラル`BlockNode`を要求 | なし | `define_singleton_method`；lambda/proc引数（#2169） |
| 8 | inference/return_barrier.rb:22,35 | `SEND_CALLS`, `block_call?` | ブロックの`return`バリア（define_method/lambda/proc） | S P _ | **SY** `to_sym` | 任意のレシーバー；名前を置換；引数処理なし | なし | StringNode |
| 9 | inference/repeated_or_writes.rb:85-88,284-291 | `Forms::DYNAMIC_SEND`, `METHOD_HANDLES`, `dynamic_store?` | 反復`\|\|=`ストア検出 | S P _（あらゆるsendがストア）；SYストア名を持つ`method`/`public_method` | send: 無条件でtrue；ハンドル: **SY** | シフトなし | なし | `instance_method`、StringNodeハンドル、sendのリテラル名チェック |
| 10 | inference/global_write_census.rb:63,251-262 | `SEND_CALLS`, `visit_call` | グローバル/定数/エイリアス書き込みセンサス | S P _（+ `VISITED_CALLS`） | SS/sym（`literal_name`）；非リテラル => `any_entry` | **引数シフト**（`arguments.drop(1)`）、「直接書かれた呼び出しとして読む」 | なし；トップレベルの`send(:include)`はmixinとして読む | `send(:private)`スタイルの命名 |
| 11 | inference/receiver_writer_call.rb:14,45-68 | `ReceiverWriterCall.called`, `literal_name` | ivarセンサス: `E.send(:attr_accessor, :y)`, `E.send(:define_method)` | S P _ | SS/sym（`literal_name`の独自コピー） | 明示的な非selfレシーバーのみ；引数をシフト；`[name, args]`ビューを返す | なし | 正規化された`[name, args]`ペアをすでに返している唯一の箇所 |
| 12 | inference/callee_write_census.rb:104,114,529,688 | `OPAQUE`, `SENDS`, `opaque_argument_call?`, `literal_send?`（:141） | calleeミューテーションフロア（不透明シンク） | S P _；ほかに`instance_eval instance_exec instance_variable_set method public_method`、`call instance_exec class_exec module_exec` | `literal_send?` = SymbolまたはString（エンコーディングチェックなし） | 非リテラルsend => 引数不透明；リテラル => 通常呼び出しとして扱う（statement_evaluatorがcalleeを解決） | なし | 定数レシーバー上のsendを追わない（#2632）；StringNode `instance_variable_set`は可 |
| 13 | inference/refine_census.rb:46,103,112 | `SEND_CALLS`, `string_literal_call?`, `literal_target` | `refine`テキストセンサス | S P _ | なし（名前未使用；文字列を運ぶ呼び出しとして計上） | `:self`対`:receiver`ターゲット | なし | - |
| 14 | inference/ivar_writer_census.rb:40,248-290,300 | `SEND_CALLS`, `OPEN_WORLD_SENDS`, `open_world_send?`, `visit_foreign` | ivarセンサス オープンワールドwriter | S P _；送られる名前は`instance_variable_set instance_eval instance_exec extend define_singleton_method` | SS/sym | `instance_variable_set`に対してシフト；非リテラルならオープンワールド | なし | self上のブロック付き`send(:define_method)`（#2167） |
| 15 | inference/alias_mutation_floor.rb:74,243-254 | `SEND_NAMES`, `literal_send_target` | `a.send(:push, x)`のミューテーション拡大 | S P _、ブロックなし | SS/sym | `call_node.copy(name:, arguments: arguments.copy(...))`により**新しい`CallNode`を合成** | なし（sendはprivateを越える；Pも同一） | 式展開された名前（#2704） |
| 16 | inference/alias_mutation_floor/site_collector.rb:17-19 | `KEEPING_CALLS` | aliasフロアの箇所収集 | S P _を`instance_variable_set instance_exec instance_eval class_exec module_exec define_method define_singleton_method`と列挙 | なし | メンバーシップのみ | なし | - |
| 17 | inference/last_line.rb:54,70,135,192 | `SENDS`, `patched_readers`, `call_may_set?` | `$_` / 行リーダー | S P _ | `definer_name?`, `sent_reader?`経由のSS | 定義者シフト用に`arguments[1]` | なし | - |
| 18 | inference/last_line/self_evidence.rb:62,80,238,270 | `SENDS`, `NAMING_CALLS`, `sent_mixin?`, `sent_rebinder?` | `$_`フレーム証拠 | S P _（+ NAMINGとして`respond_to? method public_method`） | SS（`unescaped`）；`SplatNode` => true；それ以外はアリティ>1 | `visit_arguments`がNAMING_CALLSのリテラル引数0をスキップ | なし | - |
| 19 | inference/match_rebinding/calls.rb:37,121,138 | `SENDS`, `sent?`, `named?` | `$~`再束縛 | S P _ | `NAMES_BY_STRING[unescaped]`経由のSS；それ以外は計算値 => "既知のRegexpを送った" | **再帰**: シフト済み引数で`named?(name, receiver, rest, ...)` | なし | - |
| 20 | inference/match_rebinding/self_calls.rb:31,43-70 | `SENDS`, `named_match?`, `sent_name_matches?`, `sends_binding?` | `$~`フレーム呼び出し | S P _ | SS（`unescaped`文字列集合） | なし | なし | - |
| 21 | inference/global_writer_reach.rb:149,214 | `Search::SEND_CALLS`（= S P _ `method public_method instance_method`） | グローバルwriter到達可能性BFS | S P _ + 3つのハンドル取得メソッド；`scan_block_argument`経由の`&:sym`（:202,:233） | SS/sym（`literal_name`）；非リテラル => `reached!` | 名前をキューに追加；シフトなし | なし | ハンドル上の`.call` |
| 22 | inference/module_function_state/spellings.rb:20-31 | `SEND_CALLS` | `module_function`行 | **S _のみ** | `Source::Literals.symbol_or_string` | 暗黙/selfレシーバーのみ；`drop(1)` | **Pを明示的に除外**（privateメソッドが例外を送出） | 定数レシーバー（#2246） |
| 23 | inference/synthetic_method_scanner.rb:381,386-397 | `CONCERN_SEND_CALLS`, `concern_extend_arguments` | concern検出 | S P _；ターゲット`extend` | SS（`unescaped == "extend"`） | self/暗黙レシーバーのみ；`drop(1)` | なし | - |
| 24 | effects/unit_scan.rb:62,100,832,866-885 | `REFLECTIVE_SEND`, `DEFERRED_SELECTORS`（= S P _ `call`）, `visit_reflective_send`, `literal_selector` | エフェクト: sendごとのエッジ；`dynamic-send`テイント | S P _；`call`は遅延 | SS（文字列セレクタ）；非リテラル => `taint("dynamic-send")` | `push_edge(record, selector, node.receiver.nil?, ...)` | なし | シフト不要（セレクタのみ） |
| 25 | inference/method_dispatcher/constant_folding.rb:248,270 | `REFLECTIVE_SEND_METHODS` | 畳み込み: ADR-78の過剰畳み込みガード | S P _（ノードではなく**型**上のメソッド名として） | `args.first`は`Type::Constant[Symbol]`でなければならない | ノードではなく`context.args`上で動作 | なし | Constant[String] |
| 26 | inference/expression_typer.rb:2737-2765 | `LITERAL_SEND_SELECTORS`, `try_literal_send` | 型付け: `x.send(:m, a)`を`x.m(a)`として型付け | S _ P | **SYのみ** | `args[1..]`、splat/forwarding/blockを拒否；**外側の**`call_node: node`でディスパッチ（#1872） | send == public_send；楽観的であることを文書化 | StringNode（兄弟箇所は受け入れる） |
| 27 | inference/expression_typer.rb:2269-2300 | `REFINED_NAMING_CALLS`（S _ P `respond_to? method public_method`）, `literal_method_name_argument`, `symbol_block_argument` | refinement（ADR-121 WD4） | S _ P `respond_to?` `method` `public_method` + `&:sym` | SS `to_sym`；`&:sym` SymbolNode | 名前のみ | なし | - |
| 28 | inference/statement_evaluator.rb:1058,1105 | `DISPATCHING_CALLS`（S P _ `singleton_class`） | ローカルフォームのテイント | メンバーシップ | なし | レシーバーはローカル読み取りでなければならない | なし | - |
| 29 | inference/statement_evaluator.rb:606,6739-6742 | `SEND_HAND_OFFS`（S P _）, `send_hand_off?`, `opaque_sink_call?` | calleeフロアのハンドオフ | S P _ | `CalleeWriteCensus.literal_send?`（SS） | リテラル名でcalleeを解決 | なし | 定数レシーバー（#2632） |
| 30 | inference/guard_rebinding.rb:44,272 | `CODE_RUNNING_NAMES`（S _ P eval require load const_set remove_const ivar_set） | ガード再束縛: 外部コード | メンバーシップ；あらゆるsend => 外部 | なし | なし | なし | - |
| 31 | inference/remover_holder_scan.rb:38 | `REFLECTIVE_CALLS`（S P _ `instance_eval instance_exec tap then yield_self itself method define_singleton_method`） | remover保持者 | メンバーシップ | なし | なし | なし | - |
| 32 | inference/scope_indexer.rb:5217,5198-5214,5322 | `HOOK_SEND_CALLS` | フックパラメータ再整形；特異定義者 | S _ P | `send_extend?` = **SY** `== "extend"`；定義者には`literal_method_name`（SS） | シフト: `arguments[1]` | なし | `send("extend")`に対するStringNode |
| 33 | inference/scope_indexer.rb:6179,6188-6200 | `DEFINER_SEND_CALLS` | 定義者名の行（#2184） | S _ P；ターゲット`define_method define_singleton_method alias_method` | `literal_method_name`経由のSS | `arguments.drop(1)`；行 = 名前リテラルの範囲 | なし | - |
| 34 | inference/scope_indexer.rb:8172,8216,8407,8586 | `SEND_CALL_NAMES`, `mixin_call_view`, `computed_send_name`, `toplevel_include_owner` | mixinアキュムレータ | S P _ | `MIXIN_KINDS`文字列比較経由のSS/str；`literal_send_name`はさらに**式展開された**部分も読む（:8384-8392）；`local_send_names`は`m = :attr_reader; send(m, ...)`を解決 | `[kind, args, via_send]`を返す；`drop(1)` | **`toplevel_include_owner`はPを除外**（mainの`include`はprivate）:8586；他はPを含む | - |
| 35 | inference/scope_indexer.rb:9604,9618,9934,10091 | `VISIBILITY_SEND_CALLS`（S _） | 可視性トグル / `private_class_method` | S _；`constant_public_class_method_names`（:9934）のみ**Pを追加** | `Source::Literals.symbol_or_string` | self/暗黙レシーバー（`public_class_method`は定数レシーバー）；`drop(1)` | **Rubyのルールをエンコード**: privateターゲットではPを除外、`public_class_method`ではPを含む | `class_method_visibility_parts`におけるP（`private_class_method`はpublic） |
| 36 | inference/scope_indexer.rb:10280,4602,7162,10443-10455,10861-10887 | `SURFACE_SEND_CALLS`, `surface_rewriting_call?`, `dynamic_surface_call?`, `attr_macro`, `each_attr_macro_name`, `singleton_naming_call_names`, `record_self_definer_call` | エンベロープ / サーフェス証拠、attrマクロ | S _ P | `literal_method_name`経由のSS；`arguments.drop(1)` | 混在: `singleton_naming_call_names`では任意のsendが`:all` | なし | - |

#### `send`を認識すべきだが認識していない箇所

| # | file:line | 内容 | 結果 |
|---|---|---|---|
| 37 | inference/define_method_block_self.rb:41-54 | レキシカルself上のリテラル`define_method`のみに一致（#2167） | `send(:define_method)`経由でブロック`self`が絞り込まれない；センサス（行7）は計上するため両者が食い違う |
| 38 | lens/file_reader.rb:225-262（`visibility_call?`）およびanalysis/check_rules/lexical_method_sites.rb:62-175（`opened_method_name`, EVAL_CALLS） | 可視性ウォークと特異クラスオープンリーダーが直接の`private`/`define_singleton_method`/`instance_eval`のみを知る | ScopeIndexer（行35）が扱う`send(:private, :x)`がLensから見えない；`x.send(:define_singleton_method, ...)` / `x.send(:extend, M)`が`lexical_method_sites`から見えない（#2087, #2984） |

### B. その他のリフレクティブなスペリング

| # | file:line | 箇所 | 目的 | スペリング | 抽出 | 備考 / 見落とし |
|---|---|---|---|---|---|---|
| 39 | inference/callee_write_census.rb:693,711 | `note_symbol_block` | calleeフロア | ミューテーターを指す`&:sym`（SymbolNode） | `@mutators`内の`unescaped.to_sym` | レシーバー要素をマーク |
| 40 | inference/deep_erasure.rb:148 | `symbol_proc_mutation?` | ミューテーション拡大 | `SHAPE_MUTATORS`内の`&:sym` | `unescaped.to_sym` | `&method(:x)`なし |
| 41 | inference/remover_narrowing.rb:157 | `symbol_nil_narrowed` | 絞り込み | `&:nil?` | `unescaped == "nil?"` | `nil?`のみ |
| 42 | inference/expression_typer.rb:5105,5728,6636,2299 | `symbol_block_return_type`, `per_element_symbol_results`, `apply_hash_block`, `symbol_block_argument` | `&:sym`の型付け | `&:sym` | `unescaped.to_sym` | `MethodDispatcher.dispatch`に`call_node:`として**BlockArgumentNode**を渡す（:6642） |
| 43 | inference/method_dispatcher/interface_shape.rb:87 ; hash_transform_keys_folding.rb:156 | ブロック渡し分類 | ディスパッチ | `&:sym`（非nil）、`&nil` | ノードクラス判定 | - |
| 44 | inference/match_rebinding.rb:207,254 ; last_line.rb:179,217 ; guard_rebinding.rb:116,272 ; block_run_count.rb:70 ; project_yielder.rb:93 ; effects/unit_scan.rb:949 ; effects/local_ownership.rb:122 ; sig_gen/observation_collector.rb:466 ; protection/mutator.rb:98 ; parameter_inference_collector.rb:307 ; check_rules.rb:2449,3031 ; lens/file_reader.rb:495 | `BlockArgumentNode`分類 | 各種 | "安全/既知のメソッド名"としての`&:sym`、`&local`、`&`フォワード | `last_line.rb:208`は`&:gets`/`&:readline`をセッターとして扱う（SETTER_NAMES） | 箇所ごとのアドホック実装；同じノードに対する13以上の別個の分類 |
| 45 | inference/method_dispatcher/method_folding.rb:39-60 ;型`BoundMethod` | `x.method(:n)`の前方畳み込み、`.call/.curry`の後方 | 型付け | `method(:x)`、`.call`、`.curry` | **型**に対する`symbol_name_of(arg)` | `public_method`/`instance_method`は畳み込まれない |
| 46 | inference/repeated_or_writes.rb:288 ; callee_write_census.rb:104 ; global_writer_reach.rb:149 ; last_line/self_evidence.rb:76-80 ; remover_holder_scan.rb:38 | `method`/`public_method`/`instance_method`/`singleton_method`/`public_instance_method`ハンドル取得メソッド | 各種 | それぞれ異なる部分集合 | SY（repeated_or_writes）、SS/sym（global_writer_reach）、SS（self_evidence） | 行2と`unit_scan` `opaque_callable?`（:960、`call`のみ）以外にハンドル上の`.call/.()/[]/bind_call`を扱う箇所なし |
| 47 | inference/scope_indexer.rb:4580,4630,5324-5347,5678,5923,8852,8986,9228,9239,10166,10795 ; effects/unit_scan.rb:145 ; effects/scanner.rb:282 ; inference/refine_census.rb:191 ; refine_self.rb:51 ; error_info.rb:33 ; fresh_frame_blocks.rb:34 ; stored_block_call.rb:22 ; lens/parameters.rb:52 ; scope.rb:647 | 名前でマッチされる`define_method` / `define_singleton_method` | 定義者 | リテラル`define_method`；暗黙/selfレシーバーを要求するものと任意のものがある | `literal_method_name`または`.unescaped`経由のSS | 少なくとも6つの別個の`DEFINERS = [define_method define_singleton_method]`定数（error_info、fresh_frame_blocks、stored_block_call、last_line、refine_self、scope_indexer） |
| 48 | source/alias_names.rb:28 ; global_write_census.rb:219 ; refine_census.rb:193 ; scope_indexer.rb:10635 ; effects/ancestry_recorder.rb:113 ; lens/file_reader.rb:235 | `alias_method` | エイリアステーブル | レシーバーなしのみ（alias_names、ancestry_recorder、indexer） | SS | `send(:alias_method)`はscope_indexerの行33/36のみで処理 |
| 49 | inference/reflective_ivar_write.rb:35-65 ; callee_write_census.rb:302,690,711 ; ivar_writer_census.rb:258-282 ; sig_gen/generator.rb:2776 | `instance_variable_set` / `instance_variable_get` | ivarフロー | レシーバーなし/`self`のみ（reflective_ivar_write）、`send(:instance_variable_set)`は明示的に計上**しない**（:22）がivar_writer_censusは計上する（:278） | `IVAR_NAME`正規表現（reflective_ivar_write）対 正規表現なしの`unescaped.to_sym`（callee_write_census） | 不一致（Cを参照） |
| 50 | inference/scope_indexer.rb:5195-5214（HOOK_EVAL_CALLS）, 10280（SURFACE_EVAL_CALLS）, inference/last_line.rb:56, match_rebinding/calls.rb:35, self_calls.rb:28-29, refine_census.rb:47, ivar_writer_census.rb:42-46, guard_rebinding.rb:48-52, global_writer_reach.rb:150, check_rules/lexical_method_sites.rb:62, refine_self.rb:52 | `class_eval module_eval class_exec module_exec instance_eval instance_exec eval` | evalファミリー処理 | 各ファイルが独自の集合を定義；メンバーシップが異なる（例: `last_line.EVALS = eval instance_eval class_eval module_eval`、`self_calls.EVALS = eval`、`lexical_method_sites.EVAL_CALLS = instance_eval instance_exec`） | 文字列対ブロックをアドホックに区別 | 10以上の異なるevalファミリー集合、一致するものなし |
| 51 | analysis/reachability/scan.rb:335-450 ; check_rules.rb:1186 ; dependency_source_inference/walker.rb:243 ; scope_indexer.rb:3793 ; last_line/self_evidence.rb:70 | `const_get` / `const_set` | 到達可能性、定数センサス | 式展開対応アンカーを持つself/レシーバー上の`const_get`；`const_set`はSS | 到達可能性は式展開引数を処理；他はSSのみ | `send(:const_get)` / `send(:const_set)`はこれらのいずれからも見えない（#2386） |

### C. サマリー

#### 1. スペリングの和集合とスペリング別カバレッジ（N = 36の`send`ファミリー箇所、行1〜36）

| スペリング | 処理している箇所数 |
|---|---|
| `send` | 36 / 36 |
| `__send__` | 35 / 36（行26は`__send__`を列挙しており、すべての箇所が持つ: 実質36） |
| `public_send` | 33 / 36。意図的除外は4つ（22 `ModuleFunctionState`、4 `RubyDeprecations`、34の`toplevel_include_owner`、35の`class_method_visibility_parts`側）。他の除外は偶発的（`private_class_method`に対する`VISIBILITY_SEND_CALLS`） |
| ターゲット名、SymbolNode | 36（名前を抽出するすべて） |
| ターゲット名、StringNode | 約28；SYのみの箇所: 4、8、9（`method`側）、26、32（`send_extend?`） |
| エンコーディングガード（`valid_encoding?`またはString比較） | 約14（行1,3,6,7,10,11,14,15,17-21,23,34）；他は直接`to_sym`を呼び`send("\xff")`で例外を起こしうる（行4, 8, 12 `note_ivar_set`, 24） |
| 式展開された名前 | 1（行34 `literal_send_name`、および`local_send_names`のローカル解決）；行15は#2704を記録 |
| 引数シフト（`drop(1)`） | 11（3,5,10,11,19,22,23,26,32,33,34,35,36） |
| 正規化ビュー`[name, args]`の構築 | 4（11 `ReceiverWriterCall.called`、34 `mixin_call_view`、35 `visibility_call_parts`、2 `Dispatch.dispatch`） |
| `&:sym` | 8以上の独立した分類（行39-44、21、27） |
| `method(:x).call`ファミリー | 1（行2）、unit_scanでは`.call`のみ（:960） |
| `bind_call`/`bind(x).call` | 1（行2）；`Cache::ValueDigest`/`CheckCommand`は認識ではなく実行時コードとして`bind_call`を使用 |
| `send`経由の`instance_variable_set` | 1（行14）および12（不透明のみ） |
| `instance_exec/eval/class_eval` | 10以上の異なる集合（行50） |
| `send`経由の`define_method`/`alias_method`/`const_get` | 行7, 11, 33, 36（define_method）；33, 36（alias_method）；0（const_get） |

#### 2. 具体的な分岐（同じ質問、同じスペリングに対する異なる答え）

1. **`send("string_name", ...)`**は、行1,3,5,6,7,10,11,14,15,17-24,29,32-36では指定されたメソッドへの呼び出しであるが、行4（`RubyDeprecations.send_target`、ruby_deprecations.rb:112の式`first.is_a?(Prism::SymbolNode)`）、行8（`ReturnBarrier` return_barrier.rb:36 `return false unless sent.is_a?(Prism::SymbolNode)`）、行26（`try_literal_send` expression_typer.rb:2745 `args.first.is_a?(Prism::SymbolNode)`）、行9（`METHOD_HANDLES`側 :291）ではそうではない。そのため`a.send("push", x)`はミューテーション拡大され（alias_mutation_floor.rb:248）、calleeフロアのハンドオフにもなる（callee_write_census.rb:141）が、タイパーによっては（`a.push`としてではなく）未知の`send`として型付けされる。
2. **`public_send`とprivateターゲット**。 scope_indexer.rb:8586は`main.include`に対してPを除外する（正しい）。module_function_state/spellings.rb:21はPを除外する（正しい）。expression_typer.rb:2733はPを「同一に扱う」とする（設計上の楽観的扱い）。alias_mutation_floor.rb:76はPをSとして扱う。#2697はprivateな`send(:padd)`を追跡することを求めている。privateメソッドへのPが型付け結果として例外を送出することをモデル化する箇所はない。
3. **`send(:instance_variable_set, ...)`**。 reflective_ivar_write.rb:22は「計上しない」と明記している。ivar_writer_census.rb:278-283は計上する。callee_write_census.rb:104はあらゆるsendを不透明として扱う。3つのセンサス系箇所が書き込みについて食い違っている。
4. **`send(:define_method) { }`**。 CensusForeignBlock（7）、ReceiverWriterCall（11）、scope_indexer `record_sent_define_method`（4630）はこれを計上する。`DefineMethodBlockSelf`（37、define_method_block_self.rb:54）および`Scope#block_self`（scope.rb:647、`call_node.name == :define_method`）は計上しない（#2167）。行7のコメントはこのセンサスが`self`が絞り込まれるブロックを過不足なく計上すると主張しているが、行37があるためそれは偽である。
5. **`send(:private, ...)`**。 scope_indexer.rb:9604-9622はこれを読み取る。lens/file_reader.rb:225（`visibility_call?`）は読み取らない。lexical_method_sites.rbは`send(:define_singleton_method)`/`send(:extend)`を読み取らない一方、scope_indexer.rb:5322はフックのために読み取る。
6. **定数レシーバー**。 `Helper.send(:fill, x)`はself/暗黙レシーバーに対してのみフロアハンドオフになる（#2632、statement_evaluator.rb:6739 + resolve_self_callees）。`Es.send(:module_function)`は読み取られない（#2246、spellings.rb:27がself/暗黙を要求）。scope_indexer.rb:9934は`K.send(:public_class_method, ...)`を読み取る。reachability/scan.rbの`mixin_target`は定数レシーバーを読み取る。
7. **非リテラル第1引数**。 unit_scan（24）=> `dynamic-send`テイント、global_writer_reach（21）=> `reached!`、global_write_census（10）=> `any_entry`、ivar_writer_census（14）=> オープンワールド、last_status（6）=> 「クリアしない」（不健全な方向）、rebinding_block_callees（1）=> `nil`名、ruby_deprecations（4）=> nil名 => 沈黙。
8. **式展開**。行34のみが`"#{...}"`を部分的に読み取る（scope_indexer.rb:8384-8392）。他のすべての箇所は`send("#{m}")`を非リテラルとして扱い、行15では偽陽性が残る（#2704）。
9. **エンコーディング**。 `send("\xFF")`は行4、8、およびcallee_write_census.rb:711（`valid_encoding?`なしの`unescaped.to_sym`）で`to_sym`が`ArgumentError`を送出する。行1,3,10,11,14,15,21はガードしている。reachability/scan.rb:633のコメントはこの危険性に言及しているが、それを所有するヘルパーは存在しない。
10. **呼び出しスペリングとしての`&:sym`**。 deep_erasure.rb:148およびcallee_write_census.rb:711は`&:clear`をミューテーターとして読み取る。`Mutator`/`MutationWidening`（直接呼び出しパス）は`statement_evaluator`から`&:sym`形式について問い合わせを受けることがまったくない。global_writer_reach.rb:233はこれをキューに入れる。effects/unit_scan.rb:949は任意の`SymbolNode`で早期リターンする（エッジなしのため、`[x].each(&:save)`はエフェクトエッジを記録しない）。`last_line.rb:208`は`&:gets`をセッターとして扱う。
11. **evalファミリー**。 `last_line.EVALS = {eval instance_eval class_eval module_eval}`対`match_rebinding/self_calls.EVALS = {eval}` + `STRING_EVALS = {instance_eval class_eval module_eval}`対`guard_rebinding.BLOCK_OR_CODE_NAMES = {instance_eval instance_exec class_eval class_exec module_eval module_exec}`（`instance_exec`は引数付きブロックを取るにもかかわらず、最初の2つには`*_exec`バリアントが欠落している）。
12. **`define_singleton_method`**。 6ファイルの`DEFINERS`に含まれているが、`CensusForeignBlock.define_method_call?`（:331は`define_method`のみ）、`ReceiverWriterCall`（:16 `WRITER_MACROS + define_method`）には欠落している。

#### 3. 下流におけるノードの同一性

各箇所では、要となる場所で**`Prism::CallNode`のオブジェクト同一性をキーとして**参照しており、位置情報は行や診断に使用されている。

- `Rigor::TypeOfMemo`（type_of_memo.rb:63, :150）: 両レベルで`compare_by_identity`を用いた`table.entries[scope][node]`。`type_of`の結果メモ。
- `Scope`サイドテーブル（scope.rb:397-402）: `dynamic_origins`、`void_origins`、`plugin_typed_calls`（`@plugin_typed_calls[node] = true`, :366）、`optimistic_origins`。すべて`compare_by_identity`であり、呼び出しノードをキーとする。
- `scope_index`（ScopeIndexer.index；ScopeIndexerはscope_indexer.rb:212, 1720, 5152, 13104で`{}.compare_by_identity`テーブルを構築する）: 54箇所で`scope_index[call]`として参照される（例: ruby_deprecations.rb:192、rebinding_block_callees `scope_index&.[](receiver)`、dispatch.rb:56）。
- ルールごとのメモ集合: `Plugin::NodeRuleWalk::State#@match_cache`（node_rule_walk.rb:131）、defノードをキーとする`SigGen::BotProposalGuard#@calls`（bot_proposal_guard.rb:285）、呼び出しノードをキーとする`Lens::FileReader#@visited_visibility_calls`（file_reader.rb:227）、`Reachability::Scan`の`@eval_frames`、`@definer_blocks`、`@rebinding_blocks`、`@body_statements`（scan.rb:685-729、:613で`SENDS`と同じ式内で`@body_statements.include?(node)`が読まれる）、`SigGen::Generator`の`@hook_blocks`、`@certain_definers`（generator.rb:1025-1028）、`RebindingBlockCallees`の`@scopes_reading_locals`（:115）、および`ObservationCollector`（observation_collector.rb:390）。`lib/`全体で152箇所の`compare_by_identity`使用がある。
- 位置情報: `DiscoveryIndex`の範囲は`[start_offset, end_offset, name, kind, owner]`配列である（scope.rb:65、discovery_index.rb:473、scope_indexer.rb:6209は呼び出しではなく**名前リテラルの**位置から構築する）。`ModuleFunctionState::Spellings`は`node.location`から`call_span`を構築する（spellings.rb:46）。`LexicalMethodSites`は`call_node.location.start_offset`を使用する（lexical_method_sites.rb:55）。`InEffectRefinements`は`node.location.start_offset`を使用する（in_effect_refinements.rb:165）。`AnonymousMetaClass`は`[path, line, column]`をキーとする（anonymous_meta_class.rb:69）。診断は`node.location`を使用する。
- **合成ノードの前例:** `Prism::Node#copy`を呼び出しているのは厳密に2箇所（訳注: 修正点のとおり3箇所）である。`AliasMutationFloor.literal_send_target`（alias_mutation_floor.rb:252、新しいCallNodeとArgumentsNode、位置を保持、レシーバーと引数ノードは共有）と`Narrowing`（narrowing.rb:1250、`node.copy(receiver: ReceiverAlias.read_of(write))`）である。合成されたsendノードは`MutationWidening`、`ElementReadWidening`、`AliasMutationFloor.candidate?`、および`OutBufferMutation`にのみ渡される（statement_evaluator.rb:2003-2018）。これらはいずれも同一性テーブルでそのノードを引かない（`rewritten_element(call_node, scope)`と`mutator_arg_types`は共有された引数ノードに対してのみ`type_of`を呼ぶ）。これが機能するのはコピーがキーにならないためである。
- `try_literal_send`（expression_typer.rb:2745）は`call_node:`として**外側の**元のノードを、そして内側の`arg_types`を渡してディスパッチしており、これが#1872のoff-by-oneの原因である。引数を並べ替えるがディスパッチに`call_node`として渡されるビューは、元のノードに加えて内側の引数と名前を運ばない限りそれを壊すことになる。
- `&:sym`パスは`MethodDispatcher.dispatch`に`call_node:`として`BlockArgumentNode`を渡す（expression_typer.rb:6642）。`constant_folding.rb:238`には「内部の要素ごとのディスパッチは`call_node`としてCallNode以外のもの（例: `&:sym` BlockArgumentNode）を渡す」と記されている。したがって`context.call_node`のコンシューマーはすでにCallNode以外のノードを受け入れている。

結論: 正規化ビューは元のノードを**置換するのではなくラップしなければならない**。正規化された`(selector, argument nodes, via)`と並べて、（`equal?`/同一性テーブル参照、`location`、`scope_index[...]`、`type_of`のための）元の`CallNode`を公開しなければならない。`type_of(arg)`は同一性でメモ化するため、ビュー内の引数ノードは（ツリーと共有された）元の引数ノードでなければならない。`CallNode`の合成が安全なのは、行15のようにその結果がキーにならない場合に限られる。

#### 4. 既存の部分的抽象化（シード候補）

- **`Source::Literals`**（source/literals.rb:28-90）: 「このノードはリテラル`:sym`/`"str"`か、そして何を命名しているか」を所有する唯一の場所。`symbol_or_string`、`symbol_arg(call, i)`、`symbol_arguments`。行5、22、33、35および多くのプラグインで使用されている。`valid_encoding?`をガードせず（分岐9を参照）、`send`の概念を持たない。
- **`ReceiverWriterCall.called(node)`**（receiver_writer_call.rb:55-62）: 「`send`を通して見た」`[name, arguments]`をすでに返しており、既存の正規化ビューに最も近い。非selfレシーバーとS P _に限定されている。
- **`ScopeIndexer#mixin_call_view` / `#visibility_call_parts`**（scope_indexer.rb:8404, 9615）: 同じ形状だがインデクサにローカルである。`public_send`のルールをエンコードしている唯一のもの。
- **`Rebinding BlockCallees::Dispatch.dispatch(call)`**（dispatch.rb:28-35）: `send`および`method(:x).call/bind_call`チェーン越しに`[name, receiver]`を返す。Methodオブジェクトをモデル化する唯一のもの。
- **`CalleeWriteCensus.literal_send?`**（callee_write_census.rb:141）: statement_evaluatorで共有されている（行12、29）。
- **`AliasMutationFloor.literal_send_target`**: （`copy`経由で）ノード形状のビューを生成する唯一のもの。
- `SEND_CALLS`/`SENDS`/`SEND_NAMES`/`SEND_HAND_OFFS`/`LITERAL_SEND_SELECTORS`/`DYNAMIC_SEND`/`REFLECTIVE_SEND(_METHODS)`/`HOOK_SEND_CALLS`/`SURFACE_SEND_CALLS`/`CONCERN_SEND_CALLS`/`DEFINER_SEND_CALLS`/`SEND_CALL_NAMES`/`VISIBILITY_SEND_CALLS`という名前の定数: `%i[send __send__ public_send]`に等しい定数が23個（`send __send__`のみが2つ（訳注: 3つ）: `VISIBILITY_SEND_CALLS`、`Spellings::SEND_CALLS`、ruby_deprecationsの`SEND_NAMES`）。`ReflectiveCall`モジュールは存在しない。
- 共有の`ReflectiveCall`/`Spelling`ヘルパーは存在しない: `grep -rn "ReflectiveCall" lib`は何も返さない。

最良のシード: `ReceiverWriterCall.called` + `mixin_call_view` + `Dispatch.dispatch` + `Source::Literals`から構築される`Rigor::Source::ReflectiveCall`ビュー。`node`（元のノード）、`selector`（Symbolまたは`:dynamic`）、`args`（シフト後の元のノード群）、`via`（`:direct | :send | :public_send | :__send__ | :method_call`）、`visibility`（`:private_ok | :public_only`）、`receiver`（ノードまたは`:implicit`）を保持する。

#### 5. イシューと箇所の対応表

| イシュー | 概要 | 修正箇所 |
|---|---|---|
| #2167 | `send(:define_method) {}`が絞り込まれない / 計上されない | 行37（`DefineMethodBlockSelf`、`Scope#block_self` scope.rb:647）；行7/11/14と歩調を合わせる |
| #2169 | lambda/proc引数を伴う`define_method` | 行7（`CensusForeignBlock`）、行11、行47 |
| #2425 | `tap`/`send`ストアがミューテーション拡大で見逃される | 行15（`tap`への拡張）、行26（`try_literal_send`）、行12 |
| #2913 | `Constant[Set]`がクロージャ、`&:sym`、`method(:x).call`、`instance_eval`で拡大されない | 行39-40（`&:sym`）、行46（メソッドハンドル）、行12 `OPAQUE`、行31 |
| #1417 | `Method#call`、`bind_call`、`super`、Symbol proc経由で到達するmatchメソッド | 行2（唯一の`bind_call`モデリング）、行19、20（`$~`）、行44（`last_line.rb:179`/`match_rebinding.rb:207`） |
| #1872 | `try_literal_send`が外側の呼び出しノードを渡し、引数がずれる | 行26（expression_typer.rb:2745-2760） |
| #2087 | alias、`singleton_class.define_method`、`extend_object`経由で特異メソッドを得るローカル変数上の`call.undefined-method` | 行38（`lexical_method_sites.rb` `opened_method_name`, :160-166） |
| #2984 | 追加の定義者スペリング、`send(:define_singleton_method)`、`Module.class_eval` | 行32-33（`hook_definer_name_node`, `record_definer_name_row`）、36、47 |
| #2983 | ivarセンサス: includeされたモジュール上の`module_eval`、文字列`class_eval` | 行14（`IvarWriterCensus`, `STRING_EVALS`）、行50 |
| #2246 | `Es.send(:module_function)`定数レシーバー；可視性のフォローアップ | 行22（`Spellings.arguments`）、行35 |
| #3057 | `ConstructionEscape`のフレーム呼び出しスキャンが`send(:eval)`、`local_variable_get`、`TOPLEVEL_BINDING`を見落とす | 行31（`RemoverHolderScan.FRAME_CALLS` :48-50）および`ConstructionEscape`（本インベントリ外: 別のフレーム呼び出しスキャン）；`send`形式は共有ビューを経由することになる |
| #2475 | 証明されたivar writerがマークをクリアしない；`attr_writer` / `send(:x=)`のnil書き込みが報告されない | 行14、49（`IvarWriterCensus`, `ReflectiveIvarWrite`）；`send(:x=)`はどの箇所も解決しない属性writerスペリングである |
| #2376 | calleeフロアが`send(:[]=)`およびcalleeが呼ぶlambdaを見落とす | 行12、29（`CalleeWriteCensus`、`statement_evaluator`ハンドオフ） |
| #2704 | aliasフロア: 式展開された`send`名 | 行15（`literal_send_target`）；行34が唯一の式展開リーダーを持つ |
| #2612 | calleeフロア: postパラメータ、`bind_call`、`Proc#call`が追跡されない | 行2、12（`OPAQUE_ARGUMENTS`）、46 |
| #2632 | 定数レシーバー経由の`send`が追跡されない | 行12、29（`send_hand_off?`, `opaque_sink_call?`, `resolve_self_callees`） |
| #2697 | aliasフロア: lambda本体、private `send`、`each_value` | 行15、16 |
| #2673 | calleeフロア: 計算された名前を持つ`define_method` | 行33（`record_definer_name_row`）、行12 |
| #2386 | ivar/定数センサスが`send(:const_set)`とその場ミューテーションを見落とす | 行51（`const_set`箇所: scope_indexer.rb:3793, walker.rb:243）、行10 |
| #1377 | ブロックスキャンが`[]=` Regexpインデックス、単項`~`、一致する`send`、文字列`eval`を見落とす | 行19-20（`MatchRebinding::Calls`/`SelfCalls`）対`match_rebinding.rb`のブロックスキャン |
| #2401 | 呼び出し元ブロック内のcalleeフロア: 外部の`class_eval`/`define_method`ブロックをウォークする | 行7、12、50（`InterveningIvarReset.foreign_self_block?`, `CensusForeignBlock`） |
| #2160 | `class_eval` / 後の再オープンからのprivate呼び出しがメソッドをpublicのままにする | 行35、38（`Lens::FileReader`） |
| #2100 | `define_singleton_method`、extendされたモジュール、文字列`module_eval`経由のフック後に`--incremental`が古くなる | 行32、36、50 |
| #1969 | `module_function`特異クラス側、`send/prepend`のコピー | 行22 |
| #1920 | rigor-rspec `define_method(:==)` | プラグイン（スコープ外）、行47 |
| #2356 | `instance_eval { def name }`または`singleton_class.include`が兄弟クラスを沈黙させる | 行36（`singleton_naming_call_names`）、50 |
| #2048 | 特異クラスの書き換え: メソッド本体の書き換え、`class << self attr_writer` | 行36、47（`singleton_naming_call_names`, scope_indexer.rb:7155-7170） |

## 調査スクリプト

`survey.rb`:

```ruby
# frozen_string_literal: true
require "prism"
SENDS = %i[send __send__ public_send].freeze
META = %w[include extend prepend private public protected module_function define_method define_singleton_method
          alias_method attr_reader attr_writer attr_accessor instance_variable_set instance_variable_get const_get
          const_set class_eval module_eval instance_eval instance_exec class_exec module_exec eval remove_method
          undef_method private_class_method public_class_method private_constant remove_const binding
          method instance_method respond_to? send __send__ public_send].freeze
class V < Prism::Visitor
  attr_reader :inner, :tot
  def initialize = (super; @inner = Hash.new(0); @tot = Hash.new(0))
  def visit_call_node(node)
    @tot[:calls] += 1
    if SENDS.include?(node.name)
      @tot[:send_family] += 1
      f = node.arguments&.arguments&.first
      if f.is_a?(Prism::SymbolNode) || f.is_a?(Prism::StringNode)
        @tot[:literal] += 1
        @tot[:literal_string] += 1 if f.is_a?(Prism::StringNode)
        @tot[:literal_public_send] += 1 if node.name == :public_send
        n = f.unescaped
        if META.include?(n)
          @inner[n] += 1; @tot[:literal_meta] += 1
        else
          @tot[:literal_plain] += 1
          @tot[:literal_plain_setter] += 1 if n.end_with?("=")
        end
      elsif f.is_a?(Prism::InterpolatedStringNode) || f.is_a?(Prism::InterpolatedSymbolNode)
        @tot[:interpolated] += 1
      else
        @tot[:computed] += 1
      end
    end
    b = node.block
    @tot[:amp_sym] += 1 if b.is_a?(Prism::BlockArgumentNode) && b.expression.is_a?(Prism::SymbolNode)
    super
  end
end
v = V.new
n = 0
skipped = 0
ARGV.each do |dir|
  Dir.glob(File.join(dir, "**/*.rb")).each do |f|
    next if f.include?("/vendor/") || f.include?("/node_modules/")
    n += 1
    begin
      Prism.parse_file(f).value.accept(v)
    rescue StandardError
      skipped += 1
    end
  end
end
puts "files=#{n} skipped=#{skipped}"
v.tot.sort_by { |k, _| k.to_s }.each { |k, c| puts format("  %-22s %8d %8.4f%%", k, c, 100.0 * c / v.tot[:calls]) }
puts "inner meta selectors sent by literal name:"
v.inner.sort_by { |_, c| -c }.each { |k, c| puts "  #{k}: #{c}" }
```

`handles.rb`:

```ruby
# frozen_string_literal: true

# Read-only census of reflective call spellings over Ruby trees. Usage: ruby handles.rb DIR...
require 'prism'

SENDS = %i[send __send__ public_send].freeze
READERS = %i[method public_method singleton_method instance_method public_instance_method].freeze
HANDLE_CALLS = %i[call yield === [] bind_call].freeze
WRAPPERS = %i[bind unbind to_proc curry].freeze

class Census < Prism::Visitor
  attr_reader :c

  def initialize
    super
    @c = Hash.new(0)
  end

  def visit_call_node(node)
    @c[:calls] += 1
    if SENDS.include?(node.name)
      @c[:send_family] += 1
      @c[:"via_#{node.name}"] += 1
      first = node.arguments&.arguments&.first
      case first
      when Prism::SymbolNode then @c[:send_symbol] += 1
      when Prism::StringNode then @c[:send_string] += 1
      when Prism::InterpolatedStringNode, Prism::InterpolatedSymbolNode then @c[:send_interpolated] += 1
      when nil then @c[:send_noargs] += 1
      when Prism::SplatNode then @c[:send_splat_first] += 1
      else @c[:send_computed] += 1
      end
      if first.is_a?(Prism::SymbolNode) || first.is_a?(Prism::StringNode)
        rest = node.arguments.arguments.drop(1)
        @c[:send_lit_with_block] += 1 if node.block
        @c[:send_lit_with_splat_rest] += 1 if rest.any?(Prism::SplatNode)
        @c[:send_lit_with_kwargs] += 1 if rest.last.is_a?(Prism::KeywordHashNode)
        @c[:send_lit_recv_implicit_or_self] += 1 if node.receiver.nil? || node.receiver.is_a?(Prism::SelfNode)
        if node.receiver.is_a?(Prism::ConstantReadNode) || node.receiver.is_a?(Prism::ConstantPathNode)
          @c[:send_lit_recv_constant] += 1
        end
        begin
          @c[:send_lit_nested_send] += 1 if SENDS.include?(first.unescaped.to_sym)
        rescue StandardError
          nil
        end
      end
    end
    @c[:method_reader] += 1 if READERS.include?(node.name) && node.arguments
    if HANDLE_CALLS.include?(node.name)
      r = node.receiver
      r = r.receiver while r.is_a?(Prism::CallNode) && WRAPPERS.include?(r.name)
      if r.is_a?(Prism::CallNode) && READERS.include?(r.name)
        @c[:handle_chain_call] += 1
        @c[:handle_chain_bind_call] += 1 if node.name == :bind_call
      end
    end
    blk = node.block
    if blk.is_a?(Prism::BlockArgumentNode)
      @c[:block_pass] += 1
      e = blk.expression
      if e.is_a?(Prism::SymbolNode)
        @c[:block_pass_symbol] += 1
      elsif e.is_a?(Prism::CallNode) && READERS.include?(e.name)
        @c[:block_pass_method_reader] += 1
      end
    end
    super
  end
end

census = Census.new
files = ARGV.flat_map { |dir| Dir.glob(File.join(dir, '**/*.rb')) }
            .reject { |f| f.include?('/vendor/') || f.include?('/node_modules/') }
skipped = 0
files.each do |f|
  Prism.parse_file(f).value.accept(census)
rescue StandardError
  skipped += 1
end
c = census.c
puts "files=#{files.size} skipped=#{skipped}"
c.sort_by { |k, _| k.to_s }.each do |k, v|
  puts format('  %-34s %8d  %7.3f%% of calls', k, v, 100.0 * v / c[:calls])
end
```
