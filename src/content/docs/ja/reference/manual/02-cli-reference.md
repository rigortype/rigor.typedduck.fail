---
title: "CLIコマンドリファレンス"
description: "rigortype/rigor docs/manual/02-cli-reference.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/02-cli-reference.md"
sourcePath: "docs/manual/02-cli-reference.md"
sourceSha: "fcdead70b8fef9166c3eedd3b8c7ddd0b9411bfc0ecbfeecf2c0ed5e3c74951f"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
translationStatus: "translated"
sidebar:
  order: 9002
---

Rigorのすべてのコマンドは単一の`rigor`実行ファイルのサブコマンドです:

```sh
rigor <command> [options] [arguments]
```

`rigor help`はコマンド一覧を表示し、`rigor version`はインストール済みバージョンを表示します。不明なコマンドや不正なオプションの場合、`64`で終了します——これは慣例的な「使用法エラー」コードです。

## `rigor check`

Rubyソースを型エラーについて解析し、診断を報告します。
日常使いとCIで実行するコマンドです。

```sh
rigor check [paths...]
```

`paths`はファイルまたはディレクトリです。省略した場合、Rigorは設定ファイルの`paths:`リストを解析します。

| オプション | 説明 |
| --- | --- |
| `--config=PATH` | 自動探索の代わりに特定の設定ファイルを使用する。 |
| `--format=text|json` | 出力形式。デフォルトは`text`。 |
| `--explain` | フェイルソフトフォールバックイベントを`info`診断として表示する。 |
| `--no-cache` | この実行では永続キャッシュをスキップする。 |
| `--clear-cache` | 実行前にキャッシュディレクトリを削除する。 |
| `--cache-stats` | 終了時にオンディスクキャッシュのインベントリを表示する。 |
| `--[no-]stats` | 実行サマリー（ファイル数、クラス数、メモリ、経過時間）をstderrに表示する。デフォルトはオン。 |
| `--workers=N` | `N`個のRactorワーカーに解析を分散する。デフォルトは`0`（逐次処理）。 |
| `--baseline=PATH` | 設定を上書きしてベースラインファイルを読み込む。 |
| `--no-baseline` | 設定されたベースラインを無視する。 |
| `--baseline-strict` | ベースラインのドリフトで実行を失敗させる——CIゲートとして使用。 |
| `--tmp-file=PATH --instead-of=PATH` | エディタモード: `--tmp-file`のバッファを使って`PATH`を解析する。両方必須。 |

エラー重要度の診断がない場合は`0`で終了、診断がある場合は`1`で終了、使用法エラーの場合は`64`で終了します。

## `rigor init`

スターター設定ファイルを書き出します。

```sh
rigor init [--path=PATH] [--force]
```

デフォルトでは`.rigor.dist.yml`を書き出します。`--path`で別のターゲットを指定し、`--force`で既存ファイルを上書きします。`--force`なしでファイルが存在する場合は`1`で終了します。

## `rigor annotate`

ファイルを再表示し、各行に評価する式の型を末尾の`#=> dump_type:`コメントとしてタグ付けします。[推論型の検査](../05-inspecting-types/)を参照してください。

```sh
rigor annotate [--no-color] [--config=PATH] FILE
```

`FILE`は必須です。カラーはttyの場合に自動検出され、`NO_COLOR`を尊重します。`--color` / `--no-color`で上書きできます。パースエラーやファイル不在の場合は`1`で終了します。

## `rigor type-of`

1つのソース位置の推論型を表示します。

```sh
rigor type-of FILE:LINE:COL
rigor type-of FILE LINE COL
```

位置は単一の`file:line:col`トリプルまたは3つの引数として受け付けます。`--format=json`はマシン可読な形式を出力し、`--trace`はフェイルソフトフォールバックを記録します。`check`と同様にエディタモードの`--tmp-file` / `--instead-of`ペアも受け付けます。

## `rigor type-scan`

パス全体の`type_of`推論カバレッジを報告します——診断器自体の診断で、クラスの推論が不良な理由を調査するときに役立ちます。

```sh
rigor type-scan PATH...
```

