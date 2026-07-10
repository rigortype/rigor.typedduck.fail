---
title: "ユニオンアームの述語極性ナローイング"
description: "rigortype/rigor docs/notes/20260710-union-arm-predicate-polarity.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260710-union-arm-predicate-polarity.md"
sourcePath: "docs/notes/20260710-union-arm-predicate-polarity.md"
sourceSha: "a22cc39e1440ce8ee74d2df79f2f560726e6a572223acb6ee2b8db28067c5195"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
sidebar:
  order: 20266710
---

設計ノート、2026-07-10。[module-singleton seed](../20260710-module-singleton-cross-file-seed/)の裁定が切り分け、ADR-57 WD3としてキューに積まれたFP除去スライスについて。その変更が恒常コーパスに追加した唯一の発火は、エンジンがナローイングを通せなかったActiveSupportの`present?`ガードであり、その根本原因は別の場所にある。本ノートでそれを解消する。

## ギャップ

```ruby
login = CodesetUtil.replace_invalid_utf8(raw)   # String | nil
login.downcase if login.present?                # `possible nil receiver` — a false positive
```

`login.present?`は実行時にnilを除外するが、Rigorはそれを認識できなかった。3つの別々のメカニズムがそろってこれを取りこぼす。

1. `present?`は**ActiveSupport**のメソッドである。`Narrowing`内のハードコードされた述語カタログ（`nil?`、`empty?`、`respond_to?`、…）にgemのメソッドを増やしてはならない――エンジンはプロジェクトがどのgemをロードしているか知らないからだ。
2. `rigor:v1:predicate-if-true`のRBSアノテーションはまさにこのために存在するが、`Narrowing#resolve_rbs_extended_method`は`Nominal`／`Singleton`のレシーバーについてのみファクトを読む。`rbs_extended_class_name`は`Union`に対してnilを返すため、**ユニオンレシーバーは述語ファクトをまったく受け取れない**。検証済み――`Object#present?`にアノテーションを付けても何も変わらない。
3. nil許容レシーバーこそが、ナローイングを必要とするまさにそのケースである。

到達範囲は1つの呼び出し箇所ではない。`present?`／`blank?`ガードの下で`Dynamic`を`T | nil`に変える精度向上作業はどれもこれを表面化させ、実際そうやって発見された。

## 観察

答えはすでに書き下されている。プロジェクトがすでにロードしているシグネチャの中にだ。

```ruby
class NilClass
  def present?: () -> false
  def blank?: () -> true
end
```

`nil`に対して常に`false`を返すメソッドは、`nil`レシーバー上で真として答えたはずがない。したがって`login.present?`の真の側の枝では、`String | nil`の`nil`アームはありえない。アノテーションも、ハードコードされたメソッドリストも、プラグインフックも不要――極性は宣言された戻り値型の帰結である。

## ルール

スコープ束縛（ローカル／ivar／`self`）を持つユニオンである`recv`について、条件として使われる引数ゼロ・ブロックなしの述語呼び出し`recv.m?`に対して:

- `m?`のすべてのRBSオーバーロードがリテラルの`false`を返すアームは、**真**の側の枝から落とされる。
- すべてのオーバーロードがリテラルの`true`を返すアームは、**偽**の側の枝から落とされる。
- それ以外のアームは両方の枝で生き残る。

何も落とされないとき、または枝が空になってしまうときはノーオペレーションとなる。

### 健全性の由来

**値でピン留めされた`nil`／`true`／`false`**であるアームだけが参加する。`Nominal[Foo]`アームはFooの*サブクラス*を静的に許容し、そのいずれかが述語をオーバーライドして逆の極性を返しうるため、これを落とすのは健全でない。`NilClass`、`TrueClass`、`FalseClass`にはサブクラスがなく――宣言された戻り値が実行時の戻り値そのものである。この制限はカバレッジを犠牲にする保守的な近似ではない。nil許容ユニオンこそが動機となる母集団の全体なのだ。

**ぼっち演算子（safe navigation）は除外する**。 `login&.blank?`はnilレシーバーに対して`NilClass#blank?`の宣言された`true`ではなく`nil`（偽）を返すため、偽の側の枝はnilを許容する。そこでアームを落とせば、このルールが避けるために存在するまさにその偽陰性を製造してしまう――`login.downcase unless login&.blank?`は本当に例外を投げうる。`analyse_safe_nav_receiver`が引き続きその形状の真の側の枝を担う。リグレッションのspecがこれをピン留めしている。

## ゲート

`make verify`、`make bench-perf`（アロケーション28.55 M、上限29.17 M）、`make docs-check`はクリーン、`lib`のセルフチェックは無言。module-singleton seedをすでに搭載しているmasterに対するコーパスdiff（`check --no-cache --no-baseline`）:

| コーパス | before | after | |
|---|---:|---:|---|
| haml / kramdown / liquid / rgl `lib` | 59 / 68 / 2 / 70 | 同一 | ActiveSupportなし |
| Mastodon `app/models` | 5 | 5 | |
| Redmine `app`+`lib` | 73 | **69** | 偽陽性4件を除去 |
| GitLab `app` | 284 | **268** | 偽陽性16件を除去 |

**どこにも新規発火はゼロ**。 20件の除去はすべて裁定されたものであり、想定ではない。Redmineの1件は、このスライスが解消するために存在するADR-57 WD3の発火である（`user.rb:559`、`if login.present?`の下の`login.downcase`）。Redmineの残り3件とGitLabの14件は、ルールが直接ターゲットとするのと同じガード付き形状である。

- `issue_import.rb:306` ―― `return if content.blank?`の後に`content.split(",")`
- `query.rb:765` ―― `values.present? ? values.split('|') : ['']`
- `bamboo.rb:123` ―― `if result.blank? … else result.dig(…)`（偽の側の枝）
- `jira.rb:637` ―― `comments.present? && comments.any? { … }`（`&&`の右オペランド）
- `create_service.rb:189` ―― `params[:description] = default_template.content if default_template.present?`

残る2件（`clusters_controller.rb:106`と`:109`、見える範囲にガードのない`response`上）は**推移的（transitive）**であり、呼び出し箇所では説明のつかないように見えるため名前を挙げておく価値がある。呼び出し先の`Clusters::Migration::CreateService#execute`は`return validation_error if validation_error.present?`で始まる。真の側の枝でnilアームが今や落とされるため、その早期returnは非nil型を寄与し、`execute`の推論された戻り値はnilアームを失い、ADR-57の戻り値採用によって`response`は両方の呼び出し箇所で非nilになる。ナローイングはあらゆるホップで正しい――`return X if X.present?`は決してnilを返さない。

これがこのルールから一般に期待すべき形状である――その効き目はガードされた式に束縛されない。より鋭いメソッド戻り値が伝播するからだ。

## これがしないこと

これは*宣言された*戻り値型を読むため、プロジェクトがナローイングを得るのはシグネチャがリテラルを宣言している箇所に限られる。今日それはAS core-extバンドルと、ADR-72の`data/gem_overlay/activesupport`の対応物である。Rubyの本体から極性を推論するものは何もない――プロジェクト独自のNilClass再オープンにおける`def present? = false`は読まれないし、読まれるべきでもない。ルールの健全性は、シグネチャが契約であることに拠っている。

`resolve_rbs_extended_method`における、ユニオンレシーバー向けの一般的な`rigor:v1:predicate-if-true`ファクトのギャップは未解決のままである。それはより大きなサーフェス（ブール極性ではなく、アームをまたぐ任意のターゲットのリファインメント）であり、まだそれを要求するコーパスがない。
