---
title: "ADR-13 — `TypeNode`リゾルバプラグインフック + TypeScriptユーティリティ型アダプター"
description: "rigortype/rigor docs/adr/13-typenode-resolver-plugin.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/13-typenode-resolver-plugin.md"
sourcePath: "docs/adr/13-typenode-resolver-plugin.md"
sourceSha: "10050f4409110c565e1f2a851464438c892fd83d0ac32279eabe107cc7760802"
sourceCommit: "5b252bbd814960f6b442a4df7dd41a0d0a79c995"
translationStatus: "translated"
sidebar:
  order: 4013
---

Status: **accepted, 2026-05-11; v0.1.4で実装済み**。`lib/rigor/type_node/`がリゾルバインフラを担い、`plugins/rigor-typescript-utility-types/`が本番プラグイン。ADR-16フォローアップ（合成メソッドティアのリゾルバチェイン配線）は需要駆動のまま。

## コンテキスト

PHPStanは[`TypeNodeResolverExtension`][phpstan-custom]拡張ポイントを出荷しています: パースされたPHPDocの`TypeNode`と周囲の`NameScope`を受け取り、カスタムの`Type`を返す、あるいは`null`を返してフォールスルーするクラスです。PHPStanのドキュメントにある実例はTypeScriptの`Pick<T, K>`ユーティリティ型を実装します — リゾルバはジェネリックのヘッド（`Pick`）を検査し、2つの型引数を読み、配列シェイプを歩き、ピックされたキーだけを持つ新しく構築された定数配列型を返します。PHPStanチームは同じフックを`phpstan-phpunit`内部で使い、`Foo|MockObject`を`Foo&MockObject`に再マップしています。

[phpstan-custom]: https://phpstan.org/developing-extensions/custom-phpdoc-types

Rigorの現状の2つの事実が応答を形作ります:

1.  **Rigorの型演算子サーフェスはすでにいくつかのTypeScriptユーティリティ型をRBS正準演算子としてカバーしています**（[`type-operators.md`](../../type-specification/type-operators/)）: `T - U`は`Exclude`、`T & U`は`Extract`、`T - nil`は`NonNullable`、`T[K]`はインデックスアクセスをカバーします。[`imported-built-in-types.md`](../../type-specification/imported-built-in-types/)§「先送りまたは拒否されたインポート」のリストは、名前レベルのインポート（`Partial`、`Required`、`Readonly`、`Pick`、`Omit`、`Record`、`Parameters`、`ReturnType`、`InstanceType`）は「初期に」Rigor表面形式としてランディングしてはならない（MUST NOT）と明示しています。そのMUST NOTを反転するハードルは、正準サーフェスを汚染することなくユーザーがオプトインできる具体的な拡張ポイントです。

2.  **Rigorにはプラグイン拡張可能な型ノード解決がありません**。`%a{rigor:v1:return: …}` / `%a{rigor:v1:param: …}` / `%a{rigor:v1:assert: …}`ペイロードの現在の名前解決パスは`Rigor::Builtins::ImportedRefinements::Parser`にハードコードされています。新しいヘッド（`pick_of[…]`、`partial_of[…]`、…）の追加は現在、コア内のレジストリを編集する必要があります。プラグインは、基底のセマンティクスが既存のキャリア（carrier）を通じて表現可能であっても、名前付き型語彙に貢献できません。

ユーザーの要求 — *「TypeScriptユーティリティ的な型を定義するAPIを提供し、TS等価のビルトインを出荷する」* — には2つの部分があります。**API**部分は上記の拡張性ギャップです**。ビルトイン**部分はTypeScript正準名をRigorコアに持ち込むべきではありません（仕様はすでにそれを拒否しています）;TS名をRigor正準演算子と型関数にマップするオプトインのプラグインとして出荷すべきです。

## 決定

v0.1.xスライス（slice）としてゲートされた3つの追加をランディングします:

1.  プラグインがカスタムの名前付きまたはジェネリック型語彙に貢献するために実装する**`Plugin::TypeNodeResolver`拡張ポイント**。リゾルバは`%a{rigor:v1:…}`ペイロード解決パスにおいて、ビルトインレジストリ（`ImportedRefinements`）とRBSフォールバックの間に座ります。`nil`を返すとフォールスルーします。

2.  [`type-operators.md`](../../type-specification/type-operators/)と[`imported-built-in-types.md`](../../type-specification/imported-built-in-types/)に追加される**Rigor正準のシェイプ射影型関数の小さなバッチ**（`pick_of[T, K]`、`omit_of[T, K]`、`partial_of[T]`、`required_of[T]`、`readonly_of[T]`）。これらは既存の`key_of[T]` / `value_of[T]`の`lower_snake[…]`命名規則に従います;セマンティクスは規範的です。

3.  `examples/`下の**`rigor-typescript-utility-types`プラグイン**。TypeScript正準名（`Pick<T, K>`、`Omit<T, K>`、`Partial<T>`、`Required<T>`、`Readonly<T>`、…）に貢献する`TypeNodeResolver`を登録し、各々を一致するRigor演算子または型関数にマップします。他のすべてのRigorプラグインとまったく同様に、`.rigor.yml`の`plugins:`リストを介してオプトインします。

### なぜ3つに分けるのか？

各々が別個の関心事に対処します;それらをまとめるのは間違いです:

- **リゾルバフック**は耐久性のある拡張サーフェスです。他のADRはすでに名前付き型語彙に触れています（`rigor-units`の計量単位、`rigor-rspec`のマッチャー型、将来の`rigor-dry-types`の述語スタイルリファインメント（refinement、篩型とも））。これがなければ、そのような拡張はすべてコアにアップストリームする必要があります。
- **正準型関数**はシェイプの算術が実際に存在する場所です。プラグインは翻訳者であり、セマンティックなオーナーではありません。`pick_of[T, K]`をコアに入れることは、HashShape対Record対Tuple対オブジェクトシェイプに対して「pick」が何を意味するかを指定する場所が正確に1つあることを意味します — そして診断表示契約には一貫した綴りが1つあります。`Pick<T, K>`がプラグインによって直接定義されると、2つのプラグイン（例えばTypeScript名を出荷するものとFlow名を出荷するもの）が静かに発散します。
- **例のプラグイン**は境界を実演し、SorbetからやTypeScriptからやってきたユーザーに、RBS正準のデフォルトサーフェスを壊さずに具体的なオプトインパスを与えます。

### `Plugin::TypeNodeResolver`の形

```ruby
module Rigor
  module Plugin
    # RBS::Extendedディレクティブペイロード
    # (%a{rigor:v1:return: ...}, %a{rigor:v1:param: ...},
    # %a{rigor:v1:assert: ...}) に現れるカスタム型名を
    # 解決するための拡張ポイント。ビルトインレジストリの
    # 後、RBSフォールバックの前に参照される。
    class TypeNodeResolver
      # @param node [Rigor::TypeNode::Base]
      #   Generic(head:, args:)またはIdentifier(name:)のいずれか
      # @param scope [Rigor::TypeNode::NameScope]
      # @return [Rigor::Type::Base, nil] nilは「自分のものではない」を意味
      def resolve(node, scope) = nil
    end
  end
end
```

これを2つの新しい公開Dataクラスが裏打ちします:

```ruby
Rigor::TypeNode::Identifier = Data.define(:name)
Rigor::TypeNode::Generic    = Data.define(:head, :args)
                              # head: String, args: [Node, …]
```

`Rigor::TypeNode::NameScope`は次を公開します:

- `resolver` — 拡張が自身の引数を再帰的に解決するための再エントリーポイント（`scope.resolver.resolve(args[0], scope)`）。PHPStanの`TypeNodeResolverAwareExtension`パターンを循環参照ワークアラウンドなしでミラーします（Rigorはコンストラクター注入ではなく引数でリゾルバを渡します）。
- `class_context` — 周囲のクラス / モジュール名（あれば）。
- `type_alias_table` — 前方参照用のプロジェクトのRBS型エイリアスの読み取り専用ビュー。

