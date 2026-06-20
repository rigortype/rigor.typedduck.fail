---
title: "`Plugin::Base`契約に対するプラグインファイルの型付け — スパイクの所見"
description: "rigortype/rigor docs/notes/20260603-plugin-contract-self-typing-spike.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260603-plugin-contract-self-typing-spike.md"
sourcePath: "docs/notes/20260603-plugin-contract-self-typing-spike.md"
sourceSha: "d85c2aeced650ed4cd68918cf6da92ac4f4778c50720a5f088dc40799f580f68"
sourceCommit: "b5c25bc5a9e53d495e4f515a9506f10fd4bef8d7"
translationStatus: "translated"
sidebar:
  order: 20266603
---

**日付:** 2026-06-03
**ステータス:**スパイク完了。Layer 1（RBS）＋Option B（構造的スペック）が着地。
Option A（プラグインツリー上のstrictなSteep）は計測の結果**成立せず**棚上げ。
「Rigorはスタンドアロンで警告できるか？」というフォローアップはスコープ付きの推論欠落に
たどり着き、**ADR-43**として書き起こされ完全に着地した（WD1–WD6）：エンジン＋
`manifest.rbs`でプラグインlibツリーに正味FPゼロ、16件の既存ツリー欠落を解消、そして
`make check-plugins`ゲートを`make verify`＋CIに配線。

## 問い

プラグインファイル（`plugins/*/lib`、`examples/*/lib`）を、「プロトコル」（RBS／構造的
型付け）を使って`Rigor::Plugin::Base`契約（contract）に対して型検査／制約できるか。
それにより、契約を誤用またはオーバーライドミスするプラグインが機械的に捕捉されるように
できるか。

## すでに成立していたこと

- `sig/rigor/plugin/base.rbs`は**約30個中4個**のメソッド（`manifest`／`initialize`／
  `init`／`prepare`）を宣言していた。ADR-37の拡張DSL、オーバーライドフック、エンジンが
  実行するディスパッチャー、そしてすべての著作用ヘルパーは型なしだった。
- `make check`（`rigor check lib`）と`make steep-check`はどちらも**`lib`のみ**を
  対象とする。`base.rb`は`lib`内にある（チェック対象）が、`plugins/*/lib`内のプラグイン
  *サブクラス*は**どちらの**チェック対象でもない。
- `sig/`は疎である──249個のlibファイル中37個──そしてSteepは`D::Ruby.lenient`で
  走るため、シグネチャのない協力者は`untyped`である。

## Layer 1 — `base.rbs`の完成（着地済み）

著作者向けの全サーフェス（DSL、フック、ディスパッチャー、ヘルパー）を宣言し、まだ
シグネチャのない協力者（Diagnostic、Cache::Descriptor、FlowContribution、NodeContext、
Prismノード）を`untyped`として受け取る。両方のセルフチェックはグリーンを維持する。
これを完成させると**lenientチェックがマスクしていた真のRBS欠落が即座に表面化した**：
`IoBoundary#cache_descriptor`（および`#open_url`）は`Base`から呼ばれていたが
`io_boundary.rbs`には存在しなかった──いまは宣言されている。これは縮図としての価値で
ある：完全な契約は、沈黙した型なしの穴を、チェックされた穴に変える。

## Option A — プラグインツリー上のstrictなSteepターゲット — **成立せず**

仮説：`NoMethod`をerrorに昇格させた`:plugins` Steepターゲット
（`check "plugins/*/lib"`、…）を追加し、プラグインコード内の契約誤用が、いまや完全な
Base RBSに対して捕捉されるようにする。

計測した現実:

1. **Steepはプラグインファイルを*確かに*Base RBSに対してチェックする**──プラグイン
   サブクラス内のプローブ`manifest.totally_bogus_method`は`Ruby::NoMethod`（「
   `::Rigor::Plugin::Manifest`はメソッド`totally_bogus_method`を持たない」）として
   捕捉される…ただし`[information]`重大度でのみである。`lenient`プリセットが
   `NoMethod`を格下げするからである。デフォルトの`steep check`はそれを隠し、
   `--severity-level=information`がそれを露わにする。

2. **致命的な偽陽性の壁：**プラグインはBase（RBS既知）をサブクラス化するが、**自身の
   RBSをまったく出荷しない**ため、Steepは`self`を素の`Rigor::Plugin::Base`として
   型付ける。したがってプラグインの**自身のprivateヘルパーメソッド**へのあらゆる
   呼び出しが`NoMethod`を報告する。`rigor-deprecations`単独で計測：3件の偽陽性──
   `matches?`、`receiver_source`、`deprecation_diagnostic`、いずれもプラグイン自身に
   定義されている（86／93／99行）。37個のプラグイン全体でこれは遍在する：すべての
   プラグインがprivateヘルパーを定義する。

   真のシグナル（「存在しない*Base*メソッドを呼んでいる」、たとえばタイポした
   `node_rul`）と、FP（「*自身の*ヘルパーを呼んでいる」）を分離するきれいな方法はない
   ──どちらも「`Base`はメソッドXを持たない」として描画される。

3. Aを成立させるには、Steepが各プラグイン自身のメソッドを見えるよう、**37個すべての
   プラグインに対するプラグインごとのRBS**が必要になる。それは規模と、リポジトリの
   sig-gen優先／手書きRBS回避ポリシー（AGENTS.md §「RBS Authorship」）により却下され、
   それ自体が大きなFPを孕むサーフェスになるだろう。

偽陽性の規律の価値（「動作しているコードを決して脅かさない」）に従い、Aは棚上げした。
`:plugins` Steepターゲットはコミット**しなかった**。

