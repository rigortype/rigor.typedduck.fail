---
title: "GitLabでの`rigor check`のプロファイリング：プラグイン寄与のチャーン"
description: "rigortype/rigor docs/notes/20260604-gitlab-plugin-contribution-allocation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260604-gitlab-plugin-contribution-allocation.md"
sourcePath: "docs/notes/20260604-gitlab-plugin-contribution-allocation.md"
sourceSha: "8838732db1bc5467c09541bc01ffc8aa86d6e8e6f247185be9b3055d6188829c"
sourceCommit: "1e82fa4a127682abbd0aa1b9030cabd425ed2754"
translationStatus: "translated"
sidebar:
  order: 20266604
---

*2026-06-04. プロファイリングノート ─ 参考情報であり規範的ではありません。仕様が優先されます。*

## 問い

[Mastodonのアロケーション（allocation）プロファイル](../20260604-mastodon-allocation-profile/)は
6プラグイン構成のRailsアプリを分析したものです。GitLabはより大規模な**プラグイン多数**の
アンカーケースです ─ プラグインセットが大きくなるとボトルネックは移動するでしょうか？
リクエストどおり、プラグイン**有効**・キャッシュ**ウォーム**の状態でプロファイルを取得しました。

## セットアップ

- 対象: `gitlab-foss` @ `9cdbf8ef1`、設定済みサブセット
  （`app/controllers` + `app/mailers` + `app/workers` + `app/services`）=
  **2,630個の`.rb`ファイル**。
- 設定: **11個のRailsプラグイン**（actionpack、activerecord、actionmailer、
  rails-routes、rails-i18n、activesupport-core-ext、activejob、
  activestorage、actioncable、rspec-rails、devise）、`severity_profile:
  lenient`、`--workers 0`。
- キャッシュ**ウォーム**（事前に1回ビルドを実行済み。コールドビルド = 163.9秒 ─ ウォームの
  効果は小さく、Mastodonでのキャッシュ知見と一致: キャッシュはRBS環境とプラグインテーブルを
  保持するが、ファイルごとの結果は保持しない）。
- 外形: ~163秒実時間、**180件の診断**（164件のエラー）。
- Mastodon時代の4件のアロケーション削減がすでに取り込まれた後で計測。

## 概況: プラグイン寄与パスがアロケーションを支配する

GitLabは2,630ファイルに対して**5億2200万オブジェクト**をアロケートします ─
**~198,500オブジェクト/ファイルで、Mastodonの67k/ファイルの3倍**です。
この差はプラグインセットの大きさによるものです。CPUはGCバウンド（`(sweeping)` 35.7% +
`(marking)` 7.3% ≈ 43%）ですが、*アロケーション*プロファイル（stackprof `:object`）は
プラグイン寄与（plugin contribution）機構を直接指し示しています:

| アロケーション割合 | 箇所 |
|--:|---|
| **17.1 %** | `Kernel#dup`（74%は`dynamic_returns`由来、20%は`type_specifiers`由来） |
| **12.8 %** | `Plugin::Base.dynamic_returns` |
| **12.8 %** | `MethodDispatcher.collect_plugin_contributions` |
| 3.5 % | `StatementEvaluator#collect_plugin_contributions` |
| 3.5 % | `Plugin::Base#type_specifier_facts` |
| 3.5 % | `Plugin::Base.type_specifiers` |
| 2.0 % | `Data#initialize`（CallContext） |
| 1.9 % | `Scope#rebuild` |

`collect_plugin_contributions`の**包括的シェアは40.7%** ─ コールサイトのディスパッチ（dispatch）
ごとに実行され、*全*プラグインに`flat_map`を適用します:

```ruby
registry.plugins.flat_map { |plugin| ... plugin.dynamic_return_type ... }
```

そして各プラグインのリーダーは**呼び出しごとに**次のように動作していました:

```ruby
def dynamic_returns;  (@dynamic_returns || []).dup.freeze; end   # base.rb:225
def type_specifiers;  (@type_specifiers || []).dup.freeze; end   # base.rb:255
```

