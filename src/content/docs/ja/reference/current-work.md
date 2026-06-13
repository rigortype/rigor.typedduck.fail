---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "c65291a9085957188c44e4a99033b25fb0da433bcf680363acd045cb8d3f2720"
sourceCommit: "222d8e03ee0f4252795f6c7294672a76c20b7ae3"
sourceDate: "2026-06-13T17:22:26+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.18リリース済み（2026-06-11）**。テーマ: CI環境サポート（[ADR-51](../adr/51-ci-diagnostic-output-formats/)）—— 6つの`rigor check --format` CIネイティブレンダリング + ランタイムCI自動検出 + CIセットアップテンプレート + `rigor-ci-setup`スキル。完全な記録は`CHANGELOG.md` § `[0.1.18]`にある;ここで再要約しないこと。v0.1.17以降に`master`へ着地したもう1つ: **[ADR-54](../adr/54-cache-slimming/)のキャッシュスリム化、WD1〜WD4完了** —— definitions-blob廃止 + zlibエントリー圧縮 + 256 MBデフォルトeviction + ローダーごとのdescriptorメモ;プロジェクトごとのキャッシュ約33.7 MB → 約2 MB、definitionsに触れるwarm実行は最大約550 ms節約（根拠 + 着地した数値は[`docs/notes/20260610-cache-disk-runtime-audit.md`](../notes/20260610-cache-disk-runtime-audit/)）。

v0.1.18リリースカット以降に`master`へ着地（2026-06-11）: **[ADR-55](../adr/55-recursive-return-precision/)の再帰メソッド戻り型精度、両スライス完了** —— スライス1は燃料付き定数引数アンロール（`factorial(5) → Constant[120]`、燃料32 + 値サイズキャップ、加えて同日のコーパスFAILクランプ: アンロールは完全に値ピンされた結果のみをサーフェスする）、スライス2はfixpoint戻りサマリー（`bot`からのKleene、キャップ3;素のパススルー再帰は今や`Dynamic[top]`ではなく`:done`と型付けされる、加えて同日のbot-collapse健全性修正: パラメータ拡大した再実行 + 明示的`return`フロアにより、値を返す再帰が`bot`と型付けされることはない）。ゲート: 4つのコーパス（Mastodon / haml / jbuilder / kramdown）がバイト同一、パフォーマンス中立。既知の残課題（需要ゲート）: トップレベルの再帰`def`は`Dynamic`構成要素を保持する（ADR-24 WD3採用ゲートが拘束）、早期`return`値は末尾のみのボディ評価器に届かない（`pick → Dynamic[top]`、`nil`ではない）、相互再帰サマリーはシグネチャをまたがない。

同じく2026-06-11に着地: **[ADR-56](../adr/56-block-captured-local-mutation/)のブロックキャプチャされたローカル書き戻し + ループボディfixpoint、スライスA + B完了** —— エンジンは以前ブロック出口スコープを破棄していたため、`result = 1; 1.upto(6) { result *= i }`は`Constant[1]`を保持していた（ランタイム720;仕様MUST違反）、そして`while`は1回のボディパスをjoinしていた;いずれも今や共有の`Inference::BodyFixpoint`を通じて収束する（キャップ3、`Constant→Nominal`最終拡大、ローカルごとの`Dynamic[top]`フロア、`BudgetTrace::BLOCK_WRITEBACK_CAP`）。コーパスの勝ち: Mastodonで誤った常時偽1件除去、kramdownで誤ったnil-fold FP 2件除去 + メッセージ修正5件;新規発火ゼロ。同じアークでの2つの隣接精度修正: シンボル形式の`reduce` / `inject`ディスパッチ（`(1..n).reduce(1, :*) → Integer`、新`ReduceFolding`ティア）と、混合した`Constant | IntegerRange`ユニオン型を境界レンジにfoldする`ConstantFolding.numeric_set_of`（区間アキュムレータは`Dynamic`を漏らす代わりに`Integer`へ収束する）。3つの階乗スタイル（再帰 / reduce / アキュムレータブロック）すべてが今や精密に型付けされる。

2026-06-12に着地 —— **Dynamic-fall campaign**（[サーベイノート](../notes/20260612-dynamic-fall-pattern-survey/)、139プローブ / 11バケット）: ADR-56スライスC（レシーバー内容の要素型join —— `out << x`アキュムレータはシードの要素型のみを保持して不健全だった）+ カタログトリオ（`flatten` / `Array#to_h { }` / `Hash.new(default)`）、続いて**[ADR-57](../adr/57-self-call-return-adoption/) —— ADR-24 WD3のimplicit-self戻り採用ゲートがOPEN**（accepted、ゲートは2026-06-12に開かれた）: 3つの裁定スライスが、5つのアーティファクトメカニズム（明示的`return`の貢献（マルチ値Tupleを含む）、エスケープ内容フロア（レシーバーチェーン + クロスメソッド境界のOptionParser形状を含む）、オプショナルタプルスロットのデストラクチャ緩和、String fold-guardスタブ）を根本で修正し、加えて実験が表面化した2つの自己作成RBSバグを修正することで、ゲートを開いた差分を25 → 10 → 4 → 0へ持っていった。`def outer = helper(3)`は今や`6`と型付けされる。既知のコスト: coldのself-check壁時計+12%（warmのADR-45 / 46パスは影響なし）;ADR-57内のキューに入ったフォローアップ —— パフォーマンスのための健全な呼び出しサイトごとの戻りメモ、module-singleton（`def self.x`）解決、`fib`トップレベルの`1 | Dynamic`残課題（ADR-55サマリー×ゲートの相互作用）。

