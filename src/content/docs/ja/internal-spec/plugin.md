---
title: "プラグインの登録と読み込み"
description: "rigortype/rigor docs/internal-spec/plugin.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/plugin.md"
sourcePath: "docs/internal-spec/plugin.md"
sourceSha: "6ac3b9be4fe98a97e7e29d4e63d85199a8880ecca89cc6ae1cc236baa3f4cd17"
sourceCommit: "e3eb424c3c88035e453246710c8df3dc5cc8e7e1"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**規範的**。プラグイン作成者がプラグインの**登録**・**マニフェスト宣言**・`Analysis::Runner`による**ロード**・ADR-37の狭いプロトコルを通じた**貢献**に関して使用するパブリックサーフェス（surface）を固定します。創成期の貢献プロトコル（動的返却・型指定・動的リフレクション）はすべて`0.1.x`サイクルを通じて着地しました;`dynamic_return` / `narrowing_facts`は下記で仕様化され、`flow_contribution_for`はADR-52 WD3で除去されました。

拘束力のある設計サーフェスは[ADR-2](../../adr/2-extension-api/)です；v0.1.0の準備状況マップは[`docs/design/20260505-v0.1.0-readiness.md`](../../design/20260505-v0.1.0-readiness/)にあります。この仕様がADR-2と矛盾する場合、ADRが優先されます。

## パブリックネームスペース（ドリフト固定済み）

