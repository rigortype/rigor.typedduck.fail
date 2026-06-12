import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import remarkCjkFriendly from 'remark-cjk-friendly';

const sidebarTranslations = {
  recentlyUpdated: { ja: '最近の更新' },
  reference: { ja: 'リファレンス' },
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
        // online book (JA-only for now; an EN edition is planned). The topic
        // switcher renders above the sidebar; full-text search stays shared.
        starlightSidebarTopics(
          [
            {
              label: { en: 'Reference', ja: 'リファレンス' },
              id: 'reference',
              link: '/reference/',
              icon: 'open-book',
              items: [
        {
          label: 'Recently Updated',
          translations: sidebarTranslations.recentlyUpdated,
          slug: 'recently-updated',
        },
        {
          label: 'Reference',
          translations: sidebarTranslations.reference,
          slug: 'reference',
        },
        {
          label: 'Handbook',
          translations: sidebarTranslations.handbook,
          items: [
            { slug: 'reference/handbook' },
            { slug: 'reference/handbook/01-getting-started' },
            { slug: 'reference/handbook/02-everyday-types' },
            { slug: 'reference/handbook/03-narrowing' },
            { slug: 'reference/handbook/04-tuples-and-shapes' },
            { slug: 'reference/handbook/05-methods-and-blocks' },
            { slug: 'reference/handbook/06-classes' },
            { slug: 'reference/handbook/07-rbs-and-extended' },
            { slug: 'reference/handbook/08-understanding-errors' },
            { slug: 'reference/handbook/09-plugins' },
            { slug: 'reference/handbook/10-sorbet' },
            { slug: 'reference/handbook/11-sig-gen' },
            { slug: 'reference/handbook/12-lightweight-hkt' },
            {
              label: 'Appendix — Coming from another type checker',
              translations: { ja: '付録 — 他の型チェッカーから来た場合' },
              collapsed: false,
              items: [
                { slug: 'reference/handbook/appendix-typescript' },
                { slug: 'reference/handbook/appendix-phpstan' },
                { slug: 'reference/handbook/appendix-mypy' },
                { slug: 'reference/handbook/appendix-steep' },
                { slug: 'reference/handbook/appendix-typeprof' },
                { slug: 'reference/handbook/appendix-java-csharp' },
                { slug: 'reference/handbook/appendix-rust' },
                { slug: 'reference/handbook/appendix-go' },
                { slug: 'reference/handbook/appendix-elixir' },
              ],
            },
            {
              label: 'Appendix — Protocols and structural typing',
              translations: { ja: '付録 — プロトコルと構造的型付け' },
              collapsed: false,
              items: [
                { slug: 'reference/handbook/appendix-protocols-and-structural-typing' },
              ],
            },
            {
              label: 'Appendix — Connections to type theory',
              translations: { ja: '付録 — 型理論との接続' },
              collapsed: false,
              items: [
                { slug: 'reference/handbook/appendix-type-theory' },
                { slug: 'reference/handbook/appendix-liskov' },
              ],
            },
          ],
        },
        {
          // Listed explicitly (not autogenerated) so the manual stops at its
          // own chapters and does NOT recurse into reference/manual/plugins —
          // those are promoted to the sibling "Plugin Reference" group below.
          // The plugin pages keep their reference/manual/plugins/* URLs; only
          // the sidebar grouping changes. New manual chapters must be added
          // here by hand (see AGENTS.md).
          label: 'User Manual',
          translations: sidebarTranslations.userManual,
          collapsed: true,
          items: [
            { slug: 'reference/manual' },
            { slug: 'reference/manual/01-installation' },
            { slug: 'reference/manual/02-cli-reference' },
            { slug: 'reference/manual/03-configuration' },
            { slug: 'reference/manual/04-diagnostics' },
            { slug: 'reference/manual/05-inspecting-types' },
            { slug: 'reference/manual/06-baseline' },
            { slug: 'reference/manual/07-plugins' },
            { slug: 'reference/manual/08-skills' },
            { slug: 'reference/manual/09-editor-integration' },
            { slug: 'reference/manual/10-mcp-server' },
            { slug: 'reference/manual/11-ci' },
            { slug: 'reference/manual/ci-templates' },
            { slug: 'reference/manual/12-caching' },
            { slug: 'reference/manual/13-troubleshooting' },
            { slug: 'reference/manual/14-rails-quickstart' },
          ],
        },
        {
          // Promoted out of "User Manual" to its own top-level group. Pages
          // still live under reference/manual/plugins/ (URLs unchanged); this
          // group autogenerates from that directory so new plugin pages keep
          // appearing automatically.
          label: 'Plugin Reference',
          translations: sidebarTranslations.pluginReference,
          collapsed: true,
          items: [{ autogenerate: { directory: 'reference/manual/plugins', collapsed: true } }],
        },
        {
          label: 'Type Specification',
          translations: sidebarTranslations.typeSpecification,
          collapsed: true,
          items: [{ autogenerate: { directory: 'reference/type-specification', collapsed: true } }],
        },
        {
          label: 'Internal Specification',
          translations: sidebarTranslations.internalSpec,
          collapsed: true,
          items: [{ autogenerate: { directory: 'reference/internal-spec', collapsed: true } }],
        },
        {
          label: 'Architecture Decisions',
          translations: sidebarTranslations.architecture,
          collapsed: true,
          items: [{ autogenerate: { directory: 'reference/adr', collapsed: true } }],
        },
        {
          label: 'Design Notes',
          translations: sidebarTranslations.designNotes,
          collapsed: true,
          items: [{ autogenerate: { directory: 'reference/design', collapsed: true } }],
        },
        {
          label: 'Project',
          translations: sidebarTranslations.project,
          collapsed: true,
          items: [
            { slug: 'reference/current-work' },
            { slug: 'reference/roadmap' },
            { slug: 'reference/types' },
          ],
        },
        {
          label: 'Development Notes',
          translations: sidebarTranslations.developmentNotes,
          collapsed: true,
          items: [{ autogenerate: { directory: 'reference/notes', collapsed: true } }],
        },
              ],
            },
            {
              // The chibirigor online book. Pages are synced from the
              // upstream/chibirigor submodule (book/v1/ja) by
              // scripts/sync-chibirigor-docs.mjs into ja/chibirigor/. Only a
              // Japanese edition exists today, so the topic links into the
              // /ja/ locale; when an English edition lands, add its pages and
              // switch the link to a locale-agnostic /chibirigor/ root.
              label: 'chibirigor',
              // `id` lets the JA-only standalone pages (the landing page and
              // the glossary, which have no EN counterpart and so cannot be
              // referenced by a locale-agnostic `slug` without breaking the EN
              // build) associate with this topic via their `topic` frontmatter,
              // stamped by sync-chibirigor-docs.mjs.
              id: 'chibirigor',
              link: '/ja/chibirigor/',
              icon: 'puzzle',
              items: [
                {
                  label: 'The Little chibirigor（前編）',
                  items: [{ autogenerate: { directory: 'chibirigor/little' } }],
                },
                {
                  label: 'The Seasoned chibirigor（後編）',
                  items: [{ autogenerate: { directory: 'chibirigor/seasoned' } }],
                },
                { label: '用語集', link: '/ja/chibirigor/glossary/' },
                {
                  label: '付録',
                  items: [{ autogenerate: { directory: 'chibirigor/appendix', collapsed: true } }],
                },
              ],
            },
          ],
          {
            // The bilingual splash homepages belong to no topic; let them
            // keep the built-in (empty) sidebar instead of forcing a topic.
            exclude: ['/', '/ja'],
            // Associate the chibirigor pages with the topic by URL. The
            // pages reached through the topic's autogenerated sidebar groups
            // associate on their own, but the standalone landing and glossary
            // pages (JA-only, no EN slug counterpart) need this glob.
            topics: {
              // Reference pages not enumerated in the sidebar items above
              // (e.g. the changelog, stray index pages) still need a topic.
              reference: [
                '/reference', '/reference/**/*',
                '/ja/reference', '/ja/reference/**/*',
                '/recently-updated', '/ja/recently-updated',
              ],
              chibirigor: ['/ja/chibirigor', '/ja/chibirigor/**/*'],
            },
          },
        ),
      ],
    }),
    mdx(),
  ],
});
