---
title: "mizchi/dspec — 形式仕様基盤としての評価 + トレーサビリティ規律の移植検討"
description: "Imported from rigortype/rigor docs/notes/20260716-dspec-formal-spec-substrate-evaluation.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260716-dspec-formal-spec-substrate-evaluation.md"
sourcePath: "docs/notes/20260716-dspec-formal-spec-substrate-evaluation.md"
sourceSha: "748f6e09d47a917f957f63b96def0a7354270d8473459f5321286a67b2b7794f"
sourceCommit: "d88effcae8b2998d1f4f40432e6d4f20ce17946e"
sourceDate: "2026-07-16T21:51:01+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266716
---

Date: 2026-07-16.

Status: **research note, no design commitments.**

種別: 外部ツール調査 + Rigorへの移植可能性評価 + 形式手法（Lean 4 / Alloy）の
テストオラクル利用評価。
関連: [20260601-gradual-typing-era-mizchi-rigor-ts-review.md](../20260601-gradual-typing-era-mizchi-rigor-ts-review/)
（同一著者の論説レビュー）。

**このノートの実測成果**（調査の副産物だが本体より重要）:
`docs/type-specification/special-types.md`の**`void`節が丸ごと未実装**であることを
発見（§ P1）。2つのMUSTを含む節が現在形で規定する挙動に対し、実装は
`Bases::Void => :translate_untyped`。ADR-1が名指しで予見していたリスクが実現し、
どのゲートにも映らずに残っていた。

## 対象

- リポジトリ: <https://github.com/mizchi/dspec>
- 調査時HEAD: `8136008`（2026-07-16に取得）
- 規模: 16コミット / 2026-07-13〜2026-07-15 / 単独作者（mizchi,一部Kotaro Chikuba名義）
- 自称: "Typed Pkl prototype for a human-level executable specification language"
- 実装量: `dspec/Schema.pkl` 790行（型付きauthoring面）、`src/cli.mjs` 14,281行
  （検査系）、`src/core/clause-ast.mjs` **91行**（形式意味論の全量）

**注意（方法論）**: `--depth 1`クローンでは全コミットが最新日付・単一著者に潰れて
見える。上記の年齢・著者数は`--unshallow`後の実測。浅いクローンからリポジトリの
成熟度を読むと、ADR-82のgroup-dominant集計と同じ種類の測定アーティファクトになる。

## 結論（先出し）

二段構えの評価:

> **形式的記述の基盤としては不適合**。 Clause ASTが無解釈アトム上の命題論理断片で
> しかなく、型・帰納的定義・推論規則というRigorの仕様に必須の語彙を持たない。
> `T <: U`を書いても`atom("subtype", ["T","U"])`にしかならず、バックエンドが
> 検証できるのはその上のトートロジーだけになる。
>
> **一方、"supportの認識論" は移植価値がある**。 dspecの本当の発明は形式手法では
> なく、**主張（Rule）と根拠（CheckTarget）の距離を型付きで宣言させ、リンク切れ
> （drift）と未検証（coverage）を機械的に落とす**規律。Rigorはこの規律を診断
> （ADR-65 evidence_tier）とユーザコード（ADR-63/70 protection coverage）には
> 持っているが、**自分自身の規範仕様には持っていない**。
>
> **そして穴は実在した（P1、本ノートで実行）**。 `special-types.md`のprobeで
> **`void`節が丸ごと未実装**であることが判明 — 2つのMUSTを含む節が現在形で
> 規定する挙動に対し、実装は`Bases::Void => :translate_untyped`でvoidを潰して
> いる。ADR-1が「voidが早々にbroad alias扱いされるリスク」として**名指しで
> 予見していた失敗が、そのまま実現して残っていた**。どのゲートにも映らないのは、
> Rigorのゲートが全てFP指向（鳴るべきでないものが鳴る）で、**未実装の診断=沈黙**
> だから。詳細は下記P1。

## dspecとは何か

Pklをauthoring面（型付き文書検証）、Node CLIを検査面とする。モデルの中核:

- `Term`（語彙、ja/enローカライズ）+ `Rule`(`permission` / `prohibition` /
  `obligation` / `invariant` / `transition`の種別、`when` / `must` / `mustNot`節)
  + `Decision`（追記専用の設計履歴 = ADR相当）
- `CheckTarget` / `ImplementationRef` — ルールをテストアンカー・実装シンボルに紐付け、
  `drift`コマンドが解決可能性を常時検査
- **assurance階層**: `reference` / `executed` / `mutation-tested` / `bounded` /
  `proved`。強い主張にはダイジェスト付きevidence manifestを要求(全順序ではなく
  集合 — mutation testingとbounded model checkingは別の問いに答えるため)
- `spec-change compat` — 仕様before/afterを`compatible` / `breaking` /
  `narrowing` / `widening` / `unknown`に分類
- `spec-reading-eval` — 正解ラベル（`entailed` / `contradicted` / `not-supported`）
  付きゴールドセットで「LLMが仕様を正しく読めるか」を採点
- ドメインパック（`db` / `cloud` / `data` / `release` / `runtime`）+ Markdown /
  QuickCheck / TLA+ / Alloy / Leanへの決定的射影

## 形式基盤としての評価 — なぜ不適合か

### 1. Clause ASTが貧弱すぎる

`src/core/clause-ast.mjs`の全演算子は
`atom | eq | neq | not | and | or | implies | exists | forall`のみ。
`atom`は**文字列引数上の無解釈述語**、`eq`/`neq`は`Object.is`による記号比較。
型・帰納的定義・推論規則・再帰は表現語彙に存在しない。

Rigorの中核仕様 — `value-lattice.md`の束恒等式、`relations-and-certainty.md`の
`<:`とgradual consistency、`control-flow-analysis.md`のedge-aware narrowing — を
書こうとすると、すべて無解釈アトムの羅列に落ちる。**アトムの意味はバックエンドから
見えない**ので、検証できるのは「アトム間の命題論理的含意」だけになる。

### 2. semanticな検証パスがLeanの等式断片しかない

dspec自身が`ClauseBackendSupport = unmapped | textual | structural | semantic`と
いう率直な適用可能性マトリクスを持ち、そこでの自己申告が:

- **Lean**: `eq` / `neq` / `not` / `implies`のみsemantic。`atom` / `and` / `or` /
  量化子はstructural
- **TLA+**: textual（文字列）
- **Alloy**: unmapped
- 自己モデルの`bounded` / `proved`ターゲットは**ゼロ**

