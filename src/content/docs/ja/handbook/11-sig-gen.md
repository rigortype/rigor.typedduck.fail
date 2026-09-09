---
title: "`rigor sig-gen`でRBSを生成する"
description: "rigortype/rigor docs/handbook/11-sig-gen.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/11-sig-gen.md"
sourcePath: "docs/handbook/11-sig-gen.md"
sourceSha: "b0e014339714b8c4f43c9911c42da0e9252e261653834193fed47cbf621af0f0"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
sourceDate: "2026-09-09T02:18:33+09:00"
translationStatus: "translated"
sidebar:
  order: 1011
---

`rigor check`がコードに満足しているのに`sig/`がまだほぼ空のとき、解析器は自分以外には届かない有用な推論を行っています。`rigor sig-gen`はその仲間のコマンドで、推論されたシグネチャをRBSとして発行し、ツールチェーンの残り（Steepのクロスチェック、IDEのツールチップ、あなたのgemの`sig/`を読む下流の消費者）がRigorが見ているものを見えるようにします。

この章では、コマンドのUX、分類モデル、3つの出力モード、そして[ADR-5](../../adr/5-robustness-principle/)の非対称な「戻り値には厳格、パラメータには寛容」ルールから直接出てきた`--params`ポリシーのトレードオフを順に見ていきます。

## 使いたくなる場面

- RBSカバレッジがゼロのRubyプロジェクトを引き継ぎ、`rbs prototype rb`の構文的なスケルトンよりも誠実な出発点が欲しい。
- メソッドを追加し、`rigor check`がそれを認識した。今度はシグネチャを手で打ち直すことなく対応するsigファイルを更新したい。
- 既存のRBSは`() -> Numeric`と宣言しているが、Rigorは`() -> Integer`を証明している。レビューの後、より厳密な綴りを`sig/`に適用したい。

