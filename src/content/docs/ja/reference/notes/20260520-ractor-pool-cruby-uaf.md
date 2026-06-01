---
title: "Ractorワーカープールクラッシュ — CRubyの並列Ractor use-after-freeに根本原因を特定"
description: "rigortype/rigor docs/notes/20260520-ractor-pool-cruby-uaf.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260520-ractor-pool-cruby-uaf.md"
sourcePath: "docs/notes/20260520-ractor-pool-cruby-uaf.md"
sourceSha: "7a194685c12478ca3727a4607bfc5f1dca70853fa66cd29bd96c9ff1ef9487fc"
sourceCommit: "626e04cb1ce26d1b1500ed80d078dac891053fd2"
sourceDate: "2026-05-20T15:02:03+09:00"
sourceLanguage: "en"
translationStatus: "translated"
sidebar:
  order: 20266520
---

**日付.** 2026-05-20。`994b543`（v0.1.7）の`master`に対して調査;Ruby 4.0.4と4.0.5で再現確認済み。

**スコープ.** `make verify`のCIランが[ADR-15](../../adr/15-ractor-concurrency/)フェーズ4 Ractorワーカープールのワーカー内でセグフォルトした。このノートは調査、確認された根本原因、信頼性の高い再現レシピ、および結果として生じた決定を記録する。

**結果.**クラッシュは**rigorのバグではない**。CRubyのメモリ安全性違反:並列Ractorプールのもとで、あるRactor上のガベージコレクタースイープがオブジェクトのヒープメモリを解放し、別のRactor上の`rb_vm_ci_lookup`（ランタイムのcall-infoインターニングパス）がそれを並列で読んでいる — heap-use-after-free。AddressSanitizerが決定論的に再現する。rigorでの修正の試み（`7952ff2`）は無効と証明され差し戻された（`c3b02d3`）。クラッシュは**Ruby Bug #22075**として上流に報告済み。

後続のMastodonコードベースに対するベンチマーク（§6）は、**2つ目の独立したプールの欠陥** — クラッシュしないランでさえプールが100%ガーベッジ出力を生成する決定論的な`Ractor::IsolationError` — を露わにした。2つの欠陥は無関係;どちらか一方だけでもプールを使用不可能にするには十分。

**付属アーティファクト.**再現Dockerイメージ（サニタイザービルドのRuby 4.0.5 + rigorバンドル）とその`Dockerfile`はリポジトリ外の`/tmp/rigor-tsan/`に保管。CIの失敗はGitHub Actionsラン`26123249293`;それが実行したソースはタグ`v0.1.7`。

## 1. 最初の症状

GitHub Actions（`x86_64-linux`、Ruby 4.0.4）での`make verify`は`1072 examples, 0 failures`を出力した後クラッシュした:

```
lib/rigor/inference/hkt_body.rb:111: [BUG] Segmentation fault at 0x000055b229d98000
ruby 4.0.4 (2026-05-12 revision b89eb1bcbf) +PRISM [x86_64-linux]
```

Rubyバックトレース（プールワーカー）:

```
runner.rb:556  block (2 levels) in analyze_files_in_pool
worker_session.rb:118  initialize
environment.rb:279  for_project
builtins/hkt_builtins.rb:115  registry
builtins/hkt_builtins.rb:75   json_value_definition
builtins/hkt_builtins.rb:44   json_value_body_tree
inference/hkt_body_parser.rb:70 / 138 / 152 / 245 / 264
inference/hkt_body.rb:111  initialize        （`super`呼び出し）
```

Cバックトレース:SIGSEGVは`vm_ci_hash` ← `do_hash` ← `rb_st_update` ← `rb_vm_ci_lookup`（`vm_method.c:712`） ← `vm_ci_new_runtime_` ← `vm_search_super_method`の中 — すなわちプロセスグローバルのランタイムcall-infoテーブル（`vm->ci_table`）。

## 2. 調査の経緯

