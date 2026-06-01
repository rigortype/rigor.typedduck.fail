---
title: "CLIコマンドリファレンス"
description: "rigortype/rigor docs/manual/02-cli-reference.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/02-cli-reference.md"
sourcePath: "docs/manual/02-cli-reference.md"
sourceSha: "30dc219f37481e66085b94e32618edc37fd3b2c646dda432fcff40a58e9bb1c7"
sourceCommit: "db8d01bf94926a72e6a2aaf15639d1591b7e142e"
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
| `--baseline=PATH` | 設定を上書きしてベースライン（baseline）ファイルを読み込む。 |
| `--no-baseline` | 設定されたベースラインを無視する。 |
| `--baseline-strict` | ベースラインのドリフトで実行を失敗させる——CIゲートとして使用。 |
| `--treat-all-as-inline-rbs` | `rigor-rbs-inline`を`require_magic_comment: false`で強制ロードし、解析されるすべてのファイルを`# rbs_inline: enabled`コメントなしでインラインRBSとして扱う（ADR-32）。 |
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

診断ルールのカタログエントリーを表示します。引数なしで呼び出すとすべてのルールを一覧表示します。

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
| `--params=untyped|observed|observed-strict` | パラメータ型付けポリシー。デフォルトは`untyped`。 |
| `--observe=PATH` | コールサイト観察のために`PATH`をスキャンする。繰り返し可能。 |
| `--new-files` / `--new-methods` / `--tighter-returns` | その分類のみ出力する。 |
| `--format=text|json` | 出力形式。 |

## `rigor lsp`

stdioで言語サーバーを実行します。[エディタ統合](../09-editor-integration/)を参照してください。

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

## `rigor coverage`

型精度カバレッジ — 精密な型に解決する呼び出しサイトと`Dynamic`へフォールバックする呼び出しサイトの比率 — を報告します。「Rigorが実際にどれだけ推論しているか」の品質ゲートです。

```sh
rigor coverage [paths]
```

`--format=text|json`が出力形式を選び、`--config=PATH`が設定探索をオーバーライドします。`--threshold=RATIO`は精度比率が`RATIO`（`0.0`〜`1.0`）を下回ると`1`で終了し、CIゲートになります。

## `rigor mcp`

RigorのMCP（Model Context Protocol）サーバーをstdio上で実行し、AIコーディングアシスタントがRigorツールを直接呼び出せるようにします。[MCPサーバー](../10-mcp-server/)を参照してください。

```sh
rigor mcp [--transport=stdio] [--config=PATH]
```

`stdio`が唯一のトランスポートです。サーバーは純Ruby製のJSON-RPC 2.0実装で、7つの読み取り専用ツール（`rigor_check`、`rigor_type_of`、`rigor_triage`、`rigor_annotate`、`rigor_sig_gen`、`rigor_explain`、`rigor_coverage`）を公開します。

## `rigor lsp`対`rigor mcp`

`lsp`はエディタへLanguage Server Protocolを話し;`mcp`はAIアシスタントへModel Context Protocolを話します。両方ともstdio上で動き、同じ解析エンジンをラップします。

## `rigor plugins`

`.rigor.yml`に設定された各プラグインの有効化状態 — ロード済み、ロードエラー（理由付き）、各プラグインの宣言した拡張サーフェス（surface） — を報告します。[プラグイン](../07-plugins/)を参照してください。

```sh
rigor plugins [--format=text|json] [--strict] [--config=PATH]
```

`--strict`なしでは常に`0`で終了し、`--strict`では1つでもプラグインのロードに失敗すると`1`で終了します（CIゲート）。単数形の`rigor plugin`と混同しないこと。

## `rigor plugin`

ツールチェーンにバンドルされたプラグインのオンディスクのソースをブラウズし、自前のプラグインを著作する際に本物の動作するプラグインを作業例として読めるようにします。

```sh
rigor plugin <list|path|print|root> [name]
```

| サブコマンド | 目的 |
| --- | --- |
| `list` | バンドルされた各プラグイン・例の名前 + 絶対ディレクトリパスの表（サブコマンドなしのデフォルト）。 |
| `path <name>` | プラグインのディレクトリへの1行の絶対パス。 |
| `print <name>` | ヘッダー（dir / lib / sig / READMEパス）に続けてプラグインの主ソース本体をインライン展開。 |
| `root` | `rigortype` gemルートとその主要サブディレクトリ。 |

パスはgemの場所から実行時に解決されます（コンテナ / クロスファイルシステム構成では文書化された注意点）。

## `rigor playground`

ブラウザプレイグラウンド（リアルタイム診断付きのCodeMirrorエディタ）を起動します。別の`rigor-playground` gemが必要で、未インストールならインストールヒントを出力して`64`で終了します。

```sh
rigor playground
```

## `rigor skill`

`rigortype` gemの内部に出荷されたバンドル済みAgent Skillsを一覧・出力し、Rigorと並んでインストールされたAIコーディングエージェントが、プロジェクト側のソースチェックアウトなしにそれらを発見・追従できるようにします。[スキル](../08-skills/)を参照してください。

```sh
rigor skill <list|print|path> [name]
```

| サブコマンド | 目的 |
| --- | --- |
| `list` | バンドルされた各スキルの名前 + 絶対パスの表;サブコマンドなしのデフォルト。 |
| `print <name>` | `SKILL.md`本体をstdoutへ出力。スキルの`references/`ディレクトリを指すヘッダー付き。 |
| `path <name>` | 1行の絶対`SKILL.md`パスを出力。ファイル読み取りツールへの入力に適する。 |

## 終了コード

| コード | 意味 |
| --- | --- |
| `0` | 成功 — エラー重要度の診断なし。 |
| `1` | 診断あり、またはコマンド固有のエラー（パースエラー、ファイル不在、`diff`での新規診断）。 |
| `64` | 使用法エラー — 不明なコマンド、不正なフラグ、不正な引数。 |

`rigor triage`は例外で、参考情報であり常に`0`で終了します。
