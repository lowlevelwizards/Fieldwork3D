# Fieldwork Breach — Closeout Stage 6
## Final integrated architecture release and manual acceptance

**Base:** production `449578d` (Closeout Stages 1–5).  
**Change policy:** validation, end-to-end glue and proven regression fixes only.
No rebalancing, authored-order redesign, camera restyling, animation retuning,
seed-golden reblessing or simulation behavior changes in this closeout.

### Definition of done, with independent evidence tiers

| Gate | Required proof | Status at authoring |
| --- | --- | --- |
| A — physical core | Frozen Stage 1 SHA-256 outcomes, authoritative 60 Hz phases, combat, movement and scenario fixtures | Automated workflow pending |
| B — lifecycle | Real mission → planning/GO → recording → detached replay seeks → live resume → exact start snapshot restart | Automated workflow pending |
| C — view disclosure | Same-session fog/LOS, historical doors/windows/actors, 2D/3D object policy, no knowledge of background sites | Automated workflow pending |
| D — bounded visuals | Scene disposal, magazine caps, fog and shader resources, no frame-to-frame accumulation | Automated workflow pending |
| E — animation | Exactly one final output commit and replay/Lab/live pose parity; no drift after seeks | Automated workflow pending |
| F — UI/browser | Actual Chromium with software WebGL; iPhone-portrait + desktop mission, views, replay, restart and non-destructive Quick Play creator; iPhone-landscape screenshot | Automated workflow pending |
| G — replay/Lab | Real WebGL historical Bodycam mount/return and unified Operator Lab pose + equipment smoke with captures | Automated workflow pending |
| H — release | All required PR checks green, previous Pages build verified, one merge, new Pages workflow verifies served build stamp | Automated workflow pending |
| I — physical device | Real Safari on iPhone + desktop hardware pass recorded by a tester, with screenshots and any bug IDs | **PENDING — cannot be certified by CI** |

Stages 1–5 remain as-built; their dedicated tests run together on Stage 6.
The unified `breach-critical-suite.mjs` and architecture boundary rules still
run first. The new `breach-closeout-stage6-integration.test.mjs` covers a
real generated mission (not simulated snapshots or fake results) and the
state-isolation invariants across the full lifecycle.

### Browser implementation

`scripts/smoke-closeout-stage6.mjs` runs an actual local Vite site in
headless Chromium using real WebGL via software ANGLE/SwiftShader.
It is **not** a screenshot mock or a physical iPhone.

Automated flows:
- 390 × 844 touch viewport: load a reproducible Quick Play mission;
  switch ISO → TOP → 2D → ISO, verify active button states and canvas,
  run live 60 Hz simulation until clock advances, pause, enter an actual
  recording, change historical camera views, exit without changing live time,
  confirm destructive restart, then open/close Quick Play generator without
  losing restarted mission
- 1440 × 900 desktop viewport: repeat the same complete mission lifecycle
- 844 × 390 touch viewport: assert landscape UI width and real scene frame
- Gather screenshots of initial, Floor Plan, replay, live resume, restart
  and landscape, plus diagnostic output on failures
- Report uncaught page exceptions and WebGL shader/compilation errors

A separate browser job reruns the existing real WebGL Bodycam mount and
Operator Lab pose/weapon/armor smoke scripts and uploads their evidence.
A skipped hardware smoke is **never** recorded as physical-device approval.

### Physical iPhone Safari acceptance (manual tester required)

Run against the verified production commit with Safari on the actual phone.
Record device model, iOS version, viewport, network conditions, session
length, build stamp, pass/fail, and screenshots/video for failures.
Check these in order, using the same fixed seed when comparing views:

- [ ] **First load / controls:** no blank canvas, crash or stuck loading;
      screen rotation correctly recalculates map and controls; no invisible
      touch shield remains after closing a sheet
- [ ] **Mission navigation:** Quick Play opens the scenario creator;
      cancel/back never discards a live mission; return from mission to
      creator and back; restart returns to briefing; New Site is distinct
- [ ] **Planning / 60 Hz:** plot, drag, insert, undo/redo and re-target WATCH;
      sync and wait orders; GO/PAUSE; no duplicate touch commands or
      command placement beyond procedural map bounds
- [ ] **Doors / navigation:** four-operator stacking across hinged and
      wide openings; kicked, jammed, pushed, opening and closing doors;
      movement around shifted cover and narrow spaces without softlocks
- [ ] **Intel + fog:** ISO, TOP and Floor Plan all conceal the same
      unexplored interior; windows/doors expose only legitimate sight;
      exterior-known never reveals unknown indoor information
- [ ] **Contacts / civilians:** only discovered hostiles and civilians show;
      clear/capture/rescue/hold/intel missions remain completable; no
      concealed person or hidden flash/effect appearing during replay
- [ ] **Replay / Bodycam:** run a real mission, rewind and seek, compare
      personal/team/full sight, switch chest ↔ helmet, inspect a contact,
      return to tactical without losing live time, equipment or selected
      mission; verify no subjects appear through walls
- [ ] **Presentation quality:** no wrong-shoulder OTS, stuck transparent
      roofs, frozen cutaways, outside-wall fog leaks, detached magazines,
      stretched elbow/leg pose, or implausible short-stock clipping
- [ ] **Stability:** perform at least three New Site/restart/replay cycles;
      verify no progressive slowdown, persistent old props or failing input

### Desktop hardware acceptance (manual tester required)

- [ ] Use the installed browser on a real GPU, noting browser + GPU driver.
- [ ] Repeat the same seed in ISO, TOP, 2D and saved replay; compare fog and
      objective positions, operator silhouettes and impact effects.
- [ ] Run the mission through combat, pause/replan, replay and restart;
      confirm event order and timeline are stable after a rewind.
- [ ] Verify Studio and unified Operator Lab equipment/pose preview
      updates in the same application session with no state leakage.
- [ ] Verify camera pan/orbit/zoom centers on current site after switching
      a different-sized map and after exiting replay.
- [ ] After repeated missions, inspect WebGL memory/resource diagnostics
      (if exposed) and note any accumulating textures, geometries or stalls.
- [ ] Record any console/WebGL error, footage, and issue link.

### Release policy

1. Branch tests and both Stage 6 browser jobs must pass. The prior Pages
   release must be verified.
2. Merge only once at a stable integration checkpoint, without adding
   another production deployment to an active Pages run.
3. Wait for `Verify public Pages serves expected build` to pass for the
   exact merge SHA, not merely successful build/upload.
4. Update the release summary with automated verification result and
   **separate physical-device status**. Never imply browser emulation
   certifies iPhone Safari performance, tactile feel, or visual approval.
5. If physical testing exposes a blocker, open a focused fix and repeat
   the affected automated and hardware tests before declaring complete.

**Roadmap closeout interpretation:** once A–H pass, the consolidated
Roadmaps 3/4 *architecture and automated integration work* can be signed off.
Stage 6 *full manual acceptance* remains pending until I has real,
documented hardware results. Device FPS and subjective camera quality
cannot be inferred from CI or browser screenshots alone.
