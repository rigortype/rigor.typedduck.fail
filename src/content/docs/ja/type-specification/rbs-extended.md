---
title: "RBS::Extendedアノテーション"
description: "rigortype/rigor docs/type-specification/rbs-extended.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/rbs-extended.md"
sourcePath: "docs/type-specification/rbs-extended.md"
sourceSha: "5f5c75f009853e16a0da7d84c2ea0a13692a9a38551733f7195b6de400d55d03"
sourceCommit: "db8d01bf94926a72e6a2aaf15639d1591b7e142e"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorは仮称`RBS::Extended`の下で`*.rbs`ファイルのRBSアノテーションからRigor固有のメタデータを読み取る場合があります（MAY）。

RBSはすでに宣言、メンバー、メソッドオーバーロードに対して`%a{...}`アノテーションをサポートしています。`RBS::Extended`は予約済みキー名前空間の下でそれらのアノテーションにRigorメタデータを添付する慣習のRigorの名称です;最初のバージョンは`rigor:v1:<directive>`ペイロードを予約します。関係のないキーを使う同じノード上のアノテーションは他のツールに属し、Rigorによって消費されません。Rigorは解析と消去中にそれらを変更せずに保存しなければなりません（MUST）。

これらのアノテーションにより、ユーザーとプラグイン著者はRubyアプリケーションコードを変更せず、通常のRBSパーサを壊すことなく標準RBSを超える型を記述できます。標準RBSツールはこれらのアノテーションを保存または無視できなければなりません（MUST）。これはPythonの`Annotated[T, metadata]`と同じ互換性原則に従います: 基本型はメタデータを理解しないツールにとっても意味があり続けます。

## 実際の例

```ruby
%a{rigor:v1:return: non-empty-string}
def read_name: () -> String

%a{rigor:v1:param: value is non-empty-string}
def normalize: (String value) -> String

%a{rigor:v1:assert value is non-empty-string}
def assert_present!: (String value) -> void

%a{rigor:v1:assert-if-true value is "foo"}
%a{rigor:v1:assert-if-false value is ~"foo"}
def check: (untyped value) -> bool
```

`return:`、`param:`、`assert*`、`predicate-if-*`の右辺は、RBSスタイルのクラス名（`String`、`::Foo::Bar`）またはインポート済み組み込みカタログ（[`imported-built-in-types.md`](../imported-built-in-types/)）のkebab-caseリファインメント（refinement、篩型とも）ペイロードのいずれかを受け付けます。リファインメントペイロードは`Builtins::ImportedRefinements::Parser`を通じてパラメータ化形式`non-empty-array[Integer]`、`non-empty-hash[Symbol, Integer]`、`int<min, max>`をサポートします。型引数位置はSymbolおよびStringリテラルトークン（`:name` / `"name"`）と、それらの`|`によるユニオン（union、合併型とも）（`:a | :b | "c"`）も受け付けます;パーサは各リテラルを`Constant<value>`に持ち上げ、ユニオンを`Type::Combinator.union`を介して畳み込むため、`pick_of[T, :a | :b]`やプラグイン提供の`Pick[T, "name" | "email"]`のようなシェイプ（shape）射影ヘッドが合成ASTのワークアラウンドなしに端から端まで通ります。クラス名ディレクティブは`~T`否定を使う場合があります（MAY）;リファインメント形式のディレクティブは現在使ってはなりません（MUST NOT）（差分対リファインメントの代数は将来のスライス（slice）のために予約されています）。

## 著作ルール

- 通常のRBSシグネチャは互換性契約（contract）のままです。
- `RBS::Extended`アノテーションはRigorのためにその契約を絞り込むか説明します。
- アノテーションキーはバージョン管理された`rigor:v1:`名前空間を使います（例: `rigor:v1:return`または`rigor:v1:predicate-if-true`）。
- アノテーションキーが最初に来ます;残りのテキストはRigor固有のペイロードです。
- Rigor生成アノテーションは明示的な`rigor:v1:`プレフィックスを使わなければなりません（MUST）。バージョン管理されていない`rigor:`ディレクティブは発行してはなりません（MUST NOT）し、互換性移行の必要がない限り無効として扱うべきです（SHOULD）。
- バージョンプレフィックスはディレクティブIDの一部です。Rigor v1は`rigor:v1:`ディレクティブのみを読み取ります;サポートされていない`rigor:vN:`ディレクティブはRBSツールによって保存されますが、Rigorが解析するノードにある場合はサポートされていないメタデータとして報告されます。
- 同じRBSノード上の複数のアノテーションはソース順序に依存せず決定論的に独立して解釈されなければなりません（MUST）。
- 正確に重複するアノテーションは冪等です。
- 互換性のあるアノテーションはディレクティブの種類、ターゲット、フローエッジによって合成されます。例えば、同じパラメータの真エッジと偽エッジの述語ファクト（fact）は異なる効果スロットです。
- 競合するアノテーションは診断です。Rigorは最初優先または最後優先の挙動を使ってはなりません（MUST NOT）。競合は、ペイロード構文の非互換性、同じノードでのバージョンの非互換性、同じ効果スロットに対する2つの非同一シングルトンディレクティブ、積集合が`bot`である矛盾するリファインメント、通常のRBS契約を超えるリファインメントを含みます。
- 著者は明示的なユーザー著作差分型には`T - U`を優先し、負のファクトとコンパクトな診断表示には主に`~T`を使うべきです（SHOULD）（[type-operators.md](../type-operators/)参照）。
- アノテーションがRBSシグネチャと競合する場合、Rigorは診断を報告しなければなりません（MUST）。
- エクスポートされたプレーンRBSは、ユーザーが保存を要求しない限りRigorのみのアノテーションを削除または消去しなければなりません（MUST）。
- アノテーション文法はバージョン管理されており、実装経験がそれを証明するまで小さくあるべきです（SHOULD）。非互換な文法変更は`rigor:v1:`のセマンティクスを変更するのではなく新しいバージョンプレフィックスを必要とします。

