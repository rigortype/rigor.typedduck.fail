---
title: "ADR-4: 型推論エンジンと`Scope#type_of`クエリ"
description: "Imported from rigortype/rigor docs/adr/4-type-inference-engine.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/4-type-inference-engine.md"
sourcePath: "docs/adr/4-type-inference-engine.md"
sourceSha: "65a4994a2fb2c2c8a47a248871e17597806cf3701c7c2b00ad85cdb19b0bde5a"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 4004
---

## ステータス

ドラフト。

ADR-4は、静的型モデル（ADR-1・ADR-3）を動作する推論エンジンに変える設計決定を記録します。中心となる具体的な成果物は、Prism ASTノードと不変な`Rigor::Scope`を取り、その式がそのプログラム位置で生成すると証明された`Rigor::Type`を返す解析器クエリです。これはPHPStanの`$scope->getType($node)`に対するRuby/Rigorの対応物であり、すべてのCLI規則・プラグイン・リファクタツールが最終的に呼び出すクエリです。

ADR-4はセマンティクスを再定義**しません** — それらは[`docs/type-specification/`](../type-specification/)にあります — また型オブジェクト公開契約も再定義**しません** — それは[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)にあります。ADR-4は、どのRubyモジュールが推論を実装するか、それらがどの順序で着地するか、そしてコードを書き始めるために必要なADR-3の未決事項に対する暫定回答を固定します。

このADRの規範的な側面 — `Scope#type_of`の公開契約・フェイルソフトポリシー・不変性規律・エンジンロード境界 — は[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)にあります。このADRとそのドキュメントが観測可能なRubyの挙動について食い違うとき、仕様が束縛し、このADRが一致するよう更新されます。

## コンテキスト

今日のRigorはPrismでRubyをパースし、CLIを通じてパース時診断を報告します。型表現・スコープ・推論はありません。ADR-1は型モデルセマンティクスを固定し、ADR-3は型オブジェクト表現を固定し、2つの`docs/internal-spec/`ドキュメントはエンジン表層と型オブジェクト公開契約を固定します。残る決定は*解析器がASTをTypeにどう変えるか*、どの順序で、どのシームでです。

PHPStanの`$scope->getType($node)`が標準的な参照です。これは`(Scope, Node)`から`Type`への純粋関数で、型オブジェクトカタログ・クラスレジストリ・メソッドディスパッチャー・スコープが運ぶ制御フローファクトを参照します。RigorはRuby慣用的な命名で同じ形状を採用します。

## 参照モデル: PHPStan `Scope::getType`

類似のPHPStan表層は以下のとおりです。

