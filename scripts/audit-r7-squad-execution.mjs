/**
 * Release 7.1: deterministic, read-only squad execution corpus using real
 * generated buildings and the production Session motor. No movement rewrites.
 *
 * node --experimental-strip-types scripts/audit-r7-squad-execution.mjs [sites=11] [ticks=600]
 *
 * Each seeded site is exercised twice: four separately authored MOVE orders,
 * then an explicitly requested squad-entry template if a valid door is found.
 * Preflight rejection is recorded, never counted as a motor deadlock.
 * Incomplete journeys are diagnostic until baselines are reviewed; corrupted
 * orders, nonfinite positions and exceptions are hard regressions.
 */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove,planSquadEntry,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS,doorLeafSegment,pointToSegment,
 setRouteGridAuditObserver} from '../src/breach-core.ts';
import {setTransientRouteObserver}
 from '../src/breach-route-transition.ts';
import {D311RouteSurvey,createD311GridObserver}
 from './lib/d3-11-route-quality.mjs';
import {D313G2_HOLDOUT_22,D313G2_HOLDOUT_ID}
 from './lib/d3-13g2-fresh-22-manifest.mjs';
import {D313H2_HOLDOUT_22,D313H2_HOLDOUT_ID}
 from './lib/d3-13h2-fresh22-manifest.mjs';
import {D314B_HOLDOUT_22,D314B_HOLDOUT_ID}
 from './lib/d3-14b-sixth-blind22.mjs';
import {D314C_HOLDOUT_22,D314C_HOLDOUT_ID}
 from './lib/d3-14c-seventh-blind22.mjs';
import {D314D_HOLDOUT_22,D314D_HOLDOUT_ID}
 from './lib/d3-14d-eighth-blind22.mjs';
import {D315B4_HOLDOUT_22,D315B4_HOLDOUT_ID}
 from './lib/d3-15b4-tenth-blind22.mjs';
import {doorSwingBlocked,doorWouldStrikeActors,cachedHingeSweepNeighborhood} from '../src/breach-door.ts';
import {rehearseDoorLeafBypass} from '../src/breach-door-traversal-maneuver.ts';
import {sweptBodyClear,bodyClear,sweptProfileClear,squeezeFacing,escapeOpenDoorOverlap} from '../src/breach-navigation.ts';
import {routeWithSqueezeWorld,routeToNextOperableDoor,
 recoverNormalLane,routeWithSqueezeIntel,routeWithNormalWorld}
 from '../src/breach-squeeze-route.ts';
import {observeNarrowLeafExit} from './lib/d3-14b-narrow-exit-probe.mjs';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {knownFixedGoalBlock} from '../src/breach-authored-goal-block.ts';
import {physicalOrderOutcome,successfulSquadExecution}
 from '../src/breach-order-outcome.ts';
import {alternateFullBodyLaneFromCycle} from '../src/breach-cycle-lane-recovery.ts';
 import {MovementQualitySurvey} from '../src/breach-movement-quality.ts';
import {classifyD3Progress} from '../src/breach-d3-progress-triage.ts';
import {classifyCProgressWindow} from '../src/breach-d3-c-progress.ts';
import {enableD32MotorDoorWitness} from '../src/breach-d3-motor-door-witness.ts';
import {captureD32DoorEvidence,captureD32RecoveryFeasibility,
 captureD32SelfBlockingHinge,
 dueDoorHoldMilestones,D32_HOLD_MILESTONES,
 dueD32BlockMilestones,D32_BLOCK_MILESTONES}
 from '../src/breach-d3-door-evidence.ts';

const names=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
const sites=Math.max(1,Math.min(44,Number.parseInt(process.argv[2]??'11',10)||11));
const ticks=Math.max(120,Math.min(2700,Number.parseInt(process.argv[3]??'600',10)||600));
// R3 portal connectivity is costly; run only when explicitly requested.
const portal=process.argv.includes('--portal');
// D3.9C read-only five-second evidence, opt-in; NO added live motor work.
const progress=process.argv.includes('--progress');
// D3.11A audit is OFFLINE-only and opt-in.
const routeQuality=process.argv.includes('--route-quality');
const utilityTrace=process.argv.includes('--utility-trace');
const routeTransitions=process.argv.includes('--route-transitions');
// D3.25D: strictly read-only endpoint feasibility for known failed entry.
const d325StallFeasibility=process.argv.includes('--d325-stall-feasibility');
// D3.26B: strictly cold end-state microstride truth for the three physical
// non-arrivals. Off by default and never part of the authoritative motor.
const d326LastStallProbe=process.argv.includes('--d326-last-stall-probe');
// D3.27A: exact Garage final-contact geometry; read-only, off by default.
const d327GarageProbe=process.argv.includes('--d327-garage-probe');
const d326Micro=d326LastStallProbe?
 await import('../src/breach-stack-micro-corner.ts'):null;
const d326Fine=d326LastStallProbe?
 await import('../src/breach-squeeze-route.ts'):null;
const d326Gate=d326LastStallProbe?
 await import('../src/breach-d326-fine-route-gate.ts'):null;
// D3.17E: offline-only, post-run real geometry witness for blocked bodies.
// It never runs in live movement, advances the simulation, or adopts a route.
const leafRejoinDiagnostic=process.argv.includes('--leaf-rejoin-diagnostic');
// This auditor is copied verbatim into immutable earlier builds for paired
// testing. Never statically import feature-only helpers on that baseline.
const leafRejoinHelpers=leafRejoinDiagnostic?
  await import('../src/breach-physical-leaf-rejoin.ts'):null;
// D3.20A optional, read-only landing provenance. Lazy so immutable baseline
// auditors run without requiring this newly introduced production helper.
const entryLandingWitnessEnabled=process.argv.includes('--entry-settle-witness');
const entryLandingModule=entryLandingWitnessEnabled?
 await import('../src/breach-order-movement.ts'):null;
const queueMotionWitnessEnabled=process.argv.includes('--queue-motion-witness');
const queueMotionModule=queueMotionWitnessEnabled?
 await import('../src/breach-queue-trace.ts'):null;
const g2Fresh22=process.argv.includes('--g2-fresh-22');
const d314bClearanceProbe=process.argv.includes('--d314b-clearance-probe');
const d314cFrontProbe=process.argv.includes('--d314c-front-probe');
const d315bRouteProbe=process.argv.includes('--d315b-route-probe');
const h2Fresh22=process.argv.includes('--h2-fresh-22');
const d314bBlind22=process.argv.includes('--d314b-blind22');
const d314cBlind22=process.argv.includes('--d314c-blind22');
const d314dBlind22=process.argv.includes('--d314d-blind22');
const d315b4Blind22=process.argv.includes('--d315b4-blind22');
const d318Fresh22=process.argv.includes('--d318-fresh22');
// Lazy: old paired-baseline audits deliberately borrow this script without
// the fresh D3.18 manifest. Never introduce a new baseline dependency.
const d318Manifest=d318Fresh22?
 await import('./lib/d3-18-eleventh-fresh22.mjs'):null;
// D3.13F: bounded *read-only* source-level witness for a chosen motor actor.
// Run with --route-transitions --site-index=7 --trace-actor=rook
// and optionally --trace-mode=authored (or entry).
const traceActorArg=process.argv.find(a=>a.startsWith('--trace-actor='));
const traceActor=traceActorArg?.slice('--trace-actor='.length)??null;
const traceModeArg=process.argv.find(a=>a.startsWith('--trace-mode='));
const traceMode=traceModeArg?.slice('--trace-mode='.length)??null;
if((traceActor||traceMode)&&!routeTransitions)
 throw Error('--trace-actor/--trace-mode require --route-transitions');
if(traceActorArg&&(!traceActor||traceActor.length>32))
 throw Error('invalid --trace-actor');
if(traceMode!==null&&traceMode!=='authored'&&traceMode!=='entry')
 throw Error('invalid --trace-mode (authored or entry)');
// D3.17A: opt-in, bounded route-event traces for exact frozen seed/mode/actor
// tuples. Read-only evidence; no route generation or motor behavior changes.
const traceCasesArg=process.argv.find(a=>a.startsWith('--trace-cases='));
const traceCasesRaw=traceCasesArg?.slice('--trace-cases='.length)??'';
const traceCases=new Set(traceCasesRaw.split(',').filter(Boolean));
if(traceCasesArg&&(!routeTransitions||!traceCases.size||traceCases.size>12||
 traceCases.size!==traceCasesRaw.split(',').length||
 [...traceCases].some(x=>!/^[1-9]\d*:(?:authored|entry):[a-z][\w-]{0,31}$/.test(x))))
 throw Error('--trace-cases requires --route-transitions and unique seed:mode:actor tuples');
const clinicOnly=process.argv.includes('--clinic-only');
// Exact seeded-site diagnosis, opt-in, does not change any motor paths.
const requestedSiteArg=process.argv.find(arg=>arg.startsWith('--site-index='));
const requestedSite=requestedSiteArg?Number(requestedSiteArg.split('=')[1]):null;
if(requestedSite!==null&&(!Number.isInteger(requestedSite)||
 requestedSite<0||requestedSite>=names.length))
 throw Error('invalid --site-index (expected 0..10)');
