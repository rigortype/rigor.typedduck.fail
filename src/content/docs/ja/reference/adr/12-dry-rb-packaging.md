---
title: "ADR-12 — dry-rbプラグインパッケージング"
description: "rigortype/rigor docs/adr/12-dry-rb-packaging.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/12-dry-rb-packaging.md"
sourcePath: "docs/adr/12-dry-rb-packaging.md"
sourceSha: "dbb832bcd74374532d24d3ca940fe6587e13f047127977f2b45b254d8e6175bb"
sourceCommit: "fe4e9a80df3829ee4f113e763e4bb9920c33da21"
sourceDate: "2026-05-16T03:16:06+09:00"
translationStatus: "translated"
sidebar:
  order: 4012
---

Status: **accepted, 2026-05-16.** Rigorのdry-rbアダプタプラグインのパッケージング形態を決定し、個々の`rigor-dry-*`の作業を基本事項を再議論することなく開始できるようにします。

## コンテキスト

dry-rb gemファミリーは相補的なgemのツリーです: `dry-types`、`dry-struct`、`dry-validation`、`dry-monads`、`dry-schema`、`dry-effects`、`dry-events`、`dry-system`、`dry-files`、その他いくつか。これらはイディオム（コンストラクタスタイルのクラス、structベースの属性リスト、Monadライクな戻り値エンベロープ）を共有しますが、各gemは独自のDSL面を公開します。サーベイ[`20260509-dry-plugins-roadmap.md`](../../design/20260509-dry-plugins-roadmap/)は、静的解析で重要となるgem、それらのgem間の依存関係、各gemが公開する型形成面の拘束的なインベントリです。

[`rigor-dry-struct`](../../plugins/rigor-dry-struct/)はv0.1.5で最初のdry-*プラグインとして出荷され、[ADR-16](../16-macro-expansion/)のTier C（heredocテンプレート）基板を実践しました。`rigor-dry-types`、`rigor-dry-validation`、`rigor-dry-monads`の形態は`rigor-dry-struct`と十分に似ているため、次のプラグインが出荷される前にパッケージングの問い —**1つのメガgemか？ gemごとか？ 中粒度バンドルか？ メタアンブレラか？**— に明示的に答える必要があります。

同じ問いはRailsプラグインファミリーについて[`docs/design/20260508-rails-plugins-roadmap.md`](../../design/20260508-rails-plugins-roadmap/)で答えられました: `plugins/rigor-<id>/`の下にステージングされたgemごとのプラグイン、各プラグインの契約が安定したら`git subtree split`で抽出、将来の`rigor-rails`メタgemがTier 1+2プラグインをgem依存として列挙する。同じパターンがdry-rbにも有効です。

## 決定

**Railsプラグインファミリーパターンに合致する、gemごとのプラグイン + メタアンブレラ**。

- 各dry-* gemは独自のRigorプラグインを持つ: `rigor-dry-types`、`rigor-dry-struct`、`rigor-dry-validation`、`rigor-dry-monads`、`rigor-dry-schema`、… 上流のgem境界と1対1で対応する。
- プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従い、`plugins/rigor-dry-<id>/`の下にステージングされる。
- プラグインの契約が安定したら、Railsプラグインファミリーが使用するのと同じスケジュールとレディネスチェックリストで、`git subtree split`により独自の公開gemとして抽出される。
- 将来の`rigor-dry-rb`メタgemがツリー内プラグインをgem依存として宣言し、Gemfile 1行でユーザーがスタック全体をオプトインできるようにする。

却下された代替案は「考慮した代替案」セクションに記録されています。

## シーケンス

サーベイ[`20260509-dry-plugins-roadmap.md`](../../design/20260509-dry-plugins-roadmap/)からのボトムアップ依存順序が引き継がれます。

1. **`rigor-dry-types`**（Tier A基盤）。`Types::String` / `Types::Coercible::Integer` / `Types::Strict::Bool` / …という定数を認識し、属性ごとの型として`Nominal[String]`等を貢献する。すべての上位tierプラグインの基盤。
2. **`rigor-dry-struct`**（Tier A、v0.1.5でLANDED）。ADR-16のTier C基板経由ですでに出荷済み。ADR-12以前のパッケージングはすでにこの決定に整合していたため、再パッケージング不要。
3. **`rigor-dry-validation`**（Tier A）。`Dry::Validation::Contract`サブクラスとその`schema`/`params` DSLを認識する。キーごとの型については`rigor-dry-types`の上に構築。
4. **`rigor-dry-monads`**（Tier B）。戻り型を`Result[T, E]` / `Maybe[T]`エンベロープでラップする。Tier Aプラグインからは独立しているが、Tier Aプラグインが内側の`T`を型付けする場合は共存する。
5. **`rigor-dry-schema`**（Tier A）。`dry-validation`に類似するがスタンドアロン。実務ではvalidationよりも優先度が低い。
6. **`rigor-dry-effects`**（Tier B）。エフェクトシステムDSL。十分にニッチなため需要駆動。
7. **Tier C / D / E / F** — サーベイの分類に従って先送り。

