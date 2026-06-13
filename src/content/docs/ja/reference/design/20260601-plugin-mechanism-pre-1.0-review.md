---
title: "プラグイン機構 1.0 前最終レビュー — 過不足・ペインポイント・ボイラープレート"
description: "Imported from rigortype/rigor docs/design/20260601-plugin-mechanism-pre-1.0-review.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260601-plugin-mechanism-pre-1.0-review.md"
sourcePath: "docs/design/20260601-plugin-mechanism-pre-1.0-review.md"
sourceSha: "81c5c29b3548caee9cfa89ca1150ce5933ef954ff527e207a7b58cec9f2df7bd"
sourceCommit: "94bccefcb8e324ea2322199418f33e80617b8e33"
sourceDate: "2026-06-14T00:35:49+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20265601
---

Status: Research / pre-1.0 optimization review. 非規範。受理された項目は個別ADR
（主に[ADR-2](../../adr/2-extension-api/)の改訂）とinternal-specにgraduateする。
本ノートは「正式リリース前に直すべきか/1.xに送るか」を仕分けるための棚卸し。

対象: `plugins/` 31エントリ + `examples/` 6ウォークスルー + コア
（`lib/rigor/plugin/`, `lib/rigor/source/`）のプラグイン向け表面。
2026-06-01時点のツリーに対する横断調査。各指摘はfile:lineで裏取り済み。

---

## 0. エグゼクティブサマリ

プラグイン契約そのもの（ADR-2が約束したScope / Type / Reflection / FactStore /
IoBoundary / 各manifestフィールド）は**実装されており機能している**。
`Scope#type_of`をはじめADR-2が約束したエンジンクエリはpluginに渡る
`scope:`経由で実際に露出している（gateされていない）。

問題は契約の有無ではなく、**契約と作者の間に「著者向けユーティリティ層」が無い**こと。
その結果、ほぼ全プラグインが同じ補助コードを再実装し、しかも再実装の過程で
微妙な差異（インフレクタ2種、camelize 2種、describe判定2種…）と
**実害のあるキャッシュ不整合バグ**を生んでいる。

優先度の高い順に:

1. **【バグ・要修正】** factorybot / pundit / sidekiqが`cache_for`に
   `descriptor:`を渡さず、プロセス跨ぎでdiscovery indexが無効化されない
   （ファイル編集してもウォームキャッシュがstaleを返す）。
2. **【契約ギャップ】**コアに`Source::NodeWalker`等が**存在するのにpluginに
   露出しておらず**、`diagnostics_for_file`のdocstringは「自分でrootを走査せよ」と
   明示。著者向けヘルパー層（walker / diagnosticビルダ / リテラル抽出 / did-you-mean /
   config既定値）の欠如が全ボイラープレートの根本原因。
3. **【契約ギャップ】** `Manifest#with(**overrides)`が無く、rbs-inlineが
   manifest 20フィールドを手書きコピーしている（フィールド追加で確実に腐る）。
4. **【1.0前に判断】** produced-but-unconsumedなADR-9 fact（graphql ×4 /
   dry-validation / dry-schema）と、docstringが約束するのに未実装の診断が複数。
   「公開契約として1.0に載せるか」を意図的に決める必要がある。
5. **【アーキテクチャ・1.0前に判断】**現行のfat `Plugin::Base`（多数の任意
   フックを持つ単一クラス）をPHPStanのようにnarrow interfaceへ分割すべきか
   → **§6**。結論を先取りすると、Rigorは既にmanifest宣言フィールド10個で
   PHPStan型の分割を達成しており、残るimperativeフック2個
   （`flow_contribution_for` / `diagnostics_for_file`）だけが「全員呼び出し・自前
   ゲート」のholdout。AIエージェントの把握しやすさ・テスト容易性の最終目標は、
   この2個を同じ宣言的・engine-gatedパターンへ寄せることで最もよく満たせる。
   フックのシグネチャは1.0で公開契約として凍結されるため、**分割するなら今**。
6. **【拡張種別の選別取り込み】** PHPStanの拡張**種類**のうちRubyで実需がありRigorに
   **未実装**のものを選別 → **§7**。最有力は`AdditionalConstructors`のRuby版
   = **`additional_initializers:`**（ivar型シードを`initialize`以外のrspec `before` /
   minitest `setup` / Rails callbackにも開く小機能、FP規律に直撃）。次点がsealed /
   網羅性（`AllowedSubTypes`版、ADR-36を完遂）。`ResultCacheMeta`等は**実装済みなので
   作らない**。

---

## 1. ボイラープレート（最大の発見）

### 1.1重複の規模（機械計測）

