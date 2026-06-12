---
title: "ADR-57 Slice 1 — gate-open firing adjudication (2026-06-12)"
description: "Imported from rigortype/rigor docs/notes/20260612-adr57-adjudication.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260612-adr57-adjudication.md"
sourcePath: "docs/notes/20260612-adr57-adjudication.md"
sourceSha: "646df6de7d2b8d2e2b26be6148776e66e81be584c70f7777e34cd946a7c469f6"
sourceCommit: "95ff0e09e408504d17102725823e1978301d05ef"
translationStatus: "translated"
sidebar:
  order: 20266612
---

手法: post-ADR-55/56エンジン上で`ExpressionTyper#adoptable_self_call_result?`を一時的に`return true`へ強制し（ゲートを完全に開く）、`rigor check --no-cache lib`と3つのコーパス（Mastodon `app/models`、haml `lib`、kramdown `lib`）の出力を、それぞれのゲート閉時の実行結果と差分比較した。各発火は*genuine*（採用された型が正しく、diagnostic（診断）が妥当）か*artifact*（採用された型が誤り――評価器の盲点）に分類した。ゲート閉時のベースライン（baseline）は4つの対象すべてで発火ゼロなので、ゲート開時の集合全体がそのまま差分となる。

## セルフチェック差分（`rigor check lib`）――25発火、修正前

| file:line | diagnostic | ヘルパー | 採用された型 | 実際の挙動 | 判定 | メカニズム |
| --- | --- | --- | --- | --- | --- | --- |
| scope_indexer.rb:1783 | always-truthy | `record_class_or_module?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return false` dropped (tail-only eval) |
| scope_indexer.rb:1785 | always-truthy | `record_meta_new_constant?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return false` dropped |
| method_dispatcher.rb:118 | always-falsey | `dispatch_precise_tiers` (via `precise`) | non-nil | `T?` | ARTIFACT | early `return` dropped |
| method_dispatcher.rb:967 | always-falsey | `class_new_lift` | non-nil | `T?` | ARTIFACT | early `return` dropped |
| constant_folding.rb:1151 | always-truthy | `safe?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return false` dropped |
| expression_typer.rb:923 | always-falsey | `Range` static-fold guard | non-nil | varies | ARTIFACT | early `return` dropped |
| sig_gen/generator.rb:161 | always-truthy | `descend_into_namespace?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return false` dropped |
| sig_gen/generator.rb:762 | always-falsey | `top_level_union?` | folded | `true \| false` | ARTIFACT | early `return` dropped (in block) |
| sig_gen/writer.rb:272 | always-falsey | `find_class_decl` (via `anchor_decl`) | folded | decl-or-nil | ARTIFACT | early `return decl` dropped |
| sig_gen/writer.rb:274 | always-falsey | `find_class_decl` (via `anchor_decl`) | folded | decl-or-nil | ARTIFACT | early `return` dropped |
| triage/catalogue.rb:291 | always-falsey | predicate (via `receiver`) | folded | `T?` | ARTIFACT | early `return nil` dropped |
| annotate_command.rb:92 | always-truthy | `parse_errors?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return false` dropped |
| trace_command.rb:44 | always-falsey | `file_exists?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return true` dropped |
| trace_command.rb:76 | always-truthy | `parse_errors?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return false` dropped |
| type_of_command.rb:72 | always-falsey | `file_exists?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return true` dropped |
| type_of_command.rb:77 | always-truthy | `parse_errors?` | `Constant[true]` | `true \| false` | ARTIFACT | early `return false` dropped |
| baseline_command.rb:246 | arg-type (`load`) | `parse_drift_options` Hash | `Hash[Symbol, "….yml"?]` | options Hash (String-bearing after parse) | GENUINE (RBS) | `Configuration.load` RBS is `?String`, body handles nil — RBS too strict |
| baseline_command.rb:320 | arg-type (`load`) | `parse_prune_options` Hash | nil-bearing | same | GENUINE (RBS) | same |
| plugins_command.rb:71 | arg-type (`load`) | `parse_options` Hash | `nil` | `String?` | GENUINE (RBS) | same |
| triage_command.rb:29 | arg-type (`load`) | `parse_options` Hash | `nil` | `String?` | GENUINE (RBS) | same |
| triage_command.rb:35 | always-falsey | `parse_options` Hash (`:format`) | `"text"` | `"text" \| <cli>` | ARTIFACT | block-captured Hash-element write (`options[:k]=v` in `opts.on{}`) invisible |
| diff_command.rb:48 | always-falsey | `parse_options` Hash (`:current_path`) | `nil` | `nil \| <cli>` | ARTIFACT | same (block-captured Hash-element write) |
| loader.rb:76 | possible-nil-recv | `topo_sort_plugins` → `kahn_collect` | `Plugin?` element | non-nil (in_degree invariant) | GENUINE-conservative | `Array#find` optionality (line 313); runtime invariant rules nil out, but `find` is soundly `Elem?` |
| method_catalog.rb:79 | return-type (`reset!`) | n/a (assignment-return) | `Hash` | `Hash` | GENUINE (RBS) | RBS `reset!: () -> nil` wrong — `@catalog = …` returns the Hash |
| constant_folding.rb:1176 | always-falsey | `string_unary_blow_up?` | `Constant[false]` | `false` (stub) | GENUINE | method really always returns `false` (stub); benign dead guard |

