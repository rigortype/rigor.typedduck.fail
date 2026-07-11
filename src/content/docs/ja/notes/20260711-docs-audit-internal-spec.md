---
title: "ドキュメント監査 —— `docs/internal-spec/`の忠実度 + 内部整合性レンズ（2026-07-11）"
description: "rigortype/rigor docs/notes/20260711-docs-audit-internal-spec.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-audit-internal-spec.md"
sourcePath: "docs/notes/20260711-docs-audit-internal-spec.md"
sourceSha: "c169991a1ca15695c6f1d78c2c4536787659c031787cd144692f972f7631cb7b"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

レンズ: 解析器内部の各契約主張を実際のエンジンコード（`lib/rigor/type/*`、`lib/rigor/inference/*`、`lib/rigor/scope*`）と突き合わせて検証し、internal-specコーパスの自己整合性を確認する。今サイクルの重点: ADR-53のディスカバリインデックス、ADR-82/ADR-75のプロヴェナンスサイドテーブル、ADR-80の`type_specifier`→`narrowing_facts`。

## 所見

| 場所（file:line + 引用）| 問題 | 深刻度 | 提案する修正 |
| --- | --- | --- | --- |
| `internal-type-api.md` §"Method Surface"（63–143）—— 「すべての具象型実装は以下に列挙するメソッドサーフェスを公開しなければならない（MUST）」（ケイパビリティ述語`string`/`integer`/…、射影`constant_strings`/…、関係`subtype_of`/`accepts`/`consistent_with`、構造`has_method`/`members`、メタ`normalize`/`traverse`）| stale-api / 設計上の理想と実装の乖離。実装されたキャリアはこのサーフェスを**公開していない**: `Type::Nominal`（およびその同類）が定義するのは`describe` / `erase_to_rbs` / 構造的等価性のみ。受理とサブタイピングは`Inference::Acceptance` + `Type::AcceptanceRouter`（キャリアメソッドではなく自由関数）に存在し、ケイパビリティチェックは`Type::Combinator`の互換性述語（`literal_string_compatible?`、`non_zero_int_compatible?`、…）として存在する。`def string`/`def integer`、`def subtype_of`、`def normalize`、`def traverse`、`def has_method`は`lib/rigor/type/*`のどのキャリアにも存在しない。| 中（ドキュメント自身の§Scope免責事項により緩和される: 名前はプレースホルダーであり、具象クラスのカタログはADR-3のopen-question-1、「実装中に改名される場合がある（MAY）」）| §"Method Surface"にステータスバナーを追加し、これは*設計上の（as-designed）*キャリア契約であることを明記する。実現されたアーキテクチャは、関係/ケイパビリティ操作をキャリアのインスタンスメソッドとしてではなく`Inference::Acceptance` / `Type::AcceptanceRouter` / `Type::Combinator`を通じてルーティングする。値オブジェクトのセクション（Trinary、AcceptsResult、識別性）はそのまま維持する —— これらは正確である。|
| `internal-type-api.md` §"Operations and combinators"（114）—— 「`union(*types)`、`intersect(*types)`、`difference(left, right)`、`complement_within(domain, type)`」および（115）「`refine(base, predicate)`」| stale-api（命名/欠如のドリフト）。コード（`type/combinator.rb`）: `union` ✓、しかし`intersection`（`intersect`ではない）、`refined(base, predicate_id)`（`refine`ではない）、そして**`complement_within`は存在しない**（`difference`のみ）。| 低 / 参考情報（「作業名 … 改名される場合がある（MAY）」により明示的に許容される）| 任意: 具体的な綴り`intersection` / `refined`に更新し、`complement_within`を削除するか未実装である旨を注記する（補集合は`difference`で実現される）。|
| `inference-engine.md:65` —— DiscoveryIndexのテーブル一覧が「…`data_member_layouts`、そして`struct_member_layouts`」で終わっている | stale-api / 列挙の不完全さ。`Scope::DiscoveryIndex`（`scope/discovery_index.rb`）には17番目の`Data.define`メンバー`param_inferred_types`（ADR-67のパラメーター推論 / ADR-82 WD7のパラメーターエンリッチメント）があり、`Scope#param_inferred_types`経由で公開される。ドキュメントはこの一覧を完全なものとして提示している。| 低〜中 | 列挙された一覧に`param_inferred_types`を追加する。これはADR-53のメンバーシップ基準（シード時、フロー不変）を満たす。|
| `inference-engine.md` §Scope surface / §Discovery Index（40–71）—— FactStoreのバケットとディスカバリインデックスを列挙しているが、ADR-75/ADR-82のプロヴェナンスサイドテーブルについては言及がない | 今サイクルのサーフェス変更に対するカバレッジギャップ。`Scope`は現在3つのアドバイザリーなサイドテーブル —— `dynamic_origins`（ADR-75、識別性キー付き、`record_dynamic_origin`）、`local_origins`、`ivar_origins`（ADR-82 WD1）—— を保持しており、これらは`Scope#==`/`#hash`から無視され、`rebuild`/`join`を通じて引き回される。ドキュメントのScopeサーフェスはこれらに一切触れていない。| 低 | 短い小節（「プロヴェナンスサイドテーブル（ADR-75 / ADR-82）」）を追加し、これらが等価性/フロー判断から除外されるアドバイザリーなメタデータであることを注記する。§Discovery Indexが不変な環境コンテキストテーブルを扱うのと同様に。|
| `inference-engine.md:95–100` —— 「`event`は次の構造的に等しいフィールドを持つ`Rigor::Inference::Fallback`値オブジェクトでなければならない（MUST）: `node_class`、`location`、`family`、`inner_type`」| stale-api（軽微）。コード（`inference/fallback.rb`）: `Fallback < Data.define(:node_class, :location, :family, :inner_type, :origin)` —— 5番目の`origin:`フィールド（デフォルト`nil`、ADR-75のプロヴェナンス）が、網羅的として提示された一覧から漏れている。| 低 | フィールド一覧に`origin`（任意、動的プロヴェナンスの原因）を追加するか、「次のフィールド」→「少なくとも次のフィールド」に言い換える。|