| 再実装パターン | 件数 | 代表箇所 |
| --- | --- | --- |
| AST再帰ウォーカー（`def walk` / `compact_child_nodes.each`） | **25プラグイン** | statesman.rb:152, actionpack（4コピー/1ファイル） |
| `Rigor::Analysis::Diagnostic.new`直接構築（`column: start_column+1`） | **23プラグイン** | 全diagnostic系 |
| PrismノードからリテラルSymbol/String抽出 | **20プラグイン** | statesman.rb:145,コア内でも4重複 |
| `config.fetch("x", DEFAULT_X)` + `DEFAULT_*`定数 | **17プラグイン** | statesman.rb:59-67 |
| `rescue StandardError → @load_error`一回限り発行 | **10プラグイン** | pundit.rb:102-118 |
| `levenshtein` / `did_you_mean`自前実装 | **4プラグイン** | statesman.rb:159-192, routes ↔ activerecordは逐語コピー |
| 定数パスserializer（`constant_path_name`/`qualified_name_for`） | **~12箇所**（pundit/sidekiq/rspecは1ファイル内2コピー） | sorbet ×4, lisp-eval, units |
| discoverer骨格（`walk_for_X`+`visit_class`+`read_safely`+`ruby_files_under`） | activejob/actioncable/activestorage/actionmailerほぼ逐語 | job_discoverer.rb |
| indexクラス（frozen `@by_name` + `find/known?/empty?/size/names`） | JobIndex/ChannelIndex/MailerIndex/WorkerIndex/PolicyIndex/FactoryIndex | worker_index.rb:12が「同じ封筒形」と自認 |

### 1.2根本原因 — コアにあるのに露出していない

| ヘルパー | コアに存在？ | pluginに公開？ |
| --- | --- | --- |
| ASTウォーカー | **あり** `Rigor::Source::NodeWalker`（node_walker.rb:17-35、`.each(root)` Enumerator） | ❌ `Services`非注入・drift spec非掲載。`base.rb:168-171`が「自分で走査せよ」と明示 |
| ノード→Diagnostic行 | 部分的（`Analysis::Diagnostic`はあるが`from_node`無し。コアも`check_rules.rb`で15+ 箇所インライン`start_column+1`） | ❌ ヘルパー無し |
| リテラルSymbol/String抽出 | ロジックは**コア内で4重複**（observation_collector.rb:310, generator.rb:895, return_type_heuristic.rb:78, synthetic_method_scanner.rb:544） | ❌ 抽出されていない |
| levenshtein / did-you-mean | **無し**（Ruby標準`DidYouMean::SpellChecker`はある） | ❌ net-new |
| config既定値 | **無し**（`config_schema`はkind検証のみ、defaultスロット無し） | ❌ |

→ コアが既に持つ #1（walker）・#3（リテラル抽出）を露出するだけで、plugin側の
コピペ表面の大半が消える。しかも #3はコア内の4重複も同時に解消できる
（双方向で元が取れる、最高ROI）。

### 1.3提案する著者向け層

ADR-2改訂として、以下を`Rigor::Plugin::Base`のインスタンスヘルパー
（または`Plugin::AstSupport` mixin / `services.`アクセサ）で提供:

- `walk(root) { |node| }` / `each_node(root)` ← `Source::NodeWalker`を再エクスポート
- `diagnostic(node, rule:, severity:, message:)` ← `start_column+1`規約を内包。
  併せて`Diagnostic.from_node(...)`をコアにも入れて`check_rules.rb`のインラインを統一
- `literal_symbol(node)` / `literal_string(node)` / `symbol_arguments(call)`
  ← `Rigor::Source::Literals`を新設、コア4重複も巻き取り
- `suggest(name, candidates)` ← `DidYouMean::SpellChecker`ラップ。
  statesman/routes/activerecordの自前levenshteinを全廃
- config既定値: `config_schema`のエントリ形を`{kind:, default:}`に拡張し、
  `Base#config`がconstruct時に既定値をマージ。`DEFAULT_*`定数イディオムを撤廃
  （`Manifest`スキーマ変更 → ADRノート必須）

### 1.4抽出すべき共通抽象（より大きな単位）

著者向けヘルパーの上に、繰り返される「プラグインの型」を基底クラス化:

- **`ProtocolContractChecker`基底**（ADR-28系）— hanami `ActionChecker`と
  web `ProtocolChecker`は`path_matches?` / `class_nodes` / `direct_defs` /
  `collect_direct_defs` / `singleton_def?` / `walk` / `class_name`が**逐語一致**。
  ADR-28プラグインが増えるほど線形に重複。arityチェック有無も揃う。
- **`ClassDiscoverer`基底 + `NameKeyedIndex`** — Rails discovery系
  （activejob/actioncable/activestorage/actionmailer）のdiscoverer + indexを
  base + 小さな抽出ブロックに圧縮。約4ファイル分のAST走査が消え、
  将来のPrismノードバグを4重に直す必要がなくなる。
- **`SourceScanner` mixin**（宣言収集系）— dry-types/dry-schema/dry-validation/
  graphql/statesmanが`scannable_paths` / `scan_file`-rescue / `tree_walk` /
  `constant_name_for`を再実装。しかもnil返し / `::`前置 / tail-matchと
  **挙動が割れており、それ自体がcorrectnessリスク**。1つの正規実装に統一。
