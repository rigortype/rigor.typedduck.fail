---
title: "コーパス全体の不透明性の帰属 — 25個の対象で型がどこに付かないか"
description: "rigortype/rigor docs/notes/20260901-corpus-opacity-attribution.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260901-corpus-opacity-attribution.md"
sourcePath: "docs/notes/20260901-corpus-opacity-attribution.md"
sourceSha: "e0054a88a926859cbd4d15ccd8d4c98a1954b0e94361dcf6131be5f683235d46"
sourceCommit: "8e1432f5ada5240b33f140cb2024e6025450b2f9"
translationStatus: "translated"
sidebar:
  order: 20266901
---

ステータス: 計測ノート。masterの`2d0ffe6f`（v0.3.6以降）。[`20260831-self-check-type-coverage-audit.md`](../20260831-self-check-type-coverage-audit/)の続編である。前作はこのリポジトリ自身の`lib`における精度の探索を閉じ（パラメータ、ADR-67、ゲートされている）、コーパスの形をした2つの問いを未決のまま残した: 実在のアプリケーションにおける「レシーバーは名指せるがディスパッチはDynamic」な呼び出しが実際には何なのか、そして`unsupported_syntax`——redmine / mastodonで保護されていないサイトの原因の29.7% / 44.0%——が実際に何を名指しているのか。

## 手法

25個の互いに素な対象に対して8体の解析エージェントを走らせた: このリポジトリの`lib`、redmine、mastodon、そして22個のgem／コーパスであり、テンプレートエンジン（liquid・kramdown・haml・slim・hamlit・erubi・herb）、ネットワーク／シリアライゼーション（faraday・net-ssh・mail・jbuilder・tdiary-core）、ネイティブ拡張のgem（oj・ox・numo-narray・pycall・rbnacl・protobuf）、インフラ（concurrent-ruby・rubocop-ast・parser・rgl・algorithms）、自前RBSを持つgem（textbringer）、そして3つの素のRubyの練習用コーパスにまたがる。対象ごとに: `rigor coverage`、`coverage --protection --format json`（原因のヒストグラム）、そして共有の帰属のプローブが、すべての不透明な式についてそのノードクラス、ローカル読み取りのパラメータのバケット、呼び出しのレシーバーの層、そしてディスパッチが依然としてDynamicと答える（精密なレシーバー,メソッド）の組を記録する。以下のカテゴリーD（エンジンのギャップ）の主張はすべて同一ファイル内の対照の再現によって検証されており、各機構の再現手順は25個の対象ごとのケースレポートとともにブランチ**`opacity-sweep-harness-20260901`**（`tool/opacity-sweep-20260901/`）に保存されている。プローブはCLIに対して整合性を確認した（kramdownで式の数と比がバイト同一）。

