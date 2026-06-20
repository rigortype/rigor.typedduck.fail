---
title: "ADR-73 — SKILL駆動のRigorユーザー体験（`rigor-next-steps`エントリーポイントとライブな`rigor skill --describe`）"
description: "Imported from rigortype/rigor docs/adr/73-skill-driven-user-experience.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/73-skill-driven-user-experience.md"
sourcePath: "docs/adr/73-skill-driven-user-experience.md"
sourceSha: "fbf86e615a157dacdfade14af445d9f9f86f56503aff65aeb0a56e4d22361802"
sourceCommit: "832dbf9f85f234b230c6b72dff329a2055fa34f1"
translationStatus: "translated"
sidebar:
  order: 4073
---

ステータス: **Accepted — WD1〜WD5を2026-06-20に実装**。「このプロジェクトでRigorを使って次に何をすべきか」のための単一のSKILL駆動エントリーポイント——`rigor-next-steps`——を確立し、それをライブでバージョン同期した`rigor skill --describe`が支えることで、配布されるガイダンスが決して陳腐化しないようにします。保留されていた`rigor-protection-uplift`スキルを出荷セットへ昇格させ、ユーザー向けSKILLをどこで配布するか（vercel-labs/skillsとバンドルされたgem）を確定します。`describe`カタログは**成長する**ように設計されています（「カタログの拡張」を参照）。最初の7つの追加——`rigor-rbs-setup`、`rigor-editor-setup`、`rigor-mcp-setup`、`rigor-monkeypatch-resolve`、`rigor-plugin-tune`、`rigor-upgrade`、`rigor-doctor`——が同日に実装されました。

