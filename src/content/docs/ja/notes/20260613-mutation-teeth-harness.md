---
title: "Mutation-testing the analyzer — a teeth / false-negative harness"
description: "Imported from rigortype/rigor docs/notes/20260613-mutation-teeth-harness.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260613-mutation-teeth-harness.md"
sourcePath: "docs/notes/20260613-mutation-teeth-harness.md"
sourceSha: "f5e149e4bdda976418d6cabf42359c1a44f5b3c0b275df04c40e2912d670ded6"
sourceCommit: "7f5a54c352ff4370788bf7aef5fc1b70f8a92e4a"
translationStatus: "translated"
sidebar:
  order: 20266613
---

ステータス: ワーキングノート＋生きたバックログ。Rigor v0.1.19（リリース後、`[Unreleased]`）に対して執筆。`tool/mutation/`ハーネス、その`lib/rigor`へのコーパススイープ、それが生んだランク付けされた偽陰性（false negative）バックログ、そしてそこから着地している修正を記録する。本ノートは非規範的であり、バックログが片付いた時点でADRへ供給することを意図している。

## なぜ

Rigorの開発規律全体は**反偽陽性（anti-false-positive）**である — 「プログラムは動く」が最悪ケースの静的な読みに優先し、コーパスのバイト単位同一性ゲートは*振る舞いを変えたか*を計測する。**双対** — *そもそも歯（teeth）を持っているのか* — コードを壊してもRigorが文句を言わないのはどこか（偽陰性／盲点）— を体系的に計測するものは何もなかった。

ハーネスはミューテーションテスト（mutation testing）の技法でそれに答える。Rigorがクリーンと報告するファイルを取り、**型から見える**ミューテーションを注入し、ミューテートされたバイト列に対して解析を再実行し、*生き残った*ミュータント（mutant、新しい診断が出ない）を偽陰性の候補として読む。これは`rigor-regression-sweep`スキル（偽陽性／表面化した診断のドリフトを追跡する）の偽陰性の兄弟である。

## メカニズム（`tool/mutation/mutate.rb`、開発専用、ADR-50の凍結サーフェスの外）

- **ミューテータ** — Prismネイティブのバイト範囲*ソーススプライス*（アンパーサ不要。解析器がスプライスされたソースを再パースする）。各々がルールファミリーを狙う演算子: `nil_inject`／`type_swap`（呼び出し引数のリテラル → `nil`／反対型のリテラル → `call.argument-type-mismatch`）、`undefined_method`（呼び出し地点をリネーム → `call.undefined-method`）、`arity_extra`（`(...)`内に引数を追加 → `call.wrong-arity`）。ミューテートされるのは呼び出し地点と本体だけで`def`シグネチャは決してミューテートされないので、再利用したプロジェクトスキャンは有効なまま残る。
- **ウォームループ（「エディタモード＋キャッシュ」）** — `LanguageServer::ProjectContext`がRBS環境とプロジェクト全体の`ProjectScan`を**一度だけ**構築し、各ミュータントは`Runner.new(environment:, prebuilt:)`＋`#run_source`（メモリ内オーバーレイ、ディスク書き込みなし）でそれらを再利用する。`prebuilt:`を渡すと`run_result_cacheable?`がfalseになるので、*ディスク*ファイルをダイジェストするラン結果キャッシュ（run-result cache）がバイパスされ、ミュータントが古いクリーンなヒットを返されることは決してない。実測: コールド約400 ms、その後はミュータントあたり約6〜12 ms（コールドランより約70倍安い）。
- **型認識フィルタ（フェーズ1.5、デフォルトオン）** — これなしでは指標は無意味である。型チェッカーはバグの部分集合しか見ない。ほとんどのミューテーションは型不変（等価ミュータント）であり、生存は*正しい*（偽陽性の規律）。各ミューテーションは*アンカー* — それが契約（contract）を侵害し得る呼び出しレシーバー — を持ち、`ScopeIndexer.index`＋`Scope#type_of`で一度プローブされる。ミューテーションが保持されるのは、そのアンカーが具体的な非`Dynamic`／`Top`型に型付けされるときに限る。偽陽性に安全: 未解決の型はミューテーションを*保持*する。これがハーネスが`mbj/mutant`ではなくインプロセスのPrismネイティブである理由である: インプロセスのツールだけがエンジンに自身の型を問い合わせられる。A/B（`--no-type-filter`）: `trinary.rb`はキル43%／生存33 → **100%／0**、`ci_detector.rb`は0%／44 → **83%／1**。
- **スイープ** — `mutate.rb sweep <paths…>`は1つのウォームセッション上ですべての`.rb`を走らせ、生存者を`(operator, receiver type)`でカウント順のクラスタ（上位メソッド＋例となるサイト）にグループ化する。`--json`は同じものを構造化データとして出力し（ADR-61の流儀）、エージェントがそれに対して行動できる。ビルド／決定: **自前で作ることを確認、`mutant`は却下**（型認識のサイト選択にはエンジンがインプロセスである必要がある。Prism対whitequarkの不一致が無害なのはソーステキストの境界でのみ）。