> ⚠️ 再挑戦する者へのワナ：Steepターゲット内の`library "set"`はRBS 4.0.2を**クラッシュ
> させる**（`set`はRuby 4.0ではコアであり、見つけられるライブラリではない）──シグネチャ
> サービスのスレッド例外を通じて実行をハングさせる。また`steep check <path>`の位置
> フィルタ／`Dir.glob(...).each { check }`はこのバージョンでは**ゼロ**個のファイルを
> 黙ってチェックした。動いたのはリテラルな`check "<dir>"`エントリーのみだった。どちらも
> ここで実時間を浪費させた。

## Option B — 構造的適合性スペック — **着地済み**

`spec/integration/plugin_contract_conformance_spec.rb`。純Rubyの`Method#parameters`
比較で、RBSは不要、**プラグイン自身のメソッドにFPなし**。著作者がオーバーライド可能な
各フック（`init`、`prepare`、`flow_contribution_for`、`diagnostics_for_file`）に
ついて、エンジンの呼び出し形状を**Base自身のシグネチャ**から導出し（あらゆる契約変更に
自動追従）、すべてのプラグイン*オーバーライド*がそれで依然として呼び出し可能であると
表明する──広げる方向には寛容（追加のオプションパラメータ／`*rest`／`**keyrest`は
すべて通る。ADR-5のPostel）であり、必須パラメータを落とす*狭める*オーバーライドのみを
失敗させる。

実行時に実際にプラグインを壊す唯一の違反を捕捉する──`def diagnostics_for_file(path:)`が
`scope:`／`root:`を落とす→ディスパッチ時の`ArgumentError`。37個すべてのプラグインで
グリーンを検証し、注入された違反で（正確な違反者メッセージとともに）失敗することを
検証した。

## RigorはSteepの代わりに警告できるか？（→ ADR-43）

フォローアップの問い：Option Aは契約誤用を捕捉するのに**Steep**を使い、偽陽性の壁に
ぶつかった。代わりに**`rigor check`**（スタンドアロン）でそれができるか？`dump_type`
プローブが決着をつけた:

- **`call.undefined-method`には効力があり、プラグイン自身のメソッドに対してFP安全で
  ある。** `Rigor::Plugin::Manifest.new(...)`は`Nominal[Manifest]`に解決され、
  `m.totally_bogus_method`はルールを発火する（error）。決定的に、プラグイン内部の
  `dump_type(self)`は→`Rigor::Plugin::ProbeDump`（*サブクラス*）になる。Rigorが
  プラグインの`def`をソースから読み取るからである──そのためSteepの自身ヘルパーFPの壁を
  **持たない**。Rigorはここで構造的により良いツールである。

- **しかし契約サーフェスは不可視である：RBS祖先から継承された呼び出しは
  `Dynamic[top]`に解決される。** `self.manifest`、`io_boundary`、`signature_paths`
  （いずれもRBSで`Base`上にある）→`Dynamic[top]`となるため、誤用を捕捉できない
  （Dynamicレシーバー＝open）。`class MyHash < Hash`→`self.keys`も`Dynamic[top]`で
  ある：これはプラグイン固有ではなく**一般的な**挙動である。

- **特定した場所：** `rbs_dispatch.rb` `lookup_method`（~L270）──Rubyソースの
  サブクラス名がRBSの`class_decls`に存在しないため、メソッドルックアップは祖先ウォーク
  の前に`nil`へショートサーキットする。ディスパッチは`Dynamic[top]`にデフォルトする。
  `class Sub < Base`エッジは*確かに*記録されている（`Scope#discovered_superclasses`、
  ADR-24 Slice 2）が、`RbsDispatch`からは決して参照されない。

- **なぜグローバルに切り替えられないか：** `Dynamic[top]`フォールバックは荷重を担う
  FP保護である。`class MyController < ActionController::Base`が`params`／`render`を
  *部分的な*gem RBSに対して呼ぶと、RBSが省くすべての継承メソッドでFPになるだろう。
  精度（継承された戻り値型）とリスク（継承呼び出しでの`undefined-method`）は1本のパスを
  共有する。

- **成立する形** ──継承解決を*実行する*対象となる**RBS-completeな祖先のアローリスト**
  （シード`{Rigor::Plugin::Base}`）であり、それ以外はすべてDynamicフォールバックを
  維持する。構成上FP安全であり、ドッグフード可能で、SteepのFPの壁なしにOption Aの目標を
  Rigorを通じて実現する。**ADR-43**として書き起こした（提案、計測ゲート付き）。注入点は
  `rbs_dispatch.rb` `lookup_method`である。これはADR-26の`open_receivers:`つまみの双対
  ──open-to-suppress対closed-to-enable──である。

## 総括

- 「プラグイン契約を型付ける」はきれいに分かれる：**RBSが契約を述べる（Layer 1、
  着地済み）**；**構造的スペックがオーバーライド適合性を強制する（Option B、着地済み）**；
  **プラグインファイル上のstrictなSteepはプラグインごとのRBSなしには誤用を強制できない
  （Option A、FPを理由に棚上げ）**；そして**Rigorはスタンドアロンで誤用を*強制できる*が、
  スコープ付きの推論欠落だけがそれを阻んでいる（ADR-43、提案）**。
- 残る未強制のサーフェスは*プラグイン内部からの型付き契約の誤用*（存在しないBase／
  ヘルパーメソッドの呼び出し）である。今日はプラグイン自身の統合スペックによって実行時に
  捕捉されており、静的にではない。ADR-43のアローリスト祖先解決が、それを`rigor check`で
  捕捉する道である──プラグインごとのRBS（それもAの壁を溶かすが、37組の手書きシグネチャ
  セットのコストがかかる）より選好される。