根拠: 既存の`rigor skill`コマンド（[`lib/rigor/cli/skill_command.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli/skill_command.rb)、[ADR-22](../22-baseline-and-project-onboarding/) WD8によりv0.1.13で出荷）、保留されていたact-on-coverageスケルトン（[`docs/design/20260616-act-on-coverage-skill.md`](../../design/20260616-act-on-coverage-skill/)、[ADR-63](../63-type-protection-coverage/) WD5、パイロット検証済み）、そして[`docs/install.md`](../../install/)のエージェント向けインストールフロー。

## コンテキスト

Rigorは`skills/`配下に少数のAgent Skills——`rigor-project-init`、`rigor-baseline-reduce`、`rigor-ci-setup`、`rigor-plugin-author`——を同梱し、インストール後は`rigor skill list/print/path`（`SkillCommand`、`SKILLS_ROOT = <gem_root>/skills`）を通じて提供します。これが使えるセルフサーブ体験になるのを、3つのギャップが妨げています:

1. **単一のエントリーポイントがない**。Rigorについて何も知らないユーザー（やそのコーディングエージェント）には「ここから始める」がありません。`docs/install.md`は単一の宛先をハードコードしており——常に`rigor-project-init`（ステップ4）へ引き渡します——他のスキルは、ユーザーがすでにその名前を知っているのでない限り見えません。
2. **ガイダンスが陳腐化する**。*配布される*SKILLに焼き込まれた「次に何をするか」のアドバイスは、公開時点で凍結されます。Rigorがスキルを増やし推奨を磨いていくにつれて、数か月前にユーザーのリポジトリへインストールされたコピーは静かに腐っていきます——メンテナーが指摘したまさにその失敗です。
3. **SKILL自体の公開配布チャネルがない**。SKILLは`rigortype` gemの中に同梱されているため、エージェントがそれらに到達できるのはRubyとgemがインストールされた*後*だけです。Rigorをまだ採用していないプロジェクトに「ここから始める」スキルを置く方法はありません——そしてそここそ、オンボーディングが始まる場所なのです。

ここで懸かっている恒常的な価値は**セルフサーブのオンボーディング**（ROADMAP § "Onboarding self-serve"）です。ユーザーは任意のコーディングエージェントを自分のリポジトリへ向けるだけで、インストール済みバージョンに同期したアドバイスとともに、Rigorの採用を端から端まで駆動させられるべきです。

## 決定

この体験を、**薄く配布可能なSKILL**と**ライブでgemに常駐する頭脳**へと、1つの規則で分割します:

> **配布の基準**。あるガイダンスが配布されるSKILLへ凍結されるのは、*それが`rigor`の存在より前に実行されねばならない場合に限ります*（コマンドの解決、そのインストール）。Rigorの進化とともに変化するものはすべて——下流スキルのカタログ、その説明、そしてプロジェクト状態→次ステップの推奨——`rigor skill --describe`によって**ライブで**出力され、SKILLへコピーされることは決してありません。

具体的には:

- **`rigor-next-steps`**は新しいエントリーポイントSKILLです（gemにバンドルされ、*かつ*vercel-labs/skillsからインストール可能）。鶏と卵の問題がSKILLへ押し込むブートストラップ連鎖だけを担い、ルーティングはすべて`rigor skill --describe`へ委譲します。
- **`rigor skill --describe`**はライブな頭脳です。安価なプロジェクト状態の探査→推奨される次のスキル→*現在の*フロントマター説明を伴った下流スキルのカタログ→エージェント向けアクションプロンプト。これはgemとともに出荷・更新されるので、ルーティングの知性は常にバージョン同期しています。

### WD1 — 薄いラッパー／ライブな頭脳の分割（土台となる規則）

`rigor-next-steps`の本文は、メンテナーが指定した5ステップのブートストラップ連鎖であり、バージョンに結合したものは何も含みません:

1. PATH上の`rigor`を解決する（`which rigor` / `rigor --version`）。
2. 存在しなければ→[`docs/install.md`](../../install/)に従う（SKILLは生のGitHub URLを指し示します——この1ステップだけが`--describe`駆動にできない理由はWD3を参照）。
3. プロジェクトにRigor設定（`.rigor.yml` / `.rigor.dist.yml`）がなければ→`rigor skill print rigor-project-init`を実行してそれに従う。
4. それ以外→`rigor skill --describe`を実行し、その出力に基づいてルーティングする。推奨される次ステップを提示するか、ユーザーに「次に何をしたいですか？」と尋ね、選ばれたものを`rigor skill print <name>`する。
5. 理想的には、ただ尋ねるのではなく、`--describe`の推奨を先回りして提示する（「Xをするには`<skill>`を使うべきです」）。

ステップ1〜2（および3の存在チェック）は、配布されるSKILLに置いてよい*唯一の*ロジックです。なぜなら、それらは`rigor`——ひいては`rigor skill --describe`——が利用できないときに実行されねばならないからです。ステップ3b〜5は意図的に、埋め込まれたロジックではなく*委譲*になっています。

### WD2 — `rigor skill --describe`の契約

`SkillCommand`上の新しいモードです（`describe`サブコマンド、加えてメンテナーが要望した`--describe`フラグ表記。`lib/rigor/cli/skill_command.rb`の`run`が`list` / `print` / `path`と並べてディスパッチします）。呼び出し元のエージェントに向けて、標準出力へ次を出力します:

- **プロジェクト状態** — cwdの存在のみの探査です。設定（`.rigor.yml` / `.rigor.dist.yml`）、ベースライン（`.rigor-baseline.yml`）、`sig/`、CI配線（`.github/workflows/*`、`.gitlab-ci.yml`）。**`rigor check`は決して実行しません**——推奨に必要なのは存在シグナルだけであり、完全な解析は*下流*スキルの仕事です。
- **推奨される次ステップ** — それらのシグナルにわたる小さな決定木です（設定なし→`rigor-project-init`、設定あり＋CIなし→`rigor-ci-setup`、設定あり＋ベースライン→`rigor-baseline-reduce`、保護の目標→`rigor-protection-uplift`、未解決のプロジェクトDSL→`rigor-plugin-author`）。
- **カタログ** — バンドルされた各スキルを、そのフロントマター`description`とともに列挙します（そのためテキストは常に最新です。`discover_skills`はYAMLフロントマターをパースするよう拡張されます）。加えて、それをロードする`rigor skill print <name>`も。
- **エージェント向けアクションプロンプト** — レポートを行動へ転じる締めの指示です（`print`がすでに使っているのと同じ`# `接頭ヘッダー規約なので、結合された出力はmarkdownとしてパース可能なままです）。

ガードレール: `--describe`は**読み取り専用で副作用がありません**——存在確認のためのstat以上にはプロジェクトファイルに触れないので、エージェントはいつでも自由に実行できます。

### WD3 — `rigor-next-steps`のインストール分岐は`docs/install.md`を指し、install.mdは折り返して委譲する

インストールステップ（WD1のステップ2）は、`--describe`駆動にできない唯一の分岐です——`rigor`がインストールされていなければ、尋ねるべきバイナリがありません。そこで`rigor-next-steps`は生の`docs/install.md` URLへのポインターを埋め込みます（インストールの仕組みはめったに変わりません。これは最小の陳腐化しうるサーフェスであり、必要に迫られて受け入れたものです）。逆に、今日は常に`rigor-project-init`へ引き渡している`docs/install.md`のステップ4は、同じ`rigor skill --describe`ルーティングへ委譲するよう書き換えられます。そのため`install.md`と`rigor-next-steps`は「インストールの後に何が来るか」で食い違うことができません。

### WD4 — `rigor-protection-uplift`を出荷セットへ昇格させる

保留されていたact-on-coverageスケルトン（[`docs/design/20260616-act-on-coverage-skill.md`](../../design/20260616-act-on-coverage-skill/)、ADR-63 WD5——5つのOSSリポジトリで平均保護+4.7pp／診断のリグレッションゼロでパイロット検証済み）が、兄弟のフロントマター（`license`、`metadata`）を伴って`skills/rigor-protection-uplift/SKILL.md`へと昇格します。これは、設計ドキュメントが「ADR-31のv0.2.0外部作者向け経路」へ先送りしていた未解決のパッケージング問題を決着させます。答えは、他のあらゆるユーザー向けスキルと同じ二重チャネル（WD5）であり——別途ビルドすべき外部作者向け成果物は存在しません。パイロットの記録は根拠として設計ノートに残ります。

### WD5 — 配布の衛生: 2つのチャネル、貢献者スキルは隠す

- **2つのチャネル、1つのソース**。ユーザー向けスキルは（a）**vercel-labs/skills**経由——`npx skills add rigortype/rigor`（あるいはスキル単位で、文書化されたエントリーとして`rigor-next-steps`を使う）。これはリポジトリから直接`skills/<name>/SKILL.md`を発見し、gemがインストールされる*前*に機能します——および（b）**`rigortype` gemにバンドル**され、インストール後に`rigor skill`が提供します。両者は同じ`skills/`ツリーを読みます。2つ目のgemやリポジトリはありません（[ADR-31](../31-contribution-and-supply-chain-policy/)の単一gem決定、および2つの新しいディレクトリを自動的に含めるgemspecの既存の`skills/*/SKILL.md`グロブと整合します）。
- **貢献者ワークフローを隠す**。vercel-labs/skillsは`.claude/skills/`——Rigorの*貢献者*ワークフロー（リリース準備、ADR作成、…）——も発見します。各々に`metadata.internal: true`を付け、一括の`npx skills add rigortype/rigor`がリリースツールをエンドユーザーへ出荷しないようにします。
- **`skills/README.md`**が両方のチャネル、`rigor skill --describe`エントリー、そして貢献者／ユーザーの区分を文書化します。

## 却下／先送りした代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| ルーティング＋推奨ロジックを配布される`rigor-next-steps` SKILLに埋め込む | 却下 | バージョンに結合したアドバイスを公開時点で凍結する→このADRが防ぐために存在する陳腐化そのもの。分割の全目的は、そのロジックをgemに留めることにある。 |
| `rigor skill --describe`が推奨のために`rigor check` / `coverage`を実行する | 却下 | 存在シグナルだけで足りるルーティングのヒントには、遅く副作用がある。深い解析は、推奨が振り向ける先の下流スキルに属する。 |
| エントリーポイントをSKILLではなく`rigor`サブコマンドにする | 却下 | エントリーポイントは`rigor`がインストールされる*前*に機能しなければならない（インストール分岐）。バイナリのサブコマンドは自身の不在をブートストラップできないが、配布可能なSKILLにはできる。 |
| SKILL向けに別個の`rigor-skills` gem／gitリポジトリを設ける | 却下 | スキルはすでに`rigortype`に同梱されており、vercel-labs/skillsは同じリポジトリからインストールする——2つ目の成果物は何の利得もなくソースを重複させる（ADR-31の単一gem）。 |
| `.claude/skills/`をvercel-labs/skillsから発見可能なままにする | 却下 | 一括インストールが貢献者専用ワークフロー（リリース、ADR作成）をエンドユーザーへ出荷してしまう。`metadata.internal: true`がこのツールの公認の隠蔽手段である。 |
| v0.2.0の外部作者向け経路が構築されるまで`rigor-protection-uplift`を保留したままにする | 解消 | このADRが*まさに*その決定——外部作者向け経路は既存の二重チャネルであり、昇格を妨げるパッケージング作業はもうない。 |

## 帰結

ポジティブ:

- どのエージェントにとっても1つの「ここから始める」があり、推奨はインストール済みのRigorに同期したままです——オンボーディングのアドバイスは、SKILLを1つも再公開することなく、リリースごとに磨けます。
- SKILLは、Rigorをまだ採用していないプロジェクトへ本当にインストール可能（vercel-labs/skills）になり、インストール前の発見可能性のギャップを閉じます。
- `rigor-protection-uplift`がついに出荷されます。完全性を高めるループがエントリーポイントから到達可能になります。

ネガティブ／持ち越し:

- `rigor-next-steps`内の生の`docs/install.md` URL（WD3）は、小さな陳腐化しうるサーフェスです——インストールはgemに先行せねばならないため受け入れています。コピーではなくポインターに留めることで緩和しています。
- `rigor skill --describe`の出力テキスト＋新しいスキル名は、**[ADR-50](../50-release-engineering-and-stability-strategy/) WD1のもとv1.0で凍結される公開語彙**になります——推奨の*ロジック*は自由に進化できますが、コマンド名とスキルidは、1.0が出荷されれば互換性のコミットメントです。
- 状態→スキルの決定木（WD2）はヒューリスティックです。スキルセットが成長すれば調整が必要になります。これは意図的に小さく加算的です——間違った推奨のコストは冗長な提案であって、偽の診断では決してありません（完全に偽陽性エンベロープの外側です）。

## カタログの拡張 — 追加の機械的な、describe経由でルーティングされるスキル

`describe`の決定木（WD2）とカタログは、意図的に**開かれて**います。Rigorの採用と運用のジャーニーの大半は、エージェントが*既存の*CLIを通じて駆動できる機械的な作業であり、そうしたワークフローのそれぞれが、新しいスキル1つと決定木の分岐1つになります。ルーティングのロジックはgemに存在する（WD1）ので、宛先を追加すると、配布される`rigor-next-steps`に触れることなく、インストールされたあらゆるコピーの`describe`が鋭くなります。

候補が適格になるのは、それが（a）既存のCLI（または小さな*加算的*なコマンド）から駆動でき、（b）**安価な存在のみのシグナル**でルーティングするので`describe`が副作用なしのままで（WD2のガードレール）、かつ（c）偽陽性エンベロープの外側にある——間違った推奨のコストは冗長な提案であって、診断では決してない——ときです。

| スキル | ルーティングシグナル（存在のみ） | 基盤 | ステータス |
| --- | --- | --- | --- |
| `rigor-rbs-setup` | `Gemfile.lock`が存在 ∧ `rbs_collection.lock.yaml`がない（見出し分岐） | `rbs collection install`（自動検出、[`rbs_collection_discovery.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/environment/rbs_collection_discovery.rb)を参照） | **実装済み（2026-06-20）** |
| `rigor-editor-setup` | `rigor`への参照を含まずにコミットされた`.vscode/`（見出し分岐。ユーザーローカルなNeovim / Emacs / Helix設定についてはカタログのみ） | `rigor lsp`（[ADR-19](../19-language-server-packaging/)）、マニュアルのエディター章へルーティング | **実装済み（2026-06-20）** |
| `rigor-mcp-setup` | `rigor`への参照を含まずにコミットされた`.mcp.json` / `.cursor/mcp.json`（見出し分岐。ユーザーローカルなクライアント設定についてはカタログのみ） | `rigor mcp`（[ADR-33](../33-mcp-server/)）、マニュアルのMCP章へルーティング | **実装済み（2026-06-20）** |
| `rigor-monkeypatch-resolve` | カタログのみ——シグナルは存在チェックではなく`triage`の実行を要する | `pre_eval:`（[ADR-17](../17-monkey-patch-pre-evaluation/)）＋`rigor triage` | **実装済み（2026-06-20）** |
| `rigor-plugin-tune` | カタログのみ——`Gemfile.lock`をプラグインカタログへ再マッチングするのはオンデマンドのパスであり、安価な存在シグナルではない | `rigor plugins --strict`＋同梱のプラグインカタログ | **実装済み（2026-06-20）** |
| `rigor-upgrade` | カタログのみ——ベースラインはスキーマバージョンしか記録せず、生成したRigorのバージョンは記録しないので、「インストール済みより古い」チェックは利用できない（将来ベースラインに`generated_with:`フィールドが入れば、見出し分岐を獲得できるだろう） | `rigor diff` / `rigor baseline regenerate` | **実装済み（2026-06-20）** |
| `rigor-doctor` | カタログのみ——存在シグナルを読むのではなくバリデーターを*実行する* | `rigor check`の設定監査（`config_warnings`）＋`rigor plugins --strict`＋`rigor baseline drift`（新しいコマンドは不要） | **実装済み（2026-06-20）** |

