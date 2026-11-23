/** R6.2: actual 60 Hz GO interactions; no mock port or fabricated arrival. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,planSuspectRestraint,planSearchSuspect,
 planSecureDroppedFirearm,planCivilianInteraction,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {RESTRAINT_CONTACT_SECONDS} from '../src/equipment-interaction-timings.ts';

const pt=(x,y)=>({x,y});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const site=()=>({
 seed:6202,name:'R6.2 authentic contact study',layout:'corridor',
 rooms:[{id:'room',x:80,y:140,w:460,h:180,
  kind:'room',purpose:'floor',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],
 enemies:[pt(340,200)],spawn:[pt(300,200),pt(300,230),
  pt(300,260),pt(300,290)],
 entrance:pt(290,200),objective:pt(100,200),extract:pt(530,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
const setup=()=>{
 const s=newSession(0,6202,'full-view','small','hold',site());
 const a=team(s)[0],p=enemies(s)[0];
 for(const mate of team(s))if(mate!==a)mate.health=0;
 for(const red of enemies(s))if(red!==p)red.health=0;
 a.p=pt(300,200);a.priorP={...a.p};a.heading=0;a.weaponYaw=0;
 p.p=pt(340,200);p.priorP={...p.p};
 p.health=3;p.heading=0;p.surrendered=true;p.restrained=false;
 p.suspectEscapeCooldownUntil=1000;
 a.awareness.visualProgress[p.id]=1;
 return {s,a,p};
};
const run=(s,done,ticks=240)=>{
 for(let i=0;i<ticks&&s.phase==='running'&&!done();i++)stepSession(s,1/60);
};

test('R6.2 actual GO: restraint replans the last small shifted gap to 39-unit stance',()=>{
 const {s,a,p}=setup();
 try{
  assert.equal(planSuspectRestraint(s,a.id,p.id),true);
  const prior=pt(a.p.x,a.p.y);
  const queued=a.plan[0];
  p.p=pt(344,200);p.priorP={...p.p};
  assert.equal(d(prior,p.p),44,'target shift creates an exact staging situation');
  toggling(s);
  stepSession(s,1/60);
  assert.equal(p.restrained,false,'neither planning nor one motor tick is a cuff');
  run(s,()=>p.restrained===true,220);
  assert.equal(p.restrained,true,'physical stage then timed GO restraint');
  assert.ok(d(a.p,p.p)<=42,'the action finished inside actual hand reach');
  assert.ok(d(a.p,p.p)>16,'operator did not overlap the subject');
  assert.ok(d(a.p,prior)<18,'short physical advance, never a teleport');
  assert.ok(a.completedOrders>=1);
  assert.ok(!a.plan.some(n=>n.id===queued.id),
   'the completed node is retired exactly once');
 }finally{activateSite(null);}
});

test('R6.2 actual GO: restrained suspect SEARCH uses standable side position',()=>{
 const {s,a,p}=setup();
 try{
  p.p=pt(334,200);p.priorP={...p.p};p.restrained=true;
  p.suspectSearched=false;
  assert.equal(planSearchSuspect(s,a.id,p.id),true);
  const original={...a.p};
  toggling(s);
  stepSession(s,1/60);
  assert.equal(p.suspectSearched,false,'not an instant or remote search');
  run(s,()=>p.suspectSearched===true,240);
  assert.equal(p.suspectSearched,true,
   'SEARCH must complete while keeping the suspect body occupied');
  assert.ok(d(a.p,p.p)<=28,'GO contact must be in actual search reach');
  assert.ok(d(a.p,p.p)>=16,'side contact cannot occupy suspect center');
  assert.ok(d(a.p,original)<25,'only a small, genuine actor move is allowed');
 }finally{activateSite(null);}
});

test('R6.2 actual GO: loose firearm secures a real object, exactly once',()=>{
 const {s,a,p}=setup();
 try{
  p.surrendered=false;
  assert.equal(commitSuspectSurrender(s,p,()=>{},()=>{}),true);
  p.restrained=true;
  const gun=s.droppedFirearms[0];assert.ok(gun);
  gun.p=pt(350,200);
  a.heading=0;a.weaponYaw=0;
  assert.equal(planSecureDroppedFirearm(s,a.id,gun.id),true);
  toggling(s);
  stepSession(s,1/60);
  assert.equal(gun.status,'loose','one tick cannot remotely secure a gun');
  run(s,()=>gun.status==='secured',240);
  assert.equal(gun.status,'secured');
  assert.equal(gun.securedById,a.id);
  assert.ok(d(a.p,gun.p)<=34,'physical hand reach before world effect');
  assert.ok(d(a.p,p.p)>=16,'gun may be near the suspect, not inside their body');
  const completed=a.completedOrders;
  for(let i=0;i<5&&s.phase==='running';i++)stepSession(s,1/60);
  assert.equal(a.completedOrders,completed,'no repeated completion');
 }finally{activateSite(null);}
});

test('R6.2 actual GO: moved target beyond contact band never grants custody',()=>{
 const {s,a,p}=setup();
 try{
  assert.equal(planSuspectRestraint(s,a.id,p.id),true);
  p.p=pt(370,200);p.priorP={...p.p};
  toggling(s);
  run(s,()=>a.failedOrders>0,80);
  assert.equal(p.restrained,false);
  assert.ok((a.failedOrders??0)>=1);
  assert.ok(a.lastFailedOrder?.reason?.includes('REACH'));
  assert.equal(a.completedOrders,0,'failed order does not earn success');
 }finally{activateSite(null);}
});

test('R6.2 actual GO: civilian physical restraint keeps its full contact window',()=>{
 const {s,a,p}=setup();
 try{
  p.health=0;
  const civ=createCivilian({id:'civ:r62',role:'visitor',
   persona:'steady',activity:'idle',position:pt(320,200),
   heading:0,roomId:'room',appearanceSeed:62});
  civ.state='compliant';civ.restrained=false;
  s.civilians.push(civ);
  assert.equal(planCivilianInteraction(s,a.id,civ.id,'restrain'),true);
  const before={...a.p};
  toggling(s);
  stepSession(s,1/60);
  assert.equal(civ.restrained,false);
  run(s,()=>civ.restrained===true,220);
  assert.equal(civ.restrained,true);
  assert.ok(d(a.p,before)<5);
  assert.ok(RESTRAINT_CONTACT_SECONDS>1/60,
   'restraint is timed even with abstract unlimited ties');
 }finally{activateSite(null);}
});
