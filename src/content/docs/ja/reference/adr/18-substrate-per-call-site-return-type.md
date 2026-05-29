---
title: "ADR-18 — 基板の呼び出しサイトごとの戻り型DSL"
description: "rigortype/rigor docs/adr/18-substrate-per-call-site-return-type.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/18-substrate-per-call-site-return-type.md"
sourcePath: "docs/adr/18-substrate-per-call-site-return-type.md"
sourceSha: "1f92f698a13a6cdc8c221f6dd2dfc31c30141894de38d5df99f57de8941e0bcf"
sourceCommit: "dac915a9ee49b89e89774c34c518e8501275f6a3"
translationStatus: "translated"
sidebar:
  order: 4018
---

Status: **proposed、2026-05-16**。[ADR-16](../16-macro-expansion/)のマクロ展開基板を改訂し、合成されるメソッドにおいて呼び出しサイトごとの戻り型をサポートします。v0.1.6で着地した`rigor-dry-types`（[ADR-12](../12-dry-rb-packaging/)）の作業とADR-9の`:dry_type_aliases`ファクト（fact）の上に構築されます。自然な消費者（`rigor-dry-struct`の精度向上）はこの改訂なしには着地できません。

## コンテキスト

ADR-16の基板は今日、合成されたメソッドを**（レシーバー、メソッド名）→ 静的な`returns:`String**として表現します。

```ruby
heredoc_templates: [
  Rigor::Plugin::Macro::HeredocTemplate.new(
    receiver_constraint: "Dry::Struct",
    method_name: :attribute,
    symbol_arg_position: 0,
    emit: [{ name: "\#{name}", returns: "Object" }]
  )
]
```

`returns:`文字列は**テンプレートごとに静的**です — 第2引数のソース表現にかかわらず、すべての`attribute :city, X`呼び出しに対して同じ値です。スライス（slice）6bはこの文字列を`Environment#nominal_for_name`を通じてプロモートするので、今日のフロアは次のとおりです。

> すべての`address.city`リーダーは、`:city`が`Types::String`、`Types::Integer`、`Types::Bool`のいずれで宣言されたかにかかわらず、`Nominal[Object]`を返す。

ユーザーから見えるギャップは、`rigor-dry-struct`のようなプラグインが**合成リーダーの戻り型を呼び出しサイトの引数で変化させたい**ときに表面化します。

- `attribute :city, Types::String` → `address.city`は`Nominal[String]`であるべき。
- `attribute :age, Types::Integer` → `address.age`は`Nominal[Integer]`であるべき。

これは**呼び出しサイトごとの**戻り型です — 同じテンプレート、同じレシーバー、同じメソッド名、異なる引数 → 異なる合成された戻り値。

ADR-16の基板には今日、これのためのDSLがありません。今日呼び出しごとの精度を求めるプラグイン作者は、手書きのウォーカーを書くことに頼ります（宣言的な基板マニフェストの趣旨を打ち消します）。

## 決定

`Rigor::Plugin::Macro::HeredocTemplate`（および`TraitRegistry`を同じ形で）を拡張し、各`emit:`行に**`returns_from_arg:`**フィールドを追加します。

```ruby
emit: [
  {
    name: "\#{name}",
    returns_from_arg: {
      position: 1,
      lookup_via: { plugin_id: "dry-types", fact: :dry_type_aliases }
    }
  }
]
```

存在するとき、基板の事前パスは次を行います。

1. 呼び出しサイトから`position:`の引数ノードを読む（例えば`attribute :city, Types::String`からASTノード`Types::String`）。
2. 引数のソース表現をString（修飾された定数名;例えば`"Types::String"`）に解決する。
3. その文字列を名前付きのクロスプラグインファクト（例えば`rigor-dry-types`が公開する`:dry_type_aliases`）で検索する。
4. 検索結果として得られた基底クラス名を合成メソッドの`return_type:`Stringとして使用する（既存のスライス6bプロモーションパスがそれを`Environment#nominal_for_name`を通じて解決する）。

`lookup_via:`の形は**宣言的**です — 基板の事前パス時にプラグインのコードは走りません。プラグイン作者は「どのファクトを参照するか」を宣言し、基板が検索を扱います。

### 解決のセマンティクス

呼び出しサイトごとの引数のソース表現がStringに解決できないとき（例えば引数がメソッド呼び出し、複雑な式、またはプラグイン作者が予期しなかった定数の場合）。

- **ファクト一致なし** → 行のオプショナルな`returns:`Stringにフォールバック（スライス6bの静的デフォルト）。
- **`returns:`もなし** → `Dynamic[Top]`にフォールバック（ADR-16スライス6以前の基板フロア）。

