---
title: "rigor-sidekiq"
description: "rigortype/rigor docs/manual/plugins/rigor-sidekiq.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-sidekiq.md"
sourcePath: "docs/manual/plugins/rigor-sidekiq.md"
sourceSha: "be8d0f5bb3c618e4e483ae8d28bd43d1a9ffc0ebe9de95093655fafe2c0db2f9"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

Sidekiqのエンキュー呼び出し ── `Worker.perform_async(...)`、`.perform_inline(...)`、`.perform_in(t, ...)`、`.perform_at(t, ...)` ── を、発見されたワーカーの`#perform`のアリティ（arity）に対して検証します。設定された検索パスを走査し、`include Sidekiq::Job`（またはレガシーの`Sidekiq::Worker`）するクラスをマッチさせることでワーカーを発見します。ソースのみを読み、`sidekiq`のランタイム依存はありません。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-sidekiq
```

## 何をチェックするか

```ruby
# app/workers/welcome_email_worker.rb
class WelcomeEmailWorker
  include Sidekiq::Job
  def perform(user_id, locale = "en")   # arity 1..2
  end
end

WelcomeEmailWorker.perform_async(123)          # info:  matches #perform (arity 1..2)
WelcomeEmailWorker.perform_in(60, 123, "ja")   # info:  schedule carved out, 123/"ja" forwarded
WelcomeEmailWorker.perform_async              # error: expects 1..2 argument(s), got 0
WelcomeEmailWorker.perform_in                 # error: requires a schedule as its first argument
```

`perform_in` / `perform_at`は最初の引数をスケジュール（間隔 / Time）として消費します。残りの引数は`#perform`に対して検証されます。`perform_async` / `perform_inline`はすべての引数を転送します。

| ルール | 重大度 | 発火条件 |
| --- | --- | --- |
| `plugin.sidekiq.worker-call` | info | `Worker.perform_*`呼び出しが発見されたワーカーの`#perform`アリティにマッチした |
| `plugin.sidekiq.wrong-arity` | error | 転送される引数の個数が`#perform`のアリティの範囲外に収まる（メッセージは`perform_in` / `perform_at`のスケジュール切り出しを示します） |
| `plugin.sidekiq.missing-schedule` | error | `perform_in()` / `perform_at()`が引数ゼロで呼ばれた（`#perform`が引数を取らない場合でもスケジュールは必須） |
| `plugin.sidekiq.load-error` | warning | ワーカーの発見に失敗した（パース / 読み込みエラー） ── ファイルごとに1回 |

## 設定

```yaml
plugins:
  - gem: rigor-sidekiq
    config:
      worker_search_paths: ["app/workers", "app/sidekiq"]          # default
      worker_marker_modules: ["Sidekiq::Job", "Sidekiq::Worker"]   # default
```

デフォルトの`worker_marker_modules`は、モダンなSidekiq（`Sidekiq::Job`、6.3以降）とレガシーの`Sidekiq::Worker`の両方をカバーします。

## 制限事項

- **直接の`include`のみ**。`Sidekiq::Job`を再includeするカスタムconcernをミックスインするワーカーは発見されません ── 中間のモジュールを`worker_marker_modules`に追加してください。
- **構文的なアリティのみ**。`#perform`のアリティはパラメータリストから読まれます。`define_method`で構築されたメソッドは対象外です。
- **キーワード引数の検証はなし**。Sidekiqは引数をJSONにシリアライズするため、位置引数が標準的なシェイプ（shape）です。
- **スケジュールの型は検証されません**。`perform_in` / `perform_at`の最初のスロットは、その型に関係なくスケジュールとして消費されます。
- **チェーンされた`set(...)`**（`Worker.set(queue: "low").perform_async(...)`）は通常の呼び出しとして検証されます。`set`自身のオプションはチェックされません。

## プラグイン内部

ワーカーの発見器 / インデックスと、このプラグインが行使する契約（contract）サーフェス（surface）は[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sidekiq/README.md)にあります。プラグインの書き方は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
