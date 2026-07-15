---
title: "ADR-80 — `type_specifier`プラグインフックを`narrowing_facts`にリネーム"
description: "rigortype/rigor docs/adr/80-narrowing-facts-rename.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/80-narrowing-facts-rename.md"
sourcePath: "docs/adr/80-narrowing-facts-rename.md"
sourceSha: "00f1382f73f167de899c16749d127dd38de58251ef2b77bc7d71f3a2b43eb85b"
sourceCommit: "eb8e9996d113a1b5e1778d0988597c979814a219"
translationStatus: "translated"
sidebar:
  order: 4080
---

ステータス: **Accepted、2026-06-26。0.3.0で完了**。プラグイン作者向けDSL動詞`type_specifier`は
`narrowing_facts`にリネームされ、0.2.x系を通じて警告を出すエイリアスとして生き残り、
**0.3.0で削除されました**（クラス定義時に`NoMethodError`を送出するようになりました）。
バンドルされたminitest／sorbet／rspecの各プラグインは移行されます。**本ADRが先送りした
持ち越しは、その削除の時点で完全な一貫性を採る方向に決定されました**——下記の0.3.0の補遺を
参照してください。

根拠: 2026-06-26のrigor-rsポートからのフィードバック（項目5——名前が誤解を招く）、
[ADR-60](../60-pre-freeze-plugin-contract-consolidation/)の契約凍結との突き合わせ、
[ADR-50](../50-release-engineering-and-stability-strategy/)のWD1におけるv1.0語彙凍結との
突き合わせ。

## コンテキスト

`type_specifier`（ADR-37のスライス2フック）は、その兄弟である{`dynamic_return`}と対をなす
ものに読めます——しかし`dynamic_return`は**型**を返す一方、`type_specifier`が返すのは
**戻り後のナローイング（narrowing）ファクト**（呼び出しが確立する述語／アサーションの
エッジ、例えば`assert_kind_of(String, x)` ⇒ `x`は`String`にナローイングされる）です。この
名前はまさに誤ったメンタルモデルを招きます。契約を写し取らねばならないrigor-rsポートの作者
（そのADR-0027）もこれに惑わされましたし、内部ストレージの名前（`post_return_facts`）は
すでにより真実に近いものです。

[ADR-60](../60-pre-freeze-plugin-contract-consolidation/)はここで維持の判定を記録しましたが、
それが擁護したのは**`dynamic_return`／`type_specifier`の分割**（1つではなく2つのフック）
であり、その却下された代替案は両者を*マージする*ことでした。ADR-60は*名前*を擁護しては
いません。したがって名前は未解決の問題であり、[ADR-50](../50-release-engineering-and-stability-strategy/)
はv1.0でプラグイン語彙を凍結します——1.0未満・採用前（サードパーティの利用はゼロ）が
これを修正する最も低コストな瞬間であり、誤った名前が恒久化する前の唯一の機会です。

## 決定

フックを**`narrowing_facts`**にリネームします。判断基準——再利用可能な規則:

> **公開DSL動詞は、作者が宣言するものを名指しする**。このフックが宣言するのはナローイング
> の*ファクト*であり、それゆえファクトにちなんで名付けられるべきであって、型を返す兄弟への
> 見せかけの対応関係によってではありません。明快さに資するリネームは、後方互換コストが
> 最も低い1.0未満・採用前のうちに払われます——v1.0の凍結後、名前は恒久のものになります。

- `narrowing_facts(methods:) { |call_node, scope| facts | nil }`が正式なフックです。
- `type_specifier`は**非推奨エイリアス**として残ります——プラグインごとに一度だけstderrへ
  警告を出し、`narrowing_facts`に委譲します。**0.3.0で削除されます**（`plugin/base.rb`）。
- **対象範囲は作者向けの動詞のみです**。エンジン側のリーダー`type_specifiers`、消費側の
  `#type_specifier_facts`、そして`rigor plugins --capabilities`のJSONフィールド
  `type_specifier_methods`は**ここではリネームしません**——前者2つはプラグイン作者が
  決して書かない内部APIであり、JSONフィールドは別途凍結されたCLI出力サーフェス（ADR-50）
  で、そのリネームは別の決定だからです。これらは0.3.0でエイリアスが削除される際に見直され
  ます。

