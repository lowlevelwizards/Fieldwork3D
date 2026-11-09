/** Stage 1: scripted real-game, fixed-clock regression scenarios.
 * This is an observer of breach-game's 60 Hz simulation, never a second engine.
 * Every run has its own session, authored orders, and finally-restored geometry.
 */
import {createHash} from 'node:crypto';
import {withTemporarySiteGeometry} from '../../src/breach-core.ts';
import {newSession,stepSession,toggling} from '../../src/breach-game.ts';
import {MissionRecorder} from '../../src/breach-replay.ts';

const n=v=>{
 if(!Number.isFinite(v))throw Error('Non-finite authoritative value: '+v);
 return Number(v.toFixed(5));
};
const pt=p=>[n(p.x),n(p.y)];
const ordered=actors=>[...actors].sort((a,b)=>a.id.localeCompare(b.id));

/** Projection deliberately includes *outcomes*, not merely intended orders.
 * No Date.now, renderer state, object addresses, or CPU timings enter the hash.
 * Stable fingerprints are paired with independently asserted event contracts.
 */
export function stage1Snapshot(s){
 const actors=ordered(s.operators).map(a=>({
  id:a.id,side:a.side,position:pt(a.p),heading:n(a.heading),
  health:n(a.health),injuryStage:a.injuryStage,
  medicalLoss:n(a.medical.bloodLoss),wounds:a.medical.wounds.map(w=>[
   w.id,w.region,w.severity,w.bleeding,w.stabilized
  ]),
  posture:a.posture,pace:a.pace,velocity:n(a.velocity),
  blockedTime:n(a.blockedTime),squeeze:a.squeeze,
  order:a.plan.map(node=>[node.id,node.kind,pt(node.p)]),
  nav:a.nav.map(pt),completedOrders:a.completedOrders,
  magazine:a.magazine,reserve:a.reserve,reload:n(a.reload),
  shots:a.shots,hits:a.hits,kills:a.kills,alert:a.alert,
  target:a.targetId,noiseId:a.lastNoiseExaminedId,
  suspicion:a.suspicion?.stage??null,
  carrying:a.carryingId,carriedBy:a.carriedById
 }));
 const civilians=ordered(s.civilians).map(c=>({
  id:c.id,p:pt(c.p),health:n(c.health),state:c.state,
  injuryStage:c.injuryStage,following:c.following,
  carriedBy:c.carriedById,rescueTarget:c.rescueTarget
 }));
 return {
  seconds:n(s.seconds),phase:s.phase,mission:s.mission,
  missionType:s.missionType,rng:s.rng,
  actors,civilians,
  doors:[...s.doors].sort((a,b)=>a.id.localeCompare(b.id))
   .map(d=>[d.id,d.open,n(d.openFraction??0),d.locked??false]),
  windows:s.windows.map(w=>[w.id,!!w.shattered]),
  ground:[...s.seenGround].sort(),
  shotsFired:s.nextShotId-1,shotEvidence:s.shots.map(shot=>[
   shot.id,shot.shooterId,shot.targetId,pt(shot.end),
   shot.hit,shot.down
  ]),
  battle:s.battleEvents.map(e=>[e.id,e.kind,e.actorId??null]),
  executions:s.executionEvents.map(e=>[e.id,e.status??e.kind??null]),
  cover:s.coverState.map(c=>[n(c.x),n(c.y),n(c.w),n(c.h)]),
  objective:pt(s.scenario.objective),extract:pt(s.scenario.extract),
  result:s.report
 };
}
const digest=frames=>createHash('sha256').update(JSON.stringify(frames))
 .digest('hex');
