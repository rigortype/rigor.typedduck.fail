---
title: "インラインリファインメントキャリア: 3つのインラインRBSリーダーに見えるもの"
description: "rigortype/rigor docs/notes/20260912-inline-refinement-carrier-probe.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260912-inline-refinement-carrier-probe.md"
sourcePath: "docs/notes/20260912-inline-refinement-carrier-probe.md"
sourceSha: "383c8663bcb7f7903e74c171d7641d67d514b4ca5da3aa1b8a3b06964ff70c65"
sourceCommit: "d01a937b5d3d66d5ec4e6ba82036919d1bc91d10"
sourceDate: "2026-09-14T18:55:47+09:00"
translationStatus: "translated"
sidebar:
  order: 20266912
---

日付: 2026-09-12、`568138c2`時点; Steep列、行X、Yおよびコントロールは同日の`ea5b0137`で追加。rbs 4.2.0およびrbs-inline 0.14.0（本リポジトリのバンドルが解決するバージョン）; rbs 4.0.2上のSteep 2.0.0（`tool/steep/`内の固定バージョン）。「#998後のRigor」列は2026-09-14に[#998](https://github.com/rigortype/rigor/issues/998)ブランチ（`19d7105d`からフォーク、同一のrbsおよびrbs-inline）上で追加; Steepはそのブランチ向けに再実行されていないため（`tool/steep/`はそのワークツリーにインストールされていない）、′が付いた2つの行にはSteepセルがありません。その列の行BとHは2026-09-14に[#1019](https://github.com/rigortype/rigor/issues/1019)ブランチ（`b73747d6`からフォーク、同一のrbsおよびrbs-inline、他が何も動いていないことを確認するためまず変更なしで全行にわたりメソッドを再実行）上で更新されました。[ADR-111](../../adr/111-inline-refinement-carrier/)の根拠;裁定自体はそちらにあり、ここにはありません。