リゾルバの呼び出し順序は:

1.  `Builtins::ImportedRefinements.lookup(name)` — 引数なしのビルトインリファインメント（`non-empty-string`など）。
2.  `Builtins::ImportedRefinements::Parser` — ビルトインのパラメーター化形式（`non-empty-array[T]`、`int<a, b>`、`pick_of[T, K]`、…;この行は決定（2）からの新しい型関数を得ます）。
3.  **プラグインリゾルバ、プラグイン登録順**。各プラグインの`TypeNodeResolver#resolve(node, scope)`が呼び出されます;最初の非nil戻り値が勝ちます。
4.  通常のクラスインスタンス、エイリアス、ジェネリックに対するRBSフォールバック（`RBS::Parser.parse_type`）。
5.  解決失敗 → `dynamic.rbs-extended.unresolved`診断;影響を受けるスロットは`Dynamic[top]`に縮退します。

プラグイン登録は既存のマニフェストを使います:

```ruby
class RigorTypescriptUtilityTypes < Rigor::Plugin::Base
  manifest(
    id: "typescript-utility-types",
    version: "0.1.0",
    type_node_resolvers: [Resolvers::Pick.new,
                          Resolvers::Omit.new,
                          Resolvers::Partial.new,
                          # ...
                          ]
  )
end
```

競合ポリシー: 2つのプラグインがリゾルバを登録してもよい（MAY）;最初の非nil戻り値がノードごとに勝ちます。後のプラグインのリゾルバが同じノードに対して**異なる**非nil型を生成したであろう場合、`plugin.<id>.type-node-shadow``:info`診断が表面化します（エンジンはデバッグモードではすべてのリゾルバに尋ねますが、通常モードでは最初のマッチを使います）。これはADR-9のファクト（fact）ストア競合の表面化と同じ形です。

### 正準型関数の追加

[`type-operators.md`](../../type-specification/type-operators/)§「演算子カタログ」へのRigor正準追加（新しいセクションではなくテーブル拡張）:

| 形式 | 意味 |
| --- | --- |
| `pick_of[T, K]` | キーが`K`に制限されたレコード / シェイプの部分集合。`K`はリテラルキー型のユニオン（union、合併型とも）;`T`はレコード / HashShape / オブジェクトシェイプであるべき（SHOULD）。 |
| `omit_of[T, K]` | `K`にキーがあるエントリーが削除されたレコード / シェイプの部分集合。`pick_of`の双対。 |
| `partial_of[T]` | `T`の必須エントリーすべてを任意にする。タプル位置はnullableまたは欠落エントリーにマップ。 |
| `required_of[T]` | `T`の任意エントリーすべてを必須にする。`partial_of`の逆。 |
| `readonly_of[T]` | `T`の各エントリーを現在のビューで読み取り専用としてマーク。`imported-built-in-types.md`§「初期コレクションとシェイプリファインメント」の既存の読み取り専用エントリーマーカーと合成。 |

セマンティックな注記3つ:

- これらは**シェイプ対応**演算子です。レコード / シェイプ射影がない型を持つ値（例: エントリーレベルのキーがない素の`Hash[String, Integer]`）に適用すると、保守的に縮退します: `pick_of[Hash[K, V], K_subset]` → `Hash[K, V]`、`dynamic.shape.lossy-projection``:info`provenanceマーカー付き。
- `partial_of`は値型に`nil`を**追加しません**。エントリーを必須から任意に反転させます。区別が重要: TypeScriptの`Partial<T>`は暗黙的に`T | undefined`に広げます;RigorはADR-1§「ハッシュシェイプセマンティクス」に従い、「キー不在」を「キー存在で値がnil」と別個にモデル化します。
- `readonly_of[T]`は**ビュー層**の制約で、基底のオブジェクトが凍結されている証明ではありません。すでに[`imported-built-in-types.md`](../../type-specification/imported-built-in-types/)§「初期コレクションとシェイプリファインメント」にある読み取り専用エントリールールと一致します。

