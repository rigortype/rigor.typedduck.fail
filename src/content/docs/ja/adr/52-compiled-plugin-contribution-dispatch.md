---
title: "ADR-52 — Compiled plugin contribution dispatch"
description: "Imported from rigortype/rigor docs/adr/52-compiled-plugin-contribution-dispatch.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/52-compiled-plugin-contribution-dispatch.md"
sourcePath: "docs/adr/52-compiled-plugin-contribution-dispatch.md"
sourceSha: "23ea5d1bde4ac13a1ee4a60133cc5490e0800e1b9cb202bba5eb683c95e67205"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
sidebar:
  order: 4052
---

ステータス: **Accepted — スライス1（WD1）を2026-06-10に実装**（コミット
`67a552de` + `1deecb2f`: コンパイル済みのcontributionテーブルと6箇所のエンジン
呼び出し元の再配線。WD6に従いMastodon 6プラグインとGitLab 11プラグインのコーパス
上でのバイト単位同一の診断でゲートした — 最初のGitLabスイープで実際のリグレッション
を捕捉した。名前なしの`&:symbol` BlockArgumentNodeが新しい名前ゲートで例外を上げ、
ブロック型を静かにnilにしていたもので、2番目のコミットでリグレッションスペックにより
修正・固定した）。このスライスでは設計どおりウォール時間は中立である。グローバル
ゲートはレガシーの`flow_contribution_for`プラグインがロードされている間は不活性の
ままなので、スループットの向上はWD3の移行とともに到来する。
**スライス2（WD2の静的なレシーバーレス形式）を2026-06-10に実装**（`c3550b00`
+ `cd5d5990`: `receivers:`をオプションにし、`methods:`単独でゲートする。
`rigor-units`を移行）。**監査のスライス2プラグインの対象は誤りだった** — 「監査の
訂正」を参照。**スライス3（実行時レシーバー集合のcallable）を一部実装**
（`fb5aea04`/`0f1a64b2`がエンジン、`be4c532c`がrigor-activestorage、GitLab
コーパスでバイト単位同一）。**rigor-activerecordはレシーバー型ゲートでブロック
されている**（クラス側のパスはAST/`self_type`をキーとし、モデル定数は`Dynamic`
として型付けされる — 移行を試みたが差し戻した。「rigor-activerecordのブロッカー」
を参照）。**スライス4（実行時メソッド名集合のcallable）を一部実装**
（`79dc790d`がエンジン、`46b14280`がrigor-lisp-eval / rigor-patternの例。
エンドツーエンドスペックとデモがバイト単位同一）。**rigor-sorbetを2026-06-11に
移行**: その`flow_contribution_for`は`dynamic_return methods:`のcallableとなった
（静的なアサーション語彙 ∪ `:absurd` ∪ 新しい`Catalog#method_names`列挙器）。
加えて`T.bind`のself絞り込みファクト（fact）を運ぶ`type_specifier methods: [:bind]`
を持つ（ディスパッチャーのパスはマージから`return_type`のみを消費し、ステートメント
のパスは`post_return_facts`のみを消費するので、この分割は振る舞いを保存する —
`T.absurd`の`exceptional: :raises`スロットはすでにディスパッチャーの
`Merger.merge(...).return_type`によって削られており、`bot`のリターンが到達不能性を
運ぶ）。副作用（absurd/reveal/assert-typeの記録、sigilゲート）はルールブロックへ
移した。63例のエンドツーエンド統合スペックと、strapおよびdependabot-coreのsorbet
コーパス上でのバイト単位同一の`rigor check`でゲートした。この移行は最初の大きな
WD3スループット向上ももたらした: dependabot-core（sigが多い20ファイル）1262.6s
→ 33.4s（約38倍）— ゲートされていないフックは名前付き呼び出しごとにカタログチェーン
ルックアップ（`scope.type_of`によるディスパッチごとのレシーバー再型付けを含む）を
実行していた。**スライス5a（ファイルごとの名前集合ゲート + rigor-rspec）を
2026-06-11に実装**: 最後のWD2 DSL形式 — `dynamic_return file_methods:`はファイル
パスを受け取るcallableを取り、`(rule, path)`ごとにメモ化され、`methods:`と相互排他
（1つの名前ゲート、2つのスコープ）で、nilパスはフェイルクローズする。rigor-rspecの
let束縛`flow_contribution_for`をこれへ移行した（ゲート集合 = `LetScopeIndex#let_names`、
ブロックの行スコープ`let_block_at`の安全な過剰近似）。エンドツーエンド統合スペックと
バイト単位同一のデモ + GitLabコーパスでゲートした。
**rigor-activerecordを2026-06-11に移行 — ブロッカーは解消され、新しいゲート形式は
不要だった**: 2026-06-11のブロッカー分析は`receivers:`ゲート（Dynamic型のモデル定数が
打ち破るもの）に固執していたが、**実行時の`methods:`名前ゲートはレシーバー型を一切
読まない** — ルールブロックはAR自身のAST定数 / `self_type` / `type_of`解決を保つ
（rigor-sorbetのシェイプ）。ゲート集合はARの4つのパスが型付けできる名前の和集合に
ちょうど一致する: 静的ファインダー名 ∪ モデルインデックス由来のすべてのスコープ・
関連・カラム名（+ `column?`述語）— なのでそれでゲートすることは構成上、ゲートされて
いないフックとバイト単位同一になる。以前に提案されたオプションA（発見された定数を
Singleton型付けする）とオプションB（ASTをキーとするゲート形式）はどちらも不要で
あり棄却する。ARの93例のエンドツーエンド統合スペック（差し戻された`receivers:`の
試みを捕捉したスイート）+ GitLabコーパスでゲートした。**5つのレガシーユーザーが
すべて移行済み。スライス5b（フックの削除）を2026-06-11に実装**:
`Plugin::Base#flow_contribution_for`を削除し、両エンジンコレクターのレガシー分岐を
除去し、`ContributionIndex`のflow集合とlegacy-disables-global-gateルールを除去し、
フックをまだ定義しているプラグインに対して**ロード時の`ArgumentError`**を上げる
（静かに一度も呼ばれないというのはサードパーティ作者にとって最悪の失敗モードである）
— 各レガシーイディオムをそのWD2の後継へ対応づけるCHANGELOGの移行ノートを指し示す。
ADR-2/ADR-37のステータス行、プラグイン作者スキル、internal-spec、各READMEを一掃した。
**スライス6（単一のノードルールウォーク）を2026-06-11に実装**: エンジン所有の
`Plugin::NodeRuleWalk`がファイルごとに1回の`each_with_ancestors`パスを行い、一致
するすべての`(plugin, rule)`へディスパッチする — プラグインごとの`node_file_context`
はそのルールの前に一度だけ走り、`is_a?`によるノード型マッチングは具象クラスごとの
メモで保たれ、診断はプラグインごとにバケット化され古いプラグインメジャー順で出力
される（バイト単位同一）。隔離エンベロープを再現する。WDの表面は完了しており、
残りの作業は需要駆動である（ノードメジャー再ソートは意図的に取らなかった）。
アーキタイプ: 熟議型。ステークス: 中〜高（プラグイン契約（contract）とエンジンの最も
ホットなパスに触れる。構成上は精度中立 — 受け入れゲートはバイト単位同一の診断である）。

