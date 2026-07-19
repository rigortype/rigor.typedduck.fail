---
title: "CI テスト時間の伸び — 要因分解（instance gacha vs テスト増加 vs binpacker）"
description: "Imported from rigortype/rigor docs/notes/20260718-ci-test-time-growth-attribution.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260718-ci-test-time-growth-attribution.md"
sourcePath: "docs/notes/20260718-ci-test-time-growth-attribution.md"
sourceSha: "08201db8f25ecb026a839cbf7ae3c1ee347b4231bf8887800be8412cffc7efe6"
sourceCommit: "d88effcae8b2998d1f4f40432e6d4f20ce17946e"
sourceDate: "2026-07-18T05:49:53+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266718
---

Status: research note, no design commitments. Observations taken against Rigor
**v0.2.9**, GitHub Actions `ubuntu-latest`, binpacker 0.2.0, 2026-07-18.

## きっかけ

CIの "Tests (Ruby 4.0)" 実時間が「段々伸びている」ように見える、という懸念。連続する
2ラン([#186](https://github.com/rigortype/rigor/actions/runs/29607710808) = 427s /
[#187](https://github.com/rigortype/rigor/actions/runs/29608667875) = 660s、15分差)を
起点に、①テスト増加 ②GitHub混雑・個体差 ③binpackerアーキテクチャ ④その他 を切り分けた。

## 手法

`gh run list/view`で成功ラン239本（2026-06-22 → 07-17）の "Run tests" ステップ実時間を
収集。加えてbinpackerが末尾に出す`Total: N files, MMmSS.s | K examples`行を代表ランで
取得。この`MMmSS.s`は**全ワーカーの合計CPU時間（= 同じ作業にかかった計算コスト）**で、
ワーカー数・スケジューリング品質・混雑ノイズから独立した「純粋な仕事量」指標になる。これが
切り分けの鍵。

## 観測

### 実時間の週次中央値 — 「段差」であって漸増ではない

| ISO週 | 期間 | 中央値 | n |
|---|---|---|---|
| 26 | 06/22–28 | **376s** | 25 |
| 27 | 06/29–07/05 | **392s** | 41 |
| 28 | 07/06–12 | **516s** | 74 |
| 29 | 07/13–19 | **530s** | 99 |

日次中央値では07-04まで ~380s一定 → **07-05に490s → 07-06以降510–556s一定**。
分単位に追うと転移は**07-05 08:17(392s)→08:26（533s）の9分間**。だがこの日のコミットは
すべて15:16以降（bundle update・版上げ・コメント整形のみ、ランタイム非依存）。
**コード変更が無いまま同一コードベースで段差が発生**している。

### 合計CPU時間 — 同一テストが個体で27〜42分に振れる

| ラン | 実時間 | examples | **合計CPU** | workers | 並列効率* |
|---|---|---|---|---|---|
| 06-23（基準） | 392s | 7038 | 24m44s | 4 | 94.6% |
| 07-04（速） | 381s | 7332 | 24m14s | 4 | 95.4% |
| 07-05 08:17（速） | 392s | **7339** | **24m45s** | 4 | — |
| 07-05 08:26（遅） | 533s | **7339** | **31m33s** | 4 | 88.7% |
| 07-06（遅） | 506s | 7340 | 31m50s | 4 | — |
| 07-17 #186（速） | 427s | 8068 | 27m15s | 4 | 95.7% |
| 07-17 mid | 538s | 8067 | 34m24s | 4 | — |
| 07-17 #187（遅・最大） | 660s | 8077 | **42m38s** | 4 | 96.9% |

*並列効率 = （合計CPU ÷ 4） ÷ 実時間

07-05 08:17と08:26は**examples=7339で完全同一・workers=4同一・profile=ci同一**なのに
合計CPUが**24m45s→31m33s(+27%)**。07-17の同日3ラン（examples≈8070）も合計CPUが
**27m〜42m(+56%)**と振れる。同じテストコードが、その日どのホストを引くかで計算コストが
1.5倍以上変わる = **noisy neighborによるホスト共通（コモンモード）変動**。

## 結論（要因分解）

1. **真のテスト増加 — 寄与は小さく、緩やかで健全（約 +10%/月）**。 examples 7038→8077
   （+15%）、spec LOC +13%。ただし「きれいなホスト」同士で比べた合計CPUは24m44s(06-23)→
   27m15s(07-17 #186) = **+10%**に留まる。これが唯一の実トレンドで、規模相応。

2. **GitHubホストの性能ばらつき/劣化 — 体感増の主因かつ全ノイズの源**。同一コードで
   合計CPUが27〜42分に変動。07-05 08:20 UTC前後で「普通のホスト」の基準が恒久的に
   悪化（24m45s→31m30s）し、週中央値392→516sの階段になった。その上に大きなper-run
   ノイズが乗る。ユーザーが挙げた427 vs 660は**ノイズ同士の比較**(#186は速い引き、
   #187は60ラン中の最高外れ値、合計CPU 27m vs 42m)。単発ラン比較でトレンドは測れない。

3. **binpackerはシロ、むしろ優秀**。全ラン4 workers / profile: ci(work-stealing有効、
   `Config#resolve_profile`が`CI`/`GITHUB_ACTIONS` envで自動選択)。並列効率は一貫して
   **94〜97%**（#187でも96.9%）。ホストのCPUコストを透過するだけで増幅していない。
   ここを変えても効果はない。

## カテゴリ別ジョブ分割の検討（否定的）

「大カテゴリごとにジョブを分ければinstance gachaに効くか」を検討 → **変動対策として逆効果、
速度目的でもlarger runnerに劣る**。

- **ガチャは引き直しでなく引く枚数増**。ステージ完了 = Nジョブのmax。max-of-Nは期待値も
  テールも悪化する（straggler）。noisy neighborはホスト単位のコモンモードなのでシャード内で
  平均化されず、across-shardでは「どれか1つが遅い」確率が上がる。
- **binpackerのグローバル均衡を捨てる**。現状はfile粒度の実測タイミング + LPT +
  work-stealingで325ファイルを動的再配分。カテゴリ境界は静的・不均等で、かつて
  parallel_testsで悩んだ偏り（[2026-06-22 note](../20260622-parallel-suite-runtime-distribution/)）
  を手で再導入することになる。
- **固定オーバーヘッド（checkout/setup-ruby/bundle/boot）がN倍**。
- **速度が目的ならlarger runnerが全軸で上**。 `workers: auto`はnprocなのでlarger runnerに
  置くだけで自動スケール（設定変更ゼロ）、ガチャは1枚のまま、グローバル均衡も維持、
  larger/dedicatedは同居ノイズ自体が少なくvarianceも改善。

分割が正当化されるのは（a）フィードバック遅延目的の薄いsmoke tier、（b）DBサービス等
環境が違うテスト群の隔離、（c）不安定シャードの独立リトライ — いずれも速度/変動が目的ではない。
現rigorは単一gemのunit specなので該当なし。

## 推奨

1. **単発ラン比較をやめ、指標を変える**。 binpackerが毎回出す合計CPU時間
   （`Total: … NNmSS.s`）かwallの週次中央値を追う。並列効率・混雑ノイズを分離した実トレンド
   （+10%/月）が見える。
2. **wallを縮めたいならlarger runner（コア増）**。既に4 vCPUでCPUバウンド、worker増は
   コア数で頭打ち。larger/dedicatedがlevelとvarianceの両方に効く唯一のレバー。binpacker
   変更不要。
3. **合計CPUがexamples増加率を継続的に上回り始めたら**初めてエンジン/spec重量化を疑う。
   現状は規模相応。

## Runnerを金で変える選択肢の評価（larger runner / サードパーティ）

variance（instance gacha）を金で緩和できるか。GitHub公式larger runnerとサードパーティ
（Blacksmith / WarpBuild）を比較検討した。

### 前提（GitHub billing / runner-choiceページ）

- **公開リポの標準ランナーは無料**（rigorは現状CI $0）。標準の「混雑の少ない上位版」という
  商品は無く、払って変えられるのは実質larger runnerのみ。
- **larger runnerは公開リポでも常に課金**(原文 "Larger runners are always charged for,
  even when used by public repositories")、無料枠も効かず、**GitHub Team / Enterprise Cloud
  プランが必要**。料金はvCPUにほぼ比例（8-core Linux ≈ $0.032/min前後）。
- runner-choiceページはlarger runnerの**性能一貫性を明言していない** → 確実に買えるのは
  コア数（=wall短縮）で、variance低減はおまけ・非保証。

### サードパーティ（2026-07-18時点の料金ページ）

| | 単価（Linux x64） | 主張 | OSS無料枠 |
|---|---|---|---|
| WarpBuild | 4vCPU $0.008 / 8vCPU $0.016 / 16vCPU $0.032 /min | 「50%安・2x速」 | 明記なし |
| Blacksmith | 2-core $0.004/min（vCPU可変） | 「67%削減・2x速」 | あり・**選別制**（現状Celery/Ladybird/Zen/Limboの4件のみ、要申請） |

サードパーティが速く安いのは概ね本当で、**高クロックの専有ベアメタル**を使うためper-coreが
速く（消費分数も減る）、同居ノイズが少ないので**variance軸にGitHub largerより直接効く**。
技術的には本件の「合計CPUのブレ」に最も刺さる。

### 結論 — 見送りが妥当

金銭は障壁でない（8vCPU 2xで概算**月 $15–30**、GitHub largerの半額弱）。判断軸は金額でなく
**「cosmeticな便益vs恒久的な供給網依存」**:

- 第三者のGitHub AppにActionsアクセスを与え、**インストールして使われる型チェッカーのCIを
  外部インフラで回す**ことは[ADR-31](../../adr/31-contribution-and-supply-chain-policy/)
  （供給網ポリシー）の領域。ephemeral VMでraw self-hostedのfork-PR永続リスクは薄いが、
  信頼依存は恒久的。得られるのは見た目（variance）の改善のみ。
- 公開リポのself-hostedはfork-PR任意コード実行の既知アンチパターンで**不可**。
- 実トレンドは +10%/月・中央値530s・最悪11分の**実害なし**問題。恒久依存を足す取引に見合わない。

**再検討トリガー**: (a) wallが実スループット障害（恒常 >15分程度）まで育つ、または
(b) **Blacksmith OSS無料枠にrigorが通る**ならROI反転（無料で2x・専有、残コストはApp信頼のみ）
— 申請は低コストなので打診の価値はある。

## 落としどころ（2026-07-18決定）

- **有料runner（larger / サードパーティ）は見送り**。無料の実対処で足りる。
- 実対処 = **単発ラン比較をやめ、合計CPU時間 / wall週次中央値で追う**(+10%/月 の実トレンドが
  見える)。加えて**`*.md`のみのPRではテストを走らせない**のが妥当な落としどころ。

### `*.md`-only PRスキップの実装上の注意（重要）

**naiveな`paths-ignore`は不可**。 [ci.yml:6-13](../../.github/workflows/ci.yml)は`push`にのみ
`paths-ignore: "**/*.md"`を掛け、**`pull_request`は意図的に無フィルタ**にしている。コメント
（ci.yml:9-11）の通り、**paths-filterされたrequired checkはpendingのまま固着してマージを
ブロックする**ため。`pull_request`に`paths-ignore`を足すとmd限定PRがマージ不能になる。

正しい実装は**「required checkは必ず報告しつつ、重いステップだけ条件スキップ」**パターン:
`test`ジョブは全PRで起動させ（checkoutまで実行 → 数十秒でsuccess報告）、変更ファイルを判定して
md-onlyなら`make test-binpacker` / `make test-ractor-pool`をスキップする(`dorny/paths-filter`
等のguard step + `if:`)。これでrequired契約を壊さずスイート実行だけ省ける。

なお前提としてAGENTS.mdは**md限定変更をmaster直コミット**（PR不要）と定めており、push側は
既にpaths-ignore済み。よってmd-only PRはエッジケース（規約外でPRを開いた場合）なので便益は
限定的だが、コストは小さい。ci.yml変更は非md → **branch + PR必須**（そのPR自体はテストが走る）。

## 時間帯依存の検証（否定）

「JST昼に作業すれば欧州・米国の開発者とrunnerを奪い合わず速いのでは？」を、収集済みの
239ラン（段差後07-06以降173ラン）で検証した。**前提は正しいが効果は検出できない**。

- **前提は正確**: JST昼（例10–18時 = UTC 01–09）はグローバルCIのオフピーク(米国は夜、欧州は
  早朝以前)。JST深夜（0–3時 = UTC 15–18）は欧州午後+米国午前のピークに重なる。
- **だが実データに差が無い**（段差後、UTC時刻でビン分け）:

  | | JST昼（UTC 00–09） | グローバルピーク（UTC 13–22） |
  |---|---|---|
  | 実行時間 中央値 | 517s | 523s（差6秒） |
  | キュー待ち 中央値 | 3s | 3s |

  全24時間帯が実行494–556s・キュー待ち2–3sの帯に収まり日内トレンドは無い。差6秒は
  per-runのばらつき（σ≈65s）に埋もれる。キュー待ち（run createdAt → Tests job startedAt）は
  全時間帯で中央値 ~3秒 = **ピーク時でも容量枯渇していない**（混雑で割当が遅れる現象自体が無い）。

**なぜ効かないか**: instance gachaは「混雑」ではなく「配置くじ」。速さを決めるのは*どの物理
ホスト/CPU世代にVMが載るか*であって、その瞬間の世界全体のCI稼働量ではない → 時刻と無相関。
支配的な変動は07-05の段差のような**プール/世代の入れ替わり（日〜週スケール）**で、これは時刻では
動かせない。

**結論**: 作業時間をずらす価値はない。数秒〜数%の未検出効果を狙うより、md-only PRスキップ +
中央値/合計CPU追跡の方が確実。

## 関連

- [2026-06-22 Parallel spec suite: runtime-based distribution](../20260622-parallel-suite-runtime-distribution/)
  — `--group-by filesize`が「大きいが速い」ファイルで崩れる問題（binpacker採用の前史）。
- [2026-06-23 binpacker parallel-suite trial](../20260623-binpacker-parallel-suite-trial/)
  — binpacker導入トライアルとCI変動の初期観測。
