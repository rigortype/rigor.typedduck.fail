---
title: "22ライブラリOSSサーベイ — 繰り返される偽陽性クラスタ + 着地したBigDecimal-coerce修正"
description: "rigortype/rigor docs/notes/20260519-oss-library-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260519-oss-library-survey.md"
sourcePath: "docs/notes/20260519-oss-library-survey.md"
sourceSha: "6f046e567c80bb13928c5632c995a18795cedabcdad31aba4c1da04e5fd578f5"
sourceCommit: "fe4e9a80df3829ee4f113e763e4bb9920c33da21"
translationStatus: "translated"
sidebar:
  order: 20266519
---

**日付**。2026-05-18 → 2026-05-19。サーベイは`e44cfee`;修正は`acc9882`（`OverloadSelector: receiver-affinity pre-sort + Acceptance ancestor fallback`）で着地。

**スコープ**。rigorリポジトリ外（`~/repo/ruby/rigor-survey/`）にクローンされ`rigor check`で解析された22の広く使われているOSS Ruby gem。目標: rigor自身のセルフチェックコーパスでは再現しない繰り返される偽陽性クラスタを特定し、ユーザー可視のインパクトでランク付けし、回帰カバレッジ付きで少なくとも1つの具体的な修正をエンドツーエンドで着地させる。

**結果**。3ラウンドのサーベイ（ラウンド1: 11の汎用ライブラリ;ラウンド2: 11のテンプレート / シリアライゼーションライブラリ;ラウンド3: 修正着地）。ファミリー3（BigDecimal誤推論）はコーパス全体で完全に消失 — 7ライブラリで25回 → 0 — 7ファイルの変更を通じて（2 lib + 1新モジュール + 2 spec + CHANGELOG + CURRENT_WORK）。他の5つの診断クラスタはキューのまま;このノートはサーベイ方法論とライブラリごとの結果を記録し、将来の実装者が同じデータを手元に持って次のスライスを選べるようにする。

**コンパニオン成果物**。ライブラリごとの生`rigor check`出力とクローン作業ツリーは、このリポジトリ外の`~/repo/ruby/rigor-survey/_reports/<lib>.txt`に保持される（チェックインされていない — クローンは大きすぎ、診断は下記§6のレシピから再現可能）。

## 1. ライブラリごとのサマリー

| ライブラリ | ファイル | 壁 | メモリ | エラー | 警告 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| `rgl` | 28 | 1.0秒 | 296 MB | 2 | 0 | ミックスインメソッドが`Object`として解決される |
| `algorithms` | 14 | 1.5秒 | 314 MB | 53 | 11 | ツリーコンテナ: nilナローイング + 数値推論 |
| `faraday` | 33 | 1.3秒 | 320 MB | 18 | 7 | クラスメソッドナローイング + nilレシーバークラスタ |
| `rbnacl` | 37 | 1.2秒 | 300 MB | 0 | 1 | コーパス中最もクリーンな結果 |
| `protobuf` (ruby) | 24 | 1.1秒 | 365 MB | 16 | 0 | `Numeric#to_i` / `Struct.new`ディスパッチバグ |
| `parser` | 56 | 1.4秒 | 309 MB | 11 | 5 | `<< for BigDecimal`（Integer→BigDecimal誤推論） |
| `rubocop-ast` | 99 | 1.2秒 | 326 MB | 4 | 3 | パターンDSLヘルパーが`Object`として見える |
| `concurrent-ruby` | 178 | 1.4秒 | 320 MB | 12 | 7 | `Promises::Future#fulfill`が`nil`ナローイングで失われる |
| `kramdown` | 55 | 1.5秒 | 327 MB | 42 | 4 | `nil`上の`el.type` / `el.options`チェーン（10+10+7+6） |
| `mail` | 111 | 2.5秒 | 437 MB | 9 | 20 | `literal predicate is always falsey` ×11（ノイズ） |
| `net-ssh` | 97 | 1.3秒 | 339 MB | 28 | 22 | `condition is always falsey` ×10;未使用ローカル |
| **合計** | 732 | — | — | 195 | 80 | |

