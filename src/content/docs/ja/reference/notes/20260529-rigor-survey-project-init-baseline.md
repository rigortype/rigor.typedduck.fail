---
title: "rigor-survey project-init baseline sweep — 2026-05-29"
description: "Imported from rigortype/rigor docs/notes/20260529-rigor-survey-project-init-baseline.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260529-rigor-survey-project-init-baseline.md"
sourcePath: "docs/notes/20260529-rigor-survey-project-init-baseline.md"
sourceSha: "01503cedbdc62cdcedfc6f6a14f049706d7709a30d6ed32e09c80d7158aadf30"
sourceCommit: "f05a17f2d493b5e0ae7f1066d9bcb7f90b04dc84"
translationStatus: "translated"
sidebar:
  order: 20266529
---

`~/repo/ruby/rigor-survey/`内のすべてのプロジェクトについて、`rigor-project-init`直後のスナップショットを`rigortype` **0.1.14**で取得したもの。

目的は、**プロジェクトがオンボーディングされた瞬間に、ベースラインや`pre_eval:`のチューニングを行う前に`rigor check`が何を顕在化させるか**を見ることにある — すなわち、Rigorがコールドなプロジェクトで「回収」できる`undefined-method` / `possible-nil-receiver` / フロー問題の生の集合である。これは意図的に*未削減の*状態だ: `.rigor-baseline.yml`は一切生成しておらず、したがって何も抑制されていない。

## 方法

1つのドライバ（`_reports/init/run-init.sh`、Flakeシェル内で実行）が、各プロジェクトについて次を行った:

1. **リセット** — 既存の`.rigor.dist.yml` / `.rigor.yml` / `.rigor-baseline.yml` / `.rigor/`キャッシュを削除する。（以前にチューニング済みだったmastodonとredmineの設定は、先に`_reports/init/_backup/`へバックアップした。）
2. **新しい`.rigor.dist.yml`を書く** — project-initワークフローに従う:
   - `paths:` = ライブラリは`lib`（protobufは`ruby/lib`、2つのRailsアプリは`app`+`lib`）、`exclude: [vendor, tmp]`。
   - `target_ruby:`は`.ruby-version`が宣言されていればそこから取得。
   - ローカルの`sig/`は存在すれば`signature_paths:`で配線（herb、redmine）。
   - **プラグインは2つの本物のRailsアプリ（mastodon、redmine）にのみ**: Railsセット + `rigor-activesupport-core-ext`、`severity_profile: lenient`。それ以外のプロジェクトはすべて素のRuby → プラグインなし、デフォルト（`balanced`）プロファイル。これにより、ライブラリのシグナルをプラグインRBSで事前フィルタせず生のまま保つ。
3. 生の`rigor check`（`_reports/init/<proj>.check.txt`）と`rigor triage --format json`（`_reports/init/<proj>.triage.json`）を**キャプチャ**する。

集計は`_reports/init/aggregate.rb`による。

> **注 — ベースラインなし / `pre_eval:`なし**。実際のオンボーディング（Phase 6a/7）であれば、証明済みのモンキーパッチ箇所に`pre_eval:`を追加し、残りをベースラインへスナップショットするだろう。したがって以下のredmineとmastodonの数値は*膨張したコールド*の数値である。以前にチューニングされたredmineの設定（`pre_eval:` + ベースライン付き）は、顕在化された件数をここに示す4101のごく一部にまで下げていた。

## プロジェクト別の結果

