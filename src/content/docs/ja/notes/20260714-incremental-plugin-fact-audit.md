---
title: "プラグインファクトの漸進的健全性 — 監査＋実装の知見（2026-07-14）"
description: "rigortype/rigor docs/notes/20260714-incremental-plugin-fact-audit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260714-incremental-plugin-fact-audit.md"
sourcePath: "docs/notes/20260714-incremental-plugin-fact-audit.md"
sourceSha: "b18653fca3f6022535d562be89a9a35c4e01c4186bcd628606d2117109505924"
sourceCommit: "eb8e9996d113a1b5e1778d0988597c979814a219"
translationStatus: "translated"
sidebar:
  order: 20266714
---

[ADR-88](../../adr/88-incremental-plugin-fact-soundness/)の背景ノート。修正が触れるチョークポイントを地図化し、調査の知見を記録する——当初の仮説から外れた2件を含めて。

## ギャップ

`--incremental`の再チェックは2つの機構でゲートされるが、そのどちらも、プラグインが追跡しないファイルから導出したクロスファイルの寄与を見ていない。

1. **グローバルスナップショットフィンガープリント**——`Cache::IncrementalSnapshot.fingerprint`（`lib/rigor/cache/incremental_snapshot.rb`）は、解決済みの設定、解析ルート、`Gemfile.lock` / `rbs_collection.lock.yaml`、そしてプロジェクト自身の`signature_paths:`の`.rbs`内容をダイジェスト化する。プラグインの`paths:` / `rbi_paths:`のsigツリーや`db/schema.rb`などはダイジェスト化しない。
2. **ファイル単位の依存グラフ**——`Scope`のアクセサチョークポイント経由で記録される（`lib/rigor/scope.rb`: `user_def_for`が:372で`record_cross_file_method`経由で記録し、`superclass_of` / `includes_of` / `data_member_layout`がクラス祖先エッジを記録する）。プラグインは自身のカタログを内部的に（`sorbet.rb`の`io_boundary.read_file`で）読むのであってチョークポイント経由ではないので、エッジは一切記録されない。

具体的には、`rigor-sorbet`は`.rb`/`.rbi`のsigからカタログを構築し（既定は`rbi_paths: sorbet/rbi`）、`dynamic_return`型をクロスファイルに寄与する。`.rbi`を編集すると（解析対象でもシグネチャパスでもない）カタログが——そして全消費者の推論型が——変わるのに、グローバルフィンガープリントは新鮮なままで`ΔF`は空になる。再チェックは古いキャッシュ済み診断を提供してしまう。ARの`model_index` / `schema_table`プロデューサーやrails-routesの`helper_table`も同じ形をしている。

ADR-45の全実行キャッシュはこれらの実行では不活性なので（`Runner#run_result_cacheable?`が`record_dependencies` / `analyze_only`を除外する）、偶発的な保護も提供しない。

## 修正のサーフェス

- **WD1フィンガープリント**——`lib/rigor/analysis/plugin_fact_fingerprint.rb`が、（a）`Plugin::FactStore#each_fact`の公開、（b）各プラグインが宣言したプロデューサーの値（`Plugin::Base#producer_value`）、（c）オプションの`Plugin::Base#incremental_state_fingerprint`フックをダイジェスト化する。`plugin_fact_digest`としてスナップショットに乗る（`Payload`＋`SCHEMA` 8→9）。`IncrementalSession#run_incremental`で比較される。
- **WD2 sorbetプロデューサー**——`plugins/rigor-sorbet/lib/rigor/plugin/sorbet.rb`: `producer :catalog, watch: -> { catalog_watch_globs }`。`ensure_catalog`がキャッシュ済みバンドルを展開し、`harvest_path`が自身の`Dir.glob`をソートする。
- **WD3エッジ**——`lib/rigor/scope.rb#user_def_site_for`が`record_cross_file_method`を記録する。
- **WD4bローダー修正**——`lib/rigor/plugin.rb`（`@gem_registrations`、`record_gem_registration` / `ids_for_gem`）＋`lib/rigor/plugin/loader.rb`（`resolve_and_instantiate`）。

## 知見1——gitlabのverify-redはプロデューサーではなくプラグインローダーのバグ

当初の仮説（プロデューサーのキャッシュ済み状態≠新鮮、あるいは`Dir.glob`順序の非決定性）は**誤り**だった。gitlab上の`rigor check --verify-incremental app/models app/controllers`は漸進のみ1,161件／フルのみ19件で失敗し、すべて`:info`のAction Pack認識トレースで、キャッシュを**クリアしても**再現した（つまり古いディスク状態ではない）。

