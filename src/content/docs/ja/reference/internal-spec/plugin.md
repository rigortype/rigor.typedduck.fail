---
title: "Plugin Registration / Loading (slice 1)"
description: "Imported from rigortype/rigor docs/internal-spec/plugin.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/plugin.md"
sourcePath: "docs/internal-spec/plugin.md"
sourceSha: "77ca7bd238cae718ee68b6660fec7fab98fc433ae0728c59e408817eca01c3db"
sourceCommit: "d5d6614800bfc53f00e23b51f4c914d0e42f237f"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス：**v0.1.0スライス（slice）1規範的**。プラグイン作成者がプラグインの**登録**・**マニフェスト宣言**・`Analysis::Runner`による**ロード**に関して使用するパブリックサーフェス（surface）を固定します。貢献プロトコル（動的返却・型指定・動的リフレクション）は後続のv0.1.0スライスで追加されるため、ここでは定義しません。

拘束力のある設計サーフェスは[ADR-2](../../adr/2-extension-api/)です；v0.1.0の準備状況マップは[`docs/design/20260505-v0.1.0-readiness.md`](../../design/20260505-v0.1.0-readiness/)にあります。この仕様がADR-2と矛盾する場合、ADRが優先されます。

## パブリックネームスペース（ドリフト固定済み）

以下のすべてのネームスペースは[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)によってロックされています。シグネチャの変更は同じコミットで対応する`PublicApiDriftSnapshots::*`定数を更新します。

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
    protocols: [],
    config_schema: { "flag" => :boolean }
  )

  def init(services)
    @reflection = services.reflection
  end
end
```

クラスレベルの`manifest(**fields)`はクラス定義時に一度マニフェストを宣言します；引数なしで呼び出すと、キャッシュされた`Manifest`を返します。インスタンスレベルの`manifest`はクラスに委譲します。

`#initialize(services:, config: {})`は注入されたサービスとユーザーのconfigの凍結コピーを格納します。`#init(services)`はプラグインがサービスコンテナから状態を接続するために使用するオーバーライドフックで、デフォルト実装はno-opです。

`#diagnostics_for_file(path:, scope:, root:)`（スライス5）は**ファイル全体**の診断フックです。デフォルトは空の配列を返します。プラグイン作成者はこれをオーバーライドして`root`（解析された`Prism::Node`）を自分で走査し、`Rigor::Analysis::Diagnostic`行の配列を返してもよい（MAY）ですが、ノードスコープのチェックに推奨されるサーフェスは`node_rule`（下記）であり、これはエンジンに走査を所有させます。`#diagnostics_for_file`は真にファイルスコープな診断——単一のロードエラー行、または解析済みファイル全体を一度に必要とするチェック——のために予約されています。ランナーはADR-7 §「スライス5-B」に従って返されたすべての診断を`source_family: "plugin.<manifest.id>"`で再スタンプするため、プラグイン作成者が誤って別のプラグインのidで公開することはありません。フック内のプラグイン例外は`rigor check`をクラッシュさせるのではなく、`:plugin_loader`の`runtime-error`診断として隔離されます。

#### ノードスコープのルール — `node_rule` / `#node_rule_diagnostics`（ADR-37）

`node_rule(node_type) { |node, scope, path, file_context, context| … }`は、ノードスコープの診断ルールを宣言するクラスレベルのDSL（`producer`スタイルの形状）です。エンジンは解析される各ファイルのASTを**一度**走査し、`node.is_a?(node_type)`となるすべてのノードをそのルールへディスパッチします。そのためプラグイン作成者はチェックを書き、走査は決して書きません——これがプラグインから手書きの`def walk` / `compact_child_nodes.each`の再帰を取り除けるようにするものです。ブロックは`instance_exec`を通して実行され（そのため`self`はプラグインインスタンス——`config`・`services`・`services.fact_store`・`diagnostic`がすべてスコープ内）、`(node, scope, path, file_context, context)`を受け取り、`Array<Rigor::Analysis::Diagnostic>`を返します（何も発火させない場合は空）。`node_type`は`Prism::Node`サブクラスでなければなりません（MUST）。型ごとの複数のルールは宣言順に実行されます。エンジンはそれらをインスタンスメソッド`#node_rule_diagnostics(path:, scope:, root:)`を通して呼び出し、ランナーは同じ`plugin.<id>`スタンプとプラグインごとの例外隔離のもとで`#diagnostics_for_file`と並んでそれを呼びます;ルールを宣言しないプラグインはゼロコストです。

