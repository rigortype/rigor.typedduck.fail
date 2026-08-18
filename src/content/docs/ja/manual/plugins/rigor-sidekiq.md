---
title: "rigor-sidekiq"
description: "rigortype/rigor docs/manual/plugins/rigor-sidekiq.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-sidekiq.md"
sourcePath: "docs/manual/plugins/rigor-sidekiq.md"
sourceSha: "2b728564bd237aedbd18a1dcc52bfb2aea6d01550ca3d97f47ecf0078b3669ba"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
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
      schedule_paths:                                              # default
        - "config/schedule.yml"
        - "config/sidekiq.yml"
```

デフォルトの`worker_marker_modules`は、モダンなSidekiq（`Sidekiq::Job`、6.3以降）とレガシーの`Sidekiq::Worker`の両方をカバーします。

`schedule_paths`は、下記の到達可能性ルートの背後にあるスケジュール*ファイル*です —— ディレクトリではありません。デフォルトは2つのスケジュールレイアウトが慣例的に置かれる場所です;スケジュールを別の場所に置いているなら自分のパスを列挙してください。

## `rigor unused`向けのワーカールート

cronでスケジュールされたワーカーは**YAMLから名前で**エンキューされるので、`NightlyReportWorker`はあなたのコードのどこにも現れないことがありえます。助けがなければ、[`rigor unused`](../../02-cli-reference/#rigor-unused)は毎晩走るジョブを死んでいる可能性ありと報告します。このプラグインはあなたのスケジュールが名指しするワーカーを供給するので、それらは候補リストから外れます:

```yaml
# config/schedule.yml (sidekiq-cron)      config/sidekiq.yml (sidekiq-scheduler)
nightly_report:                           :scheduler:
  cron: "0 3 * * *"                         :schedule:
  class: "NightlyReportWorker"                nightly_report:
                                                every: "1h"
                                                class: "NightlyReportWorker"
```

読むのは`class:`キーだけで、他は何も読みません。特に**キュー名はクラス名ではありません**: `sidekiq.yml`の`:queues:`リストはルートを供給しません。`report_worker`を`ReportWorker`に活用変化させれば、命名の偶然でワーカーをルートにしてしまうからです。また、プラグインが発見したことのないワーカーを名指しする`class:`は、公開されるのではなく落とされます。だからタイポの代償はルート1つであって、死んだワーカーが黙って隠れることではありません。

`MyWorker.perform_async`は引き続き何も供給しません —— それはレポートが既に見ている通常の定数参照です。`app/workers`配下にファイルが存在するだけでも同様です: 何もエンキューしないワーカーはレポートに残ります。それがあなたの望んだ答えです。

スケジュールは`YAML.safe_load`で読まれ、何も起動しません。存在しない・読めない・不正な形式のファイルは、ランの残りに影響することなくスキップされます。

ワーカーが`Sidekiq::Job`を直接ではなくプロジェクトのconcern（`include ApplicationWorker`）をincludeしているなら、そのconcernを`worker_marker_modules`に追加してください —— さもなければプラグインはワーカーを1つも発見せず、スケジュールされたすべての名前が落とされ、ルートはまったく得られません。GitLabの`config/schedule.yml`は111のワーカーを名指しし、そのすべてがconcernベースです: デフォルトのマーカーではルートは0、`ApplicationWorker`を追加すれば100になります。

## 制限事項

- **直接の`include`のみ**。`Sidekiq::Job`を再includeするカスタムconcernをミックスインするワーカーは発見されません ── 中間のモジュールを`worker_marker_modules`に追加してください。
- **構文的なアリティのみ**。`#perform`のアリティはパラメータリストから読まれます。`define_method`で構築されたメソッドは対象外です。
- **キーワード引数の検証はなし**。Sidekiqは引数をJSONにシリアライズするため、位置引数が標準的なシェイプ（shape）です。
- **スケジュールの型は検証されません**。`perform_in` / `perform_at`の最初のスロットは、その型に関係なくスケジュールとして消費されます。
- **チェーンされた`set(...)`**（`Worker.set(queue: "low").perform_async(...)`）は通常の呼び出しとして検証されます。`set`自身のオプションはチェックされません。
- **スケジュールルートは`class:`からのみ読まれます**。`sidekiq-cron`の別綴り`klass:`や、`Sidekiq::Cron::Job.load_from_hash!`でRubyで構築されたスケジュールはルートを供給しません —— そのワーカーは推測されるのではなく`rigor unused`の候補のままにとどまります。

## プラグイン内部

ワーカーの発見器 / インデックスと、このプラグインが行使する契約（contract）サーフェス（surface）は[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sidekiq/README.md)にあります。プラグインの書き方は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
