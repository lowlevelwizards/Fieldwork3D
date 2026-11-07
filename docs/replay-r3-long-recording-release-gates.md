# Replay R3 — long-recording release gates

State: feature-branch experiment only. **Do not lift the 12,000-frame cap or merge the long-film branch on the strength of the read-side prototype alone.**

## Implemented in this draft

- **G1:** 400-frame immutable metadata index, 20Hz recorder-aligned.
- **G2:** on-demand adjacent replay samples with a strict LRU resident chunk bound and fail-closed invalid-time/chunk behavior.
- **G3a:** isolated V2 IndexedDB database; immutable generation/index chunk rows; atomic staging progress, final publication, same-transaction prior-version replacement cleanup; interrupted saves remain inspectable and explicitly discardable.
- **G3b:** Chromium reload/recovery and IDB transaction smoke: partially written replays are invisible, failing append does not advance the durable journal, the old published film survives replacement failure, conflicting writers fail, malformed chunks are rejected, and V1 library remains intact.
- **G4a/G4b:** asynchronous seek/advance transport with request generation guards; only the latest completed request can commit historical presentation. Real Chromium proof of persisted forward/reverse seek.
- **G5a:** synthetic 12k-frame random seek and cache-eviction stress, **not** mobile wall-clock FPS.

## Required before enabling longer live recording

1. **G4c production integration:** feed the tactical renderer, animation pose, ballistic visual/audio, shot inspector, chapter/event director and personal Bodycam lens from bounded sample windows. Avoid recreating an entire `MissionRecorder.frames` array as an intermediate. Seek/order UI must signal loading, partial film, damaged chunks and retry behavior.
2. **Incremental recorder writer:** decouple 20Hz authoritative capture from asynchronous IndexedDB batch commits; bound in-RAM pending samples, never start a transaction per simulation frame, and never block the sim on a quota prompt. Flush at safe intervals, and fully preserve shot/impact, execution/plan, personal sight, explored terrain, personal door/window, audio/motion and equipment journals. Do not infer missing evidence.
3. **V2 archive and legacy compatibility:** complete versioned portable import/export, migration and rolling save eligibility. Existing V1 films remain readable; no automatic destructive migration. A V2 `storageComplete` flag describes disk integrity, distinct from `completeness.complete` which denotes whether the historical mission was fully captured.
4. **Retention and quota:** give users a clear size/retention policy; no automatic silent deletion of starred or other recordings. Allow cancellation/retry/recovery of incomplete drafts, retain a working previous published generation until its replacement transaction commits, and surface IndexedDB/private-mode/quota failures.
5. **Long mission and release QA:** sustained 20Hz capture beyond 10 minutes with varied doors, windows, cover movement, 4 operators, combat and incident events; verify all chunks, random seek, A/B loops, replay export, checksum or structural integrity and honest partial-disclosure labeling. Test actual iPhone Safari/WebKit and representative Android in addition to Chromium SwiftShader. Measure frame time, resident memory, on-disk footprint, and recovery after app suspension or refresh.

**Explicit non-goals for G1–G5a:** no live cap changes, no automatic background task, no synthetic frame reconstruction, no claimed real-device FPS, no attempt to replace the existing stable V1 library UI.

Release cadence: commit stages on the draft PR, run only focused regression and browser storage gates, reconcile against current main, then group **finished** long-film behavior into one release checkpoint after the preceding Pages build is verified.
