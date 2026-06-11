---
title: "ADR-37 — Plugin interface segregation (narrow extension protocols)"
description: "Imported from rigortype/rigor docs/adr/37-plugin-interface-segregation.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/37-plugin-interface-segregation.md"
sourcePath: "docs/adr/37-plugin-interface-segregation.md"
sourceSha: "90cf0af7b2f2a46489eb3025a04f38d90a10422c8828028f237bfba3033be9c7"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
sidebar:
  order: 4037
---

Status: **Accepted, 2026-06-02;スライス1〜3実装済み；`flow_contribution_for`は2026-06-11に削除（ADR-52 WD3）**。同梱プラグインセット全体に対して検証済み: 診断を発行するすべてのプラグインが`diagnostics_for_file`ウォーカーから`node_rule`へ移行され（最後にして最も複雑な`rigor-actionpack`——4フェーズ、名前空間修飾に敏感——は`NodeContext`の祖先経由で着地）、`flow_contribution_for`の分割（`dynamic_return`／`type_specifier`）はきれいに収まるコンシューマーを担い、機械可読なケイパビリティカタログ（`rigor plugins --capabilities`）が出荷される。**`flow_contribution_for`はADR-52 WD3（2026-06-11）時点で削除された**——本番ユーザー5つすべてが`dynamic_return`／`type_specifier` DSL（receivers: Array／callable、methods: Array／callable、file_methods: callable）へ移行し、フックは依然として定義されているとロード時に`ArgumentError`を送出するようになった。完全な移行表はCHANGELOGの`### Removed`を参照。`diagnostics_for_file`脱出弁は残る。**延期（非ゲート、需要駆動）:**作成者ヘルパーのボイラープレート削減フォローオン（`Base#suggest`・`config_schema`デフォルト・`Plugin::Inflector`——[ボイラープレート計画](../../design/20260602-plugin-boilerplate-reduction-plan/)フェーズ0c〜0e）。以下に挙げるインターフェースごとのテストハーネス（`NodeRuleTest`／`DynamicReturnTest`）も同様に、プラグイン作成者が必要とするまで延期される;ノードごとのテスト可能性は、移行が確立した`Analyzer.*_violations_for`分割を通じて既に到達可能である。

**スライス1実装済み（2026-06-02）:** `Plugin::Base`上の`node_rule`クラスDSL＋`Base#node_rule_diagnostics`（エンジン所有の走査）＋ランナー／ワーカーセッション配線。プラグインは`node_rule(Prism::CallNode) { |node, scope, path| … }`を宣言します。エンジンは各ファイルのASTを（`Source::NodeWalker`経由で）一度だけ走査し、到達可能なすべてのノードを、その`node_type`を満たすルールへディスパッチし、プラグインインスタンス上で`instance_exec`します。そのため作者は走査を一切手作りしません。これはレガシーな`diagnostics_for_file`（今や概念的には`FileRule`脱出弁）と並んで動作し、ルールを宣言しないプラグインにとってはゼロコストのno-opであり、同じプラグインごとの`rescue`境界で隔離されます。スライス1cは2パス（収集してから検証する）プラグイン向けに`node_file_context`を追加します。スライス1のワーキングデシジョンを以下にピン留めします。スライス1dは`NodeContext`（ノードルールのためのレキシカルコンテキスト）を追加します。**スライス2の設計**（`flow_contribution_for` → `dynamic_return` + `type_specifier`）は以下に記録されており、その**エンジンサーフェスは実装済み**です（2つのDSL + 2つのランナーメソッド + レシーバークラス／メソッド名のゲーティングが、非推奨の`flow_contribution_for`ファンアウトと並んで両ディスパッチサイトで参照される——完全に後方互換で、既存のすべてのコンシューマーは変更なくグリーン）。スライス2bはきれいに収まるすべてのコンシューマーを移行しました（`rigor-mangrove` → `dynamic_return`;`rigor-minitest`と`rigor-rspec`のマッチャーナローイング → `type_specifier`）;残りは正当な理由で非推奨の`flow_contribution_for`脱出弁に留まります（狭いDSLが表現しない2つの貢献形状——`rigor-rspec`の`let`バインディング、`rigor-sorbet`、`rigor-activerecord`、`rigor-activestorage`;スライス2 §「Outcome」を参照）。**スライス3（2026-06-02）:** `FactProvider`命名 + 機械可読なケイパビリティカタログ（`rigor plugins --capabilities`、§「機械可読なケイパビリティカタログ」を参照）が着地し、最後にして最も複雑な`diagnostics_for_file`ウォーカーである`rigor-actionpack`が`node_rule`へ移行されたので、**同梱の診断発行プラグインはすべてレガシーウォーカーから外れました**（14個が`node_rule`上）。**未完了（非ゲート、需要駆動）:** 4つの脱出弁コンシューマーを移行できるようにする延期された`dynamic_return`の一般化、および作成者ヘルパーのボイラープレート削減フォローオン（フェーズ0c〜0e）。

