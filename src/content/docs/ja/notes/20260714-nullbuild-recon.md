---
title: "nullビルド＆単一編集のフェーズ帰属リコン（2026-07-13）"
description: "rigortype/rigor docs/notes/20260714-nullbuild-recon.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260714-nullbuild-recon.md"
sourcePath: "docs/notes/20260714-nullbuild-recon.md"
sourceSha: "334d9ba2b5d3115d4699fc76c49683005a149dbf476ab3d00e8565e7880b0bf6"
sourceCommit: "eb8e9996d113a1b5e1778d0988597c979814a219"
translationStatus: "translated"
sidebar:
  order: 20266714
---

> [ADR-87](../../adr/87-null-build-floor/)の地固め──nullビルド＆単一編集のフェーズ帰属リコン（recon）。


エンジン: `origin/master` = `92a275c3`のワークツリー（ADR-84 return-memo、ADR-85
seed-bundles/lazy-handles、ADR-86の後）。Rigor 0.2.9、Ruby 4.0.5（+PRISM、arm64-darwin25）、
`RIGOR_DISABLE_YJIT=1`、APFS。ワークツリーのGemfile＋共有の
`/Users/megurine/repo/ruby/rigor/vendor/bundle`をflake内で用いて計測。

対象: **mail**（`lib`、111ファイル、0プラグイン）· **rigor-lib**（`lib`、326ファイル、0
プラグイン）· **gitlab**（`app/models`、1225ファイル、`.rigor.dist.yml`経由で10プラグイン）。
すべての実行は`--no-baseline`でエンジンを分離。wall = プロセス外（`bundle exec exe/rigor`を
`time`で囲む、ブートを含む）。allocs = プロセス内のCLIドライバ（ブート除外）。

インストルメンテーションは100%スクラッチパッドのRUBYOPTプリロード（`phase_trace.rb`）
──**ワークツリーのソース編集ゼロ**。診断カウントは対象ごとにあらゆるシナリオで同一
（mail 26、rigor-lib 1、gitlab 210）= トレーサー／ハーネスは出力を乱していない。

---

## 1. マトリクス ── 対象別 × シナリオ別

Wall = N回のプロセス外中央値（N=5 mail/rigorウォーム、N=3 gitlabウォーム、遅いフルビルドは
N=1）、最小値を括弧内に。Allocs = プロセス内`GC.stat(:total_allocated_objects)`、フレッシュな
プロセスごとに1実行（Storeのプロセス内memoがrep≥2を非代表にする）。

| 対象 · シナリオ | Wall中央値（最小） | プロセス内allocs | プロセス内wall | GC ms |
|---|---|---|---|---|
| **mail** A null-default（ADR-45 HIT） | **0.357s**（0.350） | 185,532 | 0.147s | 11 |
| **mail** B null-incremental（ウォーム0変更） | **0.389s**（0.382） | 210,517 | 0.205s | 14 |
| **mail** C 1編集incremental（ウォーム） | **0.825s**（0.804） | 1,420,096 | 0.610s | 60 |
| **mail** D 1編集default（= フルビルド） | **3.719s** | 7,563,980 | 3.444s | 245 |
| **rigor-lib** A null-default HIT | **0.360s**（0.350） | 190,850 | 0.155s | 10 |
| **rigor-lib** B null-incremental | **0.462s**（0.447） | 306,456 | 0.268s | 17 |
| **rigor-lib** C 1編集incremental | **0.790s**（0.786） | 1,117,244 | 0.541s | 49 |
| **rigor-lib** D 1編集default（フル） | **5.914s** | 12,605,322 | 5.646s | 415 |
| **gitlab** A null-default HIT | **1.678s**（1.659） | 1,458,720 | 1.491s | 101 |
| **gitlab** B null-incremental | **2.243s**（2.182） | 2,205,462 | 2.113s | 207 |
| **gitlab** C 1編集incremental | **11.634s** | 26,437,308 | 10.687s | 841 |
| **gitlab** D 1編集default（フル） | **~21.04s** | 40,933,326 | 20.118s | 1456 |

