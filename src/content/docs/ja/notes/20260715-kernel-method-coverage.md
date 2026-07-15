---
title: "Kernelメソッドのカバレッジ監査"
description: "rigortype/rigor docs/notes/20260715-kernel-method-coverage.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260715-kernel-method-coverage.md"
sourcePath: "docs/notes/20260715-kernel-method-coverage.md"
sourceSha: "b83b31ff2beb4604c929780fe46888500ce8c42c8096deb888919c7efa13d510"
sourceCommit: "026f5700e2e13ed5e8e99e9df80a2871ab4293ab"
translationStatus: "translated"
sidebar:
  order: 20266715
---

2026-07-15。Ruby 4.0.5上のFlake内で列挙した結果は次のとおり。

- `Kernel.private_instance_methods(false)` — 70メソッド（あらゆる暗黙のself呼び出しが到達するモジュール関数のサーフェス（surface））。
- `Kernel.public_instance_methods(false)` — 43メソッド（Kernelが寄与するObjectプロトコル）。
- `Kernel.methods - Module.methods` — 60個のシングルトン。各エントリーはプライベートインスタンスメソッド（`module_function`の双子）を反映しているため、下記の表がそれらをカバーする——独立したセクションは設けない。

`KernelDispatch`の精密ティア（`lib/rigor/inference/method_dispatcher/kernel_dispatch.rb`）、静的リファインメントのオーバーライド表（`Rigor::Builtins::StaticReturnRefinements`）、`MutationWidening::PURE_SELF_RETURNERS`（ADR-76）、そしてRBSフォールバック（使い捨てのフィクスチャに`dump_type`を`--no-cache`で当てて探査）と相互参照した。

## 凡例

| 記号 | 意味 |
|--------|---------|
| ✅ | 精密ティアで実装済み。 |
| 🔷 | 別のティアで十分（RBSのエンベロープがすでに厳密か、フローエンジンが担当している）。 |
| 🔲 | ギャップ——精密な`Constant[T]` / `Tuple` / パススルー結果が達成可能。 |
| 🚫 | スコープ外——非決定的、作用を伴う、または環境依存。RBSの幅広い型が正しい。 |

## 1. プライベートインスタンスメソッド（70）——モジュール関数のサーフェス

### 変換／コンストラクタ関数

| メソッド | ステータス | ティア | 注記 |
|--------|--------|------|------|
| `Array` | ✅ | KernelDispatch | シェイプ（shape）の畳み込み: `Array(nil)→Array[bot]`、Tuple/Array/Union/スカラーの分配。 |
| `Integer` | ✅ | KernelDispatch | 基数を含む定数畳み込み（`Integer("ff",16)→255`）＋`decimal-int-string`リファインメント経路。 |
| `Float` | ✅ | KernelDispatch | 定数畳み込み、rescueでガード。 |
| `Rational` | ✅ | KernelDispatch | Rubyの正規化を伴う数値定数の畳み込み。 |
| `Complex` | ✅ | KernelDispatch | 数値定数の畳み込み、1引数形式と2引数形式。 |
| `String` | 🔲→✅ | KernelDispatch（本セッション） | 値がピン留めされたスカラーConstantに対する`String(v)`は`Constant[String]`に畳み込まれる（`String(42)→"42"`）。rescueでガードし、それ以外は辞退する。 |
| `Hash` | 🔲→✅（部分的） | KernelDispatch（本セッション） | 自明に健全なスライス（slice）のみ: `Hash(hash_shape)`のパススルー、`Hash(nil)` / `Hash([])`（空のTuple）→空の`HashShape`。`to_hash`プロトコルの引数は先送り（型だけからは決定不能）。 |
| `Pathname` | 🔷 | RBS | `Pathname`を返す。ここに追加する価値のあるPathname定数向けの値レベルのキャリア（carrier）はない（Pathnameのインスタンス畳み込みはMethodFoldingが担当）。 |

### 出力／整形

