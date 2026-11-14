---
title: "型作成の契約"
description: "rigortype/rigor docs/agents/type-authoring.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/type-authoring.md"
sourcePath: "docs/agents/type-authoring.md"
sourceSha: "fe73d87379812f3cbc65136c78dfedeb4b27cdc819bdd5e69a75e047be91b41f"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-11T03:33:10+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

タスクが型を記述またはアサートするとき、`.rbs`を編集するとき、インラインRBSアノテーションを追加するとき、あるいはコメント、ドキュメント、レビューで型を説明するときにこれを読んでください。これは`AGENTS.md`の恒常的なポインタに対する条件付きの詳細情報です。

## 出自（Provenance）

Rigorが生成または検査していない型を書き留めてはなりません。周囲のコードや既存のコメントからではなく、Rigorから学んでください ── `rigor type-of`、`rigor annotate`、または`rigor sig-gen --print`を使用します。

型は`sig/`、検査済みのインライン`#:` / `# @rbs`アノテーション、または推論として存在します。`sig/`が同じメンバーを宣言している場合、両者は一致しなければなりません。一貫した2つの宣言のうちより精密な方がバインドし、矛盾は`rbs.contradicting-signature`エラーになります。インラインアノテーションを追加するのは、名前やコードが語っていない事柄（`void` / `bot`の意図、`:asc | :desc`のような非名前的リファインメント、パラメータ契約など）を述べるときだけにしてください。Rigorがすでにメソッド上で示している名前的型を繰り返すことはノイズです。

## コメント

`.rb`ファイルにおいて、コメントに型を含めてはなりません。YARDタグには型を付けず、名前の後にダッシュ（—）を使用します：`@param name — description`、`@raise ExceptionClass — description`、および`@return description`。

コメントは、コードやシグネチャが語っていないこと（根拠、型システムで表現できない制約、`nil`の意味、ADRやissue、偽陽性の境界、却下された代替案など）を説明します。名前、型、またはシグネチャを言い直してはいけません。ゲートとなるのは`spec/docs/type_shaped_comments_spec.rb`です。

