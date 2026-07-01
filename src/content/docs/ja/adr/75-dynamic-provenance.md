---
title: "ADR-75 — `Dynamic[T]`のprovenanceと説明"
description: "rigortype/rigor docs/adr/75-dynamic-provenance.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/75-dynamic-provenance.md"
sourcePath: "docs/adr/75-dynamic-provenance.md"
sourceSha: "4acb9702678de0b6c6295ac43ac67752debdf12904902af8f2d853f6b13fe14b"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
translationStatus: "translated"
sidebar:
  order: 4075
---

ステータス: **Accepted — 2026-06-24に実装済み（`01e291cb`）**。 `Dynamic[T]`は、検証されていないソースから得た値のキャリア（carrier）としてすでに正しいものですが、エンジンはある値がなぜdynamicになったのか——その*理由*——を記録していませんでした。このADRは精度加算的な**provenance**サイドチャネルを追加します。これはキャリアに（内部にではなく）並走して運ばれ、`coverage --protection`のラベルと`--format json`メタデータを通じて加算的に表面化される、dynamic起源の原因を表す小さな固定集合です。これにより、ユーザー（またはエージェント）は対処可能な穴（RBSをインストールする、プラグインを有効化する）と対処不能な穴（フレームワークDSLの境界）を、`untyped = Dynamic[top]`関係の意味論を変えることなく区別できるようになります。ここで追加されるものは診断を発火させず、深刻度にも影響しません。

根拠: [2026-06-22の互換安全な強化サーベイ](../../notes/20260622-rigor-0.2.x-compatibility-safe-strengthening-survey/)§3 / P2（最も価値の高い*説明的*レバー）と、[ADR-73](../73-skill-driven-user-experience/)のフィールドトライアルのフォローアップ「coverage-tractabilityラベル」——これは`Dynamic`のprovenance追跡をブロッキングな前提条件として名指しし、「（`Dynamic[T]`キャリアに触れるため）おそらくそれ自体が1つのADRになる」とフラグを立てていました。

## コンテキスト

`rigor coverage --protection`（[ADR-63](../63-type-protection-coverage/)）は、各ディスパッチサイトについて、そのレシーバーが具体的な（`Dynamic`でない）クラスに型付けされるかどうか——「Rigorはここで誤った呼び出しを捕捉できるか」——でスコアを付け、ランク付けされた「ここに型を追加する」リストを報告します。このリストは正直ですが不器用です。`Inference::ProtectionScanner`の`Site`はレシーバーの*記述*を運びますが、エンジンが知っているのはレシーバーが`Dynamic`であることだけで、**それがなぜそうなったのかは知りません**（`protection_scanner.rb:73`、`when Type::Dynamic, Type::Top then false`）。このリストを追いかけるユーザーは、手書きのRBSで塞げる穴（`.rbs`を持たない外部gem）と、塞げない穴（フレームワークDSL／マクロ境界を越える値、アナライザーの予算カットオフ、明示的な`untyped`契約）を区別できません。

`Dynamic`キャリア自体は意図的に薄く作られています。`dynamic.rb`は単一の`static_facet`を保持し、frozenであり、`value_fields :static_facet`の値意味論を使うため、2つの`Dynamic[String]`値は`==`となり、ユニオンやキャッシュ内で重複排除されます。この等価性は不可欠であり、provenanceをどのように付加できるかを制約します（WD1）。

エンジンにはすでに部分的な起源シグナルがあります。`Inference::FallbackTracer`と`Inference::BudgetTrace`はいくつかのフォールバック／カットオフのイベントを記録していますが、これは診断トレースの配管であって、protectionサーフェスが消費できる、値ごとに問い合わせ可能な起源ではありません。

## 決定

dynamic値の**provenance**は、小さく固定された、文書化された原因集合のうちの1つです。エンジンは`Dynamic`が導入された時点でそれを副次的ファクトとして記録し、加算的に表面化します。原因集合（v1）:

| cause id | 意味 |
| --- | --- |
| `external-gem-without-rbs` | 解決可能なRBSを持たないgemからのレシーバー／戻り値（`RbsCoverageReport`の`:missing`クラス） |
| `framework-dsl-boundary` | マクロ／DSL展開（[ADR-16](../16-macro-expansion/)）を越えて生成された値、またはプラグインが宣言したdynamicな戻り値 |
| `analyzer-budget-cutoff` | `Dynamic`へ拡大された予算／燃料ガード（[ADR-41](../41-inference-budget-design/)、`BudgetTrace`） |
| `explicit-untyped` | 値の型が著者による`untyped`契約であること |
| `unsupported-syntax` | エンジンがモデル化していない構文に対する推論フォールバック |

### WD1 — provenanceはサイドチャネルのファクトであり、決してキャリア上のフィールドにはしない

provenanceは`Type::Dynamic`に**追加されません**。フィールドを追加すると、`Dynamic[T]`をユニオンやキャッシュキー内で重複排除する`value_fields :static_facet`の等価性が壊れてしまいます——同じ型だが異なる経路でdynamismに到達した2つの値は`==`のままでなければならず、格子（lattice）は起源によって分岐してはなりません。代わりにprovenanceは、導入サイトのASTノードをキーとする並行した起源マップに存在し、`ProtectionScanner`がサイトを分類する際にこれを読み取ります。これによりキャリア、格子、キャッシュはそのままに保たれます。