[ADR-2](../2-extension-api/)が着手したインターフェース分離の作業を仕上げる決定を記録します。残る2つの*命令型*プラグインフック（`flow_contribution_for`、`diagnostics_for_file`）を、PHPStanのゲート／ペイロード不変条件に倣って、**狭く・マニフェスト登録され・エンジンがゲートする拡張プロトコル**の小さな集合へと分割します。肥大化した`Plugin::Base`フックは、後方互換性のための非推奨の脱出弁として残します。このADRはADR-2の*フックモデル*を改訂するものであり、ADR-1が所有するフロー貢献のセマンティクスは変更しません。

根拠となるレビュー: [`docs/design/20260601-plugin-mechanism-pre-1.0-review.md`](../../design/20260601-plugin-mechanism-pre-1.0-review/) §6（このADRの動機となったクロスプラグイン監査）。

## Context

Rigorのプラグイン契約（contract）には、2つの拡張スタイルが併存するまでに成長しました。

1. **宣言的なマニフェストフィールド（10個）**。`block_as_methods`、`trait_registries`、`heredoc_templates`、`nested_class_templates`、`type_node_resolvers`、`protocol_contracts`、`hkt_registrations`、`hkt_definitions`、`source_rbs_synthesizer`、`owns_receivers`、`open_receivers`。それぞれが`registry.plugins`から集約され、**エンジン自身がインデックスする**構造（`SyntheticMethodScanner`、`TypeNode::ResolverChain`、`Registry#contracts_for_path`、HKTオーバーレイ、…）になり、**エンジンが**動詞／レシーバー／クラス／パスで**ゲートします**。これはすでにPHPStan型です。エンジンがマッチするノードについてのみ参照する、狭いケイパビリティです。

2. **命令型フック（2個）**。`flow_contribution_for(call_node:, scope:)`と`diagnostics_for_file(path:, scope:, root:)`。エンジンは**すべての**未解決の呼び出しノード／すべてのファイルについて**ロード済みのすべてのプラグイン**を呼び出し、各プラグインは内部の`if`で**自分自身をゲートします**。このディスパッチループは`inference/method_dispatcher.rb`と`inference/statement_evaluator.rb`にそっくりそのまま複製されています（後者のコメントは「Mirrors … exactly（…をそっくり真似ている）」と認めています）。両方の箇所が`rescue StandardError; nil`しているため、ゲートを誤ったプラグインは何のシグナルもなく何も貢献しません。

ファンアウトして自己ゲートするスタイルこそが、設計上最もコストのかかる部分であり、そのコストはプラグインアーキテクチャに対してプロジェクトが掲げる目標 — **AIエージェントにとっての可読性**と**インターフェース単位のテスト容易性** — にちょうど対応します。

- **AI／人間の理解**。`registry.plugins.each { |p| p.flow_contribution_for(...) }`は、*どの*プラグインが参加するのか、*どの*レシーバー／メソッドに関心があるのかについて何も語りません。その選択性は各プラグインの自己ゲートする`if`の内側に存在するため、grepもできず列挙もできません。宣言的なフィールドはその正反対です。マニフェストのフィールド名が、それをどのサブシステムが消費するのかを読者（やツール）にそのまま伝えます。
- **テスト容易性**。今日の唯一のハーネスは`spec/integration/support/plugin_helpers.rb`の`run_plugin`です。デモファイルを書き、**完全な**`Analysis::Runner`を実行し、`result.diagnostics`をアサートします。「このフックはこのノードに対して型Xを返す」「このルールはここで発火する」を単独でアサートする方法はありません。フック名を冠したスペックでさえ、エンジン全体が生成する下流の`call.undefined-method`メッセージをアサートしています。対照的にPHPStanは`RuleTestCase`（フィクスチャに対するエラー集合をアサート）と`TypeInferenceTestCase`（インラインの`assertType()`で推論された型をアサート）を提供します。インターフェース単位のハーネスは、フックが狭くなって初めて可能になります。
- **ボイラープレート**。`diagnostics_for_file`が生の`root`を渡し、ドキュメントが作者に「`root`を自分で走査せよ」と指示している（`plugin/base.rb`）ため、約25個のプラグインが同じ再帰的なAST走査器を作り直しています。この走査器は、エンジンが走査を所有していない*という理由だけで*存在します。
- **パフォーマンス（副次的）**。コストは事前フィルタなしに`plugins × files × nodes`にスケールします。レビューのブリーフによれば重要ではなく — キャッシュが緩和します — エンジンがフックをインデックスすれば無償で解決します。

