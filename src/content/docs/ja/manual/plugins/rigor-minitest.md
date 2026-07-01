---
title: "rigor-minitest"
description: "rigortype/rigor docs/manual/plugins/rigor-minitest.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-minitest.md"
sourcePath: "docs/manual/plugins/rigor-minitest.md"
sourceSha: "a686a8c6dfe14d62f596b21d55ddcf5a32094206f8e0025b196816de8a3f3ed2"
sourceCommit: "450a3016ca812067f6baa96e415442ed936ad49a"
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
| `assert_equal(literal, x)` | `Constant<literal>`にナローイング |
| `assert_match(regex, x)` | `String`にナローイング |
| `refute_kind_of` / `refute_instance_of`（＋`assert_not_*`） | `T`から除外する方向にナローイング |
| `refute_nil(x)` / `assert_not_nil(x)` | nilから除外する方向にナローイング |
| `refute_equal(literal, x)` / `assert_not_equal(...)` | `Constant<literal>`から除外する方向にナローイング |
| `_(x).must_be_kind_of(T)` / `must_be_a(T)` / `must_be_instance_of(T)` / `must_be_an_instance_of(T)` | `T`にナローイング |
| `_(x).must_be_nil` | `Constant<nil>`にナローイング |
| `_(x).must_equal(literal)` | `Constant<literal>`にナローイング |
| `_(x).must_match(regex)` | `String`にナローイング |
| `_(x).wont_be_kind_of(T)` / `wont_be_instance_of(T)` | `T`から除外する方向にナローイング |
| `_(x).wont_be_nil` | nilから除外する方向にナローイング |
| `_(x).wont_equal(literal)` | `Constant<literal>`から除外する方向にナローイング |

## diagnosticなし、設定なし

このプラグインはdiagnosticを発行せず、設定ノブも持ちません ── エンジンにナローイングファクトを提供するだけです。解析されるすべてのファイルを走査します。認識されるシェイプにマッチしないとき、テスト以外のファイルは手を付けられずに素通りします。

## 制限事項

- **ブロックシェイプのマッチャーはなし** ── `assert_raises(T) { ... }`、`assert_throws(:tag) { ... }`。ナローイングは直線的なローカル変数を対象とします。
- **述語 / respond-toマッチャーはなし** ── `assert_predicate(x, :foo?)`、`assert_respond_to(x, :m)`はRigorがモデル化していないキャリア（carrier）を必要とします。
- **`assert_in_delta` / `assert_operator`はなし** ── 浮動小数点範囲 / 汎用演算子のナローイングは今後の作業です。
- **レガシーな素の`x.must_be_kind_of(T)`はなし**（Minitest < 6.0） ── レシーバー*そのもの*が値なので、ナローイングする対象がありません。`_(x).must_*`へ移行してください。

## プラグイン内部

アサーション認識器と、このプラグインが行使する契約サーフェス ── ADR-37の`narrowing_facts`ナローイングゲートと`setup`向けのADR-38の`additional_initializers` ── は[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-minitest/README.md)にあります。プラグインの書き方は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
