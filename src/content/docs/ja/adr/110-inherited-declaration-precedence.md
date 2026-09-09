---
title: "ADR-110 — 継承された宣言はレシーバー自身のdefより優先されない"
description: "rigortype/rigor docs/adr/110-inherited-declaration-precedence.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/110-inherited-declaration-precedence.md"
sourcePath: "docs/adr/110-inherited-declaration-precedence.md"
sourceSha: "1d6c4485a37e197dc3b4e4ce670e888db0ed79467ca10b5f64742a0376f8dbda"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
translationStatus: "translated"
sidebar:
  order: 4110
---

Status: **Accepted, 2026-09-09 — [#856](https://github.com/rigortype/rigor/issues/856)により実装**。
本ADRは[#744](https://github.com/rigortype/rigor/issues/744)の後半、すなわち[#745](https://github.com/rigortype/rigor/pull/745)が前半を修正した際に意図的に未決のまま残した問題に答えるものです。WD1とWD3は、下記のWD5に記録されているWD5のコーパス計測とともに着地しました。条項Aは実装中に3つ目の条件を獲得し、それが述べられている箇所で修正点として明記されています。アーキタイプ: 審議型（deliberative）。ステークス: 高 — ディスパッチャー全体が依存している優先順位を動かすものであり、影響範囲はシグネチャ付きの祖先メソッドをオーバーライドするクラスを持つすべてのプロジェクトにおよび、偽陽性エンベロープに直接位置します。

根拠: [#744](https://github.com/rigortype/rigor/issues/744)（再現手順、および4つの実稼働redmineサイト）、[#745](https://github.com/rigortype/rigor/pull/745)（前半、redmineで82 → 6を測定）。

## 背景

呼び出しのレシーバーが自身のソース内でそのメソッドを定義しているクラスであるにもかかわらず、その名前に対するRBSシグネチャを**祖先**のみが持っている場合、Rigorは祖先の宣言で応答します。これは誰かが意図して下した決定ではありません。ユーザーの`def`に到達可能なすべてのティアの上にRBS支援のティアが配置され、「非`nil`の`Rigor::Type`を返す最初のティアが勝ち、ヒット時にそれ以降のティアを照会してはならない（MUST NOT）」というディスパッチャーのティア順序から生じたものです（[`inference-engine.md:174`](../../internal-spec/inference-engine/) § ディスパッチャーのティア順序）。RBSの探索自体も自身と継承を区別しません。`RbsLoader#instance_method`（[`rbs_loader.rb:1683`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/rbs_loader.rb)）は`RBS::DefinitionBuilder`の完全に解決されたメソッドテーブルを読み取るため、基底クラスに関して記述されたシグネチャが、その名前を継承するすべてのサブクラスに対して返されます。

#744が報告している障害は、この2つが食い違ったときに何が起きるかを示しています。`Redmine::FieldFormat::Base#target_class`は忠実に`nil`を返し、`RecordList#target_class`はそれをルックアップでオーバーライドします。基底クラスに`-> nil`が宣言され、オーバーライド側には何も宣言されていない場合、`RecordList`レシーバーでの呼び出しは`nil`と型付けされ、`rigor type-of`は`nil`を報告し、サブクラス自身の正常に動作しているコードに対して4つの`undefined method … for nil`が発火します。同時に、ユーザーの正しいオーバーライドが間違っていると告げる`def.return-type-mismatch`も発火します。

前半（half 1）では、`sig-gen`がその特定の競合を作り出すのを止めました。`demote_overridden_base_methods`は、プロジェクトのサブクラスが基底メソッドをオーバーライドしており、そのオーバーライドが出力されない場合に、基底メソッドのシグネチャを差し控えます（[`sig_gen/generator.rb:103`](https://github.com/rigortype/rigor/blob/master/lib/rigor/sig_gen/generator.rb)）。これは明白でした — このツールが書き出すシグネチャは、それが生成されたソースとツールのチェッカーを矛盾させてはならないからです。しかし、これは手書きの`sig/`に対しては何もしません。そして問題が実際に存在するのはそこです。

**なぜこれが自明ではないのか**。 RBSのセマンティクスにおいて、継承されたシグネチャは契約であり、オーバーライドはそれに違反しているため、不一致を報告することは首尾一貫しており、現在の回答も擁護可能です。しかし2つの要素がそれを突き崩します。第1に、優先順位は裁定されたことがなく、メソッド解決をモデル化している唯一のADRは逆のことを述べています。「デフォルトのマージポリシーはRubyのランタイム解決に従う: Rubyが実際にディスパッチする候補が勝つ」（[ADR-1](../1-types/) § `MethodEntry`、`1-types.md:314`）。第2に、[ADR-5](../5-robustness-principle/)はまさにこのケースに関して曖昧です。「RBSシグネチャが存在しない場合の推論されたユーザーメソッドの型」（`5-robustness-principle.md:97`）を切り分けていますが、*存在（present）*がレシーバーのクラス上に存在することを意味するのか、祖先解決後に存在することを意味するのかを述べていません。#744の後半はその曖昧さであり、型仕様もそれを閉じていません。[`robustness-principle.md:22`](../../type-specification/robustness-principle/)が拘束しているのはRigor自身の*著作権（authorship）* — 「すでに存在するRBSの著述を上書きしない」 — であり、呼び出しサイトで食い違う2つのソースのどちらが勝つかではありません。

**コーパスはすでに同じ質問に対して、同じ方向に、一度に1ケースずつ、5回答えています**。そのいずれもルールを一般化しませんでした:

| 箇所 | 行うこと |
| --- | --- |
| [ADR-26](../26-activerecord-relation-typing/)シグネチャ側 — `unauthoritative_inherited_signature?`（[`check_rules.rb:1207`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules.rb)） | オープンなレシーバーにおいて、間違ったアリティおよび引数型の不一致を「その名前がオープンクラス自体ではなく祖先を通じて解決された場合にのみ…その解決がそもそも権威あるものではなかった場合」に拒否する |
| トップレベル`def`の拒絶権 — `try_local_def_dispatch`（[`expression_typer.rb:1192`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb)） | ソースの`def`を優先する。その本体が再型付けできない場合は`Dynamic[Top]`と応答する。「RBSディスパッチは間違っているため（メソッドはユーザー定義であり、ディスパッチが見つけるいかなる祖先メソッドもシャドウイングする）」 |
| `instance_self_answers?`（[`expression_typer.rb:1222`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb)） | 「RBSのアームは意図的に自クラスのみである」 |
| [ADR-57](../57-self-call-return-adoption/)オーバーライド可能メソッドのゲート（`57:246`） | その鏡像: 発見されたサブクラスがメソッドを再定義している場合、基底クラスの定数戻り値は採用されず、`Dynamic[top]`に縮退する |
| [ADR-100](../100-static-diagnostic-family-and-void-origins/) voidテールの要約 | **自身の**解決済みシグネチャでのみdefを承認する — 厳密なクラスであり、発見側での祖先の走査は行わない |

そして[`reflection.md:45`](../../internal-spec/reflection/)は、定数についてこの原則をすでに率直に述べています。「ユーザーのソースが権威ある宣言であるため、**衝突時にはソース内が勝つ**」。

## 決定

**シグネチャは、誰かがそのレシーバーに関してそれを記述した場合にのみ、そのレシーバーに対して権威を持つ**。
祖先を通じてシグネチャに到達する解決はルックアップの便宜にすぎず、著述の行為ではありません。レシーバー自身のクラスがソース内でそのメソッドを定義し、それに関する自身の宣言を持っていない場合、実行される`def`が流れる型を決定し、祖先の宣言は決定しません。

それが基準であり、再利用されることを意図しています。上記の5つのメカニズムがそれぞれ局所的に導出していた文そのものです。これは、継承された宣言が一般的に信頼できないというはるかに大きな主張にならないよう、2つの条項によって境界付けられています。

**条項A — 競合が可視であり、失格となる宣言がプロジェクト自身のものでなければならない**。 3つの条件: レシーバー自身のクラスがその名前のソース`def`を持っていること、それに関する自身の宣言を持っていないこと、そしてそうでない場合に応答することになる祖先の宣言がプロジェクト宣言であること。オーバーライドがない場合、継承された宣言は実行されるメソッドに関するもの*であり*、現在とまったく同様に拘束力を持ちます。

**3つ目の条件は実装からの修正点（#856）であり、最初の2つだけでは不十分です**。最初に書かれたとき、この条項はそれだけで決定を[ADR-43](../43-rbs-complete-ancestor-resolution/)の領域の外に保つと主張していましたが、そうではありません。`Enumerable#each`を継承する`class Foo; def each; end`は両方を満たしており、同梱の宣言をそのように失格にすることは、ADR-43が拒否した包括的な修正そのものです — 「一方なしに他方を得ることはできない」（`43:99`）。`ExpressionTyper#instance_self_answers?`がRBSアームを自クラスのみに保っているのも同じ理由です。権威の区別は、`Reflection.project_declared_class?`がすでに引いている区別です。プロジェクトのサイドカーは解析対象のソースを記述しますが、同梱のシグネチャはプロジェクトが所有していないクラスを記述し、そこでのプロジェクトの`def`はモンキーパッチであり、[ADR-17](../17-monkey-patch-pre-evaluation/)がその問題を所有します。これは安全にfalseにフォールバック（fail-soft）するため、宣言を帰属させることができない環境では何も変更されません。

**条項B — 差し控えのみ、決して捏造しない**。継承された宣言を失格にすることは、精度を*失う*ことしかできません。オーバーライドの存在のみを根拠に別の精密な型に置き換えることはできず、今日発火していない診断を発火させることもできません。これは[ADR-58](../58-ivar-field-typing/)のサイドチャネル規律を別のマークに適用したものです — 「コンシューマーは、通常であれば行う発火を*差し控える*ことしかできないため、マークは精度を失うことはあっても、偽陽性を捏造することは決してない」（[`inference-engine.md:371`](../../internal-spec/inference-engine/)）。そしてこれが、この変更を検証可能にする要素です。準拠した実装はいかなるコーパスにも診断を追加できません。

## 作業上の決定

**WD1 — 回答はオーバーライドの推論された戻り値であり、推論できない場合は`Dynamic[top]`である**。エンジンはすでに呼び出し先本体を再型付けしており（`ExpressionTyper#try_user_method_inference`）、#744の再現コードにおいて`RecordList#target_class`を正しく型付けします。本体を型付けできない場合の回答は、祖先の宣言ではなく`Dynamic[top]`です。これは`try_local_def_dispatch`がトップレベルの`def`に対してすでに出荷している形状です（[`expression_typer.rb:1192`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb)）。WD1はその推論を「囲むクラスがトップレベルのdefをシャドウする」から「レシーバーのクラスが祖先の宣言をシャドウする」へと拡張します。

**WD2 — 失格判定は`(class, method name, kind)`ごとに行われ、一致ではなく所有権によって決定される**。ルールは宣言された型と推論された型を比較して狭い方を優先するわけではありません。その宣言が誰について書かれたかのみを問います。不一致によって発動するルールは、本体を型付ける宣言を信頼するかどうかを決定する前に本体を型付ける必要があり、推論が改善されるにつれて異なる回答をすることになります。

**WD3 — `def.return-type-mismatch`は、すでに仕様化されている`defined_on?`ゲートを獲得する**。 [ADR-35](../35-override-signature-compatibility/)はルールを「メソッド**本体**の推論された戻り値vsメソッド**自身**の宣言された戻り値」（`35:250`）と述べており、その兄弟ルールは`defined_on?`を適用しています（[`check_rules.rb:3270`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules.rb)）。`declared_return_type`（[`check_rules.rb:2965`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules.rb)）はそうではなく、継承されたものも含めて`Reflection.instance_method_definition`が解決するものを何でも受け取ります。#744の再現コードの7行目の警告はそのギャップです。ゲートを設けることで、実装は自身の仕様に準拠するようになり、WD1とは無関係に正当化されます。継承ケースに対する「あなたのシグネチャとソースが食い違っている」というシグナルはADR-35のオーバーライド互換性ファミリーに属し、それはすでに両側が著述されていることを要求しています。

**WD4 — 何も改名されない**。 *Declaration-sourced（宣言由来）*は`nil`の来歴を表す拘束された用語であり（[ADR-58](../58-ivar-field-typing/)、`inference-engine.md:367`）、ここで再利用すると衝突します。本ADRは新しい用語を導入しません。この概念をすでに表現している3つのほぼ重複した述語 — `defined_on?`（[`check_rules.rb:3270`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules.rb)）、`rbs_declared_on_class?`（[`expression_typer.rb:1267`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb)）、`declared_on_class_itself?`（[`sig_gen/generator.rb:1410`](https://github.com/rigortype/rigor/blob/master/lib/rigor/sig_gen/generator.rb)） — を挙げ、それらが1つの質問に答えていると述べます。それらを統合することはスコープ外であり、`CONTEXT.md`は何も得ません。

**WD5 — 変更はコーパス計測の裏付けがある場合にのみ着地する**。 [ADR-57](../57-self-call-return-adoption/)の鏡像ゲートが基準を設定しました: セルフチェック、プラグインセルフチェック、およびMastodon / haml / kramdownのコーパスがバイト単位で一致し、`rgl`は13件すべての警告を失いました（`57:204`）。すべて同時に満たさなければならない受け入れ基準:

1. #744の4つのredmineサイトが、基底宣言を再現する手書きの`sig/`に対して解消すること。
2. **いかなるコーパスも診断を増やさないこと**。条項Bにより、これは期待される結果ではなく厳格な基準となります。
3. `make check`と`make check-plugins`がクリーンなままであること。
4. その実行に対する精度または保護のレンズが*報告*され、変更なしと仮定されないこと — 条項Aは精度の損失を制限しますがゼロにはせず、ここでの暗黙のリグレッションこそADR-43が警告している障害モードです。

2の失敗は実装を反証するものであり、決定を反証するものではありません。レビュアーが許容するマージンを超えて4に失敗した場合は、WD1による`Dynamic[top]`の選択が再検討されます。

**測定結果（2026-09-09、#856）**。 25の調査対象、2つの変更ファイルをその場で切り替えた1つのバンドルからの両アーム、`--no-cache --no-baseline`およびプロジェクト自身の設定:

| | base | WD1 only | WD3 only | both |
| --- | --- | --- | --- | --- |
| コーパス全体、新たな診断 | — | — | — | **0** |
| redmine、基底クラスを宣言する手書きの`sig/` | 1021 | **1017** | 1021 | 1017 |
| rgl | 31 | 31 | **30** | 30 |

基準1: redmineの4つのサイト（`field_format.rb:769`、`:784`、`:801`、`:822`）はベースアームで発火し、変更アームで解消しました — 差分全体であり、そのすべてがWD1によるものです。基準2: どこにも新しい診断はゼロであり、redmine以外での唯一の削除は`RGL::DOT::Node#to_s`におけるrglの`def.return-type-mismatch`でした。これは`Node`も`Element`もrgl自身の`sig/`で宣言されていないため、同梱の`Object#to_s`と比較されていたものです — そのすべてがWD3によるものです。レバーごとのアームによって2つを分離可能にしています: 各レバーは生きており、重複せず、どちらも何も追加しません。基準3: `make verify`はグリーン、`make check`と`make check-plugins`は`--fail-on=warning`の下でクリーン。基準4: redmineの精密なノードは23942 → 23936に減少（6ノード、小数第1位でいずれも55.4%）；textbringerは両アームで同一。6ノードが下記のマイナス面であり、主張ではなく測定されたものです。

測定が修正した点が1つあります: #744の合成再現コードにおける`def.return-type-mismatch`警告は、実際のredmineでは再現**しません**。`RecordList#target_class`の`@target_class ||= … rescue nil`本体は証明された`:no`に推論されないため、`compare_return`はそこで黙ったままであり、WD3はredmine上で何も削除しません。WD3はADR-35への準拠とrglサイトに基づいており、#744の4つのサイトに基づいているわけではありません。

## 却下・延期された代替案

| 選択肢 | ステータス | 理由 |
| --- | --- | --- |
| **現在の動作を維持する；警告が緩和策である** | 却下 | ユーザーは警告*と*動作するコードに対する誤ったエラーの両方を受け取ることになる。正しいオーバーライドが間違っていると告げる`def.return-type-mismatch`は、同じ宣言が引き起こす`call.undefined-method`の緩和策ではない — 同じメソッドに関する2つ目の誤った回答である。 |
| **宣言された戻り値と推論された戻り値を結合（join）する** | 却下 | 両方のクラスにとって間違っており、どちらにとっても精密ではない型を生成し、最も重要なケース — オーバーライドが型付け可能であり、Rigorがより狭いキャリアを証明できる場合 — において[ADR-5](../5-robustness-principle/)条項1と矛盾する。 |
| **継承された型を維持する；下流の診断のみを抑制する** | 却下 | 最も安価で最も偽陽性に保守的な選択肢であり、本ADRが採用に最も近づいた選択肢。しかし別の軸で破綻する: `rigor type-of`と`dump_type`は、`String`を返すメソッドに対して`nil`を報告し続けることになる。`AGENTS.md` § "Types and Comments"はオラクルを不可欠なもの（load-bearing）としており（「型を知るにはRigorに尋ねよ」）、[ADR-108](../108-type-provenance-for-agents/)はその契約を導入プロジェクトに出荷する。プログラムが生成しない型を意図的に報告する型オラクルは、ノイズの多いオラクルよりも悪い欠陥である。下流の誰もそれを検出できないからである。 |
| **オーバーライドの有無にかかわらず、継承された宣言を一般的に信用しない** | 却下 | これは名前を変えた[ADR-43](../43-rbs-complete-ancestor-resolution/)の却下された包括的修正である。条項Aはそれを防ぐために存在する。 |
| **パラメータに対しても同じルールを適用する** | 延期 | `MethodParameterBinder`は継承されたシグネチャからオーバーライドのパラメータを型付けし、[ADR-4](../4-type-inference-engine/)はそれを意図された利点（win）として記録している（`4:186`）。対称的な問題は現実に存在するが、偽陽性は報告されておらず、戻り値側の証拠は転移しない。パラメータ側の再現例が存在するときに再検討する。 |

## 結果

- **利点**。 #744の4つのredmineサイト、およびそれらが代表する障害クラス: `sig/`が基底クラスを忠実に記述し、そのサブクラスがメソッドをオーバーライドしているあらゆるプロジェクト。ティア順序は[ADR-1](../1-types/) § `MethodEntry`と矛盾しなくなります。§ 背景の5つのメカニズムは、それぞれが局所的に導出していた明文化されたルールを獲得するため、6つ目のケースがそれを再発見する必要がなくなります。WD3は、本ADRにかかわらず今日存在している仕様と実装の乖離を閉じます。
- **欠点**。実際の精度低下。これは不可避であり、ここでは緩和されません: シグネチャ付きの祖先メソッドを*適合するように*オーバーライドし、推論が型付けできない本体を持つサブクラスは、祖先の精密な戻り値から`Dynamic[top]`に低下します。これらは間違った場所にあるために失格となる正しい宣言です。[ADR-43](../43-rbs-complete-ancestor-resolution/) § 「難所（the crux）」は、なぜこれを安価に得られないのかの理由であり、WD5基準4はそれを否定するのではなく、その大きさを可視化し続けるために存在します。
- **持ち越し**。 WD4の3つの述語は未統合のままです。執筆時点ではWD5の測定は未実行だったため、上記のマイナス面の大きさは不明でした — 本ADRは方向性を決定し、測定していない数値を述べることを拒否します。

## 他のADRとの関係

- **[ADR-1](../1-types/)** — 正当性の根拠を提供します。その`MethodEntry`マージポリシー（`1:314`）は、Rubyがディスパッチする候補が勝つとすでに述べています。本ADRは1つのケースにおいてディスパッチをそれに一致させます。
- **[ADR-5](../5-robustness-principle/)** — `5:97`における曖昧さを解決します: *存在（present）*とはレシーバー自身のクラスに存在することを意味します。祖先上の宣言はこのレシーバーに関する著述ではないため、ADR-5の「すでに存在するRBSの著述は尊重される」には影響しません。
- **[ADR-26](../26-activerecord-relation-typing/)** — 最も近い親戚です。同じ議論、同じ方向性であり、プラグイン宣言のオープンレシーバーにスコープされています。本ADRは、それが特殊なケースであったルールを明文化します。
- **[ADR-14](../14-rbs-sig-generation/)** — #744の前半。ADR-14の矛盾ルールは既存のRBSを生成された厳格化から保護します。生成されたRBSが*ソース*と矛盾することに関する条項はなく、それが[#745](https://github.com/rigortype/rigor/pull/745)がコード内で閉じたギャップでした。
- **[ADR-35](../35-override-signature-compatibility/)** — WD3は`def.return-type-mismatch`を`35:250`の説明に準拠させます。継承された宣言のシグナルはADR-35自身のファミリーに移動します。
- **[ADR-43](../43-rbs-complete-ancestor-resolution/)** — コスト。条項AはADR-43の難所を避けるために線引きされています。
- **[ADR-57](../57-self-call-return-adoption/)** — すでに採択され測定された鏡像。WD5はその証拠基準を採用します。
- **[ADR-58](../58-ivar-field-typing/)** — 条項Bの規律と、WD4が回避する拘束用語を提供します。
- **[ADR-100](../100-static-diagnostic-family-and-void-origins/)** — 祖先探索を行わない自クラスのみの承認の前例。
- **[ADR-107](../107-checked-types-and-typeless-comments/)**、**[ADR-108](../108-type-provenance-for-agents/)** — 異なる優先順位の軸（どの*ファイル*がメンバーを宣言しているか、およびエージェント向けオラクル契約）。ADR-108は3つ目の却下された代替案が却下された理由です。

同じファミリーに属し、ここでは決定されない2つの未解決issueがあります。
[#837](https://github.com/rigortype/rigor/issues/837)は前半の逆です — 祖先や兄弟が広い型を宣言しているメソッドに、sig-genがリテラルの戻り値を固定してしまう問題であり、その概要では「#744ガードの逆」と名付けられています。本ADRが解決の問題であるのに対し、それは出力の問題です。
[#839](https://github.com/rigortype/rigor/issues/839)は、`sig/`宣言がそもそも実在するメソッドを記述しているかどうかの常時チェックを求めています。これら3つを合わせて読むと、1つの勾配になっています: ソースのない宣言（#839）、ソースが別の場所にある宣言（本ADR）、および兄弟が共有する契約よりも狭い宣言（#837）。
