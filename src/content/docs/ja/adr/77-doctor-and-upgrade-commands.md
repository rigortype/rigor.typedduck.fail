---
title: "ADR-77 — `rigor doctor`と`rigor upgrade`のエビデンスルーティングコマンド"
description: "rigortype/rigor docs/adr/77-doctor-and-upgrade-commands.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/77-doctor-and-upgrade-commands.md"
sourcePath: "docs/adr/77-doctor-and-upgrade-commands.md"
sourceSha: "93fb43180902770513c7afed6224cbcde17f533faca16f8af27d366ea0f607cc"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
translationStatus: "translated"
sidebar:
  order: 4077
---

ステータス: **Accepted — 2026-06-24に実装（`8048991c`。`upgrade`はスケルトン）**。デフォルトの`check`の挙動を変えるのではなく、**既存のエビデンスをルーティングする**2つの追加的なCLIコマンドです。`rigor doctor`は、すでに生成済みの所見（設定解決の警告、RBS環境の健全性、strictプラグイン認識、ベースラインドリフト）を、セットアップ問題vsクリーンな実行に分類し、推奨される次のアクションを添えます。`rigor upgrade`は[ADR-50](../50-release-engineering-and-stability-strategy/)のWD7移行コマンドです。どちらも既存のcheck／baseline／pluginサーフェスを再利用し、デフォルトの挙動変更を追加せず、（JSONを出力する場合は）初日から安定した構造化契約を持ちます。互換性セーフ（追加的で、現行の挙動を保持）。

根拠: [2026-06-22の強化サーベイ](../../notes/20260622-rigor-0.2.x-compatibility-safe-strengthening-survey/)§7 / P5。[ADR-50](../50-release-engineering-and-stability-strategy/)のWD7（`rigor upgrade`移行コマンド。具体的なBCがターゲットを与えるまで先送り）。そして[ADR-73](../73-skill-driven-user-experience/)——これは`rigor-doctor`と`rigor-upgrade`を**カタログのみのSKILL**として出荷しました（背後にコマンドはなく、`doctor`は`config_warnings`＋`plugins --strict`＋ベースラインドリフトを手作業で組み合わせています）。本ADRはそれらの手組みのフローを第一級のコマンドへ昇格させます。

## コンテキスト

`rigor check`はすでに診断に必要なあらゆるデータを生成しています。`config_warnings`（何にも解決されない`.rigor.yml`）、空のRBSのWARNINGバナー（`RBS classes available: 0`）、`plugins --strict`の認識、そしてベースラインドリフトです。今日、ユーザー（あるいは`rigor-doctor`スキル）は複数のコマンドを実行し出力を読んで、*壊れたセットアップ*（Railsに固定されているのにプラグインがないプロジェクト、typoした設定キー、古びたベースライン）と*本当にクリーンな実行*を区別しなければなりません。これはまさに、サーベイが最も強力な追加的ヘルパーと呼ぶ、既存エビデンスの分類という形です。

CLIディスパッチはv1.0で凍結される語彙テーブル（`cli.rb:25`、`HANDLERS`）なので、新しいコマンドは公開サーフェスへの追加です。意図的に命名され、JSONを出力するなら安定した契約として設計されなければなりません。再利用可能なランナーのセットアップは`CheckCommand#build_check_runner`にあります（今日はprivateでオプション／バッファ／キャッシュに結合されています）——これはADR-73の`describe --deep`フォローアップが必要とするのと同じヘルパーであり、したがって共有の「checkを実行して`Analysis::Result`を得る」抽出が共通の依存です。

## 決定

### WD1 — `rigor doctor`: 分類する、うるさく再解析しない

`rigor doctor`は既存のプロジェクトチェックを実行（あるいは再利用）し、所見を小さな固定のレポートへ分類します。*セットアップ問題*（設定が何にも解決されない、`RBS classes available: 0`、Railsに固定されているのにRailsプラグインがない、ベースラインドリフト）vs*クリーンな実行*で、それぞれにルーティングされた次のアクション（`rbs collection install`、`plugin-tune`、`baseline regenerate`、`pre_eval:`を指し示す）を伴います。これは`check`がすでに生成しているデータの上に乗るプレゼンテーション／集約層であり、新しい解析パスも新しい診断ルールも**追加しません**。メッセージの文言はプレゼンテーションです。JSON出力（`--format json`）はどれも、人間向けテキストの写しではなく安定した構造化契約（`{checks: [{id, status, hint}]}`という形）です。

