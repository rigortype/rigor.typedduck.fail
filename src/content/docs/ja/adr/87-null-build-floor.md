---
title: "ADR-87 — NULLビルドのフロア：stat-then-digest検証、ゼロ変更スナップショットのスキップ、ヒットパスのブート軽量化"
description: "rigortype/rigor docs/adr/87-null-build-floor.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/87-null-build-floor.md"
sourcePath: "docs/adr/87-null-build-floor.md"
sourceSha: "f68ed79a78737f907e56c26ee37f4ec8829ed2e80d2c202d42b9d9d4b9bca3a9"
sourceCommit: "eb8e9996d113a1b5e1778d0988597c979814a219"
translationStatus: "translated"
sidebar:
  order: 4087
---

Status: **Accepted — WD1〜WD5実装済み（[PR #85](https://github.com/rigortype/rigor/pull/85)）**。 Rigorのウォームパスをビルドシステムの用語で捉え直し── NULLビルド（変更ファイルゼロ）と単一編集ビルド ──、本質的でない計測済みフロア構成要素を3つ取り除く：すべてをダイジェストする検証、無条件のスナップショット書き換え、そして一度も使わないエンジン全体をブートするヒットパスである。[ADR-54](../54-cache-slimming/)の「mtime fast-path — Rejected」の行を、新たな証拠とより強力な設計に基づいて置き換える。ダイジェストは依然として変更を判定する唯一の権威（AUTHORITY）のままである。

根拠：[`20260714-nullbuild-recon.md`](../../notes/20260714-nullbuild-recon/)（このADRが読み解くフェーズ帰属マトリクス）＋[`20260713-corpus-perf-campaign.md`](../../notes/20260713-corpus-perf-campaign/)。

## Context

キャンペーン後（PR #74〜#82）、`origin/master`で計測されたフロア（プロセス外の実時間。ユーザーが体感する数値。RIGOR_DISABLE_YJIT=1）：

| シナリオ | mail (111f) | rigor lib (326f) | gitlab app/models（1,225f + 10プラグイン） |
|---|---:|---:|---:|
| A — null、デフォルト（ADR-45 HIT） | 0.357s | 0.360s | 1.678s |
| B — null、`--incremental` | 0.389s | 0.462s | 2.243s |
| C — 1編集、`--incremental` | 0.825s | 0.790s | 11.6s（ハブ編集） |
| D — 1編集、デフォルト（＝フルビルド） | 3.7s | 5.9s | 〜21s |

フェーズ帰属によって、本質的でない質量の在り処が特定される：

1. **モノレポのnullは検証律速である**。 gitlabのHITは**毎回115 MBを52,739ファイルにわたって再SHA-256する**── ADR-45の`fresh?`依存集合（32,827ファイル／74 MB）に、ADR-60のプラグイン`watch:`グロブ（19,912／40 MB。Railsプラグインは`app`＋`lib`のすべてを監視しており、解析対象集合を圧倒する）を加えたものである。ブートは1,678msのうち287msを占める。**しかしダイジェストのCPUが実時間ではない**── 115 MBのSHA-256は〜50msであり、質量はプラグイン`#prepare`のプリパスロジック＋`Dir.glob`列挙＋Marshalであって、これがヒットのたびにADR-45の判定より前に走る（〜0.8s）。加えてダイジェストが強制するファイルの読み込み（ページキャッシュからなら安価だがコールドでは実コスト）がある。statティアが読み込みを取り除き、ヒット時にプリパスを丸ごとスキップすることで残りを取り除く。
2. **小中規模のnullはブート律速である**。解析は6〜55ms。〜0.36sの実時間は、〜245msの`bundle exec`によるBundler税（gemインストール済みバイナリでは不在）、〜90〜150msのengine＋rbs＋prismのrequire、〜50msのVM起動である。require国勢調査によれば、`check`パスでは**145個すべてのrequireがキャッシュ判定より前に**ロードされ、**HIT時にはその後1つもファイルがロードされない**── エンジンは何もしないためだけに完全にブートされている。RBS環境は毎回のHITで構築される（gitlabで39ms）が、それはキャッシュKEYに供給するためだけであり、そのKEYは`gems`＋`configs`を読むのであって環境そのものを読むわけではない。
3. **変更ゼロの`--incremental`は無条件にスナップショットを書き換える**（`run_incremental`は常に`snapshot.save`する：gitlabで209ms＋2.06 MB）。
4. 1〜3のあとに残るものは本質的である：編集時のクロージャ再解析（リーフ≈0.25s、ハブ≈4.3s── ADR-46の保守的クロージャが仕事をしている）と、プロセス／VM起動である。

## Decision

3つのフロア構成要素を、1つの規準のもとで取り除く：**SHA-256ダイジェストはファイル内容が変わったか否かの唯一の権威のままであり、statティアはダイジェストの再計算が必要かどうかだけを判定し、ヒットパスはヒットが一度も使わない機構なしで応じる**。具体的には：

- 依存検証を**stat-then-digest**にする：検証専用のファイルエントリーはそれぞれ、ダイジェストに加えてstatタプル`(size, mtime_ns, ctime_ns, inode)`を格納する。検証はまずファイルをstatし、タプルが動いたとき（またはracyガードが発火したとき）にのみダイジェストを再計算する。statが動いてもダイジェストが同じファイル（`touch`）は依然FRESHである── 現在より偽の無効化が厳密に少なく、決して多くはならない。動いていないタプルを信頼して再ハッシュをスキップするのは、gitが獲得したガードを備えたgitインデックスのモデルそのものである：ナノ秒タイムスタンプ（APFS/ext4はいずれも提供する）、タプル内の`ctime`（`utimes`では設定できない── ティアを破るにはroot／クロック操作が必要であり、ローカル開発ツールの脅威モデルの外にある。しかもRigor自身のキャッシュディレクトリは、そのようなアクターにとって同じく書き込み可能である）、inode識別、そしてracyウィンドウ再ハッシュ（mtimeがエントリーの記録時刻より厳密に古くないファイルは常に再ハッシュされる）。エスケープハッチが旧挙動を固定する：`cache.validation: digest`（config）／`RIGOR_STRICT_VALIDATION=1`（env。こちらが勝つ）。
- `check`の**ヒットパスはエンジンのロード前に応じられる**：軽量プローブがADR-45のランキャッシュキーをconfigだけから組み立て、格納された依存記述子を検証し（stat-then-digest）、キャッシュされた診断を提供する── 推論エンジンも、プラグインgemも、RBS環境も一切要求しない。

これはADR-54の却下の行を、その行自身の土俵で置き換える：あの行は節約分をMastodon規模で〜50〜150msと値付けし、ダイジェストを権威から置き換えてしまう**素の**mtimeチェックを却下した。タプル設計はダイジェストの権威を保ち、計測された節約分を支配するのはダイジェストのCPU（小さい）ではなく、stat検証されたヒットがプローブに**スキップ**させるもの（エンジン全体＋プラグインのプリパス）である：gitlabのnull 1.68s → 計測ホストで**0.34s**。

## Working decisions

- **WD1 — 既存`FileEntry`フォーマット上の`:stat`比較器（comparator）**。
  `Cache::Descriptor::FileEntry`は既に`(path, comparator, value)`を`VALID_COMPARATORS`レジストリとともに保持しており（秒解像度の`:mtime`比較器がその先例）、`:stat`は`digest + size + mtime_ns + ctime_ns + inode + recording_instant_ns`を値の文字列にパックする。記録時刻（ランごとに一度、`FileDigest.with_run`で捕捉される）がracyガードを駆動する。`SCHEMA_VERSION`を4→5にしてクリーンな一発リビルドを行う（旧エントリーはミスとして読まれる── #57のマーカーの規律）。`Cache::FileDigest`（唯一のハッシュ化のチョークポイント＋ランごとメモ）は`pack_stat`／`stat_fresh?`を得る── `Descriptor#fresh?`／`file_entry_fresh?`が共有するstat優先の読み込みパスである。`:stat`エントリーは**検証専用の記述子だけ**に乗る（ランナーのラン依存記述子、遅延`RbsDescriptor.build_run`ファイル、プラグイン`IoBoundary`の読み込み）。すべてのKEY記述子は`:digest`を保つ（その値は決定的でなければならない）。
- **WD2 — `GlobEntry`配下の同一ティア**（プラグイン`watch:`検証）。ADR-87以前の`GlobEntry`の値は、ファイルごとの`"<path>\0<content-sha256>\n"`行にわたるSHA-256だった── 検証のたびにすべてのファイルを再度**読み込んで**いた。WD2は同一の**単一集約ハッシュ**の形（Marshalに軽く、決定的で、合成安全）を保つが、ハッシュ化するのは**statタプル**である：ソート済みの`"<path>\0<size>\0<mtime_ns>\0<ctime_ns>\0<inode>\n"`行にわたるSHA-256。`fresh?`は再グロブ＋再statして比較する── 変更のないツリーでは**ファイル内容バイトをゼロ**読み込む（gitlab：40 MB → 0ハッシュ）。strictモードは内容ハッシュの署名を復元する。これが、それをまだ走らせるincremental／ミスパスにおけるプラグインのプリパスのダイジェストコストを潰すものである。

  > **ドラフトからの乖離（明示）：**ドラフトは*ファイルごとのstat-or-digestテーブル*（ファイルごとに1行、値に保持）を提案し、statが動いたファイルだけが再ハッシュされるようにした。実装して計測したところ、gitlabのincremental nullが1.85s → **5.3s**に退行した：2万ファイルの監視ツリーは〜2.5 MBのグロブごとテーブルを作り、その`Marshal.dump`／`load`＋パースが、節約した内容ハッシュを圧倒した。監視された依存は全か無か（1ファイルの変更がプロデューサーのキャッシュを無条件に無効化する）なので、ファイルごとの部分再ハッシュは重いテーブル以外に何も得なかった。集約statシグネチャは旧形式と同じ単一ハッシュの形── 軽量 ──であり、なおnullで内容バイトを0読み込む。旧来の内容シグネチャに対する唯一のコストは、素の`touch`がグロブを無効化することである（稀であり、しかも旧形式が**毎回**支払っていた再計算を強制するに過ぎない）。
- **WD3 — 変更ゼロのスナップショット保存スキップ**。 `run_incremental`は、再チェックが何も変えなかったとき（`Recheck#no_change?`── ΔFが空、追加／削除なし）`snapshot.save`をスキップする── ディスク上のスナップショットは既にバイト等価である。コールドベースラインは常に保存し、実際の編集は常に再保存する。
- **WD4 — ヒットパスのブート軽量化**。 `CheckCommand#run`はエンジンなしでオプションをパースし＋configを解決し、`load_check_dependencies`より前に軽量な`Analysis::RunCacheProbe`を参照する。プローブは共有の`Analysis::RunCacheKey`（ランナーが使うのと同じビルダー── だから両者がキー合意から乖離することはあり得ない）を通してランキャッシュキーを組み立て、`RBS::VERSION`（`require "rbs/version"`経由）＋config由来のライブラリリスト（`Environment::DEFAULT_LIBRARIES + config.libraries`）をRBS環境を構築せずに読む。フレッシュな`Store#peek_validated`ヒット時にはキャッシュされた診断を提供し（重大度プロファイルは抽出された`Analysis::SeverityStamp`経由で適用される）、リターンする。エンジンクラスタがロードされるのはミス／キャッシュ不可のラン（`--no-cache`、エディタバッファ、プールモード、`--coverage`／`--cache-stats`／`--incremental`、`RIGOR_*_TRACE`の開発プローブ── それぞれがプローブを辞退する）のときだけである。ヒットをエンジンフリーにするには、CLIから2つのロード時エンジン参照を切り離す必要があった：ルールID定数を軽量な`check_rules/rule_ids.rb`へ移し（`RuleCatalog`／`config_audit`がエンジン重量級の`check_rules.rb`をrequireしなくなる）、`coverage_scan`／`check_runner_factory`を遅延requireにした。HITランの`$LOADED_FEATURES`が`rigor/inference`（および`rigor/analysis/runner`／`rigor/environment`）のエントリーを含まないことを主張する**サブプロセス**specで固定し、それらを**ロードする**MISSの対照を置く。プラグインが仮想RBSを合成するプロジェクトは、`rbs.virtual_rbs`スロットを省いたプローブキーを生成するので、単純にミスしてフルパスが引き継ぐ── 誤ったヒットには決してならない。
- **WD5 — 陳腐化specバッテリー（WD1/WD2のゲート）**。作り込んだケース群で、それぞれ診断の結末を主張する：touchのみ（statが動き、ダイジェストが同じ → FRESH、偽の無効化なし）；通常の編集（陳腐化）；同サイズの編集（mtime/ctime経由で陳腐化）；同サイズ＋mtimeをバックデートした編集（ctime経由で陳腐化）；racyエントリー（タプルが一致しても再ハッシュされる）；`with_run(strict:)`／`RIGOR_STRICT_VALIDATION=1`が全体でダイジェストパスを強制する；加えてエンドツーエンドの偽無効化ガード── 2つのキャッシュ裏付けランの間のtouchのみの変更はHITのままである（ディスカバリーを再実行せずに提供され、診断はバイト一致）。

## Rejected / deferred alternatives

- **権威としての素のmtime比較器** — 却下のまま（ADR-54の実際の標的）。ここではダイジェストが権威のままである。
- **ファイルごとのstat-or-digestグロブテーブル** — 実装し、gitlabのincrementalで2.9×の退行（Marshal律速）を計測し、集約statシグネチャに差し戻した（上記WD2の乖離）。
- **FSイベント無効化／デーモン** — ADR-86 WD4のはしごに留まる。このADRははしごの最初の段を適切に済ませたものである（それ以降、null buildにおけるデーモンの残存価値は〜0.2sのブートフロアのみとなる）。
- **incrementalをデフォルトに** — このADRがA/Bのギャップを狭めたあとには実際の候補となるが、それはADR-50のデフォルト変更であり、それ自身のソーク（soak）ストーリーを持つ。ここでは意図的に**束ねない**。
- **並列statスイープ** — 52kの`File::Stat`呼び出しは逐次で〜50〜100ms。この規模ではスレッドは何も加えない。WD1後のプロファイルでstatが支配的だと示された場合にのみ再検討する。

## Consequences

計測されたbefore → after（計測ホストでのプロセス外実時間、RIGOR_DISABLE_YJIT=1。ダイジェスト国勢調査＝ファイル**内容**にわたるSHA-256）：

| シナリオ | before | after | 注 |
|---|---:|---:|---|
| gitlab A（null HIT） | 1.41s | **0.34s** | WD4がプリパス＋エンジンをスキップ。115 MB → **0バイト**ハッシュ |
| gitlab B（null `--incremental`） | 1.85s | **1.44s** | WD1/WD2のstat検証＋WD3の保存スキップ。67 MB → 3.45 MB（ADR-46の変更検出の読み込みのみ。グロブの読み込みは0） |
| gitlab C（1編集ハブ`--incremental`） | 8.65s | **8.55s** | 中立── クロージャ律速であってグロブ律速ではない（下記参照） |
| mail A／rigor-lib A（null HIT） | 0.37s / 0.38s | **0.22s / 0.22s** | WD4のエンジンフリーヒット。残余はBundler税＋VM |

- ポジティブ：モノレポのnull ≈ 1.68s → 〜0.34sとなり、真のnullでは内容バイトを0ハッシュする。小規模プロジェクトのnull ≈ 0.36s → 〜0.22s。変更ゼロの`--incremental`はスナップショットの書き換えをやめる。検証は偽の無効化を厳密に少なくする（`FileEntry`についてtouch安全）。
- **gitlab Cに関する正直な注記：**偵察は〜5〜6sを期待し、11.6sのうち〜5.4sをプラグインのグロブダイジェストに帰していた。ホストで再計測したところ、その帰属はNULLビルドの帰属と同じように間違っていた：グロブの質量は`Dir.glob`列挙＋Marshal＋プラグイン`#prepare`ロジックであって、内容ハッシュ（ページキャッシュで安価）ではない。WD2は内容読み込み（0バイト）を取り除くが、列挙／Marshalは取り除かない。そしてCは本質的なハブクロージャ再解析に支配されている── よってCは投影された2×ではなく**中立**である。ADRは得ていない勝利を主張するのではなく、これを記録するように訂正した。
- ネガティブ：statタプルはマシンローカルである（コピーされたキャッシュは一度再ダイジェストし再記録する── 任意のミスでの今日の挙動と同じ）。ブート分割はrequire順序のサーフェス（WD4サブプロセスspecで固定）と、2つ目のキー構築呼び出し箇所（`RunCacheKey`。ランナーと共有され乖離し得ない）を加える。シンセサイザープラグインを持つプロジェクトはWD4のファストレーンを放棄する。凍結されたキャッシュ語彙に比較器が1つ増える。
- 偽陽性（FP）の規律のエンベロープ：陳腐化した診断を提供するには、今や`size+mtime_ns+ctime_ns+inode`を同時に破る必要がある── root／クロック操作 ──のに対し、今日はSHA-256を破ることが要求される。ADRはこれを意図的で境界の定まったトレードとして記録する。strictフラグはランごとに旧エンベロープを復元する。

## Relationship to other ADRs

[ADR-45](../45-unchanged-project-fast-path/)がrecord-and-validateを所有する── そのダイジェストの権威は保たれ、その検証コストがWD1の取り除くものであり、そのヒット判定がWD4のエンジンフリーで提供するものである。[ADR-54](../54-cache-slimming/)の却下の行は置き換えられる（その前提は再計測され、設計はダイジェストの権威を保つ）。[ADR-60](../60-pre-freeze-plugin-contract-consolidation/)の`watch:`機構がWD2を宿す。[ADR-46](../46-incremental-dependency-graph/)／[ADR-85](../85-seed-bundles-and-lazy-def-node-handles/)がWD3の刈り込むincrementalパスを所有する。[ADR-86](../86-partial-native-extensions/)のWD4非ネイティブはしごが1段進む。[ADR-50](../50-release-engineering-and-stability-strategy/)が将来のincrementalデフォルト化の反転を所有し、新しい`cache.validation`configキー＋`:stat`比較器をv1.0で公開語彙として凍結する。
