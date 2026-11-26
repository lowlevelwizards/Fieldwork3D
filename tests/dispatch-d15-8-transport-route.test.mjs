/** D15.8: actual handoff, player-directed transport, custody and guidance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,planCasualtyTransport,
  stepSession,toggling,undoPlan,missionText} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {dispatchTacticalContextCommand} from '../src/breach-tactical-context-command.ts';
import {TRANSPORT_GAP,casualtyTrailingPosition}
 from '../src/breach-casualty-transport.ts';
import {downedTransportPresentation}
 from '../src/breach-capture-transport-presentation.ts';
const p=(x,y)=>({x,y});
const site=()=>({
 seed:52118,name:'D15.8 targeted route acceptance',layout:'corridor',
 rooms:[],roomCount:0,walls:[],doors:[],windows:[],cover:[],
 enemies:[p(155,200)],spawn:[p(140,200),p(140,250),p(120,230),p(120,270)],
 entrance:p(145,200),objective:p(155,200),extract:p(575,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
const make=()=>{
 const s=newSession(0,undefined,'full-view','small','capture',site());
 const carrier=team(s)[0],target=enemies(s)[0];
 assert.ok(carrier&&target);
 for(const other of team(s))if(other!==carrier)other.health=0;
 carrier.p=p(140,200);carrier.priorP={...carrier.p};
 carrier.heading=0;carrier.weaponYaw=0;
 target.p=p(155,200);target.priorP={...target.p};
 target.health=0;target.downedAt=0;target.lastDownAt=0;
 target.injuryStage=3;
 return {s,carrier,target};
};
test('D15.8 real drag body has enough clearance, carry occupies elevated shoulder slot',()=>{
 assert.equal(TRANSPORT_GAP.drag,25);
 assert.equal(TRANSPORT_GAP.carry,13);
 assert.deepEqual(casualtyTrailingPosition(p(0,0),p(3,0),0,'drag'),p(-22,0));
 const body={id:'guard',p:p(-20,0),health:0,heading:0,
  carriedById:'rook',transportMode:'carry'};
 const lead={id:'rook',p:p(0,0),health:4,heading:0,carryingId:'guard'};
 assert.equal(downedTransportPresentation(body,[lead])?.lift,18);
 assert.equal(downedTransportPresentation({...body,carriedById:null},[lead]),null);
});
test('Context CARRY/DRAG queues pickup without a destination',()=>{
 for(const [action,mode] of [['ctxDragCapture','drag'],['ctxCarryCapture','carry']]){
  const {s,carrier,target}=make();
  try{
   const before=carrier.plan.length;
   const result=dispatchTacticalContextCommand({
    state:s,selected:carrier.id,actor:carrier,node:undefined,door:undefined,
    selectedActiveWatch:false,action,medicalCandidate:()=>null
   });
   assert.equal(result.handled,true);
   assert.equal(result.outcome,'accepted');
   assert.equal(result.armTransport,undefined);
   assert.equal(carrier.plan.length,before+1);
   assert.equal(carrier.plan.at(-1).patientId,target.id);
   assert.equal(carrier.plan.at(-1).transportMode,mode);
   assert.equal(carrier.plan.at(-1).transportPickup,true);
  }finally{activateSite(null);}
 }
});
test('D15.8 a player-authored multi-bend CARRY is one undoable plan',()=>{
 const {s,carrier,target}=make();
 try{
  const bends=[p(230,200),p(230,280),p(390,280)];
  assert.equal(planCasualtyTransport(s,carrier.id,target.id,
    p(390,200),'carry',bends),true);
  assert.equal(carrier.plan.length,1);
  const order=carrier.plan[0];
  assert.equal(order.kind,'evacuate');
  assert.equal(order.transportMode,'carry');
  assert.deepEqual(order.transportPath,bends);
  bends[0].x=-100;
  assert.deepEqual(order.transportPath[0],p(230,200),
    'authoring copies the input, rather than keeping mutable gesture buffers');
  assert.equal(undoPlan(s,carrier.id),true);
  assert.equal(carrier.plan.length,0);
  assert.equal(planCasualtyTransport(s,carrier.id,target.id,p(300,200),
    'carry',[p(Infinity,0)]),false);
 }finally{activateSite(null);}
});
test('D15.8 actual 60Hz carry traverses authored bends without releasing the patient',()=>{
 const {s,carrier,target}=make();
 try{
  const bends=[p(225,200),p(225,265),p(375,265)];
  assert.equal(planCasualtyTransport(s,carrier.id,target.id,
    p(390,200),'carry',bends),true);
  toggling(s);
  let acquired=false,observedBend=false,observedAdvance=false;
  let traveled=0;
  for(let i=0;i<1850&&s.phase==='running';i++){
   const last={...carrier.p};
   stepSession(s,1/60);
   if(carrier.carryingId===target.id){
    acquired=true;
    assert.equal(target.carriedById,carrier.id);
    assert.equal(target.transportMode,'carry');
    traveled+=Math.hypot(carrier.p.x-last.x,carrier.p.y-last.y);
    if(carrier.p.y>=238)observedBend=true;
    if(carrier.plan[0]?.kind==='evacuate'&&
        (carrier.plan[0].transportPath?.length??3)<3)observedAdvance=true;
   }
   if(observedBend&&observedAdvance&&traveled>45)break;
  }
  assert.ok(acquired,'CARRY must actually pick up the downed red target at GO');
  assert.ok(traveled>45,'CARRY must travel, not stand at pickup indefinitely');
  assert.ok(observedAdvance,'EVACUATE must advance to next authored bend');
  assert.ok(observedBend,'the carrier must actually turn along the drawn path');
  assert.equal(carrier.carryingId,target.id,
    'physical custody survives route bends');
 }finally{activateSite(null);}
});
test('D15.8 capture status makes conditional treatment discoverable, not mandatory',()=>{
 const {s}=make();
 try{
  s.mission='secure';
  assert.match(missionText(s),/TREAT IF BLEEDING/);
  s.mission='extract';
  assert.match(missionText(s),/TREAT IF BLEEDING/);
  assert.match(missionText(s),/ESCORT\/DRAG\/CARRY/);
 }finally{activateSite(null);}
});
