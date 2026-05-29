---
title: "ADR-11 — プラグインアダプターとしてのSorbet入力"
description: "rigortype/rigor docs/adr/11-sorbet-input-adapter.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/11-sorbet-input-adapter.md"
sourcePath: "docs/adr/11-sorbet-input-adapter.md"
sourceSha: "ee385d9f2b2e4b3a935f17cd5af4f4411d50b951ee4a39abe6824839d7e07d38"
sourceCommit: "5b252bbd814960f6b442a4df7dd41a0d0a79c995"
translationStatus: "translated"
sidebar:
  order: 4011
---

ステータス: **accepted, 2026-05-09; v0.1.4で`plugins/rigor-sorbet/`として実装済み**（`examples/`ではなく本番プラグイン）。

## コンテキスト

RigorのプライマリType-source契約（contract）はRBS（`RBS::Inline`コメントと`RBS::Extended`アノテーションを含む）である。ユーザーから[Sorbet][sorbet]の記述スタイルへの評価が寄せられた。インラインの`sig { ... }`ブロック、`T.let`/`T.cast`/`T.must`アサーション、そして**ランタイム強制**型チェック（`sorbet-runtime`が各アノテート済みメソッドをラップし、違反時に静的解析をすり抜けることなく実行時にraiseする）である。提案: Rigorがsorbetのsigと関連する`T::*`アサーションをtype-sourceとして消費できるようにする。できれば並行してRBSを維持することをユーザーに強いない形で。

回答を形成するふたつの事実がある:

1.  **SorbetはRBSと正確に一致しない独自の型システムセマンティクスを持つ**。[SorbetのRBS-commentsドキュメント][sorbet-rbs]はこの点を明示している — SorbetチームはRBSを「二級市民」のアノテーション形式として扱い、ふたつの型言語は「構文だけでなくセマンティクスでも異なる」と述べている。乖離の例:
    - Sorbetにリテラル型はない（`'foo'`は`String`）。
    - Sorbetはダックタイピングを設計上拒否する。RBSは構造的インターフェースを持つ。
    - `T.untyped`はすべての型のスーパータイプかつ部分型（subtype）（漸進的（gradual）セマンティクス）。RBSの`untyped`は一方向のクリフ。
    - `T.anything`は操作を持たない「真の」top（[anything.md][sorbet-anything]）。RBSの`top`は同じ制約を強制しない。
    - Sorbetの`T::Class[T]`と`T.attached_class`/`T.self_type`はRBSが直接表現できない文脈依存セマンティクスを持つ。

2.  **Sorbetランタイムは静的解析器とは別のgemである**。`sorbet-runtime`がロード時に`sig`付きメソッドをラップしてランタイムで型を強制する。`srb tc`は静的型チェッカー。Rigorは`srb tc`（静的側）と競合する。ユーザーが好むランタイム強制のエルゴノミクスは`sorbet-runtime`の特性であり、どの静的解析器がsigを読んでも変わらない。

[sorbet]: https://sorbet.org/
[sorbet-rbs]: https://sorbet.org/docs/rbs-support
[sorbet-anything]: https://sorbet.org/docs/anything

## 決定

**Sorbetの入力はコア機能としてではなく、`rigor-sorbet`プラグインとして実装する**。プラグインは既存の拡張契約面（ADR-2/ADR-9）に位置し、Sorbetの型語彙をプラグイン境界でRigorの内部キャリアに変換し、既存の`flow_contribution_for`基盤を通じてメソッドシグネチャとフローアサーションを提供する。コアはADR-0/ADR-1に従いRBS標準のまま維持される。

ユーザーは`sorbet-runtime`をランタイムチェック用として独立して保持し続ける。Rigorは同じ`sig`ブロックを静的入力として読む。ランタイムの話は変わらない。

### なぜプラグインパスか（コアではなく）

4つの設計上の緊張がSorbet入力をコアから押し出す:

1.  **ADR-0 §「コアにインラインDSLなし」**。既存のルール — 「アプリケーションRubyコードにRigor固有のアノテーション構文は不要。RBS、rbs-inline、Steep互換アノテーションをtype-sourceとして受け付ける」 — はRigor*自身の*DSLについてのものだった。SorbetのDSLはRigor定義ではないが、コアで受け入れるとすべてのRigorユーザーがSorbetのセマンティクスを理解する必要が生じる。ADR-2のプラグイン契約はまさにこのような状況のために設計された: フレームワーク型またはサードパーティDSL型の知識はコアではなくプラグインに属する。

2.  **ADR-1 §「RBSラウンドトリップは情報無損失」**。Rigor → RBS消去が標準的なエクスポート契約である。Sorbetの型はいくつかの構造（`T::Class[T]`、`T.attached_class`、`T.self_type`、`T.type_parameter`、sealed/abstractマーカー、構造的`T::Struct`シェイプ（shape））について明確なRBSの綴りを持たない。Sorbetの語彙をコアに引き込むと、Rigorの内部キャリアを広げるか（ユーザーが既に作成したスペックコーパスと不整合）、損失のあるラウンドトリップを受け入れるか（ADR-1のハード保証と不整合）のいずれかになる。変換を*プラグイン*境界に留めることで、損失エッジがそこに収まる: プラグインはSorbet → Rigorをできる限りマッピングし、マッピングできないものは`dynamic.sorbet.*`プロヴェナンス付きで`Dynamic[top]`に劣化する。

3.  **SorbetのDSLは実際のパーサープロジェクトである**。`sig { params(x: Integer, y: T.nilable(String)).returns(String) }`を静的にパースするには、`Prism::CallNode`チェーンを辿り`type_parameters`/`params`/`returns`/`void`/`bind`/`proc`/`class_of`/`attached_class`/`nilable`/`any`/`all`等の`T.*`定数を認識する流暢なAPIミニインタープリタが必要である。実装可能だが、サーフェス（surface）面積がコアでのメンテナンスにはコア推論の改善を圧迫するほど大きい。プロジェクト先例: [Sord][sord]がSorbet → RBS変換のためにほぼ同じことを行っている。我々はプラグイン内部にRigor向けの類似パーサーを構築する。

4.  **信頼済みgemのオプトインを再利用する**。ADR-2の信頼モデルはプラグインをユーザー選択のgemとして扱う。`rigor-sorbet`はそのモデルに直接適合する: ユーザーは`rigor-pattern`や`rigor-statesman`と全く同様に`.rigor.yml`の`plugins:`リストにgemを追加してオプトインする。新しい信頼次元は不要。

[sord]: https://github.com/AaronC81/sord

### 静的vs.ランタイムの分解

ユーザーのランタイム強制型への好みは正当であり尊重すべきだが、そのストーリーにおけるRigorの役割は小さい:

- **静的側（`rigor-sorbet`が提供するもの）**: `sig { ... }`ブロックと`T.let`/`T.cast`/`T.must`/`T.bind`/`T.absurd`をtype-sourceとして読み込み、メソッドシグネチャとフローアサーションをアナライザーに提供する。
- **ランタイム側（Sorbetから変わらない）**: `sorbet-runtime`がロード時に`sig`付きメソッドをラップし、違反時にraiseする。Rigorはアプリケーションコードを実行しない（ADR-2 §「プラグインの信頼とI/Oポリシー」）ため、プラグインがロードされていてもランタイム強制はRigorの機能ではない。

実際には: ランタイムチェックを重視するユーザーは`sorbet-runtime`をGemfileに保持する。同じ`sig`ブロックが両方の目的に使われる。Rigor + `rigor-sorbet`を追加することで、プロジェクト独自の型言語拡張（`RBS::Extended`リファインメント（refinement、篩型とも）、プラグイン派生の動的メンバー等）が上に重なった第二の静的解析器を得られる。

## 変換テーブル