すべての実行はライブラリあたり2.5秒以内に完了。最大ターゲット（mail、111ファイル）でもメモリは440 MB以下にとどまった。

## 2. 安定性の発見（再現不能）

`algorithms`に対する最初の呼び出しで、**すべてのファイル**が次を生成した:

> `error: internal analyzer error: NoMethodError: undefined method 'try_static_refinement' for module Rigor::Inference::MethodDispatcher`

その後の`--clear-cache`実行は、内部エラーなしで53の通常の診断を生成した。したがってバグは、このセッションでの先行する`rigor check`実行からの一時的なウォームキャッシュ状態に依存する。追跡する価値がある理由:

1. ユーザーはリファクタ後の最初のアナライザー呼び出しでこれに当たる。
2. メッセージ自体がプログラミングエラー（タイプミス / 定義漏れ） — `MethodDispatcher.try_static_refinement`ルックアップが何らかのコードパスから到達可能;メソッドが未定義か、定義されるべきか。

**アクション**: コードベースを`try_static_refinement`の呼び出し元でgrepする。トリガー条件は: キャッシュミス + プラグイン駆動のディスパッチャーエントリー。[`内部仕様の推論エンジンドキュメント`](../internal-spec/inference-engine/)契約もこれを列挙すべき。

## 3. 繰り返される偽陽性 / 改善クラスタ

これらは複数のライブラリにまたがって現れる — ランクは合計出現数で、おおよそ「ユーザーが自分のコードベースでどれだけのノイズを見るか」に比例する。

### 3a. `BigDecimal`としての数値リテラル誤推論（最優先）

| ライブラリ | メッセージ | 回数 |
| --- | --- | --- |
| `algorithms` | `undefined method 'upto' for BigDecimal` | 1 |
| `parser` | `undefined method '<<' for BigDecimal` | 3 |
| `kramdown` | `undefined method 'times' for BigDecimal` | 1 |
| `protobuf` | `undefined method 'to_i/to_f' for Numeric` | 12 |

これらはユーザーが書いた`BigDecimal`算術ではない。呼び出しサイトを読むと（例: `algorithms/lib/algorithms/sort.rb:70`は`(arr.length - 1).upto(...)`）、レシーバーは`Integer`算術の結果。推論は`Integer`を`Numeric`に広げ、それから`BigDecimal`（`upto`/`<<`定義のない最も制限的な`Numeric`部分型）に間違ってナローイングしているように見える。

おそらくの根本原因: `Integer - Integer`が何らかのパスで`Numeric`を返し、ユニオン射影が間違ったアームを選ぶ。`ExpressionTyper`で検証 — 最近のコミット`e44cfee`はすでに`__FILE__`/`__LINE__`を絞り込んでいる;リテラル上の算術も同じ精度に値する。

### 3b. ミックスイン提供のメソッドが`Object` / `Class`として解決される

| ライブラリ | 例 |
| --- | --- |
| `rgl` | `Object`上の`cycles_with_vertex`、`remove_vertex` |
| `faraday` | `Class`上の`options_for`、`member_set` |
| `faraday` | `Object`/`URI`上の`merge!`、`update`、`find_proxy` |
| `rubocop-ast` | `Object`/`Binding`上の`compile_terms`、`union_bind` |

パターン: モジュールが`include`される（またはクラスレベルで`extend`される）が、そのメソッドはディスパッチ中にレシーバーのメソッドテーブルに追加されない。`rgl`では、影響を受けるメソッドは`Mutable#each_vertex`が呼び出し元に`cycles_with_vertex`と`remove_vertex`の両方を提供することを期待するミックスインパターンに由来する。ScopeIndexerはinclude / extend / prepend解決に対して確認すべき。

これはまた、ユーザーが「Rigorはミックスインを理解しない」と最もよく誤読する症状でもある。焦点を絞った修正 + ハンドブックでの呼び出しの価値がある。

### 3c. パターンガードを通じて収束しないnilナローイング

