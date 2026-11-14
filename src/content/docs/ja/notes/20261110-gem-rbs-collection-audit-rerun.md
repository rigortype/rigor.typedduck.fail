---
title: "gem_rbs_collection監査のmaster再実行 — 0.4.7からの変化"
description: "rigortype/rigor docs/notes/20261110-gem-rbs-collection-audit-rerun.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20261110-gem-rbs-collection-audit-rerun.md"
sourcePath: "docs/notes/20261110-gem-rbs-collection-audit-rerun.md"
sourceSha: "29bee6d283fb5a6c84cd207591bfed8ce4baad0cb740251ccce73517b247bee4"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-10T20:40:39+09:00"
translationStatus: "translated"
sidebar:
  order: 20267110
---

ステータス: フィールドレポート、設計上の確約なし。4日後にRigorのmasterで[2026-11-06監査](../20261106-gem-rbs-collection-audit/)を再実行し、残っているすべての`rigor check`エラーを分類する。また、`sig-gen`の`tighter_return`提案のサンプルをgemのソースと照合して手作業で確認する。問いは、masterで何が修正され、コレクションのシグネチャ作者にとってどのRigor側のギャップが依然として最も大きなコストになっているかである。

## 手法とベースラインとの違い

| | ベースライン（2026-11-06） | 今回の実行（2026-11-10） |
| --- | --- | --- |
| Rigor | 0.4.7 gem、miseインストール | master `374dcf6ae916730124874afb91d5dffae29e00ad`（`VERSION`は依然0.4.7のまま） |
| エンジンRuby | mise 4.0.6 | Flake 4.0.5、チェックアウトの`vendor/bundle`に対する`bundle exec` |
| コレクションのチェックアウト | 当日12:49以前の`main`、おそらく`a2080c5` | `8b20c86`（faradayの`?match_data:`修正を含む）＋ローカルのmarcel編集 |
| `rigor check`キャッシュ | デフォルト（コールドな初回実行） | すべての`check`で`--no-cache` |
| オラクルgem | mise 4.0.6配下の`ruby -e Gem::Specification.find_by_name` | 同じ4.0.6バイナリとデフォルトのgemパス（下記参照） |
| 出力 | `tmp/rigor_audit.jsonl` | `tmp/rigor_audit_374dcf6ae.jsonl`、加えて各checkおよびsig-genの標準出力を個別に保存 |

ハーネスは変更していない（`bin/rigor_audit_all`を引数付きで再開）。バッチ全体は1つの`nix develop`シェル内で実行し、以下の3つのshimを`PATH`の先頭に置いた。

- `rigor`は`BUNDLE_GEMFILE=<rigor>/Gemfile BUNDLE_PATH=<rigor>/vendor/bundle bundle exec ruby <rigor>/exe/rigor "$@" </dev/null`を実行する。Flakeの`PATH`と`GEM_PATH`を復元し、`check`の後に`--no-cache`を挿入する。標準出力はcwdをキーとしてgemごとに1ファイルへ`tee`する。バージョン定数が更新されていないため、`--version`ではmasterと0.4.7を区別できない。shimが代わりにmasterを実行している証拠として、`$LOADED_FEATURES`がチェックアウトの`lib/`配下の`rigor/cli.rb`を解決しており、後述のmaster限定の修正（とりわけ#2884）が存在する。
- `ruby`は`GEM_PATH`、`GEM_HOME`、`RUBYLIB`を未設定にしたうえで`/Users/megurine/.local/share/mise/installs/ruby/4.0.6/bin/ruby`を直接呼び出す。`mise`コマンドは実行していない。

このセットアップ中に2つの落とし穴が見つかった。

1. **Flakeの`ruby`は`GEM_PATH`を`--set`するラッパーである**ため、`GEM_PATH`をエクスポートしても探索に届かない。
2. **ラップ解除したFlakeのRubyは、mise 4.0.6向けにビルドされたネイティブ拡張gemを認識できない**。「extensions not built」として黙って除外してしまう。そのため最初のパスでは、bcrypt、bigdecimal 3.1および4.0、cgi、llhttp、msgpack、nkf、oga、racc、stackprofに対して`gem not installed`が報告された。これら10行を削除し、4.0.6バイナリを使って再開パスで再実行した。全196ディレクトリに対するリゾルバの差分により、ベースラインと同等の探索がすべてのgemで一致することを確認した。

バッチ全体は約20分で完了し、ハングしたものはなかった。ベースラインで`parse error`だった`faker/2.23`と`nokogiri/1.11`のsig-gen行は、今回はどちらもパースに成功した。原因は特定できておらず、後述の同一条件比較のsig-gen合計からはこれら2つのgemを除外している。

ベースライン以降、エンジン側の変更とは無関係に数値を動かすコレクション側の変更が2つある。

- `8b20c86`により`Faraday::Adapter::Test`の`match_data`がオプショナルになり、faraday/2.5の`call.argument-type-mismatch`が解消した。
- `bin/test`がfaraday 2.5と2.7、retryable 3.0、marcel 1.0に`_test/.gem_rbs_collection/`インストールディレクトリを残していた。`signature_paths: [".."]`が`_test/`も読み込むため、faradayのものが`rbs.coverage.definition-build-failed`（`DuplicatedMethodDefinitionError`）警告を出すようになった。

## `rigor check`の結果

