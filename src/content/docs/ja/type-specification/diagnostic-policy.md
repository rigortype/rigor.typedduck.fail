---
title: "診断ポリシー"
description: "rigortype/rigor docs/type-specification/diagnostic-policy.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/diagnostic-policy.md"
sourcePath: "docs/type-specification/diagnostic-policy.md"
sourceSha: "46e9a3ad1af365da96cb26eba4a9b132e22cd4d07bb09b6546ceeb466cd3dd68"
sourceCommit: "7a69f1427bb5d1985ccc87080ee90023ffb42665"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorは静かな拡幅よりも精密な診断を優先すべきです（SHOULD）。この文書は診断識別子の分類体系、表示規則、抑制マーカー文法を定義します。

`static.*`ファミリーは、[ADR-100](../../adr/100-static-diagnostic-family-and-void-origins/)により、使用地点ガード（`static.value-use.*`）と不完全推論カットオフ（`static.incomplete-inference.*`）に分かれます。最初に実装された識別子は`static.value-use.void`（作者が宣言した`-> void`の戻り値が値コンテキストで使われるケース）で、`use-of-void-value`のbleeding-edge機能の背後で出荷されています。バジェットカットオフの識別子は依然として予約されており（[inference-budgets.md](../inference-budgets/)参照）、**まだ組み込まれていません**。否定的事実と差分型の表示規則は[type-operators.md](../type-operators/)にあります。`Dynamic[T]`の表示規則はここにあります。

## 診断ガイドライン

> **ステータス**。これらのガイドラインは各状況における意図されたポリシーを述べるものであり、すべてが実装されているという主張ではありません。診断が下記の分類体系で**予約済み**（Reserved）とマークされたファミリー（`compat.*`、`hint.*`、`generated.*`）、または`static.incomplete-inference.*`のバジェット半分に属することになるガイドラインは、意図を記述しています。`void`値ガードは、直接の作者宣言ケースについては`bleeding_edge:`の背後で現在実装されています（[special-types.md](../special-types/) §`void`；[ADR-100](../../adr/100-static-diagnostic-family-and-void-origins/)）。[ADR-92](../../adr/92-normative-status-fidelity/)を参照。

- 値として`void`を使うことは一次診断です;下流のリカバリーは`top`を使い、同じ式に対して重複するカスケードレポートを避けるべきです（SHOULD）。
- 証明なしに`top`のメソッドを呼ぶことは診断です。
- 生の`untyped`のメソッドを呼ぶことは許されますが、チェックされていない境界に追跡可能であるべきです（SHOULD）。
- `Dynamic[T]`のメソッドを呼ぶことは静的ファセット`T`を使う場合があります（MAY）が、診断は証明が動的由来の値に依存していることを説明できるべきです（SHOULD）。
- ストリクト動的モードは、動的から精密な代入、引数、戻り値、`Array[Dynamic[top]]`のようなジェネリックスロットのリークを報告できます（MAY）。
- ストリクト静的モードはさらに、チェックされた静的事実ではなく動的由来の事実に安全性が依存するメソッド呼び出しやブランチ証明を報告できます（MAY）。
- 否定的事実によってナローイング（narrowing）されたブランチは、それが有用な場合にその事実を表示すべきです（SHOULD）。例: `String - ""`または`~"foo"`。
- 診断は裸の`~"foo"`が曖昧になる場合、`String - "foo"`のような明示的なドメインを持つ表示を優先すべきです（SHOULD）。
- 読み取り専用シェイプ（shape）エントリーを通じた書き込みは、Rigorがその事実を持つとき診断です。
- クローズドキーワードまたはオプションハッシュシェイプへの予期しないキーの渡しは診断です。
- 無効または矛盾する`RBS::Extended`アノテーションは診断です。
- メソッド実装はソースに関係なく受け付けられたシグネチャ契約（contract）に対してチェックされます: インライン`#:`、`# @rbs`、rbs-inlineパラメータアノテーション、生成されたスタブ、および外部`.rbs`宣言はすべて同じ実装側の力を持ちます。
- 再帰、演算子の曖昧さ、動的ディスパッチ、またはバジェット枯渇のために推論が停止するとき、Rigorはカットオフを報告しなければならず（MUST）、推論された型が精密であるふりをするのではなく、境界契約を提案すべきです（SHOULD）。
- 明示的な名前的パラメータ型が呼び出しを拒否するがメソッド本体がより小さな推論されたケイパビリティ（capability）ロールのみを必要とする場合、Rigorはアドホックなユニオン（union、合併型とも）を追加するよりもインターフェースに公開シグネチャを汎化することを提案できます（MAY）。
- プラグイン、生成済み、または`RBS::Extended`の事実を含む診断は安定した識別子を持つべきです（SHOULD）。公開識別子はソースファミリーを明確にするプレフィックスを使うべきです（SHOULD）（`plugin.<plugin-id>.<name>`、`rbs_extended.<name>`、`generated.<provider>.<name>`など）。一方、内部診断メタデータはより豊富なprovenanceを保持できます（MAY）。
- RBSエクスポート中の精度損失は、ユーザーが説明またはストリクトエクスポートモードを要求したとき報告可能であるべきです（SHOULD）。

