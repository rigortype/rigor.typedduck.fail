---
title: "Real-world Rails project survey (2026-05-15)"
description: "rigortype/rigor docs/notes/20260515-real-world-rails-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260515-real-world-rails-survey.md"
sourcePath: "docs/notes/20260515-real-world-rails-survey.md"
sourceSha: "a5baa91d29b3e946285c81ce3f14bfa066ae4fd54338740bbec31cf4f039f302"
sourceCommit: "fe4e9a80df3829ee4f113e763e4bb9920c33da21"
translationStatus: "translated"
sidebar:
  order: 20266515
---

v0.1.5進行中（コミット`642cf28`以降）の状態で、4つの実世界Railsコードベースに対して`rigor check`を走らせた走り書き記録です。目的は2つあります。

1. **解析器の到達範囲を測定する**。仕様コーパスに含まれていなかったRails型のコードに対する、ウォール時間、ピークメモリ、診断ミックス、プラグインのカバレッジギャップなど。
2. **エンジンのバグや人間工学的なギャップをあぶり出す**。合成フィクスチャやrigor自身の`lib/`では現れないもの。各プロジェクトはエンジンの異なる部分（サイズ、メタプログラミングの深さ、gemの表面積、モンキーパッチの密度）に違ったストレスを与えます。

方法論と対象サイズ。

