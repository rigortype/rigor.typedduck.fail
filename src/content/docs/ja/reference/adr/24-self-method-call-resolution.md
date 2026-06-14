---
title: "ADR-24 — implicit-selfメソッド呼び出し解決"
description: "rigortype/rigor docs/adr/24-self-method-call-resolution.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/24-self-method-call-resolution.md"
sourcePath: "docs/adr/24-self-method-call-resolution.md"
sourceSha: "f28bbffdeac9bd76118a89e3c72e6e3f4e45ef7119c48c9c93f3e394b7e26db4"
sourceCommit: "7f5a54c352ff4370788bf7aef5fc1b70f8a92e4a"
sourceDate: "2026-05-29T00:21:31+09:00"
sourceLanguage: "en"
translationStatus: "translated"
sidebar:
  order: 4024
---

ステータス: **Accepted、2026-05-20（スライス（slice）4は別途FP評価が必要なためゲート中）。スライス1+3は2026-05-20に実装済み、スライス2は2026-05-21に実装済み。スライス4アテンプト1（check-rules再実装）は2026-06-05にプロトタイプされ差し戻し — Rigorの`lib`で135件のフォルスポジティブ。スライス4a（評価時レコーダー）+`call.self-undefined-method`ルール（スタンドアロンクラスゲート、`:off`でship済み）は2026-06-05に実装済み — ミニコーパス467→15件のレコーダーミス、アテンプト1のFPクラスはゼロ、ルールはRigorの`lib`でFPクリーン（かつ実在の潜在バグを検出）。外部WD4コーパスFPゲートは2026-06-14に実行された（[ノート](../../notes/20260614-adr24-slice4-self-undefined-fp-eval/)）: ルールは**`:off`のまま — 昇格不可。**コーパスでの発火は約454件、ほぼすべてフォルスポジティブ;支配的な`Object`/`BasicObject`のself型フォールバッククラス（287件）は除外済みだが、抽象 / テンプレートメソッドの基底クラスパターン（基底クラスがサブクラスの実装するメソッドを呼ぶ）は、現在のクラスごとのゲートでは未対処のフォルスポジティブである。スーパークラス/インクルードチェーンへのゲート拡張は見送り（このクラスを拡大するだけ）;必要な次のステップはサブクラス認識ゲーティングだ。以下のスライス4を参照**。
メソッドボディの内側で明示的なレシーバーなしに書かれた呼び出し（implicit-selfメソッド呼び出し）を、囲むクラス / モジュールのメソッドセット — 自身の定義、その祖先、クロスファイルのプロジェクトクラス — に対して解決するというプロジェクトの決定を記録する。これにより、解決されたメソッドの推論された戻り型とパラメータ契約（contract）が呼び出しサイトで可視になる。現状ではそのような呼び出しは`Dynamic[top]`として型付けされており、これは根本的な精度ギャップ。

## コンテキスト

`rigor type-of`を`def nr; raise "x"; end`に対して実証的に確認:

| 呼び出しサイト | `nr`の推論型 |
| --- | --- |
| トップレベル（`w = nr`） | `bot` ✓ |
| 別のメソッド内部（`def g; v = nr; end`） | `Dynamic[top]` ✗ |

トップレベルの呼び出しはトップレベルの`def`に解決される;**メソッドボディ内部からの呼び出しは解決されない** — rigorはそれを`Dynamic[top]`と型付けし、呼び出し先の推論された戻り型もパラメータ契約も見えない。

これはコーナーケースではない。[`docs/notes/20260519-oss-library-survey.md`](../../notes/20260519-oss-library-survey/)
Mastodonサーベイで発見された最大のフォルスポジティブクラスタの根本原因。`lib/mastodon/cli/accounts.rb`のパターン:

```ruby
def modify(username)
  user = Account.find_local(username)&.user
  fail_with_message 'No user with such username' if user.nil?
  user.role_id = role.id   # 40件以上の`possible-nil-receiver`診断がここに
  user.save
  ...
end
```

