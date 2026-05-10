# Product

## Register

brand

## Users

**Primary:** London buy-side and sell-side hiring managers, specifically those screening for junior macro analyst, macro strategy, and cross-asset research roles. Working under time pressure (30-second skim of a CV-linked portfolio is the typical first interaction). Sophisticated readers — they know what option-adjusted spreads measure, they catch overclaim quickly, and a single steelmanned-and-failed thesis collapses credibility for the whole site.

**Secondary:** Recruiters and headhunters scanning for differentiation against generic candidate profiles. Less domain-literate than primary, but the surface signals (writing voice, design restraint, coherence) are what they read first.

**Tertiary:** Peers in the macro/research community (Substack, Twitter/X, LinkedIn) — readers who already know Dhruv exists, return for new posts, and form the long-term reputational base. They forward links to the primary audience.

**Context of use:** Desktop or laptop, after CV/LinkedIn click-through. Mobile is post-application reading and Substack referral traffic. The dwell-vs-scan ratio shifts heavily by surface — homepage and project cards get scanned, blog posts and Horizon 2040 get read.

## Product Purpose

mandavkar.uk is a working proof-of-research-capability site for a 22-year-old equity research intern targeting a London macro role before October 2027. It serves four jobs in priority order:

1. **Demonstrate macro research output a London buy-side reader takes seriously** — the strongest pages on the site (how-i-research.html, blog/ai-equity-research.html, blog/yield-curve.html, the live signals dashboard) are the credibility spine. Everything else either reinforces or dilutes them.
2. **Show physical-economy-first methodology** — the macro lens is shipping rates, commodity flows, credit spreads, FRED-driven indicators rendered live; not sell-side talking-head commentary.
3. **Surface the differentiated edge** — cross-domain pattern recognition across geopolitics × macro × markets, with energy-critical chokepoint shocks as the working backtest case (Red Sea, Hormuz scenarios).
4. **Be explicit about forecasts vs facts** — every speculative claim is marked as forecast with falsifiability conditions. Confident-sounding claims a reader catches as overclaim do more damage than no claim.

Success looks like: a London hiring manager who clicks through after seeing the CV reads two pages, files the candidate as "thinks structurally, writes specifically, knows what they don't know" and books a phone screen.

## Brand Personality

**Three words:** disciplined, specific, anti-overclaim.

**Voice:** earned analyst, not aspirational founder. Direct without being curt. Long-form prose with concrete numbers, dated claims, and named sources. When uncertainty exists, it's stated explicitly with falsifiability conditions ("what would change my mind"). When something is a forecast, the framing makes that clear ("my forecast"). When something is a fact, the receipt is shown.

**Emotional goal:** the reader should think *"this person is twenty-two and writes like they've already lost money on a wrong call."* That's the credibility moment — the rarest signal in a junior candidate. The site loses immediately if it reads as "smart undergrad who discovered ChatGPT."

**Editorial energy:** closer to *Grant's Interest Rate Observer* and *FT Weekend long-form* than to a SaaS landing page. Reads like a research desk's quarterly memo, not a product launch.

## Anti-references

Three saturated aesthetic lanes the site must actively differentiate from. The audit's 5-agent UI/UX review explicitly flagged the current state as sitting in the first lane.

1. **Generic AI-slop dev portfolio** — Vercel template aesthetic. Bento grid (especially the "icon + heading + paragraph" identical-card variant), frosted glass, gradient headlines or gradient text, JetBrains Mono micro-labels with leading dash on everything, a "shipping > talking" or similar single-word tagline, dark hero with subtle particle effect (constellation canvas / particles.js), softly tinted progress bars. The visual fingerprint of every Cursor-built personal site of the last 18 months. Disqualifying because it tells the reader the operator deferred to a template instead of making a design decision.

2. **Trad finance corporate site** — Goldman Sachs / Morgan Stanley navy-and-gold, suit-and-tie photography, Helvetica Neue for everything, breathless "thought leadership" copy with no specific claims. Symmetrically bad: looks corporate, says nothing, signals the operator is performing the role rather than working in it.

3. **Default Substack / Ghost / Medium template** — author photo + tagline + scroll feed of dated posts. Functional but no editorial point of view. Could be anyone's blog. The pages are content; the template is invisible. For a portfolio that wants to signal craft, the template being invisible is the problem.