**この窓**。フックのシグネチャは1.0で公開契約として凍結されます。命令型フックを1.0より後で分割するのは破壊的変更です。低コストでこれを行う最後の機会が今です。

### PHPStanが行っていること（移植すべき唯一の不変条件）

PHPStanには約50個の拡張インターフェースがありますが、移植可能な不変条件は単一です。

> **安価なゲート述語**（boolを返す／`nil`で辞退する）が、**高コストなペイロード**（`Type`／エラー／データを返す）から分離されている。エンジンはゲート値（`getClass()`、`getNodeType()`、`isMethodSupported()`）で拡張をインデックスし、ペイロードはマッチするノード／レシーバーに**対してのみ**呼び出す。

ルール拡張は`getNodeType()`を宣言し、エンジンは各ASTノードを、そのクラスに登録されたルールにのみディスパッチします。動的戻り値拡張は`getClass()`＋`isMethodSupported()`を宣言します。唯一の真のキャッチオール（`ExpressionTypeResolverExtension`、ゲートなし）は、推奨されない最後の手段として文書化されています。ほぼすべての拡張は1つのインターフェースを実装する1つのクラスであり、フレームワークパッケージが多数を登録します。

## Working Decision

2つの命令型フックを狭い拡張プロトコルへと分割します。それぞれは値オブジェクトを運ぶ新しい`Manifest`フィールド（既存の10個の宣言的フィールドと同じ登録形状）を通じて宣言され、それぞれがエンジンのインデックスする1箇所で消費されます。肥大化したフックは非推奨だがサポートされる脱出弁として残し、どのプラグインも一斉に移行を強いられないようにします。

新しいプロトコル集合は意図的に小さく — PHPStanの50個ではなく、**4つ**の新プロトコルとリネーム1件です。

### 1. `DynamicReturnExtension`（`flow_contribution_for`の戻り値スロットから）

呼び出し箇所ごとの戻り値型貢献。レシーバーでゲートされます。

```ruby
class DynamicReturnExtension
  # gate — the engine indexes by receiver class (reuses the
  # owns_receivers indexing machinery) and by method name
  def supported_receivers; end       # => Array[String]  (class names)
  def supports?(method_name); end    # => bool           (cheap)

  # payload — invoked only when both gates pass
  def return_type_for(call_node, scope); end  # => Rigor::FlowContribution | nil
end
```

マニフェストフィールド: `dynamic_returns:`。エンジンの箇所: `MethodDispatcher#dispatch`（精密なティアと`RbsDispatch`の間にある既存のプラグインティア）。ただし全プラグインへファンアウトする代わりにレシーバークラスでインデックスされます。

### 2. `TypeSpecifyingExtension`（`flow_contribution_for`のファクトスロットから）

述語／アサーションによるナローイング — `truthy_facts`／`falsey_facts`／`post_return_facts`スロット — であり、メソッドでゲートされエッジを意識します。

```ruby
class TypeSpecifyingExtension
  def supported_methods; end          # => Array[Symbol]   (gate)
  # payload — `edge` is :truthy / :falsey / :post_return (assertion)
  def specify(call_node, scope, edge); end  # => Rigor::FlowContribution | nil
end
```

マニフェストフィールド: `type_specifiers:`。エンジンの箇所: `StatementEvaluator#apply_plugin_assertions`。メソッド名でインデックスされます。これによりディスパッチループの2つ目のコピーが退役します。

### 3. `NodeRule`（`diagnostics_for_file`から） — 要石

ノードスコープの診断ルール。**エンジンが単一のAST走査を所有し**、各ノードを、そのノードのクラスに登録されたルールにのみディスパッチします。

