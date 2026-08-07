---
title: "標準ライブラリ決定論的モジュール関数カバレッジ"
description: "rigortype/rigor docs/notes/20260522-stdlib-deterministic-module-coverage.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260522-stdlib-deterministic-module-coverage.md"
sourcePath: "docs/notes/20260522-stdlib-deterministic-module-coverage.md"
sourceSha: "e824c07ab2f7ae5b83af23c82077b2f8b81206f717fcd39a672ddbff1c2bc924"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
translationStatus: "translated"
sidebar:
  order: 20266522
---

2026-05-22生成。`Math.methods - Module.methods`等から各モジュールの公開関数を洗い出し、  
`Constant[T]`または精度精緻化（`non-empty-string`等のRefinement）が得られる関数を分類する。

---

## 凡例

| 記号 | 意味 |
|------|------|
| ✅ | 実装済み |
| 🔲 | 未実装だが`Constant[T]`またはRefinementに折りたためる価値あり |
| 🔷 | 別ティア処理済み（RBS等で十分） |
| 🚫 | 非対象（副作用・非決定的・型精度向上がnegligible） |

---

## 実装アーキテクチャ上の前提

現行`ConstantFolding`の`invoke_unary` / `invoke_binary`は**インスタンスメソッド受信者**を対象とする。  
`Math.sqrt(4.0)`のようなモジュール関数呼び出しは受信者が`Math`モジュールオブジェクト（シングルトン）であり、  
現状は未処理（`CATALOG_BY_CLASS`に`Math`が存在しない）。

**推奨実装方針（実装時に決定）:**

```
Option A: ConstantFolding に try_fold_module_function を追加し、
          受信者型が Math / Shellwords / CGI / URI の singleton であることを
          receiver_type.class_name で認識 → 専用 invoke ハンドラで実際に評価

Option B: 新規 ModuleFunctionFolding ティアを MethodDispatcher に挿入
          （ConstantFolding と同列の独立ファイル）

Option A が低コスト。関数数が増えたら Option B に昇格を検討。
```

受信者型認識の課題: Rigorが`Math`定数を`Type::Nominal["Math"]`として解決するか  
`Type::Constant[Math module object]`として解決するかは既存のsingleton型処理（`Random.rand`など  
`CATALOG_BY_CLASS`に含まれるRandomに対するインスタンス/クラスメソッド分岐）を参照して確認が必要。

---

## 1. Math

`Math.methods - Module.methods` → 28関数（Ruby 4.0.5）。  
全て`Constant[Float]`または`Tuple[Constant[Float], Constant[Integer]]`へ折りたためる。

**2026-08-05再監査**（本スライス）: `docs/CURRENT_WORK.md`は本節を「次の未監査」として挙げていたが、
`MathFolding`（`lib/rigor/inference/method_dispatcher/math_folding.rb`）はすでに28関数すべてを
カバーしている —— `MATH_UNARY`（22）+ `MATH_BINARY`（`atan2`/`hypot`/`ldexp`）+
`MATH_TUPLE_UNARY`（`frexp`/`lgamma`）+ 可変長`log`ハンドラ = 28。テーブルを信用せず、
スクラッチのフィクスチャに対して`rigor type-of`で実際に再プローブした（`Math.gamma(5.0)` → `24.0`、
`Math.lgamma(-0.5)` → `[1.2655121234846454, -1]`、`Math.atan2`/`erf`/`tanh`はいずれも厳密な
`Constant[Float]`）。古い記述はなく、1行も変わらなかった。本節は#121 P3の4スライスが始まる前に
すでに完全実装されていた（`a73aac2f`、PR #268より前）—— ハンドオフの「未監査」ラベル自体が
未検証だった。下の2件のRefinementフォローアップは意図的に見送られたままであり、欠落ではない:
Math引数がコンパイル時定数のとき、foldはすでに*厳密な*値を返しており、それは
`positive-float` / `non-negative-float`のレンジタグより厳密に精密である;非定数引数のケースに
タグを付けるのは別の、未実装のディスパッチ経路であってUNARY/BINARY集合への追加ではないので、
実需要に当たったセッションに委ねる。