次のスライスは**`rigor-dry-types`**（Tier A基盤）です。

## プラグイン契約の再利用

[ADR-16](../16-macro-expansion/)の4つの基板Tierが構成要素となります。

| dry-* gem | 基板Tier（想定） | 注記 |
| --- | --- | --- |
| `dry-types` | 手書きウォーカー（定数解決） | 各`Types::Foo`リテラルは定数参照;基板Tierに乗せるべきクラス本体DSLが存在しない。 |
| `dry-struct` | Tier C（heredocテンプレート） | LANDED。`attribute :name, T`ごとのメソッド発行。 |
| `dry-validation` | Tier A（block-as-method） + ウォーカー | `schema { … }`ブロックがスキーマDSLレシーバーに対して実行される;ブロック面についてはblock-as-methodを、キーについては手書きウォーカーを組み合わせる。 |
| `dry-monads` | `flow_contribution_for` | 戻り型書き換え（`def x; Success(42); end`→`Result[Integer, untyped]`）は完全に戻り型計算;クラス本体DSLは存在しない。 |
| `dry-schema` | dry-validationと同じ | 対称なDSL。 |
| `dry-effects` | Tier AまたはTier B | 観察されたイディオム的使用に依存 — 具体的なプラグインが始まるまで先送り。 |

プラグイン作者は上流DSLの形状に応じて基板Tierを選ぶ;ここでのパッケージング決定は、各プラグインがどのTierを使うことになるかとは直交する。

## プラグイン横断のファクト依存

上位tierプラグインは[ADR-9](../9-cross-plugin-api/)の`Plugin::FactStore`チャネル経由でTier-Aプラグインのファクトを消費します。dry-*プラグインの正準なチャネル名は次のとおり。

- `:dry_type_aliases` — `rigor-dry-types`が発行、`rigor-dry-struct` / `rigor-dry-validation` / `rigor-dry-schema`が消費し、`MyTypes::Email = Types::String.constrained(format: …)`エイリアスがプラグイン横断で可視となる。
- `:dry_struct_attributes` — `rigor-dry-struct`が発行、各structの属性リストを知る必要がある下流プラグイン（例: シリアライザプラグイン）が消費。
- `:dry_validation_keys` — `rigor-dry-validation`が発行、コントローラがparams検証をdry-validation Contractに委譲した場合の`rigor-actionpack` strong-params認識器が消費。

正確なfact-storeペイロード形状はプラグインごとに決定する;このADRはプラグイン横断の協調パターンにのみコミットする。

## 公開API漂流面

ADR-12自体は新しいコード面を追加しません。プラグインごとのgemspecがそれぞれ公開APIを成長させ、[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)がこれをピン留めしなければなりません;Railsプラグインファミリーの先例に従い、プラグイン内部のクラス（ウォーカー、fact-storeペイロードクラス）は漂流スナップショットの外側に残る — `Plugin::Base`サブクラスとその`#manifest`形状のみがピン留めされる。

## ワーキング決定

### WD1 — なぜgemごとなのか、メガ`rigor-dry-rb` gemではないのか？

3つの議論をまとめて。

1. **肥大化**。dry-typesのみのコードを解析するユーザーは、必要としないvalidation / monads / schemaウォーカーを読み込むことになる。ADR-2に従ったウォーカーtier順序（RBS > `RBS::Extended` > プラグイン > …）は、レシーバークラスが一度も現れなくても読み込まれたすべてのプラグインがディスパッチに参加することを意味するため、バンドルサイズが重要。
2. **結合**。dry-* gemは上流で独立してバージョン管理される（`dry-types` 1.7と`dry-monads` 1.6など）。メガgemは、1つのプラグインのウォーカーしか変更されていない場合でも、依存のいずれかがバンプされるたびにリリースする必要がある。
3. **先例**。Railsプラグインファミリーはすでにgemごと + メタアンブレラを選択しており、メタgem（計画中の`rigor-rails`）がTier 1+2プラグインをgem依存として列挙する。dry-rbでも同じパターンを繰り返すことで、エコシステムが一貫したものとなる。