```ruby
class NodeRule
  def node_type; end                  # => Class (Prism::CallNode, …)  (gate)
  def check(node, scope, context); end  # => Array[Diagnostic]  (payload)
end
```

マニフェストフィールド: `node_rules:`。エンジンの箇所: ランナーが各ファイルのASTを一度だけ走査し、ノードクラス → ルールのインデックスを構築し、マッチするノードごとに`check`を呼びます。これが、**約25個の手作りの走査器を削除する**変更です — それらが存在する理由（生の`root`が渡される）が消えます。`context`はADR-2が約束したが結局提供しなかった字句情報（現在のファイル、クラス／モジュール、メソッド、可視性）を運ぶので、ルールは走査によってそれを再導出する必要がありません。

### 4. `FileRule`（脱出弁、`diagnostics_for_file`から）

ノードスコープのルールでは表現できない、真にクロスファイル／インデックス検証のケース（例: 発見されたモデルインデックスをファイルに対して検証する）のためのファイル全体ルール。PHPStanの`ExpressionTypeResolverExtension`に倣い、**最後の手段**として文書化されます。

```ruby
class FileRule
  def check(path, root, scope); end   # => Array[Diagnostic]
end
```

マニフェストフィールド: `file_rules:`。これはレガシーな`diagnostics_for_file`フックの移行先です。古いフックは「名前のない非推奨の`FileRule`」として捉え直されます。

### 5. `FactProvider`（既存の`prepare`サーフェスのリネーム）

`prepare(services)`＋`produces:`／`consumes:`サーフェス（ADR-9）は*すでに*狭く、トポロジカルに順序付けられています。このADRは対称性と発見容易性のためにそれをプロトコルとして**名付ける**だけで、挙動の変更はありません。（PHPStanの`Collector<TNode, TValue>` — ノードごとの構造化されたクロスファイル収集 — は、`NodeRule`が導入するエンジン所有の走査の上に積層する`FactProvider`の自然な将来拡張です。消費側が必要とするまで先送りします。）

### 後方互換性

`flow_contribution_for`と`diagnostics_for_file`は呼び出し可能なまま、非推奨と明示されます。内部的にローダーはレガシープラグインを次のように適応させます。

- `flow_contribution_for` → 単一の全レシーバー`DynamicReturnExtension`＋全メソッド`TypeSpecifyingExtension`（すなわち、ゲートなしのファンアウト挙動を保存）。
- `diagnostics_for_file` → 単一の`FileRule`。

そのため、レガシープラグインはレガシーな（インデックスされない）コストで動き続け、移行済みのプラグインはインデックス化されたテスト可能なサーフェスを得ます。宣言的フィールド（10個）は手つかずです — sinatra／devise／dry-struct／typescript-utility-typesと、hanami／webのRBS／契約の半分はすでに分離されており、変更は不要です。

### 機械可読なケイパビリティカタログ

すべての拡張がマニフェスト上で宣言されるようになるため、エンジンは`rigor plugins --capabilities`カタログを出力できます。プラグインごとに、戻り値型を貢献するレシーバー、特定（specify）するメソッド、ルールを当てるノード型、生成／消費するファクトを示します。PHPStanには機械可読な`interface → tag`レジストリがありませんが、Rigorにはあります。これはAI可読性の目標に直接寄与します — エージェントは自己ゲートするコードを1行も読まずに、すべてのプラグインが何をするかを列挙できます。

### インターフェース単位のテストハーネス

プロトコルごとにテスト基底を提供します。これは狭いインターフェースだけが到達可能にする目標の片割れです。

- `NodeRuleTest` — ノード＋スコープを与え、返された診断をアサート（PHPStanの`RuleTestCase`に相当）。
- `DynamicReturnTest`／`TypeSpecifierTest` — 呼び出し＋スコープを与え、貢献された型／ファクトをアサート（PHPStanの`TypeInferenceTestCase`に相当）。

既存の`run_plugin`エンドツーエンドハーネスは、統合カバレッジのために残ります。

## Slices

1. **NodeRule＋エンジン所有の走査**（最高のレバレッジ。走査器のボイラープレートを退役させ、`NodeRuleTest`を解放する）。レガシーな`diagnostics_for_file`を`FileRule`として捉え直す。
2. **`flow_contribution_for`の分割**を`DynamicReturnExtension`（レシーバーインデックス、`owns_receivers`の機構を再利用）＋`TypeSpecifyingExtension`へ。複製されたディスパッチループを1つのインデックス化されたレジストリへ畳み込む。
3. **`FactProvider`のネーミング**＋ケイパビリティカタログコマンド。
4. **同梱プラグインをレガシーフックから移行**する。プラグインファミリーごとに、移行済みのプラグインで作者ヘルパー層（レビュー§1.3）が不要になるにつれてプラグインごとの走査器を削除する。

