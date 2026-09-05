---
title: "ADR-72 — Gemfile.lockでゲートされたバンドルRBSオーバーレイ"
description: "rigortype/rigor docs/adr/72-gemfile-lock-gated-rbs-overlays.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/72-gemfile-lock-gated-rbs-overlays.md"
sourcePath: "docs/adr/72-gemfile-lock-gated-rbs-overlays.md"
sourceSha: "e40804e5304e73b44184ccea93ba285b4c938b8d564dbae542ed82690e8d2ec2"
sourceCommit: "2a65ec8e52462c931fbfec94df68a18139259a43"
sourceDate: "2026-09-03T14:53:17+09:00"
translationStatus: "translated"
sidebar:
  order: 4072
---

**ステータス:** Accepted — 2026-06-17実装。プロジェクトの`Gemfile.lock`にgemがロックされているが、どの解決経路（デフォルトライブラリ、vendoredスタブ、バンドルの`sig/`、`rbs collection`）を通じてもRBSを同梱していないとき、Rigorはそのgem向けの小さなRBSオーバーレイを自動ロードします（[ADR-58](58-authoritative-rbs-provenance.md) §「自動オーバーレイ」）。これにより、最も一般的なActiveSupportの拡張（`Time.current`、`3.days`、`Array.wrap`、`"x".squish`、`obj.blank?`）がゼロコンフィグで解決されます。

## 文脈

147個のgemと4つの実Railsアプリを対象にしたv0.1.0プレビュー調査（[`docs/notes/20260613-rbs-coverage-inventory.md`](../../notes/20260613-rbs-coverage-inventory/)）で、ActiveSupportのcore-ext拡張がRailsコードベースにおける`call.undefined-method`の最大の発生源であることが判明しました（GitLabで64%、内部Railsアプリで90%の未解決呼び出し）。原因はActiveSupportが`rbs collection`内に型定義を持たないこと（gemは型定義を出荷せず、コミュニティリポジトリにもgemレベルのエントリーがない）です。

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
- 同じシグネチャを同梱するオプトインプラグインが**到達可能（reachable）**ではない（`GEM_OVERLAY_PLUGIN_IDS`は`activesupport` → `activesupport-core-ext`にマッピングする; 両者がメソッドを二重に宣言して`RBS::DuplicatedDeclarationError`を発生させないよう、オーバーレイは身を引く）。

到達可能（reachable）かどうかは1つではなく2つの問いです。プラグインIDがレジストリにあることは、このADRが最初に想定した経路です。Issue #672が2つ目を発見しました: プラグインのシグネチャを`plugins:`ではなく`signature_paths:`経由で配線するプロジェクトは、キーとすべきレジストリエントリーなしで同じ`.rbs`に到達するため、両方の半分がロードされ、それらが共有するすべてのクラスが崩壊してしまいます——`class_known?`がyesと答え続ける一方で`RBS::DefinitionBuilder`が`DuplicatedMethodDefinitionError`を発生させ、実行は依然として終了コード0でありながら報告件数が*少なく*なっていました。したがって、身を引く判定（stand-down）は、ユーザー自身の`signature_paths:`がエンジンのバンドルされた双子の`sig/`（`Plugin::Loader.bundled_plugin_sig_path`）をすでに**ロードしているか**も問い合わせます。

**「似ている」ではなく「ロードしている」こと。**テストは、エントリが、ローダー自身の受入テストである`RbsLoader.project_sig_files`が双子の`.rbs`ファイルの1つをそこから読み込むディレクトリであるかどうかです（両側とも`File.realpath`によって正規化されます）。パス文字列の比較は両方向で誤りであり、偽陽性の方向はコストの高い方向です: 双子の`.rbs`*ファイル*、または存在しない双子のサブディレクトリを指定する`signature_paths:`は、文字列としては双子に一致しますがローダーはそこから何も読み取りません（`SignaturePathAudit`はそれらを`:not_directory` / `:missing`と報告します）。それらに対してオーバーレイを身を引かせてしまうとプロジェクトには*どちらの*コピーも残らなくなり、通常の`3.minutes`や`"x".camelize`が`call.undefined-method`を引き起こします——正しいコードに対してチェックが発火することになり、これはWD2と[ADR-5](../5-robustness-principle/)の双方が禁じています。静かな方向はその鏡像です: 双子へのシンボリックリンク、またはファイルシステムが大文字小文字を畳み込む環境での大文字小文字の異なる表記は、プレフィックスに一致しないまま双子の宣言をロードするため、オーバーレイが残りクラスが崩壊します。正規化は両方を解決します。

**依然としてコンテンツテストではありません。**これらのシグネチャの*ベンダーされたコピー（vendored copy）*も同様に衝突しますが、意図的に捕捉されません: それを捕捉することは宣言の重複に対してオーバーレイを身を引かせることを意味し、コピーが省略したすべてのセレクタが正しいコードに対する新たな`call.undefined-method`になってしまうためです——再びWD2の禁止された方向です——さらに、編集されたコピーはどうせテストをすり抜けます。ベンダーされたコピーは推測ではなく衝突レポートを維持し、そのレポートをどれほど目立たせるべきかは[#696](https://github.com/rigortype/rigor/issues/696)の課題です。

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