// Offline audit uses an exact generated map rather than retuning the fixed
// 11-map release corpus. Require explicit archetype index for overrides.
const requestedSeedArg=process.argv.find(a=>a.startsWith('--audit-seed='));
const requestedSeed=requestedSeedArg?Number(requestedSeedArg.split('=')[1]):null;
const requestedScaleArg=process.argv.find(a=>a.startsWith('--audit-scale='));
const requestedScale=requestedScaleArg?.split('=')[1]??null;
if(d318Fresh22&&(g2Fresh22||h2Fresh22||d314bBlind22||
  d314cBlind22||d314dBlind22||d315b4Blind22||sites!==22||
  requestedSite!==null||clinicOnly||requestedSeedArg||requestedScaleArg))
 throw Error('D3.18 independent fresh cohort needs all 22 sites');
if(d315b4Blind22&&(g2Fresh22||h2Fresh22||d314bBlind22||
  d314cBlind22||d314dBlind22||sites!==22||requestedSite!==null||
  clinicOnly||requestedSeedArg||requestedScaleArg))
 throw Error('D3.15B4 tenth blind cohort needs 22 sites and no overrides');
if(d314dBlind22&&(g2Fresh22||h2Fresh22||d314bBlind22||
  d314cBlind22||sites!==22||requestedSite!==null||clinicOnly||
  requestedSeedArg||requestedScaleArg))
 throw Error('D3.14D eighth blind holdout needs 22 sites with no overrides');
if(d314cBlind22&&(g2Fresh22||h2Fresh22||d314bBlind22||d314dBlind22||sites!==22||
  requestedSite!==null||clinicOnly||requestedSeedArg||requestedScaleArg))
 throw Error('D3.14C seventh blind holdout needs 22 sites with no overrides');
if(d314bBlind22&&(g2Fresh22||h2Fresh22||sites!==22||
  requestedSite!==null||clinicOnly||requestedSeedArg||requestedScaleArg))
 throw Error('D3.14B blind holdout needs 22 sites and no overrides');
if(h2Fresh22&&(g2Fresh22||sites!==22||requestedSite!==null||clinicOnly||
    requestedSeedArg||requestedScaleArg))
 throw Error('H2 holdout requires 22 sites with no overrides or other cohort');
if(d314cFrontProbe&&requestedSite===null)
 throw Error('D3.14C FRONT feasibility probe needs one selected site');
if(d314bClearanceProbe&&requestedSite===null)
 throw Error('D3.14B clearance probe needs one selected site');
if(g2Fresh22&&(sites!==22||requestedSite!==null||clinicOnly||
    requestedSeedArg||requestedScaleArg))
 throw Error('G2 fresh holdout requires 22 sites and no seed/site overrides');
if((requestedSeedArg||requestedScaleArg)&&requestedSite===null)
 throw Error('audit seed/scale override requires --site-index');
if(requestedSeedArg&&(!Number.isSafeInteger(requestedSeed)||
 requestedSeed<=0||requestedSeed>2147483647))
 throw Error('invalid --audit-seed');
if(requestedScale&&requestedScale!=='small'&&requestedScale!=='standard')
 throw Error('invalid --audit-scale');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const round=n=>Math.round(n*100)/100;