見出し:
- 2つの*null*シナリオ（A、B）は小／中プロジェクトで安価（0.36～0.46s）だが、gitlabでは
  **1.7～2.2sを要する**──そしてそのgitlabコストはブート**ではなく**、キャッシュ再検証である
  （§4参照）。
- インクリメンタル1編集（C）はdefault 1編集（D）に**4.5×**（mail）、**7.5×**（rigor-lib）勝つ
  が、gitlabでは**~1.8×**のみ──編集したgitlabファイル（`label.rb`）が大きな依存クロージャを
  持つハブモデルだからである。
- **BはあらゆるターゲットでAより*遅い***（インクリメンタルnullはスナップショットI/O＋変更
  検出＋必須のプラグインプレパスを支払う。ADR-45 HITは1エントリーを検証する）。

---

## 2. ブート下限 ── マイクロベンチマーク（ワークツリーバンドル、5回の中央値）

| コマンド | 中央値 | delta |
|---|---|---|
| `ruby -e exit`（裸のnix Ruby、bundlerなし） | 0.051s | VM起動 |
| `bundle exec ruby -e exit` | 0.296s | **+0.245s = bundlerセットアップ** |
| `bundle exec ruby -e 'require "rigor/cli"'` | 0.326s | **+0.030s = rigor/cli require** |
| `bundle exec exe/rigor --version` | 0.236s | （CLIディスパッチ；サブブートノイズ±80ms） |

読み方: ~0.36sの小プロジェクトウォームwallのうち、<strong>~0.245sは`bundle exec` bundler
セットアップ──devバンドルからの実行のアーティファクトであり、`gem install`済みバイナリには
存在しない。</strong>裸のVMは~50ms。`require "rigor/cli"`単独はわずか~30msである。解析エンジンが
**遅延**されているからだ──`rigor/cli.rb`はCLIディスパッチ層をロードする。runner／推論／
environment／rbs／prism／psychのツリーは後で、`check`の開始時に
`CheckCommand#load_check_dependencies`（`lib/rigor/cli/check_command.rb:549`）でロードされる。

したがって*インストール済みバイナリ*の小プロジェクトウォーム下限 ≈ VM（50）＋
engine-require（~90～150）＋cached-analysis（6～18ms） ≈ **~150～220ms**。`bundle exec`実行は
その上に~245msのbundler税を加える。

---

## 3. require人口調査＆ロード順（シナリオA）

`require`ラッパーのセルフタイムはgemクラスタには信頼できる。rigor内部ファイルは
`require_relative`経由でロードされる（ワークツリーのbundlerを壊さずに安全にはラップできない）
ので、そのクラスタごとの*時間*は`:script_compiled`デルタの近似（過剰帰属する）
──**カウントとロード順は正確、内部サブクラスタのmsは示唆的にすぎない**。

**gemクラスタのセルフタイム（gitlab A、ms、信頼可能）:** bundler 69 · rubygems 38 · prism 40
（ネイティブ拡張＋リフレクション）· rbs 34 · psych 11 · stdlib ~76+38。**plugins 2.4ms合計**
──10のプラグイン*gem require*は安価である。そのコストはロードではなく`#prepare`/スキャン
である（§4）。

**ロード順マーク（トレーサーロード→run_analysisのプロセス内t、ロードされたreqs/scripts）:**

| 対象A | run_analysis-enter | cache-verdict | verdict後にコンパイルされたファイル |
|---|---|---|---|
| mail | t=232ms · 145 reqs / 575 scripts | t=239ms · 145 / 575 | **0** |
| rigor-lib | t=223ms · 145 / 575 | t=242ms · 145 / 575 | **0** |
| gitlab | t=287ms · 145 / 575 | t=328ms · **155 / 629** | **0** |

