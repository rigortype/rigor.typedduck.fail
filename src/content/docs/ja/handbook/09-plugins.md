---
title: "プラグイン"
description: "rigortype/rigor docs/handbook/09-plugins.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/09-plugins.md"
sourcePath: "docs/handbook/09-plugins.md"
sourceSha: "151230392690d5eeabb27a1e46012d198b918d3369044a17d77f6782635a8f51"
sourceCommit: "98bd3fb5bcd0434c814c1d4e3c864e3888ddeae4"
translationStatus: "translated"
sidebar:
  order: 1009
---

プラグインが存在する理由はひとつ: 一部のメソッドの型が、どんなRBSシグでも表現できない方法で**ランタイムでの引数のシェイプ（shape）に依存する**からです。この章は、それがプラグインに値するのはいつか、そして値しないのはいつかを判断する助けになります。

この章はプラグインの*作成*は教え**ません**。それは[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)にあります。16個のチュートリアルウォークスルーで、それぞれが1つの拡張サーフェスにスポットを当てています。実際のフレームワーク向けのすぐにインストールできるgemは[`plugins/`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)にあります。プラグインが必要かどうかを判断するには読み進めてください;作成したくなったら`examples/`へ、既存のものをインストールするなら`plugins/`へ進んでください。

## プラグインを使うとき

典型的なケースはドメイン固有の評価器です:

```ruby
Lisp.eval([:+, 1, 2])           # ランタイムでInteger
Lisp.eval([:<, 1, 2])           # ランタイムでbool
Lisp.eval([:if, true, "a", 0])  # ランタイムでString | Integer
```

戻り値型は引数配列の先頭のリテラルシンボルに依存します。RBSはここで`untyped`しか言えません; Rigorの推論にはどうしようもありません; `RBS::Extended`ディレクティブは引数のシェイプで変えられません。**プラグインならできます**。

プラグインのニッチに当てはまる他の形状:

- **単位DSL**: `100.kilometers / 2.hours`は`Speed`を生成しますが、Rubyのランタイムはユーザークラスを返すIntegerのメソッドとして見ます。
- **ルートヘルパー**: `users_path`はStringを返しますが、ヘルパーが存在するかどうかは解析器が読む必要があるYAMLファイルに依存します。
- **ステートマシン**: `transition_to(:foo)`は、`:foo`がどこかで宣言された`state_machine do ... end`ブロック内にある場合には有効ですが、そうでなければタイポです。
- **カスタムバリデーター**: `validate(:email, value)`は解析時に名前付きパターンに一致しないリテラルを捕捉すべきです。

