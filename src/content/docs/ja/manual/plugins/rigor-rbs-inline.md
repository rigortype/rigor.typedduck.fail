---
title: "rigor-rbs-inline"
description: "rigortype/rigor docs/manual/plugins/rigor-rbs-inline.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rbs-inline.md"
sourcePath: "docs/manual/plugins/rigor-rbs-inline.md"
sourceSha: "5bbbffb99ce3fb98a3c56548d4be8e5d78697457835d4e331e2806f76ffa38f8"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
sourceDate: "2026-09-08T23:14:37+09:00"
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
| `plugin.rbs-inline.source-rbs-annotation-not-honoured` | info | アノテーションのパースは成功したが何も寄与しなかった ── そのファイルの他のアノテーションは引き続き適用される。2つの原因がある: `sig/`も宣言しているメンバー（[優先順位](#優先順位)を参照）、および`# @rbs module-self: Foo`の綴り（下記参照） |

## 優先順位

メソッドが`sig/`とインラインアノテーションの**両方**で宣言されている場合、**メンバーごとに`.rbs`が勝ちます**。その1つのメソッドに対するインラインシグネチャはドロップされます;ファイル内の他のすべてのアノテーションは引き続き束縛され、クラスはそのメソッドサーフェスを保持します。

```ruby
# lib/demo.rb                  # sig/demo.rbs
class Demo                     # class Demo
  # @rbs (Integer) -> String   #   def shared: (String) -> Integer  ← こちらが勝つ
  def shared(v) = v.to_s       #   def only_sig: () -> String
                               # end
  # @rbs (Integer) -> Integer
  def only_inline(v) = v + 1   # ← インラインのみ: 引き続き束縛
end
```

ドロップされた各メンバーは、そのメンバーと勝利した`.rbs`を名指して`plugin.rbs-inline.source-rbs-annotation-not-honoured`として一度報告されます。インラインアノテーションを有効にするには、2つの宣言のいずれかを削除してください。

`sig/`が勝つのは、それがレビュー対象の成果物 ── レビューでdiffを取り、`rigor sig-gen --diff`が推論の対象とするもの ── だからです。従うべき上流の規則はありません: rbsはインラインの`.rb`宣言と`.rbs`宣言を単一のクラスエントリーにマージし、どちらにも順位を付けないため、Steepは同じ重複をシグネチャエラーとして報告し、クラスのビルドは依然として失敗します。Rigorは報告を維持しつつ縮退を落とします（[ADR-32](../../../adr/32-rbs-inline-comment-ingestion/) WD13）── 衝突するままに放置されると、1つの重複したメソッドがクラスから他のすべてのメソッドを奪い、実在するメソッドもタイポも等しくその上の各呼び出しが`Dynamic[top]`を読むことになります。

これがカバー**しない**2つの重複: **バンドル済み**RBS（Rubyコア、stdlib、gemのシグネチャ）と衝突する`.rbs`は代わりにファイル単位で隔離され、`rbs.coverage.quarantined-signature`として報告されます;同じメンバーを宣言する2つの`.rbs`ファイルは依然としてクラスの定義ビルドを失敗させ、`rbs.coverage.definition-build-failed`として表面化します ── そのペアのどちらの側も他方よりレビューされているわけではないため、優先すべきものが何もないからです。

## RigorはインラインRBSのどの方言を読むか

インラインRBSには2つの実装があります。このプラグインが動かす[`rbs-inline` gem](https://github.com/soutaro/rbs-inline)と、`rbs` 4.xに組み込まれた`RBS::InlineParser`です。**Rigorはgemの方言を読みます**（[ADR-32](../../../adr/32-rbs-inline-comment-ingestion/) WD11）。両者はほぼ完全に重なっており —— `#:`、`@rbs`のメソッド型、`def self.`、インスタンス変数のアノテーション、`@rbs skip`はすべて同一に振る舞います —— しかし同じ文法ではなく、1つの違いが実務で噛みつきます:

| 書き方 | Rigorが尊重するか |
| --- | --- |
| `# @rbs module-self Comparable` | する |
| `# @rbs module-self: Comparable` | **しない** —— rbs自身の`docs/inline.md`にある綴りはこちら |

Rigorは2番目の形式を黙って捨てるのではなく、`plugin.rbs-inline.source-rbs-annotation-not-honoured`として報告します。gemがサポートし組み込みパーサがサポートしない構文 —— `@rbs generic T`、`@rbs!`の埋め込みRBSブロック、`@rbs inherits`、メソッド可視性 —— はすべてここで動作します。

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
