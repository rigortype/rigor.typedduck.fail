---
title: "Rigor and Tapioca — Comparison and Strategy"
description: "Imported from rigortype/rigor docs/design/20260509-rigor-tapioca-comparison.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260509-rigor-tapioca-comparison.md"
sourcePath: "docs/design/20260509-rigor-tapioca-comparison.md"
sourceSha: "30a15d15ee589cfad1a155afcad75f208ac7d5c388c527efbcc61bd62b02fcba"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
translationStatus: "translated"
sidebar:
  order: 20265509
---

ステータス: **notes, 2026-05-09**。`rigor-sorbet`（ADR-11）の設計作業中に浮上した設計比較をまとめ、RigorのエコシステムへのRBI-emitモードを次の表面として提案する — Tapiocaのカバレッジを置き換えるのではなく*補完する*。

このドキュメントは参考情報。プラグインコントラクトの拘束力のあるソースは[ADR-2](../../adr/2-extension-api/)。Sorbetインプットプラグインの拘束力のあるソースは[ADR-11](../../adr/11-sorbet-input-adapter/)。

## TL;DR

- **RigorとTapiocaは同じ問題領域を共有する** —
  Sorbetのブラインドスポット（DSL生成メソッド、gemの内部実装、メタプログラミング由来のAPI）— だが**正反対の端からアプローチする**:
  - Tapioca: ランタイムでアプリをロードし、リフレクトし、RBIを生成する
  - Rigor: 静的にパースし、解析し、診断を出力する
- **RigorはTapiocaを置き換える計画はない**。ふたつのツールは補完的。両方を使うプロジェクトはそれぞれのカバレッジの和集合を得る。
- **戦略的機会:** RigorにRBI-emitモードを追加し、Rigorの静的推論をTapiocaが書き込む`sorbet/rbi/`ツリーに流し込む。TapiocaのランタイムイントロスペクションOutputに*代わるのではなく補完する*。
- **RigorのRBI emitが独自の価値を持つ場面:**
  - `Bundler.require`が失敗するか好ましくない、サンドボックス化された/ロード不可能なコードベース。
  - Rigorのプラグインが既に静的に理解しているDSLサーフェス（`rigor-activerecord`は`db/schema.rb`を読む、`rigor-routes`は`config/routes.rb`を読む等）。
  - Tapiocaのランタイムリフレクションパスが捉えられない`RBS::Extended`精度（リファインメント、狭められた型、フローファクト）。
- **Tapiocaが適切な場面:**現時点での広いDSLカバレッジ（39の組み込みコンパイラ）、ランタイム専用ファクト（ソースに現れない`define_method`生成メソッド）、確立したTapiocaパイプラインを持つ大規模Railsモノレポ。

## 背景

両ツールは同じギャップを対象にする: 静的型チェッカー（Sorbet、Rigor）はメタプログラミングで生成されたメソッド、ランタイムロードされた定数、ソースが利用できないgemの内部実装、ロード時にクラス/メソッドを合成するDSLマクロを見ることができない。主流の解決策:

- **Tapioca**（Shopify、2021年〜） — アプリケーションをランタイムでロードし、定義されたすべてのクラス/メソッドをリフレクトして`sorbet/rbi/{gems,annotations,dsl,shims}/`を生成する。
- **Rigor**（2026年〜） — プラグイン拡張API（ADR-2）を提供し、DSLごとのプラグイン（`rigor-activerecord`、`rigor-routes`等）がアプリケーションコードを実行することなくプロジェクトのソースを読み込み、メソッドシグネチャとフローファクトをアナライザーに提供できるようにする。

両者は異なるエコシステムの前提から同じ問題空間に到達した: TapiocaはアプリケーションがすでにRails上で実行可能であると前提とする。Rigorは静的専用のスタンス（ADR-2 §「プラグインの信頼とI/Oポリシー」に従う）を前提とする。

## 共通点

