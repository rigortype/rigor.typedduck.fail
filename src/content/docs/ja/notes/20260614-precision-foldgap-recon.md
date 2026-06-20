---
title: "rigor-surveyに対する精度のfold-gap偵察（2026-06-14）"
description: "rigortype/rigor docs/notes/20260614-precision-foldgap-recon.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260614-precision-foldgap-recon.md"
sourcePath: "docs/notes/20260614-precision-foldgap-recon.md"
sourceSha: "32d8fbe10475b4f4da5564784d9f17107ca94ff9df832e4b30816fffc2e367cb"
sourceCommit: "7f5a54c352ff4370788bf7aef5fc1b70f8a92e4a"
translationStatus: "translated"
sidebar:
  order: 20266614
---

ステータス: ある時点の調査 + 記録されたブロッカーを伴う1つの発見。非規範的。

## 調査

実コード上の修正可能な型付けギャップを見つけるため、`rigor-survey`コーパスに対する広い3軸パス（精度 / FP / 歯）:

- **保護**（ADR-63 Tier 1）: ディスパッチサイトの17〜40 %が具体的なレシーバーを持つ（parser 19.7 % / kramdown 17.3 % / liquid 29.5 % / net-ssh 23.8 % / mail 40.5 %） —— ほとんどのディスパッチは`Dynamic`レシーバー上で、その大部分は**本質的**（型のないパラメータ、gemの戻り値、`Proc#call`）。
- **精度**（`coverage`）: 精密44〜56 %、**`dynamic_top` 44〜56 %**（mailは97 %定数で外れ値）。`dynamic_specific` ≈ 0。
- **FP**（`check`）: 低収率（コーパスがFPゲートだ）。`tdiary-core`の245件のうち234件はそのプラグインDSL由来の`call.unresolved-toplevel`（`h`/`bot?` —— エンジン修正ではなく`rigor-tdiary`プラグインが必要）;他は`loc()`形のnilableメソッド戻り値に対する`possible-nil-receiver`（真正に保守的、WD1bの判断 —— アーティファクトではない）。
- **歯**（ミューテーションスイープ）: parser/kramdownの生存者はほとんどがプロジェクト**自身**のクラスに対する`undefined_method`（ADR-43/24で先送り —— インソースのクラスでメソッドが不在だと証明できない）と、先送りされた`type_swap`チャネル（ADR-64）。

**結論: コーパスは成熟している**。残る穴は圧倒的に本質的なもの（エンジン修正ではなくプロジェクト側のRBS / `source_inference:`が必要）か、既に先送りされたものだ。

## fold-gapプローブ（コンテキスト認識）

`Scope.empty(environment:)`に対する最初のプローブは偽のfold-gap（`Array#any? → Dynamic`）を生んだ —— プロジェクト事前パスのシードを欠いていた。実パス（`Runner#seed_project_scope` + `ScopeIndexer.index`）を再現するよう再構築すると、偽のシグナルは消えた。残るCORE-レシーバー→Dynamicクラスタはすべて**要素/値の射影**（`Array#[]`/`#last`、`Hash#[]`）で、コンテナの要素/値の型が本質的に`Dynamic`（型のないソースから構築されたivar `Array[Dynamic]`）の箇所 —— fold gapではない。

## 唯一の本物のfold gap（発見、修正は差し戻し）

`MESSAGES = { … }.freeze; MESSAGES[reason]`は`Dynamic`と型付けされる（parser `messages.rb:120`）。根本原因: **identity / self返却メソッドがシェイプキャリアを劣化させる**。`{a: 1}.freeze` → `Hash`（`HashShape`を落とす）、`[1,2,3].freeze` → `Array`（`Tuple`を落とす）、`"x".freeze` → `String` —— `() -> self`がRBSを経由して*名前的*クラスに対して解決され、劣化した`Hash`が`#[]`を`Dynamic`にするからだ。変更を伴うself返却メソッド（`<<`、`merge!`）は本当にシェイプを変えるので保ってはならない;純粋なもの（`freeze`、`itself`、`dup`、`clone`）は保つべきだ。

その4つに対して（シェイプキャリア上で）レシーバー型を返す層がこれを修正した（`{…}.freeze; h[k]` → 値のユニオン;コーパスFP安全 —— mailを含む**8プロジェクトにわたる新規発火ゼロ**）。**しかし差し戻された:** rigor自身の定数フォルダーでは12件の再帰的な`flow.always-truthy-condition`を表面化させた —— rigorの自己解析が`receiver.public_send(method_name)`を定数にfoldするので、`foldable_constant_value?(result)`が証明可能に真になる（ランタイム可変な`public_send`に対する過剰fold）。プロジェクトの規律（原因を修正し、決してルールを`# rigor:disable`しない）に従えば、12件のdisableは受容できず、本当の根本 —— 再帰的な過剰fold + `always-truthy`エンベロープ —— は別の、より大きな変更だ。

**裁定:**本物のギャップ、ADRスコープの修正（再帰的な自己解析と絡んでいる）。迅速な勝利ではない。冷えた状態で再調査されないようここに記録する。
