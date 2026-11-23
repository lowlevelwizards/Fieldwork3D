# Fieldwork — Action vocabulary and icon audit (N1–N4)

## Scope and source of truth
- The player-facing command registry is `src/ui/context-actions.ts` and the
  palette is `src/ui/tactical-palette-controller.ts`. Stable IDs and all
  underlying simulation/order handlers are intentionally unchanged.
- The SVG registry is `src/ui/tactical-icons.ts`; 22 new simple single-stroke
  symbols cover custody, search, escort, casualties, doors, tools, power,
  window transitions and replay inspection. Missing IDs are warned at runtime
  and fail the new regression contract rather than silently passing.
- Current-value settings use the value (HOLD FIRE, RETURN FIRE, STAND, CROUCH,
  WALK, RUN); actions use a verb (OPEN WINDOW, REASSURE, SET DOWN, etc.).
- Contextual FOLLOW/STAY actions use the short verb alone when only one
  target class is available, and add SUSPECT/CIVILIAN when both are present.
  Their full descriptions remain in tooltips and accessible descriptions.

## Secondary screens
- Quick Play distinguishes RANDOM SEED (clear the seed) from GENERATE RANDOM
  (immediately create a randomized mission).
- Equipment preparation is called SQUAD EQUIPMENT; Quick Play's per-operator
  entry uses EQUIPMENT instead of LOADOUT.
- Replay Clean is HIDE HUD/SHOW HUD; replay deletion confirmation states
  CONFIRM DELETE; debrief's featured content is called MOMENTS and recorded
  playback actions are WATCH CLIP or WATCH INCIDENT.
- Debrief shot navigation buttons have explicit accessible names.

## Layout and acceptance
- Phone tactical command labels may wrap instead of ellipsizing; primary touch
  targets are at least 44 CSS pixels high in both docked and floating modes.
- Regression tests enumerate static command IDs, exercise dynamic tool/power
  mappings, check all semantic shapes and state variants, assert ambiguous
  dual-target labels, and protect screen action copy.
- Automated tests do not substitute for checking actual touch readability on
  landscape iPhone, 360px portrait and desktop. Keep a review gate for those
  real screens whenever modifying the action roster.