プラグインはSorbetの語彙をプラグイン境界でRigorの内部キャリアにマッピングする。損失のあるマッピングは明示的にフラグが立てられ、プラグインが適用時に`dynamic.sorbet.degraded`/`dynamic.sorbet.unsupported`診断を発行する。

### メソッドシグネチャ

| Sorbetの形式 | Rigorの表現 | 備考 |
| --- | --- | --- |
| `sig { params(x: T).returns(U) }` | RBS形式のメソッド型`(T) -> U` | 直接対応 |
| `sig { void }` | `(...) -> void` | 直接対応 |
| `sig { abstract.returns(T) }` | abstractメソッドファクト（fact） + 戻り型`T` | abstractマーカーを捕捉 |
| `sig { override.returns(T) }` | overrideファクト + 戻り型`T` | overrideチェックは既存の`def.return-type-mismatch`ルールに委ねる |
| `sig { overridable.returns(T) }` | overridableファクト + 戻り型`T` | 直接対応 |
| `sig(:final) { ... }` | finalメソッドファクト | [final.md][sorbet-final]参照 |
| `sig { type_parameters(:U).params(x: T.type_parameter(:U)).returns(T.type_parameter(:U)) }` | RBSジェネリックメソッド`[U] (U) -> U` | 直接対応 |
| `sig { ... .checked(...) }` | Rigorでは破棄（ランタイム専用） | `.checked`モディファイアはランタイムヒント |
| `sig { ... .on_failure(...) }` | 破棄 | ランタイム専用 |

[sorbet-final]: https://sorbet.org/docs/final

### フローレベルアサーション

| Sorbetの形式 | Rigorの表現 | 既存Rigorプリミティブとの対応 |
| --- | --- | --- |
| `T.let(expr, T)` | `assert: expr is T`（return後のファクトを更新） | `%a{rigor:v1:assert: expr is T}`に類似 |
| `T.cast(expr, T)` | `assert: expr is T`（静的に想定） | 類似。両者とも静的に未検証 |
| `T.must(expr)` | `assert: expr is ~nil` | 類似 |
| `T.must_because(expr) { reason }` | 型付けの目的では`T.must`と同じ | reasonは無視 |
| `T.assert_type!(expr, T)` | `assert: expr is T` + `Dynamic[T]`を拒否 | 厳格なバリアント |
| `T.bind(self, T)` | `assert: self is T` | 類似 |
| `T.absurd(x)` | `assert: x is bot`（網羅性） | 既存の`flow.unreachable-branch`と組み合わせ |
| `T.unsafe(x)` | `Dynamic[top]`に消去 | ランタイムではidentity、静的には型なし |
| `T.reveal_type(x)` | 呼び出し箇所での`dump.type`診断 | 直接対応 |

### 型語彙

| Sorbetの形式 | Rigorキャリア |
| --- | --- |
| `T.any(A, B)` | `Union[A, B]` |
| `T.all(A, B)` | `Intersection[A, B]` |
| `T.nilable(T)` | `Union[T, nil]` |
| `T::Boolean` | `Union[Constant[true], Constant[false]]` |
| `T.untyped` | `Dynamic[top]` |
| `T.anything` | `top` |
| `T.noreturn` | `bot` |
| `T::Array[E]` | `Nominal["Array", [E]]` |
| `T::Hash[K, V]` | `Nominal["Hash", [K, V]]` |
| `T::Set[E]` | `Nominal["Set", [E]]` |
| `T::Range[E]` | `Nominal["Range", [E]]` |
| `T::Enumerable[E]` / `T::Enumerator[E]` / `T::Enumerator::Lazy[E]` | `Nominal["Enumerable", [E]]`等 |
| `T::Class[T]` | `Singleton[T]`（損失あり: attached-classの精度を失う） |
| `T::Module[T]` | `Module[T]`（新しいキャリアを導入するか`Singleton`にフォールバック） |
| `T.class_of(C)` | `Singleton[C]` |
| `T.proc.params(x: A).returns(B)` | RBSの`^(A) -> B` procタイプ |
| `[A, B]`（`sig`中のタプル） | Rigorの`Tuple[A, B]` |
| `{a: A, b: B}`（`sig`中のシェイプ） | Rigorの`HashShape{a: A, b: B}` |
| `T.attached_class` | RBSの`Bases::Instance`（selfのインスタンス） |
| `T.self_type` | RBSの`Bases::Self`（ベストエフォート; Sorbetの既知の制限が適用される） |
| `T.type_parameter(:U)` | RBSの`Variable[:U]` |