- **`Plugin::Testing::Narrowing`** — rspec `MatcherAnalyzer`とminitest
  `AssertionAnalyzer`が`literal_value_for` / `nominal_type_for` /
  `FlowContribution::Fact`構築を逐語重複（ソースコメントが重複を自認）。
- **`Plugin::Inflector`** — routesが2つ・activerecordが1つ・
  actionmailer/actionpackが`underscore`を計4コピー。
  routes_parser.rb:1498-1534は「片方が他方を採用できるまで同期」と自認。

---

## 2. キャッシュ・I/O・信頼境界

### 2.1【バグ】descriptor無しdiscoveryキャッシュ（要修正）

factorybot / pundit / sidekiqは`cache_for(:index, params: {})`を
**`descriptor:`無し**で呼ぶ（factorybot.rb:142, pundit.rb:105, sidekiq.rb:99）。
するとcache keyは「同プロセス内でIoBoundaryが既に読んだファイル」だけに依存し、
フレッシュプロセスでは空 → policy/worker/factoryファイルを編集してもウォーム
`rigor check`が**staleを返す**。`base.rb:298-310`のdocstring自身がこれを
「discovery系は必ず`glob_descriptor`を渡せ」と警告している。

修正: `cache_for(:index, descriptor: glob_descriptor(@search_paths, "**/*.rb"))`。
factorybotの自前`prime_io_boundary_for_index`（glob_descriptorの劣化再発明）は削除。

### 2.2信頼境界バイパス

- rbs-inlineの`Synthesizer#call`が`File.read`を**直接**使用
  （rbs_inline.rb:62-67）。他プラグインが守る`io_boundary` / `TrustPolicy`を
  経由しない契約ギャップ。
- 一方examples/rigor-routes（routes.rb:98-106）は「read_file → digest記録 →
  cache_for」の順序依存を**正しく**教えるが、順序を崩すとサイレントに無効化が
  壊れる脆さ。コアに「このproducerが依存するファイル群」を宣言的に渡すAPIが
  あれば順序依存自体が消える。

### 2.3 2つのキャッシュ起動イディオム

`glob_descriptor(...)`渡し（i18n/actionmailer/actioncable）と
read-then-`cache_for`（routes/activejob/activerecord/actionpack）が混在。
同じ「初回descriptor空」問題を別々に解いている。1つに標準化すべき。

---

## 3. Manifest / 契約面

### 3.1 Manifestフィールドの肥大と`with`の欠如

`Manifest`は21フィールド・各`validate_*!`を持つまで成長
（manifest.rb:43-83）。これ自体は段階的拡張の結果で妥当だが、**コピー手段が無い**。

rbs-inlineはsynthesizerを後付けするためmanifest 20フィールドを
**手書きで逐語コピー**している（rbs_inline.rb:136-158）。新フィールド追加で確実に腐る。
→ `Manifest#with(**overrides)`をコアに追加（最優先の小修正）。
併せてrbs-inlineは唯一`init`でなく`initialize`をoverrideしており
（rbs_inline.rb:111-122）テンプレとして悪い前例 — `init`規約へ寄せる。

### 3.2 RBS-onlyプラグインのセレモニー

activesupport-core-extは「`signature_paths: ["sig"]`だけの空`Base`サブクラス +
`register`」（activesupport_core_ext.rb:23-33）。ADR-25の正規形ではあるが、
analyzerコード皆無の純RBSバンドルに約12行の定型クラスを強制している。
`.rigor.yml`のgem列挙だけでsignature_pathsを取り込める**宣言的経路**を検討。

### 3.3 ADR-2が約束して未提供の表面

- **`ContextInfo` companion（ADR-2 §Scope Object）が未実装**。pluginは
  `path`/`scope`/`root`のみ受け取り、lexical context（現在クラス/メソッド/
  可視性/assertion文脈）は自分でrootを走査して導出するしかない。
- loggerサービスはdeferred明記（services.rb:24-26）。許容。

---

## 4. 機能の過不足

### 4.1 produced-but-unconsumedなADR-9 fact（1.0前に判断）

- graphqlの4 fact（`:graphql_type_table`ほか）は**現状すべて読者なし**
  （graphql.rb:30-39が将来のdemand-driven消費者を挙げるのみ）。
- dry-validationの`:dry_validation_contracts`もproduced-but-unconsumed
  （消費するslice 2自体がdeferred、dry_validation.rb:29-40）。
- dry-schemaの`:dry_schema_table`も実消費者はdry-validation slice 2待ち。

→ 「1.0の公開契約としてfactを載せるか、消費者が来るまでinternalに留めるか」を
意図的に決める。produced-but-unconsumedのまま公開すると後方互換負債になる。

