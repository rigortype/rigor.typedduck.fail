---
title: "ADR-24 スライス4 — `call.self-undefined-method` WD4コーパスのFP評価"
description: "rigortype/rigor docs/notes/20260614-adr24-slice4-self-undefined-fp-eval.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260614-adr24-slice4-self-undefined-fp-eval.md"
sourcePath: "docs/notes/20260614-adr24-slice4-self-undefined-fp-eval.md"
sourceSha: "1044606996f1a5b96a77750bed6b876279a5672633ad11688f240c947778a102"
sourceCommit: "7f5a54c352ff4370788bf7aef5fc1b70f8a92e4a"
translationStatus: "translated"
sidebar:
  order: 20266614
---

Date: 2026-06-14。根拠: [ADR-24 §「Slice 4」](../../adr/24-self-method-call-resolution/)、[`docs/CURRENT_WORK.md`](../../current-work/) §（B）項目5。

## 目的

`call.self-undefined-method`（ADR-24スライス4）はすべてのプロファイルで**`:off`**で出荷され、Rigor自身の`lib`でFPクリーンだ。どのプロファイルでもオンにフリップする前に、ADRはコーパス偽陽性ゲートを要求する。これがその評価だ: ルールを有効化し（`balanced` → `:warning`）、`rigor-survey`コーパスをスイープし、すべての発火を裁定する。

## 方法

`balanced`プロファイルのエントリーを`:warning`へフリップし（ファイルスワップ、後で復元）、約26の`rigor-survey`ターゲットに対して`rigor check`を実行し、すべての`call.self-undefined-method`診断を収集し、`receiver_type`でバケット化し、発火サイトを読む。

## 結果 —— ルールは昇格不可

**コーパス全体で約454件の発火、本質的にすべて偽陽性**。2つのバケット:

### バケット1 —— `Object` / `BasicObject`レシーバー（287件、支配的） —— 修正済み

**普遍ベース**でタグ付けされた取りこぼしは、エンジンが実クラスを解決できずルートのself型へフォールバックしたことを意味する —— `class << self`ブロック、FFI / `define_method`のメタプログラミングサーフェス、クラスマクロ呼び出し（`private` / `include` / `attr_accessor` / `define_method`それ自身）。それらのインスタンスメソッド集合は決してプロジェクトで完全にならないので、取りこぼしはタイポではなく解決ギャップだ。ターゲットごと: protobuf 73、tdiary-core 199、pycall 10、textbringer 3、herb 2。

**修正着地:** `confidently_closed_self_class?`は今や`Object` / `BasicObject` / `Kernel`を除外する（`SELF_UNDEFINED_UNIVERSAL_BASES`）。純粋なナローイング —— 実プロジェクトクラス上の本物の発火を除去できない。protobuf 73 → 0を検証（プロジェクト全体のbefore/after）;`Object`列全体をクリアする。リグレッションspec追加（`class Object` / `BasicObject`を再オープン）。

### バケット2 —— 非`Object`レシーバー（167件） —— 部分的に対処

これらはゲートが「確信を持って閉じている」とみなす*名前付き*のプロジェクトクラス（スーパークラスなし、`include`/`prepend`なし、`method_missing`なし）で発火するが、呼び出しは有効だ。評価はいくつかの異なるサブクラスを見出した;2つは今や修正され、残りは残存する。

**修正済み —— 抽象 / テンプレートメソッドの基底クラス**。基底クラスが、自身では宣言せずに、サブクラスが実装するメソッドを*呼ぶ*メソッドを定義する: `Mail::CommonField#decoded`は`do_decode`を呼ぶ（すべての`< CommonField`サブクラスがそれを定義する）;`Mail::Retriever#find`はPOP3 / IMAPが実装する。**サブクラス認識ゲーティング**は今や、取りこぼされたメソッドがself-クラスの既知のサブクラスのいずれかに定義されている（def-nodeテーブル経由の素の`def`、または動的定義）とき、取りこぼしを抑制する —— `discovered_superclasses`の子→親マップを反転して辿り、記録された各（非修飾の）親名を子の名前空間で解決する。どのサブクラスも定義しない本物のタイポは依然発火する。

**修正済み —— 動的（非定数）スーパークラス**。`Mail::PartsList < DelegateClass(Array)`（および`< Struct.new(...)` / `< Data.define(...)`）は動的に生成されたサーフェスを継承する;レコーダーは非定数スーパークラスを決して記録しないので、ゲートはそのクラスをスタンドアロンと誤って扱った。`SelfClosednessScanner`は今や、非定数スーパークラスを持つクラスをオープンとマークする。

2つの修正のターゲットごとの効果: mail 12 → 0、faraday 5 → 2。

**残り（依然として偽陽性、ルールはオフのまま）**。クラスごとのゲートが依然見られないサブクラス:
- `Numo::NArray#…`（72件） —— **C拡張**クラス;そのメソッドサーフェスはCに存在し、ソースのみの「完全なサーフェス」の主張には不可視だ。
- `Concurrent::ThreadSafe::Util::Striped64#cells` / …（20件） —— メタプログラミングされた / プラットフォーム固有のプリミティブ;`Concurrent::…#java`（5件） —— JRuby専用メソッド。
- `TDiary::Application` / `TDiary::Style::*`（31件）、`RbNaCl::SimpleBox`（8件）、`Textbringer::*`（7件） —— メタプログラミング / プロジェクト固有のサーフェス。

## 決定

- **ルールを`:off`に保つ**。コーパスゲートは残りのバケット2のサブクラス（C拡張とメタプログラミングされたサーフェスが支配的）で依然として赤であり、クラスごとのソーススキャンは根本的にこれらを列挙できない。
- **普遍ベース除外**（バケット1、287件）**+ サブクラス認識ゲーティング + 動的スーパークラスガード**（バケット2の抽象ベース / デリゲートクラス、約15件）**を着地させた** —— すべて純粋なナローイングであり、今日ルールを使えるオプトインユーザー（`severity_overrides:`）にとって健全な漸進的精度の勝ちだ。
- スタンドアロンのみのゲートをスーパークラス / includeチェーン（スライス4バックログのもう半分）へ**広げない** —— C拡張 / メタプログラミングのFPクラスを拡大するだけだ。

## フォローアップ（需要ゲート付き）

サブクラス認識ゲーティング: 取りこぼされたメソッドがそのクラスの既知のサブクラスのいずれかに定義されているかを、レコーダーで記録する（プロジェクトクラス階層は既に発見インデックスにある）;そうであれば発火を抑制する。それが将来の昇格試行が必要とする形であり、この評価がそれが必要だという証拠だ。
