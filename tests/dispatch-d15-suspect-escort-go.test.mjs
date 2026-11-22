import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,toggling,stepSession,
 planSuspectEscort,planSuspectRestraint,planMove} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {physicalFollowGoal} from '../src/breach-follow-physical-policy.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const pt=(x,y)=>({x,y});
const roomSite=()=>({
 seed:51015,name:'D15 custodial walk study',layout:'corridor',
 rooms:[{id:'floor',x:80,y:140,w:420,h:160,
   kind:'room',purpose:'floor',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],
 enemies:[pt(315,200)],spawn:[pt(300,200),pt(300,230),pt(300,260),pt(300,290)],
 entrance:pt(290,200),objective:pt(315,200),extract:pt(475,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
test('D15.5 ESCORT and STOP appear only for matching real custody',()=>{
 const o={door:false,node:false,posture:'stand',pace:'walk',
  firePolicy:'engage',reserve:0,magazine:10,flashRemaining:0};
 assert.ok(contextActionChoices({...o,nearEscortableSuspect:true})
   .some(x=>x.id==='ctxEscortSuspect'));
 assert.ok(contextActionChoices({...o,nearFollowingSuspect:true})
   .some(x=>x.id==='ctxStopEscortSuspect'));
 assert.equal(contextActionChoices(o).some(x=>x.id==='ctxEscortSuspect'),false);
});
test('D15.5 actual GO binds one restrained target, never planning alone',()=>{
 const s=newSession(0,51015,'full-view','small','capture',roomSite());
 try{
  const a=team(s)[0],p=enemies(s)[0];
  for(const blue of team(s))if(blue!==a)blue.health=0;
  a.p=pt(300,200);a.priorP=pt(300,200);a.heading=0;
  p.p=pt(315,200);p.priorP=pt(315,200);
  p.health=3;p.surrendered=true;p.restrained=true;
  a.awareness.visualProgress[p.id]=1;
  assert.equal(planSuspectEscort(s,a.id,p.id,'escort'),true);
  assert.equal(p.escortLeaderId??null,null);
  toggling(s);
  for(let i=0;i<140&&s.phase==='running'&&!p.escortLeaderId;i++)
   stepSession(s,1/60);
  assert.equal(p.escortLeaderId,a.id);
  const f=snapshot(s);
  p.escortLeaderId=null;
  applyReplayFrame(s,f);
  assert.equal(p.escortLeaderId,a.id);
 }finally{activateSite(null);}
});
test('D15.5 CAPTURE cannot win from extraction without the living captive',()=>{
 const s=newSession(0,51015,'full-view','small','capture',roomSite());
 try{
  const a=team(s)[0],p=enemies(s)[0];
  for(const other of enemies(s))if(other!==p)other.health=0;
  p.health=3;p.surrendered=true;p.restrained=true;
  p.p=pt(315,200);p.priorP={...p.p};
  a.p={...s.scenario.extract};a.priorP={...a.p};
  s.mission='extract';s.captureSecured=true;
  toggling(s);stepSession(s,1/60);
  assert.equal(s.phase,'running','no remote extraction while prisoner still inside');
  p.p={...s.scenario.extract};p.priorP={...p.p};
  p.escortLeaderId=a.id;
  stepSession(s,1/60);
  assert.equal(s.phase,'won');
 }finally{activateSite(null);}
});

test('D15.8 an unrestrained surrendered suspect can FOLLOW hands-up and STOP',()=>{
 const s=newSession(0,51015,'full-view','small','capture',roomSite());
 try{
  const a=team(s)[0],p=enemies(s)[0];
  for(const blue of team(s))if(blue!==a)blue.health=0;
  a.p=pt(300,200);a.priorP={...a.p};a.heading=0;
  p.p=pt(315,200);p.priorP={...p.p};
  p.health=3;p.surrendered=true;p.restrained=false;
  p.suspectEscapeCooldownUntil=100;
  a.awareness.visualProgress[p.id]=1;
  assert.equal(planSuspectEscort(s,a.id,p.id,'escort'),true);
  assert.equal(p.escortLeaderId,null,'planning is not a voiced order yet');
  toggling(s);
  for(let i=0;i<150&&s.phase==='running'&&!p.escortLeaderId;i++)
   stepSession(s,1/60);
  assert.equal(p.escortLeaderId,a.id);
  assert.equal(p.restrained,false,'following is not instant arrest');
  assert.equal(s.captureSecured,false,'the objective still requires RESTRAIN');
  toggling(s);
  assert.equal(planSuspectEscort(s,a.id,p.id,'stop'),true);
  toggling(s);
  for(let i=0;i<130&&s.phase==='running'&&p.escortLeaderId;i++)
   stepSession(s,1/60);
  assert.equal(p.escortLeaderId,null);
  assert.equal(p.surrendered,true);
 }finally{activateSite(null);}
});

test('D15.8 Quick Play capture remains completable without any cuff loadout',()=>{
 const s=newSession(0,51015,'full-view','small','capture',roomSite());
 try{
  const a=team(s)[0],p=enemies(s)[0];
  for(const blue of team(s))if(blue!==a)blue.health=0;
  a.p=pt(300,200);a.priorP={...a.p};a.heading=0;
  p.p=pt(315,200);p.priorP={...p.p};
  a.equipment=initialEquipmentLoadout();
  a.restraintRemaining=0;
  a.awareness.visualProgress[p.id]=1;
  assert.equal(commitSuspectSurrender(s,p,()=>{},()=>{}),true);
  assert.equal(planSuspectRestraint(s,a.id,p.id),true);
  toggling(s);
  for(let i=0;i<185&&s.phase==='running'&&!p.restrained;i++)
   stepSession(s,1/60);
  assert.equal(p.restrained,true,'a stock-free operator completes physical cuffs');
  assert.equal(a.restraintRemaining,0);
  for(let i=0;i<5&&s.phase==='running';i++)stepSession(s,1/60);
  assert.equal(s.captureSecured,true,'capture can progress without gear selection');
  assert.equal(s.mission,'extract');
 }finally{activateSite(null);}
});