| メソッド | ステータス | ティア | 注記 |
|--------|--------|------|------|
| `p` | 🔲→✅ | KernelDispatch（本セッション） | 恒等型付け: 1引数→引数の型をそのまま（精度保存、Dynamicが入ればDynamicが出る）。2引数以上→引数の型の`Tuple`。0引数→辞退（RBSの`nil`がすでに厳密）。splat／転送された引数、明示的な外部レシーバー、ユーザー再定義では辞退する。 |
| `pp` | 🔲→✅ | KernelDispatch（本セッション） | `p`と同じ恒等型付け。 |
| `format` | 🔲→✅ | LiteralStringFolding（本セッション） | 全引数が値ピン留めのときの厳密な畳み込みを、既存の`fold_format`リフトに重ねた（このティアはKernelDispatchより前に走り、すでにこの呼び出しを担当していた）: `format("%d", 1)→Constant["1"]`。rescueでガード（不正なディレクティブなら`literal-string`リフトへ辞退して差し戻す）し、`STRING_FOLD_BYTE_LIMIT`で上限を設ける。`String#%`の畳み込みは二項演算子の綴りしかカバーしていなかった。 |
| `sprintf` | 🔲→✅ | LiteralStringFolding（本セッション） | `format`のエイリアス。同じ畳み込み。 |
| `puts` | 🔷 | RBS | `-> nil`がすでに厳密。 |
| `print` | 🔷 | RBS | `-> nil`がすでに厳密。 |
| `printf` | 🔷 | RBS | `-> nil`（IO書き込みが要点。戻り値は厳密）。 |
| `putc` | 🔷 | RBS | RBSのオーバーロードに従い引数を返す。作用を伴い、精度向上は無視できる。 |
| `warn` | 🔷 | RBS | `-> nil`がすでに厳密。 |
| `display` | 🔷 | RBS | （public）`-> nil`。 |

### 制御フロー／ブロック——ディスパッチではなくフローエンジンが担当

| メソッド | ステータス | 注記 |
|--------|--------|------|
| `loop` | 🔷 | 制御フロー。フローエンジンがブロック本体を評価する（`eval_loop`、ADR-56スライスB）。break値のチャネルが式を型付けする。 |
| `catch` / `throw` | 🔷 | 非局所制御フロー。`throw`は発散する（`bot`）。`catch`の値チャネルはディスパッチの畳み込みではない——引き上げがあるならフローエンジンに属する。 |
| `lambda` / `proc` | 🔷 | `Proc`を返す。ブロックパラメータの束縛とブロック本体の型付けは、Kernelの畳み込みではなく`BlockParameterBinder` / `ExpressionTyper`が担当する。 |
| `block_given?` / `iterator?` | 🔷 | RBSの`bool`が厳密。鋭くするための静的なブロック存在ファクト（fact）は追跡していない。 |
| `raise` / `fail` | 🔷 | 発散する（`bot`）。フローエンジンはすでにraiseのエッジを終端として扱う。 |
| `exit` / `exit!` / `abort` | 🔷 | RBSに従い発散する（`bot`）。 |
| `at_exit` | 🚫 | 作用を伴う登録。RBSの`Proc`で問題ない。 |

### 非決定的／作用を伴う／環境依存（RBSの幅広い型が正しい）

| メソッド | ステータス | 注記 |
|--------|--------|------|
| `rand` / `srand` | 🚫 | 定義上、非決定的。畳み込めば誤りになる。 |
| `gets` / `readline` / `readlines` / `select` / `open` / `` ` ``（バッククォート） | 🚫 | IO。ランタイム依存。（`Kernel#select`のRBSは既知の`-> Array[String]`の危険——ADR-57 WD3で再現しないと計測済み。） |
| `system` / `exec` / `spawn` / `fork` / `syscall` | 🚫 | プロセス作用。結果はホストに依存する。 |
| `sleep` | 🚫 | 作用を伴う。戻り値（経過秒数）はランタイム依存。 |
| `binding` | 🚫 | RBSの`Binding`が厳密。値自体はコンテキスト依存。 |
| `caller` / `caller_locations` | 🚫 | コールスタック依存。 |
| `eval` / `load` / `require` / `require_relative` / `gem` / `gem_original_require` / `autoload` / `autoload?` | 🚫 | コード読み込みの作用。`require` → `bool`は重要な箇所ではすでに厳密。 |
| `test` | 🚫 | ファイルシステムの探査。 |
| `trap` / `set_trace_func` / `trace_var` / `untrace_var` | 🚫 | VMフックの登録。 |
| `global_variables` / `local_variables` / `instance_variables_to_inspect` | 🚫 | ランタイム状態に対するリフレクション。 |
| `respond_to_missing?` / `initialize_clone` / `initialize_copy` / `initialize_dup` | 🚫 | プロトコルフックであり、呼び出し箇所で畳み込めない。 |

### 十分に厳密なRBSを持つイントロスペクション

| メソッド | ステータス | 注記 |
|--------|--------|------|
| `__method__` / `__callee__` | 🔷 | `Symbol?`。def本体ごとの定数畳み込みは可能だが、消費側の需要がゼロ——先送り。 |
| `__dir__` | 🔷 | `StaticReturnRefinements`ティアによってすでに`non-empty-string?`に絞り込まれている。 |

