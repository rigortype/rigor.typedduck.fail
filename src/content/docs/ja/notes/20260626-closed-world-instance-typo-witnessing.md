---
title: "将来ADR候補 — in-source インスタンスに対する閉世界未定義メソッドタイポ検出"
description: "in-sourceクラスの外部呼び出しでタイポが未検出になる欠落を記録し、self-callの閉世界ゲートを拡張する将来ADR候補を検討する。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260626-closed-world-instance-typo-witnessing.md"
sourcePath: "docs/notes/20260626-closed-world-instance-typo-witnessing.md"
sourceSha: "020790f581ee6ea8bf510e431d26a3f3df98e76bda3f48f8cf33ecf4d888c74d"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
sourceDate: "2026-06-27T02:51:22+09:00"
sourceLanguage: "en"
translationStatus: "translated"
sidebar:
  order: 20266626
---

Status: 将来ADR候補、2026-06-26記録。**決定ではない** — FPの見取り図を添えて記録した
ギャップであり、裁定の壁の手前に置かれている。もし推進されるならADR-57の
firing-class単位裁定プロトコルの下でADRになる。それまでこのノートがしおりを
務める。

裏付け: 2026-06-26のrigor-rsポートフィードバック（項目3 — 「in-sourceインスタンスへの
寛容さ＝見逃されたバグ」）を、`lib/rigor/analysis/check_rules.rb`と
`lib/rigor/reflection.rb`に照らして確認した。

## ギャップ

`call.undefined-method`は、receiverのクラスがRBS未知であるとき、タイポの検出前に
処理を打ち切る。

```ruby
# check_rules.rb ~L556
return nil unless Rigor::Reflection.rbs_class_known?(class_name, scope: scope)
```

プロジェクト自身のモデルはin-sourceでRBSを持たないため、`rbs_class_known?`が
falseになり → ルールはそれをスキップする。結果として、実際のバグ — クラス外部
から呼ばれる自分のメソッドへのタイポ —

```ruby
user = User.find(id)   # UserはApp/models/user.rbで定義、RBSなし
user.full_naem         # タイポ; 今日は検出されない
```

が見過ごされる。これは**完全性より健全性を優先する**立場である（コンテキスト:
in-sourceクラスは権威あるメソッド表を持たないため、それを列挙して呼び出しを
「未定義」と証明することは偽陽性のリスクを負う）。既定としては正しいが、頻出で
ありふれたバグクラスを取り逃す。

チェーンされたバリアントはすでに部分的に回収されている。`full_name`の戻り値型が
分かっていれば、tier-4のin-body戻り値推論（ADR-57）経由で`user.full_name.lenght`は
発火しうる。in-sourceインスタンスへの**直接の**タイポこそが残された穴である。

## リポジトリ内の先行事例 — self-call向けの仕組みはすでに存在する

`call.self-undefined-method`（ADR-24 slice 4、`self_undefined_method_diagnostics`、
check_rules.rb ~L785）は**まさにこのバグをself-callのケースで既に検出している**
— クラス*内部*での`self.full_naem` / 暗黙selfの`full_naem`へのタイポである。
これは、あらゆる拡張のテンプレートとなる閉世界ゲートによって実現されている。

- receiverクラスがin-sourceであり、**モジュール／ミックスインの契約ではない**こと。
- **`method_missing`を定義していない**こと（`scope.discovered_method?(class_name,
  :method_missing, :instance)`、check_rules.rb ~L880）。
- メソッド集合がそれ以外の点では列挙可能として扱われること。

つまり本提案は**新しい仕組みではなく** — その閉世界ゲートをselfレシーバーから
**in-sourceクラスに型付けられた外部レシーバー**へと拡張するだけである。

## 候補tierの見取り図

`recv.meth`を未定義として検出するのは、*すべて*が成立するときのみとする。

1. 推論が`recv`を単一の具体的なin-sourceクラス`C`（`Dynamic`でも、ユニオンでも
   なく、RBS未知）に型付けたこと — self-callケースが無償で得ている精度の前提条件。
2. `C`が既存の閉世界ゲートを通過すること: `method_missing`なし、mixin/契約でも
   なく、加えて**`define_method` / `class_eval` /メタプログラミングによるメソッド
   注入がない**こと、実行時に`meth`を追加しうる動的ミックスインもないこと。
3. `meth`が`C`の全被発見祖先チェーン（in-sourceのincludeを含む）から欠けている
   こと。

（1）〜（3）のいずれかに不確実性があれば、辞退する（今日の沈黙のまま） —
発火の方向へは決して広げない。

## なぜ見送られるか（FPの見取り図と優先順位）

- **発火はレシーバーの精度にゲートされる。** これはレシーバーがin-sourceクラスに
  精密に型付けられた場合にのみ発火する。実運用アプリではそのレシーバーが既に
  `Dynamic`であることが多く（フレームワーク呼び出し・params・インスタンス変数
  からのメソッドチェーン）、実現される捕捉率は健全性リスクに対して低い可能性が
  ある — CRuby標準ライブラリキャンペーンの教訓（調査範囲はまずサンプルで裁定
  されねばならない）に従い、これは着手前にコーパス測定が必要である。
- **メタプログラミングによるFP面は現実のものである。** Railsのモデルは静的な
  閉世界スキャンでは完全には見えない形で実行時にメソッドを追加する
  （関連付け／属性マクロ、concern内の`define_method`、*スーパークラス*や
  includeされたモジュール上の`method_missing`）。このゲートはself-undefinedの
  ケースと少なくとも同程度に保守的であるべきで、おそらくそれ以上に厳格であるべき
  である。なぜなら外部呼び出し元はin-body呼び出しよりも文脈が少ないからである。
- **ADR-58より優先順位が低い。** インスタンス変数フィールド型付け（ADR-58）は
  同じモデルコードに対してより多くの保護を実現し、新たな発火ポリシーリスクを
  伴わない。パラメーター推論（ADR-67）はこのtierが依存するレシーバー精度を
  供給する。両者はこのtierの自然な前提であり — このtierはレシーバーがより
  頻繁に型付けられるようになった*後*に最も価値を持つ。それはまさにADR-58/67が
  もたらすものである。

## 既存の面との関係

- **ADR-24**（`call.self-undefined-method`） — 拡張対象の閉世界ゲート。本tierは
  その外部レシーバー版の兄弟にあたる。
- **ADR-34**（`call.unresolved-toplevel`） — toplevel self版の類似物。レシーバーが
  異なる。
- **ADR-58 / ADR-67** — 実現される捕捉率を引き上げる精度面の前提。

## 推進する場合

ADRとして起草する（`call.undefined-method`閉世界tier）。WD1 =
実装*前*のアルゴリズム＋Railsサーベイコーパスに対するレシーバー精度捕捉率の
コーパス測定、WD2 = `self_undefined_method_diagnostics`の閉世界述語を再利用する
ゲート拡張、WD3 = 厳格なメタプログラミング脱出ガード、gate green = 裁定済み
ゼロデルタ（ADR-57プロトコル）＋手動プローブによる判別形状（concernに注入された
メソッド、association accessor、`define_method`のreader）が各々辞退することの
証明。