**実装として:**このマップは`Scope#dynamic_origins`であり、`compare_by_identity`によるidentityキーのサイドテーブルで、各導入サイトで`Scope#record_dynamic_origin`によって書き込まれます（`ExpressionTyper#fallback_for` → `unsupported-syntax`、`BudgetTrace`の再帰カットオフ → `analyzer-budget-cutoff`、`MethodDispatcher`のプロジェクトパッチ済み／依存ソース階層 → `external-gem-without-rbs`、プラグインのdynamicな戻り値 → `framework-dsl-boundary`、RBSの`Dynamic[Top]`戻り値 → `explicit-untyped`）。これは意図的に、トレース専用の`FallbackTracer`（初期の草案でのチョークポイント）には運ばれません——このレコーダーは`rigor trace`の外ではnilであるため、通常の実行ではprovenanceが一切運ばれないことになり、常に生成される`Scope`のサイドテーブルこそが正しい置き場所です。`Scope#==` / `#hash`はこれを除外し（ADR-53の`DiscoveryIndex`リトマス試験）、フロー状態の重複排除やキャッシュキーを決して分岐させません。また`#join`はこれを参照渡しでコピーし、中身を検査しません。

### WD2 — 加算的に、文字列ではなく構造化して表面化する

provenanceは[ADR-61](../61-agent-friendly-diagnostic-statistics/)に従い、**加算的な**出力としてのみ露出されます。

- `coverage --protection`は各「ここに型を追加する」穴に、その原因と対処可能性のヒント（RBSで塞げるか、DSL／境界によるものか）を注釈し、
- `coverage --protection --format json`は各サイトに`dynamic_origin`フィールドを運びます（nilのときは省略）。これにより、エージェントはラベル文字列を解析するのではなく、このデータ自体を分岐条件にできます。

既存のフィールド、比率、ルールidは一切変わらず、メッセージテキストは提示上のものにとどまります。

### WD3 — `Dynamic[T]`の関係の意味論を保つ

provenanceはサブタイピング、漸進的一貫性、正規化、消去のいずれにも一切関与しません。`untyped = Dynamic[top]`は変わりません（`special-types.md`、`value-lattice.md`の縛り）。provenanceはdynamicな値*についての*メタデータであり、*その値が何であるか*の一部ではありません。既知の原因を持つ`Dynamic`と`nil`の原因を持つ`Dynamic`は同一に関係します。

### WD4 — 将来のstrict-dynamic規律との関係

provenanceは、後のstrict-dynamicポリシー（説明のつかない`Dynamic`値をエラーにする）が参照するであろう**証拠基盤**ですが、その強制は新しい著作規律であり、`bleeding_edge:`オーバーレイの裏に属します（[ADR-50](../50-release-engineering-and-stability-strategy/)。最初のそうした規律はこのADRに依存する、それ自身のADRになります）。このADRが出荷するのは説明のみです——義務は一切追加せず、クリーンな実行を壊しません。

## 却下／先送りした代替案

- **`Type::Dynamic`に`provenance:`フィールドを追加する**。 `Dynamic[T]`をユニオンやキャッシュキー内で重複排除する`value_fields`の等価性を壊し、値の格子を起源によって分岐させます——純粋に説明的なデータのために健全性とキャッシュ正当性のリスクを負うことになります。却下。サイドチャネルマップ（WD1）が、そのリスクなしに同じ情報を提供します。
- **provenanceをハードでデフォルトオンな診断にする**（「この値はdynamicです。なぜなら…」）。偽陽性の規律に違反します——dynamicな値はエラーではなく、その多くは正しいものです。あらゆる強制は`bleeding_edge:`へ先送りされます（WD4）。
- **provenanceをレポート時に遅延推論する**——レシーバーがなぜdynamicなのかを再導出することによって。誤った層で推論の推論をやり直すことになり、エンジンの実際のフォールバック経路と食い違う可能性があります。導入サイトで記録すること（WD1）こそが単一の真実の源です。

## 帰結

- **ポジティブ:**汎用的な「dynamicなレシーバー」の穴を次のアクション（RBSをインストールする／プラグインを有効化する／アナライザーのギャップを報告する）へと変え、ADR-73のcoverage-tractabilityラベルのフォローアップの障害を取り除き、`rigor-next-steps`や将来の`rigor doctor`のルーティングを鋭くします。また、いずれ来るstrict-dynamic規律に、計測された証拠基盤を与えます。
- **ネガティブ:**新しい構造化された`dynamic_origin`フィールドは、露出されると（ADR-50 WD1のもとv1.0で凍結される）公開語彙になるため、原因idは慎重に選ばれなければなりません。起源マップは`FallbackTracer`のチョークポイントに小さな実行ごとのサイドテーブルを追加します。
- **持ち越し:**原因集合はv1では意図的に粗くしてあります。より細かい原因（どの予算か、どのDSLか）は同じフィールドへの需要ゲート付きの追加です。

## 他のADRとの関係

- [ADR-63](../63-type-protection-coverage/) — provenanceを消費し、protectionの穴を対処可能性でラベル付けします。
- [ADR-61](../61-agent-friendly-diagnostic-statistics/) — これが表面化される先の、構造化・非文字列の規則です。
- [ADR-50](../50-release-engineering-and-stability-strategy/) — provenanceの上に構築されるstrict-dynamic規律は`bleeding_edge:`経由で出荷されます。
- [ADR-41](../41-inference-budget-design/) — 予算カットオフはprovenanceの原因の1つです。
