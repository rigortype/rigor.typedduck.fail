---
title: "付録 — mypy / Pyrightから来た場合"
description: "Imported from rigortype/rigor docs/handbook/appendix-mypy.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-mypy.md"
sourcePath: "docs/handbook/appendix-mypy.md"
sourceSha: "07d6a38cd6ba7d8fffd45c57684bd32e2c1df5bdaca9403c83f1a0b3024506d8"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "mypy / Pyrightから来た場合"
---

静的型付けのベースラインがPythonのmypyやPyrightであれば、この付録でRigorとの語彙をマッピングする。ふたつのエコシステムは見かけ以上に多くを共有している — <ruby>漸進的型付け<rp>（</rp><rt>gradual typing</rt><rp>）</rp></ruby>、「ランタイムを壊さない」哲学、独立した型スタブファイル（`.pyi`/`.rbs`） — だが、アノテーションをどこに置くか、推論をどこまで積極的にするかで異なる選択をしている。

## 5秒ピッチ

| 問い | mypy / Pyright | Rigor |
| --- | --- | --- |
| アノテーションはどこに書くか？ | ソース内（`def f(x: int) -> str:`） | `.rb`の隣の`.rbs`ファイル |
| スタブ形式 | `.pyi`ファイル | `.rbs`ファイル |
| アノテートされていないコードのデフォルト | どこでも`Any`（mypy）/ 推論（Pyright） | 精密に推論、不明なら`Dynamic[Top]` |
| strictモード | `--strict`（mypy）/ `strict: true`（Pyright） | `severity_profile: strict` |
| 抑制 | `# type: ignore[error-code]` | `# rigor:disable <rule>` |
| 型の同一性 | 名前的 + 構造的（Protocol） | 名前的 + 構造的ファセット |
| ナローイング（narrowing） | フローセンシティブ（flow-sensitive）な型、型ガード | フローセンシティブな型、述語メソッド + RBS::Extended |

Python/Rubyの類似点は構文より深い: 両言語とも動的に生まれ、どちらも後から漸進的型付けを取り入れ、どちらも型チェックを助言的なものとして扱い、どちらも型ヒントの公式構文（Pythonの`typing`、Rubyの`RBS`）を提供する。Rigorの設計優先事項の多くはmypyが正しくやったことを反映している。

## 型語彙マッピング

| Pythonの型付け | Rigorの表現 | 備考 |
| --- | --- | --- |
| `int` | `Integer` | |
| `float` | `Float` | |
| `bool` | `bool`（`Constant<true> \| Constant<false>`） | |
| `str` | `String` | |
| `bytes` | `String`（バイナリエンコーディングを持つ） | Rubyには独立した`bytes`型がない。 |
| `None` | `Constant<nil>` | `nil`はRubyの唯一の「値なし」。 |
| `Any` | `Dynamic[Top]` | 「ここは黙っていて」キャリア（carrier）。 |
| `object` | `Object`（または`Top`） | `object`はPythonの普遍的なスーパータイプ（`None`を含むすべて）。Rigorの最も近い対応は`Top`。 |
| `Never` / `NoReturn` | `Bot` | 空の型。 |
| `Optional[T]` / `T \| None` | `T?`（すなわち`T \| nil`） | |
| `Union[A, B]` / `A \| B` | `A \| B` | 同じ表示。 |
| `Literal[42]` | `Constant<42>` | 直接対応。 |
| `Literal["foo", "bar"]` | `Constant<"foo"> \| Constant<"bar">` | |
| `Final[T]` | （対応なし） | Rigorはまだイミュータビリティを追跡しない。 |
| `tuple[int, str]` | `Tuple[Integer, String]` | 同じ位置ごとのモデル。 |
| `list[T]` | `Array[T]` | |
| `dict[K, V]` | `Hash[K, V]` | |
| `set[T]` | `Set[T]` | |
| `TypedDict` | `HashShape{...}` | required/optionalキーを持つクローズドシェイプ（shape）。 |
| `NotRequired[T]`（TypedDict） | `HashShape`内のオプショナルキー | Rigorのキーごとのrequired/optionalフラグでカバー。 |
| `Callable[[int], str]` | `^(Integer) -> String`（RBSのproc/block構文） | |
| `TypeVar('T')` | RBSの`[T]`型パラメータ | |
| `Generic[T]` | RBSの`class Foo[T]` | |
| `Protocol`（PEP 544） | RBSの`interface _Foo` | 構造的型付け（structural typing）。 |
| `runtime_checkable` Protocol | （対応なし） | Rigorは構造的プロトコルに対して`isinstance`を実行しない。 |
| `Self`（PEP 673） | RBSの`self`型 | |
| `ClassVar[T]` | シングルトン側の`attr_*` / `self.@var` | |
| `Annotated[T, "tag"]` | `RBS::Extended`の`%a{...}`アノテーション | 両者とも型にメタデータを付与する。 |

