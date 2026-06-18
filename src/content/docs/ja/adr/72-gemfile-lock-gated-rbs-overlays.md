---
title: "ADR-72 — Gemfile.lock-gated bundled RBS overlays"
description: "Imported from rigortype/rigor docs/adr/72-gemfile-lock-gated-rbs-overlays.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/72-gemfile-lock-gated-rbs-overlays.md"
sourcePath: "docs/adr/72-gemfile-lock-gated-rbs-overlays.md"
sourceSha: "d387fe5575242def0b90a90c07740106a997a2ca2096ee803a91ceee4af156e6"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4072
---

ステータス: **Accepted — 2026-06-17に実装**。プロジェクトの`Gemfile.lock`にgemがロックされているのに、どの解決経路を通じてもRBSを同梱していない（`:missing`カバレッジクラス）とき、Rigorはそのコア型拡張向けに、バンドルされたgem単位のRBSオーバーレイ（overlay）を自動ロードします。これにより、Railsプロジェクトは`3.minutes` / `"x".underscore` / `hash.symbolize_keys`に対する系統的な偽の`call.undefined-method`を見なくなり、一方そのgemを持たないプロジェクトは依然として本物の診断を見ます。ActiveSupportが最初の（v1ではこれのみ）バンドルオーバーレイです。偽陽性に安全な方向への精度加算的（precision-additive）な変更です。オーバーレイは診断を*取り除く*ことしかできず、しかもgemが実際にロードされている箇所でのみ（つまりそのメソッドがランタイムで実在する箇所でのみ）行います。オプトインの[`rigor-activesupport-core-ext`](../../manual/plugins/rigor-activesupport-core-ext/)プラグインの双子であり、そのプラグインがロードされているときは身を引きます。

根拠: 2026-06-17の`evidence_tier`校正フィードバック。`evidence_tier == "high"`を真陽性の下限として信頼する下流のコンシューマー（ADR-65）が、Mastodon上の高ティアの`call.undefined-method`診断**512件中171件**（約33%）を「生きた潜在バグ」へと自動昇格させました——そのすべてがActiveSupportのcore-ext呼び出しサイト（`undefined method 'minutes' for 3`など）であり、ランタイムでは実在する呼び出し可能なメソッドで、ActiveSupportのRBSが読み込まれていなかったためにのみ偽でした。

## コンテキスト

`call.undefined-method`が`evidence_tier: :high`を持つ（ADR-65 WD1: ルール単位のプロパティ）のは、その発火ゲート——具体的で静的に既知のレシーバーで、そのRBS宣言されたメソッドサーフェスがそのメソッドを含まない——が通常は高信頼だからです。その前提には、Railsエコシステムにおける系統的な例外があります。**コア型のオープンクラス・モンキーパッチ**です。レシーバーは確かに具体的（`Integer`）ですが、そのメソッドサーフェスは閉じていません——ロードされたgem（`activesupport`）がランタイムでそれを拡張します。Rigorがそれを見られないのは、ひとえにそのgemがRBSを同梱しておらず、どれもインストールされていなかったからです。

フィードバックは2つの修正を提案しました。（a）ActiveSupportのcore-ext RBSオーバーレイを同梱すること、そして（b）既知の未シグネチャ化モンキーパッチャがロックファイルにあるとき、コア型のundefined-methodを格下げする発火単位のティアゲート。フィードバックは（b）をより永続的だと推奨しました。私たちは（a）を選びました。プロジェクトの一次的な価値は偽陽性の規律（「動作するコードを決して怖がらせない」）であり、（b）はそれに寄与しないからです:

- **ティアは決して重要度に流し込まれません**（ADR-65 WD2）。`3.minutes`を`high`から`medium`へ格下げしても、それは赤い`error`として発火し続けます——171件の偽陽性すべてが画面に残ります。（b）は自動化されたコンシューマーだけを修正し、人間は修正しません。
- （b）はまさにADR-65が明示的に**却下した**「発火単位の動的ティア」という代替案であり、WD1と矛盾します。それを採用することは、わずかな利得のために記録済みの決定を覆すことになります。

偽陽性をソースで解決すれば、その系統的な部分集団がまるごと取り除かれるので、`evidence_tier: :high`は「本物の型エラー」を意味し続け、ADR-65への変更は不要です。

既存の2つの事実が（a）を安価かつ安全にしました:

1. **Rigorはすでにトリガーを検出しています**。`RbsCoverageReport.classify`はすでに各Gemfile.lock gemのRBSの由来を報告し、`:missing`集合（`rbs.coverage.missing-gem`通知）を表面化します。オーバーレイはその分類をそのまま再利用します。
2. **RigorはすでにそのRBSを保守しています**。オプトインの`rigor-activesupport-core-ext`プラグインが、厳選されたcore-extのシグネチャを同梱しています。オーバーレイはその自動適用される、ロックゲート式の双子です。

## 決定

### WD1 — ゲート: ロック済み、`:missing`、競合プラグインなし

プロジェクトの`Gemfile.lock`にロックされた各gemについて、オーバーレイは次の場合かつその場合に限りロードされます:

- どの解決経路を通じてもRBSを同梱していない——`RbsCoverageReport`がそれを`:missing`に分類する（デフォルトライブラリ、ベンダーされたスタブ、バンドルの`sig/`、`rbs collection`エントリーのいずれでもない）、かつ
- Rigorがそれ向けのオーバーレイをバンドルしている（`data/gem_overlay/<gem>/`）、かつ
- 同じシグネチャを同梱するオプトインプラグインがロードされていない（`GEM_OVERLAY_PLUGIN_IDS`は`activesupport` → `activesupport-core-ext`にマッピングする;そのプラグインIDがレジストリにあるとき、オーバーレイは身を引くので、両者がメソッドを二重に宣言して`RBS::DuplicatedDeclarationError`を発生させることはありません）。