根拠: [プラグインアーキテクチャの構造監査
（2026-06-10）](../../notes/20260610-plugin-architecture-perf-audit/)。これは
[Mastodon](../../notes/20260604-mastodon-allocation-profile/) /
[GitLab](../../notes/20260604-gitlab-plugin-contribution-allocation/)のアロケーション
プロファイルとADR-44の着地を土台としている。

## コンテキスト

呼び出しごとのプラグイン照会は、プラグインが多いプロジェクトにおけるエンジンの
プラグイン関連コストの筆頭である（GitLab: `collect_plugin_contributions`はADR-44期
の修正前にインクルーシブアロケーションの40.7%だった）。これまでの修正 —
`Registry::ContributionIndex`の構造的剪定、メモ化されたルールスナップショット、遅延
蓄積 — はすべて1つのシェイプを共有している: *すべてのプラグインへ尋ねるコストを
安くする*。監査が示すのは、残りのコストは構造的であり、同じことをさらに繰り返しても
解消できないという点である:

1. **レガシーの`flow_contribution_for`フックはゲートされていない**。その残り5つの
   ユーザーは最も多くデプロイされているプラグイン（rigor-activerecord、
   -activestorage、-activesupport-core-ext、-rspec、-sorbet）である。それぞれが
   **すべての呼び出しノードで、2回**走る（`MethodDispatcher#collect_plugin_contributions`、
   `method_dispatcher.rb`約L695、および`StatementEvaluator`の
   `apply_plugin_assertions`パス、`statement_evaluator.rb`約L1407）。それらの
   ゲート条件は不透明なプラグインコードの中にあるので、エンジンはそれらをインデックス
   化できない。ブロッカーはDSL語彙である: `dynamic_return`（ADR-37スライス2）は
   *静的なクラス名の配列*しか受け付けないが、これら5つは実行時レシーバー集合
   （ARの`model_index`）、素のメソッド名集合（sorbetの`T.*`）、またはファイルごとの
   名前集合（rspecのlet）でゲートする。
