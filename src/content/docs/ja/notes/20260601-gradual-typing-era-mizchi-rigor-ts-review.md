---
title: "「漸進的型付け言語の時代に必要なもの」(mizchi) — Rigor / TypeScript 観点考察"
description: "Imported from rigortype/rigor docs/notes/20260601-gradual-typing-era-mizchi-rigor-ts-review.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260601-gradual-typing-era-mizchi-rigor-ts-review.md"
sourcePath: "docs/notes/20260601-gradual-typing-era-mizchi-rigor-ts-review.md"
sourceSha: "127fc561e29d6d7b2630ce0699180e19922fe79dc9ab89c8b6a1f41cfefc27e7"
sourceCommit: "fd78ee0a520ab7f2dfb40f13d33b4fbae93e2c69"
sourceDate: "2026-06-01T22:49:16+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266601
---

Date: 2026-06-01.

Status: **research note, no design commitments.**

種別: 外部論説のRigor / TypeScript観点レビュー。
三部作（外部論説 × 既存言語への型後付け）:
- [20260601-type-system-poem-rigor-review.md](../20260601-type-system-poem-rigor-review/)（myuon「型システムポエム」）
- [20260601-revenge-of-the-types-runtime-checker-survey.md](../20260601-revenge-of-the-types-runtime-checker-survey/)（Armin Ronacher「Revenge of the Types」）
- 本ノート（mizchi「漸進的型付け言語の時代に必要なもの」）

## 対象論説

- mizchi「漸進的型付け言語の時代に必要なもの」（2018-07-05）
- 出典URL: <https://mizchi.hatenablog.com/entry/2018/07/05/180219>

TypeScript / TypedCoffeeScriptの実体験から「これからのgradual typingに
何が要るか」を要件として書き出した実務寄り論考。**Rigor（2026, Ruby）は
この2018年要件リストの後発実装**にあたるため、「mizchiの要件をRigorが
どれだけ満たしたか / TypeScriptはどう答えたか」の三者突き合わせで読む。

## 0. 枠組みと結論（先出し）

mizchiの主張を「将来のgradual typingへの要件」R1〜R9 + 補（LSP）に割り、
TypeScript（記事の母体）とRigor（後発のRuby版）の回答を並べる。

組織化テーゼ:

> **mizchiの要件リストに対し、Rigorは「2018年に欲しいと言われたものを
> Rubyで律儀に作った」ように読める。**最大の分岐点は**「型をどこに置き、
> 表現力をどこまで許すか」。**TypeScriptは型を**ソース内**に置き表現力を
> **無制限**に伸ばした（結果、mizchiが恐れた"型パズル"が現実化）。Rigorは
> 型を**ソース外**に置き表現力を**予算で頭打ち**にした(パズル回避、ただし
> 精度の天井は低い)。これはmizchiの「コンパイラ向けvs人間向けの区別」
> という核心問題への、TSとRigorの**正反対の解**。

## 要件別マッピング

### R1. 握りつぶし可能性（設計に組み込め）
`declare module "a"`で無視、興味のある範囲に限定 — mizchiの中核。

- **TypeScript**: `// @ts-ignore` / `@ts-nocheck` / `@ts-expect-error`(3.9)/
  `any` / `skipLibCheck` / tsconfig `exclude`。行・ファイル・プロジェクト単位。
- **Rigor**: 抑制マーカー（diagnostic-policy）+ **ADR-22ベースライン
  （`.rigor-baseline.yml`）が握りつぶしを制度化**。既存の動く状態を丸ごと採用し
  **回帰だけをsurface**。2018 TSの行単位ignoreより一段強い「0を1の苦しみ」
  緩和で、握りつぶし戦略の最もinstitutionalizedな形。
- → **Rigorが2018 TSより良く答えている**項目。

### R2. 環境で厳しさを調整できる
- **TypeScript**: tsconfigフラグ（`strict`/`strictNullChecks`/`noImplicitAny`）。
  mizchiの要望にほぼ応えた。
- **Rigor**: `.rigor.yml`の`severity_profile:`、ルール単位severity、v1の
  narrowing surfaceを意図的に絞る設計。同等に調整可能。

### R3. 「コンパイラ向け」と「人間向け」の型を区別せよ（最深の主張）
- **TypeScript**: 型は**ソース内（.ts）**で両者を兼ね、実行時消去。co-locatedな
  「ドキュメントとしての型」。
- **Rigor**: 型を**ソース外（RBS/生成スタブ）**に出し、アプリ本体に独自DSLを
  入れない（ADR-0 "AI-Native Purity"）。`.rb`を人間/AIが読むクリーンな面、
  RBSを機械契約の面に分離するという明示的回答。2018のmizchiが「人間の
  ためのドキュメント」を強調したのに対し、2026のRigorは**AI読者を一級の
  消費者**に加える（時代の延長）。
- → **トレードオフ**: mizchiが評価したのは「コードの隣にある型=ドキュメント」。
  Rigorの外部RBSはco-locationを失う。Rigorは**rbs-inline受理**
  （`#: String`等を型ソースに）で部分回収し、外部 .rbsとinlineの両建て。

### R4. 外部IO境界の処理（出口でany、内部は厳密、ラップ層）
- **TypeScript**: 標準実務。記事と同月（2018-07）のTS 3.0で**`unknown`**が
  入り「境界で受けて検証してから内へ」の原理版（zod等）へ発展。
- **Rigor**: **robustness原則が同じ形を型オーサリング側で形式化** — 引数は
  緩く（境界の寛容）/戻り値は厳しく（内部の精度）。さらに**`Dynamic[T]`は
  provenanceを持つ**ので「anyにキャスト（=由来を捨てる）」より進み、
  **「untypedだが何を知っていたかは覚えている」**。JSON.parseの
  `symbolize_names`判別 / ActiveRecord `open_receivers` / プラグインfactsが
  Ruby側のIO境界を埋める。

