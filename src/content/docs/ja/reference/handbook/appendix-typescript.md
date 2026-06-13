---
title: "付録 — TypeScriptから来た場合"
description: "Imported from rigortype/rigor docs/handbook/appendix-typescript.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-typescript.md"
sourcePath: "docs/handbook/appendix-typescript.md"
sourceSha: "62af4bf04bbe9fe5b5429d20227d5e556e2ffc757e03d6a7d3e005647de7fe6a"
sourceCommit: "106b93dd777b71aeef323dce1e4087c226c8ce37"
translationStatus: "translated"
sidebar:
  order: 1050
  label: "TypeScriptから来た場合"
---

静的型チェッカーを見て「ああ、TypeScriptみたいなものか」と感じるなら、この付録でRigorの語彙をすでに知っているTypeScriptの概念にマッピングする。「TypeScriptは分かる」から「Rigorも分かる」への最短経路。

このページはチュートリアルではない。変換テーブルと、ふたつのシステムが本質的に異なる選択をしている箇所の簡単な考察だ — そこがTypeScriptで身についた反射的な理解の邪魔をする場所になる。

## 5秒ピッチ

| 問い | TypeScript | Rigor |
| --- | --- | --- |
| アノテーションはどこに書くか？ | ソース内（`x: number`） | `.rb`の隣の`.rbs`ファイル |
| 誰が書くか？ | コードの作者 | 作者OR推論 |
| デフォルトは？ | `any`（TypeScript pre-strict）/ `unknown`（strict） | 精密に推論、不明なら`Dynamic[Top]` |
| 型の同一性 | 構造的 | 名前的 + 構造的ファセット |
| 「まだ分からない」のコスト | アノテーションするまで赤い波線 | 沈黙 — `Dynamic[Top]`は診断を出さない |
| 診断が出るタイミング | 型が不健全なとき | Rigorが不健全さを**証明できる**ときだけ |

ふたつのシステムは目標を共有する — プログラムを実行する前にバグを見つける — が、そこへの道筋で意見が分かれる。TypeScriptは健全性（soundness）優先のオーサリングを好む（すべての値が検査された型を持ち、そうなるまでチェッカーが文句を言う）。Rigorはfalse-positiveなし推論を好む（証明できないものには沈黙し、推論が見通せない箇所でだけ`.rbs`を求める）。

## 型語彙マッピング

| TypeScriptの形式 | Rigorの形式 | 備考 |
| --- | --- | --- |
| `string` | `String` | 表示では`Nominal[]`を省略。 |
| `number` | `Integer` / `Float` / `Numeric` | TSはintとfloatを同一視。Rigorはrubyのランタイムに従って分ける。 |
| `boolean` | `bool`（`Constant<true> \| Constant<false>`） | `bool`は構造的にふたつの定数のunion。 |
| `null` | `nil`（`Constant<nil>`） | Rubyには`nil`のみ。TSは`null`と`undefined`を区別する。 |
| `undefined` | （対応なし） | Rubyで未設定のローカル変数は「undefined」ではなく`NameError`になる。 |
| `any` | `Dynamic[Top]` | 「ここは黙っていて」キャリア（carrier）。 |
| `unknown` | `Top` | 両者ともナローイング（narrowing）するまでメソッドディスパッチを拒否。`unknown`は`Dynamic[Top]`より`Top`に近い。 |
| `never` | `Bot` | 空の型 — 要素なし。到達不可能な分岐と`T.absurd`（Sorbet）/ raiseのみのボディに使う。 |
| `void` | `void` | 同じ考え方 — 呼び出し元は値を消費してはならない。 |
| `T \| U` | `T \| U` | 同形式。同じ表示。 |
| `T & U` | `Intersection[T, U]` | Rigorではあまり一般的でない — リファインメント（refinement、篩型とも）で代替されることが多い。 |
| `"hello"`（リテラル型） | `Constant<"hello">` | 直接対応。Rigorではfoldingがより積極的。 |
| `42`（リテラル型） | `Constant<42>` | 同様。 |
| `42 \| 43 \| 44` | `Constant<42> \| Constant<43> \| Constant<44>` | 同様。 |
| `[number, string]`（タプル） | `Tuple[Integer, String]` | 同じ位置ごとのモデル。 |
| `{ name: string; age: number }` | `HashShape{name: String, age: Integer}` | 同じキーごとのモデル。RubyはSymbolキーを慣習的に使う。 |
| `Array<T>` / `T[]` | `Array[T]` | 同様。 |
| `Record<K, V>` | `Hash[K, V]` | 同様。 |
| `Readonly<T>` | `readonly_of[T]`（オプトインの[`rigor-typescript-utility-types`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-typescript-utility-types/)プラグイン経由） | `HashShape`の各エントリーに対するビュー層の読み取り専用マーカー。基底オブジェクトが凍結されていることを証明する**ものではない** — ADR-13 §「Readonly」。 |
| `Partial<T>` / `Required<T>` | `partial_of[T]` / `required_of[T]`（同じプラグイン） | `HashShape`の各エントリーの必須性を反転させる。`Partial`は値型を`nil`に**広げない** — Rigorの`HashShape`は「キーが存在しない」と「キーは存在し値が`nil`」を区別する（ADR-13の必須性反転に関するWDを参照）。 |
| `Pick<T, K>` / `Omit<T, K>` | `pick_of[T, K]` / `omit_of[T, K]`（同じプラグイン） | リテラルキーユニオンで`HashShape`のエントリーを制限/削除する。Tupleレシーバーは整数インデックスで射影。非シェイプ（shape）キャリアは保守的に縮退し、`dynamic.shape.lossy-projection`を発火する。 |
| 条件型`T extends U ? A : B` | （コアにはない。プラグインの提供で） | プラグインは引数のシェイプによって戻り型を変えられる。 |
| `keyof T` | （なし） | `HashShape`は内部的にキーセットを公開するが型演算子としては公開しない。 |
| `T['k']` | `T[k]`インデックスアクセス | Rigorは`HashShape`と`Tuple`のリテラルインデックスアクセスをサポートする（型仕様を参照）。 |
| テンプレートリテラル型 | `literal-string`キャリア | 「証明可能なリテラルから構築された」— 第2章参照。 |