READMEの自己記述が最も正直:

> "This proves the Clause proposition, not the behavior of application code."

つまり生成Leanが証明するのは`ClauseEnv`上のClause命題であって、対象システムの
振る舞いではない。**Rigorが形式化したいのはまさに後者**。

### 3. 実務コスト

Pkl + Node 24 + pnpmをRuby/Nixリポジトリに持ち込むコスト。生後3日・単独作者・
互換性保証なしのプロトタイプ(READMEがpre-releaseを明言、削除コマンドはaliasを
残さずunknownとして弾く方針)。ドメインパックは完全にDevOps指向(cloud / data /
release / runtime)で型理論とは無縁。

### 4. 代替の方が強い

型意味論を本当に形式化するなら**Lean 4を直接**（束恒等式・narrowingの健全性）、
有界検査なら**Alloyを直接**使う方が、dspecのClause ASTを経由するより表現力・
証明力とも桁違いに上。dspecはその場合「Leanファイルへのポインタ登録簿」以上には
ならない。

## 移植価値のある規律 — 対応表

| dspec | Rigorの既存対応物 | ギャップ |
| --- | --- | --- |
| Ruleの安定id + `drift`（リンク切れ検査） | 仕様コーパスのRFC 2119文言 | 規範節 → specの機械可読リンクが**ない** |
| `coverage`（approved ruleは自動チェック必須） | `spec/docs/`（user docsのみ）、RuleCatalog完全性spec | 規範節単位のカバレッジは**ない** |
| assurance階層（reference / executed / … / proved） | ADR-65 evidence_tier（診断）、ADR-63/70 protection coverage（ユーザコード） | **自分の規範仕様に対しては未適用** |
| `spec-change compat`(breaking/narrowing/widening) | ADR-50互換性契約（人手運用）、ADR-50 WD7 / ADR-77 WD2 `rigor upgrade`（accepted・deferred） | 機械分類は既存deferred作業に合流 |
| `spec-reading-eval`（LLMの仕様読解採点） | ADR-73/74 skills + llms.txt、[ACP 13モデル検証](../20260620-opencode-acp-cross-model-validation/)（*振る舞い*の評価） | *読解*のゴールドセット評価が**ない** |
| `Decision`（追記専用履歴） | ADRコーパス + ADR-49ルーブリック | Rigorの方が成熟 |

## Rigor側のギャップ実測（2026-07-16）

規範コーパスの規模(規範キーワード`MUST`/`MUST NOT`/`SHOULD`/`SHOULD NOT`/`MAY`の
**出現数** — 散文中の用法も含むので、独立した規範節数の上限値):

| コーパス | 出現数 | ファイル数 |
| --- | --- | --- |
| `docs/type-specification/` | 289 | 17 |
| `docs/internal-spec/` | 547 | 17 |

これに対する機械的リンクの実態:

- `spec/docs/`は3 spec(`handbook_snippets_spec.rb` / `link_integrity_spec.rb` /
  `manual_drift_spec.rb`)で、**すべてuser-facing docs（manual + handbook）専用**
- `spec/`全体から`type-specification`を参照するのは**1箇所のみ**、しかも
  integration fixtureの`demo.rb`内の偶発的言及
- CLAUDE.mdは「spec binds」と宣言しているが、**規範コーパスがengineから乖離しても
  落ちるゲートは存在しない**

**先例は既にある**: `manual_drift_spec.rb`はCLIサブコマンド / configキー /
rule ID / `documentation_url`アンカーの4軸で、まさにdspecのdriftと同じ形
（「実装側の集合と文書側の集合が一致すること」）を実装済み。規範コーパスへの拡張は
新アーキテクチャではなく**既存パターンの延長**。

## 実践案

全836出現にidを振る「完全レジストリ」は**推奨しない** — 散文MUSTの多くは
原子的にテスト可能な命題ではなく（オーサリング規約や説明的用法を含む）、idを振って
coverageゲートを立てると、実質を伴わない`reference`リンクを量産して**false
assurance**になる。dspecが`reference`と`executed`を型で区別しているのは、まさに
この失敗を知っているから。

代わりに、Rigor自身の方法論(ADR-62のadjudicate-don't-assume、ADR-49の
measurement-gated defaults)に従い、**機械を作る前に穴の実在を測った**。その結果
（P1）が、作るべき機械の形を汎用レジストリより遥かに狭く決めた（P1'）。

### P1（実行済み — 穴の実在を確認）: `special-types.md`のprobe

`docs/type-specification/special-types.md`(小規模、core semantics、高stakes、
ADR-75/82/83が繰り返し触る領域)を対象に、規範節ごとに「これをengineが守らなく
なったとき赤くなるspecが存在するか」をprobeした(2026-07-16、全14節の完全裁定
ではなくカバレッジprobe)。

**結果 — `void`節が丸ごと未実装。しかもどこにも記録されていない**。

`special-types.md` § `void`（L66-92）は現在形で以下を規定する:

> `void` is **not** an ordinary value type in Rigor. It is a result marker …
> **Rigor keeps `void` distinct internally so it can diagnose value use**
> - In value context, a `void` result **MUST** produce a primary "use of void value"
>   diagnostic and is materialized as `top` for downstream recovery.
> - When imported RBS places `void` in a generic slot, Rigor **MUST** preserve the slot.
> - `void | bot` normalizes to `void` in result summaries.

実装（[`lib/rigor/inference/rbs_type_translator.rb:51`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/rbs_type_translator.rb)）:

```ruby
RBS::Types::Bases::Void => :translate_untyped,
```

**`void`はRBS境界で`untyped`（= `Dynamic[top]`）に潰されている**。実測:

| 仕様の要求 | 実装 |
| --- | --- |
| `void`を内部で区別 | `Type::Void` carrier不在（`lib/rigor/type/`になし） |
| "use of void value" 診断（MUST） | rule idゼロ。`lib/` `spec/`とも文字列ヒット0 |
| generic slot保存（MUST） | 変換時に消滅 |
| `void \| bot` → `void`正規化 | 正規化対象の`void`が存在しない |
| 値文脈で`top`にmaterialize | `Dynamic[top]`になる（= 検査されない） |

**記録状況**: ROADMAP / CURRENT_WORK / CHANGELOGにvoid意味論の保留記録は**なし**
（ヒットは全てRBSシグネチャ中の`-> void`）。`special-types.md`自身にも
"not yet" / "planned" 等の保留マーカーは**なし**。internal-specに`Void` carrierの
規定も**なし**。

