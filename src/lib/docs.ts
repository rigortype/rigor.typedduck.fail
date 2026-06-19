import { getCollection, type CollectionEntry } from 'astro:content';

export type DocEntry = CollectionEntry<'docs'>;

/** Canonical site origin (matches `site` in astro.config.mjs). */
export const SITE = 'https://rigor.typedduck.fail';

// Component-driven listing pages that are not useful as clean markdown. They are
// excluded from the `.md` endpoint, the `llms.txt` indexes, and the corpus.
const DENY_IDS = new Set(['recently-updated', 'ja/recently-updated']);

function isDenied(entry: DocEntry): boolean {
  return DENY_IDS.has(entry.id);
}

/** English (root-locale) pages. The JA mirror lives under `ja/…` (id `ja`). */
export function isEnglishDoc(entry: DocEntry): boolean {
  const id = entry.id;
  if (id === 'ja' || id.startsWith('ja/')) return false;
  return !isDenied(entry);
}

/** Japanese mirror pages — the `ja` locale root and everything under `ja/…`. */
export function isJapaneseDoc(entry: DocEntry): boolean {
  const id = entry.id;
  if (id !== 'ja' && !id.startsWith('ja/')) return false;
  return !isDenied(entry);
}

// Locale-root splash pages have the bare locale id (EN `''`, JA `ja`; Starlight
// strips the trailing `/index`). Serve their markdown twins at `/index.md` and
// `/ja/index.md`, and cite the live home routes `/` and `/ja/`.
export function slugFor(entry: DocEntry): string {
  const id = entry.id;
  if (id === '' || id === 'index') return 'index';
  if (id === 'ja' || id === 'ja/index') return 'ja/index';
  return id;
}

/** The live HTML page URL for an entry — used as the `Source:` citation anchor. */
export function urlFor(entry: DocEntry): string {
  const id = entry.id;
  let path: string;
  if (id === '' || id === 'index') path = '';
  else if (id === 'ja' || id === 'ja/index') path = 'ja/';
  else path = `${id}/`;
  return `${SITE}/${path}`;
}

export async function allDocs(): Promise<DocEntry[]> {
  const all = await getCollection('docs');
  return all.filter((e) => !isDenied(e));
}

export async function englishDocs(): Promise<DocEntry[]> {
  return (await allDocs()).filter(isEnglishDoc);
}

export async function japaneseDocs(): Promise<DocEntry[]> {
  return (await allDocs()).filter(isJapaneseDoc);
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

/**
 * The "reading corpus" for an llms-full.txt, in sidebar order: install →
 * Handbook → User Manual → Plugin Reference → Type Specification → a couple of
 * Project pages. `base` is `''` for English or `'ja/'` for the Japanese mirror;
 * the long tail (ADRs, internal spec, notes, changelog, chibirigor) is excluded
 * — it is reachable via the per-page `.md` twins and listed in the sitemap.
 */
export function buildCorpus(docs: DocEntry[], base = ''): DocEntry[] {
  const byId = new Map(docs.map((e) => [e.id, e]));
  const section = (prefix: string) =>
    docs
      .filter((e) => e.id === prefix || e.id.startsWith(`${prefix}/`))
      .sort(bySidebarOrder);

  const corpus: DocEntry[] = [];
  const seen = new Set<string>();
  const add = (e: DocEntry | undefined) => {
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      corpus.push(e);
    }
  };

  add(byId.get(`${base}install`));
  section(`${base}handbook`).forEach(add);
  section(`${base}manual`)
    .filter((e) => !e.id.startsWith(`${base}manual/plugins`))
    .forEach(add);
  section(`${base}manual/plugins`).forEach(add);
  section(`${base}type-specification`).forEach(add);
  add(byId.get(`${base}compatibility`));
  add(byId.get(`${base}types`));
  return corpus;
}
