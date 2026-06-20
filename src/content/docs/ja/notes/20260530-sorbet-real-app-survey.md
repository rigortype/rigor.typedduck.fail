---
title: "実アプリでのSorbet/Tapioca調査 — strap + dependabot-core"
description: "rigortype/rigor docs/notes/20260530-sorbet-real-app-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260530-sorbet-real-app-survey.md"
sourcePath: "docs/notes/20260530-sorbet-real-app-survey.md"
sourceSha: "b271585d43050af6e9e8d9990aa64a63482551231a38c968ed1ef2e541c3a97d"
sourceCommit: "a5d648b126d5ed7b1e04a16a87927bca7883e069"
translationStatus: "translated"
sidebar:
  order: 20266530
---

日付: 2026-05-30。

ステータス: **調査ノート**。

出荷済みのrigor-sorbet修正を1件主導し（attr-accessorのsig、コミットb1fe2aaf）、ユーザー定義ジェネリクスの変換変更（48f0719b）が実コード上で偽陽性（false positive）を生まないか検証した。

対象（`~/repo/ruby/rigor-survey/`配下にクローン）:

| アプリ | 規模 | Sorbetの利用状況 |
| --- | --- | --- |
| [strap](https://github.com/MikeMcQuaid/strap) | 小規模なRailsアプリ | `sorbet/rbi/`（Tapioca）、sigファイル4個 |
| [dependabot-core](https://github.com/dependabot/dependabot-core) | 30 gemのモノレポ、1588個の`.rb` | **745個のsigファイル**、13Mの`sorbet/rbi/` |

方法: `rigor-sorbet`を有効にして`rigor check --format json`を実行する。ユーザー定義ジェネリクスの変更については、`translate_user_subscript`ブランチを有効にした場合とコメントアウトした場合とで診断結果の集合を差分比較する。

## Finding 1 — ユーザー定義ジェネリクスの変換変更は偽陽性中立であり、かつここでは何も起きない

どちらのアプリもsig位置では**`T::`名前空間のジェネリクスのみ**（`T::Array`、`T::Hash`、`T::Enumerator`）を使っており、`Result[T, E]`のような非`T::`のユーザー定義ジェネリクスは書いていない。したがって48f0719bの変換変更はどちらでも発火せず、前後の差分は**新規0件、除去0件**（strap: 5→5、dependabotのサブセット: 変化なし）。Mangroveの結果（発火するが新規0件）と合わせて、この変更は3つの実Sorbetプロジェクトにわたって偽陽性中立であることが確認された。この変更が鋭くするsig内ユーザー定義ジェネリクスのパターンは、**主流のSorbetコードでは稀**（`T::*`ジェネリクスに依存する）であり、ほとんどはライブラリ側の関心事である（Mangrove風の`Result`/`Option`/カスタムコンテナのキャリア（carrier））。

## Finding 2 — attr-accessorのsigの偽陽性（修正済み）

dependabot-coreは実際の偽陽性を顕在化させた。`common/lib`の10ファイルのサブセットが**85件の`plugin.sorbet.parse-error`**診断を生成し、いずれも同一だった: 「`sig`ブロックの直後にメソッド定義が続いていない」。すべてが次のイディオムだった:

```ruby
sig { returns(String) }
attr_reader :name
```

rigor-sorbetのカタログウォーカーは`sig`を後続の`def`としか対応付けなかったため、`attr_reader` / `attr_writer` / `attr_accessor`に対するsigは宙に浮いたsigとして読まれた。これは広く使われる正当なSorbetパターン（生成されたアクセサに型を付ける）であり、10ファイルで85件の誤った警告が出た。**修正済み**（コミットb1fe2aaf）: ウォーカーは属性マクロをsigの対象として認識し、アクセサのシグネチャを記録するようになった（readerは`name`、writerは`name=`、`attr_accessor`では両方、複数名形式では各名前を記録）し、警告を出さなくなった。サブセットの診断は**87 → 2**に減少した。

同じ根本原因の2件目（sigが裸の`def`としか対応付けられない）: **可視性でラップされたdef**の上にあるsig — `private def foo`、`private_class_method def self.bar`、`module_function def baz`（および`public` / `protected` / `public_class_method`の各バリアント） — も宙に浮いたsigとして読まれた。dependabotの`registry_client.rb`は`private_class_method def self.x`を使っている。**修正済み**（コミット保留中）: ウォーカーはマクロを剥がして内側のdefに型を付ける。両方の修正により、**`common/lib`の34ファイルのサブセットは多数の誤ったparse-errorから0件になった**（`rbs.coverage.missing-gem`のinfoが1件残るのみ）。

## Finding 3 — 運用上のメモ

- **依存先のRBSカバレッジ:** dependabotの`Gemfile.lock`には**RBSが利用できないgemが125個**ある（rigorはこれを`rbs.coverage.missing-gem`のinfoとして報告する）。それらのサーフェス（surface）は`untyped`に縮退する（寛容で、偽陽性なし） — ただし`rbs collection install`や`dependencies.source_inference:`なしではrigorが検査できる範囲が頭打ちになる。
- **パフォーマンス:** `common/lib`全体（93ファイル）の実行は4分超でも完了しなかった。13Mの`sorbet/rbi/`の走査に加え、dependabotのメタプログラミング重めのファイルが高コストである。ファイル単位では高速（コールドな環境構築〜2.6秒のあと、解析は〜1.5秒）。診断プロファイル＋偽陽性差分には10ファイルのサブセット（`rbi_paths: []`付き）を使った。将来的にRBIツリーの走査／大きいファイルの解析にパフォーマンス対応を入れれば、モノレポ全体の実行も現実的になるが、本調査の対象外。
- **strapの診断**（計5件）は4件が`String#html_safe`の未定義メソッド — `rigor-activesupport-core-ext`が対処するActiveSupportの`core_ext`のギャップ — に加えてmissing-gemのinfoが1件だった。rigor-sorbetの関心事ではない。

## まとめ

実際にTapiocaを使うアプリに対してrigorを走らせることが、rigor-sorbetの偽陽性を見つける最も歩留まりの高い方法である。主流のSorbetイディオム群（sigilの規律、`T::*`ジェネリクス、`attr_*`のsig、`Generated*`のDSLモジュール）こそが堅牢化すべき対象であり、風変わりなサーフェスではない。attr-accessorのsigは2つのアプリが露呈させた唯一の真の偽陽性であり、いまや解消済みである。
