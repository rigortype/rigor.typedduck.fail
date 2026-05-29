---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "66a7e0aa510fc3f6e962fa7cdd0888cc97a2bb7dbe290bd1b1fecf6582c837d9"
sourceCommit: "9912e76c7eaca91151a5a172cd5dcc2ea61d8063"
sourceDate: "2026-05-28T23:05:38+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.12リリース済み（2026-05-28）**。 v0.1.11以降の28スライス（slice）がカットに封入された — Mastodon / Redmine / GitLab FOSSに対するOSSリアリズムサイクルと、3つのG2フローフォールディングフォローアップすべて（`retry`エッジ、介在するメソッド呼び出し、書き込み前読み取りnil）。`bundle exec rake release`が実行済み;gemはRubyGems上にある。バージョンごとの詳細は`CHANGELOG.md` § `[0.1.12]`にある。

v0.1.12カット時点の累積サーベイ結果:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

Mastodonの残り6件のエラーはすべてエンジン精度とは無関係: 5件はテストフィクスチャ内のnil-receiver + 1件は上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（narrowing）ギャップ（[`docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md`](../notes/20260528-rbs-upstream-pr-resolv-typeclass/)を参照）。

## 復帰する実装者のための読書順

`make verify`はクリーン。`[Unreleased]`は空（v0.1.12カットがそれまでに積み上がったものをすべて封入した）。3つのブランチがキューされており、特定の順序は強制されない。

### ブランチA — v0.2.0評価リリース

v0.1.12はv0.2.0の強いRCポスチャーでプレビューラインを残す。残りのゲートは[`docs/ROADMAP.md`](../roadmap/) §「v0.2.0 — 最初の評価リリース」に記載された3つ:

1. ADR-2プラグイン契約サーフェス（surface）が、このモノレポ外の外部`rigor-*` gemをサポートできるほど安定化されている。
2. subtree-split / RubyGems公開フローが少なくとも`rigor-rails`ファミリーに対して行使されている。
3. SKILLトリオが出荷済み（v0.1.9、✓）。

ゲート3は充足済み。ゲート1と2は明示的な計画が必要 — どのスライスでも良いわけではない。99.2%のMastodonエラー削減 + 全3件のG2ケースクローズのストーリーは、このカットの公表タイミングとして十分なものだ。

### ブランチB — 残存エラーのクローズを続ける

v0.1.12時点のMastodon`app + lib`残余は6件;これらのクローズにはrails-routes反復ではなく**新しいスコープ**が必要:

1. **specフィクスチャ内の本物のnilチェーンバグ（5件）** — ほとんどが`spec/models/` / `spec/lib/`内の`*_for_nil`スタイルのフィクスチャ。本物の診断であり偽陽性ではない。Mastodon側での修正;Rigorに作業はない。
2. **上流`ruby/rbs`の`Resolv::DNS#getresources`型クラスナローイング（1件）** — `references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`がステージ済み。ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

Mastodon以外では、Redmine / GitLab FOSSの残余はより大きなサーフェス;それぞれの数値を下げたい場合は独自のサーベイサイクルが必要。

### ブランチC — サーベイに駆動されないエンジン内部項目

v0.1.12サイクルの影響を受けていないキュー済みエンジン項目:

1. **ADR-24スライス4** — 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。下記「ADR-24 — 暗黙的selfメソッド呼び出し解決、残り」を参照。
2. **ARスコープボディのラムダ`self`** — `scope :x, -> { select(...).group(...) }`のインスタンスラムダ内でラムダの`self`がモデルクラスにリバインドされる必要が依然ある。v0.1.12は通常のメソッドボディに対する暗黙的selfのクラス側解決をクローズした;ラムダボディは残る。経験的なケースは[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「何が増えているか」項目2 / ADR-26領域にある。

### 参照読書

判断に迷う場合の正規エントリーポイント:

1. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.1.12]` — v0.1.12カットの完全なリリースノート（OSSリアリズムサイクル）。
2. [`docs/ROADMAP.md`](../roadmap/) §「リリース戦略 — v0.2.0への道」— v0.2.0をゲートするもの。
3. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。v0.2.0は外部`rigor-*` gem向けにプラグイン契約サーフェスを安定化させる;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。
4. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/) — v0.2.0が安定化させなければならないプラグイン契約。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログ（エディタモード、LSP機能、dry-rb継続、ADR-10/13/16フォローアップ、パフォーマンスレバー）は[`docs/ROADMAP.md`](../roadmap/) §「将来のサイクル」にあり、v0.2.x完成ターゲット。この節はそこに捕捉されていないエンジン内部の詳細のみを保持する。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4** — 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / arity診断。独自のFP評価ゲート（[ADR-24 WD4](../adr/24-self-method-call-resolution/)）— メタプログラミング密度の高いコードに対する大きな新しい偽陽性サーフェスのため、v1は意図的に精度加法的のみとした。
- **クラスボディ内の非`Bot`一般採用** — 解決されたセルフ呼び出しの戻り型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ADR-23 — `rigor triage`スライス4プラグインレコグナイザー

残り: プラグインが自身のレコグナイザーを貢献できる`Plugin`フック（先送り）。（`Analysis::Diagnostic`の`receiver_type` / `method_name`構造化フィールドはv0.1.8で出荷;SKILL統合はv0.1.9トリオとともに出荷。）

### フローフォールディング — G1 / G2ケースがすべてクローズ済み（v0.1.12）

**ステータス: クローズ済み**。 v0.1.12が残り3件のG2ケースを封入:

- **`retry`フローエッジ** — `eval_begin`がリバインドされたローカル / ivarをNominalエンベロープに幅広げ、幅広げられたエントリーでbeginボディを再評価する。
- **介在するメソッド呼び出しの無効化** — 暗黙的self / `self.foo`呼び出しが各ivarをクラス全体のシードに幅広げる。
- **書き込み前読み取りnil** — クラスivarプリパスが、同ivarへの書き込み前にメソッドボディがivarを読む場合に`nil`を貢献する（`initialize`書き込み / クラスボディレベル書き込み / 既存エントリーのみでゲート）。

この領域にキュー済み項目はない。

### Stdlib RBSカバレッジギャップパターン

上流の`ruby/rbs` RBSギャップが単一の内部Rigor呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable`ディレクティブ + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）は上流PR向けにステージされている — ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

### より小さなキュー項目

- **Sig-genの`update_existing`**は兄弟の親 / 子クラスブロックを畳み込まない。`merge_class`は各候補の`class_name`を独立して解決するため、フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするのはスコープ外;回避策はターゲットsigファイルを削除してゼロから再生成すること。
- **`Hash === expr` case-equalityナローイング**（`open3.rb:226`の形）— 引き続きオープン。
- **インメモリの`Analysis::Runner.run_source(source:, path:, …)`エントリーポイント** — `RunnerHelpers#analyze`の呼び出しごとのtmpdir + chdirをバイパスする;埋め込み者（LSP / エディタモード）向けのクリーンなパブリックAPI（約5%のspec-suite勝利）。需要駆動。
- **`--params=observed`後のSig-gen残りギャップ** — `initialize`以外のソースからivarが設定される`attr_reader`は依然`:untyped_return`を生成;修正は手書きのsigアノテーション。untypedレシーバーへの深いチェーンは`rbs collection install`またはADR-10が必要。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグインが必要。これらは`skills/rigor-project-init/references/04-sig-uplift.md` §「ステップ5-d」に記載され、`--params=observed`でもギャップが残る場合の自然な次のアクション。

### Type-coverage uplift — ライン状況（2026-05-23）

Phases 1〜4着地済み（String / Integer / Float / Comparable / Math / HashShape / Date / DateTime / Time）。残り項目はすべて**リリース未確定**:

- **Struct / Data値fold** — 先送りすべきADR相当の機能（新しいキャリア（carrier）が2つ必要）。`docs/ROADMAP.md` §「将来のサイクル」→「型言語 / エンジン」と[`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)を参照。`Encoding`値foldは同じ監査で*恒久的除外*として記録。
- **`MathFolding`結果の精緻化** — 28関数のfoldは値精確;範囲精緻化の付与（`Math.exp` → `positive-float`、`Math.sqrt` / `hypot` → `non-negative-float`）は需要駆動のフォローアップ（[`docs/notes/20260522-stdlib-deterministic-module-coverage.md`](../notes/20260522-stdlib-deterministic-module-coverage/) § 1）。
- **Hash `rassoc`シェイプ（shape）ハンドラ** — 唯一残っている低優先度Hashハンドラ（[`docs/notes/20260522-hash-method-coverage.md`](../notes/20260522-hash-method-coverage/)）;需要駆動。

## リリース後フォローアップ

- **`data/oss-sweep/mastodon-thresholds.json`** — 保存済み閾値をv0.1.12のベースライン（baseline）に対してリフレッシュし、週次OSSスイープゲートが新しい〜6ベースラインを反映するようにする。現在のファイルは未較正（`max_diagnostics: 999999`）。