## コーパススイープ — `lib/rigor`、285ファイル、`--per-file 12`

2,237ミュータントを解析。**歯61.7%**。856生存者 → 304クラスタ。（見出しの%は*本筋ではない*: アリティノイズで水増しされ、引数チャネルで目減りする。ランク付けされたクラスタがシグナルである。）ミュータントあたりの中央値9.4 ms、p90が41.6、最大463（`statement_evaluator.rb` — これがCI時間のものであって対話的でないことを裏づける）。

上位のクラスタは**ハーネスのノイズ**（→ ツールの精緻化）と**本物のエンジンのギャップ**（→ バックログ）にきれいに分かれる。

### ハーネスのノイズ（等価ミュータント — エンジンではなくツールで修正）

- **可変長／オプショナル引数**メソッドへの`arity_extra`: `Data.define`（45）、`Type::Combinator.union`／`public_send`（21）、`File.join`（15）、`JSON.pretty_generate`（10）、`Marshal.dump`（6）、`Array#push`／`Hash#fetch`。引数の追加は有効なRuby → 正しく発火しない。*最大の単一ノイズ源*。修正: 解決されたシグネチャが固定アリティのときだけミューテートする（または演算子を廃止する）。
- **`Dynamic`アームを持つユニオン**への`undefined_method`（`Array | Dynamic[top]`.inspect 20＋13、`Dynamic[top] | []`）と**`bot`**へのもの（8）: 漸進的に有効／到達不能 → 正しい。修正: 型フィルタは`Dynamic`アームを持つユニオンと`bot`を非具体的として扱うべきである。

### 本物のエンジンのバックログ（確信度順）

| 確信度 | クラスタ（件数） | 読み |
| --- | --- | --- |
| **高** | `undefined_method` `Mutex#synchronize`（13）＋`Mutex.new`（7） | コアの**Thread/Mutex**メソッドが解決しない → おそらくビルトインインポートの欠落。 |
| **高** | `undefined_method` `String \| Symbol`.to_s/to_sym（12）、`String?`.downcase/hex（6） | **ユニオン／nilableレシーバー**が、具体的などのアームもメソッドを持たないときでさえ未定義メソッドを発火しない。 |
| 中 | Rigor自身の`Type::Constant#value`（22）、`Type::Tuple#elements`（13）、`Type::Singleton#class_name`（8）、`Type::Nominal#class_name`（6）への`undefined_method` | セルフドッグフード: Rigorの**自身の`Type::*`キャリアがメソッドRBSを欠く** → それらに歯がない。 |
| 混在 | `Hash#[]`（18）、`Set[]`（19）、`Integer#>=`（19）、`String#sub`（8）への`argument-type-mismatch` | 最低歯のチャネル — だがサイトごとの裁定が必要（`h[nil]`は*正しい*、任意のキー。`Integer#>=(nil)`は*本物の*取りこぼし）。 |

## 計画（簡単な順）と着地

