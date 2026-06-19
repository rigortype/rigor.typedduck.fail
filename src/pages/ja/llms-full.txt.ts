import type { APIRoute } from 'astro';
import { japaneseDocs, buildCorpus, pageBlock } from '../../lib/docs';
import preamble from '../../llms/full-preamble-ja.md?raw';

// Japanese mirror of /llms-full.txt: the same reading corpus (Handbook, User
// Manual, Plugin Reference, Type Specification, plus install and project pages)
// built from the JA mirror and concatenated in sidebar order.
export const prerender = true;

export const GET: APIRoute = async () => {
  const corpus = buildCorpus(await japaneseDocs(), 'ja/');
  const out =
    `${preamble.trim()}\n\n---\n\n` +
    corpus.map(pageBlock).join('\n\n---\n\n') +
    '\n';

  return new Response(out, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
