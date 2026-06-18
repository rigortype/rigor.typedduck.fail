---
title: "ADR-51 — CIネイティブな診断出力フォーマット"
description: "Imported from rigortype/rigor docs/adr/51-ci-diagnostic-output-formats.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/51-ci-diagnostic-output-formats.md"
sourcePath: "docs/adr/51-ci-diagnostic-output-formats.md"
sourceSha: "9fa681804cfd8af4d3b5090f21029ae386dd15a3325d2814818488b2ea1760ee"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4051
---

ステータス: **Accepted、2026-06-06；部分的に実装済み（v0.1.18）**。 既存の診断ストリームの6つのCIネイティブなレンダリングが`rigor check --format`の背後で実装される。**`sarif`**（SARIF 2.1.0、クロスプラットフォームのアンカー）、**`github`**（GitHub Actionsのワークフローコマンド）、**`gitlab`**（GitLab Code QualityレポートJSON）、**`checkstyle`**（Checkstyle XML——reviewdog／Jenkinsのリント相互交換フォーマット）、**`junit`**（JUnit XML——広く使われるテストレポートフォーマット）、**`teamcity`**（TeamCityのインスペクションサービスメッセージ）の6つだ。それぞれは`--format json`がすでに公開している同じ`Analysis::Diagnostic`フィールドの上に乗るプレゼンテーション層であり、新しい解析も新しい診断情報もない。フォーマットに加えて、**ランタイムCI自動検出**（WD7）が、ファーストクラスのCIを検出したときにデフォルト出力へプラットフォームネイティブな形を自動的に出力する。フォーマッタとディテクターは[`lib/rigor/cli/diagnostic_formats.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli/diagnostic_formats.rb)＋[`lib/rigor/cli/ci_detector.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli/ci_detector.rb)に置かれる。コピー&ペースト用のCIセットアップテンプレート（ADR-27 § WD3）、同梱の[`rigor-ci-setup`](https://github.com/rigortype/rigor/blob/master/skills/rigor-ci-setup/SKILL.md)スキル、そしてマニュアルの更新が同じカットで出荷される。

根拠: [ADR-27](../27-tool-distribution-model/)（配布／CIチャネル——このADRはその診断出力の兄弟だ）と[ADR-50](../50-release-engineering-and-stability-strategy/) WD1（新しい出力フォーマットは公開契約サーフェスである）。

## コンテキスト

今日、`rigor check`は`text`（人間向け）または`json`（汎用の機械向けストリーム）にレンダリングする。CIでは、どちらも**ジョブログにしか**出力されず、開発者は失敗したジョブを開いて読まなければならない。CIプラットフォームは代わりに、変更されたコード上に*インライン*で検出結果を表示できる（PR／MRアノテーション、コードスキャニングアラート、Code Qualityウィジェット）。しかしそのためには各プラットフォームが*特定の*フォーマットを読み取る必要があり、`--format json`はそのいずれでもない。この統合ギャップこそがv0.1.18サイクルの目玉だ（ROADMAP § "v0.1.18 — CI-environment support"）。プラットフォームネイティブなレンダリングがなければ、RigorのCIにおける価値は終了コードで止まってしまう。

この領域をカバーするフォーマットは以下のとおりだ。

- **SARIF 2.1.0**——OASISの相互交換標準。GitHubの`upload-sarif`はこれを取り込んでPR差分とSecurityタブに表示し、ほかの多くのツールもこれを消費する。これは*クロスプラットフォーム*の選択肢であり、1つのフォーマットで複数のコンシューマーに対応する。
- **GitHub Actionsのワークフローコマンド**——`::error file=…,line=…::`という行をランナーがstdoutから解析してインラインアノテーションにするもので、**アップロードステップは不要**だ。可能な限り安価なGitHub統合である。
- **GitLab Code Quality**——GitLabが`codequality`アーティファクトから読み取ってMR Code QualityウィジェットにポピュレートするCodeClimateサブセットのJSON。SARIF-on-GitHubに相当するGitLabネイティブの仕組みだ。
- **Checkstyle XML**——幅広いツールが読む、長年使われてきたリント相互交換フォーマット。最も有用なのは**reviewdog**がこれを消費し（`-f=checkstyle`）、その*いずれの*レポーター（GitHub PRレビュー、GitLab MRディスカッション、Gerrit、Bitbucket、Gitea）にもポストできる点だ。Jenkinsやほかのツールもこれを読む。
- **JUnit XML**——GitHubのテストレポート、GitLab、Jenkins、CircleCIがネイティブにレンダリングするテストレポートフォーマット。

新しい出力フォーマットはADR-50 WD1の下で**公開契約サーフェス**だ（コンシューマーのCIパイプラインがそれをパースする）。これがCHANGELOGの1行ではなくADRである理由だ——フォーマットの形状はわれわれがコミットするものだからだ。

## 決定

フォーマットを`--format`の値として追加し、[`lib/rigor/cli.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli.rb)（~L864）の既存の`write_result` caseから、フォーマットごとの小さなレンダラークラス（`lib/rigor/cli/diagnostic_formats.rb`）へディスパッチする。何がここに属するかを区別する**基準**は次のとおりだ。*あるフォーマットが`--format`の値として認められるのは、CIプラットフォームがそれをもとに診断ストリームをインラインでレンダリングするときである。*それが境界だ——プラットフォームのPR／MRサーフェスに消費されるフォーマットはスコープ内であり、単に「もう1つのシリアライズ方法」（CSV、独自の形状）にすぎないフォーマットはスコープ外だ。なぜなら`--format json`がすでに汎用の機械向け消費に対応しているからだ。SARIFが**第一の**ターゲットであるのは、まさにそれが複数のプラットフォームに対して同時にこの基準を満たすからだ。

各フォーマッタは`Analysis::Result`の純粋関数だ——`path`／`line`／`column`／`severity`／`qualified_rule`／`message`を読み取り、何も付け加えない。severityと識別子のマッピングは**フォーマットごとに一度だけ**定義される（WD2）。これによりサーフェスは加算的に保たれる。`text`／`json`は手つかずのままで、`--format`を一度も設定しないプロジェクトには何の変化も見えない。

## 作業決定

### WD1 — 6つのフォーマット；SARIFがアンカー、残りはリーチ

フォーマットのセットは、上記の基準に加えて*単位コストあたりのリーチ*によって選ばれる。

- **`github`**と**`gitlab`**は、SARIFのみに委ねて先送りするのではなく、SARIFと並んで出荷される。それぞれが自分のプラットフォームにとっての*ゼロフリクション*の経路だからだ。SARIF-on-GitHubには別途`upload-sarif`ステップとコードスキャニングの有効化が必要だが、`github`フォーマットにはどちらも要らない（`run:`行が1つ）。GitLabはMRウィジェットにSARIFをまったく消費しない——Code QualityがGitLab唯一のネイティブMRサーフェスだ。したがって、SARIFがクロスプラットフォームであることが、この2つを冗長にするわけではない。
- *デフォルト対アンカー。* SARIFはクロスプラットフォームの**アンカー**だ（1つのレポートで多くのコンシューマー——GitHubコードスキャニング、reviewdog、ほかのツール）が、プラットフォームごとの普遍的なデフォルト*ではない*。GitHubに限って言えば、**デフォルトのサーフェスは`github`（アノテーション）**だ。コードスキャニングへのSARIFアップロードには、**プライベート**リポジトリではGitHub Advanced Security／Code Securityが必要であり（パブリックリポジトリでのみ無料）、GHASのないプライベートリポジトリでは使えない——一方で`github`アノテーションは、アップロードも権限も有料機能もなしに、すべてのリポジトリで機能する。そのため`rigor-ci-setup`スキルとマニュアルは、GitHubユーザーをまず`github`へ導き、SARIFを「コードスキャニングが利用可能なら」というアップグレードとして提示する。（PHPStanも同様にGitHub Actionsではその`github`フォーマットを先頭に置く。）
- **`checkstyle`**と**`junit`**は、*広い*リーチを持つ安価なXMLフォーマットだ。`checkstyle`は**reviewdog**への鍵となる。`rigor check --format checkstyle | reviewdog -f=checkstyle`は、任意のreviewdogレポーター（GitHub PR*レビュー*コメント、GitLab MRディスカッション、Gerrit、Bitbucket、Gitea）にポストする——これらはそうでなければRigorが個別のフォーマットを必要とするレポーターだ。（SARIFも`-f=sarif`経由でreviewdogに供給できる。`checkstyle`はより軽量で、コードスキャニング不要のブリッジであり、Jenkinsも読むものだ。）`junit`はテストレポートのコンシューマー（GitHubのテストレポート、GitLab、CircleCI、Jenkins）をカバーする。どちらも小さなシリアライザ以上のコストはかからず、2つ合わせれば、Rigorはreviewdogのネイティブな`rdjson`を書かずにreviewdogのレポーターマトリクス全体に到達できる——`rdjson`はRigorが生成しないコードサジェスチョンのペイロードを加えるだけだ。
- **`teamcity`**（TeamCityのインスペクションサービスメッセージ）はもう1つのstdoutネイティブなフォーマットで、TeamCityがCI自動検出（WD7）にとって空虚なティアではなく真にファーストクラスなプラットフォームとなるよう追加された——`github`がGitHub Actionsの下で自動出力されるのとちょうど同じように、検出されたTeamCityビルドの下で自動出力される。

比較対象: PHPStanは`github`／`gitlab`／`checkstyle`／`junit`／`teamcity`を出荷し、**SARIFはない**。RigorはSARIF（PHPStanのギャップ）を先頭に据え、同じ広いリーチのセット（`checkstyle`／`junit`／`teamcity`）を加える。

### WD2 — severity＋識別子のマッピング（契約テーブル）

各フォーマットは、Rigorの`:error`／`:warning`／`:info`と修飾されたルールIDを、自分自身の語彙へマップする。マッピングは契約としてここで固定する。

| Rigor | SARIF `level` | GitHub command | GitLab `severity` | Checkstyle `severity` | JUnit `failure type` | TeamCity `SEVERITY` |
| --- | --- | --- | --- | --- | --- | --- |
| `:error` | `error` | `::error` | `major` | `error` | `error` | `ERROR` |
| `:warning` | `warning` | `::warning` | `minor` | `warning` | `warning` | `WARNING` |
| `:info` | `note` | `::notice` | `info` | `info` | `info` | `INFO` |

識別子: **修飾されたルール**（`<source_family>.<rule>`、または`:builtin`ファミリーの場合は素のルール——`Diagnostic#qualified_rule`）が安定したIDだ。これはSARIF `ruleId`（＋重複排除された`tool.driver.rules`）、GitHub `title=`、GitLab `check_name`、Checkstyle `source`（reviewdogが表示するルールコード）、JUnit `classname`へと引き継がれる。ルールを持たないプロデューサー（パース／内部エラー、`qualified_rule == nil`）はフォーマットごとにディグレードする。SARIFは`ruleId`を省略し（妥当）、GitHubは`title=`を省略し、GitLabは`check_name: "rigor"`を使い、Checkstyleは`source`を省略し、JUnitは`classname="rigor"`を使う。GitLabの`critical`／`blocker`は未使用のまま残す——より声高な将来のティアであり、今日はマップしない。Rigorには`:error`より上のseverityがないからだ。

### WD3 — GitLabのfingerprintは位置特定タプルのハッシュ

GitLabは、変更のない検出結果に対して安定し、かつ検出結果ごとに一意であることを要求する`fingerprint`によって、ラン間で検出結果を重複排除・追跡する。われわれはタプル`(path, qualified_rule, line, column, message)`を（`SHA256`で）ハッシュ化する。これは安定しており（ラン依存で変動する入力がない——並べ替えで揺れる配列インデックスではない）、実務上は十分に一意だ。本物の衝突（5つすべてが同一の2つの検出結果）はウィジェットから一方を脱落させるが、これは許容できる稀な損失であり、並べ替えのたびにすべての検出結果が「新規」に見えてしまう不安定なインデックスベースのIDよりはるかにましだ。

### WD4 — 終了コードは不変；ファイル出力はシェルリダイレクトで

どの`--format`の値も終了コードを変えない——エラーがなければ`0`、それ以外は`1`のまま（`--baseline-strict`のドリフトでも`1`）で、`text`／`json`と同じだ。レポートは通常の`>`リダイレクトでファイルに書き込まれる（`rigor check --format sarif > rigor.sarif`）。アップロードステップは`if: always()`で走るので、非ゼロ終了でもレポートは公開される。専用の`--output FILE`フラグは**先送り**される（却下／先送り）——リダイレクトでニーズはカバーでき、このフラグは契約変更なしであとから追加できる純粋なエルゴノミクスだ。`github`フォーマットはクリーンなランでは何も出力しない（空のアノテーション行は出さない）。ドキュメント系フォーマットは常にドキュメントを出力する（JUnitは通過する`testcase`を1つ、Checkstyleは空の`<checkstyle>`）。

### WD5 — JUnitはすべての診断を`failure`にマップする（ゲートではなく可視化）

`junit`フォーマットは診断ごとに`<testcase>`を1つ出力し、それぞれにseverityで型付けされた`<failure>`を持たせる——そのため、warningとinfoは、ランを失敗させないにもかかわらずJUnit failureとして現れる。これは確立されたリンターからJUnitへの慣例に従っている（rubocop、eslint、PHPStanはいずれもこうしている）。リンターのJUnitレポートは*可視化*サーフェスであり、エラー以外の検出結果を隠してしまえばその意義が失われる。これは偽陽性の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>と**矛盾しない**——終了コード（エラーのみ）がゲートのままであり、JUnitは`--format junit`によるオプトインであり、`type`属性が本物のseverityを保持するのでコンシューマーは区別できる。（対比: PHPStanはseverityを保持せずすべてをfailureとしてマークするが、Rigorは`type`にseverityを保つ。）

### WD6 — セットアップテンプレート＋スキルの半分（ADR-27 § WD3）

このADRは、ADR-27 § WD3が設計してキューに残していたコピー&ペースト用のCIテンプレートも、新しいフォーマットに結線したうえで出荷する——`.github/workflows/rigor.yml`（Rigorを独立した隔離されたRuby-4.0ジョブで動かし、`--format sarif`＋`upload-sarif`、そしてアップロード不要の代替として`github`のワンライナーを併記）、`.gitlab-ci.yml`（`--format gitlab`→`codequality`レポートアーティファクト）、そしてreviewdogバリアント（[`reviewdog/action-setup`](https://github.com/reviewdog/action-setup)経由の`--format checkstyle | reviewdog -f=checkstyle`）だ——加えて、ユーザーがプラットフォーム、フォーマット、（任意の）reviewdog経路を選ぶのを案内する同梱の[`rigor-ci-setup`](https://github.com/rigortype/rigor/blob/master/skills/rigor-ci-setup/SKILL.md)スキルもある。テンプレート、スキル、そしてマニュアルのCI章（[`docs/manual/11-ci.md`](../../manual/11-ci/)）がこのADRのオンボーディングの顔であり、フォーマットはそのエンジンだ。

### WD7 — ランタイムCI自動検出（ファーストクラスはネイティブ／セカンドクラスはreviewdog）

PHPStanの`CiDetectedErrorFormatter`（`OndraM/ci-detector`を使う）をモデルにしている。`rigor check`は環境変数からランタイムでCI環境を検出し（`Rigor::CLI::CiDetector`）、**デフォルトの`text`出力に対してのみ**、ユーザーが`--format`を選ばなくてもプラットフォームネイティブなやり方で診断を表示する。これが「CIで勝手に動く」デフォルトであり、*ファーストクラス／セカンドクラス*の区分が正式に住まう場所だ。

- **ファーストクラス、stdoutネイティブ**（GitHub Actions→`github`、TeamCity→`teamcity`）: ネイティブアノテーションが人間向けテキストの**上に重ねて**出力される（そのため読みやすいログ*と*インラインサーフェスの両方が現れる。PHPStanが`table`を補強するのとまったく同じだ）。これらは、ネイティブフォーマットが純粋にstdoutからレンダリングされるプラットフォームだ。
- **ファーストクラス、アーティファクトベース**（GitLab CI→`gitlab`）: Code QualityレポートはstdoutではなくCIに結線されたアーティファクトを必要とするので、自動検出ではログへ出力できない。代わりに1行のstderrヒントが、`--format gitlab`を実行してアーティファクトを公開するようユーザーに伝える。
- **セカンドクラス**（CircleCI、Jenkins、Travis、Azure、Bitbucket、Buildkite、Drone、…）: Rigorのネイティブフォーマットがないため、1行のstderrヒントがユーザーを**reviewdog**（`--format checkstyle | reviewdog`）または`--format junit`へ誘導する。このヒントがセカンドクラスティアのランタイムでの表現だ。

ガードレール: これはデフォルトの`text`出力**のみ**を補強する——明示的な`--format`は呼び出し側が制御していることを意味し、バイト単位で手つかずのまま残される（そのため機械向けコンシューマーが汚染されることはない）。ヒントは診断がある場合にのみ発火する（クリーンなランは静かなままだ）。デフォルトでオンだが、`--no-ci-detect`または`RIGOR_CI_DETECT=0`で完全に抑制できる——後者は、GitHub Actionsの下で動かしても出力が変わらないようにするためにRigor自身の`make check`／specスイートが使う継ぎ目だ。検出されたCIの下での`text`の補強がここでの唯一の振る舞いの変化であり、それは加算的（アノテーションを上に重ねるだけで、人間向けの行を置き換えることは決してない）で、CIにゲートされ、オプトアウト可能なので、偽陽性の規律の姿勢を後退させることはない。

## 却下／先送りした代替案

| オプション | 処遇 | 理由 |
| --- | --- | --- |
| ADR-27に新しいWDとして畳み込む | 却下 | ADR-27は*配布*（Rigorをどうインストールするか）であり、これは*出力*（CIへどう報告するか）だ。別個の公開契約サーフェス→独自のADRにすることで各決定が読みやすくなる。 |
| SARIFのみ（GitHub/GitLabを先送り） | 却下 | SARIFはゼロフリクションの両経路（アップロードなしのGitHubアノテーション；GitLab唯一のMRサーフェス）をテーブルに残してしまう——WD1。 |
| `--output FILE`フラグ | 先送り | `>`リダイレクトがファイル出力をカバーする。このフラグは契約への影響がない加算的なエルゴノミクスであり、需要に応じて追加できる。 |
| reviewdogネイティブの`rdjson`／`rdjsonl` | 先送り | reviewdogは出荷済みの`sarif`*と*`checkstyle`をすでに消費するので、それなしでもレポーターマトリクス全体に到達できる。`rdjson`の追加ペイロードはコードサジェスチョン＋複数行レンジだが——Rigorは今日どちらも生成しない。Rigorがfix-itを獲得したら再検討する。 |
| TeamCityサービスメッセージ | 先送り | PHPStanは`teamcity`を出荷する；Rigorでは需要にゲートされる（TeamCityユーザーが観測されていない）。 |
| リッチなSARIFルールメタデータ（`shortDescription`、`helpUri`） | 先送り | IDのみの`tool.driver.rules`は妥当なSARIFであり、フォーマッタを`CheckRule`レジストリに結合させずに済む；GitHub SecurityタブのUXが要求したら拡充する。 |
| 終了コードモード（例: レポートモードでは常に0） | 却下 | ゲートをグリーンにしたいコンシューマーは`continue-on-error`／`if: always()`を使う；それをフォーマットに焼き込むと、プレゼンテーションをゲーティングポリシーに結合させてしまう。 |

## 帰結

### ポジティブ

- 主要な3つのCIプラットフォームで、診断が**PR／MR内にインライン**で表示される——RigorのCIにおける価値が、もはやジョブログ＋終了コードで止まらない。
- 加算的で隔離されている: `text`／`json`は不変、`.rigor.yml`の変更なし、解析の変更なし。`--format`を使わないプロジェクトには何の新しいものも見えない。
- SARIFはGitHub以外でも再利用できる（任意のSARIFツール）ので、クロスプラットフォームへの投資はGitHub固有ではない。

### ネガティブ

- 3つの出力形状が新たに**公開契約**となる（ADR-50 WD1）——severity／識別子のマッピング（WD2）とSARIF／GitLabのJSON形状は、ライン内で安定を保たねばならない。ここの契約テーブルがその固定点だ。
- プラットフォームがスキーマを進化させるにつれ、ドキュメント化して最新に保つべきものが増える（SARIFのリビジョン、GitLab Code Qualityのフィールド変更）。

### 持ち越し

- `--output FILE`、JUnit XML、よりリッチなSARIFルールメタデータは、需要にゲートされたフォローアップだ（却下／先送り）。
- 列挙された公開サーフェスのドキュメント（ADR-50 WD1、v0.2.0で起草）は、これら3つの`--format`の値＋その契約テーブルを列挙すべきだ。

## ほかのADRとの関係

- [ADR-27](../27-tool-distribution-model/)——配布＋CIチャネル；ここのWD5がその § WD3セットアップテンプレートを出荷する。このADRは出力の兄弟だ。
- [ADR-50](../50-release-engineering-and-stability-strategy/)——WD1が新しい出力フォーマットを公開契約にする；WD2テーブルが凍結される対象だ。
- [ADR-8](../8-steep-inspired-improvements/)——severityプロファイル、これらのフォーマットがマップする`:error`／`:warning`／`:info`レベルの出どころ。
- [ADR-22](../22-baseline-and-project-onboarding/)——これらのフォーマットが不変のまま残す終了コードを形作るベースライン／strictゲート（WD4）。
</content>
</invoke>
