---
title: "rigor-sorbet"
description: "rigortype/rigor docs/manual/plugins/rigor-sorbet.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-sorbet.md"
sourcePath: "docs/manual/plugins/rigor-sorbet.md"
sourceSha: "e284a1b2c3e80ca076a97c13ef234b3bf60fca814a2a6ff33d1c365d2a4b3053"
sourceCommit: "7f14d503aa4cfefb25672389bab5a229b1219f4e"
sourceDate: "2026-11-05T17:09:05+09:00"
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

このプラグインは**入力側専用**です。Sorbetの構文をRigorの型モデルへ翻訳します。Sorbetのチェッカーを実行することも、`sorbet-runtime`を同梱することも、Sorbetのランタイム保証を強制することも**しません**。RBSのsigとSorbetのsigが一致しない場合、呼び出し箇所はSorbetのsigの戻り値型を取得し、メソッドの本体はRBSの戻り値に対してチェックされます。翻訳テーブルの外にある形式（`T.proc`、`T.self_type`、…）は`Dynamic[top]`に劣化します。第10章が完全な語彙とこれらのエッジケースを記述しています。

また本プラグインは、同梱された`sorbet-runtime`のRBSサーフェスを通じて、アノテーションDSL自体の式（`sig`、`params`、`returns`、`void`、`abstract`、`override`、`type_member`、`T::Array[...]`、`T::Helpers`/`T::Generic`マクロ、`T::Struct`/`T::Enum`のクラス本体 ── プレーンな`T::Struct`サブクラス上の`sig`には、ランタイムの挙動に合わせて依然としてサブクラス自身の`extend T::Sig`が必要）も型付けします ── したがって、Sorbetコードベースにおいてsig DSLが`Dynamic[top]`と読まれることはなくなりました。

`T::Struct`、`T::InexactStruct`、または`T::ImmutableStruct`のサブクラスにおいて、クラス本体のトップレベルにある`prop :name, Type`および`const :name, Type`は、`obj.name`に翻訳された`Type`を与え（`T.nilable(String)`は`String?`と読まれ、テーブル外の形式は`Dynamic[top]`と読まれます）、`prop`は`obj.name = v`にも応答します。`Type`内の相対定数はクラス本体の名前空間から外側に向かって解決され、既知のクラスを指名しないものは`Dynamic[top]`と読まれます。`const`はライターを持たないため、`obj.name = v`は依然として報告されます。サブクラスはアクセサを継承し、クラス本体内の同名の`def`はマクロに優先し、`if`やブロック配下にネストされた`prop`は`Dynamic[top]`と読まれます。構造体ファミリー外のクラスでの`prop`呼び出しは何も定義しません。

モデル化していない点：`include T::Props`は`ClassMethods`サーフェスを付与しません（`< T::Struct`サブクラスパスのみが付与します）、そしてより深いtype-memberの仕組み（`T.attached_class`の分散（variance）、`type_member`の境界）は呼び出しサイトへ伝播されません。

## プラグイン内部

スライス（slice）ごとの実装（sigのパース、アサーションのリフティング、RBIツリーウォーカー、ミックスインチェーンの解決、ディスパッチャーのティア順序）、ソースレイアウト、デモは[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sorbet/README.md)にあります。設計の根拠は[ADR-11](../../../adr/11-sorbet-input-adapter/)です。