根本原因: verifyハーネスはベースライン→サブセット→フルを**単一プロセスで**実行し、`verify_full_diagnostics`が同じベア文字列プラグインセットに対する**2回目の**インプロセス`Plugin::Loader.load`になっている。`loader.rb#resolve_and_instantiate`では、`require_gem!`はgemの本体が1回目のロードですでに走った後にリターンするので、`newly_registered = (after - before)`は**空**になる。ベア文字列（`id:`なし）のエントリーでは`lookup_plugin_class!`が`when 0`に当たり、`"did not register any plugin"` LoadErrorになる。オラクルは黙ってプラグインを**ゼロ個**ロードし、正しい2,494件に対して101件の診断になった。分離テスト（`baseline`のあと単一プロセス内で新規の`Runner.new(cache_store: nil).run`）で直接再現した（2回目の実行で10件の`load-error`診断）。

修正: 最初のロードで`gem → 登録済みid`をメモ化し、再ロード時の`require`がno-opになりデルタが空のとき（`id:`なしエントリーに限って）それを復元する。修正後は2回目のインプロセス実行が同じ10プラグインをロードし、gitlabのverifyはバイト単位で一致する（887/1,774、2,494件、ミスマッチゼロ）。これは漸進セッション自身のサブセット再解析（2回目のインプロセスロード）も修正する。

WD2のglobソートはなお有効だ——クロス環境の非決定性に対する本物のロバストネス（robustness）だから——が、verify-redの原因ではなかった。

## 知見2——キャッシュのblobではなくプロデューサーの値をフィンガープリント化する

最初の切り口はプロデューサーのキャッシュエントリーの**blob**をダイジェスト化した（安価: ファイルを読むだけで再Marshalなし）。これは過剰無効化する: blobは依存記述子（入力ファイルのダイジェスト）を運ぶので、**任意の**入力編集で動く。実測: 値を保存するgitlabコントローラーの編集（トップレベル定数の追加）→`controller_index`のblobが書き換わる→スナップショットが無効化される→**フル再解析23秒に対し漸進は約9.5秒**。あらゆるRailsのモデル／コントローラー編集が漸進を台無しにしてしまう。

代わりにプロデューサーの**値**をダイジェスト化すると、フィンガープリントは寄与された値が動いたときだけ動く。検証: `--no-cache`（決定的な再計算）で、値を保存するコントローラー編集はファクトサーフェスのダイジェストを同一に保つ。したがって再計算をまたいだプロデューサー値の決定性はload-bearingである（非決定的な値はあらゆる再計算を偽無効化してしまう）。バンドルされた全プロデューサーが再計算で決定的であることを確認した（`Dir.glob`はRuby 3.0以降で既定でソートされるので、sorbetカタログの「最後のsigが勝つ」畳み込みはすでに安定している——WD2は再ソートするのではなくこれを文書化する）。

これを診断する過程で見えた見かけ上の「プロデューサー非決定性」は、素早いテスト編集によるADR-87のレーシーウィンドウのアーティファクトだった（編集＋mtimeレーシーガード内での即時再実行）。settleディレイを入れるとウォーム再チェックは決定的になる。

## 知見3——フィンガープリントはプローブ経由ではなく事後に計算する

（プールモードとの一致のための）専用の逐次`#prepare`プローブは、gitlabで約1.0秒を実測した（0.45秒の2回目`#prepare`＋0.6秒の2回目プロデューサー検証／Marshal）——ウォーム再チェックの約10%。フィンガープリントを、解析ランナーがすでに準備済みのレジストリから**事後に**読むと（`PluginFactFingerprint.from_registry`）、再チェックのprepareとそのメモ化済みプロデューサー値を再利用でき、オーバーヘッドは約0.24秒（≈2.5%）まで下がる。プローブはプールモードのフォールバックとしてのみ残る（プールのメインプロセスは`#prepare`をスキップする）。両経路が同一のダイジェストを計算するので、この判断はプールに依存しない。

## パフォーマンスまとめ（gitlab app/models app/controllers、ホスト）

| 測定 | 値 |
|---|---|
| gitlab `--verify-incremental`修正前 | FAILED（1,161 / 19） |
| gitlab `--verify-incremental`修正後 | OK（887/1,774、2,494件の診断、ミスマッチ0） |
| ウォーム再チェックのフィンガープリントオーバーヘッド（事後） | 約0.24秒（≈2.5%、約9.5秒中） |
| 値を保存するコントローラー編集の再チェック | ウォームのまま（過剰無効化なし） |
| Sorbetの`.rbi` sig編集 | スナップショット無効化→フル再解析（WD4a） |

## バンドルプラグインの不透明性監査

寄与するプラグイン（`dynamic_return` / `narrowing_facts`を登録する）とそのWD1サーフェス: actionpack / activerecord / activestorage——プロデューサー（不透明でない）。sorbet——WD2プロデューサー。minitest / rspec / mangrove＋examplesのunits / pattern / lisp-eval——`incremental_state_fingerprint`のセンチネル（ファイル単位／静的な寄与で、`--verify-incremental`がバックストップとなる）。activesupport-core-ext / deviseは寄与を登録しない（grepがコメントにマッチしただけ）。バンドルされたプラグインに不透明なものはない。不透明性の経路は、サーフェスを宣言せずに型を寄与するサードパーティプラグインに対する強制関数（forcing function）である。
