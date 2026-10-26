import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { validateSearchIndex } from '../../src/scripts/api-search-model.mjs';
import { fromHtml } from 'hast-util-from-html';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? htmlFiles(path.join(directory, entry.name)) : entry.name.endsWith('.html') ? [path.join(directory, entry.name)] : []));
  return groups.flat();
}

function inspect(html) {
  const ids = new Set();
  const links = [];
  const visit = (node) => {
    if (node.properties?.id) ids.add(node.properties.id);
    if (node.tagName === 'a' && node.properties?.href) links.push(node.properties.href);
    node.children?.forEach(visit);
  };
  visit(fromHtml(html));
  return { ids, links };
}

export async function checkBuiltApi(directory) {
  const root = path.resolve(directory);
  const files = [...await htmlFiles(path.join(root, 'apiref')), ...await htmlFiles(path.join(root, 'ja/apiref'))];
  if (!files.length) throw new Error('No API HTML pages were built');
  const pages = new Map(await Promise.all(files.map(async (file) => [file, inspect(await readFile(file, 'utf8'))])));
  let count = 0;
  for (const [file, page] of pages) {
    for (const href of page.links) {
      const url = new URL(href, `https://api.invalid/${path.relative(root, file).replace(/index\.html$/, '')}`);
      if (url.origin !== 'https://api.invalid' || !/^\/(?:ja\/)?apiref(?:\/|$)/.test(url.pathname)) continue;
      const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
      const target = relative.endsWith('.html') ? path.resolve(root, relative) : path.resolve(root, relative, 'index.html');
      const linked = pages.get(target);
      if (!linked || (url.hash && !linked.ids.has(decodeURIComponent(url.hash.slice(1))))) {
        throw new Error(`Broken API link in ${path.relative(root, file)}: ${href}`);
      }
      count++;
    }
  }
  const index = validateSearchIndex(JSON.parse(await readFile(path.join(root, 'api-symbols.json'), 'utf8')));
  for (const entry of index) {
    const url = new URL(entry.url, 'https://api.invalid');
    const target = path.resolve(root, decodeURIComponent(url.pathname).slice(1), 'index.html');
    const page = pages.get(target);
    if (!page || (url.hash && !page.ids.has(decodeURIComponent(url.hash.slice(1))))) {
      throw new Error(`Broken API search target: ${entry.id}: ${entry.url}`);
    }
  }
  return { pages: files.length, links: count, searchTargets: index.length };
}
