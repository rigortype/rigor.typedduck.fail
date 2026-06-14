# Social card artwork

Source SVGs for the Open Graph / Twitter Card images, plus how to regenerate
the committed PNGs under `public/og/`.

| Source | Output | Used by |
|---|---|---|
| `playground.svg` | `public/og/playground.png` (1200×630) | the in-browser playground at `/playground/` (injected by `scripts/sync-playground.mjs`) |

The PNGs are committed (not built on every `pnpm build`) so deploys don't depend
on a rasteriser being present. Regenerate only when the source SVG changes:

```sh
inkscape assets/og/playground.svg \
  --export-type=png --export-filename=public/og/playground.png \
  --export-width=1200 --export-height=630
```

ImageMagick works too, but renders the soft drop-shadow filter less faithfully:

```sh
magick -density 192 -background none assets/og/playground.svg \
  -resize 1200x630 public/og/playground.png
```

Notes:

- The SVG uses system fonts (Helvetica Neue / Menlo) rather than the site's web
  fonts (Inter / JetBrains Mono) so it rasterises standalone. The card stays
  brand-consistent; it is not pixel-identical to the live page typography.
- Palette mirrors the playground: favicon teal (`#003f3a` family) for the brand,
  the dark code surface (`#13171d`) for the diagnostic panel.