### 4.2 docstringが約束して未実装の診断（drift）

- sorbet: `dynamic.sorbet.unsupported` / `degraded`が未実装で、`T.proc`/`T::Struct`/
  `T::Enum`/`type_parameters`の`Dynamic[top]`降格が**完全にサイレント**
  （type_translator.rb:43-48）— ユーザーは型が落ちた事実を知れない。
- dry-types: `dry-types.unknown-alias` / `alias-shadow`（dry_types.rb:46-58）未実装。
- dry-schema: `unknown-predicate` / `unknown-type`（dry_schema.rb:69-76）未実装。
- statesman: docstring表に`event :sym`検証があるが実装は`state`/`transition_to`
  のみ（statesman.rb:43 vs collect/validate）。
- graphql: alias解決をdocstringが示唆するが未実装（`BaseObject = …; class X < BaseObject`は素通り）。

→ 各docstringを実装に合わせて下方修正するか、診断を実装する。1.0で
docstring=契約と読まれると約束違反になる。

### 4.3 lossyな`bool/Boolean → TrueClass`写像

dry-types（alias_scanner）/ dry-schema（schema_scanner.rb:24）/ graphql
（type_scanner.rb:23）がboolを`TrueClass`に写像。**`false`を誤型付け**する
プロジェクト横断の精度床。適切なboolキャリアに統一すべき。

### 4.4常時`:info`ノイズ

factorybot / pundit / sidekiq / statesmanが正しい呼び出し**全件**に`:info`
診断を出す（factory-call / policy-call / worker-call / known-state）。実プロジェクトで
出力を埋める。verbosityノブ裏に隠すか既定オフに。

### 4.5個別の過不足（多くはscoped deferral、優先度中〜低）

- devise: 合成メソッドが全て`Dynamic[T]`返し（return精度なし、slice 6待ち）。
  かつ`current_user`等コントローラヘルパーはscope外 — Deviseプラグインに
  ユーザーが最も期待する箇所が未提供（ADR通りの割り切りだが期待ギャップ最大）。
- activestorage: manifestが`consumes: model_index`を宣言するが**実際には読まない**
  （常にstandalone discovery、activerecordと同じ`app/models`を二重パース）。
  誤解を招く宣言 → 削除or実消費。
- pundit: 名前空間モデル（`Blog::Post`）のポリシ名解決が完全修飾形を仮定し、
  flat policy名のアプリで誤検知しうる（analyzer.rb:91-99）。
- actionpack: `unknown_helper_diagnostic`/`wrong_arity_diagnostic`が定義のみ未使用
  （~20行dead code）、`STRONG_PARAMS_RECEIVER_NAMES`の2名がdead config。
- dead data: i18n `value_kinds`、activejob `keyword_required`、actioncable
  `action_methods`が収集されるが未参照（キャッシュスライスに無駄に載る）。
- vendoredテーブルのdriftリスク: rspec-railsのRackステータス表、
  deviseのmodules表 — gemバージョンに対し検証なし。

### 4.6 examples（テンプレ）のanti-pattern教育

examplesは「プラグインの書き方」正典なので、ここのボイラープレートが実プラグインに
コピーされる。特に:

- deprecationsが`receiver:`照合を**ソース文字列等価**で教える（deprecations.rb:97-101）
  — `::User` / 改行 / 空白で取りこぼす。型ベースでないことをREADME明示すべき。
- lisp-eval/units/routesのコメントが「return-type contributionはv0.1.x待ち」と
  書くが**実コードは実装済み** — ドキュメントが実装に追いついていない。
- contract surfaceのカバレッジが例間で不均一（webはreturn-type conformanceまで
  あるがarity無し、hanamiはarityあり）。

---

## 5. 推奨アクション（優先度順）

### 1.0前に入れるべき（小さく・高ROI）

1. **factorybot/pundit/sidekiqのcache descriptorバグ修正**（§2.1）— correctness。
2. **`Manifest#with(**overrides)`追加**（§3.1）— rbs-inlineの20フィールド手写し撤去。
3. **著者向けヘルパー層の最小セット露出**（§1.3）— `Source::NodeWalker`再エクスポート、
   `Diagnostic.from_node` / `Base#diagnostic`、`Source::Literals`新設（コア4重複も解消）。
   ADR-2改訂1本で済む。これだけで25プラグインのコピペが消え、テンプレも健全化。
4. **docstring driftの一掃**（§4.2, §4.6）— 未実装診断の約束を下方修正、
   examplesのコメント/実装の齟齬を解消。コード変更ほぼ無しで契約の正直さが上がる。
5. **produced-but-unconsumed factの去就を決定**（§4.1）— 公開or internal留保。

### 1.0直後（中規模リファクタ）

6. **共通基底の抽出**（§1.4）— `ProtocolContractChecker` / `ClassDiscoverer`+
   `NameKeyedIndex` / `SourceScanner` / `Testing::Narrowing` / `Inflector`。
