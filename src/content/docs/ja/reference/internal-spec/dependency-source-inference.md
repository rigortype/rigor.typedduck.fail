---
title: "オプトイン依存関係ソース推論"
description: "rigortype/rigor docs/internal-spec/dependency-source-inference.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/internal-spec/dependency-source-inference.md"
sourcePath: "docs/internal-spec/dependency-source-inference.md"
sourceSha: "5eb778a840b387943f8859322530847fd5ac38316005e9e34cfa16eb10340284"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス: **v0.1.3進行中。** [ADR-10](../../adr/10-dependency-source-inference/)のスライス1、2a、2b-i、2b-ii、3、4、5がすべて`master`に未リリースで着地し、ADR-10の実装エンベロープは完了。このドキュメントは提供されたサーフェスの解析器契約を固定し、ADR-10 §「オープンクエスチョン」で引き続き追跡されるオープンなフォローアップを名付けます。

拘束力のある設計サーフェスは[ADR-10](../../adr/10-dependency-source-inference/)にあります。リリースごとのコミットメントエンベロープは[`docs/MILESTONES.md`](../../milestones/)にあります。この仕様がADR-10と不一致の場合、ADRが拘束力を持ち、このドキュメントは古くなっています。

## スコープ

Rigorのデフォルトの推論境界はRBSです。シグネチャ（RBS / RBS::Inline / 生成スタブ / プラグイン契約）のないクラスのメソッドは`Dynamic[top]`に解決されます——エンジンはサードパーティのソースを辿りません。ADR-10は意図的な例外を切り出します: ユーザーが`.rigor.yml`の`dependencies.source_inference:`経由でオプトインしたgemは、`paths:`を辿る同じエンジンによってRuby実装を辿られることがあります。gem境界を越える推論は`Dynamic[T]`でラップされるため、証明は作成済みではなくサードパーティとして扱われます。

オプトインはgemごとで、`paths:`（ユーザー自身のソース）と`signature_paths:` / `libraries:`（RBS境界）に直交しています。`dependencies:`以下に列挙されていないgemは既存のデフォルトを保持します。

## 設定

```yaml
# .rigor.yml
paths:
  - lib

dependencies:
  source_inference:
    - gem: rack
      mode: when_missing
    - gem: faraday
      mode: when_missing
      roots: [lib]
    - gem: legacy-noop-gem
      mode: disabled
```

