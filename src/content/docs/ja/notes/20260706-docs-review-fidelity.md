---
title: "ドキュメントレビュー —— L1忠実度サイクル（マニュアルの運用章）"
description: "rigortype/rigor docs/notes/20260706-docs-review-fidelity.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260706-docs-review-fidelity.md"
sourcePath: "docs/notes/20260706-docs-review-fidelity.md"
sourceSha: "625cd91d503bdd8f795821ada8c0fa6deecc1014e60d6cc811e885b9ca30a5c2"
sourceCommit: "ee19f4b60fca3bd0ceb677ebb395593203f2ea48"
translationStatus: "translated"
sidebar:
  order: 20266706
---

ステータス: レビュー所見の記録台帳（[`rigor-docs-review`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-docs-review/SKILL.md)
バッテリー、L1真レイヤー）。2026-07-06、Rigor v0.2.7（`[Unreleased]`）。これはドキュメントレビューバッテリーの**最初のサイクル**である —— L0の機械的ゲート（`make docs-check`）は着手時点でグリーンだった。

## スコープと手法

マニュアルの運用主張を扱う章群に対するL1忠実度レビューを、独立コンテキストの3つのサブエージェントとして並列に実行し、各サブエージェントは機械的に検証できないすべての主張を**実際のCLI出力**（flake経由の`exe/rigor <cmd> --help`）と**実装**（`lib/rigor/…`と統制するADR群）に照らして確認した。意図的な単純化はドリフトとしてカウントしなかった —— 偶発的な不正確さ（コードがXを行うのにドキュメントが¬Xと主張している）のみを対象とした。以下の各所見は、適用前にコードに照らして再検証している。

| レビュアー | 章 | グラウンドトゥルース |
| --- | --- | --- |
| 1 | `02-cli-reference`, `11-ci` | サブコマンドごとの`--help`, `CLI::HANDLERS`, `DiagnosticFormats`, `CiDetector`, ADR-51 |
| 2 | `03-configuration`, `04-diagnostics` | `Configuration::DEFAULTS`, `SeverityProfile::PROFILES`, `RuleCatalog::ENTRIES`, `CheckRules::ALL_RULES` |
| 3 | `12-caching`, `06-baseline`, `15-type-protection-coverage` | `Cache::*`, `Analysis::Baseline`, `coverage_command.rb`, `DynamicOrigin`, ADR-45/54/22/63/75/82 |

## 所見（検証済み）と適用した修正

| 章 | 重大度 | 所見 | 根拠 | 修正 |
| --- | --- | --- | --- | --- |
| `04-diagnostics.md`（severity-profileテーブル） | **ERROR** | 「`strict` —— すべてのルールが`error`である。」は誤り。 | `SeverityProfile::PROFILES[:strict]`は`call.self-undefined-method → :off`および`flow.unreachable-clause → :warning`をマッピングしている。 | 「ほぼすべてのルール…例外は…」と言い換えた。 |
| `15-type-protection-coverage.md`（`dynamic_origin`フィールド） | **ERROR** | 原因の集合が5個の値として列挙されているが、フィールドには6個ある。 | `DynamicOrigin::CAUSES`には`inferred_return_untyped`（ADR-82時代の実アプリで支配的な実際の原因、`→ engine_gap`）が含まれるが、章から欠落している。 | `inferred_return_untyped`を列挙と`engine_gap`のトラクタビリティの箇条書き（推論ギャップのケースとして: 型なしパラメーター／未束縛のivar）に追加した。 |
| `06-baseline.md`（`--baseline-strict`） | MISLEADING | ベースラインが*増大*したときにのみ失敗すると記載されている。 | `check_command.rb#baseline_strict_violation?`（コメントL152-156）は、*不足*ドリフト（ベースラインがコードより緩い）を含む**あらゆる**ドリフトで失敗する。 | 「あらゆるベースラインドリフトで失敗する」と言い換え、超過／不足の切り分けを示した。 |
| `04-diagnostics.md`（カタログの導入部と`rigor explain`の主張） | MISLEADING | `rigor explain`と`documentation_url`が「あらゆるID」／「各ルール」をカバーすると主張しているが、カタログに列挙されている`rbs_extended.unsatisfied-conformance`は組み込みではない。 | これは`SeverityProfile::PROFILES`にのみ存在し、`RuleCatalog::ENTRIES`／`CheckRules::ALL_RULES`には存在しない。`rigor explain`は「Unknown rule」を返し、これに対する`documentation_url`はnilである。 | 主張を「組み込みルール」に限定し、`rbs_extended`ファミリーの唯一の例外は`rigor explain`エントリ／`documentation_url`を持たない旨を注記した。 |

編集後も`make docs-check`はグリーンのまま（96例）。

## クリーン（ドリフトなし）

- **`02-cli-reference.md` —— 高忠実度**。 `CLI::HANDLERS`内のすべてのサブコマンドと、確認したすべてのフラグが、実際の`OptionParser`出力と一致している（`type-of`の3引数形式、7個のMCPツール名、coverage/fusedのJSONフィールド名、`--test-command`のデフォルトとシェルなし実行、終了コード0/1/64、そして正直な「`--log`は受理されるがまだ配線されていない」LSPの但し書きを含む）。
- **`11-ci.md` —— 高忠実度**。 6個のCIネイティブな`--format`値、フォーマットごとの完全な重大度マッピングテーブル、そしてCI自動検出の階層は、`diagnostic_formats.rb`と`ci_detector.rb`とADR-51に対してバイト精度で一致している。**設計ノートが予測したADR-51のフォロースルーギャップは顕在化しなかった** —— CI章は同期が保たれていた。
- **`03-configuration.md`** —— すべての`DEFAULTS`のキー／値、探索順序、`includes:`のレイヤリング、そして6個の設定検証の警告文字列がコードと一致している。**`12-caching.md`** —— あらゆる無効化の入力、デフォルト、フラグ、そしてルート上のインクリメンタルスナップショットキーの主張が`Cache::*`と一致している。
- **`04-diagnostics.md`（残り）** —— 19個の組み込みルールの発火条件、証拠の階層、そして`--format json`のフィールドテーブルが、`RuleCatalog`と`Diagnostic#to_h`に正確に一致している。

## 未適用（細かな指摘／スコープ外）

- `02-cli`／`11-ci`内の例示バージョンピン`0.2.6`と現行の`0.2.7`の相違 —— 意図的な例であってドリフトではない。そのままとした。
- `rbs_extended.unsatisfied-conformance`を`RuleCatalog::ENTRIES`に昇格させる（それによって`rigor explain`と`documentation_url`を得る）かどうかは、このドキュメント忠実度パスの範囲外の**コード**上の決定である —— ドキュメントは現在、実際の挙動を記述している。必要なら将来の`RuleCatalog`レビューでフラグを立てること。

## 次（バッテリーの継続）

- 同じ章群に対する**L2伝**（読者レンズ）、**L3簡**（肥大化）、**L4整**（コピーエディット）、その後**ハンドブック対仕様コーパスの忠実度**パス（このサイクルはマニュアルのみをカバーした）。逐次的に実行すること —— 後のレイヤーは修正済みのテキストを読む。