エンジンの型記法は語彙であり、型主張（type claim）ではありません。Rigorが何を推論し、拒否し、出力するかを説明するコメントでは、その記法自体がコメントの主題であるため、`Dynamic[top]`、`Nominal[Array]`、`Constant[1]`と綴ったり、RBSの例を引用したりして構いません。ただし型そのものは、§ 出自（Provenance）（`rigor type-of`、`rigor annotate`）に従い、引き続きRigorから学びます。上記のルールは、コード内の名前やシグネチャに付された型（メソッド上の`@param x [String]`、`Hash<Symbol, Integer>`）に関するものです。記法を平易な言葉に置き換えるスイープは精度を損ないます: `Array[:multi | Dynamic[top]]`と`Array[Dynamic[top] | Symbol]`の対比が、「erased untyped joined with `Symbol`ではなく、pinned `:multi` joined with untyped」になってしまいました。[#2338](https://github.com/rigortype/rigor/pull/2338)のコメント監査では、12個のファイルと13個目のファイルの一部でその書き換えを差し戻しました。

## RBS

手書きやAIが作成したRBSよりも、`rigor sig-gen --print` / `--diff`を優先してください。推論のギャップはエンジンに関するシグナルであるため、まずは生成された出力を提案し、ユーザーがその代替案をレビューした後にのみ手動で編集してください。タスクがそれを許可している場合は、既存の`.rbs`を修正して構いません。

### 宣言された`void`を尊重する

Rubyのすべてのメソッドは最後の式を返すため、本体はほぼ常に値を*持ちます*。`-> void`を宣言した作成者は、その値が契約の一部ではなく、呼び出し元がそれに依存してはならないと述べています。これが[`special-types.md` § `void`](../../type-specification/special-types/)が定める意味であり、`static.value-use.void`がそれを強制します。`boolish`も同じ種類の約束です: 真偽性のみが意味を持ちます。`rigor sig-gen`はすでに宣言された`void`を上書きする提案を一切行いません（#836）。

実装がたまたま返している値に合わせて、どちらかを人手で狭めてはなりません。これは`sig/`、レビューでの提案、およびgem_rbs_collectionへ上流送信するRBSに適用されます。判断基準は、ライブラリがその値を*文書化しているか*どうか（docコメント、README、またはAPIリファレンス）です。実装の詳細は根拠になりません。ruby/gem_rbs_collection#1129では、sidekiqの`Client#push`が「Returns a unique Job ID. If middleware stops the job, nil will be returned instead」と文書化しているため、`String?`が適切でした。`perform_async`と`Client.enqueue*`は何も文書化していないため、それらの本体が同じ`push`の結果を返していても、`void`のまま維持されました。

同梱の`rigor-rbs-contract`スキルは、このルールおよびその背後にある契約の読み方を、導入プロジェクトおよびgem_rbs_collectionの貢献者に提供します（[ADR-131](../../adr/131-declarations-are-contracts/)）。RBSの監査や貢献を行う際はこれに従ってください。

このリポジトリの外部では、導入先プロジェクトがそれをインストールしている場合、同梱されている`rigor-type-oracle`スキルが同じ出自ルールを担います。そうでない場合は、そのプロジェクトの契約に従ってAI作成のRBSを扱ってください。

規範的な理由は、[ADR-107](../../adr/107-checked-types-and-typeless-comments/)、[ADR-108](../../adr/108-type-provenance-for-agents/)、および[ADR-14](../../adr/14-rbs-sig-generation/)を参照してください。

## リファインメントの綴り

新しいリファインメントの綴りを設計する際、それが表す集合をRubyリテラル自身の述語がすでに受け入れるのであれば、そのリテラルで綴り、その述語で定義してください: PHPStanの`int<1, 10>`ではなく、`Range#cover?`による`Integer[1..10]`および`Float[0.0...1.0]`とします（[ADR-1](../../adr/1-types/)、[ADR-109](../../adr/109-ruby-native-range-notation/)）。PHPStan、TypeScript、またはPythonの綴りを輸入する前に、その集合を表すリテラルがRubyにあるか、またADR-1の却下された代替案がすでにそれについて判断を下していないかを確認してください。輸入された`int<min, max>`は、ADR-1がそれを却下した5日後に出荷され、4か月間残りました: ラウンドトリップできず（`int<0, max>`は出力されるがパースできない）、`Float`にも拡張できませんでした（`min`が`Float::MIN`として読まれてしまうため）。ドキュメントのスイープで仕様とコードの不一致が見つかった場合は、コード側に付く前にADR-1がどちらの側を採ったかを確認してください。ユーザーが`%a{rigor:v1:…}`ペイロードにコピーできる表示文字列は、再びパースできなければなりません。

## 修正とともにゲートを強化する

手本とすべきパターンは、albaメンテナーのSteepラチェット（[`03b37e7`](https://github.com/okuramasafumi/alba/commit/03b37e75ee12b9a28e00341143449778bf2241d0)、[`5883637`](https://github.com/okuramasafumi/alba/commit/5883637)、[`bf06036`](https://github.com/okuramasafumi/alba/commit/bf06036)）です。[alba#576](https://github.com/okuramasafumi/alba/pull/576)の`Module#name`スレッドは、その隣にある2つの罠を示しています。

- **コードがパスするようにするコミットの中でダウングレードを削除する**。albaのSteepfileは6つの診断を`:information`にリストしていました。`03b37e7`は`BlockTypeMismatch`を削除し、それが露出させた箇所を修正しました;他の2つのコミットは、修正すべき箇所が残っていなかったため、`UnexpectedSuper`と`UnexpectedKeywordArgument`を完全に削除しました。1コミットにつき1診断で、残り3つとなりました。変更を着地させるためにダウングレードを追加してはならず、隠されていた箇所を修正せずにダウングレードを外してはなりません。
- **呼び出しサイトの前にシグネチャを修正する**。`03b37e7`はブロックに`[self: …]`型を与え、各proc契約を1回命名しました（単なる`Proc?`の代わりに`metadata_proc`、`instance_proc?`、`converter`、および`check`）。`# steep:ignore`を維持したのは3つのソース行のみで、それぞれシグネチャが表現できない1つの式に対するものであり、型アサーションは値を導入する行に移動しました。
- **チェッカーに合わせるためにシグネチャを広げてはならない**。alba#576では、無名クラスが`nil`を返すにもかかわらず`_ClassContext#name`は`-> String`のままとされました: その変更はシグネチャ限定のものであり、`String?`にするとSteepが`nesting`を拒絶してしまうためです（`nesting`は2回目の`name`呼び出しを絞り込みません。`n = name`とすれば絞り込まれます）。メンテナーの回答は、型を正直に保ち、コードを変更することでした。シグネチャ限定のスコープは、作業を止めてそう指摘する理由であって、より広い型を記述する理由ではありません。
- **`%a{implicitly-returns-nil}`を伴うコアの`-> String`は、すべてのチェッカーからnilを隠してしまう**。albaで発生する例外のnilは別の場所にあります: `resource_name`は`self.class.name.end_with?`を呼び出し、`self.class`は`Class`と宣言されており、そのコアの`name`は`-> String`に加えてそのアノテーションを持つため、`Alba.serialize(obj) { root_key!; … }`は`NoMethodError`を発生させ、SteepもRigorもそれを報告しません。`RbsDispatch`は意図的にアノテーションを読み飛ばします（[inference-engine.md](../../internal-spec/inference-engine/)「取りこぼしうるルックアップに対するnilフリー」）。そのような呼び出しはコード内でガードし、値を生成する呼び出しサイトをチェックしてください;型に依存してはなりません。
