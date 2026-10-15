import { code, escapeHtml, markdownText, prose } from './prose.mjs';
import { pageSlug, pageUrl, routePages, scopeSlug, scopeUrl } from './routes.mjs';

const frontmatter = (title, description) => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\neditUrl: false\nprev: false\nnext: false\n---\n\n`;
const link = (label, href, index = false) => `<a${index ? ' class="api-index-link"' : ''} href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
const crumbs = (items) => `<nav class="api-breadcrumbs" aria-label="Breadcrumb"><ol>${items.map(([label, href]) => `<li>${href ? link(label, href) : `<span aria-current="page">${escapeHtml(label)}</span>`}</li>`).join('')}</ol></nav>\n\n`;
const declarationKind = (kind) => {
  if (kind === 'class' || kind === 'module' || kind === 'constant' || kind === 'refinement') return kind;
  if (kind.includes('attribute')) return 'attribute';
  return kind.startsWith('singleton_') ? 'singleton method' : 'instance method';
};
const titleFor = (scope, page) => page.path.slice(scope.destination.length + 1).replace(/\.md$/, '').split('/').join('::');
const categories = [['Classes', 'class'], ['Modules', 'module'], ['Constants', 'constant'], ['Attributes', 'attribute'], ['Instance methods', 'instance method'], ['Singleton methods', 'singleton method'], ['Ruby refinements', 'refinement']];

function indexEntries(rows) {
  return categories.map(([title, kind]) => {
    const matches = rows.filter((row) => declarationKind(row.kind) === kind);
    if (!matches.length) return '';
    return `## ${title}\n\n${matches.map((row) => `- ${link(row.displayName, `${pageUrl(row.page)}#${row.anchor}`, true)}`).join('\n')}\n\n`;
  }).join('');
}

function entry(row, model) {
  const kind = declarationKind(row.kind);
  const signature = kind.includes('method') ? `${row.displayName}(${row.parameters.join(', ')})` : row.displayName;
  let result = `<section class="api-declaration" aria-labelledby="${row.anchor}">\n\n<h3 id="${row.anchor}" class="api-signature">${code(signature)}</h3>\n\n<p class="api-meta">${escapeHtml(kind)} · ${code(`${row.source.path}:${row.source.line}`)}</p>\n\n`;
  const texts = row.tags.filter((tag) => tag.name === 'text');
  const description = texts.map((tag, i) => {
    const previous = texts[i - 1];
    const gap = previous ? '\n'.repeat(tag.line > previous.endLine + 1 ? 2 : 1) : '';
    return gap + tag.description;
  }).join('');
  result += prose(description, row.page, model);
  for (const tag of row.tags.filter((tag) => !['text', 'raw'].includes(tag.name))) {
    const names = { param: 'Parameter', return: 'Returns', yieldparam: 'Block parameter', yieldreturn: 'Block returns', raise: 'Raises', note: 'Note', see: 'See also', deprecated: 'Deprecated', example: 'Example', option: 'Option' };
    result += `\n**${names[tag.name] || markdownText(tag.name)}${tag.subject ? ` ${code(tag.subject)}` : ''}**\n\n`;
    result += tag.name === 'example'
      ? `<pre class="api-example"><code>${escapeHtml(tag.description)}</code></pre>\n`
      : prose(tag.description, row.page, model);
  }
  return `${result}\n</section>\n\n`;
}

export function renderPages(model, source) {
  routePages(model);
  const pages = new Map();
  const provenance = `<p class="api-provenance">Rigor source ${link(source.commit.slice(0, 8), `https://github.com/rigortype/rigor/tree/${source.commit}`)} · ZARD ${escapeHtml(model.producer.zard)} / zard-doc ${escapeHtml(model.producer.zardDoc)}</p>\n\n`;
  let root = frontmatter('API Reference', 'Explore Rigor classes, modules and public members.') + provenance;
  root += 'Browse the public declarations in the selected Rigor source trees. Source documentation is shown in English.\n\n';
  root += model.scopes.length ? model.scopes.map((scope) => `- ${link(scope.name, scopeUrl(scope), true)} — ${scope.pages.length} namespace pages, ${scope.declarations.length} public declarations`).join('\n') : 'No public declarations were exported. Check the selected source mappings before publishing.';
  pages.set('apiref/index.md', root + '\n');
  pages.set('ja/apiref/index.md', frontmatter('APIリファレンス', 'Rigorの英語APIリファレンスへの入口。') + 'APIリファレンスは現在英語で提供しています。クラス・モジュール・公開メソッドは英語版で確認できます。\n\n' + link('英語のAPIリファレンスを開く', '/apiref/', true) + '\n');
  for (const scope of model.scopes) {
    let index = frontmatter(`${scope.name} API`, `Public API declarations in the ${scope.name} documentation scope.`);
    index += crumbs([['API Reference', '/apiref/'], [scope.name]]) + provenance;
    index += indexEntries(scope.declarations) || 'No public declarations were exported for this documentation scope.\n';
    pages.set(`${scopeSlug(scope)}/index.md`, index);
    for (const page of scope.pages) {
      const title = titleFor(scope, page);
      const segments = title.split('::');
      const ancestors = segments.slice(0, -1).flatMap((_, i) => {
        const candidate = `${scope.destination}/${segments.slice(0, i + 1).join('/')}.md`;
        return scope.pages.some((item) => item.path === candidate) ? [[segments[i], pageUrl(candidate)]] : [];
      });
      let content = frontmatter(title, `Public declarations and source documentation for ${title}.`);
      content += crumbs([['API Reference', '/apiref/'], [scope.name, scopeUrl(scope)], ...ancestors, [segments.at(-1)]]) + provenance;
      for (const [category, kind] of categories) {
        const rows = page.declarations.filter((row) => declarationKind(row.kind) === kind);
        if (rows.length) content += `## ${category}\n\n${rows.map((row) => entry(row, model)).join('')}`;
      }
      pages.set(`${pageSlug(page.path)}.md`, content);
    }
  }
  return pages;
}
