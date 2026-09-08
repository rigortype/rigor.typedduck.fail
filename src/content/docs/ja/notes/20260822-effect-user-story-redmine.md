---
title: "エフェクトシステム —— Redmineでの初採用者ユーザーストーリー（2026-08-22）"
description: "rigortype/rigor docs/notes/20260822-effect-user-story-redmine.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260822-effect-user-story-redmine.md"
sourcePath: "docs/notes/20260822-effect-user-story-redmine.md"
sourceSha: "2f03231b0c80e74e450289953a15307b7aca5877bd63d82c6dc7d138eb7693be"
sourceCommit: "bed65a462b04db02312f208b9dda2dda3a26ef13"
translationStatus: "translated"
sidebar:
  order: 20266822
---

ADR-103のエフェクトシステムを、これを一度も見たことのない有能なRuby/Rails開発者として、調査チェックアウト`rigor-survey/redmine`（Rigor 0.3.4、RedmineのGemfileには一度も追加していない）に対して実行したウォークスルー。参照したのはユーザーが到達できる資料だけである: `rigor help`、`rigor <cmd> --help`、`docs/manual/`、そしてCLI自身の出力。挙動の解釈のために`lib/`は開いていない。

Redmineのチェックアウトには、以前の調査作業による`.rigor.dist.yml`がすでに存在していた（設定ランク2なので自動的に拾われる）;`.rigor.yml`は存在しなかった。セッション中に書かれたものすべて（`.rigor.yml`、`.rigor-effects.yml`、`.rigor/cache`、編集した2つの`app/models/*.rb`、一時的な`sig/`）は削除した;調査チェックアウトでの`git status --porcelain`はセッション前のスナップショットとバイト同一であり、rigorツリーはクリーンである。

---

## ステップ1 —— 発見

```
$ rigor help
  effects    Report each method's effect labels, and the committed effect snapshot
             (ADR-103, opt-in; effects update/check/diff/explain)

$ rigor effects --help
Usage: rigor effects [options] [paths]

With no subcommand, prints one line per method: its proven effect labels and whether that
list is exhaustive.

Subcommands (the committed effect snapshot, ADR-103 WD7):
  update      Write the snapshot to effects.snapshot.path. Commit it; review its diff.
  check       Recompute and compare; exits 1 on drift, 0 when fresh.
  diff        The same comparison, never gating.
  explain     The shortest edge path behind a reach change (--symbol KEY for one unit).

Run `rigor effects <subcommand> --help` for subcommand options.
```

採用者がここから学べること: コマンドが存在すること、オプトインであること、サブコマンドが4つあること。欠けているもの: **オプトインの方法**（どちらのヘルプテキストも`effects: {}`を名指さない）、**エフェクトラベル（effect label）とは何か**、そして**語彙が何か**。

`rigor effects --help`は`[options]`と印字しながらオプションを**ゼロ個**しか列挙せず、一方で各サブコマンドの`--help`は5〜6個を列挙する。`--full`・`--format`・`--config`・`--no-tolerated-effects`は第02章で素の動詞向けに文書化されているが、CLIからは見えない。

両方のヘルプ文字列と、マニュアルの4つの記述が**ADR-103**を引用する。`rigor docs --list`が出荷するのは`install`・`manual/*`・`handbook/*`——ADRはなく、`type-specification/`もない。したがって:

```
$ rigor docs type-specification/effect-labels
Unknown doc: type-specification/effect-labels
```

第02章（`the label vocabulary is [the effect-labels specification](../../type-specification/effect-labels/)`）と第16章（`a comma-separated list of bare [effect labels](../../type-specification/effect-labels/)`）はどちらも、インストールされたgemが持っていないファイルへ読者を差し向ける。**ユーザーが到達できるエフェクトラベルの一覧はどこにも存在しない**。マニュアル自身の`README.md`の目次はエフェクトに一切触れない;マニュアルをgrepすると、この語を含むのは第02・03・04・08・12・15・16・17章と3つのプラグインページだけで、第11章（CI）に含まれる回数はゼロである。

## ステップ2 —— 最初の実行

```
$ rigor effects              # .rigor.dist.yml, no effects: block (implicit empty)
real  0m10.362s
31191 lines on stdout
```

