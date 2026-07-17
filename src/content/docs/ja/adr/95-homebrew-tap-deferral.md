---
title: "ADR-95 — Homebrew配布: 単一バイナリの後ろへ先送り"
description: "rigortype/rigor docs/adr/95-homebrew-tap-deferral.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/95-homebrew-tap-deferral.md"
sourcePath: "docs/adr/95-homebrew-tap-deferral.md"
sourceSha: "393ea8e3dd3633853bfe49d1de2ede1e72cee7d66ee426106306e4aab6b2834c"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 4095
---

Status: <strong>Proposed（先送り、トリガーによるゲート）、2026-07-17。</strong>何も実装されておらず、何も計画されていない。RigorはHomebrewフォーミュラを出荷しない── homebrew-coreにも（今日では知名度をクリアしないであろう）、サードパーティタップとしても（タップは書くのは安価だが、生かし続けるのは高価であり、その理由は[ADR-27](../27-tool-distribution-model/) WD5が投入されれば自ずと消える）。このADRが存在するのは、問いが生きているのにコーパスが**まったく答えを持たなかった**からである: ADR-27は2026-05に配布チャネルを列挙したがHomebrewには一度も触れず、そのため問われるたびに調査がやり直される。次の問いが安価になるよう、再評価トリガーとともにここに記録する。

根拠:
[`docs/notes/20260717-install-channel-evaluation.md`](../../notes/20260717-install-channel-evaluation/) § 5（Homebrewの発見。ノートには並行して実施されたmise / Bundlerの評価も含まれる）。

## Context

ADR-27は、Rigorが解析対象プロジェクトのバンドルの外部にインストールされることを決着させ、そのチャネルをランク付けした: まずバージョンマネージャー、次にCIテンプレート、コンテナ、将来の単一バイナリ、そして残される`gem install`である。Homebrewはそのリストに不在である── 却下されたのではなく、単に一度も検討されなかった。それでもなお、それはmacOSユーザーが最初に手を伸ばすものであり、「タップを提供すべきか？」は、自明でない答えを持つ妥当な問いである。

2つの事実がそれを枠づける:

- **Rigorは`required_ruby_version = ">= 4.0.0", "< 4.1"`をピン留めしている**── 狭く、しかも意図的にそうである（ADR-27 WD7は下限を下げることを却下した）。
- **Homebrewの`ruby`フォーミュラは最新を追う**。両者は構造上、衝突コースにある。

## Decision

**基準: 配布チャネルは、その再発コストが我々自身のリリースケイデンスによって有界である場合にのみ、所有する価値がある**。維持がサードパーティの無関係なリリーススケジュールによって駆動されるチャネルは、チャネルではなく、他人の破損への購読である── 作るのがどれほど安価であろうとも。

`ruby`に依存するbrewフォーミュラはこれを満たさない。オーサリングは些細である（`ruby-lsp`のフォーミュラがパターンである: `depends_on "ruby"`、`GEM_HOME=libexec`、`bin.env_script_all_files`）し、リリースごとのバンプは`brew bump-formula-pr`で自動化される。コストは別のところにある: すべてのHomebrewの`ruby`バンプは、前のものに対してビルドされたフォーミュラを座礁させうる── Homebrew自身のCookbookは、依存が非互換に動いたときに依存する側の`revision`バンプを要求する── そして`< 4.1`の上限に対しては、衝突は仮説ではなく予定されたものである。これはまさに、CocoaPodsの「それを呼び出すものとは異なるRubyでインストールされる」という失敗クラスであり、我々はそれを意図的に取り込むことになる。我々の既存のチャネルはすでにインタープリタを分離している: miseの`gem:`バックエンドは各ツールにプライベートなgemディレクトリと、そのインストール時のRubyにピン留めされた実行ファイルを与え、どのユーザーの`brew upgrade`もそれに到達できない。

したがって: **brewの`ruby`に依存しなければならない間は、フォーミュラなし**。この条件が決定のすべてである── ADR-27 WD5の単一バイナリは`depends_on "ruby"`を、それとともに、ノーと言う唯一の理由を取り除く。Homebrewは、単一バイナリに対して評価すべき競合する配布戦略ではない。それはその*帰結*であり、2つを逆の順序で並べることは、WD5が一度で届けるものを届けるために、何年ものフォーミュラ保守を買うことになる。

