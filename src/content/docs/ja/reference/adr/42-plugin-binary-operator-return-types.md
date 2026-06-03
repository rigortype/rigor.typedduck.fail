---
title: "ADR-42 — Plugin-contributed binary-operator return types (coerce-direction)"
description: "Imported from rigortype/rigor docs/adr/42-plugin-binary-operator-return-types.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/42-plugin-binary-operator-return-types.md"
sourcePath: "docs/adr/42-plugin-binary-operator-return-types.md"
sourceSha: "91b2dabacc40cd50318c39d53f2237cf3660b5c74144a95c1fbf453c60a86760"
sourceCommit: "bc51e4fe0718731d0592d42696a438b0574c9339"
translationStatus: "translated"
sidebar:
  order: 4042
---

ステータス: **Proposed（低優先度、需要ゲート付き）、2026-06-03**。プラグインが所有する型が**右辺（被強制）オペランド**であるとき、すなわちRigorの型演算（type algebra）に対するPHPStanパリティ監査が真にサポート外と判定した唯一のケースで、Ruby二項演算の結果型をプラグインが提供できるようにするための設計空間を記録する。**2026-06-03の需要再評価により本ADRの優先度は引き下げられた**（後述の「需要再評価」を参照）。このギャップは偽陽性*ではない* ── 現在の挙動は無害なフェイルソフトである ── ため、これが買うのは安全性ではなく精度であり、より自然な修正は`examples/rigor-units`がすでに指し示しているADR-20の軽量HKT／RBS型関数ルートである。ここに記載のものは何も実装されていない。本ADRは決定とその却下された代替案を記録し、作業が投機的ではなく需要ゲート付きにとどまるようにするとともに、**実在の利用者がそうでないと証明しない限り、新しい演算子フックよりHKTルートを優先する**。

根拠:
[`docs/notes/20260603-phpstan-type-algebra-comparison.md`](../../notes/20260603-phpstan-type-algebra-comparison/)
（PHPStan ↔ Rigorの型演算の完全な比較、ギャップを強制方向に絞り込んだコードスパイク、および§3／§5の需要再評価）。

## コンテキスト

### パリティの問い、そしてスパイクが解決したこと

PHPStanのプラグイン向け型演算（`TypeCombinator`、`TypeUtils`、`Type`インターフェース、とりわけ`OperatorTypeSpecifyingExtension`）とRigorの比較により、両者がユニオン型（union type）／インターセクション型（intersection type）／差分、漸進的（gradual）な`accepts`、ケイパビリティ（capability）述語、定数抽出、定数スカラー算術、`IntegerRange`の抽象算術、ユニオンの直積畳み込みについてパリティにあることが確立された（本ノートの§2–§3）。Rigorに対応物のない唯一のPHPStan機能が**プラグイン二項演算子フック**である。

その後の2026-06-03のコードスパイク（ノート§3 G1）が、ギャップは*見た目より狭い*ことを示した。Prismでは`a + b`は`name: :+`を持つ`Prism::CallNode`であり、通常の呼び出しパス（[`expression_typer.rb:1233`](../../lib/rigor/inference/expression_typer.rb)）を通って`MethodDispatcher.dispatch`に流れ込む。そのティア順序は**`ConstantFolding` → `try_plugin_contribution`（`dynamic_return`）→ RBS**である（[`method_dispatcher.rb:74-97`](../../lib/rigor/inference/method_dispatcher.rb)）。プラグインが所有するレシーバーは`Nominal[Custom]`であり、`ConstantFolding`はこれを辞退するため、ディスパッチはプラグインティアに到達する。`dynamic_return_type`は**レシーバークラスのみ**でゲートし、メソッド名ではゲートしない（[`base.rb:382`](../../lib/rigor/plugin/base.rb)）。したがってプラグインは今日**すでに**二項演算子の結果型を指定できる:

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

初稿後の証拠精査により、このギャップの優先度を膨らませていた2つの過大表現を訂正した:

