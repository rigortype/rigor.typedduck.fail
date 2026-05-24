---
title: "型演算子"
description: "rigortype/rigor docs/type-specification/type-operators.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/type-operators.md"
sourcePath: "docs/type-specification/type-operators.md"
sourceSha: "ecedbddbfe0e215997c775b5c46cb7eab6dc50dfcf6dc33f1e0c15678a80c68e"
sourceCommit: "a7f0405346ea5833580c50f3610ccb0b97fea2d8"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorの型演算子サーフェスはRBS互換演算子（`|`、`&`、`T?`、`[…]`）を、負のファクト、差分型、シェイプ投影に使われる内部形式と組み合わせます。

この文書はそれらの演算子のセマンティクス、診断表示コントラクト、および負のファクト診断を読みやすくするための省略ルールを定義します。リファインメントと型関数の予約済み組み込み名は[imported-built-in-types.md](../imported-built-in-types/)にカタログ化されています。これらの演算子が存在する束は[value-lattice.md](../value-lattice/)にあります。

## 演算子カタログ

| 形式 | 意味 |
| --- | --- |
| `T | U` | ユニオン（RBS互換） |
| `T & U` | 積集合（RBS互換） |
| `T?` | `T | nil`（RBS互換） |
| `~T` | 現在の既知ドメイン内での`T`の補完（内部） |
| `T - U` | 差分: `T`の値から`U`の値を除いたもの（内部） |
| `key_of[T]` | レコード、ハッシュシェイプ、タプル、またはシェイプ的型の既知キー |
| `value_of[T]` | レコード、ハッシュシェイプ、タプル、またはシェイプ的型の既知値のユニオン |
| `pick_of[T, K]` | キーが`K`に含まれるものに制限されたレコード/シェイプ |
| `omit_of[T, K]` | キーが`K`に含まれるエントリーが削除されたレコード/シェイプ |
| `partial_of[T]` | `T`の必須エントリーすべてを任意にしたレコード/シェイプ |
| `required_of[T]` | `T`の任意エントリーすべてを必須にしたレコード/シェイプ |
| `readonly_of[T]` | `T`の各エントリーを現在のビューで読み取り専用としてマークしたレコード/シェイプ |
| `T[K]` | タプル、レコード、オブジェクトシェイプ、またはジェネリックコンテナメタデータへのインデックスアクセス |
| `if T <: U then X else Y` | 高度なライブラリモデリングが必要な場合の条件型 |

Rigor専用演算子（`~T`、`T - U`、条件型）の最終的な表面構文は意図的に暫定的です。セマンティクスは規範的です;ユーザー著作の`RBS::Extended`ペイロードで受け付けられる前にスペルが変わる場合があります（MAY）。

## 補完（`~T`）

`~T`は**現在の既知ドメイン**内での`T`の補完であり、値がすでに正のドメインとして`top`を持つ場合でない限り「`T`を除くすべての可能なRubyオブジェクト」ではありません。

フロー解析では、`~T`は通常「`T`を除いた後の以前の型」を意味します。例えば、すでに`String | Symbol`であることが証明された値の中の`~"foo"`は`(String | Symbol) - "foo"`を意味します。

負のファクトは除外された型から正のドメインを推論してはなりません（MUST NOT）。`v != "foo"`は`String`を`String - "foo"`に絞り込む場合があります（MAY）、または`"foo" | "bar"`を`"bar"`に絞り込む場合がありますが（MAY）、生の`untyped`は動的由来の関係的負のファクトとともに`Dynamic[top]`のままでなければなりません（MUST）。

`~T`は主にコンパクトな診断表示とブランチローカル表記のために予約されています。著者は`RBS::Extended`アノテーションの明示的な差分型には`T - U`を優先すべきです（SHOULD）。

## 差分（`T - U`）

`T - U`は差分型の好ましい明示的著作形式です。特に`String - ""`のようなスカラーリファインメントでは裸の補完より読みやすいことが多いです。

内部的には、Rigorは差分を負の型との積集合に正規化する場合があります（MAY）:

```text
T - U = T & ~U
```

これにより表記に役割分担が与えられます:

- `~T`はブランチローカル表示に簡潔で有用です（例: `~"foo"`）。
- `T - U`はユーザー著作の拡張シグネチャに明示的で有用です（例: `String - ""`）。
- `T & ~U`は実装と推論に便利な正規化形式です。

### ドメイン相対セマンティクス

負のファクトは値のすでに既知の正のドメインから値を取り除きます。比較の右辺から新しい正のドメインを導入してはなりません（MUST NOT）。例えば:

```text
v: String
v != "foo" => v: String - "foo"

v: "foo" | "bar"
v != "foo" => v: "bar"

v: String | Symbol
v != "foo" => v: (String - "foo") | Symbol

v: untyped
v != "foo" => v: Dynamic[top] with a dynamic-origin relational fact `v != "foo"`
```

