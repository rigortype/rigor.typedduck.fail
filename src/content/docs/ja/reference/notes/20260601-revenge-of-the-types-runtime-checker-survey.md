---
title: "「Revenge of the Types」(Armin Ronacher) — ランタイム × 型チェッカー横断考察"
description: "Imported from rigortype/rigor docs/notes/20260601-revenge-of-the-types-runtime-checker-survey.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260601-revenge-of-the-types-runtime-checker-survey.md"
sourcePath: "docs/notes/20260601-revenge-of-the-types-runtime-checker-survey.md"
sourceSha: "a9aeca94487d27fc96ccc09b315fc708006d5a78be979a432c4b3c8bbfc12aef"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
sourceDate: "2026-06-01T22:49:16+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266601
---

Date: 2026-06-01.

Status: **research note, no design commitments.**

種別: 外部論説の横断レビュー(Ruby/PHP/Python/JavaScriptランタイム ×
Rigor/PHPStan/TypeScript/Python型チェッカー)。
三部作（外部論説 × 既存言語への型後付け）:
- [20260601-type-system-poem-rigor-review.md](../20260601-type-system-poem-rigor-review/)（myuon「型システムポエム」）
- 本ノート（Armin Ronacher「Revenge of the Types」）
- [20260601-gradual-typing-era-mizchi-rigor-ts-review.md](../20260601-gradual-typing-era-mizchi-rigor-ts-review/)（mizchi「漸進的型付け言語の時代に必要なもの」）

## 対象論説

- Armin Ronacher「Revenge of the Types」（2014-08-24）
- 出典URL: <https://lucumr.pocoo.org/2014/8/24/revenge-of-the-types/>

動的型付け（Python/Flask）畑の著者が、Rust/Haskell/Swift期を経て静的型の
価値を再評価していく論考。核は抽象論ではなく**str/bytes（テキスト/バイナリ）
の統合問題**という具体例にある。本ノートはこれを背骨に、ランタイム4種 ×
型チェッカー4種が各論点に何を「答えているか」を軸別に突き合わせる。

## 0. 整理の枠組みと結論（先出し）

記事の主張を実務的な問いに割ると概ね6軸（A〜F）。組織化テーゼ:

> **型チェッカーが「答えられる」上限は、その下のランタイムの型設計で決まる**。
> チェッカーはランタイムが作っていない区別を後付けで作るのが原理的に苦手で、
> Arminの「str/bytes混乱は言語/ランタイムの設計問題で、型を後付けしても
> 直らない」は正しい。
> そして記事最大の懸念（=静的型は柔軟な動的APIを表現不能にする）に対し、
> 現代のgradualチェッカー群は**「Haskellにならないこと」と「引数値に依存
> する戻り値型のような小さな依存型もどき機能を後から生やすこと」**で答えた。

## A. str/bytesの統合問題（記事の背骨）

ランタイム間の差が最も鋭い軸。チェッカーはランタイムの区別をなぞるだけ
なので、ランタイム設計がそのままチェッカーの天井になる。

| | ランタイムの設計 | チェッカーの答え |
| --- | --- | --- |
| Python | Py2はstr/unicodeを混同 → **Py3が`bytes`/`str`を完全分離**（ランタイム側の大手術） | mypy/pyrightが別型として追跡・narrowing。**最もきれいな「答え」**: 重い区別をランタイムが先にやり、チェッカーは強制するだけ |
| JavaScript | 文字列はUTF-16テキスト、バイナリは`Uint8Array`/`Buffer`で別物 | TypeScriptが`string` vs `Uint8Array`を別型に。Py3に近い「区別済み」型 |
| PHP | 文字列は**バイト列そのもの**。テキスト/バイナリの区別が言語に無い（`mb_*`で迂回） | PHPStanも区別を作れない。代わりに`non-empty-string`/`numeric-string`/`literal-string`の**直交する精緻化**へ逃げる（SQLi対策の`literal-string`が好例） |
| Ruby | Stringは**バイト列+encoding属性**を1オブジェクトに同居。encodingは**型でなくランタイム属性**（`force_encoding`で動的に変化） | RBSにもRigorにもencodingの区別は無い。**Ruby/RigorはPy2モデルのまま**で核心例に答えられていない。Rigorの精緻化は`non-empty-string`/`positive-int`（PHPStanと語彙一致）だが、これは長さ/符号の軸でバイト/テキスト軸ではない |

