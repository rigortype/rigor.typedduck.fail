---
title: "rigor-statesman"
description: "rigortype/rigor docs/manual/plugins/rigor-statesman.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-statesman.md"
sourcePath: "docs/manual/plugins/rigor-statesman.md"
sourceSha: "e102933ff7b11c41f3677ca2675d90f60506b630a09fcb66a4d3cb85afb86362"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

`transition_to(:state)`呼び出しを、同一ファイル内の`state_machine do … end`ブロックで宣言された状態に照らして検証します。宣言されていない状態への遷移はフラグが立てられます（誤り候補の提示付き）。ソースのみを読み取り、Statesmanのランタイム依存はありません。（DSLのメソッド名は設定可能なので、AASM形式の状態機械にも適合します。）

`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-statesman
```

## 何をチェックするか

```ruby
class Order
  state_machine do
    state :draft, initial: true
    state :submitted
    state :approved
  end
end

order.transition_to(:submitted)   # info:  既知の状態
order.transition_to(:approval)    # error: 未知の状態 :approval（:approved の誤りでは？）
order.transition_to(:purgatory)   # error: 未知の状態 :purgatory
```

| ルール | 重大度 | 発火するとき |
| --- | --- | --- |
| `plugin.statesman.known-state` | info | `transition_to(:sym)`で、`:sym`がファイル内の`state_machine`ブロックで宣言されている |
| `plugin.statesman.unknown-state` | error | `transition_to(:sym)`で、`:sym`が宣言されていない（`Base.suggest`による誤り候補の提示付き） |

1つのファイル内に複数の`state_machine`ブロックがある場合、それらの状態は和集合になります。リテラルのシンボルでない引数や、状態機械を持たないファイルは、暗黙のうちに素通りされます。

## 設定

```yaml
plugins:
  - gem: rigor-statesman
    config:
      dsl_method: "state_machine"     # デフォルト。ブロックを開くメソッド
      state_method: "state"           # デフォルト。状態を宣言するメソッド
      transition_method: "transition_to"  # デフォルト。検証する呼び出し
```

これらをリネームすると、プラグインを別の状態機械DSL（例: AASMの`aasm do … state … end`）に適合させられます。

## 制限事項

- **ファイルスコープ**。`models/order.rb`で宣言された状態は別のファイルからは見えません ── 各ファイルが独立して検証します。
- **リテラルのシンボルのみ**。変数やメソッド呼び出しの引数はチェックされません。
- **レシーバーに依存しない**。チェックは、ファイル内の*いずれか*の状態機械がそのシンボルを宣言している限り、任意のレシーバーに対して発火します。`transition_to`を特定の機械に結びつけることはしません。

## プラグインの内部

`rigor-statesman`は、2パス（収集してから検証する）パターンのリファレンス例です。`node_file_context`パスが宣言済みの状態を一度収集し、`node_rule`がエンジン所有のウォーク上で各`transition_to`を検証します。レイアウト、デモ、契約（contract）サーフェスは[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-statesman/README.md)にあります。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
