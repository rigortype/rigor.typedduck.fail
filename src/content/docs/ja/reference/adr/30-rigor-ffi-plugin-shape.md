---
title: "ADR-30 — `rigor-ffi`プラグインの形状"
description: "rigortype/rigor docs/adr/30-rigor-ffi-plugin-shape.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/30-rigor-ffi-plugin-shape.md"
sourcePath: "docs/adr/30-rigor-ffi-plugin-shape.md"
sourceSha: "c132cd02b7f4dd3230d3b597dabb8d020b9e1344f639ec6638d457d639a81caf"
sourceCommit: "1881619b60b29439a03e7a1f8fee266031c9ca10"
translationStatus: "translated"
sidebar:
  order: 4030
---

ステータス: **提案済み、2026-05-25**。ネイティブライブラリを`ffi` gemでラップするRuby gemに共通の`ffi`マシナリーをカバーするコア`rigor-ffi`プラグインと、ライブラリごとのサブプラグインファミリー（`rigor-rbnacl`、`rigor-ethon`、`rigor-ffi-rzmq`、`rigor-sassc`）を出荷し、同じコアがtenderloveの`ffx` gem（インストール時にCエクステンションにトランスパイルする厳格なFFIサブセット）をターゲットにするプロジェクトにも対応できる境界を設けるという決定を記録する。

根拠となるサーベイは[`docs/notes/20260525-ffi-library-survey.md`](../../notes/20260525-ffi-library-survey/)にある（5つの実`ffi`消費者 + tenderloveの4リポジトリ補遺）。

## コンテキスト

