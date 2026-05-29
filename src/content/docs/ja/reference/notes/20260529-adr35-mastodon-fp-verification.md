---
title: "ADR-35 override-rules — Mastodon false-positive verification"
description: "Imported from rigortype/rigor docs/notes/20260529-adr35-mastodon-fp-verification.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260529-adr35-mastodon-fp-verification.md"
sourcePath: "docs/notes/20260529-adr35-mastodon-fp-verification.md"
sourceSha: "e8e1dd4ad90e7d1805e79032d6a44e54658c2a40a43910dd3cd5b0943ab7c9f5"
sourceCommit: "f05a17f2d493b5e0ae7f1066d9bcb7f90b04dc84"
translationStatus: "translated"
sidebar:
  order: 20266529
---

日付: 2026-05-29。コーパス: Mastodon（`~/repo/ruby/rigor-survey/mastodon`）、`app` + `lib`全体、1219個のRubyファイル。[ADR-35](../../adr/35-override-signature-compatibility/)スライス4の付随資料。

## 方法

プロジェクト全体に対して、**強制した`strict`重大度プロファイル**の下で`rigor check`を実行した（Mastodon自身の`.rigor.dist.yml`は`lenient`を使っており、3つの`def.override-*`ルールすべてを`:off`へマップするため何も顕在化しない）。設定はdistファイルを踏襲し（同じ`paths:` / `plugins:`）、`severity_profile: strict`を加えた。診断をルール別に集計した。一時的な設定はあとで除去した。

## 所見

| ルール | 発火数（strict）| 判定 |
| --- | --- | --- |
| `def.override-return-widened` | 0 | 正しく不活性 — アプリのクラスに著作されたRBSがない（WD1ゲート）。 |
| `def.override-param-narrowed` | 0 | 同上 — 著作されたRBSがない。 |
| `def.override-visibility-reduced` | 160 → **35** | 160件は本物の偽陽性クラスタ（修正済み）。35件の残余は真の可視性縮小。 |

### 可視性の偽陽性クラスタ（160件）とその修正

160件の発火はRailsの**コンサーン**パターンが大半を占めていた。`app/controllers/concerns/`配下のコンサーンが`private`なヘルパーメソッド（`username_param`、`set_account`、`pundit_user`、`pagination_*`、……）を定義し、それをincludeするコントローラーがそれらを — やはり`private`で — 再定義する。private → privateは**縮小ではない**ので、これらは決して発火すべきではなかった。

根本原因: メソッドの**可視性がファイル単位でのみ追跡されていた**一方で、def-node / 親クラス / includesのインデックスは**クロスファイル**でシードされていた（ADR-24のプロジェクト事前パス）。そのため、あるコントローラーを解析するとき、親コンサーンの`private`な可視性（兄弟ファイルで宣言されている）が`nil`として返り、ルール内の`nil → :public`フォールバックが「public」な親を捏造して、偽のpublic→private「縮小」を生んでいた。

修正（エンジン）:

- `Inference::ScopeIndexer.discovered_def_index_for_paths`が、すべてのプロジェクトファイルにまたがって`method_visibilities`も収集するようになった。
- `merge_project_method_indexes`が、ファイル単位の可視性をクロスファイルのシードに**上書きする**形でマージする（現在のファイルが自身のクラスについて権威を持ち、兄弟の親は保持される）。
- `Analysis::Runner#seed_project_scope`がクロスファイルのテーブルをシードする。
- `CheckRules`はエントリ欠落から`:public`を捏造しなくなった — 親の可視性が不明な場合は沈黙へ退避する（WD7に従い偽陽性に対して安全）。

修正後: **160 → 35**となり、クロスファイルの*本物の*ケース（あるファイルでpublicな親、別のファイルでprivateなオーバーライド）が正しく発火するようになった（以前は`|| :public`という幸運な偶然によってのみ「動いて」いた）。

### 残余35件の発火は真陽性

35件すべてが、エンジンがいまや正しく読み取る本物の可視性縮小である:

- `pundit_user`は`Authorization`コンサーンで純粋に**public**（`private`修飾子なし）であり、コントローラーがそれを`private`でオーバーライドする。
- `pagination_max_id` / `pagination_since_id` / `pagination_params`は`Api::Pagination`で純粋に**protected**であり、コントローラーがそれらを`private`でオーバーライドする。
- `respond_with_error`は`Api::BaseController`でprotected、privateにオーバーライドされている。

これらはRailsでは*スタイル的によくある*もので、おそらく無害だが、解析器の誤読ではなく本物の縮小である。これらは`strict`の下でのみ顕在化する。Mastodonの実際の`lenient`設定が顕在化させるのは**ゼロ**件である。

## キャリブレーションの決定

3つのルールすべてについて、出荷した重大度マッピングを維持する: `lenient → off`、`balanced → :warning`、`strict → :error`。`balanced → :error`への昇格は**しない** — 残余の真陽性は典型的なRailsでは十分よく見られるため、`balanced`なプロジェクトをエラーにすると偽陽性の規律という価値とトレードオフになる。厳格なLSP可視性強制を望むチームは、`severity_profile: strict`またはルール単位の`severity_overrides:`エントリでオプトインする。

## リーチに関する注記（バグではない — 文書化された限界）

- `return` / `param`ルールは**両側**に著作されたRBSを必要とする。`sig/`のないアプリは、これらからは何も見ない。これは意図したWD1ゲートである。
- 名前的部分型チェックは**ロード済みの**Rubyクラス / その親を解決する。アプリ内のみのクラス階層は`:maybe`へと退化し、沈黙を保つ。return/paramのリーチはコア / stdlib / ロード可能なgemの階層（例: `Numeric`/`Integer`）に及ぶ。プロジェクトRBSの親を認識する部分型パスはこれを拡張しうるが、保留である。
