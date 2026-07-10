---
title: "GitLab調査: 型カバレッジ改善計画"
description: "rigortype/rigor docs/notes/20260708-gitlab-type-coverage-improvement-plan.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260708-gitlab-type-coverage-improvement-plan.md"
sourcePath: "docs/notes/20260708-gitlab-type-coverage-improvement-plan.md"
sourceSha: "625fa458ee120b05d1724c12720559899397f30eefa815a5239e5efc4c8dd768"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
sidebar:
  order: 20266708
---

GitLab（app+lib、11,344ファイル）のオンボーディングの流れから2026-07-08に合成した。入力は次の2つで、いずれも監査済み（1件の裁定が異議申し立てを受けて覆され、actionpackのソースに照らして修正された）:

- [`20260708-gitlab-protection-coverage-survey.md`](../20260708-gitlab-protection-coverage-survey/) ——
  保護率**0.2836**（59,554/209,974、Mastodon 0.3148、Redmine 0.339）、サイト別の原因分布、
  イディオムのサンプリング。
- [`20260708-gitlab-diagnostic-adjudication.md`](../20260708-gitlab-diagnostic-adjudication/) ——
  289件のエラー＋238件の警告をクラスタリングしてサンプリング: **真のバグ2件**、残りは4つの
  系統的なFPメカニズムが支配的。
- オンボーディングの事実: acknowledgeモード、lenient、10プラグイン（ロードエラー0）、ベースライン
  1,255バケット/3,909診断、最終checkはクリーン。成果物は`~/repo/ruby/rigor-survey/gitlab`（未追跡）＋
  `_reports/init/gitlab.*`。

GitLabはMastodon/Redmineの構造的な図式を再現し（カバレッジはエンジン/プラグイン依存であり、
sigで閉じられない。`tractability_summary` = 99.4 % engine_gap）、さらに小規模なコーパスでは
表面化させられなかった、実行可能な4つの新しいレバーを追加する。以下は（サイトインパクト×一般性）/
（コスト×FPリスク）でランク付けした。

## P0 —— 安価、FP削減、精度加算（それぞれコーパスでゲートした小さなスライス）

1. **rigor-rails-routes: Railsのルート名合成を正確にモデル化する**。
   このプラグインはメンバースタイルの順序付け＋単数化でヘルパー名を計算するが、Railsの
   `name_for_action` / `Mapper.normalize_name` / `Scope#action_name`（actionpackの
   `routing/mapper.rb:2070/407/2476`）は、（a）`collection do get 'granular/new' end`ブロック内の
   マルチセグメント文字列パスと、（b）`scope(as:)`＋素の`get`合成について異なる名前を生成する。
   現状ではこれが動作するコードに対してFP `unknown-helper`を発火させる —— 裁定が当初は真のバグと
   誤判定した2つのサイトは、まさにこのギャップである。159件の`unknown-helper`発火のうち約91件が
   名前合成のFPである（残りの68件はgrapeで、P2）。修正 = 3つのmapper関数の命名ロジックを移植する。
   GitLab＋Redmine＋Mastodonのルートコーパスでゲートし、新規発火はゼロ。
2. **rigor-actionpack: `Parameters#require` / `#permit`の戻り値に型を付ける**。
   `params`は保護されている（プラグインはGitLabで動作を確認済み）が、`params.require(:x)`はuntypedを
   返すため連鎖した`.permit`サイトが漏れる —— 108サイト。既存の`dynamic_return`を、
   `ActionController::Parameters`を返す`require`/`permit`へ拡張する（lenient-nominal、着地済みの
   request-contextリーダーと同じFPゼロパターン）。
3. **activesupport-core-extオーバーレイのギャップ**（残り約18サイト/発火）: `advance`、`titlecase`、
   `all_day`、`dasherize`、`Time#to_time(form)`、`ERB::Util#html_escape_once`。プラグインバンドル＋
   ADR-72の`data/gem_overlay/activesupport`ツインへの追加RBSエントリ。
4. **core_overlayエントリ** stdlib RBSの遅れ向け（ADR-79メカニズム）: `Psych.parse`、
   `CSV::MalformedCSVError.new(message, line)`のアリティ。着地済みの
   `StringScanner#peek_byte`修正と同じ形状。

## P1 —— 大きな単一レバー

5. **rigor-activerecord: `db/structure.sql`をスキーマソースとして受け入れる**。
   GitLabはstructure.sql（＋`ci_structure.sql`、`sec_structure.sql`）をコミットしており`schema.rb`が
   ない → プラグインはINERT（`plugin.activerecord.load-error`）となり、すべてのモデルカラムの
   型付けがゼロになる: 約3,000件の直接的なARボキャブラリの穴（`where`/`find`/`exists?`……）、
   それらの背後にある下流のDynamicチェーン、AND約42サイトのFPカスケード（リレーションが
   `Array[String]`に誤推論され、`activerecord-relation-misinference`のヒントノイズ、
   `Array#from`/`#with`の衝突、`use_unnested_filters! for Integer`を生む）。`schema_format = :sql`の
   Railsアプリはすべて現状INERTである —— これはredmine-O1クラスを一般化したもので、Redmine
   （コミットされたスキーマが一切ない）と異なりデータはリポジトリ内にある。実装: PGのDDLから
   `CREATE TABLE`のカラム/型ペアをパースする（行指向、SQLパーサー依存なし）。複数の
   `db/*structure.sql`を受け入れる。ゲート: GitLabコーパスのdiff（42件のFPカスケードが消え、
   カバレッジ再計測を期待）、Mastodon/Redmineはバイト単位で同一（structure.sqlを使わない）。

