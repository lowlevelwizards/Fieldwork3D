// Stage-specific animation evidence, selected by original changed-file ownership.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const lanes={
  "a0-a1": [
    "src/breach-animation-quality.ts",
    "src/breach-animation-choreography.ts",
    "src/operator-workbench-choreography.ts",
    "src/breach-operator-animation-controller.ts",
    "src/operator-pose-workbench-ui.ts",
    "pose-workbench.html",
    "tests/animation-a0-baseline.test.mjs",
    "tests/animation-a1-choreography.test.mjs",
    "scripts/audit-animation-a0.mjs"
  ],
  "a3-baseline": [
    "a3-physicality-lab.html",
    "src/a3-physicality-*",
    "tests/animation-a3-0-*",
    "scripts/audit-animation-a3-0.mjs",
    "scripts/smoke-animation-a3-0.mjs",
    "docs/animation-a3-0-*",
    "vite.config.ts"
  ],
  "a3-safety": [
    "src/breach-friendly-safety-volume.ts",
    "src/breach-fire-safety.ts",
    "src/breach-weapon-clearance.ts",
    "src/breach-firing-pipeline.ts",
    "src/breach-shot-resolution.ts",
    "src/breach-defense.ts",
    "src/breach-enemy-decision-controller.ts",
    "src/breach-3d.ts",
    "src/a3-physicality-*",
    "a3-physicality-lab.html",
    "tests/animation-a3-*",
    "scripts/audit-animation-a3-1.mjs",
    "scripts/smoke-animation-a3-0.mjs",
    "docs/animation-a3-1-*"
  ],
  "a3-fire-footwork": [
    "src/breach-physical-micro-aim.ts",
    "src/breach-contextual-crouch.ts",
    "src/breach-combat-reactions.ts",
    "src/breach-actor-motor.ts",
    "src/breach-motor-route.ts",
    "src/breach-firing-pipeline.ts",
    "src/breach-shot-resolution.ts",
    "src/breach-muzzle.ts",
    "src/breach-weapon-pose.ts",
    "src/breach-game.ts",
    "src/breach-3d.ts",
    "src/breach-replay.ts",
    "src/breach-operator-animation-*",
    "src/breach-actor-initial-state.ts",
    "src/breach-tactical-control-commands.ts",
    "src/breach-order-movement.ts",
    "src/a3-physicality-*",
    "a3-physicality-lab.html",
    "tests/animation-a3-*",
    "tests/breach-two-sided-fire-recovery.test.mjs",
    "docs/animation-a3-*"
  ],
  "a3-contacts": [
    "src/breach-physical-contact-anchor.ts",
    "src/breach-pose-contacts.ts",
    "src/breach-pose-action-state.ts",
    "src/breach-operator-animation-contract.ts",
    "src/breach-operator-animation-controller.ts",
    "src/breach-3d.ts",
    "src/a3-physicality-*",
    "tests/animation-a3-5-*",
    "docs/animation-a3-5-*"
  ],
  "a3-braces": [
    "src/breach-contextual-support-contact.ts",
    "src/breach-game.ts",
    "src/breach-actor-initial-state.ts",
    "src/breach-replay.ts",
    "src/breach-3d.ts",
    "src/breach-operator-animation-controller.ts",
    "src/a3-physicality-*",
    "a3-physicality-lab.html",
    "tests/animation-a3-6-7-*",
    "tests/animation-a3-0-physicality.test.mjs",
    "docs/animation-a3-6-7-*"
  ],
  "a3-pivot-kick": [
    "src/breach-pivot-episode.ts",
    "src/breach-lockpick-contact.ts",
    "src/breach-kick-foot-choice.ts",
    "src/breach-operator-lower-body.ts",
    "src/breach-replay.ts",
    "src/breach-order-lifecycle.ts",
    "src/breach-order-movement.ts",
    "src/breach-order-executor.ts",
    "src/breach-enemy-decision-controller.ts",
    "src/breach-contextual-support-contact.ts",
    "src/breach-physical-contact-anchor.ts",
    "src/breach-pose-action-state.ts",
    "src/breach-cover-height.ts",
    "src/breach-firing-pipeline.ts",
    "tests/animation-a3-8-*",
    "tests/animation-a3-9-*",
    "docs/animation-a3-8-9-*"
  ],
  "a3-finish": [
    "src/breach-cover-stance.ts",
    "src/breach-cover-height.ts",
    "src/breach-game.ts",
    "src/breach-replay.ts",
    "src/breach-3d.ts",
    "src/breach-muzzle.ts",
    "src/breach-combat.ts",
    "src/breach-shot-resolution.ts",
    "src/breach-firing-pipeline.ts",
    "src/breach-friendly-safety-volume.ts",
    "src/breach-contextual-support-contact.ts",
    "src/a3-physicality-probe.ts",
    "src/a3-physicality-lab-main.ts",
    "a3-physicality-lab.html",
    "src/breach-operator-animation-controller.ts",
    "src/breach-door-actions.ts",
    "tests/animation-a3-9-*"
  ]
};
export const infrastructure=[".github/workflows/animation-physicality-evidence.yml","scripts/verification/animation-evidence-routing.mjs","tests/ci-animation-evidence-routing.test.mjs"];
const escape=part=>part.replace(/[|\\{}()[\]^$+?.]/g,'\\$&');
export function matches(pattern,path){
 return new RegExp('^'+pattern.split('*').map(escape).join('[^/]*')+'$').test(path);
}
export function selectLanes(paths=[],manual=''){
 if(manual&&manual!=='all'&&!Object.hasOwn(lanes,manual))throw Error('Unknown animation evidence lane: '+manual);
 if(manual)return manual==='all'?Object.keys(lanes):[manual];
 const all=paths.some(p=>infrastructure.includes(p));
 return Object.keys(lanes).filter(id=>all||paths.some(p=>lanes[id].some(glob=>matches(glob,p))));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const manual=process.env.EVIDENCE_LANE||'';
 const paths=manual?[]:execFileSync('git',['diff','--name-only','-z',process.env.BASE_SHA+'...'+process.env.HEAD_SHA],{encoding:'utf8'}).split('\0').filter(Boolean);
 const selected=new Set(selectLanes(paths,manual));
 for(const id of Object.keys(lanes))console.log(id+'='+selected.has(id));
}