| | ベースライン | master | 差分 |
| --- | ---: | ---: | ---: |
| クリーンなディレクトリ | 130/196 | 130/196 | 0 |
| エラー | 19 gemで42件 | 17 gemで28件 | −14 |
| 警告 | 198 | 200 | +2 |
| info | 6 | 6 | 0 |

クリーンなディレクトリ数は変わらないが、内訳は変化した。email_address/0.2がクリーンになり、faraday/2.7に警告が1件増えた。gemごとの変化は以下の通り。

| gem | ベースライン | master | 原因 |
| --- | --- | --- | --- |
| email_address/0.2 | エラー14件 | クリーン | #2884が修正（`def self.new: -> Address`を尊重）。ポジティブコントロール`EmailAddress.new(…).nope`は`EmailAddress::Address`上で報告する |
| faraday/2.5 | エラー1件 | 警告1件 | コレクション`8b20c86`がRBSを修正。警告は残留した`.gem_rbs_collection/`ディレクトリによるもの |
| faraday/2.7 | クリーン | 警告1件 | 残留した`.gem_rbs_collection/`ディレクトリ |
| concurrent-ruby/1.1 | エラー4件 | エラー5件 | masterが`then`のブロック引数を`Future[T]`から型付けするようになり、誤ったオーバーロード選択（下記）が`promises.rb:18`でもう1件表面化した。同一ツリーでの0.4.7再実行により、13/68/82/84がベースラインの4件であったことを確認 |

masterでのエラールール: `call.undefined-method` 21件、`call.argument-type-mismatch` 4件、`call.possible-nil-receiver` 2件、`flow.always-raises` 1件。警告の内訳は変わらず、`call.unresolved-toplevel` 147件と`rbs.coverage.definition-build-failed` 46件である。この46件のうち37件は、ハーネスが`signature_paths`に含めていない依存gemのRBSに対する`NoMixinFoundError` / `NoSuperclassFoundError`である。

### masterの全エラーの分類

ベースラインの3つの分類でカバーされるのは28件中19件のみである。残りの9件は第4の種類、すなわちハーネスに依存関係のRBSが欠落していることによるものであり、Rigorの誤検出でもRBSのバグでもない。ベースラインのノートでも単一エラーのgemが未分類のまま残されていたが、同じ9件である。

**Rigorの誤検出: 11件**。以下の各再現例はmasterの`check --no-cache`で実行し、発火するコントロールも確認済みである。

| 箇所 | メカニズム | 最小再現例 | Issue |
| --- | --- | --- | --- |
| concurrent-ruby `promises.rb:13`, `:18`, `:68` | オーバーロード選択が、シグネチャのみのクラスを無関係なシグネチャのみのクラスに対する`maybe`一致として受け入れるため、最初のオーバーロードが選ばれる。`Future`引数に対して`any_fulfilled_future(*Event) -> Future[nil, bot]`が選ばれ、`Future`に対して`Event#&`/`zip(Event) -> Event`が選ばれた結果、`Kernel#then`に到達して`bool`と読まれる。 | `class Ev; def zip: (Ev) -> Ev \| (Fut) -> Fut; end; class Fut; def value: () -> Integer; end`とし、`Ev.new.zip(Fut.new).value`で`Ev`に`value`が未定義と報告される。同じ形を`String \| Integer`にすると正しく選択される。 | タイトルはsingletonのみとなっているが、#2844の原因セクションでカバーされている（`Singleton`だけでなく`Nominal`も対象） |
| concurrent-ruby `promises.rb:82`, `:84` | オーバーロード選択でメソッド型パラメータの上限境界が無視される。`make_future: … \| [X < AbstractEventFuture] (X) -> X \| …`が`X = RuntimeError`または`X = String`を束縛する。コアの境界クラスであっても上限境界は無視される。 | `def make: [X < Numeric] (X) -> X \| [T] (T) -> Array[T]`とし、`make("s")`の型が`String`になる | 未起票 |
| faker `test.rb:49` | RBSの`A & B`が最初の情報を持つメンバーとして解釈される（#529）。`Faker::Base.unique: () -> (UniqueGenerator & class)`において`class`がuntypedに変換されるため、レシーバーが`UniqueGenerator`になり、`first_name`が未定義と読まれる。 | `Base`に`def self.unique: () -> (Gen & class)`、`Name < Base`に`def self.first_name`を置き、`Name.unique.first_name`で報告される | #3032 |
| stripe `stripe.rb:9` | インターフェースでも同じメカニズムが起きる。`Customer#address: () -> (StripeObject & _Address)?`が`_Address`を落とすため、`city`が未定義と読まれる | `def address!: () -> (Obj & _Addr)`とし、`.city`が`Obj`上で報告される | 未起票、fakerと同一Issue |
| csv `test.rb:19`, `:27` | コレクションの`csv/3.3/csv.rbs`がバンドルされたstdlib CSVの重複として丸ごと隔離される。rbs 4.2のstdlib CSV RBSには`CSV.open`が宣言されていないため、`CSV.open("f")`が`IO?`と型付けされ（`type-of`は`IO?`を示す。おそらくprivateな`Kernel#open`）、`possible-nil-receiver`になる。 | `libraries: [csv]`で`require "csv"; b = CSV.open("example.csv"); b.read` | 未起票。ベースラインのabbrev衝突と同系列。cgi、bigdecimal、yardも同様に隔離される |
| sentry-ruby `test.rb:14` | `begin … rescue ZeroDivisionError`内の`1 / 0`に対するエラー重大度の`flow.always-raises` | 3行の`begin/rescue` | #2116に関連（`begin…rescue`内のraiseはハンドラへフローすべきとしているが、診断自体は未起票） |
| rack `body_proxy.rb:8` | Steepの`# @type var app: Rack::_Application`と`app = _ = nil`が尊重されず、`app`が`nil`になる | — | 仕様通り: `docs/handbook/appendix-steep.md`によりコアにはソース内アノテーションを設けない |