## 型述語とアサーション

RigorはPythonの`TypeGuard`/`TypeIs`スタイルの述語、TypeScriptスタイルの型ガード、PHPStanスタイルのアサーションをRBSメソッドシグネチャに添付された**フロー効果**としてモデル化します。

### 述語の例

```ruby
%a{rigor:v1:predicate-if-true value is String}
%a{rigor:v1:predicate-if-false value is ~String}
def string?: (untyped value) -> bool

%a{rigor:v1:predicate-if-true self is LoggedInUser}
def logged_in?: () -> bool
```

### アサーションの例

```ruby
%a{rigor:v1:assert value is String}
def assert_string!: (untyped value) -> void

%a{rigor:v1:assert-if-true value is String}
def valid_string?: (untyped value) -> bool
```

### ディレクティブの意味

| ディレクティブ | 効果 |
| --- | --- |
| `rigor:v1:return: T` | すべての呼び出しサイトでRBS宣言の戻り値型を`T`でオーバーライドします。 |
| `rigor:v1:param: name [is] T` | パラメータ`name`のRBS宣言型を`T`に絞り込みます。オーバーロード選択/引数型チェックと推論中のメソッド本体内の両方に適用されます。`is`グルーワードはオプションです。 |
| `rigor:v1:predicate-if-true target is T` | 条件として使われる呼び出しの**真**ブランチで`target`を`T`に絞り込みます。 |
| `rigor:v1:predicate-if-false target is T` | **偽**ブランチで`target`を`T`に絞り込みます。 |
| `rigor:v1:assert target is T` | メソッドが正常にリターンした後に`target`を絞り込みます。 |
| `rigor:v1:assert-if-true target is T` | メソッドが真値を返したときに`target`を絞り込みます。 |
| `rigor:v1:assert-if-false target is T` | メソッドが`false`または`nil`を返したときに`target`を絞り込みます。 |

真ブランチのみの述語はPythonの`TypeGuard`的な挙動に十分です。両ブランチを記述する述語ペアはPythonの`TypeIs`的な挙動に十分です。偽ブランチはより明確な場合は明示的な負の型として書く場合があります（MAY）:

```ruby
%a{rigor:v1:predicate-if-true value is String}
%a{rigor:v1:predicate-if-false value is ~String}
def string?: (untyped value) -> bool
```

### ターゲット文法

初期ターゲット文法は意図的に小さくなっています:

```text
target ::= parameter-name | self
```

`parameter-name`は任意のRuby Symbolではなく、RBSメソッドパラメータ名を指します。RBSパラメータ名は`_var-name_ ::= /[a-z]\w*/`に従うため、述語ターゲットは既存の識別子スタイルに従います。`predicate-if-true`のようなディレクティブのハイフン付き単語はアノテーションペイロード内にあり、Ruby Symbolとしてではなくリgorによって解析されます。

述語が引数を参照する必要がある場合、RBSメソッド型はその引数に名前を付けなければなりません（MUST）:

```ruby
# 良い例: `value`を参照できます。
%a{rigor:v1:predicate-if-true value is String}
def string?: (untyped value) -> bool

# 述語ターゲットに対して情報が不十分です。
def string?: (untyped) -> bool
```

将来のバージョンはターゲットをインスタンス変数、レコードキー、シェイプパス、ブロックパラメータに拡張する場合がありますが（MAY）、それらはアノテーションディレクティブ名をオーバーロードするのではなく明示的なパス構文を使うべきです（SHOULD）。

## 明示的な適合ディレクティブ

暗黙の構造的適合がデフォルトです。通常の代入、パラメータ渡し、メソッド呼び出しは、著者が見えるオプトインを必要とせずに関連するインターフェースまたはケイパビリティ（capability）ロールに対する構造的互換性チェックをトリガーします（[structural-interfaces-and-object-shapes.md](../structural-interfaces-and-object-shapes/)参照）。