**しかもADR-1がこの失敗を名指しで予見していた**:

- [ADR-1:30](../../adr/1-types/) — "Special RBS types such as `untyped`, `top`, `bot`,
  and `void` **must be handled with type-theoretic clarity rather than as ad hoc
  aliases**."
- [ADR-1:74](../../adr/1-types/)（リスク節）— "**`void` and `untyped` are likely to be
  treated as broad aliases too early.**"

予見されたリスクが、そのままの形で実現し、誰にも気づかれずに残っていた。

### P1が示したもの — なぜ既存ゲートが取り逃がすか

この乖離が生き延びた理由は構造的で、示唆が大きい:

**Rigorのゲートはすべてfalse-positive指向**。corpus byte-identical、regression
sweep、`make check`自己診断 — いずれも「**鳴るべきでないものが鳴る**」を捕まえる。
未実装の診断は**沈黙**なので、どのゲートにも映らない。

これは**ADR-62（mutation testing = false-negative測定）が解こうとした盲点と同じ
クラス、ただし一段上のレイヤ**。ADR-62はコードを壊して「歯」を測るが、
*機能そのものが存在しない*場合は壊すコードがないのでmutation testingでも捕まらない。
**「仕様が約束した診断が実装されたことが一度もない」は、Rigorの現行ゲート網の
完全な死角**。

n=1章のprobeでこれが出た。他章の全裁定は未実施だが、**穴の実在は確定**した
(`Dynamic[top]`は46 specファイル、`NilClass`は15と、他節のカバレッジは
妥当に見える — 全節が穴なのではなく、*沈黙するMUST*が刺さる)。

### P1の帰結（a）: void乖離そのものの解消

これは移植検討とは独立した、いま存在する具体的エンジニアリング項目。CLAUDE.mdの
「spec binds」に従えば実装が非適合なので、二択:

1. **仕様を実装に合わせる** — `void`を`untyped`の別名として認め、§ voidを
   縮約する。ADR-1:30の「ad hoc aliasにするな」に正面から反するので、ADRで
   その撤回を明示的に記録する必要がある
2. **実装を仕様に合わせる** — `Type::Void` carrier + 値文脈診断 + slot保存。
   新しい診断ルール = ADR-50 WD1の必須規律追加 = **BC**なのでbleeding-edge
   overlay経由（既定off）。FP面は狭い（`puts`の戻り値使用は明確に疑わしい）が、
   `-> void`を返すRBSは膨大にあるのでcorpus実測が要る

**どちらでもよいが、現状（仕様が現在形で嘘をつく）は選択肢ではない**。判断には
corpus実測（`-> void`メソッドの戻り値が値文脈で使われる実頻度）が要るので、
ADR起票が妥当。

### P1の帰結（b）: 「約束された診断」ゲート — 実測が示した狭い機械

P1は汎用レジストリ（836節にid）を**不要**にした。刺さったのは特定の一クラス —
**「仕様が診断を約束しているのに、そのrule idが存在しない」**。これは:

- **機械的に検査可能** — 規範節が診断を約束する箇所でrule idを名指しさせ、
  `CheckRules::ALL_RULES`に存在することを検査する
- **既存パターンの延長** — `manual_drift_spec.rb`の軸3が既に
  「`ALL_RULES`の全IDがcatalogueに載っていること」を実装済み。**逆向き**
  （仕様が約束したIDが実装に存在すること）を足すだけ
- **false assuranceを生まない** — `reference`リンクの量産ではなく、
  「約束vs実在」という二値。dspecの`assurances`階層でいえば最下段だが、
  **voidはその最下段で落ちていた**
- **Rigorの死角を正確に射抜く** — FP指向ゲート網 + ADR-62 mutation testingが
  どちらも構造的に見られない「一度も実装されなかった診断」を、唯一捕まえる形

規模も小さい: 診断を約束する規範節は836出現のごく一部。

### （b）実行 — 全章棚卸しの結果（2026-07-16）

`docs/type-specification/`全17章から「診断を約束する規範節」を抽出（53節）し、
実装語彙と突き合わせた。**診断語彙の全体は39 id** — `CheckRules::ALL_RULES`の
26に加え、非check family(`dynamic.*` / `pre-eval.*` / `rbs.coverage.*` /
`rbs_extended.*`)の13。`ALL_RULES`は全体ではない(`known_suppression_token?`が
family単位で非check idを受理する設計)ので、棚卸しは全語彙に対して行う必要がある。

**`diagnostic-policy.md` § Identifier taxonomyが宣言する12 familyの実装状況**:

| 宣言family | lib実装 | 仕様のstatus記述 |
| --- | --- | --- |
| `call.*` / `def.*` / `flow.*` / `dynamic.*` / `rbs_extended.*` / `rbs.coverage.*` | あり | — |
| `plugin.<id>.*` | 動的（プラグイン） | — |
| **`static.*`** | **0** | **保留マーカーなし**（現在形） |
| **`compat.*`** | **0** | **保留マーカーなし**（現在形） |
| **`hint.*`** | **0** | **保留マーカーなし**（現在形） |
| **`generated.<provider>.*`** | **0** | **保留マーカーなし**（現在形） |
| `sig.*` | 7（JSON出力のみ） | ✅ **正直に明記** — "The slice-1 MVP surfaces these identifiers through the command's JSON output rather than the diagnostic stream" |

**12 family中4つが実装ゼロ、かつ保留マーカーなし**。 `static.*`は特に射程が広い —
`diagnostic-policy.md:5`「The cutoff identifiers used by inference budgets live in the
`static.*` family」、`:10`「Calling a method on `top` without proof is a diagnostic」、
`:21`「Rigor **MUST** report the cutoff」、`special-types.md:11`「Diagnostics for
unguarded calls on `top` belong to the `static.*` family」— いずれも現在形。

### 裁定 — 「未記録のdrift」と「既知の保留」を分ける

全てが同罪ではない。ADR-62のadjudicate-don't-assumeに従って分類:

**✅ 正直な記述（模範 — 仕様は正しい書き方を既に知っている）**

- `inference-budgets.md:75` — "The budget table above is **normative-for-v1 intent. As
  of this writing the configurable `budgets:` surface is not yet wired** — no `budgets:`
  key is parsed and the table's rows are not enforced." 実際`configuration.rb`に
  `budgets`キーは存在しない。**54行目のMUSTを75行目が明示的に留保している**。
  [ADR-41](../../adr/41-inference-budget-design/)（Proposed）も同じ事実を記録
