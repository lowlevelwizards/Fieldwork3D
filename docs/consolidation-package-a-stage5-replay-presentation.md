# Consolidation Package A — Stage A5: Replay display state and lifecycle

Baseline: A4 production `cbc0eb49d2e03f4bb833318f35c698095a855bd3`.

## Current-source audit and ownership decisions

`breach-main.ts` currently declares nine mutable replay-display flags separately: cutaway/X-ray, analysis, plan scope/version, name/contact/objective labels, traces, ghosts, and trails (10 fields total). Four separate pathways write these flags: replay entry's `resetReplayOptions`, presets/overlays, toolbar toggles, and mission release. The presets also write `replayAnalysisUi.replayPreset`, a second mutable display-owner field. This is a consolidation target, not an invitation to change how historical playback works.

Distinguish clearly:
- **Replay presentation preferences:** X-ray cutaway, analysis graphic, plan scope/version, name/contact/objective labels, trace/ghost/trail display modes and preset indicator. These belong to a single pure `ReplayPresentationOptions` store.
- **Historical presentation data:** `ReplayPresentation` snapshots from replay motion, `ReplayMovementHistory` constructed from recorded frames, and 2D/3D frame geometry. Keep existing responsible modules.
- **Historical information/disclosure:** `ReplayKnowledgeController`, recorded operator awareness, contact evidence, event/ballistics visibility, ground discovery, observer selection, and per-shot inspection. **Never** put these inside display options. In particular, the visibility preset must not change historical sight mode, ground lens, or omniscience.
- **Playback/camera/bodycam:** replay timing, speed, follow, director edits, sight mode, mounted bodycam, and audio. Retain respective owner/controller.
- **Analysis UI workspace:** tool tabs, incident and shot selection, bookmarks, chapters, feeds, focus restoration, scroll, after-action return and the replay library. Keep their current controllers.

## Precise A5 scope

1. Add pure browser-independent `src/breach-replay-presentation-options.ts`, with a single immutable, typed `ReplayPresentationOptions` snapshot. Expose explicit initial/in-replay defaults, `resetForReplay()`, `resetForMission()`, `clearOverlays()`, `applyPreset(clean|movement|combat|visibility)`, and typed `patch`/`setPreset`. No playback or DOM access.
2. Preserve current defaults exactly: startup plan scope **selected**; replay entry plan scope **none**; all label groups on; traces/ghosts/trails off; plan version active; analysis off. Replay entry enables X-ray as before; exit disables it. Clean hides names, contacts, objectives, plans, analysis, traces, ghosts and trails, but intentionally leaves plan version and cutaway untouched. Other preset fields mirror current behavior, including fields they deliberately do not modify.
3. Move all main-file flag writes into the store. Main remains the thin effect adapter for `stage.setReplayXray`, `replayKnowledge.groundLensOn` and `replayAnalysisUi.selectedReplayShotId`. Store does not touch those effects. The scene and overlay renderer consume a single consistent read-only option snapshot, not duplicate writable values.
4. Move the preset indicator from the analysis UI's locally mutable `replayPreset` to the injected option owner, retaining analysis UI's existing public getter/setter for compatibility but making it delegate to the store. Do not move tab/bookmark/event state.
5. On successful replay entry, invoke the store's `resetForReplay` once; on exit, disable cutaway without changing historical objects; on hard mission replacement, run `resetForMission` and clear the 3D cutaway even if a replay exit was interrupted. These are separate lifecycle situations and must not trigger duplicate replay restoration.
6. Preserve current user-facing control transitions (including deliberate cases where a toggle does not mark the preset Custom). A visibility preset opens the existing View details section but does not alter knowledge.
7. Extend `breach-replay-hud-controller` to take one `presentationOptions` snapshot instead of repeating roughly eight replay fields in its public type. Camera and knowledge stay separate. Protect per-frame memory by replacing immutable snapshots only on intentional interaction, never on redraw.
8. Focused tests: exact defaults, preset matrices, clear behavior, no hidden-intel access, read-only snapshots, no cross-session preferences, replay->debrief after-action workspace, menu archive->library, director/observer historical knowledge, replay->mission restart, 2D/3D overlays, and existing control labels.
9. Keep critical suite, TypeScript build, replay library, camera, knowledge, pointer/mission and Stage 6 phone/desktop real-WebGL browser acceptance green. Physical hardware acceptance remains a separate unclaimed sign-off.
10. Commit on feature branch. Do not merge while Pages is building/deploying. Verify the previous production release, merge only at a green checkpoint and confirm GitHub Pages publicly serves the new expected build stamp.

## Explicit non-goals

No changes to 60 Hz simulation, path planning, director scoring/shot grammar, bodycam authority, camera lenses, recorder data, new visibility modes, event-filter privacy, persistence keys, design/UI layout, or screenshot/export behavior. Avoid a new global store, subscription framework, or two-way synchronization; there is only one authoritative presentation object.

**Closure:** all mutable display/preset flags are removed from main/analysis UI as separate sources, replay lifecycle has deterministic defaults and release behavior, historical knowledge remains isolated, all required CI/browser checks pass and public deployment is verified.
