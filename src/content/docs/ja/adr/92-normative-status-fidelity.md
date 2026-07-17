---
title: "ADR-92 — 規範的ステータスの忠実性: 創成期の地層と、宣言かマークかのゲート"
description: "rigortype/rigor docs/adr/92-normative-status-fidelity.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/92-normative-status-fidelity.md"
sourcePath: "docs/adr/92-normative-status-fidelity.md"
sourceSha: "a858fc5895e91a3f0cfbf5ae64a453ea77796c8011084db23a0439556575af7a"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 4092
---

Status: <strong>Accepted — 2026-07-16実装済み（WD1–WD5）。WD2の`void`判定はオプション（b）に決着し、投入済み。</strong>WD2の判定＋WD3のマーカーは`special-types.md`（§ `void`、§ `top`）、`diagnostic-policy.md`（4つのファミリー行＋ガイドライン前文）、`internal-type-api.md`（メソッドサーフェスを出荷済みのものへ狭めるドキュメントレベルのステータスブロック）に投入された。WD4のゲートは[`spec/docs/manual_drift_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/docs/manual_drift_spec.rb)の軸5であり、双方向で要となる（未実装のファミリーからマーカーを外すとレッドになり、後に出荷されたファミリーにマーカーを残してもレッドになる── マーカーは期限切れとなる）。`make docs-check`はグリーン、246例。`void`の「実装するか狭めるか」の決定は意図的にキャリーオーバーされている（WD2、測定によりゲート）── **現在は決着: オプション（b）が投入された**（`Bases::Void => :translate_top`）。これにより、`special-types.md` § `void`の「distinctな`void`」という意図だけがキャリーオーバーとして残る。散文の節（prose-clause）の本体は、設計上ゲートされないままである（WD1）。

記録に値する進行中の修正が1つある: ゲートの初回実行は`sig.*`で失敗した。specはそれを正直にマークして*いた*のだが、WD3の`Reserved`とは異なる言葉で書かれていた。これは草稿が見落としていた第三のステータスを浮かび上がらせた── **実装済みだが、別のサーフェスを通じてユーザーに届く**（診断ストリームではなく`rigor sig-gen`のJSON）── これは*主張されているが未実装*とは区別される。そのためマーカーの語彙は、コーパスに既存のイディオム、すなわち**「as of this writing（本稿執筆時点で）」**という語句（`inference-budgets.md`の未配線の`budgets:`テーブルがすでに使っていた）に鍵を置き、両方のステータスを認める。

根拠: [`docs/notes/20260716-dspec-formal-spec-substrate-evaluation.md`](../../notes/20260716-dspec-formal-spec-substrate-evaluation/) § P1 / § (b) / § 段0 ── 3つの発見と、それらを生み出したプローブ。

## Context

`CLAUDE.md`はspecが拘束すると述べている: ADRとspecが解析器の振る舞いについて食い違う場合、`docs/type-specification/`と`docs/internal-spec/`が勝つ。この約束には、`lib/`を読むことにフォールバックできない読者が存在する── **rigor-rs**、姉妹のRust移植（[ADR-79](../79-rbs-version-range-over-pinned-determinism/)がその意図的な乖離を記録し、[ADR-91](../91-kernel-intrinsic-fold-ownership-gate/)がそのフィードバックを処理する）である。この移植にとって、規範的な節が*そのまま*要件なのである。

2026-07-16の調査は、コーパスが現在形で、一度も出荷されたことのない振る舞いを述べている独立した3箇所を発見した:

| # | 節 | 実装 |
| --- | --- | --- |
| 1 | [`special-types.md`](../../type-specification/special-types/) § `void` ──「Rigorは値の使用を診断できるよう`void`を内部的に別物として保つ」。値コンテキストでは「use of void value」診断が生成されなければならない（**MUST**）。インポートされたジェネリックのスロットは保存されなければならない（**MUST**）| [`rbs_type_translator.rb:51`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/rbs_type_translator.rb) ── `RBS::Types::Bases::Void => :translate_untyped`。`Type::Void`キャリアなし、ルールidなし、specゼロ |
| 2 | [`diagnostic-policy.md`](../../type-specification/diagnostic-policy/) § Identifier taxonomy ── 宣言されたファミリー12個 | `static.*` / `compat.*` / `hint.*` / `generated.<provider>.*`は実装済みidが**ゼロ** |
| 3 | [`internal-type-api.md`](../../internal-spec/internal-type-api/) ──「すべてのRigor型オブジェクトが満たさなければならない（MUST）公開契約」| `normalize` / `traverse` / `consistent_with` / `equal_value` / `has_method` / `subtype_of`は23個すべてのキャリアに存在しない。`Type::Nominal`は`initialize` / `describe` / `erase_to_rbs` / `inspect`を公開している |

**追記（2026-07-16、同日）: 第四の事例**。rbs-inlineのデフォルトロードに関するユーザーの質問に同じプローブを適用して発見されたもので、上記3件より鋭いクラスである── サイレントな未実装ではなく、**拘束するspecと、受理され出荷済みのADRとの直接的な矛盾**である。[`overview.md`](../../type-specification/overview/) § 「Compatibility hierarchy」（2026-04-28）は、インラインアノテーションが「存在する限り常にパースされ使用される」ことを要求し、Rigorは「それらのパースを開始するのに`# rbs_inline: enabled`を要求してはならない（MUST NOT）」と述べている。[ADR-32](../32-rbs-inline-comment-ingestion/)（2026-05-25、v0.1.10で実装）は、そのWD2がまさにそのマジックコメントを要求し、specが義務づける振る舞いを*却下された代替案*として列挙するオプトインプラグインを出荷した── しかも1か月古いそのspec条項をどこにも引用せずに。CLAUDE.mdに従えばspecが拘束するので、出荷された振る舞いはアクティベーションモデルとマジックコメントゲートの両方において非適合である。WD4ゲートはこのクラスを捕まえられない（それは診断ファミリーのテーブルを読み、WD1は意図的に散文本体をゲートしないままにしている）。これはキャリーオーバーを裏づける: 散文の節については手動プローブが依然として計器である。マーカーは`overview.md`に投入され、設計上の解決は[ADR-93](../93-default-rbs-inline-ingestion/)である。

いずれも、どのADR、ROADMAP、CURRENT_WORK、CHANGELOGのエントリーにも先送りとして記録されておらず、いずれも自身のテキスト中にマーカーを持たない。3件すべてが**創成期**（[ADR-1](../1-types/) / [ADR-2](../2-extension-api/) / [ADR-3](../3-type-representation/)）の宣言である: 設計目標として書かれ、拘束契約として提示され、出荷されたものと決して照合されなかった。ADR-1は#1を予見されたリスクとして名指しさえしている──「`void`と`untyped`は早すぎる段階で大まかなエイリアスとして扱われる可能性が高い」── そしてそれが、観測されないまま実際に起きたのである。

**なぜどのゲートも捕まえなかったか**。 2つの構造的な盲点が合成される。[`spec/docs/manual_drift_spec.rb`](https://github.com/rigortype/rigor/blob/master/spec/docs/manual_drift_spec.rb)のドキュメント軸はすべて**実装→ドキュメント**方向に走る（「`Configuration::DEFAULTS`のすべてのキーはリファレンスで言及されねばならない」「`ALL_RULES`のすべてのIDはカタログに現れねばならない」）。逆方向は検査されない。そして*解析*ゲートはすべて偽陽性志向であり（コーパスのバイト同一性、リグレッションスイープ、`make check`）、一度も実装されなかった診断は**沈黙**である── 構造上、不可視である。[ADR-62](../62-mutation-testing-teeth-measurement/)は、まさにこの種の盲目性に対して一段下の層でハーネスを構築したが、ミューテーションテストは壊すためのコードを必要とする。不在の機能にはそれがない。

## Decision

> **規範的な節が現在形で振る舞いを述べるのは、それが出荷される場合に限る。さもなければ、宣言の地点で明示的なステータスマーカーを担う**。

この基準の力はその系にある: **沈黙が乖離にとって正直な状態であることは決してない**。節ごとに3つの帰結が利用可能である── 実装する、節を出荷済みのものへ狭める、あるいはギャップをマークする── そして*マークは常に利用可能で常に安価である*。したがって、他の2つのコストが、嘘をつく節を残すことを正当化することは決してない。これはステータスの問い（今、常に決着させる）を、設計の問い（証拠に基づいて決着させる）から分離する。

これは[ADR-49](../49-adr-authoring-guidelines/)の軸6（*ステータスと進捗の忠実性*）を、ADRコーパスではなく**spec**コーパスに適用したものである。コーパスはすでにマーカーを2度示している── [`inference-budgets.md:75`](../../type-specification/inference-budgets/)（「**本稿執筆時点で、設定可能な`budgets:`サーフェスはまだ配線されていない**」）と[`diagnostic-policy.md:43`](../../type-specification/diagnostic-policy/)（`sig.*`はJSON出力のみ）である。**規範は確立している。欠けているのは強制だけである**。

## Working decisions

**WD1 — スコープ: 散文本体ではなく、列挙可能な宣言テーブル**。ゲートは、コーパスが*列挙する*サーフェス（診断ファミリーの<ruby>分類体系<rt>taxonomy</rt></ruby>、型オブジェクトのメソッドサーフェス）を拘束する。そこでは「宣言済み対実装済み」が決定可能な集合比較となる。約836個の散文中の`MUST`/`SHOULD`の出現は**拘束しない**。その大半はアトミックにテスト可能な命題ではない（オーサリング規約、表示規則、説明的な用法）。それらにidを付けてカバレッジを強制することは、実体のない`reference`級のリンクを製造する── 偽りの保証であり、これは根拠ノートの却下されたdspec設計が例示するために存在する失敗である。

**WD2 — 事例ごとの判定**。

- **`void` → 今マークする。設計上の決定はキャリーオーバーされ、測定によりゲートされる**。生きている選択肢は2つではなく**3つ**ある。出荷された振る舞いがspecともRBSとも一致しないためである:

  | | `void`は… |
  | --- | --- |
  | RBS（`docs/syntax.md` § 「`void`、`boolish`、それとも`top`?」） | `top` ──「型システムにとってそれらはすべて等価であり、すべて*top型*である」。`void`は開発者向けのヒント |
  | このspec（意図、未出荷） | distinct（別物）。値の使用を診断する。`top`として実体化（materialize）する |
  | エンジン | `untyped` = `Dynamic[top]` |

  `top`と`Dynamic[top]`は異なるキャリア（`Combinator.top`対`Combinator.untyped`）であり、`Dynamic[top]`は両者のうち*より寛容*な方である── <ruby>漸進的境界<rp>（</rp><rt>gradual boundary</rt><rp>）</rp></ruby>ではあらゆるものと一貫するのに対し、`top`は証明を要求する。したがってエンジンは今日**RBS自身のセマンティクスより緩い**。これはインストール済みツールチェーンからのサイレントな乖離であり、[ADR-79](../79-rbs-version-range-over-pinned-determinism/)の忠実性基準が許容しないものだが、その方向が偽陽性安全（FP-safe）であるために生き延びた。選択肢: **（a）実装する**── distinctな`void`の意図を。新たな必須の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>は[ADR-50](../50-release-engineering-and-stability-strategy/) WD1の下でBC（後方互換性を破る変更）となるため、`bleeding_edge:`の背後に置く。**(b) RBSへ狭める**（`Bases::Void => :translate_top`、1行）── ツールチェーンの忠実性を回復し、[ADR-1:30](../1-types/)の「場当たり的なエイリアスではなく型理論的な明快さ」の、最も安価に近い読みである。**（c）エンジンへ狭める**（`void = untyped`を認める）── RBSとADR-1:30の両方を放棄する、最も弱い選択肢である。3つすべてが同じコーパス測定を必要とする（`-> void`の戻り値が値位置でどれだけの頻度で消費されるか── `-> void`は実際のRBSで遍在する）。マーカーはそれを一切必要とせず、今日、誤った記述を止める。
- **`static.*` / `compat.*` / `hint.*` / `generated.*` → 予約済み・未実装としてマークする**。 `static.*`のバジェット側の半分はすでにマーカー（`inference-budgets.md:75`）とそのADR（[ADR-41](../41-inference-budget-design/)、Proposed）を持っている。分類体系の行は、ファミリーを現在形で述べ直すのではなく、それを指し示さねばならない。`compat.*` / `hint.*` / `generated.*`は消費者のいない創成期の予約である── 識別子空間は予約されたままとなる（それこそが分類体系の*目的*である）が、予約は予約として述べられる。
- **`internal-type-api.md` → 出荷済みのルーティングへ狭め、不在のケイパビリティをマークする**。分割は一様ではなく、ドキュメントはどれがどれかを述べねばならない。`accepts`は出荷されており、`Type::AcceptanceRouter`を通じてルーティングされる。`subtype_of` / `has_method`は、エンジンが*持つ*ケイパビリティを名指すが、キャリアメソッドとしてではなく、異なる形の内部ヘルパー（`rbs_subtype?`とその近隣）を通じて到達する。`normalize` / `traverse` / `consistent_with` / `equal_value`── および § *Structural queries*のすべてのメソッド（`members`、`key_type`、`value_type`、`tuple_arity`、`iterable_*`）── は**`lib/`のどこにも実装を持たない**。`consistent_with`と`equal_value`は近い名前すら持たない。ドキュメント自身の § Scopeは、具体的なメソッド名（ADR-3 OQ2）と具体的なクラス集合（OQ1）を拘束することをすでに辞退している── だがその除外規定が容赦するのは*綴り*であって、サーフェス全体の再配置ではない。キャリアメソッドの形が、エンジンが実際に使うルーターに勝るという証拠はない。したがってドキュメントは実装に従う。`normalize` / `traverse`は完全に不在であり（`lib/`のどこにも近い名前がない）、語られるのではなくマークされる。

**WD3 — マーカーの形は2つの先例に従う**。インラインで、宣言の地点に、何が未配線であり、意図がどこに記録されているかを名指す。新しいメタデータスキーマはなく、節ごとの`status:`フロントマターもない（dspec型のレジストリ── 下記で却下）。マーカーは**「as of this writing（本稿執筆時点で）」**という語句を担う太字のステータスであり── `inference-budgets.md:75`がすでに使うイディオムである── 2つのステータスを扱う: *Reserved*（主張されているが、一度も実装されていない）と*Not a diagnostic family*（実装済みで、別のサーフェスを通じてユーザーに届く）である。後者は草稿ではなくWD4ゲートによって発見された。Statusを参照。

**WD4 — ゲート: `manual_drift_spec.rb`がドキュメント→実装方向を得る**。分類体系が宣言するすべてのファミリーは、**実装済みの診断idを1つ以上、またはステータスマーカーを**持たねばならない。実装済みの語彙は`CheckRules::ALL_RULES`だけ（26個のid）*ではない*── 非チェックのファミリー（`dynamic.*` / `pre-eval.*` / `rbs.coverage.*` / `rbs_extended.*`、さらに13個）は`CheckRules`の外で発行され、ファミリーごとに`known_suppression_token?`によって認められる。そのため、ゲートは39個すべてのidサーフェスを読むのでなければ、偽のギャップを報告してしまう。

**WD5 — ゲートする前に裁定する**。 WD2/WD3は同じ変更セット内でWD4より先に投入される。先にゲートを導入すると、既存の5つの乖離でレッドに着地し、一括スキップを誘発してしまう。それはこのADRが導入するために存在する規律そのものである。

## Rejected / deferred alternatives

- **すべての規範的な節に安定したidを付与＋カバレッジゲート（dspec設計）**。発見されたクラスは狭く列挙可能である。コーパス全体のレジストリは、何もアサートしない`reference`級のリンクを買うだけである。根拠ノートにおいて、それ自身の証拠に基づき却下。
- **放置する（ドキュメントのドリフトは表面的なものである）**。却下: 移植は生きた消費者であり、嘘を検出する能力が最も低い読者である。
- **3つすべてを今実装する**。却下: `void`はBCを伴い（ADR-50 WD1）、`internal-type-api`のサーフェスは出荷済みのものより優れているという証拠を持たない。ステータスの忠実性は、設計上の決定の人質にされてはならない。
- **理想を述べた節を削除する**。却下: それは、依然として求められている、記録済みの設計意図を捨ててしまう（特にADR-1:30の`void`に対する型理論的明快さの要件）。マークすることは、意図と正直さを同時に保つ。
- **節ごとの機械可読な`status:`スキーマ**。不釣り合いとして却下: 2つの散文の先例がすでに機能しており、ゲートはファミリーテーブルだけを必要とする。

## Consequences

- **ポジティブ**。コーパスは、チェックできない唯一の読者（rigor-rs）に対して5つの振る舞いを誤って記述するのをやめる。WD4ゲートは、宣言済みのサーフェスについて再発を表現不可能にする── 5件すべてを通してしまった方向が閉じられる。設計意図は、偽りの主張としてではなく、予約として生き残る。
- **ネガティブ／コスト**。コーパスは、いくつかの創成期の宣言が一度も出荷されなかったことを文章で認める── 信頼性のコストであり、現在は完全であるかのように読めるが実際はそうでないspecに対して、一度、意図的に支払われる。WD4はドキュメントspecの軸を1つ追加する（解析コストなし）。
- **キャリーオーバー**。 (1) `void`: WD2における三択。**測定は現在完了している**（根拠ノート § 「void三択のA/B実測」）: `Bases::Void => :translate_top`をパッチしても、診断はmail（26）、kramdown（68）、haml（60）、liquid（5）、mastodonの`app/models`（0、248ファイル）でバイト同一のままである── しかも空虚にではなく、トランスレーターを計測すると、kramdownで29個、mailで2個の本物の`Void`変換が数えられる。したがって**オプション（b）は無償**であり、オプション（c）は排除される: （b）が何のコストもかけないなら、RBSとADR-1:30の両方を譲る理由はない。（b）が無償である理由それ自体が要点である── ガードされていない`top`呼び出しを診断するであろうファミリーである`static.*`はReservedなので、`top`と`Dynamic[top]`は今日、等しく沈黙している。（b）が買うのは、`static.*`が投入されたときに報われる表現上の忠実性であって、今日の診断ではない。（a）は単に（b）に何かを足したもの**ではない**: この節は、なぜ`top`が現れたのかを説明するために、まさに`void`を`top`と別物にしたいのであり、素朴な（b）はそれを捨ててしまう── だが[ADR-75](../75-dynamic-provenance/)のパターンはそのまま適用される（由来は値*について*のメタデータであって、決してそれが*何であるか*の一部ではない）。したがって`void → top`に`void_origins`という同一性を鍵とするサイドテーブルを加えれば、キャリアを追加したり束（lattice）を分岐させたりすることなく、（b）の基盤の上で（a）の意図に到達する。

  **（b）はこの変更セットで投入された**（`Bases::Void => :translate_top`。フルスイート7,914例がグリーン、`make check` / `check-plugins`はクリーン、コーパスはmail/kramdown/haml/liquidでバイト同一）。あるユーザー報告が、忠実性の議論を超えてこのケースを鋭くし、待つのではなく今投入された理由となった: `#: void`を書く作者は「この戻り値に依存するな」と宣言しているのであり、`Dynamic[top]`── 漸進的境界ではあらゆるものと一貫する── は、それでも呼び出し側にその依存をサイレントに築かせてしまう。それは`void`が防ぐために存在する、まさにその一つの帰結である。`top`は証明を要求するので、宣言された契約に奉仕する。作者が求めた拡大は`top`への拡大であり、まさにRBSが定義するとおりである。

  **キャリーオーバーとして残るのは**（a）である: `special-types.md` § `void`のdistinctな`void`という意図。その値位置の診断は、あと2つのピースを必要とする── **`static.*`ファミリー**（Reservedであり、`top`を実際に噛みつかせる連結子でもある: それがなければ`top`と`Dynamic[top]`は等しく沈黙し、それが（b）が無償と測定された理由である）と、推移的なケースのための**`void_origins`サイドテーブル**（`def bar; foo; end; a = bar`── `bar`は何も宣言しないので、`bar`のRBSを読む呼び出し箇所の規則は、本体を通じてそこに到達した`void`を見ることができない）である。（2）散文の節の本体はゲートされないままである（WD1）── P1クラスのプローブは依然として手動の計器である。（3）`internal-spec`の他のドキュメントはスイープされておらず、`internal-type-api.md`だけがプローブされた。

## Relationship to other ADRs

- **ADR-1 / ADR-2 / ADR-3** — これが照合する創成期の宣言。ADR-1は発見#1を予見しており、`void`の意図が削除ではなくマークされる理由である。
- **ADR-49** — 拡張によって基準を供給する: 軸6（*ステータスと進捗の忠実性*）はすでにADRコーパスを拘束している。これは同じ規律をspecコーパスに適用する。
- **ADR-41** — モデルとなる事例: Proposed ADRとspec内マーカーの組み合わせは、WD2が他のギャップに要求するまさにその形である。
- **ADR-50** — WD1は新たな必須の規律をBCとする。それが、`void`を単純にデフォルトのサーフェスへ実装できない理由である。
- **ADR-62** — 同族性: 両者とも、偽陽性志向のゲートには見えない偽陰性を対象とする。ADR-62は不在の*牙*を扱い、これは不在の*機能*を扱う。
- **ADR-79 / ADR-91** — specの生きた消費者としてのrigor-rsと、外部で発見されたギャップをリポジトリ内のゲートに変換する先例。