### 1-1. メソッド一覧

| メソッド | シグネチャ | 返却型 | 状態 | 備考 |
|----------|-----------|--------|------|------|
| `acos(x)` | Float → Float | `[0, π]` Float | ✅ | ドメイン外（`\|x\| > 1`）でDomainError |
| `acosh(x)` | Float → Float | Float ≥ 0 | ✅ | ドメイン外（`x < 1`）でDomainError |
| `asin(x)` | Float → Float | `[-π/2, π/2]` Float | ✅ | |
| `asinh(x)` | Float → Float | Float | ✅ | |
| `atan(x)` | Float → Float | `(-π/2, π/2)` Float | ✅ | |
| `atan2(y, x)` | Float, Float → Float | `(-π, π]` Float | ✅ | 2引数。`y`/`x`ゼロの符号注意。 |
| `atanh(x)` | Float → Float | Float | ✅ | ドメイン外（`\|x\| ≥ 1`）でDomainError |
| `cbrt(x)` | Float → Float | Float | ✅ | 負の実数にも対応（`(-8)***(1/3.0)`とは異なる） |
| `cos(x)` | Float → Float | `[-1, 1]` Float | ✅ | |
| `cosh(x)` | Float → Float | Float ≥ 1 | ✅ | |
| `erf(x)` | Float → Float | `(-1, 1)` Float | ✅ | 誤差関数 |
| `erfc(x)` | Float → Float | `(0, 2)` Float | ✅ | 相補誤差関数 |
| `exp(x)` | Float → Float | Float > 0 | ✅ | Refinement: `positive-float`付与可能 |
| `expm1(x)` | Float → Float | Float > -1 | ✅ | `exp(x) - 1`（小さなxで精度良好） |
| `frexp(x)` | Float → [Float, Integer] | `Tuple[Float, Integer]` | ✅ | 仮数・指数分解。返値がTuple。 |
| `gamma(x)` | Float → Float | Float | ✅ | ドメイン外（`x ≤ 0`の整数）でDomainError |
| `hypot(x, y)` | Float, Float → Float | Float ≥ 0 | ✅ | Refinement: `non-negative-float` |
| `ldexp(f, e)` | Float, Integer → Float | Float | ✅ | 仮数・指数からFloat再構成 |
| `lgamma(x)` | Float → [Float, Integer] | `Tuple[Float, Constant[1\|-1]]` | ✅ | 対数ガンマ + 符号。Tuple返却。 |
| `log(x)` | Float → Float | Float | ✅ | ドメイン外（`x ≤ 0`）でDomainError |
| `log(x, base)` | Float, Float → Float | Float | ✅ | 2引数形式別ハンドラ要 |
| `log10(x)` | Float → Float | Float | ✅ | |
| `log1p(x)` | Float → Float | Float | ✅ | `log(1+x)`（小さなxで精度良好） |
| `log2(x)` | Float → Float | Float | ✅ | |
| `sin(x)` | Float → Float | `[-1, 1]` Float | ✅ | |
| `sinh(x)` | Float → Float | Float | ✅ | |
| `sqrt(x)` | Float → Float | Float ≥ 0 | ✅ | ドメイン外（`x < 0`）でDomainError。Refinement: `non-negative-float` |
| `tan(x)` | Float → Float | Float | ✅ | |
| `tanh(x)` | Float → Float | `(-1, 1)` Float | ✅ | |

**Math定数:**
- `Math::E` → `Constant[2.718281828459045]` — 定数解決（メソッド畳み込みではない）。本スライス対象外。
- `Math::PI` → `Constant[3.141592653589793]` — 同上。定数キャリアの課題として別途。

### 1-2. 実装チェックリスト

