---
title: "Rigorのインストール — AIエージェント向け手順"
description: "rigortype/rigor docs/install.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/install.md"
sourcePath: "docs/install.md"
sourceSha: "da12eeda66548e583e83bebe466730859a213b20d24083d2a7d9a000d0cc19dc"
sourceCommit: "e12ab45fa55707ed2acc0eae2e273b99a72dc077"
sourceDate: "2026-09-28T02:04:30+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

この手順はAIコーディングエージェント向けに書かれています。各ステップを順番に実行してください。シェルコマンドはそのまま実行してください。ステップが失敗した場合は、続行する前に停止してエラーを報告してください。

目標はRigorをインストールし、`rigor skill describe`に引き渡すことです。`rigor skill describe`はプロジェクトの状態を報告し、適切な次ステップのスキル（Rigorを一度も実行したことがないプロジェクトでは`rigor-project-init`）へルーティングします。

**Rigorをプロジェクトの`Gemfile`に追加しないでください**——Rigorはライブラリではなく、スタンドアロンツールです。

**すでにマシン上にあるものではなく、最新リリースをインストールしてください**。すでにPATHにある`rigor`や、古いリリースに解決されるバージョンマネージャーは、途中で処理を切り上げる理由にはなりません。Rigorは急速に変化しており、このガイドが引き渡す各種スキルは最新リリース向けに記述されています。ステップ1で最新バージョンを調べ、ステップ2でインストールし、ステップ3で検証します。

---

## ステップ1 — 環境の検出

次のチェックを実行し、どのツールが利用可能かを確認してください。

```sh
which mise    # 推奨——ステップ2Aを参照
which asdf    # 代替——ステップ2Bを参照
ruby --version 2>/dev/null | head -1   # Ruby 4.0はすでにPATHにあるか？
which docker  # 最終手段——「最終手段 — Docker」を参照
rigor --version 2>/dev/null            # 既存のインストールがあれば確認
```

続いてRubyGems上の最新のRigorリリースを調べます。

```sh
curl -fsS https://rubygems.org/api/v1/versions/rigortype/latest.json
```

これは`{"version":"X.Y.Z"}`を出力します。以降、`<LATEST>`はこの`X.Y.Z`を表します。取得したバージョンに置き換え、決して`<LATEST>`をリテラルのまま入力しないでください。`curl`がない場合、Rubyが利用可能であれば`gem search --remote --exact rigortype`でも同じ結果が得られます。どちらも機能しない場合は、推測するのではなく最新バージョンを特定できなかった旨をユーザーに伝えてください。

`<LATEST>`より古い既存の`rigor`がある場合でも、ステップ2をそのまま進めてください。ユーザーに現在のバージョンとインストールするバージョンを伝えます。

その後、**最初に**一致するケースに進んでください。

---

## ステップ2 — Ruby 4.0とRigorのインストール

### ケースA — miseが利用可能（推奨）