同じく2026-06-12に着地 —— **CRuby-stdlib campaign**（[サーベイ + 残課題裁定](../notes/20260612-cruby-stdlib-survey/)）: Ruby自身の`lib/`（626ファイル）に対する`rigor check`、エラーは2波で**313 → 267**、新規発火ゼロかつ従来コーパスすべてがバイト同一。波1: デストラクチャされたパラメータのバインダークラッシュ（`def f((a, b))`、シグネチャ生成は今や`def`ごとに劣化する）、チェーンされた`Struct.new(:a).new`ディスパッチ、正規表現マッチのグローバルナローイング（証明されたマッチエッジ上の`$~` / `$1` —— 健全だがFP収率は約0;サーベイの「約180個の正規表現FP」は測定アーティファクトで、シードされていないグローバルは`Dynamic`を読み何も発火しない —— *作業を見積もる前に半径推定をサンプル裁定せよ*）。波2: 終端する`case`ブランチをcase後のjoinから落とした（−31、resolvクラスタ）、`&&`右辺へのsafe-nav真値ナローイング（−4）、break-guard付き`while/until x = expr`のループ出口エッジナローイング（−6）、デッドな一時ivar `nil`書き込みのelision（地ならし;ライブなipaddrクラスタはクロスメソッドのivar明確割り当てパスを要する —— **ADR候補としてキューイング**）。残り267 ≈ needs-RBSのundefined-methodロングテール + ベンダーされたbundler / rubygems + 真の捕捉（`untaint` —— Ruby 3.2で削除）+ 見送られたivarパス。

2026-06-12に着地 —— **一般コード信頼性アーク**（[アルゴリズムコーパス](../notes/20260612-algorithm-corpora-survey/) + [Railsモノレポ](../notes/20260612-rails-monorepo-survey/)サーベイ）: **[ADR-58](../adr/58-ivar-field-typing/)**（宣言由来のivar nilは診断の燃料ではない;WD1のバインディングサブセットが着地しFP −29・新規ゼロ、WD1bメソッド戻り経由 + WD2同質書き込み読み取り + WD3コンストラクタ明確割り当てはキュー入り）、`Numeric`型強制のコアオーバーレイ + `Float#round`アリティ分割、`Regexp.last_match`の証明済みマッチナローイング（残課題: `last_match(N)`グループ昇格）、そして —— 見出し級として —— **whole-libスケーリングの壁を修正**（`9a3d6f5c`）: 健全な実行スコープのユーザーメソッド戻りメモ（defノード同一性 + レシーバー + 引数ごとの短い記述子でキー化、ADR-55のアンロール/fixpoint進行中はバイパス）がADR-57のクロスファイルなcallee再型付け爆発を殺す —— ActiveStorageのwhole-`lib`が20分超 → 約3分、coldのself-checkは−26%（ADR-57の+12%を回収）。残るパフォーマンス項目: ファイル内のノードごとの型キャッシュ不在（約185秒の`video_analyzer.rb`フロア）。

ADR-58アークは2026-06-12 EODにクローズ: WD3の同クラス呼び出しを通じたコンストラクタ明確割り当てが着地（`4921afdb` —— 再帰的サフィックス明確割り当て + クラスごとのメソッド効果サマリー、深さキャップ3;ruby/lib −6、ipaddrの`@mask_addr ^`クラスタ、他コーパスはすべてバイト同一）;WD2は**既に実現済み**として解決（ivar書き込みユニオンは既に精密 —— コンテナコードのDynamicフロアはパラメータ由来のM3漸進的型付けで、免責）;WD1bは裁定の末**需要ゲート付き**に（`d0dd3163`）—— メソッド戻り経由の発火は真正に保守的なもの（calleeは本当にnilを返す;外部の`T?`と同じ診断）であり、抑制すべきアーティファクトではない。2026-06-12遅くにクローズ: **module-singleton解決が着地**（`4b476918` + フォローアップ —— `Util.triple(5) → 15`、singleton→singletonヘルパーが解決、`module_function`カバー、own-classのみ / 祖先チェーンは見送り;表面化した相互再帰の不健全性1件を根本で修正`67fb8a71`、表面化した`Pathname#expand_path`のRBS厳格性FPクラス1件を`data/core_overlay/pathname.rbs`オーバーレイで修正`40bf7cdb`、ruby/libは267へ復帰）、そして**ノードごとキャッシュの調査は真のパフォーマンス犯人を代わりに解決** —— 9a3d6f5cの戻りメモは粗い`summaries.empty?`ゲートのせいで呼び出しの99.97%でバイパスされていた（fixpointはすべての最外殻メソッドにエントリーをシードする）;事後のconsultカウンタ修正（`4b476918`に同梱）で`video_analyzer.rb`は179.7秒 → **0.79秒（約230倍）**、全コーパスはバイト同一。2026-06-13 —— **16リポジトリの現実ユースケーススイープ**（[テンプレート/パース](../notes/20260613-template-parsing-corpora-survey/) + [アプリ/ネットワーク](../notes/20260613-app-network-corpora-survey/)サーベイ）: 8つの新規メカニズムを発見、6つを同日修正 —— クロスファイルの`rescue Const`がプロジェクトの`X = Class.new(Y)`ではなくコアへ解決していた件（liquid −4）、`Array#compact`の要素nil除去、`respond_to?(:m)`真値の非nilナローイング（nilメソッド集合でガード）、safe-nav `&.`がnil構成要素に対してundefined-methodを発火しなくなった（健全）、並行代入のivarターゲットをクラスivarユニオンにjoin（`old, @cb = @cb, blk` / popen3タプル;net-ssh −6、textbringer −1）、そして —— killされたT1エージェントが残したself-checkエラーを片付ける中で発見 —— **値位置の`||` / `&&`が生き残る短絡エッジをナローイングするように**（`b7c155fb`;`nullable || fallback`で終わるメソッドが戻りサマリーに`nil`を漏らさなくなった）。N2はADR-58の宣言nil非燃料を`argument-type-mismatch`へ拡張した（`9d697b63` —— textbringer −5、concurrent-ruby −2、他はバイト同一;ADR-58の追記として記録）。N5は発見済みオーバーライドが存在するとき、オーバーライド可能なメソッド戻り値へのself呼び出し採用をゲートする（`106b93dd` —— rgl 13件の常時真FP → 0、コーパスはバイト同一;ADR-57の追記として記録）。WD1bの需要は蓄積し続けている（パーサの`loc` ×25）—— 再訪するなら抑制ではなく不変条件クレジットのナローイングとして。オープンなエンジンキュー: ADR-41バジェット配線、G2過剰nilableなビルトイン戻り、singleton祖先チェーン。

