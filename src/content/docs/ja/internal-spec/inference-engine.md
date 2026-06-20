---
title: "推論エンジン"
description: "rigortype/rigor docs/internal-spec/inference-engine.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/inference-engine.md"
sourcePath: "docs/internal-spec/inference-engine.md"
sourceSha: "e332271a2ee309f7e1ad91bd68ae7d93e96b49d6b157366e9e0e552824280c92"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 3050
---

このドキュメントは、Rigor型推論エンジンが満たさなければならない公開契約（contract）を仕様化します。すなわち`Rigor::Scope#type_of(node)`クエリ、不変スコープ規律、フェイルソフトな`Dynamic[Top]`ポリシー、およびそれらを取り巻く環境ロード境界です。これは[`docs/type-specification/`](../type-specification/)の型言語セマンティクスと[`internal-type-api.md`](../internal-type-api/)の型オブジェクト公開APIに対する、エンジン側の対応物です。

スライス（slice）単位の成長計画とADR-3の未決事項に対する暫定回答の根拠は[`docs/adr/4-type-inference-engine.md`](../../adr/4-type-inference-engine/)にあります。そのADRと本ドキュメントが観測可能なRubyの挙動について食い違うとき、本ドキュメントが束縛します。

## スコープ

本ドキュメントは以下を束縛します。

- `Rigor::Scope#type_of(node)`クエリの形状と安定性。
- そのクエリを取り巻く不変スコープ規律。
- 型付け器がまだ認識しないASTノードに対するフェイルソフトポリシー。
- 環境ロードの境界。すなわちどのサーフェス（surface）がMUST利用可能で、どのサーフェスがスライス間で変わってもMAY良いか。

本ドキュメントは以下を束縛**しません**。

- `Rigor::Scope`が用いる内部データ構造（公開サーフェスが保たれ、不変性が観測可能である限り）。
- `Rigor::Inference::ExpressionTyper`の内部で用いるビジターまたはパターンマッチ戦略。
- 任意の特定スライスで認識されるPrismノードの正確なカタログ。そのカタログは参考情報であり、[`docs/adr/4-type-inference-engine.md`](../../adr/4-type-inference-engine/)で追跡されます。

## `Scope#type_of(node)`契約

`Rigor::Scope#type_of(node)`はMUST純粋なクエリです。レシーバースコープやそこから到達可能な任意のオブジェクトをMUST NOT変更し、解析器の他のどこでも永続的な状態変更をMUST NOT引き起こしません。同じ`(scope, node)`ペアは、単一の解析器実行内の呼び出しを通じて構造的に等しい`Rigor::Type`の結果をMUST生成します。

クエリは[`internal-type-api.md`](../internal-type-api/)に従って`Rigor::Type`をMUST返します。`nil`をMUST NOT返し、サポートされないノードでMUST NOTraiseし、戻り値にPrismオブジェクトをMUST NOT露出させません。

レシーバーはMUST`Rigor::Scope`のインスタンスです。実装は生のHashや束縛のArrayをMUST NOT受け付けません。束縛コンテナは`Rigor::Scope`の内部実装です。

`node`引数はMUST`Prism::Node`または`Rigor::AST::Node`（後述の*仮想ノード*ファミリーからの合成ノード）のいずれかです。実装は、上流のPrismで追加されたときに追加のPrismノードファミリーをMAY受け付け、またエンジンを通じて登録されたときに追加の`Rigor::AST::Node`部分型をMAY受け付けますが、いずれのファミリー内でも認識されない具象クラスは後述のフェイルソフトポリシーの下でMUST扱い、raiseしてはなりません。

## 不変スコープ規律

`Rigor::Scope`のインスタンスはMUST不変です。構築の最後にMUST`freeze`されます。任意の公開または内部メソッドを通じた変更は契約違反であり、内部コンテナを公開するアクセサ経由のものも含みます。

状態変化はMUST明示的な遷移メソッドから返される新しいスコープとして表現されます。最小セットは以下のとおりです。

- `Rigor::Scope.empty(environment:)` — ローカル束縛なし・空の`Rigor::Analysis::FactStore`を持つスコープを構築し、`Rigor::Environment`に紐づけます。
- `Rigor::Scope#with_local(name, type)` — `name`が`type`に束縛されている点を除いてレシーバーと同じ新しいスコープを返します。ローカルを再束縛するとMUSTそのローカルを対象とするファクトを無効化します。
- `Rigor::Scope#local(name)` — 束縛された`Rigor::Type`を返すか、`name`が束縛されていなければ`nil`を返します。
- `Rigor::Scope#fact_store` — スナップショットに紐づく不変な`Rigor::Analysis::FactStore`を返します。
- `Rigor::Scope#local_facts(name, bucket: nil)` / `Rigor::Scope#facts_for(target:, bucket: nil)` — バケットストレージを直接公開せずに、スコープの`Rigor::Analysis::FactStore`からファクト（fact）を返します。
- `Rigor::Scope#with_fact(fact)` — `fact`がファクトストアに追加された新しいスコープを返します。
- `Rigor::Scope#join(other)` — 制御フロー合流点で新しいスコープを返します。実装は、2つのスコープが同じ`Environment`を共有することをMUST要求します。結合されたスコープは、**両方の**レシーバーが束縛するすべての名前にMUST束縛されます。そのような各名前について、結合された型はMUST`Type::Combinator.union(self.local(name), other.local(name))`です。一方のレシーバーにのみ束縛されている名前は、結合されたスコープからMUST落とされます。半束縛の名前のnil注入は文レベル評価器（[`docs/adr/4-type-inference-engine.md`](../../adr/4-type-inference-engine/)のSlice 3を参照）の責任であり、`#join`の責任ではありません。結合されたファクトストアは、両方の入力エッジに存在するファクトのみをMUST保持します。

`Rigor::Scope`は、有用な箇所で基底データを構造的にMUST共有します。親を共有し1つの束縛で異なる2つのスコープは、他のすべての束縛のストレージをMAY共有します。これは実装の詳細であり、契約の一部ではありません。

`Rigor::Scope#environment`は、スコープを構築したのと同じ`Rigor::Environment`インスタンスをMUST返します。環境は、スコープの観点からはクエリの期間中は不変として扱われます。

### FactStore（Slice 6 phase 2 sub-phase 2）

`Rigor::Analysis::FactStore`は各`Scope`スナップショットが運ぶ不変なファクト束です。最初の実装は意図的に小さいですが、[`control-flow-analysis.md`](../../type-specification/control-flow-analysis/)からの長期的なバケット形状を確立します。

- `Rigor::Analysis::FactStore.empty`は空のフローズンストアをMUST返します。
- `FactStore::Target.local(name)`はローカル束縛ターゲットを識別します。
- `FactStore::Fact`はMUST`bucket`・`target`・`predicate`・`payload`・`polarity`・`stability`を運びます。認識されるバケットは`local_binding`・`captured_local`・`object_content`・`global_storage`・`dynamic_origin`・`relational`です。
- `FactStore#with_fact(fact)`は新しいストアをMUST返し、構造的に等しいファクトを重複排除します。
- `FactStore#invalidate_target(target, buckets: nil)`は`target`に言及するファクトが除去された新しいストアをMUST返します。`buckets:`が指定されたとき、それらのバケット内のファクトのみが除去されます。
- `FactStore#join(other)`は両方のストアに存在する構造的に等しいファクトのみをMUST保持します。

ファクトストアのバケットは内部的な最適化境界です。`Scope`はファクトクエリとファクト追加遷移を公開してかまいませんが、呼び出し元はバケットストレージをin-placeでMUST NOT変更しません。

### ディスカバリインデックス（ADR-53トラックA）

フロー状態と並んで、すべての`Rigor::Scope`スナップショットは単一の不変な**ディスカバリインデックス**（`Rigor::Scope::DiscoveryIndex`）を保持します。これはシード時のディスカバリテーブル群 ── `declared_types`・`class_ivars`・`class_cvars`・`program_globals`・`discovered_classes`・`in_source_constants`・`discovered_methods`・`discovered_def_nodes`・`discovered_singleton_def_nodes`・`discovered_def_sources`・`discovered_method_visibilities`・`discovered_superclasses`・`discovered_includes`・`discovered_class_sources`・`data_member_layouts`・`struct_member_layouts` ── を保持します。メンバーシップは[ADR-53](../adr/53-scope-discovery-index-separation.md)の基準で固定されます。あるフィールドがインデックスに属するのは、**いかなるフロー遷移も、そのフィールドの値がシードと異なるスコープを生成しないとき、かつそのときに限り**です。

- インデックスはMUST不変です。これはフローズンな`Data`であり、シードされたインデックスは`DiscoveryIndex#with`を通じて導出されます。
- すべてのフロー遷移（`with_local`・`with_fact`・`join`・…）は、レシーバーのインデックスを参照で、検査せずに結果へMUST引き継がねばなりません。`Scope#==`はインデックスをMUST NOT比較しません（これはフロー状態ではなく環境コンテキストです）。
- `Scope`はテーブルごとのリーダー（`user_def_for`・`superclass_of`・`includes_of`・`discovered_method?`・`data_member_layout`・`class_ivars_for`・…）をデリゲートとしてMUST公開し続けます。これにより、エンジンの呼び出し位置やプラグインがストレージの分割から独立します。ADR-46の依存記録インストルメンテーションはこれらのデリゲートに存在し、それらがMUST唯一の読み取り経路であり続けねばなりません。
- `Scope#with_discovery(index)`は唯一のシード遷移です。テーブルごとの`with_discovered_*`ライターはADR-53スライスA2で除去されました。
- ネストされた本体（メソッドエントリー、クラス本体、または再型付けされたユーザーメソッド本体）のために構築されたスコープは、親スコープのインデックスを丸ごとMUST継承せねばなりません ── 決してテーブルごとのコピーではなく。テーブルごとのコピーは、抽出前に`data_member_layouts`が2度静かに脱落した原因です。

## フェイルソフトポリシー

型付け器がまだ認識しないノード — エンジンがまだ配線していないクラスのPrismノードか、未知の種別の`Rigor::AST::Node`のいずれか — に出会ったとき、`Scope#type_of(node)`は「型なし、未チェック」の標準的な`Dynamic[Top]`表現である`Rigor::Type::Combinator.dynamic(Rigor::Type::Combinator.top)`をMUST返します。

フェイルソフト経路はMUST以下を満たします。

- MUST NOTraiseします。呼び出し元はPrismが生成する任意の式ノード、および`Rigor::AST::Node`を含む任意の合成ノードについて`Scope#type_of`にMAY依存できます。
- [`value-lattice.md`](../../type-specification/value-lattice/)の動的起源代数をMUST保ちます。返された型に対する下流クエリは、他のあらゆる`Dynamic[T]`が観測するのと同じ<ruby>漸進的型付け<rp>（</rp><rt>gradual typing</rt><rp>）</rp></ruby>規則をMUST観測します。
- 後述の*フォールバックトレーサー*契約を通じて、計装にMUST観測可能です。

スライスがあるノード種別のサポートを導入するとき、その種別のフェイルソフト経路は同じスライス内でMUST除去されます。型付け器は、誤って型付けされたノードをマスクするフォールバックをMUST NOT残しません。

### フォールバックトレーサー

`Rigor::Scope#type_of`はオプショナルな`tracer:`キーワード引数をMUST受け付けます。`tracer`が`nil`（デフォルト）のとき、エンジンはトレーサーが取り付けられていないかのようにMUST振る舞います。すなわちMUSTイベントは記録されず、フェイルソフト経路で戻り値を生成するために必要な範囲を超える割り当てがMUST行われません。

`tracer`が非`nil`のとき、フェイルソフトフォールバック（PrismとSyntheticの両方）はすべて、単一のメソッド呼び出しを通じてトレーサーにMUST記録されます。

```ruby
tracer.record_fallback(event)
```

`event`はMUST`Rigor::Inference::Fallback`値オブジェクトで、構造的に等しい以下のフィールドを持ちます。

- `node_class` — フォールバックを引き起こしたノードのRubyの`Class`（例: `Prism::CallNode`・`Rigor::AST::SomeFutureNode`）。
- `location` — 実際のPrismノードに対するPrismソース位置オブジェクト、または位置を露出しない合成ノードに対する`nil`。
- `family` — 実際のPrismノードに対するシンボル`:prism`、`Rigor::AST::Node`を含むノードに対する`:virtual`。
- `inner_type` — 呼び出し元に返された`Rigor::Type`。今日は`Dynamic[Top]`です。後のスライスはフォールバックを観測可能に保ちながら内部型をMAYリッチにします。

`Rigor::Inference::FallbackTracer`が公開するトレーサープロトコルはMUST以下を満たします。

- `record_fallback(event)`は任意の`Rigor::Inference::Fallback`をMUST受け付け、他の引数を拒否します。
- `events`はMUST記録済みイベントのフローズンで順序付けされたスナップショットを返します。
- `empty?`と`size`はMUST現在の記録済みイベント数を報告します。
- `each`はMUST挿入順に記録済みイベントを反復します。トレーサーはMUST`include Enumerable`します。

トレーサーは`Scope#type_of`から観測可能な**唯一の**可変状態です。`type_of`の戻り値をMUST NOT変更し、`Rigor::Scope`のアクセサを通じてMUST NOT公開されません。実装は追加の`record_*`メソッドをMAY追加できます（例えばSlice 2ディスパッチャーがティアを得たときのよりリッチな`record_dispatch_miss`や、Slice 6での`record_budget_cutoff`など）。これにより複数のイベントファミリーが1つのトレーサーを共有します。新しいメソッドはMUST上記の不変イベント値オブジェクトパターンに従います。

## 仮想ノード

エンジンは、Prismノードに加えてMUST合成ASTファミリーを受け付けます。合成ノードは、ドキュメンテーション専用のマーカーモジュール`Rigor::AST::Node`をincludeし、エンジンが`Rigor::Type`へ翻訳するために必要なノード固有データを公開するRubyオブジェクトです。これにより、実際のPrism式を構築せずに「型Tの値がここに現れたら解析器は何を推論するか？」を`Scope#type_of`に問えるようになります。

合成ノードはMUST以下を満たします。

- MUST不変です。`Rigor::AST::Node`は構築時にMUST`freeze`されます。
- MUST構造的等価性をサポートします。構造的に等価なデータを持つ2つの合成ノードは、`==`と`eql?`の下でMUST等しく比較され、同じ`hash`をMUST共有します。
- 合成ノードが内部AST位置を持つとき、実際のPrismの子とMUST合成可能です。エンジンはすべての推移的な子が合成であることをMUST NOT要求しません。
- 解析器の状態やファクトストアのエントリーをMUST NOT運びません。そのような状態は`Rigor::Scope`またはエンジンの環境にあり、ノード上にはありません。

`Scope#type_of(virtual_node)`はPrismノードと同じフェイルソフト契約を通じてディスパッチされます。`Rigor::AST::Node`内の認識されない具象クラスはraiseするのではなくMUST`Dynamic[Top]`を返します。

### `Rigor::AST::TypeNode`

本仕様が束縛する最小の合成ノードファミリーは`Rigor::AST::TypeNode`です。MUST存在し、MUST`Rigor::AST::Node`をincludeし、MUST単一の`Rigor::Type`から構築可能であり、MUST以下を満たします。