スライス1〜3はエンジン側であり後方互換です。スライス4は機械的かつ漸進的です。

### スライス1のワーキングデシジョン（実装済み）

- **登録はマニフェストフィールドではなくクラスDSL**。`node_rule`は既存の`producer` DSLを踏襲します。ブロックは`instance_exec`を通じて走るので、プラグインインスタンス（`config`、`services`、`io_boundary`、`diagnostic`、`services.fact_store`）がスコープに入ります。ルールはインスタンスを必要とする*ロジック*を運ぶので、`block_as_methods`などのようにクラスロード時に構築される純粋なマニフェスト値オブジェクトにはできません。
- **エンジンはランナーではなく`Base#node_rule_diagnostics`で走査を所有します**。それを（`Source::NodeWalker`の上で）`Base`に置くと、単一のディスパッチ地点がランナーとワーカーセッションの両方からそれぞれ1行の呼び出しで共有され、走査が単独でテスト可能になります。
- **`node_type`は（厳密なクラスではなく）`node.is_a?(node_type)`でマッチします**。そのため、ルールはすべてを見るために`Prism::Node`を登録することも、一般的なケース向けに具体的なクラスを登録することもできます。
- **`diagnostics_for_file`に対して加算的です**。両方が走ります。レガシーフックは`FileRule`脱出弁であり、変更されません。どのプラグインも移行を強いられません。
- **ブロックは`(node, scope, path)`を受け取ります**。ADR-2が約束したが結局提供しなかったリッチな`ContextInfo`（字句的なクラス／メソッド／可視性）は先送りのままです — `scope`はすでに`self_type`とほとんどのルールが必要とするナローイングファクトを運びます。`path`は`diagnostic(node, path:)`のために供給されます。
- **2パス（収集してから検証する）プラグイン** — *スライス1cで解決済み（下記参照）*。ノードごとの`NodeRule`は、エンジンの単一の前方走査の中でファイルローカルな収集パスを表現できません（参照が宣言に先行しうる）ので、`node_file_context`プリパスフックがそれを供給します。

### スライス1c — 2パスサポート（`node_file_context`、実装済み）

`node_file_context { |root, scope| … }`は、いずれのノードルールが発火するよりも前に、ファイルごとに一度（`instance_exec`経由で）走り、すべての`node_rule`ブロックにその**第4引数**として通される任意のファイルローカルな値を返します。これこそが、*同一ファイル*の2パスプラグインに手作りの検証走査を捨てさせるものです。収集パスが閉じた名前空間を一度計算し（検証の前に完了しなければなりません）、エンジンが検証走査を所有します。第4ブロック引数は後方互換です — 既存の3パラメータのブロックはそれを無視します。

2つの2パス形状の間の分割は意図的です。

- **同一ファイル収集**（例: statesmanが宣言された状態を集める） → `node_file_context`を使う。収集パス自体が共有の`Source::NodeWalker`を使うので、手作りの走査は残りません。
- **クロスファイル収集**（例: activerecordの`db/schema.rb`＋`app/models`からのモデルインデックス） → すでに`#prepare`＋`services.fact_store`（`FactProvider`サーフェス）に属します。ノードルールは公開されたファクトを直接読み、ファイルごとのコンテキストを必要としません。

`rigor-statesman`が最初の2パス消費側として移行されました。その`collect`は`node_file_context`に、`validate`は`node_rule(Prism::CallNode)`になり、手作りの走査は両方とも消えました（挙動は不変、統合スペックはグリーン）。

### スライス2 — `flow_contribution_for`の分割（設計）

2つ目の命令型フック`flow_contribution_for(call_node:, scope:)`は、スライス1が`diagnostics_for_file`を分割したのと同じやり方で分割されます。すなわち、エンジンがインデックス化する狭く宣言的にゲートされるクラスDSLにし、太いフックは非推奨の脱出弁として残します。

**前提となる事実**。`FlowContribution`は9つのスロットを持ちますが、エンジンはプラグインの`flow_contribution_for`をちょうど2箇所で参照し、ちょうど2つのスロットを読みます:

- `Inference::MethodDispatcher#try_plugin_contribution`はすべてのプラグインの貢献をマージし、`.return_type`（呼び出しサイトごとの戻り型、`RbsDispatch`に先行）のみを使います。
- `Inference::StatementEvaluator#apply_plugin_assertions`はすべてのプラグインの貢献をマージし、`.post_return_facts`（アサーションエッジのナローイング）のみを使います。

したがって分割はクリーンで、2つの消費サイトと1:1です:

**`dynamic_return`（→ `return_type`、レシーバーゲート）**。`node_rule`／`producer`を反映するクラスDSL:

```ruby
dynamic_return receivers: ["ActiveRecord::Base"] do |call_node, scope|
  # self = plugin instance; return a Rigor::Type or nil
end
```

エンジンは、呼び出しのレシーバー型のクラスが宣言された`receivers:`エントリーと等しいか、それを継承する場合にのみブロックを呼びます（`Environment#class_ordering`——今や標準のメカニズム——経由でマッチ）。メソッド名と型形状の精緻化（例: Mangroveキャリアの`type_args`）はブロック内に留まります。`Type`を返します（辞退する場合は`nil`）。`receivers:`はgrep可能でインデックス可能なゲートです——エンジンはすべての呼び出しについてすべてのプラグインに尋ねる代わりに、拡張をクラスごとにグループ化できます。

**`type_specifier`（→ `post_return_facts`、メソッドゲート）**。

```ruby
type_specifier methods: [:assert_kind_of, :assert_instance_of] do |call_node, scope|
  # return an Array of post-return facts, or nil
end
```

エンジンは`call_node.name`が宣言された`methods:`に含まれる場合にのみブロックを呼びます。マージャーが既に適用しているのと同じ`post_return_facts`を返します。（`truthy_facts`／`falsey_facts`のエッジスロットは、プラグインからの条件エッジナローイングが配線されたときのために同じサーフェスの一部です;今日消費されるのは`post_return_facts`のみなので、フロアはそれを対象とします。）

**登録とゲーティング**。どちらも`producer`スタイルのクラスDSLであり（プラグインインスタンスを必要とするロジックを持つため、マニフェストの値オブジェクトではありません）、クラス上に格納され、`Plugin::Registry`によってレシーバークラスインデックス（`dynamic_return`）とメソッド名インデックス（`type_specifier`）へ集約されます。エンジンは、重複した`collect_plugin_contributions`ファンアウトの代わりに、既存の2サイトでマッチするサブセットを参照します——そのファンアウトは`method_dispatcher.rb`と`statement_evaluator.rb`の両方から削除されます（スライス1レビューが指摘した2つのコピー）。

**後方互換性**。`flow_contribution_for`は非推奨のまま残り、エンジンは依然として両サイトでそれを（太いファンアウトとして）参照し、インデックス化された結果とマージします。そのため未移行のコンシューマー——`rigor-sorbet`・`rigor-activerecord`・`rigor-activestorage`・`rigor-mangrove`・`rigor-rspec`・`rigor-minitest`、およびサンプルプラグイン——は手付かずで動作し続けます;`dynamic_return`／`type_specifier`への移行は、プラグインファミリーごとに1つずつ、それぞれをゴールデンマスター統合スペックでガードしながら段階的に行われます。フロー貢献は型ナローイング（ひいては診断）に供給されるため、すべての移行は着地前に振る舞いを保存することが検証されます——偽陽性フロアが拘束条件です。

**コンシューマーのマッピング**（各々がどのサーフェスを使うか）:

- `dynamic_return`: **mangrove**（アンラップ → 担われた`type_args[0]`）——*移行済み*。
- `type_specifier`: **minitest**（アサーションナローイング）——*移行済み*;rspecのマッチャーナローイング——適合するが移行は保留中。

**結果／脱出弁は重要な役割を担う**。コンシューマーの移行によって、狭いDSLが意図的に*表現しない*2つの貢献形状がよくあるものだと判明し、それらのコンシューマーは正当な理由で非推奨の`flow_contribution_for`に留まります（まさにPHPStanが推奨しない`ExpressionTypeResolverExtension`の総当たりが果たす役割と同じです）:

- **メソッドゲートの戻り型**。rspecの`let(:x) { create(:x) }`／`subject`バインディングは、レシーバークラスではなく*メソッド名*（`let`／`subject`）でゲートされた呼び出しの*戻り型*を設定します。`dynamic_return`はレシーバーゲートであり、`type_specifier`は（戻り型ではなく）ファクトを生成するため、どちらも適合しません。sorbetの`sig`駆動の戻り値も同様です——固定のレシーバークラスではなく、呼ばれたメソッドがsigを持つことをキーとします。
- **動的レシーバー**。activestorageは、プロジェクトの*発見されたモデル*クラスに`Attached::One`／`::Many`を貢献します——`dynamic_return`が宣言する静的な`receivers:`リストではなく、プロジェクトごとの集合です。

これらは設計上、脱出弁に留まります。将来の`dynamic_return`の一般化（メソッドゲートの戻り値のためのオプションの`methods:`ゲート、および／または動的レシーバー述語）がそれらを移行するためのパスであり、需要が狭いサーフェスの拡張を正当化するまで延期されます。

## Relationship to other ADRs

- **ADR-2** — このADRはその肥大化フックモデルを改訂します。Scope／Type／Reflection／FactStore／IoBoundaryのサービス契約と10個の宣言的フィールドは変更されません。「広範な式／演算子フックは先送り」という姿勢は補強されます。`FileRule`が唯一のキャッチオールであり、推奨されません。
- **ADR-1** — フロー貢献のセマンティクス（バンドルフィールド、確実性ルール、マージポリシー）は手つかずです。`DynamicReturnExtension`／`TypeSpecifyingExtension`は依然として`FlowContribution`バンドルを返し、同じ`Merger`でマージされます。
- **ADR-9** — `FactProvider`は既存の`prepare`サーフェスをリネームしたものです。
- **ADR-16** — マジックメンバー／動的リフレクションのニーズはすでにマクロサブストレートでカバーされています。このADRはリフレクションプロトコルを追加しません。
- **ADR-15** — 狭い拡張オブジェクトは実行ごとの可変ディスパッチ状態を運びません（`rigor-sorbet`のアイデンティティをキーとするハッシュとは異なります）。これはRactorのワーカーごとのインスタンス化の問題（ADR-2 § Open Questions）を単純化します。

## Rejected / deferred alternatives

| Candidate | Status | Reason |
| --- | --- | --- |
| Keep the two fat hooks as-is for 1.0 | Rejected | 機能的には十分だが、シグネチャは1.0で凍結し、目標（AI可読性、インターフェース単位のテスト）は自己ゲートするフックでは到達不能。窓は今しかない。 |
| Port PHPStan's full ~50-interface catalogue | Rejected | 過剰分離。マジックメンバーはADR-16でカバー済み。デッドコード／使用制限はデマンド駆動（レビュー§7）。今日のRigorには4プロトコル＋リネームが正しい粒度。 |
| Remove the fat hooks outright (no escape valve) | Rejected | 31プラグインの一斉ビッグバン移行を強い、真のファイル全体ルールの表現手段を残さない。`FileRule`がキャッチオールを残すが推奨されない。 |
| A single generic "extension" object with optional methods | Rejected | それは現在の肥大化した`Plugin::Base`そのもの。このADRが解決する自己ゲートしてインデックスできない問題を再生産する。 |
| Structured `Collector<TNode,TValue>` now | Deferred | ノードごとのクロスファイル収集を消費側が必要としたら、`FactProvider`＋エンジン所有の走査の上に積層する。 |

## Consequences

肯定的:

- プラグイン契約が一様に宣言的＋エンジンゲート型になります。既存の10フィールドに4つの新プロトコルが加わり、すべてマニフェストから列挙可能です。
- インターフェース単位のテストハーネスが可能になります。プラグインテストはエンジン全体の下流挙動をアサートするのをやめます。
- エンジンがAST走査を所有します。約25個の手作り走査器と複製されたディスパッチループが退役します。
- ケイパビリティカタログが、すべてのプラグインの挙動の完全でgrep可能なマップをAIエージェント（と人間）に与えます — PHPStanに欠けているケイパビリティです。
- インデックス化により`plugins × files × nodes`のファンアウトが除去されます（副次的）。

否定的:

- 文書化し安定に保つべき公開プロトコルサーフェスがより大きくなります。
- レガシーと狭いプラグインが併存する移行期間があります（脱出弁アダプタによって管理されます）。
- ノードクラスとレシーバーのインデックスを構築・維持するエンジン作業が必要です。
