---
title: "Flow Contribution Merger (slice 3)"
description: "Imported from rigortype/rigor docs/internal-spec/flow-contribution-merger.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/flow-contribution-merger.md"
sourcePath: "docs/internal-spec/flow-contribution-merger.md"
sourceSha: "98ef4389e62d174854430dec2052a0026eb9304597526cdb3470df582589af90"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス: **v0.1.0スライス3規範文書**。組み込みナローイングルール・`RBS::Extended`アノテーション・プラグインからの`FlowContribution`バンドルを単一の`MergeResult`にまとめるマージポリシーを固定します。設計サーフェスの根拠: [ADR-2 § "Plugin Contribution Merging"](../../adr/2-extension-api/)。

## この仕組みが必要な理由

同一の呼び出しに対して複数のフローコントリビューションが発生しうる場合があります。組み込みナローイングルールとプラグイン提供ファクトが同一サイトに適用されることも、2つのプラグインが同一レシーバーファミリーに登録されることも、`RBS::Extended`アノテーションが独自のファクトを追加することもあります。ADR-2は先着優先/後着優先の動作を禁じています。コントリビューションは**決定論的にマージ**され、コントリビューション間の**矛盾**は黙って上書きするのではなく**診断**として表面化しなければなりません。

スライス3はスタンドアロンのマージャーを提供します。スライス4は組み込みナローイングをマージャー経由でルーティングし、スライス5はプラグイン診断の来歴を結果に通し、スライス6はマージャーの`{provenances, conflicts}`を使ってプラグイン側のキャッシュエントリを帰属させます。

## 公開名前空間（ドリフトピン済み）

以下の各名前空間は[`spec/rigor/public_api_drift_spec.rb`](../../spec/rigor/public_api_drift_spec.rb)によってロックされています。

### `Rigor::FlowContribution#to_element_list`

バンドル → 要素リストへの展開。空でないスロットをすべて走査し、`(target, edge, kind)`をキーとする{Element}値オブジェクトを1つ以上生成します。

| スロット | エッジ | kind | ターゲット |
| ------------------- | ------------- | ------------------- | ----------------------- |
| `return_type`       | `normal`      | `return_type`       | `:return`               |
| `truthy_facts`      | `truthy`      | `truthy_fact`       | ファクトごと             |
| `falsey_facts`      | `falsey`      | `falsey_fact`       | ファクトごと             |
| `post_return_facts` | `post_return` | `post_return_fact`  | ファクトごと             |
| `mutations`         | `normal`      | `mutation`          | 変更ごと                 |
| `invalidations`     | `normal`      | `invalidation`      | ファクトごと             |
| `exceptional`       | `exceptional` | `exception`         | `:raise`                |
| `role_conformance`  | `normal`      | `role`              | ロールごと               |

ファクトごとのターゲットは、ペイロードに`#target`アクセサーが存在する場合（型付きファクトキャリア、変更エフェクト）はそこから取得し、ない場合はペイロード自体がマージキーになります。この展開は機械的・決定論的で、逆変換可能です。結果を`Merger.merge`に戻すと同等のバンドルが得られます。

### `Rigor::FlowContribution::Element`

フリーズされた`Data.define(:target, :edge, :kind, :payload, :provenance)`値オブジェクト。コンストラクターは`edge`と`kind`を`ELEMENT_VALID_EDGES` / `ELEMENT_VALID_KINDS`のenumに照らして検証します。`#merge_key`はマージャーがグルーピングに使う`[target, edge, kind]`タプルを返します。

### `Rigor::FlowContribution::Conflict`

フリーズされた`Data.define(:target, :edge, :kind, :reason, :provenances, :message)`。`reason`はスライス3enumのいずれかです。

- `:return_type_collapse` — インターセクションが空になる同一ティアの戻り型。
- `:exceptional_disagreement` — 同一ティアで非`nil`の例外エフェクトが一致しない。
- `:lower_tier_contradiction` — 下位ティアのコントリビューションが上位ティアの証明を弱めるまたは矛盾する。