`rigor-rbs-setup`はジャーニーの順序で**`rigor-project-init`のすぐ後**に位置します。コミュニティRBSは、ベースラインやCIの作業の前に、支配的な`Dynamic`の発生源（protection-upliftの「正直な境界」がその上限として名指しした、RBSを欠く外部gem）を取り除きます。そのため早期に行えば、後でよりノイズの多い診断セットに対して再ベースラインを取る事態を避けられます。

すべての宛先が見出し分岐を獲得するわけではありません。決定木は**線形な正しさのジャーニー**を、信頼できるプロジェクトファイルのシグナルでゲートします。**DX／統合**スキル（`rigor-editor-setup`、`rigor-mcp-setup`）は*カタログ優先*です——「次に何をしたいですか？」の経路を通じてエージェントが提示できるよう列挙され、見出し推奨を発火させるのは、強くリポジトリから見えるシグナル（`rigor`を含まずにコミットされた`.vscode/`）があるときだけです。なぜなら、それらの本当の設定はユーザーローカルで、検出できないからです。同じことが**メンテナンス／検証**スキル（`rigor-plugin-tune`、`rigor-upgrade`、`rigor-doctor`、`rigor-monkeypatch-resolve`）にも当てはまります。それらのトリガーは*イベント*（新しいgem、バージョンの引き上げ）または*ランタイムのチェック*（`triage`／バリデーターのパス）であって、探査がstatできるファイルではありません。そのため、ユーザーの目標や診断が求めるときにエージェントが提示する、カタログのエントリーです。信頼できる存在シグナルを露出できないスキルは、カタログのエントリーであって、強制される推奨では決してありません。

