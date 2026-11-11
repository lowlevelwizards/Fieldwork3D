# Package A — Stage A2: boot configuration, mode contracts, and safe persistence

**Baseline:** main commit `278352e35f044d3ea6ef71b52ac91b5e7fd509e6`, A1 production build successfully served.
**Scope:** replace duplicate parsing/type/storage wiring only; all tactical, rendering, equipment, replay, and saved-data semantics remain unchanged.

## Audited ownership and constraints

The tactical entry reads its boot query through several independent `new URLSearchParams(location.search)` calls in `breach-main.ts`, `breach-runtime-loop.ts`, `breach-quickplay-controller.ts`, and `ui/breach-mission-screens.ts`. These reads are all initial startup configuration, **not** live state. Explicitly pass a single, immutable, testable configuration object from the main entrypoint; never make shared core simulation modules import browser globals. Render-specific lighting A/B (`?lighting=legacy`) and standalone Lab page parameters retain their own respective entrypoint ownership. Runtime settings changed through the UI remain mutable, and `history.replaceState` updates only future deep links, not the current boot snapshot.

The four-value `'menu'|'home'|'mission'|'quick'` union exists in multiple controller hooks and UI contracts. A2 replaces those type duplicates with a single `CampaignMode` alias, **without** changing mode values, transitions or return destinations. The actual application-flow state machine belongs to A3.

A2 consolidates the canonical storage **keys and safe access/migration adapters** for the tactical entry and standalone Operator Studio, but does not move campaign resolution, operation-history business rules, or wardrobe editing into a global state manager. Stored schema keys and payload formats remain **byte-for-byte identical** for equivalent inputs.

## Scope

### A2.1 — Immutable boot query parser

Create `src/breach-boot-config.ts` with a pure `parseBreachBootConfig(query: string | URLSearchParams)`. Preserve precise legacy rules and defaults:

- `briefingV2=0` disables narrative dossier; otherwise enabled
- `civilians=0` disables civilians; otherwise enabled
- presence of `fixedSite` and `quick` selects Quick Play entry; never auto-run the creator
- positive integer `seed` up to UINT32_MAX; missing/invalid remains null so random seed still comes from the host crypto function
- numeric `condition` is clamped 0–100, non-numeric or absent stays null
- accepted lighting values `day/evening/night/blackout/emergency`, fallback day; the rendering `lighting=legacy` QA override remains separate
- accepted sizes `standard/expanded/small/medium/large`, fallback standard
- presence-based `directorDebug`, `nav`, `audit`, `perf`, `bodycamqa`
- `fogDebug=palette`, `gpuWarmup=0` opt-out, `focusFx` and `awareness` raw string or null.

The parser must not inspect location/storage at module import. The parent tactical entry reads the query once, and injects the result into Quick Play, runtime loop, and mission screens. Keep studio/renderer-specific independent page options independently owned.

### A2.2 — One mode type contract

Create `src/breach-app-mode.ts` exporting `CampaignMode`. Replace repeated union definitions in main, Quick Play, campaign flow, runtime loop, mission controller, operator studio and equipment bridge contracts, operations board, mission screens, and debrief presentation. **No runtime navigation refactor in A2.**

### A2.3 — Storage key contract and persistence ownership

Create `src/breach-storage-keys.ts` defining the five existing literal keys (intel, quick cosmetics, legacy roster, campaign, operation history). Create `src/breach-persistence.ts` with explicitly injected optional Storage adapters, returning safe fallback/no-throw results.

- **Intel preference:** accept only known `INTEL_MODES`, otherwise default `exterior-known`; saving must never change the currently loaded mission's knowledge.
- **Quick Play:** load new cosmetic key first, falling back to old roster key; apply `freshQuickPlayRoster(readRoster(...))`. If the legacy key exists, rewrite the new cosmetic payload and then remove old key, **only after a successful write**; never carry weapons/ammo/injuries across Quick Play missions. If browser storage is denied, continue with a fresh roster.
- **Campaign:** use existing validated `readCampaign` and unmodified `JSON.stringify(campaign)`; never reset an existing good campaign just because storage is unavailable.
- **Operation history:** retain `parseOperationHistory`, `addOperationRecord`, and the 12-entry history behavior. Preserve original recording and duplicate-prevention logic in CampaignFlow.
- **Standalone Operator Studio:** reuse keys from a pure key contract; do not route its direct writes through the tactical entrypoint or silently alter iframe save-acknowledgement semantics.
- **Shelved miniature focus:** preserve `MINIATURE_FOCUS_STORAGE_KEY` and opt-in-only semantics; replace duplicate storage try/catch access with safe value helpers without reactivating old saved effect settings.

No new localStorage keys, version increment, destructive migrations, or automatic campaign schema writes. No persistence exceptions allowed to prevent the tactical page from booting.

### A2.4 — Critical coverage and integration

- Pure boot-config table tests of edge cases, repeated/absent URL params, presence vs `=0`, condition/seed limits, lighting/scale fallbacks, raw diagnostics, and no import-time browser globals.
- Storage fixture tests for new-key precedence, complete legacy cosmetics migration, blocked/quota-limited storage, corrupted preferences, campaign round-trip and validation, operation-history retention and failure handling, opt-in-only miniature focus.
- Static wiring guards: shared mode type appears in all relevant contracts, no extra `URLSearchParams(location.search)` in the four tactical composition modules, key literals only at canonical definitions, preserve renderer/standalone Lab flags.
- Curated architecture tests and production build, Stage 6 WebGL phone/desktop + replay and Lab, Quick Play creator return, campaign save and studio bridge checks.
- Commit on feature branch; merge **only after** PR checks green, no deployment is active, and previous main's Pages build is successfully served. Then confirm the new Pages build stamp matches the exact merged commit.

## Not in scope

App-flow state machine, replay option ownership, tactical targeting exclusivity, save version redesign, broad rendering-flag cleanup, UI redesign, and removal of the compatibility adapter. Those belong to later stages.

## Definition of complete

Each supported startup value has exactly one parser on the tactical entry, mode hooks reference one shared union, persistence keys are defined once, save behavior and legacy upgrade are tested under successful and failing Storage, no player data is lost, gameplay outcomes unchanged, all CI checks pass, and GitHub Pages serves the verified merged build.