**5番目**のブロック引数`context`（ADR-37スライス1d）は、ノードのレキシカルな祖先チェーンを担う`Rigor::Plugin::NodeContext`です——ADR-2が約束した`ContextInfo`です。これは`#ancestors`（完全なチェーン、最も外側が先、ノード自体を除く）に加えて、便利メソッド`#enclosing_def`・`#enclosing_module`・`#enclosing_block(name)`を公開します。ルールは、チェックがノードの*位置*に依存するときにそれを読みます: `before_action` / `render`が属する内包コントローラー（`rigor-actionpack`は名前空間修飾されたコントローラー名を`context.ancestors`から再導出する）、マッチャーが配置される`describe <Model>`（`rigor-shoulda-matchers`）、または遅延`t('.key')`が展開されるアクション（`rigor-rails-i18n`）など。より少ないパラメータを取るブロックは、末尾の引数を単に無視します（後方互換）。

`node_file_context { |root, scope| … }`は2パス（収集してから検証する）プラグインをサポートします。これはいずれのノードルールが発火する前に、ファイルごとに一度（`instance_exec`経由で）実行され、その戻り値は**4番目**のブロック引数としてすべてのルールへ渡されます（既存の3パラメータのブロックはそれを無視します）。*同一ファイル*の収集——参照を検証する前に宣言された名前を集める——はここに属します。なぜなら、エンジンの単一の前方走査は、参照に到達する前に収集を完了できないからです。*クロスファイル*の収集は代わりに`#prepare` + `services.fact_store`に属します;ノードルールは公開されたファクトを直接読み、ファイルごとのコンテキストを必要としません。

#### 診断の位置決め — `#diagnostic`（ADR-37作成者ヘルパー）

`#diagnostic(node, path:, message:, severity: :error, rule: nil, location: nil)`は、`node`に位置づけられた`Rigor::Analysis::Diagnostic`を構築し、他のすべてのプラグインが手作業で再導出する1始まりの`line` / `start_column + 1`の慣習を内部に取り込みます。サブロケーションを指すには`location:`（Prismのロケーション）——典型的には`node.message_loc`——を渡します。そうすればマッチャー／メソッド名の診断は、レシーバーにまたがる呼び出し全体ではなく、その名前を指します;`nil`の`location:`は`node.location`にフォールバックします。作成者は`source_family`を設定してはなりません（MUST NOT）（ランナーがスタンプします）。基礎となるコンストラクタ`Rigor::Analysis::Diagnostic.from_node(node, …)`と`.from_location(location, …)`は、コアルールやその他のプロデューサーのためにパブリックです。

`Rigor::Plugin::Base.suggest(name, candidates)`（ボイラープレート削減計画 §0c）は、共有の「もしかして…?」ヘルパーです: `DidYouMean::SpellChecker`（エンジンのRuby自身の`NoMethodError`ヒントが使うもの）経由で`candidates`のうち`name`に最も近いものを返すか、`nil`を返します。これは**クラス**メソッドなので、プラグインインスタンスからも`Analyzer`モジュール関数からも呼び出せ、プラグインがかつて持っていた手書きのLevenshteinのコピーを置き換えます。これは既に発行された診断の提案*テキスト*にのみ影響し、診断が発火するかどうかには決して影響しません。

