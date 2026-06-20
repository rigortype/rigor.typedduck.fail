---
title: "Act-on-coverage skill — skeleton draft (ADR-63 WD5)"
description: "rigortype/rigor docs/design/20260616-act-on-coverage-skill.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260616-act-on-coverage-skill.md"
sourcePath: "docs/design/20260616-act-on-coverage-skill.md"
sourceSha: "3dbcf8acac15ccdc2659a8addc8e6f43d0550020886c5bf416e904998af1c38c"
sourceCommit: "832dbf9f85f234b230c6b72dff329a2055fa34f1"
translationStatus: "translated"
sidebar:
  order: 20265616
---

ステータス: **昇格済み（2026-06-20）**。このスケルトンは、[ADR-73](../../adr/73-skill-driven-user-experience/) WD4のもとで稼働中のスキル[`skills/rigor-protection-uplift/SKILL.md`](https://github.com/rigortype/rigor/blob/master/skills/rigor-protection-uplift/SKILL.md)として出荷された── ユーザー向けスキルの二重チャネル（gem同梱＋vercel-labs/skills）が、このドラフトが先送りしていた「外部作者向けパッケージング」の問題を決着させた。以下の手順はスキルの記録の正本として保存されており、**ドライランの所見＋複数リポジトリでのパイロット**のセクションは引き続き[ADR-63 WD5](../../adr/63-type-protection-coverage/)の根拠である。

このスケルトンはWD5の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>を実行可能な手順としてエンコードしており、これによって設計をドライランし、その摩擦を昇格前のWDへフィードバックできる。

---

```markdown
---
name: rigor-protection-uplift
description: >
  Close type-protection holes that `rigor coverage --protection` surfaces. For each
  unprotected dispatch site, try `rigor sig-gen` first, hand-author only the minimal
  residual annotation, then verify with a double gate — the site becomes protected AND
  `rigor check` stays diagnostic-clean. Use when asked to "raise type protection",
  "add types where Rigor can't catch bugs", or to act on `coverage --protection` /
  `--mutation` output. For user projects, never Rigor's own lib/.
---

# rigor-protection-uplift

Productizes ADR-63 WD5 — the act-on-coverage loop. `rigor coverage --protection` (Tier 1)
and `--mutation` (Tier 2) *surface* "add a type here"; they never author the type. This
skill *acts* on that surfacing under the discipline that keeps Rigor false-positive-safe.

## When to use
- A user wants to raise how much of their code Rigor can actually catch bugs in.
- You have `coverage --protection` output (an `add_a_type_here` list) and want to close it.

## When NOT to use
- Rigor's own `lib/` or the bundled `plugins/` / `examples/` (self-check tree) — injecting
  hand types there collides with the sig-gen-first ethos; use `rigor sig-gen` directly and
  treat gaps as engine signal.
- "Make my code more precise" with no protection goal — that is `coverage` (precision),
  not `--protection`.

## Load-bearing rules (read before touching a single type)
1. **The signal prioritizes and verifies; the contract sources the type (ADR-59).** Never
   write the type the mutation/coverage signal "wants". Write the type the code *actually
   has*, derived from the implementation and its callers. A type guessed from the signal is
   a false-confidence type — worse than no type.
2. **sig-gen first (AGENTS.md § RBS Authorship).** A hand-written annotation is only the
   *residual* sig-gen cannot reach. Every residual is a sig-gen-improvement report to file,
   not a private fix to pocket.
3. **"Minimal" = annotation footprint, not minimal-to-kill-the-mutant.** Optimizing
   literally for mutant death Goodharts the metric. Add the smallest *true* annotation that
   models the contract; if that happens to also kill the mutant, good.
4. **Robustness (ADR-5).** Tighten returns, keep params lenient. An over-tight param
   annotation breaks callers and breaches the false-positive discipline.

## Procedure

### Phase 1 — surface the holes
```
rigor coverage --protection --format json PATHS
```
Read `add_a_type_here` (ranked by traffic: `count`, `method_name`, `examples`). Optionally
confirm the highest-traffic ones actually buy catching power with the Tier 2 deep dive:
```
rigor coverage --protection --mutation --format json   # changed-files by default
```

### Phase 2 — sig-gen first
```
rigor sig-gen --diff PATHS      # inspect; --write to apply
```
Adopt every concrete inferred signature. Note where sig-gen emits `untyped` for a site on
the `add_a_type_here` list — that is the **residual** Phase 3 owns.

### Phase 3 — author the residual (cheapest carrier per hole class)
| Hole class                          | Cheapest carrier                                  |
| ----------------------------------- | ------------------------------------------------- |
| `Dynamic` method return             | annotate that method's return in `sig/…rbs`       |
| `Dynamic[top] \| nil` ivar read     | `# @rbs @field: T` (ADR-58 territory)             |
| untyped param feeding the receiver  | a *lenient* param annotation                      |
Write the minimal true type. Prefer annotating the *upstream* source of the Dynamic (the
method return / the ivar) over the call site itself.

**Trap (dry-run-confirmed):** a sidecar `sig/…rbs` is NOT purely additive. Declaring a
class there flips it from inference-mode to RBS-declared mode and *drops every member the
RBS omits* — a lone `def formatted: () -> String` made Rigor forget the inferred
`initialize` and reject `Money.new(500)`. So either (1) adopt the full Phase-2 sig-gen base
into the file and add the residual on top, or (2) use an in-place additive carrier
(rbs-inline `#:` / a `%a{rigor:v1:…}` return-override) that annotates the method without
re-declaring the class. "Minimal footprint" means the smallest *true* type, never the
smallest *file*.

### Phase 4 — double-gate verify (both must hold)
```
rigor coverage --protection PATHS   # (a) the site is now protected / ratio up
rigor check PATHS                   # (b) diagnostic-clean: NO new diagnostic vs baseline
```
If (b) regresses, the annotation modeled the wrong contract — **revert it**, do not suppress
the diagnostic. If (a) did not move, the carrier was wrong (often: typed the call site, not
the upstream Dynamic source).

### Phase 5 — feed the residual back
File each Phase-3 residual as a sig-gen gap (what shape did inference miss?). The hand
annotation is the stopgap; the durable fix is raising inference so the residual disappears.
```

---

## ドライランの所見（2026-06-16）

WD5ループを合成ターゲット（`Money#formatted`がuntypedなヘルパー越しに値を返す。`amount = Money.new(500); amount.formatted.upcase`）に対して実行した。結果: **この手順は成立し、ダブルゲートはその価値を発揮した**。

- **フェーズ1** `coverage --protection` → 2/4が保護済み（50%）。`add_a_type_here` = `#format`、`#upcase`。`#upcase`のサイトがターゲットである（`formatted`のuntypedな戻り値に乗っている）。
- **フェーズ2** `sig-gen --print`は`initialize`／`helper`を出力したが、**`formatted`は完全に省いた**── `untyped`を返すメソッドの出力を拒むためである。この省略こそが残余（residual）であり、フェーズ2→フェーズ3の引き継ぎを具体的に裏付けている。
- **フェーズ3（素朴版）**では`class Money; def formatted: () -> String; end`を*単独で*書いた。
- **フェーズ4** ── ゲート（a）は通過した（3/4、`#upcase`が保護済みになった）が、**ゲート（b）は失敗した**: `check`は`No diagnostics`（ベースライン）から新たな`Money.new (given 1, expected 0)`エラーへ転じた。部分的なサイドカーRBSが`Money`をRBS宣言モードへ反転させ、推論された`initialize`を落としたのである。**ダブルゲートは、稼働中のコードを壊す手書きアノテーションを捕捉した**── まさにその目的どおりである。
- **フェーズ3（修正版）**ではsig-genのベース（`initialize`、`helper`）を採り入れ、*そのうえで*残余の`formatted`を追加した。再検証: ゲート（b）は`No diagnostics`、ゲート（a）は**4/4（100%）**。

手順の修正点は上記のフェーズ3と、ADR-63 WD5のキャリア（carrier）に関する注意書きへ反映した。
1. 残余はsig-genのベースの上に載せるか、その場で追加可能なキャリアを使わなければならない── 部分クラスのみのサイドカーは追加的ではない。
2. Rigorは手書きRBSの戻り値を**信頼する**（宣言された`String`に対して、`formatted`のnilを返す本体をフラグしなかった）── したがって契約（contract）の正しさは作者が完全に負う。これはload-bearingルール1（契約が型のソースである）を補強する。
3. ゲート（b）は絶対的な「ゼロ診断」ではなく、**ベースラインとの差分**（新規対既存の診断）でなければならない── ターゲットは正当に既存の所見を抱えていることがある。

## マルチリポジトリでのパイロット検証（2026-06-16）

WD5の測定の屋台骨を5つのOSSライブラリにまたがって（リポジトリごとに1つのSonnetサブエージェントで）`rigor-survey`下で実行した: リセット → `sig-gen --write`（M1）→ ダブルゲート下での手書き残余（M2）。M2の数値はすべて実行後に独立して再測定した。

| repo | files | M0 prot | M1 (sig-gen) | M2 (skill) | sig-gen Δ | **skill Δ** | precision M0→M2 | residuals | reverts | check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kramdown | 55 | 17.3% | 23.6% | 34.9% | +6.3 | **+11.3** | 55.5→62.0 | 9 | 0 | 10 (flat) |
| haml | 51 | 22.4% | 28.2% | 31.9% | +5.8 | +3.7 | 51.7→55.8 | 10 | 0 | 8 (flat) |
| faraday | 33 | 21.3% | 27.8% | 31.4% | +6.5 | +3.7 | 44.1→49.5 | 10 | 0 | 6 (flat) |
| rgl | 28 | 25.0% | 34.5% | 36.6% | +9.5 | +2.1 | 43.3→48.5 | 11 | 0 | 0 (flat) |
| parser | 56 | 19.7% | 26.5% | 29.0% | +6.8 | +2.5 | 44.1→50.6 | 10 | 0 | 25 (flat) |
| **mean** | | **21.1%** | **28.1%** | **32.8%** | **+7.0** | **+4.7** | | 50 | **0** | **flat** |

**評決: スキルはすべてのリポジトリでsig-genを超えて保護率を上げ（+2.1〜+11.3pp、平均+4.7）、しかも診断コストはゼロである**── 50件の残余アノテーションが定着し、リバートは0件、各リポジトリの`check`エラー数は終始M0ベースラインに固定されたままだった。ダブルゲートは成熟したコードにおいて一度の退行（regression）もなく保たれた。これはWD5の前提**と**そのFP安全性（偽陽性安全性）の主張を経験的に裏付ける。

正直な限界:
- このゲインは天井で頭打ちである（これらのライブラリでは保護率約30〜37%）。支配的な残りの穴は手書きRBSでは手に負えない── 外部gemのDynamicレシーバー（Temple／Ripper／`ast`）、多相的な値型（kramdownの`Element#value`）、ジェネリック型パラメータ（rglの頂点／重み）、動的な`Options.new`クラス（faraday）である。これらにはアノテーションではなく、パラメトリック型／外部RBS／エンジン側の畳み込みが必要になる。このスキルは*20%台前半→30%台前半*の仕上げ役であって、80%への道筋ではない。
- sig-gen（M1）は前提条件であり、これに匹敵する重労働をこなす。スキルが最も強く効くのは、具体的なクラスが多く、そのメソッドの戻り値をsig-genがuntypedのまま残したライブラリ（kramdown、parserの`Source`レイヤー）である。

副産物 ── 実在の欠陥が表面化した（Rigorに対して起票する価値あり）:
- **sig-genが、ソースが`class X`を宣言している箇所で`module X`を出力する**（サブディレクトリのRBSにて。parser: `Diagnostic`／`Comment`／`Map`／`Rewriter`／`TreeRewriter`）→ 手で直すまでRBS環境全体をクラッシュさせるRBS `DuplicatedDeclarationError`。具体的なsig-genのバグ。
- **sig-genが構文エラーを含むRBSを書いた**（rgl、3件の修正）── 出力の妥当性の穴。
- **過度にnilableなsig-genの戻り値**（kramdownの`children: -> []`）が`possible nil`のFPを表面化させる── 既知のsig品質のFPクラス（acknowledgeモードのベースラインの領域）。
- sig-genによって（スキルではなく）表面化した、もっともらしい*実在の*潜在バグが2件: kramdownの`link.rb:130`でnilableなスライス（slice）に対する`strip!`、faradayの`connection.rb:296`でnilの可能性があるアダプタに対する`setup_parallel_manager`。

プロトコルの精緻化が確認された: ゲート（b）は無垢な状態に対してではなく、**sig-gen実行後（M1）のベースラインに対して新規診断なし**でなければならない── sig-gen自身がacknowledgeモードのFPの包絡を表面化させ、それをプロジェクトのベースラインが吸収するからである。スキルが負うのはM1→M2の増分のみである。

## 昇格前に解決すべき未解決の問い
- パッケージング: ADR-31のv0.2.0経路が構築されたあと、外部作者向けスキルがどこに置かれるか。
- フェーズ4（a）が、*特定の*サイトが保護済みへ反転すること（精密）をゲートにすべきか、それともファイル比率が上がること（安価）をゲートにすべきか── どちらが頑健かはドライランが教えてくれるはずである。
- ivarクラス向けのキャリアは、ADR-58の進捗と、ユーザープロジェクトがサイドカーの`sig/`ではなくrbs-inlineプラグイン（ADR-32）を使うかどうかに依存する。
