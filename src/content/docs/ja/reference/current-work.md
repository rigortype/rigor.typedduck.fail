---
title: "Current Work — Inference Engine Checkpoint"
description: "Imported from rigortype/rigor docs/CURRENT_WORK.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "b477bb7ce11886fae1f5a7ffceff3d79b6a6b976095644bdef864e47f502f32d"
sourceCommit: "b523ab36f62d89a1c16964a66864c27e3ebb0fe4"
translationStatus: "translated"
sidebar:
  order: 9050
---

これは長い実装スレッドをレビュー可能なチャンクに分割するための一時的なブックマークです。**規範的な**契約とスライスロードマップは[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります。リリースごとのコミットメントエンベロープは[`docs/MILESTONES.md`](../milestones/)にあります。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / マイルストーンが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.0が`master`にバージョンバンプされました（コミット`6170832`）;リリース待ち。** 6つのプラグイン契約スライスとv0.1.0ポリッシュ作業が着地しました（6つの動作プラグイン例、9章のエンドユーザーハンドブック、named-captureナロイング修正、`;`プレフィックスのブロックローカルnil shadow修正）。7番目のプラグイン例（`rigor-activerecord`）がポリッシュウィンドウ中に着地しました。[`AGENTS.md`](https://github.com/rigortype/rigor/blob/main/AGENTS.md)の自律バージョンバンプ禁止ルールに従い、`bundle exec rake release`は明示的なユーザー承認を待ちます。スライスごとのまとめは`CHANGELOG.md`の`[0.1.0]`セクションとv0.1.0行の[`docs/MILESTONES.md`](../milestones/)にあります。

**v0.1.2進行中。** Track 1（プラグイン例の戻り型移行）が7つのワークプラグインのうち4つ——`rigor-lisp-eval`、`rigor-pattern`、`rigor-units`、`rigor-activerecord`——で`master`に着地しました。これらは`#flow_contribution_for`を通じてコールサイトの戻り型を貢献するようになりました。診断トレースは残ります——両チャンネルが同じ解釈から実行されます。他の3つ（`rigor-deprecations`、`rigor-statesman`、`rigor-routes`）は設計上診断専用のままです（戻り型の適合なし / RBSで表現可能）。スペックヘルパー拡張（`run_plugin`の`signature_paths:`キーワード）がナロイングアサーションがユーザー定義クラスに最小限のシグを提供して`call.undefined-method`が発火できるよう、並行して着地しました。スライスリストは[`docs/MILESTONES.md`](../milestones/) §「v0.1.2 — 計画中」にあります。

**v0.1.1完了。** 4つのトラックすべてが作業ブランチに未リリースで着地しました:

- **Track 1スライス1** — regexパターン → 精製名認識器。
- **Track 1スライス2** — `decimal-int-string` / `numeric-string`上の`String#to_i` / `#to_int`（2a）と`Kernel#Integer(s)`（2b） → `non-negative-int`。
- **Track 1スライス3** — `predicate-if-*` / `assert-if-*` / `assert`での完全な`self`ナロイング（LocalVariable / InstanceVariable / SelfNode / 暗黙的selfレシーバー形状）。
- **Track 1スライス4** — `String#start_with?` / `#end_with?` / `#include?`フローファクト（FactStoreベース;新しいキャリアなし）。
- **Track 1スライス5** — `#strip`ファミリーを通じた`literal-string`伝播（5a）、非負`IntegerRange`に対する`Integer#to_s`精密性（5b）、`#center` / `#ljust` / `#rjust`リテラルベアリングリフト（5c）。`Numeric#to_s`は意図的に取り消されました（`Float` / 符号付き`Integer`出力にクリーンなキャリアなし）。
- **Track 2（ADR-9クロスプラグインAPI + 戻り型貢献）** — スライス1 → 5（`Plugin::FactStore`、`Services#fact_store`、`#prepare(services)`フック + Runner呼び出し、`manifest(produces:/consumes:)`、トポロジカルソート + 欠落プロデューサー検出）+ スライス7（`Plugin::Base#flow_contribution_for`フック + `RbsDispatch`より前のディスパッチャーティア）。Tier 2 Railsプラグインのブロックが解除されました。
- **Track 3** — スライス8（ヘルパー、以前のコミット`ce64bb6`）、スライス9（`tmp/`下のプラグインデモごとのキャッシュ分離 + `.rigor.yml`からの`cache.path`を尊重するCLI修正）、スライス10（RuboCopに文書化された緩和とともに再インクルードされた例）。
- **Track 4** — 完全に完了: 項目11（3つの`lib/` sigドリフトを解消）、項目12（`node_locator_spec.rb:82`の古いもの）、項目13（prelude`composed`ボディを`unknown` → `dispatch`に再分類）。

設定監査（このバッチ中にも）: `target_ruby`ファントム設定配線ギャップを解消（3つのパースサイトすべてで`Prism.parse_file(version:)`に渡されるようになりました）、将来の`.rigor.yml`設定がサイレントにファントムになれないよう実行時監査ガードスペックブロックを追加。

作業状態: RSpec 2195例 / 0失敗、RuboCop 264ファイル / 0オフェンス、`bundle exec exe/rigor check lib`は`No diagnostics`を報告。**v0.1.1はユーザーが承認次第`bundle exec rake release`の準備ができています。**フルスライスリストは[`docs/MILESTONES.md`](../milestones/) §「v0.1.1 — 計画中」にあります。

## 作業が再開される場所

### Railsエコシステムプラグイン（並行実行トラック）

Railsプラグインファミリー——`rigor-rails-routes`、`rigor-rails-i18n`、`rigor-actionpack`、`rigor-actionmailer`、`rigor-activejob`、加えて`rigor-activerecord`拡張——はv0.1.xコア作業と並行して作成されています。フルプランは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。Tier 1プラグイン（現行API、解析器側の変更不要）はブロックが解除されており、作成はすぐに**1セッションにつき1プラグイン**の形式で`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出できます。Tier 2（`rigor-actionpack` Phase 1、`rigor-factorybot`）は[ADR-9 — クロスプラグインAPI](../adr/9-cross-plugin-api/)をブロッカーとします。これはv0.1.1 Track 2です。

### v0.1.2エントリーパス

スライスリストについては[`docs/MILESTONES.md`](../milestones/) §「v0.1.2 — 計画中」を参照してください。推奨エントリー順序:

- v0.1.2 Track 1（7つのプラグイン例のうち4つを`#flow_contribution_for`に移行済み）が`master`にあります。v0.1.1も`master`にバージョンバンプされており、ユーザーが両方のカットを一緒に（または順番に、[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従って）承認次第`bundle exec rake release`の準備ができています。
- Railsプラグイン並行実行トラックはブロックが解除されています——Tier 2（`rigor-actionpack` Phase 1、`rigor-factorybot`）はクロスプラグインAPIに対して作成できるようになりました。Tier 1プラグイン（`rigor-rails-routes`、`rigor-rails-i18n`、`rigor-actionmailer`、`rigor-activejob`）はv0.1.0からブロックが解除されていました。
- v0.1.1から延期されたスコープ外の項目（過負荷選択のインターフェース厳格性、新しい`flow.*` / `def.*`ルールファミリー、`Data.define`イニシャライザーディスパッチ、`Plugin::IoBoundary#open_url`、DXツール、LSPデーモンなど）はv0.1.3+に引き継がれます。

## オープンエンジニアリング項目

v0.0.xスライスを通じて浮かび上がった永続的な項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。v0.1.1にすでに吸収された項目はここで再説明するのではなくMILESTONESを通じて参照されます。

1. **Cボディクラシファイアーの間接ミューテーター。**カタログ抽出器のregexは`str_modifiable` / `time_modify` / 類似のヘルパー間接を追いません; `String#replace`、`Time#localtime`、`Set#reset`のようなメソッドはミューテートするにもかかわらず`:leaf`として着地します。v0.0.5で着地した純粋な`rb_check_frozen`ラッパー検出がギャップを縮小しますが、`STRING_CATALOG` / `TIME_CATALOG` / `SET_CATALOG`のクラスごとのブロックリストは狭いregexが見逃す偽陽性を吸収し続けます。長期的には: クラシファイアーは正当な非ミューテーター（v0.0.5修正を制限した`Array#to_a`リグレッション）を過剰フラグ付けせずにヘルパーを推移的に追跡すべきです。v0.1.1のスコープ外;具体的なユーザーが見えるリグレッションが動機付けるまで延期。

（以前ここに列挙されていた項目——`node_locator_spec.rb:82`と`numeric.yml`の`Integer#ceildiv`——は現在[v0.1.1 Track 4メンテナンス](../milestones/#v011--planned)です。）

## 復帰する実装者のための読書順

デフォルトの目標は「v0.1.0をリリースし、その後v0.1.1を開始する」です。v0.1.0が`master`にバージョンバンプされていることで、次のセッションの作業仮定は「v0.1.1スライスを実装する」です。この順序で読んでください:

1. `CHANGELOG.md`の`[Unreleased]`セクション——v0.1.1の作業が着地するにつれて蓄積されます。
2. [`docs/MILESTONES.md`](../milestones/) —「v0.1.1 — 計画中」下の4トラックv0.1.1スライスリスト。
3. [`docs/adr/9-cross-plugin-api.md`](../adr/9-cross-plugin-api/) — Track 2の拘束力のある設計; 6つの実装スライス。
4. [`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/) — Railsプラグインファミリーの順序付け、依存関係グラフ、サブツリー分割準備チェックリスト。
5. [`.codex/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) — 新しいプラグインを作成するためのエージェント向けプレイブック（すべてのRailsプラグインセッションに使用）。
6. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスしてください。
7. [`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 7つの動作プラグイン例の比較表;新しい作者への推奨読書順。
8. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)と[`docs/adr/7-v0.1.0-slice-decisions.md`](../adr/7-v0.1.0-slice-decisions/) — v0.1.1が構築するv0.1.0プラグイン契約の拘束力のある設計とスライスごとの作業上の決定。
9. [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)作業上の決定 — OQ1 / OQ2 / OQ3の結果がプラグインが消費する型オブジェクトパブリックサーフェスを引き続き拘束します。

その後、v0.1.1の実装サーフェスは`lib/rigor/inference/narrowing.rb`、`lib/rigor/flow_contribution*.rb`、`lib/rigor/plugin/`、`lib/rigor/cache/`、`lib/rigor/rbs_extended/`、`lib/rigor/analysis/`に対するgrepから見つけられます。