- `Rigor::Scope#type_of(Rigor::AST::TypeNode.new(t))`は、任意の非`nil`な`t`について、`t`と構造的に等しく比較される`Rigor::Type`をMUST返します。
- エンジンは内部型をMUST NOT変更・正規化・注釈付け・ラップしません。`TypeNode`を通じたラウンドトリップは観測可能に恒等です。
- `TypeNode`は`Scope#type_of`の副作用として、`Dynamic[T]`・リファインメント（refinement、篩型とも）・任意の他のキャリア（carrier）にMUST NOTラップされません。

追加の合成ノード種別（呼び出し式・コンテナリテラル・ナローイング（narrowing）ラッパー）は後のスライスで追加され、昇格されるまで規範的ではありません。新しい種別はMUST上記の不変性・構造的等価性・合成可能性の規則に従います。

## メソッドディスパッチ境界

メソッドディスパッチ（レシーバー型と引数型から呼び出し式の結果型を決定する規則）はMUST NOT`Rigor::Type`のインスタンスに存在しません。型クラスは[`internal-type-api.md`](../internal-type-api/)に従って薄い値オブジェクトのままです。すなわち、構造的データを保持しケイパビリティ（capability）の問いに答えますが、メソッド要約テーブルや演算子ハンドラは運びません。

Slice 2は`Rigor::Inference::MethodDispatcher`を別のエンジンサーフェスとして導入します。元はSlice 3で計画されていましたが、`rigor type-scan`によるドッグフードシグナルが`Prism::CallNode`と`Prism::ArgumentsNode`が認識されない式の最大の単一ソースであることを示したため前倒しされました。Slice 2ディスパッチャーは定数畳み込みティアのみを出荷します。Slice 4はその背後にRBSバックのルックアップを重ねます（[`docs/adr/4-type-inference-engine.md`](../../adr/4-type-inference-engine/)を参照）。

ディスパッチャーの公開シグネチャは以下のとおりです。

```ruby
Rigor::Inference::MethodDispatcher.dispatch(
  receiver_type:,        # Rigor::Type or nil (implicit self; unsupported in Slice 2)
  method_name:,          # Symbol
  arg_types:,            # Array<Rigor::Type>
  block_type: nil,       # Rigor::Type or nil; the inferred return type of an
                         #   accompanying `do ... end` / `{ ... }` block.
                         #   Slice 6 phase C sub-phase 2: when non-nil, the
                         #   selector prefers a block-bearing overload and the
                         #   method-level type parameter that the block's
                         #   return type references is bound to `block_type`
                         #   so a return like `Array[U]` resolves to
                         #   `Array[block_type]`.
  environment: nil,      # Rigor::Environment; required for RBS-backed dispatch
  scope: nil             # Rigor::Scope or nil; when present, enables the
                         #   ADR-43 RBS-complete-ancestor resolution described
                         #   in the RBS-backed tier below. Defaults to nil, in
                         #   which case that resolution is inert and every other
                         #   tier behaves identically.
) #=> Rigor::Type, or nil when no rule matches
```

`nil`の戻り値は意図的な「規則なし」のシグナルです。呼び出し元はフェイルソフトフォールバックをMUST所有します（`ExpressionTyper`は`FallbackTracer`イベントを記録して`Dynamic[Top]`を返します）。ディスパッチャー自体はトレーサーにMUST NOT触れず、認識されない入力でMUST NOTraiseします。

ディスパッチャーはMUST以下の順序でティアを参照します: 精密ティア（定数畳み込み、形状認識、ファイル畳み込み、カーネル畳み込み、ブロック畳み込み）を最初に、次にプラグイン戻り値型コントリビューションティア（v0.1.1 Track 2スライス7、[ADR-2](../../adr/2-extension-api/) §「プラグインコントリビューションマージ」に従う）、次にHKT組み込み戻り値ティア（[ADR-20](../../adr/20-lightweight-hkt/)）とRigorバンドルの静的リファインメントティア、次にRBSバックのディスパッチティア、次に[ADR-16](../../adr/16-macro-expansion/)合成メソッドティア（基板Tier B / Tier Cのemitテーブル — ユーザー著作のRBSはなおその上で勝つ）、次に[ADR-17](../../adr/17-monkey-patch-pre-evaluation/)プロジェクトパッチメソッドティア（`pre_eval:`宣言された再オープンクラスのメソッドのために`Environment#project_patched_methods`を参照し、`Dynamic[Top]`を返して呼び出しが`call.undefined-method`なしにクロスファイルで解決されるようにする）、次に依存関係ソース推論ティア（v0.1.3 / [ADR-10](../../adr/10-dependency-source-inference/)スライス2b-ii — オプトインGemの`(class_name, method_name)`カタログエントリーのために`Environment#dependency_source_index`を参照し、ヒット時に`Dynamic[Top]`を返してコールサイトが動的由来マーカーを持つようにする）、次に発見済みメソッドティア（[ADR-24](../../adr/24-self-method-call-resolution/)に従うクロスファイルのユーザー定義`def`解決。レシーバーがメソッドの記録された発見済みクラスを名指すとき、素の`def`形状に対して`Dynamic[Top]`を返しますが、`Scope#user_def_for` / `singleton_def_for`が再型付け可能な本体を運ぶときは**辞退**し（`nil`を返し）、`ExpressionTyper#try_user_method_inference`が呼び出し先本体を再型付けして推論された戻り値を採用できるようにします ── [ADR-57](../../adr/57-self-call-return-adoption/)はその採用ゲートを無条件に開き、かつての`adoptable_self_call_result?`ガードを除去しました）、最後にRigorが名前で知っているがRBSでは知らないレシーバーに対して`Object` / `Class`に対して再試行するユーザークラス祖先フォールバック。非`nil`の`Rigor::Type`を返す最初のティアが勝ちます。ヒット時に後続のティアはMUST NOT参照されません。ディスパッチャーは、Prismの子ノードまたは（上記の*仮想ノード*契約を介した）合成`Rigor::AST::Node`引数のいずれかを運べる統一された呼び出し形状として入力をMUST取り、これによって合成された式と実際の式が単一のディスパッチ経路を共有します。

### ディスパッチティアの契約