`--limit=N`は表示例の上限を設定し（デフォルト10）、`--show-recognized`は完全にカバーされたクラスを含め、`--threshold=RATIO`は未認識ノードの割合が`RATIO`を超えた場合にコマンドをゼロ以外で終了させます。

## `rigor explain`

診断ルールのカタログエントリを表示します。引数なしで呼び出すとすべてのルールを一覧表示します。

```sh
rigor explain [rule]
```

`rule`はルールID（`call.undefined-method`）、レガシーエイリアス、またはファミリーワイルドカード（`call`、`flow`、`def`、`assert`、`dump`）です。`--format=json`が利用可能です。不明なルールの場合は`64`で終了します。

## `rigor diff`

現在の診断を保存済みベースラインJSONと比較し、新しいものだけを報告します。

```sh
rigor diff <baseline.json> [paths...]
```

`--current=PATH`は新規チェックを実行する代わりに保存済み診断JSONと比較します。新しい診断が現れた場合は`1`で終了します。

## `rigor sig-gen`

Rubyソースから推論したRBSシグネチャを出力します。分類モデルと`--params`ポリシーについては[ハンドブック第11章](../../handbook/11-sig-gen/)を参照してください。

```sh
rigor sig-gen [paths]
```

| オプション | 説明 |
| --- | --- |
| `--print` | RBSをstdoutに書き出す。デフォルト。 |
| `--diff` | 既存RBSに対するunified diffを書き出す。 |
| `--write` | RBSを`sig/<path>.rbs`ファイルに書き出す。 |
| `--overwrite` | より厳密な戻り値の更新でユーザー作成のRBSを置き換えることを許可する。 |
| `--include-private` | privateおよびprotectedメソッドも出力する。 |
| `--params=untyped|observed|observed-strict` | パラメーター型付けポリシー。デフォルトは`untyped`。 |
| `--observe=PATH` | コールサイト観察のために`PATH`をスキャンする。繰り返し可能。 |
| `--new-files` / `--new-methods` / `--tighter-returns` | その分類のみ出力する。 |
| `--format=text|json` | 出力形式。 |

## `rigor lsp`

stdioでランゲージサーバーを実行します。[エディタ統合](../09-editor-integration/)を参照してください。

```sh
rigor lsp [--transport=stdio] [--log=PATH] [--config=PATH]
```

`stdio`はv1で唯一のトランスポートです。`--log=PATH`はワイヤーログをstderrの代わりにファイルに書き出します。

## `rigor baseline`

診断ベースラインを管理します。ファイル形式とワークフローについては[ベースライン](../06-baseline/)を参照してください。

```sh
rigor baseline <generate|regenerate|dump|drift|prune> [options]
```

| サブコマンド | 目的 |
| --- | --- |
| `generate` | 現在の診断から新しいベースラインを書き出す。`--force`なしで上書きを拒否する。 |
| `regenerate` | 無条件にベースラインを書き直す——品質改善後に使用する。 |
| `dump` | ベースラインの内容を表示する。`--rule`と`--file`でフィルタリング可能。 |
| `drift` | 各バケットのドリフトを監査する。`--only=within|over|cleared|reducible`でフィルタリング。 |
| `prune` | 診断に一致しなくなったバケットを削除する。`--dry-run`でプレビュー。 |

`generate`と`regenerate`は`--output=PATH`と`--match-mode=rule|message`を受け付けます。

## `rigor triage`

生のリストをダンプする代わりに、診断ストリームを要約します——ルール分布、ファイルごとのホットスポット、ヒューリスティックな「なぜ」のヒント。[ベースライン](../06-baseline/)を参照してください。

```sh
rigor triage [paths]
```

`--top=N`はホットスポット数を設定し（デフォルト10）、`--hints-only`と`--no-hints`は表示するセクションを選択します。`triage`は参考情報であり、常に`0`で終了します——ビルドをゲートすることはありません。

## 終了コード

| コード | 意味 |
| --- | --- |
| `0` | 成功 — エラー重要度の診断なし。 |
| `1` | 診断あり、またはコマンド固有のエラー（パースエラー、ファイル不在、`diff`での新規診断）。 |
| `64` | 使用法エラー — 不明なコマンド、不正なフラグ、不正な引数。 |

`rigor triage`は例外で、参考情報であり常に`0`で終了します。
