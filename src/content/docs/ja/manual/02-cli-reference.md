---
title: "CLIコマンドリファレンス"
description: "rigortype/rigor docs/manual/02-cli-reference.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/02-cli-reference.md"
sourcePath: "docs/manual/02-cli-reference.md"
sourceSha: "f588e8d169a01bc5c59364bb0ad1580e6ce813a3cf37de67ac61116e1e3b5372"
sourceCommit: "321f7d04a39d2736e0c59c872dd4c587e370b3bc"
sourceDate: "2026-06-20T19:24:34+09:00"
translationStatus: "translated"
sidebar:
  order: 9002
---

Rigorのすべてのコマンドは単一の`rigor`実行ファイルのサブコマンドです:

```sh
rigor <command> [options] [arguments]
```

`rigor help`はコマンド一覧を表示し、`rigor version`はインストール済みバージョンを表示します。不明なコマンドや不正なオプションの場合、`64`で終了します。これは慣例的な「使用法エラー」コードです。

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
| `--format=FORMAT` | 出力形式。デフォルトは`text`。`json`（構造化ストリーム）のほか、CIネイティブな描画形式`sarif`、`github`、`gitlab`、`checkstyle`、`junit`、`teamcity`もある。[CIでのRigorの実行](../11-ci/)を参照。 |
| `--no-ci-detect` | CIの自動検出を無効化する。デフォルトでは`text`出力は実行中のCIのネイティブなアノテーション / ヒントも出力する（`RIGOR_CI_DETECT=0`も同じ効果）。[CIでのRigorの実行 § 自動検出](../11-ci/)を参照。 |
| `--explain` | フェイルソフトフォールバックイベントを`info`診断として表示する。 |
| `--no-cache` | この実行では永続キャッシュをスキップする。 |
| `--incremental` | 前回の実行以降に変更されたファイルと、それに依存するファイルだけを再解析し、残りはクロスプロセスのディスクスナップショットから提供する（ADR-46）。診断結果はフル実行と同一;設定 / gem / バージョンの変更（またはファイルの追加・削除）があれば透過的にフル再解析へ切り替わる。[キャッシュ](12-caching/)を参照。 |
| `--verify-incremental` | 受け入れゲート: インクリメンタルアナライザーをフルの`--no-cache`実行と突き合わせ、診断結果がバイト単位で同一であることを表明してから終了する（一致なら0、不一致なら差分の診断結果とともに1）。CIで`--incremental`が古い結果を決して提供しないことを保証するために使う。 |
| `--clear-cache` | 実行前にキャッシュディレクトリを削除する。 |
| `--cache-stats` | 終了時にオンディスクキャッシュのインベントリを表示する。 |
| `--[no-]stats` | 実行サマリー（ファイル数、クラス数、メモリ、経過時間）をstderrに表示する。デフォルトはオン。 |
| `--coverage` | 型精度カバレッジのブロックを出力に追加する（`--format json`では`coverage`オブジェクト、テキストモードでは1行のサマリー）。デフォルトではオフ。解析対象ファイルに対する2度目の精度パスであり、[`rigor coverage`](#rigor-coverage)が実行するのと同じスキャンなので、オプトインである。 |
| `--workers=N` | `N`個の並列ワーカープロセスに解析を分散する（現在はfork方式のプール、ADR-15）。デフォルトは`0`（逐次処理）。 |
| `--baseline=PATH` | 設定を上書きしてベースライン（baseline）ファイルを読み込む。 |
| `--no-baseline` | 設定されたベースラインを無視する。 |
| `--baseline-strict` | ベースラインのドリフトで実行を失敗させる。CIゲートとして使用。 |
| `--treat-all-as-inline-rbs` | `rigor-rbs-inline`を`require_magic_comment: false`で強制ロードし、解析されるすべてのファイルを`# rbs_inline: enabled`コメントなしでインラインRBSとして扱う（ADR-32）。 |
| `--bleeding-edge[=ids]` | この実行に対してbleeding-edgeオーバーレイを採用し、設定された[`bleeding_edge:`](03-configuration/)の選択を上書きする（ADR-50 § WD2）。引数なしではキューに積まれたすべてのfeatureを採用し、`--bleeding-edge=a,b`は名指ししたfeature idのみを採用する。本リリースではオーバーレイは空なので、現状ノーオペである。[`rigor show-bleedingedge`](#rigor-show-bleedingedge)で検査する。 |
| `--no-bleeding-edge` | この実行に対して設定された`bleeding_edge:`の選択を無視する（何も採用しない）。 |
| `--tmp-file=PATH --instead-of=PATH` | エディタモード: `--tmp-file`のバッファを使って`PATH`を解析する。両方必須。 |

エラー重要度の診断がない場合は`0`で終了、診断がある場合は`1`で終了、使用法エラーの場合は`64`で終了します。

## `rigor init`

スターター設定ファイルを書き出します。

```sh
rigor init [--path=PATH] [--force]
```

デフォルトでは`.rigor.dist.yml`を書き出します。`--path`で別のターゲットを指定し、`--force`で既存ファイルを上書きします。`--force`なしでファイルが存在する場合は`1`で終了します。

## `rigor annotate`

ファイルを再表示し、各行に評価する式の型を末尾の`#=>`コメントとしてタグ付けします。[推論型の検査](../05-inspecting-types/)を参照してください。

```sh
rigor annotate [--[no-]color] [--[no-]bat] [--config=PATH] FILE
```

`FILE`は必須です。カラーはttyの場合に自動検出され、`NO_COLOR`を尊重します。`--color` / `--no-color`で上書きできます。カラーが有効で[`bat`](https://github.com/sharkdp/bat)が`PATH`上にあるときはハイライトがbat経由になります（`--no-bat`でオプトアウト。`--bat`はbatが見つからない場合に警告して組み込みのカラライザーへフォールバックします）。パースエラーやファイル不在の場合は`1`で終了します。

## `rigor type-of`

1つのソース位置の推論型を表示します。

```sh
rigor type-of FILE:LINE:COL
rigor type-of FILE LINE COL
```

位置は単一の`file:line:col`トリプルまたは3つの引数として受け付けます。`--format=json`はマシン可読な形式を出力し、`--trace`はフェイルソフトフォールバックを記録します。`check`と同様にエディタモードの`--tmp-file` / `--instead-of`ペアも受け付けます。

## `rigor trace`

エンジンがファイルをどのように型付けしたかを、ターミナルアニメーションとして一歩ずつリプレイします。`rigor check`が実行するのと同じ推論をたどる、教育用のプローブです。

```sh
rigor trace [--delay=SECONDS] [--line=N] [--verbose] [--format=json] FILE
```

各フレームは、次に評価されるソース範囲をそのスコープのローカル変数とともにハイライトし、1つの推論の瞬間を描き出します。すなわち、スコープに入るローカル束縛（`bind`）、合流する分岐型（`union`）、解決される、あるいは`Dynamic[top]`へフェイルソフトする（`dispatch`）メソッドコールです。ttyではキー押下でリプレイが進みます（`q`で終了）。`--delay`は自動再生します。`--verbose`はすべての式のenter / resultフレームを追加し、`--line=N`は1行上のイベントだけを残し、`--format=json`はツールや教材向けに生のイベントストリームを出力します。[推論型の検査](../05-inspecting-types/)を参照してください。

## `rigor type-scan`

パス全体の`type_of`推論カバレッジを報告します。診断器自体の診断で、クラスの推論が不良な理由を調査するときに役立ちます。

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
| `--params=untyped\|observed\|observed-strict` | パラメータ型付けポリシー。デフォルトは`untyped`。 |
| `--observe=PATH` | コールサイト観察のために`PATH`をスキャンする。繰り返し可能。 |
| `--new-files` / `--new-methods` / `--tighter-returns` | その分類のみ出力する。 |
| `--format=text\|json` | 出力形式。 |

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
| `regenerate` | 無条件にベースラインを書き直す。品質改善後に使用する。 |
| `dump` | ベースラインの内容を表示する。`--rule`と`--file`でフィルタリング可能。 |
| `drift` | 各バケットのドリフトを監査する。`--only=within\|over\|cleared\|reducible`でフィルタリング。 |
| `prune` | 診断に一致しなくなったバケットを削除する。`--dry-run`でプレビュー。 |

`generate`と`regenerate`は`--output=PATH`と`--match-mode=rule|message`を受け付けます。

## `rigor triage`

生のリストをダンプする代わりに、診断ストリームを要約します。すなわち、ルール分布、**クラス／メソッドセレクタ**、ファイルごとのホットスポット、ヒューリスティックな「なぜ」のヒントです。[ベースライン](../06-baseline/)を参照してください。

```sh
rigor triage [paths]
```

`--top=N`はホットスポット数を設定し（デフォルト10）、`--hints-only`、`--selectors-only`、`--no-hints`は表示するセクションを選択します。`triage`は参考情報であり、常に`0`で終了します。ビルドをゲートすることはありません。

**`selectors`**セクションは（クラス,メソッド）軸です。診断が運ぶ構造化された`receiver_type` / `method_name`フィールドを`{receiver, method, count, files, rules}`の行に集約するので、メッセージ本文を解析することなく「どのメソッドに診断が集中しているか？」を問えます。`--format json`では、正規化されたレシーバークラス（リテラルはそのクラスに畳み込まれる）をキーとして全リストが出力され、`jq`クエリにそのまま使えます:

```sh
# methods with diagnostics spread across ≥ 3 files (systemic clusters)
rigor triage --format json | jq '.selectors[] | select(.files >= 3)'
# everything Rigor flagged on String receivers, by method
rigor triage --format json | jq '[.selectors[] | select(.receiver == "String")]'
```

同じ`receiver_type` / `method_name`フィールドは`rigor check --format json`の各診断にも載っており、（集約ではなく）サイトごとのグルーピングに使えます。

## `rigor coverage`

> `--protection`ティアの価値提案とワークフローガイドについては、[型保護カバレッジ](../15-type-protection-coverage/)を参照してください。本セクションはフラグリファレンスです。

型精度カバレッジ（精密な型に解決する呼び出しサイトと`Dynamic`へフォールバックする呼び出しサイトの比率）を報告します。「Rigorが実際にどれだけ推論しているか」の品質ゲートです。

```sh
rigor coverage [paths]
```

`--format=text|json`が出力形式を選び、`--config=PATH`が設定探索をオーバーライドします。`--threshold=RATIO`は精度比率が`RATIO`（`0.0`〜`1.0`）を下回ると`1`で終了し、CIゲートになります。

`--protection`は**型保護カバレッジ（type-protection coverage）**に切り替えます。「自分の型がどれだけ精密か」ではなく「バグを混入させたとき、Rigorがそれを捕捉できるか」を報告します。各ディスパッチサイト（明示的なレシーバーを持つ呼び出し）は、レシーバーが具象クラスに解決するとき（Rigorの呼び出しルールが誤ったメソッドや引数を捕捉できるサイト）*保護されている（protected）*とみなされ、レシーバーが`Dynamic`のとき*保護されていない（unprotected）*とみなされます。レポートはまず保護された比率を示し、続いてランク付けされた「ここに型を追加せよ（add a type here）」リスト（型のないレシーバーで最も多く呼ばれているメソッド）、そして最も保護されていないファイルを示します。`--threshold`と`--format=json`は同じように機能します。これは実際の保護に対する健全な上界です。具象的なレシーバーは診断が発火するための必要条件ですが、十分条件ではありません。

`--protection`に加えて`--mutation`を付けると、**有効性**ティアに切り替わります。「ここでRigorがバグを捕捉できるか」ではなく、Rigorが*実際に捕捉するか*を計測します。各ディスパッチサイトに型から見える破壊を導入し（呼び出し引数を`nil`に落とす、その型を入れ替える、呼び出しを存在しないメソッドへ改名する）、ミューテーションされたソースをクリーンなベースラインと突き合わせて再解析し、キルレート（捕捉された破壊）を報告します。デフォルトではgitで変更された`.rb`ファイルを対象とし（プロジェクト全体は数分かかる;広げるには明示的なパスを渡します）、まず有効性比率を示し、続いてRigorが見逃した破壊（「ここに型を追加せよ（add a type here）」）、そして最も有効性の低いファイルを示します。`--threshold`は有効性比率でゲートし、`--format=json`は`mode`、`killed`、`survived`、`effectiveness_ratio`、ファイルごとの行、そして`add_a_type_here`を運びます。これは静的な`--protection`プロキシの背後にある真実のティアであり、多数の解析というコストを伴います。対話的なチェックではなく、オプトインのCI深掘りです。

```sh
rigor coverage --protection --mutation [paths]
```

`--protection --mutation`に`--with-tests`を加えると、それは**融合静的∪動的（fused static∪dynamic）**ビューになります。型チェッカーが捕捉*しない*破壊ごとに、あなたのテストスイートを実行して**テスト**がそれを捕捉するかを確かめます。各サイトはその後、`type-protected`（型チェッカーが捕捉した）、`test-protected`（型チェッカーが見逃したものをテストが捕捉した）、`unprotected`（どちらも捕捉しない、実行可能な「ここに型**または**テストを足せ」リスト）に分類され、レポートはより安価な欠落軸を指摘します。型でキルされたミュータントはスイートに到達しない（漸進的短絡）ので、コストは保護穴に比例します。`--format=json`は`mode`（`protection-fused`）、`type_killed`、`test_killed`、`unprotected`、`protected_ratio`、ファイルごとの行、そして`add_protection_here`を運びます;`--threshold`は融合比率でゲートします。

`--test-command=CMD`はランナーフックです（デフォルトは`bundle exec rake`）。スイートはまずクリーンなコードでパスしなければならず、さもなければ実行は中断します。素のパス／フェイルのランナーへ向けてください（パスするスイートでも非ゼロ終了するカバレッジフロアがこれに引っかかります）。これはBundlerの環境を取り除いて実行されるので、Rigor自身がそれ自体のbundleの下で起動されたときでも、`bundle exec`コマンドはあなたのプロジェクトのbundleを解決します。環境ラッパーは不要です。コマンドは**シェルなし**で実行され（argvに分割されて直接実行される）、シェル構文は解釈されません（インラインの`BUNDLE_GEMFILE=… `プレフィックスを含めて）。デフォルトでないGemfileには、`bundle config set --local gemfile PATH`で設定する（`.bundle/config`に永続化されます）か、コマンドを`bash -c '…'`で包んでください。

`--include-dynamic`はオーバーレイを`Dynamic`レシーバー（型のない）サイトへ拡張します。そこではテストが唯一可能な保護です。マップを、Rigorが型チェックできるサイトだけでなく*すべての*ディスパッチサイトへと完成させます。そのようなサイトはどれも型生存者なので、スイートをはるかに多く実行します;明示的なオプトインです。

`--limit=N`（`--seed=N`付き、デフォルトは`1`）は計測をファイルごとの`N`個のミューテーションの決定的なサンプルに上限し、大きなファイルでのコストを抑えます。ファイルごとの比率はその後推定値となり、`--format=json`のstdoutがクリーンに保たれるようstderrに注記されます。

```sh
rigor coverage --protection --mutation --with-tests \
  --test-command "bundle exec rspec" --include-dynamic [paths]
```

## `rigor mcp`

RigorのMCP（Model Context Protocol）サーバーをstdio上で実行し、AIコーディングアシスタントがRigorツールを直接呼び出せるようにします。[MCPサーバー](../10-mcp-server/)を参照してください。

```sh
rigor mcp [--transport=stdio] [--config=PATH]
```

`stdio`が唯一のトランスポートです。サーバーは純Ruby製のJSON-RPC 2.0実装で、7つの読み取り専用ツール（`rigor_check`、`rigor_type_of`、`rigor_triage`、`rigor_annotate`、`rigor_sig_gen`、`rigor_explain`、`rigor_coverage`）を公開します。

## `rigor lsp`対`rigor mcp`

`lsp`はエディタへLanguage Server Protocolを話し;`mcp`はAIアシスタントへModel Context Protocolを話します。両方ともstdio上で動き、同じ解析エンジンをラップします。

## `rigor plugins`

`.rigor.yml`に設定された各プラグインの有効化状態（ロード済み、ロードエラー（理由付き）、各プラグインの宣言した拡張サーフェス（surface））を報告します。[プラグイン](../07-plugins/)を参照してください。

```sh
rigor plugins [--format=text|json] [--strict] [--capabilities] [--config=PATH]
```

`--strict`なしでは常に`0`で終了し、`--strict`では1つでもプラグインのロードに失敗すると`1`で終了します（CIゲート）。

`--capabilities`は**拡張プロトコルカタログ**（[ADR-37](../adr/37-plugin-interface-segregation/)）に切り替えます。これは、ロードされた各プラグインが何を提供するか（その`node_rule`がマッチするASTノード型、その`dynamic_return`がゲートするレシーバークラス、その`type_specifier`がナローイングするメソッド、そしてそれが`produces`／`consumes`するファクト）を集約した、焦点を絞った機械可読なマップです。ツール連携のために`--format=json`と組み合わせます（AIエージェントはプラグインのソースを1行も読まずに、すべてのプラグインの振る舞いを列挙できます）。同じ狭いサーフェスはデフォルトのフルレポートにも現れます。単数形の`rigor plugin`と混同しないこと。

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

位置引数は常にスキル *名* です。別形式の出力はフラグで指定するので、スキルが動詞に隠されることはありません。

```sh
rigor skill [<name>] [--path <name>] [--list] [--describe]
```

| 形式 | 目的 |
| --- | --- |
| （なし）/ `--list` | バンドルされた各スキルの名前 + 絶対パスの表。 |
| `<name>` | `SKILL.md`本体をstdoutへ出力。スキルの`references/`ディレクトリを指すヘッダー付き。 |
| `--path <name>` | 1行の絶対`SKILL.md`パスを出力。ファイル読み取りツールへの入力に適する。 |
| `--describe` | プロジェクトの状態（設定 / ベースライン / `sig/` / CI、存在の有無のみで、`rigor check`は決して実行しない）をプローブし、次に実行すべきスキルを推奨する。`describe`とも書け、トップレベルでは後述の[`rigor describe`](#rigor-describe)として前面に出してある。 |

`rigor skill list` / `print <name>` / `path <name>`という動詞表記は**非推奨**です（stderrに1行の通知を出し、v0.3.0で削除）——上記の形式を使ってください。`describe` / `--describe`は引き続き第一級です。

## `rigor describe`

[`rigor skill describe`](#rigor-skill)へのトップレベルエイリアスです。このプロジェクトに次に実行すべきスキルを推奨する、オンボーディングの入口です。素の`rigor describe`はほとんどのユーザーが最初に直感的に試す当て推量なので、それ自身のコマンドとして前面に出してあります（[ADR-73](../../adr/73-skill-driven-user-experience/) § WD2）。

```sh
rigor describe
```

存在の有無のみのプロジェクト状態プローブ（`.rigor.yml`、`.rigor-baseline.yml`、`sig/`ディレクトリ、CI統合は存在するか？）と、推奨される次のスキルを報告します。読み取り専用で副作用がなく、`rigor check`を決して実行しません。`rigor skill describe`と同一の出力です。

## `rigor docs`

`rigortype` gemに同梱されたドキュメントを**オフラインで**出力します。これにより、Rigorさえインストールされていれば、SKILL駆動のUXが案内するRigorを駆動するためのガイダンスを、AIコーディングエージェント（やあなた自身）がネットワークなしで読めます（[ADR-74](../../adr/74-offline-doc-access-and-llms-txt/)）。これは[`rigor skill`](#rigor-skill)のドキュメント版にあたります。gemは`docs/install.md`、`docs/llms.txt`、そしてユーザー向けの[マニュアル](../)と[ハンドブック](../../handbook/)一式を同梱しますが、貢献者向けのADR / 仕様 / 開発ノートのコーパスはサイト上のWeb限定のままです。

位置引数はドキュメント *名* です。別形式の出力はフラグで指定します。

```sh
rigor docs [<name>] [--path <name>] [--list [<category>]]
```

| 形式 | 用途 |
| --- | --- |
| （なし） | 同梱の`llms.txt`オフラインドキュメント索引（`rigor docs <name>`が提供できるものの一覧）を出力する。 |
| `<name>` | ドキュメントページを来歴コメント付きでstdoutに出力する。カテゴリ修飾パス（`handbook/03-narrowing`）、章のプレフィックス付き名（`02-cli-reference`）、短縮名（一意なときは`cli-reference`）、または`install`を受け付ける。 |
| `--path <name>` | ドキュメントの絶対パスを1行で出力する。ファイル読み取りツールへの入力に適する。 |
| `--list [<category>]` | 同梱されたすべてのドキュメントの表（名前＋絶対パス）。`manual`または`handbook`で絞り込める。 |

`rigor docs list` / `path <name>`という動詞表記は**非推奨**です（stderrに1行の通知を出し、v0.3.0で削除）——`--list` / `--path`を使ってください。

索引の正典となるWeb版は<https://rigor.typedduck.fail/llms.txt>です。`rigor docs`はインストール済みのgemから同じページをHTTPリクエストなしで提供します。

## `rigor show-bleedingedge`

**ブリーディングエッジオーバーレイ**（次のメジャーに向けてキューに積まれた診断規律のRigor管理セット。[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) § WD2）を表示し、そのうちどれをプロジェクトの[`bleeding_edge:`](../03-configuration/)設定が採用しているかを報告します。読み取り専用です。アクティブな選択を解決するために`.rigor.yml`を読み込みますが、解析は実行しません。

```sh
rigor show-bleedingedge [--config PATH] [--format text|json]
```

| フラグ | 目的 |
| --- | --- |
| `--config PATH` | 自動探索の代わりにこの`.rigor.yml`を使用する。 |
| `--format text\|json` | 出力形式。デフォルトは`text`。 |

オーバーレイは**このリリースでは空**です。機構は配線済みで準備が整っていますが、まだどの規律もメジャーに向けてキューに積まれていないため、コマンドは現在空のセットを報告します。機能がキューに積まれると、その安定したid、それが課す重要度、そしてあなたの設定がそれを採用しているかどうかとともに、ここに現れます。ブリーディングエッジが安定性モデルにどう収まるかは[`docs/compatibility.md`](../../compatibility/)を参照してください。

## 環境変数

ほとんどの振る舞いはフラグと`.rigor.yml`で制御されますが、いくつかの運用上のつまみは代わりに環境変数を読みます。

| 変数 | 効果 |
| --- | --- |
| `NO_COLOR` | 色付き出力を無効化する（`rigor annotate`が尊重する;`--no-color`も同じ）。 |
| `RIGOR_CI_DETECT=0` | CI自動検出をオフにする。`--no-ci-detect`と同じ。[CIでのRigor実行 § 自動検出](11-ci/)を参照。 |
| `RIGOR_RACTOR_WORKERS=N` | 並列解析のワーカー数。優先順位ではCLIフラグと設定キーの間に位置する: `--workers=N` > `RIGOR_RACTOR_WORKERS` > `parallel.workers:` > `0`（逐次）。 |
| `RIGOR_POOL_BACKEND=ractor` | アクティブなforkベースのプールの代わりに、（デフォルトでオフの）Ractorワーカープールに戻す（[ADR-15](../../adr/15-ractor-concurrency/)）。非ゼロのワーカー数のときのみ関係する;サポートされるバックエンドはforkプールである。 |
| `RIGOR_PLUGIN_ISOLATION=none\|process\|ruby_box` | プラグインがターゲットライブラリへ行う直接呼び出しをどう隔離するか。デフォルトは`process`。[プラグインの使用 § 隔離戦略](07-plugins/)を参照。`RIGOR_BOX`は`ruby_box`のレガシーエイリアス。 |

さらに3つの変数（`RIGOR_BUDGET_TRACE`、`RIGOR_HEAP_PROFILE`、`RIGOR_HEAP_TRACE`）は、Rigor自身の推論カットオフとメモリに関する開発者向けの診断を有効にします。[トラブルシューティング § 高度な診断](13-troubleshooting/#高度な診断)を参照してください。

## 終了コード

| コード | 意味 |
| --- | --- |
| `0` | 成功（エラー重要度の診断なし）。 |
| `1` | 診断あり、またはコマンド固有のエラー（パースエラー、ファイル不在、`diff`での新規診断）。 |
| `64` | 使用法エラー（不明なコマンド、不正なフラグ、不正な引数）。 |

`rigor triage`は例外で、参考情報であり常に`0`で終了します。
