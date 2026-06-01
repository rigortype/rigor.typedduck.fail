---
title: "ADR-21 — Rubydex評価（基礎、バックエンド、ツール？）"
description: "rigortype/rigor docs/adr/21-rubydex-evaluation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/21-rubydex-evaluation.md"
sourcePath: "docs/adr/21-rubydex-evaluation.md"
sourceSha: "c7279caa1f0550610a3ad34df5e00c3e18061a4be4cfcf35ea9fa0914cd2fff6"
sourceCommit: "203008e9741e8ffd61448e32cf9b89c19f1339da"
translationStatus: "translated"
sidebar:
  order: 4021
---

Status: **proposed（評価）、2026-05-19**。3つの候補役割 — 実装基礎、置き換え可能なバックエンド、補助ツール — についてShopifyの[`rubydex`][rubydex]に対するプロジェクトのスタンスを記録し、将来の「rubydexをそのまま使えばいいのでは？」という質問が、サイクルごとに再議論されるのではなく、書かれた前提に対して解決されるようにする。**このADRによってスケジュールされるコア変更はない**;規律と再評価トリガーを設定する。

[rubydex]: https://github.com/Shopify/rubydex

## コンテキスト

[Rubydex][rubydex]は、Shopifyがメンテナンスする「Ruby言語のための高性能静的解析ツールキット」で、[Rails-at-Scaleブログ記事「1つのエンジン、多くのツール」][post]（2026-05-12）で発表された。スタック: 3つのcrateのCargoワークスペース + `ext/rubydex/extconf.rb`経由でC-ABI dylibをロードする薄いRuby gem（`>= 3.2.0`）。パーサ: **Prism**（`ruby-prism 1.9.0`）。RBSパーサ: Rust製の**`ruby-rbs`** crate、ランタイムではRuby `rbs` gemではない。ライセンス: MIT。執筆時点の現バージョン: **0.2.3（2026-05-11）** — `v0.2.0` GAの11日後、リリースごとにパブリックRuby APIへの加法的変更が多い。

Rubydexのポジショニングは明示的で重要な要素である: それは型チェッカー**ではない**。ブログ記事は型認識解析を将来の作業として列挙している（「**型認識解析**: 型アノテーション（Sorbet sigs、RBS）を消費し、型推論を通じてメソッド参照の精度を向上させる」）。READMEと`docs/architecture.md`は2つのステージを記述している — **Discovery**（文字どおりに書かれたすべての`Definition`を捕捉）と**Resolution**（`Definition`を`Declaration`にグループ化し、FQNを計算し、定数参照を解決し、祖先を線形化）。Rubyサーフェス（surface）は`Rubydex::Graph`で、`#index_workspace` / `#index_all` / `#resolve` / `#diagnostics` / `#[fqn]` / `#search` / `#resolve_constant(name, nesting)`プラス`Declaration` / `Definition` / `Signature` / `Mixin` / `Reference` / `Location`値オブジェクト。

rubydexが追跡するものとしないもの:

| サーフェス | ステータス |
| --- | --- |
| クラス / モジュール / 定数 / メソッド / ivar / cvar / グローバル — 定義からグループ化された宣言 | 追跡 |
| `include` / `prepend` / `extend`ミックスインチェーン;祖先線形化 | 追跡 |
| ロケーションデータを持つ定数参照;FQNごとの逆引きルックアップ | 追跡 |
| 宣言ソースとしてのRBSファイル（ロケーション、コメント、非推奨化、パラメータ*形状*） | 追跡 |
| Require-pathの解決（`#resolve_require_path`、`#require_paths`） | 追跡 |
| RBSからのメソッド型（戻り型、パラメータ型） | **公開されない** — `MethodDefinition#signatures`はパラメータ*形状*のみを返す |
| 高精度のメソッド参照 | **部分的**（ブログ: 「メソッド参照を制限付きで」 — 型推論が必要） |
| 型推論、制御フロー、ナローイング（narrowing）、式型クエリ | **今日は明示的な非ゴール** |
| リンタールールカタログ、リファクタリングエンジン、コード生成 | **今日は明示的な非ゴール** |

ShopifyのRubyツールスタックでの採用 — 2026-05-19時点:

- **Tapioca**: `main`上。`tapioca.gemspec`は`rubydex >= 0.1.0.beta10`を宣言;`lib/tapioca/static/symbol_loader.rb`は`Rubydex::Graph#index_all` / `#resolve`を直接呼ぶ。ブログ記事は、gemのRBI生成が約6分から約20秒になったと主張する。
- **Ruby LSP**: **進行中**。[PR #4103「Rubydexへ移行し古いindexerを削除」][ruby-lsp-pr]がオープン、約30のサテライトPR/issue。ライブの`ruby-lsp` `main`の`Gemfile.lock`はrubydexに依存していない。ブログ記事がこれを完了済みとして表現しているのは将来を見越したもの;「マージ間近」として扱い、「出荷済み」とは扱わない。
- **Packwerk**: プロトタイプ。[PR #447][packwerk-pr]「コアパース / 解決エンジンをRubydexで置換」がオープン。
- **Spoom**: 探索的、ブログ記事に従い一時停止。

このADRが対処する質問、3部構成:

1. **基礎** — Rigorの実装はrubydexの上に再プラットフォーム化できるか？ 特に: Rigorの環境 / クラスレジストリ / プロジェクトソース発見プレパスを削除し、rubydex `Graph`に対するクエリとして再実装することは意味があるか？
2. **バックエンド** — Rigorの既存の実装とrubydexバックエンドの実装が安定した内部境界の背後で共存できるか、選択がフォークではなくランタイム/設定の決定になるように？
3. **ツール** — （1）と（2）とは独立に、再プラットフォーム化せずに`rigor lsp`または特定のCLIサブコマンドから消費する価値のある離散的なrubydex能力（定数クロスリファレンス、ワークスペースシンボル検索、require-path解決）があるか？

4番目の質問が3つの上に浮かんでいる: rubydexのスコープはRigorがすでに実装しているものとどれくらい**重なる**か、そしてその重なりは長期的な方向性について何を含意するか？

[post]: https://railsatscale.com/2026-05-12-one-engine-many-tools/
[ruby-lsp-pr]: https://github.com/Shopify/ruby-lsp/pull/4103
[packwerk-pr]: https://github.com/Shopify/packwerk/pull/447

## 決定

3つの質問は異なる決定をする:

| # | 質問 | 決定 | 再検討時期 |
|---|---|---|---|
| 1 | 基礎（Rigorのコアを置き換え） | **拒否**。RubydexのスコープはRigorの主要ミッションの下で終わる。 | rubydexが、キャリア（carrier） / ナローイング / ディスパッチャーを再実装せずに基板として使える型推論エンジンを出荷した場合のみ（トリガー参照）。 |
| 2 | バックエンド（置き換え可能なインデックスソース） | **明示的なトリガー付きで先送り**。v0.1.xまたはv0.2.xでアクション化されない。 | 下記トリガー条件が発火したとき — 主に: rubydexが1.0に達し安定APIを持つ;rubydexがパラメータ形状だけでなくRBS *メソッド型*を公開する;Ractor共有可能性が文書化される。 |
| 3 | ツール（LSPクロスファイル機能） | **条件付き承認、キュー**。`plugins/rigor-lsp-rubydex/`下で`textDocument/definition` / `textDocument/references` / `workspace/symbol`の*オプトイン*LSPケイパビリティ（capability）プロバイダとして採用。アナライザーの主要パスを変更しない。 | LSPロードマップがこれらの能力の1つにコミットしたとき。 |

戦略的フレーム、ドキュメントの残りが繰り返し再記述する必要がないように1度記録される: **Rubydexは普遍的なインデクサーであり、Rigorは*それから消費すべきで、それになるべきではない***。Rigorの差別化された価値は型束（ADR-1）、推論エンジン（ADR-4）、RBS-スーパーセット注釈文法（`RBS::Extended`）にある。Rubydexの差別化された価値は、Tapioca / Ruby LSP / Packwerkが共有できるRustバックの宣言グラフにある。2つのプロジェクトは異なる質問に答え、より健全な構成の方向は「RigorのRBSメソッド型トランスレーターがrubydex `Graph`から読む」であり、「Rigorが自身のエンジンを捨てるrubydex消費者になる」ではない。

## 根拠

### トラック1 — 基礎の置き換えを拒否

Rubydexは、Rigorの推論エンジンが実装するサーフェスエリアを明示的に放棄している。ブログ記事と`docs/architecture.md`から:

> *Rubydexには型の概念がなく、推論を実行しない……メソッド参照を高精度で追跡することはレシーバーの型を推論することに依存しており、これは現在サポートされていない。*

Rigorの`lib/rigor/inference/`サブツリーに対してマップすると、非重複は網羅的:

- [`expression_typer.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb) — Prismノードごとの型計算機。**rubydexのスコープ外**。
- [`narrowing.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/narrowing.rb)と
  [`acceptance.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/acceptance.rb) —
  [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/)に従ったエッジ感応ナローイング。**rubydexのスコープ外**。
- [`method_dispatcher/`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/method_dispatcher) —
  ティア化されたディスパッチャー（ADR-2 / ADR-9 / ADR-10に従い、RBS → in-source → プラグイン → 依存ソース推論）。**rubydexのスコープ外**。
- [`rbs_type_translator.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/rbs_type_translator.rb) —
  RBSメソッド型を内部キャリアに翻訳。Rubydexの`MethodDefinition#signatures`はパラメータ*形状*のみを返す;このトランスレーターを置き換えられない。**置き換え不可能**。
- [`hkt_*`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/) — ADR-20の軽量HKT基板。**rubydexのスコープ外**。
- [`synthetic_method_*.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/) — ADR-16のマクロ展開基板。**rubydexのスコープ外**。
- [`project_patched_*.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/) — ADR-17のmonkey-patch事前評価レジストリ。**rubydexのスコープ外**。
- [`closure_escape_analyzer.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/closure_escape_analyzer.rb) — クロージャエスケープ / キャプチャ解析。**rubydexのスコープ外**。

これらのいずれもrubydex `Graph`に対するクエリとして表現できない、なぜならグラフはrubydexの2つのステージが生成するもの（宣言と解決された参照）のみを保存するからである。推論エンジンがアナライザーであり、全面的な置き換えは「rubydex内でRigorのアナライザーを再実装する」を意味する — これはブログ記事自体が予想する逆方向である（「SorbetのようなチェッカーがゆくゆくはRubydexを消費できるようになり、同じ基礎から大きな恩恵を受けるだろう」）。

理論的に興味深い代替 — 「Rigorの推論エンジンを**rubydexにアップストリームでマージ**して統合ツールがインデクサーと型チェッカーの両方になる」 — も拒否される。Rigorの型モデル（ADR-1、ADR-3、ADR-20）はRBSを正準契約（contract）として構築されている;rubydexは宣言のみを公開するRust crateを経由してRBSをパースする。ギャップを埋めるには、RigorのキャリアzooをRustで再実装するか、rubydexのFFIサーフェスを拡張して型付きシグネチャをエンドツーエンドで公開する必要がある。どちらもShopifyのロードマップの外からRigorが推進できるプロジェクトではなく、両方ともRigorの既存の実装規律の利点を失う。**ステータスレビュートリガー**: rubydexの「将来計画」が、spec corpusの値束をカバーする型推論レイヤーを出荷した場合、このADRは再開する。

### トラック2 — バックエンド入れ替えを先送り

より狭い質問 — 「Rigorの環境 / 宣言レイヤーを`Rubydex::Graph`上の薄いアダプタとして再実装し、アナライザーはそのまま残せるか？」 — はより興味深く、より擁護可能である。重なりは現実:

| Rigorサーフェス | Rubydex同等物 | 重なり |
| --- | --- | --- |
| [`lib/rigor/analysis/project_scan.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/project_scan.rb) + `Runner#expand_paths` | `Graph#index_workspace` / `#index_all` | **強い** — 両方ともディレクトリを歩き、除外を適用し、`.rb`ファイルをリスト化。 |
| [`lib/rigor/environment/rbs_loader.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/rbs_loader.rb)、[`bundle_sig_discovery.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/bundle_sig_discovery.rb)、[`lockfile_resolver.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/lockfile_resolver.rb) | `Graph#add_workspace_dependency_paths` + `Graph#add_core_rbs_definition_paths` | **強い** — 両方ともBundlerロックされたgemツリー + stdlib RBSを歩く。Rubydexは追加で`rbs` gem用に`Gem.path`検索を介してcore/stdlib RBSをインデックス化。 |
| [`lib/rigor/environment/class_registry.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/class_registry.rb) + [`reflection.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/reflection.rb) | `Graph#declarations` + `Declaration#ancestors` / `#descendants` / `#members` | **強い** — 両方とも「どんなクラスが存在するか + 祖先チェーン」を与える。 |
| [`lib/rigor/inference/scope_indexer.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/scope_indexer.rb)の`#build_declaration_artifacts` | `Graph`のdiscoveryステージ | **部分的** — Rigorはまた、rubydexにはないノードごとのスコープスナップショット（ローカル、`# TYPE:`オーバーライド、宣言型）を生成する。クラスとメソッドの半分は重なる。 |
| `ExpressionTyper#resolve_constant_name`（[`expression_typer.rb:395`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/expression_typer.rb#L395)） | `Graph#resolve_constant(name, nesting)` | **解決アルゴリズムでは強い**、Rigorが追加する優先順位ルール（in-source > RBS、`# TYPE:`オーバーライド付き）では弱い。 |
| [`lib/rigor/cache/`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cache/)（RBS環境、定数テーブル、祖先テーブル — すべてMarshal化、コンテンツアドレス指定） | Rubydexのインメモリグラフ（プロセスローカル、セッションごとに再構築） | **逆の形**。Rigorはプロセスをまたいでキャッシュする（ADR-6に従う）;rubydexはセッションごとのインデックス化が十分に速いのでオンディスクキャッシュは不要と仮定。 |

入れ替えが先送りされる5つの理由（アクション化されない）:

1. **RBSサーフェスが十分には届かない**。Rubydexは`.rbs`ファイルをパースするが、宣言メタデータ（ロケーション、コメント、非推奨化）とパラメータ*形状*（`MethodDefinition#signatures`は名前 / 種別 / ロケーションを返すが、**型ではない**）のみを公開する。Rigorの[`rbs_type_translator.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/rbs_type_translator.rb)は*型付き*メソッド定義 — 戻り型、パラメータ型、分散 — を必要とし、今日はRuby `rbs` gemが`RBS::Environment#method_definitions`経由でそれらを提供する。宣言レイヤーをバックエンド入れ替えしても、rubydexが公開しない型を回復するために、Rigorは依然としてすべての`.rbs`ファイルを`rbs` gem経由で2回目に読むことになる。その二重パースは入れ替えを動機づけるパフォーマンス論拠を打ち消す。

2. **Ractor共有可能性のストーリーが未検証**。ADR-15はRigorをRactorベースの並行モデルにコミットさせる。Rubydexの`Graph`は`extconf.rb`経由でロードされるRust dylibにバックされた不透明ハンドルオブジェクト;Rubyレベルのラッパー（`Declaration`、`Definition`、`Location`）は通常の可変Rubyオブジェクトで、文書化された共有可能性保証はない。rubydexがRactor互換性を文書化するまで、それをバックエンドとして採用することはRigorの並行性設計を待機状態に強制する。

3. **ネイティブビルドのフットプリントはRigorの純Rubyスタンスと矛盾する**。Rigorは今日C / Rust拡張を出荷しない（gemspecには`extensions`フィールドがない;`Makefile`にはネイティブビルドステップがない）。rubydexの採用はそれを変える — Rigorのgemは推移的ネイティブ依存を引き込む。Rubydexは`x86_64-linux` / `x86_64-darwin` / `arm64-darwin` / `aarch64-linux` / `x64-mingw-ucrt`用の事前コンパイル済みバイナリを出荷し、これはほとんどのユーザーをカバーするが、ソースビルドフォールバックは`rust 1.89+`付きの`cargo`を必要とする。Rigorの`flake.nix`はすでに`mkRuby`経由でRustを引き込むので（Ruby 4.0.4がそれを必要とする）、in-flakeビルドパスは動作する;心配はrubydexが事前コンパイルしていないプラットフォーム上の非Nixユーザーと、Rigorの**Ruby 4.0**要件がrubydexの事前コンパイルカバレッジを月単位で先行する可能性のあるRubyバージョン事前コンパイルマトリックス（`lib/rubydex/<ruby_minor>/`下のマイナーごとの`.so`ファイル）。

4. **v0.2.xでのAPI不安定性**。Rubydexの最近のリリースノートは、リリースごとにパブリックRubyサーフェスがメソッドを獲得することを示す（「Ruby APIでXを公開」がv0.2.1 / v0.2.2 / v0.2.3全体で繰り返される）。リポジトリに`CHANGELOG.md`はない;リリースノートはGitHub上にある。アーキテクチャドキュメントは、返されるコレクションの反復順序さえサーバー再起動をまたいで安定でないと警告している。今日rubydexに依存するTapiocaはそのチャーンコストを吸収する、なぜならTapiocaのリリースコーディネーターは同じ組織にあるから。Rigorはそうではなく、アップストリーム変更を非同期に追跡することになる。

5. **Rigorのキャッシュアーキテクチャは同じ力によって引っ張られていない**。ADR-6はRigorのキャッシュを基底のRBS / ソースファイルのコンテンツハッシュでキー付けする;キャッシュされた成果物には`rbs_constant_table`、`rbs_instance_definitions`、`rbs_class_ancestor_table`、`rbs_known_class_names`が含まれる。Rubydexのモデルは「セッションごとに再インデックス、並列で、キャッシュ不要なほど速い」。2つのモデルは独立してはコヒーレントだが、相互に議論を平行線にする: Rigorのキャッシュは繰り返し実行のコールドスタートで勝つ（同じSHAでのCIの`rigor check`）;rubydexの並列性は大規模コーパス上の単一のウォーム実行で勝つ。Rigorのキャッシュレイヤーをrubydexのセッション再構築モデルで置き換えるのは*別の*設計問題 — 「オープンクエスチョン」参照。

総合判定: バックエンド入れ替えは**もっともらしい**がトリガー条件は満たされていない。再評価は次にゲートされる:

| トリガー | 何が変わる |
| --- | --- |
| Rubydexが`1.0.0`に到達し、API安定性の約束を公表 | （4）を除去。 |
| RubydexがRuby API経由で型付きメソッド定義（戻り型 / RBSからのパラメータ型）を公開 | （1）を除去。 |
| Rubydexが`Graph` / `Declaration` / `Definition`のRactor共有可能性を文書化 | （2）を除去。 |
| Rubydexが、Rigorが要求するRubyバージョン用の事前コンパイル済みバイナリを出荷 | 非Nixユーザーの（3）を除去。 |
| Rigorが50k+ LOCプロジェクトで`rigor check`をプロファイルし、宣言 / クラスレジストリ作業を支配的コスト（壁時間の>30%）として特定 | 入れ替えを統合コストに*見合う*ものにする。 |

3つ以上のトリガーが一緒に発火した場合、このADRは`backend:`設定軸（`backend: rigor`（デフォルト）対`backend: rubydex`）の背後にある入れ替え設計を肉付けして再開される。

### トラック3 — 補助ツールとして条件付き承認

Rigorが現在実装していない2つのLSPサーフェスは、rubydexが構築されたまさにその形である:

- **`textDocument/definition`** — 「この定数 / クラスが宣言された場所へジャンプ」。Rubydexの`Graph#[fqn]`は`Declaration`を返し、それはすべての貢献する`Definition`のロケーションを運ぶ。定数参照は完全に追跡される。
- **`textDocument/references`** — 「この定数が使われるすべての場所を探す」。Rubydexの`Graph#constant_references`は型付き逆引きインデックスを返す。
- **`workspace/symbol`** — ファジーグローバルシンボル検索。`Graph#search(query)`はまさにこれ。

[今日のLSP](https://github.com/rigortype/rigor/blob/master/lib/rigor/language_server/server.rb#L97)はhover / completion / signatureHelp / documentSymbol / foldingRange / selectionRangeを実装する（ADR-19 / スライス（slice）6に従う） — すべて**ファイルごとの**クエリ。上記の3つは未実装で、Rigorの[`ScopeIndexer`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/scope_indexer.rb)が構築しないクロスファイル宣言インデックス（ノードごとのスコープスナップショットは捨てる状態であり、永続インデックスではない）を必要とする。

最も摩擦の少ないパスは**オプションのLSPケイパビリティプロバイダ**で、ユーザーがrubydexをインストールしていれば読み込み、上記3つのハンドラを公開し、それ以外はRigorのネイティブLSP実装に委ねる。具体的に:

- 新しいオプション依存: rubydexは`rigortype.gemspec`に**追加されない**。3つの能力が欲しいユーザーは自身のGemfileに`gem "rubydex"`を追加し、RigorのLSPはロード時にその存在を検出する（`begin; require "rubydex"; rescue LoadError; end`）し、ロードされた場合のみ対応するハンドラを登録する。
- 新しいモジュール: `lib/rigor/language_server/rubydex_provider.rb`はオプションの統合をカプセル化する。今日ファイルは存在しない;このADRは設計の事前コミットメント。
- 境界: rubydex `Graph`はLSPセッションごとに1度構築される（`ProjectContext`の寿命に一致）、`workspace/didChangeWatchedFiles`で無効化される。ファイルごとの変更はバッファテーブルを使う;rubydexはディスクにコミットされたコンテンツのみを見る、Tapiocaの消費パターンと同じ。
- 診断: ユーザーが能力を要求したがrubydexがロードされていない場合、起動時に`language_server.rubydex.unavailable`通知が1度発火する。

これはトラック2（バックエンド入れ替え）と**同じではない**:

- アナライザーの主要パスを変更しない。
- Rigorがrubydex経由でRBSを読むことを要求しない。
- rubydexをRigorのランタイム依存グラフに引き込まない。
- Ractor並行性設計の影響範囲に入らない（LSPはメインスレッドで動作する;rubydexはアナライザーのワーカープールの中ではなく、隣に座る）。

第2の小さなユースケース: **`rigor check <path>`の依存グラフファイル選択**。今日`rigor check lib/foo.rb`は正確に1つのファイルを解析する。自然な拡張は「`foo.rb`と推移的にrequireするすべてを解析」。Rubydexの`Graph#resolve_require_path(path, load_paths)`は呼び出しごとの解決を行う;グラフ走査は**出荷しない**。実際の推移的requireクエリを構築するには、その上に薄いRubyループが必要になる。**判定**: 具体的なユーザー需要が表面化するまでこれをキューする。能力は素敵だが、今日は推測的。

ユーザープロンプトで浮上した3番目のオプション — **診断配置のためのrubydexの定数クロスリファレンスを使用**（例: 「この定数は17箇所で参照されている;ナローイングされた型は行Nで保持される」） — は同じ条件付き承認バケットに入る。今日Rigorが持たない機能のブロックを解除し、推論エンジンと競合せず、トラック2のトリガーでブロックすべきではない。

## 重なりマトリックス

クイックリファレンス用（トラック2の「先送り」判定と下記のオープンクエスチョンから参照される）:

| Rigor機能 | Rubydexのカバレッジ | 判定 |
| --- | --- | --- |
| プロジェクトファイル発見 | 完全 | 重なる;単独では入れ替えに値しない |
| Bundle / Gemfile-ロックされたgem発見 | 完全 | 重なる;単独では入れ替えに値しない |
| Core / stdlib RBSパス発見 | 完全（bundleとは独立） | 重なる;Rigorの[`bundle_sig_discovery.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/bundle_sig_discovery.rb)はより設定可能 |
| RBSクラス / モジュール / メソッドの*宣言*抽出 | 完全 | 重なる |
| RBSメソッド*型*抽出（戻り型、パラメータ型、分散） | **なし** | Rigorは型のために自身のRBSパースを保たなければならない |
| In-sourceクラス / モジュール発見 | 完全（宣言） | 重なる |
| In-sourceメソッドボディ推論（戻り型計算） | なし | Rigor独占 |
| 定数ルックアップ（Ruby優先順位を尊重） | 完全 | 重なる;Rigorはin-source > RBS優先順位 + `# TYPE:`オーバーライドを追加 |
| 定数クロスリファレンス（定数のfind-references） | 完全 | **rubydexが埋めるRigor独占ギャップ** |
| 祖先チェーン / 線形化 | 完全 | 重なる |
| ミックスイン（`include` / `prepend` / `extend`）追跡 | 完全 | 重なる |
| ローカル変数型追跡 / クロージャキャプチャ | なし | Rigor独占 |
| 制御フローナローイング | なし | Rigor独占 |
| メソッドディスパッチ解決（型付き） | なし | Rigor独占 |
| 合成メソッド基板（ADR-16） | なし | Rigor独占 |
| Monkey-patch事前評価（ADR-17） | なし | Rigor独占 |
| 軽量HKT（ADR-20） | なし | Rigor独占 |
| Sorbet sigインジェスト（ADR-11） | なし | Rigor独占（プラグイン） |
| クロスプラグインファクトストア（fact）（ADR-9） | なし | Rigor独占 |
| 依存ソース推論（ADR-10） | なし | Rigor独占 |
| Sig-gen（ADR-14） | なし | Rigor独占 |
| 永続オンディスクキャッシュ（ADR-6） | なし（セッション再構築） | Rigor独占 |
| LSP `textDocument/hover`（型付き） | 部分的（宣言のみ;推論された型なし） | 型付きの半分でRigor独占 |
| LSP `textDocument/definition`（定数） | 完全 | **Rigorのギャップ** |
| LSP `textDocument/references`（定数） | 完全 | **Rigorのギャップ** |
| LSP `workspace/symbol` | 完全 | **Rigorのギャップ** |
| AIエージェント用MCPサーバー | 完全（別個のRustバイナリ） | Rigorのミッションに直交 |

テーブルを読む: rubydexはスタックの**下半分**をカバーする（宣言発見、名前解決、クロスファイル定数参照） — 「何が存在するか」レイヤー。Rigorは**上半分**をカバーする（型付き推論、ナローイング、ディスパッチ、プラグイン拡張セマンティクス） — 「この式の型は何か」レイヤー。重なりはちょうど2つの半分の間の境界;両方のプロジェクトがその境界を独立して実装し、それを越えるプロジェクトごとのコストは非自明。

## 検討された代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| Rigorをrubydexの上に書き直し（`lib/rigor/environment/` + `lib/rigor/analysis/project_scan.rb`を削除し`Graph`クエリとして再実装） | 拒否 | トラック2の（1）〜（5）の完全なコストを負う;現在のプロファイルデータに従えばRigorのホットパスではない宣言発見レイヤーで非自明な高速化を得る。 |
| rubydexの`Graph`データモデルをRubyにベンダー（API形のために純Rubyで再実装、Rustバックエンドをドロップ） | 拒否 | アップストリームが所有する努力を複製;パフォーマンスのアップサイドなしにAPI不安定性リスクを再インポート;アップストリームより後でRigor自身のコードより後の半機能を生成。 |
| rubydexを`rigortype`のハードランタイム依存として追加 | 拒否 | ユーザーのサブセットだけが望む機能のためにすべてのRigorインストールにネイティブ依存を引き込む;Rigorがコミットするサポートプラットフォームマトリックスを拡張。 |
| RBSメソッド型を公開するためにrubydexへの上流変更を提案 | キュー（情報的） | トラック2のトリガーが（1）の周りにクラスタ化する場合は提案する価値がある。Rigorの貢献は小さなRuby PRではなく、`ruby-rbs`統合へのRust側のパッチ — 実質的なスコープ。 |
| rubydexをフォークし型付きRBS抽出を追加 | 拒否 | Shopifyが所有するRustワークスペースをフォークすると、Rigorが妥当に負えないメンテナンス負担が発生。 |
| Rigor自身のAI統合のためにrubydexのMCPサーバーパターンを採用 | スコープ外 | Rigorには現時点でAIエージェント統合の方針はない。1つが現れたら、[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md)規律を参照。 |

## 作業上の決定

### WD1 — なぜ「拒否」または「承認」ではなく「評価」ステータスなのか？

3つのサブ決定は異なって着地する（拒否 / 先送り / 条件付き承認）。単一のステータスは過剰に単純化するか（3つすべてを「拒否」とラベル付けし、トラック3の条件付き承認を失う）、過剰にコミットする（基礎質問が決定的にノーであるとき「承認」とラベル付け）。ADRスタイルの先例（ADR-13は2つの関連機能を1つのステータスでカバーする;このADRは3つを1つのステータスでカバーする）に従い、アンブレラステータスはメタ決定を記録する: **質問は決着している、ここに形がある**。

### WD2 — なぜ戦略的フレームについて言及するのか？

ユーザープロンプトは「rubydexはRigorの実装を置き換える価値があるか？」を尋ねた。答え「いいえ、しかし……」は、プロジェクトが1つに統合**すべきでない**理由を名指さなければ完全ではない。§ 決定の戦略的フレーム — 「Rubydexは普遍的なインデクサーであり、Rigorはそれから消費すべきで、それになるべきではない」 — は耐久的な主張。それがなければ、すべての将来の「rubydexをそのまま使えばいいのでは？」会話が同じ結論を第一原理から再導出する。それがあれば、会話はテーブルから始まり、トリガーごとに更新する。

### WD3 — なぜトラック3は今アクション化されないのか？

2つの理由: (a) ADR-19はLSPを`rigortype`にバンドルされた形にコミットさせた;rubydexを*オプションの*サイドカーとして追加することはその形を尊重する。（b）3つの未実装LSP能力（`definition`、`references`、`workspace/symbol`）はv0.1.xロードマップにない。LSPロードマップがそれらの1つにコミットしたとき、rubydexプロバイダは並列実装スライスとして着地する;それまでは、プロバイダを事前に設計するのは時期尚早。

### WD4 — なぜこのADRと並んでPoCコミットがないのか？

プロジェクトの典型的なADRフローに従い（ADR-11 / ADR-13 / ADR-15 / ADR-16 / ADR-17 / ADR-18 / ADR-20はすべて実装に先立つproposedステータスのADR）、実装スライスはADR承認に従う。proposedステータスがここでの作業成果物;PoCは、トリガーがまだ正当化されていないと言う統合作業にRigorをコミットさせる。

### WD5 — なぜこれは`Plugin::Base`拡張ではないのか？

トラック3 — 統合をアクション化する唯一のトラック — はアナライザープラグインではなくLSPケイパビリティプロバイダ。ADR-2に従うプラグインは推論に貢献する;rubydexプロバイダは*エディタサーフェス*に貢献する。命名規則はADR-19のファミリープレフィックスに従う;プロバイダがv0.xトリガー条件下で独自のgemに抽出される場合、gem名`rigor-lsp-rubydex`は既存の`rigor-*`パターンに一致する。

### WD6 — このADRはRigorをRuby 3.2互換性退行にコミットさせるのか？

いいえ。Rubydexは`>= 3.2.0`を必要とする;Rigorは`>= 4.0.0`を必要とする。最小バージョンはフロアで一致する（4.0 ≥ 3.2）。トラック2の理由（3）下でフラグされた懸念は*Ruby 4.0用の事前コンパイル済みバイナリカバレッジ*であり、バージョン範囲互換性ではない。Rubydexのローダーは`require "rubydex/#{ruby_version}/rubydex"`を行う;rubydexが`lib/rubydex/4.0/rubydex.so`を出荷するまで、Ruby 4.0ユーザーはCargoフォールバックに当たる。これは非Nixユーザーの摩擦点であり、決定的な障害ではない。

### WD7 — rubydex自体が型推論を追加した場合は？

ブログ記事はこれを将来の作業として列挙している。それが着地し、型推論レイヤーが:

- Rigorのspec corpus（`docs/type-specification/`）の作者と同じ値束をターゲットにする、
- Ractor共有可能APIを公開する、
- RBS / RBS::Inline / RBS::Extendedの3つを扱う、

そのとき、トラック1の拒否決定は再開する。3つすべてが、Rigorのspecへの破壊的な妥協を強制せずに着地する可能性は低い — Rigorのspecはrubydexが拘束されない設計選択をする（ADR-5に従う非対称な堅牢性原則、3値の確実性、`Dynamic[T]`代数）。現実的な予測: rubydexはShopify内部のツールチェーンのニーズ（Tapioca形、Sorbet互換）にスコープを絞った型推論を追加し、Rigorのspec拡張はそのスコープの外にとどまる。その場合、トラック1の判定が保たれる。

## オープン質問

- **RBS二重パースコスト**。トラック2がいつか発火した場合、Rigorの`RbsLoader` + rubydexのRBSインデックス化が両方とも同じ`.rbs`ファイルを読むことで、計測可能な壁時間税が生じるか、コストはノイズに消えるか？ バックエンド入れ替え実装の前にベンチマークスライスの価値がある。

- **キャッシュ無効化の相互作用**。RigorのADR-6キャッシュは上流ファイルのコンテンツハッシュで成果物をキー付けする。将来のrubydexプロバイダもキャッシュする場合（今日はメモリ内のみだが、v0.xでオンディスクの可能性あり）、2つのキャッシュは歩調を合わせて無効化されるか、それとも1つの古いエントリーが静かな乖離を引き起こすか？ トラック3のプロバイダがLSPの読み取り専用パスを超えて成長する場合、設計が必要。

- **クロスプラグインファクトストアとrubydexファクトの構成**。ADR-9のクロスプラグインファクトストアは、プラグインが他のプラグインが消費する型付きファクトを公開できるようにする。rubydex宣言がファクトチャネル（例: `:rubydex_declarations`）になる場合、既存のプラグインはそれらに対して構成するか、それともファクト契約を広げる必要があるか？

- **TapiocaスタイルのRBI消費の整合**。[ADR-11 §「スライス4 — RBIディレクトリウォーカー」](../11-sorbet-input-adapter/)はRigorの自身のウォーカー経由で`sorbet/rbi/**/*.rbi`を読む。`rigor-sorbet`がいつかrubydexをロードする場合、RBIウォークはrubydexの`index_all([rbi_path])`に委譲し、結果のグラフを代わりに消費できるか？ おそらくyes;`rigor-sorbet`のスライス4実装者がそれを提起するまで先送り。

- **定数参照のフローファクトへの貢献**。Rubydexは定数参照を「完全に」追跡する。ユーザーが`FOO = X.bar; ...; FOO.baz`を代入する場合、rubydexの参照インデックスは2番目の使用サイトを表面化する。Rigorのナローイングはローカル変数型キャリー経由でこれをすでに処理する;質問は、2つの解析が不一致する可能性があるか、もしそうならどちらが勝つかである。RBS-winsの先例（ADR-1、ADR-11 WD3）に従い、Rigorは型を持つ主張で勝つ;rubydexはロケーションを持つ主張で勝つ。不一致境界はクリーンに保たれるべき。

- **`rigor sig-gen`（ADR-14）はrubydexのGraphを消費すべきか？** トラック2が発火した場合、sig-genの「このプロジェクトのすべてのメソッドを見つける」プレパスは`Graph#declarations`クエリになる。それまで、sig-genには自身のウォーカーがある;切り替えは正当化されたときに機械的。

- **rubydexの`Diagnostic{rule, message, location}`のRigor類似物は何か？** Rigorの診断分類法（[`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/)に従う）はより豊か（ルールごとの深刻度プロファイル、抑制マーカー、プラグイン来歴）。トラック3のLSPプロバイダがrubydexの整合性失敗診断をエディタに表面化する場合、プレフィックスファミリーは`language_server.rubydex.*`（ADR-2 §「プラグイン診断来歴」に従う）。

## 再評価トリガー

このADRは次のときにレビューされる:

| トリガー | 何に向けて再評価 |
| --- | --- |
| Rubydexが`1.0.0`に到達し、API安定性の約束を公表 | トラック2のバーを下げる。 |
| RubydexがRuby API経由で型付きRBSメソッド定義（戻り型、パラメータ型）を公開 | トラック2のバックエンド入れ替えがRBSコストでネット陽性になる。 |
| Rubydexが`Graph` / `Declaration` / `Definition`のRactor共有可能性を文書化 | ADR-15のトラック2へのブロッカーを除去。 |
| Ruby LSPの[PR #4103](https://github.com/Shopify/ruby-lsp/pull/4103)が着地し、2つのマイナーLSPリリースをまたいで着地したままにとどまる | APIが実際に安定していることを確認;（4）を下げる。 |
| Rubydexが`lib/rubydex/4.0/rubydex.so`の事前コンパイル済みバイナリを出荷 | 非NixのRigorユーザーの摩擦を除去。 |
| RigorのLSPロードマップが`textDocument/definition` / `textDocument/references` / `workspace/symbol`にコミット | トラック3をアクション化。 |
| Rubydexがspec束（ADR-1）をターゲットとする型推論エンジンを出荷 | トラック1を再開。 |
| ユーザー側のベンチマークが、実プロジェクトでRigorの宣言 / クラスレジストリ作業が`rigor check`壁時間の30%を超えることを示す | トラック2をアクション化。 |

期待: **v0.1.xではトリガーは発火しない**。トラック3のアクションの現実的な時期はv0.2.x — ADR-19の「再評価のためのトリガー条件」に結合される。トラック2の時期はv0.3.xまたはそれ以降。

## 結果

**ポジティブ**

- Rigorの設計は、rubydexを採用するかどうかについてもはや曖昧ではない。将来の「rubydexをそのまま使えばいいのでは？」会話はこのADRに対して解決する。
- 戦略的フレーム（「インデクサー対推論エンジン」）が1度書き留められる。LSP能力、クロスプラグインファクト、sig-genスコープなどに関する将来のADRの議論を境界する。
- トラック3パスは、バックエンド再プラットフォーム化にコミットせずに、LSP機能のためにrubydexのベストインクラスの定数参照インデックス化を採用するドアを開けたままにする。

**ネガティブ / コスト**

- 決定は部分的に上流のロードマップに依存する。rubydexがRigorの予測より先に型推論エンジンを出荷した場合、トラック1が再開する — そしてRigorはそれが気付かれるまで古い前提で動作することになる。
- PoCなしは、トラック2下の統合摩擦推定が理論的であることを意味する。将来の実装者が、ADRが予期しなかった実際のブロッカーを発見する可能性がある。

**中立**

- 今日診断を発行しないが、トラック3用に予約された新しい診断ファミリープレフィックス`language_server.rubydex.*`を追加。
- 予約だが空のディレクトリリストに`plugins/rigor-lsp-rubydex/`を追加。トラック3がアクション化されたとき、[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md) SKILLがスキャフォールドをカバーする;このADRはコードを事前著作しない。

## リビジョン履歴

- 2026-05-19 — 初回提案。ユーザーが`Shopify/rubydex`がRigorの実装基礎を置き換えるべきか、置き換え可能なバックエンドになるべきか、補助ツールとして機能するか、先送りされるべきかを評価するように要求したことが発端。解決: 3部の決定（基礎を拒否、バックエンドを先送り、ツールを条件付き承認）プラス書かれた再評価トリガー。