### R5. any = Top∧Bottomの逃げ道、守るかは自己責任
- **TypeScript**: `any`がまさにそれ（unsoundな脱出口）。
- **Rigor**: `Dynamic[T]`がgradual fallback。Tの精度と由来を運ぶラッパで
  境界で可逆（value-latticeのDynamic代数）。**ユーザがソースに書く`any` DSLは
  存在しない**（inline DSLなし）— 逃げ道はエンジン内部 + RBS `untyped`。
  「自己責任のany」の表面積をprovenanceで減らす。

### R6. 推論が動的型付けと同じ見た目に
- **TypeScript**: mizchiが「見た目上は動的型付けと同じものを書ける」と評価。
- **Rigor**: **推論ファーストをTSより極端に振る**。TSは関数境界/公開APIに
  注釈を欲しがるが、RigorはCFA + 呼び出し点合成でユーザメソッドの
  シグネチャまで推論し**ソース内注釈ゼロを目標**にする。ただし**Rubyの
  メタプログラミングはJSより推論が難しい**ので、TSなら推論で埋まる所が
  Rigorでは`Dynamic[T]`/プラグインに落ちる余地が大きい。野心は上、地形は険しい。

### R7. 型パズルの罠（表現力が裏目に出る）
mizchiが名指ししたFlow Redux connect、Generics過剰、型表現の非一意性。

- **TypeScript**: 記事直後からconditional types(2.8)/mapped/template literal
  typesが拡張され**型レベルがほぼチューリング完全化 → 型パズルが現実化**。
  `.d.ts`はパズルの代名詞に。
- **Rigor**: **意図的な学習**。false-positive規律 + 「複雑な型は`.rbs`へ、
  ソースに書かせない」+ **inference-budgets(無制限な型レベル計算を禁じる
  予算)**が型パズルの直接の抑止。ADR-20 HKTが「**lightweight**」なのも
  パズル回避が理由。**2018の教訓を取り込み表現力をわざと頭打ち**にした。
- → **代償**: combineReducers級の精度は表現できない。複雑性は**プラグイン
  （Rubyで書くエンジン側）に移す** — 難所をユーザの型パズルでなくプラグイン
  作者の仕事に。**「パズルをユーザソースからエンジンへ追い出した」**のが
  TSとの分水嶺。

### R8. ライブラリ型定義管理の地獄（DefinitelyTyped）
- **TypeScript**: `@types/*`生態系。成熟したが依然痛点、近年は自前types
  同梱が増加。
- **Rigor**: RBS生態系（gem_rbs_collection）+ プラグインcatalogue +
  **`rigor sig-gen`（手書きでなく生成）** + ADR-25プラグイン提供RBS。手は
  **「巨大な手書き型定義リポジトリでなく推論+生成に寄せる」**。sig-genの穴
  こそ価値あるシグナル、という方針。Rails等の枠組みメタプロは全ユーザが
  再導出せず保守されたプラグインが担う。

### R9. 後発言語への提言（構文予約のみ/握りつぶしを設計に/コミュニティ実装）
- **Rigorは2026年の具体的実現**。Ruby構文に**何も足さず**、RBS（外部）+
  既存rbs-inline/Steep注釈を使う。「構文予約のみ」を通り越して**予約ゼロ**で
  over-satisfy。握りつぶしはベースラインで設計済み。**mizchiの2018年
  ウィッシュリストをRubyでほぼ逐条実装した姿**。

### 補. LSP / 静的解析メタデータの重要性
mizchiが2018に強調。RigorはADR-19 `rigor lsp` + **ADR-33 `rigor mcp`
（AI消費者向け）**を備え、見越されたLSPメタデータ層に**2026年的拡張
(MCP)**を足す。

## 総括

- **R1/R2/R4/R6/R7/R9/LSP**はRigorが律儀に、時に2018 TSより良く満たす。
  Rigorは「mizchiが必要と言ったもの」のRuby版実装として読める。
- **最大の分岐はR3 + R7の解き方**:
  - TypeScript = 型を**ソース内**・表現力**無制限** → co-locationは得たが
    **型パズルが現実化**。
  - Rigor = 型を**ソース外**・表現力**予算で頭打ち** → パズル回避し`.rb`を
    クリーンに保つが**精度の天井が低く** co-locationを失う（rbs-inlineで部分回収）。
  - mizchiの「コンパイラ向け/人間向けを区別せよ」への**正反対の回答**で、
    優劣でなく賭けの違い。
- **mizchiがRigorに突っ込みそうな点**: ①外部RBSは「コードの隣の
  ドキュメント」性を弱める。②RubyのメタプロはJSより推論が難しく
  「動的と同じ見た目」の推論にTSより穴が出やすい（Dynamic/プラグイン依存増）。
- **Rigorが2018年から前進した点**: ①`Dynamic[T]` provenance(由来を捨てる
  anyからの脱却)。②ベースラインによる握りつぶしの制度化。③型パズルを
  ユーザソースからプラグインエンジンへ追い出す構造。④AI/MCPを型メタデータの
  一級消費者に。

ひとことで — **mizchiが2018年に「これからの漸進的型付けに要る」と並べた
条件をRigorは2026年のRubyで大半満たしている。ただし彼が最後まで悩んだ
「型をどこに置き表現力をどこまで許すか」だけはTypeScriptと真逆(ソース外・
予算で頭打ち)を選んでおり、それがRigorの個性であり同時に精度上限の
出どころになっている**。
