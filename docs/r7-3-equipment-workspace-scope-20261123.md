# R7.3 — Shared equipment workspace orchestration

Base: `9d8f154219827b931f99f23351d5f50e3935f5d0` (R7.2 public Pages verified: `9d8f15421982-mwtvttiu`).
Risk: medium-high (preview GPU lifetime, stale callbacks, stock/persistence boundary).

## Existing ownership

CampaignScreen, Quick Play Operations Board and Quick Play Creator already call the shared Outfitter Gallery, Field Gadget Editor, and CampaignKitPreview. Each separately owns gallery replacement/disposal, operator identity/preview reattachment and selection maps. Board defers preview initialization to RAF and must not allow a stale scheduled mount to attach a renderer or install the retired tap handler. Campaign independently remembers operator orbit and weapon workbench view. The gallery already serializes thumbnail work and cancels its generation, observer and scheduled work on dispose; keep that implementation. Do not treat a source call count as a measured runtime cost.

## Complete staged scope

1. **R7.3.01 — Ownership ledger.** Preserve authoritative Campaign stock, transaction, quote, confirmation, save and undo paths. Quick Play uses its current roster mutation/validation, save, apply and undo contracts; Creator uses its injected handlers. No new equipment store.
2. **R7.3.02 — Shared workspace lifecycle.** Introduce one UI-only workspace factory per actual mounted surface, with one gallery and one operator preview, mode-local per-operator selected-item and horizontal scroll memory. Never share a mutable workspace instance across modes. Maintain existing slot selection and focus policy in callers.
3. **R7.3.03 — Gallery handoff.** Retire old gallery before replacing markup; pass the committed kit snapshot and existing authoritative source/handlers unchanged. Wrap callbacks in a workspace gallery-generation check so a retired view cannot dispatch an equip, inspect, arsenal, category, auto-pack or carry callback. Let the existing gallery own lazy GPU readback and disposal. No copy of catalog or stock logic.
4. **R7.3.04 — Operator preview mount.** Shared new/retain/reattach/update path uses actual selected operator and committed equipment. Reuse a ready renderer, switch operator identity before attach/update, preserve caller initial focus/orbit, retain fallback editing when WebGL is unavailable. Keep Campaign weapon workbench distinct, preserving its existing orbit and geometry policy. On release detach tap handlers and dispose once. Do not allocate a new GPU context on ordinary ready-preview remount.
5. **R7.3.05 — Deferred mount retirement.** Board's existing one-shot RAF runs only for the current mount, a connected and open kit and visible board; cancel pending request and reject stale generation after rerender/close. No additional frame loop. Retire workspace on closed/empty kit or closed sheet, mission/replay/GO transition, and Creator hide/collapse; never remount a closed sheet because a roster callback arrives. Keep navigation/scroll/focus and mobile/gallery semantics.
6. **R7.3.06 — Integration.** Migrate the three callers to the owner while retaining their particular categories, physical editor, wardrobe, preset, purchase/stock availability and workbench controls. Preserve existing Campaign desktop vs compact gallery behavior. Keep preview model/thumbnail, dot/tap, pose and orbit APIs, actual selected-item checks and inaccessible controls.
7. **R7.3.07 — Evidence.** Add real shared-owner tests with injectable instrumented gallery/preview and frame ports: one live gallery, same renderer across operator switch/host remount, exact committed equipment forwarded, old callback rejection, cancellation even if retired RAF fires, fallback preview, idempotent cleanup, independent per-mode memory and roster/transaction separation. Migrate living R7.0 audit and stale source-contract tests to the new boundary rather than deleting coverage. Preserve existing carry, quick roster, Campaign stock, GPU thumbnail and browser specialist tests. No device performance claim from synthetic counts.
8. **R7.3.08 — Release.** Use existing architecture and critical suite; no new workflow. Exact-head CI/typecheck/build, equipment/arsenal/visual and prior Pages release readiness, reconcile main, squash merge only when green. Verify auto Pages release exact build when available.

## Explicit non-goals

No gameplay/60-Hz/replay/fog/recording changes, no new save format or stock pooling, no rewrite of Campaign navigation (R7.4), no UI layout/style redesign, no second gallery/preview per view, no global renderer pool. Keep existing resource ownership in the renderer/gallery and existing authorization in each caller. Existing per-operator preference keys stay UI-only and are not persisted.

## Acceptance

```sh
node --experimental-strip-types --test tests/r7-3-equipment-workspace.test.mjs
node --experimental-strip-types --test tests/outfitter-gallery-lifecycle.test.mjs tests/performance-p7-gallery-noop.test.mjs tests/performance-p3-async-thumbnails.test.mjs tests/loadout-quickplay-preview-integration.test.mjs tests/loadout-quickplay-carry-selector.test.mjs tests/loadout-carry-selector-integration.test.mjs
node --test tests/r7-0-ui-orchestration-audit.test.mjs
node scripts/verification/r7-0-ui-orchestration-audit.mjs --check --out artifacts/refactor-r7-0
npm run build
```

If a caller fails, fix the shared ownership handoff without widening transaction policy. Roll back the R7.3 merge if the actual shipped build regresses. R7.4 and R7.5 remain future work.
