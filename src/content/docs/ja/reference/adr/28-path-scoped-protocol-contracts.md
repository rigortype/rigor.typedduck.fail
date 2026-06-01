---
title: "ADR-28 — パススコープのメソッドプロトコル契約"
description: "rigortype/rigor docs/adr/28-path-scoped-protocol-contracts.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/28-path-scoped-protocol-contracts.md"
sourcePath: "docs/adr/28-path-scoped-protocol-contracts.md"
sourceSha: "160f80010ae57664b8027f2823f5a6d7516e300d83a15dbc73e76219977ee23a"
sourceCommit: "a5d648b126d5ed7b1e04a16a87927bca7883e069"
sourceDate: "2026-05-23T03:19:23+09:00"
sourceLanguage: "en"
translationStatus: "translated"
sidebar:
  order: 4028
---

ステータス: **Accepted、2026-05-23;同一コミットクラスタ（コミット481d810、a54cd2d）で実装済み**。

プラグインが*ふるまいのプロトコル* — 「このディレクトリのすべてのクラスがこの形のメソッドを定義しなければならない」— を、クラス側のオプトインなしに静的に強制できるプラグイン拡張ポイントを追加する決定を記録する。メカニズムは新しい`Manifest`フィールド（`protocol_contracts:`）で、`Rigor::Plugin::ProtocolContract`値オブジェクトを運ぶ。2つのエンジンサイトで消費される: `Inference::MethodParameterBinder`でのパラメータ型**提供**（provide）と、貢献プラグインの`#diagnostics_for_file`フックでのメソッド存在 + 戻り型**チェック**（check）。2つの動作消費者が同梱される: `examples/rigor-web/`（RigWebフレームワークチュートリアル）と`plugins/rigor-hanami/`（本番Hanamiプラグイン）。

## コンテキスト

Rubyフレームワークはクラス宣言に記録されない*ふるまいのプロトコル*を日常的に課す。Rack形のWebフレームワークはコントローラーアクションが`Rack::Request`を受け取り`Rack::Response`を返すことを期待する;ジョブフレームワークは`#perform`を期待する;シリアライザは`#call`を期待する。この規約は実在するが、準拠するクラスのソースではなくフレームワークの文書に存在する — そのため何もチェックしておらず、違反は実行時に発見される。

このADR以前のRigorのプラグイン契約（contract）は、プラグインがプロジェクトに反応する3つの方法を提供していた:

- `flow_contribution_for(call_node:, scope:)` — *呼び出しサイト*ごと。
- `diagnostics_for_file(path:, scope:, root:)` — 推論**後**の*ファイル*ごと;プラグインがAST自身を辿る。
- マクロ基板マニフェスト宣言（ADR-16） — Tier A（`block_as_methods`）はクラスレベルのDSL呼び出しに渡される*ブロック*の`self`を絞り込む;Tier B〜Dはメソッドを合成する。

これらのどれも「パスglobGの下で定義されたクラスがプロトコルPを暗黙的に持つ」を表現しない。2つの機能が欠けている:

1. **ディレクトリ → プロトコルのバインド**。マニフェストのメカニズムは*クラスをそれを定義するファイルのパスで*ターゲットにしない。
2. **プレーンな`def`へのパラメータ型提供**。これが本質的なギャップだ。コントローラーの`def get(request)`はRBSを持たないため、エンジンは`request`を`Dynamic[Top]`にバインドする — そして`Dynamic[Top]`レシーバーはすべてのメソッドに応答するため、ボディ内の誤用も不正確な戻り型も表面化しない。パラメータに型を与える既存の方法はすべて不十分だ: `%a{rigor:v1:param:}`（RBS::Extended）はメソッドが**RBS宣言済みである**ことを要求する;マクロTier Aは**ブロック**の`self`を絞り込み、`def`のパラメータは絞り込まない;RBSインターフェース（`_Controller`）はクラスに*暗黙的に*バインドされない — RBSには「このディレクトリ下のすべてのクラスがこのインターフェースを実装する」という形式がない。