## P2 —— エンジンスライス（より大きく、P0/P1の再計測後に順序付け）

6. **モジュールシングルトンのファサード解決**（モジュールに対する`class << self` / `def self.x`）。
   ADR-57はこれを独立したスライスとして明示的に先送りした。GitLabはその需要を定量化する:
   `Feature.enabled?`だけで695件の未保護サイト（`lib/feature.rb:95`の`module Feature`＋
   `class << self`）、加えて`Gitlab::Utils.*`ファミリー。エンジン一般 —— すべてのコーパスに恩恵を
   与える。ADR-57の採用ゲートプロトコルに従う（裁定した発火クラスごとにオープン）。
7. **由来: RBSカバレッジ境界で外部gemの穴にラベルを付ける**（ADR-82のフォローアップ）。
   806件のロックファイルgemがRBSを一切出荷していないのに、`external_gem_without_rbs = 0` /
   `framework_dsl_boundary = 0`を再現する2つ目のコーパス。ディスパッチのレシーバークラスが
   RBSのないロック済みgemに所有されているとき（`RbsCoverageReport`が既にその集合を知っている）、
   汎用フォールバックの代わりに外部gem原因を記録する —— 39.7 %の`unsupported_syntax`＋
   26.2 %の`none`の一部を、ユーザーが行動できる唯一のバケット（`add_rbs`）に変える。しかもその
   答えが実際に真であるコーパス上で。ADR-82による誠実性の基準: 所有関係が健全なときにのみ記録する。
8. **grape-path-helpersサポート**（68サイト、unknown-helperの43 %）: grapeのルートファイル上で
   gemの`api_v4_*`ヘルパー名生成をモデル化する。公開gemのカバレッジ（GitLab固有ではない）だが、
   grape固有のwalker作業。P0項目1の後ろに需要ゲートを置く。

## P3 —— 調査設定＋ツーリングのフォローアップ

9. **調査設定: GitLabのモノレポローカルな`gems/*`を含める**（`Gitlab::Utils`、`strong_memoize`の
   ブロック形式の見逃しのソース）して再計測する。「Gemfile内のパスソースのローカルgemを検出し、
   その`lib/`を`paths:`へ提供する」をrigor-project-initスキルに折り込む。
10. **`rigor coverage`の運用修正**: （a）`check`が設定の`paths:`をデフォルトにするのに対し、
    明示的なPATH引数を要求する —— そろえる。（b）同じツリー上でwall 2時間17分/14.6 GB RSS
    に対しcheckは39分/7.3 GB —— 保護スキャンにはcheckのforkプール並列性がない。（c）
    ウォームランのキャッシュがあるにもかかわらず`baseline generate`がコールドで再実行された
    ように見えた（init-agentの観察、並行した二重起動による自己誘発の可能性あり —— バグとして
    扱う前にキャッシュ参加を検証すること）。
11. **`genuine-bugs`ヒントのトリアージ再較正**（ADR-23のフォローアップ）: 計測精度2/11
    （18 %）—— すべてのシグナルは`def.ivar-write-mismatch`由来（2/2）で、FPメカニズムが系統的な
    `argument-type-mismatch` / `rails-routes.wrong-arity`サブ集団からはゼロ（P0項目1〜2が原因を
    修正する。その後に再計測）。

## 先送り（記録のみ、計画はしない）

- **DSL層プラグイン**（declarative_policy 0.052、serializers 0.109、GraphQL types）: 公開gemだが
  重いwalker作業。P1/P2の再計測で残りが判明した後に再訪する。
- **`ee/`スライス**とEE注入パターンの`prepend_mod`（存在するがapp+lib範囲では主要な要因ではない）。
- **`Hash#[] → V?`の大量発生**（18,404件の`[]`の穴＋約200件のpossible-nil診断）: RBSの要素型に
  内在するもの。具体シェイプのキー存在ナローイングは既に着地済み。残りはADR-58/67に乗っており、
  ADR-67 WD2は2026-07-06のスパイクにより先送りのまま。
- **GitLabの真のバグ2件**（upstreamに報告可能、Rigorの作業ではない）:
  `lib/system_check/incoming_email/imap_authentication_check.rb:39` —— `@error`はconfig欠落パスで
  Stringを持つが、reporterは`@error.message`を呼ぶため、まさに必要なときに診断がクラッシュする。
  `lib/uploaded_file.rb:42` —— `@upload_duration`のInteger/Float不整合（見た目の問題）。

## 順序付けとゲート

P0項目は独立した小さなスライスで、それぞれ標準コーパスセット全体で新規発火ゼロをゲートとする
（GitLabが今それに加わった —— ウォーム再checkはベースライン比で12.7秒）。次にP1が着地し、
GitLabカバレッジの完全な再計測をトリガーする（期待: 42件のFPカスケードが消え、ARボキャブラリの
クラスタが縮小し、保護率 > 0.30）。P2項目6〜7は独自のADRプロトコルゲートを持つエンジンスライス。
8〜11は需要に乗る。この計画は精度*加算*の前にFP*除去*（P0-1、P1のカスケード）を意図的に前倒しする
—— ADR-58/78と同じ順序付けの規律である。
