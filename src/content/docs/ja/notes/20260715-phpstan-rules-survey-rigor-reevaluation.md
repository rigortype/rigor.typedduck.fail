---
title: "PHPStan `src/Rules` 全ルール分類と Rigor 再実装価値の再評価 (2026-07-15)"
description: "Imported from rigortype/rigor docs/notes/20260715-phpstan-rules-survey-rigor-reevaluation.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260715-phpstan-rules-survey-rigor-reevaluation.md"
sourcePath: "docs/notes/20260715-phpstan-rules-survey-rigor-reevaluation.md"
sourceSha: "92fe5d8662d60eb1f2e4b9aadb34bab9197dcdbaea5330db4cc64b94032e2366"
sourceCommit: "3eb7b4c256e7aae802b605ef7897408bc25495b9"
sourceDate: "2026-07-15T14:23:05+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266715
---

Status: research note, no design commitments — Tier 1/2の各候補は個別にADR / コーパスゲートを経てから着手する。

## 目的と位置づけ

`/Users/megurine/repo/php/phpstan-src/src/Rules`（約600ファイル・約40サブディレクトリ）に実装された
PHPStanの出荷ルールをルール単位で分類し、Rigorで再実装する価値を再評価した。

コーパス上の先行PHPStan比較は2件のみで、いずれも**ルール単位のサーベイではない**:

- `docs/notes/20260603-phpstan-type-algebra-comparison.md` — 型代数層（`TypeCombinator`等）の比較。
  結論「PHPStan同水準を目指す未実装で新しいプラグイン拡張点を要するものはゼロ」。G1c coerce方向のみ
  ADR-42（demand-gated）へ。
- `docs/design/20260601-plugin-mechanism-pre-1.0-review.md` §7.1 — 拡張**インターフェース**（~50種）の
  取捨選択マトリクス。`AdditionalConstructorsExtension` → ADR-38採用、`AllowedSubTypes` → 推奨のまま未実装、
  dead-code / restricted-usage系 → demand-drivenで1.x後置。

本ノートが`src/Rules`のルール単位サーベイの初回となる。調査は4系統のサブエージェント
（ルール群3分割 + Rigor側棚卸し）で実施し、本文はその統合・裁定である。

分類キー: **(a)** PHP固有（Rubyに対応物なし） / **(b)**そのまま移植可能 / **(c)** Ruby向け適応が必要 /
**(d)**ルールではなくエンジン内ヘルパ・インフラ。FPリスクは「動いている慣用的Rubyコードに対して
発火するか」をRigorのFP規律（`feedback_false_positive_discipline`）で評価したlow/medium/high。

## 全体観

- PHPStanのルール資産の**およそ1/4はPHP固有の構文合法性・バージョンゲート**(cast、attributes、
  property hooks、参照渡し、goto、enum構文、promoted properties等)であり、Rubyには対象が存在しない。
- **最大の移植候補ブロックはすでにRigorが保有している**: Comparisonのconstant-condition族 ≈
  `flow.always-truthy-condition` + ADR-47、Methodsのディスパッチ中核 ≈ `call.undefined-method` +
  arity/argument-mismatch、override互換 ≈ ADR-35、Operators ≈ ADR-64のcoerce障壁裁定(素朴な
  PHPStan移植より**先行**している)、uninitialized property ≈ ADR-58のprovenanceゲート版。
- 残る正味の新規候補は（1）**注釈・宣言バリデーション族**(RBS/`%a{rigor:v1:}`の妥当性検査 — PhpDoc/
  Genericsディレクトリの丸ごとの対応物、両側とも作者が書いた宣言なのでFP-free)、（2）**定数畳み込みが
  効く組込み関数の意味検査**（printfプレースホルダ、日時パース実行検査）、（3）**少数の構文的フットガン
  検出**（Hashリテラル重複キー、`ensure`内`return`、`raise`非例外、rescue節シャドーイング）。
- High-FP側の帰結は一貫している: PHPStanがPHPでも動的性ゆえに諦めている箇所(`UnusedPrivateMethodRule`
  は動的メソッド名でbailする等)は、Rubyでは`send` / シンボルコールバック / モンキーパッチにより
  さらに悪化する。純粋性推論・重複定義検出・可視性強制の素朴な移植は不採用。