この3段階のフォールバックは、`returns_from_arg:`を厳密に追加的に保ちます — それを宣言しないプラグインは、静的`returns:`パスをそのまま使い続けます。

### 引数形状の認識

基板の引数ソース表現抽出器は、フロアで次のPrism形状を扱わなければなりません（MUST）。

- `Prism::ConstantReadNode` — 単独の定数（`String`）。
- `Prism::ConstantPathNode` — 修飾された定数（`Types::String`、`App::Types::Coercible::Integer`）。
- それ以外 — nilを返し、フォールバックチェインを起動する。

メソッド呼び出し引数（`Types::String.constrained(format: …)`）はフロアの範囲外です — それらにはADR-10ウォーカーのヒューリスティック機構（チェインに対するフェーズBの戻り型）か、別の「チェインヘッドリゾルバ」追加のいずれかが必要です。需要主導のフォローアップとして記録されています。

### 公開APIドリフト面

この改訂は次を追加します。

- `Rigor::Plugin::Macro::HeredocTemplate::Emit#returns_from_arg`
  attr_reader（既存のEmit行に対する新しい凍結Dataフィールド）。
  デフォルトは`nil`;既存のマニフェストは引き続き動作する。
- `HeredocTemplate.new`の新しいバリデーター分岐。Emit行ごとに`returns:` / `returns_from_arg:`のうちちょうど1つが存在することを保証する（両方nilも有効;`Dynamic[Top]`にフォールバック）。
- `Rigor::Inference::SyntheticMethod#return_type_source`スロット
  （Symbol）。戻り型を解決したパスを記録する: `:static`、`:from_arg`、`:fallback`のいずれか。デバッグ用にキャッシュ記述子の`to_h`に表れる;重要な外部サーフェス（surface）ではない。
- `Rigor::Inference::SyntheticMethodScanner`は、事前パス中に`returns_from_arg:`検索を解決するために、実行ごとの`Plugin::FactStore`を参照する。スキャナーは`fact_store:`キーワード引数を取得する（デフォルトは`nil` → すべての`returns_from_arg:`行は`returns:` / Dynamicにフォールバック）。

すべての更新は実装スライスと同じコミットで[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)に着地します。

## 実装のスライス分け

推奨される順序;各スライスは独立して出荷可能。

1. **`HeredocTemplate::Emit`フィールド + 検証**。`returns_from_arg:`スロットを追加;バリデーターが新しい形を受け入れる;マニフェストのシリアライズがラウンドトリップする。基板の動作変更はまだなし。
2. **スキャナーの引数位置抽出**。事前パスが宣言された`position:`の引数ノードを読み、ソース表現（修飾された定数名）を発行された`SyntheticMethod`にしまう。
3. **事前パス中のファクトストア検索**。スキャナーが`fact_store:`キーワードを取得;名前付きファクトの公開値を参照;`SyntheticMethod#return_type`を解決された基底クラス名で埋める。契約（contract）に従って静的`returns:` / Dynamicにフォールバックする。
4. **TraitRegistryのパリティ（オプション）**。需要が表面化すれば、同じ`returns_from_arg:`行が`Plugin::Macro::TraitRegistry`のemitテーブルにも適用される。
5. **ドキュメント + 実例消費者**。ADR-16とハンドブックのプラグイン章を更新;対応する`rigor-dry-struct`マニフェスト更新を出荷し、その`attribute :city, Types::String`がこのパスを通じて精度向上するようにする。これがユーザーから見える成果を届けるスライス。

## 作業上の決定

### WD1 — なぜ宣言的`lookup_via:`であってコールバックではないのか？

Proc形のコールバック（`returns_from_arg: { position: 1, resolve: ->(node, services) { … } }`）は、プラグイン作者が基板事前パス時に任意のRubyを実行できるようにしてしまいます。これは2つのADR-2契約を破ります。

1. **プラグインは解析時にアプリケーションコードを実行してはならない（MUST NOT）**。基板の事前パスは解析時であり、ここでのコールバックはアナライザー駆動のユーザーコード実行になる。
2. **プラグインは構築時に`Ractor.shareable?`でなければならない（MUST）**。クロージャ状態を参照するProcボディは、[ADR-15](../15-ractor-concurrency/)フェーズ4の下では共有可能ではない。

宣言的な形（クロスプラグインファクト名 + 引数位置）は両方を回避します。基板が検索を実行;プラグイン作者がポリシーを宣言します。

### WD2 — なぜテンプレートごとではなく行ごとの`returns_from_arg:`か？

