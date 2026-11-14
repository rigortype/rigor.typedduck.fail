---
title: "RBSインターフェース型 — ADR-130向けのプロトタイプ計測（#929）"
description: "rigortype/rigor docs/notes/20261104-interface-types-prototype-measurement.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20261104-interface-types-prototype-measurement.md"
sourcePath: "docs/notes/20261104-interface-types-prototype-measurement.md"
sourceSha: "788124a248a11a14aaf3d62514193eb027dd792fb29a4886b058b6faf9400522"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-04T17:32:29+09:00"
translationStatus: "translated"
sidebar:
  order: 20267104
---

ステータス: 計測ノート、2026-11-04、`0a53fe62e`時点のエンジン。[ADR-130](../../adr/130-interface-typed-values-dispatch-under-untyped-parity/)の裏付けとなるものであり、拘束力を持たない。

**結果（ドラフト3、提案内容）**。この提案は、ファセットのスコープを`Rigor::Plugin`インターフェースに限定し、パリティ述語、untypedユニオンマージ、およびオーバーロード形状ルールを追加する。`lib`、48のプラグインおよびサンプルツリー、ならびに14のサーベイターゲットで計測した結果は次のとおりである。

- ディスパッチ有効では診断行の追加は**ゼロ**、削除された行も**ゼロ**だった。
- 振る舞いパリティの差分（ディスパッチ無効）は空だった。
- ディスパッチ有効では、プラグインツリー上でsig-genの出力が変化した。ADR-130 WD5がsig-genを実行する方式であるディスパッチ無効では、`lib`およびプラグインツリー上でmasterとバイト単位で同一だった。
- lensは`check`と同様にディスパッチ有効で実行される。プラグインツリーの15か所のreturnサイトが変化し、これらは意図した精度向上である。
- 3回のレビューラウンドにより、以前のドラフトで指摘事項が再現された。11件のフォルスポジティブと、ネストされたjoinにおける2件の構造的乖離である。すべてフィクスチャ化されている。
  - 各フォルスポジティブはそれぞれのドラフトのheadで発火し、最終headでは発生しない。
  - 各joinはmasterと同じ解釈になる。
- アロケーション: 下記の要因切り分け後、`lib`で+0.007%、Mastodon `app`で+0.005%。

記録のために残している以前のドラフト:

- **ドラフト1**は、パリティなしですべてのインターフェースを`Dynamic[_Foo]`として保持した。
- **ドラフト2**は、すべてのインターフェースにパリティを追加した。
- どちらもコーパス上ではゼロと計測されたが、レビューでは両者合わせて10件のフォルスポジティブが再現された。したがって、ここにおいてコーパス上でゼロであることは安全性の証拠にならず、フィクスチャとパリティ差分こそが証拠となる。

## プロトタイプ

プロトタイプは`interface-assignability`ワークツリーのローカルブランチ`interface-proto`である。プッシュされておらず、headは`6037e728a`である。各コミットは`0a53fe62e`の上に積まれている。

| SHA | 追加内容 |
| --- | --- |
| `89d12edbb`, `0afcfa73d`, `8b980c6b2`, `41869d92b`, `b9011b6ac` | ドラフト1: キャリア、ディスパッチ、half-Bオラクル、到達カウンタ |
| `b7e7d73d9` | ドラフト2: すべてのインターフェースに対するパリティ述語とコアエイリアス消去 |
| `3410399da`, `992d583c6` | **ドラフト3（提案内容）:** `Rigor::Plugin`スコープ、untypedユニオンマージ、オーバーロード形状ルール、その後アロケーション計測用のカウント付きマージ |
| `6037e728a` | **ラウンド3:**ファセット消去を法とするユニオンマージ（Tuple、HashShape、Nominal、Unionの内部でネスト）、nilになり得るブロック渡しは両方の形状にマッチ |
| `1e5972f66`（ブランチ`interface-proto-d2-typename`） | アロケーション要因切り分け専用の、`TypeName`セットによるエイリアスチェック付きドラフト2 |

`RIGOR_PROTO_IFACE`でモードを選択する:

- `a`: ディスパッチ有効
- `an`: キャリアあり、ディスパッチ無効（パリティ差分）
- `b`, `bu`: half B

`RIGOR_PROTO_REACH=<file>`でカウンタを書き出す。

### プロトタイプ化されたドラフト3のルール

- **スコープ**。`translate_interface`は、インターフェースの`TypeName`名前空間パスが`[:Rigor, :Plugin]`である場合にのみファセットを保持する。それ以外のすべてのインターフェースは`Combinator.untyped`を返す。これは名前の純粋関数であるため、（展開結果をキーとする）クローズドエイリアスのメモは順序に依存しない。
- **述語**。`Type::Combinator.untyped?`は`Dynamic[top]`および`Dynamic[Interface]`に対してtrueを返す。これは`lib/`から2回のgrepで再抽出した以下の箇所群を置き換える。
  - `static_facet.is_a?(Type::Top)`および`facet.is_a?(Type::Top)`
  - `== Combinator.untyped`、`equal?(Combinator.untyped)`、`== untyped`、および`equal?(untyped)`
- **ユニオンマージ**。`normalized_union_members`は、ファセット消去を法としてメンバーを比較する（`merge_untyped_members`、`erase_facets`）。この消去は、`Tuple`要素、`HashShape`値、`Nominal`型引数、およびユニオンの内部で再帰的に`Dynamic[<plugin interface>]`を`Dynamic[top]`に書き換える。消去後に等価となるメンバーは消去後の形式にマージされ、その同値類に単独で属するメンバーは自身のファセットを保持する。このチェックはいずれかのメンバーがファセットを持つ場合にのみ実行され、そうでなければ何もアロケートしない。
- **nilブロック渡しルール**。`expr`がnilを含むユニオンまたは`Dynamic`である`&expr`に対して、ディスパッチはブロックありとブロックなしの両方の形状を要求する。2つの戻り値が一致する場合にのみ結果を返し、そうでなければ呼び出しは`untyped`と解釈される。`&:sym`がnilになることはない。
- **オーバーロード形状ルール**。`interface_shape_accepted?`は、あるオーバーロードが呼び出しのブロック有無、位置引数の個数、および必須キーワードを受け入れる場合にのみ、インターフェースメンバーを通じたディスパッチの解決を許可する。そうでなければ、このティアは辞退し、呼び出しは`untyped`と解釈される。

| 箇所 | 形式 | 目的 |
| --- | --- | --- |
| `type/combinator.rb:55` | ファセット`Top` | `Combinator.dynamic`自身の畳み込み（維持: コンストラクタ） |
| `inference/method_dispatcher/imprecise_argument.rb:23`, `:28` | ファセット`Top` | オーバーロード選択のimprecise-actualパス |
| `inference/method_dispatcher/facet_distribution.rb:122` | ファセット`Top` | `Dynamic`ファセットに対するメンバーごとの選択 |
| `inference/untyped_rejoin.rb:60` | ファセット`Top` | #1840の再合流 |
| `inference/statement_evaluator.rb:8742` | ファセット`Top` | ADR-67 WD3の推論パラメータ上書き |
| `inference/statement_evaluator.rb:3256` | `== untyped` | `$_`チェック |
| `inference/statement_evaluator.rb:4023` | `equal?(untyped)` | `for`要素のフォールバック |
| `inference/method_dispatcher.rb:198`, `:829` | ファセット`Top` | `EXPLICIT_UNTYPED`オリジン、境界越えレポート |
| `inference/method_dispatcher/rbs_dispatch.rb:1918` | ファセット`Top` | RBSディスパッチにおけるuntyped引数テスト |
| `inference/method_dispatcher/self_substitute.rb:107` | ファセット`Top` | `self`置換のuntyped型引数 |
| `inference/unknown_store_widening.rb:168` | ファセット`Top` | 未知ストアの漸進的（gradual）分岐 |
| `inference/narrowing.rb:1818` | ファセット`Top` | `match_dynamic_kind` |
| `inference/precision_scanner.rb:171` | ファセット`Top` | 精度レンズの`dynamic_top`バケット |
| `inference/expression_typer.rb:1339` | `equal?(untyped)` | `Range`端点の型付け |
| `inference/expression_typer.rb:3535` | `equal?(untyped)` | ADR-84メモのtop例外 |
| `inference/clause_widening.rb:60` | `== untyped` | 節のワイドニング |
| `inference/multi_target_binder.rb:305` | `== untyped` | 多重代入のバインディング |
| `inference/block_auto_splat.rb:197` | `== untyped` | ブロック自動スプラットの列 |