`#prepare(services)`（ADR-9）はプロジェクト全体の事前パスフックで、ファイルごとの解析が始まる前に一度呼ばれます。クロスプラグインファクト（`manifest(produces:)`）を公開するプラグインはこれをオーバーライドしてプロジェクトを走査し、`services.fact_store.publish(...)`を呼びます;ローダーのトポロジカル順序付けが、プロデューサーの`prepare`がいずれのコンシューマーのものよりも先に実行されることを保証します。デフォルトはno-opです。

#### 戻り型とナローイングの貢献 — `dynamic_return` / `type_specifier`（ADR-37スライス2）

`flow_contribution_for`はちょうど2つのエンジンサイトで参照され、それぞれが返されたバンドルのちょうど1スロットを読んでいました: `MethodDispatcher`は`.return_type`（呼び出しサイトごとの戻り型）を読み、`StatementEvaluator`は`.post_return_facts`（アサーションエッジのナローイング）を読みます。ADR-37スライス2は、これら2つの消費サイトを2つの狭く宣言的にゲートされるクラスDSL——`producer`スタイルの形状なので、ブロックはロジックを担い`instance_exec`を通して実行されます——へ分割します:

- `dynamic_return(receivers:) { |call_node, scope| Type | nil }` — レシーバーのクラスでゲートされた、呼び出しサイトごとの**戻り型**。エンジンは、呼び出しのレシーバー型のクラスが宣言された`receivers:`エントリと等しいか、それを継承する場合にのみブロックを呼びます（`Environment#class_ordering`経由でマッチ）;最初の非`nil`が勝ちます。エンジンはそれを`#dynamic_return_type(call_node:, scope:, receiver_type:)`を通して呼び出します。`rigor-mangrove`（アンラップ → 担われた`type_args[0]`）が実装済みのコンシューマーです。
- `type_specifier(methods:) { |call_node, scope| facts | nil }` — `call_node.name`が宣言された`methods:`に含まれることでゲートされた、**戻り値後のナローイングファクト**。エンジンはそれを`#type_specifier_facts(call_node:, scope:)`を通して呼び出します。`rigor-minitest`（アサーションナローイング）と`rigor-rspec`のマッチャーナローイングが実装済みのコンシューマーです。

`receivers:` / `methods:`は、`rigor plugins --capabilities`カタログ（ADR-37 §「機械可読なケイパビリティカタログ」）が列挙する、grep可能でインデックス可能なゲートです。

`#flow_contribution_for(call_node:, scope:)`（ADR-9 / ADR-2）は、元の太い戻り型貢献フックで、狭いDSLと**並んで**同じ2サイトで参照されます。認識された呼び出しエッジに対して`Rigor::FlowContribution`（精密な`return_type`および／またはナローイングファクトを担う）を返すか、辞退する場合は`nil`を返します（デフォルト）。これは**非推奨の脱出弁**であり、狭いDSLが意図的に表現しない2つの貢献形状——メソッドゲートの戻り型（`rigor-rspec`の`let` / `subject`バインディング;`rigor-sorbet`のsig駆動の戻り値）と動的なプロジェクトごとのレシーバー集合（発見されたモデルクラス上の`rigor-activestorage`の`Attached::One` / `::Many`）——のために残されています。新しいプラグインは`dynamic_return` / `type_specifier`を優先すべきです;`flow_contribution_for`は文書化された最後の手段です（PHPStanの`ExpressionTypeResolverExtension`が果たす役割）。

### ターゲットライブラリの呼び出し — `Plugin::Inflector` / `Plugin::Isolation` / `Plugin::Box`（ADR-39）

[ADR-39](../../adr/39-plugin-target-library-invocation/)は、プラグインがターゲットとするライブラリの**純粋で許可リストに載ったメソッドを直接呼び出す**ことを許します（PHPStan拡張が実際のフレームワークを呼び出すことのRuby版）——それらを再実装するのではなく。ライブラリの実際の振る舞いから逸脱する再実装は誤ったファクト、すなわち偽陽性です。このルールは、エンジンの定数畳み込み層が使うのと同じハーネスによって境界づけられます: 明示的な純粋メソッドの許可リスト、Rigor由来の入力、チェックされたデータ結果、そしてライブラリが到達不能なときの**辞退（決して近似しない）**。これはADR-2の、解析対象の*アプリケーション*自身のコードを実行することの禁止を**緩めるものではありません**——ターゲットライブラリは信頼された宣言済みの依存であり、プロジェクトのソースとは区別されます。

