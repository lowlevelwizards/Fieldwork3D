/** D15.8: actual handoff, player-directed transport, custody and guidance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,planCasualtyTransport,
  stepSession,toggling,undoPlan,missionText,planCasualtyPickup,planMove,planCaptureTransportRelease} from '../src/breach-game.ts';
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

test('pickup latch survives ordinary movement and explicit release for friendly and suspect',()=>{
 for(const friendly of [false,true])for(const mode of ['drag','carry']){
  const {s,carrier,target}=make();
  try{
   const patient=friendly?team(s)[1]:target;
   if(friendly){patient.p=p(155,200);patient.priorP={...patient.p};
    patient.health=0;patient.downedAt=0;patient.injuryStage=3;
    target.p=p(480,400);target.priorP={...target.p};}
   assert.equal(planCasualtyPickup(s,carrier.id,patient.id,mode),true);
   assert.equal(planMove(s,carrier.id,p(235,200)),true);
   assert.equal(planMove(s,carrier.id,p(235,270)),true);
   toggling(s);
   for(let i=0;i<1800&&s.phase==='running';i++){
    stepSession(s,1/60);
    if(carrier.carryingId===patient.id&&carrier.p.y>245)break;
   }
   assert.equal(carrier.carryingId,patient.id);
   assert.equal(patient.carriedById,carrier.id);
   assert.equal(patient.transportMode,mode);
   assert.ok(carrier.p.y>245,'ordinary MOVE must execute while holding casualty');
   assert.ok(patient.p.y>215,'casualty follows through the bend');
   assert.equal(carrier.retentionTransition?.weight,1,'issued sling remains supported during real movement');
   assert.ok(carrier.retentionTransition?.desired,'custody keeps retention requested');
   toggling(s);
   assert.equal(planCaptureTransportRelease(s,carrier.id),true);
   toggling(s);
   for(let i=0;i<180&&s.phase==='running'&&carrier.carryingId;i++)stepSession(s,1/60);
   assert.equal(carrier.carryingId,null);
   assert.equal(patient.carriedById,null);
  }finally{activateSite(null);}
 }
});