対象ごとのサイト数のすべてを縛る注意点が1つ: このプローブは[#513](https://github.com/rigortype/rigor/issues/513)の過小にシードされたレンズを共有しているので、checkの走査の11テーブルのシードがレンズには解決できないクロスファイルの呼び出しを解決する箇所では、カウントがプロダクトレベルの穴を過大に述べる。同一ファイル内で検証された機構は影響を受けない;#513自体は8体のエージェントのうち4体が独立に再確認しており、このスイープのウェーブ0の修正である。

## 見出しの数字

| 対象 | ファイル | 式 | 精度 | 保護 |
| --- | --- | --- | --- | --- |
| rigor-lib | 430 | 167,079 | 58.9% | 45.7% |
| redmine | 346 | 128,495 | 47.8% | 35.0% |
| mastodon | 1,325 | 150,145 | 48.9% | 34.0% |
| textbringer（自前sig/） | 77 | 32,923 | 66.5% | 52.1% |
| herb（自前sig/） | 42 | 22,027 | 60.7% | 48.1% |
| 他20個のgem／コーパス | 1,398 | 約63万 | 37.6〜67.6% | 16.4〜57.8% |

（mailの97.8%という精度はragelのテーブルの定数による水増しである;比較可能な不透明な質量は約9,300。対象ごとの完全な表はブランチの`reports/*.summary.json`にある。）

25個すべてにわたる不透明性のカテゴリー別合計（報告されたままのサイト数;プローブのレンズ。上記の注意点を参照）:

| カテゴリー | サイト | 読み方 |
| --- | --- | --- |
| A — パラメータ由来（ADR-67、クローズ済み） | 約64,000 | どこでも支配的: 対象ごとに不透明性の18〜30%、加えてその算術／ivarへの波及 |
| G — join／ミラーによるメトリックの人工物 | 約27,800 | If/And/Or/Block/EmbeddedStatementsが内側の不透明な式を映している;独立した穴ではない |
| C — Dynamicを含むコンテナの伝播 | 約18,400 | `Hash[K, Dynamic]#[]`など;起点はほぼ常に1ホップ上のAかB |
| E — フレームワーク／プラグインの領分 | 約11,000 | Railsのサーフェスに集中;[#534](https://github.com/rigortype/rigor/issues/534)・[#460](https://github.com/rigortype/rigor/issues/460) |
| D — エンジンのディスパッチのギャップ | 直接約5,900 | 修正可能なレーン;レシーバーを1つ直すごとに連鎖がDynamicでなくなるので、直接のカウントは下限である |
| F — 「サポートされていない構文」 | ラベル上約4,300 | **約95〜99.9%が誤ラベル**;本物の構文はコーパス全体で約100〜200サイト |
| B — RBSの欠落 | 約3,300 | 対象の形に依存: net-ssh（OpenSSL）・rubocop-ast（parser gem）・numo（自前のC API）では決定的 |

## 監査が未決のまま残した2つの問いへの答え

**`unsupported_syntax`という原因は誤称のバケットである**。すべての対象で分解した: mastodonの9,070件の原因サイトは26,505個の担い手ノードへ遡れるが、そのうち本当にモデル化されていないPrismの構文は**27**個である（`CallOperatorWriteNode` 20、`CallOrWriteNode` 7）;redmineは19,408個のうち37個、textbringerは692個のうち5個。それ以外はすべて名前解決だ——未解決の暗黙self送信（フレームワークのDSL、concernのメソッド）、連鎖から継承された持ち越し、未解決の定数（Zeitwerkの暗黙の名前空間、宣言されていないフレームワーク／gemの定数）、そして名指されたレシーバー上の未解決のディスパッチ。2つのラベルのバグがそれを増幅している: レシーバーが発見されたプロジェクトのdefを**持つ**呼び出しは、本体の推論が辞退したときに`inferred_return_untyped`を失い（[#522](https://github.com/rigortype/rigor/issues/522)）、そしてWD9の欠落gemのインデックスは、スーパークラス、請求されていないロックのエントリー、ロックファイルのない対象を通じて過小に請求する（[#530](https://github.com/rigortype/rigor/issues/530)）。

**「レシーバーは名指せるがDynamic」の組は短い機構のリストへ分解される**。それぞれ4〜12個の対象で相互に確認され、同一ファイル内で検証されている:

| 機構 | 広がり | issue |
| --- | --- | --- |
| ユーザーメソッドの戻り値推論における、オプショナル／可変長／キーワード／ブロックのパラメータでのシグネチャごとの脱出 | 10対象;最も広いレバー | [#524](https://github.com/rigortype/rigor/issues/524) |
| `T \| nil`のレシーバーのディスパッチが丸ごと辞退する（nilの腕がユニオンを拒否する） | 13の対象グループ中12 | [#519](https://github.com/rigortype/rigor/issues/519) |
| ぼっち演算子が素の呼び出しとして型付けされる——`s&.to_s`がnilを落とす（単なる不正確さではなく誤った型） | 普遍的 | [#518](https://github.com/rigortype/rigor/issues/518) |
| 代入式が右辺ではなくライターの戻り値として型付けされる | 普遍的 | [#520](https://github.com/rigortype/rigor/issues/520) |
| 祖先の走査の欠落: ソースのサブクラス → RBSのクラス、RBSモジュールのinclude、`include Singleton`、concernのdef | 7対象 | [#527](https://github.com/rigortype/rigor/issues/527) |
| `extend M` / `extend self`がシングルトンのディスパッチから不可視 | 4対象 | [#526](https://github.com/rigortype/rigor/issues/526) |
| `Struct.new`のファクトリー: doブロックの本体がメンバー・`.new`・selfのスコープを失う | 6対象 | [#525](https://github.com/rigortype/rigor/issues/525) |
| RBSの`Alias` / `Intersection`がuntypedへ変換される（prismの`type node`が潰れる） | RBSを持つすべての対象 | [#529](https://github.com/rigortype/rigor/issues/529) |
| Zeitwerkの暗黙の名前空間が解決不能（`Api`・`REST`） | Railsアプリ | [#528](https://github.com/rigortype/rigor/issues/528) |
| 非リテラルのサイズを持つ`Array.new(n, fill)`が要素の型を捨てる | 3コーパス、約500サイト | [#531](https://github.com/rigortype/rigor/issues/531) |
| オーバーロードの選択が、Dynamicな判別子に対して誤った精密な腕をピン留めする（`[true] * n` → String） | 偽陽性に関わる | [#521](https://github.com/rigortype/rigor/issues/521) |
| `x.attr \|\|= v`のファミリーが未処理（型付け＋広げ。#504の兄弟） | 唯一の本物の構文のギャップ | [#532](https://github.com/rigortype/rigor/issues/532) |
| 検証済みの小さなギャップ8件（ヒアドキュメント定数のディスパッチ、`alias_method`、`send(:sym)`、refineされたレシーバーの探索、`Proc#[]`、`::Queue`のエイリアス、条件付きスーパークラス、空配列のインデックス変異） | 散在 | [#533](https://github.com/rigortype/rigor/issues/533) |

計測側: 精度の分類器はData/Struct/BoundMethodのキャリアを不透明として数える——`lib`だけで810サイト（[#523](https://github.com/rigortype/rigor/issues/523)）——そしてレンズは過小にシードする（[#513](https://github.com/rigortype/rigor/issues/513)）。

## 原型が語ること

自前RBSの原型（textbringer・herb）は2026-06-01の発見——カバレッジの天井＝自前RBSの完全性——を裏付け、そしてそこがDが判定可能になる場所である: herbのsigは`Token#value: String`を宣言しており、レシーバーの`?`だけがそれを捨てている。初心者の原型（3コーパス）はAが1桁多く、その非Aの残りはちょうど3つの機構に集中する（#531、`gets`経由の#519、`::Queue`のエイリアス）。ネイティブ拡張のファミリーは、どこでもレシーバーの同一性を保ちながら戻り値と定数を失い、純粋なB（numo——RBSのサイドカーがこれを丸ごと変換する）、[#141](https://github.com/rigortype/rigor/issues/141)としてすでに起票されているFFIプラグインの機会（`attach_function`が名前・アリティ・型を運ぶ;rbnacl・pycall・protobufを一度に払う）、そして実行時のクラス生成（プラグインか無かの二択）に分かれる。Railsアプリに特徴的な質量はE（[#534](https://github.com/rigortype/rigor/issues/534)）に加えて、上記の誤ラベルされた名前解決の話である。

## このノートが主張しないこと

サイト数はプローブのレンズによるカウントであり（#513の注意点を参照）、D以外のバケットへのカテゴリーの割り当ては解析エージェントの判断であって、網羅的に裁定されたのではなく抜き取りで検証されたものである。A／ADR-67とADR-58の結論はここでは蒸し返さない——このスイープはそれらを数えて先へ進む。D内部の修正の順位付けは、偽陽性優先の価値観に従い、生のサイト数より偽陽性への関わり（#521の誤った精密なピン留め）を意図的に重く見ている。
