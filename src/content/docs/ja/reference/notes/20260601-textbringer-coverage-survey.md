---
title: "textbringerの型カバレッジ調査 — 不正な同梱`sig/`と、名前空間合成による修正"
description: "textbringerの型カバレッジ調査 — 同梱RBSの不正と、名前空間合成による修正。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260601-textbringer-coverage-survey.md"
sourcePath: "docs/notes/20260601-textbringer-coverage-survey.md"
sourceSha: "1d2d1e55a7b92474173415fd44c148fab7b2821edf32e4a2d6549f2fa2c65363"
sourceCommit: "a5d648b126d5ed7b1e04a16a87927bca7883e069"
translationStatus: "translated"
sidebar:
  order: 20266601
---

**日付:** 2026-06-01。
**対象:** [textbringer](https://github.com/shugo/textbringer) v26（前田修吾によるターミナルテキストエディタ）。`~/repo/ruby/rigor-survey/textbringer/`にコミット`3f6b0d2`（2026-05-25）でシャロークローンした。
**理由:**カバレッジ（coverage）調査の対象。textbringerはコーパスの中でも珍しい——*自前の手書きRBSを同梱する*成熟した**プレーンRuby**アプリケーションである（`sig/lib/textbringer/**.rbs`、52ファイル）。そのため次の問いを立てる自然な対象となる: プロジェクト自身の`sig/`を`signature_paths:`に配線すると、`rigor coverage`の精度（precision）の数値は上がるのか？ 最初の答えは明快な「ノー」だった（§3）——しかしより深い調査（§4）が真の理由を突き止めた: textbringerの`sig/`は**不正なRBS**であり（`rbs validate`が拒否する;名前空間宣言が欠落している）、あらゆるコンシューマーにとって不活性で、Rigorはそのビルドエラーを黙って飲み込んでいた。修正——欠落した名前空間を合成する（コミット`1529b54d`）——はこの「ノー」を**+9.6ポイントのカバレッジ**（40.3% → 49.9%）に変え、さらに3つのレバー（§5）が**65.0%**まで押し上げる。§3は調査の記録として残すが、その機構的な結論は§4によって置き換えられる。

以下の数値はすべてrigorリポジトリのFlakeバンドルから得たもので、`cwd = 対象`＋`BUNDLE_GEMFILE=<rigor>/Gemfile`で[[reference_survey_external_projects]]に従って実行した。

---

## 0. オンボーディング（rigor-project-init、acknowledgeモード）

`rigor-project-init`ワークフローを最後まで実行した:

- **フェーズ1（検出）:**プレーンRubyのgem（`gemspec`駆動のGemfile、Rails/Sinatra/dry-rb/Sorbetのマーカーなし）。`test/`配下にtest-unitスイート。`Gemfile.lock`なし、`rbs_collection.lock.yaml`なし。手書きの`sig/`を同梱する。
- **フェーズ2（モード）:**最初の`rigor check`は**45エラー**（< 100）を報告した → acknowledgeモード、`balanced`（デフォルト）severity。
- **フェーズ3（プラグイン）:**なし——プレーンRuby;コア解析器がカバーする。
- **フェーズ4（設定）:** `paths: [lib]`、`target_ruby: "3.3"`（gemspecの下限は3.2だが、Prism 1.8が3.2文法を削除した——3.3はサポートされる最古であり、パース上のスーパーセット）、そして同梱RBSを消費するための`signature_paths: [sig]`を持つ`.rigor.dist.yml`（Rigorは`sig/`を自動検出**しない**）。`rigor plugins` → `loaded: 0  load-error: 0`（プレーンRubyでは正しい）。
- **フェーズ6（トリアージ）:** §2を参照。
- **フェーズ7（ベースライン）:** `rigor baseline generate` → 29バケット / 74診断、`baseline: .rigor-baseline.yml`を配線。再チェック → **診断なし**（エンベロープが保たれる）。

記録に値する`target_ruby`の落とし穴: 設定レイヤーは緩い`"3.2"`形式を受け入れるが、それは`Prism.parse(version:)`にそのまま渡され、Prism 1.8.1は`invalid version: 3.2`を送出する（3.3.0 / 3.4.0 / latestしか同梱していない）。`rigor coverage`はこれを診断ではなくハードクラッシュとして表面化する。

---

## 1. コールドカバレッジのベースライン

77ファイルにわたる`rigor coverage lib`、パースエラー0件:

| 指標 | 値 |
| --- | --- |
| 型付けされた式 | 47,601 |
| **精密（precise）** | **19,173（40.3%）** |
| 動的（不透明、opaque） | 28,428（59.7%） |

ティア（tier）の内訳: 定数27.0%、名前的（nominal）8.1%、シェイプ付き3.7%、リファインメント0.1%、bot 1.5%、動的不透明59.7%。**定数畳み込みだけで全精密式の約2/3を占める**——リテラル駆動のプロファイルだ。ファイルごとのばらつき: 低い方は約20%（`commands/rectangle.rb`）、テーマは約50%に集中（定数のカラーテーブル）、重いファイルは`buffer.rb` 31.8%、`window.rb` 26.8%、`skk_input_method.rb` 56.6%。

---

## 2. `rigor check` / `rigor triage`（コールド、ベースライン前）

74診断（45エラー / 29警告）。分布:
`call.undefined-method` 28、`flow.always-truthy-condition` 24、`call.possible-nil-receiver` 13、`call.argument-type-mismatch` 4、`call.unresolved-toplevel` 4、`def.return-type-mismatch` 1。

トリアージのヒント（設定ギャップのヒントなし——`activesupport-core-ext` / `gem-without-rbs`がないので、ベースラインは実際のセットに対して実行された）:

- **`systemic-file-cluster`** —— `lsp/client.rb`内の9件の`call.undefined-method`（`@io` / `@wait_thread`の読み取りが最悪ケースのnilとして型付けされた: `alive?`/`read`/`read_nonblock`/`close`が「for nil」）。単一の構造的原因。
- **`unresolved-toplevel`（4件）** —— `window.rb`が、解析器がトップレベル呼び出しから追えないリファインメント（`using` / `refine` / `attrset`）を使っている;追求するなら`pre_eval:`（ADR-17）の候補。
- **`genuine-bugs`（5件）** —— 局所化されたレビューの山:
  - `floating_window.rb:158/183/194/215` —— `Integer`に対する`<` / `>`で、右辺が`Dynamic[top] | nil`（×4）。比較箇所でnil型付けされた幅/高さのivar。
  - `keymap.rb:2` —— `define_keymap`が`-> Textbringer::Keymap`と宣言されているが、`Dynamic[top] | nil`と推論された（戻り値型の不一致）。
  - さらに`tetris_mode.rb`の`set_cell`/`render`/`start_timer`「for nil」クラスタ（`@gamegrid` ivar）—— 使用前にコードが初期化するgamegridに対する最悪ケース健全（sound）なnil読み取り。

[[feedback_false_positive_discipline]]に従えば、ivar-nilのクラスタは動作するコードに対する最悪ケース健全な静的読み取りである → 強制修正ではなく、正直なベースライン素材だ。これらは今やエンベロープ内にある;プロジェクトがこれらを抑え込みたいなら`rigor-baseline-reduce`が後続作業となる。

---

## 3. 目玉の発見 —— 同梱`sig/`は`rigor coverage`を**0**だけ押し上げる

> **⚠️ §4（2026-06-01の解決パス）によって置き換え**。以下の*観測*（sig配線がカバレッジを0だけ押し上げた）は本物だが、**この節が推論する機構は誤っている**。真の根本原因は「スキャナが`self`/ivar/paramをシードしない」ことではなかった——textbringerのRBSが*そもそも一度もビルドされなかった*こと（名前空間欠落の`NoTypeFoundError`）であり、そのためどのレシーバー上でもプロジェクトメソッドが1つも解決しなかった。それが修正されれば、`self`レシーバーの呼び出しは**実際に解決する**。訂正された説明は§4を読むこと;§3は調査の記録として残す。

`signature_paths: [sig]`をアクティブにして`rigor coverage lib`を再実行すると、**バイト単位で同一の**数値が得られた（精密40.3%、すべてのティアのカウントが変化なし）。`rigor check`は明らかにRBSを*消費している*——stderrは`project sig/: 47`のロードを報告し、診断は宣言された型を参照する（`define_keymap` → 宣言された`Textbringer::Keymap`）。したがってこれは「checkがRBSを無視している」のではない。

### なぜか —— 仮定ではなく証明

`rigor coverage`は`Inference::PrecisionScanner`を実行する。これは`ScopeIndexer`が構築したスコープチェーンに対する**ノードごとの軽量な`Scope#type_of`スキャン**であり、ファクトストアを伴う完全な`Analysis::Runner`のフローパスでは*ない*。2つの最小限のプローブが機構を特定する（どちらも`signature_paths: [sig]`の有無で実行）:

**プローブA —— レシーバーが`.new`から名前的型を得る:**
```ruby
b = Textbringer::Buffer.new
n = b.point_min                       # RBS: () -> Integer
s = Textbringer::Buffer.new_buffer_name("foo")   # RBS: (String) -> String
```
→ **sigなしで6.7%精密 → sigありで40.0%**（+5名前的）。カバレッジは*実際に*RBSを認識している。

**プローブB —— レシーバーが`self` / `@ivar` / メソッドパラメータ:**
```ruby
class Textbringer::Buffer
  def demo
    a = point_min        # implicit-self receiver
    b = self.point_min   # explicit self
    c = goto_char(a)     # self receiver
  end
  def demo_ivar;  @buf.point_min; end   # ivar receiver
  def demo_param(buf); buf.point_min; end  # param receiver
end
```
→ **sigの有無で42.4%精密 —— 同一**。押し上げゼロ。

### 結論

`rigor coverage`がRBSのメソッド戻り値型をクレジットするのは、**ノードごとのスキャン内で呼び出し箇所のレシーバーがすでに名前的型を持っているときだけ**である。精度スキャナは、慣用的なオブジェクト指向Rubyを支配する3種類のレシーバー——**暗黙的/明示的な`self`、インスタンス変数、メソッドパラメータ**——についてレシーバー型をシードしないので、同梱RBSはどれほど正確でも、実際のメソッド本体において付着すべき型付きレシーバーをほとんど持たない。textbringerの`lib/`はほぼ全面的にそのような呼び出し箇所であり、ゆえにバイト単位で同一の結果になる。

これは**`self`レシーバー**の呼び出しさえ含むことに注意: ADR-24（暗黙的selfのメソッド解決）とADR-35の戻り値チェックは完全なチェッカーパスで適用されるが、`coverage`の精度スキャナは囲んでいるメソッドのクラスから`self`を型付けしないので、`Buffer#demo`内で裸で呼ばれた`point_min`でさえ不透明なままになる。

### 要点

1. **`rigor coverage`はオブジェクト指向コードベースにおいてRBSの価値を過小評価する**。この指標は*定数畳み込み＋局所的に推論可能な*精度の妥当な代理だが、プロジェクト自身の手書き/SIG生成RBSにはほぼ非感応である。なぜならRBSは、ノードごとのスキャンがめったに確立しない型付きレシーバーの呼び出し箇所で効果を発揮するからだ。40.3%という目玉の数値は、RBSへの評決ではなく、定数畳み込み支配のフロアとして読むのが最良だ。
2. **「sig/は何も変えなかった」を「RBSは無価値だ」として提示してはならない**。チェッカーはそれを使う;カバレッジの*指標*が見ていないだけだ。調査の数値を報告するときは2つのサーフェス（surface）を区別し続けること。
3. **可能なエンジンの後続作業（未起票）:** `coverage`がRBS追加の影響を追跡することを意図しているなら、精度スキャナは囲んでいるクラスから`self`を、スコープ内のRBSからivar/param型をシードできるだろう。そうすればプロジェクトのRBSカバレッジが増えたときに指標が動くようになる——現状では動かない。変更要求ではなく観測としてここに記録する;軽量スキャンに重い推論パスを与えるコストと天秤にかけること。

---

## 4. 解決パス（2026-06-01）—— 真の根本原因と修正

§3は1層浅いところで止まっていた。`rigor type-of`と直接の`Reflection.instance_method_definition`クエリでプローブを押し下げると、実際の機構が明らかになった:

- `Buffer#demo`内の`self`は**実際に**`Textbringer::Buffer`として型付けされ（`ScopeIndexer`が`self_type`を正しくシードする）、ディスパッチャーは`Nominal`レシーバーを無条件に`RbsDispatch`へ*ルーティングする*。したがって§3の「スキャナが`self`をシードしない」は誤りだった。
- それでも`b.point_min`は、**`b`が`Textbringer::Buffer`として型付けされていても**`Dynamic[top]`を返した——そして名前的型に対するstdlibのケースも、切り分けるまでは同様だった。弁別子はself対明示レシーバーではなかった;それは**stdlib-RBS対プロジェクトRBS**だった。
- `Reflection.instance_method_definition("Textbringer::Buffer", :point_min)`は`nil`を返した。原因: `RBS::DefinitionBuilder#build_instance`が**`RBS::NoTypeFoundError: Could not find ::Textbringer`**を送出し、それをローダーのフェイルソフトな`rescue ::RBS::BaseError`が`nil`に飲み込んでいた。textbringerの`sig/`は`class Textbringer::Buffer`（および50の兄弟）を宣言するが、**`module Textbringer`を一度も宣言しない**——そのため名前空間が`class_decls`に存在せず、あらゆる定義ビルドが失敗する。`rbs validate`も同一のエラーで同じファイルを拒否する: textbringerのコミット済みRBSは**upstreamで不正**であり、Rigorだけでなく*あらゆる*RBSコンシューマー（Steepを含む）にとって不活性だ。

したがって§3のプローブはすべて「どのレシーバー上でもプロジェクトのRBSメソッドが解決しない」ことを測定していた。プローブAの+5名前的は`Buffer.new` → `Nominal[Buffer]`と`b`の読み取り（シングルトン/`.new`の処理）から来たのであり、`point_min`/`new_buffer_name`の戻り値からでは**ない**;プローブBが同一だったのも、やはり何も解決しなかったからだ。レシーバー種別というフレーミングはビルド失敗のアーティファクトだった。

### 修正（ランディング済み）

`RbsLoader.build_env_for`は今や`resolve_type_names`の前に**宣言されていない各囲み名前空間に対して空の`module`を合成する**（ADR-5のロバストネス——入力に寛容;コミット`1529b54d`）。存在しない名前だけが追加されるので、整形式なsigセットに対してはノーオペである。これにより:

| 実行 | 精密 | 名前的ティア |
| --- | --- | --- |
| コールド（sig不活性） | 40.3% | 8.1% |
| **sigライブ（修正後）** | **49.9%**（+9.6pt） | **15.0%** |

`self.point_min` / 裸の`point_min`が今や`Integer`に解決する。新しい`rbs.coverage.synthesized-namespace`の`:info`診断が合成された名前空間（`Textbringer`、`Textbringer::LSP`）を名指しするので、ユーザーはRBSが不正であることを学び、ソースでそれらを宣言できる。

### 訂正された要点

1. **40.3%というコールドの数値は、スキャナの制限ではなくビルド失敗によって押し下げられたフロアだった**。プロジェクトRBSはビルドさえできれば`rigor coverage`に*実際に*流れ込む;指標は§3が結論づけたよりRBS感応的だ。
2. **`self`/ivar/paramのフレーミング、訂正版:** `self`レシーバーは解決する（シード＋ディスパッチされる）。インスタンス変数はクラスivarインデックスが型付けしたときだけ解決する;**メソッドパラメータ**は真に不透明なケースのまま（`--params=observed`やインラインアノテーションが型を与えない限りuntyped）——§3のその部分は生き残る。
3. **長く残る教訓:**サイレントな`RBS::BaseError`のrescueは、もっともらしく見える部分的な数値の背後に、プロジェクトRBS価値の*全面的な*喪失を隠しうる。`signature_paths:`のRBSが何もしていないように見えるときは、スキャナについて理論を立てる前に`rbs validate`と`build_instance`が送出するかを確認すること。

---

## 5. カバレッジ押し上げの軌跡（何が数値を上げたか、そしてなぜか）

名前空間修正の後、「何がさらなるカバレッジを阻むのか？」は、残っている不透明ノードをすべてバケット分けすることで答えられた。順に着地した4つのレバー:

| # | レバー | `rigor coverage` | 種別 |
| --- | --- | --- | --- |
| 0 | ベースライン（sig不活性） | 40.3% | —— |
| 1 | 名前空間合成（§4） | 49.9% | エンジンのロバストネス |
| 2 | **非式ノードを指標から除外** | **62.9%** | 指標の訂正 |
| 3 | 参照型のスタブ合成（`DRb::DRbServer`、…） | 64.3% | エンジンのロバストネス |
| 4 | ブロック→ブロックなしオーバーロードのフォールバック | **65.0%** | エンジンのバグ修正 |

レバー2は単独で最大の動きであり、推論の変更では**ない**: `PrecisionScanner`は`ArgumentsNode` / `ParametersNode` / `StatementsNode` / `AssocNode` / パラメータ宣言——ランタイム値を持たない構文——を「不透明」としてカウントしていて、それらが全不透明ノードの約49%を占めていた。それらを除外すると、比率は式の精度を測るようになり、それこそが主張している内容だ。

レバー3＋4は合わせて`Textbringer::Commands`のカスケードを解放した: 単一の利用不可能な`DRb::DRbServer`参照がモジュール全体のビルドを失敗させていて（レバー3がFP安全にそれをスタブする）、`define_command`の186個のブロックを伴うself送信が、メソッドのRBSがブロックオーバーロードを宣言しないために劣化していた（レバー4——textbringer固有ではない一般的な修正）。

残りの約35%の不透明は、**untypedなルートからのDynamicカスケード**——メソッドパラメータ（`--params=observed`やRBSのparam型がなければ型なし）と型なしインスタンス変数——に加えて、RBSのないC拡張 / FFI gem依存（`curses`、`fiddle`）が支配している。それらが次のフロンティアだ;それらを閉じるにはパラメータ型推論（意図的に先送り——測定された偽陽性リスクがある）またはプロジェクト側のRBS著作が必要で、Rigorの指標/ロバストネスの修正ではない。

## 6. FPのひねり —— 不完全なRBSを持つ`attr_*`アクセサ

§5を越えて「より多くのカバレッジ」を追うと、まっすぐ偽陽性（false positive）の天井にぶつかった。`Buffer#point` / `#file_name` / `#name` / `#mode` / `#keymap`は`buffer.rb`内の`attr_reader` / `attr_accessor`で定義されているが、textbringerの`buffer.rbs`はゲッターを省略している（`name=` / `file_name=`のセッターだけを宣言している）。ソース内のメソッドスキャナが`def` / `define_method` / `alias_method`を記録したが`attr_*`マクロは記録**せず**、かつ発見済みメソッドのテーブルがファイル単位だったため、すべての`buffer.point`呼び出しが`call.undefined-method`として読まれた: **textbringer自身の型に対する167件の誤エラー**。したがって、より多くのレシーバーを`Buffer`として型付けするレバー（パラメータ推論、ivarシード）は、クリーンなカバレッジを生むのではなく、これらのFPを*増やして*いただろう。

修正（コミット`1329cca7`）はそれゆえカバレッジ修正ではなくFP修正である: `attr_*`アクセサを発見済みメソッドとして記録し、テーブルをプロジェクト全体に伝播する（プレーンな`def`はファイル単位のままなので、ADR-17のモンキーパッチ診断は変わらない）。textbringer型の`undefined-method`は**167 → 30**に下がり、正直なベースラインは328から187診断に縮んだ。カバレッジは65.0%のまま（アクセサ呼び出しは発見済みメソッドのティアを通じて`Dynamic[Top]`に解決する——精度を追加するのではなくFPを抑制する）であり、これは正しいトレードだ: **偽陽性の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>はカバレッジの数値に勝る**。コーパスへの教訓: いったんプロジェクト自身の型が型付けされると、そのカバレッジの天井はRBSの完全性によって決まり、それを越えて押すと、本物の精度ではなくRBSギャップのFPが表面化する。

---

## 再現

```sh
cd ~/repo/ruby/rigor-survey/textbringer   # commit 3f6b0d2
BUNDLE_GEMFILE=~/repo/ruby/rigor/Gemfile \
  bundle exec ~/repo/ruby/rigor/exe/rigor coverage lib --config .rigor.dist.yml
```
（rigorのFlakeシェル内で）。§3のプローブファイルは上記のスニペットから再構成できる;捨て設定の`signature_paths:`をtextbringerの`sig/`に向けてRBSをトグルすればよい。