`fail_with_message`はボディが`raise Thor::Error, message`のガードヘルパー — 常に発散するため、エンジンはその戻り型を`bot`と推論*できる*。`helper(...) if user.nil?`での`bot`を返す呼び出しは`raise ... if user.nil?`と全く同じ終端ガードだ — フォールスルーは`user`が非`nil`であることを観測する。しかし`fail_with_message`は`#modify`内のimplicit-self呼び出しであるため`Dynamic`と型付けされ、`bot`ではない;ガードが不可視になり;`user`は`User | nil`のまま;後続のすべての`user.<x>`が`possible-nil-receiver`フォルスポジティブになる。1ファイルで42件。

さらに広く言えば、プロジェクト内の*すべての*`self`メソッド呼び出しがその実際の戻り型とパラメータ契約を失う — `self`メソッドに対するチェインされた推論が`Dynamic`に縮退し、`self`呼び出しに対する本物のアリティ（arity） / 引数型バグが検出されない。ガードヘルパークラスタは単に最も可視性の高い症状にすぎない。

これを修正するためのピースはほぼすべて既存:

- クロスファイルクラス発見プレパスがプロジェクトクラスレジストリを埋める。
- エンジンがモジュールミックスインコンテキスト向けの`self_type`を持つ。
- メソッドの戻り型推論が機能する（上記のトップレベルでの`type-of`の結果がそれを証明）。

欠けているのは配線:implicit-self呼び出しサイトが「ここでの`self`は何か、そのクラス — または祖先 — はこのメソッドを定義しているか？」と問わない。

## 決定

エンジンはメソッドボディ内部のimplicit-self呼び出しを、囲む定義の`self`型に対して解決する:

1. 呼び出しサイトでの`self`を決定する — インスタンスメソッド（`def m`）に対してはレキシカルに囲む`class`/`module`の*インスタンス*、シングルトンメソッド（`def self.m` / `class << self`）に対しては*シングルトン*。
2. その型のメソッドセットに対して呼び出し名を解決する:囲むクラス自身の定義、次にその祖先 — プロジェクト発見クラス（クロスファイル）とRBS既知の祖先の両方を参照しながら、スーパークラスチェーンとインクルードされたモジュール。
3. ヒットした場合、呼び出しサイトは解決されたメソッドの推論された戻り型とパラメータ契約を採用する — 明示的な既知レシーバーを持つ呼び出しがすでに行うのと全く同様。
4. ミスした場合、呼び出しは`Dynamic[top]`のまま — 今日の動作が保持される（WD3）。

> **[ADR-57](57-self-call-return-adoption.md)によりWD3ゲートが開かれた（2026-06-12）**。ボディ内採用は当初`Bot`戻りに限定されていたが、ADR-57がゲートを開いた際の発火を裁定し、エンジンのアーティファクトを修正し、`adoptable_self_call_result?`を削除した。これにより、解決されたユーザーメソッド呼び出しは推論された戻り型を無条件に採用するようになった。

この変更はv1では**精度加法的**:既存の`Dynamic[top]`をより精密な型に置き換えるだけ。v1では、*未解決の*self呼び出しに対して`call.undefined-method`を新たにemitしない（WD4）— それはRubyのメタプログラミングが「未解決」を「バグ」の弱いシグナルにするため、別個のゲートされた決定。

## 作業上の決定

### WD1 — 解決スコープ:囲むクラス + 祖先、クロスファイル

解決ターゲットは`self`のクラスの完全な祖先チェーンであり、同一ファイルや同一クラスボディだけではない。`fail_with_message`は`Mastodon::CLI::Base`に存在;呼び出しは別のファイルのサブクラスにある。解決はクロスファイルプロジェクトクラスレジストリとRBS祖先を参照する。プロジェクト全体が解析されたからこそ解決するself呼び出しは例外ではなく普通のケース。

### WD2 — `self`は`def m`ではインスタンス型、`def self.m`ではシングルトン