ロード順の問いへの回答:
- **`load_check_dependencies`はエンジンを遅延しているか？** *非check*コマンドについてはイエス
  （`--version`はエンジンを決してロードしない──30ms）。しかし`check`については、いかなる
  キャッシュ判断より前に**エンジン全体**（runner→inference→environment→rbs→prism→psych）を
  eagerにロードする: `run_analysis-enter`までに全145 require / 575 scriptは既に入っており、HIT
  では**キャッシュverdictの後に0個のrubyファイルがコンパイルされる**。rbs *gem*クラスはヒット
  パスで不可避である（キャッシュされたenvはRBSオブジェクトのMarshal blobであり → それを
  デシリアライズするにはそのクラスがロードされねばならない）。
- **ヒットパスでeagerにロードされ、再設計が遅延できるものは何か？** gitlabでは10のプラグイン
  gem＋54ファイルが`run_analysis`と`cache-verdict`の*間に*ロードされる（145→155 reqs、
  575→629 scripts）──すなわちADR-45 verdictの前に無条件で実行される
  `run_project_pre_passes`の間である。そしてRBS **environmentは構築される**（キャッシュから
  デシリアライズ、gitlab 39ms）──あらゆるHITで、キャッシュ*キー*の`gems`＋`configs`スロットの
  ために`RbsDescriptor.build_run`に`rbs_loader`を手渡すためだけに──キーは`RBS::VERSION`
  （定数）＋`loader.libraries`（設定から導出可能）しか必要としないにもかかわらず。推論エンジンの
  require**および**env構築をADR-45 verdictの後まで遅延することが、立っている機会である: HITは
  `fresh?`を検証しキャッシュされた診断をunmarshalするために、Store＋Descriptor＋設定＋
  Diagnosticクラスだけを必要とする。

---

## 4. digest人口調査 ── 大プロジェクトの下限はここに存在する

### シナリオA（ウォームADR-45 HIT）── `Cache::FileDigest.hexdigest`人口調査

| 対象 | hexdigest呼び出し | ハッシュしたMB（SHA-256） | 内訳 | stat風syscall |
|---|---|---|---|---|
| mail | 135 | 2.71 | fresh?/dep-desc: 111 `.rb`（2.60）＋24 `.rbs`（0.12） | file? 200, dir? 677, glob 16, binread 1 |
| rigor-lib | 390 | 3.23 | fresh?: 326 `.rb`（3.03）＋64 `.rbs`（0.20） | — |
| **gitlab** | **52,739** | **115.01** | fresh?/dep-desc **32,827（74.34）**＋plugin-glob **19,912（40.67）** | **file? 52,808**, dir? 1387, glob 21, stat 15, binread 5 |

gitlabを拡張子別に: 50,912 `.rb`（104.5 MB）、1,650 `.haml`（1.8 MB）、139 `.erb`、26
`.rbs`、**3 `.sql`（8.46 MB──`structure.sql`）**、9 `.yml`。

**これが発見だ**。 *ウォームHIT*でgitlabは**52,739ファイルにわたる115 MBを再SHA-256する**──
毎回。2つの消費者:
1. **ADR-45 `Descriptor#fresh?`**（32,827ファイル、74 MB）: 実行診断の依存descriptor。1,225の
   解析モデルよりはるかに大きいのは、Railsプラグインがprepare中に`app`＋`lib`全体をスキャン
   （コントローラー、全モデル、ビュー → 1,650 `.haml`、`structure.sql`）し、それらが読むあらゆる
   ファイルが記録された依存となり`fresh?`のたびに再digestされるからである。
2. **ADR-60 WD3プラグイン`watch:`-glob検証**（`GlobEntry.digest_for`、19,912ファイル、
   40 MB）: 各プラグインプロデューサーの`#prepare`キャッシュが、そのwatch集合を再グロブ＋
   再digestする。