ステータス: **測定ノート**。issue [#996](https://github.com/rigortype/rigor/issues/996)が推測ではなく測定を求めた問い —— *Rigor以外のインラインRBSリーダーは、`.rb`ファイル内のRigorリファインメントの各候補表記をどう扱うか？* —— に、プロジェクトが今日実行できる3つのリーダーについて答えます: `rbs-inline` gem（Rigorのリーダー、[ADR-32](../../adr/32-rbs-inline-comment-ingestion/) WD11）、rbs組み込みの`RBS::InlineParser`（[ADR-94](../../adr/94-rbs-inline-reader-and-the-rbs-3x-floor/)）、およびインラインモードのSteep。このノートの初版にはSteep列がありませんでした —— 実行環境に`tool/steep/`がインストールされていなかったため —— ADR-111はそのギャップをオープンの前提条件として記録していました。現在は列が存在します;発見5がその内容を述べています。

## 方法

各フィクスチャは1つのメソッドを持つ1つのクラスです。2つのライブラリリーダーは同じソースに対して実行されます:

- gem: `RBS::Inline::Parser.parse(prism, opt_in: false)` → `RBS::Inline::Writer.write` → Rigorのプラグインが環境に寄与するRBSテキスト。
- 組み込み: `RBS::InlineParser.parse(buffer, prism)` → `Result#declarations`（アノテーション付きのメンバーオーバーロード） + `Result#diagnostics`。

```ruby
require "prism"
require "rbs"
require "rbs/inline"

src = File.read(ARGV[0])
prism = Prism.parse(src)
uses, decls, rbs_decls = RBS::Inline::Parser.parse(prism, opt_in: false)
puts RBS::Inline::Writer.write(uses, decls, rbs_decls)

result = RBS::InlineParser.parse(RBS::Buffer.new(name: Pathname("x.rb"), content: src), prism)
result.declarations.each do |decl|
  decl.members.each do |m|
    puts [m.name, m.overloads.map { |o| [o.method_type.to_s, o.annotations.map(&:string)] }].inspect
  end
end
result.diagnostics.each { |d| puts "#{d.class.name.split('::').last}: #{d.message}" }
```

Flake内で実行: `nix … develop --command bundle exec ruby probe.rb FIXTURE.rb`。

「#998後のRigor」列は、素のgemではなくRigor自身が寄与するものです: プラグインの`Rigor::Plugin::RbsInline::Synthesizer.new(require_magic_comment: false).call(path)` —— 合成されたRBSに加えて、それが返すADR-32 WD12の通知 —— を同一のフィクスチャに対して実行し、上記のプローブを変更なしで再実行してgem列が動いていないことを確認し、診断のために各フィクスチャに対して`rigor check --no-cache`を実行しました。セルに*束縛される*とある場合、そのフィクスチャは`%a{pure}`表記のもとで本体を`1`に変更しても実行され（`def.return-type-mismatch … declared String, inferred 1`を報告）、呼び出しサイト`Probe.new.name`は事前に`.rigor/`を削除した上で`rigor type-of`のもとで`non-empty-string`を読み取りました。

Steepは、使い捨てプロジェクトとして配置された同一のフィクスチャ（`lib/`下に1行につき1ファイル）、`tool/steep/`のバンドル（`make steep-install`;別のRubyストアパスからクローンされたバンドルは、ネイティブ拡張が別のパスに対してビルドされているため、そのGemfileのもとで事前に`bundle pristine`が必要）を用いて実行されます:

```ruby
# Steepfile
target :lib do
  check "lib", inline: true
end
```

Flake内、プロジェクトディレクトリから`BUNDLE_GEMFILE=<repo>/tool/steep/Gemfile bundle exec steep check`。`inline: true`を持たない2つ目のSteepfile（空の`sig/`に対する`signature "sig"`、その後に`check "lib"`）がスコープのコントロールです。

**クリーンなSteepセルはシグナルの欠如ではありません**。3つの束縛コントロールは、`String`戻り値のもとでメソッド本体を`"x"`から`1`に変更した同一のフィクスチャです —— `# @rbs %a{rigor:v1:return: non-empty-string} () -> String`（A2）、`#: %a{rigor:v1:return: non-empty-string} () -> String`（F）、および`#: () -> String`の上の`# @extrbs return: non-empty-string`（X）。各々は`Cannot allow method body have type ::Integer because declared as type ::String`（`Ruby::MethodBodyTypeMismatch`）を報告するため、*クリーン、束縛される*と記されたすべての行で、Steepは素のシグネチャを読み取り、その傍らのアノテーションを無視しました。素の`# @rbs g: Float` / `# @rbs return: String`ペアも、ハーネスのコントロールとしてクリーンです。

## フィクスチャと結果

すべてのフィクスチャにおける素の契約は`() -> String`または1パラメータのメソッドです; Rigorのペイロードは`non-empty-string` / `finite-float` / `Integer[1..10]`です。**太字**のSteepセルは、診断ID `RBS::InlineDiagnostic`のもとでのアノテーション行上の`[error]`であり、`steep check`はそれで非ゼロで終了します。

| # | 表記（`def`の上のコメント行） | `rbs-inline` gem → RBSテキスト | `RBS::InlineParser`（rbs 4.2.0） | Steep 2.0.0、`inline: true` | #998後のRigor |
| --- | --- | --- | --- | --- | --- |
| A | `# @rbs %a{rigor:v1:return: non-empty-string}`に続いて`# @rbs return: String` | `def name: () -> String`上の`%a{rigor:v1:return: non-empty-string}` —— **アノテーションが着弾** | `() -> String`、アノテーション`[]`、**`AnnotationSyntaxError: expected a token pARROW`** —— 素の戻り値は束縛され、アノテーションは失われて報告される | **`Syntax error: expected a token pARROW`** | 不変: `() -> String`上にアノテーション、診断なし |
| A2 | `# @rbs %a{rigor:v1:return: non-empty-string} () -> String`（1行） | アノテーションは着弾、メソッド型は**脱落** → `def name: () -> untyped`、診断なし | `() -> String`、オーバーロードアノテーション`["rigor:v1:return: non-empty-string"]`、診断なし | クリーン、束縛される（コントロール） | **アノテーションと`() -> String`の双方が付与**、推論マークなし、診断なし;束縛される、呼び出しサイトは`non-empty-string`。`19d7105d`時点: `() -> untyped`、推論マーク付き、沈黙 |
| F | `#: %a{rigor:v1:return: non-empty-string} () -> String` | `SyntaxErrorAssertion` —— 行全体が**暗黙にドロップ**、`def name: () -> untyped` | `() -> String`、オーバーロードアノテーション付き、診断なし | クリーン、束縛される（コントロール） | **アノテーションと`() -> String`の双方が付与**、診断なし;束縛される、呼び出しサイトは`non-empty-string`。`19d7105d`時点（#1005後）: `() -> untyped`、この正当な行を「パースできなかった … DROPPED」とする誤った`source-rbs-annotation-not-honoured` info |
| Q | `# @rbs %a{…}`に続いて`#: () -> String` | `() -> String`上にアノテーションが着弾 | Aと同様: `pARROW`エラー、アノテーション喪失 | **Aと同様** | 不変: Aと同様 |
| P | `# @rbs %a{pure}`に続いて`# @rbs return: String` | Aと同様 | Aと同様 —— 分割は単独行`%a{}`の特性であり、Rigorのペイロードの特性ではない | **Aと同様** | 不変: Aと同様 |
| P2 | `#: %a{pure} () -> String` | Fと同様: 暗黙にドロップ | Fと同様: アノテーション`["pure"]` | クリーン | **`%a{pure}`と`() -> String`の双方が付与**、診断なし;束縛される。`19d7105d`時点: Fと同じ誤ったinfo |
| B | `# @rbs-ext return: non-empty-string`に続いて`# @rbs return: String` | 段落が通常のコメント（`CommentLines`）として読み取られ、診断なし;次の`@rbs`行が束縛される | `() -> String`、**`AnnotationSyntaxError: unexpected token for @rbs annotation`** | **`Syntax error: unexpected token for @rbs annotation`** | `() -> String`が束縛される、加えて2行目と`@rbs-ext`コメントテキストを名指す**新しい**`source-rbs-annotation-not-honoured` info（#1019以前は沈黙） |
| X | `# @extrbs return: non-empty-string`に続いて`# @rbs return: String`（または`#: () -> String`） | 通常のコメント; `def name: () -> String`の上の**コメントテキストとして生成されたRBSへそのままコピーされる**;次の行が束縛される | `() -> String`、診断なし | クリーン、束縛される（コントロール） | 不変: `() -> String`、診断なし |
| Y | `#: () -> String`に続いて`# @extrbs return: non-empty-string` —— 型行の*後*のタグ | `() -> String`が束縛されるが、ライターがコメントブロックを再描画する: `# : () -> String` / `#  @extrbs …` | `() -> String`、診断なし | クリーン | 不変: `() -> String`、診断なし |
| C | `# rigor: return non-empty-string`に続いて`# @rbs return: String` | 通常のコメント、効果なし、次の行が束縛される | `() -> String`、**診断なし** | クリーン | 不変: `() -> String`、診断なし |
| G | `# @rigor return: non-empty-string`に続いて`# @rbs return: String` | 通常のコメント、効果なし、次の行が束縛される | `() -> String`、診断なし | クリーン | 不変: `() -> String`、診断なし |
| D | `# @rbs g: finite-float` | `def probe: (finite g) -> untyped` —— リーダーは`-`で停止し、**`finite`を型として出力**、診断なし（#997の`NoTypeFoundError: Could not find finite`） | `(?) -> untyped`、`AnnotationSyntaxError: expected a token pEOF` | **`Syntax error: expected a token pEOF`** | 不変: `(finite g)`、`finite`を名指す`rbs.coverage.definition-build-failed`警告（#997） |
| E | `#: (finite-float) -> String` | `SyntaxErrorAssertion`、暗黙にドロップ、`(untyped f) -> untyped` | `(?) -> untyped`、`AnnotationSyntaxError: unexpected token for function parameter name` | **`Syntax error: unexpected token for function parameter name`** | 不変: `(untyped f) -> untyped`、2行目を名指す`source-rbs-annotation-not-honoured` info（#997） |
| H | `# @rbs n: Integer[1..10]` | nilの型を持つ`VarType` → `(untyped n)`、診断なし | `(?) -> untyped`、`AnnotationSyntaxError: comma delimited type list is expected` | **`Syntax error: comma delimited type list is expected`** | 依然として`(untyped n) -> untyped`、加えて2行目、`Integer[1..10]`、およびそれを運ぶ`%a{rigor:v1:param:}`表記を名指す**新しい**`source-rbs-annotation-not-honoured` info（#1019以前は沈黙） |
| A2′ | `# @rbs %a{pure} (finite-float) -> String`（1行、不正形式） | `def name: () -> untyped`上に`%a{pure}`、診断なし | `(?) -> untyped`、`AnnotationSyntaxError: unexpected token for function parameter name` | 未測定 | `%a{pure}`は保持、`() -> untyped`、2行目と`(finite-float) -> String`を名指す**新しい**`source-rbs-annotation-not-honoured` info（`19d7105d`時点では沈黙） |
| F′ | `#: %a{pure} (finite-float) -> String`（不正形式） | `SyntaxErrorAssertion`、`def name: () -> untyped` | A2′と同様 | 未測定 | `19d7105d`時点から不変: `() -> untyped`、2行目と`%a{pure} (finite-float) -> String`を名指す#997のinfo |

`inline: true`がない場合、すべてのフィクスチャクラスは`Ruby::UnknownConstant`（`Cannot find the declaration of class`）となり、アノテーションは良きにつけ悪しきにつけ一切読み取られません。

## 発見

1. **今日、両方のライブラリリーダーが受け付ける`%a{}`の表記は存在しない**。単独行形式（A、`docs/manual/16-rbs-extended-annotations.md`が記載する形式）はgem限定である: 組み込みリーダーはそれを構文エラーとして報告しアノテーションをドロップして、素の型を保持する。同一行形式（A2、F）は組み込み限定である: gemはアノテーションを保持するが、メソッド型（A2）または行全体（F）を暗黙に捨てる。`%a{pure}`（P、P2）も全く同様に分割されるため、これは`docs/notes/20260730-inline-rbs-parser-grammar-diff.md`がカタログ化したようなgem対組み込みの文法乖離であり、`rigor:v1:`ペイロードが何かをしているわけではない。
2. **`@rbs`で始まるタグは両リーダーの網の中にある**。rbs-inlineはアノテーションコメントを`/\A#(\s*)@rbs(\b|!)/`（`annotation_parser.rb`、`annotation_comment?`）で検出し、トークナイザーは`@rbs\b`をスキャンする; `\b`は`s`と`-`の間でマッチするため、`# @rbs-ext`（B）は未知の本体を持つ`@rbs`アノテーションとなる —— gemに飲み込まれ、組み込みリーダーによって診断される。`@rbs`で始まらないタグ（C、G、X）は両者に見えず、その傍らの`@rbs`行が束縛される。
3. **gemは決して診断しない**。パースできないすべての`@rbs`段落（B、D、H）およびパースできないすべての`#:`行（E、F、P2）は診断なしにドロップされ、Dはさらに進んで切り詰められた型を出力する。これこそが#997が取り組んでいる沈黙であり、型位置のリファインメント名を最悪のキャリアにしている特性である: 最も重要なリーダーが何も言わず、もう一方は壊れたシグネチャを目にする。
4. **素朴な表記はすべてのリーダーを壊す**（D、E、H）: 誰も読み取れる素の契約が残らない。
5. **Steepのインラインモードは、エラーとして表面化された組み込みリーダーである**。すべてのSteepセルは、組み込み列の診断をトークン単位で繰り返し、`RBS::InlineDiagnostic`のもとでの`[error]`深刻度となり、`steep check`はそれで失敗する。したがってSteepのもとでは単独行`%a{}`形式（A、Q、P）は失われるのではなく**赤（red）**になる —— rbsコア自身のアノテーションである`%a{pure}`も含めて —— そして同一行形式（A2、F、P2）はクリーン*かつ束縛される*: 本体型のコントロールは、Steepが素のシグネチャを読み取りその傍らのアノテーションを無視することを示しており、これはマニュアル16が他のすべてのRBSツールについて主張している「保持または無視する」挙動である。したがってその主張は、Rigor自身以外のすべてのリーダーのもとで同一行形式について真であり、3つのリーダー中2つのもとで単独行形式について偽である。スコープは正確に`inline: true`である: これがなければSteepは`.rb`アノテーションを一切読まないため、影響を受ける母集団はSteepのインラインモードをオプトインした層 —— これらの行を書くのと同じ母集団 —— である。設計ノートの「Steepは未知のアノテーションを許容する」（`docs/design/20260816-effect-labels.md` § 6.5）は、それが書かれた対象である単独行形式について反証され、同一行形式について成り立つ。
6. **`@extrbs`は`@rbs-ext`が機能しない場所で機能するタグ名である**。メンテナーの対案は`@rbs`で始まらないため、発見2の網の外にある: 3つのリーダーすべてがそれを通常のコメントとして扱い、その傍らの`@rbs` / `#:`が束縛される（X、およびSteepの束縛コントロール）。2つの詳細は平坦化するのではなく留め置く価値がある。第1に、gemはその行を生成されたRBSへ**コメントテキストとして**コピーする —— したがってrbs-inlineライターの境界においてテキストは生き延びるが意味は生き延びない; `.rbs`内ではキャリアは依然として`%a{}`でなければならない。第2に、配置: `#:`行の後（Y）では、シグネチャは依然として束縛されるものの、gemはコメントブロックを再描画する（`# : () -> String`、続いて`#  @extrbs …`）;アノテーションブロックの前が安全な位置である。Rigor自身は今日これのいずれもパースしない —— XとYは隣接する素の行が無傷で環境に届くことのみを測定している。
7. **#998の後、Rigorは両方の同一行形式を読み取り、不正形式のものは依然として報告する**。A2、F、P2はアノテーションとメソッド型が付与された状態で環境に届く —— Rigor列が動いた唯一の行である。gem列は動いていない: 修復はRigor側であり、ライターが走る前のgemのパース済みアノテーションリストの分割であるため、`rbs-inline --output`は依然としてA2とFを`() -> untyped`として描画する。A2′とF′はペアとなるコントロールである: メソッド型が真に不正形式である同一行はメソッドを型なしのまま保ち、以前はA2′が沈黙していたのに対し、両方の表記で報告される。Rigor内で依然として沈黙し、その分割の外側にあった2つの行: B（gemが`# @rbs-ext`を散文として読む）およびH（`Integer[1..10]`が型を持たない`VarType`を残す）。[#1019](https://github.com/rigortype/rigor/issues/1019)がその両方をクローズした: Bは認識されない`@rbs`接頭辞のタグを畳み戻した`CommentLines`段落上のgem自身の`annotation_comment?`マーカーから検出され、Hはコメント上のパターンからではなく`VarType#type`が`nil`であることから検出される。どちらも束縛されない —— Bはgemにとって依然として散文であり、Hは依然として`untyped`である —— が、両方とも報告されるようになり、#998が開いたまま残していた最後の2行について、その「診断なしにドロップされる行はない」基準をクローズした。

本ノートが確定していないこと: 2.0.0以外のSteep、または4.0.2 / 4.2.0以外のrbsが組み込み文法に異なる形状を与えるかどうか —— ADR-79はRigorをプロジェクト自身の`rbs`上に保つため、組み込み列とSteep列は構造上バージョン依存である;そしてどのフィクスチャも運んでいない、インラインでのクラスレベルディレクティブ（`conforms-to`、HKTペア）に関するすべてのこと。