2. **プラグイン横断のメソッド名インデックスがない**。 `type_specifiers`は純粋に
   メソッド名でゲートされるが、プラグインごと・ルールごとの線形`include?`でマッチ
   される。`dynamic_return_type`はディスパッチごと・ルールごとにレシーバーの祖先
   マッチングを再実行する。圧倒的に多いケース — どのプラグインもこの呼び出しに関心が
   ない — を発見するのにO（plugins × rules）かかる。
3. **凍結されたレジストリへのクエリが呼び出しごとに再計算される**。
   `Registry#open_receiver?`（未定義メソッド候補ごと）、`#additional_initializers`
   （defごと、`ScopeIndexer`内に×2箇所）、`#contracts_for_path`（defごと、完全な
   fnmatchスイープ）、`MethodDispatcher#plugin_owns_receiver?`（フォールバック
   ディスパッチごと、plugins × owns_receivers × `class_ordering`）はいずれも、構築時に
   凍結されるレジストリ上で`flat_map`する。
4. **ノードルールはプラグインごとに1回ASTをウォークする**
   （`Plugin::Base#node_rule_diagnostics`）。また`MacroBlockSelfType`はブロック呼び出し
   元ごとにplugins × `block_as_methods`を線形にスキャンする。

リリース前コンテキスト: ADR-50は公開プラグイン表面をv1.0で凍結する。それより前では
ない。レガシーフックを今除去することは認可された後方互換性の破壊である。v1.0以降は
コストが高くなる。このタイミングの非対称性こそ、これがさらなるスポット修正ではなく
1つの整合した再構成として着地する理由である。

## 決定

エンジンが呼び出し元ごと・defごと・ファイルごと・ノードごとに行うすべてのプラグイン
照会に対して、**コンパイル済みディスパッチ基準**を採用する:

> プラグイン照会は、照会元でエンジンがすでに保持しているキー — メソッド名の`Symbol`、
> レシーバークラス名、ファイルパス、または`Prism::Node`クラス — でゲートされなければ
> ならない（MUST）。そのキーはレジストリ構築時に1回コンパイルされる構造の中で
> ルックアップされる。プラグインコードは候補がヒットしたときにのみ実行される。
> そのようなキーを宣言できないプラグインケイパビリティ（capability）は、ゲートされて
> いないフックの許可証ではなく、**契約の中で埋めるべきDSL語彙のギャップ**である。

