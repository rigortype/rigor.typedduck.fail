---
title: "コードマップ"
description: "rigortype/rigor docs/agents/code-map.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/code-map.md"
sourcePath: "docs/agents/code-map.md"
sourceSha: "0a94cc982993ef2bc2c5711a0727206bd314fbf710070017ce7ab83d73b6693d"
sourceCommit: "f6764bdb6e31ef848e10dccabd863adf0de6f519"
translationStatus: "translated"
sidebar:
  order: 9050
---

変更を計画する際、どのファイルに触れどのスペックがそれを検査するかを予測するためにこれを読んでください。これは`lib/rigor/`をマッピングするものであり、振る舞いを言い直すものではありません（振る舞いは[`docs/internal-spec/`](../../internal-spec/)と[`docs/type-specification/`](../../type-specification/)にあります）。名前が中身を予測していない箇所はその旨を記しており、それを修正する計画は[ADR-116](../../adr/116-hot-file-restructuring/)にあります。`lib/rigor/`のディレクトリまたはトップレベルファイルにここの行がない場合、あるいはここに挙げられたパスが存在しない場合、`spec/docs/code_map_spec.rb`が失敗します。

## パイプライン

`rigor check`の実行は次のステージを経ます。変更は通常そのいずれかに属します。

1. **設定（Configure）**: `lib/rigor/configuration.rb`が`.rigor.yml`を読み込み、`lib/rigor/cli/`がコマンドラインをパースしてコマンドを選択します。
2. **環境構築（Build the environment）**: `lib/rigor/environment/`がRBS（コア、stdlib、gem、プロジェクトの`sig/`）およびプラグイン提供のシグネチャを読み込み、`lib/rigor/cache/`がそれを永続化します。
3. **発見（Discover）**: すべてのプロジェクトファイルに対する1回のパスで、宣言（クラス、メソッド、ミックスイン、定数、可視性）を`lib/rigor/scope/discovery_index.rb`のテーブルに収集します。コレクターとファイル横断フォールドは`lib/rigor/inference/scope_indexer.rb`にあります。
4. **型付け（Type）**: ファイルごとに`lib/rigor/inference/statement_evaluator.rb`が文をウォークして不変の`Scope`をスレッド化し、`lib/rigor/inference/expression_typer.rb`が`Scope#type_of(node)`に答えます。呼び出しは`lib/rigor/inference/method_dispatcher.rb`を通過します。
5. **検査（Check）**: `lib/rigor/analysis/check_rules.rb`と`lib/rigor/analysis/check_rules/`が型付けされたノードを診断に変換します。
6. **統括と報告（Orchestrate and report）**: `lib/rigor/analysis/runner.rb`がファイル集合に対してステージ2〜5を（プールまたはインクリメンタルに）駆動し、`lib/rigor/analysis/runner/`が行を集約します。

## ディレクトリ

