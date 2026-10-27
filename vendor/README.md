# Presentation package snapshot

`zard-doc-astro-0.0.0.tgz` is an unpublished package snapshot from `rigortype/zard`, commit `c4717eb7cb55b76f0a0ac6a11686fe470aec5255`, directory `zard-doc-astro`. It contains the unstyled presentation implementation and Starlight adapter, not Ruby source or consumer CSS. The source remains maintained in the ZARD repository.

SHA-256: `641e395f140f95ec28fa97609c7eaf94cef48593f0db67e8d1e535ce8228d47a`.

To refresh after reviewing a new ZARD revision:

1. In the ZARD checkout, run `pnpm --dir zard-doc-astro install --frozen-lockfile` and `pnpm --dir zard-doc-astro test`.
2. Run `pnpm --dir zard-doc-astro pack --pack-destination /tmp/zard-doc-astro` and copy the archive here.
3. Update this source revision/checksum, the `file:` dependency if the filename changes, and run `pnpm update zard-doc-astro` to refresh archive integrity in the lockfile.
4. Run `pnpm install --frozen-lockfile`, `pnpm test:api`, `pnpm check` and `pnpm build`, then verify API navigation and themes in the browser.

The archive is intentionally committed so fresh site checkouts do not require a sibling ZARD checkout or a package registry release. Once the package is published, replace the archive dependency with a pinned registry version. Ruby producer artifact provenance is separate and documented in `docs/api-reference.md`.
