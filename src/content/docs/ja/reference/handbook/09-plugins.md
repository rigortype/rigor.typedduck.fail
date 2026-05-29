---
title: "プラグイン"
description: "rigortype/rigor docs/handbook/09-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/09-plugins.md"
sourcePath: "docs/handbook/09-plugins.md"
sourceSha: "51f5ea18b118a06eb1aa4f86cafc65c2738fe3f8ab6d78a3bea185fe3858ab77"
sourceCommit: "203008e9741e8ffd61448e32cf9b89c19f1339da"
translationStatus: "translated"
sidebar:
  order: 1009
---

これが最も短い章です。プラグインが存在する理由はひとつ: 一部のメソッドの型が、どんなRBSシグでも表現できない方法で**ランタイムでの引数のシェイプに依存する**からです。

## プラグインを使うとき

典型的なケースはドメイン固有の評価器です:

```ruby
Lisp.eval([:+, 1, 2])           # ランタイムでInteger
Lisp.eval([:<, 1, 2])           # ランタイムでbool
Lisp.eval([:if, true, "a", 0])  # ランタイムでString | Integer
```

戻り値型は引数配列の先頭のリテラルシンボルに依存します。RBSはここで`untyped`しか言えません; Rigorの推論にはどうしようもありません; `RBS::Extended`ディレクティブは引数のシェイプで変えられません。**プラグインならできます**。

プラグインのニッチに当てはまる他の形状:

- **単位DSL** — `100.kilometers / 2.hours`は`Speed`を生成しますが、Rubyのランタイムはユーザークラスを返すIntegerのメソッドとして見ます。
- **ルートヘルパー** — `users_path`はStringを返しますが、ヘルパーが存在するかどうかは解析器が読む必要があるYAMLファイルに依存します。
- **ステートマシン** — `transition_to(:foo)`は、`:foo`がどこかで宣言された`state_machine do ... end`ブロック内にある場合には有効ですが、そうでなければタイポです。
- **カスタムバリデーター** — `validate(:email, value)`は解析時に名前付きパターンに一致しないリテラルを捕捉すべきです。