| ライブラリ | クラスタ | 回数 |
| --- | --- | --- |
| `kramdown` | `nil`上の`el.type`/`el.options`/`el.children`/`el.value` | ≥33 |
| `algorithms` | `nil`上の`node.key`/`.left`/`.right`/`.value` | ≥45 |
| `net-ssh` | `nil`上の`call`/`close`/`shutdown` | ≥12 |
| `concurrent` | `nil`上の`fulfill`、`executor`、`resolved?` | ≥5 |

これらは絶対エラー数を支配するが、多くは真陽性の可能性が高い — ツリーアルゴリズムは浅いチェックの後に真に`node.left`を参照解除する。問題は出力でそれらがすべて*同じに見える*こと。2つの改善:

1. nilレシーバー診断を単一のロールアップ下にグループ化し、ユーザーが`algorithms/lib/containers/splay_tree_map.rb`を見たときに20の別々の行ではなく「`node`上の20のnilレシーバーエラー」を見るように。
2. 一般的なイディオムを尊重する: `return unless node` / `node or return` / `node && node.left`は帰結内でナローイングすべき。

`splay_tree_map.rb:156`（上記§3cで引用）をスポットチェックすると、ガードが使用から多くの行上にある深くネストされたメソッドが見える — これは明示的なアノテーションなしにフローナローイングが維持できるエッジ。

### 3d. `condition is always falsey/truthy`ノイズ

| ライブラリ | 回数 |
| --- | --- |
| `net-ssh` | 10 |
| `faraday` | 6 |
| `parser` | 5 |
| `concurrent` | 5 |
| `kramdown` | 2 |
| `rubocop-ast` | 2 |

多くは§3a/§3cの下流 — レシーバー型が間違うと、囲む`if`/`unless`は定数に畳まれる。3a/3cを修正することでこのカテゴリーは機械的に減る。残りの真陽性（デッドブランチ）は価値があるが、偽陽性の中で溺れやすい。

### 3e. `Mail::Message`の`literal predicate is always falsey` ×11

すべて`mail/lib/mail/message.rb`内。スポットチェックすると`if @raw_source.blank?`のような述語であることが分かり、Rigorが`@raw_source`に対して非blank形を推論した。パターンは11回同一 — おそらくすべてのgetterに波及する単一のコンストラクタ側の過剰ナローイング。

### 3f. `Struct.new` / `Class.new`ディスパッチ

* `protobuf`: `wrong number of arguments to 'new' on Struct (given 0, expected 1..Infinity)`
* `concurrent-ruby`: `wrong number of arguments to 'new' on Class (given 1/2, expected 0)`

これらはおそらく`Struct.new(:a, :b)`と`Class.new(SuperClass) { ... }`形。両方ともRBSで定義済みのシグネチャを持つが、Rigorは`Object#new`にフォールバックする。単一のディスパッチャーパッチ（Struct + Classメタメソッド）の価値がある。

### 3g. インスタンス変数型乖離ノイズ

`algorithms`、`mail`、`net-ssh`、`parser`、`rbnacl`、`concurrent-ruby`、`rubocop-ast`、`kramdown`にまたがる — パターン:

> `instance variable '@X' on Klass was previously assigned NilClass; this write assigns ConcreteType`

これは正準なRuby: `def initialize; @x = nil; end`してから後で`@x = build!`。診断は真の型シフトを捕えるが、パターンがほぼ普遍的なので、大量の低シグナルノイズを生成する。3つのオプション:

1. 唯一の事前代入が`initialize`内の`nil`で、型ユニオンが正確に`NilClass | ConcreteType`のときに抑制。
2. デフォルトの`:hint`深刻度を持つ別個の診断ファミリーに昇格。
3. そのままにし、抑制マーカーを目立つように文書化。

## 4. 横断的なインフラ観察

* **すべての11実行が印刷**、同じ`.rigor.yml:1:1: info: 24 gem(s) in Gemfile.lock have no RBS available` — これは*Rigorリポジトリの*Gemfileで、ターゲットのものではない。チェックはRigorのcwdから実行された。次のいずれかの価値がある:
  - 「ターゲットがcwd外」を自動検出し、cwd相対のGemfileアドバイスを抑制、または
  - 代わりにターゲット相対のアドバイスを発行。
