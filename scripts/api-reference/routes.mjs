import { siteSlugRoute } from '../site-slug.mjs';

export function pageSlug(path) {
  return `apiref/${siteSlugRoute(path.replace(/\.md$/, ''))}`;
}
export const pageUrl = (path) => `/${pageSlug(path)}/`;
export const scopeSlug = (scope) => `apiref/${siteSlugRoute(scope.destination)}`;
export const scopeUrl = (scope) => `/${scopeSlug(scope)}/`;

export function routePages(model) {
  const routes = new Map([['apiref', 'API landing'], ['ja/apiref', 'Japanese entry']]);
  const add = (slug, owner) => {
    if (routes.has(slug) || slug.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error(`API route collision or empty slug: ${slug} (${owner})`);
    }
    routes.set(slug, owner);
  };
  for (const scope of model.scopes) {
    add(scopeSlug(scope), scope.name);
    for (const page of scope.pages) add(pageSlug(page.path), page.path);
  }
  return routes;
}

export function namespaceTree(scope) {
  const root = { children: new Map() };
  for (const page of scope.pages) {
    const segments = page.path.slice(scope.destination.length + 1).replace(/\.md$/, '').split('/');
    let node = root;
    for (const segment of segments) {
      if (!node.children.has(segment)) node.children.set(segment, { label: segment, children: new Map() });
      node = node.children.get(segment);
    }
    node.page = page;
  }
  const items = (node) => [...node.children.values()].sort((a, b) => a.label.localeCompare(b.label, 'en')).map((child) => {
    const descendants = items(child);
    const own = child.page ? { label: child.label, link: pageUrl(child.page.path) } : null;
    return descendants.length
      ? { label: child.label, collapsed: true, items: [...(own ? [{ ...own, label: `${child.label} overview` }] : []), ...descendants] }
      : own;
  });
  return items(root);
}

export function topic(model) {
  return { id: 'apiref', label: { en: 'API Reference', ja: 'APIリファレンス（英語）' },
    link: '/apiref/', icon: 'document', items: [
      { label: 'API overview · English', link: '/apiref/' },
      ...model.scopes.map((scope) => ({ label: scope.name, collapsed: false, items: [
        { label: `${scope.name} index`, link: scopeUrl(scope) }, ...namespaceTree(scope),
      ] })),
    ] };
}