```
前提:
[x] Math シングルトン受信者の認識方法を確認（Type::Singleton, class_name == "Math"）
[x] MathFolding モジュール（Tier D。option B — 独立 *_folding.rb ファイル）

高優先度（頻用・返値が単純 Float）:
[x] sqrt    → Constant[Float]
[x] exp     → Constant[Float]
[x] log     → Constant[Float]（1/2 引数の可変長）
[x] log2    → Constant[Float]
[x] log10   → Constant[Float]
[x] sin / cos / tan → Constant[Float]

中優先度（2 引数または特殊返値）:
[x] atan2   → Constant[Float]
[x] hypot   → Constant[Float]
[x] ldexp   → Constant[Float]
[x] frexp   → Tuple[Constant[Float], Constant[Integer]]
[x] lgamma  → Tuple[Constant[Float], Constant[Integer]]

低優先度（ニッチな数値解析用途）:
[x] erf / erfc / expm1 / log1p / cbrt
[x] acos / asin / atan / acosh / asinh / atanh
[x] cosh / sinh / tanh / gamma

Refinement 追加（値の範囲が分かる場合）— 今回は対象外:
[ ] exp → positive-float
[ ] sqrt / hypot → non-negative-float
```

実装ファイル: `lib/rigor/inference/method_dispatcher/math_folding.rb`（`ShellwordsFolding`パターンのTier Dモジュール。`dispatch_stdlib_module_tiers`に配線）。Refinement付与（`positive-float` / `non-negative-float`）は需要が出たときのfollow-up。

---

## 2. Shellwords

`Shellwords.methods - Module.methods` → 7メソッド（実体3関数 + エイリアス）。

**2026-08-05再監査**（本スライス）: 同じくハンドオフで「次の未監査」として挙げられていたが、
こちらもすでに完全実装されていた —— `ShellwordsFolding`
（`lib/rigor/inference/method_dispatcher/shellwords_folding.rb`、`19c3e5bc`、#121 P3の最初の
スライスよりさらに前）が7つの綴りすべてをカバーしており、`ConstantFolding`の
`STRING_ARRAY_UNARY`経路経由の`String#shellescape` / `String#shellsplit`という
インスタンスメソッド版の双子も含む。テーブルを信用せず`rigor type-of`で実際に再プローブした
（`Shellwords.escape("a b")` → `"a\\ b"`、`Shellwords.join(["a", "b c"])` → `"a b\\ c"`、
`Shellwords.split("a 'b c'")` → `["a", "b c"]`）。古い記述はなく、1行も変わらなかった。

| メソッド | エイリアス | シグネチャ | 返却型 | 状態 | 備考 |
|----------|-----------|-----------|--------|------|------|
| `escape(str)` | `shellescape` | String → String | `Constant[String]` | ✅ | `ShellwordsFolding`実装済み。`""`入力でも`"''"`を返すため常に非空。 |
| `split(line)` | `shellsplit`, `shellwords` | String → Array[String] | `Tuple[Constant[String]…]` | ✅ | `ShellwordsFolding`実装済み。不正クォートはnilを返しRBSに委譲。 |
| `join(array)` | `shelljoin` | Array[String] → String | `Constant[String]` | ✅ | `ShellwordsFolding`実装済み。`Tuple[Constant[String]…]`引数時のみ。 |

### 2-1. 実装チェックリスト

```
高優先度:
[x] escape / shellescape → Constant[String] (Constant[String] 引数時)
[x] split / shellsplit / shellwords → Tuple[Constant[String]…] (Constant[String] 引数時)
[x] join / shelljoin → Constant[String] (Tuple[Constant[String]…] 引数時)
```

実装ファイル: `lib/rigor/inference/method_dispatcher/shellwords_folding.rb`（`ShellwordsFolding`モジュール）。  
`dispatch_precise_tiers`の`FileFolding`直後に接続。  
`Singleton["Shellwords"]`受信者を`dispatch_target?`で検出し、`Shellwords.escape` / `.split` / `.join`をinference時に直接呼び出す。

---

## 3. Regexp（クラスメソッド）

`Regexp.methods - Class.methods` → `:compile, :escape, :last_match, :linear_time?, :quote, :timeout, :timeout=, :try_convert, :union`