## ディレクトリ別分類（圧縮版）

各サブエージェントの完全な表は長大なため、ここではルール/クラスタ単位の判定に圧縮する。
判定列 = 分類 / FPリスク / 裁定（採用候補◎・ゲート付き○・不採用×・PHP固有—・既存済み=）。

### Arrays

| ルール/クラスタ | 検出内容 | 判定 |
|---|---|---|
| `DuplicateKeysInLiteralArraysRule` | リテラル配列の重複キー | (b) / low / **◎** Hashリテラル重複キー（last-winsが沈黙する実バグ;リテラル限定でFP-free） |
| `NonexistentOffsetInArrayDimFetchRule` | 存在しないオフセット参照 | (c) / low（HashShape/Tuple限定）/ ○ shapeキャリア限定なら健全。素の`Hash[K,V]`は`h[:absent]`が慣用（nil既定）なので対象外に固定 |
| `DeadForeachRule` | 空配列のforeach | (b) / medium / ○ 証明可能な空コレクションの`each` — 価値小 |
| `ArrayDestructuringRule` | 非配列の分解 | (c) / medium / × `to_ary`/`deconstruct`プロトコルの存在検査に還元され、既存dispatch検査で十分 |
| `IterableInForeachRule` | 非iterableのforeach | (c) / low / **=** `each`の`call.undefined-method`に還元 |
| `OffsetAccessAssignment*` 3種 | `[]=`の型検査 | (c) / low / **=** `[]=`ディスパッチ + argument-mismatchに還元 |
| `InvalidKeyInArrayDimFetch/Item`, `ArrayUnpackingRule`, `OffsetAccessWithoutDimForReadingRule` | PHPのキー型制約・splat制約 | (a) / — |
| `UnpackIterableInArrayRule` | 非iterableのunpack | × Rubyのsplatは非配列を包むだけで合法 |

### Cast

7ルール中5が（a）（cast構文のバージョンゲート）。`InvalidCastRule` / `EchoRule` / `PrintRule` /
`InvalidPartOfEncapsedStringRule`のto-string変換検査はRubyでは`Object#to_s`が全オブジェクトに
あるためほぼ空虚 — × 不採用。唯一の残滓（`to_str`/`to_int`暗黙変換サイト）はADR-64の
`param_accepts_arg_class?`がすでに占有している。

### Classes

| ルール/クラスタ | 検出内容 | 判定 |
|---|---|---|
| 存在検査クラスタ（`ExistingClassIn*` 6種） | extends/implements/instanceofの未解決クラス + 種別不一致 | (c) / 未解決側medium（autoload・`const_missing`）、**種別不一致側low** / ○ `class Foo < SomeModule`・`include SomeClass`は実TypeError — 解決済み定数に限ればFP-safe |
| `ImpossibleInstanceOfRule` | `instanceof`恒真/恒偽 | (b) / low / **=** narrowing + always-truthyの既存射程（下記「impossible-check」参照） |
| `InstantiationRule` | 未解決/インスタンス化不能クラスの`new`、ctor引数 | (c) / module-`new`・arityはlow、"abstract" 推定はhigh / ○ moduleに対する`.new`のみ |
| PHPDocタグ妥当性クラスタ（`MethodTagRule`/`PropertyTagRule`/`MixinRule`/`LocalTypeAliases*`等） | 注釈内の未知クラス・不正型・壊れたalias | (c) / **low** / **◎** RBS/注釈宣言バリデーションとして（PR #96/#97隔離アークの延長） |
| `AllowedSubTypesRule` | sealed階層の逸脱 | (c) / low / ○ §7.1のADOPT判定のまま未実装（ADR-36/47 WD3bと接続） |
| `RequireExtendsRule` / `RequireImplementsRule` | モジュールがincluderに要求する契約 | (c) / low / ○ `conforms-to` + ADR-28と同形 — 需要駆動 |
| `ClassConstantRule` | 未定義クラス定数参照 | (c) / medium / ○ ADR-43相当の許可リスト規律が前提 |
| 重複宣言クラスタ（`Duplicate*` 3種） | クラス/メソッド/traitの再宣言 | (c) / **high**（再オープンはRubyの中核的慣用）/ × 唯一の低リスク断片 = 同一ファイル同一クラス本体内の重複`def`（コピペバグ） |
| `UnusedConstructorParametersRule` | ctorの未使用引数 | (b) / medium / ○ `_`接頭辞規約 + ADR-35階層認識が前提 |
| `NewStaticRule` | `new static()`の安全性 | (c) / **high** / × `self.new`ファクトリはRubyの主要慣用 |
| attributes / promoted properties / readonly class / enum sanity | PHP構文 | (a) / — |