| プロジェクト | 状態 | ファイル数 | 備考 |
| --- | --- | ---: | --- |
| [Redmine](https://github.com/redmine/redmine) | 完了 | 347 | 4つのうち最小 — エンジンバグの試運転に使用。 |
| [Discourse](https://github.com/discourse/discourse) | 完了 | 1,804 | フォーラム基盤。プラグイン／フックの表面積が大きい。 |
| [Mastodon](https://github.com/mastodon/mastodon) | 完了 | 1,302 | ActivityPubソーシャルサーバー。ActiveJob／Sidekiqを多用。 |
| [GitLab FOSS](https://gitlab.com/gitlab-org/gitlab-foss) | 完了 | 11,130 | 元の4つのうち最大 — 深いメタプログラミングを持つRailsモノリス。 |
| [Forem](https://github.com/forem/forem) | 完了（第2ラウンド） | 1,250 | DEV.toコミュニティ基盤。 |
| [Solidus](https://github.com/solidusio/solidus) | 完了（第2ラウンド） | 1,914 | Eコマースモノレポ（`core` + `api` + `backend` + `admin` + `promotions` + `legacy_promotions`）。 |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | 完了（第2ラウンド） | 802 | カスタマーサポート基盤。 |
| [Canvas LMS](https://github.com/instructure/canvas-lms) | 完了（第2ラウンド） | 3,248 | InstructureのLMS。`app` + `lib` + `gems`（インツリーのgem）。 |
| [OpenProject](https://github.com/opf/openproject) | 完了（第2ラウンド） | 6,817 | プロジェクト管理基盤。`app` + `lib` + `modules`（サブエンジン）。 |
| [Loomio](https://github.com/loomio/loomio) | 完了（第3ラウンド） | 563 | 協働／グループ意思決定のRailsアプリ。 |
| [Publify](https://github.com/publify/publify) | 完了（第3ラウンド） | 15（アプリシェルのみ） | Railsアプリシェル。実コードは外部の`publify_core` gemにある。 |
| [Diaspora](https://github.com/diaspora/diaspora) | 完了（第3ラウンド） | 371 | 連合型ソーシャルネットワークRailsアプリ。 |
| [Dependabot Core](https://github.com/dependabot/dependabot-core) | 完了（第3ラウンド） | 1,089（19エコシステムディレクトリにまたがる） | **Rails以外** — 依存性自動更新のためのRuby SDK／ライブラリ。「Bundler内部を多用する非Rails慣用句のRubyに対して解析器はどう振る舞うか？」のベースラインとして有用。 |
| [tDiary Core](https://github.com/tdiary/tdiary-core) | 完了（第3ラウンド） | 244（lib + plugin + entryスクリプト） | **Rails以外** — Rails以前のRubyブログエンジン。「ActiveSupportがスコープに無い古典Rubyの慣用句に対して解析器はどう振る舞うか？」のベースラインとして有用。 |

各パスは次のように走らせます。

```sh
nix --extra-experimental-features 'nix-command flakes' develop \
  --command bundle exec exe/rigor check --format=json \
  /tmp/<project>/app /tmp/<project>/lib > <project>.json
```

逐次／ウォームキャッシュ実行が主要な計測対象です。プールモード（`--workers=N`）は等価性チェックとタイミング比較のためにのみ実行します。「ウォーム」とは、同一リビジョンに対する事前の逐次パスでプロジェクト毎の`.rigor/`キャッシュが構築済みであることを意味します。

---

## Redmine

ソース: `https://github.com/redmine/redmine`（depth-1の浅いクローン、特定リビジョンへの固定は無し — 2026-05-15時点のmaster HEAD）。

### 定量サマリー

この調査が引き起こした2つのエンジン改善（コミット`642cf28`）の前後で2つのスナップショット。

| メトリクス | `642cf28`以前 | `642cf28`以後 | Δ |
| --- | ---: | ---: | --- |
| スキャン対象ファイル | 347 | 347 | — |
| ウォール時間（ウォームキャッシュ） | 2.82 s | 2.82 s | — |
| ウォール時間（コールドキャッシュ） | 3.77 s | 3.77 s | — |
| ピークRSS | 266 MB | ~268 MB | — |
| 診断件数合計 | 389 | **343** | −46 |
| エラー | 334 | **288** | −46 |
| 警告 | 55 | 55 | — |

46件の減少は1つのルール群のみに由来します。`call.possible-nil-receiver`が69→23。他のどのルール件数も動かず、新しい診断も導入されていません。（プールモード比較は後述。）

### ルールミックス（`642cf28`以後）

| 件数 | ルール |
| ---: | --- |
| 243 | `call.undefined-method` |
| 23  | `call.possible-nil-receiver` |
| 24  | `flow.always-truthy-condition` |
| 22  | （パースエラー — Rails generatorのテンプレートファイル。後述参照） |
| 17  | `flow.dead-assignment` |
| 14  | `def.ivar-write-mismatch` |

### プールモードの等価性

`642cf28`の深いshareability修正の後、Redmineに対する`--workers=4`は逐次と**バイト単位で同一**の診断ストリームを生成します（狭化前のスナップショットで389 == 389、その後で343 == 343）。タイミング。

| モード | ウォール時間 | ピークRSS |
| --- | ---: | ---: |
| 逐次（ウォーム） | 2.82 s | 266 MB |
| プール`workers=4`（ウォーム） | 3.70 s | 948 MB |
| プール`workers=8`（ウォーム） | 8.39 s | 1.60 GB |

このサイズのプロジェクトではプールモードは依然として誤ったデフォルトです。Ractor毎のenvビルド+Marshal復元が、ファイルあたり~10 ms推論の並列スピードアップを圧倒します。これは[ADR-15 OQ1](../../adr/15-ractor-concurrency/)の注意事項と一致します。プール経路は今や正しい（IsolationError無し、バイト単位で同一の出力）。いつ「より速く」なるかという問いは未解決のままです。

### `call.undefined-method` — Rails拡張のロングテール

243件のほとんどはstdlibのRBSに無いActiveSupport／Railsのコア拡張です — 実際のバグではありません。

| 件数 | セレクタ／レシーバー | 由来 |
| ---: | --- | --- |
| 75 | `String#html_safe`, `"…".html_safe` | `ActiveSupport::SafeBuffer`ミックスイン |
| 24 | `Array.wrap(...)` | `ActiveSupport::CoreExtensions::Array::Wrapper` |
| 12 | `Time.parse` | stdlib `time` — ユーザーコードに`require 'time'`が欠落 |
| 6+ | `Hash#deep_dup`, `Hash#symbolize_keys`など | ActiveSupportの`Hash`コア拡張 |
| 6+ | `Integer#days`, `#minute`, `#day`, `#year`, `#seconds` | `ActiveSupport::Duration` |
| 4 | `String#constantize` | ActiveSupportの`String`コア拡張 |
| 2+ | `String#underscore`, `#demodulize`, `#to_hours` | ActiveSupportの`String`コア拡張 |

専用の`rigor-activesupport-core-ext`プラグインが予定された対応策です。モンキーパッチの事前評価のためのconfigノブが、プロジェクト固有のパッチに対する補完的な対応策です。両方ともエージェント側のメモリストア（`project_activesupport_core_ext_plugin`）に将来の方向として記録されていますが、コミットされたマイルストーンはありません。

### バグ発見価値のある所見（Rails非依存）

- **`call.possible-nil-receiver` 23（修正後）**。残りのケースのほとんどは、ループ反復パターンか、ガードの後に再束縛される形で、狭化がまだカバーしていないものに見えます。まだフラグされるパターン例。

  ```ruby
  if cond
    val = compute  # nullable
    next if val.nil?
    val.attr      # narrowing across `next if` not yet flow-tracked
  end
  ```

- **`def.ivar-write-mismatch` 14**。同じインスタンス変数が異なる代入で非互換な型に束縛されています。`User#@projects_by_role` ⇄ `NilClass`/`Hash`、`Wiki#@page_found_with_redirect` ⇄ `FalseClass`/`TrueClass`など。メモ化済みかまだ計算されていないかという状態を表すRubyの慣用句で、警告として使えますが境界的にノイズが多いです。

- **`flow.dead-assignment` 17**。複数の`_controller.rb`アクションといくつかのヘルパーで、未読のローカル変数代入があります。上流に報告する価値あり: 例えば`app/controllers/issues_controller.rb:401`は`bulk_update`内で`journal`を代入していますが読みません。

- **`flow.always-truthy-condition` 24**。定数畳み込みされた分岐。例: `app/controllers/repositories_controller.rb:427-429`。

### Redmineが駆動したエンジン改善（既にランディング済み）

`642cf28` — 「Bank Redmine real-world findings: pool shareability + assignment narrowing」。

1. **プールモード（Phase 4b.xフォローアップ）: 3つの深いshareabilityギャップ**がこのプロジェクトでワーカーRactorのIsolationErrorによって表面化:
   - `NumericCatalog#@catalog`（YAMLグラフを深く共有化）
   - `Type::Refined::CANONICAL_NAMES`（ネストされたArrayキー）
   - `Builtins::RegexRefinement::RULES`（ネストされたArray行）

2. **`if cond && (var = expr)`の狭化**。`Inference::Narrowing#analyse`に4つの新しい書き込みノードケース（`LocalVariableWriteNode` + ivar/cvar/global）。Redmineではこれが`call.possible-nil-receiver`を69→23に減らし、回帰はゼロでした。

### フォローアップトラックに繰り越されたオープン項目

| ID | 項目 |
| --- | --- |
| O1 | `active_support/core_ext`プラグイン + config側モンキーパッチ事前評価。（メモリ: `project_activesupport_core_ext_plugin`。） |
| O2 | マクロテンプレート展開（ERB `.rb`テンプレート、`class_eval <<~RUBY`ヒアドキュメント）— `lib/generators/redmine_plugin_model/templates/migration.rb`の22件の`rb-with-erb`パースエラーも回復させる。（メモリ: `project_macro_template_expansion`。） |
| O3 | 同一ブロック内の早期離脱ガードを越えた`next if x.nil?`／`return if x.nil?`のフロー追跡狭化。 |

---

## Bundlerを意識した解析 — 今日のO4の探索

調査の自然な続き: rigorは**プロジェクトのgemもスコープに入れた状態で**プロジェクトを解析できるか？ — つまり`User.where(...)`がActiveRecordの`where`に解決され、`Sidekiq::Worker#perform`がSidekiqのRBSにマッチする、といった具合に。

### Dockerベースのbundle installデモンストレーション（Mastodon、2026-05-15）

bundle installのハードルに続けて、`ruby:4.0.3-slim-trixie`（Docker）の中で実際にMastodonの`bundle install`を実行しました。エンドツーエンドで動作しました — aptの依存関係がインストールされ（`libpq-dev`、`libidn-dev`、`libxml2-dev`、`libxslt-dev`、`libvips-dev`、`libjemalloc-dev`、`git`など。1つのパッケージ名変更: Trixieは`libpcre3-dev`ではなく`libpcre2-dev`を提供）、Bundler 4.0.11がインストールされ、`bundle install --jobs=8`が343個のgem全てを解決し、`/tmp/mastodon-bundle`（271 MB）に展開しました。

**重大な所見: インストールされた343個のgemのうち、`sig/`ディレクトリをgemパッケージに同梱しているのはわずか10個（約3%）です**。全リスト:

```
prism, aws-sdk-s3, aws-sdk-kms, aws-sdk-core,
playwright-ruby-client, mutex_m, webrick, base64,
stoplight, ffi
```

`pg`、`mysql2`、`nokogiri`、`bcrypt`、`redis`、`idn-ruby`、`actionpack`、`activerecord`、`activesupport`、`sidekiq`、`devise`、`pundit`、`kaminari`、`puma`、そしてその他の人気のあるRails／認証／キャッシュ／キューファミリーのgemパッケージには`sig/`が**ありません**。`gem_rbs_collection`が、これらのgemに対する型付き契約の事実上のソースです。

このデータポイントはコミット`f9b94d2`の設計判断を強化します。よく使われる半ダース程度のネイティブ拡張gemに対するベンダーRBSをrigor自身に同梱することが、現実的な「すぐ使える」道です。そうでなければエンドユーザーは`gem_rbs_collection`を`signature_paths:`にgemバージョン毎に手動で配線する必要があり、その配線はいずれにせよO7（後述）にぶつかります。

**オープン項目O7（RBSのenvビルドの崖）は当初の評価より深刻です**。rigor自身のロード済みsig上にgem同梱の`sig/`ディレクトリを**1つだけ**（具体的にはprismのsig、約19個の.rbsファイル）追加すると、`RBS::Environment.from_loader`は5分以上ハングします（強制終了）。Diasporaの16-paths-coldの実験（11分以上）は同じ症状でパス数がより多いものです。もっともらしい説明: prismのsigはrigorの事前ロード済みprism RBS（rigorは内部でprismを使用）と重複するクラスを宣言しており、リゾルバが重複クラスのグラフ走査で爆発します。**O7が修正されるまで、gem同梱のsig経路は使えません** — bundle installが成功してもです。

### 最新の状態（コミット`f9b94d2`でベンダーRBSがランディング後）

rigorは現在、**6つの一般的なネイティブ拡張gemに対する組み込みRBSスタブ**（`pg`／`mysql2`／`nokogiri`／`bcrypt`／`redis`／`idn-ruby`）を同梱しています。スタブは`data/vendored_gem_sigs/<gem>/`配下にあり、自動的にロードされます — `signature_paths:`設定は不要です。すぐに使える状態で、利用可能なRBSクラスは1,134から**1,273（+139）**に増加しました。

14の調査プロジェクト全体に対する定量的影響。

| プロジェクト | ベースライン | O1 v2を入れた状態 | + ベンダースタブ |
| --- | ---: | ---: | ---: |
| Redmine | 389 | 157 | 157 |
| Discourse | 1,439 | 423 | 429 |
| Mastodon | 521 | 124 | 124 |
| GitLab FOSS | 2,982 | 489 | 491 |
| Forem | 691 | 146 | 149 |
| Solidus | 528 | 42 | 42 |
| Chatwoot | 300 | 19 | 21 |
| Canvas LMS | 3,296 | 1,496 | 1,506 |
| OpenProject | 2,356 | 175 | 176 |
| Loomio | 207 | 63 | 63 |
| Publify | 0 | 0 | 0 |
| Diaspora | 65 | 5 | 5 |
| Dependabot Core | 205 | 58 | 58 |
| tDiary Core | 111 | 106 | 106 |
| **合計** | **13,090** | **3,303** | **3,327** |

ベンダースタブはネットで+24の増加を生みます — 追加されたRBSが本物の新しい問題と、不完全なスタブによる偽陽性の両方を捕まえる、精度／カバレッジのトレードオフです。ほとんどのプロジェクトは+0で、わずかな増加はCanvas LMS（+10）、Discourse（+6）、Forem（+3）、GitLab FOSS（+2）、Chatwoot（+2）に集中しており、いずれもベンダーされた4.2／1.11スナップショットに無いgem APIを使うものです。これらのギャップを埋めるのはgem毎の`<gem>_extras.rbs`ファイル（`nokogiri_html5.rbs`と`redis_extras.rbs`が最初の2つ）によって漸進的に行えます。

より大きな全体像での勝利。

- **`Mysql2::Client`／`PG::Connection`／`Nokogiri::XML::Node`のレシーバーが`Dynamic[top]`でなくなる** — 全ての呼び出し箇所で精密なディスパッチが効くようになります。
- **Mastodonの`idn-ruby`ブロッカーは静的解析にとって無意味になる**。ユーザーは有用なMastodon解析を得るために`libidn`をシステムにインストールする必要が無くなりました。
- **すぐ使える設定**: エンドユーザーは各gemのRBSを`signature_paths:`に手動で配線する必要がもはやありません。

### 今日動くもの（ベンダリング前 — 文脈として残す）

新しい解析器コード無しでも2つの経路があります。

1. **対象プロジェクトのBundlerコンテキストの中でrigorを実行する**。`BUNDLE_GEMFILE=<target>/Gemfile bundle exec rigor check ...`とすれば`RBS::EnvironmentLoader.add(library: gem_name)`が`sig/`を同梱しているgemを全て見つけます。今日の`RbsLoader.build_env_for`は`libraries:`設定を介してこれを実際に尊重します — ただしユーザーはライブラリを明示的に列挙する必要があり、rigorはまだ対象の`Gemfile.lock`からそれらを自動発見しません。
2. **`signature_paths:`にgemのRBSを追加する**。[`gem_rbs_collection`](https://github.com/ruby/gem_rbs_collection)はコミュニティRBSリポジトリです — 2026-05-15時点で172個のgemがあり、gem毎にバージョン管理されています（例: `gems/activerecord/{6.0, 6.1, 7.0, 7.1, 7.2, 8.0}`）。該当するバージョン毎のパスを`.rigor.yml`の`signature_paths:`に追加すれば、rigorはそれらを拾います。

### 遭遇した実用的なハードル

- **ネイティブgemのビルド**。Mastodonに対する`bundle install`は`idn-ruby`で失敗しました（Nixシェルにlibidnが無い）。Railsプロジェクトは日常的に`pg`／`mysql2`／`nokogiri`／`idn-ruby`／`ffi`などのシステムライブラリを必要とするgemに依存しています。エンドユーザーはBundlerコンテキストが既にビルドされる自身の開発／CIマシンでrigorを実行すれば解決します。調査マシンではそうではありません。
- **Rubyバージョンの不一致**。14のサーベイ対象プロジェクトのほとんどは`.ruby-version`でRuby 3.3／3.4を固定しています。rigorのFlakeは4.0.4を提供します。バージョンが不一致だとBundlerはインストールを拒否します。Mastodon（`ruby '>= 3.3.0', '< 4.1.0'`）は調査の中で4.0.4を許容するRubyバージョン範囲を持つ唯一のプロジェクトでした。
- **`gem_rbs_collection`のバージョン固定**。コレクションが`gems/<name>/<version>/`という構造のため、ユーザーはgem毎に正しいバージョンを選ぶ必要があります。rigorはこの解決を自身では行いません — それがO4が埋めるべき欠けたピースです。

### 定量的実験（Diaspora + Mastodon、中規模gemサブセット）

Diaspora（Rails 6.1）でO1 v2 + 5つのgemサブセット（`activerecord/6.1` + `activesupport/7.0` + `activemodel/7.1` + `actionpack/7.2` + `activejob/6.0`）の場合。

| メトリクス | O1 v2のみ | + 5-gem RBSサブセット |
| --- | ---: | ---: |
| 利用可能なRBSクラス | 1,039 | **2,478** |
| コールドウォール時間 | 1.35 s | 9.47 s |
| ウォームウォール時間 | （該当なし） | 1.05 s |
| 診断 | 5 | **3** |

Mastodon（Rails 8）でO1 v2 + 同じサブセットの場合。

| メトリクス | ベースライン | O1 v2 | + 5-gem RBSサブセット |
| --- | ---: | ---: | ---: |
| 利用可能なRBSクラス | 1,039 | 1,039 | **2,505** |
| コールドウォール時間 | 3.31 s | （同程度） | 12.39 s |
| 診断 | 521 | 124 | **128** |

Mastodonの診断件数はgemサブセットの下でわずかに**増加**しました — 教科書的な**精度／カバレッジのトレードオフ**: 既知のRBSが増えればより多くのメソッドをチェックでき（よってAR／AS-Inflectorなどの残存`call.undefined-method`が約0に下がる）、**かつ**より多くのnullableレシーバー狭化が正しく発火します（`call.possible-nil-receiver`が約70から97に上昇）。新しい診断のうちいくつかはrigorが以前見えなかった本物のバグでしょうし、いくつかはgemのRBSそのものが厳格すぎる偽陽性（典型的には`String`と宣言された入力に実際の呼び出し元は`ActiveSupport::SafeBuffer`なども渡す）でしょう。

### オープンなパフォーマンス問題（上記の項目O7）

Diasporaで10個以上のgem RBSの.sigを`signature_paths:`に同時に入れてコールドロードすると、11分以上経過後に強制終了されました。同じワークロードを5パスで行うと7〜9秒で完了します。`RBS::Environment.from_loader`／`resolve_type_names`で重複する名前空間が多数収束した際の非線形な相互作用の可能性があります。O4がランディングする前に調査する価値あり — 実世界Railsプロジェクトの`Gemfile.lock`は通常50〜150個のgemを列挙しており、5個ではありません。

### O4が上に積み足すもの

- 解析対象パスの隣にある`Gemfile.lock`を自動発見する。
- gem毎のバージョン解決: `Bundler.locked_gems.specs.find { |s| s.name == "activerecord" }.version` -> `gem_rbs_collection`の利用可能バージョンにマッチさせるか、「生」のRBS envにフォールバックする。
- gem毎のRBSソース解決: gem内の`sig/`を優先（一部のgemは独自に同梱している）、`gem_rbs_collection`にフォールバック、最終フォールバックはADR-10の`dependencies.source_inference`ウォーカー。
- キャッシュ: Gemfile.lockのダイジェスト毎に1つの`RBS::Environment`キャッシュスロットを、gem毎のバージョンタプルでキーとして持つ。
- gemのRBSが利用不能なときの優雅な低下メッセージ（ユーザーがインストールするか、ソース推論をオプトインすべきと知るため）。

## 第3ラウンドのプロジェクト（Loomio／Publify／Diaspora／Dependabot Core／tDiary Core）

第3ラウンドの一掃。小／マイクロ／中規模のRailsアプリ3つ（Loomio／Publify／Diaspora）と、解析器とActiveSupport型のRBSバンドルがRailsの慣用句の外でどう振る舞うかを較正するための**Rails以外のRubyプロジェクト2つ**を含みます。

### 定量サマリー

| プロジェクト | ファイル数 | ウォール（ウォーム） | ピークRSS | ベースライン | O1 v2を入れた状態 | Δ |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Loomio | 563 | 2.36 s | 238 MB | 207 | **63** | −144（−70%） |
| Publify（アプリシェルのみ） | 15 | 0.66 s | 243 MB | **0** | 0 | 0 |
| Diaspora | 371 | 1.35 s | 258 MB | 65 | **5** | −60（−92%） |
| Dependabot Core（非Rails） | 1,089 | 13.02 s | 226 MB | 205 | **58** | −147（−72%） |
| tDiary Core（非Rails） | 244 | 1.61 s | 254 MB | 111 | **106** | −5（−5%） |

5つ全てでプール ≡ 逐次（IsolationErrorゼロ）。

### 注目すべき所見（第3ラウンド）

- **PublifyはただのRailsアプリシェル**（`app/` + `lib/`配下に15個の.rbファイル）。実際のPublifyコードは`gem "publify_core", github: ...`で参照される外部の`publify_core`／`publify_amazon_sidebar`／`publify_textfilter_code`のgemにあります。rigorはこのリポジトリにチェックインされたものしか見ないため、診断件数はゼロです — 有用な境界ケースですが、Publify本体を代表するものではありません。
- **DiasporaはサーベイのRailsアプリの中で最もクリーン** — O1 v2の後で371ファイルに対し5件の診断。
- **Dependabot Core（非Rails）でもActiveSupport型のバンドルから実質的に恩恵を受ける**（−72%）。理由: 多くの非Ruby Railsプロジェクトは起動時にActiveSupport（または`active_support/core_ext/...`経由でその断片）をロードし、コードはRailsアプリと同じ`Object#blank?`／`#present?`／`#try`／`String#exclude?`／`Enumerable#index_by`の慣用句を使います。残りの58件は**BundlerのSingletonクラス呼び出し**（`Bundler::Definition.build` × 10、`Bundler.settings` × 7、`Bundler::Dependency.new(...)`が誤った引数数として5回フラグされる）で占められています — 全てO4（対象Bundler認識）の症状です。Dependabotは`bundler/helpers/v*/monkey_patches/`配下にBundlerに対する独自のモンキーパッチを同梱しており、正しく型付けするためにrigorは事前評価する必要があります。
- **tDiary CoreはO1からほとんど恩恵を受けない**（−5%）。これはActiveSupport-as-utilityの慣用句より前のもので — Rubyは古典的なstdlibのみのスタイル。tDiaryの残存診断は`#month=`／`#year=`セッターが`on Object`としてフラグされる（`misc/plugin/category-legacy.rb`で35件）で占められています。プラグインファイルは実行時にホストプラグインクラスへ`instance_eval`され、`def`がファイルのトップレベルにあるためrigorはレシーバークラスを見ることができません — まさにオープン項目O2（ヒアドキュメント／`instance_eval` Ruby展開）に並んでいるマクロ展開の経路です。
- **Loomioのミックスは異常** — 63件のうち34件は`flow.dead-assignment`（54%）で、`call.undefined-method`はわずか11件。コードベースは他より顕著にAS慣用句的でなく、RBSバンドルからの恩恵が少ないです。

### 第3ラウンドの解析器向け教訓

1. **これまで一掃した14プロジェクト全てでプール ≡ 逐次が証明された**（約29,560ファイルにわたって`Ractor::IsolationError`ゼロ）。Phase 4b.xの4つのshareabilityフォローアップ + CONSTANT_CONSTRUCTORSのlambda修正は、実世界の対象の多様性に対して堅牢です。
2. **ActiveSupport型のRBSバンドルは非RubyのRubyにとっても有用** — Dependabot Coreの−72%はActiveSupportの慣用句（`Object#blank?`ファミリー、`Enumerable#index_by`、`String#exclude?`）がRailsの外でも広く使われていることを確認しました。
3. **tDiaryの`instance_eval`プラグインパターンはO2の動機付け** — Rails以前の時代の慣用句もRailsジェネレータの`.rb`-as-ERBテンプレートと同種のメタプログラミングの壁にぶつかります。

## 第2ラウンドのプロジェクト（Forem／Solidus／Chatwoot／Canvas LMS／OpenProject）

5つの追加Railsプロジェクトの第2ラウンドの一掃。第1ラウンドのエンジン修正（Pool deep-shareabilityフォローアップ#1〜#3、狭化拡張、パラメータ化された祖先射影、v1 RBSバンドル）の後で実行しました。

### プロジェクト毎のルールミックス

| プロジェクト | 合計 | `call.undefined-method` | `possible-nil-receiver` | `flow.always-truthy-condition` | `def.ivar-write-mismatch` | `call.wrong-arity` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Forem | 146 | 55 | 47 | 15 | 27 | — |
| Solidus | 42 | 33 | 3 | 4 | 1 | 1 |
| Chatwoot | 19 | 6 | 11 | 1 | 2 | — |
| Canvas LMS | 1,496 | 766 | 445 | 194 | 83 | 11 |
| OpenProject | 175 | 138 | 27 | 11 | 8 | 4 |

### 第2ラウンドが引き起こしたエンジン改善

v1 RBSバンドルは、このラウンドで表面化した5つの追加メソッドファミリーを伴ってv2に拡張されました。

1. `Array#compact_blank`／`Hash#compact_blank`（Rails 6.1+）。
2. `Array#exclude?`／`String#exclude?`／`Hash#exclude?`（`Enumerable`も再公開）。
3. `Enumerable#index_with`／`#index_by`／`#pluck`／`#pick`／`#sole`／`#including`／`#excluding`／`#without`。
4. `Hash.from_xml`、`Hash#reverse_merge`／`#reverse_merge!`。
5. `DateTime`の計算（`#utc`、`#in_time_zone`、`#yesterday`、`#tomorrow`、`#beginning_of_*`、`#end_of_*`、`#ago`、`#since`）。

9つのサーベイプロジェクト全体に対する組み合わせv1 + v2の定量的影響: **合計12,502 → 3,071（-75%）**、`call.undefined-method`**10,589 → 1,426（-87%）**。

### 注目すべき所見（第2ラウンド）

- **Solidusの`lib/`の数は誤解を招く（リポジトリルートにはわずか2ファイル）**。エンジンのサブツリー（`core/`、`api/`、`backend/`、`admin/`、`promotions/`、`legacy_promotions/`）にコードがあります。rigorの設定は各サブツリーを明示的なパスとして列挙します。Solidusの診断件数は42まで下がります — 非常にクリーン。
- **Canvas LMSは第2ラウンドの残存を支配する（1,878件のうち1,496件 — 80%）**。トップセレクタ: `[]= on Integer`（70 — おそらくレシーバー推論が誤り）、`[]= on nil`（51）、`<< on nil`（40）。これらはRBSカバレッジのギャップではなく、狭化層の限界です。Canvasはまた、プロジェクト固有の`Numeric#decimal_megabytes`、`File.mime_type`などを同梱しており、そこのロングテールを閉じるにはO4（対象Bundler認識）と、`.rigor.yml`内のCanvas固有のモンキーパッチ宣言が必要です。
- **OpenProjectの`from_xml`／`compact_blank`クラスタはv1 → v2の動機付け** — `Hash.from_xml`単独でOpenProjectの残存undefined-methodsの10件を占めていました。

## Discourse

ソース: `https://github.com/discourse/discourse`（depth-1の浅いクローン、2026-05-15時点のmaster HEAD）。

### 定量サマリー（`642cf28` + Discourseが駆動したshareability修正の後）

| メトリクス | 逐次ウォーム | プール`workers=4`ウォーム |
| --- | ---: | ---: |
| スキャン対象ファイル | 1,804 | 1,804 |
| ウォール時間 | 7.46 s | **5.82 s**（逐次より1.28倍速い） |
| ピークRSS | 244 MB | 842 MB |
| 診断件数合計 | 1,439 | 1,439 |
| エラー | 1,325 | 1,325 |

このサイズではプールが逐次より速い — 調査が観測した**最初のウォール時間でのクロスオーバー**。

### ルールミックス

| 件数 | ルール |
| ---: | --- |
| 1,078 | `call.undefined-method` |
| 217 | `call.possible-nil-receiver` |
| 61 | `flow.always-truthy-condition` |
| 46 | `def.ivar-write-mismatch` |
| 22 | `call.wrong-arity` |
| 8 | `call.argument-type-mismatch` |
| 7 | `flow.dead-assignment` |

### Discourseが引き起こしたエンジン改善

Discourseに対するプールの初回実行は、`Rigor::Inference::MethodDispatcher::ShapeDispatch::REFINED_STRING_PROJECTIONS`（2要素Symbol配列をキーとするHash — Redmineのパスで表面化したPhase 4b.xの3つのフォローアップ箇所と同じ形）へのワーカーRactorディスパッチで**8件の`Ractor::IsolationError`**を表面化させました。現在は`Ractor.make_shareable`済み。新しい監査アサーションが不変条件を固定します（`spec/rigor/ractor_readiness_spec.rb` § 「Phase 4b.x — module catalog shareability」）。修正後、プール ≡ 逐次。

### 注目すべき所見

- **`Time.zone` 182件** — `ActiveSupport::TimeWithZone`拡張。Redmineよりさらに大きいActiveSupport拡張のボリューム。
- **`Integer#day`／`#hour`／`#minute`／`#days`／`#minutes`／`#hours`** — `ActiveSupport::Duration`の数値強制。数百件。
- **`call.wrong-arity on Class` 18件** — Discourseのサービスクラス（`DatabaseRestorer.new(...)`、`MetaDataHandler.new(...)`、`OpenStruct.new(...)`）。レシーバークラスがrigorのRBS envに無いため、ディスパッチは`Class#new`（引数なしのデフォルトイニシャライザ）にフォールバックし、引数数を誤りと報告します。`OpenStruct`は特にRuby 4.0でデフォルトgemの地位を失いました。DiscourseのGemfile.lockはそれをピン留めしますが、rigorの解析envは対象プロジェクトのBundlerコンテキストを見ないため、gemのRBSはロードされません。
- **`call.argument-type-mismatch on URI.encode_www_form` 5件以上** — RBS署名は`(?Enumerable[[_, _]])`ですが、実世界の呼び出し元は`Hash`を渡します。Hashは実行時に`[K, V]`ペアに対する`Enumerable`です。rigorのサブタイピングはここでHash → `Enumerable[[K, V]]`の関係を認識しません。別のエンジントラックとして調査する価値あり。

### Discourseが提起したオープン項目

| ID | 項目 |
| --- | --- |
| O4 | 対象プロジェクトのBundler認識 — プロジェクトの`bundle exec`コンテキストの外で実行しているときに対象のgem RBSをロードする（Ruby 4.0+のOpenStructや、出荷RBSのある非デフォルトgemをカバー）。 |
| O5 | パラメータバインダー向けの`Hash <: Enumerable[[K, V]]`サブタイピング。 |

---

## Mastodon

ソース: `https://github.com/mastodon/mastodon`（depth-1の浅いクローン、2026-05-15時点のmaster HEAD）。

### 定量サマリー

| メトリクス | 逐次ウォーム | プール`workers=4`ウォーム |
| --- | ---: | ---: |
| スキャン対象ファイル | 1,302 | 1,302 |
| ウォール時間 | 3.31 s | 3.98 s |
| ピークRSS | 238 MB | 878 MB |
| 診断件数合計 | 521 | 521（≡ 逐次） |
| エラー | 487 | 487 |

プール ≡ 逐次がすぐに成立 — 新しいエンジンバグは見つからず。このサイズではプールは逐次より遅く、クロスオーバーはMastodon（1.3 Kファイル）とDiscourse（1.8 Kファイル）の間に位置し、Marshal復元のオーバーヘッドでシフトしています。

### ルールミックス

| 件数 | ルール |
| ---: | --- |
| 414 | `call.undefined-method` |
| 73 | `call.possible-nil-receiver` |
| 26 | `def.ivar-write-mismatch` |
| 8 | `flow.always-truthy-condition` |

### 注目すべき所見

- 同じRails拡張のロングテール（`Integer#day/#hour/#minute/#minutes/#seconds`、`String#squish`、`Time.zone`）。ランキングは異なりますが原因はRedmineやDiscourseと同一で、`active_support/core_ext`のRBSカバレッジが欠落していることです。

---

## GitLab FOSS

ソース: `https://gitlab.com/gitlab-org/gitlab-foss`（depth-1の浅いクローン、2026-05-15時点のmaster HEAD）。サーベイの中で最大の対象。

### 定量サマリー

| メトリクス | 逐次ウォーム | プール`workers=8`ウォーム |
| --- | ---: | ---: |
| スキャン対象ファイル | 11,130 | 11,130 |
| ウォール時間（ウォーム） | 25.27 s | **15.43 s**（逐次より1.64倍速い） |
| ウォール時間（コールド） | 25.33 s | — |
| ピークRSS | 248 MB | 1.30 GB |
| 診断件数合計 | 2,982 | 2,983（+1。下記参照） |
| エラー | 2,857 | 2,858 |

このサイズのプロジェクトではプールが逐次より十分に速いです。ピークRSSが1.3 GBになるのが代償で、逐次の5倍です。ここではクロスオーバーが確固として確立しています。将来のプールモード作業に対する問いは、遅延されたRactor毎の`Cache::Store`共有ファサード（ADR-15 § OQ1）でRSS／ウォール時間のトレードオフをさらに動かせるか、です。

### ルールミックス

| 件数 | ルール |
| ---: | --- |
| 2,676 | `call.undefined-method` |
| 136 | `call.possible-nil-receiver` |
| 71 | `def.ivar-write-mismatch` |
| 52 | `flow.always-truthy-condition` |
| 43 | `call.wrong-arity` |
| 2 | `flow.dead-assignment` |
| 1 | `call.argument-type-mismatch` |
| 1 | （Redmineと同じく`.erb`型の`.rb`ジェネレータテンプレートからのPrismパースエラー） |

### プール対逐次 — 決定的な+1の乖離

プールは逐次が出力しない**1件**の診断を、`workers=4`／`workers=8`と複数回の実行にわたって決定的に出します。

```
lib/gitlab/mail_room.rb:17:56
  call.argument-type-mismatch
  argument type mismatch at parameter `dir` of `expand_path` on Pathname:
    expected String, got String | nil
```

最小再現（逐次は無音、プールは診断を出す）。

```ruby
require "pathname"
x = Pathname.new("../..")
y = x.expand_path(__dir__)   # __dir__ returns String | nil per RBS
```

`__dir__`のRBSの返り値は`String?`です。逐次は`MethodDispatcher::ConstantFolding`の`try_fold_pathname_binary`層を介して定数畳み込みします。プールはRBSディスパッチ層に到達し、そこでパラメータチェックが`String | nil`を拒否します。乖離は決定的で稀（11,130ファイル中1箇所）ですが、契約はバイト単位で同一の出力です — オープン項目O6として記録。

### 注目すべき所見

- **`Time.current` 324件** — ActiveSupport。このコーパスでRails拡張の欠落としてはるかにトップ。
- **`Array.wrap` 228件**、**`Integer#minute` 163**、**`Time.zone` 125** — 小さい対象と同じ`active_support/core_ext`のテール。比例して大きい。
- **`String#demodulize` 34**、**`#underscore` 32**、**`#squish` 37** — Inflector／ActiveSupportの`String`コア拡張。
- ユーザー定義クラスの`wrong-arity`問題（Discourse O4）がより大きな規模で繰り返されます。

### GitLab FOSSが提起したオープン項目

| ID | 項目 |
| --- | --- |
| O6 | Pathname引数チェックでのプール対逐次の精度の乖離。逐次が`try_fold_pathname_binary`を介して畳み込むのに対しプールはRBSディスパッチに到達する。両方の経路は個別には弁護できるが、契約はバイト単位で同一の出力を要求する。 |

---

## プロジェクト横断サマリー

| プロジェクト | ファイル数 | 逐次ウォーム | プールウォーム | プール ÷ 逐次 | ピークRSS（逐次／プール） | 診断（ベースライン） |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Redmine | 347 | 2.82 s | 3.70 s（`w=4`） | 1.31倍遅い | 266 MB / 948 MB | 389 |
| Chatwoot | 802 | 2.67 s | （異常な実行。システム負荷） | 該当なし | 274 MB / — | 300 |
| Mastodon | 1,302 | 3.31 s | 3.98 s（`w=4`） | 1.20倍遅い | 238 MB / 878 MB | 521 |
| Forem | 1,250 | 4.31 s | 4.60 s（`w=4`） | 1.07倍遅い | 260 MB / — | 691 |
| Discourse | 1,804 | 7.46 s | 5.82 s（`w=4`） | **0.78倍（より速い）** | 244 MB / 842 MB | 1,439 |
| Solidus | 1,914 | 7.36 s | 4.91 s（`w=4`） | **0.67倍（より速い）** | 275 MB / — | 528 |
| Canvas LMS | 3,248 | 17.32 s | 11.16 s（`w=4`） | **0.64倍（より速い）** | 272 MB / — | 3,296 |
| OpenProject | 6,817 | 18.84 s | 10.24 s（`w=4`） | **0.54倍（より速い）** | 246 MB / — | 2,356 |
| GitLab FOSS | 11,130 | 25.27 s | 15.43 s（`w=8`） | **0.61倍（より速い）** | 248 MB / 1.30 GB | 2,982 |
| Publify（シェルのみ） | 15 | 0.66 s | （未計測） | 該当なし | 243 MB / — | 0 |
| Diaspora | 371 | 1.35 s | （未計測） | 該当なし | 258 MB / — | 65 |
| Loomio | 563 | 2.36 s | （未計測） | 該当なし | 238 MB / — | 207 |
| tDiary Core（非Rails） | 244 | 1.61 s | （未計測） | 該当なし | 254 MB / — | 111 |
| Dependabot Core（非Rails） | 1,089 | 13.02 s | （未計測） | 該当なし | 226 MB / — | 205 |

**プールのウォール時間クロスオーバー**は、Mastodon／Forem（約1.3 Kファイル、プールが遅い）とDiscourse／Solidus（約1.8 Kファイル、プールが1.3〜1.5倍速い）の間に位置します。プールのメモリコストは逐次の3〜5倍です。ADR-15 OQ1の「Ractor毎のキャッシュファサード」が、クロスオーバーをより低く動かしピークRSSを上限化するための道として残っています。

**14プロジェクト全てでプール ≡ 逐次が証明された**。Phase 4b.xの4つの深いshareabilityフォローアップ（NumericCatalog、CANONICAL_NAMES、RegexRefinement::RULES、ShapeDispatch::REFINED_STRING_PROJECTIONS）とCONSTANT_CONSTRUCTORS lambda修正の後、サーベイの全プロジェクト — 2つの非Railsプロジェクト（Dependabot CoreとtDiary Core）を含む — が逐次とプールモードの間でバイト単位で同一の診断ストリームを生成します。一掃した31,840ファイルにわたってIsolationErrorはゼロ。

**サーベイ中に蓄えたエンジン修正**（コミット`642cf28` + Discourse修正）。

1. プールの深いshareabilityギャップ（合計4箇所）:
   `NumericCatalog#@catalog`、`Type::Refined::CANONICAL_NAMES`、`Builtins::RegexRefinement::RULES`、`MethodDispatcher::ShapeDispatch::REFINED_STRING_PROJECTIONS`。
2. `if cond && (var = expr)`の狭化（`Inference::Narrowing#analyse`に4つの新しい書き込みノードケース）。

4つのshareability箇所は全て同じ形 — 外側のコンテナは浅く凍結されたが内部の行はそうでなかったネストされた配列のHash／Array — を共有しています。監査specには4つそれぞれに対する明示的なアサーションがあり、将来の同等の回帰は実世界の対象プロジェクトをクラッシュさせるのではなく監査を失敗させます。

**診断の表面はRails拡張の不在によって支配される**。4プロジェクト全体で`call.undefined-method`が全診断の**64〜90%**を占め、トップセレクタは一様に`ActiveSupport::Duration`の数値強制（`#days`、`#hours`、`#minutes`）、Inflector／Stringコア拡張（`#demodulize`、`#underscore`、`#squish`、`#html_safe`、`#constantize`）、`Array.wrap`、`Hash`コア拡張（`#deep_dup`、`#symbolize_keys`、`#stringify_keys`）、`Time.current`／`Time.zone`です。専用の`rigor-activesupport-core-ext`プラグインがこの表面のほとんどを閉じるでしょう。config側のモンキーパッチ事前評価ノブが、プロジェクト固有の残りを閉じます。

### オープン項目の統合

| ID | 状態 | 項目 |
| --- | --- | --- |
| O1 | ランディング済み（MVP、v2） | `plugins/rigor-activesupport-core-ext/` — トップ約50個のActiveSupportコア拡張セレクタをカバーするコミュニティRBSバンドル。`signature_paths`経由でオプトイン。 |
| O2 | 待機中 | マクロテンプレート／ヒアドキュメントRuby展開。**tDiaryの`instance_eval`プラグインパターン（第3ラウンド）は、Railsジェネレータの`.rb`-as-ERBテンプレートと並ぶ具体的な動機付け事例**。 |
| O3 | 問題なし | `next if x.nil?`／`return if x.nil?`は既に狭化済み — サーベイ残存のnilレシーバーはほとんどが`Object#blank?`／`#present?`／`#try`のActiveSupport拡張で、O1のRBSバンドルがカバーする。 |
| O4 | Layer 1+2ランディング済み | 対象プロジェクトのBundler認識。`bundler.bundle_path:`（明示）と`bundler.auto_detect:`（`.bundle/config` → `vendor/bundle/`）が、gem同梱の`sig/`を`signature_paths:`に自動投入する。auto-skipリストがprism／stdlib競合を防ぐ。Layer 3（`Gemfile.lock`のパース + `gem_rbs_collection`マッチング）はまだ待機中。 |
| O5 | ランディング済み（`ac14c45`） | パラメータバインダーの`Hash <: Enumerable[[K, V]]`サブタイピング。 |
| O6 | ランディング済み（`4698437`） | 定数畳み込み／RBSディスパッチ境界（Pathname）でのプール対逐次の精度の乖離。 |
| O7 | ランディング済み（2026-05-15） | `signature_paths:`のエントリーがstdlibのRBS宣言を重複させると、RBS envビルドのパフォーマンスが崖から落ちる。根本原因はMastodonコントローラー解析での5ラウンドにわたる二分の末に追跡された: gem同梱の`prism/sig/prism.rbs`が`Prism::VERSION: String`を再宣言し、Rigorのバンドル済みstdlib RBS（Ruby 4.0+はprismをコアで提供）と衝突する。`RBS::Environment.from_loader(...)...resolve_type_names`が`RBS::DuplicatedDeclarationError`を上げる。修正前は`RbsLoader#env`の`@state[:env] ||= ...`メモが失敗を捕えなかったため、その後の全ての`env`アクセス（解析中に触れるASTノード毎に1回）で署名セット全体を再パースしていた — 1つのコントローラーファイルに対し35秒で390回のビルド。`@state[:env_loaded]`フラグで失敗をメモ化し、競合する`.rbs`を名指しする単一のユーザー向け警告を出し、nil-envケースを全てのコンシューマー（`each_known_class_name`、`class_decl_paths`、`constant_names`、`compute_class_known`、`build_instance_definition`、`build_singleton_definition`）でゲートするように修正。修正後: 同じワークロードが0.15秒で実行（約550倍の高速化）。失敗はユーザーにきれいに表面化する。Diaspora 16-paths実験での元の崖の症状（11分以上）は同じ根本原因 — 15個のgem_rbs_collectionパスとrigorのバンドル済みstdlibにわたる重複宣言。 |

### O1後の定量的影響

新しいRBSバンドルにオプトインした後（逐次ウォームキャッシュ。RBSバンドルのv2で、v1の上に`compact_blank`／`exclude?`／`index_with`／`index_by`／`Hash.from_xml`／`DateTime#utc`と`Enumerable`ミックスインを追加したもの）。

| プロジェクト | ベースライン | O1 v2を入れた状態 | Δ合計 | `call.undefined-method`前 → 後 |
| --- | ---: | ---: | ---: | --- |
| Redmine | 389 | 157 | **−232（−60%）** | 243 → 60（−75%） |
| Discourse | 1,439 | 423 | **−1,016（−71%）** | 1,078 → 134（−88%） |
| Mastodon | 521 | 124 | **−397（−76%）** | 414 → 27（−93%） |
| GitLab FOSS | 2,982 | 489 | **−2,493（−84%）** | 2,676 → 207（−92%） |
| Forem | 691 | 146 | **−545（−79%）** | 590 → 55 |
| Solidus | 528 | 42 | **−486（−92%）** | 520 → 33 |
| Chatwoot | 300 | 19 | **−281（−94%）** | 282 → 6 |
| Canvas LMS | 3,296 | 1,496 | **−1,800（−55%）** | 2,493 → 766 |
| OpenProject | 2,356 | 175 | **−2,181（−93%）** | 2,293 → 138 |
| **合計** | **12,502** | **3,071** | **−9,431（−75%）** | **10,589 → 1,426（−87%）** |

残っている`call.undefined-method`のインスタンスはほとんどが次のいずれかです。

- **Canvas LMSが残存を支配する** — 3,071件のうち1,496件（49%）。トップセレクタ: `[]= on Integer`（70）、`[]= on nil`（51）、`<< on nil`（40） — RBS不足というより狭化の限界 — そしてCanvas固有の拡張（`#decimal_megabytes`はNumericに対するプロジェクト固有のリファインメント、`File.mime_type`はstdlibに無いMarcel／Mimemagic型のヘルパー）。
- **プロジェクト固有のモンキーパッチ**。Discourse、Forem、Canvas、GitLabはそれぞれ独自の`String`／`Array`／`Hash`拡張を同梱しています。これを閉じるにはO4（プロジェクト側モンキーパッチ事前評価のconfigノブ）が必要です。
- **解析器のRBS envに無いgem固有のメソッド**。対象プロジェクトの`Gemfile.lock` gemはrigorのプロセス外Bundlerコンテキストでロードされません。RBS出荷済みのgemはO4（対象Bundler認識）から恩恵を受けるでしょう。
- **集中したnilレシーバーパターン**。ブロック内での多重代入の後、同じブロック内でガードしてから使う形。まだフロー追跡されていません。
- **バンドルの約50セレクタの範囲外のその他のRailsコア拡張メソッド**。RBSバンドルを拡張するPRは歓迎です。
