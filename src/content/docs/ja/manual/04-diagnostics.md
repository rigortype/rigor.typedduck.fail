---
title: "診断"
description: "rigortype/rigor docs/manual/04-diagnostics.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/04-diagnostics.md"
sourcePath: "docs/manual/04-diagnostics.md"
sourceSha: "257a3e0ead3f0bd6c2fb399917780db3a4411c7a9372809902b1b7530a29d3d1"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
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
| `call` | コールサイト: 未定義メソッド、引数の数、引数の型、nilレシーバー。 |
| `flow` | 制御フロープルーフ: 常に例外、デッドブランチ、定数条件。 |
| `def` | メソッド定義: 戻り値型、ivar書き込み、可視性。 |
| `assert` | `assert_type`チェック。 |
| `dump` | `dump_type`通知。 |

`rigor explain <rule>`は任意の組み込みルールIDのカタログエントリー全体を表示します。引数なしの`rigor explain`はすべてを一覧表示します。

### カタログ

各組み込みルールはこのページ上に安定したルール単位のアンカー（`#rule-<family>-<name>`、ドットはダッシュで書く）を持ちます。`--format json`の`documentation_url`フィールドと`rigor explain`の`Documentation:`行はどちらもここを指します。`Evidence`列は、発火が真陽性であることへのRigorの確信度です（下記の[エビデンスティア](#エビデンスティア)を参照）。唯一の例外は`rbs_extended.unsatisfied-conformance`で、これは組み込みルールではなく`rbs_extended`ファミリーのルールです: `rigor explain`はこれを解決せず、`documentation_url`も持ちません。

| ルール | 発火条件 | Evidence |
| --- | --- | --- |
| <a id="rule-call-undefined-method"></a>`call.undefined-method` | メソッドが受信側の静的に既知のクラスで定義されていない。 | high |
| <a id="rule-call-self-undefined-method"></a>`call.self-undefined-method` | レシーバーのない暗黙的self呼び出しが、確実にクローズドな単独クラス上のどのメソッドにも解決されない。`:off`で出荷;`severity_overrides`でオプトインする。 | low |
| <a id="rule-call-wrong-arity"></a>`call.wrong-arity` | 位置引数の数がどのシグネチャとも一致しない。 | high |
| <a id="rule-call-argument-type-mismatch"></a>`call.argument-type-mismatch` | 引数の型がパラメータ契約（contract）に違反することが証明できる。 | high |
| <a id="rule-call-possible-nil-receiver"></a>`call.possible-nil-receiver` | 受信側が`T \| nil`で、メソッドが`NilClass`で定義されていない。 | high |
| <a id="rule-call-raise-non-exception"></a>`call.raise-non-exception` | `raise` / `fail`の引数の具体型が、Exceptionクラス、Exceptionインスタンス、String、`#exception`を定義するオブジェクトのいずれでもないと証明される。実行時の`TypeError`。 | high |
| <a id="rule-call-unresolved-toplevel"></a>`call.unresolved-toplevel` | トップレベルの暗黙的self呼び出しが、同一ファイルの`def`、`pre_eval:`パッチ、`Kernel` / `Object`メソッドのいずれにも解決されない。 | low |
| <a id="rule-flow-always-raises"></a>`flow.always-raises` | 式が到達可能なすべてのパスで例外を投げることが証明できる。 | high |
| <a id="rule-flow-unreachable-branch"></a>`flow.unreachable-branch` | `if` / `unless` / 三項演算子のブランチが静的に到達不能。 | high |
| <a id="rule-flow-always-truthy-condition"></a>`flow.always-truthy-condition` | 条件が証明可能に常に真または常に偽。 | medium |
| <a id="rule-flow-dead-assignment"></a>`flow.dead-assignment` | ローカル変数が同じメソッド内で書かれるが読まれない。 | medium |
| <a id="rule-flow-unreachable-clause"></a>`flow.unreachable-clause` | `case`/`when`または`case`/`in`の節が静的に到達不能。すなわちその対象の型がパターンと素であるか、先行する節がすでに対象を網羅している。 | medium |
| <a id="rule-flow-duplicate-hash-key"></a>`flow.duplicate-hash-key` | Hashリテラルがリテラルキー（シンボル、素の文字列、整数、浮動小数点数、`true`/`false`/`nil`）を繰り返す。実行時には最後のエントリーが先行するものを静かに上書きする。リテラルキーのみが対象。シンボルと文字列、`1`と`1.0`は衝突せず、補間・定数・計算されたキーは決して比較されない。2つの同一リテラルキーの間に`**splat`があってもそのペアは救済されない。 | high |
| <a id="rule-flow-return-in-ensure"></a>`flow.return-in-ensure` | `ensure`節内の明示的な`return`。メソッドの実行中の戻り値を上書きし、実行中の例外を静かに握りつぶす。`ensure`内のネストした`def`、ラムダ、`define_method`ブロック内の`return`は発火しない（それは内側のフレームを抜けるだけ）。 | high |
| <a id="rule-flow-shadowed-rescue-clause"></a>`flow.shadowed-rescue-clause` | 同じチェーンの先行する節が、この節の挙げるすべての例外クラスのスーパークラス（または同一クラス）をすでに捕捉するため、この`rescue`節が決して実行されない。 | high |
| <a id="rule-def-return-type-mismatch"></a>`def.return-type-mismatch` | メソッドボディの結果が宣言されたRBSの戻り値型に違反する。 | medium |
| <a id="rule-def-ivar-write-mismatch"></a>`def.ivar-write-mismatch` | インスタンス変数が最初の書き込みと異なる型で書かれる。 | high |
| <a id="rule-def-method-visibility-mismatch"></a>`def.method-visibility-mismatch` | 明示的レシーバーの呼び出しがprivateメソッドに到達する。 | high |
| <a id="rule-def-override-visibility-reduced"></a>`def.override-visibility-reduced` | オーバーライドが、プロジェクト定義の祖先から継承した可視性を下げる。 | high |
| <a id="rule-def-override-return-widened"></a>`def.override-return-widened` | オーバーライドの宣言された戻り値型が、継承した戻り値型を広げる（共変性）。 | high |
| <a id="rule-def-override-param-narrowed"></a>`def.override-param-narrowed` | オーバーライドが、継承したパラメータ型を狭める（反変性）。 | high |
| <a id="rule-static-value-use-void"></a>`static.value-use.void` | 作者が宣言した`-> void`の戻り値から復元した値が、値コンテキスト（代入の右辺、呼び出しのレシーバー、または呼び出し引数）で使われている。既定ではオフで、`use-of-void-value`のbleeding-edge機能（ADR-100）を通じてのみ実行に到達する。素の文としての`void`呼び出しと、正当な`top`値はどちらも沈黙のまま。 | high |
| <a id="rule-effect-envelope-exceeded"></a>`effect.envelope-exceeded` | メソッドが、宣言されたエンベロープが認めないエフェクトを行っている——その証明済みエフェクトラベル（自身の本体と、それが呼ぶすべて）が、そのメソッドまたはそのクラスに書かれた`%a{pure}`または`%a{rigor:v1:effect …}`の境界にカバーされない。二重にオプトイン: `.rigor.yml`の`effects:`ブロックと、あなたが書いたエンベロープを必要とします。Rubyの`def`に位置づけられます。証明されていない（「そしておそらくそれ以上」）エフェクトは決して発火せず、`mutate.local`はあらゆるエンベロープに許容されます。 | high |
| <a id="rule-effect-liskov-widened"></a>`effect.liskov-widened` | オーバーライドが、それがオーバーライドするメソッドに書かれたエンベロープから逃れている。`PgRepo`は`Repo`が使えるどこでも使えるので、`Repo#find`上の`%a{rigor:v1:effect io.db}`は`PgRepo#find`も束縛します: 実装は継承する境界より純粋であってよく、決して純粋でなくてはなりません。オーバーライドが*行うこと*が継承した境界を超えているか、オーバーライドが*自身のために宣言する*エンベロープがそれより広いかのどちらかです。両側が作者によるものでなければなりません——誰かが祖先にエンベロープを書かない限り何も発火しません——そしてサブクラス化だけが数えられ、`include`は数えられません。オーバーライドの`def`に位置づけられます。`effects:`ブロックが必要です。 | high |
| <a id="rule-effect-unknown-label"></a>`effect.unknown-label` | エフェクト宣言がレジストリの知らないラベルを名指している——エンベロープ内のタイポ（`%a{rigor:v1:effect io.bd}`）、または`effects.tolerated:`のメンバー。タグ全体はそのとき無制限として読まれるので、宣言は黙って何もしなくなります;これがそう述べます。宣言に位置づけられます: `.rbs`の行、rbs-inlineアノテーションなら`.rb`の行、設定値なら`.rigor.yml`。`# rigor:disable`コメントは`.rbs`や`.rigor.yml`からは読まれないので、そこでは`disable:`かベースラインを使ってください。綴りが明らかにラベルのつもりである場所（既知のものに近い、既知のものの隣、ドット付き、または引退済み）でのみ発火します——何にも似ていない語は沈黙のままです。あなたが自身の語彙を開いているかもしれないからです。`effects:`ブロックが必要です。 | high |
| <a id="rule-effect-annotations-unchecked"></a>`effect.annotations-unchecked` | あなたのシグネチャが`%a{pure}` / `%a{rigor:v1:effect …}`を運んでいるが`.rigor.yml`に`effects:`ブロックがないので、何もそれらをチェックしません。実行ごとに1つの`:info`で、最初のアノテーションに位置づけられます。アノテーションはそれ自体では決してエフェクトの収集をオンにしません——それは1つのファイルの1行をあらゆる実行にとって高価にしてしまう——ので、代わりにこうして伝えます。オプトインするには`effects: {}`を加えるか、アノテーションを文書的なままにするならそれを`disable:`してください。 | — |
| <a id="rule-suppression-unknown-rule"></a>`suppression.unknown-rule` | `# rigor:disable[-file]`コメントが存在しないルール（多くはタイポ）を挙げているため、抑制が静かに何もしない。`plugin.`接頭辞付きのトークンは決してフラグされない。 | high |
| <a id="rule-suppression-empty"></a>`suppression.empty` | `# rigor:disable[-file]`コメントがルールを1つも挙げていないため、何も抑制しない。 | high |
| <a id="rule-suppression-unknown-marker"></a>`suppression.unknown-marker` | コメントがRigorの認識しない抑制マーカーを使っている。典型的にはRuboCopの反射で`# rigor:disable-next-line <rule>`や`# rigor:enable <rule>`。Rigorのマーカーは`# rigor:disable <rules>`（その行で抑制）と`# rigor:disable-file <rules>`だけなので、このコメントは何も抑制しない。 | high |
| <a id="rule-rbs_extended-unsatisfied-conformance"></a>`rbs_extended.unsatisfied-conformance` | クラスがRBSで`%a{rigor:v1:conforms-to _Interface}`を宣言しているが、インターフェースが要求するメソッドを欠いている。存在ベース: 明確に欠落している必須メソッドのみが発火する。 | — |
| <a id="rule-assert-type-mismatch"></a>`assert.type-mismatch` | `assert_type`の期待値が推論型と一致しない。 | high |
| <a id="rule-dump-type"></a>`dump.type` | `dump_type`呼び出し。情報として推論型を出力する。 | — |

プラグインはさらにファミリーとルールを追加できます。`rigor explain`はアクティブな設定が読み込んだものをすべて一覧表示します。

## エビデンスティア

上記カタログのすべてのルールは**エビデンスティア（evidence tier）**を持ちます。発火が*真陽性*であることへのRigor自身の確信度で、そのルールの発火ゲートから導かれます。これは重要度（影響度）とも重要度プロファイルとも直交しています。ティアが診断を表に出すかどうかを変えることは決してなく、注意の振り向け先を決めるだけです。

| ティア | 意味 |
| --- | --- |
| `high` | 具象的で静的に既知の型に対し、メタプログラミングによる抜け道がない場合にのみ発火する。Rigorの偽陽性の規律がすでに不確かなケースを濾過済みなので、発火はほぼ常に実際の問題である。コンシューマーは別のツールと突き合わせることなくそれに基づいて行動できる（あるいは下流の分類器がそれを信頼できる）。 |
| `medium` | フローレベルまたは推論レベルの証明に依拠しており、文書化された偽陽性のエンベロープ（ループ / 変異 / RBSの厳格さのモデル化のギャップで、ルールの*発火しない条件*リストによって絞り込まれる）を継承する。たいてい正しいが、文字どおりに証明可能ではない。 |
| `low` | 解決またはカバレッジのギャップのシグナル: 発火は確定的なバグというより、アナライザーが見られないコンテキスト（未解析のファイル、メタプログラミングのパッチ）を反映していることが多い。「これをレビューせよ」として扱う。例えば`call.unresolved-toplevel`を`pre_eval:`の判断へ振り向ける。 |

情報用のルール（`dump.type`）はティアを持ちません。ルール単位のティアはルールカタログにおける唯一の信頼できる情報源です。`rigor explain <rule>`または`rigor explain --format json`で読み、`rigor check --format json`（後述）の各診断にもエコーされます。

## 重要度プロファイル

各ルールは作成時の重要度で発行され、その後**プロファイル**が実行時に再スタンプします。`severity_profile:`設定キーで設定する3つのプロファイルがあります:

| プロファイル | スタンス |
| --- | --- |
| `lenient` | 証明された診断のみがエラー。不確かなものは`warning` / `info`に下がる。レガシーコードへの段階的導入向け。 |
| `balanced` *（デフォルト）* | ほとんどのルールが`error`。`dump.type`は`info`。不確かなルールは`warning`。 |
| `strict` | ほぼすべてのルールが`error`。例外は次のとおり: `call.self-undefined-method`と`static.value-use.void`は`off`のまま（どちらもオプトインのみ）、`flow.unreachable-clause`は偽陽性ゲート待ちで`warning`のまま、そして3つの`suppression.*`ルールは`warning`のまま —— 古くなった抑制コメントは知らせる価値があるが、ビルドを失敗させる理由にはならない。CIに適している。 |

`balanced`では、`error`として発行され**ない**ルールは次のとおりです:

| 重要度 | ルール |
| --- | --- |
| `warning` | `call.unresolved-toplevel`、`def.ivar-write-mismatch`、`def.return-type-mismatch`、`def.override-visibility-reduced`、`def.override-return-widened`、`def.override-param-narrowed`、`flow.unreachable-branch`、`flow.always-truthy-condition`、`flow.dead-assignment`、`flow.duplicate-hash-key`、`flow.return-in-ensure`、`flow.shadowed-rescue-clause`、`suppression.unknown-rule`、`suppression.empty`、`suppression.unknown-marker`、`effect.envelope-exceeded`、`effect.liskov-widened` |
| `info` | `flow.unreachable-clause`、`dump.type`、`effect.unknown-label`、`effect.annotations-unchecked` |
| `off` | `call.self-undefined-method`、`static.value-use.void` |

それ以外はすべて`error`として発行されます。任意の1つのルールについて、3つのプロファイルすべてにわたり、`rigor explain <rule>`は`Authored severity:`と`Severity by profile:`を表示します —— この出力はルールカタログ自体から生成されるため、ルール単位の真実の情報源です。

より細かい制御のために、`severity_overrides:`はルールIDまたはファミリーを`error`、`warning`、`info`、または`off`のいずれかにマッピングします:

```yaml
severity_profile: balanced
severity_overrides:
  flow.always-truthy-condition: off
  call: warning
```

ルール固有のオーバーライドはファミリーオーバーライドより優先されます。`off`は診断を結果から完全に除去するため、`severity_overrides:`は下記の`disable:`のより軽いタッチの兄弟になります —— どちらもルールを黙らせますが、オーバーライドはプロファイルの残りと並んで「この1つのルールを、この重要度で」と読めます。

YAMLはベアワードの`off`をブール値として予約しています。それを指定するオーバーライドが適用されないように見える場合は、`"off"`と引用符で囲んでください —— `on`も同様です。

## 機械可読な出力（`--format json`）

`rigor check --format json`は、エディタ、CI、AIエージェント向けに診断をJSONドキュメントとして出力します。各診断は**安定した構造化フィールド**を持つオブジェクトです。だからコンシューマーはそれらを直接フィルタ・グループ化し、**人間可読な`message`を決して解析しません**（その文面はプレゼンテーションであって契約ではなく、マイナーリリースで書き換わる可能性があります）:

| フィールド | 存在 | 意味 |
| --- | --- | --- |
| `path` / `line` / `column` | 常時 | 位置（1始まりの行と列）。 |
| `severity` | 常時 | `error` / `warning` / `info`。 |
| `rule` | 常時（パース / 内部エラーでは`null`） | `family.rule`ID。 |
| `source_family` | 常時 | `builtin`、`rbs_extended`、`generated.*`、または`plugin.<id>`。 |
| `message` | 常時 | 人間可読なテキスト: *プレゼンテーションであって契約ではない*。 |
| `receiver_type` | ルールにレシーバーがあるとき | 呼ばれたレシーバーの表示型（`String`、`Array[User]`、…）。 |
| `method_name` | ルールにメソッドがあるとき | 呼ばれた / 定義されたメソッド名。 |
| `project_definition_site` | `call.undefined-method`のモンキーパッチケース | プロジェクト自身がそのメソッドを定義している`path:line`（ADR-17）。 |
| `evidence_tier` | ティアを持つ組み込みルール | `high` / `medium` / `low`: 発火が真陽性であることへのRigorの確信度（[エビデンスティア](#エビデンスティア)）。 |
| `documentation_url` | 組み込みルール | このカタログ内のそのルールのエントリーへの安定したURL。 |

`evidence_tier`はコンシューマーが確信度を再導出することなく優先順位を付けられるようにします。例えば厳格なCIゲートで`high`の発火だけを表に出したり、`low`の発火を人間のレビューキューへ振り向けたりできます:

```sh
# only the high-confidence diagnostics
rigor check --format json \
  | jq '[.diagnostics[] | select(.evidence_tier == "high")]'
```

### カバレッジブロック（`--coverage`）

`rigor check --coverage`はトップレベルの`coverage`オブジェクトを追加し、1回の実行で*何が発火したか*と*解析されたサーフェスのうちどれだけをRigorが型付けできたか*の両方を報告できるようにします。診断件数が多いときに「全ファイルを解析したのか、それとも一部だけか？」という疑問が生じる場合に役立ちます。このブロックは`rigor check`の兄弟である[`rigor coverage`](../02-cli-reference/#rigor-coverage)の`summary`を映したもので（同じ精度ティアの語彙）、加えて`scan_files`を持ちます:

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

これは**デフォルトではオフ**です（その計算は解析対象ファイルに対する2度目の精度パスだからです）。なので、デフォルトのチェックパスのコストは変わりません。テキストモードでは`--coverage`は代わりに1行のサマリーを表示します。ファイル単位 / ティア単位の完全な内訳には、`rigor coverage`を直接実行してください。

`receiver_type` / `method_name`のペアはcallファミリーのルールとメソッドレベルの`def.*`ルールが埋めます。メッセージ解析なしで、`jq`を使って呼ばれたクラスとメソッドで実行をグループ化できます:

```sh
# every diagnostic that names a method, as {receiver, method, rule}
rigor check --format json \
  | jq '[.diagnostics[] | select(.method_name) | {receiver: .receiver_type, method: .method_name, rule}]'
```

`check`ストリームは**サイトごとに忠実**です。リテラルレシーバーはそのリテラル型（`"hi"`、`42`）を報告します。**集約**ビュー（実行全体にわたるクラス／メソッドごとのカウントで、リテラルレシーバーはそのクラスに畳み込まれる）には、[`rigor triage`](../02-cli-reference/)の`selectors`セクションを使ってください。

## 診断の抑制

最も狭い範囲から広い範囲まで3つのレイヤーがあります。

**ソース内、1行**。末尾コメントでその行の指定したルールを抑制します:

```ruby
config.merge(extra)  # rigor:disable call.undefined-method
```

修飾IDファミリーワイルドカード（`call`）、カンマまたはスペース区切りのリスト、または`all`を受け付けます。コメントは診断が指す行に置かなければなりません。`disable-block`形式はないため、複数行にまたがる式では、発火する各行にコメントが必要です。

このマーカーは**コメントの先頭**になければなりません——行全体の`# rigor:disable …`か、末尾の`expr  # rigor:disable …`です。このマニュアルが随所でそうしているように、構文を単に引用しているだけのコメントは普通の散文です: それは何も抑制せず、何も警告しません。二重にした`## rigor:disable …`や、`=begin` / `=end`ブロックの中に書かれたマーカーについても同様です——どちらも作動しません。

機能し得ないマーカーは、静かに無視されるのではなくフラグされます。既知のルールを1つも指さないトークン（`call.undefined-metod`のようなタイポ）は[`suppression.unknown-rule`](#rule-suppression-unknown-rule)を、ルールをまったく持たない素のマーカーは[`suppression.empty`](#rule-suppression-empty)を、Rigorの文法の外にあるマーカー語（RuboCopの反射である`# rigor:disable-next-line <rule>`や`# rigor:enable`）は[`suppression.unknown-marker`](#rule-suppression-unknown-marker)を発火します。いずれもすべてのプロファイルで`:warning`です。`plugin.`接頭辞のトークンは決してフラグされず（プラグインのルール語彙は動的にロードされるため）、これらの抑制診断はいずれも他のルールと同様にそれ自体を抑制できます。

**ソース内、ファイル全体**。ファイル内のどこかに`# rigor:disable-file <rules>`を記述すると、すべての行でそれらのルールが抑制されます。`# rigor:disable-file all`でファイルを黙らせます。慣例では先頭付近に置きます —— 典型的には生成ファイル、フィクスチャ、またはベンダリングされたスニペットで —— が、ファイル内のすべてのコメントがスキャンされるため、どこに置いても機能します。

3つのレイヤーは**合成されます**: ファイルスコープのマーカーは行スコープのものを打ち消さず、プロジェクト全体の`disable:`はどちらも持たないファイルにも依然として適用されます。

**プロジェクト全体**。`disable:`設定キーで実行全体のルールをオフにします:

```yaml
disable:
  - flow.dead-assignment
```

表示は維持したいが失敗させたくない*既知のバックログ*には、`disable:`の一括設定より[ベースライン](../06-baseline/)を使用してください。`disable:`は新しい発生も隠してしまいます。