### Comparison

| ルール/クラスタ | 検出内容 | 判定 |
|---|---|---|
| constant-condition族（if/elsif/ternary/while/do-while/not, 7種） | 恒真恒偽条件 | (b) / low / **=** `flow.always-truthy-condition`そのもの。差分は構文別カバレッジとメッセージ精度（左/右オペランド帰属）のみ |
| `BooleanAnd/Or/XorConstantConditionRule` | `&&`/`\|\|`オペランド極性 | (b) / low-medium / **=** `constant_value_polarity`済み。`\|\|=`メモ化イディオムの除外が生命線（ADR-56/58の知見どおり） |
| impossible-checkクラスタ（`ImpossibleCheckType*` 3種） | `is_string()`等の型述語呼び出しが恒真/恒偽 | (b) / low（コア述語）/ **◎**既存predicate-fact機構で安価に実装可能な「常真predicate *呼び出し*」拡張。`PossiblyImpureTipHelper`（レシーバが不純かもしれない場合にメッセージを和らげる）は盗む価値のあるメッセージ品質装置 |
| `ConstantLooseComparisonRule` / `StrictComparisonOfDifferentTypesRule` | 型非交差の`==`/`===`恒偽 | (c) / medium / ○ `==`オーバーライドがあるためvalue-pinned・final級クラス限定（ADR-57のunion-arm極性と同系の健全部分集合）。PHP `===`とRuby `===`は別物である点に注意 |
| `NumberComparisonOperatorsConstantConditionRule` | 整数範囲型による比較の恒真恒偽 | (b) / medium / ○ 範囲算術の保有量次第。coerce演算子はADR-64除外リストと同じゲート |
| `MatchExpressionRule` | matchの死アーム + 網羅漏れ | (c) / 死アームlow・網羅性medium / **=**（死アーム: ADR-47出荷済み）+ ○（網羅性: `case/in`限定でADR-47 WD3bそのもの — `case/when`のelseなしnil返しは慣用なので対象外） |
| `UsageOfVoidMatchExpressionRule` | void値の使用 | (c) / low / **◎** RBS宣言`void`の戻り値使用は作者意図への違反（Steep同等） |
| `ConstantConditionInTraitRule` | trait内の定数条件を「全using classで同値のときのみ」報告 | (d) / — / メカニズムとして記録: モジュール本体をincluderごとに再解析する日が来たら同じ複数文脈dedupが必要 |

### Constants

`ValueAssignedToClassConstantRule`（RBS宣言型vs代入リテラルの畳み込み型、両側作者、low）が ○。
`OverridingConstantRule`の型共変性断片もRBS宣言限定で ○(サブクラスの定数シャドーイング自体は
慣用なので型衝突のみ)。残り（final/typed const、magic constants、`define()`等）は（a）。
`AlwaysUsedClassConstantsExtension`はdead-codeルールのFP包絡を**プラグイン化**するseamであり、
§7.1の「検出と抑制フックはペアでのみ出荷」判定を再確認する材料。

### DeadCode