プラグインは`diagnostics_for_file`で戻り型を手動でチェック（`def`を辿り`Scope#type_of`でボディを調べる）することはすでにできる。しかし（2）なしには、そのチェックはほぼ無意味だ: `request`が`Dynamic[Top]`として型付けされると、requestから構築される戻り式はそれ自体が`Dynamic[Top]`となり、何にでも適合する。「提供」が荷重を担う半分だ。

## 決定

プラグインの`Manifest`に`protocol_contracts:`を追加する。各エントリーは以下を名指しするfrozenな`Rigor::Plugin::ProtocolContract`値オブジェクトだ:

- `path_glob` — 契約が適用されるファイルを選択する`File.fnmatch` glob（プロジェクトルートからの相対パス、例: `lib/controller/**/*.rb`）;
- `method_name` + `singleton` — それらのファイルのすべてのクラスが定義しなければならないメソッド;
- `param_types` — 位置ごとの`index → 型名`の提供;
- `return_type_name` — メソッドのボディが適合しなければならない型;
- `severity` — 違反診断の深刻度。

契約は2つのサイトで消費される — **provide-and-check**:

- **provide**（エンジン側）。`Inference::MethodParameterBinder`がティアを1つ獲得し、（RBSの有無にかかわらず）最後（最も権威ある）に適用される: バインド対象の`def`がそのファイルの契約に一致する場合、契約の`param_types`がバインドされたパラメータ型を置き換える。メソッドボディはパラメータがプロトコル型を持つかのように解析され — `request.no_such_method`のような誤用が通常のコア診断として表面化し、ボディの推論された戻り型が正確になる。
- **check**（プラグイン側）。貢献プラグインの`#diagnostics_for_file`が、一致するファイルの各クラスがメソッドを定義していることを確認し（そうでなければ`missing-protocol-method`）、その推論された戻り型が`return_type_name`に適合することを確認する（そうでなければ`protocol-return-mismatch`）。

## 作業上の決定

**WD1 — `.rigor.yml`設定キーではなく`Manifest`フィールド**。プロトコル契約はフレームワークを知っている*プラグイン*の属性であり、解析対象のプロジェクトの属性ではない。既存の宣言型マニフェストフィールド（`owns_receivers`、`open_receivers`、`block_as_methods`、…）に加わる。プロジェクトごとのレバーは契約の*著作*ではなく規約パスの設定*オーバーライド*（WD5）だ。

**WD2 — check-onlyではなくprovide-and-check**。提供こそが機能を出荷する価値あるものにする半分だ（コンテキスト（2）参照）。推論に先行するためエンジン側でなければならない;check-onlyではコントローラーボディを`Dynamic[Top]`に対して型付けしたまま戻り型チェックが空虚になる。

**WD3 — 契約はバインダーの最高優先ティア**。順序: `Dynamic[Top]`フォールバック → RBSオーバーロード → RBS::Extended `param:`オーバーライド → **プロトコル契約**。契約対象メソッドのRBSシグネチャも持つクラスは契約によってパラメータ型が上書きされる。これは意図的 — 契約はフレームワーク著者が強制する要件 — であり、フィールドの文書化されたふるまい。

**WD4 — エンジンが提供し、プラグインがチェックする**。パラメータ提供は*唯一の*エンジン側変更;推論より前でなければならないためプラグインフックには置けない。メソッド存在チェックと戻り型チェックは推論後に実行され、プラグインの`#diagnostics_for_file`に委ねられる — `Analysis::CheckRules`はエンジンの固定ルールカタログであり、プラグインの概念から解放されたまま。プラグインは契約のパラメータ型をクエリスコープに再バインドし、`Scope#type_of`がエンジン自身の推論と同一にボディを型付けする。

