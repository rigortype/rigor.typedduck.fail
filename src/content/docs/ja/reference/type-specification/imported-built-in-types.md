---
title: "インポートされた組み込み型"
description: "rigortype/rigor docs/type-specification/imported-built-in-types.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/type-specification/imported-built-in-types.md"
sourcePath: "docs/type-specification/imported-built-in-types.md"
sourceSha: "ecda1996b03c7477e521788a0070b95191dee48e88d35f329d6ef769e9b21b42"
sourceCommit: "a7f0405346ea5833580c50f3610ccb0b97fea2d8"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorは明確なRubyの意味を持つ場合にのみ、PHPStan、TypeScript、Pythonの型付けからアイデアをインポートします。デフォルトでは互換性のために外来構文は保持されません。

この文書はRigorがリファインメントと型関数に使う予約済み組み込み**名前**を定義します。これらの名前を裏打ちする内部形式は[rigor-extensions.md](../rigor-extensions/)にカタログ化されています。演算子形式（`~T`、`T - U`、`key_of[T]`など）は[type-operators.md](../type-operators/)にあります。

## 命名規則

- 予約済み組み込み**リファインメント**名は`non-empty-string`、`positive-int`、`non-empty-array[T]`のように`kebab-case`を使います。
- リファインメント名は絞り込まれたRuby値ドメインを記述し、RubyのconstantやRBSエイリアス名ではなく、Rigor予約型名として解析されます。
- `-`文字は意図的なものです: Rubyのconstantやアメスラ名では有効ではないため、`non-empty-string`のような名前は視覚的かつ構文的にRigor組み込みとしてマークされます。
- Rigorは`non_empty_string`のようなリファインメント名の`lower_snake`エイリアスを追加してはなりません（MUST NOT）。それらの名前は通常のRBS型エイリアスとして利用可能なままです。
- パラメーター化された**型関数**と型レベル操作は`key_of[T]`のように`lower_snake`名と角括弧引数を使います。
- 型関数は別の型またはリテラルセットを計算、投影、または変換するものであり、絞り込まれた値ドメインに直接名前をつけるものではありません。
- 型関数が`-`を避けるのは、`-`がRigorの型構文では差分演算子でもあるためです; `int_mask[1, 2, 4]`は`int-mask[1, 2, 4]`より曖昧さが少ないです。
- 具体的な移行や可読性の問題を解決しない限り、互換性エイリアスを受け付けてはなりません（MUST NOT）。
- RBS名はすでにその概念を表現している場合は正規のままです。`bot`はボトム型です; `never`、`noreturn`、`never-return`、`never-returns`、`no-return`、`Never`、`NoReturn`は初期エイリアスとして追加してはなりません（MUST NOT）。
- 整数範囲は`Integer[1..10]`のようにRigorの範囲表記を使います。PHPStanスタイルの`int<1, 10>`は初期エイリアスとして追加してはなりません（MUST NOT）。

## 初期スカラーリファインメント

| Rigor型 | 意味 | RBS消去 |
| --- | --- | --- |
| `non-empty-string` | `""`を除く`String` | `String` |
| `literal-string` | ソースリテラルとリテラルのみの合成から来ることが既知の文字列。v0.0.9はすべてのオペランド自体がリテラルを持つ`String#+` / `String#*`による文字列補間`"#{...}"`を通じて、また`String#<<` / `String#concat`（その戻り値はレシーバーであるため、リテラルを持つレシーバーとリテラルを持つ引数はliteral-stringのままです）を通じてキャリアを追跡します。 | `String` |
| `numeric-string` | RigorのRuby数値文字列述語が受け付けるString | `String` |
| `decimal-int-string` | RigorのRuby10進整数文字列述語が受け付けるString | `String` |
| `lowercase-string` | 小文字正規化と等しいString | `String` |
| `non-lowercase-string` | 小文字正規化と等しくないString（つまり少なくとも1つの非小文字文字を含む）。`~T`の下での`lowercase-string`のペア補完 | `String` |
| `uppercase-string` | 大文字正規化と等しいString | `String` |
| `non-uppercase-string` | 大文字正規化と等しくないString。`~T`の下での`uppercase-string`のペア補完 | `String` |
| `non-numeric-string` | RigorのRuby数値文字列述語が受け付けないString。`~T`の下での`numeric-string`のペア補完 | `String` |
| `non-empty-lowercase-string` | `non-empty-string & lowercase-string` | `String` |
| `non-empty-uppercase-string` | `non-empty-string & uppercase-string` | `String` |
| `non-empty-literal-string` | `non-empty-string & literal-string` | `String` |
| `positive-int` | `0`より大きい`Integer` | `Integer` |
| `negative-int` | `0`より小さい`Integer` | `Integer` |
| `non-positive-int` | `0`以下の`Integer` | `Integer` |
| `non-negative-int` | `0`以上の`Integer` | `Integer` |
| `non-zero-int` | `0`を除く`Integer` | `Integer` |