- `Rigor::Plugin::Inflector` — 実装済みのコンシューマー + Railsファミリープラグインのための共有の語形変化ヘルパー。`underscore` / `camelize` / `singularize` / `pluralize` / `classify` / `tableize`は実際の`ActiveSupport::Inflector`に委譲します;これは**近似を一切持ちません**（gemが到達不能なときは例外を投げるので、呼び出し側は黙らせるために辞退します）。`rigor-rails-routes` / `rigor-activerecord` / `rigor-actionpack` / `rigor-actionmailer` / `rigor-factorybot`がこれを使います。
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
| `protocols` | `Array<Symbol>` | このプラグインが実装するプロトコル名。 |
| `config_schema` | `{ String => Symbol }` | 受け入れられるconfigキーと値の種類（`:string`・`:boolean`・`:integer`・`:array`・`:hash`・`:any`）のマッピング。 |

以下の**拡張フィールド**は`0.1.x`サイクルを通じて追加されました。すべてオプションで、1.0前のプラグイン契約に対して追加的です;これらを1つも宣言しないプラグインはただのファイルごとのアナライザーです:

| フィールド | 型 | 目的 |
| --- | --- | --- |
| `produces` | `Array<Symbol>` | このプラグインが公開するクロスプラグインファクト（ADR-9）。 |
| `consumes` | `Array<Consumption>` | このプラグインが読むクロスプラグインファクト（`{ plugin_id:, name:, optional: }`）;ローダーのトポロジカル順序付けを駆動する（ADR-9）。 |
| `signature_paths` | `Array<String>` | プラグインが貢献するRBSシグネチャディレクトリ、プラグインgemルートからの相対;`Loader`が解決し環境にマージする（ADR-25）。 |
| `owns_receivers` | `Array<String>` | ディスパッチルーティングのためにこのプラグインが所有するレシーバークラス名。 |
| `open_receivers` | `Array<String>` | `call.undefined-method`から免除されるレシーバークラス名（そのメソッド表面が無制限 — 例: `ActiveRecord::Relation`）（ADR-26）。 |
| `type_node_resolvers` | `Array` | カスタムなRBS型名解決を貢献する`Plugin::TypeNodeResolver`エントリー（ADR-13）。 |
| `protocol_contracts` | `Array<ProtocolContract>` | パススコープの振る舞い契約（`path_glob` + `method_name` + param/return型 + 重大度）;provide-and-check（ADR-28）。 |
| `source_rbs_synthesizer` | `#call(path) -> String?` | env構築時にプロジェクトソースファイルからRBSを合成する呼び出し可能オブジェクト（例: rbs-inline取り込み）（ADR-32）。 |
| `block_as_methods`, `heredoc_templates`, `trait_registries`, `external_files` | `Array` | ADR-16のマクロ / DSL展開基板の4つのティア（A / C / B / D）。 |
| `nested_class_templates` | `Array` | enum形状のブロックDSL（`variant <Const>, <Type>`）からのネストされたサブクラス放出;メソッドだけでなくクラスを生み出すマクロ基板ティア（ADR-36）。 |
| `hkt_registrations`, `hkt_definitions` | `Array` | 軽量HKTの型関数登録（ADR-20）。 |
| `additional_initializers` | `Array<AdditionalInitializer>` | クラス（およびそのサブクラス）上のどの`initialize`以外の`def`形式メソッドがivar状態も確立するかを宣言する`{ receiver_constraint:, methods: }`ペアで、`ScopeIndexer`の書き込み前読み込みnil健全性ゲートに供給する（ADR-38）。 |