## ナローイング — 親しみやすい部分

TypeScriptのフローセンシティブ（flow-sensitive）なナローイングはRigorに直接対応するものがある。語彙は異なるが、動作は同じ。

| TypeScript | Rigor |
| --- | --- |
| `if (x)` | `if x` — 真側のエッジから`false`/`nil`を除去 |
| `typeof x === "string"` | `x.is_a?(String)` |
| `x instanceof Foo` | `x.is_a?(Foo)` |
| `x === null` | `x.nil?`（および`x == nil`） |
| `if (x !== null && x !== undefined)` | `if x`（Rubyには`nil`のみで`undefined`はない） |
| 判別共用体`switch (x.kind)` | `case x; in {kind: :foo}`または`case x.kind; when :foo` |
| ユーザー定義型ガード`function isFoo(x): x is Foo` | `%a{rigor:v1:predicate-if-true: x is Foo}`ディレクティブ |
| `as`キャスト | （コード内に対応なし） — Rigorは`rigor-sorbet`経由で`T.cast`、または`param:`ディレクティブを使用 |
| `x!`（非nullアサーション） | （コード内に対応なし） — `rigor-sorbet`経由で`T.must`、または`unless x.nil?`ナローイング |
| `as const` | 定数は自動的にfoldされる — `as const`は不要 |

最大の実践的な違い: TypeScriptでは、チェッカーが同意しないときはいつでも`as Foo`に手が伸びる。Rigorにはソース内キャストがない。対応する方法は:

1. **ガードを追加する**。`unless x.nil?; x.upcase; end`が慣用的な手法。
2. **`.rbs`を絞り込む**。問題の根本は大抵、ゆるすぎるライブラリのsig。
3. **`rigor-sorbet`プラグインを使う**。ソース内アサーションが必要なら`T.let`/`T.cast`/`T.must`を採用する。第10章参照。

## リファインメントキャリア — TypeScriptにない部分

TypeScriptは「長さ≥1の文字列」をテンプレートリテラル型かブランド型でしか表現できず、どちらも合成しにくい。Rigorにはファーストクラスのリファインメントキャリアがある — 証明可能な非空文字列、証明可能な正の整数、証明可能な非空配列。

| Rigorのリファインメント | TypeScriptで最も近いもの | コメント |
| --- | --- | --- |
| `non-empty-string` | `` `${string}${string}` ``（テンプレートリテラルのトリック）またはブランドの`NonEmptyString` | TSでは不格好。Rigorは`unless s.empty?`から自動的に生成する。 |
| `positive-int` | ブランドの`PositiveInt` | TSユーザーはブランドをスキップしがち。Rigorは`n > 0`からナローイングする。 |
| `int<1, 9>` | リテラル型のunion `1 \| 2 \| 3 \| ... \| 9` | Rigorのレンジキャリアは爆発なしに任意のバウンドを扱う。 |
| `numeric-string` | （実用的なものなし） | TSに対応なし。Rigorは数値パターンへの正規表現マッチからナローイングする。 |
| `non-empty-array[T]` | `[T, ...T[]]`（タプル+残余） | TSにもエンコーディングはあるが使うAPIが少ない。Rigorは`unless arr.empty?`から生成する。 |

