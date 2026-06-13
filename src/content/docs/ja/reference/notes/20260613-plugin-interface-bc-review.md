---
title: "プラグインインターフェイス最終レビュー — v1.0 凍結前の BC-break 機会監査"
description: "Imported from rigortype/rigor docs/notes/20260613-plugin-interface-bc-review.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260613-plugin-interface-bc-review.md"
sourcePath: "docs/notes/20260613-plugin-interface-bc-review.md"
sourceSha: "293a93c8c0a1285978ee0c345663aa634b4d1209c4d5da18fc57b5faf353a262"
sourceCommit: "bf5d5216eed7167036f5c702b3f8003b390fcd8c"
sourceDate: "2026-06-13T17:22:26+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266613
---

*2026-06-13. Status: pre-freeze interface review — informational, feeding the release
decision and any final plugin-API BC-break work. The spec and ADRs bind. Observations
against working tree @ `c1bddcc2` (v0.1.18 released), production plugins 31 +
examples 6を全数調査（大型8プラグインは精読、残りはgrep + 抜粋）。*

## Question

ADR-50はv1.0.0で公開プラグイン面（DSL名・Manifestフィールド・`Services` /
`FactStore` / `Scope`公開リーダー）を凍結する。**いまが互換性を壊せる最後の窓**。
ADR-37（インターフェイス分離）→ ADR-52（コンパイル済み貢献ディスパッチ、
`flow_contribution_for`削除込み）→ ADR-53 Track B（walk一本化）が着地した現在の
契約面を、（a）パフォーマンス、（b）プラグイン執筆体験の両面から評価し、
「凍結前に壊すべきもの」「追加で足せば済むもの」「壊さないと裁定するもの」を
仕分ける。

## 結論サマリ

**パフォーマンス面でBC breakを要する構造問題はもう残っていない**。 2026-06-10
監査の所見1–6はADR-52/53で全て着地し、ホットパス（per-dispatch / per-node）は
すべてコンパイル済みインデックスでゲートされている。残る最適化はインターフェイス
形状と独立。

**執筆体験面の摩擦は実在するが、大半は追加的（additive）に解消できる**。真に
BC breakを要する候補は3件 — （1）未配線`external_files:`フィールドの凍結前撤去、
（2）マクロvalue object群の命名不統一の正規化、（3）`io_boundary` → `cache_for`
の順序依存契約の宣言化。いずれもADR-52 slice 5bの先例（load時エラー +
CHANGELOG移行表 + bundled全数同時移行 + corpus byte-identicalゲート）で安全に
実行できる。

## 1. パフォーマンス面 — 2026-06-10監査からの差分

[前回監査](../20260610-plugin-architecture-perf-audit/)の所見ごとの現状:

| 所見（2026-06-10） | 現状（2026-06-13） |
| --- | --- |
| 1. `flow_contribution_for`がゲート不能 | **解消** — ADR-52 WD3でフック削除（load時`ArgumentError`）。全5レガシーユーザーが`dynamic_return`の静的/`methods:` callable/`file_methods:`ゲートへ移行済み |
| 2. 同一コールノードへの二重問い合わせ | **解消** — 戻り値は`MethodDispatcher`、post-return factsは`StatementEvaluator`と関心ごとに1経路ずつ。各経路とも`ContributionIndex`のO（1）メソッド名ゲートが先に立つ |
| 3. メソッド名の横断インデックス不在 | **解消** — ADR-52 WD1のコンパイル済みテーブル（`dispatch_candidate?` / `dynamic_candidate_for?` / verb-keyed `block_entries_for`） |
| 4. Registry集約クエリの毎回再計算 | **解消** — `open_receivers` Set化、`owns_receiver?` per-env祖先メモ、`contracts_for_path` per-pathメモ、`additional_initializers`凍結配列 |
| 5. node_rule walkがプラグインごと | **解消** — `Plugin::NodeRuleWalk`（ADR-52 WD4）でファイルごと1 walk、`is_a?`照合は具象ノードクラスごとにメモ、`NodeContext`はノードごと遅延1個。ADR-53 B4でbuilt-inルールwalkとも収斂 |
| 6. `MacroBlockSelfType`線形照合 | **解消** — verbキーのHash引き |

