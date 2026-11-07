# Verification and release contract

Fieldwork's supported game is the tactical Breach entrypoint at `index.html`.
The environmental prototypes and specialist art labs remain accessible. This
verification setup protects current behavior before the larger architecture
refactors. It deliberately does not claim that the historical suite is green.

## Reproducible setup

Use the exact Node version in `.node-version` and npm version in
`package.json#packageManager`. GitHub jobs share `.github/actions/setup`.

```sh
npm ci
npm exec -- playwright install chromium
npm run verify
```

On a new Linux machine, Playwright's official `install --with-deps chromium`
command also installs browser system dependencies. A restricted workspace can
set `PLAYWRIGHT_BROWSERS_PATH` to a writable cache directory. The browser version
comes from the locked Playwright package. Chromium mobile emulation is not a
physical-iPhone performance or visual certification.

`npm ci` must not change tracked files. Commit intentional dependency updates
with their lockfile, run verification, and review both changes. To change the
runtime, update `.node-version`, package engines/packageManager, the shared setup
action's npm pin, and regenerate the lockfile with that toolchain.

## Commands and ownership

| Command | Behavior |
| --- | --- |
| `npm run check:toolchain` | Verify exact Node and npm versions |
| `npm run check` | Strict TypeScript check |
| `npm run test:core` | Strict mandatory current-behavior contracts; no tolerated failures or skips |
| `npm run test:feature -- equipment` | Execute every test in that feature; compare exact existing failure dispositions |
| `npm run test:feature -- --changed BASE_SHA` | Select features from changed paths, including shared dependencies |
| `npm run test:all` / `npm test` | Strict complete suite; returns nonzero for existing failures too |
| `npm run test:baseline` | Complete suite, failing on new, changed, resolved, renamed, missing or expired failure entries |
| `npm run build` | Typecheck, build all Vite entrypoints, and stamp the production output |
| `npm run test:browser` | Test the existing production `dist/` through Vite preview |
| `npm run check:artifact` | Validate entrypoints/assets and write the artifact integrity manifest |
| `node scripts/verification/artifact.mjs --verify` | Verify an already tested artifact without rebuilding it |
| `npm run verify` | Toolchain, core contracts, build, artifact validation and browser journeys |

Suite ownership and selection live in `scripts/verification/suites.mjs`.
Every Node test must match one explicit feature category. New unknown source
paths receive broad coverage. Foundation, package, workflow and tooling changes
select every feature. A filename or branch naming convention never exempts a
PR from mandatory core or browser checks.

The core suite covers fixed time, repeatable simulation, authored plan ownership,
hidden-contact disclosure, physical geometry, route invalidation, equipment,
campaign accounting/idempotence, save decoding, exact restart, replay fidelity,
and the verification infrastructure itself. Test fixtures preserve live geometry
mutations and restore global setup explicitly while that legacy API exists.

The browser journeys execute supported UI against compiled production assets:
mission ordering/pause/restart, portable replay import/playback/IndexedDB reload,
and embedded Studio multi-operator appearance persistence. They use fresh browser
contexts, fixed inputs, readiness assertions, screenshots and failure traces.

## Existing failure triage

`known-failures.json` is an exact-case inventory, not a file-level exclusion.
Every selected case still executes. Each entry has an assertion signature,
observed evidence, owner, category, reproduction command, next action and expiry.
The readable inventory is [failure-inventory.md](failure-inventory.md).

- `source-contract-review`: a source-string or retired-UI assertion needs review
  against the current product behavior. This classification does not prove the
  implementation is correct.
- `visual-contract-review`: a geometry, palette, identity or pose assertion needs
  comparison with the current accepted visual contract.
- `worldgen-contract-review`: a seed, route, furnishing or topology assertion needs
  isolated reproduction and current generation requirements.
- `behavior-review`: a gameplay/equipment assertion needs a focused investigation.

Owners must fix a confirmed defect, repair an invalid fixture, or retire an
obsolete requirement with replacement coverage. The inventory is not approval
to preserve bugs. The current actor-owned-world refactor remains separate work.

To work on one entry, run its recorded single-file command. Remove an entry when
its case passes; the comparison fails on unexpected passes so resolved debt
cannot linger. A changed failure cause, a renamed/removed test, a new failure,
skips/TODOs, or an expired disposition fails comparison. Core tests never consult
this inventory. Updating an expiry requires a documented investigation outcome;
do not regenerate the inventory to make a red build green.

Node test execution is bounded to four child processes with 1 GiB V8 heaps, with a three-minute
per-test timeout. Run heavy builds and the exhaustive suite separately on an
8 GiB workspace. If a worker is killed or a run is incomplete, reproduce the
resource problem; do not record process crashes as accepted assertions.

## CI and releases

Every pull request runs the shared reusable workflow:

1. Strict **Core contracts**.
2. **Affected feature regressions**, with all existing failures visible.
3. **Production build and browser journeys**, followed by artifact hashing.
4. **Required verification**, which succeeds only when all three jobs succeed.

The exhaustive audit runs daily at 08:17 UTC and through manual dispatch. It
publishes case results, a summary, and the slowest cases. Specialist art, video,
prototype and performance workflows are manual research/acceptance tools; their
old PR-branch filters have been superseded by the shared regression checks.
They use the same pinned toolchain and locked dependencies.

The Pages workflow verifies the exact main commit through that same reusable
workflow. It downloads the production artifact from its own verification run,
checks all hashes, commit identity, toolchain and dependency-lock identity, and
uploads that directory to Pages. The deploy job does not rebuild it. Public
`fieldwork-build.json` must subsequently match the uploaded release stamp.
A failed verification prevents deployment.

Configure the repository's main-branch required status to the shared
**Required verification** check after its first successful PR run. Require an
up-to-date branch and preserve the existing review policy. Repository protection
is an account setting; workflow code cannot itself prevent a maintainer from
merging with an administrator override. Pages verification remains enforced by
its explicit dependency regardless of branch-protection settings.

## Reports and investigation

Node reports are in `reports/{core,feature,baseline}/`: `results.ndjson` records
individual outcomes and error stacks; `summary.json` records commit, versions,
counts and durations; `summary.md` is also published to the Actions summary.
Browser failures retain screenshots, traces and an HTML report. Reports are
uploaded even when verification fails. None are committed to source control.

Use the same pinned tools, case and seed to reproduce failures. Repeat only
suspected flaky cases while investigating their cause; do not add automatic
retries or widen numeric tolerances to hide a regression. Performance timings
are diagnostic host measurements and are separate from correctness assertions.
