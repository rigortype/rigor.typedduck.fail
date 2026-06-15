---
title: "rigor-rails-i18n"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-rails-i18n.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rails-i18n.md"
sourcePath: "docs/manual/plugins/rigor-rails-i18n.md"
sourceSha: "cdc008b796188509f3adb0aba494888d702b756a225175c47b8f4200ad2f26ac"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`t('key.path')` / `I18n.t(...)` / `I18n.translate(...)`の呼び出しを`config/locales/*.yml`に照らして検証します。検証対象は、存在しないキー（did-you-mean候補つき）、ロケールごとのカバレッジ漏れ、補間変数の不一致です。Railsランタイムへの依存はなく、ロケールファイルはPrismと`YAML.safe_load`のみを通して読み込まれます。

このプラグインは`rigortype`にバンドルされて提供されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-rails-i18n
```

## チェック内容

ロケールカタログに照らして、静的に解決可能なすべての呼び出し箇所が検証されます。

```text
demo.rb:14:1: info:    `t('users.welcome')` resolves in en, ja
errors_demo.rb:12:1: error:   missing translation key `users.welcom` in any locale (did you mean `users.welcome`?)
errors_demo.rb:16:1: error:   `t('users.welcome')` expects interpolation `name`, got (none)
errors_demo.rb:20:1: warning: `t('users.welcome')` does not use interpolation `extra` (known placeholders: `name`)
errors_demo.rb:25:1: warning: `t('errors.messages.blank')` is missing from locale(s) ja
```

1. **キーの存在** — どのロケールにも存在しないキーは`DidYouMean`の近似候補つきで指摘されます。
2. **ロケールごとのカバレッジ** — 一部の`configured_locales`には存在するが他には存在しないキーは`missing-locale`警告を出します（呼び出しが`default:`を渡している場合は抑制されます）。
3. **補間変数** — リーフ文字列の`%{var}`プレースホルダーは、呼び出しのキーワード引数と一致しなければなりません。必須のプレースホルダーが欠けている場合はエラー、余分なものは警告です。予約されたI18nオプションキー（`default:` / `scope:` / `locale:` / `count:` / `raise:` / …）は除外されます。

### 認識される呼び出し形

リテラルの第1引数を伴う`t(...)`（暗黙のself）、`I18n.t(...)`、`I18n.translate(...)`です。**遅延キー**（コントローラー内の`t('.title')`）は、ファイルパスと最も内側を囲む`def`から`<controller_scope>.<action>.<key>`に展開され、Railsの慣習に従います。コントローラー以外のファイル内の遅延キーはスキップされます（スコープを静的に決定できないため）。リテラルでないキーを伴う呼び出し（`t(some_variable)`）はチェックされずに通過します。

Railsと`rails-i18n`gem自身が提供するプレフィックス（`date.` / `time.` / `datetime.` / `number.` / `errors.messages.` / `errors.format` / `support.array.` / `helpers.{select,submit,label}.` / `i18n.transliterate.` / `activerecord.errors.{messages,models}.`）配下のキーは、フレームワークが提供するため不明キーとして指摘されません。

## 設定

```yaml
plugins:
  - gem: rigor-rails-i18n
    config:
      locale_search_paths: ["config/locales"]   # default
      configured_locales: ["en"]                # default
```

`configured_locales`はプロジェクトが提供するロケールの集合です。これを`["en", "ja"]`に設定すると、キーが一方では解決できるがもう一方では解決できない場合に`missing-locale`警告が有効になります。

## 制限事項

- **リテラル文字列キーのみ** — 変数キーは通過します。
- **コントローラー外の遅延キーはスキップされる** — `t('.x')`が依存するコントローラー／アクションのスコープは、モデル／ヘルパー／メーラーでは導出できません。
- **複数形は認識されるが検証されない** — `count:`は予約オプションとして扱われます。ロケールが`:zero` / `:one` / `:other`を定義しているかどうかはチェックされません。
- **ロケールごとの補間の違いは1つのプレースホルダー集合にマージされる**（`en`が`%{name}`を使い`ja`が`%{user_name}`を使う場合、両方とも必須として扱われます）。
- **`safe_load`のみ** — YAMLのエイリアス／マージは受け入れられますが、YAML内のカスタムRubyクラスは受け入れられません。

## プラグイン内部

ロケールローダー／インデックス、キャッシュされた`:locale_index`プロデューサー、デモ、そしてこのプラグインが利用する契約（contract）のサーフェス（surface）については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-rails-i18n/README.md)を参照してください。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