| Project | Files | Total | Err | Warn | Info | Top rules | Triage hints |
| --- | --: | --: | --: | --: | --: | --- | --- |
| algorithms | 14 | 37 | 33 | 3 | 1 | possible-nil-receiver:33, always-truthy:3 | systemic-file-cluster, genuine-bugs×3 |
| concurrent-ruby | 178 | 13 | 10 | 3 | 0 | possible-nil-receiver:4, undefined-method:3, arg-type-mismatch:2 | genuine-bugs×13 |
| erubi | 3 | 3 | 3 | 0 | 0 | possible-nil-receiver:2, undefined-method:1 | genuine-bugs×3 |
| faraday | 33 | 8 | 8 | 0 | 0 | undefined-method:5, possible-nil-receiver:3 | genuine-bugs×8 |
| haml | 51 | 12 | 10 | 2 | 0 | possible-nil-receiver:5, undefined-method:5 | activesupport-core-ext, unresolved-toplevel, genuine-bugs×8 |
| hamlit | 61 | 14 | 13 | 1 | 0 | possible-nil-receiver:10, undefined-method:3 | activesupport-core-ext, genuine-bugs×1 |
| herb | 42 | 11 | 6 | 4 | 1 | undefined-method:5, unresolved-toplevel:2, return-type-mismatch:2 | gem-without-rbs, unresolved-toplevel, genuine-bugs×8 |
| jbuilder | 14 | 3 | 1 | 2 | 0 | ivar-write-mismatch:2, undefined-method:1 | activesupport-core-ext, genuine-bugs×2 |
| kramdown | 55 | 14 | 12 | 2 | 0 | undefined-method:8, possible-nil-receiver:4 | genuine-bugs×6 |
| liquid | 64 | 13 | 10 | 3 | 0 | undefined-method:7, possible-nil-receiver:3 | genuine-bugs×6 |
| mail | 111 | 20 | 5 | 15 | 0 | unreachable-branch:11, possible-nil-receiver:4 | genuine-bugs×9 |
| **mastodon** | 1219 | 1920 | **3** | 23 | 1894 | activerecord.model-call:555, actionpack.filter-call:527, routes.helper:350, i18n.translation:233 | systemic-file-cluster, genuine-bugs×10 |
| net-ssh | 97 | 27 | 13 | 14 | 0 | always-truthy:11, possible-nil-receiver:6, undefined-method:5 | genuine-bugs×10 |
| numo-narray | 2 | 6 | 5 | 1 | 0 | possible-nil-receiver:5, always-truthy:1 | genuine-bugs×6 |
| oj | 11 | 5 | 5 | 0 | 0 | undefined-method:3, possible-nil-receiver:2 | genuine-bugs×5 |
| ox | 15 | 12 | 12 | 0 | 0 | possible-nil-receiver:10, arg-type-mismatch:2 | systemic-file-cluster, genuine-bugs×2 |
| parser | 56 | 7 | 3 | 4 | 0 | always-truthy:4, possible-nil-receiver:3 | genuine-bugs×7 |
| protobuf | 24 | 16 | 16 | 0 | 0 | undefined-method:13, possible-nil-receiver:2, wrong-arity:1 | systemic-file-cluster, genuine-bugs×6 |
| pycall | 22 | 10 | 0 | 10 | 0 | unresolved-toplevel:10 | unresolved-toplevel×10 |
| **rbnacl** | 37 | **0** | 0 | 0 | 0 | — | (clean) |
| **redmine** | 331 | 4101 | **3352** | 31 | 718 | undefined-method:3319, routes.helper:313, actionpack.helper:180 | project-monkey-patch×1665, systemic-file-cluster×103 |
| **rgl** | 28 | **0** | 0 | 0 | 0 | — | (clean) |
| rubocop-ast | 99 | 4 | 1 | 3 | 0 | always-truthy:2, undefined-method:1, ivar-write:1 | genuine-bugs×4 |
| slim | 27 | 7 | 3 | 4 | 0 | undefined-method:2, ivar-write-mismatch:2 | genuine-bugs×7 |
| tdiary-core | 69 | 248 | 5 | 242 | 1 | unresolved-toplevel:234, possible-nil-receiver:4 | unresolved-toplevel×234, genuine-bugs×13 |

## コーパス全体のルール分布

| Rule | Total |
| --- | --: |
| call.undefined-method | 3384 |
| plugin.actionpack.filter-call | 684 |
| plugin.rails-routes.helper | 663 |
| plugin.activerecord.model-call | 555 |
| plugin.actionpack.helper-call | 398 |
| plugin.rails-i18n.translation-call | 258 |
| call.unresolved-toplevel | 247 |
| call.possible-nil-receiver | 141 |
| flow.always-truthy-condition | 67 |
| call.wrong-arity | 28 |
| flow.dead-assignment | 24 |
| flow.unreachable-branch | 11 |
| plugin.rails-routes.unknown-helper | 11 |
| def.return-type-mismatch | 10 |
| call.argument-type-mismatch | 9 |
| def.ivar-write-mismatch | 8 |
| plugin.actionmailer.mailer-call | 7 |
| rbs.coverage.missing-gem | 4 |
| plugin.actionmailer.missing-view | 1 |
| plugin.activerecord.load-error | 1 |