`provenances`にはすべての貢献した{FlowContribution::Provenance}が入ります（通常は2つ — 上位ティアと矛盾する側）。`#to_h`は診断/フォーマッター出力向けにコンフリクトをレンダリングします。

`#to_diagnostic(path:, line:, column:, severity: :error)`（スライス5-C）はコンフリクトを`Rigor::Analysis::Diagnostic`に変換します。`source_family: :contribution_merge`と、コンフリクト理由から派生したケバブケースの`rule`（`return_type_collapse` → `return-type-collapse`）を持ちます。スライス4の配線がコンフリクトを発行すると、qualified ruleは標準の`rigor check`テキストストリームで`[contribution_merge.return-type-collapse]`としてレンダリングされます。

### `Rigor::FlowContribution::MergeResult`

`FlowContribution`の8つのコンテンツスロット（`return_type`・`truthy_facts`・`falsey_facts`・`post_return_facts`・`mutations`・`invalidations`・`exceptional`・`role_conformance`）、`provenances`（貢献した全来歴の順序付きリスト）、`conflicts`（収集した`Conflict`行）を持つフリーズ済み値オブジェクト。`#conflict?`と`#empty?`は述語メソッドで、`#to_h`は診断向けに結果をレンダリングします。

### `Rigor::FlowContribution::Merger`

ステートレスなモジュールレベルのエントリポイント。2つの公開メソッドを持ちます。

- `Merger.merge(contributions)` — バンドルの配列をマージポリシーに沿って畳み込み、`MergeResult`を返します。
- `Merger.tier_for(provenance)` — マージャーが内部で使用するティアマッピングを公開します（診断フォーマッターに有用）。

### `Rigor::FlowContribution::Fact`（スライス4-A）

4つのエッジ対応ファクトスロット（`truthy_facts`・`falsey_facts`・`post_return_facts`、および将来のロール/変更のFactシェイプバリアント）向けの標準スロットペイロード。[ADR-7 § "Slice 4-A"](../../adr/7-v0.1.0-slice-decisions/)でピン留めされており、4つの並列コントリビューションキャリアを単一の比較可能なシェイプに統一することで、マージャーの重複排除/インターセクションルールが均質なペイロード型の上で動作できるようになります。

| フィールド | 役割 |
| ------------- | --- |
| `target_kind` | `:parameter`または`:self`。将来のkind（`:local`・`:ivar`・`:result`）はマージャーを変更せずに追加可能。 |
| `target_name` | `Symbol` — 宣言されたパラメーター名、またはリテラル`:self`。非nilなので`#target`は常に定義済みです。 |
| `type`        | `Rigor::Type::*` — ターゲットがナローイングされる型（`negative`がtrueの場合は除外方向）。 |
| `negative`    | `~T`形式（`predicate-if-true x is ~Integer`）の場合は`true`、通常の正形式の場合は`false`。 |

`#target`はself対象のファクトには`:self`を返し、それ以外には`[:parameter, name]`を返します。この値は`Element#target`に入り、マージバケットキーになります。つまり異なるソースファミリーから同じパラメーターをナローイングする2つのファクトは、ソースファミリーに関係なく同じグループにまとめられます。

### 変換境界

4つの並列キャリアは`Fact`との間で変換されます。

- **`Rigor::RbsExtended::PredicateEffect#to_fact`** — クラス名エフェクトは`Nominal[<class>]`型のファクトに昇格します。絞り込みフォームのエフェクトは`refinement_type`をそのまま渡します。`edge`フィールドは残りません。結果のファクトが入るスロット（`truthy_facts` / `falsey_facts`）がそれをエンコードします。
- **`Rigor::RbsExtended::AssertEffect#to_fact`** — 同じシェイプです。`condition`フィールド（`:always` / `:if_truthy_return` / `:if_falsey_return`）は`read_flow_contribution`境界でスロットをルーティングし（`:always` → `post_return_facts`、`:if_truthy_return` → `truthy_facts`、`:if_falsey_return` → `falsey_facts`）、Fact自体には現れません。
- **組み込みナローイングファクト** — スライス4の実装者が`Inference::Narrowing`をマージャー経由で配線する際に変換を追加します。
- **プラグインコントリビューション** — スライス5の発行プロトコルは、`truthy_facts` / `falsey_facts`スロットがすでに`Fact`配列になっている`FlowContribution`バンドルを返します。

