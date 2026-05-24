---
title: "付録 — PHPStanから来た場合"
description: "Imported from rigortype/rigor docs/handbook/appendix-phpstan.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-phpstan.md"
sourcePath: "docs/handbook/appendix-phpstan.md"
sourceSha: "305d8e48f20258a893d2d9e07ca8911d3f3b3dbe609f27d742be6974f89417fa"
sourceCommit: "2834288850767f48c48c99dca26f6aa339322754"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "PHPStanから来た場合"
---

PHPStanは、Rigorが他の言語で持つ最も近い精神的なピアツールである。両ツールは同じ優先事項を共有する: アナライザーが特徴付けられないコードには沈黙し、必須アノテーションよりも推論に依拠し、高信頼の診断の小さなカタログを示す。Rigorの多くの設計選択 — 設定ファイルの形状、ベースラインdiff、深刻度プロファイル、`assert`系ディレクティブ — はPHPStanから直接影響を受けた。

PHPStanを使ったことがあれば、メンタルモデルはほぼそのまま持ち越せる。この付録は語彙をマッピングする。

## 5秒ピッチ

| 問い | PHPStan | Rigor |
| --- | --- | --- |
| アノテーションはどこに書くか？ | PHPDocの`/** ... */`ブロック | `.rb`の隣の`.rbs`ファイル |
| デフォルト動作 | 推論、見通せなければ沈黙 | 推論、見通せなければ沈黙 |
| 「レベル」 | 0 – 10（数値） | `lenient`/`balanced`/`strict`（名前付き） |
| ルールごとの制御 | `ignoreErrors:`正規表現、レベル降格 | `disabled_rules:`、`severity_overrides:` |
| ベースライン | `phpstan-baseline.neon` | `rigor.baseline.json` |
| スタブ形式 | PHPスタブファイル | RBSファイル |
| カスタムナローイング | Type-Specifying Extensions | プラグイン（第9章） |
| カスタム戻り値シェイプ | Dynamic Return Type Extensions | プラグインの`flow_contribution_for` |

ふたつのツールは基礎的な決定のほとんどで一致している。最大の違いはサーフェス — Rubyの構文とランタイムシェイプ — であり、哲学ではない。

## 型語彙マッピング

PHPStanとRigorには重複するリファインメント語彙がある — これはどのピアツールとも最も近いマッチだ。

| PHPStanのPHPDoc | Rigorの表現 | 備考 |
| --- | --- | --- |
| `string` | `String` | |
| `int` | `Integer` | |
| `float` | `Float` | |
| `bool` | `bool`（`Constant<true> | Constant<false>`） | |
| `null` | `Constant<nil>` | Rubyには`nil`のみ。 |
| `mixed` | `Top` | 「何でもあり」キャリア。 |
| `never` | `Bot` | 空の型。 |
| `void` | `void` | 同様。 |
| `array<T>` / `T[]` | `Array[T]` | |
| `array<K, V>` | `Hash[K, V]` | Rubyはコンテナの種類で分ける。 |
| `array{name: string, age: int}` | `HashShape{name: String, age: Integer}` | 同じキーごとのモデル。 |
| `array{0: int, 1: string}`（リストシェイプ） | `Tuple[Integer, String]` | 同じ位置ごとのモデル。 |
| `non-empty-string` | `non-empty-string` | **名前と意味が同一**。 |
| `non-falsy-string` | `non-empty-string` | Rigorはfalsy-but-nonemptyのケースを分けない。 |
| `numeric-string` | `numeric-string` | 同一。 |
| `lowercase-string` | `lowercase-string` | 同一。 |
| `class-string` | `Singleton[T]` | 等価なシェイプ。 |
| `int<1, 9>` | `int<1, 9>` | **構文が同一**。 |
| `positive-int` | `positive-int` | 同一。 |
| `negative-int` | `negative-int` | 同一。 |
| `non-zero-int` | `non-zero-int` | 同一。 |
| `non-empty-array<T>` | `non-empty-array[T]` | 同一。 |
| `non-empty-list<T>` | （独立したキャリアなし — `non-empty-array[T]`でカバー） | Rubyにはlist/dict分割がない。 |
| `T | U` | `T | U` | |
| `T & U` | `Intersection[T, U]` | |
| `literal-string` | `literal-string` | **概念が同一**。ソースコードのリテラルから構築されたことが証明可能。 |
| `'hello'`（リテラル型） | `Constant<"hello">` | |
| `42`（リテラル型） | `Constant<42>` | |

