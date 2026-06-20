---
title: "SKILL駆動のオンボーディング（`rigor-next-steps`）── conference-appのドッグフーディング＋rigor-surveyフィールドトライアル"
description: "rigortype/rigor docs/notes/20260620-skill-driven-onboarding-dogfood.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260620-skill-driven-onboarding-dogfood.md"
sourcePath: "docs/notes/20260620-skill-driven-onboarding-dogfood.md"
sourceSha: "5b65e8715e3c47d9a695f63cd200c5bad395668500926feae281262bb5c59ca9"
sourceCommit: "51a679f3ccd12f5bee48c24150401d10e978efce"
translationStatus: "translated"
sidebar:
  order: 20266620
---

日付: 2026-06-20。ステータス: **フィールドトライアルレポート**。 [ADR-73](../../adr/73-skill-driven-user-experience/)のSKILL駆動のユーザー体験──`rigor-next-steps`エントリポイント＋ライブの`rigor skill describe`＋カタログスキル──を、`~/repo/ruby/conference-app`（Rails 8.1アプリ）と6プロジェクトの`~/repo/ruby/rigor-survey`スライス（slice）に対して、初めて実プロジェクトで動かした記録である。この演習の目的は**UXへのフィードバック**であって診断調査ではない。何がうまくいき、何が摩擦になり、サーフェス（surface）が凍結される前に何を改善すべきか。

## 何を動かしたか

エージェントが単一のエントリポイントから駆動する全アークは次のとおり。

```
describe (state probe) → project-init (onboard) → check / coverage (value)
  → protection-uplift (hand-RBS under the double gate)
  → full onboard (widen paths, baseline, regression guard)
  → describe again (recommendation advances)
```

## Part 1 ── conference-app（Rails 8.1、244個の.rb、rbs_rails＋Steep＋rbs-inline）

実在の型を意識したRailsアプリ。`sig/`（生成＋手書き＋rbs_rails＋シム）、コミット済みの`rbs_collection.lock.yaml`、`Steepfile`、rbs-inlineの`# @rbs`アノテーション（annotation）、`.vscode/`、`.github/`を備える。Rigor設定はなし。

### 数字つきのアーク

1. **`rigor skill describe`**はゼロ解析でプロジェクトを正しく読み取った。`config none → recommend rigor-project-init`、`sig/ present`、`Community RBS collection installed`、`CI present, Rigor not wired`、`.vscode present, Rigor LSP not wired`。存在プローブはすべての軸で正確だった。
2. **オンボード（`rigor-project-init`）**。スコープを絞った`.rigor.dist.yml`を書き出した（`target_ruby: "3.4"`、個別のRailsプラグイン群、`rigor-rbs-inline`）。`rigor plugins` → **7プラグインがアクティブ、0エラー**。Rigorはプロジェクト自身の`sig/`（353個のRBSクラス）を取り込んだ。
3. **`rigor check lib`** → **バグなし**（rbs-inline＋`sig/`への投資が報われた）。**`rigor coverage --protection lib`** → **17.5 %（7/40）**、そして「ここに型を足せ」という的確なリストが2つの`Dynamic`発生源を名指しした。Faraday（`client.get(...).body`、`#post`、`#response`）と`Rails.configuration.x.tito.*`の動的チェーンである。APIクライアントの2ファイルはともに0 %。
4. **`app/decorators`への`rigor-protection-uplift`**（M0＝13.0 %、3/23）。sig-genはまず1つのシグネチャ（`TalkDecorator#hashtagged_twitter_intent_url: () -> String`）を提示した。測定可能な残りは`Commonmarker.to_html`（3箇所、RBSのない外部gem）だった。**7行の本物のRBS**（`def self.to_html: (String, ?options: untyped, ?plugins: untyped) -> String`──戻り値を絞り込み、引数は緩いまま）→ **二重ゲートが保たれた。保護13.0 % → 26.1 %（+3箇所）、`check`は`No diagnostics`のまま**。
5. **フルオンボード**（`paths: [app, lib]`、101個の.rb）。**269件の診断 ＝9件のerror＋260件のinfo**。 260件のinfoは、Railsプラグインがフレームワークの魔法を*肯定的に解決*しているもの（ARファインダー68、ルートヘルパー67、ActionPackヘルパー62、strong-params 34、i18n 13）であり、プラグインがアプリを理解している証である。**9件のerrorは本物**で、RBS/Steepには見えない、フレームワーク意味論上のバグである。
   - **カラムでないstrong-paramsキー**（6件）。`start_date_jst → :start_date`、`end_date_jst → :end_date`、`start_at_date` / `start_at_time → :start_at`、`content`、`page_image`（一部は正当な仮想属性であり、レビューでゲートされる）。
   - **欠落／重複したi18nキー**（3件）。`sample_webpush_notifications.create.sample_webpush_notifications.create.title`を含む──明らかに重複した名前空間＝本物のバグ。
