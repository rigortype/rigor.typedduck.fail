---
title: "ADR-100 — `static.*`診断ファミリーの形と`void_origins`サイドテーブル"
description: "rigortype/rigor docs/adr/100-static-diagnostic-family-and-void-origins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/100-static-diagnostic-family-and-void-origins.md"
sourcePath: "docs/adr/100-static-diagnostic-family-and-void-origins.md"
sourceSha: "690f010f305e0f6dd46d365be29dbf6867cd6cbd8d2607ea098c6bdcf8745709"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 4100
---

ステータス: **Accepted、2026-07-18**。予約された`static.*`ファミリーの*形*を、その最初の識別子がそれを枠にはめ込まないように直し、仕様が義務づける「void値の使用」診断が必要とする`void_origins`サイドテーブルを規定する。まだ何も実装されていない。すなわち、直接に作者が宣言した`void`のスライス（slice）が最初の実装であり、これが着地すれば`ready-for-agent`である。推移的なケースと`static.incomplete-inference.*`予算識別子（[#158](https://github.com/rigortype/rigor/issues/158) / [ADR-41](../41-inference-budget-design/)）は先送りされる。

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

**WD4 — 何が先送りされるか、そしてなぜか**。**推移的なケース**（`def bar; foo; end; a = bar`、`bar`自身のシグネチャが何も宣言しない場合）は厳密により難しい。すなわち、今日のボディごとの起源テーブルはメソッドボディごとにリセットされ、メソッド戻り値サマリーをまたいで由来を運ばないが、それがまさに推移的なケースが必要とするものである。それは独自のダウンストリームスライスを稼ぐ。**`static.incomplete-inference.*`予算識別子**は、[ADR-41](../41-inference-budget-design/)がProposedを離れることとその独自の需要ゲート付き計測にブロックされたまま残る——本ADRはvoidのidがそれらを先取りしなくてよいように、そのサブファミリーを*予約する*だけである。

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