具体的には: `ContributionIndex`をコンパイル済みの**contributionテーブル**へ拡張し
（WD1）、5つのレガシーユーザーが自身のゲートを宣言できるまで宣言的DSLを育て（WD2）、
それらを移行して`flow_contribution_for`を**除去**し（WD3）、プラグインごとのAST
ウォークをエンジン所有の1つのウォークへ畳み込む（WD4）。比較対象はPHPStanの拡張
レジストリ（クラスをキーとする`DynamicMethodReturnTypeExtension`）である。Rigorは
より豊かなキー集合を必要とする。なぜならそのプラグインは素の名前やファイルごとの状態
でもゲートするからである。

## ワーキング・デシジョン

**WD1 — レジストリ構築時に実行ごとのcontributionテーブルをコンパイルする**。
`Registry::ContributionIndex`（`lib/rigor/plugin/registry.rb`約L17）を凍結テーブル
へ拡張する。これは次を保持する: すべての`type_specifiers`と`methods:`でゲートされる
`dynamic_returns`に対するメソッド名の転置インデックス`Hash[Symbol → [(plugin, rule)]]`、
`methods:`を持たない`dynamic_returns`に対する残余のレシーバーゲートバケット、
`block_as_methods`に対する動詞をキーとする`Hash`（`MacroBlockSelfType`が消費する。
現状は`macro_block_self_type.rb`約L55）、`Set`としての`open_receivers`、実行ごとの
`(class_name, constraint) → bool`の祖先メモを伴う凍結された和集合としての
`additional_initializers` / `owns_receivers`（健全 — クラスグラフは実行ごとに固定
される）、パスごとにメモ化された`contracts_for_path`、そしてプラグインごとの
`diagnostics_for_file`オーバーライドビット（`flow_overridden?`と同じ`Method#owner`の
トリック）でランナーがデフォルトの`[]`実装をスキップできるようにする。エンジンの
呼び出し元（`method_dispatcher.rb`約L695、`statement_evaluator.rb`約L1439、
`check_rules.rb`約L605、`scope_indexer.rb`約L446/507、
`method_parameter_binder.rb`約L234、`runner.rb`約L1699）はテーブルルックアップへ
切り替わる。DSLの変更はなく、診断は構成上同一である。

**WD2 — 3つのDSL語彙の追加**（def形式はADR-50の前例に従い実装時に調整の余地あり）:

- *静的なメソッド名のみのゲート*: `receivers:`なしの`dynamic_return methods: [...]`
  （レシーバーに依存しないルールで、名前集合がクラス定義時に既知のもの）。
  **2026-06-10に実装**（`c3550b00`）。`rigor-units`を移行した（`cd5d5990`）。その
  ゲートはレシーバーの*次元* — 名前的型を持たないリファインメント型（refinement type、
  篩型とも）のキャリア（carrier）— であり、ブロック内で読まれる。
- *実行時レシーバー集合*: `dynamic_return receivers: -> { model_index.keys }` —
  プラグインに対して`instance_exec`され、ルールごとにメモ化されるcallableで、ルールが
  最初に照会されるとき（常に`#prepare`の後）に遅延解決される。rigor-activerecord /
  -activestorageをカバーする。これらのレシーバー集合は`prepare`時のプロジェクト
  スキャンの後にのみ存在する。**2026-06-10に実装**（`fb5aea04`/`0f1a64b2`）。
  `rigor-activestorage`を移行した（`be4c532c`、GitLabコーパスでバイト単位同一）。
  解決はインスタンスの`dynamic_return_type`パスに存在し、`ContributionIndex`には
  ない（レシーバーゲートのルールは`methods:`ゲートを持たないので、レジストリはそれを
  ちょうど静的レシーバールールとして見る）。解決された集合はブロック自身のフィルタ
  の安全な過剰近似（サブクラスを許容する）なので、ブロックが精密なゲートのままで
  ある。rigor-activerecordは**このゲートを使えない** — 「rigor-activerecordの
  ブロッカー」を参照。
