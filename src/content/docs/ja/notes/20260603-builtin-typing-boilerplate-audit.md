---
title: "組み込みメソッドの型付け — ボイラープレート／痛点の監査 — 2026-06-03"
description: "rigortype/rigor docs/notes/20260603-builtin-typing-boilerplate-audit.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260603-builtin-typing-boilerplate-audit.md"
sourcePath: "docs/notes/20260603-builtin-typing-boilerplate-audit.md"
sourceSha: "91f878079b6b417acd9012d70c9c613754b9170575c20126472085f907531c61"
sourceCommit: "37d70ab9071b4a25e954d0157818f0b6ae88e2c2"
translationStatus: "translated"
sidebar:
  order: 20266603
---

## 動機

次バージョンの内部最適化テーマ。このノートは、Rubyの組み込みメソッドに型を割り当てる
メカニズムにおける反復・ボイラープレート・手作業保守の痛点を棚卸しし、毎セッションで
地図を導出し直すことなく実装容易性の順でクリーンアップを進められるようにするものである。
所見のみ —— ここでは挙動変更は提案しない。`false-positive discipline`ルール（偽陽性
の規律）のもと、以下のクリーンアップはいずれも、畳み込み結果をビット単位で同一に保つ
コンテナのみのリファクタリングでなければならない（`make verify`で検証）。

## 3層構造の機構

1. **カタログローダー層** —— `lib/rigor/inference/builtins/*_catalog.rb`
   （20ファイル）。それぞれ、生成されたYAMLカタログ
   （`data/builtins/ruby_core/<topic>.yml`）を`MethodCatalog`シングルトンと
   キュレートされたミューテーションブロックリストでラップしている。
2. **Tier-Dシングルトン畳み込み層** ——
   `lib/rigor/inference/method_dispatcher/*_folding.rb`。純粋な標準ライブラリ
   シングルトン（CGI、URI、Shellwords、Math、Time、Regexp、Set、File）ごとに
   1モジュールがあり、`Constant`のレシーバー／引数に対して推論時に呼び出しを評価する。
3. **ディスパッチチェーン** —— `lib/rigor/inference/method_dispatcher.rb`が各tierを
   優先順位順に結線する。

各層には構造的な反復が蓄積している。所見は投資対効果（影響 ÷ リスク）の順で並べる。

## 所見1 — Tier-Dの畳み込みモジュールはコピーされた骨組み

8つの`*_folding.rb`モジュールがほぼ同一の形を複製している:

- `dispatch_target?`は**9箇所で同じ1行**:
  `receiver.is_a?(Type::Singleton) && receiver.class_name == "X"`
  （`cgi_folding.rb:74`、`uri_folding.rb:51`、`shellwords_folding.rb:81`、
  `math_folding.rb:74`、`time_folding.rb:51`、`regexp_folding.rb:42`、
  `set_folding.rb:43`、`file_folding.rb:110`。加えて`iterator_dispatch.rb:69`の
  `Class`バリアント）。
- 本体の形も反復している: `module_function`、`try_dispatch(receiver:,
  method_name:, args:)`、メソッド名の`Set`による早期リターンガード、その後
  `Type::Combinator.constant_of(Foo.public_send(method_name, str))`を
  `rescue StandardError → nil`のフロアで包む。`uri_folding.rb:43-63`と
  `cgi_folding.rb:66-90`はほぼ一字一句同一である。

**痛点**。新たな純粋シングルトン（Base64、Digest、…）の追加は60〜120行の
ボイラープレートを書くことを意味する。`rescue`フロアを忘れたり、`constant_of`の
引数を渡し間違えたりしやすい。

**方向性**。宣言テーブルで駆動する単一の`SingletonFunctionFolder` ——
`{ "URI" => %i[encode_www_form_component …], "CGI" => {…} }` —— で「単一のString
引数、`public_send`経由で畳み込む」ケースをカバーする。バリアントハンドラ
（CGIの要素エスケープ、ShellwordsのTupleリフト）はエントリー単位のオーバーライドとして
残す。8ファイル → 1ハーネス＋データ。

## 所見2 — ディスパッチチェーンは手書きの`||`ラダー

`method_dispatcher.rb:713-720`（シングルトン畳み込みチェーン）と`:697-704`
（`dispatch_precise_tiers`）は、**同じ`receiver:/method_name:/args:`のキーワード
三つ組を15回以上**反復している:

```ruby
FileFolding.try_dispatch(receiver: receiver_type, method_name: method_name, args: arg_types) ||
  ShellwordsFolding.try_dispatch(receiver: receiver_type, method_name: method_name, args: arg_types) ||
  MathFolding.try_dispatch(receiver: ...) || … # 8 entries
```

**痛点**。新たなtierとは、モジュールを書く*うえに*それをラダーへ手作業で継ぎ込む
ことを意味する。順序は重要（コメントに記載）だが、リストとして見ることができない。

**方向性**。`SINGLETON_FOLDERS = [FileFolding, ShellwordsFolding, …]`を
`SINGLETON_FOLDERS.lazy.filter_map { |m| m.try_dispatch(**ctx) }.first`で駆動する。
順序＝配列の順序。先にFinding 3を要する。

## 所見3 — エントリポイント名とシグネチャが不統一

`try_dispatch`（cgi/uri/file/math/regexp/set/shellwords/kernel/shape）
対`try_fold`（`constant_folding.rb:135`、`block_folding.rb:72`）対
`try_forward`/`try_backward`（`method_folding.rb`）。シグネチャも分岐している:
`args:`のみ／`+ block_type:`／`+ environment:, call_node:, scope:`
（`rbs_dispatch.rb:121`は`# rubocop:disable Metrics/ParameterLists`を抱えている）。

**痛点**。これがFinding 2の汎用イテレーションを阻む根本のブロッカーである。tierの
インターフェースが暗黙的なのだ。

**方向性**。純粋なtierを`try_dispatch(receiver:, method_name:, args:)`に統一する
（エイリアス移行）。コンテキストを多く要するtierは1つの`context:`オブジェクトを取り、
`ParameterLists`の抑制を引退させる。

## 所見4 — カタログローダーはボイラープレート＋3箇所編集

各`*_catalog.rb`は実質的に1ステートメントである
（`random_catalog.rb:24`、`set_catalog.rb:22`、…）:

```ruby
XXX_CATALOG = MethodCatalog.new(
  path: File.expand_path("../../../../data/builtins/ruby_core/<topic>.yml", __dir__),
  mutating_selectors: { … })
```

- `File.expand_path("../../../../data/builtins/ruby_core/…", __dir__)`
  —— この`../../../../`は**20ファイルにコピーされている**。レイアウト変更が一斉に
  全部を壊す。
- 新たなカタログは**3箇所の手作業編集**である: `require_relative`の行
  （`constant_folding.rb:4-22`）、`CATALOG_BY_CLASS`の行（`:1212-1236`）、そして
  ローダーファイルそのもの。スキャフォールドツールがこれを取り繕っているが、重複は
  構造的なものである。

**方向性**。（a）パス解決を`MethodCatalog.for_topic("set")`に畳み込み、`../../../../`を
1箇所に隔離する。（b）ローダーに自己登録させ（`MethodCatalog.register(String, "String",
topic: "string")`）、requireリストと`CATALOG_BY_CLASS`を統合する。

> ⚠️ `mutating_selectors:`のブロックリストとそのセレクタ単位のコメント
> （例: `set_catalog.rb:38-48`、`random_catalog.rb:30-53`）は**本物の設計知識であり
> ——ボイラープレートではない**。静的なC分類器がどの`:leaf`エントリーを誤って帰属させ、
> なぜそうなるのかを正確に記録している。一字一句そのまま保持し、コンテナだけを
> 薄くすること。

## 所見5 — フィクスチャエスケープ／サイズ上限／rescueフロアの手作業による再実装

`rigor-type-coverage-uplift`スキル自身が指摘したもの:

- **`assert_type`のバックスラッシュ多重エスケープ** —— フィクスチャが手作業で
  `'"hello\\\\ world"'`を数えている。すべての畳み込み結果アサーションでエラーが
  起きやすい。
- **3パラメータのハンドラ規約** —— `def h(tuple, args)`が`method_name`を黙って
  `args`に束縛してしまう。
- **サイズ上限／`rescue → nil`**がフォルダーごとに再実装されている
  （`shellwords_folding.rb`の`SPLIT_LIMIT = 64`は意図としてはConstantFoldingの
  `STRING_ARRAY_LIFT_LIMIT`を映したものだが、別個の定数になっている）。

