---
title: "ADR-78 — 反射的な過剰折り畳みと`flow.always-truthy-condition`のエンベロープ"
description: "rigortype/rigor docs/adr/78-reflexive-overfold-always-truthy.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/78-reflexive-overfold-always-truthy.md"
sourcePath: "docs/adr/78-reflexive-overfold-always-truthy.md"
sourceSha: "6f5a0c3ccb9da445c6fbc20e38d5b195f097437b711292c72c1445294ee7886d"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
translationStatus: "translated"
sidebar:
  order: 4078
---

ステータス: **Accepted — 2026-06-26に完全実装**。 WD2（`ConstantFolding.try_dispatch`内の`REFLECTIVE_SEND_METHODS`ガード、2026-06-25）＋WD1の持ち越し（`ShapeDispatch.try_dispatch`内のブロック形式の過剰折り畳みガード）＋WD3（`HashShape`と`Tuple`両方に対するシェイプキャリア保持）。`flow.always-truthy-condition`は、述語が`Type::Constant`へ折り畳まれたとき、それを証明可能に真であると結論します。その結論は、定数が**過剰折り畳み**（over-fold）——健全性が実際のランタイム式より狭い形にしか成り立たない折り畳み——に由来する場合には不健全です。具体的なケースは、レシーバーが折り畳み可能なシェイプキャリアを保持していると、*ランタイム変数*のメソッド名を持つ反射的ディスパッチ`receiver.public_send(method_name)`が単一の`Type::Constant`へ折り畳まれてしまうというものです。本ADRはこの過剰折り畳みをその発生源で修正します（リテラルでないメソッド名では反射的送信の折り畳みを行わない）——ルールを抑制するのではなく。これは偽陽性を取り除くと同時に、[ADR-76](../76-effect-modeling-freeze-dup-shape-preservation/)のWD2（`freeze` / `dup`をまたぐシェイプキャリア保持）の**ブロックを解除します**。

根拠: [2026-06-14の精度foldgap調査ノート](../../notes/20260614-precision-foldgap-recon/)の「唯一の本物のfoldgap」節。ADR-76 WD2のシェイプ保持ティアは実装され、コーパスFP安全であると検証され（8プロジェクトにわたり新規発火ゼロ）、そして**差し戻されました**。Rigor自身の定数折り畳み器で12件の反射的な`flow.always-truthy-condition`を表面化させたためです。レシーバーのシェイプが保持されていると、`receiver.public_send(method_name)`が`Type::Constant`へ折り畳まれ、`constant_value_polarity`が述語を証明可能に真であると判定してしまいました。ノートは「本物のギャップであり、ADRスコープの修正が必要……手っ取り早い解決策ではない」という結論を記録しています。

## コンテキスト

このルールには、どちらも折り畳まれた`Type::Constant`に依拠する2つの評価ポイントがあります。

- `AlwaysTruthyConditionCollector`は、述語が`Type::Constant`へ折り畳まれる`IfNode` / `UnlessNode`で発火します（`DEFENSIVE_PREDICATES`、ループ／ブロックの祖先、リテラルASTの述語という保守的なスキップエンベロープを除く）。
- `&&` / `||`の短絡ゲートは`ExpressionTyper#constant_value_polarity`（`expression_typer.rb:732`）経由です。この関数は、値が`is_a?(Type::Constant)`である場合に限り`:truthy` / `:falsey`を返します。

両者とも「この述語は`Type::Constant`である」を「この述語のランタイムの真偽性は決定済みである」として扱います。この前提は、`Type::Constant`が*真正の*コンパイル時定数である場合にのみ健全です。**過剰折り畳み**——狭い形（リテラル引数）に対しては有効だが、より広いランタイム式（変数引数）に対して適用されてしまった折り畳み——ではこれが破綻します。`receiver.public_send(:foo)`は`receiver.foo`と同値であり正当に折り畳まれてよいのですが、`method_name`がパラメータである`receiver.public_send(method_name)`は折り畳まれてはいけません。ディスパッチされるメソッド——ひいては結果——が静的に決定されないからです。この過剰折り畳みが、証明可能に真であると読まれてしまう`Type::Constant`を生成していました。

