---
title: "L1忠実度レビュー —— エリアC（プラグイン）、2026-07-11"
description: "rigortype/rigor docs/notes/20260711-docs-review-fidelity-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-review-fidelity-plugins.md"
sourcePath: "docs/notes/20260711-docs-review-fidelity-plugins.md"
sourceSha: "e79ff7e4437cd00e631ad26a9286e23ef94d702c147ac4130324990c45e3ad43"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

レビュアー: L1忠実度レンズ（プラグイン）。範囲: `docs/manual/07-plugins.md`、
`docs/manual/plugins/*.md`、`docs/handbook/09-plugins.md`。手法: ユーザー向けの各
プラグイン主張を、プラグインの**ソース**（CHANGELOGだけではなく）に照らして検証する。
`[Unreleased]`で変更された4つのケイパビリティ（rigor-activerecordの`structure.sql`、
rigor-actionpackの`require`/`permit`の型付け＋permitキーのタイポゲート、
rigor-rails-routesのGrapeネームスペース、AS core-extの追加）に加え、
設定キー／既定値の一斉点検に焦点を当てる。

## 検出結果

| 場所（file:line＋引用） | 問題 | 深刻度 | 提案する修正 |
| --- | --- | --- | --- |
| `docs/manual/plugins/rigor-activerecord.md:81-82` —— 「**`db/schema.rb`のみ。** `db/structure.sql`（生SQLダンプ）はこのイテレーションではサポートしない。」 | **誤り。** PR #60が`db/structure.sql`サポートを追加した。`db/schema.rb`が存在しないとき、プロデューサーは`StructureSqlParser.parse(io_boundary.read_file(@structure_sql_file))`（`activerecord.rb:88-90`）にフォールバックする。この「制限」は、いまや出荷されたプラグインと矛盾している。 | 高 | 制限を削除するか、実際に残る制限に置き換える。structure.sqlは行単位で**PostgreSQL** DDLとしてパースされ（SQLパーサー依存なし）、マッピング不能なカラム型（カスタムenum、`tsvector`）は`Object`に劣化し、`public`スキーマ以外のパーティションテーブルはスキップされる。 |
| `docs/manual/plugins/rigor-activerecord.md:40-47`（Configurationブロック） —— `schema_file`、`model_search_paths`、`model_base_classes`のみを列挙。 | **設定キーの欠落。** プラグインの`config_schema`（`activerecord.rb:60-66`）は現在`structure_sql_file`（既定`"db/structure.sql"`）を宣言しており、これはフォールバックのスキーマソースである。未文書化。 | 中 | 設定ブロックと「Tweak them when」リストに`structure_sql_file: "db/structure.sql"  # default; PG DDL fallback when schema_file is absent`を追加する。 |
| `docs/manual/plugins/rigor-activerecord.md:33` —— テーブル行「\`db/schema.rb\` not readable → :warning `load-error`」。 | **ドリフト。** `load-error`は現在、`schema_file`**も**`structure_sql_file`**も**読めない場合にのみ発火する。`Errno::ENOENT`メッセージは`schema file \`...\` (or \`...\`) not found`（`activerecord.rb:534-535`）と表示する。この行は警告の発火条件を過大に述べている。 | 低 | 「no schema source (`db/schema.rb` or `db/structure.sql`) readable」に書き換える。 |
| `docs/manual/plugins/rigor-actionpack.md:42` —— `unknown-permit-key`「発火条件: リテラルの`permit(:key)`がモデル上のカラムでないとき（did-you-mean付き）」。 | **ドリフト（挙動が狭められた）。** PR #60がこれを**タイポゲート**に変えた。現在は、キーが実在するカラムから編集距離≤2以内にある場合にのみ発火する（`PERMIT_KEY_TYPO_MAX_DISTANCE = 2`、`analyzer.rb:64`）ため、どのカラムとも似ていない正当な仮想属性（`password`、`remember_me`、`attr_accessor`）はもはや発火しない。ドキュメントは依然として*任意の*非カラムで発火するかのように示唆している。 | 中 | 「発火条件」を「リテラルの`permit(:key)`が実在するカラムのニアミス（編集距離≤2）だがそれ自体はカラムでないとき —— タイポの可能性が高い。どのカラムとも似ていない仮想属性はフラグされない」に書き換える。 |
| `docs/manual/07-plugins.md:30` —— activerecordの設定例`schema: db/schema.rb`。 | **誤った設定キー。** 実際のキーは`schema_file`（`activerecord.rb:61`）であり、`schema`は認識されるキーではない。既存の問題だが、これは概説章の唯一の具体的なプラグイン設定例である。 | 中 | `schema_file: db/schema.rb`に変更する。 |
| `docs/manual/plugins/rigor-activerecord.md:35-36` —— 「Did-you-meanの提案は、解決されたテーブルのカラム名に対してレーベンシュタイン距離≤3を使う。」 | **不正確なメカニズム（既存）。** `Plugin::Base.suggest`（`base.rb:657-661`）は`DidYouMean::SpellChecker`に委譲しており、その受理条件は固定のレーベンシュタイン≤3ではなく、Jaro-Winkler≥0.77／スケール済みレーベンシュタインのブレンドである。今回の変更セットの範囲外だが、検証中に浮上した。 | 低 | 「Did-you-meanの提案は、解決されたテーブルのカラム名に対して`DidYouMean`のあいまいマッチングを使う」（正確な`≤ 3`を落とす）に書き換える。 |