## 2. パブリックインスタンスメソッド（43）——Objectプロトコル

既存のエンジンサーフェスが処理する。一様な箇所は行ごとではなくグループ単位で列挙する。

| メソッド | ステータス | 注記 |
|-----------|--------|------|
| `itself` / `dup` / `clone` / `freeze` | ✅ | ADR-76の純粋なself返却メソッド: シェイプのキャリアは保存され、ファクトも保たれる。 |
| `frozen?` | 🔷 | RBSの`bool`。`Constant`レシーバーの畳み込みは可能だが、凍結性はキャリア上で追跡していない——スキップ（タダではない。タスク規則）。 |
| `nil?` / `is_a?` / `kind_of?` / `instance_of?` / `===` / `!~` / `<=>` / `eql?` | 🔷/✅ | 述語のナローイング（narrowing）はフローエンジン（`Narrowing`）が担当する。`nil?`／`is_a?`は現状でエッジを絞り込む。 |
| `class` / `singleton_class` | ✅ | メタイントロスペクションのティア（`try_meta_introspection`）。 |
| `to_s` / `inspect` / `hash` | 🔷/✅ | `ConstantFolding`がクラス別のカタログを介してスカラー定数レシーバー上でこれらを畳み込む。幅広いレシーバーは正しくRBSに落ちる。 |
| `tap` / `then` / `yield_self` | 🔷 | `BlockFolding`／ブロック評価によってブロック型付けされる。 |
| `send` / `public_send` / `__send__` | 🔷 | 値がピン留めされたリテラルのメソッド名でのみ畳み込む（ADR-78の`REFLECTIVE_SEND_METHODS`ガード）。 |
| `method` / `public_method` / `singleton_method` / `methods` / `public_methods` / `private_methods` / `protected_methods` / `singleton_methods` / `instance_variables` | 🚫 | ランタイムリフレクション。RBSの幅広い型が正しい。 |
| `instance_variable_get` / `instance_variable_set` / `instance_variable_defined?` / `remove_instance_variable` | 🚫 | 動的なivarアクセス。静的なivarの扱いはADR-58が担当する。 |
| `define_singleton_method` / `extend` | 🚫 | メタプログラミングの作用。 |
| `enum_for` / `to_enum` | 🚫 | Enumeratorを返すスタブ。 |
| `object_id` | 🚫 | ランタイムの同一性。 |

## 3. 実装チェックリスト

- 🔴 高（本セッション）: `p` / `pp`の恒等型付けと`String()`の定数畳み込みは`KernelDispatch`（既存のKernel精密ティア——新しいティアファイルは不要）に着地する。`format` / `sprintf`の厳密な畳み込みは`LiteralStringFolding#fold_format`に着地する（このティアはKernelDispatchより前に位置し、すでにformatの綴りを担当していた——厳密な畳み込みは既存の発火エンベロープ内での厳密なリファインメントである）。
- 🟡 中（本セッション、自明に健全なスライス）: `Hash()`のHashShapeパススルー＋空への畳み込み。先送り: `to_hash`プロトコルの引数。
- 🟢 低／先送り: `__method__`の本体ごとの定数。`catch`の値チャネル型付け（フローエンジン）。`URI()`（`URIFolding`の`Singleton["URI"]`レシーバーとともに存在し、トップレベルの`URI(...)`の綴りはKernelを介して解決される——需要待ちで先送り）。`frozen?`の些末事。

すべての新しい畳み込みが共有するガード（偽陽性エンベロープ）: 呼び出しに明示的な非`self`レシーバーがあるとき（Kernelのサーフェスはprivate——そのような呼び出しはユーザーメソッド）、レシーバーのクラス（またはトップレベル）にその名前のユーザー再定義が発見されたとき、または引数リストにsplat／転送ノードが含まれるとき（アリティ（arity）が静的に判明しない）は辞退する。

## 4. 実装ファイルの参照

- `lib/rigor/inference/method_dispatcher/kernel_dispatch.rb` — `p` / `pp`の恒等、`String()`、`Hash()`（＋共有の`kernel_owned_call?` / splatアリティのガード）。
- `lib/rigor/inference/method_dispatcher/literal_string_folding.rb` — `format` / `sprintf`の厳密な定数畳み込み（`fold_format_constant`）。
- 単体スペック: `spec/rigor/inference/method_dispatcher/kernel_dispatch_spec.rb`、`spec/rigor/inference/method_dispatcher/literal_string_folding_spec.rb`。
- 統合フィクスチャ: `spec/integration/fixtures/kernel_functions.rb`（フラット——KernelはRBSコアであり、stdlibのライブラリ読み込みは不要）。
