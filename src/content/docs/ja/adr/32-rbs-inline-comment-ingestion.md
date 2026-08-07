---
title: "ADR-32 — オプトインプラグインとしてのインラインRBSコメント取り込み"
description: "rigortype/rigor docs/adr/32-rbs-inline-comment-ingestion.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/32-rbs-inline-comment-ingestion.md"
sourcePath: "docs/adr/32-rbs-inline-comment-ingestion.md"
sourceSha: "764f0dc3d96235f3a3f2cd6db020c6856a1d5c0f2761af408f86c93ba46170cc"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
translationStatus: "translated"
sidebar:
  order: 4032
---

ステータス: **Accepted、2026-05-25; v0.1.10で実装**。

バンドルされた`rigor-rbs-inline`プラグイン、`source_rbs_synthesizer:`マニフェストフィールド、env構築時の合成フック、マジックコメントゲーティング、`require_magic_comment:`設定ノブ、ファイル単位のキャッシュ / フェイルソフト処理がすべて出荷された;`--treat-all-as-inline-rbs` CLIフラグも同じリリースでランディングした。上流の[rbs-inline](https://github.com/soutaro/rbs-inline)コメント語彙（`# @rbs name: T`、`#: () -> T`、`# @rbs return: T`、属性`#:`など）を消費するという決定を記録する。上流ライブラリをenv構築時に実行し合成RBSを解析環境に貢献する`rigor-rbs-inline`プラグインを出荷することで実現する。Rigorのコアはゼロランタイム依存のまま（ADR-0）;rbs-inline gemはコアの責任ではなくプラグインの責任になる。

**修正2026-05-25** WD10追加 — ホストコンテキストがファイルごとのマジックコメントゲートをスキップできる`require_magic_comment:`プラグイン設定ノブ（デフォルト`true`）。ADR-29ブラウザプレイグラウンドはこれを`false`に設定することで、ユーザーが`# rbs_inline: enabled`を入力することなく、貼り付けられたスニペットがインラインRBSとして解析される。

**修正2026-07-30** WD11とWD12を追加し、[#229](https://github.com/rigortype/rigor/issues/229)をクローズした。WD11は、rbs 4.xに組み込まれた`RBS::InlineParser`へ移行せず`rbs-inline` gemをリーダーとして維持し、再検討のための同等性の基準を定める: 組み込みパーサは上位集合ではなく、`class << self`をサイレントに誤帰属する。WD12は、Rigorがパースするが尊重しないアノテーションを飲み込まずに報告する、というルールを追加する —— `module-self`の2つの非互換な綴りが露呈させたケースであり、WD6の合成エラー経路ではカバーされない。

## コンテキスト

以下のようなRubyファイルは

```rb
# @rbs asc_or_desc: :asc | :desc
def ascdesc(asc_or_desc)
  asc_or_desc
end

p ascdesc :desc
p ascdesc :bad
```

今日`asc_or_desc`を`Dynamic[Top]`として型付けし、`ascdesc :bad`は診断を発しない。原因は明確: Rigorのパイプラインは`# @rbs`コメントを見ない。`lib/`、`spec/`、`examples/`のgrepで確認済み;`MethodParameterBinder`はRBS環境、RBS::Extended `%a{rigor:v1:param:}`アノテーション、ADR-28プロトコル契約（contract）のみを読む。

下流の機構は既に揃っている。同じ契約を`.rbs`ファイルで再エンコードすると

```ruby
class AscDesc
  def ascdesc: (:asc | :desc) -> (:asc | :desc)
  def ascdesc2: (:asc | :desc) -> (:asc | :desc)
end
```

エンジン変更なしで期待通りの動作が得られる。つまり欠けているリンクは**純粋に**rbs-inline形コメントから実際の`.rbs`ファイルが埋めるのと同じRBS環境へのパスだけである。

上流の`rbs-inline`文法は実質的なもので、以下を含む:

- **メソッド型**（3形式）: `#: () -> T`、`# @rbs () -> T`、docスタイルの`# @rbs name: T` + `# @rbs return: T`。
- **ジェネリクス**（`# @rbs generic A`）、**mixin generics**、**`# @rbs inherits`**、**`# @rbs override`**。
- **ブロック導入型**（`class_methods do...end`ブロック内の`# @rbs class ClassMethods`）。
- **属性**（`attr_reader :name #: String`）。
- **インスタンス変数**（`# @rbs @name: String`）。
- **定数**（`VERSION = ... #: String`）。
- **エイリアス**、**`# @rbs skip`**、**`# @rbs!`生RBS埋め込み**、**`# @rbs %a{…}`アノテーション**。
- ファイルの標準オプトイントリガーとしての**マジックコメント** `# rbs_inline: enabled`;オプトアウトは`# rbs_inline: disabled`。

この文法をRigor内で再実装すると、非自明な上流の努力を複製しすべてのrbs-inlineリリースで分岐するリスクがある。既に整形RBSを出力する上流ライブラリを呼び出す方が、大幅に小さく耐久性の高いエンジニアリング選択である。

しかしRigorのコアはゼロランタイム依存スタンスを表明しており（ADR-0）、`rbs-inline`は非自明なgemである（`prism`と`rbs`に依存するが、それら自体は既に必要;ただし独自のバージョン管理サーフェス（surface）を導入する）。それをコアのランタイム依存として追加することはADR-0と矛盾する。

このADRはADR-25が類似の「envへのRBS貢献」フック用に既に使っている**プラグインをオプトイン境界として**採用することで緊張を解消する: インラインRBSリーダーは`rigor-rbs-inline`プラグインgemに住み、プラグインのgemspecが`rbs-inline`依存を宣言し、プロジェクトは`.rigor.yml`の`plugins:`に1行追加することで動作を有効化する。

## 決定

`plugins/rigor-rbs-inline/`以下に新しいバンドルプラグイン**`rigor-rbs-inline`**を出荷する:

1. 独自のgemspec（`rigortype` gemspecではない）で上流`rbs-inline` gemへのランタイム依存を宣言する。
2. 上流の**`# rbs_inline: enabled`**マジックコメントをファイルごとのオプトイントリガーとして尊重する——RigorのインラインRBSリーダーは上流rbs-inlineと同じ有効化ルールを持つ。マジックコメントのないファイルは今日と全く同様に処理される。
3. env構築時に、プロジェクトのチェック対象Rubyファイルを走査し、マジックコメントのある各ファイルに対して`rbs-inline`のパーサAPIを呼び出し、合成RBSを`signature_paths:`、`bundler:`、`rbs_collection:`が埋めるのと同じ環境に貢献する。

新しいオプションの`Plugin::Manifest`フィールド、**`source_rbs_synthesizer:`**がエンジン側のフックを公開する。プラグインはフィールドをcallable `(source_file_path) -> rbs_source_string | nil`に設定する。`Plugin::Loader`がcallableをプラグインIDごとに記録し、`Environment.for_project`がenv構築中にソースファイルごとにそれを呼び出し、結果のRBSストリームをシグネチャ入力の残りとマージする。

## 作業上の決定

### WD1 — コア機能ではなくプラグイン

コアの`rigortype`に`rbs-inline`取り込みを追加することは却下される。

- ADR-0はアナライザーを**`prism` / `rbs` / `language_server-protocol`以外のゼロランタイム依存**にコミットしている。
- プラグイン境界はオプトインの追加RBS貢献のための確立されたメカニズムである（ADR-25はこれを静的バンドル用に承認;このADRは合成ソースRBSに拡張する）。
- 有効化は`.rigor.yml`の1行——`plugins: [rigor-activesupport-core-ext]`と同じUX。

### WD2 — 上流の`# rbs_inline: enabled`マジックコメントを尊重する

プラグインは最初の非空白行に`# rbs_inline: enabled`を含むファイルに対してのみRBSを合成する。マジックコメントのないファイルは手つかずに通過する。

- 上流rbs-inlineとのスペック整合性: 同じファイルをソース変更なしでどちらのツールへの入力としても有効。
- プロジェクトはインラインRBSファイルとプレーンなRubyファイルを自由に混在させられる。

### WD3 — 上流`rbs-inline`ライブラリを使用する

プラグインはインプロセスで`rbs-inline`のパーサAPIを呼び出し（サブプロセスなし）、結果のRBS ASTまたはソーステキストを受け取り、`RbsLoader`の合成ソースチャネルに供給する。

### WD4 — 新しい`source_rbs_synthesizer:`マニフェストフィールド

エンジン側のフックは新しいオプションの`Plugin::Manifest`フィールドで、callable `(source_file_path) -> rbs_source_string | nil`を保持する。

- ADR-25の`signature_paths:`とは別物。ADR-25はプラグインgem内に住む**静的バンドル**RBSを出荷し;このADRはenv構築時にアナライズ対象のプロジェクト自身のソース**から**RBSを合成する。
- 将来のプラグインが同じフックを他の「Rubyソース → RBS」ブリッジ用に再利用できる（`rbs-inline`の語彙ではなくYARD `@param` / `@return`タグを読む仮想的な`rigor-yard`など）。

### WD5 — 合成はファイルごと;キャッシュキーはソースファイル

プラグインはソースファイルごとに一度実行される。ファイル`F`の合成RBSは`F`のコンテンツのみの関数——隣接ファイルを見ない。Rigorのファイルごとキャッシュ（ADR-6）が自然なキャッシュレイヤーである: 既存のファイルごとキー（path + sha + Rigorバージョン）が「（path、sha、プラグインID、プラグインバージョン）」に拡張される。

### WD6 — 合成エラーのフェイルソフト

rbs-inlineがプロジェクトファイルでパースエラーを発生させた場合、プラグインは`nil`を返し（貢献なし）、ファイルと上流エラーメッセージを名前付きで`source-rbs-synthesis-failed`インフォ診断を発行する。解析は続行する——ファイルはノーインラインRBS状態（影響を受ける定義に対する`Dynamic[Top]`）にフォールバックし、今日の動作と一致する。

### WD7 — インラインRBS宣言のパラメータ型は実際の`.rbs`と同一に扱われる

`# @rbs name: :asc | :desc`で宣言されたパラメータ型は`def f: (:asc | :desc) -> ...`と全く同様にパラメータをバインドする。パラメータバインダーは区別しない;診断コードは同じ;ADR-5のロバストネス非対称の著作ルールが同じ境界で適用される。

### WD8 — pre-1.0プラグイン契約への加法的追加

新しい`source_rbs_synthesizer:`マニフェストフィールドは**オプション**。それを宣言しない既存プラグインは影響を受けない。プラグイン契約（ADR-2）はまだpre-1.0;これはADR-25のWD6がカバーする種類の加法的拡張で、v0.1.xライン内に安全に着地できる。v1.0.0契約が凍結する公開サーフェスにはこのフィールドを含めるべきである。（[ADR-50](../50-release-engineering-and-stability-strategy/)により修正: ハードフリーズは**v1.0.0**;**v0.2.0**はサーフェスの列挙を開始する — それ自体は凍結しない。これは元の「v0.2.0が凍結する」という記述に取って代わる。）

### WD9 — トップレベル`def`の意味論は上流動作に依存する

ユーザーの診断例はトップレベル`def`を使う。上流rbs-inline wikiは`class` / `module`内の`def`を明示的に文書化するが、トップレベル`def`は列挙されていない。したがってトップレベルdefに対するプラグインの挙動は「Prismでパースされたトップレベルdefに対してrbs-inlineが行うことそのもの」である——おそらく生成される`Object#…`インスタンスメソッドだろうが、スライス1でインストール済みのrbs-inlineバージョンに対して確認する。

回避策は既に存在する: defをクラスにラップする（確認済み——このADRの診断のクラスラップバリアントが`argument type mismatch`を生成した）。

### WD10 — ホストコンテキストオーバーライド: `require_magic_comment:`プラグイン設定

プラグインは単一のboolean設定キー**`require_magic_comment:`**（デフォルト`true`、これはWD2をそのまま通常の`.rigor.yml`駆動プロジェクトに対して保持する）を公開する。分析スコープ全体を所有するホストコンテキストは`false`に設定でき、その場合シンセサイザーが見るすべてのファイルはマジックコメントを持つかのように扱われ、先頭のファイルチェックはない。

**ADR-29プレイグラウンドはこれを`false`に設定する**ことで、`# @rbs`形コメントを持つ貼り付けスニペットがユーザーが`# rbs_inline: enabled`を入力することなく解析される。プレイグラウンドは単一バッファの単一リクエストの探索サーフェスであり、WD2が緩和しようとしている複数ファイルプロジェクトの摩擦（他のファイルが誤ってオプトインされる）が存在しない。

- エスケープハッチは**プラグインインスタンスごと、プラグイン設定経由**——Rigor全体のポリシー変更ではない。
- プラグインの`config_schema`がキーを宣言;ユーザーは`.rigor.yml`の`plugins:`エントリーの既存プラグイン設定サーフェスを通じて提供する。

### WD11 — `rbs-inline` gemがリーダーであり続ける; `RBS::InlineParser`はまだ上位集合ではない

rbs 4.0は`rbs` gemに組み込まれた`RBS::InlineParser`を出荷し、rbs 4.1はそれを前進させた。WD3が`rbs-inline` gemを選んだのはそれが唯一の実装だったときなので、この選択は今や生きた問いであり、[ADR-93](../93-default-rbs-inline-ingestion/)がプラグインをデフォルトで配線したことで、これはオプトインの一群ではなくユーザーベース全体の方言になる。

**決定: gemを維持する。** 組み込みパーサは上位集合ではなく、問題になる差は機能数ではなく正しさの差だ。

実測された文法差分[`docs/notes/20260730-inline-rbs-parser-grammar-diff.md`](../../notes/20260730-inline-rbs-parser-grammar-diff/)（両パーサを1つのコーパスに掛け、宣言された`(class, kind, member, type)`のタプルに正規化）に基づく:

- **`class << self`がサイレントに誤帰属される。** 組み込みパーサは内側の`def`を診断ゼロで**インスタンス**メソッドとして宣言する。これは機能の欠落ではなく、環境へ注入される誤ったファクトだ: 実在するシングルトンメソッドへの呼び出しが`call.undefined-method`の偽陽性になり、捏造されたインスタンスメソッドが本物の診断を抑制する。[ADR-5](../5-robustness-principle/)は偽陽性を最悪ケースの静的な読みより上位に置いており、ADR-93のデフォルト配線は`rbs-inline`が解決するすべてのユーザーがこれを抱え込むことを意味する。
- **4つの構文が失われる**: `@rbs generic T`（型パラメータが落ちる）・`@rbs!`の埋め込みRBS・`@rbs inherits`・メソッド可視性。いずれも組み込みパーサに端的に拒否される。
- **この問いのきっかけになった機能は差ではない。** `def self.`のシングルトン定義と`class`/`module`下の`# @rbs @ivar: T`は両者で同一に扱われる。`module-self`は両者がサポートするが、**非互換な綴り**で —— WD12を参照。
- **rbsのフロアは障害ではない**。[ADR-94](../94-rbs-inline-reader-and-the-rbs-3x-floor/)の隣接する問いとは違い、`rbs-inline`自身が`rbs (~> 4.0)`を要求するので、ADR-93の自動配線が有効化しうるユーザーはすでに全員4.x上にいる。
- **移行は差し替えではなく書き直しになる。** 組み込みパーサには`opt_in:`のマジックコメントモードがなく（WD2 / WD10に対応物がない）、アノテーション存在プローブもなく（ADR-93のゲーティングを作り直すことになる —— そしてそのゲーティングは効いている: ゲートなしのモードはmailで26 → 42診断と実測された）、テキストライターもない。RBSソースではなく`Environment#add_source`向けの宣言を返すからだ。最後の点はこのADRのレンダリングして再パースする経路より恐らく優れているが、それはまったく別の統合である。

**再検討のための同等性の基準**: `RBS::InlineParser`におけるgenerics・`@rbs!`・正しい`class << self`の扱い。3つ目は機能ではなく前提条件だ —— それが成り立つまで、組み込みパーサの採用は偽陰性を偽陽性と交換することになる。

上流の進む方向に疑いはない（ADR-94は、soutaroがgemを、その実装が`rbs`へマージされるプロトタイプと呼んだことを記録している）。この作業上の決定は方向ではなく到達についてのものだ。

### WD12 — Rigorがパースするが尊重しないインラインアノテーションを報告する

`module-self`は、WD6がカバーしない失敗モードを露呈させた。WD6は合成**エラー**に対してフェイルソフトである。こちらは*成功した*合成が、作者が求めた宣言をサイレントに省くケースだ:

| 綴り | 結果 |
| --- | --- |
| `# @rbs module-self Comparable` —— gemの文法 | 尊重される |
| `# @rbs module-self: Comparable` —— **上流の`docs/inline.md`** | `ModuleSelf`アノテーションへパースされたのち、self型なしで出力され、何も報告されない |

上流のインラインドキュメントに従うユーザーは2番目の形式を書く。そのアノテーションコメントは合成されたRBSへエコーすらされるので、この脱落は実行時だけでなく目視でも見えない。

**決定: パースはされるが何も寄与しないアノテーションは、飲み込まずに報告する。** `self_types`が空のパース済み`ModuleSelf`アノテーションはそれの精密なシグネチャであり、プラグインはADR-93の存在プローブのためにすでに`AnnotationParser`を走らせているので、このチェックはパスを増やさない。重大度は`:info` —— コードは正しいRubyであり、アノテーションは兄弟方言では合法なので、これはユーザーのプログラムのエラーではなく型ソースの適用不足である。

これが具体化する一般ルール: **2つの方言が綴りで食い違うところでは、避けるべき失敗は沈黙である。** ユーザーが目にできる拒否されたアノテーションは回復可能だが、パーサに受理されライターに捨てられたものはそうではない。

下流での報告は緩和であって修正ではない。自分自身のライターが捨てるアノテーションを受理するパーサは上流`rbs-inline`の欠陥であり、そこで直せばRigorのユーザーだけでなくすべてのrbs-inlineユーザーに対して差が閉じる。

## 結果

### 正の結果

- **ユーザーの診断例が1行のアクティベーションで機能するようになる**。`plugins: [rigor-rbs-inline]`追加 + `# rbs_inline: enabled`マジックコメントで`ascdesc :bad`が実際の`.rbs`パスと同じ`argument-type-mismatch`を発生させ、`ascdesc2`の戻り値型が`:asc | :desc`にナローイング（narrowing）される。
- **Rigorは無料で完全なrbs-inline文法を継承する**。
- **フックが他の「Rubyソース → RBS」プラグインに汎化される**。YARDタグリーダー、typeprofブリッジ、カスタムアノテーション規約——各々が独立したプラグインとして出荷できる。
- **新しいトップレベル設定軸なし**。有効化は既存の`plugins:`リストを再利用。

### 負の結果

- **pre-1.0契約に1つの新しいオプションフィールド**。加法的で低リスク（WD8）。
- **プラグインgemがユーザーのbundleに`rbs-inline`を追加する**。コアアナライザーはゼロ依存のまま（WD1）。
- **マジックコメントのあるファイルのファイルごとの呼び出しオーバーヘッド**。ファイルごとキャッシュ（WD5）とマジックコメント要件のスコープゲート効果（WD2）で軽減。

### 繰り越し

- **`rigor-rbs-inline`著作SKILLはこのADRに含まれない**。プラグイン独自のREADME + インラインRBSのハンドブックカバレッジがv1ユーザー向けサーフェス。
- **LSPインクリメンタルフロー**はこのADRでシンセサイザーフックの周囲に具体的に設計されていない。ファイルごとキャッシュ（WD5）によって明白なインクリメンタルストーリーが機能するが、エンドツーエンドのLSP統合はADR-19 LSPロードマップ下に別途キュー済み。

## 実装スライシング（提案）

### スライス1 — マニフェストフィールド + エンジンフック + プラグインスケルトン

- `Plugin::Manifest`がオプションの`source_rbs_synthesizer:`を獲得する（callable;マニフェスト構築時に凍結）。
- `Plugin::Loader`がプラグインIDごとにcallableを記録する。
- `Environment.for_project`がチェック対象ソースファイルを走査し、ファイルごとに登録された各シンセサイザーを呼び出し、非nilのRBS文字列を設定の`signature_paths:`と並んで`RbsLoader`に供給する。
- `plugins/rigor-rbs-inline/`のスキャフォールド: `rbs-inline`に依存するgemspec、`require_magic_comment:`のための`config_schema`を持つプラグインクラス（デフォルト`true`、WD10）、マジックコメントを確認するかどうかにconfig knobを参照して`RBS::Inline::Parser`または等価なものにディスパッチするシンセサイザーcallable。

### スライス2 — 失敗ハンドリング + キャッシュ

- シンセサイザーエラーパス: `source-rbs-synthesis-failed`インフォ診断を発行し、プラグインが`nil`を返す（WD6）。
- プラグインID + バージョン + `require_magic_comment:`値を含むファイルごとキャッシュキー拡張（WD5）。

### スライス3 — `rigor-rbs-inline`プラグインポリッシュ + ドキュメント

- アクティベーションフロー、`# rbs_inline: enabled`要件、既知のトップレベルdefキャビアット（WD9）、診断例の再現を文書化したプラグインREADME。
- 関連する章（おそらく「型ソース」または「RBSの著作」）に1段落とコードサンプルを付けてハンドブックを更新。
- ADR-25（静的バンドルの先例）からのクロスリファレンス。

## 参照

- [ADR-0](../0-concept/) — プラグイン境界が保持するゼロランタイム依存スタンス（WD1）。
- [ADR-2](../2-extension-api/) — このADRが新しいオプションマニフェストフィールドで拡張するプラグイン契約（WD8）。
- [ADR-5](../5-robustness-principle/) — ロバストネス非対称の著作;インラインRBSユーザー宣言パラメータは等価な実`.rbs`宣言と全く同様に扱われる（WD7）。
- [ADR-6](../6-cache-persistence-backend/) — シンセサイザーフックが拡張するファイルごとキャッシュ（WD5）。
- [ADR-25](../25-plugin-contributed-rbs/) — 静的バンドルRBS貢献;ここで使われるプラグイン境界の先例。
- [ADR-29](../29-browser-playground/) — ブラウザプレイグラウンド;WD10（`require_magic_comment: false`）を行使する最初のホストコンテキスト。
- [ADR-93](../93-default-rbs-inline-ingestion/) — このプラグインをデフォルトで配線するもの。WD11の選択を、オプトインの一群ではなくユーザーベース全体の方言にしている。
- [ADR-94](../94-rbs-inline-reader-and-the-rbs-3x-floor/) — 隣接する移行の問い。rbsのフロアを理由に見送られた。WD11は同じ移行を別の理由で見送る: ここではフロアは拘束しない。
- [`docs/notes/20260730-inline-rbs-parser-grammar-diff.md`](../../notes/20260730-inline-rbs-parser-grammar-diff/) — WD11とWD12が依拠する実測された文法差分。
