---
title: "Appendix — Running Rigor in CI"
description: "Imported from rigortype/rigor docs/handbook/appendix-ci.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/appendix-ci.md"
sourcePath: "docs/handbook/appendix-ci.md"
sourceSha: "c0ebf1bd6bcd586c5749e89de8975fd7593765fc8d1eeeb55868a25126ca9d21"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "translated"
sidebar:
  order: 1050
---

RigorはRuby 4.0で動作します（[Appendix — Installing Rigor](../appendix-installation/)を参照）。CIでこれが意味することが一つあり、まずそれを明記しておきます。このページの残りはそこから導かれます。

## Rigor専用ジョブで実行する

Rigorはテストスイートとは**別のCIジョブ**で実行してください——できればワークフローファイルも別にするのが理想的です。理由は明確です。`ruby/setup-ruby`はそのジョブのアクティブなRubyを設定します。テストジョブはプロジェクトが実行するRuby（多くは3.x系、あるいは複数バージョンのマトリクス）をプロビジョニングします。RigorはRuby 4.0を必要とします。2つ目の`setup-ruby`呼び出しが1つ目を上書きしてしまうため、同じジョブで両立させることはできません。

別ジョブにすることで、RigorはRuby 4.0のプロビジョニングが他と競合しないクリーンなランナーを得られます。ワークフローファイルを分けることで、さらに独自のトリガー・コンカレンシーグループ・ステータスバッジを持てるようになります——また、解析器をテストワークフローから分離できるため、これはそれ自体として良い実践です。

## GitHub Actionsの最小構成ワークフロー

```yaml
# .github/workflows/rigor.yml
name: rigor
on: [push, pull_request]
jobs:
  rigor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: "4.0"
      - run: gem install rigortype
      - run: rigor check
```

これだけです。プロジェクトをチェックアウトし、Ruby 4.0をプロビジョニングし、Rigorをインストールして実行します。

## Rigorのバージョン固定

上記のワークフローは実行時点で最新の`rigortype`をインストールします。バージョンを固定してCIを再現可能にするには、次のいずれかを選択してください。

### CI専用の`Gemfile`（推奨）

`.github/rigor/Gemfile`を2行で作成してコミットします。

```ruby
source "https://rubygems.org"
gem "rigortype", "~> 0.1"
```

`Gemfile.lock`も合わせてコミットし、`BUNDLE_GEMFILE`を通じてRigorジョブがこのファイルを参照するように設定します。

```yaml
jobs:
  rigor:
    runs-on: ubuntu-latest
    env:
      BUNDLE_GEMFILE: .github/rigor/Gemfile
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: "4.0"
          bundler-cache: true
      - run: bundle exec rigor check
```

この`Gemfile`はRigorジョブのみが読み込みます——アプリケーションの依存関係解決には一切関与せず、コミットされたロックファイルがRigorとその依存関係を固定して再現可能な実行を保証します。通常のBundlerの`Gemfile`なので、Dependabotによる更新管理も可能です。`.github/dependabot.yml`にディレクトリを指定した`bundler`エントリーを追加してください。

```yaml
version: 2
updates:
  - package-ecosystem: bundler
    directory: /.github/rigor
    schedule:
      interval: weekly
```

### 固定バージョンの`gem install`

ワークフロー内で`gem install rigortype -v "0.1.9"`を実行する方法です。追加ファイルが不要でシンプルですが、Dependabotは`run:`ステップ内のバージョン指定を認識しないため、バージョンの更新は手動で行う必要があります。

## コンテナイメージ

Ruby 4.0とRigorを組み込んだスタンドアロンイメージがGHCRに公開されています。Rubyツールチェーンを持たないCIランナーに適しており、プロジェクトを`/src`にマウントして使用します。

```sh
docker run --rm -v "$PWD:/src" ghcr.io/rigortype/rigor check
```

`rigor`はイメージのエントリーポイントであるため、サブコマンドとフラグはイメージ名の後に続けます。バージョンを固定するには明示的なタグを指定してください——`ghcr.io/rigortype/rigor:0.1.9`のようにします。

## Nix

すでにNixを使用しているCIでは、flakeがRuby 4.0をクロージャに含むパッケージとしてRigorを公開しています——ランナー上に他の依存関係を必要としない完全に隔離された実行が可能です。

```sh
nix run github:rigortype/rigor#rigor -- check
```

このページの背景にある配布モデルについては[ADR-27](../../adr/27-tool-distribution-model/)を参照してください。
