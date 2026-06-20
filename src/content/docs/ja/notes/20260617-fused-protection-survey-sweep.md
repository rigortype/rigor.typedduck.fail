---
title: "融合保護（`--with-tests`） — 広範な調査スイープ"
description: "rigortype/rigor docs/notes/20260617-fused-protection-survey-sweep.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260617-fused-protection-survey-sweep.md"
sourcePath: "docs/notes/20260617-fused-protection-survey-sweep.md"
sourceSha: "b90fa409332b3080bca20861dfcb50310ab8a7d9fccefacd22f913b5c7ef001b"
sourceCommit: "fd78ee0a520ab7f2dfb40f13d33b4fbae93e2c69"
translationStatus: "translated"
sidebar:
  order: 20266617
---

ステータス: 検証スイープ＋所見、2026-06-17にRigor v0.1.19（`[Unreleased]`、ADR-69/70の融合保護サイクル）を対象として執筆。`rigor coverage --protection --mutation --with-tests [--include-dynamic --limit]`を`rigor-survey`の広範なターゲット群にわたって実行し、その振る舞い、表面化される実行可能なシグナル、そして実世界の採用の摩擦を記録する。非規範的。

根拠: [ADR-70](../../adr/70-fused-protection-coverage/)（融合オーバーレイ）、[ADR-69](../../adr/69-pluggable-mutation-substrate/)（オラクル＋`--include-dynamic`セレクタ）、そして[`20260617-type-guided-mutation-testing-strategy.md`](../20260617-type-guided-mutation-testing-strategy/)（戦略＋最初の検証）。データは4つの並列サブエージェントが、プロジェクトごとに隔離されたbundleの上で収集した。

## 手法

ターゲットごとに: 隔離された`bundle install`、続いて**対応する（ソースファイル、単一のグリーンなテストファイル）**の組——テストファイルは開発用Ruby（4.0.5）で単体でパスしなければならない。各組について、オーバーレイを`--format json`付きで2回実行する。**biteable**（デフォルト——具象型のサイトのみ）と**`--include-dynamic --limit 40`**（あらゆるディスパッチサイト、Dynamic含む、上限付き）。対応する単一テストのスコープは各スイート実行を速く保ち、「スイート全体がグリーンでなければならない」問題を回避する;トレードオフは、`unprotected`がフルスイートと比べて過大報告すること（*別の*テストが捕まえるミューテーションがunprotectedとして現れる）であり——構成上正しい。

## 対象範囲