* **キャッシュヒット可観測性** — すべての実行が`(source attribution unavailable on cache-hit runs; --no-cache surfaces it)`を報告する。これは良いガイダンスだが、ターゲットがそれまでチェックされたことがなくても現れる。「この実行は≥1キャッシュヒットを持った」のみに厳しくすることを検討。
* **Git-dirty警告** — `warning: Git tree '/Users/megurine/repo/ruby/rigor' is dirty`が、ターゲットパスがdirtyツリーの外でも発行される。アウトオブツリーのターゲットに対してそれを沈黙させるか、チェックをターゲット自身のgitルートに対してリベースする。

## 5. 上位3つの実行可能な改善（推奨順）

1. **`Integer`算術 → `BigDecimal`誤推論を修正（§3a）** — 最小の修正、最大のノイズ削減。11ライブラリのうち≥4に影響。
2. **`ScopeIndexer`を通じたmixin/`include`ルックアップを解決（§3b）** — 中程度の労力、最も「バグとして誤解されるカテゴリー」を修正。「Rigorは私のコードを理解しない」という認識を減らす。
3. **`try_static_refinement`コールドキャッシュクラッシュを追跡し、修正するか文書化する（§2）** — 小さな修正、新ユーザーが当たれば高い当惑コスト。

§3cのnilナローイング改善はより価値が高いが、より大きなスコープ — 次のリリースに急ぐのではなく、独自の設計パス（おそらく[`control-flow-analysis`](../type-specification/control-flow-analysis/)仕様に結びつく）の価値がある。

## 6. 再現

```sh
cd /Users/megurine/repo/ruby/rigor-survey
# クローンはすでに配置済み;やり直すには:
for d in rgl algorithms faraday rbnacl parser rubocop-ast \
         concurrent-ruby kramdown mail net-ssh; do
  (cd "$d" && git pull --depth=1 -q)
done

# ライブラリごとのチェック
cd /Users/megurine/repo/ruby/rigor
nix --extra-experimental-features 'nix-command flakes' develop --command \
  bundle exec exe/rigor check --clear-cache \
    /Users/megurine/repo/ruby/rigor-survey/<name>/lib
```

---

# ラウンド2: テンプレート＆シリアライゼーションライブラリ（2026-05-18）

11の追加ライブラリをサーベイ（テンプレートエンジン + シリアライゼーション）。ラウンド1と同じ方法論。

## 7. ライブラリごとのサマリー（ラウンド2）

| ライブラリ | ファイル | 壁 | メモリ | エラー | 警告 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| `herb` | 42 | 1.2秒 | 388 MB | 11 | 9 | `Gem::Specification#full_gem_path`がRBSに欠落 |
| `liquid` | 64 | 1.0秒 | 304 MB | 17 | 7 | `Class`上の`add_filter` → Class上のmixinルックアップギャップ |
| `pycall` | 22 | 0.9秒 | 342 MB | 2 | 0 | 非常にクリーン;`Array[Dynamic[top]]`上の`with_index` |
| `numo-narray` | 2 | 0.9秒 | 287 MB | 8 | 2 | C-ext gem;1つの.rbファイル。BigDecimal誤推論が再発 |
| `ox` | 15 | 0.8秒 | 311 MB | 12 | 0 | `nil`上の比較演算子;`Dynamic[top] | nil` |
| `oj` | 11 | 0.8秒 | 285 MB | 5 | 0 | `JSON::Ext::Generator::State.from_state`がRBSに欠落 |
| `jbuilder` | 14 | 0.9秒 | 290 MB | 126 | 2 | **ジェネレータ`.rb` ERBテンプレートがRubyとしてパースされる（118/126）** |
| `slim` | 27 | 1.0秒 | 345 MB | 9 | 8 | 2つのivar型乖離;`read for nil` |
| `hamlit` | 61 | 1.0秒 | 321 MB | 18 | 8 | `html_safe for String`（ActiveSupport extn）;BigDecimal |
| `haml` | 51 | 1.0秒 | 307 MB | 15 | 6 | hamlitと同じ;`merge_attributes!` Object上のmixin |
| `erubi` | 3 | 0.8秒 | 285 MB | 3 | 0 | `Erubi#begin`/`#end`のivar nilアクセス |
| **ラウンド2合計** | 312 | — | — | 226 | 42 | |
| **総合** | 1044 | — | — | 421 | 122 | |