このテーブルは付録の中で最も密度が高い — 重複がとても近いから。PHPStanの「PHPDoc Types」ページを別のタブで開いているなら、ほぼすべての高度なリファインメントが転用できる。

## `@phpstan-assert`ファミリー

PHPStanのアサーションナローイングPHPDocタグは、Rigorの`RBS::Extended`ディレクティブ文法に直接対応する。第7章でテーブルを詳しく説明しているが、参照のためここに再掲する:

| PHPStanのPHPDoc | Rigorの`RBS::Extended` | 効果 |
| --- | --- | --- |
| `@phpstan-assert T $x` | `%a{rigor:v1:assert: x is T}` | returnの後、呼び出し元の`x`は`T`。 |
| `@phpstan-assert-if-true T $x` | `%a{rigor:v1:predicate-if-true: x is T}` | メソッドがtruthyを返せば、呼び出し元の`x`は`T`。 |
| `@phpstan-assert-if-false T $x` | `%a{rigor:v1:predicate-if-false: x is T}` | メソッドがfalseyを返せば、呼び出し元の`x`は`T`。 |
| `@phpstan-assert !T $x` | `%a{rigor:v1:assert: x is ~T}` | returnの後、呼び出し元の`x`は`T`**ではない**。 |
| `@phpstan-assert =T $x`（assert-and-narrow） | （`assert:`でカバー） | 同じ効果。 |
| `@phpstan-self-out T` | `%a{rigor:v1:assert: self is T}` | `self`が呼び出し元スコープでナローイングされる。 |
| `@phpstan-impure` | （対応なし） | Rigorはfold-through-method-callの純粋性をまだモデル化していない。 |

Rigorの文法が提供するすべてのディレクティブにはPHPStanのPHPDoc対応物がある。「このメソッドがreturnした後に何が何をナローイングするか」についてPHPStanのメンタルモデルがあれば、そのまま転用できる。

## Type-Specifying Extensions ↔ プラグイン

アサーションが**呼び出しシェイプ**で認識される場合 — PHPStanの`TypeSpecifyingExtension`インターフェースで、フレームワークがインスタンス化して「この呼び出しが与えられたとき、どのナローイングが生じるか？」と問うクラスを書く — Rigorの対応物はプラグインの`#flow_contribution_for`と`#diagnostics_for_file`フックとエンジンの`post_return_facts`基盤。

| PHPStanの拡張型 | Rigorの対応物 |
| --- | --- |
| `MethodTypeSpecifyingExtension` | `flow_contribution_for`から返されるプラグインの`Fact(target_kind: :parameter)` |
| `StaticMethodTypeSpecifyingExtension` | `Fact(target_kind: :receiver-class)`付きで同様 |
| `FunctionTypeSpecifyingExtension` | `Fact(target_kind: :argument)`付きで同様 |
| `DynamicMethodReturnTypeExtension` | プラグインの`flow_contribution_for(call_node:, scope:)` |
| `DynamicStaticMethodReturnTypeExtension` | プラグインコード内でreceiver-classブランチによって変化する、同様 |
| `DynamicFunctionReturnTypeExtension` | モジュールレベルメソッドに対して同様 |

[`docs/internal-spec/plugin.md`](../../internal-spec/plugin/)に固定されたプラグインコントラクトは、PHPStanの拡張APIがカバーするすべてのシェイプを与える。同様のライフサイクル（マニフェスト宣言、呼び出しごとのディスパッチ、ファクト発行）を持つ。第9章には高レベルの方向性がある。内部仕様が拘束力のあるコントラクト。

第10章の`rigor-sorbet`アダプターは「スケールでのType-Specifying Extension」の作業例そのもの — `T.must`、`T.cast`、`T.bind`、`T.assert_type!`のすべての呼び出しはsigではなく呼び出しシェイプで認識される。

## 設定

PHPStanの`phpstan.neon`とRigorの`.rigor.yml`/`.rigor.dist.yml`は同じ形状を使う: プロジェクトルートの単一の設定ファイル、存在する場合は自動ロード、`paths:`、深刻度コントロール、includesを持つ。