その31,191行の内訳:

| | 個数 | 割合 |
| --- | --- | --- |
| メソッド行 | 4,223 | 13.5% |
| インデントされた未解決理由行 | 26,968 | 86.5% |
| ` …?`（非網羅的、not exhaustive）を運ぶ行 | 3,930 | **行の93.1%** |
| 網羅的な行 | 293 | 6.9% |
| ちょうど`Foo#bar: [] …?`と読める行——証明済みラベルなし、宣言レーンなし | **1,627** | **行の38.5%** |
| `≤ [...]`の宣言レーンを運ぶ行 | 1,320 | 31.3% |

レポート全体での未解決理由のヒストグラム:

```
15652  unresolved-self-call
 8912  dynamic-receiver
 1340  unknown-ownership
  685  dynamic-send
  249  template-not-analysed
  130  opaque-callable
```

典型的な行:

```
AccountController#activation_email: [io.net, mutate.instance, mutate.local, mutate.self, nondet.random] ≤ [global.read, io, io.db.read, io.db.write, mutate, rails.flash.write, rails.i18n.translate, rails.response.write, rails.session.read, rails.session.write] …?
    dynamic-receiver
    dynamic-receiver (external_gem_without_rbs)
    dynamic-receiver (inferred_return_untyped)
    dynamic-receiver (unsupported_syntax)
    dynamic-send
    unknown-ownership
    unresolved-self-call (action)
    unresolved-self-call (headers)
    … 8 more
```

採用者がここで得る観察:

- ヘッダーなし、フッターなし、合計なし、ページャーなし、`--limit`なし。3.1万行が端末に着弾する。
- 行はキーのアルファベット順でソートされるので、「どのコントローラーがネットワークに到達するか」——マニュアルがこれで答えられると言う問い——を問うことができない。`--label`も`--only-exhaustive`もソートオプションもない。パス引数は機能する（`rigor effects app/models/change.rb` → 3行）が、それがレポートを扱いやすくする方法だと案内するものは何もない。
- 1,627行は文字どおり何も言っていない。マニュアルの省略規則（「網羅的で、`mutate.local`を超えるものを何も証明しないときは省略」）は、はるかに大きい「非網羅的で何も証明しない」クラスをカバーしない。
- **宣言レーン（declared lane）には来歴（provenance）がない**。第02章の実例は`Gateways::Client#fetch: [] ≤ [io.net.http] …?` / `    plugin-attribution (Acme::Http.get)`を示す。31,191行の実出力の中で、文字列`plugin-attribution`は**0回**現れるが、1,320行は`≤`句を運ぶ。Redmineの設定には`effects.attribution:`が一切ないので、それらの主張のすべてはプラグインから来た——そしてレポートは、どのプラグインが、どの呼び出しについての主張なのかを決して言わない。
- 第02章は宣言レーンを「今日のところ、見えないgemメソッドのためにあなたが書いた`effects.attribution:`表」と説明する。プラグインを備えたRailsアプリでは、それは端的に出どころではない。
- 信頼性の面: `AuthSource#save: [] ≤ [io.db.read]`、同様に`save!`・`update!`・`decrement!`・`touch`。「`save`はデータベースを読む」と書かれ、書き込みがないのを読んだRails開発者はツールを信用しなくなるが、理由を問うCLIのアフォーダンスを持たない。

無関係だが、このターゲットに対するすべての実行で再現する（stderr、既存）:

```
rigor: RBS definition build failed for `Date`: RBS::DuplicatedMethodDefinitionError:
  rbs-4.1.1/stdlib/date/0/date.rbs:1485 ::Date#to_time has duplicated definitions in
  plugins/rigor-activesupport-core-ext/sig/active_support/core_ext.rbs:602
```

rbs 4.1.1で`rigor-activesupport-core-ext`を使うあらゆるプロジェクトで、`Date`と`DateTime`は`Dynamic[top]`に劣化する。エフェクトの発見ではないが、この調査ターゲットとあらゆるRails採用者を黙って劣化させる。

## ステップ3 —— スナップショット