`def m`の内部でimplicit-self呼び出しのレシーバーは囲むクラスの*インスタンス*;`def self.m` / `class << self`の内部では*シングルトン*。両者は異なるメソッドセットを持つ（インスタンスメソッド対クラスメソッド）。解決はマッチするセットを使う。これはエンジン既存の`self_type`を再利用しており、並列の概念を発明しない。

### WD3 — 未解決のself呼び出しは`Dynamic[top]`のまま

名前が既知のメソッドに解決しないself呼び出しは今日の`Dynamic[top]`型を保持する。Rubyのメソッドは日常的に`define_method`、`method_missing`、`attr_*`、フレームワークDSL（ActiveRecord属性 / アソシエーション、`delegate`など）で定義される。「静的に発見されない」を「存在しない」として扱うと、正しい場合よりも間違っている場合のほうがはるかに多くなる。不確実なディスパッチに対する寛容性は[ADR-5](../5-robustness-principle/)の堅牢性原則を`self`ディスパッチに適用したもの。

### WD4 — 解決された閉じたself呼び出しに対する`undefined-method`は別個のゲートされた決定

self呼び出しが解決されると、エンジンは解決されたが不一致のself呼び出し、またはメタプログラミングの逃げ道がないクラスで解決されないself呼び出しに対して`call.undefined-method` / `call.wrong-arity` / 引数型診断をemitできる。これは本物のバグ検出の価値があるが — メタプログラミングが多いコードベース（すべてのRailsモデル）では大きな新たなフォルスポジティブサーフェス（surface）でもある。このADRのv1では**開かない**。スライス4として、独自の評価でゲートされている:レシーバークラスが自信を持って*閉じている*（すべてのメソッドが静的に既知;`method_missing` / `respond_to_missing?` / 動的定義なし;RBS-`untyped`汚染された祖先なし）ときのみフラグを立てる。それまで、self呼び出し解決は純粋に精度向上。

### WD5 — プロジェクトメソッドサマリー、有界パスで計算

呼び出し元に呼び出し先の戻り型を渡すため、エンジンはメソッドサマリー — `(class, method, kind) → 戻り型 + パラメーター契約` — が必要。毎回呼び出し先を再解析するのではなく一度計算してself呼び出しサイトで参照する。相互再帰（`A`が`B`を呼び、`B`が`A`を呼ぶ）は[`inference-budgets.md`](../../type-specification/inference-budgets/)に従い有界:計算中のサマリーはそのサイクルで発散するのではなく`Dynamic[top]`に解決する。既存のプロジェクトスキャンプレパスとそのキャッシュ（ADR-6）が自然な置き場所;これは合成メソッドインデックスを拡張するか、並列のプロジェクトメソッドサマリーインデックスを追加することになるかもしれない。

### WD6 — `bot`ブランチが制御フローをナローイング

`bot`を返すself呼び出し（常に`raise` / `exit`するガードヘルパー）は、フロー解析がその後`helper(...) if x.nil?`を終端ガードとして扱う場合にのみ効果を発揮する。今日の`eval_if` / `eval_unless`は終端ブランチを*構文的に*検出する — ハードコードされた`EXIT_CALL_NAMES`（`raise`/`throw`/`exit`/`abort`/`fail`）が呼び出し名でマッチング。このADRはそれを一般化する:*推論された型が`Bot`の*ブランチが、どのようにスペルされていても終端ブランチ。ブランチ型は`eval_if`によってすでに計算されており;変更はそれをexitテストにORする。（この一般化のプロトタイプはクラスタ1b調査中に書かれ差し戻された — 正しいが、WD1〜WD5がガード呼び出しをまず`bot`に解決させるまで不活性。スライス3として、残りと並んでspecが書かれる。）

### WD7 — バジェットとキャッシング

解決とサマリー計算は解析作業を増やす。両方が[`inference-budgets.md`](../../type-specification/inference-budgets/)エンベロープ内に収まる;クロスファイル解決は既存のクラス発見プレパスとADR-6キャッシュに乗る。バジェットを超えるself呼び出しは（WD3）`Dynamic[top]`にフォールバック — 遅い無制限のウォークにではなく。

