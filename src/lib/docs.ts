import { getCollection, type CollectionEntry } from 'astro:content';

export type DocEntry = CollectionEntry<'docs'>;

/** Canonical site origin (matches `site` in astro.config.mjs). */
export const SITE = 'https://rigor.typedduck.fail';

// Root-locale pages that are not useful as clean markdown / are pure splash or
// component-driven listings. They are excluded from the `.md` endpoint, the
// `llms.txt` index, and the `llms-full.txt` corpus.
const DENY_IDS = new Set(['recently-updated']);

/**
 * English (root-locale) documentation pages only. The Japanese mirror lives
 * under `ja/…` and is excluded — the root `llms.txt` / `llms-full.txt` and the
 * per-page `.md` twins are English-canonical (a future `/ja/llms.txt` would
 * carry the JA tree).
 */
export function isEnglishDoc(entry: DocEntry): boolean {
  const id = entry.id;
  if (id.startsWith('ja/')) return false;
  if (DENY_IDS.has(id)) return false;
  return true;
}

/** The splash homepage has an empty id; serve its markdown at `/index.md`. */
export function slugFor(entry: DocEntry): string {
  return entry.id === '' ? 'index' : entry.id;
}

/** The live HTML page URL for an entry — used as the `Source:` citation anchor. */
export function urlFor(entry: DocEntry): string {
  const id = entry.id;
  const path = id === '' || id === 'index' ? '' : `${id}/`;
  return `${SITE}/${path}`;
}

export async function englishDocs(): Promise<DocEntry[]> {
  const all = await getCollection('docs');
  return all.filter(isEnglishDoc);
}

/** Sidebar order from synced frontmatter, then id as a stable tie-break. */
export function bySidebarOrder(a: DocEntry, b: DocEntry): number {
  const order = (e: DocEntry) =>
    (e.data.sidebar as { order?: number } | undefined)?.order ?? Number.MAX_SAFE_INTEGER;
  return order(a) - order(b) || a.id.localeCompare(b.id);
}

/**
 * Flatten a page body to clean, portable Markdown for LLM ingestion:
 * - strip MDX `import` lines and capitalised JSX component tags (lowercase
 *   HTML like `<details>` / `<ruby>` is real content and kept);
 * - flatten Starlight asides (`:::note[Label]` … `:::`) to blockquotes;
 * - unescape GFM table-cell pipes (`\|` → `|`; the site needs the escape for
 *   re-rendering, but this output is read raw, never re-rendered);
 * - demote a stray body H1 (`# …`) to `##` so the page title stays the only H1.
 * Fenced code blocks are passed through untouched.
 */
export function cleanMarkdown(body: string): string {
  const lines = body.split('\n');
  const out: string[] = [];
  let inFence = false;
  let asideOpen = false;

  for (const raw of lines) {
    // Fence boundary: toggle and emit verbatim.
    if (/^\s*(`{3,}|~{3,})/.test(raw)) {
      inFence = !inFence;
      out.push(raw);
      continue;
    }
    if (inFence) {
      out.push(raw);
      continue;
    }

    // Drop MDX scaffolding.
    if (/^\s*import\s.+\bfrom\b.+;?\s*$/.test(raw)) continue;
    if (/^\s*<\/?[A-Z][A-Za-z0-9]*(\s[^>]*)?\/?>\s*$/.test(raw)) continue;

    // Starlight aside open: `:::note` / `:::tip[Heads up]`.
    const open = raw.match(
      /^:::(note|tip|caution|danger|important|warning)(?:\[(.*?)\])?\s*$/,
    );
    if (open) {
      const label = open[2] || open[1][0].toUpperCase() + open[1].slice(1);
      out.push(`> **${label}**`, '>');
      asideOpen = true;
      continue;
    }
    if (asideOpen && /^:::\s*$/.test(raw)) {
      asideOpen = false;
      continue;
    }

    let line = raw.replace(/\\\|/g, '|');
    if (/^#\s/.test(line)) line = `#${line}`;
    if (asideOpen) line = line === '' ? '>' : `> ${line}`;
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** A single page rendered as an llms-style block: H1 title, Source URL, body. */
export function pageBlock(entry: DocEntry): string {
  const title = entry.data.title ?? slugFor(entry);
  return `# ${title}\nSource: ${urlFor(entry)}\n\n${cleanMarkdown(entry.body ?? '')}`;
}
