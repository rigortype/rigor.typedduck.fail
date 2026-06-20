---
title: "CRuby標準ライブラリ調査（Dynamic転落＋FPハント、ADR-55/56/57後）"
description: "rigortype/rigor docs/notes/20260612-cruby-stdlib-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260612-cruby-stdlib-survey.md"
sourcePath: "docs/notes/20260612-cruby-stdlib-survey.md"
sourceSha: "dada1f08a5787f7e112391a49f3f0ac494dc97f8d4632c433624c4d3364ab5f4"
sourceCommit: "95ff0e09e408504d17102725823e1978301d05ef"
translationStatus: "translated"
sidebar:
  order: 20266612
---

2026-06-12。CRuby自身の標準ライブラリに対する読み取り専用のエンジン挙動調査。**`lib/`（rigor）への変更なし**。対象ツリー（`/Users/megurine/local/src/ruby/lib`、626個の`.rb`ファイル）は読み取り専用かつ定義上正しく動作するため、すべての`error`診断は偽陽性（false-positive）の候補である。`20260612-dynamic-fall-pattern-survey.md`（プローブコーパス調査）の兄弟であり、当該ノートのメカニズムB1/B3/B4（ブロック／ループ内容の書き戻し）とADR-57の採用ゲートは今やLANDED済みである ── 本調査は合成プローブではなく*実際の*標準ライブラリコードに対して再計測する。

## 手法とカバレッジ

デフォルト設定でのフル実行（対象に`.rigor.yml`なし）:

```
cd /Users/megurine/local/src/ruby && \
BUNDLE_GEMFILE=<rigor>/Gemfile nix … develop <rigor> --command \
  bundle exec <rigor>/exe/rigor check --no-cache lib
```

- **カバレッジ: 626個の`.rb`ファイル全部**。ウォール時間**3m45s**（ユーザー3m36s）、ピークRSSは概ねワーカーごと、forkバックエンド。92ファイルで313 error、129ファイルにまたがり計498のerror+warning診断。
- **ベンダリング分割:** 498診断のうち216（約43%）が`lib/bundler/vendor/**` + `lib/rubygems/**`配下（再ベンダリングされたgem ── connection_pool、net-http-persistent、fileutilsのコピー）にある。純粋な標準ライブラリの診断は282。以下の知見は、特記なき限り**純粋標準ライブラリ**のセットから引用している。ベンダリングツリーは概ね同じクラスを重複させている。
- **計測器2（sig-genセンサス）:** `rigor sig-gen --print --format=json`を23ファイルの代表的スライス（set、ostruct、optparse、shellwords、pathname、csv、uri、cgi、securerandom、time、ipaddr、tempfile、delegate、forwardable、find、open3、open-uri、tmpdir、fileutils、pp、prettyprint、resolv、English）に対して実行した。**知見: これは誤ったセンサス計測器である** ── sig-genは*候補*メソッド（new/changed/tighter-return）のみを出力し、14ファイルにまたがり25個で、そのセットの`untyped`戻り値はすべて`initialize`だった（パラメータ駆動の`untyped`、戻り値は`void`）。`--tighter-returns` = 0（このツリーは絞り込む対象のRBSを同梱していない）。したがって以下のDynamic-fallセンサスは、sig-genの戻り値ヒストグラムではなく、**診断フロー**（引数不一致とnil可能性のメッセージに現れるnil-union / `Dynamic[top]`オペランド）に加えて的を絞った再現から読み取っている。

### 途中で見つかったsig-genのCRASH（計測器1の#1を参照）

`lib/erb.rb`に対する`rigor sig-gen`は捕捉されない`NoMethodError`で**実行全体**を中断させる（`check`経路はこれをファイルごとに`internal analyzer error`として復旧する）。以下で根本原因を究明している。

## 計測器1 — 診断（FPハント）

純粋標準ライブラリのerrorクラス（ベンダリング分を除外）、正規化済み:

| クラス | 例の箇所 | ~件数 | 判定 | メカニズム | 最小再現 |
| --- | --- | --- | --- | --- | --- |
| **`internal analyzer error: undefined method 'name' on Prism::MultiTargetNode`** | `lib/erb.rb:937 def location=((filename, lineno))` | 1（＋sig-gen全体をクラッシュさせる） | **ARTIFACT — エンジンバグ（復旧可能）** | `method_parameter_binder.rb:115`/`:119`がすべての`requireds`/`posts`エントリーに`.name`を呼ぶ。デストラクチャリングされた位置引数`((a,b))`は`#name`を持たない`Prism::MultiTargetNode`である | `def location=((a,b)); end` → `check`: error; `sig-gen`: ハードクラッシュ |
| **`undefined method 'new' for Struct`** | `lib/rubygems/requirement.rb:23 Struct.new(:for_lockfile).new "!"` | 3 | **ARTIFACT — エンジンバグ** | *チェーンされた*`Struct.new(:a).new(…)` ── `Struct.new(...)`の結果が、チェーン位置で`.new`を持つシングルトンとして型付けされない（定数束縛の`S = Struct.new(...); S.new`は動作する） | `Struct.new(:a).new("!")` → `error`; `S = Struct.new(:a); S.new("!")`はクリーン |
| `possible nil receiver`（`[]`,`[]=`,`include?`,`delete`,`split`,`<<`,…） | `lib/resolv.rb:711 size`; `lib/mkmf.rb:2500 target[/\A\w+/]`; `lib/erb/compiler.rb:464 comment[…]` | ~110標準ライブラリ / 180合計 | **MIXED — 大半は上流のnil-union不精度（artifact気味）、一部は本物** | レシーバーが`T?`型付けされたローカル／ivar／正規表現グローバルである。*上流の*ソースがnil-unionに落ちたためだ。正規表現グローバル（`$1`,`$+`,`$~`）はnil可能に型付けされる。Hash `[]`参照は`V?`を返す。メソッド横断のivar結合。ソースには`&&`/`if x`ガードがあるが、レシーバーの*値フロー*がすでに広がっているためnilがナローイングで除去されない | 単独では縮減しなかった ── フローコンテキスト依存（定数畳み込みがガードをショートサーキットするか、nil-unionがクラス全体にまたがってのみ形成される）。ドライバは下記のセンサスバケットC1/C2/C3 |
| `argument type mismatch at '^' on Integer: got Dynamic[top] \| Integer \| nil` | `lib/ipaddr.rb:463/466/513 IN4MASK ^ @mask_addr` | 6 | **ARTIFACT — メソッド横断のivar結合** | `@mask_addr`は複数のメソッド（`mask!`、`set_prefix`、コンストラクタ）で異なる型で代入される。ivar状態結合が`Dynamic[top]\|Integer\|nil`へ広がり、`Integer#^`が拒否する。単一メソッドでの代入（コンストラクタでのみ`@m=0`）は正確 | `class M; def initialize;@m=0;end; def f;0xff ^ @m;end;end`はクリーン → 再現には複数書き込みivarが必要（センサスC2） |
| `argument type mismatch … create on Resolv::LOC::Size: expected …Size\|String, got Integer` | `lib/resolv.rb` LOC::Size/Coord/`allocate_request_id`/Sender `new` | ~8 | **NEEDS-RBS（本物vs sig）** | Resolvは**RBSを同梱しない**。推論されたsigが厳格すぎる（Rubyは推論パラメータ型が排除する`Integer`を受け入れる）。エンジンバグではなく、RBSなしライブラリにおけるRBS／推論精度のギャップ | n/a（ライブラリ固有） |
| `undefined method 'name' for Resolv::DNS::Resource` | `lib/resolv.rb:617 data.name`（`when Resource::CNAME`の後） | 1 | **GENUINE-conservative** | ベースの`Resource::CNAME`にナローイングされているが、これは`attr_reader :name`を宣言しない。具体的な`IN::CNAME`サブクラス（2234行）は宣言する。ナローイング後のベースクラスattrギャップ ── 際どく本物 | n/a |
| `undefined method 'untaint' for String` | `lib/fileutils.rb:2166`（＋ベンダリングコピー） | 2 | **GENUINE（真の捕捉）** | `Object#untaint`は**Ruby 3.2で削除された**。当該標準ライブラリ行はモダンRubyでは死んでいる。Rigorは正しい ── FPではない | n/a |
| `wrong number of arguments` | `lib/resolv.rb:700 send`; TCPSocket `open`; Gem::ConfigFile `new` | 13 | **MIXED — NEEDS-RBS / 本物** | 大半は組み込み／ライブラリのRBSアリティギャップ（`send`が狭すぎるsigに解決される。socketの`open`オーバーロード） | n/a |
| `condition is always truthy/falsey` | `lib/bundled_gems.rb:203 if caller_gem`; `lib/mkmf.rb:197` | 85（41はベンダリング） | **MIXED — ブロックキャプチャ／グローバル駆動** | `caller_gem = $1`が`each`+`break`の*内部*で代入され、ループ後の読み取りがループ前の`nil`を読む → 偽の`always falsey`。プレーンなローカルのループ*再代入*（内容変更ではない）書き戻し。正規表現グローバルのnil型付けと複合する | 単独では縮減しなかった（グローバルキャプチャを伴う`=~`+`break`ループ形状が必要） |
| `return-type mismatch` / `return type widened … breaks substitutability` | `lib/uri/ldap.rb`, `lib/uri/generic.rb` | 47+4 | **MIXED** | アクセサが宣言された`String`に対して推論された`Dynamic[top]?`を返す ── ivar状態のDynamic-fall（C2）がオーバーライド適合性チェックを通して表面化する | n/a |
| `instance variable … previously assigned A; this write assigns B` | `lib/rubygems/specification.rb @new_platform` | ~5 | **GENUINE-conservative** | 真に異種なivar書き込み（`Platform`の後に`Gem::Platform`）。真の最悪ケースフロー | n/a |