1. **ハーネスのデノイズ — 着地`599a7922`＋1**。型フィルタは今や`Dynamic`／`Top`／`Bot`のいずれかのアームを持つユニオン（および裸の`bot`）を非具体的として扱い（`non_concrete_type?`）、`arity_extra`はデフォルト演算子セットから外れた（ほとんどのRubyメソッドは追加の引数を受け取る → 等価ミュータント。アリティの歯の計測には`--operators`で依然として選択可能）。`type_node`スイープ: 16生存者（`Data.define`のアリティ＋`Array | Dynamic[top]`.inspectのノイズを含む） → **3、すべて本物の候補**（`ResolverChain#freeze`、`non-negative-int#>=` ×2）。バックログは今や信頼できる。`arity_extra`をデフォルトに値させるシグネチャアリティガードはフォローアップである。
2. **ユニオン／nilableレシーバーの歯** —
   - **スライス1（非nilユニオン）: 着地`a07195bd`**。`call.undefined-method`が、メソッドが*すべての*非nilアームで欠けているときにユニオンレシーバーに対して発火するようになった（`check_rules.rb`の`union_undefined_method_diagnostic`）。偽陽性に安全な`method_present_anywhere?`のアームごとのプリミティブ＋開いた（ADR-26）／合成された／シングルトン／モジュールミックスインのいずれかのアームで脱出するアームガードを再利用する。スカラ経路のユニオン脱出は*意図的*だった。これは健全性が完全な箇所にだけ歯を加える（`A | B`が`m`に応答するのは両方が応答するとき**かつそのときに限る**）。`make verify`クリーン（lib 286＋プラグイン141をまたいで新規発火なし）。4例のリグレッションスペック。`String | Symbol`の生存者クラスタは今やキルする。
   - **スライス2（nilableユニオン、`String?`）: 裁定済み — 先送り（意図的なN3の沈黙と衝突）**。調査の結果、`spec/rigor/analysis/check_rules/safe_navigation_undefined_method_spec.rb`（65〜94行、`20260613-app-network-corpora-survey.md`のN3決定）が、メソッドが`T`で欠けているときでさえ`T | nil`レシーバーが`call.undefined-method`に対して沈黙したままであることを — `y&.m`と素の`y.m`の両方について — *意図的に*アサートしていることが判明した。**ファイル横断のプロジェクトdef**に対する動作中コードの偽陽性を避けるためである。その偽陽性クラスは本物であり、`method_present_anywhere?`では*完全には*排除されない: RBS既知だがそのメソッドがファイル横断で定義されたプロジェクトクラス（再オープンされたクラス／ディスパッチャーがファイルごとに適用しないアソシエーション／スコープ）は「欠落」と解決されて発火するだろう。したがってnilableユニオンで発火することは静かな歯の修正ではない — 意図的で偽陽性を動機とする設計決定を覆すものである。**未解決のADR質問として記録**: N3の沈黙を、すべての非nilアームが完全に既知のコア／標準ライブラリクラス（ファイル横断defの偽陽性が生じ得ない）のときだけ発火するよう*狭め*られるか。それには変更の前にコーパス偽陽性調査が要る。これは裁定の規律が働いている — すべての生存者がバグではなく、一部は意図的な沈黙である。

     **コーパス偽陽性調査（2026-06-14）— 完了。裁定: 狭めは却下、N3の沈黙を維持**。バンドルされたアームでナローイングした候補（`Class`／`Module`を除外、素の呼び出しのみ）を13プロジェクト（ActiveSupport中心のliquid／mail／herb／slim／strap＋素のkramdown／net-ssh／parser／oj／faraday／haml／hamlit／tdiary-core）で走らせた。結果: **真のnilableユニオン発火はゼロ** — 実世界の歯の増分は約0。一方でセルフチェックは本物の**特異性喪失の偽陽性**を表面化させた（`plugin_class : Class`が`.manifest`を持つ`Plugin`サブクラスを保持する）— まさにN3の懸念である。増分約0＋実証された偽陽性のしやすさ＋意図的な決定を覆すコスト ⇒ 割に合わない。ただし**収穫した2つのガードを出荷済みのスライス1に維持**した: （a）汎用メタクラスガード（`Class`／`Module`アームはシングルトンメソッドを列挙できない）、（b）**異クラスガード（distinct-class guard）** — スライス1は真にマルチクラスのユニオンにだけ発火し、同クラスのシェイプ結合（`Hash[K1,V1] | Hash[K2,V2]`）には発火しない。これは調査がmailで見つけた**本物の外部スライス1偽陽性を修正した**（`compose_codepoints`が`Array`を`Hash | Hash`と誤型付けし`.pack`をフラグしていた）。つまり却下された機能でも、出荷済みコードの偽陽性堅牢化を2つ生んだ。`make verify`クリーン。ユニオンスペックは今や5例。