6. **acknowledgeモードのベースライン**（baseline、`rigor baseline generate` → 128バケット / 269）＋`baseline:`を配線 → 再チェックは**No diagnostics**。**回帰ガードを実証**。わざと注入した`I18n.t("…not.a.real.key…")`はただちに新しいエラーとして表面化した（その後リバート）。
7. **`describe`の再実行**を設定ありで行うと、推奨が**`project-init → ci-setup`へ前進**した。ループが閉じ、エントリポイントはライブである。

### うまくいったこと（conference-app）

- **存在プローブは正確で安価**。すべての状態軸が現実と一致し、ルーティングのために`rigor check`を走らせる必要は一度もなかった。
- **状態を意識したルーティングが前進する**。オンボード後にproject-init → ci-setupへ。「常に最新」という約束が端から端まで保たれた。
- **Railsプラグインこそが目玉の価値**。 260件のフレームワーク解決＋アプリの既存のRBS/Steepが捕まえなかった9件の本物のバグ。
- **protection-uplift二重ゲートは本物**。最小限の本物の型がゼロ診断コストでローカル保護を倍にし、スキルの「正直な境界」が残り（外部gemのDynamic）を正しく予測した。
- **Rigorはプロジェクト自身の型付け**（`sig/`、`rbs_collection`、rbs-inline）を儀式なしに取り込む。

### 摩擦／うまくいかなかったこと（conference-app）

- **`rigor-rails`は1つのプラグインとしてリストできないアンブレラ**。 `plugins: [rigor-rails]`とリストすると失敗する。*「registered multiple plugins (actionmailer, actionpack, activejob, activerecord, factorybot, rails-i18n, rails-routes); disambiguate with an explicit `id:` field.」*直感的な選択が罠になる。個別のgemへ展開せざるを得なかった。→ **改善候補:**アンブレラgemにバンドルされたプラグインを自動アクティブ化させるか、`rigor-project-init`のプラグイン表が`rigor-rails`を単一エントリーとして決して提案しないようにする。
- **rbs-inlineの使用が自動提案されなかった**。アプリは`# @rbs`コメントで溢れているのに、`rigor-rbs-inline`の有効化を促すものは何もなかった──追加すべきだと自分は知っていた。→ `describe` / project-initが`# @rbs` / `#:`コメント（あるいはロックファイル中の`rbs-inline` gem）を検出してプラグインを推奨できるはずだ。
- **infoレベルのプラグイン解決ノイズが支配的**。 269件中260件の診断が肯定的な解決であり、ベースラインはinfoを含む269件すべてを取り込んだ。→ infoのプラグインノートを既定でオフにするか、ベースラインから除外する（ゲートにも回帰にも関わらない）ことを検討する。
- **ソースからの呼び出しは壊れやすい（製品ではなくツーリングの問題）**。リポジトリの`exe/rigor`を`ruby -Ilib`経由で外部プロジェクトに対して走らせると、`check`が*静かに壊れる*。Bundlerをバイパスするのでバンドルされたプラグインがロードパスから外れ、さらにグローバルな`~/.gem`のrbsネイティブ拡張（別のRuby向けにビルドされたもの）が拾われて → `LoadError`になる。修正は、**絶対**`BUNDLE_GEMFILE`*かつ*`BUNDLE_PATH`を指定した`bundle exec`である（リポジトリの`BUNDLE_PATH: vendor/bundle`は相対パスで`cd`すると壊れる）。これは*ソースからのドッグフーディング*に固有のアーティファクトであり──`mise`/`gem install`でインストールしたエンドユーザーは自分のプロジェクトで`rigor`を実行するだけだ──しかしサーベイ／ドッグフーディングのレシピはこれを明記しなければならない。