2つのファイルがそれぞれ2つのテストを保持している（`imprecise_argument.rb`と`method_dispatcher.rb`）ため、表の20箇所は合計21のテストになる。

一部の箇所ではファセットの内容を読み取っている: `receiver_blind_block.rb:209`、`scope_indexer.rb:2858`、`block_auto_splat.rb:129`、`match_rebinding/operands.rb:105`、および`effects/collector.rb:167`。これらにはいずれも`Interface`の分岐がないため、`top`の場合と同様に回答する。例外は`rbs_dispatch.rb`の`receiver_descriptor`であり、これはディスパッチパスである。

## 計測手法

- **差分計測**。
  - `tool/engine_diag_diff.rb --base 0a53fe62e --head 3410399da`、各アームを新規プロセスかつ`--no-cache`で実行。
  - `lib`および48のプラグイン・サンプルツリーは、リポジトリルートから`--corpus 0a53fe62e`で解析し、`sig/`が読み込まれるようにした。
  - サーベイターゲットは、`.git`、`node_modules`、キャッシュを除き、すべてのベースラインをリネームして退避したプライベートの`rsync`コピー上で`--corpus-dir`により解析した。ベースラインはファイルとルールごとの件数でキー付けされているため、ファイル内で1件でも新規発火があると、そのファイル内のそのルールのベースライン済み発火がすべて解放される。
- **サーベイ対象**。textbringer、rgl、kramdown、alba、mail、liquid、faraday、mangrove、haml、herb、net-ssh、yard（デリゲータと`method_missing`が多用されるターゲット）、redmine、およびmastodon。
  - railsは除外した: 環境上で1,610個のクラス定義の構築に失敗するため（`::Array`に対する`RBS::GenericParameterMismatchError`）、何も計測できない。
  - 各オリジナルチェックアウトの`git status`を前後で比較し、いずれも変更がないことを確認した。
- **振る舞いパリティ**。同じ差分計測を`RIGOR_PROTO_IFACE=an`（キャリアあり、ディスパッチ無効）で実行した。基準は0行である。
- **sig-genおよびlens**。各エンジンを`exe/`でアーカイブし、`0a53fe62e`のコーパスアーカイブに対して`rigor sig-gen --format=json`および`rigor lens --format=json`を、base対headで実行した。プラグインツリーに対するlensの実行では、`paths:`にそれらを指定した設定を使用した。lensは`paths:`外のファイルを`outside_project`として報告するためである。

## フィクスチャ

フィクスチャはワークツリー内の`tmp/p5`である。ドラフト3のスコープが適用されるよう、`Rigor::Plugin`配下に4つのインターフェースを宣言している。

- `_ProbeA`（`to_str`）
- `_ProbeB`（`to_s`）
- `_ProbeInt`（`to_int`）
- `_ProbeEach`（`each: () { (Integer) -> void } -> Array[Integer]`）

これらの型を用いてレビューでの指摘事項を再現している:

| メソッド | 形状 | 指摘 |
| --- | --- | --- |
| `mul` | `(arr * x).first` | レビュー1 |
| `plus`, `minus`, `times`, `pow` | `(1 + x).nan?`およびその兄弟 | レビュー1 |
| `rejoin_if`, `rejoin_case` | nil / `String`分岐後の`x.to_str` | レビュー1 |
| `r3` | `x = f ? a : b`、その後nil / `String`ケース、その後`x + "z"`（2つのインターフェース分岐） | レビュー2、重要1 |
| `r3u` | 同上（`untyped`分岐あり） | レビュー2、重要1 |
| `e` | `xs.each.with_index { … }` | レビュー2、重要2 |
| `mix` | インターフェース値と`String`の合流（ユニオンルールのもう一方の側面） | — |
| `facet` | 対照群: `x.to_str`が解決する | — |

