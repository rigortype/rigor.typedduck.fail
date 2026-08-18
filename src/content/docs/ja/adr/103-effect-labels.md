---
title: "ADR-103 — エフェクトラベル: オプトインの、スナップショット優先のエフェクトシステム"
description: "rigortype/rigor docs/adr/103-effect-labels.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/103-effect-labels.md"
sourcePath: "docs/adr/103-effect-labels.md"
sourceSha: "adf151291c1035a3af5b85ea57a72148df314faa8139a88d962a78af19a5f81e"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 4103
---

ステータス: **Proposed、2026-08-16**。[`docs/design/20260816-effect-labels.md`](../../design/20260816-effect-labels/)（設計ノート;その§13が選択肢を列挙し、このADRがそれらを作業上の決定として固定する。`rigor check`との共存であるWD13は同日に追加;実装前の決定であるWD14と、v0.4.0の既定オン化の裁定とその前提条件であるWD15はどちらも2026-08-17に追加——WD15自身の前提条件は未達なので、既定について今のところ何も変わらない）でエフェクトシステムを設計する際に到達した決定を記録する。2件が未決のまま残っており、どちらもビューのスライスまで先送りできる。実装はアンブレラ[#376](https://github.com/rigortype/rigor/issues/376)配下のGitHub issueとしてスライスされている（18本のトレーサーバレットスライス、#377〜#394;トラッカーの慣習: [ADR-98](../98-development-flow-document-roles/)）。

根拠: Steinsの実装済みモデル（[why-effects](https://github.com/rigortype/steins/blob/master/docs/why-effects.md)・[effects.md](https://github.com/rigortype/steins/blob/master/docs/type-specification/effects.md)・[phpdoc-effects-interop.md](https://github.com/rigortype/steins/blob/master/docs/type-specification/phpdoc-effects-interop.md)）、PHPStanのRFCドラフト（[20260812-issue-draft-effect-labels-spec.md](https://github.com/zonuexe/phpstan-notes/blob/master/generated-report/20260812-issue-draft-effect-labels-spec.md)）、そして2026-08-16に集めたリポジトリのファクト（設計ノート§14）——主なものは、Rigorがメソッドレベルの呼び出しグラフを持たないこと、`rigor:v1:pure`が仕様化されているが未実装であること、そして2026-07-15のPHPStanルール再調査が推論による純粋性ルールを高FPとして却下したこと（[`docs/notes/20260715-phpstan-rules-survey-rigor-reevaluation.md`](../../notes/20260715-phpstan-rules-survey-rigor-reevaluation/)）。

## コンテキスト

型はメソッドが何を返すかを述べる;そのメソッドがデータベースを読むか、時計を参照するか、HTTPリクエストを送るか、ジョブをエンキューするかは述べない。SteinsはPHPについてこの第2の次元を階層的な**エフェクトラベル**（`io.db`・`io.net.http`・`nondet.time`）として推論し、呼び出しグラフ上で伝播させ、作者が宣言した上界（「エフェクトエンベロープ」）に対してチェックする;同じモデルがPHPStanの`@phpstan-impure`のオプトインパラメータとして起草されている。rigortype組織は両方のアナライザーを運用しているので、共有された語彙と共有された診断識別子はそれ自体が目標だ。

Rubyは2つの動機を加える。エンジンはすでにこの情報を欲している——`StatementEvaluator`は「エフェクトシステムなしには純粋性を証明できない」という理由で自己呼び出しをまたいでナローイングされたすべてのivarをリセットするし、[control-flow-analysis.md](../../type-specification/control-flow-analysis/)の純粋性ポリシーは、どのコードも読まない`rigor:v1:pure`を伴う既定不純であり、定数畳み込みティアは手選りの許可リストでゲートされている。そしてRubyの文化はエフェクトを、Rigorには見えない規約に置いている——`sort`/`sort!`、「プレゼンターはクエリしない」、「モデルの中で`Time.now`を使わない」——目視で強制されている。

このADRが仕える意図: **既存のRubyコードのエフェクトフットプリントを観測可能でレビュー可能にする。オプトインで、アプリケーションコードに何かを書くことを要求せず、偽陽性の予算を一切使わずに**（[ADR-5](../5-robustness-principle/)、AGENTS.md「偽陽性は最悪ケースの静的な読みに優る」）。コーパスの以前の判定——推論による純粋性はRubyでは知りえない（メモ化するivar書き込み、モンキーパッチ、C実装）——は、以下のあらゆる決定が矛盾するのではなく答える制約である。

## 決定

Steinsのモデルを変更なしに採用し、Ruby固有のコミットメントを3つ加える。弁別基準を一度だけ述べる:

> **判定はアナライザーが証明したものだけを読んでよい;証明できなかったものは記録され、決して判定されない;そして検証は既定で、境界を宣言することではなく記録を観測することとする**。

第1節はSteinsの証明レーン規則であり、このリポジトリの「証明されたとおりに厳格に」（[robustness-principle.md](../../type-specification/robustness-principle/)）だ。第2節は、未解決の呼び出しが網羅性を汚染しつつ発見を生まない理由であり、エフェクトフットプリントがレポートである理由だ（[ADR-102](../102-unused-code-reachability-report/)の境界線: アナライザーが持ちえない知識に上限づけられる精度はレポートに属する）。第3節がRuby固有の転回だ: 主たる検証は、その差分がレビューされ、そのドリフトをCIがゲートする、コミットされた**エフェクトスナップショット**——エフェクトにとっての`db/schema.rb`——であり、エンベロープはオプションの第2ステップである。

### WD1 — モデルはそのまま移植する

セグメントを考慮した接頭辞の包摂でチェックされるドットパスのラベル;エンベロープは、メソッドの*コード*（ブロックリテラルを含み、デッドコードを含む）に対して構造的にチェックされる宣言された上界;サマリーは*証明*レーン、*宣言*（`≤`）レーン、そして未解決または動的な呼び出しがあれば汚染される網羅性ビットを運ぶ;診断は証明レーンだけを読む;未知のラベルはタグ全体を⊤（フェイルオープン）にし、別途オプトインの語彙診断を伴う;クラスレベルのエンベロープは最近接優先で分配される;ポリシーによる解消（`tolerated:`）はSteins ADR-0084の4つの不変条件に従う。診断識別子はSteinsのもの——`effect.envelope-exceeded`・`effect.liskov-widened`・`effect.unknown-label`。（設計ノート§4。）

### WD2 — 語彙: 共有レジストリ、Rubyの葉、その上に3層

レジストリはSteinsのv1の25ラベル一式をそのまま、加えてRubyの`mutate.self` / `mutate.arg` / `mutate.static`。`io.output.buffer` / `io.output.header`は登録されたままだが生成されない。その上に: Steinsとともに提起する共有コアの葉（`io.db.read` / `io.db.write` / `io.db.transaction`）、小さな共有アプリケーション意味集合（`telemetry`・`email.send`・`job.enqueue`・`cache.read` / `cache.write`）、そしてフレームワークをモデル化するプラグインが所有するフレームワークルート（rigor-railsなら`rails.*`;サードパーティのプラグインは自身のプラグインidと等しいルートを開く;プロジェクトの設定は任意のルートを開いてよい）。（§11.1。）

### WD3 — 起点はカタログの行と少数の構文である;畳み込みカタログは起点ではない

エフェクトは手で監査されたエフェクトカタログ（`data/effects/core.yml`）と、Rubyが持つ少数の構文（バッククォート、`$gvar`の読み書き、`@@cvar`、`@ivar`書き込み、`alias`/`undef`、リテラル名の`define_method`）から生じる。カタログにないメソッドはクラスごとの既定姿勢に従う——値クラスは∅、世界に向いたクラスは`io`——ので、網羅ビットは意味を保つ。生成された`data/builtins/ruby_core/*.yml`の`purity:`ファセットはエフェクトソース**ではない**: それはCディスパッチの意味での畳み込み安全性に答える（`Random#rand`は`leaf`、`Array#push`は`leaf`）;その`c_effects: mutate` / `block`マーカー、クラスごとの`mutating_selectors:`ブロックリスト、`NON_REPRODUCIBLE_SELECTORS`、`MutationWidening`のミューテータ集合、`ClosureEscapeAnalyzer`のテーブルは新しいカタログのシードと証拠であり、引用されるがラベルとして読まれることは決してない。（§5.1。）

### WD4 — Rubyのデルタ: 所有権、閉世界、封じ込め、時計ではなくコード

`mutate.local`は、フレームが**所有する**（新規で、逃げていない）レシーバーへの変更呼び出しを名指し、あらゆるエンベロープが許容する;`mutate.self` / `mutate.arg` / `mutate.static` / 素の`mutate`はレシーバーの所有権に従う;`pure`の下での`@x ||= …`は発見である。自己呼び出しはプロジェクトを**閉世界**として解決する——サマリーはプロジェクトが知るすべてのオーバーライドを結合する——そして再オープンは和を取る;非リテラルの`send`、`method_missing`、`Dynamic`レシーバー、ダックタイピングは汚染する。ブロックリテラルは、今呼ばれようが、後で呼ばれようが、決して呼ばれまいが、**常に**囲むメソッドのサマリーに結合される（封じ込め）;不透明な呼び出し可能オブジェクトは汚染する;したがってエフェクト多相はエフェクト変数を必要としない。遅延実行は時計ではなくコードに従う: ビルダーは純粋、エンキューがエフェクト、遅延された本体へのエッジはなく、プロセス内の遅延は封じ込めであり、プロジェクトが宣言したキューアダプタはエンキューのトランスポートを絞ってよい。例外はラベルではない;クラス本体はv1ではスコープ外。（§5、§11.2「遅延実行」。）

### WD5 — 宣言サーフェス: 新しい文法はなし

優先順に: （1）何もない——推論が既定;（2）`.rigor.yml`での**規約**によるエンベロープ（`effects.envelopes`、パスまたは名前空間でスコープ、[ADR-28](../28-path-scoped-protocol-contracts/)の形）;（3）`%a{pure}`——エコシステムの既存の純粋性アノテーション。空のエンベロープとして読まれ、`sig-gen`が書き戻す;（4）RBSのメソッドおよびクラス宣言上の`%a{rigor:v1:effect …}` / `%a{rigor:v1:pure}`。`Rigor::FlowContribution`の新しい`effects`スロットによってエンジンへ運ばれる（これがついにバンドルのプロデューサーなしの`mutations`スロットにプロデューサーを与える）;（5）rbs-inlineの`# @rbs %a{…}`を通じた`.rb`内の同じアノテーション——許可される。そうでないと述べるハンドブックの文を修正する;（6）プラグインのRBSアノテーション、プラグインの`effect_attributions:`、gem向けのプロジェクトの`effects.attribution:`テーブル、加えて語彙のための`effects.labels:`。サーフェスでないもの: ランタイムDSL、新しい`# rigor:`ディレクティブ、ファイルプラグマ、Sorbetの`sig`、bang規約。（§6。）

### WD6 — 信頼: 解消は既存の権威の階梯に従う

カタログとプロジェクトの本体は証明済み。プロジェクトが著したエンベロープはチェック済み層——契約チェック、Liskovチェックされ、それが束縛する呼び出しサイトの汚染を解消する。受け入れられたシグネチャ（gemのRBS、Rigorのバンドル済みオーバーレイ）とプラグインの`signature_paths:` RBSは、その型がすでに信頼されているのと同様に解消する;ファーストパーティのバンドル済みプラグインのフレームワーク由来の帰属とエッジは解消する（`make check-plugins`でゲートされ、アプリ自身の宣言から導出される）;サードパーティのマニフェストとYAMLの帰属は決して解消しない——「これを宣言した、そしておそらくそれ以上」。宣言レーンのキャリアは、構造的インターフェースのキャリアが存在するまで名前的（ADR-57のN5ゲートにおける基底メソッドのエンベロープ）である。（§7。）

### WD7 — エフェクトスナップショットが主たる検証

`rigor effects --update`は`.rigor-effects.yml`を書く;`--check`は再計算し、説明付きの差分を出力し、ドリフトがあれば非ゼロで終了する;`--diff`はゲートせずに出力する;`--explain`はリーチの変化の背後にある最短のエッジ経路を出力する。このファイルは`methods:`を**直接**サマリーとして保持し（差分がPR自身の行に帰属できるように;網羅的∅のエントリーは省略）、`reach:`をエントリーポイントでの推移的フットプリントとして保持する;ヘッダーはRigorと語彙のバージョン、および`effects:`設定のダイジェストを運ぶ。ゲートは既定で対称（削除もニュースである）で、`gate: additions`がラチェットの選択肢;記録は未解消であり、`tolerated:`は判定時に適用される。これは診断を出さず、`rigor check`のストリームに決して入らない。安定した観測はエンベロープへ昇格させてよい（`--promote`）。これはいかなるエンベロープ構文よりも先に、最初のスライスで出荷される。（§9.4。）

### WD8 — 診断: ファミリーの形が先、オプトイン、キャッシュ認識

いかなるidを出荷する前にも、診断ポリシーの分類体系に`effect.*`を予約し（[ADR-100](../100-static-diagnostic-family-and-void-origins/)の規律）、`RULE_FAMILIES`に`effect`を追加する。`effect.envelope-exceeded`は同時に2つの受け入れられた構成によってFPセーフだ——作者のディレクティブによるオプトインと、証明されたとおりの厳格さ——ので、*新しい*綴りに対してはbleeding-edgeゲートを必要としない;`%a{pure}`の相互運用の読みは意味的な移行であり、エフェクトのオプトインでゲートされる。`effect.discarded-pure-result`（非bangの足元の銃。カタログの`raises`ファセットで追加ゲート）はコーパスゲート待ちですべてのプロファイルで`:off`として出荷される。サマリー収集は`dynamic_origins`の性質を持つサイドテーブル;診断はプール後の集約;`effects:`設定はADR-45の実行キャッシュ同一性に加わる;WD9の型付け消費者はキャッシュ同一性を認識するフィーチャーとして着地する。（§9。）

### WD9 — エンジンの消費者、この順序で、それぞれ自身のゲートの背後に

証明済みサマリーが`mutate.self`を欠く自己呼び出しをまたいだB2.2のivarリセットのスキップ;純粋性ポリシーの計算された純粋性（`{mutate.local}`の外に何もない → 結果を記憶してよい;介在する`global.write` / `mutate.static`までは`global.read`のみ;`nondet.*`は決して不可）;ラベルキーの無効化バケット;計算された性質としての定数畳み込みゲート;網羅的で未解消のサマリーのみからの`sig-gen`による`%a{pure}` / エンベロープの出力。（§8。）

### WD10 — Rails: トランスポートがアダプタ依存であるところにフレームワークラベル、プラグインからエッジ、ビルダーは純粋

rigor-railsは§11.2の表に従ってトランスポートと`rails.*`の意味に色を付ける;Relationの**ビルダー**は∅、**実体化子**は`io.db.read`;`Rails.env`とその仲間は`global.read`（ポリシーで許容）;プラグインは構文が欠く**エッジ**（コールバック、バリデータ、`perform_now`、メーラー本体）を寄与し、寄与してはならないものは寄与しない（`perform_later` → `perform`）;ActiveSupportのcore_extは一括で`%a{pure}`を受け取る;サマリーは**起点ごとのラベルバンドル**を保つので、意味ラベルを許容することはそれに付随して来たトランスポートだけを解消する。`views: lenient | strict`プリセットと例示的なレイヤー規約スタンザはドキュメントとして出荷され、既定で強制されることは決してない。

### WD11 — ビューはエフェクト単位である

テンプレートはメソッドにコンパイルされる;Rigorはそれをそのように解析する: [ADR-16](../16-macro-expansion/)のTier-Dシーム（[ADR-60](../60-pre-freeze-plugin-contract-consolidation/) WD1で需要ゲート付きとして除去）が、パースに先立つソース変換と行マップを伴って復帰する;ERBは解決できればErubiで、そうでなければ標準ライブラリの`ERB`でコンパイルされ、決してバンドルされない（[ADR-93](../93-default-rbs-inline-ingestion/)の姿勢）;`self`はコントローラーごとのビュークラス、ローカルはrender箇所とstrict-localsコメントから、ivarシードはレンダリングするアクションの確定代入から来る;`render`は本物のエッジになる;すべての単位はスナップショットに`view:…`として現れる;N+1の形は、プリロードのファセットがそれを診断にするまでは`query-in-loop`レポートである。Jbuilder、ViewComponentのサイドカー、Haml、Slimは同じシームに乗る。HTML / エスケープ / XSSはスコープ外。（§11.3。）

### WD12 — どこに住むか

サマリーとエッジはファイルごとの型付けの間に収集され、`return_summaries`の隣に永続化される;伝播はプール後の集約スロットでの、有限束の上のグラフのみのワークリスト;エンベロープ診断はキャッシュ済みサマリーから毎回再計算され、決してファイルごとに保存されない。ラベル言語は新しい`docs/type-specification/effect-labels.md`で規範的;収集と伝播はinternal-specの節で;「エフェクトラベル」「エフェクトサマリー」「エフェクトエンベロープ」は`CONTEXT.md`に罠のある複合語として登録され、「フローエフェクト」は既存のバンドルを名指し続ける。（§3、§10。）

### WD13 — `rigor check`との共存: オフは無償、オンは観測的、キャッシュは1つ

スイッチは`.rigor.yml`の`effects:`（または`rigor effects`を実行すること）;アノテーションだけでは決して収集をオンにせず、代わりに`:info`の残余を得る。オフのとき、コレクターはディスパッチのホットパスで整数読み取り1回のコストしかかからず——`DependencyRecorder`の有効化カウントの形——起点スキャンは同じフラグの背後で`ScopeIndexer`の既存の`def`走査に乗る;ゲートはバイト同一の`rigor check`と、コーパスでのノイズ範囲内の実時間だ。オンのとき、収集は**タイパーがすでに決定したことを記録し、それ以上を決定するよう決して求めない**（オンデマンドの走査なし、追加の解決なし、`Scope`の変更なし）;クロージャはプール後の不動点;作業予算はmastodonで実時間 / RSSの≦約5%、gitlab規模で不動点≦1秒。コーパスのパフォーマンスノートが計測するように計測する。キャッシュは1つで同一性は2つ: 診断の同一性は今日のものであり、エフェクトがどう設定されていても有効だ。収集は観測的だからである;エフェクトの同一性は語彙とカタログのバージョンおよび`effects:`ダイジェストを加え、そのサマリーは`return_summaries`の隣と実行全体のエントリー内のサイドカースロットで、オンのとき書かれ、オフのとき無視され、不在のときエフェクト消費者に対してのみミスとなる。型付け消費者（WD9）は`BleedingEdge`風のフィーチャーとして同一性をフォークし、決して収集の副作用としてはしない。コレクターはフェイルソフト: 例外はそのファイルのサマリーを非網羅的として落とし、決してチェックを失敗させない。エディタモードはv1ではエフェクトを走らせない。（§10.1。）

### WD14 — 実装前の決定（グリルセッション、2026-08-17）

最初のスライスの前に確定した。最初のスライスがそれを焼き込むからだ;それぞれ設計ノートがオーナーに委ねていた決定であり、今クローズする。

- **語彙**。`mutate`の葉はSteins ADR-0055のもの: `mutate.self`（selfの状態）、`mutate.instance`（selfでもフレーム所有でもないレシーバー——引数、別のオブジェクト、呼び出し結果）、`mutate.static`;`mutate.arg`は落とす;素の`mutate`は分類不能なレシーバーに対してのみ。**未知の所有権は汚染する**（原因`unknown-ownership`）のであって、証明された`mutate`を生むのではない——Rubyの所有権はデータフローの問いであり、新規だが未証明のレシーバーに対する証明された親は正しいコードに発見を置いてしまう。語彙のバージョンはリネーム / 削除のときのみ（引退した綴りの表を伴って）バンプし、葉の追加では決してしない。
- **純粋性の綴り**。`%a{pure}`が唯一の純粋性アノテーション;`rigor:v1:pure`は実装せず、純粋性ポリシーの本文は`%a{pure}`を名指すよう修正する。`effects.check`がオンのときは常にチェックされる——`effects:`ブロックがオプトインなので、別個の相互運用ゲートはない。
- **文法**。`%a{rigor:v1:effect io.db, nondet.time}`——スペース区切りのヘッド（`assert` / `conforms-to`ファミリー）、カンマ区切りの素のトークン、パーレンで囲んだコメントなし（RBSには本物のコメントがある;コーパスの規則は素のトークン）。空のリストは不正。クラスレベルのアノテーションはRubyのクラス発見が知るすべてのメソッド（再オープン、他のファイル、合成された`attr_*` / `define_method`を含む）へ分配され、サブクラスへは決してされない;モジュール上ではそのモジュール自身のメソッドのみへ;メソッドごとが勝つ。
- **同一性**。キーは既存のシンボルテーブルに従う: `Class#m` / `Class.m`、トップレベルdefは`<toplevel>#m`（`ScopeIndexer::TOP_LEVEL_DEF_KEY`）、再オープンは和、`define_method(:lit)`は`Class#lit`の下（そのブロックが本体になる——発見の拡張。defノードテーブルは今日それをスキップするので）、`attr_*` / `Struct` / `Data`のアクセサは合成（リーダー∅、ライター`mutate.self`）。
- **起点** = `(callee-or-construct, colouring-source)`、行なし;サイトはレポートのためだけに実行ごとに保持される。ポリシーの解消は起点ごと: バンドルは、そのラベルの**いずれか**が許容されたときに解消される（起点が*何のため*だったかを許容することがそのトランスポートを解放する）。汚染原因は型仕様の閉じたenum: `dynamic-receiver`（`DynamicOrigin`の名前で副原因づけ）・`dynamic-send`・`method-missing`・`unresolved-self-call`・`opaque-callable`・`unknown-ownership`・`plugin-attribution`・`template-not-analysed`・`collector-error`・`budget`。
- **スナップショットとCLI**。`.rigor-effects.yml`、JSON互換部分集合のYAML;`methods:`は平坦に射影されたラベルリストを示す（起点は`explain`の仕事）;合成された既定サマリーと網羅的∅のメソッドは省略（`--full`ですべて列挙）。動詞は`rigor baseline`をミラーする: `rigor effects [PATH]`（レポート）、`rigor effects update`（常に書く）、`check`（テキスト / `--format json`、`--baseline PATH`;終了`0`は最新、`1`はドリフト、`64`は使用法——文書化された慣習）、`diff`、`explain`（リーチ変化ごとの最短エッジ経路）。`reach:`は既定で空;プリセットはプラグインが名前を付け（`effect_entry_points:`）、設定が採用する;`unused --entry-point`のglob構文を共有する。
- **設定**。`effects:`が存在 ⇒ 収集オン;`check: true`が既定;`views: false`;キーは`snapshot.{path,reach,gate}`・`labels`・`attribution`・`envelopes[]{match|namespace, effect}`・`tolerated`。ラベルの*形*はロード時に検証される（tier 2);プラグインロード後にレジストリに未知のラベルはそのエンベロープを⊤にし、`.rigor.yml`に位置づけられた`effect.unknown-label`として表面化する（`rbs.coverage.quarantined-signature`の先例）——設定監査はネストした値へは拡張されない。`effects:`ブロックのない`rigor effects`は暗黙の`effects: {}`の下でアドホックに走り、`rigor check`とキャッシュを共有しない。
- **診断**。`effect.envelope-exceeded`はRubyの`def`に位置づけられ（修正が入る場所であり、`# rigor:disable`が効く場所——`.rbs`に位置づけられた`unsatisfied-conformance`の先例は意図的に踏襲しない）、メッセージ内でエンベロープのソースを名指す。重大度: `envelope-exceeded` / `liskov-widened`はlenient / balanced / strictでwarning / warning / error;`unknown-label`はinfo / info / warning;`discarded-pure-result`はどこでもoff。
- **Rubyのデルタ**。`require` / `require_relative` / `load` / `autoload` = `io.fs.read` + `mutate.static`;`sleep`・`Queue#pop`・`ConditionVariable#wait` = `io`;`Thread.new`・`Fiber.new`・`Ractor.new`・`Mutex#synchronize` = ∅ + 封じ込め。
- **仕様の状態**。`docs/type-specification/effect-labels.md`は#377から規範的で、各節を実装するスライスを名指す節ごとの「執筆時点では」マーカーを伴う（ADR-92）。

### WD15 — v0.4.0での既定オン化（オーナー裁定、2026-08-17）

収集と`effects.check`は**v0.4.0で既定オン**になる: `effects:`キーのない`.rigor.yml`は`effects: {}`として振る舞い、`effects: false`がオプトアウトになる。`effects-on-by-default`——`:behaviour`の[bleeding-edgeフィーチャー](../50-release-engineering-and-stability-strategy/)——がプレビューだ: 今日それを採用すれば同じ既定に早期に到達する。WD7の「メジャーで卒業」は、このフィーチャーと0.xの評価ラインに限って、v1.0.0を待つのではなく**「v0.4.0で」**と読む——WD7がすでに一般のケースについて述べているのと同じ1.0前のリハーサル（`v0.2.x → v0.3.0`の卒業）であり、「次のマイナーがいつ着地しようとも」に委ねるのではなくオーナーの裁定で特定のバージョンに固定したものだ。

この反転は、まず6つの前提条件をクリアすることでゲートされ、執筆時点でそのどれもクローズしていない:

1. **プールされたバックエンドがエフェクトのサイドテーブルを運ぶ**。収集する実行は今日forkプールに固定されている;`fork`なし（Windows）では実行は逐次に劣化する。RactorとスレッドのバックエンドはMUST既定オンの前にワーカー境界をまたいでエフェクトのサイドテーブルを運ばなければならず、さもなければWindowsは既定オンの下で反転した日に黙って収集を失う。
2. **語彙と`effect.*`診断idが安定する**。 #378（Steinsの語彙との整合）が先に確定する——出荷してから自身のidをリネームする既定は、待つより悪い移行だ。
3. **WD13のコスト予算がリリース時にコーパスで再検証される**——≦5%の実時間/RSSと≦1秒の不動点の数字は、オプトインしたプロジェクトだけがコストを払っていた既定オン前に計測されたもの;普遍性は予算が成り立たねばならない母集団を変える。
4. **`effects.lsp`の意味論がエディタモード向けに定義される**——WD13は意図的にv1でエフェクトをエディタモードから外しており、既定オンの反転がその席を黙って永遠に空けたままにすべきではない。
5. **リリースノートの移行注記**が、すでに`%a{pure}`を運んでいるか`effect.annotations-unchecked`（WD14の相互運用ゲート）に依拠しているプロジェクト向けに存在する——どちらも、その下で収集がオンになった瞬間に、既定で不活性から荷重を支えるものへ変わる。
6. **スナップショットの汚染のみの行が決まる**。redmineでの未決の観測: スナップショットの3,581の`methods:`行のうち2,052が証明済みラベルを持たず`unresolved:`だけを運ぶ——`rigor init`がすべてのプロジェクトに`effects update`を推奨する前に、その比率が許容できるか（そして、もしあるならプロジェクトに何を伝えるべきか）に答えが要る。

## 却下・先送りされた代替案

| 代替案 | 却下理由 |
| --- | --- |
| ランタイムDSL（`Rigor.pure def …`）または新しい`# rigor:effect`コメントディレクティブ | [ADR-0](../0-concept/): アプリケーションコードはRigor固有のアノテーションやDSLをMUST NOT要求してはならない;rbs-inlineの`%a{}`はすでにエンジンに届いており上流の文法だ |
| 生成された`purity:`ファセットからエフェクトラベルを読む | それは別の問い（畳み込み安全性）に答える;`Random#rand`と`Array#push`は`leaf`だ |
| 何も`final`でないのであらゆる自己呼び出しを汚染する | Rigorが型に対して取るのと同じ閉世界の姿勢が利用可能で、はるかに有用だ;未知のレシーバーは依然として汚染する |
| エンベロープが先、スナップショットはレポートとして（Steinsの形） | オーナーの運用要件は「コードに何も書かない」;コミットされた観測は初日から価値を与え、WD12の機構しか必要としない |
| スナップショット内のすべてのメソッドに推移的サマリー | 葉の変更が帰属不能な差分にファンアウトする;直接サマリーはPRに帰属可能なままで、`reach:`が重要な場所で影響範囲を示す |
| 既定で追加のみのゲート | 削除はニュースである（エンキューをやめたジョブ);ラチェットは選択肢として残る |
| Steins厳格: プラグインは決して解消しない | そうするとあらゆるRailsメソッドが永遠に非網羅的になり、ビットが情報を運ばなくなる |
| Relationビルダーを`io.db.read`に色付け（「開発者の考え方」） | カタログは決して嘘をつかない;実体化する呼び出し元が読み取りを受け取る;「クエリはビューで起きる」の最終的な答えは値のprovenanceだ |
| 静かな既定サーフェスで`%a{pure}`の相互運用をチェック | 既存のタグが失敗し始める——RFCの意味的移行の主張;ゲートする |
| 例外・並行性プリミティブ・`nondet.time.system`のエフェクトラベル | スコープ外（throws）、消費者がまだない、RuboCop-Railsがすでに所有するlint |
| 構造的インターフェースの宣言レーン、`$stdout`キャプチャのマスキング、補集合の境界 | キャリア / 消費者が存在するまで先送り |

