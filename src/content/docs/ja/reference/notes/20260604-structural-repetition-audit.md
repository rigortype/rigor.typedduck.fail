---
title: "Structural code repetition audit (non-catalog, non-plugin) — 2026-06-04"
description: "Imported from rigortype/rigor docs/notes/20260604-structural-repetition-audit.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260604-structural-repetition-audit.md"
sourcePath: "docs/notes/20260604-structural-repetition-audit.md"
sourceSha: "5b0b57a5303ead2aab1db8c57edb16d1217313e572adbfd34a522bd5ae1e3f89"
sourceCommit: "37d70ab9071b4a25e954d0157818f0b6ae88e2c2"
translationStatus: "translated"
sidebar:
  order: 20266604
---

## 動機

組み込み型付けのボイラープレート一掃
（[20260603](../20260603-builtin-typing-boilerplate-audit/)）に続くフォローアップです。あのノートはカタログ＋ディスパッチティアの機構を扱いましたが、本ノートは同じ対象──多数の箇所でコピー＆ペーストまたは再実装されたコード形状──を求めて`lib/rigor/`の残りを一掃します。ただしカタログ
（`lib/rigor/inference/builtins/`）とプラグインのサーフェス
（`lib/rigor/plugin/`、`plugins/`、`examples/`）は明示的に除外します。

5つのサブツリーを並行して調査しました。`Type::*`キャリア（carrier）、CLIサブコマンド、推論エンジン（式タイパー／文評価器／スコープインデクサー／ナローイング）、解析＋診断レイヤー、そしてLSP／キャッシュ／sig-gen／環境のクラスタです。調査結果は**4つの横断的テーマ**に集約されます。各クリーンアップは、振る舞いを保存するコンテナのみのリファクタリングでなければなりません
（`false-positive-discipline`ルール）。型システムと推論エンジンは正しさが死活的なため、「十分にテストされている」ことがリスク面の重荷を担っており、「機械的に見える」ことではありません。

クリーンアップが真に共有された**構造的インターフェース**
（ダックタイプされたモジュールの継ぎ目──複数の型が同じメソッド形状に応答する）をあらわにする場合は、AGENTS.mdの用語ルールに従ってRBSの`interface _Foo`として宣言します。これは*インターフェース*／*構造的契約（contract）*であって、決して「プロトコル」ではありません
（その語はADR-28のパススコープなプロトコル契約のために予約されています）。

## Theme A — 値オブジェクトの`==`／`eql?`／`hash`／`inspect`／`to_h`ボイラープレート

コードベースで最も繰り返される単一の形状です。

- **`Type::*`キャリア──16箇所**。すべてのキャリアが手書きで
  `==`（`other.is_a?(self.class) && field == other.field …`）、
  `alias eql? ==`、`hash`（`[self.class, *fields].hash`）、そして`inspect`
  （`#<Rigor::Type::X #{describe(:short)}>`）を書いています。例: `nominal.rb:69-81`、
  `constant.rb:118-130`、`union.rb:93-105`、`tuple.rb:70-82`、
  `hash_shape.rb:113-130`、…さらに`AcceptsResult`。
- **`accepts`の委譲──15箇所**。すべてのキャリアが
  `def accepts(other, mode: :gradual) = Inference::Acceptance.accepts(
  self, other, mode: mode)`を、キャリア固有のロジックゼロで繰り返しています。
- **`top`／`bot`／`dynamic`の述語──15キャリア×3**。ほとんどは定数の
  `Trinary.no`であり、Top/Bot/Dynamic/Refined/Difference/Unionだけが異なります。
- **キャッシュ記述子のエントリー──5クラス**。 `FileEntry`／`GemEntry`／
  `PluginEntry`／`ConfigEntry`／`DependencyEntry`
  （`cache/descriptor.rb:40-180`）がそれぞれ`to_h`／`==`／`eql?`／
  `hash`／凍結フィールド初期化を繰り返しています。

**痛み**。新しいキャリアの著者は約25行のアイデンティティ用ボイラープレートをコピーします。バグの種類は現実的かつ深刻です──`==`/`hash`でフィールドを1つ忘れると、その値はSetやHashキーから黙って消えるか、等しくないべきときに等しいと比較されます。この契約は
`docs/internal-spec/internal-type-api.md`により拘束力を持ちます。