| Base → head（モード） | 削除 | 追加 |
| --- | --- | --- |
| `b9011b6ac`（ドラフト1）→ `3410399da`（`a`） | 10: `call.undefined-method` 5件（レビュー1）、`call.possible-nil-receiver` 4件（レビュー1 ×2、`r3`、`r3u`）、`call.undefined-method` `with_index` 1件 | 0 |
| `b7e7d73d9`（ドラフト2）→ `3410399da`（`a`） | 3: `r3`、`r3u`、`with_index` | 0 |
| `0a53fe62e`（master）→ `3410399da`（`a`） | `dump_type`テキスト5件 | `dump_type`テキスト5件: `_ProbeEach`ブロック値の`Integer`、`Dynamic[Rigor::Plugin::_ProbeA] \| String`、`to_str`由来の`String` |
| `0a53fe62e`（master）→ `3410399da`（`an`、ディスパッチ無効） | `dump_type`テキスト2件 | 2: レンダリングされた`Dynamic[Rigor::Plugin::_ProbeA]`のみ |

**ユニオンルールのもう一方の側面（`mix`）**。

| 式 | master | ドラフト3、ディスパッチ有効 | ドラフト3、ディスパッチ無効 |
| --- | --- | --- | --- |
| `y = f ? a : s`後の`y` | `Dynamic[top] \| String` | `Dynamic[Rigor::Plugin::_ProbeA] \| String` | `Dynamic[Rigor::Plugin::_ProbeA] \| String` |
| `y.to_str` | `Dynamic[top]` | `String`: 各分岐が解決し、joinが`String`になる | `Dynamic[top]` |

`mix`の`y + "z"`における`possible-nil-receiver`は、masterでも両モードでも同様に発火する。これはnil分岐後の`Dynamic[top] | String`に対するmasterの解釈であり、パリティによって維持される。

**ラウンド3のフィクスチャ**（`tmp/p6`、`Rigor::Plugin::_ProbeS`および`_ProbeEach`を使用）:

| メソッド | 形状 | master | `992d583c6`（`a`および`an`） | `6037e728a`（`a`および`an`） |
| --- | --- | --- | --- | --- |
| `tup` | `f ? [a] : [b]` | `[Dynamic[top]]` | `[Dynamic[_ProbeS]] \| [Dynamic[top]]` | `[Dynamic[top]]` |
| `shape` | `f ? { k: a } : { k: b }` | `{ k: Dynamic[top] }` | `{ k: Dynamic[_ProbeS] } \| { k: Dynamic[top] }` | `{ k: Dynamic[top] }` |
| `shape` | 続いて`h.merge(z: 1)` | `{ k: Dynamic[top], z: 1 }` | `Hash[:k \| Dynamic[top], Dynamic[top]]` | `{ k: Dynamic[top], z: 1 }` |
| `blockpass` | `xs.each(&blk)`, `blk : (^(Integer) -> void)?` | `Dynamic[top]` | `Array[Integer]`（`a`）; `with_index`が`call.undefined-method`を報告 | `Dynamic[top]`;無警告 |

`engine_diag_diff`による結果:

- `tmp/p6`に対する`992d583c6` → `6037e728a`: `with_index`のフォルスポジティブと、3つの乖離した`dump_type`テキストを解消する。
- `tmp/p6`に対するmaster → `6037e728a`: 両モードとも0行。
- `tmp/p5`上では、`6037e728a`は以前の結果を維持している:
  - ドラフト1から10件削除、追加0件。
  - masterに対しては`dump_type`テキストのみが異なる。

**プラグインフック（プローブ）**。ディスパッチ有効のドラフト3における解釈:

| 式 | 解釈 |
| --- | --- |
| `scope` | `Dynamic[Rigor::Plugin::_Scope]` |
| `scope.type_of(node)` | `Rigor::Type::t`（21メンバーのユニオン） |
| `scope.environment` | `Dynamic[Rigor::Plugin::_Environment]` |
| `scope.self_type` | `Rigor::Type::t \| nil` |

`scope.not_in_interface`は何も報告しない。