## 結果

### ポジティブ

- Mastodonのnil-receiver FPクラスタ（1ファイルで≈42件、他の場所にも）は一度ガードヘルパーの`bot`戻りが可視になれば（WD1 + WD5 + WD6）クローズする。
- *すべての*`self`呼び出しが実際の戻り型を得る — `self`メソッドに対するチェインされた推論が`Dynamic`に縮退するのを停止。精度向上はガードヘルパーのケースをはるかに超える。
- `bot`ブランチフローの一般化（WD6）により、ガード節が*任意の*発散するヘルパーを通じて正しくナローイング（narrowing）できるようになり、5つの組み込みexitコールだけでなく。

### ネガティブ

- 新たな解析コスト（WD7） — 有界、キャッシュされ、フェイルソフト。
- 相互再帰は有界サマリー処理（WD5）が必要;誤って実装すると発散またはミスキャッシュになる。
- WD4は意図的に閉じたまま。ユーザーは「なぜrigorはこのタイポしたself呼び出しを検出しないのか？」と合理的に問うだろう — 答え（メタプログラミングの寛容性）は文書化されなければならず、スライス4がその問いが再開される場所。

### 持ち越し

- スライス4（閉じたクラスのself呼び出しに対する`undefined-method`）は見送りであり、却下ではない。
- **[ADR-34](../34-toplevel-unresolved-self-call-default/)（2026-05-29）**がWD4のトップレベルスライスを別の決定として切り出した: トップレベルスコープ（囲む`def` / `class` / `module`なし）でのunresolved implicit-self呼び出しは、ADR-17の`pre_eval:`エスケープハッチが整い次第デフォルトで警告を発する。このADRのWD4が閉じたままにしたクラスボディ / `def`ボディのケースは閉じたままである; ADR-34はそれを明示的に再開しない。

## 実装のスライス分け（提案）

需要駆動;このADRによってスケジュールされるスライスはない。

### スライス1 — 同一クラスself呼び出し解決 — 2026-05-20実装済み

implicit-self呼び出しを囲むクラスの*自身の*インスタンスメソッド定義とファイルのトップレベル定義に対して解決;解決されたメソッドの推論された戻り型を採用。祖先はまだなし、新しい診断もなし。

**実装状況.**配線ギャップは小さかった:`discovered_def_nodes` — クラスごと / トップレベルの`メソッド → DefNode`テーブルであり、`ScopeIndexer`が構築し、エンジン既存の手続き間解決（`Scope#user_def_for` / `#top_level_def_for`）が参照する — はトップレベルの呼び出しサイトスコープには持ち込まれていたが、すべてのクラス / メソッドボディ向けに構築されるフレッシュスコープ（`StatementEvaluator#build_fresh_body_scope`）には持ち込まれていなかった。持ち込むことでメソッドボディ内部での解決が有効化される。

スライスのスケッチからの2つの逸脱、どちらも測定によって強制:

- **保守的な採用ゲート.**解決されたすべての戻り型を無条件に採用すると`rigor check lib`が16件の診断で綺麗でなくなった — 解決された精密な型（`Nominal[Manifest]`、不精密な`Hash`形状、`nil`）が、`self`呼び出しが`Dynamic[top]`のままだった間はマスクされていた呼び出し先戻り型推論の*既存の*不精密さに対して、下流の厳密なチェック（`undefined-method`、引数型、フローフォールディング）を発火させてしまうためだ。そこで`ExpressionTyper#adoptable_self_call_result?`が採用をゲート:クラスボディ内部（`scope.self_type`がセット）では解決された型が`Bot`のときのみ採用;トップレベル / DSLブロックスコープ（`self_type`がnil — スライス1以前のサーフェス）では無変更で採用。`Bot`のケースはADRの動機となるバグであり、FPなしと証明可能（`Bot`結果は正しい終端ブランチナローイングのみを有効化できる）。クラスボディ内部での一般的な非`Bot`採用は呼び出し先戻り型推論が十分精密になるまで見送り — 再評価トリガー1でゲートされる独自のフォローアップ。
- **再帰ガードの再キー（WD5）.** `infer_user_method_return`ガードは`(receiver, method, arg_types)`でキーされていた;self呼び出しが解決されると、`module_function`モジュール（`Acceptance#accepts` → `accepts_one` → `accepts_dynamic` → `accepts`）を通じた相互再帰が、持ち込まれた引数型がレベルごとに異なるたびに無制限に再帰した — `SystemStackError`。ガードは今`(receiver, method)`でキーされている:サマリーがまだ計算中のメソッドはそのサイクルで`Dynamic[top]`に解決する、WD5が規定する通り。別個のメソッドサマリーインデックスは追加されなかった — （今は正しい）ガードのもとでの既存の呼び出しごとの再ウォークがスライス1のメカニズム;メモ化されたサマリーインデックスはWD7のパフォーマンスフォローアップのまま。

### スライス2 — 祖先 + クロスファイル — 2026-05-21実装済み

解決をスーパークラスチェーンとインクルードされたモジュールに拡張し、プロジェクトファイルをまたいで（クラス発見レジストリ）とRBS既知の祖先に対して。

**実装状況.** `ExpressionTyper#try_user_method_inference`が、同一クラスの`user_def_for`ミス時にユーザークラスのスーパークラスチェーンを歩く（`resolve_user_def_through_ancestors`）。チェーンは新しい`Scope#discovered_superclasses`マップ（`class → 書かれた通りのスーパークラス名`）を通じて辿られる。as-writtenの名前は`resolve_ancestor_class_name`によって呼び出しサイトで修飾クラスに解決される（サブクラスの各囲むネームスペース、最も内側が最初という`Module.nesting`定数ルックアップに従う）。クロスファイル解決は新しいプロジェクトプレパス`ScopeIndexer.discovered_def_index_for_paths`に乗る — すべてのプロジェクトファイルを一度歩いてマージされた`discovered_def_nodes`テーブルとマージされたスーパークラスマップを返す;`Runner`がそれをすでにクロスファイル`discovered_classes`をシードしているのと同様に各ファイルスコープにシードする。ウォークは深さ制限（20）でサイクルガードされている。

**インクルード / プリペンドされたモジュール**は同日（2026-05-21）のフォローアップで追加された。`ScopeIndexer.build_discovered_includes`がクラス / モジュールごとに、それが`include` / `prepend`するモジュール（定数引数のみ）を記録する。クロスファイル`discovered_def_index_for_paths`がdef-nodeとスーパークラスマップの隣にincludeマップを返す;`Runner`が`Scope#discovered_includes` / `#includes_of`経由でシードする。`resolve_user_def_through_ancestors`はユーザークラスの完全な祖先セット（インクルード / プリペンドされたモジュール（推移的）が最初、次にスーパークラス）に対する幅優先ウォーク — サイクルガードされノード数上限あり（100）。`extend`は追跡されない:シングルトンメソッドを追加するものであり、インスタンス側チェーンのスコープ外。

スライスのスケッチからのスコープ逸脱:

- **RBS既知の祖先はここでは歩かない.** `MethodDispatcher` RBSティアは`try_user_method_inference`の*前に*実行されRBS既知の祖先のメソッドをすでに解決する;ユーザークラスウォークは単に祖先名がプロジェクト発見クラス / モジュールに解決しないときに停止する。よって「RBS既知の祖先も」は既存のディスパッチ順序によって満たされており、ウォーク内の新しいコードによってではない。

採用はスライス1の`adoptable_self_call_result?`（クラスボディ内部では`Bot`戻りのみを採用）でゲートされたまま、よってFPプロファイルはスライス1から変わらない:祖先ガードヘルパーが`bot`に解決してナローイング（スライス3と合わせて）;非`Bot`の祖先戻りは`Dynamic[top]`のまま。フィクスチャ:`spec/integration/fixtures/inherited_guard.rb`（スーパークラス、同一ファイル） + `included_module_guard.rb`（ミックスイン、同一ファイル） + 2つのクロスファイル`Runner` spec。

