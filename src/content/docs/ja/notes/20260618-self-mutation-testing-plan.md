---
title: "Rigor自身のコードベースのミューテーションテスト — 計画（RSpec ∪ self-check、独立した型オラクル付き）"
description: "rigortype/rigor docs/notes/20260618-self-mutation-testing-plan.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260618-self-mutation-testing-plan.md"
sourcePath: "docs/notes/20260618-self-mutation-testing-plan.md"
sourceSha: "0c39bc6905bb8ea1af6294757ba92f72ba4894e3a672325d1d27873a7521c176"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
translationStatus: "translated"
sidebar:
  order: 20266618
---

Status: 設計ノート + 計画、2026-06-18にRigor v0.2.0（`[Unreleased]`）に対して執筆。非規範的;拘束力を持つのはADRと仕様。既存のミューテーション機構を**内向き** —— `lib/rigor/`自体へ —— に向け、実装を型に見える形**または**振る舞いに見える形で壊したときに、RigorのRSpecスイート*または*それ自身のself-checkの*いずれか*がそれを捕捉し、残余（どちらにも捕捉されないもの）を塞ぐべき実装の穴として表面化させる計画を記録する。

基礎（すべて出荷済み）: [ADR-62](../../adr/62-mutation-testing-teeth-measurement/)（内部の歯（teeth）ハーネス）、[ADR-63](../../adr/63-type-protection-coverage/)（プロダクト化されたファイルごとの有効性）、[ADR-69](../../adr/69-pluggable-mutation-substrate/)（killオラクル + サイトセレクタのシーム（seam））、[ADR-70](../../adr/70-fused-protection-coverage/)（融合した静的∪動的マップ）、[ADR-71](../../adr/71-type-guided-external-mutation-testing/)（先送りされた外部形態 + その健全性ルール）、および先行ノート[`20260613-mutation-teeth-harness.md`](../20260613-mutation-teeth-harness/) + [`20260617-type-guided-mutation-testing-strategy.md`](../20260617-type-guided-mutation-testing-strategy/)。コード: `tool/mutation/mutate.rb`、`lib/rigor/protection/{mutator,mutation_scanner,diagnostic_oracle,test_suite_oracle}.rb`、`lib/rigor/cli/coverage_mutation.rb`。

## 問い —— 同じ機構の3番目のターゲット

既存の作業は2つの異なるものを計測する;この計画は3番目を足す:

| | ミューテーションのターゲット | 生存者の意味 | ステータス |
| --- | --- | --- | --- |
| **A —— 歯ハーネス**（ADR-62） | 解析された*ユーザー*コード | Rigorの**偽陰性**（エンジンのギャップ） | 出荷済み、dev専用 |
| **B —— 融合保護**（ADR-70） | *ユーザー*のコード | ある*ユーザー*の**型∪テストのギャップ** | 出荷済み（`--with-tests`） |
| **C —— この計画** | **`lib/rigor/`自体** | *Rigor自身の*テスト**および**self-checkの穴 | 提案中 |

メンテナーの目標 ——「Rigorのコードベースをミューテーションテストして、型および／またはRSpecを介して実装の穴を塞ぐ、効率的かつ包括的に」—— は**内向きにしたProduct B**であり、self-check（`make check`）をRSpecスイートと並ぶ*2番目の*killオラクルとする。価値ある成果物はADR-70のものと同じ: ミューテーションごとに、*どの*軸が（もしあれば）それを捕捉したか。だから生存者はより安価な欠けたガードを指し示す —— **specを足す**か**型を足す / self-checkルールを鋭くする**か。

「型」＝killオラクルとしてのRigor自身の`rigor check lib`（self-check）。「RSpec」＝killオラクルとしてのRigor自身の`bundle exec rspec`スイート。この2つは互いに素なバグクラス（型の形をしたものvs振る舞いの形をしたもの）を捕捉するので、それらを融合することがスイープを**包括的**にする;カバレッジ誘導の選択 + 漸進的ショートサーキット（gradual short-circuit）がそれを**効率的**にする。

## すでに動いているもの（基礎、2026-06-18計測）

「型」の半分は**本質的にすでに出荷済み**だ —— `rigor coverage --protection --mutation`は各`lib/rigor`ファイルのミュータントを、ウォームループを介してそのクリーンなベースラインに対して再解析し、self-checkのkill率を報告する。本日計測:

```
$ bundle exec exe/rigor coverage lib/rigor/cli/ci_detector.rb --protection --mutation
  caught breakages: 3 / 4  (75.0%)
  Add a type here … lib/rigor/cli/ci_detector.rb:77
  real 1.1s          # warm loop: env+scan once, then ~ms/mutant
```

`tool/mutation/mutate.rb sweep lib/rigor`はすでにこれを生存者クラスタ化とともにコーパス規模で行っている —— それが2026-06-13ノートの`lib/rigor`スイープ（歯71.4 %）だ。**つまり`lib/rigor`の型軸は新しい作業ではない;再実行 + クラスタ化パスである**。この計画が足すデルタは、（1）**RSpec軸**、（2）**融合 + 帰属（attribution）**、（3）アナライザーのミューテーションが自身のチェッカーを壊せないようにする**独立した型オラクル**、（4）RSpec軸を手頃にする**カバレッジ誘導の選択**だ。

すでに存在するものも: 両方のkillオラクル（`DiagnosticOracle`、`TestSuiteOracle`）、サイトセレクタのシーム（`:biteable` / `:all` = `--include-dynamic`）、ウォームループ（`LanguageServer::ProjectContext`）、そして**miseでshimされたPATH上の安定版`rigor`**（0.1.18、0.2.0ワークツリーから独立）—— メンテナーが提案した分離されたオラクルはすでに存在する。

## 唯一の真に新しい制約 —— ブートストラップハザード

Product B（ユーザーコード）では、型オラクルはユーザーのミューテートされたバイトを解析するRigorの*自身の健全な*エンジンだ。Product Cでは、ミューテートされたバイトが**エンジンそのもの**だ。もし型オラクルがワークツリー自身の`exe/rigor`（ミューテートされた`lib/rigor`をロードする）だったら、ミューテーションがチェッカー自体を壊しかねない —— 良くてクラッシュ（情報量のないkill）、悪くて静かに誤ったオラクル（偽の生存者 / 偽のkill）。**型オラクルは独立したRigorでなければならない（MUST）**。2つの方法があり、実際のトレードオフを伴う:

- **(a) mise / リリース版`rigor`**（メンテナーの提案）。真に独立で、常に利用可能、決して壊れない。*コスト*: バージョンスキュー —— リリース版オラクルはワークツリーの開発中の診断ルールを欠くので、*新しい*ルールが捕捉するであろうミューテーションが型生存者として読まれる（そのオラクルにとっては実際そうだ）。ロバストネス / ファズには問題ない;新しいルール上の歯を過小評価する。
- **（b）ワークツリー自身の`HEAD`の汚れのないスナップショット**を別のプレフィックスにビルドしたもの（クリーンな`git worktree` / ビルドされたgem）。開発中のものとルール単位でパリティ;ミューテーションは*チェック対象のコピー*にのみ適用され、オラクルには決して適用されない。*コスト*: 新しく追加されたルールを計測するときオラクルを再ビルドしなければならない。

**推奨:**「自分のself-checkルールは歯を持っているか」が要求するパリティのために**(b)**をデフォルトにする;正確なルールパリティが問題にならないブロードファズ / ロバストネス実行のための安価で常時オンのフォールバックとして**(a)**を保つ。いずれにせよオラクルは**サブプロセス**（`rigor check <file> --format json --no-cache`）なので、ドライバプロセスはミューテートされたコードをロードする必要が決してない。この不変条件を起動時セルフテストで守る: `oracle_rigor_path`がワークツリーの内側にないこと、そしてチェッカー内部のファイルをミューテートした後もオラクルが依然動くことを確認する。

**RSpec軸には特別な扱いに値するブートストラップハザードがない**: 古典的なミューテーションテストとまったく同じく、ミュータント*が*テスト対象システム（SUT）だ。それはミューテートされたディスクバイトをロードする新鮮な`rspec`サブプロセスで走る;長命なドライバは起動時にクリーンなRigorを一度ロードしており、一時的なディスク上の変更の影響を受けない（起動時に`lib/rigor`をeager-loadするので、遅延`require`が実行中にミューテートされたファイルを引き込まない）。

## アーキテクチャ

```
driver (worktree tool/mutation/, loads clean Rigor once)
  ├─ Mutator (lib/rigor/protection/mutator.rb)   ── reused; + semantic operators (new)
  ├─ type oracle  = subprocess: <independent rigor> check <mutant> --format json   (decoupled)
  └─ test oracle  = TestSuiteOracle, runner = `bundle exec rspec <coverage-selected specs>`
                    in RIGOR's OWN bundle (NOT with_unbundled_env — see gotcha)
fused classify per mutation: type-killed | test-killed | unprotected(+crash bucket)
```

融合分類はADR-70の漸進的ショートサーキットを再利用する: **まず型オラクルを試す**;型生存者だけが（高価な）テストオラクルに到達する。ある行が実装の穴であるのは、**どちらの**軸もそのミュータントをkillしないとき、かつそのときに限る。

## 効率 —— 80 %はテスト選択であり、健全なレバーはカバレッジ

ミューテーションのコストはスイート実行であって、ミュータント生成ではない。ミュータントごとにRigorのおよそ6,300例のスイートを走らせるのが`mutant`の墓場だ。レバーを順に挙げる:

1. **漸進的ショートサーキット（無償、ADR-70）**。self-checkがkillするミュータントはspecを決して走らせない。`lib/rigor`では型軸がすでにおよそ70 %+をkillするので、テスト軸は残余にのみ走る。
2. **カバレッジ誘導のテスト選択 —— ロードベアリングな効率化の一手**。`lib/rigor/foo.rb:42`でのミューテーションには、42行目を*実行する*specだけを走らせる。転置インデックス`{lib_file:line → [spec_files]}`を一度構築する（スイートはすでに`spec_helper.rb`の`COVERAGE=1`下で`Coverage.start(lines: true)`をサポートする;specファイルごとに走らせるか、ファイル粒度のカバレッジで一度走らせる）。これは**ランタイムカバレッジであって、静的依存グラフではない** —— ADR-71 §critical-3は、テスト*選択*のための静的グラフが過大近似し、さらに悪いことに**偽の生存者**を製造する（テストが実際に行使するメタプログラミング / `send`の経路を見逃す）と明言している。Rigor自身のスイートには健全な選択は明白だ: カバレッジを使う。まず規約ティア（`lib/rigor/a/b.rb` → `spec/rigor/a/b_spec.rb`）、精密なフォールバックとしてカバレッジインデックス。
3. **最初の失敗で停止**。1つの赤いカバーするspecがミュータントをkillする;残りは走らせない。
4. **CI向けのdiffスコープ実行**。PRでは、変更された`lib/`ファイルだけをミューテートし（`changed_ruby_files`ヘルパーはすでに存在する）、それらのspecをカバレッジ選択する ——「すべてのPRで走らせられるミューテーションテスト」、ADR-71の生き残ったくさびであり、ここでは*Rigor自身の*リポジトリだから正当化される（外部プロダクトのサポート負担がない）。最初はアドバイザリーで非ブロッキング。
5. **ミュータントごとのタイムアウト**（ミューテーションは無限ループを誘発しうる）—— `tool/mutation`のファズモードはすでにタイムアウトの配管を持つ。

## 包括性 —— 振る舞い軸のための意味的オペレーター

出荷済みのオペレーター（`nil_inject` / `type_swap` / `undefined_method` / `arity_extra`）は**診断ルール**を引っかけるよう設計されている —— 型軸には適切だが、RSpec軸には薄い（`undefined_method`は保証された`NoMethodError`へとリネームし、それはどのアサーションよりも前にクラッシュする: 情報量の低いkill）。「自分の*テスト*は歯を持っているか」のためには、ADR-69の**オペレーターシーム**の背後に足された、古典的な**実行可能で振る舞い的に区別される**オペレーターが要る:

- 関係 / 等価の反転（`<`↔`<=`、`>`↔`>=`、`==`↔`!=`）、真偽（`&&`↔`||`）、真偽性（`true`↔`false`、条件の否定）、
- 算術（`+`↔`-`、`*`↔`/`）、リテラル / 定数の微調整（`n`→`n±1`、`0`↔`1`、`""`/`nil`）、
- 文 / `return` / 引数の削除。

**型軸では型認識フィルタを保つ**（biteableなサイトだけが型killされうる;ADR-62のノイズ除去が成り立つ）。**RSpec軸では型で*フィルタしない*** —— 型を変えないミュータントこそ、スイートが捕捉せねばならない振る舞いの形をしたバグだ —— が、等価ミュータントのノイズを削るために非挙動的な領域（loggingの文字列、`frozen_string_literal`、コメント）は除外する。正直に注記する（ADR-62のフレーミング）: 型束（type lattice）はそれ自身の一片についてのみ等価性を証明する;支配的な等価ミュータントのクラス（決してヒットしない境界、可換な並べ替え）は意味的であり、自動的な穴ではなく裁定を要する生存者として現れる。

## 段階的計画（易しい順;再利用vs新規）

| # | フェーズ | 再利用 | 新規 |
| --- | --- | --- | --- |
| 1 | `lib/rigor`上の**型軸ベースライン + バックログ** | `mutate.rb sweep`（機構全体） | 再実行 + 生存者のクラスタ化（2026-06-13のバックログ、v0.2.0で更新） |
| 2 | **独立した型オラクル**（分離） | `DiagnosticOracle`の形 | mise / クリーンHEADのrigorへのサブプロセスオラクル + 非ワークツリーの不変条件セルフテスト |
| 3 | **意味的オペレーター** | オペレーターシーム（ADR-69） | 上記のオペレーターセット + 非挙動領域の除外 |
| 4 | **RSpec軸 + カバレッジ選択** | `TestSuiteOracle` | `{line→specs}`カバレッジインデックス、規約ティア、最初の失敗で停止、自前バンドルのランナー |
| 5 | **融合 + 帰属 + CI** | `FusedProtection*`のアキュムレータ / レンダラー、`changed_ruby_files` | `lib/rigor`全体にわたるサイトごとの`add-a-spec / add-a-type`帰属;diffスコープのアドバイザリーCIジョブ |

フェーズ1は今日実行可能で、即座に価値を生む（self-checkの穴リスト）。フェーズ2〜4は独立で任意の順に着地できる;フェーズ5が見返りだ（融合マップ）。

## Gotchas / リスク（構築前に記録）

- **Bundler環境の乖離（ADR-70の逆）**。`TestSuiteOracle#shell_run`はコマンドを`Bundler.with_unbundled_env`で包む、なぜなら*ユーザー*プロジェクトではSUTのバンドル ≠ Rigorのバンドルだからだ。Rigor自体をミューテートする場合、SUTのバンドル**が**Rigorのバンドルだ —— unbundleすると`bundle exec rspec`が壊れる。スイートを**Rigor自身のバンドルで**走らせるカスタムな`runner:`を注入する（またはフラグを足す）。具体的で、間違えやすい。
- **ディスク書き込みの安全性**。テスト軸はミュータントをディスク上の`lib/rigor/…`に書き込み、`ensure`で復元する;スイート途中の割り込みはミュータントを残す。スイープ全体を**専用の`git worktree`**で走らせ（作業クローンが決して触られないように）、中断時にファイルを`git checkout`する`trap`を足す —— 既存の`ensure`の上のベルト＆サスペンダー。
- **ロード時クラッシュ ≠ 歯**。`lib/rigor`の*ロード*を失敗させるミューテーションは、すべてのspecをエラーにし（自明な「kill」）、型オラクルのサブプロセスをクラッシュさせる。これらは**`crash`クラス**としてバケツ分けする（ファズモードのゼロクラッシュ結果のような、ロバストネスのシグナル）—— 意味あるテスト / 型killではなく、実装の穴でもない。
- **`runner_pool_spec`の除外**。これは自身のプロセスとして走り（`make test-ractor-pool`、デフォルトスイートから除外）、ワーカー / Ractorを生成する —— ミュータントごとの選択に決して含めない;カバレッジスコープの選択は自然にそれを避ける。
- **オラクルのバージョンスキュー**（上記フェーズ2の決定）—— ルールパリティにはクリーンHEADスナップショット、可用性にはmiseリリース。
- **エンコーディング**。FlakeのUS-ASCIIデフォルト外部エンコーディング下で非ASCIIファイルをバイトスプライシングすると例外が上がる —— ソースを`Encoding::UTF_8`として読む（`mutate.rb`ですでに処理済み）。
- **self-checkのベースラインはクリーン**（`make check`はゲートでありゼロを保つ）なので、型軸のベースラインは空だ —— どの新しい診断も明白にkillである。差し引くべきベースラインドリフトはない。

## ADRとの関係

これは戦略ノートのプロダクト分類体系における**C**だ: ADR-69のシームとADR-70の融合マップを再利用し、ADR-71の*内部ターゲット*の姉妹である —— だが**ADR-71の先送りから逃れる**、なぜならADR-71が先送りしたのは*外部の汎用*ツール（他人のスイート上での80 %のテストランナーの墓場）だったからだ。Rigor自身のリポジトリに向けると、80 %は単に*我々の*スイートであり、テスト選択のレバーは明白に健全（静的グラフではなくカバレッジ）で、外部のサポートサーフェスがない —— まさにADR-71がくさびに必要だと述べた条件だ。これはADR-50の凍結されたパブリックサーフェスからも外れている（ADR-62 WD4のような開発ハーネス）。もし内向きの融合マップがその価値を証明すれば、将来のADR（「`lib/rigor`のセルフミューテーションテスト」）の材料になる;それまでは、このノートが生きたトラッカーだ。

一行の要点: **型の半分はすでに出荷されている;新しい作業はRSpec軸 + カバレッジ誘導の選択 + 独立した（mise / クリーンHEAD）型オラクルであり、これらを融合してRigor自身の実装の穴のサイトごとの「specを足す / 型を足す」マップにする**。

## 最初の実装 + 実行（2026-06-18）

フェーズ1、3（既存のオペレーター）、4（ティア0選択）が最初のカットとして着地した: `tool/mutation/self_mutate.rb` —— `Protection::{MutationScanner, TestSuiteOracle}`の薄いドライバで、Product C固有の2つの部品（**in-bundle**のテストランナー;**規約**によるspec選択`lib/rigor/a/b.rb → spec/rigor/a/b_spec.rb`）と、ディスク復元の安全性（ダーティツリーガード + `at_exit` / シグナルでの`git checkout`）をちょうど足す。型オラクルはインプロセスのワークツリーエンジンだ —— ここで再考し健全だと確認した: エンジンはクリーンに一度ロードされ、ミューテーションは常に解析される*入力*でしかない（型軸はディスクに決して書き込まない）ので、ブートストラップハザードはこの融合計測に噛みつかない。独立した（mise / クリーンHEAD）オラクルは、ブロードファズ / ロバストネスのバリアントには依然として正しい一手のままだ。

