---
title: "診断ポリシー"
description: "rigortype/rigor docs/type-specification/diagnostic-policy.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/type-specification/diagnostic-policy.md"
sourcePath: "docs/type-specification/diagnostic-policy.md"
sourceSha: "348b2fc18d7ca97bac31f1fb550939455a6f91d1f75bf6e7f80be9bd84c5726d"
sourceCommit: "ea8ac6950eae8c643cd2811da2569fd4809f89c8"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorは静かな拡幅よりも精密な診断を優先すべきです（SHOULD）。この文書は診断識別子の分類体系、表示規則、抑制マーカー文法を定義します。

推論バジェットが使うカットオフ識別子は`static.*`ファミリーにあります（[inference-budgets.md](../inference-budgets/)参照）。否定的事実と差分型の表示規則は[type-operators.md](../type-operators/)にあります。`Dynamic[T]`の表示規則はここにあります。

## 診断ガイドライン

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

| プレフィックス | 使用 |
|---|---|
| `dynamic.*` | `untyped`と`Dynamic[T]`の境界越境、チェックされていないジェネリックリーク、動的由来に証明が依存するメソッド呼び出し。[ADR-10](../adr/10-dependency-source-inference/)（解析器契約: [`docs/internal-spec/dependency-source-inference.md`](../internal-spec/dependency-source-inference/)）に従ったオプトインGemソース推論パス向けの`dynamic.dependency-source.*`（例: `gem-not-found`）を含む。 |
| `static.*` | 不完全推論カットオフを含む、証明に至らない静的チェック |
| `flow.*` | 制御フローのナローイング失敗、等価性と述語のリファインメント問題、事実安定性の違反 |
| `compat.*` | RBS、rbs-inline、Steep互換シグネチャの互換性 |
| `call.*` | メソッド呼び出しサイトの診断: `call.undefined-method`（メソッドがレシーバーの静的に既知のクラスに定義されていない）、`call.unresolved-toplevel`（トップレベルの暗黙的self呼び出しが、同一ファイルの`def`・`pre_eval:`パッチ・`Kernel` / `Object`メソッドのいずれにも解決しない、[ADR-34](../../adr/34-toplevel-unresolved-self-call-default/)）、`call.wrong-arity`（位置引数の数がどのシグネチャにもマッチしない）、`call.argument-type-mismatch`（引数がパラメータ契約を証明可能に違反する）、`call.possible-nil-receiver`（レシーバーが`T | nil`でメソッドが`NilClass`に定義されていない）。 |
| `def.*` | メソッド定義の診断。オーバーライドシグネチャ互換性ファミリー`def.override-visibility-reduced` / `def.override-return-widened` / `def.override-param-narrowed`（[ADR-35](../../adr/35-override-signature-compatibility/)）を含み、これらはオーバーライドを、プロジェクト定義の先祖から継承するシグネチャに対して検証する。発火するのはオーバーライドと隠された先祖の両方が著者供給のシグネチャを持つときのみ（どちらか一方が推論のみなら沈黙する）で、`severity_profile:`を通じて深刻度をマップする;リスコフの推論は[robustness-principle.md](../robustness-principle/)にある。 |
| `rbs_extended.*` | `RBS::Extended`ペイロードの有効性、バージョン互換性、競合レポート |
| `rbs.coverage.*` | RBS環境のカバレッジ／整形式性テレメトリ。`rbs.coverage.missing-gem`は利用可能なRBSがないロック済みgemを報告する;`rbs.coverage.synthesized-namespace`はプロジェクトの`signature_paths:` RBSが、囲む名前空間なしに修飾名（`class Foo::Bar`）を宣言しているものを報告する——これはupstreamでは不正であり（`rbs validate`が拒否する）、Rigorはシグネチャが依然として解決できるよう`module`を合成する。どちらも`:info`で発行する。 |
| `plugin.<plugin-id>.*` | プラグインが貢献した診断 |
| `generated.<provider>.*` | 生成シグネチャプロバイダの診断 |
| `hint.*` | スタイルとリファクタリングの提案、設定でゲート（例: `hint.role-generalization.*`） |
| `sig.*` | [ADR-14](../../adr/14-rbs-sig-generation/)に基づくRBSシグネチャ生成器のテレメトリ。`sig.generated.new-file` / `sig.generated.new-method` / `sig.generated.tighter-return`（`rigor sig-gen`コマンドがRBSを生成する際に発行するメソッドごとの分類）と、`sig.skipped.complex-shape` / `sig.skipped.user-authored` / `sig.skipped.untyped-return`（生成器が発行を控えたメソッドごとの理由）を予約する。スライス1のMVPはこれらの識別子を診断ストリームではなくコマンドのJSON出力で公開する。後続のスライスで`--write`パスがランディングした際に`:info`診断として接続する。 |

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

- 未知または空のマーカーは、現在のところフラグされるのではなく通常のコメントとして扱われます（黙って無視されます）。死んだ（未知ルールの）抑制をリファクタリング中に浮上させるために警告することは、計画中の改良です。
