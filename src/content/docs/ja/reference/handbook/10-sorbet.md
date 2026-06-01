---
title: "Sorbetとの共存"
description: "rigortype/rigor docs/handbook/10-sorbet.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/10-sorbet.md"
sourcePath: "docs/handbook/10-sorbet.md"
sourceSha: "fe9efcecb2f50ba99bd4fc768aa4cc9df303084caa0801cb7115e1f36b78562d"
sourceCommit: "203008e9741e8ffd61448e32cf9b89c19f1339da"
translationStatus: "translated"
sidebar:
  order: 1010
---

プロジェクトがすでに[Sorbet](https://sorbet.org/)を使っているなら、[`rigor-sorbet`](../../plugins/rigor-sorbet/)プラグインを使えば、RigorがSorbetの既存の`sig`ブロック、RBIファイル、`T.let` / `T.cast` / `T.must` / `T.unsafe`アサーションを型ソースとして読み取れます。`rigor check`を`srb tc`と並行して実行するために、何もRBSに書き直す必要はありません。

この章はSorbetを使用しているプロジェクトから来たユーザー向けです。Sorbetを使ったことがなければ、スキップしてかまいません。第1〜9章のコアハンドブックがRigorのネイティブなRBSベースのパスをカバーしています。

## 何が翻訳されるか

`sig`ブロックが前置されたメソッドがある場合:

```ruby
class Slug
  extend T::Sig

  sig { params(name: String).returns(String) }
  def normalise(name)
    name.downcase.gsub(/\s+/, "-")
  end

  sig { returns(Integer) }
  def self.default_length
    32
  end
end
```

Rigorはすべてのコールサイトで解析されたsigを取り上げ、チェーンされたコールが解析器の通常のディスパッチを通じて解決されます:

```ruby
slug = Slug.new
slug.normalise("Alice").upcase  # ✓ String#upcaseが解決される
Slug.default_length.even?       # ✓ Integer#even?が解決される
```

`.rbs`ファイルは不要です。プラグインは`paths:`以下のすべてのRubyファイル（および`sorbet/rbi/`以下のすべての`.rbi`ファイル——以下の「RBIファイル」参照）を辿り、各`sig { ... }`ブロックをその直後の`def`とペアにし、マッチするコールサイトで戻り型を貢献します。

## Sorbetの型語彙

プラグインはSorbetの型DSLの密な中核を翻訳します。日常的なsigのほとんどは正確に着地します。稀なまたはクラス内省が多い形式は`Dynamic[Top]`に降格します。

| Sorbet形式 | Rigorの表現 |
| --- | --- |
| `Integer`など | `Nominal["Integer"]` |
| `::Foo::Bar` | `Nominal["Foo::Bar"]` |
| `T.untyped` | `Dynamic[Top]` |
| `T.anything` | `Top` |
| `T.noreturn` | `Bot` |
| `T.nilable(X)` | `Union[X, Constant<nil>]` |
| `T.any(A, B, ...)` | `Union[A, B, ...]` |
| `T.all(A, B, ...)` | `Intersection[A, B, ...]` |
| `T::Boolean` | `Union[Constant<true>, Constant<false>]` |
| `T::Array[E]` | `Nominal["Array", [E]]` |
| `T::Hash[K, V]` | `Nominal["Hash", [K, V]]` |
| `T::Set[E]` | `Nominal["Set", [E]]` |
| `T::Range[E]` | `Nominal["Range", [E]]` |
| `T::Enumerable[E]` | `Nominal["Enumerable", [E]]` |
| `T::Class[T]` | `Singleton[T-class-name]`（損失あり） |
| `T.class_of(C)` | `Singleton[C]` |
| `[A, B]`（sig内のタプル） | `Tuple[A, B]` |
| `{a: A, b: B}` | `HashShape{a: A, b: B}`（クローズド） |

このテーブル外のもの——`T.proc`、`T.attached_class`、`T.self_type`、`T.type_parameter`、`T::Struct` / `T::Enum`サブクラス——は現在のところ`Dynamic[Top]`にサイレントで降格します。

## インライン型アサーション

Sorbetの`T.let` / `T.cast` / `T.must` / `T.unsafe`式は`sig`ブロック内だけでなく、すべてのコールサイトで認識されます:

```ruby
counter = T.let(0, Integer)        # Constant<0>をIntegerに拡大
counter.even?                       # ✓ Integer#even?が解決される

T.cast(some_value, String).upcase   # ✓ String#upcaseが解決される

maybe = T.let(nil, T.nilable(Integer))
T.must(maybe).bit_length            # ✓ nilを除去 → Integer
                                     #   その後Integer#bit_lengthが解決される

T.unsafe(opaque).any_method_at_all  # ✓ サイレント — 戻りはDynamic[Top]
```

`T.must_because(expr, "explanation")`は`T.must`のエイリアスとして認識されます——静的挙動は同じ（`nil`を除去）で、第2引数の文字列は情報目的のみです。

`T.reveal_type(expr)`はランタイムで`expr`をそのまま返し、コールサイトで`plugin.sorbet.reveal-type` `:info`診断として推論された静的型を表面化します。コールがチェーンされても機能しつつ、解析器が何を見ているかを確認できます:

```ruby
n = T.let(3, Integer)
T.reveal_type(n).even?  # info: T.reveal_type inferred type: Integer
                        # ✓ Integer#even?は引き続き解決される
```

`T.assert_type!(expr, T)`は`T.cast`に静的部分型（subtype）チェックを加えたものです。コールはアサートされた型を返すのでチェーンされたコールはそれを通じて解決されます。推論された型が証明可能に非互換（`Inference::Acceptance.accepts(...)`が`:no`を返す）の場合、プラグインは`plugin.sorbet.assert-type-mismatch`を`:error`として発行します。漸進的（gradual）一貫性ルールが適用されます——`Dynamic[top]`推論型と`:maybe`互換のシェイプ（shape）は、ランタイムチェックがカバーするためサイレントになります。

```ruby
T.assert_type!("hello", Integer)  # error: 証明可能に非互換
T.assert_type!(some_obj, String)  # silent: ユーザーを信頼
```

`T.bind(self, T)`は現在のスコープ（通常はブロック本体）の残り部分に対して`self`を`T`に絞り込みます:

```ruby
arr.each do |x|
  T.bind(self, MyHelper)
  do_something(x)  # ✓ selfはこのブロックの残りでMyHelper
end
```

絞り込みはエンジンのプラグイン側`post_return_facts`配線で実装されます——将来のPHPStanスタイルのType-Specifying Extensionプラグインがカスタムアサーションコール後に引数変数を絞り込むために使うのと同じ基板です。

`T.bind`は非`self`の第1引数をサイレントで拒否します（Sorbetの契約（contract）に一致——bindはself専用）。

## RBIファイル

プラグインはデフォルトで`sorbet/rbi/**/*.rbi`を再帰的に辿り、各`.rbi`をRubyソースとして扱います。標準のTapiocaサブディレクトリ（`gems/`、`annotations/`、`dsl/`、`shims/`）はすべて、親ルートに再帰する副作用として参加します。`.rigor.yml`の`config.rbi_paths:`で場所をオーバーライドするか、`[]`に設定してオプトアウトできます:

```yaml
plugins:
  - gem: rigor-sorbet
    config:
      rbi_paths: []                              # RBIローディングを無効化
      # rbi_paths: ["sorbet/rbi", "vendor/rbi"]  # ベンダーツリーを追加
```

プロジェクトsig（`paths:`以下の`.rb`ファイル）とRBI sig（`rbi_paths:`以下の`.rbi`ファイル）は同じ実行ごとのカタログにフィードされるため、どちらのソースで宣言されたメソッドもコールサイトで同じように解決されます。

## `# typed:`シジル

プラグインは各ファイルの先頭からSorbetの`# typed:`マジックコメントを読み取ります。挙動は`enforce_sigil`設定ノブ（デフォルト`true`）に依存します:

| シジル | `enforce_sigil: true`（デフォルト） | `enforce_sigil: false` |
| --- | --- | --- |
| `# typed: ignore` | 完全にスキップ; sigsもパースエラーも記録されない。 | 同上。 |
| シジルなし / `false` | パースエラー診断のために辿られるが、sigsは記録されない。 | Sigsが記録される。 |
| `# typed: true`以上 | Sigsが記録される。 | Sigsが記録される。 |

デフォルトはSorbet自身の契約を反映します: `# typed: false`では型が強制されないので、Rigorもそれらのファイルからの絞り込みを表面化しません。`enforce_sigil: false`をプラグイン設定で設定することで、ゲート前の挙動にオプトイン（シジルに関係なく、解析可能なすべてのファイルのsigsがカタログに着地する）できます。

**アサーション認識器**（`T.let`、`T.cast`、`T.must`、`T.must_because`、`T.unsafe`、`T.reveal_type`、`T.assert_type!`、`T.bind`）は`enforce_sigil`でゲートされません。ユーザーはそれらのコールを意図的に書いており、ファイルのシジルに関係なく発火します。

Sorbet strictの「すべてのメソッドにsigが必要」という要件と、strong-modeの`T.untyped`拒否は意図的に反映されていません。それらのチェックは`srb tc`にあります。Rigor自身の`.rigor.yml`の`severity_profile`設定が類似のフィルタリングをカバーします。

## Tapioca DSL — ミックスインパターン

TapiocaのstanderdなDSL RBI形式は、ホストクラスに`include` / `extend`される生成モジュールにsigsを宣言します:

```rbi
class Post
  include GeneratedAttributeMethods
  module GeneratedAttributeMethods
    sig { returns(::String) }
    def body; end
  end
end
```

プラグインは辿り中にモジュールの修飾名の下にsigを記録し、ルックアップ時にホストクラスに引き上げます。つまり`post.body`は`Post::GeneratedAttributeMethods#body`を通じて正しく解決されます——手動のフラット化は不要で、`sorbet/rbi/shims/`の手書きシムとrbi-centralのコミュニティアノテーションにも同じトリックが機能します。

`extend M`はMのインスタンスメソッドをextendするクラスのシングルトン側に正しく引き上げ、Rubyのランタイム挙動に一致します:

```rbi
class Post
  extend GeneratedClassMethods
  module GeneratedClassMethods
    sig { params(id: Integer).returns(Post) }
    def find(id); end
  end
end
```

`Post.find(42)`はextendされたモジュールのインスタンス側を通じて解決されます。

## `T.absurd`網羅性

`T.absurd(x)`はcase/when網羅性のSorbetのイディオムです:「ここに来たなら、型システムが道を見失っている。」プラグインはすべての`T.absurd`コールを`Bot`（空の型——可能な値なし）であり、かつ例外を発生させるものとして扱うため、エンジンの既存のフロー解析はコール後のコードを到達不能として扱います:

```ruby
case x
when A then handle_a(x)
when B then handle_b(x)
else
  T.absurd(x)  # elseブランチが到達不能であることをアサート
end
```

判別子が完全に網羅されると、`T.absurd`コールはデッドコードに座り何も貢献しません。caseブランチが欠落している場合、`T.absurd`コールでの判別子の型にはまだ許容可能な値があり、プラグインは`plugin.sorbet.absurd-reachable`を警告として表面化します:

```text
demo.rb:42:5: warning: `T.absurd` is reachable: the discriminant did not
                       narrow to `T.noreturn`. Either add the missing case
                       branch above the `else`, or remove the `T.absurd(...)` call.
                       [plugin.sorbet.absurd-reachable]
```

検出の精度はRigorのフローセンシティブ（flow-sensitive）なナローイングに従います——`is_a?` / `kind_of?` / `nil?`は正確に機能します。シンボル列挙型に対するナローイングはv0.1.3時点ではそれほど正確ではないため、完全に網羅されたシンボルケースが偽陽性警告を発することがあります。

## ティア順序 — 競合時に何が勝つか

メソッドがSorbet `sig`とRBS sigの両方を持つ場合、RBSが勝ちます。Sorbet sigはRigorのプラグインティアに座ります:

1. **精度ティア** — 定数フォールド、シェイプディスパッチ、ブロックフォールドなど。
2. **プラグイン貢献** — `rigor-sorbet`のsigおよびアサーション翻訳を含む。
3. **RBSバックドディスパッチ** — プロジェクト`sig/`、`RBS::Inline`、バンドルされたstdlib。
4. **依存関係ソース推論**（ADR-10のオプトインウォーカー）。
5. **ユーザークラスフォールバック**（`Object` / `Class`の祖先）。

貢献マージャー（[`docs/internal-spec/flow-contribution-merger.md`](../../internal-spec/flow-contribution-merger/)に文書化されたv0.1.0の基板）は競合時にRBSを権威として保持します——Sorbet sigは絞り込みを許可されますが矛盾は許可されません。Sorbet sigを優先させたいユーザーは競合するRBSを削除すべきで、その逆ではありません。逆方向（Sorbetが勝つ）は、サードパーティDSLアノテーションが作成されたRBSを上書きすることを許可し、信頼モデルを逆転させます。

## 移行パターン

プラグインは強制的な移行ではなく**漸進的な共存**のために設計されています。3つの一般的な形状:

1. **両方の静的チェッカーを並行して実行する**。`srb tc`がその診断を生成し続け、`rigor check`が独自の診断を生成します。両者はシェイプエラーで重複し、各ツールが発見するものを補完します——Sorbetは`T.let` / `T.cast` / RBIをより深くカバーし、Rigorはリテラル文字列ナローイング、リファインメント（refinement、篩型とも）キャリア（carrier）、プラグインDSL、依存関係ソース推論をカバーします。
2. **Sorbetはsig、Rigorはナローイング**。権威あるsigは`sig { ... }`ブロック（またはsorbet-runtime対応のRBIツリー）に残り、Rigorはそれらを入力として読み取り、その上に独自のナローイングを追加します。
3. **時間をかけてSorbet → RBS**。新しいコードはRBSとして着地し、既存のSorbet sigは周囲のサブシステムが変更されるまで残ります。プラグインはSorbetサーフェス（surface）が縮小する間も実行され続けます。

## プラグインが置き換えないもの

Rigorの`rigor-sorbet`アダプタは**入力側のみ**です。Sorbetの構文を読み取り語彙を翻訳しますが、Sorbetの型チェッカーを実行せず、`sorbet-runtime`を同梱せず、Sorbetのランタイム保証を強制しません。`Gemfile`から`sorbet`と`sorbet-runtime`を削除すると、プラグインは引き続きsigsを読み取ります（アダプタのミニインタープリタはSorbetをロードしません）が、少なくともランタイムgem（またはトップレベルの`T`定数で4つのシングルトンメソッドをスタブする——プラグインのデモが独自のユニットテストでこれを行っています）を保持しないかぎり、`T.let` / `T.cast` / `T.must` / `T.unsafe`コールはランタイムで`NameError`を発生させます。

## 次に読むもの

- 全機能マトリックスとアーキテクチャサーフェスは[`plugins/rigor-sorbet/README.md`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sorbet/README.md)にあります。
- 設計根拠 + スライスプランは[`docs/adr/11-sorbet-input-adapter.md`](../../adr/11-sorbet-input-adapter/)にあります。
- [`docs/notes/20260503-steep-cross-check-triage.md`](../../notes/20260503-steep-cross-check-triage/)のクロスチェッカートリアージレポートは、他の静的チェッカーが見逃すsigドリフトをRigorの解析器が日常的に表面化する方法を示しています——各ツールが実際に何を発見するかを比較するときに役立ちます。
