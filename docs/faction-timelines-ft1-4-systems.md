# FT1.4 — systems-only historical kit quality and future-art prioritization

## Locked scope / non-goals

**No new meshes, weapon families, equipment catalog entries, historical gear
identities, source claims, timeline associations or authored appearance kits.**
No changes to campaign save formats, stock ownership, AI, ballistics, loadout
weights, or faction rarity. Existing 34 timelines, 44 visual reference kits,
35 historical identities and 32 associations are unchanged.

The generator now prioritizes documented historical suitability ahead of model
convenience. For a dated existing appearance reference that matches a selected
timeline/year/environment, Operator Studio may reuse the current reference
wardrobe, rig and weapon **only as a clearly labeled visual stand-in**. Research
choices are laid on top with the normal compatibility checks. An outside-era
nearest reference is advisory, never automatically loaded. Actual Quick Play
and Campaign equipment applications remain completely separate and stock-aware.

## FT1.4 system stages

- **A — Demand index:** `faction-reference-content-demand.ts` aggregates
  currently unresolved authored asset gaps by distinct reference ID. The audit
  reports benefit to existing kits, defining and significant gaps, currently
  selected game proxy IDs, and confidence in the visual-substitution gap.
  Stable tie breaks make queue reports reproducible.
- **B — Ensemble audit:** `faction-reference-ensemble-audit.ts` separates
  source count, historically researched categories, visually supported
  categories, proxy-only items and unrepresented identities. It detects
  selected game-slot collisions without claiming that separately evidenced
  items were issued/worn together. Complete-kit certification remains false.
- **C — Dated visual proxy lookup:** `faction-reference-visual-proxy.ts`
  reuses FT1.0 appearance snapshots only when their authored period and
  environment actually cover the request; neighboring years are *not*
  silently interpolated.
- **D — Studio review:** `faction-reference-browser.ts` shows source vs proxy
  coverage, ensemble completeness, and a collapsed ranked future-art queue.
  `operator-studio.ts` previews the period-compatible legacy reference model
  on its existing shared rig, without writing those provisional items into
  saves. Research-only selections still use strict canonical application.
- **E — Coverage analysis:** `faction-reference-quality-audit.ts` provides
  per-context historical eligibility, authored visual fallback, unresolved
  categories and applicable future asset gaps. `faction-reference-audit.ts`
  keeps historical and visual content-demand dimensions separate.
- **F — Regression:** No-content invariants, dated/undated proxy status,
  deterministic demand scoring, preserved co-issue uncertainty, safety and
  Studio source boundaries.

## Prioritization scoring (advisory only)

An unresolved asset request gets a unique affected-kit count derived from
existing references (never an asserted issue prevalence). The score is:

`5×affected kits + 3×missing models + 12×defining gaps +
5×significant gaps + a proxy-distance heuristic (0, 8 or 16)`.

A proxy's **novelty** currently uses observable missing/approximate coverage
and the authored importance of the identifying silhouette. It does **not**
analyze real mesh geometry. Every priority record therefore includes
`noveltyRequiresReview=true`. Before creating an art ticket, a human visual
review should consider actual silhouette uniqueness, the feasibility of
reusing shared parts, expected effort and which kits would benefit.

Queue entries remain requests for *future* content, not content itself.
The current display only previews the top 12 priorities. No queue item
automatically creates models, research entries, asset tickets or releases.

## Acceptance checklist

1. 34 timelines, 44 references, 35 identities, 32 associations unchanged.
2. Prioritized queue has stable counts and scores and no repeated kit credit.
3. Matching-period visual reference can be used as an explicit proxy, but
   outside-period/nearest references never silently count as historical proof.
4. Unresearched categories retain their unknown status and existing gameplay
   equipment; proxy rifle identities are not authorized weapon purchases.
5. Complete-kit certification remains false absent independent whole-kit
   evidence. Selected slot collisions are surfaced.
6. Existing Quick Play/Campaign ownership, mission locks, cosmetic-only saves
   and one-Studio-renderer performance contracts hold.
7. Focused FT1.x tests, production typecheck/build, and Studio mobile smoke
   complete before a release checkpoint. Verify the last live Pages stamp and
   absence of an active deployment before merging.