新しいエントリーは[`imported-built-in-types.md`](../../type-specification/imported-built-in-types/)§「初期型関数と演算子」も同じテーブル行で拡張します。

## 変換テーブル: TypeScript → Rigor

`rigor-typescript-utility-types`プラグインはTS名をRigor正準形式にマップします。損失のあるマッピングは貢献サイトで`plugin.typescript-utility-types.degraded`を発火します。

| TypeScript | Rigor | メカニズム |
| --- | --- | --- |
| `Exclude<T, U>` | `T - U` | 既存のコア演算子 |
| `Extract<T, U>` | `T & U` | 既存のコア演算子 |
| `NonNullable<T>` | `T - nil` | 既存のコア演算子 |
| `Partial<T>` | `partial_of[T]` | 新しいコア型関数 |
| `Required<T>` | `required_of[T]` | 新しいコア型関数 |
| `Readonly<T>` | `readonly_of[T]` | 新しいコア型関数 |
| `Pick<T, K>` | `pick_of[T, K]` | 新しいコア型関数 |
| `Omit<T, K>` | `omit_of[T, K]` | 新しいコア型関数 |
| `Record<K, V>` | `Hash[K, V]` | 直接のRBS形式 |
| `Parameters<F>` | `Dynamic[top]`（縮退） | 関数型射影は先送り |
| `ReturnType<F>` | `Dynamic[top]`（縮退） | 関数型射影は先送り |
| `InstanceType<C>` | `Dynamic[top]`（縮退） | `imported-built-in-types.md:96`に従う将来の`instance_type[C]` |
| `Awaited<P>` | `Dynamic[top]`（縮退） | Rubyにビルトインの`Promise`はない |
| `ConstructorParameters<C>` | `Dynamic[top]`（縮退） | `Parameters`と同じ |
| `Uppercase<S>` / `Lowercase<S>` | `Dynamic[top]`（縮退） | Rigorにコンパイル時文字列ケーシングはない |
| `Capitalize<S>` / `Uncapitalize<S>` | `Dynamic[top]`（縮退） | 同上 |
| `ThisParameterType<F>` / `OmitThisParameter<F>` | `Dynamic[top]`（縮退） | Sorbetスタイルの`T.self_type`が同様の作業をする;TSユーティリティ型の関心事ではない |
| `NoInfer<T>` | `T`（恒等） | TypeScriptの推論制御ヒント;Rigorに対応物はない |

「縮退」行はユーザーが境界を監査できるよう、`plugin.typescript-utility-types.unsupported`provenanceマーカー付きで`Dynamic[top]`を生成します。関数型射影（`Parameters`、`ReturnType`）は、Rigorが`params_of[F]` / `return_of[F]`コア演算子を導入すると到達可能になります — フォローアップとしてキュー。

## ADR-2との境界（拡張API）

ADR-2§「カスタムPHPDoc型の含意」（PHPStan拡張サーフェステーブルの*「Rigorは...カスタムRBS拡張型のパースを優先すべき」*という行）は、このフックをスコープ内に予期していましたが、契約を固定していませんでした。このADRは、リゾルバ形状、呼び出し順序、競合ポリシーを固定することでそのギャップを閉じます。

このフックは既存の`Plugin::Base#flow_contribution_for`基板と合成します: リゾルバが`Rigor::Type::Base`を返します;その型はビルトイン型と同じFlowContribution機構を通じてナローイング（narrowing）に参加します。新しいファクトマージポリシーは不要です。

## ADR-0 / ADR-1との境界（RBS正準、インラインDSLなし）

ADR-0はアプリケーションのRubyコードでRigor固有のインラインDSLを禁止します。このADRはそれに違反しません:

- Rigorは独自の新しいDSLを導入しません。新しい型関数（`pick_of`など）は既存の`RBS::Extended`アノテーションサーフェス（`%a{rigor:v1:…}`）内に存在し、これはすでにRigor固有の著作チャネルです。
- TypeScript正準名（`Pick<T, K>`、`Omit<T, K>`、…）は**プラグイン提供**であり、コアではありません。プラグインをインストールしないユーザーは解決時にそれらを見ません。