### `Dynamic[top]`にプロヴェナンス付きで劣化する構造

以下の構造はRigorに対応するものがなく、提供箇所で`dynamic.sorbet.unsupported`を発行する。呼び出し箇所はdynamic-originマーカーを保持するため、ユーザーは境界を監査できる:

- **`T::Struct` / `T::ImmutableStruct`** — Sorbetの型付き直積型（product type）。`HashShape`が最も近いキャリアだが、プロパティレベルのアノテーション（`prop`、`const`）はSorbet固有。`Nominal[<UserDefined>]`にベストエフォートのインスタンスメソッド推論を加えて扱う。フィールドレベルの型はプラグイン提供。
- **`T::Enum`** — Sorbetの型付き列挙型。最も近いRigorの対応は有限集合での`Symbol`のリファインメントだが、ランタイムセマンティクスが異なる。`Nominal[<UserDefined>]`に`Singleton[T]`インスタンスとして公開された列挙定数を加えて変換。
- **`T::Generic` `type_member` / `type_template`** — 分散マーカー（`:in`/`:out`/`:invariant`）とバウンド（`fixed`/`upper`/`lower`）はRBSで表現可能な場合に変換される。複雑なバウンド（`fixed: T.any(A, B)`）は影響するスロットが`Dynamic[top]`にフォールバック。
- **`T.experimental_*`名前空間** — Sorbet自身の契約として不安定。プラグインはunsupportedとして扱う。
- **strictnessレベル`# typed: strong`のSorbetシグル** — 「このファイルでは`Dynamic[T]`を許可しない」と変換されるが、Rigorの許容モデルは`severity_profile`単位で設定される。シグルを*パースと拒否判断のために尊重する*が、Rigorでstrongモードを再実装しない。

### シグル処理

Sorbetのシグルはファイル単位でどのエラーを報告するかを制御する（[static.md][sorbet-static]）。Rigor独自の解析とは直交する。プラグインは3ステップでシグルを尊重する:

| シグル | `rigor-sorbet`のアクション |
| --- | --- |
| `# typed: ignore` | ファイルを完全にスキップ（Sorbetの動作に一致）。 |
| `# typed: false` | *シグネチャ提供のみ*のために`sig`ブロックを読む（Sorbetはシグネチャは引き続き適用されると言っている）。フローアサーション/`T.let`等はスキップ。 |
| `# typed: true`（デフォルト） | すべてを尊重: シグネチャ + アサーション + フローファクト。 |
| `# typed: strict` | `true`と同じ。（すべてのメソッドにsigを要求するSorbetのstrict-mode要件は`srb tc`自身が強制する。Rigorはそれを再現しない。） |
| `# typed: strong` | `strict`と同じ。（`T.untyped`のstrong-mode拒否はSorbet固有のスタンス。Rigorの`severity_profile`が類似のフィルタをカバーする。） |

[sorbet-static]: https://sorbet.org/docs/static

### RBIファイルとの合成

Sorbetの[RBIファイル][sorbet-rbi]は`sorbet/rbi/`以下に置かれたスタブボディのRubyファイルで、ランタイムへの影響なしに外部型（gem、DSL等）を宣言する。プラグインはプロジェクトソースに加えてRBIツリーを探索する:

- `sorbet/rbi/gems/` — `tapioca gems`から自動生成。[ADR-10][adr-10]のオプトイン依存関係ソース推論と自然に合成される: ユーザーがgemのRBIファイルとそのgemを`dependencies.source_inference`の両方に持つ場合、RBIの型付きシグネチャが優先（契約）。推論ウォーカーはRBIがカバーしない穴を埋める。
- `sorbet/rbi/annotations/` — [`rbi-central`][rbi-central]からのコミュニティアノテーション。
- `sorbet/rbi/dsl/` — 自動生成のDSL RBI（Railsスタイル）。両方がロードされている場合、ファーストパーティのRigorプラグイン（`rigor-activerecord`、`rigor-rails-routes`等）より低い優先度。DSLプラグインの提供はオーサードだが、RBIは生成物。
- `sorbet/rbi/shims/` — 手編集のオーバーライド。既存のtier順序でプロジェクト`sig/` RBSと同じ優先度。

[sorbet-rbi]: https://sorbet.org/docs/rbi
[adr-10]: 10-dependency-source-inference.md
[rbi-central]: https://github.com/Shopify/rbi-central

## ADR-1（RBSラウンドトリップ）との境界

Sorbetの型はプラグインロード時にRigorの内部キャリアに**変換される**。逆方向 — Rigor → Sorbetエクスポート — はこのADRの対象**外**である。Rigor → RBSエクスポートはADR-1に従い情報無損失/保守的なまま維持される。RigorからSorbetのsigが欲しいユーザーはSord（またはRigor固有の将来の等価物）を独立したオーサリングツールとして使えるが、そのツールはアナライザーの標準出力ではない。

これはプラグインの変換テーブルが一方向でプラグイン内部であることを意味する。Sorbetの構造が変換できない場合（`T::Struct`のプロパティ、深くネストしたジェネリック位置での`T.attached_class`等）、プラグインは`dynamic.sorbet.unsupported`を発行し、影響するスロットを`Dynamic[top]`に劣化させる。コアはSorbet固有のキャリアを決して見ない。

## ADR-0（Rigor固有インラインDSLなし）との境界

ADR-0は「RubyアプリケーションコードはRigor固有のアノテーションやDSLを必要としてはならない」と言う。このADRはそれに違反しない:

- Rigorは依然として独自のDSLを導入しない。
- `sig { ... }`と`T.*`の構文は**Sorbetの**DSLであり、Rigorとは独立してオーサードされている。それを使いたいユーザーは`sorbet-runtime`（ランタイムサポート）+`rigor-sorbet`（Rigorの静的読み込み）をインストールする。どちらもユーザーの選択。
- DSLが不要なユーザーは既存のパスに従ってRBS/RBS::Inlineを使い続ける。

このADRを提案したユーザーは明示的に「plugin-via-adapter」と位置づけていた。これが正しい位置づけである。

## プラグイン契約面

`rigor-sorbet`は既存のv0.1.0プラグイン契約に加え、[ADR-9クロスプラグインAPI][adr-9]（ランディング後）を使用する:

- **`Plugin::Base#flow_contribution_for(call_node:, scope:)`**: すべての呼び出し箇所で参照される。プラグインは周囲のスコープから呼び出し先の`def`上の`sig { ... }`ブロックを辿り、sigをパースし、sigに従って`return_type`を設定した`FlowContribution`を提供する。
- **`Plugin::Base#diagnostics_for_file(path:, scope:, root:)`**: `T.reveal_type(x)`呼び出しに`dump.type`を発行し、変換テーブルがカバーしない構造に`dynamic.sorbet.unsupported`を発行する。`T.absurd(x)`は既存の`flow.unreachable-branch`ルールと合成される。
- **`Plugin::Base#prepare(services)`（ADR-9スライス3）**: プラグインは実行開始時にプロジェクトの`.rb`ファイルを一度探索し、発見した`sig`ブロックからクラスごとの`(class_name, method_name) → MethodType`テーブルを構築し、`rigor-sorbet#method_signatures`としてファクトストアに公開する。後続のファイルはディスパッチャー経由でこれを消費する。
- **`manifest(produces: [:method_signatures], consumes: [...])`**: ファクトストア契約を宣言する。Sorbetのsigを読みたい他のプラグイン（例: Sorbet-via-Railsの型を読む仮想の`rigor-rails`プラグイン）は`consumes: [{ plugin_id: "sorbet", name: :method_signatures }]`を宣言する。