残るコールドパス（per-file fnmatchの`protocol_contracts`（per-pathメモ済み）、
`type_node_resolvers`チェーン（`%a{rigor:v1:…}` payload解析時のみ）、
`source_rbs_synthesizer`（env構築時per-file 1回））はいずれも頻度・コストとも
許容域で、ゲート化しても観測可能な差は出ない。**インターフェイスの形がボトルネックを
強制する箇所は無くなった** — これがADR-37→52アークの完成形であり、凍結に耐える。

唯一の将来リスクは「新しい貢献形が増えるたびにContributionIndexへのゲート追加が
必要」という規律の維持だが、これはADR-52のcriterion（*キーを宣言できない
capabilityはDSL語彙の欠落であって、アンゲートフックの免罪符ではない*）として
既に規範化されている。凍結対象はこのcriterionごと、と確認しておけばよい。

## 2. 執筆体験面 — 実測した摩擦

37プラグイン（production 31 + examples 6）の利用実態。

### 2.1採用頻度の偏り（実測値）

| 面 | 利用数 | 備考 |
| --- | --- | --- |
| `manifest` / `init` | 37 / ~32 | 全数 |
| `node_rule` | ~23 | 診断系の標準路。定着 |
| `config_schema:`（default込み） | ~20 | ADR-40で定着 |
| `producer` + `cache_for` | ~14–16 | Rails系ディスカバリの標準路 |
| `diagnostics_for_file` | **15** | file-level診断（load error報告・クロスファイル検証）の正当用途が主 |
| `dynamic_return` | 11 | ADR-52移行完了後の唯一の戻り値寄与面 |
| `type_specifier` | **3**（rspec / sorbet / minitest） | 設計上は健全、周知が弱い |
| `protocol_contracts:` | 3 | ADR-28。Hanami系のみ |
| `block_as_methods` / `heredoc_templates` / `trait_registries` | 2 / 2 / 1 | ADR-16基盤。少数だが配線済み・稼働中 |
| `TypeNodeResolver` | **1**（typescript-utility-types） | ADR-13。ニッチか発見性不足か要切り分け |
| `additional_initializers:` | 1 | ADR-38 |
| `external_files:` | **0（かつエンジン消費者ゼロ）** | § 3.1参照 |

少数利用そのものは欠陥ではない（ADR-16/13/28はいずれも特定形状向けの基盤で、
node_ruleが診断系のデフォルトであることはむしろ意図どおり）。問題は**0利用かつ
0配線のまま凍結に向かうフィールド**（external_files）と、**存在が
ドキュメント/SKILLから見えない面**（type_specifier / TypeNodeResolver）の2種。

### 2.2ボイラープレートの再発パターン（実測値）

1. **fact-store / producer読み出しの手書き遅延メモ化** — `*_index_or_nil`私的
   ヘルパーが**12プラグイン**（13個）、うち4つは「nil結果と未照会を区別する」
   `@x_resolved`フラグ持ち。`consumes:`の宣言はdeclarativeなのに、読み出し側は
   毎回8–15行の同型コードという非対称。
2. **`io_boundary` → `cache_for`の順序契約** — FileEntry digestの蓄積が副作用で、
   `cache_for`のスナップショット**前**に読みを済ませないと**サイレントにstaleな
   キャッシュ**になる。rigor-actionpack / rigor-rails-routesは警告コメントで人間に
   順序を念押ししている（actionpack.rb:191, rails_routes.rb:218）。静的にも実行時にも
   強制されない、契約面で最も危うい箇所。
3. **violation → `diagnostic()`の詰め替え** — node_rule利用 ~23プラグインが
   ほぼ同型の3–8行`.map { diagnostic(node, path:, location:, message:, …) }`を持つ。
4. **同名私的ヘルパーの分散** — `canonical_path` / `controller_file?`系のパス判定 /
   `load_error_diagnostic` / `scannable_paths`（runnerの`expand_paths`再実装、
   dry-types / graphql / mangroveの3か所）など、計 ~80–100行。

### 2.3流儀が割れている箇所

- **fact公開の2流儀**: `prepare`内で`fact_store.publish`明示（dry系 /
  graphql / mangrove）vs `producer`ブロック経由（Rails系）。どちらも正当だが
  使い分け基準が文書化されていない。
