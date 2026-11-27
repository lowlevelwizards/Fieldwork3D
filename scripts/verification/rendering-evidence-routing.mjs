// Exact paths from the retired E6 specialist workflows. Keep lane selection independent of branch names.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export const lanes = {
  "cold-renderer": [
    "src/rendering/breach-cold-renderer-trace.ts",
    "src/breach-3d.ts",
    "src/breach-quickplay-controller.ts",
    "scripts/verification/e6-8-cold-renderer-browser.mjs",
    "tests/refactor-e6-8-cold-renderer-attribution.test.mjs"
  ],
  "cold-cpu": [
    "src/breach-quickplay-controller.ts",
    "src/breach-boot-config.ts",
    "src/rendering/breach-cold-renderer-trace.ts",
    "scripts/verification/e6-8-cold-renderer-browser.mjs",
    "scripts/verification/e6-9-cold-cpu-analysis.mjs",
    "scripts/verification/e6-9-cold-cpu-browser.mjs",
    "tests/refactor-e6-9-cold-cpu-profile.test.mjs"
  ],
  "preflight": [
    "src/breach-3d.ts",
    "src/breach-main.ts",
    "src/breach-boot-config.ts",
    "src/breach-quickplay-controller.ts",
    "src/rendering/breach-cold-renderer-trace.ts",
    "tests/refactor-e6-10-preflight.test.mjs",
    "scripts/verification/e6-10-preflight-browser.mjs"
  ],
  "device-benchmark": [
    "src/breach-boot-config.ts",
    "src/breach-quickplay-controller.ts",
    "src/rendering/breach-cold-device-evidence.ts",
    "tests/refactor-e6-11-device-cold-evidence.test.mjs",
    "scripts/verification/e6-11-device-benchmark-browser.mjs"
  ],
  "runtime-attribution": [
    "src/breach-runtime-loop.ts",
    "src/breach-main.ts",
    "src/breach-quickplay-controller.ts",
    "src/rendering/breach-cold-device-evidence.ts",
    "src/rendering/breach-post-ready-attribution.ts",
    "tests/refactor-e6-12-post-ready-attribution.test.mjs",
    "scripts/verification/e6-12-post-ready-browser.mjs"
  ],
  "briefing-idle": [
    "src/breach-runtime-loop.ts",
    "src/breach-main.ts",
    "src/breach-boot-config.ts",
    "src/rendering/breach-briefing-idle-policy.ts",
    "tests/refactor-e6-13-briefing-idle.test.mjs",
    "scripts/verification/e6-13-briefing-idle-browser.mjs"
  ],
  "first-live": [
    "src/breach-quickplay-controller.ts",
    "src/rendering/breach-post-ready-attribution.ts",
    "src/rendering/breach-cold-device-evidence.ts",
    "tests/refactor-e6-14-live-execution-cold.test.mjs",
    "scripts/verification/e6-14-live-first-browser.mjs"
  ],
  "live-scene": [
    "src/breach-3d.ts",
    "src/breach-runtime-loop.ts",
    "src/rendering/breach-post-ready-attribution.ts",
    "tests/refactor-e6-15-live-scene-attribution.test.mjs",
    "scripts/verification/e6-15-scene-phase-browser.mjs"
  ],
  "shadow-submit": [
    "src/breach-3d.ts",
    "src/breach-runtime-loop.ts",
    "src/rendering/breach-post-ready-attribution.ts",
    "src/rendering/breach-live-shadow-submit-profiler.ts",
    "tests/refactor-e6-16-shadow-submission.test.mjs",
    "scripts/verification/e6-16-shadow-submit-browser.mjs"
  ]
};
export const infrastructure = [".github/workflows/rendering-performance-evidence.yml","scripts/verification/rendering-evidence-routing.mjs","tests/ci-rendering-evidence-routing.test.mjs"];
export function selectLanes(paths, manual = '') {
  if (manual && manual !== 'all' && !Object.hasOwn(lanes,manual)) throw new Error('Unknown rendering evidence lane: '+manual);
  const changed = new Set(paths);
  const all = manual === 'all' || infrastructure.some(p=>changed.has(p));
  return Object.keys(lanes).filter(id=>all || manual === id || lanes[id].some(p=>changed.has(p)));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manual = process.env.EVIDENCE_LANE || '';
  const paths = manual ? [] : execFileSync('git',['diff','--name-only','-z',process.env.BASE_SHA+'...'+process.env.HEAD_SHA],{encoding:'utf8'}).split('\0').filter(Boolean);
  const selected = new Set(selectLanes(paths,manual));
  for (const id of Object.keys(lanes)) console.log(id+'='+selected.has(id));
}