## Proposedの時点で未決のもの

元のリストの項目1と2（`mutate`の葉の名前;`require`と並行性プリミティブ）は2026-08-17にWD14でクローズした。2件が残り、どちらもビューのスライスまで先送りできる:

1. ビューのプリセットの既定が`lenient`か`strict`か、そしてテンプレート内の`nondet.time`が既定で許容されるか（暫定: `lenient`、`nondet.time`を含む——`time_ago_in_words`はビューの日常語彙;`strict`はそれを除外する）。
2. ビューが既定で`reach:`に入るか（暫定: `methods:`は常に、`reach:`はオプトイン）。

## 帰結

良い点: Railsアプリケーションのエフェクトフットプリントが、アノテーションゼロで観測可能でレビュー可能になる;チームが「以前どおり」ではなく「決して」を望む場所ではエンベロープが利用できる;エンジンはずっと求めていた計算された純粋性の性質を得る;語彙と診断idはSteinsのものと同じに読める。

悪い点: 型付けの薄いコードでは証明レーンは小さく、最初はほとんどのサマリーが非網羅的だ——正直な状態であり、レポートはそう述べる;スナップショットはRigorのアップグレードと語彙の変更で揺れる（可視で、ヘッダーに日付付き);新しいカタログは新しい手で監査するアーティファクトであり保守が要る;ビューは、消費者がないために一度除去されたコアのシーム（Tier D）を必要とする。

