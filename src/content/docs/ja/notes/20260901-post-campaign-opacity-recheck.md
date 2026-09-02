---
title: "キャンペーン後の不透明性の再帰属 — マージ済みmasterでのスイーププローブ再実行"
description: "rigortype/rigor docs/notes/20260901-post-campaign-opacity-recheck.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260901-post-campaign-opacity-recheck.md"
sourcePath: "docs/notes/20260901-post-campaign-opacity-recheck.md"
sourceSha: "59a3b8b962be24bb4d6ffdf1f2951390d138e38dd0e4ee9f821915f93d7b4954"
sourceCommit: "8e1432f5ada5240b33f140cb2024e6025450b2f9"
translationStatus: "translated"
sidebar:
  order: 20266901
---

ステータス: 計測ノート。masterの`a7e5d805`（キャンペーンの20本のPRとADR-105がすべてマージ済み）。[`20260901-corpus-opacity-attribution.md`](../20260901-corpus-opacity-attribution/)の続編であり、そこに残っていた注意点を解消する: あのスイープのカウントは#535より前に、過小にシードされたレンズの下で取られたものであり、その引き継ぎ自身が、新しいレバーを見積もる前に再実行を要求していた。このノートがその再実行であり、加えて新しい数字が曖昧なまま残したすべてのクラスタに対する検証のパスである。

## 手法

保存されたプローブ（`opacity-sweep-harness-20260901`、元のものとバイト同一）を30個の対象すべてに対して再実行した。プローブは`CoverageScan.discovery_seeded_scope`とプラグインを意識した`ProjectContext`の環境を呼ぶので、#535以降は構成上、11テーブルの完全なシードを継承する——これらのカウントには#513の注意点はもう当てはまらない。4体の独立した検証エージェントが曖昧なクラスタ（Mutex／ジェネリックの束縛、redmineのARのファミリー、2件の精度の低下、そして雑多な集合）を裁定した。それぞれ同一ファイル内の対照と、ハーネスがそのシグナルを示せることを証明する陽性対照を伴っている。再実行の出力と帰属のハーネスは同じブランチ（`tool/opacity-sweep-20260901/rerun-20260901/`）に保存されている。

## 見出し

コーパスで重み付けした式の精度は**mailを除いて57.6%**である（総計1,193,501式;mailのragelの定数による水増しが97.98%で422k式を運ぶ）。アンカーとなる対象でのキャンペーンの差分: mastodonは**48.9 → 54.8%**（+5.9pt）、redmineは47.8 → 50.2%、rigor-libは59.3 → 61.3%（対応させたレンズ）、kramdownは+2.8pt、tdiary-coreは+2.8pt、herbは+2.7pt、rbnaclは+5.3pt;2つを除いてすべての対象が改善した:

- **numo-narrayの−3.44ptとData-Structures-and-Algorithms-in-Rubyの−0.54ptは意図したトレードであり、説明のつかない残余はゼロである**。 3つの腕のA/B（キャンペーン前の基準／基準＋#537／master）をすべての式について行単位で揃えると、損失したサイトはすべて#537（オーバーロードのDynamicのピン留め: `[true] * n`はもう`String`と答えない;数値演算がDynamicなオペランドをまたいでjoinされる）と#559（幻のHashの除去）に帰属する。どちらも「誤って精密」から「正直なDynamic」への訂正である;キャンペーンの他のコミットは両方の対象で正味プラス（+23 / +454）であり、算術の密なコードでは単に#537を相殺しきれないというだけだ。
- そのA/Bから得られた計測についての発見: 精度のレンズは`dynamic_top → dynamic_specific`の遷移（DSAで113、numoで74が残存）をゼロとして採点する一方、正直な広げを丸ごと損失として採点する——#537の形をした正しさの修正を系統的に過小評価するのだ。この2行は、追いかけるべきリグレッションとしてではなく、コーパスの偽陽性18件を殺したコストとして読むこと。

## 残る不透明性はどこにあるか（レシーバーが名指せるのに不透明な組、12,082サイト、全対象）

