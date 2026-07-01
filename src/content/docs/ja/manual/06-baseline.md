---
title: "ベースライン"
description: "rigortype/rigor docs/manual/06-baseline.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/06-baseline.md"
sourcePath: "docs/manual/06-baseline.md"
sourceSha: "066a174f36f257423ad128175b5df60124bae39542a20ed6e2e3a025dc3ae01c"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
sourceDate: "2026-06-13T17:48:47+09:00"
translationStatus: "translated"
sidebar:
  order: 9006
---

**ベースライン**（baseline）は、プロジェクトがすでに抱えている診断を記録し、`rigor check`がそれらについて黙り、*新しい*ものだけを表面化できるようにします。既存のコードベースにRigorを導入するための実用的な入り口です: チェックがCIで役立つ前に診断をゼロにする必要はありません。

## ベースラインファイル

ベースラインは慣例として`.rigor-baseline.yml`という名前のYAMLファイルで、既知の診断のバケットを一覧します:

```yaml
version: 1
ignored:
  - file: app/models/user.rb
    rule: call.undefined-method
    count: 3
  - file: app/lib/legacy.rb
    rule: call.argument-type-mismatch
    count: 1
```

各行は`(file, rule)`をキーとする**バケット**で、そのルールについてファイルが許可される診断の`count`を持ちます。オプションの`message:`フィールド（正規表現ソース）は、メッセージが一致するコールサイトにバケットを絞り込みます。

このファイルは手書きしません。`rigor baseline generate`が生成します。

## ベースラインを有効にする

プロジェクトにあるベースラインファイルは、何かが有効化するまで**休眠状態**です。ファイルの存在だけでは何もしません。設定キーで有効化します:

```yaml
baseline: .rigor-baseline.yml
```

または実行ごとに`rigor check --baseline=PATH`で指定します。`--no-baseline`は1回の実行で設定されたベースラインを無視し、設定ファイルの`baseline: false`は`includes:`を通じて継承されたベースラインを無効化します。

## バケット単位のall-or-nothing

ベースラインがアクティブな場合、各バケットは全体として照合されます:

- **現在の数 ≤ 記録された数**: バケット内のすべての診断が沈黙する。
- **現在の数 > 記録された数**: 超過分だけでなく、バケット内のすべての診断が表面化する。

理由: ファイルが編集されると行番号がずれるため、部分的な照合では*どの*診断が新しいものかを確実に指し示せません。バケット全体を表面化することで、そのルール×ファイルをまとめてレビューするよう促します。

ベースラインフィルタは**最後に**実行されます。`# rigor:disable`コメントと重要度プロファイルの後です。ベースラインは別のレイヤーがすでに抑制した診断を復活させることはありません。

## `rigor baseline`コマンド

| コマンド | 用途 |
| --- | --- |
| `rigor baseline generate` | 現在の診断から新しいベースラインを書き出す。`--force`なしで既存ファイルの上書きを拒否する。 |
| `rigor baseline regenerate` | 無条件に書き直す。診断を修正した後にファイルを縮小するために実行する。 |
| `rigor baseline dump` | ベースラインを表示する。`--rule`と`--file`でフィルタリング可能。 |
| `rigor baseline drift` | バケットがどう動いたかを表示する。`--only=over`で増えたバケット、`reducible`ですでに改善したバケット、`cleared`で空のバケット。 |
| `rigor baseline prune` | もはや何にも一致しないバケットを削除する。`--dry-run`でプレビュー。 |

`generate`と`regenerate`は`--match-mode=rule`（デフォルト: ファイル×ルール単位で1バケット）または`--match-mode=message`（メッセージごとに1バケット: より精密だがチャーンが増える）を受け付けます。

`--match-mode=message`は各バケットを**レンダリングされたメッセージテキスト**（表示されるレシーバー型などの詳細を含む）でキーにします。これにより同じルールの2つの診断を1行の中で区別する精度は上がりますが、**壊れやすく**もなります: Rigorのアップグレードがメッセージの言い回しを変えたり型の表示方法を変えたりすると、キーが一致しなくなり、以前ベースラインに入れた診断が新規のものとして再浮上します。`--match-mode=rule`は`(file, rule)`だけをキーにするため、メッセージの言い回し変更の影響を受けません。メッセージ単位の識別が特に必要でない限りはこちらを優先し、Rigorをアップグレードした後は`message`モードのベースラインを`regenerate`することを見込んでおいてください。

## ベースラインを削減する

`rigor triage`は診断ストリームを要約します。ルール分布、クラス/メソッドセレクタ、最も診断の多いファイル、考えられる原因のヒューリスティックなヒントを表示して、何から取り組むかを決められるようにします:

```sh
rigor triage
```

`selectors`セクション（`rigor triage --format json | jq '.selectors'`）は最良の優先順位付けシグナルです: 多数の`files`にまたがって高い`count`を持つクラス/メソッドは、1つの修正または`pre_eval:`エントリーが一括で解消する系統的な原因であり、一方で低`count`のセレクタは、その場で修正すべき本物のバグの候補です。

参考情報であり常に`0`で終了します。意図したループは`triage`で優先順位付け → ルールを修正または抑制 → `rigor baseline regenerate`でファイルを縮小、というものです。[`rigor-baseline-reduce`スキル](../08-skills/)はこのループをインタラクティブに進めます。

ベースラインが*増えた*ときにCIを失敗させるには、`rigor check`に`--baseline-strict`を追加します。