const signed=(p,d)=>{
 const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y;
 const length=Math.hypot(dx,dy)||1;
 return ((p.x-(d.a.x+d.b.x)/2)*-dy+
  (p.y-(d.a.y+d.b.y)/2)*dx)/length;
};
function planFourMoves(session,actors,site){
 const candidates=site.rooms.filter(r=>r.kind==='room').flatMap(r=>[
  {x:r.x+r.w*.5,y:r.y+r.h*.5},
  {x:r.x+r.w*.35,y:r.y+r.h*.5},
  {x:r.x+r.w*.65,y:r.y+r.h*.5}
 ]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 const goals=new Map();
 for(const actor of actors){
  const ranked=[...candidates].sort((a,b)=>
   dist(b,actor.p)-dist(a,actor.p)||a.x-b.x||a.y-b.y);
  for(const candidate of ranked){
   if([...goals.values()].some(q=>dist(candidate,q)<26))continue;
   if(!planMove(session,actor.id,candidate))continue;
   goals.set(actor.id,{...candidate});
   break;
  }
 }
 return {accepted:goals.size,goals,door:null,rejected:4-goals.size};
}
function planEntry(session,actors){
 const initial=actors.map(a=>a.plan.map(n=>n.id));
 const rejectedDoors=[];
 const start=actors[0].p;
 const eligible=[...session.doors].filter(d=>d.kind!=='sliding'&&d.kind!=='shutter')
  .sort((a,b)=>dist(start,{x:(a.a.x+a.b.x)/2,y:(a.a.y+a.b.y)/2})-
    dist(start,{x:(b.a.x+b.b.x)/2,y:(b.a.y+b.b.y)/2})||
    a.id.localeCompare(b.id));
 for(const door of eligible.slice(0,12)){
  const eventOffset=session.events.length;
  if(!planSquadEntry(session,door.id)){
   rejectedDoors.push({door:door.id,
    reason:session.events.slice(eventOffset).at(-1)??'preflight denied'});
   continue;
  }
  const goals=new Map();
  for(const actor of actors){
   const node=actor.plan.find(n=>n.entryDoorId===door.id);
   if(node)goals.set(actor.id,{...node.p});
  }
  return {accepted:goals.size,goals,door,rejected:0};
 }
 const preserved=actors.every((a,i)=>a.plan.length===initial[i].length&&
  a.plan.every((n,j)=>n.id===initial[i][j]));
 if(!preserved)throw Error('rejected entry mutated an authored plan');
 return {accepted:0,goals:new Map(),door:null,
  rejected:4,reason:'no eligible four-person entry template',
  rejectedDoors:rejectedDoors.slice(0,12)};
}
function run(site,seed,kind){
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const session=newSession(0,seed,'full-view',site.scale??'small','intel',quiet,
  {enableCivilians:false});
 const entryLandingEvidence=[],queueMotionEvidence=[];
 try{
  const actors=team(session).slice(0,4);
  if(actors.length!==4)throw Error('squad does not have four operators');
  const planned=kind==='entry'?planEntry(session,actors):
   planFourMoves(session,actors,site);
  if(entryLandingModule&&kind==='entry')
   entryLandingModule.setEntryLandingWitness(event=>{
    if(entryLandingEvidence.length<100)
     entryLandingEvidence.push({...event,seconds:round(event.seconds)});
   });
  if(queueMotionModule&&kind==='entry')
   queueMotionModule.listenQueueMotion(session,event=>{
    if(queueMotionEvidence.length<200){
     const mover=actors.find(a=>a.id===event.actor);
     queueMotionEvidence.push({...event,time:round(event.time),
      activePlan:mover?.plan.slice(0,4).map(n=>({id:n.id,kind:n.kind,
       entryDoorId:n.entryDoorId??null,doorId:n.doorId??null}))??[]});
    }
   });
  const initial=actors.map(a=>new Set(a.plan.map(n=>n.id)));
  // D3.6: frozen per-run authored targets and entry positions. Endpoints
  // expose actual arrival, not just plan exhaustion or a 3-second triage.
  const starting=actors.map(a=>({...a.p}));
  const startedGoalDistance=actors.map(a=>planned.goals.has(a.id)?
   round(dist(a.p,planned.goals.get(a.id))):null);
  const survey=new MovementQualitySurvey(actors,planned.goals);
  const quality=routeQuality?new D311RouteSurvey(actors,planned.goals,{
   traceActor:utilityTrace&&seed===31162&&kind==='authored'?'rook':null,
   traceEvery:15}):null;
  const grid=routeQuality?createD311GridObserver():null;
  const routeWitness=routeTransitions?{counts:{},byActor:{},rejectReasons:{},
   rejectsByActor:{},events:[],
   escapeReacquirePairs:0,pairsByDoor:{},pairsByActor:{}}:null;
  // Offline-only evidence: associate one physical LEAF escape with the
  // next immediate reacquisition for the SAME actor and door. A route that
  // was successfully restored from world truth is not an escape/retry pair.
  const recentLeafEscapes=routeWitness?new Map():null;
  const recordRoute=routeWitness?(e)=>{
   routeWitness.counts[e.source]=(routeWitness.counts[e.source]??0)+1;
   if(e.source==='door-handoff-reject'){
    routeWitness.rejectReasons[e.reason??'unknown']=
      (routeWitness.rejectReasons[e.reason??'unknown']??0)+1;
    const bucket=e.actorId+':'+(e.reason??'unknown');
    routeWitness.rejectsByActor[bucket]=(routeWitness.rejectsByActor[bucket]??0)+1;
   }
   const key=e.actorId+':'+e.source;
   routeWitness.byActor[key]=(routeWitness.byActor[key]??0)+1;
   if(e.source==='door-leaf-escape'){
    if(!e.next.length)
     recentLeafEscapes.set(e.actorId,{at:e.seconds,doorId:e.doorId});
    else recentLeafEscapes.delete(e.actorId);
   }else if(e.source!=='initial-intel'&&e.source!=='door-handoff-reject')
    recentLeafEscapes.delete(e.actorId);
   if(e.source==='initial-intel'){
    const prior=recentLeafEscapes.get(e.actorId);
    if(prior&&e.seconds-prior.at<=1&&prior.doorId===e.doorId){
     routeWitness.escapeReacquirePairs++;
     routeWitness.pairsByActor[e.actorId]=
      (routeWitness.pairsByActor[e.actorId]??0)+1;
     const doorKey=prior.doorId??'unknown';
     routeWitness.pairsByDoor[doorKey]=
      (routeWitness.pairsByDoor[doorKey]??0)+1;
    }
    recentLeafEscapes.delete(e.actorId);
   }
   const selectedActor=traceActor??(utilityTrace&&seed===31162&&
     kind==='authored'?'rook':null);
   const chosenCase=traceCases.has(seed+':'+kind+':'+e.actorId);
   if((chosenCase||(selectedActor===e.actorId&&
      (!traceMode||kind===traceMode)))&&routeWitness.events.length<600)
     routeWitness.events.push({...e,seconds:round(e.seconds),
      prior:e.prior.slice(0,4),next:e.next.slice(0,4)});
  }:null;
  // Do not include offline forensic world-route probes in live-A* totals.
  // Register only while the authoritative Session simulation is stepping.
  const crossed=actors.map(()=>null),lastSigned=actors.map(a=>
   planned.door?signed(a.p,planned.door):null);
  const initialSign=lastSigned.map(v=>Math.sign(v??0));
  let minSpacing=Infinity,reversalsNearDoor=0,maxBlocked=0;
  // D6: physical travel and bounded door-episode invariants.
  let maxPositionStep=0,physicsStepViolations=0;
  let unboundedManeuverAttempts=0,liveHandFrames=0,doorStateFlips=0;
  const openState=new Map(session.doors.map(d=>[d.id,d.open]));
  // Offline-only attribution: discriminate repeated flipping on ONE hinge
  // from unrelated expected door manipulations in the same large building.
  const perDoorFlips=new Map();
  const lastStep=actors.map(()=>({x:0,y:0}));
  const lastP=actors.map(a=>({...a.p}));
  // Read-only final three-second net-displacement witness; not a motor input.
  const windowStart=actors.map(a=>({...a.p}));
  const doorWitness=actors.map(()=>({pause:null,since:0,mask:0,events:[]}));
  const blockWitness=actors.map(()=>({mask:0,events:[]}));
  const progressEvidence=[];
  // D3.26F7 exact-seed read-only motor handoff witness, sampled only
  // for one actor and short time windows. Zero impact in normal audits.
  const d326MicroTrace=[];
  let d326LastMicroKey='';
  const observed=actors.map(a=>({
   start:{...a.p},last:{...a.p},travel:0,blocked:0,squeezing:0,
   passage:0,opening:0,lastRetries:a.recoveryAttempts,
   retries:0,badWindows:0
  }));
  if(planned.accepted){enableD32MotorDoorWitness(true);toggling(session);}
  for(let tick=0;tick<ticks&&planned.accepted;tick++){
   if(tick===Math.max(0,ticks-180))
    for(let i=0;i<actors.length;i++)windowStart[i]={...actors[i].p};
   if(grid)setRouteGridAuditObserver(grid.observe);
   if(recordRoute)setTransientRouteObserver(recordRoute);
   try{
    stepSession(session,1/60);
   }finally{
    if(grid)setRouteGridAuditObserver(null);
    if(recordRoute)setTransientRouteObserver(null);
   }
   if(d326LastStallProbe&&kind==='authored'){
    const chosen=seed===19036595?'ash':seed===19143269?'moss':null;
    const lower=seed===19036595?6:34;
    const upper=seed===19036595?20:40;
    const actor=chosen?actors.find(a=>a.id===chosen):null;
    if(actor&&session.seconds>=lower&&session.seconds<=upper&&
       d326MicroTrace.length<500){
      const next=actor.nav[0];
      const owned=d326Gate.ownsD326FineMotorRoute(actor);
      const key=[actor.nav.length,owned,actor.squeeze,
        actor.doorTraversal?.maneuver??'none',
        Math.round(actor.blockedTime*2)].join(':');
      if(key!==d326LastMicroKey||tick%12===0){
       d326MicroTrace.push({
        seconds:round(session.seconds),actor:chosen,
        position:{x:round(actor.p.x),y:round(actor.p.y)},
        navLength:actor.nav.length,
        first:next?{x:round(next.x),y:round(next.y)}:null,
        fineOwned:owned,squeeze:actor.squeeze,
        blocked:round(actor.blockedTime),velocity:round(actor.velocity),
        door:actor.doorTraversal?.doorId??null,
        maneuver:actor.doorTraversal?.maneuver??null,
        motorPause:actor.motorPause});
       d326LastMicroKey=key;
      }
    }
   }
   survey.sample(actors,1/60);
   quality?.sample(actors,session.seconds);
   if(progress)for(let i=0;i<actors.length;i++){
    const a=actors[i],m=observed[i];
    m.travel+=dist(a.p,m.last);m.last={...a.p};
    if(a.blockedTime>=.85)m.blocked+=1/60;
    if(a.squeeze)m.squeezing+=1/60;
    if(a.motorPause==='passage')m.passage+=1/60;
    if(a.motorPause==='door-opening')m.opening+=1/60;
    m.retries+=Math.max(0,a.recoveryAttempts-m.lastRetries);
    m.lastRetries=a.recoveryAttempts;
   }
   // Capture only pause transitions and milestones; offline audit, not live game.
   for(let i=0;i<actors.length;i++){
    const a=actors[i],trace=doorWitness[i];
    if(a.motorPause!==trace.pause){
     if(trace.pause==='door-opening'&&trace.events.length<12)
      trace.events.push({event:'exit',duration:round(session.seconds-trace.since),
       ...captureD32DoorEvidence(a,session)});
     trace.pause=a.motorPause;trace.since=session.seconds;trace.mask=0;
     if(a.motorPause==='door-opening'&&trace.events.length<12)
      trace.events.push({event:'enter',...captureD32DoorEvidence(a,session)});
    }
    if(a.motorPause==='door-opening')
     for(const index of dueDoorHoldMilestones(session.seconds-trace.since,trace.mask)){
      trace.mask|=1<<index;
      if(trace.events.length<12)
       trace.events.push({event:'held',duration:D32_HOLD_MILESTONES[index],
        ...captureD32DoorEvidence(a,session)});
     }
    // Reuse actual motor blockedTime. No new game-loop queries or timers.
    const physical=blockWitness[i];
    if(a.blockedTime<.1)physical.mask=0;
    else if(a.blockedTime>=D32_BLOCK_MILESTONES[0])
     for(const index of dueD32BlockMilestones(a.blockedTime,physical.mask)){
      physical.mask|=1<<index;
      if(physical.events.length<12)
       physical.events.push({event:'blocked',duration:D32_BLOCK_MILESTONES[index],
        ...captureD32DoorEvidence(a,session),
        // Two read-only world-route probes, only after genuine sustained
        // physical blockage; not called in the live motor hotpath.
        routeFeasibility:index===1||index===2?
          captureD32RecoveryFeasibility(a,session,
            portal&&seed===31175&&kind==='entry'&&a.id==='vale'&&index===1):null,
        hingeSelfClearance:index===1||index===2?
          captureD32SelfBlockingHinge(a,session):null});
     }
   }
   for(const d of session.doors){
    if(openState.get(d.id)!==d.open){
     doorStateFlips++;openState.set(d.id,d.open);
     perDoorFlips.set(d.id,(perDoorFlips.get(d.id)??0)+1);
    }
   }
   for(let i=0;i<actors.length;i++){
    const a=actors[i];
    if(!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y))continue;
    maxBlocked=Math.max(maxBlocked,a.blockedTime||0);
    const step={x:a.p.x-lastP[i].x,y:a.p.y-lastP[i].y};
    const stepDistance=Math.hypot(step.x,step.y);
    maxPositionStep=Math.max(maxPositionStep,stepDistance);
    // A step beyond 50 world units in 1/60 second is not locomotion.
    if(stepDistance>50)physicsStepViolations++;
    if((a.doorTraversal?.maneuverAttempts??0)>4)
     unboundedManeuverAttempts++;
    if(a.doorHandContact?.releasedAt===null)liveHandFrames++;
    if(planned.door){
     const face=signed(a.p,planned.door);
     if(crossed[i]===null&&initialSign[i]!==0&&
      face*initialSign[i]<-16)crossed[i]=round(session.seconds);
     const center={x:(planned.door.a.x+planned.door.b.x)/2,
      y:(planned.door.a.y+planned.door.b.y)/2};
     if(dist(a.p,center)<75&&
      step.x*lastStep[i].x+step.y*lastStep[i].y<-.15)
      reversalsNearDoor++;
     lastSigned[i]=face;
    }
    if(Math.hypot(step.x,step.y)>.5)lastStep[i]=step;
    lastP[i]={...a.p};
    for(let j=0;j<i;j++)minSpacing=Math.min(minSpacing,dist(a.p,actors[j].p));
   }
   if(progress&&((tick+1)%300===0||tick+1===ticks)){
    const seconds=round((tick+1)/60);
    for(let i=0;i<actors.length;i++){
     const a=actors[i],m=observed[i],goal=planned.goals.get(a.id);
     const net=round(dist(a.p,m.start));
     const travel=round(m.travel);
     const remaining=goal?round(dist(a.p,goal)):null;
     const kind=a.plan[0]?.kind??null;
     const intentional=kind==='wait'||kind==='watch'||kind==='sync'||
      kind==='stack'||kind==='holdClear';
     const classification=classifyCProgressWindow({
      active:!!a.plan.length,kind,
      goalReduction:goal?round(dist(m.start,goal)-dist(a.p,goal)):null,
      travel,net,blockedSeconds:m.blocked,
      squeezeSeconds:m.squeezing,
      passageSeconds:m.passage,
      openingSeconds:m.opening,orderIssue:a.orderIssue?.reason??null,
      attempts:m.retries,badWindows:m.badWindows
     });
     m.badWindows=classification.consecutivePoorWindows;
     progressEvidence.push({
      seconds,actor:a.id,kind,classification:classification.status,
      suspicious:classification.suspicious,
      consecutivePoorWindows:m.badWindows,
      net,travel,
      goalReduction:goal?round(dist(m.start,goal)-dist(a.p,goal)):null,
      remaining,blockedSeconds:round(m.blocked),
      squeezeSeconds:round(m.squeezing),
      passageSeconds:round(m.passage),
      openingSeconds:round(m.opening),
      retries:m.retries,position:{...a.p},
      nextNav:a.nav[0]??null,
      motorPause:a.motorPause,orderIssue:a.orderIssue?.reason??null,
      doorEpisode:a.doorTraversal?.doorId??null
     });
     m.start={...a.p};m.travel=0;m.blocked=0;m.squeezing=0;
     m.passage=0;m.opening=0;m.retries=0;
    }
   }
   if(actors.every(a=>!a.plan.length))break;
  }
  const stats=survey.finish(actors);
  const planIntact=actors.every((a,i)=>a.plan.every(n=>initial[i].has(n.id)));
  const orderIssues=actors.map(a=>a.orderIssue?.reason??null);
  const complete=planned.accepted===4&&actors.every(a=>!a.plan.length);
  // Historical 'complete' means QUEUE DRAINED only, for stable old CI.
  // A new explicit result requires every real body at original GO and
  // zero terminally cancelled orders in the authoritative actor ledger.
  const physicalEvidence=actors.map(a=>({
   arrived:!!stats.details.find(d=>d.actor===a.id)?.arrived,
   remainingOrders:a.plan.length,failedOrders:a.failedOrders??0}));
  const successful=planned.accepted===4&&successfulSquadExecution(physicalEvidence);
  // D3.7 forensic warehouse probe, END OF RUN ONLY. Compare leaf swept
  // against architecture with and without human bodies, and test the
  // already-existing finite bypass / full-body self-clearance options.
  // No additional work in the real Session motor or per-actor hotpath.
  let warehouseHingeWitness=null;
  if(seed===31123&&kind==='authored'){
   const door=session.doors.find(d=>d.id==='FRONT');
   if(door){
    const world=sessionWorldGeometry(session);
    const f=door.openFraction??0,next=Math.min(1,f+.025);
    const nearby=cachedHingeSweepNeighborhood(door,world);
    warehouseHingeWitness={
     fraction:round(f),pushTarget:round(door.pushTarget??1),
     staticBlocksSwing:doorSwingBlocked(door,next,[],undefined,world),
     anyBodyBlocksSwing:doorWouldStrikeActors(door,next,
      actors.map(a=>a.p),OPERATOR_RADIUS),
     // Exact real geometry for offline top-down evidence rendering,
     // rather than a speculative mock screenshot.
     physicalDoor:{a:door.a,b:door.b,hinge:door.hinge,
      swing:door.swing,kind:door.kind,leaf:doorLeafSegment(door)},
     nearWalls:nearby.walls.map(w=>({a:w.a,b:w.b})),
     nearCover:nearby.cover.map(o=>({
      x:o.x,y:o.y,w:o.w,h:o.h,id:o.id??null,fixture:o.fixture??null})),
     bodyObstruction:actors.map(a=>({
      id:a.id,p:{...a.p},
      strikesNext:doorWouldStrikeActors(door,next,[a.p],OPERATOR_RADIUS)})),
     actors:actors.map(a=>({
      id:a.id,phase:a.doorTraversal?.phase??null,
      self: captureD32SelfBlockingHinge(a,session),
      route: captureD32RecoveryFeasibility(a,session),
      rehearsed:rehearseDoorLeafBypass(a.p,a.plan[0]?.p??a.p,
       door,(from,to)=>sweptBodyClear(from,to,session.doors,
        OPERATOR_RADIUS,world))
     }))
    };
   }
  }
  // D3.14B: READ ONLY, once after 45-second simulation. Determine if
  // Vale's real squeeze body can leave the D9 cycle and which DIRECTIONS
  // really clear the current static geometry. Never insert or execute a
  // candidate, touch the authored goal, or allocate per live motor tick.
  let d314bClearanceEvidence=null;
  if(d314bClearanceProbe&&kind==='entry'){
   const actor=actors.find(a=>a.id==='vale');
   const goal=actor?planned.goals.get(actor.id):null;
   if(actor&&goal){
    const world=sessionWorldGeometry(session);
    const fullStand=bodyClear(actor.p,session.doors,OPERATOR_RADIUS,world);
    const next=actor.nav[0]??goal;
    const step=(from,to)=>sweptBodyClear(from,to,session.doors,OPERATOR_RADIUS,world);
    const narrow=(from,to)=>sweptProfileClear(from,to,session.doors,
       squeezeFacing(Math.atan2(to.y-from.y,to.x-from.x)),'squeeze',world);
    const angles=Array.from({length:16},(_,i)=>i*Math.PI/8);
    const neighborhood=[];
    for(const distance of [4,8,16,28]){
     const options=angles.map((angle,i)=>{
      const target={x:actor.p.x+Math.cos(angle)*distance,
       y:actor.p.y+Math.sin(angle)*distance};
      return {headingIndex:i,full:step(actor.p,target),
       narrow:narrow(actor.p,target),
       closer:dist(target,goal)<dist(actor.p,goal)};
     });
     neighborhood.push({distance,fullSafe:options.filter(v=>v.full).map(v=>v.headingIndex),
      narrowSafe:options.filter(v=>v.narrow).map(v=>v.headingIndex),
      goalwardFull:options.filter(v=>v.full&&v.closer).map(v=>v.headingIndex),
      goalwardNarrow:options.filter(v=>v.narrow&&v.closer).map(v=>v.headingIndex)});
    }
    const episode=actor.doorTraversal;
    const door=episode?session.doors.find(d=>d.id===episode.doorId):null;
    const route=routeWithSqueezeWorld(actor.p,goal,session.doors,world);
    const future=routeToNextOperableDoor(actor.p,goal,session.doors,world);
    d314bClearanceEvidence={
     actorId:actor.id,position:{...actor.p},goal:{...goal},
     remaining:round(dist(actor.p,goal)),fullStand,
     squeeze:actor.squeeze,squeezeYaw:actor.squeezeYaw,
     heading:actor.heading,blockedTime:actor.blockedTime,lastBlocker:actor.lastBlocker,
     nextNav:actor.nav.slice(0,5),nextFullClear:step(actor.p,next),
     nextNarrowClear:narrow(actor.p,next),
     originalGoalFullClear:step(actor.p,goal),
     originalGoalNarrowClear:narrow(actor.p,goal),
     episode:episode?{id:episode.doorId,phase:episode.phase,
      maneuver:episode.maneuver,approachSide:episode.approachSide,
      waypoints:episode.waypoints.slice(0,4),lastProgressAt:episode.lastProgressAt}:null,
     leaf:door?{a:{...door.a},b:{...door.b},leaf:doorLeafSegment(door),
      fraction:door.openFraction,angularVelocity:door.angularVelocity,
      open:door.open}:null,
     otherOperators:actors.filter(a=>a!==actor).map(a=>({id:a.id,p:{...a.p}})),
     closedOperable:session.doors.filter(d=>!d.locked&&!d.jammed&&!d.wedged&&
       !d.heldBy&&(d.openFraction??0)<.72).map(d=>d.id),
     actualWorld:{length:route.length,first:route.slice(0,4),
      firstClear:route.length?step(actor.p,route[0]):null},
     futurePortal:{length:future.length,first:future.slice(0,4),
      firstClear:future.length?step(actor.p,future[0]):null},
     neighborhood,
     boundedNarrowExit:observeNarrowLeafExit(actor.p,goal,next,narrow,step)
    };
   }
  }
  // D3.14C: exactly one POST-SIM, read-only comparison of the REAL
  // physically swept local lane, known-intel tail and existing future
  // operable-door recovery. No paths are adopted, no actor moved, no
  // collision relaxed or expensive test run inside a live 60Hz tick.
  let d314cFrontEvidence=null;
  if(d314cFrontProbe&&kind==='authored'){
   const actor=actors.find(a=>a.id==='rook');
   const goal=actor?planned.goals.get(actor.id):null;
   if(actor&&goal){
    const world=sessionWorldGeometry(session);
    const full=(a,b)=>sweptBodyClear(a,b,session.doors,
      OPERATOR_RADIUS,world);
    const plan=route=>{let at=actor.p,length=0,illegal=0;
     for(const p of route){
      length+=dist(at,p);
      if(!full(at,p))illegal++;at=p;
     }
     return {nodes:route.length,totalLength:round(length),
      allLegsFullySwept:illegal===0,illegalLegs:illegal,
      first:route.slice(0,6),last:route.slice(-3),
      firstPhysicallyClear:route.length?full(actor.p,route[0]):null,
      reachesAuthoredGoal:route.length?
       dist(route[route.length-1],goal)<3:false};
    };
    const lane=recoverNormalLane(actor.p,goal,session.doors,world);
    const actual=routeWithSqueezeWorld(actor.p,goal,session.doors,world);
    const future=routeToNextOperableDoor(actor.p,goal,session.doors,world);
    const intel=routeWithSqueezeIntel(session.intel,actor.p,goal);
    const episode=actor.doorTraversal;
    const door=episode?session.doors.find(d=>d.id===episode.doorId):null;
    d314cFrontEvidence={
     actorId:actor.id,position:{...actor.p},goal:{...goal},
     remaining:round(dist(actor.p,goal)),squeeze:actor.squeeze,
     lastBlocker:actor.lastBlocker,blockedTime:round(actor.blockedTime),
     routeNav:actor.nav.slice(0,6),bodyFullyClear:bodyClear(actor.p,
      session.doors,OPERATOR_RADIUS,world),
     episode:episode?{doorId:episode.doorId,phase:episode.phase,
      maneuver:episode.maneuver,approachSide:episode.approachSide,
      attempts:episode.maneuverAttempts}:null,
     leaf:door?{a:door.a,b:door.b,
      leaf:doorLeafSegment(door),fraction:door.openFraction,
      angularVelocity:door.angularVelocity}:null,
     otherActors:actors.filter(a=>a!==actor).map(a=>({
      id:a.id,p:{...a.p}})),
     closedOperable:session.doors.filter(d=>!d.locked&&!d.jammed&&
      !d.wedged&&!d.heldBy&&(d.openFraction??0)<.72).map(d=>d.id),
     fullBodyLane:plan(lane),actualWorld:plan(actual),
     firstFutureDoor:plan(future),knownIntel:plan(intel),
     // Frozen recurrent source-coordinate witness: these coordinates
     // came from the separately archived H4 real 60Hz route transitions.
     // Evaluate only after the sim, with the same exact final physical
     // hinge and static geometry; do not mutate actor positions.
     frozenLoopCenters:[{x:494.5,y:497.6},{x:493.5,y:511.2},
       {x:460,y:500}].map(from=>{
       const route=routeWithSqueezeWorld(from,goal,session.doors,world);
       const candidate=recoverNormalLane(from,goal,session.doors,world);
       const summarize=path=>{
        let at=from,length=0,illegal=0;
        for(const to of path){
         if(!full(at,to))illegal++;
         length+=dist(at,to);at=to;
        }
        return {nodes:path.length,length:round(length),illegal,
         first:path.slice(0,5),last:path.slice(-2)};
       };
       return {from,bodyClear:bodyClear(from,session.doors,
         OPERATOR_RADIUS,world),
        toSouthCornerFull:full(from,{x:512,y:512}),
        toFirstOldLaneFull:full(from,{x:460,y:500}),
        toNorthPortalFull:full(from,{x:496,y:448}),
        realWorld:summarize(route),normalLane:summarize(candidate)};
      })
    };
   }
  }
  // D3.15B2: one read-only post-simulation feasibility inspection
  // of the *active* authorial MOVE to STACK, not the remote entry landing.
  // No actor, door, plan, clock, body clearance or nav is modified.
  let d315bRouteEvidence=null;
  if(d315bRouteProbe&&kind==='entry'){
   const actor=actors.find(a=>a.id==='vale');
   const current=actor?.plan[0];
   if(actor&&current?.kind==='move'){
    const world=sessionWorldGeometry(session);
    const goal=current.p;
    const full=(a,b)=>sweptBodyClear(a,b,session.doors,OPERATOR_RADIUS,world);
    const inspect=(route)=>{
     let at=actor.p,cost=0,invalid=0;
     for(const pt of route){cost+=dist(at,pt);if(!full(at,pt))invalid++;at=pt;}
     return {nodes:route.length,cost:round(cost),invalid,
      goalCompleted:route.length>0&&dist(route.at(-1),goal)<3,
      first:route.slice(0,8),last:route.slice(-3),
      firstLegClear:route.length>0?full(actor.p,route[0]):false};
    };
    const local=recoverNormalLane(actor.p,goal,session.doors,world);
    const directWorld=routeWithSqueezeWorld(actor.p,goal,session.doors,world);
    const future=routeToNextOperableDoor(actor.p,goal,session.doors,world);
    const alternate=local.length?alternateFullBodyLaneFromCycle(actor.p,
      goal,local[0],full,(a,b)=>routeWithSqueezeWorld(a,b,session.doors,world)):[];
    const last=planned.goals.get(actor.id);
    const finalWorld=last?routeWithSqueezeWorld(actor.p,last,session.doors,world):[];
    // D3.15B4: cold-only microstride feasibility. A long sweep sampling
    // every 4 units can miss the true first motor step next to furniture.
    const micro=(from,to)=>{
      const gap=dist(from,to),steps=Math.max(1,Math.ceil(gap/.3));
      let prior=from;
      for(let k=1;k<=steps;k++){
        const t=k/steps,pt={x:from.x+(to.x-from.x)*t,
          y:from.y+(to.y-from.y)*t};
        if(!full(prior,pt))return {clear:false,t,
          blockedAt:pt,from:prior};
        prior=pt;
      }
      return {clear:true};
    };
    const microDirect=micro(actor.p,goal);
    const offsets=[];
    const candidates=[];
    for(const radius of [2,4,7,11]){
      for(let dir=0;dir<16;dir++){
        const yaw=2*Math.PI*dir/16;
        const stage={x:actor.p.x+Math.cos(yaw)*radius,
          y:actor.p.y+Math.sin(yaw)*radius};
        const first=micro(actor.p,stage);
        if(!first.clear)continue;
        const tail=routeWithSqueezeWorld(stage,goal,session.doors,world);
        const route=[stage,...tail];
        let prior=actor.p,bad=null,cost=0;
        for(const point of route){
          cost+=dist(prior,point);
          const outcome=micro(prior,point);
          if(!outcome.clear){bad=outcome;break;}
          prior=point;
        }
        const record={dir,radius,stage,cost:round(cost),
          reaches:!!tail.length&&dist(tail.at(-1),goal)<3,
          microClear:bad===null,blocks:bad?.blockedAt??null,
          nodes:route.slice(0,5)};
        if(candidates.length<35)candidates.push(record);
        if(record.reaches&&record.microClear)offsets.push(record);
      }
    }
    d315bRouteEvidence={actorId:actor.id,position:{...actor.p},
      activeOrder:{id:current.id,kind:current.kind,goal:{...goal},
       stackDoorId:current.stackDoorId??null,entryDoorId:current.entryDoorId??null},
      finalLanding:last?{...last}:null,
      currentGoalRemaining:round(dist(actor.p,goal)),
      finalLandingRemaining:last?round(dist(actor.p,last)):null,
      squeeze:actor.squeeze,blockedTime:round(actor.blockedTime),
      doorTraversal:actor.doorTraversal?.doorId??null,
      currentNextNav:actor.nav.slice(0,6),
      local:inspect(local),directWorld:inspect(directWorld),
      firstFuturePortal:inspect(future),oppositeDeparture:inspect(alternate),
      finalLandingWorldNodes:finalWorld.length,
      clearStandingBody:bodyClear(actor.p,session.doors,OPERATOR_RADIUS,world),
      microDirect,microRouteSolutions:offsets.slice(0,12),
      microRouteSamples:candidates.slice(0,25),
      nearbyCover:world.cover.filter(c=>
       Math.hypot(c.x-actor.p.x,c.y-actor.p.y)<45)
       .slice(0,10).map(c=>({x:c.x,y:c.y,w:c.w,h:c.h})),
      closedDoors:session.doors.filter(d=>!d.open||d.openFraction<.72)
       .map(d=>({id:d.id,open:!!d.open,locked:!!d.locked,fraction:round(d.openFraction??0)}))};
   }
  }
  // D3.26B: compare the real stuck operator's *first 0.3-unit motor stride*
  // against coarse 4-unit swept route validation. All probes inspect the
  // final immutable world only; no actor position, GO, door or nav changes.
  const d326StallEvidence=d326LastStallProbe&&kind==='authored'?
   actors.filter(a=>a.plan[0]?.kind==='move'&&
     stats.details.some(v=>v.actor===a.id&&!v.arrived)).map(actor=>{
    const world=sessionWorldGeometry(session),goal=planned.goals.get(actor.id);
    if(!goal)return null;
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const sweep=(from,to)=>sweptBodyClear(from,to,
      session.doors,OPERATOR_RADIUS,world);
    const micro=(from,to)=>d326Micro.fullBodyMotorStrideClear(from,to,sweep);
    const first=actor.nav[0]??null;
    const direction=first??goal;
    const gap=distance(actor.p,direction);
    const immediate=gap>.001?{
      x:actor.p.x+(direction.x-actor.p.x)/gap*.3,
      y:actor.p.y+(direction.y-actor.p.y)/gap*.3}:null;
    const previews=[];
    for(const radius of [2,5,10]){
     for(let j=0;j<8;j++){
      const theta=j*Math.PI/4;
      const candidate={x:actor.p.x+Math.cos(theta)*radius,
        y:actor.p.y+Math.sin(theta)*radius};
      if(!micro(actor.p,candidate))continue;
      const tail=routeWithSqueezeWorld(candidate,goal,
        session.doors,world);
      const firstTail=tail[0]??null;
      const future=tail.length?[]:routeToNextOperableDoor(
        candidate,goal,session.doors,world);
      let tailFailIndex=-1,at=candidate;
      for(let k=0;k<tail.length;k++){
       if(!micro(at,tail[k])){tailFailIndex=k;break;}
       at=tail[k];
      }
      previews.push({radius,heading:j,point:candidate,
       tailNodes:tail.length,tailFirst:firstTail,
       tailFirstMicro:firstTail?micro(candidate,firstTail):null,
       tailAllMicro:tail.length>0&&tailFailIndex<0,
       tailFailIndex,
       futureNodes:future.length,futureFirst:future[0]??null,
       futureFirstMicro:future[0]?micro(candidate,future[0]):null,
       nextNavMicro:first?micro(candidate,first):null});
     }
    }
    const fineRoute=d326Fine.coldFineMotorWorldRoute(
      actor.p,goal,session.doors,world);
    return {actor:actor.id,position:{...actor.p},goal:{...goal},
     fineRoute:{nodes:fineRoute.length,
       first:fineRoute[0]??null,
       last:fineRoute.at(-1)??null,
       firstSix:fineRoute.slice(0,6)},
     doorEpisode:actor.doorTraversal?.doorId??null,
     nearestDoors:session.doors.map(d=>({id:d.id,
       fromGap:pointToSegment(actor.p,doorLeafSegment(d)),
       fraction:d.openFraction??0,locked:!!d.locked}))
       .sort((a,b)=>a.fromGap-b.fromGap).slice(0,4),
     blocker:actor.lastBlocker,blockedSeconds:actor.blockedTime,
     squeeze:actor.squeeze,squeezeYaw:actor.squeezeYaw,
     motorPause:actor.motorPause,recoveryAttempts:actor.recoveryAttempts,
     lastNormalLaneProbeAt:actor.lastNormalLaneProbeAt,
     lastNavRepairAt:actor.lastNavRepairAt,
     doorEpisodePhase:actor.doorTraversal?.phase??null,
     doorManeuver:actor.doorTraversal?.maneuver??null,
     doorEpisodeAttempts:actor.doorTraversal?.maneuverAttempts??null,
     firstNav:first,nextNavFullSweep:first?sweep(actor.p,first):null,
     nextNavMicro:first?micro(actor.p,first):null,
     nextImmediate:immediate,immediateSweep:immediate?sweep(actor.p,immediate):null,
     positionFullBody:bodyClear(actor.p,session.doors,OPERATOR_RADIUS,world),
     goalFullBody:bodyClear(goal,session.doors,OPERATOR_RADIUS,world),
     currentWorldRouteNodes:routeWithSqueezeWorld(actor.p,goal,
       session.doors,world).length,
     currentFuturePortalNodes:routeToNextOperableDoor(actor.p,goal,
       session.doors,world).length,
     candidates:previews};
   }).filter(Boolean):null;
  // D3.27A: the one remaining frozen physical non-arrival is Garage
  // 19285501 / Moss. Observe REAL full-body and oriented squeeze clearance
  // in the current world. No route, actor, door or cover mutation occurs.
  const d327GarageEvidence=d327GarageProbe&&kind==='authored'?
   (() => {
    const actor=actors.find(a=>a.id==='moss');
    const goal=actor?planned.goals.get(actor.id):null;
    if(!actor||!goal)return null;
    const world=sessionWorldGeometry(session),next=actor.nav[0]??goal;
    const full=(a,b)=>sweptBodyClear(a,b,session.doors,
      OPERATOR_RADIUS,world);
    const narrow=(a,b)=>sweptProfileClear(a,b,session.doors,
      squeezeFacing(Math.atan2(b.y-a.y,b.x-a.x)),'squeeze',world);
    const length=dist(actor.p,next);
    const motor=length>.01?{
      x:actor.p.x+(next.x-actor.p.x)*Math.min(length,.3)/length,
      y:actor.p.y+(next.y-actor.p.y)*Math.min(length,.3)/length
    }:next;
    const samples=[];
    for(const length of [0.3,2,5,10,20]){
     const headings=[];
     for(let i=0;i<16;i++){
      const t=i*Math.PI/8;
      const p={x:actor.p.x+length*Math.cos(t),
        y:actor.p.y+length*Math.sin(t)};
      headings.push({i,x:round(p.x),y:round(p.y),
       normal:full(actor.p,p),narrow:narrow(actor.p,p),
       towardGoal:dist(p,goal)<dist(actor.p,goal)});
     }
     samples.push({length,
      normal:headings.filter(x=>x.normal).map(x=>x.i),
      narrow:headings.filter(x=>x.narrow).map(x=>x.i),
      normalToward:headings.filter(x=>x.normal&&x.towardGoal).map(x=>x.i),
      narrowToward:headings.filter(x=>x.narrow&&x.towardGoal).map(x=>x.i)});
    }
    const route=routeWithSqueezeWorld(actor.p,goal,session.doors,world);
    const portal=routeToNextOperableDoor(actor.p,goal,session.doors,world);
    return {actor:actor.id,position:{...actor.p},goal:{...goal},
     next:{...next},distanceToGoal:round(dist(actor.p,goal)),
     blockedTime:round(actor.blockedTime),lastBlocker:actor.lastBlocker,
     orderIssue:actor.orderIssue?.reason??null,
     authoredGoalIntact:actor.plan[0]?.kind==='move'&&
      dist(actor.plan[0].p,goal)<.001,
     actualOrder:actor.plan[0]?{id:actor.plan[0].id,kind:actor.plan[0].kind,
       point:{...actor.plan[0].p},entryDoorId:actor.plan[0].entryDoorId??null,
       stackDoorId:actor.plan[0].stackDoorId??null}:null,
     actualOrderFixedBlock:actor.plan[0]?.kind==='move'?
       knownFixedGoalBlock(session,actor.plan[0].p):null,
     actualOrderFullBodyClear:actor.plan[0]?.kind==='move'?
       bodyClear(actor.plan[0].p,session.doors,OPERATOR_RADIUS,world):null,
     remainingNavNodes:actor.nav.length,
     normalAtCurrent:bodyClear(actor.p,session.doors,OPERATOR_RADIUS,world),
     normalAtGoal:bodyClear(goal,session.doors,OPERATOR_RADIUS,world),
     goalStaticPassable:world.passable(goal,OPERATOR_RADIUS),
     goalKnownFixedBlocker:knownFixedGoalBlock(session,goal),
     immediateFull:full(actor.p,motor),immediateNarrow:narrow(actor.p,motor),
     fullToNext:full(actor.p,next),narrowToNext:narrow(actor.p,next),
     normalWorldNodes:route.length,portalNodes:portal.length,
     samples,
     nearestCover:world.cover.map((obstacle,i)=>({
      index:i,x:obstacle.x,y:obstacle.y,w:obstacle.w,h:obstacle.h,
      fixture:obstacle.fixture??null,kind:obstacle.kind??null,
      discovered:session.intel.cover.has(i),
      movable:obstacle.movable??null,
      gap:round(Math.hypot(obstacle.x-actor.p.x,obstacle.y-actor.p.y))
     })).sort((a,b)=>a.gap-b.gap).slice(0,18),
     doors:session.doors.map(door=>({
      id:door.id,locked:!!door.locked,open:!!door.open,
      fraction:round(door.openFraction??0),
      gap:round(pointToSegment(actor.p,doorLeafSegment(door)))
     })).sort((a,b)=>a.gap-b.gap).slice(0,10)};
   })():null;
  const triage=stats.details.map((detail,i)=>{
   const actor=actors[i];
   const recentNetMovement=round(dist(actor.p,windowStart[i]));
   return {actor:actor.id,state:classifyD3Progress({
    planned:detail.planned,planComplete:actor.plan.length===0,
    activeOrder:actor.plan[0]?.kind??null,
    motorPause:actor.motorPause,blockedTime:actor.blockedTime,
    orderIssue:detail.orderIssue,navCount:actor.nav.length,
    recentNetMovement
   }),recentNetMovement,activeOrder:actor.plan[0]?.kind??null,
    blockedTime:round(actor.blockedTime),navCount:actor.nav.length};
  });
  const leafRecoveryEvidence=leafRejoinDiagnostic?actors.filter(a=>
    a.blockedTime>=.85&&a.plan[0]?.kind==='move').map(a=>{
    const goal=a.plan[0].p,world=sessionWorldGeometry(session);
    const leaf=leafRejoinHelpers.relevantStableOpenLeaf(a.p,session.doors,
       a.doorTraversal?.doorId??null);
    const sweep=(from,to)=>sweptBodyClear(from,to,
      session.doors,OPERATOR_RADIUS,world);
    const physical=leaf?leafRejoinHelpers.selectPhysicalOpenLeafRejoin(
      a.p,goal,a.nav,leaf,sweep,
      p=>bodyClear(p,session.doors,OPERATOR_RADIUS,world),
      (from,to)=>routeWithNormalWorld(from,to,session.doors,world)):[];
    const nearby=session.doors.filter(door=>door.open)
      .map(door=>({id:door.id,
        gap:round(pointToSegment(a.p,doorLeafSegment(door))),
        fraction:round(door.openFraction??0)}))
      .sort((a,b)=>a.gap-b.gap).slice(0,4);
    return {actor:a.id,blocker:a.lastBlocker,blockedTime:round(a.blockedTime),
      position:{...a.p},goal:{...goal},navCount:a.nav.length,
      firstNav:a.nav[0]??null,lastNav:a.nav.at(-1)??null,
      firstNavFullBodyClear:a.nav.length?sweep(a.p,a.nav[0]):null,
      firstNavStandable:a.nav.length?bodyClear(a.nav[0],
        session.doors,OPERATOR_RADIUS,world):null,
      leaf:leaf?.id??null,nearestOpenLeaves:nearby,
      selectedJoin:physical.slice(0,5),selectedNodeCount:physical.length};
   }):[];
  // D3.25D: purely hypothetical stepped escape from the ACTUAL
  // end-state position. Never modify actors, doors, route ownership, or
  // physical arrival counts. Each tiny step is certified by the SAME
  // swept body helper as the runtime; no hidden teleport to a free site.
  const d325Feasibility=d325StallFeasibility&&kind==='entry'?
   actors.map(a=>{
    const world=sessionWorldGeometry(session);
    const goal=planned.goals.get(a.id)??a.plan.at(-1)?.p??a.p;
    const chosen=session.doors.find(d=>d.id===planned.door?.id);
    let point={...a.p},steps=0,distance=0;
    const sequence=[];
    const startClear=bodyClear(point,session.doors,OPERATOR_RADIUS,world);
    while(!bodyClear(point,session.doors,OPERATOR_RADIUS,world)&&steps<32){
      const next=escapeOpenDoorOverlap(point,goal,session.doors,1.35,world);
      if(!next||!sweptBodyClear(point,next,session.doors,OPERATOR_RADIUS,world))
        break;
      distance+=dist(point,next);steps++;
      sequence.push({...next});point=next;
    }
    const clear=bodyClear(point,session.doors,OPERATOR_RADIUS,world);
    const route=clear?routeWithSqueezeWorld(point,goal,session.doors,world):[];
    const first=route[0]??null;
    const firstSwept=!!first&&
      sweptBodyClear(point,first,session.doors,OPERATOR_RADIUS,world);
    // D3.25E diagnostic ONLY: if the grid's first leg is unswept
    // despite a clear body, examine a fixed 5-radius/16-heading set
    // of physically legal cold one-bend departures. No actor moves.
    let localJoin=null,joinProbes=0;
    if(clear&&route.length&&!firstSwept&&a.plan[0]?.kind==='move'){
      outer:for(const radius of [3,5,8,12,18]){
        for(let i=0;i<16;i++){
          const t=i*Math.PI/8;
          const candidate={x:point.x+Math.cos(t)*radius,
            y:point.y+Math.sin(t)*radius};
          if(!sweptBodyClear(point,candidate,
             session.doors,OPERATOR_RADIUS,world)||
             !bodyClear(candidate,session.doors,OPERATOR_RADIUS,world))
            continue;
          joinProbes++;
          const continuation=routeWithSqueezeWorld(
            candidate,goal,session.doors,world);
          if(!continuation.length||
             !sweptBodyClear(candidate,continuation[0],
              session.doors,OPERATOR_RADIUS,world))continue;
          localJoin={candidate,routeFirst:continuation[0],
            routeLength:continuation.length,
            distance:round(dist(point,candidate))};
          break outer;
        }
      }
    }
    return {id:a.id,started:{...a.p},goal:{...goal},
      startClear,steps,escapeDistance:round(distance),
      escapePoint:point,clearAfterEscape:clear,
      escapeSequence:sequence.slice(0,12),
      door:chosen?{id:chosen.id,open:chosen.open,
       fraction:round(chosen.openFraction??0),
       angularVelocity:round(chosen.angularVelocity??0)}:null,
      navNext:a.nav[0]??null,routeLength:route.length,
      routeFirst:first,routeFirstSwept:firstSwept,
      joinProbes,localJoin};
   }):null;
  return {mode:kind,doorId:planned.door?.id??null,accepted:planned.accepted,
   successful,queueDrained:complete,
   cancelledOrders:actors.reduce((n,a)=>n+(a.failedOrders??0),0),
   rejected:planned.rejected,reason:planned.reason??null,
   rejectedDoors:planned.rejectedDoors??[],complete,
   warehouseHingeWitness,
   ...(d314bClearanceProbe?{d314bClearanceEvidence}:{}),
   ...(d314cFrontProbe?{d314cFrontEvidence}:{}),
   ...(d315bRouteProbe?{d315bRouteEvidence}:{}),
   ...(progress?{progressEvidence}:{}),
   ...(leafRejoinDiagnostic?{leafRecoveryEvidence}:{}),
   ...(d325Feasibility?{d325Feasibility}:{}),
   ...(d326StallEvidence?{d326StallEvidence}:{}),
   ...(d326LastStallProbe?{d326MicroTrace}:{}),
   ...(d327GarageProbe?{d327GarageEvidence}:{}),
   ...(entryLandingWitnessEnabled?{entryLandingEvidence}:{}),
   ...(queueMotionWitnessEnabled?{queueMotionEvidence}:{}),
   ...(quality?{routeQuality:quality.finish(),gridAudit:grid.summary()}:{}),
   ...(routeWitness?{routeTransitions:routeWitness}:{}),
   doorEvidence:doorWitness.flatMap((trace,i)=>trace.events.map(e=>({
    operator:actors[i].id,...e}))),
   physicalBlockEvidence:blockWitness.flatMap((trace,i)=>trace.events.map(e=>({
    operator:actors[i].id,...e}))),
   crossed,orderIssues,planIntact,triage,
   minSpacing:Number.isFinite(minSpacing)?round(minSpacing):null,
   reversalsNearDoor,maxBlockedSeconds:round(maxBlocked),
   maxPositionStep:round(maxPositionStep),physicsStepViolations,
   unboundedManeuverAttempts,liveHandFrames,doorStateFlips,
   doorFlipDetails:[...perDoorFlips].map(([id,flips])=>({id,flips}))
    .sort((a,b)=>b.flips-a.flips||a.id.localeCompare(b.id)),
   simulatedSeconds:round(session.seconds),phase:session.phase,
   // D3.7 offline incident snapshots: mark which authored gate is actually
   // active and which hinge may be preventing movement (or a SYNC).
   endDoorStates:session.doors.map(door=>({
    id:door.id,open:door.open,fraction:round(door.openFraction??0),
    angularVelocity:round(door.angularVelocity??0),
    pushTarget:round(door.pushTarget??0),heldBy:door.heldBy??null,
    locked:!!door.locked,wedged:!!door.wedged,jammed:!!door.jammed
   })),
   orderCancelledEvents:session.events.filter(e=>
    typeof e==='string'&&e.includes('ORDER CANCELLED')).slice(-12),
   arrivals:stats.arrivals,incomplete:stats.incomplete,
   stallEpisodes:stats.stallEpisodes,retries:stats.retries,
   passageWaitSeconds:stats.passageWaitSeconds,
   squeezeSeconds:stats.squeezeSeconds,
   invalidPositions:stats.invalidPositions,
   operators:stats.details.map(d=>({
    id:d.actor,arrived:d.arrived,remaining:d.remaining,
    failedOrders:actors.find(a=>a.id===d.actor)?.failedOrders??0,
    lastFailedOrder:actors.find(a=>a.id===d.actor)?.lastFailedOrder??null,
    outcome:physicalOrderOutcome({arrived:d.arrived,
     remainingOrders:actors.find(a=>a.id===d.actor)?.plan.length??0,
     failedOrders:actors.find(a=>a.id===d.actor)?.failedOrders??0}),
    activeOrderDetails:actors.find(a=>a.id===d.actor).plan[0]?
     {kind:actors.find(a=>a.id===d.actor).plan[0].kind,
      id:actors.find(a=>a.id===d.actor).plan[0].id,
      doorId:actors.find(a=>a.id===d.actor).plan[0].doorId??null,
      entryDoorId:actors.find(a=>a.id===d.actor).plan[0].entryDoorId??null,
      syncCode:actors.find(a=>a.id===d.actor).plan[0].syncCode??null,
      duration:actors.find(a=>a.id===d.actor).plan[0].duration??null}:null,
    syncReady:actors.find(a=>a.id===d.actor).syncReady??null,
    actionTimer:round(actors.find(a=>a.id===d.actor).actionTimer??0),
    waitRemaining:round(actors.find(a=>a.id===d.actor).waitRemaining??0),
    doorHand:actors.find(a=>a.id===d.actor).doorHandContact?.doorId??null,
    // End-state evidence only. Read current authoritative motor state;
    // no new tick-level probes, authority, or path calculation.
    goal:planned.goals.get(d.actor)??null,
    position:{...actors.find(a=>a.id===d.actor).p},
    start:starting[actors.findIndex(a=>a.id===d.actor)],
    startingGoalDistance:startedGoalDistance[actors.findIndex(a=>a.id===d.actor)],
    nextNav:actors.find(a=>a.id===d.actor).nav[0]??null,
    lastBlocker:actors.find(a=>a.id===d.actor).lastBlocker??null,
    doorEpisode:actors.find(a=>a.id===d.actor).doorTraversal?
     {doorId:actors.find(a=>a.id===d.actor).doorTraversal.doorId,
      phase:actors.find(a=>a.id===d.actor).doorTraversal.phase,
      maneuver:actors.find(a=>a.id===d.actor).doorTraversal.maneuver}:null,
    stallEpisodes:d.stallEpisodes,blockedSeconds:d.blockedSeconds,
    waitSeconds:d.passageWaitSeconds,retries:d.retries,
    longestStillSeconds:d.longestStillSeconds,
    progressDistance:d.distance,
    activeOrder:actors.find(a=>a.id===d.actor)?.plan[0]?.kind??null,
    remainingOrders:actors.find(a=>a.id===d.actor)?.plan.length??0,
    motorPause:actors.find(a=>a.id===d.actor)?.motorPause??null,
    orderIssue:d.orderIssue
   }))};
 }finally{
  entryLandingModule?.setEntryLandingWitness(null);
  queueMotionModule?.listenQueueMotion(session,null);
  setRouteGridAuditObserver(null);
  setTransientRouteObserver(null);
  enableD32MotorDoorWitness(false);activateSite(null);
 }
}
const rows=[];
let exceptions=0;
for(let i=requestedSite??(clinicOnly?10:0);
 i<(requestedSite===null?(clinicOnly?11:sites):requestedSite+1);i++){
 const cohort=d318Fresh22?d318Manifest.D318_FRESH_22[i]:
   d315b4Blind22?D315B4_HOLDOUT_22[i]:
   d314dBlind22?D314D_HOLDOUT_22[i]:
   d314cBlind22?D314C_HOLDOUT_22[i]:
   d314bBlind22?D314B_HOLDOUT_22[i]:
   h2Fresh22?D313H2_HOLDOUT_22[i]:
   g2Fresh22?D313G2_HOLDOUT_22[i]:null;
 const seed=requestedSeed??cohort?.seed??31045+i*13;
 const archetype=cohort?.archetype??names[i%names.length];
 const scale=requestedScale??cohort?.scale??(i%2===0?'small':'standard');
 try{
  const site=generateSite(seed,scale,undefined,{mission:'intel'},
   {archetype});
  const modes=['authored','entry'].map(mode=>run(site,seed,mode));
  rows.push({seed,scale,archetype,rooms:site.rooms.length,
   doors:site.doors.length,cover:site.cover.length,modes});
 }catch(error){
  exceptions++;
  rows.push({seed,archetype,error:error instanceof Error?
   error.stack??error.message:String(error)});
 }
}
const results=rows.flatMap(row=>row.modes??[]);
const sum=key=>results.reduce((n,r)=>n+(r[key]||0),0);
const triageCounts={};
for(const row of results)for(const operator of row.triage??[])
 triageCounts[operator.state]=(triageCounts[operator.state]??0)+1;
