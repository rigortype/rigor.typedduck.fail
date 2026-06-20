---
title: "ADR-43 — RBS完全な祖先解決（許可リストによる継承メソッドのディスパッチ）"
description: "rigortype/rigor docs/adr/43-rbs-complete-ancestor-resolution.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/43-rbs-complete-ancestor-resolution.md"
sourcePath: "docs/adr/43-rbs-complete-ancestor-resolution.md"
sourceSha: "8dbfae53abfc891afd7cd1bef8f389f9bee2f97aa7399460a7c793508149e319"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4043
---

ステータス: **Accepted — 全面的に着地（WD1–WD6）、2026-06-03**。
`rigor check`が、Rubyソースのサブクラスの*継承された*メソッド呼び出しを、
**アローリスト化された**RBSのみの祖先に対して解決できるようにする。これにより
エンジンはその祖先の契約（contract）サーフェス（surface）の誤用を警告できる。
動機となったケースは`Rigor::Plugin::Base`プラグイン契約そのものである。アロー
リスト解決（WD1–WD3）、その`scope`スレッディング（WD2）、そしてFP計測（WD5）は
実装・検証済みである。バンドル済みプラグインの**lib**ツリーでは、`manifest.rbs`を
完成させたあとこの変更による正味の診断（diagnostic）追加は**ゼロ**になる（解決が
最初に表面化させた26件のFPはすべて`Manifest#id`／`#protocol_contracts`であり、
`Manifest`自身のRBSにあった真の欠落だった。いまは塞がれており、Layer 1が
`IoBoundary`で踏んだのと同じパターンである）。**WD6は完了**：プラグインlibツリーが
抱えていた16件の*既存の*診断──本ADRとは無関係（`Analysis::Diagnostic`シングルトン
ファクトリーと`Plugin::AccessDeniedError`の`< StandardError`の不完全なRBS、加えて
`rigor-rspec`の`Prism::Node#block`フローナローイングの欠落1件で、明示的な
`is_a?(Prism::CallNode)`ナローイングで修正）──は片付けられ、`make check-plugins`
ターゲット（`make verify`に連結され、CIではコールドセルフチェックのバリアントで
ゲートされる）がプラグインlibツリーをクリーンに保つ。いまやバンドル済みプラグインの
いずれかで契約を誤用するとビルドが`call.undefined-method`で失敗し、これは
エンドツーエンドで検証済みである（`manifest.bogus`を注入→非ゼロ終了）。決定、
偽陽性の境界、そして却下された代替案を以下に記録する。

根拠:
[`docs/notes/20260603-plugin-contract-self-typing-spike.md`](../../notes/20260603-plugin-contract-self-typing-spike/)
（完全なスパイク：なぜSteepはプラグインごとのRBSなしにプラグイン契約を強制できない
のか、この欠落を特定した`dump_type`プローブ、そして`call.undefined-method`の効力と
FP安全性に関する知見）。

## コンテキスト

### 問い

「私たちは`lib`をSteepと`rigor check`で型検査している。プラグインファイルが
`Plugin::Base`契約を誤用したとき──たとえば契約が定義していないメソッドを呼んだり、
裏でリネームされてしまったメソッドを呼んだり──**Rigor自身**が（スタンドアロンで、
Steepなしで）警告できるか？」

`sig/rigor/plugin/base.rbs`（[プラグイン契約RBS]、着地済み）の完成と、
オーバーライドアリティの適合性スペック
（[`spec/integration/plugin_contract_conformance_spec.rb`]、ADR-37のフォローアップ、
着地済み）が2つの側面をカバーする。本ADRは3つ目について扱う：**プラグイン内部からの
型付き契約サーフェスの静的な誤用**──`manifest.bogus`、`io_boundary.bogus`、リネーム
されたヘルパーの呼び出しなど。

### スパイクで判明したこと

`dump_type`ベースのスパイク（ノートの§「Can Rigor warn instead of Steep」）が
3つの事実を確立した:

1. **`call.undefined-method`ルールには効力があり、プラグイン自身のメソッドに対して
   FP安全である。**直接構築された`Rigor::Plugin::Manifest.new(...)`は
   `Nominal[Manifest]`に解決され、`m.totally_bogus_method`は
   `call.undefined-method`（error）を発火する。Steep──`self`を素のRBS `Base`として
   型付けるため、プラグイン*自身*のRBS未記述ヘルパーへのあらゆる呼び出しで偽陽性に
   なる（ノートの§「Option A」）──とは異なり、Rigorはプラグインの`def`をソースから
   読み取り、`self`を*サブクラス*として型付け（`dump_type(self) →
   Rigor::Plugin::ProbeDump`）、自身のヘルパー呼び出しを正しく解決する。Rigorは
   この点でSteepより構造的に適している。

2. **しかしRBS祖先から継承された呼び出しは`Dynamic[top]`に解決される**。
   `self.manifest`、`io_boundary`、`signature_paths`──いずれもRBSで`Base`上に宣言
   され、いずれもサブクラスとして型付けされた`self`上で呼ばれる──は、そのRBSの戻り値型
   ではなく`Dynamic[top]`に解決される。そのため契約サーフェスはエンジンから不可視に
   なり、誤用を捕捉できない。レシーバーが`Dynamic`であり、`call.undefined-method`は
   定義上それを対象外とするからである。

3. **これはプラグイン固有ではなく一般的な挙動である**。`class MyHash < Hash`も
   `self.keys`（コアの`Hash` RBSから継承）を`Dynamic[top]`に解決する。RBSのみの
   クラスのRubyソースサブクラスは、継承されたRBSメソッドに対して盲目である。

### なぜギャップが存在し、なぜそれが要となるのか

場所は
[`rbs_dispatch.rb` `lookup_method`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/method_dispatcher/rbs_dispatch.rb)
（~L270）：`Nominal[Sub]`レシーバー上のディスパッチは
`instance_method_definition("Sub", …)`を呼ぶが、Rubyソースのサブクラス名がRBS環境の
`class_decls`に存在しない（`rbs_loader.rb` ~L968）ため即座に失敗する。**祖先ウォーク
は走らない**──RBSの`DefinitionBuilder`は到達すれば祖先をウォークするが、その前に
クラス存在チェックがショートサーキットする。ディスパッチは以降のあらゆるティアを
すり抜け（`user_class_fallback`もクラスがRBS既知であることを要求する）、
`Dynamic[top]`にデフォルトする。

継承エッジは*既知*である：`class Sub < Base`は`Scope#discovered_superclasses`
（ADR-24 Slice 2）に記録されており、すでにファイルをまたぐ*ユーザー*メソッド解決の
ために`ExpressionTyper#resolve_user_def_through_ancestors`が利用している。それが
単にRBS祖先に到達するために`RbsDispatch`から参照されていないだけである。

`Dynamic[top]`フォールバックが意識的な決定であったか否かにかかわらず、その**効果は
偽陽性保護**であり、これをグローバルに取り除くのは安全でない。
`class MyController < ActionController::Base`が`params`、`render`、`head`、…を
*部分的な*gem RBSに対して呼ぶと、RBSが省いている継承メソッドのすべてが、動作している
コード上の`call.undefined-method`偽陽性に変わってしまう。精度の向上（継承された戻り値型
の解決）とリスク（継承呼び出しでの`undefined-method`発火）は**同一の**解決パスを通る
──一方だけを得ることはできない。これが設計が尊重しなければならない核心であり、
一律な修正が却下され（WD-rejected-A）、スコープ付き・アローリスト化されたものが
提案される理由である。

これはADR-26の`open_receivers:`の隣に位置し、それは*逆向き*のつまみである。ADR-26は
レシーバーを**open**としてマークし、実サーフェスがRBSを超えるクラス（ActiveRecord
リレーション）上の診断を*抑制*する。本ADRは少数の祖先を**closed／RBS-complete**として
マークし、サブクラス上の診断を*有効化*する。両者は双対であり、ともにエンジンが安全に
主張できる精度を最大化しつつ偽陽性をゼロに保つために存在する。

## 決定

**スコープ付き継承メソッド解決**を追加する：`Nominal[Sub]`レシーバー上のディスパッチが
`Sub`をRBS既知でないと判断したとき、`Sub`の発見済みスーパークラスチェーンを参照する。
祖先が**RBS-completeアローリスト**上にあれば、メソッドをその祖先のRBS定義（戻り値型＋
アリティ＋可視性）に対して解決し、通常の`call.undefined-method`／`call.wrong-arity`／
オーバーライドルールが継承された契約呼び出しに適用されるようにする。アローリスト上に
*ない*祖先はすべて、現状の`Dynamic[top]`フォールバックを変更せず維持する。