| 次元 | RigorとTapiocaの両方 |
| --- | --- |
| 対象ドメイン | Sorbetのブラインドスポット — DSL生成メソッド、gemの内部実装、メタプログラミング |
| プラグイン/コンパイラアーキテクチャ | DSLごとの拡張。コアにハードコードされていない |
| Rails対応 | ActiveRecord/ActionPack/ActiveJobをファーストクラスでサポート |
| ユーザー拡張性 | 非標準DSL用のカスタムコンパイラ/プラグイン |
| RBIが合流点 | Tapiocaが書く。Rigorが読む（`rigor-sorbet`スライス4） |
| Sorbetエコシステムとの整合 | 両者とも実プロジェクトでSorbetを有用にするために設計 |

## 根本的な違い

### 実行モデル — 最も深い違い

| | Tapioca | Rigor |
| --- | --- | --- |
| アプローチ | **アプリケーションをロードする**（`Bundler.require`、`require "config/application"`）してRubyのランタイムAPI（`Module#instance_methods`、`Class#ancestors`等）でリフレクトする。 | **アプリケーションコードを実行しない**（ADR-2 §「プラグインの信頼」）。純粋なPrism ASTウォーク。 |
| Tapiocaのコア | [`lib/tapioca/runtime/reflection.rb`](../../references/tapioca/lib/tapioca/runtime/reflection.rb) — 安全なリフレクションのためにbind_call経由で`Kernel.instance_method(:class)`等をラップ。 | [プラグインコントラクト](../../adr/2-extension-api/) — `flow_contribution_for(call_node:, scope:)`、`diagnostics_for_file(path:, scope:, root:)`。 |
| プラグイン作成 | リフレクション駆動（短いが、gemのロードが必要）。 | AST駆動（より多くのコードだが、解析コードへのランタイム依存なし）。 |

このひとつの違いが他のすべての設計上の乖離を引き起こす。

### 出力形式

- **Tapioca** → `.rbi`ファイルをディスクに出力
  （`sorbet/rbi/gems/<gem>@<version>.rbi`、
  `sorbet/rbi/dsl/<class>.rbi`等）。
  **Tapiocaはコードジェネレーターである**。
- **Rigor** → 診断をstdoutに出力（`rigor check`）、
  オプションでCIベースライン用にJSON形式。
  **Rigorはアナライザーである**。

Tapiocaの出力はSorbetの`srb tc`が消費する。Rigorの出力はユーザー/エディターが直接消費する。

### Sorbetとの結合度

- **Tapioca**: 密に結合。RBIが唯一の出力。SorbetがTo唯一のコンシューマ。TapiocaはSorbetのために存在する。
- **Rigor**: スタンドアロン。RBS（Rubyチームの公式型言語）が標準的な入力。Sorbetサポートはプラグイン（`rigor-sorbet`、ADR-11）であり、プラグイン境界でSorbetの語彙をRigorのRBSスーパーセット内部キャリアに変換する。

### DSLカバレッジの広さ

- **Tapioca**: 39の組み込みDSLコンパイラ（`AASM`、`ActionMailer`、`ActiveRecord*`ファミリー、`FrozenRecord`、`GraphQL`、`IdentityCache`、`JsonApiClient`、`Kredis`、`Protobuf`、`SidekiqWorker`、`SmartProperties`、`StateMachines`、`UrlHelpers`等）。Shopifyで本番稼働。長年のイテレーション。
- **Rigor**: 7つの作業例プラグイン（`lisp-eval`、`pattern`、`units`、`statesman`、`deprecations`、`routes`、`activerecord`）と1つのエコシステムアダプター（`rigor-sorbet`、ADR-11）。Railsプラグインファミリーは[`docs/design/20260508-rails-plugins-roadmap.md`](../20260508-rails-plugins-roadmap/)でロードマップ化済み**。カバレッジではTapiocaが数年先行している。これは正直な評価**。

### 信頼モデル

- **Tapioca**: アプリケーションがロード可能であることを信頼する。gemの`initialize`が失敗したりRailsイニシャライザがクラッシュすると、Tapiocaもクラッシュする。
- **Rigor**: アプリケーションコードを実行しない。敵対的/不馴れなコードベースも安全。

### ファイルフォーマットの方向

- **Tapioca → RBI**（Sorbetのフォーマット）
- **Rigor → RBS**（Rubyチームのフォーマット）エクスポート時。RBSが自然に記述できないリファインメントには`RBS::Extended`の`%a{rigor:v1:…}`コメントアノテーションを使用。

