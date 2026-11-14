---
title: "gem_rbs_collection監査 — 196個のシグネチャディレクトリに対する`rigor check`と`sig-gen --diff`の実行"
description: "rigortype/rigor docs/notes/20261106-gem-rbs-collection-audit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20261106-gem-rbs-collection-audit.md"
sourcePath: "docs/notes/20261106-gem-rbs-collection-audit.md"
sourceSha: "201c8e8217df27dc91fc2faacbbbed550c7bd3a4871173f3a123b92cf3564dd7"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-07T00:54:51+09:00"
translationStatus: "translated"
sidebar:
  order: 20267106
---

ステータス: フィールドレポート、設計上の確約なし。2026-11-06に`ruby/gem_rbs_collection`の作業チェックアウトに対してrigor 0.4.7（miseでインストール）で取得した。問い: Rigorはコレクション既存の`rbs validate` + `steep check` + `check-untyped-call`パイプラインの上に、推論ベースの第2の検証レイヤーを追加できるか — そして実際に何を捕捉するのか？

## 手法

`_test/`を含む各`gems/<name>/<version>`ディレクトリ（計196個）に対して以下を実行した。

- テストスクリプトに対する`rigor check`（`.rigor.yml` = `paths: ["."], signature_paths: [".."]`）— コレクションのRBSを直接読み込み、`rbs collection`による解決は行わない。`manifest.yaml` / gemspecの依存関係を持つgem（例: sinatra → rack）は、その依存先のコレクションディレクトリを手動で`signature_paths`に追加する必要がある。
- インストール済みgemの`lib/`に対する`rigor sig-gen --diff --format=json` — 手書きRBSのオラクルとして実装を用いる。

ハーネス: gem_rbs_collectionチェックアウト内の`bin/rigor_audit`（単一ディレクトリ用）および`bin/rigor_audit_all`（バッチ処理、JSONL出力、再開可能）。集計データは`tmp/rigor_audit.jsonl`（git管理対象外）に格納した。

## `rigor check`の結果

130/196がクリーン、19個のgemで42件のエラー、198件の警告。

エラーは次の3種類に分かれ、Rigor自身の問題は1種類のみである。

1. **Rigorの偽陽性 — `def self.new:`の無視**（email_address/0.2、14件のエラー）。
   RBSは`def self.new: (...) -> Address`と宣言しているが、Rigorは代わりに`initialize`/デフォルト構築を通じて`.new`を解決し、レシーバーを外側のクラスとして型付けしてしまう。最小再現手順を確認済みであり、<https://github.com/rigortype/rigor/issues/2884>として起票した。これは不可欠なRBSのイディオムであり、別のクラスを返すように`new`をオーバーライドするシグネチャは、まさにコレクション内でファクトリーを型付けする手法である。

2. **実際のRBSのバグ、Rigorが正しい**（retryable/3.0、4件のエラー）。`options`レコード型が10個のキーすべてを**必須**（`contexts:`、`ensure:`、… — `?`キーマーカーがなく、nil許容の値型のみ）として宣言していた。`Retryable.retryable({ sleep: 3.2 })`は実際に9個の必須キーを省略している。Steepがこの呼び出しを受け入れたのは、キーワード経路が寛容だからではなく（キーワードはすでに`?sleep:`だった）、失敗箇所が閉じたレコードに対する*位置引数のHash*であるためである。RigorのチェックはRBSのレコード意味論に照らして正しい。コレクション側の修正は「同じエイリアス上のすべてのキーをオプショナルにする」ことではない。`options`は常に10個のキーすべてを返す`#to_hash` / `#merge`の戻り値でもあるためだ。`option_overrides`（入力、オプショナルキー、非nil値）と`options`（出力、必須キー、非nil値）に分割する。nil許容値（`sleep?`）は別の不正確さであった — `Kernel.sleep(nil)`は例外を送出するため、存在するキーがnilになることはない。ruby/gem_rbs_collection#1126。

3. **意図的なエラー**（protobuf/3.10.3、4件のエラー）: `___error___`はsteep側が失敗期待のアサーションに使うマーカーである。CIゲートではこれらをベースライン化する。

警告はDSL/instance_evalブロックにおける`call.unresolved-toplevel`が大半を占める（actionpack 56件、simplecov 18件、moneta、slack-notifier）— これは想定内であり、`--fail-on=error`が適切なゲートになる。`rbs.coverage.definition-build-failed`の1種類は重要である: abbrev/0.1のコレクションRBSが**Rigorにバンドルされたstdlib RBSと衝突する**（`DuplicatedMethodDefinitionError`）— デフォルトgemのシグネチャをコレクションに含めることで生じる相互作用であり、他のツールでは表面化しない問題である。

## `sig-gen --diff`の結果（189 gem）

| 分類 | 合計 | 解釈 |
| --- | ---: | --- |
| `new_method` | 27,316 | コレクションRBSに欠落しているpublicメソッド（stripe/20.0: 9,613） |
| `tighter_return` | 2,736 | 宣言より厳密であることが証明可能な戻り値（activerecord/8.1: 374、mail/2.8: 107） |
| `skipped` | 97,211 | 大半が`sig.skipped.untyped-return` — ADR-5は`untyped`の提案を行わない |

`tighter_return`は対処可能なストリームである: ノイズがほぼゼロの厳密化候補であり、人間がレビューしたうえで1 PRずつ適用する。`new_method`はカバレッジ指標であってゲートではない — コレクションは意図的に主要なAPIから先に型付けしている。`bot`の提案は常に例外を送出する抽象メソッドで現れるため、盲目的に適用するのではなくレビューが必要である。

## この結果がRigorについて示すこと

- 第2の推論エンジンは十分な価値を発揮した: steep自身のチェックが何年もグリーンだった、仕様レベルの実際のRBSバグ（retryableの必須キー）を捕捉した。
- このユースケースに固有の2つの摩擦点: `def self.new:`（#2884）と、コレクションに含まれたデフォルトgemによるバンドル済みstdlibとの衝突。
- `_test`ディレクトリごとの`signature_paths`の構成は機能するが、手作業で選んだgem以外にもスケールさせるには依存関係の展開（`manifest.yaml` / gemspecの読み取り）が求められる。
- コレクションのCIレーンには`--fail-on=error` + 小さなベースラインで十分である。警告レベルのDSLノイズは想定内であり、ブロックはせず可視化されたままとなる。

## フォローアップ

- 起票済み: rigortype/rigor#2884（`def self.new:`の戻り値型が無視される問題）。
- gem_rbs_collectionでの修正PR: retryable/3.0における`option_overrides` / `options`の分割（ruby/gem_rbs_collection#1126）。
- 採用する場合: `rbs_collection.yaml`相当の解決を通じて依存RBSを解決するよう`bin/rigor_audit_all`を拡張し、レビュアーの優先順位付けのために`new_method`カバレッジでgemをランク付けする。
