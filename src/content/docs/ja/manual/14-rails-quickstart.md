---
title: "Rails向けRigor — miseを使ったステップバイステップセットアップ"
description: "rigortype/rigor docs/manual/14-rails-quickstart.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/14-rails-quickstart.md"
sourcePath: "docs/manual/14-rails-quickstart.md"
sourceSha: "baac3ab8c9b1b4a34d0cb187ccac6cbd689054ad21cba37b4c821bdd1faee511"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 9014
---

このウォークスルーでは、Railsプロジェクトをゼロから最初の`rigor check`実行まで導きます。[`mise`](https://mise.jdx.dev/)を使ってRuby 4.0と合わせてRigorをインストールし、解析器をプロジェクトの`Gemfile`の外に置きます。

セットアップの進め方は2通りあります。

| | アプローチ | 向いているケース |
| --- | --- | --- |
| **A** | [`rigor-project-init`スキル](#path-a--rigor-project-initスキル推奨) | ほとんどのプロジェクト——スキルがスタックを検出し、プラグインを提案し、設定を書いてくれます。 |
| **B** | [手動のステップバイステップ](#path-b--手動のステップバイステップ) | 各決定を明示的に制御したい場合。 |

どちらも同じ結果になります。**迷ったらPath Aを選んでください**。

---

## 開始前の確認

以下が必要です。

- **`mise`のインストール** — まだの場合は[miseのはじめかたガイド](https://mise.jdx.dev/getting-started.html)に従ってください。`asdf`や素の`gem install`を好む場合は[Rigorのインストール](../01-installation/)を参照してください。
- **`mise`のシェルへの組み込み** — `eval "$(mise activate zsh)"`（またはお使いのシェルに合わせた同等の記述）をシェルのrcファイルに追加し、`rigor`が`PATH`から到達できるようにします。詳細は[Rigorのインストール § RigorをPATHに追加する](../01-installation/)を参照してください。
- **既存のRailsプロジェクト**（パスが分かっている状態）。

---

## ステップ1 — Ruby 4.0とRigorのインストール（両Pathに共通）

> **AIエージェントを使っている場合は**、代わりに機械読み取り可能なインストールガイドを参照してください。
>
> ```
> Install Rigor in this project by following the instructions at
> https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
> ```
>
> エージェントが環境（mise / asdf / 素のRuby）を検出し、適切なツールをインストールして、自動的に`rigor-project-init`に引き渡します。

**お使いの言語でセットアップ** ——このプロンプトは平易な自然言語なので、母語で書く（そしてセットアップの会話全体を母語で進める）ことができます。16言語の出来合いのプロンプトは[Rigorのインストール § お使いの言語でセットアップ](../01-installation/#お使いの言語でセットアップ)にあります。

**プロジェクトルート**でターミナルを開き、以下を実行します。

```sh
mise use ruby@4.0
mise use gem:rigortype
```

`mise use`は、現在のディレクトリの`mise.toml`に選択したバージョンを記録し、一ステップでインストールします。確認してください。

```sh
rigor --version
```

すべてのプラグインは**`rigortype` gem内にバンドル済み**です——追加のgemインストールは不要です。プラグインはデフォルトで無効です。`.rigor.dist.yml`の中で必要なものを有効化します。これがプロジェクトごとに異なる唯一の手順です。

---

## Path A — rigor-project-initスキル（推奨）

`rigor-project-init`スキルは残りのセットアップを自動化します。ファイルを読んでシェルコマンドを実行できるAIコーディングエージェントであれば動作します——Claude固有の仕組みは不要です。

### スキルの動作内容

8つのフェーズを順に実行します。

1. **検出** — `Gemfile` / `Gemfile.lock`を読み込んでフレームワークファミリー（Rails、dry-rb、Sinatraなど）と存在するgemを識別します。
2. **導入モードの選択** — *acknowledge*（acknowledgeモード——今日の診断をベースライン（baseline）にスナップショット;以後のリグレッションを検出）か*strict*（strictモード——ゼロに抑える）かを提案します。最初の診断数が100件超のコードベースにはacknowledgeを推奨します。
3. **プラグインの選択** — 検出されたスタックに対応するプラグインセットを提案します。確認またはリストの削減ができます。
4. **`.rigor.dist.yml`の書き込み** — コミット対象の共有設定。選択したモードに合わせた`severity_profile:`が含まれます。
5. **Sig引き上げ** — `rigor sig-gen --write`を実行し、Rigor自身の推論からベースラインの`sig/`を生成します。
6. **トリアージ** — `rigor triage --format json`を実行して診断ストリームをクラスタ別に解析します。
7. **ベースライン**（acknowledgeモードのみ）— `.rigor-baseline.yml`を生成し、設定の`baseline:`を接続します。
8. **実バグの表面化** — 本物のバグである可能性が高いクラスタをハイライトし、アプリ固有のメタプログラミングやRigorの組み込みカバレッジのギャップに対するエスカレーションパスを提案します。

### 呼び出し方

AIコーディングエージェントに次のいずれかを伝えてください。

> "Set up Rigor in this project."
> "Configure Rigor for this Rails app."
> "Add type checking."

エージェントは次のコマンドを実行して応答するはずです。

```sh
rigor skill print rigor-project-init
```

このコマンドはSKILL定義を標準出力に出力します——SKILLファイルとその`references/`ディレクトリの絶対パスを含む短いヘッダー、続いてSKILL本文です。エージェントはその手順に従い、ヘッダーが示すディレクトリから`references/NN-*.md`ファイルを順に読み込みます。

エージェントが自動的にコマンドを実行しない場合は、明示的に依頼してください: **"`rigor skill print rigor-project-init`を実行して、表示される手順に従ってください。"**

このフローは任意のバンドルスキルに対して使用できます。

- `rigor skill list` — パス付きで全バンドルスキルをリストアップします。
- `rigor skill print <name>` — SKILLの本文を表示します。
- `rigor skill path <name>` — `SKILL.md`の絶対パスだけを表示します（エージェントがファイルを直接読む場合に便利）。

スキルはインストール済みの`rigortype` gem内の`rigor skill path rigor-project-init`が示すパスにあります。正規のソースは[`skills/rigor-project-init/SKILL.md`](https://github.com/rigortype/rigor/blob/master/skills/rigor-project-init/SKILL.md)です。

---

## Path B — 手動のステップバイステップ

### ステップ2 — 導入モードの選択

| モード | 適したケース | 動作 |
| --- | --- | --- |
| **Acknowledge** | 多くの診断を抱えた既存コードベース | 今日の診断をベースラインに記録し、PRごとに新しいものだけを表示する。 |
| **Strict** | 新規または小規模なプロジェクト | 未解決診断ゼロ;ベースラインなし。 |

最初の`rigor check`で100件超の診断が報告される場合、acknowledgeモードが自然な出発点です。後から厳しくすることもできます。

### ステップ3 — .rigor.dist.ymlの作成

慣習として`.rigor.dist.yml`を共有プロジェクト設定としてコミットし、`.rigor.yml`は開発者個人のローカルオーバーライド（gitignore）に残します。両ファイルが存在する場合、`.rigor.yml`が優先されます。

プロジェクトルートに`.rigor.dist.yml`を作成してください。

```yaml
# .rigor.dist.yml — Rigor設定（コミット対象; 共有）

target_ruby: "3.3"   # Railsアプリが対象とするRubyバージョン

paths:
  - app
  - lib

exclude:
  - vendor
  - tmp

plugins:
  # Rails core
  - rigor-activerecord
  - rigor-actionpack
  - rigor-rails-routes
  - rigor-rails-i18n
  - rigor-actionmailer
  - rigor-activejob
  # 任意 — ActiveSupportのcore_ext RBSは、activesupportがGemfile.lockにあれば
  # 自動適用されるようになりました（ADR-72）。このプラグインは、より充実した
  # オプトインのサーフェスが欲しい場合にのみ追加します（自動オーバーレイの代わりになります）。
  - rigor-activesupport-core-ext
  # テスト — プロジェクトで使っているものだけ残す
  - rigor-rspec
  - rigor-factorybot

severity_profile: lenient   # strictモードの場合は "strict"; 省略すると "balanced"

# baseline: .rigor-baseline.yml   # ステップ6の後にコメントアウトを外す（acknowledgeモードのみ）
```

`target_ruby:`はプロジェクトのRubyバージョン（`Gemfile`または`.ruby-version`の値）に合わせ、`plugins:`リストは実際に使っているものだけに絞ってください。

> **ActiveSupportのcore_extは自動的にカバーされます**。`activesupport`が`Gemfile.lock`にあるのにRBSを同梱していないとき、Rigorはバンドルされたcore_extのRBSオーバーレイを自動ロードします（[ADR-72](../../adr/72-gemfile-lock-gated-rbs-overlays/)）。そのため拡張メソッド呼び出し（`3.days`、`"x".squish`、`Time.current`など）はプラグインや設定なしで解決されます——実際のRailsアプリでこれは単一最大の偽陽性クラスタになることがほぼ確実です（Mastodonの計測では489件の`call.undefined-method`診断のうち約365件がまさにこれが原因でした）。上記の`rigor-activesupport-core-ext`プラグインはいまや任意です。より充実したオプトインのサーフェスが欲しい場合に追加してください。そのとき自動オーバーレイはそれに合わせて身を引きます。`activesupport`のない素のRubyプロジェクトは、依然として本物の診断を受け取ります。

スタックに応じて追加を検討するプラグイン:

| プラグイン | 使うケース |
| --- | --- |
| `rigor-activestorage` | `has_one_attached` / `has_many_attached` |
| `rigor-actioncable` | ActionCableチャンネル |
| `rigor-devise` | Devise認証 |
| `rigor-pundit` | Punditポリシー |
| `rigor-sidekiq` | Sidekiqワーカー |
| `rigor-rspec-rails` | RSpec HTTPステータスマッチャー |
| `rigor-shoulda-matchers` | shoulda-matchers |
| `rigor-minitest` | Minitest / Test::Unit |

フルカタログは[`plugins/README.md`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)を参照してください。

キャッシュディレクトリを`.gitignore`に追加してください。

```
.rigor/
```

### ステップ4 — 最初の実行

```sh
rigor check
```

型チェックを一度も行っていないプロジェクトでは最初のカウントが多いのは正常です。

### ステップ5 — 出力の理解

`rigor triage`は診断ストリームを1件ずつ列挙する代わりにまとめて表示します。

```sh
rigor triage
```

ルールIDでグループ化し、ファイル別のホットスポットを示し、よくあるクラスタには簡潔な「理由」のヒントを表示します——たとえば、`call.undefined-method`エラーの大きなブロックがActiveSupportのcore_extバンドルの欠如によるものである可能性や、gemがRBSを同梱しておらず`rbs collection install`で解決できることなどを指摘します。

トリアージ出力を使って、どこから着手するかを決めましょう: まず本物のバグ、次にベースラインに記録すべき大きなクラスタの順です。

> **Railsルートの診断**。`rigor-rails-routes`はルートヘルパーを静的にチェックします。標準的なRailsパターンのほとんどはサポートされていますが、v0.1.xではいくつかが`unknown-helper`の誤検知（false positive）を生成します。
>
> - `concern :name do ... end`ブロック内にのみ定義されたルート。concernの本体は定義時にスキップされます（アリティ（arity）違いの誤検知を避けるため）。`concerns: :name`で注入されたヘルパーは未知として表示されます。
> - `devise_for :users`やその他のエンジンマクロが生成するルート——パーサはRubyコードを実行しません。
>
> 存在するはずのルートで`unknown-helper`のクラスタが見える場合、acknowledgeモードが正しいアプローチです——それらをベースラインに記録し、残った診断で実際の問題を見つけましょう。

### ステップ6 — ベースラインの生成（acknowledgeモード）

*strictモードを選んだ場合はこのステップをスキップしてください。*

```sh
rigor baseline generate
```

これでプロジェクトルートに`.rigor-baseline.yml`が書き込まれます。`.rigor.dist.yml`の`baseline:`行のコメントアウトを外して有効化します。

```yaml
baseline: .rigor-baseline.yml
```

ベースラインが有効な状態では、`rigor check`は現在のコードベースでクリーンに終了し、ベースライン取得後に*新たに現れた*診断だけを表示します。完全なベースラインワークフローは[ベースライン](../06-baseline/)を参照してください。

### ステップ7 — コミット

```sh
git add mise.toml .rigor.dist.yml .gitignore
git add .rigor-baseline.yml   # ステップ6で生成した場合
git commit -m "Add Rigor type checker"
```

`mise.toml`はRuby 4.0とRigorのバージョンをすべての貢献者向けにピン留めします——別のマシンで`mise install`を実行すれば、プロジェクトの`Gemfile`を変更することなく完全に同じツール群が復元されます。

---

## 次のステップ

- **CI** — プルリクエストが自動的にゲートされるよう独立したRigorジョブを追加する: [CIでのRigor実行](../11-ci/)。
- **エディタ** — 入力しながらインラインで診断を表示する: [エディタ統合](../09-editor-integration/)。
- **ベースラインの削減** — `rigor-baseline-reduce`スキルを使ってルールごとにバックログを解消していく: [ベースライン](../06-baseline/)。
- **プラグイン** — 各プラグインのドキュメントには設定オプションの詳細が記載されています: [プラグインの使い方](../07-plugins/)と[`plugins/`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)。