| ルール/クラスタ | 検出内容 | 判定 |
|---|---|---|
| `UnreachableStatementRule` | 終端文の後の到達不能文 | (b) / **low** / **◎** `return`/`raise`後の文は構文的に頑健。ADR-47の隣接兄弟で、フローエンジンのexit-point追跡で実装可能 |
| `NoopRule` | 文位置の純粋式（`x == 1`単独行等） | (c) / medium / ○ リテラル・変数参照・比較演算子の部分集合に限ればlow（`=`/`==`取り違えは実バグ）。「任意の純粋式」への拡大が危険域 |
| 純粋性クラスタ（`CallTo*WithoutImpurePoints*` 4種 + collectors + 推移的resolver） | 副作用なし呼び出しの文位置使用 | (c) / **high** / × Rubyの純粋性は静的にほぼ不可知（メモ化ivar書き込み・モンキーパッチ・C実装）。唯一のnarrow変種 = foldカタログ（既知純粋メソッド列挙を既に保有）由来の`x.dup`・`x.map{}`結果破棄 — 需要が出たときのlow断片 |
| `UnusedPrivateMethodRule` | 未使用privateメソッド | (c) / **high** / × `send(:name)`・`before_action :check`等のシンボル参照がRailsの背骨。プラグインの「シンボル経由で使用」fact供給なしにはmediumにすら達しない（§7.1判定の再確認） |
| `UnusedPrivateConstantRule` | 未使用`private_constant` | (c) / medium / × 同上（`const_get`） |
| `UnusedPrivatePropertyRule` | 書くだけ/読むだけivar | (c) / medium / ○ 読み側はADR-58が別角度で占有。書き込み専用ivarはシリアライザ/DIが`instance_variable_get`するため保留 |

### Exceptions

| ルール/クラスタ | 検出内容 | 判定 |
|---|---|---|
| `OverwrittenExitPointByFinallyRule` | finally内returnによるreturnの上書き | (b) / **low** / **◎** `ensure`内`return`（戻り値も進行中例外も飲み込む古典フットガン）。RuboCop `Lint/EnsureReturn`が低FPの先例。純構文検出 |
| `ThrowExprTypeRule` | 非Throwableのthrow | (b) / low / **◎** `raise x`のxがException系/String/`#exception`応答のいずれでもない → ほぼ確実なTypeError |
| `CatchWithUnthrownExceptionRule`（シャドー節半分） | 先行する広いrescueに隠される後続rescue | (c) / **low** / **◎** `rescue StandardError; rescue ArgumentError`は階層比較のみで証明可能な実バグ |
| `CatchWithUnthrownExceptionRule`（never-thrown半分） | try本体が投げ得ない例外のcatch | (c) / **high** / × Rubyにthrows宣言はなく任意の呼び出しが任意にraiseし得る |
| `CaughtExceptionExistenceRule` | 未解決/非例外クラスのrescue | (c) / low-medium / ○ 解決済みで非Exceptionのみ。ただし`rescue MyGem::Error`（モジュールtagミックスインパターン）を許容しないと動くコードに発火 |
| checked-throws / too-wide-throws / throws-voidクラスタ（10ファイル） | `@throws`注釈の網羅・過剰・共変性 | (c) / medium-high / × RBSにthrows語彙がない。仮に`%a{rigor:v1:throws}`を導入してもraise集合の推論は非有界。「本体内のリテラル`raise X`が宣言に含まれない」断片のみ将来のlow |
| `ThrowExpressionRule`等バージョンゲート | PHP 8.0ゲート | (a) / — |

### Functions / Methods / Properties（ディスパッチ中核系）

