---
title: "モジュールシングルトンのファサード: クロスファイル発見シード"
description: "rigortype/rigor docs/notes/20260710-module-singleton-cross-file-seed.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260710-module-singleton-cross-file-seed.md"
sourcePath: "docs/notes/20260710-module-singleton-cross-file-seed.md"
sourceSha: "91ea82cbcf63f63cd77f79fb98593ea3b7b476b3f42b139e783563570830c069"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
sidebar:
  order: 20266710
---

GitLab改善計画の**P2項目6**（[`20260708-gitlab-type-coverage-improvement-plan.md`](../20260708-gitlab-type-coverage-improvement-plan/)）のための設計ノートで、
実装前の2026-07-10に書かれた。ここで決着する決定は
[ADR-57](../../adr/57-self-call-return-adoption/)のWDとして記録されており、そのtier-4はすでにモジュールシングルトンの
解決を「独立したスライス── 同じ裁定プロトコル」として名指ししている。

## 信じられていたこと、そして実際に真であること

再開ブックマークと`ScopeIndexer`ソースコメントはともに、これを健全でないディスパッチのフォールスルーによって
ブロックされた**P1規模のエンジンスライス**として位置づけていた。直接の実測（2026-07-10）はその位置づけの大半を
覆す。以下の4つのファクトはいずれもプローブで再現されたものであり、読解から推論したものではない。

**F1 ── モジュールはファイル単位ではすでに`Singleton[M]`である**。 `ScopeIndexer#record_declarations`
（`scope_indexer.rb:2220`）は`Prism::ModuleNode`と`Prism::ClassNode`を同一に登録する。プロジェクト全体の
シードである`collect_class_decls`（`:2141`）だけがモジュールを除外している。つまりモジュール定数の*型付けセマンティクス*は
あらゆるリリースで出荷されあらゆるコーパス上で動作してきた。欠けているのは純粋にクロスファイルの到達だけである。

```
$ ScopeIndexer.discovered_classes_for_paths(["a.rb", "b.rb"])
#=> {"Widget" => singleton(Widget)}          # module Feature is absent
$ ScopeIndexer.discovered_def_index_for_paths(...)[:singleton_def_nodes]
#=> {"Feature" => [:enabled?], "Widget" => [:build]}   # both present
```

**F2 ── 除外コメントが述べるブロッカーはもはや再現しない**。そのコメント（`:1992`）は、`singleton(M)`を
サーフェスさせると未発見の`M.x`が`Kernel#x`にフォールスルーし、「`Kernel.select → Array[String]`のような
驚くべき型を招く」と警告している。そうはならない。Kernelのプライベートインスタンスメソッド
（`select`、`puts`、`raise`、`open`、`load`、`p`、`exit`、…）は`Singleton[M]`レシーバー上では何にも解決しない。
約60個のObject/Kernel/Module/Classのサーフェスを素の`module Empty; end`に対して列挙すると、28個の解決するメソッドが
得られ、そのうち**26個はモジュールオブジェクトにとって正しい**
（`name → String`、`ancestors → Array[Module]`、`instance_methods → Array[Symbol]`、
`freeze → singleton(Empty)`、`frozen? → bool`、`hash → Integer`、…）。

誤っている2個は、`Singleton[Object]`フォールバックレシーバーを通じて漏れ出す`Class`専用メソッドである。
`Empty.new → Nominal[Empty]`と`Empty.superclass → Class?`である。どちらも実行時に`NoMethodError`を投げる呼び出しなので、
どちらも**動作するコード**を誤型付けすることはできない── これらはこのプロジェクトを統べる偽陽性のエンベロープの外側にある。
これらはこの変更（F1）よりも前から存在するので、シードがこれらを導入するわけではない。1ファイルからプロジェクトへと
その到達を広げるだけである。

**F3 ── プロジェクト側のシングルトンボディはすでに寛容なフォールバックに勝る**。 `try_user_class_fallback`
（`MethodDispatcher.dispatch`内の最終tier）が`ExpressionTyper#try_singleton_method_inference`が走る前に呼び出しを
横取りするという懸念は根拠がない。`try_discovered_method`は`singleton_def_for`が再型付け可能なボディを保持しているときは
辞退し、その後Objectフォールバックは外れる。ファイル内でプローブすると、`module Conf; def self.load = 42; end; Conf.load`は
`Kernel#load`の答えではなく`42`に型付けされる。`extend self`のボディも、`try_user_method_inference`内の
インスタンスdef照会を通じて解決する。