- **エラー処理の3流儀**: rescueして`@load_error`に積み
  `diagnostics_for_file`で報告 / rescueして黙ってnil / rescueせず分離ハーネスに
  任せる。ガイドライン不在。
- **型寄与の3面**（`dynamic_return` / `type_specifier` / `TypeNodeResolver`）の
  使い分けはコードを読まないと分からない。役割分担自体は原理的（§ 4.1）。

## 3. BC break候補の裁定

### 3.1 Tier 1 — 凍結前に壊すべき（要BC break）

**(a) `external_files:` Manifestフィールドの撤去（またはexperimental隔離）**。
ADR-16 Tier Dの宣言だけが先行し、エンジン消費者はCLIの件数表示のみ
（`plugins_command.rb`のカウント）。grepで確認したとおりanalysis側の配線はゼロ。
**配線されないフィールドをv1.0で凍結すると「永久に空約束の公開面」になる** —
これはADR-50の凍結criterion（enumerated surfaceは動作を伴う）に正面から反する。
demandが来た時にvalue objectごと再導入するのが正しく、撤去は今しかできない。
他のADR-16 value object（heredoc / trait / block_as / nested_class）は
`SyntheticMethodScanner` / `MacroBlockSelfType`に配線済み・稼働中で、撤去対象では
ない。

**（b）マクロvalue object群の命名正規化**。同じ「DSLメソッド名」概念が
`block_as_methods`では`verbs:`、heredoc / trait / nested_classでは
`method_name:`。シンボル引数位置が`symbol_arg_position`（heredoc / trait）と
`name_arg_position`（nested_class）。利用2–3プラグインの今なら一括リネームは
機械的だが、凍結後は別名併存を永久に背負う。`method_names:` / `symbol_arg_position`
への統一を推奨。

**(c) producer / `cache_for` / `io_boundary`契約の宣言化**。 § 2.2-2の順序依存は
「正しく書けたかをサイレントstale cacheでしか検知できない」契約であり、凍結に
耐えない。方向性は2案:

- 案1（小）: `producer :x, watch: [roots, patterns…]`でglob descriptorを
  エンジン側が合成し、`glob_descriptor`手動合成 + 順序責任をretireする。
- 案2（大）: `cache_for`のスナップショットを呼び出し時でなくブロック**実行後**に
  取る（producerブロック内の`io_boundary`読みを自動キャプチャ）。

どちらも`cache_for`の意味論変更を含むためBC break。現行16利用すべてが
bundledなので一斉移行可能（actionmailerの25行ケースは ~5行になる見込み）。
**3候補の中で最も価値が高い** — 正しさの罠を仕組みで塞ぐ変更であり、Rigorの
FP規律（動くコードを脅かさない）のキャッシュ版に相当する。

### 3.2 Tier 2 — 追加で足せば済む（BC break不要、ただし凍結前に入れて
「最初から正しい形」を公開面にするのが得策）

1. **`Plugin::Base#read_fact(plugin_id:, name:)`** — nil結果込みのメモ化を内蔵した
   読み出しヘルパー。12プラグインの`*_or_nil` + `_resolved`群を置換。さらに進めて
   `consumes:`宣言からのgetter自動合成も可能だが、まずはヘルパーで足りる。
2. **violation配列の自動ラップ** — `node_rule`ブロックの戻り値に
   `#to_diagnostic`可能なオブジェクトを許す、もしくは`diagnostic`のバルク版。
   ~23プラグイン × 3–8行を畳む。
3. **`type_specifier` / `TypeNodeResolver` / fact公開2流儀 / エラー処理流儀の
   文書化** — `rigor-plugin-author` SKILLとプラグイン契約ドキュメントへ。コード
   変更ゼロで § 2.3の大半が解ける。external-author SKILL（v0.2.0予定）にも反映。

### 3.3 Tier 3 — 検討の上「壊さない」と裁定

- **`dynamic_return` / `type_specifier`の統合**: 表面上は「型寄与DSLが2つ」だが、
  役割（戻り値型vs post-return narrowing facts）も消費フェーズ（dispatcher vs
  statement evaluator）もゲートのコンパイル形も異なる。統合DSLは内部で結局
  分岐し、リネームコストだけ残る。**現状維持 + 文書化**（Tier 2-3）が正。