## 計測器2 — Dynamic-fallセンサス

実標準ライブラリの`Dynamic[top]` / nil-union落下を駆動するメカニズムを、半径でランク付け（sig-genの候補フィルタがカバー不足のため、診断オペランド＋的を絞った再現から読み取った）:

| バケット | メカニズム | おおよその半径 | 難易度 | precision-additive？ | クラス |
| --- | --- | --- | --- | --- | --- |
| **C1. 正規表現グローバル（`$1`,`$~`,`$+`,`$'`）がnil-unionに型付け** | あらゆる`str =~ re; … $1` / `$~[1]` / `scan(re){ … $+ }`が`T?`を読む。下流の`[]`/`[…]`/連結 → nil可能。180件のnil可能errorの最大の単一*ドライバ* | **非常に高い**（ツリー内のあらゆるパーサ ── erb、csv、uri、resolv、optparse、mkmf） | mechanism | yes | engine — グローバル変数フロー型付け＋`=~`後ナローイング |
| **C2. メソッド横断ivar状態結合 → `Dynamic[top]`/nil-union** | N個のメソッドで異なる型で書かれたivarが広がったユニオンに結合する。第3のメソッドでの読み取りがDynamicまたはnilに落ちる（ipaddr `@mask_addr`、uri/ldapアクセサ）。引数不一致（`^`）、戻り値不一致、nil可能として表面化 | **非常に高い** | mechanism | 大半（一部は本物の異種性を表面化、specification `@new_platform`参照） | engine — ivar宣言型推論／書き込み結合の精度 |
| **C3. Hash/Array `[]`参照が`V?`を返しガードなしで消費される** | レシーバー自体が`T?`ソース由来である`h[k].foo`、`opts[k]=…`。resolv/open3の`[]`/`[]=` | 高い | mechanism | yes | 大半はgenuine-conservative（参照は*ミスしうる*）。キーが証明可能に存在する場合は精度の勝ち |
| **C4. `def self.x`モジュールシングルトン呼び出し（待機中のギャップ）** | ここで計測した半径: module_function / `def self.`ヘルパーが同一モジュール内で呼ばれるとき結果をシングルトンディスパッチで型付けする。多くは解決するが、`def self`横断チェーンはなお落ちる。このコーパスでは予想より小さい半径（標準ライブラリはインスタンスメソッド＋ミックスインに寄っている） | 中 | mechanism | yes | engine — 既知の待機中（ADR-57「モジュールシングルトン解決」のフォローアップ） |
| **C5. ループ／ブロックのプレーンローカル*再代入*書き戻し** | `x = nil; arr.each{ x = $1; break }; x`がループ前の`nil`を読む → `always-falsey`。ADR-56スライスA（*キャプチャされたローカルの変更*`x << …`をカバー）とは別物。非エスケープブロック内のプレーンな再束縛はここでは結合し戻されない | 中〜高 | mechanism | yes（FPを除去） | engine — ADR-56書き戻しをブロック内のbare再束縛へ拡張 |
| **C6. RBSなしライブラリ → 推論sigが厳格すぎる** | Resolv（LOC::Size/Coord、Sender、Requester）、prism translationの一部。推論されたパラメータ／戻り値型が有効な引数を拒否する | 中 | needs-RBS | n/a | エンジンバグではない ── RBSなしライブラリでのRBS作成／推論精度 |
| **C7. デストラクチャリングされたパラメータ`((a,b))` / `def f(a,(b,c))`** | 今日はCRASH（下記C-1）。修正後は、デストラクチャリングされた名前も要素型束縛が必要 | 低（標準ライブラリでは稀 ── 1ファイル） | mechanism | n/a（クラッシュ → 修正必須） | エンジンバグ（クラッシュ） |
| C8. C拡張境界（Ruby本体なし） | Cで定義されたsocket/IO/prism-FFIメソッド ── 推論する本体がない | n/a | expected-boundary | n/a | **期待される境界 — バグではない**（RBSで解決） |
| C9. `Object#untaint`とその仲間がRuby ≥3.2で削除 | 標準ライブラリ内の死んだ参照 | 些末 | n/a | n/a | **本物の捕捉 — そのまま残す** |