持ち越し: `FlowContribution`の`mutations` / `invalidations`スロットが最初のプロデューサーを得る;`ClosureEscapeAnalyzer`の予約された「RBS-Extendedの呼び出しタイミングエフェクト」の席が到達可能になる;調査コーパスは縦断的な計測器（Rigorのバージョンをまたぐスナップショット）を得る。

## 再評価のトリガー

- 最初のスライスのコーパス計測で、証明レーンがmastodon / redmine / gitlabで`reach:`を有益にするには小さすぎると分かる（作業閾値: 何らかの証明済みラベルを持つコントローラーアクションが半数未満）→ WD3の既定姿勢とWD6の解消ポリシーを再検討する。
- エフェクトと無関係なコーパスPRでのスナップショットの揺れが、レビュアーが流し読みできる範囲を超える → `reach:`プリセットを広げる前にWD7のレイアウト（`methods:`の直接vs推移的）を再検討する。
- Steinsが共有ラベルを引退またはリネームする → 引退した綴りの表と語彙のバージョンバンプ;アプリケーション意味ルートでの乖離 → 我々のものを出荷する前に上流へ提起する。
- 構造的インターフェースのキャリアが着地する → インターフェースを通じた宣言レーン（WD6）を独自のスライスで設計する。

## 他のADRとの関係

