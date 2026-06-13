---
title: "ADR-53 — Scope discovery-index separation + check-rule walk consolidation"
description: "Imported from rigortype/rigor docs/adr/53-scope-discovery-index-separation.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/53-scope-discovery-index-separation.md"
sourcePath: "docs/adr/53-scope-discovery-index-separation.md"
sourceSha: "90b6108057c39136f0f95718d4d81ae05056b59b4c0b9560a2852ede158957c6"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 4053
---

ステータス: **Accepted — トラックA完了（スライスA1 + A2を2026-06-10/11に着地）。
トラックBのスライスB1〜B3が着地（B1 + B2は2026-06-11、B3は2026-06-13）、B4が残り。**アーキタイプ: 熟議型。ステークス: 高（推論エンジン
における状態キャリア（carrier）の再構成 + 正しさにクリティカルなルールのもとでの走査
変更。すべてのスライスはバイト単位同一の診断でゲートする）。
A1（`031f161e`）: `Scope::DiscoveryIndex`を抽出し、リーダーを委譲し、ライターをシム化
した。これを着地させたことで、予測したバグクラスが2回顕在化し修正された — ADR-44の
単一アロケーションbodyスコープのコンストラクタ2つがどちらも後から追加された
テーブルを静かに取りこぼしていた（`build_fresh_body_scope`の`data_member_layouts`、
`build_user_method_body_scope`の`data_member_layouts` + `discovered_method_visibilities`）。
A2（`063823e4`）: 14個のテーブルごとのライターを削除し、3つのシーディング箇所を
`with_discovery`に畳み込んだ。ゲートは保たれた: スイートとsteepがグリーン、self-check
とMastodon（146）/ Redmine（12）コーパスの診断がバイト単位同一、bench-perfのウォール
時間がフラット。トラックB B1+B2（`6858872c`）: シャドウラン等価性ハーネス + 2つのflowコレクターを1つの`CheckRules::RuleWalk`に載せた。トラックB B3（`b85c51c6` IvarWrite + `4f1745aa` DeadAssignment + `963a2947`メインパス）: `RuleWalk`を一般化し、統合コンテキスト（`in_loop_or_block` + 修飾されたクラス／モジュールのプレフィックス + `inside_def`）を1つのイミュータブルなノードごとの`Context`でスレッドするようにした；コレクターは`NODE_CLASSES`、任意の`RULE_WALK_GATES`（各レガシーウォークの走査プルーニングを再現するウォーク所有のサプレッション）、および`#visit(node, context)`を宣言し、その収集／フィルタロジックはそのまま移植される。5つの組み込みのファイルごとのウォーク（2つのflow + IvarWrite + DeadAssignment + メインの`NodeWalker.each`パス）は、いまや1つの走査に乗る。各スライスは、self-checkツリー、プラグイン／examples、Mastodon`app/models`、kramdown`lib`、haml`lib`の上で`RIGOR_SHADOW_RULE_WALK=1`をアクティブかつサイレントにしてバイト単位同一（診断）でゲートした（それはメインパスの最初の実行で、いかなるドリフトよりも前に、本物のidentity-`==`の不一致を捕捉した）；`rule_walk_equivalence_spec`が5つのコレクターすべてをホストする（174例）；bench-perfはニュートラル。**残り: トラックB B4** ── ADR-52 WD4の`Plugin::NodeRuleWalk`（その後着地済み；自然なホスト）との収束で、合計でファイルごとに1ウォークにする。

根拠:
[`docs/notes/20260610-lib-rigor-architecture-rereview.md`](../../notes/20260610-lib-rigor-architecture-rereview/)
（フェーズ4 — 設計判断を要する2つの再レビュー所見、B-4とA-4）。ボイラープレートの軸は
[`…-structural-repetition-audit.md`](../../notes/20260604-structural-repetition-audit/)
（テーマB、走査等価性ハーネスを待って延期）に、先行する性能判定は
[ADR-44](../44-dispatch-allocation-churn/)に根拠を置く。