**示唆**: 核心への回答力は**Python3 ≈ JS/TS > PHP/PHPStan > Ruby/Rigor**。
これはRigorの優劣ではなく**RubyのString設計(encodingをオブジェクト
属性化)が天井を決めている**。Rigorがencodingを型に持ち込むには、
ランタイムが区別しない概念をrefinementで人工的に作る必要があり、
**false-positive規律（動くコードを脅かすな）と正面衝突する**。だから採らない。
これは記事の「後付けでは直らない」を裏側から実証している。

## B. 型推論vs注釈の負担（記事がRustを絶賛）

- **TypeScript**: 強力な局所推論 + 構造的型付け + `any`でのgradual退避。
  2014年に記事が予感した着地点をほぼそのまま実現した勝者。
- **Rigor**: **推論ファースト + アプリ本体に独自型DSLを入れない**
  （ADR-0 "AI-Native Purity"）。「型を書かせるな」を最も極端に体現。足りない
  所だけRBSを**ソースの外**に置く。ArminがPEP 484の**構文内**注釈を警戒
  したのに対し、Rigor/RBSは構文外で彼の好みに最も近い。
- **PHPStan**: PHPネイティブ型宣言は部分的なのでphpdoc + 推論でジェネリク
  スまで補う層。
- **Python (mypy/pyright)**: pyrightは推論が強いがmypyは注釈駆動寄り。
  PEP 484注釈は**言語構文の中** = Arminが名指しで警戒した形。

回答力（書かせない純度）: **Rigor > TypeScript > pyright > PHPStan > mypy**
（Rigorは単一言語特化で純度を上げやすいハンデ込み）。

## C. 直和型/null/Option（静的型の最大の利得=全ケース強制）

- **TypeScript**: union + `strictNullChecks` + 判別可能union + `never`網羅
  検査。ベストインクラス。