[ADR-0](../0-concept/) / [ADR-5](../5-robustness-principle/)が境界を定める（必須のアノテーションなし;証明されたとおりに厳格に）。[ADR-1](../1-types/)と[control-flow-analysis.md](../../type-specification/control-flow-analysis/)が、これが実装する純粋性ポリシーを所有する。[ADR-2](../2-extension-api/)が`FlowContribution`のスロット追加を統治する。[ADR-16](../16-macro-expansion/) / [ADR-60](../60-pre-freeze-plugin-contract-consolidation/)がWD11が復活させるTier-Dシームを所有する。[ADR-28](../28-path-scoped-protocol-contracts/)は規約エンベロープの形。[ADR-45](../45-unchanged-project-fast-path/) / [ADR-46](../46-incremental-dependency-graph/) / [ADR-84](../84-cross-file-return-memo-scoping/)が永続化されたサマリーを運ぶ。[ADR-50](../50-release-engineering-and-stability-strategy/)がオプトインの姿勢を、[ADR-93](../93-default-rbs-inline-ingestion/)が決してバンドルしないコンパイラの姿勢を、[ADR-100](../100-static-diagnostic-family-and-void-origins/)がファミリーの形の規律を、[ADR-102](../102-unused-code-reachability-report/)がレポート対診断の境界線を統治する。設計ノートは研究のままであり、このADRが決定である。
