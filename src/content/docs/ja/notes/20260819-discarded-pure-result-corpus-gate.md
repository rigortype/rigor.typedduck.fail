---
title: "`effect.discarded-pure-result`（#390）はコーパスで14回発火し、14回すべてが誤りである"
description: "rigortype/rigor docs/notes/20260819-discarded-pure-result-corpus-gate.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260819-discarded-pure-result-corpus-gate.md"
sourcePath: "docs/notes/20260819-discarded-pure-result-corpus-gate.md"
sourceSha: "f399c5e6a6df5cf4e75ef8f8f639d96da1ed5cc6796e93347bb7e98f291be913"
sourceCommit: "bed65a462b04db02312f208b9dda2dda3a26ef13"
translationStatus: "translated"
sidebar:
  order: 20266819
---

ステータス: 計測ノート、設計上のコミットメントはなし。ハーネスはブランチ[`measure/discarded-pure-result`](https://github.com/rigortype/rigor/tree/measure/discarded-pure-result)（コミット`c6d72702`、意図的に未マージ）;そのブランチをチェックアウトして再実行すること。

Issue #390は`effect.discarded-pure-result`を提案する: 結果が使われない呼び出し文で、呼び出し先の証明済みサマリーが網羅的かつ読み取り形（read-shaped）の集合（`global.read`・`nondet.*`・`io.fs.read`）の内側にあり、かつ呼び出し先が全域（total）であるもの——Rubyの非bangの足元の銃（footgun）（`str.strip`、`arr.sort`、`hash.merge(x: 1)`、`each`として使われる`list.map { … }`）だ。コーパス偽陽性ゲート待ちで`:off`として出荷される。`docs/CURRENT_WORK.md`はルールが書かれる**前に**発火を数えるよう求めた。ここで数えた。答えは**3プロジェクトにわたって14回の発火、そのすべてが偽陽性であり、ルールがその名の由来とする足元の銃はコーパスのどこにも1件も存在しない**。

独立した2つの発見があり、どちらか一方だけでも失格に足る:

1. **受け入れフィクスチャは、issueが名指すどちらのゲートの下でも通らない**（§1）。これはカタログファイルに対する机上チェック（desk check）であり、コーパスの実行を必要としなかった。
2. **ルールの到達可能なドメインは7,151サイト中43サイトであり、ゲートを通過する14件はすべて副作用のための反復である**（§2、§3）。

## 1. 全域性ゲートは使える形では存在しない

#390は、検証としてのraiseのイディオム（意図的に破棄される`hash.fetch(:k)`・`Integer(x)`・`JSON.parse(x)`）を「カタログの`raises`ファセット／定数畳み込みの全域性基準」でゲートする。どちらも機能せず、しかも互いに逆方向に失敗する。

| 名指された受け入れケース | 期待 | `raises`ファセット | `FOLDABLE_PURITIES` |
| --- | --- | --- | --- |
| `s.strip` | 発火 | `raises: false` ✅ | `leaf` ✅ |
| `xs.map { \|x\| x * 2 }` | 発火 | `raises: false` ✅ | `block_dependent` ❌ |
| `arr.sort` | 発火 | `raises: false` ✅ | `mutates_self` ❌ |
| `h.fetch(:k)` | 沈黙 | `raises: false` ❌ | `block_dependent` ✅ |
| `Integer(x)` | 沈黙 | カタログ未収載 | カタログ未収載 |

**`raises`ファセットの下では名指された陰性ケースが発火し、畳み込み基準の下では名指された3つの陽性ケースのうち2つが発火しない**。2つをどう合成してもフィクスチャは通らない。この証拠の上では、2つのゲートが意図と互いに逆方向に食い違っているからだ。

各セルには、別々に記録しておく価値のある機械的な原因がある:

- `Hash#fetch`が`raises: false`と読めるのは、抽出器の`RAISE_RE`（[`tool/extract_builtin_catalog.rb:835`](../../tool/extract_builtin_catalog.rb)）が`rb_raise\w*`とキュレーション済みの4つのヘルパーにマッチする一方、`rb_hash_fetch_m`は**`rb_key_err_raise`**（`references/ruby/hash.c:2156`）を通してraiseするからだ。`\brb_raise`は`rb_key_err_raise`の内側にはマッチできないので、このトークンは不可視になる。同じ穴が`rb_exc_raise`（103呼び出しサイト）・`rb_sys_fail`（184）・`rb_name_err_raise`（30——キュレーション済みリストには惜しい兄弟`rb_name_error`があることに注意）・`rb_syserr_fail`・`rb_eof_error`・`rb_enc_raise`・`rb_memerror`を呑み込む。
- `Array#sort`が`mutates_self`と読めるのは、`rb_ary_sort`が`ary = rb_ary_dup(ary); rb_ary_sort_bang(ary);`であり、`mutates?`が所有権解析の走る*前に*キュレーション済みの生ミューテーターリストで短絡したからだ——`rb_ary_sort_bang`が本体に現れ、dupに適用されている。（再束縛ガードはこの再代入をすでに検出していた;それは短絡がスキップした分岐の上に座っていた。本ノートの以前の版は、原因をそのガードの誤発火に誤って帰していた。）`raises`の穴の#417とともに#418で修正済み;`Hash#fetch`はいまや`raises`を運び、`Array#sort`は非変更である。どちらも推論される型は変えない——これらの形の上でファセットには振る舞い上の消費者がいなかった。
- `Kernel#Integer`はどちらのファセットも持たない: `Kernel`は`data/builtins/ruby_core/`配下の21のトピックファイルに含まれていない。

`raises`の再現率（recall）の穴の規模。C本体の位置を特定できるカタログ収載の1,255メソッドにわたって計測した:

| | 全行 | 畳み込み可能純粋性の行 |
| --- | --- | --- |
| `raises: false`なのに本体に**直接の**raiseヘルパー | 35 | 31 |
| `raises: false`なのに引数強制／アリティ／frozenガード | 102 | 46 |

ファセットの名誉のために言えば、この穴は*このルールにとっては*ほぼ無害だ: 畳み込み可能な直接raiseする31メソッドのうち30は、エフェクトゲートがすでに除外する`IO` / `File` / `ARGF` / `Date`のメソッドであり、ガードの取りこぼしは不正な引数に対する`rb_num2*`のTypeErrorであって、検証イディオムではない。失格に足るセルは、issueが名指すただ1つ——`Hash#fetch`——だ。

## 2. ファネル: 7,151の破棄位置サイト、14回の発火

プローブは破棄文位置にある呼び出しごとに1行を出力し、エフェクトスキャン自身がそこで決定したこと——その呼び出しが寄与したラベル、立てた汚染、タイパーの`CallRecord`——を運ぶ。行はオフラインでビルトインカタログの`purity`／`raises`ファセットと結合される。対象と方法は[B2.2ノート](../20260818-b22-ivar-reset-headroom/)に合わせた: redmine `a12198ea0`、mastodon `163f96cee`、`rigor lib`はプローブブランチ`c6d72702`のこのリポジトリ;スクラッチ設定は`effects: {}`・`parallel: {workers: 0}`・スクラッチの`cache.path`を運び、ベースラインなし。

| ゲート | `rigor lib` | redmine | mastodon | 合計 |
| --- | --- | --- | --- | --- |
| G0破棄文位置の呼び出し | 1,919 | 2,824 | 2,408 | **7,151** |
| G1 +サイトが網羅的（汚染なし） | 740 | 708 | 882 | 2,330 |
| G2 +証明ラベルが読み取り形 | 544 | 497 | 768 | 1,809 |
| G3 +レシーバーが型付きで非`Dynamic` | 511 | 409 | 623 | 1,543 |
| G4 +呼び出し先がカタログ収載のコアメソッド | 30 | 6 | 7 | **43** |
| G5 …`raises`ファセットが偽（ゲートA） | 29 | 3 | 7 | 39 |
| G6 …純粋性が畳み込み可能（ゲートB） | 12 | 1 | 1 | 14 |
| G7 …両方 | 12 | 1 | 1 | **14** |

**G3 → G4がルールの死に場所だ: 型付けされた破棄位置サイト1,543のうち、ルールがゲートできる呼び出し先の上にあるのは43**。これは計測のアーティファクト（artifact）ではない。#390が名指す2つの全域性ゲートはどちらもカタログのファセットであり、設計はその理由を述べている——「Rigorはthrow集合を追跡しない」。したがって*プロジェクト*のメソッドはいかなる種類の全域性の証拠も持たず、どれほどよく型付けされていてもゲートを通過できない。ルールの到達可能なドメインはコアカタログ収載の呼び出し先であり、それは型付きサイトの2.8%だ。

## 3. すべての発火は副作用のための反復である

14件すべてを手で裁定した:

| 呼び出し先 | 件数 | サイト |
| --- | --- | --- |
| `Hash#each_value` | 9 | `plugin_facts.rb:314,316,318,320,323` · `incremental.rb:33,57` · `file_collection.rb:105` · `registry.rb:181` |
| `Hash#each` | 3 | `envelope_check.rb:106` · `scope_indexer.rb:85` · mastodon `multibase.rb:38` |
| `Set#each` | 1 | `scope_indexer.rb:456` |
| `Hash#each_key` | 1 | redmine `user_preference.rb:171` |

**真陽性ゼロ、偽陽性14**。どれ1つとして、結果を保持するつもりだった非bang呼び出しではない。5つの異なるメカニズムがそれらを生んでおり、そのそれぞれがルール自身のゲートには見えない穴だ:

- **`mutate.local`は設計上容認されており、ローカルへの蓄積は破棄される反復の最もありふれた形だ**。`envelope_check.rb:106`は`envelopes.each { |k, e| collect(findings, …) }`で、フレーム所有のローカルに追記している。`Summary::TRIVIAL_BOUND`はフレームローカルな変更を純粋と読ませる。これはエンベロープにとっては正しく、ここではまさに間違っている: `xs.each { acc << x }`の*呼び出し元*にとっては、フレームローカルな変更こそが眼目だからだ。
- **外側のローカルを再代入するブロックは、ラベルをまったく立てない**。`scope_indexer.rb:85`は`program_globals.each { |name, type| seeded_scope = seeded_scope.with_global(name, type) }`だ。ローカルへの書き込みはどのレーンでもエフェクトではない。
- **`&:sym`はミューテーターに対する封じ込めを迂回する**。`file_collection.rb:105`は`includes.each_value(&:uniq!)`だ。`visit_block_argument`は`SymbolNode`で早期リターンし、歩くべき本体がないので、このサイトは∅+網羅的と読める——一方、*同じ仕事*を`each_value { |v| v.uniq! }`と綴れば`unknown-ownership`の汚染が立ち、正しく除外される。フィクスチャ上で対にして検証済み;2つの綴りは正反対の判定を受ける。
- **`freeze`はどこでもエフェクトとしてモデル化されていない**。9つの`each_value(&:freeze)`サイトはどちらの綴りでもクリーンだ——エフェクトカタログも`MutationClassifier`もfreezeを変更として扱わない。呼び出し元から明白に観測可能であるにもかかわらず。
- **非ローカルに脱出するブロックには、破棄すべき結果がない**。mastodonの`multibase.rb:38`は`MULTICODEC_PREFIXES.each { |tag, prefix| return […] if … }`だ。このループ*こそが*制御フローである。設計はこの形を一度も考慮していない。

## 4. 足元の銃はコーパスにない

上の裁定はゲートが何を通すかについてのものだ。逆の問い——ルールは本物の足元の銃をゲートで締め出しているのか？——には直接あたった。全数調査のすべての行を、破棄位置にある非bangの足元の銃セレクタ（`strip`・`sort`・`map`・`merge`・`uniq`・`compact`・`gsub`・`select`・…の33セレクタ）についてスキャンした。7,151行すべてにわたってそのような呼び出しは**27件あり、型付きで網羅的でラベルなしのサイトまで生き残るのはちょうど2件**——どちらも`rigor lib`内で、どちらも正しいコードだ:

- `local_ownership.rb:40`——`collect(body, assignments, escaped)`はモジュール自身の再帰的コレクターであって、`Array#collect`ではない。引数を変更する。
- `local_ownership.rb:41`——`escaped.merge(trailing_reads(body))`。**`Set#merge`は破壊的だ**。設計の例のリストは`hash.merge(x: 1)`を足元の銃として名指すが、同じセレクタも`Set`の上ではミューテーターであり、`Array#concat`と`Set#subtract`もそうだ。「非bangなら純粋」はセレクタ名の性質ではない。

`rigor lib`はコーパスで最もよく型付けされた対象であり——その破棄位置サイト1,919のうち511がG3を通過する。redmineは2,824のうち409——それでも真陽性はゼロだった。「型が良くなれば直る」という反論はこれを生き延びない: 改善は逆方向に走っている。

## 収量のパーセンテージでは計れなかったであろうもの

- **ルールの上限は精度の問いではなくドメインの問いだ**。7,151中43のゲート可能サイトが話のすべてであり、それは別々の文書に述べられた2つのファクトの相互作用から来る——全域性ゲートはカタログ限定であり、破棄される呼び出しの大半はプロジェクトコードへのものだ。どちらも単独では問題として読めない。
- **エンベロープ向けにチューニングされたエフェクトシステムは、破棄に対してはチューニングがずれている。そしてそれはバグではない**。`mutate.local`の容認、`freeze`がエフェクトでないこと、`&:sym`が汚染を立てないことは、どれも「このメソッドのコードは世界に何をするか」に対しては正しい。破棄ルールは別の問い——「この文は呼び出し元のために何かをしたか」——を発し、最初の問いへの答えを継承する。5つの偽陽性メカニズムのうち3つはそのミスマッチだ。
- **受け入れフィクスチャを実物のカタログファイルに対して書き出してみることは机上チェックである**。§1は1時間足らずで済み、それだけで失格に足る;#389が教えたのと同じ教訓であり、基準がまたも評価されずに仮定されたために繰り返された。
