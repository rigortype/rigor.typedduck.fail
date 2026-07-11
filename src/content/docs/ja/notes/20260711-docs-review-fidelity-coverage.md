---
title: "L1忠実度レビュー —— カバレッジ / CLI（2026-07-11）"
description: "rigortype/rigor docs/notes/20260711-docs-review-fidelity-coverage.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-review-fidelity-coverage.md"
sourcePath: "docs/notes/20260711-docs-review-fidelity-coverage.md"
sourceSha: "d318c39e6c1c2b21700be4e0546f8974468ec8d34550b5c59f0a1b8d8f9a2270"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

レンズ: L1意味的忠実度、領域A（カバレッジ / CLI）。スコープ: `docs/manual/02-cli-reference.md`
（coverage + check）、`15-type-protection-coverage.md`、`17-driving-improvement.md`、
`03-configuration.md`、`12-caching.md`。検証は`--help`、スクラッチディレクトリでのプローブ、
`lib/rigor/cli/{coverage_command,protection_report,mutation_protection_report,fused_protection_report}.rb`、
`lib/rigor/inference/dynamic_origin.rb`、`lib/rigor/environment/missing_gem_constant_index.rb`に対して実施。

## 所見

| 箇所 | 問題 | 深刻度 | 提案する修正 |
| --- | --- | --- | --- |
| `02-cli-reference.md:266-363`（`## rigor coverage`、自称「フラグリファレンス」、270-271） | このセクションはすべてのcoverageフラグ（`--format`、`--config`、`--threshold`、`--protection`、`--mutation`、`--with-tests`、`--test-command`、`--include-dynamic`、`--limit`、`--seed`）を記載しているが、**`--workers=N`だけが抜けている**。これはPR #67が`coverage`に追加したものだ。`coverage --help`には載っており、`coverage_command.rb:101`が定義している。これを完全なリファレンスとして扱う読者は、Tier-1保護が今やフォークで並列化できることを見逃す。 | MISLEADING | coverageのフラグリファレンスに`--workers=N`を追加し、`check`の行（`02:44`）に合わせる。「スキャン対象ファイルに`N`個のワーカーをフォークする（`--protection`のみ）。優先順位は`--workers` › `RIGOR_RACTOR_WORKERS` › `parallel.workers:` › `0`（逐次）。」 |
| `02-cli-reference.md:278-280`（`rigor coverage [paths]`） | `check`セクション（`02:28-29`、「省略した場合、Rigorは設定ファイルの`paths:`リストをチェックする」）とは違い、coverageセクションはパスを省略すると設定の`paths:`（デフォルトは`lib`）にフォールバックするようになったことを一切述べていない。PR #67がこの挙動を`check`と同一にした（`coverage_command.rb:80-83`）。スクラッチディレクトリで検証済み（引数なしの`rigor coverage`が`lib/`をスキャンした）。挙動は誤記述ではなく未記述であり、旧来の「パス必須」エラーを今も主張している章はない。 | FRICTION | 使用法ブロックの後に1行追加する。「パスを指定しない場合、Rigorは`rigor check`と同様に、設定された`paths:`（デフォルトは`lib`）を使う。」 |
| `15-type-protection-coverage.md:30-52`（Tier 1）と`220-230`（「コストとスコープ」） | PR #67以降、`--workers`はTier-1の速度レバーだが、この章はcoverageの並列化に一切触れていない。Tier 1は「1回の解析パスで、対話的に実行できる程度に速い」と説明されており、「コストとスコープ」のレバー一覧（スコープを絞る / スイートを速く保つ / `--limit`で上限を設ける）は`--workers`を落としている。誤りではないが、この新しいレバーが主要な保護カバレッジの章から欠けている。 | FRICTION | Tier-1の説明（または「コストとスコープ」の一覧）に並列化レバーとして`--workers=N`を追加し、優先順位の詳細は`02`に委ねる。 |

## 意図的な簡略化 / 正確（ギャップではない）

