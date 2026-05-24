---
title: "Current Work — Resume Bookmark"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "33515575e3e88b535958822e087ac5579a141f0f37ad6f449ca6c8baf6119635"
sourceCommit: "203008e9741e8ffd61448e32cf9b89c19f1339da"
sourceDate: "2026-05-23T05:57:26+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.8リリース済み（2026-05-21）**。`CHANGELOG.md` § `[0.1.8]`にまとめ — Mastodonサーベイ偽陽性削減サイクル: ADR-15フォークベースのワーカープール（アクティブな`workers > 0`バックエンド）、ADR-23 `rigor triage`（スライス1+2+4）、ADR-24暗黙的selfメソッド呼び出し解決（スライス1+2+3 + include/prependされたモジュール解決）、明示的レシーバーのprivateメソッド解決修正、サーベイ駆動のプラグイン修正（`rigor-activerecord` v0.2.0、`rigor-activesupport-core-ext`）。

リリースラインの計画は[`docs/ROADMAP.md`](../roadmap/) §「リリース戦略 — v0.2.0への道」に記録されている:

- **v0.1.9** — 最後のプレビューカット、準完成版リリース。
- **v0.2.0** — 最初の評価リリース: 公式に発表され、実プロダクトでの試験デプロイを意図している（フォーマル / GAバージョンではない）。
- **v0.2.x** — 評価ライン;目標は**Ractor並行性トラックを除く**すべての計画された機能を高い完成度に持っていくこと（フォークプール / ADR-15 § OQ1の背後にパークされている）。

## 次のエントリー — v0.1.9（最後のプレビューカット）

v0.1.9はプレビュートラックのコミットメントをクローズし、v0.2.0が準完成のベースから評価ラインを始められるようにする。両方のコミット済み成果物は`master`に**着地済み**（`CHANGELOG.md`の`[Unreleased]`）;v0.1.9はバージョンバンプが承認され次第カットの準備ができている。

1. **外部ユーザーSKILLトリオ**（[ADR-22 § WD8](../adr/22-baseline-and-project-onboarding/)）— **完了**。トップレベルの`skills/`ツリー下の、自分自身のプロジェクトに対して`gem install rigortype`を実行するRigor新参者を狙った3つのSKILL（agentskills.ioポータブル規約、`waza check`仕様準拠、パブリックCLIサーフェスのみ）:
   - `skills/rigor-project-init/` — 初回オンボーディング: Gemfile / Gemfile.lockウォーク → プラグインセットを提案 → **採用モード選択**（acknowledge / ベースライン対strict） → `.rigor.dist.yml`を書く → `rigor triage --format json`を実行 → （acknowledgeモード）`.rigor-baseline.yml` + `baseline:`設定行を書く → 本物のバグの可能性を表面化 → 2つのエスカレーションパス（プロジェクトプラグイン / Rigor issue）を提示。SKILL.md + 3つの`references/`モジュール。
   - `skills/rigor-baseline-reduce/` — 継続的品質: `rigor triage`ヒント + `rigor baseline dump`で優先順位付け → `.rigor-baseline.yml`をルールごとに歩く → サイトをサンプリング → 分類（実バグ / スタイル的・安全 / FP） → 修正 / `# rigor:disable` / Rigor issueを開く → `rigor baseline drift` + `regenerate`。SKILL.md + 2つの`references/`モジュール。
   - `skills/rigor-plugin-author/` — プラグイン著作ワークフローの外部著者バリアント（`.claude/skills/rigor-plugin-author/`コントリビューターSKILLとは別）: 公開済み`rigortype` APIに対する`rigor-`プレフィックスのgemまたはプロジェクトプライベートプラグインの著作;pre-1.0契約のキャビアットを織り込む。SKILL.md + 3つの`references/`モジュール。
2. **ADR-22ベースラインスライス5** — **完了**。`rigor baseline regenerate`（無条件の書き直し） + `rigor check --baseline-strict` CIゲート（不足ドリフトを含むあらゆるドリフトで失敗する）。`rigor baseline {generate, regenerate, dump, drift, prune}`ファミリーが今や完全になった。

`rigor triage`スライス3（SKILL統合 — [ADR-23 WD5](../adr/23-diagnostic-triage-command/)）がトリオとともに着地: `rigor-project-init`のフェーズ5と`rigor-baseline-reduce`のフェーズ1はどちらもアドホックなLLMカウントの代わりに`rigor triage --format json`を消費する。ADR-23の唯一残っている繰り越しは、先送りされたプラグイン提供レコグナイザーフック（スライス4の後半）。

