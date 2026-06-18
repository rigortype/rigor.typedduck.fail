---
title: "Rigorのインストール"
description: "rigortype/rigor docs/manual/01-installation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/01-installation.md"
sourcePath: "docs/manual/01-installation.md"
sourceSha: "6ccda4cb985703adea6752bdd14da324d20cd95370e61c88d97a86018152cf30"
sourceCommit: "7ba81e144fcabd69b653017dcf248004e9635a5e"
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

上のプロンプトはただの自然言語です — どの言語で頼んでも、エージェントは同じリンク先の手順に従います。つまりセットアップの対話全体を母語で進められます。下のすぐ使えるプロンプトはそれぞれ、エージェントにその言語で対話しながらセットアップを一緒に進めるよう明示的に依頼します:

<details data-lang-details>
<summary>お使いの言語でセットアップ</summary>

<details lang="ja"><summary>[ja] 日本語</summary>

```
日本語で対話しながら、このプロジェクトに Rigor をインストールする作業を一緒に進めてください。次の手順に従ってください:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="zh-Hans"><summary>[zh-Hans] 简体中文</summary>

```
请用简体中文与我互动，在此项目中安装 Rigor。请按照以下地址的说明操作:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="zh-Hant"><summary>[zh-Hant] 繁體中文</summary>

```
請用繁體中文與我互動，在此專案中安裝 Rigor。請依照以下網址的說明操作:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="ko"><summary>[ko] 한국어</summary>

```
한국어로 대화하면서 이 프로젝트에 Rigor를 설치하는 작업을 함께 진행해 주세요. 다음 주소의 안내를 따라 주세요:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="pt-BR"><summary>[pt-BR] Português (Brasil)</summary>

```
Vamos trabalhar juntos de forma interativa, em português brasileiro, para instalar o Rigor neste projeto. Siga as instruções em:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="pt"><summary>[pt] Português</summary>

```
Vamos trabalhar juntos de forma interativa, em português de Portugal, para instalar o Rigor neste projeto. Segue as instruções em:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="es"><summary>[es] Español</summary>

```
Trabajemos juntos de forma interactiva, en español, para instalar Rigor en este proyecto. Sigue las instrucciones en:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="vi"><summary>[vi] Tiếng Việt</summary>

```
Hãy trao đổi với tôi bằng tiếng Việt và cùng nhau cài đặt Rigor vào dự án này. Làm theo hướng dẫn tại:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="fr"><summary>[fr] Français</summary>

```
Travaillons ensemble de manière interactive, en français, pour installer Rigor dans ce projet. Suivez les instructions à l'adresse :
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="de"><summary>[de] Deutsch</summary>

```
Lassen Sie uns interaktiv auf Deutsch zusammenarbeiten, um Rigor in diesem Projekt zu installieren. Folgen Sie den Anweisungen unter diesem Link:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="it"><summary>[it] Italiano</summary>

```
Lavoriamo insieme in modo interattivo, in italiano, per installare Rigor in questo progetto. Segui le istruzioni a questo link:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="th"><summary>[th] ภาษาไทย</summary>

```
มาทำงานร่วมกันแบบโต้ตอบเป็นภาษาไทย เพื่อติดตั้ง Rigor ในโปรเจกต์นี้ โปรดทำตามคำแนะนำที่ลิงก์ต่อไปนี้:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="id"><summary>[id] Bahasa Indonesia</summary>

```
Mari bekerja sama secara interaktif dalam bahasa Indonesia untuk memasang Rigor pada proyek ini. Ikuti instruksi pada tautan berikut:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="pl"><summary>[pl] Polski</summary>

```
Pracujmy razem po polsku, w trybie interaktywnym, aby zainstalować Rigor w tym projekcie. Postępuj zgodnie z instrukcjami pod adresem:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="uk"><summary>[uk] Українська</summary>

```
Працюймо разом українською мовою в інтерактивному режимі, щоб встановити Rigor у цьому проєкті. Дотримуйтеся інструкцій за посиланням:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="ru"><summary>[ru] Русский</summary>

```
Давайте работать вместе в интерактивном режиме на русском языке, чтобы установить Rigor в этом проекте. Следуйте инструкциям по ссылке:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="ro"><summary>[ro] Română</summary>

```
Haideți să lucrăm împreună în mod interactiv, în limba română, pentru a instala Rigor în acest proiect. Urmați instrucțiunile de la adresa:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="tr"><summary>[tr] Türkçe</summary>

```
Türkçe iletişim kurarak bu projeye Rigor'u birlikte kuralım. Şu adresteki talimatları izleyin:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="ar" dir="rtl"><summary>[ar] العربية</summary>

```
لنعمل معًا بشكل تفاعلي وباللغة العربية لتثبيت Rigor في هذا المشروع. اتبع التعليمات الموجودة في:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

<details lang="fa" dir="rtl"><summary>[fa] فارسی</summary>

```
بیایید به‌صورت تعاملی و به زبان فارسی با هم کار کنیم تا Rigor را در این پروژه نصب کنیم. دستورالعمل‌های موجود در این آدرس را دنبال کنید:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

</details>

</details>

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
