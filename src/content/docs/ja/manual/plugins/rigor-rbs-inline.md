---
title: "rigor-rbs-inline"
description: "rigortype/rigor docs/manual/plugins/rigor-rbs-inline.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rbs-inline.md"
sourcePath: "docs/manual/plugins/rigor-rbs-inline.md"
sourceSha: "1b601d075e8885a7d33dbed180dcef8de8f374aea007dd28b0034d0570b4e1d0"
sourceCommit: "42d6e031257466de187cc9640b4896300473f9bb"
sourceDate: "2026-09-26T09:33:47+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

Rubyソース内の[rbs-inline](https://github.com/soutaro/rbs-inline)形式のコメント（`# @rbs name: T`、`#: () -> T`、`# @rbs return: T`、属性の`#:`キャスト、`# @rbs!`生RBS、…）を取り込み、合成されたRBSを解析環境に供給します ── これにより、本来Rigorが無視するはずの`# @rbs`アノテーションが、手書きの`.rbs`ファイルと同じ`argument-type-mismatch`のdiagnosticを発火する強制された契約（contract）になります。設計は[ADR-32](../../../adr/32-rbs-inline-comment-ingestion/)に記録されています。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-rbs-inline
```

> **完全なガイド**。実践的な解説 ── サポートされるすべてのアノテーション形式、マジックコメントによるオプトイン、トップレベル`def`に関する注意、パース失敗の扱い ── は[ハンドブック第7章: RBSとExtended](../../../handbook/07-rbs-and-extended/)の§「Inline RBS in Ruby source」にあります。このページは運用上のクイックリファレンスです。

## 何をするか

ファイルごとに、upstreamのマジックコメントでオプトインします。

```ruby
# rbs_inline: enabled

class AscDesc
  # @rbs asc_or_desc: :asc | :desc
  def ascdesc(asc_or_desc) = asc_or_desc
end

AscDesc.new.ascdesc(:bad)   # エラー: 引数の型の不一致（:asc | :desc を期待したが :bad だった）
```

`# rbs_inline: enabled`を持たないファイルは手を付けられません（ファイル先頭のスキャンのみ）。合成されたRBSはファイルごとにキャッシュされ（コンテンツSHA＋プラグインのid/version＋設定をキーとする）、変更がない場合は2回目の実行でパースをスキップします。

| ルール | 重大度 | 発火条件 |
| --- | --- | --- |
| `plugin.rbs-inline.source-rbs-synthesis-failed` | info | rbs-inlineがファイルをパースできなかった。解析はインラインRBSの寄与なしにフォールバックし、diagnosticはupstreamのエラーを伴う |
| `plugin.rbs-inline.source-rbs-annotation-not-honoured` | info | アノテーションのパースは成功したが何も寄与しなかった ── そのファイルの他のアノテーションは引き続き適用される。6つの原因がある: `sig/`も宣言しているメンバーでRigorがどちらがより精密か判断できない場合（[優先順位](#優先順位)を参照）、`# @rbs module-self: Foo`の綴り（下記参照）、型がパースできない`#:`行（[パースできない`#:`の型](#パースできないの型)を参照）、メソッド型がパースできない同一行の`# @rbs %a{…}`（[同一行アノテーション](#同一行アノテーション)を参照）、パースできない`# @rbs name: T`パラメータ型（[パースできない`# @rbs name:`の型](#パースできない-rbs-nameの型)を参照）、およびgemが認識しない`@rbs`接頭辞のタグ（[`@rbs`後の認識されないタグ](#rbs後の認識されないタグ)を参照） |
| `rbs.contradicting-signature` | error | インライン宣言が同じメソッドの`sig/`宣言と矛盾しているか、インラインの`%a{rigor:v1:…}`リファインメントが自身の宣言された型の外にある（[優先順位](#優先順位)を参照）。プラグイン自身のものではなくコアのルールであるため、`plugin.rbs-inline.`接頭辞は付かない |

## 優先順位

メソッドが`sig/`とインラインアノテーションの**両方**で宣言されている場合、Rigorは位置ごと（各パラメータ、戻り値型、ブロックのパラメータと戻り値）に**両者を比較し**、正確にそのうち一方がバインドします。どちらの場合でもファイル内の他のすべてのアノテーションは引き続きバインドされ、クラスはそのメソッドサーフェスを保持します。

```ruby
# lib/demo.rb                          # sig/demo.rbs
class Demo                             # class Demo
  # @rbs dir: :asc | :desc             #   def order: (Symbol dir) -> void
  def order(dir) = nil                 #   def shared: (String) -> Integer
                                       # end
  # @rbs (Integer) -> String
  def shared(v) = v.to_s
end
```

- **一方が他方をリファインする場合: より精密な方が黙ってバインドする**。
  `:asc | :desc`は`Symbol`の部分型（subtype）であるため、`Demo#order`はインラインの契約を取り、`.rbs`単独なら通していた`order(:up)`は引数の型エラーになります。マージはパラメータを含めすべての位置で狭い方の型を意図的に取ります: どちらの宣言もあなたのものであり、狭い方があなたが述べた内容だからです。`sig/`の`String`の横にインラインの`non-empty-string`がある場合、`non-empty-string`として読まれます。`untyped`、`void`、`top`は何とでも一貫しており最も主張が少ないため、`sig/`の`-> untyped`の横にあるインラインの`-> void`は沈黙します。同一の宣言 ── `rigor sig-gen`がアノテーション付きメソッドに対して書き出すもの ── も同様に沈黙します。インライン側がバインドするのは、`.rbs`メンバーがそれによって何も失わない場合のみです: 同じ可視性を持ち、それが運ぶすべてのアノテーション（述語、アサーション、エフェクトエンベロープ）がインライン側にもある必要があります。
- **両者が矛盾する場合: エラーとなり、`.rbs`がバインドする**。
  もし`Demo#shared`が`sig/`で`::String`を取りインラインで`::Integer`を取るなら、両方であるような値は存在しないため、実行はアノテーション付きファイル名を名指して`sig/`の行で[`rbs.contradicting-signature`](../../04-diagnostics/#rule-rbs-contradicting-signature)を報告します。例のように`String`と`Integer`と綴られている場合、そのペアは代わりに未決定になります（下記）。一致し得ない位置引数の個数や、一方が要求し他方がいかなる形式でも受け取れないキーワードも同様に矛盾します。エラーには証明が必要であり、RBS階層から読み取られる、絶対パスで書かれたRubyコアまたはstdlibクラス（`::String`、`::Integer`）のみがそれを与えます。`Comparable`のようなモジュールはどのクラスでもインクルードできるため決して考慮されず、あなた自身のクラス（`sig/`がRubyの与えるスーパークラスを省略している可能性がある）、gemのクラス、素の`String`のような相対名（自身の`App::String`である可能性がある）、オプショナルまたはrestパラメータ（呼び出しが省略する可能性がある）、ブロックのパラメータ（本体が決してyieldしない可能性がある）も考慮されません。古い生成シグネチャが通常の原因です: 再生成するか、アノテーションを修正してください。
- **Rigorが判断できない場合: `.rbs`がバインドし、`:info`を出す**。
  位置が型エイリアス、インターフェース、`self`、型変数、またはプロジェクトが宣言する相対クラス名を名指している場合、Rigorが2つの型が素であることを証明できない場合（`Numeric`に対する`Integer`のようなサブクラス関係を含む）、パラメータリストの形状が異なるが重なり合っている場合、オーバーロードが1対1でペアリングされない場合（順序ではなく宣言内容でペアリングされる）、あるいは各側がどこかでより精密である場合、インラインシグネチャは破棄され、バインドしたメンバーと`.rbs`を名指して`plugin.rbs-inline.source-rbs-annotation-not-honoured`として報告されます。解決するには一方を他方のリファインメントにするか、一方を削除してください。

`rigor sig-gen --write`は意図的にこの重複を生成します: デフォルトで各インライン宣言を`sig/`にコピーするため、生成されたシグネチャはgemが出荷する完全な契約になります。同一のコピーは上記のとおり沈黙します。インラインアノテーションが後からそのコピーと不一致になった場合、`rigor sig-gen --write`および`--check`はメソッドを拒絶し、両者を一致させるか`--overwrite`（`sig/`メンバーをインライン宣言で置き換える）を渡すまで`1`で終了します。Steepが同じアノテーションを読み込むプロジェクトでは、代わりに`sig_gen.inline_declared: skip`を設定します（[ハンドブック第11章](../../../handbook/11-sig-gen/#インラインで宣言されたメソッド)）。

インラインアノテーション上の`%a{rigor:v1:return: …}`または`%a{rigor:v1:param: …}`リファインメントも、自身の宣言された型と値を共有しなければなりません: `# @rbs %a{rigor:v1:return: positive-int} () -> ::String`はアノテーション付きファイルで`rbs.contradicting-signature`として報告されます（同じ証明規則が適用されるため、`::`のない`-> String`は放置されます）。

従うべき上流の規則はありません: rbsはインラインの`.rb`宣言と`.rbs`宣言を単一のクラスエントリーにマージし、どちらにも順位を付けないため、Steepは同じ重複をシグネチャエラーとして報告し、クラスのビルドは失敗します。Rigorは報告を維持しつつ縮退を落とします（[ADR-112](../../../adr/112-extrbs-comment-channel/) WD5。これは[ADR-32](../../../adr/32-rbs-inline-comment-ingestion/) WD13の「`.rbs`が常に勝つ」を置き換えました）── 衝突するままに放置されると、1つの重複したメソッドがクラスから他のすべてのメソッドを奪い、実在するメソッドもタイポも等しくその上の各呼び出しが`Dynamic[top]`を読むことになります。

これがカバー**しない**2つの重複: **バンドル済み**RBS（Rubyコア、stdlib、gemのシグネチャ）と衝突する`.rbs`は代わりにファイル単位で隔離され、`rbs.coverage.quarantined-signature`として報告されます;同じメンバーを宣言する2つの`.rbs`ファイルは依然としてクラスの定義ビルドを失敗させ、`rbs.coverage.definition-build-failed`として表面化します ── そのペアのどちらの側も他方よりレビューされているわけではないため、優先すべきものが何もないからです。

## RigorはインラインRBSのどの方言を読むか

インラインRBSには2つの実装があります。このプラグインが動かす[`rbs-inline` gem](https://github.com/soutaro/rbs-inline)と、`rbs` 4.xに組み込まれた`RBS::InlineParser`です。**Rigorはgemの方言を読みます**（[ADR-32](../../../adr/32-rbs-inline-comment-ingestion/) WD11）。両者はほぼ完全に重なっており —— `#:`、`@rbs`のメソッド型、`def self.`、インスタンス変数のアノテーション、`@rbs skip`はすべて同一に振る舞います —— しかし同じ文法ではなく、1つの違いが実務で噛みつきます:

| 書き方 | Rigorが尊重するか |
| --- | --- |
| `# @rbs module-self Comparable` | する |
| `# @rbs module-self: Comparable` | **しない** —— rbs自身の`docs/inline.md`にある綴りはこちら |

Rigorは2番目の形式を黙って捨てるのではなく、`plugin.rbs-inline.source-rbs-annotation-not-honoured`として報告します。gemがサポートし組み込みパーサがサポートしない構文 —— `@rbs generic T`、`@rbs!`の埋め込みRBSブロック、`@rbs inherits`、メソッド可視性 —— はすべてここで動作します。

## 同一行アノテーション

`%a{…}`アノテーションは、メソッド型と同じ行に置くことができます:

```ruby
class Reader
  # @rbs %a{rigor:v1:return: non-empty-string} () -> String
  def title = "x"

  #: %a{pure} () -> String
  def label = "x"
end
```

これは組み込みパーサとSteepのインラインモードが受け付ける綴りです。gem自体はこれを受け付けず、`@rbs`形式ではアノテーションを保持してメソッド型をドロップし、`#:`行は行全体をドロップします。Rigorはgemのライターが走る前にその行をアノテーションとメソッド型へ分割し直すため、アノテーションが単独行を持つ場合と同様に両方が適用されます（[ADR-32](../../../adr/32-rbs-inline-comment-ingestion/) WD11）。gem自身の`rbs-inline --output`は変更されず、依然としてそれらをドロップします。

アノテーションの後のメソッド型がパースできない場合、何も分割されません: メソッドはシグネチャが書かれなかったかのように型付けされ、Rigorはそれを報告します —— `#:`行は[パースできない`#:`の型](#パースできないの型)の下で、`@rbs`行は読み取れなかった行とテキストを名指して`plugin.rbs-inline.source-rbs-annotation-not-honoured`として報告します。

## パースできない`#:`の型

型がRBSとしてパースできない`#:`行はドロップされます —— シグネチャが決して適用されることはなく、メソッドはその型が間違っていたかのようにではなく、その行がそもそも書かれなかったかのように型付けされます:

```ruby
class BadRefProbe
  #: (finite-float) -> String
  def show(f)
    f.to_s
  end
end
```

`finite-float`は[Rigorリファインメント](../../16-rbs-extended-annotations/)の名前であってRBSの型ではなく、通常の型位置には属しません。Rigorはそのドロップを、どこにも診断がないまま`show`を暗黙に`untyped`にしておくのではなく、パースに失敗した行とテキストを名指して`plugin.rbs-inline.source-rbs-annotation-not-honoured`として報告します。同じ誤りの`# @rbs name: TYPE`タグ形式は異なる失敗の形状となります —— 次のセクションを参照してください。

## `# @rbs`内の未解決の型名

`# @rbs name: TYPE`タグ形式において、RBSの型が属する場所にRigorリファインメント（または他の未解決の名前）を指定しても、`#:`のように静かにドロップされることはありません —— クラス全体を巻き込みます:

```ruby
class ProbeZZ
  # @rbs g: finite-float
  def probe(g)
    g.to_s
  end
end
```

upstream自身の型パーサが、これがRigorに届く前に`finite-float`を`finite`に切り詰めるため（ハイフンはRBSの型名を継続できない）、`RBS::DefinitionBuilder`に届く唯一のトークンは`finite`となります —— そしてそれはロードされたどの型も指さないため、クラス**全体**のビルドが失敗します（`RBS::NoTypeFoundError`）。`probe`、および`ProbeZZ`上の他のすべての実在するメソッドは`Dynamic[top]`を読むことになります。これは`rbs.coverage.definition-build-failed`として表面化し、そのトークンと、（それが登録されたリファインメント名の切り詰められた先頭部分である場合）今日有効な`%a{rigor:v1:…}`の表記を名指します（[RBS::Extendedアノテーション](../../16-rbs-extended-annotations/)を参照）。

## パースできない`# @rbs name:`の型

有界またはパラメータ化されたリファインメント —— `Integer[1..10]`、`non-empty-array[Integer]` —— は、`finite-float`のようにハイフンで切り詰められないため、クラス全体を巻き込むことはありません。その代わり、`# @rbs name: TYPE`の位置において、パラメータを暗黙に型なしのまま残します:

```ruby
class BoundedProbe
  # @rbs n: Integer[1..10]
  def probe(n)
    n
  end
end
```

gemの文法はこのアノテーションでコロンと型を任意としているため、パースできない`TYPE`は、例外をraiseするのではなくパラメータの名前を記録してその型を未設定のままにします —— 下流では誰もアノテーションしなかったパラメータと区別がつきません。Rigorはそのドロップを`plugin.rbs-inline.source-rbs-annotation-not-honoured`として報告し、パースに失敗した行とテキストを名指し、`Integer[1..10]`のようなリファインメントを正しく運ぶ`%a{rigor:v1:param:}`の表記を案内します（[RBS::Extendedアノテーション](../../16-rbs-extended-annotations/)を参照）—— これは上のタグ形式に対して`%a{rigor:v1:…}`のポインタが与えるのと同じ助言です。

## `@rbs`後の認識されないタグ

gemは、`@rbs`の直後に単語境界を見た時点で、そのコメントを`@rbs`アノテーションの試みとして認識します —— これは空白や行末だけでなく、ハイフンにもマッチします:

```ruby
class TagProbe
  # @rbs-ext return: non-empty-string
  # @rbs return: String
  def name
    "x"
  end
end
```

`# @rbs-ext …`はその網の中にありますが、gemの文法には`-ext`を認識するものが何もないため、gemはその段落全体を諦めて通常のコメントへと畳み戻します —— 隣接する`# @rbs return: String`行は引き続き束縛されますが、`@rbs-ext`行は何も寄与せず、これ以前は何の言及もありませんでした。Rigorはそのドロップを`plugin.rbs-inline.source-rbs-annotation-not-honoured`として報告し、行とコメントテキストを名指します —— `@rbs-ext`がいかなる種類の認識されたタグであるかも示唆しません。散文の中で単に`@rbs`に言及しているコメントや、`@rbs`で始まらないタグで始まるコメント（`# @extrbs …`）は、gemの検出器の外にあり沈黙を保ちます。

## 設定

```yaml
plugins:
  - gem: rigor-rbs-inline
    config:
      require_magic_comment: true   # デフォルト
```

- **`require_magic_comment`**（デフォルト`true`）── `true`のとき、`# rbs_inline: enabled`を持つファイルのみが処理されます。`false`に設定すると、すべてのファイルがマジックコメントを持っているかのように扱われます ── これは解析スコープ全体を自分が所有している場合（単一ファイルのCI実行や、ホスト型の[ブラウザプレイグラウンド](../../../adr/29-browser-playground/)。後者はこれを設定し、貼り付けたスニペットがマジック行なしで解析されるようにしている）にのみ有用です。

## 制限事項

- **トップレベルの`def`はRBSを生成しません**。upstreamのrbs-inlineは、裸のトップレベル`def`に対して何も出力しません（rbs-inline 0.14.0で検証済み）── メソッドを`class` / `module`で包んでください。これはRigorの制限ではなく、upstreamから継承した挙動です。
- **パース失敗はソフトフェイルします**。rbs-inlineがパースできないファイルは、インラインRBSがなかったものとして解析されます（上記の`:info`のdiagnosticがそれを記録します）。エスカレートさせるには`severity_profile:`で重大度を打ち直してください。
- **ランタイム依存**。このプラグインは`rbs-inline` gemを取り込みます。コアの`rigortype`はランタイム依存ゼロのままであり、オプトインしたプロジェクトだけがそのコストを負担します。

## プラグインの内部

シンセサイザー、`source_rbs_synthesizer:`マニフェストフック、キャッシュの配線については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-rbs-inline/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
