---
title: "B2.2のivarリセットのスキップ（#389）はコーパスに診断の余地を持たない"
description: "rigortype/rigor docs/notes/20260818-b22-ivar-reset-headroom.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260818-b22-ivar-reset-headroom.md"
sourcePath: "docs/notes/20260818-b22-ivar-reset-headroom.md"
sourceSha: "a9782d43bda10f1f6f6d27042e2f75347ec3c2da100bb9c74a1cc6a62dc87d13"
sourceCommit: "0cf313582cfbe2fa7da8148dc498d0b2a0893438"
translationStatus: "translated"
sidebar:
  order: 20266818
---

ステータス: 計測ノート、設計上のコミットメントはなし。ハーネスはブランチ[`measure/b22-yield`](https://github.com/rigortype/rigor/tree/measure/b22-yield)（コミット`b39ee00b`、意図的に未マージ）;そのブランチをチェックアウトして再実行すること。

Issue #389はエフェクトシステムの最初の*型付け*消費者を提案する: 呼び出し先のエフェクトサマリーが証明済みで、網羅的で、`mutate.self` / `mutate.static` / `global.write`を含まないとき、`StatementEvaluator#invalidate_ivars_for_intervening_call`（B2.2のリセット。暗黙的self / selfレシーバー呼び出しをまたいでナローイングされたすべてのivarをそのクラスivarのシードへ広げ戻す）をスキップする。本ノートはそれを構築する前に、それが何を買うかを計測する。答えは**計測可能なものは何もなく、issueが名指す受け入れフィクスチャは取り除くと約束する診断を報告できない**。

## ハーネス

計測ブランチ上のenvでゲートされた2つのフック:

- `RIGOR_B22_CENSUS=FILE`——リセット**イベント**ごとに1行: 実際に少なくとも1つのivarを広げた呼び出し（`class<TAB>selector<TAB>line<TAB>count`）。行はオフラインで`rigor effects --format json --full`と結合される。
- `RIGOR_B22_DISABLE=1`——リセットがまったく起きない。通常の実行に対する診断の差分が**消費者全体の上界**だ: #389がゲートしうるあらゆる基準は、決してリセットしないことの部分集合である。

スクラッチ設定は`effects: {}`・`parallel: {workers: 0}`（forkされたワーカーのカウンタは`exit!`とともに死ぬ）・絶対パスの`paths:`・毎回の実行前に消去されるスクラッチの`cache.path`を運ぶ。調査チェックアウト: redmine `a12198ea0`、mastodon `163f96cee`;`rigor lib`は`d5f1af6c`のこのリポジトリ。プラグインリストは各プロジェクト自身のものに`rigor-railties`を加えたもの;2つのRailsアプリには`severity_profile: lenient`、ベースラインなし、したがってすべての診断が数えられる。

## 余地の実験

| 対象 | リセットサイト | 診断、B2.2オン | B2.2オフ | 差 |
| --- | --- | --- | --- | --- |
| `rigor lib` | 107 | 0 | 0 | 同一 |
| redmine `app`+`lib` | 336 | 792 | 792 | 同一 |
| mastodon `app`+`lib` | 366 | 2,349 | 2,350 | **+1追加** |

**809のリセットサイト、取り除かれた診断はゼロ**。唯一追加された行は`app/workers/activitypub/delivery_worker.rb:39`——`@performed = false; perform_request; ensure … if @performed`——で、保存されたナローイングが`if @performed`を常に偽値へ畳み込む。それは偽陽性であり、まさにB2.2が存在する理由の形だ: `perform_request`は実際に`@performed`を設定する。*エフェクトでゲートされた*スキップはそこではリセットを保つ（呼び出し先は`mutate.self`フリーではない）ので、これは#389の基準の欠陥ではない——基準の保護は仕事をしているがその精度はしていないことの実演だ。

## なぜゼロか: リセットには診断の消費者がいない

`call.possible-nil-receiver`は**ローカル変数**のレシーバーでのみ発火する——[`check_rules.rb:1271`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules.rb)の`return nil unless call_node.receiver.is_a?(Prism::LocalVariableReadNode)`は、ガードがnilを取り除いたことを証明できる唯一のナローイングサーフェスにルールを制限している。インスタンス変数のレシーバーは決してこのルールに到達しない。

したがって#389の最初の受け入れ基準——「純粋な`audit!`を伴う`return unless @user; audit!; @user.name`がもはや`call.possible-nil-receiver`を報告しない」——は**今日再現できない**: この形は取り除くべきものを何も報告しない。フィクスチャで検証済み（`@user = ENV["U"]; return if @user.nil?; audit!; @user.upcase`、`audit!` = `freeze`）:

| | 使用箇所での`type-of` | 診断 |
| --- | --- | --- |
| B2.2オン | `String?` | なし |
| B2.2オフ | `String` | なし |

作者によるRBSとして`@user: String?`を加えてもどちらの列も変わらない。全数調査はそこでリセットが実際に発火することを確認しており（`Probe<TAB>audit!<TAB>13<TAB>1`）、これは静かなno-opではなく生きた計測だ——`check_rules.rb`の再計測が必要とした同じ陰性コントロールの規律。

*実在する*利益は型そのものだ: 使用箇所で`String?` → `String`。それはエディタモード / `type-of`の改善であって、`rigor check`のものではない。

## 記録のための収量の結合

エフェクトゲートが開くリセットサイトの数。全数調査をサマリーテーブルと結合して:

| | リセットサイト | プロジェクトサマリー経由でスキップ可能 | コアカタログ行経由 |
| --- | --- | --- | --- |
| `rigor lib` | 107 | 5（4.7%） | 33（`freeze` 28、`raise` 2、`Integer`、`exit!`、`sleep`） |
| redmine | 336 | 11（3.3%） | 8（`raise`） |

2つの読み。第一に、**プロジェクトサマリーの半分が小さいのは網羅性が小さいからだ**——サマリーテーブルはredmineで12.6%が網羅的かつmutateフリー（589/4,683）、`rigor lib`で17.0%（1,008/5,941）であり、ブロックされたすべてのサイトがそれを継承する。第二に、**素のRubyで実際に開くのは不動点ではなくカタログだ**: `self.freeze`だけで`rigor lib`の107のうち28であり、`data/effects/core.yml`はすでに`freeze: effects: []`を証明している。Railsアプリでは未解決の呼び出し先は`redirect_to`（34）・`respond_to`（30）・`url_for`（13）とその仲間——プラグインの*帰属*であり、宣言レーンに住み、設計上決して型付けゲートを開けない。

## これが示唆すること

- **#389を仕様どおりに構築しないこと**。その計測された上限は3プロジェクトにわたって取り除かれた診断ゼロであり、その名指された受け入れフィクスチャは取り除く診断を生成できない。
- B2.2のスキップを再検討するなら、安価な半分は**カタログ**レーン（`freeze`のような`mutate`フリーのコアセレクタ）であり、オンデマンドのサマリー再帰も、巡回処理も、不動点への依存も必要としない——そしてそれこそがRails以外のコードでサイトが実際にある場所だ。
- 最初に計測する価値のある消費者は、そのルールが**ローカル**を読むものだ: 再呼び出しをまたいで呼び出し結果を記憶するための§8（2）の計算された純粋性（`if x.foo && x.foo.bar`）は`call.possible-nil-receiver`の生きたサーフェスの直上に座り、B2.2のものはそうではない。