### スライス3 — `bot`ブランチフローナローイング（WD6） — 2026-05-20実装済み

`eval_if` / `eval_unless`の終端ブランチ検出を構文的な`EXIT_CALL_NAMES`リストから「ブランチの推論型が`Bot`」に一般化。発散するヘルパーを通じたガード節がナローイングするようになる。

**実装状況.** `StatementEvaluator#branch_terminates?(branch_node, branch_type)`が既存の構文的`branch_unconditionally_exits?`と`branch_type.is_a?(Type::Bot)`をORする。ブランチ型は`eval_if` / `eval_unless`によってすでに計算されており（`then_type` / `else_type`）、それぞれの早期リターンナローイングテスト両方が単に`branch_unconditionally_exits?`を`branch_terminates?`に交換する — 余分な評価なし。スライスの順序外でスライス1と一緒に実装された、なぜならその2つは直接合成するから:スライス1が同一クラス / トップレベルのガードヘルパーを`bot`に解決させ、スライス3がその`bot`がフォールスルーをナローイングさせる。祖先ヘルパーのケース（Mastodonの`fail_with_message`クラスタ）はスライス2まで待つ。統合フィクスチャ:`spec/integration/fixtures/bot_branch_guard.rb`。

フォローアップ（2026-05-21）が同じ一般化を`eval_and_or`に拡張した:`&&` / `||`は独立した構文的`branch_unconditionally_exits?`チェックを持っていたため、`x = src or fail_now`（裸の`raise`ではなく発散するヘルパー）がナローイングしなかった。`eval_and_or`は今RHSを最初に評価して`branch_terminates?`を使うため、`Bot`型のRHSがLHSをその残存エッジにナローイングする。フィクスチャ:`spec/integration/fixtures/or_guard_narrowing.rb`。

### スライス4（ゲート — 別個の決定） — 閉じたクラスself呼び出しに対する診断

WD4に従って閉じたクラスself呼び出しに対する`call.undefined-method` / `call.wrong-arity` / 引数型。メタプログラミングが多いコードベースに対する独自のFP評価でゲート。

**アテンプト1（2026-06-05） — プロトタイプ後に差し戻し；check-rules再実装経路は健全でない**。`call.self-undefined-method`ルールを`CheckRules`内で完全に実装した：インスタンスメソッドボディ内部のimplicit-self呼び出しに対して、囲むクラスが「自信を持って閉じている」かつ名前が何にも解決しないときに発火させる。閉じていると判定するゲートはあえて超保守的に設計した — **プロジェクトスーパークラスなし、インクルードなし**、`method_missing` / `respond_to_missing?`なし、プラグインの`open_receivers:`（ADR-26）なし、というプロジェクトクラスが対象 — そして解決はクラス自身の`def`、その`discovered_methods`テーブル、自身のRBSサーフェス（`Reflection.instance_method_definition`）、ならびに`Object` / `Kernel`サーフェスを確認した。ターゲットspecは（8件）すべてパスした。

**次に必須のミニコーパスゲート（Rigor自身の`lib`にルールを走らせる）がクリーンなコードに対して135件のフォルスポジティブを生成した**。漏れたクラス — いずれも`CheckRules`から見えなかった実在するメソッド:

- **`module_function`モジュール** — `Inference::Narrowing`（31件）、`Type::Combinator`（24件）：`self`が`Nominal[Module]`に型付けされるが、モジュールの`module_function` defがcheck-rulesの解決が参照した場所にない兄弟self呼び出し（`case_when_scopes`が`analyse`を呼ぶ等）。
- **`Data.define` / `Struct.new`クラス** — `GemResolver::Resolved`、`RuleCatalog::Entry`、`CoverageReport`など：アドホックな`Reflection`プローブが解決しなかった合成メンバーアクセサ（`gem_name`、`id`、`total`）は実在するメソッド。
- **テンプレートメソッドモジュール / バリューセマンティクス** — `CLI::Renderable`（`render_text`は抽象メソッドでincluderが実装）、`ValueSemantics::ClassMethods`：閉じていると判定するゲートの「インクルードなし」チェックが*呼び出し先*側から捕捉できないミックスイン契約（contract）を通じてのみ存在するメソッド。

