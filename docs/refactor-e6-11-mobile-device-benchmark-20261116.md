# E6.11 — Cold first-frame remaining cost and real-device evidence

## What E6.10 did and did not prove

E6.10 moved the actual first-frame scene state before `compileAsync`.
The paired fresh Chromium/SwiftShader benchmarks reduced first-frame
wall duration by ~35–44% and reduced the combined preparation phases. Both
390×844 screenshot pairs were pixel-identical. Those samples are **not
real iPhone hardware GPU measurements**. E6.11 adds local diagnostics for
real Safari/iOS devices and groups the remaining WebGL calls.

## Reproducible iPhone / Safari procedure

On a recent Safari/iPhone, open the deployed `breach.html` URL with these
query parameters (preserve the existing website path):

- **Prepared:** `?coldBench=1&gpuTrace=1&gpuWarmup=1&coldPrewarm=1`
- **Baseline:** `?coldBench=1&gpuTrace=1&gpuWarmup=1&coldPrewarm=0`
- **Light-touch validation:** `?coldBench=1&gpuWarmup=1&coldPrewarm=1`

For each case start a **fresh Safari tab/page load**, select **QUICK PLAY**,
use the exact same creator options and seed (23 first, then 97), generate a
mission, and let it finish. The lower-right **SAVE COLD BENCH** button appears
only with `coldBench=1`. Give the game about two seconds for the bounded
90-frame post-ready sample, then tap the button to save a local JSON file.
Repeat the same seed/mode three times in alternating order with a cold page,
avoiding battery/thermal shifts and other open apps when possible. No file is
automatically uploaded. Compare on/off *for the same device and seed*.

A complete evidence file includes:
- Capture time, limited user agent, viewport/pixel ratio and touch count;
  no precise location, account ID or device serial number.
- Generation, session, scene, operator, HUD, preflight, compile and first
  visible frame JavaScript wall times, plus full startup wall duration.
- With `gpuTrace=1`, CPU call-wall times for shader program info logs,
  setup, buffer/texture submission, draw submission, extension queries
  and other WebGL hooks, with resource counts.
- RAF interval median/p95/worst and counts of intervals over 50/100 ms.
  Safari may throttle RAF in hidden tabs; interrupted samples say so.

## Limitations and performance decisions

The `gpuTrace=1` hook has measurable instrumentation overhead. Use matched
settings for comparisons; treat uninstrumented `coldBench=1` captures as a
lower-overhead wall-time baseline. The residual `unmeasuredWallMs` is
**not** pure JavaScript CPU time: native/browser code, driver blocking, idle,
and unwrapped GL calls may all contribute. Browser RAF intervals are not GPU
timestamps, nor direct FPS of the tactical game.

Do not change the visual style, shadow-map resolution, fog masking, or
simulation based solely on one device run. Verify warm and cold behavior,
first contact after load, long tails, and unchanged rendered image. If
Safari `getProgramInfoLog` blocking dominates, explore preparation of
the two remaining cold shader variants without eliminating shader error
checks. If high RAF p95 dominates after READY, profile the game/runtime
scheduler separately. This E6.11 stage is measurement-only: no change to
renderer quality or shader compilation semantics.

## Automated acceptance

The dedicated Playwright workflow tests opt-in creation, A2 canonical flag
parsing, cost partitioning, interruption handling, a local downloadable JSON
payload and 90-frame capture in a fresh Chromium SwiftShader browser for
seeds 23/97 with prewarm on/off. It does **not** validate physical Safari
hardware. The workflow and artifact are separately inspectable.