```
$ rigor effects update
rigor: wrote .rigor-effects.yml (1529 method(s), 0 reach entries)
rigor: note — `effects.snapshot.reach:` is empty, so the snapshot records `methods:` only.
real  0m0.925s
```

ファイル: 5,940行、293,276バイト。

| | 値 |
| --- | --- |
| メソッドキー | 1,529（レポートの4,223行に対して——母集団が異なり、説明はない） |
| `unresolved:`を運ぶエントリー | 1,082 |
| `unresolved:`配列に費やされるバイト | **293,276中144,771 = 49.4%** |
| 最長の単一`unresolved:`行 | 821文字 |
| `reach:`エントリー | 0 |

これをコミットするか？`methods:`/`declared:`の半分はイエス——マニュアルが主張するschema.rbのアナロジーそのものだ。`unresolved:`の半分はノー: バイトの半分は、Rigorのアップグレードのたびに、そして無関係なコード変更のたびに揺れる推論品質のメタデータであり、どのレビュアーも読まない821文字の単一行に載っている。

既定のスナップショットには**`reach:`表がまったくない**ので、売り文句——「どのコントローラーがネットワークに到達するか、どのジョブが書き込むか、どのプレゼンターがクエリするか」——は箱から出してすぐには起きない。注記はreachが空だと言うが、直すために何を書けばよいかは**言わない**。

また、`config_digest: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"`は`{}`のSHA-256なので、暗黙のブロックと明示的な`effects: {}`は一致する——良い点であり、そこに偽の再生成はない。

同じメソッドキーに2つの異なる答え、それらが異なる問いであることを示す視覚的な手掛かりはなし:

```
report   AccountController#activation_email: [io.net, mutate.instance, mutate.local, mutate.self, nondet.random] ≤ [global.read, io, io.db.read, …]
snapshot AccountController#activation_email:  effects: []   declared: ["io","mutate","mutate.self","rails.response.write","rails.session.read","rails.session.write"]
```

マニュアルは推移的vs直接を散文で説明するが、2つのサーフェスは使用の現場で何のシグナルも与えない。

### 現実的な編集

`app/models/change.rb`の`Change#init_path`に監査ログの書き込みを追加した:

```rb
  def init_path
    self.path ||= ""
    File.open(Rails.root.join("log", "change_audit.log"), "a") do |f|
      f.puts("#{Time.now.utc.iso8601} #{changeset_id} #{path}")
    end
  end
```

```
$ rigor effects check        # exit 1
Effect drift against .rigor-effects.yml:

methods:
  Change#init_path  + io.fs.write
  Change#init_path  + nondet.time
  Change#init_path  exhaustive → not

Run `rigor effects update` and commit the result if this change is intended.

$ rigor effects diff         # identical text, exit 0
$ rigor effects explain      # exit 0
methods:
  Change#init_path [io.fs.write] ← catalogue:File#puts
  Change#init_path [nondet.time] ← catalogue:Time.now
```

**これはこの製品の一番良い部分だ**。正確で、短く、帰属可能で、終了コードも正しい（パイプなしで確認: テキストは1、`--format=json`は1、`--no-tolerated-effects`は1）。残る摩擦:

- ドリフトレポートは**`file:line`を運ばない**。`Change#init_path`はレビュアーをgrepに向かわせる。
- `explain`は3つのドリフト行のうち2つをカバーする。`exhaustive → not`——読者が最も理解できないもの——はどのコマンドでも説明されない。
- 失敗フッターは`rigor effects update`だけに誘導する。マニュアルの物語では作者はまず`rigor effects explain`を実行するのに、CLIはそれに決して触れない。
- `rigor effects explain --symbol "Nope#nope"`は**`Nothing to explain.`と印字して0で終了する**。タイポしたシンボルは、エフェクトを持たないシンボルと区別がつかない。

## ステップ4 —— アノテーション

第16章に従って、実際のRedmineの2ファイルにrbs-inlineアノテーションを書いた（プラグインは不要;先頭の`# rbs_inline: enabled`で十分だった）。

`effects:`ブロックなしの場合——文書化されたとおりで、心底良い:

```
app/models/anonymous_user.rb:31:1: info: Effect annotations (`%a{pure}` / `%a{rigor:v1:effect …}`) are
present in your project's signatures, but `.rigor.yml` carries no `effects:` block, so effect collection
never runs and nothing checks them — they are documentation, not a contract. Add `effects: {}` …
```

`effects: {}`ありの場合:

```
app/models/anonymous_user.rb:31:1: info: Effect envelope on AnonymousUser#available_custom_fields names
io.bd.read, which is not a known effect label (did you mean io.db.read?); the annotation now bounds nothing.

app/models/change.rb:34:1: warning: Method Change#init_path performs mutate.self (receiver-mutation),
but is declared %a{pure} at app/models/change.rb:5, so mutate.self exceeds the envelope.
```

`AnonymousUser#logged?`（`def logged?; false end`）への`%a{pure}`——沈黙。正しいラウンドトリップだ。

2つの重い発見:

1. **`effect.envelope-exceeded`はrbs-inlineアノテーションについて偽の宣言行を報告する**。アノテーションは33行目にあったが、メッセージは5行目——GPLの著作権コメント——を言う。空行を10行追加すると`def`は34行目から44行目へ動き、診断位置はそれを追跡したが、宣言サイトは**5行目に固定されたまま**だった。同じエンベロープを代わりに`sig/effects_probe.rbs`に書くと、正しい`declared %a{pure} at sig/effects_probe.rbs:2`が得られた。つまりこれは、第16章が同格として提示するrbs-inlineレーンに固有である。

2. **エフェクト診断はルールIDなしで印字される**。上のどのメッセージもピリオドで終わる;隣の行のプラグイン警告は`[plugin.activerecord.load-error]`で終わる。最初に`effect\.`をgrepしたときは何も返らず、機能が壊れていると結論しかけた。第03章自身の実例は`… exceeds the envelope. [effect.envelope-exceeded]`を示し、第04章は読者にこれらのルールをIDで`disable:`するよう教える——CLIが決して印字しないIDで。

軽度: `.rbs`で1つのメソッドにエンベロープを掛けるには、アノテーションを運ぶためだけにその型シグネチャ全体（`def init_path: () -> untyped`）を書かされる。rbs-inlineレーンではそうならない。

マニュアルの一文に値することがもう1つ: レポート行が`[] ≤ [global.read, rails.i18n.translate]`と読める`AnonymousUser#name`への`%a{pure}`は**沈黙**を保つ——宣言ラベルは決して診断を発火させない。ADR-103に照らして正しく、使用の現場では完全に直感に反する。

## ステップ5 —— ポリシー

`effects.tolerated:`のタイポ——良い。did-you-mean付きだが、位置がキーではなく`.rigor.yml:1:1`である:

```
.rigor.yml:1:1: info: `effects.tolerated:` in .rigor.yml names telemtry, which is not a known effect
label (did you mean telemetry?); the entry discharges nothing.
```

`effects.envelopes:`のメッセージ品質は**素晴らしい**——この機能で最良の診断だ:

```
app/helpers/activities_helper.rb:34:1: warning: Method ActivitiesHelper#activity_authors_options_for_select
performs mutate.self (ivar-write via Query#users → Query#principals), but is declared effect: [] at
.rigor.yml effects.envelopes[0], so mutate.self exceeds the envelope.

app/helpers/avatars_helper.rb:23:1: warning: Method AvatarsHelper#assignee_avatar performs exit
(Kernel#abort via AvatarsHelper#avatar → AvatarsHelper#gravatar_avatar_tag →
GravatarHelper::PublicMethods#gravatar → GravatarHelper::PublicMethods#gravatar_url →
GravatarHelper::PublicMethods#gravatar_api_url → Redmine::Configuration.[] →
Redmine::Configuration.load), but is declared effect: [] at .rigor.yml effects.envelopes[0], so exit
exceeds the envelope.
```

問題は量である。1つのスタンザ——

```yaml
effects:
  envelopes:
    - match: "app/helpers/**/*.rb"
      effect: []
```

——が**18ファイルにわたる343個の警告**を、（メソッド、ラベル）の組ごとに1つずつ生む:

```
 91 mutate.self      86 mutate.static    83 io.fs.read     38 mutate.instance
 16 global.read      13 io.output.stderr 13 exit            3 nondet.time
```

