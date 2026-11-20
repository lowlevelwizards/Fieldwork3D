import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,planCasualtyTransport,
 toggling,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const pt=(x,y)=>({x,y});
const site=()=>({
 seed:52115,name:'D15.5E real CAPTURE target transport',
 layout:'corridor',rooms:[{id:'floor',x:110,y:140,w:420,h:150,
  kind:'room',purpose:'floor',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],
 enemies:[pt(155,200)],
 spawn:[pt(140,200),pt(140,250),pt(120,230),pt(120,270)],
 entrance:pt(145,200),objective:pt(155,200),extract:pt(575,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
const setup=()=>{
 const s=newSession(0,undefined,'full-view','small','capture',site());
 const carrier=team(s)[0],target=enemies(s)[0];
 assert.ok(carrier&&target);
 for(const other of team(s))if(other!==carrier)other.health=0;
 carrier.p=pt(140,200);carrier.priorP={...carrier.p};
 carrier.heading=0;carrier.weaponYaw=0;
 target.p=pt(155,200);target.priorP={...target.p};
 target.health=0;target.injuryStage=3;
 target.surrendered=false;target.carriedById=null;
 return {s,carrier,target};
};
test('D15.5E pallet actions only appear for real downed capture target',()=>{
 const opts={door:false,node:false,posture:'stand',pace:'walk',
  firePolicy:'engage',reserve:0,magazine:10,flashRemaining:0};
 assert.equal(contextActionChoices(opts).some(a=>a.id==='ctxDragCapture'),false);
 const choices=contextActionChoices({...opts,nearDownedCaptureTarget:true});
 assert.ok(choices.some(a=>a.id==='ctxDragCapture'));
 assert.ok(choices.some(a=>a.id==='ctxCarryCapture'));
});
test('D15.5E real GO pickup uses exactly the existing operator casualty motor',()=>{
 const {s,carrier,target}=setup();
 try{
  assert.equal(planCasualtyTransport(s,carrier.id,target.id,
    s.scenario.extract,'drag'),true);
  assert.equal(carrier.carryingId,null,'planning did not pick up the target');
  toggling(s);
  for(let i=0;i<200&&s.phase==='running'&&!carrier.carryingId;i++)
   stepSession(s,1/60);
  assert.equal(carrier.carryingId,target.id);
  assert.equal(target.carriedById,carrier.id);
  const start={...target.p};
  for(let i=0;i<150&&s.phase==='running';i++)stepSession(s,1/60);
  assert.ok(target.p.x>start.x+5,'body moves by physically bounded 60Hz steps');
  assert.ok(carrier.p.x>140,'actual motor moved carrier');
  const film=snapshot(s);
  target.carriedById=null;carrier.carryingId=null;
  applyReplayFrame(s,film);
  assert.equal(target.carriedById,carrier.id,'replay restores actual body owner');
  assert.equal(carrier.carryingId,target.id,'replay restores reciprocal carrier');
 }finally{activateSite(null);}
});
test('D15.5E downed CAPTURE cannot be extracted remotely',()=>{
 const {s,carrier,target}=setup();
 try{
  s.mission='extract';s.captureSecured=true;
  carrier.p={...s.scenario.extract};carrier.priorP={...carrier.p};
  toggling(s);stepSession(s,1/60);
  assert.equal(s.phase,'running','operator alone cannot teleport the patient');
  target.p=pt(s.scenario.extract.x-14,s.scenario.extract.y);
  target.priorP={...target.p};target.carriedById=carrier.id;
  carrier.carryingId=target.id;
  stepSession(s,1/60);
  assert.equal(s.phase,'won','real body at extraction can resolve CAPTURE');
 }finally{activateSite(null);}
});
