---
title: "Plugin boilerplate reduction — phased plan"
description: "Imported from rigortype/rigor docs/design/20260602-plugin-boilerplate-reduction-plan.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260602-plugin-boilerplate-reduction-plan.md"
sourcePath: "docs/design/20260602-plugin-boilerplate-reduction-plan.md"
sourceSha: "9357a4675e3faadaae02e3a2c381226dfbc499e50e568abf03f0bd3b2b1aa074"
sourceCommit: "d5d6614800bfc53f00e23b51f4c914d0e42f237f"
translationStatus: "translated"
sidebar:
  order: 20265602
---

Status: **Plan, 2026-06-02.** [`20260601-plugin-mechanism-pre-1.0-review.md`](../20260601-plugin-mechanism-pre-1.0-review/) §1のボイラープレートの所見に対する実装ロードマップ。非規範的です。公開サーフェスへの追加（新しい`Rigor::Source`／`Plugin::Base`ヘルパー）は、着地するたびに[ADR-2](../../adr/2-extension-api/)／[ADR-37](../../adr/37-plugin-interface-segregation/)に記録され、`spec/rigor/public_api_drift_spec.rb`にピン留めされます。

## 指針となる原則

**ボイラープレートが存在する*理由*を取り除く。単にDRYにするのではない**。最大の単一重複 — 約25個のプラグインにある手作りのAST走査器 — は、`diagnostics_for_file`が生の`root`を渡し、作者にそれを自分で走査せよと指示する*という理由だけで*存在します。ADR-37の`NodeRule`はエンジンに走査を所有させるので、それらの走査器は理由ごと消えます。したがって、巧妙な共有`walk`ヘルパーを手で作り込むのは無駄な作業になります。

そこで作業は単一のテストで分けられます。**その重複はADR-37を生き延びるか？**

- **生き延びる** → 今すぐ抽出する（後悔なし）。これらは即座に報われ、インターフェース分離リファクタリングに触れられません。
- **ADR-37に吸収される** → ヘルパーを手で作り*込まない*。リファクタリングに取り除かせる。

## インベントリの分割（レビュー §1.1のカウント）

| Duplication | Count | Resolution | Survives ADR-37? |
| --- | --- | --- | --- |
| Literal Symbol/String extraction | 20 + 4 in core | `Rigor::Source::Literals` | ✅ extract now |
| `Diagnostic` construction (`start_column + 1`) | 23 | `Diagnostic.from_node` / `Base#diagnostic` | ✅ extract now |
| levenshtein / did-you-mean | 4 | `Base#suggest` (`DidYouMean::SpellChecker`) | ✅ extract now |
| `config.fetch` + `DEFAULT_*` | 17 | `config_schema` `default:` slot | ✅ extract now |
| Inflector copies | several | `Plugin::Inflector` | ✅ extract now |
| Discoverer skeleton + `NameKeyedIndex` + load-error rescue + cache idiom | 4 + 6 + 10 | `ClassDiscoverer` / `NameKeyedIndex` base (FactProvider side, orthogonal to `NodeRule`) | ✅ mid |
| **AST walker** | **25** | **`NodeRule` (engine-owned walk)** | ❌ do not hand-build |
| dispatch-loop duplication / fan-out | 2 | ADR-37 slice 2 (indexed registry) | ❌ absorbed |

カウントが最も多い2項目（走査器25、ディスパッチ2）は意図的に手でパッチ*しません* — ADR-37がそれらを取り除きます。

## フェーズ（依存順）

### Phase 0 — 後悔のない抽出

それぞれが、ADR-37を生き延びる重複を畳み込み、**かつ**コア自身のコピーを脱重複するので、プラグイン境界の両側で報われます。

- **0a `Rigor::Source::Literals`** — `symbol_or_string(node)`、`symbol(node)`、`symbol_arguments(call)`、`symbol_arg(call, index)`。4つのコアのコピー（`sig_gen/observation_collector`、`sig_gen/generator`、`analysis/dependency_source_inference/return_type_heuristic`、`inference/synthetic_method_scanner`）をまず純粋なリファクタリングとして畳み込み、その後プラグイン向けに公開します。
- **0b `Diagnostic.from_node(node, path:, message:, severity:, rule:)`**＋`Plugin::Base#diagnostic(node, …)` — 要となる`start_column + 1`の慣習を内部化します。`analysis/check_rules.rb`のインラインパターン（15箇所以上）を畳み込み、プラグインにビルダーを与えます。
- **0c `Plugin::Base#suggest(name, candidates)`** — `DidYouMean::SpellChecker`のラッパー。手作りの`levenshtein`コピーを退役させます。
- **0d `config_schema` `default:`スロット** — `Manifest`スキーマの変更。`Base#config`が宣言されたデフォルトをマージするので、`DEFAULT_*`定数イディオムが退役します。
- **0e `Rigor::Plugin::Inflector`** — 1つの語形変化モジュール。routes（×2）、activerecord、actionmailer／actionpackの`underscore`コピーを退役させます。
  **[ADR-39](../adr/39-plugin-target-library-invocation/)による再構成:** `singularize`／`pluralize`のコピーは偽陽性に敏感（FP-sensitive）です（ルートヘルパー／モデル名解決に供給されるため）。そのため近似を統一するのではなく、このモジュールは許可リスト（allow-list）＋rescueハーネスを通して**実際の`ActiveSupport::Inflector`**を呼び出し、`config/initializers/inflections.rb`を静的に解析してプロジェクト独自のルールを取り込みます。純粋な`underscore`のケース変換は、ADR-39の作業から独立して着地できる安全な部分集合です。

### Phase 1 — ブリッジ（最小投資）

既存の`Rigor::Source::NodeWalker`をプラグインサーフェスに公開＋文書化します。`require`1つ＋文書化のみ — プラグインが`NodeRule`へ移行するにつれて自然に退役するので、ここにそれ以上の投資はしません。

### Phase 2 — 発見の基底（FactProvider側、NodeRuleと直交）

`ClassDiscoverer`基底＋`NameKeyedIndex`＋`discover_ruby_files`（`ruby_files_under`＋`read_safely`＋`rescue`三つ組を畳み込む）＋標準の`glob_descriptor`キャッシュイディオム。4つのRails発見プラグイン（activejob／actioncable／activestorage／actionmailer）を移行し、ほぼ同一のAST走査＋インデックスコードのファイル約4個を削除します。

### Phase 3 — ADR-37に吸収される

`NodeRule`の着地が、25個の走査器、23箇所のインライン`Diagnostic`構築（今や`Base#diagnostic`経由）、そして複製されたディスパッチループを取り除きます。`ProtocolContractChecker`基底（hanami／webのそっくりな重複）をここに追加します。

## 移行の機構（安全性）

- 各抽出は**純粋なリファクタリング**であり、挙動を保存します。安全網は、ゴールデンマスターとして使う既存の`run_plugin`統合スペックと、すべてのスライスでグリーンのままの`make verify`（テスト並列＋リント＋セルフチェック）です。
- **PRごとに1つのプラグインファミリー**を移行します。各PRは「重複N → 1、テストは不変」を実証します。
- レビュー §1.1の重複カウントを前後で追跡し、進捗を定量的にします。
- 公開サーフェスへの追加は`spec/rigor/public_api_drift_spec.rb`のスナップショットを更新し、ADR-2／ADR-37に記録されます。

## 最初の一歩

**Phase 0a（`Rigor::Source::Literals`）**。最高のROI: 4つのコアのコピーと20個のプラグインを脱重複し、ADR-37を無傷で生き延び、リグレッションリスク最小の純粋なリファクタリングです。