[`ffi`](https://github.com/ffi/ffi) gem経由でネイティブライブラリをラップするRuby gemはRigorにとって繰り返す不透明性の壁を作る:

- `attach_function :name, [arg_types], ret_type`はロード時にモジュールメソッドを登録する。バインドされたメソッドは存在するが、そのRBS相当のシグネチャは呼び出しサイトでRubyのシンボル配列としてのみエンコードされている。
- `FFI::Pointer`、`FFI::MemoryPointer`、`FFI::AutoPointer`、`FFI::Struct`、`FFI::Union`、`FFI::Function`などがクロスバウンダリのデータを運ぶ。これらはいずれも今日のRigorの語彙でファーストクラスの型ではない。
- `ethon`（libcurl）、`rbnacl`（libsodium）、`sassc-ruby`（libsass）のようなgemのユーザー向けAPIは、`attach_function`バインドされたプリミティブの上に構築されたRubyクラスレイヤーだ。バインディングシグネチャがなければ、高レベルメソッドはエンドツーエンドで`Dynamic[Top]`として型付けされる。

5ライブラリサーベイ + tenderlove補遺が非自明な軸を特定した:

1. **バインディングスタイル分類**。リテラルの`attach_function`（sassc-ruby、ethon、ffxターゲット）vsそれをラップするカスタムDSL（rbnaclの`sodium_function`が`module_eval`に補間）vs別gemで宣言されたバインディング（ffi-rzmq → ffi-rzmq-core）。
2. **ライブラリごとの生成サーフェス（surface）**。ethonはオプションカタログを反復して各セッターを`define_method`する;sassc-rubyは`sass_`プレフィックスを取り除くために`attach_function`をオーバーライドする。
3. **名前付き不透明ポインターとしての`typedef`**。sassc-rubyは10個の`typedef :pointer, :sass_*_ptr`エイリアスを宣言する;それらを別個の`Nominal`型として扱うと実際のクロスコンテキスト誤用を捕捉できるが、常にnominalにするとドキュメント目的だけのtypedefを使うgemで偽陽性が出るリスクがある。
4. **`ffx`ターゲット**。ffxは`ffi` gemと同じDSLサーフェスを公開するが25シンボルのプリミティブ型セットのみを受け付ける（コールバック、struct、typedef、enum、varargs不可）。インストール時に本物のCエクステンションにトランスパイルし、ZJIT消費のため各トランポリンに`FFI0`マジックマークのメタデータブロブを埋め込む。
5. **`Fiddle`の隣接**。RubyのStdlibの`Fiddle`は並行するFFIメカニズム（sqliteffxがアウトパラメーター読み取りに使用）。そのバインディングサーフェスは`ffi` gemのものとかなり異なる。
6. **「FFIなし」の否定ケース**。`childprocess`はFFIを一切使わない——RubyのProcess / IOに依存する。プラグインは検出されたFFIバインディングコードを根拠に有効化すべきで、「ローレベルに見える」ことを根拠にしてはならない。

補遺の主要な発見は本質的に好ニュース: ffxのDSLは`ffi` gemのものとビット同一（かつ厳密に小さい）ので、`ffi` gemをカバーするレコグナイザーはffxターゲットコードを無料でカバーする——さらに、gem installビルドが失敗する前にffx非互換な宣言を静的診断として表面化できる機会もある。

正直な需要の絵は、エンジニアリングサーフェスが示唆するより弱い。sassc-rubyは事実上EOL（libsassが2020年に上流で廃止）;typhoeus / ethonとrbnaclは実態があるが専門化したユーザーベース;ffi-rzmqはニッチ。4つの候補サブプラグインはどれも例えば`rigor-activerecord`のユーザー引力を持たない。実装の根拠は代わりに**2つのゼロオーバーヘッドプロパティ**にある:

- サブプラグインは`plugins/`に同梱され、解析されたプロジェクトの解決済み依存セットにマッチするgemが現れたときにのみ有効化される——非ユーザーはゼロのアナライザーコストを払う。
- コアFFIキャリア（carrier）型（`FFI::Pointer`、`FFI::MemoryPointer`、`FFI::Struct`）はサーベイコーパス全体で名前で参照されている;それらをコア`rigor-ffi`でモデル化することで、FFIに偶発的に触れるすべてのプロジェクト（4つの作業消費者だけでなく）を底上げする。

この組み合わせ——非ユーザーへのオーバーヘッドなしの付加的カバレッジ——は直接需要が弱いにもかかわらず積極的な実装を正当化する（WD9）。

## 決定

**コア`rigor-ffi`プラグイン + ライブラリごとのサブプラグインファミリー**を出荷する。[ADR-12](../12-dry-rb-packaging/) / [ADR-25](../25-plugin-contributed-rbs/)のパッケージング形状はdry-rbとRailsプラグインラインですでに実証済み。コアは共通の`ffi`マシナリーをカバーし、`ffi` gemターゲットと`ffx`ターゲットの両プロジェクトを変更なしに対応する。ライブラリごとのサブプラグインはDSLレコグナイザー、オプションカタログ→セッターマッピング、高レベルAPI RBS精緻化を貢献する。

## Working decisions

### WD1 — プラグイン形状: コア + ライブラリごとのサブプラグイン

コア`rigor-ffi`プラグインが所有するもの:

- `extend FFI::Library`認識（ホストモジュールがバインディングレジストリになる）;
- 25のプリミティブ型シンボル + `:varargs` + カスタムtypedef参照によるリテラル`attach_function`ウォーク;
- `callback`、`typedef`、`enum`、`bitmask`認識;
- `FFI::Struct`、`FFI::Union`、`FFI::ManagedStruct`の`layout`ウォーク;
- `FFI::Pointer`、`FFI::MemoryPointer`、`FFI::Buffer`、`FFI::AutoPointer`、`FFI::Function`、`FFI::Struct`ベース向けRBS;
- 呼び出し境界でのString ↔ `:pointer` / `:string`オートコーション（WD7）;
- typedef済みポインターのnominal型ヒューリスティック（WD4）;
- ffxターゲット診断ファミリー（WD5）と検出（WD6）。

ライブラリごとのサブプラグイン（`rigor-rbnacl`、`rigor-ethon`、`rigor-ffi-rzmq`、`rigor-sassc`）が所有するもの:

- 1つのgemに特有のDSLレコグナイザー（`sodium_function`、ethonのオプションカタログディスパッチ、sassc-rubyのプレフィックスストリップオーバーライド）;
- 高レベルAPI RBS精緻化（`SecretBox#encrypt: (String, String) -> String`、`Easy#perform: () -> Integer`）;
- クロスgemシグネチャ取得（ffi-rzmq → ffi-rzmq-core）。

**却下された代替案**。モノリシックな単一`rigor-ffi`（すべてのライブラリのレコグナイザーを常にロード）はRailsプラグインパッケージング規律のすでに支払われたコストを失い、非ユーザーにブートコストを強いる。コアなしの各gemフル自律形状は共通マシナリーのメンテナンスを分散させ、キャリアRBSを重複させる。

### WD2 — DSLレコグナイザーの配置: コアの拡張ポイント

コアが`Plugin::FFI::BindingRecognizer`拡張ポイントを公開する。サブプラグインがレコグナイザーを登録し、そのレコグナイザーはASTノードを受け取り、ゼロ個以上の合成された`attach_function`ファクト（fact）を返す。コアはそれらのファクトをリテラルの`attach_function`呼び出しを処理するのと同じパイプラインで処理する——サブプラグインは並行した型付けパイプラインではなく*レコグナイザー*を貢献する。

フェーズ2（先送り）: [ADR-16](../16-macro-expansion/) Tier Cが宣言的変換モードを出荷したら、`sodium_function`レコグナイザーはTier-Cマニフェスト宣言に移行する。拡張ポイントはTier Cにきれいに収まらない形状のために残る。

**却下された代替案**。コアがリテラル`attach_function`のみを処理し、各サブプラグインが自分でASTをウォークする: 各サブプラグインがバインディングファクト放出のボイラープレートを再実装することになる。拡張ポイントを完全にスキップしてすべてのDSL認識をADR-16経由でルーティングする: Tier Cの先送りされた形状への依存を強制し、このADRの納品をADR-16に結合させる。

### WD3 — クロスgemシグネチャ取得: [ADR-10](../10-dependency-source-inference/)に先送り

ffi-rzmqの`attach_function`呼び出しは別の`ffi-rzmq-core` gemに存在する。解決パスはADR-10のオプトインの依存関係ソース推論: プロジェクトが`ffi-rzmq`を使う場合、rigorは依存関係ソースティア下で`ffi-rzmq-core`のソースをウォークし、`LibZMQ.*`シグネチャを貢献する。

**却下された代替案**。`LibZMQ`向けのプラグイン提供バンドルRBS（[ADR-25](../25-plugin-contributed-rbs/)）— FP規律の面で好ましいが、`ffi-rzmq-core`に対して手書き + バージョンごとのメンテナンスが必要。ffi-rzmqは最も需要の低い作業消費者（WD9）でありADR-10が一般的な「FFIバインディングが兄弟gemにある」問題への長期的に正しい答えなので、ADR-10への先送りが安価なパス。ADR-10の進捗が止まりffi-rzmqサポートが具体的なユーザーの要求になった場合、ADR-25はフォールバックとして利用可能。

### WD4 — typedef済み不透明ポインター: 名前ヒューリスティックのnominal型

`typedef :pointer, :alias_name`呼び出しが`Nominal[<plugin>::<AliasName>]`型を貢献する**のは**、`alias_name`が慣例的な不透明ポインター命名パターン（エイリアスシンボルへの`_ptr$` / `_handle$` / `Ptr$` / `Handle$`正規表現）にマッチするときのみ。そうでなければtypedefは`:pointer`の透明エイリアスとして扱われる。

nominalキャリアは[ロバストネス原則](../../type-specification/robustness-principle/)を尊重する:

- **入力** — nominalエイリアスとして宣言されたパラメーターは`Nominal[<alias>] | FFI::Pointer | Integer | nil`を受け付ける（後2つはより広いFFIキャリア;`Integer`はWD7に従いffxケースをカバー）。
- **戻り値** — nominalエイリアスとして宣言された戻り型は厳密な`Nominal[<alias>]`のまま。

プロジェクトごとの`.rigor.yml`例外リスト（`rigor_ffi: { nominal_typedef_exceptions: ["log_target_ptr"] }`）でプロジェクトがヒューリスティックが誤発火した場合にtypedefを透明に戻せる。

**却下された代替案**。常にnominal: 精度最大だがドキュメントのみの目的でtypedefを使うgemでFP発生リスク。`typedef`呼び出し自体へのオプトインキーワード: `ffi` gemの呼び出し形状を変更する必要があり、それはrigorが越えられないAPI境界を越えることになる。

### WD5 — ffxターゲット: 新しい診断ファミリー`ffx.unsupported-*`

ffxターゲットが検出されたとき（WD6）、コアプラグインがffxがコンパイルを拒否するバインディング宣言の新しい診断ファミリーを表面化する:

- `ffx.unsupported-callback` — `callback :foo, [...], :int`
- `ffx.unsupported-struct` — `class S < FFI::Struct`
- `ffx.unsupported-typedef` — `typedef :pointer, :handle`
- `ffx.unsupported-enum` / `-bitmask` — `enum :state, [...]`
- `ffx.unsupported-varargs` — `attach_function :printf, [:string, :varargs], :int`
- `ffx.unsupported-type` — ffx-25プリミティブセット外の型シンボル

この診断は**構造上偽陽性がゼロ**: それが表面化するすべての宣言は、ffxがgem installビルド時に翻訳に失敗するものだ。これはまさに[偽陽性規律](../../type-specification/overview/#false-positive-discipline)が明示的に招く種類の付加的ゼロFPリスク診断: ランタイムのビルド失敗を静的lintに移す。

重要度はデフォルト`:error`（ffxはビルドに失敗する）;ffxターゲットかどうかが条件付きのデュアルターゲットバインディングファイルを意図的にメンテナンスするプロジェクトは宣言ごとに`# rigor:disable ffx.unsupported-*`で抑制できる。

### WD6 — ffxターゲット検出: まず`extconf.rb`スキャン

ffx検出は3つのソースをトップダウンでカスケードする:

1. **プロジェクト`extconf.rb`スキャン**。いずれかの`ext/**/extconf.rb`にリテラルの`FFX.create_makefile`呼び出しが含まれれば、プロジェクトをffxターゲットとみなす。バンドラー依存なしの単一ファイルチェックで、標準的なsqliteffxパターンを処理する。
2. **`Gemfile.lock`依存スキャン**。`ffx`が解決済み依存として現れれば、プロジェクトをffxターゲットとみなす。`BundleSigDiscovery`（v0.1.5）にすでに存在するバンドラー解析パスを再利用する。
3. **明示的設定**。`.rigor.yml`で`rigor_ffi: { target: ffx }`を設定して検出を強制できる。最終手段、`extconf.rb`も`Gemfile.lock`も信頼できない環境のために存在する。

検出結果はプロジェクトコンテキストレベルでキャッシュされる（ADR-6のキャッシュ無効化ルールに従い、関連入力ファイルが変更されたときにクリアされる）。

**却下された代替案**。バンドラーファースト検出: 動作するが`extconf.rb`がすでにクリーンな答えを出すケースでバンドラー内部に結合する。明示的のみ: セットアップ摩擦が機会的検出のゼロFPコストを上回る。

### WD7 — `:pointer`パラメーター入力セットを全面的に拡大

`attach_function`バインドされたメソッドの`:pointer`型パラメーターは`FFI::Pointer | FFI::MemoryPointer | FFI::AutoPointer | FFI::Buffer | Integer | String | nil`を受け付ける、**ターゲット**（ffi gemまたはffx）**に関係なく**。

根拠: サーベイコーパスはこれらのキャリアをそれぞれ渡す実世界の呼び出し元を示している——sqliteffxが`Integer`（Fiddle経由で読んだ生アドレス）を渡し、rbnaclが`String`（バイナリエンコードされたバッファ）を渡し、ethonが`FFI::AutoPointer`（ライフサイクル管理されたハンドル）を渡し、sassc-rubyが`FFI::MemoryPointer.from_string`の結果を渡す。ロバストネス原則の「入力には寛容に」という行は、パラメーター型が実際の呼び出し元が渡すものの和集合であるべきと言う;実行時の拒否（`ffi` gemは生の`Integer`を拒否する）はruntime concernであり、rigorのconcernではない。

戻り型はターゲット依存のまま: `ffi` gemターゲットは`FFI::Pointer`、ffxターゲットは`Integer`。戻り型は非対称の「出力は厳密に」サイド。

**却下された代替案**。ターゲット依存の入力ナローイング（narrowing）（ffi gem: `FFI::Pointer | nil`;ffx: `Integer | nil`）: デュアルターゲットバインディングファイルがチェック不能になる;正当なクロスキャリアコードでFP。

### WD8 — スコープ外

以下は意図的に`rigor-ffi`から除外されている。各々に他の場所（既存または将来）に適した居場所がある。

| 項目 | 理由 |
| --- | --- |
| FFIハンドルのuse-after-free / double-free / リーク診断 | エフェクトトラッキング領域であり型の問題ではない。将来の`rigor-resource`プラグイン（またはエンジン側のエフェクト解析）が適切な場所。 |
| `FFI::Struct`フィールドアクセスの境界チェック | 配列インデックスフロー解析はエンジン作業であり、FFI固有ではない。 |
| ネイティブ側のコンパイル正確性（sassc-rubyの`ext/libsass`ビルド、ffxの生成C） | Rigorはrubyを解析する;ネイティブビルドの正確性はgemの作者 / mkmfの問題。 |
| `fisk` / `aarch64` / `JITBuffer` | FFIバインディングサーフェスのない純Rubyの命令エンコーダー。エンドユーザーのコードはこれらのシンボルを参照しない。需要があれば将来の`rigor-jit`領域。 |
| 手書きCエクステンション（`ext/*.c`内の`rb_define_method`） | Ruby側の静的なハンドルなし。カバレッジには`.so`の解析が必要——ffxトランポリン`FFI0`ブロブ解析が着地するまでスコープ外。 |
| `Fiddle` | 実質的に異なるDSLを持つ並行のStdlib FFIメカニズム。別途著作される兄弟`rigor-fiddle`プラグインに属する。 |

### WD9 — 実装は非ユーザーへのゼロオーバーヘッドで正当化され、直接需要ではない

4つの候補サブプラグイン各々への直接ユーザー需要は正直に弱い。sassc-rubyは事実上EOL（libsassが2020年に上流で廃止）;typhoeus / ethonは実態があるが低下傾向のHTTPクライアントシェア;rbnaclはクリプト重視のスタックに専門化;ffi-rzmqはニッチ。いずれもRailsティアプラグインのユーザーベーススケールには達しない。

それでも実装を進める理由:

- **非ユーザーごとのコストはゼロ**。サブプラグインは解決済み依存セットにマッチするgemが現れたときにのみ有効化される;`rbnacl`を一度も`require`しないプロジェクトは`rigor-rbnacl`のレコグナイザーのアナライザーコストを払わない。
- **コア`rigor-ffi`はすべての偶発的FFIユーザーを底上げする**。コアで`FFI::Pointer`、`FFI::MemoryPointer`、`FFI::Struct`をモデル化することで、4つの作業消費者だけでなくFFIキャリアに触れるすべてのプロジェクトを助ける。コアの恩恵はサブプラグインの恩恵が狭くても広い。
- **実装経験それ自体が出力**。DSLレコグナイザー拡張ポイント（WD2）、typedef-nominalヒューリスティック（WD4）、ffx診断ファミリー（WD5/6）はどれもプラグイン契約（contract）の新しい形状だ。実際の作業消費者がv0.2.0に向けて契約サーフェスが安定する前にストレステストする。

これはdry-rbプラグインファミリーを現在の幅に正当化するのと同じ論理: 個別の需要が低く、非ユーザーへのオーバーヘッドなく、広いインフラ恩恵がある。

### WD10 — カバレッジスコープ + 著作パス

4つの作業消費者の先には2つの異なるgemポピュレーションが存在する: Rigorが対応すべき実世界のFFI gem、および外部ユーザーが著作するかもしれない内部 / プライベートFFI gem。このWDはコア`rigor-ffi`から何を得るかvsサブプラグインを必要とするものは何かを記録し、後者を[ADR-31](../31-contribution-and-supply-chain-policy/)で定義されたプロジェクト全体の貢献ポリシーを通じてルーティングする。

**「バニラ」FFI gemに対するコア`rigor-ffi`のカバレッジスコープ**。

（a）自身の`lib/`でリテラルの`attach_function`呼び出しでバインディングを宣言し、（b）プリミティブ型シンボル + `callback` / `typedef` / `enum` / `bitmask` / `FFI::Struct`を使用し、（c）バインドされたメソッドを薄いRubyクラスレイヤーでラップするFFI gemの場合、サブプラグインなしにコアが型付けサーフェスの大部分をカバーする:

| サーフェス | コアカバレッジ |
| --- | --- |
| `attach_function`バインドメソッドシグネチャ | 完全（リテラルウォーク） |
| FFIキャリア型（`Pointer` / `MemoryPointer` / `Struct` / `Function`） | 完全（コアのRBS） |
| `layout`経由のStructフィールドアクセス | 完全（リテラルウォーク） |
| Enum値セットとシンボル→整数マッピング | 完全（リテラルウォーク） |
| コールバックパラメーター / 戻り型 | 完全（`callback` typedefウォーク） |
| typedef済み不透明ポインターエイリアス | ヒューリスティック（WD4）;例外リスト利用可 |
| FFIキャリアを返す薄いラッパークラスの`def` | 完全（通常の推論がキャリアを伝播） |
| FFIプリミティブの戻り型より**リッチなセマンティクス**を持つラッパークラスメソッド | 非対応——サブプラグインのRBS精緻化が必要 |
| `attach_function`をラップするカスタムDSL（rbnacl形式の`sodium_function`） | 非対応——WD2の`BindingRecognizer`登録が必要 |
| 兄弟gemで宣言されたバインディング（ffi-rzmq-coreスタイル） | 非対応——WD3（ADR-10）またはバンドルRBS（ADR-25）が必要 |
| オプションカタログ駆動の`define_method`（ethon形式） | 非対応——ADR-16 Tier B/Cの認識が必要 |

具体的には: リテラルの`attach_function :acme_open, [:string], :pointer`を宣言してそれを`class MyCorp::Acme; def initialize(path); @handle = LibAcme.acme_open(path); end; end`にラップする内部`MyCorp::LibAcme` gemはコアのみで完全な型付けを得る。プロジェクトの`.rigor.yml`は依存関係ソース推論スコープ（ADR-10）内にバインディングファイルが入るよう`dependencies:`下にgemを列挙するだけでよい。

**「サブプラグインが必要な」ケースの著作パス**。

新しいSKILL — `rigor-ffi-plugin-author`（[`.claude/skills/rigor-ffi-plugin-author/SKILL.md`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-ffi-plugin-author/SKILL.md)に配置）— 著作者を以下のステップでガイドする:

1. **上のテーブルに対するカバレッジ評価**。gemが「バニラ」パターンにマッチすれば、SKILLは「プラグイン不要——依存関係を宣言して終わり」で終了する。これは重要: SKILLは、コアで十分なときはプラグインを著作しないようにユーザーを*説得すべき*で、プラグインエコシステムを健全に保つ。
2. **ADR-31に従った著作パス** — ユーザー自身のリポジトリでサードパーティの`rigor-<gem>` gemとして著作し（ADR-31 WD4）、gemがWD3のコミュニティ認知閾値に達したらWD2の昇格ルートを通じてバンドルを任意で提案する。
3. **スキャフォールド** — ディレクトリレイアウト + specレイアウト + CHANGELOGルールのための一般的な[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/master/.claude/skills/rigor-plugin-author/SKILL.md) SKILLを参照（手続き形状はgemタイプに依存しない）。
4. **FFI固有のビット** — `Plugin::FFI::BindingRecognizer`登録（WD2）、オプションの高レベルラッパーRBS、バインディング認識とラッパークラス型付けの両方を検証するデモフィクスチャ**。ラップされたgemのバージョンレンジをプラグインのgemspecにピン留めする**;新しいラップgemバージョンはリポジトリ内のプラグインを更新することで追跡する（孤立プラグインリスクはADR-31 WD4に従いプラグイン著作者の責任）。

SKILLの手続きFFI固有コンテンツ（ステップ4）は最初は概略で、スライス（slice）1（コアMVP）が出荷されてスライス2（sassc-ruby）が最初の具体的なリファレンス実装を提供するにつれて権威的になる。

**配布ガバナンス: [ADR-31](../31-contribution-and-supply-chain-policy/)を参照**。

プロジェクト全体のポリシーが適用される——マイナーな焦点を絞った変更（例: すでにバンドルされたFFIサブプラグインへのバグFix）はダイレクトPRとして歓迎（WD1ダイレクトPRパス）;**新しい**バンドルFFIサブプラグインは広範な変更であり、issue-firstルート（WD1 + WD2）を経由し、チームで著作した実装に`Co-authored-by:`アトリビューションを付ける;サードパーティの`rigor-<gem>`プラグイン著作は著作者自身のリポジトリで歓迎（WD4）;実証されたサードパーティプラグインのsubtreeマージはオプションパスとして予約（WD5）。このADRはポリシーを再述しない;FFIプラグインファミリーはそれが統治するいくつかのプラグインファミリーのひとつ。

## 実装スライシング

6スライス、概略。このADRではいずれのスライスもスケジュールされていない。スライス順序は需要重み付けではなく工学的進行駆動（最も単純なケースからコアを検証）。

| スライス | スコープ |
| --- | --- |
| 1 | **コアMVP**。`extend FFI::Library`認識。25のプリミティブ型シンボルによるリテラル`attach_function`ウォーク。`ffi_lib`。`FFI::Pointer`、`FFI::MemoryPointer`、`FFI::AutoPointer`、`FFI::Function`、`FFI::Struct`ベース向けRBS。WD7のポインターパラメーター幅広げ。DSLレコグナイザー拡張ポイントはまだなし。 |
| 2 | **`rigor-sassc`消費者（経験構築）**。最初の実消費者。WD4のtypedef-nominalヒューリスティックを検証（sassc-rubyはコーパスの最も単純なケース）。`FFI::Struct`の`layout`ウォーク（`SassValue`タグ付きユニオン）+ `enum`認識（`SassOutputStyle`）を実行。低実需認識（sassc-ruby EOL）——スライスの価値はコア検証であり、ユーザー影響ではない。 |
| 3 | **`rigor-ethon`消費者**。ADR-16フレーバーの作業への最初の接触: オプションカタログ（`Curl::Options.easy_options`）が`define_method`生成セッターを駆動する。カタログモジュール向けのTier Bトレイトインライニング + セッター形状のTier Cヘレドックテンプレートを消費する可能性が高い。ADR-16が実際の`define_method`ファームをどの程度クリーンにカバーするかをテストする。 |
| 4 | **`rigor-rbnacl`消費者 + WD2拡張ポイント**。`BindingRecognizer`拡張ポイントがここで着地し、`sodium_function`認識（補間ヘレドック——コーパスで最も困難なバインディング回収形状）によって駆動される。 |
| 5 | **WD5+WD6 ffxターゲット**。`extconf.rb` / `Gemfile.lock`検出。6つの`ffx.unsupported-*`診断。`sqliteffx`を検証消費者として使用（`sqliteffx.rb`内のすべての宣言はffx互換;診断は構築した反例フィクスチャにのみ発火すべき）。 |
| 6 | **`rigor-ffi-rzmq`消費者**。[ADR-10](../10-dependency-source-inference/)の依存関係ソース推論がメソッドレベルシグネチャを貢献できることにゲートされる（呼び出しサイトごとの戻り型精度はADR-10の将来サイクルバックログ）。最低優先度——ADR-10が進展するか具体的なユーザー要求が現れるまで先送り。 |

## 結果

- **コアはffxを無料で処理する**。ffxのDSLは`ffi` gemのものの厳密なサブセットなので、コア`rigor-ffi`はffxターゲットプロジェクトをffx固有のレコグナイザーなしでカバーする。ffx固有の作業は付加的なWD5+WD6診断ファミリーのみ。
- **`Plugin::FFI::BindingRecognizer`は負荷を担うアーキテクチャ上のコミットメント**。この拡張ポイントは[ADR-13](../13-typenode-resolver-plugin/)のTypeNodeリゾルバーチェーンと同じ形状問題ファミリー——プラグイン提供レコグナイザーのレジストリで、その出力が共通エンジンパイプラインに流れる。個別のサブプラグインを出荷することよりもそのサーフェスを正しく取得することの方が重要。
- **実装順序は工学的進行駆動**。sassc-rubyが最初なのはそれが最も需要の高いgemだからではなく、最も単純なケースだから。「なぜEOLのgemを最初にモデル化しているのか」という批判への反論者にはWD9を指摘できる。
- **`rigor-fiddle`は別の取り組み**。FiddleのDSLサーフェスは十分に異なる（`extend FFI::Library`なし、`attach_function`なし;`Fiddle::Function.new`、`Fiddle::Pointer`、`dlopen`を使用）ため、共有インフラが薄くなる。独立して著作された兄弟プラグインがより単純な形状。このADRでブロックされない。

## オープンクエスチョン

- **二次シグネチャソースとしての`FFI0`トランポリンメタデータの解析**。ffxは各生成トランポリンに`(magic | param_count | type_bytes | function_name)`を埋め込む。Rubyバインディングファイルが隠れている（ベンダーブロブ、カスタムラッパー）が`.so`が存在するインストール済みgemに対して、トランポリンの解析でバイナリからシグネチャが回収できる。初期プラグインのスコープ外（ELF / Mach-O / PE認識が必要）だが、具体的な消費者がそれを必要としたら再検討に値する。
- **デュアルターゲットgem**。サーベイされたgemはffi-gemとffxコードパスを条件付きで出荷していない。実際のデュアルターゲットgemが現れた場合、WD5の宣言ごとの抑制をエルゴノミクスのためにレビューしなければならない（おそらく問題ない——`# rigor:disable`が既存の宣言ごとのメカニズム）。
- **ethonの`easy_setopt`内の呼び出しサイトごとのvarargs型付け**。`[:pointer, :easy_option, :varargs]`シグネチャは外部のオプションカタログを通じてenum値でvarargs型をディスパッチする。現在の決定ではコアではなく*サブプラグイン*（スライス3）でこれをモデル化する——varargs-dispatched-by-enumはサブプラグインが存在する種類の形状。同じパターンを持つ2番目のgemがメカニズムをコアに昇格させることを正当化したら注目する。
- **`ffx.unsupported-*`の診断ID安定性**。WD5の6つのIDがフロア。7番目の追加（例: `ffx.unsupported-blocking-call`）は付加的で安全;6つのいずれかの名前変更はベースライン（baseline）を持つプロジェクトにとって破壊的変更。最初のリリースで6つをロック。
