---
title: "rigor-devise"
description: "rigortype/rigor docs/manual/plugins/rigor-devise.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-devise.md"
sourcePath: "docs/manual/plugins/rigor-devise.md"
sourceSha: "01dc89ad7380e2bf9a8c4bb8d597b3cb56772b6e9ac9a5f38a79f365cde61d0b"
sourceCommit: "5f4adf1ec1ff7ca079371d42f8dc2c9f4649e2cc"
sourceDate: "2026-10-22T14:26:09+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

`devise :strategy, …`宣言からDeviseがモデルにミックスインするメソッドについて、Rigorに教えます。これにより、それらのメソッドへのファイルをまたいだ呼び出し（`user.valid_password?("pw")`、`user.send_reset_password_instructions`）が、誤った`call.undefined-method`をサーフェス（surface）させる代わりに解決され、しかも本来の戻り値の型で解決されます。ソースのみを読み取り、Deviseのランタイム依存はありません。

`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-devise
```

## 何をするか: 診断なし、設定なし

`rigor-devise`はマクロ展開プラグイン（ADR-16のTier B）です。診断を発行せず、設定も持ちません。次のような宣言から、

```ruby
class User < ApplicationRecord
  devise :database_authenticatable, :recoverable
end
```

名前で指定された各ストラテジーモジュールが提供するインスタンスメソッドを合成し、宣言したクラスに付与します。これにより、別ファイルでの呼び出しが型チェックを通ります。

```ruby
user.valid_password?("pw")              # bool
user.send_reset_password_instructions   # （モジュールのRBSの戻り値）
```

戻り値の型は、広げられた`Dynamic[T]`ではなく、ストラテジーモジュールが**記述したRBSの戻り値**（`origin_module:`の来歴を介する）です。11個のストラテジーが認識されます ── `database_authenticatable`、`recoverable`、`rememberable`、`registerable`、`trackable`、`validatable`、`confirmable`、`lockable`、`timeoutable`、`omniauthable`、`authenticatable` ── に加えて、常に含まれる`Devise::Models::Authenticatable`です。`ActiveSupport::Concern`の`included do … end`の中で宣言されたストラテジーは、そのconcernをincludeするクラスへと再ターゲットされます。

## 制限事項

- **DeviseモジュールのRBSが必要**。メソッドは各ストラテジーモジュールのシグネチャ（`Devise::Models::DatabaseAuthenticatable`など）から提供されますが、これらはRigorに同梱されておらず、`devise` gemも出荷していません。`signature_paths:`（または`rbs collection`）経由で提供してください;シグネチャのないストラテジーモジュールは何も提供せず、モデルの`valid_password?`などはそのままになります。`plugins/rigor-devise/demo/sig/devise.rbs`が最小限の例です。
- **自身の定義が優先される**。モデル自身が定義したメソッド（`def`、`alias_method`、`attr_*`、`define_method`、`delegate`）、またはモデルがインクルードもしくはプリペンドしているプロジェクトのモジュールが定義したメソッドは、Deviseモジュールから型付けされるのではなくその定義に委ねられます。これは実行時にDeviseのモジュールがオーバーライドするような、`devise`呼び出しより前にインクルードされたモジュールに対しても成り立ちます。モジュール自身のパブリックメソッドのみが提供されます。
- **インスタンスメソッドのみ**。モジュールごとの`ClassMethods`（例: `User.reset_password_by_token`）はまだ合成されません。
- **コントローラーヘルパーは保留**。`current_user`／`authenticate_user!`／`user_signed_in?`は、モデルの宣言ではなくルーティングファイルの`devise_for :users`に由来する（Tier Cの作業）ため、まだ提供されません。
- **サードパーティのストラテジーはスキャンされない**。イニシャライザで`Devise.add_module :foo`を介して登録されたストラテジーは、バンドルされたストラテジーテーブルにとって未知です。

## プラグインの内部

マクロマニフェスト（各ストラテジーをそのモジュールにマッピングするトレイトレジストリ）、concernの再ターゲットウォーク、デモ、そしてこのプラグインが行使する契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-devise/README.md)にあります。[`docs/internal-spec/macro-substrate.md`](../../../internal-spec/macro-substrate/)はTier Bのトレイトレジストリを全般的に仕様化しており、[ハンドブック第9章](../../../handbook/09-plugins/)は入門です。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