### conference-appに書き出されたアーティファクト（未コミット、別リポジトリ）

`.rigor.dist.yml`、`.rigor-baseline.yml`、`sig/handwritten/commonmarker.rbs`、`.rigor/`（キャッシュ──残すならgitignoreすること）。

## Part 2 ── rigor-surveyフィールドトライアル（6体のSonnetサブエージェント）

方法: プロジェクトごとに1体のSonnetサブエージェントを充て、それぞれが同じソースからのレシピで`rigor-next-steps`フローをたどり、構造化された所見（状態 → 推奨 → オンボード → check → 保護 → うまくいったこと／摩擦／改善）を報告する。形（shape）の多様性を狙ってプロジェクトを選んだ。

| プロジェクト | 形 |
| --- | --- |
| `faraday` | 素のgem、Gemfile.lock、sigなし、設定なし |
| `haml` | 型付きgem（sig）、Gemfile.lock、設定なし |
| `rgl` | 小さな型付きgem（sig）、設定なし |
| `liquid` | 素のgem、設定済み |
| `strap` | 小さなRailsアプリ、Gemfile.lock |
| `redmine` | 大きなRailsアプリ、sig＋設定 |

### プロジェクトごとの結果

| プロジェクト | describeプローブ | 目玉の推奨 | オンボード | check（ファイル数／エラー数） | 保護 | 一言でいうと |
| --- | --- | --- | --- | --- | --- | --- |
| `faraday` | 正確（7/7） | `rbs-setup` | 書き出した（プラグインなし） | 33 / 6（nilレシーバー＋`Options` DSL） | 24.0 % | `target_ruby`のPrism下限フットガン。推奨は6件のエラーを無視 |
| `haml` | 正確。init→rbs-setupへ前進 | `rbs-setup` | 書き出した（プラグインなし） | 51 / **55**（自前`sig/`の穴） | 38.4 % | 55件のエラーがある → `rbs-setup`でなく`baseline-reduce`へルーティングすべき |
| `rgl` | 正確。init→rbs-setupへ前進 | `rbs-setup` | 書き出した（プラグインなし） | 28 / 約50（**`pre_eval`クラスタ**） | 37.0 % | 支配的なクラスタはモンキーパッチ → `monkeypatch-resolve`へルーティングすべき。残りはジェネリック型パラメータの穴（手に負えない） |
| `liquid` | 正確 | `rbs-setup` | 既存の設定 | 63 / 1（本物のnil） | 30.7 % | 設定済みプロジェクトで`ci`/`baseline`より先に`rbs-setup`は「逆向きに感じる」。絶対パスの`cache.path`は可搬でない |
| `strap` | 正確 | `rbs-setup` | 既存（`rigor-sorbet`のみ） | 6 / 0 | 17.0 % | **Railsプラグインのない**Railsアプリ → `rbs-setup`より`plugin-tune`のほうが大きな勝ち。存在しない`lib`パス → exit 1 |
| `redmine` | 正確（「Gemfile.lockなし」を含む） | `ci-setup` | 既存の設定 | 86 / RBS環境が**失敗**（`DuplicatedDeclarationError` → 0クラス） | 15.5 %* | 壊れた`sig/`が「設定済み」を空虚にする。describeは「sig/ present」と言いCIへルーティング → 0カバレッジの解析を配線してしまう。*比率は下限値 |

設定を書き出した新規プロジェクトはすべて、推奨が**前進**した（init → rbs-setup）。プローブは**6プロジェクトすべて**＋conference-app（7/7）で**すべての軸において正確**だった。

## 集約フィードバック（総合）

### ✅ うまくいったこと（7プロジェクトすべてで一貫）

