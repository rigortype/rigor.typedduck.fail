---
title: "Rigor Roadmap"
description: "rigortype/rigor docs/ROADMAP.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/ROADMAP.md"
sourcePath: "docs/ROADMAP.md"
sourceSha: "12278bcac8f4b641ca57033665f46d4dcadc3270641094785838862f2fa390d5"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
sourceDate: "2026-05-21T22:31:46+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

将来を見据えたコミットメント: 何が積極的に進行中で、次に何が計画されているか、何が意図的にスコープ外か。

このファイルは**計画資料**であり、リリースログではありません。「何が出荷されたか」の記録については、[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/main/CHANGELOG.md)（アクティブな`0.1.x`サイクル）と[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)（アーカイブ済み`0.0.x`）を参照してください。

このファイルがADRまたは仕様と矛盾する場合、ADR / 仕様が拘束力を持ち、このファイルは古くなっています。

## リリース済みマイルストーン（ポインターのみ）

完全なリリースノートは`CHANGELOG.md`にあり;各カットを形作った計画エンベロープはgit履歴に保存されています（`docs/MILESTONES.md`を`ROADMAP.md`にリネームしたコミットを参照）。

| バージョン | リリース日 | テーマ |
| --- | --- | --- |
| v0.0.3 — v0.0.9 | 2026-05-02 → 2026-05-05 | 型語彙、推論エンジン、永続キャッシュ。[`docs/CHANGELOG-0.0.x.md`](../changelog-0.0.x/)を参照。 |
| v0.1.0 | 2026-05-07 | 最初のプラグイン契約（6スライス）;7つの動作例。`CHANGELOG.md` § `[0.1.0]`を参照。 |
| v0.1.1 | 2026-05-08 | リテラル文字列ナローイングの深化、クロスプラグインAPI、プラグイン作成DX。`CHANGELOG.md` § `[0.1.1]`を参照。 |
| v0.1.2 | 2026-05-09 | プラグイン例の戻り型移行、エンジン深化フォローアップ。`CHANGELOG.md` § `[0.1.2]`を参照。 |
| v0.1.4 | 2026-05-14 | ADR-10 / ADR-11 / ADR-13の延期キュー、ADR-14 `rigor sig-gen`エンドツーエンド、`Type::BoundMethod`キャリア、18の動作プラグイン例。（v0.1.3のコミットメントエンベロープがカット前に追加のトラックを吸収し、v0.1.4として出荷。）`CHANGELOG.md` § `[0.1.4]`を参照。 |
| v0.1.5 | 2026-05-16 | ADR-15 Ractor移行エンドツーエンド（フェーズ1〜4c + 4b.x）、実世界Railsサーベイ（14プロジェクト、31,840ファイル）が本番改善を駆動（ベンダーgem RBS、ActiveSupport core_extオプトインバンドル、Bundler認識sigディスカバリ）、ADR-16マクロ / DSL展開基板（WD13フロアでO2をクローズ）、O4レイヤー3スライス1+2+3（`Gemfile.lock`パース + `rbs_collection.lock.yaml`認識 + 欠落gemの`:info`診断）、DEFAULT_LIBRARIESのstdlibカバレッジ拡張（1,273 → 1,427 RBSクラス）、`is_a?(C)`レキシカルネスティング定数解決、24の動作プラグイン例。`CHANGELOG.md` § `[0.1.5]`を参照。 |
| v0.1.6 | 2026-05-19 | ADR-12 / ADR-17 / ADR-18フロア + 動作消費者;エディタモードv1 + 言語サーバーv1/v2;ADR-20軽量HKT;エコシステムプラグイン + `rigor-rails`メタgemスキャフォールド。`CHANGELOG.md` § `[0.1.6]`を参照。 |
| v0.1.7 | 2026-05-20 | ADR-22ベースラインメカニズム（スライス1+2） + プロジェクトオンボーディング基盤;サーベイ駆動のプラグイン / エンジン偽陽性修正;Pillar 2「あなたのspecが型である」スライス1+2+3。`CHANGELOG.md` § `[0.1.7]`を参照。 |
| v0.1.8 | 2026-05-21 | Mastodonサーベイ偽陽性削減: ADR-15フォークベースのワーカープール（アクティブな`workers > 0`バックエンド）、ADR-23 `rigor triage`診断トリアージサブコマンド、ADR-24暗黙的selfメソッド呼び出し解決。`CHANGELOG.md` § `[0.1.8]`を参照。 |