**実際のRBSバグ、Rigorは正当: 4件**。4件すべてがretryable/3.0の`test.rb:41,59,91,92`である。原因は`gems/retryable/3.0/retryable.rbs:74`で、`type options`が10個のキーすべてを必須として宣言しているためである。修正はruby/gem_rbs_collection#1126にあるが、このチェックアウトには含まれていない。

**意図的: 4件**。protobuf/3.10.3の`enum.rb:9,10`および`messages.rb:18,19`: `___error___`マーカー。

**依存RBSの欠落（ハーネス）: 9件**。gemspecの依存関係が`signature_paths`に含まれていないため、ActiveSupportのコア拡張が存在しない。

- actionmailer/8.1 `railsguides.rb:69`およびactiverecord/8.1 `:187`の`1.hour`
- activestorage/8.1 `:33`およびdelayed_job/4.1 `:14`の`5.minutes`
- activejob/8.1 `:48`の`1.minute`
- json-jwt/1.16 `:23`の`1.week`
- carrierwave/3.0 `:30`の`blank?`
- cancancan/3.5 `:16`の`present?`
- active_model_serializers/0.10 `:47`の`as_json`

## `sig-gen --diff`の結果

191ディレクトリがsig-gen JSONを生成した（ベースラインは189）。依然として`gem not installed`を報告している5ディレクトリは、ベースラインと同じ5つである。

| 分類 | ベースライン（189） | master、同じ189 | 差分 | master、全191 |
| --- | ---: | ---: | ---: | ---: |
| `new_method` | 27,316 | 27,253 | −63 | 27,570 |
| `tighter_return` | 2,736 | 2,722 | −14 | 2,862 |
| `skipped` | 97,211 | 97,318 | +107 | 98,613 |

全体の増減は小さく、`new_method`/`tighter_return`から`skipped`への移動である。3つのgemに対する0.4.7との候補レベルの差分から、その要因を特定できる。

- activesupport/8.1では、別の場所で書き込まれるivarを読む`tighter_return`が9件減った。例として`BroadcastLogger#debug?` → `bool`や`MockLogger#flush` → `Integer`があり、どちらも現在は`untyped-return`スキップになっている。これは0.4.7以降のファイル横断ivar合流およびセンサスのコミット（`61ed87d87`、`c8a50708f`）と一致する。誤答ではなく精度の低下である。
- activesupport/7.0では、`ExecutionWrapper.to_run`などの`define_callbacks`ラッパーで`-> Array[untyped]`の提案が6件増えた。
- activerecord/8.1では、`Preloader::Association#records_by_owner`が`overridden-by-unsigned-subclass`へ移動しており、これは正しい。
- faraday/2.5と2.7ではそれぞれ1件ずつ提案が増えた。これは誤りである（後述のサンプル参照）。

`tighter_return`の多いgem上位:

| gem | 件数 |
| --- | ---: |
| activerecord/8.1 | 371 |
| activesupport/8.1 | 294 |
| activerecord/7.2 | 265 |
| activerecord/8.0 | 263 |
| activesupport/7.0 | 256 |
| actionpack/8.1 | 154 |
| actionpack/7.2 | 152 |
| nokogiri/1.11 | 140（新規。ベースラインではパースエラー） |
| yard/0.9 | 128 |
| mail/2.8 | 107 |

2,862件の提案のうち2,841件は宣言済みの`untyped`を狭めるものである。112件が`bot`を、45件が`top`を提案している。

理由別の`skipped`と、それぞれの最多gem:

| 理由 | 件数 | 上位gem |
| --- | ---: | --- |
| `sig.skipped.untyped-return` | 94,882 | stripe/20.0 39,578; parser/3.2 6,533; google-cloud-ai_platform-v1 3,230; activerecord/8.1 2,877 |
| `sig.skipped.unresolvable-superclass` | 3,231 | concurrent-ruby/1.1 437; rubyXL 180; oga 178; graphql 166 |
| `sig.skipped.overridden-by-unsigned-subclass` | 465 | activerecord 7.2/8.0各61, 8.1 52; graphql 29 |
| `sig.skipped.unrenderable-rbs` | 20 | yard 5 |
| `sig.skipped.top-level-def` | 15 | yard 10 |

## gemソースと照合した`tighter_return`提案のサンプル

インストール済みgemの`lib/`と照合して28件の提案を確認した。内訳は、最もリスクの高い層（非`untyped`宣言を狭める全21件）、他のgemからの無作為抽出、および`bot`提案のスポットチェックである。

**誤り。これらはシグネチャ作者を誤導する**。

