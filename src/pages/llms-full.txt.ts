import type { APIRoute } from 'astro';
import { englishDocs, bySidebarOrder, pageBlock, type DocEntry } from '../lib/docs';
import preamble from '../llms/full-preamble.md?raw';

// The "reading corpus" — Handbook, User Manual, Plugin Reference, Type
// Specification, plus install + a couple of Project pages, concatenated in
// sidebar reading order. The long tail (ADRs, internal spec, design/development
// notes, changelog, chibirigor) is deliberately excluded; it is reachable via
// the per-page `.md` twins and listed in sitemap-index.xml.
export const prerender = true;

export const GET: APIRoute = async () => {
  const docs = await englishDocs();
  const byId = new Map(docs.map((e) => [e.id, e]));
  const section = (prefix: string) =>
    docs.filter((e) => e.id === prefix || e.id.startsWith(`${prefix}/`)).sort(bySidebarOrder);

  const corpus: DocEntry[] = [];
  const seen = new Set<string>();
  const add = (e: DocEntry | undefined) => {
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      corpus.push(e);
    }
  };

  add(byId.get('install'));
  section('handbook').forEach(add);
  section('manual')
    .filter((e) => !e.id.startsWith('manual/plugins'))
    .forEach(add);
  section('manual/plugins').forEach(add);
  section('type-specification').forEach(add);
  add(byId.get('compatibility'));
  add(byId.get('types'));

  const out =
    `${preamble.trim()}\n\n---\n\n` +
    corpus.map(pageBlock).join('\n\n---\n\n') +
    '\n';

  return new Response(out, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
