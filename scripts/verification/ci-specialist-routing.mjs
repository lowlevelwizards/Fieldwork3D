/** Changed-file owner routing for legacy equipment/Arsenal acceptance.
 * PRs have one CI orchestrator. Preserve full specialist suites when relevant,
 * while unrelated paths no longer create separate workflow runs.
 */
import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const patterns={
 loadout:[
  /^src\/.*(?:equipment|loadout|inventory|magazine|carry|supply|medical|wedge|flashbang|quick.?play|campaign|field-use|mission-reconciliation|breach-main)/i,
  /^tests\/.*(?:equipment|loadout|inventory|magazine|carry|quickplay|campaign|medical|wedge|flash|restrain|dispatch-d4|after-action-v4)/i,
  /^scripts\/.*(?:equipment|loadout|inventory|magazine|carry|quickplay|campaign|medical)/i,
  /^\.github\/workflows\/loadout-prep-l2-critical\.yml$/
 ],
 physical:[
  /^src\/.*(?:physical|equipment|pose|animation|choreograph|interaction|wedge|flash|cuff|restrain|carry|civilian|operator-rig|breach-main)/i,
  /^tests\/.*(?:f6-|equipment|animation-a1|eqa3-|restrain|wedge|flash|cuff|carry|pose)/i,
  /^scripts\/.*(?:f6-|physical|equipment|pose|animation|wedge|flash|cuff|carry)/i,
  /^\.github\/workflows\/f6-physical-equipment-critical\.yml$/
 ],
 arsenal:[
  /^src\/.*(?:arsenal|weapons?\/|weapon|optic|rail|mount|accessor|flashlight|weapon-light|magazine)/i,
  /^tests\/.*(?:arsenal|weapon|optic|rail|mount|accessor|flashlight|weapon-light|magazine|equipment-20-12|equipment-21-05|l1-4)/i,
  /^scripts\/.*(?:arsenal|weapon|optic|rail|mount|accessor|flashlight|weapon-light)/i,
  /^\.github\/workflows\/arsenal-m2-mount-inventory\.yml$/
 ]
};
const universal=/^(?:package(?:-lock)?\.json|tsconfig(?:\.[\w-]+)?\.json|vite\.config\.[\w.]+|\.github\/workflows\/ci\.yml|scripts\/verification\/ci-(?:regression-plan|workflow-contract|workflow-inventory|specialist-routing)\.mjs|tests\/ci-(?:regression-plan|workflow-inventory|reusable-gates|specialist-routing)\.test\.mjs)$/;
const source=/^(?:src|tests|scripts|\.github)\//;

export function selectSpecialists(paths=[]){
 const files=[...new Set(paths)].sort();
 const selected={loadout:false,physical:false,arsenal:false};
 const matched=[];
 for(const file of files){
  const owners=Object.entries(patterns).filter(([,checks])=>checks.some(pattern=>pattern.test(file)))
   .map(([owner])=>owner);
  if(universal.test(file)||source.test(file)&&owners.length===0){
   for(const owner of Object.keys(selected))selected[owner]=true;
   matched.push({file,owners:['loadout','physical','arsenal'],fallback:true});
   continue;
  }
  for(const owner of owners)selected[owner]=true;
  if(owners.length)matched.push({file,owners});
 }
 return {files,selected,matched};
}

/** Exact legacy D3 pull_request path ownership, retained while the five
 * physical cohorts move under one CI workflow run. The patterns mirror the
 * former path filters; manual forensic workflows remain available.
 */
const movementPaths={
 movementRecovery:[
  /^src\/breach-[^/]*\.ts$/,
  /^tests\/release-d3-18[^/]*\.test\.mjs$/,
  /^\.github\/workflows\/d3-18-physical-recovery\.yml$/
 ],
 movementRelease:[
  /^src\/breach-[^/]*\.ts$/,
  /^scripts\/audit-r7-squad-execution\.mjs$/,
  /^scripts\/verification\/ci-d3-physical-truth\.mjs$/,
  /^scripts\/lib\/d3-(?:17a-loop-incidents|30-physical-gate)\.mjs$/,
  /^tests\/release-d3-[^/]*\.test\.mjs$/,
  /^tests\/ci-d3-physical-truth\.test\.mjs$/,
  /^\.github\/workflows\/d3-(?:14d2-retail-recovery|17c-departure|17d-door-join|18-physical-recovery|main-release-checkpoint)\.yml$/
 ]
};
export function selectMovementSuites(paths=[]){
 const files=[...new Set(paths)].sort();
 return Object.fromEntries(Object.entries(movementPaths).map(([name,patterns])=>
  [name,files.some(file=>patterns.some(pattern=>pattern.test(file)))]));
}

