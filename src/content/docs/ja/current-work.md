---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "b2e8405ed9f0c0b37a228622c0c55cc678d991c5d7ea664b37e26ccb5c58d905"
sourceCommit: "04668e5f0d6205fdd5c8f44662041add7ab33ca3"
sourceDate: "2026-09-09T16:37:22+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

<!--
セッション引き継ぎ（ADR-98）。たった1つの問いに答える: 次のセッションは何をすべきか？

- 作業をゴールまで運んだら、このファイルの内容を置き換えること;下に追記しないこと。
  2セッションを超えて生き延びるものはここに属さない: バックログ → GitHub issue
  （docs/agents/issue-tracker.md）、運用上の落とし穴 → ワークフローのスキル、決定 → ADR、
  計測 → docs/notes/、出荷済み → CHANGELOG.md。
- ハードキャップ: 120行。spec/docs/agent_index_spec.rbが強制する。追記せず圧縮すること。
- 主張を持ち越す前に、代理ではなく決定するものによって検証すること ── このファイル内の主張も含めて。
  3セッション連続で、このファイル自身のポインタが間違っていた。
-->



一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestonesに存在する。
このファイルがADR、CHANGELOG、またはissueと矛盾する場合、間違っているのはこのファイルのほうだ。

## サイクルの現在地

**v0.3.8は公開済みである**（2026-09-09時点で`Rigor::VERSION`は`0.3.8`、`[Unreleased]`は空）。
カット後のフラグメントは`changelog.d/`配下に置かれる。次のカットはユーザーが`/rigor-release-prep`を呼び出したときにのみ行われる。

## 2026-09-09バッチ ── 10個のPR、すべて着地

それぞれ自身の`bin/rigor-worktree`レーンで実行され、Draftを開き、masterの実行がgreenになった時点でユーザーの合図によりマージされた。このセッションでオープンなものは何もない。

エンジンおよびCLIの挙動:

- [#869](https://github.com/rigortype/rigor/pull/869)が#821をクローズ（Nicolas Rodriguezによる報告）:
  `sig-gen`およびプローブは環境を`libraries:` + `signature_paths:`のみで構築していたため、rbs collection、バンドルのgemごとの`sig/`、およびプラグインのシグネチャが見えず、RBSのないスーパークラスのスキップガードがすべてのRailsモデルを拒絶していた。新しい`Rigor::ProjectEnvironment`（`lib/rigor/project_environment.rb`）が、すべての非`check`コマンドの唯一の構築パスとなり、`dependency_discovery_options(configuration)`が5つの探索軸の唯一の表記となる。注意: `sig-gen`は`source_files:`を渡すようになったため、ADR-93のインライン`#:`アノテーションは`check`と同様に`sig-gen`にとっても既存の宣言としてカウントされる。
- [#888](https://github.com/rigortype/rigor/pull/888)が#882をクローズ: `rigor unused`の`foreign_predicate`にも同様の脱落があり、プロジェクトが再オープンするgemクラスが未使用候補として報告されていた ── 修正前にCLI経由で再現された。`signature_paths: []`は、それ自体の文書化された理由により維持される。
- [#865](https://github.com/rigortype/rigor/pull/865)が#853をクローズ: ブロックレベルの`break <value>`は、あらゆるディスパッチ階層より上位の`ExpressionTyper#call_dispatch_type_for`において、yieldを行うCALLの型へとUnionされるため、フォールドはbreakのないパスをフォールドし続ける。残余: `JUMP_NODES`内の`break`エントリーは現在保守的であり、耐荷重ではない ── スレッディングが`5 | 42`に到達するところで`5 | Dynamic[top]`となる;これを持ち上げると`break`を持つすべてのブロックが動く。
- [#866](https://github.com/rigortype/rigor/pull/866)が#862をクローズ（issue上の決定オプション1）: `T`がNominalまたはそれらのUnionである場合、`Range[A]`は`Nominal[Range, [T]]`キャリアからもバインドする。Range専用 ── Rangeはイミュータブルであり、その要素型は構築時に固定される。
- [#868](https://github.com/rigortype/rigor/pull/868)が#861をクローズ: プレーンな`Integer` / `Float`レシーバーに対する`clamp`はブラケットへとフォールドする。排他的終端、混合クラスの境界、NaNおよび非リテラルの境界は拒絶される; `i.clamp(1..)`は既存のエイリアス`positive-int`としてレンダリングされる。
- [#890](https://github.com/rigortype/rigor/pull/890)が#806をクローズ: `Registry#type_node_resolvers`はEnvironment構築中にガードなしで`plugin.manifest`を読み込んでいたため、例外を発生させるマニフェストがすべての`Environment.for_project`を中断させていた。マニフェストは、プラグインごとのrescueの背後でレジストリ構築時に1度だけ読み込まれ、`load_errors`に結合するようになった。issueの前提は1点の訂正とともに成立した: 例外は`Manifest#type_node_resolvers`（frozenな`attr_reader`）からではなく、`plugin.manifest`から発生する。IoBoundaryのバイパスはなく、#630形状の古いキャッシュの継ぎ目もない ── マニフェストはインメモリオブジェクトである。
- [#891](https://github.com/rigortype/rigor/pull/891)が#807をクローズ: キャッシュスキーママーカーはrenameによって公開されるようになり、EMPTYマーカーは（「不一致、ルートをクリア」としてではなく）存在しないものとして扱われ、`read_entry`は存在確認とopenの間の`ENOENT`を許容する。1つのクリーンな`.rigor/cache`に対する2つの並行する`rigor check`プロセスがこれに遭遇していた。

構造的ゲート ── 「第2の構築エントリーが入力を暗黙的にドロップする」ファミリー、現在3つのエントリーすべてでクローズ:

- [#864](https://github.com/rigortype/rigor/pull/864)が#849をクローズ（`RbsLoader.build_env_for` vsキャッシュプロデューサー、さらにプローブは永続キャッシュを決して触らないというマニュアルの記述）、[#880](https://github.com/rigortype/rigor/pull/880)（`Environment.for_project` vs `dependency_discovery_options`、`ProjectEnvironment`自体の外部で`for_project`に到達するすべてのファイルを網羅）、[#886](https://github.com/rigortype/rigor/pull/886)が#876をクローズ（`RbsDescriptor`のダイジェストvs `build_env_for`の入力 ── ダイジェストされていない入力は見つからなかった）。
- 3つすべてがメソッド自体からキーワードリストを読み取るため、新しいキーワードは出荷されるのではなくredとなる。#886はさらに各バリエーションが構築された環境を実際に変更することをチェックする: 変更しないバリエーションはダイジェストアサーションを空虚にし、あたかも合格したゲートのように読めてしまう。`libraries: ["set"]`はrbs 4.xでは空虚である（`Set`はコア）; `"pathname"`が識別する。

## このバッチが残す未解決のスレッド

- #891の背景にあるプロセス間プローブはブランチ`probe-807-marker-race`（`tmp/probe-807/`）にある。プロセス内の変種は決して再現しなかった ── MRIは実質的に`File.write`の途中でプリエンプトしない ── そのためアトミック書き込み側はスペックではなくそのforkハーネスによって正当化されている。
- #891は1つの名前付きウィンドウを残している: 本当に古いルートでは2つのコンストラクタが依然として並行してクリアする可能性があり、クラッシュの影響は塞がれたものの、再計算のコストのみが発生する。
- #890は、`Registry#find` / `#ids` / `#source_rbs_synthesizers`および`CLI::PluginsCommand#plugin_matches_entry?`がガードなしで`plugin.manifest`を読み込む状態を残している。Environment構築中に実行されるものはなく、それらをガードすること自体が問いを生む（idを読み取れないプラグインに対して`ids`は何を返すべきか？）。

## 参入方法

1. このセッションのものは何もオープンでもコミットされていない状態でもない;そのレーンのworktreeは削除されている。他のセッションが終始masterにマージしていたため、現在のHEADでfile:lineを再導出すること。
2. `ready-for-agent`キューがバックログである: `gh issue list --label ready-for-agent`。#790、#732、#728、#722、#720、#710は独立しており、ブロックされていない。
3. フルゲートはこのマシン上で1度に1つずつ実行する: 2つの並列`make verify`の実行はメモリを枯渇させる。レーン群は`mkdir /tmp/rigor-verify.lock`で直列化される; 5つのレーンにより最後のレーンは~55分待たされた。
4. masterの実行がCANCELLEDとなったマージは、通常、障害ではなく兄弟セッションのpushによる追い越しである ── コミットがmasterに含まれていることを確認し、より新しい実行を監視すること。