アローリストのメンバーシップ基準は**「このクラスのRBSは権威的かつ完全である──それが
宣言しない呼び出しは正真正銘の誤りである」**である。これは`Rigor::Plugin::Base`に
ついては真であり（構成上、契約がRBSそのものである。本リポジトリが両方を所有する）、
`ActionController::Base`、`Hash`、そして実質的にRBSが省くメソッドにオブジェクトが
日常的に応答するあらゆるサードパーティ／コアクラスについては偽である。

### 作業上の決定

- **WD1 — アローリストのシード＝`{ "Rigor::Plugin::Base" }`**。ドッグフードの対象で
  あり、私たちが現時点でRBS-completeだと*知っている*唯一のクラスである（コードと
  `base.rbs`の両方を私たちが著作しており、適合性スペック＋`rigor check lib`が両者を
  同期させている）。このリストはv1では定数である（WD4でソーシングを再検討する）。

- **WD2 — 注入点＝`RbsDispatch.lookup_method`**（rbs_dispatch.rb ~L270）。直接の
  `instance_method_definition`ルックアップが`nil`を返したあと、すり抜ける*前に*、
  レシーバクラスがRBS既知でなければ`Scope#discovered_superclasses`からそのスーパー
  クラスを読み、そのスーパークラスが（推移的に、WD3）アローリスト化されていれば
  `instance_method_definition(ancestor, method_name)`を返す。シングルトン呼び出しは
  対称な`singleton_method_definition`パスを取る。この変更は加算的である：アローリスト
  化された祖先を持たないクラスは今日とまったく同じ挙動になる。

- **WD3 — 発見済みスーパークラスチェーン全体をウォークし、最初のアローリスト化された
  祖先で停止する。**今日プラグインは常に`Plugin::Base`の*直接*サブクラスなので、
  シードには直近の親で十分だが、チェーンをウォークしても追加コストはなく、より深い
  階層に備えられる。インクルードされたモジュールは**v1のスコープ外**である（プラグイン
  は契約をミックスインしない。ユースケースが現れたら再検討する）。ウォークはADR-24の
  既存の`discovered_superclasses`マップを再利用する──新たな簿記は不要である。

- **WD4 — アローリストのソーシング：いまは定数、のちにプラグインマニフェスト**。v1は
  定数をハードコードする。将来のイテレーションでは、プラグインがマニフェストを通じて
  「私の契約baseはRBS-completeである」と宣言できるようにしてもよい（MAY）（ADR-37／
  ADR-40の宣言的ルート）。これにより、ツリー外のプラグインgemがエンジンを編集せずに
  自身の`Base`的クラスをオプトインできる。シードにそれが不要であり、マニフェスト
  サーフェスが実際の設計コストを伴うため延期する。定数が終着点ではなくプレースホルダー
  として理解されるよう記録しておく。

- **WD5 — フラグオン前の計測ゲート**。精度と`undefined-method`発火が結合している
  （Context）ため、この変更は断言ではなく計測でクリーンなバーの背後で出荷される：
  （a）完全な`rigor check lib`がグリーンを維持する；（b）`rigor check`下のバンドル済み
  プラグインツリー（`plugins/*`、`examples/*`）が*真の*契約誤用のみを表面化させ、適合
  するプラグインにはFPゼロである；（c）実プロジェクトのスイープ（Redmine／Mastodonの
  `app + lib`、`reference_survey_external_projects`プロトコルに従う）が新規診断**ゼロ**を
  示し、アローリストのスコープ付けがオープンな階層を手つかずのまま残すことを確認する。
  （b）／（c）でのいかなるFPもマージをブロックする──偽陽性の規律が機能より優先される。