| gem | 提案 | 誤りである理由 | 再現例 / Issue |
| --- | --- | --- | --- |
| mail/2.8 | `Mail::Utilities#uri_parser -> URI::RFC2396_Parser` | `else URI`の分岐を落としている | #2950、依然オープン |
| faraday/2.5, 2.7 | `Stub#matches? -> [bool, {}]`、宣言は`[bool, { ?match_data: MatchData? }]` | `meta = {}`は呼び出し先の`path_match?(path, meta)`によって書き込まれる。空レコードリテラルが引数経由の書き込みを無視している | `meta = {}; [fill(meta), meta]`で`fill`が`meta[:k]`に書き込む。未起票 |
| railties/8.1 | `Rails::Railtie::Configuration#watchable_files -> []` | `@@watchable_files \|\|= []`はアプリが`concat`で追加するミュータブルなレジストリであり、空タプルが正しいシグネチャになることはない | `def files = (@@files \|\|= [])`が`[]`を提案する。未起票（クローズ済みの#2293の兄弟） |
| tzinfo/2.0 | `DataSource#get_country_info -> bot`、宣言は`CountryInfo` | テンプレートメソッド: protectedフック`load_country_info`を呼び出しており、基底クラスはそこでraiseし、`RubyDataSource`/`ZoneinfoDataSource`がオーバーライドする | `Src#get_info`が別ファイルの`Src::Impl`でオーバーライドされるprotectedフックを呼ぶと`bot`を提案する。未起票 |
| tzinfo/2.0 | `Timezone.all_data_zone_identifiers -> bot`、宣言は`Array[String]` | 同様: 抽象基底クラスの`data_timezone_identifiers`へディスパッチしている | 未起票、同一Issue |
| rest-client/2.1 | `AbstractResponse#inspect -> bot`、宣言は`String` | 抽象の`raise NotImplementedError`であり、`Response`と`RawResponse`がオーバーライドする。サブクラスにシグネチャが付いているため`overridden-by-unsigned-subclass`ガードが発火しない | 未起票 |
| rails-html-sanitizer/1.6 | `Sanitizer#sanitize -> bot`、宣言は`String` | 同様: シグネチャ付きサブクラスが実装する抽象基底クラス | 未起票、同一Issue |
| lint_roller/1.1 | `Plugin#about -> bot`, `#rules -> bot` | 解析対象の`lib`外部にあるプラグインgemが実装する抽象基底クラス | 未起票、同一Issue |
| activerecord/8.1 | `SchemaStatements#indexes`, `#rename_table`, `#change_column`, … `-> bot`（8.1で21件） | すべてのアダプタがオーバーライドするモジュールレベルの抽象メソッド。サブクラスガードがモジュールをincludeする側を見ていない | 未起票、同一Issue |
| stackprof/0.2 | `StackProf.run -> bot`, `.results -> bot`、宣言は`Hash[Symbol, untyped]` | `RUBY_ENGINE == "truffleruby"`のときだけ読み込まれる`stackprof/truffleruby.rb`から取得されている。MRIではC拡張がこれらを定義する | 未起票 |
| sidekiq/7.0 | `Job::ClassMethods#perform_in -> String`、宣言は`top` | ミドルウェアがジョブを停止させると`Client#push`は`nil`を返す。RigorはコレクションのRBSに忠実であり、本当のバグはコレクション側にある: `gems/sidekiq/7.0/client.rbs:27`の`push -> String`（および`transaction_aware_client.rbs:3`、`job.rbs:12`）は`String?`であるべき | コレクションRBSのバグ |

**正当**。

- sidekiq `Capsule#mode -> :random | :strict | :weighted`
- activesupport `DateTime#utc -> Time`
- activesupport `CallbackChain#prepend -> Array`
- activesupport `EventReporter#subscribe -> Array`
- launchdarkly `BigSegmentStoreManager#poll_store_and_update_status -> BigSegmentStoreStatus`
- launchdarkly `DynamoDB.new_feature_store -> CachingStoreWrapper`
- actionpack `ParameterMissing#corrections -> Array[String]`
- actionpack `Request::Session.disabled -> Session`
- activemodel `Type::Date#type_cast_for_schema -> String`
- sinatra `Base#halt -> bot`（`throw`由来）
- mini_magick `MogrifyRestricted#format -> bot`（意図的な`NoMethodError`）
- redis `Future#class -> singleton(Redis::Future)`
- async `Clock.now -> Float`
- activerecord `Association#reload -> Association | nil`
- parser `Diagnostic#render -> [String×5] | [String×3]`（正確だが過剰に精密であり、作者なら`Array[String]`と書く）

**ノイズ（誤りではない）**。yard `CLI::Help#run`やactivemodel `LazyAttributeHash#marshal_load`など、いくつか`top`へ狭める提案がある。形式的には`untyped`より狭いが、誰もこのようには書かない。サンプルでは45件見つかった。

`bot`のストリーム全体を通読すると、112件の`bot`提案のうち52件が`NotImplementedError` / "must implement"の本体を持っている。`InlineAdapter#enqueue_at`のように最終的な振る舞いとして正しいものもあるが、確認したオーバーライドされる抽象メソッドはすべて誤りだったため、`bot`を適用する前にはレビューゲートが必要である。ベースラインのノートでも同じ助言をしていたが、今回その背後にあるメカニズムが明らかになった。

## コレクションのシグネチャ作者にとってのコスト順Rigor側ギャップ