| PHPStan | Rigor |
| --- | --- |
| `phpstan.neon` | `.rigor.yml` |
| `phpstan.neon.dist` | `.rigor.dist.yml` |
| `paths:` | `paths:` |
| `level:` | `severity_profile:` |
| `excludePaths:` | （現時点で対応なし — パスは明示的にリストする） |
| `ignoreErrors:`（正規表現/パターン） | `disabled_rules:`（ルール識別子またはワイルドカード） |
| `parameters: ignoreErrors:`パスごと | ファイルヘッドの`# rigor:disable-file <rule>` |
| `includes:` | `includes:` |
| `phpstan-baseline.neon` | `rigor.baseline.json` |
| `phpstan analyse --generate-baseline` | `rigor check --format=json > rigor.baseline.json` |
| `phpstan analyse` | `rigor check` |
| `phpstan analyse --baseline` | `rigor diff rigor.baseline.json` |
| パス解決: 宣言ファイルからの相対 | パス解決: 宣言ファイルからの相対（同じルール）。 |

ベースラインのワークフローは同一。第8章にウォークスルーがある。

`includes:`のセマンティクスもPHPStanのものと一致する: 宣言順、後のものが前のものをオーバーライドし、現在のファイルのキーはincludeされたファイルより優先される。RigorのHe`.rigor.yml`は`.rigor.dist.yml`と自動マージしない — オーバーライドは`includes:`の下にdistファイルを明示的にリストしなければならない。PHPStanも`phpstan.neon`と`phpstan.neon.dist`の両方がある場合に同じ動作をする。

## スタブ ↔ RBS

PHPStanはPHPDocを提供しないライブラリにはPHPスタブファイル（`.stub`）を読む。Rigorは同じ目的のために`.rbs`ファイルを読む。ディスパッチは類似している — 両ツールとも「スタブ宣言されたコントラクトが推論ボディより優先」をレイヤリングする — そして両方ともPHPDoc/`RBS::Extended`アノテーション経由でリファインメントを付与するための正統な場所としてスタブファイルを使う。

| PHPStan | Rigor |
| --- | --- |
| `*.stub`ファイル | `sig/`（プロジェクト）と`rbs_collection.lock.yaml`（サードパーティ）の`.rbs`ファイル |
| スタブのPHPDoc | `RBS::Extended`の`%a{rigor:v1:...}`アノテーション |
| `#[Override]` / `#[\Deprecated]`属性 | RBSの`attr_*`と`def`宣言 |
| `phpstan/extension-installer` | プラグインgemのBundler + `Gemfile` |

両方の世界で機能する実践的なパターン: スタブ/RBSファイルをパブリックコントラクトの権威として保持し、スタブの隣に`@phpstan-*`/`RBS::Extended`ディレクティブを使ってプロジェクト固有の締め付けをレイヤリングする。

## 深刻度プロファイルvs PHPStanレベル

PHPStanのレベルは数値のはしご（0 = 「形状のみ」、10 = 「最も厳格」）。Rigorのプロファイルは名前付き（`lenient`、`balanced`、`strict`）。

| PHPStanのレベル | Rigorのプロファイル（大まかな対応） | 備考 |
| --- | --- | --- |
| 0 – 2 | `lenient` | ほとんどのルール → `:warning`。不確かなルールは`:info`に下げる。 |
| 3 – 6 | `balanced`（デフォルト） | ほとんどのルール → `:error`。 |
| 7 – 10 | `strict` | すべて → `:error`。`balanced`での`:warning`ルールも含む。 |

マッピングは近似 — ルールセットが1:1ではない — が実践的なアドバイスは同じ: デフォルトから始めて時間をかけて締め付けていく。第8章の「有用なワークフロー」はPHPStanのオンボーディングパターンと合致する。

## 「アノテーション不要」— そうだが、スタブは必要

PHPStanとRigorは**推論が重い仕事をする**という哲学を共有する。すべての変数をアノテートするのではなく、境界（関数シグネチャ、ライブラリスタブ）をアノテートし、推論が内側に伝播する。

PHPStanの問題はPHPDocがPHPソースと同じファイルに存在すること。Rigorの問題はRBSが`sig/`という並行ツリーに存在すること。トレードオフは知られている:

- **同一ファイルのPHPDoc**は文書を記述するコードの隣に置く — 更新しやすく、忘れにくい。
- **並行する`.rbs`**は型を気にしない開発者のためにランタイムソースをきれいに保つ — 本番メソッドへのPHPDocの混入なし。

Rigorは文化的理由（Rubyのコンパクトなソースの伝統）から並行ファイルモデルに傾いているが、`RBS::Inline`はPHPDocスタイルの隣接性を好むプロジェクトのためのファイル内代替を提供する。根拠はADR-1参照。