## コンテキスト

リリース前のアーキテクチャ再レビューは、エンジンの基盤が健全である（非循環の層分け、
不変Scopeの<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>、統一された
ディスパッチ階層）と判定したが、機械的なクリーンアップではなく真の設計判断である2つの
構造的項目を残した。

**(A) `Rigor::Scope`は2種類の異なる状態を運ぶ**。その*フロー状態* — `locals`、
`fact_store`、`self_type`、`ivars`/`cvars`/`globals`、`indexed_narrowings`、
`method_chain_narrowings` — は制御フロー遷移が再束縛し、結合し、無効化するものである。
それと並んで**14個の発見テーブル**（`declared_types`、`class_ivars`、`class_cvars`、
`program_globals`、`discovered_classes`、`in_source_constants`、`discovered_methods`、
`discovered_def_nodes`、`discovered_def_sources`、`discovered_method_visibilities`、
`discovered_superclasses`、`discovered_includes`、`discovered_class_sources`、
`data_member_layouts`）が同乗している。これらは`ScopeIndexer`がそのファイルのスコープを
シードするときに一度書かれ、フロー遷移を越えて決して変化しない。コードはすでにこれらを
状態ではなくアンビエントなコンテキストとして扱っている: `Scope#==` / `#hash`はそれら
すべてを無視し（`scope.rb:655-671`）、`#join`はそれらを`self`から検査せずにコピーする
（`build_joined_scope`、`scope.rb:730-757`）。

コストは**アロケーションではない** — ADR-44のオブジェクトシェイプベンチマークは、3個
または25個のivarを持つ凍結オブジェクトがちょうど1つのヒープオブジェクトを確保すること
を示した — それはボイラープレートと境界である:

- 1つの副テーブルを追加するのに`scope.rb`だけで**7つの編集箇所**がかかる（attr_reader、
  コンストラクタのkwarg、ivar代入、`rebuild`のkwargデフォルト、`rebuild`の素通し、
  `build_joined_scope`の素通し、`with_*`ライター）。ADR-48の`data_member_layouts`が
  最後にこれを支払い、ADR-46/ADR-52はどちらも実行ごとのコンテキストを追加し続けている。
- `rebuild`（`scope.rb:675-712`）はエンジンで最もよく通るコンストラクタで、いまや
  24個のキーワード引数を通している。そのほとんどはどの遷移でも変化しない。
- 公開`Scope`表面は「フロー状態に尋ねる」クエリと「プロジェクトに尋ねる」クエリを
  混ぜており、これは`docs/internal-spec/public-api.md`がv1.0で凍結しなければならない
  境界（ADR-50）をまさにぼかしている。

**(B) `Analysis::CheckRules`は各ファイルを5回ウォークする**。メインの
`Source::NodeWalker.each`パス（`check_rules.rb:167`）に加えて、4つの独立したコレクター
ウォーク（`IvarWriteCollector` `:228`、`DeadAssignmentCollector` `:242`、
`AlwaysTruthyConditionCollector` `:255`、`UnreachableClauseCollector` `:265`）があり、
その上に`ScopeIndexer`自身のウォークとノードルールを持つプラグインごとに1回のウォークが
ある。コレクターは意図的に分離されたままにされた: その走査契約（contract）が異なる
（`IvarWriteCollector`は`BARRIER_NODES`を伴う`qualified_prefix`を通し、
`DeadAssignmentCollector`はネストdefバリアを伴い`DefNode`の本体のみをスキャンし、2つの
フローコレクターは同一の`in_loop_or_block`フラグを通す）し、走査順は診断にとって
load-bearing（依存性が高く崩せない）である。統合は延期されたscope_indexerウォーカー統一
（structural-repetitionのテーマB）と同じリスククラスであり、等価性ハーネスの背後でのみ
安全である。