1. **オーバーライドされる抽象メソッドやテンプレートメソッドに対する`bot`提案**。現在のガードは、シグネチャ付きサブクラス（rest-client、rails-html-sanitizer）、モジュールをincludeする側（activerecord `SchemaStatements`）、オーバーライドされたフックへの間接ディスパッチ（tzinfo）の3ケースを見逃している。`lib`外部での実装（lint_roller）が4つ目である。結果として、すべてのオーバーライドとのリスコフ置換性を壊す誤ったシグネチャになる。未起票。
2. **コレクションディレクトリで依存RBSが解決されない**。これにより28件中9件のエラーと、クラスツリー全体を`Dynamic`にして真陽性とsig-genの証拠の両方を隠してしまう37件の`NoMixin`/`NoSuperclass`ビルド失敗が発生している。コレクション形式のレイアウト向けに`manifest.yaml`やgemspecの依存関係を`signature_paths`へ展開する方法は未起票である。#2946（クローズ済み）はstdlibロックエントリーのみを扱っていた。
3. **オーバーロード選択が無関係なシグネチャのみのクラスに対して`maybe`を採用する**（#2844）。コレクションではすべてのクラスがシグネチャのみであるため、ここで見られた3件のエラーにとどまらず、オーバーロードされたすべてのAPIに影響する。#2844のタイトルを`singleton(A)`から公称受け入れへ広げるべきである。
4. **提案内のリテラルキャリアが後続の書き込みを無視する**。呼び出し先が埋めるハッシュリテラル（faraday）とクラス変数のメモ化`||= []`（railties）のどちらも空リテラルとして提案される。未起票。関連: #2293（クローズ済み）、#2425、#2179。
5. **RBSの交差型が最初のメンバーとして読まれる**（#529の設計）。`A & _Iface`や`A & class`で、落とされたメンバーの未定義メソッドが報告される（faker、stripe）。未起票。
6. **オーバーロード選択でメソッド型パラメータの上限境界が無視される**（`[X < AbstractEventFuture]`）。未起票。
7. **#2950**（mail `uri_parser`、union分岐の欠落）が依然オープンである。
8. **defaultまたはbundled gem向けのコレクションRBSが、バンドルされたstdlibコピーに対して丸ごと隔離される**。影響: csv、cgi、bigdecimal、yard（隔離）およびabbrev、base64（重複メソッド）。フォールバックはどちらのコピーよりも悪く、`CSV.open`が`IO?`と読まれる。未起票。ベースラインのノートではabbrevのケースを挙げていた。
9. **sig-genがプラットフォームガード付きファイル**（`require "x/truffleruby" if RUBY_ENGINE == …`）を通常の定義として読み込む。未起票。
10. **そのクラスを正確に捕捉する`rescue`を持つ`begin`内で`flow.always-raises`が発火する**。 #2116に関連。

本ノートの執筆後、2026-11-10に起票されたもの:

| ギャップ | Issue |
| --- | --- |
| 1. オーバーライドされる抽象メソッド・テンプレートメソッドへの`bot` | #3029 |
| 2. コレクションディレクトリの依存RBS | #3030 |
| 3. シグネチャのみのクラスに対するオーバーロードの`maybe` | #2844（タイトル拡張） |
| 4. 後続コードが埋める空リテラルキャリア | #3031 |
| 5. 交差型が最初のメンバーとして読まれる問題 | #3032 |
| 6. オーバーロード選択における型パラメータの上限境界 | #3033 |
| 7. mail `uri_parser` | #2950 |
| 8. stdlibに対して隔離されるdefault-gemのコレクションRBS | #3034 |
| 9. sig-genが読み込むプラットフォームガード付きファイル | #3035 |
| 10. 捕捉される`rescue`内の`flow.always-raises` | #3036 |

コレクション側のsidekiq `Client#push -> String`のバグ（`gems/sidekiq/7.0/client.rbs:27`）は上流への提出候補であり、RigorのIssueではない。

Steepのソース内アノテーション（`@type var`、`_ = x`）はこの一覧に含めていない。ここでは1件のエラーの原因になっているが、コアに含めないことは文書化された決定である。

## 制約と計測環境

- ベースラインのJSONLは件数のみを保存している。そのため、候補レベルの帰属分析は0.4.7で再実行した3つのgem（`activesupport` 8.1および7.0、`activerecord/8.1`）に対してのみ存在する。
- shimとgemごとの生出力はセッションの一時領域に置いていたため保存していない。上記のshimレシピで再構築できる。JSONLはgem_rbs_collectionチェックアウトの`tmp/rigor_audit_374dcf6ae.jsonl`にある。
- 残留した`_test/.gem_rbs_collection/`ディレクトリは、次回の実行前に削除するか`signature_paths`から除外すべきである。

## ロックファイル経路の再実行（#3043以降）

同じ監査を2026-11-10の夜にmaster `adaf5c7cc`（#3030をクローズした#3043のマージ時点）で再実行した。コレクションのチェックアウトは変わらず、`8b20c86`にローカルのmarcel編集を加えたものである。`374dcf6ae`以降、masterには#3037（#3029、抽象`bot`）、#3039（#3036、捕捉される`rescue`内の`flow.always-raises`）、#3042（#3035、プラットフォームガード付きファイル）もマージされている。

### 手法