**方向性**。上限＋rescueをFinding 1のハーネスに吸収する。手作業でエスケープした
フィクスチャ文字列を、Rubyの値からアサート文字列を導出するヘルパーで置き換える。

## まとめ（ROI順）

| # | Pain point | Scale | Risk |
|---|---|---|---|
| 1 | Tier-Dフォルダースケルトン（8モジュール、`dispatch_target?` ×9） | 大 | 低（純粋関数、十分にテスト済み） |
| 2 | 手書きの`\|\|`ディスパッチラダー（三つ組 ×15） | 中 | 低〜中（順序が要件） |
| 3 | 不統一なエントリー名／シグネチャ | 中 | 中（広範なエイリアス移行） |
| 4 | カタログローダーのボイラープレート＋3箇所編集＋`../../../../`×20 | 中 | 低 |
| 5 | フィクスチャエスケープ／上限／rescueの再実装 | 小〜中 | 低 |

最大のテコは1＋2＋3をまとめて畳み込むことである: 1つのインターフェースの背後にある
純粋シングルトンフォルダー、宣言テーブル、そして配列駆動のディスパッチ。

## 実行順序（実装容易性）

1. **Finding 4** —— 最小・最安全、インターフェース変更なし。パスヘルパー＋自己登録。
2. **Finding 1** —— `SingletonFunctionFolder`ハーネス。まず証明としてURI / CGI /
   Shellwordsを移行し、続いてMath / Regexp / Set / Time / Fileを移行する。
3. **Finding 3** —— エントリポイントのインターフェースを統一する（2のブロックを解除）。
4. **Finding 2** —— エントリポイントが統一されたら配列駆動のディスパッチへ。
5. **Finding 5** —— フィクスチャヘルパー＋上限／rescueの吸収。1と並行して機を見て行う。

各ステップは`make verify`（test / lint / check / check-plugins）でゲートし、
畳み込み結果は変わらないこと。

## 進捗ログ（2026-06-03 → 2026-06-04）

- **Finding 4 — DONE（パスヘルパー）**。単一の`DATA_ROOT`配下で解決する
  `MethodCatalog.for_topic(topic, mutating_selectors:)`を追加。18個すべての
  インスタンスローダーを、コピーされた
  `File.expand_path("../../../../…", __dir__)`から移行した。ブロックリストは未変更。
  - **自己登録のサブパート — WON'T DO（決定）**。`require_relative`リストを
    ロード順の自己登録で`CATALOG_BY_CLASS`と統合するのは*きれいな*勝ちでは*ない*:
    `CATALOG_BY_CLASS`はサブクラスの曖昧性解消のため宣言順に走査される
    （`Date`より前の`DateTime`、1つのカタログを共有する`MatchData`/`Regexp`）が、
    その順序は`require`の順序と**一致しない**。自己登録でも明示的な順序ヒントが
    依然必要となり、1つのテーブルを別のテーブルとロード順の結合に置き換えるだけに
    なる。明示的な3箇所編集のまま残す。
  - **`NumericCatalog`の統合 — DONE**。これは独自の手書きの`safe_for_folding?` /
    `method_entry` / `load_catalog`という`MethodCatalog`のコピーを持つ最後の
    クラス単位カタログだった（汎用ローダーより前に存在していた）。
    `NUMERIC_CATALOG = MethodCatalog.for_topic("numeric")`に置き換え、
    `CATALOG_BY_CLASS`のInteger/Floatの行を再指定。バンゲートはノーオペ（畳み込み
    可能な数値のバンメソッドはない）。MethodCatalogのエイリアス解決が5つの健全な
    畳み込み（`magnitude`→`abs`、`inspect`→`to_s`、…）をスナップショットの移動なしに
    加える。ractor対応性チェックは現在、`CATALOG_BY_CLASS`のディープフリーズを通じて
    インスタンスが共有可能であることをアサートする。
- **Finding 1 — DONE**。`MethodDispatcher::SingletonFolding`を抽出
  （`receiver?` + `constant_string`）。9つすべてのレシーバー述語
  （CGI/URI/Shellwords/Math/Time/Regexp/Set/File + iterator_dispatchの`Class`
  チェック）と、4つの文字列畳み込みの`Constant[String]`アンラップをこれに移行した。
  完全な宣言テーブルハーネスは**オーバーエンジニアリング**だと結論した —— 畳み込み
  本体（Mathの数値、Fileのプラットフォームゲート、Setのコンストラクタ、Timeの
  アリティ、Shellwordsの上限）はバラエティに富みすぎていて、ドメインロジックを
  埋めずにテーブル駆動化できない。本当に同一なゲートだけを抽出した。