同じく2026-06-13に着地 —— **[ADR-60](../adr/60-pre-freeze-plugin-contract-consolidation/)のfreeze前プラグイン契約統合、全WD完了**（[プラグインインターフェースレビュー](../notes/20260613-plugin-interface-bc-review/)より;ADR-50 v1.0サーフェスfreeze前の最終ウィンドウBC破壊）。WD1は配線されたことのない`external_files:`マニフェストフィールド + `Macro::ExternalFile`を削除;WD2は`BlockAsMethod`の`verbs:`→`method_names:`と`NestedClassTemplate`の`name_arg_position:`→`symbol_arg_position:`をリネーム（エイリアスなし）;WD3は`Plugin::Base#cache_for`をADR-45のrecord-and-validateパスに移し（依存記述子はプロデューサーブロックの**後**に捕捉されるため、ブロック内の`io_boundary`読み取りはもはや不可視ではない —— 構造的な古いキャッシュの危険）+ 新しい`Cache::Descriptor::GlobEntry`に支えられた宣言的な`producer watch:`、バンドルされた11個すべての発見プロデューサーをprime-before-`cache_for`イディオムから移行し`glob_descriptor`をプライベート化;WD4は`read_fact` / `producer_value` + `producer_error` / `diagnostics_for`を`Plugin::Base`に追加し、計測されたボイラープレート（12個の`*_or_nil`メモ、7個のファクト読み取り、約23個の違反マップ）を移行;WD5は両方の`rigor-plugin-author` SKILLを揃えた。ゲート: `make verify`（self-check + check-plugins）がグリーン、7個のプロデューサーを使う統合specは不変。Keep判定（`dynamic_return`/`type_specifier`分割、ファイルルールサーフェスとしての`diagnostics_for_file`、`config_schema`の二重文法）はADR-60の却下された代替案として記録。

v0.1.17サイクル（内部構造レビュー + パフォーマンスチューニング）が出荷したもの: インクリメンタル解析（`rigor check --incremental`、[ADR-46](../adr/46-incremental-dependency-graph/)）、未変更プロジェクトの高速パス（[ADR-45](../adr/45-unchanged-project-fast-path/)）、大きなアロケーション（allocation）削減（[ADR-44](../adr/44-dispatch-allocation-churn/)）、Elixir v1.20着想のナローイング（narrowing）（`Array`非空 + `Hash`キー存在）+ `flow.unreachable-clause`（[ADR-47](../adr/47-narrowing-driven-clause-reachability/)）、`rigor:v1:conforms-to`ディレクティブ、`call.self-undefined-method`ルール（`:off`で出荷、[ADR-24](../adr/24-self-method-call-resolution/)スライス4）、`Data.define`値fold（[ADR-48](../adr/48-data-struct-value-folding/)）。完全な記録は`CHANGELOG.md` § `[0.1.17]`にある;ここで再要約しないこと。

v0.1.17はまた**v0.2.0への道のりのためのリリースエンジニアリング機構**も着地させた（ユーザー向けCHANGELOGには意図的に*入れていない* —— プロセス / CI / ドキュメントだから）: [ADR-49](../adr/49-adr-authoring-guidelines/)（ADR執筆ルーブリック + `rigor-adr-author`スキル + コーパス監査ノート[`docs/notes/20260605-adr-corpus-rubric-audit.md`](../notes/20260605-adr-corpus-rubric-audit/)）;**[ADR-50](../adr/50-release-engineering-and-stability-strategy/)**（リリースエンジニアリング + 安定性戦略、v0.2.0→v1.0.0、PHPStanをモデルにしたもの）;`release/x.y.z`ブランチワークフロー + `release-gate.yml`（アドバイザリー）+ `make bench-perf`パフォーマンスゲート;および`rigor-release-prep`スキルのブランチ + リリースサマリーの規約。**v0.1.17はこの機構上での最初のリリースカット**であり —— これがエンドツーエンドで検証された（リリースゲートがカット途中で実際の設定クラッシュバグ、`source_inference: false`クラッシュを捕捉;同じリリースで修正）。

ヘッドラインのリアリズム数値（v0.1.12のOSSリアリズムカット時点で計測;依然有効——後続のカットは新しいフルサーベイではなくオンボーディング / `def.override-*` / プラグイン契約スイート / パフォーマンスを追加した）:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

Mastodonの残り6件のエラーはエンジン精度とは無関係: 5件はテストフィクスチャ内のnil-receiver + 1件は上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（narrowing）ギャップ（[`docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md`](../notes/20260528-rbs-upstream-pr-resolv-typeclass/)を参照）。

## 次セッションのエントリーポイント