## 他のADRとの関係

- **[ADR-22](../22-baseline-and-project-onboarding/)**（ベースライン＋プロジェクトオンボーディング） — オンボーディングSKILL三点セットと`rigor skill`コマンド（WD8）を導入しました。このADRはそれらの前にエントリーポイントを置き、ルーティングをライブにします。
- **[ADR-27](../27-tool-distribution-model/)**（ツール配布モデル） — `rigor`自体がどう配布されるかを統制します。このADRはその上に、2つ目の成果物なしで*SKILL*配布チャネル（vercel-labs/skills）を追加します。
- **[ADR-31](../31-contribution-and-supply-chain-policy/)**（貢献＋サプライチェーン） — protection-upliftスキルが待たされていた外部作者向け経路です。WD4/WD5はそれを既存の二重チャネルへと解決します。
- **[ADR-63](../63-type-protection-coverage/)**（型保護カバレッジ） — WD5のact-on-coverageレイヤーです。このADRはそれを`rigor-protection-uplift`として出荷します（WD4）。
- **[ADR-19](../19-language-server-packaging/) / [ADR-33](../33-mcp-server/)** — 「新しい`rigor`サブコマンドのパッケージング」という兄弟ADRです。`rigor skill --describe`はそれらのCLIサーフェスのパターンに従います。
- **[ADR-50](../50-release-engineering-and-stability-strategy/)**（リリースエンジニアリング） — 新しいCLI出力＋スキルidを1.0で公開語彙として凍結します（帰結を参照）。