最後のケースは意図的に`Dynamic[String - "foo"]`ではありません。文字列リテラルとの比較はチェックされていないRuby値が`String`であることを証明せず、Ruby等価はメソッドディスパッチです（[control-flow-analysis.md](../control-flow-analysis/)参照）。Rigorは後の診断や矛盾のために負の関係を保持する場合がありますが（MAY）、独立したガードがそのドメインを証明しない限り、動的または未知の値をより狭い正の型に変換してはなりません（MUST NOT）。

### 有限ドメイン対オープンドメイン

現在のドメインが有限の場合、負のファクトは正確に正規化すべきです（SHOULD）。現在のドメインが大きいか未知の場合、負のファクトは無制限の差分チェーンに展開されるのではなくバジェットで保持すべきです（SHOULD）。バジェットが超過した場合、Rigorは表示を拡幅し、追加の負のファクトが省略されたというprovenanceを保持すべきです（SHOULD）。具体的なバジェットは`budgets.negative_fact_display`です; [inference-budgets.md](../inference-budgets/)を参照してください。

## 診断表示コントラクト

診断はユーザーが負のファクトをグローバルな補完と誤読しないよう、ドメイン対応の表示コントラクトを使わなければなりません（MUST）:

- 有限ドメインが小さなユニオンに正規化される場合、正のユニオンを表示します。例えば、`"foo" | "bar" - "foo"`は`"bar"`として表示されます。
- 正のドメインが既知でまだ広い場合、裸の補完ではなく`String - "foo"`や`Integer - 0`のように`D - U`を表示します。
- 複数の除外が保持される場合、ネストされた差分ではなく`String - ("" | "foo")`のようにフラット化した差分を表示します。
- 現在のドメインが`top`の場合、診断がブランチローカル補完に関する場合でない限り、裸の`~U`より`top - U`または説明的な散文を優先します。
- 裸の`~U`は、周囲の診断がすでにドメインを述べている場合にのみ使う場合があります（MAY）。例えば「`String`の中で値は`~"foo"`」。
- 動的由来のprovenanceが重要な場合、可能であればドメイン式とは別に表示します（例: 動的由来ノートを付けた`String - "foo"`、またはテクニカルトレースでの`Dynamic[String - "foo"]`）。`Dynamic[T]`表示ルールは[diagnostic-policy.md](../diagnostic-policy/)にあります。
- 保持された除外バジェットが超過した場合、不安定な長いチェーンではなく、正のドメインと省略ノートを表示します（例: `Integer with 12 excluded literals omitted`）。

### 表示の例

```text
String - "foo"      # リテラル"foo"を除くすべてのString
1 | 2 | 3 - 2       # 正規化後は1 | 3と同等
String - ("" | "x") # リストされたリテラルを除くすべてのString
top - nil           # nilを除くすべてのRuby値
~"foo"              # 周囲の診断がドメインを述べている場合のみ
```

### 省略コントラクト

省略コントラクトはデフォルトの診断が読みやすくなりながら説明が完全なままになるように具体的な形を持ちます:

- デフォルト表示バジェットは上位3つの保持された除外を保持し、内部的にさらに除外が保持されているとき、レンダリングされたリストを`+N more`で終えます。表示バジェットは`budgets.negative_fact_display`であり、`.rigor.yml`で設定可能です。[inference-budgets.md](../inference-budgets/)を参照してください。
- 選択はナローイング決定に最近参加した除外を優先し、次に公称ベースより前のリテラル値を、次に出力が安定するようにレキシカル順を優先します。
- `+N more`サフィックスは診断識別子にリンクし、完全な詳細が利用可能であることをユーザーが知れるようにします。
- `rigor explain <diagnostic-id>`（CLIの`--explain`も同様）はすべての保持された除外、超過したバジェット、選択の順序を表示します。これはPHPStanの解析説明に相当するRigorのものです。
- プラグインは`Scope` APIを通じて保持された除外の完全なリストを読み取り、独自の上位層診断をそこからレンダリングできます（MAY）;デフォルト表示バジェットはプレゼンテーションルールであり、情報制限ではありません。

## インデックスアクセス（`T[K]`）と投影（`key_of`、`value_of`）

`T[K]`、`key_of[T]`、`value_of[T]`は構造化型から情報を投影します:

- `T[K]`は`T`がタプル、レコード、オブジェクトシェイプ、または使用可能なメタデータを持つジェネリックコンテナの場合、インデックス/キー`K`の型を返します。
- `key_of[T]`は`T`の既知キーのユニオンを返します。
- `value_of[T]`は`T`の既知値のユニオンを返します。

これらの形式は`RBS::Extended`ペイロード（[rbs-extended.md](../rbs-extended/)参照）と解析器内のシェイプ対応ナローイングに有用です。RBSには保守的に消去されます（[rbs-erasure.md](../rbs-erasure/)参照）。

## シェイプ射影（`pick_of`、`omit_of`、`partial_of`、`required_of`、`readonly_of`）