> **フォーカスはv0.2.0への道のりで、[ADR-50](../adr/50-release-engineering-and-stability-strategy/)が統制する**。機構はv0.1.17で出荷した;残るのは**その較正 + 堅牢化**、ADR-50の段階的実装、そして常設のエンジンバックログ。`make verify`はクリーン。
>
> **（A）リリースエンジニアリング + CI —— ADR-50を運用化し、v0.1.18 CI環境サポートを出荷する（目玉トラック）:**
> 0. **v0.1.18 —— CI環境サポート**（v0.2.0前のテーマ別カット;全サーフェスは[`ROADMAP.md`](../roadmap/) §「v0.1.18 — CI-environment support」）。**CI診断出力 + 自動検出 + テンプレート + スキルの半分が着地した**（[ADR-51](../adr/51-ci-diagnostic-output-formats/)）: `rigor check --format sarif|github|gitlab|checkstyle|junit|teamcity`（`--format json`フィールド上の6つのCIネイティブレンダリング、`lib/rigor/cli/diagnostic_formats.rb`;`checkstyle`はreviewdogブリッジ → 任意のreviewdogレポーター）**+ ランタイムCI自動検出**（WD7、`lib/rigor/cli/ci_detector.rb`、PHPStanの`CiDetectedErrorFormatter`をモデルにしたもの: デフォルトの`text`出力がファーストクラスCIのネイティブ形式を自動発行する —— GitHub Actions / TeamCityはログを増補、GitLab + セカンドクラスCIはreviewdog / formatをヒント;オプトアウトは`--no-ci-detect`/`RIGOR_CI_DETECT=0`;Rigor自身の`make check` / specsはオフに固定）+ `docs/manual/ci-templates/`下のコピペ用CIセットアップテンプレート（reviewdog `action-setup`バリアントを含む）+ バンドルされた`skills/rigor-ci-setup/`スキル（Phase 0のプラットフォーム検出 + プラットフォームごとにルーティングされるreviewdogレポーター）+ `docs/manual/11-ci.md`の解説。解決したスコーピング判断: 新規ADR（ADR-27の改訂ではない）;6つすべての形式;GitHubの*デフォルト*サーフェスはSARIFではなく`github`アノテーション（SARIFアップロードはコードスキャニング = プライベートリポジトリではGHASが必要）;ファーストクラス（ネイティブ、PHPStanがサポート）対セカンドクラス（reviewdog）の分割 = WD7。**カットの残り:** ADR-51が先送りするエルゴノミクス（`--output FILE`、reviewdog `rdjson`、TeamCity、よりリッチなSARIFルールメタデータ —— すべて需要ゲート）、ADR-27 § WD3の`setup-ruby`プリビルド4.0タイミングの注意点、そしてv0.1.18のタグ付け前に常設バックログが寄与するその他のもの。**実際のカットにはrigor-release-prepスキルを実行すること**。
> 1. **パフォーマンスゲートを較正する**。`bench/baseline.json`は**未較正**で出荷されている（`make bench-perf` / リリースゲートが通り、提案を発行するため）。CIで計測したLinuxベースライン —— `release-gate.yml`の`bench-baseline-*`アーティファクトから、またはLinux上の`make bench-perf`から —— を`{ "calibrated": true, "targets": {…} }`としてコミットし、次に`release-gate.yml`をアドバイザリー → 必須に堅牢化する。（ADR-50 WD4/WD6。）
> 2. **OSSスイープを較正する**。`data/oss-sweep/mastodon-thresholds.json`は未較正（`max_diagnostics: 999999`）。週次スイープを赤に保っていた`source_inference: false`クラッシュは**修正済み（v0.1.17）**なので、スイープは今や走る —— 閾値を約6のMastodonベースラインに対してリフレッシュする（削除 + 再較正、またはワークフローアーティファクトをコミット）。
> 3. **ADR-50の段階的実装**（それぞれ独自のスライス;ADR-50はProposedのまま → v1.0.0でratified）: **bleeding-edgeオーバーレイ** + `rigor show-bleedingedge`差分コマンド + 粒度の細かい`bleeding_edge:`設定（WD2）;**列挙されたパブリックサーフェスドキュメント**（WD1、v0.2.0でドラフト）;**サポートラインモデル**（最新 + 1つ前のマイナーpre-1.0 → post-1.0でPHPStanの`1.x`デフォルトブランチ、WD5）;**`rigor upgrade`**マイグレーション支援コマンド（WD7、最初の具体的なBCが対象を与えるまで先送り）。
> 4. **v0.2.0カット** —— 唯一の実質的なゲートは外部プラグイン契約に対する文書化された安定性コミットメント;**ADR-50が今やそのポリシーを提供する**（ゲート1の実行可能な証拠はv0.1.16で着地）。[`docs/ROADMAP.md`](../roadmap/) §「Release strategy」を参照。
>
> **（B）外部コーパスゲート —— `~/repo/ruby/rigor-survey/`が必要、このリポジトリ内では完結しない:**
> 5. **ADR-24スライス4 —— コーパスFPゲート + ゲート拡張**。`call.self-undefined-method`は`:off`で出荷、Rigor自身の`lib`でFPクリーン。プロファイルをフリップする前にWD4 FP評価を実施し、次にスタンドアロンのみのゲートをスーパークラス / includeチェーンへ拡張する（レコーダーで祖先チェーン解決の完全性を記録 —— 「collect, don't recompute」ルート）。下記§「ADR-24」を参照。
> 6. **`rigor check --incremental` CIゲート拡張** —— `--verify-incremental` CIゲートをMastodon + GitLabのサーベイツリーへ拡張する。
>
> **（C）リポジトリ内エンジンバックログ（需要駆動、それぞれADRスコープ）:**
> 6a. **正式リリース前のアーキテクチャ再検討 —— 最も直近でアクティブなトラック（[ROADMAP](../roadmap/) §「Internal architecture」、[ADR-53](../adr/53-scope-discovery-index-separation/)）**。2026-06-11着地: Phase 1（sorbet → `Type#accepts`、フォールバックの`CallContext#with`、`CLI::CheckCommand`抽出）、ADR-53 Track A（A1 `Scope::DiscoveryIndex` + A2 writer削除）、Track BスライスB1+B2（シャドウラン等価ハーネスの背後で2つのフローコレクターをホストする`CheckRules::RuleWalk` —— `rule_walk_equivalence_spec` + `RIGOR_SHADOW_RULE_WALK=1`）、stdlibシングルトンフォルダーのクラス名ゲート、そして`Analysis::Runner`の分解（`runner/{pool_coordinator,project_pre_passes,diagnostic_aggregator,run_snapshots}`）。Track B B3は2026-06-13着地（`b85c51c6` + `4f1745aa` + `963a2947`）: `RuleWalk`はいまや統合コンテキスト（`in_loop_or_block` + 修飾されたクラス／モジュールのプレフィックス + `inside_def`）を1つのイミュータブルなノードごとの`Context`でスレッドし、5つの組み込みのファイルごとのウォーク（2つのフロー + IvarWrite + DeadAssignment + メインの`NodeWalker.each`パス）が1つの走査に乗る;各コレクターは`NODE_CLASSES` + 任意の`RULE_WALK_GATES`（ウォーク所有のサプレッション） + `#visit(node, context)`を宣言し、収集／フィルタロジックはそのまま。バイト単位同一でゲート（self-check + プラグイン／examples + Mastodon`app/models` + kramdown`lib` + haml`lib`、シャドウモードはアクティブかつサイレント —— メインパスで、いかなるドリフトよりも前に、本物のidentity-`==`の不一致を捕捉した）、`rule_walk_equivalence_spec`は174例、bench-perfはニュートラル。**残り:** Track B B4（`CheckRules::RuleWalk`を`Plugin::NodeRuleWalk`と収束 → 合計でファイルごとに1ウォーク）。Phase 3bは2026-06-11着地（`f80c2396`）: Narrowingが`predicate_certainty` / `class_pattern_certainty` / `value_pattern_certainty`を所有;Typer/Evaluatorは呼び出し側;`constant_value_polarity`（`&&`/`||`ゲート）は意図的にConstant専用のまま —— そこでのフルプローブ精度はキューに入った挙動変更であり、リファクタではない。fork-poolのクロスファイルインデックスバグは別途修正された（`b94a8b6f`）。
> 6b. **[ADR-52](../adr/52-compiled-plugin-contribution-dispatch/)のプラグインディスパッチ移行**。2026-06-11完了: 5つすべてのレガシーユーザーが移行（ARはランタイムの`methods:`ゲート経由 —— 新しいゲート形式は不要）、フックは削除されロード時エラー + CHANGELOG移行ノートを伴い（スライス5b）、そして単一のエンジン所有ノードルールウォークが着地した（スライス6）。下記§「ADR-52」を参照。
> 7. **[ADR-48](../adr/48-data-struct-value-folding/) `Struct`フォローアップ**（独自のスライスと変更健全性ストーリー —— セッター / `[]=`がインスタンスメンバーマップを無効化;サイドテーブルは`Data.define`のみを記録）+ 素のローカルブロック形式のパリティ（`c = Data.define(:x) do … end` —— スライス4のリーダー再定義ガード用の解決可能なクラス名なし、保守的なボイコット）。`Data.define`は出荷済み（スライス1〜4）。
> 8. **[ADR-47](../adr/47-narrowing-driven-clause-reachability/) WD3b** —— 分解 / 値 / 変数キャッチオール（catch-all）パターンの網羅性（先送りされた[ADR-36](../adr/36-mangrove-enum-nested-class-emission/)の`is_a?`隣接;アドホックに推論しないこと;ゼロ発火のWD4スイープにより優先度引き下げ）。
> 9. **`MathFolding`のFloatサイン精緻化** —— **仕様争議あり、迅速な勝利ではない**。`Math.exp → positive-float`等にはFloatサイン精緻化（`positive-float` / `non-negative-float`）が必要だが、[`imported-built-in-types.md`](../type-specification/imported-built-in-types/)はこれを**意図的に除外している**（精緻化は意図的に`Integer`専用;Floatのサイン / リテラルナローイングは`NaN` / signed-zero / 型変換の根拠で「デフォルトで拒否」 —— 仕様が認めるのは将来の`finite-float` / 非`NaN`証明）。そして`Math.exp(Float::NAN) → NaN`により、非`NaN`前提条件なしには明らかに非健全。ADR相当 + 仕様改訂が先;需要ゲート。
>
> check-rulesルート経由のADR-24スライス4を**再起動しない**こと（2026-06-05にリバート済み、135件のFP —— 下記参照）;評価時レコーダーが着地済みのルート。`Runner#initialize`のivar事前シードをヘルパに抽出**しない**こと（エンジン自身のフロー解析からそれらが隠れる → 自己チェックFP;「Gotchas」を参照）。

