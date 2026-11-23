/** R6.4: authentic cross-stage GO, contact, outcome, notice, and session boundary. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,enemies,planSuspectEscort,planSuspectRestraint,
 toggling,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {ExecutionNoticeFeed} from '../src/ui/execution-feedback.ts';
import {liveExecutionNotice} from '../src/ui/live-execution-presentation.ts';
import {inspectR60,verifyR60}
 from '../scripts/verification/r6-0-tactical-action-audit.mjs';

const pt=(x,y)=>({x,y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const site=()=>({
 seed:6404,name:'R6.4 exact tactical lifecycle',layout:'corridor',
 rooms:[{id:'room',x:80,y:140,w:460,h:180,
  kind:'room',purpose:'floor',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],
 enemies:[pt(340,200)],spawn:[pt(300,200),pt(300,230),
  pt(300,260),pt(300,290)],
 entrance:pt(290,200),objective:pt(100,200),extract:pt(530,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
function setup(){
 const s=newSession(0,6404,'full-view','small','hold',site());
 const a=team(s)[0],p=enemies(s)[0];
 for(const mate of team(s))if(mate!==a)mate.health=0;
 for(const red of enemies(s))if(red!==p)red.health=0;
 a.p=pt(300,200);a.priorP={...a.p};a.heading=0;a.weaponYaw=0;
 p.p=pt(340,200);p.priorP={...p.p};
 p.health=3;p.heading=0;p.surrendered=true;p.restrained=false;
 p.suspectEscapeCooldownUntil=1000;
 a.awareness.visualProgress[p.id]=1;
 return {s,a,p};
}
function advanceUntil(s,done,ticks=240){
 for(let i=0;i<ticks&&s.phase==='running'&&!done();i++)
  stepSession(s,1/60);
}
const scope=s=>({session:s,actors:team(s),seconds:s.seconds,phase:s.phase});

test('R6.4 exact modality census retains single R6.1-R6.3 owners after subtraction',()=>{
 assert.equal(verifyR60(inspectR60()),true);
 const source=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
 const helper=source('breach-person-contact-standpoint.ts');
 assert.doesNotMatch(helper,/\bpersonContactStandpoint\b/,
  'the test-only pre-R6.2 convenience adapter must stay deleted');
 assert.match(helper,/function contactStandpointAtRadius\(/);
 const policy=source('breach-physical-contact-episode.ts');
 assert.match(policy,/contactStandpointAtRadius\(/);
 assert.doesNotMatch(policy,/\b(?:stepSession|setTimeout|Date\.now|Math\.random)\b/);
 const executor=source('breach-order-interactions.ts');
 assert.match(executor,/resolvePhysicalContactEpisode\(/);
 assert.match(executor,/advancePhysicalContactTime\(/);
 assert.match(executor,/approach\(a,contact\.goal,dt,s,\.65\)/);
 assert.doesNotMatch(executor,/approach\(a,(?:suspect|person)\.p,dt,s,\.65\)/);
 const notice=source('ui/execution-notice-provenance.ts');
 assert.doesNotMatch(notice,/\b(?:stepSession|Date\.now|performance\.now)\b/);
});

test('R6.4 voiced GO remains hands-off and produces real executor completion',()=>{
 const {s,a,p}=setup();
 try{
  const initial={...a.p};
  assert.equal(planSuspectEscort(s,a.id,p.id,'escort'),true);
  assert.equal(p.escortLeaderId??null,null,'authoring is not execution');
  assert.equal(a.plan[0].interaction,'escort-suspect');
  toggling(s);
  advanceUntil(s,()=>p.escortLeaderId===a.id,180);
  assert.equal(p.escortLeaderId,a.id,'the real GO handler must issue escort');
  assert.ok(distance(a.p,initial)<.5,
   'voice orders do not path to the occupied suspect center');
  assert.ok(a.completedOrders>=1,'real executed GO, not planning credit');
 }finally{activateSite(null);}
});

test('R6.4 hand contact, failure, notice retirement and mission reset share real facts',()=>{
 const {s,a,p}=setup();
 try{
  assert.equal(planSuspectRestraint(s,a.id,p.id),true);
  const restraintId=a.plan[0].id,origin={...a.p};
  p.p=pt(344,200);p.priorP={...p.p};
  toggling(s);
  stepSession(s,1/60);
  assert.equal(p.restrained,false,'no instant or remotely completed restraint');
  advanceUntil(s,()=>p.restrained===true,240);
  assert.equal(p.restrained,true);
  assert.ok(distance(a.p,p.p)<=42&&distance(a.p,p.p)>16,
   'real 60 Hz body moves into valid hand reach, without overlap');
  assert.ok(distance(a.p,origin)<18,'stage is a short real motor movement');
  assert.ok(!a.plan.some(n=>n.id===restraintId));
  const priorCompleted=a.completedOrders;
  assert.ok(priorCompleted>=1);
  const failId=6404;
  a.plan=[{id:failId,kind:'door',p:{...a.p},
   doorId:'R64-ABSENT-DOOR',method:'open'}];
  s.phase='running';
  stepSession(s,1/60);
  assert.equal(a.plan.length,0);
  assert.equal(a.failedOrders,1);
  assert.equal(a.completedOrders,priorCompleted,
   'a denied GO cannot be counted as an arrival/completion');
  assert.equal(a.lastFailedOrder?.id,failId);
  assert.ok(s.executionEvents.some(e=>e.actor===a.id&&
   e.kind==='blocked'&&e.reason==='order-cancelled'));
  const recordedEvents=s.executionEvents.map(e=>({...e}));
  const originalLog=[...s.events];
  const feed=new ExecutionNoticeFeed();
  const notice=feed.update([],s.phase,100,s.executionEvents,scope(s));
  assert.equal(notice?.origin,'transition');
  assert.equal(notice?.reason,'order-cancelled');
  assert.equal(notice?.actorId,a.id);
  assert.equal(liveExecutionNotice(notice,team(s),s.seconds,s.phase),notice);
  assert.deepEqual(s.executionEvents,recordedEvents,
   'presentation cannot rewrite forensic execution transitions');
  assert.deepEqual(s.events,originalLog,'HUD cannot mutate narrative archive');
  a.plan=[{id:failId+1,kind:'wait',p:{...a.p},duration:3}];
  assert.equal(feed.update([],s.phase,110,s.executionEvents,scope(s)),null,
   'new exact active order invalidates old terminal warning');
  const next=newSession(0,6404,'full-view','small','hold',site());
  try{
   const other=team(next)[0];
   other.plan=[{id:failId,kind:'wait',p:{...other.p},duration:3}];
   next.phase='running';
   assert.equal(feed.update([],next.phase,120,next.executionEvents,scope(next)),null,
    'a new Session with recycled id cannot inherit earlier failure');
   assert.equal(feed.peek(),null);
   assert.equal(a.failedOrders,1,'old Session forensic failure is retained');
  }finally{activateSite(null);}
 }finally{activateSite(null);}
});
