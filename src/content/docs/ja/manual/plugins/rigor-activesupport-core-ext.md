---
title: "rigor-activesupport-core-ext"
description: "rigortype/rigor docs/manual/plugins/rigor-activesupport-core-ext.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activesupport-core-ext.md"
sourcePath: "docs/manual/plugins/rigor-activesupport-core-ext.md"
sourceSha: "d0d4be991c54b7dc281722e4380c5cf1d1e139f9ba6d0a6f043ed9730b713e18"
sourceCommit: "8e1432f5ada5240b33f140cb2024e6025450b2f9"
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

> **このプラグインは必要ないかもしれません**。[ADR-72](../../../adr/72-gemfile-lock-gated-rbs-overlays/)以降、Rigorは`activesupport`が`Gemfile.lock`にあるのにRBSを同梱していない場合に、バンドルされたcore_extのRBSオーバーレイを自動ロードします。そのため、最も一般的なActiveSupportの偽陽性は設定ゼロですでに抑制されています。本プラグインは、そのオーバーレイの**オプトインの、より充実した双子**です（かつシグネチャのオーサリングの拠点でもあります）。完全なサーフェスが欲しいときに読み込んでください。読み込まれているとき、自動オーバーレイは身を引き、両者が二重宣言することはありません。

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

## Durationは型付けされる

`1.day`・`5.minutes`・`2.5.hours`とその他すべての乗数は`ActiveSupport::Duration`と型付けされ、その周りの算術も意味を保ちます:

```ruby
1.day                     # ActiveSupport::Duration
Time.current - 30.minutes # Time
2 * 1.day                 # ActiveSupport::Duration
1.day + 1.hour            # ActiveSupport::Duration
Date.today - 1.week       # Date | Time
```

`Date ± duration`がユニオンなのは、Railsがそうするからです: 日付単位のdurationは`Date`を返し、1日未満のものは`Time`を返します。

Rigorは意図的に`ActiveSupport::Duration`の**シグネチャを出荷しません**。そうすることでDurationのサーフェス全体が寛容なままになり——`1.day.ago`・`5.minutes.from_now`・`3.hours.in_minutes`、その他Durationが`method_missing`を通じて転送するものはすべて診断なしで解決されます——一方でそのサイトは`rigor coverage --protection`にとって具体的なレシーバーとして数えられます。部分的なシグネチャは、ないよりも悪くなります: 省いたメンバーはすべて偽の`call.undefined-method`になってしまうからです。

乗数が発火するのは、Rigorが数値であると証明したレシーバーに対してだけなので、`created_at.day`・`Date.today.year`・あなた自身のオブジェクトの`#days`は、これまでどおりの答えを保ちます。

## diagnosticなし、設定なし

このプラグインはdiagnosticを一切出さず、設定ノブもありません。`plugins:`の下に列挙されると、そのシグネチャを——そして上記のDurationの型付けを——無条件にそのシグネチャを提供します。

## 制限事項

- **保守的な戻り値型**。`#html_safe`は（`SafeBuffer`ではなく）`String`として型付けされ、`#try` / `#try!`は`untyped`を返します ── それらについての目的はundefined-methodを黙らせることであり、精密な戻り値を与えることではありません。（Durationの乗数は例外です: バンドルでは`untyped`と宣言され、その後プラグインによって型付けされます。バンドルが宣言してはならないクラスを名指す唯一の方法がこれだからです。）
- **`duration / x`は型付けされない**。`1.day / 2`はDurationですが`1.day / 1.hour`は素の`24`です;答えがオペランドに依存するので、Rigorは推測せずに辞退します。
- **`duration + Time`も型付けされない**。`30.minutes + Time.now`は実行時にraiseします——`Duration#+`はTimeを強制変換できず、`-`・`*`、そして右辺の`Date`や`DateTime`も同じように失敗します——ので、Rigorはそれについて何も主張しません。値を持つ形は`Time.now + 30.minutes`のほうであり、それは`Time`と型付けされます。
- **プロジェクト固有のモンキーパッチはカバーされません** ── 本物のActiveSupport拡張のみが対象です。自前のコアクラスパッチについては`pre_eval:`メカニズム（[ADR-17](../../../adr/17-monkey-patch-pre-evaluation/)）を参照してください。
- **上位40程度のセレクタであり、網羅的ではありません**。ActiveSupportは数百もの拡張を提供しています。本バンドルは実世界の分布の先頭部分をカバーします。

## プラグインの内部

RBSのレイアウト、クラスごとのカバレッジ、セレクタを選定した調査については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activesupport-core-ext/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
