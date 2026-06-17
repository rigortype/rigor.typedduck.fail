---
title: "診断"
description: "rigortype/rigor docs/manual/04-diagnostics.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/04-diagnostics.md"
sourcePath: "docs/manual/04-diagnostics.md"
sourceSha: "7791d667ab63414300ff3688597972c68f0d5ba1ec12dc6bbdec1f96341b9321"
sourceCommit: "a3ab53dd2b8aa0a84fd7ddbd64339f316d8d12ec"
sourceDate: "2026-06-15T14:10:58+09:00"
translationStatus: "translated"
sidebar:
  order: 9004
---

`rigor check`が問題を見つけると**診断**を報告します: ファイル、行と列、重要度、ルールID、メッセージ。このページはルールカタログ、重要度モデル、抑制のリファレンスです。各ルールの*根拠*については[ハンドブック第8章](../../handbook/08-understanding-errors/)を参照してください。

## ルールID

すべてのルールは`family.rule`という2セグメントの識別子を持ちます:

| ファミリー | 対象 |
| --- | --- |
| `call` | コールサイト——未定義メソッド、引数の数、引数の型、nilレシーバー。 |
| `flow` | 制御フロープルーフ——常に例外、デッドブランチ、定数条件。 |
| `def` | メソッド定義——戻り値型、ivar書き込み、可視性。 |
| `assert` | `assert_type`チェック。 |
| `dump` | `dump_type`通知。 |

`rigor explain <rule>`は任意のIDのカタログエントリー全体を表示します。引数なしの`rigor explain`はすべてを一覧表示します。

### カタログ