### 参照読書

1. [`docs/ROADMAP.md`](../roadmap/) §「Release strategy — the road to v0.2.0」—— v0.2.0をゲートするもの（今やADR-50が統制する）。
2. [`docs/adr/50-release-engineering-and-stability-strategy.md`](../adr/50-release-engineering-and-stability-strategy/) —— v0.2.0→v1.0.0のリリース / QA契約（互換性サーフェス、診断の非契約 + bleeding-edge、パフォーマンスゲート、サポートライン、昇格ケイデンス）。
3. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.1.17]` —— 出荷済みのパフォーマンス / インクリメンタル / 診断サイクル;§ `[0.1.16]`はプラグイン契約スイート + ADR-43;§ `[0.1.12]`はOSSリアリズムサイクル。
4. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) —— パブリック対内部の安定性境界（ADR-50 WD1がそれを列挙する）;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。

## Gotchas（load-bearing、苦労して学んだもの）

- **ADR-46** —— `Runner#initialize`のivar事前シード（`@class_decl_paths_snapshot = {}`等）をヘルパに抽出**しない**こと;コンストラクタの外に移すと、エンジン自身のフロー解析からそれらが隠れ、`make check`が`snapshot.size`をnil-receiver偽陽性として自己フラグする。インラインに保つこと（コンストラクタは`AbcSize`のdisableを持つ）。
- **ADR-45** —— `@collect_stats`はデフォルトで真（キャッシュをこれでゲートできない;ヒットはnil統計を返す）;フリーズ済みプラグインへの遅延`@io_boundary ||=` → `FrozenError`（`instance_variable_get`を使う）;キャッシュの書き込み / シリアライズ失敗は握り潰される（実行を決して壊さない）。
- **ADR-24** —— セルフ呼び出し解決のcheck-rules*再実装*は、エンジン実際の解決（精度のために`module_function` / `Data.define`アクセサ / mixinを既に処理する）から乖離する → 135件のFP（リバート済み）。着地済みのルートは評価時`SelfCallResolutionRecorder`（「collect, don't recompute」）。
- **bench-perf** —— Makeターゲットは`bench`ではなく`bench-perf`（素の名前は`bench/`データディレクトリと衝突する;ファイルは`.PHONY`なしの規約を保つ）。`bench/baseline.json`は未較正で出荷される → 初回実行が`bench/baseline.updated.json`（gitignore済み）を書き、通過する。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログは[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」にある。

### ADR-52 — コンパイル済みプラグイン貢献ディスパッチ（完了 —— スライス1〜6が2026-06-10/11着地;5つすべてのレガシーユーザーが移行、フック削除、単一ノードルールウォーク着地）

[ADR-52](../adr/52-compiled-plugin-contribution-dispatch/) + 根拠となる[構造監査ノート](../notes/20260610-plugin-architecture-perf-audit/)（2026-06-10）。**スライス1（WD1）着地**（`67a552de` + `1deecb2f`）: コンパイル済み貢献テーブル + 6つのエンジン呼び出しサイトの再配線。コントロール対HEADワークツリー経由で、Mastodon `app/models`（6プラグイン）+ GitLabサブセット（11プラグイン、2,332行）でWD6ゲートのバイト同一。ゲートが捕捉したGOTCHA: `&:symbol`ブロックパスは`call_node`として`Prism::BlockArgumentNode`をディスパッチする —— 素の`call_node.name`が例外を投げ、`block_return_type_for`のrescueに吸収され、`select(&:presence)`をブロックなしEnumeratorオーバーロードへフリップした（6件の新規GitLabエラー）;常に`respond_to?(:name)`経由でゲート名を導出すること、リグレッションspecがそれを固定する。**スライス2（WD2の静的メソッド名のみゲート）着地**（`c3550b00` + `cd5d5990`）: `dynamic_return receivers:`は今やオプショナル —— レシーバーキャリアが名前的型ではなくリファインメント型であるプラグインのために、ルールは`methods:`単独で（レシーバーレスに）ゲートできる;エンジンはレシーバー祖先チェックをスキップし、レジストリは名前セットでゲートする。`rigor-units`の例を移行した（そのデモでバイト同一、17診断）。

**スライス2を実装中に発見したAUDIT CORRECTION**（ADR + 監査ノートに記録）: 監査のスライス2ターゲットは両方とも誤りだった —— **activesupport-core-extは`flow_contribution_for`を出荷していない**（純粋なRBSバンドルであり、ターゲットではない）し、**sorbetのカタログパスは任意の`def`メソッド名にマッチする**（*ランタイム*の名前セットであり、静的ではない）。本番プラグインで静的ゲートに適合するものはない;unitsがその最初の消費者だった。

**スライス3（ランタイムレシーバーセットのcallable）部分的に着地**（`fb5aea04`/`0f1a64b2`エンジン + `be4c532c` rigor-activestorage）。`dynamic_return receivers:`は今やcallableも受け付け、プラグインに対して`instance_exec`され、ルールごとにメモ化され、**初回ディスパッチ時に遅延解決される**（常に`#prepare`の後）—— 設計判断はrunnerの`finalize!`ではなく、初回使用時の遅延に決着した: レシーバーゲートはインスタンスの`dynamic_return_type`パスに存在し、決してContributionIndexには存在しない（レシーバーゲートのルールは`methods:`ゲートを持たないので、レジストリは既にそれを静的レシーバールールのように扱う）ため、prepare後のテーブル再構築は不要。重要な健全性論証: 解決されたセットはブロック自身のフィルタの**安全な過大近似**であり（エンジンは等しいか部分クラスを認め、ブロックが精確なルックアップを再実行する）、古いフックが受理したすべてのレシーバーがブロックに到達する → バイト同一。callableは遅延/冪等なインデックス（activestorageの`attachment_index`、ARの`model_index`）を参照しなければならず、例外を投げてはならない（nil時は`[]`を返す）。ルールごとのメモは`initialize`で作成されるHash + `||= {}`ガード付きで、`allocate`ベースのユニットspecと自己フリーズするプラグインの両方が機能する。activestorageはGitLabコーパスでゲート（Mastodonはそれをロードしない）、2,322診断バイト同一。

**rigor-activerecord —— ブロッカー解決、2026-06-11にランタイムの`methods:`ゲート経由で移行（下記の移行済み段落を参照）;receivers-ゲート失敗の記録は歴史的教訓のために残す**。元の記録: `dynamic_return`のレシーバーゲートは呼び出しの**`receiver_type`**でキーするが、ARの2つのクラス側パスは**AST**（`class_call_return_type` → `constant_receiver_name`）と**`scope.self_type`**（`implicit_self_class_call_return_type`）を読み、レシーバー型を読まない。検証済みの根本原因: RBSにないプロジェクトモデル —— つまりほぼすべての実モデル —— はその定数を`Dynamic[top]`として型付けするので、`User.find(1)`は`receiver_type = Dynamic`、`class_name = nil`でディスパッチし、ゲートが辞退し、`u`は決して`Nominal[User]`にナローイングされず、インスタンスチェーン（`u.name → String`）が崩壊する。古い`flow_contribution_for`は`receiver_type`を決して見なかった（ASTを読んだ）ので、関係なく機能した。ARはコーパス実行の前に自身のエンドツーエンドspec（`activerecord_plugin_spec.rb`「types an accessor end-to-end…」「resolves the block element type…」）でこれを捕捉した —— コーパスゲートより安いシグナル。ARのインスタンス/リレーションパスはゲートが正しく機能するはずだが、クラス側パスのためにフックを残す部分移行はフックを削除するというスライス5の目標を台無しにする。**ARはフックを離れる前に新しいゲート形式が必要** —— ADR-52「rigor-activerecord blocker」を参照: （A）エンジンが発見されたインソースのクラス定数を`Singleton[Class]`として型付けする（広範で高リスクなディスパッチ変更、独自のADR）か、（B）**ASTレシーバー定数名**および／または**クラスボディ内の暗黙的self**でキーするゲート（AST-keyedプラグインの正直な後継形式;スライス4の設計問題）。厳密メンバーシップSetゲートの精緻化（ARの約100モデルセットにO（1））はプロトタイプされ、この試みとともにリバートされた —— 機能するAR移行とともにのみ着地させること。

**スライス4（ランタイムメソッド名セットのcallable）部分的に着地**（`79dc790d`エンジン + `46b14280`の例）。`dynamic_return methods:`は今やcallableも受け付け、スライス3のreceivers callableと対称的: `instance_exec`され、`#prepare`後に遅延解決され、名前空間化されたキャッシュキー（`[:methods, rule]`）の下でSymbol Setとしてメモ化される。callableのメソッドセットはレジストリの名前ゲートにコンパイルできない（レジストリ構築時には未知）ので、`ContributionIndex#build_name_gates`は静的Array`methods:`でのみゲートし、callable-methods（またはレシーバーのみ）プラグインは名前で未ゲートとして扱い —— 毎ディスパッチで参照され、インスタンスパスでフィルタされる。`rigor-lisp-eval` + `rigor-pattern`を移行（設定由来の`@method_name`、ASTのレシーバー/引数チェックはブロックに残る → ARスタイルのDynamic問題なし）;それらのエンドツーエンドspec + デモはバイト同一、specの書き換えは不要（例specは既にエンドツーエンド）。GOTCHA: サブエージェントのデモ等価実行が`.rigor/cache/`アーティファクトを残してコミットされ、掃除が必要になった —— ルートの`.gitignore`の`.rigor/cache/`ルールは`examples/*/.rigor/cache/`にマッチしない（そしていくつかの`plugins/*/demo/.rigor/cache/`は既に追跡されている —— 既存の衛生ギャップ、別途修正のためにフラグ）。

**rigor-sorbet —— 2026-06-11に移行**。引き継ぎが設計したとおりに着地: `dynamic_return methods: -> { recognised_method_names }`（`SORBET_ASSERTIONS` ∪ `:absurd` ∪ 新しい`Catalog#method_names`）、副作用（`@reachable_absurd_nodes` / `record_reveal_type_call` / `record_assert_type_check` / sigilゲート）をルールブロックに再配置、ブロックは素の`Rigor::Type`を返す。引き継ぎが解決していなかった唯一の設計ポイント: **`T.bind`の`post_return_facts`は`dynamic_return`に乗れない**（ディスパッチャーはマージから`return_type`のみを消費し、ステートメント評価器は`type_specifier` + レガシーフックから`post_return_facts`のみを消費する）—— なのでファクトは同じsigilゲートを持つ`type_specifier methods: [:bind]`ルールに移り、`Constant[nil]`戻り値は`dynamic_return`ルールに留まる。`T.absurd`の`exceptional: :raises`スロットは置換不要だった —— ディスパッチャーは既にそれを落としていた（`Merger.merge(...).return_type`）;`bot`戻り値が到達不能性を運ぶ。未使用の`AbsurdRecognizer.contribution`は削除された。**ゲート:** 63例のエンドツーエンド統合spec（直接フック呼び出しなし —— 書き換え不要）+ strapとdependabot-coreでのバイト同一な`rigor check --no-cache`（コントロール = `vendor/`をシンボリックリンクで共有 + `.bundle/config`をコピーしたHEADワークツリー）。**スループット: dependabot-core 1262.6s → 33.4s（約38倍）** —— コンパイル済みゲートの勝利が計測可能になった最初のWD3移行（未ゲートのフックはあらゆる名前付き呼び出しで`scope.type_of`経由でレシーバーを再型付けし、カタログチェーンルックアップを実行していた）;これはサーベイノートの「full `common/lib`が4分以上で完了しなかった」項目も再開させる。

**rigor-rspec —— 2026-06-11に移行（スライス5a、ファイルごとのゲート形式）**。`dynamic_return file_methods:`は最後のWD2 DSL形式: **ファイルパス**を受け取るcallableで、`instance_exec`され`(rule, path)`ごとにメモ化される（同じランタイムキャッシュ内のキー`[:file_methods, rule, path]`）、**`methods:`と相互排他**（1つの名前ゲート、2つのスコープ）、**nil-pathはfail-closed**（ファイルコンテキストのない合成呼び出しサイトは辞退する —— ゲートがキーするものを持たない）。レジストリは既にそれを名前で未ゲートとして扱う（ルールの`[:methods]`がnil → `build_name_gates`がnilを返す）ので、レジストリの変更は不要だった。`dynamic_return_rule_applies?`は`path`パラメータ（`scope&.source_path`から）を得た。rspecのlet-bindingルールが最初の消費者: ゲートセット = 新しい`LetScopeIndex#let_names`（ファイル内のあらゆる`let`/`subject`名 —— ブロックの行スコープ化された`let_block_at`の安全な過大近似）;ブロック本体は古いフックそのままで、素の型を返す。`public_api_drift_spec`が新しいキーワードを固定する。**ゲート:**エンジンユニットspec（発火/辞退/パスごとのメモ/fail-closed/検証）、rspec統合specのエンドツーエンド、バイト同一なデモ + GitLabコーパス。

**rigor-activerecord —— 2026-06-11に移行;ブロッカーは新しいゲート形式なしで解決**。2026-06-11のブロッカー分析は`receivers:`ゲートに固執したが、ARはレシーバー型を決して読まない既存のスライス4ランタイム**`methods:`** callableに適合する。ゲートセット = モデルインデックスからの`FINDER_METHOD_NAMES` ∪ スコープ ∪ アソシエーション ∪ カラム（+ `column?`述語）—— ARの4つのパスが型付けできる名前の和集合そのものなので、ゲートは構成上、未ゲートのフックとバイト同一;ブロックはAST定数 / `self_type` / `type_of`解決をそのまま保つ（rigor-sorbetの形）。オプションA（Singleton型付け）とB（AST-keyedゲート）は不要として却下 —— ADR-52 §「rigor-activerecord blocker —— RESOLVED」に記録。統合specの17件の直接`flow_contribution_for`呼び出しは`dynamic_return_type`へ書き換えられた（委譲;エージェントが見つけたgotcha: `dynamic_return_type`は`scope.environment`を読むので、specスコープのダブルはそのメソッドがスタブされている必要がある）。**ゲート:** 93例のエンドツーエンドspec + GitLabコーパスバイト同一。

**スライス5b —— 2026-06-11完了**。`flow_contribution_for`削除: Baseフック削除、両方のコレクターのレガシー分岐削除、ContributionIndexのフローセット + legacy-disables-global-gateルール削除、そしてフックを依然定義しているプラグインは今やCHANGELOG移行ノートを指し示すロード時`ArgumentError`を投げる（サイレントに決して呼ばれないのはサードパーティ作者にとって最悪の失敗モードだろう）。エンジンspecの書き換え + docs/README/skillの一掃は委譲;レビュー済み。`public_api_drift_spec`と契約適合フックリストを更新。

**スライス6 —— 2026-06-11完了**。エンジン所有の`Plugin::NodeRuleWalk`（ファイルごとに1回の`each_with_ancestors`パスで、マッチするすべての`(plugin, rule)`にディスパッチ）: プラグインごとの`node_file_context`はそのルールの前に1回実行;`is_a?`ノード型マッチングは具象ノードクラスごとのメモで保持;診断はプラグインごとにバケット化され、古いプラグインメジャー順で発行される（構成上バイト同一）;プラグインごとの分離/エラーエンベロープが再現される。`Base#node_rule_diagnostics`は保持（パブリックAPI）だが、ランナーはもはやプラグインごとにそれを呼ばない。

**ADR-52は完了**。需要ゲートの残り物のみ: ノードメジャー診断の再ソート（意図的に取らない —— バイト同一性を壊す）、そしてプロファイルがレシーバー祖先ウォークがホットだと示した場合の厳密メンバーシップSetゲートの精緻化。

**rigor-activerecordはブロック中**（根本原因 + 新しいゲート形式のオプションは上記段落とADR-52「rigor-activerecord blocker」に記録）。**委譲の教訓:**（AR）Sonnetサブエージェントは機械的なspec書き換えをうまく行い、かつリグレッションをspecではなくエンジンのものと正しくフラグした —— だがFP-coreの判断（ARが*そもそも移行可能か*）は私のものだった;レシーバーゲート移行を信頼する前に、常にプラグイン自身のエンドツーエンドspec（レシーバースタブのユニット/契約specだけでなく）を実行すること。（examples）デモを実行するサブエージェントはツリーにキャッシュアーティファクトを残しうる —— コミット前に報告された差分だけでなく`git status`/ステージされたファイルリストをレビューすること。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4（レコーダー + `call.self-undefined-method`ルール、`:off`で出荷）—— 着地済みv0.1.17**。**残り（外部コーパスが必要）:**プロファイルをフリップする前のWD4 FP評価、次にスタンドアロンのみのゲートをスーパークラス / includeチェーンへ拡張（レコーダーで祖先チェーン解決の完全性を記録）。解決されたclosed-classセルフ呼び出しに対する**arity診断**はスライス4の一部では**なかった**（undefined-methodのみ） —— ルールが実績を積んだ後の後続拡張。
- **クラスボディ内の非`Bot`一般採用** —— 解決されたセルフ呼び出しの戻り型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた（既存の呼び出し先戻り推論の不精度が下流で表面化した）;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ARスコープボディのラムダ`self`

`scope :x, -> { select(...).group(...) }`のインスタンスラムダ内で、ラムダの`self`がモデルクラスにリバインドされる必要が依然ある。v0.1.12は通常のメソッドボディに対する暗黙的selfのクラス側解決をクローズした;ラムダボディは残る（ADR-26領域）。経験的なケースは[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「What is increasing」項目2にある。

### ADR-23 — `rigor triage`スライス4プラグイン認識器

残り: プラグインが自身の認識器（recognizer）を貢献できる`Plugin`フック（先送り）。（構造化された`receiver_type` / `method_name`フィールド + SKILL統合はv0.1.8 / v0.1.9サイクルで出荷。）

### 推論バジェット — 仕様表は未配線（Layer 1ドキュメント衛生は完了）

仕様の設定可能な`budgets:`表（[`docs/type-specification/inference-budgets.md`](../type-specification/inference-budgets/)）はv1向けに規範的でありながら**配線されていない** —— 実際に効いているカットオフは、ハードコードされた3つのサイレントガード（再帰の再入≈深さ1、祖先ウォーク100、HKT fuel 64）とADR-10の`budget_per_gem`だけ。**Layer 2は解決済み、そしてそれはバジェットではなかった:**大規模アプリのコストの崖は`rigor-activerecord`の4.2 M保持Stringリーク（v0.1.16で修正）で、`union_size`はメモリと無相関と反証された。バジェット配線は**需要先送り** —— バジェット型のコストを示すコーパスプロジェクトは存在しない;もし現れたら、まず2aの分布プローブを再実行する（[ADR-41 WD3](../adr/41-inference-budget-design/)）。`RIGOR_BUDGET_TRACE` / `RIGOR_HEAP_PROFILE` / `RIGOR_HEAP_TRACE`プローブは再利用可能。

### Stdlib RBSカバレッジギャップパターン + ステージ済みの上流PR

上流の`ruby/rbs`ギャップが単一の内部呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable` + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードでは、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）はステージ済み —— **ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク**。

### Sig-gen（ADR-14）残りギャップ

`initialize`以外のソース（DB読み取り、設定、副作用）からivarが設定される`attr_reader`は依然`:untyped_return`を生成 → 手書きのsig。untypedレシーバーへの深いチェーンは`rbs collection install` / ADR-10の`source_inference:`。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグイン。`update_existing`は兄弟の親/子クラスブロックを畳み込まない（回避策: ターゲットsigを削除 + 再生成）。`skills/rigor-project-init/references/04-sig-uplift.md`に記載。

### ADR-49コーパス経済フォローアップ（オプション）

2026-06-05のコーパス監査は、過剰情報がコーパスの唯一の系統的ドリフトであることを見出した;ADR-22のSKILLスケッチ肥大はトリミングされた（v0.1.17）。ADR-1 / ADR-16が残る長さの外れ値だが、その長さは監査によれば「弁護可能」（高ステークス）で、抽出は基礎的な根拠を分断するため —— **割に合わない**と評価、完全性のために記録、キューには入れない。