3. **Mutex／Threadコアクラスのカバレッジ — 着地（RBSクラスエイリアスの解決）**。根本原因はインポートの欠落では*なかった*: `Mutex`はRBSの**クラスエイリアス**である（`class Mutex = Thread::Mutex`、`references/rbs/core/thread.rbs:1822`）。それは`env.class_alias_decls`にのみ存在するので、`RbsLoader#class_known?`はそれを報告したものの、`build_instance_definition`／`build_singleton_definition`（`class_decls`でガードする）はそのメソッドを列挙できず — すべてのエイリアスクラスが解決可能なメソッドサーフェスを持たないまま残っていた（ディスパッチが`Dynamic`に広がり、未定義メソッドは決して発火しなかった）。修正: `canonical_module_name`がガードの前に`env.normalize_module_name?`経由でエイリアスをそのターゲットへ正規化するので、ディスパッチ*と*`Mutex`およびあらゆる`X = Y`の存在チェックが機能する。`make verify`クリーン（libは数箇所で`Mutex`を使う — 偽陽性なし）。5例のローダースペック。Mutexの生存者クラスタは今やキルする。クラスタを超えた一般的な勝利である。
4. **広域ファズ（broad-fuzz）モード — 着地（`両方を段階的に`のロバストネスの半分）**。`mutate.rb fuzz <paths…>`はウォームループを攻撃的なフィルタなしのミューテーション（あらゆる演算子、あらゆるサイト）で走らせ、解析器をクラッシュさせる（`internal analyzer error:` — それ自身のレスキュー）、ハングさせる（ミュータントごとのタイムアウト）、または — `--repeat`付きで — 非決定的な診断を返す（キャッシュのバイト単位同一性契約を壊し得る）ミュータントを報告する。初回ラン: **`lib/rigor`全体に対して2,706ミュータント、クラッシュ／ハングゼロ** — 解析器は自身のツリーの任意の型から見えるミューテーションに対してロバストである。クリーンな結果はそれ自体が成果物である（ロバストネスの証拠）。
5. **`argument-type-mismatch`クラスタ — 裁定済み＋一部着地（精緻化レシーバーディスパッチ）**。クラスタは混在していた。その本物の部分は`argument-type-mismatch`の弱さではまったくなく、*レシーバー解決*のギャップだった: リファインメントレシーバー（`non-negative-int`＝`Type::IntegerRange`、`non-empty-string`＝`Type::Refined`）が`concrete_class_name`を持たなかったので、**3つすべての**呼び出しルール（undefined-method／wrong-arity／argument-type-mismatch）が脱出していた。修正: `concrete_class_name`が`Type::IntegerRange` → `"Integer"`、`Type::Refined` → そのベースを解決するので、たとえば`arr.select{}.size`上の`n >= nil`は今や発火する。`make verify`クリーン（リファインメントレシーバーはlibの至る所にある）。3例のスペック。*残余の*`non-negative-int`生存者は**正しい沈黙**である: それらは`==`（`lines.size == 1`）への引数であり、`UNIVERSAL_EQUALITY_METHODS`経由で免除される（Rubyの`==`は型不一致でfalseを返し、決してraiseしない）。ハーネスのデノイズ（包む呼び出しが普遍的等価メソッドであるリテラルミューテーションをスキップする — `mutate.rb`の`UNIVERSAL_EQUALITY`）が**着地**し、アリティガードを鏡映する。それらの残余生存者は消えた。`Type::*`のセルフドッグフードのサブ項目はADR-24の先送り領域のまま（`call.self-undefined-method`ルールは`:off`で出荷）である。*（引数チャネルのコア: 解決済み）*
6. **ADR — 着地: [ADR-62](../../adr/62-mutation-testing-teeth-measurement/)**。方法論＋決定（自前で作る、意味を作る型認識フィルタ、バックログとしてのスイープ、仮定せず裁定する）と着地済み／先送り項目を決定記録に畳み込む。本ノートは生きたトラッカーのまま残り、ADRが根拠である。

## 累積結果（`lib/rigor`、`--per-file 12`）

3つのエンジン修正（ユニオンの歯、クラスエイリアスの解決、精緻化レシーバーディスパッチ）と3つのハーネスのデノイズ精緻化（ユニオン-Dynamic／bot、アリティのデフォルトオフ、普遍的等価）の後:

| | 初回スイープ | その後 |
| --- | --- | --- |
| 歯（キル%） | 61.7 % | **71.4 %** |
| 生存者 | 856 | **611**（−29 %） |
| `undefined_method`キル | 1095 | **1508** |

