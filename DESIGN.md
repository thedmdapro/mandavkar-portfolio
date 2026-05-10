# Design

> The visual system for mandavkar.uk. Captures palette, type, spacing, components, and motion as committed in the May 2026 impeccable rebuild. Per the [Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/format/).

Strategy reference: [PRODUCT.md](PRODUCT.md). Register: brand.

---

## Direction

**Anchor references:** Klim Type Foundry specimen pages (typographic confidence, asymmetric editorial layout) · Grant's Interest Rate Observer (analytical identity, masthead authority) · FT Weekend long-form (reading rhythm, restraint at scale).

**Scene sentence (the test that forced the theme):** *"An equity researcher at 9:15am at their desk reading a printed memo on cream paper, then turning to a live terminal screen for current data."* Light primary register, dark only for live-data sections. Two registers earning each other.

**Color strategy:** Full palette (4 named roles) — paper, ink, oxblood, ochre. Departs from the safe cream-and-teal tech-minimal lane the site previously occupied. Identity-preservation kept Fraunces serif as the headline face.

---

## Color

All colors in OKLCH per impeccable rules. Tinted neutrals (chroma 0.005–0.018 on greys), bounded chroma at lightness extremes.

### Palette

| Role | OKLCH | Sample | Usage |
|---|---|---|---|
| **Paper** | `oklch(0.972 0.006 75)` | warm cream | Light-register page background; the editorial ground |
| **Ink** | `oklch(0.18 0.018 245)` | warm near-black | Body text, headings, structural lines |
| **Oxblood** | `oklch(0.42 0.155 28)` | deep red | Brand mark; emphasis word in hero; link underlines; active-page nav indicator; featured project numbers |
| **Ochre** | `oklch(0.72 0.135 78)` | warm gold | Live-data accent; regime-indicator on signals.html; chart emphasis; hover wash |
| **Dark Ink** | `oklch(0.155 0.014 245)` | deep navy-black | Alternate ground for live-data register (signals.html, oil-shock data sections) |
| **Cream-on-dark** | `oklch(0.92 0.009 75)` | soft cream | Body text on dark register |

### Supporting tokens

| Token | Value | Use |
|---|---|---|
| `--bg2` | `oklch(0.945 0.008 75)` | Sand alternate ground (used sparingly) |
| `--card` | `oklch(0.955 0.007 75)` | Card surface — slightly tinted off paper |
| `--border` | `oklch(0.85 0.012 75)` | Default 1px border |
| `--border2` | `oklch(0.78 0.014 70)` | Heavier border for emphasis |
| `--dim` | `oklch(0.45 0.014 245)` | Muted body text, captions |
| `--subtle` | `oklch(0.58 0.012 245)` | Tertiary metadata, disabled text |

### Contrast (WCAG AA verified)

| Pair | Contrast | Use |
|---|---|---|
| Ink on Paper | ~14:1 | Body text on light register |
| Cream-on-dark on Dark Ink | ~13:1 | Body text on dark register |
| Oxblood on Paper | ~6.4:1 | Brand emphasis on light |
| Ochre on Dark Ink | ~7.2:1 | Live-data emphasis on dark |
| Dim on Paper | ~6.1:1 | Muted body |
| Subtle on Paper | ~4.6:1 | Tertiary metadata (meets AA for normal text) |

### Forbidden

- `#000` and `#fff` literals (impeccable absolute ban; use the OKLCH neutrals).
- Pure-grey neutrals at chroma 0 (always tint toward 75 hue for warmth).
- Gradient text (`background-clip: text`).
- Decorative gradients (replaced by solid tinted surfaces in distill).

---

## Typography

Two committed families plus mono for live-data labels.

### Families

| Face | Variable | Use | Source |
|---|---|---|---|
| **Fraunces** | ital opsz 9–144 wght 300–900 | Display, hero name, drop caps, project titles, section titles. Identity-preserved from prior site per impeccable brand.md identity-preservation rule (acknowledged trade-off: Fraunces is on the reflex-reject list; mitigated by full-palette commitment + departure-mode oxblood/ochre). | Google Fonts |
| **Source Serif 4** | ital opsz 8–60 wght 300–600 | Body text, project descriptions, blog body. Pairs with Fraunces for the magazine-shape register. | Google Fonts |
| **JetBrains Mono** | wght 400, 500 | Live-data values only. Eyebrows, tag lists, chart axis labels, ticker timestamps, regime-score readouts, microcopy in mono register. **Restricted use** — overuse on this site previously placed it in the saturated tech-minimal lane. | Google Fonts |
| **Inter** | wght 300–600 | Sans body fallback for hero credentials line and dense metadata. Loaded but used minimally. | Google Fonts |