そうで**ない**もの: ソースコードに表れていない意図を捉える手書きのRBSの置き換え。公開メソッドが「`to_s`に応答するものなら何でも」という契約（contract）のために`_ToStr`を受け付けるべきでも、現在の呼び出し元がたまたま`String`しか渡していない場合、`sig-gen`は`_ToStr`をあなたのために発明しません。後述の[`--params`ポリシー](#--paramsポリシーとadr-5)セクションとADR-5がその理由を説明します。

## 初回の実行

`lib/calc.rb`が次のように与えられたとします:

```ruby
class Calc
  def add(a, b)
    "sum"
  end

  def greet(name)
    "hi"
  end
end
```

そして空の`sig/`の下で`rigor sig-gen`はRBSスケルトンを表示します:

```
$ rigor sig-gen
# lib/calc.rb
class Calc
  # [new]
  def add: (untyped, untyped) -> String
  # [new]
  def greet: (untyped) -> String
end
```

デフォルトではコマンドは何も書きません。レビューできるよう提案を表示するだけです。`--write`を渡すと提案を`sig/`に適用します。

## 3つの出力モード

| モード | 動作 |
| --- | --- |
| `--print`（デフォルト） | RBSをstdoutに表示。ソースファイル+クラス宣言でグループ化される。 |
| `--diff` | 既存の宣言された綴り（あれば）と推論された綴りを比較する統一スタイルのdiffを表示。読み取り専用。 |
| `--write` | 提案を`sig/<path>.rbs`に適用。ファイルを作成し、既存のクラス宣言に新しいメソッドを挿入し、クラスがまだ宣言されていないファイルには新しいクラスブロックを追加。 |

`--write`はファイルシステムに触れる唯一のモードです。`configuration.signature_paths`（デフォルト`sig/`）の**内側でのみ**動作します;そのツリーの外側にあるものは書き込まれずに`skipped_outside_sig_root`として報告されます。

## 分類モデル

`rigor sig-gen`が考慮するすべてのメソッドは、5つの状態のいずれかに着地します:

| 分類 | 意味 |
| --- | --- |
| `new-file` | レシーバークラスを宣言するRBSファイルが一切ない。 |
| `new-method` | RBSファイルがクラスを宣言しているが、このメソッドは宣言していない。 |
| `tighter-return` | RBSファイルがメソッドを宣言しているが、推論された戻り値が宣言された戻り値の真の部分型（subtype）。 |
| `equivalent` | `sig-gen`が提案するものは何もない: 推論された戻り値が同一、より広い、または無関係であるか、ジェネレータが辞退するナローイング（より広い宣言の下でのリテラル、宣言された`void`の下でのすべて）。サイレントにスキップ。 |
| `skipped` | 以下のいずれかの理由で対象外。 |

`sig.skipped.*`理由は:

- `sig.skipped.complex-shape`: レンダラーが表記できないパラメータ形状のために予約。現在では`def`が宣言できるすべての形状（任意、rest、後続、キーワード、キーワードrest、`...`転送、`&block`）がレンダリングされるため、ジェネレータはこの理由を生成しません;そのようなメソッドすべてに対して以前発火していたゲートが廃止された際（#778）、予約されたまま残されました。
- `sig.skipped.untyped-return`: メソッド本体の最終式が`Dynamic[top]`として型付けされる。`untyped`を絞り込みとして発行することは助けではなくノイズになる。
- `sig.skipped.user-authored`: `--overwrite`が設定されておらず、メソッドの既存のRBS宣言を置き換える必要がある。
- `sig.skipped.unrenderable-rbs`: このメソッドに対してRigorがレンダリングしたシグネチャがRBSとしてパースできない。これは**Rigor自身のバグ**であり、あなたのコードの性質ではない——生成された行はすべて出力される前にパースされ、`rbs`が拒否した行は書き出される代わりに破棄される。パースできない`.rbs`は`rigor check`によって*丸ごと*隔離されるため、1つの不正な行がファイル内の他のすべての型を道連れにしてしまうからだ。他のシグネチャには影響しない;スキップされたメソッドはstderrに報告され、私たちに報告する価値がある。

3つの`sig.generated.*`識別子（`sig.generated.new-file` / `new-method` / `tighter-return`）は`--format=json`の下でJSONフィールドとして発行されるため、CIゲートの消費者がこれらをルーティングできます。すべての`skipped`行も同じペイロードの一部であり、`skip_reason`としてその`sig.skipped.*`識別子を運ぶため、あなたの`sig/`に欠けているメソッドは、出力された行の隣にその理由を持ちます。テキストモードでは代わりに1行のstderrサマリーが理由ごとのスキップされたメソッド数をカウントし、stdoutは貼り付けに適したクリーンさを保ちます。

## ジェネレータが埋められないギャップの記録

`sig-gen --diff`は、自身が型付けできるすべてのメソッドに対して「この宣言は実装が証明するものか？」に答えます。答えられないものこそが興味深い対象です: 適用しないと決定した`tighter-return`、スキップされたメソッド、背後に一切`def`が存在しない宣言。これらはいずれも手書きの型であり、誰も理由を書き留めなかった手書きの型は、それ以来誰も見ていない型と区別がつきません。

Rigorが自身の`sig/`で採用している規約は、メンバーのRBSコメント内の1行です:

```rbs
class Registry
  # sig-gen gap: #1234 — sig-gen types the body `untyped`
  # (the ivar has no inferred field type yet), so this
  # return is hand-written until it can prove one.
  def resolve: (String name) -> Entry
end
```

`void`の戻り値にはマーカーは不要です。`sig-gen`が`void`に対して値を提案することは決してありません: `void`は戻り値が契約の一部ではないことを意味し、いかなる推論もそれを合成しないため、`void`宣言はパラメータ型と同様に著者の意図そのものです（[ADR-14](../adr/14-rbs-sig-generation.md) §「推論vs RBS矛盾ルール」）。

本体がリテラルとして証明する宣言にも不要です。本体が文字列`"bot"`である`def describe: () -> String`に対して、`sig-gen`が`"bot"`を提案することはありません: 宣言された型はその本体に対するあなたの抽象化であり、リテラルに固定してしまうとすべての兄弟クラスが共有する契約を書き換えてしまうことになります。いかなる`.rbs`も宣言していないメソッドは影響を受けません ── リテラルは依然として本体が証明する最も厳密なものであり、それが書き出されます。

`%a{…}`アノテーションではなくコメントにするのには3つの理由があります: `rigor:v1:`ディレクティブ名前空間（[`docs/type-specification/rbs-extended.md`](../../type-specification/rbs-extended/)）の外側に留まること、どのエンジンパスもそれを読み込まないこと、そして`RBS::Parser`がそれをメンバーにバインドするため、チェック処理が行を走査する代わりにAST上でそれを見つけられることです。issue番号は耐荷重となる半分です ── ジェネレータが回答できるようになるエンジンの作業を指し示しており、手書きのRBSへと促すギャップこそがより価値の高いシグナルであるという[ADR-14](../adr/14-rbs-sig-generation.md)のルールに基づいています。

CLIのいかなる機能もこれを強制しません。これは自身のスイート内でゲート化できる規約です: `sig/**/*.rbs`をパースし、ジェネレータを実行し、生成結果と同等でもマークされてもいない宣言に対して失敗させます。Rigor自身のゲートは`spec/rigor/sig_gen/provenance_spec.rb`（[ADR-107](../adr/107-checked-types-and-typeless-comments.md) G3）です。

そのリストの中の1つのケースは、マーカーのケースではまったくありません。背後に`def`を持たない宣言は、単にRubyが生成するメソッド ── `attr_*`、`Data`メンバー、ロード時にクラスマクロが定義するもの ── を記述しているだけかもしれませんし、削除または名前変更された`def`の遺物である可能性もあります。`rigor check`とSteepの双方が実装が`sig/`と一致するかどうかを問い、その逆を決して問わないため、これは何も検知されません。Rigorのゲートは、自身のプロジェクトインデックスとロードされたツリーに問い合わせることでこの2つを分離します（[#839](https://github.com/rigortype/rigor/issues/839)）。このチェックには`sig/`配下のコードが必要であるため、リポジトリゲートのままとなっています: あなたのプロジェクトにおける`sig-gen`は変更されません。

## ジェネレータが対応するメソッド形状

スライスごとに（各スライスはCHANGELOGエントリーを通じて出荷された。このリストは現在の状態です）:

- 任意のパラメータ形状（必須、任意、rest、後続、キーワード、キーワードrest、`...`転送、`&block`）を持つ**素のインスタンス`def foo`**。パラメータリストはすべての位置に`untyped`を置いて実行時形状を反映し（`--params=observed`下では観察されたユニオン）、ブロックは`?{ (*untyped) -> untyped }`としてレンダリングされます。new-methodとtighter-returnの両パスが適用されます。
- **シングルトン側`def self.foo`**と`class << self; def foo; end`。`def self.foo: ...`としてレンダリングされ、既存のRBSに対しては`Reflection.singleton_method_definition`と照合される。
- リテラルSymbol引数を持つ**`attr_reader` / `attr_writer` / `attr_accessor`**。戻り値型は`Scope#class_ivars_for`から累積されたivar型。ジェネレータは長形式の`def name: () -> T`スペルを発行し、ライターのマージパスが変更なしに適用されるようにします;既存の短形式の`attr_reader name: T`宣言はユーザー著作として認識され、重複する`def`挿入を生成しません。

ジェネレータがまだ対応**しない**メソッド形状:

- `define_method(:name) { ... }`。
- 本体が`Dynamic[top]`として型付けされるメソッド（本体推論が有用な戻り値型を証明できない）。

これらはADR-14のフォローアップとして追跡されています。

## `--params`ポリシーとADR-5

`--params=POLICY`フラグは、発行されるRBSでパラメータ位置がどう綴られるかを制御します。3つのポリシーがあります;2つは今日接続されており、1つは予約済みです。

| ポリシー | 動作 |
| --- | --- |
| `untyped`（デフォルト） | すべてのパラメータが`untyped`として綴られる。推論由来のパラメータ契約は将来の呼び出し元に課されない。ユーザーがパラメータ型付けの著作権を完全に保持する。 |
| `observed` | `--observe=PATH...`（存在する場合`spec/`がデフォルト）の下のすべての呼び出しサイトから引数型を収集し、パラメータ位置ごとにユニオン（union、合併型とも）し、RBSに消去し、ユニオンを発行。 |
| `observed-strict` | 予約済み。ロールカタログが出荷されるとケイパビリティ（capability）ロール（`_ToStr`、`_ToS`、…）へさらに広げる。現在は使用エラーで拒否される。 |

デフォルトが意図的に`untyped`を優先するのは、[ADR-5](../../adr/5-robustness-principle/)の節2のためです: メソッドのパラメータ契約は、現在の呼び出し元がたまたま使う**最も具体的な**形ではなく、本体のロジックが正当化する**最も寛容な**形であるべきです。`observed`をロックすると、「既存のスペックがたまたま渡すもの」が契約として静かに凍結されてしまいます。これが章の冒頭で示唆した精度 / 採用のトレードオフです。

`--params=observed`は意図的なオプトインです: あなたは「*私の呼び出し元が今日渡すものの和集合こそが、私の望むパラメータ契約だ*」と言っているのです。これは正しさを保つ拡幅です（既存のすべての呼び出し元は依然として通過する）が、`untyped`に比べて契約を狭めます。

## RSpecを意識した観察

`--observe`を`spec/`ディレクトリに向けると、ジェネレータは3つのRSpec形のバインディングパターンを認識し、それを使って`Dynamic[top]`に縮退するレシーバーを型付けします:

```ruby
RSpec.describe Calc do
  subject { Calc.new }         # :subject → Nominal[Calc]をバインド
  let(:other) { Calc.new }     # :other   → Nominal[Calc]をバインド

  it "..." do
    subject.greet("Alice")     # 観察: Calc#greetがStringを受け取る
    other.greet("Bob")         # 観察: 同上
    described_class.new.add(1, 2)  # 観察: Calc#addがInteger、Integerを受け取る
  end
end
```

認識器は`RSpec.describe Foo`、素の`describe Foo`（`RSpec.`レシーバーなし）、`subject { … }`、`subject(:name) { … }`、`let(:name) { … }`、`let!(:name)`、`described_class.new(...)`を扱います。ネストされたスコープを越えた同名の`let`バインディングは「後勝ち」;認識器はRSpecの完全なスコープルールを再実装しません。典型的な1スペックファイルの形状がターゲットです。

認識器はジェネレータ自身の一部です;その恩恵を受けるために`rigor-rspec`をインストールする必要はありません。すでに`rigor-rspec`を診断のために使っている場合、両者は協調なしに並行して動作します。

## 安全性: `--write`が行うことと行わないこと

- **行う**: `lib/<path>.rb`のレイアウトをミラーする新しい`*.rbs`ファイルを作成（`configuration.paths.first`のベース名を取り除き、`configuration.signature_paths.first`の下に配置）。
- **行う**: クラス宣言の閉じる`end`キーワードのすぐ前に新しいメソッド宣言を挿入。ファイルの他のすべてのバイトをそのまま保持。
- **行う**: ターゲットファイルがまだクラスを宣言していない場合、新しい`class Foo … end`ブロックを追加。
- **行わない**: 設定されたシグネチャツリーの外側のファイルには触れない。
- **行わない**: `--overwrite`が設定されておりAND候補が`tighter-return`でない限り、既存のメソッド宣言を置き換えない。`--overwrite`なしでは、既存の宣言はユーザー著作とみなされ、新しいメソッドはサイレントにスキップされる。
- **行わない**: 既存のRBSにある`attr_reader` / `attr_writer` / `attr_accessor`宣言には触れない。それらは常にユーザー著作として扱われる。

推奨されるワークフローは、まず`--diff`、レビュー、それから`--write`（または絞り込みが意図的だと判断した場合は`--write --overwrite`）です。

### 絞り込みが*おそらく*不完全な推論であるとき

真の部分型チェックはtighter-returnを発行するための*必要*条件です。既存のRBSが間違っていることを示す*十分*なシグナルではありません。スライス1の本体型付けパスは暗黙の戻り値式しか検査しないため、次のようなメソッド:

```ruby
def find(key)
  return nil unless @table.key?(key)
  @table[key]
end
```

は`@table[key]`単独の戻り値として型付けされます。既存のRBSが`(K) -> V | nil`と宣言している場合、推論された`V`は厳密に締まって見えます。しかしそれは間違った理由で締まっています（`nil`分岐は本体型付け器の目には到達不可能ですが、ランタイムの目には到達可能です）。これを適用すると`nil`の腕をサイレントに削除してしまいます。

**ヒューリスティック**: 絞り込みが既存のRBSが宣言するユニオンメンバーを落とすとき（`T | nil → T`、`false | true → true`、`Float | Integer → Float`、`Array[T] → [T]`）、それを精度の勝利ではなく矛盾シグナルとして扱い、既存のRBSはそのまま残します。ジェネレータはこれらを自動的に分類しません;`--diff`レビューステップが人間のゲートが座っている場所です。

`rigor`自身の`sig/`ツリーに対しては、これが荷重を支えるポリシーです: 既存の宣言と矛盾するすべてのtighter-returnは、別途証明されるまで不完全な推論として疑われます。

## まとめ

新しいファイルに対する典型的なイテレーション:

```sh
# 1. Rigorが何を提案するか見る。
rigor sig-gen lib/calc.rb

# 2. spec/をパラメーター型シグナルとして使うため
#    observed-paramsポリシーで実行する。
rigor sig-gen --params=observed lib/calc.rb

# 3. 現在のsig/ツリーと比較する。
rigor sig-gen --params=observed --diff lib/calc.rb

# 4. 適用する。
rigor sig-gen --params=observed --write lib/calc.rb

# 5. rigor checkを再実行して回帰がないことを確認する。
rigor check
```

5つのステップは、コマンドが構築されている5つのADR-14スライスに対応します。期待しなかった結果がいずれかのステップで表示された場合、同じコードに対して解析器が発行するであろう診断が真実のソースです。`sig-gen`は推論の下流の消費者であり、別個の解析ではありません。

## 今日の制限

- ブロックパラメータは常に寛容な`?{ (*untyped) -> untyped }`としてレンダリングされます;型付けされたブロックシグネチャは、エンジンがyield形状を端から端まで追跡するのを待ちます。
- `define_method`と`Data.define`固有の発行は先送りのフォローアップ（`Data.define`由来のリーダーはメソッド本体が存在すれば通過）。
- 真の部分型チェックは今日漸進的（gradual）モードの受理を使用;`Inference::Acceptance`に予約された`:strict`モードはフォローアップで到着。
- `RBS::Writer`を介したラウンドトリップは使用されない（上流の設計でコメントを落とす）;ジェネレータのバイト範囲挿入は触れない宣言をそのまま保持しますが、触れた宣言の範囲*内に*散りばめられたコメントは保持できません。

これらはADR-14の先送り項目です;設計の根拠は[`docs/adr/14-rbs-sig-generation.md`](../../adr/14-rbs-sig-generation/)にあります。