/** A4: preserve original M3.0 production geometry and Glock-family art PR
 * path ownership without creating separate top-level main PR workflow runs.
 * These routes are additive to M2 equipment/weapon verification: no tests
 * or real-WebGL visual acceptance are removed.
 */
const weaponVisualPaths={
 arsenalM30:[
  /^src\/breach-weapon-geometry\.ts$/,
  /^src\/weapons\/geometry\//,
  /^src\/arsenal\//,
  /^scripts\/audit-weapon-production-m30\.mjs$/,
  /^scripts\/smoke-arsenal-(?:m30|r870-p07)[^/]*\.mjs$/,
  /^arsenal-m30[^/]*\.html$/,
  /^src\/arsenal-m30[^/]*\.ts$/,
  /^src\/arsenal-r870-p07-capture\.ts$/,
  /^arsenal-r870-p07-capture\.html$/,
  /^tests\/arsenal-m30(?:c4|c5)?-[^/]*\.test\.mjs$/,
  /^tests\/weapon-r870-p(?:08|09|12|13|14|15|16)-[^/]*\.test\.mjs$/,
  /^\.github\/workflows\/arsenal-m30\.yml$/
 ],
 glockArt:[
  /^src\/weapons\/geometry\/(?:glock-family-silhouettes|beretta-m9-silhouettes|sidearm-preview)\.ts$/,
  /^src\/arsenal\/(?:glock-gallery|gallery-main|preview-job-queue|gallery-browser-controls|gallery-chrome|m9-inspector)\.ts$/,
  /^src\/arsenal\/arsenal\.css$/,
  /^src\/(?:secondary-equipment|equipment-loadouts)\.ts$/,
  /^tests\/(?:weapon-glock-family-art|weapon-beretta-m9-art|secondary-s1-s3-foundation|consolidation-p(?:9-arsenal-preview|10-arsenal-controls|11-arsenal-chrome)|performance-p3-preview-hotpaths)\.test\.mjs$/,
  /^scripts\/smoke-consolidation-p9-arsenal\.mjs$/,
  /^\.github\/workflows\/glock-family-art\.yml$/
 ]
};
const weaponVisualInfrastructure=/^(?:package(?:-lock)?\.json|vite\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json|\.github\/workflows\/ci\.yml|scripts\/verification\/ci-(?:specialist-routing|workflow-contract)\.mjs|tests\/ci-weapon-visual-routing\.test\.mjs)$/;
export function selectWeaponVisualSuites(paths=[]){
 const files=[...new Set(paths)].sort();
 return Object.fromEntries(Object.entries(weaponVisualPaths).map(([name,patterns])=>
  [name,files.some(file=>weaponVisualInfrastructure.test(file)||
   patterns.some(pattern=>pattern.test(file)))]));
}

/** A5: exact original path globs and stage eligibility. No independent
 * per-stage main PR Actions runs, and no broadened general PR browser tests.
 */