**方向性**。宣言された`equality_fields`リストをキーとし、`==`／`eql?`／`hash`
（およびオプションで`inspect`）を供給する`ValueSemantics`ミックスイン。固定の
`accepts`委譲のための`AcceptanceRouter`ミックスイン。**リスク: キャリア固有の`==`セマンティクスをまず確認する必要があります**──順序非依存に比較したり、比較前に正規化したりするキャリアは、素朴なフィールド単位のミックスインをそのまま使えません。型システムのspecスイートが安全網です。

**インターフェースの好機**。キャリアはすでに単一の構造的契約（「internal type API」）を満たしています。共有サーフェス
（`==`、`hash`、`describe`、`erase_to_rbs`、`accepts`、`top`／
`bot`／`dynamic`、…）を列挙する`interface _Type`（または`_TypeCarrier`）を`sig/`に置く価値があります──プロトコルではなくインターフェースです。

## Theme B — ASTのウォーク＆ギャザー骨格

- **`scope_indexer.rb`**──8つのウォーク／ギャザーメソッド、そして
  `return unless node.is_a?(Prism::Node)`が約20箇所
  （325, 485, 501, 527, 620, 632, 645, 708, 737, 766, 794, 870, …）で繰り返されています。それぞれが「ガード→case（Class/Moduleで降下｜特定ノードに委譲）→`compact_child_nodes`で再帰」です。
- **3つのコレクタークラス**（`check_rules/dead_assignment_collector.rb`、
  `always_truthy_condition_collector.rb`、`ivar_write_collector.rb`）がそれぞれウォーク＆ギャザー＆フィルタを再実装しています。
- **累積時ユニオン**のイディオムが`scope_indexer.rb:687, 750,
  776, 826`（`existing ? union(existing, t) : t`）で繰り返されています。

**方向性**。小さな抽出は安全です（`union_accumulate`ヘルパー、3つのコレクター用の共有`AstCollector`基底）。scope_indexer用の汎用ツリーウォーカー全体は**高リスク**です──走査順序とフィルタリングが正しさに死活的なため──ので、延期するか、カジュアルなクリーンアップとしてではなくシャドウラン等価性チェックの背後で行うべきです。

## Theme C — CLIサブコマンド骨格

- **12コマンド**が`initialize(argv:, out:, err:)`＋`run`＋
  `parse_options`を繰り返しています（annotate/type_of/type_scan/coverage/explain/diff/
  sig_gen/triage/plugins/plugin/skill/lsp/mcp）。`$stdout`／`$stderr`
  のデフォルト設定はコマンド間で一貫していません。
- **共有フラグがコマンドごとに再宣言**: `--config`（10以上）、
  `--format`（7、同一の`opts.on`＋7つのレンダラーで同じ「unsupported format」エラー）、エディタモードの`--tmp-file`／`--instead-of`。バッファ束縛のバリデーションが`cli.rb:217-232`と`type_of_command.rb:79-95`の間で重複しています。
- **`collect_paths`**は`type_scan_command.rb:70-83`と
  `coverage_command.rb:67-80`の逐語コピーです（エラープレフィックスだけが異なります）。

**方向性**。 `CLI::Command`基底（init＋デフォルト）、`CLI::Options`
フラグビルダーモジュール（`add_config`／`add_format`／`add_editor_mode`＋共有の`resolve_buffer_binding`）、テキスト／JSONディスパッチ用の`Renderable`ミックスイン、そして共有の`collect_paths`。加算的で振る舞いリスクは低いです──**ただしCLIには専用のユニットspecがない**ため、各抽出には併せてテストカバレッジを追加する必要があります（統合specがコマンドをエンドツーエンドで動かし、大きな破損は捕捉します）。

## Theme D — ハンドラ骨格

- **6つのLSPプロバイダ**（hover/completion/signature-help/document-symbol/
  folding-range/selection-range）がURI→バッファ→Prismパース→
  nilガードの前置き（各約15行）を繰り返しています。LSPの`loop.rb`とMCPの
  `loop.rb`の読み取り／ディスパッチ／書き込みループはほぼ同一です。
- **6〜7のRBSキャッシュプロデューサー**（`cache/rbs_*.rb`）が
  `PRODUCER_ID`＋`fetch`→`RbsDescriptor.build`→
  `store.fetch_or_compute`→privateな`compute`を繰り返しています。
- **診断の構築**──`location = call_node.message_loc ||
  call_node.location`＋`Diagnostic.new(… column: location.start_column
  + 1 …)`が`analysis/check_rules.rb`の15以上の箇所で繰り返されています。