## 診断差分（ドラフト3、`3410399da`）

ラウンド3のheadである`6037e728a`は、`lib`および48のプラグイン・サンプルツリーに対して両モードで再実行した。すべての実行で追加0・削除0だった。サーベイターゲットは`Rigor::Plugin`の値を持たないため、再実行していない。

行は`[path, line, column, rule, message]`である。「追加」と「削除」はheadマイナスbaseを表す。

| コーパス | ベース行数 | ディスパッチ有効（`a`）: 追加 / 削除 | パリティ差分、ディスパッチ無効（`an`）: 追加 / 削除 |
| --- | ---: | --- | --- |
| `lib` | 1 | 0 / 0 | 0 / 0 |
| 48のプラグイン・サンプルツリー | 1 | 0 / 0 | 0 / 0 |
| textbringer | 86 | 0 / 0 | 0 / 0 |
| rgl | 17 | 0 / 0 | 0 / 0 |
| kramdown | 7 | 0 / 0 | 0 / 0 |
| alba | 0 | 0 / 0 | 0 / 0 |
| mail | 22 | 0 / 0 | 0 / 0 |
| liquid | 45 | 0 / 0 | 0 / 0 |
| faraday | 3 | 0 / 0 | 0 / 0 |
| mangrove | 2 | 0 / 0 | 0 / 0 |
| haml | 14 | 0 / 0 | 0 / 0 |
| herb | 21 | 0 / 0 | 0 / 0 |
| net-ssh | 20 | 0 / 0 | 0 / 0 |
| yard | 105 | 0 / 0 | 0 / 0 |
| redmine | 1,876 | 0 / 0 | 0 / 0 |
| mastodon | 2,967 | 0 / 0 | 0 / 0 |

表の読み方:

- RedmineとMastodonの実行では、それぞれの`rbs.coverage.plugin-signature-stood-down`行（3件と4件）が削除と追加の両方に挙げられている。これらの行はアームごとのスクラッチパスを含んでおり同一の行であるため、上記の件数からは除外している。
- どのサーベイターゲットも`Rigor::Plugin`インターフェース値を持たないため、ドラフト3は構造上そこでは何も変更しない。これらの行は、述語とユニオンマージ単体が中立であることを示している。ファセットが実際に機能するのはプラグインツリーである。
- 同じ対象セットに対する以前のドラフトのモード`a`では、コアエイリアス保持によってメッセージテキストが変化したMastodonの2行を除き、すべて追加0・削除0だった:
  - ドラフト1、`41869d92b`: `lib`、プラグインツリー、および12ターゲット。
  - ドラフト2、`b7e7d73d9`: `lib`、プラグインツリー、および14ターゲット。

## sig-genとlens

両コマンドは`0a53fe62e`のコーパスアーカイブに対して実行した。lensのJSONは`producer`ブロック（エンジンダイジェスト）を除去した上で比較した。

| 出力 | ディスパッチ有効（`a`） | ディスパッチ無効（`an`） |
| --- | --- | --- |
| `sig-gen --format=json lib` | 同一 | 同一 |
| 48のプラグイン・サンプルツリーに対する`sig-gen --format=json` | **1,358候補中13件が変化**: プラグインの`prepare: (untyped) -> nil`メソッド11件（`_FactStore#publish`経由）および他2件が、`skipped` / `untyped-return`から`new_method`へ変化 | 同一 |
| `lib`（607ファイル）に対する`lens --format=json` | 同一 | 同一 |
| プラグインツリー（201ファイル）に対する`lens --format=json` | **15箇所が変化**: `body_return`が`untyped` / `dynamic`から`nil`（12件）、`Array[String]`、`Array[untyped]`、およびタプル配列1件へ変化 | 同一 |

どちらの変化も正しい解釈であり、ADR-130 WD5ではこれら2つのコマンドを異なる扱いにしている:

- **sig-genはディスパッチ無効で実行される**。プラグインの`prepare`が`nil`を返すのは、`publish`が`-> nil`を宣言しているためである。ディスパッチ有効にすると、sig-genはプラグイン作者が依拠して書いていないインターフェースから得たその解釈を、生成されるRBSに書き込んでしまう。sig-genは解析キャッシュを読まないため、キャッシュの同一性は関与しない。
- **lensは`check`と同様にディスパッチ有効で実行される**。lensは`rigor check`が与える型を表示するものと定義されているため、プラグインツリーで変化した15箇所は意図した精度向上であり、lensは`check`のスナップショットを共有する。

**新たに到達可能になった指摘**。サードパーティのプラグインコード内で`call.possible-nil-receiver`が発火し得るようになった。これはインターフェースがnilableとして宣言している`_Scope#local`、`_Scope#self_type`、`_Scope#source_path`、および`_Environment#nominal_for_name`の結果に適用される。

- コントラクト上正しい指摘であり、`Rigor::Scope`レシーバーが与える指摘と同じものである。
- バンドルされたプラグインツリーはクリーンと計測された: 上記のとおり追加行は0である。

## 到達度（ドラフト2、`b7e7d73d9`、すべてのインターフェース）

ドラフト3はサーベイターゲット内に到達対象を持たない。ドラフト2のカウントは、先送りされたステップであるファセットの一般化を行った際にパリティ述語がどこで効くかを示している。

- 述語は20箇所のうち7箇所で、インターフェース値に対して3,880回`true`を返した。
- 残りの13箇所はコーパス上で一度も到達しなかったため、スライス1bでは箇所ごとのフィクスチャが必要になる。

| 箇所 | ヒット数 |
| --- | ---: |
| `imprecise_argument.rb:28` | 1,586 |
| `imprecise_argument.rb:23` | 1,016 |
| `facet_distribution.rb:122` | 521 |
| `untyped_rejoin.rb:60` | 305 |
| `method_dispatcher.rb:198` | 284 |
| `self_substitute.rb:107` | 93 |
| `statement_evaluator.rb:8742` | 75 |

ドラフト1におけるインターフェースレシーバー呼び出し（宣言済みおよび未宣言）:

| コーパス | 宣言済み | 未宣言 |
| --- | ---: | ---: |
| `lib` | 16 | 53 |
| plugins | 299 | 4 |
| alba | 37 | 60 |
| mail | 0 | 46 |
| faraday | 0 | 27 |

検査した未宣言の呼び出しはすべて実行時に存在する。

## コスト

計測条件:

- `rigor check --no-cache`、アームごとに新規プロセス、モード`a`。
- `lib`は凍結コーパス上で`tool/engine_alloc_ab.rb`により計測。
- Mastodonは`--measure`子プロセスで計測。
- 許容帯域は`pr_allocations_pct: 1`（`bench/thresholds.yml`）。
- アロケーション数は数百オブジェクトの範囲で決定的である。実行時間（wall time）はこのホスト上ではノイズになる。

| エンジン | Rigor `lib` | Mastodon `app` | Mastodon `lib` |
| --- | --- | --- | --- |
| ドラフト2、`b7e7d73d9` | +520,176 (+0.70%) | +72,109 (+0.08%) | +10,588 (+0.03%) |
| `TypeName`セットによるエイリアスチェック付きドラフト2、`1e5972f66` | +187,301 (+0.25%) | — | — |
| ドラフト3、`3410399da` | +943,727 (+1.27%) | +142,280 (+0.17%) | +57,089 (+0.19%) |
| **カウント付きマージによるドラフト3、`992d583c6`** | **+5,269 (+0.007%)** | **+4,364 (+0.005%)** | **−2,175 (−0.007%)** |
| ラウンド3、`6037e728a`（ネスト消去マージ、nilブロック渡し） | +63,380 (+0.085%) | 再計測なし | 再計測なし |

要因切り分け（各ステップを2つのアーム間の単一変更として計測）:

- ドラフト2のコアエイリアスチェックにおける`TypeName#to_s`は、`lib`上で332,875アロケーション、0.45パーセントポイントを要した（`b7e7d73d9`対`1e5972f66`）。レビューでの計測は0.42だった。
- ドラフト3にはコアエイリアスチェックがない。プラグインスコープは`TypeName`の名前空間パスを比較するため、何もアロケートしない。
- ドラフト3の最初のユニオンマージは、ユニオン正規化のたびに`select`配列を構築していた。これが`lib`上で+938,458となり（`3410399da`対`992d583c6`）、帯域を超えたドラフト3のコストの全体を占めていた。
- マージ前にカウントすることでこのコストを解消した。

