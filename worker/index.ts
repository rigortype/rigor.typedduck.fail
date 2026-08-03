// Markdown content negotiation for agents.
//
// The site already builds a clean-markdown twin of every page at `<path>.md`
// (`src/pages/[...slug].md.ts`) — the same bodies `llms-full.txt` is assembled
// from. This Worker only routes to them: a request carrying an explicit
// `Accept: text/markdown` gets the twin, everything else gets the HTML it
// always got. Nothing is converted at request time, so what an agent reads is
// the upstream prose itself, not a lossy HTML-to-Markdown rendering of it.
//
// Scoping lives in wrangler.toml's `run_worker_first`: the hashed bundles,
// pagefind index and the playground are excluded there, so this runs for
// page requests and not for every asset on the page.

interface Env {
  ASSETS: Fetcher;
}

/**
 * Whether the client explicitly asked for Markdown *in preference to* HTML.
 *
 * The subtlety that decides correctness here: a browser sends
 * `text/html,…,*/ /*;q=0.8`, and `*/ /*` matches `text/markdown` too. Matching the
 * wildcard would hand every browser a Markdown download. So a media range only
 * counts when it names `text/markdown` (or `text/*`) *explicitly*, and it has to
 * beat the client's own weight for HTML before it wins.
 */
function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;

  let markdownQ = -1;
  let htmlQ = -1;

  for (const part of accept.split(',')) {
    const [rawType, ...params] = part.split(';');
    const type = rawType.trim().toLowerCase();
    if (!type) continue;

    let q = 1;
    for (const param of params) {
      const [k, v] = param.split('=');
      if (k?.trim().toLowerCase() === 'q') {
        const parsed = Number.parseFloat(v ?? '');
        if (Number.isFinite(parsed)) q = parsed;
      }
    }

    // Only an exact `text/markdown` asks for Markdown. The wildcards are
    // deliberately not counted as a request for it: `*/*` expresses no
    // preference at all (treating it as one is what would break every
    // browser), and `text/*` does not distinguish the two representations
    // either — so both fall to HTML, the primary representation.
    if (type === 'text/markdown') {
      markdownQ = Math.max(markdownQ, q);
    }
    if (type === 'text/html' || type === 'application/xhtml+xml' || type === 'text/*') {
      htmlQ = Math.max(htmlQ, q);
    }
  }

  return markdownQ > 0 && markdownQ >= htmlQ;
}

/**
 * Candidate twin paths, in the order they should be tried.
 *
 * Most pages sit beside their route: `/handbook/` is `dist/handbook.md`. Index
 * pages do not — the site root is `dist/index.md` and the Japanese root is
 * `dist/ja/index.md`, neither of which is `<route>.md`. Rather than hardcode
 * which routes are index pages (that list grows with every locale), both shapes
 * are offered and the first one that exists wins.
 *
 * Anything already carrying an extension is a real file request, left alone.
 */
function markdownTwinsFor(pathname: string): string[] {
  const trimmed = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (trimmed === '') return ['/index.md'];

  const lastSegment = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  if (lastSegment.includes('.')) return [];

  return [`${trimmed}.md`, `${trimmed}/index.md`];
}

/**
 * Rebuild a response with extra headers.
 *
 * `{ ...response }` looks like it would carry the status across and does not:
 * `status` is a prototype getter, not an own enumerable property, so the spread
 * yields nothing and every response silently becomes a 200 — turning the 404
 * page into a soft 404. Copy the fields explicitly.
 */
function withHeaders(response: Response, headers: Headers): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Negotiation applies to reads only; anything else is passed straight
    // through rather than being second-guessed here.
    const isRead = request.method === 'GET' || request.method === 'HEAD';

    if (isRead && prefersMarkdown(request.headers.get('Accept'))) {
      const url = new URL(request.url);

      for (const twin of markdownTwinsFor(url.pathname)) {
        const twinUrl = new URL(url);
        twinUrl.pathname = twin;

        const response = await env.ASSETS.fetch(new Request(twinUrl, request));

        // A miss is expected and is not an error: a Japanese page with no
        // translation yet renders from the English fallback and has no ja twin
        // to serve. Falling through hands back the HTML rather than inventing
        // a Markdown body for it.
        if (response.ok) {
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'text/markdown; charset=utf-8');
          // Without this, a shared cache could hand this Markdown body to the
          // next browser that asks for the same URL.
          headers.append('Vary', 'Accept');
          return withHeaders(response, headers);
        }
      }
    }

    const response = await env.ASSETS.fetch(request);

    // The HTML answer varies by Accept just as much as the Markdown one does,
    // so it has to carry the same cache key or the negotiation is unsound in
    // the other direction.
    if (isRead && response.headers.get('Content-Type')?.startsWith('text/html')) {
      const headers = new Headers(response.headers);
      headers.append('Vary', 'Accept');
      return withHeaders(response, headers);
    }

    return response;
  },
};