function ensureValid(s,tick){
 if(s.operators.length===0)throw Error('No actors at tick '+tick);
 const ids=new Set();
 for(const a of [...s.operators,...s.civilians]){
  if(ids.has(a.id))throw Error('Duplicate actor '+a.id);
  ids.add(a.id);
  if(!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y)||
    !Number.isFinite(a.health)||!Number.isFinite(a.heading))
   throw Error('Invalid actor state '+a.id+' at tick '+tick);
 }
 for(const stream of [s.battleEvents,s.executionEvents]){
  for(let i=1;i<stream.length;i++)
   if(stream[i].id<=stream[i-1].id)
    throw Error('Event IDs not increasing at tick '+tick);
 }
}
/** The optional tick script runs immediately BEFORE an authoritative step.
 * All setup/actions use real game APIs; recording happens after the step.
 */
export function runStage1Scenario({
 seed=19,site=null,mission='hold',intel='full-view',
 ticks=180,sampleEvery=30,configure=()=>{},beforeTick=()=>{},
 record=false,enableCivilians=false
}={}){
 if(!Number.isInteger(ticks)||ticks<1||ticks>3600)
  throw Error('Scenario ticks must be between 1 and 3600');
 if(!Number.isInteger(sampleEvery)||sampleEvery<1)
  throw Error('Scenario sampleEvery must be positive');
 return withTemporarySiteGeometry(null,()=>{
  const s=newSession(0,site?undefined:seed,intel,'small',mission,
   site?structuredClone(site):undefined,{enableCivilians});
  configure(s);
  const recorder=record?new MissionRecorder():null;
  recorder?.capture(s,true);
  ensureValid(s,0);
  const checkpoints=[stage1Snapshot(s)];
  toggling(s);
  for(let tick=1;tick<=ticks;tick++){
   beforeTick(s,tick);
   if(s.phase==='running')stepSession(s,1/60);
   if(recorder&&tick%3===0)recorder.capture(s);
   if(tick%sampleEvery===0||tick===ticks){
    ensureValid(s,tick);
    checkpoints.push(stage1Snapshot(s));
   }
  }
  if(recorder)recorder.capture(s,true);
  return {seed,ticks,fingerprint:digest(checkpoints),checkpoints,
   first:checkpoints[0],last:checkpoints.at(-1),
   recorder,phase:s.phase,mission:s.mission,
   shotsFired:s.nextShotId-1,events:s.battleEvents.map(e=>({
    id:e.id,kind:e.kind,actorId:e.actorId??null
   })),liveGroundSize:s.seenGround.size};
 });
}
export function stage1DoorSite(){
 return {
  seed:19,name:'STAGE1 HINGED THRESHOLD',layout:'corridor',training:true,
  rooms:[],roomCount:0,
  walls:[{a:{x:90,y:260},b:{x:290,y:260}},
   {a:{x:332,y:260},b:{x:550,y:260}}],
  doors:[{id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
   open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged'}],
  cover:[],entrance:{x:310,y:260},
  spawn:[{x:300,y:200},{x:308,y:173},{x:316,y:146},{x:325,y:119}],
  enemies:[],windows:[],
  objective:{x:520,y:450},extract:{x:520,y:460},
  bounds:{minX:0,minY:0,maxX:640,maxY:500}
 };
}
/** Finite unobstructed combat field; enemy AI and physical bullets are real. */
export function stage1ContactSite(){
 return {
  seed:41,name:'STAGE1 OPEN CONTACT',layout:'field',
  rooms:[],roomCount:0,walls:[],doors:[],cover:[],windows:[],
  entrance:{x:300,y:250},
  spawn:[{x:140,y:200},{x:160,y:275},{x:140,y:345},{x:150,y:420}],
  enemies:[{x:330,y:225},{x:410,y:330}],
  objective:{x:515,y:385},extract:{x:510,y:420},
  bounds:{minX:0,minY:0,maxX:640,maxY:520}
 };
}
export function stage1CompletionSite(){
 const site=stage1ContactSite();
 site.seed=53;site.name='STAGE1 OBJECTIVE';
 site.enemies=[];
 site.spawn=[{x:160,y:180},{x:165,y:220},
  {x:145,y:180},{x:150,y:220}];
 site.objective={x:160,y:200};
 site.extract={x:170,y:200};
 return site;
}