なぜ今か: どちらの変更もADR-50の凍結がロックする表面（公開`Scope`リーダー表面、診断
出力の安定性）に触れるので、安価な窓はv1.0前である — そしてADR-52のエンジン所有
プラグインウォーク（WD4）が（B）のための自然な収束点を作る。

## 決定

両方を、1つの共有された規律のもとで個別にゲートされたトラックとして採用する: **振る舞い
の変更が信用に基づいて受け入れられることは決してない — すべてのスライスはバイト単位同一
の診断でゲートし、ウォーク統合はさらに、いかなるコレクターのマージの前にもシャドウラン
等価性ハーネスを要求する。**

### トラックA — `Scope::DiscoveryIndex`を抽出する

**基準（メンバーシップ）:** `Scope`のフィールドがインデックスへ移るのは、**いかなる
フロー遷移も、そのフィールドの値がシードと異なるスコープを決して生成しない場合に限る**
— すなわちインデックス / シード時にのみ書かれる。試金石はすでにコードの中にある:
`Scope#==`がそれを無視し、`#join`がそれを`self`から検査せずにコピーする。上記の14個の
テーブルはすべて合格する。`source_path`は移らない（それはファイルごとの同一性であり、
発見の産物ではなく、プラグインが直接読む）。`environment`とすべてのフロー状態は留まる。

**シェイプ:** 14個のテーブルを保持する1つの不変・凍結された値オブジェクト
（`Rigor::Scope::DiscoveryIndex`）で、シード時に`ScopeIndexer`が構築する。`Scope`は
単一の`@discovery`参照を保持する（ivar 25個 → 11個、`rebuild`のkwarg 24個 → 11個）。
凍結され深く共有可能なので、ADR-52のコンパイル済みテーブルと同様にADR-15ワーカーパスの
ためにRactor共有可能である。

**公開表面の保存:**既存のキー付きリーダーはすべて（`user_def_for`、
`top_level_def_for`、`user_def_site_for`、`superclass_of`、`includes_of`、
`discovered_method?`、`discovered_method_visibility`、`data_member_layout`、
`class_ivars_for`、`class_cvars_for`、…）デリゲートとして`Scope`に留まる — エンジンの
呼び出し元とプラグインに変化は見えない。ADR-46の`DependencyRecorder`計装はそれらの
アクセサの中にある（`scope.rb:350`、`:444`、`:465`、`:483`）。それはデリゲートと
ともに移り、**単一のチョークポイントのままでなければならない** — ストレージの再配置が
計装されない第2の読み取りパスを開いてはならない。テーブルごとの`with_discovered_*`
ライター（シード時のみで、実際にはプラグインに向くことはない）は単一の
`with_discovery(index)`へ畳み込まれる。それらは移行中シムとして生き残り、トラックの
最後に削除される（意図的な1.0前のクリーンアップ、ADR-52 WD3と同じ姿勢）。

**ADR-44との関係:** ADR-44はこの再グルーピングを*アロケーション*のレバーとして評価し、
正しく格下げした（個数ではなくサイズ）。このADRはそれを*境界 / ボイラープレート*の
基準で再採用する。`Scope`のスロットが小さくなり、kwargリストが短くなることは動機では
なくボーナスである。性能は**中立**と主張され、`make bench-perf`で検証される — いかなる
リグレッションもそのスライスをブロックする。

### トラックB — 単一のエンジン所有のチェックルールウォーク

**基準:**ファイルごとの分離した別個のASTウォークが正当化されるのは、**共有ウォークが
再現できない走査セマンティクスによってのみ**である。統合された`RuleWalk`は4つの
コレクターが必要とする和集合コンテキスト — 修飾クラスプレフィックス（IvarWrite）、
ネストdefバリアを伴う包含def（DeadAssignment）、`in_loop_or_block`（2つのフロー
コレクター）— を通し、`node class → [collector hooks]`へディスパッチする。これは組み込み
ルールに適用したADR-52 WD4モデルである。最終状態: ファイルごとに、1つの`ScopeIndexer`
ウォーク + 1つのルールウォーク（組み込みルール、**かつ**ADR-52 WD4の後はプラグイン
node_rules）— 6 + Nから減る。