`call.undefined-method`の合計（3384）は**97%がredmine**（3319）である。2つのRailsアプリを取り除けば、ライブラリのコーパスは小さく扱いやすい: 23のライブラリにわたって診断は数百件で、大半は`possible-nil-receiver`、`undefined-method`、そしてフロー警告である。

## 数値の意味 — シグナル対オンボーディングのノイズ

生の合計はきれいに3つのバケツに分かれる。

### 1. 実際のinitなら解消されるオンボーディングのノイズ（大きな数値）

- **redmine — 3319件の`undefined-method` / 1665件の`project-monkey-patch`**。ほぼすべてがRedmineによるコア / stdlib / モデルクラスの再オープンと、クロスファイルでのメソッド追加である: `User.current`、`Mailer.deliver_*`、`Setting.lost_password?`、`Token.find_token`、`User.find_by_mail`、……。これらはまさに*以前にチューニングされた*redmineの設定が`pre_eval:`に列挙していた箇所である（そしてベースラインへスナップショットしていた）。トリアージの`project-monkey-patch`ヒント（件数1665）がこれを正しくフラグしている。**これはコールドの数値であり、Phase 6aの`pre_eval:`がこれを潰す**。
- **mastodon — 1894件の`info`、`error`はわずか3件**。大半は*情報的な*プラグイン認識である: `plugin.activerecord.model-call`（555）、`plugin.actionpack.filter-call`（527）、`plugin.rails-routes.helper`（350）、`plugin.rails-i18n.translation-call`（233）。これらはRigorがRailsのDSL呼び出しを*認識している*ものであって、バグをフラグしているのではない。**mastodonの実際のエラー件数は3件**（後述）。
- **tdiary-core / pycall — `unresolved-toplevel`（234 / 10）**。 tdiaryのプラグインシステムは、プラグインファイルをまたいで消費されるヘルパー（`h`、`to_native`、`bot?`）をトップレベル / Kernelメソッドとして定義する。pycallの`iruby_helper`は`register_python_object_formatter`を呼ぶ。ADR-34の診断は設計どおりちょうど発火し、メッセージはすでに修正法（ADR-17に従う`pre_eval:`）を指し示している。すべて`balanced`の下で警告となる。

### 2. 「genuine-bugs」ヒント — ライブラリレビューの山

すべてのライブラリが`genuine-bugs`ヒント（少数で散在するルール）を得た。繰り返し現れる形:

- **`call.possible-nil-receiver`** — 単独で最も多い*ライブラリ*の所見（algorithms 33、ox 10、hamlit 10、numo-narray 5）。[`feedback_false_positive_discipline`]に従えば、大半はテストスイートが安全だと証明しているコードに対する最悪ケース健全な`T | nil`の読み取りであり、強制的な修正ではなくベースライン材料である。少数（例: nil許容のインデックスに対する`ox/element.rb`の比較チェーン）は人間が見る価値がある。
- **stdlib / ネイティブレシーバ上の`call.undefined-method`** — 大半は**RBSカバレッジのギャップ**であり、バグではない:
  - `oj`: `singleton(JSON::Ext::Generator::State)`上の`from_state`（ネイティブ）。
  - `faraday`: `URI`上の`find_proxy`、`Class`上の`options_for` / `member_set`。
  - `protobuf`: `Numeric`上の`to_i` / `to_f`（×13 — 抽象的な`Numeric`は`to_i`を持たない。値は実行時には具体的にInteger/Floatである）。
  - `erubi`: `Object`上の`escapeHTML`（CGIがmixinされている）。
  - `rubocop-ast`: `Binding`上の`union_bind`。
  - `mastodon`: `Resolv::DNS::Resource`上の`exchange`。
  これらは組み込み / stdlibのRBSカバレッジ不足、またはネイティブ拡張メソッドを指している — プロジェクトのバグではなく`rigor-builtin-import`作業の候補である。
