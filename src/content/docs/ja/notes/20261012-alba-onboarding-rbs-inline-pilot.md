---
title: "alba オンボーディングと rbs-inline パイロット — 手書き `sig/` プロジェクトでの sig-gen / inline 統合の実地観測"
description: "Imported from rigortype/rigor docs/notes/20261012-alba-onboarding-rbs-inline-pilot.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20261012-alba-onboarding-rbs-inline-pilot.md"
sourcePath: "docs/notes/20261012-alba-onboarding-rbs-inline-pilot.md"
sourceSha: "723c1b76248598474b2da6a3dafc124d38f7cf92a7afa17d088f4573d0b930fe"
sourceCommit: "2e694082a9cbec0251e3d21f1c1b477e8549d14c"
sourceDate: "2026-10-12T04:51:28+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20267012
---

Date: 2026-10-12.

Status: **research note, no design commitments.**観測対象のRigorは**0.4.2**（mise
`gem:rigortype@0.4.2`）。対象は[alba](https://github.com/okuramasafumi/alba)（JSONシリア
ライザgem、`required_ruby_version >= 3.0.0`、**手書きRBS `sig/`をコミット・Steep用・gemに
同梱**）。本ノートは2026-10-11〜12のセッションで起きたことを時系列で記録する:
インストール → `rigor-project-init`オンボーディング → sig-gen試行（失敗→復元）→ 手動型精密化
→ YARD→rbs-inlineパイロット（方式Aで機械を検証し、方式Bを全体方針に決定）。コード本体の
変更は無い（コメントとRBSのみ）。

---

## 1. インストール（miseチャネル）で起きた3つのこと

実行環境: macOS arm64、Homebrew `ruby 4.0.7`（PATH先頭）+ mise管理`ruby 4.0.6`
（`mise use -g ruby=4.0.6`済み）。既存のrigorはmise管理`0.4.0`。

### 1a. 非対話シェルではPATHが古いまま

`mise use --pin gem:rigortype@0.4.2`直後、同一セッションの`rigor --version`は`0.4.0`の
まま。`mise which rigor`は`0.4.2`を解決しており、`eval "$(mise hook-env)"`でPATH更新 →
`0.4.2`。install.md Step 3の既知の王道ケース。

### 1b. `minimum_release_age` quarantine

RubyGems `latest.json`は`0.4.2`、`mise latest gem:rigortype`は`0.4.1`。`mise ls-remote`
がstderrに`1 newer gem:rigortype release hidden by minimum_release_age`。
`mise settings get minimum_release_age`は未設定（＝mise既定値）だったため、install.mdの
規定どおり`<LATEST>`を明示指定でインストール。ドキュメントされた挙動どおり。

### 1c. **rbsネイティブ拡張のlibruby不一致**（主発見1）

**症状**: `rigor --version`は動くが、分析コマンド（`rigor triage` / `rigor check`）が即クラッシュ。

```
dlopen(.../gem-rigortype/0.4.2/libexec/gems/rbs-4.2.0/lib/rbs_extension.bundle, 0x0009):
Library not loaded: /opt/homebrew/opt/ruby@4.0/lib/libruby.4.0.dylib (LoadError)
```

**原因**: `otool -L rbs_extension.bundle`が`/opt/homebrew/opt/ruby@4.0/lib/libruby.4.0.dylib`
（**現存しないHomebrew keg**）を指すことを確認。miseのgemバックエンドは`gem install`を
**実行時点のPATH先頭のruby**（＝Homebrew 4.0.7）でネイティブ拡張をビルドするが、実行時は
`installs/ruby/4.0.6/bin/ruby`（miseランタイム）がbundleをdlopenする。`--version`はRBSを
ロードしないので締め出しに気づかない。

**修復**: `eval "$(mise hook-env)"`（mise rubyがPATH先頭）→ `mise install --force
gem:rigortype@0.4.2`。rbsを含む全gemがmise ruby 4.0.6向けに再コンパイルされ、
`otool -L`は`installs/ruby/4.0.6/lib/libruby.4.0.dylib`を指すようになり、triageが通った。

**位置づけ**: [20260717-install-channel-evaluation.md](../20260717-install-channel-evaluation/) §1
の「別のRubyでビルドされたネイティブ拡張」クラス（脚注`linked to incompatible libruby`）の
**新実例**。今回はグローバルgem混在ではなく**mise gemバックエンド自身**がPATH先頭の
Homebrew rubyでビルドしてしまうケース。install.mdに「miseで再インストールする際はhook-env後に
PATH先頭をmise rubyにしてから」と書く価値がある。

## 2. オンボーディング結果 — 診断0、baseline空

- **スタック検出**: plain Rubyライブラリ（`railties`/`activesupport`は`require: false`の
  テスト・任意連携用）。手書き`sig/`があるためPhase 5のsig生成はスキップ。
- **モード**: Acknowledge（`severity_profile`は既定`balanced`）。**プラグイン**: なし
  （カタログに`rigor-alba`を発見したが、これはalbaを*使う*アプリ向けで本gemの開発では
  `sig/alba/*.rbs`と重複するため不使用）。
- **target_ruby**: `"3.3"`（gemspec `>= 3.0.0` → Prism最小3.3判定表）。
- **triage / check**: `total: 0`。hints無し、plugin `load-error`なし。`rigor sig-gen
  --format json`の`new_method: 0`から、手書きsig/ が全メソッドを宣言済みで診断0が本物と
  確認。
- **baseline**: 空（`ignored: []`）。未来の診断は全て新規＝リグレッションのゲート。
- **AGENTS.md**: `rigor-type-oracle`のcanonical断片（`references/02-agents-md-fragment.md`）
  を逐語追記。`CLAUDE.md` / `.cursorrules`はAGENTS.mdへのsymlinkのため1箇所で足りる。

## 3. sig-gen試行 — 手書き`sig/`への`--write --overwrite`は非破壊でない（主発見2）

ユーザー依頼で`rigor sig-gen --params=observed --write --overwrite lib`を実地試行（前提:
`sig/`はコミット済み・クリーンで復元可能）。**結果は失敗し`git checkout -- sig/`で復元**。

### 3a. classification

```
new_method: 0 / skipped: 37 (sig.skipped.untyped-return) / tighter_return: 20
```

### 3b. **跨ファイル重複宣言でRBSビルドが壊れる**

生成物は`sig/alba/resource.rbs`（+13）と`sig/alba/association.rbs`（+6）。後者に
`Alba.resource_class` / `Alba.register_type`等のmoduleレベル`self.`メソッド一式が出力された
が、これらは既存`sig/alba.rbs`に既に宣言されている。結果:

```
rbs.coverage.definition-build-failed: 3 RBS class definition(s) failed to build:
Alba, Alba::Resource::ClassMethods, Alba::Resource.
First failure: RBS::DuplicatedMethodDefinitionError on `::Alba.resource_class`.
Conflicting signature file(s): sig/alba.rbs, sig/alba/association.rbs, sig/alba/resource.rbs.
```

Rigorは壊れたクラスをKNOWN扱いで`Dynamic[top]`に落とすため、**診断は0のまま「静かに
カバレッジが減る」**。sig-genはmoduleの`self.`メソッドを「生成時に最初に触れたファイル」へ
出力し、既存の宣言場所（`sig/alba.rbs`）を考慮しない。**upstream報告候補**:
「既存RBSが同一メソッドを別ファイルに宣言している場合の重複出力回避」。

### 3c. 生成署名の質 — 戻り値は厳密化、引数は緩む

生成20件は戻り値を具体化する一方、**引数を`untyped`に広げる**（例: `association:
(Symbol | String, ?instance_proc?, ?source: Proc?, ...)` → `(untyped, ?untyped, ...)`）。
かつ手書き側の精密interface（`_ClassMethods`）をシャドウするモジュール内メソッドとして挿入される。
**ネットで精度が下がる**構成。

### 3d. artifact戻り値（ノイズの見分け方）

| パターン | 例 | 判別法 |
| --- | --- | --- |
| 末尾の代入式が返す値 | `root_key! -> true` / `stringify_keys! -> false`（YARDは`@return [void]`） | 末尾が`@ivar = literal` |
| `alias_method`の戻り値 | `prefer_resource_method! -> Symbol` | `alias_method`は別名を返す |
| `each`の戻り値 | `register_default_types -> Array[singleton(Integer) \| singleton(String)]` | 末尾が`.each` |
| 巨大union | `inherited -> Hash[Symbol, Array[...] \| ...]` | 複数ivar代入の合成 |

### 3e. 手動適用（5件 → 4件）と2つの追加教訓

`--diff`の20件から「戻り値が実質的な意味を持つ」5件を手書きsigに適用（パラメータは手書きを
維持）。検証は`bundle exec rake typecheck`（この時点ではbundleが壊れており実行不能）ではなく
`rigor check` + `rbs validate`のみだったが、**後日bundleが直ってSteepを回すと2件の事故が
発覚**した:

- **`reset_transform_keys -> Hash[untyped, untyped]`は撤回**: `inflector=`のようなsetterが
  `reset_transform_keys`を最終式にしているため、setter本体型が宣言型と不一致になり
  `Ruby::SetterBodyTypeMismatch`を誘発。**「artifact戻り値」はsetterには無害ではない** —
  呼び出し側が戻り値を捨てていても、setterの本体フローには流入する。
- **RBSのunion戻り型は括弧必須**: `-> Alba::Association | Alba::ConditionalAttribute`は
  rigortype同梱rbs 4.2.0の`rbs validate`は通るが、Steepのパーサーが
  `Syntax error: unexpected token for method type, token=Alba`と拒否。`-> (A | B)`にすると両方
  通る。**rbsバージョン間のパーサー差**（検証ツールを2本持つ価値）。

最終的に残った4件: `register_type -> Alba::Type`、`association -> (Alba::Association |
Alba::ConditionalAttribute)`、`nested_attribute -> (Alba::ConditionalAttribute |
Alba::NestedAttribute)`、`layout -> Alba::Layout`。**手書きsig/ を持つライブラリでは、sig-genは
`--diff` / `--format json`のレビュー面として使い、`--write --overwrite`は一括適用にしか使わない。**

## 4. 環境の復旧とブロックの解消

オンボーディング時点では`bundle exec rake typecheck` / `test`がbundlerのGitHubソースgem
（`rubocop-gem_dev`）未チェックアウトで解決失敗していた。**`bundle install`で解消**（79 gems、
steep 2.1.0）。副次効果として**`Gemfile.lock`が生成され**（gitignored）、Rigorが新たに
`rbs.coverage.missing-gem`（info、dev依存60 gemがRBS無し）を報告するようになった。
fail_onはerrorなのでゲートは無傷だが、ローカルでlockを持つ開発者にだけ出る騒音であり、
対応方針（`rbs collection install` / `dependencies.source_inference:` / info許容）は未定。

## 5. rbs-inlineパイロット（主発見3）— `lib/alba/type.rb`

YARD→rbs-inline移行の要望に対し、小さいファイルでパイプラインを検証。方式A（inlineを正とし
sig/ から該当メソッドを外す）で機械を確認した後、**全体方針は方式Bに決定**（下記 §6）。

### 5a. 実装

- `lib/alba/type.rb`に`# rbs_inline: enabled` + `# @rbs`メタ形式（`# @rbs name: T` /
  `# @rbs return: T`、属性は`attr_reader :name  #: T`の`#:`キャスト）。手書きsigの精密型
  （`name: Symbol | String | Class`等）に忠実に書く。
- `.rigor.dist.yml`に`plugins: [rigor-rbs-inline]`と`sig_gen.inline_declared: skip`。
- rigortype環境へ`rbs-inline 0.14.0`を導入（`mise exec gem:rigortype -- gem install rbs-inline`。

### 5b. 検証結果

| チェック | 結果 |
| --- | --- |
| `rigor plugins` | `rigor-rbs-inline` `[OK]`（`source_rbs_synthesizer: yes`） |
| inline強制のポジティブコントロール | 注釈を誤った型に → `def.ivar-write-mismatch`が発火（注釈がivar推論を汚染しcross-method矛盾を検出）。**注釈が契約として生きている**証明 |
| `bundle exec rake typecheck` | グリーン（rbs validate + Steep 2.1.0） |
| `bundle exec rake test` | 281 runs / 1400 assertions / 0 failures |

### 5c. Steepとの統合の落とし穴

- **`check "lib", inline: true`をlib全体に適用すると壊れる**: Steepのinline readerは
  **`# rbs_inline: enabled`マジックコメントを尊重せず**、対象の全ファイルの定数・メソッドを
  宣言する。手書きsig/ と定数が重複（`VERSION` / `INTERNAL_VARIABLES` / `REMOVE_KEY`で
  `RBS::DuplicatedDeclaration`）、さらに動的`attr_reader(*INTERNAL_VARIABLES.keys)`が
  `RBS::InlineDiagnostic`（inline readerはスプラットattrを扱えない）。
- 対処（方式A時）: `check 'lib'`と`check 'lib/alba/type.rb', inline: true`の2行に分離し、
  `sig/alba/type.rbs`から該当メソッドを撤去して**ivar宣言のみ残す**。→ グリーン。

## 6. 全体方針の決定と方式Bの実装結果

方式A（inlineを正としsig/ から外す）はリポジトリ内では動くが、**albaは`sig/`をgemに
同梱**しているため、consumer向け同梱sig/ からメソッドが消える＝型が失われる。そのため全体展開
は**方式B**とした。パイロットで実際に実装・検証した:

- **注釈を「執筆形式」の正とし、rbs-inline CLIで`sig/`を再生成**。プロジェクトはまだRigor中心の
  構成ではないため、**`sig/generated/`の分離は採らず、`sig/`直下にフラット展開**する
  （`bundle exec rbs-inline --output=sig lib`。注意: スペース形式`--output sig`は既定で
  `sig/generated`に書くため、フラット化には`=`形式が必須）。手書きの`sig/alba/type.rbs`は
  生成物へ置換。
- リポジトリ内のSteepは**`inline: false`で生成済みsig/ を読む**（Steepfileは
  `check 'lib'`のまま）。
- Gemfileのtype groupに`rbs-inline`を追加（生成ワークフローをプロジェクトに固定）。

検証結果: `rigor check`エラー0・`bundle exec rake typecheck`グリーン・
`bundle exec rake test` 281 runs / 0 failures。

### 方式Bで見つけた新たな非対称性（主発見4） — ivarはマージ対象外

パイロット中、inlineのivar注釈（`# @rbs @name: T`）を入れた状態で`rigor check`が以下を報告:

```
rbs.coverage.definition-build-failed: RBS::InstanceVariableDuplicationError on `::Alba::Type`.
Conflicting signature file(s): virtual:rbs-inline:/.../lib/alba/type.rb
```

**原因**: `rigor-rbs-inline`プラグインはinlineの`# @rbs @ivar`注釈からivarを合成し、生成済み
`sig/generated/`にも同じivarがあるため二重宣言になる。**「同一なら静か」のprecedenceはメソッド
に対してのみ**で、ivar（非メソッドメンバー）は比較対象外のためビルドが壊れる。Steep（inline:
false）はsig/ しか読まないので気づかない、**Rigorだけに見える非対称性**。

対処（§6想定の「手動マージ」運用が実際に必要になる最初の例）: inlineからivar注釈を撤去し、
ivar宣言は生成後の`sig/generated/alba/type.rbs`に手動マージ（生成にコメントで維持を明記）。
→ `rigor check`はクリーンに戻る。

## 7. 一括移行（type.rb以外9ファイル）の結果 — 2026-10-12後半

way Bのパイロット後、`lib/alba/type.rb`以外の**小〜中サイズ9ファイル**を一括移行した
（`version` / `constants` / `deprecation` / `default_inflector` / `typed_attribute` /
`nested_attribute` / `conditional_attribute` / `layout` / `association`）。手順:
1. 各ファイルに`# rbs_inline: enabled` + `# @rbs`（block付きメソッドは`#:`全体シグネチャ）を書き、
2. `bundle exec rbs-inline --output=sig lib`で一括再生成（magic commentのあるファイルのみ対象、
   `alba.rb` / `resource.rb`は未対象で手書きsig維持）、
3. **手書き部分を手動マージ**、4. Steep / Rigor / testで検証。

検証結果: `rigor check`エラー0・`bundle exec rake typecheck`グリーン・
`bundle exec rake test` 281 runs / 0 failures。diff: lib 10 + sig 10ファイル、+299 / −160。

### 7a. マージで判明したrbs-inlineの生成境界（主発見5）

再生成後に人手で戻す必要があったもの（＝rbs-inlineが生成しない・誤生成するもの）:

| パターン | 実例 | 対処 |
| --- | --- | --- |
| **ivarは生成しない** | 全クラス（`@name`等） | 生成後に手動マージ（生成にコメントで維持を明記） |
| **`class << self`内のattr castをインスタンスattrに誤生成** | `attr_reader :const_cache`（`class << self`内）→ `attr_reader const_cache:`がクラス本体に | `def self.const_cache: () -> Hash[...]`に手直し＋`self.@const_cache`をマージ |
| **`delegate`は生成しない** | `DefaultInflector`の6メソッド | 旧sigから`def self.*`を手動マージ復元 |
| **Kernel制限の上書き宣言は生成しない** | `def caller_locations: (Range[Integer]) -> Array[...]` | 手動マージ（無いと`\| nil`で`.first`がNoMethodになる） |
| **定数の型は推論が緩い** | `REMOVE_KEY = Object.new.freeze` → `REMOVE_KEY: untyped` | 手書きの`Object`に手直し |
| **blockの`[self: singleton(Resource)]`束縛は表現不可**（`#:`に書けない） | `Association#initialize`の`?{ () [self: singleton(Resource)] -> void }` | `?{ () -> void }`に簡略化（精度微減、許容） |
| **`extend Forwardable`は正しく生成** | `Layout` | `def_delegators`の手書き宣言は不要になった（Forwardableから解決） |
| **`module_function`は正しく生成** | `def self?.warn` | — |
| **定数（`VERSION: ::String`等）は正しく生成** | `version.rb` / `constants.rb` | — |

### 7b. 対象外・保留（判断の記録）

- `lib/alba/errors.rb` / `lib/alba/railtie.rb`: YARD無し・メソッド無し（クラスシェルのみ）→ 移行対象外。
- **`lib/alba.rb` / `lib/alba/resource.rb`は保留**: 型エイリアス（`generic_hash`・`transform_type`
  等）・interface（`_ResourceClass` / `_Inflector` / `_ClassMethods` / `_InstanceMethods` /
  `_ClassContext`）・動的`attr_reader(*INTERNAL_VARIABLES.keys)`・多数の`self.@*` / `@_*` ivar・
  self-binding blockを持ち、rbs-inline生成後に構造を再構築する必要がある。単純置換では完了しない
  ため、手書きsigを維持したままとした（アノテーションも未導入＝consumerの無いため）。

### 7c. Rigor／生成系ワークフローへの期待（ユーザー方針メモ）

**Rigor（およびrbs-inline生成経路）に期待する機能は、コードに書かれたrbs-inline注釈を
丸写ししてsig/ に写すことではない。**期待するのは:

1. 注釈を**きちんとしたRBS形式のファイルとして再構築**すること（今回観測された
   `initialize -> untyped`、`REMOVE_KEY: untyped`のような「推論が丸いままの写し」ではなく、
   意味のある形に整える）。
2. **既存のRBSファイルを反復的に堅牢にする用途**に使えること — 手書きsig/ を一度きりの
   置換で壊すのではなく、注釈・生成物・手書きの整合を繰り返し改善していく道具として機能する
   こと（§6の方式Bと §7aの手動マージ運用は、その反復の一形態）。

裏付けとなる観測: `--write --overwrite`の一括生成は既存の精密引数を`untyped`に落とし
（§3c）、定数・initializeの戻り値は推論が緩いまま写る（§7a）。したがって生成物の質は
「写しの忠実度」ではなく「RBSとしての正しさと、手書きとの差分をどう詰めるか」で評価する。

## 8. フォローアップ候補

1. **sig-genの既存宣言重複出力**（§3b）— upstream issue候補。再現手順: 手書きsig/ を持つ
   プロジェクトで`sig-gen --write --overwrite lib` → module `self.`メソッドが別ファイルに
   再出力され`RBS::DuplicatedMethodDefinitionError`。
2. **mise gemバックエンドのビルドRuby選択**（§1c）— install.mdへの注意書き追加余地
   （`mise install --force`前にhook-env / PATH先頭をmise rubyに）。
3. **rbsパーサーのunion戻り型差**（§3e）— 括弧の有無でrbs validateとSteepの判定が分か
   れる。sig-genの出力が常に括弧付きなのはこのためと思われるが、ドキュメント化の価値あり。
4. **`Gemfile.lock`生成由来の`rbs.coverage.missing-gem`（info）** — 対応方針の決定。
5. **保留2ファイル（alba.rb / resource.rb）の移行設計** — 「注釈→再生成→構造再構築」の手順を
   確立してから着手（§7b）。
6. **inline ivar注釈の二重宣言**（§6・主発見4）— プラグインの合成と生成sig/ の両立可否を
   upstreamで確認する価値（メソッドのみprecedenceがありivarに無い、という非対称性の文書化）。
7. **`class << self`内attr castの誤生成**（§7a）— rbs-inline側の報告候補（`self.@*` / 
   `def self.*`へのスコープ解決）。

---

## 9. 残存`-> untyped`の体系的考察と`-> void`判定規範 — 決定論的生成・SKILL経験則への反映（主発見6）

2026-10-12の差分最小化リファクタリングにおいて、手書き`sig/`プロジェクトに残る`-> untyped`を網羅的に精査した。
「どこまでを型付けし、どこを`-> void`に倒し、どこを意図的に`-> untyped`のまま残すべきか」の境界線が完全に言語化されたため、Rigorの決定論的生成エンジン（`sig-gen` / `sig-refine`、ADR-122）およびエージェント向けSKILL（`rigor-sig-refine`）の経験則として記録する。

### 9a. 3つの残存`-> untyped`分類

| 分類 | 代表例 | 理由と意味論 | `-> void`化の可否 |
| :--- | :--- | :--- | :---: |
| **分類1: ユーザーの任意ドメインデータ / 属性値** | `Resource#object`, `Layout#object`<br>`Association#object_from`<br>`fetch_attribute*`<br>`ConditionalAttribute#second_object`<br>`Type#convert`, `TypedAttribute#value`<br>`Resource#__send__` | ユーザーがシリアライズ対象として渡すPORO / ActiveRecord / Hashや、評価された属性値そのもの。非ジェネリックなライブラリ設計において必然的に`untyped`（または`top`）となる。呼び出し側がこの戻り値を受け取ってJSONハッシュに格納するため値を返さなければならない。 | ❌ **絶対不可**<br>（戻り値が使われるため、`void`にすると`void-value-used`違反となる） |
| **分類2: コールバック・属性定義ブロック引数** | `attribute` / `assign_attributes_with_types`の`?{ (untyped) -> untyped }`<br>`type attribute = ... ^(...) -> untyped`<br>`type instance_proc = ... -> untyped` | `attribute :name do \|u\| ... end`のブロック戻り値。ブロックの評価結果をAlbaが受け取ってシリアライズ値とするため、ブロックの戻り値は「任意の型を許容する」という意味の`-> untyped`でなければならない。 | ❌ **絶対不可**<br>（ブロック戻り値を`-> void`にすると「呼び出し側が結果を捨てる」契約になり偽となる） |
| **分類3: Steepの型推論制約・偽陽性回避のエスケープ弁** | `Alba.resolved_default_superclass`（実態は`Class`）<br>`Resource#transform_key`（実態は`Symbol \| String`）<br>`Resource#dup` / `transform_keys!`（実態は`self`） | 実装上は具体的な型を返すが、型をつけるとSteepが偽陽性を報告する箇所:<br>・`Object.const_get`の戻り値がSteepで`Class`にナローイングされない（`MethodBodyTypeMismatch`）<br>・`key_type`が`nil`を含むため、キー変換メソッドに型をつけると`hash[key]`で`nil`キー警告が出る（`ArgumentTypeMismatch`）<br>・`dup.class_eval`内のブロックコンテキストで`self`が特異メソッドを認識しない（`NoMethod`） | ❌ **不可**<br>（ダウンストリームのSteep検証をグリーンに維持するための意図的境界） |

### 9b. `-> void`に置き換えるべき厳密な判定規範

`-> untyped`を`-> void`に置き換えるのは、以下の条件を満たす場合に限られる:
1. **呼び出し側が戻り値を破棄する**: 式として戻り値が代入・消費されず、純粋に副作用目的で呼ばれる。
2. **フックメソッド**: `included`, `extended`, `inherited`等の言語仕様上のフック（戻り値はRuby処理系によって捨てられる）。
3. **セッターメソッド**: `def name=(val)`構文。Rubyでは構文上`obj.name = x`は常に`x`を評価するため、メソッド本体の末尾式（内部の代入や`reset_transform_keys`などの副作用ヘルパー呼出）の戻り値型が漏れないよう`void`に正規化する（ADR-122 WD3）。
4. **コマンドメソッド**: 登録、初期化、エラーハンドリング、可視性変更など（`reset!`, `register_default_types`, `set_key_and_attribute_body_from`, `handle_error`, `private`）。

### 9c. 差分最小化（Minimal Diff）原則の実践成果

パイロット一括移行時に発生した12ファイル479行の差分を、本知見に基づいて見直した:
- 実質的な型改善がない6ファイル（`constants`, `default_inflector`, `deprecation`, `nested_attribute`, `typed_attribute`, `version`）は完全にHEADへリバート。
- 局所的な型付けが可能なファイル（`association`, `conditional_attribute`, `layout`, `type`）は1〜4行の最小限の差分のみを適用。
- 差分は**6ファイル80行**に圧縮され、Steep（`No type error detected. 🫖`）、Rigor（0 errors）、テスト（281 runs / 0 failures）すべてグリーンを維持した。
手書きRBSを持つ既存ライブラリに対するシグネチャ改善は、この「最小差分原則」を徹底することで初めてupstreamに受け入れ可能な品質となる。

---

## 10. PR #576レビュー対応と戻り値ユニオン・ダウンストリーム型推論の考察（主発見7）

AlbaへのRBS改善PR（[#576](https://github.com/okuramasafumi/alba/pull/576)）に対するCodeRabbitレビューの検証と、戻り値ユニオン（Union Return）の扱い、およびダウンストリーム（`rigor-alba`）での型推論モデルの役割分担を記録する。

### 10a. PRレビュー指摘の採否と検証

| 指摘内容 | 判定 | 理由・検証結果 |
| :--- | :---: | :--- |
| **`serializable_hash_for_collection`の戻り値に`Hash[root_key_type, generic_hash]`を追加** | **採用** | `collection_key`設定時、各要素のシリアライズ結果（`generic_hash`）を値に持つHashを返すため。旧手書きsigの`Hash[root_key_type, Array[generic_hash]]`は実際にはこのメソッドから返されない（`as_json`でroot keyが付与された場合の型）ため除去し、`(Array[generic_hash] \| Hash[root_key_type, generic_hash])`の2値ユニオンへ修正（`serializable_hash_type`も同期）。コミット`f378cc6`で適用。 |
| **`_ClassContext` / `ClassMethods`の`name`を`String?`に変更** | **見送り** | `Alba.resource_class`による匿名クラスでは`name`が`nil`を返しうるが、`lib/alba/resource.rb:420-426`（`nesting`）において`if name.nil? ... else name.rpartition ... end`と実装されている。Steepはローカル変数への退避（`n = name`）がないメソッド呼出結果のフローナローイングをサポートしないため、`else`節でも`name`が`(String \| nil)`のままとなり`Ruby::NoMethod: Type (::String \| nil) does not have method rpartition`が発生する。Rubyコードを変更せずにSteep適合を維持するため`-> String`を維持。 |

### 10b. 戻り値ユニオン（Union Return）の不可避性とRBSの表現限界

型システムの観点から「戻り値ユニオンは呼び出し側に型分岐を強いるため慎重になるべき」という原則があるが、AlbaのRBS単体では戻り値ユニオンの回避が不可能である:

1. **条件型の不在**: RBSにはTypeScriptのような条件型（`T extends U ? X : Y`）が存在しない。
2. **引数なしメソッドにおけるオーバーロードの限界**: RBSのメソッドオーバーロード（`def m: (A) -> X | (B) -> Y`）は引数の型差分に基づいて解決される。`serializable_hash_for_collection`は引数を取らない（`() -> ...`）ため、オーバーロードによる戻り値の分岐は構文上不可能。
3. **実行時状態に基づく動的分岐**: 戻り値は引数ではなくインスタンス変数`@_collection_key`の有無で分岐する:
   - `@_collection_key`あり: `@object.to_h { ... }`（`Hash[root_key_type, generic_hash]`）
   - `@_collection_key`なし: `@object.map { ... }`（`Array[generic_hash]`）

このため、ライブラリが提供する汎用RBSシグネチャとしては、両者を合流させた`(Array[generic_hash] | Hash[root_key_type, generic_hash])`が唯一正確な表現となる。

### 10c. `rigor-alba`によるダウンストリーム向けフローセンシティブ推論

ライブラリ単体の静的RBSでは戻り値ユニオンが不可避である一方、Albaを利用するアプリケーションコード（ダウンストリーム）では、各リソースクラスで`collection_key`が設定されているかどうかは静的に決定されていることが多い:

```ruby
class UserResource
  include Alba::Resource
  collection_key :users # 静的に宣言されている
end

# 呼び出し側:
result = UserResource.new(users).serializable_hash # 実際には常に Hash
```

アプリケーション側で戻り値が`(Array[...] | Hash[...])`のままだと、利用側コードで毎回`is_a?(Hash)`のような無用な型ガードを要求される課題が生じる。

ここで**`rigor-alba`プラグイン**の責務が明確になる:
- **ライブラリ同梱の`sig/`**: 言語仕様（RBS）の範囲内で最大の正確性を持つユニオン型を提供する。
- **`rigor-alba`プラグイン**: アプリケーション内のリソース定義DSL（`collection_key`の有無）を静的解析し、対象リソースの`serializable_hash` / `serializable_hash_for_collection`の戻り値を`Array[generic_hash]`または`Hash[Symbol, generic_hash]`に**単一特化（narrowing / specialization）**して推論する。

この役割分担により、ライブラリ側のRBS規約を破ることなく、ダウンストリームの型安全性と開発者体験（DX）を最大化できる。