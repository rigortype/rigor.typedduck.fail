---
title: "外部gemの由来: カバレッジのフロアはエンジンギャップではなくgemインストール境界だ"
description: "rigortype/rigor docs/notes/20260711-external-gem-install-boundary.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-external-gem-install-boundary.md"
sourcePath: "docs/notes/20260711-external-gem-install-boundary.md"
sourceSha: "4ffe77c32186fb80ce0b8ebd1c12e9627426e543809086b6d4262a17293d5df1"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

調査ノート、2026-07-11。[ADR-82 WD9](../../adr/82-dynamic-provenance-wiring/)の外部gem定数由来のランディングと、そこで記録されたカバレッジの制限を受けたものである。問いは、「ターゲット`GEM_PATH`認識」を構築して、グローバルgemプロジェクト（mise/rbenv）がrigor共有のフロアではなく完全な外部gem集合を得られるようにすべきか、というものだった。**答えはノーだ── この制限はADR-27の設計境界であり、既存のオプトインが用意されている。そして本当の事前条件は、単にgemがインストールされていることだけである。**

## フロアが実際に何だったか

WD9が調査アプリで計測した収量（Mastodon `app/models` 47、GitLab `lib` 124）は、*すべて*rigor自身がバンドルするgem（`i18n`、`rack`、`activesupport`）から来ていた。プロジェクト固有のgem（`grape`、`banzai`、`globalid`、`railties`）はいずれも何も生み出さなかった。理由はリゾルバーではない── **調査用チェックアウトにはgemが1つもインストールされていない**からだ:

```
$ cd rigor-survey/gitlab && bundle show globalid
… in locally installed gems      # not found — the bundle was never installed
```

GitLabの800を超えるロック済みgemは、その`Gemfile.lock`の中にしか存在しない。ディスク上に何もなければ、どんな解決戦略── `Gem::Specification`でも、`GEM_PATH`のプローブでも── gemの定数を読むことはできない。WD9の`Gem::Specification`フォールバックは、たまたまrigor*自身*のバンドルが共有する3つのgemを捕捉しただけであり、それがフロアのすべてである。

## なぜ「ターゲットGEM_PATH認識」が誤った修正なのか

`BundleSigDiscovery.auto_detect`はすでにこの境界を明言しており、それは意図的なものだ（[ADR-27](../27-tool-distribution-model/) ── Rigorはプロジェクトを*データ*として読み、そのツールチェーンを決して実行しない）:

> 純粋なデフォルトのインストール場所── `path`を設定せずアクティブなRubyのGEM_HOMEにあるgem── は*プロジェクト*のRubyのgem homeであり、隔離されたアナライザーはプロジェクトのツールチェーンを実行しない限りそれを知り得ない。`bundler.bundle_path:`でrigorをそこに向けよ … rigor自身の環境からの`BUNDLE_PATH`は意図的に参照しない── それはrigorのバンドルを記述するものであり、解析対象プロジェクトのものではない。

ターゲットのgem homeを自動検出するには、(a)プロジェクトのツールチェーンを実行する（ADR-27が依拠する隔離を破る）か、(b)あらゆるバージョンマネージャーのディスク上レイアウト（mise対rbenv対rvm対asdf、それぞれ異なる）を脆い当て推量として再実装するかのいずれかになる。しかもそれは**冗長**だ── 逃げ道はすでに存在し、すでに最後まで貫通している── `bundler.bundle_path:` → `Configuration` → `ProjectContext` → `Environment.for_project` → WD9定数インデックスの一次リゾルバー、というふうに。

## gemがインストールされていれば機能が完成している証明

Redmineの完全なバンドルを`vendor/bundle`にインストールし（101個のgem）── これは`auto_detect`が設定なしで見つける唯一のレイアウトだ── **変更していないエンジンコード**に対して`coverage --protection app lib`を再実行した:

| 原因 | 前（未インストール） | 後（`vendor/bundle`） |
|---|---:|---:|
| `external_gem_without_rbs` | 共有gemのフロア | **279** |

この279件はRedmineの実際のgemに根ざしており、正しいと判定された: `Rails.application` / `Rails.env`（`railties-8.1.3/lib/rails.rb`が`module Rails`を宣言し、`sig/`を同梱しない → `:missing` → インデックス化）、`fragment.scrub!`（loofah）、`I18n.t`（i18n）。エンジンの変更はない── 既存の`vendor/bundle`自動検出＋WD9インデックスが、gemがディスク上に置かれた瞬間に完全な集合を届けた。

## 結論

外部gemの由来は**完成**している。そのカバレッジは、プロジェクトのgemがRigorに参照を許された場所へインストールされているかどうかの関数である:

- `vendor/bundle` / `BUNDLE_PATH` → 自動検出され、完全なカバレッジ（Redmine: 279箇所）。
- デフォルトのgem home（rbenv/mise、`--path`なし） → `bundler.bundle_path:`を設定する（ADR-27のオプトイン）。
- 未インストール（素のチェックアウト） → rigor共有のフロア。正しくフェイルオープンする。

これが正当化した唯一の作業は**ドキュメント**だった── [`docs/manual/15-type-protection-coverage.md`](../../manual/15-type-protection-coverage/)の「Why a hole is untyped」節にある「Rigorが読める場所にgemをインストールせよ」という注記だ。エンジンの変更はない。「ターゲットGEM_PATH認識」は、先送りではなく決定済み（ADR-27）としてクローズされる。