- *実行時メソッド名集合*: 上記のメソッド名版 — `#prepare`の後に解決され、メモ化され、
  レシーバー集合のcallableと対称な`methods:` callable。**2026-06-11に実装**
  （`79dc790d`）。`rigor-lisp-eval`と`rigor-pattern`の例を移行した（`46b14280`、
  そのエンドツーエンドスペックとデモがバイト単位同一）。callableなメソッド集合は
  レジストリの名前ゲートへコンパイルできない（レジストリ構築時には未知）ので、
  プラグインはディスパッチごとに照会され、名前フィルタはインスタンスの
  `dynamic_return_type`パスで走る — ブロックは依然としてリストにある名前に対してのみ
  発火するので、診断は変わらない。**これはrigor-sorbetが使う形式である**（そのカタログ
  は実行時に収集された任意の`def`メソッド名をキーとする。「監査の訂正」を参照）—
  新しい`Catalog#method_names`列挙器と、`T.bind`のself絞り込みファクトに対する
  `type_specifier`分割を介して**2026-06-11に移行**した。ファイルごとの名前集合
  （rigor-rspecのlet、ファイルごとに動的）はそのファイルスコープの特殊化であり —
  `dynamic_return file_methods:`として**2026-06-11に実装**された（パスを受け取る
  callable、`(rule, path)`ごとにメモ化、`methods:`と排他、nilパスはフェイル
  クローズ）。rigor-rspecのlet束縛ルールがその最初の消費者である。

### rigor-activerecordのブロッカー（2026-06-10）— 2026-06-11に解消

**解消: オプションAもオプションBも不要だった**。下記のブロッカーは`receivers:`
ゲートに対しては本物だが、ARはレシーバー型を一切読まないスライス4の実行時
**`methods:`**ゲートに適合する: ゲート集合はARの4つのパスが型付けできる名前の和集合
（静的ファインダー ∪ スコープ ∪ 関連 ∪ カラム + `column?`述語。すべてモデル
インデックスから列挙可能）であり、ルールブロックはAR自身のAST定数 / `self_type` /
`type_of`解決を保つ — rigor-sorbetのカタログパスが使うのと同じシェイプである。その
集合でゲートすることは構成上、ゲートされていないフックとバイト単位同一である（どの
パスも成功にはその名前が集合に含まれることを要する）。当初の分析はレシーバーゲートに
固執して名前ゲートのルートを見落としていた。下記の失敗試行の記録がその訂正とともに
読まれるよう、ここに記録する。歴史的記録:

rigor-activerecordを実行時レシーバー集合のcallableへ移行する最初の試みは**行われ、
差し戻された** — ARの最も一般的なケースをリグレッションさせ、いかなるコーパス実行の
前にプラグイン自身のエンドツーエンドスペックが捕捉した。

根本原因: `dynamic_return`レシーバーゲートは呼び出しの**`receiver_type`**をキーと
する（エンジンは`Nominal` / `Singleton`キャリアからクラス名を抽出する）。しかし
ARの2つのクラス側パスはレシーバー型を読まない — `class_call_return_type`は**AST**
（`constant_receiver_name`）を読み、`implicit_self_class_call_return_type`は
**`scope.self_type`**を読む。RBSにないプロジェクトモデル — すなわちほぼすべての実在
モデル — では、定数`User`は`Singleton[User]`ではなく**`Dynamic[top]`**として型付け
される（検証済み: `User.find(1)`は`receiver_type = Dynamic`、`class_name = nil`で
ディスパッチする）。よってゲートは`User.find`を拒否し、`u`は決して`Nominal[User]`へ
ナローイングされず、インスタンスチェーン全体（`u.name → String`）が崩壊する。古い
`flow_contribution_for`は`receiver_type`を決して見なかった。それはASTを読んだので、
定数がどう型付けされるかにかかわらず機能した。

