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

const names=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
const sites=Math.max(1,Math.min(44,Number.parseInt(process.argv[2]??'11',10)||11));
const ticks=Math.max(120,Math.min(1800,Number.parseInt(process.argv[3]??'600',10)||600));
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
  const survey=new MovementQualitySurvey(actors,planned.goals);
  const crossed=actors.map(()=>null),lastSigned=actors.map(a=>
   planned.door?signed(a.p,planned.door):null);
  const initialSign=lastSigned.map(v=>Math.sign(v??0));
  let minSpacing=Infinity,reversalsNearDoor=0,maxBlocked=0;
  const lastStep=actors.map(()=>({x:0,y:0}));
  const lastP=actors.map(a=>({...a.p}));
  if(planned.accepted)toggling(session);
  for(let tick=0;tick<ticks&&planned.accepted;tick++){
   stepSession(session,1/60);
   survey.sample(actors,1/60);
   for(let i=0;i<actors.length;i++){
    const a=actors[i];
    if(!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y))continue;
    maxBlocked=Math.max(maxBlocked,a.blockedTime||0);
    const step={x:a.p.x-lastP[i].x,y:a.p.y-lastP[i].y};
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
  return {mode:kind,doorId:planned.door?.id??null,accepted:planned.accepted,
   rejected:planned.rejected,reason:planned.reason??null,
   rejectedDoors:planned.rejectedDoors??[],complete,
   crossed,orderIssues,planIntact,
   minSpacing:Number.isFinite(minSpacing)?round(minSpacing):null,
   reversalsNearDoor,maxBlockedSeconds:round(maxBlocked),
   simulatedSeconds:round(session.seconds),phase:session.phase,
   arrivals:stats.arrivals,incomplete:stats.incomplete,
   stallEpisodes:stats.stallEpisodes,retries:stats.retries,
   passageWaitSeconds:stats.passageWaitSeconds,
   squeezeSeconds:stats.squeezeSeconds,
   invalidPositions:stats.invalidPositions,
   operators:stats.details.map(d=>({
    id:d.actor,arrived:d.arrived,remaining:d.remaining,
    stallEpisodes:d.stallEpisodes,blockedSeconds:d.blockedSeconds,
    waitSeconds:d.passageWaitSeconds,retries:d.retries,
    longestStillSeconds:d.longestStillSeconds,
    progressDistance:d.distance,
    activeOrder:actors.find(a=>a.id===d.actor)?.plan[0]?.kind??null,
    remainingOrders:actors.find(a=>a.id===d.actor)?.plan.length??0,
    motorPause:actors.find(a=>a.id===d.actor)?.motorPause??null,
    orderIssue:d.orderIssue
   }))};
 }finally{activateSite(null);}
}
const rows=[];
let exceptions=0;
for(let i=0;i<sites;i++){
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
const summary={
 sites:rows.length,exceptions,attempted:results.length,
 acceptedFour:results.filter(r=>r.accepted===4).length,
 completedFour:results.filter(r=>r.complete).length,
 incomplete:sum('incomplete'),rejected:sum('rejected'),
 stallEpisodes:sum('stallEpisodes'),retries:sum('retries'),
 passageWaitSeconds:round(sum('passageWaitSeconds')),
 reversalsNearDoor:sum('reversalsNearDoor'),
 invalidPositions:sum('invalidPositions'),
 corruptedPlans:results.filter(r=>!r.planIntact).length
};
console.log(JSON.stringify({kind:'R7.1 real generated four-operator execution',
 protocol:'read-only observability; no automatic fixes or clearance relaxation',
 ticks,summary,rows},null,2));
if(exceptions||summary.invalidPositions||summary.corruptedPlans)
 process.exitCode=1;
