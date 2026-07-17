---
title: "ADR-91 — Kernelイントリンシック畳み込みの所有権ゲート＋表記パリティ不変条件"
description: "rigortype/rigor docs/adr/91-kernel-intrinsic-fold-ownership-gate.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/91-kernel-intrinsic-fold-ownership-gate.md"
sourcePath: "docs/adr/91-kernel-intrinsic-fold-ownership-gate.md"
sourceSha: "88ab8c3501a0f2c59d34cd3be6f39a31403e2213211f690e97ea50c6bd2be35c"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 4091
---

Status: <strong>Accepted — 2026-07-16実装済み（WD1–WD4、同一ブランチ）。</strong>WD4ゲートは裁定時の想定より強い結果を返した: mail / kramdown / hamlの`lib`とMastodonの`app/models`はmasterと**バイトレベルで同一**であり（これらのコーパスには外部レシーバーによるintrinsic表記の呼び出し箇所が存在せず、想定していたハイジャック除去のdiffすら生じなかった）、`make verify`はグリーン、WD3のパリティspec（34例）が不変条件を固定する。

根拠: rigor-rs移植のupstreamフィードバックノート（rigor-rsの`docs/notes/20260716-upstream-feedback.md`、項目1）と、それが促したPR [#110](https://github.com/rigortype/rigor/pull/110)の修正。

## Context

PR #110はあるバグクラスの一事例を修正した: `Kernel.p(42)`が恒等畳み込みを辞退する一方で`Kernel.format("%d", 1)`は畳み込まれた── 同じ`module_function`サーフェスの2通りの表記が、逆の極性を持っていたのである。この修正は2つの箇所を手作業で統一した。だが、それを生み出した構造は変わっていないため、このバグの**クラス**（類型）は依然として未解決である:

- **所有権チェックは畳み込みごとかつオプトインである**。`kernel_owned_call?`（`kernel_dispatch.rb`の ~L150）は`p`/`pp`/`String`/`Hash`から、そして#110以降は`format`/`sprintf`から参照されるが、同じ層の`Array` / `Integer` / `Float` / `Rational` / `Complex`からは**参照されない**。`def Integer(x)`を定義するユーザークラスでは、`conv.Integer("42")`が今日なお`Constant[42]`に畳み込まれる── #110が`obj.format(...)`から除去したのと同じハイジャックの形が、ひと画面隣でまだ生きているのである。
- **Kernelのモジュール関数サーフェスには2人の所有者がいる**。恒等／変換の畳み込みは`KernelDispatch`にあり、`format`/`sprintf`の畳み込みは`LiteralStringFolding`（`fold_format`）にある。#110の非対称性は、まさに2つの層が1つのサーフェスを2つのガードポリシーの下で実装していたために存在した。
- **表記パリティを固定するものが何もない**。`module_function`は暗黙のselfと明示的な`Kernel.`という表記を同一のランタイム呼び出しにするが、エンジンがそれらを同一に型付けすることを保証するspecは存在しない。そのため、どちらかの層に次に追加される畳み込みが極性をサイレントに退行させうる── 現状では、バイトレベルでプローブする第二の実装（rigor-rs）が唯一の検出器である。

## Decision

**Kernelのモジュール関数の畳み込みは、ディスパッチャーが保持する単一の所有権ゲートの背後でのみ走り、そのメソッド名サーフェスはデータであり、暗黙のself／明示的な`Kernel.`という表記のパリティは、その同じデータから導出される、specで強制される不変条件である**。

この基準は、ADR-52/ADR-53の「保持する鍵によるゲート」規則を組み込みの層に適用したものである: 「この呼び出しはKernel自身のモジュール関数である」を鍵とするケイパビリティは、ディスパッチャーによって、すでに保持している鍵（メソッド名 ∈ コンパイル済みテーブル、レシーバーがnil/self/`Singleton("Kernel")`、ユーザー再定義が検出されていない）に基づいて一度だけゲートされねばならない（MUST）── 決して層の本体内で畳み込みごとに再導出してはならない。そこでは、それを忘れることが既定の失敗モードなのである。

## Working decisions

- **WD1 — ゲートを巻き上げる**。`MethodDispatcher.dispatch_precise_tiers`（`method_dispatcher.rb`の ~L738、`PRECISE_TIERS_TAIL`の走査）は、`context.method_name`が新しい`KernelDispatch::INTRINSIC_NAMES`テーブルに含まれ、かつ巻き上げられた`kernel_owned_call?`が通過したときにのみ`KernelDispatch`を参照する。層の内部にあった畳み込みごとのガードは、その後複製されるのではなく削除される── WD1以降、「ガードを忘れる」畳み込みは表現不可能になる。`KernelDispatch.try_dispatch`を直接呼び出すユニットプローブは、今日の「呼び出し側が保証する」契約を維持する。
- **WD2 — サーフェスごとに所有者は1人**。`fold_format` / `fold_format_constant`は`LiteralStringFolding`から`KernelDispatch`へ移動し、すべてのKernelモジュール関数の畳み込みがWD1ゲートの背後に置かれる。`String#%`は`LiteralStringFolding`に留まる── それはレシーバー型付けされたStringメソッドであり、Kernelのモジュール関数ではない。
- **WD3 — テーブル駆動のspecとしてのパリティ**。あるspecは`INTRINSIC_NAMES`（ゲートが読むのと同じ定数）を、名前ごとに1つの代表的な呼び出しで反復し、暗黙のself表記の推論型が明示的な`Kernel.`表記のそれと等しいことをアサートする。specはケースのリストをゲート自身のデータから導出するため、テーブルに追加された畳み込みは自動的にパリティ検査され、テーブルエントリー**なし**に追加された畳み込みはそもそも一切走らない── #110のバグクラスの両半分が機械的に閉じられる。
- **WD4 — ゲート**。ゼロデルタではなくコーパス裁定による: 想定される唯一のdiffは外部レシーバーのハイジャック除去（`obj.Integer(...)`の形、厳密に偽陽性削減方向── `Kernel#Integer`はprivateなので、明示的な非`Kernel`レシーバーは必然的にユーザーメソッドである）。`make verify`に加えてMastodon/GitLabコーパスのdiffスイープを行い、すべてのdiffを裁定した。

## Rejected / deferred alternatives

- **代わりに表記を正規化する（ディスパッチ前に明示的な`Kernel.`呼び出しを暗黙形へ書き換える）**。最も強い形── 非対称性が表現不可能になる── だが、この書き換えはRBS解決（public-singleton対private-instanceのルックアップ経路）を含む下位のすべての層から見えてしまい、WD1にはない影響範囲を持つ。不釣り合いとして却下。WD1+WD3が畳み込み層で同じ保証を達成する。
- **畳み込みごとのガードを維持し、欠けているものを追加するだけにする**。 #110の形を繰り返す: 今日は正しいが、次の畳み込みで再発が保証される。却下── これは廃止されつつある構造そのものである。
- **rigor-rsの差分ハーネスに頼る**。それは項目1を発見し、そのプローブコーパスは良い種であるが、外部の、移植スケジュールに結合した検出器であって、このリポジトリのCIにおけるゲートではない。補完として先送り（フィードバックノート項目7）、需要に応じてゲートする。

## Consequences

- ポジティブ: #110のバグクラスは構造的に閉じられ（ゲートは一度だけ存在する）、観測可能な形で固定される（パリティspec）。現在ゲートされていない5つの変換畳み込みは所有権ガードを無償で得て、生きているハイジャック偽陽性の危険を除去する。Kernelセマンティクスを所有する層が1つ減る。
- ネガティブ／コスト: `dispatch_precise_tiers`はホットパス上で1回のテーブルルックアップを追加する（有界であり、`STDLIB_SINGLETON_FOLDERS`の先例と同じ形）。`LiteralStringFolding`と`KernelDispatch`のユニットspecはコードとともに移動する。
- キャリーオーバー: WD3のパリティspecは畳み込みのみを対象とする。RBS層の表記パリティ（`Kernel.p`がpublic singleton経由で解決されるか、暗黙のprivate instance経由か）は手つかずのままで、RBS環境の契約であり続ける。

## Relationship to other ADRs

- **ADR-52 / ADR-53** — 基準を供給する（保持する鍵によるゲート、組み込み層向けのコンパイル済み名前テーブル）。WD1は、`STDLIB_SINGLETON_FOLDERS`がstdlibのシングルトン畳み込みに対してすでに行ったのと同じ動きである。
- **ADR-62** — 精神における同族性: WD3は、外部で発見された偽陰性検出器（rigor-rsの差分プローブ）を、リポジトリ内の不変条件ゲートに変える。
- **ADR-5** — WD4の偽陽性削減方向は、ロバストネス原則が好む失敗モードである: 所有されていない畳み込みを辞退することは、誤った精度を除去することしかできず、動作するコードを拒絶することは決してない。
