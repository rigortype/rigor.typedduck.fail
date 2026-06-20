---
title: "ADR-47 — ナローイング駆動の節到達可能性（`flow.unreachable-clause`）"
description: "rigortype/rigor docs/adr/47-narrowing-driven-clause-reachability.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/47-narrowing-driven-clause-reachability.md"
sourcePath: "docs/adr/47-narrowing-driven-clause-reachability.md"
sourceSha: "aafdb1681424e93c7aaf997a97485ee9f0795ffd5090e24794584494c6e73df5"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4047
---

ステータス: **Accepted —— WD1 + WD2 + WD3a実装済み。Rigorの既存の2つの`if`/`unless`到達可能性ルールを、フロー（flow）エンジンが既に計算しているナローイング（narrowing）を用いて`case`/`when`および`case`/`in`節に拡張する。Elixir v1.20の冗長な`case`節報告に触発されたもの;Rigorの偽陽性エンベロープ内に収まるようスコープを限定する**。

**WD1 landed（v0.1.17）**。`flow.unreachable-clause`は、`case <local>`節のクラス/モジュール定数条件（`when String` / `when MyClass`）が対象を`Type::Bot`に絞り込むときに発火する —— `scope_index`（評価器自身の節ごとの`body_scope`）から読み返すため、ルールとボディ型付けは乖離しえない。単一の`body_scope == bot`シグナルが設計で挙げる両方の形をカバーする（節ごとのdisjointnessと先行網羅の両方。網羅済みの入口スコープも`bot`に絞り込まれるため）。偽陽性エンベロープを強制: 対象は絞り込み済みのローカルでなければならず、`Dynamic`（<ruby>漸進的保証<rp>（</rp><rt>gradual guarantee</rt><rp>）</rp></ruby>）でも既に`Bot`（デッドコード）でもいけない。クラス/モジュール定数条件のみ（`when nil` / 範囲 / 正規表現 / 式は除外）、ループ/ブロック内の節はスキップ。**WD4**に従い、lenient + balanced（デフォルト）では`:info`、strictのみ`:warning`で出荷。balanced→`:warning`昇格は回帰コーパスFPゲートを待つ;Rigor自身の`lib` + `plugins` + `examples`でクリーン（ゼロ発火）。

**WD2 landed（v0.1.17）**。メッセージ精度向上 + デッドな末尾`else`。デッドな`when`はWD1の`:disjoint`表現に対して`:prior_exhaustion`（「より前の`when`で既にカバー済み」）と表現されるようになった。節に入る時点のスコープで区別する: `eval_case_when_branches`は節の最初の条件ノードにその入口`falsey_scope`を記録し（`on_enter`のみ、新しい型付けなし;`propagate`が保持）、コレクターはそのエントリーが既に対象を`bot`に絞り込んでいたかどうかで分類する。末尾の`else`で、最終的な`falsey_scope`が対象を`bot`に絞り込む場合も`:exhausted_else`としてフラグされる —— ただし防御的な`else`ボディ（むき出しの`raise` / `fail` / `throw` / `abort` / `exit`）は除く。これは意図的なガードであり、削除可能なデッドコードではないからだ（偽陽性規律のカーブアウト）。新しいナローイングなし;エンジン自身のスコープを読む。Rigor自身のコーパスでもクリーン;同じ`:info`/`:warning`の重大度姿勢。

**WD3a landed（v0.1.17）**。**裸のクラスパターンのみ**の`case`/`in`（`CaseMatchNode`）—— `in C` / `in C => x`はマッチが正確に`C === subject`（純粋な`is_a?`、分解なし）のため、`when C`と同様に健全に絞り込まれる。`eval_case_when_branches`は裸クラスの`in`を`Narrowing.case_when_scopes`にルーティングし（`bare_class_pattern_node`が`ConstantReadNode` / `ConstantPathNode`と、それをラップする`CapturePatternNode`を認識）;コレクターは同じ`body_scope == bot`シグナルで`CaseMatchNode` + `InNode`を処理する。これはその場限りの網羅性ではない —— 真偽両方のナローイングが健全な、唯一のパターン形状に限定して、既存の健全な`when`クラスナローイングを再利用する。Rigor自身のコーパスでクリーン。**WD4 run（v0.1.17）**。16のOSSコーパスをスイープ（[`docs/notes/20260605-adr47-unreachable-clause-corpus-sweep.md`](../../notes/20260605-adr47-unreachable-clause-corpus-sweep/)を参照）—— ゼロ発火、偽陽性ゼロ。ヒットなしの空虚なパス（vacuous pass）はデフォルトをより大きくする積極的根拠にはならないため、**balancedは`:info`のまま**（strictは`:warning`を維持）;昇格は実際の発火を待つ。**残り:** WD3b（分解 / 値 / 変数キャッチオールパターンの網羅性 —— ADR-36の`is_a?`網羅性隣接プロジェクトである真に大規模な作業;その場限りで推論して出荷**しない**こと;ゼロ発火スイープで優先度を下げ）。

