---
title: "Struct / Encodingカバレッジ監査"
description: "rigortype/rigor docs/notes/20260523-struct-encoding-coverage.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260523-struct-encoding-coverage.md"
sourcePath: "docs/notes/20260523-struct-encoding-coverage.md"
sourceSha: "987e521ddf75a22c49572336bf658940182df522d03f9172bb7f4e9597596875"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "translated"
sidebar:
  order: 20266523
---

2026-05-23生成 — post-`c9a535a`の`rigor-type-coverage-uplift`ラインのPhase 5成果物。Phase 5のスコープは「残りの低優先度キャリア」であった。両型に対するauditの結論は**決定**であり、dispatchスライスではない。一方はADR化に値する機能として延期され、もう一方は恒久的な対象外として推奨される。

---

## 1. Struct — 延期（struct-shapeキャリアが必要；ADR化に値する）

### 現状

`Struct.new(*members)`は新しい匿名サブクラスを返す。`STRUCT_CATALOG`は防衛的な設計になっている（`struct_catalog.rb`を参照）：`Struct`をレシーバークラスとして認識し、`Struct.new`をオプションのクラスボディブロックに対して`:block_dependent`に分類し、「仮想的な将来の`Constant<Struct>`キャリア」に対して`:[]` / `:hash` / `:initialize_copy`をブロックリスト登録済みとしている。

`spec/integration/fixtures/struct_catalog.rb`は現状を固定している：

```ruby
klass = Struct.new(:foo, :bar)   # => Nominal[Struct]
inst  = Struct.new(:foo).new(1)  # => Dynamic[top]
```

`inst.foo`は畳み込みできない。サブクラスごとのメンバーレイアウトをモデル化するものが存在しないためである。

### coverage-upliftスライスではない理由

Structメンバーへの精密なアクセス（`Point = Struct.new(:x, :y); p = Point.new(1, 2); p.x  # Constant[1]`）には、dispatchティアへのエントリーではなく、**2つの新しいキャリア**が必要である：

1. **struct-classキャリア** — 順序付きメンバー名リスト（および`keyword_init:`フラグ）でパラメータ化された匿名`Struct`サブクラス。
2. **struct-instanceキャリア** — メンバー名→値の型のマッピング。本質的にクラスタグを持つ`HashShape`であり、`.x` / `.x=` / `[]` / `to_h` / `deconstruct`が精密に射影される。

これは本物の機能であり、実際の設計上の問題を含んでいる。そのいずれもcoverage-upliftコーパスでは決定されていない：

- `Struct.new`のクラスボディブロック（`do … end`）は追加のメソッドを定義できる — キャリアはそれが発生した場合に安全にデグレードしなければならない；
- `keyword_init: true`の構造体、位置引数版Struct、およびRuby 3.2のハイブリッド；
- structのサブクラス（`class Point3D < Point`）；
- イミュータブルな兄弟型**`Data.define`**（Ruby 3.2以降） — `Data`インスタンスはfrozenであるため、キャリアの健全性の議論がより単純になり、`Struct`よりも適切な最初のターゲットとも言える。

### 推奨

Struct / Dataの値の畳み込みは、自律的なcoverageスライスではなく、**専用のADRを持つ独立した機能**（キャリア群への追加 + `Struct.new` / `Data.define`のブロックデグレード契約）として扱うこと。`HashShape`キャリアは明らかな構造的先例である。このauditによる実装は認可されていない。

---

## 2. Encoding — 恒久的な対象外として推奨

### 現状

`ENCODING_CATALOG`は`STRUCT_CATALOG`と同じ形で防衛的な設計になっている：`Encoding`は認識済みのレシーバーであり、RBSティアは`Nominal[Encoding]`を返し、レジストリを走査するシングルトン（`Encoding.find` / `.list` / `.aliases` / `.name_list`）およびミューテーティングセッター（`default_external=` / `default_internal=`）はプロセスレジストリ依存としてブロックリスト登録済みである。

### キャリアがコストに見合わない理由

`Constant[Encoding]`キャリアが畳み込めるのは、ごくわずかな表面に限られる：

- `Encoding::UTF_8.name` → `Constant["UTF-8"]`、`.dummy?` → `Constant[false]`、`.ascii_compatible?` → `Constant[true]`。

実際のプログラムは`Encoding`オブジェクトに対して静的計算を行わない — この型は`String#encode` / `#force_encoding`に渡される不透明なタグとして使用される。ブロックリスト登録済みのレジストリメソッド（興味深い戻り値を持つ唯一のもの）は、その答えがアナライザープロセスに依存するため、ブロックリスト登録済みのままとなる。既存の`Nominal[Encoding]`の答えに対する精度向上は無視できる程度であり、新しい`SCALAR_CLASSES`のメンバーを追加するたびにキャリア群が拡大される（Ractorの共有可能性、`describe`、`erase_to_rbs`、`==` / `hash`契約）が、ユーザーへの利益はない。

### 推奨

**`Encoding`定数キャリアを追加しないこと**。現在の`Nominal[Encoding]`の答えは正確かつ十分であり、`ENCODING_CATALOG`の防衛的なブロックリストはすでに健全でないパスをカバーしている。これは意図的な恒久的な対象外であり、問題が再議論されないよう記録する。

---

## 3. Phase 5の成果

| 型 | 判断 | 理由 |
|----|------|------|
| Struct / Data | 延期（ADR化推奨） | struct-shapeキャリア2種が前提。実機能でありcoverageスライスではない。 |
| Encoding | 恒久的に対象外 | キャリア新設のコストに見合う精度向上がない。`Nominal[Encoding]`で十分。 |

coverage-upliftラインのPhases 1–4はdispatch / carrierスライスとして着地した。Phase 5は、残りの2つの候補がそれぞれ延期された機能と恒久的な対象外であることを記録することで、このラインを締めくくる。