- **現在の挙動は無害であり、偽陽性ではない**。レシーバーが組み込み型で引数がプラグイン所有の`Nominal`であるとき、ディスパッチは**診断なし**で`Dynamic[top]`に落ちる（フェイルソフト）。その`Dynamic`に対する後続の呼び出しもフェイルソフトする。したがってこのギャップが犠牲にするのは*精度*（およびプラグイン*自身*のチェックの完全性 ── たとえば次元安全性における偽*陰性*）であって、動作するコードに対する偽陽性ではない。Rigorの最上位価値である「プログラムが動く」に照らせば、これは弱い動機である。
- **BigDecimal強制の調査項目は本ADRの証拠にならない**。その偽陽性（`docs/notes/20260519-oss-library-survey.md`）は*オーバーロード順序*の問題 ── 標準ライブラリ`bigdecimal`がオーバーロードリストの先頭で`Integer#+`を再オープンする ── であり、ReceiverAffinityの事前ソート（`acc9882`、[`receiver_affinity.rb`](../../lib/rigor/inference/method_dispatcher/receiver_affinity.rb)）によって**すでに修正されている**。これはプラグインが提供する強制方向の型とは無関係である。
- **自然な修正は新フックではなくADR-20かもしれない**。 [`examples/rigor-units/README.md`](https://github.com/rigortype/rigor/blob/master/examples/rigor-units/README.md)自体が、演算子型付けへの宣言的な答えはランタイムのディスパッチテーブルではなく軽量HKT／RBS型関数（`def *: [T] (T) -> ...`）であると記している。新しい演算子拡張点はその方向と重複し、競合する仕組みになるリスクがある。

要点: 残存需要は**少数派の`scalar <op> custom`パターン**（`2 * distance`、`0.5 * mass`）であり、ここで精密な型があれば単位／Moneyプラグインが次元安全性のチェックを継続できる。実在するが狭く、精度のみで、ADR-20に包摂される見込みが高い。動機づけとなる代表的なライブラリ（`BigDecimal`、単位／`Money`、ベクトル）は`builtin <op> custom`に`coerce`を頼っているため、パターンは存在する ── 控えめなのはパターンの存在ではなく*価値*のほうである。

## 決定

**Proposed、低優先度**。強制方向のギャップが閉じられる場合には、二項演算子の`CallNode`であって**レシーバー型がコアの組み込み型**だが**引数型がプラグイン所有の`Nominal`**であるものについて、RBS拡大の前に所有プラグインに結果型を問い合わせるエンジンのディスパッチパスを追加する。プラグイン向けの形は下記のワーキング決定のいずれかである。**実装は（a）少なくとも1つの実在するバンドル利用者（BigDecimalまたは`examples/`の単位）と（b）下記のADR-20 HKT／RBSルートではその利用者に対応できないという所見、をゲートとする** ── 偽陽性の規律と需要駆動の規範に従う。再評価を踏まえると、本ADRは無期限にProposedにとどまり、HKTルートが最初に試されるというのがデフォルトの想定である。

### ワーキング決定（フックの形）

- **WD-0（推奨デフォルト）── 新フックではなくADR-20軽量HKT＋RBS型関数で解決する**。利用側ライブラリに強制を意識した演算子結果をRBS型関数として表現させ（`examples/rigor-units`のREADME自身が表明している方向）、新しいプラグイン拡張点なしで既存のRBS／HKTティアによって`builtin <op> custom`を解決する。具体的な利用者がこの方法で表現できない場合に限りWD-A／WD-Bにフォールバックする。

- **WD-A（先行）── 双方向の絞り込み拡張`operator_return`**。新しいADR-37スタイルの分離プロトコル:

  ```ruby
  operator_return operators: %i[+ - * /], operands: ["BigDecimal"] do |op, left, right, scope|
    # called when EITHER left or right is an owned `operands:` type;
    # return a Rigor::Type or nil to decline
  end
  ```

  エンジンは`ConstantFolding`とRBSの間に位置する新ティアから、いずれかのオペランドが一致したときにこれを呼び出す ── PHPStanの`isOperatorSupported(left, right)`／`specifyType(...)`の双方向性に一致する。既存の左辺レシーバーのケースも包摂するため、プラグインは`dynamic_return`の名前チェックを手書きする代わりに、演算子に対して単一のイディオムを持てる（G1bのエルゴノミクスを取り込む）。コスト: 新しい公開拡張点（レジストリ配管、分離テスト）。

- **WD-B ── 既存の`dynamic_return`の上にエンジンブリッジを置く**。契約はそのまま維持し、エンジンの事前チェックを追加する。すなわち、二項演算子のレシーバーが組み込み数値型で引数がプラグイン所有の`Nominal`であるとき、`call_node`からレシーバー／引数の役割が判別できる形で、同じ呼び出しをその所有プラグインの`dynamic_return`ブロックに提示する。新しいDSLサーフェスはなく、レシーバー所有レジストリを再利用する。コスト: `dynamic_return`のレシーバーゲートの意味論に、作者が理解しなければならない強制方向の例外が加わる（`call_node.receiver`が所有型でなくてもブロックが発火する）。

- **WD-C ── `coerce`を直接モデル化する**。 `b.coerce(a)`を`Tuple`として型付けし、既存の演算子畳み込みを強制されたペアに対して実行させる。Rubyの意味論に最も忠実だが最も重い。参加するすべてのライブラリに対する`coerce`の戻り値形状のモデル化と、強制されたタプルに再入する畳み込みを必要とする。延期 ── 需要に対して不釣り合いである。

### スコープ外（記録するが、ここでは決定しない）

- **G1a／G1b（左辺レシーバー演算子）:** `dynamic_return`経由ですでにサポートされている。必要なのはドキュメント（`docs/manual/`、`examples/rigor-units`の演算子ケース）と任意の薄い糖衣構文のみ。CHANGELOGレベルで、ADRは不要。
- **G2／G3／G5（プラグイン型演算ファサード ── `to_*`強制、`generalize`、オフセットファサード）: 2026-06-03に評価し、当面は却下**（証拠はノートの§3）。いずれも利用者がいない:
  - **G2（`to_*`強制）** ── *却下。* Rubyのキャストはメソッド呼び出し（`x.to_i`、`Integer(x)`）であり、すでにディスパッチで解決される。真偽値性は`type_specifier`で拡張可能なエンジンのナローイング（narrowing）で扱われる。型→型の強制ファサードは求められていない。
  - **G3（`generalize`）** ── *プラグインファサードとしては却下。*意図的な精度損失はプラグインサーフェスではなくADR-41の推論バジェット機構に属する。もし実現するならそこに折り込む。
  - **G5（オフセットファサード）** ── *延期、条件付き。*最もクリーンな将来の拡張（要素アクセス型を計算するプラグイン定義のコンテナ）だが、現在の利用者はゼロ ── `ShapeDispatch`は設計上、閉じたTuple／HashShapeティアである。プラグインがカスタムコンテナ型を出荷したときにのみ再検討する。
- **G4（null便宜コンビネータ ── `remove_null`／`add_null`）:** `Type::Combinator`上の純粋なDXで、CHANGELOGレベル。

## 帰結

- **偽陽性の規律を最優先する**。動機づけとなるケースは、動作するコードに対する既存の*偽陽性／過剰拡大*（`1 + money`が緩すぎる型になる）であって、欠けている厳格さではない。いかなる実装も、強制方向の結果を*厳格化または訂正する*だけにとどめ、動作する強制ベースのコードを脅かす新しい診断を導入してはならない。これがリスクを限定し、プロジェクトの最上位価値である「プログラムが動く」と整合する。
- **需要ゲート付き**。同じ変更セットに実在の利用者がいない限り、エンジンの作業は着地しない。それまで本ADRはProposedにとどまり、比較ノートが有効な記録となる。
- **パリティはほぼ達成済み**。 G1a／G1bがドキュメント化されれば、Rigorは一般的な（自己／左辺）ケースについてPHPStanの`OperatorTypeSpecifyingExtension`に一致する。本ADRは残る唯一の非対称性（強制方向）を閉じる。
- **系譜**。 ADR-2（拡張API）、ADR-37（インターフェース分離 ── WD-Aは新しい分離プロトコル）、ADR-39（対象ライブラリに作用するプラグイン）の上に構築する。エンジンのティア順序は[`method_dispatcher.rb`](../../lib/rigor/inference/method_dispatcher.rb)の`ConstantFolding` → プラグイン → RBSの並びと相互作用する。
