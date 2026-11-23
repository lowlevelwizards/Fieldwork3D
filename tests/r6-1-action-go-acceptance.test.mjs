/** R6.1 real fixed-step GO acceptance; no mock action executor or actor motor. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,planSuspectEscort,planSuspectRestraint,
 planCivilianInteraction,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';

const pt=(x,y)=>({x,y});
const site=()=>({
 seed:6101,name:'R6.1 flat action-lane witness',layout:'corridor',
 rooms:[{id:'r',x:80,y:100,w:460,h:250,
  kind:'room',purpose:'floor',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],
 enemies:[pt(370,200)],spawn:[pt(300,200),pt(300,235),
   pt(300,270),pt(300,305)],
 entrance:pt(290,200),objective:pt(370,200),extract:pt(530,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
const single=(s)=>{
 const a=team(s)[0],p=enemies(s)[0];
 for(const blue of team(s))if(blue!==a)blue.health=0;
 for(const red of enemies(s))if(red!==p)red.health=0;
 a.p=pt(300,200);a.priorP={...a.p};a.heading=0;a.weaponYaw=0;
 p.p=pt(370,200);p.priorP={...p.p};
 a.awareness.visualProgress[p.id]=1;
 return {a,p};
};
const advanceUntil=(s,condition,count=180)=>{
 for(let i=0;i<count&&s.phase==='running'&&!condition();i++)stepSession(s,1/60);
};

test('R6.1 GO: voiced suspect escort works beyond physical touch, no walk to target',()=>{
 const s=newSession(0,6101,'full-view','small','capture',site());
 try{
  const {a,p}=single(s);
  p.surrendered=true;p.health=3;p.restrained=false;
  p.suspectEscapeCooldownUntil=100;
  const origin={...a.p};
  a.plan.push({id:s.nextId++,kind:'wait',p:pt(495,200),duration:6});
  assert.equal(planSuspectEscort(s,a.id,p.id,'escort'),true);
  assert.equal(a.plan[0].interaction,'escort-suspect');
  assert.equal(p.escortLeaderId??null,null);
  toggling(s);
  advanceUntil(s,()=>p.escortLeaderId===a.id,130);
  assert.equal(p.escortLeaderId,a.id);
  assert.ok(Math.hypot(a.p.x-origin.x,a.p.y-origin.y)<.5,
   'GO utterance must not travel to person or pending waypoint');
  assert.equal(p.restrained,false);
 }finally{activateSite(null);}
});

test('R6.1 GO: physical restraint is timed and never completed at planning',()=>{
 const s=newSession(0,6101,'full-view','small','capture',site());
 try{
  const {a,p}=single(s);
  p.p=pt(315,200);p.priorP={...p.p};
  p.health=3;p.surrendered=true;p.restrained=false;
  const origin={...a.p};
  assert.equal(planSuspectRestraint(s,a.id,p.id),true);
  assert.notEqual(p.restrained,true);
  toggling(s);
  stepSession(s,1/60);
  assert.notEqual(p.restrained,true,'first tick is not a completed hand contact');
  advanceUntil(s,()=>p.restrained===true,150);
  assert.equal(p.restrained,true);
  assert.ok(Math.hypot(a.p.x-origin.x,a.p.y-origin.y)<.5,
   'contact in reach must not teleport to target body');
 }finally{activateSite(null);}
});

test('R6.1 GO: civilian voice FOLLOW is not a hand-contact task',()=>{
 const s=newSession(0,6101,'full-view','small','rescue',site());
 try{
  const {a,p}=single(s);
  p.health=0; // A spoken-command test must not depend on enemy reactions.
  const c=createCivilian({id:'civ:r61-voice',role:'rescue',
   persona:'steady',activity:'waiting',
   position:pt(365,200),heading:0,
   roomId:'r',appearanceSeed:61,isRescueTarget:true});
  s.civilians.push(c);
  s.missionType='rescue';s.mission='extract';
  s.rescue={p:{...c.p},following:null,trail:[]};
  s.scenario.extract=pt(590,700);
  a.plan.push({id:s.nextId++,kind:'wait',p:pt(495,200),duration:6});
  const origin={...a.p};
  assert.equal(planCivilianInteraction(s,a.id,c.id,'follow'),true);
  assert.equal(a.plan[0].interaction,'follow-civilian');
  assert.equal(c.following,null);
  toggling(s);
  advanceUntil(s,()=>c.following===a.id,100);
  assert.equal(c.following,a.id);
  assert.ok(Math.hypot(a.p.x-origin.x,a.p.y-origin.y)<.5,
   'speaker must not approach civilian body for FOLLOW');
 }finally{activateSite(null);}
});