**型軸のバックログを更新**（`mutate.rb sweep lib/rigor --per-file 8`）: 310ファイル、1,751ミュータント、**歯73.4 %**（2026-06-13には71.4 %だった）、465生存者 —— トップクラスタは依然として先送りされたADR-24のセルフドッグフードのもの（`Type::Constant#value` 37、`MethodCatalog`シングルトン）。

**融合軸は動作し、本物の穴を見つける**。`ci_detector.rb`: 型kill 3、テストkill 14、**穴0**（融合100 %）—— テスト軸は型チェッカーにはできない`Dynamic`サイトのミューテーションを本当にkillする。`trinary.rb`: 専用の`trinary_spec.rb`が行使しなかった**9つの未保護サイト**を表面化させた —— `#hash` / `#to_s` / `#inspect`、`new(:invalid)`の`ArgumentError`、そして`coerce`の`TypeError`分岐（非Trinaryとの`#and` / `#or`を介して到達する）。すべて、デッドコードではなく本物の欠けたテストとして裁定された;ハーネスは正しく`.from_symbol(:wat)`をフラグし**なかった**（すでにテスト済み）。**ループを実証**: 欠けていた4つの`trinary_spec.rb`の例を足すと、`trinary.rb`は**穴0 / 100 %**へ駆動された（テストkill 12 → 21）—— 発見 → 修正 → 再計測kill。

ついでに確認された: **bundler環境の乖離**は本物でロードベアリングであり（`with_unbundled_env`ランナーはRigor自身のスイートで`bundle exec rspec`を失敗させる —— in-bundleランナーが必須）、**スコープ化されたspecの完全性に関する注意**が成り立つ（穴は*規約*specに対して相対的だ;より広いスイートがそれをカバーするかもしれない —— ティア1のカバレッジインデックス化が洗練だ）。`tool/**`はrubocop除外なので、開発ハーネスは姉妹の`mutate.rb`と同様にlintゲートから外れている。

**残り（計画から変更なし）:**意味的オペレーター（フェーズ3本体 —— 現在のセットは実行可能だが診断の形をしている）、`{line → specs}`カバレッジインデックス（フェーズ4ティア1、規約による選択を置き換え完全性の注意を修正するため）、独立したサブプロセスオラクル（フェーズ2）、そしてdiffスコープのアドバイザリーCIジョブ（フェーズ5）。

## ツリー全体のカバレッジギャップ・バックログスイープ（2026-06-18）

ミュータントごとの融合モードはツリー全体にスケールできない（各型生存者は新鮮な`rspec`を起動する;プロセス起動が支配的になる）。効率的なパス —— `self_mutate.rb --coverage-gap` —— は、安価なインプロセスの型生存者を、ワンショットの**スイート行カバレッジインデックス**（`spec_helper`からの`COVERAGE_JSON`、完全な逐次スイートを一度: 309ファイル、23,530の実行されたlib行）に対して分類する。コードをスイートが一度も走らせなかった型生存者は、`rspec`実行**ゼロ**の高信頼な穴だ。スコープ: 400 LOC以下の276の`lib/rigor`ファイル（34のより大きなエンジンファイルは先送り —— `:all`の再解析コストはディスパッチサイト数に比例する）。

**裁定が指標を二度ノイズ除去した —— ロードベアリングな方法論の教訓**。生の結果は驚くべきもので、かつ誤っていた:

| 分類器 | 「穴」 | それが何だったか |
| --- | --- | --- |
| 生の行カバレッジ | **1,969** | ほとんど偽 |
| + メソッドコールドネス | 214 | defレベルのアーティファクトを除去 |
| + クラスボディ除外（defアンカー） | **22** | 信頼できる |

2つのカバレッジのアーティファクト、どちらもカウントを信頼するのではなく*トップの生存者を読む*ことで見つかった（ADR-62の「裁定せよ、仮定するな」の規律）:

1. **複数行式の帰属**。Rubyの行カバレッジは複数行式の実行をその*最初の*行に計上するので、式が走っていても継続行が未カバーと読まれる —— `Diagnostic#to_h`はテストされているのに、そのハッシュリテラルのエントリー行（144〜149）はすべてフラグされた。**メソッドコールドネス**にアンカーすることで修正した: 穴は、囲む`def`が*完全に*未カバーのとき（決して走らないメソッド）のみであり、だからウォームメソッド内のすべてのサイトはカバー済みだ。
2. **クラスボディのデータ定数**。`bundle_sig_discovery`の標準ライブラリ名のフリーズされた`Set[…]`、`method_parameter_binder`の`RBS_TYPE_PROVIDERS`のラムダのハッシュ、ビルトインカタログの`for_topic`定数 —— すべてアンカーすべき`def`なしに（1）を被り、ロジックではなく*データ*だ。除外: 囲む`def`を持たないサイトは決して高信頼な穴ではない。（シグナルが信頼できるのはメソッドボディの内側だけだ —— 我々が行動するバックログのための精度 / 再現率のトレードオフ;ウォームメソッド内のコールドな*分岐*は`needs-verification`層に属する。）

**結果 —— 小さいファイルのコアはメソッドレベルで完全**。22の信頼できる穴はすべて**単一の**ファイル`lib/rigor/cli/mcp_command.rb`（ADR-33のMCPコマンド）にあった: その`#run` / `#parse_options`にはユニットspecがまったくなかった。他のすべての400 LOC以下の`lib/rigor`ファイルには、完全にコールドな型盲目のメソッドはない —— Rigorのユニットスイートは本質的にすべてのメソッドを行使する（上記の`trinary`のギャップはその数少ない例外で、いまや解消済み）。**ループをクローズ**: 5例の`spec/rigor/cli/mcp_command_spec.rb`（オプションパース + `run`のトランスポート検証 / 使用法エラー分岐;長命なstdioサーバーループは統合テストの領域で、意図的にユニットテストしない）が`mcp_command.rb`を**コールドメソッドの穴0**へ駆動した。

**`needs-verification`フロンティア（約10.5k）**。*カバー済み*の行の上の型生存者 —— カバー済み≠アサート済み。これはより大きなテスト*有効性*のギャップ（specが行を走らせるがどのアサーションもミューテーションを捕捉しない）だが、本物のコールド分岐のギャップと同じ複数行アーティファクトの混合であり、その裁定には高価なファイルごとの融合`rspec`パス（`trinary`パターン、ファイル単位で実行）が要る。ツリー全体への一斉投入ではなく、的を絞った融合実行に先送りした。

**ツリー全体の完了**。400 LOC超の34のエンジンファイル（3,387 LOCの`statement_evaluator`、`scope_indexer`、`scope`、プラグインコアを含む）も同じ方法でスイープした: **コールドメソッドの穴0**。つまり全310の`lib/rigor`ファイルにわたって、defアンカーのコールドメソッドのギャップは`cli/mcp_command.rb`と`trinary.rb`だけだった —— どちらもいまやクローズ済み。**Rigorのユニットスイートはメソッドレベルで完全**だ: `lib/rigor`のすべてのメソッドが何らかのspecによって実行される。（型盲目メソッドのバックログは安価で高信頼な層であり、いまや枯渇した。）

**先送り:** `needs-verification`の裁定（カバー済みだがアサートされていない有効性フロンティア —— ファイルごとの融合実行、下記で実証）、および上記のフェーズ2/3/4-ティア1/5の項目。

## 有効性層の裁定 —— ファイルごとの融合（2026-06-18）

コールドメソッド層が枯渇したいま、残るシグナルは`needs-verification`フロンティアだ: *カバー済み*の行の上の型生存者 —— specが行を走らせるがどのアサーションもミューテーションを捕捉しない。ファイルごとの融合モードはそれを直接裁定する（型パス、それから各型生存者に対するカバーするspec;両方の生存者が本物の有効性のギャップだ）。最初の実例、`type/integer_range.rb`（クリーンな値オブジェクト）vs `integer_range_spec.rb`:

- 当初**11の未保護**（型kill 8、テストkill 34、融合**79.2 %**）。
- 裁定: `#finite?`（L54）と`#cardinality`（L58）は本当にアサートされていないパブリックなロジックメソッドだった —— specはレンジを構築し、構築 / `describe` / `covers?` / 受理をテストしたが、有限性や整数のカウントを決してアサートしなかった。`#inspect`（L116）も同様。`validate_bound!`の生存者（L35〜36）は**ラベル文字列引数**（`"min"` / `"max"`）だ —— *エラーメッセージのテキスト*だけをミューテートするもので、それをRigor自身の規律は契約ではなく表示として扱う —— すなわち**等価ミュータント**であり、正しく残された。
- 3つの本物のギャップ（`finite?` / `cardinality` / `inspect`の例）をクローズ → **4の未保護、92.5 %**（テストkill 34 → 41）。残る4はまさにメッセージテキストのラベルミューテーションだ —— 有効性層はゼロではなく、クリーンな等価ミュータントのフロアに収束する。

これはコールドメソッド層と同じ発見 → 裁定 → 修正 → 再計測のループだが、裁定はより鋭い: ほとんどの`needs-verification`の生存者は等価ミュータント（メッセージテキスト、可換な並べ替え）かより広いspecでカバーされているかのどちらかなので、この層はツリー全体をスイープする（ほとんどノイズを数えることになる）のではなく、**ファイルごとに需要に応じて**進められる。ハーネスはファイルごとの未保護リストを与える;本物か等価かは人間が決める。

2番目のバッチは8つの中核ファイルを一度に融合した（`type/{tuple,hash_shape,difference,accepts_result,bound_method}`、`inference/synthetic_method`、`analysis/{baseline,dependency_recorder}`）: 型kill 111、テストkill 381、**35の未保護**。本物のロジックのギャップを裁定しクローズした:

- `analysis/baseline.rb`（13 → 1）: ユーザー向けの`.rigor-baseline.yml`ローダーの不正入力サーフェス —— 非Hashのトップレベル、非Arrayの`ignored:`、非Hashの行、欠けた`rule:`、不正な`message:`正規表現、メッセージモードの`to_yaml`ラウンドトリップ。このパスは*アサーション不足の既存テスト*も捕捉した（未知の`match_mode`はエラークラスだけをチェックしており、メッセージテキストのミューテーションを生かしたままにしていた）—— 複製ではなくその場で強化した。残る1 = `#filter` / `#audit`内のメッセージモードの`bucket_key`分岐。
- `inference/synthetic_method.rb`（4 → 0）: `method_name`と`provenance`の検証分岐（`class_name` / `return_type` / `kind`はすでにテスト済み）。
- `type/difference.rb`（4 → 1）: `#dynamic`（束のデリゲート）には呼び出し元がなかった;残る1は`#inspect`のデバッグフォーマットのサイトだ。

低価値の残余として文書化して残した（クローズせず）: キャリア（carrier）の`#inspect` / `describe(:short)`のデバッグフォーマットのサイト（`tuple`、`bound_method`、`accepts_result`、`difference`）と`hash_shape`のraise分岐 —— デバッグ文字列をピン留めするのは脆く、inspect / メッセージのテキストは契約ではない（同じ偽陽性の規律を、テスト記述に適用したもの: 指標を動かすためだけに低価値のアサーションを足さない）。`dependency_recorder`はすでに0だった。

**このセッションの累計:** `trinary`（9 → 0）、`cli/mcp_command`（22 → 0、新規spec）、`type/integer_range`（11 → 4-等価）、`analysis/baseline`（13 → 1）、`inference/synthetic_method`（4 → 0）、`type/difference`（4 → 1）。ツリー全体のコールドメソッドバックログは空;有効性層はファイルごとに各々を裁定するワークフローだ —— ほとんどの生存者は等価ミュータント（メッセージ / inspectテキスト）、より広いspecでカバーされているもの、またはいまやクローズされた本物のギャップだ。各層はゼロではなく等価ミュータントのフロアに収束する。

## 有効性層の裁定 —— ファイルごとの2回目のバッチ（2026-06-18）

ロジックを持つ6ファイルへのさらなるパス;同じ発見 → 裁定 → 修正 → 再計測のループで、6つすべてspecのみ（`lib/`の変更なし）、`make verify`はグリーン:

- `analysis/run_stats`（6 → 0）: Linuxの`/proc/self/status`の`VmHWM:`パーサ（`read_vmhwm_from_proc`）—— 既存の`.peak_rss_bytes`テストは非負整数しかアサートしないので、行フィルタ・桁抽出・kB→バイトのスケールがLinux CI上でさえ生き残った。スタブ化した`File`のユニットテストで*正確な*パース値（および読み取り不可 / `VmHWM`なしのnil経路）をアサートしてクローズ。
- `analysis/fact_store`（11 → 0）: 3つの未テストの検証分岐（`Fact.new`の不正なバケット、`join`の非FactStoreガード、`normalize`の非`Fact`要素 —— raise経路でミューテートされた`.class` / `.inspect`は`NoMethodError` ≠ `ArgumentError`を投げるので、素の`raise_error(ArgumentError)`がそれらをkillする）、まったく未テストの`with_local_fact`、`==` / `eql?` / `hash`の値等価の契約、そして意図的な文字列バケットの`to_sym` / `map(&:to_sym)`強制変換の寛容さ。
- `type/app`（2 → 0）: `accepts`（`bound`に委譲 —— `Inference::Acceptance.accepts`に対してピン留め）と`reduce`（デフォルトfuelの配線を持つレジストリに委譲 —— fuelを記録する最小のフェイクレジストリでピン留め）。
- `inference/synthetic_method_index`（4 → 0）: `knows_class?`（`name.to_s`の強制変換を含み、Symbol引数で行使）と`to_h`のシリアライゼーション —— どちらも未テスト。
- `inference/indexed_narrowing`（6 → 0）: `.lookup_for_call`と`.invalidate_chain_after_call`は統合フィクスチャ経由でのみ行使され、ユニットspecでは行使されていなかった;直接のユニットケースを追加（安定した`receiver[key]`のルックアップ + 非`[]` / 複数引数 / ナローイングなしのnil;安定したレシーバー上でのチェインナローイングのドロップ + 不安定な外側レシーバーのno-op）。
- `inference/multi_target_binder`（4 → 1-等価）: ADR-57のオプショナルスロットの軟化（`X | nil`スロット → 非nilの構成要素）が未テストだった。残る`:111`の`slot_type`サイトは**確認された等価ミュータント**だ —— それはrestなしの`backs`ブロックに存在するが、`back_count = rights.size`およびsplat後の`rights`が非空になるのは`rest_present`のときだけなので、そのブロックは`Array.new(0){…}`であり決して走らない。
- `inference/hkt_body`（16 → 0）: `HktBody`の`Data.define`ノードコンストラクタは部分的な検証カバレッジしか持たなかった —— ハッピーパス + `*-non-empty` / 名前空間付きガードはテストされていたが、`*-must-be-an-Array` / `*-must-be-a-Symbol` / `*-must-not-be-nil`ガードはテストされておらず、`TestEquality`にはdescribeブロックがまったくなかった。欠けていたガードケースを追加（ファイル既存のメッセージフラグメントのスタイルに合わせて —— ユーザー向けの検証メッセージ、弁護可能な契約）;メッセージフラグメントのアサーションは`type_swap`-on-raiseのメッセージ引数ミュータントもkillする。

`inference/{budget_trace,struct_fold_safety,closure_escape_analyzer,rbs_type_translator}`、`analysis/incremental`、`type/intersection`は計測され、そのフロアに残された（すでに100 %、あるいは`percentile`の`hist.keys.max`防御的フォールバックのみ —— これは最近接ランクのループが返り損ねたときにのみ到達するが、`rank = ceil(fraction·total) ≤ total`がそれを不可能にする —— と`inspect` / `describe(:short)`のデバッグフォーマット残余）。

## 有効性層の裁定 —— ファイルごとの3回目のバッチ（2026-06-21）

ロジックを持つ8ファイルへの融合バッチ（`builtins/regex_refinement`、`analysis/self_call_resolution_recorder`、`config_audit`、`configuration/severity_profile`、`environment/lockfile_resolver`、`environment/rbs_coverage_report`、`flow_contribution/fact`、`inference/coverage_scanner`）。6ファイルはすでに100 %;8つの生存者が2ファイルにクラスタ化した。どちらもspecのみの修正、`make verify`はグリーン:

- `config_audit`（6 → 0）: `explicit_path_warnings`の3つの`add_missing_dir` / `add_missing_file`の呼び出しサイト。テストは各警告の`kind`と（`is not a directory` / `does not exist`という）ディスクリプタの部分文字列をアサートしていたが、メッセージに埋め込まれたconfig-keyラベル（人間が読める`"bundler.bundle_path"`等）はアサートしていなかった。そのため`:bundler_bundle_path` / `:bundler_lockfile` / `:rbs_collection_lockfile`というKEY引数（`nil_inject` / `type_swap`）が生き残った —— `kind`シンボルは`find { kind == … }`ルックアップですでにピン留めされていたが、メッセージキーはされていなかった。3つのアサーションにkeyラベルの`include`も追加した（+ `rbs_collection.lockfile`ケースの欠けていたメッセージアサーション）。
- `environment/lockfile_resolver`（2 → 0）: 防御的なrescue分岐内の2つの`warn`サイト —— `parse`の`rescue LoadError`（bundlerが利用不可）と`do_parse`の`rescue StandardError`（パーサが例外を発生させる）。どちらも決定論的に駆動されていなかった: テスト環境ではbundlerは常にロード可能であり、壊れたボディの失敗モードはBundlerのバージョンに依存する（既存の「本当に壊れたlockfile」ケースは現行のBundlerでは例外を発生させずにパースされ、`warn`に到達しない）。2つのスタブ化したテストが各分岐を強制的に通過させ（`Bundler::LockfileParser.new`が例外を発生させる;`described_class.require("bundler")`が`LoadError`を発生させる）、stderrの警告（パス + エラークラス）をアサートして`undefined_method`ミュータントをkillする。

`builtins/regex_refinement`、`analysis/self_call_resolution_recorder`、`configuration/severity_profile`、`environment/rbs_coverage_report`、`flow_contribution/fact`、`inference/coverage_scanner`はそのフロアで計測した（すでに完全に保護済み）。

2026-06-21の2回目のバッチは8ファイルをさらに計測した（`builtins/predefined_constant_refinements`、`builtins/static_return_refinements`、`configuration/dependencies`、`environment/class_registry`、`environment/reflection`、`flow_contribution/conflict`、`flow_contribution/merge_result`、`inference/builtins/method_catalog`）—— 4ファイルがゼロにクローズ、残りはフロア、すべてspecのみ、`make verify`はグリーン:

- `inference/builtins/method_catalog`（ノイズ除去後4 → 0）: `resolve_alias_entry`のパス全体（エイリアスセレクタを正規ターゲットに対応付ける`aliases`セクション）と`reset!`が未行使だった。また`safe_for_folding?`をゲートする`FOLDABLE_PURITIES` Setがピン留めされていなかった（`dispatch`のpurityはfoldしない一方で、leaf / trivial / leaf_when_numericのfoldをアサートするテストがなかった）。一時的なYAMLカタログ（`with_catalog`ヘルパー経由 —— `around`+`@path`ではなく、これは`RSpec/InstanceVariable`に引っかかる）がエイリアスのヒット・ダングリングターゲットとシングルトンバケットの非解決・`reset!`・foldableなpurityごとに1つのメソッド + 非foldableなメソッドを駆動する。行27の`Set[...]`定数はノイズ除去ルールでデータとして扱われるが、振る舞いをゲートしていたので、purityの契約をピン留めする価値はあった。
- `environment/class_registry`（5 → 0）: `register`の2つのガードraise（Moduleでないものがクラスに名前を付ける;匿名の名前のないクラス）と`class_ordering` / `normalize_name`のパス全体（equal / subclass / superclass / disjoint / unknown、さらに先頭の`::`のストリップとSymbolの強制変換）が未テストだった —— specは`registered?` / `nominal_for_name`しかカバーしていなかった。`register`のテストはフリーズされていない新しい`new`レジストリを使う;orderingは`default`のビルトインを使う。
- `flow_contribution/conflict`（1 → フロア）: `to_h`は各provenanceを`p.to_h`（それが応答する場合）、そうでなければ`p.to_s`としてシリアライズする;`to_s`フォールバック（`#to_h`を持たないprovenance）が未テストだった。残る行68の`require_relative "../analysis/diagnostic" unless defined?(…)`は等価ミュータントだ —— テスト内ではDiagnosticはすでにロード済みなので、ガードがショートサーキットしrequireは決して実行されない。
- `environment/reflection`（1 → 0）: `freeze_set`の`else raise ArgumentError`ガード（`known_class_names`がSet / Array / Hash以外）が一度も駆動されていなかった —— `for_project`は常にSetを渡す。直接構築ケースがraiseをアサートする（型を指定して）とともに、Array→フリーズされたSetのハッピーパスもアサートする。

`predefined_constant_refinements`の`inspect_runtime_string`の行114の`name.split("::")`への`nil_inject`は**等価ミュータント**だ: `split(nil)`は空白で分割するが、テスト入力（`"Ruby::VERSION"`等）では`const_defined?` / `const_get`が`"::"`を自身でパースするので、解決は同一になる;これを区別するには、`inherit=false`依存の定数という作為的な（脆く低価値な）テストが要る。`static_return_refinements`、`configuration/dependencies`、`flow_contribution/merge_result`はそのフロアで計測した。

## 4回目のバッチ + CLIオーケストレーションのintegration-blindnessの発見（2026-06-21）

4回目の融合バッチ（11ファイル: `analysis/.../walker`、6つの`cli/*_command`、`environment/{bundle_sig_discovery,rbs_collection_discovery}`、`flow_contribution`、…）は**231の穴**を返した —— だが**本物のユニットギャップは2つだけ**だった。支配的な発見は方法論的なものだ:

**融合ハーネスのファイルごとのテスト軸は、規約でマッピングされた*ユニット*specのみを走らせる（`lib/rigor/cli/X_command.rb → spec/rigor/cli/X_command_spec.rb`）、統合 / CLIディスパッチャーのspecは決して走らせない**。CLIコマンドオブジェクトはオーケストレーションであり、その`run`経路は意図的に*ディスパッチャーを通じて*行使される（そして精度パスには`make coverage`）。ユニットspecは1つのモードにスコープされている。だからあるコマンドの他のモードの分岐は「未保護」と読まれるが、統合specがそれを駆動している。`cli/*_command`の約190のサバイバー（`#puts` / `#usage_error`のhelpとメッセージ行、`docs` / `plugin` / `skill` / `trace` / `triage` / `show_bleedingedge`のモード固有のディスパッチ）は**大半がこのintegration-blindnessであり、本物のユニットギャップではない** —— それらを一括でクローズすると統合カバレッジを複製することになる（偽陽性の規律をテスト記述に適用したもの: 「指標を動かすために低価値なアサーションを足さない」）。ユニットセーフティネットとして価値ある選択的例外はコマンドの*デフォルト*モードだ:

- `cli/coverage_command`（37 → 2）: **デフォルトの型精度**モードと**静的Tier 1の`--protection`**モードにはrspecのセーフティネットがなかった（ユニットテスト済みだったのは`--protection --mutation` / `--with-tests`のみ）、そのため実行ディスパッチ全体が生き残った。精度と静的保護のケースを追加し、両方の`--threshold`の終了パスも含む。残る2つの`.on`の`nil_inject`サバイバーはフラグの**ヘルプテキスト**のミューテーションだ（フラグ*名*は通過するフラグテストでピン留めされている;説明は振る舞い的にアサートされない）—— 等価ミュータントのフロア。
- `analysis/.../walker`（2 → 0）: 純粋なロジックファイル（オーケストレーションではない）、本当にユニットテスト可能 —— 2つの不透明なレシーバーの`walk_children`フォールバック（`descend_class_or_module`のボディなし / 動的に名付けられたクラス上;`class << expr`でexpr ≠ selfのときの`descend_singleton_class`）が未テストだった。フェイクgemのケースを追加。

`environment/{bundle_sig_discovery,rbs_collection_discovery}`と`flow_contribution`はそのフロアで計測した。**今後のバッチへの教訓: `cli/*_command`のサバイバーはギャップとして扱う前にディスパッチャー / 統合specに照らしてトリアージする;コマンドの未テストの*デフォルト*モードにのみユニットテストを追加し、メッセージ / helpの末尾には追加しない**。

## 5回目のバッチ —— inferenceエンジンファイル（2026-06-21）

9つのinferenceエンジンファイル;41の穴、HKT（ADR-20）クラスタが本物のうちで最も豊富だった。ユーザー向けのものをクローズし、防御的なフロアは残した:

- `inference/hkt_reducer`（8 → 5）: `reduce`の非App引数ガードと`walk`の未宣言パラメータガードをクローズした（メッセージは`node.name.inspect` / `bindings.keys`をピン留めする）。残る5は防御的なフロアだ —— `walk || app.bound`フォールバック（有効なHktBodyノードに対してwalkがnilを返すことはない）と2つの「未知のbody / testノード」ガード（到達するには作られたnon-HktBodyノードが要る）。

続けてバッチ5の本物のクラスタの残りをクローズした:

- `inference/hkt_registry`（16 → 0）: `Registration`の非Array-varianceガード、`Definition`の非Symbol-uri / 非Array-paramsガード、`definition_with_body_tree`、`#reduce`の利便デリゲート、そして`scan_rbs_loader`のRBSアノテーションスキャン全体（`hkt_register` / `hkt_define`ディレクティブ文字列を出力するフェイクローダー、+ nilローダーとディレクティブなしのパースパスも含む —— スキャンボディを行使することで`require_relative`の「等価」もkillされ、0に到達した）。
- `method_dispatcher/kernel_dispatch`（8 → 0）: `Rational` / `Complex`の数値コンストラクタ（`try_numeric_constructor` + `numeric_constant?`）が未テストだった —— specは`Array` / `Integer` / `Float`のみをカバーしていた。Float / Rational / Complexの定数引数を含むfoldを追加し、`numeric_constant?`の値クラスの`||`チェーンのすべてのアームに到達させた（Integer引数は残りをショートサーキットする）。
- `method_dispatcher/overload_selector`（4 → 2）: `strict_nominal_names_for`のOptional再帰と`value_pinning?`のUnionアーム（プライベートなモジュール関数上で`.send`を介してユニットテスト）、および`positional_params_for`のrestパラメータの吸収（`Array#push`の`*Elem`バインディングで3引数 → 3 restスロット）。残る2（行157の`#first` —— すべてのオーバーロードがブロックを要求するときにのみ到達する`|| overloads.first`フォールバック、および`#concat`の末尾引数パス）は、作られた全ブロックメソッド型が必要 —— 文書化されたより難しい末尾。

`inference/flow_tracer:168`の`#inspect`はデバッグフォーマットのフロアだ。

**教訓を再確認:**「防御的 / 等価」の分類は再テストする価値がある —— `hkt_registry`の`require_relative`はガード付きの遅延ロードフロアのように見えたが、単純にメソッドに*入る*テストがそれを実行してミュータントをkillした。**約60の未計測の60〜300 LOCのロジックファイルが残る;300 LOC超のエンジンファイル層はまだ先送りだ**。CPU競合のgotchaに注意せよ: `make verify`と同時に融合ハーネスを実行してはならない（もしくは複数のハーネス呼び出しと同時に）—— それぞれがコールドなenv+scanを行い、互いを枯渇させる;このセッションでは迷子の6時間ハング`parallel_rspec`残留がそれを悪化させた（明らかにハングしている複数時間のテストプロセスはkillせよ）。

## 6回目のバッチ —— スキャナ + LSPプロバイダ（2026-06-21）

8ファイル;**5ファイルにわたって39の穴をクローズした**（`project_patched_methods` / `buffer_table` / `hover_provider`はフロアで計測）。すべてspecのみ;変更したspecに対してrspec + rubocopで確認した（この負荷が飽和した機械では`make verify`が不安定で、specのみの変更はcheck / check-pluginsゲートに触れない）:

- `inference/precision_scanner`（17 → 0）: `FileResult`のティアごとのアクセサ（`precise_count` / `dynamic_top_count` / `dynamic_specific_count` / `opaque_count`）は`tier_counts.fetch(tier, 0)`で読まれる。**重要な教訓: `fetch(key, DEFAULT)`のデフォルト引数のミューテーションはキーが*存在しない*テストによってのみkillされる** —— キーが存在する場合は決してデフォルトに達しないので、既存の正確 / 比率 / 自己参照的合計のテストは生かしたままにしていた。正確なティアごとのカウントと空のカウントマップの両方をピン留めした。また`classify`のIntersection（`best_of` = 最も精度の高いメンバー）とDifference（`base`）アーム、プライベートなモジュール関数上で`Combinator.intersection` / `.difference`を使って`.send`で。
- `inference/protection_scanner`（4 → 0）: `safe_describe`の3つの分岐 —— `#describe(:short)`、記述不可能なオブジェクトの`#to_s`フォールバック、そしてdescribeが例外を発生させたときのrescueの`class.name`。
- `inference/project_patched_scanner`（12 → 0）: 不透明なクラスの`walk_children`フォールバック（`walker`と同じ形状 —— ボディなしクラス、`class << expr`の非self → 周囲のクラスの*インスタンス*メソッドとして記録される）、parse-error診断、read-failureのrescue、そしてエディタモードのバッファオーバーレイ（エントリーを別の場所で解決するバインディング付きの`scan(paths, buffer:)`）。**重要な教訓: 2つのエラーパスが診断フィールドを共有する場合（どちらも`rule: "pre-eval.parse-error"`、どちらもパスを名前として持つ）、パス固有のMESSAGEテキスト**をアサートせよ（「has a parse error」vs「failed to read」）—— そうしなければ一方のパスを迂回してもう一方へのミューテーションが、より弱いアサーションを満たしたまま生き残る。
- `language_server/debouncer`（4 → 0）: スレッド化されたrescueの`warn`（スケジュールされたブロックが例外を発生させる → stderrの警告がkeyとエラークラスを命名することをアサートする）。
- `language_server/document_symbol_provider`（2 → 0）: `qualified_name_of`のnil-parentアーム（トップレベルの`::Foo`）とelseのソーススライスフォールバック、`.send`経由で。

**再利用可能な2つのkillテクニックを記録した:**（a）`fetch(_, default)`のデフォルトのためのキー不在テスト;（b）構造化フィールドを共有する2つのパスを区別するためのメッセージテキストアサーション。

## 7回目のバッチ —— 残りのLSPプロバイダ + mcp + plugin（2026-06-21）

7ファイル;**2ファイルにわたって30の穴をクローズした**（`folding_range_provider` / `selection_range_provider` / `hover_provider` / `project_context` / `plugin`はフロア）。specのみ;rspec + rubocopで確認:

- `language_server/signature_help_provider`（16 → 0）: プライベートなレンダリング / 解決ヘルパーは完全な`#provide`フローを通じてのみ到達していた。`.send`でユニットテスト: すべてのパラメータ種別（required / optional / rest / trailing / required+optional+restのkeyword、`RBS::Parser.parse_method_type`経由のRBS）にわたる`parameter_information` / `format_param`、名前のない型のみの形式、`nominal_class_name`、`rbs_documentation`のコメント結合、`byte_offset_for`（**マルチバイトの最初の行**が`bytesize`→lengthのミューテーションに噛みつく）、そしてシングルトンレシーバー + Difference-unwrap（プロジェクトコンテキストの環境 + `Reflection`からの実際のスコープ）のための`lookup_method`。
- `mcp/server`（14 → 0）: `build_argv`のツールごとの`args[...]`読み取り（既存のテストは`include`を使ってエンドツーエンドの振る舞いとconfigフラグをアサートしており、paths / file / top / paramsの読み取りをピン留めしていなかった）—— **正確なargvの`eq`アサーション**がnil-inject / swapされたキーによってフラグ / パスが落ちることに噛みつく。また`call_tool`のStandardError rescue（`CLI.new`をスタブしてraiseさせる）: 内部エラー結果、stderrのログ、そして改行結合されたバックトレース（**行カウントアサーション**が`join(nil)`のセパレータが1行に折り畳まれることに噛みつく）。

**さらに2つの再利用可能なテクニック:**（c）各要素のソース読み取りをピン留めするために、構築された配列 / argvへの正確な`eq`（`include`でなく）アサーション;（d）nil-separatorのミュータントが依然として連結する`join("\n")`に対しては、部分文字列のメンバーシップではなく出力の**行カウント**をアサートする。マルチバイトのフィクスチャは`bytesize`対lengthに噛みつく。

**セルフミューテーションセッションの累計（2026-06-21）:**バッチ1〜7は約28の`lib/rigor`ファイルの本物の穴を等価ミュータントのフロアまでクローズした（config_audit、lockfile_resolver、class_registry、reflection、method_catalog、conflict、diagnostic、options、mutation_protection_report、prism_colorizer、return_type_heuristic、builder、walker、coverage_command、hkt_reducer、hkt_registry、kernel_dispatch、overload_selector、precision_scanner、protection_scanner、project_patched_scanner、debouncer、document_symbol_provider、signature_help_provider、mcp/server、…）。残るフロンティア: `cli/*_command`のintegration-blindnessの末尾（バッチ4）、overload_selectorの全ブロックオーバーロードの2つの残余、約50の未計測の60〜300 LOCファイル、そして300 LOC超のエンジン層。

## 8回目のバッチ —— def-returnタイパー + 2つのplugin表層（2026-06-30）

まだ未計測だった60〜300 LOC層に対する2つの融合バッチ;ほとんどのファイルはフロアで計測された（`type/{union,constant,nominal}`、`source/{constant_path,node_walker}`、`macro_block_self_type`、`method_dispatcher/method_folding`、`sig_gen/{type_elaborator,layout_index,path_mapper}`、`plugin/trust_policy`はすべてすでに100 %だった）。3つの本物のクラスタをクローズした。すべてspecのみ、rspec + rubocopグリーン:

- `inference/def_return_typer`（1 → 0）: `body_last_expression`の再帰的な`Prism::BeginNode`アームが一度も実行されていなかった —— 既存の「BeginNodeをアンラップする」テストは明示的な`begin…end`形式を使っていたが、これは**StatementsNode**ボディとしてパースされる（BeginNodeはその下に*ネスト*されるので、行51は再帰せずにそれを返す）。**インラインのdef-rescue**形式（`def foo; 1; rescue; 2; end`）だけがBeginNode*ボディ*を直接生成し、行52にヒットする。ケースをインライン形式に書き換え、アンラップされた正確な文（`not_to be_nil` → `IntegerNode`値1）をピン留めし、再帰呼び出しの`undefined_method`ミュータントをkillした。
- `plugin/io_boundary`（14 → 0）: `DefaultHttpClient#get` —— 他のすべてのspecでboundaryがインジェクトオーバーする実物の`Net::HTTP`ラッパー —— はまったくテストされていなかった（スイートにネットワークなし、WebMockなし）。**スタブ化したトランスポート**でユニットテストした: `Net::HTTP.start` / `request_get`をスタブして*実物*の`Net::HTTPOK` / `Net::HTTPForbidden`を出力させ（`#is_a?(Net::HTTPSuccess)`と`#code`は本物のまま）、ソケットに裏打ちされた`#read_body`だけをスタブしてチャンクを出力させた。3つのケース —— 成功時の結合、`:url_fetch_failed`の非成功raise（ステータス + urlを名前として持つ）、`:url_body_too_large`のストリーミングされたオーバーサイズraise —— がメソッドボディ全体を実行し、2つの`AccessDeniedError`理由コード（実物のplugin信頼 / アクセス契約）をピン留めする。
- `plugin/protocol_contract`（8 → 2-等価）: 文字列キーの`param_types`エントリーのテスト（`entry["index"]` / `entry["type_name"]`のconfig由来のフォールバック —— それまでのすべての成功テストはシンボルキーを使っていたので、`|| entry["…"]`アームは一度も読まれていなかった）と、`to_sym`不可能なseverityのテスト（`severity: 42` → それまで未行使だった`rescue NoMethodError`アーム）を追加した。残る2つ（`validate_severity!`の主`raise` / `inspect`、行149〜150）は**rescueにマスクされた等価ミュータント**だ: ミューテートされた主raiseからの`NoMethodError`は複製の`rescue NoMethodError`によって捕捉され、同じ`ArgumentError`として再raiseされるので、その破壊は外側から見分けがつかない —— 等価ミュータントのフロアだ。`type/refined:83`は文書化された`#inspect`デバッグフォーマットのフロアで残された。

## 9回目のバッチ —— plugin isolation + macroバリデーター（2026-07-01）

10のplugin表層への融合バッチ;ほとんどはフロア（`fact_store`、`services`、`box`、`blueprint`、`additional_initializer`、`macro/block_as_method`）。3つの本物のクラスタをクローズし、1つの等価ミュータントのフロアを文書化した;すべてspecのみ、rspec + rubocopグリーン。（最初に`bundle install`を再実行した —— このセッションが開いている間にPR #33のrbs 4.0.2 → 4.0.3のバンプが着地しており、融合テスト軸が生成する`bundle exec rspec`は新しいネイティブ拡張がビルドされるまで起動できない;症状はサブプロセスからの`Could not find rbs-4.0.3 in locally installed gems`だった。）