## 権限ティア

| ティア | ソースファミリー | 備考 |
| ---- | ------------------------ | ----- |
| 0    | `:builtin`               | Rubyのコアセマンティクス＋受け入れ済みRBS契約。権威あるもの。 |
| 1    | `:rbs_extended`          | `RBS::Extended`ディレクティブバンドル（v0.0.9グループD参照実装）。 |
| 1    | `:generated`             | 生成されたシグネチャ/メタデータ。 |
| 2    | `:plugin`、`plugin.<id>` | プラグインコントリビューション。 |
| 3    | その他すべて              | 不明 — 報告されますが最低ティアとして扱われます。 |

ティア内では、コントリビューションは決定論的な順序でマージされます。来歴が提供する`plugin_id`のアルファベット順（nil plugin idは先頭にソートされ、`:rbs_extended` / `:generated`のプレプラグインコントリビューションを安定させます）、その後は元の入力位置が最終的なタイブレークになります。

## 合成ルール（ADR-2準拠）

- **`:return_type`**。`Rigor::Type::Combinator.intersection`でインターセクトします。マージャーは相互`accepts`三値論理でコラプスを検出します。どちらの側も相手を受け入れない（`a.accepts(b).no? && b.accepts(a).no?`）場合、値のドメインは互いに素でインターセクションは空です。同一ティアでのコラプスは`:return_type_collapse`を、下位ティアがトリガーしたコラプスは`:lower_tier_contradiction`を発生させます。結果は上位ティアの値をスロットに保持します。
- **`:truthy_fact` / `:falsey_fact` / `:post_return_fact`**。エッジローカル。プラグインのtrueエッジのファクトはfalseエッジの補集合を意味しません。同一ティアおよびクロスティアのファクトは、ペイロード等値性による重複排除をしながら蓄積されます。
- **`:mutation` / `:invalidation` / `:role`**。ユニオン。等値性による重複排除。
- **`:exception`**。単値。等しい例外エフェクトは黙ってコラプスします。等しくないエフェクトは`:exceptional_disagreement`（同一ティア）または`:lower_tier_contradiction`（下位ティアが上位ティアに挑戦）のいずれかを発生させます。

## スライス3が意図的に行わないこと

- **組み込みナローイングをマージャー経由でルーティングすること**。スライス4の仕事です。
- **コンフリクトを`:contribution_merge` `Diagnostic`行として診断すること**。スライス5がプラグイン診断の来歴をフォーマッターに通します。スライス4が解析中にコンフリクトを表面化させます。
- **マージ結果から`Cache::Descriptor`行を合成すること**。スライス6がプラグイン側のキャッシュプロデューサーと並行してそれを担います。
- **より豊かな戻り型コラプスケースの検出**。スライス3のヒューリスティックは`accepts`三値論理を使います。非名前的キャリア（コラプスするタプルインターセクション、すべての定数を排除する絞り込み述語との構造的インターセクション）は今のところ非コラプスとして処理されます。スライス4がキャリアの全行列を検証し、見逃したケースをマージャーにフォールドバックします。

## ラウンドトリップ特性

この展開は可逆に実装されています。

```ruby
contribution = Rigor::FlowContribution.new(...)
elements     = contribution.to_element_list
merged       = Rigor::FlowContribution::Merger.merge([contribution])
# merged は `contribution` と同じスロットを持ち、来歴と空のコンフリクトリストを加えます。
```

スライス4はこのラウンドトリップをアナライザーの既存のナローイング呼び出しサイトと並行して検証します。