### メカニズムのグルーピング

1. **末尾のみを評価する本文評価器が、明示的なearly-`return`の値を取りこぼす（15発火）**。支配的なartifactクラス。修正済み。
2. **ブロックでキャプチャされたHash要素への書き込み（`OptionParser#on`ブロック内の`options[k]=v`）が書き戻されない（3発火: triage:35、diff:48、sig_gen_command:59――最後の1件はfix-1が`options.nil?`を露呈させて初めて表面化した）**。 ADR-56のキャプチャ済み変更ファミリーのHash要素バリアント。本スライスでは未修正。
3. **`Configuration.load`のRBS `?String`が厳しすぎる（fix-1後のsig_gen_command:50を含め5発火）**。自作のRBSバグ――`load`の本文は`path || discover`でnilチェックを行うので、RBSは`?String?`であるべき。GENUINE-via-RBS。1行のシグネチャ拡張であって、エンジンのartifactではない。
4. **`reset!`のRBS `() -> nil`が誤り（1）**。 GENUINE-via-RBS。
5. **`Array#find`のオプショナル性（loader.rb:76、1）**。健全な保守性。実行時不変条件（Kahnの`in_degree.zero?`）がnilを排除する。出荷すればFPの危険があり、戻り値推論の修正ではなくフローナローイングが必要。
6. **スタブのalways-falseガード（constant_folding:1176、1）**。 GENUINE、無害。

## コーパス差分（ゲート開、fix-1後）

| 対象 | 発火 | ヘルパー | 採用 | 実際 | 判定 | メカニズム |
| --- | --- | --- | --- | --- | --- | --- |
| haml parser.rb:469 | possible-nil-recv (`-`) | `parse_tag` → `parse_old/new_attributes` 3rd tuple elt | `Integer?` | `Integer` (`\|\| @line.index+1` strips) | ARTIFACT | multi-value `return a, b, c` not collected as a Tuple → over-optional destructure |
| haml parser.rb:470 | possible-nil-recv (`-`) | same | same | same | ARTIFACT | same (multi-value-return gap) |
| kramdown html.rb:193 | always-falsey | `inner` (via `res`) | `Constant[""]` | non-empty String | ARTIFACT | block-captured String `<<` mutation invisible (`result << …` in `each`) |
| kramdown html.rb:225 | always-falsey | `inner` (via `res`) | `Constant[""]` | non-empty String | ARTIFACT | same |
| kramdown html.rb:227 | always-falsey | `inner` (via `res`) | `Constant[""]` | non-empty String | ARTIFACT | same |

Mastodon `app/models`: ゲート開時の差分ゼロ。

### 追加のメカニズムグループ（コーパス固有）

7. **複数値の`return a, b, c`がメソッドの戻り値にTupleとして寄与しない（haml、2）**。メカニズム1の拡張。スライス1のコレクターは単一値とbareなreturnのみを扱う。本スライスでは未修正。
8. **ブロックでキャプチャされたStringへの追記（ブロック内の`s << x`）が不可視（kramdown、3）**。メカニズム2（ADR-56）と同じファミリーのString変更バリアント。本スライスでは未修正。