**ハードな前提条件 — 等価性ハーネス:**レガシーコレクターとマージされたウォークを
self-checkツリー + Mastodon/GitLabコーパス上で並行して実行し、収集された結果が同一で
ある（かつ下流でバイト単位同一の診断になる）ことをアサートするシャドウランモード。
ハーネスなければマージなし。このハーネスは、延期されたテーマB（scope_indexerウォーカー
統一）が待っていた共有資産である。ここで構築することがその後の作業のブロックを外すが、
テーマB自体はスコープ外に留まる。

**攻略の順序:**まず2つのフローコレクターをマージする（その走査契約はすでに同一である —
最も低リスクで、ハーネスを証明する）、次にIvarWrite/DeadAssignmentを畳み込み、次に
メインの`NodeWalker.each`パス、次に（ADR-52 WD4と同時または後に）プラグインウォーク。

## ワーキング・デシジョン

- **WD1 — インデックスは`Environment`ではなく`Scope`の下に住む**。`Environment`は
  実行グローバルでファイル横断に共有される。発見テーブルはファイルごとのシード
  （ファイルごとの`ScopeIndexer`出力をクロスファイルの前処理パスとマージしたもの）で
  ある。それらを`Environment`に置くと、実行グローバルなオブジェクトのファイルごとの
  変更か、ファイルごとの`Environment`クローンを強いることになる — どちらも現状より
  悪い。
- **WD2 — リーダーは再配置ではなく委譲**。呼び出し元（エンジン + プラグイン）は
  `scope.user_def_for(...)`を呼び続ける。将来のv1.0ロックリストは`Scope#discovery`を
  直接公開するかもしれない。それは`public-api.md`の判断であって、このADRの判断では
  ない。
- **WD3 — `Scope#==`/`hash`のセマンティクスは不変**。それらはすでに発見テーブルを
  無視している。抽出はそれを偶然ではなくテキスト上の事実にする。`==`でインデックスの
  同一性をアサートすることは振る舞いの変更であり、取らない。
- **WD4 — コレクターはコレクターごとのロジックを保ち、走査だけがマージされる**。
  マージは*ディシジョン*ではなく*ウォーク*を統一する — 各コレクターの収集 / フィルタ
  ロジックはフックとしてそのまま移植される。いかなるロジック変更もスコープ外である。
- **WD5 — ステージング**。A1: `DiscoveryIndex` + デリゲート + シムの導入。A2: シーディング
  を`with_discovery`へ畳み込み、シムを削除。B1: ハーネス。B2: 2つのフローコレクターの
  マージ。B3: IvarWrite + DeadAssignment + メインパス。B4: ADR-52 WD4のプラグイン
  ウォークと収束。AとBは独立している。各トラック内では順序は拘束的である。

## 棄却・延期した代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| フェーズで切り替わるテーブルを持つ可変`Scope` | 棄却 | ADR-44がすでに可変 / プール化スコープを棄却済み: 再入性 → 静かなナローイングの破損 → 偽陽性。 |
| `Environment`上の発見テーブル | 棄却 | ライフタイムが誤り（実行グローバル対ファイルごとのシード）。WD1を参照。 |
| ルールコレクターを`ScopeIndexer`のウォークへ畳み込む（合計1ウォーク） | 棄却 | コレクターは*完成した*`scope_index`を読む。インデックス化中の収集は診断をインデックス化順に結合し、トラックBの最終状態を超える追加のウォーク節約なしに影響範囲を広げる。 |
| `Analysis::FactStore` → `Inference::`へのリネーム（再レビューが指摘した名前空間のひねり） | 延期 | 装飾的。振る舞いや境界の利得なし。v1.0の名前空間監査が強いる場合にのみ再訪する。 |
| `scope_indexer.rb`の完全な汎用ビジター書き直し（テーマB） | 延期 | structural-repetition監査から変わらず: 最も高リスクの走査表面。トラックBのハーネスがその実現資産である。書き直し自体は需要ゲートのままに留まる。 |
| `Scope#==`での発見インデックスの同一性アサート | 棄却 | 偽陽性に隣接する射程を持つ振る舞いの変更（スコープ等価性が短絡する）。WD3を参照。 |