スパンが分割を裏付ける（プロセス内ms、gitlab A）: `run_analysis` 1341.8 =
`run_project_pre_passes` **1090.3**（プラグインprepare/validate → `fetch_or_validate` ×5 =
932ms、40 MBのglob digest）＋`compute_run_diagnostics` **241.6**（ADR-45 `fresh?`、74 MB）＋
env-build 39.3。ブートは1678msのwallのうちわずか287ms。**gitlabのnull下限はI/O＋SHA-256束縛で
あり、ブート束縛ではない。**

小プロジェクト: `fetch_or_validate`は4.5ms（mail、135 digest）／10.5ms（rigor、390）──依存
ファイル数に線形にスケールする。これらのサイズではブートに矮小化される。

### シナリオB（インクリメンタルnull、0変更）── digest人口調査

| 対象 | hexdigest | MB | 内訳 |
|---|---|---|---|
| mail | 111 | 2.60 | 111 `incr_digest_read`（変更検出）；ADR-45 `fresh?`なし |
| rigor-lib | 326 | 3.03 | 326 `incr_digest_read` |
| gitlab | 29,746 | 67.38 | plugin-glob 19,912（40.67）＋plugin `fresh?` 8,609（23.40）＋1,225 `incr_digest_read`（3.31） |

インクリメンタルはADR-45の実行診断`fresh?`を*スキップ*する（`run_result_cacheable?`を除外）
が、依然として**フルなプラグインプレパス**（gitlabで40 MBのglob-validate）＋変更検出（ゼロ
変更を見つけるため解析対象の全ファイルをdigest）＋スナップショットI/Oを支払う。
`IncrementalSession#digest`はファイルごとに別の`Digest::SHA256.hexdigest(File.read(path))`
である。

### FSタイムスタンプ解像度（このAPFSホスト上でprobe）

`stat`は**フルナノ秒**の`mtime`/`ctime`/`birthtime`を返す（例: 3.98ms離れた2回の書き込み →
mtime_nsec 880402230対884381970；inode存在）。したがって`(size, mtime_ns, inode, ctime_ns)`の
stat記録はここで完全に実現可能である──そして既存の`:mtime`比較器がnsを捨てていること
（`File.mtime.to_i`、descriptor.rb:321）は自ら招いた粗さである。

---

## 5. シナリオ別のフェーズスパン（プロセス内wall ms；スパンはネストする）

**A（HIT）:** mail `run_analysis` 6.5 = compute 5.9（fetch_or_validate 4.5＋env 1.3）＋
expand 0.6 · rigor 18.2 = compute 16.0（fetch_or_validate 10.5＋env 5.5）＋expand 2.0 ·
gitlab 1341.8 = pre_passes 1090.3＋compute 241.6＋env 39.3。

**B（incr null）:** mail recheck 45.6 = run_analysis 40.5＋save 7.2＋load 3.5＋
discovery-fold 3.9 · rigor recheck 55.3 = **save 31.6＋load 21.1**（スナップショットI/O =
53msが支配）＋discovery 11.4 · gitlab recheck 1417 = **pre_passes 1189**（プラグイン
validate）＋**save 209＋load 171**（スナップショットI/O 380ms）＋discovery 40.6；ファイル
ごとの解析0.0。

**C（incr 1編集）:** mail recheck 462.8 = analyze_files **411.1**（body.rb＋その依存
message.rb）＋save 7.2＋load 3.7＋discovery 5.0 · rigor recheck 335.7 = analyze_files
**250**（reflection.rbクロージャ）＋save 34＋load 25＋discovery 14 · gitlab recheck 9907 =
**pre_passes 5361**（プラグインvalidate、57 MB）＋analyze_files **4272**（label.rbハブ
クロージャ）＋save 214＋load 184。