## リファインメントキャリアvs Pythonのアノテーション慣習

Pythonの型システムはリファインメント（refinement、篩型とも）形状の機能を一度に一つずつ追加してきた（`Literal`、`LiteralString`、`TypeIs`、`Annotated`）。Rigorはより広いカタログを標準で提供する。

| Rigorのリファインメント | Pythonで最も近いもの |
| --- | --- |
| `non-empty-string` | （ビルトインなし。PEP 675の`LiteralString`は精神的に近いが意味論が異なる） |
| `literal-string` | `LiteralString`（PEP 675） — ソースコードのリテラルから構築されたことが証明可能。**直接対応**。 |
| `positive-int` | （ビルトインなし。サードパーティのバリデーターで`Annotated[int, Gt(0)]`という慣習） |
| `int<min, max>` | （ビルトインなし。同じ`Annotated[int, Range(...)]`の慣習） |
| `numeric-string` | （ビルトインなし） |
| `non-empty-array[T]` | （ビルトインなし。一部のライブラリは`tuple[T, *tuple[T, ...]]`を使う） |
| `Constant<42>` | `Literal[42]` |

`LiteralString`が最も深い等価 — Pythonの`LiteralString`もRigorの`literal-string`も「この文字列はソースコードから来ており、ランタイム入力ではない」という事実を保持し、フォーマット/補間を通じて合成する。

## ナローイング — 親しみやすい部分

両チェッカーともフローセンシティブ。ナローイングのプリミティブには直接対応するものがある:

| Python | Rigor |
| --- | --- |
| `if x:` | `if x` — 真側のエッジから`False`/`None`を除去 |
| `if x is None:` | `if x.nil?` |
| `if x is not None:` | `unless x.nil?` |
| `isinstance(x, int)` | `x.is_a?(Integer)` |
| `if isinstance(x, (int, str)):` | `if x.is_a?(Integer) \|\| x.is_a?(String)` |
| `assert isinstance(x, T)` | プラグイン経由の`# rigor:assert-type`スタイル、または`rigor-sorbet`経由の`T.cast` |
| `match x: case ...`（PEP 634） | `case x; in ...`（Rubyのパターンマッチング） |
| ユーザー定義`TypeGuard[T]`（PEP 647） | `%a{rigor:v1:predicate-if-true: x is T}`ディレクティブ |
| ユーザー定義`TypeIs[T]`（PEP 742） | 同じディレクティブ — Rigorのナローイングはデフォルトで対称（truthy側とfalsey側の両方） |
| `assert x is not None; x.upper()` | 同じイディオム: `unless x.nil?; x.upcase; end` |
| `cast(int, x)` | `rigor-sorbet`経由の`T.cast(x, Integer)`、またはRBS側の`param:`ディレクティブ |

注目: Pythonの`TypeGuard`は一方向（truthy側だけをナローイング）だが、`TypeIs`（PEP 742、採択済み）は双方向。Rigorの`predicate-if-true`と`predicate-if-false`ディレクティブは独立していて合成できる — デフォルトで`predicate-if-true: x is T`を宣言するとfalsey側も`x is ~T`にナローイングされ、`TypeIs`に等価。

## スタブ ↔ RBS

Pythonの`.pyi`ファイルとRigorの`.rbs`ファイルは同じ役割を果たす: インラインで型を提供しないライブラリの型を宣言する。

| Python | Rigor |
| --- | --- |
| `.pyi`スタブ | `.rbs`ファイル |
| `typeshed`（コミュニティメンテナーのスタブ） | `rbs_collection` + Rigorの同梱stdlibカタログ |
| `mypy_path`設定 | `.rigor.yml`の`signature_paths:` |
| `py.typed`マーカー | （対応なし — Rigorは`paths:`以下の任意のファイルを確認する） |
| `from __future__ import annotations` | （対応なし — RBSはファイル分離の性質上常に遅延） |
| 型を明らかにする: `reveal_type(x)` | `dump_type(x)`（info診断）/ `assert_type("...", x)` |

`reveal_type`と`dump_type`は名前が異なる同じツール — 両者ともcall-siteで推論された型を診断として発行し、どちらも慣用的なテストハーネスではランタイムでno-opで、どちらも「チェッカーはここで何を見ているか？」を調べる正規のプローブ。

## 深刻度、抑制、「strictモード」

