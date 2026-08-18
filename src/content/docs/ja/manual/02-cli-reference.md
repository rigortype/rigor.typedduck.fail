---
title: "CLIコマンドリファレンス"
description: "rigortype/rigor docs/manual/02-cli-reference.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/02-cli-reference.md"
sourcePath: "docs/manual/02-cli-reference.md"
sourceSha: "f876faa4289f4b45415736cb31c3f90539cd4799b25b4f70a6cb54a8351cba50"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
sourceDate: "2026-07-25T21:39:13+09:00"
translationStatus: "translated"
sidebar:
  order: 9002
---

Rigorのすべてのコマンドは単一の`rigor`実行ファイルのサブコマンドです:

```sh
rigor <command> [options] [arguments]
```

`rigor help`はコマンド一覧を表示し、`rigor version`はインストール済みバージョンを表示します。不明なコマンドや不正なオプションの場合、`64`で終了します。これは慣例的な「使用法エラー」コードです。

プロジェクト設定を読み込むすべてのコマンドは、自動探索の代わりに特定の設定ファイルを指すための`--config=PATH`も受け付けます（追加の効果がある箇所でのみ後述で明示します）。

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
| `--workers=N` | `N`個の並列ワーカープロセスに解析を分散する（現在はfork方式のプール、ADR-15）。デフォルトは`0`（逐次処理）。フル実行と同様に`--incremental`の再チェックにも適用される。 |
| `--baseline=PATH` | 設定を上書きしてベースライン（baseline）ファイルを読み込む。 |
| `--no-baseline` | 設定されたベースラインを無視する。 |
| `--baseline-strict` | ベースラインのドリフトで実行を失敗させる。CIゲートとして使用。 |
| `--treat-all-as-inline-rbs` | `rigor-rbs-inline`を`require_magic_comment: false`で強制ロードし、解析されるすべてのファイルを`# rbs_inline: enabled`コメントなしでインラインRBSとして扱う（ADR-32）。 |
| `--bleeding-edge[=ids]` | この実行に対してbleeding-edgeオーバーレイを採用し、設定された[`bleeding_edge:`](03-configuration/)の選択を上書きする（ADR-50 § WD2）。引数なしではキューに積まれたすべてのfeatureを採用し、`--bleeding-edge=a,b`は名指ししたfeature idのみを採用する。[`rigor show-bleedingedge`](#rigor-show-bleedingedge)で検査する。 |
| `--no-bleeding-edge` | この実行に対して設定された`bleeding_edge:`の選択を無視する（何も採用しない）。 |
| `--no-tolerated-effects` | [`effects.tolerated:`](../03-configuration/)が空であるかのようにエフェクトエンベロープをチェックする —— あなたの解消ポリシーの監査スイッチ（ADR-103）。裁定のみ: ラン、収集内容、キャッシュエントリーはどちらでも同一なので、これが再解析のコストになることはない。 |
| `--tmp-file=PATH --instead-of=PATH` | エディタモード: `--tmp-file`のバッファを使って`PATH`を解析する。両方必須。単独ではバッファ自身のファイルしか診断を出さない。プロジェクト全体を対象にするには`--incremental`を足す（下記参照）。 |

エラー重要度の診断がない場合は`0`で終了、診断がある場合は`1`で終了、使用法エラーの場合は`64`で終了します。

### エディタモードの対象範囲

`--tmp-file` / `--instead-of`だけでは、解析されるのはバッファのファイル**のみ**です。高速ですが、未保存の編集がプロジェクトの他の部分に何をするかは見えません。

`--incremental`を加えると、**バッファを差し替えたプロジェクト全体**が解析されます —— 編集されたファイルとそれに依存するファイルが再解析され、残りはインクリメンタルスナップショットから提供されます。したがってメソッドの戻り値型に対する未保存の変更は、編集中のファイルだけでなくその呼び出し元にも表面化します。

知っておくべきことが2つあります:

- 再利用できるスナップショットが必要です。`rigor check --incremental`を一度実行しておけば（これは通常のターミナルでのチェックでも使うべきものです）、以降のエディタからの起動はプロジェクト全体を対象にできます。スナップショットがない場合、Rigorはstderrにその旨を伝え、バッファ単独で解析します。
- エディタモードの実行がスナップショットを書くことはありません —— バッファのバイト列はあなたのエディタの中にしか存在せず、それを記録すると次の通常実行が、実際には存在しなかった状態のファイルをすでに解析したと信じ込んでしまうからです。

`--verify-incremental`はバッファを拒否します。これはディスク上のファイルのフル解析と突き合わせるものであり、バッファは構造上それと矛盾するからです。

## `rigor init`

スターター設定ファイルを書き出します。

```sh
rigor init [--path=PATH] [--force]
```

デフォルトでは`.rigor.dist.yml`を書き出します。`--path`で別のターゲットを指定し、`--force`で既存ファイルを上書きします。`--force`なしでファイルが存在する場合は`1`で終了します。

## `rigor annotate`

ファイルを再表示し、各行に評価する式の型を末尾の`#=>`コメントとしてタグ付けします。[推論型の検査](../05-inspecting-types/)を参照してください。

```sh
rigor annotate [--[no-]color] [--[no-]bat] [--format=text|json] [--config=PATH] FILE
```

`FILE`は必須です。カラーはttyの場合に自動検出され、`NO_COLOR`を尊重します。`--color` / `--no-color`で上書きできます。カラーが有効で[`bat`](https://github.com/sharkdp/bat)が`PATH`上にあるときはハイライトがbat経由になります（`--no-bat`でオプトアウト。`--bat`はbatが見つからない場合に警告して組み込みのカラライザーへフォールバックします）。`--format=json`はアノテーション付きソースの代わりに`{ line => type }`のマップを出力します。パースエラーやファイル不在の場合は`1`で終了します。

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

`--limit=N`は表示例の上限を設定し（デフォルト10）、`--show-recognized`は完全にカバーされたクラスを含め、`--threshold=RATIO`は未認識ノードの割合が`RATIO`を超えた場合にコマンドをゼロ以外で終了させます。`--format=text|json`で出力形式を選択します。

## `rigor effects`

各メソッドが何を返すかではなく*何をするか* —— そのエフェクトラベル —— を報告し、ドリフトをゲートするコミット対象の**エフェクトスナップショット**を管理します。オプトインかつ観測的です: ここにあるものは何も診断を発しませんし`rigor check`の出力も変えません。非ゼロで終了するのは`rigor effects check`だけです。

```sh
rigor effects [PATH...]                       # the report
rigor effects {update,check,diff,explain}     # the snapshot
```

パスなしなら、レポートは設定済みの`paths:`を解析します。`.rigor.yml`に`effects:`ブロックがなくてもエフェクト収集を有効にして走るので、何も設定する前に試せます;そのようなアドホックなランは`rigor check`とキャッシュを共有しません。そのキャッシュから供給されるランは何も収集していなかったはずだからです。

各行はメソッド1つで、キー順にソートされます:

```
Tracer::Reporter#report: [io.output.stdout, nondet.time]
Tracer::Gateway#fetch: [] …?
    dynamic-receiver (external_gem_without_rbs)
```

ラベルは**推移的**なフットプリントです —— メソッド自身のものに加えて、到達するすべてのプロジェクトメソッドのもの。` …?`サフィックスはリストが網羅的でないことを意味します: どこかの呼び出しが解決できなかったので、読み方は「これらのエフェクト、そしておそらくそれ以上」です。インデントされた行がその理由を述べます。汚染は決して指摘ではありません。

ラベルの後の` ≤ [...]`節は**宣言**レーンです: Rigorが信頼はするが検証はしていないソースが、そのメソッドがすると*主張する*もの —— 今日では、Rigorに見えないgemメソッドについてあなたが書いた`effects.attribution:`テーブルです。証明されたラベルとは別に印字され、決してその中に畳み込まれません。2つは異なる問いに答えるからです。証明されたラベルとまったく同じに呼び出しエッジをたどるので、帰属付きgem呼び出しの2ホップ上のコントローラーは「おそらくそれ以上」だけでなく主張を運びます;証明済みリストが既にカバーする宣言ラベルは二重には印字されません。

```
Gateways::Client#fetch: [] ≤ [io.net.http] …?
    plugin-attribution (Acme::Http.get)
```

メソッドは、網羅的で`mutate.local` —— 自身のフレームが確保して決して外に出さないオブジェクトの変更で、あらゆるエフェクトエンベロープが許容するもの —— 以外を何も証明しないとき省略されます。`--full`は代わりにすべてのメソッドを列挙します。

`--format=text|json`は出力形式を選びます;JSONペイロードは追加で、各メソッドの*直接*サマリーを起点ごとに分解して運びます。`--config=PATH`は設定ファイルを選びます。`--no-tolerated-effects`はサブコマンドとの対称性のために受け付けられますが、ここでは何もしません: レポートは観測であり、観測は解消されないものだからです。

何が収集され、どう伝播するかは[エフェクトサマリー内部仕様](../../internal-spec/effect-summaries/)に;ラベルのボキャブラリーは[エフェクトラベル仕様](../../type-specification/effect-labels/)にあります。

### エフェクトスナップショット

4つのサブコマンドが、Rigorが観測したエフェクトのコミット対象の記録 —— `.rigor-effects.yml`、`db/schema.rb`のエフェクト版 —— を管理します:

```sh
rigor effects update    # write the snapshot; commit it
rigor effects check     # 0 fresh, 1 drift — the CI gate
rigor effects diff      # the same comparison, never gating
rigor effects explain   # why an entry point reaches a label
```

レポートと違い、サブコマンドはパスを取りません: スナップショットはプロジェクト全体を記録するもので、サブセットに対して書かれたものは他のすべてのメソッドが消えたプロジェクトとして読めてしまいます。すべて`--config=PATH`・`--format=text|json`・`--full`を受け付けます;`check`・`diff`・`explain`は追加で`--baseline=PATH`（設定されたもの以外のファイルと比較する —— botでの`--baseline <(git show origin/main:.rigor-effects.yml)`）、`--strict-tolerated`、`--no-tolerated-effects`を受け付けます。

ファイルは2つのテーブルを記録します。`methods:`は各メソッドの**直接**サマリー —— ブロックリテラルとカタログ化された呼び出し先を含む、自身の本体がすること。ただし呼び出すプロジェクトメソッドがすることは含まない —— を保持します。これは意図的です: エントリーは自身の行が変わったときにだけ動くので、diffはそれを引き起こしたプルリクエストに帰属可能なままです。`reach:`は`effects.snapshot.reach:`が名指しするエントリポイントにおける**推移的**フットプリントを保持し、そこではリーフの変更が扇状に広がることになっています —— その扇状の広がりが影響範囲です。

```yaml
# .rigor-effects.yml — generated by `rigor effects update`. Commit it; review its diff.
schema: 1
rigor: "0.3.3"
vocabulary: 1
config_digest: "9ec82bfc…"
methods:
  "PaymentGateway#charge":
    effects: ["io.net.http", "telemetry"]
  "Reports::Nightly#perform":
    effects: ["io.db.read"]
    exhaustive: false
    unresolved: ["dynamic-send"]
reach:
  "OrdersController#create":
    effects: ["io.db.read", "io.net.http", "job.enqueue"]
```

メソッドは、網羅的で`mutate.local`以外を何も証明しないとき、サマリーが合成されたアクセサのものであるとき、そしてどちらのレーンにもラベルを運ばないときに省かれます —— 「網羅的ではない、理由はこれ」としか言わない行は、コミット対象の記録よりも`rigor effects`と`rigor effects explain`のほうがうまく答えるものです。`--full`はすべてを記録します。ヘッダーはRigorとボキャブラリーのバージョン、そしてあなたの`effects:`ブロックのダイジェストを運ぶので、アップグレードやポリシーの編集は、静かな再解釈ではなく*再生成イベント*として現れます。

`methods:`の下では、宣言レーンはそのメソッド自身の本体が主張するものです;`reach:`の下では、隣の証明済みラベルと同様、推移的な主張です。

`check`は差異1つにつき1行を印字します: 証明レーンには`+ label` / `- label`、宣言レーンには`≤+` / `≤-`、宣言ラベルが証明済みになれば`materialised`、誰かがRigorのたどれない呼び出しを持ち込めば`exhaustive → not`、そしてメソッドの出現・消失には`+symbol` / `-symbol`（リネームはそれぞれ1つずつで、フッターで数えられます）。もはや網羅的でないサマリーから読み取った削除は、留保付きで印字されます —— 「おそらくそれ以上」は不在を証明できません。

`effects.snapshot.gate:`が何を失敗とするかを決めます。`symmetric`（デフォルト）はあらゆるドリフトで失敗します: エンキューをやめたジョブもニュースです。`additions`はラチェットです —— 増加だけが失敗します。`effects.tolerated:`は裁定時に適用され、書き込み中には決して適用されません: 許容ラベルに閉じた差異は`tolerated:`見出しの下に印字され、`--strict-tolerated`を渡さない限りゲートを失敗させません。`--no-tolerated-effects`はリストが空であるかのように裁定します;`update`では何も変えません。記録自体が解消されないものだからです。

解消はラベルごとではなく**起点ごと**に働きます。`Logger#info`は`io`と`telemetry`を一緒に運ぶので、`tolerated: [telemetry]`はロギングに伴ってきた`io`を免除し —— そして2行下の`File.read`に由来する`io.fs.read`はそのままの位置に残します。追加されたラベルは、それを持ち込むすべての起点が解消されたときにだけ解消されます。

### エフェクトドリフトのレビュー

初日に`rigor effects update`を走らせ、結果をコミットしてください。あなたがコミットするdiffはチームの最初の地図です: どのコントローラーがネットワークに到達し、どのジョブが書き込み、どのプレゼンターがクエリするか。

CIに`rigor effects check`を追加してください。それ以降、コードが*すること*を変えるプルリクエストは、理由を明記してこれを失敗させます:

```
Effect drift against .rigor-effects.yml:

methods:
  PaymentGateway#charge  + io.net.http

reach:
  OrdersController#create  + io.net.http

Run `rigor effects update` and commit the result if this change is intended.
```

作者は`rigor effects explain`を走らせて経路を見て ——

```
reach:
  OrdersController#create → OrderService#place → PaymentGateway#charge → Net::HTTP.get [io.net.http]
```

—— それから`rigor effects update`を走らせ、再生成されたファイルをコミットします。**意図は再生成されたスナップショットをコミットすることで表明されます**。コードにアノテーションを付けることによってではありません;レビュアーはコード変更と並べて2行のdiffを読み、うなずくか押し返すかします。自前のコードdiffなしにエフェクトを動かすバンドル更新も同じように働き、まさに見る価値のあるケースです。

これらのどれも診断ではありません。`rigor check`の出力と終了コードはスナップショットを使おうと使うまいと同一で、ドリフトは決して指摘ではありません: それが*重要か*どうかはレビュアーの判断であり、それがこれをレビュー成果物たらしめています。

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

各シグネチャは出力される前にパースされます。生成されたRBSがパースできないメソッドは**スキップ**され（`sig.skipped.unrenderable-rbs`）、書き出される代わりにstderrへ報告されます——パースできない`.rbs`は`rigor check`によって*丸ごと*隔離されるため、1つの不正な行がファイル内の他のすべての型を道連れにしてしまうからです。`--write`では、組み立てたコンテンツがパースできないファイルは**拒否され**（既存のファイルは変更されないまま残ります）、コマンドは`1`で終了します。書き込みを求めたのに得られなかった、というわけです。このようなスキップはあなたのコードではなくRigorのRBSレンダリングのバグです——報告してください。

## `rigor lsp`

stdioで言語サーバーを実行します。[エディタ統合](../09-editor-integration/)を参照してください。

```sh
rigor lsp [--transport=stdio] [--log=PATH] [--config=PATH]
```

`stdio`はv1で唯一のトランスポートです。`--log=PATH`は受理されますが、本リリースではまだ接続されていません。サーバーのワイヤーログをファイルへ振り向けるために予約されており、それまではログはstderrに出ます。

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

`generate`と`regenerate`は`--output=PATH`と`--match-mode=rule|message`を受け付けます。`dump`・`drift`・`prune`は非既定のベースラインファイルを読むための`--baseline=PATH`を受け付けます。

## `rigor triage`

生のリストをダンプする代わりに、診断ストリームを要約します。すなわち、ルール分布、**クラス／メソッドセレクタ**、ファイルごとのホットスポット、ヒューリスティックな「なぜ」のヒントです。[ベースライン](../06-baseline/)を参照してください。

```sh
rigor triage [paths]
```

`--top=N`はホットスポット数を設定し（デフォルト10）、`--hints-only`、`--selectors-only`、`--no-hints`は表示するセクションを選択します。`triage`は参考情報であり、常に`0`で終了します。ビルドをゲートすることはありません。

デフォルトでは、distribution・selectors・hotspotsセクションは**actionable**な診断（`error` + `warning`）のみをカウントします。`info`診断はこれらのボリュームビューから除外されます。Railsプロジェクトではプラグインのrecognition trace（`Account.find resolves to Account`、`users_path → GET /users`）が大半を占め、それらは「Rigorが解決した」という肯定的な記録であって、本来のシグナルを埋もれさせ、hotspotランキングを最も働いているコードを持つファイルへと歪めてしまうためです。サマリー行は完全な`info`カウントを報告し続け、ヒューリスティックのヒントは依然すべての診断を見ます（そのため`gem-without-rbs`のnoticeは生き残ります）。`--include-info`を渡すと`info`もボリュームビューに含めます。

**`selectors`**セクションは（クラス,メソッド）軸です。診断が運ぶ構造化された`receiver_type` / `method_name`フィールドを`{receiver, method, count, files, rules}`の行に集約するので、メッセージ本文を解析することなく「どのメソッドに診断が集中しているか？」を問えます。`--format json`では、正規化されたレシーバークラス（リテラルはそのクラスに畳み込まれる）をキーとして全リストが出力され、`jq`クエリにそのまま使えます:

```sh
# methods with diagnostics spread across ≥ 3 files (systemic clusters)
rigor triage --format json | jq '.selectors[] | select(.files >= 3)'
# everything Rigor flagged on String receivers, by method
rigor triage --format json | jq '[.selectors[] | select(.receiver == "String")]'
```

同じ`receiver_type` / `method_name`フィールドは`rigor check --format json`の各診断にも載っており、（集約ではなく）サイトごとのグルーピングに使えます。

## `rigor unused`

到達可能な何ものも参照していないプロジェクト定数を報告します —— デッドコード削除の出発点です。

```sh
rigor unused [paths] --entry-point='lib/cli.rb'
```

**出力は欠陥リストではなくレビューキューとして読んでください**。手で裁定したコーパスターゲットでは、**本当に未使用だった行はわずか7%**で、残りは静的解析には見えない手段で到達可能でした。だからこれは別コマンドであり、決して`rigor check`の診断ではありません —— [ADR-102](../../adr/102-unused-code-reachability-report/)を参照。

到達可能性は参照を数えるのではなく**ルート**から計算されるので、互いにしか参照し合わないクラスのクラスタも依然として報告されます。ルートは、`--entry-point=GLOB`（繰り返し可）にマッチするファイル内の宣言、非テストコードがファイルレベルで参照する何か、そしてプロジェクトの**プラグイン**が貢献する何かです。

プラグイン供給のルートは、フレームワークの知識が入ってくる場所です。Railsのコントローラーはリクエスト時に名前で到達されるので、プロジェクトの何もそれを参照せず、参照インデックスは生きたコントローラーと死んだものを区別できません。`rigor-rails-routes`は`config/routes.rb`を静的に読み、ディスパッチ先のすべてのコントローラーを名指しすることでこれを塞ぎます —— Railsの起動はなく、条件分岐の下に書かれたルート（`get "/beta", to: "beta#index" if ENV["BETA"]`）も、起動済みアプリのルートテーブルなら示さないところで見えます。2つのRailsコーパスターゲットでは、これが候補リストの56%と84%を取り除きました。

`rigor unused`は`rigor check`のランが使うのと同じ`plugins:`をロードし、そこから来たルートの数を印字します:

```
  roots:                    404 (288 from plugins, 0 matched no declaration)
```

`matched no declaration`は、プラグインが主張したがこのプロジェクトが宣言していない数です —— 通常は`Rails::HealthController`のようなフレームワーククラス。ゼロから離れて増えていく数字は、ルートソースがコードと歩調を外れてドリフトしたことを意味し、それが重要なのは、過剰に主張するルートソースは死んだコードを黙って*隠す*からです。Rigorがプラグインを持たないフレームワークはルートを供給しないので、そのコントローラーは依然として候補として読めます。

`rigor-pundit`は第2の種類のルートを供給します: ポリシークラスは`authorize @post`から`PostPolicy`として到達されますが、この名前はソースのどこにも現れません。これは、あなたの認可呼び出しが実際に名指しするポリシーを公開します —— `app/policies`配下のすべてのクラスではありません。ファイルの場所は、何かがそれを認可の対象としている証拠ではないからです。

`rigor-sidekiq`は、ルートソースが持つ価値のあるものであるためにどれほど狭くなければならないかを示します。cronスケジュールで`class: "NightlyReportWorker"`と名指しされたワーカーはYAMLからエンキューされるので、その名前はコードのどこにも現れず死んでいるように読めます —— その名前がルートになります。同じ`sidekiq.yml`のキューリストはなりません: キュー名はクラス名ではなく、それをワーカー名へ活用変化させれば命名の偶然でクラスをルートにしてしまいます。

プラグインはルートではなく**参照**を貢献することもでき、`rigor-factorybot`がこの区別の存在理由です。`factory :user, class: "Admin::User"`は走査に見えない文字列でクラスを名指ししているので、それは使用の本物の証拠です —— しかしファクトリーはテストツリーに住んでいます。`test`ロールを運ぶ参照として供給されれば、そのクラスは候補リストを離れ*テストコードからのみ到達可能*の下に現れます;ルートとして供給されていたら本番到達可能に昇格し、より興味深い指摘が消えていたでしょう。

バンドルされたプラグインの大半は意図的に何も貢献しません。`MyJob.perform_later`、`MyMailer.welcome`、`MyWorker.perform_async`、`RSpec.describe User`はどれもクラス名を通常の定数として書いており、レポートはそれを既に記録しています —— specの場合は、上のセクションを可能にする`test`ロール付きで。各プラグインのページが、どちらを選びなぜそうしたかを述べています。

レポートがマージせずに分離するものが3つ:

- **テストコードからのみ到達可能**は独自のセクションを持ちます —— 自身のspecからのみ使われるクラスは、生きたテストを持つ死んだ本番コードで、どちらのバケツ単独よりも実行に移しやすい指摘です。
- **何かがランタイムに名指しできる定数**は理由付きで`cannot decide`セクションへ降格され、決して未使用とは主張されません。`"Foo".constantize`は`Foo`をちょうど名指しするので通常の参照として数えられます;`"Foo::#{key}".constantize`は代わりに`Foo`配下のすべてを決定不能とマークします。`.yml`・`.json`・テンプレートファイル内に文字列として現れるクラス名も同じように降格されます —— それは定数参照より弱い証拠なので、使用の証明でも死んでいると呼ぶ根拠でもありません。
- 生きたコードを包む**名前空間モジュール**は除外され数えられます。何も中間の名前空間そのものを参照しないからです。中身が*すべて*到達不能な名前空間は依然として報告されます。

そもそも報告されるのはクラスとモジュールの定数だけです;値定数はファイルをまたいで解決されないので省かれます。

参照は解析対象パスより広いファイル集合から収穫されます —— `.rake`タスク、`config/`、spec、プロジェクト自身の`sig/`はすべて参照として数えられます —— Rakeタスクからのみ使われる定数は死んでいないからです。

`--format json`は同じデータを発します;`--limit=N`は印字されるリストを切り詰めます。`--incremental`は拒否されます: 到達可能性はプロジェクト全体のランに対してのみ健全だからです。

## `rigor coverage`

> `--protection`ティアの価値提案とワークフローガイドについては、[型保護カバレッジ](../15-type-protection-coverage/)を参照してください。本セクションはフラグリファレンスです。

型精度カバレッジ（精密な型に解決する呼び出しサイトと`Dynamic`へフォールバックする呼び出しサイトの比率）を報告します。「Rigorが実際にどれだけ推論しているか」の品質ゲートです。

```sh
rigor coverage [paths]
```

`paths`はファイルまたはディレクトリです;省略すると、Rigorは設定ファイルの`paths:`リスト（デフォルト`lib`）を使います。[`rigor check`](#rigor-check)と同じです。

`--format=text|json`が出力形式を選び、`--config=PATH`が設定探索をオーバーライドします。`--threshold=RATIO`は精度比率が`RATIO`（`0.0`〜`1.0`）を下回ると`1`で終了し、CIゲートになります。

`--protection`は**型保護カバレッジ（type-protection coverage）**に切り替えます。「自分の型がどれだけ精密か」ではなく「バグを混入させたとき、Rigorがそれを捕捉できるか」を報告します。各ディスパッチサイト（明示的なレシーバーを持つ呼び出し）は、レシーバーが具象クラスに解決するとき（Rigorの呼び出しルールが誤ったメソッドや引数を捕捉できるサイト）*保護されている（protected）*とみなされ、レシーバーが`Dynamic`のとき*保護されていない（unprotected）*とみなされます。レポートはまず保護された比率を示し、続いてランク付けされた「ここに型を追加せよ（add a type here）」リスト（型のないレシーバーで最も多く呼ばれているメソッド）、そして最も保護されていないファイルを示します。`--threshold`と`--format=json`は同じように機能します。これは実際の保護に対する健全な上界です。具象的なレシーバーは診断が発火するための必要条件ですが、十分条件ではありません。`--workers=N`は保護スキャン（パラメータ推論の事前パスとファイルごとのスキャンの両方）をforkで並列化し、出力は逐次実行とバイト同一です;ワーカー数は`check`と同じ方法で解決されます —— `--workers` › `RIGOR_RACTOR_WORKERS` › [`parallel.workers:`](../03-configuration/) › `0`（逐次デフォルト）。

`--protection`に加えて`--mutation`を付けると、**有効性**ティアに切り替わります。「ここでRigorがバグを捕捉できるか」ではなく、Rigorが*実際に捕捉するか*を計測します。各ディスパッチサイトに型から見える破壊を導入し（呼び出し引数を`nil`に落とす、その型を入れ替える、呼び出しを存在しないメソッドへ改名する）、ミューテーションされたソースをクリーンなベースラインと突き合わせて再解析し、キルレート（捕捉された破壊）を報告します。デフォルトではgitで変更された`.rb`ファイルを対象とし（プロジェクト全体は数分かかる;広げるには明示的なパスを渡します）、まず有効性比率を示し、続いてRigorが見逃した破壊（「ここに型を追加せよ（add a type here）」）、そして最も有効性の低いファイルを示します。`--threshold`は有効性比率でゲートし、`--format=json`は`mode`、`killed`、`survived`、`effectiveness_ratio`、ファイルごとの行、そして`add_a_type_here`を運びます。これは静的な`--protection`プロキシの背後にある真実のティアであり、多数の解析というコストを伴います。対話的なチェックではなく、オプトインのCI深掘りです。`--workers=N`はこのティアもforkで並列化します（プロジェクト全体の事前パスは親で一度だけ支払われ、ファイルごとの計測がワーカーに分散されます）。優先順位の連鎖は同じで、出力もバイト単位で同一です。

```sh
rigor coverage --protection --mutation [paths]
```

`--protection --mutation`に`--with-tests`を加えると、それは**融合静的∪動的（fused static∪dynamic）**ビューになります。型チェッカーが捕捉*しない*破壊ごとに、あなたのテストスイートを実行して**テスト**がそれを捕捉するかを確かめます。各サイトはその後、`type-protected`（型チェッカーが捕捉した）、`test-protected`（型チェッカーが見逃したものをテストが捕捉した）、`unprotected`（どちらも捕捉しない、実行可能な「ここに型**または**テストを足せ」リスト）に分類され、レポートはより安価な欠落軸を指摘します。型でキルされたミュータントはスイートに到達しない（漸進的短絡）ので、コストは保護穴に比例します。`--format=json`は`mode`（`protection-fused`）、`type_killed`、`test_killed`、`unprotected`、`protected_ratio`、ファイルごとの行、そして`add_protection_here`を運びます;`--threshold`は融合比率でゲートします。このティアは常に逐次実行です —— スイートのフックがあなたのテストランナーへシェルアウトし、並行実行は1つの作業ツリーを取り合ってしまうため —— したがって`--workers`は適用されず、明示的に指定された場合はstderrで無視した旨が報告されます。

`--test-command=CMD`はランナーフックです（デフォルトは`bundle exec rake`）。スイートはまずクリーンなコードでパスしなければならず、さもなければ実行は中断します。素のパス／フェイルのランナーへ向けてください（パスするスイートでも非ゼロ終了するカバレッジフロアがこれに引っかかります）。これはBundlerの環境を取り除いて実行されるので、Rigor自身がそれ自体のbundleの下で起動されたときでも、`bundle exec`コマンドはあなたのプロジェクトのbundleを解決します。環境ラッパーは不要です。コマンドは**シェルなし**で実行され（argvに分割されて直接実行される）、シェル構文は解釈されません（インラインの`BUNDLE_GEMFILE=… `プレフィックスを含めて）。デフォルトでないGemfileには、`bundle config set --local gemfile PATH`で設定する（`.bundle/config`に永続化されます）か、コマンドを`bash -c '…'`で包んでください。

`--include-dynamic`はオーバーレイを`Dynamic`レシーバー（型のない）サイトへ拡張します。そこではテストが唯一可能な保護です。マップを、Rigorが型チェックできるサイトだけでなく*すべての*ディスパッチサイトへと完成させます。そのようなサイトはどれも型生存者なので、スイートをはるかに多く実行します;明示的なオプトインです。

`--limit=N`（`--seed=N`付き、デフォルトは`1`）は計測をファイルごとの`N`個のミューテーションの決定的なサンプルに上限し、大きなファイルでのコストを抑えます。ファイルごとの比率はその後推定値となり、`--format=json`のstdoutがクリーンに保たれるようstderrに注記されます。

再実行は、あるファイルの数値を変えうるものが何も動いていない限り、ファイルごとの計測キャッシュから提供されます: そのファイル自身、それが読み取っていると記録されたファイル、解決済みの設定、`sig/`、gemのセット、エンジンのバージョン、`--limit` / `--seed`、そして採用されたbleeding-edgeフィーチャーです。これは`rigor check --incremental`の実行が記録するクロスファイルのエッジを読むので、プロジェクトごとに一度ウォームしておいてください。使えるスナップショットがない場合は全ファイルが計測されます —— 黙って提供されることは決してありません。`--no-cache`はすべてを最初から計測します。そのどちらが起きたかは1行のstderrレポートが伝えます —— [型保護カバレッジ](../15-type-protection-coverage/)を参照してください。

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

ロードされた各プラグインの行は、解決された実際のロード元ファイルも報告します（テキストでは`path:`の行、JSONでは`"path"`キー）。そのため、古いインストール済みgemが新しいチェックアウトのバンドル済みプラグインコピーを覆い隠している場合、その不一致が一目で分かります。

```sh
rigor plugins [--format=text|json] [--strict] [--capabilities] [--config=PATH]
```

`--strict`なしでは常に`0`で終了し、`--strict`では1つでもプラグインのロードに失敗すると`1`で終了します（CIゲート）。

`--capabilities`は**拡張プロトコルカタログ**（[ADR-37](../adr/37-plugin-interface-segregation/)）に切り替えます。これは、ロードされた各プラグインが何を提供するか（その`node_rule`がマッチするASTノード型、その`dynamic_return`がゲートするレシーバークラス、その`narrowing_facts`がナローイングするメソッド、そしてそれが`produces`／`consumes`するファクト）を集約した、焦点を絞った機械可読なマップです。ツール連携のために`--format=json`と組み合わせます（AIエージェントはプラグインのソースを1行も読まずに、すべてのプラグインの振る舞いを列挙できます）。同じ狭いサーフェスはデフォルトのフルレポートにも現れます。単数形の`rigor plugin`と混同しないこと。

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

位置引数は常にスキル*名*です。別形式の出力はフラグで指定するので、スキルが動詞に隠されることはありません。

```sh
rigor skill [<name>] [--full <name>] [--path <name>] [--list] [--describe]
rigor skill describe [--deep]
```

| 形式 | 目的 |
| --- | --- |
| （なし）/ `--list` | バンドルされた各スキルの名前 + 絶対パスの表。 |
| `<name>` | `SKILL.md`本体をstdoutへ出力。スキルの`references/`ディレクトリを指すヘッダー付き。 |
| `--full <name>` | `SKILL.md`本体に**続けてすべての`references/*.md`をインラインで**出力する——完全でバージョン最新の手順を1回の呼び出しで。これはスキルの「まず: バージョン最新のコピーを読み込む」ディレクティブが指す先であり、プロジェクトにベンダリングされたコピー（例: `npx skills add`経由）が凍結されたコピーに従う代わりに、インストール済みgemから現行の手順を再取得できるようにする。 |
| `--path <name>` | 1行の絶対`SKILL.md`パスを出力。ファイル読み取りツールへの入力に適する。 |
| `--describe` | プロジェクトの状態（設定 / ベースライン / `sig/` / CI、存在の有無のみで、`rigor check`は決して実行しない）をプローブし、次に実行すべきスキルを推奨する。`describe`とも書け、トップレベルでは後述の[`rigor describe`](#rigor-describe)として前面に出してある。 |
| `describe --deep` | 同じレポートだが、まず**`rigor check`を実行**し、その結果に基づいて先頭の推奨をルーティングする。オプトイン方式である。完全な解析のコストがかかり`.rigor/cache`へ書き込むためで、フラグなしの形式は存在の有無のみで副作用がないままにしてある。 |

### `describe --deep`

既定では推奨は存在の有無のみのプローブから得られるので、プロジェクトが設定を*持っている*ことは分かっても、解析が健全かどうかは分かりません。`--deep`はチェックを代わりに実行し、その結果に先頭の推奨を選ばせます。ルーティングは`## For the agent`セクションがすでに教えているものと同じです:

| ディープチェックの結果 | 先頭の推奨 |
| --- | --- |
| RBS環境が0クラスにビルドされた、または`configuration-error`診断がある | `rigor-doctor`——セットアップが直るまで解析は空虚。 |
| 呼び出し箇所がプロジェクト自身の定義（再オープンされたコア / gemクラス）に解決し、それがエラーの少なくとも3分の1を占める | `rigor-monkeypatch-resolve`——`pre_eval:`に列挙すればまとめて解消される。 |
| 残りのエラー診断がある | `rigor-baseline-reduce`。共通する、下記の証明済みモンキーパッチ箇所もここで引き続き報告されるので、先頭がより大きな問題に留まっても所見は残る。 |
| クリーン、またはプロジェクトにまだ設定がない | 変更なし——存在の有無のみの推奨がそのまま立つ。 |

チェックが**まったく実行できない**場合（設定がない、読み込めないプラグイン、不正な設定）、`--deep`は失敗せず、プロジェクトがクリーンだと偽ることもしません。何が問題だったかを報告し、存在の有無のみの推奨にフォールバックし、`rigor doctor`を案内します。弱いシグナルでのルーティングは意図的に*行いません*——「フレームワークの呼び出しが`Dynamic`として型付けされる」は依然としてあなたとあなたのエージェントに委ねられた判断です。

```sh
rigor skill describe --deep   # also: rigor describe --deep
```

`rigor skill list` / `print <name>` / `path <name>`という動詞表記は**v0.3.0で削除されました**——位置引数はスキル名を表すスロットなので、これらは今や未知のスキルとして読まれます。上記の形式を使ってください。`describe` / `--describe`は引き続き第一級です。

## `rigor describe`

[`rigor skill describe`](#rigor-skill)へのトップレベルエイリアスです。このプロジェクトに次に実行すべきスキルを推奨する、オンボーディングの入口です。素の`rigor describe`はほとんどのユーザーが最初に直感的に試す当て推量なので、それ自身のコマンドとして前面に出してあります（[ADR-73](../../adr/73-skill-driven-user-experience/) § WD2）。

```sh
rigor describe
```

存在の有無のみのプロジェクト状態プローブ（`.rigor.yml`、`.rigor-baseline.yml`、`sig/`ディレクトリ、CI統合は存在するか？）と、推奨される次のスキルを報告します。読み取り専用で副作用がなく、`rigor check`を決して実行しません。`rigor skill describe`と同一の出力です。

`rigor describe --deep`は[`rigor skill describe --deep`](#rigor-skill)に転送します。こちらはまずチェックを実行するオプトインで——遅く、キャッシュへ書き込みます。

## `rigor docs`

`rigortype` gemに同梱されたドキュメントを**オフラインで**出力します。これにより、Rigorさえインストールされていれば、SKILL駆動のUXが案内するRigorを駆動するためのガイダンスを、AIコーディングエージェント（やあなた自身）がネットワークなしで読めます（[ADR-74](../../adr/74-offline-doc-access-and-llms-txt/)）。これは[`rigor skill`](#rigor-skill)のドキュメント版にあたります。gemは`docs/install.md`、`docs/llms.txt`、そしてユーザー向けの[マニュアル](../)と[ハンドブック](../../handbook/)一式を同梱しますが、貢献者向けのADR / 仕様 / 開発ノートのコーパスはサイト上のWeb限定のままです。

位置引数はドキュメント*名*です。別形式の出力はフラグで指定します。

```sh
rigor docs [<name>] [--path <name>] [--list [<category>]]
```

| 形式 | 用途 |
| --- | --- |
| （なし） | 同梱の`llms.txt`オフラインドキュメント索引（`rigor docs <name>`が提供できるものの一覧）を出力する。 |
| `<name>` | ドキュメントページを来歴コメント付きでstdoutに出力する。カテゴリー修飾パス（`handbook/03-narrowing`）、章のプレフィックス付き名（`02-cli-reference`）、短縮名（一意なときは`cli-reference`）、または`install`を受け付ける。 |
| `--path <name>` | ドキュメントの絶対パスを1行で出力する。ファイル読み取りツールへの入力に適する。 |
| `--list [<category>]` | 同梱されたすべてのドキュメントの表（名前＋絶対パス）。`manual`または`handbook`で絞り込める。 |

`rigor docs list` / `path <name>`という動詞表記は**v0.3.0で削除されました**——位置引数はドキュメント名を表すスロットなので、これらは今や未知のドキュメントとして読まれます。`--list` / `--path`を使ってください。

索引の正典となるWeb版は<https://rigor.typedduck.fail/llms.txt>です。`rigor docs`はインストール済みのgemから同じページをHTTPリクエストなしで提供します。

## `rigor show-bleedingedge`

**ブリーディングエッジオーバーレイ**（次のメジャーに向けてキューに積まれた変更のRigor管理セット。[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) § WD2）を表示し、そのうちどれをプロジェクトの[`bleeding_edge:`](../03-configuration/)設定が採用しているかを報告します。読み取り専用です。アクティブな選択を解決するために`.rigor.yml`を読み込みますが、解析は実行しません。

```sh
rigor show-bleedingedge [--config PATH] [--format text|json]
```

| フラグ | 目的 |
| --- | --- |
| `--config PATH` | 自動探索の代わりにこの`.rigor.yml`を使用する。 |
| `--format text\|json` | 出力形式。デフォルトは`text`。 |

キューに積まれた各フィーチャーは、その安定したid、その**種別**（`severity`または`behaviour`）、そしてあなたの設定がそれを採用しているかどうかとともに現れます。`severity`フィーチャーはそれが課すルール → 重要度の差分も出力します。`behaviour`フィーチャーは、どのルールの重要度も動かさずに測定・アルゴリズム・デフォルトを変えるので、そうした差分を持たず、そのサマリーが説明のすべてです。ブリーディングエッジが安定性モデルにどう収まるかは[`docs/compatibility.md`](../../compatibility/)を参照してください。

現在キューに積まれているもの:

| Feature id | 種別 | 変わる内容 |
| --- | --- | --- |
| `reject-unparseable-signatures` | severity | `signature_paths:`配下のパースできない`.rbs`は、警告付きでスキップされる代わりに**実行を失敗させます**（`rbs.coverage.quarantined-signature` → `error`）。 |
| `use-of-void-value` | severity | 作者が宣言した`-> void`の戻り値から復元された値を値コンテキストで使うことが、`static.value-use.void`（`warning`）として報告されます。 |
| `discovery-seeded-mutation-sites` | behaviour | [`rigor coverage --protection --mutation`](../15-type-protection-coverage/)が、ティア1がすでに使っているのと同じクロスファイルのプロジェクトディスカバリーに対して計測します —— サイトを選ぶときも、破壊が捕捉されたかを判定するときも —— そのため*兄弟*ファイルで宣言されたプロジェクトクラスへの呼び出しが、捨てられる代わりに計測され、そこでの破壊が実際に捕捉されうるようになります。**分母にサイトを足すので、報告される有効性比率が動きます** —— 採用前に、CIで固定している`--threshold`と突き合わせて確認してください。 |
| `dependent-closure-kill-oracle` | behaviour | [`rigor coverage --protection --mutation`](../15-type-protection-coverage/)が、破壊を捕捉されたとみなす条件を、ミューテーションされたファイル**またはそれに依存するファイル**のどこかに診断が現れることに広げます（従来はミューテーションされたファイル内のみ）—— メソッドの戻り値の変更が、エラーがその呼び出し元に現れたときに捕捉としてカウントされます。キルを**足す**ことしかできないので比率は上がるか変わらないかのどちらかです。ミュータント1つあたりの実時間コストが約3分の1増え、これを有効にして計測した比率は、無効で計測したものとは比較できません。 |
| `effects-on-by-default` | behaviour | `.rigor.yml`に[`effects:`](../03-configuration/#エフェクトラベル)キーをまったく持たないプロジェクトを、`effects: {}`と書いたかのように扱う —— [エフェクト収集](../03-configuration/#エフェクトラベル)、`rigor effects`動詞群のキャッシュ共有、そして`effects.check`が、すべてのサブキーをデフォルトのままオンになる。`effects: false`と明示的に書けば依然としてオプトアウトになる。次のメジャーではなく**v0.4.0で卒業予定**（[ADR-103](../../adr/103-effect-labels/) § WD15）—— 下記の一般的なv1.0.0メジャー限定のケイデンスに先立つ、この機能に固有のオーナー裁定。 |

フィーチャーが**卒業**する —— メジャーでデフォルトになる（[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) § WD7）—— と、キューのリストを離れて`Graduated`の下に現れます。これは`bleeding_edge:`でそれを名指ししてももう何も起きないことの確認です: その挙動は全員に対して有効になっています。何も卒業していない間、このセクションは現れません。`--format json`では同じ情報が`graduated`配列であり、`overlay`（キューに積まれたすべてのフィーチャー。それぞれ`kind`付き）・`active`・`unknown_selected`と並びます。

## `rigor doctor`

セットアップの問題をクリーンな実行と区別して分類し、対処すべき次のアクションへ振り分けます（[ADR-77](../../adr/77-doctor-and-upgrade-commands/) WD1）。

```sh
rigor doctor [--config PATH] [--format text|json]
```

| フラグ | 目的 |
| --- | --- |
| `--config PATH` | 自動探索の代わりにこの`.rigor.yml`を使用する。 |
| `--format text\|json` | 出力形式。デフォルトは`text`。 |

スコープを絞った解析を実行し、以下を監査します:

- **設定監査** — 未解決の`signature_paths:`、未知の`libraries:`、無効な`disable:` / `severity_overrides:`トークン。
- **RBS環境の健全性** — RBSクラス宇宙が正常に構築されたかどうか（`0`クラスは壊れたセットアップを意味します）。
- **プラグインのロードエラー** — 設定されたすべてのプラグインがロードされたかどうか。
- **ベースラインドリフト** — 現在の診断が保存済みベースラインからドリフトしているかどうか。
- **Railsプラグインのギャップ** — `Gemfile.lock`にRails gemが含まれているのにRailsプラグインが有効化されていないかどうか。
- **Gemfileへのインストール** — Rigor自身がプロジェクトの依存関係の1つとして解決されるかどうか。これは[Rigorのインストール](../01-installation/)がしないよう指示していることです。**GEM**リモートから解決された`rigortype`だけがカウントされます。`PATH`や`GIT`ソースは意図的にRigorを開発またはベンダリングしていることを意味し、Rigor自身のリポジトリはまさにそのように見えます。
- **プラグインインストールのずれ** — Rigorがバンドルするプラグインが、エンジンとは別の`rigortype`インストールからロードされていないかどうかを、両方のパスを示して報告します。エンジンとそのバンドル済みプラグインはまとめてバージョン管理されているため、別のインストールからのコピーはエンジンを不一致のプラグインで動かしかねません。失敗ではなく警告です;自分自身のバンドルに含まれるサードパーティプラグインが対象になることはありません。

テキスト出力はチェックごとに`[PASS]`・`[FAIL]`・`[WARN]`と、振り分けられたヒント（例:「`rigor baseline regenerate`を実行してください」）を表示します。JSON出力は安定した契約です:

```json
{
  "status": "issues_found",
  "checks": [
    { "id": "config_audit", "status": "fail", "message": "...", "hint": "..." }
  ]
}
```

いずれかのチェックが失敗すると`1`で終了し、すべてパスすると`0`で終了します。

## `rigor upgrade`

マイグレーションコマンドの骨格です（[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) WD7）。実際の本体は、具体的な後方互換性の破壊がターゲットを与えたとき（例: 強化されたデフォルトプロファイルに対して`baseline regenerate`を再実行する、リネームされた抑制idを表面化する、`bleeding_edge:`の卒業を報告する）に着地します。

```sh
rigor upgrade
```

それまでは、現在のバージョンを表示し、upgradeがキューに積まれていることを注記します。`0`で終了します。

## 環境変数

ほとんどの振る舞いはフラグと`.rigor.yml`で制御されますが、いくつかの運用上のつまみは代わりに環境変数を読みます。

| 変数 | 効果 |
| --- | --- |
| `NO_COLOR` | 色付き出力を無効化する（`rigor annotate`が尊重する;`--no-color`も同じ）。 |
| `RIGOR_CI_DETECT=0` | CI自動検出をオフにする。`--no-ci-detect`と同じ。[CIでのRigor実行 § 自動検出](11-ci/)を参照。 |
| `RIGOR_RACTOR_WORKERS=N` | 並列解析のワーカー数。優先順位ではCLIフラグと設定キーの間に位置する: `--workers=N` > `RIGOR_RACTOR_WORKERS` > `parallel.workers:` > `0`（逐次）。 |
| `RIGOR_POOL_BACKEND=ractor` | アクティブなforkベースのプールの代わりに、（デフォルトでオフの）Ractorワーカープールに戻す（[ADR-15](../../adr/15-ractor-concurrency/)）。非ゼロのワーカー数のときのみ関係する;サポートされるバックエンドはforkプールである。 |
| `RIGOR_PLUGIN_ISOLATION=none\|process\|ruby_box` | プラグインがターゲットライブラリへ行う直接呼び出しをどう隔離するか。デフォルトは`process`。[プラグインの使用 § 隔離戦略](07-plugins/)を参照。`RIGOR_BOX`は`ruby_box`のレガシーエイリアス。 |
| `RIGOR_STRICT_VALIDATION=1` | 1回の実行に対してフルコンテンツのキャッシュ検証を強制する（`cache.validation: digest`と同じで、それより優先する）——各ファイルのstatメタデータを信用する代わりに、その内容を毎回再ハッシュする。ファイルシステムのタイムスタンプやinode番号が信用できない場合に使用する。[キャッシュ § ファイルの変更確認方法](12-caching/)を参照。 |
| `RIGOR_DISABLE_YJIT=1` | Rigorの遅延YJIT有効化をオプトアウトする。Rigorは長時間の`check` / `coverage`実行の途中でYJITを有効化するので、短い実行はJITのウォームアップコストを一切払わない;この変数はYJITを完全にオフのままにする。診断結果とアロケーションはどちらの場合も同一で、影響は実行時間のみ。 |
| `RIGOR_YJIT_DEADLINE=<seconds>` | 上級者向け: 遅延YJITが有効化されるまでに実行がどれだけ続く必要があるかを調整する（デフォルト`5.0`）。実行が長くYJITをもっと早く欲しいなら下げ、短い実行を保護したいなら上げる。`RIGOR_DISABLE_YJIT=1`が設定されているか、YJITが利用できない場合は無視される。 |

さらに3つの変数（`RIGOR_BUDGET_TRACE`、`RIGOR_HEAP_PROFILE`、`RIGOR_HEAP_TRACE`）は、Rigor自身の推論カットオフとメモリに関する開発者向けの診断を有効にします。[トラブルシューティング § 高度な診断](13-troubleshooting/#高度な診断)を参照してください。

## 終了コード

| コード | 意味 |
| --- | --- |
| `0` | 成功（エラー重要度の診断なし）。 |
| `1` | 診断あり、またはコマンド固有のエラー（パースエラー、ファイル不在、`diff`での新規診断、`effects check`でのエフェクトドリフト）。 |
| `64` | 使用法エラー（不明なコマンド、不正なフラグ、不正な引数）。 |

`rigor triage`は例外で、参考情報であり常に`0`で終了します。