**miseとは？**
[mise](https://mise.jdx.dev/)はランタイムとツールのバージョンマネージャーです——`rbenv`と`nvm`を合わせたようなもので、タスクランナーも兼ねています。Rubyランタイム（Ruby、Node、Pythonなど）とツールgem（`rigortype`など）をプロジェクトごとにインストール・管理し、バージョンを`mise.toml`に記録してコードと一緒にコミットできます。他の貢献者やCIは`mise install`を実行するだけで、`Gemfile`を変更せずにそれらのバージョンを再現できます。

まずmiseがどのRigorバージョンを選択するか確認します。

```sh
mise latest gem:rigortype
```

それが`<LATEST>`より古い場合、miseは新しいリリースを保留しています——通常は`minimum_release_age`隔離（quarantine）によるもので、公開後の一定期間リリースを隠します（このとき`mise ls-remote gem:rigortype`は標準エラー出力に`1 newer gem:rigortype release hidden by minimum_release_age`と警告します）。引数なしの`mise use gem:rigortype`はエラーなしで古いバージョンをインストールしてしまうため、ここでエージェントが意図せず古いRigorを使ってしまう原因になります。この隔離はサプライチェーンの保護機能であるため、独断で回避しないでください。ユーザーに双方のバージョンを伝え、どちらをインストールすべきか尋ねてください。`mise settings get minimum_release_age`を実行すると、それが誰の設定によるものかが分かります。エラー（"not set"）の場合はmiseの組み込みデフォルトが有効であり`<LATEST>`を推奨できます。値が返る場合はユーザー自身が設定したものであるため、それを尊重することを推奨してください。

次に、ユーザーが同意したバージョンを指定してプロジェクトルートで実行します。

```sh
mise use ruby@4.0
mise use --pin gem:rigortype@<LATEST>
```

`mise use`はツールをインストールし、一ステップでバージョンを`mise.toml`に書き込みます。バージョンを共有するために`mise.toml`をコミットしてください。上記のようにバージョンを明示的に指定してください。明示的なバージョン指定であれば、隔離によって`mise latest`から隠されている場合でもインストールされます。

`--pin`は正確なRigorバージョン（`"gem:rigortype" = "X.Y.Z"`）を記録します。これがないとmiseは`"gem:rigortype" = "latest"`と書き込み、各マシンが最初にインストールするときにそのとき最新のものへ再解決します——つまりコミットされた`latest`はチームに1つの共有バージョンを与えません。トレードオフとして、pinはひとりでに動かず、`mise outdated`はpinされたツールを遅れているとは報告できません。アップグレードは新しいバージョンを指定して`mise use --pin gem:rigortype@<version>`を再実行します。`mise upgrade --bump gem:rigortype`は素の`mise use`と同じ隔離を経由します。

`~/.config/mise/config.toml`にあるユーザー全体の`gem:rigortype`エントリは、このプロジェクトの外部で引き続き適用されます。古いバージョンが指定されている場合は言及してください。ただしユーザーの同意なしにグローバル設定を編集しないでください。

確認してください。

```sh
rigor --version
```

`rigor`が見つからない場合、miseがまだシェルに組み込まれていない可能性があります。次のいずれかを実行してください。

```sh
# インタラクティブシェル（~/.zshrcや~/.bashrcに永続的に追加）:
eval "$(mise activate zsh)"   # またはbash / fish

# またはshimsディレクトリを直接使用:
export PATH="$HOME/.local/share/mise/shims:$PATH"
```

その後、`rigor --version`を再実行してください。それでも失敗する場合は、`mise exec gem:rigortype -- rigor --version`を一時的な確認として実行してください。

---

### ケースB — asdfが利用可能

`asdf`はmiseと同じモデルに従いますが、gemバックエンドがないため、Rubyバージョンを設定した後`gem install`でgemをインストールします。

```sh
asdf install ruby latest:4.0
asdf local ruby latest:4.0
gem install rigortype -v <LATEST>
asdf reshim ruby
```

確認してください。

```sh
rigor --version
```

注意: miseとは異なり、ここでの`gem install`はプロジェクト設定ファイルにバージョンをピン留めしません。プロジェクトごとのピン留めにはmiseへの切り替えを検討してください。詳細は<https://mise.jdx.dev/getting-started.html>を参照。

---

### ケースC — Ruby 4.0がすでにPATHにある

`ruby --version`が`ruby 4.0.*`と報告する場合は、直接gemをインストールしてください。

```sh
gem install rigortype -v <LATEST>
```

確認してください。

```sh
rigor --version
```

このアプローチではプロジェクトごとのバージョンピン留めができません。共有コードベースにはバージョンマネージャー（ケースAまたはB）の方が適しています。

---

### ケースD — miseがまだインストールされていない（ruby、asdfもなし）

まず公式のはじめかたガイドに従ってmiseをインストールしてください。
<https://mise.jdx.dev/getting-started.html>

そのページの一行スクリプトは次のとおりです。

```sh
curl https://mise.run | sh
```

miseをインストールしてシェルで有効化した後、**ケースA**に戻ってください。

---

### 最終手段 — Docker

上記のいずれも環境で実行できない場合は、Dockerコンテナ内でRigorを実行できます。

```sh
docker run --rm -v "$(pwd):/app" -w /app ghcr.io/rigortype/rigor:latest rigor check
```

このアプローチはコンテナファイルシステム境界によるオーバーヘッドがあり、エディタLSPとの統合も良くありません。ホスト側のRuby 4.0が本当に利用できない場合（たとえばWSLのないWindows）にのみ使用してください。他のすべての環境ではケースA〜Dを優先してください。

DockerではホストのPATHに`rigor`が存在しないため、ステップ3では代わりにイメージを確認します: `docker run --rm ghcr.io/rigortype/rigor:latest rigor --version`。イメージはRubyGemsより1リリース遅れることがあります。不一致を失敗として扱うのではなく、そのバージョンをユーザーに報告してください。

---

## ステップ3 — インストールの確認

```sh
rigor --version
```

報告されるバージョンはステップ2でインストールしたものであるべきです（通常は`<LATEST>`）。それより古い場合、いまインストールしたものとは異なる`rigor`が実行されています。miseを使用している場合は、まずプロジェクトが何に解決されているかを確認してください。

```sh
mise exec -- rigor --version
mise which rigor
```

`mise exec`が新しいバージョンを報告する場合、シェルのPATHが古くなっています（非インタラクティブシェルは`mise use`後にmiseのアクティベーションを再実行しません）。`eval "$(mise hook-env)"`を実行するか、残りのステップで`mise exec -- rigor`を使用してください。それ以外の場合は`which -a rigor`を実行して古いインストールを見つけてください。確認なしに何かをアンインストールして解決しようとせず、ユーザーに伝えないまま古いバージョンで続行しないでください。コマンドが見つからない場合は、お使いのケースに合わせてステップ2を見直してください。

---

## ステップ4 — Rigorに次に何をすべきか尋ねる

`rigor`がPATHにある状態で、このプロジェクトの次ステップをRigorに選ばせましょう:

```sh
rigor skill describe
```

これはプロジェクトの現在の状態（設定 / ベースライン（baseline）/ `sig/` / CI）を報告し、理由とともに次に実行すべきスキルを推奨し、すべてのスキルをその現在の説明とともに列挙します。出力される`## Recommended next step`に従ってください——まだ`.rigor.yml`がないプロジェクトでは、それは`rigor-project-init`です:

```sh
rigor skill rigor-project-init
```

`rigor skill <name>`はSKILL定義を出力します——ファイルパスを含むヘッダーに続いてSKILL本文です。上から下まで従ってください。project-initスキルはプロジェクトのスタックを検出し、プラグインを提案し、`.rigor.dist.yml`を書き込み、必要に応じてベースラインをスナップショットします。プロジェクトのセットアップが済んだら、その次のステップのために`rigor skill describe`を再実行してください。

`rigor skill describe`が認識されない場合、お使いのRigorのバージョンが古く、ステップ1で見つかったバージョンになっていません。ステップ3に戻ってください。ユーザーの合意のもとで古いバージョンのまま進める場合は、`rigor skill rigor-project-init`を直接実行してください。
