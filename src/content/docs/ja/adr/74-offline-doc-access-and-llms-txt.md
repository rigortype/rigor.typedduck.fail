---
title: "ADR-74 — オフラインドキュメントアクセス（`rigor docs`）と`llms.txt`連携"
description: "rigortype/rigor docs/adr/74-offline-doc-access-and-llms-txt.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/74-offline-doc-access-and-llms-txt.md"
sourcePath: "docs/adr/74-offline-doc-access-and-llms-txt.md"
sourceSha: "5622cf807d23624902d1aa9bda8680ac29476d8e408d26915fa62dcaa29932fe"
sourceCommit: "212f2c491920cc5c39a12d75aee385cb6c51fa0c"
translationStatus: "translated"
sidebar:
  order: 4074
---

ステータス: **Accepted — WD1〜WD4を2026-06-20に実装**。[ADR-73](../73-skill-driven-user-experience/)のSKILL駆動UXを*ドキュメント*の軸で完成させます。インストール済みのRigorは、エージェントが必要とするドキュメントを**オフラインで**提供し（gemにバンドルされた`docs/manual`を対象とする`rigor docs`コマンド）、プロジェクトのエージェント向けドキュメント発見インデックス——`llms.txt`——は新しいスキルサーフェスを反映すると同時に、ネットワークなしでローカルにそれらのドキュメントを読めることをエージェントへ伝えます。WD1＋WD2（gemが`docs/install.md`＋`docs/llms.txt`＋`docs/manual/**`を出荷する。`rigor docs`コマンド）とWD3（スキルが`rigor docs <chapter>`を優先する）はrigor側に着地し、WD4（サイトの`llms.md` / `llms-ja.md`を`rigor-next-steps`＋オフライン注記＋第17章で更新し、ビルドのデッドリンクガードがグリーン）はサイトリポジトリに着地しました。

**改訂（2026-06-21）—— フラグ文法＋ハンドブックのバンドル**。WD2の発見系の動詞（`rigor docs list` / `path <name>`）はフラグ（`--list [category]` / `--path <name>`）へ移動しました。これにより位置スロットが曖昧さなくドキュメントの*名前*になります（`list` / `path`という名前のページがあった場合、動詞にシャドウされかねないため）。引数なしの`rigor docs <name>`出力形は変わりません。レガシーの動詞綴りは引き続き動作しますが、1行のstderr非推奨通知を出力し、**v0.3.0で削除されます**（[ROADMAP](../../roadmap/) §「Scheduled CLI deprecations」を参照）。WD1のバンドルはマニュアルのみから**マニュアル＋ハンドブック**へ広がります（`docs/handbook/**/*.md`をgemspecに追加）——ハンドブックはユーザー向けのRigor運用の概念資料なので、上記のオフラインドキュメント基準を満たします。貢献者向けのADR / 仕様 / 開発レポートのコーパスは引き続きWeb限定のままです。2つのカテゴリーがあるため、`<name>`はカテゴリー修飾されたパス（`handbook/03-narrowing`）、プレフィックス付きのベース名（`03-narrowing`）、または一意なときは短い名前を解決し（`plugins`のようなカテゴリー横断の衝突は修飾された候補とともにエラーになります）、`--list`はオプションのカテゴリーフィルタを取ります。[ADR-73](../73-skill-driven-user-experience/)も同じ`rigor skill`の文法変更を受けます。凍結される公開語彙（ADR-50 WD1）は改訂後のフラグサーフェスです。

根拠: [ADR-73](../73-skill-driven-user-experience/)（このADRが拡張するSKILL駆動UX）、デプロイ済みの`https://rigor.typedduck.fail/llms.txt`（ソースは`site/.../src/llms/llms.md`）、そして2026-06-20のオンボーディングフィールドトライアル（[`docs/notes/20260620-skill-driven-onboarding-dogfood.md`](../../notes/20260620-skill-driven-onboarding-dogfood/)）。

## コンテキスト

