---
title: "Current Work — Inference Engine Checkpoint"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "d0b747e85b34a47b60b1400bc766f815fe877310e242bccb27965a3f2279967f"
sourceCommit: "a7f0405346ea5833580c50f3610ccb0b97fea2d8"
translationStatus: "translated"
sidebar:
  order: 9050
---

これは長い実装スレッドをレビュー可能なチャンクに分割するための一時的なブックマークです。**規範的な**契約とスライスロードマップは[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります。リリースごとのコミットメントエンベロープは[`docs/MILESTONES.md`](../milestones/)にあります。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / マイルストーンが拘束力を持ち、このファイルは古くなっています。

## ステータス

**v0.1.2リリース済み**。v0.1.2の全トラックが着地し、バージョンカット完了。スライスごとのまとめは`CHANGELOG.md` § `[0.1.2]`と`docs/MILESTONES.md` §「v0.1.2 — 計画中」にあります。

**v0.1.3進行中、リリース保留中**。テーマ: **[ADR-10](../adr/10-dependency-source-inference/)をエンドツーエンドで提供（`mode: :full`下のスライス5cバウンダリクロスを含む）、ADR-11 / Railsプラグインフェーズ作業を吸収、ADR-13をランディング、ADR-14のsig-genセルフドッグフードギャップをクローズする**。コミットされたすべてのトラックがクローズ;v0.1.3のコミットメントは延期されていない:

- **ADR-10完全実装済み**。5スライスエンベロープ（設定配管 → ウォーカー + ディスパッチャーティア → キャッシュディスクリプター → gemごとの予算 → ドキュメント）+ 5つすべての「オープンクエスチョン」フォローアップ（5aレシーバーごとのプラグイン拒否権 / 5b β予算セマンティクス / 5c `mode: :full`下のバウンダリクロス診断 / 5d設定競合診断）。スライス5c（バウンダリクロス）は今セッションでクローズ。
- **ADR-11（rigor-sorbet）一次サーフェス完了**。スライス1〜6 + 8、加えて軽量フォローアップ（`T.must_because`、`T.reveal_type`、`T.assert_type!`、`T.bind`、`enforce_sigil`のファイルごとのゲーティング）。コールサイトごとのアサーションゲーティングのみ残る。
- **PHPStanスタイルのType-Specifying Extensions基板着地**。`Inference::StatementEvaluator#apply_plugin_assertions`がプラグイン側の`truthy_facts` / `falsey_facts` / `post_return_facts`をナロイングエンジンに配線;ADR-7 §「スライス4-A」のプラグイン半分を閉じる。
- **Rails Tier 2エコシステム完了**。`rigor-actionpack`（4フェーズ）、`rigor-factorybot`（フェーズ1 (a)+（c））、`rigor-activerecord`（ADR-9経由で`:model_index`を公開）。ADR-9をエンドツーエンドで実証する最初の「公開-消費」サイクル。
- **[ADR-13](../adr/13-typenode-resolver-plugin/)（プラグインTypeNodeリゾルバ + TSユーティリティ型アダプター） — 全スライスが着地（1〜7、3bを含む）**。マニフェストフック + レジストリ集約付きの新しい`Rigor::Plugin::TypeNodeResolver`拡張ポイント。パーサーがインラインスキャン+解決から「ASTへスキャン」+兄弟の`Resolver`パスにリファクタリング。`Type::Combinator`上の5つのRigor正準シェイプ射影型関数（`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`） — フェーズAはHashShape、フェーズBはTuple、述語`shape_projection_lossy?`はスライス3bで射影著作サイトで消費される。`examples/`下の新しいオプトイン`rigor-typescript-utility-types`プラグインがTSスペル（`Pick`、`Omit`、`Partial`、`Required`、`Readonly`）をコア関数にマップ。**スライス3b**はすべての解析器側`RbsExtended.read_*`呼び出しサイト（`Analysis::CheckRules`、`Inference::StatementEvaluator` / `Narrowing` / `MethodParameterBinder` / `MethodDispatcher::OverloadSelector` / `MethodDispatcher::RbsDispatch`）に`name_scope:` / レポーターを通し、2つの新しい`:info`診断ファミリーを配線: `dynamic.rbs-extended.unresolved`（ペイロード全体の解決失敗）と`dynamic.shape.lossy-projection`（非シェイプキャリアに適用された射影）**。スライス7**はハンドブックのTypeScript付録更新をランディングし、5つのマップ型行（`Readonly` / `Partial` / `Required` / `Pick` / `Omit`）が「（対応なし）」ではなくオプトインプラグイン + マッチするコア関数を指すようにする。
- **ハンドブック拡張**。第7章に`@phpstan-assert`対応表を追加;第10章（rigor-sorbet）が新しいsorbet認識器すべてをカバー;TypeScript付録がオプトインの`rigor-typescript-utility-types`プラグインとRigor正準シェイプ射影関数を並べて命名。
- **ADR-14 sig-genセルフドッグフードギャップ（c） / (d) / （e）クローズ**。`Writer#render_new_file`は今、ネームスペースツリーを構築し、フラットな兄弟を発行する代わりに、厳密接頭辞の子クラスを親ブロック内にネストする;`Writer#merge_class_shells`は`update_existing`パスで最も近い既存の祖先に欠落した`Const = Data.define(...)` / `Struct.new(...)`シェルを注入する。`Generator#walk_defs`はRHSが`Data.define` / `Struct.new`である`Prism::ConstantWriteNode`を認識し、新しい`MethodCandidate#class_shells`スロットを介してあらゆる候補に完全修飾された定数名を通す。`Inference::ExpressionTyper#block_return_for`は`SymbolNode`を運ぶ`Prism::BlockArgumentNode`を、期待されるブロックパラメーター型上でシンボルをディスパッチして扱う — `Hash#transform_values(&:freeze)`は今、`Enumerator[...]`ではなくブロック持ちのオーバーロード経由でルーティングされ`Hash[K, V]`を返す。
- **rigor-sorbet — コールサイトごとのアサーションゲーティングクローズ**。新しい`Rigor::Scope#source_path`スロット（`Analysis::Runner#analyze_file`でファイルごとに一度設定され、すべての`with_*`再ビルド + `build_joined_scope` + `with_source_path`ビルダーを通じて伝播）により、プラグインフックがスレッドローカルなしに「この呼び出しサイトはどのファイルに属するか？」を解決できる。rigor-sorbetは今、ハーベスト中にファイルごとのsigilを`@sigil_by_path`にキャッシュする;`flow_contribution_for`は`assertion_enforced_here?(scope)`を介してアサーション認識器パスをゲートし、`T.let` / `T.cast` / `T.must` / `T.bind` / `T.assert_type!` / `T.reveal_type`はSorbet自身が強制するファイル（`# typed: true` / `:strict` / `:strong`）でのみ発火する。既存の`enforce_sigil: false`オプトアウトは、機能前の動作に依存していたユーザーのためにゲートを完全に開いたままにする。
- **`RBS::Extended` Symbol / Stringリテラルトークン + リテラルユニオンクローズ**。3つの新しい`TypeNode` ASTノード（`SymbolLiteral` / `StringLiteral` / `Union`）プラスパーサー追加（`SYMBOL_LITERAL` / `STRING_LITERAL`正規表現 + `parse_single_type_arg_ast` + `|`によるリテラルユニオン折り畳み）により、`pick_of[T, :a | :b]` / `Pick[T, "a" | "b"]`が`ImportedRefinements.parse`を経由してエンドツーエンドで往復する。リゾルバは各リテラルノードを`Type::Constant<value>`に変換し、ユニオンノードを`Type::Combinator.union`で折り畳む。ADR-13スライス6の統合specはもはやリテラルキーペイロードのために合成ASTのワークアラウンドを必要としない。
- **`Method`キャリア（`Type::BoundMethod`）クローズ**。`Object#method(:sym).call`が今、完全な精度で往復する: 前方折り畳みは呼び出しを`BoundMethod[receiver_type, method_name]`に持ち上げる;後方折り畳みは`.call` / `.()` / `[]`をバインドされたペア上の再帰ディスパッチに書き換えるので、各ティア（定数折り畳み、シェイプディスパッチ、RBS、プラグイン貢献）が元の呼び出しサイトを見る。`[:to_i, :to_f, :to_sym].map { |m| "1".method(m).call }`は`Tuple[Constant<1>, Constant<1.0>, Constant<:"1">]`に推論される。`RbsDispatch.receiver_descriptor`は`BoundMethod`レシーバーを`Nominal[Method]`としてフォールスルーするため、反射的なMethodメンバー（`#owner` / `#name` / `#arity`）は引き続きRBS経由で解決される。
- **ADR-10スライス5c（`mode: :full`下のバウンダリクロス）クローズ**。`Index#mode_for(class_name)` / `#full_mode?(class_name)`が`class_to_gem` + Builderが各`Resolved#mode`から通す新しい`gem_modes`テーブルをチェーンすることで、クラスごとのモード認識を公開。RBSディスパッチが呼び出しを解決した後、`MethodDispatcher`はレシーバーが`mode: :full` gemに属しANDそのgemのソースカタログが同じ`(class_name, method_name)`を持つたびに、新しい`Environment#boundary_cross_reporter`経由で`dynamic.dependency-source.boundary-cross`イベントを記録。RBSが引き続きディスパッチ結果で勝つ — `:info`診断は純粋に助言的で、`(class_name, method_name, gem_name)`ごとに重複除去される。Runnerは実行終了時にレポーターをドレインする。

**`examples/`下に19の動作プラグイン例が着地**（ADR-13以前の18の例 + `rigor-typescript-utility-types`）。比較表は[`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md)を参照。

### ADR-13スライスごとのまとめ

1. ✅ **スライス1**（`0c21632`） — `Rigor::TypeNode::Identifier` / `Generic`値オブジェクト。ドリフトスナップショットがピン留め。
2. ✅ **スライス2**（`5c1e94b`） — `Plugin::TypeNodeResolver`基底クラス、`Plugin::Manifest#type_node_resolvers`、`Plugin::Registry#type_node_resolvers`集約者。
3. ✅ **スライス3**（`ec45a10`） — パーサーリファクター（AST + Resolverパス）、`TypeNode::IntegerLiteral` / `IndexedAccess` / `NameScope` / `ResolverChain`。スライス2の動作を保持する`nil`デフォルト付きの`ImportedRefinements.parse(payload, name_scope: nil)`。
4. ✅ **スライス4**（`6ce544c`） — フェーズA: HashShape上の`Type::Combinator.pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`。`PARAMETERISED_TYPE_BUILDERS`が5行成長。
5. ✅ **スライス5**（`9249c67`） — フェーズB（Tuple）;`shape_projection_lossy?(type)`述語。
6. ✅ **スライス6**（`4f00db6`） — `rigor-typescript-utility-types`プラグイン + リゾルバスコープハンドル修正（`NameScope#resolver`は今、完全なResolverを指すため、プラグイン作者はビルトイン + チェイン + RBSフォールバックを通じてサブ引数を再帰的に解決する）。
7. ✅ **スライス3b** — `RbsExtended`からの呼び出し側スレッディング + レポーターアキュムレータ + 2つの新しい`dynamic.*`診断。`Rigor::RbsExtended::Reporter`が実行ごとのアキュムレータ（`unresolved_payloads` / `lossy_projections`）;`Environment`はスレッディングのために`name_scope`（`plugin_registry.type_node_resolvers`から構築）と`rbs_extended_reporter`を公開。すべての解析器表面の`RbsExtended.read_*`呼び出しサイトが`environment:`を渡す。Runnerは実行終了時にレポーターを`dynamic.rbs-extended.unresolved`と`dynamic.shape.lossy-projection``:info`診断にドレイン。
8. ✅ **スライス7** — ハンドブックのTypeScript付録更新。5つのマップ型行（`Readonly` / `Partial` / `Required` / `Pick` / `Omit`）が今、オプトインの`rigor-typescript-utility-types`プラグインとマッチするコア関数を命名;移行ビネットがプラグイン提供の`%a{rigor:v1:return: Pick[T, K]}`アノテーション例を含む。

**v0.1.0 → v0.1.2リリース済み**。スライスごとのまとめは`CHANGELOG.md`（§ `[0.1.0]`、`[0.1.1]`、`[0.1.2]`）と`docs/MILESTONES.md`にあります。`target_ruby`ファントム設定修正と[`spec/rigor/analysis/runner_spec.rb`](https://github.com/rigortype/rigor/blob/main/spec/rigor/analysis/runner_spec.rb)「ランタイムでの設定配線（監査ガード）」下の実行時監査ガードスペックブロックはv0.1.1バッチ中に着地し、引き続き有効です。

## 作業が再開される場所

### v0.1.3エントリーパス

v0.1.3の4つの主要トラックがクローズ; **ADR-13のスライス1〜7すべてが`master`にランディング**。ADR-13形のものは延期されていない:

- **ADR-10**: 5スライスエンベロープ + すべての「オープンクエスチョン」フォローアップ（5aレシーバーごとのプラグイン拒否権、5b β予算セマンティクス、5c `mode: :full`下のバウンダリクロス、5d設定競合）すべて着地。
- **ADR-11（rigor-sorbet）**: スライス1〜6 + 8 + 軽量フォローアップすべて着地。コールサイトごとのアサーションゲーティングのみ残る。
- **Railsエコシステム（Tier 2）**: rigor-actionpack 4フェーズ + rigor-factorybotフェーズ1 (a)+（c）すべて着地。ADR-9クロスプラグインチェーンが`:helper_table`（rails-routes → actionpack）と`:model_index`（activerecord → actionpack + factorybot）でエンドツーエンドで証明された。
- **ADR-13**: スライス1〜7（3b含む）すべて着地 — コア機構、オプトインプラグイン、呼び出し側診断スレッディング、ハンドブックTypeScript付録更新。

次のセッションでできること:
1. **リリースカット**（[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従って`bundle exec rake release`、明示的なユーザー承認待ち）。v0.1.3は実質的な作業を蓄積し、すべてのコミットされたトラックがクローズされている。
2. **延期キュー項目を継続する**:
   - Tier 3エコシステムプラグインの残り: `rigor-graphql`、`rigor-activestorage`。
   - rigor-activerecord拡張: アソシエーション、列挙型、スコープ、バリデーション、コールバック。
   - gemソースからの呼び出しごとの戻り値型精度（ウォーカー拡張;それまで`mode: :full`はバウンダリクロス診断のみを貢献）。
3. **新エコシステム作業**: ADR-12候補プラグイン（[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)に従ったdry-rbアダプター）。

### Railsエコシステムプラグイン（並行実行トラック）

Railsプラグインファミリーはv0.1.xコア作業と並行して継続しています。フルプランは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。作成は**1セッションにつき1プラグイン**の形式で`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。

`examples/`に着地済み（`master`に未リリース）:
- **Tier 1**: `rigor-rails-routes`、`rigor-rails-i18n`、`rigor-actionmailer`、`rigor-activejob`。
- **Tier 2**: `rigor-actionpack`（4フェーズ — ルートヘルパー / フィルターチェーン / レンダーターゲット / ストロングパラメーター → ARカラム検証）;`rigor-factorybot`（フェーズ1 （a）自立型バリデーション + フェーズ1 (c) ARカラム相互チェック）;`rigor-activerecord`（下流コンシューマー向けの`manifest(produces: [:model_index])` ADR-9公開付き）。
- **Tier 3**: `rigor-pundit`、`rigor-sidekiq`、`rigor-rspec`、`rigor-actioncable`。

保留中Tier 3: `rigor-graphql`、`rigor-activestorage`。`rigor-sorbet`プラグイン（ADR-11;スライス1〜6 + 8 + 軽量フォローアップ着地）はRailsトラックと並行。`rigor-typescript-utility-types`プラグイン（ADR-13スライス6）はRailsトラックと直交 — フレームワーク固有の呼び出しパターンではなく型言語の語彙サーフェスを拡張する。`rigor-activerecord`拡張（アソシエーション、列挙型、スコープ、バリデーション、コールバック）は0.2.0+マイナーバンプとして出荷。

## オープンエンジニアリング項目

v0.0.xスライスを通じて浮かび上がった永続的な項目で、次の実装者がフルスレッドを再読することなく見ておくべきもの。v0.1.1にすでに吸収された項目はここで再説明するのではなくMILESTONESを通じて参照されます。

1. ~~**Cボディクラシファイアーの間接ミューテーター**。~~ v0.1.2でクローズ — 抽出器のシードが、ボディで凍結チェック（`str_modifiable`、`rb_struct_modify`、`range_modify`、`rb_class_modify_check`など）を発行する`_modify` / `_modifiable`命名のヘルパーもマッチするようになりました。カタログ再生成により`String#replace` / `String#initialize_copy` / 複数のStringビックリメソッド / `Range#initialize` / `Range#initialize_copy`が`mutates_self`に切り替わります。最初の引数の形式パラメーターに対する推移的閉包アプローチが検討されましたが差し戻されました — 最初の引数が形式であるにもかかわらずヘルパーが実際にはそれをミューテートしない関数での過剰分類。クラスごとのブロックリストが残りのケース（Time / Setヘルパー）を吸収し続けます。
2. ~~**`RBS::Extended`グラマーにSymbol / Stringリテラルトークンがない**。~~ **クローズ**。`ImportedRefinements::Parser`は今、型引数位置内の`:name`と`"name"`、加えてそれらのリテラルの`T1 | T2`ユニオンを認識する。3つの新しいASTノード（`TypeNode::SymbolLiteral` / `StringLiteral` / `Union`）が`Type::Constant` / `Type::Union`キャリアとしてリゾルバパスを流れる。`Pick[T, :a | :b]` / `pick_of[Shape, "a" | "b"]`が今、`ImportedRefinements.parse`を通じてエンドツーエンドで往復する。
3. **sig-genの`update_existing`がまだ親 / 子クラスブロックの兄弟を畳み込まない**。ギャップ（c）のツリービルダー修正は`Writer#render_new_file`（新規作成パス）に存在する。既存のターゲットファイルを更新する際、`merge_class`は依然として各候補の`class_name`を独立して解決する — `Foo::Bar`と`Foo::Bar::Child`の両方の宣言がフラットな兄弟としてすでに存在する場合、sig-genはそれらをフラットなままにする。既存のファイルをネスト型レイアウトに再フローするには既存の宣言ツリーをパースして書き換える必要があり、フォローアップ修正のスコープ外。正準のネスト型レイアウトを望むユーザーはゼロから再生成する（ターゲットsigファイルを削除して再実行）。
4. ~~**ADR-14フォローアップ: 種類追跡 + `module_function` + ネスト型クラス発行**。~~ **5つのサブ項目すべてクローズ**。3ラウンド目の`lib/rigor/analysis/`ドッグフードが生成器が手動編集なしに扱わなかった4つの相互作用するギャップを表面化した;(a) / （b）は`b6d3286`で着地;(c) / (d) / （e）は今セッションで着地。
   - ~~**（a）中間セグメント上のmodule対class検出**。~~ **コミット`b6d3286`でクローズ**。
   - ~~**(b) `module Foo; module_function`のためのリーフ種類検出**。~~ **コミット`b6d3286`でクローズ**。
   - ~~**（c）別クラス内のネスト型Data-defineクラス**。~~ **今セッションでクローズ**。
   - ~~**(d) `&:symbol`ブロックパスがディスパッチャーで認識されない**。~~ **今セッションでクローズ**。
   - ~~**(e) `Const = Data.define(:fields)`代入クラス**。~~ **今セッションでクローズ**。
5. ~~**ADR-14フォローアップ: 観察対応`initialize`スタブ + kwarg / `.new`ルーティング**。~~ コミット`0c35465`（観察対応スタブ）と`642ccb4`（`--overwrite`がNEW_METHOD untyped-tighteningに広げられた）でクローズ。
6. **`Type::BoundMethod`を介した`Method#curry`の精度**。`BoundMethod`キャリア（コミット`b56cf02`）は`.call` / `.()` / `[]`を精度付きで往復させるが、`MethodFolding.try_backward`が`:call` / `:[]`しか認識しないため、`.curry`は`Nominal[Proc]`にフォールバックする。下流の`<curried>.call`はその後、素の`Proc#call`としてディスパッチされ`Dynamic[Top]`に縮退する。`[:to_i, :to_f, :to_sym].map { |m| "1".method(m).curry.call }`で再現 — 現在`Tuple[Dynamic[Top]×3]`、希望は`Tuple[Constant<1>, Constant<1.0>, Constant<:"1">]`。これを取り上げるときの2つの設計選択肢: **(A)** `try_backward`に`:curry`をキャリア上の恒等のno-opとして追加（小さな変更で、引数なしのケースには正確だが、`.curry(n).call(a)`部分適用の精度を失う）;**(B)**部分適用された引数を記録し、アリティが満たされたときにのみバッキング呼び出しをディスパッチする新しい`Type::CurriedBoundMethod(receiver_type, method_name, accumulated_args)`キャリアを導入（Rubyセマンティクスに忠実、約100〜150 LoC + 約10 spec）。具体的なユーザー需要があるときにオプションBを推奨。

## 復帰する実装者のための読書順

次のセッションのデフォルト目標は「v0.1.3リリースをカット」（実質的な作業が蓄積し、すべてのコミットされたトラックがクローズ）。代わりに実装を継続する場合、自然なエントリーは「作業が再開される場所」下の延期キュー項目のいずれか — Tier 3 Railsプラグイン、rigor-activerecord拡張、または呼び出しごとの戻り値型精度フォローアップ。この順序で読んでください:

1. `CHANGELOG.md`の`[Unreleased]`セクション — v0.1.3の作業が着地するにつれて蓄積されます。
2. [`docs/MILESTONES.md`](../milestones/) — リリースごとのコミットメントエンベロープ;v0.1.2が最新リリースマイルストーン、v0.1.3がADR-10 / ADR-11 / Rails Tier 2 / ADR-13を担う。
3. [`docs/adr/13-typenode-resolver-plugin.md`](../adr/13-typenode-resolver-plugin/) — 最新の着地ADRの設計根拠;7スライスの実装計画は完全にクローズされているが、未解決の問題セクションは射影サーフェスを拡張するときに依然として権威的。
4. [`docs/adr/10-dependency-source-inference.md`](../adr/10-dependency-source-inference/) + [`docs/internal-spec/dependency-source-inference.md`](../internal-spec/dependency-source-inference/) — v0.1.3の最初のトラックの設計根拠と解析器契約。
5. [`docs/adr/9-cross-plugin-api.md`](../adr/9-cross-plugin-api/)と[`docs/adr/11-sorbet-input-adapter.md`](../adr/11-sorbet-input-adapter/) — v0.1.xコアに着地した兄弟ADR。
6. [`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/) — Railsプラグインファミリーの順序付け、依存関係グラフ、サブツリー分割準備チェックリスト。
7. [`.codex/skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) — 新しいプラグインを作成するためのエージェント向けプレイブック。
8. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) — パブリック対内部の安定性境界。ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスしてください。
9. [`examples/README.md`](https://github.com/rigortype/rigor/blob/main/examples/README.md) — 19の動作プラグイン例の比較表;新しい作者への推奨読書順。
10. [`docs/adr/2-extension-api.md`](../adr/2-extension-api/)と[`docs/adr/7-v0.1.0-slice-decisions.md`](../adr/7-v0.1.0-slice-decisions/) — v0.1.xが拡張するv0.1.0プラグイン契約の拘束力のある設計とスライスごとの作業上の決定。
11. [`docs/adr/3-type-representation.md`](../adr/3-type-representation/)作業上の決定 — OQ1 / OQ2 / OQ3の結果がプラグインが消費する型オブジェクトパブリックサーフェスを引き続き拘束します。

スライス3bのサーフェス（`lib/rigor/rbs_extended.rb`、`lib/rigor/rbs_extended/reporter.rb`、`lib/rigor/builtins/imported_refinements.rb`、`lib/rigor/environment.rb`、`lib/rigor/analysis/runner.rb`）は端から端まで配線されている — レポーターや実行ごとの`name_scope`を必要とするフォローアップを作成するときはこれらを参照してください。スライス7のハンドブック更新（`docs/handbook/appendix-typescript.md`）はエンドユーザーが今日TSユーティリティ型語彙をどう見るかについての正準のリファレンスです。