- **Finding 2 — DONE（シングルトンチェーン）**。`dispatch_stdlib_module_tiers`は
  現在`STDLIB_MODULE_FOLDERS.each`で駆動される（8つのフォルダーはすでに
  `try_dispatch`を共有していたので、*この*チェーンにはFinding 3への依存はない）。
  `dispatch_precise_tiers`のラダー（697-705）はまだ`try_fold` / `try_dispatch` /
  `try_forward` / block_foldingを混ぜており、先にFinding 3を**確かに**必要とする ——
  未着手。
- **Finding 3 — DONE（完全なインターフェース化）**。すべてのディスパッチtierが
  現在、単一の不変な`CallContext`（`Data.define`）を取り、1つのインターフェース
  `try_dispatch(CallContext) -> Type::t?`に準拠する:
  - **Slice A** —— `CallContext`値オブジェクト（9フィールド: 呼び出しの4つ組
    + block_type/environment/call_node/scope/self_type_override/public_only）。
    `.build`キーワードファクトリーが、tier単位のものを引退させる単一の
    `Metrics/ParameterLists`無効化を抱える。
  - **Slice B1** —— precise tier（ConstantFolding `try_fold`→`try_dispatch`、
    BlockFolding `try_fold`→`try_dispatch`、MethodFoldingのforward
    `try_forward`→`try_dispatch`、LiteralString/Shape/Kernel + 8つのシングルトン
    フォルダー）。`dispatch_precise_tiers`はコンテキストを一度だけ構築し、単一の
    `PRECISE_TIERS`リストを駆動して、Finding 2の`STDLIB_MODULE_FOLDERS`サブリストを
    吸収する。
  - **Slice B2** —— コンテキスト重めのtier（RbsDispatch `try_dispatch` ——
    ParameterLists無効化を除去 —— + `block_param_types`、MethodFolding
    `try_backward`、IteratorDispatch `block_param_types`）。`dispatch`は先頭で
    コンテキストを一度だけ構築する。派生する2つのRBS箇所は`CallContext.build`を使う。
  - **Slice B3** —— `interface _DispatchTier` + `CallContext`クラスを
    `sig/rigor/inference.rbs`で宣言（`Type::t`で型付け）。`make steep-check`は
    グリーン。宣言のみ —— tier単位の準拠は強制せず、エンジンの部分シグネチャの
    イディオムに合わせる。
  - tierのエントリポイントは`method_dispatcher.rb`とtierのユニットspecからのみ
    呼ばれる。specは新しい`cc(...)`サポートヘルパー経由で移行した（Slice Bの
    102呼び出し箇所）。公開の`dispatch` / `expected_block_param_types`はキーワード
    シグネチャを維持する（外部の呼び出し元は影響を受けない）。
  - **パフォーマンス: ニュートラル**。`rigor check --no-cache lib`のインターリーブ
    A/B（Finding 3前のd153403d対 後の4545dc63、4ペア） —— 前の平均7.58秒、後の
    平均7.70秒（約1.6%）で、実行ごとのばらつき（6.93〜8.40秒、±15%。1ペアでは後が
    速い）の十分内側。ディスパッチごとの`CallContext`アロケーションは針を動かさない。
  - **ユニット／推論specではなく全スイートで捕捉:**
    `ShapeDispatch.dispatch_intersection`はIntersectionメンバーごとに1回
    `try_dispatch`へ再入する。その*tier内再帰*は移行後も古いキーワードHashを渡し続け、
    `NoMethodError`を送出した。tier呼び出し元の調査は`method_dispatcher/`自身を
    除外していたため見逃された —— `intersection_refinement`の統合フィクスチャだけが
    このパスを実行する。**教訓: tierのエントリシグネチャを変えるときは、tier
    ディレクトリ自身を再帰的な自己呼び出しでgrepし、挙動ニュートラルだと主張する前に
    必ず全`rspec`（ユニット + `spec/rigor/inference`サブセットだけでなく）を実行する
    こと。**修正済み。5406 examples、0 failures。
- **Finding 5 — NOT STARTED**。フィクスチャエスケープヘルパー＋上限／rescueの吸収。