正規の小文字文字列名は`lowercase-string`です;具体的な使いやすさの問題が現れない限り、`lower-string`は別のエイリアスとして受け付けてはなりません（MUST NOT）。

## 数値リファインメントのスコープ

整数リファインメントは意図的に`Integer`のリファインメントであり、すべての`Numeric`値の符号リファインメントでは**ありません**。Rubyの数値クラスは異なる等価、順序付け、昇格の挙動を持つため、Rigorは公称数値境界を越えて`positive-int`、`negative-int`、または`non-zero-int`を一般化してはなりません（MUST NOT）。

非整数数値リファインメントには別のルールがあります:

- `Float`リテラル等価と完全性ナローイングはデフォルトで拒否されます。`NaN`、無限大、符号付きゼロ、強制変換に敏感な比較はリテラルパーティションを誤って述べやすくします。Rigorはfloat比較から関係的ファクトを保持する場合があります（MAY）、また将来の`finite-float`または非`NaN`証明がより狭いfloat固有のリファインメントを解放する場合があります（MAY）。
- `Rational`は正確で順序付けられていますが`Integer`ではありません。`Rational`の将来の符号または範囲ファクトはRational固有でなければならず（MUST）、`*-int`名を再使用してはなりません（MUST NOT）。
- `Complex`はRubyでは全順序を持たないため、正、負、区間リファインメントは`Complex`に適用してはなりません（MUST NOT）。ゼロ性、実部、虚部、または大きさに関するファクトには明示的な述語またはプラグイン/RBS効果が必要です。
- 混合数値演算と比較はサブタイプ昇格ではなく、Rubyのメソッドディスパッチと`coerce`に従います。リファインメントは`Integer`から`Float`、`Rational`、または別の`Numeric`クラスに自動的に越境してはなりません（MUST NOT）。混合演算が既知の場合、結果型はRuby/RBS演算子シグネチャまたは信頼されたプラグインファクトに従います;そうでなければRigorは関係的または動的由来ファクトを保持し、保守的に拡幅します。

非整数数値精度は、`*-int`リファインメントの公称数値境界を越えた静かな昇格によってではなく、将来の組み込み、信頼された述語、またはプラグインとRBS効果を通じてオプトインです。

## 初期コレクションとシェイプリファインメント

| Rigor型 | 意味 | RBS消去 |
| --- | --- | --- |
| `non-empty-array[T]` | 少なくとも1つの要素を持つ`Array[T]` | `Array[T]` |
| オプショナルキーを持つハッシュシェイプ | 既知の必須およびオプショナルキーを持つHash | 正確な場合はRBSレコード、そうでなければ`Hash[K, V]` |
| 追加キーポリシーを持つハッシュシェイプ | オープン、クローズ、または既知の値型の追加キーのみオープンなハッシュシェイプ | 正確でクローズドの場合はRBSレコード、そうでなければ`Hash[K, V]` |
| 読み取り専用ハッシュシェイプエントリ | 現在の参照を通じて読み取ることはできるが書き込むべきでないキー | エントリのミュータビリティマーカーは消去 |
| タプルリファインメント | 固定または有界な配列位置 | 正確な場合はRBSタプル、そうでなければ`Array[T]` |
| オブジェクトシェイプ | 既知の公開メソッドまたはシングルトンケイパビリティを持つオブジェクト | 利用可能であれば名前付きインターフェース、そうでなければ`top`または公称ベース |

Pythonの`TypedDict`はシェイプの正確性の語彙を提供します: 必須および非必須キー、読み取り専用エントリ、オープン、クローズド、または型付き追加キーポリシー。Rigorはそれらのアイデアをハッシュ、オプションハッシュ、キーワード引数に適用します。読み取り専用エントリは現在の値のビューに対する静的な書き込み制限です;基礎となるRubyオブジェクトがfrozenであることを証明するものでは**ありません**。

RigorはPHPStanの`list<T>`と`non-empty-list<T>`を別個の表面型として初期にインポートしてはなりません（MUST NOT）。Ruby `Array[T]`はすでにリスト的なインデックスセマンティクスを持ちます; `non-empty-array[T]`は別のスペルを追加せずに有用なリファインメントをカバーします。

## 初期型関数と演算子

| Rigor形式 | 意味 |
| --- | --- |
| `key_of[T]` | レコード、ハッシュシェイプ、タプル、またはシェイプ的型の既知キー |
| `value_of[T]` | レコード、ハッシュシェイプ、タプル、またはシェイプ的型の既知値のユニオン |
| `pick_of[T, K]` | キーが`K`に含まれるものに制限されたレコード/シェイプ |
| `omit_of[T, K]` | キーが`K`に含まれるエントリーが削除されたレコード/シェイプ |
| `partial_of[T]` | `T`の必須エントリーすべてを任意にしたレコード/シェイプ |
| `required_of[T]` | `T`の任意エントリーすべてを必須にしたレコード/シェイプ |
| `readonly_of[T]` | `T`の各エントリーを現在のビューで読み取り専用としてマークしたレコード/シェイプ |
| `T[K]` | タプル、レコード、オブジェクトシェイプ、またはジェネリックコンテナメタデータへのインデックスアクセス |
| `int_mask[1, 2, 4]` | `0`を含む、リストされたフラグのビットORで表現可能な整数 |
| `int_mask_of[T]` | 有限整数リテラルユニオンまたは定数由来セットから導出されたビットマスク |

