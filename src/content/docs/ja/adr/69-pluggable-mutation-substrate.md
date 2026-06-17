---
title: "ADR-69 — Pluggable mutation substrate (kill-oracle + operator seam)"
description: "Imported from rigortype/rigor docs/adr/69-pluggable-mutation-substrate.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/69-pluggable-mutation-substrate.md"
sourcePath: "docs/adr/69-pluggable-mutation-substrate.md"
sourceSha: "9535c1c86689c6263ebbc2f9f0e4566a43d7fdd6dd44f445117be9aece86e967"
sourceCommit: "dd7f6dc8daf0b115fb4f9e44f67eb21008e1456d"
translationStatus: "translated"
sidebar:
  order: 4069
---

ステータス: **Proposed — 未実装。ただし今すぐ着手可能（リファクタリングであり、新しいユーザーサーフェスなし）**。
ADR-62/63のミューテーション機構を一般化し、**キルオラクル**と**サイト選択戦略**を、`Protection::MutationScanner`に焼き込まれた前提ではなくパラメータにする。今日のところ、唯一のオラクル（oracle）は「新しいRigor診断が現れた」であり、唯一のセレクタは「Rigorが噛みつけるサイト（site）を残す」であって、どちらもハードワイヤされている。本ADRはこの基盤に、第2のオラクル（*「テストスイートがレッドになった」*）と、テスト指向のコンシューマーが必要とする反転セレクタを担わせる──これは[ADR-70](../70-fused-protection-coverage/)の前提条件であり、[ADR-71](../71-type-guided-external-mutation-testing/)が望むオプショナリティでもある──再設計なしに実現する。

根拠: [`docs/notes/20260617-type-guided-mutation-testing-strategy.md`](../../notes/20260617-type-guided-mutation-testing-strategy/)（これが可能にする戦略の分割）と現行コード`lib/rigor/protection/mutator.rb`、`lib/rigor/protection/mutation_scanner.rb`。

## コンテキスト

ミューテーションのコードはちょうど1つのシェイプしか持たず、アナライザーの歯（teeth）の問いに最適化されている。`MutationScanner#classify`（`mutation_scanner.rb`〜L85）は**キル**を、クリーンなベースラインに対して新しい診断シグネチャが出ることと定義し、`Mutator#filter_by_type`（`mutator.rb`〜L89）はRigorのアンカー型が具体的である箇所（アナライザーが*噛みつける*箇所）にのみミューテーションを残す。どちらもADR-62/63にとっては正しいが、テストスイートのコンシューマーにとっては**誤り**である。そのコンシューマーは、（a）再解析ではなく*テストを実行する*ことでキルし、（b）**逆**の選択を望む──いたるところ、とりわけ型フィルタが捨てる`Dynamic`サイトをこそミューテーションする。なぜなら、そこではテストが唯一の保護だからである。2つの軸が1つのクラスに絡み合っているため、ADR-70の動的オーバーレイも、将来のいかなる外部ツールも、スプライサ（splicer）＋ウォームループをフォークせずには再利用できない。

## 決定

基盤を2つのシームに沿って分解し、Prismスプライサをオラクル非依存に保つ。

> **基準（再利用可能なルール）:** **キルオラクル**と**サイトセレクタ**はスキャナに注入されるコラボレータ（collaborator）であり、ミューテータのプロパティでは決してない。`Mutator`が知るのは、*ソースをスプライス（splice）する*方法と、*契約がどこにあるか*（アンカー）だけである。*何をキルとみなすか*と*どのサイトがミューテーションする価値があるか*を決めるのはコンシューマーに属する。基盤がオラクル／セレクタを差し替えても表現できないケイパビリティは、シーム（seam）の隙間であって、ミューテータをコピーする理由ではない。

- **シーム1 — キルオラクル**。今日のロジックを`DiagnosticOracle`として抽出し（`Runner#run_source`がクリーンなベースラインにない診断を出したとき、かつそのときに限りミュータント（mutant）はキルされる）、`TestSuiteOracle`（ADR-70）が実装するインターフェースを定義する（スイートを実行し、レッドになったとき、かつそのときに限りキルされる）。スキャナはオラクルを受け取り、`classify`は`oracle.killed?(clean, mutant)`を呼ぶ。`DiagnosticOracle`の経路は今日と**バイト同一**に保つ。
- **シーム2 — サイトセレクタ**。型認識フィルタ（`filter_by_type`）は1つの戦略（`BiteableSites` — 具体アンカーのサイトを残す、偽陽性に安全）になり、`Mutator`から分離可能になるので、コンシューマーは代わりに`AllSites`／`Dynamic`を優先するセレクタを渡せる。ミューテータは依然としてレポート用にアンカー＋その型を*記録する*が、それに基づいてドロップを*決定する*ことはもうしない。
- **新しいユーザーサーフェスなし**。これはADR-50のもとでの内部再構成である（凍結された契約はCLI語彙＋JSONキーであって、`Protection::*`クラスのシェイプではない）。`tool/mutation/`およびADR-63の`coverage --protection --mutation`コマンドは、いかなる振る舞いの変化も観測しない。

## 却下／先送りした代替案

| 代替案 | 判定 |
| --- | --- |
| キル／選択ロジックを`MutationScanner`に残し、テストコンシューマーのためにミューテータをコピーする | **却下** — スプライサが2つに分岐してコピーされるのが保守上の罠である。シームのほうが安価な構造であり、ADR-52の「一度コンパイルし、エンジンが持つキーでディスパッチする」という直観をここに適用したものそのものである。 |
| 「Rigorが噛みついた」と「テストがレッドになった」の両方を返す1つのオラクル | **却下** — *すべての*ミュータントについてアナライザーの実行をテストの実行に結合してしまい、ADR-70の漸進的短絡（生存者だけがスイートを必要とする）を台無しにする。オラクルは2つにし、コンシューマーが合成する。 |
| シームを今すぐ公開プラグイン／拡張APIにする | **ADR-71に先送り** — 外部化は需要ゲート式である。ADR-70にとっては内部シームで十分であり、サーフェスをv1.0のフリーズから外しておける。 |

## 帰結

- **ポジティブ** — ADR-70はフォークなしで動的オラクルを重ねられる。ADR-71の外部オプションは、書き直しではなくクリーンな基盤を継承する。`tool/mutation/`と`coverage`は唯一の信頼できる情報源（ミューテータ）を保ち、いまや真にオラクル中立になる。
- **ネガティブ** — 小さな間接化コスト（メソッドだったところがインターフェースになる）が生じるが、その価値が具体化するのはADR-70が着地して初めてである。仮にADR-70が放棄されればシームは死んだ抽象になる（だから両者は一緒に着地させる）。
- **持ち越し** — ADR-70の最初の動的コンシューマーと並行して実装し、`TestSuiteOracle`インターフェースが机上のものでなく実際に行使されるようにする。ゲート: `DiagnosticOracle`の経路がADR-63の`coverage --protection --mutation`計測でバイト同一であること。

## 他のADRとの関係

- **ADR-62 / ADR-63** — それらが共有する`Protection::Mutator`／`MutationScanner`をリファクタリングする。`DiagnosticOracle`はそれらの振る舞いであり、そのまま保存される。
- **ADR-70** — 最初の`TestSuiteOracle`コンシューマー。このシームと同時着地する。
- **ADR-71** — 外部ツールがこの基盤を継承する。シームがオプショナリティの買い物である。
- **ADR-50** — 内部クラスのシェイプは凍結サーフェス*ではない*。本ADRはCLI/JSON語彙を一切追加しない。