## リリース戦略 — v0.2.0への道

`0.1.x`ラインは**プレビュー**ラインです。`0.2.x`ラインは**評価**ラインを開きます — まだフォーマル / GAリリースではないが、実プロダクトでの試験デプロイを意図した最初の公式発表バージョンです。

| ライン | 役割 |
| --- | --- |
| `0.1.x` | プレビュー。**v0.1.9は最後のプレビューカット — 未解決のプレビュートラックのコミットメントをクローズする準完成版リリース**。 |
| `v0.2.0` | **最初の評価リリース**。実プロダクトでの試験デプロイを意図した最初のバージョンとして公式に発表される;評価期間を開き、外部のフィードバックを募る。 |
| `0.2.x` | 評価ライン。まだフォーマルバージョンではないが、目標は**Ractor並行性トラックを除くすべての計画された機能**を高い完成度 / 本番品質に持っていくこと。 |

### v0.1.9 — 最後のプレビュー（準完成）

最後の`0.1.x`カット。プレビュートラックのコミットメントをクローズし、v0.2.0が準完成のベースから評価ラインを始められるようにする:

- **外部ユーザーSKILLトリオ** — `rigor-project-init`、`rigor-baseline-reduce`、そして外部著者`rigor-plugin-author`バリアント（[ADR-22 WD8](../adr/22-baseline-and-project-onboarding/)）;3つすべてが`skills/`に置かれ、**v0.1.9サイクルで着地済み**。
- **ADR-22ベースラインスライス5** — `rigor baseline regenerate`に加え`--baseline-strict` CIゲート。
- v0.1.7 / v0.1.8サイクルにわたって収集された実証的なプロジェクトサーベイデータに対するデフォルト（プラグイン / 重要度 / ベースラインルールの推奨）の引き締め。

v0.2.0評価ラインのリリース候補として扱われる: バーは「既知のリリースブロッキング欠陥なし」であり、「すべての需要駆動バックログ項目がクローズ」ではない。

### v0.2.0 — 最初の評価リリース

実プロダクトでの試験デプロイを意図した最初の公式発表バージョン。v0.2.0は**評価**リリースであり、GA / フォーマルバージョンではない — 評価期間を開き、外部のフィードバックを募る。ゲート条件（このリリースが吸収するv0.1.xの「今日はスコープ外」リスト）:

- ADR-2プラグイン契約サーフェスが、このモノレポ外の外部`rigor-*` gemをサポートできるほど安定化されている。
- subtree-split / RubyGems公開フローが少なくとも`rigor-rails`ファミリーに対して行使されている。
- SKILLトリオが出荷済み（v0.1.9）で、新参者がオンボーディングパスを持つ。

### v0.2.x — 高完成度の評価ライン

`0.2.x`シリーズ全体で、目標は計画された機能セットを高い完成度 / 本番品質に持っていくこと。下記§「将来のサイクル」の需要駆動バックログは、この計画の下では、オープンエンドのキューではなく**v0.2.x完成ターゲット**である — そこのすべての項目が`0.2.x`のスコープ内である、**Ractor並行性トラックを除いて**。

**Ractorは意図的に除外されている**。ADR-15のRactorワーカープールはRuby 4.0.x上で使用不可と判明した（Ruby Bug #22075に加え決定論的な`Ractor::IsolationError`）;v0.1.8のフォークベースのプールがアクティブなバックエンドだ。Ractorプールは`RIGOR_POOL_BACKEND=ractor`とADR-15 § OQ1の背後にパークされたまま;それを完成させることは`0.2.x`の目標では**ない**し、上流CRubyの修正を待つ。

## 将来のサイクル（特定のリリースにコミットされていない）

v0.1.x作業を通じて浮かび上がった項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。