これらのそれぞれに[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)に実例があります。[`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)ページは16の実例をアーキテクチャ軸（設定スキーマ、ファイルI/O、キャッシュプロデューサー、`Scope#type_of`を通じたエンジン連携、クロスプラグインファクト（fact）、戻り型コントリビューションなど）で比較し、読む順序を推奨しています。

## プラグインが今日できること

v0.1.0+プラグインコントラクト — [`docs/internal-spec/plugin.md`](../../internal-spec/plugin/)に固定されており、同ディレクトリのいくつかのスライス（slice）仕様に展開されています — はプラグインに5つの主要サーフェスを与えます:

1. **`#diagnostics_for_file(path:, scope:, root:)`** — ファイルごとの出力フック。解析されたASTを辿り、`Rigor::Analysis::Diagnostic`行の配列を返します。ランナーは各行に`source_family: "plugin.<your-id>"`をスタンプします。
2. **`#flow_contribution_for(call_node:, scope:)`** — コールサイトごとの戻り型コントリビューションフック（v0.1.1 Track 2スライス7）。プラグインはコールサイトでの推論された戻り型を命名した`Rigor::FlowContribution`バンドルを返します;解析器のディスパッチャーはコントリビューションをマージし、マージされた戻り型をRBS宣言済みかのように使います。
3. **`Plugin::IoBoundary#read_file`** / **`#open_url`** — アクティブな`TrustPolicy`の下でサンドボックス化されたファイルおよび（v0.1.2以降）HTTPSの読み取り。プラグインがプロジェクトファイル（ルートテーブル、スキーマ、ロケールファイル）を読む、または安定したURLをフェッチする必要があるときに使います。
4. **`Plugin::Base.producer` + `#cache_for`** — プラグイン側キャッシュプロデューサー。クロスランキャッシングが欲しいほど高コストなパース/ルックアップに使います。IoBoundaryが結果を構築している間に読んだすべてのファイルのダイジェスト（およびURLのコンテンツハッシュ）で自動的に無効化されます。
5. **`Plugin::FactStore` + `#prepare(services)`** — クロスプラグインファクト公開サーフェス（v0.1.1 Track 2、ADR-9）。プラグインは`prepare`でファクトを公開します;下流のプラグインは`services.fact_store`を通じてそれらを消費するため、プロデューサー側の解析（例: `config/routes.rb`）をすべてのコンシューマーで再利用できます。

v0.1.2リリースは4つの実例（`rigor-lisp-eval`、`rigor-pattern`、`rigor-units`、`rigor-activerecord`）を「診断専用」から「`flow_contribution_for`を通じてナロイングされた戻り型」に移行したため、プラグイン型の値へのチェーンされたコールがRBSレベルの`untyped`エンベロープではなく解析器の通常のディスパッチで解決されます。各プラグインのREADMEを参照して、それぞれがどのサーフェスをデモしているか確認してください。

## マクロ / DSL展開基板（ADR-16）

上記の手書きウォーカー契約の上に、2つ目の作成パスが追加されました: **マクロ展開基板**（ADR-16）。メタプログラミングを多用するDSL — Railsスタイルの`has_one_attached`、dry-structの`attribute`、Deviseの`devise :strategy`、Sinatraの`get '/foo' do ... end` — に対して、基板はプラグイン作者がASTを手で歩く代わりにコール形状を**宣言する**ことを可能にします。プラグインの本体は単一のマニフェストエントリーになります;基板がリテラルシンボル抽出、名前補間、レジストリルックアップ、メソッドごとの合成を処理します。

4つのティア形状が認識されます。[ライブラリごとのサーベイ](../../notes/20260515-macro-expansion-library-survey/)が、どのライブラリが各ティアに収まり、どのライブラリが基板のスコープ外に該当するかを特定します。

| ティア | 形状 | マニフェスト宣言 | 動作例 |
| --- | --- | --- | --- |
| **A — ブロック-as-メソッド** | DSL呼び出しのブロックがレシーバークラス上のインスタンスメソッドとして実行される（`Sinatra::Base#generate_method`） | `block_as_methods: [Macro::BlockAsMethod.new(receiver_constraint:, verbs:)]` | [`rigor-sinatra`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sinatra/) |
| **B — トレイトインライニングレジストリ** | クラスレベルの呼び出しがシンボルを列挙 → バンドルされたレジストリが各々をモジュールにマップ → 基板がモジュールのRBSメソッドを呼び出し元クラスに展開 | `trait_registries: [Macro::TraitRegistry.new(receiver_constraint:, method_name:, modules_by_symbol:, always_included:)]` | [`rigor-devise`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-devise/) |
| **C — heredocテンプレート** | クラスレベルの呼び出しがリテラルシンボルをメソッド名テンプレートに補間;基板が合成リーダーを発行 | `heredoc_templates: [Macro::HeredocTemplate.new(receiver_constraint:, method_name:, symbol_arg_position:, emit:)]` | [`rigor-dry-struct`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-dry-struct/) |
| **D — 外部ファイルインクルージョン** | globにマッチするファイルが、宣言されたクラスとして型付けされた`self`で実行される | `external_files: [Macro::ExternalFile.new(glob:, receiver_type:, bound_ivars:)]` | （v0.1.x時点では契約のみ — エンジン統合は需要駆動） |

上記の3つのTier A/B/Cプラグインは各々60〜110 LoCの**純粋に宣言的な**Ruby — ウォーカーなし、`diagnostics_for_file`なし、プラグイン側の状態なし。基板のプレパス + ディスパッチャー統合が作業を行います。

### Concern再ターゲティング

`ActiveSupport::Concern.included do ... end`は*遅延されたclass_eval*: ブロック内のDSL呼び出しはconcernモジュール自身ではなく、includeした人に対して発火します。基板のスキャナはこの再ターゲティングを自動的に処理します。次のようなソースに対して:

```ruby
module Auditable
  extend ActiveSupport::Concern
  included do
    attribute :audited_at, Types::Time
  end
end

class Address < Dry::Struct
  include Auditable
  attribute :city, Types::String
end
```

`Address`は`city`（直接）AND `audited_at`（`Auditable`から再ターゲティング）の両方を合成リーダーとして取得します。同じパターンがTier Bトレイト（Concern経由でincludeされるDeviseモジュール）でも動作します。

### フロア / シーリング

ADR-16 § WD13に従い、v0.1.xの成果物は**フロア**: 合成メソッドが名前で発行されるため、クロスファイルディスパッチが解決される（`call.undefined-method`なし）。戻り型は`Dynamic[T]`（Tier C）または`untyped`（Tier B）に縮退します。[ADR-13](../../adr/13-typenode-resolver-plugin/)リゾルバチェイン経由の精密な戻り型プロモーションは**シーリング**で、具体的なプラグイン作者が必要とするときの後のイテレーションのために予約されます。基板はADR-5の堅牢性に従い、精度を*捏造*しません。

### 基板と手書きウォーカーの選択

| DSLが… | 基板を使う | 手書きウォーカーを使う |
| --- | --- | --- |
| `クラスレベル呼び出し + リテラルシンボル引数 + フレームワークclass_eval'dヘレドック` | ✓ Tier C | — |
| `クラスレベル呼び出し + リテラルシンボル引数 + レジストリ駆動のモジュールinclude` | ✓ Tier B | — |
| `クラスレベル呼び出し + インスタンスメソッドとして実行されるdo…endブロック` | ✓ Tier A | — |
| `宣言されたself下でinstance_eval'dされた外部Rubyファイル` | ✓ Tier D（v0.1.x時点では契約のみ） | — |
| `戻り型が引数のシェイプに依存するドメインDSL` | — | `flow_contribution_for`（[`rigor-lisp-eval`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-lisp-eval/)） |
| `クロスファイル検証（宣言を収集してから使用を検証）` | — | 2パスウォーカー（[`rigor-statesman`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-statesman/)） |
| `外部プロジェクトファイル（ルート、スキーマ、ロケール）のパース` | — | `IoBoundary` + キャッシュプロデューサー（[`rigor-routes`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-routes/)） |
| `スキーマグラフレコーダー（GraphQL-Rubyスタイル）` | — | スキーマ解決パス（プラグインまだ未作成） |

基板と手書きウォーカー契約は共存します — プラグインは`manifest`で宣言された基板エントリーを`diagnostics_for_file`ウォーカーと混在させられます。[`skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md) SKILLが決定フローを詳細にキャプチャします;[`docs/notes/20260515-macro-expansion-library-survey.md`](../../notes/20260515-macro-expansion-library-survey/)のサーベイが、基板がどのRubyライブラリをカバーし、どのライブラリがスコープ外に該当するかを記録します。

## プラグインを書くべきか？

おそらくそうではありません — ほとんどのプロジェクトは、プラグインのニッチに達する前にRBSと`RBS::Extended`から恩恵を受けます。プラグインに手を伸ばすのは以下の場合のみです:

- ドメインDSLの型付けが引数のシェイプ、ファイルの内容、またはクロスメソッド宣言に依存している。
- アプリケーションと共にプラグインgemを保守する意欲がある。
- チームがプラグインのソースを読める — それは誰も無視できるブラックボックスではありません。

これらが当てはまるなら、[`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)が出発点です。[`rigor-deprecations`](../../plugins/rigor-deprecations/)の例は80行未満で、「最初のプラグインを書きたい」のための推奨テンプレートです。

## 次に読むもの

ハンドブックの終わりに到達しました。ここからは:

- 通読しなおすことはほとんど有用ではありません — ほとんどの読者は疑問が生じたときに特定の章に戻ります。
- [ハンドブック索引](../)には[`docs/type-specification/`](../../type-specification/)、[`docs/internal-spec/`](../../internal-spec/)、[`docs/adr/`](../adr/)のより深い素材への相互参照があります。
- [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)はいつ何が出荷されたかのリリースごとの真実です。

静的Rubyを信じる小さな、成長中のコミュニティへようこそ。