各ルールはこのページ上に安定したルール単位のアンカー（`#rule-<family>-<name>`、ドットはダッシュで書く）を持ちます——`--format json`の`documentation_url`フィールドと`rigor explain`の`Documentation:`行はどちらもここを指します。`Evidence`列は、発火が真陽性であることへのRigorの確信度です（下記の[エビデンスティア](#エビデンスティア)を参照）。

| ルール | 発火条件 | Evidence |
| --- | --- | --- |
| <a id="rule-call-undefined-method"></a>`call.undefined-method` | メソッドが受信側の静的に既知のクラスで定義されていない。 | high |
| <a id="rule-call-self-undefined-method"></a>`call.self-undefined-method` | レシーバーのない暗黙的self呼び出しが、確実にクローズドな単独クラス上のどのメソッドにも解決されない。`:off`で出荷;`severity_overrides`でオプトインする。 | low |
| <a id="rule-call-wrong-arity"></a>`call.wrong-arity` | 位置引数の数がどのシグネチャとも一致しない。 | high |
| <a id="rule-call-argument-type-mismatch"></a>`call.argument-type-mismatch` | 引数の型がパラメータ契約（contract）に違反することが証明できる。 | high |
| <a id="rule-call-possible-nil-receiver"></a>`call.possible-nil-receiver` | 受信側が`T \| nil`で、メソッドが`NilClass`で定義されていない。 | high |
| <a id="rule-call-unresolved-toplevel"></a>`call.unresolved-toplevel` | トップレベルの暗黙的self呼び出しが、同一ファイルの`def`、`pre_eval:`パッチ、`Kernel` / `Object`メソッドのいずれにも解決されない。 | low |
| <a id="rule-flow-always-raises"></a>`flow.always-raises` | 式が到達可能なすべてのパスで例外を投げることが証明できる。 | high |
| <a id="rule-flow-unreachable-branch"></a>`flow.unreachable-branch` | `if` / `unless` / 三項演算子のブランチが静的に到達不能。 | high |
| <a id="rule-flow-always-truthy-condition"></a>`flow.always-truthy-condition` | 条件が証明可能に常に真または常に偽。 | medium |
| <a id="rule-flow-dead-assignment"></a>`flow.dead-assignment` | ローカル変数が同じメソッド内で書かれるが読まれない。 | medium |
| <a id="rule-flow-unreachable-clause"></a>`flow.unreachable-clause` | `case`/`when`または`case`/`in`の節が静的に到達不能。すなわちその対象の型がパターンと素であるか、先行する節がすでに対象を網羅している。 | medium |
| <a id="rule-def-return-type-mismatch"></a>`def.return-type-mismatch` | メソッドボディの結果が宣言されたRBSの戻り値型に違反する。 | medium |
| <a id="rule-def-ivar-write-mismatch"></a>`def.ivar-write-mismatch` | インスタンス変数が最初の書き込みと異なる型で書かれる。 | high |
| <a id="rule-def-method-visibility-mismatch"></a>`def.method-visibility-mismatch` | 明示的レシーバーの呼び出しがprivateメソッドに到達する。 | high |
| <a id="rule-def-override-visibility-reduced"></a>`def.override-visibility-reduced` | オーバーライドが、プロジェクト定義の祖先から継承した可視性を下げる。 | high |
| <a id="rule-def-override-return-widened"></a>`def.override-return-widened` | オーバーライドの宣言された戻り値型が、継承した戻り値型を広げる（共変性）。 | high |
| <a id="rule-def-override-param-narrowed"></a>`def.override-param-narrowed` | オーバーライドが、継承したパラメータ型を狭める（反変性）。 | high |
| <a id="rule-rbs_extended-unsatisfied-conformance"></a>`rbs_extended.unsatisfied-conformance` | クラスがRBSで`%a{rigor:v1:conforms-to _Interface}`を宣言しているが、インターフェースが要求するメソッドを欠いている。存在ベース: 明確に欠落している必須メソッドのみが発火する。 | — |
| <a id="rule-assert-type-mismatch"></a>`assert.type-mismatch` | `assert_type`の期待値が推論型と一致しない。 | high |
| <a id="rule-dump-type"></a>`dump.type` | `dump_type`呼び出し — 情報として推論型を出力する。 | — |

プラグインはさらにファミリーとルールを追加できます。`rigor explain`はアクティブな設定が読み込んだものをすべて一覧表示します。

## エビデンスティア

上記カタログのすべてのルールは**エビデンスティア（evidence tier）**を持ちます——発火が*真陽性*であることへのRigor自身の確信度で、そのルールの発火ゲートから導かれます。これは重要度（影響度）とも重要度プロファイルとも直交しています。ティアが診断を表に出すかどうかを変えることは決してなく、注意の振り向け先を決めるだけです。

| ティア | 意味 |
| --- | --- |
| `high` | 具象的で静的に既知の型に対し、メタプログラミングによる抜け道がない場合にのみ発火する。Rigorの偽陽性の規律がすでに不確かなケースを濾過済みなので、発火はほぼ常に実際の問題である——コンシューマーは別のツールと突き合わせることなくそれに基づいて行動できる（あるいは下流の分類器がそれを信頼できる）。 |
| `medium` | フローレベルまたは推論レベルの証明に依拠しており、文書化された偽陽性のエンベロープ（ループ / 変異 / RBSの厳格さのモデル化のギャップで、ルールの*発火しない条件*リストによって絞り込まれる）を継承する。たいてい正しいが、文字どおりに証明可能ではない。 |
| `low` | 解決またはカバレッジのギャップのシグナル: 発火は確定的なバグというより、アナライザーが見られないコンテキスト（未解析のファイル、メタプログラミングのパッチ）を反映していることが多い。「これをレビューせよ」として扱う——例えば`call.unresolved-toplevel`を`pre_eval:`の判断へ振り向ける。 |

情報用のルール（`dump.type`）はティアを持ちません。ルール単位のティアはルールカタログにおける唯一の信頼できる情報源です——`rigor explain <rule>`または`rigor explain --format json`で読み、`rigor check --format json`（後述）の各診断にもエコーされます。

## 重要度プロファイル

各ルールは作成時の重要度で発行され、その後**プロファイル**が実行時に再スタンプします。`severity_profile:`設定キーで設定する3つのプロファイルがあります:

| プロファイル | スタンス |
| --- | --- |
| `lenient` | 証明された診断のみがエラー。不確かなものは`warning` / `info`に下がる。レガシーコードへの段階的導入向け。 |
| `balanced` *（デフォルト）* | ほとんどのルールが`error`。`dump.type`は`info`。不確かなルールは`warning`。 |
| `strict` | すべてのルールが`error`。CIに適している。 |

より細かい制御のために、`severity_overrides:`はルールIDまたはファミリーを`error`、`warning`、`info`、または`off`のいずれかにマッピングします:

```yaml
severity_profile: balanced
severity_overrides:
  flow.always-truthy-condition: off
  call: warning
```

ルール固有のオーバーライドはファミリーオーバーライドより優先されます。

## 機械可読な出力（`--format json`）

`rigor check --format json`は、エディタ、CI、AIエージェント向けに診断をJSONドキュメントとして出力します。各診断は**安定した構造化フィールド**を持つオブジェクトです——だからコンシューマーはそれらを直接フィルタ・グループ化し、**人間可読な`message`を決して解析しません**（その文面はプレゼンテーションであって契約ではなく、マイナーリリースで書き換わる可能性があります）:

| フィールド | 存在 | 意味 |
| --- | --- | --- |
| `path` / `line` / `column` | 常時 | 位置（1始まりの行と列）。 |
| `severity` | 常時 | `error` / `warning` / `info`。 |
| `rule` | 常時（パース / 内部エラーでは`null`） | `family.rule`ID。 |
| `source_family` | 常時 | `builtin`、`rbs_extended`、`generated.*`、または`plugin.<id>`。 |
| `message` | 常時 | 人間可読なテキスト——*プレゼンテーションであって契約ではない*。 |
| `receiver_type` | ルールにレシーバーがあるとき | 呼ばれたレシーバーの表示型（`String`、`Array[User]`、…）。 |
| `method_name` | ルールにメソッドがあるとき | 呼ばれた / 定義されたメソッド名。 |
| `project_definition_site` | `call.undefined-method`のモンキーパッチケース | プロジェクト自身がそのメソッドを定義している`path:line`（ADR-17）。 |
| `evidence_tier` | ティアを持つ組み込みルール | `high` / `medium` / `low`——発火が真陽性であることへのRigorの確信度（[エビデンスティア](#エビデンスティア)）。 |
| `documentation_url` | 組み込みルール | このカタログ内のそのルールのエントリーへの安定したURL。 |

`evidence_tier`はコンシューマーが確信度を再導出することなく優先順位を付けられるようにします——例えば厳格なCIゲートで`high`の発火だけを表に出したり、`low`の発火を人間のレビューキューへ振り向けたりできます:

```sh
# only the high-confidence diagnostics
rigor check --format json \
  | jq '[.diagnostics[] | select(.evidence_tier == "high")]'
```

### カバレッジブロック（`--coverage`）

`rigor check --coverage`はトップレベルの`coverage`オブジェクトを追加し、1回の実行で*何が発火したか*と*解析されたサーフェスのうちどれだけをRigorが型付けできたか*の両方を報告できるようにします——診断件数が多いときに「全ファイルを解析したのか、それとも一部だけか？」という疑問が生じる場合に役立ちます。このブロックは`rigor check`の兄弟である[`rigor coverage`](../02-cli-reference/#rigor-coverage)の`summary`を映したもので（同じ精度ティアの語彙）、加えて`scan_files`を持ちます:

```jsonc
"coverage": {
  "scan_files":            203,
  "parse_errors":          0,
  "expressions_typed":     18394,
  "precise_count":         9847,
  "precise_ratio":         0.535,
  "dynamic_opaque_count":  8547,
  "dynamic_opaque_ratio":  0.465
}
```

これは**デフォルトではオフ**です——その計算は解析対象ファイルに対する2度目の精度パスだからです——なので、デフォルトのチェックパスのコストは変わりません。テキストモードでは`--coverage`は代わりに1行のサマリーを表示します。ファイル単位 / ティア単位の完全な内訳には、`rigor coverage`を直接実行してください。

`receiver_type` / `method_name`のペアはcallファミリーのルールとメソッドレベルの`def.*`ルールが埋めます。メッセージ解析なしで、`jq`を使って呼ばれたクラスとメソッドで実行をグループ化できます:

```sh
# every diagnostic that names a method, as {receiver, method, rule}
rigor check --format json \
  | jq '[.diagnostics[] | select(.method_name) | {receiver: .receiver_type, method: .method_name, rule}]'
```

`check`ストリームは**サイトごとに忠実**です——リテラルレシーバーはそのリテラル型（`"hi"`、`42`）を報告します。**集約**ビュー——実行全体にわたるクラス／メソッドごとのカウントで、リテラルレシーバーはそのクラスに畳み込まれる——には、[`rigor triage`](../02-cli-reference/)の`selectors`セクションを使ってください。

## 診断の抑制

最も狭い範囲から広い範囲まで3つのレイヤーがあります。

**ソース内、1行**。末尾コメントでその行の指定したルールを抑制します:

```ruby
config.merge(extra)  # rigor:disable call.undefined-method
```

修飾IDファミリーワイルドカード（`call`）、カンマまたはスペース区切りのリスト、または`all`を受け付けます。

**ソース内、ファイル全体**。ファイル内のどこかに`# rigor:disable-file <rules>`を記述すると、すべての行でそれらのルールが抑制されます。`# rigor:disable-file all`でファイルを黙らせます。

**プロジェクト全体**。`disable:`設定キーで実行全体のルールをオフにします:

```yaml
disable:
  - flow.dead-assignment
```

表示は維持したいが失敗させたくない*既知のバックログ*には、`disable:`の一括設定より[ベースライン](../06-baseline/)を使用してください——`disable:`は新しい発生も隠してしまいます。