さらに、明示的な適合ディレクティブにより、クラスがその公開契約の一部として構造的インターフェースを満たすことを宣言できます:

```ruby
%a{rigor:v1:conforms-to _RewindableStream}
class MyBuffer
end
```

ディレクティブはRigorに対して、現在の呼び出しサイトがその要件を実行するかどうかに関係なく適合を検証するよう指示します。これは構造的契約を使用から生まれるプロパティではなくチェックされた設計アサーションにしたいライブラリに有用です。同じクラス上の複数の`conforms-to`ディレクティブは許可され、インターフェースの積集合のように結合します。宣言された`conforms-to`インターフェースが満たされない場合、Rigorは診断を報告しなければなりません（MUST）;満たされたディレクティブはサイレントです。

ディレクティブは純粋に追加的です。暗黙の構造的互換性は引き続き適用され、すでにインターフェースを満たすクラスはアノテーションなしで型チェックを続けます。

## フロー効果と拡張の貢献

このセクションはフロー効果バンドルの正規のセマンティクススキーマです。拡張APIドキュメント（ADR-2以降）はプラグインが貢献をパッケージ化して返す方法を説明するときにこのスキーマを参照しなければなりません（MUST）。

型仕様はスコープの直接ミューテーションではなく、ファクトを公開する拡張APIに依存します。プラグインまたは`RBS::Extended`アノテーションは以下を持つフロー効果バンドルを貢献する場合があります（MAY）:

- 正常戻り値型;
- 真値エッジファクト;
- 偽値エッジファクト;
- リターン後アサーションファクト;
- 例外または非リターン効果;
- ブロック呼び出しタイミング効果;
- レシーバー、引数、ブロック、キャプチャされたローカルのエスケープ効果;
- レシーバーと引数のミューテーション効果;
- ファクト無効化効果;
- 呼び出しによって導入される動的リフレクションメンバー;
- 貢献されたファクトと効果のprovenanceと確実性。

解析器はこれらの貢献を組み込みガードに使うのと同じ制御フロー機構を通じて適用します（[control-flow-analysis.md](../control-flow-analysis/)参照）。これにより短絡式が精密なままになります。例えば、`&&`の左辺で使われるプラグイン定義述語は右辺の解析に使われるスコープを絞り込まなければならず（MUST）、その負のファクトは`||`の右辺に流れなければなりません（MUST）。

### 貢献のマージ

貢献のマージは決定論的で解析器が所有します:

- 貢献は**provenance**を持ちます: コアRubyセマンティクス、受け付けられたシグネチャまたは`RBS::Extended`アノテーション、生成されたメタデータ、プラグインのどこから来たかを含みます。
- コアRubyセマンティクスと受け付けられたシグネチャ契約は権威があります。`RBS::Extended`、生成されたメタデータ、プラグインは互換性のあるファクトを絞り込む場合がありますが（MAY）、通常のRuby/RBS契約を弱体化または矛盾させてはなりません（MUST NOT）。
- 同じターゲット、フローエッジ、効果の種類の互換性のあるファクトは合成されます。正の型ファクトは積集合を取り、負のファクトと関係的ファクトは通常のバジェットの下で蓄積され、ミューテーション、エスケープ、無効化効果は保守的に結合されます。
- 矛盾する貢献は診断です。最初優先または最後優先の挙動ではありません。Rigorは最も近い非競合権威ファクトを保持し、そのターゲットとエッジの競合する貢献を無視または弱体化すべきです（SHOULD）。
- 真値エッジと偽値エッジのファクトはエッジローカルのままです。プラグインは片側のファクトを貢献する場合がありますが（MAY）、貢献が明示的に提供するか、コア解析器が互換性のあるファクトから導出できない限り、Rigorは反対のエッジを推論してはなりません（MUST NOT）。
- 動的リターン貢献は選択されたシグネチャまたはデフォルトのリターン契約に対してチェックされます。プラグインは互換性のあるリターンを絞り込む場合がありますが（MAY）、非互換なリターン貢献は契約のオーバーライドではなく競合診断です。
- `maybe`の証拠が繰り返されても、単に数によって`yes`になることはありません。確実性は、貢献がより強い証明を提供するか、コア解析器が互換性のあるファクトからそれを導出できる場合にのみ変わります。

### 将来のターゲット

将来のターゲット文法は明確な安定性ルールによってのみ成長すべきです（SHOULD）。妥当なターゲットには以下が含まれます:

- `self`;
- 名前付きパラメータ;
- 呼び出しサイトで可視のローカル変数;
- `self.name`のようなレシーバーメンバー;
- `@name`のようなインスタンス変数;
- `config[:mode]`のようなハッシュまたはレコードキー;
- リテラルインデックスを持つタプルまたは配列要素;
- メソッドが純粋または安定していることが既知の場合、同じレシーバーのメソッド結果パス。

解析器の背後でミューテートされる可能性のあるターゲットは、アノテーションで拒否されるか、`maybe`として扱われるか、または明示的な安定性メタデータとペアにされるべきです（SHOULD）。
