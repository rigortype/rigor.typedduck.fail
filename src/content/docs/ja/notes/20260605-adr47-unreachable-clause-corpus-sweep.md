---
title: "ADR-47 `flow.unreachable-clause` — コーパスFPスイープ（WD4）"
description: "rigortype/rigor docs/notes/20260605-adr47-unreachable-clause-corpus-sweep.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260605-adr47-unreachable-clause-corpus-sweep.md"
sourcePath: "docs/notes/20260605-adr47-unreachable-clause-corpus-sweep.md"
sourceSha: "3811849ba0feed966095c5c03fe33e90b85239839340aa9e8b2e8f1fabaa46a1"
sourceCommit: "86367f26f62593f19f649f7cb9c8e1a00a751282"
translationStatus: "translated"
sidebar:
  order: 20266605
---

**ステータス:**調査ノート。設計上の確約なし。ADR-47 WD4の偽陽性（false positive）ゲート実行記録。
**日付:** 2026-06-05。
**Rigorバージョン:**ワーキングツリー（master @ `cf8ee0fe`、ADR-47 WD1 + WD2 + WD3a適用済み）。

**背景:** ADR-47は`flow.unreachable-clause`をデフォルト（balanced）プロファイルでは`:info`、`strict`プロファイルでのみ`:warning`で出荷する。これは「balanced→`:warning`への昇格に先立つ回帰コーパス（corpus）偽陽性ゲート」（WD4）が条件となっている。本ノートはそのゲートを実施したもので、実際のOSSコーパスをスイープ（sweep）し、すべての発火を精査して昇格の可否を判断する。

**手法:**各対象について、`cwd=<target>`かつ`BUNDLE_GEMFILE=<rigor>/Gemfile`の環境で（[`reference_survey_external_projects`]に従い）`bundle exec <rigor>/exe/rigor check <paths> --no-cache`を実行し、出力から`flow.unreachable-clause`をgrepした。対象は`~/repo/ruby/rigor-survey/`配下（および`~/repo/ruby/gitlab-foss`）に置いている。

## 結果

| コーパス | スコープ | `unreachable-clause`発火数 |
| --- | --- | --- |
| Mastodon | `app lib` | 0 |
| Redmine | `app lib` | 0 |
| parser | `lib` | 0 |
| rubocop-ast | `lib` | 0 |
| kramdown | `lib` | 0 |
| mail | `lib` | 0 |
| liquid | `lib` | 0 |
| haml | `lib` | 0 |
| hamlit | `lib` | 0 |
| herb | `lib` | 0 |
| slim | `lib` | 0 |
| oj | `lib` | 0 |
| ox | `lib` | 0 |
| protobuf | `lib` | 0 |
| textbringer | `lib` | 0 |
| rgl | `lib` | 0 |

**16コーパス、発火ゼロ**。偽陽性なし——かつ真陽性もなし。

**GitLab FOSS: 中断、カウント対象外**。`app/models app/services app/controllers lib --no-cache`はCPU 100%で52分超経過後に強制終了した（`lib`ツリーが巨大であり、`--no-cache`はすべてを再解析する）。これは到達可能性（reachability）ルール固有の問題ではなく——同じスコープはどのルールでも遅くなる——ので、ゼロとして報告するのではなく除外とした。発火を確認したい場合、GitLabの限定スコープを後日スイープすることは可能である。

## ゼロが期待値である理由

このルールの適用範囲（envelope）は意図的に狭く設定されている（WD1）。発火するのは、対象が**具体的な**（`Dynamic`でも`Bot`でもない）型の**ナローイング（narrowing）ローカル変数**であり、`when`/`in`条件がクラス/モジュール定数であり、かつループ/ブロックの外側にある`case <local>`に限られる。実世界の`case`対象は圧倒的に*メソッド呼び出し結果*や*パラメータ*（これらは`Dynamic`に推論されるため、<ruby>漸進的保証<rp>（</rp><rt>gradual guarantee</rt><rp>）</rp></ruby>がルールを抑制する）か、あるいは*値/シンボル*マッチ（`when :active`、`when 200`）であり、これらはクラスパターンではない。このルールが捕捉する形——静的に既知の具体クラスのローカル変数が、互いに素（disjoint）またはすでにカバー済みのクラスとマッチされる——は、明らかに冗長であるがゆえに、プログラマーがほとんど書かない形である。合成されたスペックケース（`x = 1; case x; when String`）でルールが発火することは確認済みであり、実際のコードには、保守的な適用範囲が許す唯一の形にすら該当するバグが存在しないのである。

## 決定

**balancedプロファイルは`:info`を維持し、`:warning`へは昇格しない**。

ADRの昇格基準——「全発火を精査して偽陽性をゼロにする」——は*空虚に*満たされている（発火ゼロ⇒偽陽性ゼロ）。しかし、空虚なパスは**証拠の不在であって安全の証拠ではない**。実世界での発火を精査していない以上、より大きな警告をデフォルトにする根拠となる正のシグナルが存在せず、偽陽性の規律（「動いているコードを脅かさない」）は、野生での挙動が一度も観測されていないルールを昇格させることに反対する。`:info`はすでにスキャン時に診断を表面化させており、`strict`はオプトインするユーザーのために`:warning`を維持している。将来の昇格は、精査すべき実際のコーパス発火が現れるまで待つべきである。

これにより**WD3b**（デコンストラクティング/値/変数キャッチオールパターンの網羅性）の優先度も下がる。WD1/WD2/WD3aという広い適用範囲が16コーパスにわたってゼロ発火であるならば、はるかに大きなWD3bの限界的な実世界の収益が、その複雑さと偽陽性リスクを近い将来に回収できる見込みは薄い。具体的な需要が生じるまで、引き続き据え置きとする。