homebrew-coreは今のところ別途閉じている: その知名度のバーは30以上のfork / 30以上のwatcher / 75以上のstarであり、**自己申請では3倍**（90以上/90以上/225以上）で、rigortypeはこれをクリアしない。エコシステムはその判断の形に同意している── **Ruby静的解析ツールはhomebrew-coreに1つも存在しない**（`rubocop`、`steep`、`typeprof`、`sorbet`、`brakeman`はない）。そこにあるのは`fastlane`、`cocoapods`、`ruby-lsp`である。したがってタップが唯一の近い将来のbrewの選択肢であり、それがこのADRが辞退するものである。

## Re-evaluation triggers

以下のいずれか1つがそれを再オープンする:

1. **ADR-27 WD5が単一バイナリを出荷する**（[tebako](https://github.com/tamatebako/tebako)は2026年に保守されている唯一のパッケージャーである── ruby-packerは放棄され、traveling-rubyは休眠中）。バイナリボトルのフォーミュラは`ruby`依存を持たず、変動もなく、このADRはイエスへ反転する。**これが期待される経路である**。
2. **`< 4.1`の上限が、brewの`ruby`を追えるほど十分に広がる**。ありそうにない── ADR-27 WD7とADR-79はどちらも、意図的にRigorを最新のツールチェーンにピン留めし続ける。
3. **既存のチャネルが真に応えられない、実証された需要**──「brewの方が良い」ではなく、mise / `gem install` / コンテナ / Nixがすべて失敗するユーザー。
4. **rigortypeがhomebrew-coreの自己申請の知名度をクリアする**（90以上/90以上/225以上）。これは問いを「タップを保守する」から「coreに引き渡す」へと変える。

## Rejected alternatives

| 代替案 | 却下理由 |
| --- | --- |
| 今サードパーティタップを出荷する、`depends_on "ruby"` | 基準を満たさない── 維持は我々のではなくHomebrewの`ruby`ケイデンスによって駆動され、しかも衝突を保証する`< 4.1`の上限を相手にする |
| Rubyをフォーミュラにvendorする（4.0インタープリタを`resource`インストールする） | 単一バイナリをHomebrewのDSLで、1つのプラットフォームのために、他所でのWD5の便益なしに再実装する |
| 今homebrew-coreに申請する | 自己申請の知名度をクリアしない。Ruby解析ツールはcoreに1つもない |
| `brew-gem`でフォーミュラを生成する | より少ない制御で同じ`ruby`結合。そして生成されたスタブは、我々がサポートできるチャネルではない |
| 記録しないまま放置する | 現状であり、このADRが存在する理由── 記録されない非決定は、提起されるたびに再調査される |

## Consequences

- **ポジティブ**。macOSユーザーはmiseへ誘導される。miseは同じ評価が、Rubyバージョンを混在*できない*チャネルとして測定したものである。保守は一切引き受けない。単一バイナリの作業は具体的な第二の見返りを得て、WD5の論拠を強化する。
- **ネガティブ**。`brew install rigortype`は動作せず、それはmacOSユーザーが最初に試すものである。WD5が投入されるまで、我々はその発見のコストを吸収する。
- **キャリーオーバー**。WD5が無期限に予定未定のままで、それでもトリガー3が発火する場合、正直な選択肢は、「`brew upgrade ruby`で壊れる可能性がある」という文書化された注意書き付きのタップへと狭まる── これは、後で驚きではなく選択となるよう、今名指しする価値がある。

## Relationship to other ADRs

- [ADR-27](../27-tool-distribution-model/) — 親。これはそのチャネル列挙のギャップを埋める。そのWD5はこのADRのトリガー1であり、そのWD7がトリガー2をありそうにないものにしている理由である。
- [ADR-79](../79-rbs-version-range-over-pinned-determinism/) — Rigorに最新のツールチェーンを追い続けさせる忠実性の姿勢、すなわち狭い上限の背後にあるのと同じ力。
- [ADR-31](../31-contribution-and-supply-chain-policy/) — タップはサプライチェーンのサーフェスである。将来のいかなるフォーミュラも、そのポリシーの対象範囲に入る。