`#validate_config(config)`はエラー文字列の配列を返します；ローダーは空でない結果を`LoadError`に変換します。各拡張フィールドは`Manifest#initialize`で独自のバリデーションを持ちます。

### `Rigor::Plugin::Services`

すべてのプラグインの`#initialize`・`#init`・`#prepare`に渡される凍結DIコンテナ：

| サービス | 型 |
| --- | --- |
| `reflection` | `Rigor::Reflection`（モジュール）。 |
| `type` | `Rigor::Type::Combinator`（モジュール）。 |
| `configuration` | `Rigor::Configuration`（読み取り専用のプロジェクトconfig）。 |
| `cache_store` | `Rigor::Cache::Store`または`nil`（スライス6がこれを通じてプラグイン側キャッシュプロデューサーを接続する）。 |
| `trust_policy` | `Rigor::Plugin::TrustPolicy`（スライス2;[`plugin-trust.md`](plugin-trust/)を参照）。 |
| `fact_store` | `Rigor::Plugin::FactStore`（ADR-9 / v0.1.1）— 実行ごとのクロスプラグインファクトストア;`#prepare`が公開し、`#diagnostics_for_file` / `#flow_contribution_for`が読む。 |

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

プラグインエントリーが解決できない場合にローダー内で発生するパブリック例外。`plugin_ref`（問題のあるgem名またはプラグインid）と`cause_class`（該当する場合の基底例外クラス）を持ちます。ランナーはそれぞれを`source_family: :plugin_loader`・`rule: "load-error"`を持つ`Rigor::Analysis::Diagnostic`に変換します。

## 内部サーフェス（パブリックではない）

- `Rigor::Plugin::Loader` — ローダーは内部インフラです。プラグイン作成者はそのプライベートヘルパーをサブクラス化したり依存したりすべきではありません；パブリックエントリーポイントは`Loader.load(configuration:, services:, requirer:)`です。

## `.rigor.yml`のプラグインエントリー

設定の`plugins:`フィールドは短縮形と明示形の両方を受け入れます：

```yaml
plugins:
  - rigor-rails                         # bare gem name
  - gem: rigor-rspec
    id: rspec                           # only required when the gem registers > 1 plugin
    config:
      include_specs: true
```

`Configuration`はすべてのエントリーをその2つの形式のどちらかに正規化し、`Configuration#plugins`を通じて公開します。

## ロード順序

ローダーはユーザーが記述した順序で`.rigor.yml`の`plugins:`エントリーを処理します。複数の登録済みプラグインクラスに解決されるエントリー（1つのgemが1つ以上のプラグインを登録している場合）の場合、明示的な`id:`フィールドが曖昧さを解消します；なければローダーは推測するのではなく`LoadError`を発行します。エントリー間での重複するidはエラーであり、サイレントな重複排除ではありません。

## 障害の隔離（ADR-2 §「プラグイントラストとI/Oポリシー」に従う）

ロードはすべてのプラグインエントリーを独立して処理します；1つのエントリーの失敗は他のエントリーを中断しません。各失敗は結果レジストリの`LoadError`として収集され、次に`Analysis::Runner#run`が以下を持つ`:error`の`Diagnostic`として表面化します：

- `path`: `".rigor.yml"`
- `line`: `1`
- `column`: `1`
- `source_family`: `:plugin_loader`
- `rule`: `"load-error"`
- `message`: `LoadError`のメッセージ（失敗の種類に応じてgemパス/登録/configスキーマ/`#init`例外）。

`rigor check`は解析を続行します；正常にロードされたプラグインは後のv0.1.0スライスに引き続き参加します。

## 各機能が着地した場所（歴史的スライスマップ）

v0.1.0のプラグイン契約は6つのスライスで出荷されました;以下はすべていまや整っており、それぞれ独自の仕様で文書化されています:

- **プラグイン貢献の発行**（`FlowContribution`バンドル、ケイパビリティ（capability）ロール、動的返却）。スタンドアロンの{Rigor::FlowContribution::Merger}（[`flow-contribution-merger.md`](../flow-contribution-merger/)）はスライス3で出荷;`Rigor::Plugin::Base`上の`#flow_contribution_for`（戻り値貢献ティア）はスライス4で出荷され、v0.1.1のクロスプラグイン作業（ADR-9）で拡張されました。
- **プラグイン診断来歴**。スライス5はプラグインが発行した診断を`plugin.<id>.<rule>`プレフィックスを持つ`Diagnostic#source_family`を通じてルーティングします。
- **プラグイントラスト/I/Oポリシー執行**。スライス2は宣言的な{Rigor::Plugin::TrustPolicy} + {Rigor::Plugin::IoBoundary}サーフェスを出荷しました；[`plugin-trust.md`](../plugin-trust/)を参照。
- **プラグイン側キャッシュプロデューサー**。スライス6は`PluginEntry`ディスクリプタを通じてプラグインに`Store#fetch_or_compute`を接続します；[`plugin-cache-producers.md`](../plugin-cache-producers/)を参照。
- **クロスプラグインファクト + 事前パス**。`#prepare(services)` + `services.fact_store` + `manifest(produces:/consumes:)`がv0.1.1で出荷されました（ADR-9）。上記の`Manifest`テーブルの拡張フィールド（`signature_paths:`、`open_receivers:`、`protocol_contracts:`、`source_rbs_synthesizer:`、マクロ基板、HKT、`additional_initializers:`）は`0.1.x`サイクルを通じて堆積しました。
- **インターフェース分離**（[ADR-37](../../adr/37-plugin-interface-segregation/)、Accepted）。
  - *スライス1 / 1c / 1d* — `node_rule`クラスDSL + `#node_rule_diagnostics`（エンジン所有のウォーク） + `node_file_context`（2パスサポート） + `NodeContext`（レキシカル祖先） + `#diagnostic` / `Diagnostic.from_node` / `.from_location`作成者ヘルパー。これらは`#diagnostics_for_file`をファイル全体の脱出弁として再定義します;**同梱の診断発行プラグインはすべて`node_rule`へ移行されました**——`rigor-actionpack`（4フェーズ、名前空間修飾に敏感）が最後でした。
  - *スライス2* — `#flow_contribution_for`の、レシーバーゲートの`dynamic_return` + メソッドゲートの`type_specifier` DSL（上記で文書化）への分割で、今や非推奨の太いフックと並んで参照されます;きれいに収まるコンシューマー（mangrove / minitest / rspec-matcher）は移行され、メソッドゲートの戻り値／動的レシーバーのコンシューマーは設計上、脱出弁に留まります。
  - *スライス3* — `FactProvider`命名 + 機械可読な`rigor plugins --capabilities`カタログ（プラグインごと: node_ruleノード型、dynamic_returnレシーバー、type_specifierメソッド、生成／消費ファクト）。
- **書き込み前読み込みnilゲート**。 `additional_initializers:`（[ADR-38](../../adr/38-additional-initializers/)）は、プラグインが`ScopeIndexer`の`initialize`のみのivarシードゲートをフレームワークのライフサイクルメソッド（`setup`・`after_initialize`・DIセッター）へ拡張できるようにし、そこで設定され兄弟メソッドで読まれるivarが`nil`で拡幅されないようにします。
- **ターゲットライブラリの呼び出し**（[ADR-39](../../adr/39-plugin-target-library-invocation/)、Accepted）。プラグインは、信頼されたターゲットライブラリの純粋で許可リストに載ったメソッドを直接呼び出せます（実際の`ActiveSupport::Inflector`の上の`Plugin::Inflector`;Railsファミリー + factorybotのコンシューマーは手書きの語形変化から移行）。これは選択可能な分離戦略（`Plugin::Isolation`: `process`デフォルト / `none` / `ruby_box`;上記で文書化）のもとで行われます。ボイラープレート計画の作成者ヘルパー`Base.suggest`（§0c）とインフレクターが、残りの手書き重複項目をクローズします。
