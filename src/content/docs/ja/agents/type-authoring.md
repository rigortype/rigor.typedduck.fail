---
title: "型作成の契約"
description: "rigortype/rigor docs/agents/type-authoring.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/type-authoring.md"
sourcePath: "docs/agents/type-authoring.md"
sourceSha: "801ae1b55ce92d79ded8697d9d12f0c7ce7b3676b019b90d36162e58e3ce2895"
sourceCommit: "9cc10f58aa968f6e3116557a491aae41bc8a89e1"
sourceDate: "2026-10-14T03:38:53+09:00"
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

## RBS

手書きやAIが作成したRBSよりも、`rigor sig-gen --print` / `--diff`を優先してください。推論のギャップはエンジンに関するシグナルであるため、まずは生成された出力を提案し、ユーザーがその代替案をレビューした後にのみ手動で編集してください。タスクがそれを許可している場合は、既存の`.rbs`を修正して構いません。

このリポジトリの外部では、導入先プロジェクトがそれをインストールしている場合、同梱されている`rigor-type-oracle`スキルが同じ出自ルールを担います。そうでない場合は、そのプロジェクトの契約に従ってAI作成のRBSを扱ってください。

規範的な理由は、[ADR-107](../../adr/107-checked-types-and-typeless-comments/)、[ADR-108](../../adr/108-type-provenance-for-agents/)、および[ADR-14](../../adr/14-rbs-sig-generation/)を参照してください。

## 修正とともにゲートを強化する

手本とすべきパターンは、albaメンテナのSteepラチェット（[`03b37e7`](https://github.com/okuramasafumi/alba/commit/03b37e75ee12b9a28e00341143449778bf2241d0)、[`5883637`](https://github.com/okuramasafumi/alba/commit/5883637)、[`bf06036`](https://github.com/okuramasafumi/alba/commit/bf06036)）です。[alba#576](https://github.com/okuramasafumi/alba/pull/576)の`Module#name`スレッドは、その隣にある2つの罠を示しています。

- **コードがパスするようにするコミットの中でダウングレードを削除する**。 albaのSteepfileは6つの診断を`:information`にリストしていました。`03b37e7`は`BlockTypeMismatch`を削除し、それが露出させた箇所を修正しました;他の2つのコミットは、修正すべき箇所が残っていなかったため、`UnexpectedSuper`と`UnexpectedKeywordArgument`を完全に削除しました。1コミットにつき1診断で、残り3つとなりました。変更を着地させるためにダウングレードを追加してはならず、隠されていた箇所を修正せずにダウングレードを外してはなりません。
- **呼び出しサイトの前にシグネチャを修正する**。 `03b37e7`はブロックに`[self: …]`型を与え、各proc契約を1回命名しました（単なる`Proc?`の代わりに`metadata_proc`、`instance_proc?`、`converter`、および`check`）。`# steep:ignore`を維持したのは3つのソース行のみで、それぞれシグネチャが表現できない1つの式に対するものであり、型アサーションは値を導入する行に移動しました。
- **チェッカーに合わせるためにシグネチャを広げてはならない**。 alba#576では、無名クラスが`nil`を返すにもかかわらず`_ClassContext#name`は`-> String`のままとされました: その変更はシグネチャ限定のものであり、`String?`にするとSteepが`nesting`を拒絶してしまうためです（`nesting`は2回目の`name`呼び出しを絞り込みません。`n = name`とすれば絞り込まれます）。メンテナの回答は、型を正直に保ち、コードを変更することでした。シグネチャ限定のスコープは、作業を止めてそう指摘する理由であって、より広い型を記述する理由ではありません。
- **`%a{implicitly-returns-nil}`を伴うコアの`-> String`は、すべてのチェッカーからnilを隠してしまう**。 albaで発生する例外のnilは別の場所にあります: `resource_name`は`self.class.name.end_with?`を呼び出し、`self.class`は`Class`と宣言されており、そのコアの`name`は`-> String`に加えてそのアノテーションを持つため、`Alba.serialize(obj) { root_key!; … }`は`NoMethodError`を発生させ、SteepもRigorもそれを報告しません。`RbsDispatch`は意図的にアノテーションを読み飛ばします（[inference-engine.md](../../internal-spec/inference-engine/)「取りこぼしうるルックアップに対するnilフリー」）。そのような呼び出しはコード内でガードし、値を生成する呼び出しサイトをチェックしてください;型に依存してはなりません。