- `plugin/macro/nested_class_template`（6 → 0）: `block_method` / `inner_arg_position` / `inner_reader`（行79/82/83）に対する`validate_method!` / `validate_position!`の呼び出しが未保護だった —— 既存の検証テストは*他の3つの*パラメータ（`receiver_constraint` / `variant_method` / `symbol_arg_position`）しかカバーしておらず、呼び出しごとの`label`引数（メッセージに埋め込まれた`#block_method`等）が`nil_inject` / `type_swap`を生き残っていた。3つのテストがそれぞれ1つのパラメータに不正な値を渡し、メッセージがそれを名指すことをアサートする。
- `plugin/macro/trait_registry`（2 → 0）: `validate_modules_by_symbol!`の不正な**キー**分岐（Symbolでも非空StringでもないHashキー、行166/168）—— 既存のspecは値の分岐と非Hashガードをカバーしていたが、不正なキーは一度もなかった。`{ 42 => "Mod::A" }`を使う1つのテストが`modules_by_symbol key`のメッセージをアサートする。
- `plugin/isolation`（15 → 2-フロア）: `RubyBox`バックエンド（行96/97/103/105）はまったく行使されていなかった —— その唯一の統合の例は`if: Box.enabled?`でゲートされており、スイートは`RUBY_BOX=1`を決して設定しない。**スタブ化した`Box`**（`enabled?` / `require_feature` / `eval`）でユニットテストした: 2つの`Unavailable`ゲート、加えて`Box.eval`を正確な`'ActiveSupport::Inflector.pluralize("post")'`でスタブすることでピン留めしたinspectレンダリング済み式（「evalに到達する自由な入力はない」契約）。`join(", ")`のセパレータを噛ませるには**2引数**のケースが要った —— 単一の引数はどんなセパレータでも同一にレンダリングされる（`["x"].join(nil) == "x"`）ので、削除 / 変更されたセパレータをマスクしてしまう。また、スタブ化した`Process.available? => false`経由で`Process`のフォーク不可ゲート（行122）も追加した。残る2つ（`run_worker_loop`の`ensure exit!(0)`、行186）は**サブプロセス子プロセスのフロア**だ: そのループはフォークされた子プロセスの中でのみ走り、終了コードをミューテートするためにインプロセスで呼び出すとテストランナー自体が終了してしまう —— 本物のフォークなしには真にテスト不可能だ。
- `plugin/inflector:100`は**等価ミュータントのフロア**として残された: `available?`は`invoke(:pluralize, "rigor_inflector_probe")`でプローブする;プローブの*引数*をミューテートしても（`nil_inject` / `type_swap`）成功した複数形化を依然もたらすので、`available?`はどのみち`true`を返す —— プローブ文字列はメソッドの契約にとって重要ではなく、それをピン留めするのは実装の詳細をテストすることになる。

## 10回目のバッチ —— method_dispatcherのfolding + 型キャリア（2026-07-01）

2つの融合バッチ。**8つの`method_dispatcher/*_folding`ファイル**（`reduce`、`set`、`cgi`、`shellwords`、`regexp`、`data`、`file`、`literal_string`）はすべて**融合保護100 %、生存者ゼロ**で計測された —— 定数畳み込み層はすでに徹底的にspec化されている;作業なし。**7つの型キャリアファイル**はほとんどフロアだった;1つの本物のクラスタをクローズした。

- `type/hash_shape`（10 → 1-フロア）: 4つのコンストラクタ検証分岐が未保護だった —— 既存のspecは`validate_pairs!`（非Hash、不正なキークラス）と`canonical_key_list`の未知キー分岐をカバーしていたが、以下はカバーしていなかった: `split_constructor_args`内の未知**キーワード**の拒否（行122）、重複キーガード（173）、required / optionalの**重複**ガード（183）、**未分類キー**ガード（188）。4つのテストがそれぞれ1つの分岐に当たり、メッセージが問題のキーを名指すことをアサートする —— 2つの未知キーワードで`join(', ')`セパレータを噛ませ、`.inspect`でレンダリングされた違反者リスト（`[:a]`、`[:c]`）で183 / 188のinspect呼び出しをピン留めする。残る1つは`inspect`の`describe(:short)`呼び出し（行109）—— 文書化されたinspectデバッグフォーマットのフロア（下記）。
- `type/{data_class,data_instance,struct_class,struct_instance,tuple}`はそれぞれ1つの生存者を残した。すべて**同じinspectデバッグフォーマットのフロア**だ: `def inspect = "#<... #{describe(:short)}>"`であり、`describe`自体は徹底的にテストされている —— `inspect`ラッパー（デバッグ / 診断用の文字列）だけが未行使で、`type/refined:83`の前例と整合する。このリポジトリのキャリアの規約では`inspect`をspec化しないので、これらは意図的に追わない。
- `inference/dynamic_origin`は100 %（ADR-75のcause-setキャリア、すでに完全にspec化済み）。

## 11回目のバッチ —— CLIコマンド（2026-07-01）

4つのCLIコマンドへの融合バッチ。`cli/ci_detector`は100 %。`doctor` / `skill`で2つの本物のクラスタをクローズした;残余は`if key?`でガードされた等価なデフォルト、防御的な到達不能分岐、そしてフラグ説明の見た目の問題だ。

- `cli/doctor_command`（18 → 6-等価）: ベースラインドリフトのパスが未テストだった。specは不正なベースライン（`:warn`）とクリーンな空（`[]`）のケースをカバーしていたが、*ドリフトしている*ベースラインは一度もなかった。（a）作られた監査行（`Struct.new(:status)`）を使い、ステータスごとのカウント・ラベル・`join(', ')`をピン留めする`.send`経由の`#baseline_drift_summary`のユニットテスト（行200/205をクローズ）と、（b）いまやクリーンなファイルに`call.undefined-method`バケットを記録する統合テスト → `:cleared`のドリフト行 → `:fail`の所見、`reject { status == :within }`フィルタと`baseline_drift_summary`の呼び出しサイトを行使する（177/184をクローズ）を追加した。残る6つは`counts.fetch(:over, 0)` / `:cleared` / `:reducible`の**デフォルト引数**だ —— それぞれ先行する`if counts.key?(...)`でガードされているので、`0`のデフォルトは到達不能なデッドコードであり、それへの`nil_inject` / `type_swap`は**等価ミュータント**だ（specのみで残した;冗長なデフォルトを削除するためだけにlibを編集する価値はない）。
- `cli/skill_command`（6 → 1-防御的）: 名前なしの`--print`のusage-errorテスト（`run_print(nil)`は`usage_error("a skill name is required")`にヒットする。`rigor skill --print`経由で到達可能、行139）を追加し、未知のskillのテストを強化して`"Available skills (try ...)"`ヘッダー（行212 —— その下のskillごとのリストはすでにアサート済みだった）をアサートするようにした。残る1つは`run_list`の`@err.puts("No bundled skills found under …")`（行127）だ —— `discover_skills`を空にスタブしない限り到達不能、なぜならgemは常にskillをバンドルしているからだ;防御的なフロア。
- `cli/triage_command`（5、文書化して残した）: `--hints-only` / `--selectors-only`（振る舞いはすでにテスト済み）に対する`opts.on(...)`の`nil_inject`サバイバーは**help-descriptionの文字列**を対象としており、等価ミュータントだ;`--top` / `--no-hints`は未テストのフラグで、その効果は観察がぎこちなくなるだけ（ホットスポットのカウント / 出力されるセクションのセット）で低価値だ;`configuration.paths`（行84）は空の`@argv`分岐で、specの常に`["code.rb"]`のランナーは決して通らない。

## 12回目のバッチ —— 中規模（380〜620 LOC）のspec済みファイル、その1（2026-07-01）

300 LOC超層の最初。2つのファイルを並列のSonnetサブエージェントに委譲した（互いに素なspecファイル;親が計測 + 裁定 + コミットする）、1つはインラインで行った。3つとも今や生存者0。

- `analysis/baseline`（1 → 0）: `bucket_key`の`message_regex&.source`（行335）が一度も行使されていなかった —— `#audit`のすべてのテストはルールモードのバケットを構築していた（regexはnil、safe-navがショートサーキットする）。1つのメッセージモード監査テスト（2つの異なるメッセージ → regexのsourceでキー付けされた2つのバケット、1つが一致 → `:within`、もう1つが → `:cleared`）が`.source`の読み取りに到達する。
- `inference/method_parameter_binder`（43 → 0、Sonnet）: 2つの大きなクラスタは、スロット構築 / RBS型プロバイダのラムダ / `Combinator.nominal_of`（147〜199、326〜369）と、ADR-28のパススコープのprotocol-contract層全体（270〜298）だった。1つの全スロット種類フィクスチャ（`(String a, ?Integer b, *Float rest, Symbol c, d:, ?e:, **Numeric kw) { … }`で各スロットに*別々*の名前的型（nominal）を与え、誤ったインデックス / 名前や、nil / スワップされた`nominal_of`引数が食い違った`class_name`として表面化するようにした）と、すべてのマッチ / 非マッチ分岐（パスglob、レシーバーのsingleton性、メソッド名、インデックス、nilのレジストリ / source_path / 未解決の型）をカバーする10テストの`apply_protocol_contract`ブロックでクローズした。等価なし —— 34すべてが本物の観察可能なものだった。
- `cache/descriptor`（35 → 0、Sonnet + インラインの仕上げ）: サブエージェントが32をクローズした —— `PluginEntry` / `ConfigEntry`のフィールド + `to_h`の読み取り、`sort_entries`の順序付け（非ソートの入力 → 正規の順序をアサート）、`canonicalize_value`の配列分岐、そして`fresh?`の比較器（comparator）ディスパッチ（`:digest` / `:mtime` / `:exists`、それぞれ実物のfreshen-then-staleファイルシステムプローブを伴う。`Time#to_i`のmtimeパスを含む）。残した3つ（`to_canonical_bytes`、319/324）は`Descriptor#==` / `#eql?` / `#hash`の値意味論だった —— 等しい / 等しくない / Hashキーの3つ組でインラインにクローズした（既存の`.hash`テストは*ディスクリプタ*ではなく*エントリー*に対するものだった）。

## 13回目のバッチ —— 中規模spec済みファイル、その2（2026-07-01）

残る2つの300 LOC超のspec済みファイル。`analysis/rule_catalog`（618 LOC）は**生存者0**で計測された —— ルールカタログはすでに徹底的にspec化されている。`cache/store`（523 LOC）はSonnetサブエージェントに委譲した。

