import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';

const sidebarTranslations = {
  recentlyUpdated: { ja: '最近の更新' },
  reference: { ja: 'リファレンス' },
  handbook: { ja: 'ハンドブック' },
  userManual: { ja: 'ユーザーマニュアル' },
  typeSpecification: { ja: '型仕様' },
  internalSpec: { ja: '内部仕様' },
  architecture: { ja: '設計判断' },
  designNotes: { ja: '設計ノート' },
  project: { ja: 'プロジェクト' },
  developmentNotes: { ja: '開発ノート' },
};

export default defineConfig({
  site: 'https://rigor.typedduck.fail',
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
      sidebar: [
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
              ],
            },
            {
              label: 'Appendix — Connections to type theory',
              translations: { ja: '付録 — 型理論との接続' },
              collapsed: false,
              items: [
                { slug: 'reference/handbook/appendix-type-theory' },
              ],
            },
          ],
        },
        {
          label: 'User Manual',
          translations: sidebarTranslations.userManual,
          collapsed: true,
          items: [{ autogenerate: { directory: 'reference/manual', collapsed: false } }],
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
            {
              label: 'Development Notes',
              translations: sidebarTranslations.developmentNotes,
              items: [{ autogenerate: { directory: 'reference/notes', collapsed: true } }],
            },
          ],
        },
      ],
    }),
    mdx(),
  ],
});
