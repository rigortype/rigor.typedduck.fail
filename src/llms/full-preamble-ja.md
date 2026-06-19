# Rigor — 全文ドキュメント

> RigorはRubyの静的解析器です。ソースに型注釈を一切書かない普通のRubyから、
> 型付きレシーバーへの未定義メソッド呼び出し、引数個数の誤り、証明可能なnil
> デリファレンスといった実際のバグを報告します。型はすべてコードが実際に生成
> する値から推論されます。

このファイルは、日本語訳のハンドブック・ユーザーマニュアル・プラグインリファレ
ンス・型仕様を読む順に連結したもので、LLMがそのまま取り込めます。各ページは
`---`の罫線・H1の見出し・元ページへの`Source:`行で区切られます。

要点を絞った索引は次を参照してください: https://rigor.typedduck.fail/ja/llms.txt
全ページの一覧（ADR・内部仕様・設計／開発ノート・変更履歴）はサイトマップにあり
ます: https://rigor.typedduck.fail/sitemap-index.xml
英語の原文は`/`配下にあります。

AIエージェントへ: Rigorのインストールとプロジェクト設定は1つの指示で済みます——

```
次の手順に従って、このプロジェクトに Rigor をインストールしてください:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

これは`rigor-project-init`のAgent Skillを実行します。下のユーザーマニュアルの
「提供スキル」ページを参照してください。