ロックファイルの解決は`bundler.auto_detect`（デフォルト**true**）に便乗するので、この修正はルート直下に`Gemfile.lock`があるあらゆるプロジェクトでデフォルトで有効であり、設定を必要としません。

**実際のgemの存在でゲートすることが、オーバーレイを健全にします**。ロックファイルに`activesupport`がない素のRubyプロジェクトは、依然として本物の`undefined method 'minutes' for 3`を受け取ります——オーバーレイはロードされません。なぜなら、そこではそのメソッドが本当に存在しないからです。

### WD2 — 偽陽性に安全な方向のみ

オーバーレイは`call.undefined-method`を*取り除く*ことしかできず（加算的なRBSが、フラグされていたメソッドを解決する）、しかもそのgemをロードするプロジェクトでのみ（つまりメソッドがランタイムで実在する箇所でのみ）行います。新しい診断を作り出すことはできません。コアレシーバー上の本物のタイポ（`5.minuets`）はオーバーレイに*含まれていない*ので、依然として`evidence_tier: :high`で発火します——メソッド名のアローリストなしには格下げ式の代替案ができなかった弁別です。これはADR-58と同じロバストネスの立場です（宣言由来のファクトは診断の燃料ではない）。精度が加えられるのは、間違っても動作するコードを怖がらせない箇所だけです。

### WD3 — 仕組み: シグネチャパスのダイジェストに便乗する

オーバーレイのディレクトリは`Environment.for_project`の`loader_signature_paths`に（最後に）追加されます。そのため、プロジェクトがすでに供給するRBSがあればそちらが勝ちます。これは既存のあらゆるチャネルを無料で再利用します:

- 環境キャッシュ記述子（`Cache::RbsDescriptor`）はすでに`loader.signature_paths`をダイジェストするので、オーバーレイの有無が変わると環境が無効化されます（ロックファイルからgemを追加／削除すると、ダイジェスト内のパスが切り替わります）——新しいキャッシュ配管は不要です。
- `RbsLoader#build_env`はすでに`@signature_paths`を読み込みます。

新しいサーフェスは1つのデータツリー（`data/gem_overlay/<gem>/*.rbs`）と1つのローダーアクセサ（`RbsLoader.gem_overlay_sig_paths`）です。適格性は`Environment.for_project`（プライベートな`gem_overlay_paths`ヘルパー）にあります;`RbsLoader`の定数サーフェス（`Environment::GEM_OVERLAY_PLUGIN_IDS`、`RbsLoader::GEM_OVERLAY_SIGS_ROOT`）はADR-50で凍結された公開APIの外に留まります。

### WD4 — ADR-65（エビデンスティア）およびADR-27/31（自動ロード）との関係

これは**ADR-65 WD1を保持します**。ティアはルール単位のプロパティのままで、発火単位の動的ティアは導入されません。校正に関する苦情は、偽陽性の部分集団を取り除くことで解決され、ラベルを貼り替えることでは解決されません。

これは**ADR-27/31のプラグイン自動ロードの先送りを覆しません**。その先送りはプラグインの*コード*（`prepare`、ウォーカー、IOを実行する）の自動ロードに関するものです。こちらはRBSの*データ*のみを自動ロードし——コード実行はなし——gemの実際の存在でゲートされる、プラグインよりも厳密に狭く安全なサーフェスです。これは無条件の`core_overlay`の仕組みをロックファイル条件付きにしたものです（そしてここでは条件付きが必須です。ActiveSupportのメソッドは、`core_overlay`の常に存在するコアメソッドと違い、gemがロードされているときにのみ存在するからです）。

### WD5 — 一般化

`GEM_OVERLAY_PLUGIN_IDS`と`data/gem_overlay/<gem>/`ツリーは、フィードバックの「ActiveSupportを超えて一般化する」という要望の、永続的で一般化可能な形です。別の系統的なコア型モンキーパッチャ（i18n、Sequelなど）は、オーバーレイディレクトリを追加し、オプトインのプラグイン双子があればマップエントリーを追加することでオンボードされます——エンジンの変更は不要です。追加のオーバーレイは需要ゲート式です。

## 却下した代替案

- **発火単位のティア格下げ（フィードバックの（b））**。ADR-65 WD1とその却下された発火単位の動的ティアの代替案を覆し、そして——ティアは決して重要度に流し込まれない（ADR-65 WD2）ため——動作するコードに赤い偽陽性を残し、自動化されたコンシューマーだけを修正します。
- **モンキーパッチのリスク下で、コア型のundefined-methodの重要度を抑制／格下げする**。人間が見る偽陽性を取り除き、一般化もしますが、コア型上の本物のタイポ（`5.minuets`も黙らされてしまう）に対する偽陰性と引き換えになり、実際のメソッドを解決するよりも粗い手段です。メソッド名のアローリストはそれを狭めますが、RBSオーバーレイが精密に述べることを、より劣った形で再実装します。
- **完全なオプトインプラグインを自動ロードする**。プラグインコードを実行し、ADR-27/31の自動ロードの先送りと衝突します。
- **無条件のオーバーレイ（`core_overlay`のような）**。健全でない: ActiveSupportなしで`3.minutes`を呼ぶ素のRubyプロジェクトが、本物の`call.undefined-method`を失ってしまいます。