### 型言語 / エンジン
- **O2 — マクロテンプレート / heredoc-Ruby展開（ADR-16）**。需要駆動の残り項目: **スライス5b**（Tier Dエンジン統合 — マッチした外部ファイルに対してトップレベルの`self_type`をナローイングし`bound_ivars`を事前バインド）と合成メソッドティア向けの**完全なADR-13リゾルバチェイン配線**（パラメータ化形式`Array[String]` / `Hash[K, V]`とプラグイン提供のユーティリティ型名をリゾルバチェイン経由でルーティング）。基礎サーベイは[`docs/notes/20260515-macro-expansion-library-survey.md`](../notes/20260515-macro-expansion-library-survey/)。
- **軽量HKT（ADR-20）**。コアキャリア + パーサー + 条件文法 + 主要な`METHOD_RETURN_OVERRIDES`（`JSON.parse`、`YAML`、`Psych`、`CSV`）はすべて着地;ハンドブック第12章も出荷済み。残り（需要駆動）: スライス4（`dry-monads`の`Result[T, E]` / `Maybe[T]`、ADR-3修正が必要）、スライス5（糖衣構文`type`エイリアス）、`rigor-lisp-eval`でのパターンバインディング抽出、追加の`METHOD_RETURN_OVERRIDES`。[ADR-20](../adr/20-lightweight-hkt/)を参照。
- **`rigor:v1:conforms-to`ディレクティブ**。元々v0.1.1の「スコープ外」にキューされていた;まだオープン。メソッドパラメーターが名前付き構造インターフェースを満たす任意の値を受け付けられるようにする。
- **`Cache::Store`のLRU排出**。[ADR-6](../adr/6-cache-persistence-backend/)に従い、永続キャッシュは設計上「排出なし」でシャード化されている。設定 / 依存関係チャーンを伴う長寿命クローンは、`make cache-clean`のみが解放する古いスロットを蓄積する。LRUはキュー、未コミット。
- **プロジェクト側のmonkey-patch事前評価（ADR-17）**。`pre_eval:`設定はライブ。残りの需要駆動フォローアップ: スライス3b（ファイルごとのキャッシュディスクリプタ）、スライス5（フルプロジェクト2パス発見）、スライス6（プラグインAPIフック）。
- **合成メソッドティアのためのADR-13リゾルバチェイン配線（ADR-16フォローアップ）**。ADR-13の`Plugin::TypeNodeResolver`チェインは`%a{rigor:v1:…}`ペイロード用に配線されているが、基板マニフェストの`returns:`文字列用には配線されていない。合成メソッドティアをチェイン経由でルーティングすることが、ユーティリティ型形のTier C戻り値（`Array[String]`、`Hash[K, V]`、`Pick<T, K>`）をアンロックする。ユーティリティ型形の基板消費者からの需要に先送り。（注: クロスプラグインファクト経由の呼び出しサイトごとの戻り型ルックアップはv0.1.6で[ADR-18](../adr/18-substrate-per-call-site-return-type/)を介して出荷;上記のADR-13配線は直交する「パラメータ化形パーサー」拡張。）
- **Struct / Data値fold**。[`docs/notes/20260523-struct-encoding-coverage.md`](../notes/20260523-struct-encoding-coverage/)（2026-05-23）の監査、type-coverage-upliftラインのPhase 5成果物。精密な`Struct` / `Data`メンバーアクセスfold（`Point = Struct.new(:x, :y); Point.new(1, 2).x` → `Constant[1]`）はディスパッチティアのエントリでは到達不能 — **新しいキャリアが2つ**必要: 順序付きメンバー名リスト（+ `keyword_init:`フラグ）でパラメータ化されたstruct-classキャリアと、`HashShape`の形をしたクラスタグ付きstruct-instanceキャリア。加えて`Struct.new`クラスボディブロックの劣化契約、位置指定vs `keyword_init:` struct、struct継承。ADR相当;不変な`Data.define`きょうだいがおそらくより良い最初のターゲット（凍結インスタンスが健全性ストーリーを単純化する）**。リリース未確定**。`Encoding`値foldは同じ監査で*恒久的除外*として記録 — `Constant[Encoding]`キャリアがfoldできるのはごく小さなサーフェス（`.name` / `.dummy?`）のみ、実際のプログラムは`Encoding`を不透明タグとして使い、キャリア増加のコストは見合わない;`Nominal[Encoding]`が答えのまま。
- **カバレッジ認識の診断姿勢（将来のコンセプト — まだ設計されていない）**。アイデア: spec / テストカバレッジによって診断の*姿勢*を変調する — コードがテストで実行される箇所では楽観的に解析し、そうでない箇所では保守的なまま（または注意をエスカレートする）。これは[`overview.md`](../type-specification/overview/) §「偽陽性の規律」の価値（実行され、テストでカバーされたプログラムはそれ自身の正確性の証拠である）を、「動作している」ことを機械可読かつ*局所的*にすることで運用化する: カバレッジマップが、推論後の診断重要度を変調する新しいファクトソースになり、WD6パイプラインの`severity_profile`の近くに位置する — 型推論自体は変わらない。柱2（spec → 型ファクト）とは別物;これはカバレッジ → 信頼度だ**。これが設計可能になる前に解決すべき懸念:**（1）*カバレッジ ≠ 正確性* — 「実行された」は「型に関連するエッジケースが実行されアサートされた」ではないので、カバーされたコードに対する楽観的な姿勢は、テストが実行するがアサートしない実バグを抑制しうる;行カバレッジは特に弱く、分岐カバレッジはより良いが依然部分的だ。（2）2つの半分は**リスクが非対称**だ — 「未カバー → エスカレート」は再優先順位付けするだけで何も抑制しない（安全、純粋にアップサイドのみ）一方、「カバー済み → 抑制」は誤った安心のリスクを持つ;最初のスライスはおそらく未カバーの半分のみであるべき。（3）カバレッジアーティファクト（SimpleCovの`.resultset.json` / `Coverage` stdlibモジュール）はprovenance + 陳腐化処理を必要とする外部ファクトソースであり、不在または陳腐化時にフェイルソフトする。（4）[ADR-22](../adr/22-baseline-and-project-onboarding/)ベースラインとの可能なシナジー — カバレッジはどのベースラインバケットが「未テスト、ゆえに最初にレビューに値する」かをランク付けできる。ADRなし、スライスなし、コミット済みマイルストーンなし — 方向性としてここに記録。