この過剰折り畳みが到達可能になったのは、ADR-76 WD2ティアが`freeze` / `dup`をまたいでレシーバーのシェイプキャリアを保持するようになってからです（それがなければレシーバーは名前的型／`Dynamic`型へ格下げされ、`public_send`は決して折り畳まれませんでした）。つまり、反射的な`always-truthy`の発火とADR-76 WD2の先送りは、同じ根——決して定数を生成すべきでなかった反射的ディスパッチの折り畳み——に行き着きます。

## 決定

### WD1 — 判定基準: 証明可能な真偽性は真正の定数にのみ依拠する

`flow.always-truthy-condition`（そしてそれが共有する`constant_value_polarity`ゲート）は、ランタイムで真正に成り立つ`Type::Constant`から**のみ**証明可能な真偽性を結論してよく、健全性が実際の式より狭い形に条件付けられている折り畳みからは決して結論してはいけません。過剰折り畳みは型付けのバグです。ルールがそれを真であると読むのは*症状*にすぎず、修正はルールのスキップエンベロープではなく折り畳みそのものに属します。

### WD2 — 原因を修正する: 反射的送信の過剰折り畳みを行わない

ディスパッチャーは、反射的送信（`public_send` / `send` / `__send__`）を、そのメソッド名引数自体が値固定されたリテラル`Constant`（`:foo`）でない限り定数折り畳みしてはいけません。リテラルでないメソッド名の場合、その呼び出しは、シェイプキャリアが保持される以前と全く同様に、本来持つべきだったRBSの結果（`untyped`）へ格下げされます。

これは他のあらゆる箇所で精度中立です。`x.public_send(:literal)`は引き続き折り畳まれます（ディスパッチされるメソッドが静的に既知だからです）。そして`x.public_send(name)`は正当に定数になったことなど一度もありませんでした。したがって、これは**厳密に偽陽性削減的**です——不健全な折り畳みを行わないようにすることは、偽の`Type::Constant`を取り除くことしかできず、発火を増やすことは決してありません。また、真正の`always-truthy`の発火を失うこともありません（ランタイム変数の反射的呼び出しはそもそも折り畳まれるべきではなかったからです）。修正はディスパッチのティア（`MethodDispatcher#resolve`から到達する反射的送信の処理）に置かれるので、不健全な定数は、他の消費者（さらなる折り畳み、ナローイング）を誤らせうる型ストリームに決して入りません。

### WD3 — ADR-76 WD2を再適用する

反射的な過剰折り畳みがもはや定数を生成しなくなれば、ADR-76 WD2のシェイプキャリア保持ティア（`freeze` / `dup` / `clone` / `itself`がレシーバー型をそのまま返す）を再適用できます。WD3を着地させることが、本ADRを単なるFP修正以上の見返りにするものです——調査ノートが見つけた`MESSAGES = {…}.freeze; MESSAGES[reason]`のfoldgapを閉じます。

**実装済み（2026-06-26）:**このティアは、`ShapeDispatch`のハンドラテーブル内の`shape_self`を介して`HashShape`と`Tuple`の**両方**に再適用されます。`HashShape`を先に着地させたことで、WD1の持ち越しが表面化しました。同じ保持を`Tuple`にも適用すると、Rigor自身のreduce／range折り畳みコードで6件の反射的な`flow.always-truthy-condition`発火が再表面化したのです。WD2の反射的送信ガードは**必要だが十分ではありません**でした——残りのクラスは`public_send`ではまったくなく、**ブロック形式の過剰折り畳み**でした。`CONST = [Integer, Float, …].freeze`（frozenな配列リテラルで、今は`Tuple`として保持される）が`CONST.any? { |k| value.is_a?(k) }`に渡され、`ShapeDispatch`の`tuple_any?`が、ブロックを**無視して**noブロックの結果（空でないタプルに対する`Constant[true]`）を折り畳んでいました。すべてのシェイプハンドラはnoブロック意味論を折り畳み、渡されたブロックを評価するものはひとつもないため、この修正は一般的です（下記のWD1持ち越し）。これを備えることで、Tuple保持は`lib`上でもmail／kramdownコーパス上でもmasterと診断的に同一になります（調査ノートの8プロジェクト実行が保持ティア自体を検証済みです）。

