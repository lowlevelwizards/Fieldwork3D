# R7.4 — Bounded Campaign view controllers

Base: R7.3 squash merge a05bd63ce633af9520fa7000c5d0f083ef81509d. Medium risk; release only after R7.3 public build verification.

## Ownership and invariants

CampaignScreen remains the public entry/creator/home/armory facade; campaign flow/state remain the sole transaction, eligibility, save and mission authorities. No new state store, layout changes, styles, resource pools, gameplay or serialization. Preserve the R7.3 shared equipment workspace, separate workbench, kit focus, orbit and undo. Current campaign slot, home tab, operator/case/supply/record selection and preparation return must retain their existing semantics. No hidden background rendering.

## Staged work

1. R7.4.01 — Capture current source and regression contracts; classify entry/creator, home navigation, personnel, contracts, logistics, records and armory presentation, and existing action boundaries. Record actual source edges rather than claiming runtime performance from line counts.
2. R7.4.02 — Extract home refresh capture/restore (keyed disclosures, same-label focus, scroll, selected-tab fallback) to a narrowly scoped view controller. Retain fresh entry behavior and current rendering order. Test with injected DOM-like fixtures and existing browser acceptance.
3. R7.4.03 — Extract tab activation and keyboard navigation into a bounded tab controller; retain five mounted panels, selected tab ARIA and roving tabindex, and reset scroll only on tab change. Keep authoritative counts from the supplied campaign snapshot. Preserve preparation return behavior.
4. R7.4.04 — Extract landing subpage/back/focus and entry composition using existing handlers; preserve active-slot preference, new/switch/more, import confirmation, creator cancel and utilities. No changes to save validation.
5. R7.4.05 — Extract bounded read-only personnel/case/supply/record view portions where their inputs and outputs are explicit. Keep actual action and stock callbacks on the facade; do not duplicate renderers or campaign policy. Preserve selection/disclosure, case expiry, contract review/return and roster/stock updates. Keep armory-specific rendering and GPU ownership in the current owner unless a pure presentation extraction is demonstrably safe.
6. R7.4.06 — Migrate living R7.0 ownership audit and source-contract tests to new boundaries, not delete checks. Add focused tests for fresh navigation, same-view refresh, inactive/disabled focus, tab wrapping, case return and operator identity. Verify campaign entry, creator, home, armory, existing mobile/browser contracts and stock/undo. No new workflow; integrate with architecture-critical and existing affected suite.
7. R7.4.07 — Compare exact head to main, reconcile overlap, review, build/typecheck, architecture/affected domain and applicable specialist checks. Confirm R7.3 public Pages stamp before merging R7.4. Squash only when safe; verify new public stamp. R7.5 remains integration/selective subtraction.

Acceptance: no change in public handlers, authoritative campaign snapshots, transaction effects, user-facing layouts or navigation semantics; no new persistent preferences, rendering loops or preview contexts. Tests must measure behavior, not merely reduced line count. Preserve old behavior by default; document any deliberate correction separately.
