---
title: "Flow Contribution Bundle — `Rigor::FlowContribution`"
description: "Imported from rigortype/rigor docs/internal-spec/flow-contribution.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/internal-spec/flow-contribution.md"
sourcePath: "docs/internal-spec/flow-contribution.md"
sourceSha: "58cb27213f942ae171f157c291094d33b1180dfd4f06d22d6ba99aefb7530b97"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス: **公開リード形（v0.0.9 グループB）。** このドキュメントは、フローコントリビューションプロデューサー（現在は組み込みナローイングルール、v0.1.0以降は`RBS::Extended`アノテーションおよびプラグイン作者）が単一の呼び出しエッジでアナライザーに渡すサーフェスを固定します。これらのバンドルを消費するマージポリシーは[ADR-2 § "Plugin Contribution Merging"](../../adr/2-extension-api/)が所有します。v0.0.9ではバンドル構造体のみを提供し、マージャーはv0.1.0でプラグインAPIとともに導入されます。

## 公開サーフェス

```ruby
contribution = Rigor::FlowContribution.new(
  return_type: Rigor::Type::Combinator.constant_of(42),
  truthy_facts: [...],
  falsey_facts: [...],
  post_return_facts: [...],
  mutations: [...],
  invalidations: [...],
  exceptional: nil,
  role_conformance: [...],
  provenance: Rigor::FlowContribution::Provenance.new(
    source_family: "plugin.my-gem",
    plugin_id: "my-gem",
    node: ast_node,
    descriptor: cache_descriptor
  )
)
```

キーワード引数はすべて省略可能です。スロットを未設定のままにすることは「このコントリビューションはその次元では何も主張しない」ことを意味し、マージポリシーはそれを存在しないものとして扱います。バンドルは構築時にフリーズされます。コレクションスロットはdup後にフリーズされるため、呼び出し元は構築後に変更できません。

## スロット定義

8つのコンテンツスロットは[ADR-2 § "Flow Contribution Bundle"](../../adr/2-extension-api/)に対応します。

| スロット | 型 | 意味 |
| --- | --- | --- |
| `return_type` | 型キャリアまたは`nil` | 通常エッジの戻り型。プラグインは選択されたRBS契約の範囲内で MAY ナローイングできます。非互換な戻り型はマージポリシーに従いコンフリクト診断になります。 |
| `truthy_facts` | `Array`または`nil` | truthyな制御フローエッジでのみ成立するファクト。エッジローカル：truthyエッジのファクトは、コントリビューションが明示的に提供しない限り、falseyエッジの補集合を MUST NOT 意味しません。 |
| `falsey_facts` | `Array`または`nil` | `truthy_facts`の双対。 |
| `post_return_facts` | `Array`または`nil` | 呼び出しがすべてのエッジで正常に戻った後に成立するファクト。アサーションスタイルのコントリビューション（`%a{rigor:v1:assert ...}`）のキャリアです。 |
| `mutations` | `Array`または`nil` | レシーバーおよび引数の変更エフェクト。`pure`スタイルの宣言との矛盾は診断になります。 |
| `invalidations` | `Array`または`nil` | `mutations`がすでに示す範囲を超えた、特定ファクトの無効化。 |
| `exceptional` | エフェクトタグまたは`nil` | 返らない・例外を投げる・到達不能エフェクト。 |
| `role_conformance` | `Array`または`nil` | コントリビューションが提供するケイパビリティロール適合ファクト。 |

コレクションスロット内の値のシェイプは、v0.0.9では意図的に固定されていません。v0.1.0で導入されるマージャーがタグ付き要素フォームを定義します。それまでの間、コントリビューションは組み込みルールをすでに動かしているアナライザー内部のナローイング表現を自由に使用できます。

## 来歴（Provenance）

```ruby
Rigor::FlowContribution::Provenance = Data.define(
  :source_family,  # Symbol or String — :builtin / :rbs_extended / "plugin.<id>" / ...
  :plugin_id,      # String or nil
  :node,           # AST node or nil — the Prism node carrying the annotation
  :descriptor      # Rigor::Cache::Descriptor or nil — cache slice this contribution attaches to
)

Rigor::FlowContribution::Provenance.builtin
# => #<data Provenance source_family=:builtin, plugin_id=nil, node=nil, descriptor=nil>
```

