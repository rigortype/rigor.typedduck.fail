---
title: "rigor-rbs-inline"
description: "rigortype/rigor docs/manual/plugins/rigor-rbs-inline.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rbs-inline.md"
sourcePath: "docs/manual/plugins/rigor-rbs-inline.md"
sourceSha: "454f19b992054a61e69c50f6487e8157eb15136c1e29a3360a3dfeadce1711ea"
sourceCommit: "6e5bd55274e20dfb59183559c4971d34f878c907"
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

> **完全なガイド**。実践的な解説 ── サポートされるすべてのアノテーション形式、マジックコメントによるオプトイン、トップレベル`def`に関する注意、パース失敗の扱い ── は[ハンドブック第7章 — RBSとExtended](../../../handbook/07-rbs-and-extended/)の§「Inline RBS in Ruby source」にあります。このページは運用上のクイックリファレンスです。

## 何をするか

ファイルごとに、upstreamのマジックコメントでオプトインします。

```ruby
# rbs_inline: enabled

class AscDesc
  # @rbs asc_or_desc: :asc | :desc
  def ascdesc(asc_or_desc) = asc_or_desc
end

AscDesc.new.ascdesc(:bad)   # エラー: 引数の型の不一致 — :asc | :desc を期待したが :bad だった
```

`# rbs_inline: enabled`を持たないファイルは手を付けられません（ファイル先頭のスキャンのみ）。合成されたRBSはファイルごとにキャッシュされ（コンテンツSHA＋プラグインのid/version＋設定をキーとする）、変更がない場合は2回目の実行でパースをスキップします。

| ルール | 重大度 | 発火条件 |
| --- | --- | --- |
| `plugin.rbs-inline.source-rbs-synthesis-failed` | info | rbs-inlineがファイルをパースできなかった。解析はインラインRBSの寄与なしにフォールバックし、diagnosticはupstreamのエラーを伴う |

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