export const afterActionSpecs=[
 {
  "key": "debriefV41",
  "workflow": "after-action-v4-stage1.yml",
  "prefixes": [
   "feature/after-action-v4-"
  ],
  "paths": [
   ".github/workflows/after-action-v4-stage1.yml",
   "src/breach-app-flow.ts",
   "src/breach-main.ts",
   "src/breach-after-action-replay-navigation.ts",
   "src/ui/breach-after-action-*.ts",
   "src/breach-style.css",
   "scripts/smoke-after-action-v3.mjs",
   "tests/after-action-v4-stage1-navigation.test.mjs"
  ]
 },
 {
  "key": "debriefV42",
  "workflow": "after-action-v4-stage2.yml",
  "prefixes": [
   "feature/after-action-v4-stage2-"
  ],
  "paths": [
   ".github/workflows/after-action-v4-stage2.yml",
   "index.html",
   "src/breach-style.css",
   "src/breach-after-action-report.ts",
   "src/ui/breach-after-action-*.ts",
   "src/ui/breach-mission-debrief.ts",
   "scripts/smoke-after-action-v3.mjs",
   "tests/after-action-v4-stage2-hierarchy.test.mjs"
  ]
 },
 {
  "key": "debriefV43",
  "workflow": "after-action-v4-stage3.yml",
  "prefixes": [
   "feature/after-action-v4-stage3-"
  ],
  "paths": [
   ".github/workflows/after-action-v4-stage3.yml",
   "src/ui/breach-after-action-*.ts",
   "src/ui/breach-mission-screens.ts",
   "src/breach-main.ts",
   "src/breach-style.css",
   "scripts/smoke-after-action-v4-stage3.mjs",
   "tests/after-action-v4-stage3-persistent-models.test.mjs"
  ]
 },
 {
  "key": "debriefV44",
  "workflow": "after-action-v4-stage4.yml",
  "prefixes": [
   "feature/after-action-v4-stage4-"
  ],
  "paths": [
   ".github/workflows/after-action-v4-stage4.yml",
   "src/breach-hit-anatomy.ts",
   "src/breach-forensic-evidence.ts",
   "src/breach-shot-resolution.ts",
   "src/breach-game.ts",
   "src/breach-replay-archive.ts",
   "src/breach-replay-export-json.ts",
   "src/breach-after-action-report.ts",
   "src/ui/breach-after-action-*.ts",
   "src/ui/breach-hit-paper-doll.ts",
   "src/breach-style.css",
   "scripts/smoke-after-action-v4-stage4.mjs",
   "tests/after-action-v4-stage4-forensic.test.mjs"
  ]
 },
 {
  "key": "debriefV45",
  "workflow": "after-action-v4-stage5.yml",
  "prefixes": [
   "feature/after-action-v4-stage5-"
  ],
  "paths": [
   ".github/workflows/after-action-v4-stage5.yml",
   "index.html",
   "src/breach-style.css",
   "src/breach-after-action-timeline.ts",
   "src/ui/breach-after-action-*.ts",
   "src/ui/breach-mission-debrief.ts",
   "scripts/smoke-after-action-v4-stage5.mjs",
   "tests/after-action-v4-stage5-timeline.test.mjs"
  ]
 },
 {
  "key": "debriefV5",
  "workflow": "after-action-v5-critical.yml",
  "prefixes": [
   "feat/after-action-v5-",
   "feature/after-action-v6-",
   "fix/after-action-v6-mobile-"
  ],
  "paths": [
   ".github/workflows/after-action-v5-critical.yml",
   "index.html",
   "src/breach-style.css",
   "src/breach-after-action-*.ts",
   "src/breach-operations.ts",
   "src/breach-mission-reporting.ts",
   "src/ui/breach-after-action-*.ts",
   "scripts/smoke-after-action-v5.mjs",
   "tests/after-action-v5-*.test.mjs",
   "tests/after-action-v6-*.test.mjs"
  ]
 }
];
const debriefAcceptancePrefix='refactor/ci-after-action-';
const afterActionEscape=part=>part.replace(/[|\\{}()[\]^$+?.]/g,'\\$&');
export function afterActionPathMatches(glob,path){
 const pattern=new RegExp('^'+glob.split('*').map(afterActionEscape).join('[^/]*')+'$');
 return pattern.test(path);
}
export function selectAfterActionSuites(paths=[],headRef=''){
 const files=[...new Set(paths)].sort();
 return Object.fromEntries(afterActionSpecs.map(spec=>{
  const probe=headRef.startsWith(debriefAcceptancePrefix)&&
   ['debriefV43','debriefV5'].includes(spec.key);
  const eligible=spec.prefixes.some(prefix=>headRef.startsWith(prefix))||probe;
  return [spec.key,eligible&&files.some(file=>spec.paths.some(glob=>
   afterActionPathMatches(glob,file)))];
 }));
}