## PHPStanにあってRigorにないもの

- **スタブライブラリ全体にわたるバウンド付き制約のジェネリクス**。PHPStanのジェネリクスエコシステムはより成熟している。RBSのジェネリクスは存在するが標準ライブラリのカバレッジはより断片的。
- **`@phpstan-impure`とpure-by-defaultモデリング**。Rigorは組み込みの`data/builtins/ruby_core/` YAMLでメソッドごとの純粋性をカタログ化しているが、fold-throughのためにメソッドを純粋と宣言するユーザー向けの手段をまだ公開していない。
- **カスタムルール**。PHPStanの`Rule`インターフェースはASTパターンで発火するルールをPHPで書かせる。Rigorのプラグインサーフェスは`#diagnostics_for_file`経由で診断の発行をカバーするが、ルールの形状はPHPStanのフレームワークほど洗練されていない。
- **`treatPhpDocTypesAsCertain`**。PHPStanの「PHPDocを信頼する」ノブにRigorの対応物はない — RigorはRBS宣言を常に権威として信頼する。

## RigorにあってPHPStanにないもの

- **メソッド呼び出しを通じた定数folding**。PHPStanは定数伝播をいくらか行う。Rigorはカタログ化されたビルトイン（`Numeric`、`String`、`Symbol`、`Array`、`Hash`）を通じて積極的にfoldする。
- **Rubyの述語メソッドに対するファーストクラスのフロー感応型ナローイング**。`s.empty?`/`n.zero?`/`n.positive?`等は名前で認識され、それに応じてナローイングされる。PHPStanはType-Specifying Extensionsで同じアイデアを持つが、Rigorはカタログを標準で提供する。
- **`literal-string`キャリア**。両ツールともこの概念を持つが、Rigorのキャリアは補間を通じて合成される — `"#{a}#{b}"`は`a`と`b`の両方がliteral-stringなら`literal-string`になる。PHPStanには「この位置でのリテラル」としての`literal-string`があるが伝播ルールが異なる。
- **Sorbetインプットアダプター**。プロジェクトが部分的にSorbet（いくつかのファイルはRBSに移行したが残りはそのまま）の場合、Rigorは両ソースを並行して読む。PHPStanには対応するものがない — 「PHPのSorbet」に相当するものはない。

## マイグレーションvignette

PHPStanで締め付けられたライブラリをRubyに移植している。元のPHP:

```php
class Slug {
    /**
     * @phpstan-param non-empty-string $name
     * @phpstan-return non-empty-lowercase-string
     */
    public function normalise(string $name): string {
        return strtolower(preg_replace('/\s+/', '-', $name));
    }

    /**
     * @phpstan-assert non-empty-string $value
     */
    public function assertNotEmpty(string $value): void {
        if ($value === '') throw new InvalidArgumentException();
    }
}
```

Rigorの移植 — Rubyソースは慣用的なまま変更なし、境界のRBS:

```ruby
# lib/slug.rb
class Slug
  def normalise(name)
    name.downcase.gsub(/\s+/, "-")
  end

  def assert_not_empty(value)
    raise ArgumentError if value.empty?
  end
end
```

```ruby
# sig/slug.rbs
class Slug
  %a{rigor:v1:param: name is non-empty-string}
  %a{rigor:v1:return: non-empty-lowercase-string}
  def normalise: (String name) -> String

  %a{rigor:v1:assert: value is non-empty-string}
  def assert_not_empty: (String value) -> void
end
```

ディレクティブ文法は構造的に変換そのもの: すべてのPHPStanの`@phpstan-*`は`.rbs`ファイルの対応する`def`行の`%a{rigor:v1:...}`アノテーションになる。

## 次のステップ

この付録セクションの残りを順番に読む必要はおそらくない。3つの有用なポインター:

- [第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/) — このページがまとめているPHPStanマッピングテーブルを含む完全なディレクティブ文法がある。
- [第8章 — エラーの読み方](../08-understanding-errors/) — ルールカタログ、深刻度プロファイル、ベースラインdiff — すべてのPHPStanオンボーディング対応物。
- [第9章 — プラグイン](../09-plugins/) — Type-Specifying / Dynamic-Return対応物のために。

他のツールと比較したい場合は、兄弟付録ページが[TypeScript](../appendix-typescript/)、[mypy](../appendix-mypy/)、[Steep](../appendix-steep/)をカバーしている。