- より小さなディスパッチラッパー: ExpressionTyperの3つの変数読み取りの双子
  （`expression_typer.rb:281-290`）、StatementEvaluatorの12の複合代入の1行もの
  （`statement_evaluator.rb:224-270`）、ナローイングの5つの極性分岐ラッパー
  （`narrowing.rb:1967-2007`）。

**方向性**。 LSPプロバイダ用の`with_parsed_buffer`ミックスイン。キャッシュプロデューサー用の`RbsCacheProducer`基底／マクロ（`fetch`を宣言する**インターフェース**
`_CacheProducer`が自然なRBSの相方）。位置＋カラムのボイラープレートを吸収する
`Diagnostic.from_call_node`／`.from_node_name_loc`ファクトリー。複合代入の12とナローイングの5のためのテーブル駆動ディスパッチ。

## 優先度（ROI÷リスク）

| # | 対象 | 規模 | リスク | 判定 |
|---|---|---|---|---|
| 1 | **A: 値オブジェクトセマンティクスのミックスイン**（キャリア＋キャッシュエントリー）＋`accepts`ルーター | 21以上 | 低〜中（十分にテスト済み） | 最も強い初手 |
| 2 | **D: `Diagnostic.from_*`ビルダーファクトリー** | 15以上 | 低 | 高 |
| 3 | **C: CLI基底＋`Options`＋`Renderable`＋`collect_paths`** | 12以上 | 低（テスト追加） | 高 |
| 4 | **D: LSP `with_parsed_buffer`＋`RbsCacheProducer`**ミックスイン | 12以上 | 中 | 中 |
| 5 | クイックウィン: 変数読み取りトリオ、`union_accumulate`、複合代入／ナローイングのディスパッチテーブル | 小 | 低 | 中 |
| 6 | **B: scope_indexerウォーカーの統一** | 大 | 高 | 延期／シャドウラン |

**初手として意図的に行わないこと**（リスク＞報酬）: `Type::*`
キャリアを一括で`Data.define`に変換すること（テストが依存するイントロスペクション／`is_a?`の形状を変える）、scope_indexerを汎用ビジターに書き換えること（走査順序が荷重を担っている）、診断の`RuleCatalog`を`CheckRules`から自動生成すること（メタデータのドリフトリスク、大きなサーフェス）。ミックスイン／ファクトリーのルートが、リスクのわずかな割合で価値の大部分を捕捉します。

## インターフェース化（AGENTS.mdの用語に従う）

クリーンアップがあらわにする構造的な継ぎ目のためにRBSの`interface _Foo`を導入します──これらは*インターフェース*／*構造的契約*であって、決して「プロトコル」ではありません:

- `interface _Type`（または`_TypeCarrier`）──すべての`Type::*`キャリアが満たす内部型オブジェクトAPI。Theme Aと対になります。
- `interface _CacheProducer`──RBSキャッシュプロデューサー用の`fetch(loader:, store:) -> …`。Theme Dと対になります。
- （候補）Theme Bの`AstCollector`基底が着地する場合の`_DiagnosticSource`／コレクター契約。

宣言的で、Steepグリーンで、強制的な準拠なし──Finding 3の作業で追加された`_DispatchTier`インターフェースおよびエンジンの部分シグネチャイディオムと整合します。

## 進捗ログ（2026-06-04）

- **Theme A──完了**。 `Rigor::ValueSemantics`マクロ（`value_fields`、生成された`==`/`eql?`/`hash`がホットパス上で手書き相当の速度で走るようclass_evalコード生成）を13のフィールド単位のTypeキャリアと5つのキャッシュ記述子エントリーに適用。14キャリアの`accepts`委譲のための`Rigor::Type::
  AcceptanceRouter`ミックスイン。そして`sig/rigor/type.rbs`に`interface _Type`を宣言。設計上、手書きのままにしたもの: `Type::Constant`（`value.class`を区別）、`Top`/`Bot`
  （フィールドなしのシングルトン）、`Type::App#accepts`（`bound`に委譲）、そして`Descriptor#==`（正規バイト等価性）。移行前にキャリア固有の`==`セマンティクスを監査しました。振る舞いの変更なし。フルスイート（5406）／推論（1870）／キャッシュ（87）／steepすべてグリーン。
- **Theme D──診断ファクトリー──完了**。
  `Diagnostic.from_message_loc`／`.from_name_loc`（既存の`from_location`上のキーワード転送ラッパー）を追加し、17の
  `check_rules.rb`構築箇所すべてを生の`Diagnostic.new`＋インラインの
  `location = … || ….location`／`start_column + 1`から移行。0から1へのカラム規約はいまや`from_location`にのみ存在します。バイト単位で同一の診断。フルスイート5406グリーン。