/** A6a: exact replay R2 UI / R4.3b Bodycam / R4.4 entry path and
 * branch ownership. Existing current replay director checks remain separate.
 */
export const replayMobileSpecs=[
 {
  "key": "replayR2",
  "workflow": "replay-r2-ui-smoke.yml",
  "paths": [
   "index.html",
   "src/breach-style.css",
   "src/breach-main.ts",
   "src/breach-replay-cinematic-director.ts",
   "src/breach-replay-director-intent.ts",
   "src/breach-replay-director-events.ts",
   "src/breach-replay-director-shots.ts",
   "src/breach-replay-director-scheduler.ts",
   "tests/replay-r7-director.test.mjs",
   "src/breach-replay-speed.ts",
   "src/breach-camera-occlusion.ts",
   "tests/replay-r7-speed.test.mjs",
   "tests/replay-r7-cutaway.test.mjs",
   "src/breach-3d.ts",
   "tests/replay-r5-direct-viewer.test.mjs",
   "scripts/smoke-replay-r2-ui.mjs",
   ".github/workflows/replay-r2-ui-smoke.yml"
  ],
  "prefixes": [
   "feature/replay-r2-mobile-ui-",
   "feature/replay-r3-",
   "feature/replay-r41-",
   "feature/replay-r42-",
   "feature/replay-r42b-",
   "feature/replay-r42c-",
   "feature/replay-ux-v2-",
   "feature/replay-r5-",
   "feature/replay-r6-",
   "feature/replay-r7-"
  ]
 },
 {
  "key": "replayR43b",
  "workflow": "replay-r43b-bodycam-ui.yml",
  "paths": [
   "index.html",
   "src/breach-main.ts",
   "src/breach-style.css",
   "src/breach-replay-bodycam-controls.ts",
   "src/breach-replay-bodycam.ts",
   "src/breach-replay-personal-visibility.ts",
   "src/breach-replay-window-knowledge.ts",
   "src/breach-replay-video.ts",
   "src/breach-replay-archive.ts",
   "src/breach-replay.ts",
   "src/breach-3d.ts",
   "scripts/smoke-replay-r43b-video.mjs",
   "scripts/smoke-replay-r43b-bodycam-ui.mjs",
   "scripts/smoke-replay-r43b-moving-scene.mjs",
   "scripts/smoke-replay-r43b-indoor-entry.mjs",
   ".github/workflows/replay-r43b-bodycam-ui.yml"
  ],
  "prefixes": [
   "feature/replay-r43b-"
  ]
 },
 {
  "key": "replayR44",
  "workflow": "replay-r44-squad-entry.yml",
  "paths": [
   "index.html",
   "src/breach-main.ts",
   "src/breach-style.css",
   "src/breach-replay-squad-entry.ts",
   "tests/replay-r44-squad-entry.test.mjs",
   "tests/replay-r44-real-session.test.mjs",
   "scripts/smoke-replay-r44-entry-mobile.mjs",
   ".github/workflows/replay-r44-squad-entry.yml"
  ],
  "prefixes": [
   "feature/replay-r44-"
  ]
 }
];
const replayMobileProbe='refactor/ci-replay-mobile-';
export function selectReplayMobileSuites(paths=[],headRef=''){
 const files=[...new Set(paths)].sort();
 return Object.fromEntries(replayMobileSpecs.map(spec=>{
  const probe=headRef.startsWith(replayMobileProbe)&&
   ['replayR43b','replayR44'].includes(spec.key);
  const eligible=probe||spec.prefixes.some(prefix=>headRef.startsWith(prefix));
  return [spec.key,eligible&&files.some(file=>spec.paths.some(glob=>
   afterActionPathMatches(glob,file)))];
 }));
}

/** A6b: legacy replay video, portable library and original Bodycam QA.
 * Exact old PR path globs and historical feature heads remain authoritative.
 */