## 意図的な簡略化（欠陥ではないと検証済み）

- **rigor-activesupport-core-ext.md:36-52** —— 「What it covers」リストはPR #61の追加
  （`String#upcase_first`/`#remove`/`#titlecase`/`#dasherize`、`Object#in?`、
  `Date`/`Time#advance`/`#all_day`、`Date#to_time(form)`、`ERB::Util.html_escape_once`）を
  列挙していない。ドキュメントは明示的にこのリストを「Roughly the top ~40 selectors plus
  their close neighbours」および「Top ~40 selectors, not exhaustive」（77-78行）と枠付け
  しているため、完全性についての誤った主張はしていない。変更不要。
- **rigor-actionpack.md** —— 新たな`require`/`permit`/`permit!` → `ActionController::Parameters`
  の戻り値型付け（`actionpack.rb:198-200`）は、カバレッジを追加する推論であって
  diagnosticではない。ドキュメントの「What it checks」セクションはdiagnosticsのテーブルで
  あり、推論の詳細を省くことは忠実度のギャップではないし、ここで文章の詳しさは美徳ではない。
- **rigor-rails-routes.md:53-78** —— Grapeセクションは**正確かつ最新**である。
  `grape_api_paths`の既定`["lib/api", "app/api"]`は`rails_routes.rb:79`と一致し、
  `_path`ヘルパーのみがカバーされる（`_url`は依然として発火する）という主張は
  プラグインの契約と一致する。変更不要。
- **rigor-rails-routes.md:34-51**（「Recognised routing DSL」）は既に
  `member`/`collection`/`scope`を汎用的にカバーしているため、PR #60の名前合成の修正
  （複数セグメントの文字列アクション、名前付きスコープ内の裸のシンボルアクション）は、
  訂正すべき誤った主張を導入しない。

## 判定

変更されたプラグインのケイパビリティは、おおむね未文書化ではあるが誤記述はされていない。
ただし1つの明確な矛盾がある。**rigor-activerecordのLimitationsは依然として
`db/structure.sql`が非サポートだと宣言している（高）** —— これはPR #60で出荷されたものの
正反対であり、エリアCで最もユーザーに見える虚偽である。同じPRから2件の中程度の項目が
続く（欠落した`structure_sql_file`設定キーと、タイポゲートの挙動にもはや一致しない
`unknown-permit-key`のテーブルセル）。加えて概説章の唯一のactiverecord例における
誤った設定キー（`schema`対`schema_file`）がある。GrapeとAS core-extのドキュメントは
クリーンである。既存の低深刻度のメカニズム不正確さが2件（`load-error`の発火条件と
「レーベンシュタイン≤3」という言い回し）でリストを締めくくる。捏造されたケイパビリティも、
古くなったプラグイン名も見つからなかった。