## 動機

Elixir v1.20の型システム（[`docs/notes/20260604-elixir-v1.20-type-system-rigor-review.md`](../../notes/20260604-elixir-v1.20-type-system-rigor-review/)を参照）は、`case`節をまたいで対象（subject）の型を絞り込み、**決してマッチしない節をデッドコードとして報告する** —— これは高シグナル・低偽陽性の診断クラスだ。型が到達不能だと証明する節は、ほぼ常に本物のロジックエラー（古い`when`、順序を誤った節、分岐の下から型が移動してしまったケース）だからだ。

Rigorはこの作業の難しい半分を既に行っている。欠けているのはその上に乗る診断であり、それも`case`に対してだけだ —— `if`/`unless`は既にカバーされている。

## 現状

到達可能性ルールは2つあり、いずれも`IfNode` / `UnlessNode`に限定されている:

1. **`flow.unreachable-branch`**（v0.1.2）—— 述語が**構文上のリテラル**（`if false`、`expr if true`、…）のときだけ発火する。デッドな分岐を指す。[`check_rules.rb:1013`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules.rb)で挙げられている推論された定数による偽陽性を避けるため、意図的にリテラルのみとしている。
2. **`flow.always-truthy-condition`** —— 推論された定数版。非リテラルの述語が`Type::Constant`に畳み込まれるときに発火し、保守的なエンベロープを持つ: **ループ / ブロック内**の述語をスキップ（ミューテーション追跡が不完全なため）し、**防御的な述語呼び出し**（`nil?` / `empty?` / `zero?` / `respond_to?` / …）をスキップする —— ここでは戻り値に厳格なRBSが実際の実行時チェックと日常的に食い違う（`Module#name -> String`対 無名クラスの`nil`）。[`always_truthy_condition_collector.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/check_rules/always_truthy_condition_collector.rb)を参照。

フローエンジンは**既に`case`を絞り込んでいる**。`eval_case_when_branches`（[`statement_evaluator.rb:527`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/statement_evaluator.rb)）は`falsey_scope`アキュムレータを`when`分岐にまたいで通し、`Narrowing.case_when_scopes`（[`narrowing.rb:338`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/narrowing.rb)）は各分岐について、`body_scope`（節の真エッジによって絞り込まれた対象）と`falsey_scope`（先行するすべての節の否定の連言によって絞り込まれた対象）を返す。つまり各`when`において、*それより前の節がどれもマッチしなかったと仮定したときの*対象の型を既に計算している —— これはまさに到達可能性診断が必要とする事実だ。

2つのギャップ:

- **`case`節は到達可能性診断を一切生成しない**。ナローイングは分岐ボディの型付けにのみ消費される。
- **`in`（パターンマッチ）分岐は網羅性を追跡しない**。`branch_body_and_falsey_scopes`（[`statement_evaluator.rb:542`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/statement_evaluator.rb)）は`InNode`に対して`falsey_scope`を変更しないままにする（「保守的: まだ網羅性追跡なし」）。

## 互いに素であることのシグナル

`when C`節は、その節に入る`falsey_scope`のもとでの対象の型が`C`のマッチ型と**互いに素（disjoint、交わりが空）**であるとき到達不能だ。これはまさにElixirの`dynamic()`の*compatibility*テスト（「受理型と供給型が互いに素なときだけ違反」）であり、Rigorはそれを表現するキャリア（carrier）代数を既に持っている。

基盤（substrate）はこのシグナルを無償で与える: 入口の`falsey_scope`を節`C`の真エッジで絞り込むと、`C`がマッチしえないとき正確に、対象のローカルが**`bot`**（空の交差）になる`body_scope`が得られる。新しいdisjointness述語は不要だ —— 計算された`body_scope`内の`bot`な対象ローカルが到達不能性の証明*そのもの*だ。2つの形が導かれる:

1. **節ごとのdisjointness** —— 対象型 ∧ 節型 = `bot`（例: 対象が`Integer`に絞られた後の、後続の`when String`）。
2. **先行網羅（prior-exhaustion）** —— 節に入る`falsey_scope`が既に`bot`な対象を持つ（先行するすべての節の和が対象型をカバーした）ため、この節とそれ以降のすべてがデッドになる。

## 設計

### 新ルール: `flow.unreachable-clause`

- **発火対象:** `CaseNode` / `CaseMatchNode`内の`WhenNode`（および、ゲート付きで`InNode`）であって、計算された`body_scope`が対象ローカルを`bot`に絞り込むもの、または入口の`falsey_scope`が既に`bot`な対象を持つもの。
- **指す位置**: デッドな節の`statements`（決して実行されないボディ）—— `flow.unreachable-branch`の「デッドコードに波線」という配置をミラーする。空のボディを持つ節（有用な位置がない）はリテラルルールと同様にスキップする。
- **重大度:** `warning`、2つの`flow.*`兄弟に合わせる。`flow.unreachable-branch`と並べて[`severity_profile.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/configuration/severity_profile.rb)の3つの層（`info` / `warning` / `error`）すべてに配線する。
- **抑制**: デッド節の行に`# rigor:disable unreachable-clause`、[`rule_catalog.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/analysis/rule_catalog.rb)に登録する。

### 仕組み

ナローイングは`eval_case_when_branches`で既に計算されている;ルールは分岐ごとの`(body_scope, falsey_scope)`の組を診断パスに表出させる必要がある。`check_rules`でナローイングを再計算するよりも、**評価時に収集する**（`AlwaysTruthyConditionCollector`に類似した、対象 + 絞り込み済みスコープを与えられるコレクター）ことを優先する —— こうすればルールとボディ型付けが同一のナローイングを読み、乖離しえない。

### 偽陽性エンベロープ（継承、交渉の余地なし）

`flow.always-truthy-condition`のエンベロープをそのまま再利用する —— このルールは同じリスククラスだ:

- **対象は絞り込まれなければならない**。`case_when_scopes`は、対象が既知の型を持つ`LocalVariableReadNode`でない限り、既に入口スコープにバイルアウトする（[`narrowing.rb:364`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/narrowing.rb)）。ナローイングなし ⇒ 発火なし。これだけで大半の危険な形が除外される。
- **ループ / ブロック内をスキップ** —— 同じミューテーション追跡のギャップ。
- **防御的な形の対象 / 節をスキップ** —— エンジンがnilになりえないと信じているRBS厳格な戻り値に対して防御する`when nil`を咎めない。
- **具体的な絞り込み済みキャリアを要求する** —— `Nominal` / `Constant` / `Tuple` / 互いに素なユニオン（union、合併型とも）で発火する;`Dynamic[T]`や未解決のシェイプ（shape）では決して発火しない。`Dynamic`に対するdisjointnessは決して証明できないため、そこでは決して発火しない —— 漸進的保証が保たれる。

## 作業決定スライス

- **WD1 —— `when`のdisjointness（節ごと）**。狭く価値の高い中核: `body_scope`の対象が`bot`になる`when C`。リテラルクラスの`when`を最初に（`when String` / `when MyClass`）、`case_when_scopes`が既に認識する形。
- **WD2 —— 先行網羅のメッセージ精度向上 + デッドな`else`（landed、v0.1.17）**。デッドな`when`は`:prior_exhaustion`（「より前の`when`で既にカバー済み」）対`:disjoint`（WD1の表現）と読めるようになった。節に入る時点のスコープで区別する: `eval_case_when_branches`は節の最初の条件ノードにその入口`falsey_scope`を記録し（`record_clause_entry_scope`、`on_enter`のみで部分式が新たに型付けされることはない;`propagate`が保持）、コレクターはそのエントリーが既に対象を`bot`に絞り込んでいたかどうかで分類する。末尾の`else`で、最終的な`falsey_scope`（`else`ノードに既に記録済み）が対象を`bot`に絞り込む場合もフラグされる —— ただし防御的な`else`ボディ（むき出しの`raise` / `fail` / `throw` / `abort` / `exit`）は除く。これは意図的なガードであり、削除可能なデッドコードではない（偽陽性規律のカーブアウト）。新しいナローイングなし;エンジン自身のスコープを読む。
- **WD3a —— `in`裸クラスパターン（landed、v0.1.17）**。`in C` / `in C => x`は`C === subject`（純粋な`is_a?`、分解なし）でマッチするため、`when C`と全く同様に健全に絞り込まれる。`branch_body_and_falsey_scopes`は裸クラスの`in`を`Narrowing.case_when_scopes`にルーティングする（`bare_class_pattern_node`が`ConstantReadNode` / `ConstantPathNode`と、それをラップする`CapturePatternNode`を認識）;コレクターは同じ`body_scope == bot`シグナルで`CaseMatchNode` + `InNode`を処理する。これはその場限りの網羅性ではない —— 真偽両方のナローイングが健全な、唯一のパターン形状に限定して、既存の健全な`when`クラスナローイングを再利用する。
- **WD3b —— 分解 / 値 / 変数キャッチオールパターン（先送り）**。配列 / ハッシュ / findパターン、値パターン、`in x`キャッチオールは実際の`InNode`パターン網羅性が必要だ —— より大きく独立した精度プロジェクトだ（先送りされたADR-36の`is_a?`網羅性が隣接する）。網羅性をその場限りで推論して出荷**しない**こと;現在これらは保守的なfalsey変更なし形状を維持しているため、より前の裸クラス節が既に対象を網羅した場合にのみ発火する。
- **WD4 —— コーパスFPゲート（run、v0.1.17;balancedは`:info`のまま）**。16のOSSコーパスをスイープ（Mastodon + Redmineの`app lib`;parser、rubocop-ast、kramdown、mail、liquid、haml、hamlit、herb、slim、oj、ox、protobuf、textbringer、rglの`lib`）を`--no-cache`で —— [`docs/notes/20260605-adr47-unreachable-clause-corpus-sweep.md`](../../notes/20260605-adr47-unreachable-clause-corpus-sweep/)。**どこもゼロ発火**（GitLab FOSSは`lib`全体スコープで遅すぎるため中断、カウントなし）。ゼロヒット ⇒ 偽陽性ゼロだが、*空虚な*パスは不在証拠であり安全性の証拠ではない: トリアージする実際の発火がない状態では、デフォルトをより大きくすることが正当化されるシグナルがないため、balancedは**`:info`のまま**（strictは`:warning`を維持）。昇格は検査すべき実際のコーパス発火を待つ。保守的エンベロープがその仕事をしている —— キャッチ可能な形（具体的型を持つローカルがdisjointな / 既にカバー済みのクラスにマッチされる）はプログラマーが滅多に書かない。明らかに冗長だからだ。

## 却下 / 先送りした代替案

- **`check_rules`でナローイングを再計算する**（エンジンのスコープを再利用しない）—— 却下: 2つのナローイング経路がドリフトし、ここでの乖離は偽陽性、すなわち大罪だ（[`feedback_false_positive_discipline`]）。評価時に収集すること。
- **`Dynamic[T]`な対象で発火する** —— 却下: 漸進的（gradual）な`Dynamic`のもとではdisjointnessは決して証明できないため、そこでの発火は不健全で*かつ*偽陽性だ。これはElixirの*compatibility*ルールも引く境界だ。
- **`in`の完全なパターンマッチ網羅性** —— 独自の作業に先送り（WD3 + ADR-36の隣接）。ここではスコープ外。
- **Elixir流のstrong arrowsによる健全性** —— 追求しない。Rigorはロバストネス原則（[ADR-5](../5-robustness-principle/)）のもとで意図的に不健全だ;このルールは*証明可能な*`bot`のケースだけを報告し、そのエンベロープ内に留まる。対比のために記録する、採用はしない。

## 根拠

- [`docs/notes/20260604-elixir-v1.20-type-system-rigor-review.md`](../../notes/20260604-elixir-v1.20-type-system-rigor-review/) —— 出典の比較（§4-2）。
- [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/) —— このルールが読むナローイング / ファクト安定性の契約（contract）。
- [`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/) —— `flow.*`の分類体系 + 重大度解決。
- [ADR-36](../36-mangrove-enum-nested-class-emission/) —— WD3が依存する、先送りされた`is_a?`網羅性の作業。