| Python（mypy） | Rigor |
| --- | --- |
| `--strict` | `severity_profile: strict` |
| `--strict-optional` | Rigorでは常にオン（独立したフラグなし） |
| `--no-implicit-optional` | Rigorでは常にオン |
| `--check-untyped-defs` | Rigorでは常にオン |
| `--disallow-untyped-defs` | （対応なし — Rigorはアノテーションを要求しない） |
| `--disallow-any-explicit` | （対応なし） |
| `# type: ignore` | `# rigor:disable all` |
| `# type: ignore[error-code]` | `# rigor:disable <rule>` |
| `# mypy: ignore-errors`（ファイルスコープ） | `# rigor:disable-file all` |
| `mypy.ini` / `pyproject.toml` | `.rigor.yml` / `.rigor.dist.yml` |

概念的なギャップ: mypyの`--disallow-untyped-defs`はアノテーションがどこにでも存在すべきというベースライン前提を反映している。Rigorはアノテーションを要求しない — 推論が常に最初の答えであり、RBSはエスケープハッチ。これにより採用がスムーズになる: 「このモジュール全体をアノテートするまでmypyは役に立たない」という段階がない。

## Pyright vs Rigor

Pyright（MicrosoftのTypeScript型チェッカー、Pylanceのエンジン）はmypyよりRigorに精神的に近い — 両者ともアノテーションの完全性より推論の深さと実用的なナローイングを優先する。

| Pyright | Rigor |
| --- | --- |
| `# pyright: ignore[reportError]` | `# rigor:disable <rule>` |
| `pyright --stats` | （直接対応なし — `rigor check --explain`は漸進的フォールバックの決定を示す） |
| ボディからの推論された戻り値型 | 同様 — `def`ボディが辿られ推論された戻りが伝播する |
| 投機的推論（Pyrightは高速） | Rigorの型オブジェクトはイミュータブルな共有構造。キャッシュ駆動の再計算はインクリメンタル |
| ファイルレベルでのstrict / basic / offの設定 | `severity_profile:`はプロジェクト全体。ファイルごとは`# rigor:disable-file`で |

Pyrightの「積極的に推論し、ナローイング」というオーサリングループを使ったことがあれば、Rigorは親しみやすい。最大の調整はRigorのアノテーションが`.rb`ソースではなく`.rbs`ファイルに存在することだ。

## 「アノテーション不要」— ここでも本当

典型的なmypyのオンボーディング例:

```python
def classify(n: int) -> Literal["zero", "positive", "negative"]:
    if n == 0:
        return "zero"
    if n > 0:
        return "positive"
    return "negative"

result = classify(7)
# mypy: result: Literal['zero', 'positive', 'negative']
```

Rigorで対応するコード — アノテーションなし:

```ruby
def classify(n)
  return :zero     if n.zero?
  return :positive if n.positive?
  :negative
end

result = classify(7)
```

同じ精度。片方はパラメータとreturnのアノテーションを書くが、もう片方は書かない。

sigが必要なとき — パブリックライブラリ境界のため、パラメータバリデーションのため、`def.return-type-mismatch`を発火させたいとき — それは`.rb`ソースではなく`sig/<file>.rbs`に書く。

## ジェネリクス

両エコシステムともジェネリクスを持つ。Rigorのものはより保守的なRBSのもの。

| Python | Rigor（RBS経由） |
| --- | --- |
| `T = TypeVar('T')` | メソッドまたはクラス名の後の`[T]` |
| `def first(xs: list[T]) -> T` | `def first: [T] (Array[T]) -> T` |
| `Generic[T]`クラス | `class Foo[T]` |
| `T = TypeVar('T', bound=Comparable)` | `[T < Comparable]`（RBSのバウンド付き型パラメータ） |
| `ParamSpec` | （現時点で対応なし） |
| `TypeVarTuple` | （現時点で対応なし） |
| `Concatenate[X, P]` | （現時点で対応なし） |

Rigorのジェネリクスカバレッジはより保守的なRBSのものと一致するが、一般的なケース（コレクション、ジェネリックコンテナへのメソッド、クラスレベル型パラメータ）はカバーしている。

## Protocol ↔ RBSインターフェース

PythonのPEP 544は`Protocol`による構造的型付けを導入した。RubyのRBSは最初のリリース以来構造的な`interface _Foo`を持っている。

```python
class SupportsClose(Protocol):
    def close(self) -> None: ...
```

```ruby
interface _SupportsClose
  def close: () -> void
end
```

`close`を定義するクラス（正しいシグネチャで）は両方を満たす。どちらのシステムもクラスに継承を宣言することを要求しない — 構造的なマッチは暗黙的。

Rigorは`sig/`からRBSインターフェースを読む。RBS宣言されたパラメータが`_SupportsClose`の場合、Rigorはmypy/Pyrightが`Protocol`に対してチェックするのと同じように、call-siteの引数を構造的にチェックする。

Pythonから持ち越した注意点をひとつ: Rigorにおいて「protocol」はこれを**意味しない**。構造的型付け（structural typing）の概念はRBSの`interface`であり、「protocol」は別の、プラグインが宣言する機能（パススコープの振る舞い契約）のために予約されている。[プロトコルと構造的型付けの付録](appendix-protocols-and-structural-typing.md)がこの区別を詳しく解説する。