`@dynamic_returns` / `@type_specifiers`は**プラグインのクラス定義時に一度だけ**構築され、
各要素はすでにフリーズ済みです。それにもかかわらず、リーダーは読み取りごとに新しい`dup.freeze`
コピーをアロケートしていました ─ 11プラグイン × 全ディスパッチ × 2,630ファイル。この`.dup`単体
（17%の`Kernel#dup`）とリーダー自身のアロケーションを合わせると**全オブジェクトの~36%**になります。

## 適用済み: 寄与スナップショットのメモ化（memoisation）

`dynamic_returns` / `type_specifiers`は、フリーズ済みスナップショットをメモ化（memoize）する
ようになりました（`@…_snapshot ||= (@… || []).dup.freeze`）。配列は不変かつ解析前に確定するため、
共有フリーズインスタンスは安全です。呼び出し元はすでに結果を読み取り専用として扱っていました。

同一対象でのクリーンなA/Bテスト（ウォーム、プラグイン有効、`--workers 0`）:

| メトリクス | 変更前 | 変更後 | Δ |
|---|--:|--:|--:|
| アロケートオブジェクト数 | 522.0 M | **351.9 M** | **−33 %** |
| 実時間 | 163.0 s | **150.6 s** | **−7.6 %**（−12.4 s） |
| `GC.stat[:time]` | 15.83 s | 11.72 s | −26 % |
| GC実行回数 | 379 | 263 | −31 % |
| 診断件数 | 180 / 164 | **180 / 164** | バイト同一 |

`make verify`は成功（5,418件のサンプル、セルフチェックとプラグイン契約チェックはクリーン）。
`Kernel#dup`と2つのリーダーはアロケーション上位テーブルから完全に消えました。

## 忠実な再プロファイル（cwd = gitlab、実際の`.rigor.yml`使用）

上記の計測は`cwd = rigor`から絶対パスの設定ファイルを使って行ったもので、
プラグインの*相対*パス（`routes_file`、`helper_paths`）が解決されず、
プラグインのファイル探索がほぼ機能していませんでした。実際の方法で再プロファイルしました ─
`cd gitlab-foss && rigor check`としてプロジェクト自身の`.rigor.yml`（相対パスがGitLabのツリーに
解決される）を使用し、`--workers 0`（逐次実行のデフォルト）、`--no-cache`、プロファイリングのみを
追加。忠実な診断: **2,323件**（38件のエラー / 20件の警告 / 2,265件の情報）、~146秒。

2つの修正が明らかになりました:

- **ルート読み取りのホットスポットはcwdアーティファクトでした**。ルートが解決されると、
  `IoBoundary#read_file`は**17,003回の呼び出しで6,901個のユニークパス = 0.47秒
  （実時間の0.3%）** ─ ボトルネックではありません。（`rigor-rails-routes`のnil-tableメモ修正の
  動機となった105,724回読み取りの爆発は、ルートファイルが*存在しない/解析不能*な場合にのみ
  発生します。その修正はロバストネスの向上として真に有効ですが、GitLabのホットパスではありません。）
- **`collect_plugin_contributions`が真の#1アロケーターです**。`dynamic_returns`のdup修正後、
  忠実な`:object`プロファイルでは単体で**全アロケーションの19.2%**（`type_specifier_facts`、
  兄弟の`StatementEvaluator`コレクター、`flat_map`を合わせると≈34%）を占めています。
  `Kernel#dup`は17% → 1.2%に低下し、dup修正の効果が確認されました。

### 適用済み: 遅延寄与アキュムレーション

`collect_plugin_contributions`の両メソッド（MethodDispatcher +
StatementEvaluator）は、ディスパッチごとにプラグインごとの`contributions = []`*と*
フラット化後の結果をアロケートする`flat_map`を実行していました。特定のレシーバーに対して
ほぼすべてのプラグインが何も寄与しない場合でも同様でした。これらは遅延アキュムレーション
に変更されました ─ 寄与が実際に現れたときのみアロケートし、そうでなければ1つのフリーズ済み
空配列を共有します。呼び出し元は結果を読み取り専用（`.empty?` / `Merger.merge`）として
扱います。

クリーンな忠実A/Bテスト（cwd = gitlab、プラグイン有効、`--no-cache`）:

| メトリクス | 変更前 | 変更後 | Δ |
|---|--:|--:|--:|
| アロケートオブジェクト数 | 347.3 M | **246.8 M** | **−29 %** |
| 実時間 | 146.6 s | **143.2 s** | −2.4 % |
| GC実行回数 | 402 | 385 | −4 % |
| 診断件数 | 2,323 / 38 err | **2,323 / 38 err** | バイト同一 |