## コードを正しく追跡しているもの（検証済み、欠陥なし）

- **`Type::AcceptsResult`**（`internal-type-api.md` §"Result Value Objects"、50–57）は`type/accepts_result.rb`と正確に一致する: `trinary`/`mode`/`reasons`、`:gradual`は出荷済み / `:strict`は予約（raiseする）、`with_reason`は`nil`/空のとき`self`を返し決してミューテートしない、`include ValueSemantics` + `value_fields :trinary,:mode,:reasons`、`yes?`/`no?`/`maybe?`は保持するTrinaryに委譲する。
- **`Trinary`**（§"Trinary Result Value"）は`trinary.rb`と一致する: `yes`/`no`/`maybe`のフライウェイト、`yes?`/`no?`/`maybe?`、そしてコンビネーター`and`/`or`/`negate`。
- **FactStoreのバケット**（`inference-engine.md:56`）は`analysis/fact_store.rb`の`BUCKETS`と正確に一致する（`local_binding`、`captured_local`、`object_content`、`global_storage`、`dynamic_origin`、`relational`）; `Fact`は`bucket/target/predicate/payload/polarity/stability`を保持する。
- **Discovery Index**（§ADR-53）は形状について正確である: 不変な凍結`Data`、`Scope#with_discovery`が唯一のシーダー、テーブルごとの`with_discovered_*`ライターは廃止され、テーブルごとのリーダー（`user_def_for`、`data_member_layout`、…）はデリゲートとして残っている。メンバー一覧のみが陳腐化している（上記の所見を参照）。
- **名前付きScopeメソッド**はすべて存在する: `with_discovery`、`with_fact`、`local_facts`、`facts_for`、`type_of(node, tracer:)`、`join`、`user_def_for`、`data_member_layout`。
- **`diagnostic-shape.md`**は`analysis/diagnostic.rb`と正確に一致する: `path/line/column/message/severity/rule/source_family/receiver_type/method_name/project_definition_site`サーフェス、3つの構造化フィールドに対する`to_h`のomit-when-nil、そして`evidence_tier`/`documentation_url`がルールごとの`RuleCatalog`エンリッチメント（`Diagnostic`のフィールドではない）であるという正しい注記。`dynamic_origin`フィールドを主張していない点も正しい（それはカバレッジのみ）。
- **ADR-80の改名は最新である**: `plugin.md`（229–316）と`flow-contribution.md`（14）は、作者向けの動詞を`type_specifier`を非推奨とマークしたうえで`narrowing_facts`として記載しており（`plugin/base.rb`と一致）、一方でエンジンのリーダー / `rigor plugins` JSONキー`type_specifier_methods`は正しく変更しないままにしている —— まさにADR-80が述べたスコープどおり。

## 評決

internal-specコーパスは、その2つの荷重を担う層において現在のエンジンを忠実に追跡している: 具象値オブジェクトの契約（Trinary、AcceptsResult、FactStore、Diagnostic）と今サイクルの構造変更（ADR-53のDiscoveryIndex、ADR-80の`narrowing_facts`改名）は、メソッド名とフィールド一覧に至るまで正確であり、3つの小さな列挙の陳腐化のずれ（漏れた`param_inferred_types`ディスカバリメンバー、漏れた`Fallback#origin`フィールド、ADR-75/ADR-82のプロヴェナンスサイドテーブルへの言及なし）があるだけである。唯一の実質的な乖離は`internal-type-api.md`の§"Method Surface"であり、これは依然として創成期の設計上の（as-designed）キャリア契約として読める —— ケイパビリティ/関係/構造の操作を「すべての具象型が公開しなければならない（MUST）」インスタンスメソッドとして記述している —— が、実現されたアーキテクチャはこれらの操作をキャリアから`Inference::Acceptance` / `Type::AcceptanceRouter` / `Type::Combinator`へ移動させた。そのセクションは抽象的であることについて正直（明示的なプレースホルダー名とopen-questionの免責事項）なので、*間違っている*というよりは*理想的（aspirational）*なのだが、「キャリアXは`subtype_of`/`normalize`/`string`を公開するか」をコードと突き合わせて監査する読者は、公開していないことに気づくだろう。そのセクションに1行のステータスバナーを付ければ最後の実質的なギャップは埋まる; それ以外はすべて正確か、あるいは些細な追加的列挙の修正である。
