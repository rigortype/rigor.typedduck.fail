---
title: "ADR-10 — オプトイン依存関係ソース推論"
description: "rigortype/rigor docs/adr/10-dependency-source-inference.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/10-dependency-source-inference.md"
sourcePath: "docs/adr/10-dependency-source-inference.md"
sourceSha: "5cf5d6d75cecefdd21ef95c3d02736e91df891215ea1bedeb29c6dd5498b65f8"
sourceCommit: "5b252bbd814960f6b442a4df7dd41a0d0a79c995"
translationStatus: "translated"
sidebar:
  order: 4010
---

ステータス: **accepted, 2026-05-09; v0.1.4で実装済み**。5つの実装スライス（slice）がすべてランド;`lib/rigor/analysis/dependency_source_inference/`が本番ネームスペース。呼び出しごとの戻り型精度フォローアップは需要駆動のまま。

## コンテキスト

現在のデフォルトはRBSをRigorの外部推論境界として扱います。[`docs/type-specification/inference-budgets.md`](../../type-specification/inference-budgets/) §「境界契約（contract）」と[ADR-2 §「プラグイントラストとI/Oポリシー」](../2-extension-api/)によれば、解析器は:

- メソッドのシグ（インライン`#:`、`# @rbs`、生成されたスタブ、または外部`.rbs`）を**カットオフ**として受け入れます: 呼び出し元は宣言された戻り型を再利用し、メソッド境界で再帰的な戻り型推論は停止します;
- そうでなければバジェットの仕組みを通過し、最終的に`Dynamic[top]`にフォールバックします。

プロジェクトソース（`.rigor.yml`の`paths:`下のファイル）については解析器がすべてのメソッドボディを走査します。それ以外——サードパーティGem、ベンダーソース——については走査がありません。RBSのないGemクラスのメソッドは`Dynamic[top]`に解決され、ユーザーは（a）RBSを提供する、（b）プラグインを作成する、または（c）動的エンベロープを受け入れる、のいずれかが期待されます。

この境界は健全性（soundness）、パフォーマンス、サードパーティ契約サーフェス（surface）の安定性のための正しいデフォルトです。しかし、ユーザーが表面化させた2つの具体的な問題点があります:

1. **「RBSなしGem」の崖**。RBSのない小さなユーティリティGemは、解析器がそのソースを読むことを許可された場合、ユーザー自身のコードと同様に推論できることがよくあります。今日はGemのソースがバンドルに存在していても直接`Dynamic[top]`に降格します。
2. **手作りRBSのオーバーヘッドが非対称です**。メタプログラミングの少ないGemの場合、RBSを手作りする（または`rbs prototype`で生成する）ことは、Rigor自身のエンジンが直接抽出できる情報を複製します。

ユーザーの提案: **RBS / RBS::Inlineソースを提供しないGemについて、依存関係境界で`Dynamic[top]`に降格する代わりに——同じエンジン、同じルールで——RubyImplementationを型ソースとして走査することをRigorに許可する**。

このADRは設計の決定を記録します: **Gemごとのオプトインとして採用し、デフォルト動作の変更としては採用しない**。残りのドキュメントは契約、バジェット / キャッシュ / 来歴の相互作用、ADR-2のtrusted-gemポリシーとの境界を固定します。

## 決定

`.rigor.yml`にRigorがインジェクション中に走査してもよいGemを指定する新しい`dependencies:`設定軸を追加します。この軸は**Gemごとのオプトイン**であり、`paths:`（ユーザーが書いたもの）と`signature_paths:` / `libraries:`（RBS境界）に直交します。`dependencies:`下にリストされていないGemは既存の動作を維持します: RBSかなにもないか。

```yaml
# .rigor.yml
paths:
  - lib

dependencies:
  source_inference:
    - gem: rack
      mode: full         # Gem内のすべてのRubyファイルを走査
    - gem: faraday
      mode: when_missing # シグコントラクトが利用できない場合のみ走査
```

3つの名前付きモードが受け入れられます;追加モードはADR改訂が必要です:

| モード | 挙動 |
| --- | --- |
| `disabled`（リストされていないGemのデフォルト） | 既存のRBS-or-`Dynamic[top]`動作。リストにないGemはこのモードです。 |
| `when_missing` | レシーバークラス / メソッドペアにシグ契約が利用できない場合のみGemソースを走査。RBS / RBS::Inline / 生成されたスタブ / プラグイン契約は常に優先されます。 |
| `full` | RBSも存在する場合でも常にGemソースを走査。推論型とRBS契約はADR-2 §「プラグインコントリビューションマージ」のコントリビューションマージルールで調整されます——コンフリクト時はRBSが権威です。 |