v0.1.7 / v0.1.8サイクルはリードアップだった — 実プロジェクトのエラーデータを収集し、SKILLトリオのプラグイン / 重要度 / ベースラインルールのデフォルトが実証的証拠の上に立つようにした。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログ（エディタモード、LSP機能、dry-rb継続、ADR-10/13/16フォローアップ、パフォーマンスレバー）は[`docs/ROADMAP.md`](../roadmap/) §「将来のサイクル」にあり、新計画の下ではv0.2.x完成ターゲットである。この節はそこに捕捉されていないエンジン内部の詳細を持つ項目のみを保持する。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4** — 解決されたclosed-classセルフ呼び出しに対するゲート付き`undefined-method` / アリティ診断。独自のFP評価ゲート（[ADR-24 WD4](../adr/24-self-method-call-resolution/)）— メタプログラミング密度の高いコードに対する大きな新しい偽陽性サーフェスのため、v1は意図的に精度加法的のみとした。
- **クラスボディ内の非`Bot`一般採用** — 解決されたセルフ呼び出しの戻り型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた（既存の呼び出し先戻り推論の不精度が下流で表面化）;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ADR-23 — `rigor triage`スライス4プラグインレコグナイザー

残り: プラグインが自身のレコグナイザーを貢献できる`Plugin`フック（先送り）。（`Analysis::Diagnostic`の`receiver_type` / `method_name`構造化フィールドはv0.1.8で出荷;SKILL統合はv0.1.9トリオとともに出荷。）

### フローフォールディング — ループミューテーション追跡（ギャップG1 / G2）

`rigor check lib`は`arr = [seed]; while …; arr << x; end; if arr.size == N`という形の3つの`flow.always-truthy-condition`警告を表面化する — `Inference::Narrowing`はループ本体の`<<` / `push`ミューテーションをsize / empty narrowingに反映しない。サイト: [`hkt_body_parser.rb:140`](../lib/rigor/inference/hkt_body_parser.rb)、`:307`、[`hkt_registry.rb:212`](../lib/rigor/inference/hkt_registry.rb)。Mastodonクラスター4トリアージ（[`docs/notes/20260521-mastodon-cluster4-flow-folding-triage.md`](../notes/20260521-mastodon-cluster4-flow-folding-triage/)）がこのまさに同じ形の`loop` / `retry`警告をさらに3件（ギャップ**G1**）に加え、姉妹ギャップ**G2** — ivarの型がそのリテラル書き込みから取られ、介在するメソッド呼び出し / インプレースの`<<` / 書き込み前読み取り`nil`によって無効化されない — を追加する。どちらも`docs/type-specification/control-flow-analysis.md` §「mutation effects」下に存在する;中規模のエンジン変更、キュー済み。3つのセルフチェック警告は`:warning`（`:error`ではない）なので、`rigor check lib`はリリース目的ではクリーンなまま。

### Stdlib RBSカバレッジギャップパターン

上流の`ruby/rbs` RBSギャップが単一の内部Rigor呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable`ディレクティブ + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードで表面化したとき、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）は上流PR向けにステージされている — ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク。

### Mastodonクロスバージョンスイープ — FP発見事項（2026-05-23）

v3.5.19→v4.5.10クロスバージョンリグレッションスイープ（[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「何が増えているか」）は、エンジン側の偽陽性 / 誤推論のクラスターを4つ特定した。2つはすでに追跡済み;2つは新規:

1. **`StringScanner#[]` Symbolオーバーロード**（FP、`signature_parser.rb`の3箇所）— `scanner[:key]`（Ruby 3.x以降の名前付きキャプチャSymbol引数）は`call.argument-type-mismatch`を引き起こす。RigorのRBSには`(Integer) -> String?`オーバーロードしか存在しないため。上記「Stdlib RBSカバレッジギャップパターン」項目で**すでに追跡済み** — `references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`がまさにこれを拡張する。このスイープはその経験的確認;上流RBS PRがマージされたらクローズする。
2. **ARの`scope`ボディのメソッド解決**（誤推論、新規）— `scope :x, -> { select(...).group(:uri) }`の中でラムダの`self`はモデルクラスだが、`select`が`ActiveRecord::Querying#select`（→ relation）ではなく`Enumerable#select`（→ `Array[String]`）に解決するため、連鎖する`.group`が`undefined-method`と判定される**。ADR-26**（`ActiveRecord::Relation`型付け）の経験的根拠;モデルクラス側のクエリサーフェスは`rigor-activerecord`プラグインの役割。新規ADRは不要 — ADR-26スライシングに折り込む。
3. **Ivar nil-guard / ivar-write型付け**（誤推論、新規）— `@ivar.method`が`return if @ivar.nil?`ガードの**後**でも`undefined-method … for nil`を報告する: ガードがivarをナローイングせず、ivarの非`nil`代入も推論に見えないため、型が`nil`に潰れる。フローフォールディングギャップ**G2**（ivarの型がリテラル書き込みから取られ、更新されない）と同じファミリー。ivarナローイング + ivar-write推論修正が必要;G2作業に対してスコープを当てる。
4. **フローフォールディングの過剰主張**（FP、`flow.always-truthy-condition`の3箇所）— 上記「フローフォールディング — ループミューテーション追跡（ギャップG1 / G2）」項目とクラスター4トリアージノートで**すでに追跡済み**。このスイープはクラスターがv3.5→v4.5ラインを通じて持続することを確認。