**結論：`CheckRules`でself呼び出し解決を再実装してはならない**。エンジンは精度の観点でこれらのケースをすでにすべて正しく解決している（ADR-24スライス1〜2：`module_function`、合成アクセサ、祖先ウォーク） — FPはルール内の二番目のより弱い解決経路がエンジンの実際の経路と乖離したことだけに起因する。正しい設計（ADR-46 / ADR-47の教訓：「評価時に収集し、再計算しない」）は**評価時レコーダー**である：エンジン自身のself呼び出し解決が`Dynamic[top]`に落ちる単一のポイント（`ExpressionTyper#try_user_method_inference`ミス＋ディスパッチャーRBSティアミス）で未解決の呼び出しノードを記録し、`CheckRules`は閉じているゲートとコーパスFPトリアージだけを適用する。これによりエンジンの実際のメソッドセットが再利用されるため、`module_function` / `Data.define` / ミックスインメソッドが「未解決」としてルールに到達することはない。これはより大がかりな手術（ディスパッチのチョークポイントに`DependencyRecorder`のように通すレコーダー）であり、デフォルトONにする前にWD4コーパスゲートも依然必要だが — 偽陽性の規律を守る唯一の経路である。差し戻したプロトタイプのspecと135件FP内訳が次のアテンプトのエビデンスとなる。

**スライス4a（2026-06-05） — 評価時レコーダー、LANDED、デフォルトOFF、ルールはまだなし**。`Analysis::SelfCallResolutionRecorder`は、implicit-self呼び出しがすべての解決ティアを使い果たす単一のエンジンチョークポイント（`ExpressionTyper#call_type_for` → `fallback_for`）で、何にも解決しない呼び出しを記録する。`Runner.new(record_self_calls: true)`でオプトイン;通常の実行では整数の読み出し（`active?`）1回のコストのみで何も記録しない。純粋に観察的であり、診断はバイト単位で同一。

アテンプト1からの決定的な設計修正:チョークポイントは*型*ミスで発火するため、**存在する**がエンジンが戻り型を推論できないメソッド — まさにアテンプト1のFPを引き起こした`module_function`の兄弟（`Narrowing`、`Combinator`）— を過剰捕捉する。そこでレコーダーは記録前にエンジン自身の**存在**シグナルでゲートする:`resolve_user_def_through_ancestors`（def存在、祖先対応）+ **両方**の`:instance`と`:singleton`の下での`Scope#discovered_method?`（`module_function`はdefを`:singleton`で登録する）。記録は「収集し、再計算しない」の教訓に従いエンジンの実際の解決を再利用するため、プロジェクトシグナルが見られる任意の方法で解決可能な名前はレコーダーに到達しない。

`ScopeIndexer`の付随修正が`class X < Data.define(:a, …)` / `< Struct.new(:a, …)`の合成メンバーリーダーを発見済みメソッド存在テーブル（`record_meta_superclass_members`）に登録する — これらは`def` / `attr_*`宣言を持たないため、この修正なしでは未解決として読み取られる。