## 識別子分類体系

診断識別子はプラグイン著者、RBSメタデータ、ユーザーの抑制マーカーが内部の番号付けと衝突せずにアドレス指定できるように階層的です。識別子はメジャーバージョン内で安定しています。新しい診断はどのプレフィックスの下にも追加できます（MAY）;名前変更または削除には非推奨ウィンドウが必要です。

ファミリー行は、今日エンジンが発行する診断に解決されないとき、**「現時点」という語句を含む太字のステータスマーカー**を持ちます —— これは[inference-budgets.md](../inference-budgets/)が未組み込みの`budgets:`サーフェスに使うのと同じ言い回しです。そのようなステータスは2つあります: **予約済み**（Reserved）は、主張されているが実装された診断を持たない識別子空間を指し、**診断ファミリーではない**（Not a diagnostic family）は、存在するが別のサーフェスを通じてユーザーに届く識別子を指します。空間を予約すること自体が1つの決定です —— それはファミリーを衝突する主張から守ります —— が、診断が存在するという言明ではありません。[ADR-92](../../adr/92-normative-status-fidelity/)により、Reservedマーカーなしでここに挙げられたファミリーは、少なくとも1つの実装された識別子を持たなければなりません（MUST）;`spec/docs/manual_drift_spec.rb`がこのテーブルをエンジンが発行する語彙に対して強制します。

