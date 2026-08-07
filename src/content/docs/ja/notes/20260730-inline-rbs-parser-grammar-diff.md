---
title: "インラインRBS: `rbs-inline` gem vs `RBS::InlineParser` —— 文法差分"
description: "rigortype/rigor docs/notes/20260730-inline-rbs-parser-grammar-diff.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260730-inline-rbs-parser-grammar-diff.md"
sourcePath: "docs/notes/20260730-inline-rbs-parser-grammar-diff.md"
sourceSha: "5ace86feb081d3883cf54e45cf60dc795ad38a2d45d1a36d8da5345ba34eb015"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
translationStatus: "translated"
sidebar:
  order: 20266730
---

日付: 2026-07-30。このリポジトリが解決するバージョンである`rbs` 4.1.0（4.1.0タグの`references/rbs`）と`rbs-inline` 0.14.0に対して。

ステータス: **計測ノート**。 [#229](https://github.com/rigortype/rigor/issues/229)の問い1 —— *2つのパーサが受理する文法は今日同じなのか、それともすでに乖離しているのか？* —— に答える。issueはこれをドキュメントではなくコーパスに対して決着させるよう求めていた。これが供給する設計上のコミットメントはADR-32の修正であり、ここで行うものではない。

---

## 手法

両パーサを同じスニペット群に走らせ、Rigorが消費するサーフェス —— 宣言された`(class, kind, member, type)`のタプル —— に正規化する。したがってAST形状の違いは乖離として数えない:

- gem: `RBS::Inline::Parser.parse` → `Writer.write` → RBSテキスト → `RBS::Parser.parse_signature`
- 組み込み: `RBS::InlineParser.parse(buffer, prism)` → `Result#declarations`（＋`#diagnostics`）

どの行も信頼できるようになる前に、プローブの忠実性に関する修正が2つ必要だった。どちらも最初は偽の乖離を生んでいた:

- 2つのツリーは宣言の名前の付け方が違う（`name`と`class_name` / `module_name`）。`name`だけを読むと、理由もなく**すべての**行が食い違った。
- 自分で考案したスニペットは証拠にならない。`def`の行末に付けた`#: (Integer) -> String`は両方言で不正であり、コーパスを各実装自身のドキュメント（`references/rbs/docs/inline.md`、gemの`README.md`）から作り直すまでは乖離のように見えていた。

## 結果: 乖離は双方向である

「gemが上流に遅れている」のではない。それぞれが、もう一方の受理しない構文を受理する。

### 両者で同一

| 構文 | 結果 |
| --- | --- |
| `@rbs (Integer) -> String`の先行メソッド型 | 同一 |
| `#: (Integer, Integer) -> Integer`の先行 | 同一 |
| `def each_address(&block) #: void`の末尾戻り値 | 同一 —— `() ?{ (?) -> untyped } -> void` |
| `@rbs skip` | 同一 |
| **`def self.foo`のシングルトン定義** | **同一** |
| **`class`/`module`下の`# @rbs @ivar: T`** | **同一** |

最後の2つは#229の枠組みにとって重要だ: issueはこれらを、「Rigorが今日取り込めない」rbs 4.1の新しい組み込み機能として挙げている。計測すると、gemは両方を扱える。

### `module-self` —— 同じ機能の、2つの非互換な綴り

3つ目に挙げられた機能は、そもそも機能の欠落ではない。両実装とも`module-self`をサポートしており、書き方で食い違っている。そしてgem側の失敗モードがサイレントなほうだ。

| 綴り | gem | 組み込み |
| --- | --- | --- |
| `# @rbs module-self: Comparable` —— 組み込みの`docs/inline.md` | **`self_types=[]`、診断なし** | ✅ `ModuleSelfMember` |
| `# @rbs module-self Comparable` —— gem自身の文法（`# @rbs module-self [MODULE_SELF]`） | ✅ `self_types=["Comparable"]` | ❌ `AnnotationSyntaxError` |

これは#229が述べた懸念を具体化したものであり、機能の欠落より悪い: **上流の**ドキュメントを読むユーザーはコロン形式を書き、gemの`AnnotationParser`はそこから`ModuleSelf`アノテーションを実際に生成し、そのあとライターがself型を1つも出力しない —— つまりRigorは何も尊重せず、何も言わない。そのコメントは合成されたRBSへエコーすらされるので、この脱落は目視でも見えない。

その組み合わせは、これを検出可能にし、しかも安価にする要因でもある: `self_types`が空のパース済み`ModuleSelf`アノテーションは、まさに「作者が我々の尊重しない綴りを書いた」のシグネチャだ。プラグインは存在プローブのためにすでに`AnnotationParser`を走らせているので、このチェックに新しいコストはかからない。

この行は本ノートの初版では間違っていた（「組み込みのみ、gemは黙って無視」と記録されていた）。理由は手法の節がすでに警告しているとおりだ: スニペットが組み込みの方言で書かれ、gemに対してテストされていた。同じ罠に、1つの評価の中で2度かかった。

### gemのみ —— 乗り換えると失うもの

| 構文 | gem | 組み込み |
| --- | --- | --- |
| `@rbs generic T` | `class Box[T]` | 型パラメータが落ちる、`AnnotationSyntaxError` |
| `@rbs!`の埋め込みRBSブロック | 宣言が出力される | `AnnotationSyntaxError`、何も出力されない |
| `@rbs inherits Object` | 受理 | `AnnotationSyntaxError` |
| `private`の可視性 | 保存される | 落ちる、メンバーはpublicとして出力 |
| **`class << self`** | `def self.name` | **`name`を**インスタンス**メソッドとして、診断なし** |

### 組み込みのみ

| 構文 | 組み込み | gem |
| --- | --- | --- |
| `include A, B` | `MixinMultipleArguments`診断 | 黙って受理 |
| トップレベル`def` | 原因を名指しする診断2件 | 黙って落とす |

加えて、issueの根拠コメントが特定したサーフェス群 —— この差分はそれらと矛盾しない: 型付き`diagnostics`配列、宣言ごとの`type_fingerprint`、そして非ASCIIパースの高速化（ruby/rbs#2950）。

## 決め手は`class << self`の行

乖離の大半は*拒否*だ: アノテーションが落とされ、組み込み側では診断がそう告げる。サイレントなのは2件 —— 上のコロン形式`module-self`に対するgemの扱いと、こちらだ。こちらは、何も生成しないのではなく誤った宣言が生成される唯一のケースである:

```
built-in member: DefMember name=name kind=instance singleton?=false
built-in diagnostics: []
```

シングルトンメソッドが**インスタンス**メソッドとして、サイレントに宣言される。Rigorにとって特にこれは、機能の欠落ではなく環境へ注入される誤ったファクトだ: 実在のシングルトンメソッドへの呼び出しは`call.undefined-method`の偽陽性になり、捏造されたインスタンスメソッドは本物の診断を抑制する。`docs/inline.md`はCurrent Limitationsに「`class << self`構文はサポートされない」と挙げているが —— 経験的には、ここでのサポートされないは、無視ではなく誤帰属を意味する。

[ADR-5](../../adr/5-robustness-principle/)は偽陽性を最悪ケースの静的な読みより上位に置き、[ADR-93](../../adr/93-default-rbs-inline-ingestion/)はこのプラグインをデフォルトで配線するので、影響半径は`rbs-inline`が解決するすべてのユーザーであって、オプトインの一群ではない。

## 問い3 —— プラグインが依拠しているもの、そして組み込みがそれを持つか

| プラグインが必要とするもの | 組み込み |
| --- | --- |
| `opt_in:`のマジックコメントモード（`require_magic_comment: true`） | **なし** —— `parse(buffer, prism)`はそのようなオプションを取らず、`lib/rbs/inline_parser.rb`に`rbs_inline:`ディレクティブの扱いは存在しない |
| ADR-93のゲーティングを支えるアノテーション存在プローブ | **そのものは存在しない** —— `CommentAssociation`の上に作り直すことになる。装飾的な話ではない: ゲートなしのモードはmailで26 → 42診断と実測された |
| RBSテキストを生成するライター | **設計上なし** —— `Environment#add_source`向けの宣言を返す |

ライターの不在はむしろ改善かもしれない（Rigorのレンダリング→再パースの往復を省ける）が、それは`virtual_rbs`パイプラインとは別の統合経路を意味する。乗り換えはパーサの差し替えではなく、プラグインの背骨の書き直しだ。

## 問い4 —— フロアは障害ではない

[#229の根拠コメント](https://github.com/rigortype/rigor/issues/229#issuecomment-5115257662)が述べるとおり確認された: `rbs-inline` 0.14.0自身が`rbs (~> 4.0)`を宣言しているので、ADR-93の自動配線が有効化しうるユーザーはすでに全員rbs 4.x上にいる。[ADR-94](../../adr/94-rbs-inline-reader-and-the-rbs-3x-floor/)が依拠したフロアの反対論はここには当てはまらない。それは移行を止めているものではない。

## 推奨

**gemに留まり、組み込みを将来への備えとしてまだ扱わないこと**。組み込みは上位集合ではない: `module-self`の1つの綴りと引き換えに、generics・`@rbs!`・`inherits`・可視性を手放すことになり、しかもデフォルト配線されたプラグインにサイレントな誤帰属を持ち込むことになる。

issueの本当の懸念 —— ユーザーが上流のドキュメントに沿って書いたものをRigorが落とすこと —— は確認されたし、`module-self`の2つの綴りがまさにそれだ。だがその修正は乗り換えではない。乗り換えは上の4構文へ沈黙を移すだけである。直接それに対処する、より安価なものが2つあり、どちらも方言の決定を必要としない:

1. **コロン形式の`module-self`を尊重しなかったものとして報告する**。 `self_types`が空のパース済み`ModuleSelf`アノテーションは、それに対する精密で偽陽性の少ないシグネチャだ。今日は何も報告されない: ADR-32 WD6は合成の*エラー*をカバーしており、こちらは作者が求めた宣言をサイレントに省く、成功した合成である。
2. **プラグインのREADMEで方言を明示する**。 `module-self`の綴りを明示的に名指しすること。上流自身のインラインドキュメントが、Rigorの尊重しない形式を説明しているのだから。

この決定とは無関係にやる価値があること: gemがアノテーションをパースしておきながらそのライターがそれを捨てるのは、意図的な制限ではなく上流`rbs-inline`の欠陥に見えるので、そちらへ報告する価値がある —— それはRigorのユーザーだけでなく、すべてのrbs-inlineユーザーに対して差を閉じる。

組み込みパーサがgenerics・`@rbs!`・正しい`class << self`の扱いを得たら再検討する —— それが同等性の基準であり、3つ目は機能ではなく正しさの前提条件だ。

## 限界

- 両者の文書化された文法をカバーする16のコーパススニペットであり、実世界のアノテーション付きコードのスクレイプではない。どちらのドキュメントも記述していない構文は行使されていない。
- 乖離は宣言のサーフェスで比較している。そこで一致する2つのパーサでも、ロケーションデータやコメントの付加では違いうるが、Rigorは今のところそれを消費していない。
- `rbs-inline` 0.14.0のみ。上流の意図（問い2）は[ADR-94](../../adr/94-rbs-inline-reader-and-the-rbs-3x-floor/)が記録したものから変わっていない —— soutaroはgemを、その実装が`rbs`へマージされるプロトタイプと呼んだ —— ので、進む方向に疑いはなく、疑わしいのはその到達だけだ。