**2026-08-05突き合わせ**（本スライス）: 以下の各行は、`master`上の
`lib/rigor/inference/method_dispatcher/regexp_folding.rb`に対して`rigor type-of`で経験的に
再プローブした —— テーブルもソースも、単独では信用しなかった。2行が「ドキュメントの過少報告」の
方向で古くなっており（`escape` / `quote`がすでに畳まれているのに🔲）、1行が「ドキュメントの
誤分類」の方向で古くなっていた（`last_match`が🚫（対象外）だが、実在するナローイングベースの
foldがある）。両方向とも修正済み。`union`と`linear_time?`は実際の欠落であることを確認し
（全定数の呼び出しサイトで広い`Regexp` / `bool`）、本スライスで閉じた。

| メソッド | シグネチャ | 返却型 | 状態 | 備考 |
|----------|-----------|--------|------|------|
| `escape(str)` | String → String | `Constant[String]` | ✅ | `RegexpFolding#fold_escape`（`REGEXP_ESCAPE_METHODS`）。ドキュメントが 🔲 のまま古くなっていた — 実装は既に存在（2026-08-05訂正）。 |
| `quote(str)` | String → String | `Constant[String]` | ✅ | `escape`の別名。同一ハンドラを共有。ドキュメントが 🔲 のまま古くなっていた（2026-08-05訂正）。 |
| `compile(pattern)` | String → Regexp | `Constant[Regexp]` | ✅ | `Regexp.new`別名（`rb_reg_s_new`同一Cエントリポイント）。`RegexpFolding::REGEXP_NEW_METHODS`に`:compile`を追加し`fold_new`を共有（#121 P3）。 |
| `union(*patterns)` / `union(array)` | String\|Regexp… → Regexp | `Constant[Regexp]` | ✅ | `RegexpFolding#fold_union`。可変引数・単一配列引数・既存Regexp要素・0引数（`/(?!)/`）のいずれも実`Regexp.union`へ委譲してRubyの挙動をそのまま再現（2026-08-05, #121 P3）。 |
| `last_match` | → MatchData? | `MatchData` / `String` / `String?` | ✅ | グローバル`$~`依存だが、証明済みマッチ辺（`Narrowing#regex_match_predicate_scopes`がnarrowしたscope）では`RegexpFolding#fold_last_match`が非nil `MatchData` / キャプチャ群の`String`へ絞り込む。証明されない辺ではRBSの`MatchData?`に委譲。単純な定数畳み込みではなくnarrowingベースなので純粋な「引数が定数なら畳み込む」パターンとは異なるが、実装は存在する — ドキュメントが 🚫（対象外）のまま古くなっていた（2026-08-05訂正）。 |
| `linear_time?(pattern)` | String\|Regexp → bool | `Constant[bool]` | ✅ | `RegexpFolding#fold_linear_time`。第2引数（`timeout:`キーワードがpositional slotに落ちるケース）がある場合は明示的にRBSへ委譲（2026-08-05, #121 P3）。 |
| `timeout` / `timeout=` | — | — | 🚫 | グローバル設定の読み書き。副作用 / 実行時状態で畳み込み対象外。 |
| `try_convert(obj)` | Object → Regexp? | — | 🚫 | ダックタイプ変換（`to_regexp`等）。任意オブジェクトを受理するため静的に判定不能。 |

### 3-1. 実装チェックリスト

```
高優先度:
[x] escape / quote → Constant[String] (Constant[String] 引数時) — 既存実装、ドキュメントのみ訂正（2026-08-05）

低優先度:
[x] compile      → Constant[Regexp] (Constant[String] 引数時) — #121 P3
[x] union        → Constant[Regexp] (全要素が Constant[String|Regexp] 時、0 引数含む) — #121 P3 (2026-08-05)
[x] linear_time? → Constant[bool] (Constant[String|Regexp] 単一引数時) — #121 P3 (2026-08-05)
[x] last_match   → 証明済みマッチ辺での narrowing、既存実装。ドキュメントのみ訂正（2026-08-05）
```

---

## 4. CGI（エスケープ / アンエスケープ系）

`CGI.methods - Module.methods` → エスケープ関係16メソッド（実体4機能 + CamelCase / snake_case / エイリアス）。