ADR-1はRBSを正準のエクスポート契約として固定します。新しい型関数は[`rbs-erasure.md`](../../type-specification/rbs-erasure/)に従い既存のRBS消去契約を拡張します:

- `pick_of[Record{a: A, b: B}, "a"]`はピックされたキーに制限された基底レコードのRBSスペル: `{ a: A }`に消去されます。
- `partial_of[Record{a: A}]`は任意キーマーカー付きのRBS形式に消去されます（Rigorのレコード構文はこれをサポート）。
- `pick_of[Hash[K, V], K_subset]`は`Hash[K, V]`（保守的）に消去されます。
- 消去前にコア関数に還元されないプラグイン提供名は、既存の動的消去ルールに従い`Dynamic[top]` → `untyped`に消去されます。

## パブリックAPIドリフトサーフェス

このADRは次を追加します:

- `Rigor::Plugin::TypeNodeResolver`（新しい基底クラス）。
- `Rigor::TypeNode::Identifier`（新しい凍結Data）。
- `Rigor::TypeNode::Generic`（新しい凍結Data）。
- `Rigor::TypeNode::NameScope`（`#resolver`、`#class_context`、`#type_alias_table`を持つ新しい値オブジェクト）。
- `Rigor::Plugin::Manifest#type_node_resolvers`（新しいattr_reader;デフォルト`[]`）。
- `Rigor::Builtins::ImportedRefinements::Parser`は5つの新しい型関数ヘッド（`pick_of`、`omit_of`、`partial_of`、`required_of`、`readonly_of`）を得ます。パーサー自体はパブリックAPIサーフェスの一部ではありませんが、そのパース出力は`Type::*`キャリアを通じて観察可能です。
- 新しい診断識別子:
  - `dynamic.rbs-extended.unresolved`（解決失敗フォールバック）。
  - `dynamic.shape.lossy-projection`（非シェイプキャリア上の`pick_of` / `omit_of`）。
  - `plugin.typescript-utility-types.degraded`（損失のあるTSマッピング）。
  - `plugin.typescript-utility-types.unsupported`（Rigorに対応物がないTS名）。

すべての更新は実装と同じコミットで`spec/rigor/public_api_drift_spec.rb`にランディングします。

## 実装のスライス分け

推奨される順序;各スライスは独立して出荷可能:

1.  **`Rigor::TypeNode`値オブジェクト + spec。— LANDED (v0.1.4)**
    純粋なDataクラス;パーサーの変更はまだなし。ドリフトスナップショットがランディング。
2.  **`Plugin::TypeNodeResolver`基底クラス + マニフェストフック。— LANDED (v0.1.4)**
    `Plugin::Manifest#type_node_resolvers`リーダー;ローダーはプラグイン全体でリゾルバを集約。パーサー統合はまだなし。
3.  **`ImportedRefinements::Parser`でのパーサー統合。— LANDED (v0.1.4)**
    「プラグインリゾルバを参照する」ステップをルックアップチェーンの正しい位置に挿入。ペイロード全体の失敗に対する`dynamic.rbs-extended.unresolved`診断。
4.  **コア型関数 — フェーズA（レコード / シェイプキャリア）。— LANDED (v0.1.4)**
    HashShapeとレコードキャリアに対する`pick_of[T, K]`、`omit_of[T, K]`、`partial_of[T]`、`required_of[T]`、`readonly_of[T]`。`type-operators.md`と`imported-built-in-types.md`にspec行を追加。
5.  **コア型関数 — フェーズB（タプル + オブジェクトシェイプ）。— LANDED (v0.1.4)**
    フェーズAのカバレッジをタプルとオブジェクトシェイプキャリアに拡張;非シェイプ入力に対するlossy-projection診断。
6.  **`plugins/rigor-typescript-utility-types/`。— LANDED (v0.1.4)**
    v1カットでは5つのリゾルバ（Pick、Omit、Partial、Required、Readonly）;7つの「縮退」行は`plugin.typescript-utility-types.unsupported`戻り値として出荷。`plugins/`直下に着地（`examples/`ではなく）。