- **フロー警告**（`always-truthy/falsey`、`dead-assignment`、`unreachable-branch`）— mailの11件の`unreachable-branch`、net-sshの11件の`always-truthy`。たいていは冗長なガード / 防御的な死コードであり、重大度は低いが、ときに本物のロジックの臭いになる。
- **`def.ivar-write-mismatch`**（concurrent-rubyの`@backend` Concurrent::Hash→Hash、rubocop-astの`@cur_index` Symbol→Integer）— インスタンス変数が異なる型で再代入されている。軽度の一貫性の所見である。

### 3. 純粋にクリーンなプロジェクト

**rbnacl、rgl**は診断**ゼロ**を報告する**。pycall**はエラーがゼロ（トップレベル警告のみ）である。特筆すべきは、rglが以前（5月19日のサーベイ、0.1.14以前）は暗黙的self呼び出しに対して`Object`上の`undefined-method`を2件報告していたことだ — それらはいまやADR-24のself-method-call解決によって沈黙させられている。コーパスに見える具体的な精度向上である。

## 最も価値の高いフォローアップ（実行可能な「undefined」の所見）

オンボーディングのノイズを捨てたあと、人間が一度目を通す価値が最も高い診断:

1. **mastodonの3件の本物のエラー** — `medium_player_url`ルートヘルパーが不明（×2、`plugin.rails-routes.unknown-helper`）と`Resolv::DNS::Resource#exchange`（RBSギャップ）。ルートヘルパーのものは、1219ファイルの中でアプリレベルの問題の可能性に見える唯一のもの（動的な / 削除されたルート）である。
2. **herb** — `Herb.diff` / `Herb.leak_check` / `Herb.arena_stats`（singleton（Herb））と`Herb::AST::Node#tag_opening`に対する`undefined-method`、加えて2件の`def.return-type-mismatch`。herbは自前の`sig/`を出荷しているので、これらはプロジェクト自身のRBSにおけるsig完全性のギャップである — `rigor sig-gen`パスで解消できるだろう。
3. **ライブラリの`possible-nil-receiver`クラスタ**（ox、numo-narray、algorithms）— nil許容のインデックス / `shape`チェーンをレビューする。大半はベースライン、いくつかは本物かもしれない。
4. **RBSカバレッジ起因の`undefined-method`**（oj、faraday、protobuf、erubi、rubocop-ast）— コア / stdlibのRBSカバレッジ（`Numeric#to_i`、`URI#find_proxy`、`Binding`、CGIの`escapeHTML`）へ送り込む。プロジェクトの修正ではない。

## コールド対`pre_eval:`チューニング済みのinit — 2つのRailsアプリ

コールドの数値を受けて、*適切な*Phase-6a init（トリアージの`project-monkey-patch`ヒントに従い、名指しされたdef箇所を`pre_eval:`へ追加する）が実際に何をもたらすかを調べた。`run-tuned-rails.sh`経由で`_reports/init/<proj>.tuned.*`としてキャプチャした。

| App | | total | error | warn | info | undefined-method |
| --- | --- | --: | --: | --: | --: | --: |
| redmine | cold | 4101 | 3352 | 31 | 718 | 3319 |
| redmine | **+pre_eval** | **3488** | **2739** | 31 | 718 | **2706** |
| mastodon | cold | 1920 | 3 | 23 | 1894 | 1 |
| mastodon | **+pre_eval** | 1920 | 3 | 23 | 1894 | 1 |

### redmine — `pre_eval:`は*静的に定義された*パッチのみを解消する（−613）

`pre_eval:`には、トリアージのヒントが指した6つのファイル（`app/models/{user,setting,mailer,token}.rb`、`lib/redmine/{configuration,twofa}.rb`）を列挙した。結果: **`undefined-method`が−613件**（3319 → 2706）、`project-monkey-patch`ヒントは1665 → 1108に縮小した。

レシーバ別に、何が解消され何が残ったか:

- **解消された — `User.current`（486 → 0）**。 `user.rb`内にリテラルな`def self.current`として定義されている。`pre_eval:`のウォーカーがそれを見て、すべての呼び出し元が解決する。この単一のクラスタが削減の約80%である。`Mailer.deliver_*`、`Token.find_*`、`Redmine::Configuration[]`も同様。
- **解消されなかった — `Setting.default_language` / `app_title` / …（依然それぞれ約20/18件）**。 `Setting`はそのアクセサを静的な`def`ではなく`method_missing`経由で公開する — そのためファイルの事前パスを歩いても登録すべきものが見つからない。**これはエスカレーションパスAの境界である:** `method_missing`によるDSLは`pre_eval:`ではなく*プロジェクトプラグイン*を必要とする。
- **解消されなかった — モデルのシングルトン上の`table_name` / `where` / `visible` / スコープ（`table_name`単独でIssue/Project/TimeEntry/…にまたがり約470件）**。これらはActiveRecordの*クラス*メソッドである。`rigor-activerecord`は現状これらを`singleton(Model)`上に供給しない。モンキーパッチではなく、プラグイン/RBSのカバレッジギャップである。**これが支配的な残余**であり、redmineが`pre_eval:`後も4桁にとどまる真の理由である。
- **解消されなかった — `Redmine::Export::PDF::ITCPDF`上の`SetFontStyle` / `RDMCell` / `ln`**。 RBSのない`rbpdf`/TCPDF gemのサブクラス → `gem-without-rbs`。

したがって率直な読み方はこうだ: `pre_eval:`は**証明済みで静的に定義された**モンキーパッチのクラスタに対する正しいツールであり（それをきれいに除去する）、しかしredmineではそれはコールド件数の*少数派*である。多数派はActiveRecordのクラスメソッドのカバレッジ + `method_missing`によるDSL + RBSのないPDF gemであり — これらをacknowledgeモードのワークフローは**ベースライン**へ送り込む（以前のチューニング済みredmine設定がまさにそれを行っていた: `pre_eval:` + 約37 KBのベースラインが、*顕在化された*件数をほぼゼロに近づけた）。`pre_eval:`はベースラインを縮小するのであって、それを置き換えるのではない。

### mastodon — `pre_eval:`は無効（すでに底に達している）

前後で診断レベルまで同一である。トリアージはmastodonに対して`project-monkey-patch`ヒントを**報告しなかった**ので、登録すべきdef箇所がなかった。その1894件の`info`は`plugin.*`によるRails-DSLの*認識*（エラーではない）であり、実際のサーフェスは3件のエラー + 23件の警告 — すでに最小である。mastodonの忠実なinitは`pre_eval:`を追加しない。そこでのレバーは、RBSのない325個のgemに対する`rbs collection install`（`info`認識ノイズを縮小する）であって、モンキーパッチの登録ではない。

### 要点

`pre_eval:`ステップは、**プロジェクトの「undefined」サーフェスのうち、どれだけがプロジェクト内で静的に定義された再オープンであるか**に比例して効果を発揮する — redmineの`User.current`スタイルのパッチには大きく、mastodonにはゼロである。それは`method_missing`によるDSL（→ プロジェクトプラグイン）、ActiveRecordのクラスメソッドのギャップ（→ プラグイン/RBSカバレッジ）、RBSのないgem（→ `rbs collection install` / `source_inference:`）には触れない。acknowledgeモードでは残余はベースライン材料であり、`pre_eval:`は単にそのベースラインをより小さく、より率直にするだけである。

## 留意点

- **コールドの数値**。 `pre_eval:`なし、ベースラインなし。redmine/mastodonの合計は未オンボーディングの状態を反映する。上記のファミリー別分析は、それを勘案したあとの率直なシグナルである。
- **ライブラリのプラグインは意図的に省略**。いくつかのライブラリはActiveSupportに依存しており（jbuilder、haml、hamlit、mail）、トリアージはそれらに`activesupport-core-ext`をフラグした。そのプラグインを追加すればいくつかの`undefined-method`件数は縮小する。生のコアシグナルを保つためにここでは外した。
- **0.1.14のスナップショット**。後のエンジンで再実行すればドリフトする（rglのADR-24の勝利を参照）。キャプチャはdiff用に`_reports/init/`配下に置いてある。
- 以前のチューニング済み設定のバックアップ: `_reports/init/_backup/`。
