# DECISIONS.md — Architecture Decision Records

ADR-lite: one block per significant choice. Template:

```
## <decision>
**Status:** Accepted / Superseded by [link]
**Why:** The reason for this choice.
**Trade-off:** What we give up or accept in exchange.
```

---

## Astro + vanilla GSAP over React islands

**Status:** Accepted

**Why:** A portfolio is a narrative document, not an application. Astro's static output ships zero JS by default; a single GSAP controller module is added explicitly. React islands would add ~40 KB of React runtime for animations that don't need component state. GSAP's imperative timeline API is a better fit for tightly sequenced, per-element choreography than declarative component lifecycle.

**Trade-off:** No React ecosystem (hooks, context, component libraries) available in animation code. Accepted: UI is hand-crafted HTML/CSS; the only dynamic layer is GSAP.

---

## Periodic table rendered in code (SVG/CSS) not raster

**Status:** Accepted

**Why:** 30+ element tiles at various sizes need crisp rendering at every DPR (1x, 2x, 3x). A raster sprite would require a 3× export to look sharp on Retina, adding significant payload. CSS/SVG tiles are resolution-independent, infinitely scalable, and trivially themed via CSS custom properties.

**Trade-off:** More complex Astro component markup. Accepted: the Skills component is self-contained and the visual output is better.

---

## Font choice: DM Mono (display) + Inter (body)

**Status:** Accepted

**Why:**

- DM Mono: monospaced, geometric, technical — reinforces the "developer precision + lab instrument" identity. Variable weight means one HTTP request for all weights.
- Inter: the clearest neutral humanist sans for body text, battle-tested at small sizes, variable weight + optical size axis.
- Both are SIL OFL licensed — freely self-hostable with no attribution requirements on the page.

**Trade-off:** DM Mono is a monospace face; it reads slowly in long paragraphs. Accepted: it's used only for headings, labels, and the hero name — never for body copy.

---

## Single CSS custom property file as design token source of truth

**Status:** Accepted

**Why:** Tailwind config references `var(--token)` values so that tokens are available both in utility classes and in arbitrary CSS/JS (`getComputedStyle`). A single `tokens.css` file means changing a brand colour is one edit, not a search-and-replace across Tailwind config + inline styles + CSS files.

**Trade-off:** Tokens are not typed (no TypeScript-level enforcement). Mitigated by the Golden Rule in AGENTS.md: "never hardcode a colour outside tokens.css".

---

## GSAP Scene registry pattern (extend without editing controller core)

**Status:** Accepted

**Why:** The controller is stable infrastructure. Adding a new scene by editing the controller risks introducing a regression in all existing scenes. The registry pattern (import + one dictionary entry) isolates new work to the scene module and a single registry line, making diffs minimal and reviewable.

**Trade-off:** Slightly more boilerplate per scene (must export a factory). Accepted: the Scene interface is small (5 methods) and `revealPlaceholder.ts` provides a copy-paste starting point.

---

## Confidential section: no screenshots, no links, no client names

**Status:** Accepted — enforced as a Golden Rule in AGENTS.md

**Why:** NDA obligations. Even abstract screenshots could be reverse-engineered to identify clients. The "redacted blueprint" aesthetic transforms the constraint into a feature: the visual treatment communicates that the work exists and is significant without disclosing anything protected.

**Trade-off:** The confidential section is less immediately impressive than a live-demo portfolio. Accepted: the industry/role/impact framing communicates competence without disclosure risk.

---

## Easing: expo.out as the primary reveal easing

**Status:** Accepted

**Why:** Exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) reads as fast and snappy — it reaches near-final state quickly, then gently settles. This matches the precision/efficiency identity of the brand. Linear or sine easing feels sluggish; back/elastic easing feels playful in a way that doesn't match the technical aesthetic.

**Trade-off:** `ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) is available for specific elastic moments (e.g., skill tile pop). Default to expo.out everywhere else.
