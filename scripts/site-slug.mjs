// The exact URL normalization the site build applies to every page path
// segment. Astro's content layer derives `entry.slug` by running each file-path
// segment through `github-slugger` (astro/dist/content/utils.js
// `getContentEntryIdAndSlug` → `githubSlug(segment)`), so characters it strips
// disappear from the served URL: `20260604-elixir-v1.20-…` is served at
// `…-v120-…`, `changelog-0.1.x` at `changelog-01x`, `7-v0.1.0-slice-decisions`
// at `7-v010-slice-decisions`.
//
// Link-rendering and link-checking code must mirror that normalization whenever
// it converts a source file path into an on-site route, or it emits URLs that
// 404 (`/ja/notes/20260604-elixir-v1.20-type-system-rigor-review/`).
//
// We depend on the same package Astro does instead of re-deriving the rules so
// the two can never drift. `slug(value)` lowercases by default — exactly what
// `getContentEntryIdAndSlug` calls.
import { slug } from 'github-slugger';

export function siteSlugSegment(segment) {
  return slug(segment);
}

/** Slug-normalize every segment of a `/`-joined route. */
export function siteSlugRoute(route) {
  return route.split('/').map(siteSlugSegment).join('/');
}