これはレシーバー型ゲートの実際の限界であり、ARのバグではない。ARのインスタンス /
リレーションのパス（`user.posts`、`relation.scope`）は*問題なくゲートできる*だろう
（それらのレシーバーは本物の`Nominal[...]`である）が、クラス側パスのためにフックを
残す部分移行は目的を打ち破る（スライス5はフックが*消える*ことを望む）。よってARは
次のいずれかまで`flow_contribution_for`に留まる:

- **(A)**エンジンが、発見されたソース内クラス定数を`Singleton[Class]`として型付け
  する（広範で高リスクのディスパッチ変更 — それ自体が独立したADR）。
- **(B)**レシーバーの*型*ではなく、**ASTのレシーバー定数名**（呼び出しノードで
  エンジンがすでに保持している集合）または**クラス本体内の暗黙のself**をキーとする
  新しいゲート形式 — ASTをキーとするプラグインのための誠実な後継形式。これはARが
  提起するスライス4以降の設計課題である。

callableゲートの厳密メンバーシップSet版（大きなモデル集合に対してO（1）、祖先ウォーク
`any?`に対して）はこの試みと並行してプロトタイプされ、それとともに差し戻された —
動作するAR移行と一緒にしか着地する価値がない。activestorageの集合は祖先ウォークの
コストが無視できるほど小さいからである。

### 監査の訂正（2026-06-10）

根拠とした監査のスライス2プラグインテーブルは両方の点で誤りであり、移行を実装する際に
発見された:

- **rigor-activesupport-core-extは`flow_contribution_for`をまったく出荷していない** —
  これは純粋なRBSバンドルプラグイン（`signature_paths:`のみ、解析コードはゼロ）で
  ある。移行対象ではない。監査のgrepはそう述べているコメントにマッチしただけである。
- **rigor-sorbetは静的な名前ゲートに適合しない**。その`flow_contribution_for`は
  3つのパスを持つ: `T.*`アサーション（静的な名前）、`T.absurd`（1つの名前）、
  **そして取り込まれたsigを運ぶ任意の`def`メソッドで発火するカタログルックアップ** —
  これは静的ではなく実行時の名前集合である。よってsorbetは静的なスライス2形式ではなく
  *実行時メソッド名集合*形式（スライス3以降）に属する。

正味の効果: **静的なスライス2ゲートに適合する本番プラグインはなかった**。静的形式の
最初の実消費者は`rigor-units`の例である。4つの本番プラグイン（activerecord、
activestorage、rspec、sorbet）はすべて実行時（レシーバーまたはメソッド）集合を必要と
し、それらをスライス3のcallable作業へ統合する。下記のスライスリストはそれに応じて
番号を振り直してある。

**WD3 — 残りのレガシープラグインを移行し、それからフックを除去する**。 4つの本番
ユーザーはすべて実行時集合を必要とする（「監査の訂正」に従う）: activerecord +
activestorage（実行時レシーバー集合）、sorbet（実行時メソッド名集合、そのカタログ
キー）、rspec（ファイルごとの名前集合）。まだフックに乗っている2つの`examples/`
ユーザー（lisp-eval、pattern、ともに単一メソッド名でconfigゲートされる）は並行して
移行する。各移行はその統合スペックと該当するOSSコーパス上のバイト単位同一の診断で
ゲートする。最後の移行の後、`flow_contribution_for`は**削除される**（base
メソッド、両コレクター、`ContributionIndex`のflowパス）— シムとしては残さない。
1.0前の除去がポイントである（コンテキストを参照）。サードパーティ作者（ADR-31）は、
各レガシーイディオムをそのWD2形式へ対応づけるCHANGELOGの移行ノートを得る。