上記の各ティアは*構造的インターフェース*です ── ダックタイプされた継ぎ目であり、RBS／Goの意味でのインターフェースであって、ADR-28のプロトコル契約ではありません。これは[`sig/rigor/inference.rbs`](https://github.com/rigortype/rigor/blob/master/sig/rigor/inference.rbs)において`interface _DispatchTier`として成文化されています。ティアは単一のエントリーポイントをMUST公開します。

```
try_dispatch(context) #=> Rigor::Type, or nil to defer to the next tier
```

`context`は不変の`Rigor::Inference::MethodDispatcher::CallContext`値オブジェクト（`Data`）であり、ティアが一つのコールサイトを畳み込むのに必要なすべてを運びます。すなわち呼び出しの四つ組（`receiver`・`method_name`・`args`）に加え、省略可能な`block_type`・`environment`・`call_node`・`scope`・`self_type_override`・`public_only`フィールドです。`dispatch`はコンテキストを一度だけ構築し、それを ── 変更せずに ── すべてのティアへMUSTスレッドします。異なるレシーバーや派生フラグ（ユーザークラスフォールバックの`public_only`再試行、由来モジュールの再ディスパッチ）を必要とするティアは、与えられたものを変更するのではなく、コピー（`CallContext#with`）によってか新しいものを構築することによって、新鮮なコンテキストをMUST取得します（値オブジェクトは凍結されています）。純粋なティア（定数畳み込み、形状認識、シングルトン畳み込み）は`receiver` / `method_name` / `args`のみをMUST読み、残りを無視します。上記の「最初の非`nil`が勝つ」ルールがこれらのティアの順序付けされた参照を統べます。

この契約は宣言的です。すなわち基底クラスや`implements`句（Rubyには存在しません）によって強制されるものではなく、バンドルされたティアはSteepの寛容モードの下で未型付けのままです。実装は`_DispatchTier`に適合させて正しい優先度に挿入することでティアをMAY追加できます。エントリーポイントのキーワードサーフェスを再び広げてはMUST NOTなりません（値オブジェクトはまさにティアごとのシグネチャを一様に保つために存在します）。

RBSバックのティアは、レシーバー型を`kind`が`:instance`または`:singleton`である`(class_name, kind)`ペアにMUST解決します。

- `Type::Constant[v]`は`(v.class.name, :instance)`に解決されます。
- `Type::Nominal[name]`は`(name, :instance)`に解決されます。
- `Type::Singleton[name]`（Slice 4 phase 2b）は`(name, :singleton)`に解決されます。ディスパッチャーはこの種別についてMUST`instance_method`ではなく`RbsLoader#singleton_method`を参照し、これにより`Foo.bar`は`Foo`のクラスメソッドを正しくルックアップします。
- `Type::Dynamic[T]`は同じ規則を用いて`T`の静的ファセットへ再帰します。
- `Type::Top`と`Type::Bot`はディスクリプタを生成しません。ディスパッチャーはMUST`nil`を返します。

`Union`レシーバーは各メンバーをMUST個別にディスパッチします。すなわちすべてのメンバーが解決すると、メンバーごとの戻り値型がunionされそのunionが返されます。任意のメンバーが`nil`を返すと、全体のディスパッチはMUST`nil`を返します。インスタンスとシングルトンのメンバーを単一のunion内で混ぜることはMUST NOT特別扱いされません。各メンバーはそれぞれのディスクリプタに対してディスパッチされます。

**RBS完全祖先解決（[ADR-43](../../adr/43-rbs-complete-ancestor-resolution/)）**。解決された`(class_name, kind)`ディスクリプタのクラスがRBS既知**でない**とき（`ScopeIndexer`が発見したRubyソース由来の部分型で、RBS環境のクラス宣言に存在しない場合）、直接のメソッドルックアップは外れ、そのクラスがRBSにとって未知であるため祖先ウォークも走らず、呼び出しは`Dynamic[Top]`へ劣化することになります。これは偽陽性に安全なデフォルトです。すなわちRBSのみのクラスを部分型化したRubyクラス（`class MyController < ActionController::Base`）は、*部分的*なgemのRBSが省略しているメソッドにも日常的に応答するため、その継承された呼び出しをそのRBSに対して解決して`call.undefined-method`を発火させると、動作しているコードを脅かすことになります。したがってディスパッチャーは一般的なケースについてはそのフォールバックをMUST維持します。限定された例外として、（a）`scope:`が`dispatch`へスレッドされ、（b）`class_name`がRBS既知でなく、（c）`class_name`の発見済み上位クラス連鎖（`Scope#superclass_of`、ADR-24）がエンジンの凍結された`ALLOWED_RBS_COMPLETE_ANCESTORS`許可リスト上のクラスへ到達するとき、ディスパッチャーはそのメソッドを許可リストに載った祖先のRBS定義（`kind`に応じてインスタンスまたはシングルトン）に対してMUST解決します。許可リストのメンバーシップ基準は「このクラスのRBSは権威的かつ完全である ── それが宣言しない呼び出しは正真正銘の誤りである」というもので、`Rigor::Plugin::Base`をシードとします（本リポジトリはクラスと`sig/rigor/plugin/base.rbs`の両方を所有し、`lib`の自己チェックによってロックステップに保たれます）。そして、RBSが省略しているメソッドにそのオブジェクトが応答するようなコア／stdlib／サードパーティのクラスをMUST NOT含めます。連鎖ウォークは、不正な巡回的`class A < B` / `class B < A`ソースがループしないよう、訪問済み集合をMUST運びます。許可リストに載った祖先へ到達する解決は、その祖先のRBSに対して直接ディスパッチするのと観測上同一でMUSTあります ── つまり通常の`call.undefined-method` / `call.wrong-arity`規則が継承された契約呼び出しにも適用され、祖先のRBSが運ぶ精度（例えば`Manifest`戻り値型）がコールサイトへ流れます。

解決されたRBSメソッドが複数のオーバーロードを持つとき、Slice 4 phase 2cは`Rigor::Inference::MethodDispatcher::OverloadSelector`を通じてその1つを選択します。セレクタはMUST以下を行います。

- 位置引数のアリティ（arity）でオーバーロードをフィルタします。実際の`arg_types.size`はMUST`required_positionals.size + trailing_positionals.size <= n`を満たし、かつ`rest_positionals`が存在するか`n <= required + optional + trailing`のいずれかです。
- `required_keywords`が空でないオーバーロードをスキップします。Slice 4 phase 2cはキーワード引数を呼び出し位置に通さないため、キーワード必須のオーバーロードは現在の呼び出し形状から到達不能です。
- 残ったオーバーロードのうち、すべての（仮引数、実引数）位置ペアについてMUST`param_type.accepts(arg_type, mode: :gradual)`を参照します（rest位置引数は1つの宣言を繰り返し消費します）。すべてのペアが`yes`または`maybe`を返すとき、オーバーロードはマッチします。
- 宣言順で最初にマッチしたオーバーロードを取ります。どのオーバーロードもマッチしないとき、`method_types.first`にフォールバックします。このフォールバックは「最初のマッチが勝つ」からの唯一の規範的な逸脱です。これは、（`untyped`に劣化したインターフェイス・ジェネリクス・まだ配線していない呼び出し元のため）実際の引数型がどのオーバーロードにもマッチしない呼び出し位置について、Slice 4 phase 1 / 2bのフェイルソフト契約を保ちます。

実装はパフォーマンスのためにオーバーロードごとに引数型を事前翻訳してMAYかまいませんが、`self_type`と`instance_type`の置換はディスパッチ位置に依存するため、`(class_name, method_name)`キーにまたがって結果をMUST NOTキャッシュしません。

`Rigor::Inference::RbsTypeTranslator.translate(rbs_type, self_type:, instance_type:, type_vars:)`は`RBS::Types::*`から`Rigor::Type`への唯一の規範的経路です。MUST決定的であり、任意の整形式RBS型でMUST NOTraiseし、[`docs/adr/4-type-inference-engine.md`](../../adr/4-type-inference-engine/)に文書化されたマッピングにMUST従います。置換キーワードは独立しています。

- `Bases::Self`はMUST`self_type:`で置換されます。インスタンスディスパッチでは`Nominal[C]`、シングルトンディスパッチでは`Singleton[C]`です。
- `Bases::Instance`はMUST`instance_type:`で置換されます。ディスパッチャーは、レシーバーが`Singleton[C]`であっても`def self.create: () -> instance`が`Nominal[C]`に解決されるよう、ディスパッチ種別に関係なく`Nominal[C]`を渡します。
- `Variable`（Slice 4 phase 2d）はMUST`type_vars:`で置換されます。マップはRBS変数の`name`シンボル（`:Elem`・`:K`・`:V`...）でキー付けされます。束縛された変数はMUST束縛された`Rigor::Type`値に置換されます。束縛されていない変数はMUST`Dynamic[Top]`に劣化します。
- `ClassInstance`はMUST同じ`translate`呼び出しを通じて`args`を再帰的に翻訳し、`::Array[Elem]`が`Nominal["Array", [type_vars[:Elem]]]`へラウンドトリップするようにします。兄弟ジェネリック形式（`Tuple`・`Record`・`Proc`）の翻訳器は、Slice 5以降でジェネリック搭載が育てば、同じ再帰規則に従います。
- 任意のキーワードはMAY省略でき、対応するRBSトークンは`Dynamic[Top]`に劣化します。`type_vars:`のデフォルトはMUST空ハッシュで、これによりキーワードは非ジェネリック呼び出しに影響しません。

マッピングを精緻化する将来のスライス（交差・インターフェイス・エイリアス解決）は、漸進的型付け軸において既存エントリーの出力をMUST変更しません。精度のいかなる引き締めも、結果型に対する部分型（subtype）クエリへの非破壊変更でMUSTあります。

Slice 4 phase 2dのジェネリックディスパッチ契約はMUSTさらに以下を満たします。

- `Rigor::Type::Nominal`はMUST順序付き・フローズンな`type_args`配列を運びます。空配列はMUST「素」形式（`Array`）を表し、空でない配列はMUST適用済みジェネリック（`Array[Integer]`）を表します。2つのキャリアは`class_name`**と**`type_args`の両方が一致するときのみMUST構造的に等しく比較されます。
- `Rigor::Environment::RbsLoader#class_type_param_names(class_name)`はMUSTそのクラスの宣言された型パラメータ名を`Array<Symbol>`として返します。シングルトンメソッドが同じ名前でパラメータ化されるため、インスタンス定義から取得します。非ジェネリッククラスや未知の名前についてはMUST空配列を返します（フェイルソフト）。
- ディスパッチャーは`class_type_param_names`をレシーバーの`type_args`とジップして`type_vars`マップをMUST構築します。空の`type_args`（素のレシーバーとシングルトン）は、自由変数が以前と同様に劣化するようMUST空マップを生成します。パラメータと引数のアリティ不一致はMUST空マップを生成します。ディスパッチャーは黙って切り詰めたりパディングしたりしてはMUST NOTなりません。
- ディスパッチャーはMUSTオーバーロードセレクタと最終的な戻り値型翻訳の両方に同じ`type_vars`マップを通し、これにより`::Array[Elem]`のような引数型は`Array[Dynamic[Top]]`に劣化するのではなく、acceptsチェックの前にElemを置換します。

Slice 5 phase 1のシェイプ（shape）ディスパッチ契約はMUSTさらに以下を満たします。

- `Rigor::Type::Tuple`と`Rigor::Type::HashShape`はディスパッチレシーバーとして使われるとき、MUST基底のnominalキャリアに射影されます。`Tuple[T1..Tn]`は`Nominal["Array", [union(T1..Tn)]]`に射影されます（空Tupleでは素の`Array`）。`HashShape{k: T,...}`は`Nominal["Hash", [union(constant_keys), union(values)]]`に射影されます（空シェイプでは素の`Hash`）。射影はMUST`RbsDispatch.receiver_descriptor`に閉じ込められます。キャリア自体のサーフェス契約はMUST値オブジェクトとして薄く保たれます。
- `Rigor::Inference::Acceptance`はシェイプキャリアを射影されたnominalと対称にMUST扱います。
  - nominalな`self`はシェイプを射影し既存のnominal受理経路を再帰することでシェイプの`other`をMUST受理し、これにより`Nominal[Array, [Integer]].accepts(Tuple[Constant[1], Constant[2]])`は`Nominal[Array, [Integer]].accepts(Nominal[Array, [union(Constant[1], Constant[2])]])`と等価で同じ結果を生成します。
  - `Tuple`な`self`は同じアリティの`Tuple`な`other`をMUST要求し、要素ごとに（共変（covariant）で）再帰します。アリティ不一致はMUST`no`に縮退します。`Tuple`でない`other`はMUST拒否されます。なぜなら解析器はジェネリックnominal単独からアリティを証明できないからです。
  - `HashShape`な`self`は、`self`のすべての必須キーが`other`で必須であることをMUST要求します（共有エントリーでは深さ共変）。`self`のオプショナルキーは`other`でMAY不在でかまいませんが、存在するときは値が同じ深さチェックをMUST満たします。closedな`self`は既知の追加キーとオープンな追加キーソースをMUST拒否します。openな`self`はより広いシェイプをMAY受理します。必須キーの欠落はMUST`no`に縮退します。`HashShape`でない`other`はMUST拒否されます。nominal側の射影は`accepts_nominal`経路に存在し、HashShape経路には存在しません。
- `Rigor::Inference::RbsTypeTranslator`は`RBS::Types::Tuple`と`RBS::Types::Record`を専用のシェイプキャリアにMUSTマップします（`Nominal[Array]`/`Nominal[Hash]`にではありません）。要素型とフィールド型は呼び出し元の`self_type:` / `instance_type:` / `type_vars:`コンテキスト下で再帰的にMUST翻訳され、これによりタプルやレコード内のジェネリクスが境界を越えて生き残ります。`Record`は必須フィールドを`RBS::Types::Record#fields`から、オプショナルフィールドを`#optional_fields`からMUST翻訳し、結果の`HashShape`をclosedとMUSTマークします。
- `Rigor::Inference::ExpressionTyper`は、すべての要素が非splat値である空でない配列リテラルを`Tuple`キャリアにMUSTアップグレードします。splatを含むリテラルは、`[*xs, 1]`が依然として推論可能な要素型を生成するよう、Slice 4 phase 2dの`Nominal[Array, [union]]`形式をMUST保ちます。`ExpressionTyper`は、すべてのエントリーが静的な`SymbolNode`または`StringNode`キー（非`nil`の`value`/`unescaped`を持つ）の`AssocNode`であるハッシュリテラルを`HashShape`キャリアにMUSTアップグレードします。`AssocSplatNode`エントリー・動的キー・重複キーを持つリテラルはMUST`Nominal[Hash, [K, V]]`形式にフォールスルーします。整数端点の`RangeNode`リテラルは、シェイプディスパッチがタプル範囲スライスを解決できるよう、`Constant[Range]`としてMUST運ばれます。動的範囲はMUST`Nominal[Range]`のままです。

呼び出しのレシーバーが`Rigor::Type::Dynamic`で正のディスパッチャーティアがどれもマッチしないとき、`ExpressionTyper#call_type_for`は`FallbackTracer`イベントを記録せずに*静かに*MUST`Dynamic[Top]`を返します。これは認識されたセマンティック結果であり — [`value-lattice.md`](../../type-specification/value-lattice/)の値格子代数はDynamicが不透明なメソッド呼び出しを通じて伝播することを要求します — フェイルソフト的妥協ではありません。Dynamicでないレシーバーは、規則が解決されないときには依然として標準のフェイルソフトフォールバック（トレーサーイベント付き）をトリガーします。

Slice 5 phase 2のシェイプ対応ディスパッチティア（`Rigor::Inference::MethodDispatcher::ShapeDispatch`）は、`Tuple`と`HashShape`のレシーバーが要素アクセスメソッドを射影された`Array#[]` / `Hash#fetch`の答えではなく位置ごと/キーごとの精密な型に解決するよう、定数畳み込みティアとRBSバックティアの間でMUST動作します。ティアは以下のカタログをMUST処理し、呼び出しを静的シェイプに対して証明できないとき`nil`を返して`RbsDispatch`に委ねます。

- Tupleレシーバー: `first`・`last`・`size`/`length`/`count`（無引数・無ブロック）はMUST精密なタプル要素/`Constant[size]`を返します。単一の`Constant[Integer]`引数を伴う`[]`と`fetch`は、負のインデックスを長さで正規化しMUSTインデックスが`[-size, size)`にあるとき精密な要素を返します。範囲外のインデックスはMUST委ねます（`nil`）。これにより`fetch`（は実行時にraiseするでしょう）に対しては射影の答えが適用され、チェーンステップを通じて呼ばれたとき（後述の`dig`を参照）にのみMUST`Constant[nil]`に解決されます。`Constant[Range]`の整数/nil端点を伴う`[]`と2つの`Constant[Integer]`引数を伴う`[]`はRubyの`Array#[]`スライスセマンティクスをMUST用い、スライスされた`Tuple`または静的にnilなスライスについて`Constant[nil]`を返します。`fetch`はそれらの形式をMUST NO要求しません。`dig`は解決されたメンバーを通じてMUST再帰します。`Tuple`/`HashShape`のメンバーは残りの引数でカタログにMUST再ディスパッチします。`Constant[nil]`メンバーはチェーンをMUST短絡します（Rubyの`Array#dig`は実行時に同じことをします）。他のConstantsと任意の非シェイプキャリアはMUST委ね、射影の答えが適用されます。チェーンステップ*中*に発生する範囲外インデックスは、Rubyの`Array#dig`が範囲外インデックスに対してraiseするのではなくnilを返すため、MUST`Constant[nil]`に解決されます。
- HashShapeレシーバー: `size`/`length`（無引数）は、シェイプがclosedで既知のキーがどれもオプショナルでないときにのみMUST`Constant[size]`を返します。単一の`Constant[Symbol|String]`引数を伴う`[]`と`fetch`は、必須キーが宣言されているときMUST精密な値を返します。オプショナルキーの`[]`/`dig`はMUST`value | nil`を返しますが、オプショナルキーの`fetch`は、キーが不在の可能性があり、Rubyが`KeyError`をraiseするためMUST委ねます。欠落キーは`[]`について（Rubyの実行時挙動と一致して）MUST`Constant[nil]`に解決され、`fetch`についてはMUST委ねます。`dig`はTuple `dig`と同じチェーンセマンティクスにMUST従います。すなわち単一の静的キーは精密な値（または欠落キーに対しては`Constant[nil]`）に解決されます。複数キーチェーンは解決された値を新しいレシーバーとして再帰します。1つ以上の`Constant[Symbol|String]`引数を伴う`values_at`はMUST位置ごとの値がキーごとの値であり欠落キーが`Constant[nil]`で埋められた`Tuple`を返します。任意の引数が非静的のときや、呼び出しが引数ゼロのときはフォールスルー（委ねる）します。

シェイプティアはRBS環境をMUST NOT参照し、任意の入力でMUST NOTraiseし、フォールバックトレーサーにMUST NOT触れません。これは型キャリアの上に重ねられた純粋な精緻化です。カタログ外のメソッド・非静的なキー/インデックス・非整数範囲・チェーンステップが静的に解決できない任意の`dig`/`values_at`呼び出しはMUST委ね、射影ベースの`RbsDispatch`の答えが適用されます。

この分離は規範的です。すなわち実装はいかなる`Rigor::Type`形式の演算子メソッド対応サブクラスをMUST NOT定義しません（例えば、`+`/`*`規則を運ぶ仮想的な`Rigor::Type::IntegerType`）。演算子セマンティクスはディスパッチャーが参照するメソッドハンドラエントリーとしてMUST表現されます。組み込み算術のために型クラスを特殊化することは、型格子とメソッドセマンティクスを独立に拡張可能に保つために拒絶されます。

## ローカル変数

ローカル変数リードノード（`Prism::LocalVariableReadNode`）はMUSTレシーバースコープでルックアップされます。束縛された名前はMUST束縛された`Rigor::Type`を返します。束縛されていない名前は上記の規則に従いMUST`Dynamic[Top]`へフェイルソフトします。`Scope#type_of`は束縛されていないローカルでMUST NOTraiseします。

ローカル変数ライトノード（`Prism::LocalVariableWriteNode`とそれを含意するターゲット）はMUSTその値式の型として型付けされます。結果をスコープへ束縛し直すことは文レベル評価器の責任であり（[`docs/adr/4-type-inference-engine.md`](../../adr/4-type-inference-engine/)のSlice 3を参照）、`Scope#type_of`自体はスコープをMUST NOT変更しません。

## 文レベル評価

`Rigor::Scope#type_of`は純粋な式レベルクエリであり、スコープをMUST NOTスレッドしません。文レベル評価器`Rigor::Inference::StatementEvaluator`（Slice 3 phase 2）はその隣にあり、補完的なスコープスレッディングサーフェスを提供します。`Rigor::Scope`上の公開デリゲートはMUST存在します。

```ruby
Rigor::Scope#evaluate(node, tracer: nil) #=> [Rigor::Type, Rigor::Scope]
```

契約はMUST以下を満たします。

- 返されたペアの最初の要素はMUST`node`が生成する型で、純粋な式について`Scope#type_of(node)`が返すものと等価です。2番目の要素はMUST`node`が実行された**後**に観測可能なスコープです。スコープ効果を行わないノードについて、これはMUSTレシーバースコープです（`==`で比較され、レシーバーの同一性はMAY異なります）。
- レシーバースコープはMUSTいかなる場合も変更されません。内部の再帰は、分岐が分離され区別された分岐出力の等価性が観測可能であるよう、フォークされた各スコープについてMUST新鮮な`StatementEvaluator`インスタンスを割り当てます。
- `tracer:`キーワードはMUSTすべてのネストされた`Scope#type_of`呼び出しにスレッドされ、これにより文的ノードの子を型付けする間に発出されるフェイルソフトフォールバックが同じトレーサー下に記録されます。
- 評価器が特殊化していないノードに対する`evaluate`呼び出しは、MUST`Scope#type_of(node, tracer:)`に委ね、MUSTレシーバースコープを変更せずに返します。これによりSlice 1のフェイルソフトポリシーが保たれます。すなわち認識されない文的ノードはMUST NOTraiseしません。

Slice 3 phase 2で評価器がMUST認識するノードのカタログは以下のとおりです。

- `Prism::ProgramNode`と`Prism::StatementsNode` — 宣言順にすべての子文を通じてスコープをスレッドする逐次評価です。本体の値はMUST最後の文の型（空本体では`Constant[nil]`）です。後置スコープはMUST最後の文の後置スコープです。
- `Prism::LocalVariableWriteNode` — エントリースコープ下で右辺値を評価し、`Scope#with_local`を介して`name`を結果型に束縛します。ペアの型はMUST右辺値の型と等しくなります。
- `Prism::MultiWriteNode`（Slice 5 phase 2 sub-phase 2） — エントリースコープ下で右辺を一度評価し、それから分解木（`lefts` / `rest` / `rights`、`rest`は`Prism::SplatNode`で`expression`はMAY`Prism::LocalVariableTargetNode`）を歩き、`Rigor::Inference::MultiTargetBinder`を介してすべての名前付きローカルを束縛します。ペアの型はMUST右辺の型と等しくなります（Rubyの`(a, b = [1, 2]) #=> [1, 2]`セマンティクスと一致）。右辺が`Type::Tuple`のとき、スロットごとの束縛はMUST要素ごとです。すなわち欠落した前方/後方スロットは`Constant[nil]`に縮退し、restスロットは中間要素の`Type::Tuple`（ソースに余剰がないとき`Tuple[]`）に束縛されます。`Tuple`でない右辺については、すべてのスロットがMUST`Dynamic[Top]`に束縛されます。ネストされた`Prism::MultiTargetNode`ターゲットはMUST同じバインダーを通じて再帰します。非ローカルなターゲット（インスタンス/クラス/グローバル変数、定数、インデックス/呼び出しターゲット、無名splat）はMUST静かにスキップされます。
- `Prism::IfNode`と`Prism::UnlessNode` — 述語をまず評価し（その後置スコープは両方の分岐で共有されます）、それから後置述語スコープ下で各分岐を評価します。結果型はMUST2つの分岐型のunionです。後置スコープはMUST2つの分岐スコープのnil注入付き結合です（後述）。`nil`分岐（else／thenなし）はMUST`Constant[nil]`と後置述語スコープを寄与します。
- `Prism::ElseNode` — レシーバースコープ下で本体を評価し、空本体については`[Constant[nil], scope]`を返します。
- `Prism::CaseNode`と`Prism::CaseMatchNode` — 述語をまず評価します。すべての`WhenNode`/`InNode`本体とオプショナルなelse節は後置述語スコープ下で独立に評価され、N分岐に一般化された同じnil注入付き結合規則でマージされます。
- `Prism::WhenNode`と`Prism::InNode` — レシーバースコープ下で文を評価します。空本体はMUST`[Constant[nil], scope]`です。
- `Prism::BeginNode` — 主経路（本体、それからオプショナルなelse節。else節はMUST本体の値を置き換えますが、elseの前に本体が実行されたため本体のスコープ効果は依然として適用されます）を評価します。チェーン内の各`Prism::RescueNode`はエントリースコープ下で評価される代替の出口経路です。出口型はMUST主経路とrescue出口のunionです。出口スコープはMUST主経路とrescueスコープのnil注入付き結合です。`ensure_clause`が存在するとき、そのスコープ効果はMUST結合された出口スコープの上に重ねられ、これによりensure内のみで束縛されたローカルが観測可能なまま残ります。ensureの値はMUST NOT出口型に寄与しません。
- `Prism::WhileNode`と`Prism::UntilNode` — 述語を評価し（その後置スコープは本体で観測可能です）、それから本体を評価します。結果型はMUST`Constant[nil]`です。ベース後置スコープはMUST後置述語スコープと単一パス後置本体スコープのnil注入付き結合で、「本体は0回以上実行されたかもしれない」をモデル化します。[ADR-56](../adr/56-block-captured-local-mutation.md)スライスBは、本体が再束縛しうる各ローカルについて、上限付きの本体不動点結果をそのベースにオーバーレイします（`loop_rebind_fixpoint`。`Inference::BodyFixpoint`ヘルパーを共有し、上限3、最終的な`Constant→Nominal`への拡大、非収束時は`Dynamic[Top]`の下限）。既存のローカルはその後置述語束縛でシードされ、本体内で初めて代入されるローカルは0回反復経路のために`Constant[nil]`でシードされ、述語のループ入口エッジは反復ごとに再ナローイングされます。どのローカルも再束縛しないループ本体は単一パスのベースとバイト単位で同一です。
- `Prism::AndNode`と`Prism::OrNode` — LHSを評価し、それからLHSの後置スコープ下でRHSを評価します。結果型はMUST2つのオペランド型のunionです。後置スコープはMUSTLHSとRHSの後置スコープのnil注入付き結合（「LHSは常に実行された。RHSはときどきしか実行されなかった」をモデル化）です。Slice 3 phase 2はLHSの真偽値性でナローイングしません。その精緻化はSlice 6の仕事です。
- `Prism::ParenthesesNode` — 内側の式を通じてスコープをスレッドし、これにより`(x = 1; x + 2)`が`x`を束縛して`Constant[3]`を生成します。
- `Prism::ClassNode`と`Prism::ModuleNode` — 本体を*新鮮な*スコープで評価します（Rubyのクラス／モジュールスコープは外側のローカルを見**ません**。Environmentのみを共有します）。本体の値は本体の最後の文（空本体については`Constant[nil]`）です。クラス／モジュール定義は囲みスコープ内のいかなるローカルも束縛しないため、後置スコープはMUSTレシーバースコープを変更せずに残します。評価器は本体の評価のためにMUST新しいレキシカルクラスフレームを`class_context`にプッシュします。ネストされた`def`は、RBSルックアップを解決するためにそのフレームを参照します。フレームの修飾名はMUSTレンダリングされた`constant_path`です（例えば`class Foo::Bar`に対して`"Foo::Bar"`、`class A; class B`に対しては全ネスト名のジョイン）。
- `Prism::SingletonClassNode` — 同じ新鮮スコープ契約です。シングルトン式が`self`のとき、最内のレキシカルクラスフレームは本体の評価のためにMUST`singleton: true`にフリップされ、これにより`class << self`内の`def foo`が`RbsLoader#singleton_method`を通じて解決されます。`self`でない式についてはレシーバークラスは静的に解決可能ではありません。評価器は既存のクラスコンテキストをMUST変更せずに保ち、ネストされたdefが`Dynamic[Top]`の引数デフォルトに劣化することを受け入れます。
- `Prism::DefNode` — `Rigor::Inference::MethodParameterBinder`（後述）を介してすべての名前付き引数を束縛することでメソッドエントリースコープを構築し、そのスコープ下で本体を評価します。ペアの型はMUST`Constant[:method_name]`（`def`がSymbolに評価されるRubyの実行時挙動と一致）であり、ペアのスコープはMUSTレシーバースコープを変更せずに残します（`def`は囲みスコープ内に束縛を導入しません）。本体は外側スコープのローカルをMUST NOT見ません。

### Self型付け（Slice A-engine）

`Rigor::Scope`はオプショナルな`self_type:`フィールドを運び、`Scope#self_type`を通じてアクセスされ、`Scope#with_self_type(type)`を介して更新されます。フィールドはトップレベルスコープでは`nil`であり、Rubyが`self`に確定的な同一性を与える境界で`StatementEvaluator`によって注入されます。

- `Prism::ClassNode` / `Prism::ModuleNode`本体: `self_type`はMUST`Singleton[<qualified-name>]`です（クラス本体内の`self`はクラスオブジェクト自体だからです）。
- レシーバーが`self`である`Prism::SingletonClassNode`本体: 上と同じ（本体は依然として`self` = 囲みクラスオブジェクトで実行されます）であり、最内クラスフレームはさらに`singleton: true`にフリップします。
- `Prism::DefNode`本体: defがシングルトン側（`def self.foo`や`class << self`の中のレキシカルなdef）にあるとき、または周囲のクラスフレームがすでにシングルトンであるとき、`self_type`はMUST`Singleton[<qualified-name>]`です。それ以外（通常のインスタンスdef）では、`self_type`はMUST型引数なしの`Nominal[<qualified-name>]`です。トップレベルのdef（囲みクラスなし）はMUST`self_type`を`nil`のまま残します。

`ExpressionTyper`はそのフィールドを2か所で消費します。

- `Prism::SelfNode`はMUST設定されているとき`scope.self_type`、nilのとき`Dynamic[Top]`として型付けされます。これはどちらの場合もMUST NOTフォールバックイベントを記録しません。
- `receiver: nil`の`Prism::CallNode`（`attr_reader_method`・`private_helper`...のような暗黙self呼び出し）は、MUST`MethodDispatcher.dispatch`のレシーバー型として`scope.self_type`を採用します。`self_type`がnilのとき、レシーバーはnilのままで、既存のトップレベルフォールバックが適用されます。

`Scope#==`と`Scope#hash`はMUST`self_type`を含めます。`Scope#join`は両側が一致するときMUST`self_type`を保ち、異なるときMUST`nil`にリセットします。`Scope#with_local`・`Scope#with_fact`・`Scope#with_self_type`はMUSTすべて他の2つのフィールドを保ちます。

### インスタンス・クラス・グローバル変数の束縛（Slice 7 phase 1）

`Rigor::Scope`は`locals`に加えて3つの追加の束縛マップを運びます。すなわち`ivars`・`cvars`・`globals`（それぞれ`Hash[Symbol, Type]`、デフォルト空・フローズン）です。アクセサは以下のとおりです。

- `Scope#ivar(name)`・`#cvar(name)`・`#global(name)` — `name`の束縛された型を返すか、解析されたプログラムのスライスに書き込みが記録されていなければ`nil`を返します。
- `Scope#with_ivar(name, type)`・`#with_cvar`・`#with_global` — 名前付き束縛が追加された新鮮なスコープを返します。`with_local`が行うのと正確に同様に`locals`・`fact_store`・`self_type`・`declared_types`をMUST保ちます。

`StatementEvaluator`は`Prism::InstanceVariableWriteNode`・`Prism::ClassVariableWriteNode`・`Prism::GlobalVariableWriteNode`をMUST`LocalVariableWriteNode`と対称に処理します。すなわちエントリースコープ下で右辺値を評価し、`[rvalue_type, post_rvalue_scope.with_<kind>(name, rvalue_type)]`を返します。複合書き込み形式（`@x ||= …`・`@x &&= …`・`@x += …`）は、後続のスライスが後置スコープでそれらを束縛するまで、既存の`type_of_assignment_write`式型付け器経路に残ります。`ExpressionTyper`は`Prism::InstanceVariableReadNode`・`Prism::ClassVariableReadNode`・`Prism::GlobalVariableReadNode`を、対応するスコープ束縛マップを参照しMUST処理し、束縛が存在しないとき（フォールバックイベントを記録せずに）`Dynamic[Top]`へフォールスルーします。

`Scope#join`はivar/cvar/グローバル束縛をローカルをunionするのと同じ方法でMUSTunionします（**両**側で束縛されていない任意の名前は落とします。半束縛の名前のnil注入は、カタログがそれを必要とする制御フロー構成へ拡張されたときに文レベル評価器の責任です）。`Scope#==`と`Scope#hash`はMUST3つの束縛マップを含めます。

Slice 7 phase 2はivarのメソッドローカル境界を持ち上げます。すなわち`Scope`は修飾クラス名でキー付けされた`class_ivars: Hash[String, Hash[Symbol, Type]]`アキュムレータを運びます。`ScopeIndexer`は、すべての`Prism::ClassNode` / `Prism::ModuleNode`を歩き、ネストされた各インスタンス`Prism::DefNode`に降下し、適切な`self_type`を運ぶスコープ下で各`Prism::InstanceVariableWriteNode`右辺値を型付けする別個の前パスを通じて、インデックス時に1度だけそれを埋めます（インスタンスdefのみ — シングルトンdefは異なる`self`で動作します）。クラス内で同じivarへの複数書き込みは`Type::Combinator.union`を介してunionされます。`StatementEvaluator#build_method_entry_scope`はインスタンスメソッド本体の`ivars`をMUST`Scope#class_ivars_for(current_class_path)`からシードします。シングルトンメソッド本体（`def self.foo`や`class << self`内のレキシカルなdef）は、`self`がクラスオブジェクト自体であるため、アキュムレータをMUST NOT参照しません。

前パスはローカル束縛なしで右辺値を型付けするため、`@x = 1`は`Constant[1]`を記録しますが、`@x = some_local + 1`は`Dynamic[Top]`を記録します。Cvarsとグローバルはメソッドローカルのままです。同等のクラスレベル／プロセスレベルのアキュムレータは後続のスライスです。

#### 書き込み前読み取りnilゲートと追加のイニシャライザー（ADR-38）

付随する前パスが各インスタンスメソッド本体をAST（実行）順に歩き、**最初**の参照が読み取りであるivar名（書き込み前読み取り）を追跡します。それらの名前はクラス全体の`read_before_write`アキュムレータにunionされ、確定時にクラスはそれぞれに`Constant[nil]`を貢献します——「メソッドが`@x`への書き込みの前に`@x`を読む」形のための健全性で、Rubyは`nil`を返します。

`initialize`は組み込みの例外です: `initialize`本体については、すべてのivar書き込みターゲットが書き込み前読み取りの証拠を貢献する**代わりに**クラスの`init_writes`セットに折り込まれるので、コンストラクタが代入を保証するivarが兄弟リーダーで`nil`への幅広げを受けません。

ADR-38はその例外を**プラグイン宣言の追加のイニシャライザー**へ一般化します。`Inference::ScopeIndexer`はこの単一のゲートで集約された`Plugin::Registry#additional_initializers`セットを参照します: エントリーが`covers_method?`である名前を持つ`def`で、**かつ**その囲みクラスがエントリーの`receiver_constraint`に等しいか継承する（`Environment#class_ordering`経由でマッチ、ADR-16ティアAが使うのと同じメカニズム）ものについて、メソッドのivar書き込みは`initialize`のものとまさに同じように`init_writes`に折り込まれます。これはPHPStanの`AdditionalConstructorsExtension`のRuby版です——`Minitest::Test#setup`、Railsの`after_initialize`、または本体が走る前にフレームワークが呼び出すivar状態を確立するDIセッター。値オブジェクトのシェイプ（shape）は[`plugin.md`](plugin.md#rigorpluginmanifest)（`additional_initializers:`）で規定されています。

ルックアップは前パススコープの`Environment`からプラグインレジストリを読みます;エンジンは解決全体を全面的にフェイルソフトとMUST扱います（あらゆるエラー、または欠落／空のレジストリは「マッチなし」に劣化します）。これは構成上健全です: ゲートは`nil`貢献を**抑制**することしかできず、決して追加しないので、見逃しや広すぎるマッチは偽陽性安全です——解析器をより厳格にすることは決してなく、既存のnil幅広げをそのまま残すだけです（ADR-38 §「Why this is FP-safe」）。

Slice 7 phase 3は`StatementEvaluator`を、すべての変数種別の**複合書き込み**で拡張します。ハンドラは`Prism::{Local,InstanceVariable,ClassVariable,GlobalVariable}{Or,And,Operator}WriteNode`をカバーし、統一的なセマンティクスを適用します。

- 現在の型は適切なスコープ束縛マップ（`local`/`ivar`/`cvar`/`global`）から読まれます。束縛されていない変数は`Dynamic[Top]`として読まれます。
- 右辺値は`sub_eval`を通じてエントリースコープ下で評価されます。
- `||=`の結果型は`union(Narrowing.narrow_truthy(current), rhs)`です。`&&=`では`union(Narrowing.narrow_falsey(current), rhs)`です。演算子形式（`+=`・`-=`・`*=`...）では、型付け器は`MethodDispatcher`を通じて`current.send(operator, rhs)`をディスパッチし、ミス時に`Dynamic[Top]`にフォールバックします。
- 変数はそれから、平のライトハンドラが用いるのと同じ`with_*`ビルダーを通じて後置スコープに再束縛されます。式の値はRubyのセマンティクスと一致して結果型です。

### レキシカル定数ルックアップ（Slice A constant-walk）

`ExpressionTyper#type_of_constant_read`と`#type_of_constant_path`は、解析器が静的に証明できる粒度でRubyの実行時定数ルックアップ規則をミラーリングし、周囲のレキシカルクラスコンテキストを歩いて定数をMUST解決します。

1. 修飾候補`<class_path>::<name>`がMUST最初に試されます。ここで`<class_path>`は`Scope#self_type`が`Type::Nominal`または`Type::Singleton`のときのその`class_name`です。
2. それから候補パスはMUST`::segment`ごとに1つずつ剥がされて再試行されます（`<class_path>::<name>` → `<parent_path>::<name>` → ... → `<top>::<name>`）。
3. 素の`<name>`がMUST最後に試され、ウォーク前のトップレベル挙動を保ちます。
4. 各候補について、型付け器はMUSTまず`Environment#singleton_for_name(candidate)`（クラスオブジェクト → `Type::Singleton[candidate]`を解決）、それから`Environment#constant_for_name(candidate)`（非クラスのRBS定数宣言を翻訳された`Rigor::Type`に解決）を参照します。最初のヒットが勝ちます。その候補で両方がミスしたときのみウォークが続きます。
5. どちらのクエリでも候補が解決されないとき、エンジンは以前と同様にMUST`fallback_for(node, family: :prism)`へフォールスルーします。

`Environment#constant_for_name(name)`は取り付けられた`RbsLoader`をMUST参照し、ローダーが不在のときや名前が定数宣言を持たないとき`nil`を返します。`RbsLoader#constant_type(name)`は`RBS::AST::Declarations::Constant#type`を`Rigor::Inference::RbsTypeTranslator.translate`を通じてMUST翻訳し、結果の`Rigor::Type`を返すか、翻訳が`Type::Bot`（空型）を生成するとき`nil`を返します。クエリは不正な入力でMUST NOTraiseしません。ローダーはフェイルソフトのままです。

### 宣言位置のオーバーライド（Slice A-declarations）

`Rigor::Scope`は`declared_types`テーブルを運びます。これは特定のノード同一性について`ExpressionTyper#type_of`をオーバーライドする同一性比較の`Hash[Prism::Node, Rigor::Type]`です。[ADR-53](../adr/53-scope-discovery-index-separation.md)以降、これは[ディスカバリインデックス](#ディスカバリインデックスadr-53トラックa)テーブルのひとつであり（`Scope#declared_types`デリゲートを通じて読み、`Scope#with_discovery`を通じてシードされます）、デフォルト値はフローズン空ハッシュです。`Scope#with_local`・`Scope#with_fact`・`Scope#with_self_type`、およびjoinヘルパーはMUSTインデックスを ── したがってテーブルを ── 参照によって引き継ぎます。

`ExpressionTyper#type_of(node)`はMUST他の任意のディスパッチの**前に**`scope.declared_types[node]`を参照します。値が存在するとき、型付け器はMUSTそのまま返し、MUST NOTフォールバックイベントを記録しません。

`Rigor::Inference::ScopeIndexer.index(root, default_scope:)`は宣言位置のノードについてMUSTテーブルを埋めます。

- `Prism::ModuleNode#constant_path`はMUST`Singleton[<qualified-path>]`にマップされます。ここで`<qualified-path>`は囲む各`ModuleNode`/`ClassNode`の宣言名のジョインです。
- `Prism::ClassNode#constant_path`はMUST対応する`Singleton[<qualified-path>]`にマップされます。
- オーバーライドはMUST**最外**の`constant_path`ノードのみをカバーします。`class Foo::Bar`について、内側の`Foo`参照は実際のルックアップのままです（レキシカルウォークを通じて解決されます）。

`index`が生成するシードされたスコープはMUST埋められたテーブルを運び、これによりStatementEvaluatorのクラス本体およびメソッド本体の新鮮スコープ（`Scope.empty(environment: ...)`に続いて`with_self_type`と`with_declared_types`）がオーバーライドをネストされた本体へ伝播します。インデクサーが生成したスコープは、オーバーライドが実際に発火するよう、`Rigor::Scope#type_of`の呼び出し元（CLIプローブ・テストフィクスチャ）によってMUST用いられます。素の`Rigor::Scope.empty`スコープは、テスト分離のために空テーブル挙動を意識的に保ちます。

トップレベルスコープ（`self_type`が設定されていない）は、クラスコンテキストを設定しないテストでウォーク前の挙動が観測可能であるよう、MUST素の候補のみを生成します。ウォークはレシーバースコープをMUST NOT変更せず、解決に失敗する名前でMUST NOTraiseせず、シングルトンの祖先チェーンをMUST NOT走査しません — その精緻化は将来のスライスです。

### nil注入付き結合

`Scope#join`は一方のレシーバーにのみ束縛されている名前を落とします（上記の[不変スコープ規律](#不変スコープ規律)に従う）。文レベル評価器の分岐マージは、結合スコープが`T | nil`としてそれらを見るよう、半束縛の名前について代わりにMUST`Constant[nil]`を注入します。

- `scope_a`に束縛されているが`scope_b`には束縛されていない名前について: 結合前に`scope_b`内でそれらの名前を`Constant[nil]`に束縛します。
- `scope_b`に束縛されているが`scope_a`には束縛されていない名前について: 結合前に`scope_a`内でそれらの名前を`Constant[nil]`に束縛します。
- それから拡張されたスコープに対して`Scope#join`を呼び出します。結果はMUSTいずれかの側からのすべての名前を含み、unionは一方の側にのみ束縛されている名前について`Constant[nil]`を含みます。

これはSlice 3 phase 1の[不変スコープ規律](#不変スコープ規律)が文レベル評価器に委ねる契約です。N項分岐マージ（case/when・begin/rescueチェーン）は繰り返しのペアごとのnil注入付き結合で還元されます。`Scope#join`の下でnil注入はunionと交換するため、還元順序は結果に影響しません。

### ノードごとのスコープインデックス

`Rigor::Inference::ScopeIndexer.index(root, default_scope:)`は、Prismプログラムのサブツリーをノードごとのスコープルックアップに変換する標準サーフェスです。MUST以下を満たします。

- 戻り値はMUST同一性比較の`Hash{Prism::Node => Rigor::Scope}`です。`root`のサブツリーに含まれないノードをルックアップするとMUST`default_scope`（`Hash#default`スロット）を生成します。
- `evaluate(root)`の間にStatementEvaluatorが訪れる各Prismノードについて、インデクサーはMUSTその訪問時に観測されたエントリースコープを記録します。訪問は、インデクサーが新鮮な評価器に配線する`on_enter:`コールバックを通じて発火されます（したがってStatementEvaluatorは状態フリーのままです。インデクサーがテーブルを運びます）。
- `root`のサブツリーでStatementEvaluatorが訪れ**ない**Prismノード（評価器のデフォルト分岐がフォールスルーしたノードの式内部の子）について、インデクサーはMUST記録されたスコープを最も近い記録された祖先のスコープに設定します。DFS事前順伝播は契約です。すなわち子はMUST親と少なくとも同程度に情報量のあるエントリースコープを観測し、決して弱くありません。
- インデクサーは内部のStatementEvaluatorをMUST`tracer: nil`で実行します。フェイルソフトフォールバックイベントを欲しがるCLI呼び出し元は、イベントがちょうど第2パスから来てインデクサー自身のプログラムツリー型付けによって二重記録されないよう、MUSTインデックス後の`type_of`プローブにのみトレーサーを取り付けます。

CLIコマンド`rigor type-of`と`rigor type-scan`は、パースされたファイルからノードを型付けするときMUSTインデックスを参照し、これによりプログラムフロー内で先に束縛されたローカルが、後のノードを型付けするのに使われるスコープへ流れ込みます。両コマンドは`index[node]`をルックアップし、それから`node_scope.type_of(node, tracer:)`を実行します。上記の契約がこの合成を正しくするものです。

### クロスファイルのメソッド発見（ADR-24）

RBSを持たないユーザー定義クラスに対する暗黙的self呼び出しを解決するため、`Rigor::Inference::ScopeIndexer`は境界のあるプロジェクト事前パスを走らせ、発見したテーブルを派生スコープへ通します。`Rigor::Scope`はそれらを修飾クラス名でキー付けされた純粋なクエリとして公開します:

- `Scope#user_def_for(class_name, method_name)` — インスタンスメソッドの`Prism::DefNode`、または`nil`。
- `Scope#user_def_site_for(class_name, method_name)` — クロスファイル事前パスが投入したときの定義位置を`"path:line"`で（`CheckRules`がクロスファイルのモンキーパッチ診断を定義ファイルに向けられるように）、または`nil`。
- `Scope#top_level_def_for(method_name)` — ファイルスコープ（トップレベル）の`def`の`Prism::DefNode`、または`nil`;どのクラス本体の外側でもない暗黙的self呼び出しに使う。
- `Scope#superclass_of(class_name)` — `class Foo < Bar`の書かれたとおりの超クラス名、または`nil`;`ExpressionTyper`が呼び出しサイトのレキシカルネスティングで修飾クラスへ解決する。
- `Scope#includes_of(class_name)` — クラスがinclude/prependするモジュール名の配列、書かれたとおり;mixinチェーンを通じた暗黙的self呼び出しの解決に使う。
- `Scope#discovered_method_visibility(class_name, method_name)` — ユーザー定義メソッドの`:public` / `:private` / `:protected`、または`nil`;`def.method-visibility-mismatch`と`def.override-visibility-reduced`（ADR-35）ルールが消費する。

これらのテーブルはスコープの[ディスカバリインデックス](#ディスカバリインデックスadr-53トラックa)上に存在します。シードされたインデックスが`Scope#with_discovery`を通じてそれらを派生スコープへ前方に通します。

`Scope#toplevel?`はスコープが囲むクラス/モジュール本体を持たない（`self_type`が`nil`）とき`true`を返す。トップレベル限定の`call.unresolved-toplevel`ルール（ADR-34）をゲートする: ファイル先頭の未解決の暗黙的self呼び出しは警告し、同じミスがクラス/`def`本体内なら[ADR-24 WD3](../../adr/24-self-method-call-resolution/)に従い寛容なままとなる。

### `Rigor::Inference::StatementEvaluator#initialize(on_enter:)`

`StatementEvaluator`の3つ目のコンストラクタキーワードは、ScopeIndexerが駆動するフックです。MUST以下を満たします。

- `on_enter:`はデフォルトで`nil`です。`nil`のとき、コールバックは発火せず、評価器の挙動はMUSTキーワードなしで構築されたslice 3 phase 2評価器と観測可能に同一です。
- 非`nil`のとき、コールバックはMUSTすべての`evaluate(node)`呼び出しの開始時に、ハンドラディスパッチの前に、`(node, scope)`を引数としてちょうど1回呼ばれます — `node`は入っているPrismノード、`scope`はエントリースコープ（その再帰レベルでの`@scope`）です。
- コールバックはMUSTすべての再帰的な`sub_eval`を通じてスレッドされ、フォークされたスコープでのネストされた呼び出しが依然としてそれぞれのエントリーを報告します。

### メソッドパラメータ束縛

`Rigor::Inference::MethodParameterBinder.new(environment:, class_path:, singleton:)`は、`DefNode`からメソッドエントリースコープを構築する標準サーフェスです。MUST以下を満たします。

- `bind(def_node)`はMUST、defの引数リストに名前が現れる順で、引数名を束縛型へマップする順序付き`Hash{Symbol => Rigor::Type}`を返します。
- 無名引数（識別子のない`*`と`**`）は束縛するローカル名がないため、MUST静かにスキップされます。
- `class_path:`が`nil`のとき、環境がRBSローダーを持たないとき、または解決されたクラス／メソッドがRBSに知られていないとき、すべての引数はMUSTデフォルトで`Dynamic[Top]`です。バインダーはRBSミスでMUST NOTraiseしません。Slice 1のフェイルソフトポリシーからのフェイルソフト契約は束縛境界でも適用されます。
- RBSルックアップが成功したとき、すべての引数スロットはMUST*そのスロットを持つすべてのオーバーロードにわたるマッチングRBS引数型のunion*に束縛されます。スロットを省略するオーバーロード（例: `Array#first`の`()`オーバーロード対`def first(n)`の`n`引数がマッチする`(?int)`オーバーロード）はMUST`Dynamic[Top]`を寄与するのではなく静かにスキップされます（これにより束縛は、呼び出し元がどのオーバーロードを選ぶか知る必要なく、シグネチャが提供する最も情報量のある型になります）。
- 位置スロット（required・optional・rest・trailing）はMUSTマッチングRBS位置リストへ*位置*でマッチされます。キーワードスロット（required・optional）はMUSTrequiredとoptionalの両方のキーワードマップにわたって*名前*でマッチされ、これにより`def foo(by:)`の再定義がRBSオーバーロードの`?by:`キーワード（またはその逆）を拾います。
- `*rest`引数の束縛型はMUST`Nominal["Array", [T]]`で、`T`は翻訳されたrest要素型です。`**kw_rest`引数の束縛型はMUST`Nominal["Hash", [Nominal["Symbol"], V]]`で、`V`は翻訳されたrestキーワード値型です。バインダーはMUST NOT rest引数を単一要素型に束縛しません — ローカルは実際には配列／ハッシュを保持します。
- `def_node.receiver`が`Prism::SelfNode`である**または**`singleton:`が`true`のとき、バインダーはMUST`RbsLoader#singleton_method`を参照します（直接の囲みレキシカルスコープはシングルトンクラスです）。それ以外ではMUST`RbsLoader#instance_method`を参照します。翻訳器の`self_type:`と`instance_type:`キーワードはMUSTシングルトン経路では`(Singleton[C], Nominal[C])`に、インスタンス経路では`(Nominal[C], Nominal[C])`に設定されます。
- **パススコープのプロトコル契約 — *提供*側（ADR-28）**。バインダーが非`nil`のソースパスで走り、ロードされたプラグインが（`Environment#plugin_registry.contracts_for_path`経由で）`path_glob`がファイルにマッチし・`method_name`が`def`にマッチし・`singleton`フラグがdefのシングルトン性にマッチする`Plugin::ProtocolContract`を貢献するとき、バインダーは契約された各位置スロットの束縛をMUST契約が宣言したパラメータ型で置き換えます。型名は`Environment#nominal_for_name`を通じて**遅延的に、束縛時点で**解決されます;解決不能な名前（プロトコルのRBSがロードされていない）はMUST前のティアが束縛したものへフォールスルーします——フェイルソフトで、決してraiseしません。これは、パス慣習的なメソッド（`request`引数が暗黙に`Rack::Request`である`lib/controller/**/*.rb`アクション）が、RBSや引数が何の注釈もしていなくても、そのプロトコル型で解析される方法です。付随する**チェック**側——メソッドが存在しその推論された戻り値が`return_type_name`に適合することの確認——はエンジンのルールではなく貢献するプラグイン自身の`#diagnostics_for_file`の責任です;値オブジェクトのシェイプ（shape）は[`plugin.md`](plugin.md#rigorpluginmanifest)（`protocol_contracts:`）にあります。

### 多重ターゲットバインダー（Slice 5 phase 2 sub-phase 2）

`Rigor::Inference::MultiTargetBinder`は、タプル形状の右辺型をPrism多重ターゲットツリーに対して分解する標準サーフェスです。これは純粋なモジュール関数モジュール（状態なし）で、MUST以下を満たします。

- `MultiTargetBinder.bind(target_node, rhs_type)` — `Prism::MultiWriteNode`（文レベルの`a, b = rhs`）または`Prism::MultiTargetNode`（ネストされた`(a, b)`形式）のいずれかを受け付けます。分解で束縛された名前付きローカルを宣言順でキーとする順序付き`Hash{Symbol => Rigor::Type}`を返します。
- `rhs_type`が`Type::Tuple`のとき、バインダーは要素を前方（`lefts`）・中央（`rest`）・後方（`rights`）の領域にMUST分解します。インデックス`i`の前方ターゲットはMUST`tuple.elements[i]`に、またはインデックスがタプルの境界を超えるとき`Constant[nil]`に束縛されます。restターゲット（`LocalVariableTargetNode`式を持つ`Prism::SplatNode`）はMUST`Type::Tuple[*middle]`に束縛されます（ソースに余剰要素がないとき`middle`は空）。後方ターゲットはMUST対応するテールオフセットの要素（または範囲外のとき`Constant[nil]`）に束縛されます。
- `rhs_type`が`Type::Tuple`以外の何かのとき、すべてのスロット（前方・rest・後方）はMUST`Type::Combinator.untyped`（`Dynamic[Top]`）に束縛されます。スライスは、よりリッチなキャリアレシーバー格子が着地するまで、動的アリティの右辺について意図的に保守的なままです。
- ネストされた`Prism::MultiTargetNode`ターゲットはMUSTスロットの型を新しい右辺としてリカースします。これにより、両方のネストレベルがタプル形状のとき`a, (b, c) = [1, [2, 3]]`は`a -> 1`・`b -> 2`・`c -> 3`を束縛します。
- 非ローカルターゲット（`InstanceVariableTargetNode`・`ConstantTargetNode`・`IndexTargetNode`・`CallTargetNode`・`ConstantPathTargetNode`・`ImplicitRestNode`・式のない無名splat...）はMUST静かにスキップされます。これらはStatementEvaluatorがスレッドするローカル変数スコープに観測可能な寄与を持ちません。
- バインダーは整形式のPrism入力でMUST NOTraiseせず、その引数をMUST NOT変更しません。

### ブロック引数束縛（Slice 6 phase C sub-phases 1 and 2）

`Rigor::Inference::BlockParameterBinder`は、`Prism::BlockNode`のエントリースコープ拡張を構築する標準サーフェスです。MUST以下を満たします。

- `BlockParameterBinder.new(expected_param_types:)`は、受信側メソッドのRBSシグネチャから提供される位置ブロック引数1つにつき1つの`Rigor::Type`値の順序付き配列を受け付けます。バインダーがこの配列から埋められないインデックス（配列が引数リストより短いか、スロットが配列で駆動されない種類）はMUSTデフォルトで`Dynamic[Top]`です。
- `bind(block_node)`はMUST、引数名を束縛型へマップする宣言順の順序付き`Hash{Symbol => Rigor::Type}`を返します。無名引数はMUST静かにスキップされます。`Prism::MultiTargetNode`分解スロット（`|(a, b), c|`形式）はMUSTスロットの期待型に対して`Rigor::Inference::MultiTargetBinder`を通じて展開されます（Slice 6 phase C sub-phase 2）。すなわち`Type::Tuple`スロットは要素ごとに分解されます。他の任意のキャリアはすべての内部ローカルを`Dynamic[Top]`に縮退します。内部ターゲットは`Prism::RequiredParameterNode`インスタンス（ブロック側のエンコード）です。`MultiTargetBinder`は束縛目的のためにそれらをMUST`Prism::LocalVariableTargetNode`と統一的に扱います。
- `*rest`引数はMUST`Nominal["Array", [Dynamic[Top]]]`に束縛されます。`**kw_rest`引数はMUST`Nominal["Hash", [Nominal["Symbol"], Dynamic[Top]]]`に束縛されます。明示的な`&block`引数はMUST`Nominal[Proc]`に束縛されます。キーワード引数（requiredとoptional）はMUST`Dynamic[Top]`に束縛されます。Slice 6 phase C sub-phase 1は受信側メソッドのブロックキーワードシグネチャを内省しないからです。
- `NumberedParametersNode`（暗黙の`_1`形式）はMUST`numbered_node.maximum`まで`:_1`・`:_2`...の束縛を生成します。それぞれは明示的な引数で用いるのと同じ位置ごとの`expected_param_types:`配列で駆動されます。配列の長さを超えるスロットはMUSTデフォルトで`Dynamic[Top]`です。これはSlice 6 phase C sub-phase 2の契約です。前のスライスの「束縛なし」挙動は置き換えられます。
- バインダーは整形式のPrismブロックノードでMUST NOTraiseせず、その入力をMUST NOT変更しません。

`Rigor::Inference::MethodDispatcher.expected_block_param_types(receiver_type:, method_name:, arg_types:, environment:)`は、バインダーの`expected_param_types:`配列を供給する標準クエリです。MUST以下を満たします。

- 選択されたRBSオーバーロードで宣言された位置ブロック引数（`required_positionals` + `optional_positionals`）の順序付き`Array<Rigor::Type>`をMUST返します。ブロック専用のキーワード引数とrest形式はMUST返り値配列から除外されます。バインダーがそれらのスロットを独立に扱います。
- ブロック付き呼び出し（`Array#each { ... }`）が誤ってブロックなしオーバーロード（`Array#each() -> Enumerator`）を通じて束縛しないよう、`block_required: true`で`OverloadSelector.select`を通じてオーバーロードをMUST選択します。
- ジェネリックブロック引数がレシーバーの`type_args`を通じて解決されるよう、`RbsDispatch.try_dispatch`が用いるのと同じシェイプ／ジェネリック置換機構をMUST参照します（`Tuple[Constant[1], Constant[2]]`レシーバーは`Array#each`の`Elem`ブロック引数を`Constant[1] | Constant[2]`に解決させます）。
- 環境・RBSローダー・レシーバーディスクリプタ・メソッド定義・選択されたオーバーロード・ブロック節が欠落または型なしのとき、MUST空配列を返します。バインダーはMUST空配列を「情報なし」として扱い、すべての引数を`Dynamic[Top]`にデフォルトします。
- `Union`レシーバーについて、メンバーごとの答えを取り、すべてのメンバーが構造的に等しいブロック引数リストを生成するときのみMUST返します。それ以外ではMUST空配列を返します。したがって混合アリティのunionは、非決定的なブロック束縛を生成するのではなく`Dynamic[Top]`に劣化します。
- 整形式の入力でMUST NOTraiseしません。プローブをフェイルソフトに保つため、RBSの`DefinitionBuilder`周りの防御的な`rescue StandardError`は許可されます。

`Rigor::Inference::StatementEvaluator`は両方のサーフェスをMUST`Prism::CallNode`ハンドラを通じて消費します。

- ハンドラは呼び出し式を純粋な値としてMUST評価し（既存のディスパッチチェーンとシェイプティアが依然として適用されるよう`Scope#type_of`に委ねる）、レシーバースコープをMUST変更せずに返します。ブロック効果は後置呼び出しスコープにMUST NOT漏れません。ブロック内のみで束縛されたローカルは、呼び出しの外側でMUST NOT観測可能です。
- `node.block`が`Prism::BlockNode`のとき、ハンドラは*レシーバーの外側スコープ*を`BlockParameterBinder.bind`が生成した束縛で拡張することでブロックのエントリースコープをMUST構築します。ブロック本体は外側スコープのローカルを継承し（Rubyのレキシカルスコーピング規則）、ブロック引数がその上に重ねられます。
- ハンドラは、ノードごとのスコープインデックスが引数束縛を見るよう、`BlockNode`をMUST`sub_eval`し、ブロックのエントリースコープを本体を通じてスレッドします。ブロックの`Prism::BlockNode`自体は、本体の文チェーンが拡張されたスコープ下で訪れられるよう、MUST`sub_eval(body, scope)`に委ねるハンドラを持ちます。
- ハンドラの例外エンベロープはプローブの失敗を「期待型なし」としてMUST扱います。バインダーは依然として実行され、すべての引数を`Dynamic[Top]`にデフォルトします。
- ブロック対応の結果型付け（Slice 6 phase C sub-phase 2）は`Rigor::Inference::ExpressionTyper#call_type_for`にあります。すなわち呼び出しが`Prism::BlockNode`を運ぶとき、型付け器はMUST同じブロックエントリースコープ（`外側スコープ + BlockParameterBinder.bind`）を構築し、そのスコープ下でブロックの本体を型付けし、本体の値型を`block_type:`として`MethodDispatcher.dispatch`に渡します。これがStatementEvaluatorをループに含めることを要求せずに、任意の呼び出し位置（CLI `type-of`・ScopeIndexer・素の`Scope#type_of`）から`[1, 2, 3].map { |n| n.to_s }`を`Array[String]`に解決させる正確なメカニズムです。StatementEvaluatorのCallNodeハンドラはMUST整合を保ちます。すなわち結果型については同じ`Scope#type_of`に委ね、ブロック本体をノードごとのスコープインデックスのためにのみ再評価します。

### 境界

Slice 3 phase 2は任意の式の*内部*を通じてスコープをスレッドし**ません**。すなわち`foo(x = 1)`や`[1, x = 2]`は`x`を後置スコープに伝播しません。再帰下降は評価器のカタログがカバーしない式レベルの子で止まるからです。これは意図的なPhase 2の簡略化です。後のスライスはカタログを拡張して呼び出し引数や配列／ハッシュ要素を通じてスコープをスレッドするかもしれません。トップレベルの文的構成（代入・if・case・begin・ループ・括弧）は上記の指定どおりに伝播します。

Slice 3 phase 2は引数束縛の*表現力*も狭く制限します。バインダーは各スロットでオーバーロードにわたるunionを選びますが、`MethodDispatcher::OverloadSelector`が戻り値型に対して行うような、引数呼び出し位置の型による束縛の精緻化はまだ行いません。RBSインターフェイス型（`int`・`_ToS`...）とエイリアスは既存の`RbsTypeTranslator`翻訳器を通じて依然として`Dynamic[Top]`に劣化するため、唯一のオーバーロードの引数が`int`である`def first(n)`の再定義はMUST観測可能に`n`を`Dynamic[Top]`に束縛します。これは既存の翻訳器の漸進的型付け姿勢と一致します。

## ナローイング（Slice 6 phases 1 and 2）

Slice 6 phase 1はエンジンに最初のエッジ対応精緻化サーフェスを追加します。これは`Rigor::Inference::Narrowing`を通じて公開され、`Rigor::Inference::StatementEvaluator`が`Prism::IfNode`/`Prism::UnlessNode`の`then`と`else`スコープ（および`Prism::AndNode`/`Prism::OrNode`のRHSエントリースコープ）を精緻化するために消費する純粋なモジュールです。Slice 6 phase 2はカタログをクラスメンバーシップ述語（`is_a?`・`kind_of?`・`instance_of?`）と信頼できる等価／不等価述語で拡張しつつ、同じ消費契約を保ちます。

### 型レベルナローイングプリミティブ

モジュールはMUST以下のモジュール関数を公開し、それぞれが新鮮な`Rigor::Type`値を生成しその入力を決して変更しません。

- `Narrowing.narrow_truthy(type)` — `type`の真値フラグメント。`Constant[v]`は`v`が`nil`または`false`のとき`Bot`に縮退し、それ以外では保たれます。`Nominal[NilClass]`/`Nominal[FalseClass]`は`Bot`に縮退し、他の`Nominal`キャリアは保たれます。`Union`は要素ごとに再帰します。`Top`・`Dynamic[T]`・`Bot`・`Singleton`・`Tuple`・`HashShape`は変更されずに通過します。
- `Narrowing.narrow_falsey(type)` — `type`の偽値フラグメント。`Constant[nil]`/`Constant[false]`と`Nominal[NilClass]`/`Nominal[FalseClass]`は保たれます。他の`Constant`/`Nominal`キャリアは`Bot`に縮退します。`Union`は要素ごとに再帰します。`Singleton`/`Tuple`/`HashShape`は`Bot`に縮退します（その住人は真値だからです）。`Top`/`Dynamic[T]`/`Bot`は、解析器が偽値側を空と証明できないため、変更されずに通過します。
- `Narrowing.narrow_nil(type)` — `type`のnilフラグメント。`Constant[nil]`と`Nominal[NilClass]`は保たれます。非nilな`Constant`/`Nominal`キャリアは`Bot`に縮退します。`Union`は要素ごとに再帰します。`Top`/`Dynamic[T]`は、下流ディスパッチが`NilClass`を通じて解決するよう、MUST標準的な`Constant[nil]`に絞り込みます。nilを決して住まないキャリア（`Singleton`・`Tuple`・`HashShape`）は`Bot`に縮退します。`Bot`はそれ自身のnilフラグメントです。
- `Narrowing.narrow_non_nil(type)` — `type`の非nilフラグメント。`narrow_nil`のミラーです。すなわちnil専用キャリアは`Bot`に縮退し、非nilキャリアは保たれます。`Top`/`Dynamic[T]`/`Singleton`/`Tuple`/`HashShape`は変更されずに通過します。`Union`は要素ごとに再帰します。
- `Narrowing.narrow_equal(type, literal)`（Slice 6 phase 2 sub-phase 2） — 信頼できる`Type::Constant`リテラルに対する`type`の等価フラグメント。String・Symbol・Integerリテラルは、`type`がすでに有限な信頼できるリテラルドメイン（`Constant`または信頼できるconstantsの`Union`）であるときにのみMUST絞り込みます。Nil・true・falseはシングルトン値で、`Integer | nil`のような混合ドメインからMAY抽出できますが、`Dynamic[Top]`を比較されるリテラルにMUST NOT絞り込みません。FloatリテラルはMUST NOT絞り込みません。信頼できない入力は`type`を変更せずに返します。
- `Narrowing.narrow_not_equal(type, literal)`（Slice 6 phase 2 sub-phase 2） — `narrow_equal`のドメイン相対補集合。有限な信頼できるリテラルドメインから比較されるリテラルを除去し、混合ドメインからnil/true/falseのシングルトンメンバーが存在するときに除去します。`String`や`Dynamic[Top]`のような広いドメインに対して、無境界の差集合型をMUST NOT作成しません。
- `Narrowing.narrow_class(type, class_name, exact: false, environment: Environment.default)`（Slice 6 phase 2 sub-phase 1） — `type`のクラスメンバーシップフラグメント。`class_name`引数はソースに現れるとおりの問われたクラスの修飾名（`"Integer"`・`"Foo::Bar"`）です。`exact: false`は`is_a?`/`kind_of?`（サブクラス包含）をモデル化し、`exact: true`は`instance_of?`（厳密）をモデル化します。キャリア規則はMUST以下のとおりです。
  - `Constant[v]` — `v.class`が述語を満たす（`exact: false`では問われたクラスのサブクラスまたは等しい、`exact: true`では等しい）とき保たれます。それ以外では`Bot`に縮退します。
  - `Nominal[C]` — 束縛された`C`が問われたクラスと同じ（または`exact: false`下ですでにそのサブクラス）のとき保たれます。問われたクラスが`exact: false`下で`C`のサブクラスのとき、型は`Nominal[asked]`に**下方へ**絞り込まれます（例えば`is_a?(Integer)`下の`Nominal[Numeric]`は`Nominal[Integer]`になります）。`exact: false`下の互いに素な階層と`exact: true`下の任意の非等価クラスは`Bot`に縮退します。いずれかのクラス名が提供された解析器`Environment`を通じて解決しないとき、結果はMUST保守的なまま残り、入力型を保ちます。
  - `Union` — 要素ごとに再帰し、互いに素なメンバーを落とします。
  - `Tuple[*]`/`HashShape{*}` — 問われたクラスに対して`"Array"`/`"Hash"`を通じて統一的に射影されます。
  - `Singleton[C]` — 問われたクラスに対して`"Class"`を通じて統一的に射影されます（住人はクラスオブジェクトです）。
  - `Top`/`Dynamic[T]` — 下流ディスパッチが問われたクラスを通じて解決できるよう、`Nominal[asked]`に絞り込みます。
  - `Bot` — 保たれます。
- `Narrowing.narrow_not_class(type, class_name, exact: false, environment: Environment.default)`（Slice 6 phase 2 sub-phase 1） — 同じ述語の偽値フラグメント。述語を満たす`Constant`/`Nominal`/`Union`/`Tuple`/`HashShape`/`Singleton`キャリアは`Bot`に縮退します。満たさないキャリアは変更されずに保たれます（`Nominal`について、解析器がよりリッチなキャリアなしに分離を証明できないため、`!is_a?(Integer)`下の`Nominal[Numeric]`は`Nominal[Numeric]`のままになります）。`Top`/`Dynamic[T]`/`Bot`は変更されずに通過します。

これらのプリミティブはMUST決定的かつ構造的に純粋です。すなわち構造的に等しい入力での2つの呼び出しは構造的に等しい出力を生成し、それらを呼び出しても入力を決して変更しません。

### 述語レベルナローイング

`Narrowing.predicate_scopes(node, scope)`はMUST`[truthy_scope, falsey_scope]`ペアを返します。`node`が`nil`またはその形状が認識カタログにないとき、ペアはMUST`[scope, scope]`であり、これにより呼び出し元は特別な戻り値なしに「ナローイングなし」を観測します。認識されるSlice 6 phase 1のカタログは以下のとおりです。

- `Prism::ParenthesesNode` — 存在するときbodyへ再帰します。
- `Prism::StatementsNode` — 最後の文を解析します。先行する文はMAYスコープ効果を持ちますが、StatementEvaluatorは`Narrowing`を呼ぶ前にすでに後置述語スコープを生成しているため、解析器は追加の効果をスレッドし**ません**。
- `Prism::LocalVariableReadNode` — ローカルが`scope`に束縛されているとき、真値 → `narrow_truthy(local)`、偽値 → `narrow_falsey(local)`に絞り込みます。束縛されていないローカルはナローイングなしフォールバックへフォールスルーします。
- `Prism::CallNode` — カタログは4つの述語形状をカバーし、呼び出しがブロックを持つかレシーバーが`nil`のときはすべて静かに拒否されます。
  - `recv.nil?`（位置／キーワード引数なし）: `narrow_nil`/`narrow_non_nil`を通じてレシーバーローカルを絞り込みます。
  - 単項`!recv`（`name == :!`、位置／キーワード引数なし）: `recv`を解析して結果のペアをスワップします。
  - `recv.is_a?(C)` / `recv.kind_of?(C)` / `recv.instance_of?(C)`（Slice 6 phase 2 sub-phase 1）: レシーバーが`Prism::LocalVariableReadNode`であり、単一引数が静的な定数参照（`Prism::ConstantReadNode`または`Prism::ConstantPathNode`）であることを要求します。修飾名はMUST親ウォーク`Foo::Bar`形式を介してレンダリングされます。真値エッジはローカルを`narrow_class(local, class_name, exact:, environment: scope.environment)`を通じて再束縛します（`exact: true`は`instance_of?`のみ）。偽値エッジは`narrow_not_class(local, class_name, exact:, environment: scope.environment)`を通じて再束縛します。それ以外（ローカル専用引数・メソッド呼び出し引数・複数引数）はMUSTナローイングなし分岐へフォールスルーします。
  - `local == literal` / `literal == local`と`!=`ミラー（Slice 6 phase 2 sub-phase 2）: 一方の側が`Prism::LocalVariableReadNode`、もう一方の側が静的な信頼できるリテラル（`String`・`Symbol`・`Integer`・`true`・`false`または`nil`。`Float`ではない）であることを要求します。`==`の真値エッジはローカルを`narrow_equal`を通じて再束縛します。偽値エッジは`narrow_not_equal`を通じて再束縛します。`!=`はそれらのエッジをスワップします。認識される各等価述語はMUSTさらに`FactStore::Fact`を取り付けます。すなわちローカル型が変わったときは`local_binding`バケットを使い、それ以外では広いまたは動的なドメインが不健全な肯定的ナローイングなしに関係を保持するよう`relational`バケットを使います。
- **RBS::Extended述語注釈**を伴う`recv.foo(arg)`（Slice 7 phase 15）: 受信側メソッドのRBSシグネチャがその`RBS::Definition::Method`上に`%a{rigor:v1:predicate-if-true <target> is <Class>}`または`%a{rigor:v1:predicate-if-false <target> is <Class>}`注釈を運ぶとき、解析器はマッチする束縛を対応するエッジで`narrow_class`を通じてMUST絞り込みます。パーサは厳密な形状を認識します。すなわち`<target>`はRubyの引数名（選択されたオーバーロードの`required_positionals` / `optional_positionals`に対してマッチ）または`self`です。`<Class>`は単一のオプショナルに名前空間付けされたクラス識別子（`String`・`Foo::Bar`・`::Foo`）です。引数ターゲットについて、ナローイングはマッチする呼び出し引数が`Prism::LocalVariableReadNode`のときにのみ適用されます。`self`ターゲットについて、4つのレシーバー形状が参加します（v0.1.1 Track 1 slice 3）。すなわち`Prism::LocalVariableReadNode`と`Prism::InstanceVariableReadNode`は`Scope#with_local` / `with_ivar`を通じて再束縛し、暗黙self（nilレシーバー）と`Prism::SelfNode`の両方は`Scope#with_self_type`を通じて再束縛します。暗黙self経路は`Inference::Narrowing#analyse_call`がnilレシーバー形状をRBS::Extended経路まで通すことを要求します。`resolve_rbs_extended_method`はレシーバーがnilのとき`scope.type_of(node.receiver)`の代わりに`scope.self_type`を参照します。他のレシーバー形状（メソッドチェーン・式）は依然としてフォールスルーします。
- `recv === local`（Slice 7 phase 4）: case等価述語は3つのレシーバー形状について認識されます。
  - **クラス／モジュールレシーバー**（静的な`Prism::ConstantReadNode`または`Prism::ConstantPathNode`） — `local.is_a?(receiver)`と同型です。真値と偽値のエッジは`is_a?`/`kind_of?`と同一に`class_predicate_scopes`を通じて生成されます。
  - **Rangeリテラルレシーバー**（`Prism::RangeNode`、オプショナルに`Prism::ParenthesesNode`にラップされる） — 真値エッジで`local`を整数／浮動小数端点では`Numeric`に、文字列端点では`String`に絞り込みます。`Range#===`は強制不可能な型と範囲内失敗の両方でfalseを返すため、偽値エッジはエントリー型を保ちます。
  - **Regexpリテラルレシーバー**（`Prism::RegularExpressionNode` / `Prism::InterpolatedRegularExpressionNode`） — 真値エッジで`local`を`String`に絞り込みます。Rangeと同じ偽値規則です。
  それ以外（動的レシーバー・カスタム`===`メソッド・非ローカルLHS）はMUSTナローイングなし分岐へフォールスルーします（両エッジでエントリースコープを保ちます）。
- `Prism::AndNode` — `a && b`は真値エッジを`a`の真値スコープ下の`b`の真値スコープで絞り込みます。偽値エッジは`Scope#join`を介して`a`の偽値スコープ（bがスキップ）と`b`の偽値スコープ（bが実行されたが偽値を返した）をunionします。
- `Prism::OrNode` — `a || b`は真値エッジを`a`の真値スコープと（`a`の偽値スコープ下の）`b`の真値スコープの`Scope#join`で絞り込みます。偽値エッジは`a`の偽値スコープ下の`b`の偽値スコープです。

解析器は認識されない述語形状でMUST NOTraiseせず、いかなるトレーサーをもMUST NOTスレッドせず（述語解析はすでに型付けされたスコープ情報を参照する純粋なクエリです）、レシーバースコープをMUST NOT変更しません。

### StatementEvaluatorとの統合

`Rigor::Inference::StatementEvaluator`はMUST以下のように述語解析器を消費します。

- `Prism::IfNode` — 述語を評価して`post_pred`を得たのち、`Narrowing.predicate_scopes(node.predicate, post_pred)`を呼び出して`(truthy_scope, falsey_scope)`を導出します。`then`分岐はMUST`truthy_scope`下で評価されます。`else`分岐（または不在のelse、これは`Constant[nil]`と述語の後置スコープを寄与します）はMUST`falsey_scope`下で評価されます。分岐型はunionされ、後置スコープは既存のnil注入規則を通じてマージされます。
- `Prism::UnlessNode` — `IfNode`と同じ形状ですが、`then`分岐（述語が偽値のときに実行される）はMUST`falsey_scope`下、`else`分岐はMUST`truthy_scope`下で評価されます。
- `Prism::AndNode`/`Prism::OrNode` — LHSを評価して`left_scope`を得たのち、`Narrowing.predicate_scopes(node.left, left_scope)`を呼び出します。RHSはMUST`&&`ではLHSの真値スコープ下、`||`ではLHSの偽値スコープ下で評価されます。後置スコープはMUST依然として`left_scope`とRHSの後置スコープのnil注入付き結合（「RHSはときどき実行された」をモデル化）であり、これによりRHSからの半束縛の名前が引き続きnil注入します。結果型はMUST`&&`では`union(narrow_falsey(left_type), right_type)`、`||`では`union(narrow_truthy(left_type), right_type)`です。

### 境界

Slice 6 phase 1 + phase 2は、真偽値性・`nil?`・クラスメンバーシップ述語・信頼できる等価／不等価述語についてローカル変数ナローイングを束縛します。以下のサーフェスは意図的に後続に委ねられます。

- 等価ナローイングは意図的に狭いです。すなわちユーザー定義の等価・`eql?`・`===`・Floatリテラル・広い`String`/`Symbol`/`Integer`ドメイン・`Dynamic[Top]`を精密なリテラルドメインに昇格しません。それらの比較は関係的ファクトをMAY運びますが、値ナローイングはRBS／プラグイン宣言の効果を待ちます。
- クロージャに捕捉されたローカルはナローイング時には通常のローカルとして扱われます。Slice 6 phase C sub-phase 3aは`Rigor::Inference::ClosureEscapeAnalyzer.classify(receiver_type:, method_name:, environment:)`を導入します。これはブロック受け入れ呼び出しに対して`:non_escaping`・`:escaping`・`:unknown`を返す純粋なクエリです。Sub-phase 3aはRBSブラインドです。すなわち解析器はコア反復メソッド（`Array`/`Hash`/`Range`/`Set`/`Enumerator`/`Enumerator::Lazy`のEnumerableメソッド、`Hash#each_pair`/`each_key`/`each_value`/`transform_keys`/`transform_values`、`Range#step`、`Integer#times`/`upto`/`downto`、`Object#tap`/`then`/`yield_self`）を`:non_escaping`としてカバーし、既知のリテイナー（`Module#define_method`・`Class#define_method`・`Thread.new`/`start`/`fork`・`Fiber.new`・`Proc.new`）の小さなセットを`:escaping`としてカバーするハードコードされたカタログを出荷します。`Tuple`レシーバーは`Array`に、`HashShape`は`Hash`に射影され、`Constant[v]`は値のクラスを通じて射影されます。`Top`・`Dynamic[T]`・`Union`、およびカタログ化されていない任意の`(class, method)`ペアは`:unknown`を返します。解析器はスコープをMUST NOT変更せず、認識されない入力でMUST NOTraiseしません。消費者はファクト保持のためにMUST`:unknown`を`:escaping`と同じ程度に保守的に扱います。Sub-phase 3aで解析器は純粋なクエリです。
- Slice 6 phase C sub-phase 3bは`ClosureEscapeAnalyzer`を`StatementEvaluator#eval_call`に配線します。`Prism::CallNode`が`Prism::BlockNode`を運び、解析器が呼び出しを`:escaping`または`:unknown`に分類するとき、評価器はMUST後置呼び出しスコープに`bucket: :dynamic_origin`・`predicate: :closure_escape`・`target: Target.new(kind: :closure, name: <method symbol>)`・`payload: { method_name:, classification: }`・`stability: :unstable`の`FactStore::Fact`を取り付けます。`:non_escaping`分類（または任意のブロックなし呼び出し）はMUST後置呼び出しの`Scope#fact_store`を変更せずに残します。Sub-phase 3cはさらに、ブロック本体が再束縛できる各捕捉外側ローカルの絞り込まれた型を落とし、`Scope#with_local`を通じて`Dynamic[Top]`に置き換えます（これはローカルの`local_binding`ファクトも無効化します）。「捕捉外側ローカル」セットは、名前が（a）呼び出し位置スコープの`Scope#locals`に現れ、（b）ブロック自身（`BlockParameterBinder.bind`からのブロック引数、加えて`BlockParametersNode#locals`上の`;`プレフィックス付きブロックローカル）によって導入されて**いない**`Prism::LocalVariableWriteNode`を求めて`BlockNode#body`を歩いて計算されます。ブロックが読むだけのローカルはMUST絞り込まれたまま残ります。ブロック引数によってシャドウされた名前への書き込みはMUST NOTカウントされません。保守的な落としは型を`Dynamic[Top]`に置き換え、`:escaping` / `:unknown`経路にのみ適用されます。[ADR-56](../adr/56-block-captured-local-mutation.md)は`:non_escaping`経路についてこの落としを置き換えます。すなわち`StatementEvaluator#eval_call`は代わりに、ブロックの捕捉ローカルの再束縛を上限付きの本体不動点結合（`write_back_block_captures` / `content_writeback_block_captures`。ループ本体不動点と`Inference::BodyFixpoint`ヘルパーを共有）を通じて書き戻すため、外側ローカルを再束縛または内容変更する非エスケープな`each` / `times` / `upto`ループは、呼び出し前の束縛ではなく結合された後置状態を保ちます。
- インスタンス・クラス・グローバル変数ナローイングはスコープ外のままです。今日解析器によって認識されるのは`Prism::LocalVariableReadNode`のみです。（Slice 7 phase 1は`Scope#with_ivar` / `#with_cvar` / `#with_global`を通じてivar/cvar/グローバル書き込みの**型**を束縛しますが、述語ナローイングカタログは依然として`LocalVariableReadNode`レシーバーについてのみ発火します。）

これらの境界は、Slice 6 phase 1の呼び出し元をMUST NOT静かに劣化させません。すなわち認識カタログ外の述語はMUST両エッジでエントリースコープを観測し、Slice 3 phase 2の挙動を保ちます。

## 環境サーフェス

`Rigor::Environment`は現在のスコープ外の型宇宙に対するエンジンのビューです。すなわちnominalクラス・RBS定義・プラグイン提供のファクト（Slice 6以降）・任意の他のモジュールレベル情報です。Slice 1が束縛する最小の公開サーフェスは以下のとおりです。

- `Rigor::Environment#class_registry` — Rubyの`Class`または`Module`オブジェクトを`Rigor::Type::Nominal`に解決できる`Rigor::Environment::ClassRegistry`を返します。
- `Rigor::Environment::ClassRegistry#nominal_for(class_object)` — 登録されたクラスについて登録済みの`Rigor::Type::Nominal`を返すか、クラスが登録されていなければraiseします。
- `Rigor::Environment::ClassRegistry#registered?(class_object)` — クラスが登録されているかどうかについて`true`または`false`を返します。
- `Rigor::Environment::ClassRegistry#nominal_for_name(name)` — Symbol／Stringのクラス名について登録済みの`Rigor::Type::Nominal`を返すか、名前が未知のとき`nil`を返します。

Slice 4は以下を導入します。

- `Rigor::Environment#rbs_loader` — 環境に取り付けられた`Rigor::Environment::RbsLoader`を返すか、「RBSブラインド」環境（テストフィクスチャ）について`nil`を返します。
- `Rigor::Environment::RbsLoader#class_known?(name)` — RBS環境がその名前のクラスまたはモジュールを定義しているとき`true`を返します。nil安全でstring/symbol寛容です。
- `Rigor::Environment#class_ordering(lhs, rhs)` — Slice 6 phase 2 sub-phase 2。まず静的レジストリを参照し次にRBSローダーを参照することで`:equal`・`:subclass`・`:superclass`・`:disjoint`・`:unknown`を返します。これはクラスメンバーシップナローワーの階層オラクルです。述語位置でアドホックな`Object.const_get`にMUST NOT依存しません。
- `Rigor::Environment::RbsLoader#class_ordering(lhs, rhs)` — 2つの名前について`RBS::Definition#ancestors`を比較することで同じ順序語彙を返します。未知または不正な名前は`:unknown`を返します。
- `Rigor::Environment::RbsLoader#instance_method(class_name:, method_name:)` — 与えられたインスタンスメソッドの解決された`RBS::Definition::Method`を返すか、クラスまたはメソッドが未知のとき`nil`を返します。継承されたメソッドはMUSTこの呼び出しを通じて見えます（ローダーは祖先チェーンを歩く`RBS::DefinitionBuilder#build_instance`を使います）。
- `Rigor::Environment::RbsLoader#singleton_method(class_name:, method_name:)` — Slice 4 phase 2b。与えられた*クラスメソッド*の解決された`RBS::Definition::Method`を返すか、クラスまたはメソッドが未知のとき`nil`を返します。継承されたクラスメソッドはMUST見えます（例: `Class#new`・`Module#name`）。ローダーは`RBS::DefinitionBuilder#build_singleton`を使います。インスタンスとシングルトンの名前空間はMUST互いに素です — 例えば`Module#instance_methods`はシングルトン側で解決され、インスタンス側では静かに不在です。
- `Rigor::Environment::RbsLoader.new(libraries:, signature_paths:)` — Slice 4 phase 2a。呼び出し元がローダーをRBSコアを越えて拡張できるようにします。`libraries`は`RBS::EnvironmentLoader#add(library:, version:)`が受け付けるstdlibライブラリ名の配列です。`signature_paths`は追加の`.rbs`ファイルの`Pathname`または`String`ディレクトリの配列です。未知のライブラリ名はMUSTフェイルソフトです（ローダーは`RBS::EnvironmentLoader#has_library?`を介してそれらをスキップします）。存在しないシグネチャパスはMUSTビルド時に静かに落とされます。`RbsLoader#libraries`と`#signature_paths`は、ラウンドトリップと可観測性のために設定された値を公開します。
- `Rigor::Environment#nominal_for_name(name)` — まずクラスレジストリを参照し、それから（存在するとき）RBSローダーを参照します。最初のヒットの`Rigor::Type::Nominal`を返すか、ヒットなしのとき`nil`を返します。これは「クラス`name`の*インスタンス*」のための構築ヘルパーです。
- `Rigor::Environment#singleton_for_name(name)` — Slice 4 phase 2b。定数のクラスオブジェクトに対する`Rigor::Type::Singleton`を返すか、レジストリまたはRBSローダーのいずれにも`name`のクラスが知られていないとき`nil`を返します。これは`Prism::ConstantReadNode`/`Prism::ConstantPathNode`を型付けするための標準エントリーポイントです。`ExpressionTyper`は、結果がインスタンス型ではなくクラスオブジェクトの型になるよう、MUSTこれを通じてルーティングします。
- `Rigor::Environment#class_known?(name)` — Slice 4 phase 2b。レジストリまたはRBSローダーが`name`を知っているとき`true`を返す便利な述語です。キャリアを実体化せずに存在チェックが必要な呼び出し元に有用です。
- `Rigor::Environment.for_project(root:, libraries:, signature_paths:)` — Slice 4 phase 2a。プロジェクト対応のEnvironmentを構築するファクトリーです。`signature_paths`が`nil`でディレクトリが存在するとき、`<root>/sig`をデフォルトのシグネチャパスとして自動検出します。それ以外では空リストを使います。呼び出し元は明示的な`signature_paths`配列（無効化のための`[]`を含む）を渡してMAY自動検出をオーバーライドできます。プロジェクト対応のローダーは呼び出し元の作業ディレクトリと設定に依存するため、ファクトリーはMUST新鮮なEnvironmentインスタンスを返します — `Environment.default`とMUST NOTメモ化または共有しません。Slice Aのstdlib拡張: ファクトリーはMUST`Environment::DEFAULT_LIBRARIES`（厳選されたstdlibセット: `pathname`・`optparse`・`json`・`yaml`・`fileutils`・`tempfile`・`uri`・`logger`・`date`、加えて解析器隣接の`prism`と`rbs`gem）を呼び出し元の`libraries:`引数の前にマージし、順序を保ちながら結果を重複排除します。未知のライブラリはMUSTフェイルソフトのまま残ります。`RbsLoader#build_env`はすでに`RBS::EnvironmentLoader#has_library?`を通じてフィルタしています。

`0.1.x`サイクルは以下の読み取り側アクセサを追加しました（すべて`Environment.new` / `for_project`のキーワード引数経由でシードされ`attr_reader`として公開されます;対応する事前パスを省略した環境が以前と同じく振る舞うよう、それぞれは空 / `nil`安全な値をデフォルトとします）:

- `Rigor::Environment#project_patched_methods` — プロジェクトの`.rigor.yml` `pre_eval:`リストから投入される`Rigor::Inference::ProjectPatchedMethods`レジストリ（[ADR-17](../../adr/17-monkey-patch-pre-evaluation/)）。ディスパッチャーのプロジェクトパッチメソッドティアが参照する;デフォルトは`ProjectPatchedMethods::EMPTY`。レジストリの読み取りサーフェスは`#lookup(class_name:, method_name:, kind:)`と`#empty?`。
- `Rigor::Environment#dependency_source_index` — オプトインのgemソースカタログ（[ADR-10](../../adr/10-dependency-source-inference/)）、依存ソース推論ティアが参照する。
- `Rigor::Environment#synthetic_method_index` — ADR-16 / ADR-18基板のemitテーブル、合成メソッドティアが参照する。
- `Rigor::Environment#plugin_registry` — 実行のためにロードされた`Rigor::Plugin::Registry`（RBSローダーへマージされるプラグイン貢献の`signature_paths:`（[ADR-25](../../adr/25-plugin-contributed-rbs/)）、および`CheckRules`とバインダーが参照する`open_receivers:` / `protocol_contracts:`のソースでもある）。
- `Rigor::Environment#hkt_registry` — 軽量HKT型関数レジストリ（[ADR-20](../../adr/20-lightweight-hkt/)）、HKT組み込み戻り値ディスパッチャーティアが参照する。これはMUST**この順序**でのマージ（最後の書き込みが勝つ）です: バンドルされた`Builtins::HktBuiltins.registry`ベース、次にプラグインオーバーレイ（`Plugin::Registry#hkt_overlay_registry`、ロードされた各プラグインの`hkt_registrations:` / `hkt_definitions:`を登録順にflat-mapする）、その上に任意のユーザー`.rbs`オーバーレイ。ゲッターはメモ化され、何も貢献しないときはMUST`HktRegistry::EMPTY`を返すので、レジストリのない実行はマージをスキップします。

Slice 6はファクトストアアクセスを導入します。後のスライスで追加されたメソッドはSlice 1のサーフェスをMUST NOT変更しません。

### プラグイン貢献の環境入力（ADR-16ティアA / ADR-32）

2つのプラグイン宣言のマニフェストサーフェスがディスパッチャーティアの外でエンジンに消費されます;それらの値オブジェクトのシェイプ（shape）は[`plugin.md`](plugin.md#rigorpluginmanifest) / [`macro-substrate.md`](macro-substrate.md)にあり、それらのエンジン消費はここで規範的です。

- **`source_rbs_synthesizer:`ファイルごと合成（ADR-32）**。env構築時に、解析された各ソースファイル × ロードされた各プラグインのシンセサイザー呼び出し可能オブジェクトについて、`Environment#collect_virtual_rbs`が`callable.call(path)`を呼び出します。返されたRBS Stringは仮想名`virtual:<plugin id>:<path>`の下で解析環境にマージされます;`nil`または空の返り値は何も貢献しません;`[:error, message]`タプルはraiseされる代わりに合成レポーターへルーティングされます（フェイルソフト）。各`(file, plugin)`呼び出しは`Cache::Store`を通じて、ファイルのコンテンツSHAをプラグインの`PluginEntry`（id + version + config_hash）と合成したキーでメモ化されるので、コンテンツや設定の変更がちょうどそのエントリーを無効化します。`signature_paths:`（静的なバンドルRBS）とは異なります: シンセサイザーは毎回の実行でプロジェクトソースからRBSを導出します。

- **`block_as_methods:` self型ナローイング（ADR-16ティアA）**。`ExpressionTyper`がブロックを伴う呼び出しを型付けするとき、`Inference::MacroBlockSelfType.narrow_self_type_for(scope:, call_node:, receiver_type:)`を参照します。マッチ契約は狭いです: 呼び出しのレシーバー型はMUST`Singleton[X]`（クラスレベルのDSL呼び出し——クラス本体内の暗黙的self、または明示的な`App.get(...)`）であり、`X`はMUST登録されたエントリーの`receiver_constraint`に等しいか継承する（`Environment#class_ordering`経由）でなければならず、呼び出しのメソッド名はMUSTそのエントリーの`method_names`にあります。マッチ時にはブロック本体が`self_type`を**インスタンス**型`Nominal[X]`にナローイングして型付けされます（Sinatraの`generate_method`に対応し、これはブロックをユーザーのアプリクラスのインスタンスメソッドに変えます）;マッチしないときヘルパーは`nil`を返し、ブロックの`self`は変わりません。ルックアップはフェイルソフトです（`class_ordering`の失敗は「マッチなし」に劣化します）。これはティアAの床です: ブロック内の裸の識別子メソッドルックアップは、その後エンジンの通常の`self_type`駆動の経路を通じて解決されます。

クラスレジストリはMUST常に以下のRubyクラスを認識します。すなわち`Integer`・`Float`・`String`・`Symbol`・`NilClass`・`TrueClass`・`FalseClass`・`Object`・`BasicObject`です。実装は、列挙されたクラスが存在し続ける限り、このリストをMAY拡張できます。

デフォルトの`Rigor::Environment.default`は、RBSコア（オプトインライブラリなし、シグネチャパスなし）をカバーするデフォルトの`RbsLoader`をMUST取り付けます。`Rigor::Environment.new`を構築（kwargsなし）すると、テストフィクスチャがRBS起動コストを払わずにエンジンの挙動をアサートできるよう、MUST RBSブラインド環境を生成します。`for_project`ファクトリーは、本番CLIコマンドおよびローカルの`sig/`ツリーが必要な任意の他の呼び出し位置に対する標準エントリーポイントです。

## 決定性とキャッシュ

`Scope#type_of`の結果は、与えられた`(scope, node)`ペアについてMUST決定的です。キャッシュはMAY使われ、同一性（`equal?`）または構造的等価性（`==`）でMAYキー付けできます。キャッシュは観測可能な挙動をMUST NOT変更し、パフォーマンスのみを変更します。

構造的に等しく比較される2つのスコープは、それらが同じRubyオブジェクトでなくても、同じノードに対して`Scope#type_of`からMUST構造的に等しい結果を生成します。

## 安定性とバージョニング

本ドキュメントの契約はメジャーバージョン内で安定です。以下は加えて安定です。

- `Scope#type_of`の形状（入力型・戻り値型・純粋性・オプショナルな`tracer:`キーワード）。
- `Scope.empty(environment:)`コンストラクタシグネチャ。
- `Scope#join(other)`のセマンティクス。すなわち同一環境要件・束縛された名前の交差・型のunion。
- フェイルソフトポリシーとその`Dynamic[Top]`戻り値。
- フォールバックトレーサープロトコル（`record_fallback`・`events`・`empty?`・`size`・`each`）と`Rigor::Inference::Fallback`値オブジェクト。
- 上で列挙された最小のクラスレジストリサーフェス。
- `Rigor::AST::Node`マーカーモジュールと、上記のラウンドトリップ挙動を持つ`Rigor::AST::TypeNode`の存在。
- メソッドディスパッチ境界。すなわちメソッド要約テーブルは`Rigor::Type`のインスタンスにMUST NOT存在しません。

以下は、後のスライスがそれらを昇格させるまで、安定性契約から明示的に外れます。

- `ExpressionTyper`が認識するPrismノードの正確なカタログ。
- `Rigor::Scope`の内部レイアウトとそのキャッシュ戦略。
- ファクトストアスキーマ（Slice 6以降）とRBSローダーキャッシュ形状（Slice 4以降）。
- ADR-3の未決事項の解決に依存する、`Rigor::Type`のケイパビリティと射影サーフェス。

## 関連ドキュメント

- [`docs/internal-spec/internal-type-api.md`](../internal-type-api/) — 型付け器が消費する型オブジェクト公開契約。
- [`docs/internal-spec/implementation-expectations.md`](../implementation-expectations/) — 型付け器を取り巻くエンジンサーフェス契約（Scope結合・ファクトストア・効果モデル・ケイパビリティロール推論）。
- [`docs/adr/4-type-inference-engine.md`](../../adr/4-type-inference-engine/) — 設計根拠・スライスロードマップ・ADR-3の未決事項に対する暫定回答。
- [`docs/adr/3-type-representation.md`](../../adr/3-type-representation/) — 型オブジェクト表現と、その暫定回答にADR-4がコミットしている未決事項。
- [`docs/adr/43-rbs-complete-ancestor-resolution.md`](../../adr/43-rbs-complete-ancestor-resolution/) — RBSバックのディスパッチティアがRBS完全祖先のRubyの部分型に対して行う、許可リスト方式の継承メソッド解決。
- [`docs/type-specification/relations-and-certainty.md`](../../type-specification/relations-and-certainty/) — 部分型・漸進的一貫性・3値セマンティクス。
- [`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/) — フェイルソフト経路で用いる`Dynamic[T]`代数。
- [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/) — Slice 6 narrowing target.
