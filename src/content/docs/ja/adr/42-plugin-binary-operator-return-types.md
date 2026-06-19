---
title: "ADR-42 — プラグインが提供する二項演算子の戻り値型（coerce方向）"
description: "Imported from rigortype/rigor docs/adr/42-plugin-binary-operator-return-types.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/42-plugin-binary-operator-return-types.md"
sourcePath: "docs/adr/42-plugin-binary-operator-return-types.md"
sourceSha: "30c18b5909944aaa0a134f69f9f3bbf45b1db60dfa75482bb59d7f094cfc9655"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4042
---

ステータス: **Proposed（低優先度、需要ゲート付き）、2026-06-03**。プラグインが所有する型が**右辺（被強制）オペランド**であるとき、すなわちRigorの型演算（type algebra）に対するPHPStanパリティ監査が真にサポート外と判定した唯一のケースで、Ruby二項演算の結果型をプラグインが提供できるようにするための設計空間を記録する。**インテグレーションスペックに裏打ちされた2026-06-03の需要再評価により本ADRの優先度は引き下げられた**（後述の「需要再評価」を参照）。self／左辺のケースはすでに`dynamic_return`経由で動作し、強制方向は**狭い偽陽性**（`scalar <op> custom`の少数派パターン。`1 + money`が`Integer`として左バイアスで型付けされる）だけを生む。最も安価な修正はエンジンによる緩和（WD-D、そのケースを`Dynamic`として型付けする ── プラグインフックなし）である。精度には、`examples/rigor-units`がすでに指し示しているADR-20の軽量HKT／RBSルートが最も適している。ここに記載のものは何も実装されていない。本ADRは決定とその却下された代替案を記録し、作業が需要ゲート付きにとどまるようにするとともに、**実在の利用者がそうでないと証明しない限り、新しい演算子フックよりWD-D／HKTルートを優先する**。

根拠:
[`docs/notes/20260603-phpstan-type-algebra-comparison.md`](../../notes/20260603-phpstan-type-algebra-comparison/)
（PHPStan ↔ Rigorの型演算の完全な比較、ギャップを強制方向に絞り込んだコードスパイク、および§3／§5の需要再評価）。

## コンテキスト

### パリティの問い、そしてスパイクが解決したこと

PHPStanのプラグイン向け型演算（`TypeCombinator`、`TypeUtils`、`Type`インターフェース、とりわけ`OperatorTypeSpecifyingExtension`）とRigorの比較により、両者がユニオン型（union type）／インターセクション型（intersection type）／差分、漸進的（gradual）な`accepts`、ケイパビリティ（capability）述語、定数抽出、定数スカラー算術、`IntegerRange`の抽象算術、ユニオンの直積畳み込みについてパリティにあることが確立された（本ノートの§2–§3）。Rigorに対応物のない唯一のPHPStan機能が**プラグイン二項演算子フック**である。

