---
title: "ADR-100 — `static.*`診断ファミリーの形と`void_origins`サイドテーブル"
description: "rigortype/rigor docs/adr/100-static-diagnostic-family-and-void-origins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/100-static-diagnostic-family-and-void-origins.md"
sourcePath: "docs/adr/100-static-diagnostic-family-and-void-origins.md"
sourceSha: "3a4959354e5ed40dda3d21f15901ea789e7b3870ff884842d1e3ecd4f1b9d2e1"
sourceCommit: "d88effcae8b2998d1f4f40432e6d4f20ce17946e"
translationStatus: "translated"
sidebar:
  order: 4100
---

ステータス: **Accepted、2026-07-18**。予約された`static.*`ファミリーの*形*を、その最初の識別子がそれを枠にはめ込まないように直し、仕様が義務づける「void値の使用」診断が必要とする`void_origins`サイドテーブルを規定する。まだ何も実装されていない。すなわち、直接に作者が宣言した`void`のスライス（slice）が最初の実装であり、これが着地すれば`ready-for-agent`である。推移的なケースと`static.incomplete-inference.*`予算識別子（[#158](https://github.com/rigortype/rigor/issues/158) / [ADR-41](../41-inference-budget-design/)）は先送りされる。
**2026-07-19改訂** —— 直接スライスはその後出荷された（#187／#192）。下記のWD4補遺は推移的なケースのティアとメカニズムを名指し、その実装スライスのブロックを解除する。予算識別子は先送りのまま残る。

根拠: [#162](https://github.com/rigortype/rigor/issues/162);[special-types.md](../../type-specification/special-types/) § `void`（「void値の使用」のMUST）;[diagnostic-policy.md](../../type-specification/diagnostic-policy/) § `static.*`予約;[ADR-92](../92-normative-status-fidelity/)（`void → top`を解決し、選択肢（a）を未完成の設計として持ち越した）;[ADR-75](../75-dynamic-provenance/)（本ADRが反映する、由来をサイドチャネルとする先例）。

## コンテキスト

[ADR-92](../92-normative-status-fidelity/)は`void`を`top`へ拡大させることに解決し（`RBS::Types::Bases::Void => :translate_top`、`rbs_type_translator.rb`）、5プロジェクトのコーパスで無償であると計測した。それは[special-types.md](../../type-specification/special-types/) § `void`の*拡大*の半分を閉じる。もう半分はまだ開いており、規範的である。すなわち「値コンテキストにおいて、`void`の結果は主要な『void値の使用』診断を生成し**MUST**、ダウンストリームの回復のために`top`として実体化される」。今日`top`と`Dynamic[top]`は等しく沈黙している——これがまさに拡大が無償と計測された理由である——ので、この診断は存在しない。

それを構築するには、存在しない2つのピースが必要であり、最初のものはv1.0の語彙フリーズ（[ADR-50](../50-release-engineering-and-stability-strategy/) WD1）のもとで命名の決定を強いる。

1. **`static.*`診断ファミリー**。[diagnostic-policy.md](../../type-specification/diagnostic-policy/)で**実装済み識別子なし**で予約されている。その予約テキストはすでに*2つ*の職務を名指している——「証明に至らない静的チェック、**不完全推論のカットオフを含む**」。それらは反対の失敗モードである。すなわち、証明なしには使えない値が使用位置に到達する（voidのケース、そして後にガードされていない`top`のケース）のに対し、推論そのものが諦めて拡大する（[ADR-41](../41-inference-budget-design/) / [#158](https://github.com/rigortype/rigor/issues/158)の予算／フューエルのカットオフ、`:info`で作成される）。フラットな`static.*`リーフ空間は、#158が予算ごとに扇状に広がった瞬間に衝突し、出荷される最初のidがファミリーの形を恒久的に固定してしまう。

2. 使用サイトの`top`が、通常の`top`ではなく回復された`void`である*理由*を運ぶ**サイドテーブル**——仕様自身の回復ルール（「値が`void`からの回復によってその位置に到達したことを記録する」）。[ADR-75](../75-dynamic-provenance/)により、由来は値*についての*メタデータであって値がそれ*である*ものの一部ではないので、これは新しいキャリア（carrier）や束のフォークではなく、サイドチャネルである。

## 決定

> **`static.*`識別子は、証明に至らなかった静的チェックを名指す。ファミリーは*どちら向きに*至らなかったかで分かれる——証明を要求する値が使用に到達した（`static.value-use.*`）か、推論が諦めて拡大した（`static.incomplete-inference.*`）か。この分割が荷重を支えるのは、2つの半分が反対のデフォルト深刻度を運び、フラットなリーフ空間では予算の半分が扇状に広がるとそれらを衝突させるからである。voidのケースの由来は、キャリアフィールドではなく、`dynamic_origins`をモデルにした`void_origins`サイドテーブルに乗る**。

この基準は`void`を超えて再利用可能である。すなわち、ガードされていない`top`呼び出しの診断（[special-types.md](../../type-specification/special-types/) § `top`）は将来の`static.value-use.top`であり、すべての予算カットオフは`static.incomplete-inference.*` idである——各新しい`static.*` idは、兄弟リーフを発明するのではなく、2つの失敗モードのどちらを報告するかを問うことで配置される。

## 作業上の決定

**WD1 — 2つのサブファミリー分割**。`static.`下に2つのサブファミリーを予約する。

| サブファミリー | 職務 | id | 作成時深刻度 |
| --- | --- | --- | --- |
| `static.value-use.*` | 証明を要求する値が使用位置に到達した | **`static.value-use.void`**（最初、本ADR）;`static.value-use.top`（予約——ガードされていない`top`の半分、まだADRなし） | `:warning` |
| `static.incomplete-inference.*` | 推論が証明をやめて拡大した | [ADR-41](../41-inference-budget-design/) / [#158](https://github.com/rigortype/rigor/issues/158)のために予約: `.recursion`、`.union-size`、… | `:info` |

深刻度はidごとであり、発行時に`severity_profile:`を通じて再スタンプされる（パイプラインはすでにこれを行う）ので、`:warning`のvalue-use idと`:info`のカットオフidは、ファミリーが深刻度を運ぶことなく共存する。diagnostic-policy.mdの予約テキストは両方のサブファミリーを名指すように更新される。`static.value-use.void`の規範的な行はその実装スライスとともに着地する。

**WD2 — `static.value-use.void`、直接ケースのみ、`bleeding_edge:`の背後**。最初のスライスは、作者が`-> void`と*書き*、その結果が値コンテキストで使われる場所（`x = puts(...)`、`puts(...).foo`）でのみ発火する。明示的な`-> void`は可能な限り最も強い「この戻り値に依存するな」というシグナルなので、これは偽陽性が最も狭い本物の噛みつきである——正当な`top`の使用を怖がらせることはできない。これはこのプロジェクトが最も重く量る失敗モードである（[AGENTS.md](https://github.com/rigortype/rigor/blob/master/AGENTS.md) § Implementation Guidelines）。新しい必須の診断は[ADR-50](../50-release-engineering-and-stability-strategy/) WD1のもとで互換性の変更であるので、`bleeding_edge:`の背後で出荷される。[special-types.md](../../type-specification/special-types/) § `void`はすでにこのゲーティングを記録している。

**WD3 — `void_origins`サイドテーブル、`dynamic_origins`を反映**。出荷済みの`dynamic_origins`（`scope.rb`）との類比によるインターフェース。

- **キー:**導入サイトのASTノード、アイデンティティで鍵付け（`{}.compare_by_identity`）——`dynamic_origins`と同一。
- **値:**解決された`-> void`の起源サイト（その`void`戻り値が回復されたメソッド／呼び出し）。ゆえにメッセージは*どの*voidが使用に到達したかを言える——キャリアフィールドではなく、小さな原因記録。
- **投入するもの:**戻り値型付けティア、`void → top`が拡大する場所——既存の`record_dynamic_origin`のそばの新しい`Scope#record_void_origin(node, origin)`。
- **消費するもの:**値コンテキストの値が`void_origins`に存在するときに`static.value-use.void`を発火させる新しい値コンテキストチェックルール——`dynamic.*`の説明が`origin_lookup.rb`経由で`dynamic_origins`を読むのと並行。
- **フロー状態の衛生:** `Scope#==` / `#hash`から除外され、`#join`（`scope.rb` § advisory metadata）を通じて参照で通される。ゆえにそれは決してdedupやキャッシュキーをフォークしない——[ADR-75](../75-dynamic-provenance/)が確立したのと同じ規律。

**WD4 — 何が先送りされるか、そしてなぜか**。**推移的なケース**（`def bar; foo; end; a = bar`、`bar`自身のシグネチャが何も宣言しない場合）は厳密により難しい。すなわち、今日のボディごとの起源テーブルはメソッドボディごとにリセットされ、メソッド戻り値サマリーをまたいで由来を運ばないが、それがまさに推移的なケースが必要とするものである。それは独自のダウンストリームスライスを稼ぐ——下記の[2026-07-19補遺](#補遺--wd4-推移的なケースティアとメカニズム2026-07-19)で設計されている。**`static.incomplete-inference.*`予算識別子**は、[ADR-41](../41-inference-budget-design/)がProposedを離れることとその独自の需要ゲート付き計測にブロックされたまま残る——本ADRはvoidのidがそれらを先取りしなくてよいように、そのサブファミリーを*予約する*だけである。

## 却下／先送りした代替案

- **フラットな`static.*`リーフ空間**（`static.void-use`、`static.recursion-budget`、…）。却下: それは使用サイトのガードと推論のカットオフ——反対のデフォルト深刻度を持つ反対の失敗モード——を1つの名前空間に衝突させ、最初のidが、#158の予算idが到着して衝突を明らかにする前に、そのフラットな形を設定してしまう。
- **`void`キャリア／束のフォーク**（型オブジェクトの中で`void`を`top`と区別する）。却下: [ADR-92](../92-normative-status-fidelity/)がすでに`void → top`を選び、それを無償と計測した。[ADR-75](../75-dynamic-provenance/)により「理由」は値についてのメタデータなので、サイドテーブルが、エンジン全体が学ばねばならないキャリアなしにそれに答える。
- **今すぐ推移的なケースを構築する**。先送り（WD4）: それはエンジンが運ばない戻り値サマリーの由来を必要とし、偽陽性の面とコストを一歩で同時に上げる。
- **voidの診断をデフォルトで`:warning`オンで出荷する（`bleeding_edge:`なし）**。却下: 新しい必須の診断はADR-50 WD1の互換性の変更である。ゲートが規律であり、直接ケースは証拠が積み上がれば昇格できるほどすでに偽陽性が十分に狭い。

## 影響

- プラス: 仕様の`void`使用のMUSTが、キャリアやフリーズを危険にさらすフラットなファミリーなしに構築可能になる。最初の`static.*` idはファミリーの形が確定した状態で着地するので、#158の予算idは改名なしにはまる。
- マイナス／コスト: 新しい診断idがv1.0で凍結された語彙に入る——意図的で境界づけられているが、フリーズ後は不可逆。`void_origins`サイドテーブルはScopeが通す2つ目のアドバイザリーテーブル（`dynamic_origins`のように）であり、小さな常設コストである。
- 持ち越し: `static.value-use.top`（ガードされていない`top`の半分）と推移的なvoidのケースは予約／先送りのまま残る。`static.incomplete-inference.*` idはADR-41を待つ。

## 他のADRとの関係

- **ADR-92** —— `void → top`を解決し、選択肢（a）（区別されたvoidの診断）を未完成の設計として明示的に持ち越した。本ADRはそのフォローオンである。
- **ADR-75** —— 由来をサイドチャネルとする先例。`void_origins`はキー、衛生、消費において`dynamic_origins`を反映する。
- **ADR-41 / #158** —— `static.incomplete-inference.*`の半分を所有する。本ADRはそのサブファミリーを予約し、そのidを先送りする。
- **ADR-50** —— WD1が診断語彙を凍結する。それが、ファミリーの形がその場しのぎで育てられるのではなくここで決定される理由であり、最初のidが`bleeding_edge:`の背後で出荷される理由である。

## 補遺 —— WD4: 推移的なケース、ティアとメカニズム（2026-07-19）

推移的なケースとは`def bar; foo; end; a = bar`である。ここで`foo`は作者が`-> void`と宣言し、`bar`自身のシグネチャは何も宣言しない。すなわちvoid値は`bar`の本体を通じて`a`に到達するので、`bar`のシグネチャを読むルールはどれもそれを見られない。ある実装試行（2026-07-18、差し戻された）は、`ExpressionTyper`のディスパッチ後の呼び出しティア（`try_user_method_inference`とその兄弟）に由来を記録した——そのどれもチェックパス上で発火しなかった。この補遺は、値が実際にどこを流れるか、そして適合するメカニズムを記録し、スライスのリスクを下げる。

### ティアマップ、経験的に確立

中間メソッドの呼び出しにどのティアが応答するかは、リーフのRBSがどこから来たかに依存する——**2つの**供給パス（serving path）があり、どちらも差し戻された試行が狙ったものではない。

1. **[ADR-93](../93-default-rbs-inline-ingestion/)の自動配線のもと（デフォルト）**。インラインの`#: () -> void`が*ファイル*をゲートインし、するとupstreamのライターはその中の**すべての**アノテーションのないdefに対して`def bar: () -> untyped`のスケルトンを発行する（rigor-rbs-inlineのシンセサイザーは、ゲートインされたファイルについてupstreamのセマンティクスを逐語で保つ。ADR-93のアノテーションゲートはアノテーションなしの*ファイル*を除外するだけである）。したがって中間メソッドの呼び出しには、合成された`untyped`シグネチャを`Dynamic[Top]`（`EXPLICIT_UNTYPED`起源）へ解決する**`RbsDispatch`**が応答する。`ExpressionTyper`のティアには決して到達しない。
2. **部分的な手書きの`sig/`のもと**（リーフは宣言され、中間は不在、インラインアノテーションなし）、中間メソッドはシグネチャをまったく持たない。すなわち`RbsDispatch`はミスし、`try_discovered_method`は意図的に辞退し（再型付け可能な本体）、`try_user_class_fallback`は辞退し（クラスはRBSで既知*である*）、呼び出しには本体を`top`へ再型付けする**`ExpressionTyper#try_user_method_inference`**が応答する。

（`rigor type-of`プローブはパス1を観測できない。すなわち`TypeOfCommand#project_environment`はプラグインレジストリなしに`Environment.for_project`を構築するので、そこではソースRBSの合成が走らない——チェックパスの戻り値を`try_user_class_fallback`に帰属させ、チェックが`top`を計算する箇所で`nil`型を見た以前のプローブは、チェックパスではなくこの非対称な環境を読んでいた。）

どちらの応答も変えてはならない正しい*型*である。したがって由来をいずれか1つの結果ティアの内部に記録するのは間違った形である。記録は**結果非依存**でなければならない。

### 決定 —— defごとの遅延voidテールサマリー、ディスパッチのチョークポイントで参照

**サマリー**。`VoidTail(def_node) → VoidOrigin | none`。すなわち最初の参照時に必要に応じて計算され、`def_node`ごとにメモ化され（アイデンティティで鍵付け）、サイクルガード付き（訪問済み集合 ⇒ 却下）、そして**純粋**である——ASTの形、RBSリフレクション、および発見インデックスのルックアップのみで、式評価は決して行わない——ので、ディスパッチに再突入できず、評価順序およびフォークプールのファイル分割から独立している（本体評価時に記録する*先行的な*テーブルはまさにそこで却下された。すなわちパブリックAPI優先のファイルは呼び出し先より前に呼び出し元を評価し、ファイルをまたぐ発火はどのワーカーがどのファイルを解析したかに依存してしまう）。defが認められるのは、以下をすべて満たす場合に限る。

1. `(owner, name, kind)`に対する**それ自身の**解決されたシグネチャが不在であるか、または`untyped`を返す——作者が宣言した具体的な戻り値はそれを対象外にする（`-> void`自身も含む。これは直接ルールがすでに呼び出しサイトで供給している）。
2. その本体が素のステートメント本体である——`rescue` / `else` / `ensure`なし——かつ**どこにも`ReturnNode`がない**（素の`return`は`nil`を生む、これはvoidでない値のパスなので、voidテールが*唯一の*戻り値パスでなければならない）。
3. その末尾（最後の）式が、暗黙の`self`レシーバー（`nil`レシーバーまたはリテラルの`self`）を持つ`CallNode`である。そして
4. その末尾が同じオーナー上で（正確なクラス、発見側では祖先のwalkなし）、**すべての**オーバーロードが`void`を返すRBS定義——リーフ。記録される起源は`VoidOrigin(owner, tail_name, kind)`——か、または別の発見されたdef（`user_def_for` / `singleton_def_for`）のいずれかに解決し、後者は再帰する。

それ以外のすべて——明示的レシーバーの末尾、条件／ブール／beginの末尾、解決不能な名前、voidでない具体的なRBS——は却下する。合成（`def baz; bar; end`）は再帰であり、起源は*リーフ*のまま留まるので、メッセージは依然として作者の`-> void`メソッドを名指す。

**参照**。`MethodDispatcher.dispatch`の中の1つのフック——すべての`ExpressionTyper`の呼び出しがディスパッチ後の推論ティアが走る*前に*通るラッパー——なので、1つのサイトで両方の供給パスをカバーする。`scope`と`call_node`が通され（内部ディスパッチャーの呼び出し元はそれらをnilにする）、レシーバーが`discovered_method_lookup`を通じて射影されるとき（`Nominal`/`Singleton`のみ——ユニオンと`Dynamic`レシーバーは対象外）、`Scope#discovered_method?`で事前フィルタし（2つの純粋なハッシュ読み取りなので、ホットパスは何も払わない）、defを解決し、サマリーがヒットしたら`scope.record_void_origin(call_node, origin)`を呼ぶ——直接ルールが書くのと同じ記録なので、`VoidValueUseCollector`と診断idは変わらず発火する。記録は型を問わず、ディスパッチ結果を無視する。ステートメント位置の記録はコレクターが値位置のみ読むので不活性のまま残る。

**型の優先順位は直交的であり、前提条件ではない**。差し戻された試行は「`-> void`は本体推論に対して*型*で勝つわけではない」を、本当の作業かもしれないと枠づけた。そうではない。すなわちコレクターのゲート全体が`void_origins`のメンバーシップであり——値の型は決して関与しない——[ADR-92](../92-normative-status-fidelity/)の無償と計測された結果は、まさに`void → top`が型ドメインで沈黙し続けることに依拠している。サマリーはAST + RBSのみから導かれ、参照は結果を無視するので、untypedシグネチャ対本体推論の優先順位に対する将来のいかなる変更（#194の軸）も、このメカニズムを両方向で無傷のまま残す。

### 偽陽性エンベロープ

変わらないゲート: `bleeding_edge:`のもとの`use-of-void-value`、すべてのデフォルトプロファイルで`:off`に解決される。変わらないidと深刻度（`static.value-use.void`、作成時`:warning`）。唯一の戻り値パスのルール（許可条件2）はエンベロープの核心である——voidテール*以外の*何かを返しうるメソッドは決してテーブルに入らないので、他の理由で生成された`top`は決して発火せず、許可条件1は直接ルールとサマリーを構成上互いに素にする（二重記録なし）。`untyped`はRBS自身のセマンティクスにより「主張なし」として読まれるので、手書きの`-> untyped`中間メソッドは依然として認められる——由来のファクト（「この値は作者が宣言した`-> void`の戻り値によって生成された」）はそれについて真のまま残る。もしコーパスの証拠がこれが意図的なオプトアウトに噛みつくことを示したなら、許可条件1はファミリー、テーブル、コレクターに触れることなく、シグネチャの由来（合成バッファ対`sig/`ファイル）で硬化できる。このスライスの意図的な偽*陰性*で、[ADR-5](../5-robustness-principle/)のもとで許容されるもの: 明示的レシーバーの末尾（`def bar; other.foo; end`）、分岐／ブールの末尾、継承された中間メソッド（正確なクラスの発見ルックアップ）、トップレベルのdef（チョークポイントより前に`try_local_def_dispatch`が供給する）、そして`MultiWriteNode`のスプレッド（コレクターがすでに除外している）。

### 受け入れ

直接スライスと同じバー: 機能オフでmail / kramdown / haml / liquidがバイト同一（記録は存在するが何も読まない）、かつオンでも新しい発火なし。`make verify` + `make check-plugins`がクリーン。再現では、1ホップと2ホップの値使用が発火し、ステートメント位置の呼び出しは沈黙のまま。[special-types.md](../../type-specification/special-types/) § `void`のステータス段落は、specが拘束するルールに従い、スライスと同じコミットで推移的なケースを先送りから実装済みへ移す。
