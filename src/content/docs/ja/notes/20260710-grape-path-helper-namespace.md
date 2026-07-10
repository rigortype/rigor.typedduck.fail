---
title: "Grapeのパスヘルパー: 名前テーブルではなくオープンな名前空間"
description: "rigortype/rigor docs/notes/20260710-grape-path-helper-namespace.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260710-grape-path-helper-namespace.md"
sourcePath: "docs/notes/20260710-grape-path-helper-namespace.md"
sourceSha: "2a7b31ca1f2d6a7d9acaaeda4f18b354242875bc545004554b1c09e6e78d29ec"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
sidebar:
  order: 20266710
---

設計ノート、2026-07-10。GitLabプランの**P2項目8**
（[`20260708-gitlab-type-coverage-improvement-plan.md`](../20260708-gitlab-type-coverage-improvement-plan/)）は、
この作業を「gemの`api_v4_*`ヘルパー名生成をgrapeルートファイル群にわたってモデル化する」ものとして位置づけていた。
gemを読むと、その位置づけが覆される。

## なぜ名前を列挙できないのか

`grape-path-helpers` 2.0.1は、`DecoratedRoute#path_helper_name`の中で各ヘルパー名を
**ルートのパスセグメント**から構築する。`_`で連結しサニタイズして、`version 'v4'`を伴う
`/api/:version/groups/:id/badges`は`api_v4_groups_badges_path`になる（`:id`セグメントはnilに解決されて
落とされる）。gemが走査するルートリストは`Grape::API::Instance.routes`── マウントによって構築される
*ランタイム*のルートテーブルである。

GitLabのgrapeソースは、そのテーブルをメタプログラミングで構築する:

```ruby
%w[group project].each do |source_type|
  is_project = source_type == 'project'
  # ... resource source_type.pluralize ...
```

静的パーサーはそれらのルートを列挙できない。*一部*の名前は導出できるが、それは何も導出しないより悪い。
導出に失敗したルートはすべて、動作しているコードに対して`plugin.rails-routes.unknown-helper`を発火し続ける
ことになる。それはまさに、P0-1がRails自身の`name_for_action`に対してつい先ほど修正した失敗モードだ。

したがって名前テーブルは誤ったアーティファクトである。静的に確立できるのは*名前空間*だ。

## 何が確立できるか

gemは`_path`ヘルパーだけを定義する ── `NamedRouteMatcher#method_missing`は
`return super unless method_name.end_with?('_path')`で始まる。`_url`形式は存在しない。

そして先頭のパスセグメントは計算ではなく宣言である。`lib/api/api.rb`では:

```ruby
class API < ::API::Base      # ::API::Base < Grape::API::Instance
  prefix :api
  version 'v3', using: :path do ... end
  version 'v4', using: :path
```

`prefix`は最初のセグメントを提供する。`version`は**ストラテジーが`:path`のとき**（Grapeのデフォルト。
`using: :header` / `:param`はバージョンをパスの外に保ち、したがってヘルパー名の外に保つ ── そのようなAPIの
名前空間は素の`api_`となる）、2番目のセグメントを提供する。どちらも、スーパークラスチェーンが`Grape::API`に
達するクラス本体の中の、ごく普通のリテラル引数である。したがって、gemがそのAPIのために生成するすべての
ヘルパーは`api_v4_`または`api_v3_`で始まり、その後に続くものはすべて不透明だ。

## 決定

`<prefix>_<version>_…_path`を**オープンな名前空間**として扱う: プロジェクトのルートが定義しうるが
Rigorが列挙できない名前であり、したがってそれが未定義だと証明することは健全でなく、ルールは発火して
はならない。

これは新しいメカニズムではない。ADR-26が`open_receivers`について与える推論であり、
`CheckRules#unbounded_receiver_surface?`が合成スタブに対して実装する推論であり ── そしてこのプラグイン
自身の中では、プロバイダーセグメントがランタイムに供給されるDeviseのOmniAuthファミリーに、既に適用済みの
推論である（`HelperTable#omniauth_match?`）。

名前空間はプロジェクト自身のソースに根ざしており、決して推測されない:

1. 設定されたgrapeディレクトリの中で、推移的なスーパークラスチェーンが`Grape::API`（または
   `Grape::API::Instance`）に達するクラスはgrape APIである。
2. その`prefix`とパスストラテジーの`version`リテラルが、認識されるプレフィックスを構成する。
3. `<prefix>_…_path`にマッチする呼び出しが認識される。それに対してアリティは主張されない。

grape APIを持たないプロジェクトはプレフィックスを宣言せず、そのプロジェクトについては何も変わらない。

### これが手放すもの、そしてなぜそれが正しいトレードオフなのか

タイプミスした`api_v4_grops_path`は発火しなくなる。それに対して、GitLabの141個の`unknown-helper`
診断のうち68個（43%）は、今日、動作しているコードに対するエラーである。Rigorの偽陽性の規律がこれを
決着させる: 動作するコードへの赤いエラーは、見逃したタイプミスより悪く、代替案 ── 部分的な名前テーブル
── は「歯」ではなく、異なる偽陽性の集合だからだ。

歯は、gem自身の契約がそれを健全にする箇所では保持される:

- `api_v4_anything_url`は依然として発火する。gemは`_url`ヘルパーを定義しない。
- 宣言されたgrapeプレフィックスのいずれにもマッチしないヘルパーは依然として発火する。
- たまたまgrape形式の名前の下に存在するRailsルートヘルパーは、依然としてアリティを含めて、まず実際の
  ルートテーブルから解決される。

## ゲート

`make verify`とプラグインのセルフチェック、加えてコーパスのdiff: GitLabの`app`の`unknown-helper`は
141 → 73となり、新規の発火はゼロ、`wrong-arity`は変わらない（GitLabの3件のアリティ発火はgrapeでは
ない）。RedmineとMastodonはgrape APIを持たないので、それらのルート診断はバイト単位で同一でなければ
ならない。