以下のすべてのネームスペースは[`spec/rigor/public_api_drift_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/rigor/public_api_drift_spec.rb)によってロックされています。シグネチャの変更は同じコミットで対応する`PublicApiDriftSnapshots::*`定数を更新します。

### `Rigor::Plugin`

プラグイン登録のモジュールレベルエントリー。

| メソッド | 目的 |
| --- | --- |
| `Rigor::Plugin.register(plugin_class)` | プラグインgemがロード時に`Rigor::Plugin::Base`サブクラスをアドバタイズするために呼び出す。 |
| `Rigor::Plugin.registered_for(id)` | マニフェストidによるローダー側のルックアップ。 |
| `Rigor::Plugin.registered` | 凍結された`{ id => class }`スナップショット。 |
| `Rigor::Plugin.unregister!(id = nil)` | テスト専用リセット。プラグイン契約（contract）はgem作成者にこれを呼び出すことを要求しない。 |

レジストリはプロセスグローバルでmutexガードされています。同じクラスを2回登録することはno-opです；同じidで異なるクラスを登録すると`Rigor::Plugin::LoadError`が発生するため、2つのプラグインが互いをサイレントに上書きすることはできません。

### `Rigor::Plugin::Base`

すべてのプラグインがサブクラス化する基底クラス。

```ruby
class MyPlugin < Rigor::Plugin::Base
  manifest(
    id: "my-plugin",
    version: "0.1.0",
    description: "...",
    config_schema: { "flag" => :boolean }
  )

  def init(services)
    @reflection = services.reflection
  end
end
```

クラスレベルの`manifest(**fields)`はクラス定義時に一度マニフェストを宣言します；引数なしで呼び出すと、キャッシュされた`Manifest`を返します。インスタンスレベルの`manifest`はクラスに委譲します。

`#initialize(services:, config: {})`は注入されたサービスと、マニフェストの宣言されたデフォルトをその**下に**マージしたユーザーのconfigの凍結コピーを格納します（下記の_宣言されたconfigデフォルト_を参照）。`#init(services)`はプラグインがサービスコンテナから状態を接続するために使用するオーバーライドフックで、デフォルト実装はno-opです。

`Base`の完全なサーフェスはRBS（[`sig/rigor/plugin/base.rbs`](https://github.com/rigortype/rigor/blob/master/sig/rigor/plugin/base.rbs)）で宣言され、**自己チェック**されます。すなわちバンドルされたプラグイン／サンプルlibツリーが`rigor check`（`make verify`とCIにチェーンされた`make check-plugins`ゲート）を通ります。プラグインの部分型が継承する契約呼び出し（`manifest.…`・`io_boundary.…`）を`Base`のRBSに対して解決する[ADR-43](../../adr/43-rbs-complete-ancestor-resolution/)のRBS完全祖先解決と組み合わせることで、契約サーフェスを誤用するプラグイン（契約が宣言しないメソッドや、名前変更されたヘルパーを呼ぶプラグイン）は`call.undefined-method`でビルドを失敗させます。補完的な構造スペック（[`spec/integration/plugin_contract_conformance_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/integration/plugin_contract_conformance_spec.rb)）がもう半分をカバーします。すなわち各フックのオーバーライド（`init` / `prepare` / `diagnostics_for_file`）はエンジンの呼び出しでMUST呼び出し可能であり続けます ── エンジンが供給するパラメータを落とすナローイングオーバーライドは失敗します（パラメータ／アリティのリスコフ互換性、ADR-5）。

`#diagnostics_for_file(path:, scope:, root:)`（スライス5）は**ファイル全体**の診断フックです。デフォルトは空の配列を返します。プラグイン作成者はこれをオーバーライドして`root`（解析された`Prism::Node`）を自分で走査し、`Rigor::Analysis::Diagnostic`行の配列を返してもよい（MAY）ですが、ノードスコープのチェックに推奨されるサーフェスは`node_rule`（下記）であり、これはエンジンに走査を所有させます。`#diagnostics_for_file`は真にファイルスコープな診断——単一のロードエラー行、または解析済みファイル全体を一度に必要とするチェック——のために予約されています。ランナーはADR-7 §「スライス5-B」に従って返されたすべての診断を`source_family: "plugin.<manifest.id>"`で再スタンプするため、プラグイン作成者が誤って別のプラグインのidで公開することはありません。フック内のプラグイン例外は`rigor check`をクラッシュさせるのではなく、`:plugin_loader`の`runtime-error`診断として隔離されます。

#### ノードスコープのルール — `node_rule` / `#node_rule_diagnostics`（ADR-37）

`node_rule(node_type) { |node, scope, path, file_context, context| … }`は、ノードスコープの診断ルールを宣言するクラスレベルのDSL（`producer`スタイルの形状）です。エンジンは解析される各ファイルのASTを**一度**走査し、`node.is_a?(node_type)`となるすべてのノードをそのルールへディスパッチします。そのためプラグイン作成者はチェックを書き、走査は決して書きません——これがプラグインから手書きの`def walk` / `compact_child_nodes.each`の再帰を取り除けるようにするものです。ブロックは`instance_exec`を通して実行され（そのため`self`はプラグインインスタンス——`config`・`services`・`services.fact_store`・`diagnostic`がすべてスコープ内）、`(node, scope, path, file_context, context)`を受け取り、`Array<Rigor::Analysis::Diagnostic>`を返します（何も発火させない場合は空）。`node_type`は`Prism::Node`サブクラスでなければなりません（MUST）。型ごとの複数のルールは宣言順に実行されます。エンジンはそれらを1つの共有された実行ごとのウォーク`Plugin::Registry#node_rule_walk`（[`NodeRuleWalk`](https://github.com/rigortype/rigor/blob/master/lib/rigor/plugin/node_rule_walk.rb)、ADR-52 WD4）を通じてディスパッチします: ファイルごとの単一の走査がすべてのnode-ruleプラグインに供され、ランナーは各プラグインのバケットをその`#diagnostics_for_file`の結果と、同じ`plugin.<id>`スタンプとプラグインごとの例外隔離のもとでマージします;ルールを宣言しないプラグインはゼロコストです。インスタンスメソッド`#node_rule_diagnostics(path:, scope:, root:)`は同等の単一プラグインエントリーポイントとして`Base`に残っています（ドリフト固定済み、プラグインスペックが使用）が、エンジンはもはやそれを経由してルーティングしません。

**5番目**のブロック引数`context`（ADR-37スライス1d）は、ノードのレキシカルな祖先チェーンを担う`Rigor::Plugin::NodeContext`です——ADR-2が約束した`ContextInfo`です。これは`#ancestors`（完全なチェーン、最も外側が先、ノード自体を除く）に加えて、便利メソッド`#enclosing_def`・`#enclosing_module`・`#enclosing_block(name)`を公開します。ルールは、チェックがノードの*位置*に依存するときにそれを読みます: `before_action` / `render`が属する内包コントローラー（`rigor-actionpack`は名前空間修飾されたコントローラー名を`context.ancestors`から再導出する）、マッチャーが配置される`describe <Model>`（`rigor-shoulda-matchers`）、または遅延`t('.key')`が展開されるアクション（`rigor-rails-i18n`）など。より少ないパラメータを取るブロックは、末尾の引数を単に無視します（後方互換）。

`node_file_context { |root, scope| … }`は2パス（収集してから検証する）プラグインをサポートします。これはいずれのノードルールが発火する前に、ファイルごとに一度（`instance_exec`経由で）実行され、その戻り値は**4番目**のブロック引数としてすべてのルールへ渡されます（既存の3パラメータのブロックはそれを無視します）。*同一ファイル*の収集——参照を検証する前に宣言された名前を集める——はここに属します。なぜなら、エンジンの単一の前方走査は、参照に到達する前に収集を完了できないからです。*クロスファイル*の収集は代わりに`#prepare` + `services.fact_store`に属します;ノードルールは公開されたファクトを直接読み、ファイルごとのコンテキストを必要としません。

#### 診断の位置決め — `#diagnostic`（ADR-37作成者ヘルパー）

`#diagnostic(node, path:, message:, severity: :error, rule: nil, location: nil)`は、`node`に位置づけられた`Rigor::Analysis::Diagnostic`を構築し、他のすべてのプラグインが手作業で再導出する1始まりの`line` / `start_column + 1`の慣習を内部に取り込みます。サブロケーションを指すには`location:`（Prismのロケーション）——典型的には`node.message_loc`——を渡します。そうすればマッチャー／メソッド名の診断は、レシーバーにまたがる呼び出し全体ではなく、その名前を指します;`nil`の`location:`は`node.location`にフォールバックします。作成者は`source_family`を設定してはなりません（MUST NOT）（ランナーがスタンプします）。基礎となるコンストラクタ`Rigor::Analysis::Diagnostic.from_node(node, …)`と`.from_location(location, …)`は、コアルールやその他のプロデューサーのためにパブリックです。

`Rigor::Plugin::Base.suggest(name, candidates)`（ボイラープレート削減計画 §0c）は、共有の「もしかして…?」ヘルパーです: `DidYouMean::SpellChecker`（エンジンのRuby自身の`NoMethodError`ヒントが使うもの）経由で`candidates`のうち`name`に最も近いものを返すか、`nil`を返します。これは**クラス**メソッドなので、プラグインインスタンスからも`Analyzer`モジュール関数からも呼び出せ、プラグインがかつて持っていた手書きのLevenshteinのコピーを置き換えます。これは既に発行された診断の提案*テキスト*にのみ影響し、診断が発火するかどうかには決して影響しません。

`#diagnostics_for(violations, path:, node: nil)`（ADR-60 WD4）は、プラグイン自身の違反オブジェクトを`#diagnostic`を通して`Diagnostic`へマッピングし、node-ruleプラグインがさもなくば繰り返す`violations.map { |v| diagnostic(node, …) }`ブロックを吸収します。各違反は`#message`（必須）に加えて、任意の`#node`（位置を合わせるPrismノード——`node:`引数にフォールバックする）、`#location`、`#severity`（デフォルト`:error`）、`#rule`をダックタイピングします。`#diagnostics_for_file` / `node_rule`ブロックからの直接returnに適したArrayを返します。

`#read_fact(plugin_id:, name:)`（ADR-60 WD4）は、別のプラグインの`#prepare`が公開したクロスプラグインファクト（ADR-9）を読み、インスタンス上で`(plugin_id, name)`ごとに**nil結果も含めて**メモ化します。nilを含むメモは、「ファクトが未公開」と「まだ読んでいない」を区別するために発見プラグインが抱えていた手書きの`@x_resolved`フラグを退役させます;ロードされたどのプロデューサーも公開していないファクトは`nil`として読まれます。（`#producer_value` / `#producer_error`——これらのヘルパーのキャッシュプロデューサー版の双子——は[`plugin-cache-producers.md`](plugin-cache-producers/)で仕様化されています。）

`#prepare(services)`（ADR-9）はプロジェクト全体の事前パスフックで、プラグインインスタンスごとに、そのインスタンスのファイルごとの解析が始まる前に一度呼ばれます（§_並行性と値オブジェクトの共有可能性_を参照）。クロスプラグインファクト（`manifest(produces:)`）を公開するプラグインはこれをオーバーライドしてプロジェクトを走査し、`services.fact_store.publish(...)`を呼びます;ローダーのトポロジカル順序付けが、プロデューサーの`prepare`がいずれのコンシューマーのものよりも先に実行されることを保証します。デフォルトはno-opです。

#### 引数リテラルの抽出 — `Source::Literals`（ボイラープレート計画 §0a）

`Rigor::Source::Literals`は、「このPrism引数ノードはリテラルの`:sym` / `"str"`か、もしそうなら何を名指しているか？」——ほぼすべてのDSLウォーカーが問う質問（`state :draft`・`has_one_attached :avatar`・`validate_presence_of(:name)`）——への共有の答えです。手書きの`node.unescaped.to_sym if SymbolNode || StringNode`よりも推奨される抽出器で、パブリックAPIドリフト仕様（`SOURCE_LITERALS_SINGLETON`）に固定され、[`public-api.md`](../public-api/)の「`Rigor::Source::*`は内部である」ルールから免除されています。メソッドは`module_function`なので、それぞれ`Rigor::Source::Literals.symbol(node)`として呼び出せます。

単一ノードのサーフェスは2つの軸——どのノード種別を受け入れるか、呼び出し側が何を返してほしいか——にわたるグリッドで、それ以外のいかなるノード（`nil`を含む）に対しても`nil`を返します:

| 受け入れ | → `Symbol` | → `String` |
| --- | --- | --- |
| `:sym`のみ | `.symbol(node)` | `.symbol_name(node)` |
| `:sym`または`"str"` | `.symbol_or_string(node)` | `.symbol_or_string_name(node)` |

`SymbolNode`のみの形式が存在するのは、`state :draft`と`state "draft"`を区別するDSLが、サイレントに拡幅するのではなくその区別を保てるようにするためです。`#value`ではなく`#unescaped`が使われるのは、補間のない`"foo"` / `:foo`が両方のノード種別で一貫して`:foo` / `"foo"`へラウンドトリップするようにするためです。グリッドと並んで、`.symbol_named?(node, name)`は述語形式です——`node`が`#unescaped`が`String`の`name`と等しい`SymbolNode`であるとき`true`、それ以外のいかなるノードに対しても`false`——`.symbol(node)`の結果を比較することになる「この引数はちょうど`:draft`か？」というテスト向けです。`SymbolNode`のみのグリッド列と同様に、これは`"draft"`という文字列リテラルには**一致しません**。

グリッドの上に2つの呼び出し引数ヘルパーが乗ります:

- `.symbol_arguments(call_node)` → `Array[Symbol]` — ソース順のすべてのリテラルなSymbol/String位置引数;非リテラルの引数は捨てられます;呼び出しが引数リストを持たないときは`[]`。
- `.symbol_arg(call_node, index)` → `Symbol?` — 位置`index`のリテラル、または呼び出しが引数リストを持たない・インデックスが範囲外・その引数がリテラルなSymbol/Stringでないときは`nil`。

#### 戻り値型とナローイングの貢献 — `dynamic_return` / `narrowing_facts`（ADR-37スライス2）

`flow_contribution_for`はちょうど2つのエンジンサイトで参照され、それぞれが返されたバンドルのちょうど1スロットを読んでいました: `MethodDispatcher`は`.return_type`（呼び出しサイトごとの戻り値型）を読み、`StatementEvaluator`は`.post_return_facts`（アサーションエッジのナローイング）を読みます。ADR-37スライス2は、これら2つの消費サイトを2つの狭く宣言的にゲートされるクラスDSL——`producer`スタイルの形状なので、ブロックはロジックを担い`instance_exec`を通して実行されます——へ分割します:

- `dynamic_return(receivers:, methods:, file_methods:) { |call_node, scope| Type | nil }` — レシーバーのクラス、メソッド名、またはその両方でゲートされた、呼び出しサイトごとの**戻り値型**（少なくとも1つのゲートがREQUIRED ── どちらでもゲートしない規則はすべてのディスパッチで発火してしまうため、`dynamic_return`はロード時にそれを拒否します）。`receivers:`（クラス名の空でない`Array`、または`#prepare`の後に実行ごとに一度解決される`-> { … }`のcallable、ADR-52スライス3）を指定すると、エンジンは呼び出しのレシーバー型のクラスが宣言されたエントリーと等しいか、それを継承する場合にのみブロックを呼びます（`Environment#class_ordering`経由でマッチ）。`methods:`（Symbol／String名の`Array`、または実行時callable、ADR-52スライス4）は`call_node.name`でゲートします。`file_methods:`（パスを受け取り`(rule, path)`ごとにメモ化されるcallable、ADR-52スライス5a）は、解析対象ファイルによって変わる名前集合（rigor-rspecの`let`名）向けのファイルごとの特殊化であり、`methods:`を置き換えます。最初の非`nil`が勝ちます。エンジンはそれを`#dynamic_return_type(call_node:, scope:, receiver_type:)`を通して呼び出します。`rigor-mangrove`（アンラップ → 担われた`type_args[0]`）が実装済みのコンシューマーです。
  - **二項演算子はここでは通常の呼び出しです**。Rubyの`a + b`は`:+`という名前の`Prism::CallNode`に解析されるため、他のあらゆる呼び出しと同様にこのフックへ到達します。すなわち`dynamic_return(receivers: ["Money"])`規則は`call_node.name ∈ {:+, :-, :*, :/, :<=>, …}`で分岐して演算子の結果型を返すことができ ── これはself／左オペランドのケースに対するPHPStanの`OperatorTypeSpecifyingExtension`のRigor版であり、演算子固有の拡張ポイントを持ちません。`spec/integration/plugin_operator_dynamic_return_spec.rb`によって確認済みです。**注意（coerce方向）：**ゲートは*レシーバー*のクラスにかかり、Rubyは`1 + money`を`Integer`でディスパッチするため、`["Money"]`規則はそこでは発火しません。その結果は`Integer`として左バイアスで型付けされます（ADR-42を参照）。
- `narrowing_facts(methods:) { |call_node, scope| facts | nil }` — `call_node.name`が宣言された`methods:`に含まれることでゲートされた、**戻り値後のナローイングファクト**。エンジンはそれを`#narrowing_facts_for(call_node:, scope:)`を通して呼び出します。`rigor-minitest`（アサーションナローイング）と`rigor-rspec`のマッチャーナローイングが実装済みのコンシューマーです。`narrowing_facts`は[ADR-80](../../adr/80-narrowing-facts-rename/)により`type_specifier`から改名されました;旧来の動詞は`0.2.x`の間は非推奨のエイリアスであり、0.3.0では、それが残していたリーダー（`type_specifiers`）・エンジンコンシューマー（`#type_specifier_facts`）・ケイパビリティキー（`type_specifier_methods`）とともに消えました。

`receivers:` / `methods:`は、`rigor plugins --capabilities`カタログ（ADR-37 §「機械可読なケイパビリティカタログ」）が列挙する、grep可能でインデックス可能なゲートです。

**`#flow_contribution_for`はADR-52 WD3（2026-06-11）で除去されました**。このフックを依然として定義するプラグインはロード時に`ArgumentError`をraiseします。本番の5つのユーザーはすべて`dynamic_return` / `narrowing_facts`へ移行しました（移行表の全体はCHANGELOGの`### Removed`を参照）。それが果たしていた歴史的役割 ── 呼び出しごとにゲートされない太いフックで`FlowContribution`バンドルを返すもの ── は、いまや上記で記述した狭くコンパイルディスパッチされるDSL形式で表現されます。

#### 機械可読なケイパビリティカタログ — `rigor plugins --capabilities`（ADR-37スライス3）

`rigor plugins --capabilities`は、各プラグインが何をするのかをエージェントが学ぶために列挙する、プラグインごとの拡張プロトコルゲートを出力します。**ロードされた**プラグインのみが現れます（ロードに失敗したプラグインはケイパビリティ（capability）を一切貢献しません）。`--format json`では出力は次のとおりです:

```json
{
  "configuration": "<path to .rigor.yml, or null>",
  "capabilities": [
    {
      "id": "<plugin id>",
      "gem": "<gem name>",
      "version": "<plugin version>",
      "node_rule_types": ["<Prism node class name>", "..."],
      "dynamic_return_receivers": ["<receiver class name>", "..."],
      "narrowing_facts_methods": ["<method name>", "..."],
      "produces": ["<fact id>", "..."],
      "consumes": ["<plugin_id/fact_name>", "..."]
    }
  ]
}
```

5つのケイパビリティ配列は、まさに上記の狭いプロトコルの宣言的ゲートです: `node_rule_types`は各`node_rule`ノード型から、`dynamic_return_receivers`は`dynamic_return(receivers:)`から、`narrowing_facts_methods`は`narrowing_facts(methods:)`から、`produces` / `consumes`はADR-9のマニフェストフィールドから来ます。プラグインがそのサーフェスに対して何も宣言しないとき配列は空になり、テキストビューは空のサーフェスを完全に省きます。これは、プラグインコードをロードせずにゲートをgrep可能・インデックス可能に保つ契約です。

### ターゲットライブラリの呼び出し — `Plugin::Inflector` / `Plugin::Isolation` / `Plugin::Box`（ADR-39）

[ADR-39](../../adr/39-plugin-target-library-invocation/)は、プラグインがターゲットとするライブラリの**純粋で許可リストに載ったメソッドを直接呼び出す**ことを許します（PHPStan拡張が実際のフレームワークを呼び出すことのRuby版）——それらを再実装するのではなく。ライブラリの実際の振る舞いから逸脱する再実装は誤ったファクト、すなわち偽陽性です。このルールは、エンジンの定数畳み込み層が使うのと同じハーネスによって境界づけられます: 明示的な純粋メソッドの許可リスト、Rigor由来の入力、チェックされたデータ結果、そしてライブラリが到達不能なときの**辞退（決して近似しない）**。これはADR-2の、解析対象の*アプリケーション*自身のコードを実行することの禁止を**緩めるものではありません**——ターゲットライブラリは信頼された宣言済みの依存であり、プロジェクトのソースとは区別されます。

- `Rigor::Plugin::Inflector` — 実装済みのコンシューマー + Railsファミリープラグインのための共有の語形変化ヘルパー。`underscore` / `camelize` / `singularize` / `pluralize` / `classify`は実際の`ActiveSupport::Inflector`（固定された`ALLOWED_METHODS`許可リスト）に委譲します;`tableize`は意図的に委譲され**ません**——ASに支えられた`underscore` / `pluralize`を、ActiveRecordの実際のテーブル名計算が適用する`::` → `_`の平坦化と合成するので、`Admin::User` → `admin_users`となり、ASの`admin/users`にはなりません。これは**近似を一切持ちません**（gemが到達不能なときは例外を投げるので、呼び出し側は黙らせるために辞退します）。`rigor-rails-routes` / `rigor-activerecord` / `rigor-actionpack` / `rigor-actionmailer` / `rigor-factorybot`がこれを使います。
- `Rigor::Plugin::Isolation` — 呼び出しのための**選択可能な分離戦略**で、`RIGOR_PLUGIN_ISOLATION`によって選ばれます（`exe/rigor`ランチャーが`.rigor.yml`の`plugins_isolation:`をそれにマップします）。3つのバックエンドにわたる1つの`call(feature:, receiver:, method:, args:)`インターフェースで、**`process`がデフォルト**:
  - `process`（デフォルト） — 単一のforkされた**永続ワーカー**（呼び出しごとではなく、一度だけforkして再利用）がライブラリをロード + 呼び出し、Marshalパイプ経由でデータを返します;ワーカーのクラッシュ（`SIGSEGV`さえも）は封じ込められます——親は辞退して再生成します。`fork`が利用できない場所では`none`にフォールバックします。
  - `none` — メイン空間にロードして直接呼び出します（分離なし;forkなしのフォールバック + 明示的なオプトアウト）。
  - `ruby_box` — `Ruby::Box`（`Rigor::Plugin::Box`;`exe/rigor`は`RUBY_BOX=1`のもとで再execします）の内部で呼び出します。モンキーパッチ + バージョンをインプロセスで分離します。実験的;上流`Ruby::Box` VMのバグでゲート中。
- `Rigor::Plugin::Box` — `ruby_box`戦略を支える`Ruby::Box`ラッパー（`enabled?` / `require_feature` / `eval`）。

ターゲットライブラリのファクトを必要とするプラグインは`Plugin::Inflector`を（または、新しいライブラリの場合は独自の許可リストを持つ`Isolation.call`を）呼びます;分離が重要なとき、ターゲットをメイン空間に直接`require`することは決してありません。ターゲットgemへの本番依存は、プラグイン自身のgemspecに属します。

### `Rigor::Plugin::Manifest`

1つのプラグインのアイデンティティを記述する凍結値オブジェクト。フィールド：

| フィールド | 型 | 目的 |
| --- | --- | --- |
| `id` | `/\A[a-z][a-z0-9._-]*\z/`に一致する`String` | 安定した識別子；`PluginEntry#id`と`plugin.<id>.<rule>`診断プレフィックスとして使用される。 |
| `version` | 空でない`String` | プラグインバージョン；キャッシュ無効化のため`PluginEntry#version`に格納される。 |
| `description` | `String?` | 人間が読めるサマリー。 |
| `config_schema` | `{ String => Symbol \| { kind:, default: } }` | 受け入れられるconfigキーと値の**種類**（kind、`:string`・`:boolean`・`:integer`・`:array`・`:hash`・`:any`）のマッピングで、宣言された**デフォルト**（default）をオプションで担う（ADR-40;下記の_宣言されたconfigデフォルト_を参照）。 |

以下の**拡張フィールド**は`0.1.x`サイクルを通じて追加されました。すべてオプションで、1.0前のプラグイン契約に対して追加的です;これらを1つも宣言しないプラグインはただのファイルごとのアナライザーです:

| フィールド | 型 | 目的 |
| --- | --- | --- |
| `produces` | `Array<Symbol>` | このプラグインが公開するクロスプラグインファクト（ADR-9）。 |
| `consumes` | `Array<Consumption>` | このプラグインが読むクロスプラグインファクト（`{ plugin_id:, name:, optional: }`）;ローダーのトポロジカル順序付けを駆動する（ADR-9）。 |
| `signature_paths` | `Array<String>` | プラグインが貢献するRBSシグネチャディレクトリ、プラグインgemルートからの相対;`Loader`が解決し環境にマージする（ADR-25）。 |
| `owns_receivers` | `Array<String>` | ディスパッチルーティングのためにこのプラグインが所有するレシーバークラス名。 |
| `open_receivers` | `Array<String>` | `call.undefined-method`から免除されるレシーバークラス名（そのメソッド表面が無制限 — 例: `ActiveRecord::Relation`）（ADR-26）。 |
| `type_node_resolvers` | `Array` | カスタムなRBS型名解決を貢献する`Plugin::TypeNodeResolver`エントリー（ADR-13）。 |
| `protocol_contracts` | `Array<ProtocolContract>` | パススコープの振る舞い契約（`path_glob` + `method_name` + `singleton` + param/return型 + 重大度）;provide-and-check（ADR-28）。 |
| `source_rbs_synthesizer` | `#call(path) -> String?` | env構築時にプロジェクトソースファイルからRBSを合成する呼び出し可能オブジェクト（例: rbs-inline取り込み）（ADR-32）。 |
| `block_as_methods`, `heredoc_templates`, `trait_registries` | `Array<Plugin::Macro::*>` | ADR-16のマクロ / DSL展開基板のティア（A / C / B;一度も配線されなかったティアD `external_files:`はADR-60 WD1で削除された）。値オブジェクトの形状は[`macro-substrate.md`](../macro-substrate/)で仕様化されています。 |
| `nested_class_templates` | `Array<Plugin::Macro::NestedClassTemplate>` | enum形状のブロックDSL（`variant <Const>, <Type>`）からのネストされたサブクラス放出;メソッドだけでなくクラスを生み出すマクロ基板ティア（ADR-36）。[`macro-substrate.md`](../macro-substrate/)で仕様化されています。 |
| `hkt_registrations`, `hkt_definitions` | `Array` | 軽量HKTの型関数登録（ADR-20）。 |
| `additional_initializers` | `Array<AdditionalInitializer>` | クラス（およびそのサブクラス）上のどの`initialize`以外のメソッドがivar状態も確立するかを宣言する`{ receiver_constraint:, methods:, block_methods: }`エントリー——`methods:`は`def`形式（`def setup`）向け、`block_methods:`はブロック付き呼び出し形式（`before { … }`・`let(:x) { … }`）向け;少なくとも1つは空でないことが必要。`ScopeIndexer`の書き込み前読み込みnil健全性ゲートに供給する（ADR-38）。 |

`#validate_config(config)`はエラー文字列の配列を返します；ローダーは空でない結果を`LoadError`に変換します。各拡張フィールドは`Manifest#initialize`で独自のバリデーションを持ちます。

#### 宣言されたconfigデフォルト — `config_schema`の`{ kind:, default: }`（ADR-40）

`config_schema`の値は、元の**素の種類**（`Symbol`/`String` — `"flag" => :boolean`）でも、`kind:`（必須）とオプションの`default:`を担う`Hash`でもよい（MAY）です:

```ruby
config_schema: {
  "dsl_method"   => :string,                                  # bare kind, no default
  "state_method" => { kind: :string, default: "state" },      # kind + declared default
  "events"       => { kind: :array,  default: [] }
}
```

2つの形式は1つの文法の純粋なスーパーセットです;エンジンは以下の契約を守らなければなりません（MUST）:

- **種類マップは形状が変わらない**。`Manifest#config_schema`は`{ String => Symbol }`（種類のみ）のままでなければならず（MUST）、そのため`#validate_config`・`#to_h`・`#==`・`#hash`は、キーがどちらの形式を使ったかに影響されません。`{ kind:, default: }`エントリーは、素の種類とまったく同じように`kind:`をこのマップへ貢献します。
- **`Manifest#config_defaults`**は、`default:`を宣言した**キーのみ**を保持する凍結された`{ String => value }`マップを公開しなければなりません（MUST）。これはパブリックリーダー（パブリックAPIドリフト仕様 + RBS sigに固定）です。宣言されたデフォルトを持たないキーは現れません。
- **宣言された`default:`は、マニフェスト構築時にその`kind:`に対してバリデートされなければなりません（MUST）**（`#validate_config`がユーザー値に適用するのと同じ`value_matches?`チェック）。誤った型のデフォルト（`kind: :string`のもとでの`default: 5`）は、使用時にサイレントに失敗するのではなく、ロード時に`ArgumentError`を発生させなければなりません（MUST）。
- **`Plugin::Base#config`はユーザーconfigの下にデフォルトをマージします**: `#initialize`は`manifest.config_defaults.merge(user_config)`（凍結済み）を`#config`として格納するので、それが設定するいかなるキーでも**ユーザーconfigが勝ちます**。したがってプラグインは`config.fetch("state_method")`（または`config["state_method"]`）を読み、`DEFAULT_*`定数も2番目の`fetch`引数もなしに宣言されたデフォルトを得ます;プラグインがなお望む強制変換（`.to_sym`・`Array(...)`）は読み取りサイトに留まります。マニフェストなしで宣言されたクラス（テストダブル）は、生のconfigを変更せずに保ちます。

この形式はconfigのエルゴノミクスのみです: ルールも型も変えないので、診断を導入することはできません。これはキャッシュセーフでもあります——デフォルトはプラグインの*コード*（その`version`）の一部であり、それは`Cache::Descriptor::PluginEntry`キーがすでに捕捉しています;`config_defaults`は`Manifest#to_h`/`#==`/`#hash`に参加しますが、キャッシュキーには決して参加しません。

### `Rigor::Plugin::TypeNodeResolver`（ADR-13）

RBS::Extendedの`%a{rigor:v1:…}`ペイロードに現れるカスタムな**名前的／ジェネリック型語彙**——RBS文法に組み込みのないTypeScriptユーティリティスタイルの型関数（`Pick[T, K]`・`Omit[T, K]`）をプラグインがRigorに教えられるようにするサーフェス——の、プラグイン提供のリゾルバのための基底クラスです。リゾルバはマニフェストの`type_node_resolvers:`スロット（インスタンスの`Array`）を通じて登録されます。

サブクラスは1つのメソッドをオーバーライドします:

```
#resolve(node, scope) -> Rigor::Type::Base | nil
```

- `node`はパーサが放出した`Rigor::TypeNode::Identifier`または`Rigor::TypeNode::Generic`——チェーンが尋ねている名前的型またはジェネリック型のヘッドです。
- `scope`は、RBS::Extendedディレクティブパーサが下へ通す、付随する`Rigor::TypeNode::NameScope`（リゾルバチェーン・クラスコンテキスト・型エイリアステーブルを担う）です。
- メソッドは、ノードがこのリゾルバがカバーする語彙に一致するとき`Rigor::Type::Base`を返さなければならず（MUST）、または次のリゾルバ（最終的には組み込み／RBSフォールバック）へ**フォールスルーするために`nil`**を返します。基底実装は`nil`を返すので、未実装のサブクラスは安全なno-opです。

エンジンは、ロードされたすべてのプラグインのリゾルバを——**プラグイン登録順**（`Registry#type_node_resolvers`がプラグインにわたってflat-mapする）で——単一の`Rigor::TypeNode::ResolverChain`へ集約し、それは順番にそれらを参照して**最初の非`nil`**の答えを返します。チェーンは`Analysis::Runner.run`ごとに一度構成されます;どのプラグインもリゾルバを貢献しないとき、エンジンはショートサーキットする（`NameScope`は構築されません）ので、パーサはリゾルバなしのデフォルトとビット単位で同じように振る舞います。リゾルバはステートレスで再入可能であるべきです（SHOULD）——チェーンは同じノードに対してリゾルバを複数回参照してもよい（MAY）です。実装済みのコンシューマーは`rigor-typescript-utility-types`（`Pick` / `Omit`）です。

### `Rigor::Plugin::Services`

すべてのプラグインの`#initialize`・`#init`・`#prepare`に渡される凍結DIコンテナ：

| サービス | 型 |
| --- | --- |
| `reflection` | `Rigor::Reflection`（モジュール）。 |
| `type` | `Rigor::Type::Combinator`（モジュール）。 |
| `configuration` | `Rigor::Configuration`（読み取り専用のプロジェクトconfig）。 |
| `cache_store` | `Rigor::Cache::Store`または`nil`（スライス6がこれを通じてプラグイン側キャッシュプロデューサーを接続する）。 |
| `trust_policy` | `Rigor::Plugin::TrustPolicy`（スライス2;[`plugin-trust.md`](plugin-trust/)を参照）。 |
| `fact_store` | `Rigor::Plugin::FactStore`（ADR-9 / v0.1.1）— 実行ごとのクロスプラグインファクトストア;`#prepare`が公開し、`#diagnostics_for_file` / `dynamic_return`ブロックが読む。 |

診断フォーマッタがプログレスチャンネルを持つようになったとき、ロガーサービスがこのリストに追加されます。

### `Rigor::Plugin::Registry`

単一の`Analysis::Runner.run`のためにロードされたプラグインの読み取り専用スナップショット。`Rigor::Plugin::Loader.load`によって返され、`Analysis::Runner#plugin_registry`として公開されます。

| メソッド | 返り値 |
| --- | --- |
| `#plugins` | 決定論的な順序でロードされた`Rigor::Plugin::Base`インスタンス。 |
| `#ids` | `#plugins`と並行したマニフェストidの`Array<String>`。 |
| `#find(id)` | idによるルックアップ；存在しない場合は`nil`。 |
| `#load_errors` | ロード中に収集された`Array<Rigor::Plugin::LoadError>`。 |
| `#empty?` / `#any_load_errors?` | 述語。 |

`Registry::EMPTY`はプラグインがロードされる前にランナーが使用するシングルトンの凍結空レジストリです。

### `Rigor::Plugin::LoadError`

プラグインエントリーが解決できない場合にローダー内で発生するパブリック例外。`plugin_ref`（問題のあるgem名またはプラグインid）・`cause_class`（該当する場合の基底例外クラス）・`resolved_path`（プラグインgemがロードされたファイル。`require`は成功したが後続の設定／インスタンス化ステップが失敗したときにローダーが刻む；まったく失敗した`require`ではnil）を持ちます。ランナーはそれぞれを`source_family: :plugin_loader`・`rule: "load-error"`を持つ`Rigor::Analysis::Diagnostic`に変換します。

## 内部サーフェス（パブリックではない）

- `Rigor::Plugin::Loader` — ローダーは内部インフラです。プラグイン作成者はそのプライベートヘルパーをサブクラス化したり依存したりすべきではありません；パブリックエントリーポイントは`Loader.load(configuration:, services:, requirer:, feature_resolver:)`です（後者の2つは素の`require`とバンドルされたフィーチャーリゾルバにデフォルトします;スペックは独自のものを渡します）。

## `.rigor.yml`のプラグインエントリー

設定の`plugins:`フィールドは短縮形と明示形の両方を受け入れます：

```yaml
plugins:
  - rigor-rails                         # bare gem name
  - gem: rigor-rspec
    id: rspec                           # only required when the gem registers > 1 plugin
    config:
      include_specs: true
  - gem: rigor-rbs-inline
    enabled: false                      # opts the entry out entirely (ADR-93 WD3)
```

`Configuration`はすべてのエントリーをその2つの形式のどちらかに正規化し、`Configuration#plugins`を通じて公開します。第4のキー`enabled:`はデフォルトで`true`です;明示的な`false`のみが無効化します——ローダーはgemをrequireせずにそのエントリーをスキップします。これは自動配線される`rigor-rbs-inline`デフォルトに対するプロジェクトレベルのオプトアウトですが、どのエントリーに対しても機能します。

## ロード順序

ローダーはユーザーが記述した順序で`.rigor.yml`の`plugins:`エントリーを処理します。複数の登録済みプラグインクラスに解決されるエントリー（1つのgemが1つ以上のプラグインを登録している場合）の場合、明示的な`id:`フィールドが曖昧さを解消します；なければローダーは推測するのではなく`LoadError`を発行します。エントリー間での重複するidはエラーであり、サイレントな重複排除ではありません。

## 同梱プラグインの解決（[ADR-93](../../adr/93-default-rbs-inline-ingestion/) WD5）

`gem`がエンジン自身の同梱するプラグインを指すエントリー——`<engine root>/plugins/<gem>/lib/<gem>.rb`が存在し、エンジンルートはローダー自身の位置からアンカーされる——は、gem名ではなく**その絶対パスで**`require`されます。エンジンとその同梱プラグインは一緒にバージョン管理されるため、たまたま勝ったインストールの`require_paths`に対する名前解決は定義上スキューを起こしやすいのです: 古いインストール済みの`rigortype` gemがさもなければエンジン自身のコピーをサイレントに置き換えかねません（[#194][i194]のハザード）。アンカーは代わりにエンジン自身のベンダー済みファイルをロードします。アンカーされたファイルが存在**しない**とき——切り詰めたパッケージング、[ADR-27](../../adr/27-tool-distribution-model/)の単一バイナリターゲット——には、ローダーは素のgem名の`require`にフォールバックするので、どのインストールモードもリグレッションしません。この規則は自動配線される`rigor-rbs-inline`デフォルトとすべてのユーザー列挙エントリーで一様です。gem解決へ戻る名前レベルの脱出弁はありません；外部のコピーはサイレントな名前レースではなく、エントリーごとの明示的な`path:`キー（[ADR-99](../../adr/99-config-schema-authority/)）を得ることになります。`rigor doctor`は、依然としてエンジンツリーの外で解決された同梱プラグインをフラグします——フォールバックパスと、アンカーが見られない真に混在したインストールのためのガードです。

[i194]: https://github.com/rigortype/rigor/issues/194

## 障害の隔離（ADR-2 §「プラグイントラストとI/Oポリシー」に従う）

ロードはすべてのプラグインエントリーを独立して処理します；1つのエントリーの失敗は他のエントリーを中断しません。各失敗は結果レジストリの`LoadError`として収集され、次に`Analysis::Runner#run`が以下を持つ`:error`の`Diagnostic`として表面化します：

- `path`: `".rigor.yml"`
- `line`: `1`
- `column`: `1`
- `source_family`: `:plugin_loader`
- `rule`: `"load-error"`
- `message`: `LoadError`のメッセージ（失敗の種類に応じてgemパス/登録/configスキーマ/`#init`例外）。`require`は成功したが後続のステップが失敗したときは末尾に` (loaded from <path>)`が付く——設定/初期化の失敗はロード元となった正確なプラグインのコピーを名指しします；まったく失敗した`require`にはresolved pathがなく、メッセージは変わりません。

`rigor check`は解析を続行します；正常にロードされたプラグインは実行の残りに引き続き参加します。

## 並行性と値オブジェクトの共有可能性（ADR-15）

Rigorは並列ワーカーをまたいでファイルを解析します。出荷されているバックエンドは**forkされた永続ワーカー**プール（[ADR-15](../../adr/15-ractor-concurrency/)の修正;Ractorプールは延期されたターゲット）ですが、契約はそのターゲットが到達可能なままになるよう、より厳格なRactor境界に対して書かれています。したがってプラグインコードへの永続的な要求は次のとおりです:

- **マニフェストが担うすべての値オブジェクトは、構築時に深く凍結され、`Ractor.shareable?`でなければなりません（MUST）**。これは`Manifest`自体と、それが保持するすべてのネストされたキャリア（carrier）——`Macro::*`基板ティア（[`macro-substrate.md`](../macro-substrate/)）・`ProtocolContract`・`AdditionalInitializer`・`Consumption`、および作成者が提供するいかなる`TypeNodeResolver` / `source_rbs_synthesizer`呼び出し可能オブジェクト（作成者は呼び出し可能オブジェクトが捕捉した状態のスレッドセーフティを所有する）——をカバーします。本仕様全体にわたるクラスごとの「`#initialize`後に`Ractor.shareable?`がtrueを返す」という注記は、この単一のルールのインスタンスであり、別個の保証ではありません。
- **プラグインの*インスタンス*はワーカーごとに構築され、決して共有されません**。境界を越えるのは`Rigor::Plugin::Blueprint`キャリア（凍結済み、`Ractor.shareable?`）です: それはプラグインクラスの**定数パスString**（クラスオブジェクトではない——gemはいずれのワーカーがスポーンする前にメインRactor上で`require`されるので、各ワーカーは`Object.const_get`経由で同じ定数を解決する）に加えて、深くコピーされ共有可能にされた`config` Hashを保持します。各ワーカーは起動時に一度`Blueprint#materialize(services:)`を呼び——`const_get` → `klass.new(services:, config:)` → `#init(services)`で、`Loader#instantiate`を写し取る——、それからワーカーの生存期間にわたって自身のプラグインインスタンスとそれらの可変な実行ごとのアキュムレータを所有します。各`WorkerSession`はその後、構築時に、最初の`#analyze`の前に、自身の具体化されたインスタンスに対して`#prepare(services)`を実行するので、`#prepare`は実行ごとに一度ではなく、**プラグインインスタンスごと**（コーディネーターと各ワーカー）に一度呼ばれ、各ワーカーの`fact_store`は境界を越えて出荷されるのではなく再構築されます。したがって可変なプラグイン状態が境界を越えることは決してなく、凍結されたBlueprintだけが越えます。
- **文書化された例外:** `Environment::Reflection`（パブリックな`Rigor::Reflection`ファサードを支える内部の読み取り側キャリア）は凍結されていますが`Ractor.shareable?`では**ありません**——その背後のテーブルが共有可能でない`RBS::Location`オブジェクトを通すためです（[ADR-15](../../adr/15-ractor-concurrency/) WD6）。その結果、境界をまたいで共有されるのではなく、共有された`Cache::Store`からワーカーごとに再構築されます。これはエンジン内部のキャリアであり、プラグインサーフェスではありません（[`public-api.md`](../public-api/)を参照）。

## 各機能が着地した場所（歴史的スライスマップ）

v0.1.0のプラグイン契約は6つのスライスで出荷されました;以下はすべていまや整っており、それぞれ独自の仕様で文書化されています:

- **プラグイン貢献の発行**（`FlowContribution`バンドル、ケイパビリティ（capability）ロール、動的返却）。スタンドアロンの{Rigor::FlowContribution::Merger}（[`flow-contribution-merger.md`](../flow-contribution-merger/)）はスライス3で出荷;戻り値貢献ティアはスライス4で出荷され（当初は`#flow_contribution_for`、後にADR-37で`dynamic_return` / `narrowing_facts`へ分割され、その後`flow_contribution_for`はADR-52 WD3で除去）、v0.1.1のクロスプラグイン作業（ADR-9）で拡張されました。
- **プラグイン診断来歴**。スライス5はプラグインが発行した診断を`plugin.<id>.<rule>`プレフィックスを持つ`Diagnostic#source_family`を通じてルーティングします。
- **プラグイントラスト/I/Oポリシー執行**。スライス2は宣言的な{Rigor::Plugin::TrustPolicy} + {Rigor::Plugin::IoBoundary}サーフェスを出荷しました；[`plugin-trust.md`](../plugin-trust/)を参照。
- **プラグイン側キャッシュプロデューサー**。スライス6は`PluginEntry`ディスクリプタを通じてプラグインに`Store#fetch_or_validate`（ADR-60 WD3のレコードアンドバリデート）を接続します；[`plugin-cache-producers.md`](../plugin-cache-producers/)を参照。
- **クロスプラグインファクト + 事前パス**。`#prepare(services)` + `services.fact_store` + `manifest(produces:/consumes:)`がv0.1.1で出荷されました（ADR-9）。上記の`Manifest`テーブルの拡張フィールド（`signature_paths:`、`open_receivers:`、`protocol_contracts:`、`source_rbs_synthesizer:`、マクロ基板、HKT、`additional_initializers:`）は`0.1.x`サイクルを通じて堆積しました。
- **インターフェース分離**（[ADR-37](../../adr/37-plugin-interface-segregation/)、Accepted）。
  - *スライス1 / 1c / 1d* — `node_rule`クラスDSL + `#node_rule_diagnostics`（エンジン所有のウォーク） + `node_file_context`（2パスサポート） + `NodeContext`（レキシカル祖先） + `#diagnostic` / `Diagnostic.from_node` / `.from_location`作成者ヘルパー。これらは`#diagnostics_for_file`をファイル全体の脱出弁として再定義します;**同梱の診断発行プラグインはすべて`node_rule`へ移行されました**——`rigor-actionpack`（4フェーズ、名前空間修飾に敏感）が最後でした。
  - *スライス2* — `#flow_contribution_for`の、レシーバーゲートの`dynamic_return` + メソッドゲートの`narrowing_facts` DSL（上記で文書化）への分割;きれいに収まるコンシューマーは移行され、残りのコンシューマーは脱出弁に留まりました。**その後`flow_contribution_for`はADR-52 WD3（2026-06-11）で削除されました** ── 5つの脱出弁コンシューマーはすべて削除前に完全に移行されました。
  - *スライス3* — `FactProvider`命名 + 機械可読な`rigor plugins --capabilities`カタログ（プラグインごと: node_ruleノード型、dynamic_returnレシーバー、narrowing_factsメソッド、生成／消費ファクト）。
- **書き込み前読み込みnilゲート**。`additional_initializers:`（[ADR-38](../../adr/38-additional-initializers/)）は、プラグインが`ScopeIndexer`の`initialize`のみのivarシードゲートをフレームワークのライフサイクルメソッド（`setup`・`after_initialize`・DIセッター）へ拡張できるようにし、そこで設定され兄弟メソッドで読まれるivarが`nil`で拡幅されないようにします。
- **ターゲットライブラリの呼び出し**（[ADR-39](../../adr/39-plugin-target-library-invocation/)、Accepted）。プラグインは、信頼されたターゲットライブラリの純粋で許可リストに載ったメソッドを直接呼び出せます（実際の`ActiveSupport::Inflector`の上の`Plugin::Inflector`;Railsファミリー + factorybotのコンシューマーは手書きの語形変化から移行）。これは選択可能な分離戦略（`Plugin::Isolation`: `process`デフォルト / `none` / `ruby_box`;上記で文書化）のもとで行われます。ボイラープレート計画の作成者ヘルパー`Base.suggest`（§0c）とインフレクターが、残りの手書き重複項目をクローズします。
