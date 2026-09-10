---
title: "rigor-activesupport-core-ext"
description: "rigortype/rigor docs/manual/plugins/rigor-activesupport-core-ext.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-activesupport-core-ext.md"
sourcePath: "docs/manual/plugins/rigor-activesupport-core-ext.md"
sourceSha: "0f3a82401b2d1604ef2d5653f528720723e2e93bdcff3c11a991f72c5569c58e"
sourceCommit: "db7b23d42e9b47560438b67dfe16d53e03f70575"
sourceDate: "2026-09-03T05:18:44+09:00"
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
- **Time / Date / DateTime** ── `.current`、`.zone`、`#yesterday`、`#tomorrow`、`#beginning_of_*` / `#end_of_*`、`#ago`、`#since`。`Time`はさらにRailsインスタンスサーフェス**全体**を担います（後述）；`Date`と`DateTime`は従来と同じサブセットを担います。
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

Rigorは`ActiveSupport::Duration`の**部分的な（partial）**シグネチャを出荷します: リーダーサーフェス——`#to_i` / `#in_seconds`、`#to_f`、`#in_minutes` / `#in_hours` / `#in_days` / `#in_weeks` / `#in_months` / `#in_years`、`#iso8601`、`#parts`——が型付けされているため、`3.hours.in_minutes`は`Float`になり、`1.day.to_i * 2`は`Integer`になります。`#ago` / `#until` / `#before` / `#since` / `#from_now` / `#after`はそのサーフェスの一部では**ありません**——それらは`Time.current`にデフォルト設定され、それらの型付けはRailsの`Time`インスタンス拡張がまず宣言されることがブロッカーになっていましたが、以下のセクションでそれが行われます;乗数自体は個別に追跡されます。それ以外のすべてのメンバー——上記の算術演算子、`==`、その他Durationが`method_missing`を通じて転送するすべてのもの——も診断なしで解決され、一方でそのサイトは`rigor coverage --protection`にとって具体的なレシーバーとして数えられます。そもそも`ActiveSupport::Duration`を名指すことは通常なら誤った判断になります——実際のサーフェスが`method_missing`に転送するクラスに対する部分的なシグネチャは、省略されたすべてのメンバーを偽の`call.undefined-method`に変えてしまうからです——そのため、プラグインはそれを`open_receivers:`の下に列挙します。これは`rigor-activerecord`が`ActiveRecord::Relation`に与えているのと同じ免除です。

乗数が発火するのは、Rigorが数値であると証明したレシーバーに対してだけなので、`created_at.day`・`Date.today.year`・あなた自身のオブジェクトの`#days`は、これまでどおりの答えを保ちます。

## Railsの`Time`インスタンスサーフェスはサンプリングではなく宣言される

`Time`はRubyのコアクラスであるため、RBSはそれを完全に知っており、**閉じられて（closed）**います: シグネチャが宣言していない名前は`call.undefined-method`と報告されます。これにより、`Time`での省略は誤った戻り値型とまったく同様に偽陽性となり、漸進的な中間（gradual middle）は存在しないため、本バンドルは「上位セレクタ」のサンプルではなく、gem自身のソースに対する監査によってActiveSupportが追加するサーフェスを宣言します。

```ruby
Time.current.to_fs(:db)             # String
Time.current.formatted_offset       # String
Time.current.past?                  # bool
Time.current.at_beginning_of_hour   # Time
Time.current.days_ago(3).all_week   # Range[Time]
Time.current.in_time_zone("Hawaii") # untyped (ActiveSupport::TimeWithZone)
Time.current.definitely_not_here    # 依然として call.undefined-method
```

これには述語（`#past?`、`#future?`、`#today?`、`#on_weekend?`、…）、`#days_ago` / `#months_since` / `#next_occurring`ファミリー全体、四半期および`at_`接頭辞の表記、`#all_week` / `#all_month` / `#all_quarter` / `#all_year`の範囲、`#to_fs` / `#to_formatted_s` / `#formatted_offset` / `#rfc3339`、`#in_time_zone`、そして`Time.`シングルトンである`.days_in_month`、`.days_in_year`、`.rfc3339`、`.use_zone`、`.find_zone` / `.find_zone!`、`.zone_default`が含まれます。

正直に名指しできない戻り値は、当て推量するのではなく拡大されます: `#in_time_zone`はタイムゾーン下では`ActiveSupport::TimeWithZone`を返し、設定されていない場合はレシーバー自身のクラスを返すため、2つのうちいずれかを選ぶのではなく`untyped`と読まれます。

`ActiveSupport::TimeWithZone`自体は`Time`のサブクラスとしてモデル化されて**います** —— これは`Time.current`や`1.hour.ago`ファミリー全体が返すものです:

```ruby
Time.current.time_zone       # タイムゾーン（untyped）
Time.current.comparable_time # Time
Time.current.to_fs(:db)      # String — 継承されたTime自身のサーフェス
1.hour.ago.time_zone         # Durationファミリーからの同じクラス
Time.now.time_zone           # 依然としてcall.undefined-method — 素の
                             # Timeには本当に存在しない
```

Railsは`TimeWithZone#is_a?`をオーバーライドして`::Time`に対してtrueを返し、自身が定義していないすべてのものをラップされた`Time`へ転送するため、このサブクラスは`Time`の戻り値が述べていたことを述べた上で、TWZ自身が持つ4つのリーダーを追加します。代わりに`Time | TimeWithZone`ユニオンも計測されましたが却下されました: 何も発火しないものの、下流のチェーン全体を`Dynamic[top]`として型付けしてしまうためです。

実際の`require "active_support/all"`と比較して除外されているのは12の名前です: インスタンス10個とシングルトン2個で、いずれもActiveSupport自身の`+` / `-` / `<=>` / `eql?` / `Time.at`オーバーライドの`alias_method`アーティファクトです——`plus_with{,out}_duration`、`minus_with{,out}_duration`、`minus_with{,out}_coercion`、`compare_with{,out}_coercion`、`eql_with{,out}_coercion`、および`Time.at_with{,out}_coercion`のペアです。これらは実行時にpublicであり、ソース上では`:nodoc:`であり、ActiveSupportの外部のコードがそれらを呼び出すことはありません;呼び出すコードに対しては報告されます。

`Date`および`DateTime`は同じActiveSupportモジュールによって拡張されていますが、これらはまだこれを担って**いません**——`Date.current.past?`は依然として報告されます。

## `ActiveSupport::Concern`の解決

`extend ActiveSupport::Concern`はRailsアプリのすべてのconcernの1行目であり、この定数はかつて何にも解決しませんでした。このバンドルはモジュールを名指しするようになり、`extend`がextend元に配置する3つのメンバー —— `included`、`prepended`、`class_methods` —— も併せて名指しするため、新たに名指しされたモジュールに対する指摘になることなく`included do … end`が解決され続けます。`Concern`が応答するその他のすべては寛容なまま保たれます。

## diagnosticなし、設定なし

このプラグインはdiagnosticを一切出さず、設定ノブもありません。`plugins:`の下に列挙されると、そのシグネチャを——そして上記のDurationの型付けを——無条件にそのシグネチャを提供します。

## 制限事項

- **保守的な戻り値型**。`#html_safe`は（`SafeBuffer`ではなく）`String`として型付けされ、`#try` / `#try!`は`untyped`を返します ── それらについての目的はundefined-methodを黙らせることであり、精密な戻り値を与えることではありません。（Durationの乗数は1つの例外です: バンドルでは`untyped`と宣言され、代わりにプラグインによって型付けされます——バンドルが`ActiveSupport::Duration`を名指すことができないからではなく（上述のとおり名指しています）、乗数の戻り値自体を一致させるようにRBSへ移動させることがまだ行われていないためです。`ActiveSupport::Duration`自身のリーダーサーフェスはもう1つの例外であり、上述のとおりです。）
- **`duration / x`は型付けされない**。`1.day / 2`はDurationですが`1.day / 1.hour`は素の`24`です;答えがオペランドに依存するので、Rigorは推測せずに辞退します。
- **`duration + Time`も型付けされない**。`30.minutes + Time.now`は実行時にraiseします——`Duration#+`はTimeを強制変換できず、`-`・`*`、そして右辺の`Date`や`DateTime`も同じように失敗します——ので、Rigorはそれについて何も主張しません。値を持つ形は`Time.now + 30.minutes`のほうであり、それは`Time`と型付けされます。
- **プロジェクト固有のモンキーパッチはカバーされません** ── 本物のActiveSupport拡張のみが対象です。自前のコアクラスパッチについては`pre_eval:`メカニズム（[ADR-17](../../../adr/17-monkey-patch-pre-evaluation/)）を参照してください。
- **上位40程度のセレクタであり、網羅的ではありません** ── `Time`を除きます。`Time`では上記の閉じられたコアクラスの議論によりサンプルが不健全となるため、監査はそこで挙げられた12個の`:nodoc:`エイリアスチェーンアーティファクトを除いて網羅的です。それ以外の場所ではActiveSupportは数百もの拡張を提供しており、本バンドルは実世界の分布の先頭部分をカバーします。

## プラグインの内部

RBSのレイアウト、クラスごとのカバレッジ、セレクタを選定した調査については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-activesupport-core-ext/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
