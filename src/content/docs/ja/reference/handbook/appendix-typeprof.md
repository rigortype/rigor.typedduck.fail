---
title: "付録 — TypeProfから来た場合"
description: "Imported from rigortype/rigor docs/handbook/appendix-typeprof.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-typeprof.md"
sourcePath: "docs/handbook/appendix-typeprof.md"
sourceSha: "096bc456247e9bce02ed26ba4c12268d1995a69ba22c68e0a5eee1473346f039"
sourceCommit: "c64342708cd0effeb20265e84fe912ae22635159"
translationStatus: "translated"
sidebar:
  order: 1050
---

[TypeProf](https://github.com/ruby/typeprof)はRubyの公式な型*推論*ツール — Rubyコア内でメンテナンスされている型レベルの抽象インタープリタであり、アノテートされていない`.rb`ファイルを読んで推論した型を教えてくれる。TypeProfを使ったことがある場合、最も重要なことは**RigorとTypeProfがTypeProfの目玉となる約束を共有している**ということ。どちらもまず`.rbs`を書くことを要求しない。Steepの付録が「両者とも同じRBSを消費する」で始まるのに対し、こちらはその逆 — 両者ともプレーンなRubyから型情報を*生成する*で始まる。興味深い違いは、*どのように*推論するか、そして*結果をどう扱うか*にある。

この付録は既にTypeProfの語彙で考えており、TypeProfのどの概念がRigorのどの概念に対応するかを知りたいユーザー向け。

> **この付録の内容**
> [5秒ピッチ](#5秒ピッチ) ·
> [両者ともアノテーションなしで推論する](#両者ともアノテーションなしで推論する--それが共通の基盤) ·
> [型語彙](#型語彙--typeprof出力vs-rigorキャリア) ·
> [解析モデル](#解析モデル--最大の概念的な違い) ·
> [RBS生成vs`sig-gen`](#rbs生成--typeprof-cli-vs-rigor-sig-gen) ·
> [推論の燃料としてのテスト](#推論の燃料としてのテスト--双方向の問い) ·
> [診断: 副作用vs製品](#診断--副作用vs主たる製品) ·
> [起動](#起動) ·
> [TypeProfにあってRigorにないもの](#typeprofにあってrigorにないもの) ·
> [RigorにあってTypeProfにないもの](#rigorにあってtypeprofにないもの) ·
> [共存パターン](#共存パターン) ·
> [マイグレーションvignette](#マイグレーションvignette)

## 5秒ピッチ

| 問い | TypeProf | Rigor |
| --- | --- | --- |
| 主な仕事 | RubyからRBSプロトタイプを生成する | 証明可能なバグについてRubyをチェックする（`rigor check`） |
| 開始に`.rbs`が必要か？ | いいえ — `.rb`から推論する | いいえ — `.rb`から推論する |
| 推論戦略 | エントリーポイントからのプログラム全体の抽象解釈（「型レベル実行」） | バジェット付きのローカルなメソッドごと推論＋境界でのカタログ |
| スケールターゲット | 小さなファイル／プロトタイピングパス | コードベース全体、インクリメンタル、キャッシュ |
| デフォルト出力 | RBSシグネチャ（＋副作用としていくつかのエラー） | 診断（＋`sig-gen`経由でオンデマンドのRBS） |
| 診断の哲学 | 抽象解釈がつまずいたものを報告する | バグが証明可能な場合のみ沈黙を破る |
| リテラル精度 | 出力で名前的型に拡大する（`1` → `Integer`） | `Constant<1>`、リファインメント（refinement、篩型とも）、`IntegerRange`を保持する |

TypeProfのスローガンが「Rubyを型レベルで実行して返ってきたものを書き留める」なら、Rigorのは「証明できるものを証明し、それだけにフラグを立て、スケールさせる」。ふたつが最も正確に重なるのはひとつの機能 — `rigor sig-gen`（第11章）はTypeProfのCLIが作られた仕事をする。

## 両者ともアノテーションなしで推論する — それが共通の基盤

これが見出し。TypeProfとRigorは、**`.rbs`ファイルがゼロ**の`lib/`ディレクトリで有用なものを与えてくれるふたつのRubyツール。対照的にSteepはシグネチャを前もって要求する。だからTypeProfからRigorに来たなら、「アノテーション不要」のスタンス（第1章）は既に馴染みあるものに感じられるはず — それはあなたがずっと前提にしてきた仮定なのだ。

```ruby
# slug.rb — no sig/ directory anywhere
class Slug
  def normalise(raw)
    raw.strip.downcase
  end
end
```

TypeProfは`normalise`を抽象的に解釈し、`String#strip`に続いて`String#downcase`を見て、（`String`を渡す呼び出しサイトがあれば）`def normalise: (String) -> String`を出力する。Rigorは同じボディをローカルに推論し、`sig-gen`の下で同じシグネチャを出力する — *同時に*内部的には結果が`non-empty?`制約のない小文字化された文字列キャリア（carrier）であることを知っており、それを境界で`String`に消去する。

両者が分岐する箇所:

- **TypeProf**は呼び出しグラフをたどる。`raw`が`String`であることを知るには、それを渡す*呼び出しを見る*必要がある — そのためTypeProfはエントリーポイント（またはメソッドを動かす小さなハーネス）を持つプログラムに向けたときに最も有用。
- **Rigor**は各メソッドをそれ自身の条件でコア／stdlib／gemの型のカタログに対して推論し、推論バジェットで境界づけられ、特定できないパラメータについては`Dynamic[Top]`にフォールバックする — エントリーポイントもハーネスも不要。

## 型語彙 — TypeProf出力vs Rigorキャリア

TypeProfはRBSを出力するので、その*出力*語彙はRBS。RigorはそれをRBSと同じものに読み込み消去する。違いは内部精度にある。TypeProfは出力時にリテラルを拡大するが、Rigorはより豊かなキャリアを保持し境界でのみ消去する。

| Ruby式 | TypeProf出力 | Rigor内部（表示） |
| --- | --- | --- |
| `1` | `Integer` | `Constant<1>`（消去: `Integer`） |
| `"foo".upcase` | `String` | `Constant<"FOO">`（消去: `String`） |
| `[1, "a"]` | `[Integer, String]` | `Tuple[Constant<1>, Constant<"a">]` |
| `{name: "x", age: 1}` | `{name: String, age: Integer}` | `HashShape{name: …, age: …}` |
| `x`不明 | `untyped` | `Dynamic[Top]`（表示: `untyped`） |
| `nil`または`Integer` | `Integer?` | `Integer | Constant<nil>`（表示: `Integer?`） |
| `> 0`でガードされたint | `Integer` | `positive-int`リファインメント（消去: `Integer`） |

実践的な含意: 同じファイルを両方に与えると、TypeProfのRBSと`rigor sig-gen`のRBSは通常*宣言*レベルで一致する。なぜならRigorの[RBS消去](../../type-specification/rbs-erasure/)はTypeProfが決して追跡しなかった余分な精度（`Constant`、`Refined`、`IntegerRange`）をまさに意図的に捨てるから。解析器の内部では、Rigorはより多くを運んでいる — それがリファインメントキャリアによるナローイング（narrowing）と定数foldingの診断を駆動する。（TypeProfも`is_a?`／`nil?`のような型同一性述語に対しては独自のフローセンシティブ（flow-sensitive）なナローイングを行う。運んでいないのは*値述語によるリファインメント*の層と、Rigorがそこから生成するキュレートされた診断のほうだ。）

## 解析モデル — 最大の概念的な違い

ここでツールは本当に分かれる。

**TypeProfはプログラム全体の抽象インタープリタ**。エントリーポイントからプログラムを歩き、*型レベルで実行する*。すべてのメソッド呼び出しが抽象引数型を呼び出し先に伝播し、呼び出し先のボディが解釈され、戻り型が逆流する。これは手続き間（inter-procedural）であり、小さなプログラムでは驚くほど精密 — TypeProfはメソッドのパラメータ型を、それが*どう呼ばれるか*だけから推論できる。これはSteepもRigorも試みない。

そのコストはスケール。プログラム全体の抽象解釈は高コストで、解析は大規模または高度に多相なコードベースで組み合わせ爆発しうる。TypeProfは明示的に、小さなプログラム、単一ファイル、または*出発点*となるRBSパスのためのツールとして位置づけられている — 保存のたびに10万行のアプリに対して実行するチェッカーではない。

**Rigorは境界にカタログを持つローカルでバジェット付きの推論器**。一度に1メソッドを推論する。そのメソッドが別のメソッドを呼ぶとき、Rigorは呼び出し先のボディを再解釈するのではなく、既知の戻り型の*カタログ*（コア、stdlib、gemのRBS、プラグイン貢献）を参照する。解決できない呼び出しは`Dynamic[Top]`になりそこで止まる。これは自己完結したおもちゃのプログラムではTypeProfより精密でない — RigorはTypeProfができるように単一の呼び出しサイトからパラメータ型を推論しない — が、[推論バジェット](../../type-specification/inference-budgets/)で境界づけられ、ファイルごとのキャッシュ（ADR-6）に支えられているため、コードベース全体や実行をまたいでも使い続けられる。

| | TypeProf | Rigor |
| --- | --- | --- |
| 解析の単位 | エントリーポイントからのプログラム全体 | 一度に1メソッド |
| メソッド間の型 | 呼び出し先のボディを再解釈する | カタログで呼び出し先を引く |
| 呼び出しサイトからパラメータを推論するか？ | はい（その看板の動き） | いいえ（パラメータはデフォルトで`Dynamic[Top]`） |
| 境界づけられているか？ | 実践的な爆発の限界で | 明示的な推論バジェットで |
| インクリメンタル／キャッシュ？ | TypeProf 2／`--lsp`で改善 | 実行とマシンをまたぐファイルごとのキャッシュ |

トレードは現実的で意図的。TypeProfはプログラム全体の解釈で小さな入力に対する精度を買い、Rigorはローカルな推論とカタログでスケールと沈黙を買う。

## RBS生成 — `typeprof` CLI vs `rigor sig-gen`

これはツールが*同じ仕事*をするひとつの機能であり、直接比較する価値がある。RubyからRBSを生成することはTypeProfの存在理由そのものだが、Rigorにとってはひとつの二次的なコマンド、[第11章](../11-sig-gen/)である。

| | `typeprof foo.rb` | `rigor sig-gen` |
| --- | --- | --- |
| 出力 | stdoutへのRBS | `--print`／`--diff`／`--write`経由のRBS |
| パラメータ型 | 呼び出しサイトから推論 | 保守的、`--params`ポリシー、ADR-5のトレードオフ |
| 既存のsig | ゼロから再生成 | `new-file`／`new-method`／`tighter-return`の分類、人間が締め付けた戻りを決して上書きしない |
| 出力のリテラル精度 | 名前的型に拡大 | RBSに消去（境界で同じ拡大） |
| フィードバックする駆動シグナル | 手編集する一回限りのプロトタイプ | `sig-gen`のギャップそのものがRigorがより良く推論すべきシグナル |

*この*リポジトリ特有の注記: プロジェクトの常設ポリシー（AGENTS.md § "RBS Authorship"）は、手書きまたはAI生成のRBSよりも`rigor sig-gen`を優先することである。まさに`sig-gen`出力のギャップが、パッチで塞いだシグネチャよりも価値あるフィードバックだから。`typeprof`を実行してその出力を`sig/`に貼り付けることに慣れているなら、Rigorの対応物は`rigor sig-gen --diff` — ただしマインドセットは「足場を組んでから編集する」から「足場が間違っているなら推論を直す」へと移る。

## 推論の燃料としてのテスト — 双方向の問い

解析モデルのセクションの自然な続き: TypeProfが呼び出しサイトからパラメータ型を学ぶなら、そしてテストが呼び出しサイト*そのもの*なら、ふたつのツールはあなたの`spec/`（または`test/`）スイートをどう使うのか。本当はふたつの方向があり、ツールは各方向で異なる。

### 方向1 — テスト → メソッド型

テストはメソッドがどう呼ばれるかの具体例の山なので、パラメータ型の証拠になる。ここで解析モデルが最も鋭く透けて見える。

- **TypeProfは呼び出しサイトを燃料にする — そしてテストはそのうちの一種にすぎない**。TypeProfに「テスト」という概念はない。プログラム全体を抽象的に解釈してパラメータを推論するので、見えるあらゆる呼び出しがパラメータ型を供給する: トップレベルのコード、`__END__`下の例、使い捨てのドライバ、specの1行 — TypeProfにとってはすべて同じ。`Foo.new.bar(42)`を実行する呼び出しが — どこにあろうと — TypeProfが`bar`は`Integer`を取ると学ぶ手段であり、そうした呼び出しがなければパラメータは`untyped`のまま。テストはたまたま呼び出しサイトの豊かな*供給源*であり（だからスイートを含む、コードを動かすものにTypeProfを向けると役立つ）、TypeProfはそれらをテストとして認識も特別扱いもしない。
- **Rigorは`rigor check`のためにテストを読まない**。そのローカルモデルはナローイングされていないパラメータを`Dynamic[Top]`のままにする。バグ発見のゲートはそれらを締め付けるために`spec/`を決して参照しない。テストがパラメータシグナルになるのは、オプトインの`rigor sig-gen --params=observed --observe=spec/`パス（[第11章](../11-sig-gen/)）に限られ、そこでは位置ごとに観測された引数型をすべての呼び出しサイトにわたってユニオン化する。

つまり対比は鋭い: TypeProfはspecを通常のRubyとして解釈し（`it`ブロックはただの呼び出しサイトが増えるだけ）、対してRigorのsig-genコレクターはRSpec DSLを*構造的に*モデル化する — `described_class`、`subject`、`let`はただ実行されるのではなく、バインディングとして認識される:

```ruby
RSpec.describe Calc do
  subject { Calc.new }                  # :subject → Nominal[Calc]
  let(:other) { Calc.new }              # :other   → Nominal[Calc]
  it { subject.greet("Alice") }         # observed: Calc#greet receives String
  it { described_class.new.add(1, 2) }  # observed: Calc#add receives Integer, Integer
end
```

### 方向2 — メソッド型 → テスト

逆の流れ: シグネチャが`sig/`に着地すると、*spec自体*をチェック可能にする。`rigor check`（および`rigor-rspec`プラグイン）は`subject`／`let`のボディを実際の戻り型に対して型付けし、マッチャーをチェックする。これが次の`sig-gen`実行を鋭くする — 本物のループ。（ふたつのRSpecマシンが別物であることに注意: sig-genのコレクターは組み込みでプラグインを必要としない。`rigor-rspec`は独立した診断解析器。両者は並んで実行され、共有されない。）

### 決定的な違い — ADR-5

観測から導出されたパラメータはほぼ常に**狭すぎる**。スイートで`String`でしか動かされないメソッドは、はるかに多くを受け入れる場合でも`(String)`を取るように見える。それについて何をするかでツールが分かれる。

- **TypeProfは観測された狭いパラメータを出力する** — その仕事は型レベルの実行が見たものを報告すること。
- **Rigorはそれをデフォルトにすることを拒む**。[ロバストネス原則](../../type-specification/robustness-principle/)（厳格な戻り、寛容なパラメータ）の下で、`--params=observed`は意図的なオプトインであり、その出力は凍結された契約（contract）ではなく*レビューすべき提案*。デフォルトの`untyped`は、スイートの現在の使い方が将来のすべての呼び出し元の義務に静かになるべきではない、というスタンスである。

| | TypeProf | Rigor |
| --- | --- | --- |
| テストの役割 | 特別な役割はない — テストは推論を駆動する呼び出しサイトのひとつにすぎない | `sig-gen`だけのオプトイン燃料（`check`ゲートには決して使わない） |
| specの読まれ方 | 通常のRubyとして実行（テストとして認識しない） | `subject`／`let`／`described_class`を構造的に認識 |
| 観測された狭いパラメータ | そのまま出力 | レビュー可能な提案として扱う（ADR-5、オプトイン、人間のゲート） |
| 双方向ループ | 1パス内での引数 ↔ 戻り | spec → sig → spec-checking → より鋭いsig |

Rigor側のふたつの正直な制限（どちらも第11章）: `describe`／`context`をまたいでネストされた同名の`let`バインディングは後勝ち（last-wins）であり、`before`／`around`フックのボディはバインディングの変異について参照されない。

## 診断 — 副作用vs主たる製品

TypeProfは解釈しながらいくつかのエラーを報告する — 未定義のメソッド、明らかに不可能な操作 — が、これらは推論パスの*副産物*であり、キュレートされたリンターではない。ノイジーになりうるし、TypeProfはバグ発見のゲートとして掲げられていない。

Rigorはこれを反転させる。診断ストリーム*こそ*が製品であり、統治するルール（ADR-0、およびツール全体が中心に据える[偽陽性の規律](../08-understanding-errors/)）はバグが証明可能でない限り沈黙を保つこと。`rigor check lib`を実行すると、インタープリタが意外に思ったすべての記録ではなく、小さく高信頼な発見のセットが得られる。

だからTypeProfから来たときのメンタルな移行はこう: Rigorの出力を「見つけた型」だと期待しない（それには`sig-gen`を使う）。「コードが証明可能に間違っている少数の箇所」だと期待すること。

## 起動

| TypeProf | Rigor |
| --- | --- |
| `typeprof app.rb` | `rigor sig-gen --print lib/app.rb`（RBS用）／`rigor check lib`（バグ用） |
| `typeprof -I sig app.rb`（RBSをロード） | `.rigor.yml`の`signature_paths:`（自動検出） |
| `typeprof --lsp`（IDE向けTypeProf） | `rigor lsp`（ADR-19） |
| 呼び出しサイト推論を駆動するハーネスファイル | 不要 — メソッドごとのローカル推論 |
| コア／stdlib RBSを自動ロード | コア／stdlib型のカタログを自動ロード |

両ツールとも標準の`rbs-collection`メカニズム、Steepが使うのと同じものを通じてgem RBSを読む。

## TypeProfにあってRigorにないもの

- **呼び出しサイトからのパラメータ推論**。TypeProfのプログラム全体の解釈は、メソッドの*パラメータ*型をそれがどう呼ばれるかから推論することを可能にする。Rigorはしない — アノテートされておらずナローイングされていないパラメータは、`.rbs`またはガードが別のことを言うまで`Dynamic[Top]`。
- **真の手続き間ボディ解釈**。TypeProfは呼び出し先のボディを再解釈する。Rigorは呼び出し先をカタログで引く。小さな自己完結したプログラムでは、TypeProfはRigorがたどるよりも遠くまでデータフローをたどれる。
- **第一級の「シグネチャ全体を推論する」出力**。それはTypeProfの主たる製品であり、まさにそれに狙いを定めて長年チューニングされてきた。`rigor sig-gen`は意図的により保守的（特にパラメータについて、ADR-5に従う）。

## RigorにあってTypeProfにないもの

- **値述語によるリファインメントキャリア**。どちらのツールも`is_a?`、`nil?`、`case`／`when`のような型同一性述語に対してはフローセンシティブな*occurrence typing*を行う — TypeProfも含めて。Rigorが加えるのは**リファインメントキャリア**だ。`unless s.empty?`や`n > 0`のような*値*述語が、名前付きのリファインメント型（`non-empty-string`、`positive-int`）へとナローイングされる。TypeProfにはリファインメントキャリアの概念がないため、これらの値述語によるリファインメントは`String`／`Integer`へと拡大して戻ってしまう。
- **メソッド呼び出しを通じた定数folding**。`"foo".upcase`は`Constant<"FOO">`に解決される。TypeProfの出力は`String`。
- **キュレートされ偽陽性の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>を持つ診断ゲート**。Rigorはまずチェッカー。TypeProfのエラーは副産物。
- **キャッシュを持つコードベース全体のスケール**。推論バジェットとファイルごとのキャッシュ（ADR-6）は、毎回の実行で大きなアプリに対して`rigor check`を使えるようにする。TypeProfはより小さな入力向けに位置づけられている。
- **RBS::Extendedディレクティブ**。`%a{rigor:v1:…}`のリファインメント／述語／アサーション文法（第7章）にTypeProfの対応物はない。
- **プラグインエコシステム**。Sorbet入力アダプタ、Railsサイドのナローイング、`flow_contribution_for`戻り型貢献 — TypeProfがモデル化しない拡張サーフェス（surface）。

## 共存パターン

ふたつのツールはライフサイクルの異なる点に位置するため、自然に合成される:

1. **TypeProfでブートストラップする（オプション）**。sigのない真新しいファイルや小さなライブラリで、`typeprof`は読むための最初のRBSドラフトを与えてくれる。（またはステップ2に直行する — Rigorはそれを必要としない。）
2. **Rigorでチェックする**。証明可能なバグのゲットのために`rigor check lib`を実行する。これが日々のシグナル。
3. **`rigor sig-gen`でsigを生成する** — Rigor自身の推論とラウンドトリップし、`tighter-return`の非上書きルールを尊重するRBSが欲しいとき。
4. **RigorをCIに追加する**。チェッカーゲートが毎回のpushで実行される。TypeProfはローカルで時折のプロトタイピングの助けにとどまる。

両者のRBSが食い違うときの常設ルール: TypeProfはRigorが`untyped`と報告する呼び出しサイトから*より狭いパラメータ*を推論しうる。それはRigorのバグではない — ローカルvsプログラム全体のトレードである。Rigorにそのより狭いパラメータを尊重させたいなら、それを`sig/`に書く（すると両ツールがそれを読む）か、エンジンがナローイングできるガードを追加する。

## マイグレーションvignette

中規模のgemの`sig/`をブートストラップするためにTypeProfを使ってきたとする。`typeprof lib/**/*.rb`を実行し、プロトタイプを手編集し、コミットする。その上にRigorのバグ発見が欲しい。

手順:

1. **生成した`sig/`を残す**。RigorはSteepがそうするのとまったく同じようにそれを入力として読む — TypeProf生成のRBSはただのRBS。
2. **`rigor check lib`を一度実行する**。TypeProfが与えたのとは*異なる*種類の出力を期待する。シグネチャではなく、証明可能な発見の短いリスト — ナローイング対応の診断（`flow.always-truthy-condition`）、コミットしたsigに対する戻りの不一致（`def.return-type-mismatch`）。バグかノイズかをトリアージする。
3. **RBS生成ステップを`rigor sig-gen`に切り替える**。以前は`typeprof`を再実行して再編集していたところで、代わりに`rigor sig-gen --diff`を実行する。分類モデル（`new-file`／`new-method`／`tighter-return`）は、手で締め付けたパラメータ型を*潰さない*ことを意味する。
4. **オプションで`RBS::Extended`でsigを締め付ける**。TypeProfは`%a{rigor:v1:…}`を通常のRBSコメントとして扱い無視する。Rigorはそれらをリファインメントディレクティブとして読む。同じ`.rbs`ファイルがより厳格なRigor出力と変更なしのTypeProf出力を生む。

基盤となる前提 — 交換フォーマットとしてのRBS、デフォルトとしての推論 — が共有されているため、移行は低摩擦。それはまさにTypeProfがあなたを訓練してきたものだ。

## 次のステップ

この付録セクションの残りを順番に読む必要はおそらくない。3つの有用なポインタ:

- [第11章 — `rigor sig-gen`でRBSを生成する](../11-sig-gen/) — Rigorの内部でTypeProfの仕事をする機能、非上書きの分類モデルを伴う。
- [第8章 — エラーの理解](../08-understanding-errors/) — Rigorの実際の製品である診断ゲートのため — TypeProfがなろうとしないもの。
- [`docs/type-specification/inference-budgets.md`](../../type-specification/inference-budgets/) — プログラム全体の解釈がスケールしないところでローカルな推論をスケールさせるバジェットモデルのため。

他のツールと比較したい場合は、兄弟付録ページが[Steep](../appendix-steep/) — Rubyのもうひとつの静的チェッカー — に加え、[TypeScript](../appendix-typescript/)、[PHPStan](../appendix-phpstan/)、[mypy](../appendix-mypy/)、[Java / C#](../appendix-java-csharp/)、[Rust](../appendix-rust/)、[Go](../appendix-go/)、[Elixir](../appendix-elixir/)をカバーしている。