`tolerated: [mutate.self]`は起点ごとに正しく解消する: 343 → 252。`--no-tolerated-effects`は343に戻す。第03章の「初日から報われるサーフェス」は初日の実際の姿を控えめに言い過ぎている: 読者が章からコピーする最初のスタンザは343個の警告を着弾させ、そこからどう減らしていくかの助言はない。

globの意味論は問題ない——`app/helpers/*.rb`と`app/helpers/**/*.rb`はどちらも343を与えるので、`**/`はゼロ個のセグメントに確かにマッチし、第03章の`app/presenters/**/*.rb`の例はフラットなディレクトリで機能する。

### 2つの設定エラーが生のバックトレースでクラッシュする

第03章の旗艦のRails推奨は`reach: [rails]`である。このプロジェクトでは:

```
$ rigor effects update
bundler: failed to load command: exe/rigor
lib/rigor/effects/snapshot.rb:168:in 'block in Rigor::Effects::Snapshot.expand_reach':
  effects.snapshot.reach names no registered entry-point preset: "rails"
  (registered: ["rails-controllers", "rails-mailers"]; a preset is named by the plugin that
  models the framework, so listing that plugin is what registers it)
  (Rigor::Effects::EntryPoints::Error)
    … 30 more frames of Rigor, Bundler, Thor and rubygems internals
```

例外の中の文は良い。その周りのすべては`lib/rigor/effects/snapshot.rb`を名指す30フレームのスタックトレースだ。不正な形の帰属キーでも同じ:

```
$ rigor effects update       # effects.attribution: {"Net::HTTP get": [io.net.http]}
lib/rigor/configuration.rb:812:in 'block in Rigor::Configuration#coerce_effects_attribution':
  effects.attribution key is not a method key (`Owner#method` / `Owner.method`): "Net::HTTP get"
  (ArgumentError)
```

第03章はどちらも「ロードエラー」/「スナップショットのビルド時のエラー」だと言う——真実だが、それらは`rigor:`メッセージではなく、捕捉されないRubyの例外として届けられる。

関連するドキュメントバグ: 第03章は`` `rails` — registered by [`rigor-railties`](../plugins/rigor-rails/) ``と書く。`rigor plugin list`は`rigor-railties`と`rigor-rails`が2つの異なるプラグインであることを確認させ、`rigor-railties`のマニュアルページは`manual/plugins/rigor-rails.md`として収められている。リンクは正しく、読者はプラグインの名前が`rigor-rails`だと結論するだろう。

`reach: [rails-controllers]`は機能する: **482個の`reach:`エントリー**。

### 再生成イベントは自身の説明を埋もれさせる

`reach: [rails-controllers]`でスナップショットを書き、その後`effects: {}`で判定すると:

```
Effect drift against .rigor-effects.yml:

regeneration:
  config_digest: "99e03992…" → "44136fa3…"

reach:
  AccountController#account_locked  -symbol [] …?
  AccountController#account_pending  -symbol [] …?
  … 480 more
```

ツールはこれが再生成イベントだと知っていて、すべてを説明する1行を印字し、それでも482個の`-symbol`行を印字する。

## ステップ6 —— CIの物語と、それを壊すバグ

**第11章（`Running Rigor in CI`）には「effect」という語が含まれない**。4つの`docs/manual/ci-templates/*.yml`のどれにも含まれない。テンプレートもスニペットもキャッシュキーの指針もない。マニュアル全体で唯一のCIの指示は第02章の一文だ:「`rigor effects check`をCIに追加せよ」。

それだけならドキュメントの欠落で済む。これを製品バグにするのは、第11章§*実行間で解析キャッシュを永続化する*——推奨されるCIセットアップ——と、これの組み合わせだ:

```
$ rm -rf .rigor/cache
STEP1 cold, effects:{} only  -> 0 envelope diagnostics
   (add effects.envelopes: app/helpers/**/*.rb, effect: [])
