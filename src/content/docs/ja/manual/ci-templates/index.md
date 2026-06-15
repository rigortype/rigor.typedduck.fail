---
title: "CIセットアップテンプレート"
description: "Imported from rigortype/rigor docs/manual/ci-templates/README.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/ci-templates/README.md"
sourcePath: "docs/manual/ci-templates/README.md"
sourceSha: "5e55dea76441c46a024c83ccdb9da1d650d612a1543d8210bea8b13b60394108"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 9000
  label: "CIセットアップテンプレート"
---

プロジェクトのパイプラインでRigorを実行するためのコピー＆ペースト用CI設定。それぞれがRuby 4.0上の**独立した専用ジョブ**でRigorを実行し（なぜ分離が必要かは[第11章「CIでのRigor実行」](../11-ci/)を参照）、CIネイティブな出力フォーマットを介してプル／マージリクエスト上で診断をインラインに表示する（[ADR-51](../../adr/51-ci-diagnostic-output-formats/)）。

`ruby/setup-ruby`は`ubuntu-latest`向けに**事前ビルド済み**のRuby 4.0.xバイナリを提供する — セットアップは高速（約0.3秒）で、ソースからのコンパイル待ちにはならない。2026-06-13に検証: `setup-ruby`は`ruby-version: "4.0"`をランナーのツールキャッシュからRuby 4.0.5へ解決する。

| ファイル | コピー先 | 役割 |
| --- | --- | --- |
| [`github-actions-annotations.yml`](github-actions-annotations.yml) | `.github/workflows/rigor.yml` | **デフォルト**。ワークフローコマンド → インラインのPRアノテーション。アップロード手順も権限も不要で、あらゆるリポジトリで動く。 |
| [`github-actions-sarif.yml`](github-actions-sarif.yml) | `.github/workflows/rigor.yml` | SARIF 2.1.0 → GitHub code scanning（セキュリティタブ + PRアラート）。code scanningが必要 — 公開リポジトリ、またはGitHub Advanced Securityを備えた非公開リポジトリ。 |
| [`github-actions-reviewdog.yml`](github-actions-reviewdog.yml) | `.github/workflows/rigor.yml` | reviewdog → インラインのPR**レビューコメント**。`pull-requests: write`が必要。 |
| [`gitlab-ci.yml`](gitlab-ci.yml) | `.gitlab-ci.yml`（または`include:`する） | GitLab Code Qualityレポート → マージリクエストウィジェット。 |

GitHubテンプレートは**1つ**だけ選ぶ。**デフォルトはアノテーション** — セットアップ不要であらゆるリポジトリで動く唯一の選択肢だ。code scanningが利用でき（公開リポジトリ、またはGitHub Advanced Securityを備えた非公開リポジトリ）セキュリティタブが欲しい場合はSARIFを、スレッド化されたレビューコメントが欲しい場合はreviewdogを使う（reviewdogはGitLab、Gerrit、Bitbucket、Giteaに対しても同じように動く — [`rigor-ci-setup`](https://github.com/rigortype/rigor/blob/master/skills/rigor-ci-setup/SKILL.md)スキルを参照）。いずれもRigorの実行方法は同じで、出力フォーマットと公開手順だけが異なる。

## ほかのランナー（汎用レシピ）

どのCIシステムでも、4つの手順は次のとおり: Ruby 4.0をプロビジョニングし、`rigortype`をインストールし、`rigor check`を実行し、（任意で）レポートを公開する。

```sh
# 1. Ruby 4.0 must be the active Ruby (rbenv/asdf/mise/container image).
# 2. Install Rigor — kept out of your project's Gemfile (see ADR-27).
gem install rigortype
# 3. Run it. Pick the format your platform renders, or plain text for logs.
rigor check                           # human-readable, exit 1 on errors
rigor check --format sarif      > rigor.sarif      # SARIF 2.1.0
rigor check --format gitlab     > codequality.json # GitLab Code Quality
rigor check --format checkstyle > checkstyle.xml   # reviewdog / Jenkins
rigor check --format junit      > junit.xml        # test-report CIs
rigor check --format json       > rigor.json       # generic machine stream
```

終了コードはエラーがなければ`0`、それ以外は`1`なので、この手順はフォーマットによらずパイプラインをゲートする。レポートは`>`でファイルにリダイレクトする;公開手順が走る前に非ゼロ終了でジョブが失敗してしまうプラットフォームでは、checkの手順を「エラーでも続行」とマークし、無条件に公開する（GitHubのSARIFテンプレートがそのパターンを示している）。

## Rigorのバージョンをピン留めする

これらのテンプレートは実行時に最新の`rigortype`をインストールする。それをピン留めして — CIを再現可能に保つには — [第11章 §「Rigorのバージョンをピン留めする」](../11-ci/#pinning-rigors-version)を参照（DependabotがアップデートできるCI専用の`.github/rigor/Gemfile`、またはピン留めした`gem install rigortype -v "X.Y.Z"`）。