- `cache/store`（21 → 1-等価、Sonnet）: `#fetch_or_validate`の記録・検証フロー全体（行244〜268）には*直接の*カバレッジがなかった —— `Plugin::Base#cache_for`を介して間接的にしか行使されていなかった。`#fetch_or_validate`ブロック（ヒットはキャッシュされた値を返し`hits`をインクリメント;ミスはブロックを走らせ、書き込み、`misses`をインクリメント;ブロックなし → `[nil, Descriptor.new]`;古くなった依存ディスクリプタ → 再計算）、アトミック書き込みブロック（正確な値をラウンドトリップ、残留`.tmp`なし、スパイでピン留めした`SecureRandom.hex(4)`サフィックス）、そして`write_varint`の負値raiseテスト（`.send`経由）でクローズした。残る1つは行421の`File.open(path, RDWR|CREAT, 0o644)`だ —— `0o644`モードへの`nil_inject`は**等価ミュータント**だ: umask `022`の下ではデフォルトの作成モード`0666 & ~022 == 0644`となり、リテラルとバイト同一になるので、umaskに脆くないテストではそれを区別できない（`path` / `flags`引数は変数と定数ORであり、`nil_inject`が狙うリテラルではない）。

**フェーズ1（中規模380〜620 LOCのspec済み層）完了**。 baseline、method_parameter_binder、cache/descriptor、rule_catalog、cache/storeはすべてその等価ミュータントのフロアにある。

## 14回目のバッチ —— spec不在のキャリアspecを執筆（フェーズ2、2026-07-01）

5つのファイルには**専用の規約specがなかった**——間接的にしか行使されていなかったので、ハーネスはそれらを型のみで走らせた（テスト軸なし: 型アンカーのサイトだけをミューテートし、1つを除きすべて型killされた）。specを執筆することは、規範的な振る舞いを明示的にピン留めすると同時に、ハーネスにファイルごとのテスト軸を与える。2つのSonnetサブエージェントがspecを執筆し、親がそれぞれを事後に融合保護100 %で検証した。5つとも今や生存者0。

- `inference/body_fixpoint`（ADR-56のcapped-fixpoint;**事前のspec参照ゼロ**、最も価値が高い）—— ラムダの`evaluate_body` / `widen`で`converge`を直接行使する9例のユニットspec（フローエンジン不要）: 空の名前、ゼロ反復シードの健全性、単一の安定したパス（早期`break`）、新しい型のユニオン、`CAP`内での複数パス収束、非収束 → 最終反復での名前的型ベースへのデュアルなワイドニング、構造的複合化（`a = [a]`）→ `Combinator.untyped`へのフロア + `BudgetTrace::BLOCK_WRITEBACK_CAP`ヒット、そして混在した移動済み / 未書き込みのケース。実物のプロダクションワイドナー`Combinator.widen_value_pinned`（両方の呼び出しサイトが渡すもの）を使い、アサートする前に生きたプローブに対して値を検証した。
- `type/{bot,top,dynamic,singleton}` —— 専用の値束（value-lattice）アイデンティティspec（9/9/15/12例）。正確な`describe` / `erase_to_rbs`の文字列、キャリアごとの`top` / `bot` / `dynamic`束の三つ組、`==` / `eql?` / `hash`（bot / topはsingletonアイデンティティ;dynamic / singletonは`ValueSemantics`のフィールド等価性）、そしてソースが指摘する2つのロードベアリングな不変条件をピン留めする: `Combinator.dynamic`の冪等性（`untyped == Dynamic[Top]`、ネストした`Dynamic`は畳み込まれる）と`Singleton["String"] != Nominal["String"]`の非交差性。private-`.new` / singletonアクセサは推測ではなく実物のソースに対して検証した。

**フェーズ2完了**。中身のあるspec不在ファイルはいまや専用のspecを持つ;残るspec不在ファイルは、その振る舞いが含むキャリアのものであり、型のみのハーネスがすでに完全に保護されていることを示している些細なミックスイン（`acceptance_router` 19 LOC、`plain_lattice` 37 LOC）だ。

## 15回目のバッチ —— 中大規模エンジン層、その1（フェーズ3、2026-07-01）

300 LOC超のエンジン層。巨大なコアファイル（statement_evaluator 3388、expression_typer 3059、scope_indexer 2716、narrowing 2640）は先送りされている —— ミューテートするのが重く、すでに厚くspec化されている;中大規模（350〜600 LOC）のファイルが手頃な前線だ。2つをSonnetサブエージェントに委譲し、1つはインラインで行った。3つとも今や生存者0。

- `inference/mutation_widening`（52 → 0、Sonnet）: ADR-56のslice-Cコレクションのコンテンツ要素抽出ヘルパー（`collection_element_types`、`hash_shape_key_values`、`drop_dynamic`、`array_added_elements`、`join_*_content`、`widen_hash_shape`）はユニットレベルで未テストだった —— ブロック / ループのコンテンツ書き戻しのために、Tuple / Array-Nominal / HashShape / Unionレシーバーから要素 / キー / 値の型を抽出する。各レシーバー形状で各ヘルパーを行使する32テスト（`Combinator.nominal_of`結果のラップと、`Dynamic`メンバーの`drop_dynamic` / `grep_v`フィルタを含む）;`Combinator.union`がメンバーを並べ替える`contain_exactly`。
- `plugin/registry`（27 → 0、Sonnet）: Registryを通じて到達するADR-52のコンパイル済み寄与インデックス表層 —— プラグインごとの`dynamic_returns` / `type_specifiers`ゲート、`block_as_methods`インデックス、グローバルゲートの`Set#merge`、`class_ordering`の祖先関係、`hkt_registrations` / `hkt_definitions`のHKT集約、そして削除済みの`flow_contribution_for`の重複登録raise。マージ / flat-map / 順序付けが観察可能になるよう、それぞれ2つ以上のpluginを持つ8テスト。
- `inference/method_dispatcher/overload_selector`（1 → 0、インライン）: 行157の`overloads.first`フォールバック —— *すべての*選択パスが失敗し*かつ*すべてのオーバーロードがブロックを要求するときにのみ到達し、`find { !requires_block? }`はnilを生む。コアのRBSブロックメソッドはほぼすべて列挙子（enumerator）フォールバックのオーバーロードを出荷しているので（`find`が成功し、`.first`はそれらにとってはデッドコードだ —— 既存の`each_with_object`テストは一度もそこに到達しなかった）。`Object#tap`が判別的な形状だ: 列挙子の双子を持たない**単一**の`() { (self) -> void } -> self`オーバーロード;偽の引数でそれを呼ぶとarityですべてのパスが失敗する → `.first`フォールバックがそれを返す。

## 16回目のバッチ —— 中大規模エンジン層、その2（フェーズ3、2026-07-01）

さらに3つの中大規模ファイルをSonnetサブエージェントに委譲し、すべて生存者ゼロにクローズした —— トラッカーが長らく残る中で最も難しいとフラグしていたファイル`conformance_checker`（約110生存者、RBSフィクスチャ依存）を含む。そのメッセージフロアに関する懸念は完全にクローズ可能であることが判明した。

- `plugin/manifest`（17 → 0、Sonnet）: `config_schema` / `consumes`検証raise + それらの`inspect`メッセージの補間、そして文字列vsシンボルキーのconfigルックアップ（`value[:kind] || value["kind"]`、`key?("default")`の論理和）。目立って不正な値のraiseテスト（違反する値がそのまま出るので`inspect`のリネームは死ぬ）と、**文字列キーのYAMLラウンドトリップ**フィクスチャ（`value["…"]`フォールバック分岐によってのみ満たされうる）でクローズした。
- `analysis/worker_session`（29 → 0、Sonnet、2ラウンド）: 信頼済みgemのパス解決（`trusted_gem_name` / `trusted_gem_root` / `full_gem_path`、`.send` + スタブ化した`Gem.loaded_specs`経由）、config `resolve` / `target_ruby`の配線（`target_ruby: "3.0"`で`Prism`のraiseを強制し、汎用の`rescue`にヒットさせた）、discovery-seedの配管、plugin node-ruleのエラー**および**成功パス（`collect_plugin_diagnostics`）、`safe_plugin_id`の`plugin.class.to_s`のrescueフォールバック、そして`--explain`のフェイルソフトフォールバック診断（実物の`CoverageScanner`のフリップフロップイベントをエンドツーエンドで、加えて`start_column + 1`のオフバイワンと`location`がnilの分岐をピン留めするイベントダブル付きの`.send(:explain_diagnostic)`）。
- `rbs_extended/conformance_checker`（110 → 0、Sonnet）: `scan_rbs`ヘルパーが実物のRBSをtmpdirに書き込み実物の`RbsLoader`を構築し、`scan`をあらゆる分岐を通じてエンドツーエンドで駆動する —— 適合 → `[]`、`Unsatisfied`（正確な`missing_methods`）、`UnresolvedInterface`、そして各不一致の詳細ジェネレータ（`return_detail`の共変、`param_detail`の反変 + パラメータインデックス、`arity_detail`のover / under両形状 + restガード + 単数 / 複数、`keyword_detail`の欠落 / 余分 / kwrest、`Dynamic[Top]`と多重オーバーロードのスキップガード）。詳細の*文言*はロードベアリングな部分文字列（型名、パラメータインデックス、カウント）でアサートし、完全な文字列ではアサートしない。記録されたgotcha: RBSコアの組み込み（`_Reader` / `_Writer`）と衝突するインターフェース名は、環境ビルドを静かに失敗させる → `scan`は`[]`を返しアサーションをマスクする;衝突しない名前を使うこと。

**フェーズ3の中大規模層はほぼクローズした**。残る300 LOC超のファイルはエンジンの巨大なコアファイル（statement_evaluator 3388、expression_typer 3059、scope_indexer 2716、narrowing 2640、shape_dispatch / constant_folding、rbs_loader、plugin/base、sig_gen/generator、runner、…）だ —— 別立ての大規模で高価なスイープとして先送りされている;その既存のかなりのspecがすでにそれらを支えており、それぞれの完全な融合計測は数分かかる。