| ルール/クラスタ | 検出内容 | 判定 |
|---|---|---|
| `CallMethodsRule` / `CallStaticMethodsRule` / `CallToFunctionParametersRule`（+ 898行の`FunctionCallParametersCheck`） | 未定義メソッド・arity・引数型・generics解決 | (c) / — / **=** Rigorの存在意義そのもの。PHPStanは引数型を無条件検査するが、その素朴移植がRubyでhigh-FPになることはADR-64が既に裁定済み（coerce障壁）。残滓2点: 可視性強制（`send`がprivateを貫通する慣用ゆえmedium — send-awareゲートなしでは不採用）/ kwargリネーム越しoverride（下記） |
| `MethodCallWithPossiblyRenamedNamedArgumentRule` | overrideがkwarg名を変える | (c) / **low** / **◎** Rubyのkwargsは実名（PHPの位置・名前二重性なし）なのでPHP版より強い: kwargリネームは端的なLSP破壊でADR-35に吸収可能 |
| `OverridingMethodRule` + helpers / `MethodSignatureRule` | Liskov署名互換 | (c) / low / **=** ADR-35出荷済み。`final`は（a）。`#[\Override]`注釈規律は注釈駆動でlow — 需要待ち |
| `ReturnTypeRule`族（function/closure/arrow） | 宣言戻り値vs実体 | (b) / low / **=** `def.return-type-mismatch` |
| `IncompatibleDefaultParameterTypeRule` 3種 | 引数デフォルト値vs宣言引数型 | (b) / **low** / **◎**デフォルト値はその場で畳める。ADR-5により発火は*宣言済み*引数型限定 |
| printfクラスタ（`PrintfParametersRule`等3種） | フォーマット文字列のプレースホルダ数・型 | (b) / **low** / **◎** `format`/`sprintf`/`String#%`のリテラルフォーマット検査 — 定数畳み込みの得意領域ど真ん中 |
| `RandomIntParametersRule` | min > max | (b) / low / ○ `rand(a..b)`系。値域型があれば安価 |
| sort/implode castabilityクラスタ | 要素がto-string/比較可能か | (c) / medium-low / ○ 移植価値があるのは*sort*側: `<=>`非互換要素unionの`sort`は実ArgumentError族 |
| `ArrayFilterRule` / `ArrayValuesRule` | no-opになるコレクション呼び出し | (c) / medium / × always-truthy包絡を継承する割に収量が薄い |
| NoDiscardクラスタ（`CallTo*WithNoDiscardRule`） | `#[\NoDiscard]`の戻り値破棄 | (c) / **low** / ○ must-use注釈（`%a{rigor:v1:}`候補）— 作者が要求した所でのみ発火。需要駆動 |
| 副作用なし文クラスタ（`CallTo*StatementWithoutSideEffectsRule`） | 純粋呼び出しの文位置 | (c) / high / ×（DeadCode純粋性クラスタと同判定）。例外: ctor変種のnarrow移植 — ADR-48 Dataクラスの`.new`文位置放置はmediumで検討可 |
| `NullsafeMethodCallRule` / `NullsafePropertyFetchRule` | 非nullableへの`?->` | (b) / medium / ○ 「非nilレシーバへの`&.`」— 動いている防御コードに発火する族なのでalways-truthyと同じ棚（`:info`/strict）でのみ |
| `MissingFunctionParameter/ReturnTypehintRule`族 / `MissingTypehintCheck` | 型注釈の欠落・要素型なしコレクション | (c) / default-onならmedium / × 診断ではなく**coverage面**の素材（`coverage --protection`が既に占有する軸） |
| `AccessPropertiesRule`族 | 未定義プロパティアクセス | (c) / medium / **=** Rubyではivarは自オブジェクト内のみ可視。クラス内の未書き込み`@ivar`読みはADR-58がprovenanceゲート付きで既に正しい適応形 |
| `TypesAssignedToPropertiesRule` / `DefaultValue…` | 宣言フィールド型vs代入 | (c) / RBS宣言限定low / ○ 推論フィールド型への発火はhigh（慣用的なwiden）なので宣言限定に固定 |
| `UninitializedPropertyRule` | 未初期化プロパティ | (c) / — / **=** ADR-58 WD3（定義的代入）+ ADR-38で意識的に分岐済み。`\|\|=`遅延メモ化がRuby固有の罠 |
| readonly規律クラスタ（native + `@readonly` phpdocの8種） | readonly逸脱 | (c) / medium / ○ 注釈駆動`@readonly`対応物（両側作者でFP-safe）は将来案。readonly性の*推定*はhighで不採用 |
| `ConsistentConstructorRule` | `self.class.new`系のためのctor互換 | (c) / low-medium / ○ 注釈ゲート付きで`Class[T]`ファクトリパターンに有用 |
| `MissingReturnRule` | return欠落 | （a）主に / — / Rubyは最終式暗黙return。残滓（`-> bot`宣言で本体が完走し得る）はlowだが微小 |
| PHP固有群: closures `use()`、参照渡し、superglobals、attributes、LSB `static::`、property hooks、first-class callableゲート | — | (a) / — |

### Generics（ディレクトリ丸ごと）

`@template`境界・default・シャドーイング（G1）、generic祖先のインスタンス化整合（G2）、変位位置検査（G3）
の全15ルール — **(c) / low / ◎ 一括採用候補**。RBSの型引数（境界`< T`、`out`/`in`変位）に対する
注釈リンティングであり、両側作者・構築的にFP-free。rbs gem自身の検査との重複範囲を確認の上、
エンジン内バリデーションとしてPR #96/#97隔離アークに接続するのが自然。

