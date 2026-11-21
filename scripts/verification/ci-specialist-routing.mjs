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

/** A5: original After Action V4/V5 main-target PR path patterns and
 * historical head-branch eligibility. Shared source files may match several
 * suites, but no stage runs for unrelated branches. The dedicated CI refactor
 * branch exercises persistent-3D and V5 live browser paths.
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
const afterActionEscape=part=>part.replace(/[|\\{}()[\]^$+?.]/g,'\\function changedFiles(){');
export function afterActionPathMatches(glob,path){
 const pattern=new RegExp('^'+glob.split('*').map(afterActionEscape).join('[^/]*')+'
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
 const debrief=selectAfterActionSuites(paths,process.env.CI_HEAD_REF||process.env.GITHUB_HEAD_REF||'');
 console.log('Specialist CI routing',JSON.stringify({...result,movement,weapons,debrief}));
 if(args.includes('--github-output')){
  assert.ok(process.env.GITHUB_OUTPUT,'GITHUB_OUTPUT missing');
  appendFileSync(process.env.GITHUB_OUTPUT,[...Object.entries(result.selected),...Object.entries(movement),...Object.entries(weapons),...Object.entries(debrief)]
   .map(([name,enabled])=>name+'='+String(enabled)).join('\n')+'\n');
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])main();
);
 return pattern.test(path);
}
export function selectAfterActionSuites(paths=[],headRef=''){
 const files=[...new Set(paths)].sort();
 return Object.fromEntries(afterActionSpecs.map(spec=>{
  const liveProbe=headRef.startsWith(debriefAcceptancePrefix)&&
   ['debriefV43','debriefV5'].includes(spec.key);
  const eligible=spec.prefixes.some(prefix=>headRef.startsWith(prefix))||liveProbe;
  return [spec.key,eligible&&files.some(file=>spec.paths.some(glob=>
   afterActionPathMatches(glob,file)))];
 }));
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
 console.log('Specialist CI routing',JSON.stringify({...result,movement,weapons,debrief}));
 if(args.includes('--github-output')){
  assert.ok(process.env.GITHUB_OUTPUT,'GITHUB_OUTPUT missing');
  appendFileSync(process.env.GITHUB_OUTPUT,[...Object.entries(result.selected),...Object.entries(movement),...Object.entries(weapons),...Object.entries(debrief)]
   .map(([name,enabled])=>name+'='+String(enabled)).join('\n')+'\n');
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])main();
