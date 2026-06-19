---
title: "ADR-40 — `config_schema`で宣言するデフォルト値（`{kind:, default:}`）"
description: "Imported from rigortype/rigor docs/adr/40-config-schema-defaults.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/40-config-schema-defaults.md"
sourcePath: "docs/adr/40-config-schema-defaults.md"
sourceSha: "77f8bc0f5435a1e52283364fffc7fedaf91005bdf223a5ec1a8071b829a149fc"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4040
---

Status: **Accepted, 2026-06-02.** `{kind:, default:}`という拡張された`config_schema`値形式 + `Manifest#config_defaults`アクセサ + `Plugin::Base#config`のデフォルトマージが実装され、`rigor-statesman` / `rigor-pundit` / `rigor-actioncable`（およびさらなるプラグインが段階的に）が`DEFAULT_*`定数イディオムから移行されました。後方互換: 素の種別の値形式（`"key" => :string`）は変わりません。

プラグインの`config_schema`が値の種別と並んで**デフォルト値**を宣言できるようにする決定を記録します。これによりエンジンがユーザー設定の下に宣言されたデフォルトをマージし、約17個のバンドルプラグインで繰り返されている`DEFAULT_*`定数 + `config.fetch("key", DEFAULT_KEY)`イディオムが退役します。

根拠となる計画: [`docs/design/20260602-plugin-boilerplate-reduction-plan.md`](../../design/20260602-plugin-boilerplate-reduction-plan/) § Phase 0d（`config.fetch` + `DEFAULT_*`の重複、件数17）。

## Context

プラグインの`Manifest`は既に、受け入れる各設定キーを値の種別（`:string` / `:boolean` / `:integer` / `:array` / `:hash` / `:any`）にマップする`config_schema:`を保持しています。`Manifest#validate_config`はそれを使って、ローダーがユーザーの`.rigor.yml`プラグイン設定を読むときに未知のキーや種別不一致の値を拒否します。

しかしスキーマは*種別*だけを宣言し、*デフォルト*は決して宣言しません。そのため設定可能なプラグインはすべて、同じ2部構成のイディオム——キーごとの`DEFAULT_*`定数に加え、読み出し時の`fetch`-with-default——を再実装しています:

```ruby
class Statesman < Rigor::Plugin::Base
  manifest(
    id: "statesman", version: "0.1.0",
    config_schema: {
      "dsl_method" => :string,
      "state_method" => :string,
      "transition_method" => :string
    }
  )

  DEFAULT_DSL_METHOD = "state_machine"
  DEFAULT_STATE_METHOD = "state"
  DEFAULT_TRANSITION_METHOD = "transition_to"

  def init(_services)
    @dsl_method = config.fetch("dsl_method", DEFAULT_DSL_METHOD).to_sym
    @state_method = config.fetch("state_method", DEFAULT_STATE_METHOD).to_sym
    @transition_method = config.fetch("transition_method", DEFAULT_TRANSITION_METHOD).to_sym
  end
end
```

デフォルトは**2度**存在します——一度は概念的にスキーマ内に（スキーマは既にキーを名指ししている）、もう一度は読み出し側が`fetch`を通して引き回すことを覚えていなければならない独立した定数として。スキーマがデフォルトの自然な置き場です。種別の置き場であるのと全く同じように。これがボイラープレート削減計画がフラグを立てたPhase 0dの重複です。

## Working Decision

`config_schema`の値形式を拡張します: 値は既存の素の種別（`Symbol` / `String`）**または**`kind:`（必須）とオプションの`default:`を保持する`Hash`のいずれであってもよい（MAY）。

```ruby
config_schema: {
  "dsl_method"        => { kind: :string, default: "state_machine" },
  "state_method"      => { kind: :string, default: "state" },
  "transition_method" => { kind: :string, default: "transition_to" }
}
```

- `Manifest`は各値を2つのフリーズされたマップへパースします: 既存の`config_schema`種別マップ（`{ "key" => :kind }`、**形状は不変**なので`validate_config` / `to_h` / `==`は動き続ける）と、新しい`config_defaults`マップ（`{ "key" => default }`、デフォルトを宣言したキーに対してのみ）。
- `Manifest#config_defaults`は公開リーダーです（公開APIドリフトスペック + RBSシグで固定）。
- 宣言された`default:`はマニフェスト構築時に宣言された`kind:`に対して検証されるため（`value_matches?`を再利用）、タイポのあるデフォルト（`kind: :string`の下での`default: 5`）は使用時に静かにではなく、ロード時に声高に失敗します。
- `Plugin::Base#initialize`は`manifest.config_defaults.merge(config)`（ユーザー設定が勝つ）をフリーズされた`#config`として格納します。したがってプラグインは`config.fetch("dsl_method")`（または`config["dsl_method"]`）を読むと、`DEFAULT_*`定数も第2のデフォルト引数もなしに宣言されたデフォルトを得ます。プラグインが依然望む型強制（`.to_sym`、`Array(...)`）は読み出し側に留まります。