**Specific reflexes to avoid:** dot-grid backgrounds, glassmorphism cards, sand → cream → dark angle dividers (already overused on this site, retire after current redesign), the "live FRED ticker as marketing-banner-flair" pattern (the data is the work, not the flair), Stripe-style scroll-driven 3D product reveals (great for Stripe, wrong for a research site), Bloomberg terminal mimicry (the orange-on-black aesthetic is Bloomberg's because they earned it; copying it on a personal site reads as cosplay).

**Anti-references that need updating per session decisions:** the site previously had a Horizon 2040 page presenting forecasts as confident assertions. That page is being reframed as forecasts-with-explicit-falsifiability per the May 2026 surgical fixes. Going forward: every speculative claim must be marked as opinion with what-would-change-my-mind. No exceptions.

## Design Principles

Five strategic principles. These are operating rules, not visual ones.

1. **Forecasting humility beats forecasting confidence.** The audit's strongest single insight: a London hiring manager files a 22-year-old's confident long-range macro thesis as overconfidence within 30 seconds. The same reader files a 22-year-old's *dated, falsifiable, hedged* thesis as forecasting maturity. Every page leans into hedge where uncertainty is real. Specific numbers backed by sources. Specific forecasts marked as forecast. Specific failure conditions stated. Avoiding overclaim is the credibility mechanism — not avoiding ambition.

2. **Subtraction creates more value than addition.** Per Taleb's via negativa applied to the site itself. A page that fails one credibility check on first contact damages every page that comes after. Pruning weak pages, weak claims, and weak figures buys more credibility than adding new content. When in doubt, cut.

3. **Physical economy first, financial economy second.** The methodology spine. Charts of shipping rates, commodity flows, copper-gold ratios, freight chokepoints come before charts of equity multiples or fund flows. The lens isn't macro-as-narrative; it's macro-as-physical-system, with markets as the downstream pricing layer. Design choices reinforce this: the live signals dashboard is the load-bearing artefact other pages link to.

4. **Real receipts over manufactured ones.** Track-record claims need actual dated calls with outcomes. "What I got wrong" pages need actual failed calls Dhruv held publicly, not retrofitted regret to look honest. If the receipts don't exist yet, the page doesn't ship yet. Manufacturing humility reads worse than overconfidence — both are tells.

5. **Editorial restraint, not editorial flourish.** A research site signals craft through what it doesn't do: doesn't gradient-text the headline, doesn't bento-grid the projects, doesn't blur-background the cards, doesn't auto-play hero animations. The single distinctive design move (whatever it is) carries more weight than ten decorative ones. Restraint is the read of someone who knows what they're doing.

## Accessibility & Inclusion

**Target:** WCAG 2.1 Level AA across the full site.

**Required baselines:**
- Text contrast ≥ 4.5:1 for body, ≥ 3:1 for large text and UI components against their background
- Full keyboard navigation: visible focus indicators on every interactive element, logical tab order, no keyboard traps in the mobile menu or scroll-locked sections
- Semantic HTML: proper heading hierarchy (one h1 per page, no skipped levels), landmark elements (nav, main, article, footer), buttons rendered as `<button>` not divs
- Form inputs (the contact email-reveal interaction, any future newsletter signup) must have associated labels and clear error states
- All non-decorative images need alt text; decorative images use `alt=""` and `aria-hidden="true"` where appropriate
- Live data charts (signals.html Chart.js panels) must have `role="img"` with descriptive `aria-label`, plus a text-table fallback or chart-interpretation paragraph for screen readers

**Motion:**
- `prefers-reduced-motion: reduce` is respected on every animation, scroll-driven reveal, and constellation canvas. Reduced state must produce a static, readable page — not a degraded animation.

**Other inclusion considerations:**
- Colour is never the sole signal. Status badges (RAG indicators on signals.html) must use both colour and text label.
- Long-form pages (Horizon 2040, blog posts) cap line length at 65–75ch for readability.
- Mobile: minimum 44×44px touch targets on all interactive elements. The hamburger button, mobile menu items, blog "Back to portfolio" link, and CTA buttons must all meet this.