**13ターゲットを試行 → 12が融合実行クリーン、1がブロック**。テスト（動的）軸は**すべての**クリーンなターゲットで発火した（`test_killed > 0`）。**偽陽性ゼロ**、**クラッシュゼロ**、そして**すべての`lib/`ツリーがバイト単位で復元された**（オラクルの`ensure`）。bundler環境の除去（[`dc480068`](#)）はすべてのターゲットで持ちこたえた。

## 結果

| ターゲット | fw | ソースファイル | biteable（サイト/型/テスト/無保護） | `--include-dynamic`（サイト/型/テスト/無保護） |
| --- | --- | --- | --- | --- |
| faraday | rspec | `utils.rb` | 14 / 8 / 0 / **6** | 40 / 7 / 20 / **13** |
| faraday | rspec | `adapter_registry.rb` | 4 / 4 / 0 / 0 | 10 / 5 / 5 / 0 |
| haml | minitest | `attribute_parser.rb` | 6 / 4 / 2 / 0 | 39 / 5 / 34 / 0 |
| haml | minitest | `ruby_expression.rb` | 2 / 2 / 0 / 0 | 12 / 3 / 9 / 0 |
| liquid | minitest | `lexer.rb` | 76 / 75 / 1 / 0 | 40 / 24 / 14 / **2** |
| liquid | minitest | `condition.rb` | 21 / 5 / 11 / **5** | 40 / 4 / 29 / **7** |
| hamlit | minitest | `attribute_parser.rb` | 6 / 2 / 4 / 0 | 39 / 3 / 36 / 0 |
| hamlit | minitest | `ruby_expression.rb` | 2 / 0 / 2 / 0 | 12 / 1 / 11 / 0 |
| rubocop-ast | rspec | `token.rb` | 2 / 2 / 0 / 0 | 40 / 1 / 39 / 0 |
| rubocop-ast | rspec | `processed_source.rb` | 11 / 6 / 5 / 0 | 40 / 1 / 31 / **8** |
| mail | rspec | `utilities.rb` | 27 / 9 / 11 / **7** | 22 / 1 / 16 / **5** |
| mail | rspec | `parts_list.rb` | 17 / 7 / 2 / **8** | 40 / 7 / 6 / **27** |
| rgl | minitest | `dijkstra.rb` | 11 / 11 / 0 / 0 | 40 / 11 / 26 / **3** |
| rgl | minitest | `base.rb` | 9 / 8 / 1 / 0 | 40 / 5 / 18 / **17** |
| erubi | minitest | `erubi.rb` | 32 / 12 / 18 / **2** | 40 / 3 / 34 / **3** |
| tdiary-core | rspec | `core_ext.rb` | 52 / 23 / 22 / **7** | 40 / 12 / 12 / **16** |
| algorithms | rspec | `search.rb` | 17 / 4 / 13 / 0 | 23 / 4 / 19 / 0 |
| mangrove | rspec | `option.rb` | 3 / 0 / 3 / 0 | 40 / 0 / 20 / **20** |
| jbuilder | minitest | `jbuilder.rb` | 9 / 9 / 0 / 0 | 40 / 8 / 31 / **1** |
| **parser** | minitest | — | **ブロック** | — |

（`--include-dynamic`のサイト数は`--limit 40`のサンプルで上限される;そこでの比率は推定値である。）

## 所見

**1. テスト軸は実コードで、どこでも機能する**。`test_killed`は12のクリーンなターゲットすべてで発火した（ファイルあたり1〜39）。3つのレジームが現れる:

- **型優勢**（よく型付けされた数値／String系コード）: `liquid/lexer.rb`は75/76が型キル、`rgl/dijkstra.rb`は11/11、`jbuilder.rb`は9/9（biteable）。静的なネットがすでに持ちこたえている。
- **テスト優勢**（型チェッカーが噛みつけないDynamicレシーバーのコード）: `hamlit/ruby_expression.rb`はbiteableで型=0 → **両方**がテストで捕まる;`rubocop-ast/token.rb`は`--include-dynamic`で0→39がテストキル。ここではテストが唯一の保護であり、融合マップはそれを*示す*。
- **真にギャップあり**: `faraday/utils.rb`（0.57）、`mail/parts_list.rb`（0.53）、`liquid/condition.rb`（0.76）、`tdiary/core_ext.rb`（0.87）——どちらの軸も保護しないサイト。

**2. `--include-dynamic`こそ、目玉の価値が着地する場所である**。それは分母を*biteable*なサイトから*すべての*ディスパッチサイトへ広げ、一貫してテスト軸を表面化させる。例: `haml/attribute_parser.rb`は6→39サイト、テストキル2→34;`rubocop-ast/token.rb`は2→40、0→39。「テストだけに守られた`Dynamic`サイト」というセルは、実世界の動的コードでは支配的な結果であり——biteableなビューには見えない。

**3. 偽陽性ゼロ——無保護のサイトは本物であり、かたまりをなす**。サブエージェントが手検証したすべての`unprotected`サイトは本物のギャップだった。「ここに型**または**テストを足せ」の分類体系:

- **テストされていないメソッド本体** — スコープされたテストが決して呼ばないヘルパー: faraday `basic_header_from`／`normalize_path`／`build_url`（`#pack`、`#delete!`、`#start_with?`）、mail `inspect_structure`（`PartsList.new`、`#content_type`）、liquid `Condition#inspect`（`#join`）。
- **到達されない条件分岐／エラー分岐** — `rescue`内での`#raise`の再raise（liquid lexer :168、rgl base :155）、バージョンディスパッチのアーム（rubocop-ast `parser_engine`／`ruby_version`のcase、erubi `LoadError` rescue内の`RUBY_VERSION >= '1.9'`）。
- **Dynamicレシーバーのコラボレータ** — 外部gemのオブジェクト（rgl `PairingHeap::MinPriorityQueue`）、フレームワーク／定数のファサード（`Mail.random_tag`）、ダックタイピングされたパラメータ／ビジター（rubocop-ast `token`、rgl `@visitor`）、そして**メタプログラミングDSL**（mangroveのSorbet `sig { returns … }`／`params`／`override`——型もexampleテストもそれらを行使せず、本物のシグナルだ）。

**4. コスト**。実行ごとのウォール時間は2〜25秒で、`（計測されるミューテーション数） × （スコープされたテストの実行時間）`に比例する。`--limit 40`は`--include-dynamic`を効果的に抑えた;より大きなファイル（`attribute_parser.rb`は39サイト）は約24秒に達した。変更ファイルのスコープ＋速いスコープ済みテスト＋`--limit`が正しいコストのレバーであることを裏づける。

## 摩擦の分類体系（採用障壁——すべて環境的で、Rigorのバグは1つもない）

スイープの第2の成果物: 何が`--with-tests`を新鮮なチェックアウトで「ただ動く」状態から妨げるか。どれもオーバーレイの欠陥ではない;それらは*グリーンなテストコマンド*を必要とすることのコストである。

- **ビルド／コード生成の前提条件（最も難しい）**。ビルドステップなしではテストすらロードできないプロジェクト: **parser**（ブロック——チェックインされたlexerが無く、`ragel ~>6.7`＋`ostruct`が必要だが、どちらもシェルに無い）、**rubocop-ast**（`rake generate`によるracc/oedipus-lexのコード生成）、**hamlit**（`rake compile`によるネイティブ拡張＋`-rtest_helper`）。ビルドさえすれば、オーバーレイはクリーンに走った（ビルド成果物はgitignoreされているので、ソースはクリーンなまま）。
- **カバレッジフロアの非ゼロ終了**（faraday）。`spec_helper`がSimpleCovの`minimum_coverage 84`を強制するので、単一ファイル実行は*グリーンなのに*非ゼロで終了する → グリーンの前提条件が引っかかる。エラーメッセージはすでに「素のパス／フェイルのランナー」へ誘導する;サブエージェントは`SimpleCov.start`をスタブするランナーでそれを回避した。
- **Ruby-4.0のバンドルgem連鎖**（tdiary-core）。ネイティブの`nokogiri`（ロックされたバージョンにarm64-darwin25のプリコンパイル版が無い）＋切り出されたstdlibのgem（`cgi`／`pstore`／`rss`／`csv`／`ostruct`）を、スイートがロードされる前に追加／更新しなければならなかった。
- **デフォルトでない／欠落したGemfile＋シェルなしの`--test-command`**（erubi、jbuilder——*新たな*発見）。`--test-command`は`Shellwords.split` → `system(*argv)`で**シェルなし**であり、オラクルはそれを`Bundler.with_unbundled_env`で包む。したがってインラインの`BUNDLE_GEMFILE=… bundle exec …`プレフィックスは2通りに壊れる。環境代入がリテラルな`argv[0]`として取られ（解釈するシェルが無い）、`with_unbundled_env`はどのみちそれを取り除いてしまう。信頼できる回避策: **`bundle config set --local gemfile PATH`**（`.bundle/config`に永続化され、環境の除去を生き延びる）か、**`bash -c '…'`**で包む。文書化する価値がある;将来の`--gemfile`パススルーはありうる使い勝手の改善だ。

## 評決

`--with-tests`は**サーベイ規模で健全かつ偽陽性なし**である: 12/12のクリーンなターゲット、テスト軸はそのすべてで発火し、すべての`unprotected`評決は本物のギャップとして裁定され、全体を通じてバイト単位の復元、クラッシュなし。`--include-dynamic`こそ、融合マップを実（動的）Rubyで走らせる価値あるものにする——テスト保護のシグナルが実際に存在する場所だ。採用における拘束的な制約はアナライザーで**はなく**、**グリーンなテストコマンドを得ること**である: ビルドの前提条件、カバレッジフロアの終了、Rubyバージョンのgem連鎖、そしてデフォルトでないGemfile。スイープが正当化する1つの具体的で安価なフォローアップは、シェルなしの`--test-command`のための`bundle config set --local gemfile`パターンを文書化すること（CLIリファレンスで実施済み）である;`--gemfile`パススルーと、カバレッジベースのテスト選択（完全性*と*コストのために、ファイルをカバーするテストだけを走らせる）は、ADR-46/71のフォローアップのままである。
</content>
