import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import remarkCjkFriendly from 'remark-cjk-friendly';

const sidebarTranslations = {
  recentlyUpdated: { ja: '最近の更新' },
  handbook: { ja: 'ハンドブック' },
  userManual: { ja: 'ユーザーマニュアル' },
  pluginReference: { ja: 'プラグインリファレンス' },
  typeSpecification: { ja: '型仕様' },
  internalSpec: { ja: '内部仕様' },
  architecture: { ja: '設計判断' },
  designNotes: { ja: '設計ノート' },
  project: { ja: 'プロジェクト' },
  developmentNotes: { ja: '開発レポート' },
};

export default defineConfig({
  site: 'https://rigor.typedduck.fail',
  // CommonMark's emphasis flanking rules treat full-width CJK punctuation
  // (。、「」（） etc.) as Unicode punctuation, so a `**`/`*` adjacent to it
  // (e.g. 読める。**最大 or 分岐点は**「型) fails to open/close and the raw
  // marker leaks into the HTML. remark-cjk-friendly makes the flanking rules
  // CJK-aware. The MDX integration inherits this markdown config by default,
  // so both .md and .mdx are covered.
  markdown: {
    remarkPlugins: [remarkCjkFriendly],
  },
  integrations: [
    starlight({
      title: 'Rigor',
      description: 'Documentation for the Rigor Ruby static analyzer.',
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        ja: {
          label: '日本語',
          lang: 'ja',
        },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/rigortype/rigor',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        Head: './src/components/Head.astro',
        Footer: './src/components/Footer.astro',
      },
      head: [
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Rigor',
            url: 'https://rigor.typedduck.fail',
            description: 'Documentation for the Rigor Ruby static analyzer.',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://rigor.typedduck.fail/search?q={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          }),
        },
      ],
      plugins: [
        // Two independent navigation sections ("topics"), each with its own
        // sidebar: the upstream Rigor reference (EN + JA) and the chibirigor
        // online book (EN + JA, v2). The topic switcher renders above the
        // sidebar; full-text search stays shared.
        starlightSidebarTopics(
          [
            {
              label: { en: 'Reference', ja: 'リファレンス' },
              id: 'reference',
              // The reference tree lives at the site root (the `reference/`
              // URL namespace was removed). The topic button points at the
              // bilingual splash landing, which doubles as the reference home.
              link: '/',
              icon: 'open-book',
              items: [
        {
          label: 'Recently Updated',
          translations: sidebarTranslations.recentlyUpdated,
          slug: 'recently-updated',
        },
        {
          label: 'Handbook',
          translations: sidebarTranslations.handbook,
          items: [
            { slug: 'handbook' },
            { slug: 'handbook/01-getting-started' },
            { slug: 'handbook/02-everyday-types' },
            { slug: 'handbook/03-narrowing' },
            { slug: 'handbook/04-tuples-and-shapes' },
            { slug: 'handbook/05-methods-and-blocks' },
            { slug: 'handbook/06-classes' },
            { slug: 'handbook/07-rbs-and-extended' },
            { slug: 'handbook/08-understanding-errors' },
            { slug: 'handbook/09-plugins' },
            { slug: 'handbook/10-sorbet' },
            { slug: 'handbook/11-sig-gen' },
            { slug: 'handbook/12-lightweight-hkt' },
            {
              label: 'Appendix — Coming from another type checker',
              translations: { ja: '付録 — 他の型チェッカーから来た場合' },
              collapsed: false,
              items: [
                { slug: 'handbook/appendix-typescript' },
                { slug: 'handbook/appendix-phpstan' },
                { slug: 'handbook/appendix-mypy' },
                { slug: 'handbook/appendix-steep' },
                { slug: 'handbook/appendix-typeprof' },
                { slug: 'handbook/appendix-java-csharp' },
                { slug: 'handbook/appendix-rust' },
                { slug: 'handbook/appendix-go' },
                { slug: 'handbook/appendix-elixir' },
              ],
            },
            {
              label: 'Appendix — Protocols and structural typing',
              translations: { ja: '付録 — プロトコルと構造的型付け' },
              collapsed: false,
              items: [
                { slug: 'handbook/appendix-protocols-and-structural-typing' },
              ],
            },
            {
              label: 'Appendix — Connections to type theory',
              translations: { ja: '付録 — 型理論との接続' },
              collapsed: false,
              items: [
                { slug: 'handbook/appendix-type-theory' },
                { slug: 'handbook/appendix-liskov' },
              ],
            },
          ],
        },
        {
          // Listed explicitly (not autogenerated) so the manual stops at its
          // own chapters and does NOT recurse into manual/plugins — those are
          // promoted to the sibling "Plugin Reference" group below. The plugin
          // pages keep their manual/plugins/* URLs; only the sidebar grouping
          // changes. New manual chapters must be added here by hand (see
          // AGENTS.md).
          label: 'User Manual',
          translations: sidebarTranslations.userManual,
          collapsed: true,
          items: [
            { slug: 'manual' },
            { slug: 'manual/01-installation' },
            { slug: 'manual/02-cli-reference' },
            { slug: 'manual/03-configuration' },
            { slug: 'manual/04-diagnostics' },
            { slug: 'manual/05-inspecting-types' },
            { slug: 'manual/06-baseline' },
            { slug: 'manual/07-plugins' },
            { slug: 'manual/08-skills' },
            { slug: 'manual/09-editor-integration' },
            { slug: 'manual/10-mcp-server' },
            { slug: 'manual/11-ci' },
            { slug: 'manual/ci-templates' },
            { slug: 'manual/12-caching' },
            { slug: 'manual/13-troubleshooting' },
            { slug: 'manual/14-rails-quickstart' },
          ],
        },
        {
          // Promoted out of "User Manual" to its own top-level group. Pages
          // live under manual/plugins/; this group autogenerates from that
          // directory so new plugin pages keep appearing automatically.
          label: 'Plugin Reference',
          translations: sidebarTranslations.pluginReference,
          collapsed: true,
          items: [{ autogenerate: { directory: 'manual/plugins', collapsed: true } }],
        },
        {
          label: 'Type Specification',
          translations: sidebarTranslations.typeSpecification,
          collapsed: true,
          items: [{ autogenerate: { directory: 'type-specification', collapsed: true } }],
        },
        {
          label: 'Internal Specification',
          translations: sidebarTranslations.internalSpec,
          collapsed: true,
          items: [{ autogenerate: { directory: 'internal-spec', collapsed: true } }],
        },
        {
          label: 'Architecture Decisions',
          translations: sidebarTranslations.architecture,
          collapsed: true,
          items: [{ autogenerate: { directory: 'adr', collapsed: true } }],
        },
        {
          label: 'Design Notes',
          translations: sidebarTranslations.designNotes,
          collapsed: true,
          items: [{ autogenerate: { directory: 'design', collapsed: true } }],
        },
        {
          label: 'Project',
          translations: sidebarTranslations.project,
          collapsed: true,
          items: [
            { slug: 'current-work' },
            { slug: 'roadmap' },
            { slug: 'compatibility' },
            { slug: 'types' },
          ],
        },
        {
          label: 'Development Notes',
          translations: sidebarTranslations.developmentNotes,
          collapsed: true,
          items: [{ autogenerate: { directory: 'notes', collapsed: true } }],
        },
              ],
            },
            {
              // The chibirigor online book (v2). Pages are synced from the
              // upstream/chibirigor submodule (book/v2/en + book/v2/ja) by
              // scripts/sync-chibirigor-docs.mjs into chibirigor/ (EN, root
              // locale) and ja/chibirigor/ (JA). Both editions are published,
              // so the topic and its items are locale-agnostic: `slug` /
              // `autogenerate` entries resolve to the current locale's page.
              label: 'chibirigor',
              // `id` lets the standalone landing page (which has no sidebar
              // entry of its own) associate with this topic via the fallback
              // `topics` globs below.
              id: 'chibirigor',
              // Pass the locale-strip path so getRelativeLocaleUrl() can add
              // the correct locale prefix. Passing '/ja/chibirigor/' directly
              // would produce '/ja/ja/chibirigor/' in JA locale context.
              link: '/chibirigor/',
              icon: 'puzzle',
              items: [
                {
                  label: 'The Little chibirigor',
                  translations: { ja: 'The Little chibirigor（前編）' },
                  items: [{ autogenerate: { directory: 'chibirigor/little' } }],
                },
                {
                  label: 'The Seasoned chibirigor',
                  translations: { ja: 'The Seasoned chibirigor（後編）' },
                  items: [{ autogenerate: { directory: 'chibirigor/seasoned' } }],
                },
                // Locale-aware now that an EN glossary exists: `slug` resolves
                // to /chibirigor/glossary/ (EN) and /ja/chibirigor/glossary/ (JA).
                { label: 'Glossary', translations: { ja: '用語集' }, slug: 'chibirigor/glossary' },
                {
                  label: 'Appendix',
                  translations: { ja: '付録' },
                  items: [{ autogenerate: { directory: 'chibirigor/appendix', collapsed: true } }],
                },
              ],
            },
          ],
          {
            // The bilingual splash homepages belong to no topic; let them
            // keep the built-in (empty) sidebar instead of forcing a topic.
            exclude: ['/', '/ja'],
            // Fallback association for pages not reached through a topic's
            // sidebar groups (those associate on their own). The loop in the
            // plugin middleware checks these in order and stops at the first
            // match, so ORDER MATTERS.
            topics: {
              // chibirigor first: its JA-only landing and glossary pages have
              // no sidebar entry, so they must resolve here before the
              // reference catch-all below would otherwise claim them.
              chibirigor: ['/chibirigor', '/chibirigor/**/*', '/ja/chibirigor', '/ja/chibirigor/**/*'],
              // The reference tree now lives at the site root, so every
              // remaining doc belongs to the reference topic — including the
              // changelog and install pages, which aren't enumerated in the
              // sidebar items above. `/*` covers single-segment roots and
              // `/**/*` covers nested pages in both locales (incl. /ja/…). The
              // splash homepages never reach this (no sidebar) and are excluded.
              reference: ['/*', '/**/*'],
            },
          },
        ),
      ],
    }),
    mdx(),
  ],
});
