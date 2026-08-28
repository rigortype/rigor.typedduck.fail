---
title: "rigor-activejob"
description: "rigortype/rigor docs/manual/plugins/rigor-activejob.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activejob.md"
sourcePath: "docs/manual/plugins/rigor-activejob.md"
sourceSha: "6243d0c034e7d5a10e7b8037e427edd75d4436a45add3236c143252de1b24f88"
sourceCommit: "18d6992f544e6222fd7ed015ba6bbee6f0bd7f14"
translationStatus: "translated"
sidebar:
  order: 9050
---

`Job.perform_later(...)`／`.perform_now(...)`／`.perform(...)`の引数のアリティ（arity）を、発見した`#perform`定義に対して検証します。Railsのランタイム依存はありません ── このプラグインはPrism経由でプロジェクトのソースを読むだけです。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化します:

```yaml
plugins:
  - rigor-activejob
```

## 何をチェックするか

`#perform`が必須引数1個と任意引数1個（アリティ`1..2`）を取るジョブがある場合:

```text
demo.rb:8:1: info: `WelcomeEmailJob.perform_later` matches `#perform` (arity 1..2) [plugin.activejob.job-call]
errors_demo.rb:10:1: error: `WelcomeEmailJob.perform_later` expects 1..2 argument(s), got 0 [plugin.activejob.wrong-arity]
errors_demo.rb:14:1: error: `WelcomeEmailJob.perform_later` expects 1..2 argument(s), got 3 [plugin.activejob.wrong-arity]
```

`*rest`パラメータは上限のないアリティ（`arity 0+`）を生み出します。3つのエントリーポイントすべて ── `perform_later`（非同期）、`perform_now`（同期）、裸の`perform` ── は、同じ`#perform`のエンベロープに対して検証されます。

## 設定

```yaml
plugins:
  - gem: rigor-activejob
    config:
      job_search_paths: ["app/jobs"]                            # default
      job_base_classes: ["ApplicationJob", "ActiveJob::Base"]   # default
      recurring_paths: ["config/recurring.yml"]                 # default
```

`recurring_paths`は、下記の到達可能性ルートの背後にあるスケジュールの*ファイル*です ── ディレクトリではありません。デフォルトはSolid Queueの定期実行スケジュールが慣習的に置かれる場所です。別の場所に置いている場合は、自分のパスを列挙してください。

## `rigor unused`向けのジョブルート

Solid QueueはRailsが8.0からデフォルトで同梱するActive Jobバックエンドで、**定期実行タスク（recurring task）はジョブを文字列で名指しします**:

```yaml
# config/recurring.yml
production:
  send_reminder:
    class: "SendReminderJob"
    schedule: "*/3 * * * *"
```

このジョブは3分ごとに実行され、それに対する`perform_later`はどこにも存在しないため、定数スキャンは何も見ず、[`rigor unused`](../../02-cli-reference/#rigor-unused)は生きている本番コードを死んでいる可能性ありとして報告します。このプラグインは定期実行スケジュールが名指しするジョブを供給するので、それらは候補リストから抜け落ちます。

**すべての環境ブロックが読まれます**。`production:`だけではありません ── `staging:`でスケジュールされたジョブも依然として生きているコードです。環境なしのフラットなドキュメントも機能します。

読まれるのは`class:`だけです。`command:`エントリーはインラインのRubyであり（`command: "SomeModel.cleanup"`）、任意のスニペットから定数をパースすることは推測に基づいてクラスをルート化することになるため、何も供給しません。プラグインが一度も発見していないジョブを名指しする`class:`は、公開されるのではなく捨てられます: タイプミスの代償は、死んだジョブを静かに隠すことではなく、ルートを1つ失うことです。

スケジュールは`YAML.safe_load`で読まれます。Railsをブートするものも、Solid Queueをロードするものもありません。

## 制限事項

- **直接のスーパークラスのみマッチ**。`BaseJob < ApplicationJob`である状況下での`class WelcomeJob < BaseJob`は、`BaseJob`を`job_base_classes`に追加しない限り発見されません。
- **構文上のアリティ**。`#perform`のアリティはパラメータリストから読み取られます。`define_method`で構築された`#perform`は対象外です。
- **位置アリティのみ**。必須のキーワード引数は発見器によって記録されますが、呼び出し箇所ではまだ検証されません。
- **ルートは定期実行スケジュールからのみ**。ジョブが`rigor unused`向けにルート化されるのは`config/recurring.yml`がそれを名指しするときであり、`app/jobs`配下に存在するというだけでは決してルート化されません: `MyJob.perform_later`はジョブを、レポートが既に記録している通常の定数として名指ししており、発見されたすべてのジョブをルートにすれば、孤児になったジョブを、証拠なしに永久に到達可能とマークしてしまいます。`recurring_paths`配下のファイルからではなくRubyからロードされるスケジュールは、同じ「書かれたものだけを読む」ルールにより、何も供給しません。

## プラグインの内部

ジョブの発見器／インデックス、キャッシュされた`:job_index`プロデューサー、デモ、そしてこのプラグインが行使する契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activejob/README.md)にあります。プラグインを書くには、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