[adr-9]: 9-cross-plugin-api.md

## 診断プレフィックスファミリー

このADRはプラグイン発行の診断用に新しい`plugin.sorbet.*`ファミリーと、境界横断ファクト用の`dynamic.sorbet.*`ファミリーを追加する。初期エントリー:

| 識別子 | 意味 |
| --- | --- |
| `plugin.sorbet.parse-error` | `sig { ... }`ブロックのパースに失敗した。 |
| `plugin.sorbet.unknown-modifier` | `sig`モディファイア（sigにチェーンされた`.foo`等）が認識セットにない。 |
| `plugin.sorbet.duplicate-sig` | 同一メソッドに複数の`sig`がアタッチされている。 |
| `dynamic.sorbet.degraded` | 型が元のSorbetの型より広いRigorキャリアに変換された。呼び出し箇所はdynamicプロヴェナンスを保持する。 |
| `dynamic.sorbet.unsupported` | SorbetのコンストラクトにRigor対応がない。`Dynamic[top]`に劣化。 |

[`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/)のタクソノミースロットは`plugin.<id>.*`と`dynamic.*`を既に収容している。スペック変更は不要。

## 実装スライシング

プラグインは契約が安定するまで`plugins/rigor-sorbet/`に置き、その後既存のパターン（[Railsプラグインロードマップ][rails-roadmap]参照）に従って`git subtree split`で抽出する。推奨順序:

1.  **`sig { params(...).returns(...) }`パーサー**。`Prism::CallNode`チェーンのミニインタープリタ。`params`/`returns`/`void`/`void.checked(...)`/`abstract`/`override`/`overridable`/`final`をカバー。プラグインはメソッド型を提供する。インテグレーションスペックでチェーンした呼び出しがsig経由で解決されることを証明する。
2.  **`T.let` / `T.cast` / `T.must` / `T.bind`**。これらをプラグインの`flow_contribution_for`出力に持ち上げる認識器。既存の`%a{rigor:v1:assert:}`機構と合成される。
3.  **型語彙変換器**。`T.any`/`T.all`/`T.nilable`/`T::Array`/`T::Hash`/`T::Boolean`/`T.untyped`/`T.anything`/`T.noreturn`/`T.proc`/`T.class_of`/`T.type_parameter`をマッピング（上記テーブルの密度の高い中央部）。欠落トークンは`dynamic.sorbet.unsupported`付きで劣化する。
4.  **RBIディレクトリウォーカー**。`sorbet/rbi/**/*.rbi`を読み込み、スタブメソッドボディのRubyソースとして扱い、パースしたsigをプロジェクトソースsigと同じファクトストアに供給する。
5.  **シグル尊重 + ディスパッチャー階層順序**。`# typed:`シグルはプラグインがファイルごとに何を提供するかに影響する。RBS/プロジェクト`sig/` RBS/`RBS::Extended`に対する階層順序が文書化される（コンフリクト時はRBSが優先。Sorbetのsigはプロジェクト`sig/` RBSと同じ階層に位置する）。
6.  **`T.absurd`網羅性配線**。`flow.unreachable-branch`と合成される。診断識別子: `plugin.sorbet.absurd-reachable`。
7.  **ドキュメント更新**。新しい`plugins/rigor-sorbet/README.md`と、Sorbetを使うプロジェクトから来るユーザー向けのアダプターをカバーする`docs/handbook/`のチャプター。[`docs/handbook/01-getting-started.md`](../../handbook/01-getting-started/)の「推論だけでは足りないとき」エスケープハッチからクロスリンク。
8.  **ミックスインチェーン解決（Tapioca DSL互換性）**。スライス（slice）4のRBIウォーカーは宣言クラス/モジュールの直下にsigを記録する。これは手書きのsig+defペアでは機能するが、sigを生成済みモジュールで宣言しそのモジュールをユーザークラスに`include`/`extend`するTapiocaの標準パターンを見逃す:

    ```rbi
    class Post
      include GeneratedAttributeMethods
      module GeneratedAttributeMethods
        sig { returns(String) }
        def body; end
      end
    end
    ```

    カタログはこれを`("Post::GeneratedAttributeMethods", :body, :instance)`として記録するが、ユーザー向けの`post.body`ルックアップは`("Post", :body, :instance)`である。このスライスは`Catalog`に`mixins_for(class_name) → {include: [...], extend: [...]}`を追加し、`CatalogWalker`が`sig`/`def`ペアと並んで`include`/`extend`宣言を記録するよう教え、ルックアップ時に記録済みミックスインチェーンを辿る。`extend`ルックアップはミックスイン済みモジュールのインスタンス側を参照する（Rubyのランタイム動作に一致: `extend M`はMのインスタンスメソッドを拡張するクラスのシングルトンメソッドに昇格させる）。

    このパターンはTapioca固有ではない — `sorbet/rbi/shims/`の手書きシムやコミュニティアノテーション`rbi-central`でも同じシェイプが使われる。このスライスはTapiocaユーザーだけでなく、すべてのRBIコンシューマーのギャップを埋める。設計探索については[`20260509-rigor-tapioca-investigation.md`](../../design/20260509-rigor-tapioca-investigation/)を参照。このスライスを独立した`rigor-tapioca`プラグインとしてではなくADR-11内にランディングする決定もそこで行われた。

[rails-roadmap]: ../design/20260508-rails-plugins-roadmap.md

## 作業上の決定

### WD1 — なぜ1つのプラグインで`sig`と`T.let`の両方をカバーするのか？

ふたつのサーフェスはパーサーを共有する（Sorbetの型語彙は`sig`ブロックでも`T.let`引数でも同じ）。2つのプラグインに分割するとトランスレーターが重複し、メソッドレベルとステートメントレベルのファクトの間に人工的な境界が生まれる。1つのプラグイン、2つの提供階層。

### WD2 — なぜシグルを尊重するのか？

シグル尊重なしでは、Sorbet自身が無視する`# typed: ignore`ファイルからシグネチャが浮上する。これは「SorbetがXを見て、RigorがYを見る」という期待を壊し、ユーザーが意図的に型付けから除外したファイルに誤った診断を生み出す。コストは最小限 — シグルはファイルの最初の非空行への単一の正規表現。

### WD3 — なぜRBS-vs-Sorbetのコンフリクト解決はRBS優先なのか？

ADR-1がRBSを標準的な契約として確定している。同じメソッドをRBSのsigとSorbetのsigの両方が記述する場合、既存の階層順序に従ってRBSが優先される。SorbetのsigをオーバーライドしたいユーザーはRBSを削除すべきであり、その逆ではない。逆方向（Sorbet優先）ではサードパーティDSLアノテーションがオーサードRBSをオーバーライドできてしまい、信頼モデルが逆転する。

### WD4 — なぜサポートされていない構造に独立した`dynamic.sorbet.*`ファミリーを設けるのか？

ADR-2 §「プラグイン診断プロヴェナンス」に従い、プラグインはプラグインオーサード診断に`plugin.<plugin-id>.*`で発行する。`dynamic.sorbet.*`ファミリーは境界横断ファクトに関する*型レベル*のファクトのために予約される（ADR-10の`dynamic.dependency-source.*`に類似）。構造レベルのパース/オーサリングエラー（例: 不正な形式のsigブロック）は`plugin.sorbet.*`を使う。両プレフィックスは共存する。

### WD5 — なぜSorbet → RBSコンバーターを出荷しないのか？

Sordが既に存在する。Rigor固有の等価物を構築するのは労力の重複であり、Rigorを静的vs.ランタイム分解の間違ったサイドに置く（コンバーターはオーサリングツールであり、アナライザーではない）。オフラインのRBS生成が欲しいユーザーはSordを使い、オンラインのtype-source読み込みが欲しいユーザーは`rigor-sorbet`を使う。

### WD6 — Rigorは`sorbet-runtime`のようなランタイムチェックをサポートするか？

しない。ADR-2 §「プラグインの信頼とI/Oポリシー」はRigorがアプリケーションコードを実行することを禁じている。ランタイムのストーリーは`sorbet-runtime`のまま — ランタイム型チェックが欲しいユーザーは`sorbet-runtime`をGemfileに追加し、Rigorは同じsigを静的に読む。ふたつの解析は独立していて合成される。

## 検討した代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| Sorbetの語彙をコア型キャリアに追加 | 却下 | ADR-0/ADR-1に違反。コアが肥大化。損失のあるラウンドトリップがスペックの書き直しを強制する。 |
| RBIファイルのみ読む（インライン`sig`をスキップ） | 却下 | RBIファイルは外部コードのスタブ。ユーザーの主要な価値はファーストパーティコードのインライン`sig`を読むこと。 |
| パース時に`sig`ブロックをRBSに自動変換し既存エンジンで実行 | 却下 | いずれにせよ境界での変換は損失あり。パースごとに行うと変換が継続的に再計算される。プラグイン側変換はgemバージョンごとにキャッシュされる（ADR-10のキャッシュと合成）。 |
| ランタイム強制をRigorに組み込む | 却下 | ADR-2が禁じている。静的解析と直交する。Sorbet独自のランタイムgemが既にそれを行っている。 |
| `sorbet-runtime`のセマンティクスをプラグインに含める | 却下 | プラグインはsigを読むが実行しない。ランタイム副作用はない。 |
| Sorbetの機能ごとに1プラグイン（`rigor-sorbet-sig`、`rigor-sorbet-let`等） | 却下 | パーサーが重複し、人工的な境界が生まれる。 |

## オープンクエスチョン

- `rigor-sorbet`は[ADR-10][adr-10]のオプトイン依存関係ソース推論に参加すべきか？ gemについてRBIファイルとオプトインソース推論の両方が利用可能な場合、RBIの型付きシグネチャが優先され、ウォーカーがRBIのカバーしないギャップを埋めるべきである。実装順序はADR-10のスライス5（キャッシュディスクリプタ）が先にランディングすることを示唆している。その後で合成を再検討する。
- `T.reveal_type`はRigorの`dump.type`診断に1:1でマッピングすべきか、独自の`plugin.sorbet.reveal-type`識別子を持つべきか？ スライス3まで保留 — `dump.type`から始め、ノイズが問題になれば分割する。
- プラグインはSorbetの`sorbet/config`ファイル（`--ignore`パスを尊重するため等）を読み込もうとすべきか？ 保留 — シグルのみの読み込みから始める。設定ファイル統合はポリッシュスライス。
- プラグインはSorbet → Rigorリファインメントへの移行提案を発行すべきか？ 例えば`T.must(x.foo)`が`%a{rigor:v1:assert: x.foo is ~nil}`を提案できる。ユーザーの需要が表れた場合は独立したADRで保留。

## 改訂履歴

- 2026-05-09 — 初期提案。Sorbetのsig/`T.let`/`T.cast`をtype-inference sourceとしてサポートする要求がトリガー。PHPスタイルのランタイム強制型への強い好みが述べられた。解決策: コア統合ではなくプラグインアダプター。
- 2026-05-09 — スライス8（ミックスインチェーン解決）を追加。Tapiocaの比較調査がトリガーとなり、Tapioca生成のDSL RBIがユーザークラスに`include`/`extend`された`Generated*`モジュールでsigを宣言することが判明した。スライス8は独立した`rigor-tapioca`プラグインとしてではなくADR-11内にランディングされる。根本的なセマンティクス（メソッドルックアップ中のミックスインチェーン走査）はTapioca固有ではなく一般的なRBI処理であるため。
