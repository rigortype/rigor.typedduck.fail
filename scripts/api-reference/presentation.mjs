import { createReference } from 'zard-doc-astro';
import { starlightPages, starlightTopic } from 'zard-doc-astro/starlight';

// Product copy, routes, localization and repository provenance belong to this site.
export function referenceFor(artifact) {
  const { source, export: data } = artifact;
  const provenance = typeof source?.commit === 'string' ? [
    { label: `Rigor source ${source.commit.slice(0, 8)}`, url: `https://github.com/rigortype/rigor/tree/${source.commit}` },
    { label: `ZARD ${data?.producer?.zard} / zard-doc ${data?.producer?.zard_doc}` },
  ] : [];
  return createReference(data, {
    basePath: 'apiref',
    title: 'API Reference',
    description: 'Explore Rigor classes, modules and public members.',
    introduction: 'Browse the public declarations in the selected Rigor source trees. Source documentation is shown in English.',
    provenance,
  });
}

export function pagesFor(reference) {
  const pages = starlightPages(reference);
  pages.set('ja/apiref/index.md', `---
title: APIリファレンス
description: Rigorの英語APIリファレンスへの入口。
editUrl: false
prev: false
next: false
---

APIリファレンスは現在英語で提供しています。クラス・モジュール・公開メソッドは英語版で確認できます。

<a class="api-index-link" href="/apiref/">英語のAPIリファレンスを開く</a>
`);
  return pages;
}

export function topicFor(reference) {
  return starlightTopic(reference, {
    id: 'apiref', label: { en: 'API Reference', ja: 'APIリファレンス（英語）' },
    overviewLabel: 'API overview · English',
  });
}