## 帰結

ポジティブ:

- 新しい副テーブルが7箇所ではなく**1箇所**の追加（`DiscoveryIndex`フィールド）になる。
  ADR-46/48/52クラスの作業が支払い続けている再発する税を取り除く。
- `Scope`が内部仕様の言うとおりに読める — フロー状態 + アンビエントな発見参照 —
  これは`public-api.md`がv1.0で凍結しなければならない境界である。
- トラックBとADR-52 WD4の両方が着地すれば、ファイルごとのウォークが6 + Nから2へ減る。
- 等価性ハーネスが、いかなる将来の走査変更（テーマB、将来のコレクター追加）にとっても
  再利用可能なインフラになる。

ネガティブ / リスク:

- ホットパス上で発見の読み取りごとに余分なデリゲーションが1ホップ増える
  （`user_def_for`はディスパッチフォールバックごとに照会される）— ノイズに埋もれる
  と予想されるが、直感ではなく`make bench-perf`がそれをゲートする。
- すべてのシーディング箇所での移行による入れ替わり（`ScopeIndexer`、`Runner`の前処理
  パス、`WorkerSession`）— 機械的だが広い。シムのステージはそれをbisect可能に保つ
  ために存在する。
- ハーネスはトラックBにおけるユーザーに見える勝利の前に支払う実際の先行コストである。
  受け入れる理由は、代替案（検査だけでマージする）がまさにこのリポジトリが棄却する
  偽陽性規律の違反だからである。

## 検証

すべてのスライス: 完全な`make verify`（テスト / リント / チェック / check-plugins）+
self-checkツリーとMastodon（6プラグイン）/ GitLab（11プラグイン）の調査コーパス上での
バイト単位同一の`rigor check`診断（cwd=target + プロジェクトの`.rigor.yml`、
プロファイリング方法論ノートに従う）+ 許容範囲内の`make bench-perf`。トラックBの
スライスはさらに、同じコーパス上でシャドウランハーネスを実行する。ADR全体としての
受け入れ: シム削除済み、ファイルごとのウォークが2（ADR-52 WD4を伴う）、どこにも診断
ドリフトゼロ。

## 他のADRとの関係

- **[ADR-44](../44-dispatch-allocation-churn/)** — この再グルーピングのアロケーション
  中立性を測定し、性能レバーとして格下げした。このADRはそれを境界基準で再採用する。
  可変スコープの棄却はそのまま引き継がれる。
- **[ADR-46](../46-incremental-dependency-graph/)** — `DependencyRecorder`の
  チョークポイントはトラックAが委譲するアクセサの中にある。その単一パス性質の保存が
  トラックAのガードレールである。
- **[ADR-48](../48-data-struct-value-folding/)** — `data_member_layouts`はトラックAが
  取り除く7箇所の税の実例である。
- **[ADR-52](../52-compiled-plugin-contribution-dispatch/)** — 兄弟の再構成: 同じ
  一度コンパイル / 保持するキーでゲートする哲学。トラックBの最終状態はそのWD4の単一
  プラグインウォークとマージする。
- **[ADR-50](../50-release-engineering-and-stability-strategy/)** — タイミングを設定
  する: 両トラックともv1.0凍結の表面に触れるので、凍結前に着地するかメジャーを待つ。
- **`docs/internal-spec/inference-engine.md`** — `Scope`契約を束縛する。トラックAが
  着地するとき、仕様は同じ変更で`DiscoveryIndex`の記述を得る（仕様が束縛し、ADRが理由を
  記録する）。
