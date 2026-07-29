---
title: "`examples/` プラグイン近代化調査 — 最初期プラグインと現行契約面のギャップ"
description: "Imported from rigortype/rigor docs/notes/20260704-examples-plugin-modernization-survey.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260704-examples-plugin-modernization-survey.md"
sourcePath: "docs/notes/20260704-examples-plugin-modernization-survey.md"
sourceSha: "8464be3a491c4d1f312e11ddeeb8bd7094be46c0f2e8600eb3114da3b9c11b66"
sourceCommit: "42402864a316beb0d5ba4357ec29454ab55f6657"
sourceDate: "2026-07-04T19:23:37+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266704
---

Status: 内部監査ノート、authored 2026-07-04（Rigorはrelease/0.2.xライン、master
`ae6844e7`時点）。**このノートは同名ブランチ`examples-modernization`の実装PRを駆動した**
（ADR-40デフォルト移行・routesのADR-60 WD4化・ドキュメント鮮度整理を実施、unitsは
検証の結果「元設計が正」と判明し訂正済み。下記の各節に実装結果の追記あり）。**第2弾**として、
本作業から生まれた`rigor-plugin-review`スキルをexamples自身に適用（ドッグフーディング）し、
チェックリスト観点2（AST走査の所有権）で残っていた2件を追加修正した — routesの毎コール検査を
`node_rule Prism::CallNode`へ移し`diagnostics_for_file`をload-error専用に（本番rigor-rails-routes
と一致）、units `Analyzer`の手動`Diagnostic.new`を公開コンストラクタ`Diagnostic.from_location`へ
（バイト同一）。webは本番rigor-hanamiと同じ`diagnostics_for_file`+checker形なので変更不要と再確認。
**第3弾（skillの盲検証）**として、`master`（第1・2弾のPR前）のworktreeに`rigor-plugin-review`
スキルだけを渡したSonnetサブエージェントにexamplesをレビュー・改修させ、我々の解答と比較した
（我々の変更・本ノートは非公開）。結果: Sonnetはスキルのみで我々の全項目（ADR-40・WD4ヘルパ・
routesのnode_rule化・unitsの罠回避・doc鮮度）を独立に再現し、**さらに我々が見落としたdoc陳腐化を
3件発見**（deprecations READMEの存在しない "statesman" 参照、lisp-eval READMEの「return-typeは
later sliceにqueued」＝実装済み`dynamic_return`と矛盾、units READMEの存在しない
`evaluate(node, emit_terminal:)`引数）、かつ**webを`node_rule(Prism::ClassNode)`へ移行**する独立設計判断を
下した（我々は本番hanami踏襲で`diagnostics_for_file`維持だったが、per-class検査はnode表現可能で
スキルの観点2は移行を支持 — Sonnetの方がスキルに忠実）。この3件のdoc修正・web移行・スキル観点2への
「genuinely whole-fileの境界」注記を本PRに反映した（77/77緑を維持）。スキルが「我々の作業の記述」ではなく
汎用的に機能する強い証拠。
`examples/`配下6本のチュートリアル・
プラグインが、現行の（＝多くが後発のADRで追加された）プラグイン・オーサリング面を
どこまで使い切れているかを棚卸しする。examplesは「契約面を最小コードで見せる教材」
であり（[`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)）、`make check-plugins`
（ADR-43）のゲートで自己チェックが緑であることは前提 — よって本ノートが挙げるのは
**正しさの回帰ではなく、イディオム/精度/ドキュメントの陳腐化**である。ADR / specが
束縛する。着手前に各ファイルの現存を確認すること。

## なぜこの調査か

依頼は「examplesのプラグインは実装時期が最初期のものもあり、最新のRigorの機能を
使いきれていないものもある（例: 演算の積極的なリテラル型化）。まず現状を包括的に調査
してdocs/notesにまとめて」。examplesは教材である以上、**現行の推奨イディオムを映す
鏡**であることに価値がある。古い書き方が残っていると、プラグイン著者がそれを写経して
陳腐なコードを再生産する。

## 実装時期 — 全6本が最初期コホート

| プラグイン | 初出 | 最終改修 | 主hook | 位置づけ |
| --- | --- | --- | --- | --- |
| `rigor-deprecations` | 2026-05-07 | 2026-06-02（`node_rule`移行） | `node_rule` | config駆動ルール（最小） |
| `rigor-lisp-eval` | 2026-05-07 | 2026-06-16（コメント修正） | `node_rule` + `dynamic_return` | リテラルAST型付け |
| `rigor-pattern` | 2026-05-07 | 2026-06-16（コメント修正） | `node_rule` + `dynamic_return` | エンジン協調（`Scope#type_of`） |
| `rigor-units` | 2026-05-07 | 2026-06-10（ADR-52 slice 2移行） | `diagnostics_for_file` + `dynamic_return` | ローカル変数フロー追跡 |
| `rigor-routes` | 2026-05-07 | 2026-06-16（コメント修正） | `diagnostics_for_file` + `producer` | IoBoundary + キャッシュproducer |
| `rigor-web` | 2026-05-23 | 2026-05-23（初出のみ） | `diagnostics_for_file` | パススコープprotocol contract (ADR-28) |

全6本が**2026-05-07（webだけ05-23）＝リポジトリ最古のプラグイン群**。以降の改修は
「削除された`flow_contribution_for`からの機械的移行（ADR-52）」「`node_rule`化
（ADR-37）」「コメント修正」に限られ、**ADR-40以降に増えたオーサリング面には
一切追随していない**。

## 現行オーサリング面のベースライン（examplesが触れていないもの）

現行`Plugin::Base`（`lib/rigor/plugin/base.rb`）が公開し、**本番`plugins/`は広く採用
しているのにexamplesでは0件**の面を確認した：

| 面 | 由来 | 何を置き換えるか | examples採用 | plugins採用 |
| --- | --- | --- | --- | --- |
| `config_schema`の`{kind:, default:}` | ADR-40 | `DEFAULT_*`定数 + `config.fetch(k, DEFAULT)`イディオム | **0/6** | 13+ 本 |
| `Base.suggest(name, candidates)` | ADR-60 WD4 | 各プラグイン手書きのLevenshtein/"did you mean" | **0/6** | 複数（activerecord, rails-routes, statesman…） |
| `#producer_value` / `#producer_error` | ADR-60 WD4 | 手書きの`@table`/`@load_error`メモ + `cache_for(...).call` + rescue | **0/6** | 複数（rails-routes等） |
| `#read_fact(plugin_id:, name:)` | ADR-60 WD4 | 手書きの`@x_resolved`フラグ付きクロスプラグインfact読み | 0/6（該当機会はroutes/webに無し） | actioncable, actionmailer, activejob… |
| `#diagnostics_for(violations, path:, node:)` | ADR-60 WD4 | `violations.map { diagnostic(...) }` / `Diagnostic.new(...)`直書き | **0/6** | 複数 |
| `narrowing_facts`（旧`type_specifier`） | ADR-37 slice2 / ADR-80 | — | 0/6（機会は限定的、後述pattern） | minitest, sorbet, rspec |

ADR-60（pre-freeze plugin contract consolidation, 2026-06-13）の**WD4オーサリング
ヘルパは「bundled corpusを移行する」と謳っていたが、そのcorpusは`plugins/`であって
`examples/`は対象外だった** — これがexamples未追随の主因。examplesが古いイディオムを
温存したまま「教材」として残っている。

## プラグイン別の詳細所見

### rigor-deprecations — ほぼ最新、ギャップ小
- `node_rule`済み、`diagnostic`ヘルパ使用、I/O・cache無し。最小教材として健全。
- 唯一のギャップ: `config_schema`が`{"methods" => :array}`（デフォルト無し）で`init`が
  `config["methods"] || []`を手書き。ADR-40の`{kind: :array, default: []}`にすれば
  `|| []`が消える（軽微）。

### rigor-lisp-eval — 移行済みだがDiagnostic直書きが残存
- `node_rule` + `dynamic_return`済み。`type_for_result`は値を`constant_of`に、タグを
  `nominal_of`に畳む — **リテラル型化は正しく行っている**（後述「演算のリテラル型化」の
  観点でも良好）。
- ギャップ:
  - `DEFAULT_MODULE_NAME`/`DEFAULT_METHOD_NAME`/`DEFAULT_SEVERITY`定数 + 3連`config.fetch`
    → ADR-40デフォルト形式へ。ただし`severity`はallow-list検証があるので単純デフォルト化は
    できず、`{kind: :string, default: "info"}` + 検証残し、が妥当。
  - `diagnostic_for_inferred_type` / `diagnostic_for_error`が`Rigor::Analysis::Diagnostic.new`
    を直接構築。`Base#diagnostic(node, ...)`ヘルパ（座標計算を吸収）を使えば行数減。

### rigor-pattern — 教材として最も現代的、ただしデフォルト形式は旧
- **本ノートの参照実装**。docstring自身が「初期のAST-only例と違い、リテラル文字列追跡を
  再実装せず`Scope#type_of`でエンジンの`LiteralStringFolding`を読み返す」と明言しており、
  エンジン協調の模範。`dynamic_return`はマッチ時に`value_type`（多くは`Constant<String>`）を
  返して呼び出し側を精緻化 — 良い。
- ギャップ:
  - `DEFAULT_METHOD_NAME` + `config.fetch` → ADR-40形式。
  - docstring/READMEに "introduced in v0.0.9" 等の**古いバージョン参照**が残る（陳腐化。
    現行の言い回しは「literal-string carrier」で足りる）。
  - （任意・要検討）マッチ時に返り値型だけでなく`narrowing_facts`で「この値は :email
    パターンに適合」という事実を後続に流す拡張余地。FPを増やさない範囲なら教材価値あり。

### rigor-units — 二重実装に「見える」が、実は必須（当初仮説は棄却）
> **2026-07-04追記（実装で検証）**: 当初この節は「`Analyzer`の`@bindings`は
> `scope.type_of`で置換できる冗長実装」と評価したが、実装して統合テストにかけたところ
> **棄却された**。以下は訂正済みの結論。

- `dynamic_return`は移行済みで`scope.type_of`（フローscope）を読む。診断パス（`Analyzer`）は
  独自の`@bindings`ローカル変数マップ + 独自AST走査 + 独自リテラル分類を持つ。
- **これは冗長ではなく必須**だった。プラグイン診断側（`diagnostics_for_file` / `node_rule`）に
  渡る`Scope`は`seed_project_scope(Scope.empty(...))` = **seed/entry scope**で、
  `Scope#type_of`はノードをオンデマンド再評価するが**フロー蓄積されたローカル束縛を持たない**：
  - `scope.type_of(100.kilometers)`は自己完結式なので`dynamic_return`を再発火して`Distance`
    を返す（＝単文の`inferred-binding`は通る）。
  - しかし`speed = distance / time`では`scope.type_of(distance)`が`untyped`。entry scopeは
    `distance`を束縛していない（束縛はフローscopeにしか存在しない）→ 次元が取れず、複数文の
    伝播・不一致検出・in_query判定がすべて落ちる（実測: 19例中11失敗）。
  - `dynamic_return`に渡る`Scope`は**フローscope**なので`scope.type_of(distance)`は`Distance`。
    エンジンは次元を正しくスレッドする（下流`speed.upcase`は`Speed`に対し`call.undefined-method`
    を実際に発火）が、**診断APIからはそのスレッドが見えない**。
- 従って二つの半分は必要に迫られて別ソースから次元を読む: `dynamic_return`はフロー`Scope#type_of`、
  `Analyzer`は自前の単一パス束縛マップ（＝診断側で次元を文跨ぎで追う唯一の手段）。rigor-patternが
  「エンジンを再実装するな」と戒めるのは**一箇所の呼び出しsiteで値が要る**ケース。unitsは
  **診断側で文跨ぎのローカルフローが要る**ケースで、これは現行エンジンが診断scopeに露出しない。
- **対応**: 元設計を維持し、この非対称性をdocstringに「なぜ並行束縛マップが必要か」として明文化した
  （投資した調査を教材価値へ転化）。真の除去には診断scopeへのフロー束縛露出（エンジン変更、
  examples近代化の範囲外）か、`dynamic_return`（フローscope）で算出した次元をノードidentityで
  stashして診断側で読み返す設計が要るが、後者はflow→diagnostics順序結合とクロスファイル
  identity前提を持ち込み、教材としてはむしろ不明瞭になるため見送り。
- リテラル型化の観点: 演算表（`MethodTable`）は次元Symbol上で閉じ、`100.kilometers`は
  `Nominal("Distance")`を返して数値の大きさ（Constant）を落とすが、次元解析としては妥当。
  独自リテラル分類（`IntegerNode → :numeric`）も上記のとおり診断scopeの制約下では正当。
- その他: `config_schema`未宣言（configを取らないので可）。

### rigor-routes — ADR-60 WD4ヘルパの最大の受益者（未適用）
- slice2（IoBoundary/TrustPolicy）+ slice6（producer/cache_for）の教材。ADR-60 WD3
  record-and-validateへは移行済み。
- ギャップ（**手書きボイラープレートが3種**、いずれもADR-60 WD4で名前が付いた）:
  1. `levenshtein` + `closest_route`（30行）を自前実装 → `Base.suggest(name, candidates)`
     （Rubyの`DidYouMean::SpellChecker`を使う共有ヘルパ）で置換可能。
  2. `route_table`の`@table`/`@load_error`メモ + `cache_for(:route_table).call` +
     多段rescue → `#producer_value(:route_table)` + `#producer_error(:route_table)`の
     まさに`*_index_or_nil`形。
  3. `load_error_diagnostic`が`Diagnostic.new`直書き。
- `DEFAULT_ROUTES_FILE` + `config.fetch` → ADR-40 `{kind: :string, default: "config/routes.yml"}`。
- 注: 本番`plugins/rigor-rails-routes`は既に`suggest`/`producer_value`を採用済みで、
  **教材版だけが古い**という捻れが起きている。

### rigor-web — 初出のまま無改修、ただし該当ギャップは小
- ADR-28 protocol contract教材。`diagnostics_for_file` + `signature_paths` + `protocol_contracts`。
  設計自体は現行契約に合致（protocol contract面は後続で変わっていない）。
- ギャップ:
  - `DEFAULT`/`config.fetch`は無いが`config["controller_path"]`を手で捌く。
    `config_schema`に`{kind: :string, default: ""}`を宣言してoverride判定を素直にする余地。
  - 2026-05-23以降無改修で、ADR-60 pre-freeze波及の点検を受けていない唯一のプラグイン。
    現状correctness問題は見当たらないが、`config_schema`が未宣言（`controller_path`を
    受けるのにschemaなし）で、他5本と粒度が揃っていない。

## 「演算の積極的なリテラル型化」の観点（依頼の例示）

現行エンジンは算術/操作を`Constant`/リテラルcarrierへ積極的に畳む（ADR-48 Data/Struct、
ADR-55 recursive-return、ADR-56 block-writeback、`ConstantFolding`/`ShapeDispatch`）。examples
はこの精度が薄かった時代の産物。観点別の実態：

- **正しく活用**: `rigor-pattern`は`Scope#type_of` → `Constant<String>`を読み、
  `rigor-lisp-eval`は自前評価結果を`constant_of`に畳む。
- **本質的に自前が正（当初「活かしきれず」と誤評価）**: `rigor-units`の診断側`@bindings`は、
  検証の結果**現行エンジンの診断scope制約下では必須**と判明（上記units節の訂正を参照）。
  診断scopeはentry scopeでフロー束縛を持たないため、`scope.type_of`では文跨ぎのローカル
  次元を追えない。ここは自前が正しい。lisp-evalのLisp DSL評価もengineに委譲できない。

つまり「演算をリテラルへ畳む」新機能をexamplesが使うべき、という当初の見立てはunitsには
当てはまらなかった。examplesの実際の近代化余地は**演算の精度**ではなく、下記の
オーサリング面イディオム（ADR-40 / ADR-60 WD4）とドキュメント鮮度に集約される。

## ドキュメント/デモの陳腐化

- README・docstringに**削除済みhook（`flow_contribution_for`）への言及**が
  lisp-eval / pattern / unitsに残る（「〜は削除された」という但し書き付きで残しているが、
  新規読者には不要な考古学）。
- **古いバージョン参照**（"introduced in v0.0.9" 等）がpatternに残る。
- デモ`.rigor.dist.yml`の書式は現行（`paths:` + `plugins:`の文字列or `gem:/config:`）で
  問題なし。
- `demo/tmp/.rigor/cache/`にコミット済みキャッシュartefactが見えるが`tmp/`は
  `.gitignore`対象 — 追跡はされていない想定（要確認、ただし機能影響なし）。

## 優先度付きfollow-up候補（設計コミットメントではない）

機械的・低リスク（イディオム統一、教材価値高）から：

1. **ADR-40デフォルト形式へ全6本移行** — `DEFAULT_*` + `config.fetch`を
   `config_schema {kind:, default:}`へ。最も広く「古さ」を除ける単一施策。lisp-evalの
   `severity` allow-listとwebのoverride判定だけ検証ロジックを残す。
2. **rigor-routesをADR-60 WD4ヘルパへ**（`suggest` / `producer_value` / `producer_error`
   / `diagnostics_for`）— 手書き3種を除去。本番rails-routesと教材版の捻れを解消。
   `make check-plugins` byte-identicalでゲート可能なはず。
3. **`Diagnostic.new`直書きを`diagnostic`/`diagnostics_for`ヘルパへ**（lisp-eval, routes）。
4. **README/docstringの陳腐化除去** — 削除済みhook言及と古いバージョン番号の整理。
5. **rigor-unitsは元設計を維持 + docstring明文化（実装済み）** — 当初「エンジン協調化で
   `@bindings`除去」を狙ったが、実装検証で診断scopeがフロー束縛を持たない制約により
   **除去不可**と判明。並行束縛マップが必要な理由をdocstringに明文化した。
6. **rigor-webの粒度合わせ（実装済み）** — `config_schema`に`controller_path`デフォルト宣言を追加。

いずれもcorrectnessゲート（`check-plugins`）は緑を維持。**教材の鮮度**の改善であり、
1–6をまとめて1 PR（各ステップexample統合テストでgated）。

## 参照

- [`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md) — 教材の位置づけと契約面マップ
- ADR-37（plugin interface segregation, `node_rule`/`node_file_context`/`dynamic_return`）
- ADR-40（config_schema declared defaults）
- ADR-52（compiled plugin contribution dispatch, `flow_contribution_for`削除）
- ADR-60（pre-freeze plugin contract consolidation, WD4オーサリングヘルパ）
- ADR-80（`type_specifier` → `narrowing_facts`リネーム）
- [`.claude/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-plugin-author/SKILL.md)
  — 新規プラグイン著者向け手順（examplesを写経元にするため鮮度が重要）
