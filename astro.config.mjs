import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';

const sidebarTranslations = {
  reference: { ja: 'リファレンス' },
  handbook: { ja: 'ハンドブック' },
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
      sidebar: [
        {
          label: 'Reference',
          translations: sidebarTranslations.reference,
          slug: 'reference',
        },
        {
          label: 'Handbook',
          translations: sidebarTranslations.handbook,
          items: [{ autogenerate: { directory: 'reference/handbook', collapsed: false } }],
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
            { slug: 'reference/milestones' },
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