1. **最初の仮説 — `vm->ci_table`インターニングのレース.** Cバックトレースが`rb_vm_ci_lookup`を指した。修正（`7952ff2`）がプールをスポーンする前にメインRactor上でcall-infoテーブルを事前ウォームした。
2. **合成再現に失敗.** `super`ヘビーな`Data.define`値オブジェクトをハンマーする多数のRactorをスポーンするスタンドアローンスクリプトは**クラッシュしなかった** — Ruby 4.0.4 darwinとarm64-linuxで30/30クリーン（共有callinfo版とRactorごとのユニークcallinfo版の両方）。「純粋な`ci_table`インターニングレース」モデルは不完全だった。
3. **実際のspecが信頼性高く再現.** `runner_pool_spec.rb`（`RIGOR_INCLUDE_RACTOR_POOL=1`の後ろにゲートされ、デフォルトの`make verify`からは除外）はRuby 4.0.5で一度もパスしない:

   | コード | クラッシュ | ハング | 失敗 | OK |
   | ---- | ----- | ---- | ---- | -- |
   | 修正前（`994b543`） | 18 | 2 | 5 | 0 |
   | `7952ff2`適用後 | 6 | 0 | 19 | 0 |

   （各25回実行。）修正はハードクラッシュをサイレントな誤診断に置き換えただけ — 型チェッカーにとってはより悪い — ので`7952ff2`は`c3b02d3`で差し戻された。クラッシュサイトはラン間で変動し（`vm_ci_hash`、`fact_store.rb:27`など）、ヒープ破損が次のポインタ逆参照が着地するどこかで表面化するという特徴を示す。
4. **TSANが盲目だった.** Ruby 4.0.5のThreadSanitizerビルドはプロセスがSIGSEGVする前に**ゼロ**のレースを報告した。予想通り:TSANはRuby 4.0のM:Nスレッドスケジューラを追跡できないため、happens-beforeトラッキングがRactorレースを見落とす。
5. **ASANが特定.** AddressSanitizerビルドが実際のエラーを決定論的にキャッチした（§3参照）。Rubyのarm64コルーチンコードでの誤検知（`coroutine_initialize`のM:Nスレッド作成中）を黙らせるために`-fno-sanitize-address-use-after-scope`が必要で、それを乗り越えるために`halt_on_error=0`が必要だった。

## 3. 確認された根本原因

AddressSanitizer（Ruby 4.0.5、arm64-linux、`runner_pool_spec.rb`、3-Ractorプール）:

```
ERROR: AddressSanitizer: heap-use-after-free
  READ of size 4 — rb_vm_ci_lookup        vm_method.c:699
    ← vm_ci_new_                            vm_callinfo.h:219
    ← vm_ci_new_runtime_                    vm_callinfo.h:240
    ← vm_search_super_method                vm_insnhelper.c:5152
    ← （hkt_body.rb Data.define #initializeの`super`）

  freed by:    GCスイープ — gc_sweep_plane → rb_gc_obj_free
               → rb_data_free → ruby_xfree            (gc/default/default.c)
  allocated by: rbs_new_location2                     (rbs-4.0.2 C拡張、
               ext/rbs_extension/legacy_location.c:203 — RBS Location)
```

同じ行が`heap-buffer-overflow`としても表面化する — 同じバグが解放済み / 再利用済み領域のどこに読み取りが着地するかによって異なる分類を受けている。

**メカニズム.**並列Ractorプールのもとで:

1. あるワーカーRactorがRBSをパース;`rbs_extension.so`が多数の`Location`オブジェクトをアロケートし、共有GCヒープをかき回す。
2. GCスイープが実行されてオブジェクトを解放する。
3. 別のワーカーRactorが`hkt_body.rb`の`Data.define`値オブジェクトで`super`を実行する → `vm_search_super_method` → `vm_ci_new_runtime` → **`rb_vm_ci_lookup`がGCスイープが解放したばかりのヒープメモリを読む** → heap-use-after-free。

欠陥は並列Ractor実行、共有GCヒープ / スイープ、プロセスグローバルのランタイムcall-infoマシナリー（`vm->ci_table` / `rb_vm_ci_lookup`）という、Ruby 4.0のもとで並列Ractorに対して互いに安全でない3つのCRubyサブシステムの相互作用。Rubyの契約 — Ractor内の純粋なRubyコードはメモリ安全 — が違反されている。

**rigorでは修正不可能**:プールは単に並列Ractorを多用するだけ（バンドルされたHKTの`Data.define`値オブジェクトのすべての`super`が`rb_vm_ci_lookup`にヒット;RBSロードが大量のGCチャーンを引き起こす）。call-infoテーブルの事前ウォーム（`7952ff2`）は助けにならない — テーブルとGCヒープはすべての並列Ractorによって継続的にミューテーションされるため、シングルスレッドのウォームアップフェーズが後続の並列アクセスを安全にすることはない。

## 4. 再現レシピ

サニタイザービルド（`Dockerfile`は`/tmp/rigor-tsan/`、arm64-linux）:

```sh
docker build --build-arg SANITIZER=address \
  --build-arg EXTRA_CFLAGS=-fno-sanitize-address-use-after-scope \
  -t rigor-asan:4.0.5 .

docker run --rm --cap-add=SYS_PTRACE --security-opt seccomp=unconfined \
  rigor-asan:4.0.5 bash -c '
    ASAN_OPTIONS="detect_leaks=0 detect_stack_use_after_return=0 \
      halt_on_error=0 abort_on_error=0 exitcode=0 log_path=/tmp/asanlog" \
    RIGOR_INCLUDE_RACTOR_POOL=1 \
    bundle exec rspec spec/rigor/analysis/runner_pool_spec.rb
    grep -l heap-use-after-free /tmp/asanlog.*'
```

`heap-use-after-free` / `heap-buffer-overflow`レポートが`rb_vm_ci_lookup`で数回のラン以内に現れる（≈2回に1回）。サニタイザーなしでは、ベアSIGSEGVが同じspecの≈70%のランで再現する。

## 5. 決定 / フォローアップ

- **`7952ff2`が差し戻され**（`c3b02d3`）;セグフォルト修正を主張したCHANGELOGの「Fixed」エントリーもそれと一緒に削除。
- **Ruby Bug #22075として上流に報告済み**（https://bugs.ruby-lang.org/issues/22075） — *heap-use-after-free in `rb_vm_ci_lookup` under parallel Ractors* — §3のASANエビデンス、GitHub Actionsラン`26123249293`、タグ`v0.1.7`とともに。
- **Ractorプールをゲートオフ**、CRubyが修正されるまで。`runner_pool_spec.rb`はデフォルトの`make verify`からすでに除外されているが、プールはまだ`cli.rb`の`--workers` / `parallel.workers:`サーフェスから到達可能 — `cli_spec.rb`がそれを実行するため、これがCIジョブでプールが実行された仕組み。プールはCRubyの修正が着地するまで到達不可能にするか（または明示的なオプトインの後ろにハードゲートする）必要がある。
- ADR-15フェーズ4（Runner Ractorワーカープール）は上流修正まで**ブロック**。フェーズ1〜3は影響なし。
- `make verify`はプールパスをカバーするよう拡張すべき（またはプールパスをCIサーフェスから完全に削除すべき）、こうした回帰が再び`master`にサイレントに到達できないように。

## 6. 第2のプールの欠陥 — 決定論的な`Ractor::IsolationError`

Mastodonコードベース（`github.com/mastodon/mastodon`、`app/` + `lib/` = 1303のRubyファイル;12コアarm64-darwin、Ruby 4.0.5）に対するベンチマークは、シーケンシャル対プールのスループットを比較する意図だったが、第2の独立したプールの欠陥を露わにした。

| モード | wall | mem | 診断数 |
| --------------------- | ----- | ------- | ----------- |
| シーケンシャル | ~3.5s | ~374 MB | 488件実際の診断（480エラー + 8警告） |
| プール（`--workers=4`） | ~1.1s | ~393 MB | 1296件 — **すべて`internal analyzer error`** |

プールの1296件の診断すべてが`internal analyzer error: Ractor::IsolationError: can not access non-shareable objects in constant ... by non-main ractor`。名指しされた定数:

- `RBS::EnvironmentLoader::DEFAULT_CORE_ROOT`
- `Rigor::Builtins::StaticReturnRefinements::OWNERS_BY_METHOD`
- `Rigor::Builtins::HktBuiltins::METHOD_RETURN_OVERRIDES`

ワーカーRactorがこれらのプロセスグローバル定数を読む;それらは`Ractor.make_shareable`されていないため、アクセスが`Ractor::IsolationError`を発生させ、アナライザーがそれをファイルごとの診断としてemitする。**すべてのファイルが失敗;プールは実際の解析を行わない**。出力は`--workers=4/8/12`とラン間で完全に同一 — 完全に決定論的。

結果:

- 生のwall-clockの素直な「プールは≈3倍速い」という読みは**誤り**。プールは何もしないから速いだけ — 各ファイルが即座に失敗する。唯一の有効な数字はシーケンシャルのもの（1303ファイルに対して~3.5s / ~374 MB）。
- この欠陥は**rigor側で決定論的**であり、§3のuse-after-free（上流側、断続的）とは異なる。どちらか一方だけでもプールを使用不可能にするには十分。
- シングルショットの`rigor check --workers=N`は27回のラン（workers 4 / 8 / 12）でハードクラッシュしなかった — `isolation error`がすべてのファイルを速やかに失敗させるため、ワーカーが§3のクラッシュウィンドウを開くRBSパース + `super`作業を行わないから。`runner_pool_spec.rb`が依然として≈70%クラッシュするのは、そちらがプールを繰り返しスポーンし、クラッシュウィンドウがワーカーの*初期化*（HKTレジストリビルド）にあるためで、ファイルごとの解析にあるのではない。
- HKTビルトイン、静的リターンリファインメントなどの最近の機能がワーカーパス上に非共有可能な定数を追加したときに退行した可能性が高い。`prewarm_rbs_cache_for_pool`は`RBS::EnvironmentLoader.new`のみを回避していたが、`DEFAULT_CORE_ROOT`定数読み取りやrigor自身の新しい定数には対処していなかった。

フォークベースのワーカープール（ADR-15がフォークを認可された代替手段として名指ししている）は**両方の**欠陥を回避する:フォークされた子プロセスはすべての定数をCOWで継承 — 共有可能性制約なし — かつ別々のGCヒープと`vm->ci_table`を持つ別プロセスで実行するため、§3のuse-after-freeとも無縁。

## 7. 既存のRubyトラッカー課題との関係

§3のuse-after-freeは**Ruby Bug #22075**（*heap-use-after-free in `rb_vm_ci_lookup` under parallel Ractors*;Open;Bug）として上流に報告済み。過去≈12ヶ月の`ractor`タグ付き課題のスキャンで**既存の重複は発見されなかった** — 他にどの課題も`rb_vm_ci_lookup`、ランタイムcall-infoテーブル、またはデフォルトGC上でのGCスイープ対Ractorのuse-after-freeを名指ししていない。3つの近い課題を全文で確認した:

- **#21200** — *Ractor spuriously hangs, segfaults or errors on `TestEtc#test_ractor_parallel`*（Assigned）。同じ**クラス**のバグ:並列Ractorが散発的なセグフォルト / ハングを生成。そちらのクラッシュシグネチャ（`pthread_mutex_lock: EINVAL`、`SEGV at 0xfffffffffffffff8`）は我々のものとは異なり、根本原因は**未特定** — 共通の根本原因は確認も否定もできない。関連課題としてリンク。
- **#21204** — *`TestEtc#test_ractor_parallel` is still flaky with ModGC/MMTk*（Assigned）。同じクラスのヒープ破損（`malloc_consolidate(): unaligned fastbin chunk`）だが、報告者が**MMTk GCにスコープを限定**（「失敗はModGCワークフローでのみ発生」）。我々のASANバックトレースは明示的に`gc/default/default.c`にある — すなわちデフォルトGCでも同じ破損クラスが再現する。我々の報告がそのデータポイントを追加;関連としてリンク。
- **#21999** — *Segfault / FPE with Ractor code involving BigDecimal*（Closed、「Third Party's Issue」）**。除外** — BigDecimalのfloat解析バグと確認済み、BigDecimalリポジトリで修正済み（PR #528）、Ractorコアの問題ではない。同じ破損の誤帰属の可能性という以前の推測は誤りだった。

ファイナライザーテーマの課題（#21368 *Moving objects with finalizer between Ractors crashes*、#21315 *Finalizers violate `rb_ractor_confirm_belonging`*）は**おそらく別**:我々のASANの解放パスはプレーンな`gc_sweep_plane` → `rb_data_free`であり、ファイナライザーは関与していない。

#22075は#21200と#21204を「Related issues」としてリンクし、その独自の貢献として精密な発現ポイント — **デフォルトGC**上での完全な3スタックASANトレースを伴う`rb_vm_ci_lookup`での`heap-use-after-free` — を示している。

## 8. 復帰する実装者のためのノート

- TSANはここでは使えるツールではない — Rubyのm:nスケジューラがスレッドトラッキングを破壊する。ASANを使う;arm64コルーチンの誤検知を回避するためにuse-after-scope計装を無効化する。
- 合成的な`super`スパム再現は行き止まり — バグには実際のワークロードのGCプレッシャー（RBS `Location`アロケーションチャーン）が`super` / `rb_vm_ci_lookup`パスと交互に絡む必要がある。最小スタンドアローン再現器は特定されていない;ASANのもとでのrigorプールspecが動作する再現器。
- シーケンシャル解析パスは影響を受けず正しいまま;`workers > 0`（プール）モードのみ壊れている。
