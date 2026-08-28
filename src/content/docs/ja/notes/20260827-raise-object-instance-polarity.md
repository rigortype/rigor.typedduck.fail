---
title: "`call.raise-non-exception` — `Object`型のインスタンスが沈黙する理由（#420）"
description: "rigortype/rigor docs/notes/20260827-raise-object-instance-polarity.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260827-raise-object-instance-polarity.md"
sourcePath: "docs/notes/20260827-raise-object-instance-polarity.md"
sourceSha: "64fc70ee49b647f2f57f67c2b2915129fa52471d799dc1cda61ff3ab43bad691"
sourceCommit: "18d6992f544e6222fd7ed015ba6bbee6f0bd7f14"
translationStatus: "translated"
sidebar:
  order: 20266827
---

ステータス: 裁定であり、振る舞いの変更はない。masterの`35ac976b`で実施。

[#420](https://github.com/rigortype/rigor/issues/420)は、このルールのシングルトン／インスタンスの非対称性が本物の境界なのか、それとも痕跡的な除外なのかを問うた:

```ruby
raise Object       # => call.raise-non-exception
raise Object.new   # => silent
```

どちらも実行時に`TypeError`を送出するので、沈黙は見落とされた診断のように見える。そうではない。答えとその証拠は以下のとおり;`spec/rigor/analysis/check_rules/raise_non_exception_spec.rb`のピンは今や短い形でこれを運んでおり、次の差分実行がこれを再度起票するのではなく見つけられるようにしてある。

## ルールは式を見ておらず、キャリアを見ている

`raise Object.new`は本当に`TypeError`である。しかし`raise_instance_operand_verdict`に手渡されるのは構文ノードではなく型であり、その型は**厳密ではない**値と共有されている:

| 式 | キャリア |
| --- | --- |
| `Object.new` | `Object` |
| `# @rbs () -> Object`と宣言されたメソッド | `Object` |
| `[Object.new, ArgumentError.new].first` | `Object` |

`type-of`ではなく、本物の`rigor check`の実行の下で`dump_type`によって計測した（`type-of`は別の環境を解決する——`feedback_rigor_probe_pitfalls`を参照）。

すべてのRubyオブジェクトは`Object`なので、`Object`を運ぶ値は実行時に`Exception`でありうる。このキャリアの読み方のうち、`Object.new`が発火して宣言された`Object`が沈黙するようなものは存在しない。両者は同じキャリアだからだ。

## 収束が実際に行っていること

沈黙を生んでいるのは2つの独立したガードであり、それぞれが単独で十分である——片方を取り除いても何も変わらない。どちらかが痕跡的だと結論する前に、これは知っておく価値がある:

1. `RAISE_UNEXACT_INSTANCE_CLASSES`が`Object` / `BasicObject`を列挙し、順序付けより前に脱出する;そして
2. `:superclass`の順序付けが`:unknown`へ落ちる。

**両方**を取り除くと、ルールは次のコードで発火する。これは`ArgumentError`を送出する正しいコードである:

```ruby
class Factory
  # @rbs () -> Object
  def build = ArgumentError.new("boom")
end

def go = raise Factory.new.build   # fires under convergence; silent today
```

AGENTS.mdは偽陽性のコストを最悪ケースの静的な読みより上に置いており、それがこれを決着させる。

## コーパスはこれを決められず、そう述べている

広げる変更が通常必要とする偽陽性のゲートは、それでも走らせた。redmine・mastodon・mail・kramdownに対して、コールドで、完全に収束させたルールで:

| プロジェクト | ベースラインの発火数 | 収束後 | 新規 |
| --- | --- | --- | --- |
| redmine | 0 | 0 | 0 |
| mastodon | 2 | 2 | 0 |
| mail | 0 | 0 | 0 |
| kramdown | 0 | 0 | 0 |

**新規の発火が0件であることは、ここではクリアランスではなく不在である**。このルールはそもそもこのコーパスでほとんど発火せず、4つのプロジェクトのどれも`raise <Object型の値>`のサイトを含んでいない——だからこの実行は「収束は安全である」と「コーパスにこの形の実例がない」とを区別できない。決め手となる証拠はキャリアの計測と上で構成したケースであり、どちらも不在ではなく機構である。

## そのままにするもの

シングルトンのパスは同じ問いではなく、変更されていない: `raise Object`はちょうど1つの厳密なクラスオブジェクトを名指し、`Object.exception`は存在せず、定数と値の間に割り込める部分型はない。`raise Class`と`raise Comparable`は同じ理由で発火する。

## これが払った2つのフィクスチャの罠

どちらも対照が捕まえるまで自信満々の誤答を生み、どちらも同じファミリーである:

- 最初の偽陽性のフィクスチャは型なしのパラメータ（`def go(f) = raise f.build`）を使っていたので、オペランドは`Dynamic`と型付けされ、この例はルールが何をしようと通ってしまうものだった。
- `[Object.new, ArgumentError.new].first`は`Object`と型付けされるが、実行時にそれは本当に`Object`**である**ので、それをraiseするのは本物の`TypeError`だ——これはキャリアの潰れを例示するものであって偽陽性ではなく、偽陽性としてピン留めしていたら間違いだった。

どちらもスペックファイルには到達しなかった。ユニットのハーネスはrbs-inlineで宣言された戻り値を表現することもできない——そこではフィクスチャが`Dynamic`と型付けされる——だからこそ上の実証はCLIを通したプロジェクトのフィクスチャの実行であり、スペックは再演ではなく理由付けを運んでいる。
