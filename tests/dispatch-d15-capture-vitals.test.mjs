import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,enemies,toggling,stepSession,
  planMedicalTreatment,debrief,missionText} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {advanceMedicalDoorPhase} from '../src/breach-simulation-medical-door-phase.ts';
import {captureVitalStatus,livingCaptureStatus,recordActualDown,
 advanceDownedVitals,FATAL_BLOOD_LOSS,CAPTURE_VITAL_CHECK_SECONDS}
 from '../src/breach-capture-vitals.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {assessOperation} from '../src/breach-operations.ts';
import {captureTargetTransportEligible} from '../src/breach-capture-transport-policy.ts';
const pt=(x,y)=>({x,y});
const site=()=>({
 seed:71515,name:'D15.7 medical capture contract',
 layout:'corridor',rooms:[{id:'floor',x:110,y:140,w:420,h:260,
  kind:'room',purpose:'floor',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[pt(265,255)],
 spawn:[pt(225,255),pt(140,240),pt(145,290),pt(145,340)],
 entrance:pt(225,255),objective:pt(265,255),
 extract:pt(575,255),bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
function fixture(){
 const s=newSession(0,undefined,'full-view','small','capture',site());
 const a=team(s)[0],target=enemies(s).find(o=>o.id===s.captureTarget);
 assert.ok(target);
 for(const b of team(s))if(b!==a)b.health=0;
 for(const e of enemies(s))if(e!==target)e.health=0;
 a.p=pt(250,260);a.priorP={...a.p};
 target.p=pt(265,255);target.priorP={...target.p};
 return {s,a,target};
}
const wound=(bleeding=3,stabilized=false)=>({
 id:77,region:'torso',severity:2,bleeding,stabilized,
 createdAt:1,treatments:stabilized?1:0
});
const down=(a,at=0,bleeding=3)=>{
 a.health=0;a.injuryStage=3;a.surrendered=false;
 a.medical.wounds=[wound(bleeding)];
 recordActualDown(a,at);
};
test('D15.7 zero HP is not proof of death or unverified life',()=>{
 const {s,target}=fixture();
 try{
  assert.equal(captureVitalStatus(target),'conscious');
  target.health=0;target.injuryStage=3;
  assert.equal(captureVitalStatus(target),'unverified');
  assert.equal(livingCaptureStatus('unverified'),false);
  recordActualDown(target,4);
  assert.equal(captureVitalStatus(target),'incapacitated');
  target.medical.wounds=[wound()];
  assert.equal(captureVitalStatus(target),'critical');
  target.medical.wounds[0].stabilized=true;
  assert.equal(captureVitalStatus(target),'stabilized');
  target.deathAt=5;
  assert.equal(captureVitalStatus(target),'deceased');
  assert.equal(livingCaptureStatus('deceased'),false);
  target.health=3;
  assert.equal(captureVitalStatus(target),'deceased',
    'irreversible confirmed fatality outranks inconsistent HP');
 }finally{activateSite(null);}
});
test('D15.7 wounded actual down can expire only by authoritative untreated loss',()=>{
 const {s,a,target}=fixture();
 try{
  down(target,0);
  target.medical.bloodLoss=FATAL_BLOOD_LOSS-.0001;
  target.lastDownById=a.id;
  s.seconds=22;
  const events=[];
  const port={notify:(_s,message)=>events.push(message),
   battleEvent:(_s,kind)=>events.push(kind)};
  advanceMedicalDoorPhase(s,1/60,port);
  assert.equal(target.deathAt,s.seconds);
  assert.equal(captureVitalStatus(target),'deceased');
  assert.equal(s.deaths,1,'fatality count is not a down count');
  assert.equal(a.kills,1,'credited at actual death, not at incapacitation');
  assert.equal(events.some(t=>String(t).includes(target.name)),false,
   'hidden red fatality is not broadcast as live tactical information');
  advanceMedicalDoorPhase(s,1/60,port);
  assert.equal(s.deaths,1,'irreversible death cannot be double-awarded');
  assert.equal(a.kills,1);
 }finally{activateSite(null);}
});
test('D15.7 stabilization stops continued fatal bleeding but does not revive downed',()=>{
 const {s,target}=fixture();
 try{
  down(target,0);target.medical.bloodLoss=3.99;
  target.medical.wounds[0].stabilized=true;
  assert.equal(advanceDownedVitals(target,1/60,40),false);
  assert.equal(target.medical.bloodLoss,3.99);
  assert.equal(target.health,0);
  assert.equal(target.deathAt,null);
  assert.equal(captureVitalStatus(target),'stabilized');
 }finally{activateSite(null);}
});
test('D15.7 observed fatal target defeats CAPTURE and cannot earn living extraction',()=>{
 const {s,a,target}=fixture();
 try{
  down(target);target.deathAt=2;
  a.p={...target.p};a.priorP={...a.p};
  s.mission='extract';s.captureSecured=true;
  toggling(s);stepSession(s,1/60);
  assert.equal(s.phase,'lost');
  assert.equal(s.mission!=='done',true);
  assert.equal(debrief(s).captureOutcome,'deceased');
  assert.equal(debrief(s).captureDeathAt,2);
  assert.ok(s.battleEvents.some(e=>e.meta?.action==='capture-target-deceased'));
  assert.equal(captureTargetTransportEligible(s,target,a),false);
 }finally{activateSite(null);}
});
test('D15.7 unknown historical body needs uninterrupted physical vitality check',()=>{
 const {s,a,target}=fixture();
 try{
  target.health=0;target.injuryStage=3;
  a.p={...target.p};a.priorP={...a.p};
  toggling(s);stepSession(s,1/60);
  assert.equal(s.mission,'secure');
  assert.equal(target.downedAt,null);
  assert.equal(s.captureSecured,false);
  for(let i=0;i<Math.floor(CAPTURE_VITAL_CHECK_SECONDS*60)/2;i++)
   stepSession(s,1/60);
  a.p=pt(450,380);a.priorP={...a.p};
  stepSession(s,1/60);
  assert.equal(s.holdTime,0,'partial assessment cannot complete across a gap');
  a.p={...target.p};a.priorP={...a.p};
  for(let i=0;i<90&&s.mission==='secure';i++)stepSession(s,1/60);
  assert.equal(s.mission,'extract');
  assert.equal(s.captureSecured,true);
  assert.equal(captureVitalStatus(target),'incapacitated');
  assert.ok(s.battleEvents.some(e=>e.meta?.action==='capture-vitals-checked'));
 }finally{activateSite(null);}
});
test('D15.7 a live red designated target accepts actual timed blue treatment',()=>{
 const {s,a,target}=fixture();
 try{
  down(target);
  a.p=pt(245,255);a.priorP={...a.p};
  assert.equal(planMedicalTreatment(s,a.id,target.id),true);
  assert.equal(a.plan.at(-1)?.kind,'treat');
  const supplyBefore=JSON.stringify(a.medicalSupplies);
  assert.equal(target.medical.wounds[0].stabilized,false);
  toggling(s);
  for(let i=0;i<460&&s.phase==='running'&&
     !target.medical.wounds[0].stabilized;i++)stepSession(s,1/60);
  assert.equal(target.medical.wounds[0].stabilized,true);
  assert.equal(target.health,0,'a dressing cannot magically revive the target');
  assert.equal(captureVitalStatus(target),'stabilized');
  assert.notEqual(JSON.stringify(a.medicalSupplies),supplyBefore);
 }finally{activateSite(null);}
});
test('D15.7 dead target never accepts treatment or new custody order',()=>{
 const {s,a,target}=fixture();
 try{
  down(target);target.deathAt=4;
  assert.equal(planMedicalTreatment(s,a.id,target.id),false);
  assert.equal(captureTargetTransportEligible(s,target,a),false);
 }finally{activateSite(null);}
});
test('D15.7 final score and after-action distinguish critical, treated, deceased',()=>{
 const {s,target}=fixture();
 try{
  down(target);
  s.captureSecured=true;s.phase='won';s.mission='done';
  let report=debrief(s);
  assert.equal(report.captureVitals,'critical');
  assert.equal(report.captureOutcome,'critical');
  assert.ok(report.scoreComponents.some(c=>
    c.label==='CAPTIVE IN CRITICAL CONDITION'&&c.amount===-8));
  target.medical.wounds[0].stabilized=true;
  report=debrief(s);
  assert.equal(report.captureOutcome,'stabilized');
  assert.ok(report.scoreComponents.some(c=>
    c.label==='CAPTIVE STABILIZED'&&c.amount===5));
  target.deathAt=14;report=debrief(s);
  assert.equal(report.captureOutcome,'deceased');
  const input={kind:'capture',outcome:'success',elapsed:100,
   casualties:0,teamSize:4,shots:3,hits:2,
   objective:true,extracted:4,captureOutcome:'stabilized'};
  assert.ok(assessOperation(input,true).scoreComponents.some(c=>
    c.label==='CAPTIVE STABILIZED'));
  assert.match(missionText({...s,phase:'running',mission:'extract'}),
   /LIVING CAPTIVE/);
 }finally{activateSite(null);}
});
test('D15.7 film rewind restores earlier life, fatal and unverified legacy states',()=>{
 const {s,target}=fixture();
 try{
  const standing=snapshot(s);
  down(target,7);
  const critical=snapshot(s);
  target.deathAt=13;target.medical.bloodLoss=4;
  const deceased=snapshot(s);
  applyReplayFrame(s,critical);
  assert.equal(captureVitalStatus(target),'critical');
  assert.equal(target.deathAt,null);
  applyReplayFrame(s,deceased);
  assert.equal(captureVitalStatus(target),'deceased');
  assert.equal(target.deathAt,13);
  applyReplayFrame(s,standing);
  assert.equal(captureVitalStatus(target),'conscious');
  assert.equal(target.downedAt,null);
  const legacy={...critical,actors:critical.actors.map(x=>
    x.id===target.id?((({downedAt,deathAt,lastDownById,...rest})=>rest)(x)):x)};
  applyReplayFrame(s,legacy);
  assert.equal(target.downedAt,null);
  assert.equal(target.deathAt,null);
  assert.equal(captureVitalStatus(target),'unverified');
 }finally{activateSite(null);}
});
test('D15.7 live shot and med deterioration both publish real down origins',()=>{
 const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 assert.match(src('breach-shot-resolution.ts'),/recordActualDown\(target,s\.seconds,a\.id\)/);
 assert.match(src('breach-simulation-medical-door-phase.ts'),
  /recordActualDown\(casualty,s\.seconds\)/);
 assert.match(src('breach-game.ts'),/captureVitalStatus\(prisoner\)/);
 assert.match(src('breach-order-medical.ts'),/captureVitalStatus\(patient\)==='deceased'/);
 assert.match(src('ui/breach-after-action-mission-details.ts'),
  /CAPTURE TARGET · MEDICAL OUTCOME/);
});