- [`src/Analyser/Scope.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Analyser/Scope.php) — `getType(Expr $node): Type`、不変スコープ、構造的な変数束縛。
- [`src/Analyser/MutatingScope.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Analyser/MutatingScope.php) — in-place変更ではなく新鮮スコープを返すメソッドを通じて新しい束縛を流す実装戦略。
- [`src/Analyser/NodeScopeResolver.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Analyser/NodeScopeResolver.php) — 文レベルスコープ伝播を駆動するビジター。

Rigorは不変スコープ＋純粋型付け器の分離を採用します。意図的に採用**しない**ものは以下のとおりです。

- PHPの`parent::`リフレクションモデル — Rubyのクラスレイアウトは異なり、レジストリはRBS駆動です。
- PHPStanの深いビジター継承 — Rigorの型付け器は、ADR-3の「型クラス間の継承なし」規則と整合的に、パターンマッチングを通じてPrismノードでディスパッチします。

## ADR-3未決事項に対する暫定回答

ADR-3は、推論コードを書き始める前に回答が必要な2つの未決事項を記録しています。ADR-4は、最初の垂直スライスが着地できるよう**暫定**回答にコミットします。決定は、Slice 1が出荷され選択肢が実コードで行使された後にのみ、ADR-3のWorking Decisionsへ昇格します。

### OQ1: Constantスカラーとオブジェクトシェイプ — 暫定回答**Option C（ハイブリッド）**

統一された`Rigor::Type::Constant`キャリアが、スカラーリテラル（`Integer`・`Float`・`String`・`Symbol`・`Rational`・`Complex`・`true`・`false`・`nil`）に加えて、タプルスライスで用いる静的な整数端点`Range`リテラルを保持します。複合リテラル形状（`Tuple`・`HashShape`・`Record`）は、その内部型参照とシェイプポリシーが単一のRubyの値に圧縮できないため、専用クラスを得ます。

スライスでハイブリッドを選ぶ根拠:

- スカラーキャリッジはコンパクトでRuby慣用的なまま保たれます。1つのクラスが並列階層なしで9つのリテラル種別をカバーします。
- 複合シェイプはどのみち必要な構造的検査可能性を保ちます。
- リファインメント合成（`non-empty-string`・`positive-int`・hash-shape追加キーポリシー）は、[`rigor-extensions.md`](../../type-specification/rigor-extensions/)で同じスカラー／複合境界に沿ってきれいに分割されます。

リスク（スライスレビューのために記録）:

- リテラル配列`[1, 2, 3]`は文書化された回答が必要です — Slice 5はこれを生の値を運ぶ定数配列シェイプではなく`Constant`の`Tuple`にするため、`Tuple`クラスは構造的、`Constant`クラスは点ごとです。
- リファインメント射影が頻繁にクラスごとのディスパッチを必要とすることが判明したら、スライスが昇格する前にスカラーキャリッジをクラスごと（`String::Constant`・`Integer::Constant`...）に再検討・移行します。

### OQ2: 3値返り述語の命名 — 暫定回答**Option A（`?`を落とす）**

`Rigor::Trinary`を返す能力（capability）クエリと関係的クエリは、`?`サフィックスなしの名詞／動詞名を使います。

```ruby
type.string                # Rigor::Trinary
type.integer               # Rigor::Trinary
type.subtype_of(other)     # Rigor::Type::SubtypeResult
type.has_method(name)      # Rigor::Trinary
type.string.yes?           # bool, the only ?-suffixed surface
```

根拠:

- 戻り値型は名前形状にエンコードされます。`?`はRigor全体でMUSTブール値を意味し、これには`Rigor::Trinary#yes?`/`no?`/`maybe?`を含みます。
- PHPStanの`isString()`スタイル（これもRubyの`?`スタイルではない）と整合し、`?`サフィックス付きメソッドが`true`/`false`を返すというRubyの期待と整合します。
- Option Bが導入する曖昧さ（`?`サフィックス付きメソッドから黙って非ブール値を返す）を回避します。

リスク:

- Rubyの読み手は本能的に`type.string?`と入力して`NoMethodError`を得るかもしれません。明確なクラスレベルのドキュメンテーション文字列と（slice 1で）落とした`?`形式を提案するカスタム`method_missing`を追加することでこれを緩和します。

Slice 1のレビューがOption C（双対API）の方が使いやすいと結論したら、ADR-3 OQ2は更新され、単一のフォローアップで`?`シュガーが型表層全体に追加されます。

## 仮想ノードとメソッドディスパッチ境界

PHPStanは、Rigorが早期に採用する1つの機能を公開します。すなわち`$scope->getType($node)`は、実際のパーサノードと、`Type`値を直接埋め込んだ*合成*ノードの両方を受け付けます。PHPStanの`TypeExpr`により、呼び出し元は偽のASTを構築せずに「`$scope->getType(new Add(new LNumber(1), new TypeExpr(new IntType())))`は何を推論するか？」を尋ねることができます。プラグインは同じ形状を使ってリファクタをシミュレートし、値を絞り込み、メソッド戻り値型規則をプローブします。

Rigorはディスパッチャースライスを待つのではなく、Slice 1の強化でこれを導入します。契約は[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)の*仮想ノード*にあります。出荷される最小表層は`Rigor::AST::Node`（マーカーモジュール）と`Rigor::AST::TypeNode`です。追加の合成種別（呼び出し式・コンテナリテラル・ナローイングラッパー）は、それらを実際に消費するスライスと一緒に着地します。

### 拒絶された選択肢: 演算子メソッドディスパッチのために型クラスを特殊化する

もっともらしい代替は、`1 + 2`がレシーバ型に呼び出しを評価するよう問うことでディスパッチするように、演算子メソッドを持つRubyの組み込み型に対して`Rigor::Type`を特殊化することです — `Rigor::Type::IntegerType`が算術を知り、`Rigor::Type::StringType`が連結を知るなどです。この選択肢は**拒絶されました**。理由は以下のとおりです。

- 型クラス間の継承（ADR-3で禁止）か、すべての型形式上の「これらの引数で`:+`を評価する」ためのオープンエンドなduck-type契約のいずれかを要求します。これは[`internal-type-api.md`](../../internal-spec/internal-type-api/)の薄い値オブジェクト規則に矛盾します。
- PHPStan自身の設計も同じ関心事を分離しています。`Type::Type`は能力（capability）と射影クエリに答えます。メソッドディスパッチは`MethodReflection`と`*ReturnTypeExtension`プラグインポイントを通じます。`ConstantStringType extends StringType`のようなサブクラスは、メソッドディスパッチ特殊化のためではなく*表現*特殊化のために存在します。
- ADR-2のRigor拡張APIは、プラグイン作者が組み込みメソッドの挙動（フレームワーク知識・gem固有の慣用法）を追加またはオーバーライドすることを期待します。その表層を型クラスに集中させると、エンジンをサブクラス化せずに拡張するのが難しくなります。

選ばれた設計は代わりに、`Rigor::Inference::MethodDispatcher`（Slice 2で定数畳み込みスタブとして導入され、Slice 4でRBSルックアップで拡張）を通じてレイヤードルックアップでメソッドディスパッチをルーティングします。すなわち定数畳み込みルールブック・次にRBS環境・次に組み込み演算子／メソッドテーブル・次にADR-2プラグイン拡張です。型クラスは薄いまま保たれ、ディスパッチャーの入力は実際のノードと合成ノードにわたって統一的（上記の仮想ノード契約を介して）であり、演算子セマンティクスはプラガブルです。

## スライスロードマップ

各スライスは独立して出荷され、前のスライスをgreenに保ち、コードベースを倒さずに巻き戻すことができます。

### Slice 1 — リテラル型付け器（このスライス）

公開成果物: `Rigor::Scope#type_of(node)`がリテラル式・ローカル変数読み込み・浅い`Array`リテラルについて正しい型を返します。それ以外は`Dynamic[Top]`にフォールバックします。Slice 1の強化はさらに、合成型付け位置が初日から使えるよう上記の仮想ノードインフラを着地させます。

追加されるコード表層:

- `yes`/`no`/`maybe`のflyweightと`and`/`or`/`negate`を持つ`Rigor::Trinary`。
- `Rigor::Type`ドキュメンテーション専用ducktypeモジュール。
- `Rigor::Type::Top`・`Bot`・`Dynamic`・`Nominal`・`Constant`・`Union`。
- `Rigor::Type::Combinator`ファクトリ: `union`・`dynamic`・`nominal_of`・`constant_of`。
- `Integer`・`Float`・`String`・`Symbol`・`NilClass`・`TrueClass`・`FalseClass`・`Object`・`BasicObject`のハードコードエントリを持つ`Rigor::Environment::ClassRegistry`。
- レジストリをラップする`Rigor::Environment`公開エントリ（RBSローダーはSlice 4で追加）。
- `Rigor::Scope.empty(environment:)`・`#with_local`・`#local`・`#type_of`。
- サポートされるノードに対する`Rigor::Inference::ExpressionTyper#type_of(node, scope)`。
- `Rigor::AST::Node`マーカーモジュールと`Rigor::AST::TypeNode`合成ノード。型付け器によってPrismノードと並べてディスパッチされます。
- `Rigor::Inference::Fallback`値オブジェクトと`Rigor::Inference::FallbackTracer`オブザーバー。`Scope#type_of(node, tracer: ...)`を通じてスレッドされます。Slice 1以降カバレッジリグレッションが観測可能であるよう、すべてのフェイルソフトフォールバックを記録します。後のスライスは同じトレーサー上に`record_dispatch_miss`・`record_budget_cutoff`などを追加します。
- `Rigor::Source::NodeLocator`（ソーステキストとAST位置決めユーティリティのための新しい`Rigor::Source`名前空間下）は`(source, line, column)`またはバイトオフセットを最深の囲みPrismノードにマップし、`Rigor::Source::NodeWalker`はDFS事前順ですべてのPrismノードを生成します。
- `Rigor::Inference::CoverageScanner`は新鮮な`FallbackTracer`で歩行された各ノードに対して`Scope#type_of`を実行し、最初に記録されたイベントの`node_class`が訪問したノードのクラスと一致するときノードを**直接認識されない**として分類します。これによりパススルーラッパー（`ProgramNode`・`StatementsNode`・`ParenthesesNode`）の二重カウントが回避されます。
- `rigor type-of FILE:LINE:COL` CLIサブコマンドはロケータと`Scope#type_of`をラップします。推論された型とRBS消去（テキストまたは`--format=json`）を表示します。`--trace`は`FallbackTracer`を取り付け、記録されたイベントを報告します。これはエンジン表層に対する最初のドッグフードループであり、単一位置のフェイルソフトカバレッジを検査する主要なツールです。
- `rigor type-scan PATH...` CLIサブコマンドは、ファイル全体とディレクトリに対する`CoverageScanner`をラップし、クラスごとの訪問／認識されないカウントを集約し、フォールバック位置のサンプルを表面化します。`--threshold=RATIO`はそれをCIで実行可能にします。すなわち認識されない比率がしきい値を超えるとコマンドは非ゼロで終了し、カバレッジリグレッションが`rigor check`に到達する前にビルドを破ります。

Slice 1で認識されるPrismノード:

`IntegerNode`・`FloatNode`・`StringNode`・`SymbolNode`・`TrueNode`・`FalseNode`・`NilNode`・`LocalVariableReadNode`・`LocalVariableWriteNode`・`LocalVariableTargetNode`・`ArrayNode`（浅い、ナローイング不要）。

他のすべてのノードは`type_of`から`Dynamic[Top]`を返します。フェイルソフト経路の契約は[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)で規範的です。

### Slice 2 — メソッドディスパッチ（定数畳み込みスタブ）

ロードマップは元々ここに`ローカル・結合・文`を、その後に`メソッドディスパッチ（RBSバック）`を置いていました。`rigor type-scan lib`ドッグフードループが着地したとき順序が入れ替わりました。すなわちこのコードベース内の認識されない式全体の約28%が`Prism::CallNode`と`Prism::ArgumentsNode`で、他のSlice 2候補の付加価値を圧倒していました。ローカル／結合は引き続き次に出荷され、Slice 3となります。

追加:

- `dispatch(receiver_type:, method_name:, arg_types:, block_type:)`を持つ`Rigor::Inference::MethodDispatcher`（エントリモジュール）と`Rigor::Inference::MethodDispatcher::ConstantFolding`（ルールブック）。ディスパッチャーは呼び出しを畳み込めるとき`Rigor::Type`を返し、「規則なし」のとき`nil`を返すため、型付け器がフェイルソフトフォールバックを所有します。
- `Constant`引数を持つ`Rigor::Type::Constant`レシーバ上の二項数値（`+ - * / % < <= > >= == != <=>`）・文字列（`+ * == != < <= > >= <=>`、暴走出力を避けるための`STRING_FOLD_BYTE_LIMIT`キャップ付き）・symbol（`== != <=> < <= > >=`）・boolean（`& | ^ == !=`）・nil（`==, !=`）演算子をカバーする定数畳み込みルールブック。ホワイトリスト外は`nil`を返します。畳み込み中の実行時例外もrescueされ`nil`にダウングレードされます。
- `ExpressionTyper`は`Prism::CallNode`（ディスパッチャー経由でルーティング、ミス時には`Dynamic[Top]`にフォールバック）と`Prism::ArgumentsNode`（非値位置として扱われ、カバレッジスキャナーがそれをフラグするのを止めます。CallNodeハンドラーがその子を直接読みます）を認識します。
- `ExpressionTyper#type_of`は`PRISM_DISPATCH`ハッシュとして書き直され、認識ノードカタログが循環的複雑度予算を再びトリップさせずに将来のスライスで成長できるようになります。
- **強化ラウンド**は算術を超えてカタログを広げます。ディスパッチハッシュは現在以下もカバーします。
  - `Rigor::Environment::ClassRegistry#nominal_for_name`を介して解決される`Prism::ConstantReadNode`と`Prism::ConstantPathNode`。レジストリのハードコードリストはSlice-1の9個から〜35のコアクラス（`Array`・`Hash`・`Range`・`Regexp`・`Proc`・`Method`・`Module`・`Class`・`Numeric`・`Comparable`・`Enumerable`・標準的な`Exception`格子、加えて`IO`・`File`・`Dir`・`Encoding`）に成長します。未登録の名前は依然として`Dynamic[Top]`にフェイルソフトし、フォールバックイベントを発出します。
  - コンテナリテラル: `Prism::HashNode`/`Prism::KeywordHashNode`を`Nominal[Hash]`として、`Prism::InterpolatedStringNode`を`Nominal[String]`として、`Prism::InterpolatedSymbolNode`を`Nominal[Symbol]`として、`Prism::EmbeddedStatementsNode`はその本体型を伝播します。
  - 定義式: `Prism::DefNode`を`Constant[:method_name]`として、`Prism::ClassNode`/`Prism::ModuleNode`/`Prism::SingletonClassNode`はその本体型を伝播し（空の場合は`Constant[nil]`）、`Prism::AliasMethodNode`/`Prism::AliasGlobalVariableNode`/`Prism::UndefNode`を`Constant[nil]`として扱います。
  - 変数代入は単一の`type_of_assignment_write`ハンドラーを共有し、すべての`*WriteNode`（constant／instance／class／global／local、加えて`*OperatorWriteNode`・`*OrWriteNode`・`*AndWriteNode`・`IndexOperatorWriteNode`/`IndexOrWriteNode`/`IndexAndWriteNode`・`MultiWriteNode`の各種）を`.value`右辺値の型として型付けします。
  - 「認識するがまだ絞り込まない」位置は静かに`Dynamic[Top]`として型付けされます（フォールバックイベントなし）。すなわち`Prism::SelfNode`・読み込み側の`*VariableReadNode`ファミリー・`Prism::BlockNode`・`Prism::ForwardingSuperNode`、加えて純粋な非値位置（`ArgumentsNode`・`ParametersNode`とすべての引数サブ種別・`BlockParametersNode`・`BlockArgumentNode`・`AssocNode`・`AssocSplatNode`・`SplatNode`・`LocalVariableTargetNode`・`EmbeddedVariableNode`・`ImplicitRestNode`・`ForwardingParameterNode`・`NoKeywordsParameterNode`）です。
- `rigor type-scan lib`でのカバレッジ向上: 定数畳み込みスタブ後の48.0%認識されないから**26.1%**まで下がりました。残る認識されない量は、Slice 3の制御フローノード（`IfNode`・`UnlessNode`・`WhenNode`・`ElseNode`・`CaseNode`・`AndNode`・`OrNode`・`BeginNode`・`RescueNode`・`ReturnNode`・`BreakNode`・`NextNode`・`YieldNode`）と、Slice 4のRBSバックディスパッチャーを待つユーザー定義の定数／呼び出しが支配しています。

### Slice 3 — ローカル・結合・文

Slice 3は2つのフェーズで着地します。

**Phase 1（このスライスが最初に出荷）:**すべての制御フロー式は`ExpressionTyper`を介してレシーバスコープで型付けされ、このファミリーのいずれのノードクラスも認識されないままにはなりません。`IfNode`/`UnlessNode`の両分岐、`CaseNode`/`CaseMatchNode`のすべての`WhenNode`/`InNode`本体、および`BeginNode`の本体／rescueチェーン／else節は型付けされてunionされます。`AndNode`/`OrNode`はそのオペランドをunionします（真偽値ナローイングはまだ。それはSlice 6で着地します）。`RescueModifierNode`（`expr rescue fallback`）は同じunionです。`WhileNode`/`UntilNode`は`Constant[nil]`として型付けされます。`ReturnNode`/`BreakNode`/`NextNode`/`RetryNode`/`RedoNode`は`Bot`として型付けされ、unionの下できれいに吸収されるため、ジャンプする分岐は周囲の制御フローの値から静かに落とされます（`if c; return; else; 7; end`は正しく`Constant[7]`として型付けされます）。`YieldNode`/`SuperNode`/`ForNode`/`DefinedNode`/`MatchPredicateNode`/`MatchRequiredNode`/`MatchWriteNode`は、後のスライスがそのセマンティクスを追加するまで静かに`Dynamic[Top]`として型付けされます。`LambdaNode`/`RangeNode`/`RegularExpressionNode`/`InterpolatedRegularExpressionNode`はリテラルキャリアを`Nominal[Proc]`／静的な`Constant[Range]`または`Nominal[Range]`/`Nominal[Regexp]`として完成させます。`Rigor::Scope#join(other)`はPhase 2が用いる構造的unionジョインとして今出荷されます。これは束縛された名前を交差させ、各ペアを`Type::Combinator.union`を通じて実行します。

**Phase 2（このサブフェーズはこのコミットで出荷） — StatementEvaluator（ローカルが文をまたいで伝播）**。 `Rigor::Inference::StatementEvaluator#evaluate(node) -> [Rigor::Type, Rigor::Scope]`を導入し、`Scope#join`をすべての文レベル構成に通すため、ある分岐で束縛されたローカルがマージ点後にunionされた束縛へ流れます。このクラスは（依然として純粋な）`Scope#type_of`のRuby側補完です。すなわちすべての公開呼び出しは、レシーバスコープを変更せずに新鮮な`[type, scope']`ペアを返します。追加または拡張されたコンポーネント:

1. `Rigor::Inference::StatementEvaluator`が新しいエントリポイントです。構築は入口の`scope:`に加えてオプショナルな`tracer:`を取ります。`evaluate(node)`はフローズンな`HANDLERS = { Prism::*Node => :handler_method }`テーブルでディスパッチし、カタログが特殊化しないノードについては`[scope.type_of(node, tracer:), scope]`にフォールバックします（したがって認識されない文的ノードはMUST NOTraiseしません — Slice 1のフェイルソフトポリシーは文レベルでも維持されます）。
2. Slice 3 phase 2のカタログは、`StatementsNode`/`ProgramNode`（逐次スレッディング）・`LocalVariableWriteNode`（`Scope#with_local`を介して右辺値の型を束縛）・`IfNode`/`UnlessNode`/`ElseNode`（述語、それから分岐＋マージ）・`CaseNode`/`CaseMatchNode`/`WhenNode`/`InNode`（N項分岐＋マージ）・`BeginNode`/`RescueNode`/`EnsureNode`（本体＋rescueチェーン＋結合された出口スコープに重ねられたensure）・`WhileNode`/`UntilNode`（条件＋本体、後置スコープは0回反復とN回反復をジョイン）・`AndNode`/`OrNode`（LHSは常に実行、RHSはときどき実行。結果はunion、後置スコープはnil注入付きジョイン）・`ParenthesesNode`（内側式を通じてスコープをスレッドし、`(x = 1; x + 2)`が`x`を束縛して`Constant[3]`を生成）です。
3. 分岐マージ実装は、`Scope#join`に委ねる前に半束縛の名前について`Constant[nil]`を注入します。これは`Scope#join`が「文レベル評価器の責任」として文書化する契約を満たします。すなわち`if cond; x = 1; end; x`は今や`Constant[1] | Constant[nil]`として型付けされ、`case kind; when 1 then x = 1; when 2 then x = 2; y = 9; end`は`x: Constant[1] | Constant[2] | Constant[nil]`、`y: Constant[9] | Constant[nil]`として型付けされます。N項マージは繰り返しのペアごとのnil注入付きジョインで還元されます。還元順序は結果に影響しません。
4. `Rigor::Scope#evaluate(node, tracer: nil)`は、呼び出し元が自分で`StatementEvaluator`をインスタンス化しなくて済むよう、公開デリゲートとして出荷されます。レシーバスコープは入口スコープとして扱われます。戻り値は評価器が生成するのと同じ`[type, scope']`ペアです。

具体的な向上: `x = 1; y = x + 2; y`は今や`Constant[3]`として型付けされ、後置スコープでは`x: Constant[1]`・`y: Constant[3]`になります（定数畳み込みは束縛されたローカルを通じて流れます）。`xs = [1, 2, 3]; xs.first`は`Constant[1] | Constant[2] | Constant[3]`として型付けされます（Slice 5 phase 1のディスパッチ経路は束縛されたローカルを通じて解決します）。`h = {a: 1, b: 2}; h.fetch(:a)`は`Constant[1] | Constant[2]`として型付けされます。

境界: Slice 3 phase 2は任意の式内部を通じてスコープをスレッドし**ません**（`foo(x = 1)`と`[1, x = 2]`は依然として後置スコープから`x`を落とします）。意図的なPhase 2の簡略化は、後のスライスがカタログを成長させる間、StatementEvaluatorの表層を安定に保ちます。DefNode対応スコープビルダー（後述）は、メソッド本体が自身の引数を見るよう、先に言及した2つ目の境界を持ち上げます。

**CLI統合（このコミットも出荷）:** CLIコマンド`rigor type-of`と`rigor type-scan`は今や、新しい`Rigor::Inference::ScopeIndexer.index(root, default_scope:)`ヘルパーを通じて間接的に`Scope#evaluate`を消費します。インデクサーは新鮮な`StatementEvaluator`に`on_enter:`コールバックを配線し、プログラムを1度歩き、ルックアップが各ノードで見える入口スコープを生成する同一性比較の`Hash{Prism::Node => Rigor::Scope}`を返します — 評価器が訪れない式内部の子に親のスコープを伝播します。CLIコマンドはそれからプローブごとに`index[node].type_of(node, tracer:)`を実行し、ファイル内で先に束縛されたローカルが、後のノードを型付けするのに使われるスコープへ流れます。インデクサーは内部評価器をトレーサーフリーで実行します。CLI呼び出し元はインデックス後の`type_of`プローブにのみトレーサーを取り付け、二重記録されるフォールバックイベントを回避します。

追加:

5. `Rigor::Inference::StatementEvaluator#initialize(on_enter:)`キーワード（デフォルトは`nil`）。非`nil`のとき、callableは`(node, scope)`とともにすべての`evaluate(node)`呼び出しの開始時に1度呼び出され、すべての再帰的`sub_eval`を通じてスレッドされます。契約は[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)の「文レベル評価」で束縛されます。
6. `Rigor::Inference::ScopeIndexer`モジュールに、訪れていない式内部ノードのスコープエントリを埋める`index`ファクトリと`propagate` DFSウォーカーを持ちます。
7. `Rigor::CLI::TypeOfCommand`と`Rigor::Inference::CoverageScanner#scan`は、ノードごとの`type_of`呼び出しをインデクサーのルックアップを通じてルーティングします。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `x = 1; y = x + 2; y`を3行目1列（`y`の読み込み）で型付けすると`Constant[3]`を返します。2行目5列（右辺値内の`x`の読み込み）で型付けすると`Constant[1]`を返します。統合前は両プローブが`Dynamic[Top]`を返しました。
- `xs = [1, 2, 3]; result = xs.first; result`を3行目で型付けすると`Constant[1] | Constant[2] | Constant[3]`を返します（Tuple対応ディスパッチが束縛されたローカルを通じて流れます）。統合前は、`xs`が見えなかったため`result`プローブが`Dynamic[Top]`を返しました。

`type-scan lib`カバレッジは13.71%から13.70%認識されないへ移動します — ノイズの範囲内です。lib/はユーザー定義の`ConstantReadNode`/`ConstantPathNode`参照、ユーザー型レシーバ（そのRBSは登録されていない）に対する`CallNode`、加えてローカルがメソッド引数（StatementEvaluatorは束縛しない）であるメソッド本体が支配しています。統合の価値はトップレベルローカル変数パターンを持つコードで実在し測定可能です。ドッグフードサンプルlib/はそのパターンを頻繁に行使しません。上記のCLI挙動向上が観測可能な証明です。

**DefNode対応スコープビルダー（このコミットも出荷）:** StatementEvaluatorのカタログは現在`Prism::ClassNode`・`Prism::ModuleNode`・`Prism::SingletonClassNode`・`Prism::DefNode`を含みます。クラス／モジュール本体とメソッド本体は*新鮮な*スコープ下で評価され（Rubyのクラススコープとメソッドスコープは外側のローカルを見ません）、評価器は`ClassFrame.new(name:, singleton:)`フレームの小さな`class_context:`スタックをスレッドし、ネストされた`def`がそのレキシカルなオーナーを知るようにします。新しい`Rigor::Inference::MethodParameterBinder.new(environment:, class_path:, singleton:).bind(def_node)`はdefの引数リストを`name -> Rigor::Type`マップに翻訳し、すべての名前をデフォルトで`Dynamic[Top]`にし、利用可能な場合は周囲のクラスのRBSシグネチャからオーバーライドします。引数型は、マッチするスロットを持つすべてのオーバーロードにわたってunionされます（したがって並列の`()`オーバーロードがそれを省略しても、`Array#first(n)`の`(int)`オーバーロードは依然として`n`を束縛します）。位置スロットは位置でマッチされ、キーワードスロットはrequiredとoptional両方のキーワードマップにわたって名前でマッチされます。`*rest`と`**kw_rest`は`Array[T]`と`Hash[Symbol, V]`としてラップされます。`def self.foo`と`class << self`内の`def foo`は両方とも`RbsLoader#singleton_method`を通じてルーティングされます。追加または拡張されたコンポーネント:
8. `Rigor::Inference::MethodParameterBinder`は「defの引数リストを束縛マップに翻訳する」ための新しい公開表層です。その契約は[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)の「メソッドパラメーター束縛」で束縛されます。
9. `Rigor::Inference::StatementEvaluator`は今や`eval_def`・`eval_class_or_module`・`eval_singleton_class`ハンドラーを定義し、すべての`sub_eval`を通じて`class_context:`スタックをスレッドします。フレームの修飾名は`Prism::ClassNode#constant_path`からレンダリングされるため、`class A::B; class C`は`"A::B::C"`の`class_path`を生成し、`class << self`は最内フレームをシングルトンモードにフリップします。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `class Integer; def divmod(other); other; end; end`は今や本体内の`other`読み込みを`Float | Integer | Numeric | Rational`として型付けします（`Integer#divmod`の4つのRBSオーバーロードにわたるunion）。バインダー前は読み込みが`Dynamic[Top]`を返しました。
- `class Foo; def bar(x); x; end; end`（`Foo`はRBSに知られていない）は`x`を`Dynamic[Top]`として型付けし、raiseしません — バインダーのフェイルソフト契約が成立します。
- `def add(a, b); a + b; end`をトップレベル（クラスコンテキストなし）で実行すると、`a`と`b`の両方が`Dynamic[Top]`として型付けされます — バインダーは囲みクラスを必要とするためRBSルックアップは試みられません。

`type-scan lib`カバレッジは13.71%から**13.45%**認識されないへ移動します。`Prism::CallNode`は35.9%→**34.7%**。改善は、RBS既知のメソッドを実際にオーバーライドする（引数が今や型情報を運ぶ）クラスに集中しており、ほとんどのlib/rigorメソッドがRigorがまだRBSを書いていないクラスに属するという事実によって上限が決まります。`type-scan spec`は同じクエリで31.4%から**30.98%**認識されないへ移動します。

元々予期されたSlice 3境界自身でのカバレッジ向上はすでにPhase 1で実現されました（26.1%→22.3%認識されない）。Slice 4／Slice 5 phase 1後の認識されない量（13.5%）は、ユーザー定義の`ConstantReadNode`/`ConstantPathNode`参照とユーザー型レシーバに対する`CallNode`が支配しています。両方とも、ローカル変数伝播ではなく、後のRBSロードとプロジェクト対応の作業を待ちます。

### Slice 4 — メソッドディスパッチ（RBSバック）

Slice 2の定数畳み込みルールブックの背後にRBSバックのディスパッチティアを重ねます。Slice 4は2つのフェーズで着地します。

**Phase 1（このスライスが最初に出荷）:**エンジンはレシーバクラスメソッドディスパッチと定数名解決のためにRBS*コア*シグネチャを参照します。引数駆動のオーバーロード選択・ジェネリクスのインスタンス化・交差型・インターフェイス型・stdlib/gemのRBSロードはPhase 2に委ねられます。各メソッドの最初のオーバーロードが勝ち、これだけで`Integer#succ`・`Integer#to_s`・`String#upcase`・`Array#length`・`1.zero?`、および「メソッドが既知のクラスに存在し、戻り値型が単一の具象クラスインスタンス」のロングテールをカバーします。

追加:

- `Rigor::Environment::RbsLoader`は`RBS::EnvironmentLoader.new`（コアのみ）と遅延構築される`RBS::DefinitionBuilder`をラップします。デフォルトのローダーはフローズン・プロセス共有のシングルトンで、クラスごとの単調な定義キャッシュを持ちます。重い`RBS::Environment`は最初のメソッド／クラスクエリで構築されるため、RBSに当たらないテスト実行は起動コストを払いません。
- `Rigor::Inference::RbsTypeTranslator`はハッシュベースのディスパッチテーブルを通じて`RBS::Types::*`を`Rigor::Type`に翻訳します。ジェネリクス引数は落とされ（`Array[Integer]` → `Nominal[Array]`）、`Optional[T]`は`Union[T, Constant[nil]]`になり、`bool`は`Union[Constant[true], Constant[false]]`になり、`self`/`instance`は提供されたとき`self_type:`キーワードを置換し（レシーバクラス）、それ以外は`Dynamic[Top]`に劣化します。`Alias`・`Intersection`・`Variable`・`Interface`は`Dynamic[Top]`に劣化します。
- `Rigor::Inference::MethodDispatcher::RbsDispatch`は`(receiver, method_name)`をRBSインスタンスメソッドに解決します。レシーバクラス名は`Constant`（`value.class.name`を介して）・`Nominal`（`class_name`）・`Dynamic`（`static_facet`へ再帰）から導出されます。`Top`・`Bot`・他のレシーバは`nil`を返します。`Union`レシーバは各メンバーを順次ディスパッチします — すべてのメンバーが解決すると結果はunionされます。任意のメンバーがミスしたら、ディスパッチ全体が`nil`を返します。
- `MethodDispatcher.dispatch`は`environment:`キーワードを受け付け、`ConstantFolding` → `RbsDispatch`をチェーンします。定数畳み込みは適用可能なときも依然として勝つため、`1 + 2`は`Constant[3]`の精度を保ちます。畳み込み器が証明できない呼び出しのみがRBSへフォールスルーします。
- `Rigor::Environment#nominal_for_name(name)`はまず静的クラスレジストリを参照し、次に`RbsLoader#class_known?`に尋ね、名前のために`Nominal`を合成します。`ExpressionTyper#type_of_constant_read`と`type_of_constant_path`はこの組み合わせルックアップを使うため、`Encoding::Converter`や他のRBS専用コア定数はハードコードレジストリを膨らませずに解決されます。
- `ExpressionTyper#call_type_for`はディスパッチャー後に*Dynamic起源伝播*ティアを追加します。すなわちレシーバが`Dynamic[T]`で正の規則がどれも解決しなかったとき、結果はフォールバックトレーサーを発火させずに静かに`Dynamic[Top]`へ劣化します。これは認識されたセマンティック結果（Dynamicが感染する）であり、フェイルソフト的妥協ではありません。[`inference-engine.md`](../../internal-spec/inference-engine/)の*メソッドディスパッチ境界*に文書化されています。

`rigor type-scan lib`でのカバレッジ向上: Slice 3 phase 1後の22.3%認識されないからSlice 4 phase 1後の**15.1%**まで下がりました。`CallNode`認識されない率は82.8%から38.5%に下がります。残る認識されない量は、ユーザー定義の`ConstantReadNode`/`ConstantPathNode`（Rigor自身の`Rigor::*`型はコアRBSにありません）と、`Nominal[<user type>]`レシーバに対する`CallNode`が支配しています。Slice 4 phase 2（プロジェクトRBSロードとstdlib登録）とSlice 5（ジェネリクス・オーバーロード・シェイプ推論）が両方のバケットを削っていきます。

**Phase 2（サブフェーズに分割、それぞれ独立して出荷）:**

- **Phase 2a — プロジェクト＋stdlib RBSロード**。 `Rigor::Environment::RbsLoader#initialize`は`libraries:`（`"pathname"`/`"json"`のようなstdlibライブラリ名の配列）と`signature_paths:`（ユーザーの`.rbs`ファイルを含むディレクトリの配列）を受け付けます。デフォルトのローダー（`RbsLoader.default`）はコアのみのままなので高速経路は変わりませんが、新しい`Rigor::Environment.for_project(root:, libraries:, signature_paths:)`ファクトリは`<root>/sig`を自動検出して任意のstdlibオプトインをロードするEnvironmentを構築します。未知のstdlib名は`RBS::EnvironmentLoader#has_library?`を介してフェイルソフトします（古い`.rigor.yml`はMUST NOT解析器をクラッシュさせません）。存在しないシグネチャパスは静かにフィルタされます。CLI `type-of`と`type-scan`コマンドは今や`Environment.for_project`を通じてスコープを構築するため、プロジェクトに対するプローブとスキャンは明示的な設定なしにローカルの`sig/`ツリーを拾います。`rigor type-scan lib`でのカバレッジ向上: 14.9%→14.4%（小さなデルタは、Rigor自身の`sig/rigor.rbs`がまだスタブであることを反映します。インフラはsigが成長する準備ができました）。残る支配的な量 — ユーザー型レシーバに対する`Prism::CallNode` — は移動するためにPhase 2bがクラスメソッドディスパッチを着地させる必要があります。
- **Phase 2b — クラスメソッド（シングルトンスコープ）ディスパッチ（このサブフェーズはこのコミットで出荷）**。その住人が`Foo`のインスタンスではなく*クラスオブジェクト*`Foo`自体であるシングルトンクラス型キャリア`Rigor::Type::Singleton[name]`を追加します。`Singleton[Foo]`と`Nominal[Foo]`は`class_name`を共有しますが構造的に区別されて比較されるため、型モデルは今や2つの値をきれいに区別します。配線は5か所で着地します:
    1. `Rigor::Type::Combinator.singleton_of(class_or_name)`は、既存の`nominal_of`と並ぶ公開構築ヘルパーです。
    2. `Rigor::Environment::RbsLoader#singleton_definition(class_name)`と`#singleton_method(class_name:, method_name:)`は、`RBS::DefinitionBuilder#build_singleton`を介して構築されたRBSシングルトンクラス定義をキャッシュします。それらはインスタンス側ヘルパーと名前空間が互いに素です — 例えば`Module#instance_methods`はシングルトン側で解決され、Rubyの実行時セマンティクスと一致してインスタンス側では静かに不在です。
    3. `Rigor::Inference::RbsTypeTranslator.translate`は`instance_type:`キーワードを受け付けます。`Bases::Self`は`self_type:`を置換します（クラスメソッド本体では`Singleton[C]`、インスタンスメソッド本体では`Nominal[C]`）。`Bases::Instance`は常にマッチする`Nominal[C]`を置換します。`singleton(::Foo)`自体は`Nominal[Class]`に劣化するのではなく、直接`Singleton[Foo]`に翻訳されます。
    4. `Rigor::Inference::MethodDispatcher::RbsDispatch`は`Singleton`レシーバを検出し、`instance_method`の代わりに`singleton_method`を通じてルーティングし、適切な`self_type`/`instance_type`ペアを翻訳器に渡すよう学習します。Unionレシーバはメンバーごとのディスパッチを続けます。1つのunion内でインスタンスとシングルトンのメンバーを混ぜることは自動的にサポートされます。
    5. `Rigor::Environment#singleton_for_name`は`nominal_for_name`をミラーリングし、定数のためのキャリアを生成します。`ExpressionTyper#type_of_constant_read`と`type_of_constant_path`は今やそれを使うため、式`Integer`は`Singleton[Integer]`として型付けされ、`Integer.sqrt(4)`は正しくシングルトンメソッドティアを通じて`Nominal[Integer]`に解決されます。`Foo.new`は登録されたクラスについて`Class#new`を通じて解決されます。既知のクラスでの認識されないクラスメソッドは依然として`Dynamic[Top]`にフォールバックし、フォールバックイベントを発出します。`rigor type-scan lib`でのカバレッジ向上: 14.4%→**13.9%**認識されない。以前は誤った「クラスオブジェクトに対するインスタンスルックアップ」呼び出しが今や正しく答えられるようになり、`CallNode`認識されない率は38.5%から36.7%に下がります。
- **Phase 2c — 引数型付きオーバーロード選択（このサブフェーズはこのコミットで出荷）**。すべての具象型に`Rigor::Type#accepts(other, mode:)`を追加し、`Rigor::Type::AcceptsResult`値オブジェクト（Trinary＋mode＋reasons）を返し、それをRBSバックのディスパッチャーに通すことで、同じメソッドの異なるオーバーロードを呼び出し元の実際の引数型に基づいて選択できるようにします。追加されたコンポーネント:
    1. `Rigor::Type::AcceptsResult`は将来の`SubtypeResult`の双対です。3値の答え・境界`mode`（`:gradual`が現在出荷、`:strict`は予約）・順序付きでフローズンな`reasons`配列を運びます。述語`yes?`/`no?`/`maybe?`は運ばれたTrinaryに委ねられ、`with_reason`は1つの追加reasonが追加された不変コピーを生成します。
    2. 各具象`Rigor::Type`形式（`Top`・`Bot`・`Dynamic`・`Nominal`・`Singleton`・`Constant`・`Union`）は新しい`Rigor::Inference::Acceptance`モジュールに委ねる`accepts(other, mode: :gradual)`を得ます。共有モジュールはケース解析をホストするため、型インスタンスは（ADR-3に従って）薄いまま、[`internal-type-api.md`](../../internal-spec/internal-type-api/)の公開API契約を満たします。
    3. 受理代数。Topはすべてを受理します。BotはBotのみを受理します。グラデュアルモードのDynamic[T]はすべての具象型を受理します（どちらの側のDynamicも短絡してyesになります）。Nominal[C]は、`Object.const_get`を介したRubyの実際のクラス階層を使い、D <= C / v.is_a?（klass（C））のときNominal[D]/Constant[v]を受理します（クラスがロードできないとき`maybe`を生成）。Singleton[C]はサブクラスの別のシングルトンのみを受理します。Constant[v]は構造的に等しいConstant[v']のみを受理します。Unionはメンバーごとに、両側で自然なOR/ANDを使ってディスパッチします。
    4. `Rigor::Inference::MethodDispatcher::OverloadSelector`は`RBS::Definition::Method`に加えて実際の`arg_types`を消費し、メソッドタイプを位置アリティ（required・optional・rest・trailing）でフィルタし、required keywordsがキーワードレス呼び出し形状で満たせないオーバーロードをスキップし、それから`accepts`からすべての（param, arg）ペアが`yes`または`maybe`を返す最初のオーバーロードを選びます。どのオーバーロードもマッチしないとき、phase 1/2bからのフェイルソフト契約を保つためにセレクタは`method_types.first`にフォールバックします。
    5. `RbsDispatch.dispatch_one`は常に`method_types.first`を取るのではなくセレクタを参照し、選ばれたオーバーロードの戻り値型を`RbsTypeTranslator.translate(... self_type:, instance_type:)`を通じてスレッドします。
    具体的な向上: `[1, 2, 3].first`（引数なし）と`[1, 2, 3].first(2)`（1つのInteger引数）は今や異なる型を返します（`Dynamic[Top]`対`Nominal[Array]`）。phase 2bは両方に対して最初のオーバーロードの`Elem`を返していました。`Array.new(3)`と引数クラスがミスマッチした`Integer#+`（例えば`1 + 1.5`、定数畳み込みは助けにならない）も同様に正しいRBSオーバーロードを選択します。`rigor type-scan lib`でのカバレッジ: 13.9%→**13.6%**認識されない。`Prism::CallNode`は36.7%→35.8%。翻訳器の`Bases::Class`劣化経路が今や残る支配的な`CallNode`フォールバックソースです — その作業はPhase 2dで進みます。
- **Phase 2d — ジェネリクスのインスタンス化（このサブフェーズはこのコミットで出荷）**。 `Rigor::Type::Nominal`に型引数を運び、それをエンジンのすべての層に通すため、`Array[Integer]#first`は`Elem`を置換して`Dynamic[Top]`に劣化するのではなく`Integer`を返します。追加または拡張されたコンポーネント:
    1. `Rigor::Type::Nominal`は今や順序付き・フローズンな`type_args`配列を運びます。空配列は「素」形式（`Nominal["Array"]`）です。空でない配列は適用済みジェネリック（`Nominal["Array", [Nominal["Integer"]]]`）を表します。構造的等価性と`hash`は`type_args`を参照します。`describe`/`erase_to_rbs`は引数を`Array[Integer]`としてレンダリングします。同じクラスの2つの素キャリアと適用済みキャリアは異なる値です。したがって格子は静かに一方を他方に強制しません。
    2. `Rigor::Type::Combinator.nominal_of(class_or_name, type_args: [])`は公開構築ヘルパーです。キーワードはまだジェネリクスを運ばない呼び出し元から邪魔にならないままです。
    3. `Rigor::Inference::Acceptance.accepts_nominal`は`type_args`に対して要素ごとに再帰します（共変。宣言された分散はSlice 5以降で着地）。どちらかの側が素のとき、ヘルパーは寛容に短絡します — 素のselfは任意のインスタンス化を受理（`yes`）、適用済みself上の素のotherは`maybe`を生成 — そのためまだジェネリクスを学んでいないphase-2c呼び出し位置は動作し続けます。アリティ不一致は`no`に縮退します。
    4. `Rigor::Inference::RbsTypeTranslator.translate(..., type_vars: {})`はRBS変数の`name`シンボルでキー付けされた置換マップを受け付けます。`RBS::Types::Variable`はマップを参照し、存在するとき束縛された`Rigor::Type`を返します。束縛されていない変数は`Dynamic[Top]`に劣化するため、インスタンス化されていないジェネリクスはフェイルソフトな挙動を保ちます。`RBS::Types::ClassInstance`は今や`args`を再帰的に翻訳するため、`Array[Integer]`は`Nominal["Array", [Nominal["Integer"]]]`にラウンドトリップし、ネストされたジェネリクスは無傷のままです。
    5. `Rigor::Environment::RbsLoader#class_type_param_names(class_name)`はクラスの宣言された型パラメーターシンボルを返します（`Array`について`[:Elem]`、`Hash`について`[:K, :V]`）。`Array.new`のようなシングルトンメソッドが同じ`Elem`でパラメーター化されるため、インスタンス定義から読みます。
    6. `Rigor::Inference::MethodDispatcher::RbsDispatch`はレシーバの`type_args`をクラスの`type_param_names`に対してジップして置換マップを構築し、それからそのマップを`OverloadSelector.select(..., type_vars:)`と最終的な`RbsTypeTranslator.translate(..., type_vars:)`の両方を通じてスレッドします。アリティ不一致と素のレシーバはマップを空にしておくため、自由変数は以前と同じように劣化します。
    7. `Rigor::Inference::ExpressionTyper#array_type_for`は今やリテラルの要素型のunionから`Nominal[Array, [Element]]`を構築します。`type_of_hash`はKとVの両方で同じことをします。空リテラルは、解析器が持っていない`Bot`の証拠を製造するのを避けるため、素のままです。
    具体的な向上: `[1, 2, 3].first`は`Dynamic[Top]`の代わりに`Constant[1] | Constant[2] | Constant[3]`（リテラルの要素のunion）に解決されます。`[1, 2, 3].first(2)`は`Array[Constant[1] | Constant[2] | Constant[3]]`を返します。`{a: 1, b: 2}.fetch(:a)`は`Constant[1] | Constant[2]`を返します。`rigor type-scan lib`でのカバレッジ: 13.6%→**13.4%**認識されない。`Prism::CallNode`は35.8%→35.3%。利得は解決された呼び出しの数ではなく解決された呼び出しの*精度*にあるため、向上は2cのものより小さいです — 残余の`CallNode`量は今やユーザー定義のレシーバ（`Rigor::*`型）と、引数型自体がDynamicである呼び出し位置が支配しています。

4つすべてのサブフェーズはフェイルソフトな`Dynamic[Top]`ポリシーを無傷に保つため、部分的な移行はエンジン表層を決して破りません。

### Slice 5 — シェイプ推論

Slice 5は2つのフェーズで着地します。ロードマップは元々`Tuple`・`HashShape`・`Record`を一緒にまとめていました。Slice 5 phase 1のコミットは2つのリテラル駆動キャリア（`Tuple`・`HashShape`）を出荷し、`Record`（推論された*オブジェクト*シェイプ、[`structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)を参照）はオブジェクトシェイプの証拠がリテラル駆動ではなく能力役割推論と並んで着地するため、phase 2に委ねます。

**Phase 1（このサブフェーズはこのコミットで出荷） — Tuple＋HashShapeキャリアとリテラルアップグレード**。追加されたコンポーネント:

1. `Rigor::Type::Tuple`は`Rigor::Type`要素値の順序付き・フローズン配列を運びます。住人は、長さが`elements.size`と一致し、位置`i`の要素が`elements[i]`に住むRubyの`Array`インスタンスです。`describe`/`erase_to_rbs`は`[A, B, C]`をレンダリングします。等価性と`hash`は`elements`に対して構造的です。`array_type_for`が（アリティを固定する要素の証拠がないため）`[]`を素の`Nominal[Array]`として保つにもかかわらず、空のTuple `Tuple[]`は有効な値オブジェクトです。
2. `Rigor::Type::HashShape`は順序付き・フローズンな`(Symbol|String) -> Rigor::Type`マップに加えて、required key・optional key・read-only・open/closed extra-keyポリシー（[`rigor-extensions.md`](../../type-specification/rigor-extensions/)のRigor拡張）を運びます。`describe`は必須symbolキーについて`{ a: T }`、optionalキーについて`{ ?b: T }`、stringキーについて`{ "k": T }`をレンダリングし、openシェイプには`...`を追加します。厳密にclosedなsymbolキー付きシェイプはRBSレコード構文（`{}`とoptionalフィールドを含む）に消去されます。stringキー付きシェイプは`Hash[K, V]`に劣化し、型付きextra境界のないopenシェイプは`Hash[top, top]`に劣化します。等価性はエントリについてRubyの`Hash#==`に従い、ポリシーフィールドを含みます。
3. `Rigor::Type::Combinator.tuple_of(*elements)`と`Combinator.hash_shape_of(pairs, **options)`は公開ファクトリです。`tuple_of()`は空のTupleを生成します。`hash_shape_of({})`は空のclosed HashShapeを生成します。
4. `Rigor::Inference::Acceptance`は2つの新しい経路を学習します。`Tuple[A1..An].accepts(Tuple[B1..Bn])`はアリティチェック後に共変な要素ごとの比較を行います。`Tuple`でない`other`は、解析器がジェネリックnominal単独からアリティを証明できないため拒否されます。`HashShape{k: T,...}.accepts(HashShape{...})`は共有キーで深さ共変であり、ターゲットのすべてのrequiredキーがソースでrequiredであることを要求し、不在のoptionalキーを許し、ターゲットがclosedのときextra/openソースを拒否します。逆経路 — `Nominal[Array, [E]].accepts(Tuple[*])`と`Nominal[Hash, [K, V]].accepts(HashShape{...})` — はシェイプを基底のnominalに射影し、既存のジェネリック受理パイプラインに再入します。
5. `Rigor::Inference::RbsTypeTranslator.translate_tuple`と`translate_record`は、`RBS::Types::Tuple`と`RBS::Types::Record`を（phase 2dのように`Nominal[Array]` / `Nominal[Hash]`に消去するのではなく）新しいシェイプキャリアにマップします。要素／値型は呼び出し元の`self_type`/`instance_type`/`type_vars`コンテキスト下で再帰的に翻訳されるため、tuples/records内のジェネリクスが保たれます。RBSレコードのoptionalフィールドはoptional `HashShape`キーにマップされ、レコードはclosedです。
6. `Rigor::Inference::MethodDispatcher::RbsDispatch.receiver_descriptor`はシェイプを運ぶレシーバを基底のnominalに射影し、既存のジェネリック型付きディスパッチパイプラインが重複なく再利用できるようにします。すなわち`Tuple[Integer, String]`は`Array[Integer | String]`としてディスパッチされ、`HashShape{a: Integer}`は`Hash[Symbol, Integer]`としてディスパッチされます。Tuple対応の精緻化（例: 精密なメンバーを返す`tuple[0]`、分解代入）はphase 2に委ねられます。それらは`RbsDispatch`の上のより高優先度のディスパッチティアとして実行されます。
7. `Rigor::Inference::ExpressionTyper#array_type_for`は、すべての要素が非splat値である空でない配列リテラルを`Tuple`にアップグレードします。splatを含むリテラルは、`[*xs, 1]`が依然として推論可能な要素型を生成するよう、Slice 4 phase 2dの`Nominal[Array, [union]]`経路を保ちます。`type_of_hash`は、すべてのエントリがキーが静的な`SymbolNode`または`StringNode`リテラルである`AssocNode`であるハッシュリテラルを`HashShape`にアップグレードします。動的キー・ダブルsplat・重複キーを持つエントリは、ジェネリックな`Hash[K, V]`形式にフォールスルーします。

具体的な向上: `[1, 2, 3]`は`Tuple[Constant[1], Constant[2], Constant[3]]`として型付けされます（以前は`Nominal[Array, [Constant[1] | Constant[2] | Constant[3]]]`）。`{ a: 1, b: 2 }`は`HashShape{a: Constant[1], b: Constant[2]}`として型付けされます（以前は`Nominal[Hash, [Symbol-union, Integer-union]]`）。キャリアを通じたメソッドディスパッチは射影を介して同じ戻り値型精度を保ちます。すなわち`[1, 2, 3].first(2)`は依然として`Array[Constant[1] | Constant[2] | Constant[3]]`に解決され、`{ a: 1 }.fetch(:a)`は依然として値のunionにVを置換します。`rigor type-scan lib`でのカバレッジ: 13.4%→**13.5%**認識されない。小さなぐらつきは精度のリグレッションではなく、新しいlibファイル（Tuple/HashShapeキャリア）が独自の定数参照を寄与していることを反映しています。

**Phase 2はサブフェーズで着地**。 phase 1で出荷されたキャリアと射影ベースのディスパッチは、漸進的な精度向上の余地を残します。

**Phase 2 sub-phase 1（このサブフェーズはこのコミットで出荷） — シェイプ対応要素ディスパッチ**。 `ConstantFolding`と`RbsDispatch`の間に挿入される新しいティアである`Rigor::Inference::MethodDispatcher::ShapeDispatch`を追加します。契約は[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)の「メソッドディスパッチ境界」で束縛されます。ティアは、`Tuple`と`HashShape`の要素アクセスメソッドを射影された`Array#[]`/`Hash#fetch`の答えではなく位置ごと／キーごとの精密な型に解決します。追加されたコンポーネント:

1. `ShapeDispatch.try_dispatch(receiver:, method_name:, args:)`は精密な要素／値型を返すか、次のティアに委ねるために`nil`を返します。認識されるTupleカタログは`first`/`last`/`size`/`length`/`count`（無引数）に加えて単一の`Constant[Integer]`引数を伴う`[]`/`fetch`です。認識されるHashShapeカタログは`size`/`length`（無引数）に加えて単一の`Constant[Symbol|String]`引数を伴う`[]`/`fetch`/`dig`です。範囲外インデックス・キー欠落の`fetch`・複数引数`dig`・非静的キーは`RbsDispatch`に委ねられ、射影の答えが適用され続けます。
2. `MethodDispatcher.dispatch`は新しいティアを`RbsDispatch`の上にスレッドします。phase 1の射影は依然としてミス時に適用されます。すなわち`tuple.map`・`shape.transform_values`・他の反復呼び出しは以前の挙動を保ちます。
3. 負のタプルインデックスは長さで正規化されます（`tuple[-1]`は最後の要素を返します）。キー欠落の解決はRubyのセマンティクスをミラーします。すなわち`shape[:missing]`と`shape.dig(:missing)`は`Constant[nil]`に解決され、`shape.fetch(:missing)`は実行時に`KeyError`をraiseするため委ねます。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `[1, 2, 3].first`は`Constant[1]`として型付けされます（以前は`Constant[1] | Constant[2] | Constant[3]`）。
- `[1, 2, 3][-1]`は`Constant[3]`として型付けされます。`[1, 2, 3].size`は`Constant[3]`として型付けされます。
- `{ name: "Alice", age: 30 }[:name]`は`Constant["Alice"]`として型付けされます（以前は射影された値のunion）。
- `{ a: 1 }[:missing]`は`Constant[nil]`として型付けされます。`{ a: 1 }.fetch(:missing)`は射影の答えを保ちます。

`rigor type-scan lib`でのカバレッジ: 13.8%→**13.6%**認識されない。`Prism::CallNode`は35.7%→35.1%。利得はタプルとハッシュシェイプをローカルで構築するコードに集中しています。ユーザー型レシーバ（Rigor自身の`Rigor::*`型）はさらなるカバレッジのためにRBSオーサリングを依然として待ちます。Slice 4 phase 2c/dで以前記録された向上引用（`[1, 2, 3].first`をunionとして、`{ a: 1, b: 2 }.fetch(:a)`を値のunionとして）はそのスライスのコミット時の挙動を反映し、ここで置き換えられます。すなわちそれらの式は今や`ShapeDispatch`を通じて精密な最初のメンバー／値に解決されます。

**Phase 2 sub-phase 2（このサブフェーズはこのコミットで出荷） — 分解代入・複数引数`dig`・`Hash#values_at`**。追加されたコンポーネント:

1. `Rigor::Inference::MultiTargetBinder`は、Prism多重ターゲットツリー（`MultiWriteNode`または`MultiTargetNode`）に対して`Rigor::Type`値を分解し、`name -> Rigor::Type`束縛マップを返す純粋なモジュールです。タプル形状の右辺は要素ごとに射影します。すなわち前方ターゲットはインデックスで要素を読み（欠落スロットは`Constant[nil]`で埋めます）、restターゲットは中間要素の`Tuple`に束縛され（ソースに余剰がないとき`Tuple[]`）、後方ターゲットは対応するオフセットでテール要素を読みます。Tupleでない右辺はすべてのスロットを`Dynamic[Top]`に束縛します。ネストされた`MultiTargetNode`ターゲットはスロットの型を新しい右辺としてリカースします。非ローカルターゲット（インスタンス／クラス／グローバル変数・定数・index/callターゲット・無名splat）は、ローカル変数スコープに観測可能な寄与がないため静かにスキップされます。バインダーは、sub-phase 2（文レベル分解）とSlice 6 phase C sub-phase 2（ブロック引数分解）の間で共有される標準表層であるため、bind規則はMUST一度書かれて二度消費されます。
2. `Rigor::Inference::StatementEvaluator`は、エントリスコープ下で右辺を一度評価し、バインダーの束縛を後置スコープに折り畳む`Prism::MultiWriteNode`ハンドラーを追加します。ペアの型はMUST右辺の型と等しくなります（Rubyの`(a, b = [1, 2]) #=> [1, 2]`セマンティクスと一致）。
3. `Rigor::Inference::MethodDispatcher::ShapeDispatch`は3つの精密なハンドラーを成長させます。すなわちTuple#`dig`（チェーン）・HashShape#`dig`（チェーン）・HashShape#`values_at`です。チェーンセマンティクスはMUST以下のとおりです。すなわち各ステップはそのキー／インデックスをルックアップし、それから`chain_dig`は解決された値を新しいレシーバとして続行します — Tuple/HashShapeメンバーは残りの引数でカタログに再ディスパッチし、`Constant[nil]`メンバーはチェーンを`Constant[nil]`に短絡し（Rubyの`Array#dig`と`Hash#dig`は実行時にnilで短絡）、他の任意の中間キャリアは委ねて射影の答えが適用されます。チェーンステップ*中*に発生する範囲外インデックスは、Rubyの`Array#dig`がraiseするのではなく範囲外インデックスについてnilを返すため、MUST`Constant[nil]`に解決されます。`values_at`は、位置ごとの値がキーごとの値（欠落キーについては`Constant[nil]`）である`Tuple`を返します。任意の引数が非静的のときカタログは委ねます。Range/start-length `[]`とRigor拡張のhash-shapeポリシーはsub-phase 3で着地します。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `pair = [10, 20]; a, b = pair; sum = a + b`は`sum`を`Constant[30]`として型付けします。束縛前は`a`と`b`が複数書き込みを越えて束縛されておらず、`sum`は`Dynamic[Top]`に縮退しました。
- `users = { addr: { zip: "00100" } }; users.dig(:addr, :zip)`は`Constant["00100"]`として型付けされます。束縛前はチェーンが射影された`Hash[Symbol, Hash[...]]`の答えを通じてステップしリテラル値を失いました。
- `{ a: 1, b: "two" }.values_at(:a, :b)`は`Tuple[Constant[1], Constant["two"]]`として型付けされます（以前は射影された`Array[Integer | String]`）。
- `a, *r, c = [1, 2, 3, 4]`は`a -> Constant[1]`・`r -> Tuple[Constant[2], Constant[3]]`・`c -> Constant[4]`を束縛します。

`Record`キャリア（推論されたオブジェクトシェイプ、[`structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)を参照）は後のスライスで能力役割推論と並んで着地します。リテラル駆動の`HashShape`はそれまでハッシュ側をカバーし続けます。

**Phase 2 sub-phase 3（このサブフェーズはこのコミットで出荷） — `[]`のRangeおよびstart-length形式、加えてRigor拡張のhash-shapeポリシー**。追加されたコンポーネント:

1. `ExpressionTyper#type_of_range`は今や整数端点の範囲リテラルを`Constant[Range]`として運び、`ShapeDispatch`のために静的境界を保ちます。動的範囲は`Nominal[Range]`のままです。
2. `ShapeDispatch`は`[]`について`tuple[start, length]`と`tuple[range]`を認識し、Rubyの`Array#[]`スライスセマンティクスを使います。静的に成功するスライスはスライスされた`Tuple`を返します。静的にnilなスライスは`Constant[nil]`を返します。`fetch`はそれらの形式を要求しません。
3. `HashShape`はrequired/optional/read-onlyキーセットとopen/closed extra-keyポリシーを得ます。厳密にclosedなsymbolキー付きシェイプはoptionalフィールドを含めてRBSレコードに消去されます。openまたはstringキー付きシェイプは`Hash[K, V]`に消去されます。`[]`/`dig`を通じたoptionalキー読み込みは`nil`を含み、optionalキー`fetch`はキーが不在の可能性があるため委ねます。
4. `Acceptance`は構造チェックを通じてポリシーをスレッドします。closedターゲットはextra既知キーとopenソースを拒否します。openターゲットは古い幅寛容な挙動を保ちます。requiredターゲットキーはソースでrequiredでなければならず、optionalターゲットキーは不在でかまいません。

### Slice 6 — ナローイング（最小CFA）

Slice 6は2つのフェーズで着地します。Phase 1は`IfNode`/`UnlessNode`での真偽値性と`nil?`ナローイング、加えて`AndNode`/`OrNode`の対応するRHSエントリナローイングを出荷します。phase 2はクラスメンバーシップ述語（`is_a?`・`kind_of?`・`instance_of?`）・有限リテラル集合の等価ナローイング・[`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/)のヒープと関係的ファクトを駆動する正式な`Rigor::Analysis::FactStore`キャリッジを追加します。

**Phase 1（このサブフェーズはこのコミットで出荷） — ローカル束縛での真偽値性とnilナローイング**。追加されたコンポーネント:

1. `Rigor::Inference::Narrowing`は、型レベルプリミティブ（`narrow_truthy`・`narrow_falsey`・`narrow_nil`・`narrow_non_nil`）と述語レベル解析器`predicate_scopes(node, scope) -> [truthy_scope, falsey_scope]`を公開する純粋なモジュールです。契約は[`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)の「ナローイング（Slice 6 phase 1）」で束縛されます。
2. Slice 6 phase 1の述語カタログは、`LocalVariableReadNode`（束縛されたローカルの真値／偽値ナローイング）・`recv.nil?`と単項`!recv`の`CallNode`（呼び出しが引数もブロックも運ばないときのみ）・`ParenthesesNode`/`StatementsNode`（本体／最後の文へ再帰）・短絡する`AndNode`/`OrNode`（`Scope#join`を通じてサブエッジを合成）です。それ以外は「ナローイングなし」にフォールスルーします — 両エッジはエントリスコープを変更せずに返すため、カバーされていない形状ではSlice 3 phase 2の挙動が保たれます。
3. `Rigor::Inference::StatementEvaluator`は今やナローイング対応です。`eval_if`は`then`分岐を述語の真値スコープ下で、`else`分岐を偽値スコープ下で評価します。`eval_unless`は2つをスワップします。`eval_and_or`はRHSをLHSの真値スコープ下（`&&`）またはLHSの偽値スコープ下（`||`）で入ります。分岐マージでの半束縛のnil注入は変わりません。

受理代数はクラスごとの述語ではなく`narrow_truthy`/`narrow_falsey`に委ねられるため、型インスタンスは（ADR-3に従って）薄いまま保たれます。すなわち`Constant`はスカラー`value`を参照し、`Nominal`は`NilClass`/`FalseClass`の短いリストに対して`class_name`を参照し、`Union`は要素ごとに再帰し、`Top`/`Dynamic`は、解析器がまだよりリッチなキャリアなしに差集合型を表現できないため、変更されずに通過します。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `xs = [1, 2, nil]; y = xs.first; if y.nil?; "got nil"; else; y; end`は`Constant["got nil"] | Constant[1] | Constant[2]`として型付けされます。ナローイング前は、`y`がelse分岐で精緻化されなかったため結果に`Constant[nil]`が含まれていました。
- `Union[Integer, nil].evaluate("if x; x.succ; end")`は`x.succ`を`Nominal[Integer]`に対して型付けします（レシーバが絞り込まれているためディスパッチがきれいに解決します）。絞り込まれていないディスパッチは`NilClass#succ`を証明できず、フォールバックしました。

`rigor type-scan lib`でのカバレッジ: 13.45%→**13.8%**認識されない。ADR-4がSlice 6について予期したとおり、小さな上方ぐらつきは精度リグレッションではなく、新しい`lib/rigor/inference/narrowing.rb`ファイル（その定数参照がまだRBSでカバーされていない`Rigor::*`型に対する認識されないバケットに寄与）を反映します。挙動の向上はすでに型付けされた値に集中しています。

**Phase 2 sub-phase 1（このサブフェーズはこのコミットで出荷） — クラスメンバーシップナローイング**。追加されたコンポーネント:

1. `Rigor::Inference::Narrowing`は2つの型レベルプリミティブ`narrow_class(type, class_name, exact: false)`と`narrow_not_class(type, class_name, exact: false)`を成長させます。真値プリミティブは値格子（`Constant`・`Nominal`・`Union`・`Tuple`・`HashShape`・`Singleton`・`Top`・`Dynamic`・`Bot`）を歩き、`Object.const_get`を介したホストRubyのクラス階層を使って`:equal`/`:subclass`/`:superclass`/`:disjoint`/`:unknown`の1つを計算します。`:superclass`ケースは実用的なナローイング勝利を実装します — `is_a?(Integer)`下の`Nominal[Numeric]`はsupertypeに留まるのではなく`Nominal[Integer]`になります。`:unknown`（ホストRubyがロードしていないクラス）は入力を保つため、解析器は証明できないナローイングを決して主張しません。偽値ミラーはマッチするキャリアを`Bot`に縮退し残りを保ち、解析器がよりリッチなキャリアなしに分離を証明できないsupertypeケースで意図的に保守的なまま残ります。
2. `Rigor::Inference::Narrowing.predicate_scopes`は3つの新しい`Prism::CallNode`形状を認識します。すなわち`recv.is_a?(C)`・`recv.kind_of?(C)`・`recv.instance_of?(C)`です。レシーバはMUST`Prism::LocalVariableReadNode`であり、単一引数はMUST静的な定数参照（`Prism::ConstantReadNode`または`Prism::ConstantPathNode`）です。修飾名は定数パスの親ウォークを通じてレンダリングされます。`is_a?`/`kind_of?`は`exact: false`を、`instance_of?`は`exact: true`を使います。それ以外（非定数引数・複数引数呼び出し・非ローカルレシーバ）は「ナローイングなし」にフォールスルーするため、エントリスコープは両エッジで変更されずに観測されます。
3. `StatementEvaluator`統合は変わりません。すなわち`eval_if`/`eval_unless`/`eval_and_or`はすでに`predicate_scopes`を消費し、新しいカタログは同じ`[truthy_scope, falsey_scope]`形状を通じて表面化します。単項`!`解析器は再帰呼び出しの真値／偽値エッジをスワップするため、`unless x.is_a?(Integer)`と`!x.is_a?(Integer)`は形式ごとのコードなしに同じ機構を再利用します。
4. `docs/internal-spec/inference-engine.md`と[`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/)の型仕様ポインタは、これらのナローイングプリミティブの束縛契約のままMUST留まります。内部仕様は、新しいキャリア規則と新しい`Prism::CallNode`カタログエントリを列挙するためにこのコミットで更新されました。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `Union[Integer, String].evaluate("if x.is_a?(Integer); x; else; x; end")`は各分岐の`x`をそれぞれ`Nominal[Integer]`と`Nominal[String]`として型付けします。ナローイング前は両分岐がベアunionを見ました。
- `Nominal[Numeric].evaluate("if x.is_a?(Integer); x; end")`はthen分岐の`x`を`Nominal[Integer]`として型付けします（`:superclass`順序がsupertypeを問われたクラスへ**下方に**絞り込みます）。ナローイング前はsupertypeが保たれていたため、`x.bit_length`はディスパッチしませんでした。
- `unless x.is_a?(Integer); x; else; x; end`は既存の`eval_unless`ハンドラーを通じてエッジをスワップするため、`Union[Integer, String]`は形式ごとのコードなしに`unless`分岐を`Nominal[String]`として解決します。

`rigor type-scan lib`でのカバレッジ: 13.8%→**13.5%**認識されない。これは、解析器がプロダクトコード内の`is_a?`呼び出しでいくつかの残余フェイルソフトフォールバックを排除することを反映する小さな下方ステップです（`MethodDispatcher.expected_block_param_types`クエリと`Narrowing`解析器の両方が、以前ナローイング表層から落ちていた`case node when ...`分岐を含みます）。

**Phase 2 sub-phase 2（このサブフェーズはこのコミットで出荷） — 等価ナローイング＋FactStore**。追加されたコンポーネント:

1. `Rigor::Analysis::FactStore`は各`Scope`スナップショットが運ぶ不変なファクト束です。初期のバケット語彙（`local_binding`・`captured_local`・`object_content`・`global_storage`・`dynamic_origin`・`relational`）・target/fact値オブジェクト・targetの無効化・両方の入力エッジに存在するファクトのみを保持する保守的なジョインを定義します。`Scope#with_local`は再束縛されたローカルのファクトを無効化します。`Scope#with_fact`・`Scope#local_facts`・`Scope#facts_for`は、可変なバケットストレージを公開せずに狭いクエリ表層を公開します。
2. `Rigor::Inference::Narrowing`は`narrow_equal(type, literal)`と`narrow_not_equal(type, literal)`を成長させます。String/Symbol/Integerリテラルは、すでに有限な信頼できるリテラルドメイン内でのみ絞り込みます。nil/true/falseのシングルトン値は、`Integer | nil`のような混合ドメインから抽出できます。Floatリテラルと広いドメイン（`String`・`Dynamic[Top]`）は、捏造されたリテラル精度を獲得しません。
3. `Narrowing.predicate_scopes`は信頼できる静的リテラルについて`local == literal`・`literal == local`・`!=`ミラーを認識します。等価エッジは新しいプリミティブを通じてローカルを再束縛し、`FactStore::Fact`を記録します。すなわち型が変わったときは`local_binding`、比較が記憶されるが値型を絞り込むのに十分信頼されないときは`relational`です。
4. `StatementEvaluator#eval_and_or`は今や`a && b`を`union(narrow_falsey(a), b)`として、`a || b`を`union(narrow_truthy(a), b)`として型付けします。これは既存のRHSエントリナローイングとnil注入された後置スコープジョインを保ちながら、Rubyのスキップされたなぁ-LHS値セマンティクスと一致します。
5. クラスメンバーシップナローイングは今や`Environment#class_ordering`を使います。これは静的レジストリを参照し、それから`RBS::Definition#ancestors`に対する`RbsLoader#class_ordering`を参照します。述語ナローイングはもはやアドホックな`Object.const_get`を行いません。RBS専用のプロジェクトクラスは、解析器ホストによってロードされなくても階層ナローイングに参加できます。

クロージャに捕捉されたローカルの無効化はSlice 6 phase C sub-phase 3に委ねられたままです。このサブフェーズはそれが必要とするFactStoreターゲット／無効化表層を与えます。

### Slice 6 phase C — BlockNode引数束縛

DefNode対応スコープビルダー（Slice 3 phase 2フォローアップ）はRBSからメソッド引数を束縛しました。このスライスはその対称的な対応物を`Prism::BlockNode`に対して出荷します。

**Sub-phase 1（このサブフェーズはこのコミットで出荷） — 受信側メソッドのRBSシグネチャによって駆動されるブロック引数束縛**。追加されたコンポーネント:

1. `Rigor::Inference::BlockParameterBinder`は薄い値オブジェクトです。`BlockParameterBinder.new(expected_param_types: [...])`は位置ごとの`Rigor::Type`配列を消費し、`Prism::BlockParametersNode#parameters`を歩くことで`name -> Type`束縛マップを生成します。required・optional・trailingの位置引数はインデックスで期待配列に対してマッチされます。rest（`*r`）・keyword（`k:`/`k: 0`）・keyword rest（`**kw`）・明示的ブロック（`&blk`）スロットは保守的な型付きデフォルト（それぞれ`Array[Dynamic[Top]]`・`Dynamic[Top]`・`Hash[Symbol, Dynamic[Top]]`・`Nominal[Proc]`）を得ます。MultiTargetNode分解（`|(a, b), c|`）と番号付き引数（`_1`/`_2`）は委ねられます。バインダーは整形式のPrismブロックノードでMUST NOTraiseしません。
2. `Rigor::Inference::MethodDispatcher.expected_block_param_types(receiver_type:, method_name:, arg_types:, environment:)`は、バインダーの`expected_param_types:`配列を供給する標準クエリです。内部では`RbsDispatch.block_param_types`を使い、これは既存の`OverloadSelector`（`block_required: true`フラグで拡張、ブロック付き呼び出しがブロックなしオーバーロードを通じて束縛しないように）を通じてオーバーロードを選択し、`RBS::Types::Block#type` Functionを取り出し、その`required_positionals + optional_positionals`引数を`Rigor::Type`値に翻訳します。ジェネリック置換は戻り値型ティアが用いるのと同じ`type_vars`マップを通じて流れるため、`Array#each`の`Elem`ブロック引数はレシーバの`type_args`を通じて解決されます。Unionレシーバは、すべてのメンバーが構造的に等しいブロック引数リストを生成しない限り空配列に劣化します。
3. `Rigor::Inference::StatementEvaluator`は`Prism::CallNode`ハンドラーを追加します。ハンドラーは:
   - 既存の`Scope#type_of`に呼び出しの値型を尋ねます（したがって定数畳み込み／シェイプ／RBSディスパッチチェーンが依然として適用され、`MethodDispatcher.dispatch`が戻り値型の単一の真実の源です）。
   - `MethodDispatcher.expected_block_param_types`で呼び出しの期待ブロック引数配列をプローブします。
   - *外側*スコープをバインダーの束縛で拡張することでブロックのエントリスコープを構築します（Rubyのレキシカルスコーピング規則: ブロックは外側のローカルを見ます。ブロック引数がその上に重ねられます）。
   - `Prism::BlockNode`に再帰します（これは`sub_eval(body, scope)`に委ねる独自のハンドラーを持ちます）。これによりノードごとのスコープインデックスが引数束縛を見ます。
   - レシーバスコープを変更せずに返します。したがってブロック効果は後置呼び出しスコープに漏れません。ブロック内のみで束縛されたローカルは、[`control-flow-analysis.md`](../../type-specification/control-flow-analysis/)のクロージャ捕捉規則が着地するまで意図的に外側からは見えません。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `xs = [1, 2, 3]; xs.each { |x| y = x.succ }`はブロック内の`y`を`Nominal[Integer]`として型付けします（ブロック引数`x`はタプル要素のunionに束縛され、`Integer#succ`はディスパッチを通じて解決します）。束縛前は`x`が束縛されておらず`x.succ`は`Dynamic[Top]`にフォールスルーしました。
- `[1, 2, 3].map { |n| n + 1 }`のレシーバ`n`は同じタプル要素のunionとして型付けされます。したがって`n + 1`は各要素型上の定数畳み込みティアを通じて解決します。
- `foo { |x| x }` — 受信側の呼び出しがRBSシグネチャを持たないとき、バインダーは`x`を`Dynamic[Top]`にデフォルトし、Slice 3 phase 2のフェイルソフト姿勢と一致します。

`rigor type-scan lib`でのカバレッジ: 13.6%→**13.5%**認識されない（2 122 / 15 734ノード。ブロックが今やStatementEvaluatorのノードごとのスコープインデックスを通じて訪れられるため、合計ノード数が成長）。メトリックはRigor自身の定数参照が支配しており、それをさらに動かせるのはRBSオーサリング（候補A）のみです。

**Sub-phase 2（このサブフェーズはこのコミットで出荷） — 分解ブロック引数・番号付き引数・ブロック戻り値型対応ディスパッチ**。追加されたコンポーネント:

1. `Rigor::Inference::BlockParameterBinder#bind_required_param`は`Prism::MultiTargetNode`ブロックターゲット（`|(a, b), c|`）を認識し、各分解スロットをスロットの期待要素型に対して`Rigor::Inference::MultiTargetBinder`に委ねます。`Type::Tuple`スロットは要素ごとに分解されます。他のキャリアはすべての内部ローカルを`Dynamic[Top]`に縮退します。内部ターゲットはブロック側で`Prism::RequiredParameterNode`インスタンスです。`MultiTargetBinder`は両者が同じ`name:`フィールドと同じ観測可能なセマンティクスを運ぶため、それらをいとこの`Prism::LocalVariableTargetNode`と統一的に処理します。
2. `Rigor::Inference::BlockParameterBinder#bind_numbered_parameters`は`Prism::NumberedParametersNode`を消費し、明示的な引数で用いるのと同じ位置ごとの`expected_param_types:`配列によって駆動される`:_1`から`:_maximum`までの束縛を実体化します。`[1, 2, 3].map { _1 + 1 }`は今や`_1`をレシーバの射影された要素型に束縛するため、本体の`_1 + 1`は依然として精密な整数キャリアでディスパッチャーを参照します。
3. `Rigor::Inference::MethodDispatcher.dispatch`は長く予約されていた`block_type:`キーワードを尊重します。すなわち非nilのとき、`RbsDispatch.try_dispatch`はブロック付きオーバーロードを（`OverloadSelector`で`block_required: true`を介して）選択し、選択されたオーバーロードのブロック戻り値型が参照するメソッドレベル型パラメーターを、戻り値型を翻訳する前に`block_type`に束縛します。配線は意図的に狭いです — 厳密な`Variable`ブロック戻り形状のみが参加します — ため、ブロック戻り値が`untyped`関数またはより精巧な型（例: タプル・構造的シェイプ）であるシグネチャは以前のフォールバックを保ちます。`Array#map[U] { (Elem) -> U } -> Array[U]`はこのスライスがブロック解除する標準的なケースです。
4. `Rigor::Inference::ExpressionTyper#call_type_for`は単一のブロック対応ディスパッチ表層になります。すなわち呼び出しが`Prism::BlockNode`を運ぶとき、StatementEvaluatorが構築するのと同じブロックエントリスコープ（`外側スコープ + BlockParameterBinder.bind`）を構築し、ブロック本体を型付けし、本体の型を`block_type:`として`MethodDispatcher.dispatch`に渡します。これによりStatementEvaluatorをループに含めることを要求せずに、すべての呼び出し位置（`Scope#type_of`・`ScopeIndexer`・CLI `rigor type-of` / `rigor type-scan`）から結果型の向上が見えます。StatementEvaluatorのCallNodeハンドラーは整合を保ちます。すなわち結果型については`Scope#type_of`に委ね、ノードごとのスコープインデックスのためにのみブロック本体を再評価します。

具体的な挙動の向上（CLIスモークプローブを通じて検証）:

- `[1, 2, 3].map { |n| n.to_s }`は`Array[String]`として型付けされます（以前は`Array[Elem]`シェイプを通じて射影された`Array[Dynamic[Top]]`）。
- `[1, 2, 3].map { _1 + 1 }`は`Array[Integer]`として型付けされます。番号付き引数を束縛する前は、`_1`は束縛されていないローカルとして解決され、ブロック本体は`Dynamic[Top]`に縮退しました。
- `arr.each_with_object({}) { |x, acc| acc[x] = true }`は既存の射影の答えを保ちます（ブロック戻り値型はメソッドレベルの型変数ではないため、`block_type:`参加はきれいにフォールスルーします）。

クロージャに捕捉されたローカルの無効化はSlice 6 phase 2のFactStore作業と並んで着地します。それはこのサブフェーズのスコープ外です。

### Slice 7 — リファインメント（最小）

[`imported-built-in-types.md`](../../type-specification/imported-built-in-types/)からの`non-empty-string`と`positive-int`を持つ`Rigor::Type::RefinedNominal`を追加します。

## モジュールスケッチ（Slice 1後）

```
lib/rigor/
├─ trinary.rb
├─ type.rb                         # ducktype module
├─ type/
│  ├─ top.rb
│  ├─ bot.rb
│  ├─ dynamic.rb
│  ├─ nominal.rb
│  ├─ constant.rb
│  ├─ union.rb
│  └─ combinator.rb                # factory
├─ environment.rb                  # public entry
├─ environment/
│  └─ class_registry.rb            # Slice 1 hardcoded built-ins
├─ scope.rb                        # public Scope#type_of
└─ inference/
   └─ expression_typer.rb          # AST → Type
```

Slice 2は`lib/rigor/inference/method_dispatcher.rb`と`lib/rigor/inference/method_dispatcher/constant_folding.rb`を追加します。Slice 4は`lib/rigor/environment/rbs_loader.rb`と`MethodDispatcher`内のRBSバックディスパッチティアを追加します。Slice 6は`lib/rigor/analysis/fact_store.rb`を追加します。`lib/rigor/analysis/`ディレクトリは診断とランナーコードを保持し続けます。推論エンジンは`lib/rigor/inference/`下の別の関心事です。

## 公開API（Slice 1後）

```ruby
class Rigor::Scope
  def self.empty(environment:)
  def with_local(name, type)
  def local(name)            # Rigor::Type or nil
  def type_of(node)          # Rigor::Type
  def environment
end

module Rigor::Type::Combinator
  def self.union(*types)
  def self.dynamic(static_facet)
  def self.nominal_of(class_object)
  def self.constant_of(value)
end
```

Slice 1の表層は[`internal-type-api.md`](../../internal-spec/internal-type-api/)のメソッド表層契約と整合的です。後続のスライスは`Scope#type_of`の形状を変えることなく`Rigor::Type::Combinator`と`Rigor::Inference::*`に追加します。

## リスクと緩和

- **暫定OQ回答は後で覆る可能性があります**。プロダクションコード経路は`Type::Combinator`を通じてルーティングされます。直接の型クラスコンストラクタは内部専用の脱出口です。CIリントは`?`サフィックス付きメソッドが`Trinary`を返さないようガードします。Slice 1で追加される能力（capability）述語は最小なので、リネームは機械的です。
- **Prism APIの進化**。型付け器はビジター継承ではなくRubyのパターンマッチング（`case node in Prism::IntegerNode`）を使うため、Prismクラス階層を拡張しません。将来のPrismリリースは型付け器を局所的に破ります。
- **RBS環境の起動コスト**。 RBSロードはSlice 4に委ねられます。Slice 1はハードコードレジストリで出荷し、Slice 2は定数畳み込み規則のみに依存します。Slice 4のローダーは実行とテストにわたるキャッシュを許すためにラップされています。
- **フェイルソフトな`Dynamic[Top]`がリグレッションをマスクすること**。 Slice 1以降、型付け器は`Dynamic[Top]`にフォールバックするときオプショナルに`Diagnostic::Trace`を記録します。トレースはノイズを避けるためオプトインですが、後のスライスがカバレッジリグレッションを検出できるよう配管されています。
- **スコープのエルゴノミクス**。 `evaluate(node, scope)`から`[Type, Scope']`を返すのは（Slice 3）冗長です。明示的な不変性と引き換えに冗長性を受け入れます。ヘルパービルダー（`scope.evaluate(node) { |type| ... }`）は2つか3つの呼び出し位置が存在し次第MAY追加できます。

## 参考文献

- [`docs/adr/1-types.md`](../1-types/) — 型モデルセマンティクス。
- [`docs/adr/2-extension-api.md`](../2-extension-api/) — 型値を消費する拡張表層。
- [`docs/adr/3-type-representation.md`](../3-type-representation/) — 型オブジェクト表現とOQ1/OQ2の根拠。
- [`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/) — 型オブジェクト公開契約。
- [`docs/internal-spec/implementation-expectations.md`](../../internal-spec/implementation-expectations/) — エンジン表層契約。
- [`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/) — `Scope#type_of`の公開契約。
- [`docs/type-specification/relations-and-certainty.md`](../../type-specification/relations-and-certainty/) — 部分型・グラデュアル一貫性・3値セマンティクス。
- [`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/) — `Dynamic[T]`代数。
- [`docs/type-specification/normalization.md`](../../type-specification/normalization/) — 決定的正規化規則。
- [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/) — Slice 6のScope/CFAターゲット。

外部（PHPStanソースコード、Rigorのサブモジュールの一部ではない）:

- [`phpstan/phpstan-src` `src/Analyser/Scope.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Analyser/Scope.php)。
- [`phpstan/phpstan-src` `src/Analyser/MutatingScope.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Analyser/MutatingScope.php)。
- [`phpstan/phpstan-src` `src/Analyser/NodeScopeResolver.php`](https://github.com/phpstan/phpstan-src/blob/2.2.x/src/Analyser/NodeScopeResolver.php)。