### プラグイン / エコシステム
- **`rigor-graphql`** — 将来のスライス（需要駆動）: リゾルバメソッド型チェック、`<Type>.array` / `<Type>!`連鎖形、文字列形`field :foo, "User"`診断、`Schema.execute(...)`結果型付け。
- **dry-rbアダプタープラグイン（[ADR-12](../adr/12-dry-rb-packaging/)）**。**残り**: `rigor-dry-schema`の`each`を超えるスライス2+サーフェス（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断;需要駆動）、`rigor-dry-validation`スライス2（`:dry_schema_table`消費経由のparamsブロック型付け） + スライス3（`json { ... }`パリティ）;`rigor-dry-monads`（依然`Result[T, E]` / `Maybe[T]`キャリア決定が必要 — スライシング計画を参照）。基礎サーベイは[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)。
- **ADR-10 — gemソースからの呼び出しごとの戻り型精度**。ウォーカーは現在`(class_name, method_name) → kind`の3つ組のみをカタログ化する。gemソースからメソッドごとの戻り型を推論すること（`mode: :full`が`Dynamic[Top]`より豊富に貢献できるように）は、具体的なユーザー需要が表面化するまで先送りされる、より大きなウォーカー拡張。
- **プラグイン提供のRBSシグネチャ**。[ADR-25](../adr/25-plugin-contributed-rbs/)が提案された（2026-05-21）: オプションの`signature_paths:` `Manifest`フィールドにより、プラグインgemがRBSディレクトリを貢献でき、`Plugin::Loader`によって解決されRBS環境にマージされる。今日RBSのみのバンドルgem（`rigor-activesupport-core-ext`）を非ポータブルな`signature_paths:`パス経由で手配線することを強いるギャップをクローズする。3スライス（マニフェストフィールド + ローダー解決 + 環境マージ → `rigor-activesupport-core-ext`を些細なプラグインに変換 → `rigor-project-init` SKILLのフォロースルー）;pre-1.0プラグイン契約に加法的、v0.1.x内で安全。コンパニオンフォローアップ（別個、より小さい）: `Environment::BundleSigDiscovery`の自動検出を`vendor/bundle` / `.bundle/config`レイアウトを超えてデフォルトの`bundle install` gemパスに拡張する。
- **ADR-28パススコープのプロトコルコントラクト — オープンエコシステム項目**。`rigor-actioncable`の`#receive(data)`パラメーター型提供: `method_name: :receive, param_types: [{index: 0, type_name: "Hash"}]`のコントラクトにより、すべてのチャネルのreceiveボディ内で`data`が`Hash`として型付けされる。需要駆動。

