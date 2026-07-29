---
title: "現在の作業 — セッション引き継ぎ"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "13ec4a846bc7dafe1b2525ce3fb80ddeba4cb929d32a7b5c9dd9a6ed5a3c523c"
sourceCommit: "42402864a316beb0d5ba4357ec29454ab55f6657"
sourceDate: "2026-07-29T22:42:00+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

<!--
セッション引き継ぎ（ADR-98）。たった1つの問いに答える: 次のセッションは何をすべきか？

- 作業をゴールまで運んだら、このファイルの内容を置き換えること;下に追記しないこと。
  2セッションを超えて生き延びるものはここに属さない: バックログ → GitHub issue
  （docs/agents/issue-tracker.md）、運用上の落とし穴 → ワークフローのスキル、決定 → ADR、
  計測 → docs/notes/、出荷済み → CHANGELOG.md。
- 主張を持ち越す前に検証すること。今回のカットそのものの教訓: 緑の`make verify`は、ピン留めされた
  バンドルが動くことを証明するのであって、サポートされている範囲を証明するのではない。このセッションの
  3つのリグレッションのうち2つは、ピンの外側からしか見えなかった —— rbs 3.xのCIジョブと
  `rbs -I sig validate`だ。
-->


一時的;まるごと置き換えられる。バックログはGitHub Issuesに、リリース計画はMilestones
（`v0.3.0` / `v0.4.x` / `v1.0.0`）に存在する。このファイルがADR、CHANGELOG、またはissueと
矛盾する場合、間違っているのはこのファイルのほうだ。

## 現状

- **v0.3.1はリリース済み**（2026-07-29）: タグ、RubyGemsへのプッシュ、GitHub Releaseがすべて存在する。
  バージョンバンプは不要 —— リリースは明示的な要求を待つ。
