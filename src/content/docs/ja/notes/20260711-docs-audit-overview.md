---
title: "概要ドキュメントの忠実度監査 —— 2026-07-11"
description: "rigortype/rigor docs/notes/20260711-docs-audit-overview.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-audit-overview.md"
sourcePath: "docs/notes/20260711-docs-audit-overview.md"
sourceSha: "1dcdda1e6b939732a460432fbf52433e2ce3765a5965532276608cfde5e27314"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

Rigorのユーザー向け**概要**ドキュメント（フロントドア＋ワンページャー＋カタログ）を忠実度のレンズで見て、ブランチ`docs/consistency-audit-0.2.9`（`Rigor::VERSION = 0.2.8`、`[Unreleased]`＝0.2.9カット）の現在のツリーと突き合わせた。対象は`README.md`、`docs/types.md`、`docs/compatibility.md`、`docs/install.md`、`plugins/README.md`、`examples/README.md`。

先に結論を述べると、概要ドキュメントは良好な状態にある。機能の追随漏れなし、カタログ件数のドリフトなし、廃止済みコマンド／フラグの残存なし。本物の不正確さは3件で、いずれもリファレンス層（互換性サーフェス＋インストールの経路案内）にあり、READMEの設計上のコミットメントには一切ない。

## 検出結果

| 場所（file:line＋引用） | 問題 | 深刻度 | 提案する修正 |
| --- | --- | --- | --- |
| `docs/compatibility.md:73` —— 「the [ADR-37] narrow protocols: `node_rule` / `dynamic_return` / `type_specifier`」 | `type_specifier`は**v0.2.6**で`narrowing_facts`にリネームされた（ADR-80、出荷済み。`lib/rigor/plugin/base.rb:395` `def narrowing_facts`、`:413` `def type_specifier`は非推奨警告を出すエイリアスで0.3.0で削除）。公開サーフェスの*権威*ドキュメントが、凍結済みフックの正規名として非推奨の動詞を挙げてしまっている。 | MISLEADING | `narrowing_facts`に変更する（任意で「`narrowing_facts`（旧`type_specifier`、ADR-80）」）。 |
| `docs/compatibility.md:76`＋`:103` —— キャッシュマーカー「（marker `4.2`）」／「Current value `4.2`」 | `schema_version.txt`のマーカーは`PAYLOAD_ABI_VERSION.SCHEMA_VERSION.FORMAT_VERSION`（`store.rb:127`）として構成され、`PAYLOAD_ABI_VERSION = Rigor::VERSION`（`store.rb:38`、`[Unreleased]`のとおり今サイクルで畳み込まれた）。実際のディスク上のマーカーは`4.2`ではなく`<version>.4.2`（例: `0.2.8.4.2`）。リテラル値をキーにするパイプラインは誤誘導される。ドキュメントの2部構成の式もバージョン成分を省いている。 | FRICTION | マーカーを`<Rigor::VERSION>.<SCHEMA>.<FORMAT>`（現在は`<version>.4.2`）として挙げるか、リテラル値を落として「バージョン＋スキーマ＋フォーマットで構成され、無効化はされても誤読はされない」と記述する。 |
| `docs/install.md:46-47`（ケースA: `mise use ruby@4.0`のプロジェクトローカル、「`mise.toml`をコミット」）対`README.md:19-21,113-121`（グローバル`-g`、「各プロジェクトは自身のRubyを保つ」） | READMEの「ツールはRuby 4.0で動くがプロジェクトは自身のRubyを保つ」という仕組みは**グローバル**`-g`インストールである。ところがinstall.mdのケースAは`ruby@4.0`を**プロジェクトローカル**にピン留めしてコミットし、プロジェクト自身のRubyを上書きしてしまう —— READMEの中心的な約束と矛盾する。2つのフロントドアのインストール経路がグローバルかローカルかで食い違っている。 | FRICTION | ケースAをREADMEに合わせる: `mise use -g ruby@4.0`＋`mise use -g gem:rigortype`（グローバルなツールのピン留め）。あるいは、意図的な使い分けであることと、プロジェクトローカルではプロジェクトをRuby 4.0にピン留めすることを説明する一文を加える。 |