## mypy / PyrightにあってRigorにないもの

- **TypeVarへの分散アノテーション**。`TypeVar('T', covariant=True)`。Rigorは標準ライブラリに基づくRBSの分散に依拠する。ユーザー側での分散オーサリングはない。
- **`Final` / イミュータビリティ追跡**。Rigorは「この名前は再代入されない」をまだモデル化しない。
- **`@overload`スタック**。RBSはメソッドオーバーロードをサポートするが、Rigorのアナライザーのディスパッチロジックはmypyのパターンベースのオーバーロード解決より保守的。
- **デコレーター対応の型変換**。Pythonの型エコシステムは関数の型を変換するデコレーターのサポートが発達している。Rubyの対応物は少なく、Rigorは`Module#prepend`/`define_method`変換をまだモデル化しない。
- **`async`/`await`型**。RubyにはFiberとAsyncがあるが、非同期型のRBSサーフェス（surface）はPythonの`Coroutine[T, U, V]`より断片的。

## Rigorにあってmypy / Pyrightにないもの

- **メソッド呼び出しを通じた定数folding**。mypyもPyrightもリテラルをfoldするが、どちらも任意のビルトインメソッドを通じたfoldはしない。Rigorは`Numeric`、`String`、`Symbol`、`Array`、`Hash`上のカタログ化された純粋メソッドのセットを通じてfoldする。
- **自動ナローイングを持つファーストクラスのリファインメントキャリア**。`non-empty-string`、`positive-int`、`numeric-string`、`int<min, max>` — 述語で制限された値が対応するRubyの述語メソッドでナローイングされる。
- **false-positiveなしのスタンス**。mypyは`--no-warn-unused-ignores`や`--ignore-missing-imports`を設定しない限り動的コードについて警告する。Rigorは設定なしで`Dynamic[Top]`には沈黙する。
- **引数シェイプによる戻り値型変化のプラグインサイド**。Pyrightの「型エイリアスナローイング」とmypyのオーバーロードスタックがいくつかのケースをカバーする。Rigorのプラグイン契約（contract）はディスパッチポイントで完全なRubyコードを提供する。[`rigor-lisp-eval`](../../examples/rigor-lisp-eval/)の例が標準デモ — `Lisp.eval([:+, 1, 2])`は`Integer`を返し、`Lisp.eval([:<, 1, 2])`は`bool`を返す。

## マイグレーションvignette

mypy-tightenedなPythonモジュールをRubyに移植している。元のコード:

```python
def classify_input(s: str) -> Literal["empty", "numeric", "text"]:
    if not s:
        return "empty"
    if s.isdigit():
        return "numeric"
    return "text"

def shout(s: str) -> str:
    assert s, "expected non-empty"
    return s.upper()
```

Rigorの移植:

```ruby
# lib/text_utils.rb
def classify_input(s)
  return :empty   if s.empty?
  return :numeric if s.match?(/\A\d+\z/)
  :text
end

def shout(s)
  raise ArgumentError if s.empty?
  s.upcase
end
```

```ruby
# sig/text_utils.rbs
%a{rigor:v1:return: Constant<:empty> | Constant<:numeric> | Constant<:text>}
def classify_input: (String s) -> Symbol

%a{rigor:v1:param: s is non-empty-string}
def shout: (String s) -> non-empty-string
```

得られるもの: `s.empty?`は認識されたリファインメントナローワー（`assert s`は不要）。`match?(/\A\d+\z/)`はまだ`numeric-string`にナローイングしない（v0.1.1のロードマップにある — [`docs/ROADMAP.md`](../../roadmap/)参照）が、最終的な動作はPyrightでの`s.isdigit()`ナローイングを反映する。

## 次のステップ

この付録セクションの残りを順番に読む必要はおそらくない。3つの有用なポインタ:

- [第2章 — 日常的に出会う型](../02-everyday-types/) — リファインメント語彙が新しければキャリアの種類を確認する。
- [第3章 — ナローイング](../03-narrowing/) — フローセンシティブなルール — mypyのナローイングの直接対応物。
- [第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/) — ディレクティブ文法 — `predicate-if-true`はRigorの`TypeGuard`/`TypeIs`。

他のツールと比較したい場合は、兄弟付録ページが[TypeScript](../appendix-typescript/)、[PHPStan](../appendix-phpstan/)、[Steep](../appendix-steep/)、[TypeProf](../appendix-typeprof/)、[Java / C#](../appendix-java-csharp/)、[Rust](../appendix-rust/)、[Go](../appendix-go/)、[Elixir](../appendix-elixir/)をカバーしている。