TypeScriptに`non-empty-string`がキーワードとして欲しかったことがあるなら、Rigorのこの部分を気に入るだろう。

## 「アノテーション不要」の実際

典型的なTypeScriptのオンボーディング例:

```typescript
function classify(n: number): "zero" | "positive" | "negative" {
  if (n === 0) return "zero";
  if (n > 0) return "positive";
  return "negative";
}

const result = classify(7);
// TypeScript: result: "zero" | "positive" | "negative"
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

両チェッカーとも同じ正確なunionを推論する。TypeScriptバージョンはパラメータ型と戻り型のオーサードアノテーションが必要だが、Rigorバージョンはどちらも不要。

sigを書く必要があるとき — モジュール境界で、ボディが動的すぎるとき、パラメータシェイプを強制したいとき — それは`.rb`ソースではなく`sig/<file>.rbs`に書く。この分離は意図的なもの（ADR-1とADR-5を参照）。

## ジェネリクス

TypeScriptのジェネリクスは標準ライブラリの中心。Rigorのジェネリクスはより保守的なRBSのもの。RBSはクラスレベルの型パラメータとバウンド付き制約のメソッドレベル型パラメータをサポートするが、TypeScriptほど定型的なcall-site推論インスタンス化はまだサポートしていない。

| TypeScript | Rigor（RBS経由） |
| --- | --- |
| `function id<T>(x: T): T` | `def id: [T] (T) -> T` |
| `Array<T>` | `Array[T]` |
| `Map<K, V>` | `Hash[K, V]` |
| `Promise<T>` | （対応なし — Rubyにビルトインのpromiseはない） |
| `Pick<T, K>` / `Omit<T, K>` / `Partial<T>` / `Required<T>` / `Readonly<T>` | オプトインの[`rigor-typescript-utility-types`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-typescript-utility-types/)プラグインが、`HashShape`上の`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`（および`Tuple`上の`pick_of` / `omit_of`）に各々をマップする。 |
| 条件型 | （対応なし — プラグインが必要） |

RigorはRBSジェネリクスをディスパッチャー経由で読み込み、レシーバーが十分な情報を持つcall-siteでパラメータをインスタンス化する。表示はRBSと同じ — `Array[Integer]`は`Array[Integer]`と表示される。

## Null可能性

TypeScriptの`strictNullChecks`は`null`と`undefined`を独自の型にする。null可能は`T | null | undefined`と書く。

Rubyには`nil`しかない。RBSの省略形は`T?`で、`T | nil`に展開される。Rigorのナローイングは`nil`をTypeScriptが`null`を扱うのと全く同じように処理する:

```ruby
def length(s)              # s: String?  (RBS宣言)
  return 0 if s.nil?
  s.length                 # s: String — .nil?チェックでnilが除去された
end
```

TypeScriptで対応するコードはほぼ同じ:

```typescript
function length(s: string | null): number {
  if (s === null) return 0;
  return s.length;
}
```

## 深刻度、抑制、「strictモード」

| TypeScript | Rigor |
| --- | --- |
| `tsconfig.json`の`strict: true` | `severity_profile: strict` |
| `tsconfig.json`の`noImplicitAny` | （対応なし — Rigorはアノテーションを要求しない） |
| `tsconfig.json`の`strictNullChecks` | Rigorでは常にオン |
| `// @ts-ignore` | `# rigor:disable <rule>` |
| `// @ts-expect-error` | （現時点で対応なし） |
| `// @ts-nocheck` | `# rigor:disable-file all` |
| `tsc --noEmit` | `rigor check lib` |

## TypeScriptにあってRigorにないもの

手放すものを正直に認識しておく:

- **条件型**。`T extends U ? A : B`にコアのRigorの対応物はない。プラグインは引数のシェイプによって戻り型を変えられる（第9章参照）が、型レベルの式ではなくRubyコードで記述する。
- **マップ型**。`Pick`、`Omit`、`Partial`、`Required`、`Readonly`は、オプトインのプラグイン提供語彙として[`rigor-typescript-utility-types`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-typescript-utility-types/)経由で提供される。これらは、`HashShape`上のRigor正準シェイプ射影型関数`pick_of` / `omit_of` / `partial_of` / `required_of` / `readonly_of`（および`Tuple`上の`pick_of` / `omit_of`）にマップされる。テンプレートリテラル操作やその他のマップ型バリアント（`Uppercase<S>` / `Lowercase<S>` / `Capitalize<S>`）はRigorの表面の外にとどまる。
- **型レベルの計算**。TypeScriptの型システムはチューリング完全。Rigorのものは意図的にそうではない。これは制限ではなく特徴 — アナライザーは実際のRubyプロジェクトで高速でなければならない。
- **ソース内メソッドボディからの推論された戻り型**。`tsc`は関数ボディから戻り型を推論し、呼び出し元に公開する。Rigorはソース内`def`に対して同じことをするが、RBS宣言されたメソッドは宣言された戻りに呼び出し元をバインドする — 意図的な境界<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>の選択（ADR-5、堅牢性の原則を参照）。
- **エディタIntelliSenseの同等性**。TypeScriptのツールには20年の投資がある。Rigorのエディタ統合は若い。現在のアナライザーは診断と`rigor type-of`を提供し、LSP経由のエディタ統合はロードマップにある。

## RigorにあってTypeScriptにないもの

逆方向も:

- **ファーストクラスのリファインメント**。`non-empty-string`、`positive-int`、`numeric-string`等 — 述語で制限された値が自動的にナローイングされる。
- **メソッド呼び出しを通じた定数folding**。`"foo".upcase`は`String`ではなく`Constant<"FOO">`。Rigorはどのビルトインメソッドが純粋かをカタログ化し、それらを通じてfoldする。
- **false-positiveなしのスタンス**。Rigorは`Dynamic[Top]`レシーバーには診断を出さずに沈黙する。「まあ、技術的にはチェッカーには分からない」が正解となる診断は決して出ない。
- **アノテーション税なし**。`.rbs`ファイルがゼロのRubyプロジェクトで`rigor check`を実行でき、推論だけから有用な診断を得られる。`.rbs`ファイルの追加は段階的。スキップしたファイルは境界での診断ではなく`Dynamic[Top]`になる。
- **深刻度を意識した採用**。TypeScriptの「all-or-nothing」感（`strict`をflipすると千のエラーが現れる）は、Rigorの`lenient`/`balanced`/`strict`プロファイルとルールごとのオーバーライドとベースラインdiffによって平滑化される。

## マイグレーションvignette

TypeScriptのモジュールをRubyに移植している。元の関数:

```typescript
function pick<K extends keyof T, T extends object>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}
```

Rigorのアプローチ:

```ruby
# lib/utils.rb
def pick(obj, keys)
  keys.each_with_object({}) do |k, out|
    out[k] = obj[k] if obj.key?(k)
  end
end
```

```ruby
# sig/utils.rbs
def pick: [K, V] (Hash[K, V] obj, Array[K] keys) -> Hash[K, V]
```

RBSシグはジェネリックなままになる。`Pick<T, K>`の正確なキーセット追跡を取り戻したい場合は、[`rigor-typescript-utility-types`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-typescript-utility-types/)プラグインをオプトインし、戻り値型を`Pick`の綴りで注釈する:

```rbs
# sig/utils.rbs
%a{rigor:v1:return: Pick[T, K]}
def pick: [K, V] (Hash[K, V] obj, Array[K] keys) -> Hash[K, V]
```

プラグインの`TypeNodeResolver`が`Pick[T, K]`を正準の`pick_of[T, K]`射影に変換する。どちらの場合でも、本当に重要なところでは呼び出しサイトは精密なまま — 呼び出しサイトのHashリテラルはシグネチャによらず`HashShape`であり、キーごとの型は`obj.key?(k)`のナローイングを通じて保たれる。

## 次のステップ

この付録セクションの残りを順番に読む必要はおそらくない。3つの有用なポインタ:

- [第2章 — 日常的に出会う型](../02-everyday-types/) — リファインメントを見たことがない場合のキャリアの種類。
- [第7章 — RBSと`RBS::Extended`](../07-rbs-and-extended/) — ディレクティブ文法（カスタム型述語をRigorに教える方法）。
- [第10章 — Sorbetとの共存](../10-sorbet/) — プロジェクトが実際にSorbetをすでに使っている場合。`T.let`、`T.cast`、`T.must`に直接対応するものがあり、ゼロから始めるよりスムーズに移行できる。

他のツールと比較したい場合は、兄弟付録ページが[PHPStan](../appendix-phpstan/)、[mypy](../appendix-mypy/)、[Steep](../appendix-steep/)、[TypeProf](../appendix-typeprof/)、[Java / C#](../appendix-java-csharp/)、[Rust](../appendix-rust/)、[Go](../appendix-go/)、[Elixir](../appendix-elixir/)をカバーしている。