- **ディレクトリごとのセットアップ**。196の`_test/`ディレクトリそれぞれに対し、絶対パスで指定したmise Ruby 4.0.6バイナリとクリーンな環境を使い、steepなしで`bin/test`のセットアップを実行した。手順は、`~> <version>.0`のgemと`_test/metadata.yaml`の`additional_gems`を記載した`Gemfile`の作成、`bundle lock --local`、チェックアウトの`gems/`を`local`ソースとした`rbs_collection.yaml`の作成、`rbs collection install`である。セットアップは`bin/test`と同様に`Gemfile`と`Gemfile.lock`を`.back`にリネームする。いずれかのステップが失敗した場合はそのディレクトリのファイルを削除し、ロックファイルがない状態にして`signature_paths: [".."]`へフォールバックさせる。以前の`bin/test`実行の残骸があった6ディレクトリ（actionmailer/8.1、cancancan/3.5、faraday 2.5および2.7、marcel/1.0、retryable/3.0）は最初に退避した。その後faraday 2.5と2.7はセットアップに失敗したため、残留していた`.gem_rbs_collection/`ディレクトリは再生成されずに消滅した。セットアップは6並列で実行し、全196ディレクトリで21秒かかった。
- **実行**。変更なしのハーネス（現在は経路に応じた`.rigor.yml`を書き出し、`route`を記録する`bin/rigor_audit_all`）を使用した。1つの`nix develop`シェルで上記「手法」のshimを使って実行した（チェックアウトに対する`bundle exec`、およびすべての`check`に`--no-cache`と`</dev/null`）。所要時間は1,180秒（19.7分）であった。出力はコレクションのチェックアウト内の`tmp/rigor_audit_adaf5c7cc_lock.jsonl`である。以前のJSONLファイルも保持している。
- **経路**。131ディレクトリがロックファイルを使用し、65ディレクトリが`setup_failed`でフォールバックした。失敗はすべて`bundle lock --local`によるもので、`rbs collection install`は一度も失敗しなかった。内訳は以下の通り。

| 理由 | ディレクトリ数 | 例 |
| --- | ---: | --- |
| 依存関係がローカルにインストールされていない、またはより新しいバージョンのみ存在する（Rails 6.0/7.0/7.1/8.0系、`mime-types-data`、`retriable`、`sorbet-runtime`、`rack ~> 2.0`など） | 58 | carrierwave/3.0 (`ssrf_filter`), json-jwt/1.16, active_model_serializers/0.10, activerecord/8.0 (`activesupport 8.0.5.2`), faraday 2.5/2.7, sentry-ruby/5.2, protobuf/3.10.3 |
| gem自体が`~> <version>.0`でインストールされていない | 5 | delayed_job/4.1, llhttp-ffi/0.5, mysql2/0.5, rack/2.2, ruby-odbc/0.999992（以前と同様sig-genでも`gem not installed`） |
| `additional_gems`のエントリーがインストールされていない | 2 | sinatra/4.0 (`sinatra-contrib`), activeadmin/3.3 (`devise` → `warden`) |

各フォールバックディレクトリでは、新しい`rbs.coverage.collection-not-installed` info（65件）も報告されるようになった。

sig-genの実行が1件クラッシュした: rubyXL/3.4（ロックファイル経路）がFlake Ruby 4.0.5の`lib/rigor/inference/alias_mutation_floor.rb:258`でRuby VMの`[BUG] Segmentation fault`に遭遇した。同じセットアップでの2回の再実行は成功した（`skipped` 381、`new_method` 54）。一過性のものとみなしている。JSONL行は依然として`parse error`となっており、以下のsig-gen合計では双方からrubyXLを除外している。

### `rigor check`、ロックファイル経路ディレクトリ（131件）と`374dcf6ae`における同一ディレクトリの比較

| | 374dcf6ae（`signature_paths: [".."]`） | adaf5c7cc（ロックファイル） | 差分 |
| --- | ---: | ---: | ---: |
| クリーンなディレクトリ | 87 | 117 | +30 |
| エラー | 10 gemで18件 | 6 gemで16件 | −2 |
| 警告 | 155 | 116 | −39 |
| info | 5 | 0 | −5 |

| ルール | 変更前 | 変更後 |
| --- | ---: | ---: |
| `call.unresolved-toplevel`（警告） | 116 | 113 |
| `rbs.coverage.definition-build-failed`（警告） | 32 | 0 |
| `rbs.coverage.quarantined-signature`（警告） | 5 | 0 |
| `rbs.coverage.synthesized-namespace`（info） | 5 | 0 |
| `call.undefined-method` | 12 | 10 |
| `call.argument-type-mismatch` | 4 | 4 |
| `call.possible-nil-receiver` | 2 | 2 |
| `flow.always-truthy-condition`（警告） | 2 | 2 |
| `def.override-return-widened`（警告） | 0 | 1 |

フォールバックディレクトリ（65件）: エラーは10件から9件に減った。sentry-rubyの`flow.always-raises`が解消した（#3036、#3039で修正）。警告は45件から44件になった。新しいinfoを除くと、クリーンなディレクトリは43件から45件になった。全196ディレクトリ全体では、新しいinfoを無視するとクリーンなディレクトリが130件から162件に増え、エラーは28件から25件に減った。

**ハーネスのギャップは埋まったか？** はい、ロックファイル経路が動作したすべての場所で埋まった。