### PhpDoc（ディレクトリ丸ごと）

注釈-vs-実体の整合検査ファミリ — **(c) / low / ◎ ジャンルとして最大の未採掘領域**。対応物:

- 不整合注釈クラスタ（`IncompatiblePhpDocTypeRule`等4種）→ RBS/インラインRBS vs推論の矛盾検査
- `@phpstan-assert`検証 → `%a{rigor:v1:predicate/assertion}`が実在パラメータを参照し実際に狭めるかの検証
- 条件付き戻り値検証 → ADR-20 conditional文法の検証層
- 不正タグ構文（`InvalidPhpDocTagValueRule`等）→ 未知`rigor:v1:`ディレクティブ・壊れたインラインRBS
- `@var` hygiene → インライン型表明が推論と矛盾（ADR-59の`spec.impossible-assertion`弱形の親戚）
- require-extends / require-implements / sealed → `conforms-to`・ADR-28・ADR-36/47 WD3bに接続

### 残りのディレクトリ（要点のみ）

- **Generators**: `yield`値vs宣言ブロックシグネチャ検査は（c）/lowで既存射程の拡張。`YieldInGeneratorRule`は（a）。
- **Keywords**: `ContinueBreakInLoopRule`はRubyではブロック内`break`/`next`が合法なのでmedium — 不採用。`RequireFileExistsRule`は`require_relative`リテラル限定ならlowだが解析中IOがADR-45記述子と絡む — 保留。goto/strict_typesは（a）。
- **Names / Namespaces**: `use`文検査は（a）。基底の未解決定数参照はRigorのdiscovery + Dynamic fallbackが既に慎重版を体現。
- **Operators**: `InvalidBinaryOperationRule`はADR-64/42/78が既に裁定済み（=）。`InvalidComparisonOperationRule`の`<=>`/Comparable欠落断片はsort-castabilityと同じ ○。inc/dec・pipe・backtickは（a）。
- **Missing**: 上記`MissingReturnRule`のみ。
- **Pure**: 純粋性契約強制はhigh（メモ化・ロギングでRubyはほぼ全て技術的に不純）— ×。逆向き「impure宣言なのに副作用なし」はmediumだが語彙自体が未導入。
- **Regexp**: `RegularExpressionPatternRule` — (b)/low/**◎**。文字列組み立てされたパターンが定数に畳めたとき`Regexp.new`をrescueハーネスで実行検証（ADR-39が正にこの技法を政策承認済み）。リテラル正規表現はRubyがパース時に検査するため、価値はstring-builtパターンにある。
- **RestrictedUsage / InternalTag**: ハードコードされたルールではなく**プラグインseam**（拡張がメッセージを供給）。RigorではADR-52のコンパイル済みディスパッチ表に`restricted_usage`動詞を載せればdeprecation（examples/rigor-deprecations）・internal-API・API-freeze消費者を統一的に載せられる — ○ 需要駆動（§7.1判定を維持）。
- **TooWideTypehints**: 戻り値過広検査は**ADR-5 robustness principle（strict returns）の執行アーム** — (b)/medium。Dynamicを含む本体では抑制、override階層（ADR-35）考慮、意図的API幅は存在するため**`bleeding_edge:`機能としての出荷が自然**（ADR-50 WD2の第2消費者候補）。param-out系は（a）（参照渡し）。
- **Traits**: ほぼ（a）（PHPのtraitインライン化モデルの産物）。`ConflictingTraitConstantsRule`のモジュール-vs-includer定数シャドーイングだけ薄い（c）/low。
- **Variables**: `DefinedVariableRule`はRubyではnil-flowに変換され既存possible-nilの領域（=）。isset/empty/??族は冗長ガード検出としてalways-truthyと同じ棚の ○。`$this`・unset・compact・by-refは（a）。
- **Whitespace**: (a) — RuboCopの領分。
- **Api / Debug / Playground / Ignore**: Apiはツール自身のBC-promise執行（ADR-50の凍結面をプラグインに強制する発想として参照価値、実装はRestrictedUsageに還元）。Debugの`assertType`魔法関数はRigorのspec fixture・ADR-62 oracleと同型（d）。Playgroundの`PromoteParameterRule`（「この設定を有効にすればこのエラーが出ます」広告）は`show-bleedingedge` UXの親戚として記録。**`IgnoreParseErrorRule`は ◎**: 壊れた抑制コメントが黙って無効化されるのはbaselineワークフロー最悪の結末 — `# rigor:disable`のパースエラーを診断すべき。

## 再評価: 優先度付き裁定

### Tier 1 — 採用候補（low FP・既存機構で安価）

| # | 候補 | PHPStan出典 | 根拠 |
|---|---|---|---|
| 1 | **RBS/注釈宣言バリデーション族**（未知クラス・不正型・壊れたalias・`%a{}`が実在パラメータを参照し実際に狭めるか・変位位置・generic境界とインスタンス化整合） | PhpDoc/ + Generics/ + Classesのタグ妥当性クラスタ | 両側作者で構築的にFP-free。PR #96/#97隔離アークの直接延長。ジャンルとして最大の未採掘領域 |
| 2 | **抑制コメントのパースエラー診断** | `IgnoreParseErrorRule` | 壊れた`# rigor:disable`の黙殺は抑制系の最悪故障モード。実装コストは既存パーサへのエラー経路のみ |
| 3 | **`ensure`内`return`** | `OverwrittenExitPointByFinallyRule` | 戻り値と進行中例外を飲む古典フットガン。純構文・RuboCop先例で低FP実証済み |
| 4 | **`raise`非例外オペランド** | `ThrowExprTypeRule` | Exception系/String/`#exception`応答のいずれでもなければほぼ確実なTypeError |
| 5 | **rescue節シャドーイング** | `CatchWithUnthrownExceptionRule`の一部 | 階層比較のみで証明可能。never-thrown半分は不採用 |
| 6 | **Hashリテラル重複キー** | `DuplicateKeysInLiteralArraysRule` | last-winsの黙殺は実バグ。リテラル+値ピン限定 |
| 7 | **フォーマット文字列プレースホルダ検査** | printfクラスタ | `format`/`sprintf`/`String#%`のリテラルフォーマット — 定数畳み込みの得意領域 |
| 8 | **引数デフォルト値vs宣言型** | `IncompatibleDefaultParameterTypeRule` | デフォルト値はその場で畳める。宣言済み引数型限定（ADR-5整合） |
| 9 | **kwargリネーム越しoverride** | `MethodCallWithPossiblyRenamedNamedArgumentRule` | RubyではPHP版より強いLSP破壊。ADR-35に吸収 |
| 10 | **文字列組み立て正規表現の実行検証** | `RegularExpressionPatternRule` | ADR-39承認済み技法（rescueハーネス内`Regexp.new`）。日時パース検証（`DateTimeInstantiationRule` → `Time.parse`系）も同型 |
| 11 | **impossible-check（型述語呼び出しの恒真恒偽）** | `ImpossibleCheckType*` | 既存predicate-fact機構の安価な消費者。`PossiblyImpureTipHelper`のメッセージ緩和も併取 |
| 12 | **`void`値の使用** | `UsageOfVoidMatchExpressionRule` | RBS宣言`void`は作者意図。Steep同等 |

### Tier 2 — ゲート付き・需要駆動（medium、または機構待ち）

- **too-wide return**（ADR-5執行アーム）— `bleeding_edge:`機能として。Dynamic含有本体で抑制、ADR-35階層考慮。
- **`&.` on非nil / 冗長ガード検出**（Nullsafe系・isset族）— always-truthyと同じ`:info`/strict棚でのみ。
- **`restricted_usage`プラグイン動詞**（RestrictedUsage/InternalTag/Apiのseam統一）— §7.1のdemand-driven判定を維持。deprecation・internal-API・凍結面執行の3消費者が既に見えている。
- **sealed / AllowedSubTypes + `case/in`網羅性** — §7.1 ADOPT判定とADR-47 WD3bの合流点。依然demand-gated。
- **`<=>`非互換unionの`sort`/比較** — 実ArgumentError族だがcoerce/monkey-patchゲートが要る。
- **未使用ctor引数 / 注釈駆動readonly / ConsistentConstructor / NoDiscard注釈 / モジュールへの`.new`** — いずれも注釈または規約ゲート付きでlowに落ちるが、需要が未観測。
- **範囲算術による比較恒真恒偽** — 値域型の保有量次第。

### Tier 3 — 不採用（Rubyではhigh FP、または既裁定）

- **純粋性ベースのno-effect文**（DeadCode純粋性クラスタ・Pure/）— メモ化ivar書き込み・モンキーパッチでRuby純粋性は不可知。foldカタログ限定のnarrow断片のみ将来枠。
- **未使用privateメソッド/定数** — `send`・シンボルコールバックがRailsの背骨。§7.1「抑制フックとペアでのみ、1.x後置」を再確認。
- **重複宣言・再オープン検出** — Rubyの中核的動的性そのもの。
- **可視性強制（send-awareゲートなし）/ abstract推定 / readonly推定 / `new static`安全性** — 慣用パターンに発火。
- **naive binary-operation / 引数型の無条件検査** — ADR-64 coerce障壁が既に正しい形へ削っている。
- **checked-throws系** — throws語彙が存在せずraise集合は非有界。
- **missing-typehint系** — 診断ではなくcoverage面の素材（既占有）。

### Tier 4 — PHP固有（対象消滅）

参照渡し全般（ParameterOut・by-ref foreach）、closures `use()`、superglobals・`$this`代入、goto/label、
`declare(strict_types)`、attributes、property hooks（PHP 8.4）、promoted properties、readonly class、
enum構文、cast構文とバージョンゲート、`use` import、LSB `static::`、inc/dec・pipe・backtick、
配列キーint|string制約、BOM/whitespace。体感でルール資産の約1/4。

## アーキテクチャ観察（ルール以外の持ち帰り）

1. **FP制御の設計対比**: PHPStanは`RuleLevelHelper`の**レベル**で制御する — 低レベルではnullable/mixed
   アームをルールから*見えなくする*型可視性フィルタ。Rigorは完全な型を保持し発火ポリシー
   （severityプロファイル・evidence tier・provenanceゲート）で制御する。Rigor方式の方が誠実だが、
   PHPStan方式は「導入ランプ」として機能している — onboarding文脈（ADR-22/23）で参照価値。
2. **エラーオブジェクトの語彙**: PHPStanの`NonIgnorableRuleError`（抑制コメントで消せないエラー）と
   `FixableNodeRuleError`（auto-fix添付、`--fix`の基盤）はRigorに対応物がない。前者は
   configuration-error系の抑制不能性として、後者は将来の`rigor fix`として記録。
3. **collectorパターン**（2パスcross-file集計）はADR-7で据え置いた後、Rigorではdiscovery index +
   ADR-9 fact storeが代替している。PHPStanの推移的純粋性resolverはこのパターンの最重量消費者。
4. **trait文脈dedup**（`ConstantConditionInTraitRule`: 全using classで同値のときのみ報告）は、
   モジュール本体をincluderごとに再解析する将来が来た場合の必須FP抑制機構。
5. **ツール自己保護ルール**（Api/ が第三者にBC-promiseを執行、`make check-plugins` ≈ ADR-43と同発想）
   と**Debug/ の`assertType`自己ホスト型テストオラクル**（≈ spec fixture + ADR-62）は、設計が独立に
   収斂している確認材料。

## 手法と限界

- 調査は4系統のサブエージェント（ルール群3分割 + Rigor側ルール棚卸し・先行判定収集）で実施し、
  本文はその統合。各ルールのerror message文字列を証拠として読んだが、**全600ファイルの実装を
  行単位で精読してはいない** — クラスタ化（Function/Method/StaticMethod変種の同一視等）を含む。
- FPリスク評価は実測ではなく、Rigorの既裁定(ADR-64 coerce、ADR-78 reflective send、ADR-58
  provenance、ADR-47コーパス掃引)への類推。Tier 1候補の実装時は通常どおりコーパスゲートが必要。
- phpstan-strict-rules / phpstan-deprecation-rules等の**別パッケージは対象外**（本体`src/Rules`のみ）。
- 頭対頭の診断出力比較（同一コードベースへの両ツール実行）は依然として存在しない。
