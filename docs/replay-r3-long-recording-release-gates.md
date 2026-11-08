# Replay R3 — long-recording release gates

State: feature-branch experiment only. **Do not lift the 12,000-frame cap or merge until the actual 20Hz recorder, bodycam/event tools, export, UI and quota handling operate end to end without whole-film memory retention.**

## Implemented in this draft

- **G1:** 400-frame immutable metadata index, 20Hz recorder-aligned.
- **G2:** on-demand adjacent replay samples with a strict LRU resident chunk bound and fail-closed invalid-time/chunk behavior.
- **G3a:** isolated V2 IndexedDB database; immutable generation/index chunk rows; atomic staging progress, final publication, same-transaction prior-version replacement cleanup; interrupted saves remain inspectable and explicitly discardable.
- **G3b:** Chromium reload/recovery and IDB transaction smoke: partially written replays are invisible, failing append does not advance the durable journal, the old published film survives replacement failure, conflicting writers fail, malformed chunks are rejected, and V1 library remains intact.
- **G4a/G4b:** asynchronous seek/advance transport with request generation guards; only the latest completed request can commit historical presentation. Real Chromium proof of persisted forward/reverse seek.
- **G5a:** synthetic 12k-frame random seek and cache-eviction stress, **not** mobile wall-clock FPS.
- **G4c1–G4c5:** shared V1/V2 authoritative interpolation; opt-in chunk-driven tactical scene and recorded motion/observer data; browser parity checks; event/audio candidates during forward playback only; isolated per-operator observation projection that excludes team and other-operator evidence.
- **G4d1–G4d2:** replay-only bounded asynchronous clock/controller, explicit pause/seeks, last-request-wins state and corrupted-chunk fail-closed behavior. Verified against a reopened persisted film in Chromium. **Still not the live Replay Library UI.**
- **G4d3–G4d4:** an independent bounded read window for event-time visibility, so feed construction never changes the current 3D camera/Bodycam scene. Fail closed if historical evidence is absent. Personal, team and full indexes verified in Node and a real browser.
- **G5b1:** pure 400-frame capture spool with at most two outstanding chunks plus one assembling chunk by default. No per-frame IndexedDB operations. Explicit truncation on backpressure; failed transaction keeps its original ordinal for an intentional retry. 12k sample cadence and induced slow-storage checks.
- **G5b2–G5b3:** backward-compatible IndexedDB schema upgrade to version 2. Streaming drafts can start without their final frame count, persist chunks and progress independently, recover after reload, seal a full or short last chunk, validate the final evidence sidecar, publish atomically and preserve earlier publications on failure. Chromium recovery, invalid sidecar and explicit discard tests passed.
- **G5b4:** the *real browser* produced a bounded spool and wrote immutable chunks into the streaming draft; the resulting film reopened with the existing G4 chunk reader/scene, without a full-film hydration step. The stable V1 replay library remained unmodified.

## Current critical restrictions

- **No player-facing switch has been made.** The stable Replay Library still uses V1 full-film restore, and Bodycam/squad-entry/shot inspection still include consumers of `recorder.frames`. These must migrate to indexed history before launch.
- **No live recorder memory cap change.** G5b's chunk spool and streaming store are wired to each other in a browser integration test, **not** to the live `MissionRecorder.capture` path. That path still owns up to 12,000 authoritative frames in memory.
- **Long event/pose/observation journals must stream or be bounded.** The final V2 sidecar currently contains full motion, battle, plan, personal ground, personal door/window and shot histories. Even after frames spill, those can grow. Preserve exact event-time disclosure and do not discard oldest facts silently.
- **IndexedDB transaction success is not a guarantee of physical-device longevity.** Safari/WebKit suspension, quota/eviction behavior and actual memory ceilings remain release blockers; no live speed/FPS claim is made.
- **Experimental V2 import/export is not yet complete.** Do not publish files or offer migration as if V1 and streamed V2 had identical standalone portability.



## Required before enabling longer live recording

1. **G4c production integration:** feed the tactical renderer, animation pose, ballistic visual/audio, shot inspector, chapter/event director and personal Bodycam lens from bounded sample windows. Avoid recreating an entire `MissionRecorder.frames` array as an intermediate. Seek/order UI must signal loading, partial film, damaged chunks and retry behavior.
2. **Incremental recorder writer:** decouple 20Hz authoritative capture from asynchronous IndexedDB batch commits; bound in-RAM pending samples, never start a transaction per simulation frame, and never block the sim on a quota prompt. Flush at safe intervals, and fully preserve shot/impact, execution/plan, personal sight, explored terrain, personal door/window, audio/motion and equipment journals. Do not infer missing evidence.
3. **V2 archive and legacy compatibility:** complete versioned portable import/export, migration and rolling save eligibility. Existing V1 films remain readable; no automatic destructive migration. A V2 `storageComplete` flag describes disk integrity, distinct from `completeness.complete` which denotes whether the historical mission was fully captured.
4. **Retention and quota:** give users a clear size/retention policy; no automatic silent deletion of starred or other recordings. Allow cancellation/retry/recovery of incomplete drafts, retain a working previous published generation until its replacement transaction commits, and surface IndexedDB/private-mode/quota failures.
5. **Long mission and release QA:** sustained 20Hz capture beyond 10 minutes with varied doors, windows, cover movement, 4 operators, combat and incident events; verify all chunks, random seek, A/B loops, replay export, checksum or structural integrity and honest partial-disclosure labeling. Test actual iPhone Safari/WebKit and representative Android in addition to Chromium SwiftShader. Measure frame time, resident memory, on-disk footprint, and recovery after app suspension or refresh.

**Explicit non-goals for all completed foundation stages:** no live cap changes, no automatic background task, no synthetic frame reconstruction, no claimed real-device FPS, no attempt to replace the existing stable V1 library UI.

Release cadence: commit stages on the draft PR, run only focused regression and browser storage gates, reconcile against current main, then group **finished** long-film behavior into one release checkpoint after the preceding Pages build is verified.
