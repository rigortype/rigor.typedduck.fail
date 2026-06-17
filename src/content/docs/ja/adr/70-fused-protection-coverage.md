---
title: "ADR-70 — Fused static∪dynamic protection coverage"
description: "Imported from rigortype/rigor docs/adr/70-fused-protection-coverage.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/70-fused-protection-coverage.md"
sourcePath: "docs/adr/70-fused-protection-coverage.md"
sourceSha: "330170fa58519e97ffbc8edf178f7509b7f1c0b82f8b93f4aab3657a234d77e0"
sourceCommit: "dd7f6dc8daf0b115fb4f9e44f67eb21008e1456d"
translationStatus: "translated"
sidebar:
  order: 4070
---

ステータス: **Proposed — 未実装。ただし今すぐ着手可能（[ADR-63](../63-type-protection-coverage/)＋[ADR-69](../69-pluggable-mutation-substrate/)上の薄いスライス（slice））**。
`coverage --protection --mutation`にオプションの**動的オーバーレイ（dynamic overlay）**を追加する。*型*チェッカーがキルできなかったミュータント（mutant）ごとに、（ADR-69の`TestSuiteOracle`を介して）*テスト*がそれをキルするかどうかを問い、各サイト（site）を**両軸（axis）**で分類する──型保護された（type-protected）／テスト保護された（test-protected）／二重保護された（doubly-protected）／**無保護（unprotected）**。成果物はこの融合である。型もテストもそのラインを守っていない**ときに限り**真に無保護であり、レポートは**より安価な欠落軸（cheaper missing axis）**（「ここに型を足す」対「ここにテストを足す」）を指摘する。静的な型保護と動的なテスト保護を1枚のマップに融合する既存ツールは存在しない。

根拠: [`docs/notes/20260617-type-guided-mutation-testing-strategy.md`](../../notes/20260617-type-guided-mutation-testing-strategy/)（判断ステップ2──安価でミッションに沿った新規の一手）、ADR-63（本ADRが拡張する保護カバレッジ（protection coverage）コマンド）、ADR-69（本ADRが消費するオラクル（oracle）シーム（seam））。

## Context

ADR-63は2つの保護（protection）ティアを提供しており、どちらも**静的（static）**である。Tier 1（Rigorが噛みうるか、レシーバー（receiver）の具体性）とTier 2（Rigorが実際に噛むか、ミューテーション（mutation）のキル率（kill rate））。どちらも*「このサイトを**型システム**が保護しているか」*に答える。いずれもユーザーの**テストスイート（test suite）**を見ていない──だがRigorが`Dynamic`のままにしたサイト（その保護の盲点であり、戦略ノートによればまさに型フィルタが助けにならない箇所）はテストで十分に守られているかもしれず、完全に型付けされたサイトにテストが1つも無いこともある。静的軸だけを報告すると両方を取り違える。テストでカバーされた`Dynamic`サイトを「無保護」と呼び、テストの無い型付きサイトを「保護されている」と呼んでしまう。ユーザーが持つ実行可能な問いは**ユニオン（union、合併型とも）**である。*自分の型と自分のテストを前提として、このラインは実際にどこが無防備で、どちらが安価な修正か？*

戦略ノートの批判的分析は*一般的な*「型で枝刈りした外部ミューテーションフレームワーク」を退ける（テスト選択（test selection）でカバレッジ（coverage）に負ける。枝刈りは価値が最も低い箇所で効いてしまう）が、本ADRは救う──融合した**レポート**であり、生存者（survivor）にスコープを絞り、Rigorが既に所有する機構を再利用するからだ。

## Decision

`coverage --protection --mutation`を、オプトイン（opt-in）の動的オーバーレイ（例: `--with-tests`／`RIGOR_PROTECTION_TESTS`ランナーフック）で拡張する。これは**Rigorがキルしなかったミュータントに対してのみ**スイートを走らせ、その後で融合したサイトごとの分類を報告する。

> **基準（ADR-63の枠組みを拡張）:**指標は常に*有効性（effectiveness）／どこに保護を足すべきか*であって、生の生存数ではない──**さらに**融合のペイロードは単一の数値ではなく**帰属（attribution）**である。各無保護サイトには**最も安価な欠落軸（cheapest missing axis）**のタグが付く（`Dynamic`レシーバーの穴⇒「型を足す」。型付きだがテストでキルされなかった穴⇒「テストを足す」）。サイトが無保護と報告されるのは**両軸とも外れた**ときに限る。

- **漸進的短絡（gradual short-circuit、コストモデル（cost model））**。型チェッカーが既にキルするミュータントはスイートに到達しない──静的なネットが第1の防衛線、テストが第2である。高価なスイート実行は*型生存者（type-survivor）*に対してのみ支払われるので、オーバーレイのコストはファイルではなく保護穴（protection hole）に比例する。これが誠実で安価な枠組みだ。*「型チェッカーが通すミュータントのうち、あなたのテストはどれだけ捕まえるか？」*
- **サイトごとの4分類**。型保護された（ADR-63がキル）・テスト保護された（型では生き残った（type-survived）、スイートが赤になる）・二重保護された・**無保護**（両方とも生き残った──ランク付けされた「ここに保護を足せ」リスト）。`--format json`は4つのカウント＋帰属付きサイトを運ぶ。`--threshold`は**融合した**保護比率でゲートする。
- **選択（selection）はスイートの仕事であって、依存グラフ（dependency graph）の仕事では決してない**。オーバーレイはユーザーのスイート（または選んだサブセット）をそのまま走らせる。どのテストを走らせるかをRigorの型依存グラフで選んではならない（MUST NOT）。そのグラフは*型*の読み取りを記録するのであって*ランタイム*のコールグラフではないので、ミュータントをキルするテストを飛ばして**偽の**テストギャップ（test gap）を報告してしまう──偽陽性（FP）であり、このプロジェクトが越えない唯一の一線だ（`feedback_false_positive_discipline`）。カバレッジベースの選択は後の最適化（ADR-71）であり、ランタイムカバレッジ（runtime coverage）によるもので、静的グラフによるものでは決してない。

