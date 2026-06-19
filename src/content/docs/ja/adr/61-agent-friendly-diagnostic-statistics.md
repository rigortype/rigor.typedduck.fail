---
title: "ADR-61 — エージェントに優しい診断統計（構造化セレクタ軸）"
description: "Imported from rigortype/rigor docs/adr/61-agent-friendly-diagnostic-statistics.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/61-agent-friendly-diagnostic-statistics.md"
sourcePath: "docs/adr/61-agent-friendly-diagnostic-statistics.md"
sourceSha: "be3a68fba01ddcd31f78dbfeb91424790f79db3b2b5b808375d1b46fe2fbd4b3"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4061
---

ステータス: **Accepted — 2026-06-13に実装**。加算的な2つのサーフェス（surface）。`rigor check --format json`が各診断に構造化された`receiver_type`／`method_name`フィールドを載せるようになり、`rigor triage`に`selectors`セクションが加わった。これは既存のルールごとの`distribution`とファイルごとの`hotspots`と並ぶ、（クラス,メソッド）別の集計軸である。どちらも、AIエージェント（または`jq`パイプライン）が実行結果からクラス／メソッド統計を**診断メッセージ文字列をパースせずに**算出できるようにする。精度に対して加算的であり、新しい診断もなく、深刻度の変更もなく、診断はバイト単位で同一である。[ADR-23](../23-diagnostic-triage-command/)（triageの*内部*をメッセージパースから切り離した）のフォローアップであり、本ADRはそのルールを公開ストリームへ引き上げ、集計プリミティブを追加する。

根拠は、これを動機づけた対話（`jq`経由でクラス／メソッド別にトリアージしたいエージェント）と、診断が散らばるのではなく構造的原因ごとにクラスタを成すことを確立したADR-23の5プロジェクト調査＋Mastodon計測である。

## コンテキスト

