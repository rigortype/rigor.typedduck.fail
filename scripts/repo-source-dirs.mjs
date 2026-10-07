// Repo-root directories in upstream rigortype/rigor that hold sources/assets
// rather than docs. Upstream prose links into them with repo-root-relative paths
// (`../../lib/…`, `../../plugins/…`); those have NO on-site route, so the sync
// rewriter and the owned-tree guard redirect them — a bare `plugins/<slug>` with
// a published reference page to `/manual/plugins/<slug>/`, everything else to the
// upstream GitHub repo.
//
// This set keys the plugin-source mapping and the historical bare-`plugins/x`
// behavior. Escapes are ALSO recognized beyond it when they resolve to a real
// upstream path — `.github/…`, `tool/…`, repo-root files — via an
// existence-gated check in both scripts. Malformed on-site cross-refs that
// merely re-enter through a `docs/` prefix (`../docs/…`, a bare `docs/x.md`)
// are NOT routed to GitHub any more: the rewriter reads a leading `docs/` as
// the upstream docs root (this site's root) and re-emits the on-site route,
// falling back to pass-through when the target resolves to nothing upstream.
export const REPO_SOURCE_DIRS = new Set([
  'plugins',
  'examples',
  'lib',
  'sig',
  'spec',
  'references',
  'data',
  'schemas',
  'skills',
]);
