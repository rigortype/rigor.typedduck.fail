import type { APIRoute } from 'astro';
import { englishDocs, buildCorpus, pageBlock } from '../lib/docs';
import preamble from '../llms/full-preamble.md?raw';

// The "reading corpus" — Handbook, User Manual, Plugin Reference, Type
// Specification, plus install + a couple of Project pages, concatenated in
// sidebar reading order. The long tail (ADRs, internal spec, design/development
// notes, changelog, chibirigor) is deliberately excluded; it is reachable via
// the per-page `.md` twins and listed in sitemap-index.xml.
export const prerender = true;

export const GET: APIRoute = async () => {
  const corpus = buildCorpus(await englishDocs(), '');
  const out =
    `${preamble.trim()}\n\n---\n\n` +
    corpus.map(pageBlock).join('\n\n---\n\n') +
    '\n';

  return new Response(out, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