- **WD6 — プラグインツリーをチェックゲートに配線する（DONE）**。専用の
  `make check-plugins`が`rigor check plugins/*/lib examples/*/lib`を実行する（libディレ
  クトリのみ──`demo/`ツリーは意図的にモデル化されていないフレームワークDSLを動かす
  ものであり、クリーンな対象ではない）。これは`make verify`に連結され、CIではコールド
  セルフチェックのバリアントで「Run plugin-contract check」ステップとしてゲートされる。
  これによりバンドル済みプラグインファイルのすべてに契約が自己強制される──strictな
  Steepターゲットには実現できなかったこと（ノートの§「Option A」）を、SteepのFPの壁
  なしに実現する。グリーンなツリーに到達するには、解決そのものとは無関係な16件の既存
  診断を片付ける必要があった：RBSにおける`Analysis::Diagnostic`のシングルトンファクトリー
  （`from_node`／`from_location`）と`Plugin::AccessDeniedError`の`< StandardError`の
  完成、そして`rigor-rspec`の`let_scope_index`における`Prism::Node#block`フローナロー
  イングの欠落1件（カスタムの`describe_call?`述語は実行時に`CallNode`を保証するが、
  アナライザーの`Prism::Node`ビューをナローイングしない──`# rigor:disable`ではなく明示的な
  `is_a?(Prism::CallNode)`の再記述で修正したので、ナローイングは本物である）。効力を
  検証済み：プラグインに注入された`manifest.bogus`は`make check-plugins`を
  `call.undefined-method`で非ゼロ終了させる。

## 却下／先送りした代替案

- **（却下）一律な継承RBS祖先解決**。アローリストではなく*すべて*のRBS祖先について
  継承メソッドを解決する。却下：Railsコントローラーの偽陽性の壁（Context）を再導入する
  ──部分的なgem RBSは、省かれた継承メソッドのすべてを、動作しているコード上の
  `call.undefined-method` FPに変える。プロジェクトの最上位の偽陽性の規律に違反する。

- **（却下）`plugins/*`上でのstrictなSteepターゲット**（ノートの§「Option A」）。
  Steepは`self`を素のRBS `Base`として型付けるため、プラグイン自身のRBS未記述ヘルパー
  へのあらゆる呼び出しで偽陽性になる（計測値：`rigor-deprecations`単独で3件のFP）。
  これを成立させるには37個すべてのプラグインに対するプラグインごとのRBSが必要であり
  ──規模と、sig-gen優先／手書きRBS回避ポリシー（AGENTS.md §「RBS Authorship」）により
  却下される。Rigorのソース読み取りディスパッチにはこの壁がなく、それこそが本ADRが
  エンジンルートを選好する全理由である。

- **（延期）`rigor sig-gen`によるプラグインごとのRBS**。プラグインツリー上のsig-genが
  プラグインごとのRBSを安価かつ正確にするなら、Steepと一律解決のRigorの*両方*が
  アローリストなしに効力を得るだろう。延期：sig-genはまだプラグインツリーを対象として
  おらず、アローリストはより少ないサーフェスでいま目標に到達する。sig-genのカバレッジが
  着地したら再検討する。

- **（延期）プラグインマニフェストで宣言されるアローリスト**──WD4に畳み込まれた。

## 他のADRとの関係

- **ADR-24**（self型メソッド呼び出し解決）──本ADRが消費する
  `discovered_superclasses`エッジを供給する。これは同じ「self型／継承呼び出しを解決
  する」アークの自然な次のステップであり、ユーザーメソッドの祖先からRBS-completeな
  祖先へと拡張したものである。
- **ADR-26**（`open_receivers:`）──逆向きのつまみ（open-to-suppress対
  closed-to-enable）。両者は偽陽性ゼロという目標を共有する。
- **ADR-34**（トップレベルの未解決self型呼び出し）──本ADRがスコープ付き例外を
  切り出す対象である、同じ`Dynamic[top]`-as-safetyデフォルト。
- **ADR-35**（オーバーライドシグネチャ互換性）──そのルールは*両側著作*ゲートである。
  プラグインの継承フックが本ADRを通じて解決されると、オーバーライドルールは作用する
  第2のサーフェス、すなわちRBS祖先対Rubyオーバーライドを得る（フォローアップになり
  うる。v1のスコープではない）。
- **ADR-37／ADR-40**──WD4が委ねる宣言的マニフェストルート。

[プラグイン契約RBS]: ../../sig/rigor/plugin/base.rbs
[`spec/integration/plugin_contract_conformance_spec.rb`]: ../../spec/integration/plugin_contract_conformance_spec.rb