- `diagnostic-policy.md:43` — `sig.*`のJSON-onlyを明記

**❌ 未記録（実害）**

- **`void`診断** — 実装0、仕様に保留マーカーなし、ADR / ROADMAP / CHANGELOGにも
  記録なし（§ P1）
- **`static.*`の`top`半分** — budget半分は上記の通り正直に留保されているが、
  「`top`への無保証呼び出しは診断」の半分はどこにも留保がない
- **`compat.*` / `hint.*` / `generated.*`** — ADR-1 / ADR-2の**創設期の宣言が現在形の
  まま残った**もの(`hint.role-generalization.*`は[ADR-1:366](../../adr/1-types/)が
  設定スイッチ`style.suggest_role_generalization`付きで定義しているが、この設定キーも
  `configuration.rb`に存在しない)。保留記録なし

つまり`docs/type-specification/diagnostic-policy.md` § Identifier taxonomyは、
**一部が「設計時のウィッシュリスト」を規範的分類表として提示している**状態。

### なぜ既存ゲートが構造的に見られないか（gateの形が確定）

`manual_drift_spec.rb`の4軸を読み直すと、**全てimpl → doc方向**である:

- 軸2: "every top-level key in `Configuration::DEFAULTS` **must be mentioned in** the
  configuration reference"
- 軸3: "every ID in `CheckRules::ALL_RULES` **must appear in** the diagnostic catalogue"

**逆方向（doc → impl）は一切検査されていない**。だから「仕様が宣言したが実装が
存在しない」は5件すべて素通りする。P1のFP指向ゲート論（沈黙は映らない）の、
ドキュメント側での正確な対応物。

**したがってゲートの形は確定した**（かつ当初案より小さい）:

> `diagnostic-policy.md`が宣言する各familyは、**実装idを1つ以上持つか、
> 明示的な保留マーカーを持つか**のいずれかでなければならない。

- 836節へのid付与は**不要** — 検査対象は分類表の12行
- **「実装しろ」ではなく「宣言するか、保留を明記しろ」** — `sig.*`と`budgets:`が
  既に正しい書き方を実演しているので、規範は確立済み・強制だけが無い
- `manual_drift_spec.rb`に軸を1本足すだけ（既存パターンの逆向き）
- false assuranceを生まない — `reference`リンクの量産ではなく「宣言vs実在」の二値

### P2（独立・新規性あり）: 自分のドキュメントに対するspec-reading eval

dspecの`spec-reading-eval`はRigorの弱点を正確に突いている。RigorはAI消費者
向けにskills(ADR-73)+ `rigor docs` / llms.txt（ADR-74）を出荷しているが、
**エージェントがそれを正しく読めているかの評価は存在しない**。
[ACP 13モデル検証](../20260620-opencode-acp-cross-model-validation/)は*振る舞い*
（`rigor-next-steps`を完走できるか）を測ったが、*読解*（仕様から何がentailedか）は
未測定。

`waza`は既にFlakeにありskill評価に使える。ゴールドセット
（entailed / contradicted / not-supported）をhandbook / type-specの一章に対して
作るのは、machinery不要で即着手できる。P1とは独立。

### P3（ポインタのみ・新規作業不要）

`spec-change compat`の機械分類は、Rigorでは**ADR-50 WD7 / ADR-77 WD2の
`rigor upgrade`（accepted・具体的BCターゲット待ちでdeferred）**に合流する。
凍結面（rule ID / CLI語彙 / JSONキー）のbefore/after分類という形なら、そのADRが
実装される時の設計入力になる。診断出力自体はADR-50 WD1で非契約なので対象外。

## Lean 4 / Alloyを直接テストオラクルにする案の評価

dspecを却下する理由が「形式化するなら直接Lean/Alloyを使え」だったので、その案自体を
評価した（同日、本ノート内で完結）。**結論: いまCIオラクルとして作るのは見送り。
ただしAlloyは設計時の道具として今日から使える。**

**コーパス前例はゼロ** — `docs/adr/` `docs/notes/`全体でLean / Alloy / Coq / TLA+ に
言及するのは本ノートが最初。真に未評価。

### 却下理由1: 形式化できる層は、バグがある層ではない

形式化が現実的なのは**型代数**（束恒等式、`Dynamic[T]`代数、`<:`、正規化）のみ。
narrowing / dispatch / evaluatorの形式化はRuby意味論(ブロック、メタプロ、RBS
overload解決、`coerce`)の形式化を要求し、非現実的。

では実バグはどちらに出ているか — コーパスの健全性バグの層別:

| バグ | 層 |
| --- | --- |
| ADR-56: block exit scope破棄 → `1.upto(6){ result *= i }`が`Constant[1]`（実行時720） | evaluatorのscope配線 |
| ADR-78: `public_send(method_name)`の定数畳み込み → 12 FP | dispatcherのfoldゲート |
| ADR-57: tail-only body evaluatorがexplicit / block-internal returnを落とす | evaluator |
| ADR-91 / #110: Kernel foldの所有権 | dispatcherのゲート |
| ADR-64: coerce障壁 | Rubyのdispatch意味論 |
| `\|\|` / `&&`のvalue-position edge-narrowingバグ | narrowing配線 |

**一つも型代数のバグではない**。逆にコーパス唯一の純粋な代数の問い(ADR-83
Dynamic-facet代数)は「実装したがuser-visible valueゼロ」で決着し、その判断は
**経済的な問い**（精度が上がるか）であって形式的な問い（無矛盾か）ではなかった —
Leanが答えられない問い。Rigorの意思決定を律速しているのは健全性ではなく
**FPと精度の経済**。

### 却下理由2（決定的）: conformance linkのない模型は、本ノートの`void`そのもの

形式模型がオラクルになるには実装との対応リンクが要る。選択肢は（1）模型から実装を抽出
（既存Rubyエンジンには不可能）、（2）模型を実行可能にしてdifferential test(誰も
書かない言語で第二実装を保守)、（3）何もない（= 証明付きドキュメント）。現実には（3）。

**（3）の帰結は本ノートのP1が実演済み**: Leanがvoid意味論を完璧に証明しても、
その証明は`Bases::Void => :translate_untyped`の隣で眠るだけ。これはdspec却下の理由
（"This proves the Clause proposition, not the behavior of application code"）に**一段上で
落ちる**構図で、しかも悪化する — 証明があると「検証済み」の心理的保証がつくのに、
コードは何も守っていない。

### 下の段が二つ空いている（ADR-86のラダー型）