**2026-08-05突き合わせ**: 以下の各行はすべて古くなっていた —— 8行すべてが🔲とされていたが、
`lib/rigor/inference/method_dispatcher/cgi_folding.rb`（`CGIFolding`。本節が当初提案した
`constant_folding.rb`とは別の、ティアDのモジュール）がすでにそのすべてを畳んでおり、
`rigor type-of`で経験的に確認した（`CGI.escape("hello world")` → `Constant["hello+world"]`、
`CGI.escapeElement("<BR><A HREF=\"url\"></A>", "A", "IMG")` →
`Constant["<BR>&lt;A HREF=&quot;url&quot;&gt;&lt;/A&gt;"]`など —— 8形式すべてを確認）。
本節はこれで完了であり、CGI関連でキューに残っている作業はない。

**2026-08-05独立再確認**（本スライスの後半）: すぐ上の突き合わせが同日に着地したにもかかわらず、
ハンドオフは依然として「CGIの行」を未監査として挙げていた —— テーブルも先の注記も信用せず、
あらためて再プローブした。`CGI.escapeElement("<BR><A HREF=\"url\"></A>", "A", "IMG")`は
厳密にエスケープされた`Constant[String]`になり、それを`CGI.unescapeElement(..., "A", "IMG")`へ
通すと元のリテラルへラウンドトリップする —— 最初の突き合わせの注記が名指ししていなかった
要素引数の経路（`fold_cgi_element`）を確認できた。`CGI.unescape`・`CGI.escapeURIComponent` /
`unescapeURIComponent`も厳密であることを再確認した。1行も変わらなかった。

| 機能 | CamelCase | snake_case | エイリアス | 返却型 | 状態 |
|------|-----------|-----------|-----------|--------|------|
| URLエスケープ | `CGI.escape` | — | — | `Constant[String]` | ✅ |
| URLアンエスケープ | `CGI.unescape` | — | — | `Constant[String]` | ✅ |
| HTMLエスケープ | `CGI.escapeHTML` | `CGI.escape_html` | `CGI.h` | `Constant[String]` | ✅ |
| HTMLアンエスケープ | `CGI.unescapeHTML` | `CGI.unescape_html` | — | `Constant[String]` | ✅ |
| 要素エスケープ | `CGI.escapeElement` | `CGI.escape_element` | — | `Constant[String]` | ✅ |
| 要素アンエスケープ | `CGI.unescapeElement` | `CGI.unescape_element` | — | `Constant[String]` | ✅ |
| URIコンポーネントエスケープ | `CGI.escapeURIComponent` | `CGI.escape_uri_component` | — | `Constant[String]` | ✅ |
| URIコンポーネントアンエスケープ | `CGI.unescapeURIComponent` | `CGI.unescape_uri_component` | — | `Constant[String]` | ✅ |

### 4-1. 実装チェックリスト

```
[x] escapeHTML / escape_html / h                  → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] unescapeHTML / unescape_html                  → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] escape (URL) / unescape (URL)                 → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] escapeURIComponent / escape_uri_component     → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] unescapeURIComponent / unescape_uri_component → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] escapeElement / escape_element                → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] unescapeElement / unescape_element            → Constant[String] — ドキュメントのみ訂正（2026-08-05）
```

実装ファイル: `lib/rigor/inference/method_dispatcher/cgi_folding.rb`（`CGIFolding`モジュール、
Tier D）。エイリアスは`fold_cgi_call` / `fold_cgi_element`の2ハンドラに集約。
テスト: `spec/integration/fixtures/module_function_folding/demo.rb` +
`type_construction_spec.rb`「fixtures/module_function_folding.rb」ブロック。

---

## 5. URI（エンコード / デコード系）

`URI.methods - Module.methods` → 16メソッド。精度向上対象はencode/decode系のみ。

**2026-08-05突き合わせ**: componentのencode/decodeの4行が古くなっていた ——
`lib/rigor/inference/method_dispatcher/uri_folding.rb`（`URIFolding`、ティアD）がすでに4つとも
畳んでいるのに🔲とされていた。`rigor type-of`で経験的に確認済み。残りの行（`encode_www_form` /
`decode_www_form` / `parse` / `join` / `extract`）は再確認の結果、本物のまだ開いている欠落だった。