## 却下／先送りした代替案

- **`type_specifier`を維持する** —— 却下: v1.0の凍結はこの誤った名前を恒久化させてしまい
  ます。修正は今は無料ですが、後では不可能になります。
- **このスライスで内部＋capability JSONもリネームする** —— 先送り: 2つ目の凍結済み
  サーフェス（CLI出力）にまたがるscope creep（対象範囲の肥大化）です。作者向けの動詞こそが
  誤解を招くものです。0.3.0のエイリアス削除時に見直します。
- **`narrowing_facts`を`dynamic_return`にマージする** —— 却下（ADR-60によりすでに）:
  分割は原則に基づいています（戻り値型 対 ファクト、ディスパッチャー 対 文評価器、異なる
  ゲート形状）。マージされたDSLは内部で判別子により分岐することになり、得られるのは
  リネームだけです。

## 帰結

- **ポジティブ:**動詞が実際に行うことを言い表すようになります。バンドルされたプラグインは
  明快に読めます。rigor-rsのミラーは、古い名前を2つの実装にわたって固定化するのではなく、
  より真実に近い名前を採用できます。
- **ネガティブ:** 1マイナーバージョン分の、生きたエイリアス＋警告付きの非推奨期間があります。
  2つ目の内部リネームが0.3.0に向けて保留のまま残ります（本ADRで追跡）。
- **持ち越し:** 0.3.0はエイリアスを削除し、一貫性のため内部リーダー／capability-JSONの
  名前を見直します——下記で解決します。

## 補遺（0.3.0）—— 持ち越し、決定

エイリアスの削除は非推奨一掃バッチとともに着地し、先送りされた名前は残されるのではなく
**完全に**リネームされました:

| サーフェス | 旧 | 新 |
| --- | --- | --- |
| クラスレベルのリーダー | `type_specifiers` | `narrowing_facts_rules` |
| エンジンが呼び出す消費側 | `#type_specifier_facts(call_node:, scope:)` | `#narrowing_facts_for(call_node:, scope:)` |
| `rigor plugins --capabilities`のJSONキー | `type_specifier_methods` | `narrowing_facts_methods` |

決定のscope制限は2つの主張に拠っていました。1つ目——内部はプラグイン作者が決して書かない
APIである——は真ですが、本ADRが誤解を招くと呼ぶ名前を*維持する*理由にはなりません。ドリフト
で固定されたリーダーはエンジンを拡張する者なら誰でも読むものであり、古い名前のまま残すと、
契約が実装されるまさにその場所で誤ったメンタルモデルが保たれてしまいます。2つ目——JSONキーは
別途凍結されるサーフェスであり、そのリネームは別個の決定である——は、まさにそれを*ここで*
決着させねばならなかった理由です: このキーはv1.0で公開語彙として凍結され（[ADR-50](../50-release-engineering-and-stability-strategy/)のWD1）、
0.3.0は破壊を許すマイナーなので、これが修正が無料である最後のウィンドウでした。再び先送り
すれば、外部の消費者が実際に読む唯一のサーフェスにおいて誤った名前を凍結させてしまった
はずです。

コスト: `rigor plugins --capabilities`の消費者は新しいキーを読まねばなりません（値の形状は
変わりません）。そのコストは1.0前に、小さく列挙可能な聴衆によって一度だけ支払われます——本ADR
が動詞そのものについて行ったのと同じトレードオフです。

## 他のADRとの関係

- **ADR-37** —— フック（スライス2）を導入しました。本ADRはそれをリネームします。
- **ADR-60** —— *分割*を維持しました。本ADRは、その維持の判定が対象としなかった*名前*を
  改めます。
- **ADR-50** —— 本ADRが収まるv1.0の凍結ウィンドウです。エイリアス化してから削除するのは
  1.0未満のBC（後方互換）規律です。
- **rigor-rs ADR-0027**（兄弟のRustポート）—— この契約をミラーします。リネームを追跡する
  べきです。
