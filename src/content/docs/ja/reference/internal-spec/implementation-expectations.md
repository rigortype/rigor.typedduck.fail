---
title: "Implementation Expectations"
description: "Imported from rigortype/rigor docs/internal-spec/implementation-expectations.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/implementation-expectations.md"
sourcePath: "docs/internal-spec/implementation-expectations.md"
sourceSha: "5bf469a9f3ff7d97e94bc293744d332ae46267466ad08e0c104e1727fecc0a6b"
sourceCommit: "9f40e22193647dc06e3ab70c5ba82768b0bfe738"
translationStatus: "translated"
sidebar:
  order: 3050
---

実装はパース処理・内部型表現・サブタイピング（subtyping）・一貫性・正規化・スコープ遷移・エフェクト適用・RBS消去を、それぞれ独立した概念としてMUST分離しなければなりません。この分離によりRBS互換性の安定性が保たれ、推論指向の内部精度を高める余地が確保されます。

このドキュメントは、下位の機能が依拠するエンジンサーフェス契約です。ここに挙げる各サーフェスは仕様書の他箇所から参照されています。

## エンジンサーフェス

コア型エンジンは以下をMUST公開しなければなりません。

- **不変な`Scope`スナップショット**。ジョイン・ナローイング（narrowing）・無効化は、インプレース変更ではなく構造的共有によって新しいスナップショットを生成します。[control-flow-analysis.md](../../type-specification/control-flow-analysis/)を参照してください。
- **エッジ対応の条件解析（truthy・falsey・normal・exceptional・unreachable出口）**。[control-flow-analysis.md](../../type-specification/control-flow-analysis/)を参照してください。
- **推論バジェットと、推論が停止した理由を保持する不完全推論結果**。[inference-budgets.md](../../type-specification/inference-budgets/)を参照してください。
- **ファクト（fact）ストア**。値ファクト・否定ファクト・関係ファクト・メンバー存在ファクト・シェイプファクト・動的由来の来歴・安定性ファクト・エスケープファクト・キャプチャされたローカル書き込みファクトを表現できます。[control-flow-analysis.md](../../type-specification/control-flow-analysis/)を参照してください。
- **エフェクトモデル**。レシーバーおよび引数の変更・ブロック呼び出しタイミング・クロージャエスケープ・純粋性・ファクト無効化を扱います。[control-flow-analysis.md](../../type-specification/control-flow-analysis/)と[rbs-extended.md](../../type-specification/rbs-extended/)を参照してください。
- **ケイパビリティロール推論**。メソッドごとの要求サマリをキャッシュし、インデックス済み名前付きインターフェースが利用できる場合はそれに照合し、照合が曖昧またはコスト過多な場合は匿名シェイプを保持できます。[structural-interfaces-and-object-shapes.md](../../type-specification/structural-interfaces-and-object-shapes/)を参照してください。
- **正規化**。ユニオン（union、合併型とも）・インターセクション・補集合・差・不可能な絞り込みを対象とします。[normalization.md](../../type-specification/normalization/)を参照してください。
- **拡張向けセマンティック型クエリ**。プラグイン作者が具体的な型クラスを検査するのではなく、ケイパビリティ質問を投げかけられるようにします。[rbs-extended.md](../../type-specification/rbs-extended/)を参照してください。
- **保守的なRBS消去（オプションで精度損失の説明付き）**。[rbs-erasure.md](../../type-specification/rbs-erasure/)を参照してください。

## この構造が必要な理由

この構造は、仕様書の他箇所で述べられている理想的な動作を実現するために必要です。

- 構造的インターフェースと推論されたオブジェクトシェイプによる、正確なRubyスタイルのダックタイピング；
- 複合条件内での式レベルのナローイング；
- アナライザーの制御フロー状態を所有することなくフレームワーク知識を追加できるプラグインAPI。

これらの関心事を分離しなければ、RBS互換性・内部精度・プラグイン拡張性が同一コードパスをめぐって競合します。分離によって、この仕様に記載された不変条件を保ちながら各レイヤーが独立して進化できます。

## 公開サーフェスの安定性

`Scope`の公開サーフェス・プラグインに公開される型クエリAPI・診断識別子プレフィックス（[diagnostic-policy.md](../../type-specification/diagnostic-policy/)を参照）は、メジャーバージョン内で安定しています。内部レイアウト（ファクトバケット・インデックス済みインターフェース照合テーブル・ケイパビリティロールキャッシュ）は、変更MAYされる実装詳細です。

プラグイン・リファクタリングツール・その他のコンシューマは、クエリにはMUST公開サーフェスを使用しなければなりません。仕様書が公開契約として文書化していない内部データ構造にMUST NOT依存してはなりません。