export const replayLegacySpecs=[
 {
  "key": "replayR2Video",
  "workflow": "replay-r2-video-smoke.yml",
  "paths": [
   "src/breach-replay-video.ts",
   "src/breach-replay-audio.ts",
   "src/breach-main.ts",
   "index.html",
   "scripts/smoke-replay-r2-video.mjs",
   ".github/workflows/replay-r2-video-smoke.yml"
  ],
  "prefixes": [
   "feature/replay-r2-audio-"
  ]
 },
 {
  "key": "replayR3Library",
  "workflow": "replay-r3-library-smoke.yml",
  "paths": [
   "src/breach-replay-archive.ts",
   "src/breach-replay-motion.ts",
   "src/breach-replay-library.ts",
   "src/breach-replay-portable.ts",
   "src/breach-main.ts",
   "index.html",
   "scripts/smoke-replay-r3-library.mjs",
   ".github/workflows/replay-r3-library-smoke.yml"
  ],
  "prefixes": [
   "feature/replay-r3-library-",
   "feature/replay-r3-portable-",
   "feature/replay-ux-v2-release-c-"
  ]
 },
 {
  "key": "replayR43Visual",
  "workflow": "replay-r43-bodycam-qa.yml",
  "paths": [
   "src/breach-replay-bodycam.ts",
   "src/breach-3d.ts",
   "src/breach-main.ts",
   "src/breach-operator-rig.ts",
   "scripts/smoke-replay-r43-bodycam.mjs",
   ".github/workflows/replay-r43-bodycam-qa.yml"
  ],
  "prefixes": [
   "feature/replay-r43-"
  ]
 }
];
export function selectReplayLegacySuites(paths=[],headRef=''){
 const files=[...new Set(paths)].sort();
 return Object.fromEntries(replayLegacySpecs.map(spec=>{
  const eligible=headRef.startsWith('refactor/ci-replay-archive-visual-')||
    spec.prefixes.some(prefix=>headRef.startsWith(prefix));
  return [spec.key,eligible&&files.some(file=>spec.paths.some(glob=>
   afterActionPathMatches(glob,file)))];
 }));
}

/** A6c: replay director reset is branch-agnostic. Unlike the legacy
 * replay visual cohorts, every relevant main PR must retain the original
 * deterministic shoulder and replay-controller verification.
 */
export const replayDirectorResetPaths=[
 "src/breach-replay-director-reset.ts",
 "src/breach-replay-*-controller.ts",
 "src/breach-main.ts",
 "src/breach-replay-camera-controller.ts",
 "src/breach-replay-director-controller.ts",
 "src/breach-replay-director-subject-timeline.ts",
 "index.html",
 "tests/replay-director-cam.test.mjs",
 "tests/replay-director-reset.test.mjs",
 "tests/replay-*-controller-20261109.test.mjs",
 "tests/replay-lifecycle-controller-20261109.test.mjs",
 ".github/workflows/replay-director-reset.yml"
];
export function selectReplayDirectorReset(paths=[]){
 const files=[...new Set(paths)].sort();
 return files.some(file=>replayDirectorResetPaths.some(glob=>
  afterActionPathMatches(glob,file)));
}

/** A7a: original R7 and D2/D3/D5 main-PR path contracts.
 * Retain source-owned live motor audits and original feature push/manual use.
 * Changing the router or its contract runs all lanes fail-closed.
 */