より重要なのは、**上位の残余クラスタがもはや容易に修正できる取りこぼしではない**ことである — それらは（a）意図的なADR-24のセルフドッグフード先送り（`Type::Constant#value` 44、`Type::Tuple#elements` 15、プロジェクトクラスの`MethodCatalog`シングルトン — `call.self-undefined-method`ルールはその外部偽陽性ゲートが整うまで`:off`で出荷）と（b）*正しい沈黙*である: `OptionParser#on`（多数のオーバーロード → 引数ルールが反駁するには単一のものが要る）、`File.join`（残余位置引数は意図的に引数チェックされない）、`Hash#[]`／`fetch`（任意のキーは有効なRuby）。容易に行動可能なエンジンのバックログは片付いた。残るのは設計レベルのもの（nilableユニオンのN3の狭め — コーパス偽陽性調査が要る）か機能（ユーザー向け型保護カバレッジ）である。

## ユーザーコマンドへのプロダクト化 — ADR-63（2026-06-14）

「ユーザー向け型保護カバレッジ」機能は[ADR-63](../../adr/63-type-protection-coverage/)として出荷された: `rigor coverage --protection`（Tier 1、静的なディスパッチサイトのレシーバー具体性プロキシ）と`rigor coverage --protection --mutation`（Tier 2、ファイルごとの*実際の*ミューテーションキル率）。Tier 2はこの開発ハーネスの**狭く厳選された部分集合**——型から見える`Mutator`、型認識フィルタ、ウォームループ、キル基準——をサポート対象の`Protection::MutationScanner`として`lib/rigor/protection/`へ持ち上げる;このハーネスの`mutate.rb`は今や**`lib`の`Mutator`を再利用し**（真実の源は1つ）、開発専用のスイープ / ファズ / 生存者クラスタリングのツールだけを保持する（ADR-62 WD4は維持される）。フレーミングは荷重を担う: 有効性 / どこに型を追加すべきか、決して素の生存ではない。

## CRuby `lib/`スイープ + 多重オーバーロード-nil引数の修正（2026-06-14）

2つめの、より大きなコーパス: CRubyの`lib/`全体（626ファイル——stdlib + ベンダリングされたbundler/rubygems）に対する`--per-file 40`スイープ。**8,611個の型関連ミュータント、歯53.1%、800個の生存者クラスタ**。すでに裁定済みのバケット（ベンダリングされた`Bundler` / `Gem::*`のRBS要、意図的なnilableな`String?`のN3沈黙、`Hash#[]` / `fetch`の任意キー、`File.join`の残余引数）を除外すると、**`call.argument-type-mismatch`チャネル**が支配的な本物の候補として残った（String / Integer / File / MatchData / Arrayが`nil` / 誤った型のリテラルを受け取る）。

根本原因は、制御された`.rbs`実験（プレーン名前的、インターフェイスエイリアス、多重オーバーロード、nilableの各パラメータをそれぞれ`nil`で呼ぶクラス）でマッピングした——**2つのゲート**:

- **ギャップA——多重オーバーロードでのbail**。`argument_type_diagnostic`は`return nil unless method_def.method_types.size == 1`としていたので、`5 * nil`（`Integer#*` = 4オーバーロード）は`TypeError`を起こすにもかかわらず引数チェックに決して到達しなかった。
- **ギャップB——インターフェイスエイリアスのパラメータ**。`string`（`String | _ToStr`）/ `int`（`Integer | _ToInt`）パラメータは`nil`を*決定的には*拒否しない（インターフェイスのアームが漸進的（gradual）型に翻訳される）ので、`"a" + nil`は単一オーバーロードでさえ沈黙したままだ。

**ギャップA着地（FP安全、nilのみ）**。`argument_mismatch`は`nil_argument_mismatch_across_overloads`を介して多重オーバーロードメソッドへ拡張され、**純粋な`nil`引数がすべてのオーバーロードの対応する位置パラメータに拒否される**ときだけ発火する。`nil`に限定することがFP安全のコアだ: `nil`は`coerce`プロトコルに決して関与しないので、どのオーバーロードも受け付けない`nil`は保証されたエラーである——数値オーバーロードが「拒否する」非nil引数とは違って（それは`coerce`で有効になり得る、`5 + Money.new`）。保守的なエンベロープ: 残余 / キーワードパラメータ、漸進的（インターフェイスエイリアス）パラメータ、またはnilを受け付けるパラメータを持つオーバーロードがあればそれを抑制し、宣言由来のivar nilは免除される（ADR-58とのパリティ）。ユニオン-undefined-methodの「すべてのアームで拒否」の形状を映す。

