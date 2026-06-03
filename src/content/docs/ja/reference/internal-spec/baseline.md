---
title: "Baseline Key Derivation"
description: "Imported from rigortype/rigor docs/internal-spec/baseline.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/baseline.md"
sourcePath: "docs/internal-spec/baseline.md"
sourceSha: "77430b69638d989a2fbb1ecb25d927b5b3ac84b3580c14aa66187f04f1b4e735"
sourceCommit: "ea8ac6950eae8c643cd2811da2569fd4809f89c8"
translationStatus: "translated"
sidebar:
  order: 3050
---

`Rigor::Analysis::Baseline`は、ライブのdiagnosticストリームを記録済みの`.rigor-baseline.yml`に照らしてフィルタリングします。これにより、プロジェクトは既存の検出結果をすべて一度に修正しなくてもRigorを採用できます（[ADR-22](../../adr/22-baseline-and-project-onboarding/)）。このページは**バケットキーの導出**――diagnosticがどのように格納行へマップされるか――を確定させます。これはベースライン（baseline）ファイルのフォーマットが依存する永続的な契約（contract）です。運用ガイド（ファイルの生成・更新・編集）はユーザーマニュアル§「ベースライン」にあり、設計上の根拠（ルールIDかメッセージ粒度か）はADR-22 WD1にあります。

ベースラインフィルタリングは**最後の抑制レイヤー**であり、インラインの`# rigor:disable`マーカーの後、かつ深刻度解決
（[diagnostic-policy.md](../../type-specification/diagnostic-policy/#severity-resolution)）の後に適用されます。

## バケットキー

ベースライン行（`Baseline::Bucket`）はタプルでキー付けされます。

```
[ file, rule, message_regex ]
```

- `file` ── diagnosticのパス、**プロジェクトルートからの相対パス**（`rigor`の実行時の作業ディレクトリ）。相対パスを格納することで、生成されるファイルはマシンやチェックアウト場所をまたいで可搬になります。ライブのdiagnosticの絶対パスは、ルックアップ前に相対パスへ正規化されます。
- `rule` ── diagnosticの`qualified_rule`
  （[`diagnostic-shape.md`](../diagnostic-shape/)）。`qualified_rule`が`nil`のdiagnostic（抑制不能なパースエラー／内部エラー）や、`path`が`nil`のdiagnosticは**決して**ベースライン化されません。
- `message_regex` ── ルールモードでは`nil`、メッセージモード（後述）では`Regexp`。

各バケットは`count`も保持します。これはPHPStan互換の、そのキーについて記録された出現回数です。これによりベースラインは記録された多重度ちょうどまでを許容し、カウントが増えたときに回帰を顕在化させます。

## マッチモード

`match_mode`はキーの粒度を選択します。

- **`:rule`** ── キーの`message_regex`が`nil`なので、`(file, qualified_rule)`ペアに対するすべてのdiagnosticがメッセージにかかわらず1つのバケットに寄与します。より粗く、変動に強いモードです。
- **`:message`** ── キーはdiagnosticのメッセージから導出された`message_regex`を保持するので、メッセージが異なるごとに独自のバケットを持ちます。ジェネレータは`Regexp.escape(message)`を書き込むため、YAMLのラウンドトリップはリテラルのメッセージにマッチします。行を手で編集するユーザーは、エスケープされた形をよりゆるいパターンに置き換えてもよい（MAY）。よりタイトなモードであり、同じルールの下で`undefined method 'foo'`と`undefined method 'bar'`を区別します。

格納されるファイルフォーマットのバージョンは`Baseline::CURRENT_VERSION`（`1`）です。