export const movementDoorSpecs=[
  {
    "key": "release7",
    "workflow": "release7-critical.yml",
    "paths": [
      "scripts/audit-r7-squad-execution.mjs",
      "scripts/audit-squad-entry-b.mjs",
      "src/breach-passage.ts",
      "src/breach-door.ts",
      "src/breach-door-leaf-bypass.ts",
      "src/breach-door-pressure-arbitration.ts",
      "src/breach-motor-door.ts",
      "src/breach-motor-collision.ts",
      "src/breach-motor-route.ts",
      "tests/release7-*.test.mjs",
      "src/breach-game.ts",
      "src/breach-entry-lanes.ts",
      "tests/squad-entry-b-*.test.mjs",
      ".github/workflows/release7-critical.yml"
    ]
  },
  {
    "key": "doorD5",
    "workflow": "door-traversal-d5.yml",
    "paths": [
      "src/breach-door.ts",
      "src/breach-motor-door.ts",
      "src/breach-motor-route.ts",
      "src/breach-motor-collision.ts",
      "src/breach-door-pressure-frame.ts",
      "tests/door-traversal-d5-motor.test.mjs",
      ".github/workflows/door-traversal-d5.yml"
    ]
  },
  {
    "key": "doorD2D3",
    "workflow": "door-traversal-d2-d3.yml",
    "paths": [
      "src/breach-door-traversal-maneuver.ts",
      "src/breach-door-traversal-episode.ts",
      "src/breach-door-pressure-frame.ts",
      "src/breach-door.ts",
      "src/breach-motor-collision.ts",
      "src/breach-motor-route.ts",
      "tests/door-traversal-d2.test.mjs",
      "tests/door-traversal-d3.test.mjs",
      ".github/workflows/door-traversal-d2-d3.yml"
    ]
  },
  {
    "key": "passageQ5",
    "workflow": "passage-q5-matrix.yml",
    "paths": [
      "src/breach-door-test-cases.ts",
      "src/breach-door.ts",
      "src/breach-door-kick-cover.ts",
      "src/breach-order-door.ts",
      "src/breach-squeeze-gate.ts",
      "src/breach-motor-collision.ts",
      "src/worldgen/doorway-clutter-repair.ts",
      "src/breach-2d-route-overlays.ts",
      "src/breach-2d-projected-overlays.ts",
      "src/ui/passage-rank-badges.ts",
      "src/breach-passage-visual-ranks.ts",
      "tests/passage-q5-live-blockers.test.mjs",
      "src/door-range-q5-benchmark.ts",
      "src/door-test-range-main.ts",
      "door-test-range.html",
      "tests/passage-q5-approaches.test.mjs",
      "scripts/audit-passage-q5.mjs",
      ".github/workflows/passage-q5-matrix.yml"
    ]
  },
  {
    "key": "performanceP28",
    "workflow": "performance-p2-8-critical.yml",
    "paths": [
      "src/breach-navigation.ts",
      "src/breach-world-context.ts",
      "src/breach-motor-collision.ts",
      "src/breach-actor-motor.ts",
      "tests/performance-p2-8-sweep-broadphase.test.mjs",
      "tests/performance-p2-8-cover-los.test.mjs",
      ".github/workflows/performance-p2-8-critical.yml"
    ]
  },
  {
    "key": "recovery17e",
    "workflow": "d3-17e-recovery.yml",
    "paths": [
      "src/breach-recovery-proposal-gate.ts",
      "src/breach-cold-route-cache.ts",
      "src/breach-motor-collision.ts",
      "src/breach-motor-route.ts",
      "src/breach-execution-state.ts",
      "src/breach-physical-leaf-rejoin.ts",
      "src/breach-d336-stale-open-leaf.ts",
      "src/breach-d337-entry-service-landing.ts",
      "scripts/report-d3-15b4-blind22.mjs",
      "scripts/audit-r7-squad-execution.mjs",
      "tests/release-d3-17e-recovery-accounting.test.mjs",
      ".github/workflows/d3-17e-recovery.yml",
      "scripts/verification/ci-a8-physical-acceptance.mjs",
      "scripts/verification/ci-lock-aware-physical-acceptance.mjs",
      "scripts/verification/ci-physical-cohort-provenance.mjs",
      "scripts/verification/ci-d3-physical-truth.mjs",
      "tests/ci-a8-physical-acceptance.test.mjs"
    ]
  },
  {
    "key": "physical25",
    "workflow": "d3-25-physical-acceptance.yml",
    "paths": [
      "src/breach-order-wait.ts",
      "src/breach-motor-route.ts",
      "src/breach-d325-escape-join.ts",
      "src/breach-d336-stale-open-leaf.ts",
      "src/breach-d337-entry-service-landing.ts",
      "scripts/audit-r7-squad-execution.mjs",
      "tests/release-d3-25*.test.mjs",
      ".github/workflows/d3-25-physical-acceptance.yml",
      "scripts/verification/ci-a8-physical-acceptance.mjs",
      "scripts/verification/ci-lock-aware-physical-acceptance.mjs",
      "scripts/verification/ci-physical-cohort-provenance.mjs",
      "scripts/verification/ci-d3-physical-truth.mjs",
      "tests/ci-a8-physical-acceptance.test.mjs"
    ]
  },
  {
    "key": "coordinated15",
    "workflow": "d3-15-coordinated-release.yml",
    "paths": [
      "src/breach-motor-door.ts",
      "src/breach-order-movement.ts",
      "src/breach-entry-coordination.ts",
      "src/breach-order-wait.ts",
      "src/breach-motor-collision.ts",
      "src/breach-stack-micro-corner.ts",
      "tests/release-d3-15a2-explicit-door-clock.test.mjs",
      ".github/workflows/d3-15-coordinated-release.yml",
      "src/breach-actor-motor.ts",
      "src/breach-locomotion-clearance.ts",
      "src/breach-motor-route.ts",
      "src/breach-generated-entry-stillness.ts",
      "src/breach-static-cover-release.ts",
      "tests/release-d3-40-townhouse-porch-cover-release.test.mjs",
      "scripts/audit-r7-squad-execution.mjs",
      "scripts/verification/ci-a8-physical-acceptance.mjs",
      "scripts/verification/ci-physical-cohort-provenance.mjs",
      "scripts/verification/ci-lock-aware-physical-acceptance.mjs"
    ]
  }
];
const movementDoorInfrastructure=/^(?:\.github\/workflows\/(?:ci|movement-door-acceptance)\.yml|scripts\/verification\/ci-(?:specialist-routing|workflow-contract)\.mjs|tests\/ci-movement-door-routing\.test\.mjs)$/;
export function selectMovementDoorSuites(paths=[]){
 const files=[...new Set(paths)].sort();
 const infrastructure=files.some(file=>movementDoorInfrastructure.test(file));
 return Object.fromEntries(movementDoorSpecs.map(spec=>[
  spec.key,infrastructure||files.some(file=>spec.paths.some(glob=>afterActionPathMatches(glob,file)))
 ]));
}

