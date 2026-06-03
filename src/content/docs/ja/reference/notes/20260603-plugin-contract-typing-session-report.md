---
title: "Session report — typing the plugin contract (2026-06-03)"
description: "Imported from rigortype/rigor docs/notes/20260603-plugin-contract-typing-session-report.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260603-plugin-contract-typing-session-report.md"
sourcePath: "docs/notes/20260603-plugin-contract-typing-session-report.md"
sourceSha: "6d0b653ed549c32f9d5387679e5034ae87dfc4e968daeccdf68a175a83371fd4"
sourceCommit: "37d70ab9071b4a25e954d0157818f0b6ae88e2c2"
translationStatus: "translated"
sidebar:
  order: 20266603
---

**ステータス:**実装され、6つのコミット（`9a4c22c0` … `eed5371c`）にわたってランディング済み。検証はすべてグリーン。このレポートは、出荷されたもの、それが実現するモデル、検証の証拠、そして未解決項目 ── フォローアップに先送りされた用語上の問題（`protocol`）を含む ── を統合します。

これらの判断の背後にある調査ログは姉妹ノート[`20260603-plugin-contract-self-typing-spike.md`](../20260603-plugin-contract-self-typing-spike/)です。規範的な判断は[ADR-43](../../adr/43-rbs-complete-ancestor-resolution/)です。

## 目標

このセッションは一つの問いから始まりました。*Rigorの**プラグインファイル**を`Rigor::Plugin::Base`契約（contract）に対して型付け／制約できるか。それによって、契約を誤用または誤実装したプラグインが、実行時ではなく機械的に捕捉されるようにできるか。*それはさらに次のように鋭くなりました。*（Steepではなく）**`rigor check`自身**がそれらの警告を発行できるか。*

## 出荷されたもの ── 三層モデル

「プラグイン契約を型付けする」は、三つの独立した層へきれいに分解され、すべてランディングしました。

1. **契約をRBSで記述する** ── `sig/rigor/plugin/base.rbs`を4メソッドから作者向けサーフェスの全体へと完成させた（ADR-37のDSL群、オーバーライドフック、エンジンが実行するディスパッチャー、作成補助ヘルパー）。
2. **構造的な仕様でオーバーライド適合性を強制する** ── すべてのプラグインのフックオーバーライドがエンジンの呼び出しで呼び出し可能なままであることを検査する純Rubyの`Method#parameters`検査（引数／アリティのLiskov互換性、ADR-5）。
3. **`rigor check`から契約の誤用を警告する** ── ADR-43の許可リスト化されたRBS完全祖先解決により、プラグインが継承した契約呼び出し（`manifest.…`、`io_boundary.…`）が`Base`のRBSに対して解決されるようになるため、契約が宣言しないメソッドへの呼び出しは`call.undefined-method`を発火させる。`make check-plugins`ゲートがその能力をCIによる強制へと変える。

要を担う洞察はこれです。**Rigorはこれを構造的にSteepより得意とする**。Steepはプラグインのサブクラスの`self`を素のRBSの`Base`として型付けするため、プラグイン*自身*のRBS化されていないヘルパーメソッドへのあらゆる呼び出しで偽陽性を出します（実測：`rigor-deprecations`だけで3件のFP） ── プラグインツリー全体に対する厳格なSteepターゲットは、プラグインごとのRBSなしでは現実的ではありません。Rigorは各プラグインの`def`をソースから読み取り、`self`を*サブクラス*として型付けするため、自身のヘルパー呼び出しを正しく解決します。発火するのは真正な契約の誤用だけです。

## コミット

| コミット | 層 | 要約 |
| --- | --- | --- |
| `9a4c22c0` | 1 | `Plugin::Base`のRBSを完成（4 → サーフェス全体）。即座に実在の隙間が顕在化：`IoBoundary#cache_descriptor`／`#open_url`が`Base`から呼ばれていたのに`io_boundary.rbs`に欠落していた ── 宣言した。 |
| `7eccf0c7` | 2 | `spec/integration/plugin_contract_conformance_spec.rb` ── フックオーバーライドの呼び出し互換性ガード。37個すべてのプラグインでグリーン。注入したナローイングオーバーライドで失敗することを検証済み。 |
| `3be9b1df` | 3 | ADR-43のドラフト（提案中）。 |
| `2a183299` | 3 | ADR-43エンジン：`scope`を`RbsDispatch.lookup_method`へ通す。許可リスト（`ALLOWED_RBS_COMPLETE_ANCESTORS = ["Rigor::Plugin::Base"]`）による祖先解決。それを完成させると26件のFP（すべて`Manifest#id`／`#protocol_contracts`）が顕在化 → `manifest.rbs`の22個のリーダーを完成 → 正味のFPはゼロに。回帰テストを追加。 |
| `3235e218` | 3 | ADR-43 WD6：`make check-plugins`ゲート（`make verify`＋CI内）。既存の16件のツリー診断（`Diagnostic`シングルトンファクトリー＋RBS内の`AccessDeniedError < StandardError`、`rigor-rspec`内の1件の`Prism::Node#block`フローナローイング）を解消。歯（実効性）を検証済み。 |
| `eed5371c` | docs | ADR-43を`docs/internal-spec/`に文書化（`inference-engine.md`のディスパッチサーフェス＋`plugin.md`のBase自己検査ノート）。 |