**D（フル）:** mail run_analysis 3366 = analyze_files 2782＋discovery 537＋dep-build 4 ·
rigor 5708 = analyze_files 5351＋discovery 282 · gitlab 19877 = analyze_files **13527**＋
pre_passes **5416**（プラグインbuild+validate、58 MB）＋discovery 660。

### シナリオC分解（変更検出vs再解析vsスナップショット書き直し）

| 対象C | 変更検出（digest+load+discovery） | 再解析（analyze_files） | スナップショット書き直し | 注記 |
|---|---|---|---|---|
| mail | ~15ms | 411ms（**89%**） | 7ms | body.rbが2159行のmessage.rbを引く |
| rigor-lib | ~45ms | 250ms（**74%**） | 34ms | reflection.rbは中程度のクロージャ |
| gitlab | ~230ms＋**plugin-prepass 5361ms** | 4272ms | 214ms | label.rb = ハブ；plugin-prepassが共支配 |

分割は**編集ファイルの結合度依存**である: leaf編集 → 変更検出＋（gitlabでは）固定の
plugin-prepassが支配。ハブ編集 → 再解析が支配。gitlabではplugin-prepass（~5.4sのglob
再検証）が**編集にかかわらずあらゆるインクリメンタル再チェックの固定税**であり、gitlab Cが
11.6sである最大の理由である。

### スナップショット書き直し（成果物#8）: **YES、シナリオBは毎回スナップショットを書き直す**。

`IncrementalSession#run_incremental`は（あらゆるウォーム再チェックの後に）ゼロ変更でも無条件で
`snapshot.save(...)`を呼ぶ。観測されたバイトサイズ変化（コールド→初回ウォームで、ADR-85 WD3が
生の`Prism::DefNode`を`DefHandle`と交換するにつれ縮小し、その後安定）: mail
115,870→89,088 · gitlab 2,391,313→2,061,363。書き直しコスト: mail 7.2ms · rigor 32～34ms ·
gitlab 209～214ms（deflate＋2 MBのファイルごとcache/digests/bundlesのMarshal.dump）。対応する
`snapshot.load`（inflate＋unmarshal）は3.5 / 21 / 171～184ms。したがってスナップショットの
往復は、何も変えないためにnullインクリメンタルが支払う純粋なI/Oオーバーヘッド**~10ms /
53ms / 380ms**である。

---

## 6. statキャッシュの設計サーフェス（コードに根ざす）

ファイル（ワークツリーパス）:
- `lib/rigor/cache/file_digest.rb:42` ── `FileDigest.hexdigest(path)` → `Digest::SHA256.file(path).hexdigest`
  （実行ごとのスレッドローカルmemo）。単一のハッシュチョークポイント。`file_entry_fresh?`
  （`:digest`）、`GlobEntry.digest_for`、`Runner#analyzed_file_entries`、
  `RbsDescriptor.file_entries`から呼ばれる。
- `lib/rigor/cache/descriptor.rb:314` ── `Descriptor#file_entry_fresh?(entry)`: `:digest`が
  再ハッシュする（314-319）。**`:mtime`は既に存在する**（320-321）: 
  `File.mtime(entry.path).to_i.to_s == entry.value`──**ただし秒解像度、size/inodeなし**。
- `lib/rigor/cache/descriptor.rb:35` ── `FileEntry`、`value_fields :path, :comparator, :value`；
  `VALID_COMPARATORS = %i[digest mtime exists]`（:38）；`value`は自由形式のfrozen String
  （:52）。
- `lib/rigor/cache/descriptor.rb:178` ── `GlobEntry.digest_for(root:, pattern:)`: ソートされた
  `"<path>\0<content-sha>\n"`行にわたるSHA-256。comparatorフィールドなし（常にcontent-hash）。
- `lib/rigor/cache/descriptor.rb:226` ── `Descriptor#fresh?`は
  `files.all?(&file_entry_fresh?)`＋`globs.all?(&glob_entry_fresh?)`をイテレートする。
  あらゆる`Store#fetch_or_validate`ヒットで*保存された*依存descriptorに対して呼ばれる
  （`store.rb:227-228`）。