**F4 ── `call.undefined-method`のサーフェスは開かない**。このルールは`Reflection.rbs_class_known?`
（`check_rules.rb:564`）でゲートされており、これはRBS専用で意図的に`discovered_classes`を無視する。プロジェクトモジュールは
RBSを持たないので、それをシードしてもルールが発火することはない。Rigorが発見しない`extend self` / `delegate` /
`class_methods do`の寄与因子は、したがって診断ではなく`Dynamic`に劣化する。

**F5 ── RBS既知の名前はシャドウできない**。 `resolve_constant_name`
（`expression_typer.rb:403`）は`discovered_classes`より*前に*`env.singleton_for_name(candidate)`を照会するので、
プロジェクトの`module Math` / `module Comparable`の再オープンはRBSの答えを保つ。

## 決定

モジュール宣言をプロジェクト全体の発見シードに、クラスと同じ条件で登録する──
すなわち非対称性を削除する。新しいメカニズムを構築しない。

シードの範囲は**すべてのモジュール宣言**であり、`record_declarations`と厳密に一致する。名前空間のみの
`module Gitlab`が`singleton(Gitlab)`として登録されるのはすでにファイル単位の挙動であり、代替案（シングルトンまたは
インスタンスの`def`を持つモジュールのみをシードする）は何も生まない。それでも`Feature`と`Gitlab::Utils`は登録する一方で、
読み手がファイル単位のルールと並べて頭の中に保持しなければならない、2つ目の相違する登録ルールを導入することになる。
ファイル単位のパスとの対称性こそが、この変更をレビュー可能にする性質である。

### これが満たさなければならない基準

ADR-57 WD2が拘束する。**ゲートは裁定された発火クラスごとに開くのであって、一括ではない**。デルタ内のすべての診断は
*genuine*（新たに解決された型が正しく、その発火がearnされている）か*artifact*（型が誤っている── エンジンのバグ）に
分類され、artifactはその根本で修正され、変更を無理に通すために発火クラスを抑制することはない。

### 予期すべき発火クラス

モジュールシングルトンの戻り値のクロスファイル採用は、呼び出し先のボディが畳み込まれることを意味し、些末なボディは
`Type::Constant`に畳み込まれる。`if Feature.enabled?(:x)`に流入する`Constant[true]`は動作するコード上で
`flow.always-truthy-condition`を発火させる── これはADR-78がその根本で修正したのと同じ過剰畳み込みの形であり、ADR-57
補遺の`degrade_if_overridable`ゲートがオーバーライドされたテンプレートメソッドをカバーするものである。オーバーライドする
ものがないモジュールシングルトンメソッドは、構造上そのゲートを逃れる。

これはFPリスクが現実である唯一のクラスであり、このノートがパッチより前に存在する理由である。それは境界づけられている。
畳み込みが定数に到達するのはボディ全体が畳み込まれるときだけであり、実際の`Feature.enabled?`（引数、委譲、動的ディスパッチ）は
そうならない。裁定パスはそれを仮定するのではなく計測する。

## スライス

1. **モジュールをシードする**── `collect_class_decls`内の1つのブランチ、加えていまや偽となった除外コメントを上記の
   計測されたファクトで置き換える。ゲート: `make verify`、次いで手持ちのコーパス（Mastodon `app/models`、haml `lib`、
   kramdown `lib`、Redmine、GitLab `app`）にわたる診断diff。
2. ADR-57 WD2に従い**デルタを裁定する**。artifactクラスをその根本で修正する。上記の
   `flow.always-truthy-condition`の形が予測される容疑者である。
3. GitLab（`Feature.enabled?`だけで695箇所の未保護サイト）で**保護を再計測**し、診断の移動を伴わない比率の移動について
   Mastodon / Redmineをクロスチェックする。

意図的に**スコープ外**とし、再トリアージされないよう記録するもの:

- **モジュールのための`Singleton[Object]`フォールバックレシーバー**（F2の`Empty.new` / `Empty.superclass`）。
  それを修正するには`Scope::DiscoveryIndex`内のクラス対モジュールの種別と、Module型のフォールバックレシーバーが必要である。
  実行時に例外を投げるコードを誤型付けするだけなので、これはFP作業ではなく精度の衛生である。需要ゲート型。