## エンジン変更（ADR-43）を一段落で

`RbsDispatch.lookup_method`は`scope`引数と限定的な例外規則を得ました。レシーバークラスがRBSに知られていないRubyソースのサブクラスであり、その発見されたスーパークラスチェーン（`Scope#superclass_of`、ADR-24）が凍結された許可リスト`ALLOWED_RBS_COMPLETE_ANCESTORS`（`Rigor::Plugin::Base`で種付けされている）上のクラスに到達するとき、そのメソッドはその祖先のRBSに対して解決されます。許可リストは偽陽性の境界です。包括的なバージョンであれば、`class MyController < ActionController::Base`が*部分的な*gemのRBSが省略するメソッドを呼ぶたびに偽陽性を出すため、許可リストにない祖先はすべて`Dynamic[Top]`フォールバックを保ちます。`scope`はデフォルトで`nil`になるため、他のすべてのディスパッチ呼び出し元は変わりません。これはADR-26の`open_receivers:`の双対です（抑制のために開く対、有効化のために閉じる）。

## 検証

- `make check`（`rigor check lib`）：グリーン。
- `make check-plugins`（`rigor check plugins/*/lib examples/*/lib`、141ファイル）：exit 0。歯（実効性）：注入した`manifest.bogus`により`call.undefined-method`で非ゼロ終了する。
- Steep（`lib`ターゲット）：グリーン。
- テスト：inference（1852）＋analysis/integration（1546）＋integration/environment（1334）＋rigor-rspecプラグイン（47） ── すべて失敗0件。
- RuboCop：変更したRubyでクリーン。`git diff --check`：クリーン。

## 未解決項目

- **ADR-43 WD4 ── 許可リストのソーシング**。許可リストは`Rigor::Plugin::Base`で種付けされたハードコードの定数です。マニフェスト宣言（ADR-37／ADR-40の宣言的な経路）を介して、サードパーティープラグイン自身の`Base`風クラスへそれを開放することは、消費者がそれを必要とするまで先送りします。
- **用語：`protocol`（軸は決定済み、一部着手済み）**。Rigorはこの言葉を四つのものにわたって多重定義していました。（A）RBSの`interface` ── 構造的型付けの概念（Pythonの`typing.Protocol`の対応物）。正しく**interface**と名付けられ、衝突なし。（B）不活性な`protocols:`マニフェストフィールド（宣言されているが、どこでも**消費されていない** ── 痕跡的なADR-2のメタデータ）。（C）ADR-28の`protocol_contracts:`（パススコープな振る舞い的メソッド契約 ── 実在し消費される機能）。（D）ADR-37の説明文中の「extension protocols」（狭義のプラグインフック）。**決定：**軸は**interface＝構造的型**、**protocol contract＝振る舞い的なメソッド要求契約**（Smalltalk／Swiftの意味を保持）です。**（B）は廃止**（`Manifest`サーフェスから削除 ── 振る舞いを伴わないまま、衝突を招きやすい素の「protocol」という言葉を担っていた）。**（C）は正確な名のもとで保持**。（A）／（D）は変更なし。**ユーザー向け文書**もランディング済みです。ハンドブック付録[プロトコル、インターフェース、構造的型付け](../../handbook/appendix-protocols-and-structural-typing/)がこの区別を鋭く描き（横並びの表＋「自分が欲しいのはどちら？」ガイド）、mypy付録から相互リンクされています。先送りのまま残っているのはADR-43 WD4（許可リストのソーシング）だけです。
- **用語のフォローアップ：素の「interface」という言葉そのものが曖昧である**。二つの独立したSonnetサブエージェントを中立的なプロンプト（セッションコンテキストなし）で走らせたところ、高い確信度で一致しました。すなわち、Rubyには`interface`キーワードがなく、Ruby人口はJava／PHP寄りに偏っているため、素の「interface」は*名前的*な（明示的に`implements`する）種類として読まれ、RBSが実際に実装している*構造的*なRBS／Go／Protocolの種類としては読まれない（RBSの適合は構造的である ── ruby/rbsの`docs/syntax.md`、Steep、コミュニティのソースに対して検証済み。RBSの`include _Foo`は省略可能な便宜であって必須ではない）、ということです。**決定：初出時に「interface」を限定する**ことにし、「構造的インターフェース」／「RBSインターフェース」とします。実施済み：付録冒頭の一行コールアウト＋ハンドブックREADMEの約束事に記した用語の約束。付録が正規の解説です。ハンドブックの残りに対する初出時の広範なスイープは*行われていません*（先送り ── 優先度低）。

## ポインタ

- [ADR-43](../../adr/43-rbs-complete-ancestor-resolution/) ── 解決の判断。
- [ADR-28](../../adr/28-path-scoped-protocol-contracts/) ── パススコープなプロトコル契約。
- [スパイクノート](../20260603-plugin-contract-self-typing-spike/) ── 調査ログ。
- [`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/) § "Method Dispatch Boundary"。
- [`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/) ── Rigorの構造的型付けモデル（RBSインターフェース、オブジェクトシェイプ、ケイパビリティロール）。
