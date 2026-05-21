---
title: "Mastodonサーベイ — クラスター4（フローフォールディング警告）トリアージ"
description: "rigortype/rigor docs/notes/20260521-mastodon-cluster4-flow-folding-triage.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/notes/20260521-mastodon-cluster4-flow-folding-triage.md"
sourcePath: "docs/notes/20260521-mastodon-cluster4-flow-folding-triage.md"
sourceSha: "55d1ab574e941144226811d09119cace592eff875e234539a1738a5081429c43"
sourceCommit: "626e04cb1ce26d1b1500ed80d078dac891053fd2"
sourceDate: "2026-05-21T01:22:03+09:00"
sourceLanguage: "en"
translationStatus: "translated"
sidebar:
  order: 20266521
---

**日付:** 2026-05-21。[`20260519-oss-library-survey.md`](../20260519-oss-library-survey/)
Mastodonフォルスポジティブパスのうちまだトリアージされていない最後のクラスターをクローズ。

## スコープ

Mastodonチェックアウト（≈3,180のRubyファイル、`--workers=8`）に対する`rigor check app lib`は、**8件**のフローフォールディング警告 —
`condition is always truthy` / `condition is always falsey` — を表面化する。その他のすべてのサーベイクラスター（1、1b、2、3）は`[Unreleased]`サイクルの前半で解決済み;このノートは残り8件をトリアージする。

## 結論

**8件すべてがフォルスポジティブ。実バグはゼロ**。2つのエンジンギャップに分類される — どちらも既存の問題であり、どちらも*ナローイングに反映されないミューテーション*に関するもの。

### G1 — ループ / retryボディのミューテーションが未反映（3件の警告）

条件がループ / `retry`ボディ内でのみミューテーションが起こる変数を読んでいるが、ナローアーはその`retry`エッジを条件前の型にフォールドバックしない。

| サイト | 条件 | FPである理由 |
| --- | --- | --- |
| `lib/mastodon/snowflake.rb:19` | `raise if tries > 100` | `tries = 0`、その後`retry`ごとに`tries += 1`;`retry`エッジがフォールドされないため`tries`は`Constant[0]`のまま。 |
| `app/lib/link_details_extractor.rb:294` | `html = @html unless encoding` | `encoding = nil`、その後`.each`ループ内で`encoding = enc`;ループボディの書き込みが反映されないため`encoding`は`nil`のまま。 |
| `app/lib/activitypub/linked_data_signature.rb:53` | `... if context_with_security.size == 1` | 配列は`<<` / `uniq!`で構築されており、`size`はミューテーション前の形状に対してフォールドされる。 |

これはまさに**オープンエンジニアリング項目0**（`docs/CURRENT_WORK.md`） — 3つの残存`rigor check lib`警告（`hkt_body_parser.rb`、`hkt_registry.rb`）と同じ形。修正は`docs/type-specification/control-flow-analysis.md` §「mutation effects」下のミューテーションエフェクトモデルに存在;引き続きキューされた中規模エンジン変更。Mastodonはデマンドシグナルに3つのデータポイントを追加する。

### G2 — ivar型がリテラル書き込みから取られ、ミューテーションで無効化されない（5件の警告）

条件がエンジンによってリテラル書き込み（`@x = false` / `@x = []`）から型が取られたインスタンス変数を読んでいるが、その変数はフローが追跡しないパスによってミューテーションされる:中間メソッド呼び出し、インプレースの`<<`、または読み取り前書き込みの`nil`状態。

| サイト | 条件 | FPである理由 |
| --- | --- | --- |
| `app/workers/activitypub/delivery_worker.rb:39` | `if @performed` | `@performed = false`;`perform_request`が`@performed = true`をセットするが、中間の呼び出しが`Constant[false]`バインディングを無効化しない。 |
| `app/workers/activitypub/delivery_worker.rb:41` | `elsif !@unsalvageable` | `@unsalvageable`は`perform_request`内（`= true`として）でのみ書き込まれる;呼び出しのivarへのエフェクトがモデル化されていない。 |
| `app/services/fetch_oembed_service.rb:69` | `return unless URL_REGEX.match?(@endpoint_url)` | `@endpoint_url`は姉妹メソッドにセットされる;`cache_endpoint!`では`nil`にフォールドされるため、`Regexp#match?(nil)`が定数フォールドで`false`になる。 |
| `app/lib/activitypub/activity/create.rb:185` | `return if @tags.empty? \|\| ...` | `@tags = []`;後で`@tags << hashtag`で埋められる。`<<`は呼び出しであって`InstanceVariableWriteNode`ではないため、アキュムレーターが`@tags`を空のリテラルのまま保持する。 |
| `lib/chewy/strategy/bypass_with_warning.rb:7` | `... unless @warning_issued` | `@warning_issued`は唯一の書き込み（`= true`）より前に読まれる;ivarアキュムレーターは書き込みのみをユニオンし、読み取り前書き込みの`nil`を見落とすため、`Constant[true]`にフォールドされる。 |

統一的な原因:**インスタンス変数の型がリテラル書き込みから導出され、フロー解析が追跡しないミューテーションポイントを制御が通過した後で拡大されない** — 中間メソッド呼び出し（任意のivarに触れる可能性がある）、インプレースの`<<`、または書き込み前読み取りivarの未初期化`nil`状態。原則的な修正はG1と同じ`control-flow-analysis.md` §「mutation effects」サーフェスに属する:モデル化されていないミューテーションポイントの後、ivarバインディングはクロスメソッドアキュムレーター型（ivarが書き込まれていない可能性があるときは`nil`も含む）へと縮退すべき（SHOULD）。

## 決定

- **実バグなし**、よってMastodon側での診断サプレッションやコード変更は不要。
- **G1 + G2はキュー済みのまま**、ミューテーションエフェクトモデル下のエンジン改善として。このノートによってスケジュールされるものはない:それぞれが実際の精度リグレッションリスクを持つ中規模変更であり（ivar / ループ変数型を拡大すると他の場所で正当なナローイングが失われる可能性がある）、また警告が`:warning`であって`:error`ではない。
- Mastodon`[Unreleased]`サーベイサイクルの診断クラスターは**すべてトリアージ完了**（1、1b、2、3は修正済み;4 = FP、キュー済み）。