- **Rigor**: union + 三値certainty(yes/no/**maybe**)+ narrowing + `T | nil`。
  RubyにOption型は無いが主目的の一つが**nil起因NoMethodError**。`maybe`
  を潰さない設計は「境界では正直に分からないと言う」Armin的誠実さに合う。
- **PHP/PHPStan**: PHP8ネイティブunion/nullable + PHPStan narrowing。
- **Python**: `Optional`/`Union`、pyright narrowing、3.10パターンマッチ +
  `assert_never`網羅。

→ 4チェッカーとも比較的よく答える（gradual検査が最も得意な領域）。差は
narrowing精度と網羅性検査の有無。

## D. 型がAPI設計に漏れ、柔軟な動的APIを表現不能にする（最深の懸念）

Arminの例: 引数で戻り値型が変わる/デコレータがシグネチャを変える/
Click・Werkzeug的多態APIは静的型で書けない。現代チェッカーは2段階で答えた:

1. **「Haskellにならない」= gradual + 構造的を選ぶ**。`any`/`Dynamic`/`mixed`
   を残し、表現できないAPIは型を諦めて通す。Rigorの`Dynamic[T]` +
   robustness原則（**引数は緩く**）+ false-positive規律が「API作者を縛るな」
   を最も明示的に形式化。記事の懸念への直接の答えは「安全のために柔軟性を
   殺すのをやめ、柔軟性が勝つ所では型を降ろす」というgradualの根本選択。
2. **小さな"依存型もどき"を後付け**。引数の**リテラル値**に応じ戻り値型を
   変える機能を各チェッカーが個別追加:
   - TypeScript: オーバーロード + 条件型
   - PHPStan/Psalm: 条件付き戻り値`@return ($x is true ? A : B)`
   - Python: `@overload` + `Literal`
   - **Rigor**: ADR-18 per-call-site戻り値型（`returns_from_arg:`）+ ADR-20
     条件文法。**正準例`JSON.parse(symbolize_names: true)`** — 同一メソッドが
     引数リテラルでsymbolキーhash / stringキーhashを返し分けるのを型化。
     Arminが「静的型では書けない」と言った動的APIを限定依存型で型付けした実例。

**示唆**: 「静的型は柔軟APIを殺す」は2014年の素朴な静的型には当たって
いたが、その後のチェッカーは**依存型の安全な薄切りを足して反証しつつある**。
Rigorもこの系譜にRuby側から乗る(依存型フルには踏み込まない=姉妹ノートの
「依存型は地獄」とも整合)。

## E. 「振る舞いはインタプリタ仕様でなく明確に定義されるべき」

ArminはJSの「奇抜でも明確に定義された意味論」を評価し、Python/PHP/Rubyの
「実装が仕様」を批判。

- **JS/TypeScript**: ECMAScript仕様が下にあり、TSは`==`弱変換やtruthiness
  の癖を**そのままモデル化**して警告に変える。
- **Ruby/Rigor**: Rigorは「**Rubyランタイムの振る舞いを真理の源とする**」
  （overview）と明言。Arminの理想の**裏返し** — きれいな仕様を待たず**動く
  ランタイムを仕様として受け入れ符号化**する実務的反転。
- **PHP/PHPStan**: 緩い比較をPHPStanが明示モデル化して叱る。
- **Python**: 言語リファレンス + 型は外部ツール。

→ **全チェッカーがArminと逆を行く**点が示唆的。彼は「きれいな意味論を先に
定義せよ」と言ったが、現実は「汚いランタイム意味論をリバースして型に押し込む」
で答えた。これは諦めでなく、既存言語に型を足す問題設定での唯一の現実解。

## F. 後付けは「うまく/まずく」やられたか（メタ問題・10年後の採点）

- **TypeScript = 成功の本命**。構造的・gradual・消去（ランタイム不変）・型は
  ソース外。Arminの好みに最も合致、予感が当たった代表例。
- **Ruby/Rigor = Ruby版のTypeScript賭け**。型を`.rb`の外（RBS/生成スタブ）、
  独自DSLなし、gradual、RBSへの消去、ランタイム無改変。**Arminが最も是認
  しそうな形**（言語を変えない）。
- **PHPStan/Psalm**: phpdoc + 推論、言語無改変。一方PHPは**ネイティブ・
  ランタイム強制型**も別途追加（消去せず実行時に効く別路線）。
- **Python = 二股**。PEP 484注釈は**言語構文の中**（Arminが名指し警戒した形）
  で外部ツールが検査。既定で実行時消去だが構文・文法・ツール・`get_type_hints`
  経由の実行時利用に影響 → 「Pythonを本質的に変える」懸念は**部分的に的中**。

## 総括

- **核心（str/bytes）に最もよく答えたのはPython3とJS/TS** — ただし
  チェッカーの功績でなく**ランタイムが区別を作った**から。**Ruby/Rigorは
  ここが弱く、RubyのString設計が天井を決めている**。Rigorがencodingを
  型に持ち込まないのはfalse-positive規律との衝突回避という合理判断
  （記事の「後付けでは直らない」を裏から実証）。
- **「型を書かせるな（推論）」ではRigorが最右翼**。ArminのRust賛美を
  Ruby側で最も極端に体現。
- **「静的型は柔軟APIを殺す」最深の懸念**にはgradual 4チェッカーが揃って
  「Haskellにならない + 引数依存戻り値の薄い依存型」で部分反証中。Rigorも
  ADR-18/ADR-20でこの系譜に乗る。
- **「きれいな意味論を先に」のメタ理想には全員が逆**を行き、汚いランタイムを
  なぞって型に押し込む路線で答えた。既存言語への型後付け問題の現実解。
- **Rigorの立ち位置**: 「型をソース外に置くTypeScript流のRuby版」で、
  Arminが後付け型に求めた条件（言語不変・推論優先・gradual）を最も素直に
  満たす一方、**看板問題（str/bytes）だけはRubyランタイムの制約で構造的に
  解けていない。**誠実な要約は「**Arminの"やり方"の懸念には最もよく答え、
  "その言語固有の型の作りの悪さ"の懸念には答えられない**(後者はランタイム
  設計に由来し、チェッカーの管轄外)」。