## 注目すべきWRONG／unsoundな発見

- **新たな*unsoundな誤った畳み込み*（旧B1の`x.zero? → true`のような）は見つからなかった** ── ADR-56のスライスC内容結合＋ADR-57の採用ゲートが、先のプローブ調査が指摘したsoundnessの穴を塞いだようである。
- **2つのハードなエンジンバグ、いずれもunsoundではなくFP／クラッシュ:**
  1. `Prism::MultiTargetNode`クラッシュ（`method_parameter_binder.rb:115`） ── デストラクチャリングされた位置パラメータを持つ任意のファイルでsig-gen全体を中断させる。`check`では復旧可能だが騒がしい。**最優先（クラッシュ）**。
  2. `Struct.new(:x).new(…)`チェーン → `undefined method 'new' for Struct` ── 広く使われるイディオムに偽のerrorを発火させる精度／ディスパッチのアーティファクト。

## 攻略順ランク付け

1. **C-1（クラッシュ）: `positional_slots`内の`Prism::MultiTargetNode`**。`method_parameter_binder.rb:115`+`:119`は、盲目的な`.name`の代わりに、デストラクチャリングされた`requireds`/`posts`エントリーを扱わなければならない（`MultiTargetNode.lefts/rest`へ再帰するか、合成スロットを束縛する）。エンジンバグ。唯一のクラッシュを修正し、実コード上のsig-genのブリック化を解除する。最小かつ最高の緊急度。
2. **C-2（FP）: チェーンされた`Struct.new(:x).new`**。`Struct.new(...)`の結果型がチェーン位置で`.new`ディスパッチを持つようにする（定数に束縛されたときはすでにそうなっている）。エンジンアーティファクト。3件以上の標準ライブラリerrorと非常に一般的なgemイディオムを潰す。（ADR-48はStructの*畳み込み*を保留した。これはより狭い ── 合成クラス上の`.new`ディスパッチのみ。）
3. **C1（FPクラス、最大半径）: 正規表現グローバルのnil-union＋`=~`後ナローイング**。180件のnil可能errorの最大の単一ドライバ。マッチした分岐で`$1`/`$~`/`$+`をより正確に型付けするか、成功した`=~`/`match`/`scan`ガードの後にナローイングする。エンジン ── precision-additive、FP削減。
4. **C2（FPクラス）: メソッド横断ivar状態結合の精度**。ipaddrの`^`引数不一致とuri/ldapの戻り値不一致を駆動する。書き込みが同種のとき複数書き込みivarが`Dynamic[top]|…|nil`へ崩壊しないよう、ivar宣言型推論を絞り込む。エンジン、precision-additive。
5. **C5（FPクラス）: ループ／ブロックのプレーンローカル再束縛書き戻し**。ADR-56の書き戻しを、キャプチャされたローカルの*変更*から非エスケープブロック／ループ内のbare*再代入*へ拡張する。`caller_gem`の`always-falsey`FPクラスを除去する。
6. **C4（Dynamic、中半径）: `def self.x`モジュールシングルトン呼び出し解決** ── すでに待機中のADR-57フォローアップ。このコーパスは標準ライブラリでの*中*（巨大ではない）半径を確認する。
7. **C6/C8/C9: エンジンバグではない**。C6（Resolvほか） = RBSを同梱／作成する。C8（C拡張メソッド） = 期待される境界、RBSで解決。C9（`untaint`） = 本物の捕捉、発火させたまま。

soundness優先の順序付けは今回は無意味である ── unsoundな畳み込みは生き残らなかった。よって順序は: **クラッシュ（C-1） → 広く使われるイディオム上のFP（C-2 Struct） → 高半径FPメカニズム（C1グローバル、C2 ivar、C5ループ再束縛） → Dynamic精度（C4） → needs-RBS／境界（C6/C8/C9）**。

## 残余の裁定（修正第1波の後） — 2026-06-12

