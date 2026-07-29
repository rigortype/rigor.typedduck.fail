---
title: "アーキテクチャ決定記録"
description: "rigortype/rigor docs/adr/README.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/README.md"
sourcePath: "docs/adr/README.md"
sourceSha: "1f5149d28d5ed2a14c0cf7ac42b2d56be981a29ade926e2e3bc78178838c9925"
sourceCommit: "42402864a316beb0d5ba4357ec29454ab55f6657"
translationStatus: "translated"
sidebar:
  order: 4000
---

このディレクトリにはRigorのアーキテクチャ決定記録（Architecture Decision Records、ADR）が含まれています。各ドキュメントは、重要な設計上の決定、その背景、検討された選択肢、そして結果を記録しています。

## 読み方

- **ADR-0**は基礎ドキュメントです — プロジェクトの中核的な原則とアーキテクチャを知るには、ここから始めてください。
- **ADR-1**から**ADR-3**は型モデル、拡張API、型表現を定義します — アナライザーの概念的な中核です。
- 番号の大きいADRは基礎の上に構築されており、必要に応じて読むことができます。
- 各ADRには**Status**フィールドがあります：`Accepted`、`Proposed`、`Superseded`のいずれかです。実装がまだ進行中のAcceptedなADRは、括弧書きの注記（例: *partially implemented*、*slice N deferred*）を持ちます。

## 索引

