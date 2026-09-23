---
title: "戻り値契約としての `untyped`、`void`、`top` — `sig/` 監査から得られた知見（2026-09-22）"
description: "rigortype/rigor docs/notes/20260922-untyped-void-top-return-contracts.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260922-untyped-void-top-return-contracts.md"
sourcePath: "docs/notes/20260922-untyped-void-top-return-contracts.md"
sourceSha: "edcfbfa29b7fa3ca9fa69f4d1fc18b4167a2d980d8227b8ed6270a88d6ff549c"
sourceCommit: "74970d1ece5a858d82c9b2c8f1a5deb57831f984"
sourceDate: "2026-09-23T11:52:18+09:00"
translationStatus: "translated"
sidebar:
  order: 20266922
---

ステータス: 調査ノート、設計上のコミットメントなし。観測は`master`の`75c5ae91`（[#1169](https://github.com/rigortype/rigor/pull/1169)以降）におけるRigor 0.3.9、rbs 4.2.0、Ruby 4.0.5に対して実施。

このノートは「`sig/`以下のどの`-> untyped`戻り値が`-> void`であるべきだったか？」という機械的な問いから始まり、最終的に小さな型理論的考察へと発展した。その答えは、これら3つの型がどの値を*許容（admit）するか*ではなく、それぞれが何を*主張（assert）するか*に依存するためである。2つの結果が得られた: [#1169](https://github.com/rigortype/rigor/pull/1169)は真にvoid形状であった2つの宣言を変更し、残りの`untyped`戻り値は4つの由来（provenance）クラスに分類され、そのうち必然的に`untyped`であるのは1つだけであった。

## 問い

`sig/`以下の戻り値が`untyped`または`untyped?`であるすべてのメソッド宣言がリストアップされ、`lib/`、`spec/`、`plugins/`、`examples/`、`exe/`、および`apps/`のすべての呼び出し箇所に対してチェックされた:

```sh
# 02f3e27c（#1169以前）で79件；75c5ae91で77件。単純な`grep -- '-> untyped'`では86件となる:
# 余分な7件は1件のコメントと、メソッドの戻り値ではなくパラメーター位置にある6件のproc / ブロック型である。
git grep -E '^ *def [^#]*-> untyped\??$' <sha> -- sig/ | wc -l
grep -rn --include='*.rb' -E "(^|[^a-zA-Z0-9_])<method>\b" lib/ exe/ plugins/ spec/ | grep -v 'def '
```

2つのメソッドが、（a）すべての呼び出し箇所で結果を破棄しており、かつ（b）結果が文書化された値ではなく最後の式によるアーティファクトである、という条件を満たしていた: `Rigor::Plugin.unregister!`（`Mutex#synchronize`が残すもの — クリアされたgem登録の`Hash`または`Hash#delete`の結果 — を返す）および`Rigor::Plugin::Base.node_file_context`（代入された`Proc`を返す）。これらはいずれも`-> void`となった。

それ以外のすべては、呼び出し元のいずれかが消費する値を返している。したがって、voidの問いは2件で終了した。興味深いのは、なぜ*その2件*だったのか、そしてなぜ残りは依然として`untyped`なのかである。

## 3つの型、3つの異なる主張

`untyped`、`top`、`void`を「どれだけ知っているか」という単一の軸上にランク付けしたくなる誘惑に駆られる。しかしそれらは単一の軸上にはない。それぞれが戻り値の位置について異なる*種類*の主張を行う。

### `untyped` — 値についてではなく、チェッカーについての主張

`untyped`はRBSの動的型（dynamic type）である。Rigorが採用する漸進的型付け（gradual typing）の解釈（[special-types.md](../../type-specification/special-types/) § `untyped`と`Dynamic[T]`）において、それは両方向ですべての型と整合（consistent）する:

```text
consistent(untyped, T)   consistent(T, untyped)
```

整合性（consistency）は部分型付け（subtyping）ではない。`untyped`と`T`の間の双方向の代入が許容されるのは、`untyped`が束（lattice）の最上位や最下位に位置するからではなく、*整合性*関係が寛容（lenient）であるからである: チェッカーは追及を止めることに同意する。部分型付け判断は異なる関係であり、寛容にはならない — `relations-and-certainty.md`では`Dynamic[T]`がその静的ファセット（static facet）を通じて部分型付けを目撃（witness）するため、`Dynamic[top] <: String`は単に偽であり、動的な値が`String`スロットに流れ込むことを可能にしているのは部分型エッジではなく`consistent(Dynamic[top], String)`である。Rigorの内部表現はこれを可視化している — `untyped`は`Dynamic[top]`であり、偶然`top`である静的ファセットの周囲に「これはチェックされていない境界を越えた」と記録するラッパーである。

したがって戻り値契約として、`-> untyped`は次のように主張している: **「値が返されるが、チェッカーはあなたがそれに対して何を行っても異議を唱えない。」**これは常に*健全（sound）*であり — すべてのRubyの値がこれに生息（inhabit）する — しかし最も弱い誠実な主張であり、一種の*許可*である: `x = m(); x.call`は型チェックを通過する。

RBS自身の初期における`any`から`untyped`への改名（1.0以前；`references/rbs/docs/syntax.md`には依然として以前の表記として`any`が記録されている）は、まさにこの点に関わるものだった。`any`は存在型（existential、「何らかの型」）として読める；`untyped`はチェッカーの状態（「型付けされていない」）として読める。Rigorのrbs 4.2はもはや`any`を一切受け付けず — `RBS::Parser`はそれを型エイリアス参照として読み、`rbs validate`は`NoTypeFoundError`で失敗する — したがって「これは代わりに`any`にすべきか？」という問いには「それらは最初から異なる型ではなかった」という以外の答えはない。

### `top` — チェッカーを有効にしたままの、値についての主張

`top`は最大（greatest）の型である: すべての値がこれに生息し、既知の事実はそれが*すべて*である。`untyped`とは異なり、これは真の束要素であり、その周囲で部分型付けが寛容になることはない:

```text
T <: top   すべてのTについて
top <: T   T = top の場合のみ
```

したがって`-> top`は次のように主張している: **「値が返される；あなたはそれを保持してもよいが、絞り込み（narrowing）を行うまではそれに何も送信してはならない。」**これはTypeScriptの`unknown`であり、仕様はまさにその役割を割り当てている。これは、作者が記述することはできないが呼び出し元が検査することを期待している値に対する誠実な型である。

2つの理由から、今日監査された戻り値に対して`top`は不適切である。第一に、監査されたメソッドのいずれも、呼び出し元が*絞り込むことを意図した*値を返していない — それらは単に`sig/`を持たないクラスの具体的な何かを返しているか、呼び出し元が全く必要としないものを返しているかのいずれかである。第二に、そして実用上決定的なこととして: `top`に歯向かう力（teeth）を与えるガード診断である`static.value-use.top`は、**実装もADRもないまま**予約されている（[diagnostic-policy.md](../../type-specification/diagnostic-policy/)）。現在、`top`に対するガードされていない呼び出しは暗黙のうちに受け入れられるため、`-> top`は理論的には正しくても、`-> untyped`と同じ強制力しか持たない。

### `void` — 値についてではなく、*位置*についての主張

`void`は値の型ではない。Rigorの仕様はこれを「戻り値が使用されるべきでない式の結果マーカー」と呼び、RBS自身のドキュメントでも`void`、`boolish`、および`top`は「型システムにとってすべて同等である；それらはすべてtop型である」と述べられており、Rigorのトランスレーターもまさにそれを実装している（`Bases::Void => :translate_top`）。

したがって集合論的には、`void`は`top`そのものである — 生息者は同一である。違いはサイドチャネルにある: ADR-100の`void_origins`テーブルは、`void → top`の拡張（widening）が行われた時点で、この`top`が作者の`-> void`から生じたものであることを記録し、その由来（provenance）が値の位置（代入の右辺、呼び出しのレシーバー、呼び出しの引数）に到達した際に`static.value-use.void`を発火させる。

形式的には、これは型の中ではなくサイドテーブルで運ばれる、**`top`の上に重ねられた使用回数制限（use-count restriction）**である: それは何であるかではなく、結果が何回*消費*されてよいか（0回）を制約する。（これは線形型やアフィン型ではない — それらはちょうど1回、あるいは高々1回の使用を許可する；`void`は0回を許可する — そしてADR-100はこれをキャリア型ではなく意図的にサイドテーブルとした。）これが、`unregister!`および`node_file_context`にとってそれが正しい表記である理由である: それらの戻り値に関する真実の集合論的主張は「任意」（gem登録の`Hash`、`Proc`、`delete`が返した任意のもの）であり、真実の*契約*の主張は「そしてそれを読み取ってはならない」である。

これはまた、なぜ`-> nil`が誤った代替案であったかも説明する。`nil`は単集合の値型である；`-> nil`はボディが`nil`を生成するという積極的な主張である。ボディがリテラルの`nil`で終わる`dynamic_return`および`narrowing_facts`については、その主張は真であり、兄弟の`-> nil`シグネチャは正しい。ボディが`@node_file_context_block = block`で終わる`node_file_context`について、`-> nil`は*偽*となる — 実行時の値が生息しない型である。`void`はそのような虚偽を必要としない。

記録しておく価値のある最後の帰結: 束において`void`は`top`そのものであるため、仕様に明記されているとおり、`bot <: void`は自明に成り立つ — 常に例外を投げるボディは`void`契約を満たす — 一方で`void <: bot`は成り立たない。

### サマリー表

| 戻り値 | 生息者の集合 | 主張 | 0.3.9で強制されるか？ |
| --- | --- | --- | --- |
| `untyped` | すべての値 | チェッカー無効；呼び出し元は何を行ってもよい | 該当なし（チェックの欠如そのものである） |
| `top` | すべての値 | 呼び出し元は送信前に絞り込まなければならない | いいえ（`static.value-use.top`は予約中） |
| `void` | すべての値（`top`として） | 呼び出し元は消費してはならない | はい（`use-of-void-value`の背後にある`static.value-use.void`） |
| `nil` | `{nil}` | ボディは`nil`を生成する | はい（通常の名目チェック） |
| `bot` | `∅` | ボディは正常に戻らない | はい（フロー） |

監査されたメソッド間で強制力に差が出る行は`void`のみであり、それが本PRがそこで留まった理由である。

## 残りの77件が依然として`untyped`である理由

`untyped`が最も弱い主張であるならば、他の77件の宣言は不可避なのだろうか？ ほとんどはそうではない。それらは4つの由来（provenance）クラスに分類され、必然的に`untyped`であるのは最後のクラスだけである。

### A. 今日表現可能だが未記述 — ジェネリックのケースを含む

一部の`untyped`戻り値は、環境内ですでに利用可能な正確な型を持っている。

最も明確なケースは**パラメトリックなパススルー（parametric passthrough）**である。`Rigor::Testing.dump_type(value)`および`assert_type(expected, value)`は、「実行時に`value`を変更せずに返す」と文書化されている。誠実な型は「何らかの値」ではなく「*その*値」である:

```ruby
def self.dump_type: [A] (A value) -> A
def self.assert_type: [A] (String expected, A value) -> A
```

これは通常のパラメトリック多相（parametric polymorphism）である: 戻り値型は引数型によって*決定される*ため、型変数は`untyped`が捨ててしまう依存関係を表現する。`-> untyped`のもとでは、`x = dump_type(some_string); x.upcase`は`x`を`Dynamic[top]`のままにし、下流のチェーンを型なしにしてしまう；`[A] … -> A`のもとでは、`x`は`String`を維持する。型を*探査（probe）*するために存在するフィクスチャヘルパーこそ、型を失うことのコストが大きい場所である。[#1171](https://github.com/rigortype/rigor/pull/1171)がこれを着地させた；そのレビューでは束縛を直接測定し（`rbs_dispatch.rb`の`compose_arg_type_vars`は`A`を引数型にそのまま束縛し、未束縛の`A`は`Dynamic[top]`に逆変換され、`bot`引数は`bot`を返す）、1つの到達限界を発見した: 束縛にはスコープ付きディスパッチが必要なため、発見されたのみのクラスにおいて`include Rigor::Testing`の後に裸の`dump_type(x)`を呼ぶと、以前と同様に祖先フォールバックを通って`Dynamic[top]`と答える。

このクラスの他のメンバーは、`sig/`内またはバンドルされたRBS内ですでに名前付け可能であり、実装のコメントで型が明記されている戻り値である:

| メソッド | 現在 | 実装の記述 |
| --- | --- | --- |
| `Reflection.instance_method_definition` / `singleton_method_definition` | `untyped` | `RBS::Definition::Method`またはnil |
| `Reflection.instance_definition` / `singleton_definition` | `untyped` | `RBS::Definition`またはnil |
| `Environment#instance_definition` / `singleton_definition` | `untyped?` | `RBS::Definition`またはnil |
| `Scope#user_def_for` / `singleton_def_for` / `top_level_def_for` / `bindable_top_level_def_for` | `untyped?` | `Prism::DefNode`またはnil |
| `Source::NodeLocator.at_position` / `at_offset`（クラスおよびインスタンス） | `untyped?` | `Prism::Node`またはnil |
| `Plugin::Registry#find` | `untyped` | `Plugin::Base`またはnil |
| `Plugin::Base.node_file_context_block` | `untyped` | 宣言された`Proc`またはnil |
| `Plugin::Base#dynamic_return_type` | `untyped` | `Rigor::Type`またはnil |
| `Environment::RbsLoader#each_known_class_name` | `untyped` | ブロック付きの場合は`void`；ブロックなしの場合は`Enumerator[String, void]` |
| `SigGen::SkipReasonCatalog::Entry#id` / `summary` / `explanation` / `next_step` | `untyped` | `String`（すべての`Data`フィールドは文字列リテラル） |
| `Plugin::Manifest#consumes` | `untyped` | `Array[Manifest::Consumption]`（`Consumption`はすでに`sig/`に存在） |

`Prism::Node`は`sig/`で使用可能であり（`sig/prism_node_children.rbs`がすでにそれに対して宣言している）、`::RBS::Definition`は`rbs` gem自身のシグネチャから提供される。

### B. 未署名（unsigned）の名前空間にブロックされている

第2のグループは、その*クラス*が`sig/`以下で宣言されていないオブジェクトを返すものである。それに名前を付けるとロード時に`RBS::UnknownTypeName`が発生するため、`untyped`は主張というよりはプレースホルダーである。シグネチャのコメントにも明記されている（`cache_store`および`effect_table`に関する`sig/rigor.rbs`）:

- `Cache::*` — `Plugin::IoBoundary#cache_descriptor`、`Plugin::Base#plugin_entry`、`Runner#cache_store`。
- `Effects::*` — `Runner#effect_table`、`#effect_collection`、`#effect_sources`、`#effect_plugin_facts`、`#effect_collections_by_path`。第6および第7スイープにわたって着地（バウンド側、次いでコレクション側）。
- `Analysis::ProjectScan` — `Runner#prepare_project_scan`。
- `Plugin::ProtocolContract` — `Manifest#protocol_contracts`、`Base#protocol_contracts`。

ここではジェネリクスは役に立たない；修正方法はそれらの名前空間への`sig/`カバレッジの拡張であり、これは通常のインクリメンタルなシグネチャカバレッジ作業であり、ADR-107のもとで独自のレビュー境界を持つ。

### C. `sig-gen`の推論ギャップ

`sig/`は`rigor sig-gen`によってシードされており、ボディが`Dynamic[top]`に拡張されるメソッドは`sig.skipped.untyped-return`として出力される。いくつかのマニフェストリーダーには、「マニフェストが検証するが型付けしないパラメータから`initialize`で代入されたivarに対する`attr_reader`であるため、契約が`Array[String]`であるところで推論が`untyped`に達する」（[#392]）というコメントが付けられている。誠実な修正はシグネチャではなくエンジン側にあり、型記述契約のレビュー境界のもとでこれらを手作業で編集することは許可されているが、`sig-gen`が記録したギャップを塞ぐことにはならない。

### D. 真に`untyped`

プラグインから提供される不透明な値: `Plugin::Base#read_fact`、`#producer_value`、`#producer_error`、`FactStore#read`、`Manifest#config_schema`、`Cache.fetch`の`loader:` / `store:`。これらは実行時に第三者によって型が選択される値を運ぶ。ファクトストアのインターフェースをパラメータ化することによってこれらをジェネリックにすることは*可能*であるが、そのパラメータはリポジトリ内のすべての呼び出し箇所で`untyped`としてインスタンス化されるため、下流で引き締まるものは何もない。`untyped`こそが誠実な主張である。

## 今後の対応

- クラスAは自己完結したシグネチャPRである: ジェネリックな`dump_type` / `assert_type`、および名前付け可能な`Prism::` / `RBS::` / `sig/`内の戻り値。実行時の挙動は変更せず、各型は推測ではなく実装から読み取られるため、ADR-107のレビュー境界内に収まる。
- クラスBはシグネチャカバレッジのバックログであり、名前空間ごとに追跡されるべきである。
- クラスCは[#392]にとどまる。
- `static.value-use.top`は、作者が呼び出し元による検査を期待する戻り値に対して`-> top`を有意義な第3の選択肢とするためのミッシングピースであり続ける；それが存在するまでは、戻り値の位置にある`top`は歯向かう力のない理論にすぎない。

## 第2スイープ（2026-09-23）

クラスAの着地後に残った残余に対するパスにより、クラスB/C内部の分割が実際よりも粗かったことが判明した: 契約が`Array[String]`であるリーダーは新たな`sig/`カバレッジを全く必要とせず — `String`はコアである — その*要素クラス*が未署名であるリーダーのみが真にブロックされている。第2バッチはそのバーをクリアしたものを引き締めた:

| 宣言 | 現在 |
| --- | --- |
| `Environment#hkt_scan_failure` | `[String, String, String?, Symbol]?`（コメントが文書化していたタプル） |
| `Inference::Narrowing.analyse` | `[Scope, Scope]?` |
| `Plugin::Loader.load` / `.load` | `Registry`（および以前は未宣言だった`feature_resolver:`キーワード引数） |
| `Manifest#produces` | `Array[Symbol]`（バリデーターの入力ではなくリーダー: `initialize`が`to_sym`をマップする） |
| `Manifest#owns_receivers` / `#open_receivers` / `#rbs_complete_ancestors` / `#signature_paths` | `Array[String]`（`to_s`適用後に格納） |
| `Manifest#type_node_resolvers` | `Array[Plugin::TypeNodeResolver]` |
| `Runner#effect_sources` | `Hash[String, Array[String]]` |
| `Runner#return_summaries` | `Hash[[String, String], Hash[Symbol, untyped]]` |
| `Runner#param_inferred_types` / `#collect_param_inference_table` | `Hash[[String, Symbol, Symbol], Hash[Symbol, Type::t]]` |
| `Runner#evaluate_return_types` | `Hash[[String, Symbol, bool], Array[String?]]` |

残るものは真にクラスBである: `Plugin::Macro::*`上の`Manifest#block_as_methods` / `#heredoc_templates` / `#nested_class_templates` / `#trait_registries`；`Inference::HktRegistry::*`上の`#hkt_registrations` / `#hkt_definitions`（`#protocol_contracts`は着地済み — 第4スイープを参照）；`RuleWalk::CollectorDriver`上の`CheckRules.node_collector_driver`；`Environment#reflection`および`Environment::Reflection`上の3つの`*_reporter`リーダーとレポーターのダックタイプ；そして`Rigor::FlowContribution`上の`RbsExtended.read_flow_contribution` — 依然として未署名であり、そのissueの行がかつて主張したような`Effects`型ではない（`read_effect_envelope`および`Effects::*`サーフェス全体は着地済み — 第6および第7スイープを参照）。第1スイープのクラスDは変更されていない — `RbsCacheProducer.fetch`はさらにサブクラス多相（subclass-polymorphic）であるため、その`untyped`は`read_fact`と同じ理由で誠実であり、`Manifest#source_rbs_synthesizer`もレビュー時にそこに加わった: コンストラクタは`respond_to?(:call)`のみを要求し、ADR-32 WD6/WD12は結果に複数形状の契約（`String` / nil / `[:error, msg]` / `[:ok, src, msgs]`）を与えているため、`^(String) -> String?`宣言は実際の契約ではなくWD4の古いコメントをコピーすることになっていた。

## 第3スイープ: 最初のクラスBの着地

`Analysis::Baseline`が最も小さい未署名の名前空間であったため、最初に対処された。`Bucket`と`DriftRow` — `sig/`で宣言された最初の`Struct.new`クラス — は型付けされたメンバー行（`file`/`rule`/`message_regex`/`count`、`bucket`/`actual_count`/`status`、および`delta`）を持ち、これにより`Baseline#audit → Array[DriftRow]`、`attr_reader buckets → Array[Bucket]`、および`initialize`/`without`パラメータのブロックが解除された。`filter`の宣言された`[Array[untyped], Integer]`は`declared_divergent`の残余にとどまる: sig-genは`[Array[untyped], untyped] | [untyped, 0]`と推論し、`Integer`カウントはリテラルでシードされたローカル変数に対する作者の意図である。`diagnostics`パラメータは`untyped`のままである — `Analysis::Diagnostic`自身のシグネチャが部分的（`qualified_rule`メンバーがない）であるため、パラメータをより厳密にすると`diag.qualified_rule`が未署名メンバーの背後に隠れてしまう。すべてのメンバー行は[#1183]のもとでマークされており — sig-genはStructスケルトンを`untyped`メンバーと共に出力し、これは#1150の`Data.define`ギャップの`Struct`版である — `buckets`は#1154のもとでマークされている。

`Plugin::AdditionalInitializer`がそれに続いた: 3つの`attr_reader`が#1154形状（`initialize`パラメータから代入されたivarであり、`map(&:to_sym)` / `.dup.freeze`によって正規化される）である小さな検証済み値クラスであり、これにより`Manifest#additional_initializers`およびマニフェストキーワード引数が`Array[AdditionalInitializer]`へと引き締められた。`Registry#additional_initializers`はシグネチャに全く存在しなかったため同様に新しく宣言されたが、*マークされていない*残余として扱われた: `compile_aggregates`は`initialize`パラメータからではなくマニフェストに対する`flat_map`によってivarを構築するため、#1154はこれをカバーしない（`rbs_complete_ancestors`の兄弟も同様にマークされていない）。もう1つの残余は`alias eql? ==`行である — sig-genにはエイリアス合成機能がないため、新しいファイルの固定値1のもとでマークされないまま置かれている。`Manifest#initialize`の`additional_initializers:`キーワード引数は、そのバリデーターが強制する要素型を名指ししている。

## 第4スイープ: `Plugin::ProtocolContract`

`ProtocolContract`は、マニフェストの`protocol_contracts`フィールドの背後にあるADR-28の値オブジェクトである: 検証済みで凍結されたレコード（`path_glob`、`method_name`、`singleton`、`param_types`、`return_type_name`、`severity`）に加えて、`ParamType = Data.define(:index, :type_name)`メンバークラスを持つ。これを宣言したことで、`Manifest#protocol_contracts`（およびその`initialize`キーワード引数）、`Plugin::Base#protocol_contracts`、そして2つの以前は未宣言だった`Registry`リーダー — `protocol_contracts`と`contracts_for_path` — のブロックが解除された。

監査に基づく由来の分類:

- `ParamType`のメンバーリーダーと双方のコンストラクタは[#1150]のもとでマークされている — `Data.define`メンバーギャップ（`coerce_param_type`は`index`が非負のIntegerであり、`type_name`が空でないStringであることを証明する）。ここでは#1183は適用*されない*: それは`Data`ではなく`Struct.new`のメンバーをカバーする。
- `initialize`パラメータのivarに対する5つの`attr_reader`は[#1154]マーカーを持つ — それぞれ格納前に正規化（`dup.freeze`、`to_sym`、`coerce_param_types`）されるため、格納される型は手作業で書かれている。`severity`は、`VALID_SEVERITIES`がそれを束縛するリテラル和型`:error | :warning | :info`として宣言されている。`singleton`はマーカーを必要としなかった: sig-genはすでに`singleton ? true : false`の畳み込みから`false | true`を推論している。
- `initialize`は文書化された型強制サーフェス（`method_name`と`severity`に対しては`Symbol | String`、`param_types`のエントリーに対しては`ParamType | Hash`）を受け入れ、`void`を返す；`with_path_glob`、`==`、および`hash`は生成結果と同等である。
- 2つのマークされていない残余行: `to_h`は`Hash[String, untyped]`と宣言されている — sig-genは文字列リテラルでシードされた和型（`"error" | "info" | "warning" | …`）を推論し、より緩やかな宣言がマニフェストの`to_h`規約と一致する；`eql?`は`AdditionalInitializer`と同様に形状のない別のエイリアス行である。新しいファイルの固定値: 2。
- `Registry#protocol_contracts` / `#contracts_for_path`は新しく宣言され、どちらも`additional_initializers`と同じ理由でマークされていない残余である — ivarは`compile_aggregates`の`flat_map`から取得され、`contracts_for_path`は`path.nil?`の早期リターンにおいて宣言と乖離（declared-divergent）している。
- `Plugin::Base#protocol_contracts`は`generated`であることが判明した: 要素クラスが宣言された後、sig-genはすでに`manifest.protocol_contracts`を通じて`Array[ProtocolContract]`を推論していた。

## 第5スイープ: `Analysis::ProjectScan`

`ProjectScan`は7メンバーの`Data.define`である — LSPが世代ごとに1回構築し、`Runner.new(prebuilt:)`に戻す凍結された事前パススナップショットである。これを宣言することで`Runner#prepare_project_scan -> Analysis::ProjectScan`のブロックが解除され、`prebuilt:`キーワード引数が`untyped`から`Analysis::ProjectScan?`へと引き締められた。今日誠実なのは部分的な型付けのみである:

- 4つのメンバーが[#1150]マーカー（`Data.define`メンバーギャップ）のもとで実装証明された型を持つ: `plugin_registry`（`Plugin::Registry`）、`dependency_source_index`（`DependencySourceInference::Index`）、`plugin_prepare_diagnostics`（`Array[Analysis::Diagnostic]`）、および`pre_eval_diagnostics` — 後者は`Array[Diagnostic]`ではなく*レコード*型である: 事前評価スキャナは意図的に`{path:, line:, column:, severity:, rule:, message:}` Hashを出力するため、解析層に依存する必要がない；ランナーは呼び出し箇所で適応させる。
- 3つのメンバーはマークされていない残余として`untyped`のままである — それらの要素クラス（`Inference::SyntheticMethodIndex`、`Inference::ProjectPatchedMethods`、`Analysis::TemplateUnits`）自体が未署名の#1181バックログであり、名前を付けると`RBS::UnknownTypeName`が発生する。宣言された`untyped`はsig-gen自身の出力と一致するため、ギャップマーカーは適用されない。新しいファイルの固定値: 3。
- `Runner#prepare_project_scan`自体は`sig/rigor.rbs`内でレンダリング不可能な残余のままである — ボディは型付けされていない`@pre_passes`コラボレーターを介して委任するため、宣言が精密になったとしてもsig-genは戻り値を推論できない。ファイルの他の固定行と同じ扱いである。

## 第6スイープ: `Effects::*`、バウンド（bound）側

`Effects::*`は最大の未署名名前空間であるため、2つに分割される: このスイープでは**バウンド側** — `Label`、`MethodKey`、`TaintCause`、`Origin`、`LabelSet`、`Envelope`、`ConfigEnvelopes`、`EnvelopeIndex` — を着地させ、コレクション側（`Summary`、`EffectTable`、`FileCollection`、`PluginFacts`、4つの`Runner#effect_*`リーダー）はフォローアップに残された。ここで着地したもの:

- `Runner#effect_envelopes` — 新規宣言（リーダーは`sig/`に全く存在しなかった）: `Effects::EnvelopeIndex`。sig-genからは見えないプライベートヘルパーを通じてメモ化された、レンダリング不可能な残余。
- `RbsExtended.read_effect_envelope` → `Effects::Envelope?`。これは残余から完全に*外れた* — sig-genは`build_*_envelope`ヘルパーを通じて戻り値を証明する。
- `RbsExtended.read_flow_contribution`は`untyped?`のままとされた — 分類の修正: `Effects`型ではなく`Rigor::FlowContribution`を返し、その名前空間も未署名である。#1181の行はこのスライスがブロック解除するものを過大評価していた。
- `ConfigEnvelopes::Entry`は型付けされたメンバー行を取得（`match:`/`namespace:` `String?`、`bound: LabelSet`）；`Envelope`の`source`および`Origin`の`source`は`Symbol`ではなく閉じたリテラル和型として宣言された。
- `EnvelopeIndex.build`の`plugin_facts:`は、コレクション側の`PluginFacts`宣言を待つ間`untyped`のままとされた。

## 第7スイープ: `Effects::*`、コレクション（collection）側

名前空間の残りの半分: `Summary`、`EffectTable`（+ `Entry`）、`FileCollection`（+ `Edge`）、`PluginFacts`（+ `Row`/`Edge`）、およびそれらがブロック解除する`Runner`リーダー群。

- `Runner#effect_table` → `Effects::EffectTable`、`#effect_collection` → `Effects::FileCollection`、`#effect_plugin_facts` → `Effects::PluginFacts`、`#effect_collections_by_path` → `Hash[String, Effects::FileCollection]`。`effect_collection`、`effect_plugin_facts`、`adopt_effect_summary`、および`effects_served_from_cache?`は獲得済み（earned、生成済みまたは戻り値の意図）として分類された — `untyped`行が運んでいた残余は移動するのではなく縮小した。
- 存在しなかった箇所での新規宣言: `effect_ancestry`（`Hash[String, String]` — 書かれたとおりの`effect.liskov-widened`が読み取るスーパークラステーブル）、`adopt_effect_collections`、`adopt_effect_summary`、`effects_served_from_cache?`。`forced_file_effects`は型付けされた後にレビューで削除された — メソッドは`private`（`runner.rb`の`private :…`リスト）であり、プライベートAPIは`sig/`で宣言されないため。
- `EnvelopeIndex.build`の`plugin_facts:`は`PluginFacts?`へと引き締められ、バウンド側スイープが残した延期を解消した。
- 保持された誠実な`untyped`残余: `PluginFacts`の`contributions:`/`entry_points`要素（`Plugin::Registry::Contribution`および`Plugin::EffectEntryPoints`は依然として未署名）と、`extend_registry`のパラメータ（`Effects::Registry`も同様）。
- `PluginFacts::Row#callee_fallbacks`は`Hash[String, Array[String]]?`である — `FileCollection::Edge#fallback_selectors`の`Array[String]`ではなく、#1065の検索順序テーブルである；両者は異なるステージで同じ概念を運ぶ（セレクタごとのテーブルvs解決済みの再試行リスト）。
- `class_row`/`result_row`は宣言乖離（declared-divergent）として固定: `ancestry`メモヘルパーが不透明であるためsig-genは`nil`を推論し、`edges_for`も宣言乖離（`select`からの`Array[untyped]`）として固定 — 3つすべて誠実であり、すべて固定。4つの`PluginFacts` attr_reader（`unit_callee_rows`、`warnings`、`labels_by_owner`、`digest`）および`Summary`の`declared`/`proven`もマークなしで固定: これらは`initialize`パラメータから代入されるのではなく`absorb`/`compute_digest`/`flatten`によって構築されるため、#1154はこれらをカバーしない（`Registry#additional_initializers`がすでにマークなしで固定したのと同じ形状）。`entry_points`は獲得済みのまま残る例外である — sig-genは宣言が述べているとおりの`Array[untyped]`を推論する。

## 第8スイープ: エフェクト語彙 — `Effects::Registry`、`Plugin::Effect*`、`Contribution`

2つの`Effects::*`スイープが延期した残余群: ラベル語彙の値オブジェクトと、プラグイン側のエフェクト行クラス。

- `Effects::Registry`は`#1154`マークされた正規化リーダー（`vocabulary_version`、`labels`、`descriptions`）と共に宣言されている；`roots`はマークなしで固定 — パラメータから代入されるのではなく`@known`から計算される — プライベートヘルパーが回答を構築するためレンダリング不可能な`known?`/`suggest`/`retired`の隣にある。ファクトリー（`default`、`for_configuration`、`load_file`）および`with`は獲得済みである。
- `Plugin::EffectAttribution` / `EffectEdge` / `EffectAncestry` / `EffectEntryPoints`は新しいファイルである。閉じた和型のメンバーは閉じた形式で記述されている（`TARGETS`に対する`EffectEdge#target`、`EffectAncestry`は`child`/`parent`/`why`を保持）。`EffectAttribution`の計算された述語（`receiver_path?`/`self_path?`）のみがマークされていない行である；エッジ/祖先/エントリーポイントのファイルは完全に分類されている。
- `Plugin::Registry::Contribution`はネストされた`Data`サブクラスとして宣言されている — メンバーおよびキーワード専用の`self.new`/`self.[]`は[#1150]マークされている（`PluginFacts::Row`と同じ形状；`Data`の位置引数コンストラクタディスパッチはカスタムの`initialize`をバイパスするため、意図された呼び出し形式としてキーワード引数のみが宣言されている）。
- `Manifest`は6つの`effect_*`リーダー（それぞれ#1154 — `validate_effect_*!`が要素型を証明する）、`effect_owner`、`effect_discharge_allowed?`、`effects?`、および5つの検証済み`effect_*` initializeキーワード引数を獲得した。`Base`は5つの`effect_*`マニフェストデリゲートを獲得した（generated — sig-genがマニフェストリーダーを通じてそれらを証明する）。`Registry`は`effect_contributions`を獲得した（マークされていない残余: `initialize`パラメータの読み取りではなく、メモ化された`filter_map`集計）。
- 第7スイープの残りの`untyped`セルがクローズした: `PluginFacts`の`contributions:`は`Array[Plugin::Registry::Contribution]`となり、`entry_points`は`Array[Plugin::EffectEntryPoints]`となり（宣言乖離として残余に合流 — sig-genは依然として`absorb`から`Array[untyped]`を推論する）、`extend_registry`は入出力ともに`Effects::Registry`となり、パラメータの意図として残余から離脱した。
- `Manifest#effect_owner`はnilガードの前に`effect_root`をローカル変数に束縛するため、エンジンのローカル絞り込みが`String`を証明し、抑制は不要である（初期ドラフトでは代わりに重複リーダー形状に対して`def.return-type-mismatch`を抑制していた；レビューでより低コストな修正が見出された）。
- 規約に関する注記: 4つの`Plugin::Effect*`ファイルは、固定された残余として`eql?`行を`def eql?: (untyped other) -> bool`と表記している — `additional_initializer.rbs`および`protocol_contract.rbs`がすでに持っているのと同じ形式 — RBSの`alias`行ではない。監査ツールは`alias`行をスキップし、兄弟ファイル間でラチェットが比較不可能になってしまうためである。

## 2つの付随的な発見

次のスイープで再発見されないよう、ここに記録しておく:

- `sig/rigor/sig_gen/skip_reason_catalog.rbs`は以前、宣言なしで`::Rigor::SigGen`を参照していた；`sig/`に対する`rbs validate`および`make steep-check`の双方がそこで失敗していた。[#1174](https://github.com/rigortype/rigor/pull/1174)によって解決され、ファイルが現在持つ`module Rigor::SigGen; end`シェルが追加された。
- クリーンな`master`において`lib/rigor/effects/unit_scan.rb:560`で`flow.always-truthy-condition`が発火していた — CIのSelf-checkログでも確認できたが、それらのジョブはMakefileの`--fail-on=warning`なしで`rigor check --format json lib`を実行していたため、警告がCIを失敗させることはなかった。根本原因は`gather_ivar_writes`が複合ivar書き込み（`@x ||= v`）をシードしていなかったことであり、そのため`@dispatch_top_level`が`Constant[false]`のままであった — ADR-58 § WD5が延期した`||=`シーディング形状である。[#1179](https://github.com/rigortype/rigor/pull/1179)（[#1175](https://github.com/rigortype/rigor/issues/1175)のクローズ）によって解決された: 事前パスが3つの複合形式すべてをシードし、CI self-checkは現在`--fail-on=warning`付きで実行されている。

[#392]: https://github.com/rigortype/rigor/issues/392
[#1150]: https://github.com/rigortype/rigor/issues/1150
[#1154]: https://github.com/rigortype/rigor/issues/1154
[#1183]: https://github.com/rigortype/rigor/issues/1183