この形状は[`Rigor::Configuration::Dependencies`](https://github.com/rigortype/rigor/blob/main/lib/rigor/configuration/dependencies.rb)でパースされます。[`schemas/rigor-config.schema.json`](https://github.com/rigortype/rigor/blob/main/schemas/rigor-config.schema.json)のJSONスキーマ行がパーサーを反映します。

| フィールド | 型 | 必須 | デフォルト | 注記 |
| --- | --- | --- | --- | --- |
| `gem` | 非空String | yes | — | Bundle解決可能なgem名。 |
| `mode` | enum | no | `when_missing` | `disabled`、`when_missing`、`full`のいずれか。 |
| `roots` | Array&lt;String&gt; | no | `["lib"]` | ウォーカーが訪問してよいgemごとのサブディレクトリ。 |
| `dependencies.budget_per_gem` | Integer | no | `5000` | gemごとのカタログキャップ（メソッド定義数）。範囲`1250 .. 20000`（ADR-10 §「予算のインタラクション」によるデフォルトの0.25×〜4×）。ウォーカーがgemのキャップに達すると収集を停止し、ランナーは`dynamic.dependency-source.budget-exceeded`警告を発行します。 |

### モード

| モード | 挙動 |
| --- | --- |
| `disabled` | ドキュメント / 将来のトグル便宜のために列挙。{Builder}は解決前にエントリーをスキップ; gemは何も貢献しない。 |
| `when_missing` | レシーバークラス / メソッドペアに利用可能なシグネチャ契約がない場合のみgemソースを辿る。RBS / RBS::Inline / 生成スタブ / プラグイン契約は常に勝つ。**推奨デフォルト。** |
| `full` | RBSも存在する場合でも常にgemソースを辿る。ユーザーがgemソースがバンドルされたRBSより正確と判断したケース向け; ADR-10 §「決定」に従い既知のチャーンリスクを伴う。 |

v0.1.3のディスパッチャーティアは`when_missing`と`full`を同じように実装します——両方とも同じ`try_dependency_source`サイトを通じます。ディスパッチャーでのモード区別挙動（例: `full`がRBSをオーバーライド、RBS競合診断）は後続スライスのためにキューに入れられています;設定サーフェスは今固定されているため、コンシューマーは後で`.rigor.yml`の書き直しなしに最終的な区別を表現できます。

### ハード除外

列挙されていても、ウォーカーはスキップしなければなりません:

- **Cエクステンションおよびその他の非Rubyソース。**ウォーカーは`.rb`ファイルのみをロードします;他のものはカタログに到達できません。
- **トップレベルの`spec/` / `test/` / `bin/`ルート。** `DependencySourceInference::Walker::HARD_EXCLUDED_ROOTS`によってファイルシステムウォーク実行前にフィルタリングされます。`lib/`内に深くネストされた`spec/` / `test/`ディレクトリはフィルタリングされません（一部のgemは正当に`lib/.../spec/`を同梱します）。
- **gemの列挙された`roots:`外のファイル。**デフォルトは`lib/`のみ;ユーザーはエントリーごとにこれを広げることができますが、ウォーカーは列挙されたルート外を読み取りません。

除外はローダーに組み込まれており、ユーザーは設定でオーバーライドできません。

## パブリックAPIドリフトサーフェス

以下のすべての名前空間は[`spec/rigor/public_api_drift_spec.rb`](https://github.com/rigortype/rigor/blob/main/spec/rigor/public_api_drift_spec.rb)によってロックされています。シグネチャ変更は同じコミットで対応する`PublicApiDriftSnapshots::*`定数を更新します。

| サーフェス | モジュール | スライス |
| --- | --- | --- |
| `Rigor::Configuration#dependencies` | Configuration | スライス1 |
| `Rigor::Configuration::Dependencies`値オブジェクト | Configuration | スライス1 |
| `Rigor::Configuration::Dependencies::Entry` Data形状 | Configuration | スライス1 |
| `Rigor::Configuration::Dependencies::DEFAULT_BUDGET_PER_GEM` / `MIN_BUDGET_PER_GEM` / `MAX_BUDGET_PER_GEM` | Configuration | スライス4 |
| `Rigor::Configuration::Dependencies#budget_per_gem` | Configuration | スライス4 |
| `Rigor::Analysis::DependencySourceInference`名前空間 | Analysis | スライス2a |
| `Rigor::Analysis::DependencySourceInference::GemResolver.resolve` | Analysis | スライス2a |
| `Rigor::Analysis::DependencySourceInference::Index` | Analysis | スライス2a / 2b-i |
| `Rigor::Analysis::DependencySourceInference::Index#budget_exceeded` | Analysis | スライス4 |
| `Rigor::Analysis::DependencySourceInference::Builder.build` | Analysis | スライス2a |
| `Rigor::Analysis::DependencySourceInference::Walker.walk(budget:)` | Analysis | スライス2b-i / 4 |
| `Rigor::Analysis::DependencySourceInference::Walker::Outcome` Data形状 | Analysis | スライス4 |
| `Rigor::Environment#dependency_source_index` | Environment | スライス2b-ii |
| `Rigor::Cache::Descriptor::DependencyEntry` | Cache | スライス3 |
| `Rigor::Cache::Descriptor#dependencies`スロット | Cache | スライス3 |
| `Rigor::Analysis::DependencySourceInference::Index#cache_descriptor` | Analysis | スライス3 |

## 解決とインデックス化（スライス2a）

`Analysis::Runner#run`はプラグインローディング後、ファイルごとの反復前に、実行ごとに一度`DependencySourceInference::Index`をビルドします:

```text
Configuration::Dependencies      ─┐
                                   │
Builder.build(dependencies)        ▼
                                  GemResolverを通じてエントリーを解決
                                  Walkerを通じて解決されたgemを辿る（スライス2b-i）
                                  フリーズされたIndexを返す
```

`GemResolver.resolve(entry)`はまず`Gem.loaded_specs[name]`を参照し、`Gem::Specification.find_by_name(name)`にフォールバックします。

| 結果 | 意味 |
| --- | --- |
| `Resolved(gem_name:, version:, gem_dir:, mode:, roots:)` | RubyGemsがスペックを特定した; `version`はキャッシュディスクリプターに往復するためStringとしてのスペックバージョン。 |
| `Unresolvable(gem_name:, reason: :not_in_bundle)` | スペックが不在。ランナーは`dynamic.dependency-source.gem-not-found` `:warning`診断を表面化し、gemは実行に何も貢献しない。 |

`Builder.build`はエントリーを分割します: `Resolved`行はウォーカーにフィード、`Unresolvable`行は上記の診断として表面化。`mode: :disabled`のエントリーは解決前にスキップされます（意図的に列挙-オフされたgemに対して欠落gemの診断なし）。

`Index`は以下を公開します:

- `#resolved_gems` — `Resolved`の配列。
- `#unresolvable` — `Unresolvable`の配列。
- `#method_catalog` — ウォーカーによって設定されたフラットな`Hash{[class_name, method_name] => :instance | :singleton}`（スライス2b-i）。
- `#contribution_for(class_name:, method_name:)` — 記録された種類または`nil`を返す。
- `#empty?` — 解決されたgemが登録されていない場合にtrue。
- `#cache_descriptor` — 解決されたgemごとに1つの`DependencyEntry`を持つフリーズされた[`Cache::Descriptor`](../cache/)（スライス3;以下の「キャッシュスライス」参照）。

`Index::EMPTY`はgemがオプトインしていない場合に使用されるシングルトンのフリーズされた空のインデックスです。

## ウォーカー（スライス2b-i）

`DependencySourceInference::Walker.walk(gem_dir:, roots:)`は各受け入れられたルート以下のすべての`*.rb`ファイルをパースし、`(class_name, method_name)`をメソッドの種類にマッピングするフラットなカタログを返します。ウォーカーはgem-source推論がスコープコンテキストなしで実行されるため、`Inference::Scope`から切り離されています。

認識ルール:

- `class Foo` / `module Bar`は修飾名プレフィックスに`Foo` / `Bar`をプッシュし、ボディに再帰。
- `class << self`（のみ——その他の`expr`に対する`class << expr`は不透明として扱われる）はシングルトンスコープフラグをプッシュ。
- `def foo`は`(Class, :foo, :instance)`（またはシングルトンスコープフラグ下では`:singleton`）を記録。
- `def self.foo`は周囲のフラグに関係なく`(Class, :foo, :singleton)`を記録。
- クラスごとの先着書き込みが勝つ。異なる種類の同じクラスの同名メソッド（稀;主にプライベートAPI）は、クラスごとの最初のウォークで勝った種類を持つ。

ファイルごとのエラーはサイレントに「このファイルからの貢献なし」に降格します:

- Prismがパースできないファイル。
- `Prism.parse_file`中に例外が発生するファイル。
- gemの列挙された`roots:`外のファイル。

辿れないgemソースはユーザー向けの診断ストリームを汚染してはなりません——ユーザーはファイルを作成しておらず修正できません。

## ディスパッチャーティア（スライス2b-ii）

`Inference::MethodDispatcher.dispatch`はRBSディスパッチが失敗した後、ユーザークラスフォールバック前にインデックスを参照します:

```text
定数フォールドティア
シェイプ / カーネル / イテレーター / ブロックフォールド精度ティア
RbsDispatch.try_dispatch                              ── RBS / RBS::Inline / スタブ / プラグイン
                                                         ↓ （契約なし）
try_dependency_source(receiver_type, method_name)     ── ADR-10（このティア）
                                                         ↓ （エントリーなし）
try_user_class_fallback                               ── Kernel / Module組み込み
                                                         ↓
call.undefined-method                                 ── 最終
```

`try_dependency_source`はレシーバーがカタログエントリーとクラス名 + メソッド名がマッチする`Type::Nominal` / `Type::Singleton`を持つ場合、`Type::Combinator.untyped`（つまり`Dynamic[top]`）を返します。このティアは**プラグインより厳密に下位に**座ります: プラグイン契約はADR-10 WD6に従って競合時に勝ちます（プラグインは作成済み契約; gem-source推論は日和見的）。

スライス2b-iiは`Dynamic[top]`で意図的に停止します。メソッドごとの戻り型精度（つまり非`top`静的ファセットを持つ`Dynamic[T]`）は後のスライスにキューに入れられており、まだ`try_dependency_source`エンベロープを通じて表面化しません。現在の可視のペイオフは、オプトインgemメソッドコール上の`call.undefined-method`の不在です（Rigorが`Nominal[T]`でレシーバーを認識できる場合、通常ユーザーがRBSスケルトンを作成したか、RBSがコンストラクターコールを解決したため）。

## 予算強制（スライス4）

ADR-10 §「予算のインタラクション」に従い、各オプトインgemは**別の予算プール**を取得するため、境界の悪いgemがユーザー自身の解析を飢えさせることができません。

単位は**カタログに収集されたメソッド定義数**です。デフォルト`5000`はすべての現実的なオプトインターゲット（Rack≈1500、Faraday≈500、Sidekiq≈800）をカバーしつつ、ユーザーがRBSを同梱するかgemをリスト解除すべきActiveSupport規模のライブラリ（〜10,000+メソッド）に対して診断を表面化します。設定値は`MIN_BUDGET_PER_GEM`（`1250`、デフォルトの0.25×）と`MAX_BUDGET_PER_GEM`（`20000`、4×）定数によって制限されます。

### ウォーカー側キャップ（セマンティクスα）

`Walker.walk(gem_dir:, roots:, budget:)`が単一gemに対して`budget`カタログエントリーに達すると、収集を停止します:

- 現在のファイルの残りの`def`ノードは記録されません。
- 同じgemの後続のファイル（とルート）は訪問されません。
- ウォーカーはキャップに達したことを示すために`Outcome.new(catalog: ..., truncated: true)`を返します。

累積されたカタログは有効なまま;ただしgemを完全にカバーしていません。キャップ前に**収集された**メソッドについては、ディスパッチャーティアは他のカタログヒットと全く同じように動作します（`Dynamic[top]`を返す）。**収集されなかった**メソッド——つまりキャップを過ぎたもの——については、ディスパッチャーは既存のユーザークラスフォールバックパスに落ちます: レシーバークラスがRBS既知だがメソッドが違う場合は通常`call.undefined-method`。

これはADR-10 WD4の**（α）セマンティクス**: 予算は収集をキャップし、ディスパッチはキャップしません。より豊富な（β）セマンティクス（「予算超過gemのクラスへのコールはカタログヒットに関係なく`Dynamic[top]`を返す」）は、{Index}上のクラスからgemへの逆インデックスとそれを参照するディスパッチャーブランチが必要になります;そのフォローアップは（α）の経験が具体的なニーズを表面化した場合の後のスライスにキューに入れられています。

### 診断発行

`Index#budget_exceeded`はビルド中にキャップをトリップしたgem名のフリーズされた配列です。ランナーは`#dependency_source_budget_diagnostics`を通じて実行ごとに一度このリストを消費し、列挙されたgemごとに1つの`dynamic.dependency-source.budget-exceeded` `:warning`を発行します。診断メッセージはgem名、設定されたキャップを名付け、3つの修正方法（RBSを同梱、`mode:`を`full`から`when_missing`に減らす、リスト解除）をユーザーに示します。

重複排除はコールサイトごとではなくgemごとです。記録されていないメソッドが何百もある予算超過gemは正確に1つの警告を生成します;ユーザーは数十の同一メッセージを抑制する必要がありません。

## キャッシュスライス（スライス3）

[`Rigor::Cache::Descriptor`](../cache/)は`DependencyEntry`行を持つトップレベルの`dependencies:`スロットを取得します:

```ruby
Rigor::Cache::Descriptor::DependencyEntry.new(
  gem_name: "rack",
  gem_version: "3.0.0",
  mode: :when_missing
)
```

| フィールド | 型 | 注記 |
| --- | --- | --- |
| `gem_name` | String | エントリーで宣言されたBundle解決可能な名前。 |
| `gem_version` | String | 実行の`Resolved.version`（`Gem::Version`をStringにレンダリング）。 |
| `mode` | `:disabled` / `:when_missing` / `:full` | {Configuration::Dependencies::VALID_MODES}を反映。 |

合成（`Cache::Descriptor.compose`）は`gem_name`でグループ化し、2つのコントリビューターが`gem_version`または`mode`で不一致の場合に`Conflict`を発生させます。有効なデプロイメントではBundlerはgemごとに1バージョンをインストールし、パーサーはgemごとに1エントリーを生成するため、競合パスは例外的です。

`Index#cache_descriptor`はすべての`Resolved`行を`DependencyEntry`に変換し、`dependencies:`スロットが設定されたフリーズされた`Cache::Descriptor`を返します。ADR-10推論出力を観察するキャッシュプロデューサーはこのディスクリプターを自身のもの（`RbsDescriptor`、プラグインディスクリプター、ファイルダイジェスト）と`Cache::Descriptor.compose`を通じて合成するため、列挙されたgemの`bundle update`がそのgemのスライスだけを無効化し、キャッシュの残りをホットのままにします。

`Unresolvable`エントリーは何も貢献しません——キーにするバージョンがなく、ランナーはすでにそれらを`dynamic.dependency-source.gem-not-found`診断として表面化しています。解決済み-無効エントリーは{Builder}によって上流でフィルタリングされ、インデックスに到達しません。

`Cache::Descriptor::SCHEMA_VERSION`はこのスライスで2にバンプされました。正規ハッシュ形状にトップレベルスロットを追加することは定数の文書化された契約に従って非互換な変更であるため、バンプは`Cache::Store#ensure_schema_version!`をトリガーして古い形状のエントリーが孤立として残らないよう最初の実行後にキャッシュルートを消去します。

スライス3エンベロープはgemバージョンごとの無効化の**プリミティブ**を着地させます。ADR-10推論を`Store#fetch_or_compute`経由でルーティングするキャッシュプロデューサーはgemごとの予算機械と並行してスライス4にキューに入れられます。

## 診断ファミリー

依存関係ソースパスで発行されるすべての診断は[`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/) §「診断識別子の分類」に従って`dynamic.dependency-source.*`プレフィックスを使用します。

| ルール | 重大度（作成） | ステータス | 意味 |
| --- | --- | --- | --- |
| `dynamic.dependency-source.gem-not-found` | `:warning` | ライブ（スライス2a） | 列挙されたgemがRubyGemsで解決不能だった。実行は継続; gemは何も貢献しない。 |
| `dynamic.dependency-source.budget-exceeded` | `:warning` | ライブ（スライス4） | gemごとの予算がトリップした。ウォーカーは`dependencies.budget_per_gem`メソッド定義で収集を停止した;残りのサイトは既存のRBS-または-`Dynamic[top]`境界を通じて解決される。実行ごとgemごとに最大1回発行。推奨: RBSを同梱、modeを`full`から`when_missing`に減らす、またはgemをリスト解除。 |
| `dynamic.dependency-source.boundary-cross` | `:info` | **保留 — `mode: full`ディスパッチに依存** | プラグイン契約 / RBSとgem-source推論が戻り型で不一致。プラグインまたはRBSが勝つ;診断は監査のために相違を表面化する。v0.1.3ではディスパッチャーティア順序がプラグインまたはRBSが貢献する際に常にgem-sourceを先取りするため休眠——表面化する重複なし。`mode: full`が独自にディスパッチするようになると意味を持つ。 |
| `dynamic.dependency-source.config-conflict` | `:warning` | ライブ（スライス5d） | `.rigor.yml` `includes:`チェーンが同じgemに対して不一致の`mode:`を持つ2つの`dependencies.source_inference[]`エントリーを生成した。後の（下流インクルード）エントリーが勝つ; `roots:`はサイレントにユニオンされる。競合する`(gem, prior-mode, new-mode)`トリプルごとに1つの診断。 |

[`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/)の分類行はすでに`dynamic.dependency-source.*`ファミリーをカバーしています——ファミリー内の新しいルールが出荷されるにつれ仕様変更は不要です。

## 境界契約

### ADR-2（信頼済みgem信頼モデル）との関係

gemを`source_inference`以下に列挙することは**読み取り専用**の信頼付与です。Rigorはgemのファイルをパースして解析器を通じて実行しますが、コードをロードまたは実行しません。ADR-2 §「プラグインの信頼とI/Oポリシー」の「プラグインはアプリケーションコードを実行してはならない」ルールが逐語的に適用されます。ネットワークアクセスは無効のまま;ファイル読み取りはgemの`roots:`にスコープされたまま。

### ADR-5（堅牢性原則）との関係

[`docs/type-specification/robustness-principle.md`](../../type-specification/robustness-principle/)はRigor作成型が戻り値に対して厳格であることを求めます。Gem-source推論は偶発的に狭い戻り型を生成します——推論された戻り型は今日の実装を反映し、gemの作者がコミットしたであろう契約ではありません。

この緊張は**推論された狭い型を作成済みであるかのように公開しない**ことで解決されます。Gem推論された戻り型は`Dynamic[T]`でラップされます。ラッパーはグラデュアル一貫性セマンティクスを型付き境界を越えて保持しつつ、偶発的に狭い推論への暗黙の依存をブロックします。RBS消去（[`docs/type-specification/rbs-erasure.md`](../../type-specification/rbs-erasure/)）は`Dynamic[T]`を`untyped`としてエクスポートします;静的ファセット`T`は作成済みシグネチャに漏れません。

### ADR-9（クロスプラグインAPI）との関係

プラグイン作者は現在、自分が所有するレシーバーに対してgem-source推論を拒否できません。ADR-10 §「オープンクエスチョン」はこれをおそらくのフォローアップとして特定しています——`Plugin::Base#owns_receiver?`または`manifest`フィールド——しかし少なくとも1つのプラグインがそれを必要とするまで設計を延期します。ディスパッチャーティアの順序付けはとりあえず不在を良性にします: プラグインはdependency-sourceティアの前に参照されるため、レシーバークラスを所有するプラグインは競合時に勝ちます。

## 安定性

「パブリックAPIドリフトサーフェス」で名付けられたサーフェスはv0.1.3の`master`上で未リリースとして安定しており、ドリフトスペックによってロックされています。ADR-10の5スライス実装エンベロープは完了しています;さらなる作業は以下の「オープンクエスチョン」で追跡されています。

## オープンクエスチョン

[ADR-10](../../adr/10-dependency-source-inference/) §「オープンクエスチョン」で追跡 — 具体的なニーズが表面化するにつれ再検討:

- ✅ **レシーバーごとのプラグイン拒否権** — 着地（スライス5a）。プラグインはレシーバークラス（とそのサブクラス、`Environment#class_ordering`経由）の唯一の所有権を主張するために`manifest(owns_receivers: ["ActiveRecord::Base"])`を宣言します。dependency-source-inferenceティアはカタログを参照する前にレジストリを参照します: 登録されたプラグインが所有するレシーバーは辞退するため、プラグイン貢献は権威を維持します。
- **`mode: full`保持** — v0.1.3のディスパッチャーティアは`full`と`when_missing`を同一に扱います。作成上の区別は後の`full`区別ディスパッチが着地した場合のチャーンを避けるために設定サーフェスに残ります。
- **キャッシュサイズキャップ（`dependencies.cache_size`）** — ADR-10 WD5ごとのキャッシュスライスは（gem、バージョン、モード）ごと;グローバルサイズキャップはドッグフーディング中にキャッシュバックエンドが成長問題を示すまで延期されます。
- **設定可能なディスパッチャーティア順序付け** — 狭いケースでプラグイン出力をgemソースに譲らせたいユーザー向け。デフォルト: いいえ、ただし最初の具体的なユーザーリクエストの後に再検討。
- ✅ **より豊富な（β）予算セマンティクス** — 着地（スライス5b）。`dependencies.budget_overrun_strategy: dependency_silence`は（β）セマンティクスにオプトインします: ウォーカーは引き続き`budget_per_gem`でキャップしますが、ディスパッチャーはカタログミス時に`Index#class_to_gem`（クラスごとの逆ルックアップテーブル）を追加参照します;レシーバークラスが予算超過gemに属する場合、コールはユーザークラスフォールバックに落ちる代わりに`Dynamic[top]`に解決されます。デフォルトは後方互換性のために`:walker_cap`（α）のまま。
- **`dynamic.dependency-source.boundary-cross`診断** — 同じレシーバー / メソッドへのRBS対gem-source / プラグイン対gem-sourceの不一致を表面化します。**`mode: full`が独自のディスパッチパスを持つことに依存します。** v0.1.3ではディスパッチャーがプラグイン → RBS → gem-sourceの順にチェックするため、プラグイン / RBS貢献がgem-sourceを完全に先取りします（表面化する重複なし）。`mode: full`がRBSと並行して貢献するようになると（次の「オープンクエスチョン」項目）、バウンダリクロスが意味を持ちます——それまで発火する条件がありません。
- **`dynamic.dependency-source.config-conflict`診断** — `.rigor.yml`パース / マージの不一致（`includes:`を越えた同じgemに対する2つの互換性のないエントリー）を表面化します。設定ローダーの`includes:`監査作業と並行して着地します。