**ミニコーパス計測（Rigorの`lib`、265ファイル）:**生のレコーダー467ミス → 存在ガード + メンバー登録後**15件**、アテンプト1のFPクラスは**ゼロ**（`Narrowing` 31→0、`Combinator` 24→0）。残存15件はタイポを含まない予測通りの既約難ケース:`attr_reader(*CONSTANT)`スプラットアクセサ（`FlowContribution`、名前が静的に決定不可）、メソッドをincluderが実装するテンプレートメソッドモジュール（`CLI::Renderable`）、ミックスイン契約メソッドセット（`ValueSemantics::ClassMethods`）。これらがルールスライスがまだ必要とする閉じたクラスゲートを定義する:モジュール / ミックスイン契約レシーバーと、スプラット属性または`Data` / `Struct`（メンバーモデリングなし）の形状を持つクラスを除外する。ブロック形式の`Const = Data.define(:a) do … end`のメンバーは`self`を`Object`として読み取る（エンジンはメタブロックメソッド向けに`self`を定数に再バインドしない）ため、その過剰捕捉は`Object` — 自信を持って閉じられることは決してない — に落ち、ゲートが自動的にフィルタリングする。

**スライス4ルール（2026-06-05） — `call.self-undefined-method`、LANDED、`:off`でship済み**。`CheckRules`コレクター（`self_undefined_method_diagnostics`）がレコーダースナップショット（`Runner#analyze_file_body` → `CheckRules.diagnose(self_call_misses:)`経由でファイルごとにスレッド処理され、ルールが発火シビアリティに解決するときのみ記録が有効）を消費し、閉じているかどうかのポリシーのみを適用する — 解決を再計算しない。v1ゲートは最も保守的な自信を持って閉じられた形状:**スタンドアロンプロジェクトクラス** — スーパークラスも`include` / `prepend`もなし、したがってファイル内のメソッドサーフェスは完全 — かつ`module`（ミックスイン契約）でなく、`method_missing`を定義せず、動的な`attr_*(*splat)`アクセサなし（`SelfClosednessScanner`、同一ファイルに対する1パスのAST走査）、かつADR-26のオープンレシーバーでない。これにより残存15件が包含される:モジュールとスプラット属性 / `Data` / `Struct`クラスはすべて除外され、後者はスーパークラスなし節によっても除外される。

Rigorの`lib`で検証:ルールは**ゼロ**件のフォルスポジティブを発火 — かつ1件の実在の潜在バグを検出（`BlockParameterBinder#bind_trailing_positionals`が未定義の`required_name`を呼び出していたため、`|a, *b, c|`形状のブロックパラメータが`NoMethodError`を発生させていた;修正済み）。`:warning`で作成されているが、すべてのプロファイルで`:off`にマッピングされており、`severity_overrides:`でオプトイン。

**残存:**デフォルトON前の外部WD4コーパスFPゲート、次にスーパークラス / インクルードチェーンへのゲート拡張（各々、エンジンが完全な祖先チェーンを解決済みと確認することが必要 — その完全性をレコーダーで記録し、同じ「収集し、再計算しない」経路を使う）。

## 再評価トリガー

1. **スライス1/2が`inference-budgets.md`エンベロープを超えて解析のwall-clockを測定可能に退行させる** → WD7を締め、より多くの作業をキャッシュ / プレパスに押し込む。
2. **スライス4への需要**（ユーザーが`self`呼び出しのタイポ検出を求める）が代表的なサーベイでメタプログラミングFPリスクを上回る → スライス4を閉じたクラスゲートでスケジュール。
3. **メソッドサマリーサイクルがミスキャッシュされることが観察される** → WD5の有界パス / 不動点処理を再訪する。

## 参考文献

- [ADR-4](../4-type-inference-engine/) — この解決が差し込む推論エンジン。
- [ADR-5](../5-robustness-principle/) — 不確実なディスパッチに対する寛容性（WD3 / WD4）。
- [ADR-6](../6-cache-persistence-backend/) — サマリーインデックスが乗るキャッシュ（WD5 / WD7）。
- [`docs/type-specification/control-flow-analysis.md`](../../type-specification/control-flow-analysis/) — WD6が拡張するナローイングサーフェス。
- [`docs/type-specification/inference-budgets.md`](../../type-specification/inference-budgets/) — バジェットエンベロープ（WD5 / WD7）。
- [`docs/notes/20260519-oss-library-survey.md`](../../notes/20260519-oss-library-survey/) — このADRがクローズする最大のFPクラスタを持つMastodonサーベイ。