7.  **ドキュメント更新。— LANDED (v0.1.4)**
    ハンドブック章がプラグインを相互参照;`examples/README.md`比較テーブルがTypeScriptユーティリティ型行を得る。

[rails-roadmap]: ../../design/20260508-rails-plugins-roadmap/

## 作業上の決定

### WD1 — なぜ`RBS::Types::*`を再利用するのではなく新しいDataクラスASTを？

RBSのパーサーはRigorのペイロード構文（`pick_of[T, K]`、`int<a, b>`）を知りません。`ImportedRefinements::Parser`の既存パーサーは手書きのStringScannerウォークで、RBS形のツリーではありません。既存パーサーの上にプラグイン拡張性を追加するのは、リゾルバが**Rigorの**ミニASTを見る場合に最も安価です（モックRBSのものではなく）。2つのDataクラス（`Identifier`、`Generic`）はパーサーが発行するすべての文法生成をカバーします。

### WD2 — なぜコアが`pick_of`などを出荷するのか、プラグインに任せないのか？

3つの理由:

1.  **シェイプセマンティクスはコアに属します**。HashShapeからのpick対Recordからのpick対Tupleからのpickは異なるルールを持ちます;lossy-projectionの崖は現実です。その決定を中央化することで、プラグインごとの発散を回避します。
2.  **RBS消去契約**。ADR-1はすべてのRigor型に決定論的なRBS消去を要求します。プラグイン提供型はリゾルバがコア型を返すパターンを通じてこれを満たします。`Pick<T, K>`がプラグイン内部の型キャリアを返した場合、消去パスもプラグインを参照する必要があります — 循環。
3.  **他のプラグインもシェイプ射影を望みます**。`rigor-units`（計量単位）と`rigor-rspec`（マッチャー型）は両方ともTypeScript名を必要とせずに`pick_of` / `omit_of`の恩恵を受けます。関数は単独で立ちます。

### WD3 — なぜ競合解決にオーソリティ階層ではなくプラグイン登録順を？

ADR-2§「プラグイン貢献マージング」は**フロー貢献**（戻り値型、ファクト、ミューテーション）に対してオーソリティ階層を定義します。型ノード解決は異なる操作 — ランタイムのファクトマージではなくパース時のルックアップです。同じ名前にリゾルバを登録する2つのプラグインは設定上の選択を示します（ユーザーが両方をインストールした）;最初勝ちは`Plugin::Base#diagnostics_for_file`の慣習（登録順）と一致します。`plugin.<id>.type-node-shadow`診断は競合を表面化するため、ユーザーは選択できます。

### WD4 — なぜ関数型射影（`Parameters<F>`、`ReturnType<F>`）はこのADRにランディングしないのか？

シェイプ型ではなく関数 / proc型から射影する別のコア演算子（`params_of[F]`、`return_of[F]`）が必要です。セマンティクスは明確に定義されていますが、実装はパーサーだけでなくディスパッチャーに触れます。フォローアップとしてキュー — ランディングすると、`rigor-typescript-utility-types`プラグインは2行成長します。

### WD5 — なぜ「最高優先度プラグインが勝つ」ではなく「最初の非nilが勝つ」？

優先度システムは中央集権的な優先度レジストリを必要とし、プラグインを互いに結合します。最初勝ちは既存のプラグインローダー登録セマンティクスと一致し、プラグインgemを独立して抽出可能に保ちます。特定のリゾルバを勝たせたいユーザーは`.rigor.yml`の`plugins:`順序を調整します — 診断順序にすでに使っているのと同じレバーです。

### WD6 — なぜリゾルバが`Scope`をミューテートできないのか？

ADR-2§「Scopeオブジェクト」と同じ答え: 拡張は解析器の状態をミューテートしません。リゾルバは`Type`（または`nil`）を返します;解析器は通常のナローイング機構を通じてそれを適用します。ミューテーションフリーな契約は並列解析とキャッシングを扱いやすく保ちます。