STEP2 warm, envelopes ADDED  -> 0     ← 0.48s, cache hit
$ rm -rf .rigor/cache
STEP3 cold, same config      -> 343   ← 9.9s
STEP4 warm again             -> 0     ← same config that just produced 343
```

エンベロープ以外の診断は正しくラウンドトリップする（コールド5、ウォーム5）。**`effect.envelope-exceeded`はコールド実行でのみ生成され、以後のすべてのキャッシュヒットで黙って落とされる**。ヘルパーを`touch`しても戻らない;本物の内容変更だけが、そのファイルについて再発行させる。

帰結:

- ポリシースタンザを書き、`rigor check`を実行し、何も見なかったユーザーは、自分のレイヤーがクリーンだと結論する。これは、この機能が存在する理由そのもののシナリオにおける、静かな偽陰性である。
- キャッシュを永続化したCI——第11章がセットアップせよと教えるもの——では、機能のエンベロープ半分は一度も発火しない。
- 第12章（キャッシュ）はエフェクトにどこでも触れないので、読者に警告するものは何もない。

スナップショット半分は影響を受けない: `rigor effects check`はウォームキャッシュ上で0.9秒で`Change#init_path`のドリフトを正しく検出した。この機能の2つの半分は正反対のキャッシュ挙動を持ち、そう述べるものは何もない。

---

## ランク付けした摩擦リスト

### 製品が変わらなければならないもの

1. **`effect.envelope-exceeded`はウォームキャッシュで消える——同一の設定で343 → 0**。機能の診断半分は最初の実行より後のすべての実行で不活性であり、第11章が推奨する永続化キャッシュ付きのCIでも不活性である;ユーザーはその沈黙を「自分のレイヤーはクリーン」と読む。*最小の修正:* `rigor effects check`がすでにしているのとまったく同様に、キャッシュヒット時にキャッシュ済みのエフェクトサマリー（effect summary）からエンベロープ判定を復元する;それができないなら、`effects.envelopes:`の変更が診断キャッシュを無効化するようにし、ウォーム実行はエンベロープの発見を運べないと文書化する。

2. **ユーザーが到達できるエフェクトラベルの一覧がない**。第02章と第16章はどちらも`../type-specification/effect-labels.md`にリンクする;`rigor docs`は`type-specification/`もADRも出荷しないので、`io.fs.read`・`nondet.time`・`mutate.static`・`exit`が何を意味するのか、完全な集合が何なのかを誰も知ることができない——一方で`envelopes:`・`tolerated:`・`attribution:`・`labels:`はどれもラベルを打ち込むことを要求する。*最小の修正:* `rigor effects --list-labels`（または`rigor explain effect.*`）、加えて新しいマニュアル章の語彙表。

3. **エフェクト診断がルールIDなしで印字される**。`[effect.envelope-exceeded]` / `[effect.unknown-label]` / `[effect.annotations-unchecked]`は決して現れず、隣のプラグイン警告は自身のIDを運ぶ。grepすることができず、第03章と第04章はどちらもIDを示すか指示する。*最小の修正:*他のあらゆるルールと同様にIDサフィックスを発行する。

4. **`effect.envelope-exceeded`がrbs-inlineアノテーションについて間違った行を指す**——33行目のアノテーションについて「declared `%a{pure}` at app/models/change.rb:5」（5行目は著作権コメント）。`.rbs`レーンは正しい。*最小の修正:* rbs-inlineコメント自身のソース位置を宣言参照へ運ぶ。

5. **2つの設定ミスが30フレームのRubyバックトレースでクラッシュする**——未登録のプリセットを名指す`reach:`（これは第03章の旗艦`reach: [rails]`だ）と、不正な形の`effects.attribution:`キー。例外の中のメッセージは良い。*最小の修正:*どちらも1行の`rigor:`エラーと非ゼロ終了にレスキューする。

6. **`rigor effects`は中規模のRailsアプリで31,191行をページングなしに印字し、その86.5%は未解決理由のノイズ、行の38.5%は内容ゼロ（`Foo#bar: [] …?`）である**。サマリーも`--limit`もフィルタもなく、順序はアルファベット順のみ。*最小の修正:*証明なし・宣言なしの行を`--full`の背後に隠し、理由ブロックを個数に畳んで`--why`で展開できるようにし、合計を載せたフッターを印字する。

