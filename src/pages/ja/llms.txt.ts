import type { APIRoute } from 'astro';
import { japaneseDocs, slugFor } from '../../lib/docs';
import body from '../../llms/llms-ja.md?raw';

// Japanese mirror of /llms.txt. Same curated structure as the English index,
// translated, with `/ja/…md` link targets. The guard checks every on-site `.md`
// link against the JA mirror, so a missing/renamed Japanese page fails the build
// loudly instead of shipping a dead link.
export const prerender = true;

export const GET: APIRoute = async () => {
  const docs = await japaneseDocs();
  const valid = new Set(docs.map((e) => `/${slugFor(e)}.md`));

  const linked = [...body.matchAll(/\]\((\/[^)]+\.md)\)/g)].map((m) => m[1]);
  const missing = [...new Set(linked)].filter((p) => !valid.has(p));
  if (missing.length) {
    throw new Error(
      `/ja/llms.txt links to non-existent .md page(s): ${missing.join(', ')}`,
    );
  }

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
