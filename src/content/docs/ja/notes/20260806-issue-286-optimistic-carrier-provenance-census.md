---
title: "`if` / `unless`の削除 —— 楽観的キャリアのprovenance調査と双方向A/B（issue #286）"
description: "rigortype/rigor docs/notes/20260806-issue-286-optimistic-carrier-provenance-census.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260806-issue-286-optimistic-carrier-provenance-census.md"
sourcePath: "docs/notes/20260806-issue-286-optimistic-carrier-provenance-census.md"
sourceSha: "b5176687f61c8211da670f9f4072c4e479a5d32a900efb0ddee0bba50124bc29"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
translationStatus: "translated"
sidebar:
  order: 20266806
---

ステータス: [issue #286](https://github.com/rigortype/rigor/issues/286)のための計測。`master`の9dc901a9（Rigor 0.3.x系）に対して実施。非規範的;`master`の`lib/`には何も出荷していない。判定をキャリアの*形状*で分類した[2026-08-05の形状の調査](../20260805-issue-286-if-unless-truthiness-elision-census/)の後継であり、こちらは*provenance*で分類する。決定が依拠するのはその軸だ。

**要点: 2,060件の判定のうち47件（2.3%）が楽観的にnilフリーなキャリアに依拠しており、うち30件は書かれたアームを落としている —— そしてその47件を辞退させても、11ターゲットすべてで両方向とも診断は同一である**。前回の調査が使わざるをえなかった形状ベースの代理は、*両方向*に間違っている: 99件を過大に数え（辞退することになる本物の証明）、12件を過小に数える（見えない楽観的な`Constant`キャリア。削除が実際に走る分岐を消してしまう唯一のクラスタを含む）。

## 1. この調査が足すもの

前回のノートは、`if` / `unless`の削除が`Narrowing.predicate_certainty`の3番目の消費者であること、そして`docs/internal-spec/inference-engine.md:251`が他の2つしか制約していないことを確立した。だが、ある判定のnilフリー性が*証明*なのか*楽観*なのかには答えられなかった。provenanceが記録されていなかったからだ —— そこで判定をキャリアの形状で分割し、その分割を限界として明示していた。

provenanceは今や直接記録されている。`RBS::Definition::Method::TypeDef#overload_annotations`が`%a{implicitly-returns-nil}`を**オーバーロードごとに**公開し、`OverloadSelector.select`が`method_definition.method_types`のいずれかを逐語で返すので、選択されたオーバーロードはオブジェクトの同一性で解決できる。したがってこの判断は、形状の代理には不可能な精度で正確だ: `Array#first`は楽観的だが`Array#first(3)`はそうでなく、`String#[]` / `Enumerable#find`はすでにミスを`?`で綴っているので正直である。

このマークは[ADR-75](../../adr/75-dynamic-provenance/) / [ADR-82](../../adr/82-dynamic-provenance-wiring/)をモデルにしたサイドチャネルで運ばれる: `RbsDispatch.translate_return_type`（既存の`record_void_recovery`フックの隣）で呼び出しノードに記録され、代入時に束縛へ伝播し、素のローカル読み取りから解決し直される。型キャリアには一切触れていないし、新しいテーブルは既存の4つのoriginテーブルとまったく同様に`Scope#==` / `#hash`から除外されているので、この計装がフローの決定を変えることはありえない。

## 2. 手法、そして潰した罠

`rigor check --workers 0 --no-baseline --no-cache --no-ci-detect`、cwdはターゲット、`BUNDLE_GEMFILE`はRigorのものを指し、Flakeの中で実行。前回の調査と同じ11ターゲット。

罠を3つ潰した。どれもこのリポジトリで以前、説得力のあるゼロを捏造したことがあるものだ:

- `--no-baseline`（プロジェクトのベースラインはredmineだけで793件の診断を黙らせる）と`--no-cache`（#285以前は、実行結果のキャッシュキーがエンジンのソースから何も導いていなかった）。
- **4象限の陽性コントロールを最初に実行した**。コーパスに何かを言わせる前に、分類器は3つの楽観的なキャリア形状すべてで「はい」と言い、*かつ*同じキャリアクラスの証明側のメンバーで「いいえ」と言わなければならなかった:

  | フィクスチャ | キャリア | 要求 | 観測 |
  | --- | --- | --- | --- |
  | `MAP[key]`（値の型が2つ） | `Union` | 楽観的 | ✅ |
  | `MONO[key]`（値の型が1つ） | **`Constant`** | 楽観的 | ✅ |
  | `ENV.keys.first` | `Nominal` | 楽観的 | ✅ |
  | `ENV.keys` | `Nominal` | 証明 | ✅ |
  | `"abc".upcase` | `Constant` | 証明 | ✅ |
  | `ENV["HOME"]` | `Union`（`String?`） | 辞退 | ✅ |

  効いている行は`Nominal`の対だ: 同じキャリアクラスが一方では楽観的、他方では証明として出てこなければならない。決定のすべてが両者を分けることに依拠しているからである。
- **前回の調査とのクロスバリデーション**。判定数は11ターゲット中10で完全に一致する（erubi 1、faraday 5、net-ssh 14、kramdown 79、liquid 20、mail 670、textbringer 645、redmine 162、mastodon 46、plugins+examples 99）。違うのはRigor自身の`lib`だけで、316に対してここでは319 —— 約1%のドリフトであり、この調査がソースのサイト数ではなく*評価*を数えていること、そしてメソッドの戻り値推論が本体に再突入する回数が可変であることという前回のノートの注意書きと整合する。

フィクスチャ由来の作為が2つ記録に値する。どちらも最初はエンジンの謎に見えたからだ:

- `Time.now`は`rigor check`の下では`Dynamic`と型付けされる（`time`標準ライブラリのRBSはデフォルトでロードされない）のに、`rigor type-of`はそれを`Time`へ解決する。`Time`の上に作ったコントロールは何も計測しない。
- `["a", "b"].map { … }`は`Tuple`を生むので、`.first`は`ShapeDispatch`によって精密に解決され、**正しく**楽観的でない —— 非空のタプルは本当にミスしえないからだ。アノテーション付きのオーバーロードに到達するには本物の`Array`名前的型（`ENV.keys`）が必要である。

## 3. 結果

2,060件の判定のうち47件（2.3%）が楽観に依拠しており、うち30件が書かれたアームを落とす。

| キャリア | 証明 | **楽観的** | 合計 |
| --- | ---: | ---: | ---: |
| `Constant` | 1,914 | **12** | 1,926 |
| `Nominal` | 65 | **11** | 76 |
| `Union` | 31 | **24** | 55 |
| `HashShape` | 2 | 0 | 2 |
| `Tuple` | 1 | 0 | 1 |

ターゲットごと（判定 / 楽観的 / 書かれたアームを落とす楽観的）: rigor `lib` 319/14/8、plugins+examples 99/7/6、redmine 162/14/13、textbringer 645/9/2、mail 670/2/0、mastodon 46/1/1、そしてerubi / faraday / net-ssh / kramdown / liquidは合わせて楽観的0件。

### 形状の代理は両方向に間違っている

**非`Constant`**のキャリアすべてで辞退する —— 前回のノートがスコープした形状ベースの選択肢 —— と、134件の判定に触れることになる。そのうち実際に楽観的なのは35件だけだ。残る**99件は本物の証明**である: クラスが本当に`nil` / `false`を除外する`Nominal`のキャリアと、居住性から健全な`Tuple` / `HashShape`のキャリアだ。そのうえで、止めようとしたまさにその賭けをしている**12件の楽観的な`Constant`の判定**が残ってしまう。

その12件は珍事ではない。うち8件はredmineの1つのクラスタだ（`lib/redmine/export/pdf/issues_pdf_helper.rb:92-115`）:

```ruby
left << nil while left.size < rows          # 要素型がnilへ潰れる
…
item = left[i]                              # Array#[] -> Constant[nil]、楽観的
heights << pdf.get_string_height(35, item ? "#{item.first}:" : "")
```

判定は`:falsey`なので、削除は**truthy**のアーム —— `left`が非空であるときに必ず走る分岐 —— を落とす。これは`MAP[key]`のケースの鏡像であり、キャリアが`Constant`なので形状のゲートには見えない。

残りの楽観的なサイトは、前回の調査が述べたルックアップからのガードのイディオムであり、今回は読解ではなくprovenanceによって確認された: `if link = RECORD_LINK[record.class.name]`（redmine `application_helper.rb:243`）、`HIRAGANA_TABLE[c]`（textbringer `skk_input_method.rb:410`・`:491`）、Rigor自身の`handler = HANDLERS[command]`（`cli.rb:91`）と`shape_dispatch.rb:240`/`:247`。

## 4. 双方向のA/B

述語が楽観的なマークを運ぶとき、そしてそのときに限り削除を辞退する。実装は2つの消費者側であり、意図的に`falsey_nominal?` / `narrow_falsey`には**置かない**（`&&=` / `||=`とand/orの生き残る左辺のエッジもそれらを読んでおり、そこでfalsey断片を広げると束縛されたローカルに`nil`が再び入り、`possible nil receiver`の発火を買うことになる）:

- **診断: 11ターゲットすべてでバイト単位で同一。追加ゼロ、削除ゼロ**。
- **精度: リグレッションなし**。 Rigor自身の`lib`では`constant`ノードが3つ増え、`bot (unreachable)`が3つ減る —— これまでスキップされていた死んだアームが型付けされるようになるためだ。redmineでは精度比率が50.93% → 50.92%へ動く（43,202ノード中、精密なノードが−4）。
- **正しいコードに対する再現可能な偽陽性を除去する**。前回のノートの再現例から変わらない:

  ```ruby
  MAP = { a: "x", b: "y" }.freeze
  v = MAP[key]
  n = if v then 1 else "none" end   # master: elseアームが落ち、nは1と型付けされる
  n.upcase                          # master: error: undefined method `upcase' for 1
  ```

差分ゼロはそれ自体では証拠にならない —— #152は「新規診断ゼロ」のゲートを通ったが、それでも出荷は間違いだっただろう。その被害のモードは新規の発火ではなく*削除されたフォールバック*だったからだ。*辞退する*ことの被害のモードは失われる精度なので、精度を並べて計測したし、それは悪化しない。このフラグは小さなターゲット（Rigorの`lib`: +3/−3のカバレッジ差分）でも大きなターゲット（redmine: 50.93 → 50.92の差分）でも独立に生きていることが証明されたので、このゼロは不活性なビルドではなく計測である。

## 5. 決定への帰結

このissueの3つの選択肢は、もはや対称ではない。

- **非`Constant`のキャリアで削除をやめる**は、過剰でもあり（健全性上の理由なく99件の本物の証明を辞退する）不完全でもある（12件の楽観的な`Constant`の判定が生き残り、生きた分岐を消すredmineのクラスタを含む）。計測はこれを退ける。
- **仕様の除外を拡張して現状を追認する**は、いまや、修正コストがゼロと計測される、正しいコードに対する再現可能な偽陽性に抗して論じなければならない。
- **provenanceで辞退する**はちょうどその47件を狙い、両方向とも診断に中立であり、最大のターゲットで精度の約0.01ポイントを費やすだけだ。

先例についての前回のノートの読みに1つ訂正がある: [ADR-78](../../adr/78-reflexive-overfold-always-truthy/)が却下したのは、*エンジンが生成すべきでなかった定数を洗浄する*ためのprovenanceタグだった —— その言葉は、provenanceは`Dynamic`を説明するのであって定数を正当化しない、である。楽観的なユニオンは別のオブジェクトだ: 意図的に生成され、ディスパッチには正しく、25件の実測された偽陽性に裏づけられている。ここで問題なのは、エンジンがそれを生成してよいかではなく、**確実性の判断がそれを証明として読んでよいか**である。ADR-78はそれを閉ざしていないし、ADR-75のチャネルはそのための確立された形だ。

## 6. 限界

- provenanceは呼び出しノードと**ローカル**の束縛について運ばれる。インスタンス変数は伝播されないので、`@x = MAP[k]; if @x`のようなサイトは過小に数えられる;楽観的な集合の中にivar読み取りの述語はなかったが、*辞退された*判定のうち何件がそうかについてはコーパスをスイープしていない。
- モデル化した楽観の原因は`implicitly-returns-nil`のファミリーだけだ。エンジンが意図的に楽観的である他の箇所が（もしあれば）マークされることはない。
- 47行のうち19行はソースパスを持たない（値側の消費者のスコープは`source_path`がnil）;それらはスコープ側の消費者がパス付きで記録するサイトと重複するので、実際の異なるサイトは約20で、生のサイトキー35件より少ない。
- 計装とA/Bのフラグは`optimistic-nil-free-provenance-census-286`ブランチにあり、そのまま出荷する意図は**ない**: 調査のフックと`RIGOR_286_DECLINE_OPTIMISTIC`のenvゲートは計測の足場だ。このブランチを意図的に保存してある —— 2026-08-05の調査のハーネスは自身のコミットを生き延びず、それを作り直すのにセッションの大半を要したからだ。