`rigor triage`はすでに「この実行はどんな形状（shape）か？」に答えている — ただし2つの軸、ルールIDの`distribution`とファイルごとの`hotspots`に沿ってのみである（[`triage.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/triage.rb)）。保守者やエージェントが実際に推論する3つ目の軸 — *どのクラス／メソッドに診断が集中しているか*（`String#squish`が12ファイルにわたり31回＝ロードされていないコア拡張が1つであって、31個のバグではない）— は、ヒューリスティックな`Catalogue`が出力する人間可読の要約文字列を読むことでしか到達できなかった。それがこのギャップである。

2つの構造的事実が、このギャップを安価に埋められるものにした。

1. `Diagnostic`オブジェクトはすでに`receiver_type`／`method_name`を保持している（ADR-23 WD3が、triageの認識器（recognizer）がメッセージをパースしなくて済むよう追加した）— しかし`Diagnostic#to_h`、すなわち`--format json`のシリアライズが**それらを落としていた**。データは存在していたが、公開ストリームがそれを隠していたのである。
2. 19ルールのうち3つしかこれらのフィールドを埋めておらず、内部的にすらメソッド別ビューは疎だった。

なぜ今か。ADR-50がv1.0で公開出力サーフェスを凍結し、ADR-60はそのサーフェスを正しく仕上げるための凍結前の窓である。構造化された統計の契約（contract）は、まさに凍結の*前*に着地させるべき種類のものであって、後から後付けするものではない。

## 決定

構造化フィールドを公開ストリームに露出させ、triageに`selectors`集計軸を追加する。再利用可能な2つの基準のもとで行う。

- **基準A — メッセージ文字列は提示であって契約ではない**。エージェントが*集計または分岐の対象とする*必要のあるデータは、構造化されたJSONフィールドでなければならない（MUST）。それは`message`文字列をパースすることでしか復元できないものであっては決してならない（MUST NOT）。ADR-50はすでに診断の文言を非契約と宣言している（強化によりマイナーで文言が書き換えられうる）— したがって、エージェントがメッセージから切り出すものは砂上に築かれている。これはADR-23 WD3の「構造化せよ・文字列にするな」ルールを、triageの内部から公開サーフェスへ昇格させたものである。
- **基準B — 損失を伴う畳み込みは集計レイヤーに置き、プリミティブストリームには決して置かない**。`check`ストリームは*サイトごとに忠実*なままである。`Constant<"hello">`のレシーバーは`"hello"`としてレンダリングされ、`Constant<42>`は`42`としてレンダリングされる — それがサイトごとの真の型であり、サイト単位の作業を行うエージェントはそれを求める。統計を意味あるものにする*正規化*（あらゆる文字列リテラルを`String`へ畳み込む）はロールアップの仕事であり、`check`ではなく`triage`に置かれる。同じデータ、2つのレイヤー、それぞれが自分の仕事に正直である。

### WD1 — checkストリーム上の構造化フィールド

[`Diagnostic#to_h`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/diagnostic.rb)は、`receiver_type`と`method_name`を**埋まっているときに**出力し、そうでなければ省略する（既存の`project_definition_site`と同じ慣習）。エージェントは`jq '[.diagnostics[] | select(.method_name) | {receiver: .receiver_type, method: .method_name, rule}]'`でサイトごとにグループ化する。

### WD2 — triage上の`selectors`軸

`Triage.build_selectors`（[`triage.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/triage.rb)）は、`method_name`を保持するあらゆる診断を、その`(receiver, method)`ペアで`Selector = {receiver, method, count, files, rules}`へグループ化する。

- `count` — 合計。`files` — 異なるファイルへの広がり（システミックか局所かのシグナル。高い`count`×高い`files`＝1つの構造的原因）。`rules` — ルールごとの内訳。これにより`undefined-method`と`argument-type-mismatch`が混在するセレクタが読み取れる。
- `receiver`は、メソッドのみの診断では**nil**である（`def`側のreturn／overrideの所見には呼び出しレシーバーがない）。行は依然としてメソッドでグループ化される。
- JSONリストは**上限なし**である — これはエージェント向けのサーフェスである。テキストレンダラーは自身の行を15で上限にする（[`triage_renderer.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli/triage_renderer.rb)）。`--selectors-only`はこのセクションだけを表示する。

**構造化フィールドのみから**構築される（基準A）— `build_selectors`は`message`に決して触れない。

### WD3 — 正規化の配置（基準Bを具体的に）

畳み込みは`Triage.normalize_receiver`（[`triage.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/triage.rb)）に置かれ、ヒューリスティックな`Catalogue`と共有される（その`receiver_class`は今やこれへ委譲する — リテラル畳み込みのロジックが1箇所だけに存在する）。文字列／整数／浮動小数点／シンボルのリテラルはそれぞれのクラスへ畳み込まれる。`singleton(C)`と裸の`C`は`C`へ畳み込まれる。ジェネリックな`C[...]`は、ARリレーションのヒューリスティックが必要とする`Array[String]`の要素形を保つ。これが防ぐ具体的な危険は、畳み込みがなければ`"x".nope`と`name.nope`が*異なる*セレクタ行（`"x"#nope`、`String#nope`）に着地し、1つのイディオムがあらゆるリテラルレシーバーへ断片化することである — これは直接計測した（`"x".nope`は生ストリームでは`"x"`、畳み込み後は`String`）。checkストリームは意図的に正規化しないままにしてある。

### WD4 — どのルールがフィールドを埋めるか

ルールは、診断が曖昧さのない**ディスパッチ対象**を持つ場合にのみセレクタキーを刻印する。

- **Callファミリー**（`call.undefined-method`、`self-undefined-method`、`unresolved-toplevel`、`argument-type-mismatch`、`wrong-arity`、`possible-nil-receiver`、`method-visibility-mismatch`）→ レシーバークラス＋メソッド（レシーバーがユニオン型のとき、例えばnil-receiverではnilレシーバー）。
- **Defファミリー**（`return-type-mismatch`、3つの`override-*`）→ メソッドのみ（`def`の名前。呼び出しレシーバーはない）。
- **除外**: `flow.*`（unreachable／dead-assignment／always-truthy／always-raises）と`def.ivar-write-mismatch`はメソッド呼び出しの対象を持たない。これらにキーを合成すると、シグナルではなくnullレシーバーのノイズを製造してしまう。

充足は19ルール中3から11へ進んだ（[`check_rules.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules.rb)の`build_*`箇所）。

### ガードレール — 統計は決して深刻度に流し込まない

メソッドごとの統計は**診断に対して中立**である。「メソッドXはエラーの40%を占める」は、本物のバグであるのと同じくらいRBSカバレッジのギャップでもありうる。プロジェクトの偽陽性の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>（`feedback_false_positive_discipline`）は、この軸が注意を（`pre_eval:`／RBSオーバーレイ／プラグインへ）ルーティングしなければならず、深刻度をエスカレートしたり診断を作成したりしては**決していけない**ことを意味する。セレクタ軸は、既存の診断ストリームを*読む*だけである。

## 却下／先送りした代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| `message`文字列のパースを続ける（エージェントにとっての現状維持） | 却下 | ADR-50が非契約と宣言する文言に消費者を結合させる。マイナーでのメッセージ強化があらゆるパーサを静かに壊す。基準A。 |
| `check`ストリームでもレシーバーを正規化する | 却下 | サイトごとの精度を破壊する — `Constant<"hi">`は`"hi"`*そのもの*であり、サイト単位の消費者はそれを求める。畳み込みはロールアップの仕事である。基準B。 |
| `by_class`と`by_method`の2つの別々の軸 | 却下 | 1つの`(receiver, method)`プリミティブのほうが厳密により柔軟である — `jq`は両方のビューを合成する（`group_by(.receiver)`／`group_by(.method)`）— し、2つの軸は同じ行を重複させる。 |
| すべてのルール（`flow.*`／ivarを含む）を合成キーで埋める | 却下 | これらの診断はディスパッチ対象を持たない。nullレシーバーや演算子名のバケツはノイズである。WD4の対象テストがその線引きである。 |
| JSONの`selectors`リストに上限を設ける | 却下 | JSONはエージェント向けのサーフェスである。上限を設けると`jq`のユースケースが壊れる。代わりにテキストレンダラーが上限を設ける。 |
| 新しいトップレベルの`rigor stats`コマンド | 保留 | `triage`はすでに集計の本拠地（ADR-23）であり、解析を一度だけ実行する。新コマンドは新たな能力もなくそのパスを重複させる。triage以外の統計ニーズが生じたときにのみ再検討する。 |

## 帰結

ポジティブ:

- エージェントは、散文に対する正規表現の代わりに、安定した契約に対する`jq`ワンライナーでクラス／メソッド別にトリアージする — 例えばファイル横断のシステミックなクラスタには`jq '.selectors[] | select(.files >= 3)'`。2つのオンボーディングスキル（`rigor-project-init`、`rigor-baseline-reduce`）が今やこれを教える。
- `check`のサイトごとのフィールドと`triage`の集計は合成可能である。`check`での精密なサイトごとのグループ化、`triage`での正規化されたロールアップ。

ネガティブ／持ち越し:

- セレクタのフィールドと`selectors`のシェイプ（shape）は、v1.0でADR-50 WD1のもとで**凍結された公開語彙**になる — 意図的に凍結前の窓（ADR-60）で着地させたが、凍結後のリネームはその時点でBC破壊となる。
- `flow.*`／ivar診断は設計上この軸に存在しない（WD4）。「ファイル別のあらゆる診断」を求める消費者は依然として`hotspots`を使う。
- 受け入れ基準は`make verify`がグリーン（6261例、0失敗）、self-check＋`check-plugins`がクリーン、診断がバイト単位で同一、であった — この変更はJSONフィールドとレポートセクションを追加するだけで、診断を決して追加しない。

## 他のADRとの関係

- **[ADR-23](../23-diagnostic-triage-command/)** — 親。本ADRはWD3の「構造化せよ・文字列にするな」ルールを、triageの内部から公開ストリームへ拡張し、`distribution`／`hotspots`が空けておいた（クラス,メソッド）別の軸を追加する。
- **[ADR-50](../50-release-engineering-and-stability-strategy/)** — 出力ストリームは公開の契約である。新フィールドとセレクタのシェイプは凍結語彙に入る。凍結前に着地させるのは意図的なタイミングである。
- **[ADR-51](../51-ci-diagnostic-output-formats/)** — 兄弟。CIフォーマットは同じ`Diagnostic`フィールドに対する*提示*である。本ADRは同じフィールドに対する*集計*のカウンタパートである。
- **[ADR-33](../33-mcp-server/)** — MCPの`rigor_triage`／`rigor_check`ツールは同じJSONをアシスタントへ提示する。構造化フィールドは、これらのツールが返せるものを鋭くする。
- **`feedback_false_positive_discipline`** — 統計軸が遵守するガードレール。注意をルーティングするのであって、深刻度には決して流し込まない。