- **シングルトン祖先解決**（`extend SomeModule`、継承されたクラスメソッド）── すでにADR-57 tier 4によって将来のスライスと
  名指しされており、本スライスによっては変わらない。
- **`extend self`の`singleton_def_nodes`への登録**。F3はインスタンスdef照会がすでにこれらのボディを解決することを示す。
  明示的な登録は精度の磨き上げである。

## 結果（2026-07-10）

**保護**。 GitLab `lib`（4,748ファイル、`lib/feature.rb`と`Gitlab::Utils`ファミリーの両方を含むスコープ）、
`coverage --protection --format json`、master対branch:

| | 保護済み | 未保護 | 合計 | 比率 |
|---|---:|---:|---:|---:|
| before | 23,044 | 70,752 | 93,796 | 0.2457 |
| after | 25,856 | 67,940 | 93,796 | **0.2757** |

**+3.00 pp、+2,812箇所の保護サイト**、分母は同一（分母の一致それ自体が、2回の実行が同じサイトをスキャンしたことの
チェックになっている）。規模の目安として、ADR-67の呼び出しサイトパラメーター推論レバー全体はMastodonで+0.75 ppを
計測した。

スコープが調査の`app lib`ではなく`lib`なのは、同じ週にランドしたP0/P1スライス（`structure.sql`、ストロングパラメーター、
AS core-ext）も保護を動かしたためで、記録された0.2836というapp+lib値はもはや有効な「before」ではない。ここでは両側とも
再計測している。

**診断**。 haml、kramdown、liquid、rgl、Mastodon `app/models`、そしてGitLab `app`はすべてバイト単位で同一である
（`check --no-cache --no-baseline`）。2つの発火が裁定を要した:

- rigor自身の`lib`（2エラー）── `CLI::DiagnosticFormats.render`は`else`のない`case/when`なので、いまや推論される戻り値は
  `String | nil`である一方、両方の呼び出しサイトは`.supports?`でゲートし`output.empty?`を呼ぶ。採用された型は正しかった。
  不変条件は現実だがエンコードされていなかった。認識されないフォーマットで例外を投げることで根本を修正。セルフチェックはクリーン。
- Redmine（`possible nil receiver`警告が+1、72 → 73）── `Redmine::CodesetUtil.replace_invalid_utf8`が
  いまやクロスファイルで正直な`String | nil`に解決する。呼び出しサイトはActiveSupportの`login.present?`ガードを通じてのみ
  nilアームを除外している。

Redmineの発火の根本原因は**この変更とは独立している**。
`Narrowing#resolve_rbs_extended_method`はメソッドの`rigor:v1:predicate-if-true`ファクトを
`Nominal` / `Singleton`レシーバーについてのみ読み取る（`rbs_extended_class_name`は`Union`に対してnilを返す）ので、
ユニオンレシーバーはそもそも述語ファクトを一切受け取らない── そして`Object#present?`はそもそもそのようなアノテーションを
持たない。6行で再現され、アノテーションを追加しても修正されないことが確認された。`present?`ガードの下で`Dynamic`を
`T | nil`に変える精度作業はいずれもこれを表面化させる。

これは独自のスライスであり独自のコーパスゲートを持つ。新しいナローイングルールが新しい偽陽性のエンベロープを伴うからである。
一般形はアノテーションを一切必要としない。ユニオンレシーバー上の引数ゼロ・ブロックなしの述語呼び出しのtruthyエッジで、
RBS戻り値型が文字どおり`false`であるすべてのアーム（`NilClass#present?: () -> false`がすでにそう言っている）を落とし、
falseyエッジではミラーを行う（`NilClass#blank?: () -> true`）。これは`blank?`、`presence`、そしてnilに対する将来の
`-> false`述語すべてを無償でカバーする。

## コスト

`ADR-57`自身のゲートオープンコストは`rigor check --no-cache lib`でコールドウォール約+12 %だった。新たに解決された
呼び出し先の本質的な再型付けによるものである。モジュールのシードはクロスファイルのモジュールシングルトン呼び出しに対して
同じ扉を開くので、`make bench-perf`は形式ではなくゲートである。それは通過する。29.17 Mの上限に対して28.52 Mの
アロケーション（ベースライン27.78 M）、`lib`ウォール8.3 s。rigor自身の`lib`はクラス優勢なので、新たに解決される
呼び出し先の母数はここでは小さい。GitLab `lib`のcheckウォールはノイズの範囲内で変化しなかった。