ADR-73は*スキル*をローカルファーストなエージェントサーフェスにしました。スキルは`rigortype` gemに同梱され、`rigor skill print <name>`がネットワークなしでそれらを提供します。しかし、それらのスキルがルーティングする先の**ドキュメント**はローカルにありません。`rigor-editor-setup`、`rigor-mcp-setup`、`rigor-next-steps`は**GitHub raw URL**（`docs/install.md`、`docs/manual/09-editor-integration.md`、…）を指し示します。gemspecが`README` / `lib` / `sig` / `data` / `skills`を出荷する一方で、**`docs/`は出荷しない**からです。そのため、Rigorをすでにインストール済みのエージェントでも、エディタ／MCP／インストールのガイダンスを読むにはネットワークを必要とします——SKILL駆動の設計が本来は避ける、まさにその種の陳腐化しうるネットワーク結合した依存です。

これとは別に、サイトはすでに[`llms.txt`](https://llmstxt.org/)——エージェントのドキュメント発見インデックス——を公開しています。これは強くAIエージェント志向（「合致するスキルを実行することを優先せよ」）ですが、**Web専用**であり、**新しいスキルサーフェスに対して陳腐化**しています。v0.1.x系のスキル（`rigor-project-init` / `rigor-baseline-reduce` / `rigor-plugin-author` / `rigor-ci-setup`）を列挙する一方で、`rigor-next-steps`、`rigor skill describe`、13スキルのカタログ、あるいはインストール済みのRigorがこれらのドキュメントをオフラインで提供できることについては何も知りません。

## 決定

> **オフラインドキュメントの基準**。エージェントが*Rigorを駆動する*ために参照するドキュメントはgemに属し、`rigor docs`によって提供されます——スキルにおける`rigor skill print`を写し取った形です。そのため、いったんRigorがインストールされれば、SKILL駆動UXは、gemがすでに携えているガイダンスのためにネットワークを必要とすることが決してありません。公開Webの`llms.txt`＋GitHub raw URLは**インストール前**のフォールバックとして残ります（唯一のケース——Rigor自体のインストール——であり、これは必然的にローカルの`rigor`に先行します）。

`rigor docs`はローカルファーストなエージェントサーフェス（`rigor skill`＋`rigor docs`）を完成させ、`llms.txt`——その両方にわたるインデックス——は、それらを指し示しオフラインの経路を記録するよう更新されます。

### WD1 — gemに`docs/manual`をバンドルする

`docs/manual/**/*.md`＋`docs/install.md`をgemspecの`files`グロブに加えます（スキルとオンボーディングエージェントが実際に参照する章です）。コストはわずか（markdown）で、これにより`rigor docs`が完全なオフラインマニュアルになります。完全なADR／spec／notesのコーパスはWeb専用のままです（これは貢献者向けであって、Rigorを駆動するためのガイダンスではありません）。

### WD2 — `rigor docs`コマンド＋gem側の`llms.txt`

`rigor skill`の形を写し取った新しいサブコマンドです（`lib/rigor/cli/docs_command.rb`、`CLI::HANDLERS`に配線）:

- `rigor docs` — バンドルされた`llms.txt`インデックスを出力します（サイト版のオフラインの片割れ。WD4を参照）。
- `rigor docs <name>` — バンドルされたドキュメントを標準出力に出力します（`rigor docs install`、`rigor docs editor-integration`、`rigor docs 17-driving-improvement`）。章のスラグは数字接頭辞の有無どちらでも受け付けます。
- `rigor docs list` / `rigor docs path <name>` — `rigor skill`と同様の発見用です。

gemルート配下のバンドルされた`docs/`から読み取ります（`SKILLS_ROOT`スタイルの`File.expand_path`アンカー）。**ネットワークなし**、読み取り専用です。

### WD3 — スキルは`rigor docs`を優先する（GitHub URLはインストール前のフォールバック）

`rigor-editor-setup` / `rigor-mcp-setup` / `rigor-next-steps`は、そのドキュメントポインタを*「`rigor docs <chapter>`を実行する（ローカル、ネットワークなし——このステップの時点でRigorはインストール済み）。Rigorがまだインストールされていなければ、GitHub raw URLを取得する」*へと変更します。還元できない唯一のネットワークケースは`rigor-next-steps`の**インストール**ステップ（`docs/install.md`は`rigor`が存在する*前*に参照される）であり、再読のために`rigor docs install`の注記を添えてraw URLを保持します。

### WD4 — `llms.txt`がスキルサーフェス＋オフラインの経路を反映する（サイト＋gem）

サイトの`llms.md` / `llms-ja.md`は更新されます。「1つのプロンプト」での起点は**`rigor-next-steps`**を経由してルーティングされ、スキルリストはカタログ＋`rigor skill describe`になり、第17章（[改善の駆動](../../manual/17-driving-improvement/)）がインデックスされ、そして**Rigorがインストールされていればドキュメント／スキルはオフラインで利用可能**であること（`rigor docs <chapter>` / `rigor skill print <name>`）を注記が記録します。gemはそのコピーを`rigor docs`インデックスとして出荷します——サイトの`llms.txt`が正典のWebコピーであり、gemのコピーは同じマニュアルソースから同期されたオフラインミラーです（2つ目の著作上の真実はありません——マニュアルがソースであり、両方の`llms.txt`コピーがそれをインデックスします）。

## 却下／先送りした代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| ドキュメントをWeb専用のままにする（現状維持） | 却下 | フィールドトライアルが指摘したネットワーク依存: *インストール済み*のRigorでも、自身のエディタ／MCP／インストールのガイダンスをオフラインで提供できず、ADR-73のローカルファースト設計に反する。 |
| 別個の`rigortype-docs` gemを設ける | 却下 | 単一gem配布（ADR-31）を重複させる。マニュアルは、すでに`skills/`がそうしているように`rigortype`に同梱できる程度に十分小さい。 |
| `rigor docs`を構築するためにランタイムでサイトの`llms.txt`を取得する | 却下 | このADRが取り除くネットワーク結合を再導入し、CLIを稼働中のサイトへ結合してしまう。 |
| `docs/`全体（ADR、spec、notes）をバンドルする | 却下 | そのコーパスは貢献者向けであって、Rigorを駆動するためのガイダンスではない。エージェントのオンボーディング上の利得なくgemを肥大化させる。Web版の`llms.txt`がすでにそれをリンクしている。 |

## 帰結

ポジティブ:
- インストール済みのRigorは**自己完結したエージェントサーフェス**になります——スキル（`rigor skill`）＋ドキュメント（`rigor docs`）、どちらもオフライン。SKILL駆動UXは、すでに出荷しているガイダンスのためにネットワークへ依存することをやめます。
- `llms.txt`は陳腐化しなくなり、オフラインの経路を獲得します。そのため、Webで発見するエージェントはローカルのショートカットを知ることができます。

ネガティブ／持ち越し:
- gemはマニュアルのぶん（markdown——わずか）大きくなります。完全なコーパスは意図的に外したままです（WD1）。
- **2つの`llms.txt`コピー**（サイト＋gem）は同期の規律を必要とします——両者がインデックスする単一ソースとしてマニュアルを扱うことで緩和しています。両者を整合させるジェネレータ（あるいはドキュメントチェックのspec）はフォローアップです。
- `rigor docs`＋`llms.txt`の語彙は、**[ADR-50](../50-release-engineering-and-stability-strategy/) WD1のもとv1.0で凍結される公開サーフェス**になります。

## 他のADRとの関係

- **[ADR-73](../73-skill-driven-user-experience/)** — このADRがドキュメントの軸で完成させるSKILL駆動UX（`rigor docs`は`rigor skill print`のドキュメント版の片割れ。WD3がスキルのネットワーク依存を閉じます）。
- **[ADR-27](../27-tool-distribution-model/) / [ADR-31](../31-contribution-and-supply-chain-policy/)** — 単一gem配布。`docs/manual`は`skills/`と同様にそこに同梱され、2つ目の成果物はありません。
- **[ADR-19](../19-language-server-packaging/) / [ADR-33](../33-mcp-server/)** — 「新しい`rigor`サブコマンドのパッケージング」という兄弟ADRです。`rigor docs`は同じCLIサーフェスのパターンに従います。
- **[ADR-50](../50-release-engineering-and-stability-strategy/)** — `rigor docs`サーフェス＋`llms.txt`の語彙をv1.0で凍結します（帰結を参照）。