- **段0（完全に空）: 型代数のproperty-based testing**。 `rantly` / `propcheck`類は
  Gemfileにゼロ。`spec/rigor/type/combinator_spec.rb`は132例あるが全て例示ベースで、
  例えば`Dynamic[Dynamic[T]] → Dynamic[T]`（冪等則）を**一点で**確認しているだけ。
  ∀ に上げるのは翻訳ギャップゼロ（オラクル = 実装そのもの）・既存rspec内・保守二重化
  なし。空振りしない見込みもある — **ADR-1:29が
  「Erasure must never produce a narrower type than Rigor proved」と ∀ 命題を明示**し、
  このerasure / renderingファミリでは実バグが出荷済み(sig-genのrecord-key RBS
  クラッシュ、`&block`がenvを壊す`(**untyped, ?{ (?) -> void })`を吐いた #51)。
- **段1（既存・実績あり）: rigor-rs differential**。 [ADR-91:80](../../adr/91-kernel-intrinsic-fold-ownership-gate/)
  — **rigor-rsのdifferential harnessがitem 1（Kernel fold polarity）を実際に発見**。
  ADR-91の対処は「外部検出器をin-repo invariant gateに変換」(ADR-62 kinshipとして
  明記)で、`rely-on-rigor-rs-differential`自体は「外部・portスケジュール結合でCI
  ゲートではない」as complement, demand-gatedで保留。**動いていて実バグを釣った
  オラクルが既にある**。翻訳ギャップもない（両者が同じ仕様を実装）。Lean模型はこれより
  弱いオラクルを高コストで作ることになる。

### それでも手を伸ばす場所

- **Alloy = 設計時の思考道具（今日から可）**。新しい代数操作を提案するADRの中で
  「この正規化は合流的か」に数分で反例を返す。使い捨てるのでconformance link不要・
  保守ゼロ。CIゲートではない。
- **Lean 4 = rigor-rsパリティが一級の課題になったら**。二実装が一仕様を実装する構図
  では機械化仕様が**共通の審判**として資産になる（WebAssemblyの機械化仕様の位置）。
  `value-lattice.md` + `relations-and-certainty.md` + `normalization.md`は小さく形式化
  可能。ただし今はdifferential harnessの方が安くて既に動いている。

### 推奨順序

段0（型代数PBT）→ ADR-91が保留したrigor-rs differentialのin-repoゲート化 →
それでも埋まらない ∀ が残ったらLean。記録するなら**ADR-86と同じ形**(standing
rejection + 非形式手法優先ラダー + 再評価トリガ)。

### 段0実行 — PBT spikeの結果（2026-07-16）

gem依存なしの手書きジェネレータで実施(ADR-62 WD1が`mbj/mutant`を却下して自前
ハーネスを作った先例に倣う。当たりが出てからgem / commitを判断するspike段階)。
`seed=20260716` / 2,000ケース。法則の出典はすべてnormative。

**ジェネレータの健全性を先に検証**（greenを信じる前に）: 13 carrierを生成
(Dynamic 15.3% / Difference 12.0% / Bot 8.8% / Top 8.4% / IntegerRange 8.4% /
Tuple 8.0% / Singleton 7.8% / Constant 7.8% / HashShape 7.7% / Nominal 7.6% /
Union 3.5% / Intersection 3.0% / Refined 1.9%)、生成時rescueの握り潰し**0件**、
ネストした実型を生成（`[{ k0: singleton(Object), … }, untyped]`等）。**空振りでない**。

| 法則 | 出典 | 結果 |
| --- | --- | --- |
| L1 `erase_to_rbs`はvalid RBS | internal-type-api:140 | **PASS** |
| L2 `normalize`冪等 | internal-type-api:141 | **実行されず**（下記） |
| L3 `eql?` ⟹ hash一致 | internal-type-api:28 | PASS |
| L4 `union(T,bot)==T` / 冪等 / 可換 | value-lattice | **PASS** |
| L5 `dynamic(top)`はcanonical untyped | internal-type-api:118 | PASS |

**結果1: 存在する型代数は堅い**。これはLean/Alloy却下理由1の**独立した裏付け**
になった — 形式化できる層を2,000ケース叩いて反例ゼロ。形式手法が答える問いは、
Rigorでは既に答えが出ている。

**結果2（本命）: PBTの収穫は法則違反ではなく、契約の考古学だった**。
L2は`respond_to?(:normalize)`ガードで**黙ってスキップ**された。理由を追うと —

### 三つ目の同型事例: `internal-type-api.md`の型オブジェクト契約

`docs/internal-spec/internal-type-api.md`はCLAUDE.mdが**normative**に分類し、
自らを "the public contract that every Rigor type object **MUST satisfy**" と現在形で
規定する。実装状況（23 carrier中）:

| 契約メソッド | 実装carrier数 | 備考 |
| --- | --- | --- |
| `describe` | 19 | ✅ |
| `erase_to_rbs` | 19 | ✅ |
| `accepts` | 2 | `acceptance_router`経由 |
| **`normalize`** | **0** | MUST付き（冪等・`self`返却・`normalization.md`へrouting）。**lib全体に`def normalize`を持つTypeが存在しない** |
| **`traverse`** | **0** | lib全体に近い名前すら不在 |
| **`consistent_with`** | **0** | lib全体に`consistent`を含むメソッドが**ゼロ** |
| **`equal_value`** | **0** | 同上 |
| **`has_method`** | **0** | `arg_class_has_method?`等のエンジン内ヘルパのみ |
| **`subtype_of`** | **0** | 能力は`subtype_verdict` / `rbs_subtype?`等でエンジン内に存在するが、契約が規定する**carrierのメソッド面としては不在** |

核心のcarrier `Rigor::Type::Nominal`が公開するのは`initialize` / `describe` /
`erase_to_rbs` / `inspect`の4つだけ。

**裁定（名前問題ではない）**: 同文書line 22は「メソッド名はADR-3 OQ2未解決なので
束縛しない」と明示的に除外しており、line 21は具象クラス集合も束縛しない。しかし
`consistent` / `traverse` / `equal_value`は**lib全体で近い名前すら存在しない**ので、
綴りの問題ではなく**能力の不在**。名前のcarve-outは綴りを免責するのであって、
メソッド面ごとエンジン内ヘルパへ移設することは免責しない。

## void三択のA/B実測（2026-07-16、ADR-92 WD2のcarry-over）

ADR-92 WD2がmeasurement-gatedとした三択のうち、**選択肢（b）（`void → top`、RBSに縮約）**
をA/Bした。`Bases::Void => :translate_top`に変えてcorpus診断をdiff。

| corpus | baseline | `void → top` | 判定 |
| --- | --- | --- | --- |
| mail `lib` | 26 | 26 | IDENTICAL |
| kramdown `lib` | 68 | 68 | IDENTICAL |
| haml `lib` | 60 | 60 | IDENTICAL |
| liquid `lib` | 5 | 5 | IDENTICAL |
| mastodon `app/models` | 0 | 0 | IDENTICAL(248 files / 1350 RBS classes) |

**空振り検証**（greenを信じる前に）: translatorを計装して`Bases::Void`の翻訳回数を計測 —
mail **2回** / kramdown **29回**。kramdownの29サイトが実際に`Dynamic[top]` → `top`に
変わった上で、診断は不変。**測定は非空振り**。

**結論: （b）は診断上タダ**。ただし理由が重要 — **`top`と`Dynamic[top]`を区別する機構
（`static.*` = 「無保証の`top`呼び出しは診断」）自体が未実装**なので、両者ともメソッド
呼び出しに対して沈黙する。つまり（b）の価値は「今効く」ことではなく、**RBSからの無許諾
乖離を除去し、`static.*`が入った時に正しく効く土台にする**こと。表現の正しさの前払い。

**（a）と（b）の関係 — 単純な上下ではない**。仕様はvoidを`top`と*区別*する理由を明記
している:

> Rigor's contribution on top of the RBS rule is to record that the value reached the
> position by recovery from `void` and to surface that as a primary diagnostic, so the
> analyzer can explain *why* a `top` appeared

つまり（b）を素朴に実装すると**voidの由来が失われ**、この「なぜ`top`になったか説明する」
能力が消える。ただしこれは**ADR-75の型を回避する設計パターンがそのまま使える** —
provenanceは「値についてのメタデータであって、値そのものの一部ではない」。`dynamic_origins`
と同じidentity-keyed side-table（`void_origins`）を置けば、**`void → top` + 由来side-table
= （a）の意図を（b）の土台の上で実現できる**。carrierを増やしてlatticeを分岐させる必要は
ない(ADR-75 WD1が`Dynamic` carrierに`provenance:`フィールドを足すのを却下したのと同じ
理由 — value-equalityが壊れる)。

**推奨**: （b）を先にlanding（タダ・fidelity回復・（a）の土台）→ （a）は`static.*` +
`void_origins` side-tableと併せて設計。ただし（a）は新規必須規律 = ADR-50 WD1のBCなので
`bleeding_edge:`経由。**（c）（実装追認）は測定により不要** — （b）がタダである以上、
RBSとADR-1:30の両方を捨てる理由がない。

## voidセマンティクスの検証 — ユーザー報告から（2026-07-16）

報告された想定挙動:

```ruby
def foo #: void
  p 1
end
def bar = foo
a = bar   # 「a: 1 になっている。void ≒ top まで広げてほしい」
```

**実測（rbs-inlineプラグイン + `# rbs_inline: enabled`）**:

| 書き方 | `dump_type` |
| --- | --- |
| トップレベル`def foo #: void` → `a = bar` | **`1`**（報告どおり） |
| クラス内`def cv #: void` | `Dynamic[top]`（landing前） |
| クラス内`def cbar; cv; end`（**注釈なし**） | `Dynamic[top]` ← **void性は伝播していた** |

**原因はvoidではなくトップレベル**。 synthesizerの出力を直接確認すると:

```ruby
class C
  def cv: () -> void
end
```

トップレベル`def`は**一行も生成されない**(upstream rbs-inlineは`class`/`module`宣言しか
出さない)。行末`#: void`構文自体は正しく`() -> void`に変換されている。void固有ではなく
`#: () -> String`でも同じく無視される。

**方法論の落とし穴2件**（どちらも危うく誤報）:
1. magic comment `# rbs_inline: enabled`が必須（ADR-32 WD2）。無いとプラグインは**何も寄与
   しない**。最初のテストがこれで「注釈が効かない」と結論しかけた
2. `#: void`はdef行末尾で正しい。upstream rbs-inline自身が`def self.write(...) #: void`と
   書いている

**accepted signatureは境界で信頼されている**（`relations-and-certainty.md:48`のとおり） —
対照実験で`#: () -> String`を`p 1`の本体に付けると型は`String`になり
`return-type mismatch: declared String, inferred 1`が出る。宣言が推論に勝つ。

### 報告が（b）の論拠を強くした

報告者の要望は「`void` ≒ `top`まで広げて**後方互換性を保証しない**」。これはfidelity論より
強い（b）の論拠になる — **`Dynamic[top]`は目的を裏切る**:

- `Dynamic[top]` = gradualの逃がし口。何とでもconsistent。`a = bar; a.length`は黙って通る →
  **呼び出し側が静かに依存できてしまう**（= `void`が防ぎたかった唯一のこと）
- `top` = 使用前に証明を要求 → 宣言した契約に忠実

**（b）をlandingした**（`Bases::Void => :translate_top`）。

### 残りは二部品に分解される

報告者の第二の要望「代入・引数を警告」= 仕様 § voidの未実装MUST = ADR-92選択肢（a）。
報告者自身が挙げた「型とは別のルールレベル」案は**直接使用ならcarrier不要**で成立するが、
**報告例はtransitiveケース**（`a = bar`、`bar`は無注釈）なので呼び出し点のRBSを読むだけ
ではvoidが見えない。必要なのは:

1. **`static.*`の実装** — 今日Reservedとmarkerを付けた4 familyの一つ。**これが（b）が
   タダだった理由そのもの**: `static.*`が無いので`top`も`Dynamic[top]`も等しく沈黙する。
   これが入って初めて`top`が噛む。**欠けていた連結子**
2. **`void_origins` side-table** — ADR-75パターン(provenanceは値についてのメタデータであって
   値の一部ではない)+ ADR-82 WD6のchain-origin伝播。carrier不要・lattice非分岐で
   transitiveケースが解ける

三部品（（b） / `static.*` / `void_origins`）とも、本ノートの調査が触った場所。**報告された
二つの理想は、仕様が元々書いていた意図とほぼ一致し、`static.*`という欠けた連結子まで含めて
説明がつく。**

## 第四の事例 — rbs-inline ingestion: specとADR-32の正面衝突（2026-07-16裁定）

「rbs-inlineをデフォルトロードにしては？」というユーザー提案を受けて、`overview.md:68`の
MUSTとADR-32のプラグイン方式が整合しているかを裁定した。**結果: 整合していない。しかも
第1〜3事例（沈黙による未実装）より鋭い — accepted・実装済みのADRがbinding specと
正面衝突している。**

`overview.md` § "Compatibility hierarchy"（**2026-04-28**、`4e49c10b`）:

> Rigor … **MUST NOT require `# rbs_inline: enabled` to begin parsing them**. Only the
> rbs-inline configuration directives such as `# rbs_inline: enabled` and
> `# rbs_inline: disabled` are interpreted; the rbs-inline annotation comments themselves
> (for example `#: String`, `# @rbs`, parameter annotations) are **always parsed and used
> whenever present**.

ADR-32（**2026-05-25**、accepted・v0.1.10実装）:

> WD2 — The plugin synthesises RBS **only** for files whose first non-blank lines include
> `# rbs_inline: enabled`. … Rejected: **Always-on once the plugin is loaded**

タイムラインが決定的: **specが1ヶ月先**。ADR-32はspecの存在を認識しないまま
（ReferencesはADR-0/2/5/6/15/25/27/29 — **overview.mdを一度も引かない**）、specが
MUST NOTと書いた形をそのままWD2で採用し、specが要求する形を「Rejected alternative」に
置いた。2026-05-29のdocs-alignment passもこの節を素通りしている。

**CLAUDE.mdの規則で裁定は自動**: "When an ADR and the spec disagree on analyzer behaviour,
the spec binds." → **出荷挙動が非準拠**。二軸で:

1. **起動モデル** — specはannotationを「official type sources … always parsed whenever
   present」とする。素のRigor（プラグイン未設定）は一切parseしない
2. **magic comment** — specは「MUST NOT require」。プラグイン既定は`require_magic_comment:
   true`

**準拠形は既に存在する**: WD10の`require_magic_comment: false`がまさにspecの意味論。
upstream `parser.rb:73`を検証 — `# rbs_inline: disabled`は`opt_in`判定より**前に**無条件で
守られる（`return if with_disable_magic_comment`）ので、`false`側でもper-file opt-outは
生きる。**準拠は工学の問題ではなく、配線とデフォルトの問題**。

### ユーザー提案への回答が反転した

当初私は「ADR-27/31のauto-load deferralに反する」としてデフォルト化に反対した。裁定の
結果、**binding specはユーザー提案より強いことを要求している**(提案 = デフォルトロード +
オプトアウト可能;spec = magic comment不要で常時parse、`disabled`のみ解釈)。反対は
起動モデルの問いについて一次資料により覆った。ADR-0(zero-dep)/ ADR-27/31（コード実行）/
standalone install（gem不在）の懸念は**機構**を制約するのであって、**義務**を消さない。

機構の選択肢と残余（ADR-93に整理）:
- core再実装 — ADR-32 WD1の却下理由（grammar drift）は健在。義務は挙動であって実装方式
  ではないので、却下を維持できる
- **presence-gatedデフォルト配線**（ADR-72パターン）— rbs-inlineライブラリが解決可能
  （Rigor環境or ADR-90のbundle-fallback）ならbundledプラグインを自動有効 +
  `require_magic_comment: false`。解決不能ならhint
- 残余（standaloneでgem不在）— 「always parsed」はcore依存なしには完全充足不能。
  ADR-0との真の緊張はここ**だけ**に絞られる

## ADR-93 WD4の初回測定（2026-07-16、herb + mail）

自然実験 = **herb**（marcorothのHTML+ERB toolchain）: 本物のrbs-inline annotationが
~25ファイル、magic commentは2ファイルのみ、**そして手書き`sig/`が同じコードを覆う**。

**発見1（ブロッカー、同日修正）**: プラグイン有効化で**env全崩壊**(1,490 classes → 0、
`require`すら未解決化、偽`call.unresolved-toplevel` 74件)。機構 —
`RBS::Environment#add_source`は`sources`へ**先に** appendしてからdeclを挿入するので、
`sig/`と衝突するvirtual定数が挿入途中でraise → per-entry rescueはskipするが**毒された
sourceが残り**、`sources`から作り直す`resolve_type_names`が全rescueの外で再噴出。
sig/ とinlineの重複は移行中プロジェクトの*期待される状態*であり、**今日のopt-inユーザー
全員が踏む実バグ**（ADR-93とは独立）。修正 = skipのtransactional化 + rbs `>= 3.0, < 5.0`
帯へのresolve時backstop + 明示`.rbs`勝ち + cache-hit安全な
`virtual_rbs_collision_quarantined` + 一回限りの命名warning。

**方法論の教訓（2件、自分の誤り）**: ① 最初「RBSは重複検出をresolveまで遅延する」と
読んだが誤り — 真の機構は「eager挿入 + dirty partial addの再噴出」。backtraceを
resolve_type_names:533で止めずにadd_sourceの内部まで読むべきだった。② 私の最初の修正
（retryループ）は、rescue **ハンドラ内**で`unload`が再raiseして自分のrescueに
捕まらず、herbで沈黙失敗した。最小再現のgreenをherbで再検証したことが命拾い。

**発見2（修正後のA/B/C、herb lib）**:

| モード | 診断 | 差分 |
| --- | --- | --- |
| A: プラグイン無し | 11 | — |
| B: opt-in + magic尊重（現行ADR-32） | 11 | ±0（magic 2ファイルは両方sig/ と衝突 → 隔離、sig勝ち） |
| C: `--treat-all-as-inline-rbs`（ADR-93目標形） | 12 | **−3 genuine wins** + 4 FP |

+4は`call.possible-nil-receiver` × `Regexp.last_match(1)`(`=~`成功後、groupは
`/\n([ \t]+)\z/`で必ず参加 → 実行時nil不可能)。**annotationが引き起こしたのではなく、
sig/ の`-> untyped`が隠していた既存のengine不精度が露出した**もの。match-成功エッジでの
`last_match(n)`非nil化という将来のnarrowing factにrouting。

**発見3（WD1/WD2を作り替える反証）**: 注釈ゼロのmailで`--treat-all-as-inline-rbs`が
26 → 42。原因 — upstream rbs-inlineのopt-outモードは**無注釈def全部に`-> untyped`
スケルトンを合成**し、accepted signatureは本体推論に勝つので、**inference-firstと正面
衝突**する（推論の方が`untyped`より精密）。specがbindするのは「annotationが在れば
honourする」ことであって「無注釈コードのuntyped影を製造する」ことではない。よって
ADR-93の適合形は**annotation存在ゲート**(ファイル内容の安価なスキャン。magic commentは
不要のまま = MUST NOTは守られる)であり、全ファイル無条件ではない。

## ADR-93 WD1の実装 — 測定が設計を二度作り替えた（2026-07-16）

WD4の測定を受けてWD1（magic-comment不要モード）を実装。**測定が私の設計案を二度反証した**。

**第一の反証（前節Finding 3）**: 「`require_magic_comment: false`にする」= upstreamの
opt-outモード = **無注釈def全部にuntypedスケルトンを合成**。mail 26→42。
→ 案を「ファイルに注釈があるときだけ寄与する」ゲートに変更。

**中間検証で分かった、その案も不十分な点**: 混在ファイルの実測 —

```
class Mixed
  def annotated: (String) -> Integer        # 注釈あり: 本物
  def unannotated: (untyped x) -> untyped   # 注釈なし: スケルトン
```

ファイル単位ゲートでも、**注釈が1つあるファイルの他メソッドはuntypedで汚染される**。
member単位のフィルタはupstream ASTへの結合(ADR-32 WD1/WD3がgrammar-drift理由で
却下した路線)なのでv1では採らず、「注釈付きファイルはupstream準拠(`rbs-inline --output`
が生成するのと同じもの)」として受容。**残余として記録**。

**第二の反証 — `#:nodoc:`**: ゲート実装後もmailは26に戻らず**31**。原因は
`class AddressList #:nodoc:` — RDocディレクティブが`#: <type>`と字句衝突し、**upstreamが
型alias `nodoc`のTypeAssertionとしてparseする**（`nodoc`を消費し末尾コロンを捨てる）。
mailの**61ファイル**がこれだけでゲートを通過していた。Rubyで最も普遍的なコメントの一つ。

- upstreamのバグであり報告に値するが、**出力は無害**(`# :nodoc:`コメントとして戻るだけで
  偽の型は出ない)→ フィルタはゲート層のみで足りる
- 検出はupstream自身の`AnnotationParser`に委譲(正規表現で`#:`を探す実装は、
  `http://example.com#:`を含む素のdocコメントを誤検出するし、文法はupstreamのもの
  = ADR-32 WD3)

**最終測定**:

| corpus | base | ゲート後 | |
| --- | --- | --- | --- |
| mail（注釈ゼロ） | 26 | **26** | 42 → 31 → 26と段階的に修復 |
| kramdown / haml / liquid | 68 / 60 / 5 | 同じ | no-op ✓ |
| herb（実注釈あり） | 11 | 12 | **−3 genuine wins** / +4 |

**教訓**: 「upstreamに委譲すればgrammarはupstreamのもの」（ADR-32 WD3）は正しいが、
**upstreamの*目的*はRigorの目的と違う** — `rbs-inline --output`はsig/ を*生成*する道具
なので無注釈defにスケルトンを吐くのが正しい。Rigorは*推論*が一次なので同じ出力が害になる。
委譲の境界は「文法」であって「何を寄与とみなすか」ではない。

**残り（ADR-93 WD1a）**: herbの +4（`Regexp.last_match(1)`の可nil判定）はADR-57プロトコル
上artifactなので、**既定フリップの前に根本修正が必要**。side-questではなく前提条件。

## 総合 — 発見された共通パターン

本ノートの調査は、同一のバグクラスを**4つ独立に**発見した（#4は沈黙でなく矛盾という、より鋭い亜種）:

| # | 場所 | 内容 | 記録 |
| --- | --- | --- | --- |
| 1 | `special-types.md` § void | 2 MUSTを含む節が丸ごと未実装（`Bases::Void => :translate_untyped`） | **なし** |
| 2 | `diagnostic-policy.md` § taxonomy | 宣言12 family中4つ（`static.*` / `compat.*` / `hint.*` / `generated.*`）が実装ゼロ | **なし** |
| 3 | `internal-type-api.md` § method surface | 契約メソッド`normalize` / `traverse` / `consistent_with` / `equal_value` / `has_method` / `subtype_of`がcarrierに不在 | **なし** |
| 4 | `overview.md:68` vs ADR-32 | binding spec「always parsed / MUST NOT require magic comment」に対し、accepted ADRがopt-inプラグイン + magic-commentゲートを実装（specが1ヶ月先、ADRはspecを引かない） | **なし**（相互参照ゼロ） |

**共通の診断**: Rigorの規範コーパスには**創設期の地層**（ADR-1 / ADR-2 / ADR-3期）が
あり、それは*設計目標*として書かれたものが*束縛的契約*として現在形で提示されたまま、
出荷物と一度も突き合わされていない。

**そして正しい書き方は既にコーパス内に2例ある** — どちらも後年の追記:

- `inference-budgets.md:75` — "**As of this writing the configurable `budgets:` surface
  is not yet wired**"
- `diagnostic-policy.md:43` — `sig.*`のJSON-only明記

**規範は確立済み。強制だけが無い**。これが「宣言するか、保留を明記しろ」ゲート
（§ （b））の射程を決める — 対象はvoidの1節ではなく、創設期地層の全体。

## 却下

- **dspec自体の採用** — 形式基盤としての不適合（上記1〜4）+ Pkl/Node導入コスト +
  生後3日・単独作者・互換性保証なし
- **Lean 4 / AlloyをCIテストオラクルに（現時点）** — 形式化できる層にバグがなく、
  conformance linkなしの模型は`void`の失敗を再演する。段0 / 段1が空いている
- **全規範節へのid付与 + coverageゲート** — false assuranceを量産する。P1の実測が
  穴を示してから
- **dspec経由のLean/Alloy射影** — 直接書く方が桁違いに強い

## 再評価トリガ

- **（形式手法）** rigor-rsパリティが一級のprogramになった場合 — 二実装の共通審判
  として機械化仕様が資産になる。ただしまずADR-91が保留したdifferentialの
  in-repoゲート化が先
- **（形式手法）**段0のPBTでは張れない ∀ 命題が実害を出した場合
- dspecのClause ASTが型・帰納的定義・推論規則を獲得した場合(現状91行、命題論理
  断片 — 大幅な設計変更が必要)
- rigor-rsとの仕様パリティ検証が「表駆動の規範節レジストリ」を要求した場合
  (ADR-91のspelling-parity specが既にその形の萌芽。クロス実装パリティは
  レジストリの最も強い正当化理由になりうる)
- dspecが複数作者・互換性保証を獲得し、Ruby側authoring面を持った場合