`when_missing`は通常のオプトインに推奨されるデフォルトです。`full`はGemソースがバンドルされたRBSより正確だとユーザーが判断したケース（まれで、意図的で、チャーンリスクを承知の上で）のために存在します。

### 推論契約

コールサイトが`dependencies:`下にリストされたGemのメソッドに解決され、モードがGemソースの走査を許可する場合:

- 解析器は`paths:`を走査するのと同じエンジンを使用してGemの`.rb`ファイルを走査します。メソッドディスパッチ、ナローイング、ファクト（fact）ストア、バジェット適用が変更なく実行されます。
- Gem境界を越える推論された戻り型は[`docs/type-specification/special-types.md`](../../type-specification/special-types/) §「Dynamic-originと未チェック情報」に従って**`Dynamic[T]`でラップされます**。静的ファセット`T`は推論型です; Dynamic-originマーカーはプルーフがGemの作者がコミットした契約ではなくサードパーティソースから来たという事実を保持します。
- このパスで発行される診断は`dynamic.dependency-source.*`プレフィックスファミリーを使用します（[`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/) §「診断識別子分類法」に新しいエントリーが追加されます——以下の「パブリックAPIドリフトサーフェス」を参照）。
- Gem走査でのバジェット消尽はプロジェクトソース走査と同様に`Dynamic[top]`にフォールバックします。Gemのバジェットが切れた場合に捏造された精密な型をサイレントに発行することはありません。

このラッピングが設計を安全にするものです: GemメソッドからDynamic[Integer]を読む消費者はそれをグラウンドトゥルースの`Integer`として扱うことができません。[`docs/type-specification/value-lattice.md`](../../type-specification/value-lattice/) §「Dynamic-origin代数」の<ruby>漸進的一貫性<rp>（</rp><rt>gradual consistency</rt><rp>）</rp></ruby>ルールを持つ値——型付き境界を越えて使用可能ですが来歴は診断のために保持されます——を取得します。Gemの実装が後で今日の推論が認める以上の広い値を返した場合、ラッパーがユーザーのコールサイトをサイレントに壊すのではなく乖離を吸収します。

### 強制除外

`dependencies.source_inference`にGemがリストされていても、Rigorは以下をスキップしなければなりません:

- **C拡張とその他の非Rubyソース**。ソースがない = 走査なし。Gemのシグ（存在する場合）が唯一の契約として残ります。
- **登録されたプラグインが所有権を主張するDSLメタプログラミングを通じてのみロードされるファイル**（例: `rigor-activerecord`が所有するActiveRecord生成属性メソッド）。プラグインはADR-2 §「プラグインコントリビューションマージ」に従った既存の優先順位を維持します。
- デフォルトでは**Gemの`lib/`ディレクトリ外のファイル**（`spec/`、`test/`、`bin/`、トップレベルスクリプト）。別のルートが必要なGemはエントリーごとに`roots:`を指定できますが、デフォルトは`lib/`のみです。

除外はローダーに組み込まれています;ユーザーは設定でそれらをオーバーライドできません。

### キャッシュと無効化

Gemソース推論の結果はADR-6の既存のシャードされた永続化バックエンドを使用してキャッシュされます。Gem名、Gemバージョン、モードごとのディスクリプターエントリーを持ちます:

- キャッシュキーは`(gem_name, gem_version, source_inference_mode)`と既存の解析器 / RBS環境フィンガープリントを含みます。
- リストされたGemのピン留めされたバージョンを変更する`bundle update`はそのGemのキャッシュスライスのみを無効化します。他のGemのスライスとユーザーのプロジェクトスライスは有効なままです。
- `dependencies.source_inference`自体の変更は現在リストされているGemと以前リストされていたGemのユニオンを無効化します（比較はすでに使用中の`Cache::Descriptor::ConfigEntry`の一部です）。

`Cache::Descriptor::PluginEntry`は新しいフィールドを必要としません; GemソースParsは核であり、プラグインコントリビューションではありません。新しい`Cache::Descriptor::DependencyEntry`値オブジェクトが`(gem_name, gem_version, mode)`を運び、既存の`gems:`スロットの隣のディスクリプターにスロットインされます（[ADR-2 §「キャッシュ依存関係は明示的なディスクリプターであるべき」](../2-extension-api/)）。

### バジェット相互作用

Gem走査はプロジェクト全体のプールではなく、**Gemごとの別のバジェットプール**を消費します。形状の悪いGemがユーザー自身の解析を枯渇させることができません:

- 新しい`.rigor.yml`バジェットキー`dependencies.budget_per_gem`（デフォルトは既存の`Configuration::DEFAULTS.budgets.call_graph_width`相当の100%;範囲0.25× – 4×）。各オプトインGemが1つの割り当てを取得します。
- GemのバジェットがトリップするとそのGemの残りのコールサイトは`Dynamic[top]`にフォールバックし、Gem名と推奨事項（RBSを提供するか、Gemのモードをfullからwhen_missingに下げるか、Gemをリストから外す）を報告する単一の`dynamic.dependency-source.budget-exceeded`診断が出力されます。

正確なバジェットテーブルの追加は実装スライスに任されています;制約はGem走査がユーザーのコールグラフとは独立して制限されなければならないということです。

### ADR-2（trusted-gemモデル）との境界

ADR-2 §「プラグイントラストとI/Oポリシー」は**プラグイン**がユーザーの`Gemfile`と`.rigor.yml`で選択された信頼されたRuby Gemであることをすでに確立しています。このADRは同じトラストモデルを`dependencies.source_inference`下にリストされた非プラグインGemに拡張します:

- `source_inference`下にGemをリストすることは**読み取り専用**の信頼付与です。RigorはGemのRubyファイルをパースして解析器を通じて実行します;コードをロードまたは実行することはしません。「プラグインはアプリケーションコードを実行してはならない」ルールがGemソース推論にも文字通り適用されます。
- ネットワークアクセスはADR-2に従って無効のままです。
- ファイル読み込みはGemの`roots:`（デフォルト`lib/`）にスコープされます。そのスコープ外への読み込み試行はサイレントな成功ではなくローダーエラーです。

### 堅牢性原則（ADR-5）との境界

[`docs/type-specification/robustness-principle.md`](../../type-specification/robustness-principle/)はRigorで作成された型が**戻り値では厳格に、パラメーターでは寛容に**であることを求めます。他の誰かの実装に対するGemソース推論は偶発的に**狭い**戻り型を生成します——推論された戻り型は現在の実装を反映し、GemWriterがコミットした契約ではありません。

このADRはその緊張を**狭い推論型を作成されたものとして決して公開しない**ことで解決します:

- Gem推論された戻り型は`Dynamic[T]`でラップされます。`T`は今日の狭い形状を運びます;ラッパーが消費者のコールサイトが実際に見るものです。
- Rigorで作成されたシグのRBS消去は引き続き堅牢性原則を尊重します。Gem推論された形状は作成されたRBSとしてラウンドトリップすることはありません——それらは解析時の推論のみです。

堅牢性原則はRigor自身の出力を引き続き拘束します。ユーザーがオプトインしたGemソースから推論された形状を遡及的に拘束することはありません。

## パブリックAPIドリフトサーフェス

このADRが追加するもの:

- `Rigor::Configuration#dependencies`（新しいattr_reader;新しい`Configuration::Dependencies`値オブジェクトが`source_inference: [Configuration::Dependencies::Entry]`を運ぶ）。
- `Rigor::Configuration::Dependencies::Entry`（新しいfrozen Data: `gem:`、`mode:`、オプションの`roots:`）。
- `Rigor::Cache::Descriptor::DependencyEntry`（新しいfrozen Data: `gem_name:`、`gem_version:`、`mode:`）。
- `Rigor::Analysis::DependencySourceInference`（新しいネームスペース; GemのRootsに対して`Rigor::Analysis::Runner`の仕組みを再利用するモジュールレベルウォーカー）。
- 新しい診断プレフィックスファミリー`dynamic.dependency-source.*`。初期エントリー: `dynamic.dependency-source.budget-exceeded`、`dynamic.dependency-source.boundary-cross`、`dynamic.dependency-source.config-conflict`。[`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/)の分類テーブルにファミリーの行が追加されます。
- `.rigor.yml`（およびバンドルされたJSONスキーマ）の新しい設定スキーマエントリー: `gem`、`mode`（enum: `disabled` / `when_missing` / `full`）、オプションの`roots`を持つ`dependencies.source_inference[]`。

すべての更新は、各サーフェスを導入する実装スライスと同じコミットの`spec/rigor/public_api_drift_spec.rb`に着地します。

## 実装スライシング

推奨順序;各スライスは独立して出荷可能です。スライス1–3が使用可能な機能を提供します;スライス4–5はポリッシュで延期できます。

1. **設定配線。— LANDED (v0.1.4)**
   `Configuration::Dependencies::Entry`、パーサー、ドリフトスナップショット、JSONスキーマエントリー。解析器の配線はまだなし——`dependencies.source_inference`を持つ設定のロードは成功しますが、推論はリストされたGemをデフォルトのRBS-or-`Dynamic[top]`境界として扱い続けます。
2. **ウォーカー + ディスパッチティア。— LANDED (v0.1.4)**
   `Analysis::DependencySourceInference`がリストされたGemの`lib/`を走査し、推論された戻り型を今日のプラグインが使用する`flow_contribution_for`基板を通じて`Dynamic[T]`として提供します。新しいティア順序: コアRBS > `RBS::Extended` > プラグイン > **依存関係ソース推論** > エンジンフォールバック。プラグインは作成された契約であり、Gemソース推論は日和見的なため、プラグインより下位。
3. **キャッシュディスクリプター + 無効化。— LANDED (v0.1.4)**
   `Cache::Descriptor::DependencyEntry`がディスクリプターに着地します。リストされたGemの`bundle update`がそのGemのスライスのみを無効化します。
4. **Gemごとのバジェット + バジェット超過診断。— LANDED (v0.1.4)**
   `dependencies.budget_per_gem`設定エントリー、Gemごとの別のバジェットプール、`dynamic.dependency-source.budget-exceeded`の発行。
5. **ドキュメント更新。— LANDED (v0.1.4)**
   `inference-budgets.md`、`special-types.md`、`diagnostic-policy.md`へのクロスリンクを追加。エンドユーザーハンドブック章はオプション（少なくとも1つのTier-2ユーザーGemがオプトイン推奨を提供するまで延期）。

## 作業上の決定

### WD1 — なぜオプトインで、オプトアウトではないか？

オプトアウト（デフォルト = 除外されない限りすべてのGemを走査）が検討されて却下されました:

- **サーフェスエリア**。典型的なRailsアプリのバンドルは数百のGemです。すべてを走査するとGemごとのバジェット上限があっても解析バジェットとキャッシュフットプリントが爆発します。
- **安定性**。GemソースからのParsed型は毎パッチリリースで変わります。オプトアウトデフォルトはユーザーに`bundle update`での偽陽性チャーンの長いテールを渡します。
- **同意**。ADR-2のトラストモデルは明示的です: ユーザーはRigorが読むGemを選択します。オプトアウトはプラグインではなくソース推論のためにそれを逆にしますが、これは一貫性がありません。

オプトインはデフォルト動作を同一に保ち（RBS-or-nothing）、ユーザーがバジェットコストを支払いたい箇所でのみGemごとに機能を拡張できます。

### WD2 — なぜグラウンドトゥルースの`T`ではなく`Dynamic[T]`か？

ラッパーは来歴を保持します。ナローイングのために値を`Integer`として扱う必要がある消費者はすでに境界を越えて`Dynamic[Integer]`を認める漸進的一貫性ルールを持っています。ラッパーは通常の使用をブロックしません; **Gemパッチリリースを生き残れない可能性がある偶発的な狭い推論への無言の依存**のみをブロックします。上記のADR-5との境界の議論を参照してください。

ユーザーが信頼するGemからのグラウンドトゥルースの精度が必要な場合、そのGemにRBSを提供できます（既存のパス）。Gemソース推論パスはグラウンドトゥルースのRBSが存在せず、ユーザーが来歴タグ付きの動的戻り型を受け入れる意思があるGemのためです。

### WD3 — なぜデフォルトで`spec/`、`test/`、`bin/`を除外するか？

ほとんどのRuby Gemの`lib/`はパブリックサーフェスです。テストコードは`RSpec`、`Minitest`、`Test::Unit`スタイルのグローバルを参照しますが、解析器はテストフレームワークプラグインなしではそれを認識せず、走査することで`call.undefined-method`のノイズが殺到します。トップレベルスクリプトはしばしばランタイムコンテキスト（`bundle/setup`、`ARGV`、ENV）を要求し、その推論を脆くします。

非`lib/`ルートを推論したいユーザーはエントリーごとに`roots:`を列挙できます。デフォルトは狭いままです。

### WD4 — なぜGemごとに別のバジェットプールか？

共有プールは形状の悪い1つのGemがユーザー自身の解析を枯渇させることを許します。Gemごとのプールは任意の単一オプトインの最悪ケースの貢献を上限とします: GemのバジェットがトリップするとユーザーはそのGemのみの`Dynamic[top]`と名前を挙げた単一の診断を取得します。ユーザー自身の`paths:`走査は影響を受けません。

### WD5 — キャッシュディスクリプタースコープ: Gemバージョンごと

`(gem_name, gem_version, mode)`でキー付けされたキャッシュスライスにより`bundle update`が影響を受けたGemのみを無効化できます。より広いキー（例: `Gemfile.lock`ダイジェスト）はいずれか単一のGemのアップグレードですべてのGemのスライスを無効化します——正確性のためには問題ありませんが、Railsモノレポでの増分リビルドには無駄です。狭いキーはADR-2 §「キャッシュ無効化には宣言的APIが必要」と一致します。

### WD6 — Gem走査はプラグインより厳密に下位のティアに着地

プラグインは作成された契約です: プラグイン作成者は形状にコミットします。Gemソース推論は日和見的です: GemWriterはそのようなコミットメントをしませんでした。ディスパッチャーティア順序（コアRBS > `RBS::Extended` > プラグイン > 依存関係ソース推論 > エンジンフォールバック）はそれを反映します。GemのParsed戻り型に矛盾するプラグインが勝ちます;解析器はユーザーが監査できるよう乖離を`dynamic.dependency-source.boundary-cross`として報告します。

### WD7 — Gem推論された形状はRBSとしてラウンドトリップしない

[`docs/type-specification/rbs-erasure.md`](../../type-specification/rbs-erasure/)がRigor → RBSエクスポートを管理します。Gem推論された形状は**内部的な**ファクトです。GemWriterがその形状にコミットしていないため、作成されたRBSとして決して消去されません。`Dynamic[T]`ラッパーは既存の消去契約に従って`untyped`としてエクスポートされます;静的ファセット`T`は作成されたシグに漏れません。

これはプラグイン作成者の意図なしにプラグイン派生の動的メンバーが作成されたRBSとしてエクスポートされることを防ぐのと同じルールです。

## 検討された代替案

- **バンドル内のすべてのGemをデフォルトで走査**（オプトアウト）。WD1を参照。
- **Gemごとのオプトインなしに、プロジェクト全体でRBSが存在しない場合のみ走査**。却下: ユーザーはどのGemがバジェットコストを払うかを制御できません。パッチリリースのチャーンがサイレントに表面化します。堅牢性原則違反がサイレントに表面化します。
- **Gemソースをプラグインスタイルのコントリビューションとして扱う**。却下: これはコアエンジン作業であり、フレームワーク形状ではありません。プラグイン契約を通じて強制することはプラグインサーフェスを肥大化させるかエンジンを複製するかのどちらかになります。
- **キャッシュ`Gemfile.lock`ダイジェストを粒度として**。WD5に従って却下。
- **Gem推論された形状を作成されたRBSとしてラウンドトリップさせる**。WD7に従って却下——GemWriterが書いたかのように偶発的な推論を固定化し、パッチアップデートで壊れます。

## オープンクエスチョン

- ディスパッチャーティア順序は、ユーザーが狭いケースでプラグイン出力をGemソースに譲歩させたい場合に備えてプロジェクトごとに設定可能にすべきか？ デフォルト: いいえ、ただし最初の具体的なユーザーリクエストの後に再検討。
- `mode: full`はまったく許可すべきか、それとも`disabled`と`when_missing`のみで出荷して後で`full`を追加すべきか？ 決定はスライス2に延期——両方で開始し、具体的なユースケースが着地しなければ`full`を撤回。
- オプトインモノレポがキャッシュバックエンドを吹き飛ばさないようにバジェットテーブルに`dependencies.cache_size`上限を追加すべきか？ 決定はスライス3に延期——スライス2のドッグフーディング中にキャッシュが成長問題を示した場合のみ追加。
- プラグイン作成者が自分たちが所有するレシーバーに対するGemソース推論を**拒否する**フックを取得すべきか？（例えば`rigor-activerecord`がプラグイン生成メンバーとの衝突を避けるために`ActiveRecord::Base`サブクラスの推論を拒否する）おそらくはい、新しい`Plugin::Base#owns_receiver?`または`manifest`フィールドを通じて。決定はスライス2に延期——ウォーカーが存在した後に配線します;必要性が具体的であればフォローアップADR改訂として仕様化します。

## 改訂履歴

- 2026-05-09 — 初回提案。シグネチャーソースのないGemのためにRBSのみの外部境界を緩和するユーザーリクエストによって引き起こされました。
- 2026-05-xx — accepted;5つのスライスすべてをv0.1.4で実装。`lib/rigor/analysis/dependency_source_inference/`が本番ネームスペース（6モジュール: builder、gem_resolver、index、return_type_heuristic、walker、boundary_cross_reporter）。