## 8. ラウンド2からの新しい発見

### 8a. `.rb`拡張子を持つジェネレータERBテンプレート（新規、高インパクト）

`jbuilder/lib/generators/rails/templates/{api_,}controller.rb`はERBテンプレート（`<%= namespaced_path %>`）で、Railsジェネレータがそれを期待するため`.rb`拡張子で保存されている。Rigorはそれらをrubyとしてパースし、126のjbuilderエラーのうち118を生成する（`unexpected '<', '>'`、`'@' without identifiers is not allowed`）。残りの8エラーは`jbuilder.rb`内の実際の発見。

このパターンはジェネレータを出荷するRailsスタイルのgemに普遍的。2つの緩和策:

1. **デフォルト除外**、ターゲットに`.rigor.yml`がないときの`lib/generators/**/templates/**/*.rb`。
2. ソースバイト内でERBマーカー（`<%`/`%>`）を**検出**し、118のパースエラーの代わりに単一の「スキップ: テンプレートファイル」`:info`診断を表面化。

オプション2はより原則的;オプション1は出荷が速い。

### 8b. `String#html_safe`が認識されない（新規、Railsエコシステム）

`hamlit` + `haml`: 6回の`undefined method 'html_safe' for String`の出現。これはActiveSupportのcore_extメソッド。ユーザーは[`rigor-activesupport-core-ext`](../plugins/rigor-activesupport-core-ext)プラグインを利用可能だが、デフォルトでは適用されない。3つのオプション:

1. 診断でプラグインをより大きく文書化（「ヒント: プラグインXを有効化」）
2. `gem activesupport`が`Gemfile.lock`にあるときのビルド時ヒント
3. 現状（ユーザー駆動のオプトイン）

オプション2は最も侵入的でない — `Gemfile.lock`に見落とされていないが認識されたgemが利用可能なプラグインをシグナルするときに実行ごとに単一の`:info`を発行。

### 8c. `from_state` / `full_gem_path` / `markup_context=` — RBSカバレッジギャップ

これらは個別には小さいが、合わせて`oj`、`herb`、`liquid`にまたがる約10の偽陽性を占める。それぞれが`vendored_gem_sigs/`またはコアRBSに欠けている既知のメソッド。影響を受けるリポジトリでの`rigor sig-gen`フォローアップ、または`vendored_gem_sigs/`の補足RBSに適する。

### 8d. `nil`上の比較演算子（§3cの精緻化）

`ox/lib/ox/element.rb`はパターンを鋭く示す:

```
argument type mismatch at `<' on Integer: expected Numeric, got Dynamic[top] | nil
```

これは§3cの逆 — 「nil上のメソッド」ではなく、「`Numeric`が期待されるところに`Dynamic[top] | nil`を渡す」。同じ根本原因（使用前にnilがナローイングされていない）;異なる診断ファミリー。仕様の堅牢性原則がディスパッチの両側で引数位置`Dynamic[top]`を一貫させるべきという指摘の価値がある。

## 9. 精緻化された横断ビュー（合成コーパス）

22ライブラリ後、**コーパス全体での総出現数でランク付けされた上位3つの診断ファミリー**は:

| ランク | ファミリー | 合計 | 影響するライブラリ数 |
| --- | --- | --- | --- |
| 1 | `undefined method X for nil` / `X is undefined on NilClass` | ~140 | 22のうち16 |
| 2 | `condition is always falsey/truthy` | ~55 | 22のうち13 |
| 3 | `Integer → Numeric → BigDecimal`誤推論 | ~25 | 22のうち7 |
| | （数値上の`upto`、`<<`、`times`、`to_i`、`to_f`） | | |

ファミリー3は**最も明確な単一のバグ** — それを修正することで機械的にファミリー2を減らす（不正な数値ナローイングがデッドブランチ診断につながるため）、そして`Integer#+ / Integer#-`オーバーロード解決に集中している。

