---
title: "ドキュメントレビュー —— L4コピーエディット + 規約遵守レンズ（2026-07-11）"
description: "rigortype/rigor docs/notes/20260711-docs-review-copyedit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-review-copyedit.md"
sourcePath: "docs/notes/20260711-docs-review-copyedit.md"
sourceSha: "c581272b754c16f4dc99e32c8c37a81482239048a093d4393ab303c003f5cadb"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

`rigor-docs-review`バッテリーの最終レイヤー。サーフェスレベルのみを対象とする——
英語の品質、`interface`命名規則、相互参照/用語の衛生、リンクテキストの品質。
コンテンツに関する判断（忠実性、読者レベル、冗長性）はレーン外であり、より前段の
レイヤーで処理済み。レビュー対象ブランチ: `docs/consistency-audit-0.2.9`。

全体としてコーパスはクリーンでよく編集されている——ヘッジ表現なし、AI臭い言い回し
なし、「in order to」の冗長さなし、「click here」のリンクテキストなし、裸のURLリンク
なし（2つのリテラルな`https://…`文字列は意図的にコピーペースト可能——インストール
プロンプトと正規の`llms.txt`インデックス）。`interface`命名規則は全体を通じて守られて
いる。以下の指摘は軽微で、1つのファイルに集中している。

## 英語の品質

| 箇所 | 問題（カテゴリー） | 深刻度 | 提案する修正 |
| --- | --- | --- | --- |
| `docs/manual/02-cli-reference.md:416` —— "the methods its `narrowing_facts`s narrow" | 複数形の二重化で不格好: `narrowing_facts`はすでに複数名詞で終わっているため、`s`を付けると読みづらい（兄弟の`` `node_rule`s ``/`` `dynamic_return`s ``とは異なる）。（英語） | FRICTION | 末尾の`s`を避けるよう書き換える: "the methods its `narrowing_facts` hooks narrow"（または "the methods narrowed by its `narrowing_facts` hooks"）。 |
| `docs/manual/02-cli-reference.md:581, 598, 608` —— "regenerate`").  JSON", "WD7).  The real", "queued.  Exits" \| 文末のピリオド後のダブルスペース（3箇所、いずれも`rigor doctor`/`rigor upgrade`セクション内）。コーパスの残りはシングルスペース。（英語） | nitpick | それぞれシングルスペースに詰める。 |

## interface命名規則

違反なし。Rigorの構造物にこの用語を使う各章で、初出は必ず限定されている:
- `07-rbs-and-extended.md:144` —— "named structural interface" ✓
- `appendix-protocols-and-structural-typing.md:11` —— "the RBS `interface`" ✓（かつこの章が正規の解説である）
- `appendix-go.md`/`appendix-rust.md`/`appendix-java-csharp.md` —— 最初の裸の "interface" は*別の*言語自身の構造物（Goの/Rustの`trait`/Javaの名前的`interface`）で、例外（b）どおり文脈から明白。Rigorのものは登場する箇所すべてで限定されている（"structural interface"/"RBS `interface`"）✓
- `appendix-steep.md:70`、`appendix-type-theory.md:20` —— 裸の`interface`はコードフォント内でRBSキーワード/RBSの`_Comparable`名として現れるのみで、文脈から明白 ✓

`handbook/README.md:235`の表記規約ブロックとプロトコル付録の双方が、この規則を明示的に
述べている。遵守は良好。

## 相互参照/用語の衛生

| 箇所 | 問題（カテゴリー） | 深刻度 | 提案する修正 |
| --- | --- | --- | --- |
| `docs/manual/02-cli-reference.md:571` —— "inert `disable:` / `severity_overrides:` tokens ({ConfigAudit})." | 挿入句の`{ConfigAudit}`は漏れた内部クラス/チェック識別子（あるいは未レンダリングのテンプレートトークン）。コーパスの他のどこにも現れず、文書化された規約でもなく、読者に何も追加しない——文はすでに "Configuration audit" と読める。壊れたマークアップに見える。（相互参照） | FRICTION | ` ({ConfigAudit})`を削除する。 |
| コーパス全体（10 × "analyser"/"analyse" の名詞/動詞綴り vs 41 × "analyzer" + 5 × "analyze"） | 同じ語の英式/米式綴りの混在。名詞は米式優勢（`analyzer` 41 vs `analyser` 10）だが、動詞は英式優勢（`analyse` 24 vs `analyze` 5）で、多くの個別ファイルが両形を抱えている（例: `handbook/01-getting-started.md`、`manual/02-cli-reference.md`、`manual/15-…`）。個々の文の欠陥ではないが、読者が気づく不整合。（用語の一貫性） | FRICTION | いずれか一方の規約を選んで正規化する。最小の変更量は、名詞をすでに優勢な`analyzer`に標準化し、10箇所の`analyser`を修正すること。理想的には動詞も確定する（現状`analyse`優勢）。ハウスチョイス——指摘であり、指示ではない。 |

用語はその他の点で一貫している: "carrier" は値の束（ラティス）オブジェクトに一様に
使われ（internal-spec APIに予約された "type object" へのドリフトはない）、`Dynamic[top]`
は`02-everyday-types.md`で漸進的（gradual）キャリアとして一度定義され、"untyped" は
一貫してそのRBS消去ビューにスコープされている。ADR-80の`type_specifier`→`narrowing_facts`
リネームは完全に適用済み——残る`type_specifier`への言及（`handbook/09-plugins.md:77-78`）
は意図的な非推奨ノートのみ。「Chapter N」参照はスポットチェックで正しい対象を指して
いる。`manual/README.md`のテーマ別（数値順ではない）目次リストは意図的なもので、各項目は
正しいファイルを指している。

## リンクテキストの品質

指摘なし。リンクテキストは全体を通じて説明的で、manual↔handbook間の相互リンクは対象を
正確に名指している。リテラルな`raw.githubusercontent.com/.../docs/install.md`のURLと
`<https://rigor.typedduck.fail/llms.txt>`はそのまま読む/コピーする意図なので、裸のURLで
正しい。

## 忠実性に関わる可能性のある問題（自分のレーン外）

サーフェスレベルでは何も見当たらなかった。

## 判定

前段のレイヤーを経て、ドキュメントは強い状態にある: 散文は簡潔でAIの兆候がなく、用語は
一貫しており、`interface`規約が保たれ、相互参照とリンクテキストは健全。唯一の実質的な
フリクションは`manual/02-cli-reference.md`に集中している——漏れた`{ConfigAudit}`トークン、
不格好な`` `narrowing_facts`s ``の複数形、そして3つのダブルスペース文で、いずれも最近
追加された`doctor`/`upgrade`/`--capabilities`の文面内。コーパス全体に関わる項目は1つ、
英式/米式の`analyser`/`analyzer`綴りの分裂で、正規化パスの価値はあるが緊急ではない。
すべての指摘はFRICTION以下で、いずれもシップをブロックしない。