- **存在プローブは正確で安価──7/7**。すべての状態軸（config / baseline / `sig/` / Community RBS / CI / LSP / MCP）が、どのプロジェクトでも現実と一致した。ルーティングが`rigor check`の実行を必要とすることは一度もなかった。
- **状態を意識した前進が保たれる**。新規プロジェクトは設定が着地した瞬間に`project-init → rbs-setup`へ切り替わった。
- **`coverage --protection`は最も賞賛されたサーフェス**。メソッドごとの呼び出し回数＋`file:line`の例＋最も保護の薄いファイルのランキング ＝「すぐに行動に移せる」（5体のエージェントが独立に言及）。
- **RBS/Steepには見えない本物のバグが表面化した**──該当するものがあったすべてのプロジェクトで。conference-appのstrong-params＋重複i18n、faradayのnilの可能性＋`Options` DSL、hamlのモンキーパッチ＋構造体アリティ（arity）、liquidのプロファイラnil、rglのoverride-substitutability。
- **診断メッセージは行動に移せる**──`pre_eval:`のミスは*リストすべき正確なファイルを名指し*し、ADR-17を引用する（faraday、haml、rglのすべてがこれを指摘した）。
- **Railsプラグインこそが目玉の価値**である──適用される場面では。conference-appでは260件のフレームワーク解決＋9件の本物のバグ。redmineでは47ロケールにわたるi18n解決。

### ⚠️ 繰り返し現れた摩擦（再発頻度の順）

1. **[5/7] `describe`の推奨は存在のみに基づき、`check`が明らかにするものを無視する**。単独で支配的な所見であり、独立に複数回表面化した。ツリーは`Gemfile.lock ∧ コレクションなし`のときは必ず`rbs-setup`を推奨するが、*より適切な*次のステップは繰り返し別物だった。`baseline-reduce`（haml、55件のエラー）、`monkeypatch-resolve`（rgl、`pre_eval`クラスタ）、`plugin-tune`（strap、RailsプラグインのないRailsアプリ）、`doctor`（redmine、壊れた`sig/`）。エージェントはこれを「check/coverageが走ったかどうかではなく、静的なファイルシステムのシグナルだけに基づいている」「`rbs-setup`は、ユーザーがまだ何の所見も見ていないうちにネットワークタスクを前倒しする」と表現した。これは**[ADR-73](../../adr/73-skill-driven-user-experience/) WD2の存在のみ／`check`を決して走らせないガードレール**との直接的な緊張である──ガードレールは`describe`を高速で副作用なしに保つが、フィールドトライアルは最良の推奨がしばしばcheckの結果を必要とすることを示している。
2. **[2/7、ただしハードブロック] `target_ruby`のPrism下限フットガン**。 `.ruby-version`がなければgemspecから推測する。`"3.0"` / `"3.2"`は設定フォーマットのバリデーターを通るが、Prismが`check`の途中でこれらを拒否し（「invalid version」）、下限（`3.3`）の手がかりはない。両エージェントとも当て推量にサイクルを浪費した。（faraday、haml。）
3. **[redmine、深刻度高] `describe`が壊れた`sig/`を健全と報告する**。 `RBS::DuplicatedDeclarationError`が環境を0クラスへ落とし──解析は空虚なのに──`describe`は「sig/ present」と言い`ci-setup`へルーティングする。ユーザーは0カバレッジの解析をCIへ配線してしまうだろう。
4. **[conference-app] `rigor-rails`アンブレラの罠**。 `plugins: [rigor-rails]`とリストすると失敗する（「registered multiple plugins; disambiguate with `id:`」）。直感的な選択が間違いになる。
5. **[rgl、liquid、strap] `rbs-setup`が過剰に推奨される**。 RBSを欠くgemがdev/testツーリングだけのgem（rgl: rake/yard/simplecov）に対して。`ci`/`baseline`を先に行うほうが行動に移しやすい設定済みプロジェクト（liquid）に対して。コミュニティRBSより`plugin-tune`のほうが実りの多いRailsアプリ（strap）に対して。
6. **[rgl、faraday、strap、conference-app] カバレッジの穴はしばしば手に負えない種類のもの**。ジェネリック型パラメータの呼び出し（rglの`Graph[V,E]`の重み）、フレームワークDSLの箇所（`#returns` Sorbet、`Options.new` DSL）、外部gemのDynamic（conference-appのFaraday/Commonmarker）。「ここに型を足せ」リストはこれらを修正可能な穴と混ぜてしまうので、ユーザーはsig-gen/手書きRBSでは塞げないものを追いかけてしまうかもしれない。
7. **[より小さく、散在]**: 「N個のgemにRBSがない」というinfoが`.rigor.yml:1:1`にアンカーされ、コード診断と混ざって妙に見える（conference-app、liquid）。存在しないパス → warn-and-skipではなくexit 1（strap）。共有設定中の絶対パスの`cache.path`は可搬でなく、フラグも立たない（liquid、strap）。`rigor describe`（`skill`なし）が「Unknown command」になる（liquid）。rbs-inlineの`# @rbs`の使用がプラグインとして自動提案されない（conference-app）。「設定を今書き出した」という確認がない（faraday）。

