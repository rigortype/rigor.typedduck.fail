---
title: "sig/内の224件のno_source宣言の出処（2026-09-09）"
description: "rigortype/rigor docs/notes/20260909-sig-no-source-audit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260909-sig-no-source-audit.md"
sourcePath: "docs/notes/20260909-sig-no-source-audit.md"
sourceSha: "c393611b22872fb5d749510aecd6ea89f5c90f5ffa56ba6f0877f950d179a5f8"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
translationStatus: "translated"
sidebar:
  order: 20266909
---

Status: [シード監査](../20260908-sig-provenance-audit/)からP4として起票された、[#839](https://github.com/rigortype/rigor/issues/839)のためのフォローアップ監査。`origin/master`の`sig-no-source-839`、rbs 4.x、Ruby 4.0.5上で測定。

シード監査は227件の宣言を`no_source`（「`sig-gen`がこの宣言に帰属させられる`def`が存在しない」）に分類し、**そのうち9件が存在しないコードを記述している**ことを発見しました: 削除または改名されていた`StatementEvaluator` / `ScopeIndexer`上の7つのメソッド、および`MethodCatalog.for_topic("numeric")`に畳み込まれた`NumericCatalog`全体です。ツリー内の誰もそれに気づきませんでした。`make check`も`make steep-check`も実装が`sig/`と一致しているかを問いますが、その逆を問うものはなく、RBSはそれを通じて呼び出しを解決するため、古い宣言は欠落している宣言よりも有害です。

この9件はシードゲートとともに削除されました。本ノートは、それらを発見しにくくしていた疑問に答えます: **`no_source`に残されたすべてのものについて、なぜ静的スキャンは`def`を発見できなかったのか** — そして免除リストを手動で列挙することなく、正当なケースを古いケースと見分けることができるのか？

## コマンド

本監査はゲート自身のクラシファイアであるため、ノートとゲートが乖離することはありません:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command \
  bundle exec ruby -Ilib -Ispec/support -rsig_provenance_auditor \
  -e 'SigProvenanceAuditor.report(root: Dir.pwd)'
```

その最後の2つのセクションが下記のテーブルです。`report`は`runtime: true`で実行され、2つの新しいティアをオプトインします（`spec/support/sig_source_index.rb`）。

## さらに2つの信頼できる情報源

`sig-gen`は`def`を列挙します。メソッドは常に`def`であるとは限らないため、`no_source`は見かけよりも狭い質問に答えていました。現在、その背後で2つのティアが順番に実行され、3つのいずれも発見できない宣言のみが古い宣言として報告されます。

**ティア1 — Rigor自身の認識（静的）**。
`Inference::ScopeIndexer.discovered_project_index_for_paths`は、`Analysis::Runner`が各`rigor check`の前に構築するファイル間の事前パスです。これはすでに`attr_*`、`define_method`、`alias` / `alias_method`、`module_function`、`extend`の畳み込み、および`Data` / `Struct`のメンバーレイアウトを認識しており（そうでなければ`call.undefined-method`ルールがそれらすべてに発火してしまいます）、`Scope#discovered_method_through_ancestors?`がプロジェクト自身のスーパークラスとミックスインを走査します。監査ツールで形状を再導出するのではなくこれを照会することで、ツリー内の認識ロジックを**1つ**に保ちます: 2つ目の認識ロジックは乖離を引き起こし、その乖離は誤った古い宣言の報告として表面化します。これはAGENTS.md § "Implementation Guidelines"がいかなる最悪の読み取りよりも優先して避けるべきとしているものです。

**ティア2 — ランタイム（リフレクション）**。いかなる静的パスも確認できないもの: `ValueSemantics#value_fields`はクラスマクロから`==` / `eql?` / `hash`を定義し、`Data.define`は無名親クラス上に`.new`と`#with`を生成し、`Source::NodeChildren`はロード時にすべての具象`Prism::*Node`クラス上に`#rigor_each_child`をコンパイルします。ロードされたツリーに対するリフレクションは、`spec/rigor/public_api_drift_spec.rb`が公開サーフェスに対してすでにリフレクションを行っているのと同様に、それらの各々を確認します — そして確認は免除リストに勝ります。免除はその下のコードが削除された後も真のまま残ってしまうからです。ツリーのロードはそのコードを実行するため、このティアはオプトインであり、このリポジトリに対してのみ向けられます；監査対象のサンプルによって`lib/`が書かれているフィクスチャプロジェクトを要求することは決してあってはなりません。

リフレクションは意図的に`Object` / `Kernel` / `BasicObject`（およびシングルトン側の`Class` / `Module`）を無視します。すべてのオブジェクトが`hash`、`==`、`to_s`、`inspect`に応答し、`sig/`はそれらを`value_fields`から生成する型キャリア上で4つすべてを宣言しています；すべてのオブジェクトにメソッドを渡すオーナーは、その下の`value_fields`呼び出しが削除された後でもそのような宣言を確認してしまい、本監査が閉じるために存在する見落としそのものになります。

## `no_source`の中に何があったか

224件の宣言、すべてが説明され、**古いものはゼロ**:

| 分類 | 形状 | n | 何であるか |
| --- | --- | --- | --- |
| `inherited_source` | プロジェクトの祖先 | 71 | プロジェクトがスーパークラスまたはインクルードされたモジュール上でメソッドを宣言している（`Type::Top#accepts`、オーナーは`Type::AcceptanceRouter`；5つの`CLI::*Command#initialize`、オーナーは`CLI::Command`） |
| `synthetic_source` | Dataメンバー | 70 | `Data.define`のメンバーリーダー（`Analysis::FactStore::Target#kind`） |
| `runtime_defined` | ロード時にクラス自身に定義される | 56 | 型キャリア上で`ValueSemantics#value_fields`が出力する`==`（19件）、`hash`（19件）、`eql?`（18件） |
| `synthetic_source` | defまたはalias | 8 | `sig-gen`が出力を控える`def`: 引数のない`initialize`（意図的にスキップされる — `Generator#non_trivial_initialize?`）、またはインデクサーがエイリアス元のdefノードに対して記録する`alias eql? ==` |
| `synthetic_source` | `attr_*` / `define_method` / `alias_method` | 6 | シングルトン側の`attr_reader`が支配的（`class << self`内の`Trinary.yes` / `.no` / `.maybe`） |
| `runtime_defined` | 生成された祖先からのシングルトンメソッド | 4 | `class X < Data.define(…)`の無名`Data.define`親クラス上の`.new` |
| `runtime_defined` | ロード時にクラス自身からのシングルトンメソッド | 4 | `VoidOrigin.new` / `.[]`、`ParamOverride.new`、`ClassFrame.new` |
| `runtime_defined` | `Data`から継承 | 3 | `ClassFrame#initialize`、`CallContext#with`、`DiscoveryIndex#with` |
| `runtime_defined` | ロード時にすべてのサブクラスにコンパイルされる | 1 | `Prism::Node#rigor_each_child` |
| `runtime_defined` | `Exception`から継承 | 1 | `Plugin::LoadError#cause` |
| `no_source` | — | **0** | 何も定義していない宣言 |

ティア1は**224件中155件（69%）**を解決し、ティア2が残りの69件を解決します。唯一文書化されているランタイム生成のケースである`sig/prism_node_children.rbs`は、免除されるのではなくリフレクションによって確認されます: 宣言は抽象クラス`Prism::Node`上にあるため、すべてのサブクラスが1つの宣言に対して解決され、サブクラスのスイープによって古い宣言と区別されます。

## ファイル別

帰属のない宣言を持つファイルのみ；他のすべての`sig/`ファイルには存在しません。

| ファイル | `synthetic_source` | `inherited_source` | `runtime_defined` | `no_source` |
| --- | --- | --- | --- | --- |
| `sig/prism_node_children.rbs` | 0 | 0 | 1 | 0 |
| `sig/rigor.rbs` | 0 | 2 | 0 | 0 |
| `sig/rigor/analysis/fact_store.rbs` | 10 | 0 | 2 | 0 |
| `sig/rigor/cli/diff_command.rbs` | 0 | 1 | 0 | 0 |
| `sig/rigor/cli/explain_command.rbs` | 0 | 1 | 0 | 0 |
| `sig/rigor/cli/sig_gen_command.rbs` | 0 | 1 | 0 | 0 |
| `sig/rigor/environment.rbs` | 1 | 0 | 0 | 0 |
| `sig/rigor/inference.rbs` | 19 | 0 | 3 | 0 |
| `sig/rigor/inference/void_origin.rbs` | 3 | 0 | 2 | 0 |
| `sig/rigor/plugin/fact_store.rbs` | 1 | 0 | 0 | 0 |
| `sig/rigor/plugin/load_error.rbs` | 0 | 0 | 1 | 0 |
| `sig/rigor/rbs_extended.rbs` | 12 | 0 | 3 | 0 |
| `sig/rigor/scope.rbs` | 29 | 0 | 1 | 0 |
| `sig/rigor/trinary.rbs` | 3 | 0 | 0 | 0 |
| `sig/rigor/type.rbs` | 6 | 66 | 56 | 0 |

`sig/rigor/type.rbs`単体で224件中128件を占めていますが、理由は1つです: 型キャリアは多相ファミリーであり、各々が共有サーフェス全体を宣言しています。66件の継承行は`accepts`（21件、`Type::AcceptanceRouter`から）および束のトリオ`top` / `bot` / `dynamic`（各15件、`Type::PlainLattice`から）です；56件のランタイム行は`ValueSemantics`からの`==` / `hash` / `eql?`です。1つのミックスイン抽出と1つのクラスマクロが、ファミリーの数だけ乗算された結果です。

## これが変更すること、変更しないこと

**3つの新しい状態は残滓であり、獲得されたものではありません**。宣言されたメソッドが*実在する*と知ることは、その*型*がどこから来たかについては何も語っておらず、型こそが[ADR-107](../../adr/107-checked-types-and-typeless-comments/) § 決定が問うているものです。したがって、`no_source`を`synthetic_source` / `inherited_source` / `runtime_defined`に分割しても、`spec/rigor/sig_gen/provenance_spec.rb`内のファイル単位の残滓ピン留めは正確に元の位置のまま残ります — 今日時点で677件であり、この作業によって変更されません。

**`no_source`はカウントされるバケットではなく、厳格なルール（hard rule）になりました**。正しいツリーではゼロであるため、厳格なルールのコストはゼロです；シード監査が削除する前は9件でした。失敗時は各行を`sig/path.rbs:line: Class#method — no source`と名指しします。

**このチェックはリポジトリのゲートです**。Rigor自身のツリー内で`lib/`に対して`sig/`を読み取り、そのツリーを必要とします；`sig-gen` CLIの機能ではなく、導入プロジェクトのワークフローは変更されません。

**コスト**。12コアM3 Maxの1つのウォームプロセスで測定: `lib/`に対する`sig-gen`は**18.7秒**（ゲートがすでに支払っていた既存のコスト）、ティア1のプロジェクトインデックスは**1.4秒**、ティア2のrequireおよびすべての分類は**0.3秒**。2つのティアは、そもそもこのゲートが`make docs-check`ではなく`spec/rigor/sig_gen/`に存在する理由であったパスに対して、**約1.8秒（+9%）**を追加します。

## これが測定しないもの

- **`plugins/*/sig`および`examples/*/sig`**。ゲートはリポジトリ自身の`sig/`のみを走査します；`make check-plugins`がそこでの異なる特性をカバーします。
- **宣言が*正しい*かどうか**。実在することは正しさではありません — `make check`（G2）と`make steep-check`がそれに答え、来歴（G3の他の2つのメカニズム）が型がどこから来たかに答えます。
- **実在するが到達不能なメソッド**。`rigor unused`が到達可能性のサーフェスです。
- **プラグインが提供するメンバー**。ランタイムティアは`lib/`をロードし、`plugins/`はロードしません。プラグインをrequireすると、ゲートを実行しているプロセスを共有するすべてのspecプロセスにそれが登録されてしまうためです。今日の`sig/`にはそのようなメンバーを記述しているものはありません；存在すれば古いものとして報告されることになり、修正方法は免除ではなく、`spec/rigor/public_api_drift_spec.rb`が同じ理由で`rigor-ffi`をrequireしているのと同様に、`spec/support/sig_source_index.rb`内でそのプラグインをrequireすることです。