- 依存関係欠落エラー: ロックファイルディレクトリ内の5件は解消した（actionmailer、activejob、activerecord、activestorage 8.1、およびcancancan 3.5）。残る4件（active_model_serializers、carrierwave、delayed_job、json-jwt）は、それらのディレクトリがオフラインでセットアップに失敗したためだけに残っている。
- ビルド失敗: ロックファイルディレクトリ内の`rbs.coverage.definition-build-failed`はすべて解消した（32 → 0）。バッチ全体に残る13件はすべてフォールバックディレクトリにあり、すべて依存関係に対する`NoMixinFoundError`または`NoSuperclassFoundError`である。これにより37件の`NoMixin`/`NoSuperclass`失敗のうち25件が解消し、残る12件はセットアップに失敗したディレクトリにある。sinatra/4.0が13件目で新規である（下記参照）。
- 5件の`quarantined-signature`警告（csv、cgi、bigdecimal 3.1および4.0、yard）とabbrev、base64の重複メソッド警告も解消した。これはロックファイル経路のstdlib名スキップによるものである。ただし#3034を修正するものではなく、csvは依然として同じ形でエラーになる（下記参照）。

#### 残存する全エラーの分類

ロックファイル経路、16件のエラー:

| 箇所 | 件数 | 分類 | Issue |
| --- | ---: | --- | --- |
| concurrent-ruby/1.1 `promises.rb:13`, `:18`, `:68` | 3 | Rigorの誤検出: シグネチャのみのクラスに対するオーバーロードの`maybe` | #2844 |
| concurrent-ruby/1.1 `promises.rb:82`, `:84` | 2 | Rigorの誤検出: 型パラメータの上限境界が無視される | #3033 |
| faker/2.23 `test.rb:49` | 1 | Rigorの誤検出: `A & class`が`A`として読まれる | #3032 |
| stripe/13.0 `stripe.rb:9` | 1 | Rigorの誤検出: `A & _Iface`が`A`として読まれる | #3032 |
| csv/3.3 `test.rb:19`, `:27` | 2 | Rigorの誤検出: `CSV.open`が`IO?`と読まれる | #3034 |
| retryable/3.0 `test.rb:41,59,91,92` | 4 | 実際のRBSバグ（`type options`、全キー必須） | ruby/gem_rbs_collection#1126 |
| marcel/1.0 `test.rb:33`, `:34`, `:35` | 3 | **新規**: 正当。未コミットのローカル編集におけるRBSギャップ | — |

フォールバック経路、9件のエラー:

| 箇所 | 件数 | 分類 | Issue |
| --- | ---: | --- | --- |
| protobuf/3.10.3 `enum.rb:9,10`, `messages.rb:18,19` | 4 | 意図的な`___error___`マーカー | — |
| rack/2.2 `body_proxy.rb:8` | 1 | Steepの`@type var`アノテーション、仕様通り | — |
| active_model_serializers, carrierwave, delayed_job, json-jwt | 4 | 依存RBSの欠落。これらのディレクトリはオフラインでセットアップに失敗 | —（セットアップが完了すれば#3030の経路が機能する） |

**ロックファイル経路で新たに出たエラー**。3件あり、すべてmarcel/1.0上のもので、誤検出は1件もない。`Marcel::Magic.by_extension`、`.by_path`、`.all_by_magic`が`singleton(Marcel::Magic)`上で未定義として報告される。`gems/marcel/1.0/_test/test.rb`への未コミットのローカル編集がこれらを呼び出しているが、作業ツリーの`marcel.rbs`には`Magic.by_magic`しか宣言されていない。gem自体は3つすべてを定義しているため（`marcel-1.0.4/lib/marcel/magic.rb:73,80,93`）、RBSが不完全であり、Steepでも同じ呼び出しが報告されるはずである。`374dcf6ae`時点では、残留した`.gem_rbs_collection/`のコピーにより`Marcel::Magic`のビルドが失敗し（`DuplicatedMethodDefinitionError`）、クラスが`Dynamic`と読まれてこれらの呼び出しが隠されていた。

**新しい警告、Rigorの誤検出**。actioncable/8.1 `test.rb:32`が`def.override-return-widened`: "widened from nil to top (overrides ApplicationCable::Channel#subscribed)" を報告する。`ChatChannel#subscribed: () -> void`（`_test/test.rbs`）が、`ApplicationCable::Channel`の定義していないフックをオーバーライドしている。親のシグネチャは、今回ロックファイル経路が読み込むRBSのみの`ActionCable::Channel::Base#subscribed: () -> nil`（`actioncable-generated.rbs:189`）である。diagnostic-policy.mdおよびADR-35によれば、このルールはプロジェクト定義の祖先のみを対象とし、RBSのみの祖先は#130へ先送りされている。間にプロジェクトクラスが挟まることでRBSのみのシグネチャが通過し、そのプロジェクトクラスに帰属させられてしまっている。最小再現例（`signature_paths: [sig]`）:

```ruby
class Base;   def hook: () -> nil;  end   # RBS only, no Ruby source
class Mid < Base; end                       # also in app.rb, no hook
class Leaf < Mid;    def hook: () -> void; end   # fires: "overrides Mid#hook"
class Direct < Base; def hook: () -> void; end   # silent (control)
```

これは未起票であり、#130に関連する。これに伴い、完全なプロジェクト内のケース（`PLeaf < PMid`でも同様に発火する）について、`-> nil`を`-> void`でオーバーライドすることを拡張（widening）とみなすべきかという第2の問いもある。`void`は、誰も戻り値を読まないフックに対するRBSのイディオムである。

