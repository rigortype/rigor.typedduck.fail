---
title: "rigor-sorbet"
description: "rigortype/rigor docs/manual/plugins/rigor-sorbet.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-sorbet.md"
sourcePath: "docs/manual/plugins/rigor-sorbet.md"
sourceSha: "0a40eacc5c2708a256aa97dac0247fefa6613246c281270df3c1d8ca6d9e2813"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

既存の[Sorbet](https://sorbet.org/)コードベースを型ソースとしてRigorに読ませます。インラインの`sig { ... }`ブロック、RBIファイル、そして`T.let` / `T.cast` / `T.must` / `T.unsafe` / `T.bind` / `T.assert_type!` / `T.absurd`のアサーション形式がRigor独自のキャリア（carrier）へ翻訳されるため、RBSで何も書き直すことなく`srb tc`と並べて`rigor check`を実行できます。ソースのみを読み ── `sorbet-runtime`はロードしません。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-sorbet
```

> **完全ガイド**。このページは運用上のクイックリファレンスです。完全なウォークスルー ── Sorbet→Rigorの型語彙テーブル、すべてのアサーション形式、RBI / Tapioca-DSLの扱い、sigilのセマンティクス、`T.absurd`の網羅性、そして移行パターン ── は[ハンドブック第10章 ── Sorbetとの共存](../../../handbook/10-sorbet/)にあります。

## 設定

```yaml
plugins:
  - gem: rigor-sorbet
    config:
      enforce_sigil: true              # default; honour `# typed:` sigils
      rbi_paths: ["sorbet/rbi"]        # default; set [] to disable RBI loading
```

- **`enforce_sigil`**（デフォルト`true`） ── Sorbet自身の契約（contract）を反映します。`# typed: true`以上の厳格度のファイルからのみsigを記録します。`false`に設定すると、sigilに関係なくパース可能なすべてのファイルからsigを記録します。インラインのアサーション認識器（recognizer）（`T.let`、`T.cast`、…）は、ユーザーが意図的に書いたものなので常に発火します。
- **`rbi_paths`**（デフォルト`["sorbet/rbi"]`） ── ロードする`.rbi`ファイルのディレクトリ（標準のTapiocaサブディレクトリ`gems/` / `annotations/` / `dsl/` / `shims/`は再帰により参加します）。`[]`に設定するとオプトアウトでき、ベンダリングしたツリーを追加することもできます。

## スコープと制限

このプラグインは**入力側専用**です。Sorbetの構文をRigorの型モデルへ翻訳します。Sorbetのチェッカーを実行することも、`sorbet-runtime`を同梱することも、Sorbetのランタイム保証を強制することも**しません**。RBSのsigとSorbetのsigが食い違う場合は、RBSが優先されます（Sorbetのsigは絞り込めますが、矛盾することはできません）。翻訳テーブルの外にある形式（`T.proc`、`T.self_type`、`T::Struct` / `T::Enum`のサブクラス、…）は`Dynamic[Top]`に劣化します。第10章が完全な語彙とこれらのエッジケースを記述しています。

## プラグイン内部

スライス（slice）ごとの実装（sigのパース、アサーションのリフティング、RBIツリーウォーカー、ミックスインチェーンの解決、ディスパッチャーのティア順序）、ソースレイアウト、デモは[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sorbet/README.md)にあります。設計の根拠は[ADR-11](../../../adr/11-sorbet-input-adapter/)です。