- `lib/rigor/cache/descriptor.rb:30` ── `SCHEMA_VERSION = 4`；キャッシュキー
  （`cache_key_for`）と`schema_version.txt`マーカー（`store.rb`の`schema_marker_value`）に
  折り込まれるので、bumpは次の書き込み可能な実行でルートをクリアする。

**`(size, mtime_ns, inode, ctime_ns)`記録は、スキーマ破壊なしに既存のフォーマットに乗れるか？**

- **FileEntry: YES、新しい構造体フィールド不要**。記録は既存の`(path, comparator, value)`
  トリプルに収まる──`:stat`値を`VALID_COMPARATORS`（descriptor.rb:38）に追加し、タプルを
  `value` Stringにパックする（例: `"S<size>:M<mtime_ns>:C<ctime_ns>:I<ino>"`）。
  `file_entry_fresh?`は`:stat`ケースを得る: `File::Stat.new(path)` → パック → `entry.value`と
  比較。既存の`:mtime`比較器が、非digestのfreshnessシグナルが既に`value`に乗っている*証拠で
  ある*──ただ粗いだけだ。`comparator`は`to_canonical_hash`に参加するが、ADR-45の
  **キャッシュKEY**（`run_key_descriptor`）は依存`files`ではなく`gems`＋`configs`から構築される
  ので、依存descriptorを`:digest`→`:stat`に切り替えてもキーは**変わらない**: 古い`:digest`
  エントリーは、MISSがそれらを`:stat`で書き直すまでdigest経由で検証し続ける──遅延ソフト
  マイグレーション、ハード破壊なし。クリーンな一発リビルドには`SCHEMA_VERSION 4→5`
  （descriptor.rb:30）をbumpする。どちらも実行可能。SCHEMA bumpのほうがクリーンである。
- **GlobEntry: フォーマット互換、自己マイグレーション**。 comparatorフィールドなし；
  `digest_for`（descriptor.rb:178）をcontent-sha行の代わりに`"<path>\0<stat-tuple>\n"`行を
  ハッシュするよう変える。古いglobエントリーはミスマッチする → 既存のフォールトトレラントな
  パス（`glob_entry_fresh?` rescue → false → リビルド）経由で再計算する。フィールド追加なし；
  SCHEMA bumpは任意。

**健全性の注意（なぜADR-54がmtime fast-pathを拒否したか、どう調和させるか）**。
stat記録は**マシンローカル**である──mtime/inode/ctimeはマシン間およびgitチェックアウト間で
異なるので、`:stat`エントリーは（content digestと違い）**クロスマシンで共有してはならず**、
mtimeを保存する復元は理論上変更を見逃しうる。ADR-54 §WDはまさにこのために「健全性を理由とする
`fresh?` mtime fast-path」を拒否した。リコンの反証: digestは今や実際のRailsアプリでの*支配的な
ウォーム下限*である（115 MB / 52,739ファイル / あらゆるgitlab HITで~1.3s）。調和させる再設計は
**STAT-THEN-DIGEST**であり、stat-instead-of-digestではない:
- FileEntryごとにstatタプル**と**content digestの**両方**を保存する（両方を`value`にパック
  するか、並列スロットを追加する）。検証時、まず`File::Stat.new(path)`。`(size, mtime_ns,
  ctime_ns)`が記録されたstatと一致すれば → **ハッシュをスキップ**（short-circuit fresh）。
  statが異なる場合にのみ → 記録されたdigestに対して`Digest::SHA256.file`にフォールバック
  （触れられたが同一のファイルは依然としてfreshと検証され、真に変更されたファイルは今日と
  まったく同じようにdigestされる）。
