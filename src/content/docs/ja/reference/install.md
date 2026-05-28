---
title: "Rigorのインストール — AIエージェント向け手順"
description: "rigortype/rigor docs/install.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/install.md"
sourcePath: "docs/install.md"
sourceSha: "6a31bf9c442e584247891c0914df4a275fd2190e64dc7f42fe86068be630ae6f"
sourceCommit: "152a3193d3ab92a112fe02c05215c618afe663c4"
sourceDate: "2026-05-29T03:05:46+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

この手順はAIコーディングエージェント向けに書かれています。各ステップを順番に実行してください。シェルコマンドはそのまま実行してください。ステップが失敗した場合は、続行する前に停止してエラーを報告してください。

目標はRigorをインストールし、project-initスキルに引き渡すことです。**Rigorをプロジェクトの`Gemfile`に追加しないでください**——Rigorはライブラリではなく、スタンドアロンツールです。

---

## ステップ1 — 環境の検出

次の4つのチェックを実行し、どのツールが利用可能かを確認してください。

```sh
which mise    # 推奨——ステップ2Aを参照
which asdf    # 代替——ステップ2Bを参照
ruby --version 2>/dev/null | head -1   # Ruby 4.0はすでにPATHにあるか？
which docker  # 最終手段——ステップ2Dを参照
```

その後、**最初に**一致するケースに進んでください。

---

## ステップ2 — Ruby 4.0とRigorのインストール

### ケースA — miseが利用可能（推奨）

**miseとは？**
[mise](https://mise.jdx.dev/)はランタイムとツールのバージョンマネージャーです——`rbenv`と`nvm`を合わせたようなもので、タスクランナーも兼ねています。Rubyランタイム（Ruby、Node、Pythonなど）とツールgem（`rigortype`など）をプロジェクトごとにインストール・管理し、バージョンを`mise.toml`に記録してコードと一緒にコミットできます。他のコントリビューターやCIは`mise install`を実行するだけで、`Gemfile`を変更せずにまったく同じバージョンを再現できます。

プロジェクトルートで実行してください。

```sh
mise use ruby@4.0
mise use gem:rigortype
```

`mise use`はツールをインストールし、一ステップでバージョンを`mise.toml`に書き込みます。バージョンを共有するために`mise.toml`をコミットしてください。

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
gem install rigortype
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
gem install rigortype
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

このアプローチはコンテナファイルシステム境界によるオーバーヘッドがあり、エディターLSPとの統合も良くありません。ホスト側のRuby 4.0が本当に利用できない場合（たとえばWSLのないWindows）にのみ使用してください。他のすべての環境ではケースA〜Dを優先してください。

---

## ステップ3 — インストールの確認

```sh
rigor --version
```

`rigor 0.1.x`のようなバージョン文字列がインストール成功を確認します。コマンドが見つからない場合は、お使いのケースに合わせてステップ2を見直してください。

---

## ステップ4 — このプロジェクトでRigorをセットアップする

`rigor`がPATHにある状態で、project-initスキルを実行してください。

```sh
rigor skill print rigor-project-init
```

このコマンドはSKILL定義を出力します——ファイルパスを含むヘッダーとSKILL本文です。表示された手順を上から順番に従ってください。スキルはプロジェクトのスタックを検出し、プラグインを提案し、`.rigor.dist.yml`を書き込み、必要に応じてベースラインをスナップショットします。

スキルコマンドが認識されない場合は、Rigorのバージョンが0.1.9より古い可能性があります。`rigor --version`を実行し、`mise use gem:rigortype`（またはケースC/Bの場合は`gem update rigortype`）でアップグレードしてください。