### WD2 — `rigor upgrade`: ADR-50 WD7の移行コマンド

`rigor upgrade`は先送りされていたADR-50 WD7のコマンドです。バージョン移行の機械的な部分を適用します（例えば、強化されたデフォルトプロファイルに対して`baseline regenerate`を再実行する、`LEGACY_RULE_ALIASES`経由でリネームされた抑制idを表面化する、`bleeding_edge:`の卒業を報告する、など）。具体的なBCがターゲットを与えたときに着地します。本ADRは、`rigor-upgrade`スキルがルーティングできるコマンドを持てるよう、コマンドのスロットと契約を今のうちに記録します。

### WD3 — checkランナーのセットアップは再利用する、重複させない

両コマンドは、`CheckCommand#build_check_runner`から抽出された共有の「checkを実行して`Analysis::Result`を得る」ヘルパーを消費するので、`rigor check`自身の設定／プラグイン／キャッシュ解決から決して分岐しません。この抽出は、[ADR-73](../73-skill-driven-user-experience/)の「フィールドトライアルのフォローアップ」節が`describe --deep`のために名指ししているのと同じものです。3つの呼び出し元（`doctor`、`describe --deep`、`check`）がこれを共有します。

### WD4 — 深い調査はオプトインであり、存在確認のみのデフォルトには決してならない

`rigor doctor`は実際の（スコープを絞った）解析を実行するので、存在確認のみの`rigor skill describe`ヘッドラインパスには**配線されません**（ADR-73のWD2はそちらを副作用フリーのままに保ちます）。高コストな診断は、ユーザーが実行する明示的なコマンドです。`describe`は存在シグナルから`doctor`を*推奨*してもよいですが、実行はしません。

## 却下／先送りした代替案

- **`doctor`の深い解析を`describe`のヘッドラインのデフォルトにする**。 ADR-73 WD2の存在確認のみの契約を破ります（次に何をすべきかのヒントにしては遅く／副作用がある）。却下——`describe`は`doctor`を推奨するのであって、`doctor`そのものにはなりません。
- **各コマンドでcheckランナーのセットアップを重複させる**。 `rigor check`の実際の設定／プラグイン／キャッシュ解決から時間とともに分岐します。WD3は代わりに1つのヘルパーを共有します。
- **別個の診断gem／外部ツール**。単一の同梱gemモデル（[ADR-31](../31-contribution-and-supply-chain-policy/)）に反します。エビデンスはすでにgemの中にあります。
- **「セットアップ問題」用の新しい診断ルールを追加する**。 `doctor`は集約／プレゼンテーション層であって新しい解析ではありません。ルールidを新設することは、ルーティングビューのために語彙を増殖させるだけです。

## 帰結

- **ポジティブ:**マルチコマンドで出力を読む診断を、1つのルーティングされたコマンドに変えます。ADR-73の`rigor-doctor` / `rigor-upgrade`カタログスキルに、実際に委譲できるコマンドを与えます。`describe --deep`のブロックも解く`build_check_runner`抽出を強制します。
- **ネガティブ:** v1.0で凍結された`HANDLERS`語彙に2つの新しいエントリーが加わり、安定して維持すべき新しいJSON契約が生まれます。`upgrade`の本体は具体的な移行ターゲットを待ちます。
- **持ち越し:**共有checkランナーヘルパー（WD3）が再利用可能な成果物です。`doctor`のチェック集合はv1では意図的に小さく、需要に応じて分類器の分岐が増えていきます。

## 他のADRとの関係

- [ADR-50](../50-release-engineering-and-stability-strategy/) — `rigor upgrade`はWD7です。新しいコマンド語彙はWD1のもとv1.0で凍結されます。
- [ADR-73](../73-skill-driven-user-experience/) — カタログのみの`rigor-doctor` / `rigor-upgrade`スキルがこれらのコマンドを裏付けます。`build_check_runner`抽出を`describe --deep`と共有します。
- [ADR-23](../23-diagnostic-triage-command/) / [ADR-33](../33-mcp-server/) / [ADR-51](../51-ci-diagnostic-output-formats/) — 先行する追加的コマンド／構造化出力の先例です。