### エディタ / IDE統合
- **LSP — 並列マルチバッファpublishのためのRactorプール**。LSP設計ドキュメントのスライス8は2つの関心事を列挙した: デバウンス（着地）AND Ractorプール統合。プール部分は需要駆動のまま — ワーカーをLSP `initialize`で1度事前ウォームしpublish全体で再利用できるよう、`Analysis::Runner`が事前ビルドされた永続的`Environment`を受け入れるリファクターが必要。ProjectContext（スライス7）はすでに読み取り専用`Cache::Store`経由でpublish + hoverにウォームEnvironmentの勝利を与える;ディスパッチ側並列性（コア全体のマルチバッファpublish）が残りのレバー。需要駆動。
- **LSP — `textDocument/definition`**（設計ドキュメントのスライス9、先送り）。`FILE:LINE`でキー化された`Reflection`側のシンボルインデックスが必要。需要駆動。
- **LSP — インクリメンタル`didChange`同期**（設計ドキュメントのスライス10、先送り）。現在、サーバーは`TextDocumentSyncKind::Full = 1`をアドバタイズするため、各キーストロークがバッファ全体を再送信する。インクリメンタル（`TextDocumentSyncKind::Incremental = 2`）はUTF-16オフセット帳簿 + 編集ごとの適用が必要。帯域幅はローカルstdioなのでコストはワイヤではなくパースにある;需要駆動。
- **LSP — まだキューされた拡張機能**（v2以降 + フォローアップ後 + ポリッシュ後）: `textDocument/codeAction`、`textDocument/rename`、`textDocument/semanticTokens`、`textDocument/inlayHint`、`textDocument/definition`（LSP v1設計のスライス9 — Reflectionシンボルインデックスが必要）、インクリメンタル`didChange`同期（LSP v1設計のスライス10 — UTF-16オフセット帳簿）、並列マルチバッファpublishのためのRactorプールディスパッチ（LSP v1設計のスライス8後半 — Runnerリファクター）、マルチルートワークスペース、TCP / Unixソケット輸送、スニペット展開、素の名前（暗黙のself）補完、シンボル補完、シグネチャ内ハイライトのための`ParameterInformation`オフセットタプルラベル、`completionItem/resolve`遅延ペイロード、プラグイン側の補完貢献。
- **エディタモードオプションB — ファイルごとの診断キャッシュ**。今日のエディタモードはオプションA（単一ファイルスコープ）を出荷: バッファのみがファイルごとの診断を生成する。オプションB（PHPStan形: プロジェクト全体の解析と1つの代入されたファイル、「編集ファイル + ディペンデントのみ再解析」）にアップグレードするには、`（ファイルダイジェスト、プロジェクトEnvironmentダイジェスト）`でキー化されたファイルごとの診断キャッシュが必要。ADR-17スライス3bのファイルごとのキャッシュディスクリプタが最も近い既存のレバー。設計: [`docs/design/20260516-editor-mode.md`](../design/20260516-editor-mode/) §「スコープの選択」。需要駆動。
- **CLIエディタモード — ディスクバック`ProjectScan`スナップショットキャッシュ**。実装パスは[`docs/design/20260518-cli-disk-snapshot-cache.md`](../design/20260518-cli-disk-snapshot-cache/)に文書化。`rigor check --tmp-file=X --instead-of=Y`シェルアウトパスをターゲット: プロジェクトのプレパス出力（スキャナ + dep-sourceインデックス + プラグイン公開ファクト）を`.rigor/cache/`に永続化し、`(config + plugin manifest + project file mtime+size + pre_eval mtime+size)`でキー化することで、ウォームCLI呼び出しがプレパスをスキップできるようにする。期待される勝利: CLI呼び出しあたり-200 ms（小プロジェクト）から>-1.3秒（基板プラグインを持つ大規模モノレポ）。新しい不変条件: `Plugin::FactStore`スナップショットAPI、プラグインファクトのMarshalフレンドリーさ。5フェーズ（Marshal可能なscan / キー導出 / キャッシュプロデューサー / Runner統合 / FactStoreスナップショットAPI）。需要駆動;LSPパスはすでにエディタケースのほとんどをpublishあたり≤5 msでカバーしているので、このスライスは具体的なCLIシェルアウトのエディタ拡張が約1秒の壁をUX問題として報告したときに着手される。
- **エディタモード — プレパス再利用のためのプロジェクトコンテキストスナップショットキャッシュ**。LSPパスで**着地**（v0.1.6、CHANGELOG `[Unreleased]` § Added）。新しい`Rigor::Analysis::ProjectScan`値オブジェクト + `Runner#prepare_project_scan`ビルダー + `Runner.new(prebuilt:)`採用パス;LSPの`ProjectContext`がスナップショットを遅延ビルドし、`invalidate!`でドロップする。CLIエディタモード（`rigor check --tmp-file`）はまだスナップショットを消費**しない**、各呼び出しが新鮮なプロセスのため — `（plugin-manifestダイジェスト、プロジェクトファイルmtime + サイズリスト）`でキー化されたディスクバックのスナップショットキャッシュが、ワンショットCLI呼び出しもプレパスをスキップできるようにする。需要駆動;LSP側の勝利が典型的なエディタ消費者。
- **エディタモード — `--also=path,path`呼び出し元宣言のディペンデント**。エディタ拡張は現在、ディペンデントを更新するためにN個の単一ファイル呼び出しを発行する必要がある。`--also`付きの単一の呼び出しがそれらをバッチする。些細なCLI拡張;設計ノートは`docs/design/20260516-editor-mode.md`。需要駆動。
- **マルチバッファエディタモード**（`--buffer A=B --buffer C=D`）。LSP v1がほとんどのユースケースでこれを置き換える（LSP `BufferTable`はすでにNバッファを保持する）;非LSPバッチツーリングには引き続き関連。需要駆動。

