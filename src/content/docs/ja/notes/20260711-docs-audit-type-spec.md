---
title: "型仕様ドキュメント監査 —— 忠実度 + 内部整合性（2026-07-11）"
description: "rigortype/rigor docs/notes/20260711-docs-audit-type-spec.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-audit-type-spec.md"
sourcePath: "docs/notes/20260711-docs-audit-type-spec.md"
sourceSha: "bfedd14b134780141f60d2af1db9a571efa99055a621a394482e6fbba2c3be63"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

観点: 規範的な型仕様コーパス（`docs/type-specification/`、17ファイル）を、（a）文書間の内部整合性と、（b）要となる主張における`lib/rigor/`実装への忠実度の観点で検査した。仕様が拘束力を持つ。実装が乖離している箇所については、その乖離を顕在化させる（ドキュメント対コードの向きを記録するにとどめ、優劣の裁定はしない）。

方法: 全17ファイルの通読、`lib/rigor/type/`の的を絞った読み込み（`combinator.rb`、`dynamic.rb`、`top.rb`、`union.rb`）、束／代数／表示に関する主張についてFlake内でのCLIレベルのCombinatorプローブ、予算設定のサーフェスと抑制のファミリーワイルドカード集合についての`lib/rigor`全体の`grep`。

## 所見

| # | 箇所（file:line + 引用） | 問題 | 深刻度 | 提案する修正 |
|---|---|---|---|---|
| 1 | `value-lattice.md:41-53`（`Dynamic[A] \| Dynamic[B] = Dynamic[A \| B]`、`T \| Dynamic[U] = Dynamic[T \| U]`、`Dynamic[T] & U = Dynamic[T & U]`、`Dynamic[T] - U = Dynamic[T - U]`）＋動作例`:57`「`untyped & String`は`Dynamic[String]`になり、素の`String`でも生の`untyped`でもない」；`normalization.md:22`「dynamic由来のユニオン・インターセクション・差分は、静的ファセットを変換しラッパーを保持することで正規化する」；`special-types.md:41`は「完全な代数……はvalue-lattice.mdにある」と参照 | **impl-divergence**（エンジンが適用しない規範的な正規化規則）。`Type::Combinator`が正規化レイヤー（そのヘッダーは`normalization.md`を引用）だが、`union`／`intersection`／`difference`はdynamicファセット変換を**何も**行わない。Flakeプローブ: `union(Dynamic[Integer], Dynamic[String])` → `Dynamic[Integer] \| Dynamic[String]`（2つの`Dynamic`の`Union`であり、`Dynamic[Integer \| String]`ではない）；`union(String, Dynamic[Integer])` → `Dynamic[Integer] \| String`；`intersection(Dynamic[String], Integer)` → `Dynamic[String] & Integer`（生の`Intersection`）；`intersection(untyped, String)` → `Dynamic[top] & String` —— 動作例の`Dynamic[String]`に直接矛盾する。`scope.rb#join`は同じ`union`経由で拡幅するので、フロー合流レイヤーでもこの代数は欠落している。 | High | `Combinator.union`／`intersection`／`difference`にファセット変換を実装する（結合／交わり／差分された静的ファセットの周りに`Dynamic[·]`を再構築する）か、あるいは —— `inference-budgets.md`がすでに設定している誠実さの先例に倣い —— `value-lattice.md`／`normalization.md`に「実装状況」の注記を追加し、これらの恒等式を規範的だが未配線とマークし、`untyped & String`の動作例を出荷済みの振る舞いと読めないように書き直す。（振る舞いが一部隠蔽されているのは、`Dynamic`を運ぶ`Union`／`Intersection`が依然として`untyped`へ消去され漸進的に一貫したままだからで、下流の健全性はおそらく損なわれていない —— これは精度／仕様忠実度の欠陥であって健全性の欠陥ではない。） |
| 2 | `type-operators.md:76`「具体的な予算は`budgets.negative_fact_display`」と`:104`「表示予算は`budgets.negative_fact_display`で、`.rigor.yml`で設定可能」；`rbs-erasure.md:98-101`「`budgets.hash_erasure_keys`（デフォルト16……）……どちらも`.rigor.yml`で設定可能」 | **aspirational-unmarked／internal-inconsistency**。`inference-budgets.md:73-84`は`budgets:`のサーフェスが「まだ配線されていない —— `budgets:`キーはパースされず、テーブルの行は強制されない」と誠実かつ明示的に述べている（確認済み: `lib/rigor/configuration*`のどこにも`budgets`／`negative_fact_display`／`hash_erasure_keys`のパーサーは存在しない）。しかしこれら2つの姉妹ドキュメントは、同じキーを現在形で注意書きなしに`.rigor.yml`で設定可能と記述しているため、`type-operators.md`／`rbs-erasure.md`だけを読む読者はこれらのつまみが今日ライブだと信じてしまう。 | Medium | 各「`.rigor.yml`で設定可能」の言及に注意書きを追加する。例: 「（予定；`inference-budgets.md`の§実装状況を参照 —— `budgets:`のサーフェスはまだ配線されていない）」。 |
| 3 | `diagnostic-policy.md:93`（トークン解決）のファミリーワイルドカード＝「`call`／`flow`／`assert`／`dump`／`def`」対`:30-43`の識別子タクソノミー表（ファミリー`dynamic`／`static`／`flow`／`compat`／`call`／`def`／`rbs_extended`／`rbs.coverage`／`plugin`／`generated`／`hint`／`sig`） —— `assert`と`dump`はタクソノミーに**存在せず**、大半のタクソノミーファミリーは無効化トークンで展開可能ではない；さらに`:60`（深刻度解決）はファミリーワイルドカードを一般的に「ルールidの最初のセグメント」と記述しており、これは`dynamic`／`static`などにもマッチしてしまう。 | **internal-inconsistency**。同一ドキュメント内の2つの抑制メカニズムが「ファミリー」とは何かで食い違っている: `disable`トークン展開器は固定の5名称集合（`RULE_FAMILIES = %w[call flow assert dump def]`、`analysis/check_rules.rb:128`で確認）である一方、`severity_overrides`のファミリーワイルドカードは一般的な最初のセグメントマッチングを使う。`assert`／`dump`ファミリーは参照されているがタクソノミーで定義されていない。 | Low–Medium | `assert`／`dump`をタクソノミーに記載する（またはレガシーとラベル付けする）とともに、`severity_overrides:`のワイルドカードは任意の最初のドット区切りセグメントにマッチするのに対し、`# rigor:disable`トークンは固定の`call/flow/assert/dump/def`集合のみを展開する、と明示的に述べる。 |
| 4 | `special-types.md:70`「RBSは`void`、`boolish`、`top`を等価に扱う」と`:108`「RBSの`boolish`は`top`のエイリアス」対`rbs-compatible-types.md:9-32`の形式表（`bool`／`nil`／`untyped`／`top`／`bot`／`void`の行はあるが**`boolish`はない**） | **internal-inconsistency**（軽微な欠落）。「RBSの各形式をRigorの解釈に対応づける権威ある表」が`boolish`を省いているが、これはコーパスの他の箇所ではファーストクラスとして扱われている形式である。 | Low | 形式表に`boolish \| topのエイリアス \| boolish`の行を追加する（または`boolish`が`top`経由で消去される旨の1行の注記を追加する）。 |