テンプレートは呼び出しサイトごとに複数の合成メソッドを発行できます（例えば将来の`attribute :city, Types::String`テンプレートが`Address#city`リーダーと`Address#city=`セッターの両方を発行する場合）。各emit行は異なる戻り型解決ポリシーを望むかもしれない（リーダーは型を返す;セッターは型または`self`を返す）。行ごとにすることで、すべての発行を同じパスに強制せず、DSLを柔軟に保ちます。

### WD3 — なぜ`:dry_type_aliases`を正準的な例として？

これが最初の具体的な消費者です（`rigor-dry-struct`スライスはv0.1.5で、`rigor-dry-types`スライス1はv0.1.6で並行して着地）。パターンは一般化します: クロスプラグインファクトを公開するプラグインファミリー（ルートの`:helper_table`、ARの`:model_index`、…）はどれも独自の`returns_from_arg:`消費者をホストできます。

### WD4 — ADR-10ウォーカーヒューリスティックとの境界

ウォーカーの`ReturnTypeHeuristic`はメソッド*ボディ*の末尾式から戻り型を抽出します。改訂の`returns_from_arg:`は呼び出し*サイト*の引数から戻り型を抽出します。両サーフェスは`Rigor::Type::*`またはnilを生成;両方ともディスパッチャーで同じ`Type::Combinator.dynamic(facet)`ラップに供給されます。2つのパスは直交です — ウォーカーは「gemのメソッドは何を返すか？」、改訂は「ユーザーの基板呼び出しは何を宣言するか？」。将来のスライスは、ヒューリスティックを再利用してチェインヘッドの基底クラスを抽出することで、チェイン呼び出し引数（`Types::String.constrained(...)`）を扱えるかもしれません。

### WD5 — キャッシュ記述子への含意

`returns_from_arg:`は事前パス時にクロスプラグインファクトの値を消費します。したがって事前パスのキャッシュ記述子は、ファクトのコンテンツダイジェストに依存する必要があります（`rigor-dry-types`が公開するエイリアスの変更が`SyntheticMethodIndex`キャッシュを無効化するように）。既存の`Cache::Descriptor::PluginEntry`はプラグインバージョン + 設定を運びます;それを生成されるファクトごとに`fact_digest:`で拡張するのがスライス3の作業です。

## 検討した代替案

- **dry-*消費者ごとの手書きウォーカー**。ADR-16の設計目標（宣言的マニフェストはプラグインごとのウォーカーに勝る）により却下。
- **インラインProcコールバック**（マニフェスト中のProc）。WD1により却下。
- **事前パス時ではなくディスパッチ時に解決する**。ディスパッチャーはすでに`Plugin::Services`経由で`Environment#fact_store`にアクセスできる;`returns_from_arg:`検索を事前パスではなく呼び出しディスパッチまで遅延できる。却下: 検索結果は実行全体を通じて呼び出しサイトごとに同一であり、呼び出しサイトごとのディスパッチコストは呼び出し数で乗算される。事前パスは発見ウォークにわたって償却する。
- **クロスプラグインTypeNodeResolverチェイン**。関連するが別個のADR-13フォローアップとして記録: `synthetic.return_type`文字列を`Plugin::TypeNodeResolver`チェインを通じてルーティングすることで、パラメータ化された形（`Array[String]`、`Pick<T, K>`）を解放する。この改訂とは直交。

## 未解決の質問

- **`returns_from_arg:`は複数の位置を受け入れるべきか？**
  例えば`Tuple[A, B] = (A, B)`スタイル — 複数の引数から導出される戻り型。需要に先送り。
- **`lookup_via:`はフォールバックチェイン用にファクトチャンネルのリストを受け入れるべきか？** プラグインは`:dry_type_aliases`を参照してから`:custom_aliases`にフォールバックしたいかもしれない。具体的なケースが表面化すれば、決定はスライス3に先送り。
- **`returns_from_arg:`が拒否（ファクト一致なし）したとき、基板は診断を発行すべきか？** 今日の`returns:` / Dynamicへの暗黙的フォールバックは最もシンプルな契約;将来の`dynamic.substrate.unresolved-arg``:info`診断がデバッグ用にケースを表面化できるかもしれない。スライス5（ドキュメント + 実例消費者）のフィードバックに先送り。

## 改訂履歴

- 2026-05-16 — 初期提案。v0.1.6のスコープ議論が発端: しばしば誤って名付けられる「rigor-dry-typesファクト経由でのrigor-dry-struct精度」タスクが、ADR-16の既存のスライス計画における単一スライスではなく、基板の改訂を必要とすることが表面化した。ADR-12スライス1（`rigor-dry-types`プラグイン）がv0.1.6で自然な消費者を着地させた;この改訂は消費者が必要とする基板側のメカニズムを提供する。