**sinatra/4.0はエンジン変更ではない**。どちらもフォールバック経路で、クリーンから`Rack::Utils`上の`NoMixinFoundError`へ変化した。今日のツリー上で`374dcf6ae`を実行しても同じ警告が出るため、原因はエンジンではなくツリー側にある。11-10の実行がなぜクリーンだったかは特定できていない。

### `sig-gen --diff`

| 分類 | 374dcf6ae、ロックファイル（130） | adaf5c7cc、同一 | 差分 | 374dcf6ae、フォールバック（60） | adaf5c7cc、同一 | 差分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `new_method` | 22,065 | 21,326 | −739 | 5,452 | 5,452 | 0 |
| `tighter_return` | 2,221 | 2,563 | +342 | 641 | 598 | −43 |
| `skipped` | 78,400 | 77,775 | −625 | 19,831 | 19,865 | +34 |

（130 = ロックファイル131ディレクトリからrubyXLを除いた数。60 = フォールバック65ディレクトリから`gem not installed`の5つを除いた数。）

ロックファイル経路での変動は、依存RBSが効き始めたことによるものである。スーパークラスが解決できるようになったクラスが評価され、`sig.skipped.unresolvable-superclass`はバッチ全体で3,231から2,113へ減少した。依存関係のRBSがすでに宣言しているメソッドは`new_method`として数えられなくなった。最大の変動は以下の通り。

| gem | `new_method` | `tighter_return` |
| --- | ---: | ---: |
| activerecord/8.1 | −261 | +46 |
| activerecord/7.2 | −170 | +55 |
| actionpack 7.2 / 8.1 | −32 / −57 | +50 / +48 |
| railties/8.1 | −48 | +48 |
| yard/0.9 | −78 | +27 |

rubocopとrubocop-astは`skipped`と`new_method`が入れ替わっている。11-10の誤った提案のうち、#3029が届かなかったものは残っている: mail `uri_parser`（#2950）、railties `watchable_files -> []`、およびfaraday `matches? -> [bool, {}]`（#3031）。

**#3037（#3029）以降、`bot`は全ディレクトリで112から37へ減少した**。新しいスキップ理由がその内訳を説明する: `sig.skipped.overridden-bot` 297、`abstract-method` 72、`template-method` 55。#3042は`platform-guarded`を11件追加した（parser 8、stackprof 3）。`sig.skipped.overridden-by-unsigned-subclass`は465から245へ減った。11-10のサンプルにあった誤った`bot`（tzinfo、rest-client、rails-html-sanitizer、lint_roller、activerecordの`SchemaStatements`メソッド群、stackprof）はすべてスキップされるようになった。残る37件のうち13件のソースを確認したところ、すべて意図的なraiseまたはexitであり正当だった: `assigns`、`assert_template`、`_routes`、`CollectionProxy#prepend`、`Header#decoded`、`Type::Value#as_json`、`MissingRoute#path`、`Attribute::Null#with_value_from_database`、`ReadOnlyNullEncryptor#encrypt`など。非`untyped`宣言を狭める提案は21件から13件に減り、`top`提案は45件から54件になった。

### 更新されたギャップランキング

1. **#3030は、セットアップが完了するすべてのディレクトリで修正された（#3043）**。残るコストは運用面である: オフラインでは196ディレクトリのうち65ディレクトリがロックできず、4件の依存関係欠落エラーと12件の`NoMixin`/`NoSuperclass`失敗が残る。Issueは不要。
2. **シグネチャのみのクラスに対するオーバーロードの`maybe`**、#2844、オープン。依然として3件のエラーを引き起こしており、オーバーロードされたすべてのコレクションAPIに影響する。
3. **後続コードが埋める空リテラルキャリア**、#3031、オープン。faradayとrailtiesの提案は残っている。
4. **交差型が最初のメンバーとして読まれる問題**、#3032、オープン（faker、stripe）。
5. **オーバーロード選択における型パラメータの上限境界**、#3033、オープン（concurrent-ruby、2件）。
6. **stdlibに対するdefault-gemのコレクションRBS**、#3034、オープン。ロックファイル経路では隔離警告が消えたが、`CSV.open`は依然として`IO?`と読まれる。
7. **mail `uri_parser`**、#2950、オープン。
8. **新規、#3046として起票: `def.override-return-widened`がメソッドを定義していないプロジェクトクラスを通じてRBSのみの祖先に到達し**、そのクラスを所有者として名指しする（actioncable）。#130に関連する。`nil`に対する`void`の問いとともに起票する。
9. **新規、#2850に記録: sig-genにおける間欠的なVMセグフォールト**（rubyXL/3.4、Flake Ruby 4.0.5、`alias_mutation_floor.rb:258`）。2回の再実行では再現しなかった。再発した場合にのみIssue化する価値がある。

11-10のランキングからクローズされたもの: #3029（ギャップ1、`bot`）、#3030（ギャップ2）、#3035（ギャップ9）、および#3036（ギャップ10）。

未起票、コレクション側: sidekiqの`Client#push -> String` RBSバグ（依然として`perform_in -> String`と提案される）と、ローカル編集が呼び出しているのに`marcel.rbs`から欠落しているmarcelの`Magic.by_extension`/`by_path`/`all_by_magic`。