### WD2 — なぜ中粒度バンドル（例: types + struct + validation + schemaの`rigor-dry-data`）にしないのか？

中粒度バンドルは魅力的に見える。なぜならdry-rbサーベイはファミリーをTier A〜Fに分類するからだ。しかし、その分類は**解析的形状**（プラグインが何をするか）によるものであって、**ユーザーが何をインストールするか**によるものではない。ユーザーは`dry-validation`（Tier A）なしで`dry-struct`（Tier A）を使うかもしれない — クラスタは共インストールを予測しない。gemごとの方が実際のGemfileパターンに忠実である。

例外は、2つの上流gemが密結合していてプラグインウォーカーを分割することが不格好になる場合（例: `dry-schema` + `dry-validation`はキー型強制DSLを共有する）。プラグイン作者は**ウォーカーコード**が真に重複する場合に2つのプラグインを1つにマージしてもよい（MAY）;それ以外のすべての場合にはパッケージング決定はgemごとのまま。

### WD3 — Subtree-splitレディネスチェックリスト（Railsから継承）

`rigor-dry-<id>`プラグインが`git subtree split`の準備が整うのは次のとき。

1. プラグインの`manifest`、ウォーカー、統合specが、次の1ヶ月の変更が追加的（破壊的なシグネチャ変更なし）と言える程度に安定している。
2. `spec/integration/plugins/<plugin_name>_plugin_spec.rb`の下に、プラグインの外部クローンに対してCIされる程度に作り込まれた統合specがある。
3. `public_api_drift_spec.rb`がプラグインの`Plugin::Base`サブクラスとmanifest形状をピン留めしている。
4. プラグインの`README.md`に「このプラグインがすること / しないこと」セクションがあり、ユーザーがそれを必要とするかどうか判断できる。

チェックリストはRailsプラグインのレディネス条件と一致する;dry固有の例外はなし。

### WD4 — メタアンブレラ`rigor-dry-rb`は先送り

アンブレラgemは**計画されているがコミットはされていない**。着地するのは次のとき。

1. 3つ以上の`rigor-dry-*`プラグインがsubtree split経由で出荷されている;AND
2. ユーザーが「スタック全体の1行インストール」を、メタgemの保守オーバーヘッド（リリース調整、サブgem間の依存バージョンピン）を正当化する形で要求している。

それまでは、ユーザーは個々のgemを`Gemfile`に列挙できる。

### WD5 — `rigor-dry-types`が次の具体的なスライス

次の実装ステップは`plugins/rigor-dry-types/`です。すべての上位tier dry-*プラグインが読むべき基盤。プラグインの作業は、`Types::String` / `Types::Coercible::Integer` / `Types::Strict::Bool`の定数参照を認識し、属性ごとの型を貢献する手書きウォーカーに集中する。これにより下流プラグイン（`rigor-dry-struct`、`rigor-dry-validation`）が[ADR-9](../9-cross-plugin-api/)の`:dry_type_aliases`チャネル経由でそれらを拾える。

## 考慮した代替案

- **単一の`rigor-dry-rb`メガgem**。WD1に従って却下。
- **tier別の中粒度バンドル**。WD2に従って却下。
- **2つのプラグインのインラインマージ（例: `rigor-dry-schema-validation`）** — WD2に従い、ウォーカーコードが真に重複する場合**のみ**許可される;デフォルトはgemごとのまま。
- **個々のプラグインが存在する前に`rigor-dry-rb`アンブレラを先行出荷する** — 却下;アンブレラは利便性であり、前提条件ではない。WD4に従う。

## 未解決の問い

- **`dry-rails`アダプタの取り扱い**。`dry-rails`はdry-*をRailsに配線する;`rigor-dry-rails`を別途必要とするか、それとも`rigor-rails`（計画中のメタgem）がそれを吸収するか？ 決定は`rigor-rails`が着地するときに先送り。
- **dry-monadsの`Result[T, E]`キャリア**。`Rigor::Type::*`内の忠実なResult / Maybeキャリアがあれば、`rigor-dry-monads`が`.success?` / `.failure?`述語に正確なナローイングを貢献できる。今日のプラグインは`flow_contribution_for`が`Dynamic[T]`タグ付き和を返すことで貢献している。キャリア導入は別個のADR（ADR-3の修正）であり、ここではスコープ外。

## 改訂履歴

- 2026-05-16 — 初回提案 + 受諾、dry-rbプラグインファミリーのgemごと + メタアンブレラを確定。v0.1.5リリース後のv0.1.6サイクルスコーピング議論が発端。