## 10. 自己指示の次のステップ

ファミリー3（Integer算術のNumeric誤推論）を最初に着地させる改善として選ぶ。影響を受けるライブラリ: `algorithms`、`parser`、`kramdown`、`protobuf`、`numo-narray`、`hamlit`、`haml`。修正を駆動する具体的な最初のケース:

> `algorithms/lib/algorithms/sort.rb:70:13`
> `(i+1).upto(container.size-1) do |j|`
> `error: undefined method 'upto' for BigDecimal`

ここで`i`は外側の`0.upto(...)`のIntegerブロックパラメータ。根本原因仮説: `Integer#+(Integer)`オーバーロード選択が`(Integer) → Integer`アームではなく`Numeric → Numeric`フォールバックを選び、実体化された`Numeric`キャリアが`BigDecimal`（`upto`のない最も具体的な部分型）に畳まれる。


---

# ラウンド3: ファミリー3（BigDecimal誤推論）の修正着地（2026-05-19）

## 11. 根本原因

§3aが仮説した`Numeric → Numeric`の広がりではない。実際のチェーン:

1. Rigorのプロセスは`bigdecimal`を`require`**しない**（`bigdecimal` gemはRuby 3.4でデフォルトから格下げされ、Gemfileにはない）。
2. `Acceptance#accepts_nominal_from_constant`が`Object.const_get("BigDecimal")`を呼ぶ → `NameError` → 「判断できない」ため`:maybe`を返す。`class_subtype_result`でも同じ。
3. `bigdecimal` stdlib RBSは`Integer#+` / `-` / `*`などをオーバーロードリストの**先頭**で`def +: (BigDecimal) -> BigDecimal | ...`で再オープンする（`| ...`は元のIntegerオーバーロードを後にマージ）。
4. `OverloadSelector`は`yes`または`maybe`をマッチとして受け入れる。パス1はall-acceptする最初のオーバーロードを選ぶ。BigDecimalが最初でその受容がIntegerの値を持つ任意の引数に対して`maybe`を返すので、BigDecimalアームが勝つ → 戻り型`BigDecimal`。
5. 下流の`BigDecimal.upto` / `.<<` / `.times`は存在しない → 偽陽性。

再現は次に縮小: `n`が`Dynamic[top]`の`5 + n`。直接の`Environment.default` env（bigdecimal未ロード）は`Integer`を返す。`Environment.for_project`（`DEFAULT_LIBRARIES = […, bigdecimal, …]`をロード）は`BigDecimal`を返す。その非対称性がバグを固定した。

## 12. 修正（2部、master HEADに着地）

**(a)** `lib/rigor/inference/acceptance.rb` — `resolve_class(target)`が失敗するが`resolve_class(actual)`が成功するとき、`actual.ancestors.map(&:name).include?(target_name)`にフォールバックし、権威的な`:yes` / `:no`回答を与える。定数の値は実行時に常にロード可能（値が存在する）なので、`Constant<1>.value.class`は`Integer`で`Integer.ancestors`は`"BigDecimal"`を含まない → 関係は`:maybe`ではなく`:no`。`class_subtype_result`の`Nominal.accepts(Nominal)`軸にも同じフォールバックを追加。完全に解決不能（両方ともユーザークラス）なケースは`:maybe`のまま。

**(b)** `lib/rigor/inference/method_dispatcher/receiver_affinity.rb` — 新しいモジュール + `OverloadSelector.select`の先頭での新しい事前ソート、すべての位置パラム型が`self_type.class_name`自体またはその真のRBS祖先の1つであるアームが先頭に来るよう、オーバーロードを安定的にパーティション分けする。envが`class_ordering`に答えられレシーバーがクラス名を運ぶときに事前ソートが発火する;「引数がuntypedを含む」にはゲートされていない、何もマッチしないときの誤順序な`overloads.first`フォールバックも同様に間違っているため。