## Working decisions

- **WD1 — 生存者スコープ、オプトイン、変更ファイルのデフォルト**。オーバーレイは既存のTier-2コマンドに付き、その変更ファイルのデフォルト（ADR-63 WD4）を継承し、テストフックが与えられない限りオフである。プロジェクト全体（whole-project）は明示的なオプトインのままとする（ADR-46が着地すればより安価になる）。
- **WD2 — テストオラクルは裁定（adjudicated）される候補シグナルであって、評決ではない（ADR-59）**。「テスト生存者」とは*実行されたテストがどれもそれをキルしなかった*ことを意味する──pending／タグで除外／スキップ／flakyなテストは知りえないので、生存者はレビューのために浮かび上がった*候補*のテストギャップであって、スイートが壊れているという主張では決してない。レポートはそう述べる。これはADR-59のウィットネス（witness）ルールを動的軸に適用したものだ。スイートは注意を*優先付けし検証する*のであって、テストの不在を*認証する（certify）*ものではない。
- **WD3 — ADR-69の`TestSuiteOracle`を消費する。シームを同時に着地させる**。オーバーレイは最初のオラクル消費者であり、ランナーに直接手を伸ばすのではなくADR-69のインターフェースを行使する。`DiagnosticOracle`パス（ADR-63 Tier 2）はバイト同一（byte-identical）のままとする。
- **WD4 — 新しいフラグ＋JSONキーはADR-50 WD1の下で凍結された語彙（frozen vocabulary）**。それらを1度だけ、意図して命名する（オーバーレイのフラグ、4つの分類キー）。公開契約（public contract）として。

## Rejected / deferred alternatives

| Alternative | Verdict |
| --- | --- |
| **すべての**ミュータントに対してスイートを走らせる（短絡（short-circuit）なし） | **Rejected** — 安価な型のネットが既に持ちこたえている箇所で高価な軸を支払う。漸進的短絡こそ、これを手の届くものにするコストモデルである。 |
| 単一の融合「保護%」を見出しにする | **Rejected（ADR-63を先鋭化）** — その数値はペイロードを埋もれさせる。**帰属**（どの軸が欠けているか、どちらが安価か）こそが実行可能な出力である。`%`はそれに添えてよいが、決して置き換えてはならない。 |
| どのテストを走らせるかの選択に依存グラフを使う | **Rejected** — 偽生存者（false survivor）を生む（型グラフ≠ランタイムコールグラフ）。偽陽性である。選択はランタイムカバレッジの仕事であり、ADR-71へ先送り。 |
| 新しい`rigor protection`／`rigor teeth`コマンド | **Rejected** — ADR-63 WD1と同じ判断。保護はカバレッジの一次元である。`coverage`を拡張し、しきい値／JSONを再利用する。 |
| テスト生存者を証明済みのテストギャップとして扱う | **Rejected（WD2）** — pending／タグ／flakyの知りえなさ。それは裁定された候補（adjudicated candidate）である（ADR-59）。 |

## Consequences

- **Positive** — 真に新しい成果物。最も安価な修正の帰属を備えた静的∪動的の保護マップ（protection map）であり、Stryker／mutant／Sorbet-metricsのどのツールも提供していない。新しいサーフェスは最小限（既存の配管の上にフラグ1つ＋JSONキー）。漸進的短絡はコストを穴に比例させ続ける。
- **Negative** — カバレッジコマンドにテストランナー依存を持ち込む（ADR-62が意図的に避けたサーフェス）──ゆえにオプトインで、生存者スコープで、ADR-69のシームの背後に置く。WD2の知りえなさにより動的軸は静的軸より柔らかく、レポートはそれを教えなければならない。
- **Carry-over** — ADR-69と同時に着地する。プロジェクト全体の手頃さとカバレッジベースのスイート選択はADR-46／ADR-71のフォローアップであって、本オーバーレイのv1ではない。

## Relationship to other ADRs

- **ADR-63** — 直接の親。その2つの静的ティアに欠けていた動的軸を加える。枠組みのルールとコマンドは同じ。
- **ADR-69** — `TestSuiteOracle`シームを消費する。最初の消費者であり、同時に着地する。
- **ADR-59** — WD2はそのウィットネス・ノット・シグネチャ規則をテスト軸に適用したもの。生存者は優先付け／検証するのであって、認証しない。
- **ADR-46** — プロジェクト全体＋カバレッジ選択のオーバーレイを後に手頃にする、インクリメンタル（incremental）の筋立て。
- **ADR-71** — 本ADRが意図的に*手前で*留まる外部一般化。融合した指標は、そのツールが継承する前提条件である。
- **ADR-50** — オーバーレイのフラグ＋JSONキーは凍結された公開語彙である。