## スライス1の結果

メカニズム1を修正した（ブロック内・ネストした`def`の障壁・到達可能性を尊重した明示的returnの寄与を含む）。ゲート開時のセルフチェック差分は25→10に減少した。残余は次のとおり: GENUINE-via-RBSの`Configuration.load`が5件＋GENUINE-via-RBSの`reset!`が1件（いずれも実在する自作RBSバグで、別途のシグネチャ修正に値する）、スタブのalways-falseyが1件（GENUINE、無害）、`find`の保守性が1件（loader.rb:76、FPの危険あり）、ブロックキャプチャHashのartifactが2件（メカニズム2）。コーパスの残余はメカニズム7と8にまたがる5発火。

残余はall-genuineではないので、ADR-57 WD2に従い、スライス1の後もゲートは閉じたままとする。

## スライス2–3＋ゲート開放（2026-06-12）

残りのartifactクラスを修正し、ゲートを開放した。スライス1の残余の最終的な処置:

- **メカニズム7（複数値の`return a, b, c`）** ―― スライス2で修正: 戻り値のシンクがTupleにパックするようになった。hamlの`parser.rb:469/470`の過剰オプショナルな分割代入の発火を除去。
- **メカニズム2 / 8（脱出するブロックキャプチャHash要素／String変更）** ―― スライス2の脱出コンテンツのフロアで修正し、スライス3でフロアが取りこぼした構造的により難しい2つのシェイプ（shape）へ拡張した: *レシーバーチェーン*イディオム（`OptionParser.new { … }.parse!`――変更を行うブロックは文の呼び出しではなくレシーバーにぶら下がる）と、*メソッド境界をまたぐ*イディオム（`build_option_parser(options).parse!`――ブロックは`options`をパラメータとして受け取った被呼び出し側の内部に保持される。メモ化された`def`単位の本文スキャンが、一致する呼び出し側の引数にフロアを設ける）。triage:35、diff:48、sig_gen:59、kramdown html.rb ×3を解消。
- **GENUINE-via-RBS（`Configuration.load`の`?String`；`reset!`の`()->nil`）** ―― 2つの自作シグネチャを訂正して修正（スライス1のフォローアップ、コミット57da77c8）。
- **`string_unary_blow_up?`のスタブ（constant_folding:1176）** ―― スライス3で修正: always-falseのプレースホルダーが実際のバイトサイズガードになり、採用下でも空振りに畳まれなくなった。
- **`loader.rb:76`（`Array#find`の保守性）** ―― 最終的なゲート開時の差分には再出現しなかった（上流の精度向上により、周囲のフローが今やnilを排除する）。別途の修正は不要。
- **haml `parser.rb:546`（`node, @parent = @parent, @parent.parent`）** ―― 複数値Tupleが導入された途端、*ゲート閉時*のFPとして表面化した。スライス3のFPセーフなオプショナルTupleスロット分割代入の緩和で解消（`respond_to?("close_#{node.type}")`ガードが相関する不変条件）。ゲート閉時FPの*除去*としてカウント――勝ちである。

**最終的なゲート開時の差分（スライス1–3のゲート閉時ベースラインとの比較）:** `rigor check lib`の発火ゼロ、プラグイン契約（contract）の発火ゼロ、hamlとkramdownはゲート閉時ベースラインと一致、Mastodonは1発火――メッセージ内のレシーバー型が*より精密*（`[Dynamic, "jpeg" | Dynamic]`）になった、既存の`compact_blank!`未定義メソッドエラーと同一のもので、新規発火ではなく勝ちである。残余はすべてgenuine-or-win ⇒ WD2に従いゲートを恒久的に開放: `adoptable_self_call_result?`を削除し、`try_local_def_dispatch` / `try_user_method_inference`が推論された戻り値を無条件に採用する。コストは`--no-cache lib`のコールド実行で約+12 %の実時間（被呼び出し側の本文の再型付け）。健全な戻り値結果のメモ化は先送り（ADR-52 WD5 / ADR-24 WD5）。`make verify`はグリーン。