- **[#230](https://github.com/rigortype/rigor/pull/230)は、サポート範囲の残りに対するrbs-4.1の
  バックポートを着地させた**: `Resolv#initialize`のコアオーバーレイ（Mastodonの偽陽性、
  ruby/rbs#2960）と、RBSパーサの手前での不正なUTF-8の隔離だ。後者のspecを書いていて、不正な
  UTF-8が**ピン留めした4.1**でもクラッシュすることが明らかになった（`RBS::Parser.magic_comment`から
  素の`ArgumentError`が出て、それを捕まえる`ParsingError`のrescueがない） —— このガードは、3.xの
  ハングガードであるだけでなく、現に起きるクラッシュの修正だ。
- **[#231](https://github.com/rigortype/rigor/pull/231)は、sig-genのパスで同じバグクラスを閉じた**:
  不正なUTF-8のターゲットに対する`--write`は、クラッシュする代わりに大きな声で拒否するようになり
  （`:skipped_invalid_encoding`、非ゼロ終了）、レイアウトインデックスはそのようなファイルをパーサの
  手前でスキップする。外部から制御される`RBS::Parser`のエントリーポイントはすべてガードされた;
  `RbsValidity`は設計上ガードされないままだ（sig-gen自身の出力をパースするため）。
- **2026-07-29のセッションは`rbs` 4.1.0に追従し**（[#225](https://github.com/rigortype/rigor/pull/225)）、
  リリースをカットした（[#226](https://github.com/rigortype/rigor/pull/226)）。また
  `sig/rigor/inference/void_origin.rbs`を`master`に直接着地させ（e3b132a3）、@f440による外部からの
  READMEリンク修正[#223](https://github.com/rigortype/rigor/pull/223)をマージした。
- **`0.2.x`サイクルはアーカイブ済み**で、`docs/CHANGELOG-0.2.x.md`に移された —— アーカイブルールが
  `0.3.1`で発火した。`CHANGELOG.md`は497行から216行に戻った。
- issue [#144](https://github.com/rigortype/rigor/issues/144)はクローズ（作業を1リリース分だけ生き延びて
  いた）。3つの新しいissue —— **#227** / **#228** / **#229** —— が開かれ、いずれもrbsバンプが明らかに
  したものからだ;#229 / #228 / #207にはそれぞれ根拠づけのコメント（v4.1.0のツリーとこのコードベースに
  対して事実を確認したもの）が付いており、それらの評価は記憶ではなくエビデンスから始まる。
- `make verify`（8,286例）と`make docs-check`は、リリースコミットの時点でクリーン;その上に載っている
  唯一の変更はmarkdownだ。

## 次のセッション

リリースをブロックするものはない。2つのv0.4.xの判断項目は変わらず、依然として`ready-for-human`の
ままだ —— 実装ではなく判断を必要とする:

- **[#204](https://github.com/rigortype/rigor/issues/204)**（area:engine） —— ADR-46のクロスファイル
  の呼び出し元→呼び出し先パラメータエッジを配線し、`parameter_inference:`が`--incremental`と
  組み合わせられるようにする（WD6cの相互排他を解消する）。エッジ記録の設計判断が必要。
- **[#205](https://github.com/rigortype/rigor/issues/205)**（area:engine） —— `parameter_inference:`を
  デフォルトでオンにフリップするかを判断する（ADR-50ゲート;蓄積された保護エビデンスと、WD6bガードに
  対するミューテーションオラクルの正直さチェックが必要）。エビデンスが存在するより前ではない。

エージェント対応可能な作業、労力順:

- **[#227](https://github.com/rigortype/rigor/issues/227)**（area:sig-gen） —— `sig-gen`は
  `Const = Data.define(...)`を読めない: それを囲む*モジュール*を`class`として出力し、クラス名と
  すべてのメンバーを落とし、ブロック本体のメソッドだけを残す。単に薄いのではなく誤った出力であり、
  これが今回のセッションを、AGENTS.mdのポリシーに反して手書きのRBSへと追い込んだものだ。境界が明確で、
  issueに再現手順がある。
- **[#207](https://github.com/rigortype/rigor/issues/207)**（area:perf） —— 前回の引き継ぎから変わらず:
  走査共有のレバーは尽きた（−0.49%がその全てだった）ので、残るのは**コレクターごとのアロケーション
  帰属**であり、v0.3.0の+45.7%のドリフトがどこにあるのかを突き止めることだ。リファクタではなく調査だ。
- **[#229](https://github.com/rigortype/rigor/issues/229)**（area:plugins） —— Rigorがどのインライン
  RBS実装を話すかを判断する。`rigor-rbs-inline`は`rbs-inline` gemの上に構築されているが、rbs 4.1の
  3つの新しいインライン機能（`def self.`、`module-self`、モジュールレベルのivarアノテーション）はRBSの
  *組み込みの*`InlineParser`に着地した。ADR-93はこのプラグインをデフォルトで配線するので、これは
  オプトイングループのものではなく、ユーザーベース全体の方言だ。その結末はADR-32の改訂に属する。
- **[#228](https://github.com/rigortype/rigor/issues/228)**（area:sig-gen） —— `sig-gen`ライターの
  インプレース更新パスに向けて、`RBS::Rewriter`（rbs 4.1で新規）を評価する。明示的に評価であり;
  「ノー、なぜなら」も許容される答えで、rbsの下限（floor）の問いが核心だ。
- **#121** —— 進行中のFP安全なビルトイン/標準ライブラリのフォールド（需要ゲート付き）。
- エディタクラスタは今や**#142** / **#146** / **#147**（#144はv0.3.1で出荷）だ —— v0.4.xマイルストーン
  で最大の未着手の`ready-for-agent`ブロックであることに変わりはない。

## このセッションが学んだこと、コミットにないもの

- **緑の`make verify`は、ピン留めされたバンドルを証明するにすぎない**。gemspecは`rbs >= 3.0, < 5.0`を
  サポートしており、4.1を通すための`Elem` → `E`のspec更新は、`rbs-compat` CIジョブの3.x側を壊した ——
  これは`make verify`が構造上見ることのできない失敗だ。バージョン範囲を持つ依存への変更をプッシュする
  *前に*、そのジョブをローカルで再現すること（範囲の反対端にピン留めした`Gemfile.rbs-compat`）。修正の
  パターンは、インストールされているバージョンを読むサポートヘルパー（`spec/support/rbs_core_type_params.rb`）
  であって、範囲の片側からハードコードした名前ではない。
- **`rbs -I sig validate`は、他に誰も走らせないゲートだ**。`sig/rigor/scope.rbs`は、
  `static.value-use.void`診断が着地して以来、宣言されていない`Inference::VoidOrigin`を参照しており、
  その間`make check`はずっと緑のままだった —— Rigorが参照された欠落型をスタブするからだ。私たち自身の
  フェイルソフトが、私たち自身の`sig/`の穴を隠していた。`sig/`を編集したあとには走らせる価値がある。
- **アイデンティティ的な値をメモ化しはじめる依存は、キャッシュの危険要因だ**。rbs 4.1は`TypeName#hash`を
  ivarにキャッシュした;その値はプロセスごとにシードされる`Array#hash`から導出され、`Marshal`はivarを
  そのまま持ち運ぶので、キャッシュされた型名はどれも`eql?`だがハッシュが等しくない状態で返り、
  `class_decls`のルックアップはすべてミスした。何も送出されなかった。同一プロセス内のラウンドトリップの
  specでは再現できない —— ガードは、書き込み側のプロセスを代役として立てるためにivarを汚染しなければ
  ならない（`spec/rigor/cache/rbs_environment_marshal_patch_spec.rb`）。
- **リリースをカットする前に、コアシグネチャのバンプを実プロジェクトに対してスポットチェックすること**。
  rbs 4.1は`Array` / `Hash` / `Integer` / `String`を書き換えた。MastodonでのA/B（同じエンジン、
  `--no-baseline`）は**新規診断0件、削除1件**という結果だった —— 削除された1件は、ruby/rbs#2960が
  upstreamで修正した本物の偽陽性だ。10分で、それが「スイートは緑だ」を「これは出荷して安全だ」に変えた
  ものだ。
