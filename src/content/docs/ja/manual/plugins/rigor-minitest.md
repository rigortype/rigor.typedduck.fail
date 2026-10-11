---
title: "rigor-minitest"
description: "rigortype/rigor docs/manual/plugins/rigor-minitest.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-minitest.md"
sourcePath: "docs/manual/plugins/rigor-minitest.md"
sourceSha: "b57f9314cdd2c65e35c17b02e2e294e16b83ef31283189de942a95319903e1e4"
sourceCommit: "a8a58149bbbed5f850866905324fab02b678990c"
sourceDate: "2026-10-11T12:00:00+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

**Minitest**と**Test::Unit**のアサーション、およびその上に重ねられたMinitest/specの`_(x).must_*` / `.wont_*`マッチャーを通じてローカル変数をナローイング（narrowing）します。プラグインがサポートされるアサーションのシェイプ（shape）を認識すると、`:local`種別のナローイングファクト（fact）を発行するため、テスト本体の残りはアサートされた型に対して解決されます。さらに、テストフレームワークの`setup`メソッドがインスタンス変数を初期化することをエンジンに伝え、これによりテスト本体で読まれるivarに対する誤ったnil警告が抑制されます。ソースのみを読み、`minitest`のランタイム依存はありません。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-minitest
```

## 何を推論するか

```ruby
def test_user
  user = build_user
  assert_kind_of(User, user)   # user narrowed to User
  user.name.upcase             # `.name` resolves on User

  found = find_user(1)
  refute_nil(found)            # found narrowed away from nil
  found.id                     # `.id` resolves cleanly
end

it "narrows the spec way" do
  _(value).must_be_kind_of(String)   # value narrowed to String
  value.upcase
end
```

`_(x)`、`value(x)`、`expect(x)`はすべてspecラッパーとして受け入れられます。Test::Unitの`assert_not_kind_of` / `assert_not_nil` / `assert_not_equal` / `assert_not_instance_of`は、それぞれの`refute_*`相当物と認識器（recognizer）を共有します。

| アサーション / マッチャー | `x`への効果 |
| --- | --- |
| `assert_kind_of(T, x)` / `assert_instance_of(T, x)` | `T`にナローイング |
| `assert_nil(x)` | `Constant<nil>`にナローイング |
| `assert_equal(literal, x)` | `Constant<literal>`とmeet（下記参照） |
| `assert_match(regex, x)` | `String`にナローイング |
| `refute_kind_of` / `refute_instance_of`（＋`assert_not_*`） | `T`から除外する方向にナローイング |
| `refute_nil(x)` / `assert_not_nil(x)` | nilから除外する方向にナローイング |
| `refute_equal(literal, x)` / `assert_not_equal(...)` | 変更なし |
| `_(x).must_be_kind_of(T)` / `must_be_a(T)` / `must_be_instance_of(T)` / `must_be_an_instance_of(T)` | `T`にナローイング |
| `_(x).must_be_nil` | `Constant<nil>`にナローイング |
| `_(x).must_equal(literal)` | `Constant<literal>`とmeet（下記参照） |
| `_(x).must_match(regex)` | `String`にナローイング |
| `_(x).wont_be_kind_of(T)` / `wont_be_instance_of(T)` | `T`から除外する方向にナローイング |
| `_(x).wont_be_nil` | nilから除外する方向にナローイング |
| `_(x).wont_equal(literal)` | 変更なし |

### 等価性は同一性ではない

`assert_equal(literal, x)`と`_(x).must_equal(literal)`は`literal == x`のときにパスし、`==`はクラスをまたいで成り立つことがあります: `1 == 1.0`、`1 == 1r`、そして独自の`==`を持つクラス（`to_i`を比較する`ModInt`など）は`assert_equal 9, m`をパスします。したがって、アサーションは`x`の型を決して置き換えません:

- `nil`、`true`、`false`、またはSymbolリテラルは同一性の`==`を持つため、`x`の型が何であれ、`x`はそのリテラルにナローイングされます;
- Integer、Float、またはStringリテラルは、`x`の型のすべてのメンバーがすでにそのリテラルのクラスである（またはリテラルと等しくなり得ない`nil`、真偽値、Symbolである）場合にのみ`x`をナローイングします。`x = rand(10); assert_equal 9, x`の後、`x`は`9`になります;
- それ以外の場合 ── `x`が`Dynamic`である、ユーザー定義クラスである、別の数値クラスである（Integerの`x`に対する`assert_equal 9.0, x`）、またはリテラルが`-0.0`とも等しい`0.0`である場合 ── `x`はその型を保持します。

## diagnosticなし、設定なし

このプラグインはdiagnosticを発行せず、設定ノブも持ちません ── エンジンにナローイングファクトを提供するだけです。解析されるすべてのファイルを走査します。認識されるシェイプにマッチしないとき、テスト以外のファイルは手を付けられずに素通りします。

## 制限事項

- **ブロックシェイプのマッチャーはなし** ── `assert_raises(T) { ... }`、`assert_throws(:tag) { ... }`。ナローイングは直線的なローカル変数を対象とします。
- **述語 / respond-toマッチャーはなし** ── `assert_predicate(x, :foo?)`、`assert_respond_to(x, :m)`はRigorがモデル化していないキャリア（carrier）を必要とします。
- **`assert_in_delta` / `assert_operator`はなし** ── 浮動小数点範囲 / 汎用演算子のナローイングは今後の作業です。
- **レガシーな素の`x.must_be_kind_of(T)`はなし**（Minitest < 6.0） ── レシーバー*そのもの*が値なので、ナローイングする対象がありません。`_(x).must_*`へ移行してください。

## プラグイン内部

アサーション認識器と、このプラグインが行使する契約サーフェス ── ADR-37の`narrowing_facts`ナローイングゲートと`setup`向けのADR-38の`additional_initializers` ── は[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-minitest/README.md)にあります。プラグインの書き方は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
