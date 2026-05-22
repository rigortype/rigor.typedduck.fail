---
title: "Rigorのインストール"
description: "rigortype/rigor docs/manual/01-installation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/manual/01-installation.md"
sourcePath: "docs/manual/01-installation.md"
sourceSha: "ee9413bb9f332d5447fe4daa36eeb37187a05a25e64acac471a9e906a4567c9c"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
translationStatus: "translated"
sidebar:
  order: 9001
---

Rigorはライブラリではなくツールです——リンターやコンパイラと同様に、プロジェクトを解析しますがランタイムの一部ではありません。**アプリケーションの`Gemfile`に追加しないでください**。`Gemfile`に記述すると、プロジェクト全体がRigorのRubyバージョンに縛られ、Rigorの依存関係がアプリケーションの依存関係解決に混入します。Rigorは独立してインストールし、プロジェクトに向けて使用してください。

RigorはRuby 4.0で動作します。これは自分のコードが対象とするRubyとは独立しています: `target_ruby:`設定キーでRigorに**自分の**プロジェクトが実行するRubyを伝えますが、両者は一致している必要はありません。Rigorはプロジェクト——ソース、`Gemfile.lock`、gemの`.rbs`ファイル——をデータとして読み込み、プロジェクトのgemを自身のプロセスにロードすることはありません。独立してインストールしても何も失われません。

## 推奨 — ランタイムバージョンマネージャ

[`mise`](https://mise.jdx.dev/)はランタイム/ツールバージョンマネージャです（`rbenv` + `nvm`にパッケージランナーを加えたものと考えてください）。Ruby 4.0とRigorをまとめてインストールし、`Gemfile`を使わずにプロジェクト単位でピン留めします。

### miseが初めての場合

[mise自体のインストール](https://mise.jdx.dev/getting-started.html)後、2つのコマンドでRigorをセットアップできます:

```sh
mise use ruby@4.0
mise use gem:rigortype
```

miseを使ったことがない場合に知っておくべきことをいくつか紹介します:

- **`mise use`はプロジェクトレベルで動作します**。選択したバージョンを記録した`mise.toml`を*カレントディレクトリ*に書き込み、同じコマンドでツールもインストールします——別途インストールステップは不要です。（miseはasdf形式の`.tool-versions`も読み込みます。）
- **バージョンを共有するためにconfigをコミットしてください**。生成された`mise.toml`をGitにコミットすれば、すべてのコントリビューターとCIの実行が同じRuby 4.0と同じRigorバージョンを使用します。
- **マシン全体へのインストールには`-g`を追加します**。`mise use -g gem:rigortype`はプロジェクトの`mise.toml`の代わりにmiseのグローバルconfig（`~/.config/mise/config.toml`）に書き込み、すべてのディレクトリで`rigor`が使えるようになります。

gemの名前は`rigortype`で、インストールされる実行ファイル（実際に使うコマンド）は`rigor`です。

### `rigor`を`PATH`に追加する

ツールをインストールするだけでは不十分です——miseが環境に組み込まれて初めて`rigor`が`PATH`に到達します。これはプロジェクトレベルとグローバルインストールの両方に当てはまります。miseの[shimsガイド](https://mise.jdx.dev/dev-tools/shims.html)では2つのメカニズムを説明しています:

- **`mise activate`** — `eval "$(mise activate zsh)"`をシェルrc（`~/.zshrc`; bashとfishの同等物は[miseのドキュメント](https://mise.jdx.dev/getting-started.html)に記載）に追加します。プロジェクトに`cd`すると`rigor`が`PATH`に追加されます。インタラクティブシェルに最適です。
- **shims** — `~/.local/share/mise/shims`配下の固定実行ファイルです。そのディレクトリを`PATH`に追加します:

  ```sh
  export PATH="$HOME/.local/share/mise/shims:$PATH"
  ```

  または`mise activate <shell> --shims`を実行します。Shimsは`cd`フックが発火しない場所——`rigor lsp`を起動するエディタ、スクリプト、一部のCI——でも機能します。miseはインストール時に`rigor` shimを自動的に作成します。

どちらの方法でもmiseが組み込まれていない場合でも、`mise exec gem:rigortype -- rigor`で明示的にRigorを実行できます。エディタ側については[エディタ統合](../09-editor-integration/)を参照してください。

## asdf

`asdf`も同じモデルに従います。[`asdf-ruby`](https://github.com/asdf-vm/asdf-ruby)プラグインでRuby 4.0.xをインストールし、プロジェクトに設定してから、そのRubyにgemをインストールします:

```sh
asdf install ruby latest:4.0
asdf local ruby latest:4.0
gem install rigortype
```

`asdf`には汎用的なgemバックエンドがないため、gemは`asdf`コマンドではなく`gem install`でインストールします。上述の`mise`はその`gem:`バックエンドがgemをRubyと同じようにピン留めするため、より統合されたオプションです。

## シンプルな代替手段 — gem install

すでにRuby 4.0が`PATH`にある場合:

```sh
gem install rigortype
```

gemの名前は`rigortype`です——`rigor`はすでにRubyGemsで取得済みです——インストールされる実行ファイルは`rigor`です。これは最も手軽な方法ですが、プロジェクト単位では何も記録しません: バージョンマネージャを使えばプロジェクトの横にRigorバージョンをピン留めできるため、ローカルの実行とCIがずれることがありません。

## Nix

Nixを使用している場合、RigorのflakeはRuby 4.0をクロージャに含むパッケージとして実行ファイルを公開しています——ホストに他のものをインストールする必要はありません:

```sh
# インストールせずに実行:
nix run github:rigortype/rigor#rigor -- check

# またはプロファイルにインストール:
nix profile install github:rigortype/rigor
```

## コンテナ内での開発

devコンテナ内で開発している場合、コンテナ内ではなく**ホストOS**にRigorをインストールしてください——コンテナのファイルシステムとプロセス境界をまたいで解析するとオーバーヘッドが生じます。ホスト側のRuby 4.0の提供が難しいWindowsでは、コンテナ内にRigorをインストールする方が良い選択です。

## 継続的インテグレーション

RigorをCIに組み込む方法は専用の章で説明しています——[CIでのRigor実行](../10-ci/)を参照してください。
