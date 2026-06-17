---
title: "バグ報告ドラフト — `prepare_callable_method_entry`での`Ruby::Box` SIGSEGV"
description: "Imported from rigortype/rigor docs/notes/20260602-ruby-box-segfault-bug-report.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260602-ruby-box-segfault-bug-report.md"
sourcePath: "docs/notes/20260602-ruby-box-segfault-bug-report.md"
sourceSha: "63643e4a29d8f780b2796481c79030d22f99b1ee3f41810fad280cb7f983c298"
sourceCommit: "d5d6614800bfc53f00e23b51f4c914d0e42f237f"
translationStatus: "translated"
sidebar:
  order: 20266602
---

[bugs.ruby-lang.org](https://bugs.ruby-lang.org)向けのドラフト（[How To Report](https://github.com/ruby/ruby/wiki/How-To-Report)に従う）。ADR-39スライス5（プラグインのターゲットライブラリ分離のためにRigorのアナライザーを`RUBY_BOX=1`のもとで実行する）のプロトタイピング中に表面化した。

---

**カテゴリー:** core
**対象バージョン:** master / 4.0
**`ruby -v`:** `ruby 4.0.5 (2026-05-20 revision 64336ffd0e) +PRISM [arm64-darwin25]`

## 概要

実験的な`Ruby::Box`を有効化（`RUBY_BOX=1`）して大きなプログラムを実行すると、VMのメソッドルックアップパス（`rb_vm_search_method_slowpath` → `callable_method_entry_or_negative` → `prepare_callable_method_entry`）の内部で`SIGSEGV`（`0x0`でのnullポインタ参照）でクラッシュする。同一のプログラムを`RUBY_BOX=1`**なし**で実行すると正常に完了する。つまり`Ruby::Box`の有効化は、十分に複雑なワークロードでNULLを参照しうる形でメソッドエントリーの解決を変える。

## 再現手順

自己完結した純粋Rubyのリプロデューサーはまだ切り出せていない（「メモ」を参照）;最小の信頼できる再現は、`rigor`静的アナライザーの単一ファイル実行である（これは入力を*パースして静的に解析するだけ*で、決して実行しない）:

1. `ruby 4.0.5`、arm64-darwin（macOS）。
2. 十分に複雑なRubyファイルを1つ（ここではRedmineの`app/models/issue.rb`、約2,140行）、ボックスを有効にして静的解析する:
   ```
   RUBY_BOX=1 bundle exec rigor check app/models/issue.rb   # SIGSEGV
   bundle exec rigor check app/models/issue.rb              # exit 0
   ```
   `Ruby::Box.new`のサブボックスは作成されない——プロセス全体の`RUBY_BOX=1`フラグが設定されるだけである;クラッシュはアナライザーの実行中の通常の（メインボックスの）メソッドディスパッチで起きる。

## 再現手順の結果

`SIGSEGV`。クラッシュレポート（抜粋）:

```
... [BUG] Segmentation fault at 0x0000000000000000
ruby 4.0.5 (2026-05-20 revision 64336ffd0e) +PRISM [arm64-darwin25]

-- C level backtrace information -------------------------------------------
libruby-4.0.5.dylib(rb_vm_bugreport+0xbc8)
libruby-4.0.5.dylib(rb_bug_for_fatal_signal)
libruby-4.0.5.dylib(sigsegv)
libsystem_platform.dylib(_sigtramp+0x38)
libruby-4.0.5.dylib(prepare_callable_method_entry)          <-- crash
libruby-4.0.5.dylib(prepare_callable_method_entry)
libruby-4.0.5.dylib(callable_method_entry_or_negative)
libruby-4.0.5.dylib(rb_vm_search_method_slowpath)
libruby-4.0.5.dylib(vm_exec_core)
libruby-4.0.5.dylib(rb_vm_exec)
... (deep rb_yield / rb_ary_each / vm_exec_core recursion below)
```

Rubyレベルの制御フレームは深い再帰的な`each`駆動の評価を示している;フォルトはその再帰中にメソッドを解決している際に発生する。終了ステータス139（`SIGSEGV`）。

## 期待される結果

プログラムは（`RUBY_BOX=1`なしのときのように）完了するか、通常のRubyレベルの例外を発生させるべきである。VMは`prepare_callable_method_entry`でNULLを参照してはならない;`Ruby::Box`の有効化が、動作するプログラムをsegfaultに変えるべきではない。

## メモ／最小化の状況

二分探索によって確立されたこと:

- **`RUBY_BOX=1`がトリガー**。上記のすべてのコマンドはそれなしでは0で終了する。
- **`Ruby::Box.new`のサブボックスとは独立** — プロセス全体のフラグだけを設定して再現する;ユーザーボックスは作成されない。
- **単一の入力ファイルに二分探索**。 Redmineの`app/`全体でのクラッシュ → `app/models/`（86ファイル）に絞り込み → 単一ファイル`app/models/issue.rb`まで二分探索した。その約2,140行のファイル1つだけが`RUBY_BOX=1`のもとでsegfaultする;アナライザー自身のソース（`rigor check lib`、248ファイル）は`RUBY_BOX=1`のもとでクラッシュ**しない**。したがってトリガーはファイル数ではなく、`RUBY_BOX=1` + 十分に複雑な1ファイルの解析の*組み合わせ*である。
- これは「劣化／RBS環境なし」パスでは**ない**: 意図的に不正な形式の`sig/`（RBS環境構築が失敗するように）で248ファイルを`RUBY_BOX=1`のもとで解析してもクラッシュしない。

それを再現**しなかった**もの（`RUBY_BOX=1`のもとでの純粋Rubyの試み）:

- 単純な深い再帰（`def f = f; f` → 通常の`SystemStackError`）。
- 300個のモジュールをインクルードしたクラスにわたるメガモルフィックディスパッチ + 再帰。
- メガモルフィックなノードごとのディスパッチを伴う、ネストされた`each`ブロック経由で再帰的に走査される131kノードのツリー。
- 40段の深さの`super`ミックスインチェイン × 120サブクラス + `GC.stress`。
- `require "rbs"` / `Ruby::Box.new` + `box.require`（問題なくロードされる）。

したがってフォルトは、単純な合成では捉えられないアナライザーのホットパスに固有のメソッド解決パターンを必要とする;自己完結した最小リプロデューサーはまだ未解決である。完全なmacOSクラッシュレポート（`~/Library/Logs/DiagnosticReports`）を添付できる。`RUBY_BOX`のもとで`prepare_callable_method_entry`が何をNULLとして参照するかについてのポインタを歓迎する——Cバックトレースはフォルトを`rb_vm_search_method_slowpath` → `callable_method_entry_or_negative` → `prepare_callable_method_entry`に位置づけている。