### 💡 優先順位づけした改善

- **P1 ── WD2を壊さずに目玉の推奨をcheckを意識したものにする**。存在のみという緊張を、*オプトインのディープモード*または*ゼロコストのキャッシュ読み取り*で解決する。既定の`describe`に`check`を走らせることによってではない。
  - 存在する場合は既存の`.rigor/`キャッシュから直近の`rigor check`の結果を読み、そのエラークラスタに基づいてルーティングする（エラー → `baseline-reduce`、`pre_eval`クラスタ → `monkeypatch-resolve`、Rails gemがロックされているのにRailsプラグインが設定されていない → `plugin-tune`）。
  - あるいは、まずスコープを絞ったcheckを走らせる`rigor skill describe --deep`。
  これはフィールドトライアルの目玉のフィードバックであり、おそらく**ADR-73のフォローアップ／新しいワーキングディシジョン**になる（WD2のガードレールを意図的に見直すものだから）。
- **P2 ── 設定ロード時に`target_ruby`をPrismの下限に対して検証する**。最小値とそれをどこで読めるか（`Gemfile.lock`の`RUBY VERSION` / `.ruby-version`）を名指しするメッセージとともに。さらに`rigor-project-init`が`required_ruby_version`から自動検出してクランプするようにする。
- **P3 ── `describe`（または昇格された`doctor`）はRBS環境ビルドの失敗を検出しなければならない**──緑の「present」ではなく「sig/ ⚠️ build error」を表面化させ、`RBS classes available: 0`のときは`coverage`/`check`がバナーを表示して比率が本物として読まれないようにする。
- **P4 ── `rigor-rails`アンブレラを直す**──バンドルされたプラグインを自動アクティブ化するか、`project-init`が決してこれを単一の`plugins:`エントリーとして出力しないようにする。
- **P5 ── `rbs-setup`の優先度を緩める**──RBSを欠くgemがすべてdev/testグループのとき、Railsアプリに未設定のRailsプラグインがあるとき（`plugin-tune`を優先）、そして既に設定済みのプロジェクトのとき（ネットワークに依存する`rbs collection install`の前に`ci`/`baseline`を優先）は、優先度を下げる。
- **P6 ── カバレッジの穴を扱いやすさでラベル付けする**──「ここに型を足せ」リスト中のジェネリック型パラメータ／フレームワークDSLの箇所にマークを付け、ユーザーが手書きRBSでは塞げないものを追いかけないようにする。
- **P7 ── 小さな勝ち**──存在しないパスはwarn-and-skipする。「RBSのないgem」の助言を`.rigor.yml:1:1`から外す。可搬でない絶対パスの`cache.path`にフラグを立てる。素の`rigor describe`にエイリアスを付ける。`# @rbs`の検出時に`rigor-rbs-inline`を自動提案する。

### 方法上の注意

ソースからの呼び出しの摩擦（Part 1）は**ドッグフーディングのアーティファクト**であって製品の問題ではない──どのサブエージェントにも、正確な`bundle exec`＋絶対パスの`BUNDLE_GEMFILE`/`BUNDLE_PATH`のレシピを手渡す必要があり、それでも1体のエージェントの反射的な`ruby -Ilib`は`check`を壊しただろう。`mise`/`gem install`でインストールしたエンドユーザーは自分のプロジェクトで`rigor`を実行するだけだ。しかしこれは、サーベイ／ドッグフーディングのレシピを書き留めなければならない（今やここに書かれた）ことを裏づける。

### サーベイのアーティファクト（未コミット）

サブエージェントは3つの新規プロジェクト（`faraday`、`haml`、`rgl`）に`.rigor.dist.yml`を書き出した。`liquid`/`strap`/`redmine`は既存の設定を使った。いずれもコミットしていない。