**2026-08-05フォローアップ**: `encode_www_form` / `decode_www_form`は実装済みになった（#121）。
`parse`と`join`は🔲 → 🚫へ再分類した: これらは保留中の作業ではなく、このリポジトリ自身のルールに
よりこのカテゴリーの対象外である。URIオブジェクトには`Constant[…]`表現がなく、唯一本当に価値のある
一手（`parse`の10アームの戻り値ユニオンを、定数文字列が選ぶschemeクラスへ絞る）は今日は発火しない
診断を表面化させうる —— つまりbucket-3 / P0であって、FPセーフなfoldではない。その後`extract`も
実装されたので、**URI節はこれで全行分類済み**である: 各行は✅・🔷・🚫のいずれかであり、
保留中のものはない。

| メソッド | シグネチャ | 返却型 | 状態 | 備考 |
|----------|-----------|--------|------|------|
| `encode_www_form_component(str)` | String → String | `Constant[String]` | ✅ | RFC 3986パーセントエンコード。ドキュメントのみ訂正（2026-08-05）。 |
| `decode_www_form_component(str)` | String → String | `Constant[String]` | ✅ | ドキュメントのみ訂正（2026-08-05）。 |
| `encode_uri_component(str)` | String → String | `Constant[String]` | ✅ | Ruby 3.2+。ドキュメントのみ訂正（2026-08-05）。 |
| `decode_uri_component(str)` | String → String | `Constant[String]` | ✅ | ドキュメントのみ訂正（2026-08-05）。 |
| `encode_www_form(arr)` | Array/Hash → String | `Constant[String]` | ✅ | Tuple（`[k, v]`のTuple列）または閉じたHashShapeの全要素がConstantのとき折りたたむ。64ペア上限（#121, 2026-08-05）。 |
| `decode_www_form(str)` | String → Array | `Tuple[Tuple[Str,Str]…]` | ✅ | Constant[String] 引数を精密Tupleに持ち上げる（#121, 2026-08-05）。 |
| `parse(str)` | String → URI | URIオブジェクト | 🚫 | **カテゴリー外**（🔲 ではない）。`URI::Generic`系は`ConstantFolding::FOLDABLE_CONSTANT_CLASSES`に無いため`Constant[URI]`は作れない。10アームの返却unionをschemeクラスへ絞る案は精度上の利得はあるが、gradually-validなdispatchを精密化して新規診断をsurfaceし得る = bucket-3/P0であり、FP-safe foldカテゴリー（#121）の範囲外。 |
| `join(base, *paths)` | String… → URI | URIオブジェクト | 🚫 | `parse`と同じ理由（URIオブジェクトにConstantが無い）。 |
| `extract(str)` | String → Array[String] | `Tuple[Constant[String]…]` | ✅ | 1引数形式のみ折りたたむ。第2引数（schemaフィルタ）は辞退。Rubyのobsolete警告はfold内で抑止（#121, 2026-08-05）。 |
| `split(str)` | String → Array[String?] | — | 🔷 | RBS `Array[String?]`で十分。 |
| `for(scheme, …)` | — | URI | 🚫 | オブジェクト生成。 |
| `regexp` / `scheme_list` etc. | — | — | 🚫 | 設定 / メタ情報。 |

### 5-1. 実装チェックリスト

```
高優先度:
[x] encode_www_form_component → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] decode_www_form_component → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] encode_uri_component      → Constant[String] — ドキュメントのみ訂正（2026-08-05）
[x] decode_uri_component      → Constant[String] — ドキュメントのみ訂正（2026-08-05）

中優先度:
[x] encode_www_form → Constant[String] (Tuple / HashShape 引数時) — 実装済み（#121, 2026-08-05）
[x] decode_www_form → Tuple[Tuple[Constant[String], Constant[String]]…] — 実装済み（#121, 2026-08-05）
```

チェックリストがテーブル本体の ✅ と食い違っていた（2026-08-05訂正、本スライス）。

