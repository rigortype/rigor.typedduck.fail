---
title: "rigor-pundit"
description: "rigortype/rigor docs/manual/plugins/rigor-pundit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-pundit.md"
sourcePath: "docs/manual/plugins/rigor-pundit.md"
sourceSha: "f9dceb260621c5d1ccfe7d86bbbd4870adffe0ca8015cac7be7406dc18d882b8"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 9050
---

Punditの`authorize`／`policy`／`policy_scope`呼び出しを、静的に発見したポリシーインデックスに照らして検証します。ポリシークラスが存在しなければならず、`authorize(record, :action)`のアクションはそのポリシー上で定義された`<action>?`述語に対応していなければなりません。ソースのみを読み取り、Punditのランタイム依存はありません。

`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化します。

```yaml
plugins:
  - rigor-pundit
```

## 何をチェックするか

```ruby
# app/policies/post_policy.rb
class PostPolicy < ApplicationPolicy
  def show?;    true; end
  def update?;  true; end
  def destroy?; true; end
end

authorize(Post, :show)      # info:  PostPolicy#show? に解決される
authorize(Post, :destory)   # error: PostPolicy#destory? は定義されていない（:destroy? の誤りでは？）
authorize(Comment, :edit)   # error: ポリシークラス CommentPolicy が存在しない（… の誤りでは？）
```

| ルール | 重大度 | 発火するとき |
| --- | --- | --- |
| `plugin.pundit.policy-call` | info | `authorize`／`policy`／`policy_scope`呼び出しが、発見済みのポリシーに解決された |
| `plugin.pundit.unknown-policy-class` | error | レコードがインデックスにエントリーのない`<Type>Policy`にマッピングされる（誤り候補の提示付き） |
| `plugin.pundit.unknown-policy-method` | error | ポリシーは存在するが、`:action`に対応する`<action>?`述語がない（既知の述語の一覧＋誤り候補の提示付き） |
| `plugin.pundit.load-error` | warning | ポリシーの発見に失敗した（パース／読み取りエラー） ── ファイルごとに1回 |

レコードは、定数名または推論された`Nominal[T]`によってポリシーにマッピングされます（`Post` → `PostPolicy`）。`:update`は`update?`に正規化されます。アクションを伴わない`authorize(record)`は、ポリシークラスのみを検証します（アクションはコントローラーのランタイムに束縛されるため）。

## 設定

```yaml
plugins:
  - gem: rigor-pundit
    config:
      policy_search_paths: ["app/policies"]    # デフォルト
      policy_base_classes: ["ApplicationPolicy"]  # デフォルト
      authorization_call_paths: ["app/controllers"]  # デフォルト
```

`authorization_call_paths`は、下記の到達可能性ルートの背後にある`authorize` / `policy` / `policy_scope`呼び出しをプラグインが探す場所です。`app/graphql`や`app/services`からも認可しているなら広げてください;この走査はランごとにファイル1つにつき1回のパースになるため、デフォルトは狭くしてあります。

## `rigor unused`向けのポリシールート

`authorize @post`は`PostPolicy#update?`を実行しますが、`PostPolicy`という名前はどこにも書かれません。だから助けがなければ、[`rigor unused`](../../02-cli-reference/#rigor-unused)はアプリのすべてのポリシーを死んでいる可能性ありと報告します。このプラグインは、あなたのコードが実際に認可の対象としているポリシーを供給するので、それらは候補リストから外れます。

公開されるのは**認可呼び出しが名指しする**ポリシーであって、`policy_search_paths`配下のすべてのクラスではありません。何も認可の対象としないポリシーはレポートに残ります。それこそがあなたの見たかった答えです: 示せる以上のことを主張するルートソースは、本物の死んだコードを黙って隠してしまいます。

プラグインが呼び出しに帰属させられないポリシー —— 名前空間付きの`Admin::PostPolicy`、読み取れないレコード引数 —— は、推測されるのではなく候補のままにとどまります。

## 制限事項

- **直接のスーパークラスとの一致のみ**。`class AdminPostPolicy < AdminPolicy`（`AdminPolicy < ApplicationPolicy`の場合）は、`AdminPolicy`を`policy_base_classes`に追加しない限り発見されません。
- **述語メソッドのみ**。`?`で終わらないメソッド、および`define_method`で構築された述語やconcernから継承された述語は対象外です。
- **型なしのレコードは素通りする**。`local`に推論された`Nominal[T]`がない場合、`authorize(local, :show)`は検証されません。
- **`Scope`ポリシー**は、クラスの存在については検証されますが、`Scope#resolve`については検証されません。

## プラグインの内部

ポリシーの発見器／インデックス、およびこのプラグインが行使する契約（contract）サーフェスは、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-pundit/README.md)にあります。プラグインの書き方については、[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