| レーン | サイト | 処遇 |
| --- | --- | --- |
| Railsのプラグインのサーフェス: `Parameters#[]` 1,077、`Rails.*`のリーダー288、Duration 195、Flash/Session/Request約350、sidekiq 64 | 約2,015 | [#534](https://github.com/rigortype/rigor/issues/534)——最も広く扱いやすいレバー |
| **rigor-activerecordがスキーマのないアプリで死んでいる**——`table_name`のファミリー517＋最初のホップの`.where`/`.visible`/`.find`約127、redmine | 直接約650 | **[#569](https://github.com/rigortype/rigor/issues/569)**（新規）: プラグインの`model_index`が`db/schema.rb`についてオールオアナッシングであり、redmineはそれをgitignoreしている;スコープ・関連・table_nameはスキーマを必要としない |
| コンテナ／古いシェイプ（`{}#[]=`・`Array[Dynamic]#[]`・タプルのmin/max…） | 約1,640＋素のコンテナ735 | 混在: [#560](https://github.com/rigortype/rigor/issues/560)のjoinのファミリー＋[#531](https://github.com/rigortype/rigor/issues/531)＋正直なCの伝播 |
| mailの構造体ファクトリーのアクセサ（`AddressStruct#local=`…） | 296 | [#525](https://github.com/rigortype/rigor/issues/525)——起票時の39から再計測で増えた;キャリアはすでに名指されており、辞退させているのはセッターの書き込み後の畳み込み安全性のゲートである |
| `singleton(User)#current`（redmine） | 494 | 正直: `ActiveSupport::CurrentAttributes`のマクロ＋Dynamicに根ざした`\|\|=`;完全なモデルがあっても`Dynamic \| User`が上限である。レバーとしては却下 |
| Mutex/Monitorの`#synchronize` | 75 | 66件中65件は正直な伝播（ジェネリックなXは正しく束縛される）;1サイトは新しい[#533](https://github.com/rigortype/rigor/issues/533)の項目9 |
| `Thread#[]`/`[]=`・`JSON.pretty_generate` | 78＋28 | 正直なRBSの`untyped`;JSONの組は畳み込みで狭められる唯一のもの——[#570](https://github.com/rigortype/rigor/issues/570)（新規） |
| ユーザークラスのアクセサ／パラメータの戻り値（Heap/Graph/Tree、`Type::*`のリーダー、Kramdown::Element…） | 6.7kの裾の大半 | クローズ済みのADR-67／ADR-58のパラメータのレーン;再開しないこと |

暗黙selfの不透明性（コーパス全体で37kサイト）はフレームワークの形のままである: 上位40のリストだけでもRailsのコントローラー／ビューのDSLが約4.7k、ARのマクロが約1.4k（[#534](https://github.com/rigortype/rigor/issues/534)の領分）、そしてmailの`chars`のクラスタ（218）と`Mail::Utilities.blank?`（41）は正直であることが検証された——#554のシングルトンの畳み込みは存在を正しく解決する;それらの本体は型なしのパラメータの上で動くので、戻り値のサマリーは本当に`Dynamic`を含むユニオンである。

## 新たに見つかり起票された機構

- **[#569](https://github.com/rigortype/rigor/issues/569)**——rigor-activerecordのオールオアナッシングなスキーマのゲート（上記）。この再実行が見つけた最大の単一の解放だ: redmineは現在ARの型付けをまったく得ていないので、カラムのない縮退した`ModelIndex`は構成上、加算的である。
- **[#533](https://github.com/rigortype/rigor/issues/533)の項目9**——ブロックの戻りを型付けするパスは本体の最後の文だけをエントリースコープで評価するので、`{ 42 }`は束縛されるのに`m.synchronize do v = 42; v end`はDynamicと答える。コーパスで2サイト;収穫のためではなく正しさのために記録する。
- **[#570](https://github.com/rigortype/rigor/issues/570)**——`JSON.generate`/`pretty_generate`を`String`へ畳み込む（upstreamのRBSは`untyped`と宣言している）。

## 計器についての発見（プローブの落とし穴の台帳へ追記）

- `rigor type-of`は発見でシードされたjoinを再現できない: 幻のHashのシェイプ（#553/#559）と`{}`でシードされたハッシュのjoinは、A/Bの**両方**の腕でtype-ofの下では`Dynamic[top]`と読める——type-ofだけの調査は「変化なし」と誤って結論する。束縛レベルの主張にはプローブの`discovery_seeded_scope`のレンズ（あるいは`check`そのもの）が要る。
- 精度の比は`dynamic_specific`を無価値として扱う（上記）;誤って精密な修正を順位付けする前に、偽陽性の集計と対にすること。

## この再実行後の順位付け

1. **[#569](https://github.com/rigortype/rigor/issues/569)**——境界の明確なプラグインの変更1つ。redmineで直接約650サイト、加えてスキーマのないすべてのRailsアプリ、偽陽性のサーフェスなし。
2. **[#534](https://github.com/rigortype/rigor/issues/534)**——まず`Parameters#[]`/`expect`/`slice`（1,077サイト）、次にRailsのリーダー／Duration／sidekiq;各サブ項目は既存のプラグインの偽陽性の議論の下で独立に着地させられる。
3. **[#560](https://github.com/rigortype/rigor/issues/560)**——**追加された**値のjoin: サイト数は少ないが、生きたalways-falseyの偽陽性のファミリーであり、mailのragelのクラスタも根を共有している。
4. **[#525](https://github.com/rigortype/rigor/issues/525)**——証拠が格上げされた（mailで296サイト）;設計のパスは今や、セッターの後に読むという畳み込み安全性の形もカバーすべきである。
5. 小粒／機会主義的: [#570](https://github.com/rigortype/rigor/issues/570)、[#533](https://github.com/rigortype/rigor/issues/533)の項目1/5/7/9、そして常設のready-for-humanの方針判断（[#541](https://github.com/rigortype/rigor/issues/541)・[#542](https://github.com/rigortype/rigor/issues/542)・[#531](https://github.com/rigortype/rigor/issues/531)）はこの再実行では変わらない。