### Scale

Modular, fluid `clamp()` for headings, ≥1.25 ratio between steps.

| Step | Size | Use |
|---|---|---|
| **Display** | `clamp(64px, 13vw, 200px)` | Hero name (Fraunces) |
| **H1** (page) | `clamp(40px, 6vw, 72px)` | Inner-page hero h1 |
| **H2** | `clamp(28px, 3.5vw, 48px)` | Section titles |
| **H3** | `clamp(24px, 3vw, 38px)` | Project titles, blog titles |
| **H4** | 22px | Sub-section headings |
| **Body large** | `clamp(20px, 2.4vw, 30px)` | Hero bio, lead paragraphs |
| **Body** | 16–17px | Default body, project descriptions |
| **Caption** | 14px | Hero credentials, meta |
| **Mono micro** | 10–11px, 0.18–0.22em letter-spacing | Eyebrows, project type tags, timestamps |

Light-on-dark text uses `+0.05–0.1` line-height vs light-on-light per brand.md.

### Voice rules

- Body line length capped at **65–75ch** for readability (long-form pages, blog posts).
- Hierarchy through **scale + weight contrast**, never weight alone. Display = 300 weight; emphasis = italic + color shift, not bold weight bump.
- **No em-dashes** anywhere. Use commas, colons, periods, parentheses. Site-wide sweep performed in `impeccable clarify` (1066 instances replaced).
- Drop caps: Fraunces italic, oxblood, on opening paragraphs of long-form pages (planned, not yet implemented).

---

## Layout

### Container

- Default content max-width: `1120px` (`--container`). Used inside `.container { max-width: var(--container); margin: 0 auto; padding: 0 24px; }`.
- Editorial pages (long-form thesis, blog) use a 65–75ch body width regardless of container; container only constrains the upper bound.

### Spacing

Vary for rhythm. No constant padding everywhere.

| Token | Value | Use |
|---|---|---|
| `--section-pad` | `72px` (default), `48–56px` (mobile) | Between major sections |
| Inline gap (small) | `8–16px` | Inline groups, tag lists |
| Stack gap (medium) | `24–32px` | Paragraph blocks, headers |
| Stack gap (large) | `48–80px` (`clamp` for fluidity) | Hero-to-content, section-to-section |

### Grid

- **Hero:** full-bleed paper section, content left-aligned within `max-width: 1280px`. Asymmetric; not centered stack.
- **Projects index:** CSS Grid 3-column row (`clamp(72px, 11vw, 140px) | 1fr | auto`) — large number, body, link. Each row a separate `<li>` in an `<ol>`. Collapses to single column on `max-width: 768px`.
- **Long-form pages:** single-column body inside container, with planned right-gutter marginalia for desktop (≥1024px), collapsing to inline footnote pattern below paragraphs on tablet/mobile.
- **Cards:** removed by default. Use only when affordance genuinely requires (rare). Nested cards forbidden.

### Forbidden

- Centered hero stacks (always left-align, asymmetric).
- Bento grids (replaced by editorial row-index in bolder).
- Hero-metric template (4 stat tiles) (replaced by inline credentials line).
- Section angle dividers (`.sect-angle--*` removed in distill).
- Decorative cards as default container (use solid surfaces, hairline borders).

---

## Components

Components currently committed in the codebase. Names map to CSS class selectors.

### Hero (`.hero-editorial-section`)

Full-bleed paper section with hairline oxblood top rule. Stacked content: mono eyebrow → Fraunces display name with italic oxblood emphasis → serif bio → sans credentials line → underlined CTAs.

### Project rows (`.editorial-project`)

3-column grid row inside `.editorial-projects` ordered list. Variants: `.editorial-project--featured` (oxblood italic number), `.editorial-project--archive` (faded number). Hover wash uses ochre at 6% mix.

### Link with brand underline (`.link-underlined`)

Body type with 1px oxblood border-bottom. Hover and focus-visible shifts text color to oxblood. Standard CTA pattern across the editorial register.

### Section labels (`.section-label`)

Mono micro-text for section eyebrow titles. 10–11px, letter-spacing 0.18–0.22em, uppercase.

### Tags / metadata (`.editorial-project__tags`)

