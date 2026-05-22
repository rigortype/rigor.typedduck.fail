---
title: "Redmine per-commit detection probe — does Rigor catch real bugs?"
description: "Imported from rigortype/rigor docs/notes/20260521-redmine-per-commit-detection-probe.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/notes/20260521-redmine-per-commit-detection-probe.md"
sourcePath: "docs/notes/20260521-redmine-per-commit-detection-probe.md"
sourceSha: "7696e52ba3137fbe5412cab22f022d77aa69cae206c17055f120e2244ee81807"
sourceCommit: "75f1372f98e9b1b00cb79a72bf925849cead6956"
translationStatus: "translated"
sidebar:
  order: 20266521
---

**日付:** 2026-05-21**。Rigor:** v0.1.9（`master`）。
**対象:** `redmine/redmine`、`6.0.0 → 6.1.2`の期間。

[Redmineリリースタグsweep](../20260521-redmine-6.x-regression-sweep/)の姉妹編。あのsweepは — [Mastodonのもの](../20260521-mastodon-v4.5-regression-sweep/)と同じく — リリース済みのタグにわたるベースラインの**安定性**を測った。リリースタグはspecゲートを通過した母集団であるため、リリースタグsweepはRigorの**バグ検出**力を測れ*ない*（[`rigor-regression-sweep`](https://github.com/rigortype/rigor/blob/main/.claude/skills/rigor-regression-sweep/SKILL.md) SKILL §「Phase 1」がこれを記録している）。このprobeはより細かく — **バグ混入コミット**で — サンプリングし、検出という問いを直接ぶつける。

## 手法

既知のバグ修正コミットについて、その**親**（バグのある状態）をチェックアウトし、`rigor check`を実行して、Rigorがそのバグの箇所で診断を出したかを見る。検出可能なバグクラス＝Rigorのルールがターゲットとするもの: `NoMethodError` / nilレシーバ / メソッド欠落 / アリティ / 引数型。

## 候補プールは薄い — それ自体が一つの発見

この期間には**555コミット**がある。`NoMethodError`のバグクラスについて、`app/**/*.rb`または`lib/**/*.rb`に触れるコミットに限定してコミットメッセージを検索すると、**2件**が得られる:

- `3712ecb01` — *Fix NoMethodError in IssuePriority#high and #low
  when no default or active priorities exist (#42066).*
- `41ed48fd7` — *NoMethodError when creating a user with an invalid
  email address and domain restrictions are enabled (#42584).*

diff pickaxe（`app`/`lib`の`.rb` diffに`&.` / `.nil?` / `return if` / `presence`を追加し、メッセージに「fix」とあるコミット）で広げると、さらに4件が表面化した — しかしその4件はすべてロジック / レンダリングのバグ（壊れた脚注参照、SVGアイコン表示）であってnilレシーバ型バグではなく、加えて純粋なRuboCopクリーンアップが1件である。**リリース期間の修正のほとんどはロジック / UI / 機能の作業であり、構造的にRigorの検出範囲の外にある**。より大規模な検出研究にはdiff形状のヒューリスティックとはるかに大きなコーパスが必要だろう。メッセージのgrepだけでは、ここでの分母は2になる。

## 結果 — 2件中0件を検出

両方のバグは本物のnilレシーバ`NoMethodError`であり — まさにRigorの`call.possible-nil-receiver`ルールのターゲットクラス — そして**Rigorはそのどちらも**修正前コミットでフラグしなかった（`rigor check
app lib`、両ケースとも該当ファイル内の診断は0件）。

### C1 — `IssuePriority#high?` / `#low?`

```ruby
def high?
  position > self.class.default_or_middle.position   # NoMethodError
end
```

`default_or_middle`（`def self.`のクラスメソッド）は、デフォルト / アクティブなプライオリティが存在しないとき`nil`を返す。`nil.position`は例外を投げる。**見逃した**理由は、Rigorが`self.class.default_or_middle`呼び出しを`Dynamic`として型付けする — クラスメソッドの戻り値を`IssuePriority | nil`として推論しない — ため、それに対する`.position`にはフラグすべきnilアームが存在しないからだ。

### C2 — `EmailAddress.domain_in?`

```ruby
def self.domain_in?(domain, domains)
  domain = domain.downcase   # NoMethodError when domain is nil
```

`domain`は呼び出し側が`nil`を渡すメソッドパラメータである。**見逃した**理由は、[ADR-5のrobustness原則](../../adr/5-robustness-principle/)に従い、Rigorはパラメータを**寛容に**型付けし、呼び出しサイトのフローがそれを証明しないかぎりパラメータが`nil`であるとは仮定しないからだ。

## 解釈

2件の見逃しは**ランダムではない** — それぞれが意図的なRigorの設計選択にたどり着く:

- C1 → 解決されないメソッドの戻り値は`Dynamic`にフォールバックする（グラデュアル型付けの最後の手段）。
- C2 → パラメータは寛容に型付けされる（ADR-5の第2項）。

これは**フォルスポジティブ規律の裏面**である（[`overview.md`](../../type-specification/overview/) §「False-positive
discipline」）。リリースタグsweepはRigorが動いているコードを*怖がらせない*ことを示した — surfacedは2プロジェクトのリリースラインを通じてゼロまたはゼロ近くにとどまった。このprobeは、その同じ寛容性のコストを示している: **潜在的な`NoMethodError`バグクラスに対する低い再現率（recall）**。正直なところを合わせた全体像は — Rigorが提供する価値は**適合率（precision、動いているコードでのフォルスポジティブが少ないこと）**であって、**再現率（recall、あらゆる潜在的なクラッシュを捕まえること）**ではない。それは動いているコードを尊重する解析器であって、網羅的なクラッシュ発見器ではない。

## 注意点

- **ごく小さなサンプル（n=2）**。結果は定性的なものであり — 「Rigorはこのバグ形状を見逃す、そしてその設計上の理由はこうだ」 — 較正された検出率ではない。
- メッセージのgrepは`NoMethodError`とラベルされていないバグを見逃す。本物の検出率研究には、diff形状のバグクラスヒューリスティック、より大きな期間、そして2つ目のプロジェクト（Mastodon）が必要である。

## 検討に値するフォローアップ

- **C1は手の届く範囲にある可能性がある**。ボディがnil許容な値を返す`def self.m`は静的に解析可能であり、その戻り値を`T | nil`として推論し（それを`self.class.m`を通じてスレッドする）れば、nilレシーバルールを発火させられるだろう。ADR-24のselfメソッド解決の作業に隣接している。スケジュールはされておらず、適合率・再現率の問いとしてキュー済み。
- **C2は見逃したままにすべきである**。寛容に型付けされたパラメータをnilリスクありとフラグすることはADR-5に矛盾し、フォルスポジティブ規律という価値が禁じているまさにその防御的コードへの圧力を再導入することになる。C2を安全に捕まえるには、呼び出しサイトのnilフローをパラメータへとたどる必要があり — FPリスクが高い。規律をそれと引き換えにする価値はない。

## 再現手順

`~/repo/ruby/rigor-survey/redmine/`（クローンしたチェックアウト）＋
`~/repo/ruby/rigor-survey/_redmine-sweep/rigor-no-as.yml`。各コミット`C`について: `git checkout C~1`、その後`rigor check --config
rigor-no-as.yml app lib`。
