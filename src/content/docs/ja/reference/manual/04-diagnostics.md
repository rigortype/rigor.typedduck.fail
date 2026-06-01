---
title: "診断"
description: "rigortype/rigor docs/manual/04-diagnostics.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/04-diagnostics.md"
sourcePath: "docs/manual/04-diagnostics.md"
sourceSha: "4b3681c9836b9ba1aa104cd32a5f1edd1337a254f1404c52b55ae0a1911e9bb9"
sourceCommit: "f391fadebcb3c674444a346501d51664b046dec2"
translationStatus: "translated"
sidebar:
  order: 9004
---

`rigor check`が問題を見つけると**診断**を報告します: ファイル、行と列、重要度、ルールID、メッセージ。このページはルールカタログ、重要度モデル、抑制のリファレンスです。各ルールの*根拠*については[ハンドブック第8章](../../handbook/08-understanding-errors/)を参照してください。

## ルールID

すべてのルールは`family.rule`という2セグメントの識別子を持ちます:

| ファミリー | 対象 |
| --- | --- |
| `call` | コールサイト——未定義メソッド、引数の数、引数の型、nilレシーバー。 |
| `flow` | 制御フロープルーフ——常に例外、デッドブランチ、定数条件。 |
| `def` | メソッド定義——戻り型、ivar書き込み、可視性。 |
| `assert` | `assert_type`チェック。 |
| `dump` | `dump_type`通知。 |

`rigor explain <rule>`は任意のIDのカタログエントリー全体を表示します。引数なしの`rigor explain`はすべてを一覧表示します。

### カタログ

| ルール | 発火条件 |
| --- | --- |
| `call.undefined-method` | メソッドが受信側の静的に既知のクラスで定義されていない。 |
| `call.wrong-arity` | 位置引数の数がどのシグネチャとも一致しない。 |
| `call.argument-type-mismatch` | 引数の型がパラメータ契約（contract）に違反することが証明できる。 |
| `call.possible-nil-receiver` | 受信側が`T | nil`で、メソッドが`NilClass`で定義されていない。 |
| `flow.always-raises` | 式が到達可能なすべてのパスで例外を投げることが証明できる。 |
| `flow.unreachable-branch` | `if` / `unless` / 三項演算子のブランチが静的に到達不能。 |
| `flow.always-truthy-condition` | 条件が証明可能に常に真または常に偽。 |
| `flow.dead-assignment` | ローカル変数が同じメソッド内で書かれるが読まれない。 |
| `def.return-type-mismatch` | メソッドボディの結果が宣言されたRBSの戻り型に違反する。 |
| `def.ivar-write-mismatch` | インスタンス変数が最初の書き込みと異なる型で書かれる。 |
| `def.method-visibility-mismatch` | 明示的レシーバーの呼び出しがprivateメソッドに到達する。 |
| `assert.type-mismatch` | `assert_type`の期待値が推論型と一致しない。 |
| `dump.type` | `dump_type`呼び出し — 情報として推論型を出力する。 |

プラグインはさらにファミリーとルールを追加できます。`rigor explain`はアクティブな設定が読み込んだものをすべて一覧表示します。

## 重要度プロファイル

各ルールは作成時の重要度で発行され、その後**プロファイル**が実行時に再スタンプします。`severity_profile:`設定キーで設定する3つのプロファイルがあります:

| プロファイル | スタンス |
| --- | --- |
| `lenient` | 証明された診断のみがエラー。不確かなものは`warning` / `info`に下がる。レガシーコードへの段階的導入向け。 |
| `balanced` *（デフォルト）* | ほとんどのルールが`error`。`dump.type`は`info`。不確かなルールは`warning`。 |
| `strict` | すべてのルールが`error`。CIに適している。 |

より細かい制御のために、`severity_overrides:`はルールIDまたはファミリーを`error`、`warning`、`info`、または`off`のいずれかにマッピングします:

```yaml
severity_profile: balanced
severity_overrides:
  flow.always-truthy-condition: off
  call: warning
```

ルール固有のオーバーライドはファミリーオーバーライドより優先されます。

## 診断の抑制

最も狭い範囲から広い範囲まで3つのレイヤーがあります。

**ソース内、1行**。末尾コメントでその行の指定したルールを抑制します:

```ruby
config.merge(extra)  # rigor:disable call.undefined-method
```

修飾IDファミリーワイルドカード（`call`）、カンマまたはスペース区切りのリスト、または`all`を受け付けます。

**ソース内、ファイル全体**。ファイル内のどこかに`# rigor:disable-file <rules>`を記述すると、すべての行でそれらのルールが抑制されます。`# rigor:disable-file all`でファイルを黙らせます。

**プロジェクト全体**。`disable:`設定キーで実行全体のルールをオフにします:

```yaml
disable:
  - flow.dead-assignment
```

表示は維持したいが失敗させたくない*既知のバックログ*には、`disable:`の一括設定より[ベースライン](../06-baseline/)を使用してください——`disable:`は新しい発生も隠してしまいます。
