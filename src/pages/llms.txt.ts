import type { APIRoute } from 'astro';
import { englishDocs, slugFor } from '../lib/docs';
import body from '../llms/llms.md?raw';

// Curated, hand-authored index (the llms.txt convention). The content is static;
// the endpoint exists to guard it — every on-site `.md` link must resolve to a
// real English page, so a renamed/removed upstream page fails the build loudly
// instead of shipping a dead link.
export const prerender = true;

export const GET: APIRoute = async () => {
  const docs = await englishDocs();
  const valid = new Set(docs.map((e) => `/${slugFor(e)}.md`));

  const linked = [...body.matchAll(/\]\((\/[^)]+\.md)\)/g)].map((m) => m[1]);
  const missing = [...new Set(linked)].filter((p) => !valid.has(p));
  if (missing.length) {
    throw new Error(
      `llms.txt links to non-existent .md page(s): ${missing.join(', ')}`,
    );
  }

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