## 検討した代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| TS正準名（`Pick`、`Omit`、…）を`ImportedRefinements::REGISTRY`に直接追加 | 拒否 | `imported-built-in-types.md:101`は初期に追加してはならない（MUST NOT）と明示。それを反転するには仕様変更がいずれにせよ必要で、プラグインパスはコアを汚染せずに同じUXを達成。 |
| 生のペイロード文字列をプラグインに渡し、プラグインにパースさせる | 拒否 | 各プラグインがStringScannerウォークとパースエラー処理を重複させる。ミニASTはパーサー側の複雑性を吸収する小さなサーフェス。 |
| RBSの既存`RBS::Types::*` ASTを使う | 拒否（WD1） | ペイロード文法はRBSではない;RBS ASTに通すことを強制すると、偽の`RBS::Types::Application`ノードを合成する必要がある。 |
| すべてのTS、Flow、JSDocユーティリティ型バリアントを出荷する1つのメガプラグイン | 拒否 | 3つの独立した型言語アダプターを結合。各々を独自のプラグインgemとして保ち;コア演算子を共有。 |
| `Plugin::TypeNodeResolver`を`Plugin::Base`のメソッドとして構築（別個のクラスなし） | 拒否 | プラグインは複数の独立したリゾルバを登録したい場合がある（名前ごとに1つ）。名前付きクラスとして分離することで、各リゾルバを分離してテスト可能に保ち、マニフェストが明示的にそれらをリストできる。 |
| TSユーティリティ型を超える2番目の消費者が現れるまでフックを先送り | 拒否 | ユーザーは明示的にフックを求めた;先送りすると即時のユースケース（`Pick`など）をコアに行を追加することで解決することになり、仕様はすでにそれを拒否した。フックは最も摩擦の少ないアンブロックである。 |

## 未解決の問題

- **`pick_of[T, K]`は`T`としてTupleを受け付けるべきか？** TypeScriptの`Pick`はオブジェクト型でのみ動作する;Rigorでは、Tuple上の数値インデックスによるpickは自然な解釈を持つ。決定はスライス5に先送り — HashShape / Record / オブジェクトシェイプから始め、具体的なニーズが表面化したらTupleを追加する。
- **リゾルバはインラインのtype-of式に対して`scope.type_of(...)`を受け取るべきか？** PHPStanのリゾルバは受け取らない;Rigorのフックはパース時に呼び出され、呼び出しサイトの評価より前。決定: v1で`NameScope`に`type_of`なし;リゾルバ側の`typeof x`参照が具体的な要求になれば再検討。
- **`partial_of[T]`は値型を広げて`nil`を含めるべきか？** TypeScriptの`Partial<T>`はそうする（`undefined`が`T | undefined`に暗黙的に含まれるため）。RigorのHashShapeは「不在」と「存在でnil」を区別するため、デフォルトは必須性を反転させ値型に触れないこと。スライス4の未解決の問題 — 具体的な消費者にとって区別が重要なら兄弟の`partial_nullable_of[T]`を追加できる。
- **`readonly_of`はミューテーションエフェクト推論と相互作用するべきか？** 静的ビュー上でエントリーを読み取り専用としてマークすることは、基底オブジェクトのランタイム可変性を変えない。診断姿勢は「このビューを介した書き込みを警告」;そのような書き込みが`:warning`であるべきか`:error`であるべきかは`severity_profile`の決定。決定はスライス4に先送り — `:warning`から始める。

## リビジョン履歴

- 2026-05-11 — 初期提案。PHPStanの`TypeNodeResolverExtension`実例（`Pick<Address, 'name' | 'surname'>`）を参考にして、「TypeScriptユーティリティ的な型を定義するAPIを準備し、TS等価のビルトインを出荷する」というユーザー要求が発端。解決: 3つのピースのランディング — プラグインフック + Rigor正準型関数 + オプトインTSプラグイン。
- 2026-05-xx — accepted;7つのスライスすべてをv0.1.4で実装。`lib/rigor/type_node/`がリゾルバインフラネームスペース;`plugins/rigor-typescript-utility-types/`が本番プラグイン。