`source_family`は`Rigor::Analysis::Diagnostic#source_family`と対応しており、帰属がきれいに構成されます。つまりプラグインコントリビューションから生成された診断は、コントリビューションが宣言したのと同じ`source_family`文字列を持ちます。キャッシュ無効化は`descriptor`を通じて[ADR-2 § "Registration, Configuration, and Caching"](../../adr/2-extension-api/)および[`Rigor::Cache::Descriptor`](../cache/)スキーマに従い処理されます。

## 等値性・ハッシュ・空判定

- `==`はバンドルを構造的に比較します（すべてのコンテンツスロットと来歴）。`hash`は`==`と整合しています。
- `to_h`はすべてのスロット名と`:provenance`（値はProvenanceのData `to_h`）をキーとするHashを返します。
- `empty?`はすべてのコンテンツスロットが`nil`または空コレクションのときtrueです。来歴は空判定に MUST NOT 影響しません。空のバンドルも来歴による帰属情報を持ちます。

## バンドルを通じて公開されるプロデューサー

内部プロデューサーは型付きデータキャリアと並行してコントリビューションを`FlowContribution`として公開 MAY できます。型付きキャリア（`PredicateEffect`・`AssertEffect`など）はアナライザー内部のナローイング/ディスパッチ機構で引き続き使われます。バンドルはv0.1.0のコントリビューションマージャー向け、および複数プロデューサーにわたって単一シェイプを求める診断/ドキュメントサーフェス向けの公開パッケージングです。

### `Rigor::RbsExtended.read_flow_contribution(method_def) -> FlowContribution | nil`

単一のRBSメソッド定義上で認識されたすべての`RBS::Extended`ディレクティブを1つのバンドルにまとめます。

| ディレクティブ | バンドルスロット |
| --- | --- |
| `rigor:v1:predicate-if-true ...`  | `truthy_facts`（各エントリは`RbsExtended::PredicateEffect`） |
| `rigor:v1:predicate-if-false ...` | `falsey_facts`（`PredicateEffect`の配列） |
| `rigor:v1:assert ...`             | `post_return_facts`（各エントリは`AssertEffect`） |
| `rigor:v1:assert-if-true ...`     | `post_return_facts`（`condition: :if_truthy_return`付き`AssertEffect`） |
| `rigor:v1:assert-if-false ...`    | `post_return_facts`（`condition: :if_falsey_return`付き`AssertEffect`） |
| `rigor:v1:return: ...`            | `return_type`（`Rigor::Type`） |

コントリビューションのないスロットは空コレクションではなく`nil`のままになるため、バンドルの`#empty?`ルールがきれいに適用されます。

`provenance`は共有定数`Rigor::RbsExtended::RBS_EXTENDED_PROVENANCE`です。

```ruby
Rigor::FlowContribution::Provenance.new(
  source_family: :rbs_extended,
  plugin_id: nil,
  node: nil,
  descriptor: nil
)
```

`source_family: :rbs_extended`はv0.0.8スライス5で導入された診断来歴プレフィックスと一致するため、`RBS::Extended`ディレクティブに由来する診断は同一の帰属文字列を持てます。

`param: <name>`ディレクティブは意図的にバンドルに含まれません。これらはフローファクトではなく呼び出しのシグネチャ契約を絞り込むものであり、ADR-2 § "Flow Contribution Bundle"スロットのセマンティクスに合いません。パラメーター契約を扱う呼び出し元は引き続き`RbsExtended.read_param_type_overrides` / `RbsExtended.param_type_override_map`を使用してください。

## 要素リストへの展開（延期）

ADR-2では、各バンドルを`(target, flow edge, effect kind)`をキーとするタグ付き要素リストに展開するアナライザー内部処理について言及しています。その表現はマージポリシーが消費する実装サーフェスです。v0.0.9では意図的に提供されません。マージャーと要素リストフォームはv0.1.0で一緒に導入されます。プラグイン作者は要素リストフォームに依存 MUST NOT してはなりません。

## 安定性

コンストラクターサーフェスとスロット名は、v0.0.xの公開リード形として安定しています。新しいスロットを追加することは、ADR-2の修正とこのドキュメントへのスキーマバージョン注記を伴う公開API拡張です。スロットのリネームや削除はメジャーバージョンバンプが必要な破壊的変更です。