| プレフィックス | 使用 |
|---|---|
| `dynamic.*` | `untyped`と`Dynamic[T]`の境界越境、チェックされていないジェネリックリーク、動的由来に証明が依存するメソッド呼び出し。[ADR-10](../adr/10-dependency-source-inference/)（解析器契約: [`docs/internal-spec/dependency-source-inference.md`](../internal-spec/dependency-source-inference/)）に従ったオプトインGemソース推論パス向けの`dynamic.dependency-source.*`（例: `gem-not-found`）を含む。 |
| `static.*` | 証明に至らずに止まった静的チェック。*どちら向きに*足りなかったかで分かれる（[ADR-100](../../adr/100-static-diagnostic-family-and-void-origins/)）。**`static.value-use.*`** —— 証明を要求する値が使用位置に到達した: `static.value-use.void`（実装済み、下の行を参照）と`static.value-use.top`（ガードなし`top`呼び出しの半分、[special-types.md](../special-types/) §`top`;まだ実装もADRもない）。**`static.incomplete-inference.*`** —— 推論が諦めて広げた: [ADR-41](../../adr/41-inference-budget-design/)（Proposed）/ [#158](https://github.com/rigortype/rigor/issues/158)が追跡し、その出所である[inference-budgets.md](../inference-budgets/) §「Budget table」でマークされたバジェットカットオフ識別子（`.recursion`、`.union-size`、…）;作者指定は`:info`で、実装された識別子を持たないまま先送りされている。 |
| `static.value-use.void` | 作者が宣言した`-> void`の戻り値が値コンテキスト（代入の右辺、呼び出しのレシーバー、または呼び出し引数）で使われる: 作者が依存するなと言った値が`top`に復元されて使われた。直接ディスパッチのケースのみ（[ADR-100](../../adr/100-static-diagnostic-family-and-void-origins/) WD2;推移的／祖先フォールバックのケースはWD4に先送り）。作者指定は`:warning`、すべてのプロファイルで`:off`に解決され、`use-of-void-value`のbleeding-edge機能によってのみ`:warning`に昇格する —— 新しい必須診断は[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) WD1の互換性変更である。 |
| `flow.*` | 制御フローのナローイング失敗、等価性と述語のリファインメント問題、事実安定性の違反 |
| `compat.*` | **予約済み —— 現時点では実装された識別子はありません**。RBS、rbs-inline、Steep互換シグネチャの互換性。創成期の予約（[ADR-1](../../adr/1-types/)）;出荷済みのシグネチャ互換性ルールは代わりに`def.override-*`（[ADR-35](../../adr/35-override-signature-compatibility/)）の下にある。 |
| `call.*` | メソッド呼び出しサイトの診断: `call.undefined-method`（メソッドがレシーバーの静的に既知のクラスに定義されていない）、`call.self-undefined-method`（暗黙的self呼び出しが、確実にクローズドな単独クラス上のどのメソッドにも解決しない、[ADR-24](../../adr/24-self-method-call-resolution/)スライス4 —— エンジン自身の解決ミスを消費し、ファイル内メソッドサーフェスが完全な単独プロジェクトクラスに限定、外部コーパスFPゲート待ちで`:off`で出荷）、`call.unresolved-toplevel`（トップレベルの暗黙的self呼び出しが、同一ファイルの`def`・`pre_eval:`パッチ・`Kernel` / `Object`メソッドのいずれにも解決しない、[ADR-34](../../adr/34-toplevel-unresolved-self-call-default/)）、`call.wrong-arity`（位置引数の数がどのシグネチャにもマッチしない）、`call.argument-type-mismatch`（引数がパラメータ契約を証明可能に違反する）、`call.possible-nil-receiver`（レシーバーが`T \| nil`でメソッドが`NilClass`に定義されていない）。 |
| `def.*` | メソッド定義の診断。オーバーライドシグネチャ互換性ファミリー`def.override-visibility-reduced` / `def.override-return-widened` / `def.override-param-narrowed`（[ADR-35](../../adr/35-override-signature-compatibility/)）を含み、これらはオーバーライドを、プロジェクト定義の先祖から継承するシグネチャに対して検証する。発火するのはオーバーライドと隠された先祖の両方が著者供給のシグネチャを持つときのみ（どちらか一方が推論のみなら沈黙する）で、`severity_profile:`を通じて深刻度をマップする;リスコフの推論は[robustness-principle.md](../robustness-principle/)にある。 |
| `rbs_extended.*` | `RBS::Extended`ペイロードの有効性、バージョン互換性、競合レポート。`rbs_extended.unsatisfied-conformance`（[rbs-extended.md](../rbs-extended/) §「明示的な適合ディレクティブ」）を含む: `%a{rigor:v1:conforms-to _Interface}`を持つクラスが、指名された構造的インターフェースが要求するメソッドを欠いている（存在）か、またはRBSシグネチャがインターフェースのそれの振る舞い的部分型でないメソッドを提供している（戻り値の共変 / パラメータの反変）。シグネチャ層がFPセーフなのは、両側が手書きRBSであり（ADR-35の両側手書き構成）、単一メソッド型かつ非`Dynamic`な位置のみを比較するためで、すでにインターフェースを満たすクラスを怖がらせることは決してない。`:warning`で作成（`strict`下では`:error`）;ディレクティブはオプトインなので、診断が頼まれもせず出ることはない。解決不能なインターフェース名は代わりに`dynamic.rbs-extended.unresolved` `:info`として表面化する。 |
| `rbs.coverage.*` | RBS環境のカバレッジ／整形式性テレメトリ。`rbs.coverage.missing-gem`は利用可能なRBSがないロック済みgemを報告する;`rbs.coverage.synthesized-namespace`はプロジェクトの`signature_paths:` RBSが、囲む名前空間なしに修飾名（`class Foo::Bar`）を宣言しているものを報告する——これはupstreamでは不正であり（`rbs validate`が拒否する）、Rigorはシグネチャが依然として解決できるよう`module`を合成する。どちらも`:info`で発行する。`rbs.coverage.quarantined-signature`は、パースできず**スキップ**された`signature_paths:`の`.rbs`を報告する:環境の残りは引き続きロードされるが、そのファイルが宣言していた型は失われるので、実行はクリーンになるのではなく*静かになる*。`:warning`で発行する（壊れたシグネチャ集合が黙って通ってはならないが、アップグレードがグリーンなビルドをレッドに変えてもいけないため）;`reject-unparseable-signatures`ブリーディングエッジ機能はこれを`:error`へ昇格させ、これが将来のメジャーでの意図されたデフォルトである。`rbs.coverage.environment-build-failed`はその双子で、結果としては一段階うるさい: `signature_paths:`のエントリーがきれいにパースできるものの、Rigorのバンドル済みRBSがすでに出荷している定数やクラスを再宣言する場合（解決時に`RBS::DuplicatedDeclarationError`）、RBS環境*全体*がnilに潰れ、すべての型問い合わせが`Dynamic[top]`を読み、ほとんどの診断が発火しなくなる —— 実行はクリーンではなく*空*になる。診断は競合するシグネチャファイルを指名する（送出されたエラーの宣言から取り出す）。その双子と同じ理由で`:warning`で発行する —— 競合は典型的にはユーザーの`sig/`とRigor*自身*のバンドル済みRBSの間にあり、`:error`をデフォルトにするとRigorのリリースがユーザーの変更なしにグリーンなビルドをレッドに変えてしまうため —— そして同じ`reject-unparseable-signatures`ブリーディングエッジ機能がこれを`:error`へ昇格させる。 |
| `plugin.<plugin-id>.*` | プラグインが貢献した診断 |
| `generated.<provider>.*` | **予約済み —— 現時点では実装された識別子はありません**。生成シグネチャプロバイダの診断;創成期の予約（[ADR-1](../../adr/1-types/) / [ADR-2](../../adr/2-extension-api/)）。 |
| `hint.*` | **予約済み —— 現時点では実装された識別子はありません**。スタイルとリファクタリングの提案、設定でゲート。[ADR-1](../../adr/1-types/) §「ケイパビリティロール」が`style.suggest_role_generalization`スイッチの背後で`hint.role-generalization.*`を定義している;このファミリーもその設定キーも実装されていない。 |
| `sig.*` | **現時点では診断ファミリーではない** —— これらの識別子は診断ストリームではなく`rigor sig-gen`のJSON出力を通じて表面化する（この行の末尾を参照）。[ADR-14](../../adr/14-rbs-sig-generation/)に基づくRBSシグネチャ生成器のテレメトリ。`sig.generated.new-file` / `sig.generated.new-method` / `sig.generated.tighter-return`（`rigor sig-gen`コマンドがRBSを生成する際に発行するメソッドごとの分類）と、`sig.skipped.complex-shape` / `sig.skipped.user-authored` / `sig.skipped.untyped-return` / `sig.skipped.unrenderable-rbs`（生成器が発行を控えたメソッドごとの理由;最後のものはRigorのレンダリング上の欠陥である——生成された行がRBSとしてパースできないため、発行される代わりに破棄される。パースできない`.rbs`は消費者によって丸ごと隔離されるからだ）を予約する。スライス1のMVPはこれらの識別子を診断ストリームではなくコマンドのJSON出力で公開する。後続のスライスで`--write`パスがランディングした際に`:info`診断として接続する。 |

## `Dynamic[T]`の表示規則

`Dynamic[T]`のprovenanceは診断プレフィックスファミリーによってレンダリングされます:

- `dynamic.*`ファミリー外の診断はナローイングされた静的ファセット`T`を小さな`from untyped`のprovenanceノートと共にレンダリングします。ナローイングされたファセットはユーザーが推論できるものです;ラップされた形式は動的境界自体についてではないメッセージにはノイズを追加するだけです。
- `dynamic.*`の診断、および`rigor explain`または`--explain`で要求された説明は完全な`Dynamic[T]`形式を表示します。なぜなら、まさにそれが浮上させるために存在する情報だからです。
- 内部トレース、キャッシュキー、プラグインの`Scope`クエリはメッセージのレンダリング方法に関係なく常に完全な`Dynamic[T]`形式を保持します。より高い層の診断を構成するために動的ファセットが必要なプラグインはそれを再構築する必要はありません。

## 深刻度解決

ルールは各診断を*著者が定めた*深刻度（ルール自身のデフォルト）で発行します。診断が結果に届く前に、アクティブな深刻度プロファイルとルールごとのオーバーライドがその深刻度を**再スタンプ**します。抑制パイプラインでは、これはインラインマーカーとベースライン（baseline）の間に位置します: インラインの`# rigor:disable` → **深刻度解決** → プロジェクトベースライン（[ADR-22](../../adr/22-baseline-and-project-onboarding/)）。

これを駆動する`.rigor.yml`キーは2つあります（[ADR-8](../../adr/8-steep-inspired-improvements/)）:

- `severity_profile:` — `lenient` / `balanced`（デフォルト）/ `strict`のいずれか。各プロファイルは正規ルールidを深刻度にマップするルールごとのテーブルで、プロファイルは`:error`の広さと採用しやすさをトレードオフします（`lenient`は不確実なルールを`:warning`/`:off`に落とし、`strict`はすべてのルールを`:error`に上げます）。アクティブプロファイルのテーブルに存在しないルールは著者が定めた深刻度を保ちます。
- `severity_overrides:` — `{ rule_id => severity }`マップ。キーは正確な正規ルールid（`call.undefined-method`）か、**ファミリーワイルドカード**（`call`）——最初のドット区切りセグメントがキーに等しいすべてのルールにマッチします。

解決された深刻度は`:error` / `:warning` / `:info` / `:off`のいずれかです;**`:off`は診断を完全にドロップします**。`Configuration::SeverityProfile.resolve`はこの優先順位（高い順）をMUST適用します:

1. `nil`のルールidは著者が定めた深刻度を保ちます（参照するものがありません）。
2. ルールidに対する正確な`severity_overrides`エントリー。
3. それ以外ではファミリーワイルドカードの`severity_overrides`エントリー（ルールidの最初のセグメント）。
4. それ以外ではアクティブプロファイルテーブルのルールidに対するエントリー。
5. それ以外では著者が定めた深刻度。

未知の`severity_profile:`値は`balanced`にフォールバックします。この解決が、`def.override-*`と`protocol_contracts:`（[ADR-28](../../adr/28-path-scoped-protocol-contracts/)）ルールの言う「深刻度は`severity_profile:`を通じてマップする」の意味です: ルールは固定された著者深刻度で発行し、プロファイルがそれをエラー・警告として表面化させるか、抑制するかを決めます。

## 抑制マーカー

Rigorは、特定の診断を1行単位またはファイル全体で抑制するための、ソース内コメント文法を認識します。以下のRigorネイティブのマーカーが出荷済みの表面です。他のエコシステムのマーカーの認識は、設計済みだが未出荷の互換性拡張です。

### Rigorネイティブのマーカー

Rigorネイティブのマーカーは、PHPStanのアノテーションの感覚を踏まえながらアプリケーション側の型DSLを発明しないRubyコメント文法を使います。

- **行形式**: `# rigor:disable <rule1>, <rule2>` — その物理行で列挙したルールを抑制します。`# rigor:disable all`はその行のすべてのルールを抑制します。
- **ファイルレベル形式**（v0.1.2）: `# rigor:disable-file <rule1>, <rule2>` — ファイル内のすべての行について列挙したルールを抑制します。`# rigor:disable-file all`はファイル内のすべての診断を抑制します。

ルールリストはカンマ区切りおよび/または空白区切りで、上記のルールIDプレフィックス（`call.undefined-method`）を使います。リテラルの`all`キーワードと短い旧来のエイリアスは、`rigor explain`が使うのと同じ展開を通じて解決されます。ブロックスコープ（`start` / `end`）の形式はありません。

インラインマーカーは、設定された`severity_profile:`より前、そしてプロジェクトベースライン（ADR-22、最後の抑制レイヤー）より前に適用されます。運用ガイドはユーザーマニュアル § 「診断」を参照してください。

### トークン解決

ルールトークン——`# rigor:disable[-file]`マーカー内、または`.rigor.yml`の`disable:`リスト内のもの——は、**パース時に正規ルールidのセットへ展開されます**（`resolve_rule_token`）;行ごと／ファイルごとの抑制マッチは、その後そのセットに対する診断の正規`rule`の正確なメンバーシップテストになります。認識されるトークン形は4つです:

- `all` — リテラルのワイルドカード;スコープ内のすべてのルールを抑制します。ルールリストへ展開されるのではなく、センチネルの`all`として保たれます。
- **旧来の非プレフィックスエイリアス**（`undefined-method`）——単一の正規id（`call.undefined-method`）にマップされます。
- **ファミリーワイルドカード**——診断ファミリー`call` / `flow` / `assert` / `dump` / `def`のいずれか——`<family>.`配下のすべての正規idに展開されます。
- **正確な正規id**（`call.undefined-method`）——それ自身として保たれます。

認識されないトークンはそのまま保たれるので、`rule`が文字通りその文字列である診断にのみマッチします（実質的にノーオペレーション——*妥当性ルール*を参照）。`rule`が`nil`の診断は決して抑制されません。ファミリー展開はトークン時に起こるので、マッチ自体は決してプレフィックスマッチングをしません——常に展開された正規idセットに対する正確な等価です。

### エコシステム互換マーカー（計画中、未実装）

他のエコシステムのマーカーの認識 — Steepの行スコープの`# steep:ignore`、および`.rigor.yml`の`compat.*`スイッチによるオプトインのSorbet `# typed:` / RuboCop `# rubocop:disable` — は、設計済みだが未出荷の互換性表面です。それがランディングするまでは、上記のRigorネイティブのマーカーのみが尊重され、外来のマーカーは通常のコメントとして扱われます。

### 有効性規則

- 未知または空のマーカーは、文書化されたマッチング挙動を保ちます（認識されないトークンはそのまま保持され、トークンのないマーカーは何も抑制しません）が、もはや静かではありません。既知の識別子——正規のルールID、レガシーエイリアス、`all`、ファミリーワイルドカード、既知の非カタログエンジンID、既知の非checkファミリー下のドット付きID（決してフラグされない`plugin.`接頭辞付きのトークンを含む）のいずれか——に解決されないマーカートークンは`suppression.unknown-rule`を、ルールをまったく挙げないマーカーは`suppression.empty`を発火します（どちらもすべてのプロファイルで`:warning`）。検証は抑制フィルタリングの前に行われるため、両診断とも他のルールと同様にそれ自体を抑制できます。マーカーに言及したあと非トークンのテキストが続くだけのコメントは、通常のコメントのままです。