- **Theme C──完了（CLI）**。 4つのスライス（slice）、それぞれユニットspec追加（CLIには以前、基底／オプションのカバレッジがありませんでした）:
  - `CLI::Command`基底──一貫した`$stdout`/`$stderr`デフォルトを持つ1つの`initialize(argv:, out:, err:)`。14サブコマンドが継承します。
  - `CLI::Options`──`add_editor_mode`＋`resolve_buffer_binding`。`Rigor::CLI`（`check`）と`TypeOfCommand`（`type-of`）の両方に存在した一字一句の重複を統合。
  - `collect_paths(args, command_name:)`を`CLI::Command`へ移動（type_scan／coverageの逐語コピーでした）。
  - `CLI::Renderable`──type-of／type-scan／coverageのレンダラーが共有する`render(data, format:)`のテキスト／JSONディスパッチ。
  - **残り（オプション、延期）:** `--config`（11箇所）／
    `--format`（7）の`opts.on`ブロックは`Options.add_config`／
    `add_format`ビルダーへ移動できますが、フラグ定義はめったにドリフトしません──価値の低いチャーンであり、将来のパスに残しました。
- **Theme D──ハンドラ骨格──完了**。
  - `Cache::RbsCacheProducer`基底: 7つのRBSキャッシュプロデューサーはそれぞれバイト単位で同一の`self.fetch`（記述子を構築→
    `PRODUCER_ID`の下で`fetch_or_compute`→`compute`）を繰り返していました。いまや`PRODUCER_ID`＋`compute`だけを宣言するサブクラスです。`self::PRODUCER_ID`が具象サブクラス定数を解決します。構造的契約は新しい`sig/rigor/cache.rbs`内に`interface _CacheProducer`として宣言されています。
  - `LanguageServer::BufferResolution`ミックスイン: 6つのLSPプロバイダすべてが同じURI→パス＋バッファエントリーのルックアップで`provide`を開始していました。`buffer_for(uri)`へ抽出。プロバイダごとのパースステップ（strict／tolerant／カーソルリカバリー）はそのまま据え置きです。
  フルスイートグリーン。steepグリーン。
- **Theme #5クイックウィン──やらない（判断）**。大きなテーマが着地した後に再検討すると、残る項目は正しさに死活的な推論ホットパス内のマイクロ重複でした。ExpressionTyperの変数読み取り「トリオ」は3つの自明な1行もの
  （`scope.ivar(name) || dynamic_top`）であり、scope_indexerの累積時ユニオンは3行の`existing ? union(...) : type`×4です。Theme A／C／Dと違い、構造的なベネフィットはわずかである一方、ナローイング／scope-indexer／タイパーのホットパスへの編集はいずれもゼロでないリスクを伴います──チャーン対報酬の計算が反転します。複合代入の12とナローイングの極性分岐の5はディスパッチテーブルの候補ですが、同じ理由で中リスクです。具体的な必要性（新しい変数の種類、新しいナローイング型）がテーブルの元を取るまでは、現状のままにしました。
- **Theme B──未着手（延期、高リスク）**。 scope_indexerの汎用ウォーカー統一は、安全になる前に走査等価性ハーネス（コーパス上で旧vs新をシャドウラン）が必要です。振る舞いを保存するクリーンアップパスのスコープ外です。

## 実行順序（高価値＋着手しやすいものを先に）

1. **Theme A**──キャリアとキャッシュエントリー全体への`ValueSemantics`＋`AcceptanceRouter`ミックスイン、`sig/`の`interface _Type`。キャリア固有の`==`監査を先に。**（完了──進捗ログ参照）**
2. **Theme Dビルダーファクトリー**──`Diagnostic.from_call_node`／
   `.from_node_name_loc`。15以上の箇所を一掃。
3. **Theme C**──CLI基底＋オプションビルダー＋レンダラーミックスイン（＋テスト）。
4. **Theme Dハンドラミックスイン**──LSP `with_parsed_buffer`、
   `RbsCacheProducer`（＋`interface _CacheProducer`）。
5. **クイックウィン**──上記と併せて日和見的に。
6. **Theme B**──走査等価性ハーネスがある場合のみ。

各ステップはフルの`rspec`スイート＋`rigor check lib`＋
`make steep-check`でゲートされ、振る舞いは一定に保たれます。