### より小さなキュー項目

- **Sig-genの`update_existing`**は兄弟の親 / 子クラスブロックを畳み込まない — `merge_class`は各候補の`class_name`を独立して解決するため、フラット兄弟レイアウトはフラットなまま。既存のファイルをネストレイアウトに再フローすることはスコープ外;回避策はターゲットsigファイルを削除してゼロから再生成すること。
- **`Hash === expr` case-equalityナローイング**（`open3.rb:226`の形）— 引き続きオープン。
- **インメモリの`Analysis::Runner.run_source(source:, path:, …)`エントリーポイント** — `RunnerHelpers#analyze`の呼び出しごとのtmpdir + chdirをバイパスする;約5%のspecスイートの勝利に加え、埋め込み者（LSP / エディタモード）向けのクリーンなパブリックAPI。需要駆動。

### Type-coverage uplift — ライン状況（2026-05-23）

Phases 1〜4着地済み（String / Integer / Float / Comparable / Math / HashShape / Date / DateTime / Time）。残り項目はすべて**リリース未確定**:

- **Struct / Data値fold** — 先送りすべきADR相当の機能（新しいキャリアが2つ必要）。`docs/ROADMAP.md` §「将来のサイクル」→「型言語 / エンジン」と[`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)を参照。`Encoding`値foldは同じ監査で* permanent exclusion *として記録済み。
- **`MathFolding`結果の精緻化** — 28関数foldは値的に正確;結果への範囲精緻化の付与（`Math.exp` → `positive-float`、`Math.sqrt` / `hypot` → `non-negative-float`）は需要駆動のフォローアップ（[`docs/notes/20260522-stdlib-deterministic-module-coverage.md`](../notes/20260522-stdlib-deterministic-module-coverage/) § 1）。
- **Hash `rassoc`シェイプハンドラ** — 唯一残っている低優先度Hashハンドラ（[`docs/notes/20260522-hash-method-coverage.md`](../notes/20260522-hash-method-coverage/)）;値 → `[k, v]`逆引き、全値が`Constant`のときにfold可能。需要駆動。

## 復帰する実装者のための読書順

v0.1.9 SKILLトリオ + ADR-22ベースラインスライス5はすべて`master`に着地済み;次のセッションのデフォルト目標はv0.1.9バージョンバンプ（承認時）、その後のv0.2.x評価ライン作業。この順序で読んでください:

1. [`docs/ROADMAP.md`](../roadmap/) §「リリース戦略 — v0.2.0への道」 — v0.1.9 / v0.2.0 / v0.2.x計画と各々をゲートするもの。
2. [`docs/adr/22-baseline-and-project-onboarding.md`](../adr/22-baseline-and-project-onboarding/) — WD8 + 2つのオンボーディングSKILLスケッチ;ベースラインメカニズム。
3. [`docs/adr/23-diagnostic-triage-command.md`](../adr/23-diagnostic-triage-command/) — `rigor triage`;WD5 / スライス3はtriage ↔ SKILLのデータレイヤー契約。
4. `CHANGELOG.md` § `[Unreleased]` — バージョンバンプを待つv0.1.9サイクルの作業。
5. [`.claude/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-plugin-author/SKILL.md) — コントリビューターSKILL;外部著者`skills/rigor-plugin-author/`バリアントのテンプレート。
6. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。v0.2.0は外部`rigor-*` gem向けにプラグイン契約サーフェスを安定化させるので、ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。
7. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/) — v0.2.0が安定化させなければならないプラグイン契約。