7. **config既定値スキーマ**（§1.3末尾）— `DEFAULT_*`イディオム撤廃。
8. **boolキャリア統一**（§4.3）、**infoノイズ既定オフ**（§4.4）、dead code/data除去（§4.5）。

### 1.x以降（要追加設計）

9. **`ContextInfo`の提供**（§3.3）、信頼境界の宣言的ファイル依存API（§2.2）、
   RBS-onlyプラグインの宣言的経路（§3.2）。

---

## 6. インターフェイス分割の検討 — PHPStan型vs現行fat `Plugin::Base`

> 最終目標: **AIエージェントが規則と機能を把握しやすく、テスト・検証しやすい**
> プラグインアーキテクチャ。パフォーマンス低減は副次（キャッシュで緩和可、非クリティカル）。

### 6.1現状の正確な再構成 — Rigorは既に「2/3」分割済み

「現行インターフェイスのままで十分か」を論じる前に、現状を正確に分類する。
Rigorのプラグイン拡張点は**2つのスタイルが併存**している:

| スタイル | 拡張点 | エンジンの扱い | ゲート | PHPStan型か |
| --- | --- | --- | --- | --- |
| **A. 宣言的manifestフィールド**（10個） | `block_as_methods` / `trait_registries` / `heredoc_templates` / `nested_class_templates` / `type_node_resolvers` / `protocol_contracts` / `hkt_registrations` / `hkt_definitions` / `source_rbs_synthesizer` / `owns_receivers` / `open_receivers` | 各フィールドを`registry.plugins`から`flat_map`で集約し、**エンジンがindex化**（`SyntheticMethodScanner`・`ResolverChain`・`Registry#contracts_for_path`等）。verb/receiver/class/pathで**エンジンがゲート** | エンジン側 | ✅ **既にPHPStan型** |
| **B. imperativeフック**（2個） | `flow_contribution_for(call_node:, scope:)` / `diagnostics_for_file(path:, scope:, root:)` | **全pluginを全node/fileに対して呼ぶ**。`registry.plugins.filter_map { … }`（`method_dispatcher.rb:663`と`statement_evaluator.rb:1379`に**逐語2重コピー**） | **plugin内の自前`if`** | ❌ fan-out + self-gate |

→ **論点の正しい立て方**: 「PHPStanの思想を採用すべきか」ではない。Rigorは
拡張点12個中10個で既に採用済み。問うべきは「残る2個のimperativeフックも
同じ宣言的・engine-gatedパターンに揃えるか（= 分割を**完遂**するか）」である。

### 6.2 PHPStanから移植すべき不変条件（1点だけ）

PHPStanは ~50のnarrow interfaceを持つが、本質は1つの不変条件:

> **cheapなgate述語**（bool/`nil`-decline）と**expensiveなpayload**（`Type`/error/
> dataを返す）を分離し、エンジンがgate値（`getClass()` / `getNodeType()`）で
> 拡張を**index化**して、payloadは一致node/receiverにだけ呼ぶ。

- 型推論3兄弟: `getClass()` + `isMethodSupported()`でゲート → `getTypeFromMethodCall()`は通過後のみ。
- ルール: `getNodeType()`でAST nodeクラス別にindex → 一致nodeにだけ`processNode()`。
- magic member: built-in reflectionの**miss時のみ** `hasMethod()`ゲート → `getMethod()`。
- 唯一のcatch-all（`ExpressionTypeResolverExtension`、ゲート無し）は**明示的に非推奨**の
  最終手段。
- **1クラス1インターフェイス**が支配的。frameworkパッケージは多数のnarrow拡張を登録する。
- per-interfaceのテスト基底（`RuleTestCase` = fixture+期待エラー集合、
  `TypeInferenceTestCase` = fixture中`assertType()`で推論型を文字列一致検証）。

現行RigorのBは、この不変条件を**唯一満たせていない**部分。

### 6.3提案 — 残る2フックをnarrow interface化

Bの2フックを、Aと同じ「manifest登録・エンジンindex・gate/payload分離」型へ割る。
PHPStanの対応関係をRubyに写すと:

**`flow_contribution_for`を2つに分割:**

```ruby
# (1) 戻り値変更（PHPStan DynamicMethodReturnTypeExtension 相当）
class DynamicReturnExtension
  def supported_receivers = ["ActiveRecord::Base"]   # gate: エンジンが receiver で index
  def supports?(method_name) = method_name == :find  # gate: cheap
  def return_type_for(call, scope) = ...             # payload: 一致時のみ
end

# (2) 述語/表明による narrowing（PHPStan TypeSpecifyingExtension 相当）
class TypeSpecifyingExtension
  def supported_methods = [:present?, :blank?]        # gate
  def specify(call, scope, edge) = ...               # payload → truthy/falsey/post_return facts
end
```