7. **実プロジェクトでは宣言レーンに来歴がない**。1,320行が`≤ [...]`を運び、文字列`plugin-attribution`はゼロ回現れる。読者はどのプラグインが何を主張したのか判別できず、第02章の例は判別できると約束している。*最小の修正:*マニュアルがすでに文書化している`plugin-attribution (Owner#method)`理由行を発行する。

8. **既定の設定での`rigor effects update`は`reach:`エントリーがゼロのスナップショットを書く**——看板の利益が箱から出してすぐには起きない——そして、そう述べる注記は何を書けばよいかを言わない。*最小の修正:*注記に`effects.snapshot.reach:`と、このプロジェクトに実際に登録されているプリセットを名指させる（項目5のクラッシュは、それらの列挙方法をすでに知っている）。

9. **スナップショットのバイトの半分が`unresolved:`配列**（293,276中144,771）で、最長821文字の行に載る。レビュアーが読めない半分であり、無関係な変更で揺れる半分である。*最小の修正:*完全な起点リストではなく安定した個数/サマリーを記録するか、`--full`の背後へ移す。

10. **再生成イベントがそれでも完全な差分を印字する**——1つの`config_digest:`行に続いて482個の`-symbol`行。*最小の修正:*ダイジェストが動いたときは、再生成の行と個数を印字して止まる。

11. **`rigor effects --help`はオプションをゼロ個列挙する**が、各サブコマンドは5〜6個列挙する。*最小の修正:* `--full`・`--format`・`--config`を列挙する。

12. **`rigor effects explain --symbol <typo>`は`Nothing to explain.`と印字して0で終了する**。*最小の修正:*「そのようなシンボルはない」（非ゼロ終了）と「エフェクトなし」を区別する。

13. **ドリフトレポートは`file:line`を運ばず、**`explain`はラベル行をカバーするが`exhaustive → not`は決してカバーしない。*最小の修正:*各ドリフト行に定義サイトを追加する;網羅性を失わせた呼び出しを`explain`が名指せるようにする。

14. **`check`の失敗フッターは`rigor effects update`だけに誘導し、**マニュアル自身の物語が最初に手を伸ばすコマンドである`rigor effects explain`には決して誘導しない。

15. **`rigor help`と両方のヘルプ文字列は、インストールされたどのgemも持っていない文書への唯一のポインタとしてADR-103を引用する**。代わりにマニュアル章を引用せよ。

16. *（エフェクトではないが、すべての実行で再現）* `rigor-activesupport-core-ext`がrbs 4.1.1の`stdlib/date`と`::Date#to_time`で衝突し、このプラグインを使うすべてのRails採用者について`Date`と`DateTime`を`Dynamic[top]`に劣化させる。

### マニュアルが説明しなければならないもの

1. **エフェクトの章が存在せず、マニュアルREADMEの目次はエフェクトに一切触れない**。4つのサブコマンド、4つの診断、7つの設定キー、2つのアノテーション形式を持つ機能が、第02・03・16章をgrepすべきだとすでに知っていることによってしか発見できない。

2. **第11章（CI）には「effect」という語がゼロ回しか現れず、4つのCIテンプレートのどれにも現れない**。CIの物語の全体は第02章の一文だ。`rigor effects check`のステップ、どのキャッシュを永続化して安全かの記述、そして`--baseline <(git show origin/main:.rigor-effects.yml)`のトリックをパーレンの中から昇格させることが必要だ。

3. **直接vs推移的は唯一最難のアイデアなのに、散文で一度だけ、それが噛みつく場所から遠く離れて説明される**。同じメソッドキーがレポートでは5つのラベルを印字し、スナップショットではゼロ個を印字する;読者はそのコントラストを、どちらのサーフェスよりも前に、両方の出力を並べて見せられる必要がある。

4. **行の93.1%に付く`…?`は、脚注ではなく章の冒頭の期待値である必要がある**。「これらのエフェクト、そしておそらくそれ以上」がRailsアプリの通常状態だ;網羅性を期待する読者は、ツールが機能していないと結論するだろう。

5. **宣言レーンには独自の節が必要だ**。`≤ [global.read, rails.i18n.translate]`を目に見えて運ぶメソッドが`%a{pure}`の束縛を沈黙のまま通過することは、正しく、驚きであり、使用の現場で文書化されていない。