const summary={
 triageCounts,sites:rows.length,exceptions,attempted:results.length,
 acceptedFour:results.filter(r=>r.accepted===4).length,
 completedFour:results.filter(r=>r.complete).length,
 // D3.16: 'completedFour' is a backwards-compatible queue-drained count;
 // only successfulFour additionally rejects any cancelled authored order
 // and requires four real operators to reach their original world goals.
 successfulFour:results.filter(r=>r.successful).length,
 terminallyCancelledOrders:sum('cancelledOrders'),
 cancelledOperators:results.reduce((n,r)=>n+(r.operators??[])
  .filter(o=>o.outcome==='cancelled').length,0),
 cancelledAndNotArrived:results.reduce((n,r)=>n+(r.operators??[])
  .filter(o=>o.outcome==='cancelled'&&!o.arrived).length,0),
 arrivedDespiteCancellation:results.reduce((n,r)=>n+(r.operators??[])
  .filter(o=>o.outcome==='cancelled'&&o.arrived).length,0),
 physicallyPendingOperators:results.reduce((n,r)=>n+(r.operators??[])
  .filter(o=>o.outcome==='pending').length,0),
 unreachedDrainedOperators:results.reduce((n,r)=>n+(r.operators??[])
  .filter(o=>o.outcome==='unreached').length,0),
 // Unlike logical plan completion, these inspect real FINAL world positions.
 physicalArrivals:sum('arrivals'),
 physicalCompletedFour:results.filter(r=>r.accepted===4&&r.arrivals===4).length,
 logicalDoneButNotArrived:results.reduce((n,r)=>n+(r.operators??[]).filter(o=>
  o.remainingOrders===0&&!o.arrived).length,0),
 incomplete:sum('incomplete'),rejected:sum('rejected'),
 stallEpisodes:sum('stallEpisodes'),retries:sum('retries'),
 passageWaitSeconds:round(sum('passageWaitSeconds')),
 reversalsNearDoor:sum('reversalsNearDoor'),
 maxPositionStep:round(Math.max(0,...results.map(r=>r.maxPositionStep??0))),
 physicsStepViolations:sum('physicsStepViolations'),
 unboundedManeuverAttempts:sum('unboundedManeuverAttempts'),
 liveHandFrames:sum('liveHandFrames'),doorStateFlips:sum('doorStateFlips'),
 invalidPositions:sum('invalidPositions'),
 corruptedPlans:results.filter(r=>!r.planIntact).length
};
const progressWindows=progress?results.flatMap(mode=>mode.progressEvidence??[]):[];
const suspicious=progressWindows.filter(w=>w.suspicious);
const transitionSummary=routeTransitions?{
 counts:results.reduce((all,mode)=>{
  for(const [source,count] of Object.entries(mode.routeTransitions?.counts??{}))
   all[source]=(all[source]??0)+count;
  return all;},{}),
 rejectReasons:results.reduce((all,mode)=>{
  for(const [reason,count] of Object.entries(mode.routeTransitions?.rejectReasons??{}))
   all[reason]=(all[reason]??0)+count;
  return all;},{}),
 escapeReacquirePairs:results.reduce((n,mode)=>
  n+(mode.routeTransitions?.escapeReacquirePairs??0),0),
 pairsByDoor:results.reduce((all,mode)=>{
  for(const [door,count] of Object.entries(mode.routeTransitions?.pairsByDoor??{}))
   all[door]=(all[door]??0)+count;
  return all;},{})
}:null;
const qualityResults=routeQuality?results.filter(m=>m.routeQuality):[];
const routeQualitySummary=routeQuality?{
 searches:qualityResults.reduce((n,m)=>n+m.gridAudit.searches,0),
 expanded:qualityResults.reduce((n,m)=>n+m.gridAudit.expanded,0),
 cpuMs:round(qualityResults.reduce((n,m)=>n+m.gridAudit.elapsedMs,0)),
 routeSelections:qualityResults.reduce((n,m)=>n+m.routeQuality.actors.reduce(
  (sum,a)=>sum+a.routeSelections,0),0),
 waypointAdvances:qualityResults.reduce((n,m)=>n+m.routeQuality.actors.reduce(
  (sum,a)=>sum+a.waypointAdvances,0),0),
 revisitedCells:qualityResults.reduce((n,m)=>n+m.routeQuality.actors.reduce(
  (sum,a)=>sum+a.revisitedCells,0),0)
}:null;
const progressSummary=progress?{
 windows:progressWindows.length,
 suspiciousWindows:suspicious.length,
 suspectedLoops:suspicious.filter(w=>w.classification==='movement-loop').length,
 sustainedStill:suspicious.filter(w=>w.classification==='sustained-still').length,
 affected:suspicious.map(w=>w.actor),
 maxObservedSeconds:round(Math.max(0,...progressWindows.map(w=>w.seconds)))
}:null;
console.log(JSON.stringify({kind:'R7.1 real generated four-operator execution',
 protocol:'read-only observability; no automatic fixes or clearance relaxation',
 ...(d318Fresh22?{corpus:d318Manifest.D318_FRESH_ID}:
   d315b4Blind22?{corpus:D315B4_HOLDOUT_ID}:
   d314dBlind22?{corpus:D314D_HOLDOUT_ID}:
   d314cBlind22?{corpus:D314C_HOLDOUT_ID}:
   d314bBlind22?{corpus:D314B_HOLDOUT_ID}:
   h2Fresh22?{corpus:D313H2_HOLDOUT_ID}:
   g2Fresh22?{corpus:D313G2_HOLDOUT_ID}:{}),
 ticks,summary,...(progress?{progressSummary}:{}),
 ...(routeQuality?{routeQualitySummary}:{}),
 ...(routeTransitions?{transitionSummary}:{}),rows},null,2));
if(exceptions||summary.invalidPositions||summary.corruptedPlans||
 summary.physicsStepViolations||summary.unboundedManeuverAttempts)
 process.exitCode=1;