## 合格したスポットチェック（忠実度を確認）

- `untyped = Dynamic[top]`: `Combinator.untyped == Dynamic.new(Top.instance)`；`dynamic(top)`は冪等で`untyped`に戻る（`combinator.rb:44-57`、`:856`）。`special-types.md:33`／`value-lattice.md:28`と一致。
- `bool`表示の折りたたみ（`true | false → bool`、`T? → bool?`との合成）: `union.rb#describe`で実装（`:44-46`、`:120-125`）、表示のみで恒等性／消去は不変 —— `normalization.md:18,34`および`rbs-compatible-types.md:56-58`と一致。
- `untyped`を含むユニオンは`untyped`へ消去される（`union.rb#erase_to_rbs`） —— `rbs-compatible-types.md:60-62`／`overview.md:7`のロスレスな`untyped`往復の主張と一致。
- `imported-built-in-types.md`で挙げられている予約済みのリファインメント／型関数キャリア（`non-empty-string`、`non-zero-int`、`IntegerRange`経由の`positive-int`／`non-negative-int`、`lowercase/uppercase/numeric-string`＋対をなす補集合、`int_mask`／`int_mask_of`、`key_of`／`value_of`／`pick_of`／`omit_of`／`partial_of`／`required_of`／`readonly_of`、インデックスアクセス`T[K]`）はすべて、一致する意味論を持つ`Combinator`のファクトリ／関数として存在する。
- `inference-budgets.md`の§「実装状況（2026-06-03）」は**誠実**である: `budgets:`テーブルを規範的意図だが未配線として提示し、実際に配線された4つのハードガードを列挙している。`budgets:`パーサーが存在しないことを確認した。（不誠実さがあるのは姉妹ドキュメントのみ —— 所見#2。）
- READMEの読む順序の表（16の話題別の行＋README）はディスク上の17ファイルと一致；ドキュメント間のクロスリファレンスに破損はない。
- 今サイクルのエンジン変更 —— モジュールシングルトン解決（ADR-57 WD3）とユニオンアーム述語の極性（`present?`／`blank?`のナローイング） —— は`control-flow-analysis.md`や`relations-and-certainty.md`と**矛盾しない**: どちらも、それらのドキュメントですでに汎用的に記述されているゼロ引数述語／負のファクトのナローイングの振る舞いに対する精度の洗練である。不正確になったドキュメント本文はない。

## 結論

型仕様コーパスは内部的に整合しており、そのスカラー／束／キャリア／表示に関する主張については実装に忠実である: 読む順序、クロスリファレンス、そして`top`／`bot`／`void`／`bool`／`nil`／`untyped`の恒等式はすべて成立し、予約済みリファインメントと型関数の語彙は`Combinator`によって完全に裏付けられている。`inference-budgets.md`の誠実さの注意書きは模範的で、コーパスの2つの実在する欠陥のテンプレートとなるべきものだ。唯一のHigh深刻度の項目は**dynamic由来の代数**である: `value-lattice.md`の結合／交わり／差分の恒等式とその`untyped & String → Dynamic[String]`の動作例は規範的かつ出荷済みとして述べられているが、`Combinator`（正規化レイヤー）は静的ファセットを変換せず、代わりに`Dynamic`キャリアの`Union`／`Intersection`を残す。これは健全性の穴というより精度／忠実度のギャップだが（未還元の形式も依然として`untyped`へ消去され漸進的に一貫したままである）、動作例に頼る読者は誤導される。残りの項目は、2つのドキュメントにおける未配線の予算つまみの現在形での誇張（Medium）、`diagnostic-policy.md`内部でのファミリー定義の不一致（Low–Medium）、そして欠落した`boolish`の行（Low）である。いずれも実装者に健全性について誤解を与えるような矛盾ではない；4つすべては、振る舞いを配線するか、あるいは予算ドキュメントがすでに手本にしている同じ「まだ配線されていない」誠実さのマーカーを追加するかのどちらかで、きれいに修正可能である。
