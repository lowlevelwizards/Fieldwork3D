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
  ],
  "model-compiler": [
    "src/rendering/fieldwork-model-compiler.ts",
    "src/rendering/breach-site-scene-builder.ts",
    "tests/refactor-e6-20-universal-model-compiler.test.mjs",
    "scripts/verification/e6-20-main-pass-browser.mjs"
  ],
  "assembly-compiler": [
    "src/rendering/breach-site-scene-builder.ts",
    "src/rendering/fieldwork-model-compiler.ts",
    "tests/refactor-e6-21-owner-assembly.test.mjs",
    "scripts/verification/e6-21-main-pass-browser.mjs"
  ],
  "template-cache": [
    "src/rendering/fieldwork-visual-template-library.ts",
    "src/rendering/breach-site-openings-builder.ts",
    "src/rendering/breach-site-scene-builder.ts",
    "src/breach-3d.ts",
    "tests/refactor-e6-22-visual-template-library.test.mjs",
    "tests/refactor-e6-22-template-budget.test.mjs",
    "tests/refactor-e6-22-architecture-template-integration.test.mjs",
    "scripts/verification/e6-22-architectural-template-browser.mjs",
    "scripts/verification/e6-22-architectural-template-node-bench.mjs"
  ],
  "fixture-cache": [
    "src/rendering/breach-fixture-template.ts",
    "src/rendering/breach-site-scene-builder.ts",
    "src/breach-3d.ts",
    "src/rendering/breach-repeated-fixture-batches.ts",
    "src/rendering/fieldwork-visual-template-library.ts",
    "tests/refactor-e6-23-rigid-fixture-template.test.mjs",
    "scripts/verification/e6-23-fixture-template-node-bench.mjs",
    "scripts/verification/e6-23-fixture-template-browser.mjs"
  ],
  "service-cache": [
    "src/rendering/breach-fixture-template.ts",
    "src/rendering/breach-site-scene-builder.ts",
    "src/breach-3d.ts",
    "tests/refactor-e6-24-service-prop-template.test.mjs",
    "scripts/verification/e6-24-service-prop-node-bench.mjs",
    "scripts/verification/e6-24-service-prop-browser.mjs"
  ],
  "arsenal-pool": [
    "src/arsenal/weapon-geometry-pool.ts",
    "src/arsenal/viewport.ts",
    "src/arsenal/thumbnailer.ts",
    "tests/refactor-e6-26-arsenal-geometry-pool.test.mjs",
    "scripts/verification/e6-26-arsenal-browser.mjs"
  ],
  "arsenal-batching": [
    "src/arsenal/weapon-part-batching.ts",
    "src/arsenal/viewport.ts",
    "src/arsenal/thumbnailer.ts",
    "tests/refactor-e6-27-arsenal-part-batching.test.mjs",
    "scripts/verification/e6-27-arsenal-part-browser.mjs"
  ],
  "main-pass": [
    "src/breach-3d.ts",
    "src/breach-runtime-loop.ts",
    "src/rendering/breach-post-ready-attribution.ts",
    "src/rendering/breach-live-shadow-submit-profiler.ts",
    "src/rendering/breach-live-main-pass-profiler.ts",
    "tests/refactor-e6-17-main-pass.test.mjs",
    "tests/refactor-e6-18a-mesh-provenance.test.mjs",
    "scripts/verification/e6-17-main-pass-browser.mjs",
    "scripts/verification/performance-p6-mainpass-budget.mjs",
    "tests/performance-p6-mainpass-budget.test.mjs"
  ],
  "owner-batch": [
    "src/rendering/breach-owner-static-merge.ts",
    "src/rendering/breach-fixture-draw-batching.ts",
    "src/rendering/breach-site-scene-builder.ts",
    "src/rendering/breach-live-main-pass-profiler.ts",
    "src/rendering/breach-post-ready-attribution.ts",
    "tests/refactor-e6-18a-mesh-provenance.test.mjs",
    "tests/refactor-e6-18-owner-static-merge.test.mjs",
    "scripts/verification/e6-18-main-pass-browser.mjs"
  ],
  "transparent-provenance": [
    "src/rendering/breach-live-main-pass-profiler.ts",
    "src/rendering/breach-post-ready-attribution.ts",
    "src/rendering/breach-site-scene-builder.ts",
    "src/rendering/breach-site-openings-builder.ts",
    "src/breach-3d.ts",
    "src/breach-fog-cache.ts",
    "src/breach-fog-mask.ts",
    "src/breach-2d-visibility-renderer.ts",
    "tests/w5-fog-depth-disclosure.test.mjs",
    "scripts/verification/w5-fog-depth-browser.mjs",
    "src/rendering/breach-wall-presentation.ts",
    "src/worldgen/wall-surface-recipe.ts",
    "src/worldgen/wall-story-residue.ts",
    "tests/w6-wall-story-residue.test.mjs",
    "scripts/verification/w6-wall-story-browser.mjs",
    "src/rendering/floor-surface-atlas.ts",
    "src/rendering/floor-wear-raster.ts",
    "src/rendering/fixture-wear-projection.ts",
    "src/worldgen/floor-wear-plan.ts",
    "scripts/verification/w7-floor-fixture-browser.mjs",
    "tests/w7-floor-surface-atlas.test.mjs",
    "src/rendering/wall-surface-atlas.ts",
    "src/rendering/wall-structural-packet.ts",
    "tests/w4-wall-structural-packet.test.mjs",
    "tests/w3-wall-surface-atlas.test.mjs",
    "src/rendering/pixel-materials.ts",
    "src/map-lab-main.ts",
    "map-lab.html",
    "tests/w2-wall-surface-recipe.test.mjs",
    "scripts/verification/w2-wall-audition-browser.mjs",
    "tests/w1-wall-presentation.test.mjs",
    "tests/refactor-e6-19-transparent-role.test.mjs",
    "scripts/verification/e6-19-transparent-role-browser.mjs"
  ],
  "rig-parity": [
    "src/breach-operator-rig.ts",
    "scripts/verification/e6-7-cold-rig-bench.mjs",
    "scripts/verification/e6-7-compare-rig-bench.mjs",
    "tests/refactor-e6-7-rig-geometry.test.mjs"
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
