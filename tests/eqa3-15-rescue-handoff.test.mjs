import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,toggling,stepSession,
 planCivilianInteraction,planMove}
 from '../src/breach-game.ts';
import {setCivilianState} from '../src/breach-civilian-types.ts';
import {activateSite} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
const site=()=>({
 seed:31516,name:'EQA3.15 actual moved rescue SECURE and FOLLOW',
 layout:'corridor',
 rooms:[{id:'hall',x:80,y:140,w:440,h:200,
  kind:'room',purpose:'hall',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],enemies:[],
 spawn:[p(300,200),p(300,250),p(300,300),p(300,320)],
 entrance:p(305,200),objective:p(220,200),extract:p(480,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
function make(){
 const s=newSession(0,31516,'floor-plan','small','rescue',site(),
  {enableCivilians:true});
 const actor=team(s)[0],person=s.civilians.find(c=>c.rescueTarget);
 assert.ok(person);
 for(const other of team(s))if(other!==actor)other.health=0;
 actor.p=p(300,200);actor.priorP={...actor.p};
 actor.heading=Math.PI;actor.weaponYaw=Math.PI;
 person.p=p(318,200);person.priorP={...person.p};
 setCivilianState(person,'hiding',0);person.goal=null;person.fear=.88;
 s.mission='secure';
 return {s,actor,person};
}
function advance(s,limit,done){
 for(let tick=0;tick<limit&&s.phase==='running'&&!done();tick++)
  stepSession(s,1/60);
}
test('EQA3.15 moved and hidden real rescue person can be secured, followed and physically extracted',()=>{
 const {s,actor,person}=make();
 try{
  const oldMarker={...s.scenario.objective};
  assert.ok(Math.hypot(oldMarker.x-person.p.x,oldMarker.y-person.p.y)>90);
  toggling(s);
  advance(s,25,()=>false);
  assert.equal(s.mission,'secure',
   'standing near a hiding person is not an implicit SECURE');
  toggling(s);
  assert.equal(planCivilianInteraction(s,actor.id,person.id,'secure'),true,
   'the moving actual person—not the original mission pin—is the contact authority');
  assert.equal(person.state,'hiding','pause-time order never changes actual person');
  toggling(s);
  advance(s,150,()=>person.state==='compliant');
  assert.equal(person.state,'compliant','live GO completes real contact');
  assert.equal(s.mission,'extract');
  assert.equal(person.following,null,'SECURE does not invent FOLLOW');
  assert.equal(person.restrained,false,'SECURE does not invent restraints');
  toggling(s);
  assert.equal(planCivilianInteraction(s,actor.id,person.id,'follow'),true);
  toggling(s);
  advance(s,150,()=>person.state==='escorted');
  assert.equal(person.state,'escorted');
  assert.equal(person.following,actor.id);
  assert.equal(s.rescue.following,actor.id);
  toggling(s);
  assert.equal(planMove(s,actor.id,p(480,200)),true);
  toggling(s);
  advance(s,1800,()=>s.phase==='won');
  assert.equal(s.phase,'won','real person must reach extraction with assigned operator');
  assert.equal(s.mission,'done');
  assert.ok(Math.hypot(person.p.x-480,person.p.y-200)<=37);
 }finally{activateSite(null);}
});
test('EQA3.15 stale preflight SECURE cannot capture person after they escape live reach',()=>{
 const {s,actor,person}=make();
 try{
  assert.equal(planCivilianInteraction(s,actor.id,person.id,'secure'),true);
  const previous={...person.p};
  person.p=p(410,200);person.priorP={...person.p};
  toggling(s);
  advance(s,90,()=>actor.plan.length===0);
  assert.equal(person.state,'hiding');
  assert.equal(person.following,null);
  assert.equal(s.mission,'secure',
   'no remote stage completion from the original or queued contact point');
  assert.notDeepEqual(person.p,previous);
 }finally{activateSite(null);}
});
