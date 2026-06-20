---
title: "現在の作業 — 再開ブックマーク"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "ab963b370f52890fd9d14bd0913ecc291afed81306ad858ca077171538c12521"
sourceCommit: "51a679f3ccd12f5bee48c24150401d10e978efce"
sourceDate: "2026-06-20T14:52:23+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.2.1リリース済み（2026-06-19）—— 2番目の`0.2.x`評価ラインのカット**であり、[ADR-50](../adr/50-release-engineering-and-stability-strategy/)が統制する。検出 + 設定の磨き込みで評価ラインを継続する: v0.2.0の`evidence_tier`偽陽性フィードバックを根本で解消する`Gemfile.lock`ゲート付きのActiveSupportコア拡張RBSオーバーレイ（[ADR-72](../adr/72-gemfile-lock-gated-rbs-overlays/)、`3.minutes`などがRailsプロジェクトで発火しなくなる）、`rigor check`の設定が何も解決しない警告、融合した静的∪動的の保護マップ（`rigor coverage --protection --mutation --with-tests`、[ADR-70](../adr/70-fused-protection-coverage/)）、さらにいくつかの純粋なリテラルfold、そして修正（素の`off`重大度のクラッシュ、エスケープするブロックのオプションハッシュ偽陽性、バンドルされたRBSデータなしでインストール済みgemを出荷していたgemパッケージングのバグ）。**v0.2.0（2026-06-17）**は最初の公式発表（一般 / 評価）リリースとしてこのラインを開いた —— 検出の**「歯（teeth）」** + 保護カバレッジ（[ADR-62](../adr/62-mutation-testing-teeth-measurement/) / [ADR-63](../adr/63-type-protection-coverage/)）、より広い定数fold、定義済み定数のリファインメント、`Struct.new`値fold（[ADR-48](../adr/48-data-struct-value-folding/)）、`evidence_tier` + `documentation_url`の診断メタデータ（[ADR-65](../adr/65-diagnostic-evidence-tier-and-doc-url/)）—— であり、互換性サーフェス（[`docs/compatibility.md`](../compatibility/)）をv1.0.0フリーズへ向けたマイナー非破壊の*試行*として公開する。**完全な記録は`CHANGELOG.md` § `[0.2.1]` / `[0.2.0]`にある;ここで再要約しないこと**。

`make verify`はクリーン。**v0.2.1以降、[ADR-73](../adr/73-skill-driven-user-experience/)のSKILL駆動オンボーディングUX（`rigor skill describe` + `rigor-next-steps`エントリーポイント + 13スキルカタログ + vercel-labs/skills配布）と、その6件のフィールドトライアル駆動UX修正がmasterに着地した**（未リリース —— `CHANGELOG.md` § `[Unreleased]`;完全な詳細は下記のエントリーポイントブロックにある）。ラインは今や**`0.2.x` —— 評価**だ: 外部からのフィードバックを集め、計画された機能セットを高い完成度へ持っていく。道は**v1.0.0**、ハードな契約フリーズ（[ADR-50](../adr/50-release-engineering-and-stability-strategy/)）を指している。[`docs/ROADMAP.md`](../roadmap/) §「Release strategy」を参照。

**リリースゲートのベースラインはv0.2.0カットで再較正された**（`bench/baseline.json`のパフォーマンスターゲット + `data/oss-sweep/mastodon-thresholds.json`）: 機能サイクルで蓄積したアロケーション / RSS増加と、歯に駆動されたMastodonの診断増加（`app lib config`で445 → 468、精度は42.84 %で不変）は容認された;再較正の検証が表面化させた3件の`StringScanner#[]`偽陽性は根本で修正され（`data/core_overlay/string_scanner.rbs` —— rbs 4.0.2の名前付きキャプチャオーバーロードのギャップ）、しきい値へは**容認していない**。**v0.2.1カットは両ベースラインを変更せずに据え置いた** —— アロケーション（約1930万）とピークRSSはv0.2.0の帯内に収まり、MastodonのOSSスイープはグリーンのままだったので、唯一のリリースゲートの赤は`wall_s`のみのCIノイズフレークだった（非ブロッキング;再実行する。壁時計だけで再較正することは決してない）。再較正の規律 + StringScannerギャップの教訓は下記のGotchasにある。