**WD4 — ノードルールのためにファイルごとに1回のASTウォーク**。ランナーはすべての
プラグインの`node_rules`を`node_type → [(plugin, rule)]`テーブルへマージし、ファイル
ごとに1回の`NodeWalker.each_with_ancestors`パスを所有し、ノードごとに1つの
`NodeContext`を確保する（現状は一致するルールごとに1つ、`plugin/base.rb`
約L419-427）。プラグインごとの`node_file_context`ビルダーは依然として（plugin, file）
ごとに一度走る。ルールブロックは依然として自身のプラグイン上で`instance_exec`する。
診断の順序はプラグインメジャーからノードメジャーへ変わる — ランナーは出力前に
ファイルごとのプラグイン診断をソートし（下流ですでに位置でソートされている）、出力を
安定に保つ。

**WD5 — ディスパッチャー / ステートメントの二重照会にキャッシュは不要**。両
コレクターは残るが、WD1〜WD3の後はそれぞれがほとんど常にミスするハッシュプローブに
なる。呼び出しノードごとのcontribution*結果*キャッシュは検討され、棄却された: 結果は
照会時のスコープ（ナローイング状態）に依存するので、ノードをキーとするキャッシュは
古い型のリスクを負う — 偽陽性型の失敗モードである（ADR-44のプール化Scopeの棄却と
ADR-45の事前解析フィンガープリントの教訓を参照）。ゲートレベルのインデックス化は
スコープ非依存であり、同じ節約を達成する。

**WD6 — スライスごとの検証プロトコル**。 (a) `make verify` +
`make check-plugins`、（b）Mastodon `app/models`（6プラグイン）とGitLabの設定済み
サブセット（11プラグイン）上での**バイト単位同一の診断**で、プロジェクト自身の
`.rigor.yml`を用いてcwd=targetで実行する（プロファイリングノートの方法論 —
cwd=rigorはプラグインの相対パス発見を壊す）、（c）stackprofの`:object` + GC統計の
デルタを後続の`docs/notes/`エントリーに記録、（d）`make bench-perf`がADR-50の許容
帯域内に収まること。

## 実装スライス

1. **完了**（`67a552de` + `1deecb2f`）— WD1テーブル + エンジン呼び出し元の再配線
   （契約変更なし）。
2. **完了**（`c3550b00` + `cd5d5990`）— WD2の静的なメソッド名のみの
   `dynamic_return`（レシーバーレス）+ `rigor-units`の例の移行（静的ゲートに適合
   する唯一の消費者。「監査の訂正」を参照）。
3. **一部完了** — WD2の実行時レシーバー集合callable（`fb5aea04`/`0f1a64b2`）+
   rigor-activestorageの移行（`be4c532c`、GitLabコーパスでバイト単位同一）。
   **rigor-activerecordはレシーバー型ゲートでブロックされている**（そのクラス側パスは
   AST/`self_type`をキーとし、プロジェクトモデル定数は`Dynamic`として型付けされる）—
   「rigor-activerecordのブロッカー」を参照。フックを離れるには新しいゲート形式
   （発見されたクラスのエンジンによるSingleton型付け、またはAST定数 / 暗黙self
   ゲート）が必要である。
4. **一部完了** — WD2の実行時メソッド名集合callable（`79dc790d`）+ configゲートされた
   `rigor-lisp-eval`と`rigor-pattern`の例の移行（`46b14280`、エンドツーエンド
   スペックとデモがバイト単位同一）+ **rigor-sorbet（2026-06-11）** —
   `SORBET_ASSERTIONS ∪ :absurd ∪ Catalog#method_names`上の`dynamic_return methods:`
   callable、`T.bind`のファクトのための`type_specifier`、ルールブロックへ移した副作用。
   strap + dependabot-coreコーパスでバイト単位同一。
4a. **完了（スライス5a、2026-06-11）** — ファイルごとの`file_methods:`ゲート形式 +
   rigor-rspecのlet束縛ルールの移行（デモ + GitLabコーパスでバイト単位同一、
   エンドツーエンドスペックがグリーン）。
4b. **完了（2026-06-11）** — 実行時`methods:`ゲートを介したrigor-activerecordの移行
   （新しいゲート形式は不要 — ブロッカーの「解消」ヘッダーを参照。93例のエンド
   ツーエンドスペック + GitLabコーパスでバイト単位同一）。5つのレガシーユーザーが
   すべて移行済み。
