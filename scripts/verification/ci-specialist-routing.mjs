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
 movementRetail:[
  /^src\/breach-(?:retail-rehearsal-recovery|door-traversal-maneuver|route-transition)\.ts$/,
  /^tests\/release-d3-14d2-retail-rehearsal\.test\.mjs$/,
  /^\.github\/workflows\/d3-14d2-retail-recovery\.yml$/
 ],
 movementDeparture:[
  /^src\/breach-(?:d317c-micro-departure|route-recurrence|motor-collision|route-transition)\.ts$/,
  /^tests\/release-d3-17c-physical-departure\.test\.mjs$/,
  /^\.github\/workflows\/d3-17c-departure\.yml$/
 ],
 movementJoin:[
  /^src\/breach-(?:d317d-door-route-join|door-traversal-maneuver|route-transition)\.ts$/,
  /^tests\/release-d3-17d-door-route-join\.test\.mjs$/,
  /^\.github\/workflows\/d3-17d-door-join\.yml$/
 ],
 movementRecovery:[
  /^src\/breach-[^/]*\.ts$/,
  /^tests\/release-d3-18[^/]*\.test\.mjs$/,
  /^\.github\/workflows\/d3-18-physical-recovery\.yml$/
 ],
 movementRelease:[
  /^src\/breach-[^/]*\.ts$/,
  /^scripts\/audit-r7-squad-execution\.mjs$/,
  /^tests\/release-d3-[^/]*\.test\.mjs$/,
  /^\.github\/workflows\/d3-main-release-checkpoint\.yml$/
 ]
};
export function selectMovementSuites(paths=[]){
 const files=[...new Set(paths)].sort();
 return Object.fromEntries(Object.entries(movementPaths).map(([name,patterns])=>
  [name,files.some(file=>patterns.some(pattern=>pattern.test(file)))]));
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
 console.log('Specialist CI routing',JSON.stringify({...result,movement}));
 if(args.includes('--github-output')){
  assert.ok(process.env.GITHUB_OUTPUT,'GITHUB_OUTPUT missing');
  appendFileSync(process.env.GITHUB_OUTPUT,[...Object.entries(result.selected),...Object.entries(movement)]
   .map(([name,enabled])=>name+'='+String(enabled)).join('\n')+'\n');
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])main();