アロケーション削減に比べて実時間の改善は小さいです: 排除されたオブジェクトは
短命な空配列で、アロケートとスイープのコストが低いためです。それでも`make verify`
成功のもとで−29%という実質的なアロケーション削減です。

### 適用済み: プラグイン適用可能性インデックス

次のレバー ─ ディスパッチごとに全プラグインを巡回するのをやめる ─ が適用されました。
GitLabの11プラグインを調査した結果、**2個のみ**（`rigor-activerecord`、
`rigor-activestorage`）が*任意の*コール単位パスを実装していることがわかりました:
`dynamic_return`を宣言するものは0個、`type_specifier`を宣言するものは0個、
レガシーの`flow_contribution_for`をオーバーライドするものは2個。残り9個は
すべてのコールサイトで呼び出され（そしてnilを返し）ていました。

`Plugin::Registry`は`ContributionIndex`を一度だけ構築するようになりました:
`flow_contribution_for`をオーバーライドするか`dynamic_return` / `type_specifier`を
宣言するプラグインのレジストリ順サブセットに加え、各パスを制御するメンバーシップセットです。
両方の`collect_plugin_contributions`メソッドはそのサブセットを（レジストリ順で）反復し、
メンバーシップによって各パスを制御します ─ スキップされたプラグインの呼び出しはいずれにしても
nil/[]を返すため、全プラグインを巡回した場合とまったく同じ寄与が同じ順序で得られます。
`dynamic_return`の**レシーバークラス祖先マッチは依然としてディスパッチごとに**
`dynamic_return_type`内で行われます。インデックスは*構造的に*寄与できないプラグインのみを
刈り込むため、精度中立です。

忠実なA/Bテスト（cwd = gitlab、プラグイン有効、`--no-cache`、遅延アキュムレーションの上に適用）:

| メトリクス | 変更前 | 変更後 | Δ |
|---|--:|--:|--:|
| 実時間 | 142.6 s | **122.5 s** | **−14.1 %**（−20 s） |
| アロケートオブジェクト数 | 246.8 M | **228.5 M** | −7.4 % |
| GC実行回数 | 330 | 314 | −5 % |
| 診断件数 | 2,323 / 38 err | **2,323 / 38 err** | バイト同一 |

これはこの一連の改善で最大の実時間削減です: ディスパッチごとに11プラグインではなく
2プラグインを巡回することで、数百万回のディスパッチを通じてコールサイトごとに
~9回のnil返し`dynamic_return_type` / `flow_contribution_for`呼び出しを排除します。
`make verify`成功（新しい`Registry#contribution_index`公開メソッドはAPIドリフト
スナップショットに記録済み）。

## 未解決の課題

構造的な`Scope#rebuild` / `CallContext`チャーン（Mastodonノートから引き継ぎ）が
次のアロケーションフロンティアとして残っています。`dynamic_return`が多用されるプラグインセット
（GitLabとは異なる）に対しては、`dynamic_return_type`内の祖先マッチを償却するための
レシーバークラスごとの適用可能ルールメモというさらなるレバーがあります ─ バンドルされたプラグインセットで
まだ行使されていないため、需要に応じてゲートします。

## 再現手順

Flakeのdevシェル内で、rigorチェックアウトから、`paths:`がGitLabサブセットを指し、
`cache.path:`がスクラッチディレクトリを指し、11プラグインが列挙された設定ファイルを使用します:

```sh
# warm the cache once, then profile / account:
bundle exec exe/rigor check --config /tmp/rigor-gitlab.yml --workers 0 --format json >/dev/null
GEM_HOME=/tmp/rigor_gems gem install --no-document stackprof   # if absent
env GEM_PATH=/tmp/rigor_gems:$(ruby -e 'puts Gem.path.join(":")') \
  bundle exec ruby -I/tmp/rigor_gems/gems/stackprof-0.2.28/lib \
  /tmp/rigor_alloc_warm.rb /tmp/rigor-gitlab.yml          # mode: :object
bundle exec ruby /tmp/gl_gc.rb /tmp/rigor-gitlab.yml      # GC.stat A/B
```