### なぜこれが後方互換でFP安全なのか

- **値文法の純粋なスーパーセット**。素の種別の値（`"key" => :string`）はデフォルトを記録せず以前と全く同じようにパースされるので、既存のあらゆるマニフェストと未移行のあらゆるプラグインは手つかずです。それらに対して`config_defaults`は`{}`であり、マージはノーオペレーションです。
- **新しい診断なし、推論変更なし**。これはプラグイン設定のエルゴノミクスであり、型束もどのルールも変えません。偽陽性を導入することはできません。
- **キャッシュセーフ**。永続キャッシュはプラグインを`（id, version,ユーザー設定ハッシュ）`（[`Cache::Descriptor::PluginEntry`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cache/descriptor.rb)）でキーイングし、マニフェストの`to_h`ではキーイングしません。デフォルトはプラグインの*コード*（そのバージョン）の一部なので、デフォルトを変えることは他のあらゆる振る舞い変更と同様のバージョンバンプです——既存のキーイングが既にそれを捕捉しています。`config_defaults`を`Manifest#to_h`に追加しても`Manifest#==` / `#hash`にのみ影響し、キャッシュキーには決して影響しません。

## Slices

1. **このADR（メカニズム + 最初のコンシューマー）**。 `Manifest`のパース + `config_defaults`リーダー + デフォルト種別検証 + `Base#config`マージ + ユニットテスト + ドリフト/RBSの固定。最初のコンシューマー（クリーンなstring / array-defaultのケース）として`rigor-statesman` / `rigor-pundit` / `rigor-actioncable`を移行する。
2. **残りプラグインの移行** — その他の設定可能なバンドルプラグイン（`activerecord` / `actionpack` / `actionmailer` / `sidekiq` / `rails-routes` / `rails-i18n` / `factorybot` / `sorbet` / …）が`DEFAULT_*`から段階的に移行し、各々がゴールデンマスター統合スペックに対して振る舞いを保存する。純粋なクリーンアップ、需要駆動。

## Relationship to other ADRs

- **ADR-2** — ADR-2 §「Registration, Configuration, and Caching」が固定する`config_schema`フィールドを拡張する;新しい値形式はそのサーフェスに対して加法的である。
- **ADR-37 / ADR-38** — 同じ「エンジンが1つの明確に定義された場所で消費する宣言的マニフェストフィールド」モデル;ここでの場所は推論ゲートではなく`Base#config`である。
- **ボイラープレート削減計画Phase 0a–0e** — 0dは、着地済みの0a（`Source::Literals`）、0b/0c（`Diagnostic.from_node` / `Base.suggest`）、0e（`Plugin::Inflector`、ADR-39）の兄弟である。

## Rejected / deferred alternatives

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| 別個の`config_defaults:`マニフェストフィールド（`config_schema:`と並列） | Rejected | 1つの概念を、作者が同期させ続けねばならない2つのフィールドに分割する;種別とデフォルトは同じキーに属するので、`{kind:, default:}`という値はそれらを一緒に保つ。 |
| 素の種別形式のみを維持し、`defaults:`ハッシュ経由でデフォルトを追加 | Rejected | 同じソース分割の問題;またスキーマが種別なしでキーを名指しできる状態を残す。 |
| デフォルト値を深くフリーズする（再帰的に） | Deferred | デフォルトは読み出し側がコピーするスカラー / 浅い配列（`Array(...).map`）である;`config_defaults`マップの浅いフリーズで十分。可変なネストされたデフォルトが宣言された場合にのみ再検討する。 |
| マージされた値を宣言された種別へ自動的に型強制する（例: `:string` → `String()`） | Rejected | 読み出し側は既に望む型強制（`.to_sym`、`Array()`）を所有している;自動型強制は生のYAML値に依存するプラグインを驚かせ、「デフォルトをマージする」スコープの外である。 |

## Consequences

ポジティブ:

- 設定可能なバンドルプラグイン全体で`DEFAULT_*`定数 + `fetch`-with-defaultイディオムを退役させる;デフォルトは、既にキーを名指ししているスキーマ内で一度だけ宣言される。
- 宣言されたデフォルトはロード時にその種別に対して検証され、静かな誤った型付けのデフォルトを声高なマニフェストエラーに変える。
- 小さな加法的サーフェス: 1つの拡張された値形式、1つのリーダー、`Base#initialize`内の1行のマージ。新しいフックなし、推論変更なし。

ネガティブ:

- `config_schema`内の2つの受け入れられる値形式（素の種別 / `{kind:, default:}`）は、文書化すべき文法がわずかに増える——素の形式が最もシンプルなケースのまま留まり、検証メッセージが期待される形状を名指しすることで緩和される。
- デフォルトなしだが非nilの「未設定」センチネルを持つキーを*望む*プラグインは、依然`config["key"]` → `nil`を読む;デフォルトメカニズムは「必須キー」をモデル化しない（それは`validate_config`の未知キー / 種別の仕事のまま）。今日これを必要とするプラグインはない。