## 13. サーベイ差分（22ライブラリコーパス）

| ライブラリ | 修正前のエラー | 修正後のエラー | Δ |
| --- | --- | --- | --- |
| `protobuf` | 16 | 1 | −15 |
| `parser` | 11 | 8 | −3 |
| `hamlit` | 18 | 16 | −2 |
| `haml` | 15 | 13 | −2 |
| `algorithms` | 53 | 52 | −1 |
| `kramdown` | 42 | 41 | −1 |
| `concurrent-ruby` | 12 | 11 | −1 |
| `numo-narray` | 8 | 8 | 0\* |
| `mail`/`net-ssh`/その他 | （変更なし） | （変更なし） | 0 |
| **合計** | 421 | 397 | **−24** |

\* `numo-narray`の残りの8エラーは今、異なるカテゴリー（ex-BigDecimal-timesエラーの1つが`Integer#times`オーバーロード選択問題を表面化: ブロックなしでは、RBSの`() -> Enumerator`が勝つべきだが、アナライザーは依然ブロック付きアームを選んでいる）。別個のバグ;キュー。

コーパス全体でBigDecimal/Numericの偽陽性は**7ライブラリで25回 → 0**に削減。

## 14. 検証

- `make verify`: 3789 spec（3783 + 6新）、0失敗、2 pending（既存のRactor-readiness項目）。
- `bundle exec rubocop`: 601ファイル、0違反。
- `bundle exec exe/rigor check lib`（セルフチェック）: `hkt_body_parser.rb` / `hkt_registry.rb`の3つの既存の`condition is always truthy`警告。`git stash && rigor check`経由でベースラインから変化なしを確認 — この修正によって導入されたものではない。
- `git diff --check`: クリーン。

## 15. サーベイから残るカテゴリー（まだ対処されていない）

優先順、最大の残余バケットが最初:

1. **§3cパターンガードを通じたnilナローイング** — 22ライブラリのうち16にまたがる約140回出現。絶対量で支配的なカテゴリー;多くの真陽性（ツリーコードが浅いチェック後に`node.left`を参照解除する）、しかし深くネストされたケースは`return unless node` / `node && node.x`イディオムに対するフロー絞り込みの地平線を露呈する。`control-flow-analysis`仕様に結びつく;迅速な修正ではなく専用の設計スライスに値する。
2. **§3b `Object` / `Class`として解決されるミックスイン提供メソッド** — `rgl`、`faraday`、`liquid`、`rubocop-ast`、`haml`。ユーザーが「Rigorはミックスインを理解しない」と最もよく誤読する症状。ScopeIndexerのinclude/extend/prepend解決の監査。
3. **§8a Rubyとしてパースされるrailsジェネレータ`.rb` ERBテンプレート** — jbuilderが126エラーのうち118（94%）を占める。`lib/generators/**/templates/**/*.rb`をデフォルト除外、またはソースバイト内のERBマーカーを検出。単一修正で高インパクト。
4. **§8b `String#html_safe`が認識されない** — hamlit + haml。`activesupport`がターゲットの`Gemfile.lock`にあるときに`rigor-activesupport-core-ext`プラグインを`:info`診断で昇格させる。
5. **§3d `condition is always falsey/truthy`ノイズ** — §11〜12の修正経由で機械的に約5ケース削減（正しい数値ナローイングの下流）。残りのケースはほとんど真のデッドブランチ + §3c関連の残余。
6. **§3gインスタンス変数型乖離ノイズ** — 設計判断（`initialize`からの`nil | T`パターンを抑制、または`:hint`ファミリーに分割）。

§2のコールドキャッシュ`try_static_refinement`内部エラーバグは、最初の呼び出し後に再現せず、このスライス中に再発しなかった。キューされた調査項目として残す — `try_static_refinement`の呼び出し元のgrepパスと推論エンジン仕様での呼び出しの価値がある。
