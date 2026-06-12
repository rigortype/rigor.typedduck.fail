---
title: "Rigorのインストール"
description: "rigortype/rigor docs/manual/01-installation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/01-installation.md"
sourcePath: "docs/manual/01-installation.md"
sourceSha: "559eb5670ce3d6f0bd3c00fad85adfe2cbc7c58a02a0598a5c2535273a61e52b"
sourceCommit: "636f8725dd79aab2f711249ace6357a98b7e73a4"
translationStatus: "translated"
sidebar:
  order: 9001
---

Rigorはライブラリではなくツールです——リンターやコンパイラと同様に、プロジェクトを解析しますがランタイムの一部ではありません。**アプリケーションの`Gemfile`に追加しないでください**。`Gemfile`に記述すると、プロジェクト全体がRigorのRubyバージョンに縛られ、Rigorの依存関係がアプリケーションの依存関係解決に混入します。Rigorは独立してインストールし、プロジェクトに向けて使用してください。

RigorはRuby 4.0で動作します。これは自分のコードが対象とするRubyとは独立しています: `target_ruby:`設定キーでRigorに**自分の**プロジェクトが実行するRubyを伝えますが、両者は一致している必要はありません。Rigorはプロジェクト——ソース、`Gemfile.lock`、gemの`.rbs`ファイル——をデータとして読み込み、プロジェクトのgemを自身のプロセスにロードすることはありません。独立してインストールしても何も失われません。

> **AIコーディングエージェントを使っていますか？** Rigorのインストールとプロジェクトの設定を代わりにやってくれます — 次のプロンプトを渡してください:
>
> ```
> Install Rigor in this project by following the instructions at
> https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
> ```
>
> エージェントが環境（mise / asdf / 素のRuby）を検出し、適切なツールをインストールして、`rigor-project-init`スキルに引き渡します（[Railsクイックスタート](../14-rails-quickstart/)のPath Aを参照）。下記のチャンネルは手動のルートです。

### お使いの言語でセットアップ

上のプロンプトはただの自然言語です — どの言語で頼んでも、エージェントは同じリンク先の手順に従います。つまりセットアップの対話全体を母語で進められます。すぐ使えるプロンプト:

<details data-lang-details>
<summary>お使いの言語でセットアップ</summary>

<details lang="ja"><summary>[ja] 日本語</summary>

```
次の手順に従って、このプロジェクトに Rigor をインストールしてください:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="zh-Hans"><summary>[zh-Hans] 简体中文</summary>

```
请按照以下地址的说明在此项目中安装 Rigor:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="zh-Hant"><summary>[zh-Hant] 繁體中文</summary>

```
請依照以下網址的說明在此專案中安裝 Rigor:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="ko"><summary>[ko] 한국어</summary>

```
다음 주소의 안내에 따라 이 프로젝트에 Rigor를 설치해 주세요:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="pt-BR"><summary>[pt-BR] Português (Brasil)</summary>

```
Instale o Rigor neste projeto seguindo as instruções em:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="pt"><summary>[pt] Português</summary>

```
Utilizando o português de Portugal, instala o Rigor neste projeto seguindo as instruções em:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="es"><summary>[es] Español</summary>

```
Instala Rigor en este proyecto siguiendo las instrucciones en:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="vi"><summary>[vi] Tiếng Việt</summary>

```
Hãy cài đặt Rigor vào dự án này theo hướng dẫn tại:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="fr"><summary>[fr] Français</summary>

```
Installez Rigor dans ce projet en suivant les instructions à l'adresse :
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="de"><summary>[de] Deutsch</summary>

```
Installieren Sie Rigor in diesem Projekt, indem Sie den Anweisungen unter diesem Link folgen:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="it"><summary>[it] Italiano</summary>

```
Installa Rigor in questo progetto seguendo le istruzioni a questo link:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="th"><summary>[th] ภาษาไทย</summary>

```
ติดตั้ง Rigor ในโปรเจกต์นี้โดยทำตามคำแนะนำที่:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="id"><summary>[id] Bahasa Indonesia</summary>

```
Instal Rigor di proyek ini dengan mengikuti instruksi di:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="pl"><summary>[pl] Polski</summary>

```
Zainstaluj Rigor w tym projekcie, postępując zgodnie z instrukcjami pod adresem:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="uk"><summary>[uk] Українська</summary>

```
Встановіть Rigor у цей проєкт, дотримуючись інструкцій за посиланням:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="ru"><summary>[ru] Русский</summary>

```
Установите Rigor в этот проект, следуя инструкциям по ссылке:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="ro"><summary>[ro] Română</summary>

```
Instalați Rigor în acest proiect urmând instrucțiunile de la adresa:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="tr"><summary>[tr] Türkçe</summary>

```
Bu projeye Rigor'u şu adresteki talimatları izleyerek kurun:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

</details>

> **インストールチャンネル** —
> [mise（推奨）](#推奨--ランタイムバージョンマネージャー) ·
> [asdf](#asdf) ·
> [gem install](#シンプルな代替手段--gem-install) ·
> [Nix](#nix) ·
> [devコンテナ](#コンテナ内での開発) ·
> [CI](#継続的インテグレーション)

## 推奨 — ランタイムバージョンマネージャー

[`mise`](https://mise.jdx.dev/)はランタイム/ツールバージョンマネージャーです（`rbenv` + `nvm`にパッケージランナーを加えたものと考えてください）。Ruby 4.0とRigorをまとめてインストールし、`Gemfile`を使わずにプロジェクト単位でピン留めします。

### miseが初めての場合

[mise自体のインストール](https://mise.jdx.dev/getting-started.html)後、2つのコマンドでRigorをセットアップできます:

```sh
mise use ruby@4.0
mise use gem:rigortype
```

miseを使ったことがない場合に知っておくべきことをいくつか紹介します:

- **`mise use`はプロジェクトレベルで動作します**。選択したバージョンを記録した`mise.toml`を*カレントディレクトリ*に書き込み、同じコマンドでツールもインストールします——別途インストールステップは不要です。（miseはasdf形式の`.tool-versions`も読み込みます。）
- **バージョンを共有するためにconfigをコミットしてください**。生成された`mise.toml`をGitにコミットすれば、すべての貢献者とCIの実行が同じRuby 4.0と同じRigorバージョンを使用します。
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

gemの名前は`rigortype`です——`rigor`はすでにRubyGemsで取得済みです——インストールされる実行ファイルは`rigor`です。これは最も手軽な方法ですが、プロジェクト単位では何も記録しません: バージョンマネージャーを使えばプロジェクトの横にRigorバージョンをピン留めできるため、ローカルの実行とCIがずれることがありません。

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

RigorをCIに組み込む方法は専用の章で説明しています——[CIでのRigor実行](../11-ci/)を参照してください。
