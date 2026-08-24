---
title: "バグ報告 — `Ruby::Box` SIGSEGV: 分離されたprocがボックスを失う（根本原因判明）"
description: "rigortype/rigor docs/notes/20260602-ruby-box-segfault-bug-report.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260602-ruby-box-segfault-bug-report.md"
sourcePath: "docs/notes/20260602-ruby-box-segfault-bug-report.md"
sourceSha: "679bbbd0069269dec639fe6ef1e6563846fb2c9b633081678e4625970fa255bb"
sourceCommit: "bed65a462b04db02312f208b9dda2dda3a26ef13"
translationStatus: "translated"
sidebar:
  order: 20266602
---

[bugs.ruby-lang.org](https://bugs.ruby-lang.org)向けのドラフト（[How To Report](https://github.com/ruby/ruby/wiki/How-To-Report)に従う）。ADR-39スライス5（プラグインのターゲットライブラリ分離のためにRigorのアナライザーを`RUBY_BOX=1`のもとで実行する）のプロトタイピング中に表面化した。

**2026-08-24更新 —— 根本原因を特定し、最小リプロデューサーを発見し、パッチを書いて検証済み**。元のドラフト（履歴として下に残す）は自己完結したリプロデューサーを切り出せなかった;欠けていた材料は、クラス／モジュール本体で定義されたprocへの`Ractor.make_shareable`だった。このセクションのすべてが、元のドラフトの「メモ／最小化の状況」を置き換える。

---

**カテゴリー:** core
**対象バージョン:** master（`042e2bfd39`、2026-08-24で再現;元は4.0.5で遭遇）
**`ruby -v`:** `ruby 4.1.0dev (2026-08-24T10:31:23Z master 042e2bfd39) +PRISM [arm64-darwin25]`

## 概要

`RUBY_BOX=1`のもとでは、**`Ractor.make_shareable`によって分離され、クラスまたはモジュール本体で定義されたprocの内側でのあらゆるメソッド呼び出し**が、メソッドルックアップパス内のアドレス0x0での`SIGSEGV`でVMをクラッシュさせる。同じプログラムは`RUBY_BOX=1`なしでは問題なく実行され、（クラス本体ではなく）メソッド内で定義されたprocは影響を受けない。

## 再現

```
RUBY_BOX=1 ruby -e 'module M; L = Ractor.make_shareable(->(*a){ Rational(*a) }); end; p M::L.call(3, 4)'
# => -e:1: [BUG] Segmentation fault at 0x0000000000000000
ruby -e 'module M; L = Ractor.make_shareable(->(*a){ Rational(*a) }); end; p M::L.call(3, 4)'
# => (3/4)
```

本体は無関係だ —— `a.to_s`、`1.zero?`、`String.name`のいずれも同じようにクラッシュする;クラッシュに必要なのは（a）`RUBY_BOX=1`、（b）レキシカルに包含するローカルenvがTOP/CLASSフレームであるproc、（c）それに適用された`Ractor.make_shareable`（または`Proc#isolate`）、そして（d）呼び出しの内側での任意のメソッドディスパッチ、だけである。

## 根本原因

`VM_FRAME_MAGIC_TOP` / `VM_FRAME_MAGIC_CLASS`フレームでは、envのSPECVALスロット（`ep[VM_ENV_DATA_INDEX_SPECVAL]`）はブロックハンドラではなく**ボックスポインタ**を格納する —— それが`VM_ENV_BOX()`の読み取るものであり、そのようなフレームのもとで実行されるコードに対して`rb_current_box()`が`current_box_on_cfp()`を通して返すものである。

`Ractor.make_shareable` → `proc_isolate_env()`が使う`env_copy()`（vm.c）は、ローカルenvを次のコードで再構築する:

```c
    else {
        ep[VM_ENV_DATA_INDEX_SPECVAL] = VM_BLOCK_HANDLER_NONE;
    }
```

そのためコピーされたenvはフレームタイプ（MAGIC_CLASS、FLAGSの内側にコピーされる）を保つが、**そのボックスを失う**。呼び出し時、分離されたprocの内側での最初のメソッドルックアップは`lep`をそのenvまで辿り、`current_box_on_cfp()`のTOP/CLASS分岐を取り、`VM_ENV_BOX(lep) == NULL`を得る;続いてclassextルックアップが`box->box_object` —— `rb_box_t`のオフセット0 —— を参照し、これが`rb_vm_search_method_slowpath` → `search_method0`（元の報告の4.0.5リリースビルドのバックトレースでは`prepare_callable_method_entry`としてインライン化されている）のもとで観測された`SIGSEGV at 0x0000000000000000`である。

## 修正（検証済み）

ソースのenvがTOP/CLASSフレームに属するときはSPECVALスロットを保存する:

```c
    else if (VM_ENV_BOXED_P(src_ep)) {
        // A TOP/CLASS local env stores its box, not a block handler, in the
        // SPECVAL slot (VM_ENV_BOX). Preserve it: method lookup inside the
        // isolated proc reads the box back via rb_current_box(), and a
        // cleared slot dereferences a NULL box.
        ep[VM_ENV_DATA_INDEX_SPECVAL] = src_ep[VM_ENV_DATA_INDEX_SPECVAL];
    }
```

パッチ＋リグレッションテスト（`test/ruby/test_box.rb`の`test_method_call_in_isolated_proc_from_class_frame`）はローカルのCRubyチェックアウト`~/local/src/ruby`、ブランチ`fix/box`、コミット`17c202960e`（master `042e2bfd39`の上）にある。red/green検証済み: このテストはvm.cの変更なしでは失敗し（分離されたプロセスでのsegfault）、変更ありでは成功する;修正ありで`test_box.rb`＋`test_proc.rb`＋`test_ractor.rb`はすべて緑（288テスト、失敗0）。

修正ありで、元の実世界ワークロード —— `RUBY_BOX=1`のもとでのRedmineの`app`全体に対する`rigor check` —— は完走し、`ruby_box`プラグイン分離戦略は`none` / `process`戦略と同一の診断を生成する（PR #469）。

## なぜRigorがこれを踏んだのか

Rigorは、ワーカープール向けの標準パターンとしてモジュールスコープのラムダをRactor共有可能にしている（例: `KernelDispatch::NUMERIC_CONSTRUCTORS`、`Ractor.make_shareable(->(*args) { Rational(*args) })`）。推論がそのようなfoldに到達するファイル（Redmineの`app/models/issue.rb`は`Rational`コンストラクタのfoldをトリガーする）を解析すると、分離されたprocの呼び出し → proc内での最初のメソッドディスパッチ → クラッシュとなる。それが、元の二分探索が1つの入力ファイルに収束した理由であり、単純な合成的な再帰／ディスパッチのストレスでは決して再現しなかった理由だ。

## 副次的なupstreamの発見 —— `Ruby::Box#require`はボックスのRubyGemsを参照しない

クラッシュではないが、併せて報告する価値がある: `Ruby::Box#require`は`rb_require_string()`を直接呼び出し、これは素の`$LOAD_PATH`に対してのみ解決する。ボックス自身のRubyGems（`doc/language/box.md`のとおり、各ボックスはRubyGemsを独立にロードする）は決して実行されないため、gemとしてインストールされたライブラリは`Box#require`経由では到達不能である一方、`box.eval("require 'the_gem'")`は成功する（ボックス内の`Kernel#require`経由のgemアクティベーション）。非対称性:

```ruby
b = Ruby::Box.new
b.eval("require 'active_support/inflector'")  # => true; gem activates
Ruby::Box.new.require("active_support/inflector") # => LoadError
```

Rigorはボックス内requireへのフォールバックでこれを回避している（PR #469）;upstreamへの問いは、`Box#require`がボックスの`Kernel#require`のように振る舞うべきか、である。

---

## 元のドラフト（2026-06-02、置き換え済み —— 提出物の履歴として保存）

**`ruby -v`:** `ruby 4.0.5 (2026-05-20 revision 64336ffd0e) +PRISM [arm64-darwin25]`

実験的な`Ruby::Box`を有効化（`RUBY_BOX=1`）して大きなプログラムを実行すると、VMのメソッドルックアップパス（`rb_vm_search_method_slowpath` → `callable_method_entry_or_negative` → `prepare_callable_method_entry`）の内部で`SIGSEGV`（`0x0`でのnullポインタ参照）でクラッシュする。同一のプログラムを`RUBY_BOX=1`**なし**で実行すると正常に完了する。

当時知られていた最小の信頼できる再現は、Redmineの`app/models/issue.rb`（約2,140行）に対する`rigor`静的アナライザーの単一ファイル実行だった:

```
RUBY_BOX=1 bundle exec rigor check app/models/issue.rb   # SIGSEGV
bundle exec rigor check app/models/issue.rb              # exit 0
```

当時二分探索によって確立されたこと: `RUBY_BOX=1`がトリガーである;ユーザーのサブボックスは関与しない;その単一ファイルまで二分探索した;劣化したRBS環境なしのパスではない。再現**しなかった**純粋Rubyの試み: 深い再帰、300クラスにわたるメガモルフィックディスパッチ、131kノードの再帰的な`each`走査、40段の深さの`super`ミックスインチェイン × 120サブクラス＋`GC.stress`、素の`Ruby::Box.new`＋`box.require`。（これらはいずれも真の材料、すなわちクラス本体のprocへの`Ractor.make_shareable`を欠いていた。）
