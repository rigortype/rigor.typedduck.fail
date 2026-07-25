---
title: "internal-specのステータス忠実度の一掃（ADR-92プローブ、2026-07-25）"
description: "rigortype/rigor docs/notes/20260725-internal-spec-status-fidelity-sweep.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260725-internal-spec-status-fidelity-sweep.md"
sourcePath: "docs/notes/20260725-internal-spec-status-fidelity-sweep.md"
sourceSha: "b9375a6a9144bc2e4ca0802f9be38c825ec3a13c7388d56d5c51c50bf15d18b7"
sourceCommit: "e3eb424c3c88035e453246710c8df3dc5cc8e7e1"
translationStatus: "translated"
sidebar:
  order: 20266725
---

[#163](https://github.com/rigortype/rigor/issues/163)。ADR-92の規範的ステータス忠実度プローブは
[`internal-type-api.md`](../../internal-spec/internal-type-api/)に対してのみ実行された;読み順テーブルは
一掃されなかった他の14の文書を挙げている。この台帳は文書ごとにプローブを記録する —— 何が確認され、
何が見つかり、何が手つかずで残されたか —— ので、次の一掃はゼロからではなくエビデンスから始められる。

**プローブ**。各文書について: その文書が*列挙する*サーフェス（ADR-92 WD1は列挙可能な宣言テーブルを
拘束するのであって、約836個の散文の`MUST`ではない）を取り、それぞれについて、書かれているとおりに
`lib/`に存在するかを問う。乖離ごとに、ADR-92の決定に従い3つの帰結がある: 実装するか、条項を出荷済みの
ものに狭めるか、ギャップをマークするか。沈黙は決してその1つにはならない。

機械的な事前パス（各文書からバッククォート付きの`Foo::Bar` / `#method` / `CONSTANT`をすべて抽出し、
`lib/`内に定義箇所があるかを確認する）は、裏付けのない名前を**1つも**見つけなかった: それが生み出した
5件のヒットはすべて、文書がすでに正しいケースだ —— 削除済みと記述されているフック
（`#flow_contribution_for`、ADR-52 WD3）、明示的に仮定上のクラス（`Rigor::Type::IntegerType`）、
仕様側のスナップショット定数、そしてPrism / Rubyコアのメソッドだ。ADR-92クラスは名前のドリフトでは
ない;それは、出荷されたことのない*振る舞い*を現在形で述べている文書だ。それにはgrepではなく読むことが
必要だ —— ADR-92 WD1がすでに言っているとおり。

## 発見

### `implementation-expectations.md` —— § Engine surfaceの2つの野心的な箇条書き

この文書の§ *Engine surface*は、「コア型エンジンが公開しなければならない（MUST expose）もの」の9項目の
箇条書きによる列挙だ。7つは出荷済み。2つはそうではない:

- **「推論が停止した理由を保持する、推論バジェットと不完全推論の結果」**。不完全推論の結果を運ぶ
  キャリアは`lib/`のどこにもなく（`IncompleteInference`も`incomplete_inference`もない）、設定可能な
  `budgets:`サーフェスは配線されていない —— これは[`inference-budgets.md:75`](../../type-specification/inference-budgets/)が
  すでにマークしており、この文書はしていない。出荷済みのもの: 3つのハードコードされた再帰 /
  ファンアウトのガード、ADR-10のgemごとのバジェット（`Configuration::Dependencies::DEFAULT_BUDGET_PER_GEM`、
  `budget_overrun_strategy`）、そして`DynamicOrigin::ANALYZER_BUDGET_CUTOFF`だ —— これは*ある*理由を、
  結果オブジェクトとしてではなく値に対する由来の原因として保持する。それを消費する診断ファミリー
  （`static.incomplete-inference.*`）はReserved（予約済み）だ。
- **「メソッドごとの要件サマリーをキャッシュでき、利用可能なときはそれらをインデックス済みの名前付き
  インターフェースと突き合わせ、突き合わせが曖昧または高コストすぎるときは匿名シェイプを保つ、
  ケイパビリティロール推論」。**`capability.role` / `requirement.summar` / `role.inference`は**2つの
  仕様コーパスにまたがる11の文書にマッチし、`lib/`内では0ファイル**にマッチする;`interface_match` /
  `named_interface` / `structural_interface` / `InterfaceIndex`も同様だ。出荷済みなのは*明示的な*半分だ:
  `RbsExtended::ConformanceChecker`は`conforms-to`ディレクティブをRBS定義のインターフェースと突き合わせて
  チェックし（存在 + シグネチャ互換性）、`rbs_extended.unsatisfied-conformance`がそれを報告する。推論の
  半分 —— メソッド本体から要求されるロールを導出し、それを突き合わせること —— は、まさに
  [`control-flow-analysis.md:221`](../../type-specification/control-flow-analysis/)がすでに先送りとして
  挙げているものだ。つまり2つのコーパスは互いに矛盾しており、そして現在形で未出荷の半分を述べているのは
  internal-spec側だ。

### `reflection.md` —— サーフェスは正確;ステータスのフレーミングは3バージョン分古い

§ *Public API*の下に列挙された13のメソッドはすべて、文書化されたシグネチャとキーワード形状で
[`lib/rigor/reflection.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/reflection.rb)に
存在する。ドリフトは契約ではなくフレーミングにある:

- Statusの行は文書を**v0.0.7**にピン留めし、そのファサードを「v0.1.0プラグインAPIがそれに対して
  設計される**ことになる**基盤」と説明している。v0.1.0はとうの昔に出荷された;現在のリリースはv0.3.0だ。
- § *Future evolution*は「v0.1.0プラグインAPIはこのモジュールを3つの軸に沿って拡張する」と述べている
  —— 由来の`(value, source_family)`ペア、統一されたRigor側の`MethodDefinition`キャリア、そして
  キャッシュスライスの記述子だ。**3つのいずれも`lib/rigor/reflection.rb`にない**;このモジュールは由来の
  サーフェスをまったく持たない。文書を額面どおりに受け取る読者は、3つすべてがv0.1.0時点で存在すると
  予想するだろう。

これは仕様文書に適用されたADR-49の軸6だ: それを伴わずにその後出荷されたバージョンにピン留めされた
未来形の約束は、事後には、それが出荷されたという主張とまったく同じように読める。

### `worker-session.md` —— 列挙不足のコンストラクタ、偽の主張はなし

§ *Shareable inputs*は「コンストラクタは、ワーカー境界を安全にまたぐ入力のみを受け取る」で始まり、
それらを列挙している —— しかし`source_files:`と`record_dependencies:`を省いており、そのどちらも
`WorkerSession#initialize`が今日受け取るものだ。そして§ *Ownership boundary*は`#drain_dependencies`
（`record_dependencies:`が設定されているときに`#analyze`がラップする、ADR-46の依存関係記録ウィンドウ）
に言及していない。文書が*述べている*ことはすべて正確で、同値契約や構築時`prepare`ルールも含まれる。
これはADR-46の着地による完全性のドリフトであって、野心的な主張ではない。

### `flow-contribution.md` —— 文書がマージャーについて自己矛盾している

§ Statusは「v0.0.9はバンドル構造体そのものだけを出荷する —— マージャーはv0.1.0でプラグインAPIとともに
**着地する**」と言い、§ *Slot definitions*は「v0.1.0で着地するマージャーはタグ付き要素形式を定義する
**ことになる**」と言う。どちらも古い: 同じ文書の§ *Element-list flattening*は、`#to_element_list`が
マージャーとともに**v0.1.0で出荷された**ことを正しく記録しており、
[`flow-contribution-merger.md`](../../internal-spec/flow-contribution-merger/)がそれを規定している。
列挙された8スロットのテーブルそのものは、`role_conformance`を含め、`lib/rigor/flow_contribution.rb`に
対して正確だ。

### `plugin-trust.md` —— 期限切れになった先送り

§ *What slice 2 deliberately does NOT do*は「スライス2は記述子を構築するだけ;**まだ何もそれを消費
しない**」で締めくくられている。それは実行結果キャッシュが着地して以来、偽だ:
`Analysis::Runner#run_dependency_descriptor`は各プラグインの`@io_boundary`を読み、
`boundary.cache_descriptor.files`を実行の依存関係記述子に畳み込むので、境界の読み取りは解析済みや
`sig`のファイルと同じく無効化に参加する。これはADR-92クラスの*逆*だ —— 出荷済みのものを過少主張する
文書 —— であり、ADR-92 WD4が「マーカーが期限切れになる」と呼ぶケースだ。文書内の列挙されたサーフェスは
すべて（`TrustPolicy`のフィールドと述語、3つの`IoBoundary`メソッド、7つの`AccessDeniedError`の理由、
3つの`Services`メソッド）正確で、`public_api_drift_spec`によってドリフトピン留めされている。この
セクションにはまた、2つのリスト項目のあいだに挟み込まれた迷子の段落があり、レンダリング出力でリストを
分断していた;同じパスで修正した。

### `baseline.md` —— クリーン

バケットキーのタプル、両方のマッチモード、`count`の多重度ルール、そして`CURRENT_VERSION = 1`は
すべて[`lib/rigor/analysis/baseline.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/baseline.rb)に
正確にマッチする。

### プローブした深さではクリーン

- **`config.md`** —— 2つの信頼できる情報源の分割、3つの検証ティア、`KNOWN_KEYS` /
  `RESERVED_NAMESPACES` / `#unknown_keys`、そして3つのゲート軸すべてが`lib/rigor/configuration.rb`と
  `spec/rigor/config_schema_spec.rb`にマッチする。
- **`diagnostic-shape.md`** —— 10のフィールドすべてが`Diagnostic`の`attr_reader`リストにマッチする;
  両方のファクトリー、`qualified_rule`の導出、そして`evidence_tier` / `documentation_url`の
  `enrich_json`のみへの配置は正確だ。
- **`inference-engine.md`** —— 安定性契約の列挙されたサーフェスは保たれており、完全なFallback Tracer
  プロトコル（`record_fallback` / `events` / `empty?` / `size` / `each`）を含む。その「Slice N」の
  フレーミングは、依然として拘束する規範的ルールをめぐる歴史的な語りであって、ステータスの主張ではない。
- **`macro-substrate.md`**、**`plugin-cache-producers.md`**、**`dependency-source-inference.md`** ——
  これらはすでにADR-92のルーブリックを促されずに実践している: 各先送りは宣言箇所でマークされている
  （`:receiver_singleton` / `:dsl_recorder`は「予約された名前、まだ受理されていない」;スコープ外とされた
  v0.0.9の`Reflection`の持ち越し;先送りされたメソッドごとの戻り値精度）、そして
  `plugin-cache-producers.md`は置き換えられた項目に、それを置き換えたADRで注釈さえ付けている。

## 第2パス —— 3つの大きな文書、行ごとに読む

第1パスは`inference-engine.md`（614）、`plugin.md`（719）、`cache.md`（836）を、列挙されたサーフェスの
レベルに留めた。それらはその後、独立コンテキストのエージェント1体ずつで主張ごとに監査され、すべての
発見は`file:line`のエビデンスを持つことが要求され、そして負荷を担うものは何かを適用する前に`lib/`に
対して再検証された。3つの文書は合わせて**31件の発見**を生み出した —— 8つの文書にわたる第1パスの率の
4倍であり、これは予想どおりの形だ: これらはコーパスで最も古く最も大きい文書であり、そしてサイズこそが、
見直されていない文が隠れる場所だ。

### `cache.md` —— 12件の発見

このサブシステムはADR-6、ADR-45、ADR-54、ADR-60、ADR-87、ADR-46を経て変転してきた;文書は大きな構造的
変更は追えたが、より早いスライスのために書かれた文を取りこぼした。

- **プラグイン作者にデバッグセッション1回分の代償を払わせていたであろうもの**。§ `fetch_or_validate`は、
  `Marshal`クリーンでない書き込みが「飲み込まれる: 新たに計算された値が返され、次の実行で再計算される」
  と述べていた。`try_write_entry`は`SystemCallError, IOError`のみをrescueする
  （[`store.rb:496`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cache/store.rb)） ——
  プロデューサー契約違反は意図的に**実行を例外送出して中断する**のであり、`store_spec.rb:363`が
  その方向にピン留めしている。文書は、コードが可視性を約束している場所で、優雅な劣化を約束していた。
- **`StandardError`として語られている2つのrescue節**は、`lib/`では`::RBS::BaseError`だ
  （`rbs_loader.rb:644`、`rbs_constant_table.rb:26`）。どちらにも、狭いrescueが意図的だというコメントが
  付いている —— 広いrescueがv0.0.9のリグレッションを隠していたのだ。文書に従った移植は、それを再導入して
  しまうだろう。
- **期限切れの予約**。§ Diagnostic provenanceは、非デフォルトの`source_family`を設定するプロダクション
  呼び出し元はないと述べていた;4つが設定する（`:rbs_extended`、`plugin.<id>`、`:contribution_merge`、
  `:plugin_loader`）。今なお予約されているのは`generated.<provider>`だけで、今はマーカーとともにそう
  述べている。
- **コードとは逆順だったカウンタの増加順序**、厳格性の順序付けから欠けている`:stat`比較器、意図的に
  持たないメソッドに帰属されたインプロセスのメモ、実際には3つあるのに「唯一のプロデューサー向けの
  エントリーポイント」という記述、自らを追い越したスライスの語り、プロデューサーが2つと設定スロットが
  1つ足りない記述子セクション、そして確認可能な両方のフィールドが古い`--cache-stats`のサンプルだ。

このサンプルの修正はパターンとして記録する価値がある: マーカーは文字どおりgemバージョンを含むので、
ピン留めされたサンプルはどれも次のリリースで腐る —— この一掃が閉じるために存在する、まさに同じ失敗の
クラスだ。それは今や、現在のリテラル**と**、それが組み立てられる構成要素の両方を持つので、将来の読者は
`lib/`を読まずに、古さと欠陥を見分けられる。

### `inference-engine.md` —— 12件の発見

- **`lib/`が違反している規範的な純粋性の条項**。文書は`type_of`が「レシーバースコープや、そこから
  到達可能なオブジェクトをMUST NOT mutate（変更してはならない）」と、そしてフォールバックトレーサーが
  「`Scope#type_of`から観測できる唯一の可変状態だ」と述べている。2つのアイデンティティキー付きの
  サイドテーブル —— `dynamic_origins`（ADR-75 / ADR-82）と`void_origins`（ADR-100） —— は、`type_of`の
  最中、フォールバックパス上で、`tracer:`に関係なくその場で書き込まれ
  （[`expression_typer.rb:934`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb)と
  他に十数箇所）、公開リーダーになっている。由来モデルはこの条項より後にでき、文書はそれに一切言及して
  いない。依然として成り立つこと —— 戻り値とすべてのフロー状態フィールドは純粋で、テーブルは`Scope#==` /
  `#hash`から除外され、型付けの決定に読み戻されることは決してない —— は、行き過ぎた条項から推論させる
  ままにするのではなく、今や保証として明記されている。
- **2つの自己矛盾**。`&&` / `||`の結果型のMUST（「2つのオペランド型のユニオン」、ナローイング
  （narrowing）は後のスライスに先送り）は、同じ文書の240行あとと、*ナローイングされた*左辺のエッジを
  右辺とユニオンする`statement_evaluator.rb:1250`によって矛盾させられている。複合代入の先送りは、18行
  あとの、着地したハンドラを説明するセクションによって矛盾させられている。
- **`OverloadSelector`の契約は、宣言順に対する単一の最初マッチ優先のパスとして記述されていた**。実際
  には、レシーバー親和性によってすでに並べ替えられたリストに対する3つの順序付きパス
  （strict → alias-strict-arm → gradual）であり、そのため漸進的にマッチする最初のオーバーロードが、
  厳格にマッチする後続のものに負ける。
- **現在形で依然として名指しされている削除済みのサーフェス** —— `with_declared_types`は、その文以外
  リポジトリのどこにも存在せず、その削除を*この同じ文書*が280行前に記録している。機械的なバッククォート
  事前パスはそれを捕まえるべきだったが、しなかった: それは文書がバッククォート内に綴った名前だけを
  `lib/`と照合するもので、これはそのように綴られている —— 事前パスのギャップ、今や既知だ。
- さらに、55を出荷するのに11個の名前として列挙された`DEFAULT_LIBRARIES`、2つ足りない`DiscoveryIndex`の
  フィールドリスト、`call_node:`を欠く`dispatch`シグネチャ、2つの生きたティアを欠くティア順（うち1つは
  「最初」より上）、そして実際にはシードされたスコープであるのに、呼び出し元の`default_scope`として
  記述された`ScopeIndexer.index`の`Hash#default`だ。

### `plugin.md` —— 7件の発見、うち1つは一掃の最良の収穫

**文書はプラグイン作者に、3つの生きたAPIが削除されたと伝えていた**。ADR-80は`type_specifier` →
`narrowing_facts`とリネームし、機械的なリネームが**旧**サーフェスを名指しするはずだった括弧書きを一掃して
しまった —— その結果、文は「古い動詞……は0.3.0でなくなり、リーダー（`narrowing_facts_rules`）、エンジン
消費者（`#narrowing_facts_for`）、そしてケイパビリティキー（`narrowing_facts_methods`）もともになくなる」
と読める。3つすべては*現在の*綴りであり、3つすべてが出荷され
（[`base.rb:413`](https://github.com/rigortype/rigor/blob/master/lib/rigor/plugin/base.rb)、`:548`、
`plugins_renderer.rb:109`）、うち2つは`public_api_drift_spec`によって生きているとピン留めされている。
文書はドリフト仕様に直接、そして自身に2度、矛盾している。この文の読者は、まさにそれらの名前*へ*移行せよ
と言われたばかりのプラグイン作者だ。

このリネームの被害範囲こそが教訓だ: 散文に対する検索置換は、*使われている*名前と、*削除されたものとして
引用されている*名前を区別できず、後者の読みは意味を反転させる。

残り: エンジンはもはや`#node_rule_diagnostics`を呼び出さない（ADR-52 WD4がディスパッチを1つの共有ウォーク
に移した;このインスタンスメソッドはプラグインのspec用に生き残っている）、`tableize`は意図的に
`ActiveSupport::Inflector`へ委譲**しない**のに、委譲すると文書化されている（ASは`admin/users`を返すが、
ActiveRecordの実際のテーブル名は`admin_users`だ —— 文書に従った移植は、名前空間付きのモデルすべてで
間違う）、`additional_initializers`はその`block_methods:`ティアを欠いている、`plugins:`のエントリーの
形は`enabled:`を欠いている（自動配線されるデフォルトに対するADR-93のオプトアウト）、`#prepare`は
一度だけ実行されると記述されているが、実際には*プラグインインスタンスごとに*一度実行される ——
コーディネーター＋各フォークワーカー —— そして文書自身が追い越すv0.1.0のステータスアンカーだ。

## カバレッジ —— 各文書が実際に得た深さ

道具についての正直さ、というのも、自身のカバレッジを過大主張する一掃こそ、この台帳が防ぐために存在する
失敗だからだ:

- **18の文書すべて**が、機械的な名前レベルの事前パスを受けた（バッククォート付きのサーフェスすべてを
  `lib/`内の定義箇所と照合）—— 上で述べたとおりクリーンだ。
- **全文を読み、主張ごとにプローブした:** `implementation-expectations.md`、`reflection.md`、
  `worker-session.md`、`baseline.md`、`diagnostic-shape.md`、`config.md`、`plugin-trust.md`、
  `flow-contribution.md`。
- **列挙されたサーフェスとステータス主張のレベルでプローブし、行ごとには読んでいない:**
  `inference-engine.md`（614）、`plugin.md`（719）、`cache.md`（836）、
  `dependency-source-inference.md`（475）、`flow-contribution-merger.md`（223）、
  `plugin-cache-producers.md`（267）、`macro-substrate.md`（195）、`public-api.md`（194）。
  バージョンに固定された未来形と先送りの言い回しを求めるコーパス全体のgrepが、それらすべてをカバーした;
  それが生み出したヒットは上で裁定されている。#163がオープンのままなら、3つの大きな文書の完全な主張
  ごとの読みが明らかな次のスライスだ。

## 支配的なクラス、そしてそれがゲートに示唆すること

`internal-type-api.md` —— ADR-92が一掃した唯一の文書 —— は*一度も実装されなかった*クラスだった。それを
繰り返しているのは`implementation-expectations.md`だけだ。コーパスの残りにおける支配的なクラスは異なり、
予期されていなかった: **リリースがその後追い越した、バージョンに固定された未来形**だ。「マージャーは
v0.1.0で着地する」「v0.1.0プラグインAPIはこのモジュールを拡張する」「まだ何もそれを消費しない」は、
書かれた時点ではすべて真で、今はすべて偽であり、コーパスにはそれらを期限切れにするものが何もない。5件の
発見のうち3件がその形だ。

ADR-92のWD4ゲートはこのクラスを見られない —— それは診断ファミリーのテーブルを読む。それを見られる
安価なゲートは: `Rigor::VERSION`がそのバージョンを過ぎたら、リリース済みのバージョンを未来形で名指しする
仕様の文（「v0.1.0で着地する」「〜することになる」「v0.1.0が導入する」）をフラグ付けするものだ。それは
これほど小さいコーパスに対する機械的で偽陽性の少ないチェックであり、これら5件のうち3件を、読者が捕まえる
前に捕まえていただろう。この一掃に紛れ込ませるよりも、独自のissueに値する。

**同日に構築**（[#211](https://github.com/rigortype/rigor/issues/211)） —— `manual_drift_spec.rb`の
軸6で、ADR-92 WD6として記録された。生きたコーパスに対して較正されるあいだに教えた2つのこと、どちらも
今はチェックにエンコードされている:

- **箇条書きは文ではない**。ハードラップされた段落を結合すると、あるリスト項目のマーカーが次の項目の
  バージョンリテラルと対になり、その軸は誰も書いていない文を報告する。リスト項目とテーブル行は、まず
  それぞれ独自の単位として分割される。
- **文を共有することは約束されていることではない**。「v0.0.9の持ち越しを再試行する……その作業はスコープ外
  とされ、別のv0.1.xのチケットで着地する」は、別の何かを約束しつつ、*歴史*のために古いバージョンを名指し
  している。バージョンはマーカーの短い窓の中に位置しなければならない —— 約束がバージョンを*支配*しなければ
  ならない。

ゲートは床であって天井ではない: `public-api.md`は、それがマッチしない3つの古い文を抱えていた
（「v0.1.0がそれらを批准するまで」「v0.1.0プラグイン可観測性のストーリーが確定するにつれ依然として流動的」
「プラグイン側キャッシュプロデューサーが乗る**ことになる**唯一のもの」 —— 実際には乗っている）。読むことで
見つけ、同じパスで修正した。ADR-92 WD1に従い、手動プローブが散文本体のための道具であり続ける。