- **`diagnostics_for_file`の削除**: 15プラグインが利用。主用途はノードwalkでは
  表現できないfile-level診断（discoveryのload error報告、クロスファイル検証
  の集約）。`node_rule`の劣化版としてではなく**file-ruleとして正当な面**。
  ContributionIndexでゲート済みでコストも無い。維持。
- **`config_schema`の二重文法**（bare kind vs `{kind:, default:}`）: ADR-40が
  意図的supersetとして採用済み。bare形の禁止は移行コストに見合う利得がない。維持。
- **fact公開2流儀の片寄せ**: `prepare`+`publish`は「キャッシュ不要の軽量
  スキャン」、`producer`は「IoBoundary込みのキャッシュ対象ディスカバリ」と
  使い分けに実質がある。強制統一より基準の文書化（Tier 2-3）。

## 4. 凍結面そのものへの確認事項（ADR-50 WD1向け）

1. **凍結リストから外すもの**: `external_files:`（§ 3.1-aで撤去するなら自動的に
   外れる）。
2. **凍結リストにcriterionごと載せるもの**: ADR-52の「全貢献はエンジンが既に
   持つキーでゲートされる」規律。新フック追加時の受け入れ条件として明文化。
3. **`Scope`公開リーダー**（`type_of` / `has_member?` / `has_key?` / `equals?`）は
   プラグインが直接呼ぶ面なので、internal-specのimplementation-expectationsと
   凍結リストの両方で同一の列挙になっているかrelease前に突合する。
4. ADR-2由来の一方通行ゲート（プラグインはアプリケーションコードを実行しない /
   Scope不変 / FactStoreはplugin_id名前空間 / fat hookは導入しない）は再確認
   済み — 本レビューでも反例なし。

## 検証プロトコル

Tier 1の各BC breakはADR-52 slice 5bの確立済み先例に従う: (1) load時の明示
エラー（サイレント劣化禁止）、（2）CHANGELOG `### Removed` / `### Changed`に移行表、
(3) bundled全プラグインを同一チェンジセットで移行、（4）Mastodon / GitLab corpus
byte-identical + `make verify`（`check-plugins`込み）+ `make bench-perf`中立。
（c）はキャッシュ意味論に触れるため、加えてcross-processのplugin-spec回帰
（ADR-45の`pundit_plugin_spec`型）でstale-cache不在を確認する。

## Follow-up

**実装済み2026-06-13** — 本レビューの提言は[ADR-60](../../adr/60-pre-freeze-plugin-contract-consolidation/)
として起票し、全WDを着地させた:

- **WD1 (Tier 1-a)**: `external_files:`フィールド + `Macro::ExternalFile`撤去
  （rigor-rbs-inlineの手書きManifest再構築が唯一の実利用者で、これも移行）。
- **WD2 (Tier 1-b)**: `BlockAsMethod` `verbs:`→`method_names:`、
  `NestedClassTemplate` `name_arg_position:`→`symbol_arg_position:`（エイリアス無し）。
- **WD3 (Tier 1-c)**: `cache_for`をrecord-and-validate(`fetch_or_validate` +
  ブロック実行後の依存記述子捕捉)へ。`producer watch:` + `Cache::Descriptor::GlobEntry`
  新設。bundled全11 producerプラグインを移行し、prime-before-cache_forと
  手動`glob_descriptor`合成を全廃、`glob_descriptor`は私有化。
- **WD4 (Tier 2)**: `read_fact` / `producer_value` + `producer_error` /
  `diagnostics_for`を`Plugin::Base`に追加し、12の`*_or_nil`メモ・7の
  fact読み出し・~23のviolationマッピングを移行。
- **WD5 (Tier 2-3)**: 両`rigor-plugin-author` SKILLを更新
  (rename・record-and-validate・ヘルパー・`type_specifier`/`TypeNodeResolver`・
  fact公開2流儀・エラー処理ガイダンス)。

Tier 3のkeep-verdict(`dynamic_return`/`type_specifier`分離、
`diagnostics_for_file`、`config_schema`二重文法)はADR-60にrejected-alternative
として記録。`make verify`（self-check + check-plugins込み）全green。

- 本ノートの採用頻度・ボイラープレート実測値はv0.2.0のexternal-author SKILL
  設計の入力にもなる。
