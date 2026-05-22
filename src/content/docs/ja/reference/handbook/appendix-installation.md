---
title: "Appendix — Installing Rigor"
description: "Imported from rigortype/rigor docs/handbook/appendix-installation.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/appendix-installation.md"
sourcePath: "docs/handbook/appendix-installation.md"
sourceSha: "9e1934581008b993ffebe3f7080bc52ec5b5ed15a6cda6cf4450b9881c9c6594"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "translated"
sidebar:
  order: 1050
---

Rigorはライブラリではなくツールです。リンターやコンパイラと同様に、プロジェクトを解析しますが、そのランタイムの一部ではありません。**アプリケーションの`Gemfile`には追加しないでください**。`Gemfile`エントリを追加すると、プロジェクト全体がRigorのRubyバージョンに縛られ、Rigorの依存関係がアプリケーションの依存関係の解決に引き込まれてしまいます。Rigorは単独でインストールし、プロジェクトに向けて使用してください。

RigorはRuby 4.0上で動作します。これは自分のコードが対象とするRubyとは独立しています。`target_ruby:`設定キーは、*あなたの*プロジェクトが実行するRubyをRigorに伝えるものであり、両者が一致している必要はありません。Rigorはプロジェクト（ソースコード、`Gemfile.lock`、各gemの`.rbs`ファイル）をデータとして読み取るだけで、プロジェクトのgemを自身のプロセスに読み込むことは決してありません。そのため、個別にインストールしても何も失われません。

## 推奨 — ランタイムバージョンマネージャ

[`mise`](https://mise.jdx.dev/)はRuby 4.0とRigorの両方をインストールし、`Gemfile`を関与させることなく、プロジェクトごとにバージョンを固定します。

```sh
mise use ruby@4.0
mise use gem:rigortype
```

これで`rigor`が`PATH`上に置かれます。生成された`mise.toml`をコミットしておくことで、すべてのコントリビューターとCIの実行で同じバージョンが使用されます。

`PATH`上の`rigor`はエディタ統合が期待する形式でもあります。エディタ統合は`rigor lsp`を直接起動します（[`docs/lsp-integration.md`](../../lsp-integration/)を参照）。エディタごとに`bundle exec`プレフィックスを設定する必要はありません。

## asdf

`asdf`も同じモデルに従います。[`asdf-ruby`](https://github.com/asdf-vm/asdf-ruby)プラグインでRuby 4.0.xをインストールし、プロジェクト用に選択してから、そのRubyにgemをインストールします。

```sh
asdf install ruby latest:4.0
asdf local ruby latest:4.0
gem install rigortype
```

`asdf`には汎用のgemバックエンドがないため、gemは`asdf`コマンドではなく`gem install`でインストールします。上で紹介した`mise`は、`gem:`バックエンドがgemをRubyと同じ方法でピン留めするため、より統合された選択肢です。

## シンプルな代替手段 — gem install

すでに`PATH`上にRuby 4.0がある場合は次のようにします。

```sh
gem install rigortype
```

gemの名前は`rigortype`です。RubyGemsでは`rigor`がすでに使用されていたためです。インストールされる実行ファイルは`rigor`です。これが最速の方法ですが、プロジェクトごとに何も記録されません。バージョンマネージャを使えばRigorのバージョンをプロジェクトの隣に固定できるため、ローカルの実行とCIでバージョンが乖離することを防げます。

## Nix

Nixを使用している場合、RigorのflakeはRuby 4.0をクロージャに含むパッケージとして実行ファイルを公開しています。ホスト側に他のものをインストールする必要はありません。

```sh
# インストールせずに実行する場合:
nix run github:rigortype/rigor#rigor -- check

# プロファイルにインストールする場合:
nix profile install github:rigortype/rigor
```

## 開発コンテナ内での開発

開発コンテナ内で開発している場合は、コンテナ内ではなく**ホストOS**にRigorをインストールしてください。コンテナのファイルシステムやプロセス境界をまたいで解析器を実行するとオーバーヘッドが生じます。ホスト側でRuby 4.0を用意しにくいWindowsでは、コンテナ内にRigorをインストールするほうが適切です。

## 継続的インテグレーション

RigorをCIに組み込む方法については、[付録 — CIでのRigor実行](../appendix-ci/)を参照してください。