- *真のnullビルド*（何も変わらない）ではこれは52,739回の`File::Stat.new`呼び出し（各
  マイクロ秒、バイト読み取りなし）＋**0 SHA-256バイト**であり、今日の52,739 digest＋
  **115 MBハッシュ**に対して──gitlabウォーム下限で~1.3s → ~50～100msの削減が期待される。
  statが実際に動いたどのファイルでもdigestの権威が保存される。`ctime_ns`はメタデータのみの
  変更を捕捉し、`inode`はアトミック置換のスワップを捕捉する。
- 同じレバーが`GlobEntry`（globされた各ファイルをstatし、変更されたものだけを再ハッシュ）と
  ADR-60プラグイン`watch:`検証（もう一方の40 MB）にも適用される。

---

## 7. ランク付けされた読み ── null / 1編集の下限は実際どこにあるか

1. **大プロジェクトのウォームnull（gitlab A/B）: キャッシュ検証／digest束縛**。 52,739ファイル
   / 115 MB（A）または29,746 / 67 MB（B）にわたるSHA-256の~1.3～2.0sで、ADR-45 `fresh?`
   （74 MB）＋ADR-60 plugin-glob（40 MB）＋plugin `fresh?`（23 MB）に分割される。ブートは
   287msの端役。**これが最も価値の高いターゲット**であり、stat-then-digest再設計（§6）の直接の
   動機である。二次的: プラグインの`#prepare`/glob-validateプレパス（A ~1.1s / インクリメンタル
   ＆フルパスで~5.4s）は、あらゆる実行でADR-45 verdictの前に支払われる固定税である。
2. **小／中のウォームnull（mail、rigor-lib A/B）: ブート束縛**。解析は6～55ms。~0.36～0.46sの
   wallは~245msの`bundle exec` bundler税（アーティファクト）＋~90～150msのengine+rbs+prism
   require（キャッシュverdictの前に`load_check_dependencies`でeagerにロードされる）＋~50msのVM。
   ここでのレバーは、推論エンジンのrequire**および**env構築をADR-45 verdictの後まで遅延する
   ことである（§3）──HITはどちらも必要としない。スナップショットの往復（B）は、何も書き直さ
   ないI/Oを10～53ms加える。
3. **1編集インクリメンタル（C）: 影響クロージャ＋固定plugin-prepass**。コスト = 編集ファイルの
   依存クロージャの再解析（leaf ≈ 0.25s、ハブ`label.rb` ≈ 4.3s）**＋**固定の再チェックごとの
   プラグインglob検証（gitlab ~5.4s）**＋**スナップショット往復。gitlabではplugin-prepass単独で
   些細な編集でさえ>5sを要する──プラグインキャッシュ検証をstat fast-path（§6）に載せることが
   #1と同じレバーであり、それを直接削減するだろう。
4. **1編集default = フルビルド（D）: ファイルごとの推論束縛**。 analyze_files 2.8s（mail）／
   5.3s（rigor）／13.5s（gitlab）──本質的な型付けコスト、＋ディスカバリプレパス、＋（gitlab
   では）5.4sのプラグインbuild。これがADR-46/85の勝ちケースである: インクリメンタルCは不変
   ファイルについてこれを再実行することを回避する（leaf気味の編集で4.5～7.5×）。

**1行の総合**。 ~300ファイル未満では、null／準nullの下限は*ブート*（主に`bundle exec`の
アーティファクト＋eagerにrequireされたエンジン）である。モノレポ規模ではそれが*キャッシュ
再検証*へと激しく反転する──あらゆるウォーム実行で50k+の依存ファイルにわたる100+ MBを再
ハッシュする──それを、マシンローカルな**stat-then-digest** freshness層（新しい`:stat`比較器と
1回の`SCHEMA_VERSION` bumpで、既存の`FileEntry`/`GlobEntry`フォーマットに乗せられる）が、statが
実際に動いたどのファイルでもdigestの健全性を保ちつつ、~1.3sから~50～100msに収束させるだろう。