実装ファイル: `lib/rigor/inference/method_dispatcher/uri_folding.rb`（`URIFolding`モジュール、Tier
D）。テスト: `spec/integration/fixtures/module_function_folding/demo.rb` +
`type_construction_spec.rb`「fixtures/module_function_folding.rb」ブロック。

---

## 6. Base64 / Digestの扱いについて

これら2モジュールは**計算自体は決定論的**だが、精度向上の実益が薄いため  
非決定論的グループ文書（`20260522-stdlib-nondeterministic-module-coverage.md`）に収録した。

| モジュール | 理由 |
|-----------|------|
| **Base64** | `encode64("hello")` → `"aGVsbG8=\n"`は確かに定数。しかし実用コードでBase64を定数リテラルに折りたたむ場面はほぼない。返値型は常に`String`でありRBSが十分。Refinement `non-empty-string`は追加可能だが効果が小さい。 |
| **Digest** | `MD5.hexdigest("foo")` → 32文字hex文字列。定数折りたたみで実際のハッシュ値が得られても静的解析上の用途がない。返値型`String`はRBS済み。hex文字列専用Refinement（`hex-string`）を追加する場合は決定論グループへ昇格を検討。 |

---

## 優先度サマリー

| 優先度 | モジュール・メソッド | 期待する精度向上 |
|--------|---------------------|-----------------|
| ✅ 済 | `Regexp.escape` / `quote` | `Constant[String]`（ドキュメントのみ2026-08-05訂正、実装は既存） |
| ✅ 済 | `Shellwords.escape` / `shellescape` / `split` / `shellsplit` / `join` / `shelljoin` | `Constant[String]` / `Tuple[Constant[String]…]` |
| ✅ 済 | `CGI.escapeHTML` / `h` / 全8系統（`CGIFolding`） | `Constant[String]`（ドキュメントのみ2026-08-05訂正、実装は既存） |
| ✅ 済 | `URI.encode_www_form_component` / `decode_www_form_component` / `encode_uri_component` / `decode_uri_component` | `Constant[String]`（ドキュメントのみ2026-08-05訂正、実装は既存） |
| ✅ 済 | `Math.sqrt` / `exp` / `log` / `sin` / `cos`ほか | `Constant[Float]` |
| ✅ 済 | `Math.atan2` / `hypot` / `frexp` / `lgamma` | `Constant[Float]` / `Tuple` |
| ✅ 済 | `CGI.escape` / `unescape` (URL) | `Constant[String]`（ドキュメントのみ2026-08-05訂正、実装は既存） |
| ✅ 済 | Math全28関数（`MathFolding`） | `Constant[Float]` / `Tuple` |
| ✅ 済 | `URI.encode_www_form` / `decode_www_form` / `extract` | `Constant[String]` / 精密Tuple（#121 P3, 2026-08-05）。URI節はこれで全行分類済み |
| ✅ 済 | `Regexp.union` / `linear_time?` | `Constant[Regexp]` / `Constant[bool]`（#121 P3, 2026-08-05） |
| ✅ 済 | `Regexp.last_match` | 証明済みマッチ辺でのnarrowing（ドキュメントのみ2026-08-05訂正、実装は既存） |

**2026-08-05、本スライス**: `docs/CURRENT_WORK.md`はShellwords + Math/CGIを指す古い
「次の未監査」ポインタを持ち越していた。両者とも再監査し（テーブルから読むのではなく
`rigor type-of`で実際にプローブした —— 上のMath節とShellwords節はそれぞれ自前の監査注記を
持つようになった）、両者ともすでに完全実装されており、#121 P3の最初のスライスよりも前だった。
この文書のどこにも🔲は残っていない —— Math・Shellwords・Regexp・CGI・URIのすべての行が
✅・🔷・🚫のいずれかである。これは、キューに積まれた作業の記述がすでに存在するものを
過少報告していた、このリポジトリで5件目の確認済み事例である（他の4件は`docs/CURRENT_WORK.md`の
「What these sessions learned」を参照）;本物の欠落が見つからなかったので、本スライスに
コード変更は伴わない。