6. **第03章は`envelopes:`の初日を控えめに言い過ぎている**。「初日から報われるサーフェス」は1つのスタンザから343個の警告を生んだ。この章には実際の数字と、減らしていくレシピが必要だ: まず`rigor effects <そのパス>`、次に`tolerated:`、それからスタンザを狭める。

7. **第03章の`rigor-railties`リンクは`plugins/rigor-rails.md`を指す**。2つの異なるプラグインであり、読者は間違ったほうを列挙して項目5のバックトレースを得るだろう。

8. **第02章は宣言レーンを「あなたが書いた`effects.attribution:`表」に帰す**。プラグインを備えたRailsアプリでは、それは完全にプラグイン由来だ。CLIと矛盾している。

9. **第03章の実例のエンベロープ出力は`[effect.envelope-exceeded]`で終わるが、CLIはIDを印字しない。さらに第03章の例のパスは相対だが、プロジェクト全体の実行は絶対パスを印字する**。1つのコードブロックに2つの逐語出力の不一致。

10. **すでに純粋なメソッドをどう見つけるかを何も教えてくれない**。レポートもスナップショットも、まさに`%a{pure}`を付ける価値のあるメソッドを省略する;`--full`はそれを460個（`AnonymousUser#logged?`・`ApplicationController#api_request?`・…）表面化させるが、そう述べるものは何もない。

11. **`.rbs`で1つのメソッドにアノテーションを付けると、そのシグネチャを書かされることを何も教えてくれない**。rbs-inline形式ではそうならないのに。

12. **第12章（キャッシュ）はエフェクトに決して触れない**ので、機能の2つの半分がウォームキャッシュの下で正反対に振る舞うことを警告するものは何もない。

---

## マニュアル章が私に教えるべきだったこと、必要だった順に

1. **エフェクトラベルとは何か、そして語彙の全体を、表で**。ルート（`io`・`mutate`・`nondet`・`global`・`exit`・`telemetry`、加えて`rails.*`のようなプラグインルート）、「`save`に`io.db.read`」が何を意味するか、そして`mutate.local`はどこでも自由であること。これなしには、この章の他の何も読めない。
2. **オンにする方法を、一行で**: `.rigor.yml`の`effects: {}`、そして他の何もオンにしないこと——アノテーションでも、CLIフラグでもない。`rigor effects`単体はそれなしで走ることも言う。
3. **最初の実行を、正直に**。実際のRedmineの数字を見せる: 4,223行、93%がヘッジ付き、3.1万行。そしてすぐに、使えるようにする2つの方法——パス引数と、ラベルを持つ行だけを読むこと——を見せる。
4. **行が何を意味するかを、フィールドごとに**、この順で: キー、証明済みリスト、` …?`とそれが通常である理由、`≤`の宣言レーンとその出どころ、それからインデントされた理由。
5. **直接vs推移的を、並べて**、`rigor effects`が印字する1つのメソッドと、スナップショットが印字する同じメソッドで。
6. **スナップショット**。`update`、何をコミットするか、差分がどう見えるか、`unresolved:`とは何で、読むべきでないこと。それから`reach:`——既定では何も記録しないことと、プラグインが実際に登録したプリセットの選び方を含めて。
7. **レビューループを実例として**: 編集、`check`の出力、`explain`の出力、`update`、コミット。これはこの機能で最も強い素材であり、売り込めるだけ早い位置に属する。
8. **CI**: `effects check`のステップ、`--baseline <(git show origin/main:…)`のボットパターン、終了コード、そしてどのキャッシュが永続化して安全か。
9. **エンベロープとアノテーション**は最後に。実際の労力を要する部分だからだ: まず`effects.envelopes:`（RBSは不要。ただし実アプリでは数百の警告が着弾することと減らし方を言う）、次に`%a{pure}` / `%a{rigor:v1:effect …}`、それから`tolerated:`とその起点ごとの規則、そしてgem向けの`attribution:`。
10. **診断の節**で4つのルールすべてをIDとともに名指し、`disable:`と`severity_overrides:`を使えるようにする。