### パフォーマンス / スケーラビリティ
- **O4レイヤー3 — `Gemfile.lock`パース + `gem_rbs_collection`バージョンマッチング**。v0.1.5の`BundleSigDiscovery` MVPの上に座る。MVPの自動スキップリスト（`SKIPPED_GEMS_BY_DEFAULT`）はバージョン管理された解決テーブルになる;rigorは`Bundler::LockfileParser`出力を消費 + `ruby/gem_rbs_collection`で最適マッチバージョンをクエリする。O7の失敗メモでアンブロック（競合は今ハングするのではなく警告する）。
- **`rigor check`のフォークベースのファイルレベル並列性**。ウォーム`rigor check lib`のStackprofは推論約50%、`Marshal.load`約22%、GC約17%を示す。フェーズ4bのRactorパスがv0.1.5の並列性ストーリー;フォークベースのパスは、Ractorが利用不可能なホスト、または事前ウォームされた`Environment`ブロブのCOW共有がRactorごとのenv構築より良い場合の並行（非排他的）オプションのまま。
- **Spec-suiteランタイムブレークダウン（2026-05-17調査;部分的に着地）**。`make verify`デフォルトが並列rspec（コミット`086e507`）に切り替わった: wall時間217秒 → 60秒（12コアで3.6×）。フォローオンサイクルが実際のボトルネックは**各`analyze(sig: …)`での呼び出しごとのRBS env再構築**であることを確認した: `Cache::Store`は`RbsDescriptor::FileEntry`ごとに`(path, sha256)`でenvをキーするため、各呼び出しの一意の`Dir.mktmpdir`ルートのsigパスが新鮮な約1.8秒のenv構築を強制した**。ヘルパー側の修正が着地**（`spec/support/runner_helpers.rb`）: コンテンツキー化sigディレクトリ + ソースのみの呼び出しに対する共有ワークスペース。`runner_spec.rb` 39.6秒 → **25.4秒孤立（-36%）**、`make verify`並列65.6秒 → **52.6秒（-20%）**、12コアで。元々キューされた2つのレバーは小さな残りのヘッドルームでオープンのまま:
  - **(a) `runner_spec.rb`の例間で`Environment`を共有**、`before(:context)`または`let_it_be`形のヘルパー経由で。キャッシュキー修正が呼び出しごとのコストのsig関連コンポーネントをクリアしたので、残りの勝利はソースのみの高速パスを打つ約80%の例に対するEnvironment構築自体。例ごとのプラグイン変動は依然共有を複雑化する。需要駆動;ヘルパー側の修正がすでにほとんどのヘッドルームを吸収した。
  - **（b）インメモリ`Analysis::Runner.run_source(source:, path:, ...)`エントリーポイント**。各呼び出しでパス展開 + ワークスペースchdirをスキップ;埋め込み者（LSP / エディタモード）のための今日`Runner.new(configuration:).run`経由でルーティングされるクリーンなパブリックAPI。ヘルパー修正の上に小さなインクリメンタルなテストデルタ（約5%）だが、安定したパブリックサーフェスとして有用。需要駆動。
