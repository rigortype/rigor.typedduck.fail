---
title: "rigor-rspec"
description: "rigortype/rigor docs/manual/plugins/rigor-rspec.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rspec.md"
sourcePath: "docs/manual/plugins/rigor-rspec.md"
sourceSha: "bf738aa166e7d9194e9cba5867067acaf425366cc24aa00f74bc2da643ead19c"
sourceCommit: "273bb9f9580739b38f93e5900e83979002290514"
sourceDate: "2026-10-17T06:23:30+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

各`describe` / `context`スコープ内でのRSpecの`let` / `subject`宣言を検証します。これは意図的に小さく作られています: 同梱される2つのチェックは、提案されているRSpecサーフェス（surface）の中で偽陽性リスクが最も低く、純粋な構文ウォークモードで動作し、`rspec` / `rubocop-rspec`が必ずしも明確に表面化しない実際のバグを捕捉します。また、[マッチャーによる絞り込み](#マッチャーによる絞り込み)で説明するように、`expect(x).to`マッチャーを通じてローカル変数を絞り込みます。RSpecのランタイム依存はありません。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-rspec
```

## 何をチェックするか

```ruby
RSpec.describe "User" do
  let(:user) { :alice }
  let(:user) { :bob }            # ← warning: duplicate `let(:user)`

  let(:tags) { tags.map(&:up) }  # ← error: self-referencing let

  context "when admin" do
    let(:user) { :admin }        # ← OK: different scope
  end
end
```

上のスニペットは読みやすさのために圧縮したものです;下の出力はこのプラグイン自身のデモ（`plugins/rigor-rspec/demo/`）に対してRigorが実際に印字するものなので、行番号はそのファイルのものです:

```text
spec/errors_spec.rb:23:3: warning: duplicate `let(:user)` in this scope (first declared at line 22); the last declaration wins at runtime [plugin.rspec.duplicate-let]
spec/errors_spec.rb:27:3: error: `let(:tags)` references its own name `tags` — this will infinite-loop at runtime [plugin.rspec.self-reference]
```

1. **同一スコープ内での`let` / `subject`宣言の重複** ── `warning`。RSpecのランタイムは最後の宣言を優先するため、最初の宣言は黙ってシャドウされます。メッセージは最初の宣言の行を示します。
2. **自己参照する`let` / `subject`** ── 宣言した名前を自身のブロック本体の内側から呼び出すこと ── `error`。ランタイムでは無限ループになります。

ウォーカーは`RSpec.describe … do`（ルート）、ネストされた`describe` / `context … do`、`let(:name)` / `let!(:name)`、そして`subject(:name)` / 素の`subject`（暗黙の`:subject`）を認識します。

## マッチャーによる絞り込み

`expect(x).to MATCHER`はexample本体の残りの部分についてローカル変数`x`を絞り込むため、下流の呼び出しはマッチした型に対して解決されます。素のローカル変数のみが対象です。

```ruby
RSpec.describe "Counter" do
  it "narrows through the matcher" do
    count = rand(10) if rand(2).zero?  # countはInteger?
    expect(count).to eq(42)            # countはここ以降42
    count + 1                          # possible-nil-receiver警告なし
  end
end
```

| マッチャー | `x`への効果 |
| --- | --- |
| `eq(literal)` / `eql(literal)` | `Constant<literal>`とのmeet（下記参照） |
| `be_a(T)` / `be_kind_of(T)` / `be_instance_of(T)` / `be_an_instance_of(T)` | `T`とのmeet |
| `be_nil` | `Constant<nil>`への絞り込み |
| `match(/regex/)` | `String`への絞り込み |
| `not_to be_nil` / `to_not be_nil` | `nil`の除外 |
| `not_to be_a(T)` / `not_to be_kind_of(T)` / `not_to be_instance_of(T)` / `not_to be_an_instance_of(T)` | `T`の除外 |
| `not_to eq(literal)` / `not_to eql(literal)`（および`to_not`） | 変更なし（下記参照） |

他のマッチャーは何も発行しません。`be_truthy`は絞り込まれず、`expect { ... }.to raise_error(...)`（ブロック形式）や、引数がローカル変数でない`expect(foo.bar)`も絞り込まれません。

### 等値性は置換ではなくmeetである

`eq(literal)`は`x == literal`のときにパスし、`eql(literal)`は`x.eql?(literal)`のときにパスします。ローカル変数がレシーバーであるため、`x`自身の演算子が決定し、その演算子はクラスを跨いで成立することがあります: `1 == 1.0`であり、独自の`==`を持つクラス（`to_i`を比較する`ModInt`）は`expect(m).to eq(9)`をパスします。したがって、マッチャーは`x`の型を決して置き換えません。`x`の型の各メンバーを個別に絞り込みます。

コアの等値性クラスは`EQUALITY_CORE_CLASSES`（`plugins/rigor-rspec/lib/rigor/plugin/rspec/matcher_analyzer.rb`）にある9個です: `Integer`、`Float`、`Rational`、`Complex`、`String`、`Symbol`、`NilClass`、`TrueClass`、`FalseClass`。最初の4つが数値クラスです。

- リテラル自身のクラスのメンバーは、そのクラスのrefinementを含めてリテラルに絞り込まれます。`x = rand(10)`の後、`expect(x).to eq(9)`は`9`を与えます; `nil`メンバーは`9`と等しくなり得ないため、`Integer?`に`eq(9)`を適用すると`9`を与えます。`decimal-int-string?`（`x`が`Integer?`のときの`y = x && x.to_s`から得られる）のようなrefinementは、`eq("3")`の下で`"3"`を与えます。`Constant`メンバーはリテラルと等しい場合に保持され、それ以外の場合は落とされます;
- `Float`メンバーは`0.0`とmeetして保持されます。`-0.0`もそれに等しいためです;
- 別のクラス（`Integer`、`Float`、`Rational`、`Complex`）の数値メンバーは`eq`の下で保持されます: `Integer | Float`に`eq(1)`を適用すると`1 | Float`を与えます;
- コア等値性クラスのその他のメンバーは落とされます: `String | Integer`に`eq(9)`を適用すると`9`を与えます;
- `eql(literal)`も同じパスを辿りますが、`eql?`はクラスを比較するため、別のクラスの数値メンバーは落とされます: `Integer | Float`に`eql(1)`を適用すると`1`を与えます。

### メンバーまたはローカル変数全体が型を保持する場合

コア等値性クラス外のメンバーが存在するとファクト全体が利用不能になるため、そのメンバーだけでなくローカル変数全体が型を保持します:

- メンバーが`Dynamic`であるか、ユーザー定義クラス（`ModInt`）、`Numeric`、ジェネリックな`Array`や`Hash`など`EQUALITY_CORE_CLASSES`外のクラスである場合。`eq(9)`の下ではローカル変数全体が変更されないままとなるため、`9 | [1]`や`9 | { a: 1 }`は絞り込まれません;
- 解析対象のいずれかのファイルで、プロジェクトがリテラルのクラス上に演算子（`eq`の場合は`==`、`eql`の場合は`eql?`）を定義している場合。`def`と`define_method`の双方がカウントされます。コアの`==`はリテラル自身の`==`にコールバックする可能性があるため（非数値引数に対する`Integer#==`、`to_str`に応答するものに対する`String#==`）、保持されたメンバーが残る場合でもプラグインはそこで絞り込みを行いません;
- プロジェクトがメンバーのクラスのコアの先祖を再オープンし、そこに演算子を定義している場合（`class Numeric; def eql?`や`class Object; def ==`など）。`eql(9)`の下では`Integer`は`Integer`のままです; `eq(9)`の下では`Integer?`の`nil`メンバーは`nil`のままであり、`Integer`メンバーが絞り込まれます（`9?`）;
- リテラルが`nil`、`true`、またはSymbolであり、メンバーがユーザー定義クラスまたは`Dynamic`である場合: ローカル変数自身の`==`もこれらのリテラルにマッチする可能性があるため、`9`の場合と同様にローカル変数はその型を保持します;
- ローカル変数がアンバウンドであるか、スコープが利用できないか、またはマッチを生き残るメンバーがない場合（`eq(9)`を伴う`nil`）。

`class String; def shout`のように他のメソッドのみを定義する再オープンはカウントされません: `String?`に`eq("a")`を適用すると依然として`"a"`に絞り込まれます。プロジェクト内の`class Symbol; def ==`は`Symbol`メンバーを保持し残りを絞り込みます: `Symbol | Integer | nil`に`eq(9)`を適用すると`9 | Symbol`を与えます。

`not_to eq(literal)`、`to_not eq(literal)`、およびそれらの`eql`形式は絞り込みを行いません: `x`はマッチャーの前に持っていた型を保持します。

## 設定

設定ノブはありません。プラグインはプロジェクトの`paths:`上のすべてのファイルを`RSpec.describe … do`ブロックを探して走査します。認識されるdescribeブロックを持たないファイルは黙ってスキップされるため、spec以外のファイルと並べてプロジェクト全体で有効化しても安全です。

## 制限事項

- **`it`本体内でのletタイポ検出はなし**。`it`ブロック内のスペルミスした`let`名をフラグするには、はるかに重いウォーカー（マッチャーDSL、ヘルパーメソッド、letスコープチェーン）が必要 ── 待機中です。
- **モックターゲット検証はなし**。`x`のメソッドに対する`expect(x).to receive(:nme)`は別のスライス（slice）です。
- **共有コンテキストの解決はなし**。`include_context`、`shared_context`、`it_behaves_like`は無視されます。
- **自己参照検出はブロック内のみ**。間接的なループ（`let(:user) { foo }`で`foo`が`user`を呼び戻す場合）はフラグされません。
- 定数検証（`RSpec.describe SomeClass`）はこのプラグインではなくエンジンの仕事です。
- **[`rigor unused`](../../02-cli-reference/#rigor-unused)向けのルートは公開しません**。`RSpec.describe User`は既に参照として記録されており、specに由来するため`test`ロールが刻印されています。specの参照をルートとして公開すればそのロールが剥がれ、specから参照されるすべてのクラスが本番到達可能に昇格し、レポートの**テストコードからのみ到達可能**セクション —— 生きたテストを持つ死んだ本番コードだと教えてくれる行 —— が消えてしまいます。通常の扱いこそが正しい扱いです。

## 関連プラグイン

`rspec-rails`と`shoulda-matchers`のマッチャーはほとんどが*振る舞い的*（静的な型ではなくランタイムの状態をアサートする）なので、ここでは対象外です。待機中の`rigor-rspec-rails`と`rigor-shoulda-matchers`プラグインが、それらに対するドメイン固有のdiagnosticを発行することになります。READMEがその境界を詳しく扱っています。

## プラグイン内部

スコープウォーカー / アナライザーのレイアウト、デモの実行方法、このプラグインが行使する契約（contract）サーフェス、今後の方向性のスライスは[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-rspec/README.md)にあります。プラグインの書き方は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