3つの第1波修正がランドした後に再実行（`e88651c4` MultiTargetNodeデストラクチャリングクラッシュ、`fd4ebd50`チェーンされた`Struct.new(:a).new`、`0cfa4f55`証明されたマッチエッジでの正規表現マッチデータグローバルナローイング）。同じコマンド、同じ読み取り専用ツリー。**ウォール333s、495診断、308 error**（313 → 308）。クラッシュと`Struct.new`アーティファクトはいずれも診断ストリームから消えた。件数がほとんど動かなかったのは、**C1が元の調査が帰した分のFP面を持っていなかった**ためである ── 以下を参照。

### バケットテーブル（308 error）

| ルール | ALL | 純粋標準ライブラリ | ベンダリング |
| --- | --- | --- | --- |
| `call.possible-nil-receiver` | 179 | 95 | 84 |
| `call.undefined-method` | 79 | 49 | 30 |
| `call.argument-type-mismatch` | 37 | 35 | 2 |
| `call.wrong-arity` | 13 | 9 | 4 |
| **total errors** | **308** | **188** | **120** |

warning（185）は形状不変: `flow.always-truthy-condition` 84、`def.return-type-mismatch` 47、`call.unresolved-toplevel` 23、残りはオーバーライド適合性。（ベンダリング = `lib/bundler/vendor/**` + `lib/rubygems/**`。）

レシーバソース別のnil可能（95個の純粋箇所、ソースから手作業で分類）:

| レシーバソース | ~件数 | 主要ファイル |
| --- | --- | --- |
| Hash/Array `[]`/`pop`/`delete`参照結果（C3） | ~40 | open3 `opts`（12）、resolv `config_hash`（12） |
| `case`/`begin`-rescue結合からのローカルnil-union | ~20 | resolv、prism/translation/parser、time、ipaddr |
| メソッド戻り値チェーン`T?`の後にbare呼び出し | ~18 | open-uri、uri/generic、net/* |
| ivar nil-union（C2） | ~8 | net/protocol、uri |
| `&.`ガード後に`&&`右辺でbare読み取り | ~4 | uri/generic |
| **正規表現グローバル（`$1`,`$~`,…）** | **1** | erb/compiler（しかもそれは`comment[…]`、ローカルであって`$1`では*ない*） |
| その他 | ~4 | — |

### ステップ2 — C1ナローイングがほぼ何も生まなかった理由

**C1の前提は元の調査における計測アーティファクトだった**。調査は約180件のnil可能errorを「nil-unionに型付けされた正規表現グローバル」に帰した。これはこのエンジンでは偽である:

- **シードされていない**マッチデータグローバル読み取り（`$1`、`$~`、`$&`）は`String | nil`では**なく**`Dynamic[top]`に型付けされる（`ExpressionTyper#type_of_global_variable_read` → `scope.global(name) || dynamic_top`）。`@globals`への書き込み手は、明示的な`$x = …`代入、`program_globals`シーディング（`GlobalVariableWriteNode`ターゲットのみを集める ── perl的なマッチグローバルは*含まない*）、そしてナローイングエッジ自体だけである。**マッチデータグローバルを副作用として書き込む呼び出しはない**ため、bareな`str =~ re; $1.foo`は`$1`を`Dynamic`として読む → そこには`possible-nil`が決して発火しない。`scope.rb`の`forget_match_globals`コメント（「デフォルトの`String | nil`にフォールバック」）は*不正確*である ── 実際は`Dynamic[top]`にフォールバックする。

- erb、time、ipaddr、resolv、uri、optparse、mkmf、open3、net/*にまたがる残余のnil可能箇所をサンプリングしたところ、**95個中ちょうど1個**が`$N`に触れ、そこでもnilレシーバーは*ローカル*（`comment`）であってグローバルではない。このコーパスにはC1が除去すべき「正規表現グローバルnil可能」FPが実質ゼロしかない。したがってC1は**コーパスがFPとして行使しない形状に対するprecision-additive** ── 正しい作業だが、半径を誤計測していた。

- `0cfa4f55`の無効化ゲート（任意のマッチ可能／暗黙self呼び出しの後の`forget_match_globals`で、`match_capable_call?`が`=~ match [] split index === …`と*すべての*レシーバーなし呼び出しに対してtrueを返す）は仮説どおり*アグレッシブ*である ── 例えばtime.rbの`if /…/ =~ s; ($1 == '-' ? …) * ($2.to_i …)`では`$1 == '-'`（`==` ∈ MATCH_CAPABLE）が`$2.to_i`の前にすべてのグローバルを潰す。**だがこの潰しは無害**である: 忘れられたグローバルは`Dynamic[top]`に戻り、診断を発火させない。よって過度にアグレッシブなゲートは精度（StringではなくDynamic）を犠牲にするだけで、決してFPにはならない。実本体での潰しを定量化: `== / [] / split`ファミリーは複数文の日付パーサ本体（time.rb、resolv.rb）の大半でガードと読み取りの間に現れるが、FPの帰結はゼロである。

C1形状の内訳（依頼された（a）/(b)/(c)/（d）分類を、*そうなりうる*正規表現グローバル箇所 ── そのすべてが現状Dynamicを読む ── に適用）:

- （a）グローバルが`String | nil`にシードされていたら*意味を持つであろう*エンジンギャップ形状: 支配的に欠けているナローイングは**`.match` / `str.match(re)`がナローイング述語ではない**こと ── `simple_dispatch_name?`にあるのは`=~`のみ。`String#match` / `Regexp#match`は実行時に`$~`をセットするが、グローバルも返されたMatchDataもナローイングしない。また欠けているもの: `if md = re.match(s)`は`md`をナローイングする（ローカル書き込みのtruthy）がグローバルはしない、そして`scan(re){ … $1 }`ブロック本体にはエッジが付かない。これらは実在するギャップだが、グローバルがDynamicであるため**需要が実質ゼロにゲートされている**ので、塞いでもFP削減ではなく精度を生む。
- （b）メソッド横断（あるメソッドでマッチ、別のメソッドで`$1`読み取り）: 同じDynamicの理由でFPとして観測されない。
- （c）オプショナル／選言グループはウォーカー内で正しくnil可能のまま留まる（`unconditional_capture_groups`） ── 検証済み、過度な昇格なし。
- （d）真のnil可能ドライバはそもそもグローバル**ではない**（ステップ3参照）。

**C1の判定: ランドしたナローイングは保持する（soundかつ加法的だ）が、FP攻略ランクからは外す ── 実コードでのFP半径は約0である**。元の計測器1行の180-error数値は、「正規表現パーサがnil-unionを運ぶ」（真、ただしnilは*ローカル／ivar／参照結果*にあってグローバルにはない）と「グローバルがnil型付けされる」（偽）を混同していた。

### ステップ3 — 真のnil可能ドライバ（次スライスの素材）

最大の*反復可能な*2クラスタに加えて非正規表現メカニズムをサンプリングし根本原因究明した:

1. **`case … when … else raise`の網羅性が認められない（NEW支配的ギャップ）**。`eval_case`は`[*branch_results, else_result]`を`reduce_scopes_with_nil_injection`で結合する。`else`節が*終端する*（`raise`/`return`/`throw`）とき、結合はなおelse／no-matchスコープを畳み込み、そこでは`when`分岐内でのみ代入されたローカルが未束縛 → nilが注入される。最小再現（`/tmp/probe3.rb`）: `case info; when nil then h={…}; when String then h={…}; when Hash then h=info.dup; else raise; end; h.include?(:a)` → **`possible nil receiver`**（FP）。対照: `else h = {}`（代入する）はクリーン。else無しは正しくnil可能。これはresolvの`config_hash`クラスタ（**12箇所**）そのものであり、他所でも再発する。エンジン修正は、`eval_if`/`eval_unless`ですでに使われている厳密な`branch_terminates?`パターンである: `eval_case`（`statement_evaluator.rb:535`）でelse節が終端するときelse_resultスコープを結合から外す。**FP安全、低難易度、~12箇所以上**。

2. **`opts = (cond ? cmd.pop.dup : {})` ── `Array#pop`のnilが`.dup`を通って両分岐Hash結合に漏れる**。open3の`opts`クラスタ（**12箇所**、`[]=`/`delete`）。`if Hash === cmd.last; opts = cmd.pop.dup; else opts = {}; end` → `opts : Hash | nil`、なぜなら`cmd.pop`は`T?`で`.dup`がnilを保存するから。`Hash === cmd.last`ガードは*別個の*`cmd.pop`呼び出しをナローイングしない。型レベルではgenuine-conservative（popは*nilでありうる*）だが、ガードがそれを到達不能にする。修正には`x === y` ⟹ レシーバーの要素のエイリアシングナローイング、または証明された非空ガードの下での`Array#pop`の特例化のいずれかが必要 ── **より高難易度、エイリアシング依存、中FPリスク**。優先度を下げる。

3. **`&.`ガードされたレシーバーが`&&`右辺で非nilと知られない**。uri/genericの`v&.start_with?('[') && v.end_with?(']')` ── `&&`右オペランドは`v&.start_with?`がtruthyだったときのみ実行され、これは`v`が非nilを含意するが、`v.end_with?`はなお`v : String | nil`を見る。~4箇所。`analyse_and`でエンジン修正可能（左オペランドの`&.`セーフナビtruthyエッジが右オペランド向けにレシーバーを非nilにナローイングすべき）、**FP安全、低〜中難易度、小半径**。

4. **`until idx = expr; …; end; idx.foo`のループ終了時非nil**。net/protocolの`until idx = @rbuf.index(term); …; end; rbuf_consume(idx + …)`。ループは`idx`がtruthyのときに正確に終了するので、ループ後の`idx`は非nilである。エンジンはループ本体のnil-unionを保持する。注: *孤立した*プローブ（`/tmp/probe2.rb`）はパスする ── フルメソッドコンテキストでのみ再現するので、これは反復ごとのスコープ結合と絡み合っており、単独のナローイング漏れではない。中難易度、FP安全、~3〜4箇所。

非正規表現バケットの判定（ブリーフのステップ3）:

- **C2 ivar状態結合（ipaddr上の`argument-type-mismatch ^`、6箇所; uri/ldapの`def.return-type-mismatch`）**。複数書き込みivar（`@mask_addr`）が`Dynamic[top] | Integer | nil`に結合し、`Integer#^`が拒否する。同種書き込みがDynamicに崩壊しないようivar宣言型推論を絞り込むことでエンジン修正可能。**中難易度**、uri/ldapの戻り値不一致（47幅の`def.return-type-mismatch`バケット）は同じメカニズムに乗るので、半径は6個の`^`箇所より大きい。真に異種な書き込み手（specification `@new_platform`）の一部はフラグされたまま残さねばならない ── 修正はそれらを保持しなければならない。
- **C6 RBSなし厳格sig（Resolv LOC::Size/Coord/Alt、DNS Requester; 37個の引数不一致のうち~10）**。RBSを同梱しないライブラリで、推論されたパラメータ型が有効な引数を拒否する。**エンジンバグではない** ── RBSを作成するか、RBSなしライブラリでの推論精度を改善する。そのまま残す。
- **`call.undefined-method`（純粋49）**。レシーバクラス別のロングテール: `String`（6、`untaint`の本物の捕捉C9を含む）、Gem::* / Bundler::*（Rigorが部分的に型付けするプロジェクト内部クラス → 継承メソッド解決ギャップ、ADR-43の領域）、URI/OpenURI（ミックスイン／`method_missing`委譲）。大半は**needs-RBS / genuine-conservative**であり単一メカニズムではない。ここに集中したエンジンスライスはない。
- **C5 always-truthy `$extmk`（mkmf、純粋always-truthy 45のうち18）**。ループ再束縛ではない ── **プログラムグローバルの定数畳み込みの過度な早合点**である: トップレベルの`$extmk = nil`/truthyシードが、あらゆるメソッド本体内で`if $extmk`をalways-truthyにし、外部／遅延の再代入を無視する。**「修正」するとFPリスク**がある（シードこそが唯一可視の値だから）。正しい手は、可変プログラムグローバルのtruthy性をメソッド本体内で定数畳み込みしないこと（メソッドスコープでの`$global`読み取りを、未知書き込みフロアを含む全観測書き込みのユニオンへ広げる）。中、Mastodon/hamlに対してFP検証必須。優先度は低め。

### 次スライスのランク付けリスト

| # | スライス | メカニズム／rigorアンカー | 期待される収量 | FPリスク |
| --- | --- | --- | --- | --- |
| 1 | **`case`/`else`-終端の網羅性** | `eval_case`（`lib/rigor/inference/statement_evaluator.rb:535`）で終端する`else`スコープを結合から外す。`eval_if`同様に`branch_terminates?`を再利用 | ~12 resolv＋ 散在 = **~15 error** | **低**（出荷済みのifガードロジックのミラー） |
| 2 | **C2 ivar同種書き込み宣言型** | 同型の複数書き込みivarが`Dynamic[top]`に崩壊しないようivar書き込み結合を絞り込む（ivar宣言型推論; `class_ivars_for`シード＋書き込み結合） | ipaddr `^`（6）＋47個のuri/ldap `def.return-type-mismatch`のスライス = **~15〜25** | 中（真に異種な書き込み手はフラグされたまま保持必須） |
| 3 | **`&.`truthyが`&&`右辺レシーバーをナローイング** | `analyse_and`（`narrowing.rb`）で、左の`recv&.pred` truthyエッジが右オペランド向けに`recv`を非nilにナローイングする | uri/generic = **~4** | 低（ナローイングのみ） |
| 4 | **`until/while x = expr`のループ終了時非nil** | ループ後スコープが、truthy終了エッジでループ条件の代入ターゲットを非nilにナローイングする（`eval_loop`結合） | net/protocolほか = **~4** | 低〜中（ループスコープ結合と絡み合う;フルメソッドコンテキストでプローブ） |
| 5 | **ナローイング述語としての`.match`（C1フォローアップ）** | `String#match`/`Regexp#match`/`if md = re.match(s)`のグローバル＋ローカルナローイングを`simple_dispatch_name?` / `analyse_call`に追加 | **精度のみ**（グローバルはDynamicを読む → 今日FPは~0） | 低 ── ただし**需要ゲートされており、このコーパスではFP削減にならない** |
| 6 | **プログラムグローバルtruthy性の拡幅（C5 `$extmk`）** | 可変プログラムグローバルのtruthy性をメソッド本体内で定数畳み込みするのをやめる（`if $g`上の`flow.always-truthy`） | mkmf 18＋ 散在 = **~25 warning** | 中〜高（まずMastodon/hamlに対してFP検証） |

**エンジン作業ではないもの:** C6（Resolv RBSなし）、open3の`cmd.pop.dup`クラスタ（本物の`Array#pop` nil可能性;エイリアシング修正は高コスト／中リスク ── 明示的に予定*しない*）、`undefined-method`ロングテール（needs-RBS / ADR-43継承解決）、C9 `untaint`（本物の捕捉）。

### C2スライスがランド（一時的nilサブセット）＋保留した残り

スライス2の**FP安全サブセット**（一時的`@x = nil`のデッドライト除去、`ScopeIndexer#dead_transient_nil_writes`）を実装した: 後続の**文レベル**の無条件書き込み ── または`@x`への最終書き込みが*両分岐とも*非nilである`if`/`else` ── が、完了するすべての経路でそれを証明可能に上書きするとき、冒頭の防御的な`@x = nil`はもはやその`nil`をフロー非依存のクラスivarユニオンに寄与しない。トップ文レベルでpost-domination-sound。コーパスはバイト同一（mastodon app/models、haml、kramdown）、セルフチェック発火なし、ユニットスペック+4。**孤立した`ruby/lib` FP半径はゼロと計測**（私の変更単独で289 error == ベース289）: サブセットが認識するリテラル書き込みイディオムは実標準ライブラリのクラスタに出現しない ── ipaddrは`@mask_addr`を間接的に（`mask!`で）書き、uri/ldapの書き込みはパラメータ由来（保留分を参照）。したがってこのサブセットは、soundだが現状行使されない形状に対するprecision-additiveな下地である。これを保持するのは、保留された確定代入パスが上に積み上がるFP安全な床だからであって、このコーパスを動かすからではない。

**保留（ADRが必要 ── ivar上の手続き内確定代入）:**正準的な**ipaddr `@mask_addr`**クラスタ（6個の`^`引数不一致）はサブセットでカバーされず残る。その`initialize`は`@mask_addr = nil`を開き、すべての経路で再代入するが、末尾の`if prefixlen; mask!(prefixlen); else; @mask_addr = …; end`のthen分岐はivarを**同一クラスのメソッド呼び出しを介して間接的に**（`mask!`）書き込み、直接の`@mask_addr = `ではない。それを確定上書きとして認めるには、メソッド横断の書き込みエフェクトサマリー（`mask!`は`@mask_addr`を無条件に非nilで書くか？）を実際の手続き内確定代入パスへ畳み込む必要があり ── これはリテラル書き込みサブセットより深い設計である。そして残余の`Dynamic[top]`構成要素（`@mask_addr = m.to_i`で`m.to_i`が`@addr`を返し、それ自体が複数書き込みivar）の源は第2の直交するDynamicチェーンであり、nilドロップはこれに対処しない。uri/ldapの`@dn`スタイルの戻り値不一致はパラメータ由来（`@dn = val`） → 真に`Dynamic`であり、これもサブセット範囲外。両者をivar確定代入ADRの背後にキューする。

**キャンペーンの見出し訂正:** C1（正規表現グローバル）は元の調査で最上位ランクのFPメカニズムだったが、実標準ライブラリでは**FP半径が約0** ── マッチデータグローバルは`Dynamic`を読み、`nil`を決して読まない。実際に支配的で綺麗に修正可能なnil可能メカニズムは**`case/else-raise`の網羅性**（スライス1）であり、元の調査はこれを切り出していなかった。
