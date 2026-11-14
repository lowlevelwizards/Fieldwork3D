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
import {activateSite} from '../src/breach-core.ts';
import {MovementQualitySurvey} from '../src/breach-movement-quality.ts';
import {classifyD3Progress} from '../src/breach-d3-progress-triage.ts';
import {enableD32MotorDoorWitness} from '../src/breach-d3-motor-door-witness.ts';
import {captureD32DoorEvidence,captureD32RecoveryFeasibility,
 captureD32SelfBlockingHinge,
 dueDoorHoldMilestones,D32_HOLD_MILESTONES,
 dueD32BlockMilestones,D32_BLOCK_MILESTONES}
 from '../src/breach-d3-door-evidence.ts';

const names=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
const sites=Math.max(1,Math.min(44,Number.parseInt(process.argv[2]??'11',10)||11));
const ticks=Math.max(120,Math.min(1800,Number.parseInt(process.argv[3]??'600',10)||600));
// R3 portal connectivity is costly; run only when explicitly requested.
const portal=process.argv.includes('--portal');
const clinicOnly=process.argv.includes('--clinic-only');
// Exact seeded-site diagnosis, opt-in, does not change any motor paths.
const requestedSiteArg=process.argv.find(arg=>arg.startsWith('--site-index='));
const requestedSite=requestedSiteArg?Number(requestedSiteArg.split('=')[1]):null;
if(requestedSite!==null&&(!Number.isInteger(requestedSite)||
 requestedSite<0||requestedSite>=names.length))
 throw Error('invalid --site-index (expected 0..10)');
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
 try{
  const actors=team(session).slice(0,4);
  if(actors.length!==4)throw Error('squad does not have four operators');
  const planned=kind==='entry'?planEntry(session,actors):
   planFourMoves(session,actors,site);
  const initial=actors.map(a=>new Set(a.plan.map(n=>n.id)));
  // D3.6: frozen per-run authored targets and entry positions. Endpoints
  // expose actual arrival, not just plan exhaustion or a 3-second triage.
  const starting=actors.map(a=>({...a.p}));
  const startedGoalDistance=actors.map(a=>planned.goals.has(a.id)?
   round(dist(a.p,planned.goals.get(a.id))):null);
  const survey=new MovementQualitySurvey(actors,planned.goals);
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
  if(planned.accepted){enableD32MotorDoorWitness(true);toggling(session);}
  for(let tick=0;tick<ticks&&planned.accepted;tick++){
   if(tick===Math.max(0,ticks-180))
    for(let i=0;i<actors.length;i++)windowStart[i]={...actors[i].p};
   stepSession(session,1/60);
   survey.sample(actors,1/60);
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
   if(actors.every(a=>!a.plan.length))break;
  }
  const stats=survey.finish(actors);
  const planIntact=actors.every((a,i)=>a.plan.every(n=>initial[i].has(n.id)));
  const orderIssues=actors.map(a=>a.orderIssue?.reason??null);
  const complete=planned.accepted===4&&actors.every(a=>!a.plan.length);
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
  return {mode:kind,doorId:planned.door?.id??null,accepted:planned.accepted,
   rejected:planned.rejected,reason:planned.reason??null,
   rejectedDoors:planned.rejectedDoors??[],complete,
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
 }finally{enableD32MotorDoorWitness(false);activateSite(null);}
}
const rows=[];
let exceptions=0;
for(let i=requestedSite??(clinicOnly?10:0);
 i<(requestedSite===null?(clinicOnly?11:sites):requestedSite+1);i++){
 const seed=31045+i*13,archetype=names[i%names.length];
 const scale=i%2===0?'small':'standard';
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
console.log(JSON.stringify({kind:'R7.1 real generated four-operator execution',
 protocol:'read-only observability; no automatic fixes or clearance relaxation',
 ticks,summary,rows},null,2));
if(exceptions||summary.invalidPositions||summary.corruptedPlans||
 summary.physicsStepViolations||summary.unboundedManeuverAttempts)
 process.exitCode=1;