**ギャップBも着地（FP安全、nilのみ）**。nilチャネルは、**RBSパラメータ型**（翻訳されたRigor型ではない——それこそがインターフェイス情報を失うものだ）に対して評価される`param_admits_nil?`述語に統一された。これは型エイリアスを解決し（`RbsLoader#expand_type_alias`: `string` → `String | _ToStr`）、NilClassが必要なメソッドをすべて実装しているかでインターフェイスを判定する（`interface_method_names` ∩ `nil_class_has_method?`——NilClassは`to_str` / `to_int`を持たないので`string` / `int`はnilを拒否する;仮想的な`_ToS`は`NilClass#to_s`が存在するので受け付ける）。全体を通じて保守的: 具体的な非nil祖先クラスのインスタンスとインターフェイスNilClassが満たさない場合だけ「拒否」を返し、他のあらゆるRBS形式（optional、基底、tuple、proc、…）は受け付ける。これにより単一オーバーロードのインターフェイスパラメータ（`"a" + nil`、`"a".include?(nil)`）と多重オーバーロードのインターフェイスパラメータ（`[1, 2, 3].fetch(nil)`）が発火する。依然としてnilのみ（coerceの懸念）、依然としてADR-58で免除される。

- **ゲート:** `make verify`クリーン（6331 + 8例、セルフチェック`lib`（arg-mismatch 0件） + check-plugins、すべての精度スナップショット）;**コーパスFPゲート——新規発火ゼロ**、同じ12の`rigor-survey`プロジェクト全体で;リグレッションスペックを`nil_argument_mismatch_spec.rb`に拡張（両ギャップ）。
- **再計測（ループ閉鎖、バイト安定の8,611ミュータント）:**歯**53.1% → 53.8%（ギャップA） → 57.7%（ギャップA+B）**——ギャップA **+66キル**、ギャップB **+334キル**、合計**+400キル / −400生存者、+4.6ポイント**。ギャップBの低下はまさに狙ったクラスタだ: `String`上の`nil_inject` −103、`singleton(File)` −51、`Array`/`Array[T]`バリアント（−34 / −22 / −19 / …）、`"…"` Stringリテラル −30。生存者数が増えたものはない。

**精緻化レシーバー（Difference）のフォローアップ着地**。次のスイープの最上位のクリーンなクラスタは`non-empty-array` / `non-empty-string`上の`undefined_method`だった: これらの精緻化は`Type::Difference`（`Array - []`、`String - ""`、`Integer - 0`、`Hash - {}`）であり、あるキャリアの`concrete_class_name`が扱っていなかった（以前の精緻化レシーバー修正は`Type::Refined` / `Type::IntegerRange`しかカバーしていなかった）ので、3つの呼び出しルールすべてがbailした。1つのケース——`when Type::Refined, Type::Difference then concrete_class_name(type.base)`——が、*値*を引いてもメソッドサーフェスは決して変わらないので、differenceをその基底（被減数）クラスに解決する。ゲート: `make verify`（6333 + 8）、セルフチェック / check-plugins 0、スナップショット、12のコーパスプロジェクト全体で**新規発火ゼロ**（3つの呼び出しルールすべて）;スペックを`refined_receiver_dispatch_spec.rb`に追加。再計測: **+57キル、57.7% → 58.4%**、`non-empty-array` / `non-empty-string`のundefined_method*および*それらのnil_inject（argument-type-mismatchも今やそれらに到達する）での低下。

**セッション合計（CRuby `lib/`に対する3スライス）:**歯**53.1% → 58.4%（+5.3ポイント）、+457キル**、各スライスは新規コーパス発火ゼロにFPゲートされている。

**まだ先送り:**非nil（`type_swap`）チャネル——数値オーバーロードが「拒否する」非nil引数は`coerce`で有効になり得るので、nilを超えて広げるにはcoerceを意識したモデルが要る。

## 実証されたループ

`String | Symbol`は初回スイープの最上位の本物のクラスタだった → 意図的なユニオン脱出と診断 → 偽陽性に安全な修正 → `make verify`グリーン → ハーネスがそのクラスタを**キル済み**として再計測する。CRuby-`lib/`の引数チャネルの作業は、新しいコーパスでこのループを繰り返しスケールさせた: 多重オーバーロードの数値-nilとインターフェイスエイリアス-nilのクラスタ（`Integer#*`、`String#+`、`File.*`）は生存者から**+400キル、歯+4.6ポイント**へと移り、新規コーパス発火ゼロにFPゲートされた。発見 → 根本での修正 → コーパスゲート → 再計測キル: ハーネスは単なるレポートではなく自己改善ループである。
