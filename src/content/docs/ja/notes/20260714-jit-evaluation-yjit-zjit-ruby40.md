---
title: "`rigor check`のJIT評価 — Ruby 4.0でのYJIT対ZJIT（2026-07-14）"
description: "rigortype/rigor docs/notes/20260714-jit-evaluation-yjit-zjit-ruby40.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260714-jit-evaluation-yjit-zjit-ruby40.md"
sourcePath: "docs/notes/20260714-jit-evaluation-yjit-zjit-ruby40.md"
sourceSha: "a166cb865992623e6029ee75617428df22cecd59f3949349cbc74f68e81dc878"
sourceCommit: "eb8e9996d113a1b5e1778d0988597c979814a219"
translationStatus: "translated"
sidebar:
  order: 20266714
---

ステータス: 測定ノートであり、仕様・設計上のコミットメントはない。[`skills/rigor-project-init/references/05-jit-performance.md`](https://github.com/rigortype/rigor/blob/master/skills/rigor-project-init/references/05-jit-performance.md)のJITガイダンスを裏付け、[ADR-75当時の遅延YJIT決定](../../adr/50-release-engineering-and-stability-strategy/)（`Rigor::Runtime::Jit`、5秒のデッドラインとして出荷）が、Ruby 4.0がYJITと並んでZJITを出荷した今も正しいJITを選ぶことを確認する。

## 問い

Ruby 4.0.5は**両方**のJITをコンパイル済みで出荷する（`RbConfig::CONFIG`は`YJIT_SUPPORT="yes"`と`ZJIT_SUPPORT="yes"`を報告し、`ruby --yjit` / `ruby --zjit`はそれぞれ`+YJIT` / `+ZJIT`と`RubyVM::{YJIT,ZJIT}.enabled? == true`を報告する）。Rigorの遅延JIT機能はYJITしか知らない。ZJIT（より新しいメソッドベースのJIT、[docs](https://docs.ruby-lang.org/en/master/jit/zjit_md.html)）が利用可能になった今、Rigorはそれを優先すべきだろうか——そして、ユーザーが実際に目にする実行サイズでJITはそもそも役立つのだろうか？

## 手法

実際の製品ワークロード: サイズスペクトルにまたがる`rigor-survey`のターゲットに対する、インプロセスの`rigor check --no-cache`（コールド）。JITはプロセス開始時に`RUBYOPT=--yjit` / `--zjit`で選択し、インタープリタのアームはどちらも設定しない。**すべてのアームが`RIGOR_DISABLE_YJIT=1`を設定する**ので、Rigor自身の遅延YJITは決して発火せず、有効なJITはそのアームのフラグだけになる。インターリーブした3パスの反復を行い、中央値を報告する。指標はウォール時間である（JITはアロケーションを変えず——検証済み——診断も変えない: **3つのアームすべてがどのターゲットでもバイト単位で同一の診断件数を出した**ので、両JITともRigor上で正しさは安全）。共有開発ホスト（arm64-darwin、Ruby 4.0.5）。ウォールはマシンノイズを含むが、以下のパターンは実行間のばらつきよりはるかに大きく、最小値は中央値を追従する。

## 結果（コールド`rigor check`、秒、3回の中央値）

| ターゲット（サイズ） | interp | YJIT | ZJIT | YJIT対interp | ZJIT対interp | ZJIT対YJIT | diag |
|---|--:|--:|--:|--:|--:|--:|--:|
| kramdown `lib`（約1.6秒、小） | 1.61 | 2.69 | 2.21 | **+67 %** | **+37 %** | −18 % | 68 |
| mail `lib`（約4秒、中） | 4.00 | 4.05 | 4.18 | +0 % | +4 % | +3 % | 26 |
| rigor `lib`（約8秒） | 8.06 | 7.03 | 7.71 | **−13 %** | −4 % | +10 % | 1 |
| gitlab `app/models`（約19秒） | 18.96 | 15.11 | 16.59 | **−20 %** | −13 % | +10 % | 210 |
| mastodon `app`+`lib`（約17秒、大） | 16.58 | 11.86 | 14.29 | **−28 %** | −14 % | +21 % | 2348 |

（mastodonのinterpはセッション開始時のベースラインの約25秒ではなく約17秒だが、これはv0.3.0のパフォーマンス改善の流れ——アロケーションフリーのAST反復など——がその後masterに着地したためである。これは現行masterのinterpだ。）

## 知見

1. **両JITとも正しさは安全**。診断はどのターゲットでもinterp / YJIT / ZJITをまたいでバイト単位で同一。どちらのJITもRigorをミスコンパイルしない。
2. **JITが報われるのは、実行がウォームアップを償却できるだけ長くなってからだけ**。約4秒を下回ると両JITともインタープリタに*負ける*（kramdown: YJIT +67 %、ZJIT +37 %）。YJITのクロスオーバーは約4秒（mail、損益分岐）と約8秒（rigor `lib`、−13 %）の間にある。これこそが、Rigorがブート時にYJITを有効化するのではなく5秒のデッドラインの後ろに遅延させる理由そのものだ。
3. **重要な実行（大・コールド）では、YJITが勝ち、どこでもZJITを上回る**。 YJITは−13 %から−28 %、ZJITは−4 %から−14 %。**両方が役立つあらゆるターゲットで、YJITはZJITより10〜21 %速い**。 ZJITのピークの勝ちはYJITのおよそ半分だ。
4. **ZJITがYJITを上回るのは最小のターゲットだけ**（kramdown、ZJITは対YJITで−18 %）——そこでは*両方*がどのみちインタープリタに負ける。ZJITのウォームアップは軽いので短い実行ではマシだが、そこはそもそもJITをまったく使いたくない領域だ。

## 結論

**RigorのJITとしてYJITを維持し、Ruby 4.0ではZJITを採用しない**。 JITを有効化する価値があるほど長いあらゆるワークロードで、YJITはZJITより約1.5〜2倍多くの勝ちを届ける。この結果は、現時点での2つのJITの成熟度と整合する: YJIT（遅延ベーシックブロックバージョニング、成熟）は、Rigorのアロケーションの多い、分岐の多い、多相ディスパッチのホットループを定常状態でよりよく最適化する。ZJIT（より新しいメソッドベースのJIT）はウォームアップが軽いが、このワークロードではまだYJITのスループットに追いついていない。Rigorの遅延JIT設計（`Rigor::Runtime::Jit`、5秒のデッドラインの後にYJITを有効化）はすでに正しいJITと正しいタイミングを選んでいる——この測定は、それを変えるのではなく、新しい選択肢に照らして裏付ける。

## 注意点／再評価のトリガー

- **既定のみ**。 ZJITは（YJITと同様に）チューニングノブ（`--zjit-call-threshold`など）を持つ。これは箱出しの挙動——ユーザーが実際に得るもの——を比較している。積極的なチューニングはZJITのクロスオーバーを動かしうるが、それは出荷されるものではない。
- **ウォーム実行は未測定**。ウォームな`rigor check`は約0.2〜1.5秒（IO／require律速で、JIT化できない）。両JITともそこでは負けるだろうし、Rigorはそれほど短い実行では決してJITを有効化しない。
- **ZJITを再評価する**のは、将来のRubyのZJITが大・コールドの`rigor check`での定常状態のギャップをYJITに対して詰めたとき（このマトリクスを再実行する）、あるいはZJITがupstreamの既定JITになったときだ。それまではYJITのままとする。
