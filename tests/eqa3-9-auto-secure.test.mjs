import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestContextCivilian} from '../src/breach-civilian-context-selection.ts';
import {planCivilianInteraction,newSession,team,toggling,stepSession,liveVisibility}
 from '../src/breach-game.ts';
import {setObjectiveIntelLevel} from '../src/breach-objective-intel.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {activateSite} from '../src/breach-core.ts';
const pt=(x,y)=>({x,y});
const site=()=>({seed:9939,name:'EQA3.9 physical SECURE auto turn',
 layout:'corridor',rooms:[{id:'floor',x:80,y:140,w:420,h:160,
  kind:'room',purpose:'floor',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[],
 spawn:[pt(300,200),pt(300,230),pt(300,260),pt(300,290)],
 entrance:pt(290,200),objective:pt(285,200),extract:pt(475,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}});
test('EQA3.9 contact selector permits close, nonvisible same-room person but not unseen distant one',()=>{
 const close={id:'close',p:pt(-15,0),health:2,state:'startled',rescueTarget:true};
 const far={...close,id:'far',p:pt(-31,0)};
 assert.equal(nearestContextCivilian([close],pt(0,0),'secure','secure',
   ()=>false,()=>true),close);
 assert.equal(nearestContextCivilian([far],pt(0,0),'secure','secure',
   ()=>false,()=>true),null);
 assert.equal(nearestContextCivilian([close],pt(0,0),'secure','secure',
   ()=>false,()=>false),null,'walls stay hard despite proximity');
 assert.equal(nearestContextCivilian([{...close,health:0}],
   pt(0,0),'secure','secure',()=>true,()=>true),null);
});
test('EQA3.9 player SECURE turns around toward living target and completes only on GO',()=>{
 const s=newSession(0,9939,'floor-plan','small','rescue',site(),
   {enableCivilians:true});
 try{
  const actor=team(s)[0],person=s.civilians.find(c=>c.rescueTarget);
  assert.ok(person);for(const blue of team(s))if(blue!==actor)blue.health=0;
  actor.p=pt(300,200);actor.priorP=pt(300,200);
  actor.heading=0;actor.weaponYaw=0;
  person.p=pt(285,200);person.priorP={...person.p};
  s.scenario.objective={...person.p};s.mission='secure';
  setObjectiveIntelLevel(s,'unknown');
  assert.equal(liveVisibility(s,person.p),false,'civilian begins behind operator and does not grant camera sight');
  assert.equal(planCivilianInteraction(s,actor.id,person.id,'secure'),true,
    'arm-length contact is an explicit order, not dependent on gaze');
  assert.notEqual(person.state,'compliant','planning never secures');
  const atStart=actor.heading;
  toggling(s);
  for(let i=0;i<105&&s.phase==='running'&&person.state!=='compliant';i++)
    stepSession(s,1/60);
  assert.notEqual(actor.heading,atStart,'the operator must turn toward the civilian');
  assert.equal(person.state,'compliant','real contact succeeds after turn');
  assert.equal(s.mission,'extract');
  assert.equal(person.following,null,'SECURE never also issues FOLLOW');
  assert.ok(Number.isFinite(actor.lastCivilianContactAt),
    'successful physical contact exposes a brief pose timestamp');
 }finally{activateSite(null);}
});
test('EQA3.9 off-axis distant contact still fails; direct SECURE cannot pass solid geometry',()=>{
 const s=newSession(0,9939,'floor-plan','small','rescue',site(),
   {enableCivilians:true});
 try{
  const actor=team(s)[0],person=s.civilians.find(c=>c.rescueTarget);
  assert.ok(person);
  for(const blue of team(s))if(blue!==actor)blue.health=0;
  actor.p=pt(300,200);actor.priorP=pt(300,200);
  actor.heading=0;actor.weaponYaw=0;
  person.p=pt(260,200);person.priorP={...person.p};
  assert.equal(planCivilianInteraction(s,actor.id,person.id,'secure'),false,
    'out of range target behind operator cannot be secured');
 }finally{activateSite(null);}
 const w=site();
 // A real new session is required: static walls are captured into its
 // authoritative geometry index at construction, not editable via s.site.
 w.walls=[{a:pt(291,180),b:pt(291,220)}];
 const blocked=newSession(0,9940,'floor-plan','small','rescue',w,
   {enableCivilians:true});
 try{
  const operator=team(blocked)[0],civil=blocked.civilians.find(c=>c.rescueTarget);
  assert.ok(civil);
  operator.p=pt(300,200);operator.priorP=pt(300,200);
  operator.heading=0;operator.weaponYaw=0;
  civil.p=pt(282,200);civil.priorP={...civil.p};
  assert.equal(planCivilianInteraction(blocked,operator.id,civil.id,'secure'),false,
    'a real physical wall still blocks close behind-the-back SECURE');
 }finally{activateSite(null);}
});