| # | Title | Status |
| --- | --- | --- |
| ADR-0 | [Rigorの基盤とコアアーキテクチャ](0-concept/) | Accepted |
| ADR-1 | [型モデルとRBSスーパーセット戦略](1-types/) | Accepted |
| ADR-2 | [拡張API戦略](2-extension-api/) | Accepted |
| ADR-3 | [内部型表現](3-type-representation/) | Accepted |
| ADR-4 | [型推論エンジンと`Scope#type_of`クエリ](4-type-inference-engine/) | Accepted |
| ADR-5 | [Rigor型のロバストネス原則](5-robustness-principle/) | Accepted |
| ADR-6 | [キャッシュ永続化バックエンド](6-cache-persistence-backend/) | Accepted |
| ADR-7 | [v0.1.0スライス4〜6作業上の決定](7-v0.1.0-slice-decisions/) | Accepted |
| ADR-8 | [Steepに着想を得た改善](8-steep-inspired-improvements/) | Accepted |
| ADR-9 | [クロスプラグインAPI](9-cross-plugin-api/) | Accepted（v0.1.1で実装） |
| ADR-10 | [オプトイン依存関係ソース推論](10-dependency-source-inference/) | Accepted |
| ADR-11 | [プラグインアダプタとしてのSorbet入力](11-sorbet-input-adapter/) | Accepted |
| ADR-12 | [dry-rbプラグインパッケージング](12-dry-rb-packaging/) | Accepted |
| ADR-13 | [`TypeNode`リゾルバプラグインフック + TypeScriptユーティリティ型アダプタ](13-typenode-resolver-plugin/) | Accepted |
| ADR-14 | [推論からのRBSシグネチャ生成と拡張](14-rbs-sig-generation/) | Accepted |
| ADR-15 | [アナライザーのRactorベース並行性モデル](15-ractor-concurrency/) | Accepted（フォークバックエンドがアクティブ；Ractorプールは見送り） |
| ADR-16 | [マクロ / DSL展開基板](16-macro-expansion/) | Accepted |
| ADR-17 | [プロジェクト側monkey-patchの事前評価](17-monkey-patch-pre-evaluation/) | Accepted（スライス1〜4を実装;5〜6は未解決） |
| ADR-18 | [基板の呼び出しサイトごとの戻り値型DSL](18-substrate-per-call-site-return-type/) | Accepted（v0.1.6で実装） |
| ADR-19 | [言語サーバーのパッケージング](19-language-server-packaging/) | Accepted（v0.1.6でLSP v1実装;v2 + フォローアップはv0.1.x全体で） |
| ADR-20 | [軽量高階多相性（Lightweight HKT）](20-lightweight-hkt/) | Accepted（部分実装） |
| ADR-21 | [Rubydex評価（基礎、バックエンド、ツール？）](21-rubydex-evaluation/) | Proposed |
| ADR-22 | [ベースラインメカニズム + プロジェクトオンボーディングSKILL](22-baseline-and-project-onboarding/) | Accepted |
| ADR-23 | [診断トリアージコマンド（`rigor triage`）](23-diagnostic-triage-command/) | Accepted（スライス1+2+3+4を実装） |
| ADR-24 | [implicit-selfメソッド呼び出し解決](24-self-method-call-resolution/) | Accepted（スライス4はゲート中；WD3のボディ内採用ゲートはADR-57により開かれた、2026-06-12） |
| ADR-25 | [プラグインが提供するRBSシグネチャ](25-plugin-contributed-rbs/) | Accepted |
| ADR-26 | [ActiveRecord relationの型付け](26-activerecord-relation-typing/) | Accepted |
| ADR-27 | [ツール配布・インストールモデル](27-tool-distribution-model/) | Accepted（部分実装；Nix flake・コンテナイメージ・CIテンプレートを出荷；シングルバイナリは見送り） |
| ADR-28 | [パススコープのメソッドプロトコル契約](28-path-scoped-protocol-contracts/) | Accepted |
| ADR-29 | [ブラウザプレイグラウンド](29-browser-playground/) | Accepted（v0.1.10〜0.1.11でサーバーサイドプレイグラウンド；ブラウザ内`ruby.wasm`ビルドを2026-06-14/15に出荷） |
| ADR-30 | [`rigor-ffi`プラグインの形状](30-rigor-ffi-plugin-shape/) | Proposed（未実装） |
| ADR-31 | [貢献およびサプライチェーンポリシー](31-contribution-and-supply-chain-policy/) | Accepted（発効中） |
| ADR-32 | [オプトインプラグインとしてのインラインRBSコメント取り込み](32-rbs-inline-comment-ingestion/) | Accepted（v0.1.10で実装） |
| ADR-33 | [MCPサーバーパッケージング](33-mcp-server/) | Accepted（v0.1.10で実装） |
| ADR-34 | [トップレベルのunresolved implicit-self呼び出しはデフォルトで警告する](34-toplevel-unresolved-self-call-default/) | Accepted（v0.1.13で実装；ADR-29のPlaygroundデフォルト重大度の配線も出荷——そのサンドボックス設定が`severity_profile: strict`を設定する） |
| ADR-35 | [オーバーライドのシグネチャ互換性（リスコフのシグネチャ規則）](35-override-signature-compatibility/) | Accepted（スライス1〜4完了；スライス5は見送り） |
| ADR-36 | [マクロ基板のネストクラス生成ティア（Mangrove `Enum`）](36-mangrove-enum-nested-class-emission/) | Accepted（Slice A実装済み；`is_a?`網羅性は見送り） |
| ADR-37 | [プラグインのインターフェース分離（狭い拡張プロトコル）](37-plugin-interface-segregation/) | Accepted（スライス1〜3実装済み；同梱のウォーカープラグインはすべて移行済み；`flow_contribution_for`はADR-52 WD3に従い2026-06-11に削除） |
| ADR-38 | [プラグインが宣言する追加イニシャライザー](38-additional-initializers/) | Accepted（def形式は実装済み；ブロック形式は見送り） |
| ADR-39 | [プラグインは対象ライブラリの安全なメソッドを直接呼び出せる](39-plugin-target-library-invocation/) | Accepted（Plugin::Inflector＋3つのコンシューマーを移行；スライス3は見送り） |
| ADR-40 | [`config_schema`で宣言するデフォルト値（`{kind:, default:}`）](40-config-schema-defaults/) | Accepted（メカニズム＋13個のプラグインを`DEFAULT_*`イディオムから移行） |
| ADR-41 | [推論バジェットの設計（配線、ヒット時ポリシー、計測ゲート付きデフォルト）](41-inference-budget-design/) | Proposed（仕様テーブルは未配線；Layer 1のドキュメント衛生＋Layer 2の計測ゲート付き配線がキュー待ち） |
| ADR-42 | [プラグインが提供する二項演算子の戻り値型（coerce方向）](42-plugin-binary-operator-return-types/) | Proposed（低優先度、需要ゲート付き；self／左辺オペランドのケースは`dynamic_return`経由ですでに動作） |
| ADR-43 | [RBS完全な祖先解決（許可リストによる継承メソッドのディスパッチ）](43-rbs-complete-ancestor-resolution/) | Accepted（全面的に着地、WD1〜WD6；`make check-plugins`ゲートを`verify`＋CIに配線） |
| ADR-44 | [ディスパッチごと／ナローイングごとのアロケーションチャーン（Scope、CallContext）](44-dispatch-allocation-churn/) | Accepted（ボディスコープの折り畳み＋アロケーション衛生が着地；ミュータブルなプール化は却下；フィールド再グループ化は優先度引き下げ） |
| ADR-45 | [変更なしプロジェクトの高速パス（実行結果キャッシュ）](45-unchanged-project-fast-path/) | Accepted（record-and-validateな実行キャッシュが着地；素朴な解析前フィンガープリントは不健全として却下） |
| ADR-46 | [ファイル間依存グラフによるインクリメンタル解析](46-incremental-dependency-graph/) | Accepted（スライス1〜4が着地、ファイルの追加・削除を含む；`--incremental`はCIで`--verify-incremental`にゲートされる） |
| ADR-47 | [ナローイング駆動の節到達可能性（`flow.unreachable-clause`）](47-narrowing-driven-clause-reachability/) | Accepted（WD1〜WD3aが着地、v0.1.17；WD4の16コーパススイープは発火ゼロ；WD3bは見送り） |
| ADR-48 | [Struct / Data値畳み込み（メンバーシェイプキャリア）](48-data-struct-value-folding/) | Accepted（`Data.define`スライス1〜4が着地、v0.1.17；Structスライス1〜3が着地、スライス4は見送り） |
| ADR-49 | [ADR執筆ガイドライン（必要十分なADRのためのルーブリック）](49-adr-authoring-guidelines/) | Accepted（発効中；生きているルーブリック） |
| ADR-50 | [リリースエンジニアリングと安定化戦略（v0.2.0 → v1.0.0）](50-release-engineering-and-stability-strategy/) | Proposed（v0.2.0はリリースエンジニアリングの試行；v1.0.0はハードな契約フリーズ） |
| ADR-51 | [CIネイティブな診断出力フォーマット](51-ci-diagnostic-output-formats/) | Accepted（v0.1.18で部分実装） |
| ADR-52 | [コンパイル済みプラグイン貢献ディスパッチ](52-compiled-plugin-contribution-dispatch/) | Accepted（スライス1〜6を実装；WDサーフェス全体が完了、残りの作業は需要駆動） |
| ADR-53 | [Scopeの発見インデックス分離 + チェックルールウォークの統合](53-scope-discovery-index-separation/) | Accepted（トラックAとトラックBがどちらも完了） |
| ADR-54 | [キャッシュのスリム化: definitions-blobの廃止、ペイロード圧縮、デフォルトのエビクション](54-cache-slimming/) | Accepted（WD1〜WD4を実装；キャッシュフットプリントはプロジェクトあたり約33.7MB→約2MB） |
| ADR-55 | [再帰メソッドの戻り値型精度（定数引数の有界アンロール + 不動点の戻り値型サマリー）](55-recursive-return-precision/) | Accepted（スライス1とスライス2をどちらも実装） |
| ADR-56 | [ブロックがキャプチャしたローカルのライトバックとループ本体の不動点（ミューテーション効果の健全性）](56-block-captured-local-mutation/) | Accepted（スライスAとBを2026-06-11に実装；スライスCを2026-06-12に実装） |
| ADR-57 | [implicit-self呼び出しの戻り値採用ゲートを開く（ADR-24 WD3の再検討）](57-self-call-return-adoption/) | Accepted（ゲートを2026-06-12にオープン；WD3のモジュールシングルトンのシード修正を2026-07-10に着地） |
| ADR-58 | [インスタンス変数のフィールド型付け: 宣言由来のnilポリシー、同種書き込みの読み取り、コンストラクタの確定代入](58-ivar-field-typing/) | Accepted（WD1は部分的、WD1bはキュー入り；WD2はalready-realized；WD3/WD5を実装；`\|\|=`シードは見送り） |
| ADR-59 | [スペックのアサーションは実装のシグネチャではない](59-spec-assertions-are-not-signatures/) | Accepted（強形は却下；弱形を3つ記録、需要ゲート付き） |
| ADR-60 | [フリーズ前のプラグイン契約統合](60-pre-freeze-plugin-contract-consolidation/) | Accepted（2026-06-13） |
| ADR-61 | [エージェントに優しい診断統計（構造化セレクタ軸）](61-agent-friendly-diagnostic-statistics/) | Accepted（2026-06-13に実装；精度加算的） |
| ADR-62 | [アナライザーのミューテーションテスト（偽陰性／歯の計測）](62-mutation-testing-teeth-measurement/) | Accepted（ハーネス＋最初の修正が2026-06-13に着地；残りのバックログは需要ゲート付き） |
| ADR-63 | [ユーザー向け型保護カバレッジ](63-type-protection-coverage/) | Accepted（ティア1とティア2をどちらも2026-06-14に実装） |
| ADR-64 | [非nilの引数型不一致とcoerceの障壁](64-non-nil-argument-type-mismatch/) | Accepted（非nilチャネルを構築し、多重オーバーロードメソッドに対してゲート） |
| ADR-65 | [診断の証拠ティアとドキュメントURL](65-diagnostic-evidence-tier-and-doc-url/) | Accepted（2026-06-15に実装；精度加算的） |
| ADR-66 | [タグ付きユニオンのメンバー型付け（タグキーによるナローイング）](66-discriminated-union-member-typing/) | Proposed（未実装；需要ゲート付き） |
| ADR-67 | [パラメータ型推論（M3フロンティア）: 呼び出しサイトと本体内、精度加算的のみ](67-parameter-type-inference/) | Accepted（WD1+WD3+WD5を実装；WD6のcheckウォーク有効化を2026-07-19に設計、スライスはキュー入り；WD2は見送り） |
| ADR-68 | [プラグインが宣言可能なクラスビルダー畳み込み（Struct / Dataを超えるメンバーシェイプキャリア）](68-class-builder-folding/) | Proposed（需要ゲート付き） |
| ADR-69 | [プラグイン可能なミューテーション基盤（キルオラクル + オペレータシーム）](69-pluggable-mutation-substrate/) | Accepted（両シームを2026-06-17に実装） |
| ADR-70 | [静的∪動的の融合保護カバレッジ](70-fused-protection-coverage/) | Accepted（2026-06-17に実装；ADR-69のシーム1と同時着地） |
| ADR-71 | [型ガイド付き外部インクリメンタルミューテーションテスト](71-type-guided-external-mutation-testing/) | Proposed（先送り／需要ゲート付き；未実装） |
| ADR-72 | [Gemfile.lockでゲートされたバンドルRBSオーバーレイ](72-gemfile-lock-gated-rbs-overlays/) | Accepted（2026-06-17に実装） |
| ADR-73 | [SKILL駆動のRigorユーザー体験](73-skill-driven-user-experience/) | Accepted（WD1〜WD5を2026-06-20に着地；フラグ文法を2026-06-21に改定；薄いシェル／ライブコア分割＋`rigor skill --full`を2026-07-05に追加） |
| ADR-74 | [オフラインドキュメントアクセス（`rigor docs`）と`llms.txt`連携](74-offline-doc-access-and-llms-txt/) | Accepted（WD1〜WD4を2026-06-20に実装） |
| ADR-75 | [`Dynamic[T]`の来歴（provenance）と説明](75-dynamic-provenance/) | Accepted（2026-06-24に実装、`01e291cb`） |
| ADR-76 | [`freeze` / `dup` / `clone`のエフェクトモデリングとシェイプキャリアの保存](76-effect-modeling-freeze-dup-shape-preservation/) | Accepted（WD1を2026-06-24に着地；ADR-78がブロックを解いた後、WD2を2026-06-26に着地） |
| ADR-77 | [`rigor doctor`と`rigor upgrade`の証拠ルーティングコマンド](77-doctor-and-upgrade-commands/) | Accepted（2026-06-24に実装；`upgrade`はスケルトン） |
| ADR-78 | [反射的な過剰畳み込みと`flow.always-truthy-condition`の許容範囲](78-reflexive-overfold-always-truthy/) | Accepted（2026-06-26に完全実装） |
| ADR-79 | [チェッカー固定の決定性よりRBSバージョン範囲への忠実性](79-rbs-version-range-over-pinned-determinism/) | Accepted（2026-06-26） |
| ADR-80 | [`type_specifier`プラグインフックを`narrowing_facts`へ改名](80-narrowing-facts-rename/) | Accepted（0.3.0で完了；`type_specifier`を`narrowing_facts`へ改名） |
| ADR-81 | [スキルセット最適化: スキルごとの鮮度 + `waza`評価スタンス](81-skill-set-optimization/) | Accepted（2026-07-05に実装） |
| ADR-82 | [`Dynamic[T]`の由来（provenance）配線: 実アプリでキャッチオールを打破する](82-dynamic-provenance-wiring/) | Accepted（WD1〜3,6〜9を2026-07-06／07-11に実装；WD4は見送り；原因なし49%→26%） |
| ADR-83 | [Dynamic-origin代数: `Dynamic`へ吸収せずユニオンアームを保つ](83-dynamic-origin-algebra/) | Accepted（`value-lattice.md`のジョイン代数を置き換える;仕様をエンジンの振る舞いに合わせて改訂） |
| ADR-84 | [クロスファイル戻り値メモのスコープ設定とtaint-preciseなストアゲート](84-cross-file-return-memo-scoping/) | Accepted（WD1をPR #79で着地；WD2〜WD3を実装；mailの本体評価3,355→557） |
| ADR-85 | [ファイルごとのシードバンドルと遅延def-nodeハンドル（事前パスのインクリメンタル化）](85-seed-bundles-and-lazy-def-node-handles/) | Accepted（WD1をPR #81で；WD2〜WD3をPR #82で；gitlabのウォームインクリメンタルのアロケーション1670万→206万） |
| ADR-86 | [残余のホットパスに対する部分的ネイティブ拡張（却下;rigor-rsがネイティブ速度を所有する）](86-partial-native-extensions/) | Accepted（ネイティブ拡張の恒久的な却下；rigor-rsがネイティブ速度を所有；WD4候補を段階化） |
| ADR-87 | [ヌルビルドフロア: stat-then-digest検証、ゼロ変更のスナップショットスキップ、ヒットパスのブートスリム化](87-null-build-floor/) | Accepted（WD1〜WD5を実装、PR #85；ADR-54の却下されたmtime高速パスを優越） |
| ADR-88 | [インクリメンタルなプラグインファクトの健全性](88-incremental-plugin-fact-soundness/) | Accepted（WD1〜WD4を実装、PR #89；WD5は見送り） |
| ADR-89 | [セマンティックな伝播ゲート: 宣言シェイプと観測キーの戻り値サマリー](89-semantic-propagation-gates/) | Accepted（WD1の宣言シェイプゲート＋WD2の戻り値サマリーゲートを実装、PR #90；gitlab 341→1） |
| ADR-90 | [解析対象プロジェクトのバンドルからのターゲットライブラリ解決](90-target-library-resolution-from-project-bundle/) | Accepted（2026-07-16に実装；WD1〜WD3が着地） |
| ADR-91 | [Kernel組み込み畳み込みの所有権ゲート＋綴りパリティ不変条件](91-kernel-intrinsic-fold-ownership-gate/) | Accepted（2026-07-16に実装、WD1〜WD4；コーパスゲートはバイト同一） |
| ADR-92 | [規範的ステータスの忠実性: 創設期の地層とdeclare-or-markゲート](92-normative-status-fidelity/) | Accepted（2026-07-16にWD1〜WD5、2026-07-25にWD6を実装；void判定はオプションbで解決） |
| ADR-93 | [デフォルトのrbs-inline取り込み: ADR-32のオプトインとalways-parse仕様の調停](93-default-rbs-inline-ingestion/) | Accepted（WD5のエンジンアンカーな同梱プラグイン解決を2026-07-19に追加、スライスはキュー入り） |
| ADR-94 | [インラインRBSリーダー: `RBS::InlineParser`とrbs 3.xの下限](94-rbs-inline-reader-and-the-rbs-3x-floor/) | Accepted（移行は見送り；rigor-rbs-inlineがリーダーのまま） |
| ADR-95 | [Homebrew配布: シングルバイナリの後ろに先送り](95-homebrew-tap-deferral/) | Proposed（先送り、トリガーゲート付き；未実装） |
| ADR-96 | [プラグインのターゲットgem宣言、プラグインギャップ勧告、存在ゲート付きアンブレラ拡張](96-plugin-target-gems/) | Accepted（WD1〜WD2をコミット；WD3のアンブレラ拡張はProposed） |
| ADR-97 | [索引エントリーはサマリーではない: ADR索引のバジェットとそのゲート](97-adr-index-budgets/) | Accepted（2026-07-17に実装；両方のADR索引を宣言された契約まで圧縮し、`spec/docs/agent_index_spec.rb`でゲート） |
| ADR-98 | [開発フロー文書の役割: ハンドオフ、issue、changelog](98-development-flow-document-roles/) | Accepted（2026-07-17に実装；バックログをGitHub Issuesへ移行、`ROADMAP.md`を解消、ハンドオフに上限を設けてゲート） |
| ADR-99 | [設定スキーマは信頼できる情報源である: `.rigor.yml`のティアと予約パイプライン](99-config-schema-authority/) | Accepted（2026-07-17に実装；スキーマを信頼できる情報源と定め、`rigor_rs:`を予約、ネスト＋予約＋URLのゲートを追加） |
| ADR-100 | [`static.*`診断ファミリーの形状と`void_origins`サイドテーブル](100-static-diagnostic-family-and-void-origins/) | Accepted（directスライスを出荷；WD4の推移的な設計を2026-07-19に追加、スライスはキュー入り；バジェットidは見送り） |

## 新しいADRの追加

重要なアーキテクチャ上の決定を行うとき：

1. このディレクトリで次に空いている番号を見つけます。
2. 既存のADRからテンプレートをコピーするか、同じ構造（Status、Context、Decisions、Consequences）に従って新しいファイルを作成します。
3. 上記の索引テーブルにエントリーを追加します。
4. 適切なコードコメント、他のADR、または`AGENTS.md`からそのADRを参照します。

## 他のドキュメントとの関係

- **`docs/types.md`** — 型仕様のクイックガイド。ADR-1と`docs/types.md`が同じ領域を論じているとき、*アナライザーが何をするか*については`docs/types.md`が権威を持ち、*なぜそうするか*についてはADR-1が権威を持ちます。
- **`docs/type-specification/`** — 規範的な型仕様。トピックごとのドキュメントに分割されています。
- **`docs/internal-spec/`** — アナライザー内部の契約（contract）（エンジンサーフェス（surface）、型オブジェクトの公開API）。
- **`docs/handbook/`** — エンドユーザー向けハンドブック。静的型付けの予備知識を持たないRubyプログラマー向けに書かれています。
- **`AGENTS.md`** — このリポジトリで作業するエージェント向けの開発契約。