### プラグインのライフサイクル

- **Tapiocaコンパイラ**: `tapioca dsl`実行ごとに1回呼び出され、ファイルを書き込む。呼び出しサイトごとのロジックはない。
- **Rigorプラグイン**: 呼び出しサイトごと（`flow_contribution_for`）とファイルごと（`diagnostics_for_file`）に呼び出される。アナライザーとの継続的なインタラクション。

## PHPのアナロジー（参考として）

PHPの静的型付けエコシステムは数年前に同じように分裂した:

| 陣営 | PHP | Ruby |
| --- | --- | --- |
| **ランタイムイントロスペクション+ファイル生成** | [`barryvdh/laravel-ide-helper`](https://github.com/barryvdh/laravel-ide-helper) | **Tapioca** |
| **静的拡張**（アナライザー時プラグインAPI） | [PHPStan拡張](https://phpstan.org/developing-extensions/extension-types) / Psalmプラグイン | **Rigor** |

マッピングは密接に対応する:

- `php artisan ide-helper:generate` ≈ `tapioca gem`
- `php artisan ide-helper:models` ≈ `tapioca dsl`
- `_ide_helper.php` / `_ide_helper_models.php` ≈ `sorbet/rbi/{gems,dsl}/*.rbi`
- `phpstan-stubs`（コミュニティ提供のスタブファイル） ≈ `rbi-central`アノテーション

Rigorのプラグインコントラクトは**明示的にPHPStanをモデルにしている**
（[ADR-2 §「コンテキスト」](../../adr/2-extension-api/): 「PHPStanはこの設計部分の最強の参照点である」）。PHPは両方のフレーバーの共存を許容する。RigorはPHPStanスタイルの静的拡張フレーバーをTapiocaの既存のランタイムイントロスペクションフレーバーと並んでRubyにもたらす。

## RigorがRBI出力を強化できる場面

Rigorは現在**診断**を出力し、RBIは出力しない**。RBI-emitモード**を追加することでRigorの静的推論をTapiocaが書き込む`sorbet/rbi/`ツリーに流し込める。3つの独自の価値提案:

### 1. Rigorの静的推論からのRBI（アプリロード不要）

**できないか望まない**プロジェクトに対して`Bundler.require`を実行する代わりに:

- サンドボックス化されたCI環境（ネットワークなし、gem installなし）。
- 敵対的/部分的に信頼されたgemソース。
- ロード前のCIパス（インテグレーションテストより前のリント）。
- パフォーマンスに敏感なパス（TapiocaのフルRailsブートは数秒かかる。Rigorの静的ウォークは同じコードでサブ秒）。

Rigorはソースのみから証明できるものについてRBIを生成する — クラス定義、メソッドシグネチャ（RBS/`RBS::Inline`/推論された戻り型から）、定数型。重いメタプログラミングではTapiocaのカバレッジに及ばないが、「コミット前のスモークテスト」ワークフローには十分。

### 2. RigorプラグインからのDSL対応RBI

DSLを理解する各Rigorプラグインは静的ウォーカーが記録できるファクトを持つ:

- `rigor-activerecord`: モデルクラス名、スキーマ由来の属性メソッド（診断のために既に検出済み — RBIの出力は追加の1ステップ）。
- `rigor-routes`: `config/routes.rb`からの`*_path`/`*_url`ヘルパー。
- `rigor-rails-i18n`（計画中）: `t('key.path')`のキー。
- `rigor-actionmailer`（計画中）: メーラーメソッド。

これらのプラグインは**すでに**DSLソースを静的にパースしている。プラグインごとにRBI-emitパスを追加すれば、Rigorは**Tapioca-DSLコンパイラの代替**としてRailsをロードしないことを好むプロジェクトにとって実用的になる。

### 3. RBIにおける`RBS::Extended`精度

Rigorの内部型はRBS（したがってRBI）が自然に記述できないリファインメント精度を保持できる —
`%a{rigor:v1:return: non-empty-string}`はRigor固有。RBIを出力する際:

- RBIに*適合する*厳格な型（リテラルの非空リスト、タプルシェイプ）はそのまま変換される。
- 適合しないリファインメントは以下のどちらかになる:
  - **コメント形式での保存**: RBIのメソッド宣言の隣に
    `# @rigor:return: non-empty-string`を出力。Sorbetはそれを無視し、RBIが後で消費された場合はRigorが読み戻す。
  - **保守的な消去**: ADR-1 §
    「[rbs-erasure.md](../../type-specification/rbs-erasure/)」に従い、
    リファインメントを最も広いRBS形式に消去（例えば
    `non-empty-string` → `String`）。Sorbetは消去された形式を見る。精度は`RBS::Extended`アノテーション経由でRigor側のみで保持される。

これにより、すでにTapiocaを使っているプロジェクトがTapioca生成のRBI上に**Rigor由来の精度を重ねる**手段が得られる。`sorbet/rbi/rigor/`ディレクトリか、Tapiocaのshimスタイルのオーバーレイとして提供される。

### 注意点

- **SorbetのRBI語彙はRBSと異なる**。RigorにはRBIの方向のトランスレーターが必要になる（ADR-11スライス3の`rigor-sorbet`のインプット側変換の逆）。難しい部分: `T::Class[T]`/`T.attached_class`/`T.self_type`は慎重な近似が必要。Sorbetの`T.untyped`セマンティクスはRBSの`untyped`と異なる（漸進的vs.損失あり）。
- **ADR-1の不変条件が適用される**。Rigor → RBIはRigor → RBS（`rbs-erasure.md`）とRBS → Rigor（情報無損失）と並ぶ第3の脚である。新しい脚には独自の規範的ドキュメントとラウンドトリップルールが必要。
- **カバレッジのマッチは正直に示す**。Rigorの静的ウォークはランタイム専用の定義（ランタイム計算された名前に対する`define_method`、文字列の`class_eval`、`if Rails.env.production?`を通じて条件付きロードされるモジュール）を見ることができない。Tapiocaはこれらを捕捉する。RigorのRBI emitは捕捉しない。ドキュメントは明示的であるべき。

## Tapiocaが適切な場面

正直な承認: Tapiocaはなくならない。RigorのRBI-emit野心はそれを変えない。

- **重いメタプログラミング**。アプリケーションブート時に`define_method`、計算された文字列の`class_eval`、ランタイムレジストリ上の`method_missing`で生成されたメソッド。静的解析はここで根本的に限界がある。ランタイムイントロスペクションが適切なツール。
- **現時点での広いDSLカバレッジ**。人気のRails/Shopifyスタックエコシステムのほとんどをカバーする39の組み込みコンパイラ。Rigorが追いつくには長年のプラグイン作成が必要。
- **確立されたTapiocaパイプライン**。CIインテグレーション、カスタムコンパイラ、shim管理ワークフローを持つ大規模モノレポ。Rigorがtapiocaが根本的にできないことを提供しない限り、切り替えコストが便益を上回る。
- **Sorbet固有の型strictness**。`# typed: strict`/`# typed: strong` — これらはSorbet-staticの機能であり、Rigorはそれを再現しない（Rigorは`severity_profile`を類似フィルタリングに使うが、ファイル単位モードモデルはSorbetのもの）。

## 共存 — 推奨

両ツールを使うプロジェクトが最強の構成である:

```
sorbet/rbi/
├── gems/         ← Tapioca（インストール済みgemへのランタイムリフレクション）
├── annotations/  ← Tapioca（rbi-centralコミュニティアノテーション）
├── dsl/          ← Tapioca（Rails DSLランタイムイントロスペクション）
├── shims/        ← 手書きのオーバーライド
└── rigor/        ← Rigor（静的 + RBS::Extended精度オーバーレイ）
```

Rigorは`rigor-sorbet`スライス4を通じてツリー全体を読む。プラグインのカタログはプロジェクトソースの`.rb` sigとRBI sigの間で共有されるため、Tapioca生成のRBIを既に持つプロジェクトはgemとDSLサーフェスについて**無料のRigorカバレッジ**を得る。

`rigor/`オーバーレイはRigorの静的推論が着地する場所 — ユーザーがRigorに尊重させたいが、Tapiocaのランタイムパスに上書きされたくないリファインメント付きのsig。

## 実装スケッチ

将来のADR（おそらくADR-12）が設計を確定する。想定される構造:

1. **`rigor rbi-emit` CLIコマンド** — `tapioca gem`/`tapioca dsl`に類似。`paths:`を探索し、推論を実行し、`sorbet/rbi/rigor/<file>.rbi`を出力する。
2. **プラグインのオプトイン`produces_rbi:`宣言** — RBI形式のファクトを提供するプラグインがマニフェスト経由で宣言。ランナーが集約する。
3. **RBI方向トランスレーター** — `rigor-sorbet`のインプット側変換の逆。コアに存在する（`lib/rigor/rbs_extended.rb`の消去側に類似）。
4. **`RBS::Extended`コメント保存** — メソッド宣言の隣に`# @rigor:…`アノテーションを出力し、Rigor → Tapiocaフォーマットのあるいは → Rigorのラウンドトリップでリファインメントが保持されるようにする。
5. **`rigor-sorbet`との合成** — 出力されたRBIは`rigor-sorbet`スライス4の有効なインプットである。ラウンドトリップテスト: 出力、再読み込み、再出力。2回目の出力は1回目に一致しなければならない。

スライスの順序はADR-11のパターンを反映する: 最初にemitインフラ（スライス1）、次にプラグインごとのRBI提供（スライス2-N）、最後に`RBS::Extended`精度（スライス≥N+1）。

## 比較サマリー

| 次元 | Tapioca | Rigor |
| --- | --- | --- |
| 実行モデル | ランタイムイントロスペクション（`require` + リフレクト） | 静的AST解析（Prism、実行なし） |
| 出力 | RBIファイル（`sorbet/rbi/**/*.rbi`） | 診断（`rigor check`）。将来: RBI emit |
| 対象コンシューマ | Sorbetの`srb tc` | エンドユーザー（CLI/エディタ） |
| プラグイン作成 | リフレクション駆動（短いが、ランタイムが必要） | AST駆動（長いが、ランタイム依存なし） |
| 信頼スタンス | コードが実行されることを信頼 | コードを実行しない |
| RBSサポート | なし（Sorbet-RBIのみ） | ネイティブ（RBSが標準） |
| RBIサポート | ネイティブ出力 | `rigor-sorbet`経由で入力。将来: ネイティブ出力 |
| 組み込みDSLカバレッジ | 39コンパイラ（成熟） | 7例+Railsロードマップ（初期） |
| gem依存関係処理 | `tapioca gem`が自動でRBIを生成 | RBS優先。ADR-10オプトインソースウォーク |
| リファインメント精度 | `RBS::Extended`未サポート | ファーストクラス。Rigorを通じてラウンドトリップ |
| エコシステムの成熟度 | Shopifyで本番稼働、長年のイテレーション | v0.1.xプレビュー |
| サンドボックス環境 | 実行不可（`Bundler.require`が必要） | 実行可（実行なし） |

## 一言まとめ

> **TapiocaはアプリをRunしてRBIを書く。RigorはRBS（および`rigor-sorbet`経由でRBI）をソースをパースして読む。両者は正反対の端から同じ問題に取り組む。RigorのNEXT-tier野心は診断と並行してRBIを出力することであり、Tapiocaを置き換えることではなく、Tapiocaのランタイムパスが提供できない静的パスカバレッジや`RBS::Extended`精度を必要とするプロジェクトにとっての補完的存在となること**。

## 参照

- [ADR-2 — 拡張APIストラテジー](../../adr/2-extension-api/)
  — 規範的プラグインコントラクト。
- [ADR-11 — Sorbetインプットアダプターとしてのプラグイン](../../adr/11-sorbet-input-adapter/)
  — 共存を実現するインプット側変換。
- [Railsプラグインロードマップ](../20260508-rails-plugins-roadmap/)
  — Rigorが構築中のDSL対応プラグインのカタログ。
- [`references/tapioca`](../../references/tapioca) — 参照に使用したTapiocaソース。
