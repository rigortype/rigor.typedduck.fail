---
title: "upstream `ruby/rbs` PR — `Resolv::DNS`のタイプクラスによる戻り値型の絞り込み"
description: "rigortype/rigor docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md"
sourcePath: "docs/notes/20260528-rbs-upstream-pr-resolv-typeclass.md"
sourceSha: "9ca7ce3f81587b16a4d6ddfa6075c87945f3e8135c527dcd74bf7149c5759f4a"
sourceCommit: "1881619b60b29439a03e7a1f8fee266031c9ca10"
translationStatus: "translated"
sidebar:
  order: 20266528
---

upstreamのPRを準備する並行セッション（`/Users/megurine/repo/ruby/rbs`）への引き継ぎメモ。Mastodon解析サイクル（2026-05-28、789→2エラー）では、upstreamのPRが解消する一つのユーザー向けstdlib RBSギャップが残りました。CURRENT_WORKで参照されていたもう一つのギャップ（`StringScanner#[]`）はupstreamにすでにマージ済みであることが判明しました。

## 1. `StringScanner#[]` — upstreamに取り込み済み、PRは不要

upstream `stdlib/strscan/0/string_scanner.rbs:501`（`fcc16851`時点のHEAD）:

```ruby
def []: (Integer | String | Symbol) -> String?
```

バンドル済みの`rbs-3.10.0`（Rigorが現在使用しているバージョン）にはまだ狭い`(Integer) -> String?`のシグネチャしかなく、これがMastodonトライアルで`signature_parser.rb`の`scanner[:key]`呼び出し箇所が誤検知する原因です。**修正はupstream PRではなく、Rigor側での`rbs` gemバージョン引き上げです**。 upstreamセッションのスコープ外です。

## 2. `Resolv::DNS#getresources` / `#getresource` / `#each_resource` — タイプクラスによる戻り値型の絞り込み

**実際のPRの対象**。

### 実証的な根拠

Mastodon `app/validators/email_mx_validator.rb:49`:

```ruby
records = dns.getresources(domain, Resolv::DNS::Resource::IN::MX).to_a.map { |e| e.exchange.to_s }
```

`.exchange`は`Resolv::DNS::Resource::MX`（および`IN::MX`が継承）に定義されており、基底クラスの`Resolv::DNS::Resource`には**定義されていません**。現行のupstreamシグネチャ（`stdlib/resolv/0/resolv.rbs:311`）:

```ruby
def getresources: (dns_name name, singleton(Resolv::DNS::Query) typeclass) -> Array[Resolv::DNS::Resource]
```

要素型が上限の`Resolv::DNS::Resource`になっており、タイプクラスが決定する部分型が失われています。特定のサブクラスを渡す呼び出し側（`dns.getresources(name, IN::MX)` / `IN::A` / `IN::AAAA`という形式——実際にはほぼこれしか使わない）は型精度が落ちてしまいます。

### 同じ形状の兄弟メソッド

いずれも`stdlib/resolv/0/resolv.rbs`の`Resolv::DNS`クラス内:

| 行 | メソッド | インターフェース |
|---:|---|---|
| 302 | `getresource` | 1件の`Resource`を返す |
| 311 | `getresources` | `Array[Resource]`を返す |
| 221 | `each_resource` | ブロックパラメータが`Resource` |
| 223 | `extract_resources` | ブロックパラメータが`Resource` |

`fetch_resource`（230行目）もタイプクラス引数を受け取りますが、`Resource`を返す・ブロックに渡すわけではありません——ブロックには`(Message, Name)`が渡されます。スコープ外です。

### 提案する修正——有界ジェネリクスメソッド

RBSは有界型パラメータをサポートしています（先例: `core/random.rbs:97`の`def rand: ... | [T < Numeric] (::Range[T]) -> T`、`core/encoding.rbs:136 / :182`、`core/dir.rbs:919`、`core/kernel.rbs:679 / :1407 / :1449 / :2279`、`core/marshal.rbs:154`、`core/ractor.rbs:557`）。メソッドごとに1行のジェネリクスにするのが最もすっきりした形です。

```ruby
def getresources: [T < Resolv::DNS::Resource] (dns_name name, singleton(T) typeclass) -> Array[T]

def getresource: [T < Resolv::DNS::Resource] (dns_name name, singleton(T) typeclass) -> T

def each_resource: [T < Resolv::DNS::Resource] (dns_name name, singleton(T) typeclass) { (T) -> void } -> void

def extract_resources: [T < Resolv::DNS::Resource] (Resolv::DNS::Message msg, dns_name name, singleton(T) typeclass) { (T) -> void } -> void
```

### エッジケース — `Resolv::DNS::Resource::ANY`

`Resolv::DNS::Resource::ANY < Resolv::DNS::Query`（`stdlib/resolv/0/resolv.rbs:833`）は`Resolv::DNS::Resource`のサブクラスでは**ありません**——`Query`配下で`Resource`と並列の位置にあります。`ANY`をタイプクラスとして渡すと、マッチするリソース型の異種混合が返され、静的には裸の`Resource`エンベロープになります。有界パラメータ`[T < Resolv::DNS::Resource]`は`ANY`を除外するため、旧来の広いオーバーロードがフォールバックとして並存します。

```ruby
def getresources: [T < Resolv::DNS::Resource] (dns_name name, singleton(T) typeclass) -> Array[T]
                | (dns_name name, singleton(Resolv::DNS::Resource::ANY) typeclass) -> Array[Resolv::DNS::Resource]
```

（3つの兄弟メソッドも同じ形状。）

### 代替案 — サブクラスごとのオーバーロード

有界ジェネリクスがupstreamのテストコーパスで扱いにくい推論出力を生む場合、明示的なオーバーロード方式は冗長さと引き換えに予測可能性をもたらします。完全なセットは`Resolv::DNS::Resource::IN::{A, AAAA, CNAME, HINFO, LOC, MINFO, MX, NS, PTR, SOA, SRV, TXT, WKS}`と`Resolv::DNS::Resource::Generic`サブクラス（および`ANY`フォールバック）をカバーします。約16オーバーロード行×4メソッド≈64行——許容範囲内ですが、ジェネリクス方式が機能するなら後者が望ましいです。

## Rigor側の調整事項

- RigorはこのギャップのためのRigor独自の`sig/`オーバーレイやstdlibオーバーレイプラグインを提供する**予定はありません**。判断（このノートの作成セッションのコミットメッセージを参照）は**OptionD + A**: upstreamに委ねてドキュメント化する——それまでの間、影響を受けるプロジェクト向けにユーザー側での`signature_paths:` / `# rigor:disable`回避策を案内する。
- Mastodonの残存エラーは[`docs/CURRENT_WORK.md`](../../current-work/)の「2件の残存エラー」の項にResolv側ギャップとして記録されています。
- upstreamのPRがマージされ新しい`rbs` gemがリリースされれば、Rigorのバンドル`rbs`バージョン引き上げによってMastodonの該当箇所が自動的に解消されます（`StringScanner#[]`の箇所も同時に）。

## 参考情報

- upstream rbs HEAD: コミット`fcc16851`（2026-05-28）にて調査。
- 比較対象のバンドル済み`rbs-3.10.0`。
- Mastodon該当箇所: `app/validators/email_mx_validator.rb:49`。
- CURRENT_WORK「Stdlib RBSカバレッジギャップパターン」項目。