その後の2026-06-03のコードスパイク（ノート§3 G1）が、ギャップは*見た目より狭い*ことを示した。Prismでは`a + b`は`name: :+`を持つ`Prism::CallNode`であり、通常の呼び出しパス（[`expression_typer.rb:1233`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb)）を通って`MethodDispatcher.dispatch`に流れ込む。そのティア順序は**`ConstantFolding` → `try_plugin_contribution`（`dynamic_return`）→ RBS**である（[`method_dispatcher.rb:74-97`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/method_dispatcher.rb)）。プラグインが所有するレシーバーは`Nominal[Custom]`であり、`ConstantFolding`はこれを辞退するため、ディスパッチはプラグインティアに到達する。`dynamic_return_type`は**レシーバークラスのみ**でゲートし、メソッド名ではゲートしない（[`base.rb:382`](https://github.com/rigortype/rigor/blob/master/lib/rigor/plugin/base.rb)）。したがってプラグインは今日**すでに**二項演算子の結果型を指定できる:

```ruby
dynamic_return receivers: ["Money"] do |call_node, scope|
  next nil unless %i[+ - * /].include?(call_node.name)
  services.type.nominal_of("Money")  # Money <op> anything → Money, etc.
end
```

これは、プラグインが所有する型が**左辺／レシーバー**オペランドであるすべての演算 ── すなわち`money + n`、`money * 2`、`vec | other`、`path / "sub"` ── をカバーする。PHPStanの`OperatorTypeSpecifyingExtension`はここでは既存の契約（contract）で一致する。そのケースで残っている作業はドキュメントとエルゴノミクスだけである（ノートのG1a／G1b ── 本ADRの範囲外で扱う）。

### 残存ギャップ: 強制方向

Rubyは`a + b`を`a`上でディスパッチする。**左**オペランドが組み込み数値型（`Integer`、`Float`、`Rational`、`BigDecimal`）で、**右**オペランドがプラグイン所有型であるとき、レシーバーは組み込み型であり、Rubyのランタイムはこの演算を`b.coerce(a)`を通じて解決する。ここでプラグインが介入するパスをRigorは持たない:

- `dynamic_return receivers: ["Integer"]`はプラグインが`Integer`を**所有する**ことを要求するが、これはコアの数値モデルと衝突するため許可されない。
- `ConstantFolding`は`Integer + Integer`を処理するが、オペランドの一方が`Nominal[Custom]`になると辞退してRBSに落ちる。RBSは組み込みのシグネチャ（`Integer#+ : (Numeric) -> Numeric`など）を投影し、`1 + money`に対して拡大された ── しばしば誤った ── 型を返す。

PHPStanはこの非対称性を持たない。`isOperatorSupported($left, $right)`は**双方向**であり、興味深い型をどちらのオペランドが担っているかに関わらず拡張が参照される。その双方向性こそ、Rigorに欠けている構造的なケイパビリティである。

### 需要再評価（2026-06-03）

インテグレーションスペック[`spec/integration/plugin_operator_dynamic_return_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/integration/plugin_operator_dynamic_return_spec.rb)に裏打ちされた証拠精査により、このギャップの優先度を歪めていた過大表現を訂正した。このスペックはself／左辺のケースが動作することを確認し、強制方向の挙動を正確に固定する:

- **self／左辺のケースはすでに動作する（新しいフックは不要）**。`dynamic_return receivers: ["Money"]`規則が`:+`／`:-`／`:*`／`:/`に対して発火し、提供される型が`Money <op> Money`の結果になる。4つの演算子すべてでグリーンを確認済み。
- **強制方向はサイレントなフェイルソフトでは*ない* ── そして狭い偽陽性サーフェスを伴う**。初稿は`1 + money`が診断なしで`Dynamic[top]`に落ちると主張した。スペックはこれを反証する。すなわち`1 + money`は`Integer`上でディスパッチし、`Money`規則は発火できず、結果は**`Integer`として左バイアスで型付けされる**（`Dynamic`ではない）。すると後続のメソッド解決が`Integer`に対して走り、`(1 + money).some_money_method`は**`money.coerce(1)`経由でランタイムでは動作するにもかかわらず**`Integer`に対する`undefined-method`としてフラグされる ── 正真正銘の、ただし狭い偽陽性である（少数派の`scalar <op> custom`形式*かつ*結果に対するカスタムメソッドの両方を必要とする）。これは「精度のみ」より強い動機だが、依然として狭い。
- **BigDecimal強制の調査項目は本ADRの証拠にならない**。その偽陽性（`docs/notes/20260519-oss-library-survey.md`）は*オーバーロード順序*の問題 ── 標準ライブラリ`bigdecimal`がオーバーロードリストの先頭で`Integer#+`を再オープンする ── であり、ReceiverAffinityの事前ソート（`acc9882`、[`receiver_affinity.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/method_dispatcher/receiver_affinity.rb)）によってすでに修正されている。プラグインが提供する強制方向の型とは無関係である。
- **最も安価な修正は本フックではなくエンジンによる緩和である**。偽陽性は、`Numeric`でない引数に対して左バイアスが`Integer`を返すことから生じるため、その結果を代わりに`Dynamic`として型付けすれば（下記のWD-D）、**プラグインサーフェスを一切伴わずに**偽陽性が除去される。精度（実際の被強制型）はその場合、別個のADR-20形の関心事になる。[`examples/rigor-units/README.md`](https://github.com/rigortype/rigor/blob/master/examples/rigor-units/README.md)自体が、宣言的な答えとして軽量HKT／RBS型関数（`def *: [T] (T) -> ...`）を指し示しており、新しい演算子フックはそれと競合することになる。

要点: 残存需要は**少数派の`scalar <op> custom`パターン**（`2 * distance`、`0.5 * mass`、`1 + money`）である。これは狭い偽陽性を生みうる（最善の対処はWD-D、フックなし）一方、それ以外では精度を犠牲にする（最善の対処はADR-20）。動機づけとなる代表的なライブラリ（`BigDecimal`、単位／`Money`、ベクトル）は`builtin <op> custom`に`coerce`を頼っているため、パターンは存在する ── 控えめなのはパターンの存在ではなく*専用の演算子フックの価値*のほうである。

## 決定

**Proposed、低優先度**。強制方向のギャップが閉じられる場合には、二項演算子の`CallNode`であって**レシーバー型がコアの組み込み型**だが**引数型がプラグイン所有の`Nominal`**であるものについて、RBS拡大の前に所有プラグインに結果型を問い合わせるエンジンのディスパッチパスを追加する。プラグイン向けの形は下記のワーキング決定のいずれかである。**実装は（a）少なくとも1つの実在するバンドル利用者（BigDecimalまたは`examples/`の単位）と（b）下記のADR-20 HKT／RBSルートではその利用者に対応できないという所見、をゲートとする** ── 偽陽性の規律と需要駆動の規範に従う。再評価を踏まえると、本ADRは無期限にProposedにとどまり、HKTルートが最初に試されるというのがデフォルトの想定である。

### ワーキング決定（フックの形）

- **WD-0（推奨デフォルト）── 新フックではなくADR-20軽量HKT＋RBS型関数で解決する**。利用側ライブラリに強制を意識した演算子結果をRBS型関数として表現させ（`examples/rigor-units`のREADME自身が表明している方向）、新しいプラグイン拡張点なしで既存のRBS／HKTティアによって`builtin <op> custom`を解決する。具体的な利用者がこの方法で表現できない場合に限りWD-A／WD-Bにフォールバックする。

- **WD-D（最も安価な偽陽性緩和、フックなし）── `builtin <op> non-Numeric`を左バイアスではなく`Dynamic`として型付けする**。前述の狭い偽陽性は、`1 + money`が引数のどの`Integer#+`オーバーロードにも一致しないとき現状`Integer`に解決されることだけが原因で存在する。そのケースを`Dynamic`へフェイルソフトさせれば、*精度*（結果が被強制型ではなく`Dynamic`になる）を犠牲にする代わりに、プラグインサーフェスを一切伴わずに偽陽性が完全に除去される。これは実コードで偽陽性が観測された場合の推奨される最初のステップである。WD-0／WD-Aはその後、利用者が必要とする箇所にのみ精度を上乗せする。

- **WD-A（フックが必要な場合の先行案）── 双方向の絞り込み拡張`operator_return`**。新しいADR-37スタイルの分離プロトコル:

  ```ruby
  operator_return operators: %i[+ - * /], operands: ["BigDecimal"] do |op, left, right, scope|
    # called when EITHER left or right is an owned `operands:` type;
    # return a Rigor::Type or nil to decline
  end
  ```

  エンジンは`ConstantFolding`とRBSの間に位置する新ティアから、いずれかのオペランドが一致したときにこれを呼び出す ── PHPStanの`isOperatorSupported(left, right)`／`specifyType(...)`の双方向性に一致する。既存の左辺レシーバーのケースも包摂するため、プラグインは`dynamic_return`の名前チェックを手書きする代わりに、演算子に対して単一のイディオムを持てる（G1bのエルゴノミクスを取り込む）。コスト: 新しい公開拡張点（レジストリ配管、分離テスト）。

- **WD-B ── 既存の`dynamic_return`の上にエンジンブリッジを置く**。契約はそのまま維持し、エンジンの事前チェックを追加する。すなわち、二項演算子のレシーバーが組み込み数値型で引数がプラグイン所有の`Nominal`であるとき、`call_node`からレシーバー／引数の役割が判別できる形で、同じ呼び出しをその所有プラグインの`dynamic_return`ブロックに提示する。新しいDSLサーフェスはなく、レシーバー所有レジストリを再利用する。コスト: `dynamic_return`のレシーバーゲートの意味論に、作者が理解しなければならない強制方向の例外が加わる（`call_node.receiver`が所有型でなくてもブロックが発火する）。

- **WD-C ── `coerce`を直接モデル化する**。`b.coerce(a)`を`Tuple`として型付けし、既存の演算子畳み込みを強制されたペアに対して実行させる。Rubyの意味論に最も忠実だが最も重い。参加するすべてのライブラリに対する`coerce`の戻り値形状のモデル化と、強制されたタプルに再入する畳み込みを必要とする。延期 ── 需要に対して不釣り合いである。

### スコープ外（記録するが、ここでは決定しない）

- **G1a／G1b（左辺レシーバー演算子）:** `dynamic_return`経由ですでにサポートされている。必要なのはドキュメント（`docs/manual/`、`examples/rigor-units`の演算子ケース）と任意の薄い糖衣構文のみ。CHANGELOGレベルで、ADRは不要。
- **G2／G3／G5（プラグイン型演算ファサード ── `to_*`強制、`generalize`、オフセットファサード）: 2026-06-03に評価し、当面は却下**（証拠はノートの§3）。いずれも利用者がいない:
  - **G2（`to_*`強制）** ── *却下。* Rubyのキャストはメソッド呼び出し（`x.to_i`、`Integer(x)`）であり、すでにディスパッチで解決される。真偽値性は`type_specifier`で拡張可能なエンジンのナローイング（narrowing）で扱われる。型→型の強制ファサードは求められていない。
  - **G3（`generalize`）** ── *プラグインファサードとしては却下。*意図的な精度損失はプラグインサーフェスではなくADR-41の推論バジェット機構に属する。もし実現するならそこに折り込む。
  - **G5（オフセットファサード）** ── *延期、条件付き。*最もクリーンな将来の拡張（要素アクセス型を計算するプラグイン定義のコンテナ）だが、現在の利用者はゼロ ── `ShapeDispatch`は設計上、閉じたTuple／HashShapeティアである。プラグインがカスタムコンテナ型を出荷したときにのみ再検討する。
- **G4（null便宜コンビネータ ── `remove_null`／`add_null`）:** `Type::Combinator`上の純粋なDXで、CHANGELOGレベル。

## 帰結

- **偽陽性の規律を最優先する**。動機づけとなるケースは、動作するコードに対する既存の*狭い偽陽性*である。すなわち`1 + money`が`Integer`として左バイアスで型付けされ（スペックで確認済み）、その結果に対するカスタムメソッドが`coerce`経由で動作するにもかかわらず`undefined-method`としてフラグされる。偽陽性に安全な最初のステップはWD-D（そのケースを`Dynamic`として型付けする）であり、これは常に*緩める*だけ ── 診断を除去するのであって、決して追加しない。いかなる精度レイヤー（WD-0／WD-A）も同様に、結果を*厳格化または訂正する*だけにとどめ、動作する強制ベースのコードを脅かしてはならない。これはプロジェクトの最上位価値である「プログラムが動く」と整合する。
- **需要ゲート付き**。同じ変更セットに実在の利用者がいない限り、エンジンの作業は着地しない。それまで本ADRはProposedにとどまり、比較ノートが有効な記録となる。
- **パリティはほぼ達成済み**。G1a／G1bがドキュメント化されれば、Rigorは一般的な（自己／左辺）ケースについてPHPStanの`OperatorTypeSpecifyingExtension`に一致する。本ADRは残る唯一の非対称性（強制方向）を閉じる。
- **系譜**。ADR-2（拡張API）、ADR-37（インターフェース分離 ── WD-Aは新しい分離プロトコル）、ADR-39（対象ライブラリに作用するプラグイン）の上に構築する。エンジンのティア順序は[`method_dispatcher.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/method_dispatcher.rb)の`ConstantFolding` → プラグイン → RBSの並びと相互作用する。
