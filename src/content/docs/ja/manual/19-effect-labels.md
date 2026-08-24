---
title: "エフェクトラベル — コードが何を「する」か"
description: "rigortype/rigor docs/manual/19-effect-labels.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/19-effect-labels.md"
sourcePath: "docs/manual/19-effect-labels.md"
sourceSha: "8c2525a57326c37d86628502548ee84166ff6dd498af7eaf0477a8dc82210786"
sourceCommit: "bed65a462b04db02312f208b9dda2dda3a26ef13"
translationStatus: "translated"
sidebar:
  order: 9019
---

Rigorの通常の問いは、メソッドが何を**返す**かです。エフェクトラベル（effect label）はもう1つの問い——何を**する**か——に答えます。`Reports::Nightly#perform`は真偽値を返します;それがソケットを開き、時計を読み、データベースに書き込むことは、そのメソッドについての別のファクトであり、プルリクエストがジョブに触れるときにレビュアーが欲しいのはたいていそちらです。

コマンドリファレンス——すべてのフラグ、すべてのサブコマンド——は[CLIリファレンス](../02-cli-reference/#rigor-effects)に、すべての設定キーは[設定 §エフェクトラベル](../03-configuration/#effect-labels)にあります。この章はその周りのワークフローです: ラベルとは何か、実際のアプリケーションで出力が本当はどう見えるか、そして3つのサーフェスを採用する順序。

**このほとんどすべては、あなたが間違っていたと告げるものではありません**。レポートとスナップショットは観測です: コードが何をするかを述べるのであって、それをしたのが誤りだったと述べるのではありません——エフェクトラベルが`rigor check`の発見としてではなく独立したコマンドとして出荷される理由です。`rigor effects check`は確かにビルドを失敗させますが、それはあなたがコミットした記録からのドリフトに対してであり、Rigorが下した判断に対しては決してありません。Rigorが判断する唯一の場所はこの章の最後の節、あなた自身が宣言する境界です。

## 3つのサーフェス、1回の収集パス

Rigorはエフェクトを実行ごとに一度収集し、それを3つの方法で見せます。読者は絶えずこれらを混同するので、何よりも先に確定しておく価値があります:

| サーフェス | コマンド | 答える問い | 失敗しうるか？ |
| --- | --- | --- | --- |
| **レポート** | `rigor effects` | 「すべてのメソッドは、いま何をするか？」 | 決して——常に0で終了 |
| **スナップショット** | `rigor effects update` / `check` / `diff` / `explain` | 「最後に合意してから何が変わったか？」 | `check`は**あらゆる**ドリフトで1で終了 |
| **宣言された境界** | `.rigor.yml`の`effects.envelopes:`、シグネチャ内の`%a{pure}` / `%a{rigor:v1:effect …}` | 「このメソッド自身のコードは、してよいと述べたことを超えたか？」 | `rigor check`の診断、**証明済み**ラベルに対してのみ |

レポートは読むためのもの。スナップショットはレビューするためのもの——エフェクトにとってのスナップショットは、スキーマにとっての`db/schema.rb`です: コミットする生成ファイルであり、その*差分*こそがアーティファクトです。宣言された境界は、Rigorが読んだコードについて契約（contract）を主張する場所であり、エフェクトがRigorの他の部分と同じように振る舞う唯一の場所です。

失敗しうる2つのサーフェスは異なる問いに答え、その差があなたのポリシーがどちらに属するかを決めます:

| ポリシーが…なら | 書き方 | 理由 |
| --- | --- | --- |
| 「このメソッドは計算以外何もしない」 | 宣言された境界 | `mutate.*`・`io.fs.*`・`nondet.*`・`global.*`・`exit`はあなた自身のコードから証明されるので、それらへの境界は発火する |
| 「この層はデータベース／キャッシュ／メーラー／キューに触れてはならない」 | コミットされたスナップショット＋`rigor effects check` | それらのラベルは、Rigorが読まなかったフレームワークをモデル化するプラグインから来るので、どんな境界もそれらに対して発火できない——[境界に見えるものと見えないもの](#境界に見えるものと見えないもの)を参照 |

この順序で採用してください。それぞれは、次がなくても有用です。

## ラベルの語彙

ラベルは小文字のセグメントのドットパスです: `io`・`io.net.http`・`nondet.time`。あるラベルを名指す境界は、その**下**にあるすべてを認め、その上は何も認めません——`io`は`io.db.read`をカバーし、`io.db.read`は`io.db`をカバーしません。マッチングはセグメント全体の上で行われるので、`io`が`iota`をカバーすることは決してありません。

これが出荷される語彙の全体です:

| ルート | ラベル | 意味 |
| --- | --- | --- |
| `io` | `io`, `io.db`, `io.db.read`, `io.db.write`, `io.db.transaction`, `io.fs`, `io.fs.read`, `io.fs.write`, `io.net`, `io.net.http`, `io.input`, `io.output`, `io.output.stdout`, `io.output.stderr`, `io.output.buffer`, `io.output.header`, `io.ipc`, `io.process`, `io.signal` | プロセスの外にある何か——ファイル、ソケット、データベース、ターミナル、サブプロセス——と話す |
| `mutate` | `mutate`, `mutate.local`, `mutate.self`, `mutate.instance`, `mutate.static` | 状態をその場で変更する: フレームが確保したオブジェクト（`local`）、レシーバー自身の状態（`self`）、他のオブジェクト（`instance`）、またはクラスレベルの状態（`static`） |
| `nondet` | `nondet`, `nondet.random`, `nondet.time` | 同一の2回の実行の間で異なるものを読む |
| `global` | `global.read`, `global.write` | プロセス全体の状態——`ENV`・`$stdout`・クラス変数 |
| `exit` | `exit` | プロセスを終了させうる（`exit`・`abort`） |
| `ffi` | `ffi` | 外部関数インターフェースを通じて外へ呼び出す |
| 意味 | `telemetry`, `email.send`, `job.enqueue`, `cache.read`, `cache.write` | トランスポートではなくアプリケーションレベルの意味——ポリシーが実際に名指すもの |
| `failure` | `failure`, `failure.environment`, `failure.input`, `failure.resource` | 兄弟のPHPアナライザーである[Steins](https://github.com/rigortype/steins)向けに書かれたポリシーがここでパースできるように登録されている。Rigorは決して生成せず、これを名指す境界は空虚に満たされる |

いま内面化しておくべきことが2つあります。以下のすべてがそれに依存するからです:

- **`mutate.local`は無償です**。メソッド自身が確保し決して外に出さなかったオブジェクトを変更することは、誰も境界を設けるエフェクトではなく、あらゆるエフェクトエンベロープ（effect envelope）がそれを許容します。唯一のラベルが`mutate.local`であるメソッドは純粋メソッドです。
- **プラグインはルートを追加します**。`rails.i18n.translate`・`rails.session.write`・`rails.flash.write`をはじめ`rails.*`の残りはRailsプラグインから来るのであって、出荷されるファイルからではありません。あなた自身のプロジェクトは[`effects.labels:`](../03-configuration/#effect-labels)で好きなルートを開けます。

インストール済みのRigorは、プラグインとあなた自身の`effects.labels:`が開いたものも含めて、この全部を出力できます:

```sh
rigor effects --list-labels
```

何も解析しないので瞬時であり、「`effects.envelopes:`に何を書いてよいか」——4つの設定キーと2つのアノテーション形式のすべてがあなたに問う問い——への答えです。

完全な文法、包摂規則、レジストリの進化ポリシーは、gemが出荷しないエフェクトラベル仕様で規範的です:
<https://rigor.typedduck.fail/type-specification/effect-labels/>。

## オンにする

`.rigor.yml`に1行:

```yaml
effects: {}
```

ブロックの*存在*がスイッチです;空のハッシュは「すべてのサブキーが既定値」を意味します。他の何も収集をオンにしません——特に、シグネチャ内の`%a{pure}`アノテーションはオンにしません。1つのファイルの1行がプロジェクトのあらゆる実行をより高価にしてはならないからです。アノテーションがありブロックがないプロジェクトは、実行ごとに一度そう告げられます:

```
sig/slug.rbs:2:1: info: Effect annotations (`%a{pure}` / `%a{rigor:v1:effect …}`) are present in your project's signatures, but `.rigor.yml` carries no `effects:` block, so effect collection never runs and nothing checks them — they are documentation, not a contract. Add `effects: {}` to have Rigor prove what your methods do and check these bounds against it (ADR-103); an annotation alone never turns collection on, because that would make one line in one signature file more expensive for every run of the project.
```

**v0.4.0**からは収集が既定になります: `effects:`キーをまったく持たない設定は`effects: {}`として振る舞い、`effects: false`がオプトアウトの方法になります。`0.3.x`ラインでは`bleeding_edge: [effects-on-by-default]`でそれをプレビューできます。

これらすべてに1つだけ例外があります: `rigor effects`——素のレポート——は、設定したかどうかにかかわらず暗黙の空ブロックの下で走るので、何かにコミットする前に眺めてみることができます。

## レポート

```sh
rigor effects
```

実行する前に期待値を合わせておきましょう。[Redmine](https://www.redmine.org/)——`app`と`lib`にまたがる347の解析対象ファイル、6つのRailsプラグイン、自前のシグネチャなし——でのレポートは:

| | 件数 | 割合 |
| --- | --- | --- |
| 解析された単位 | 4,683 | |
| 既定で出力される行 | 2,730 | 単位の58% |
| 何も語らないため省略される行 | 1,953 | 42% |
| stdout上の行数 | 2,733 | （上記の行＋3行のフッター） |
| ` …?`で終わる出力行 | 2,468 | **行の90%** |
| `--full --why`での行数 | 34,680 | |

**90%がヘッジ付きというのはRailsアプリケーションの正常で健康な状態**であり、何かが壊れているサインではありません。Railsは膨大な量を実行時に解決し、Rigorは恐れたことではなく証明したことを報告します。すべてのメソッドに網羅的な答えを期待していたなら、章の最後ではなくここで期待を調整してください。

レポートはフッターで閉じ、フッターは2つのレーン（lane）を意図的に別々に数えます:

```
──
2730 of 4683 units printed; 1953 omitted (--full)
2183 carry a proven label · 1555 carry a declared (≤) one · 262 are exhaustive
```

この2つの数字は異なる力を持ち、この章の残りはその差についてです。**証明**（proven）ラベルはビルドを失敗させられます。**宣言**（declared）ラベルはできません——それはRigorが決して読まなかったフレームワークについてのプラグインの主張であり、それを強制するのはスナップショットです。

### 行の読み方

```
IssuesController#create: [global.read, io, mutate.instance, mutate.local, mutate.self, mutate.static] ≤ [email.send, job.enqueue, mutate, rails.flash.write, rails.i18n.translate, rails.response.write] …? (21 reasons, --why)
```

4つのフィールドがあり、4つの異なる問いに答えます:

1. **キー**——`Owner#instance_method`または`Owner.singleton_method`。行はこれでソートされます。
2. **証明リスト**——Rigorが呼び出しグラフを推移的に辿って*確立した*もの。`IssuesController#create`はその下のどこかでクラス変数を読み、ivarを書き、クラスレベルの状態を書き、自身のオブジェクトを変更します。診断が読むのは、これからもずっとこのレーンだけです。
3. **`≤`の宣言レーン**——Rigorが信頼するが読まなかったソースが*主張する*もの。それは主張であって決して証明ではなく、まさにその理由で証明ラベルとは分けて出力されます。フレームワークアプリケーションではこれは圧倒的に**プラグイン**の発言です: 上の`rails.flash.write`と`rails.i18n.translate`はAction Packとrails-i18nの行であって、あなたが書いた何かではありません。あなた自身の[`effects.attribution:`](../03-configuration/#effect-labels)の帰属（attribution）表も同じレーンに着地し、ほとんどのプロジェクトではプラグインよりはるかに少ない寄与です。宣言ラベルは証明ラベルと同様に呼び出しエッジを辿るので、帰属されたgem呼び出しの2ホップ上のコントローラーは、肩をすくめる代わりに主張を運びます。あなた自身が書いた行は、呼び出しを名指す`plugin-attribution (Owner.method)`の理由行を残します;バンドル済みプラグインが寄与した行は残しません。信頼された行は自身の汚染を解消するからです。
4. **` …?`**——「これらのエフェクト、そして**おそらくそれ以上**」。何かの呼び出しが解決できず、数字はそれが何種類あったかを述べます。`--why`は行の下にそれらを、各宣言ラベルの背後のプラグイン行とともに展開します:

   ```
   IssuesController#create: … …?
       dynamic-receiver (inferred_return_untyped)
       template-not-analysed (ActionController::Base#render)
       plugin:ActionController::Base#redirect_to → [mutate.self, rails.response.write]
   ```

   これらが既定で折りたたまれているのは、Redmineではフルレポートが出力する34,680行のうち30,000行を占めるからであり、多くの行を読んだ*後で*1つの行について問う問いに答えるものだからです。

2種類の行が既定で**省略**されます:

- `mutate.local`を超えて何も証明せず、何も主張しないメソッド——`%a{pure}`の読み;
- どちらのレーンにもラベルがなく、その下の何かが未解決だったと記録するためだけに存在するメソッド。Redmineではこれが1,953行で、フッターがそれを数えています。

`--full`は両方を出力します。しかし最初のグループは名指しで求める価値があります:

```sh
rigor effects --pure
```

Redmineで436メソッド。それらがあなたの`%a{pure}`候補——この章の最後の節への入り口です。

### 問いを投げる

**ラベルで**。この章の冒頭の問いを1コマンドで:

```sh
$ rigor effects --label io.net
Redmine::IMAP.check: [exit, global.read, io, io.fs.read, io.fs.write, io.net, …] ≤ [email.send, job.enqueue, …] …? (121 reasons, --why)
Redmine::POP3.check: …
WebhookEndpointValidator#validate_each: …
──
5 of 4683 units printed; 4678 not selected
```

`--label`はラベルとその下のすべてにマッチし——`--label io`は上の`io.net`の行も`io.fs.read`の行も選択します——そして**両方の**レーンを見ます。「何がネットワークと話すか」はあなたのコードについての問いであって、どちらのレーンがそれをたまたま知っているかについての問いではないからです。行自身の描画が2つを分けたまま保ちます。

**パスで**。

```
$ rigor effects app/controllers/issues_controller.rb
rigor: showing 20 of 4683 units, selected by app/controllers/issues_controller.rb;
       a path narrows the printing and not the analysis, so every label is the one
       the whole-project run reports
IssuesController#create: [global.read, io, mutate.instance, mutate.local, mutate.self, mutate.static] ≤ [email.send, job.enqueue, …] …?
```

これは**ビュー**であり、スコープではありません。Rigorは依然として設定された`paths:`を解析するので、出力される20行はプロジェクト全体の実行が出力するのと同じ20行です。それにはフル解析のコストがかかります——stderrの注記は、何を支払い何を得たかを知らせるためにあります——そしてそれが唯一の正直なやり方です: エフェクトサマリー（effect summary）は推移的なので、より少なく解析することはこのレポートをフィルタするのではなく、その中のすべての答えを下げてしまいます。メソッドを1つも名指さないパスは、空のレポートを出力する代わりにそう述べます。

**件数で**。`--limit N`は最初のN行を出力し、フッターがいくつ削ったかを述べます。

そして`grep`・`sort`・`jq`へパイプする`--format=json`はすべて依然として機能します——テキストは安定していてソート済みで、JSONペイロードはフッターが出力するのと同じ合計を運び、パスの注記はstderrに行くのでリダイレクトはレポートだけを得ます。

## 直接と推移的

同じメソッドキーが2つの場所に2つの異なる答えとともに現れます。これがこの機能の中で、あなたを最もつまずかせやすい唯一のアイデアです。Redmineでの一度の`rigor effects update`から:

```yaml
methods:
  "IssuesController#create":
    effects: []
    declared: ["mutate", "mutate.self", "rails.flash.write", "rails.response.write"]
    exhaustive: false

reach:
  "IssuesController#create":
    effects: ["global.read", "mutate.local", "mutate.self", "mutate.static"]
    declared: ["mutate", "rails.flash.write", "rails.i18n.translate", "rails.response.write"]
    exhaustive: false
```

- `methods:`は**直接**（direct）サマリーです——ブロックリテラルとカタログ化された呼び出しを含む、このメソッド自身の本体がすることであり、それが呼ぶプロジェクトメソッドがすることは含み*ません*。`effects: []`は、このコントローラーアクション自身の行は何も行わないと述べています;すべてはその下で起きます。
- `reach:`は**推移的**（transitive）フットプリントで、`rigor effects`がそのメソッドについて出力したものと同一です。

この分割は意図的です。直接エントリーは自身の行が変わったときにだけ動くので、その差分はそれを引き起こしたプルリクエストに帰属できます;推移的エントリーは影響範囲であり、葉の変更がファンアウトすることになっている場所です。`rigor effects`が推移的な数字を見せるのは、*読む*ときに欲しいのがそちらだからです;スナップショットが両方を記録するのは、レビューするときに両者が異なる仕方で失敗するからです。

## スナップショット

```sh
rigor effects update
```

```
rigor: wrote .rigor-effects.yml (1529 method(s), 0 reach entries)
rigor: note — `effects.snapshot.reach:` is empty, so the snapshot records `methods:` only (presets registered in this project: rails, rails-channels, rails-controllers, rails-jobs, rails-mailers).
```

この注記は*あなたの*プラグインが登録したプリセット名を列挙するので、修正はすでに出力された行そのものです: そのうちの1つを`effects.snapshot.reach:`に入れること。プラグインが何も登録しないプロジェクトには、代わりにそう告げられます。

このファイルをコミットしてください。そのヘッダーはRigorのバージョン、語彙のバージョン、`effects:`ブロックのダイジェストを固定するので、アップグレードやポリシーの編集は黙った再解釈ではなく*再生成イベント*として現れます:

```yaml
# .rigor-effects.yml — generated by `rigor effects update`. Commit it; review its diff.
schema: 1
rigor: "0.3.4"
vocabulary: 1
config_digest: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
methods:
  "Change#init_path":
    effects: ["mutate.self"]
```

ファイルを読むうえでの注意が2つ:

- **`unresolved:`配列は読まないでください**。それは推論品質のメタデータで、ファイルのバイト数の半分を占め、Rigorのアップグレードや無関係な編集で揺れます。`check`が`exhaustive → not`を出力できるようにするために存在します。レビュアーが読む行は`effects:`と`declared:`です。
- 自明なエントリーと合成されたエントリーは、レポートと同様に省かれます。`--full`はすべてを記録し、はるかに大きくはるかにノイズの多いファイルを生みます。

### `reach:`とエントリーポイントのプリセット

**空から始まり、それは意図的です**。Rigorは推測することもできます——`rigor-railties`がロードされたRailsアプリケーションでは`reach: [rails]`がほぼ確実に望みのものです——しかしスナップショットはあなたが合意し、その差分をレビューする記録であり、プラグインリストが変わったから内容が変わったスナップショットは、あなたが設定したものより悪いアーティファクトになってしまいます。だから`rigor effects update`は直接の半分を書き、あなたのプラグインが実際に登録したプリセットを名指し、ファイルにも同じヒントを残します:

```
# `reach:` is empty. It records the TRANSITIVE footprint at your entry points —
# what a controller action or a job causes, rather than what its own body does …
```


箱から出した状態では、スナップショットは**`reach:`表をまったく記録しません**——それが上の`0 reach entries`の注記が告げていることです。この機能が通常売り込まれる際の枠組みの問い（「どのコントローラーがネットワークに到達するか、どのジョブが書き込むか」）には、エントリーポイントを名指すことが必要です:

```yaml
effects:
  snapshot:
    reach: [rails-controllers]
```

各エントリーは、プロジェクト相対のglob（`**`がディレクトリ境界を越える唯一の方法）か、プラグインが登録した**プリセット**（preset）の名前です。Redmineではこのスタンザがスナップショットを0から482のリーチエントリーへ持っていきます。

プリセット名はフレームワークをモデル化するプラグインが登録するので、どの名前が存在するかはどのプラグインを列挙したかに依存します:

| プリセット | 登録するプラグイン | カバー範囲 |
| --- | --- | --- |
| `rails` | `rigor-railties` | `app/controllers/**`, `app/jobs/**`, `app/mailers/**`, `app/channels/**` |
| `rails-controllers` | `rigor-actionpack` | `app/controllers/**/*.rb` |
| `rails-jobs` | `rigor-activejob` | `app/jobs/**/*.rb` |
| `rails-mailers` | `rigor-actionmailer` | `app/mailers/**/*.rb` |
| `rails-channels` | `rigor-actioncable` | `app/channels/**/*.rb` |

Railsアプリで望みのものは`reach: [rails]`です——ただし`plugins:`に`rigor-railties`が必要で、何も登録しなかったプリセットを名指すことは、設定のロード時ではなくスナップショットが構築されるときのエラーです（プリセットを登録するプラグインはその設定*から*ロードされるからです）。このエラーが出たら、直すべきはプラグインリストです。

## レビューループ

ここが元を取る部分です。誰かがモデルに監査ログの書き込みを追加します:

```rb
  def init_path
    self.path ||= ""
    File.open(Rails.root.join("log", "change_audit.log"), "a") do |f|
      f.puts("#{Time.now.utc.iso8601} #{changeset_id} #{path}")
    end
  end
```

CIが`rigor effects check`を走らせ、終了コード1で失敗します:

```
Effect drift against .rigor-effects.yml:

methods:
  Change#init_path  + io.fs.write
  Change#init_path  + nondet.time
  Change#init_path  exhaustive → not

Run `rigor effects update` and commit the result if this change is intended.
```

`+ label`と`- label`は証明レーン;`≤+` / `≤-`は宣言レーン;`materialised`は宣言ラベルが証明済みになったこと;`exhaustive → not`は誰かがRigorの追えない呼び出しを導入したこと;`+symbol` / `-symbol`は現れたか消えたメソッドで、リネームはその1つずつです。

再生成する前に、理由を問いましょう:

```sh
rigor effects explain
```

```
methods:
  Change#init_path [io.fs.write] ← catalogue:File#puts
  Change#init_path [nondet.time] ← catalogue:Time.now
```

`--symbol KEY`は変更されたものの代わりに1つの単位を説明し、そのリーチ経路も出力します:

```
$ rigor effects explain --symbol "Change#init_path"
reach:
  Change#init_path → File#puts [io.fs.write]
  Change#init_path → receiver-mutation [mutate.self]
  Change#init_path → Time.now [nondet.time]
methods:
  Change#init_path [io.fs.write] ← catalogue:File#puts
  Change#init_path [mutate.self] ← construct:receiver-mutation
  Change#init_path [nondet.time] ← catalogue:Time.now
```

それから`rigor effects update`し、再生成されたファイルをコード変更と並べてコミットします。**意図はスナップショットをコミットすることで表現されます**。コードにアノテーションを付けることでではありません: レビュアーは、それを引き起こした変更の隣にある3行の差分を読み、頷くか押し返すかします。自身のコード差分を持たずにエフェクトを動かすバンドル更新もまったく同じゲートを通り、それこそ最も見る価値のあるケースです。

`rigor effects diff`は同一の比較を出力し、常に0で終了します——ローカルで、あるいはゲートしたくないレポーティングジョブで使ってください。

## CIで

[Rigorのジョブ](../11-ci/)に1ステップを足します。`rigor check`とは別の問いに答え、別の理由で失敗するので、別のステップです:

```yaml
# .github/workflows/rigor.yml
      - run: gem install rigortype
      - run: rigor check
      - run: rigor effects check
```

終了コード。すべてパイプなしで検証済みです:

| 状況 | `effects check` |
| --- | --- |
| スナップショットが一致 | `0` |
| `gate: symmetric`（既定）の下でのあらゆるドリフト | `1` |
| `gate: additions`の下で増加のみ | 追加は`1`、削除は`0` |
| 差が`effects.tolerated:`のラベルに限られる | `0`、`tolerated:`見出しの下に出力——`--strict-tolerated`で`1`になる |
| チェックアウトに`.rigor-effects.yml`がない | `1`、`rigor effects update`を実行するよう告げる`snapshot:`見出しの下で |

最後の行があなたを救う行です: コードを編集してスナップショットの再生成を忘れた人も、一度もコミットしなかった人も、同じ仕方で失敗します。

**ベースブランチに対するレビュー**。`--baseline`は設定されたファイル以外のファイルと比較します。これは、`master`がどれだけ古かろうと関係なく「このブランチが何を変えるか」をボットが報告する方法です:

```sh
rigor effects diff --baseline <(git show origin/main:.rigor-effects.yml)
```

`diff`は決してゲートしないので、コメント投稿ステップとして安全です;失敗させたければ`check`に差し替えてください。構造化された出力を投稿したければ、`--format=json`はすべてのサブコマンドが受け付けます。

**`--no-tolerated-effects`**は`effects.tolerated:`が空であるかのように再判定します。あなた自身のポリシーの監査スイッチです——スケジュールされた非ゲートのジョブに値します。見るのをやめると決めたものが、週に一度は依然として見えるように。実行自体はどちらでも同一なので、再解析のコストは決してかかりません。

## メソッドが何をしてよいかを宣言する

ここまでのすべては観測です。この節は主張します——そしてこの機能の中で`rigor check`の診断を生む唯一の部分です。最後にやってください。レポートがコードの実際にすることを教えてくれた後で。

### 規約によるエンベロープ

最も安価な境界はシグネチャをまったく必要としません。1つのスタンザがアーキテクチャの層全体を束縛します:

```yaml
effects:
  envelopes:
    - match: "app/helpers/**/*.rb"    # a helper builds strings
      effect: []
```

各スタンザは`match:`（クラスが定義されているファイルに対するパスglob）または`namespace:`（定数glob）のちょうど1つと、`effect:`——それらのクラスが行ってよいラベル、純粋なら`[]`——を名指します。最近接が勝ちます: メソッドごとのアノテーションはクラスレベルのものに勝ち、クラスレベルはスタンザに勝ちます;スタンザ間では最初のマッチが勝ちます。

境界を超えたメソッドは（メソッド,ラベル）の組ごとに1つの診断を、その`def`で、経路を名指す形で受け取ります:

```
app/helpers/application_helper.rb:59:1: warning: Method ApplicationHelper#link_to_principal performs io.fs.read (Dir.glob via IconsHelper#principal_icon → IconsHelper#sprite_icon → IconsHelper#sprite_source → Redmine::Themes::Helper#current_theme → Redmine::Themes.theme → Redmine::Themes.themes → Redmine::Themes.scan_themes), but is declared effect: [] at .rigor.yml effects.envelopes[0], so io.fs.read exceeds the envelope.
```

**最初の大きな数字を予算に入れておいてください**。あの1つのスタンザは、Redmineでは**18ファイルにわたる343の警告**です——91の`mutate.self`、86の`mutate.static`、83の`io.fs.read`、38の`mutate.instance`、16の`global.read`、13の`io.output.stderr`、13の`exit`、3の`nondet.time`。

それはスタンザの失敗ではありません——層が本当は何をするかを自ら語っているのであり、8ホップ下のテーマスキャナに到達するヘルパーは本物の発見です。しかし343は作業リストではありません。この順序で削りましょう:

1. **束縛する前に読む**。`rigor effects app/helpers`（またはフィルタしたレポート全体）は、同じファクトを診断なしで見せます。願望のスタンザではなく、本気で意図するスタンザを書いてください。
2. **`tolerated:`でカテゴリーごと解消する**。`tolerated: [mutate.self]`を足すと343は**252**になります——起点がレシーバー変更だったすべての警告であり、それ以外は何も減りません。
3. **スタンザを狭める**か、その1つのメソッドにより狭いエンベロープを付けて意図的な例外を切り出す。`except:`は存在せず、必要ありません: 最近接が勝ちます。

解消はラベルごとではなく**起点**（origin）ごとに働きます。`Logger#info`は`io`と`telemetry`を1つのバンドルで運ぶので、`tolerated: [telemetry]`はロギングとともに来た`io`を解放し、2行下の`File.read`由来の`io.fs.read`をそのままの場所に残します。追加されたラベルが解消されるのは、それを導入したすべての起点が解消されたときだけです。

### 1つのメソッドへのアノテーション

スタンザが粗すぎる場所では、1つのメソッドを束縛します。2つのアノテーションがそれを行います——rbs自身の純粋性アノテーションで「まったく何もしない」と読まれる`%a{pure}`と、メソッドが超えてはならない素のラベルのカンマ区切りリストである`%a{rigor:v1:effect <labels>}`です。どちらもメソッドに、または`class` / `module`に付き、後者の場合はそのクラス自身のメソッドへ分配されます。完全な構文は[RBS::Extendedアノテーション](../16-rbs-extended-annotations/)の§*エフェクトエンベロープ*にあります;人を驚かせる2つのことは、代わりにここに属します:

- **`.rbs`で1つのメソッドにエンベロープを掛けると、そのシグネチャ全体を要求されます**。RBSにはメソッドを宣言せずにアノテーションを付ける方法がないので、アノテーションを運ぶためだけに`def init_path: () -> untyped`と書くはめになります。rbs-inline形式（`.rb`ファイル内で`def`の上に`# @rbs %a{pure}`）にはその問題がなく、境界だけが欲しいときはそちらが良いレーンです。
- **宣言ラベルが診断を発火させることは決してありません**。レポートの行が`[] ≤ [global.read, rails.i18n.translate]`と読めるメソッドは`%a{pure}`を沈黙のうちにパスします。`≤`レーンは主張であり、主張は決して発見を製造してはならないからです。正しく、そして使う場面では徹底的に直観に反します——メソッドにアノテーションを付けて何も起きなかったら、そのラベルがどちらのレーンにあるかを確かめてください。

綴りを間違えたラベルは**アノテーション全体**を無制限として読ませるので、タイポも決して発見を製造できません。綴りが明らかにラベルを意図している場合には、Rigorがそう述べます:

```
sig/slug.rbs:2:1: info: Effect envelope on Slug#load names io.bd.read, which is not a known effect label (did you mean io.db.read?); the annotation now bounds nothing.
```

### 誰もプラグインを書いていないgemのための`attribution:`

```yaml
effects:
  attribution:
    "Acme::Http.get": [io.net.http]
    "Acme::Metrics.count": [telemetry]
```

キーはメソッドキー——`Owner#instance_method`または`Owner.singleton_method`——であり、それ以外はロードエラーです。ラベルは**宣言**レーンに着地し、決して証明レーンには着地しないので、帰属が診断を発火させることはありえません;その呼び出しは依然として未解決として数えられます。そのコードが何をするかをあなたがRigorに告げただけで、Rigorはそれを読んでいないからです。

手で行を書く前に、プラグインがすでにそのgemをカバーしていないか確かめてください——フレームワークアプリケーションでは宣言レーンの大半はプラグインが供給し、それを複製する表はあなたが保守しなければならない表です。

### 境界に見えるものと見えないもの

境界はメソッドの**証明**ラベル——Rigorがコードを読んで得たもの——に対してチェックされます。`≤`レーンに対しては決してチェックされず、Railsアプリケーションではその区別がほとんどすべてを決めます。

`effect: []`スタンザの下のシリアライザが、巡り巡って`UserRole.create!`を呼ぶとしましょう:

```
app/serializers/rest/v1/instance_serializer.rb:89:1: warning: Method
  REST::V1::InstanceSerializer#invites_enabled performs mutate.self
  (receiver-mutation via UserRole.everyone → UserRole.create! → UserRole#set_position),
  but is declared effect: [] at .rigor.yml effects.envelopes[0], so mutate.self
  exceeds the envelope.
```

Rigorはデータベース書き込みを*通り抜けて*歩き、その先のivar代入を報告しました。そのメソッドの行は`≤ [io.db.read, io.db.write]`と言っているので、書き込みは隠されてはいません——境界が読んではならないレーンにあるのです。そこにある`io.db.write`は、`rigor-activerecord`が「`create!`はこうする」と述べているものであって、Rigorが見た何かではないからです。アナライザーが決して読まなかったコードについての主張が、ビルドを失敗させられてはなりません;できてしまえば、あらゆるプラグインのアップグレードがビルドリスクになります。

つまりRailsアプリケーションでは:

- **`mutate.*`・`io.fs.*`・`io.net`・`nondet.*`・`global.*`・`exit`**はあなた自身のコードから証明されます。これらへの境界は発火します。
- **`io.db.*`・`cache.*`・`telemetry`・`email.send`・`job.enqueue`・すべての`rails.*`**、そして`effects.attribution:`に書くすべては宣言です。それらを名指す境界は空虚に満たされます。

**2番目のグループの強制経路はスナップショットです**。`rigor effects check`は両方のレーンを差分し、宣言レーンの追加を`≤+`で印づけます:

```
reach:
  IssuesController#index  + io.net
  IssuesController#index  ≤+ io.db.write
```

これが「issue一覧はデータベースへの書き込みを始めてはならない」を強制する方法です: スナップショットをコミットし、差分をレビューし、望まなかった場所に`≤+`が現れたら`rigor effects check`にビルドを失敗させる。これは宣言されたポリシーではなく、観測された状態の上のラチェットです——`effects.snapshot.gate`が存在する理由であり、この章がこの節よりスナップショットを先に置く理由です。

この規則とその背後の証拠は[ADR-103](../../adr/103-effect-labels/)の§WD17です。

## 診断

4つのルール。3つは`effects:`ブロックを必要とし、4つ目はそれを書いていないと告げるために存在します。既定のテキスト出力はルールIDを出力しません——`--format json`が`rule`フィールドを運び、`rigor explain <rule>`がどのルールについてもカタログエントリーを出力します。

| ルール | 発火条件 | 重大度 |
| --- | --- | --- |
| [`effect.envelope-exceeded`](../04-diagnostics/#rule-effect-envelope-exceeded) | メソッドの証明ラベルが、そのメソッド上・そのクラス上・またはスタンザで宣言されたエンベロープにカバーされない | `warning` |
| [`effect.liskov-widened`](../04-diagnostics/#rule-effect-liskov-widened) | オーバーライドが、オーバーライドするメソッドに書かれたエンベロープから逃れている——実装は継承する境界より純粋であってよく、決して純粋でなくてはならない | `warning` |
| [`effect.unknown-label`](../04-diagnostics/#rule-effect-unknown-label) | 宣言がレジストリの知らないラベルを名指し、タグ全体が無制限として読まれる | `info` |
| [`effect.annotations-unchecked`](../04-diagnostics/#rule-effect-annotations-unchecked) | シグネチャがエンベロープを運ぶのに`.rigor.yml`に`effects:`ブロックがない | `info` |

これらは他のルールと同様に、IDによる`disable:`と`severity_overrides:`を受け付けます（[診断](../04-diagnostics/)）。`# rigor:disable`コメントは`.rbs`や`.rigor.yml`からは読まれないので、宣言サイトには`disable:`かベースラインを使ってください。`effects.check: false`を設定すると、最初の3つを黙らせつつレポートとスナップショットを保てます。

未証明のエフェクトがこれらのどれかを発火させることは決してありません。「おそらくそれ以上」は証拠ではなく、肩をすくめただけで発火するチェックは、それを迂回することを教えてしまいます。宣言（`≤`）ラベルも発火させません——それがどのラベルを除外するか、そして代わりにどこで強制するかは[境界に見えるものと見えないもの](#境界に見えるものと見えないもの)を参照してください。