**WD5 — マニフェスト宣言のデフォルトパス、プロジェクトごとのオーバーライド**。マニフェストは規約の`path_glob`（`lib/controller/**/*.rb`）を運ぶ。プラグインは`Plugin::Base#protocol_contracts`をオーバーライドできる — `#signature_paths`が使う同じ間接参照 — プロジェクトごとの`config`値を契約セットに折り込む（例: `app/controllers/`へのリターゲット）。マニフェストはconfig非関与のまま;インスタンスメソッドがconfigの入口。

**WD6 — `Dynamic[Top]`の場合はサイレント**。エンジンが契約対象メソッドの戻り型を固定できない場合、チェックはサイレントのまま。プロジェクトの偽陽性規律に従い、不確実な戻り値はフラグを立てるのではなく実行時に先送りされる。

**WD7 — 解決不能な型名ではフェイルソフト**。`param_types` / `return_type_name`は文字列として運ばれ、解析対象プロジェクトの環境に対して遅延的に解決される。解決不能な名前（プロトコルのRBSが未ロード）は提供を停止 / チェックをスキップし、raiseしない — バインダーの既存のフェイルソフト姿勢と一致。`signature_paths:`（ADR-25）でプロトコル型の自前RBSを同梱するプラグインは解決を確実にする。

**WD8 — pre-1.0プラグイン契約への加法的変更**。新しいオプションのマニフェストフィールドと、新しいオプションの`MethodParameterBinder`コンストラクタキーワード（`source_path:`、デフォルトは`nil`）。既存のプラグインも呼び出し元も壊れない;v0.1.x内で安全。

## エンジンサーフェス

- `lib/rigor/plugin/protocol_contract.rb` — `ProtocolContract`値オブジェクト（+ ネストされた`ParamType`）。
- `lib/rigor/plugin/manifest.rb` — `protocol_contracts:`フィールド。
- `lib/rigor/plugin/base.rb` — `#protocol_contracts`インスタンスメソッド（マニフェストバック、WD5に従いオーバーライド可）。
- `lib/rigor/plugin/registry.rb` — `#protocol_contracts`アグリゲーター + `#contracts_for_path` globルックアップ。
- `lib/rigor/inference/method_parameter_binder.rb` — `apply_protocol_contract`提供ティア;コンストラクタが`source_path:`を獲得。
- `lib/rigor/inference/statement_evaluator.rb` — `scope.source_path`をバインダーにスレッド通す;`build_fresh_body_scope`が`source_path`をボディスコープ導出を通じて運ぶ（以前はドロップされており、ネストされたスコープの`flow_contribution_for`のファイル解決も飢えさせていた）。

## 結果

- フレームワークプラグインは準拠クラス側のオプトインなしに、コントローラー / ジョブ / シリアライザのプロトコルを強制できる。
- コントローラー形のボディが実推論を獲得する: 提供されたパラメータ型がボディ全体をチェック可能なコードに変える。
- 2つの消費者が同梱される: `examples/rigor-web/`（RigWebフレームワークチュートリアル — 最小参照消費者）と`plugins/rigor-hanami/`（本番利用: `app/actions/`下のHanami 2アクションクラスに`#handle(request) -> response`プロトコルを強制）。

## 却下 / 見送りの代替案

- **ディレクトリで暗黙的にバインドされたRBSインターフェース**。RBSには「パスGの下のすべてのクラスがインターフェースIを実装する」形式がなく、それを発明するとバインドを型言語に押し込むことになる（ADR-0 / ADR-1はコアをRBS正準に保つ）。契約はプラグイン側の宣言のまま。
- **check-only（エンジン変更なし）**。WD2に従い却下 — 提供なしには空虚。
- **一致するクラスごとに合成RBSを注入することによる提供**。既存の`def.return-type-mismatch`ルールがcheck半分を無料で行えるが、共有環境へのファイルごとの合成RBS注入はバインダーティアよりも重く予測不能な変更。2番目の消費者が望む場合に先送り。
- **汎用的な「クラスがインターフェースを実装する」チェックルール**。より大きな機能（ファーストクラスの`Rigor::Type::Interface`キャリア（carrier）、適合性診断） — ここではスコープ外;契約が具体的なニーズをカバーする。
