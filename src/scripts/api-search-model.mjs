const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const normalize = (value) => value.trim().toLowerCase().replace(/^::/, '');

export function matchSymbols(entries, query, limit = 20, filters = {}) {
  const needle = normalize(query);
  if (!needle) return { total: 0, entries: [] };
  const ranked = [];
  for (const entry of entries) {
    if (filters.includeInternal === false && entry.publication === 'internal') continue;
    if (filters.visibility && filters.visibility !== 'all' && (entry.visibility || 'public') !== filters.visibility) continue;
    const qualified = normalize(entry.qualifiedName);
    const name = normalize(entry.name);
    const rank = qualified === needle ? 0 : name === needle ? 1 : qualified.startsWith(needle) ? 2
      : name.startsWith(needle) ? 3 : qualified.includes(needle) ? 4 : -1;
    if (rank >= 0) ranked.push({ entry, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || compare(a.entry.qualifiedName, b.entry.qualifiedName)
    || compare(a.entry.scope, b.entry.scope) || compare(a.entry.kind, b.entry.kind) || compare(a.entry.id, b.entry.id));
  return { total: ranked.length, entries: ranked.slice(0, limit).map(({ entry }) => entry) };
}

export function moveSelection(index, key, length) {
  if (!length) return -1;
  if (key === 'ArrowDown') return (index + 1) % length;
  if (key === 'ArrowUp') return index < 0 ? length - 1 : (index - 1 + length) % length;
  return index;
}

function isApiUrl(value) {
  if (!value.startsWith('/apiref/') || value.includes('\\')) return false;
  try {
    const url = new URL(value, 'https://api.invalid');
    const parts = decodeURIComponent(url.pathname).split('/');
    return url.origin === 'https://api.invalid' && url.pathname.startsWith('/apiref/') && !url.search
      && parts.at(-1) === '' && parts.slice(1, -1).every((part) => part && !['.', '..'].includes(part) && !/[\\\0]/.test(part))
      && (!url.hash || /^#zard-[0-9a-f]+$/.test(url.hash));
  } catch { return false; }
}

export function validateSearchIndex(value) {
  if (![1, 2].includes(value?.version) || !Array.isArray(value.entries) || value.entries.some((entry) =>
    !entry || ['id', 'kind', 'name', 'qualifiedName', 'owner', 'scope', 'url'].some((key) => typeof entry[key] !== 'string')
    || (value.version === 2 && (!['public', 'internal'].includes(entry.publication)
      || !['public', 'protected', 'private'].includes(entry.visibility) || typeof entry.deprecated !== 'boolean'))
    || (entry.location != null && typeof entry.location !== 'string') || !isApiUrl(entry.url))) {
    throw new Error('Invalid API search index');
  }
  return value.entries;
}
