---
title: "rigor-grape"
description: "rigortype/rigor docs/manual/plugins/rigor-grape.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-grape.md"
sourcePath: "docs/manual/plugins/rigor-grape.md"
sourceSha: "0343779d18c5d57fdd58c229a0a8d50dc8317d12bbe9eced490d9162fc31b355"
sourceCommit: "0f252e3218936e8dc7004b574c709a434b996d2a"
translationStatus: "translated"
sidebar:
  order: 9050
---

[Grape](https://github.com/ruby-grape/grape)のエンドポイント宣言DSLを型付けし、`class API < Grape::API`の本体内 ── および[grape-entity](https://github.com/ruby-grape/grape-entity)由来の`Grape::Entity`サブクラス内 ── での呼び出しが、`Dynamic[top]`ではなく実際のキャリアへと解決されるようにします。ソースのみを読み取り、`grape`の実行時依存関係はありません。

`rigortype`に同梱されて提供されます。`plugins:`の下で有効化してください（または`Gemfile.lock`に`grape`や`grape-entity`がある場合はbundlerの自動検出に拾わせてください）：

```yaml
plugins:
  - rigor-grape
```

## 型付けの対象

```ruby
class ThingsAPI < Grape::API
  version "v1", using: :path
  format :json

  desc "List things"                       # Object?
  route_setting :swagger, tags: %w[things] # Object?

  params do                                # → Grape::Validations::ParamsScope
    requires :id, type: Integer            # Object?
    optional :q, type: String              # Object?
    requires :filter, type: Hash do        # nested scope re-enters ParamsScope
      requires :state, type: String
    end
    mutually_exclusive :q, :filter
  end

  namespace :things do                     # self: API::Instanceクラスオブジェクト
    get "/:id" do                          # self: Grape::Endpoint
      params                               # Hash[untyped, untyped]
      error!("nope", 404)                  # bot
      present Thing.first, with: Entities::Thing
    end
  end
end

class Entities::Thing < Grape::Entity
  expose :id                               # Array[untyped]
  expose :name do                          # `self`はクラスオブジェクトのまま
    expose :first
  end
  format_with(:iso) { |d| d.to_s }         # Object
end
```

認識されるサーフェス：

- `Grape::API`サブクラス（中間ソース基底クラスを経由する場合を含む）上の**クラス本体宣言**: `params`、`namespace` / `group` / `resource` / `resources` / `segment` / `route_param` / `version` / `given` / `mounted`、`get`/`put`/`post`/`delete`/`head`/`patch`/`options`/`route`、`desc`、`route_setting`、`helpers`、`use`、`mount`、`rescue_from`、フォーマット／エラーフォーマットのセッター、コールバック（`before`/`after`/`before_validation`/`after_validation`）、`prefix`、`scope`、`contract`など。
- **`params`ブロック本体**は`self`を`Grape::Validations::ParamsScope`に束縛するため、`requires`、`optional`、`given`、`with`、`use`、およびグループ化マクロ（`mutually_exclusive`、`exactly_one_of`、`at_least_one_of`、`all_or_none_of`）が解決されます ── ネストされた`requires :x, type: Hash do ... end`本体を含みます。
- **名前空間ファミリーの本体**（`namespace`、`route_param`、`version`、`given`、`mounted`）は、Grapeのクラスに対する`instance_eval`セマンティクスと一致して`self`を`Grape::API::Instance`クラスオブジェクトに束縛するため、ネストされた宣言は同じサーフェスを解決します。
- **`desc 'x' do ... end`本体**は`self`を`Grape::DSL::Desc::ConfigContext` ── クローズされた`ROUTE_ATTRIBUTES`セッターサーフェス ── に束縛するため、`detail`、`success`、`failure`、`tags`、`entity`、`hidden`、`is_array`、`consumes`、`headers`、`summary`、`deprecated`、`named`、`nickname`、`produces`、`security`、`http_codes`、`body_name`、`default`、`description`、および`params`（`ParamsScope`ではなく、ドキュメントのセッター）が解決されます。
- **動詞（verb）本体**は`self`を`Grape::Endpoint`に束縛するため、`params`、`headers`、`cookies`、`env`、`declared`、`present`、`error!`、`status`、`redirect`、`body`、`content_type`、`route`、`route_setting`、`stream`、`sendfile`が解決されます。
- **`Grape::Entity`クラス本体**: `expose`、`unexpose`、`with_options`、`documentation`、`format_with`、`root`、`root_element`、`represent`、`present_collection`、`root_exposures`。ネストされた`expose`本体は`self`をクラスオブジェクトに保つため、同様に解決されます。

## 保留中

- `helpers do ... end`本体（匿名モジュールが`self` ── 命名不能）。
- `helpers`および`contract`スキーマブロック内の名前付き`params :name`スコープ。
- 値レベルの型付け: 宣言されたエンティティまたはparamsに対する`present`/`declared`の結果、エンティティの`represent`結果の型付け。
- `Grape::Middleware`およびカスタムミドルウェアDSL。

`Grape::API` / `Grape::Entity`の祖先以外のクラスでの呼び出しは`Dynamic`フォールバックを維持し、同梱のシグネチャが宣言していないDSL名は診断されるのではなく不透明なままとなります ── Grapeの実行時サーフェスは動的に生成され（`override_all_methods!`）、ユーザーの基底クラスがそれを拡張するため、宣言されたクラスはオープンレシーバーとして登録されています。
