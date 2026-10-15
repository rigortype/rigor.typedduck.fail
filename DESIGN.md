# Rigor documentation design system

## 1. Atmosphere and identity

Preserve the existing Starlight documentation shell and Rigor's parchment/ink identity. API reference pages are navigable technical documents, with readable source names and quiet section rules. ApiGen informs information architecture, not pixel fidelity.

## 2. Color

Use the theme-aware `--sl-color-bg`, `--sl-color-text`, `--sl-color-gray-2`, `--sl-color-gray-6`, `--sl-color-text-accent`, `--sl-color-accent-low` and `--sl-color-hairline` from `src/styles/custom.css`. The existing light palette is parchment (`--rigor-paper`) with oxblood links (`--rigor-accent`); the dark palette uses the site's ink surfaces. No new colors are introduced.

## 3. Typography

Reuse `--sl-font` (Source Serif 4 prose), `--sl-font-system` (Inter labels) and `--sl-font-mono` (JetBrains Mono source names). The third family is inherited from the existing site rather than newly added. Reuse Starlight heading sizes. API secondary metadata is 0.875rem minimum, increasing to 1rem on narrow screens; primary text remains at least 1rem, 1.0625rem on narrow screens. Long Ruby identifiers wrap rather than clip.

## 4. Spacing and layout

Reuse Starlight's content width, 17rem sidebar, 3.5rem header and responsive sidebar behavior. API spacing steps are 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem and 2rem, based on the site's existing rem spacing. The document owns content scrolling; native details elements provide grouped navigation, never a nested content scroll pane.

## 5. Components

- **Shell:** existing StarlightPage, header, theme selector, sidebar and mobile menu; retain their keyboard and responsive behavior.
- **Namespace navigation:** Starlight sidebar groups and links, expanded for the active namespace. Native disclosure states remain accessible without additional hydration.
- **Breadcrumbs:** semantic navigation with an accessible label and an ordered wrapping list; the current item is text, ancestors are links.
- **Declaration entry:** semantic section with a stable anchor, a wrapping monospace signature and visible kind label; original documentation follows in normal flow. Source definitions remain distinct. Heading levels follow the page hierarchy.
- **Category index:** named classes/modules/constants/member sections using real links; an empty category is omitted and an empty reference explains that no public declarations were exported.
- **Build provenance:** unobtrusive source commit and producer versions, without presenting unparsed contracts as authoritative rendered types.

## 6. Motion and interaction

Reuse Starlight's built-in interactions. No new animation, modal or client framework is introduced. Links have hover/active feedback and visible keyboard focus; selected navigation uses a tonal fill and weight, without adding an accent border. Native disclosure controls work by keyboard and touch. Reduced-motion preferences remain respected by the shell.

## 7. Depth and surface

Use the existing borders-only treatment: `--sl-color-hairline`, no card shadows or gradients. Small code surfaces use the site's existing 2px/4px radii. Do not introduce decorative cards around every declaration.

## 8. Accessibility constraints and accepted debt

Target WCAG AA: named landmarks, logical headings, visible focus, contrast in both themes, wrapping identifiers and no horizontal page overflow at 390px. New primary touch controls have a 44px minimum target. English API source remains canonical; the Japanese entry explicitly links to English rather than suggesting translated API content. No new visual debt is accepted. Existing unrelated typography and site-wide patterns are outside this addition.