| パス | 担当内容 | 読み始めの位置 | スペック |
| --- | --- | --- | --- |
| `lib/rigor/analysis/` | 1つの名前空間を共有する7つの要素: ルールエンジン、実行統括、インクリメンタル実行と実行キャッシュ、ADR-46依存グラフ、到達可能性、テンプレートユニット、および診断値型。[analysis/ の内部](#analysis-の内部)を参照。 | `lib/rigor/analysis/runner.rb` | `spec/rigor/analysis/` |
| `lib/rigor/ast/` | 合成（仮想）ノード用のマーカー。 | `lib/rigor/ast.rb` | `spec/rigor/ast/` |
| `lib/rigor/builtins/` | コアおよびstdlib向けのインポート済みリファインメントキャリアと静的戻り値リファインメント。生成されたカタログは`data/builtins/`にある。 | `lib/rigor/builtins/imported_refinements.rb` | `spec/rigor/builtins/` |
| `lib/rigor/cache/` | オンディスクキャッシュストア、キャッシュディスクリプタとダイジェスト、キャッシュされたRBS環境、およびインクリメンタルスナップショット。 | `lib/rigor/cache/store.rb` | `spec/rigor/cache/` |
| `lib/rigor/cli/` | コマンドごとに1クラス、および各コマンドのレポートとレンダラー。`init`、`describe`、`playground`は例外で、`lib/rigor/cli.rb`の内部にある。 | `lib/rigor/cli.rb` | `spec/rigor/cli/` |
| `lib/rigor/configuration/` | `Defaults`（`DEFAULTS`とキーを記述する定数）、`Coercion`（`coerce_*`バリデーター）、`Loader`（ファイル発見、`includes:`、YAML読み込み）、深刻度プロファイル、および依存関係設定。 | `lib/rigor/configuration.rb` | `spec/rigor/configuration/` |
| `lib/rigor/effects/` | エフェクトラベルとサマリー: ユニットのスキャン、伝播、エンベロープ、スナップショット。CLI側は`lib/rigor/cli/effects_command.rb`、実行時パスは`lib/rigor/analysis/runner/`にある。 | `lib/rigor/effects.rb` | `spec/rigor/effects/` |
| `lib/rigor/environment/` | RBSの読み込みとクエリ、シグネチャ発見（bundle、`rbs collection`、ベンダー済み）、およびクラスレジストリ。 | `lib/rigor/environment.rb` | `spec/rigor/environment/` |
| `lib/rigor/flow_contribution/` | プラグインが提供するフローファクトの値型とマージャー。 | `lib/rigor/flow_contribution.rb` | `spec/rigor/flow_contribution/` |
| `lib/rigor/hashing/` | キャッシュダイジェストが使用するXXH3実装。 | `lib/rigor/hashing/xxh3.rb` | `spec/rigor/hashing/` |
| `lib/rigor/inference/` | 型付けエンジンと宣言発見。[inference/ の内部](#inference-の内部)を参照。 | `lib/rigor/inference/statement_evaluator.rb` | `spec/rigor/inference/` |
| `lib/rigor/language_server/` | LSPサーバー: リクエスト種別ごとに1プロバイダ、バッファテーブル、パブリッシュ処理。 | `lib/rigor/language_server/server.rb` | `spec/rigor/language_server/` |
| `lib/rigor/lens/` | `rigor lens`: 型の由来と契約の主張を伴う、要求されたファイルの`lens/v0`宣言マップ。 | `lib/rigor/lens.rb` | `spec/rigor/lens/` |
| `lib/rigor/mcp/` | MCPサーバーループ。 | `lib/rigor/mcp/server.rb` | `spec/rigor/mcp/` |
| `lib/rigor/plugin/` | プラグインAPI: 基底クラス、マニフェスト、ローダー、レジストリ、信頼と分離、およびマクロ基盤。 | `lib/rigor/plugin/base.rb` | `spec/rigor/plugin/` |
| `lib/rigor/protection/` | ミューテーションによる型保護カバレッジ: ミューテーター、オラクル、およびミューテーションキャッシュ。そのスキャナは`lib/rigor/inference/protection_scanner.rb`、そのコマンドは`lib/rigor/cli/`の`coverage*`、`mutation*`、`protection*`ファイル。 | `lib/rigor/protection/mutation_scanner.rb` | `spec/rigor/protection/` |
| `lib/rigor/rbs_extended/` | `%a{rigor:…}`アノテーションのパースと検査。ディレクティブリーダーは`lib/rigor/rbs_extended.rb`にある。 | `lib/rigor/rbs_extended.rb` | `spec/rigor/rbs_extended/` |
| `lib/rigor/reflection/` | ツールおよびプラグイン向けの`Scope`と環境に対する読み取り専用クエリ: 宣言、定数、プロジェクトメソッド。RBSのみをクエリする`lib/rigor/environment/reflection.rb`ではない。 | `lib/rigor/reflection.rb` | `spec/rigor/`（`reflection_*_spec.rb`ファイル） |
| `lib/rigor/runtime/` | アナライザープロセスのJITセットアップ。 | `lib/rigor/runtime/jit.rb` | `spec/rigor/runtime/` |
| `lib/rigor/scope/` | `Scope`が運ぶ発見テーブル、およびそれらの上での祖先とメソッドオーナーの解決を行う`ResolutionChain`。 | `lib/rigor/scope/discovery_index.rb` | `spec/rigor/scope/` |
| `lib/rigor/sig_gen/` | `rigor sig-gen`: 呼び出しの観測、候補の選択、RBSのレンダリングと書き込み。 | `lib/rigor/sig_gen/generator.rb` | `spec/rigor/sig_gen/` |
| `lib/rigor/source/` | 型付けを伴わないPrismヘルパー: ノード位置、子ノードウォーク、リテラル、定数パス。 | `lib/rigor/source.rb` | `spec/rigor/source/` |
| `lib/rigor/triage/` | `rigor triage`: 診断のクラスタリングとヒントの付与。 | `lib/rigor/triage.rb` | `spec/rigor/triage_spec.rb` |
| `lib/rigor/type/` | 型オブジェクトとその代数。呼び出し元はクラス自身の`new`ではなく`lib/rigor/type/combinator.rb`を通じて型を構築する。 | `lib/rigor/type.rb` | `spec/rigor/type/` |
| `lib/rigor/type_node/` | 書かれた型の構文木、およびプラグインが拡張するリゾルバチェーン。型を運ぶ仮想ノードである`lib/rigor/ast/type_node.rb`ではない。 | `lib/rigor/type_node.rb` | `spec/rigor/type_node/` |
| `lib/rigor/type_of_memo/` | ファイルごとの`type_of`メモの提供と統計。テーブルは`lib/rigor/type_of_memo.rb`。 | `lib/rigor/type_of_memo.rb` | `spec/rigor/type_of_memo_spec.rb` |

## トップレベルファイル

| パス | 担当内容 |
| --- | --- |
| `lib/rigor/ast.rb` | `lib/rigor/ast/`を読み込む。 |
| `lib/rigor/bleeding_edge.rb` | `bleeding_edge`の背後に載る変更のキュー。 |
| `lib/rigor/ci_detector.rb` | 環境からCIプロバイダを検出する。 |
| `lib/rigor/cli.rb` | コマンドディスパッチ（`HANDLERS`）、終了コード、および独自のクラスを持たないコマンド（`init`、`describe`、`playground`）。 |
| `lib/rigor/config_audit.rb` | 設定自体に関する指摘事項（未知のキー、無効なパス）。 |
| `lib/rigor/config_path.rb` | 設定されたパスを基底ディレクトリに対して解決する。 |
| `lib/rigor/configuration.rb` | `Configuration`クラス: そのリーダー、`initialize`、`to_h`、`with_*`兄弟メソッド、およびインスタンス状態を書き込む強制変換。`Configuration.load`と他のクラスメソッドは`Loader`に委譲する。 |
| `lib/rigor/configuration_error.rb` | 不正な設定がraiseするエラー。 |
| `lib/rigor/effects.rb` | `lib/rigor/effects/`を読み込む。 |
| `lib/rigor/environment.rb` | `Environment`オブジェクト: エンジンがクラスやシグネチャについて尋ねる対象。 |
| `lib/rigor/flow_contribution.rb` | 貢献バンドルとその来歴。 |
| `lib/rigor/language_server.rb` | `lib/rigor/language_server/`を読み込む。 |
| `lib/rigor/lens.rb` | lensドキュメントのバージョンとスパン形状。 |
| `lib/rigor/library_probe.rb` | 設定されたどのライブラリ名を環境が読み込めるか。 |
| `lib/rigor/mcp.rb` | `lib/rigor/mcp/`を読み込む。 |
| `lib/rigor/memo_audit.rb` | メモヒットと新規計算を比較するADR-129監査。 |
| `lib/rigor/plugin.rb` | gem名によるプラグイン登録。 |
| `lib/rigor/plugin_gap_advisory.rb` | プロジェクトが依存しているgemに対してバンドル済みプラグインの有効化を助言する。 |
| `lib/rigor/project_environment.rb` | `check`以外のコマンド向けにプラグイン対応環境を構築する。`check`ランナーとそのワーカーもそのヘルパーを呼び出す。 |
| `lib/rigor/rbs_extended.rb` | RBS宣言から`%a{rigor:…}`ディレクティブを読み取る。 |
| `lib/rigor/reflection.rb` | リフレクションファサードと定数ルックアップラダー。 |
| `lib/rigor/rooted_glob.rb` | ルートをリテラルとして扱う`Dir.glob`。 |
| `lib/rigor/run_scoped_slots.rb` | 実行終了時に実行スコープの`TypingState`スロットを空にする。 |
| `lib/rigor/scope.rb` | 不変の`Scope`: ローカル束縛、ナローイングファクト、および発見テーブルに対するリーダー。 |
| `lib/rigor/sig_gen.rb` | `lib/rigor/sig_gen/`を読み込む。 |
| `lib/rigor/signature_path_audit.rb` | バンドル済みプラグインに対して設定されたシグネチャパスを監査する。 |
| `lib/rigor/source.rb` | `lib/rigor/source/`を読み込む。 |
| `lib/rigor/testing.rb` | フィクスチャ用の`Rigor.dump_type`と`assert_type`。 |
| `lib/rigor/triage.rb` | トリアージクラスタ。 |
| `lib/rigor/trinary.rb` | Yes / no / maybe。 |
| `lib/rigor/type.rb` | `lib/rigor/type/`を読み込む。 |
| `lib/rigor/type_node.rb` | `lib/rigor/type_node/`を読み込む。 |
| `lib/rigor/type_of_memo.rb` | ファイルごとの`type_of`メモテーブル。 |
| `lib/rigor/typing_state.rb` | エンジンが使用するすべてのスレッドローカルスロット（その種類とともに1箇所で宣言）。 |
| `lib/rigor/value_semantics.rb` | 不変の値クラス用に`==`、`eql?`、`hash`を生成する。 |
| `lib/rigor/version.rb` | `Rigor::VERSION`。リリース準備のみが編集する。 |

## `inference/`の内部

約120個のファイルがディレクトリ直下に置かれています。そのうち3つがエントリーポイントであり、残りの大半はそれら3つから呼ばれる各機能です。

| 内容 | 場所 | 備考 |
| --- | --- | --- |
| 文のウォークとスコープのスレッディング | `lib/rigor/inference/statement_evaluator.rb` | エントリー: `evaluate`。代入、制御フロー、ループ、文位置のブロック、`def`およびクラス本体、パターンマッチ、rescueを担当する。ADR-116が切り出した2つのクラスタは`statement_evaluator/`配下のプレーンなモジュールであり、評価器と読み取る状態を引数として受け取る: `pattern_bindings.rb`（`PatternBindings`: `rescue`参照束縛、`case/in`、`=>`および`in`パターン、名前付きキャプチャ`=~`）と`def_arguments_and_assertions.rb`（`DefArgumentsAndAssertions`: 呼び出し引数としての`def`、RSpecマッチャーナローイング、RBS::Extendedおよびプラグインの戻り値後ファクト）。これらは`StatementEvaluator#sub_eval`、`#widen_index_target`、`#widen_attribute_write`、`#eval_def`をコールバックし、そのためにpublicかつ`@api private`とマークされている。 |
| 式の型付け | `lib/rigor/inference/expression_typer.rb` | エントリー: `type_of`。ディスパッチテーブル、大半のノード別タイパー、ディスパッチ前後の呼び出し型付け、およびユーザーメソッド戻り値推論（`return_type_for`）を担当する。ADR-116が切り出したクラスタは`expression_typer/`配下のプレーンなモジュールであり、typerと読み取る状態を引数として受け取る: `composites.rb`（`Composites`: ハッシュ、配列、範囲、式展開、パススルーノード）と`writes.rb`（`Writes`: 値位置の代入と複合書き込み）── それぞれ`PRISM_DISPATCH`が名指しする同名の1行private委譲子を通じて到達 ── および`per_element_assemblers.rb`（`PerElementAssemblers`: 要素ごとのブロック畳み込みアセンブラとそのテーブル）。`Composites`は`ExpressionTyper#type_of`をコールバックし、`Writes`は`#type_of`、`#dynamic_top`、`#resolve_constant_name`（後ろ2つはpublicかつ`@api private`）をコールバックする。 |
| 双方にある同一構文 | 両ファイル | 文位置の構文は`StatementEvaluator`によって、値位置の構文は`ExpressionTyper`によって評価される。両者は`Scope#evaluate`と`Scope#type_of`を通じて相互に再帰する。ブロックエントリーと複合書き込みは双方に存在する（ADR-116 WD6）。どちらかを変更する前に両方を確認すること。 |
| ナローイング | `lib/rigor/inference/narrowing.rb`, `lib/rigor/inference/narrowing/` | ステートレス。述語および型レベルのナローイング。より小さな機能は`lib/rigor/inference/indexed_narrowing.rb`などの兄弟ファイルにある。ADR-116が切り出したリーフクラスタは`narrowing/`配下のモジュールであり、`Narrowing`が呼び出し、`Complements`（`narrow_not_refinement`）と`RegexMatch`（`narrow_nil`、`narrow_not_class`）からのみ`Narrowing`へコールバックする: `complements.rb`（補集合、有限ドメイン、整数範囲代数）、`presence_predicates.rb`（空判定とキー存在）、`class_dispatch.rb`（キャリアごとの`narrow_class`）、`regex_match.rb`（正規表現マッチ述語、キャプチャグループ）。 |
| 代入可能性（Assignability） | `lib/rigor/inference/acceptance.rb` | 「この型はあの型を受理するか」（理由付き）。 |
| メソッドディスパッチ | `lib/rigor/inference/method_dispatcher.rb`, `lib/rigor/inference/method_dispatcher/` | `resolve`がティアラダーである。ほとんどのティアは`try_dispatch(CallContext)`を持つモジュールである。ユーザーメソッドのティアはそれより前と後、すなわち`ExpressionTyper#call_result_type_for`で実行される。 |
| 宣言発見 | `lib/rigor/inference/scope_indexer.rb`, `lib/rigor/inference/scope_indexer/`, `lib/rigor/inference/declaration_walk.rb`, `lib/rigor/inference/declaration_walk/` | 名前に反して、`scope_indexer.rb`のうちノードごとのスコープインデックスはわずかである: `index`はここに留まり、評価器が訪問しなかったノードを埋めるウォークは`scope_indexer/node_propagation.rb`（`NodePropagation`; `ScopeIndexer.propagate`が委譲する）である。残りはプロジェクト全体の発見テーブルを構築し、ファイル間で畳み込み、シードバンドルをエンコードする。イベントが十分な箇所では新しいコレクターを共有`DeclarationWalk`に載せる（ADR-116 WD5）。 |
| ミューテーション・キャプチャ・フロア機能 | `lib/rigor/inference/mutation_widening.rb`、`lib/rigor/inference/captured_locals.rb`、`lib/rigor/inference/callee_write_census.rb`などの兄弟ファイル | 各ファイルは1つの機能のASTスキャンとルールを保持する。それがどこから呼ばれるかは`statement_evaluator.rb`にある: フックポイントがまだないため、この種の新しい機能はそのファイルも編集する（ADR-116 WD8）。 |
| 高階型（Higher-kinded types） | `lib/rigor/inference/hkt_reducer.rb`とその他の`hkt_*.rb`ファイル | |
| プロジェクトのモンキーパッチ | `lib/rigor/inference/project_patched_scanner.rb`とその他の`project_patched_*.rb`ファイル | |

## `analysis/`の内部

| グループ | ファイル |
| --- | --- |
| ルールエンジン | `lib/rigor/analysis/check_rules.rb`（オーケストレーションのみ: `diagnose`、ノードコレクターの構築と駆動、ノードごとのルールディスパッチ、および`filter_suppressed`委譲子）、`lib/rigor/analysis/check_rules/`（ノードコレクター、それぞれ独自のメッセージビルダー、ルールID、ガード、およびADR-116 WD1が切り出したモジュールを持つ: `suppression.rb`、`undefined_method.rb`、`unresolved_toplevel.rb`、`rigor_testing.rb`、`always_raises.rb`、`raise_non_exception.rb`、`special_global_write.rb`、`self_undefined_method.rb`、`visibility_mismatch.rb`、`override_visibility.rb`、`override_return_widened.rb`、`nil_receiver.rb`、`wrong_arity.rb`、`override_param_narrowed.rb`（3つのオーバーライドルールが共有する祖先ウォークとRBSヘルパーである`override_support.rb`を伴う）、`return_type.rb`、`unreachable_branch.rb`、`argument_type.rb`、および複数のルールが共有する述語である`receiver_predicates.rb`）、`lib/rigor/analysis/rule_catalog.rb` |
| 実行統括 | `lib/rigor/analysis/runner.rb`、`lib/rigor/analysis/runner/`（ADR-116が実行依存リーフレコードを`dependency_rows.rb`へ、ファイルごとのスコープシードの純粋な部分を`scope_seed.rb`へ、エフェクトサイドカーのキャッシュ読み書きを`effect_cache_entries.rb`へ移動した）、`lib/rigor/analysis/worker_session.rb` |
| インクリメンタル実行と実行キャッシュ | `lib/rigor/analysis/incremental_session.rb`、`lib/rigor/analysis/run_cache_key.rb`（キー）、`lib/rigor/analysis/runner/dependency_rows.rb`（キーが運ばない検証行） |
| 依存グラフ（ADR-46） | `lib/rigor/analysis/dependency_recorder.rb`、`lib/rigor/analysis/incremental.rb`。エンジンは`lib/rigor/inference/`および`lib/rigor/scope.rb`からレコーダーに記録するため、歴史的理由からここに置かれているエンジンサービスである。 |
| 到達可能性（`rigor unused`） | `lib/rigor/analysis/reachability/` |
| テンプレートユニット（ERBなど） | `lib/rigor/analysis/template_units.rb`とその他の`template_unit_*.rb`ファイル |
| 診断値 | `lib/rigor/analysis/diagnostic.rb`、`lib/rigor/analysis/result.rb`、`lib/rigor/analysis/baseline.rb` |
| フローファクト | `lib/rigor/analysis/fact_store.rb`: `Scope`が運ぶファクト。これもエンジンサービスである。 |

2つの名前が2回出現します。`Analysis::FactStore`はフローファクトを保持し、`Plugin::FactStore`（`lib/rigor/plugin/fact_store.rb`）はプラグイン公開のファクトを保持します。`lib/rigor/source/constant_path.rb`はPrismの定数パスを文字列としてレンダリングし、`lib/rigor/reflection/constant_path.rb`はセグメントごとに解決します。

## これらを追加するには、これらすべてを編集する

以下の各種別は複数のファイルに手書きで列挙されています。1つ見落とすと、通常はエラーではなく静かなギャップが生じます。ADR-116基準C1は各種別を1箇所で宣言することであり、ある種別についてそれが着地するまで、これがそのリストです。

| 追加対象 | 編集箇所 |
| --- | --- |
| チェックルール | `lib/rigor/analysis/check_rules/rule_ids.rb`、`lib/rigor/analysis/rule_catalog.rb`、`lib/rigor/configuration/severity_profile.rb`、`docs/manual/04-diagnostics.md`、およびそのファクトがある場所のルール自身: `lib/rigor/analysis/check_rules/`配下のルール自身のモジュール（`lib/rigor/analysis/check_rules.rb`の`call_node_diagnostics`（コールサイトルール）または`main_pass_node_diagnostics`（`def`および`if`ルール）から入る。`call.undefined-method`は`undefined_method.rb`、`call.unresolved-toplevel`は`unresolved_toplevel.rb`、`call.wrong-arity`は`wrong_arity.rb`、`call.possible-nil-receiver`は`nil_receiver.rb`、`call.argument-type-mismatch`は`argument_type.rb`、`def.return-type-mismatch`は`return_type.rb`、`flow.unreachable-branch`は`unreachable_branch.rb`）、`lib/rigor/analysis/check_rules/`配下のノードコレクター（`build_node_collectors`で配線され、コレクター自身の`diagnostics`としてのメッセージビルダーを持ち、`COLLECTOR_DIAGNOSTIC_BUILDERS`を通じて呼ばれる）、`lib/rigor/analysis/runner/`配下のパス内の実行レベルルール（`effect.*`ルール）、`lib/rigor/environment/member_consistency.rb`内のRBS整合性ルール。ルールのポリシーがそこに仕様化されている場合は`docs/type-specification/diagnostic-policy.md`（ルールIDの約半分が該当）。 |
| CLIコマンド | `lib/rigor/cli.rb`（`HANDLERS`とその`run_*`メソッド）、`lib/rigor/cli/`配下のコマンドクラス、`lib/rigor/cli/catalogue.rb`、`docs/manual/02-cli-reference.md` |
| 設定キー | `lib/rigor/configuration/defaults.rb`（`DEFAULTS`）、`lib/rigor/configuration/coercion.rb`（その`coerce_*`バリデーター）、`lib/rigor/configuration.rb`（`initialize`内の呼び出し、リーダー、および`to_h`）、`schemas/rigor-config.schema.json`、`docs/manual/03-configuration.md`。`to_h`は手書きであり実行キャッシュキーの入力である: 診断を変えるキーがそこに欠落していると陳腐化したキャッシュ結果が返され、それを検査するゲートはない。RBS環境を変えるキーは`lib/rigor/cache/rbs_descriptor.rb`にも入れる。 |
| プラグインフック | `lib/rigor/plugin/base.rb`上のメソッドと`sig/rigor/`配下のそのRBS、エンジンがそれを呼び出す箇所（同種の既存フックをgrepする: `narrowing_facts_for`は`lib/rigor/inference/statement_evaluator.rb`から、`declared_members`は`lib/rigor/sig_gen/generator.rb`から呼ばれる）、エンジンがレジストリ経由で到達する場合は`lib/rigor/plugin/registry.rb`、プラグインがマニフェストで宣言する場合は`lib/rigor/plugin/manifest.rb`、型を貢献する場合は`lib/rigor/analysis/plugin_fact_fingerprint.rb`、`docs/internal-spec/plugin.md`、`docs/internal-spec/public-api.md` |
| 発見テーブル | そのコレクター、`lib/rigor/scope/discovery_index.rb`、`lib/rigor/inference/scope_indexer.rb`内のマージ・フォールド・シードバンドルコード、`lib/rigor/inference/project_seed_tables.rb`、`lib/rigor/scope.rb`上のリーダー、`lib/rigor/analysis/runner.rb`、`lib/rigor/analysis/runner/project_pre_passes.rb`、`sig/rigor/scope.rbs`、およびキャッシュスキーマのバンプ（ADR-116 WD2） |
| ディスパッチティア | `try_dispatch`を持つ`lib/rigor/inference/method_dispatcher/`配下のモジュール、その`require_relative`および`lib/rigor/inference/method_dispatcher.rb`のティア配列内の位置、`docs/internal-spec/inference-engine.md` §「Dispatch tier contract」。RBSバックの答えより前に勝たなければならない、またはミス時にのみ実行されるティアは、代わりに`lib/rigor/inference/expression_typer.rb`内の`ExpressionTyper#call_result_type_for`の`try_*`呼び出し群に属する。 |
| スレッドローカルまたはメモ | `lib/rigor/typing_state.rb`内の1つの宣言。`lib/rigor/`配下の他のどのファイルも`Thread.current[]`を呼ばない。2つのファイル（`lib/rigor/analysis/run_disclosure_credit.rb`、`lib/rigor/plugin/io_boundary.rb`）が`thread_variable_get`/`set`で帰属状態を保持しているが、エンジン状態のためにそれを真似てはならない。 |

## どのスペックスタイルを書くか

exampleあたりのコストは2桁異なるため、振る舞いを観測できる最も安価なスタイルを選んでください。2026-11-17計測、各1回実行: `spec/rigor/type/combinator_spec.rb`は161 exampleで0.03秒、`spec/rigor/inference/mutation_widening_spec.rb`は87 exampleで0.11秒、`spec/rigor/analysis/check_rules/special_global_write_spec.rb`は45 exampleで17.5秒。

| スタイル | exampleあたりのコスト | 用途 |
| --- | --- | --- |
| プレーンデータ: `Type::Combinator`で型を構築するか、`spec/support/call_context_helpers.rb`の`cc(...)`で`CallContext`を構築 | 1 ms未満 | 型代数、代入可能性、1つのディスパッチティア、ナローイングプリミティブ、`lib/rigor/source/`配下のあらゆるもの |
| スニペットをパースして`Scope.empty`に対して型付け | 1〜3 ms | 1つのエンジン機能: ナローイングルール、拡大、センサス |
| `spec/support/runner_helpers.rb`の`analyze(...)`によるフル実行（`type: :runner`メタデータでスペックに付与） | 200〜400 ms | ランナーを必要とする振る舞い: ファイル横断発見、ルール出力と抑制、プール、キャッシュ、インクリメンタル実行 |

その`lib/`ファイルにちなんで名付けられたスペックファイルが、そのファイルが変更されたときに`make verify-changed`が名前で選択するものです。issueにちなんで名付けられたスペックは、それ自身が編集されたか変更されたフィクスチャを名指ししているときにのみ選択されるため、リグレッションのexampleは修正を所有するモジュールのスペックに置いてください。
