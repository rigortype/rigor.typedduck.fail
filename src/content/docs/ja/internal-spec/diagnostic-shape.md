---
title: "`Rigor::Analysis::Diagnostic`のシェイプ"
description: "rigortype/rigor docs/internal-spec/diagnostic-shape.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/diagnostic-shape.md"
sourcePath: "docs/internal-spec/diagnostic-shape.md"
sourceSha: "7679e026a9fc92d72a1a896673fdf58e1099752dbfe1d4cb6fbf01f80aa650a0"
sourceCommit: "a3ab53dd2b8aa0a84fd7ddbd64339f316d8d12ec"
translationStatus: "translated"
sidebar:
  order: 3050
---

## ステータス

**記述的であり、まだ確定していません**。これはdiagnosticキャリア（carrier）の*現在の*シェイプ（shape）を記録するもので、コンシューマー（トリアージ、ベースライン（baseline）、JSONストリームを読むプラグイン）が文書化された契約（contract）に依存できるようにします。これはサーフェス（surface）を**確定させるものではありません**。[`public-api.md`](../public-api/)のとおり、ルールごとの識別子と構造化フィールドの集合はv0.1.0でロックされるまでまだ変わりうるため、`Rigor::Analysis::Diagnostic`は意図的に公開APIドリフト仕様から外されています。*識別子の分類体系*、深刻度解決、抑制のセマンティクスは
[`diagnostic-policy.md`](../../type-specification/diagnostic-policy/)で規範的に定められています。このページはオブジェクトのフィールドシェイプについてのみ扱います。

## フィールド

`Rigor::Analysis::Diagnostic`は次を保持します。

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `path` | `String` | diagnosticが報告される対象の解析対象ファイル。 |
| `line` | `Integer` | 1始まりのソース行。 |
| `column` | `Integer` | **1始まり**のカラム（Prismのカラムは0始まり。コンストラクタが1を加える）。 |
| `message` | `String` | 人間可読のテキスト。 |
| `severity` | `Symbol` | プロファイルによる再スタンプ前の*作成時の*深刻度（`:error` / `:warning` / `:info`）（[深刻度解決](../../type-specification/diagnostic-policy/#severity-resolution)）。 |
| `rule` | `String?` | 安定したkebab-caseのルールID（`call.undefined-method`）。`CheckRules`が生成しないdiagnostic（パースエラー、パスエラー、内部アナライザーエラー）では`nil`。`nil`ルールのdiagnosticは**抑制不能**。 |
| `source_family` | `Symbol` | ルールの生成元。デフォルトは`:builtin`。非デフォルトのファミリーは由来情報を保持する（`"plugin.<id>"`、`:rbs_extended`、`:generated`）。 |
| `receiver_type` | `String?` | 構造化フィールド ── ディスパッチ対象を持つcall/defルールのレンダリング済みレシーバー型。それ以外は`nil`。 |
| `method_name` | `String?` | 構造化フィールド ── ディスパッチ対象を持つcall/defルールの呼び出し先／定義先メソッド名。それ以外は`nil`。 |
| `project_definition_site` | `String?` | `"path:line"`。プロジェクト自身が呼び出し先メソッドを解析対象集合内の別の場所で定義しているとき（ディスパッチャーがファイル横断では適用しない再オープンされたクラス）、`call.undefined-method`が設定する。他のすべてのdiagnosticでは`nil`。 |

`receiver_type` / `method_name`が存在するのは、`rigor triage`の認識器
（[ADR-23](../../adr/23-diagnostic-triage-command/)）とADR-61のエージェント統計ワークフローが、メッセージをパースする代わりにこの構造化ペアを読むためです。これらが`nil`であるとわかったコンシューマーはメッセージパースにフォールバックします。これらは、ディスパッチ対象を持つcall/defルール（例: `call.undefined-method`、アリティ／引数ルール、`def.*`オーバーライドルール）によって設定され、レシーバー／メソッド対象を持たない`flow.*`ルールおよびivarルールでは`nil`のままです（[ADR-61](../../adr/61-agent-friendly-diagnostic-statistics/) WD4）。`project_definition_site`の存在は、トリアージが`pre_eval:`を推奨するための足がかりとする、確度の高い「バグではなくプロジェクトのモンキーパッチ」シグナルです（[ADR-17](../../adr/17-monkey-patch-pre-evaluation/)）。

## ルールごとのJSONエンリッチメント（`evidence_tier` / `documentation_url`）

さらに2つのフィールドが`rigor check --format json`のdiagnosticストリームに現れますが、これらは`Diagnostic`オブジェクト自体には**載りません** ── これらはルールIDのみから導出される`Rigor::Analysis::RuleCatalog`の*ルールごとの*プロパティで、CLIのJSONパスが各組み込みdiagnosticに付加します（[ADR-65](../../adr/65-diagnostic-evidence-tier-and-doc-url/)）。

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `evidence_tier` | `String?` | 発火が真陽性であることへのRigor自身の確度: `"high"` / `"medium"` / `"low"`。ティアを持たない情報ルールでは**省略**されます（不在）。`severity`とは直交し、決してゲートしません。 |
| `documentation_url` | `String` | 公開されたdiagnosticsカタログ（`docs/manual/04-diagnostics.md#…`）への、安定したルールごとのURL。 |

両者は`CLI::CheckCommand#enrich_json`において、`source_family`がデフォルトの`:builtin`であり、かつ`rule`が非`nil`であるdiagnosticに対してのみ付加されます。プラグイン／`rbs_extended`／パースエラーのdiagnosticはそのまま残されます（これらは独自のドキュメントと確度を持ちます）。同じ2つのフィールドは、`rigor explain` / `rigor explain --format json`が公開する各`Entry#to_h`にも現れます。

## 構築と位置の規約

2つのファクトリーが負荷を担う位置の規約を内部化しており、呼び出し側がそれを再導出しなくて済むようにしています。

- `Diagnostic.from_node(node, path:, message:, …)` ── `node`の位置で、`line = node.location.start_line`、`column = node.location.start_column + 1`。
- `Diagnostic.from_location(location, path:, message:, …)` ── 明示的なPrismのlocationから同じ規約を用い、*サブロケーション*（多くは呼び出しの`message_loc`、すなわちレシーバーをまたぐノード全体ではなくマッチャー／メソッド名）を指すために使う。`from_node`は`from_location(node.location, …)`の糖衣構文。

プラグイン作者は（これらをラップする）`Plugin::Base#diagnostic`を呼び出し、`source_family`を設定してはならない（MUST NOT）。ランナーがプラグインの由来情報をスタンプします。コアルールやその他の生成元はファクトリーを直接呼び出してもかまいません。

## `qualified_rule`の導出と由来

`#qualified_rule`は、コンシューマーが足がかりとする識別子です（抑制、ベースラインバケット、`--format json`）。これは次でなければなりません（MUST）。

- `rule`が`nil`のときは`nil`。
- `source_family`がデフォルトの`:builtin`のときは`rule`そのまま。
- それ以外のときは`"<source_family>.<rule>"`。これにより、プラグインルールは`plugin.<id>.<rule>`として、RBS::Extendedルールは`rbs_extended.<rule>`として、生成シグネチャルールは`generated.<provider>.<rule>`として現れる（[ADR-2](../../adr/2-extension-api/) § "Plugin Diagnostic Provenance"）。

`#to_s`（`rigor check`のテキスト行`path:line:column: severity: message`）は、`source_family`が非デフォルトのときにのみ`[<qualified_rule>]`を末尾に付けます。これにより、組み込みルールのレイアウトを変えることなく由来が見えるようになります。