`key_of[T]`は正規のスペルです。具体的なメリットがない限り、RigorはPHPStanスタイルの`key-of<T>`とTypeScriptスタイルの`keyof T`の両方を受け付けてはなりません（MUST NOT）。

これらの演算子（および差分と補完演算子）の診断表示規則は[type-operators.md](../type-operators/)で定義されています。

## 先送りまたは拒否されたインポート

以下のインポートは意図的に提供されません。各項目は将来の提案が根拠を再議論することなく単一のルールを参照できるように記録されています。

- Pythonの`Any`と`object`はRigorのスペルになってはなりません（MUST NOT）。Rigorは動的境界には`untyped`を、最大の静的値型には`top`を使います。
- Pythonの`Never`と`NoReturn`は`bot`のエイリアスになってはなりません（MUST NOT）。RBSはすでに正規のボトム型を提供しています。
- Pythonの`Protocol`、`TypedDict`、`Annotated`、`TypeGuard`、`TypeIs`、`Final`、`ClassVar`はRigor表面構文になってはなりません（MUST NOT）。それらの有用なアイデアはRBSインターフェース、Rigorシェイプリファインメント、`%a{...}`アノテーション、フロー効果、別個のシンボルまたはメンバーファクトにマッピングされます。
- Pythonの`type[C]`は構文としてインポートしてはなりません（MUST NOT）。RBSはクラスオブジェクトに対してすでに`singleton(C)`を使います;将来の`instance_type[T]`投影はRubyファクトリAPIを中心に設計すべきです。
- `int`が`float`または`complex`に代入可能のようなPythonの数値昇格は直接インポートしてはなりません（MUST NOT）。Ruby数値挙動はRubyクラスとRBSシグネチャからモデル化されます。
- `class-string`、`interface-string`、`trait-string`、`enum-string`は先送りです。RubyはクラスとモジュールオブジェクトをDirectに渡すことができ、RBSはクラスオブジェクトにすでに`singleton(C)`を持ちます。
- PHPStanの`new`のような型操作は将来の候補として残りますが、クラス名文字列ではなくRubyクラスオブジェクトを中心に設計されなければなりません（MUST）。例えば、将来の`instance_type[T]`はファクトリAPIがその精度を必要とするときにクラスオブジェクトによって作成されたインスタンス型を投影できます。
- Rubyではすべての`String`値が真値であるため、`non-falsy-string`と`truthy-string`は追加してはなりません（MUST NOT）。
- `non-decimal-int-string`は初期に名前付き組み込みになってはなりません（MUST NOT）; `String - decimal-int-string`を使ってください。
- `empty`、`empty-scalar`、`non-empty-scalar`、`non-empty-mixed`のようなPHPの真偽性指向型は直接インポートしてはなりません（MUST NOT）。Rigorは`false | nil`フローファクトと明示的なコレクション/文字列リファインメントでRubyの真偽性をモデル化します。
- `Exclude`、`Extract`、`NonNullable`は初期に表面エイリアスとしてインポートしてはなりません（MUST NOT）。Rigorはそれらを`T - U`、`T & U`、`T - nil`として表現します。オプトインの`rigor-typescript-utility-types`プラグイン（[ADR-13](../../adr/13-typenode-resolver-plugin/)を参照）は、これらのTypeScript正準名を同じコア演算子に解決されるプラグイン提供語彙として登録してもよい（MAY）。
- TypeScriptのユーティリティまたはマッピング型エイリアス（`Partial`、`Required`、`Readonly`、`Pick`、`Omit`、`Record`、`Parameters`、`ReturnType`、`InstanceType`）は初期にRigor表面形式としてインポートしてはなりません（MUST NOT）。シェイプ射影系（`Partial`、`Required`、`Readonly`、`Pick`、`Omit`）は、上記表に従いコアの正準Rigor型関数（`partial_of[T]`、`required_of[T]`、`readonly_of[T]`、`pick_of[T, K]`、`omit_of[T, K]`）を持つ;`Record<K, V>`はRBSの`Hash[K, V]`で既に表現可能。TypeScript正準スペルは[ADR-13](../../adr/13-typenode-resolver-plugin/)に従いオプトインの`rigor-typescript-utility-types`プラグインを通じて提供され、各TS名を解析時にマッチするRigorコア演算子に変換する。関数型射影（`Parameters`、`ReturnType`）とクラス射影系（`InstanceType`）は、対応するコア演算子（`params_of[F]`、`return_of[F]`、`instance_type[C]`）がランディングするまで先送り。
