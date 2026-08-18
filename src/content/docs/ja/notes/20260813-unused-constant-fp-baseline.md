---
title: "未使用定数の偽陽性ベースライン —— #345のための3プロジェクトのコーパス計測"
description: "rigortype/rigor docs/notes/20260813-unused-constant-fp-baseline.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260813-unused-constant-fp-baseline.md"
sourcePath: "docs/notes/20260813-unused-constant-fp-baseline.md"
sourceSha: "80c529127f97c67ae046c3108b23e1b21df633f20709b752c20bdbef52f08942"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 20266813
---

ステータス: 計測ノート、設計上のコミットメントはなし。観測は`#345`のプローブworktree @ `3b236b8b`、macOS arm64、Ruby 4.0.5、2026-08-13。

## 理由

[#345](https://github.com/rigortype/rigor/issues/345)は、Rigorの解析基板が`rigor unused`到達可能性レポートを運べるかを問う。この問いの素朴な形——「解決された定数参照が1つも指さなかったプロジェクト所有の定数はどれか？」——はRigor自身の`lib/`で既知の酷い偽陽性率（99.7%）を持つ。本ノートは同じファネルを3つの実在するRailsアプリケーションで計測し、そのうち1つではすべての生存者を手で裁定して、数字に真陽性の比率が付随するようにする。その比率のない件数は結果ではない。

このファネルは元記事の`631 → 9 → 3 → 2`の減衰に倣った形をしている: 素朴な件数から始め、次第に高価になるルート集合の知識を順に適用し、各段階がどれだけ買うかを見る。

> **以下で説明する計測器はもうツリーに存在しない**。それは4つのエンジンファイルと`tool/unused_probe/`に置かれたスパイクの足場であり、このベースラインに対して再計測を必要とするスライス（#348・#349・#350）が着地するまでだけ保持された。それらが完了し`rigor unused`が本物の実装として出荷されたので、除去された。本ノートの実行を再現するには、gitの履歴からハーネスをチェックアウトすること——`3b236b8b`がそれを追加し、`7a1cfaba`が段階フィルタを追加した——あるいは、将来を見据えたものには`rigor unused`を使うこと。それはこれに取って代わり、同じ母集団をより正確に計測する。

## 手法

計装は`lib/rigor/unused_probe.rb`（`RIGOR_UNUSED_PROBE`でゲート、5つのフック箇所、未設定時は不活性）と`tool/unused_probe/{run.sh,report.rb,stages.rb}`だ。`run.sh`は`--no-cache --workers=0`を強制する;`report.rb`は、ダンプがワーカー ≠ 0、キャッシュストアの接続、または記録された参照ゼロを示す場合、**数字を出力するのではなく2で終了する**。以下のすべての実行はそれらのガードを通過し、静かな失敗の実行がそれとして見えるように、すべての参照数が報告されている。

コーパスのプロジェクトはデータとして読まれる。その中の何も変更されておらず、`.rigor.yml`も書かれていない——パスの拡大は`rigor check`への位置引数として表現され、それが`configuration.paths`を上書きする。

### 再現

プローブworktreeから、Nix flakeの中で:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command \
  tool/unused_probe/run.sh ~/repo/ruby/rigor-survey/redmine /tmp/redmine-naive.json

nix --extra-experimental-features 'nix-command flakes' develop --command \
  tool/unused_probe/run.sh ~/repo/ruby/rigor-survey/redmine /tmp/redmine-wide.json app lib config

nix --extra-experimental-features 'nix-command flakes' develop --command \
  ruby tool/unused_probe/stages.rb /tmp/redmine-wide.json \
    --project ~/repo/ruby/rigor-survey/redmine --list
```

他の2ターゲットには`~/repo/ruby/rigor-survey/mastodon`と`~/repo/ruby/conference-app`を代入する;引数リスト`app lib config`は3つとも同じだ（各ターゲットの`paths:`は`app`・`lib`で、それぞれそこに含まれていなかった`config/`を持つ）。コーパスのリビジョン: redmine `a12198ea0`、mastodon `163f96cee`、conference-app `3e54d61`。

### 4つの段階

1. **素朴**——ターゲットの設定された`paths:`をそのまま。
2. **ルートの拡大**——`config/`を解析パスに追加。
3. **ルート（route）のルート**——`config/routes.rb`から到達可能なコントローラーを差し引く。`tool/unused_probe/stages.rb`内の**意図的に粗い**抽出器を使う。これは行指向の正規表現スキャンであってRailsのルーターではない: `namespace` / `module:`のネストのための`do`/`end`カウント、`resources` / `resource`のシンボルリスト、`:controller =>` / `controller:`オプション、`controllers x: 'y'`マップ、そして`"controller#action"`文字列。`resource :x`（単数）はインフレクターがないので`XController`と`XsController`の両方を寄与する;マッチは完全な定数名**または**そのdemodulizeされた末尾に対してなので、過剰に差し引く。過剰な差し引きはFPベースラインにとって安全な方向だ: 生き残る数字をFP問題の上界ではなく下界にする。本物のルート抽出は[#349](https://github.com/rigortype/rigor/issues/349)だ。
4. **動的解決による降格**——（d1）`constantize` / `safe_constantize` / `const_get` / 補間された構築のリテラル接頭辞として現れる囲む名前空間を持つ、（d2）Rubyの文字列またはシンボルリテラルの内部にそのまま現れる、（d3）`app`・`lib`・`config`・`db`配下のERB / HAML / SLIM / YAML / ロケール / JSONファイル内に——FQN、autoloadパス形式、またはアンダースコア化された末尾として——現れる、すべての候補を別の「判定不能」バケットへ移す。

### 報告する層

**クラス／モジュール定数の層**が見出しだ。値定数の層は既知の壊れ方をしている: `Scope#in_source_constants`は設計上ファイルごとであり、値定数はクロスファイルのプロジェクトシードに運ばれないので、別ファイルから読まれる値定数は決して解決されず、その候補は構成上偽である。その件数は完全性のためにUNRELIABLE（信頼不能）と表示して以下に載せるが、裁定の労力は費やされていない。

## 実行の形（沈黙防止のチェック）

| ターゲット | 段階 | ファイル数 | 宣言（所有） | 異なる参照 | ソースの解決 |
| --- | --- | ---: | ---: | ---: | ---: |
| redmine | 素朴 | 347 | 697 | 609 | 33,736 |
| redmine | 拡大 | 365 | 715 | 620 | 34,824 |
| mastodon | 素朴 | 1,312 | 2,109 | 1,697 | 175,582 |
| mastodon | 拡大 | 1,388 | 2,144 | 1,733 | 180,022 |
| conference-app | 素朴 | 101 | 105 | 1,438 | 2,405 |
| conference-app | 拡大 | 122 | 107 | 1,442 | 3,048 |

6つの実行すべてが`workers: 0`・`cache_enabled: false`・5〜6桁の解決数を記録した。conference-appの異なる参照の数字はRBSのパスに支配されており（1,442名前のうち1,411が`signature_paths:`から来る）、それこそがコーパスに含めた理由だ: `record_rbs_decls`を行使する唯一のターゲットである。

## 減衰表——クラス／モジュール定数の層

| ターゲット | 1素朴 | 2ルート拡大 | 3ルート（route）のルート | 4動的降格 | 裁定済み真陽性 |
| --- | ---: | ---: | ---: | ---: | ---: |
| redmine | 135 | 136 | 82 | **57** | **4** |
| mastodon | 377 | 374 | 142 | **113** | 未裁定 |
| conference-app | 59 | 61 | 20 | **14** | 未裁定 |

他の層、完全性のために（素朴 → 拡大）:

| ターゲット | 値定数（UNRELIABLE） | 名前空間接頭辞の作為 |
| --- | --- | --- |
| redmine | 38 → 38 | 24 → 30 |
| mastodon | 86 → 89 | 91 → 95 |
| conference-app | 0 → 0 | 0 → 0 |

### 段階2は何も買わず、理由は構造的

解析ルートを広げることは**宣言**集合と**参照**集合を一緒に動かす。どちらも同じ「解析対象ファイル」述語でゲートされているからだ。2つの効果はほとんど相殺する:

| ターゲット | ファイル数 | 宣言 | 異なる参照 | 正味のクラス候補 |
| --- | ---: | ---: | ---: | ---: |
| redmine | +18 | +18 | +11 | **+1** |
| mastodon | +76 | +35 | +36 | **−3** |
| conference-app | +21 | +2 | +4 | **+2** |

redmineに`config/`を加えると18ファイル、18の新しいプロジェクト所有の宣言、11の新しい解決された参照名が加わり——候補数は1つ*上がった*。3ターゲットのうち2つで拡大はレポートをわずかに悪化させた。「プロジェクトのもっと多くを解析すればいい」は明白な最初の直感であり、計測の結果、レバーではないので、率直に述べる価値がある。広げること自体は依然として正しい——`config/initializers`は多くの本物の参照が住む場所だ——が、見返りは段階2ではなく段階3と段階4から来なければならない。

段階3が金のある場所だ: redmineで−40%、mastodonで−62%、conference-appで−67%。段階4はさらに−30%、−20%、−30%を取る。粗い抽出器は雑な仕事をしていながら、他のあらゆる段階を合わせたよりも支配的だ。

## Redmineの裁定

57件の生存者すべてを手で確認した（サンプルではない）。各名前についてredmineツリー全体をgrepし、宣言箇所と関係するフレームワークの配線を読んだ。

**真陽性——57件中4件（7.0%）**。

| 定数 | ファイル | 本当に死んでいる理由 |
| --- | --- | --- |
| `ChangesetNotFound` | `app/controllers/repositories_controller.rb:23` | `class ChangesetNotFound < StandardError; end`——この宣言がリポジトリ全体で唯一の出現、テストを含めて。 |
| `ScmFetchError` | `app/models/repository.rb:20` | 同じ形;決してraiseされず、rescueされず、名指しされない。 |
| `Redmine::SudoMode::SudoRequired` | `lib/redmine/sudo_mode.rb:25` | 宣言され、91行目の散文コメントで1回言及される。決してraiseされない。 |
| `SvgIconHelper` | `app/helpers/svg_icon_helper.rb:20` | 空の`module SvgIconHelper; end`。コントローラーは`SvgIconsController`（複数形）で、その規約ヘルパーは`SvgIconsHelper`だが存在しない——したがって何もこのモジュールをincludeしない。 |

**偽陽性——57件中53件**、10の作為クラスに分かれる:

| # | 作為クラス | 機構 | 候補が間違っている理由 |
| ---: | --- | --- | --- |
| 28 | Railsのヘルパーモジュール規約 | `FooController`が暗黙に`FooHelper`を`helper`する | 名前は導出され、決して書かれない。Redmineは`include_all_helpers = false`を設定しているので対応は1対1で確認可能——この28件すべてに対応するコントローラーがある（`GanttHelper`は`gantts_controller.rb`の明示的な`helper :gantt`経由）。 |
| 7 | レジストリへの自己登録 | `Redmine::FieldFormat::*`がクラス本体で`add 'link'`を呼び、それが`Redmine::FieldFormat.add(name, self)`を行う | クラスは*自分自身*を文字列キーのレジストリに登録する。ルートのマーカーは本体内のDSL呼び出しであり、外側からの参照ではない。 |
| 4 | Railsのジェネレータ規約 | `lib/generators/redmine_plugin*/…` | `rails generate redmine_plugin`によって、つまりファイルパスと名前によって到達される。 |
| 3 | 再オープンされた外部クラス | `config/initializers/10-patches.rb`内の`ActionView::Helpers::DateHelper`・`ActionController::MimeResponds`・`…::Collector` | **所有権述語の作為であり、発見ではない**: gemのクラスを再オープンするとそれがプロジェクトの宣言として登録される。これらはまったくプロジェクトの定数ではない。 |
| 3 | `paths:`内のテストランナーのルート | `lib/plugins/acts_as_tree/test/`内の`TreeTest*` | ランナーが発見するMinitestクラス。設定の臭いでもある——vendorされたプラグインの`test/`ディレクトリがredmineの`lib`パスの内側にある。 |
| 2 | 参照が`.rake`ファイルに住む | `Redmine::IMAP`・`Redmine::POP3`、どちらも`lib/tasks/email.rake`が使う | 参照は`paths:`の内側に存在するが、アナライザーが読まないファイル拡張子の中にある。 |
| 2 | 粗い規則が見逃した動的構築 | `Redmine::WikiFormatting::{CommonMark,Textile}::HtmlParser` | `"Redmine::WikiFormatting::#{name.classify}::#{m}".constantize`で構築される。段階4のd1規則は候補の*直接の*親名前空間をキーにする;ここでのリテラル接頭辞は2レベル上だ。正しい規則は動的接頭辞**以下の**すべての名前空間を汚染されたものとして扱わねばならない。 |
| 1 | 継承スコープの定数ルックアップ | `Redmine::Scm::Adapters::AbstractAdapter::ScmCommandAborted` | `class BazaarAdapter < AbstractAdapter`内の`rescue ScmCommandAborted`は*スーパークラス*のスコープ連鎖を通じて解決される。リゾルバのレキシカル走査はそれをモデル化しないので、本物の、解析集合内の参照が記録されない。これはエンジンの隙間であって、ルート集合の隙間ではない。 |
| 1 | `ActiveSupport::Concern`規約 | `Redmine::SudoMode::Controller::ClassMethods` | `extend ActiveSupport::Concern`はネストした`ClassMethods`を名前で自動的にextendする。 |
| 1 | 公開された拡張ポイント | `Redmine::Hook::ViewListener` | ツリー外のRedmineプラグイン（と`test/`）からのみサブクラス化される。エクスポートされたAPIで、リポジトリの内側からのみ死んでいる。 |
| 1 | Railsのバリデータ規約 | `DateValidator` | `validates :start_date, :date => true`は`"DateValidator".constantize`になる。段階4のトップレベル動的規則は`*Controller`に制限されていた;同じ規約はバリデータ、ジョブ、シリアライザなどにも存在する。 |

### これが算術的に意味すること

4段階後のredmineでのクラス／モジュール層の精度は**7.0%**だ——13の誤りごとに1つの本物の発見。10のFPクラスのうち2つ（ヘルパー規約、レジストリ自己登録）が53件の偽陽性のうち35件を占める。つまり**残るFP質量の66%が2つの規則に座っている**。

## 他の2ターゲットでのスポットチェック

網羅的には裁定していない;他の場所でも同じ作為クラスを特定するので記録する。

- **conference-app**（14件の生存者）はパターンをほぼ正確に再現する: 4件のRailsヘルパー規約モジュール、4件の`active_decorator`デコレータ（gemは`FooDecorator`を`Foo`に名前で適用するので、ルートはgemの規約）、3件の`alba`リソースクラス、`ApplicationCable`（接頭辞作為規則が畳み込みに失敗した名前空間のみのモジュール）、`ApplicationMailer`（サブクラスのないRailsのスキャフォールド基底クラス——`SvgIconHelper`と同じ種の5番目の真陽性と言えなくもない）、そして`lib/tasks/tito.rake`からのみ参照される`TitoApiClient`——redmineが生んだのと同一の`.rake`作為。
- **mastodon**（113件の生存者）は粗いルート（route）抽出器が到達しなかったコントローラーに支配されている: 最初の30件の生存者のうち27件が`Api::V1::…`・`WellKnown::…`・`Auth::…`・`OAuth::…`配下の`*Controller`だ。Mastodonはルート（route）を`config/routes/{admin,api,fasp,settings,web_app}.rb`にまたいで分割し、重い`namespace`のネストと`resource … controller:`の再マッピングを伴う;正規表現スキャンは622のルートを抽出してもなおこれらを見逃した。それは抽出器についての言明であってmastodonについてではない——そして#349がヒューリスティックではなくルーターの形をした本物の抽出器を必要とする最も明白な単一の論拠だ。

## これが#347 / #349にとって意味すること

1. **レポートは決して診断にはなれない**。3ターゲットのうち最も有利なもので、4段階のルート知識の後に精度7.0%というのは、ADR-5と「偽陽性は最悪ケースの静的な読みに優る」ガイドラインがチェックとして許容するものをはるかに超えている。それはレポート——オプトインの、人が読むリスト——に留まり、生き残る件数は欠陥の数ではなく*レビューキュー*だ。
2. **ルート集合がゲームのすべて（#349）**。段階3だけで正規表現によってクラス層の40〜67%を除去した。段階4のすべての規則を合わせて20〜30%を除去した。存在する予算は何であれまずルート抽出に行くべきで、ルート（route）抽出器は正規表現の形ではなくルーターの形であるべきだ——mastodonは、実アプリが最も複雑なまさにその場所でヒューリスティックが倒れることを示している。
3. **2つの規約規則が残るFP質量の3分の2を引退させる**。ヘルパーモジュールの対応付け（`FooController` ⇒ `FooHelper`、`include_all_helpers`を尊重）と「本体が登録DSLを呼ぶクラスはルートである」は合わせてredmineの53件の偽陽性のうち35件をカバーし、conference-appのデコレータとリソースのグループも同じ形だ。どちらも自然にプラグインAPIの形をしている——`rigor-actionpack`はすでにコントローラーについて知っている——それは規約の知識をコアの外へ向ける既存のガイドラインに合う。
4. **作為クラスのうち2つはルート集合の隙間ではなくRigorのバグ**であり、#347から切り離す価値がある:
   - **所有権述語**が再オープンされたgem / 標準ライブラリのクラスをプロジェクトの宣言として数える（redmineの3候補が1つのイニシャライザから来た）。プロジェクトが著していないRBSによって名前空間が定義される宣言は決して候補であるべきではない。
   - **スーパークラスの定数スコープ走査**が欠けている: サブクラス内の`rescue ScmCommandAborted`は`AbstractAdapter::ScmCommandAborted`への参照を記録しない。切り離して[#354](https://github.com/rigortype/rigor/issues/354)として提出したところ、記録不足のエッジより悪いことが判明した。`Reflection.lexical_constant_candidates`はRubyのレキシカル走査とその素の名前のフォールバックを実装するが、その間の祖先ステップを実装しないので、同じ名前がトップレベルにも存在するとき**素の名前のフォールバックが、Rubyなら祖先に与えるルックアップに勝つ**——Rigorは`class Sub < Base`内の`KEY`をトップレベルの定数として型付けするが、Rubyはそれを`Base::KEY`へ解決する。それはこのレポートとは独立した、正しいコードに対する偽陽性だ。
5. **解析対象ファイルの拡張子集合は到達可能性の問いには狭すぎる**。`.rake`ファイルは`paths:`の内側にあってプロジェクトの定数を参照する;redmineの2候補とconference-appの1候補はそれらを読まないことの純粋な作為だ。到達可能性レポートは*解析*コーパスより広い*参照*コーパスを必要とする——参照のためにファイルを読むのは型チェックするよりはるかに安価だ。
6. **`paths:`を広げることは緩和策ではない**（段階2、+1/−3/+2）。「`config/`を加えればレポートが良くなる」と述べる助言を出荷しないこと;宣言と参照は一緒に広がるので、良くならない。
7. **値定数の層は、クロスファイルシードが`in_source_constants`を運ぶまで、出荷されるどのレポートからも外す**。コーパス全体で38 / 89 / 0件の候補が、構成上、正しくなりようのないものだ。

## 補遺2026-08-15——出荷された`rigor unused`、cannot-decide層付き

上の計測は使い捨てのプローブで取られた。`rigor unused`（#347）とその`cannot-decide`層（#348）がその後出荷され、同じ3ターゲットを本物のコマンドで再実行した。

**これらの数字は上の減衰表の続きではなく、そう読むべきではない**。計測器は分母を動かす2つの点で変わった: 参照インデックスは今や型付けパス上のフックではなく専用の定数ノード走査であり、所有権は今やプロジェクト自身の`sig/`なしに構築された環境が知る名前を除外する。redmineのプロジェクト所有の宣言数がここでは504で、プローブの697に対してそうなのはそのためだ。表が示すのは出荷されたレポートの形であって、元のファネルのさらなる段階ではない。

`--entry-point`なしで実行したので、ルートはファイルレベルの参照からのみ来る:

| ターゲット | 宣言 | 候補 | cannot decide | テストのみ | 名前空間のみ |
| --- | ---: | ---: | ---: | ---: | ---: |
| redmine | 504 | 129 | 99 | 2 | 12 |
| mastodon | 1,497 | 278 | 118 | 454 | 8 |
| conference-app | 103 | 2 | 0 | 0 | 0 |

記録に値することが3つ。

**cannot-decide層は実質的な量を運ぶ**。redmineで99行、mastodonで118行が、さもなければ未使用と断言されていたであろう宣言であり、それぞれが降格させた理由とともに今や降格されている。redmineではそれはレポートがさもなければ主張していたものの43%だ。

**Mastodonのテストのみバケットは膨らんでおり、その膨張は警戒すべきものというより診断的だ**。テストコードからのみ到達可能な454の宣言はmastodonについての発見ではない;それはルート（route）由来のルートが欠けているときのRailsアプリの見え方だ。コントローラーとモデルはルート（route）とフレームワークから到達され、#347はどちらも知らない——specだけがそれらを参照する残りのものだ。このバケットは#349が着地すれば潰れるはずで、その大きさはそのスライスの使える前後の尺度だ。

**conference-appはクリーンなケース**: 103宣言のうち2候補、判定不能な行なし。本物の`sig/`ツリーと少ない動的構築を持つ小さなアプリは、レポートが最もよく扱う形であり、マニュアルで期待値を設定するときに知っておく価値がある。

## 補遺2026-08-15——#349、プラグイン供給のルート（route）ルート

同じコマンド、同じ2つのRailsターゲット、同じ設定;唯一の変更は、`rigor unused`が今やプロジェクトのプラグインをロードし、公開されたすべての`:reachability_roots`ファクトでスイープをシードし、`rigor-rails-routes`が`config/routes.rb`がディスパッチするコントローラーを公開することだ。

| ターゲット | 指標 | #349前 | #349後 |
| --- | --- | ---: | ---: |
| redmine | ルート | 53 | 108 |
| redmine | 候補 | 129 | **57** |
| redmine | cannot decide | 99 | 77 |
| redmine | テストのみ | 2 | 2 |
| mastodon | ルート | 125 | 404 |
| mastodon | 候補 | 278 | **45** |
| mastodon | cannot decide | 118 | 25 |
| mastodon | テストのみ | 454 | **186** |

redmineの候補の−56%とmastodonの−84%が、1つのルートソースから。それは#345の段階3の差し引きが予測した（正規表現抽出器で40% / 62% / 67%）のと同じ形であり、ルーターの形をした読みが正規表現には届かなかったルート（route）に届くのでより高く着地する。

Redmineの57件の生存者はADR-102 §コンテキストの裁定が行われた対象の数字であり、抽出器の有用な独立チェックだ: 手で監査したファネルと出荷されたものが一致する。

Mastodonのテストのみバケットはノートが予測したとおりに振る舞った——454 → 186——その大きさがmastodonについての発見ではなくルート（route）ルートの欠如だったという診断を確認する。残余はモデルとサービスに支配されており、それはこのルートソースの欠陥ではなく次のルートソースだ。

### 過剰供給のチェック

過剰に主張するルートソースは本物のデッドコードを黙って隠すので、プロジェクトが宣言していないものを名指す供給ルートの数が今やレポート出力の一部だ。

| ターゲット | 供給ルート | 宣言にマッチせず |
| --- | ---: | ---: |
| redmine | 56 | 1 |
| mastodon | 288 | 0 |

Redmineの1つのマッチしないルートは`Rails::HealthController`（`get "/health" => "rails/health#show"`）——フレームワークのクラスで、正しく名指しされ正しくプロジェクト所有ではない。

逆から読むと、mastodonの宣言された309の`*Controller`クラスのうち288がルート化されている。そうでない21件の内訳: 11件の抽象的な`*::BaseController`の親（ルート化されたサブクラスからのスーパークラスエッジを通じて到達されるので候補ではない）;3件のDeviseの`Auth::*`と3件のDoorkeeperの`OAuth::*`コントローラー。その`controllers:`の再マッピングはこのスライスが意図的にモデル化しない;`Admin::SettingsController`;`Api::V1::Timelines::TopicController`。これはルート（route）が本当に名指ししていない——つまり本物の候補だ。

3つのルート（route）の形がこの計測を走らせることでのみ見つかり、それぞれspecで固定されている: `resources` / `resource`のオプションとしての`module:`（mastodonのadminルートだけで8箇所）、囲む`with_options to:`から継承されるターゲット、そしてブロック内で宣言されたアクションを持つ`only: []`。Mastodonの`inflect.acronym`宣言も`config/initializers/inflections.rb`から読まれ、これがないと`ActivityPub::…`クラスに対して19の出力ルートが`Activitypub::…`と綴られていた。

## 補遺2026-08-16——#350、残りのプラグインのルート供給

6つのプラグインを1つの規則に対して調査した: プラグインは、そのフレームワークが**ソース内に定数参照として決して現れない**名前で到達する定数だけを寄与すべきだ。2つがそれを満たし、4つは満たさず、その4つの見送りがより重要な半分だ——過剰供給するルートソースは本物のデッドコードを黙って隠すので、発見された集合（「`app/workers`配下のすべてのクラス」）を公開することは何も公開しないより厳密に悪い。

| プラグイン | 決定 | 理由 |
| --- | --- | --- |
| `rigor-pundit` | ルート | `authorize @post`はどこにも書かれない名前`PostPolicy`に到達する。 |
| `rigor-factorybot` | **参照**、`:test`ロール | `factory :user, class: "Admin::User"`は文字列だが、ファクトリーはテストツリーのコードだ。 |
| `rigor-sidekiq` | 見送り | `MyWorker.perform_async`は通常の定数参照だ。キュー / cron設定内の文字列で名指されるワーカーは該当しうる;まだパースされない。*（[#367](https://github.com/rigortype/rigor/issues/367)により置き換え: スケジュールファイルの`class:`キーは今や読まれる;キューリストは依然として見送り。）* |
| `rigor-rspec`・`rigor-rspec-rails` | 見送り | specの参照をルート化するとWD8のカテゴリーから`:test`ロールを剥ぎ取り、丸ごと消してしまう。 |
| `rigor-activejob`・`rigor-actionmailer` | 見送り | `perform_later` / `welcome`は通常の定数参照だ。 |

### 計測

`rigor unused --format json`、前後、cwd = ターゲット。Redmineのコミットされた設定はどちらのプラグインも宣言していないので、それがコントロールだ。

| ターゲット | 指標 | 前 | 後 |
| --- | --- | ---: | ---: |
| redmine | 候補 / テストのみ / cannot-decide | 57 / 2 / 77 | 57 / 2 / 77 |
| mastodon | 候補 / テストのみ / cannot-decide | 45 / 186 / 25 | 45 / **164** / 25 |
| gitlab | 候補 / テストのみ / cannot-decide | 66 / 1794 / 427 | 66 / **1796** / **425** |

Mastodon（コミットされたプラグインリストに`rigor-pundit`）は22のポリシーを*テストコードからのみ到達可能*から本番到達可能へ移した——`UserPolicy`・`ReportPolicy`・`InvitePolicy`ほか19件、それぞれ以前は自身の`spec/policies/`ファイルだけで生かされていた。ルートは404 → 428へ上がった。**候補は1つも動かなかった**、それが要点だ: この寄与は行を隠してレビューキューを縮めるのではなく、誤帰属を訂正した。

GitLabはFactoryBotのターゲットだ（`spec/factories/`、249エントリー;コミットされたプラグインリストに`rigor-factorybot`を追加して計測）。2つのクラスが*cannot decide*から*テストのみ*へ移った——`SupplyChain::Slsa::ProvenanceStatement::{Builder,BuildMetadata}`、ファクトリーの`class:`で名指しされ、それ以外では推測するしかないもの。ここでも候補は動かなかった。

Redmineの数字は前後でバイト同一だ。それはどちらのgemも使わないプロジェクトにとって期待される結果であり、null計測ではない: この機構は`spec/integration/plugins/reachability_contribution_plugin_spec.rb`で固定されており、それは両プラグインを本物のプロトコルを通じて駆動し、プラグインが決してロードされなければ失敗するので、「ここでは変化なし」はシグナルの不在ではなくコントロールだ。

### 過剰供給のチェック

| ターゲット | 供給ルート | 宣言にマッチせず |
| --- | ---: | ---: |
| redmine | 56 | 1（不変——`Rails::HealthController`） |
| mastodon | 312（288ルート（route）+ 24ポリシー） | 0 |
| gitlab | 373 | 14（不変——すべてルート（route）から） |

punditが供給したすべてのルートが宣言にマッチした。それが`Pundit#prepare`内の積が買うものだ: 何も名指さない導出されたポリシー名は公開前に落とされる。供給は意図的に部分的だ——mastodonの`app/policies`の43のポリシーファイルに対して24ルート。名前空間付きの`Admin::*Policy`クラスとコントローラー外の呼び出しサイトは導出されないからだ。それらのポリシーはレポートに留まり、それが正しい失敗の方向だ。

`rigor-factorybot`は構成上ルートカウンタをまったく動かさない: その寄与は参照なので、クラスをレポートのバケット間で動かすことはできるが、本番の到達可能性を決してシードできない。