5. **完了（2026-06-11）** — `flow_contribution_for`を削除（Baseフック、両コレクター
   分岐、ContributionIndexのflow集合）+ まだそれを定義しているプラグインに対する
   ロード時の`ArgumentError`。ADR-2/ADR-37のステータス行、プラグイン作者スキル、
   ウォークスルーのREADME、internal-spec、CHANGELOGの移行ノートをすべて更新。
6. **完了（2026-06-11）** — WD4の単一ウォークノードルール: エンジン所有の
   `Plugin::NodeRuleWalk`、ファイルごとに1回のウォーク、バイト単位同一の出力のために
   プラグインメジャー順を保持。

## 棄却・延期した代替案

| 代替案 | 棄却の理由 |
| --- | --- |
| 内部ゲートの規約を文書化して`flow_contribution_for`を残す | 強制不能かつインデックス化不能 — エンジンは不透明なフックがある呼び出しに無関係だと証明できない。このコストクラスは残存する。 |
| 恒久的なサードパーティの脱出弁としてフックを残す | まさにホットになりやすいプラグインに対して基準を打ち破る。除去は1.0前は安く、ADR-50の凍結後は高い。 |
| 呼び出しノードごとのcontribution結果キャッシュ | スコープ依存の結果 → 古い型 / 偽陽性のリスク（WD5）。 |
| 可変なプール化コレクター / スコープ | 再入性 → 偽陽性の理由ですでに棄却済み（ADR-44）。 |
| PHPStan風のクラスキーのみのレジストリ | 語彙が不十分: Rigorのプラグインは素のメソッド名（sorbet）やファイルごとの状態（rspec）でもゲートする。 |
| 契約変更なしのさらなるADR-44風スポット修正 | 新しいプラグインごとに線形の呼び出しごとコストが再導入される。監査が示すのは残りのコストが実装ではなく契約にあるという点である。 |

## 帰結

- **ポジティブ**。どのプラグインも関心がない高速パスが照会元ごとにO（1）になる。
  レジストリのクエリがアロケーションをやめる。ノードルールのコストがプラグイン数で
  スケールしなくなる。プラグイン契約が宣言的のみになる — ADR-37がその述べた最終状態
  （「エンジンが走査を所有し、プラグインがチェックを所有する」）に呼び出しごとの表面でも
  到達する。コンパイル済みテーブルは凍結されRactor共有可能であり、ADR-15フェーズ4の
  ワーカーごとの再構築を縮める。
- **ネガティブ / 抱えるリスク**。 DSL語彙が3つの形式分増える（spec + ドキュメント +
  `rigor-plugin-author`スキルの更新）。5つの本番プラグインが入れ替わる。ファイルごとの
  ゲートは解析されるファイルごとに1つのプラグインコールバックを追加する。移行中の
  振る舞いのドリフトが実際のリスクであり、WD6のバイト単位同一ゲートが押さえる。フックの
  除去は未移行のサードパーティプラグインを壊す — リリース前のうちに意図的に受け入れる。

## 他のADRとの関係

- **ADR-2 / ADR-37** — インターフェース分離の弧を完成させる。ADR-2の「Flow
  Contribution Bundle」の呼び出しごとフックは置き換えられる（`FlowContribution`
  キャリア自体はマージャーの交換型として残る）。
- **ADR-44 / ADR-45** — 兄弟: ADR-44は尋ねるコストを削った。これは尋ねること自体を
  除去する。WD5の棄却はそれらの健全性の教訓を再利用する。
- **ADR-15** — 凍結テーブルはフェーズ4プールのためのRactor共有可能な入力である。
- **ADR-50** — 契約変更はv0.2.0のリハーサル誓約の前に着地する。WD2形式は、v1.0で
  凍結される列挙された公開表面の一部になる。
