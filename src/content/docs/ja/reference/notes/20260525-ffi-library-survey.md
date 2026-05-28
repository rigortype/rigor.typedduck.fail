---
title: "FFIライブラリ使用状況調査 — `rigor-ffi`設計の基礎（2026-05-25）"
description: "rigortype/rigor docs/notes/20260525-ffi-library-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260525-ffi-library-survey.md"
sourcePath: "docs/notes/20260525-ffi-library-survey.md"
sourceSha: "3f1b028b24a631a99cd41206305d376fd493e700c1de29e3556f00e334a89316"
sourceCommit: "1881619b60b29439a03e7a1f8fee266031c9ca10"
translationStatus: "translated"
sidebar:
  order: 20266525
---

ステータス: 調査ノート、設計コミットメントなし。FFIバインディングgemを[ADR-0](../../adr/0-concept/) / [ADR-1](../../adr/1-types/)と[ロバストネス原則](../../type-specification/robustness-principle/)が要求するレベルで静的解析可能にする将来の`rigor-ffi`プラグインの前提条件。

最終目標はこれらのgemを**使用するRubyコードの型チェック** — つまり、`Ethon::Easy#perform`、`RbNaCl::SecretBox#encrypt`、`ZMQ::Context#socket`等を呼び出すユーザーコード。中間目標（FFIプラグイン）は、`Dynamic[Top]`に全面的に頼らずに型情報がFFI境界を越えて流れるための静的基板。

ソースは`/tmp/ffi-survey/<lib>/`内のシャロークローンで読んだ;クローンはコミットされておらず、サブモジュールとして参照もされていない。引用はクローンのファイルパスを指すので、将来の読者が検証のために再クローンできる。

設計空間を意図的に網羅する5ライブラリを調査:

| ライブラリ | バインディングスタイル | 目的 |
| --- | --- | --- |
| [ethon](https://github.com/typhoeus/ethon) | 純FFI | libcurlバインディング（typhoeusエンジン） |
| [rbnacl](https://github.com/RubyCrypto/rbnacl) | 純FFI + カスタムDSLラッパー | libsodium / NaCl暗号 |
| [ffi-rzmq](https://github.com/chuckremes/ffi-rzmq) | 純FFI **（gem境界を越えて — ffi-rzmq-core）** | ZeroMQバインディング |
| [childprocess](https://github.com/enkessler/childprocess) | **FFIなし**（Ruby `Process` / IOのみ） | クロスプラットフォームの子プロセス制御 |
| [sassc-ruby](https://github.com/sass/sassc-ruby) | 純FFI + ベンダーCソースビルド | libsassバインディング |

childprocessはFFIを使わないgemの意図的な**否定ケース**として含まれている——FFIを使うと思われながら実際は使わないgemを検証する。`rigor-ffi`がFFIバインディングコードの*存在*を根拠に有効化されるべきであり、「このgemはOSと対話する」という理由ではないことを確認する。

各セクションで同じ10の質問に答えており、ライブラリ間の知見をクロスリードできる。集約された評価（プラグインの設計形状の決定）はクロージングセクションにある。

---

## ethon — libcurlバインディング

### 1. FFIモジュール構成

`lib/ethon/`下の5ファイル:

- `curl.rb` — トップレベルの`Ethon::Curl`モジュール、`FFI::Library`を`extend`し、カタログモジュールをmix-in（`curl.rb:9-30`）。
- `curls/settings.rb` — 5つの`callback`宣言 + `ffi_lib`ターゲット。
- `curls/functions.rb` — すべての`attach_function`呼び出し。
- `curls/classes.rb` — `FFI::Struct` / `FFI::Union`定義。
- `libc.rb` — `select(2)`と`getdtablesize`のための最小libcシム。

**`attach_function`呼び出し合計約32件**（libcurl 29件 + libc 2件 + select 1件）。

### 2. `ffi_lib`ターゲット

`ffi_lib ['libcurl', 'libcurl.so.4']`（`curls/settings.rb:10`）。`select`向けのプラットフォームシムはWindowsでは`ws2_32`、それ以外では`FFI::Library::LIBC`を選択（`curls/functions.rb:48-52`）。env-varや`Gem::Util.find_library`解決なし。

### 3. typedefの使用

明示的な`typedef`呼び出しなし——FFIビルトイン（`:size_t`、`:time_t`、`:suseconds_t`、`:long_long`、`:int64`）を直接使用。カスタム名は**enum名**として導入され、typedefとしてではない（§7参照）。

### 4. `attach_function`パターン

3つの代表的な形状（`curls/functions.rb`）:

```ruby
# (a) 単純なポインター返し
base.attach_function :easy_init, :curl_easy_init, [], :pointer  # :15

# (b) enum + varargs
base.attach_function :easy_setopt, :curl_easy_setopt,
  [:pointer, :easy_option, :varargs], :easy_code              # :18

# (c) .ptr構文でのstruct-to-pointerの返し
base.attach_function :version_info, :curl_version_info, [],
  Curl::VersionInfoData.ptr                                    # :42
```

エラーラッピングはFFI境界ではなく**Rubyレイヤー**にある——例: `curl.rb:61`は`global_init`が非ゼロを返した場合にraiseする。

### 5. コールバック定義

5つのcallback typedef（`curls/settings.rb:4-8`）:

```ruby
callback :callback,          [:pointer, :size_t, :size_t, :pointer], :size_t
callback :socket_callback,   [:pointer, :int, :poll_action, :pointer, :pointer], :multi_code
callback :timer_callback,    [:pointer, :long, :pointer], :multi_code
callback :debug_callback,    [:pointer, :debug_info_type, :pointer, :size_t, :pointer], :int
callback :progress_callback, [:pointer, :long_long, :long_long, :long_long, :long_long], :int
```

RubyのProcはラッピングオブジェクトに保存され、`easy_setopt`に直接渡される（`easy/callbacks.rb:23, :38-44`）。FFIがブリッジする。

### 6. `FFI::Struct` / Unionの使用

`classes.rb`内の4つのキャリア:

- `MsgData`（`Union`、`:5-7`） — `:whatever, :pointer / :code, :easy_code`。
- `Msg`（`Struct`、`:10-12`） — `:code, :msg_code, :easy_handle, :pointer, :data, MsgData`。
- `VersionInfoData`（`Struct`、`:14-24`） — ランタイムバージョンメタデータ。
- `FDSet`（`Struct`、`:27-52`） — プラットフォーム条件付きレイアウト（Windows対POSIX）。
- `Timeval`（`Struct`、`:55-62`） — 同様。

`ManagedStruct`なし、`BitStruct`なし。`FDSet`が唯一のプラットフォーム分岐レイアウト。

### 7. enumの使用

`FFI::Library#enum`の多用（`constants.rb:17-78`）:

```ruby
EasyCode        = enum(:easy_code, easy_codes)
EasyOption      = enum(:easy_option, easy_options(:enum).to_a.flatten)
PollAction      = enum(:poll_action, [:none, :in, :out, :inout, :remove])
SocketReadiness = bitmask(:socket_readiness, [:in, :out, :err])
```

カタログは`Ethon::Curls::Codes`、`Options`、`Infos`から来る——シンボル配列を返す単純なRubyモジュール。

### 8. Pointer / `MemoryPointer` / `AutoPointer`ラッピング

**`FFI::AutoPointer`が主要なライフサイクルパターン**（`easy/operations.rb:14`、`multi/operations.rb:17`）:

```ruby
@handle ||= FFI::AutoPointer.new(Curl.easy_init, Curl.method(:easy_cleanup))
```

マルチループ中のin/outパラメーター向けの明示的な`MemoryPointer.new(:long)` / `Curl::Timeval.new`。ProcはGCルートを保つために`@procs`ハッシュに格納される（`easy/options.rb:42-45`）。

### 9. ユーザー向けRuby API → FFIマッピング

`Easy#url=`が標準的なブリッジ（`easy/options.rb:10-13`）:

```ruby
def url=(value)
  @url = value
  Curl.set_option(:url, value, handle)
end
```

`Curl.set_option`（`curls/options.rb:13-109`）はオプションカタログの`:type`フィールドでディスパッチし、varargs経由で`easy_setopt(handle, const, va_type, value)`を呼ぶ。各オプションの`:type`（`:string` / `:long` / `:callback` / `:string_as_pointer`）が*ランタイム*型識別子。

### 10. 静的展開可能性評価

回収可能: FFIシグネチャ（ロード時）、structレイアウト、5つのcallback typedef、enumシンボル→intマッピング（カタログモジュールから）。

オプションディスパッチャーをモデル化しないと回収不可:

- **`easy_setopt`内のvarargs** — 第3引数のFFI型はカタログを経由してoption enum値によって決まる。ナイーブなウォーカーは`[:pointer, :easy_option, :varargs]`を見てお手上げになる。
- **オプションカタログ上の`define_method`**（`easy/options.rb:32-47`） — すべてのセッター（`url=`、`ssl_verifypeer=`、`writefunction`）はロード時に`Curl.easy_options(nil)`を反復して生成される。セッターはASTに存在しない。

rigor-ffiにとって、オプションカタログ + 生成セッターのモデル化が標準的なFFIバインディング認識を超える主要な精度レバー。

---

## rbnacl — libsodium / NaClバインディング

### 1. FFIモジュール構成

プリミティブごとの分割——暗号構成ごとに1モジュール（`SecretBoxes::XSalsa20Poly1305`、`Signatures::Ed25519`、`Hash::{SHA256, SHA512, Blake2b}`、`HMAC::*`、`AEAD::*`、`PasswordHash::Argon2`、`OneTimeAuths::Poly1305`など）。各モジュールが`Sodium`を`extend`してFFIマシナリーを継承（`lib/rbnacl/sodium.rb:6-66`）。

**attach相当呼び出し合計約52件**、大半がリテラルの`attach_function`ではなくカスタムDSLラッパーの`sodium_function`経由。

### 2. `ffi_lib`ターゲット

```ruby
ffi_lib ["sodium", "libsodium.so.18", "libsodium.so.23", "libsodium.so.26"]
```

ABIバージョンにまたがる静的フォールバックリスト（`init.rb:8`と、遅延`extend`されるモジュールのために`sodium.rb:11`にも）。`sodium/version.rb:22-25`でlibsodium < 0.4.3の場合にraise;feature gate（例: `lib/rbnacl.rb:81`のArgon2）が検出されたバージョンに基づいて条件付きで`require`する。

### 3. typedefの使用

なし。プリミティブFFI型（`:pointer`、`:ulong_long`、`:size_t`、`:uint{8,32,64}`、`:string`、`:int`）を全体で直接使用。

### 4. `attach_function`パターン — カスタムDSLラッパー

**静的解析の重大なハザード**。`sodium_function`（`sodium.rb:47-55`）が`module_eval`内の補間ヘレドックで`attach_function`をラップする:

```ruby
def sodium_function(name, function, arguments)
  module_eval <<-RUBY, __FILE__, __LINE__ + 1
  attach_function #{function.inspect}, #{arguments.inspect}, :int
  def self.#{name}(*args)
    ret = #{function}(*args)
    ret == 0
  end
  RUBY
end
```

`rigor-ffi`にとって重要な3つのプロパティ:

- **戻り型が暗黙的** — すべての`sodium_function`がFFIレイヤーで`:int`を返し、Rubyレイヤーで`true|false`を返す。
- **引数はヘレドック内のクォートされたシンボル**であり、実際の`attach_function`呼び出しノードではない——`attach_function`をgrep-スキャンするウォーカーはそれらを完全に見逃す。
- **2つの名前** — C関数（`:crypto_secretbox_xsalsa20poly1305`）とRubyメソッド（`:secretbox_xsalsa20poly1305`）——がどちらもリテラル引数。

代表的な呼び出しサイト（`secret_boxes/xsalsa20poly1305.rb:32-38`）:

```ruby
sodium_function :secretbox_xsalsa20poly1305,
                :crypto_secretbox_xsalsa20poly1305,
                %i[pointer pointer ulong_long pointer pointer]
```

このパターンがrbnaclの圧倒的に支配的なバインディング形状。伴うDSL `sodium_constant`（`sodium.rb:32-45`）が`KEYBYTES` / `NONCEBYTES` / ... 定数に同じ技法を使う。

### 5. コールバック定義

なし。libsodiumはAPIサーフェスにコールバックを持たない。

### 6. `FFI::Struct`の使用

4つのストリーミングハッシュ状態struct（`HMAC::SHA256::State`、`HMAC::SHA512::State`、`HMAC::SHA512256::State`、`Hash::Blake2b::State`）。代表例（`hmac/sha256.rb:95-106`）:

```ruby
class SHA256State < FFI::Struct
  layout :state, [:uint32, 8],
         :count, :uint64,
         :buf,   [:uint8, 64]
end
```

`ManagedStruct`、`Union`、`BitStruct`なし。

### 7. enumの使用

なし。

### 8. Pointer / `MemoryPointer` / バッファラッピング

rbnaclは`MemoryPointer`を意図的に**回避する** — バッファはBINARYエンコーディングの単純なRuby `String`。ユーティリティは`Util.zeros(n)`（`util.rb:22-27`）:

```ruby
def zeros(n = 32)
  zeros = "\0" * n
  zeros.respond_to?(:force_encoding) ? zeros.force_encoding("ASCII-8BIT") : zeros
end
```

FFIが呼び出し時に`String` → `:pointer`をオートコーションする。検証は`Util.check_string` / `Util.check_length`（`util.rb:111-117`）を通じる。

### 9. ユーザー向けRuby API → FFIマッピング

`SecretBox#box`が標準的（`secret_boxes/xsalsa20poly1305.rb:49-76`）:

```ruby
def box(nonce, message)
  Util.check_length(nonce, nonce_bytes, "Nonce")
  msg = Util.prepend_zeros(ZEROBYTES, message)
  ct  = Util.zeros(msg.bytesize)
  success = self.class.secretbox_xsalsa20poly1305(ct, msg, msg.bytesize, nonce, @key)
  raise CryptoError, "Encryption failed" unless success
  Util.remove_zeros(BOXZEROBYTES, ct)
end
alias encrypt box
```

5ステップのブリッジ: 長さ検証 → ゼロパディング → `String`として出力確保 → `sodium_function`生成ラッパーを呼ぶ → パディング除去。ユーザーサーフェスは`(String, String) -> String`;FFI型はそれを何も伝えない。

### 10. 静的展開可能性評価

回収可能、**プラグインが`sodium_function`をバインディング定義マクロとして理解する場合**:

- 各`sodium_function(ruby_name, c_name, arg_types)`が`attach_function c_name, arg_types, :int` + Booleanを返す`self.{ruby_name}`メソッドを生成する。
- 各`sodium_constant(...)`が`attach_function`由来の定数を生成する。

AST単独では回収不可（DSL認識なし）:

- 生成された`attach_function`と`def self.…`（補間されたヘレドック文字列内にあり、呼び出しノードとしてではない）。
- 条件付きfeatureロード（`rbnacl.rb:81`）——ランタイムバージョン検出で暗号プリミティブ全体をゲートする。

rbnaclは`rigor-ffi`プラグインが**プラグイン側DSLレコグナイザー**をサポートすることの最も強い根拠——リテラルの`attach_function`が生成するのと同じバインディングファクトを合成する`sodium_function`対応拡張。

---

## ffi-rzmq — ZeroMQバインディング

### 1. FFIモジュール構成

**FFIバインディングは別gemに存在する** — [ffi-rzmq-core](https://github.com/chuckremes/ffi-rzmq-core)、`ffi-rzmq.gemspec:24`でランタイム依存として宣言され`lib/ffi-rzmq.rb:66`で`require`される。`ffi-rzmq`コードベース自体（`Context`、`Socket`、`Message`、`Poller`、`PollItem`、`Device`、`Util`、例外クラスにまたがる約1642行）はコアgemから`LibZMQ.*`上の純Rubyの**ラッパー**。

これはFFI解析の**クロスgem境界ケース**。

### 2. `ffi_lib`ターゲット

ffi-rzmqからは不透明——ffi-rzmq-coreで処理される。README（`README.rdoc:167-170`）はOSパッケージマネージャー / Homebrewでlibzmqをインストールするよう指示する。

### 3. typedefの使用

`:size_t`が参照される（`socket.rb:531`）;カスタムtypedefはffi-rzmq-coreにあるだろう。

### 4. `attach_function`パターン

ffi-rzmqにはない。ラッパーが「負のリターン = エラー、`LibZMQ.zmq_errno`経由でフェッチ」イディオムでリテラルの`LibZMQ.*`呼び出しを使う（`util.rb:71-78`）:

```ruby
rc = LibZMQ.zmq_setsockopt @socket, name, pointer, length
ZMQ::Util.error_check 'zmq_setsockopt', rc
```

### 5. コールバック定義

`LibC::Free`が`zmq_msg_init_data`デストラクターとして渡される（`message.rb:134`）。ファイナライザーは`LibZMQ.zmq_close` / `zmq_ctx_term`を呼ぶクロージャーで`ObjectSpace.define_finalizer`を使う（`context.rb:132`、`socket.rb:580-583`）。

### 6. `FFI::Struct`の使用

`LibZMQ::PollItem`（ffi-rzmq-coreで定義、`poll_item.rb:11`、`poll_items.rb:13`で参照）。`zmq_msg_t`はLayoutなしに`FFI::MemoryPointer.new(Message.msg_size, 1, false)`（`message.rb:99`）として不透明にラップされる。

### 7. enumの使用

**なし**。ソケットタイプ（`ZMQ::REQ = 3`、`ZMQ::REP = 4`、...）とオプションキー（`ZMQ::RCVMORE`、`ZMQ::LINGER`、...）は単純なRuby定数。オプションディスパッチはロード時に1度構築された3つの配列——`IntegerSocketOptions`、`LongLongSocketOptions`、`StringSocketOptions`（`socket.rb:569-571`）——を通じる。

### 8. Pointer / `MemoryPointer` / バッファラッピング

ファイナライザーベースのライフサイクル: すべてのcontext / socketがforkの後のダブルクローズを避けるために**`Process.pid == pid`でゲートされた**対応する`zmq_*`クリーンアップ関数を呼ぶ`define_finalizer`を登録する。オプションバッファは`LibC.malloc` / `free`（`socket.rb:129, 145`）またはキャッシュされた`FFI::MemoryPointer`（`socket.rb:537-547`）のいずれか。

### 9. ユーザー向けRuby API → FFIマッピング

`ZMQ::Context#socket(type)`（`context.rb:109-118`）が`Socket.new(@context, type)`（`socket.rb:65-88`）に委譲し、`LibZMQ.zmq_socket`を呼んで結果のポインターを保存する。ユーザー向けの**型識別子はSymbolではなく整数定数`type`**（`:REQ`短縮形なし）。

`Socket#send_string`（`socket.rb:244-247`）がStringを`Message`にラップし、`zmq_msg_t`を確保してバイトをコピーする。

### 10. 静的展開可能性評価

難しい問題: ffi-rzmqのシグネチャはgem境界を越えた場所にある。ユーザーのプロジェクトのみをスキャンする`rigor-ffi`プラグインは、以下なしに`LibZMQ.zmq_socket`のarity / 戻り型を見られない:

- ffi-rzmq-coreのソースにウォークインする（[ADR-10](../../adr/10-dependency-source-inference/)オプトインの依存関係ソース推論を参照）、または
- `LibZMQ`向けのバンドルRBSを出荷する（[ADR-25](../../adr/25-plugin-contributed-rbs/)プラグイン提供RBSを参照）。

追加の精度ブロッカー:

- `Socket.new`（`socket.rb:32, 68`）内の`:receiver_class`ポリモーフィズム — `recvmsg`がユーザーの選択したクラス（デフォルト`ZMQ::Message`）を返す。
- ZeroMQ 3.2.xと4.xの間のバージョン条件付きFFI——ffi-rzmq-core内で処理され、ラッパーレイヤーでは不可視。
- `socket.rb:569-571`の3つの配列を通じた動的オプションディスパッチ。

自然なrigor-ffi形状: ffi-rzmq-coreの`attach_function`呼び出しを依存関係としてスキャンし、次にそれらのシグネチャ上でffi-rzmqのラッパークラスメソッドを型付けする。

---

## childprocess — 意図的な否定ケース

### 発見: **FFIをまったく使わない**。

`require 'ffi'`なし、`childprocess.gemspec`にFFI依存なし、`attach_function` / `callback` / `FFI::Struct`呼び出しゼロ。

アーキテクチャ: `childprocess.rb:17-25`のプラットフォームディスパッチャーが`Unix::Process`または`Windows::Process`を選択し、どちらもRubyビルトインの`::Process.spawn` / `::Process.waitpid2` / `::Process.kill`に委譲する。Windowsの`SIGKILL`フォールバックは`taskkill /F /T /PID`へのシェルアウト（`process_spawn_process.rb:117-123`）。Pipeは`::IO.pipe`を使用。

### `rigor-ffi`への示唆

childprocessはプラグインが**検出されたFFIバインディングコード**（`require 'ffi'` + `extend FFI::Library` + 少なくとも1つの`attach_function`または同等のもの）を根拠に有効化されるべきであり、「このgemはローレベルに見える」という理由ではないことを検証する。RubyのProcess / IOスタンダードライブラリを使うgemはコアRubyの問題であり、FFIプラグインの問題ではない。

---

## sassc-ruby — FFI経由のベンダーlibsass

### 1. FFIモジュール構成

Cエクステンションを宣伝するgemであるにもかかわらず純FFI。`sassc.gemspec:27`が`spec.extensions = ["ext/extconf.rb"]`を宣言するが、エクステンションは`rb_define_method` Cエクステンションではない——`extconf.rb`（`:59-64`）がベンダードのlibsassサブモジュールをシンプルな共有ライブラリ（`libsass.{bundle,so}`）にコンパイルし、その後ランタイムで**FFI経由でロードされる**（`lib/sassc/native.rb:9-14`）:

```ruby
dl_ext = RbConfig::MAKEFILE_CONFIG['DLEXT']
begin
  ffi_lib File.expand_path("libsass.#{dl_ext}", __dir__)
rescue LoadError
  ffi_lib File.expand_path("libsass.#{dl_ext}", "#{__dir__}/../../ext")
end
```

`lib/sassc/native/`下の3つのサブモジュール: `native_context_api.rb`、`native_functions_api.rb`、`sass2scss_api.rb`。

### 2. ライブラリターゲット

`ext/libsass`下のベンダードlibsass（サブモジュール）。gem installビルド時にビルド;上記パス経由でランタイムにロード。システムlibsassのフォールバックなし。

### 3. 型エイリアス（typedef）

調査対象のgemの中で最も広範な`typedef`使用（`lib/sassc/native.rb:18-29`）。10個の不透明ポインターエイリアス: `:sass_options_ptr`、`:sass_context_ptr`、`:sass_file_context_ptr`、`:sass_data_context_ptr`、`:sass_value_ptr`、`:sass_import_list_ptr`、`:sass_import_ptr`、`:sass_importer`、`:sass_c_function_list_ptr`、`:sass_c_function_callback_ptr`。

すべて`:pointer`に解決するが**名前による区別**を提供する——調査コーパスで最も優れた静的解析フック。

### 4. `attach_function`パターン

標準的、加えて**プレフィックスストリップ規約** —— `attach_function`がオーバーライドされ（`lib/sassc/native.rb:39-47`）、`sass_make_options`を`Native.make_options`として登録する。例（`native_context_api.rb:9, 24, 44, 106`）:

```ruby
attach_function :sass_make_options,         [],                        :sass_options_ptr
attach_function :sass_compile_file_context, [:sass_file_context_ptr],  :int
attach_function :sass_delete_data_context,  [:sass_data_context_ptr],  :void
attach_function :sass_option_set_output_style,
                [:sass_options_ptr, SassOutputStyle], :void
```

### 5. コールバック定義

2つのtypedef（`lib/sassc/native.rb:31-32`）:

```ruby
callback :sass_c_function,        [:pointer, :pointer], :pointer
callback :sass_c_import_function, [:pointer, :pointer, :pointer], :pointer
```

ユーザー提供RubyのProcは`FFI::Function.new`でラップされ（`functions_handler.rb:23-26`、`import_handler.rb:26-33`）、ラッパーを生かしておくために`@callbacks`に格納される。

### 6. `FFI::Struct`の使用

Sass値のタグ付きユニオンが最大のレイアウト（`lib/sassc/native/sass_value.rb:84-95`）:

```ruby
class SassValue
  layout :unknown, SassUnknown,
         :boolean, SassBoolean,
         :number,  SassNumber,
         :color,   SassColor,
         :string,  SassString,
         :list,    SassList,
         :map,     SassMap,
         :null,    SassNull,
         :error,   SassError,
         :warning, SassWarning
end
```

各バリアントが独自の`SassTag`識別子を持つ（`:33-37`等）。

### 7. enumの使用

3つのenum（`sass_output_style.rb:5-10`、`sass_value.rb:7-22`）:

```ruby
SassOutputStyle = enum(:sass_style_nested, :sass_style_expanded,
                       :sass_style_compact, :sass_style_compressed)
SassTag         = enum(:sass_boolean, :sass_number, :sass_color, :sass_string,
                       :sass_list, :sass_map, :sass_null, :sass_error, :sass_warning)
SassSeparator   = enum(:sass_comma, :sass_space)
```

`attach_function`の引数リストで直接使用されるため、FFIが呼び出しサイトでRubyのシンボルを自動変換する。

### 8. Pointer / `MemoryPointer` / ライフサイクルラッピング

2つの注目すべきパターン:

- **文字列入力 → FFIオーナーシップ転送**（`lib/sassc/native.rb:54-58`）:

  ```ruby
  def self.native_string(string)
    m = FFI::MemoryPointer.from_string(string)
    m.autorelease = false
    m
  end
  ```

  `autorelease = false`はバッファをlibsassに渡し、libsassがそれを解放する。

- **`ensure`ブロックライフサイクル**（`lib/sassc/engine.rb:63`） — `Engine#render`のrescue/ensureテールで`Native.delete_data_context(data_context)`。

`AutoPointer`なし。

### 9. ユーザー向けRuby API → FFIマッピング

`SassC::Engine#render`（`lib/sassc/engine.rb:22-64`）はストレート8ステップのFFIパイプライン: `make_data_context` → contextにアンラップ → optionsにアンラップ → 約10個の`option_set_*`セッターを呼ぶ → コールバックを登録 → `compile_data_context` → 出力文字列を抽出 → フリー。メタプログラミングなし——すべてのステップがリテラルの`Native.something`呼び出し。

### 10. 静的展開可能性評価

調査の中で`rigor-ffi`の観点から**最も行儀の良い**ライブラリ:

- すべての`attach_function`呼び出しがリテラルの呼び出しノード。
- typedef済み不透明ポインターがすべてのCリソースに別個のnominal型を与える;プラグインが`sass_data_context_ptr`を`Nominal[SassC::Native::SassDataContextPtr]`として運び、混合を拒否できる。
- enumが静的に列挙されている。
- Structレイアウトが静的に宣言されている。

残るギャップはFFI固有ではない:

- `FFI::Function.new`コールバック（`functions_handler.rb:23-26`）は内部のRuby呼び出しに通常のフロー解析を必要とする匿名Proc。
- `.rbs`スタブファイルなし——FFI宣言が唯一の契約。

---

## 集約された知見

### バインディングスタイル分類

| パターン | ライブラリ | 静的解析可能性 |
| --- | --- | --- |
| リテラルの`attach_function`呼び出し | ethon、sassc-ruby | 高 |
| `attach_function`をラップするカスタムDSL（`sodium_function`等） | rbnacl | DSL認識なしでは低 |
| **別gem**内のバインディング（`ffi-rzmq-core`） | ffi-rzmq | 依存関係ソース推論なしでは低 |
| FFIなし（Ruby `Process` / IOを使用） | childprocess | N/A |

### プラグインが理解しなければならない繰り返すFFIプリミティブ

- `extend FFI::Library` + `ffi_lib`
- `attach_function name, c_name, [arg_types], return_type` — ストレートおよび末尾のオプションHash付き（`:blocking`、`:enums`）
- `callback name, [arg_types], return_type`
- `typedef existing_type, alias_name` — 主として**名前付き不透明ポインターエイリアス**（sassc-rubyパターン）として
- `enum :name, [:a, :b, …]`と`bitmask`（ethon、sassc-ruby）
- `FFI::Struct`、`FFI::Union`、`FFI::ManagedStruct`、`FFI::AutoPointer`
- `FFI::MemoryPointer.{new, from_string}`、`MemoryPointer#put_bytes / read_string`
- `FFI::Pointer.{null?, address}`、`FFI::Pointer::NULL`
- `FFI::Function.new(return, [args]) { |…| … }` — 匿名コールバック
- 呼び出し境界でのString ↔ `:pointer` / `:string`オートコーション

### 静的推論のクロスカッティングハザード

1. **`attach_function`周りのDSLラッパー**（rbnaclの`sodium_function`、プレフィックスストリップ用のsassc-rubyのオーバーライドされた`attach_function`）。プラグインはリテラルの`attach_function`が記録するバインディングファクトを再生する**DSLレコグナイザー**を必要とする。これは`sodium_function`向けの[ADR-16](../../adr/16-macro-expansion/) Tier C（ヘレドックテンプレート展開）とプレフィックスストリップオーバーライド向けのTier B（トレイトインライニング）にきれいにマップする。

2. **クロスgemバインディング定義**（ffi-rzmq → ffi-rzmq-core）。どちらもロードマップにすでにある2つの妥当な答え:
   - **プラグイン提供RBS**（[ADR-25](../../adr/25-plugin-contributed-rbs/)）——`rigor-ffi-rzmq`内に手でキュレートされた`LibZMQ`スタブを出荷。
   - **依存関係ソース推論**（[ADR-10](../../adr/10-dependency-source-inference/)）——`ffi-rzmq-core`の`attach_function`呼び出しのオプトインウォーク。

   ADR-25が低FPパス;ADR-10が低メンテナンスパス。

3. **enumによってディスパッチされるvarargs**（ethonの`easy_setopt`）。`va_type`は外部カタログを通じて2番目の引数のenum値によって決まる。オプションディスパッチャーをモデル化しないと3番目の引数は`Dynamic[Top]`として型付けされる;カタログがあるとオプションごとの小さなユニオンとして型付けされる。ライブラリごとの特別扱いが多すぎて`rigor-ffi`コアに属せない——ライブラリごとのプラグイン（`rigor-ethon`、`rigor-rbnacl`）の上位に属する。

4. **FFIメタデータからの動的メソッド生成**（`easy/options.rb:32-47`のoption catalogueへのethonの`define_method`）。生成されたセッター / ゲッターはASTに存在しない。これはADR-16 Tier B / CがDevise / dry-structのために解くのと同じ問題。

5. **nominalサブタイピングとしてのtypedef済み不透明ポインター**。これを多用しているのはsassc-rubyだけだが、最も*クリーン*なフック——`typedef :sass_data_context_ptr`は`Nominal[SassC::Native::SassDataContextPtr]`になり、ベアの`:pointer`と暗黙的に統一されるべきではない。これはサーベイの中でロバストネス原則との最も強い整合: 戻り型は厳密（型付きエイリアス）、入力はエイリアスかベースの`:pointer`のどちらも受け付ける。

6. **匿名コールバックProcの返し値の型**（`FFI::Function.new(rt, [args]) { … }`）。ブロック本体は通常の推論エンジンを必要とし、`callback` typedefがブロックのパラメーター型をバインドする。実装面では最も近いアナローグは[ADR-28](../../adr/28-path-scoped-protocol-contracts/)のバインダーティアメカニズム（パラメーター置換のため）。

7. **リソースライフサイクル**。`AutoPointer.new(ctor, dtor_method)`、`ObjectSpace.define_finalizer`、`delete_*`関数を呼ぶ`ensure`ブロック。これらはそれ自体では*型*の問題ではない;プラグインがuse-after-free / double-free診断ファミリーを持つ場合にのみ重要になる。初期`rigor-ffi`のスコープ外。

### `rigor-ffi`の提案形状（初稿、設計コミットメントではない）

**コアプラグイン**が出荷すべきもの（ethon + sassc-ruby + バニラFFI gemの80%をカバー）:

- `extend FFI::Library`を認識してホストモジュールをバインディングレジストリとして扱う。
- `attach_function`、`callback`、`typedef`、`enum`、`bitmask`、`FFI::Struct.layout`、`FFI::Union.layout`呼び出しをウォークしてファクト（メソッドシグネチャ、コールバック型、enumシンボルセット、structフィールドオフセットと型）をエンジンに貢献する。
- よく知られたFFIキャリア——`FFI::Pointer`、`FFI::MemoryPointer`、`FFI::Buffer`、`FFI::AutoPointer`、`FFI::Function`、`FFI::Struct` / `Union`サブクラス——を正確なメソッドシグネチャで型付けする（`read_string : (?Integer) -> String`、`put_bytes : (Integer, String, ?Integer, ?Integer) -> self`等）。
- `LibZMQ.zmq_send(socket, "hello", 5, 0)`がエラーを出さないよう、呼び出し境界での**String ↔ `:string` / `:pointer`コーションをモデル化**する。
- typedef済みポインターエイリアスを**別個のnominals**として扱い、入力のみでベースの`:pointer`をサブタイプとして受け付ける（ロバストネス）。

**ライブラリごとのサブプラグイン**（`rigor-rbnacl`、`rigor-ethon`、`rigor-ffi-rzmq`、`rigor-sassc`）に属するもの:

- DSLレコグナイザー（`sodium_function`、sassc-rubyのプレフィックスストリップオーバーライド）。
- バンドルされた`LibZMQ`形状のRBS（ADR-25）。
- オプションカタログ → セッターメソッド生成（ethon）。
- 高レベルAPI精緻化（`SecretBox#encrypt: (String, String) -> String`、`Easy#perform: () -> Integer`）。

初期プラグインで**意図的にスコープ外**のもの:

- FFIハンドルのuse-after-free / double-free / リーク診断。
- 具体的なstructフィールド境界（`FDSet` / `SHA256State`の配列レイアウトは型付けには十分だが境界チェックには不十分）。
- Cサイドのコンパイル正確性（sassc-rubyの`ext/libsass`ビルド）。

### childprocessからの否定ケースの教訓

- **FFIバインディングコードを根拠に有効化**し、「ネイティブリソースを使用する」ことを根拠にしない。
- `::Process.spawn` / `::IO.pipe` / `::IO.popen`で偽陽性を出さない——それらはコアRubyであり、stdlib RBSで処理される（またはされない）。

### 設計ADRへのオープンクエスチョン

- DSLレコグナイザー形状: `rigor-ffi`はプラガブルなレコグナイザーテーブルを持つ単一プラグインか、それとも`sodium_function`は`rigor-ffi`提供の貢献APIを消費する`rigor-rbnacl`が出荷するか？（ADR-13のTypeNodeリゾルバーチェーン議論の反響。）
- クロスgemシグネチャ取得: ffi-rzmq-coreケースでADR-25（プラグイン提供RBS）に頼るか、ADR-10（依存関係ソース推論）を待つか？ 2つは異なるメンテナンスコスト / 精度のトレードオフを持つ。
- typedef済み不透明ポインターはデフォルトでnominalサブタイピングにすべきか、それとも`typedef`呼び出しごとのオプトインか（例: `typedef :pointer, :sass_data_context_ptr, nominal: true`）？ 純「常にnominal」はドキュメントのみの目的でtypedefを使うgemを壊すリスクがある。
- プラグインは`FFI::Function.new`とブロックをどの程度積極的にモデル化すべきか？ 匿名Proc推論はエンジン全体の作業であり、FFI固有ではない。

---

## 補遺 — tenderloveのffxエコシステム（2026-05-25、同日）

`rigor-ffi`が`ffi` gemの代わりに（またはそれに加えて）ffxをターゲットにするプロジェクト向けに別のコードパスを必要とするかどうかを明確化するためのAaron Pattersonの最近のFFI置換作業のフォローアップサーベイ。

読んだソース:

- ブログ: [Tiny JITs for a Faster FFI](https://railsatscale.com/2025-02-12-tiny-jits-for-a-faster-ffi/)（2025-02-12）
- カンファレンス: [RubyKaigi 2026 — "A Faster FFI"](https://rubykaigi.org/2026/presentations/tenderlove.html)（Patterson, 2026）
- 解説（JP）: [note.com/hatai_hatai](https://note.com/hatai_hatai/n/nd8f3749c59e7) — RubyKaigi 2026まとめ
- リポジトリ: [tenderlove/ffx](https://github.com/tenderlove/ffx)、[tenderlove/sqliteffx](https://github.com/tenderlove/sqliteffx)、[tenderlove/fisk](https://github.com/tenderlove/fisk)、[tenderlove/aarch64](https://github.com/tenderlove/aarch64)

### アーキテクチャスケッチ

ffxはブログタイトルが1年の進化後に示唆するようなランタイムJITでは**ない**。`ffx@HEAD`で実際に出荷され`sqliteffx`で実証されている形状は:

1. **ビルド時** — `extconf.rb`内の`FFX.create_makefile(name, src.rb, headers: [...])`が`src.rb`をロードし、`FFI::Library`に対して記録されたすべての`attach_function`宣言を内省し、**本物のCエクステンション**を`$srcdir`に**emit**する。mkmfがそれを`.so` / `.bundle`にビルドする。

2. **ランタイム** — ロードされるのはコンパイルされたネイティブエクステンションであり、FFIマーシャリングではない。すべての`attach_function`バインドメソッドは`rb_define_singleton_method`経由で公開される本物のC関数。

3. **JITヒント** — 各生成C関数は2つのパートで出荷される: `_impl`関数（マーシャリング本体）と、`jmp _…_impl`に続くバイナリメタデータブロブ`[FFI0マジック | param_count | type_bytes | function_name]`のインライン`__asm__`を含む**ネイキッドトランポリン**。ZJITはオフセット4のブロブを読んで特化した直接呼び出しコードを生成する。

ブログの「tiny JITs」フレームはプロトタイプパスの一部だった**fisk** / **aarch64**コードジェンライブラリにマップする;現在の出荷形状は生成されたCのインライン`__asm__`を使い、アセンブリはmkmf / Cコンパイラに任せる。fisk / aarch64は独立したJITライブラリとして有用なまま、ffxのランタイムパスには**ない**。

### 報告されたパフォーマンス（コンテキスト用、rigorにとって重要ではない）

| キャリア（strlenラッパー） | ops/sec |
| --- | ---: |
| 純ffi gem | 約15 M |
| 手書きCエクステンション | 約45 M |
| **ffx + ZJIT** | 約54 M |

（JP要約の数字;ブログの初期〜32.5 M FJIT対〜29.8 M Cエクステンション（異なるベンチ）と一致。）「RubyのFFIがCエクステンションより速い」という実用的な主張はRubyKaigi 2026キーノートスロットを獲得するほど実証されている。

### ffxサーフェス解析（同じ10の質問に対して）

**ユーザー向けDSLはクラシックFFIとビット同一**。ffxが`module FFX::Library`を出荷して`FFI::Library`にエイリアスするので既存のバインディングファイルが変更なしにコンパイルされる（`ffx.rb:244-246`）。`extend FFI::Library`、`ffi_lib "sqlite3"`、`attach_function :name, [args], ret` — すべて同じ構文形式。

サーフェスレベルでffi gemと異なるもの:

| 構文 | クラシックffi | ffx |
| --- | --- | --- |
| `attach_function`（プリミティブ） | ✓ | ✓ |
| `ffi_lib` | ✓ | ✓ |
| `typedef` | ✓ | **✗ 非対応** |
| `callback` | ✓ | **✗ 非対応**（sqliteffx README:46-47が確認） |
| `enum` / `bitmask` | ✓ | **✗ 非対応** |
| `FFI::Struct` / `Union` / `ManagedStruct` | ✓ | **✗ 非対応** |
| 可変長引数（`:varargs`） | ✓ | **✗ 非対応** |
| カスタム型コンバーター | ✓ | **✗ 非対応** |
| プリミティブ型シンボル | 数十 | 25 — `void, int, long, string, uint, size_t, double, float, pointer, bool, char, uchar, short, ushort, int{8,16,32,64}, uint{8,16,32,64}, long_long, ulong_long, ulong`（`ffx.rb:12-38`） |

**ffxはFFIの厳密なサブセット**。これは`rigor-ffi`にとって最も重要な発見: クラシックFFIを処理するプラグインはffxターゲットコードを自動的に処理する——より少ないレコグナイザーサーフェスが発火し、より多くはない。

### sqliteffx — 標準的なffx消費者

集中した単一ファイルのバインディング宣言（`ext/sqliteffx/sqliteffx.rb`、44行）。2つのパターンがプラグイン設計にとって重要:

**(a) `ffi.rb`スタブリダイレクトトリック**。sqliteffxは**空の`ext/sqliteffx/ffi.rb`**をスタブとして出荷する。`sqliteffx.rb`がextconf時に`require "ffi"`を実行するとき、インストール済みのffi gemより`ext/sqliteffx/`がRubyロードパスの先にあれば、スタブが勝ってffxのmixinに`extend FFI::Library`が解決する。ランタイムではFFI gemは何もロードされない——コンパイルされたCエクステンションがロードされる。

`rigor-ffi`にとって、これは**`extend FFI::Library`を宣言するプロジェクトファイルがffiまたはffxのどちらかをターゲットにしている可能性がある**ことを意味し、gemビルドプロセスがどちらを使うかをASTだけでは判断できない。プラグインは（a）共通サブセットを無条件にカバーし、（b）プロジェクトが実際に`ffi` gemに依存している場合にのみFFI専用機能レコグナイザー（callback、struct、enum、typedef）を発火させなければならない。

**（b）生のRuby `Integer`としての不透明ポインター**。sqliteffxはSQLiteハンドルを`FFI::Pointer`でラップ**しない**。8バイトスロットを`malloc`で確保し、スロットをアウトパラメーターとして`sqlite3_open`を呼び出し、次に`Fiddle::Pointer.new(@slot)[0, 8].unpack1("Q<")`経由でスロットを読み戻す——単純なRuby `Integer`が得られる（`lib/sqliteffx.rb:41`）。そのIntegerを`:pointer`引数として`Sqliteffx.sqlite3_close(@handle)`に返す。

ffxの`:pointer`のマーシャリングは`(void *)NUM2ULL(value)` — 任意のRuby `Integer`を受け付ける。クラシックFFIは`FFI::Pointer`を受け付けて特定の型を自動変換するが、ベアの`Integer`は受け付け**ない**。

これは`rigor-ffi`の実際の精度上の問題: `:pointer`パラメーター型の受け付けられる入力セットはffxではクラシックFFIより広い。ロバストネス原則の答えは、`:pointer`パラメーターの*入力*を`FFI::Pointer | Integer | nil`に全面的に広げ、非対応型でのffi-gemランタイムエラーはrigor-ffiではなくgem自体が診断するに任せること。戻り型は厳密のまま——クラシックFFIは`FFI::Pointer`を返し、ffxは`Integer`を返す;プラグインはプロジェクトのターゲットに従う。

### fisk / aarch64 / JITBuffer — スコープ外の判定

どちらのgemもFFIバインディングサーフェス自体を持たない純Rubyの命令エンコーダーDSL（`attach_function`なし、`extend FFI::Library`なし、FFI依存なし——実行可能ページを`mmap`するためにStdlibの`Fiddle`を使用）。ffxを消費するエンドユーザーコードは`Fisk::*`または`AArch64::*`シンボルを参照しない。ffx自体ですらそれらに依存しない——インライン`__asm__`トランポリンはコードジェンgemを完全に回避する。

**推奨: `rigor-ffi`はfiskとaarch64を無視する**。それらはJITを*書く*人が使うコードジェンバックエンドであり、FFIバインディングを書く人が使うものではない。将来の`rigor-jit`プラグイン（もし要望があれば）がそれらを拾い上げるかもしれない;それは別のサーフェス領域。

### 集約された`rigor-ffi`形状の更新

メインノートのクロージングセクションの計画は3つの調整とともに維持される:

**（1）コアプラグインはすでにffxを処理する**。ffxは「コアプラグイン」の箇条書きリストにすでにあるFFIサブセット（リテラルの`attach_function`、`ffi_lib`、プリミティブ型シンボル）のみを受け付けるため、ffx固有のレコグナイザーは不要。これは実質的に朗報——`rigor-ffi`の最初の具体的な消費者をffx固有の作業ゼロでsqliteffxにできることを意味する。

**（2）新しい診断ファミリーの機会 — `ffx.unsupported-feature`**。プロジェクトのgemspecが`ffx` gemを解決する（または`extconf.rb`で`FFX.create_makefile`を使用する）場合、プラグインはffx非互換な宣言を静的に検出して診断できる:

- `callback :foo, [...], :int` → `ffx.unsupported-callback`
- `class S < FFI::Struct` → `ffx.unsupported-struct`
- `typedef :pointer, :handle` → `ffx.unsupported-typedef`
- `enum :state, [:open, :closed]` → `ffx.unsupported-enum`
- `attach_function :printf, [:string, :varargs], :int` → `ffx.unsupported-varargs`
- ffx-25リスト外の任意の型シンボル → `ffx.unsupported-type`

これらはffxがコンパイルに失敗するケースそのものなので、診断は実際の今日のバグを表面化する——スタイルの好みではない。プロジェクトの設定経由のオプトイン（rigor-ffi設定の`target: ffx`軸）の強力な候補でもある——「ffx gemを使う」は存在ベースであり、デュアルターゲットgemでノイズを表面化すべきでない。

**（3）ポインターパラメーター入力セットを拡大**。`:pointer`パラメーターの推奨型は`FFI::Pointer | Integer | nil`（ロバストネス: 入力には寛容に）。`:pointer`を返す関数の戻り型は厳密でターゲット依存のまま: ffi-gemターゲットは`FFI::Pointer`、ffxターゲットは`Integer`。

**（4）長期的、オプション — 二次シグネチャソースとしての`FFI0`トランポリンメタデータの解析**。プラグインがRubyバインディングファイルが隠れている（ベンダーブロブ、カスタムラッパー）がインストール済みの`.so`が存在するgemに遭遇したとき、`FFI0`マジック + type-byteブロブを解析することで`(name, arity, param_types, return_type)`をバイナリから回収できる。これはトランポリンメタデータの「静的解析フレンドリー性」が取れる最も強い形式。初期プラグインのスコープ外（プラットフォーム対応のELF / Mach-O / PE解析が必要）だが将来の方向として記録に値する——ffxエコシステムが持つバイナリタイプスタブに最も近いもの。

### 更新されたオープンクエスチョン

メインノートのクロージングセクションの4つの質問に加えて:

- **ターゲット検出** — `rigor-ffi`はffxターゲットを`Gemfile.lock` / gemspecのランタイム依存から自動検出すべきか、明示的設定を要求すべきか、それとも両方か？ 自動検出はユーザーフレンドリーだがバンドラー / gemspec解析に結合する。
- **デュアルターゲットgem** — 実世界のgemがffi-gemとffxのコードパスを条件付きで出荷しているか？ もしそうなら、`ffx.unsupported-feature`診断には宣言ごとの抑制メカニズムが必要（既存の`# rigor:disable`で十分なはず）。
- **`rigor-fiddle`との境界** — `Fiddle`は別のStdlib FFIメカニズム（sqliteffxがアウトパラメータースロット読み取りに使用）。`rigor-ffi`のスコープ内に入れるか、それとも兄弟`rigor-fiddle`プラグインか？ おそらく兄弟——異なるDSLサーフェス、異なるバインディング登録形状。