## 却下／先送りした代替案

- **反射的に由来する述語に対してルールを抑制する**（`AlwaysTruthyConditionCollector`のエンベロープに反射的送信のスキップを追加する）。1つのルールの症状にパッチを当てるだけで、不健全な`Type::Constant`は他のあらゆる消費者（他の折り畳み、等価性ナローイング、`unreachable-clause`）向けに型ストリーム内に残ります。調査ノートの規律は原因を修正することであり抑制ではありません。WD2はそれを実行します。
- **折り畳まれた定数に反射的／過剰折り畳みの由来をタグ付けし**（[ADR-75](../75-dynamic-provenance/)の縁戚）、`constant_value_polarity`でそれを却下する。WD2と同じ効果に対してより多くの機構を要し、過剰折り畳み自体は他の消費者が信頼しうる型付き値として存在し続けます。由来（provenance）は`Dynamic`を*説明する*ための正しい道具であって、エンジンが生成すべきでなかった定数を*ロンダリング*するためのものではありません。
- **12件のセルフチェック発火を`# rigor:disable`する**。プロジェクトの規律（原因を修正する）によって禁じられています。これこそ、WD2ティアが抑制付きで出荷されるのではなく差し戻された理由です。

## 帰結

- **ポジティブ:** 12件の反射的なセルフチェック偽陽性を根本から取り除き、ADR-76 WD2（ひいては`freeze`されたリテラルのfoldgap）のブロックを解除し、他の消費者を誤らせかねない不健全な反射的ディスパッチの折り畳みを引き締めます。
- **ネガティブ:** `x.public_send(:literal)`における精度の小さな損失は*発生しません*（リテラルメソッド名は引き続き折り畳まれます）。唯一の挙動変化は、ランタイム変数の反射的呼び出しが、偽の定数ではなく`untyped`型になることです——これが正しい挙動です。
- **持ち越し:**同じ「過剰折り畳み⇏証明可能な定数」という判定基準（WD1）を、WD3を着地させる過程で見つかった第2のインスタンス——**ブロック形式の過剰折り畳み**（`ShapeDispatch`が`tuple.any? { … }` / `sum { … }` / `count { … }`をブロックを無視してnoブロックの結果へ折り畳んでいた）にも適用しました。折り畳みの側で修正されています——`ShapeDispatch.try_dispatch`は`block_type`が存在する場合には折り畳みを行いません（どのシェイプハンドラもブロックを評価しないため）。両方のインスタンス（反射的送信、ブロック形式）は今や閉じられており、この判定基準は、健全性が狭い形にしか成り立たない今後のあらゆる折り畳みに対するガードとして残ります。

## 他のADRとの関係

- [ADR-76](../76-effect-modeling-freeze-dup-shape-preservation/) — WD2（シェイプキャリア保持）はこの修正にゲートされています。WD3がそれを再適用します。
- [ADR-47](../47-narrowing-driven-clause-reachability/) — `flow.unreachable-clause`は定数折り畳み済み述語のエンベロープを共有します。同じ過剰折り畳みの判定基準がこれを保護します。
- [ADR-75](../75-dynamic-provenance/) — 却下された由来タグ付けの代替案です。由来は`Dynamic`を説明するものであり、定数を正当化するものではありません。