## 正確さを確認（ドリフトなし）

- **プラグインカタログの件数** —— `plugins/README.md:2`「Thirty-one entries」は`plugins/`配下の31ディレクトリと一致する。すべてのディレクトリがカタログに載っている。（CLAUDE.mdが警告する件数は現時点で正しい。）
- **サンプルカタログ** —— `examples/README.md:3`「Six walkthroughs」は`examples/`配下の6ディレクトリと一致する（`rigor-web`を含む）。
- **すべてのCLIコマンド** —— ドキュメント全体で挙げられているものはすべて`CLI::HANDLERS`（`cli.rb:23-47`）に解決する: `check init annotate type-of explain sig-gen lsp mcp baseline triage coverage plugins plugin playground skill describe docs show-bleedingedge doctor upgrade`（＋`trace type-scan diff`）。
- **`rigor docs`のサブ形式**（`README.md:226-230`） —— `rigor docs`、`rigor docs handbook/03-narrowing`、`rigor docs --list`はいずれも`docs_command.rb`（カテゴリー修飾名／`--list`）と一致する。
- **参照されているスキル** —— `rigor-plugin-author`、`rigor-baseline-reduce`、`rigor-next-steps`、`rigor-ask`はすべて`skills/`配下に存在する。
- **キャッシュディレクトリ** —— READMEの「caches under `.rigor/`」は`.rigor/cache`の既定（`configuration.rb:59`）と一致する。
- **ベースラインのバージョン**`1`、**`documentation_uri` → master**、CIのネイティブフォーマット、そして「Hello, Rigor」の`demo.rb:7:3`の行／列はすべて確認済み。
- **READMEの設計上のコミットメント** —— アノテーション不要／値からの推論／sig-genの同期／偽陽性は最悪のバグ／spec assertions のスタンス（ADR-59）に関する記述は、現在の挙動と矛盾しない。
- **今サイクルの機能**（`db/structure.sql`、actionpackのstrong-params、モジュールのシングルトンADR-57 WD3、外部gemの由来ADR-82 WD9、grape-path-helpersの名前空間、`coverage`の並列化＋パス無しの`paths:`フォールバック）はすべて`[Unreleased]`にある。READMEの`Status`が依然`v0.2.8`と読めるのは正しい（まだリリースされていない）ので、これは追随漏れではない。

## 意図的な簡略化（フラグしない）

- `docs/types.md`の表示規約（`Constant<3>`、`int<0, max>`）は、エンジンの`#describe`／internal-specのブラケット形式とは意図的に異なる —— ドキュメントがそう明言している（29行目）。概念的なクイックガイドで、正しく非網羅的である。
- `docs/compatibility.md:71`のCLIリストは「…」で終わっている。明示的な非網羅マーカーがあるので、名前付きの集合から新しめの`docs`／`doctor`を省くのは問題ない（せいぜい重箱の隅）。
- `plugins/README.md:6`「(v0.1.11)」はバンドリングが入った時点を示す歴史的なアンカーであり、現在のバージョンに関する主張ではない —— 書かれているとおり正確。

## 結論

概要ドキュメントは最新で、おおむね忠実である: 機能セット、プラグイン（31）とサンプル（6）のカタログ件数、参照されているすべてのコマンド／フラグ、スキル、そしてREADMEの設計上のコミットメントは、いずれもツリーと突き合わせて確認でき、今サイクルの機能は`[Unreleased]`として正しく保留されている。本物の欠陥は2つのリファレンス権威ドキュメントにのみ存在する —— `compatibility.md`が依然として`narrowing_facts`ではなく非推奨の`type_specifier`フックを挙げている（凍結された語彙を定義するまさにそのドキュメントでのMISLEADINGなドリフト）ことと、`Rigor::VERSION`が畳み込まれた今となっては陳腐化したキャッシュマーカー値（`4.2`）を引用していること —— に加えて、`README.md`と`install.md`ケースAの間のグローバル対プロジェクトローカルのRubyピン留めの不整合である。3件とも小さく局所的な編集で、型モデルの散文にもプラグインカタログにも触れない。
