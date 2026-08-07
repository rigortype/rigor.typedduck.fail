---
title: "チェンジログ — 0.2.xアーカイブ"
description: "rigortype/rigor docs/CHANGELOG-0.2.x.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CHANGELOG-0.2.x.md"
sourcePath: "docs/CHANGELOG-0.2.x.md"
sourceSha: "e392aee10b3019b9c54337a9ed77a911271ff5743e303d6f18e027830ab1de07"
sourceCommit: "17f7d081a694f9cfdfaebd7fc71ebfc7171e2a6d"
translationStatus: "translated"
sidebar:
  order: 9050
---

`0.2.x`開発サイクルのアーカイブリリースノートです——最初に公表されたリリースである`v0.2.0`が開いた評価トライアルです。

フォーマットは[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)に従い、プロジェクトは[Semantic Versioning](https://semver.org/spec/v2.0.0.html)に準拠しています。

このファイルは`0.2.0`から`0.2.9`までの静的アーカイブであり、プロジェクトのアーカイブルールに従ってメインの[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)から移動されました: **マイナーバンプ後の最初のリリース（ここでは`0.2.x` → `0.3.x`バンプ後の最初のリリースである`0.3.1`）の時点で、以前のマイナーの範囲全体が`docs/CHANGELOG-<old-prefix>.md`アーカイブファイルに移動されます**。

現在のサイクルのリリースノートは[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)に存在します。次のマイナーバンプの最初のパッチ（`0.4.1`）が着地すると、`0.3.x`ブロックが同じルールに従って`docs/CHANGELOG-0.3.x.md`に移動します。

## [0.2.9] - 2026-07-11

v0.2.9は大規模なRailsアプリケーション上でRigorを鋭くするリリースで、GitLab規模のプロジェクトを実証の場としています: PostgreSQLの`db/structure.sql`がスキーマソースとして受け入れられ、ストロングパラメータのチェーンが型付けされたままになり、いくつかのルートヘルパーとActiveSupportのカバレッジのギャップが塞がれ、モジュールファサードがファイルをまたいで解決されるようになりました。保護カバレッジのツールはフォーク並列スキャンで高速になり、より対処可能になりました——RBSを欠くgemが穴の原因であるときにそれを名指しするようになったのです（[ADR-82](../docs/adr/82-dynamic-provenance-wiring/)）。その他の修正は、`present?` / `blank?`ガードや本体内ミューテーションまわりの制御フローのナローイングを強化し、永続キャッシュをアップグレードをまたいで堅牢にします。

### 追加

- **[rigor-activerecord]** PostgreSQLの`db/structure.sql`がスキーマソースとして受け入れられるようになったので、`schema_format = :sql`のプロジェクト（GitLab級のアプリ）がもはや不活性ではなくなりました。
  - `db/schema.rb`が存在しないとき、プラグインは`db/structure.sql`（`structure_sql_file`で設定可能）を、Ruby-DSLパーサが生成するのと同じスキーマテーブル——カラム名、型、Postgresの配列カラム——へパースします。以前はそのようなプロジェクトはスキーマをまったく読み込まなかったため、すべてのActiveRecordチェックがスキップされ、リレーションチェーンが偽の診断を連鎖させていました。マッピングできないカラム型（カスタムenum、`tsvector`）は、ドロップされるのではなく`Object`へ縮退します。
  - `serialize` / `mount_uploader` / カスタムの`attribute`カラムは、SQLスカラー型へナローイングされるのではなく寛容に読まれるので、`note.position.diff_refs`と`diff.external_diff.store!`はもはや`undefined-method`として読まれません。カラムの存在チェック（`where(col:)`）は影響を受けません。
- **[rigor-actionpack]**ストロングパラメータのフルーエントチェーンが型付けされたままになるので、`coverage --protection`がチェーンされたサイトを保護済みとしてカウントします。
  - `params.require(:user)` / `.permit(:name)`は以前、最初のホップで`Dynamic`を返しており（このクラスはバンドルされたRBSを一切出荷しません）、下流のすべてのサイトをリークさせていました。`Parameters`レシーバー上の`require` / `permit` / `permit!`は、同じ寛容な名前的型へ再型付けするようになり、チェーンをエンドツーエンドで具体的なレシーバーに保ちます。型付けするのはコンテナであって、呼び出し側の引数ではありません。
- **[engine]** `module`定数がファイルをまたいでそのモジュールオブジェクトへ解決されるようになったので、モジュールファサード上の呼び出し（`Feature.enabled?`、`Gitlab::Utils.to_boolean`）が動的ではなく型付けされます（[ADR-57](../docs/adr/57-self-call-return-adoption/) WD3）。
  - Rigorのファイル単位のパスは常に`module M`をモジュールオブジェクトとして型付けしていましたが、プロジェクト全体のディスカバリーシードはクラスのみを登録していたため、兄弟ファイルから読まれた同じ定数は`Dynamic`へフォールバックしていました。両者が一致するようになりました: 別のファイルで宣言された`def self.x` / `class << self` / `module_function`メソッドへの呼び出しは、ファイル内で既にそうしているように、呼び出し先の本体を再型付けします。GitLabでは、`Feature.enabled?`だけで以前は未保護だった695サイトに相当します。
- **[rigor coverage]** `coverage --protection`が、穴を「エンジンギャップ」に分類する代わりに、外部gemの欠落したRBSがどの穴を引き起こしているかを教えてくれるようになりました（[ADR-82](../docs/adr/82-dynamic-provenance-wiring/) WD9）。
  - 解決できない定数（`Faraday`、`I18n`）が、`Gemfile.lock`にロックされていてRBSを一切出荷しないgemによって宣言されている場合、それに根ざすチェーン全体が`external_gem_without_rbs` → `add_rbs`とラベル付けされます——これはユーザーが直接対処できる唯一の答え（`rbs collection install`、またはシグネチャを書く）です。所有権はgemのエントリーファイルをパースしてその宣言済み定数を調べることで確立され、gemの名前から推測されることは決してなく、gemのコードは一切実行されません;どのロック済みgemも宣言していない定数は汎用的な原因を保つので、失敗モードはラベルの欠落であって、決して誤ったラベルではありません。

### 変更

- **[rigor coverage]** `coverage --protection`が並列で実行されるようになり、`rigor check`と同じワーカーの設定つまみを尊重するので、大規模プロジェクトの保護スキャンがもはやシングルスレッドで詰まることはありません。
  - パラメータ推論の事前パスとファイル単位の保護スキャンは、それぞれ1つの親側環境（RBS環境、プラグインレジストリ、そして一度だけ構築されコピーオンライトで継承されるクロスファイルシード）から構築されたワーカープロセス上にフォークマップされます。ワーカー数は`check`とまったく同じように解決され（`--workers=N` › `RIGOR_RACTOR_WORKERS` › `.rigor.yml`の`parallel.workers:` › `0`）、出力は逐次実行とバイト単位で同一です。Mastodonの`app lib`で計測: 4ワーカーで61秒 → 43秒、ピークメモリはおよそ半減しました。
- **[rigor coverage]**パス引数なしの`rigor coverage`が、エラーになる代わりに、`rigor check`と同様に設定済みの`paths:`（デフォルト`lib`）へフォールバックするようになりました。
- **[repo]** `rigor-playground`のブラウザプレイグラウンドバックエンドが`plugins/`から`apps/rigor-playground/`へ移動しました（これはスタンドアロンのRack/Pumaアプリケーションであり、解析器プラグインではありません）ので、そのFly.io / Dockerのデプロイコマンドは新しいパスを参照するようになりました。

### 修正

- **[rigor annotate]**複数行のHashリテラル（および複数行のキーワード引数リスト）の内側の行が、もはやノイズとなる`#=> Dynamic[top]`アノテーションを持たなくなりました;リテラルの型は、囲んでいる文が閉じる行に一度だけ現れるようになりました。
- **[cli]**サポートされているとリストされているが配線されていないフォーマットに対する`rigor check --format <name>`が、何も出力しない代わりにはっきりと失敗するようになったので、サポート対象フォーマットのリストとディスパッチとのあいだのドリフトがサイレントに通過することはありません。
- **[engine]** `if login.present?` / `return if content.blank?`のようなガードが、nilableなレシーバーをナローイングするようになったので、ガードされた呼び出しはもはや`possible nil receiver`として読まれません。
  - 述語のシグネチャが`nil`に対して常に`false`を返すと宣言している場合（ActiveSupportの`NilClass#present?`がそうであるように）、真の答えはレシーバーがnilでなかったことを証明し、そのエッジではnil側の分岐がドロップされます;`blank?`については偽側のエッジで同様に反映されます。値にピン留めされた`nil` / `true` / `false`の分岐のみが参加し、セーフナビゲーションのガード（`x&.blank?`）は意図的にそのままにされます。Redmineで4件、GitLabで16件の偽陽性を除去し、どこにも新たな導入はありません。
- **[engine]**それをミューテートするヘルパーによって満たされるコレクション（`items.each { |s| absorb(s, acc) }; … unless acc.empty?`）が、もはや`flow.always-truthy-condition`として読まれません。
  - 呼び出しが、その本体内で自身のパラメータの1つを直接コンテンツミューテートするユーザーメソッド（`param[k] = v` / `param << x`）へ解決されるとき、対応する呼び出し側の引数がフロアされるので、後続のシェイプ読み取りが古い空リテラルのシードに対して畳み込むのをやめます（[ADR-56](../docs/adr/56-block-captured-local-mutation/) / [ADR-57](../docs/adr/57-self-call-return-adoption/)）。ミューテーションが無効化するリテラルシェイプのファクトを忘れるだけで、決してでっち上げることはありません。
- **[rigor-actionpack]** `unknown-permit-key`が、ストロングパラメータ内の仮想（非カラム）属性に対してもはや発火しません。
  - 非カラムをpermitすることは通常のRailsです——Deviseの仮想属性（`password`、`remember_me`）、ステートマシンの`*_event`、`attr_accessor`のセッター。このチェックは今やタイポ検出器です: permitキーが実在するカラムの編集距離的なニアミス一致（`emial` → `email`）であるときにのみ発火し、正当な仮想属性に対しては決して発火しません。
- **[rigor-rails-routes]** Grape APIをマウントするプロジェクトが、その`grape-path-helpers`の呼び出し（`api_v4_groups_badges_path`）をもはや`unknown-helper`として読みません。
  - このgemは各ヘルパーを、grapeのランタイムルートテーブルにあるそのルートのパスセグメントにちなんで命名しますが、それはメタプログラミングが構築するため、静的パーサがその名前を列挙することはできません。プラグインはプロジェクト自身のGrapeの`prefix`と`version`の宣言（`grape_api_paths:`、デフォルトは`lib/api` + `app/api`）を読み、`<prefix>_<version>_…_path`を有効だが列挙不能なものとして扱います。gemの契約が牙を健全に保つ箇所では、それが残ります: このgemは`_url`ヘルパーを一切定義しないので、`api_v4_groups_badges_url`は依然として発火します。GitLabの141件の`unknown-helper`エラーのうち68件を除去します。
- **[rigor-rails-routes]**動作するコードに対して偽の`unknown-helper`を発火させていた2つのルートヘルパー名合成のギャップが、Rails自身の命名に一致するようになりました。
  - `member do` / `collection do`ブロック内の複数セグメントの文字列アクション（`collection { get 'granular/new' }`）は、汎用的な誤順序の名前ではなく、Railsの`Mapper.normalize_name`がそうするやり方（`granular_new_<scope>_<plural>_path`）で命名されます。
  - 名前付きスコープ内の素のシンボルアクション（`scope(as: :user) { get :activity }`）は、`<scope_as>_activity_path`を登録するようになりました;以前はそのような呼び出しはヘルパーを一切登録せず、`unknown-helper`として読まれていました。
- **[rigor-activerecord]**ネストした／結合されたテーブルの条件（`Model.where(assoc: { ... })`）が、もはや未知のカラムとして読まれません——Hashの値は、レシーバー上のカラムではなく、アソシエーションまたは結合されたテーブルを名指すキーを持つ結合条件をマークします。
- **[rigor-activesupport-core-ext]**より多くのActiveSupportのコア拡張がカバーされるので、それらに対する呼び出しがもはや`undefined-method`として読まれません: `String#upcase_first` / `#remove` / `#titlecase` / `#dasherize`、`Object#in?`、`Date`/`Time#advance` / `#all_day`、`Date#to_time(form)`、そして`ERB::Util.html_escape_once`。
- **[core RBS overlay]**ピン留めされた`rbs`gemが省略している2つの標準ライブラリのシグネチャが供給され、実際の呼び出しが偽発火をやめます: `Psych.parse` / `.parse_stream`はもはや`undefined-method`として読まれず、`CSV::MalformedCSVError.new(message, line_number)`（文書化された2引数のコンストラクタ）はもはや`wrong-arity`として読まれません。
- **[cache]**永続キャッシュのエントリーがRigorのアップグレード後に再構築されるようになり、古い世代がより積極的に回収され、壊れたキャッシュルートは例外を投げる代わりにメモリのみへ縮退します。
  - キャッシュルートのマーカーが`Rigor::VERSION`を織り込むようになったので、より古いリリースによって書かれたMarshalペイロードは、アップグレード後に再利用されることは決してありません——アップグレード後の最初の書き込み可能な実行がキャッシュを再構築します。
  - 読み取り専用のストア（LSP／エディタモード）は、ディスクヒットを信頼する前にそのマーカーをチェックするようになり、アップグレード後にABI的に古いペイロードがなおアンマーシャルされうる唯一の経路を塞ぎます。
  - プロジェクト全体のキャッシュプロデューサーは、最近の世代を数個だけ保持するようになり、`cache.max_bytes`が無制限であっても、グローバルなバイト上限を下回ったまま無期限に残っていたコンテンツキー付きの孤児を回収します。
  - 読み取りも修復もできないキャッシュルート（権限エラー、ディスクフル、削除されたルート）は、もはや実行を失敗させません——解析はディスク層を無効化したまま継続します。

## [0.2.8] - 2026-07-06

v0.2.8は`rigor coverage --protection`にそれ自身を説明させます: すべての未保護サイトが、そのレシーバーが動的である理由と、それを閉じるであろうアクションを持つようになったので、レポートは最もレバレッジの高い修正へあなたを導きます（[ADR-82](../docs/adr/82-dynamic-provenance-wiring/)）。呼び出しサイトのパラメータ推論がより多くのメソッドシェイプに到達し、より多くのサイトを保護します。また、不正な形式のシグネチャに対してRBS環境を堅牢にします——単一のパースできない`.rbs`は、手書きであれ`rigor sig-gen`由来であれ、実行中のすべての型を空白にする代わりに、いまや封じ込められます。

### 追加

- **[rigor coverage]** `rigor coverage --protection`が、すべての未保護サイトに、そのレシーバーが動的である*理由*とそれを閉じるであろうアクション——RBSをインストールする、プラグインを有効化する、またはエンジンギャップを報告する——をラベル付けするようになりました（[ADR-82](../docs/adr/82-dynamic-provenance-wiring/)）。
  - 原因は変数バインディングとメソッドチェーンをまたいで値を追跡するので、素の`x` / `@x`やチェーンされた`x.foo.bar`のレシーバーは、空白のままにされるのではなくラベル付けされ、型付けされていないパラメータやバインドされていないインスタンス変数は、それを型付けするであろう推論へルーティングされます（[ADR-67](../docs/adr/67-parameter-type-inference/) / [ADR-58](../docs/adr/58-ivar-field-typing/)）。`--format json`は、`tractability_summary`と並んで、サイト単位の正確な`cause_site_counts`の集計を報告します。精度加算的です——型、診断、重大度の変更はありません。
- **[rigor coverage]** `rigor coverage --protection`が、呼び出しサイトからより多くのメソッドパラメータ型を推論し、より多くのサイトを保護します（[ADR-67](../docs/adr/67-parameter-type-inference/)）。
  - 呼び出しサイト推論は、末尾にオプショナル／キーワード／レスト／ブロックのパラメータが続く場合でも（`def f(x, opts = {})`）、メソッドの先頭の必須パラメータをカバーするようになりました。これは実際のRailsメソッドでよく見られるシェイプです。

### 修正

- **[rigor check / coverage]** `signature_paths:`下の単一のパースできないファイルが、RBS環境全体を崩壊させる代わりに隔離されるようになりました。
  - 以前は1つの不正な`.rbs`が環境構築全体を失敗させたため、すべての型クエリが`Dynamic[top]`へ縮退し、カバレッジと診断がサイレントにドロップしていました——診断数の*縮小*は実は「あなたの`sig/`が読み込まれなくなった」を意味しうるのです。シグネチャは今や1ファイルずつ読み込まれます;パースできないファイルはスキップされ、一度きりの警告で名指しされるので、環境の残り（およびすべてのバンドルされたRBS）は依然として読み込まれます。
- **[rigor sig-gen]**生成されたRBSが、環境全体を崩壊させるパースできないシグネチャファイルをもはや出力しません。
  - 2つのケースが修正されました: 非識別子キーを持つレコード形状の戻り値型（`{ "data-contrast" => T }`）と、`&block`パラメータを取るコンストラクタ（ブロックは今やパラメータの括弧の後に`?{ (*untyped) -> untyped }`としてレンダリングされます）。いずれも以前は`rbs`が拒否するRBSを生成し、`sig/`のビルド全体を失敗させていました;Mastodonのオンボーディングで表面化しました。

## [0.2.7] - 2026-07-05

v0.2.7は、RedmineとMastodonの調査対象のオンボーディングから、実際のRailsアプリ上での型カバレッジを鋭くします: `rigor-actionpack`がコントローラーのリクエストコンテキストのリーダーを型付けするようになり、単一で最大のディスパッチクラスタが`Dynamic`を読むのをやめ、2つの修正が`rigor coverage --protection`にRigorが実際に達成する保護を報告させます。また、バンドルされたAgent Skillsをアップグレードをまたいで最新に保ちます——新しい`rigor skill --full`とスキルごとのディレクティブが、各スキルのステップをインストール済みのgemから再取得するので、プロジェクトにインストールされたコピーがもはや陳腐化しません（[ADR-81](../docs/adr/81-skill-set-optimization/)）。`rigor sig-gen`の修正と、それが表面化させたエンジンの修正（不正なプロジェクトの`.rbs`がもはやRBS環境全体を崩壊させない）が、このサイクルを締めくくります。

### 追加

- **[rigor skill]**新しい`rigor skill --full <name>`が、バンドルされたスキルの本体に続けて、すべての`references/`ファイルをインラインで出力します——完全でバージョン最新の手順を1回の呼び出しで（[ADR-81](../docs/adr/81-skill-set-optimization/)）。
  - すべてのバンドルされたスキルは今や「バージョン最新のコピーを読み込む」ディレクティブで始まり、このコマンドを通じてそのステップを再取得するので、プロジェクトにインストールされたスキル（例: `npx skills add`経由）は、インストール時に凍結されたコピーではなく、*インストール済みの*Rigorに同梱される手順に従います。
- **[rigor-actionpack]**コントローラー内の暗黙のselfのリクエストコンテキストのリーダー`params`、`session`、`request`、`flash`、`cookies`が、`Dynamic[top]`ではなくそれらのAction Packクラスとして型付けされるようになったので、`params[:x]` / `params.require(...).permit(...)` / `session[:x] = …` / `request.xhr?` / `flash[:notice] = …`が具体的なレシーバー上でディスパッチします。
  - 実際のRailsアプリでは、これは単一で最大の型カバレッジの穴です: `params[...]`は#1のディスパッチクラスタであり（redmineの`app`+`lib`: 約2400の`[]`サイト）、`session[:x] =`と`flash[...]`がさらに大きなシェアを占めます。
  - 各型は意図的にバンドルされたRBSを一切持ちません——レシーバーは具体的である（そのため`coverage --protection`がそのサイトをカウントし、ディスパッチは名前付きクラスに対して解決される）一方で、そのメソッドサーフェスはエンジン寛容なままなので、すべてのメソッドが偽陽性安全なままです。値は`untyped`を読みます（[ADR-5](../docs/adr/5-robustness-principle/): 型付けされるのはコンテナであって、呼び出し側の引数ではありません）。

### 修正

- **[rigor coverage]** `rigor coverage --protection`が、保護を体系的に過少カウントする代わりに、Rigorが実際に達成する保護を報告するようになりました（redmine `app`+`lib` 0.195 → 0.328、mastodon `app/models` 0.177 → 0.311）。
  - それはスキャンスコープをRBS環境だけから構築していたため、プラグインが`dynamic_return`経由で型付けするレシーバー——コントローラーの`params`、`Model.where` → `ActiveRecord::Relation[Model]`——が`Dynamic`を読み、そのサイトが未保護として誤カウントされていました;スキャンは今や、ランナーとLSPが使うのと同じプラグイン対応の環境を構築します。
  - それはまた各ファイルを空のディスカバリーテーブルに対してスキャンしていたため、兄弟ファイルで定義されたクラスを参照する定数（Railsモデルの`Account`、`User`）が`singleton(Account)`ではなく`Dynamic`を読んでいました;スキャンは今や、スキャン対象のパスから`discovered_classes`をシードし、`rigor check`が解決するものに一致させます。
- **[rigor sig-gen]**サブクラスに対して生成されるRBSが、そのスーパークラスを保つようになりました——素の定数の親（`class X < Foo` / `class X < Foo::Bar`）に対して、素の`class GitAdapter`ではなく`class GitAdapter < AbstractAdapter`。
  - それをドロップすることは、サイドカーの`sig/`にそのクラスを誤って表現させ（継承されたメンバーが消え、そのためレシーバーのディスパッチが`Dynamic`へ縮退した）、もはや解決しない継承されたネスト型を参照しうるものでした。計算された親（`Struct.new` / `Data.define` / `Class.new`）は、以前と同様、依然としてスーパークラスなしで出力されます。
- **[engine]**不正なプロジェクトの`.rbs`が、もはやRBS環境全体を崩壊させません。
  - 参照型のスタブスイープが、囲む名前空間をスタブ化するときに、既に宣言済みの`class`を`module`として再宣言していました（例: `Foo::GitAdapter::Revision`をスタブ化すると、既存の`class`の上に`module Foo::GitAdapter`を再出力していた）。その結果生じる`RBS::DuplicatedDeclarationError`が環境全体をnullにし——その後すべての型クエリが`Dynamic[top]`へ縮退し、ほとんどの診断がサイレントに発火をやめていました。スイープは今や、欠落名前空間シンセサイザーが既に適用していたガードを反映して、環境内で既に宣言済みの名前をスキップします。redmineのオンボーディングで表面化しました（2026-07-04）。
- **[gem metadata]** gemの`documentation_uri`が`master`ブランチを指すようになり、RubyGemsの「Documentation」リンクが返していた404を修正しました。

## [0.2.6] - 2026-06-27

v0.2.6は、Rigorがそれ自身をどう説明するかを鋭くし、シェイプ対応の推論を引き締めます。`rigor coverage --protection`が各型付けされていない穴に、それが動的である理由と型がそれを閉じられるかどうかをラベル付けするようになり、新しい`rigor doctor`コマンドがセットアップの問題をその修正へルーティングします。リテラルのハッシュと配列が、`freeze` / `dup` / `clone`を通じてその精密なシェイプを保ち、凍結された定数上の畳み込みのギャップを塞ぎます。また、v1.0凍結に先立つプラグイン契約のクリーンアップを開始します: `type_specifier`フックが`narrowing_facts`へリネームされ、古い名前は非推奨エイリアスとして保たれます。

### 追加

- **[rigor coverage]** `rigor coverage --protection`が、各未保護のディスパッチがなぜ型付けされていないか、そして型がそれを閉じられるかどうかを説明するようになりました（[ADR-75](../docs/adr/75-dynamic-provenance/)）。
  - すべての`add_a_type_here`エントリーが、`dynamic_origin`の原因（`external_gem_without_rbs`、`framework_dsl_boundary`、`analyzer_budget_cutoff`、`explicit_untyped`、`unsupported_syntax`）と、そこから導出される`tractability`の軸（`add_rbs` / `enable_plugin` / `engine_gap`）を、`--format json`とテキストレポートの両方で持つので、インストール済みまたは手書きのRBSが実際に閉じられる穴を優先できます。軸ごとのディスパッチサイト合計の`tractability_summary`がJSONで出力され、テキストでは1行の`by tractability:`の内訳として表示されます。
  - 由来（provenance）は精度加算的です: `untyped = Dynamic[top]`のセマンティクスを決して変えず、診断を一切発火せず、重大度に決してフィードしません。
- **[rigor doctor]**新しい`rigor doctor`コマンドが、プロジェクトの既存の検出結果をセットアップ問題対クリーンランに分類し、それぞれに対してルーティングされた次のアクションを、安定した`checks[].id`のJSON契約の上で出力します（[ADR-77](../docs/adr/77-doctor-and-upgrade-commands/)）。
  - それは`rigor check`が既に生成するデータ（設定解決、RBS環境、プラグイン読み込み、ベースラインドリフト）の上のプレゼンテーション層であり、新しい解析は一切実行しません。付随する`rigor upgrade`は、まだマイグレーション対象を報告しないキュー済みのスケルトン（ADR-50 WD7）として出荷されます。

### 変更

- **[engine]**リテラルのハッシュと配列が、名前的な`Hash` / `Array`へ縮退する代わりに、`freeze` / `dup` / `clone` / `itself`を通じてその精密なシェイプを保つようになったので、`MESSAGES = {…}.freeze; MESSAGES[reason]`と`XS = […].freeze; XS[0]`は`Dynamic`ではなく精密な値を畳み込みます（[ADR-76](../docs/adr/76-effect-modeling-freeze-dup-shape-preservation/) WD2 / [ADR-78](../docs/adr/78-reflexive-overfold-always-truthy/) WD3）。
- **[engine]**シェイプキャリアのメソッド（`tuple.any? { … }`、`.sum { … }`、`.count { … }`、およびハッシュシェイプの同等物）が、ブロック形式の呼び出しをもはや定数畳み込みせず、通常のブロック/RBS経路に委ねます（[ADR-78](../docs/adr/78-reflexive-overfold-always-truthy/) WD1）。
  - それらは以前、ブロックを無視してブロックなしの結果を畳み込んでいました;この修正は厳密に精度を減じるものであり、上記のシェイプ保存の変更を妨げていた偽の`flow.always-truthy-condition`の発火を除去しました。

### 非推奨

- **[plugin contract]**プラグインフック`type_specifier`が`narrowing_facts`へリネームされます;`type_specifier`は非推奨エイリアスとして動作し続け、0.3.0で削除されます（[ADR-80](../docs/adr/80-narrowing-facts-rename/)）。
  - 古い名前は、リターン後のナローイングファクトを寄与するにもかかわらず、`dynamic_return`（型を寄与する）と並行するものとして読まれてしまっていました;`type_specifier methods: …` → `narrowing_facts methods: …`へ移行してください。移行後は、一度きりの非推奨警告が発火をやめます。バンドルされた`rigor-minitest` / `rigor-sorbet` / `rigor-rspec`プラグインは既に移行済みであり、`rigor plugins --capabilities`のJSONフィールド`type_specifier_methods`は今のところ変更されていません。

## [0.2.5] - 2026-06-24

v0.2.5は、`rigor-rails-i18n`にビューテンプレートの遅延キーのためのi18n検証を追加するので、ERB、Haml、Slimテンプレート内の`t('.title')`呼び出しが、Railsの仮想パス規約を使って展開され、キーの存在とロケールごとのカバレッジについて`config/locales/*.yml`に対してチェックされるようになりました。

### 追加

- **[rigor-rails-i18n]**ビューテンプレートの遅延`t('.title')`呼び出しが、`config/locales/*.yml`に対して検証されるようになりました。
  - キーはRailsの仮想パス規約を使って展開され（パーシャルの`_`接頭辞と`+variant`接尾辞は取り除かれます）、設定可能な`view_search_paths`下のERB、Haml、Slimテンプレートにわたって、存在とロケールごとのカバレッジについてチェックされます;結果はキャッシュされ、テンプレートが変更されると無効化されます。
  - 補間の検証はスキップされます——ハッシュは、テンプレートソースからは見えないコントローラーのインスタンス変数から来ることがあるためです。
  - 既知の制限: ビュースキャンはファイル単位の診断フックを通じて表面化されるプロジェクト全体のパスなので、`--workers`下では各フォークプールワーカーがフルセットを再出力します（`load-error`診断が既に持つのと同じ、ラン単位で一度きりの制限）。デフォルトの逐次`rigor check`は影響を受けません。
  - プラグインは`0.3.0`へバンプされました。

## [0.2.4] - 2026-06-22

v0.2.4は的を絞った互換性の修正です。宣言された`rbs >= 3.0, < 5.0`の範囲の下端で、環境読み込みのサーフェスにおけるAPIの乖離のために解析がクラッシュしていました;v0.2.4は両方のクラッシュ経路を修正し、プッシュごとにRBS 3.xと4.xの両方に対してRBS読み込みのサーフェスを実行するCIジョブを追加します。報告してくれたhttps://github.com/aki77に感謝します（https://github.com/rigortype/rigor/issues/21）。

### 修正

- **[rigor check]** RBS 3.x上の2つのクラッシュ——`undefined method 'primary_decl'`と`uninitialized constant RBS::Source`——を修正したので、RBS 4.xだけでなく、サポート範囲全体の`rbs >= 3.0, < 5.0`が再び動作します。
  - Rigorは今や、クラスエントリーの代表的な宣言を読み、RBS 3.xと4.xの両方の環境APIに存在するアクセサを通じてその宣言を歩きます。
  - 新しいCIジョブが、RBS 3.xとRBS 4.xの両方のバンドルに対してRBS読み込みのサーフェスを実行するので、サポート範囲は今後も正直なままです。

## [0.2.3] - 2026-06-21

v0.2.3は的を絞った`rigor triage`のユーザビリティ修正です。Railsプロジェクトでは、レポートがプラグイン認識トレースに支配されており、それが本物のエラー/警告のシグナルを埋もれさせ、最も*動作している*ファイルをトップのホットスポットとしてランク付けしていました;triageは今や、デフォルトで対処可能な診断のみをカウントします（[ADR-23 WD6](../docs/adr/23-diagnostic-triage-command/)）。

### 変更

- **[rigor triage]** distribution、selectors、hotspotの各セクションが、今やデフォルトで対処可能な診断（`error` + `warning`）のみをカウントします;`info`はこれらのボリュームビューからデフォルトで除外されます（[ADR-23 WD6](../docs/adr/23-diagnostic-triage-command/)）。
  - Railsプロジェクトでは、`info`はプラグイン認識トレース（`plugin.activerecord.model-call`、`plugin.rails-routes.helper`）に支配されています——「Rigorがこの呼び出しを解決した」という肯定的なレコードで、以前は本物のエラー/警告のシグナルを埋もれさせ、最も*動作する*コードを持つファイルをトップのホットスポットとしてランク付けしていました。サマリー行は依然として完全な`info`のカウントを報告し、ヒューリスティックなヒントは依然としてすべての診断を見るので、有用な`gem-without-rbs`の通知は生き延びます。
  - これはデフォルトの`triage`テキストと`--format json`出力に対する挙動変更です: ボリュームビューはもはや`summary.total`に合計されず、JSONはトップレベルの`include_info`ブール値を獲得します。以前の挙動を復元するには`--include-info`を渡してください。

## [0.2.2] - 2026-06-21

v0.2.2はSKILL駆動のオンボーディング体験を中心に据えます。新しい`rigor docs`コマンドがgemにバンドルされたドキュメントをオフラインで提供し、`rigor skill describe`がプロジェクト上で次に何をすべきかを推奨し、`rigor-next-steps`と`rigor-ask`に率いられた新しいAgent Skillsのファミリーが、AIコーディングエージェント（またはあなた）にRigorへの、現在的でバージョンに結びついたエントリーポイントを与えます（[ADR-73](../docs/adr/73-skill-driven-user-experience/)、[ADR-74](../docs/adr/74-offline-doc-access-and-llms-txt/)）。2026-06-20のオンボーディングのフィールドトライアルが、壊れたセットアップがもはやクリーンランとして読まれないよう、より明確な診断と設定警告のラウンドを推進しました。定数畳み込みがさらにいくつかの純粋なスカラーおよび構造的メソッドに到達し、解析器のシードパスが定義密度の高いプロジェクトでより少なく確保し、ツリー横断のドキュメント監査がスペックとハンドブックの矛盾のバッチを修正します。

### 追加

- **[cli]** `rigor skill describe`（`rigor skill --describe`とも綴られる）が、現在のプロジェクト上で次に何をすべきかを推奨します: それはプロジェクトの状態——設定 / ベースライン / `sig/` / CI、すべて`rigor check`を実行せずに安価な存在チェックから——を探り、1行の理由とともに推奨される次のスキルを出力し、バンドルされたすべてのスキルをその現在の説明とともにリストします（[ADR-73](../docs/adr/73-skill-driven-user-experience/)）。
- **[cli]** `rigor docs`が、gemにバンドルされたRigorのドキュメントを**オフラインで**提供するので、Rigorがインストールされれば、AIコーディングエージェント（またはあなた）は、スキルがルーティングするRigor運用ガイダンスを、ネットワークのラウンドトリップなしで読めます——`rigor skill`のドキュメント版の双子です（[ADR-74](../docs/adr/74-offline-doc-access-and-llms-txt/)）。
  - `rigor docs`はバンドルされた`llms.txt`インデックスを、`rigor docs <name>`はマニュアルまたはハンドブックのページを（`handbook/03-narrowing`のようなカテゴリー修飾されたパス、`02-cli-reference`のような接頭辞付きの名前、または`cli-reference`のような一意な短い名前でアドレス指定される）、`rigor docs --path <name>`はその絶対パスを、`rigor docs --list [category]`はディスカバリーリストを（オプションで`manual`または`handbook`にフィルタされる）出力します。
  - gemは今や`docs/install.md`、`docs/llms.txt`、そして完全な`docs/manual/`と`docs/handbook/`を出荷します;`rigor-editor-setup`、`rigor-mcp-setup`、`rigor-next-steps`の各スキルは、GitHubのrawのURLよりも`rigor docs <chapter>`を優先し、Webリンクはインストール前のフォールバックとしてのみ保持します。
- **[skills]**新しい`rigor-next-steps` Agent Skill——「Rigorで次に何をすべきか？」の単一のエントリーポイントです（[ADR-73](../docs/adr/73-skill-driven-user-experience/)）。
  - それは`rigor`コマンドを解決し（欠落していればガイド経由でインストールする）、未設定のプロジェクトをオンボーディングし、それから`rigor skill describe`を通じてルーティングするので、そのガイダンスはスキルファイルに凍結される代わりに、あなたのインストール済みのRigorに現在的なままです。
- **[skills]**新しい`rigor-ask` Agent Skill——`rigor-next-steps`の質問側の相棒であり、ユーザー向けのサーフェスが、覚える価値のある2つのスキル——*「次に何をすべきか？」*（`rigor-next-steps`）と*「Rigorについてこれに答えて」*（`rigor-ask`）——に収束します（[ADR-73](../docs/adr/73-skill-driven-user-experience/) / [ADR-74](../docs/adr/74-offline-doc-access-and-llms-txt/)）。
  - Rigorについて何でも平易な言葉で尋ねてください——なぜ診断が発火したのか、それが偽陽性かどうか、型モデルがどう動くか、フラグや設定キーが何をするか、RigorがSorbet / Steep / mypy / PHPStanとどう比較されるか、それが特定のgemやフレームワークを扱うか、あるいはメソッドをどう型付けするか。
  - Rigorはニッチでバージョン固有なので、スキルは記憶から答える代わりに調査します: それは`rigor docs`経由でバンドルされたハンドブックとマニュアルをオフラインで読み（診断idについては`rigor explain`を）、あなた自身のコードについての質問については`rigor check` / `annotate` / `type-of`を実行し、それからそのページまたは推論された型から答えます。
  - それはカタログのみ——質問によってトリガーされ、決して存在ベースで推奨されない——であり、「Xをやって」というリクエスト（CIをセットアップする、ベースラインを削減する）は、短いオリエンテーションと、一致するスキルへの引き継ぎを得ます。
- **[skills]**新しい`rigor-protection-uplift` Agent Skill——`rigor coverage --protection`が表面化させる型保護の穴を、sig-genを先に、そして最小限の手書きの残余で閉じ、`rigor check`をクリーンに保つ二重のゲートの下で行います（[ADR-63](../docs/adr/63-type-protection-coverage/) WD5を製品化）。
- **[skills]**新しい`rigor-rbs-setup` Agent Skill——プロジェクトのgemのためにコミュニティRBSをインストールする（`rbs collection install`）ので、RigorはRBSのない依存関係を`Dynamic`として型付けするのをやめます;`rigor skill describe`は、`Gemfile.lock`が存在するがまだ`rbs_collection.lock.yaml`がセットアップされていないときにそれを推奨します（[ADR-73](../docs/adr/73-skill-driven-user-experience/)）。
- **[skills]**新しい`rigor-editor-setup` Agent Skill——ライブ診断、ホバー型、補完のために、バンドルされた`rigor lsp`言語サーバーを開発者のエディタ（Neovim、VS Code、Helix、Emacs）に配線し、エディタごとの設定についてはマニュアルのエディタ統合の章へルーティングします;`rigor skill describe`は、プロジェクトがRigorへの参照なしに`.vscode/`設定をコミットしているときにそれを推奨します（[ADR-73](../docs/adr/73-skill-driven-user-experience/)）。
- **[skills]**新しい`rigor-mcp-setup` Agent Skill——バンドルされた`rigor mcp`サーバーをAIコーディングエージェント（Claude Code、Claude Desktop、Cursor、Cline）に配線し、それがRigorの読み取り専用の解析ツールを呼べるようにし、クライアントごとの設定についてはマニュアルのMCPの章へルーティングします;`rigor skill describe`は、プロジェクトがRigorへの参照なしにMCP設定（`.mcp.json` / `.cursor/mcp.json`）をコミットしているときにそれを推奨します（[ADR-73](../docs/adr/73-skill-driven-user-experience/)）。
- **[skills]**さらに4つのカタログスキルが`rigor skill describe`のセットを締めくくります（[ADR-73](../docs/adr/73-skill-driven-user-experience/)）。
  - `rigor-monkeypatch-resolve`は、`undefined-method`クラスタをクリアするために、プロジェクト自身のモンキーパッチファイルを`pre_eval:`に配線します;`rigor-plugin-tune`は、`Gemfile.lock`をバンドルされたプラグインカタログに再マッチし、適切なプラグインを有効化します（`rigor plugins --strict`で検証）;`rigor-upgrade`は、ベースラインに対する差分を取り、本物の新しい検出をシグネチャ品質の偽陽性から選り分けることで、新しいRigorバージョンを採用します;そして`rigor-doctor`は、既存の`config_warnings`、`rigor plugins --strict`、`rigor baseline drift`を通じてセットアップを検証します。
  - これらはカタログのみです: そのトリガーはイベントまたは実行時チェックであって、ファイル存在のシグナルではないので、`describe`は状態プローブから推奨するのではなく、エージェントが提示するようそれらをリストします。
- **[skills]**バンドルされたユーザー向けスキルが、`rigor skill`に加えて[vercel-labs/skills](https://github.com/vercel-labs/skills)経由でインストール可能になりました（`npx skills add rigortype/rigor`、またはスキルごとに）。新しい`skills/README.md`がそれらをカタログ化し、両方のインストールチャネルを文書化します;`.claude/skills/`下のコントリビュータ専用スキルは`metadata.internal: true`とマークされているので、一括インストールがそれらを出荷することはありません。
- **[inference]**リテラルレシーバー上のさらにいくつかの純粋で決定的なメソッドが、拡大されたRBS型ではなく、精密な`Constant`または`Tuple`へ畳み込むようになりました。
  - `Integer#allbits?` / `#anybits?` / `#nobits?`が、具体的なIntegerマスクに対して`Constant[bool]`へ畳み込みます（例: `0b1010.allbits?(0b1000)` → `Constant[true]`）——既に畳み込まれるビット参照`[]`のビットテスト版の兄弟です。リテラルのマスクは、カタログが保守的にフラグする、ユーザーがオーバーライド可能な`to_int`を決して経由しないので、ここでは畳み込みは純粋です。
  - 配列リテラル上の`Array#slice`が、インデックス、開始-長さ、Rangeの各形式にわたって`[]`とまったく同じように畳み込むようになったので（それは同じメソッドです）、`[10, 20, 30].slice(1, 2)`は`Tuple[20, 30]`を生みます。
  - `Pathname#/`（イディオム的なパス結合演算子、`dir / "file"`）が、その厳密なエイリアス`Pathname#+`と同じように畳み込み、`Pathname#basename(suffix)`が拡張子を取り除く形式（`Pathname.new("x.rb").basename(".rb")` → `Constant[#<Pathname:x>]`）を畳み込みます——どちらも純粋な`@path`の操作で、ファイルシステムの読み取りはありません。
  - 配列リテラルまたは整数のRange上のn引数の`min(n)` / `max(n)`形式が、Rubyの順序でタプルへ持ち上げられます（`min(n)`は昇順、`max(n)`は降順）——例: `[3, 1, 4].max(2)` → `Tuple[4, 3]`、`(1..10).min(3)` → `Tuple[1, 2, 3]`——既に畳み込まれる`first(n)` / `last(n)`のn引数版の兄弟です。
  - 2つのリテラルの集合のあいだの`Set#&`とそのエイリアス`Set#intersection`が、`Constant[Set]`へ畳み込むようになりました（例: `Set[1, 2, 3] & Set[2, 4]` → `Constant[Set[2]]`）——既に畳み込まれる兄弟`|` / `-` / `^`に加わります——交差が唯一のギャップだったのは、カタログがそのC本体をブロック依存として保守的にフラグしていたためです。
  - `Float#numerator` / `#denominator`が、そのフロートの厳密な有理数分解へ畳み込み（`2.5.numerator` → `Constant[5]`、`2.5.denominator` → `Constant[2]`）、`Float#arg` / `#angle` / `#phase`がその複素数の偏角へ畳み込みます（非負のレシーバーには`Constant[0]`、負のものには`Constant[Math::PI]`）——既に畳み込まれるRationalのアクセサのFloat版の兄弟です。非有限のエッジは健全なままです（`Infinity`のレシーバーはRubyが返す値へ畳み込み;`NaN`の結果はRBS層へ辞退します）。
  - `Pathname#split`が、`[dirname, basename]`のペアを`Pathname`定数の`Tuple`へ持ち上げます（`Pathname.new("/usr/bin/ruby").split` → `Tuple[#<Pathname:/usr/bin>, #<Pathname:ruby>]`）——既に畳み込まれるスカラーの`dirname` / `basename`のArray返却版の兄弟で、純粋な`@path`の操作でファイルシステムの読み取りはありません。
  - `String#shellescape`が`Constant[String]`へ畳み込み、`String#shellsplit`がそのトークンリストをタプルへ持ち上げます（`"ls -la".shellsplit` → `Tuple["ls", "-la"]`）——既に畳み込まれる`Shellwords.escape` / `Shellwords.split`のString-レシーバー版の双子です。閉じられていない引用符は畳み込み時にraiseし、RBS層へ辞退します。

### 変更

- **[cli]** `target_ruby`の設定エラー診断が、今やサポートされる下限と正しい値をどこで読むかを名指しします。設定された`target_ruby`がPrismの最小値を下回るとき（例: `"3.0"`）、メッセージは素の*"not accepted by Prism"*ではなく*"is not supported by this Rigor build (Prism accepts 3.3.0 and newer). Set target_ruby to your project's Ruby version (>= 3.3.0) — read it from Gemfile.lock's `RUBY VERSION` or .ruby-version"*と読めるので、推測と再試行のループなしに修正が明白になります（下限はハードコードではなくライブで探られます）。2026-06-20のオンボーディングのフィールドトライアルで表面化しました。
- **[plugins]**便利なメタgem（例: `plugins: [rigor-rails]`のリスト）に対するプラグイン読み込みエラーが、今や対処可能です。素の*"registered multiple plugins; disambiguate with an explicit `id:` field"*の代わりに、それはそのgemがメタgemであると説明し、バンドルされたプラグインをリストし、`plugins:`に個々の`rigor-*`プラグインgemをリストするよう告げます（例付き）——そのため直感的だが誤った`plugins: [rigor-rails]`はもはや行き止まりになりません。2026-06-20のオンボーディングのフィールドトライアルで表面化しました。
- **[cli]** `rigor skill describe`の「For the agent」セクションが、今や**check対応のルーティング**を教えます。推奨自体は存在ベースのままですが（[ADR-73](../docs/adr/73-skill-driven-user-experience/) WD2に従い、`rigor check`を決して実行しません）、ガイダンスはエージェントに、既に持っている`rigor check`の検出結果から選択を精緻化するよう告げます——エラー → `rigor-baseline-reduce`、モンキーパッチの`undefined-method`クラスタ → `rigor-monkeypatch-resolve`、一致するプラグインのないDynamicなフレームワーク呼び出し → `rigor-plugin-tune`、`RBS classes available: 0` / `configuration-error` → `rigor-doctor`——フィールドトライアルの目玉のギャップ（存在ベースの見出しは、`check`が明かすものよりも不適切なことが多かった）を塞ぎます。
- **[cli]** `rigor describe`が、`rigor skill describe`のトップレベルのエイリアスとして動作するようになりました（フィールドトライアルで、素の形式が試されて「Unknown command」に出会うのが見られました）。
- **[cli]** `rigor skill`と`rigor docs`が、位置スロットが曖昧さなくスキル／ドキュメントの*名前*になるよう、そのディスカバリーサブコマンドをフラグへ移動しました: `rigor skill <name>`（出力） / `--list` / `--path <name>`、そして`rigor docs <name>`（出力） / `--list [category]` / `--path <name>`。`rigor skill describe` / `--describe`（およびトップレベルの`rigor describe`）は変更されていません。レガシーな動詞の綴り——`rigor skill list` / `print <name>` / `path <name>`と`rigor docs list` / `path <name>`——は依然として動作しますが、今や1行のstderr非推奨通知を出力し、**v0.3.0で削除されます**（[ADR-73](../docs/adr/73-skill-driven-user-experience/) / [ADR-74](../docs/adr/74-offline-doc-access-and-llms-txt/);ROADMAP § 「Scheduled CLI deprecations」を参照）。
- **[cli]** `rigor check`が、別のパスがファイルを生むときに、実行全体をexit 1で中止する代わりに、存在しないパスを警告してスキップするようになりました。`lib/`のないプロジェクトでの`rigor check app lib`は、今や`app`を解析し、`lib:1:1: warning: no such file or directory (skipped)`を出力します。*何も*解析するものを残さないパスは依然としてエラーになるので、単独のタイポ（`rigor check typo.rb`）がサイレントにマスクされることはありません。2026-06-20のオンボーディングのフィールドトライアルで表面化しました。
- **[cli]** `rigor skill describe`が、Railsプラグインが1つも有効化されていない*設定済みの*Railsプロジェクトに対して、今や`rigor-rbs-setup`よりも先に`rigor-plugin-tune`を推奨します——ActiveRecord / routes / i18nのプラグインを配線することは、コミュニティRBSよりも多くを解決します（2026-06-20のフィールドトライアルの目玉のケース）。手がかりは存在ベースです: `Gemfile.lock`にRailsがあり、かつ設定に`rigor-rails-*`プラグインがないこと。
- **[cli]** `rigor check`が、RBS環境が空である（`RBS classes available: 0`）ときに、今や目立つWARNINGを出力します。通常の実行は常にバンドルされたコア + 標準ライブラリのRBSを読み込むので、ゼロは環境の構築が失敗した——たいていは`signature_paths:`内の重複宣言——ことを意味し、空へフォールバックして、それ以外は「成功した」実行を、ほぼ役に立たない型カバレッジで残します（ほとんどの診断とカバレッジが発火できません）。それを表面化させることは、壊れたセットアップがクリーンな解析と取り違えられるのを止めます——フィールドトライアルのredmineのケースは、さもなければ0カバレッジのcheckをCIに配線していたでしょう。

- **[inference]** `ScopeIndexer`のシードパスが、各ファイルのASTをより少ない回数歩きます。ディスカバリーの事前パスは、テーブルごとに別々のフルツリー降下を実行していました;とりわけ、発見されたメソッドの走査とインスタンスメソッドのdefノードの走査は、バイト単位で同一のクラス / モジュール / シングルトンの走査を持ちながら独立して実行され、クロスファイルの事前パスはdefノードツリーを*2回*歩いていました（一度は`merge_discovered_defs`で、一度は`record_class_sources`で）。1つの結合された`walk_methods_and_def_nodes`降下が、今や両方のテーブルを一度に生成し、defノードのテーブルは再計算される代わりにその2番目の消費者へスレッドされます。定義密度の高いライブラリが最も恩恵を受けます——`mail` gem（196ファイル）でのコールドな`rigor check --no-cache`は、約8%少ないオブジェクトを確保します（20.6M → 18.9M）;MastodonとRedmineは約0.5〜1%下がります。診断は調査コーパス全体でバイト単位で同一です（[プロファイリングノート](../docs/notes/20260620-corpus-cold-warm-reprofile/)）。

### 修正

- **[docs]**ハンドブック、マニュアル、および内部 / 型仕様のツリー横断の一貫性監査が、実装に対して表面化した矛盾のバッチを修正しました。
  - 重大度と文法: ハンドブックのエラーの章が2つのルールに対して誤ったデフォルト重大度をリストしていました（`call.possible-nil-receiver`は`warning`ではなく`error`;`def.ivar-write-mismatch`は`balanced`下では`error`ではなく`warning`）;`RBS::Extended`のディレクティブ文法が、`assert` / `assert-if-*` / `predicate-if-*` / `conforms-to`のディレクティブに余分なコロンを持ち（`return:`と`param:`だけがコロンを取ります）、存在しない`assertion-on`ディレクティブを文書化していました。一方で、実在する`assert-if-true` / `assert-if-false`ディレクティブは今やディレクティブテーブルに入っています;そしてハンドブックの第9章と複数の付録が、削除された`flow_contribution_for`プラグインフックを依然として現行として提示しており、今は`dynamic_return` / `type_specifier`です（[ADR-52](../docs/adr/52-compiled-plugin-contribution-dispatch/)）。
  - カタログとカウント: examplesのカウント（「sixteen」→ six）とプロダクションプラグインのカウント（「Thirty」→ thirty-one）が修正されました;予約リファインメントのカタログが、実装された`int<min, max>`形式を禁じ、`non-empty-hash[K, V]`を省いていました;そしてナローイングのカタログが、既に実装している`respond_to?`と`empty?` / `any?` / `none?`の述語シェイプを獲得しました（ハンドブックは`respond_to?`が決してナローイングされないと主張していました）。
  - キャッシュ、API、レンダリング: キャッシュの章が、ファイルの追加/削除がフル実行を強制すると主張していました（それはインクリメンタルに処理されます）;`plugin-cache-producers.md`が、プラグインキャッシュは無制限だと主張していました（それらは[ADR-54](../docs/adr/54-cache-slimming/)に従い256 MB上限のLRUストアを共有します）;`public-api.md`が、存在しない`protocols`マニフェストメンバーを名指していました（今は`protocol_contracts`）;`diagnostic-shape.md`の「before v0.1.0」のロックノートが、[ADR-50](../docs/adr/50-release-engineering-and-stability-strategy/)のv1.0凍結へ更新されました;`Dynamic[Top]`が、エンジンの実際の`Dynamic[top]`のレンダリングへ全体にわたって正規化されました;そしてドキュメントのエラーの種となっていた2つの古いソースコメントが、同じパスで修正されました。

## [0.2.1] - 2026-06-19

v0.2.1は、検出と設定の磨き上げで0.2.xの評価ラインを継続します。目玉は、Railsプロジェクトが`3.minutes`や仲間で見ていた体系的なコア拡張の偽陽性を黙らせる、`Gemfile.lock`でゲートされたActiveSupport RBSオーバーレイであり、v0.2.0の証拠層のフィードバックをその源で解決します（[ADR-72](../docs/adr/72-gemfile-lock-gated-rbs-overlays/)）。`rigor check`が、設定値がサイレントに何にも解決しないときに警告するようになり、`rigor coverage`が融合された静的プラス動的の保護マップを獲得します（[ADR-70](../docs/adr/70-fused-protection-coverage/)）。定数畳み込みがさらにいくつかの純粋なスカラーおよび構造的メソッドに到達し、修正には、インストール済みのgemをそのバンドルされたRBSデータなしで残していたgemパッケージングのバグが含まれます。

### 追加

- **[inference]** `activesupport`が`Gemfile.lock`にあるがRBSを一切出荷しないとき、Rigorが今やバンドルされたActiveSupportコア拡張RBSオーバーレイを自動読み込みするので、`3.minutes`、`6.days`、`"x".underscore`、`hash.symbolize_keys`のようなコア拡張の呼び出しが、プラグインや設定のないRailsプロジェクト上で偽の`call.undefined-method`を発火するのをやめます（[ADR-72](../docs/adr/72-gemfile-lock-gated-rbs-overlays/)）。
  - それはgemが実際にロックされていることでゲートされるので、`activesupport`のないプレーンRubyのプロジェクトは依然として本物の`undefined method 'minutes' for 3`を得て、コア型上の本物のタイポ（`5.minuets`）は`evidence_tier: high`で発火し続けます。
  - これはv0.2.0の`evidence_tier`のキャリブレーションレポートを、発火をラベル付け直すのではなくその源で解決します——層は決して重大度にフィードしないので、層を下げても偽のエラーが画面に残ったままだったでしょう。
  - オーバーレイは、オプトインの[`rigor-activesupport-core-ext`](plugins/rigor-activesupport-core-ext/)プラグインが読み込まれると自動的に退き、あなたが（`rbs collection install`または`signature_paths:`経由で）ActiveSupport RBSを自分で供給する場合はバイパスされます。
- **[inference]**リテラルレシーバー上のさらにいくつかの純粋で決定的なメソッドが、拡大されたRBS型ではなく、精密な`Constant`または`Tuple`へ畳み込むようになりました。
  - `Symbol#name` / `#id2name`が`Constant[String]`へ、`#intern`が`Constant[Symbol]`へ畳み込みます。既に畳み込まれる`to_s` / `to_sym`の自然な兄弟です。
  - `Integer#finite?` / `#infinite?` / `#nonzero?`が畳み込み（既に`finite?` / `infinite?`を畳み込んでいた`Float`との一貫性のギャップを閉じます）、`Float#nonzero?` / `#integer?`も同様です。
  - `String#grapheme_clusters`が書記素ごとの`Tuple`へ持ち上げます。既に畳み込まれる`chars`の拡張書記素クラスタ版の兄弟です。
- **[cli]** `rigor check`が、設定値がサイレントに何にも解決しないときに今や警告します——ゼロのシグネチャを読み込む、または抑制を不活性にするタイポのクラスで、唯一の症状は紛らわしい下流のエラーです。
  - 以前は、これらのそれぞれが一言もなくフィルタされていました: 例えば欠落したRBSパスは、それがカバーするはずだった型へのあらゆる呼び出しを`evidence_tier: high`の`call.undefined-method`に変えていたので、1文字の誤りが数百の本物のエラーとして読まれえたのです。
  - 監査は、`signature_paths:`（欠落、非ディレクトリ、または`.rbs`を1つも持たない）、`libraries:`（RBSが認識しない名前）、`disable:` / `severity_overrides:`（組み込みファミリー下の実在するルールを名指さないルールid;プラグインと`rbs_extended.*`のidはそのまま）、そして`bundler.bundle_path` / `bundler.lockfile` / `rbs_collection.lockfile`（存在しない設定済みパス）をカバーします。
  - 各検出はエントリーごとにSTDERRに出力され、`--format=json`のペイロードに`config_warnings`配列（それぞれ`kind`でタグ付け）の下で乗り込むので、CIとフレームワークの消費者はそれらについてアサートできます。
  - それはハードエラーではなく警告のままです: 未設定のデフォルト（自動検出された`<root>/sig`、自動検出されたバンドル）については決して警告されないので、正しく設定されたプロジェクトは何も見ません。
- **[cli]** `rigor coverage --protection --mutation --with-tests`が、*動的*な保護の軸を追加します: Rigorの解析が見逃す型可視のミューテーションのそれぞれについて、あなたのテストスイートを実行し、テストがそれを捕捉するかどうかを報告し、静的な型保護と動的なテスト保護を1つのマップに融合します（[ADR-70](../docs/adr/70-fused-protection-coverage/)）。
  - 各ディスパッチサイトは、型保護済み、テスト保護済み、または未保護（ランク付けされた「ここに型かテストを追加」リスト）に分類されるので、レポートは単一の数字ではなく、より安価な欠落した軸を名指します。
  - テストランナーは`--test-command`フック（デフォルト`bundle exec rake`）で、Bundlerの環境を剥がして実行されます;スイートはクリーンなコード上でまず通過せねばならず、高価な実行は、型チェッカーが既に殺していないミュータントについてのみ支払われます。
  - `--include-dynamic`はオーバーレイを`Dynamic`レシーバーの呼び出しサイト——テストが唯一可能な保護である箇所——へ拡張し、`--limit N`（`--seed`とともに）は計測を決定的なファイル単位のサンプルへ制限します。

### 修正

- **[cli]** `.rigor.yml`で素の`off`として書かれた`severity_overrides:`（または`disable:`）の値が、もはや生の`NoMethodError`のバックトレースで`rigor check`をクラッシュさせなくなりました。
  - YAML 1.1はクォートされていない`off` / `on` / `no` / `yes`をブール値としてパースするので、`flow.dead-assignment: off`は`false`としてローダーに到達していました;それは今や、キーを名指し、重大度をクォートするよう告げる明確な`ArgumentError`をraiseします（例: `"off"`）。
- **[inference]**エスケープするブロック内のヘルパーを通じて満たされるオプションハッシュ——`OptionParser.new { |opts| define_options(opts, options) }`のイディオム——が、もはやそのリテラルのデフォルト値を保たなくなったので、`if options[:mutation] && !options[:protection]`のような後続のガードが、偽の`flow.always-truthy-condition`警告へ畳み込むのをやめます。
  - エスケープするブロックのコンテンツフロア（[ADR-57](../docs/adr/57-self-call-return-adoption/)）は今や、ブロック本体内の直接の書き込みだけでなく、その引数の1つをエスケープミューテートするブロック本体内の自己呼び出しも追います。
- **[packaging]**公開されたgemが今や、RigorのバンドルされたRBSデータ——`data/vendored_gem_sigs/`のgemごとのスタブ（nokogiri、pg、redis、mysql2、その他）と、v0.2.0のStringScanner修正を含む`data/core_overlay/`のコア再オープン——を出荷します。
  - gemspecの`spec.files`のグロブは`data/builtins/**/*.yml`のみに一致していたので、インストールされた`rigortype` gemはこれらの`.rbs`ファイルをサイレントに欠いており、ソースからのチェックアウトが出さない余分な`call.undefined-method`の偽陽性を生んでいました。

## [0.2.0] - 2026-06-17

v0.2.0はRigorの最初に公表された（一般 / 評価）リリースであり、[ADR-50](../docs/adr/50-release-engineering-and-stability-strategy/)によって統治されます: それは列挙された公開互換性サーフェス（[`docs/compatibility.md`](../docs/compatibility/)）を、v1.0.0凍結へ向けたトライアルのコミットメントとして公開し、将来のメジャーの診断をプレビューするための最先端のオプトインを出荷します。目玉は検出の「牙」——`call.undefined-method`と`call.argument-type-mismatch`が、以前は見送っていたユニオン、リファインメント、マルチオーバーロードのレシーバーについて推論するようになったこと——であり、新しい解析器の自己テストハーネス（[ADR-62](../docs/adr/62-mutation-testing-teeth-measurement/)）によって表面化され、新しい型保護カバレッジレポート（[ADR-63](../docs/adr/63-type-protection-coverage/)）によって計測されます。また、定数畳み込みをより多くの組み込みメソッドと定義済み定数へ広げ、`Struct.new`の値オブジェクトを畳み込み、エージェント向けの診断メタデータ（証拠層とドキュメントURL）を追加します。修正には、いくつかの実世界の偽陽性除去に加えて、開発者のフィードバックからのクラッシュとパッケージングの問題が一握り含まれます。

### 追加

- **[inference]** `call.undefined-method`が、メソッドがすべてのアーム上で不在であるとき、*ユニオン*レシーバー上で発火するようになりました（`String | Symbol`は、両方が応答する場合にのみメソッドに応答します）。以前はスカラーの存在チェックが任意のユニオンで見送っていました。
  - 構成上、保守的です: `Dynamic`、未知 / オープン / ソース宣言のクラス、汎用の`Class` / `Module`メタクラス、またはnilを帯びるアームがあれば発火を抑制し、ユニオンは少なくとも2つの異なるアームクラスを持たねばなりません（`Hash[K1, V1] | Hash[K2, V2]`のような同一クラスのシェイプ結合はスカラールールに委ねられます）。
- **[inference]**リファインメントと差分のレシーバーが今や呼び出しルールの牙を得ます: 境界付き整数（`positive-int`、`int<1,5>`）、文字列ファミリー（`non-empty-string`）、または非空 / 非ゼロ（`non-empty-array`、`non-zero-int`）のレシーバーが、ディスパッチのためにその基底クラスへ解決するので、`call.undefined-method`、`call.wrong-arity`、`call.argument-type-mismatch`が、「単一の具体的なクラスがない」として見送る代わりにそれについて推論します。
- **[inference]** `call.argument-type-mismatch`が、どのオーバーロードも受け入れないマルチオーバーロードメソッドへの引数——nilを拒否するパラメータへの`nil`引数と、誤って*型付けされた*（非nil）引数の両方——に対して発火するようになり、ミューテーションスイープが表面化させた最大の偽陰性クラスタを閉じます（[ADR-64](../docs/adr/64-non-nil-argument-type-mismatch/)）。
  - nilチャネルは`5 * nil`、`"a" + nil`、`[1, 2, 3].fetch(nil)`を報告し、RBSパラメータ型でnil受容性を判断するので、インターフェイスエイリアス（`string`、`int`）とジェネリックエイリアス（`range[int?]`）を見通します;宣言由来のivarの`nil`は免除されたままです（[ADR-58](../docs/adr/58-ivar-field-typing/)）。
  - 非nilチャネルは`[1, 2, 3].fetch("x")`を報告する一方で`.fetch(2.0)`をクリーンに保ち（`Float#to_int`）、`coerce`ディスパッチの演算子（`+ - * / < …`、非`Numeric`引数が依然として有効でありうる箇所）を除外し、すべてのオーバーロードが拒否する単一の具体的なRBS既知クラスへ型付けされる引数に対してのみ発火します。
- **[inference]** RBSのクラスエイリアス（`class Mutex = Thread::Mutex`、および任意の`X = Y`）が、そのターゲットのメソッドサーフェスへ解決するようになったので、ディスパッチが精密に型付けされ、エイリアス上の本当に欠落したメソッドが`call.undefined-method`を発火します。
- **[inference]**定数畳み込みのカタログがより多くの純粋な組み込みメソッドをカバーするので、より多くの静的に既知の式が精密な`Constant`または`Tuple`へ畳み込みます（それぞれライブのMRIの値に対して検証済み）。
  - スカラーの畳み込み: `Integer#[]` / `#ceildiv` / `#to_r` / `#to_c`、`Float#quo` / `#to_r` / `#rationalize`、`String#casecmp` / `#casecmp?` / `#sum`、`Symbol#succ` / `#next`、そして完全な`Rational`と`Complex`の算術 / 比較のサーフェス。
  - コレクションの畳み込みはタプルへ持ち上げます: `String#codepoints`、`Integer#digits(base)` / `#gcdlcm`、`String#partition` / `#rpartition`、`Range#sum` / `#first(n)` / `#last(n)` / `#take(n)`、そして`Array#minmax` / `#join`。
  - NaN防御ガードが、非反射的な`==`がユニオンの重複排除を破壊しうる、結果がNaNの`Float`（またはNaNを帯びる`Complex`）である任意の畳み込みを辞退します。
- **[inference]**定義済みのRuby / 標準ライブラリの定数が、最も広いRBS宣言の代わりに精緻化された型を受け取るようになりました。
  - Tier 1は、実装をまたいで不変な数値——`Math::PI`、`Math::E`、そしてIEEE 754の限界`Float::INFINITY` / `MAX` / `MIN` / `EPSILON`——を`Constant[Float]`へ畳み込むので、`Math::PI * 2`が精密に畳み込みます（`Float::NAN`は除外されます）。
  - Tier 2は、`RUBY_VERSION`のようなコア / 標準ライブラリの定数を、解析器自身のランタイム経由で精緻化された`String`キャリアへ解決し、一方でプロジェクト定義の定数は変更されずにフォールスルーします。
- **[inference]** `Struct.new`の値オブジェクトが、メンバー読み取りを精密な型へ畳み込むようになりました。これはv0.1.17の`Data.define`畳み込みのミュータブルな兄弟です（[ADR-48](../docs/adr/48-data-struct-value-folding/)）。
  - `Struct.new(:x, :y).new(1, 2).x`、`Point.new(1, 2).x`、そしてバインドされた`p = Point.new(1, 2); p.x`はすべて`1`と型付けされ、位置指定と`keyword_init: true`の構築、そして`.members` / `.to_h` / `.deconstruct` / `.with`の射影を伴います。
  - `Struct`はミュータブルなので、新鮮なインスタンス上の読み取りは常に畳み込みますが、バインドされたローカル上の読み取りは、そのローカルがミューテート、エイリアス、エスケープされないことが証明可能なときにのみ畳み込みます——書き込まれた、エイリアスされた、または渡し去られたものはすべて、古い値を畳み込むのではなく`Dynamic[top]`へ拡大します。
- **[cli]** `rigor coverage --protection`が、型保護カバレッジを報告します——型がどれほど精密かではなく、Rigorが各ディスパッチサイトでバグを捕捉できたかどうか——ランク付けされた「ここに型を追加」リスト、`--threshold`ゲート、`--format json`を伴います（[ADR-63](../docs/adr/63-type-protection-coverage/)）。
- **[cli]** `rigor coverage --protection --mutation`が、各ディスパッチサイトに型可視の破損を導入し、Rigorがそれらをどれだけ頻繁に捕捉するかを報告することで、保護を直接計測します。デフォルトはgitで変更されたファイルです（[ADR-63](../docs/adr/63-type-protection-coverage/) Tier 2）。
  - フレーミングは常に有効性 / どこに型を追加するかであって、生の「生存」では決してありません;それは開発専用のミューテーションハーネスのサポートされたサブセットを製品化します（[ADR-62](../docs/adr/62-mutation-testing-teeth-measurement/)）。
- **[inference]** `rigor coverage --protection`が、呼び出しサイトで推論されたパラメータ型を今やクレジットするので、レシーバーへ流れ込む未宣言の`def`パラメータが、`Dynamic`として読まれる代わりに保護済みとしてカウントされます（[ADR-67](../docs/adr/67-parameter-type-inference/)）。
  - 推論は精度加算的です——それはメソッド本体のローカルとしてのみ存在し、決してRBS契約ではないので、呼び出し側でパラメータ境界の診断を発火できません——そして`check`の実行はバイト単位で同一のままです（保護スキャンだけがそれを参照します）。
- **[cli]** `rigor check --bleeding-edge[=ids]` / `--no-bleeding-edge`が、設定された`bleeding_edge:`の選択を単一の実行についてオーバーライドします。`--workers`と同じ、CLIが設定に優先する優先順位を伴います（[ADR-50](../docs/adr/50-release-engineering-and-stability-strategy/) § WD2）。
  - このリリースではオーバーレイは空なので、フラグは今日は診断上ノーオペです;オーバーレイとアクティブな選択は`rigor show-bleedingedge`で検査します。
- **[cli]**すべての組み込み診断が今や、`rigor check --format json`上および`rigor explain`経由で、`evidence_tier`（`high` / `medium` / `low`）と安定した`documentation_url`を持ちます（[ADR-65](../docs/adr/65-diagnostic-evidence-tier-and-doc-url/)）。
  - 層は、発火が真陽性であるというRigor自身の確信であり、ルールのゲートから導出されます;それは重大度と直交し、決してゲーティングにフィードせず、注意のルーティングだけを行います（`jq '.diagnostics[] | select(.evidence_tier == "high")'`でフィルタ）。
- **[cli]** `rigor check --coverage`が、checkの実行に型精度カバレッジのブロックを追加するので、1回の実行が、何が発火したかと、Rigorが型付けできた解析対象サーフェスがどれだけかの両方を報告します;デフォルトではオフです。
- **[environment]** `bundler.auto_detect`が今や、プロジェクトにツリー内バンドルがないときの最後の手段として、ユーザーグローバルのBundlerパス（`~/.bundle/config`）も尊重し、それをプロジェクトルートに対して相対的に解決し、それが実在するディレクトリを指す場合にのみ行います。

### 変更

- **[inference]** `numeric-string`が今や、以前の符号付き10進数のみの定義ではなく、任意の単一の完全なRuby数値リテラル——ちょうど`Numeric`に評価される構文——を意味します。述語をPrismパーサへ委譲することによってです。
  - それは16進 / 8進 / 2進の整数、アンダースコア区切り、科学的記数法の浮動小数点数、そして`r` / `i`の接尾辞を受け入れる一方で、二重符号、部分的なリテラル、非ASCII数字を拒否します;古い数字のみの意味に依存していた2つのナローイング（`Integer(numeric-string)`と`numeric-string#to_i`）は、より広い文法に対して健全にされました。

### 修正

- **[inference]**オプションのライブラリが不在の`const_missing`フックを通じて解決される定数への参照（例: `Digest::UUID`）が、もはや`LoadError`で実行全体をクラッシュさせません;ルックアップは今や、オートロードの副作用をトリガーせずに各パスセグメントを解決し、安全網として`LoadError`をレスキューします。
- **[inference]** `StringScanner`の名前付きキャプチャアクセス（`scanner[:key]`）が、もはや`call.argument-type-mismatch`を偽発火しません;コアオーバーレイが、ピン留めされた`rbs` 4.0.2のgemが省略する`(Integer | String | Symbol)`のインデックスオーバーロードを供給する（より新しい`ruby/rbs`は既にそれを運びます）ので、新しいマルチオーバーロード引数チェックが`Symbol` / `String`形式を有効と見なします。
- **[inference]** `if / elsif / else: raise`チェーンにわたって条件付きで代入されるローカルが、あるアームが`Dynamic`型付けで別のアームが具体的であるときに、もはや誤ってnilかもしれないとフラグされません。
  - 内側の`elsif … else raise`が、ローカルがバインドされないまま素の述語ナローイングのコンテキストを返していたため、外側の`if`のマージがそれにnilを注入していました;`if`と`unless`の早期脱出の経路の両方が今や、実行されたthen本体のコンテキストを前方へ運び、`case`/`when`ルールを反映します。[liquid v5.xの回帰スイープ](../docs/notes/20260616-liquid-v5.x-regression-sweep/)で表面化しました。
- **[inference]** `for` / `while` / `until`ループ内の`break`経路のバインディングが、もはやループ後のコンテキストから落とされなくなり、よくある「フラグを立ててbreakする」という検索イディオム上の偽の`flow.always-truthy-condition`を修正します。
  - 各`break`でのコンテキストがループの継続へ結合されます——構文的な過剰近似ではなく精密で、レキシカルにスコープされるので、ネストしたループやブロック内の`break`はリークしません。設計は[`docs/notes/20260615-loop-break-binding-propagation-design.md`](../docs/notes/20260615-loop-break-binding-propagation-design/)にあります。
- **[inference]**再現不能な組み込みの結果が、もはや`Constant`へ畳み込まれなくなりました: `#hash`（プロセスごとのSipHashのシードでソルトされる）と`String#crypt`（プラットフォームの`crypt(3)`）。
  - どちらかを畳み込むことは、ある解析プロセスの値を推論された型とオンディスクのキャッシュに焼き込み、他のすべてのプロセスで誤りとなります;普遍的なガードが今やすべてのカタログ化されたクラスにわたって`hash` / `object_id` / `__id__`をブロックし、一方で決定的な兄弟（`inspect`、`to_s`）は依然として畳み込みます。
- **[inference]** `Integer(decimal-int-string)`と`decimal-int-string#to_i` / `#to_int`が、キャリアが先頭の符号を許容する（`Integer("-7") == -7`）ため、もはや`non-negative-int`へナローイングしなくなりました;それらは今や完全な符号付き`int`の範囲を生み、下流のナローイングのために精密な`IntegerRange`を保ちます。
- **[inference]**オプトインの`call.self-undefined-method`ルール（[ADR-24](../docs/adr/24-self-method-call-resolution/)スライス4、デフォルトでオフ）が、そのコーパス評価が表面化させた3つの偽陽性クラスを脱ぎ捨てます——普遍的な基底のレシーバー（`Object` / `Kernel`）、抽象 / テンプレートメソッドの基底クラス（見逃されたメソッドが既知のサブクラス上で定義されているときに抑制）、そして動的な非定数のスーパークラス（`< DelegateClass(Array)`）。
  - 3つすべては純粋なナローイングです（本物のタイポは依然として発火します）;ルールは依然としてデフォルトでオフで出荷されます。評価が、クラスごとのスキャンが列挙できないさらなる偽陽性クラス（C拡張とメタプログラムされたサーフェス）を見つけたためです。
- **[sig-gen]** `rigor sig-gen --write`が、ソースがコンパクトパスの`class`（`class Foo::Bar`）を宣言する箇所で、もはや`module`ラッパーを出力しなくなりました。これは`class` / `module`の衝突で、`RBS::DuplicatedDeclarationError`でRBS環境の構築全体を中止させていました。
  - ライターは今や、グループ化する前に、各候補のファイル単位の名前空間種別マップを1つのラン単位のビューへ折り込むので、他所で記録された権威ある`class Foo`がラッパーのキーワードを統治します。`parser` gemを掃引する2026-06-16の保護アップリフトのパイロットで表面化しました。
- **[cli]** `rigor explain call.unresolved-toplevel`が今や解決します——[ADR-34](../docs/adr/34-toplevel-unresolved-self-call-default/)のルールが、v0.1.14以来ライブであるにもかかわらずカタログから欠落していました——そして完全性スペックが今や、すべてのルールがカタログエントリーを持つことをアサートします。
- **[packaging]** Dockerのビルドコンテキスト無視ファイルが、リポジトリ全体の`.dockerignore`ではなくDockerfile（`Dockerfile.dockerignore`）にスコープされたので、BuildKitの`--build-context`経由でrigorソースを埋め込む外部ツールが、もはや空のコンテキストを得ることはありません。

[0.2.9]: https://github.com/rigortype/rigor/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/rigortype/rigor/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/rigortype/rigor/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/rigortype/rigor/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/rigortype/rigor/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/rigortype/rigor/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/rigortype/rigor/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/rigortype/rigor/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/rigortype/rigor/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/rigortype/rigor/compare/v0.1.19...v0.2.0
