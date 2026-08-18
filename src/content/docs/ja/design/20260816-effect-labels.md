---
title: "エフェクトラベル — Rigorのためのオプトインのエフェクトシステム"
description: "rigortype/rigor docs/design/20260816-effect-labels.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260816-effect-labels.md"
sourcePath: "docs/design/20260816-effect-labels.md"
sourceSha: "dbfd9a31931f356d96df50d3305d7843f36379b3a614452f8461321876f09723"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 20265816
---

**ステータス:**ドラフト（検討中の設計、2026-08-16）。何も実装されていない。その決定は[ADR-103](../../adr/103-effect-labels/)（Proposed）によって作業上の決定として固定され、[#376](https://github.com/rigortype/rigor/issues/376)配下でスライスされている。承認されればADR（根拠）、規範的な`docs/type-specification/effect-labels.md`（ラベル、包摂、エンベロープ、レーン）、internal-specの節（サマリー収集、伝播、診断）、そして`CONTEXT.md`の用語集エントリーへ卒業する。それまではここにあるものは何も拘束しない。

**1段落で**。[Steins](https://github.com/rigortype/steins)は型と並ぶ*第2の次元*を推論する——呼び出しグラフ上で不動点まで伝播され、作者が宣言した上界（「エフェクトエンベロープ」）に対してチェックされる階層的な副作用ラベル（`io.db`・`io.net.http`・`nondet.time`）——そして同じモデルがPHPStanの純粋性タグのオプトイン拡張として起草されている（`@phpstan-impure io.db`）。本ノートは、ホスト言語がRubyのときこのモデルがどう見えるかを問い、こう答える: **モデルはそのまま移植される;変わるのはエフェクトがどこで生じるか、ディスパッチとブロックをどう扱うか、そして——興味深い部分だが——宣言をどこに綴るかだ**。最後の問いへのRuby的な答えは、*推論が仕事をし、`%a{pure}`がエコシステムの既存の純粋性の綴りであり、エンベロープはメソッドごとではなく規約（名前空間 / パス）によって付ける*、というものだ。メソッドごとの必須アノテーションは明示された非目標である。共有レジストリの上に、**フレームワーク語彙**（`rails.*`、§11.2）が、そのトランスポートがアダプタ依存で静的に知りえないRailsの機能が何を*意味する*かを名指す。そして*検証*する主たる方法はエンベロープではまったくなく、その差分がレビューされそのドリフトをCIがゲートする、コミットされた**エフェクトスナップショット**だ（§9.4）——エフェクトにとっての`db/schema.rb`である。

ソース: Steinsの[Why effects?](https://github.com/rigortype/steins/blob/master/docs/why-effects.md)・[effects.md](https://github.com/rigortype/steins/blob/master/docs/type-specification/effects.md)・[phpdoc-effects-interop.md](https://github.com/rigortype/steins/blob/master/docs/type-specification/phpdoc-effects-interop.md);PHPStanのRFCドラフト[20260812-issue-draft-effect-labels-spec.md](https://github.com/zonuexe/phpstan-notes/blob/master/generated-report/20260812-issue-draft-effect-labels-spec.md)とその起源ノート[20260703-effect-system-design.md](https://github.com/zonuexe/phpstan-notes/blob/master/generated-report/20260703-effect-system-design.md)。

## 1. なぜ、Rubyで

PHPでの動機はそのまま持ち越される: コントローラーはパラメータや戻り値型が1つも変わることなく、3層のサービスを通じてデータベース・ネットワーク・時計への依存を獲得しうるし、テストは依然として通る。Rubyはそれ自身の動機を2つ加える。

- **エンジンはすでにそれを欲している**。`Rigor::Inference::StatementEvaluator`は「エフェクトシステムなしには純粋性を証明できない」という理由で、暗黙的self呼び出しをまたいでナローイングされたすべてのivarをリセットする（[statement_evaluator.rb:1420](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/statement_evaluator.rb:1420)）;[control-flow-analysis.md §純粋性ポリシー](../../type-specification/control-flow-analysis/)の純粋性ポリシーは仕様化されているが未実装の`rigor:v1:pure`を伴う既定不純である;定数畳み込みティアは手選りの純粋性許可リストでゲートされている;仕様が約束する組み込みの変更サマリーは統一された構造として存在しない。これらのそれぞれが「この呼び出しは何をするか」の消費者であり、今日はそれぞれが自前の部分的なテーブルを運んでいる。
- **Rubyの文化はエフェクトをRigorに見えない規約に置いている**。bang / 非bangの対（`sort`/`sort!`）、`save`対`save!`、「プレゼンターとポリシーはクエリしない」、「値オブジェクトはfrozen」、「モデル内の`Time.now`はコードスメル」——レビュアーはこれらを目視で強制している。ラベルシステムは、プロジェクトが宣言することを選んだ場所ではそれらを機械的にチェック可能にし、それ以外のあらゆる場所では報告可能にする。

rigortype組織は両方のアナライザーを運用しているので、共有されたラベル語彙と共有された診断識別子はそれ自体が目標だ: PHPサービス向けに書かれたポリシー（`io.db`はプレゼンターに到達してはならない）はRailsアプリに対しても同じに読めるべきである。

## 2. 目標と非目標

目標:

- **オプトイン、推論優先**。すべてのメソッドは*推論された*エフェクトサマリーを得る;作者が境界を宣言しない限り何もチェックされない。宣言は望む場所ではメソッドごとだが、主たる付与サーフェスはより粗い（§6）。
- **未知から偽陽性を決して出さない**。診断は*証明された*エフェクトだけを読む;未解決のディスパッチは網羅性を汚染し、発見を生まない（[ADR-5](../../adr/5-robustness-principle/)、AGENTS.md「偽陽性は最悪ケースの静的な読みに優る」）。
- **アノテーションなしで元を取る**——エンジンの消費者（§8）、レビューサーフェス（§9.3）、そしてコミットされドリフトでゲートされるエフェクトスナップショット（§9.4）は宣言をまったく必要としない。スナップショットが主たる検証モードであり、エンベロープはオプションの第2ステップだ。
- **Steins / PHPStan RFCと整合した語彙と識別子**。Rubyが本当に異なる場合を除く。

非目標（Steinsの「What Steins is not」からそのまま、すべてここでも真）: 代数的エフェクトなし、`perform`/`handle`なし、ランタイム仲介なし、エフェクト行やエフェクト変数なし、コンパイラ最適化なし。Ruby固有の非目標: **ランタイムDSLなし**（`Rigor.pure def …`は[ADR-0](../../adr/0-concept/)の「アプリケーションコードはRigor固有のアノテーションやDSLをMUST NOT要求してはならない」に違反する）;例外の追跡なし（`raise`はラベルではない——throwの次元はSteinsとRFCでそうであるようにスコープ外のまま）;v1ではクラス本体 / ロード時のエフェクトなし（メソッド本体のみ）。

## 3. 用語——最初に解決すべき衝突

「エフェクト」はRigor内部ですでに使い切られており、`CONTEXT.md`にその用語集エントリーはない:

| 既存の用語 | 場所 | 今日の意味 |
| --- | --- | --- |
| **エフェクトモデル** | [implementation-expectations.md](../../internal-spec/implementation-expectations/) §エンジンサーフェス;ハンドブック[appendix-type-theory §エフェクトシステム](../../handbook/appendix-type-theory/) | エンジン内部の変更 / 非局所脱出 / クロージャエスケープ / 無効化のファクト、「作者によるシグネチャの一部ではない」 |
| **フローエフェクト**、**フローエフェクトバンドル** | [rbs-extended.md §フローエフェクト](../../type-specification/rbs-extended/)、`Rigor::FlowContribution` | ナローイングのファクト（predicate / assert）と変更 / 無効化 / 例外のスロット |
| **エンベロープ** | `CONTEXT.md`（`Dynamic[T]`「エンベロープ`T`内と信じられる」）、ADR-100「FPエンベロープ」、依存関係ソースの「実装エンベロープ」 | すでに無関係な3つの意味 |

提案: 新しい概念は常に複合語**エフェクトラベル**・**エフェクトサマリー**・**エフェクトエンベロープ**とし（決して素の「エフェクト」や素の「エンベロープ」ではなく）、既存のバンドルは**フローエフェクト**を保つ。ハンドブックはすでに本ノートが埋める余地を予約している:「エフェクトをユーザーに表面化させること（アノテーション文法;純粋関数マーカー…）は仕様コーパスで追跡される将来の方向である」（[appendix-type-theory.md:1361-1373](../../handbook/appendix-type-theory/)）。3つの複合語を`CONTEXT.md`に罠のある用語として登録することが、あらゆるスライスの最初の機械的なステップだ。

## 4. そのまま移植されるもの

以下はすべてSteinsの実装済みモデル / RFCの意味論であり、そのまま採用される。Rubyの節を*デルタ*として読めるように列挙する。

- **ラベルはセグメントを考慮した接頭辞の包摂でチェックされるドットパスである**——`io`は`io.net.http`を認め、`iota`を拒否する。葉の追加は認識された境界を決して変えない;ノードの移動または削除は破壊的であり、フェイルオープンで劣化する（RFC「語彙の進化」）。
- **エンベロープは宣言された上界であり**、メソッドの*コード*に対して構造的にチェックされる（「デッドコード内の`echo`も依然として起点である」;ブロックは数える——§5.4）。`pure` = 空のエンベロープで、`mutate.local`のみを許容する。上位型のメソッド上のエンベロープはオーバーライドを束縛する（Liskov包含: 実装はより純粋であってよく、決して純粋でなくてはならない）。
- **2つのレーンと網羅性ビット**。サマリーは*証明*集合（カタログ化された起点、言語構文、プロジェクト本体、推移的に）、*宣言*集合（具体的な呼び出し先が未知の呼び出しサイトでインポートされた`≤`境界）、そして未解決または動的な呼び出しがあれば汚染される網羅性ビットを運ぶ。**診断は証明レーンだけを読む;汚染は決して発見を生まず**「これらのエフェクト、そしておそらくそれ以上」と描画される。
- **未知のラベル ⇒ タグ全体が⊤と読まれる**（フェイルオープン、決して認識された部分集合ではなく）。ラベルの意図が明らかな場所でのみ発火する別途オプトインの語彙診断と対になる。
- **クラスレベルのエンベロープはクラス自身のメソッドに分配され、最近接優先**（メソッドのタグはクラスのタグをオーバーライドする;`-except`構文は不要）。
- **ポリシーによる解消**（Steins ADR-0084）: 判定時に参照され、推論時には決して参照されないプロジェクト全体の`tolerated`ラベル集合;4つの不変条件——カタログは決して嘘をつかない、隠蔽は監査可能な1箇所にある、監査スイッチが隠蔽されない世界を再現する、出力は解消された集合からタグを決して書かない。
- **引数依存のナローイング**: 引数を見ないカタログの行は*健全な*上界（`io`）である;証明されたリテラル引数がそれを絞る（`'https://…'` → `io.net.http`）。
- **診断識別子**`effect.envelope-exceeded`・`effect.liskov-widened`・`effect.unknown-label`——発見が両ツールで同じに読めるようそのまま再利用される。

## 5. Rubyが変えるもの

### 5.1起点: ほとんど何も構文ではない

PHPには`echo`・`exit`・インラインHTMLがある。Rubyのエフェクトを持つ*構文*は小さい;ほぼすべての起点は`Kernel`かコアクラスのメソッドなので、カタログがほとんどの仕事をする。言語構文の起点、Prismノードごと:

| 構文 | ラベル |
| --- | --- |
| `` `cmd` ``・`%x(cmd)`（`XStringNode`・`InterpolatedXStringNode`） | `io.process` |
| `$g`読み取り（`GlobalVariableReadNode`）——フレームローカルの特殊変数`$~ $1..$9 $& $_`等を除く | `global.read` |
| `$g = …`・`$g \|\|= …`・`$g += …`・多重ターゲットの`$g` | `global.write` |
| `@@cv`の読み取り / 書き込み | `global.read` / `mutate.static` |
| インスタンスメソッド本体内の`@iv`書き込み | `mutate.self` |
| シングルトンメソッド本体内の`@iv`書き込み（`def self.x`・`class << self`） | `mutate.static` |
| メソッド本体内の`alias` / `undef` | `mutate.static` |
| `a[i] = v`・`obj.x = v`（インデックス / 属性の書き込み） | 変更呼び出し——レシーバーの所有権で分類、§5.2 |
| ブロックリテラル・`-> {}`・`proc {}`・`lambda {}` | *封じ込め*: 本体の起点は囲むメソッドのサマリーに結合される（§5.4） |
| レキシカルクラス上の`define_method(:lit) { … }` | ブロックが`lit`の本体になる;呼び出し自体は`mutate.static` |
| `yield`、ブロックパラメータ上の`blk.call` | ∅——ブロックのエフェクトは呼び出し元のリテラルで計上される |
| リテラルシンボルを伴う`send` / `public_send` / `__send__` | 通常のエッジ;非リテラル → 汚染 |
| `super` | 祖先の定義へのエッジ（発見テーブル）;解決不能 → 汚染 |
| `eval`・`instance_eval(String)`・`class_eval(String)`・`binding` | 汚染 |
| `raise`・`throw`・`retry` | ラベルではない（フローエフェクトバンドルの`exceptional`スロットに留まる） |
| `BEGIN` / `END` / `__END__` / クラス本体の文 | v1ではスコープ外 |

カタログ化された起点（代表的なシード;完全な表はWD1の成果物）。ラッパー対応のストリームAPIについてSteinsが述べる規則はRubyにも同じ強さで適用される: **世界に向いたクラスの引数を見ない行は親ラベルであり、精度は証明されたサイトでのみ戻る**。

| Ruby | ラベル | 注記 |
| --- | --- | --- |
| `puts print p pp printf putc display`;`$stdout.*` / `STDOUT.*` | `io.output.stdout`（`$stdout`には+ `global.read`） | Rubyには出力バッファ層がない;`.buffer` / `.header`はレジストリに残り、生成されない |
| `warn`;`$stderr.*` / `STDERR.*` | `io.output.stderr` | |
| チャネルが未知のIO上の`IO#write / puts / read …` | `io` | ファイル、ソケット、または端末——親が健全な行 |
| `gets readline readlines`、`$stdin` / `STDIN` / `ARGF`の読み取り | `io.input` | |
| `exit exit! abort`・`Process.exit` | `exit` | `at_exit { }`は封じ込め |
| `system spawn exec fork`・`IO.popen`・`Open3.*`・`Process.*`・`PTY` | `io.process` | |
| `trap`・`Signal.trap`・`Process.kill` | `io.signal` | |
| `File.read / readlines / exist? / stat / open(path, "r")`・`Dir.glob / entries`・`Pathname#read`・`IO.read` | `io.fs.read` | モードリテラルが`File.open`を絞る;未知のモード → `io.fs` |
| `File.write / delete / rename / chmod`・`Dir.mkdir`・`FileUtils.*`・`Tempfile.new` | `io.fs.write` | |
| `Kernel#open(x)` | リテラルパス → `io.fs.*`;リテラル`"\|cmd"` → `io.process`;未知 → `io` | 古典的なパイプインジェクションの足元の銃がサマリーで可視になる |
| `URI.open`（open-uri）・`Net::HTTP.*` | リテラル`http(s)://` → `io.net.http`;未知 → `io` / `io.net` | |
| `TCPSocket Socket UDPSocket OpenSSL::SSL::SSLSocket Resolv Addrinfo` | `io.net` | |
| `UNIXSocket`・`IO.pipe` | `io.ipc` | |
| `rand srand`・`Random.rand`・`Random.new`（シードなし）・`Random.new_seed`・`SecureRandom.*`・`Array#shuffle / shuffle! / sample` | `nondet.random`（`srand`は`global.write`も） | `Array`上のRuby風の起点に注意 |
| `Time.now`・**引数なしの**`Time.new`・`Date.today`・`DateTime.now`・`Process.clock_gettime` | `nondet.time` | `Time.new(2020, 1, 1)`・`Time.at(x)`は∅——アリティ依存のナローイング |
| `Time#getlocal`・`Time.zone`（プラグイン） | `global.read` | 畳み込みカタログがすでに分離している「ホスト依存」の軸;`Time#localtime` / `utc`は加えてレシーバーを変更する |
| `ENV[] / fetch / key?`・`Dir.pwd`・`Thread.current[]`・`$LOAD_PATH`読み取り・`ObjectSpace.*`・`GC.stat` | `global.read` | |
| `ENV[]= / delete`・`Dir.chdir`・`Thread.current[]=`・`$stdout = …`・`Warning[]=`・`Encoding.default_external=`・`GC.disable` | `global.write` | |
| `require require_relative load autoload` | `io.fs.read`（+ `mutate.static`、未決 §13） | メソッド内の遅延`require`は本物のRubyイディオム |
| メソッド本体内の`Module#define_method / alias_method / include / prepend / extend / attr_* / const_set / remove_const / private / module_function / refine` | `mutate.static` | |
| `Object#instance_variable_set` | `self`上 → `mutate.self`;それ以外は所有権による | |
| `Fiddle::Function#call`・`FFI::Library`のattachされた関数（rigor-ffi） | `ffi` | |
| `Logger#info / debug / …` | `io`（宛先不明）+ 意味ラベル`telemetry` | 許容ポリシーの代表例;`Rails.logger`・`ActiveSupport::Notifications.instrument`はrigor-rails経由 |
| `Kernel#sleep`・`Queue#pop`・`Mutex#lock`・`Thread.new`・`Ractor.new`・`Fiber` | **未決**（§13） | ブロックは封じ込めで結合;プリミティブはv1ではラベルを運ばない |

カタログが必要とする2つの既定姿勢。Rubyのコアサーフェスは、Steinsの頻度でシードされたPHPの集合よりはるかに大きいからだ: **値クラス**（`Array Hash String Symbol Integer Float Range Struct Data Set Comparable Enumerable …`）はカタログにないメソッドについて既定で∅で、ミューテータと少数の非決定的なものは明示的にカタログ化される;**世界に向いたクラス**（`Kernel IO File Dir Process Socket Net::* ENV Signal Random Time`）はカタログにないメソッドについて既定で`io`（または汚染）で、行が絞る。それはSteinsが行ごとに行う「クラスファミリーによる健全な上界」と同じ一手を、普通のRubyで網羅ビットが意味を保つようクラスごとの既定へ持ち上げたものだ。

**既存のカタログがシードできるものとできないもの**。`data/builtins/ruby_core/*.yml`はCRubyのC本体から抽出されたメソッドごとの`purity`と`c_effects`ファセットを運ぶ——だがその軸は*Cディスパッチの意味での畳み込み安全性*であって、エフェクトの自由さではない: `Random#rand`は`purity: leaf`、`Array#push`は`c_effects: []`の`leaf`（`rb_ary_modify`は分類器が見ないマクロ）、`Array#sort`は自身のコピーを`rb_check_frozen`するので`mutates_self`と読まれる。したがって**エフェクトラベルは`purity:`から読み取れない**。エフェクトカタログをシードできるもの: `c_effects: mutate`と`block`マーカー（候補となるミューテータ / ブロック依存の行）、`lib/rigor/inference/builtins/*_catalog.rb`内の手で監査された`mutating_selectors:`ブロックリスト（`random_catalog.rb`はすでに散文で変更と非決定性と純粋性を分けている）、`MethodCatalog::NON_REPRODUCIBLE_SELECTORS`（`hash`・`object_id`・`__id__`——既存の`nondet`概念）、`MutationWidening::ARRAY_MUTATORS` / `HASH_MUTATORS`、そして`ClosureEscapeAnalyzer`の非エスケープ / エスケープのテーブル。エフェクトカタログは、それらを証拠として引用する**新しい、手で監査されたアーティファクト**（提案: `data/effects/core.yml`）である;生成されたファイルの読み直しではない。

### 5.2変更: 参照渡しがないので、`mutate.local`は所有権を意味する

PHPの`mutate.local`はフレームプライベートな束縛への参照渡しの出力パラメータ書き込みを名指す。Rubyには参照渡しのパラメータがない;代わりにあるのは遍在するレシーバー変更（`<<`・`[]=`・bangメソッド・`@x =`）だ。同じエンベロープの問い——*呼び出し元はそれを観測できるか？*——は**誰がレシーバーを所有するか**によって答えられ、Rigorはすでにその証明義務を列挙している（[control-flow-analysis.md §証明義務](../../type-specification/control-flow-analysis/): 新規に確保され、逃げておらず、それを保存しうる呼び出しに渡されていない）:

| 変更呼び出し / 書き込みのレシーバー | ラベル |
| --- | --- |
| フレーム所有のオブジェクト: この本体で新規に確保され、決して逃げていない（`rows = rows.dup; rows.sort!`・`buf = +""; buf << x`） | `mutate.local`——`pure`を含むあらゆるエンベロープが許容 |
| `self`の状態: `@iv = …`・`@list << x`・`self.x = …`・self上の`attr_writer` | `mutate.self` |
| 引数として到来したオブジェクト（`params[:x] = …`、`list`がパラメータである`list << x`） | `mutate.arg` |
| クラスレベルの状態: `@@cv`、シングルトンコンテキストのivar、`const_set`、`define_method`、オブジェクトモデルの呼び出し | `mutate.static` |
| それ以外——呼び出し結果、別オブジェクトのivar、分類不能 | `mutate`（素の、保守的な親） |

`mutate.self` / `mutate.arg` / `mutate.static`はRubyの提案する葉である;Steins ADR-0055は`mutate.self` / `mutate.instance` / `mutate.static`を予約しているので、どちらかが出荷される前に名前を調整すべきだ（§13）。これらは二重にその場所を稼ぐ: `pure`は`mutate.local`の除外だけを必要とするが、ファクトストアの無効化バケット（ローカル束縛、オブジェクト内容、グローバルストレージ——control-flow-analysis.md §スコープスナップショット）はそれらに1対1で写像され、それが§8の「無効化キー」の消費者だ。Rigorはすでにメソッドごとに`mutate.arg`の半分を計算しており（`content_mutated_parameter_positions`、ADR-89 WD2、インクリメンタルスナップショットに永続化）;`mutate.self`の半分はivar書き込みの構文的スキャンであり;`mutate.local`の所有権の判定は仕様がすでに述べる新鮮さ / エスケープの証明義務であって、[ADR-76](../../adr/76-effect-modeling-freeze-dup-shape-preservation/)の`dup` / `clone`の扱いが確保の証人となる。

Ruby固有の緊張: **メモ化イディオム**`@x ||= compute`は`mutate.self`なので、`pure`と宣言されたメモ化リーダーは発見である。それが真実の答えであり（書き込みは`instance_variable_get`・`inspect`・スレッドのインターリーブを通じて観測可能）、コンストラクタでの自身のプロパティ初期化だけを許容するSteinsと一致する。メモ化されたメソッドは`%a{rigor:v1:effect mutate.self}`を宣言する——またはプロジェクトがポリシーで`mutate.self`を許容する——のであって、チェッカーが推測するのではない。オーナーに対して未決（§13）。

### 5.3ディスパッチ: `final`がないので、自己呼び出しは権威的ではない

Steinsはfinal / privateのガードの下で`$this->`のエッジを引く。Rubyには`final`がない;すべてのメソッドはオーバーライド可能で、すべてのクラスは再オープン可能だ。3つの帰結:

- **自己呼び出しはプロジェクトを閉世界として解決する**。`Rigor::Inference::ScopeIndexer`の発見テーブルはすべてのプロジェクト定義とすべてのサブクラスを知っている;ADR-57のN5ゲートはすでに、サブクラスがメソッドを再定義する基底本体を劣化させる。エフェクトのエッジについての推奨は、汚染ではなく**プロジェクトが知るすべてのオーバーライドを結合する**（呼び出し元のサマリーは基底本体とプロジェクト内の各オーバーライド上の和）——Rigorが型に対して取るのと同じ閉世界の姿勢だ。クラスが未知のレシーバーは依然として汚染する。
- **再オープン**: プロジェクト内の1つの`Class#method`の複数の`def` → それらのサマリーの和（静的に健全;実行時の最後勝ちは解析時に知りえない）。コアメソッドをモンキーパッチする*gem*は、型に対してと同様に不可視——同じクラスの受け入れられたリスク。
- **非リテラルの`send`、レシーバーのクラス上の`method_missing`、`Dynamic[top]`レシーバー、`respond_to?`でガードされたダックタイピング → 汚染**。型付けの薄いコードでは証明レーンは最初は小さいだろう;それが正直な状態であり、レポート（§9.3）が「pure」ではなく「そしておそらくそれ以上」と言うまさにその理由だ。証明レーンはディスパッチ品質とプラグインカバレッジとともに成長する——*診断*のためのADR-102の基準（精度は解析品質の関数）は満たされる。

`rigor trace`の呼び出しサイトごとの`resolved:`ビットと`dynamic_origins`サイドテーブル（`Rigor::Inference::DynamicOrigin`——`external_gem_without_rbs`・`framework_dsl_boundary`…）はすでに、*なぜ*呼び出しが未解決なのかを名指している;汚染は同じ原因を運ぶべきで、そうすればレポートは「おそらくそれ以上——RBSのない`activerecord`からのレシーバー上の`user.save`のため」と言える。

### 5.4ブロック: エフェクト多相はほぼ無償

`array_map`のコールバック問題がPHPの作業を駆動した。Rubyの答えは構造的だ: コールバックはほぼ常に**呼び出しサイトのブロックリテラル**なので、高階呼び出しのエフェクトはカタログの行のエフェクト ∪ リテラルブロック本体のエフェクトであり、エフェクト変数は要らない。帳簿を自明にし「コードが含む」契約を正直に保つ規則: **ブロックリテラルの起点は、呼び出し先がそれを今呼ぼうが、後で呼ぼうが、決して呼ぶまいが、常に囲むメソッドのサマリーに結合される**（エンベロープはメソッドのコードについての契約である）。帰結:

- `xs.map { |x| x * 2 }`——∅。`xs.map { |x| Model.create!(x) }`——`io.db`。`cache.fetch(k) { Model.find(k) }`——`io.db`（証明済み: コードがそれを含む）。
- `yield`する、または`&block`を転送する呼び出し先はyieldについて∅を寄与する;それ自身のサマリーはあるがままだ。*ユーザー*のサマリーには`block_dependent`状態は不要;カタログの`block_dependent`行は単に「行からは∅、リテラルからは封じ込め」である。
- 不透明な呼び出し可能オブジェクトは汚染する: ivar上の`Proc#call` / ラムダのハッシュ / `Method`オブジェクト、呼び出し可能オブジェクトがリテラルでない`&callable`、要素型が未知の`&:sym`。既知の要素型上の`&:sym`は通常のエッジ。
- リテラル名の`define_method(:name) { … }`はブロックを`name`のサマリーに付ける（§5.1）。`Thread.new { }`・`at_exit { }`・`Ractor.new { }`は封じ込め。

`ClosureEscapeAnalyzer`（非エスケープ対エスケープ対未知）はこれによって手を触れられない: それは*ファクトの保持*の問いに答えるのであって、「コードが含むか」の問いではない。そのファイルはすでに、カタログがRBSへ移る日のために「RBS-Extendedの呼び出しタイミングエフェクト」の席を予約している。

### 5.5クラス本体、例外、並行性

- クラス本体の文（`has_many :posts`・`validates …`・ファイル先頭の`require`）はロード時に実行される;v1は`def` / `define_method`本体のみをサマリーする。ロード時のエフェクトは後の、別の単位（Steinsの用語で「ファイルレベルのコード」）。ビューテンプレートはそのバケットには*入らない*: メソッドにコンパイルされ、§11.3で自身の単位になる。
- 例外はラベルではない（§2）。throw集合が重要な場所——破棄規則（§8.4）——ではカタログの`raises`ファセットが代役だ。
- 並行性プリミティブはv1ではラベルを運ばない;ブロックは封じ込めで結合する。`concurrent`ルートは、消費者が必要とするまで意図的に提案しない。

## 6. 宣言サーフェス——Ruby的な答え

前提: **新しい文法はなし**。Rigorはすでに4つの作者サーフェスを読む;エフェクトエンベロープはそれらに乗り、「宣言なし」から「メソッドごと」までの固定された優先順で。

### 6.1何もない——推論が既定

すべてのメソッドはサマリーを得る。レポート（§9.3）、コミットされたエフェクトスナップショットとそのドリフトゲート（§9.4）、そしてエンジンの消費者（§8）は宣言を必要としない。これはほとんどのメソッドが住むサーフェスであり——スナップショットとともに、単に観測されるだけでなく*検証される*サーフェスである——非目標「すべてのクラス / メソッドにコメントする」への設計の答えだ。

### 6.2規約: 名前空間 / パスによるエンベロープ（`.rigor.yml`）

Rails流の設定より規約が、「プレゼンターはクエリしない」を言うRubyのやり方だ:

```yaml
effects:
  envelopes:
    - match: "app/presenters/**/*.rb"     # File.fnmatch, project-relative — the ADR-28 shape
      effect: []                            # pure
    - namespace: "Policies::*"
      effect: [mutate.local]
    - namespace: "App::Models::*"
      effect: [io.db, nondet.time, mutate]
    - match: "app/jobs/**/*.rb"
      effect: [io]
```

エントリーは、マッチするすべてのクラスのすべてのメソッドにエンベロープを付け、クラスレベルのアノテーションとまったく同じように分配する（最近接優先: メソッドごとのアノテーションがそれをオーバーライドする）。これは既存の[ADR-28](../../adr/28-path-scoped-protocol-contracts/)のパススコープ契約の形——`ProtocolContract`はすでに`path_glob`によってメソッドごとの契約を重大度付きでクラスに束縛する——をプラグインマニフェストのフィールドからプロジェクト設定キーへ持ち上げたものだ。これはまた、RBSを書かないプロジェクトに*初日から価値*を与える唯一のサーフェスである: 1つのスタンザがアーキテクチャの層全体をチェックする。

設定キーは[ADR-99](../../adr/99-config-schema-authority/)の2つの信頼できる情報源の規則（`Configuration::DEFAULTS` + `schemas/rigor-config.schema.json`）と[config.md](../../internal-spec/config/)の予約パイプラインの対象である;`effects:`ブロックはADR-45の実行キャッシュ同一性に加わる（§10）。

### 6.3 `%a{pure}`——エコシステムの既存の純粋性の綴り

RBSにはすでに野生の純粋性アノテーションがある: **`%a{pure}`**。Steepはそのようにアノテートされたメソッドを、その呼び出し式をナローイングし記憶できる*純粋メソッド*として扱う（[Steep doc/narrowing.md §型環境](https://github.com/soutaro/steep/blob/master/doc/narrowing.md)）;rbs coreはそれを運び（`Regexp#timeout`）、rbsとSteep自身の`sig/`はどちらもそれを使う。Rigorはすでに1つのrbsネイティブなアノテーション（`%a{implicitly-returns-nil}`）を尊重している。したがって`%a{pure}`は、`@phpstan-pure`がPHPにとってそうであるようにRubyにとっての相互運用の綴りであり、Rigorは:

- `%a{pure}`を空のエンベロープ（`{mutate.local}`）として**読む**べきだ。Steinsが素の`@phpstan-pure`に与えるまさにその読み;そして
- 網羅的な証明済み推論から`rigor sig-gen`を通じてそれを**書き戻す**べきだ（§12 WD6）。これはSteepユーザーに無償でより良いナローイングを渡す——PHP側にはないツール横断のリターン。

`%a{pure}`は既存なので、すでにそれを運んでいるプロジェクトにとってその採用は*意味的な移行*である（RFCの「後方互換性——2つの主張」）: その*チェック*はエフェクトのオプトインの背後で出荷され、静かな既定サーフェスでは決してされない。

### 6.4 `%a{rigor:v1:effect …}`と`%a{rigor:v1:pure}`——RBS内のラベル付きの綴り

Rigorのチェックされる綴りは、他のディレクティブが住む場所——RBSのメソッドおよびクラス宣言——に住む:

```ruby
class UserRepository
  %a{rigor:v1:effect io.db}
  def find: (Integer) -> User

  %a{rigor:v1:pure}
  def slug: (String) -> String
end

%a{rigor:v1:effect io.net.http, telemetry}      # class-level: distributes, nearest-wins
class MailerGateway
  # …
end
```

文法はRFCの`label-list`（`label { "," label }`、`segment = [a-z][a-z0-9]*`）に`rigor:v1:`のヘッド;`rigor:v1:pure`はラベルを取らない（control-flow-analysis.mdで仕様化されたディレクティブがついに実装される）。機械的には`Rigor::RbsExtended`内の4番目の正規表現 / リーダー対（ディレクティブレジストリはない——[rbs_extended.rb](https://github.com/rigortype/rigor/blob/master/lib/rigor/rbs_extended.rb)）、`RbsLoader#each_class_decl_annotation_with_name`（`conforms-to` / HKTの経路）を通じたクラスレベルのリーダー、そして`Rigor::FlowContribution`上の新しい**`effects`**スロット。これによりプラグインとアノテーションは、すでにprovenanceを順序づける唯一のマージャー（`builtin > rbs_extended = generated > plugin`）を通じて呼び出しエッジでラベルを帰属させる;バンドルの`mutations`スロット——宣言され、「`pure`風の宣言との競合は診断である」と文書化され、**今日はどのプロデューサーにも供給されていない**——がついにそのプロデューサーを得る。スロットの追加はADR-2の公開API拡張である（[flow-contribution.md §安定性](../../internal-spec/flow-contribution/)）。

1つの宣言上の`pure` + `effect`は矛盾する: `pure`が勝ち（Steins）、既存の`RbsExtended::Reporter`の競合チャネルがそれを報告する。

### 6.5 rbs-inline経由での`.rb`ファイル内の同じアノテーション

`# @rbs %a{…}`はファーストクラスのrbs-inlineアノテーション形式（ADR-32の文法リスト）であり、`RbsExtended`への経路はエンドツーエンドで途切れていない: rbs-inlineのライターは生成されたメンバー上に`%a{}`を出力し、`Environment.collect_virtual_rbs`がテキストをマージし、メソッドアノテーションは`RBS::Definition::Method#annotations`——すべてのメソッドディレクティブが読むのと同じオブジェクト——に到達する。[ADR-93](../../adr/93-default-rbs-inline-ingestion/)が既定でインラインコメントを取り込むので、これはすでに今日動作する。文書化もテストもされていないが:

```ruby
# @rbs %a{pure}
def slug(s) = s.strip.downcase.tr(" ", "-")

# @rbs %a{rigor:v1:effect io.db}
def find(id) = User.find(id)
```

2つのファクトが互いに引っ張り合い、オーナーが選ばねばならない（§13）: ハンドブックは「`.rb`ファイル内に`%a{rigor:v1:…}`ディレクティブを置くことはできない——それは設計上の選択である」と述べており（[07-rbs-and-extended.md](../../handbook/07-rbs-and-extended/)）、ADR-0の「アプリケーションコードはRigor専用のアノテーション構文を含まないままである」を反響させている;それに対して、`%a{}`は*rbs-inlineの*上流文法であり、Steepは未知のアノテーションを許容し、ADR-0の拘束力ある文はアノテーションを*要求すること*を禁じており、許可することを禁じてはいない。推奨: `.rb`内で`%a{pure}`を無条件に許可し（エコシステム中立）、`%a{rigor:v1:effect …}`もそこで許可し、ハンドブックの文を修正する——禁じることは作者を`# rigor:effect`のコメント方言を発明する方向へ押しやり、それは厳密に悪いからだ。**提案されない**もの: 新しい`# rigor:`ディレクティブ（そのファミリーは抑制専用のまま: `disable` / `disable-file`）、ファイルレベルのマジックコメント、あらゆるランタイムDSL。

### 6.6サードパーティの帰属: プラグインとプロジェクト

gemのメソッドにはRigorが解析する本体がないので、誰かがそれに色を付けなければならない。信頼の異なる2つのチャネル（§7）:

- **プラグインがRBSアノテーションを**その`signature_paths:`で出荷する——プラグインの`.rbs`はすでに同じ環境にロードされ、`%a{rigor:v1:…}`を運んでよい（rigor-typescript-utility-typesは`return:`についてまさにこれをしている）。rigor-railsは`find`を`io.db.read`、`save`を`io.db.write`、`deliver_now`を`io` + `rails.actionmailer.deliver` + `email.send`、`Rails.logger`を`io` + `telemetry`、`Time.current`を`nondet.time`、`perform_later`を`io` + `rails.activejob.enqueue` + `job.enqueue`に色付けする——完全な表は§11.2。権威ティア1で入る。
- **プラグインマニフェストのフィールド`effect_attributions:`**（`ProtocolContract`の形をしたRubyの値: レシーバー、メソッド、ラベル）または、誰もプラグインを書いていないgemのためのプロジェクト自身の**`effects.attribution:`** YAML表。どちらもRigorが解析しなかったコードについての未チェックの主張だ。フレームワークプラグインも、RBSがアプリごとに名指せないメソッド——関連リーダー、`find_by_*`、コールバックエッジ——のためにこのチャネルを必要とし、そこでは知識はアプリ自身のクラス本体から導出される（§11.2「フレームワークエッジ」）。
- **語彙の登録**: 設定内の`effects.labels: [email.send, telemetry]`;プラグインのマニフェストは自身が所有するルートの下にラベルを登録する（Steins ADR-0068のルート所有権: コアルートから降りるか、プラグインidと等しいルートを開く）——プロジェクト自身の設定は任意のルートを開いてよい（所有者の列挙が保証行為である）。

### 6.7意図的にサーフェスにしないもの

Sorbetの`sig {}`（そこに純粋性はない）、YARDタグ、ランタイムの`Rigor.pure def …`デコレータ、`# frozen_string_literal`風のファイルプラグマ、暗黙の純粋性主張としての`Data.define`/`Struct`メンバーシップ、そして*宣言*としてのbang規約（`save!`と`save`はどちらもデータベースを叩く;規約は「raiseする」または「その場で変更する」を言うのであって、「エフェクトなし」ではない）。bang規約は§8.4で*メッセージ*の補助として再登場する。

## 7. 信頼とレーン

Rigorはすでにファクトのソースをランク付けしている——`FlowContribution::Merger`の権威ティア（`builtin(0) > rbs_extended(1) = generated(1) > plugin(2) > other(3)`）、ADR-10のディスパッチャーの順序（`core RBS > RBS::Extended > plugins > dependency-source inference`）、そして権威的なソースを名指す純粋性ポリシーの文（「Rigorとともに配布されるコアRubyと標準ライブラリのRBS、受け入れられた通常のRBSファイル、または明示的な`rigor:v1:pure`」）。エフェクトエンベロープは新しい「層」概念ではなくその階梯を再利用する:

| ラベルのソース | 呼び出しサイトでのレーン | サイトの汚染を解消するか？ | 宣言で契約チェックされるか？ | オーバーライドをまたいでLiskovか？ |
| --- | --- | --- | --- | --- |
| Rigorのエフェクトカタログ（`data/effects/*.yml`）、言語構文 | 証明 | ——（それ*が*証明である） | —— | —— |
| プロジェクト本体、推移的に | 証明 | —— | —— | —— |
| プロジェクトの`%a{rigor:v1:effect}` / `%a{rigor:v1:pure}` / `%a{pure}`（RBSまたはインライン）、設定の`envelopes:`——**チェック済み層** | 具体的な呼び出し先が未知の場所で宣言（`≤`） | **はい**——本体は解析され、`effect.envelope-exceeded`がそれを境界に拘束する | はい | はい（`effect.liskov-widened`） |
| `%a{}`を運ぶgem出荷のRBSまたはRigorのバンドル済みオーバーレイ（`data/gem_overlay`・`data/vendored_gem_sigs`）——受け入れられたシグネチャ | 宣言 | はい——その*型*とADR-1:430によるその純粋性にすでに拡張されているのと同じ信頼 | チェックすべき本体がない | いいえ |
| プラグインの`signature_paths:` RBSアノテーション（ファーストパーティのプラグインはここに住む） | 宣言 | はい（ティア1） | いいえ | いいえ |
| **ファーストパーティのバンドル済み**プラグインの`effect_attributions:` / アプリ自身のクラス本体から導出されたフレームワークエッジ（rigor-rails、§11.2） | 宣言 / 証明されたエッジ | はい——リポジトリ自身の`make check-plugins`ゲートで監査され、知識はサードパーティの主張ではなくプロジェクトの宣言である（決定、§13） | いいえ | いいえ |
| サードパーティプラグインの`effect_attributions:` / プロジェクトの`effects.attribution:` | 宣言 | **いいえ**——解析されないコードについての主張を何もチェックしない（Steins ADR-0068 §1）;「これを宣言した、そしておそらくそれ以上」と読む | いいえ | いいえ |

RFCの二分法（「置換可能性を伴う契約」対「証明のないヒント」）はこう着地する: Rubyの唯一のプロジェクトが著した綴りは置換可能性を伴うチェック済み層であり、Rigorが解析できないコードについてのすべてはヒントである——受け入れられたシグネチャは解消するという実用的な例外を伴って。さもないとあらゆるRailsアプリのメソッドが永遠に非網羅的になり、ビットが情報を運ばなくなるからだ。プラグイン作者はマニフェスト表よりRBSアノテーションを選ぶことで自身の層を選ぶ。

宣言レーンの*キャリア*が、Rubyが本当に遅れている場所だ: RBSのインターフェース型は今日`Dynamic[top]`へ消去され（`rbs_type_translator.rb`）、構造的インターフェースのキャリアがないので、「インターフェース型のレシーバーを通じた呼び出しはインターフェースの境界をインポートする」には付ける先がない。RubyネイティブのDIの形は代わりに名前的だ——`class PgRepo < Repo`・`ApplicationService#call`・`ApplicationJob#perform`——そしてADR-57のN5オーバーライド可能メソッドゲートは、エンベロープを持つ基底メソッドが肩をすくめる代わりに`≤ bound`を寄与すべき*まさに*その点である。インターフェースは構造的キャリアが着地したときに加わる（[structural-interfaces-and-object-shapes.md](../../type-specification/structural-interfaces-and-object-shapes/)）。

## 8. エンジンの消費者——なぜアノテーション1つなしに元が取れるか

コーパスはすでに一度純粋性について裁定している: PHPStanルールの再調査（[20260715-phpstan-rules-survey-rigor-reevaluation.md](../../notes/20260715-phpstan-rules-survey-rigor-reevaluation/)）は*推論による純粋性*のエフェクトなし文ルールを高FPとして却下し（「Rubyの純粋性は本質的に静的に知りえない: メモ化するivar書き込み、モンキーパッチ、C実装」）、アノテーションでゲートされたmust-useと「畳み込みカタログに限定された狭い断片」だけを認めた。2レーンモデルはその判定への矛盾ではなく、各反論への答えだ: メモ化するivar書き込みは`mutate.self`で可視;プロジェクトのモンキーパッチはプロジェクト本体;C実装はカタログの行または汚染;そして以下のすべての判断は証明レーンを読み、重要な場所では網羅ビットを読む。

1. **自己呼び出しをまたいだivarナローイングの生存（B2.2）**。`return unless @user; audit!; @user.name`——今日は`audit!`の呼び出しが`@user`の非nilナローイングをリセットする。`audit!`の証明済みサマリーが`mutate.self`を欠き網羅的であれば、リセットはスキップできる: 偽の`call.possible-nil-receiver`の発火が減り、アノテーションなし。これは*型付け*の消費者なので`rigor check`の出力を変え、bleeding-edgeのキャッシュ同一性の制約（§9.2）を尊重しなければならない。
2. **純粋性ポリシーの「計算された純粋性の性質」**——control-flow-analysis.md §純粋性ポリシーは、再呼び出しをまたいで呼び出し結果を記憶するために宣言された純粋性だけを信頼する（`if x.foo && x.foo.bar`）;GitLabの裁定はそのコストを記録した（「繰り返し呼び出しをまたぐレシーバー純粋性 / メモ化の追跡なし」、[20260708-gitlab-diagnostic-adjudication.md:52](../../notes/20260708-gitlab-diagnostic-adjudication/)）。`{mutate.local}`の外に何もない証明済みで網羅的なサマリーは、RBSのないユーザーメソッドについての計算された純粋性のファクトだ: その結果は再呼び出しをまたいで記憶してよい。`global.read`のみのサマリーは介在する`global.write` / `mutate.static`まで記憶してよい;`nondet.*`のサマリーは決して不可。そして無効化*バケット*はラベルキーになる: 証明済みラベルが`mutate.self`を除外する呼び出しはレシーバーのオブジェクト内容バケットに触れられたはずがない;`mutate.static` / `global.write`を除外するものはグローバルストレージに触れられたはずがない——RFCの「無効化キー」。
3. 手選りの`FOLDABLE_PURITIES`ゲートではなく**計算された性質としての定数畳み込みの許可**（Steins ADR-0008「畳み込みはエフェクトでゲートされる」）——後のスライス;許可リストはカタログが同じ基準まで監査されるまで残る。
4. **discarded-pure-resultルール**——Rubyの非bangの足元の銃: `str.strip`・`arr.sort`・`hash.merge(x: 1)`・`params.merge!`対`merge`・`each`として使われる`list.map { … }`。アノテーションなしで導出可能: 読み取りの形をした集合（`global.read`・`nondet.*`・`io.fs.read`）内の証明済みエフェクト、網羅的、結果未使用。2つのRuby固有のゲートがそれを正直に保つ: (a) *検証としてのraise*イディオム（`hash.fetch(:k)`・`Integer(x)`・`JSON.parse(x)`を意図的に破棄）——Rigorはthrow集合を追跡しないので、カタログの`raises`ファセット / 畳み込みティアの全域性基準がそれをゲートしなければならない;（b）ブロックがエフェクトを持つ`map`は死んでいない（封じ込めが扱う）。メッセージはbangの兄弟が存在すればそれを名指せる。コーパスFPゲート待ちで`:off`として出荷（`call.self-undefined-method`のテンプレート）——これは2026-07-15のノートが席を残した「狭い断片」で、今は手書きのリストではなく原則的な境界を伴う。
5. 網羅的な証明済みサマリーのみからの`%a{pure}` / `%a{rigor:v1:effect …}`の**`rigor sig-gen`書き戻し**——非網羅的なメソッドには決して、ポリシーで解消された集合からは決して（Steinsの4つの不変条件;ADR-10 WD7の「日和見的な形は決してラウンドトリップしない」は同じ規則）。ADR-14は明示的にアノテーション出力のスロットを予約している。

## 9. 診断とレポート

### 9.1何が診断で何がレポートか

[ADR-102](../../adr/102-unused-code-reachability-report/)の境界線: 精度がアナライザーの持ちえない知識に上限づけられるシグナルはレポートに属する;精度が解析品質の関数であるものは診断であってよい。**エフェクトフットプリント**（証明 + 宣言 + 網羅ビット）はレポートだ——その未知は世界のもの。**`effect.envelope-exceeded`**は診断だ——作者自身の境界が除外する証明済みの起点でのみ発火し、コーパスの受け入れられた構成の2つによって同時にFPセーフだ: *作者のディレクティブによるオプトイン*（エンベロープがディレクティブ;発見は決して求められていないものではない——`rbs_extended.unsatisfied-conformance`の構成）と*証明されたとおりの厳格さ*（[robustness-principle.md:47](../../type-specification/robustness-principle/)）。`effect.liskov-widened`はADR-35の意味で両側作者だ（祖先の作者によるエンベロープ、オーバーライドの証明済みエフェクト）。`effect.unknown-label`はラベルの意図が明らかな場合にのみ宣言で語彙のドリフトを報告し、決して境界を変えない。

### 9.2ファミリーの形とオプトインの機構

- いかなるidを出荷する前に、[diagnostic-policy.md](../../type-specification/diagnostic-policy/)の分類体系に「執筆時点では」マーカー付きで**`effect.*`**を予約する（ADR-100の規律: まずファミリーの形を固定する）。`RULE_FAMILIES`に`effect`を追加し（`disable:`のタイポが警告するように）、`RuleCatalog`と3つの重大度プロファイル表すべてにエントリーを追加する。
- 重大度: `effect.envelope-exceeded`は作者による`:warning`（`strict`下では`:error`）——決して求められていないものではないので、*新しい*綴りに対してbleeding-edgeゲートを必要としない;**`%a{pure}`の相互運用の読みは意味的な移行**であり、エフェクトのオプトインでゲートされる。`effect.unknown-label`は`:info`、強制とともにオプトイン。`effect.discarded-pure-result`はコーパスゲート待ちですべてのプロファイルで`:off`。
- **キャッシュ同一性**。`BleedingEdge`は、`:behaviour`フィーチャーは解析キャッシュ同一性に畳み込まれない限り`rigor check`の解析出力を変えてはならないと文書化している。サマリー*収集*は`dynamic_origins`の性質（ノードキー、`Scope#==`から除外、型付けに読み戻されない）を持つサイドテーブルであり安全だ;*診断*はサマリーから計算されるプール後の集約;`effects:`設定ブロックはADR-45の実行キャッシュ同一性に入る;§8の（1）〜（3）の型付け消費者がキャッシュ同一性を認識するフィーチャーとして着地しなければならないものだ。
- ベースラインは他のファミリーと同様にこのファミリーを吸収するが、[ADR-50](../../adr/50-release-engineering-and-stability-strategy/) WD1の下では既存の`%a{pure}`に対するチェックは新しい規律であり、オプトインで出荷される。

### 9.3レポートとレビューサーフェス

`rigor effects PATH…`——メソッドごとに: 証明済みラベル、宣言（`≤`）ラベル、網羅ビット、汚染*原因*（dynamic-originの理由）、`--format text|json`;`type-scan`と同じ3ファイルの`*_command` / `*_report` / `*_renderer`の形。`rigor effects --update` / `--check` / `--diff`——コミットされた**エフェクトスナップショット**とそのドリフトゲート、Steinsの`effect-diff`を主たる検証モードへ昇格させたもの;独自の節§9.4を持つ。`rigor effects --at FILE:LINE:COL`——`type-of`の双子、後のエディタホバー用。`rigor effects --follow-enqueues`——遅延ジョブとメーラーを通じた因果クロージャ、レポートのみ（§11.2「遅延実行」）。そして`rigor check --no-tolerated-effects`——§4の監査スイッチ。

### 9.4エンベロープなしで運用する: エフェクトスナップショット

オーナーの求め、率直に述べれば: **コードに何も書かずに**これを走らせる——観測されたエフェクトをファイルに書き出し、コミットし、誰も意図しなかったドリフトを監視し続ける。Steinsはそれをサイドカーレポート（`effect-diff --set-baseline`、常にexit 0）として出荷する。ここではそれが**主たる検証モード**になり、エンベロープはチームが決して踏まないかもしれないオプションの第2ステップになる。

それをネイティブに感じさせるRubyの先例は`db/schema.rb` / `Gemfile.lock`（そして「興味深いものだけを列挙する」の半分については`.rubocop_todo.yml`）だ: コミットする生成されたアーティファクト;プルリクエストでのその差分*が*レビューシグナル;CIはそれが新鮮であることをチェックし;**意図は再生成されたファイルをコミットすることで表現される**のであって、コードにアノテートすることでではない。その社会契約——開発者が再生成し、レビュアーが差分を読み、承認が変更を認める——が「意図しない」が運用上意味するものだ: 自分自身のPRで見ると思っていなかった差分。

**機構**。

- `rigor effects --update`は`.rigor-effects.yml`を書く（設定`effects.snapshot: <path>`;`.rigor-baseline.yml`の兄弟で、パスの扱い以外は何も共有しない——自身のサイドカーに対するSteinsの規則）。
- `rigor effects --check`は再計算し、比較し、*説明付きの*差分を出力し、ドリフトがあれば非ゼロで終了する——ゲートフラグを持つレポートコマンドについての`type-scan --threshold`の先例。**診断を出さず、`rigor check`のストリームに決して入らない**（ADR-102）: 同じツールによる2つの観測間のドリフトは100%精密だ;そのドリフトが*重要か*はレビュアーの判断であり、それがまさにレビューアーティファクトであって発見ではない理由だ。
- `rigor effects --diff [--baseline PATH]`はゲートせずに出力する——ボット内の`--baseline <(git show origin/main:.rigor-effects.yml)`。
- コスト: サマリーはファイルごとのキャッシュに住むので、同じCIジョブ内の`rigor check`の後の`--check`はキャッシュヒットとグラフのみの不動点だ。

**ファイルが記録するもの**——差分が*帰属可能*になるよう選ばれた2つの表:

```yaml
# .rigor-effects.yml — generated by `rigor effects --update`. Commit it; review its diff.
schema: 1
rigor: 0.3.3
vocabulary: 1
config_digest: 3f9a…                     # the effects: block of .rigor.yml
methods:                                 # DIRECT summaries; exhaustive-∅ entries omitted
  PaymentGateway#charge:
    effects: [io.net.http, telemetry]
  OrderService#place:
    effects: [io.db.write, rails.activejob.enqueue, job.enqueue]
    declared: [io.net.http]              # ≤ imported from an envelope at a call site
  Reports::Nightly#perform:
    effects: [io.db.read]
    exhaustive: false
    unresolved: [send]                   # call names, not lines
reach:                                   # TRANSITIVE footprint at entry points
  OrdersController#create:
    effects: [io.db.read, io.db.write, io.net.http, job.enqueue, nondet.time, telemetry]
```

- `methods:`は`Class#method` / `Class.method`でキー付けされ（シンボルであってパス / 行ではない——診断ベースラインが選んだ揺れへの耐性）、**直接**サマリーを保持する: メソッド自身のコード内の起点、ブロックリテラルを含み（§5.4）、加えてカタログ化された / 帰属された呼び出し先からのラベル——だがプロジェクトの呼び出し先からのものではなく、それらはエッジ。意図的に直接であって推移的ではない: エントリーが変わるのは自身の本体、カタログ、または帰属が変わったときだけなので、**スナップショットの差分は同じPRで変更された行に帰属できる**。網羅的で∅のエントリーは省略される（`--full`が列挙する）: ファイルは興味深いものを列挙し、不純に*なる*メソッドは追加されたキーとして現れる。
- `reach:`はエントリーポイントでの**推移的**フットプリントだ——`effects.snapshot.reach:`のglob、rigor-railsのプリセット（コントローラーアクション、`perform`、メーラーメソッド、チャネル）付き、`rigor unused --entry-point`がすでに持つのと同じエントリーポイントの概念。これが§1の「運用上の形」の問いだ。葉の変更はここでファンアウトし、そのファンアウト*が*情報（影響半径）;`--check`はそれをエントリーごとではなく原因ごとに1行で描画する。
- ヘッダーはRigorバージョン、語彙バージョン、`effects:`設定ブロックのダイジェストを運ぶので、Rigorのアップグレードや`tolerated:`の変更は*可視の*再生成イベントだ——Railsアップグレード後の`schema.rb`。決定的な出力（ソートされたキーとラベル、タイムスタンプなし）は、すでに存在するプール = 逐次のマージ規律に乗る。

**差分カテゴリー**——Steinsのイベント語彙を対称にしたもの: `+label` / `-label`（非網羅的な現在側での削除はヘッジして描画される:「おそらくそれ以上」は不在を証明できない）;宣言レーンの`≤+` / `≤-`;**実体化**（宣言 → 証明、1つのイベント、決して削除と追加ではない）;**網羅性の遷移**を独自のカテゴリーとして（誰かが動的な名前の`send`を導入した——一見の価値あり）;`+symbol` / `-symbol`（リネームはフッターで数え、失われたエフェクトとしては決して報告しない;`--check`下では空でないサマリーを持つ新しいシンボルはドリフトで、再生成で承認される）。`--explain`はリーチ変化の背後の最短エッジ経路を出力する——`OrdersController#create → OrderService#place → PaymentGateway#charge → Net::HTTP.post`——不動点はグラフを持っており、これがその対価を払うレビュー機能だ。

**既定で対称、オプションでラチェット**。`--check`は*あらゆる*ドリフトで失敗する、`schema.rb`モデル: 削除もニュースだ（エンキューをやめたジョブはバグであって改善ではない）。`effects.snapshot.gate: additions`はPHPStanのベースライン風のラチェットを与え、成長だけが失敗する。名詞について: このリポジトリで*ベースライン*はADR-22の抑制ファイルだ——既知の発見を隠し、新しいものだけが表面化する。スナップショットは何も隠さずドリフトをゲートする;ラチェットモードは2つが出会う場所だ。本ノートは**エフェクトスナップショット**と言い、命名はオーナーに委ねる（§13）。

**ポリシーとスナップショット**。ファイルは*未解消の*集合を記録する（§4の不変条件1: カタログは決して嘘をつかない;`--update --no-tolerated-effects`はバイト同一のファイルを生成しなければならない）;`--check` / `--diff`は判定時に`tolerated:`を参照する——許容されたラベルに限られた変更は`tolerated`として報告され、ゲートを失敗させない（`--strict-tolerated`は失敗させる）。`tolerated:`は同じリポジトリに住むので、ファイルは（コード、カタログ、設定、Rigorバージョン）の純粋関数であり、ポリシーの変更は記録ではなく設定の差分になる。

**ワークフロー、エンドツーエンド**。初日: `rigor effects --update`、コミット——チームは最初の地図を得る（「どのコントローラーがネットワークに到達するか、どのジョブが書くか、どのプレゼンターがクエリするか」）。プルリクエスト: 変更がサマリーを変える → CIの`--check`が説明付きの3行で失敗 → 開発者が`--update`を走らせてコミット → レビュアーがPRの差分で`PaymentGateway#charge + io.net.http`と`reach OrdersController#create + io.net.http via OrderService#place`を読む——そして頷くか押し返す。バンドル更新のPR: コード差分なしでリーチが変わる（プラグインの帰属が動いた、またはRigorのカタログが育った）——可視で、再生成のコミットが期待される。まさにSteinsが名指すケース（「リファクタがエフェクトを足したか除いたか」——依存関係のバンプは他の誰かが行ったリファクタだ）。時間とともに、アーキテクチャの層についての安定した観測は述べられた境界へ**昇格**できる——`rigor effects --promote "Presenters::*"`は観測された集合から`effects.envelopes`スタンザ（§6.2）を書く——ので、スナップショットはオンランプであり、エンベロープはチームが「以前どおり」ではなく「決して」を望む*場合に*層が着地する場所だ。ほとんどのプロジェクトは合理的にスナップショットに留まってよい。

**それが何でないか**。`effect.*`診断の抑制ファイルではない（`.rigor-baseline.yml`がそれをする）;エンベロープの*述べられた*意図の代替ではない（スナップショットは「以前どおり」と言い、エンベロープは「決して」と言う）;Rigorが解析しなかったコードの観測ではない（非網羅的なエントリーはそう言い、その遷移はイベントだ）。それはまた、付随的にRigor自身の計測器でもある: Rigorバージョンをまたぐ調査コーパスのスナップショットは証明レーンがどう育つかを示す。

**計画への帰結**。スナップショットはサマリー、不動点、レポートだけを必要とする——エンベロープなし、診断なし——ので、`%a{}`（§12）より前の最初のユーザーに見える検証としてWD1に入る。

## 10. Rigor内部のアーキテクチャ

Rigorには今日メソッドレベルの呼び出しグラフがない（`unused`レポートは定数のみ;ADR-46の依存グラフはシンボルタグ付きのファイル→ファイル）が、不動点が必要とするあらゆる部品は存在し、ハウスパターンを持つ:

| 必要なもの | 再利用する既存の部品 |
| --- | --- |
| `def`ごとの構文的な起点 | `StructFoldSafety` / `ScopeIndexer.build_method_assign_effects`の形の純粋なPrism走査（後者はすでにファイルごとの、同一クラス推移的な、巡回ガード付きのエフェクトテーブル——最も近い構造的類似物） |
| 解決された呼び出しエッジ | ディスパッチが決まる唯一の場所——`ExpressionTyper#call_type_for` → `resolve_user_def_with_owner`（`[def_node, owner_class]`）、カタログの行には`MethodDispatcher`のティア;汚染原因は`DynamicOrigin`から |
| メソッドごとのサマリー保存 | `Runner#return_summaries`——すでにインクリメンタルスナップショットにある永続化された`{[path, "Class#method"] => {returns:, effects:}}`テーブル（ADR-84 / ADR-89 WD2）;エフェクトサマリーは兄弟のペイロード（スキーマバンプ） |
| プロジェクト全体の不動点 | ラウンド / マージの決定性の規律（プール = 逐次となる結合的で順序を保つマージ）については`ParameterInferenceCollector`;だがエフェクトの伝播は**有限束**（ラベル ∪ 網羅ビット）上のグラフのみなので、真の不動点への素のワークリスト——cap-3は不要 |
| 走る場所 | forkプール内のファイルごとの型付けの中での収集（`PoolCoordinator#analyze_files`、ファイル結果とともにマーシャルして戻す）;`conforms_to_diagnostics`の隣のプール後の集約スロットでの伝播 + エンベロープチェック（`Runner#assemble_run_diagnostics`）;発見の`discovered_def_sources[class][method]`（`path:line`）への帰属 |
| インクリメンタル実行 | 変更されたファイルは再収集;変更のないファイルのサマリーはスナップショットから;不動点は常に再走する（安価）——したがってエンベロープ診断はファイルごとに決して保存されない |
| 型付け中のオンデマンドサマリー（§8の消費者） | `infer_user_method_return`が使うのと同じ再帰ガード付きのオンデマンド走査（ADR-55のKleene反復、`RECURSION_FIXPOINT_CAP = 3`、`context_tainted?`のメモゲート）: 呼び出し先のエフェクトサマリーは戻り値型を生む走査の副産物;巡回はプール後の不動点がそれを精緻化するまで汚染付きの⊤と読む |

語彙とラベル代数（`subsumes?`、結合、⊤/∅、レジストリ）は1つの小さな純粋モジュール（`Rigor::Effects::Label`）、`Rigor::Effects::Summary`値（`bundles: {origin => labels}`・`declared: Set`・`exhaustive: Bool`・`causes:`——平坦な`proven`集合はバンドルの射影で、ポリシーの解消が起点精密になれるよう起点ごとに保持、§11.2）、`Builtins::MethodCatalog`をミラーするローダーを持つ手で監査された`data/effects/core.yml`カタログ、そして§6.2 / 6.6の設定スキーマ追加。

### 10.1 `rigor check`との共存: オプトイン、オフのときのコスト、オンのときのコスト、1つのキャッシュ

オーナーの制約: 既存の型チェッカーユーザーはこれをオプトインで得て、決してオンにしないユーザーはできるだけゼロに近いコストを払う。4つのコミットメント、それぞれがコピーする既存のパターンとともに。

**1. オフはオフを意味する——スイッチは`.rigor.yml`の`effects:`であり、他にはない**。収集は設定が`effects:`ブロック（任意のキー、`effects: {}`を含む）を運ぶとき、または実行*が*`rigor effects`であるときにのみ走る。特に、プロジェクトのRBS内の`%a{rigor:v1:effect}` / `%a{pure}`の単なる存在は収集をオンに**しない**——アノテーションはプロジェクト全体のコストの崖を作ってはならない——代わりに`rbs.coverage.inline-annotations-unsynthesized`（[ADR-93](../../adr/93-default-rbs-inline-ingestion/) WD3）の形の`:info`の残余を得る:「エフェクトアノテーションが見つかったが`effects:`は有効ではない;何もそれをチェックしない」。エディタモード（`rigor lsp`）はv1ではエフェクトを走らせない（`effects.lsp: false`を予約）。

**2. オフのときのコスト: 整数読み取り1回**。コレクターは`Rigor::Analysis::DependencyRecorder`の形のレコーダー——無効化された高速パスが素の整数読み取りとなるモジュールレベルの有効化カウント（ADR-46のレコーダーはまさにこのトレードを文書化している: `user_def_for`は「ディスパッチごとのホットパス上にあるので、通常の（非記録の）実行はできるだけ少なく払わなければならない」）、スレッドごとのアキュムレータ、`analyze_file`ごとに有効化されファイル結果とともにマーシャルして戻される。構文的な起点スキャンは、`ScopeIndexer`がすでに行う`def`走査（その`build_method_assign_effects`は今日すべてのivar書き込みを訪問する）に同じフラグの背後で便乗する;オフのとき2回目のPrism走査はない。受け入れ基準は、機能コードが存在しオフの状態で調査コーパスに対して**バイト同一の`rigor check`とノイズ範囲内の実時間**——#379がすでに運ぶゲートを、出力だけでなく時間についても明示したもの。

**3. オンのときのコスト: タイパーがすでに決定したことを記録する;それ以上を決定するよう決して求めない**。レポート / スナップショットモードでは、コレクターはタイパーがいずれにせよ行うディスパッチの決定（`call_type_for` → 解決された所有者または`DynamicOrigin`の原因）を観測し、カタログの行を結合する;そうでなければ走らないオンデマンドのメソッド走査を決して引き起こさず、ディスパッチャーが辞退したものを決して解決せず、`Scope`に決して触れない（`dynamic_origins`の性質を持つサイドテーブル——ノードキー、`Scope#==`から除外、型付けに読み戻されない）。推移的クロージャはプール後のグラフのみの不動点。したがってエフェクトを有効にすると加わるのは: 解決された呼び出しサイトごとの小さな記録1つ、defごとの起点集合1つ、ワーカー→親のマーシャル内のコンパクトなファイルごとのサマリー、そしてコストがO（エッジ × ラベル）の不動点。作業予算は、コーパスのパフォーマンスノートが計測するように#379 / #380で計測される（使い捨ての`GEM_HOME`でのstackprof、RSSについて`RIGOR_DISABLE_YJIT=1`のA/B、プール = 逐次について`make verify-sequential`）: 収集はmastodonで実時間とRSSの≦約5%、不動点はgitlab規模で≦1秒。§8の型付け**消費者**は定義上例外だ——タイパーが決定することを変える——ので別個の、同一性をフォークするフィーチャーである（下記）。ビュー（§11.3）は型付けする本物のファイルを加え、それ自身のオプトイン（`effects.views`）である。

**4. 1つのキャッシュ、2つの同一性、1つの追加スロット**。第2のキャッシュはない。両方の既存ストアはすでに設定全体をダイジェストしている（`IncrementalSnapshot.fingerprint`は`configuration.to_h`をハッシュし、ADR-45の実行キーは`configs`を読む）ので、`effects:`を*追加すること*は、あらゆる設定編集がそうであるように一度無効化する;それ以降、同じ`.rigor.yml`の下の`rigor check`と`rigor effects`はすべてを共有する。その同一性の内側で:

- **診断の同一性**は今日のものだ。収集は観測的（コミットメント3）なので、エフェクトオンで計算されたファイルごとの診断エントリーはエフェクトオフに対して有効であり、その逆も同様。
- **エフェクトの同一性** = 診断の同一性 + 語彙バージョン + カタログバージョン + `effects:`ブロックのダイジェスト（帰属と許容ポリシーは*直接*サマリーと判定を変える）。エフェクトサマリーとエッジはサイドカーペイロード——インクリメンタルスナップショット内の`return_summaries`の隣、そして実行全体キャッシュエントリーの`effect_summaries`セクション——で、収集オンのとき書かれオフのとき無視される。エフェクトスロットが欠落または古いエントリーは**エフェクト消費者に対してのみ**ミスだ: そのファイルは再収集し、診断スロットは手つかず。したがって同じジョブ内の`rigor check`の後の`rigor effects --check`はウォームヒットと不動点;語彙をバンプするRigorのアップグレードはエフェクトスロットを無効化し、診断は無効化しない（そのバージョンバンプがいずれにせよ無効化する）。
- **型付け消費者は同一性をフォークする**。B2.2のivarリセットのスキップ、計算された純粋性、畳み込みゲートは`rigor check`の出力を変えるので、それぞれがそのidを解析キャッシュ同一性に畳み込まれるフィーチャーとして着地する——`lib/rigor/bleeding_edge.rb`に述べられた`BleedingEdge`の`:behaviour`制約——収集がオンであることの副作用としてでは決してなく。消費者付きエフェクトのプロジェクトと消費者なしのプロジェクトは単に異なる同一性を持ち、それはbleeding-edgeのプロジェクトがすでにそうであるとおりだ。
- エンベロープ診断とスナップショットは毎回の実行でサマリーから計算され（WD12）、実行全体のエントリーに住み、決してファイルごとではない。

**失敗の隔離**。コレクターはforkプールと同様にフェイルソフトだ: その内側の例外はそのファイルのサマリーを落とし、そのメソッドを`collector-error`原因付きの非網羅的とマークし、`rigor check`を決して変えず失敗させない。

**既存ユーザーがアップグレードで見るもの:**何もない。新しい診断なし（ファミリーは予約済みでオプトイン）、新しいファイルなし、同じキャッシュ同一性、バイト同一の出力;`rigor doctor` / `rigor next-steps`は`rigor effects --update`を*提案*してよく、それがADR-73が機能を表面化させる方法だ。

## 11. 語彙v1

### 11.1共有レジストリ

レジストリはSteinsのv1集合をそのまま——`exit ffi global.read global.write io io.db io.fs io.fs.read io.fs.write io.input io.ipc io.net io.net.http io.output io.output.buffer io.output.header io.output.stdout io.output.stderr io.process io.signal mutate mutate.local nondet nondet.random nondet.time`——加えてRubyの提案する葉`mutate.self mutate.arg mutate.static`。`io.output.buffer` / `io.output.header`は登録されたままだが生成されない（Rubyには出力バッファ層がない;最も近い類似物である`$stdout`の再代入は将来のマスキングの問い）。

3つの層がその上に座り、Steinsの「トランスポートのファクトと意味のファクト」に従う（`io.net.http`は機構を、`sendgrid.mail.send`はプロバイダの操作を、`email.send`はアプリケーションの意味を記録する——「これらのラベルは共存する」）:

- **共有の追加としてSteinsに提案する価値のあるコアの葉**。両エコシステムが生成でき、それらを名指すポリシーが移植されるべきだから: `io.db.read`・`io.db.write`・`io.db.transaction`（PDO / ActiveRecordを通じた`SELECT`はどちらの言語が発行しても読み取り;マイグレーションや`INSERT`は書き込み;`BEGIN`/`COMMIT`はどちらでもない）。葉の追加は§4の規則により進化安全だ——宣言された`io.db`は3つすべてを認める。
- **アプリケーション意味のルート、小さく共有**: `telemetry`（ロガー、エラーレポーター、計装）、`email.send`、`job.enqueue`、`cache.read` / `cache.write`。これらはポリシーが実際に名指すラベル（「プレゼンターはジョブをエンキューしない」）であり、解消ポリシーが掴むもの（`tolerated: [telemetry]`）なので、SteinsとRigorで同じに綴らねばならない。今日Steinsは`email.send`を*プロジェクト*ラベルの例として扱う;一握りを共有レジストリへ昇格させることはそこで提起すべき提案だ。
- **フレームワークルート、フレームワークをモデル化するプラグインが所有**: rigor-railsなら`rails.*`。Rigorのプラグインidに適応させたSteins ADR-0068のルート所有権規則による（ファーストパーティのプラグインはモデル化するフレームワークのルートを開く;サードパーティのプラグインは自身のプラグインidと等しいルートを開く;プロジェクトの設定は任意のルートを開いてよい）。プロジェクトは依然として自身のものを開く（`acme.cache`）。

### 11.2 Railsの語彙

Railsがフレームワーク層がその場所を稼ぐ理由だ: **ほとんどのRailsの機能ではトランスポートはアダプタ依存であり、したがって静的に知りえない一方、フレームワークの操作は固定されている**。`perform_later`はSidekiq下ではRedis書き込み、`:async`下ではプロセス内スレッド、`:test`下では何もない;`Rails.cache`はメモリ、Redis、またはファイルシステム;`deliver_now`はSMTPまたはテストダブル;ActiveStorageはディスクまたはS3。それぞれの健全なトランスポート行は素の`io`だ——真であるがポリシーには無用。`rails.activejob.enqueue`はレビュアーが意味することを言う。両方のラベルが帰属される;トランスポートはサマリーを正直に保ち、フレームワークラベルはそれを実行可能にする。

提案する行（rigor-railsが`rails.*`を所有;トランスポートラベルは共有レジストリに乗る;すべての行は上界）:

| Railsの機能 | トランスポート | フレームワーク / 意味 |
| --- | --- | --- |
| ARの即時読み取り——`find`・`find_by`・`first`・`last`・`take`・`exists?`・`count`・`sum`・`pluck`・`pick`・`find_each`・`load`・`to_a`・`each`・`reload`;`belongs_to` / `has_one`リーダー;`find_by_sql` | `io.db.read`（`reload`には+ `mutate.self`） | —— |
| ARの書き込み——`save`・`save!`・`create`・`update`・`update!`・`destroy`・`delete`・`touch`・`increment!`・`insert_all`・`upsert_all`・`update_all`・`delete_all`・`update_columns`;`has_many`の`<<` / `create` / `destroy` | `io.db.write` | —— |
| `transaction { }`・`with_lock` | `io.db.transaction` + 封じ込め | —— |
| `connection.execute(sql)`・`exec_query`・`select_all` | リテラルSQL動詞が絞る: `SELECT` → `io.db.read`、`INSERT` / `UPDATE` / `DELETE` / DDL → `io.db.write`;未知 → `io.db` | §4の引数依存のナローイング、SQL向け |
| `change` / `up` / `down`内のマイグレーションDSL（`create_table`・`add_column`…） | `io.db.write` | `rails.schema.write` |
| Relation**ビルダー**——`where`・`joins`・`includes`・`preload`・`order`・`select`・`limit`・`scope`本体・`has_many`リーダー・`association.build` | ∅——遅延、何も発行されない | 下の遅延性の注記を参照 |
| `Rails.cache.read` / `fetch` / `exist?`;`.write` / `delete` / `increment` / `clear` | `io` | `cache.read` / `cache.write`（`fetch`ブロックには+ 封じ込め） |
| `perform_later`・`set(wait:).perform_later`・`perform_all_later`・`enqueue` | `io` | `rails.activejob.enqueue`・`job.enqueue` |
| `perform_now` | ジョブの`perform`への**エッジ** | —— |
| `UserMailer.welcome(u)` → `deliver_now` / `deliver_later` | `io`（`later`には+ エンキュー） | `rails.actionmailer.deliver`・`email.send`;メーラーメソッド本体はエッジ |
| ActiveStorageの`attach`・`upload`・`download`・`purge`・`open` | `io` + 添付レコードには`io.db.write` | `rails.activestorage.write` / `.read` |
| ActionCableの`broadcast_to`・`ActionCable.server.broadcast`・Turboの`broadcast_*` | `io` | `rails.actioncable.broadcast` |
| `Rails.logger.*`・`logger.*`・`Rails.error.report` / `handle`・`ActiveSupport::Notifications.instrument` | `io`（宛先不明） | `telemetry`;`instrument`は汚染を保つ——サブスクライバーは任意 |
| コントローラーの応答——`render`・`render_to_string`・`redirect_to`・`head`・`send_data`・`send_file`・`response.headers[]=` | `mutate.self`（`send_file`は`io.fs.read`も）;`render`はテンプレートが解析されない間は汚染を保つ——§11.3が着地すればテンプレート単位へのエッジ | `rails.response.write` |
| `session[]=`・`reset_session`;`session[]`読み取り | `mutate` / `io`（ストアはキャッシュまたはデータベースかもしれない） | `rails.session.write` / `.read` |
| `cookies[]=`・`cookies.encrypted[]=`・`flash[]=`・`flash.now[]=` | `mutate` | `rails.cookie.write`・`rails.flash.write` |
| `Current.attr`の読み取り / 書き込み（`ActiveSupport::CurrentAttributes`） | `global.read` / `global.write`（ファイバーローカルストレージ） | `rails.current.read` / `.write` |
| `Rails.env`・`Rails.configuration.*`・`Rails.application.config.*`・`Rails.root` | `global.read`（可変なプロセス状態——`Rails.env = "test"`は実在する） | `rails.config.read` |
| `Rails.application.credentials.*`・`secrets` | `io.fs.read`（初回アクセス）+ `global.read` | `rails.credentials.read` |
| `I18n.t` / `l`・`I18n.locale=` | `global.read`（ロケール、遅延バックエンドロード）/ `global.write` | `rails.i18n.translate` |
| `Time.current`・`Date.current`・`Time.zone.now`・`n.days.ago` / `from_now`・`Time.zone` | `nondet.time`（ゾーンには+ `global.read`） | ——（ゾーンを見ない`Time.now` / `Date.today`用のオプションの`nondet.time.system`の葉は可能だがlintであり、RuboCop-Railsの`Rails/TimeZone`がすでに所有する） |
| ActiveSupportのcore_ext——`blank?`・`present?`・`presence`・`try`・`to_json` / `as_json`・`deep_dup`・`deep_merge`・inflection・`in?`・`squish`… | ∅——rigor-activesupport-core-extの出荷RBSで一括`%a{pure}` | Railsアプリで最も安価な純粋性の勝ち: これらはナローイングが最も多く目にする述語 |
| `establish_connection`・`Rails.application.reload_routes!`・`Rails.autoloaders.main.reload` | `global.write` / `mutate.static` | —— |
| ルートヘルパー（`*_path`・`*_url`・`url_for`） | ∅（ルート集合の純粋関数;`_url`は`default_url_options`を読む → `global.read`） | —— |

**遅延性**。`where`は`Relation`を構築し何も発行しない;クエリは実体化子で発火する。2つの読みが可能だ: Rails開発者が*考える*ようにビルダーを`io.db.read`に色付けする（「`where`はDBを叩く」）か、ビルダーを∅に、実体化子を`io.db.read`に色付けする。後者がコードが行うことだ。推奨: 真実の読み——スコープを構築して返すプレゼンターは純粋な*コード*を持ち、それを実体化する呼び出し元が読み取りを受け取る;カタログは決して嘘をつかない（§4）。実体化するEnumerableの委譲（`map`・`each`・`any?`・`empty?`・`size`・`present?`・`blank?`・`to_json`）は、Rigorがすでに型付けする（ADR-26）`Relation`レシーバー上の実体化子としてカタログ化される。消費される場所で`io.db.read`になる*値provenance*ラベルを運ぶ返された`Relation`はSteinsの「接続provenanceのエフェクト」の将来の機構であり、「クエリはビューで起きる」への正しい最終的な答えだ。

**フレームワークエッジ**。rigor-railsは構文が知らないことを知っている: `save`はクラス本体の`before_save :normalize` / `validate :check` / `after_commit`のコールバックとバリデータを走らせる（`validates :email, uniqueness: true`は`valid?`と`save`の内側の`io.db.read`）、`perform_now`は`perform`を走らせる、`UserMailer.welcome(u)`は`welcome`を走らせる。したがってプラグインはラベルだけでなく**エッジ**を寄与する——型付けのためにすでに行うのと同じ発見。プラグインがしてはならないのは`perform_later`を`perform`へエッジすることだ（別のプロセス;エンキューがエフェクト）。`render` → テンプレートは*本物の*エッジだ——同期的、プロセス内——テンプレートが単位になった瞬間に（§11.3）;それまでは汚染する。

**遅延実行**。ActiveJobの`set(wait: 1.hour)` / `set(wait_until:)`、ActionMailerの`deliver_later`、`perform_all_later`、`enqueue_after_transaction_commit`（`load_defaults "8.2"`から既定オン）、`after_commit`、delayed_job / `delayed` gemの`object.delay.method`プロキシと`handle_asynchronously`、Sidekiqの`perform_async` / `perform_in`、そしてプロセス内の遅延（`Thread.new`・`Concurrent::Future`・`Async { }`）は1つのファミリーであり、1つの規則がそれをカバーする: **帰属は時計ではなくコードに従う**。4つの帰結——

- *ビルダーは純粋、エンキューがエフェクト。* `set(…)`は`ConfiguredJob`を、`UserMailer.welcome(u)`は遅延`MessageDelivery`を、`x.delay`は`DelayProxy`を返す: ∅、Relationビルダーとまったく同じ。それらに対する`.perform_later` / `.deliver_later` / プロキシされたメソッド呼び出しが`job.enqueue`（+ `rails.activejob.enqueue`）の起点。エンキュー自体をコミット後へ遅延させることは*いつ*を変えるのであって、*誰のコード*かを変えない——呼び出し元のサマリーは不変。
- *遅延された本体へのエッジなし。* `perform`、`deliver_later`下のメーラーメソッド、`.delay`下のプロキシされたメソッドは別のプロセスの別のスタックで走る;呼び出し元のコードはそれらを含まない。`perform_now` / `deliver_now` / `foo_without_delay`は通常のエッジ。
- *プロセス内の遅延は封じ込め。* `Thread.new { }`や`Concurrent::Future.execute { }`のブロックはこのメソッドのコードだ（§5.4）;その起点は、スレッドがいつ走ろうと、証明済みとして結合される。
- *トランスポートはプロジェクトのファクトであり、絞れる。*引数を見なければ`perform_later`は`io`（§11.2）。だがキューアダプタはアプリで一度宣言され（`config.active_job.queue_adapter`）、rigor-railsはそれを読める——引数依存のナローイングの設定レベルの双子: Solid Queue（Rails 8の既定）→ **`io.db.write`**（`solid_queue_jobs`への`INSERT`;「このパスにデータベースなし」のエンベロープが異議を唱えるのは正しい）、Sidekiq / Resque → `io.net`（Redis）、`:async` → ∅トランスポート、`:inline` → 結局`perform`へのエッジ。読まれていない、または環境ごとのアダプタは`io`の行を保つ。`delayed_job` gemはどのように到達されようとデータベースバック（`io.db.write`）。

レビュアーがまた問う問い——「このリクエストの*せいで*何が起きるか、ジョブも含めて？」——は別の関係、**因果クロージャ**であり、レポートに属し、決してエンベロープチェックには属さない: `rigor effects --follow-enqueues`はフットプリントのためだけに`perform_later → perform`と`deliver_later → mailer`のエッジを加えるので、コントローラーアクションは「最終的にメールを送る」と読める一方、そのエンベロープは依然として自身のコードだけを記述する。

**規約プリセット**。rigor-railsは*例示的な*`effects.envelopes`スタンザを出荷できる——決して既定で強制されない——Railsの層規約に合わせて: `app/presenters/**`・`app/serializers/**`・`app/decorators/**` → `[mutate.local, rails.config.read, rails.i18n.translate]`;`app/policies/**` → `[io.db.read, rails.config.read]`;`app/models/**` → `[io.db, mutate, nondet, telemetry, rails.activejob.enqueue, email.send]`（`Net::HTTP`を呼び始めるモデルが報告されるように）;`app/jobs/**` → `[io]`;`app/controllers/**`は無制限;`db/migrate/**` → `[io.db]`;`spec/**` / `test/**`は除外。プロジェクトがそのいずれかを採用するかはプロジェクトの判断だ;`tolerated:`集合（`[telemetry, rails.config.read]`がプロジェクトが書くもっともらしい既定）が、そのようなスタンザを正直だが実行不能にしないものだ。

**フレームワーク層がエンジンに必要とする精度**。`rails.config.read`を許容することは`Rails.env`*から来た*`global.read`を解消しなければならず、同じ本体内の`$foo`からの`global.read`を解消してはならない——Steinsの「トランスポートラベルではなく意味ラベルを許容する…判定がエフェクトがどう到来したかを知ることを要求する」。したがってサマリーは**起点ごとのラベルバンドル**（サイト → ラベル）を保ち、平坦な証明集合は射影である（§10）;意味ラベルが許容されたバンドルは丸ごと解消され、許容されない起点を通じても到来したトランスポートラベルは残る。

### 11.3ビュー——エフェクト単位としてのテンプレート（次のステップ）

Rigorは今日ERBを解析しない。解析すべきであり、エフェクトが始める理由だ: レビューの問い「このリクエストは何をするか」は現在`render`で汚染とともに終わり、ビュー層こそがRailsが誰も意図しなかった副作用を蓄積する場所だ——N+1（ループ内で実体化される遅延Relation）、ヘルパーからの書き込み（パーシャル内の`@user.update(last_seen: …)`）、通貨ヘルパーの背後のHTTP呼び出し、`Time.now`、インラインSVGのための`File.read`、残された`puts` / `binding.pry`、レイアウト内の`session[]=`、ビューから起動されるメーラー。テンプレートをエフェクト単位にすることは、Rigorの通常の型チェックもテンプレートに引き込む（`show.html.erb`内の`@user.nmae`）——エフェクトより大きな賞品であり本ノートのスコープ外だが、シームは共有される。

**テンプレートはすでにRubyのメソッドである**。Railsはすべてのテンプレートをビュークラス上のメソッド（`_app_views_users_show_html_erb___…`）にコンパイルし、ローカルをパラメータに、コントローラーのassignをivarに、ヘルパーをミックスインする;Erubiは行番号をテンプレートと揃えたままにし、それがRailsのバックトレースが`show.html.erb:12`を指せる理由だ。したがってテンプレートは**テンプレートの意味論を発明せずに**解析できる: Railsがするようにコンパイルし、行マップを保ち、結果を宣言された`self`の下の合成メソッドとして解析する。Rigorはかつてそのシームを予約していた——[ADR-16](../../adr/16-macro-expansion/) Tier D、`external_files:`（「本体が宣言された呼び出しサイトに貼り付けられたかのように評価されるファイル、`self`は宣言されたクラスとして型付け」に`bound_ivars:`を加えたもの）、消費者がないため[ADR-60](../../adr/60-pre-freeze-plugin-contract-consolidation/) WD1で除去され「需要ゲート付きで復帰する」。これが需要だ。復活したシームはTier Dが欠いていた1つのものを必要とする: パースに先立つ**行マップ付きのソース変換**。

**単位**。`TemplateUnit(logical_name: "users/show.html", path:, ruby_source:, line_map:, self_type:, locals:, ivar_seeds:)`。プラグイン（rigor-rails、または`rigor-actionview`の分割）が生成し、プールがファイルのように解析し、その位置はレポート・スナップショット・あらゆる診断のために`line_map`を通じて写像し戻される。その部品と、それぞれがすでに住む場所:

| 部品 | ソース |
| --- | --- |
| ERB → Rubyのコンパイル | 解決できればErubi（すべてのRailsアプリが持つ）——[ADR-93](../../adr/93-default-rbs-inline-ingestion/)のrbs-inline自動配線の姿勢: 決してバンドルせず（[ADR-0](../../adr/0-concept/)のゼロ依存）、存在すれば使う;標準ライブラリの`ERB`がフォールバックコンパイラ。どちらの出力も普通のRuby: `<%= %>`と`<% %>`は式と文になり、テキストはバッファへの追加になる |
| `self`型 | プラグインが合成するコントローラーごとのビュークラス: `ActionView::Base` + `ApplicationHelper` + `UsersHelper`（Railsの`helper :all`既定）+ ルートヘルパー + ActionViewヘルパーサフェス（`render`・`link_to`・`form_with`・`t`・`l`・`cache`・`content_for`・`image_tag`・`turbo_*`…）のためのrigor-railsのRBS |
| ローカル | render箇所の`render partial:, locals:` / `collection:`（rigor-actionpackはすでにrenderのターゲット——`render :symbol`・`"string/path"`・`partial:`——をテンプレートパスへ解決する）;Rails 7.1+の**strict locals**マジックコメント`<%# locals: (user:, size: :md) %>`はRails自身がすでに読むパラメータリストであり、後にrbs-inline風の型注記を置く自然な場所 |
| ivarシード | テンプレートをレンダリングするコントローラーアクション——暗黙のrender（`UsersController#show` → `users/show`）とrigor-actionpackの明示的なrender解決——を、そのアクションとその`before_action`連鎖（rigor-actionpackはフィルタDSLを知る）について`ScopeIndexer`のメソッドごとの確定代入テーブル（`build_method_assign_effects`）を通じて読む;フォールバックはコントローラークラスのivarの和（ADR-58のシード）;未知 → `Dynamic`、正直に汚染 |
| エッジ | `render partial: / layout:` → パーシャル / レイアウトの単位;`yield` / `content_for` → レイアウト ↔ テンプレート（レイアウトが呼び出し元）;ヘルパー → プロジェクトメソッド（それらはメソッド）;コントローラーアクション → そのテンプレート——**本物の**エッジ、同期的でプロセス内、それが§11.2の`render`の汚染を解消するもの |
| 位置とキー | `app/views/users/show.html.erb:12`への行マップ（Erubiは行を保持し、列は保持しない）;スナップショットキー`view:users/show.html`——Railsの論理名にフォーマットを加え、ハンドラは落とすのでERB → Hamlの書き換えはリネームにならない;パーシャルは`view:users/_card.html`;単位ダイジェスト = テンプレートのバイト列 + コンパイラid + 合成バージョン |

**ビュー内のエフェクト起点**。テンプレート自身の出力バッファへの追加はその目的であって起点ではない（それらはビューコンテキスト上の`mutate.self`であり、遍在するノイズになる;因果レポートのためにラベルが望まれるなら、構成上許容される`rails.view.render`）。それ以外はすべて通常の規則に従う: `cache do … end` → `cache.read` + `cache.write` + 封じ込め;`t` → `rails.i18n.translate`;`image_tag` / `asset_path` → `global.read`（マニフェスト）;`current_user` → プロジェクトまたはDeviseのメソッドが行うこと（典型的には`io.db.read` + `rails.session.read`）;関連リーダーと実体化子 → `io.db.read`（§11.2の遅延性）;`form_with` / `link_to` → ∅と封じ込め。

**ビューにとって「意図しない」が意味するもの**はプリセットのエンベロープで、2つの味があり、rigor-railsが提供しプロジェクトが`effects.envelopes`を通じて採用する（またはしない）:

- `views: lenient`——`[mutate.local, io.db.read, cache.read, cache.write, rails.config.read, rails.i18n.translate, rails.session.read, telemetry]`: 読み取りは許可（遅延ロードはRailsの既定）、それ以外はすべて発見。
- `views: strict`——同じものから`io.db.read`を引いたもの: あらゆるデータはコントローラーでロードされる、`strict_loading` / `config.active_record.strict_loading_by_default`の静的な双子。

どちらの下でも、`io.db.write`・`io.net`・`job.enqueue`・`email.send`・モデル上の`mutate`（`@post.title = …`・`@user.update`）・`rails.session.write` / `rails.cookie.write` / `rails.flash.write`・`io.output.stdout`（残された`puts` / `pp`）・`io.input`（`binding.pry`・`debugger`——本番に届くデバッグの残骸）・`io.fs`（インラインSVGの`File.read`、正当だが見る価値あり）・`io.process`・`exit`・`global.write`・`mutate.static`・`nondet.time`（テンプレート内の`Time.now`はキャッシュとタイムゾーンのバグ待ち）がエンベロープの異議の対象だ——そして、オプトインしていようがいまいが、すべてのビュー単位はスナップショットの`methods:`に`view:…`として現れるので、書き始めたテンプレートは無条件にPRの差分に現れる。

**エフェクトの形としてのN+1**。コレクション上の反復メソッドに渡されるブロック内の`io.db.read`起点——`<% @users.each do |u| %> <%= u.posts.count %> <% end %>`——は*ループ内のクエリ*だ。この形は構文的で（`ClosureEscapeAnalyzer`がすでに運ぶ反復カタログ）、起点は§11.2の関連リーダー / 実体化子の行。まず**レポート**カテゴリーとして出荷し（`rigor effects`のビュー節: `query-in-loop`、パス付き）、プリロードのファセットが着地したときにのみ診断になる——コントローラーから`includes(:posts)`のprovenanceを運ぶ`Relation` / コレクション値がループの読み取りを解消する——それまではその精度がアナライザーが持ちうるが持っていない知識に上限づけられるからだ（ADR-102の境界線、診断適格の側で）。

**他のエンジン**。JbuilderはRuby（`json`ローカル;単位は`JbuilderTemplate`レシーバー下のファイル本体）——ほぼ無償。Phlex、そしてRubyで書かれたViewComponentのコンポーネントは通常のクラス——今日すでに解析される。ViewComponentのサイドカー`.html.erb`はコンポーネントの`#call`にコンパイルされ、そのivarはRigorがすでに型付けする——最も行儀の良いテンプレート単位。HamlとSlimは自身の（Templeベースの）コンパイラで行保持オプション付きでRubyにコンパイルされる——同じシーム、gemの解決でゲート。メーラービュー（`app/views/user_mailer/*.text.erb`、rigor-actionmailerがすでに発見する）はrenderエッジを通じてメーラーメソッドのサマリーに加わるので、`email.send`のリーチはメールテンプレートが行うことを含む。

**意図的にスコープ外:** HTML / エスケープ / XSS（`raw`・`html_safe`はセキュリティのレンズであってエフェクトではない）、レンダリングの正しさ、i18nキーの存在（rigor-rails-i18nがそれをする）、JavaScript。

## 12. スライス計画

| スライス | 着地するもの | ゲート |
| --- | --- | --- |
| **WD0** | `CONTEXT.md`の用語;ADR + `docs/type-specification/effect-labels.md`（ラベル、包摂、エンベロープ文法、レーン、未知ラベル規則）+ internal-specの節;diagnostic-policy.mdで`effect.*`を予約 | ドキュメントゲート |
| **WD1** | ラベル代数 + レジストリ;クラスごとの既定姿勢付きの`data/effects/core.yml`シード（Kernel / IO / File / Dir / Process / Time / Random / ENV / グローバル / バッククォート）;構文的起点スキャン;ディスパッチでのエッジ収集;メソッドごとのサマリーの永続化;プール後の不動点;`rigor effects`レポート（text/json）;**エフェクトスナップショット**——`--update` / `--check` / `--diff` / `--explain`、`methods:`（直接）+ `reach:`（エントリーポイント）を持つ`.rigor-effects.yml`、対称ゲート + `gate: additions`（§9.4）。**診断なし**。 | コーパス計測: mastodon / redmine / gitlabでの網羅比率と証明済みラベルの分布;バイト同一の`check`出力;スナップショットの決定性（プール = 逐次、2回の実行がバイト同一） |
| **WD2** | `%a{rigor:v1:effect}` / `%a{rigor:v1:pure}`（RBS + インライン、メソッド + クラス）;オプトインの背後の`%a{pure}`相互運用の読み;`FlowContribution#effects`スロット;`effect.envelope-exceeded`・`effect.unknown-label`;ルールカタログ / 重大度表の配線 | オプトインのみ;機能オフで発火ゼロ |
| **WD3** | ADR-57のN5ゲートでの名前的上位型を通じた宣言レーン;プロジェクトのサブクラスオーバーライド上の`effect.liskov-widened` | 両側作者 |
| **WD4** | `effects.envelopes`（パス / 名前空間の規約）、`effects.attribution`、`effects.labels`、`effects.tolerated` + `--no-tolerated-effects`;プラグインの`effect_attributions:` + フレームワークエッジ;rigor-railsでの§11.2のRails語彙（RBS色付け、`rails.*`ルート、遅延性の行、コールバックエッジ）とrigor-activesupport-core-ext全体の`%a{pure}` | Railsコーパス: `Presenters::*`純粋スタンザが本物のクエリだけを報告;`io.db.read` / `io.db.write` / アプリケーション意味ルートを共有追加としてSteinsに提起 |
| **WD5** | エンジンの消費者: B2.2のivarリセットのスキップ、純粋性ポリシーの計算された純粋性、`effect.discarded-pure-result`（`:off`）——それぞれキャッシュ同一性を認識 | 消費者ごとのコーパスFPゲート |
| **WD6** | 網羅的サマリーからの`rigor sig-gen`の`%a{pure}` / エンベロープ出力;`rigor effects --diff`ベースライン;`--at`プローブ | ラウンドトリップ: 出力されたタグが再チェックでクリーン |
| **WD-V1**（ビュー、§11.3;WD1 + WD4の後） | ソース変換 + 行マップ付きの復活したADR-16 Tier-Dシーム（コア）;Erubi解決可能時 / 標準ライブラリフォールバックによるERB → Ruby;コントローラーごとのビュー`self` + ActionViewヘルパーRBS;render箇所とstrict-localsコメントからのローカル;レンダリングするアクションからのivarシード;render / パーシャル / レイアウトのエッジ（`render`の汚染を解消）;`view:*`スナップショットエントリー;`views: lenient \| strict`プリセット | Railsコーパス: テンプレート単位が新しいFPなしで型付けされる;ビューを含めてスナップショットの決定性が成り立つ |
| **WD-V2** | `query-in-loop`ビューレポート;レイアウト / `content_for`;renderエッジを通じたメーラービュー | レポートの精度のコーパス裁定 |
| **WD-V3** | Jbuilder、ViewComponentサイドカー、Haml / Slim（gemでゲート） | —— |
| 後 | 構造的インターフェースのキャリア、`$stdout`キャプチャのマスキング、補集合の境界、並行性ラベル、精密なポリシーのための意味ラベルの経路記憶、ロード時（クラス本体）の単位、`query-in-loop`を診断にするプリロードのファセット、テンプレート内の型診断（独自のADR） | —— |

## 13. オーナーのための決定

> **解決済み**。項目1〜13は[ADR-103](../../adr/103-effect-labels/) WD1〜WD12によって、実装前の集合はADR-103 WD14（2026-08-17）によって固定され、後者は**異なる箇所では本ノートに優先する**: `mutate`の葉は`mutate.self / instance / static`（`mutate.arg`なし;未知の所有権は証明された`mutate`ではなく汚染する）;`%a{pure}`が唯一の純粋性の綴りで`rigor:v1:pure`は実装されない（別個の相互運用ゲートなし）;エフェクト文法はパーレンで囲んだコメントを取らない;CLIは動詞（`rigor effects update | check | diff | explain`）を使い、終了コード0 / 1 / 64;トップレベルdefは`<toplevel>#m`とキー付け;スナップショットの`methods:`は平坦なラベルリストを示し、合成された既定サマリーを省略;許容されたラベルはその起点全体を解消;`effect.envelope-exceeded`はRubyの`def`に位置づけ;設定内の未知ラベルは`.rigor.yml`で`effect.unknown-label`として表面化。ビューの2項目（18、19）だけが未決で暫定的なまま。

1. **語彙の整合**——共有レジストリとしてSteinsの25をそのまま採用;Rubyの葉`mutate.self / arg / static`をSteins ADR-0055の予約する`mutate.self / instance / static`とどちらかが出荷される前に調整。
2. **`.rb`側の綴り**——`# @rbs %a{rigor:v1:effect …}`を許可する（ハンドブックの述べた設計上の選択を覆す）か、`.rb`を`%a{pure}` + 設定規約に制限するか？§6.5の推奨: 許可し、ハンドブックを修正する。
3. **`%a{pure}`の相互運用**——`{mutate.local}`として読み（Steep互換）、`sig-gen`から書き戻すか？ 推奨: 両方はい、チェックはオプトインでゲート。
4. **解消ポリシー**——受け入れられたシグネチャとプラグインRBSは汚染を解消;マニフェスト / YAMLの帰属は決して（§7）。代替案（Steins厳格: プロジェクト本体とカタログのみが解消）はあらゆるRailsメソッドを非網羅的に保つ。
5. **オープンクラスでの自己呼び出し**——プロジェクトが知るオーバーライド上の閉世界結合（推奨）対汚染。
6. **`require`ファミリー**——`io.fs.read`（+ `mutate.static`？）に色付けし、Rigorは既定の`tolerated:`集合を出荷するか（推奨: 出荷しない;スタンザを文書化する）？ また`sleep` / `Queue#pop` / 並行性プリミティブ。
7. **メモ化**——`pure`下の`@x ||= …`は発見（推奨、Steinsと一致）対`pure`が許容する専用の`mutate.self.memo`の葉。
8. **破棄規則の住処**——`effect.discarded-pure-result`（ラベルから導出）対`flow.*` / `static.*`の住処。
9. **仕様の住処**——`docs/type-specification/effect-labels.md`（ラベル言語は型モデルの振る舞い）+ 収集 / 伝播のためのinternal-specの節、またはinternal-spec文書1つのみ。
10. **命名**——「エフェクトラベル / エフェクトサマリー / エフェクトエンベロープ」を罠のある複合語として、「フローエフェクト」をバンドルに保持;または代わりにバンドルの語彙をリネーム。
11. **Steinsに提起する共有追加**——コアの葉として`io.db.read` / `io.db.write` / `io.db.transaction`、そしてプロジェクトごとではなく共有レジストリ内の小さなアプリケーション意味集合（`telemetry`・`email.send`・`job.enqueue`・`cache.read` / `cache.write`）（§11.1）。
12. **ファーストパーティプラグインの信頼**——rigor-railsのフレームワーク由来の帰属とエッジは汚染を解消するか（推奨: はい、`make check-plugins`でゲートされアプリ自身の宣言から導出される）、決して解消しないプラグイン行に留まるか（Steins厳格）？
13. **Relationの遅延性**——ビルダー∅ / 実体化子`io.db.read`（推奨、真実）対ビルダー`io.db.read`（開発者の考え方）;そして`Rails.env` / `Rails.root`の読み取りは`global.read`（推奨——可変なプロセス状態、ポリシーで許容）か∅か。
14. **スナップショットのレイアウト**——`methods:`を*直接*サマリーとしエントリーポイントで`reach:`（推奨: 差分がPR自身の行に帰属可能なままで、影響半径は重要な場所で示される）対すべてのメソッドの推移的サマリー;既定で網羅的∅エントリーを省略。
15. **ゲートの意味論**——既定で対称の`--check`（`schema.rb`: 削除もニュース）でラチェットオプションとして`gate: additions`、または既定で追加のみ（ベースライン風）;そしてドリフトで非ゼロ終了、これはSteinsの常に0の`effect-diff`から`type-scan --threshold`の先例を根拠に逸脱する。
16. **ファイルの名前と記録**——`.rigor-effects.yml`を*エフェクトスナップショット*と呼ぶ（対*エフェクトベースライン*——このリポジトリで「ベースライン」はADR-22の抑制を意味する）;未解消の集合を記録し判定時に`tolerated:`を適用（推奨、不変条件1）対ポリシーで射影されたビューを書く。
17. **テンプレートコンパイラの依存**——解決できればErubi、標準ライブラリの`ERB`をフォールバックに（推奨;決してバンドルしない、ADR-93の姿勢）対標準ライブラリのみ（コンパイラ1つ、だがRailsの出力の形ではない）対Erubiを要求。
18. **ビュープリセットの既定**——プロジェクトがプリセットを有効にしたとき`views: lenient`（読み取り許可）か`views: strict`（`strict_loading`の姿勢）か;テンプレート内の`nondet.time`が既定で許容されるか。
19. **スナップショット内のビュー**——常に`methods:`に`view:*`として（推奨）;`reach:`にはオプトインでのみ（コントローラーがすでにエントリー;多くの場所からレンダリングされるパーシャルはさもないと重複する）。
20. **`query-in-loop`**——まずレポート、プリロードのファセットの後に診断（推奨）対最初からアドバイザリーの`:info`診断。

## 14. 本ノートが依拠するリポジトリのファクト

2026-08-16にmaster `03dcc73b`に対して集めた;行動する前に検証すること。

- メソッドレベルの呼び出しグラフなし;`rigor unused`は定数のみで、メソッドの到達可能性は#351へ先送り（`docs/adr/102-unused-code-reachability-report.md`）。ADR-46のエッジは`"Class#method"`シンボルタグ付きのファイル→ファイル（`lib/rigor/analysis/dependency_recorder.rb`）。
- 戻り値サマリーは`[path, "Class#method"]`ごとに`effects:`（変更されたパラメータ位置）フィールド付きで永続化: `lib/rigor/analysis/runner.rb`の`#return_summaries`、`lib/rigor/cache/incremental_snapshot.rb`。
- プロジェクト全体の不動点のテンプレート: `lib/rigor/inference/parameter_inference_collector.rb`（`DEFAULT_ROUNDS = 3`、結合的マージ、`resolve_callee`）。汎用の束の不動点: `lib/rigor/inference/body_fixpoint.rb`。再帰ガード付きのオンデマンド戻り値推論: `lib/rigor/inference/expression_typer.rb`の`#infer_user_method_return`。
- 実行フェーズ: `Runner#assemble_run_diagnostics`（事前パス → プール → 事後パス集約）;プールの分割は`lib/rigor/analysis/runner/pool_coordinator.rb`。
- `RbsExtended`ディレクティブ（9つ、レジストリなし）: `lib/rigor/rbs_extended.rb`;`rigor:v1:pure`は仕様化済み、未実装。`FlowContribution`のスロット: `return_type truthy_facts falsey_facts post_return_facts mutations invalidations exceptional role_conformance`——`mutations` / `invalidations` / `role_conformance`はプロデューサーなし。
- rbs-inlineの`# @rbs %a{}`はエンドツーエンドで`RbsExtended`に到達する（`plugins/rigor-rbs-inline`・`Environment.collect_virtual_rbs`）;それを行使するspecなし;ハンドブックはサポートされないと述べる。
- `# rigor:`ディレクティブは`disable` / `disable-file`のみ（`lib/rigor/analysis/check_rules.rb`）。
- 設定: メソッドごとのテーブルは存在しない;`severity_overrides`が唯一のオープンキーマップ;`ProtocolContract`（`lib/rigor/plugin/protocol_contract.rb`）がパススコープのメソッドごとの先例。権威ティア: `lib/rigor/flow_contribution/merger.rb`。
- 診断ファミリーの機構: `lib/rigor/analysis/check_rules/rule_ids.rb`（`RULE_FAMILIES`）、`lib/rigor/analysis/rule_catalog.rb`、`lib/rigor/configuration/severity_profile.rb`、`lib/rigor/bleeding_edge.rb`（キャッシュ同一性の制約）、`spec/docs/manual_drift_spec.rb`（分類体系のドリフト）。オプトインのテンプレート`call.self-undefined-method`;新ファミリーのテンプレートADR-100。
- 純粋性データ: `data/builtins/ruby_core/*.yml`（`purity` = 畳み込み安全性、エフェクトではない）、`lib/rigor/inference/builtins/method_catalog.rb`（`FOLDABLE_PURITIES`・`NON_REPRODUCIBLE_SELECTORS`）、`*_catalog.rb`の`mutating_selectors:`、`lib/rigor/inference/mutation_widening.rb`、`lib/rigor/inference/closure_escape_analyzer.rb`。
- コーパスの先行技術: Steins / Flixへの言及なし;Kokaがサーフェスの先行技術として名指される（ハンドブック付録）;2026-07-15のPHPStanルール再調査の純粋性判定（§8）;ADR-30はFFIリソース追跡の将来の住処として「エンジン側のエフェクト解析」を名指す。
- ビュー: `lib/`にも`plugins/`にもERBコンパイルはどこにもない。rigor-actionpackは明示的な`render`ターゲットをテンプレートパスへ解決する（`plugins/rigor-actionpack/lib/rigor/plugin/actionpack/analyzer.rb`・`RENDER_TEMPLATE_EXTENSIONS`・`render_violations_for`）;rigor-rails-i18nは遅延`t('.key')`のためにテンプレートを正規表現でスキャン;rigor-actionmailerはメーラービューを発見。ADR-16のTier D（`external_files:`——束縛されたivar付きで宣言された`self`の下で評価されるファイル）はエンジンの消費者なしにADR-60 WD1で除去され、「そのスキャナとともに需要ゲート付きで復帰する」。
