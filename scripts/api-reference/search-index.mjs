import { siteSlugRoute } from '../site-slug.mjs';

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function searchIndexFor(artifact, reference) {
  const published = new Map(reference.pages.map((page) => [page.slug, page]));
  const entries = [];
  for (const scope of artifact.export.scopes) {
    const declarations = new Map(scope.declarations.map((row) => [row.id, row]));
    for (const page of scope.pages) {
      const slug = `${reference.url.slice(1)}${siteSlugRoute(page.path.replace(/\.md$/, ''))}`;
      const rendered = published.get(slug);
      if (!rendered) throw new Error(`Search page was not published: ${page.path}`);
      const url = `/${rendered.slug}/`;
      const rows = page.declarations.map((id) => {
        const row = declarations.get(id);
        if (!row) throw new Error(`Search declaration was not published: ${id}`);
        return row;
      });
      if (!rows.some((row) => ['class', 'module'].includes(row.kind) && row.display_name === rendered.title)) {
        entries.push({ id: `namespace:${scope.name}:${page.path}`, kind: 'namespace', name: rendered.title.split('::').at(-1),
          qualifiedName: rendered.title, owner: rendered.title.split('::').slice(0, -1).join('::'), scope: scope.name, visibility: ['public', 'protected', 'private'].find((visibility) => rows.some((row) => row.visibility === visibility)) || 'public', publication: rows.every((row) => row.publication === 'internal') ? 'internal' : 'public', deprecated: false, url });
      }
      for (const row of rows) {
        if (!rendered.body.includes(`id="${row.anchor}"`)) {
          throw new Error(`Search declaration was not published: ${row.id}`);
        }
        const member = /^(instance|singleton)_/.test(row.kind);
        const owner = member ? row.display_name.slice(0, -(row.name.length + 1)) : row.display_name.split('::').slice(0, -1).join('::');
        entries.push({ id: row.id, kind: row.kind, name: row.name, qualifiedName: row.display_name,
          owner, scope: scope.name, visibility: row.visibility, publication: row.publication || 'public',
          deprecated: row.documentation.some((tag) => tag.name === 'deprecated'), location: `${row.span.path}:${row.span.start_line}`, url: `${url}#${row.anchor}` });
      }
    }
  }
  entries.sort((a, b) => compare(a.qualifiedName, b.qualifiedName) || compare(a.scope, b.scope) || compare(a.id, b.id));
  return { version: 2, entries };
}