- **インメモリ`Analysis::Runner.run_source`エントリーポイント（パブリック + テスト専用）**。上記の「Spec-suiteランタイムブレークダウン」フォローアップ（b）と同じ項目;レガシークロスリファレンスのためにここに保持。

### Sig-gen（ADR-14）
- **`update_existing`がまだ兄弟の親 / 子クラスブロックを畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — フラット兄弟レイアウトはフラットなまま。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。

### ADRにキューされたオープン研究質問
- **ADR-15 § OQ1** — Ractorごとの`Cache::Store`共有ファサード。今日各ワーカーはキャッシュから自身のRBS envを構築する;OQ1は共有可能なファサード経由でワーカー全体でインメモリenvを共有することを探る。プールのwall-clockがシーケンシャルを上回るクロスオーバー（現在は約1.3〜1.8Kファイル）を下げる。
- **ADR-13 §「オープンクエスチョン」** — 5つのコア関数（`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`）を超えるシェイプ射影サーフェスの拡張。新しいマップ型語彙を追加するときに権威的。

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（v0.1.4 → v0.1.6）:**

- **Tier 1**: [`rigor-rails-routes`](../plugins/rigor-rails-routes/)（`:helper_table`）、[`rigor-rails-i18n`](../plugins/rigor-rails-i18n/)、[`rigor-actionmailer`](../plugins/rigor-actionmailer/)、[`rigor-activejob`](../plugins/rigor-activejob/)。
- **Tier 2**: [`rigor-activerecord`](../plugins/rigor-activerecord/)（`:model_index`;アソシエーション / enum / スコープ / バリデーション / コールバック）;[`rigor-actionpack`](../plugins/rigor-actionpack/)（ルート / フィルター / レンダー / ストロングパラメーター）;[`rigor-factorybot`](../plugins/rigor-factorybot/)（フェーズ1 (a)+（c））。
- **Tier 3**: [`rigor-pundit`](../plugins/rigor-pundit/)、[`rigor-sidekiq`](../plugins/rigor-sidekiq/)、[`rigor-rspec`](../plugins/rigor-rspec/)（Pillar 2スライス1+2+3）、[`rigor-actioncable`](../plugins/rigor-actioncable/)、[`rigor-activestorage`](../plugins/rigor-activestorage/)（v0.1.5）;[`rigor-graphql`](../plugins/rigor-graphql/)（v0.1.6 — Tier 3D、スライス1+2a〜2d、4つのクロスプラグインファクト）;[`rigor-minitest`](../plugins/rigor-minitest/)、[`rigor-rspec-rails`](../plugins/rigor-rspec-rails/)、[`rigor-shoulda-matchers`](../plugins/rigor-shoulda-matchers/)（v0.1.6）。
- **オプトインバンドル**: [`rigor-activesupport-core-ext`](../plugins/rigor-activesupport-core-ext/)（オプトインRBSバンドル）;[`rigor-typescript-utility-types`](../plugins/rigor-typescript-utility-types/)（ADR-13スライス6）。
- **メタgem**: [`rigor-rails`](../plugins/rigor-rails/)（v0.1.6スキャフォールド;Tier 1+2の`add_dependency`宣言;`.rigor.yml`でのアクティベーションはプラグインごとのまま）。
- **ADR-16基板消費者（v0.1.5）**: [`rigor-sinatra`](../plugins/rigor-sinatra/)（Tier A）、[`rigor-dry-struct`](../plugins/rigor-dry-struct/)（Tier C;v0.2.0 ADR-18精度向上）、[`rigor-devise`](../plugins/rigor-devise/)（Tier B）。
- **dry-rb基礎（v0.1.6）**: [`rigor-dry-types`](../plugins/rigor-dry-types/)（`:dry_type_aliases` — 正準 + ネスト + ユーザー著作コンポジション + 推移的参照）;[`rigor-dry-schema`](../plugins/rigor-dry-schema/)（`:dry_schema_table` — 認識 + `each`リストスロット）;[`rigor-dry-validation`](../plugins/rigor-dry-validation/)（`:dry_validation_contracts` + `Contract#call → Result`のRBSオーバーレイ）。`rigor-dry-struct` v0.2.0はADR-18の`returns_from_arg:`経由で`:dry_type_aliases`を消費。