function changedFiles(){
 const base=process.env.CI_BASE_REF;
 assert.ok(base&&/^[\w./-]+$/.test(base),'Missing or unsafe PR base');
 const result=spawnSync('git',['diff','--name-only','--diff-filter=ACMRTD',
  'origin/'+base+'...HEAD'],{encoding:'utf8'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Cannot classify PR diff: '+result.stderr);
 return result.stdout.trim().split('\n').filter(Boolean);
}

function main(){
 const args=process.argv.slice(2);
 const at=args.indexOf('--files');
 const paths=at<0?changedFiles():args.slice(at+1).filter(x=>!x.startsWith('--'));
 const result=selectSpecialists(paths);
 const movement=selectMovementSuites(paths);
 const weapons=selectWeaponVisualSuites(paths);
 const debrief=selectAfterActionSuites(paths,process.env.CI_HEAD_REF||process.env.GITHUB_HEAD_REF||'');
 const replay=selectReplayMobileSuites(paths,process.env.CI_HEAD_REF||process.env.GITHUB_HEAD_REF||'');
 const replayLegacy=selectReplayLegacySuites(paths,process.env.CI_HEAD_REF||process.env.GITHUB_HEAD_REF||'');
 const replayDirectorReset=selectReplayDirectorReset(paths);
 const replayMobileAny=[...Object.values(replay),...Object.values(replayLegacy),replayDirectorReset].some(Boolean);
 const movementDoor=selectMovementDoorSuites(paths);
 const movementDoorAny=Object.values(movementDoor).some(Boolean);
 const replayAll={...replay,...replayLegacy,replayDirectorReset};
 console.log('Specialist CI routing',JSON.stringify({...result,movement,weapons,debrief,replay,replayLegacy,replayDirectorReset}));
 if(args.includes('--github-output')){
  assert.ok(process.env.GITHUB_OUTPUT,'GITHUB_OUTPUT missing');
  appendFileSync(process.env.GITHUB_OUTPUT,[...Object.entries(result.selected),...Object.entries(movement),...Object.entries(weapons),...Object.entries(debrief),['replayMobileAny',replayMobileAny],['replayMobileJSON',JSON.stringify(replayAll)],['movementDoorAny',movementDoorAny],['movementDoorJSON',JSON.stringify(movementDoor)]]
   .map(([name,enabled])=>name+'='+String(enabled)).join('\n')+'\n');
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])main();