- `15-type-protection-coverage.md:203-214`（`external_gem_without_rbs`のコールアウトボックス、ADR-82 WD9）。
  `missing_gem_constant_index.rb`に対して正確。第一のリゾルバはターゲットのbundle install
  ツリー（`bundle_gem_dirs`、`bundler.bundle_path:`）であり、`Gem::Specification.find_by_name`は
  最後の手段のフォールバックにすぎず、（クラスの注記、28-36行のとおり）rigor自身のバンドルを見るため、
  default-gem-home（`rbenv`/`mise`）のケースは「設計上」ほぼ不可視だ。「これらの穴は汎用的な
  `engine_gap`原因を保つ …… ラベルは欠けることはあっても、決して誤ることはない」という主張は、
  fail-openな`unresolved_constant_fallback`（`expression_typer.rb:405-414`）と一致する。忠実。
- `15:176-201` `tractability` / provenanceフィールド。`protection_report.rb#to_h`と
  `dynamic_origin.rb`に対してフィールド単位で検証済み。
  - 6つの`dynamic_origin`値が列挙されている（`external_gem_without_rbs`、`framework_dsl_boundary`、
    `analyzer_budget_cutoff`、`explicit_untyped`、`inferred_return_untyped`、`unsupported_syntax`）
    ＝`DynamicOrigin::CAUSES`と完全一致。
  - `tractability`のマッピング（`add_rbs` ← external-gem/explicit-untyped、`enable_plugin` ←
    framework-dsl、`engine_gap` ← budget-cutoff/inferred-return-untyped/unsupported-syntax）＝
    `DynamicOrigin::TRACTABILITY`と完全一致。
  - JSONの`add_a_type_here[].dynamic_origin` / `tractability`（nilのとき省略）、`tractability_summary`、
    `cause_site_counts`はすべて`to_h`に存在する。忠実。
- `15:106-108`と`02:331-334`のfusedビューJSON（`mode` = `protection-fused`、`type_killed`、
  `test_killed`、`unprotected`、`protected_ratio`、ファイルごとの行、`add_protection_here`）＝
  `fused_protection_report.rb#to_h`と完全一致。忠実。
- `02:311-313`のmutation JSON（`mode`、`killed`、`survived`、`effectiveness_ratio`、ファイルごとの行、
  `add_a_type_here`）＝`mutation_protection_report.rb#to_h`と完全一致。忠実。
- `03-configuration.md:131`の`parallel.workers`（Integer、デフォルト`0`、「CLIの`--workers`と
  `RIGOR_RACTOR_WORKERS`が優先される」）と`03:43`の`paths`デフォルト`["lib"]` —— どちらも正確。
  優先順位のチェーンは`02:609`および`coverage_command.rb` / `CheckRunnerFactory.resolve_workers`と一致する。
- `12-caching.md:110-116`の`--workers=N`並行性の注記は汎用的なキャッシュ安全性のテキストであり、
  coverageもフォークするようになった今では*より*正しく、修正は不要。
- `17-driving-improvement.md` —— ワークフローレベルで`rigor coverage --protection`を参照するのみで、
  矛盾するフラグレベルの主張はない。クリーン。

## 判定

カバレッジ / CLIの章は、荷重を担うすべての面で意味的に忠実だ —— ADR-82 WD9のprovenance /
`tractability`ラベルとすべてのJSONフィールド名が実装と完全一致し、設定キーとデフォルトは正しく、
退役した「coverageはパスを必要とする」という主張を今も抱えている章はない（PR #67の設定`paths:`への
フォールバックは動作を検証済み）。唯一のドリフトは、**`02`のcoverageフラグリファレンスから
PR #67の`--workers`フラグが抜けていること**（MISLEADING —— 唯一「完全」と銘打たれた箇所）と、
`02`/`15`で新しいパスフォールバックと並列化が表に出ていないこと（FRICTION）だ。ERRORレベルの
不正確さは見つからず、修正はすべて1行の追加で済み、散文の掘り下げは不要。