これらのそれぞれに[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)に実例があります。[`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)ページは16の実例をアーキテクチャ軸（設定スキーマ、ファイルI/O、キャッシュプロデューサー、`Scope#type_of`を通じたエンジン連携、クロスプラグインファクト（fact）、戻り値型コントリビューションなど）で比較し、読む順序を推奨しています。

## プラグインが今日できること

> まだここにいますか？ ほとんどの読者はまず[プラグインを書くべきか？](#プラグインを書くべきか)へ飛ぶべきです。答えはたいてい「いいえ、RBSと`RBS::Extended`で事足ります」です。下記のサーフェスは、「はい」のときのためのものです。

v0.1.0+プラグイン契約（contract）（[`docs/internal-spec/plugin.md`](../../internal-spec/plugin/)に固定されており、同ディレクトリのいくつかのスライス（slice）仕様に展開されています）はプラグインに5つの主要サーフェス（surface）を与えます:

1. **`#diagnostics_for_file(path:, scope:, root:)`**: ファイルごとの出力フック。解析されたASTを辿り、`Rigor::Analysis::Diagnostic`行の配列を返します。ランナーは各行に`source_family: "plugin.<your-id>"`をスタンプします。
2. **`#flow_contribution_for(call_node:, scope:)`**: コールサイトごとの戻り値型コントリビューションフック（v0.1.1 Track 2スライス7）。プラグインはコールサイトでの推論された戻り値型を命名した`Rigor::FlowContribution`バンドルを返します;解析器のディスパッチャーはコントリビューションをマージし、マージされた戻り値型をRBS宣言済みかのように使います。
3. **`Plugin::IoBoundary#read_file`** / **`#open_url`**: アクティブな`TrustPolicy`の下でサンドボックス化されたファイルおよび（v0.1.2以降）HTTPSの読み取り。プラグインがプロジェクトファイル（ルートテーブル、スキーマ、ロケールファイル）を読む、または安定したURLをフェッチする必要があるときに使います。
4. **`Plugin::Base.producer` + `#cache_for`**: プラグイン側キャッシュプロデューサー。クロスランキャッシングが欲しいほど高コストなパース/ルックアップに使います。IoBoundaryが結果を構築している間に読んだすべてのファイルのダイジェスト（およびURLのコンテンツハッシュ）で自動的に無効化されます。
5. **`Plugin::FactStore` + `#prepare(services)`**: クロスプラグインファクト公開サーフェス（v0.1.1 Track 2、ADR-9）。プラグインは`prepare`でファクトを公開します;下流のプラグインは`services.fact_store`を通じてそれらを消費するため、プロデューサー側の解析（例: `config/routes.rb`）をすべてのコンシューマーで再利用できます。

v0.1.2リリースは4つの実例（`rigor-lisp-eval`、`rigor-pattern`、`rigor-units`、`rigor-activerecord`）を「診断専用」から「`flow_contribution_for`を通じてナローイング（narrowing）された戻り値型」に移行したため、プラグイン型の値へのチェーンされたコールがRBSレベルの`untyped`エンベロープではなく解析器の通常のディスパッチで解決されます。各プラグインのREADMEを参照して、それぞれがどのサーフェスをデモしているか確認してください。

## マクロ / DSL展開基板（ADR-16）

上記の手書きウォーカー契約の上に、2つ目の作成パスが追加されました: **マクロ展開基板**（ADR-16）。メタプログラミングを多用するDSL（Railsスタイルの`has_one_attached`、dry-structの`attribute`、Deviseの`devise :strategy`、Sinatraの`get '/foo' do ... end`）に対して、基板はプラグイン作者がASTを手で歩く代わりにコール形状を**宣言する**ことを可能にします。プラグインの本体は単一のマニフェストエントリーになります;基板がリテラルシンボル抽出、名前補間、レジストリルックアップ、メソッドごとの合成を処理します。

4つのティア形状が認識されます。[ライブラリごとのサーベイ](../../notes/20260515-macro-expansion-library-survey/)が、どのライブラリが各ティアに収まり、どのライブラリが基板のスコープ外に該当するかを特定します。

| ティア | 形状 | マニフェスト宣言 | 動作例 |
| --- | --- | --- | --- |
| **A: ブロック-as-メソッド** | DSL呼び出しのブロックがレシーバークラス上のインスタンスメソッドとして実行される（`Sinatra::Base#generate_method`） | `block_as_methods: [Macro::BlockAsMethod.new(receiver_constraint:, method_names:)]` | [`rigor-sinatra`](../../manual/plugins/rigor-sinatra/) |
| **B: トレイトインライニングレジストリ** | クラスレベルの呼び出しがシンボルを列挙 → バンドルされたレジストリが各々をモジュールにマップ → 基板がモジュールのRBSメソッドを呼び出し元クラスに展開 | `trait_registries: [Macro::TraitRegistry.new(receiver_constraint:, method_name:, modules_by_symbol:, always_included:)]` | [`rigor-devise`](../../manual/plugins/rigor-devise/) |
| **C: heredocテンプレート** | クラスレベルの呼び出しがリテラルシンボルをメソッド名テンプレートに補間;基板が合成リーダーを発行 | `heredoc_templates: [Macro::HeredocTemplate.new(receiver_constraint:, method_name:, symbol_arg_position:, emit:)]` | [`rigor-dry-struct`](../../manual/plugins/rigor-dry-struct/) |

上記の3つのTier A/B/Cプラグインは各々60〜110 LoCの**純粋に宣言的な**Ruby（ウォーカーなし、`diagnostics_for_file`なし、プラグイン側の状態なし）です。基板のプレパス + ディスパッチャー統合が作業を行います。

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

ADR-16 § WD13に従い、**フロア**は合成メソッドが名前で発行されることであり、これによってクロスファイルディスパッチが解決されます（`call.undefined-method`なし）。一般的なケースでは精密な戻り値型も回復されます: **Tier B**は由来モジュールが著作したRBSに再ディスパッチし（Deviseの`valid_password?`は`Dynamic[T]`ではなく`bool`に解決される）、**Tier C**は素のクラス名の戻り値をその`Nominal`に解決します。依然`Dynamic[T]`に縮退するのは、パラメータ化された／ユーティリティ型形のTier Cの戻り値（`Array[String]`、`Pick<T, K>`）です;それらを[ADR-13](../../adr/13-typenode-resolver-plugin/)リゾルバチェイン経由でルーティングすることが**シーリング**で、需要駆動です。基板はADR-5のロバストネスに従い、精度を*捏造*しません。

### 基板と手書きウォーカーの選択

| DSLが… | 基板を使う | 手書きウォーカーを使う |
| --- | --- | --- |
| `クラスレベル呼び出し + リテラルシンボル引数 + フレームワークclass_eval'dヘレドック` | ✓ Tier C | なし |
| `クラスレベル呼び出し + リテラルシンボル引数 + レジストリ駆動のモジュールinclude` | ✓ Tier B | なし |
| `クラスレベル呼び出し + インスタンスメソッドとして実行されるdo…endブロック` | ✓ Tier A | なし |
| `宣言されたself下でinstance_eval'dされた外部Rubyファイル` | ✓ Tier D（v0.1.x時点では契約のみ） | なし |
| `戻り型が引数のシェイプに依存するドメインDSL` | なし | `flow_contribution_for`（[`rigor-lisp-eval`](https://github.com/rigortype/rigor/tree/master/examples/rigor-lisp-eval/)） |
| `クロスファイル検証（宣言を収集してから使用を検証）` | なし | 2パスウォーカー（[`rigor-statesman`](../../manual/plugins/rigor-statesman/)） |
| `外部プロジェクトファイル（ルート、スキーマ、ロケール）のパース` | なし | `IoBoundary` + キャッシュプロデューサー（[`rigor-routes`](https://github.com/rigortype/rigor/tree/master/examples/rigor-routes/)） |
| `スキーマグラフレコーダー（GraphQL-Rubyスタイル）` | なし | スキーマ解決パス（プラグインまだ未作成） |

基板と手書きウォーカー契約は共存します。プラグインは`manifest`で宣言された基板エントリーを`diagnostics_for_file`ウォーカーと混在させられます。[`skills/rigor-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md) SKILLが決定フローを詳細にキャプチャします;[`docs/notes/20260515-macro-expansion-library-survey.md`](../../notes/20260515-macro-expansion-library-survey/)のサーベイが、基板がどのRubyライブラリをカバーし、どのライブラリがスコープ外に該当するかを記録します。

## プラグインを書くべきか？

おそらくそうではありません。ほとんどのプロジェクトは、プラグインのニッチに達する前にRBSと`RBS::Extended`から恩恵を受けます。プラグインに手を伸ばすのは以下の場合のみです:

- ドメインDSLの型付けが引数のシェイプ、ファイルの内容、またはクロスメソッド宣言に依存している。
- アプリケーションと共にプラグインgemを保守する意欲がある。
- チームがプラグインのソースを読める。それは誰も無視できるブラックボックスではありません。

これらが当てはまるなら、[`examples/README.md`](https://github.com/rigortype/rigor/blob/master/examples/README.md)が出発点です。[`rigor-deprecations`](https://github.com/rigortype/rigor/tree/master/examples/rigor-deprecations/)の例は80行未満で、「最初のプラグインを書きたい」のための推奨テンプレートです。

## 次に読むもの

ハンドブックの終わりに到達しました。ここからは:

- 通読しなおすことはほとんど有用ではありません。ほとんどの読者は疑問が生じたときに特定の章に戻ります。
- [ハンドブック索引](../)には[`docs/type-specification/`](../../type-specification/)、[`docs/internal-spec/`](../../internal-spec/)、[`docs/adr/`](../adr/)のより深い素材への相互参照があります。
- [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)はいつ何が出荷されたかのリリースごとの真実です。

静的Rubyを信じる小さな、成長中のコミュニティへようこそ。