**Railsエコシステム以外（v0.1.9でランド済み）:**

- [`rigor-hanami`](../plugins/rigor-hanami/) — Hanami::ActionのためのADR-28 provide-and-check。プロトコル: `app/actions/**/*.rb`内での`#handle(Hanami::Action::Request, Hanami::Action::Response) → void`。カスタムスレイアウトのための`action_path:`で設定可能。

**保留中のTier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`スライス3+（リゾルバメソッド型チェック;ブラケット形を超える`<Type>.array` / `<Type>!`連鎖形;文字列形`field :foo, "User"`診断;`Schema.execute(...)`結果型付け）。
- `rigor-dry-schema`スライス2+（ADR-16 Tier C経由の型付き`result.to_h`合成 / 行ごとの診断）、`rigor-dry-validation`スライス2+3（`:dry_schema_table`消費経由のparamsブロック型付け + `json`パリティ）、`rigor-dry-monads`（`Result[T, E]` / `Maybe[T]`キャリアのためのADR-3修正が必要 — [スライシング計画](../design/20260517-dry-validation-slicing/) §「Open observation」のスライシングオプションを参照）。
- `rigor-actioncable` `#receive(data)`パラメーター型提供強化（上記のADR-28エコシステムエントリを参照;需要駆動）。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`plugins/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。`rigor-rails`メタgemスキャフォールド（v0.1.6）はTier 1+2アンブレラのための公開可能なテンプレート — gemspec + `add_dependency`宣言はすべて整っている;野生でのアクティベーションはサブプラグインのsubtree-split + RubyGems公開を待つ。

[ADR-9](../adr/9-cross-plugin-api/)（クロスプラグインAPI）は`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）の公開-消費サイクルを介してv0.1.4で着地。ADR-9 §「実装スライシング」に従ったスライシングが部分的なランディングを可能にする。

[ADR-16](../adr/16-macro-expansion/)（マクロ / DSL展開基板）はv0.1.5でリリース。3つの動作消費者が基板をエンドツーエンドで行使する — `rigor-sinatra`（Tier A）、`rigor-dry-struct`（Tier C）、`rigor-devise`（Tier B）。基板はWD13フロア + 一般的なケースの精度プロモーション（Tier Bのorigin-module RBSディスパッチ、Tier Cの素のクラス名`nominal_for_name`）で出荷;Tier Dエンジン統合 + ユーティリティ型戻り値のためのADR-13リゾルバチェイン配線は需要駆動のまま。

[ADR-18](../adr/18-substrate-per-call-site-return-type/)（基板の呼び出しサイトごとの戻り型DSL）はv0.1.6に向けて`master`に蓄積中。`Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`（+ `lookup_via:`クロスプラグインファクトチャネル）を追加;`rigor-dry-struct` v0.2.0は最初の動作消費者（`rigor-dry-types`が公開する`:dry_type_aliases`経由で`attribute :city, Types::String`を`Nominal[String]`に解決）。スライス4（TraitRegistryパリティ） + 連鎖呼び出し引数抽出は需要駆動のまま。