エンジンはreceiverクラスでindex（**既存の`owns_receivers` index機構を再利用可**）。
現行の「全pluginを全unresolved CallNodeに呼び、`FlowContribution::Merger`を毎回走らせる」
が消える。

**`diagnostics_for_file`を2つに分割:**

```ruby
# (3) node 単位ルール（PHPStan Rule<TNode> 相当）— これが要石
class NodeRule
  def node_type = Prism::CallNode                     # gate: エンジンが node クラス別に index
  def check(node, scope) = [...diagnostics]           # payload: 一致 node にだけ
end

# (4) ファイル単位ルール（escape valve, ExpressionTypeResolverExtension 相当）
class FileRule
  def check(path, root, scope) = [...]                # 真にクロスファイル/index 検証が要る時だけ
end
```

**(3) NodeRuleが要石**: エンジンがASTを**1回だけ**walkし、各nodeを
そのnodeクラスに登録されたruleにだけ配る。現状フックがraw `root`を渡して
「自分でwalkせよ」（`base.rb:168-171`）と言うからこそ §1の**25個の自前walker**が
存在する。エンジンがwalkを所有すれば、その存在理由ごと消える。
（4）は真に全ファイルを要するケース（cross-file index照合）の最終手段として残すが、
「最後の手段」と明示し既定の表面にはしない。

`prepare` / `produces` / `consumes`（FactProvider）は既に半宣言的 + topo順
（`loader.rb:230` Kahnソート、missing-producer/cycleをLoadError化）で、PHPStanの
Collectorに近い。名前付きinterfaceとして整える程度でよい。

### 6.4 3つの目標をどう満たすか

- **AIエージェントの把握しやすさ** ← 最重要。manifestが**機械可読なcapability宣言**に
  なる。「このpluginは`ActiveRecord::Base#find`の戻り値を変え、`CallNode`にruleを
  出す」がgrep / 列挙可能になり、self-gatingの`if`に埋もれない。さらに
  `rigor plugins --capabilities`型の**catalogueを生成可能**で、これはPHPStanが
  持たない「interface → gate → test harnessの機械可読インデックス」を提供できる
  （PHPStanを**上回れる**差別化点 — 調査で「PHPStanにinterface↔tagの機械可読
  レジストリは無い」と確認済み）。
- **テスト・検証容易性** ← interface分割と不可分。各narrow interfaceに専用ハーネス:
  NodeRule → node+scopeを与えdiagnosticsをassert（`RuleTestCase`相当）、
  DynamicReturnExtension → call+scopeを与え`Type`をassert（`TypeInferenceTestCase`
  相当）。現状は唯一のharnessが`run_plugin`（demo dirに書いて**フルRunner**を回し、
  downstreamの`call.undefined-method`文字列で**間接**検証 — `plugin_helpers.rb:109`、
  lisp-eval specが実例）。per-hookの単体検証手段が**存在しない**のが今の最大の弱点。
- **ボイラープレート低減**（§1と直結）— 25 walkerが消え、dispatch loopの2重コピーも
  単一indexed registryに集約。§1の著者向けヘルパー層は「分割しない場合の緩和策」、
  §6の分割は「ヘルパーが要る理由自体を消す」上位の解。
- **パフォーマンス**（副次）— エンジンがindexして非該当pluginをskip。現状の
  `plugins × files × nodes` fan-out（pre-filter皆無）が解消。ユーザー言及の通り
  クリティカルではないが、分割すれば**追加コストなしで**付いてくる。

### 6.5やり過ぎない規律

PHPStanの ~50 interfaceを全移植しない。今Rigorに要るのは**3〜4の新narrow
interface**（DynamicReturn / TypeSpecifying / NodeRule + FileRule escape valve）だけ。

- magic-member / dynamic reflection系 → **macro substrate（ADR-16）が既にカバー**。新設不要。
- dead-code（always-used）/ restricted-usage系 → demand-drivenで1.xに後置。
- catch-all（現`diagnostics_for_file`相当のFileRule）は残すが**非推奨の最終手段**と明示。

### 6.6移行とタイミング

- **対象31 pluginsだが大半は機械変換可能**。「単一walk → name一致でdiagnostic」型
  （statesman / pundit / sidekiq / factorybot / 多くのRails系）はNodeRuleにほぼ
  そのまま落ちる。Aの宣言系（sinatra / devise / dry-struct / typescript-utility-types /
  hanami・webの一部）は**既に分割済みで無改修**。
- **後方互換**: 旧fatフックをdeprecated-but-supportedなFileRule（catch-all）として
  残せば一括移行は不要。新interfaceを推奨経路にし、旧`diagnostics_for_file`は
  FileRuleにリネーム + 非推奨マーク。
- **タイミングが決定的論点**: フックのシグネチャは1.0で**公開契約として凍結**される。
  1.xでfatフックを割るのは破壊的変更。**やるなら今（pre-1.0）**。これが
  「現行のままで十分か」への最大の答え — *機能的には十分だが、分割の窓は今しか開いていない*。