シェイプ射影演算子は、レコード/HashShape/オブジェクトシェイプを、エントリーを制限・削除・再マークすることで変換します。これらは`key_of[T]` / `value_of[T]`の兄弟で、同じ`lower_snake[…]`命名規則に従います。[`rigor-typescript-utility-types`](../../adr/13-typenode-resolver-plugin/)プラグインがTypeScriptの`Pick<T, K>`、`Omit<T, K>`、`Partial<T>`、`Required<T>`、`Readonly<T>`を割り当てる、正準のRigorスペルです。

### 制限と削除（`pick_of`、`omit_of`）

`pick_of[T, K]`は`T`のうちキーが`K`にマッチするエントリーだけを残します。`omit_of[T, K]`はその双対: キーが`K`にマッチするすべてのエントリーを落とし、残りを保ちます。`K`はリテラルキー型のユニオン（典型的には`Symbol`または`String`のシングルトン型のユニオン、または明示的なリテラル型ユニオン）です。

```text
T = Record{name: String, age: Integer, email: String}

pick_of[T, "name" | "email"] = Record{name: String, email: String}
omit_of[T, "age"]            = Record{name: String, email: String}
```

`T`がタプルの場合、キーは整数インデックスです:

```text
T = Tuple[String, Integer, Symbol]
pick_of[T, 0 | 2] = Tuple[String, Symbol]  # スライス5の実装次第。ADR-13を参照
```

`pick_of` / `omit_of`は**シェイプ対応**です。エントリーレベルのキー情報を持たない値（例: レコード形状射影のない素の`Hash[K, V]`）に適用された場合、保守的に縮退します: `pick_of[Hash[K, V], K_subset]`は`Hash[K, V]`に評価され、ユーザーが境界を監査できるように`dynamic.shape.lossy-projection``:info`診断を発火します。

### 必須性反転（`partial_of`、`required_of`）

`partial_of[T]`は`T`の必須エントリーすべてを任意に反転させます。`required_of[T]`はその逆: すべての任意エントリーを必須に反転させます。

`partial_of`は値型に`nil`を**追加しません**。TypeScriptの`Partial<T>`は、JavaScriptにシェイプレベルの「キー不在」キャリアがないため暗黙的に`T | undefined`に広げます; Rigorの`HashShape`は[control-flow-analysis.md](../control-flow-analysis/)と[structural-interfaces-and-object-shapes.md](../structural-interfaces-and-object-shapes/)に従い、「キー不在」と「キーは存在し値が`nil`」を区別します。この2つの事実は合成します:

```text
T = Record{name: String, age: Integer}

partial_of[T]  = Record{name?: String, age?: Integer}
                 # キー不在 OR（キー存在 AND 値がString / Integer）

required_of[partial_of[T]] = T
                 # ラウンドトリップ
```

将来の利用者がTSスタイルのnil広がりバリアントを必要とする場合、それは別の`partial_nullable_of[T]`演算子として出荷されます（ADR-13 §「未解決の問題」を参照）。

### ビュー層の読み取り専用（`readonly_of`）

`readonly_of[T]`は`T`の各エントリーを**現在のビュー内で**読み取り専用としてマークします。静的型が`readonly_of[T]`である参照を通じた書き込みは「読み取り専用ビューを通じた書き込み」として診断されます;基底のRubyオブジェクトが凍結されていることは証明されません。これは[imported-built-in-types.md](../imported-built-in-types/)§「初期コレクションとシェイプリファインメント」で説明されている読み取り専用ハッシュシェイプエントリーセマンティクスと合成します。

「読み取り専用ビューを通じた書き込み」の診断深刻度はアクティブな`severity_profile`に従います。著作デフォルトは`:warning`; strictプロファイルは`:error`に再スタンプします。

### RBS消去

シェイプ射影演算子は[rbs-erasure.md](../rbs-erasure/)に従いRBSに消去されます:

- `pick_of[Record{…}, K]`は、`K`にないエントリーを削除した基底レコードのRBSスペルに消去されます（Rigorレコード構文が結果を直接サポート）。
- `omit_of[Record{…}, K]`は、`K`エントリーを引いた同じレコードに消去されます。
- `partial_of[Record{…}]`は、各エントリーに任意キーマーカーを付けたレコードに消去されます。
- `required_of[Record{…}]`は、すべての任意キーマーカーを取り除いたレコードに消去されます。
- `readonly_of[T]`は読み取り専用マーカーを削除して消去されます;基底のRBS型は静的ビューのRBS消費者が見るものです。
- `pick_of[Hash[K, V], K_subset]`と他の損失のある縮退は`Hash[K, V]`に消去されます。

## 条件型

Rigorは高度なライブラリシグネチャのために条件型形式`if T <: U then X else Y`をサポートする場合があります（MAY）。現在のスペルは暫定的です;具体的な移行メリットが現れない限り、RigorはTypeScript構文（`T extends U ? X : Y`）をコピーしてはなりません（MUST NOT）。

条件型は静的にどちらのブランチも選択できない場合、保守的なユニオンまたは境界に消去されます。
