---
title: "Appendix — Installing Rigor"
description: "Imported from rigortype/rigor docs/handbook/appendix-installation.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/appendix-installation.md"
sourcePath: "docs/handbook/appendix-installation.md"
sourceSha: "ee1a8ea37b227b6551ceb0644e943658bec2f3f8d7173bd7a4e908d9caeaf2f4"
sourceCommit: "5b252bbd814960f6b442a4df7dd41a0d0a79c995"
translationStatus: "translated"
sidebar:
  order: 1050
---

Rigorはライブラリではなくツールです。リンターやコンパイラと同様に、プロジェクトを解析しますが、そのランタイムの一部ではありません。**アプリケーションの`Gemfile`には追加しないでください**。`Gemfile`エントリを追加すると、プロジェクト全体がRigorのRubyバージョンに縛られ、Rigorの依存関係がアプリケーションの依存関係の解決に引き込まれてしまいます。Rigorは単独でインストールし、プロジェクトに向けて使用してください。

RigorはRuby 4.0上で動作します。これは自分のコードが対象とするRubyとは独立しています。`target_ruby:`設定キーは、*あなたの*プロジェクトが実行するRubyをRigorに伝えるものであり、両者が一致している必要はありません。Rigorはプロジェクト（ソースコード、`Gemfile.lock`、各gemの`.rbs`ファイル）をデータとして読み取るだけで、プロジェクトのgemを自身のプロセスに読み込むことは決してありません。そのため、個別にインストールしても何も失われません。

## 推奨 — ランタイムバージョンマネージャ

[`mise`](https://mise.jdx.dev/)はランタイム / ツールバージョンマネージャです（`rbenv` + `nvm`とパッケージランナーを一つにしたもの、といえば伝わるでしょう）。Ruby 4.0とRigorをまとめてインストールし、`Gemfile`を関与させることなく、プロジェクトごとにバージョンを固定します。

### miseを初めて使う場合

[mise本体をインストール](https://mise.jdx.dev/getting-started.html)したら、2つのコマンドでRigorをセットアップできます。

```sh
mise use ruby@4.0
mise use gem:rigortype
```

miseに慣れていない方へのポイントをいくつか:

- **`mise use`はプロジェクトレベルです**。選択したバージョンを記録した`mise.toml`を*カレントディレクトリ*に書き込み、同じコマンドでツールをインストールします — インストールステップは別途ありません（miseはasdf形式の`.tool-versions`も読みます）。
- **設定をコミットしてバージョンを共有しましょう**。生成された`mise.toml`をGitにコミットしておくことで、すべてのコントリビューターとCIの実行で同じRuby 4.0・同じRigorバージョンが使用されます。
- **マシン全体へのインストールは`-g`を追加**。 `mise use -g gem:rigortype`はmiseのグローバル設定（`~/.config/mise/config.toml`）に書き込み、あらゆるディレクトリで`rigor`が使えるようになります。

gemの名前は`rigortype`、インストールされる実行ファイル（そして唯一使うコマンド）は`rigor`です。

### `rigor`をPATHに通す

ツールをインストールするだけでは不十分です — miseが環境に組み込まれてはじめて`rigor`が`PATH`上に置かれます。これはプロジェクトレベルのインストールでもグローバルインストールでも同様です。miseの[shimsガイド](https://mise.jdx.dev/dev-tools/shims.html)では2つの仕組みが説明されています。

- **`mise activate`** — シェルの設定ファイル（`~/.zshrc`など;bashやfishについては[miseのドキュメント](https://mise.jdx.dev/getting-started.html)を参照）に`eval "$(mise activate zsh)"`を追加します。プロジェクトに`cd`するとその時点で`rigor`が`PATH`に入ります。インタラクティブシェルに最適。
- **shims** — `~/.local/share/mise/shims`以下に置かれる固定の実行ファイル群。そのディレクトリを`PATH`に追加します。

  ```sh
  export PATH="$HOME/.local/share/mise/shims:$PATH"
  ```

  または`mise activate <shell> --shims`を実行します。Shimsは`cd`フックが発火しない場面でも機能します — エディタが`rigor lsp`を起動する場合、スクリプト、一部のCIなど。miseはインストール時に`rigor` shimを自動的に作成します。

どちらの方法も未設定の場合、`mise exec gem:rigortype -- rigor`で明示的にRigorを実行できます。エディタ側については[`docs/lsp-integration.md`](../../lsp-integration/)を参照してください。

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
