---
title: "sig/内の全宣言の来歴 — ADR-107 G3に向けた初期シード監査（2026-09-08）"
description: "rigortype/rigor docs/notes/20260908-sig-provenance-audit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260908-sig-provenance-audit.md"
sourcePath: "docs/notes/20260908-sig-provenance-audit.md"
sourceSha: "ed57ba66e9dd4b11c7f5743ec440c5b435527a83b02b284ce448381bbd7cdf5b"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
translationStatus: "translated"
sidebar:
  order: 20266908
---

Status: [ADR-107](../../adr/107-checked-types-and-typeless-comments/) § ゲートが名指しする第3のゲートである[#825](https://github.com/rigortype/rigor/issues/825)のための初期シード監査。`origin/master`の`sig-provenance-gate-825`、rbs 4.x、Ruby 4.0.5上で測定。

ADR-107 § 決定は、[ADR-5](../../adr/5-robustness-principle/)の非対称性に従う来歴ルールを`sig/`に与えています: **戻り値**型は生成され（条項1 — `rigor sig-gen`が本体からそれを証明する）、**パラメータ**型は著述された意図であり（条項2が寛容に保ち、推論が導出することはない）、**それ以外のすべての手書きは`sig-gen`が閉じられなかったギャップ**であり、[ADR-14](../../adr/14-rbs-sig-generation/)の矛盾ルールに従って仮定ではなく記録されなければなりません。この監査が行われるまで、`sig/`配下の1,251件の宣言の各々がこの3つのうちどれに該当するかを問うたものはありませんでした。

## コマンド

以下のすべてはゲート自身のクラシファイアから得られたものであり、ノートとゲートが乖離することはありません:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command \
  bundle exec ruby -Ilib -Ispec/support -rsig_provenance_auditor \
  -e 'SigProvenanceAuditor.report(root: Dir.pwd)'
```

クラシファイアは`RBS::Parser.parse_signature`で`sig/`配下のすべての`.rbs`をパースし、`include_private: true`を指定してプロセス内で`lib/`に対して`Rigor::SigGen::Generator`を実行し、（class, method）で結合します。以下で引用されるクロスチェックでは、同じパスのCLI形式（`bundle exec exe/rigor sig-gen --diff --format=json lib`）を使用し、`no_source`の内訳についてのみ、完全にrequireされた`lib/`に対するRubyリフレクションを使用しました — ここでのリフレクションは測定機器であり、ゲートの一部ではありません。

実行時間、12コアM3 Max: 上記コマンドのエンドツーエンドで**ユーザー時間13.6秒 / ウォールタイム19.0秒**；ウォームプロセスでのジェネレータパス単体では**約10秒**です。これが、ゲートが`spec/docs/`ではなく`spec/rigor/sig_gen/provenance_spec.rb`に配置されている理由です: `make docs-check`は現在ロードに1.2秒、exampleに5.4秒であり、そこに10秒のパスをぶら下げると安価なゲートがほぼ3倍になってしまいます。

## 分類

`sig-gen`は**戻り値のみ**を比較します；パラメータは決して推論されないため（ADR-5条項2）、戻り値が推論と一致する宣言は、パラメータがどのように書かれていようとも獲得されたもの（earned）となります。

> **2026-09-09再測定**、[#836](https://github.com/rigortype/rigor/issues/836)および[#837](https://github.com/rigortype/rigor/issues/837)の着地後。下記の2つのテーブルは現在の数値です；初期シード時の数値は、それらについて論じる散文の中で引用されたまま残されています。#836が動かしたもの: `tighter_return`が15 → 8となり、73件の宣言（クラシファイアが`def`と照合したすべての`-> void`）が`generated` / `parameter_intent` / `declared_divergent`から新しい`return_intent`へと移動しました。監査が明らかにした9件の古い宣言はこれら2回の実行の間に削除され、対象範囲の合計は1,052件から1,044件になりました。#837が動かしたもの: `tighter_return`が8 → 2となり、その6行が`declared_divergent`になりました — 5件はそれ自身のものであり、6件目は#838が該当するとして起票していた`Reflection.class_ordering`です。ここで対象範囲の合計が1,065件になっているのは、その間にADR-109スライス2の`Type::FloatRange`キャリアが着地したためです；その増加はこの修正によるものではありません。

| 分類 | n | 獲得済み？ | 意味するもの |
| --- | --- | --- | --- |
| `generated` | 173 | はい | 宣言された戻り値が`sig-gen`が証明するものと完全に一致し、`untyped`より狭いパラメータが存在しない |
| `parameter_intent` | 132 | はい | 同じ戻り値であり、著者によって型付けされた少なくとも1つのパラメータまたはブロックを持つ — ADR-5条項2の半分 |
| `return_intent` | 74 | はい | 宣言された戻り値が`void`である — いかなる合成も生成できない著述された意図であるため、`sig-gen`は何も比較しない（#836） |
| `tighter_return` | 2 | **マーカー必須** | `sig-gen`がより狭い戻り値を提案する；ADR-14はそれを適用するか、そうしない理由を記録することを求めている |
| `declared_divergent` | 115 | 残滓 | 宣言された戻り値と推論された戻り値が異なり、`sig-gen`はその置き換えを提案しない |
| `untranslatable_declared` | 0 | 残滓 | `sig-gen`が宣言された戻り値を型オブジェクトにまったく変換できなかった |
| `unrenderable` | 345 | 残滓 | `sig-gen`が`def`を辞退した（`sig.skipped.*`） |
| `unmatched_declaration` | 0 | 残滓 | `sig-gen`は`def`を見つけたが、RBS環境がそれをこの宣言に解決しなかった |
| `no_source` | 224 | 残滓 | `sig-gen`がこの宣言に帰属させられる`def`が存在しない |
| `non_method` | 200 | 対象外 | 定数、型エイリアス、`include`、クラスおよびモジュールヘッダー |

**対象となる1,065件の宣言中、379件（35.6%）が獲得済みであり、684件が残滓です — そのうち683件はマーカーなし（ラチェットが固定する数値）、2件がマーカーを必要とします**。（初期シード実行では、1,052件中358件が獲得済み、679件が残滓、15件のマーカーでした。）テーブル内の2つのバケットは運ではなく構造上空になっており、将来の`sig/`が陥る可能性のある本物の穴を指名しているため保持されています: `untranslatable_declared`は`Generator#build_declared_return`がいかなるオーバーロードも変換できないときに発火し、`unmatched_declaration`はコンストラクタスタブでも`void`宣言でもない`new_method`に対して発火します。両方ともフィクスチャ上で単体テストされています。

## ファイル別

`earned`は`generated` + `parameter_intent` + `return_intent`の合計です；`residue`はゲートがピン留めするマーカーなしの合計であり、初期シード実行で সর্বত্র空であることが示された2つの列（`untranslatable_declared`、`unmatched_declaration`）はゼロの繰り返しを避けるため省略されています。

| ファイル | `tighter_return` | `declared_divergent` | `unrenderable` | `no_source` | earned | residue |
| --- | --- | --- | --- | --- | --- | --- |
| `sig/prism_node_children.rbs` | 0 | 0 | 0 | 1 | 0 | 1 |
| `sig/rigor.rbs` | 0 | 10 | 39 | 2 | 25 | 51 |
| `sig/rigor/analysis/baseline.rbs` | 0 | 1 | 4 | 0 | 5 | 5 |
| `sig/rigor/analysis/check_rules/always_truthy_condition_collector.rbs` | 0 | 1 | 0 | 0 | 1 | 1 |
| `sig/rigor/analysis/check_rules/dead_assignment_collector.rbs` | 0 | 1 | 0 | 0 | 1 | 1 |
| `sig/rigor/analysis/dependency_source_inference/gem_resolver.rbs` | 0 | 1 | 0 | 0 | 2 | 1 |
| `sig/rigor/analysis/dependency_source_inference/index.rbs` | 0 | 0 | 0 | 0 | 1 | 0 |
| `sig/rigor/analysis/fact_store.rbs` | 0 | 4 | 1 | 12 | 15 | 17 |
| `sig/rigor/ast.rbs` | 0 | 0 | 1 | 0 | 4 | 1 |
| `sig/rigor/cache.rbs` | 0 | 1 | 1 | 0 | 0 | 2 |
| `sig/rigor/cli/diff_command.rbs` | 0 | 0 | 0 | 1 | 1 | 1 |
| `sig/rigor/cli/explain_command.rbs` | 0 | 0 | 0 | 1 | 1 | 1 |
| `sig/rigor/cli/sig_gen_command.rbs` | 0 | 1 | 0 | 1 | 0 | 2 |
| `sig/rigor/cli/type_scan_command.rbs` | 0 | 1 | 0 | 0 | 0 | 1 |
| `sig/rigor/environment.rbs` | 0 | 5 | 36 | 1 | 19 | 42 |
| `sig/rigor/inference.rbs` | 0 | 35 | 38 | 22 | 29 | 95 |
| `sig/rigor/inference/builtins/method_catalog.rbs` | 0 | 1 | 0 | 0 | 1 | 1 |
| `sig/rigor/inference/void_origin.rbs` | 0 | 0 | 0 | 5 | 1 | 5 |
| `sig/rigor/plugin.rbs` | 0 | 0 | 3 | 0 | 1 | 3 |
| `sig/rigor/plugin/access_denied_error.rbs` | 0 | 0 | 0 | 0 | 1 | 0 |
| `sig/rigor/plugin/base.rbs` | 0 | 7 | 19 | 0 | 6 | 26 |
| `sig/rigor/plugin/blueprint.rbs` | 0 | 0 | 3 | 0 | 1 | 3 |
| `sig/rigor/plugin/fact_store.rbs` | 0 | 0 | 1 | 1 | 4 | 2 |
| `sig/rigor/plugin/io_boundary.rbs` | 0 | 0 | 4 | 0 | 2 | 4 |
| `sig/rigor/plugin/load_error.rbs` | 0 | 0 | 2 | 1 | 1 | 3 |
| `sig/rigor/plugin/loader.rbs` | 0 | 0 | 4 | 0 | 1 | 4 |
| `sig/rigor/plugin/manifest.rbs` | 0 | 1 | 20 | 0 | 4 | 21 |
| `sig/rigor/plugin/registry.rbs` | 0 | 0 | 7 | 0 | 3 | 7 |
| `sig/rigor/plugin/services.rbs` | 0 | 0 | 0 | 0 | 1 | 0 |
| `sig/rigor/plugin/trust_policy.rbs` | 0 | 0 | 0 | 0 | 2 | 0 |
| `sig/rigor/plugin/type_node_resolver.rbs` | 0 | 0 | 0 | 0 | 1 | 0 |
| `sig/rigor/rbs_extended.rbs` | 0 | 4 | 4 | 15 | 12 | 23 |
| `sig/rigor/reflection.rbs` | 0 | 4 | 6 | 0 | 6 | 9 |
| `sig/rigor/scope.rbs` | 2 | 3 | 78 | 30 | 41 | 111 |
| `sig/rigor/source.rbs` | 0 | 2 | 7 | 0 | 7 | 9 |
| `sig/rigor/testing.rbs` | 0 | 0 | 4 | 0 | 0 | 4 |
| `sig/rigor/trinary.rbs` | 0 | 1 | 1 | 3 | 11 | 5 |
| `sig/rigor/type.rbs` | 0 | 31 | 62 | 128 | 168 | 221 |

## 15件の`tighter_return`と、それらが`sig-gen`について語ること

すべてのケースと、そのためにシードされたマーカー。ADR-14のドッグフードパターンは維持されましたが、issueが予測した方向ではありませんでした。**15件中、推論の不完全さによるものは1件もありませんでした**。 12件はその逆でした: 推論が宣言の意図よりも*精密*であり、厳格化を適用すると意図的に広く取られている契約を狭めてしまうことになります。

7件の`void`行は**もはや提案されません** — #836が2026-09-09に着地し、そのマーカーは`sig/`から削除されました；その解釈こそが修正の基礎となっているため、ここに保持されています。その修正の後に8件が残りました。2026-09-09に適用可能な3件が適用され（#838）、#837が残りの6件を連れて行きました — 自身の5件と、この表で適用可能と呼んでおり他と同様に宣言された公称型に対するリテラルユニオンである`Reflection.class_ordering`です。現在はマーカーを保持しているものはありません。

| 宣言 | 宣言値 | `sig-gen`の提案 | 解釈 |
| --- | --- | --- | --- |
| `Rigor::ValueSemantics.included` | `void` | `Module` | void vs値（修正済み、#836） |
| `Rigor::Environment::ClassRegistry#register` | `void` | `ClassRegistry` | void vs値（修正済み、#836） |
| `Rigor::Inference::StatementEvaluator#evaluate_block_if_present` | `void` | `[Type::t, Scope] \| nil` | void vs値（修正済み、#836） |
| `Rigor::Inference::FallbackTracer#record_fallback` | `void` | `FallbackTracer` | void vs値（修正済み、#836） |
| `Rigor::Inference::FallbackTracer#clear` | `void` | `FallbackTracer` | void vs値（修正済み、#836） |
| `Rigor::Plugin::FactStore#each_fact` | `void` | `Array` | void vs値（修正済み、#836） |
| `Rigor::Scope#enqueue_ancestors` | `void` | `Array \| nil` | void vs値（修正済み、#836） |
| `Rigor::Cache::RbsCacheProducer.generation_cap` | `Integer` | `2` | より広い宣言に対するリテラル（修正済み、#837） |
| `Rigor::Trinary#to_s` | `String` | `"maybe" \| "no" \| "yes"` | より広い宣言に対するリテラル（修正済み、#837） |
| `Rigor::Type::Top#describe` | `String` | `"top"` | より広い宣言に対するリテラル（修正済み、#837） |
| `Rigor::Type::Bot#describe` | `String` | `"bot"` | より広い宣言に対するリテラル（修正済み、#837） |
| `Rigor::Type::BoundMethod#erase_to_rbs` | `String` | `"Method"` | より広い宣言に対するリテラル（修正済み、#837） |
| `Rigor::Reflection.class_ordering` | `Symbol` | `:disjoint \| :equal \| :subclass \| :superclass \| :unknown` | 適用可能（適用済み、#838；#837はもはやこれを提案しない） |
| `Rigor::Scope#user_def_through_ancestors` | `[untyped?, String?]` | `[untyped, String] \| [nil, nil]` | 適用可能（適用済み、#838） |
| `Rigor::Scope#singleton_def_through_ancestors` | `[untyped?, String?]` | `[untyped, String] \| [nil, nil]` | 適用可能（適用済み、#838） |

**7件は`void`である**。 `Inference::RbsTypeTranslator`はRBSの`void`を`Type::Top`にマップし、`Top`はすべてを受け入れるため、`Generator#tighter?`は本体がたまたま型付きの値を返すあらゆる`void`宣言メソッドを厳格化として報告してしまいます。`void`は著者が狭めたいと望む広い型ではありません — 戻り値が契約の一部ではないという言明であり、だからこそ`sig-gen`はすでに`initialize`を無条件に`-> void`と表記しています。**P1**として起票され（[#836](https://github.com/rigortype/rigor/issues/836)）、**2026-09-09に修正されました**: `Generator#compare_against_declared`は宣言された`void`を比較せずに`equivalent`を返し、`void`自体を宣言表記として保持し、ゲートはそれを新しい獲得された`return_intent`として読み取ります — `void`宣言にマーカーは不要です。

**5件は兄弟と共有する契約にリテラルを固定している**。 `Top#describe`は確かに`"top"`を返しますが、`describe`はすべての型クラスが実装する多相サーフェスであり、すべての兄弟が`String`を宣言しています；`Trinary#to_s`や`BoundMethod#erase_to_rbs`も同様です。`Generator#computed_literal_tightening?`はまさにこの危険性のために存在しますが、本体の最後の式が直接のリテラルで*ない*場合にのみ発火します — ここでは直接のリテラルであるためガードを通過してしまいました。**P2**として起票され（[#837](https://github.com/rigortype/rigor/issues/837)）、issueが提案した兄弟スキャンよりも広い基準によって**2026-09-09に修正されました**: RBSリテラルへと消去（erase）される提案は、既存の宣言を決して厳格化しません。なぜ兄弟スキャンが担えなかったのかについては、下記のP2エントリーを参照してください。

**3件は真に適用可能であった**。来歴ゲートが着地した時点では適用されずにマーカー付きで宣言のまま残されました — 宣言の変更は精度ゲートとSteepを単独で通過しなければならない`sig/`の編集であり、その着地はそれを行うべきコミットではなかったからです。**P3**として起票され（[#838](https://github.com/rigortype/rigor/issues/838)）、**2026-09-09に適用されました**: 各宣言は現在`sig-gen --diff --tighter-returns lib`が提案するものと完全に一致しており、3つの`# sig-gen gap: #838`マーカーは消去され、`spec/rigor/sig_gen/provenance_spec.rb`内の残滓ピン留めは変更されていません — `tighter_return`は残滓ピン留めの外側に位置しているため（#845）、厳格化の適用は獲得／マーカーの会計処理内の行を移動させるだけであり、ピン留めされた残滓カウントは動かしません。

## 残滓の宣言はどこから来ているのか（初期シード時679件、現在684件）

### `unrenderable` — 初期シード時342件、現在345件、すべてが`sig.skipped.untyped-return`

`sig-gen`が本体に対して`Dynamic[top]`を推論し、`-> untyped`の出力を辞退しました。支配的な形状は、クラスivarの事前パスが型付けできなかったivarに対する`attr_reader`（`Rigor::Configuration#target_ruby`、`#paths`、`#plugins`、`#cache_path`、…）です — [ADR-58](../../adr/58-ivar-field-typing/)のivarフィールド型付けギャップであり、WD1は着地したもののWD1b / WD2 / WD3は着地していません。これは残滓に対する単一で最大のレバーであり、本ノートで最も注視すべき数値です: 推論がメソッドに対して`untyped`と答えるため、342件の宣言が`sig/`に存在しています。

### `no_source` — 初期シード時227件、下記の9件の古い宣言が削除された時点で219件、現在224件

`sig-gen`は`def`を列挙します；`sig/`はメソッドを宣言し、両者は5つの方法で食い違います。完全にrequireされた`lib/`に対するRubyリフレクションによって測定:

| 原因 | n | 例 |
| --- | --- | --- |
| ランタイム生成メンバー（`Data.define`、`Struct.new`） | 82 | `Rigor::Analysis::FactStore::Target#kind`、`#new` |
| クラス内で定義されているがメタプログラミングによるものであり、`def`ではない | 69 | `ValueSemantics#value_fields`からの`Rigor::Type::Nominal#==` / `#eql?` / `#hash` |
| 継承またはミックスイン | 67 | `Rigor::Type::Top#accepts`（オーナー`Type::AcceptanceRouter`）、5つの`CLI::*Command#initialize`（オーナー`CLI::Command`） |
| **`lib/`のどこにもそのようなメソッドが存在しない** | 8 | 下記参照 |
| **`lib/`のどこにもそのような定数が存在しない** | 1 | `Rigor::Inference::Builtins::NumericCatalog` |

最後の2行は本監査における唯一の明白なバグです: **存在しないコードを記述している9件の宣言**。 `make check`、`make steep-check`、`spec/rigor/public_api_drift_spec.rb`のいずれも気づきませんでした。それぞれが実装が`sig/`と一致しているかを問い、その逆を問うものはなかったからです。

- `Rigor::Inference::StatementEvaluator#qualified_name_for`、`#render_constant_path`、`#captured_local_writes`、`#block_introduced_locals`
- `Rigor::Inference::ScopeIndexer#build_declaration_overrides`、`#qualified_name_for`、`#render_constant_path`
- `sig/rigor/inference/builtins/numeric_catalog.rbs`全体 — `NumericCatalog`は共有の`MethodCatalog`ローダーへと畳み込まれ（`NUMERIC_CATALOG = MethodCatalog.for_topic("numeric")`）、クラスは消滅していました

9件すべてがゲートをシードするコミットによって削除されました。`Prism::Node#rigor_each_child`は、書かれた通りの状態で正しい唯一の`no_source`です: `Rigor::Source::NodeChildren`がロード時に具象ノードクラスごとにそれをコンパイルしており、そのファイルヘッダーがすでに述べている通りです。

> **2026-09-09、[#839](https://github.com/rigortype/rigor/issues/839)により差し替え**。上記のリフレクションパスは一度きりの測定機器でした；現在はクラシファイア内部の2つのティアとなっており、`no_source`は*古い（stale）*ことのみを意味し、正当な行はそれらを説明する形状（`synthetic_source` / `inherited_source` / `runtime_defined`）を担持します。完全な再分類、およびなぜ`Prism::Node#rigor_each_child`が免除されるのではなく確認されるのかについては、[フォローアップ監査](../20260909-sig-no-source-audit/)を参照してください。

### `declared_divergent` — 初期シード時110件、#836以降108件、#837以降115件

宣言された戻り値が推論された戻り値と異なり、`sig-gen`のガードが置き換えを拒絶します。2つの形状があり、両方とも無害ですが、1つは言及する価値があります:

- **34件が`untyped`を宣言している**（推論が実際の型を持っている箇所で）。これらはファイルが散文ですでに説明している意図的な`untyped`です — `Rigor::Analysis::Runner#cache_store`とその兄弟は、`Rigor::Cache::Store`がまだsigでカバーされておらず、名前付きの参照が`RBS::UnknownTypeName`を発生させるというコメントを持っています。ゲートのマーカー規約は、それらのコメントがすでに非公式に行っていたことを公式化します。
- **残りはジェネレータが保護する宣言された寛容さである**: `Configuration.discover`は本体が`".rigor.dist.yml" | ".rigor.yml" | nil`を証明する箇所で`String?`を宣言しています；`CLI::TypeOfCommand#run`は`0 | 1 | Integer`に対して`Integer`を宣言しています。`loses_declared_union_member?`および`replaces_untyped_type_arg?`が発火するため、厳格化は提案されず、提案されるべきでもありません。#837がここに移動させた6行は、`?`を取り除いた同じ形状です — 本体の証明が`"top"`であるのに対して`Top#describe`が`String`を宣言している — これは修正が基づいている観察そのものです: 著者が`String`と書いたか`String?`と書いたかはリテラルに関する決定ではなく、ユニオンの表記のみが保護されていたのです。

これらはいずれも`def.return-type-mismatch`ではありません: 本体が証明するものよりも*狭い*宣言はゲートG2の仕事であり（`make check --fail-on=warning`、[#827](https://github.com/rigortype/rigor/pull/827)）、クリーンです。

## ゲートはこれらすべてをどう扱うか

679件の残滓行に対して宣言ごとのマーカーを付けることはゲートではなく、`sig/`の書き換えになってしまいます。また、正しいツリーに対して679回発火するチェックは、`AGENTS.md` § Implementation Guidelinesが最悪の静的読み取りよりも上に位置づける失敗モードです。したがって、G3は2つのメカニズムとして着地します:

1. **厳格なルール、今すぐシードされる**。すべての`tighter_return`は、なぜ宣言が維持されるかを説明するissueを名指しするマーカーを担持する。初期シード時15件、#836以降8件、#837以降2件；3件目は到着時にゲートを失敗させる。
2. **ラチェット、今すぐピン留めされる**。ファイルごとのマーカーなし残滓カウントがspec内の厳密なスナップショットとなる。新しい手書き宣言はそのファイルのカウントを増やしてレッドになる；著者はそれにマーカーを付けるか（マーカーはカウントから減算される）、意図的にピンを動かす。エンジンのギャップを閉じるとカウントが減少し、ゲートはたるみ（slack）を蓄積させるのではなくその旨を通知する。

マーカーはメンバー自身のRBSコメント内の1行です:

```ruby
# sig-gen gap: #825 — sig-gen types the body `untyped`, so the return is hand-written.
def resolve: (String name) -> Type::t
```

`%a{…}`アノテーションではなくコメントです。[ADR-0](../../adr/0-concept/)はメタデータが`.rbs`ファイル内に存在することを要求しており、両方の表記がそれを満たしますが、コメントは`Rigor::RbsExtended`が所有しADR-20 / ADR-103が拡張し続ける`rigor:v1:`ディレクティブ名前空間の外側に留まり、バージョントークンを持たず、エンジンのいかなるパスからも読み取られず（認識されない`%a{}`は現在は黙って無視されますが、「黙って無視される」ことは変更可能な特性です）、散文として読めます。RBSはそれをメンバーにバインドするため、ゲートは行をスキャンするのではなくASTからそれを読み取ります。番号は起票されたissueに解決されなければなりません — ジェネレータに応答させるためのエンジン作業へのポインタであり、プレースホルダーは何にも向いていないため、ゲートは受け入れません。

## フォローアップのissue群

本セクションから起票され、`sig/`内の各マーカーはそのカテゴリーのissueを指名します。初期シード時15件: 7件が#836、5件が#837、3件が#838を指していました。現在は5件が残っています — その修正が着地したときに7件の#836マーカーが外され、それらの厳格化が適用されたときに3件の#838マーカーが外されました。

**P1 — [#836](https://github.com/rigortype/rigor/issues/836) — `void`と宣言されたメソッドに対して`sig-gen`が値の厳格化を提案する**。 `RbsTypeTranslator`は`void`を`Type::Top`にマップし、`Top.accepts`は完全であるため、本体が何らかの型付きの値を返すあらゆる`void`メソッドに対して`Generator#tighter?`が真になります。Rigor自身の`sig/`内の15件の`tighter_return`のうち7件がこれであり、手書きの`sig/`に対して`sig-gen --diff`を実行する導入プロジェクトは、すべてのミューテーターでこれを目にすることになります。証拠: 上記のテーブルの7行。領域: `area:sig-gen`。

**2026-09-09修正**。 `compare_against_declared`は宣言された`void`を比較せずに`equivalent`に分類し、`void`自体を宣言された表記として保持するため、`--diff`は変更を示さず、`--write`も`--overwrite`もそれを置き換えることはできません；ゲートのクラシファイアはそれを獲得された`return_intent`として読み取り、`void`宣言にマーカーは不要になります。この論拠は現在ADR-14 §「推論vs RBSの矛盾ルール」に記載されています: `void`は戻り値の意図であり、合成可能な型では決してありません。

**P2 — [#837](https://github.com/rigortype/rigor/issues/837) — 兄弟が広い型を宣言しているメソッドに対して`sig-gen`がリテラルの戻り値を提案する**。 `computed_literal_tightening?`は本体の最後の式が直接のリテラルでない場合に`Constant`の厳格化を拒絶します；直接のリテラルである場合（`def describe(_v = :short) = "top"`）、ガードを通過し、すべての兄弟型クラスが`String`と宣言しているメソッドに対して`"top"`が提案されてしまいます。これを固定すると多相サーフェスが壊れます。修正: 同じメソッドの祖先または兄弟の実装がより広い宣言を保持している場合、厳格化を拒絶する — すでに逆方向のオーバーライドについて推論している[#744](https://github.com/rigortype/rigor/issues/744)ガードの逆です。証拠: 上記の5行。領域: `area:sig-gen`。

**2026-09-09、起票されたものより広い基準で修正**。 RBSリテラルへと消去される提案は、既存の宣言を決して厳格化しません: 宣言された型は本体に対する著者の抽象化であり、リテラルはその抽象化が隠す実装の詳細であって、ADR-107が`void`やパラメータ型を位置づける場所です。`compare_against_declared`はそれらを`equivalent`に分類し、マーカーは修正とともに`sig/`から外されました；5行は現在`declared_divergent`となり、それらが表記バリエーションである`String?`の寛容さと同様にラチェットによってカウントされます。

本issueが提案した兄弟スキャンは最初5行に対して試みられましたが、それらを担うことができませんでした。`Type::Top`と`Type::Bot`は祖先を共有しておらず（`Rigor::Type`は空の名前空間モジュール）、したがって「兄弟」とは「同じ名前空間内でこのメソッド名を宣言している別のクラス」のようなものを意味せざるを得ず、これは導入プロジェクトが自身のコードから予測できないルールです。また、`RbsCacheProducer.generation_cap`に対して間違った答えを出します: いかなるサブクラスも`generation_cap`をオーバーライドしておらず、それについての他の宣言も存在しないため、いかなるスキャンもより広い宣言を見つけることができませんが、サブクラスが変更し得る上限値に対して`2`は同様に間違った契約です。消去基準は祖先の走査も名前空間の規約も必要とせず、ジェネレータがすでに手に持っているペアに対してチェックされます。

代償として、誠実なenumの絞り込み（`:asc | :desc`を証明する本体に対する宣言された`Symbol`）も提案されなくなります。それが`class_ordering`であり、この修正によって沈黙した唯一の#838の行です。これはトレードオフの許容可能な半分です: 共有サーフェス上に`"top"`を固定することは動作している契約を書き換えてしまいますが、絞り込みの見逃しは動作している広い契約を残すだけであり、AGENTS.md § Implementation Guidelinesは偽陽性をより重く見ます。著者は手作業でユニオンを書くことができ、ゲートはそれを`generated`として読み取ります — 推論が証明するものと一致する宣言は、どのようにそこに到達したかにかかわらず獲得されたものだからです。

**P3 — [#838](https://github.com/rigortype/rigor/issues/838) — `sig-gen`が正しい3つの厳格化を適用する**。 `Reflection.class_ordering` → `:disjoint | :equal | :subclass | :superclass | :unknown`、および両方の`Scope#*_through_ancestors` → `[untyped, String] | [nil, nil]`。各々は`rigor coverage --threshold 0.58 lib`と`make steep-check`をクリアしなければならない`sig/`の編集であるため、独立した変更です。領域: `area:sig-gen`。

**2026-09-09適用**。 3つの宣言すべてが`rigor sig-gen --diff --tighter-returns lib`と完全に一致するようになり、それらの`# sig-gen gap: #838`マーカーは消去されました。`make check --fail-on=warning`、精度ゲート、`make lint`、および`make steep-check`はすべてクリーンなままでした；`tighter_return`はその外側に位置するため（#845）、`spec/rigor/sig_gen/provenance_spec.rb`内の残滓ピン留めは動きませんでした。

**P4 — [#839](https://github.com/rigortype/rigor/issues/839) — `sig/`内の宣言が実在するメソッドを記述しているかをチェックするものがない**。 9件が存在していませんでした（上記）。`make check`と`make steep-check`は実装を`sig/`と比較します；逆方向（`def`が削除または改名された宣言）はチェックされておらず、RBSはそれを通じて呼び出しを解決するため、古い宣言は欠落した宣言よりも有害です。来歴ゲートは現在これらを218件の正当なものと混ざった`no_source`として報告しています；それらを区別する専用のチェックがあればより鋭利になります。領域: `area:self-testing`。

**2026-09-09修正**。クラシファイアは宣言を未帰属として報告する前にさらに2つの信頼できる情報源に照会します — Rigor自身のファイル間認識（`ScopeIndexer.discovered_project_index_for_paths`＋`Scope`の祖先走査）、次にロードされたツリーに対するリフレクション — これにより正当な行は`synthetic_source` / `inherited_source` / `runtime_defined`に着地し、`no_source`はゼロの厳格なルールになります。全224行の再分類、および2つのティアにかかる約1.8秒のコストは、[フォローアップ監査](../20260909-sig-no-source-audit/)に記載されています。

## これが測定しないもの

- **`plugins/*/sig`および`examples/*/sig`**。ゲートはリポジトリ自身の`sig/`のみを走査します。`make check-plugins`がそこでの異なる特性をカバーします。
- **宣言が*正しい*かどうか**。来歴は型がどこから来たかを語るものであり、それが正しいかどうかを語るものではありません；`make check`（G2）および`make steep-check`がそれに答えます。
- **パラメータ型**。構造上。ADR-5条項2がそれらを著者のものとしており、求められる場合の証拠源は`sig-gen --observe`です；ゲートは`generated`と`parameter_intent`を区別するため以外にパラメータ型を検査することはありません。
