---
title: "rigor-activesupport-core-ext"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-activesupport-core-ext.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activesupport-core-ext.md"
sourcePath: "docs/manual/plugins/rigor-activesupport-core-ext.md"
sourceSha: "c983ba0b4ef5de63918d9b9d7493a8b38c006dfc08138a4f7dcc5de65a389e57"
sourceCommit: "6e5bd55274e20dfb59183559c4971d34f878c907"
translationStatus: "translated"
sidebar:
  order: 9050
---

実際のRailsコードで最もよく使われるActiveSupportの`core_ext`拡張 ── `Time.current`、`3.days`、`Array.wrap`、`"x".squish`、`obj.blank?`など ── 向けの、オプトインの**RBSバンドル**です。解析器もdiagnosticも提供しません。その唯一の仕事は、これらのメソッドのシグネチャをRigorに渡し、`call.undefined-method`の偽陽性として現れなくすることです。4プロジェクトのRails調査では、**各プロジェクトのdiagnosticの64〜90%**が、stdlib RBSに欠けているActiveSupport拡張に由来していました ── このことが、本バンドルをRailsアプリにおける最大の偽陽性抑制器とし、Rigorがundefined-methodのノイズでRailsコードベースを埋め尽くしたときに真っ先に手を伸ばすべきものにしています。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-activesupport-core-ext
```

これでセットアップは完了です ── Rigorはバンドルされた`sig/`を自動的に解決します（[ADR-25](../../../adr/25-plugin-contributed-rbs/)）。パス指定もvendoringも`signature_paths:`の配線も不要です。

## カバー範囲

おおよそ上位40程度のセレクタとその近隣のものを、以下にわたってカバーします。

- **Object（全クラス共通）** ── `#blank?`、`#present?`、`#presence`、`#try`、`#try!`、`#acts_like?`（および`NilClass` / `TrueClass` / `FalseClass`）。
- **Integer / Float** ── Duration乗数（`#days`、`#hours`、`#minutes`、…）とBytes乗数（`#megabytes`、`#gigabytes`、…）。
- **String** ── 語形変化（`#underscore`、`#camelize`、`#classify`、`#constantize`、`#pluralize`、…）、フィルタ（`#squish`、`#truncate`）、`#html_safe`、`#starts_with?` / `#ends_with?`、変換。
- **Time / Date / DateTime** ── `.current`、`.zone`、`#yesterday`、`#tomorrow`、`#beginning_of_*` / `#end_of_*`、`#ago`、`#since`。
- **Array** ── `.wrap`、`#to_sentence`、`#in_groups_of`、`#second` … `#fifth`、`#compact_blank`、`#exclude?`。
- **Hash** ── `#symbolize_keys` / `#stringify_keys`（およびdeep / bang版）、`#deep_merge`、`#with_indifferent_access`、`#except!`。
- **Enumerable** ── `#index_by`、`#index_with`、`#pluck`、`#exclude?`。

```ruby
3.days           # バンドルなしの場合: call.undefined-method Integer#days
"  x  ".squish   # バンドルなしの場合: call.undefined-method String#squish
Time.current     # バンドルなしの場合: call.undefined-method Time.current
```

## diagnosticなし、設定なし

このプラグインはRBS専用です ── diagnosticを一切出さず、設定ノブもありません。`plugins:`の下に列挙されると、無条件にそのシグネチャを提供します。

## 制限事項

- **保守的な戻り値型**。 `Integer#days`は実際には`ActiveSupport::Duration`を返しますが、解析環境には通常Durationクラスが存在しないため、バンドルでは`untyped`として型付けしています ── 目的はundefined-methodを黙らせることであり、精密な戻り値を与えることではありません。同様に`#html_safe`は（`SafeBuffer`ではなく）`String`として型付けされ、`#try` / `#try!`は`untyped`を返します。
- **プロジェクト固有のモンキーパッチはカバーされません** ── 本物のActiveSupport拡張のみが対象です。自前のコアクラスパッチについては`pre_eval:`メカニズム（[ADR-17](../../../adr/17-monkey-patch-pre-evaluation/)）を参照してください。
- **上位40程度のセレクタであり、網羅的ではありません**。 ActiveSupportは数百もの拡張を提供しています。本バンドルは実世界の分布の先頭部分をカバーします。

## プラグインの内部

RBSのレイアウト、クラスごとのカバレッジ、セレクタを選定した調査については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activesupport-core-ext/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
