---
title: "ADR-69 — Pluggable mutation substrate (kill-oracle + operator seam)"
description: "Imported from rigortype/rigor docs/adr/69-pluggable-mutation-substrate.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/69-pluggable-mutation-substrate.md"
sourcePath: "docs/adr/69-pluggable-mutation-substrate.md"
sourceSha: "0193cb5c6f7a56f4c244f0060052989f286e6f26c0eda5d777f7e02a899e4caf"
sourceCommit: "fd78ee0a520ab7f2dfb40f13d33b4fbae93e2c69"
translationStatus: "translated"
sidebar:
  order: 4069
---

ステータス: **Accepted — 両シームとも2026-06-17に実装**。シーム1（キルオラクル）は[ADR-70](../70-fused-protection-coverage/)と同時着地し、シーム2（サイトセレクタ、`--include-dynamic`として表面化）は同日それに続いた──ADR-70の検証により、融合オーバーレイがそれ以外の方法では`Dynamic`サイト（マップの最も価値あるセル）に到達できないことが判明したとき、[ADR-71](../71-type-guided-external-mutation-testing/)から前倒しされた。ADR-62/63のミューテーション機構を一般化し、**キルオラクル**と**サイト選択戦略**を、`Protection::MutationScanner`に焼き込まれた前提ではなくパラメータにする。基盤はいまや、第2のオラクル（oracle、*「テストスイートがレッドになった」*、`Protection::TestSuiteOracle`）と第2のセレクタ（`:all` — `Dynamic`レシーバーのディスパッチサイトもミューテーションする。そこではテストが唯一可能な保護である）を担う。

実装済み: `diagnostic_oracle.rb`（シーム1、抽出されたADR-62/63の振る舞い）、`Mutator#dispatch_site_mutations`（シーム2 — あらゆるディスパッチサイト、`Dynamic`含む）、両者を消費する`MutationScanner#initialize(oracle:, site_selector:)` + `#scan_file_fused`。

根拠: [`docs/notes/20260617-type-guided-mutation-testing-strategy.md`](../../notes/20260617-type-guided-mutation-testing-strategy/)（これが可能にする戦略の分割）と現行コード`lib/rigor/protection/mutator.rb`、`lib/rigor/protection/mutation_scanner.rb`。

## コンテキスト

ミューテーションのコードはちょうど1つのシェイプしか持たず、アナライザーの歯（teeth）の問いに最適化されている。`MutationScanner#classify`（`mutation_scanner.rb`〜L85）は**キル**を、クリーンなベースラインに対して新しい診断シグネチャが出ることと定義し、`Mutator#filter_by_type`（`mutator.rb`〜L89）はRigorのアンカー型が具体的である箇所（アナライザーが*噛みつける*箇所）にのみミューテーションを残す。どちらもADR-62/63にとっては正しいが、テストスイートのコンシューマーにとっては**誤り**である。そのコンシューマーは、（a）再解析ではなく*テストを実行する*ことでキルし、（b）**逆**の選択を望む──いたるところ、とりわけ型フィルタが捨てる`Dynamic`サイトをこそミューテーションする。なぜなら、そこではテストが唯一の保護だからである。2つの軸が1つのクラスに絡み合っているため、ADR-70の動的オーバーレイも、将来のいかなる外部ツールも、スプライサ（splicer）＋ウォームループをフォークせずには再利用できない。

## 決定

基盤を2つのシームに沿って分解し、Prismスプライサをオラクル非依存に保つ。

> **基準（再利用可能なルール）:** **キルオラクル**と**サイトセレクタ**はスキャナに注入されるコラボレータ（collaborator）であり、ミューテータのプロパティでは決してない。`Mutator`が知るのは、*ソースをスプライス（splice）する*方法と、*契約がどこにあるか*（アンカー）だけである。*何をキルとみなすか*と*どのサイトがミューテーションする価値があるか*を決めるのはコンシューマーに属する。基盤がオラクル／セレクタを差し替えても表現できないケイパビリティは、シーム（seam）の隙間であって、ミューテータをコピーする理由ではない。

- **シーム1 — キルオラクル。実装済み**。今日のロジックは`DiagnosticOracle`として抽出される（`Runner#run_source`がクリーンなベースラインにない診断を出したとき、かつそのときに限りミュータント（mutant）はキルされる）;そのインターフェース（`#baseline`、`#killed?`）こそ`TestSuiteOracle`（ADR-70）が実装するものである。スキャナは`oracle:`を受け取り、その`classify`をそれ経由でルーティングする;`DiagnosticOracle`のデフォルトは今日と**バイト同一**である（ADR-63 Tier 2のスキャナspecは不変）。
- **シーム2 — サイトセレクタ。実装済み（`MutationScanner site_selector:`）**。噛みつけるフィルタ（`filter_by_type` — 具体アンカーのサイトを残す、偽陽性に安全）はいまや1つの戦略であり、`Mutator#dispatch_site_mutations`がもう1つである（`:all` — あらゆるディスパッチサイトを残す、`Dynamic`レシーバー含む;非ディスパッチのリテラルだけを捨てる）。これは融合オーバーレイの`--with-tests`経路にゲートされる（`Dynamic`サイトでは型パスが決してキルできないので、テスト軸なしではこれらはすべてノイズである──ADR-62の基準Aの罠）。ADR-63 Tier 2の`scan_file`は`:biteable`のまま、変わらない。これは2026-06-17のADR-70検証が需要を具体化するまで*ADR-71へ先送り*されていた（オーバーレイは`Dynamic`サイトに対して盲目だった──*テスト*保護のビューが最も重要となるまさにその場所である）;それを構築することは封じ込められている──既存のウォームループを再利用し、どのサイトをミューテーションするかだけを変える──ADR-71の外部プロダクトではない。
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
- **持ち越し** — 両シームはADR-70と同時着地した;`DiagnosticOracle`のデフォルトはADR-63のスキャナspecをグリーンに保った（バイト同一のゲート）。シーム2は検証の経験的需要により同日前倒しされた（オーバーレイは`Dynamic`サイトに対して盲目だった）;liquidの`lexer.rb`で検証され──`--include-dynamic`はマップを76の噛みつけるサイト（型75／テスト1／無保護0）から115のディスパッチサイト（型75／**テスト38**／**無保護2**）へ広げ、テスト保護された`Dynamic`セルと、噛みつけるだけのビューでは見えなかった2つの本物のギャップを表面化させた。残るADR-71との境界は*公開*セレクタ／オラクルプラグインAPIであり、依然として需要ゲート式である。

## 他のADRとの関係

- **ADR-62 / ADR-63** — それらが共有する`Protection::Mutator`／`MutationScanner`をリファクタリングする。`DiagnosticOracle`はそれらの振る舞いであり、そのまま保存される。
- **ADR-70** — 最初の`TestSuiteOracle`コンシューマー。このシームと同時着地する。
- **ADR-71** — 外部ツールがこの基盤を継承する。シームがオプショナリティの買い物である。
- **ADR-50** — 内部クラスのシェイプは凍結サーフェス*ではない*。本ADRはCLI/JSON語彙を一切追加しない。