Inline mono list with mid-dot (`·`) separators. Items can be plain spans or inline links. Used for project tech-stack tags and metadata strings.

### Charts (`.chart-canvas-wrap` + `<canvas role="img" aria-label="…">`)

Each chart canvas has explicit `role="img"` plus a descriptive aria-label that includes the indicator name, time range, and what the chart measures. Chart.js renders inside; aria-label provides the screen-reader fallback.

### Forbidden components

- `.bento-grid` / `.bento-card` / `.bento-featured` (removed).
- Constellation canvas (`<canvas class="constellation-*">` removed).
- Glassmorphism cards (`backdrop-filter: blur(...)` removed across all stylesheets).
- Hero-metric stat tiles (the 4-tile `1st / CFA / 11 / 2` grid, removed).

---

## Motion

### Principles

- Ease out with exponential curves (`cubic-bezier(0.16, 1, 0.3, 1)` / `cubic-bezier(0.22, 1, 0.36, 1)`). No bounce, no elastic.
- Don't animate CSS layout properties (top, left, width, height, margin). Use transform.
- One well-orchestrated page-load reveal beats scattered micro-interactions.
- All motion respects `prefers-reduced-motion: reduce` via global selector that drops every transition and animation to 0.01ms.

### Defaults

| Where | Easing | Duration |
|---|---|---|
| Link underline hover | `cubic-bezier(0.22, 1, 0.36, 1)` | 200ms |
| Project row hover wash | `cubic-bezier(0.22, 1, 0.36, 1)` | 250ms |
| Fade-up scroll reveal | `cubic-bezier(0.16, 1, 0.3, 1)` | 720ms |
| Mobile menu open/close | (planned: cubic-bezier 0.22,1,0.36,1) | 200ms |

### Reduced motion

Global rule in styles.css disables all animation/transition (clamps to 0.01ms), forces `.fade-up` to its final state immediately, and sets `scroll-behavior: auto`.

---

## Accessibility

WCAG 2.1 Level AA target, per PRODUCT.md.

### Implemented

- Text contrast verified ≥ 4.5:1 (body) and ≥ 3:1 (large/UI) for all palette pairs.
- `:focus-visible` outline (2px oxblood, 4px offset) on every interactive control: hamburger, mobile-close, hero-email button, `.btn`, `button`, `a`, `[role="button"]`.
- Skip-to-content link (`.skip-to-content`) revealed on focus.
- Semantic HTML: one `<h1>` per page, ordered headings, landmark elements (`<nav>`, `<main>`, `<article>`, `<footer>`).
- Decorative canvases marked `aria-hidden="true"` (no longer applies — constellation canvases removed).
- Live-data charts on `signals.html` carry `role="img"` + descriptive `aria-label` (23/23 covered).
- `prefers-reduced-motion` blanket coverage.

### Pending

- Tablet marginalia handling in long-form pages (currently planned, falls back to inline footnotes on narrow viewports).
- Cookie banner / external embeds: none currently present; no a11y debt accrued.

---

## Tokens (CSS custom properties)

Currently declared in `styles.css :root` (will be extracted to `tokens.css` in `impeccable extract` per the plan). Legacy aliases (`--bg`, `--text`, `--accent`, `--teal`, `--dark`) map onto the new OKLCH palette so legacy components inherit the editorial palette without breakage.

```css
:root {
  /* Editorial palette: 4 named roles */
  --paper:         oklch(0.972 0.006 75);
  --ink:           oklch(0.18 0.018 245);
  --oxblood:       oklch(0.42 0.155 28);
  --ochre:         oklch(0.72 0.135 78);
  --dark-ink:      oklch(0.155 0.014 245);
  --cream-on-dark: oklch(0.92 0.009 75);

  /* Aliases (legacy compatibility) */
  --bg: var(--paper);
  --text: var(--ink);
  --accent: var(--oxblood);
  --teal: var(--ochre);
  --dark: var(--dark-ink);

  /* Borders */
  --border:  oklch(0.85 0.012 75);
  --border2: oklch(0.78 0.014 70);

  /* Spacing */
  --section-pad: 72px;
  --container:   1120px;

  /* Transitions */
  --duration-fast: 0.2s;
  --duration-normal: 0.3s;
  --duration-slow: 0.8s;
}
```

Full token declarations live in `styles.css` line 1–60. `horizon2040.css` and `signals.css` carry their own legacy `:root` blocks scheduled for consolidation in the next pass.