### 6.7推奨

1. **1.0前**: (a) **NodeRule + engine-owned walk**を導入（boilerplate/テスト両面で最大
   効果、§1と直結）、（b）`flow_contribution_for`を**DynamicReturn + TypeSpecifying**に
   分割、（c）旧`diagnostics_for_file`を**FileRule**（非推奨catch-all）として残す。
2. 同時に**per-interfaceテスト基底**（NodeRule用・DynamicReturn用）を出す
   — テスト容易性の目標はinterface分割と同時にしか達成できない。
3. **機械可読capability catalogue**（manifest集約のdump / `rigor plugins --capabilities`）
   を出し、AIエージェントが拡張種別と各gateを列挙できるようにする。
4. dead-code / restricted-usage / 追加magic-member系は**demand-drivenで1.x**。

→ これはADR-2の改訂1本（「imperativeフック2個のnarrow-interface化とFactProvider
の名前付け」）として起票するのが収まりがよい。§1の著者向けヘルパー層は、この分割を
**段階導入する間の橋渡し**として先行投入できる（NodeRule化が済んだpluginから
walkerヘルパー依存が落ちていく）。

---

## 7. PHPStan拡張型の選別取り込み（型分割とは別軸）

§6は「フックの**形**をPHPStan化するか」。本節は「PHPStanが持つ**拡張の種類**のうち、
Rubyで実需がありRigorに**まだ無い**ものはどれか」。全 ~50 interfaceのうち、Rigorの
現状をfile:lineで裏取りした結果、取り込み価値があるのは少数に絞られた。
**ユーザー言及の`AdditionalConstructorsExtension`がまさに最有力**だった。

### 7.1選別マトリクス

| PHPStan拡張型 | Rigor現状（裏取り） | 取込価値 | FP規律との整合 | 判断 |
| --- | --- | --- | --- | --- |
| **AdditionalConstructors** → Ruby「追加initializer」 | **PARTIAL**: ivar型シードが`initialize` **のみ**（scope_indexer.rb:79, :214-220, :411） | **高** | ◎ | **取り込み推奨（小・先行）** |
| **AllowedSubTypes** → sealed / 網羅性 | **ABSENT**: `case/in`網羅性なし（statement_evaluator.rb:539-541）。ADR-36 WD3でsealed-parent factは既にspec済・`is_a?`網羅narrowingはdeferred（nested_class_template.rb:61-69） | **高** | ◎（網羅漏れを正しく検出） | **取り込み推奨（中・ADR-36と統合）** |
| **`Collector<TNode,TValue>`** | **PARTIAL**: FactStore+`prepare`はあるがper-node収集primitive無し、各pluginが自前re-walk（base.rb:166-178） | 中 | ○ | **§6のNodeRuleに統合**（cross-file集約版） |
| **MethodParameterClosureType**（yield引数型） | **PARTIAL**: `block_as_methods`は**self型のみ**（block_as_method.rb:47-51）。yield引数型はbuiltin+RBSのみ、plugin field無し | 中 | ○ | **manifestに`yields:`追加を検討（demand-driven）** |
| **AlwaysUsed* / ReadWriteProperties**（dead-code FP抑制） | **PARTIAL**: dead-codeは局所変数/分岐のみ（check_rules.rb:74, :1058）。メンバ単位の未使用検出は**無い** | 中（条件付き） | ◎（**抑制側**が要） | **メンバdead-codeを入れる時に抑制hookを同梱**（単体では入れない） |
| **RestrictedUsage系**（内部API / test-only） | **PARTIAL**: Rubyのprivate + Liskov overrideのみ（check_rules.rb:69-70）。呼出元制約は無し | 低〜中 | ○ | demand-drivenで1.x |
| **DiagnoseExtension**（`-vvv` troubleshooting） | **ABSENT**（plugin寄与なし）。`rigor triage`（ADR-23）はconsumer側で別形 | 低 | — | §6.4のcapability catalogueと抱き合わせで小さく |
| **ResultCacheMetaExtension** | **EXISTS**: `Cache::Descriptor::ConfigEntry` + `cache_for(descriptor:)`で任意外部状態をhash可能（descriptor.rb:120-141, base.rb:249-260） | — | — | **作らない（実装済）** |
| ExpressionType / Operator catch-all | N/A（§6.2の通り非推奨） | 低 | — | 見送り |
| magic-member reflection系 | macro substrate（ADR-16）でカバー | — | — | 作らない |

### 7.2最有力 — 「追加initializer」拡張（AdditionalConstructorsのRuby版）

PHPStanの`additional-constructors`は「`setUp()`等もconstructor扱いして
未初期化プロパティの**誤検知を消す**」小さな拡張。RigorにはPHPの未初期化
プロパティ検査そのものは無い（Rubyのivarは既定nil）が、**同じ構造のハードコード境界が
既にある**:

- `scope_indexer.rb:79` `build_class_ivar_index`がivar型を**`def_node.name == :initialize`の
  本体からのみ**シードし、read-before-write→nil寄与もそこにgate（:223-234）。
- rspec `before`/`let`、minitest `setup`、Railsのコールバック（`after_initialize`等）で
  ivarを確立するコードは**シード対象外** → 「`initialize`で代入していないivar」を
  nil含みと推論し、テスト/RailsコードでFPを生む温床。

→ **manifest宣言フィールド** `additional_initializers:`（PHPStanの宣言的
`additionalConstructors:`パラメータに対応）を追加し、`receiver_constraint` + メソッド名
集合で「このクラスではこれらも型シード源」と宣言できるようにする。§6.1のAスタイル
（宣言的・engine-gated）にそのまま乗る小機能で、§0の**false-positive discipline**に最も
直接効く。rigor-rspec / rigor-minitest / rigor-railsが即座に恩恵を受ける。
動的ロジックが要る稀なケース用に、`scope_indexer`側のseeding-site解決を
pluginが拡張できるhookも残せる（PHPStanが「単純例はconfig、動的例はextension」と
二段にしているのと同じ割り方）。

### 7.3高価値 — sealed / 網羅性（AllowedSubTypesのRuby版）

`case/in` / `case/when`の網羅性検査は現状ABSENT（statement_evaluator.rb:539-541が
「no exhaustiveness tracking yet」と自認）。ADR-36 WD3が既に**sealed-parent fact**を
spec済みで、`is_a?`横断の網羅narrowingは`Environment#class_ordering`配線待ちで
deferred（nested_class_template.rb:61-69）。

→ PHPStanの`AllowedSubTypesClassReflectionExtension`（`supports?` + `getAllowedSubTypes`）
に対応する**fact channel**（pluginが「この親型の許容サブ型は {A,B,C}」を宣言）を入れれば、
union減算の精度向上 + 網羅漏れ検出が両取りでき、**rigor-mangroveのEnum / dry-struct /
ADR-36**のペンディングが一気に解ける。FP規律とも整合（網羅していれば黙り、漏れだけ
報告）。engine側作業はやや重いが、既にspec済みの線をplugin契約に出すだけで設計の
新規性は低い。

### 7.4統合・demand-driven・作らない

- **Collector**（cross-file per-node収集）は §6の**NodeRuleのcross-file集約版**として
  自然に入る（engineが1回walkしてnodeを配る基盤の上に「集めてから消費」を足す）。
  独立機能にせず §6に畳む。
- **`yields:` manifest field**（block引数型）は、静的RBSで書けないcontext依存の
  yield型を持つDSL向け。`block_as_methods`のself型と対になる。demand-driven。
- **メンバdead-code + AlwaysUsed抑制**は**ペアで**のみ価値がある。Rubyは
  メタプログラミングでFPリスクが極端に高いので、検出だけ入れて抑制hookを欠くと
  §0の規律に反する。入れるなら「Rails callback / DSL登録メソッドを常時使用扱い」する
  抑制拡張を**同時に**出す前提。優先度は7.2/7.3の後。
- **RestrictedUsage / Diagnose**はdemand-driven（1.x）。
- **ResultCacheMetaは実装済み**（`ConfigEntry`）— 再実装しない。唯一の差は
  「専用コールバックが無く`ConfigEntry`を手組みする」ergonomicsのみ。

### 7.5推奨（§6との関係）

§6（フックの**形**＝narrow-interface化）と §7（拡張の**種類**）は独立に進められる。
1.0前の取り込み候補を优先度順に:

1. **`additional_initializers:`（7.2）** — 小・宣言的・FP規律直撃。最優先。
2. **sealed/AllowedSubTypes fact（7.3）** — ADR-36を完遂しMangrove/dry enumを解放。中。
3. Collectorは §6に統合、`yields:`とメンバdead-code+抑制はdemand-driven。

7.2は単独の小PR、7.3はADR-36の続き、両者とも §6のADR-2改訂とは別チケットに割ける。

---

## 付録: 健全なお手本（増やすべき形）

- **rigor-sinatra** — 最もクリーンなmanifest（BlockAsMethod 1つ + 9 verb）。
  walker/Diagnostic/indexコード皆無。substrateに荷を預けた理想形。
- **rigor-pattern**（example）— `services.type.literal_string_compatible?` /
  `scope.type_of`でエンジン協調し「文字列伝播を自前再実装しない」最良テンプレ。
  `literal-unknown` infoのfalse-positive disciplineも見本。
- **rigor-devise** — 宣言的TraitRegistryでアナライザコードゼロ
  （return精度の床は別途課題だが、構造としては他が目指すべき形）。

これらの共通点は「substrate / エンジンクエリに荷を預け、自前ASTコードを書かない」。
§1の著者向け層と §1.4の基底クラスが揃えば、walker系プラグインも
この水準のコード量に近づける。
