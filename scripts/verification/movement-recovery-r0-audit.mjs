/**
 * R0 READ-ONLY movement recovery writer inventory; never executes motor.
 * node scripts/verification/movement-recovery-r0-audit.mjs --check
 * node scripts/verification/movement-recovery-r0-audit.mjs --json
 */
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const BASE_COMMIT='fe2489f3a430aa170478bb4cb2d7b412961ccb1e';
const C='src/breach-motor-collision.ts';
const R='src/breach-motor-route.ts';
const D='src/breach-door-traversal-maneuver.ts';
const O='src/breach-order-movement.ts';
const P='src/breach-motor-passage.ts';
// Frozen [line, api, sources, policy, existing selector, clearance evidence].
// These are observed safeguards, NOT R1-approved recovery contracts.
export const FROZEN_WRITERS=Object.freeze({
 [C]:[
  [198,'set','motor-micro-departure','cold','claimColdMotorMicroDeparture','short full-body + WATCH'],
  [218,'set','motor-cold-fine-world','cold','claimD326ColdFineProbe','fine-grid full-body + WATCH'],
  [261,'set','motor-exact-passage','cold','claimD327ColdPassage','world route + first-leg WATCH'],
  [300,'set','d328-entry-fine-world','stack','claimD328EntryLoopProbe','distinct full-route + WATCH'],
  [324,'set','lane-cycle-world','door','shouldProbeCircularFullBodyLane','alternate route selector'],
  [343,'set','lane-cycle-world','stack','shouldProbeDoorlessStackLane','alternate route selector'],
  [358,'set','full-body-lane','ordinary','allowPhysicalRouteReissue','first-stride + full-body sweep + WATCH'],
  [486,'set','door-escape-swept-rejoin','escape','sweptRejoinExistingRoute','full-body rejoin sweep'],
  [499,'set','door-leaf-escape','clear','escapeOpenDoorOverlap','physical overlap escape; clear nav'],
  [542,'prepend','local-detour','actor','recoveryAction','local continuation + WATCH'],
  [575,'prepend','local-detour','actor','eligibleFrameActorDetour','first-stride + continuation + WATCH'],
  [631,'set','stack-micro-corner','stack','claimStackMicroAttempt','full-body micro-corner'],
  [671,'prepend','self-hinge-relief','door','selfBlockingHingeRelief','hinge-relief selector'],
  [701,'set','open-leaf-local-rejoin','door','claimPhysicalLeafRejoin','physical leaf rejoin + WATCH'],
  [721,'set','cold-micro-departure','cold','claimRepeatedFurnitureDeparture','verified departure + WATCH'],
  [750,'set','entry-squeeze-departure','squeeze','claimM2EntrySqueezeProbe','narrow profile + WATCH'],
  [791,'set','blocked-leg-connector','ordinary','allowPhysicalRouteReissue','first-stride full-body'],
  [818,'set','collision-world-replan','ordinary','allowPhysicalRouteReissue','material difference + recurrence'],
  [823,'set','collision-intel-replan','ordinary','allowPhysicalRouteReissue','material difference + recurrence']
 ],
 [R]:[
  [80,'set','door-leaf-escape','escape','coldSweptEntryEscapeJoin','physical leaf escape join'],
  [102,'set','door-leaf-escape','escape','restoreAfterOpenLeafEscape','first-leg full-body sweep'],
  [187,'set','door-escape-future-portal','door','claimColdFuturePortalProbe','bounded first portal approach'],
  [218,'set','door-squeeze-leaf-exit','squeeze','claimNarrowLeafExitProbe','narrow leaf-exit selector'],
  [230,'set','door-escape-local-portal/door-escape-world-rejoin','escape','restoreRepeatedDoorEscapeRoute','swept route join or local stage'],
  [281,'set','forced-door-shortcut','door','forcedDoorShortcutWorthTaking','door phase + length improvement'],
  [359,'set','fire-retreat','acquire','sweptBodyClear','short full-body retreat'],
  [389,'set','motor-cold-fine-world','cold','claimD326ColdFineProbe','fine-grid full-body route'],
  [410,'set','initial-intel/initial-enemy','acquire','prepareMotorRoute','initial known-intel/enemy route'],
  [431,'set','shove-stage','acquire','knownShoveCrossing','world staging path + original goal'],
  [445,'set','initial-portal-recovery','acquire','routeToNextOperableDoor','first operable-door prefix']
 ],
 [D]:[
  [147,'set','door-short-entry','door','preferShortPhysicalEntry','physical short-entry selector'],
  [210,'set','door-rehearsal-world/door-rehearsal-joined-waypoint/door-rehearsal','door','allowPhysicalRouteReissue','rehearsed hinge + join selector'],
  [321,'set','door-rehearsal','door','tryRehearsedDoorManeuver','door rehearsal selector'],
  [355,'set','door-drift','door','recoverDoorApproachDrift','full-radius staging correction']
 ],
 [O]:[[190,'set','generated-entry-settle','entry','entrySettleRoute','generated entry settle route']],
 [P]:[[63,'observe','passage-retreat','passage','passageRetreatKey','in-place prepend on next line']]
});
export const POLICY_NOTES=Object.freeze({
 cold:{eligibility:'sustained obstruction + cold claim',precedence:'ordinary MOVE / special entry exclusion',cooldown:'per-actor GO probe',progress:'real feet after provisional route'},
 ordinary:{eligibility:'blocked physical stride',precedence:'yield to door/queue/fine ownership',cooldown:'lane window, retry and recurrence',progress:'real GO improvement'},
 actor:{eligibility:'opposing actor/frame denial',precedence:'yield to door/queue ownership',cooldown:'detour window or cold witness',progress:'physical detour not route prepend'},
 door:{eligibility:'specific hinge/door episode',precedence:'hinge and traversal retain authority',cooldown:'episode claim, door phase or recurrence',progress:'door/threshold/feet'},
 stack:{eligibility:'generated STACK or stack loop',precedence:'preserve SYNC/ENTRY queue',cooldown:'bounded stack probe or recurrence',progress:'actual stack waypoint advance'},
 squeeze:{eligibility:'narrow oriented passage + leaf context',precedence:'no full-body waiver',cooldown:'cold narrow probe',progress:'actual narrow body movement'},
 escape:{eligibility:'physically witnessed leaf escape',precedence:'motor overlap escape remains exception',cooldown:'0.7s and repeat evidence',progress:'real body position and route rejoin'},
 acquire:{eligibility:'route absence or specific exceptional goal',precedence:'not ordinary collision recovery',cooldown:'retry backoff or door phase',progress:'footstep, never route assignment'},
 entry:{eligibility:'generated entry settle',precedence:'entry sequence owns staging',cooldown:'choreography lifecycle',progress:'physical settle'},
 passage:{eligibility:'reserved passage retreat',precedence:'queue controller authority',cooldown:'retreat key',progress:'physical retreat and return'},
 clear:{eligibility:'overlap escape already moved body',precedence:'intentional invalidation (not proposal)',cooldown:'existing escape/repair window',progress:'physical overlap resolved'}
});
export const FROZEN_SCENARIOS=Object.freeze([
 ['four-person-inward-outward','tests/door-traversal-d2d3-four-operator.test.mjs','all swing variants finish; hinge <=1 toggle'],
 ['stationary-recurrence','tests/release-d3-17b-route-recurrence.test.mjs','same-anchor cap; fresh order/hinge/GO resets'],
 ['ordinary-ownership','tests/movement-m2-recovery-ownership.test.mjs','blocked first leg rejected; cross-source cap'],
 ['stationary-probes','tests/release-d3-17e-recovery-accounting.test.mjs','three probes; periodic retries; geometry wake'],
 ['provisional-progress','tests/release-d3-18b-provisional-recovery.test.mjs','adoption retains stalled/retry evidence'],
 ['generated-stack-loop','tests/release-d3-28-entry-loop.test.mjs','real cross-source loop before alternative'],
 ['door-handoff','tests/release-d3-11c-route-handoff.test.mjs','orders unchanged; route observer exact'],
 ['furniture-departure','tests/release-d3-17c-physical-departure.test.mjs','physical departure eligibility']
].map(([id,path,expectation])=>({id,path,expectation})));
const fail=message=>{throw Error('R0 movement recovery: '+message);};
const lineOf=(source,index)=>source.slice(0,index).split('\n').length;
function parseCall(source,open){
 const args=[];let current='',depth=0,braces=0,squares=0,quote='';
 for(let i=open;i<source.length;i++){
  const c=source[i],prev=source[i-1];
  if(quote){current+=c;if(c===quote&&prev!=='\\')quote='';continue;}
  if(c==="'"||c==='"'||c.charCodeAt(0)===96){quote=c;current+=c;continue;}
  if(c==='('){depth++;if(depth>1)current+=c;continue;}
  if(c===')'){depth--;if(depth===0){args.push(current.trim());return args;}
   current+=c;continue;}
  if(c==='[')squares++;if(c===']')squares--;
  if(c==='{')braces++;if(c==='}')braces--;
  if(c===','&&depth===1&&braces===0&&squares===0){
   args.push(current.trim());current='';continue;}
  current+=c;
 }
 fail('unterminated writer invocation');
}
export function scanWriters(source,allowed){
 const items=[],regex=/\b(setTransientRoute|prependTransientLeg|observeTransientPrepend)\s*\(/g;
 let m;
 while((m=regex.exec(source))){
  const prefix=source.slice(source.lastIndexOf('\n',m.index)+1,m.index).trim();
  if(prefix.startsWith('//')||prefix.startsWith('*')||
     prefix.startsWith('import ')||prefix.startsWith('export function'))continue;
  const args=parseCall(source,source.indexOf('(',m.index));
  if(args.length!==4)fail('writer args at '+lineOf(source,m.index));
  const sources=[...args[3].matchAll(/'([^']+)'/g)].map(x=>x[1])
   .filter(x=>allowed.has(x));
  if(!sources.length)fail('route source missing at '+lineOf(source,m.index));
  items.push({line:lineOf(source,m.index),
   api:m[1]==='setTransientRoute'?'set':
    m[1]==='prependTransientLeg'?'prepend':'observe',
   sources:[...new Set(sources)].sort()});
 }
 return items;
}
export function inspectR0(root=ROOT){
 const read=path=>readFileSync(join(root,path),'utf8');
 const source=read('src/breach-route-transition.ts');
 const match=source.match(/export type RouteSource=([\s\S]*?);/);
 if(!match)fail('route-source union missing');
 const valid=new Set([...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]));
 const writers=[],hashes={};
 for(const [path,rows] of Object.entries(FROZEN_WRITERS)){
  const raw=read(path),actual=scanWriters(raw,valid);
  hashes[path]=createHash('sha256').update(raw).digest('hex');
  if(actual.length!==rows.length)fail(path+' expected '+rows.length+
   ' writers, found '+actual.length);
  rows.forEach(([line,api,labels,policy,selector,evidence],i)=>{
   const a=actual[i],sources=labels.split('/').sort();
   if(a.line!==line||a.api!==api||
      JSON.stringify(a.sources)!==JSON.stringify(sources))
    fail(path+' changed site '+(i+1)+': '+JSON.stringify(a));
   if(!POLICY_NOTES[policy]||!selector||!evidence)
    fail(path+':'+line+' needs review notes');
   writers.push({path,line,api,sources:a.sources,policy,selector,
    evidence,...POLICY_NOTES[policy]});
  });
 }
 for(const scenario of FROZEN_SCENARIOS)
  if(!existsSync(join(root,scenario.path)))fail('missing '+scenario.path);
 const motor=read('src/breach-actor-motor.ts');
 for(const marker of ['export function advanceActorMotor(',
  'prepareMotorRoute(a,p,dt,s,hooks)',
  'resolveMotorCollision(a,p,next,passage.move,dt,s,'])
  if(!motor.includes(marker))fail('motor authority changed: '+marker);
 if(!source.includes('a.nav=route;')||
    !source.includes('a.nav.unshift(leg);'))
  fail('transient route authority changed');
 const core=writers.filter(x=>x.path===C||x.path===R).length;
 if(core!==30||writers.length!==36)fail('unexpected writer totals');
 return {stage:'R0',baselineCommit:BASE_COMMIT,
  routeWriters:{core,extended:writers.length},
  runtimeChanges:'none',hashes,writers,scenarios:FROZEN_SCENARIOS};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectR0();
 if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
 else console.log('R0 inventory OK: '+result.routeWriters.core+' core, '+
  result.routeWriters.extended+' extended writers, '+
  result.scenarios.length+' frozen scenarios; no motor changes');
}