ヘッドラインのリアリズム（**v0.1.12のOSSリアリズムカット** —— このツールを実コードで信頼に足るものにした偽陽性削減の成果;これらは偽陽性削減のフロアであって、今日の正確なカウントではない —— v0.2.0の検出の歯は、精度を変えずにこれらのコーパスで表面化するカウントを意図的に*引き上げる*）:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

## 次セッションのエントリーポイント

> **▶ v0.2.1は出荷済み;ラインは今や`0.2.x` —— 評価であり、v1.0.0へ向かう**。進行中のリリースはない。次の実装者はエンジン精度のキュー（M3 / メンバーシェイプの弧、またはゲートなしの型カバレッジ作業）か、`0.2.x`評価ラインのタスクから選ぶ。`make verify`はクリーン。
>
> **（A）エンジン精度 —— M3 / メンバーシェイプの弧（キュー済み・ゲート順;2026-06-16に留保付きで先送り —— 順序を違えて着手しないこと）:**
> 1. **[ADR-67](../adr/67-parameter-type-inference/)の`check`ウォーク配線** —— ADR-66/68が実アプリで効くための前提条件。WD1+WD3+WD5は着地済み（呼び出しサイトでのパラメータ型推論（parameter type inference） + 上限付き不動点、`coverage --protection`のみに配線）;残るステップは`param_inferred_types`をメインのcheckウォークに供給することで、ウォーク前の収集（予算ゲート付き、おそらくオプトイン / インクリメンタル裏付け）に加え、WD1の本体内由来（provenance）**マーク** + 診断ガードを要する。**価値は不透明だ** —— WD1の抑制によってfold精度のみとなり、下流の偽陽性を表面化させればネットでマイナスになりうるため、具体的な需要が現れるまで先送りが妥当なままかもしれない。**エンジンのエントリーポイント（ウォームコンテキスト）:**収集は`ScopeIndexer.discovered_*_for_paths`に乗る;再利用する戻り値メモは`9a3d6f5c`（[ADR-57](../adr/57-self-call-return-adoption/)）;パラメータは`lib/rigor/inference/method_parameter_binder.rb:203`（`default_types_for`）でデフォルト`untyped`。
> 2. **[ADR-68](../adr/68-class-builder-folding/)のビルダー畳み込み** —— #1にゲートされる（パラメータ推論なしでは見返り~0、faradayで計測済み）。**三度のウォーク・二段階**の変更だ: 2つのサイドテーブル（`struct_member_layouts[Const]` + `discovered_classes[Const] = Singleton[Const]`、さもないとStructFolding層が決して発火しない）に加え、`collect_class_decls`へのスーパークラスのスレッド + レシーバー名解決 + 推移的な`< Struct`チェック。偽陽性に安全な部分的選択肢は、完全なスーパークラスのシードを既に持つファイルごとの2経路での同一ファイル限定の認識だ。ADRの「Corrected scope」補遺を参照。
> 3. **[ADR-66](../adr/66-discriminated-union-member-typing/)のタグナローイング** —— 同じゲート、より難しく（tag⇒payloadマップ + ビジターディスパッチ）、ADR-58より下位にランクされる。3つのうち最も優先度が低い。
>
> **（B）ゲートなしのエンジン精度（リリース / M3依存なし）:**
> - **type-coverage-uplift** —— より多くのビルトインメソッドを精密な型へfoldする（`rigor-type-coverage-uplift`スキル）。2026-06-17に`Range#first(n)` / `#last(n)` / `#take(n)` → `Tuple`、`Array#minmax` → `Tuple[min, max]`、`String#codepoints` → `Tuple`が着地;2026-06-19（v0.2.1で）はスカラー完全性バッチ`Symbol#name` / `#id2name` / `#intern`、`Integer#finite?` / `#infinite?` / `#nonzero?`、`Float#nonzero?` / `#integer?`、`String#grapheme_clusters` → `Tuple`を追加した。**教訓（再確認）:** 2026-05-22のカバレッジドキュメントは🔲ギャップを過大報告する（カタログの`leaf`パスがほとんどのスカラーメソッドを自動foldする）—— 実装前に`MethodDispatcher.dispatch`を経験的にプローブすること（候補ごとに定数レシーバー上でディスパッチして非nilの精密な結果をチェックする使い捨てスクリプトが最速のフィルタだ）;本当のギャップは、Tuple昇格ハンドラ + キャリアの`*_HANDLERS`エントリーを要するArray / 構造を返すメソッドに集まり、加えてたまにあるスカラー述語の一貫性ギャップにも集まる。
> - **[ADR-47](../adr/47-narrowing-driven-clause-reachability/) WD3b** —— 分解 / 値 / 変数キャッチオール（catch-all）パターンの`case`/`in`網羅性（ゼロ発火のWD4スイープにより優先度引き下げ;アドホックに推論しないこと）。
> - **セルフミューテーションのファイルごとの有効性（Product C）** —— `tool/mutation/self_mutate.rb <file>`（融合したself-check ∪ rspec）で`lib/rigor`のテストスイートの穴を塞ぐ。ツリー全体のコールドメソッド層は枯渇した（スイートはメソッドレベルで完全）;オープンな作業は`needs-verification`層（カバー済みだがアサートされていない）のファイルごとの裁定であり、中核ファイルを一度に1つずつ進める。2026-06-19にさらに7つの中核ファイル（`analysis/{run_stats,fact_store}`、`type/app`、`inference/{synthetic_method_index,indexed_narrowing,multi_target_binder}`、`inference/hkt_body`）をクローズした;各ファイルはゼロではなく等価ミュータント（メッセージ / inspectテキスト、到達不能な防御的コード）のフロアに収束する。ROADMAP §「Analyzer self-testing」;トラッカーは[`docs/notes/20260618-self-mutation-testing-plan.md`](../notes/20260618-self-mutation-testing-plan/)。下記のメソッドコールドネスによるノイズ除去のGotchaに留意すること。
>
> **（C）`0.2.x`評価ライン + [ADR-50](../adr/50-release-engineering-and-stability-strategy/)の残り:**
> - 外部からのフィードバックを集める（評価ラインの目的）;[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」の需要駆動バックログが`0.2.x`の完成目標だ（Ractor並行性トラックを除くすべて）。
> - **ADR-50の残りWD:**サポートラインモデル（WD5 —— 最新 + 1つ前のマイナー）、`rigor upgrade`マイグレーションコマンド（WD7、具体的なBCが対象を与えるまで先送り）、そして次のメジャー境界の規律がキューに入ったときの最初の**bleeding-edge `FEATURES`エントリー**（オーバーレイは今日時点で空 —— `Rigor::BleedingEdge`、`bleeding_edge:`設定キー、`rigor show-bleedingedge`、`rigor check --bleeding-edge[=ids]`はすべて配線済み;最初の規律は単一の`FEATURES`エントリーとして着地し、エンジン配線は不要）。
>
> **▶ [ADR-48](../adr/48-data-struct-value-folding/)の`Struct`値fold —— スライス1 + 2 + 3が2026-06-15に着地;スライス4は完全な設計とともに先送り**（セッターを通じた変更されたメンバーの精密な再型付け;ルートaの書き戻しをスライス3で証明されたno-alias/no-escapeケースに絞ったもの、設計は[`docs/notes/20260615-struct-folding-slice3-design.md`](../notes/20260615-struct-folding-slice3-design/)）。`Data.define`はスライス1〜4を出荷した（v0.1.17）。残るより小さな項目: `Data.define`の素のローカルブロック形式のパリティ（`c = Data.define(:x) do … end` —— リーダー再定義ガード用の解決可能なクラス名なし、保守的にbail）。
>
> **▶ [ADR-73](../adr/73-skill-driven-user-experience/)のSKILL駆動ユーザー体験 —— 2026-06-20に着地（本セッション;未リリース、`CHANGELOG.md` § `[Unreleased]`）**。v0.1.xのSKILL三点セットを超えるオンボーディングUXの向上だ: `rigor skill describe`（**presence限定**の状態プローブ → 推奨される次のスキル、WD2;`rigor describe`トップレベルエイリアス） + `rigor-next-steps`エントリーポイント + **13スキルカタログ**（`rigor-rbs-setup` / `rigor-editor-setup` / `rigor-mcp-setup` / `rigor-protection-uplift` / `rigor-monkeypatch-resolve` / `rigor-plugin-tune` / `rigor-upgrade` / `rigor-doctor`を追加）であり、**vercel-labs/skills** + バンドルされたgem経由で配布される（貢献者の`.claude/skills/`は`metadata.internal: true`でマークされる）。**フィールドトライアルで堅牢化済み** —— カンファレンスアプリのドッグフード + **13モデルのOpenCode ACPクロスベンダー検証**（13個すべての非Claudeモデルがラッパースクリプトでフローを忠実に駆動した;唯一の失敗は並列実行下でのOpenCodeの単一SQLiteセッションロックであり、今や`acp-agent-runner`スキルに記録済み）;ノートは[`20260620-skill-driven-onboarding-dogfood.md`](../notes/20260620-skill-driven-onboarding-dogfood/) + [`20260620-opencode-acp-cross-model-validation.md`](../notes/20260620-opencode-acp-cross-model-validation/)。トライアルは**6件のUX修正（すべて着地）**を駆動した: `target_ruby`のPrismフロアメッセージ（サポートされるフロア + 値の読み取り場所を明示する）、実行可能な便利メタgem（`rigor-rails`）のロードエラー、有効なパスに紛れた欠落パスに対する`check`のwarn-and-skip、空のRBS環境のWARNINGバナー（`RBS classes available: 0`は壊れた`signature_paths:`であって、クリーンな実行ではない）、**checkを認識する`describe`のエージェントプロンプトルーティング**（「presenceヘッドラインがときどき誤る」へのWD2を保つ答え —— *エージェント*がすでに持っている`check`の所見から精緻化する）、そしてRailsロック済みだがRailsプラグインなし → `plugin-tune`の推奨。
>
> **2件の先送りフォローアップ**（ADR-73 §「Field-trial follow-ups」、未決の決定 —— 着手したら先送りを解除する）: **（1）`rigor skill describe --deep`** —— *ヘッドライン*の推奨をcheck認識にする（スコープを絞った`rigor check`を実行 + 実際の所見でルーティングする: エラー → baseline削減、モンキーパッチのクラスタ → monkeypatch-resolve、`RBS 0` / 設定エラー → doctor）。`CheckCommand#build_check_runner`から**抽出した**共有の「checkを実行 → `Analysis::Result`」ヘルパを要する（今日はprivate + オプション / バッファ / キャッシュに結合している）;限界価値は**控えめ**だ —— 着地済みのエージェントプロンプトルーティングは、エージェントがどのみち実行する`check`の所見でエージェントをルーティングさせるので、これはエージェントの推論を省くだけだ。**（2）カバレッジ可解性ラベル**（トライアルの「P6」） —— `coverage --protection`の「ここに型を追加」の穴をジェネリック型パラメータ / 外部gem / フレームワークDSLで分類し、ユーザーが解決不能なものを追いかけずに済むようにする。**`Dynamic`由来（provenance）追跡**を要する —— `Inference::ProtectionScanner`の`Site`はレシーバーの*説明*を運ぶが、エンジンはレシーバーが`Dynamic`であることだけを知り、*なぜ*そうなったかは知らない;おそらくそれ自身のADRになる（`Dynamic[T]`キャリアに触れる）。
>
> check-rulesルート経由でADR-24スライス4を**再起動しない**こと（2026-06-05にリバート済み、135件の偽陽性 —— 着地済みのルートは評価時の`SelfCallResolutionRecorder`）。`Runner#initialize`のivar事前シードをヘルパに**抽出しない**こと（エンジン自身のフロー解析からそれらが隠れる → self-check偽陽性;「Gotchas」を参照）。`make verify`クリーンのシグナルだけでユニオン / nilableレシーバーの診断を**広げない**こと —— `rigor-survey`コーパスに対してゲートすること（外部コードは誤って型付けされたレシーバーの偽陽性を露呈する;「Gotchas」を参照）。再帰的な`always-truthy`の相互作用を最初に解決せずに、シェイプキャリアを`freeze` / `dup`を通して**保たない**こと（[`docs/notes/20260614-precision-foldgap-recon.md`](../notes/20260614-precision-foldgap-recon/)）。

### 参照読書

1. [`docs/ROADMAP.md`](../roadmap/) §「Release strategy」—— `0.2.x`評価ラインとv1.0.0フリーズへの道のり（ADR-50が統制する）。
2. [`docs/adr/50-release-engineering-and-stability-strategy.md`](../adr/50-release-engineering-and-stability-strategy/) —— v0.2.0→v1.0.0のリリース / QA契約（互換性サーフェス、診断の非契約 + bleeding-edge、パフォーマンスゲート、サポートライン、昇格ケイデンス）。
3. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.2.1]` / `[0.2.0]` —— 現在の評価ラインのカット。アーカイブされた`0.1.x`サイクル（[`docs/CHANGELOG-0.1.x.md`](../changelog-0.1.x/)）はパフォーマンス / インクリメンタル（[0.1.17]）、プラグイン契約 + ADR-43（[0.1.16]）、OSSリアリズム（[0.1.12]）の各サイクルを保持する。
4. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) —— パブリック対内部の安定性境界（ADR-50 WD1がそれを列挙する）;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。

## Gotchas（load-bearing、苦労して学んだもの）

- **ADR-46** —— `Runner#initialize`のivar事前シード（`@class_decl_paths_snapshot = {}`等）をヘルパに抽出**しない**こと;コンストラクタの外に移すと、エンジン自身のフロー解析からそれらが隠れ、`make check`が`snapshot.size`をnil-receiver偽陽性として自己フラグする。インラインに保つこと（コンストラクタは`AbcSize`のdisableを持つ）。
- **ADR-45** —— `@collect_stats`はデフォルトで真（キャッシュをこれでゲートできない;ヒットはnil統計を返す）;フリーズ済みプラグインへの遅延`@io_boundary ||=` → `FrozenError`（`instance_variable_get`を使う）;キャッシュの書き込み / シリアライズ失敗は握り潰される（実行を決して壊さない）。
- **ADR-24** —— セルフ呼び出し解決のcheck-rules*再実装*は、エンジン実際の解決（精度のために`module_function` / `Data.define`アクセサ / mixinを既に処理する）から乖離する → 135件のFP（リバート済み）。着地済みのルートは評価時`SelfCallResolutionRecorder`（「collect, don't recompute」）。
- **ADR-62 / ADR-63** —— `make verify`がゲートするのは`lib` + `plugins`のみ;**外部コーパスは依然として偽陽性を露呈しうる**、Rigorが誤って型付けするレシーバーから。ユニオン/nilableのundefined-methodルールはスカラールールの「推論された型と同程度にしか良くない」露出を継承する —— nilableスタディはmailでの`Hash | Hash`#pack FPを捕捉した（`compose_codepoints`が`Array`を誤って型付けした）。ユニオン / nilableレシーバー上のいかなる診断拡張を信頼する前にも、`rigor-survey`コーパス差分（`cd $proj; BUNDLE_GEMFILE=$rigor/Gemfile nix develop $rigor -c bundle exec $rigor/exe/rigor check --format json $paths`）を実行すること。さらに: 推論スキャナ（`PrecisionScanner` / `ProtectionScanner`）は`require "rigor"`で自動ロードされない（そのspecがそうするように明示的にrequireすること）;rubocopは注釈付きの`%<name>s`フォーマットトークンを強制する;そして`Data.define(:method, …)`メンバーは`Data#method`をシャドウする（`:method_name`を使う）。
- **セルフミューテーション（Product C、`tool/mutation/self_mutate.rb` —— `lib/rigor`自体をミューテートし、self-check ∪ Rigor自身のrspecでkillする）** —— `--coverage-gap`のツリー全体の穴のカウントは、**メソッドコールドネス**によるノイズ除去なしには無意味だ: Rubyの行カバレッジは複数行の式をその**最初の行**に計上するので、*カバー済み*の式の継続行（テスト済みの`to_h`のハッシュリテラルのエントリー）が未カバーとして読まれてしまう。穴は完全に未カバーの`def`の内側でのみカウントすること;クラスボディ／定数のサイトは除外する（ロジックではなくデータ）。このノイズ除去は`lib/rigor`の生のツリー全体カウントを**1969 → 22**にした（すべて`cli/mcp_command`内で、今や解消済み —— ユニットスイートはそれ以外メソッドレベルで完全）。テスト軸は**in-bundle**のrspecランナーを要する —— `with_unbundled_env`では**なく**、それは*外部*プロジェクトのGemfile向けでありRigor自身のスイートを壊すからだ。有効性層（カバー済みだがアサートされていない）は融合モードを介してファイルごとに進められ、ゼロではなく等価ミュータント（メッセージ / inspectテキスト）のフロアに収束する。生きたトラッカー: [`docs/notes/20260618-self-mutation-testing-plan.md`](../notes/20260618-self-mutation-testing-plan/);ロードマップのエントリーは §「Analyzer self-testing」の下にある。
- **bench-perf** —— Makeターゲットは`bench`ではなく`bench-perf`（素の名前は`bench/`データディレクトリと衝突する;ファイルは`.PHONY`なしの規約を保つ）。`release/x.y.z`へのプッシュでこれを走らせる`release-gate.yml`ワークフローは**`0.2.x`の試行中はアドバイザリー**だ —— レポートはするがマージをブロックしない（必須ゲートは`ci.yml`）;シグナルは依然としてリリース品質でレビューする価値がある。両方のベースライン（`bench/baseline.json`のパフォーマンスターゲット + `data/oss-sweep/mastodon-thresholds.json`）は**決定論的なシグナルがドリフトしたときだけ再較正される** —— v0.2.0カットはlibのアロケーションを≈1877万 / ピークRSS ≈232 MB / 壁時計13.75秒に、Mastodonの`app lib config`を468診断・最小精度0.4284に設定した;**v0.2.1は両方とも据え置いた**（アロケーション≈1930万は帯内に収まり、スイープはグリーン）。これらは余裕の少ない厳密カウント / 帯ゲートなので、精度やアロケーションの変化は設計上、**再較正されるまで**赤にフリップする。パフォーマンスは失敗した実行のログ内の**CIで計測されたLinux値**から再較正すること（アロケーションが決定論的なシグナル;**wall_sはノイジー → `gh run rerun --failed`が壁時計のみのフレークを片付ける。壁時計だけのためにベースラインを再較正してはならない** —— v0.2.1の唯一の赤はまさにこれだった）、そして**より高いカウントを容認する前にOSSスイープの診断を偽陽性についてdiffすること**（v0.2.0の再較正は3件の`StringScanner#[]`偽陽性を発見 → `data/core_overlay/string_scanner.rbs`経由で修正、しきい値へは容認していない）。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログは[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」にある。

### ADR-52 — コンパイル済みプラグイン貢献ディスパッチ（完了 —— スライス1〜6が2026-06-10/11着地）

呼び出しごと / defごと / ファイルごと / ノードごとのすべてのプラグイン参照は、レジストリ構築時に実行ごとに一度コンパイルされるテーブルを介して、エンジンが既に保持する鍵でゲートされる —— プラグインコードは候補ヒット時にのみ走る。5つすべてのレガシー`flow_contribution_for`ユーザーが移行し（ARの「receivers-ゲートブロッカー」は**新しいゲート形式なしで**解決された —— ランタイムの`methods:` callableはレシーバー型を決して読まないので、既存のスライス4ゲートに適合する）、フックは**削除され**（ロード時`ArgumentError` + CHANGELOG移行ノート）、そしてエンジン所有の単一の`Plugin::NodeRuleWalk`がファイルごとに走る。スライスごとの完全な記録（コミットハッシュ、解決されたARブロッカー、委譲の教訓）は[ADR-52](../adr/52-compiled-plugin-contribution-dispatch/) + [`docs/ROADMAP.md`](../roadmap/) §「compiled plugin contribution dispatch」にある。需要ゲートの残り物のみ: ノードメジャー診断の再ソート（取らない —— バイト同一性を壊す）、そしてプロファイルがレシーバー祖先ウォークがホットだと示した場合の厳密メンバーシップSetゲートの精緻化。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4（レコーダー + `call.self-undefined-method`ルール、`:off`で出荷）—— 着地済みv0.1.17;WD4コーパスFP評価は2026-06-14に完了 → ルールは`:off`のまま、昇格不可**（[ノート](../notes/20260614-adr24-slice4-self-undefined-fp-eval/)）。評価は普遍ベース除外（バケット1、`Object`/`BasicObject`/`Kernel`、287件のコーパスFP）を着地させたが、**抽象 / テンプレートメソッドの基底クラスパターン**（バケット2、167件）が現在のクラスごとのゲートでは対処不能なFPであることを見出した。抽象ベースのFPが解決されるまで、**スタンドアロンのみのゲートをスーパークラス / includeチェーンへ拡張しない**こと —— 必要な形は**サブクラス認識ゲーティング**（見逃したメソッドが既知のサブクラスに定義されているかをレコーダーで記録し、そうなら抑制する）だ。解決されたclosed-classセルフ呼び出しに対する**arity診断**はスライス4の一部では**なかった**（undefined-methodのみ） —— ルールが実績を積んだ後の後続拡張。
- **クラスボディ内の非`Bot`一般採用** —— 解決されたセルフ呼び出しの戻り値型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた（既存の呼び出し先戻り推論の不精度が下流で表面化した）;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

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