ラウンド3については要因切り分けを行っていない。ネストされたファセットチェックはユニオン正規化のたびに実行され、`HashShape#pairs.each_value.any?`がshapeメンバーごとにEnumeratorを構築しており、それが主な原因と考えられる。それでも許容帯域内に収まっており、実装ではEnumeratorなしでshapeを走査できる。

診断件数はすべてのアームで同一である。診断、パリティ、sig-gen、およびlensの計測は`3410399da`上で実行した。`992d583c6`が変更するのはマージの判定方法のみであり戻り値は変えない。また、同コミット上でのフィクスチャ差分でもレビューの10件のフォルスポジティブすべてが解消され、追加は0件だった。

## 第1ドラフト: half B（先送り）

コミット`89d12edbb`〜`b9011b6ac`。仕組み:

- 引数ルールおよび戻り値ルールの宣言型はインターフェースをそのまま変換した。
- スレッドローカルのオラクルが`Acceptance`の`Interface`ハンドラに回答した:
  - すべてのpublicメンバーがRBSまたはソースのサーフェス上に存在する場合は`yes`。
  - 未定義メソッドのレシーバー側チェーン（call-site-lexicalアームなしで実行）によってメンバーの不在が証明された場合は`no`。
  - それ以外は`maybe`。

| コーパス | Bで追加 | 標準ユニオン解釈によるB（`bu`） |
| --- | ---: | ---: |
| `lib` | 0 | 20 |
| 48のプラグイン・サンプルツリー | 0 | — |
| textbringer | 3 | — |
| alba | 1、その後ルートクラスルールにより0 | — |
| 当時計測した他の8ターゲット | 0 | — |

追加された行はすべてフォルスポジティブだった:

| 行 | 原因 |
| --- | --- |
| textbringer `buffer.rb:642`, `rectangle.rb:148:26`, `:148:39` | プロジェクトシグネチャの誤り: `save_point: () -> Integer`および`save_excursion: () -> Array[untyped]`。両メソッドともブロックの値を返す。ベースでも`rectangle.rb:141`で同じ原因により既に発火している。 |
| alba `layout.rb:53` | `check_and_return: (...) -> Object`が`@body`をワイドニングし、その`String`ガードが別のメソッド内に置かれている。 |
| `lib` ×16 `File.expand_path(x, __dir__)`（`bu`） | Nullability: `__dir__`は`String?`である。 |
| `lib` ×2 `result << bytes.byteslice(...)`（`bu`） | Nullability: `byteslice`は`String?`である。 |
| `lib/rigor/effects/snapshot.rb:287`（`bu`） | プロジェクトヘルパーの戻り値のNullability。 |
| `lib/rigor/lens/plugins.rb:28`（`bu`） | `const_source_location`のペアが`Array[String \| Integer]`と型付けされている。 |

トゥルーポジティブは1件も見つからなかった。レビューにより、オラクルがlexicalアームを落としていること、およびチェーンが#2792と#2793を見逃していることが判明した。再検討の条件はADR-130 §「先送り（Deferred）」に記載している。

## 制約事項

- サーベイターゲットにおいて、ドラフト3は構造上不活性である。実地での根拠はプラグインツリー、`lib`（`lib/rigor/plugin/base.rb`）、およびフィクスチャである。
- インターフェースパラメータに対するADR-67 WD3の上書きを検証したフィクスチャはない。述語はその分岐を通すが、ここでそれを証明するものはない。
- オーバーロード形状ルールのキーワード扱いはプロトタイプでは近似的である（キーワードを持たないオーバーロードに対する末尾キーワードハッシュ）。スライス1bでは分岐ごとのフィクスチャが必要になる。
- 計測器具はローカルのみの`interface-proto`（`6037e728a`）である。
- faraday差分のベースエンジン実行の1回が`SIGSEGV`でクラッシュした。再実行は正常に完了し、表には再実行の結果を記載している。
