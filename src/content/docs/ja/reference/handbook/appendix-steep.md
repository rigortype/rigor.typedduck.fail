---
title: "付録 — Steepから来た場合"
description: "Imported from rigortype/rigor docs/handbook/appendix-steep.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-steep.md"
sourcePath: "docs/handbook/appendix-steep.md"
sourceSha: "ce278584bbffb0ac6669340feb3387ac0b0626ad66a70c8affcfd2bdadc7b3a7"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "Steepから来た場合"
---

[Steep](https://github.com/soutaro/steep)はRubyの確立した静的型チェッカーであり、RBS駆動の解析のデファクト標準実装である。Steepを使ったことがある場合、最も重要なことは**Rigorが同じ`.rbs`ファイルを読む**ということ — 既存のシグネチャはそのまま移植できる。ふたつのツールは排他的ではなく補完的。

この付録はSteepの語彙で考えており、Steepのどの概念がRigorのどの概念に対応するかを知りたいユーザー向け。

## 5秒ピッチ

| 問い | Steep | Rigor |
| --- | --- | --- |
| 型のソース | `.rbs`ファイル（境界では必須） | `.rbs`ファイル（オプション — 推論がギャップを埋める） |
| `.rb`内のアノテーション | `# @type`コメント、型アサーション | ほぼなし — `assert_type`/`dump_type`は内省ヘルパー |
| カバレッジ要件 | Steepfileの`check`/`signature`ディレクティブがアノテート済みターゲットを要求 | なし — `rigor check lib`はゼロ`.rbs`でも動作する |
| アノテートされていないコードのデフォルト | Steepに確認させるとエラー | 精密に推論、不明なら`Dynamic[Top]` |
| ツールのフォーカス | オプトインサーフェスへの強い型付け | すべてのファイルへのベストエフォートな精度 |
| 診断の哲学 | すべての型シェイプの不一致を示す | バグが証明可能な場合のみ沈黙を破る |

Steepのスローガンが「オプションなマニフェスト型を持つRuby」なら、Rigorのは「証明された事実を持つRuby」。ふたつは重なりながらも異なるワークフローのために設計されている。

## 両者ともRBSを消費する — それが共通の基盤

これが見出し。RBSはRubyの標準シグネチャ言語。SteepとRigorの両方が標準的な型ソースとしてこれを読む。Steep向けに書いた`.rbs`ファイルはRigorでも変更なしに動作する:

```ruby
# sig/slug.rbs
class Slug
  def normalise: (String) -> String
  def self.default_length: () -> Integer
end
```

Steepは`Slug#normalise`のボディをこのsigに対してチェックし、戻り型がずれるとエラーを出す。Rigorは`def.return-type-mismatch`ルール（第8章）の下で同じことをチェックする。両ツールともコントラクトで合意する。

ツールはその上に何をレイヤリングするかで分岐する:

- **Steep**はメソッドボディの型チェックと「チェック対象のすべてのメソッドがsigを持たなければならない」という厳格な期待（設定可能だがデフォルト）を追加する。
- **Rigor**は推論をどこにでも追加し（sigがないと`Dynamic[Top]`になるがエラーにならない）、リファインメントキャリア、定数folding、プラグインサイドのナローイングを追加する。

## 型語彙 — RBSレベルのマッピングは恒等関数

両ツールともRBSを話すので、宣言レベルの型語彙は同じ:

| RBSの形式 | Steep | Rigor |
| --- | --- | --- |
| `String` | `String` | `Nominal[String]`（表示: `String`） |
| `Integer?` | `Integer | nil` | `Integer | Constant<nil>`（表示: `Integer?`） |
| `Array[Integer]` | `Array[Integer]` | `Array[Integer]` |
| `[Integer, String]`（タプル） | タプル | `Tuple[Integer, String]` |
| `{name: String, age: Integer}`（レコード） | レコード | `HashShape{name: String, age: Integer}` |
| `_Comparable`（インターフェース） | 構造的 | 構造的ファセット |
| `untyped` | `untyped` | `Dynamic[Top]`（表示: `untyped`） |
| `bot` | `bot` | `Bot` |
| `top` | `top` | `Top` |
| `bool` | `bool` | `Constant<true> | Constant<false>`（表示: `bool`） |
| `void` | `void` | `void` |

Rigorの内部型キャリア（`Type::Constant`、`Type::IntegerRange`、`Type::Refined`、`Type::Tuple`、`Type::HashShape`）はSteepのサーフェスには存在しない。境界で**RBS等価にエラーされる**ため、RBSで`-> String`と宣言されたメソッドはRigorが内部的に`non-empty-lowercase-string`と知っていても、呼び出し元の期待を満たす。

この消去コントラクトは[`docs/type-specification/rbs-erasure.md`](../../type-specification/rbs-erasure/)に文書化されている。

## `.rb`ソース内のアノテーション

Steepはソース内の型アノテーションの小さなセットを認識する:

| Steepの`.rb`アノテーション | Rigorの対応物 |
| --- | --- |
| `# @type var x: Integer` | （コアに対応なし） |
| `# @type self: Foo` | `rigor-sorbet`プラグイン経由の`T.bind(self, Foo)` |
| `# @type method foo: () -> String` | RBSファイル宣言 |
| `_ = x`（型キャスト） | `rigor-sorbet`プラグイン経由の`T.cast(x, T)` |

Rigorはコアにソース内アノテーションコメントを意図的に提供しない。根拠（ADR-0、ADR-5、堅牢性の原則）:

1. **`.rb`ファイルはランタイム開発者のためにきれいに保つ**。型を気にしない作者は型コメントを見ない。
2. **アノテーションは境界に属する**。Rigorのスタンスはパブリックコントラクトがすべての変数代入ではなく`.rbs`に存在するということ。
3. **推論がほとんどの変数をカバーする**。`x = some_call`の場合、Rigorは`some_call`の戻り型を知っている — アノテートするものはない。

ソース内アサーションが本当に必要なとき（SteepやSorbetから移行中、またはエンジンが追えない複雑なナローイングがある場合）は、`rigor-sorbet`プラグインがサポートされたパス — 第10章参照。

## Steepfile vs `.rigor.yml`

| Steepの`Steepfile` | Rigorの`.rigor.yml` |
| --- | --- |
| `target :lib do ... end` | `paths: [lib]` |
| `check "lib"` | `paths:`でカバー |
| `signature "sig"` | `signature_paths: [sig]`（省略した場合は自動検出） |
| `library "set", "json"` | `rbs_collection.lock.yaml`（RBSのgemコレクション） — Steepが使う同じ仕組み |
| `configure_code_diagnostics` | `severity_overrides:`、`severity_profile:` |
| Steepfileの複数ターゲット | 複数の`paths:`エントリ（プロジェクトごとに単一プロファイル） |

最大の設定上の違い: Steepのターゲットごとの構造により同じプロジェクトで`lib/`を厳格に、`app/`を緩く確認できる。Rigorのプロファイルはプロジェクト全体で、粒度のためのルールごととファイルごとのオーバーライドを持つ。

## 深刻度モデル

両ツールとも深刻度コントロールを持つ。形状はわずかに異なる。

| Steep | Rigor |
| --- | --- |
| `configure_code_diagnostics(D::Ruby.strict)`（ターゲットごと） | `severity_profile: strict`（プロジェクト全体） |
| `D::Ruby.lenient` / `default` / `strict` / `all_error` | `lenient` / `balanced` / `strict` |
| Steepfileの診断ごとの深刻度 | `.rigor.yml`の`severity_overrides:` |
| `D::Ruby::UnknownConstant = :error` | `severity_overrides: { call.undefined-method: error }` |

ルール識別子は1:1では一致しない — Steepのものはクラス名、Rigorのものはドット区切りのファミリー。概念的なモデルは同じ: デフォルトレベルと、ルールごとの昇格/降格。

## 診断語彙

Steepの診断カタログとRigorのものは同じ根本的な条件について重なるが、名前が異なる。

| Steep | Rigor |
| --- | --- |
| `Ruby::NoMethod` | `call.undefined-method` |
| `Ruby::ArgumentTypeMismatch` | `call.argument-type-mismatch` |
| `Ruby::IncompatibleAssignment` | （インスタンス変数には`def.ivar-write-mismatch`でカバー。ローカル変数はフラグを立てない） |
| `Ruby::MethodBodyTypeMismatch` | `def.return-type-mismatch` |
| `Ruby::UnknownConstant` | （レシーバークラスへの`call.undefined-method`でカバー） |
| `Ruby::UnexpectedKeywordArgument` | `call.argument-type-mismatch`（キーワードバインドは同じルールを流れる） |
| `Ruby::IncompatibleTypeCase` | （現時点で直接対応なし） |

実践的な含意: SteepとRigorの両方を実行するプロジェクトは、シェイプエラーでは重複した診断を見て、各ツールが相手が捕捉しないものについては補完的な診断を見る。[`docs/notes/20260503-steep-cross-check-triage.md`](../../notes/20260503-steep-cross-check-triage/)ノートは作業例 — SteepとRigorを同じプロジェクトで実行し診断ストリームをカテゴリ分けした。

## 抑制

| Steep | Rigor |
| --- | --- |
| `# steep:ignore` | `# rigor:disable all` |
| `# steep:ignore Ruby::NoMethod` | `# rigor:disable call.undefined-method` |
| （ファイルスコープ構文なし） | `# rigor:disable-file <rule>` |
| `Steepfile`: ターゲットごとの`ignore_paths:` | `.rigor.yml`: `disabled_rules:`（ルールスコープ） |

Rigorの抑制語彙はSteepのものよりPHPStanとRuboCopのものに近いが、意図は同じ。

## 「アノテーション不要」— 最大の実践的な違い

Steepは、デフォルトでチェック対象のすべてのメソッドにRBS sigを持つことを期待する（`# @type`アノテーションでオプトアウトするか）。`sig/`ディレクトリのないプロジェクトで`steep check`を実行すると「sigがない」レポートが大量に出る。

Rigorは、デフォルトで推論できるものを推論し、できないときには沈黙する。`sig/`ディレクトリのないプロジェクトで`rigor check lib`を実行すると少数の高信頼診断が出る — Rigorがボディだけから不健全さを証明できたメソッド。

これは設計通り（ADR-0）。ふたつのツールは異なる採用段階に対応する:

- **グリーンフィールド、初日から型ディシプリンのプロジェクト**。Steepが優秀。まずRBSを書き、ボディをそれに対してチェックする。
- **既存のコードベース、段階的な強化**。Rigorが優秀。ゼロ`.rbs`から始め、最悪のバグに対する診断をすぐに得て、推論が及ばない箇所にのみ`.rbs`を追加する。
- **両方同時に**。並行して実行する。同じRBSを共有する。Steepの診断ストリームとRigorの診断ストリームは互いを補完する。

## SteepにあってRigorにないもの

- **ソース内の`@type`コメント**。ソース内アノテーションへのスタンスはともかく、Steepはそれらに対してより豊かなサーフェスを提供する。`# @type var x: Integer`、`# @type self: Foo`、`_ = x`キャスト演算子にRigorコアの対応物はない。`rigor-sorbet`プラグインがそのギャップを埋める（第10章）。
- **宣言パラメーターに対するメソッドボディの型チェック**。Steepはボディ内の`x`へのすべての参照が宣言された`x: Integer`と一致することを強制する。Rigorの類似チェックは`def.return-type-mismatch`。パラメーター側のチェックは同等だが保守的（RBS消去ビュー）。
- **より厳密なジェネリクス推論**。チェーンした呼び出しでのSteepのジェネリクスインスタンス化は現時点でのRigorより積極的。
- **診断タクソノミーの成熟度**。Steepの診断カタログは定着するまでに長い年月を経た。Rigorのものは小さく成長中。

## RigorにあってSteepにないもの

- **RBSなしの推論**。`.rbs`ファイルがゼロの`lib/`ディレクトリはRigorから有用な出力を生む。Steepはsigが必要。
- **自動ナローイングを持つリファインメントキャリア**。`unless s.empty?`からの`non-empty-string`、`n > 0`からの`positive-int`等。
- **メソッド呼び出しを通じた定数folding**。`"foo".upcase`は`String`ではなく`Constant<"FOO">`に解決される。Steepのリテラル型はRigorのものより狭い。
- **プラグインサイドの戻り型提供**。Steepには`flow_contribution_for`に対応するものがない — ドメインDSLの戻り型がリテラルの最初の引数に依存する場合、Rigorはそれをモデル化するが、Steepはしない。
- **Sorbetインプットアダプター**。`rigor-sorbet`の移行はSorbet中間のプロジェクトにとってコストゼロ（`sig { ... }`ブロックとRBIファイルがRigorのカタログへの入力になる）。SteepはSorbetのsigを読まない。
- **キャッシュ駆動のインクリメンタル解析**。Rigorのファイルごとのキャッシュは実行をまたいでマシン境界をまたいで生存する（ADR-6）。Steepのインクリメンタルストーリーは改善中だがまだ同等ではない。

## 共存パターン

両チェッカーを望むプロジェクトの一般的な低摩擦なセットアップ:

```yaml
# .rigor.yml
paths: [lib]
severity_profile: balanced
# signature_pathsは自動検出。sig/はSteepと共有される
```

```ruby
# Steepfile
target :lib do
  check "lib"
  signature "sig"
  configure_code_diagnostics D::Ruby.default
end
```

両ツールとも同じ`sig/`を読む。CIは`steep check`と`rigor check lib`を独立したステップとして実行する。各ツールの出力は独自のアノテーションチャンネルに行く。同じ行について両者が意見が分かれるとき、立場上のルール: **Steepがフラグを立ててRigorが立てない場合は調査する**。Steepは通常、Rigorのリファインメントが意識的に吸収するsigのドリフトを示す傾向があり、Rigorは通常Steepが確認しないボディレベルの事実を示す傾向がある。

## マイグレーションvignette

2年間Steepを使っているプロジェクトを保守しているとする。`sig/`ツリーは充実しており、推論が不十分だったいくつかのファイルに`# @type`アノテーションが現れる。何も壊さずにRigorを追加したい。

手順:

1. **Rigorを開発依存関係として追加する**。`sig/`への変更なし。
2. **`rigor check lib`を一度実行する**。いくつかの新しい診断が出る — 通常はSteepが出さないナローイング対応の発見（`flow.always-truthy-condition`、`RBS::Extended`で締め付けられた戻りに対する`def.return-type-mismatch`）。バグかノイズかをトリアージする。
3. **`# @type`アノテーションへの対応を決める**。Rigorはそれらを無視する（パーサーへのコメント）。ふたつの選択肢:
   a. そのままにする — Steepがそれを使い続け、Rigorは無視する。何もしない共存。
   b. Rigorにもそのアサーションを尊重させたい場合は`rigor-sorbet`プラグインの`T.let`/`T.cast`に変換する。
4. **RigorをCIに追加する**。両チェッカーが実行され、mergeの前に両方のゲートを通過しなければならない。
5. **オプションで`RBS::Extended`で既存のsigを締め付ける**。Steepは`%a{rigor:v1:...}`を通常のRBSコメントとして扱い、Rigorはリファインメントディレクティブとして扱う。同じ`.rbs`ファイルがより厳格なRigor出力と変更なしのSteep出力を生む。

基盤的な前提（コントラクト言語としてのRBS）が共有されているため、移行は本当に低摩擦。

## 次のステップ

この付録セクションの残りを順番に読む必要はおそらくない。3つの有用なポインター:

- [第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/) — 既にRBSを書いていて、ディレクティブ文法がその上にどう重なるかを知りたい場合。
- [第8章 — エラーの読み方](../08-understanding-errors/) — ルールカタログ、深刻度プロファイル、ベースラインdiff — Steepの診断設定の対応物。
- [`docs/notes/20260503-steep-cross-check-triage.md`](../../notes/20260503-steep-cross-check-triage/) — 同じプロジェクトでSteepとRigorを並行実行した作業例（このプロジェクト自体）。

他のツールと比較したい場合は、兄弟付録ページが[TypeScript](../appendix-typescript/)、[PHPStan](../appendix-phpstan/)、[mypy](../appendix-mypy/)をカバーしている。
