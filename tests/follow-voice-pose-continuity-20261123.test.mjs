import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,enemies,planSuspectEscort,planCivilianInteraction,
 toggling,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {commitSuspectSurrender,SUSPECT_CHALLENGE_RANGE,
 SUSPECT_ESCORT_VOICE_RANGE} from '../src/breach-suspect-compliance.ts';
import {CIVILIAN_VOICE_RANGE} from '../src/breach-civilian-context-selection.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPhysicalityAt} from '../src/breach-encounter-physicality.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig}
 from '../src/breach-civilian-visuals.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';
import {hostileNpcTransitionKey,hostileCustodyWalkBlend,
 HOSTILE_ESCORT_POSE_SECONDS}
 from '../src/breach-hostile-pose-transition.ts';

const approx=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps, a+' != '+b);
const snapshot=(rig,id)=>Array.from(inspectOperatorPoseOutput(rig).slots
 .find(s=>s.id===id).values);
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const source={x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:true,
 downProgress:1,aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,poseDiagnostics:false};

test('spoken FOLLOW ME has a larger range than challenge or physical restraint',()=>{
 assert.ok(SUSPECT_ESCORT_VOICE_RANGE>SUSPECT_CHALLENGE_RANGE);
 assert.ok(CIVILIAN_VOICE_RANGE>100);
 const interactions=readFileSync(new URL('../src/breach-order-interactions.ts',
   import.meta.url),'utf8');
 const escort=interactions.split("if(n.interaction==='escort-suspect'||")[1]
   .split("if(n.interaction==='search-suspect')")[0];
 assert.match(escort,/range>SUSPECT_ESCORT_VOICE_RANGE/);
 assert.doesNotMatch(escort,/approach\(a,suspect\.p/);
 const civilian=interactions.split("if(n.objectId.startsWith('civ:')&&")[1]
   .split("if(n.interaction==='release-capture-target')")[0]??'';
 assert.ok(civilian.length>=0);
});

test('spoken suspect FOLLOW ME is issued from present position BEFORE a queued task',()=>{
 const s=newSession(0,4);
 try{
  const a=team(s)[0],suspect=enemies(s)[0];
  for(const blue of team(s))if(blue!==a)blue.health=0;
  for(const red of enemies(s))if(red!==suspect)red.health=0;
  suspect.p={x:a.p.x+15,y:a.p.y};
  suspect.priorP={...suspect.p};
  a.heading=0;a.weaponYaw=0;
  a.awareness.visualProgress[suspect.id]=1;
  assert.equal(commitSuspectSurrender(s,suspect,()=>{},()=>{}),true);
  a.plan.push({id:s.nextId++,kind:'wait',
   p:{x:a.p.x+120,y:a.p.y},duration:6});
  const before={...a.p};
  assert.equal(planSuspectEscort(s,a.id,suspect.id,'escort'),true);
  assert.equal(a.plan[0].interaction,'escort-suspect');
  assert.deepEqual(a.plan[0].p,before);
  toggling(s);
  for(let i=0;i<100&&suspect.escortLeaderId!==a.id;i++)
   stepSession(s,1/60);
  assert.equal(suspect.escortLeaderId,a.id);
  assert.ok(suspect.lastEscortCommandAt>=0);
  assert.ok(Math.hypot(a.p.x-before.x,a.p.y-before.y)<.5,
   'speaker must not walk to the suspect or distant pending waypoint');
 }finally{activateSite(null);}
});

test('civilian FOLLOW is also a first-position vocal instruction',()=>{
 const s=newSession(),a=team(s)[0];
 try{
  a.heading=0;a.weaponYaw=0;
  const c=createCivilian({id:'civ:voice-no-approach',role:'rescue',
   persona:'steady',activity:'waiting',
   position:{x:a.p.x+14,y:a.p.y},heading:0,
   roomId:'r',appearanceSeed:15,isRescueTarget:true});
  s.civilians.push(c);
  s.missionType='rescue';s.mission='extract';
  s.rescue={p:{...c.p},following:null,trail:[]};
  s.scenario.extract={x:3000,y:3000};
  a.plan.push({id:s.nextId++,kind:'wait',
   p:{x:a.p.x+120,y:a.p.y},duration:6});
  const before={...a.p};
  assert.equal(planCivilianInteraction(s,a.id,c.id,'follow'),true);
  assert.equal(a.plan[0].interaction,'follow-civilian');
  assert.deepEqual(a.plan[0].p,before);
  toggling(s);
  for(let i=0;i<45&&c.following!==a.id;i++)stepSession(s,1/60);
  assert.equal(c.following,a.id);
  assert.ok(Math.hypot(a.p.x-before.x,a.p.y-before.y)<.5);
 }finally{activateSite(null);}
});

test('hostile key inventory and source-timed escort pose are continuous in both directions',()=>{
 const a={health:2,injuryStage:0,surrendered:false,restrained:false,
  escortLeaderId:null,suspectEscapeMode:null,lastEscortCommandAt:undefined};
 assert.equal(hostileNpcTransitionKey(a),'hostile/active');
 a.injuryStage=1;
 assert.equal(hostileNpcTransitionKey(a),'hostile/wounded');
 a.surrendered=true;
 assert.equal(hostileNpcTransitionKey(a),'hostile/surrender');
 a.restrained=true;
 assert.equal(hostileNpcTransitionKey(a),'hostile/restrained');
 a.escortLeaderId='rook';a.lastEscortCommandAt=10;
 assert.equal(hostileNpcTransitionKey(a),'hostile/escort');
 approx(hostileCustodyWalkBlend(a,10),0);
 const mid=hostileCustodyWalkBlend(a,10+HOSTILE_ESCORT_POSE_SECONDS/2);
 assert.ok(mid>.3&&mid<.7);
 approx(hostileCustodyWalkBlend(a,11),1);
 a.escortLeaderId=null;a.lastEscortCommandAt=12;
 approx(hostileCustodyWalkBlend(a,12),1);
 assert.ok(hostileCustodyWalkBlend(a,12.2)<1);
 approx(hostileCustodyWalkBlend(a,13),0);
 a.lastEscortCommandAt=undefined;
 approx(hostileCustodyWalkBlend(a,13),0,'legacy frame');
 a.suspectEscapeMode='flee';
 approx(hostileCustodyWalkBlend(a,13),1);
 assert.equal(hostileNpcTransitionKey(a),'hostile/escape');
 a.health=0;
 assert.equal(hostileNpcTransitionKey(a),'hostile/down');
});

test('live hostile surrender to restrained starts from the displayed wrist, not a pop',()=>{
 const r=createOperatorRig('reg-suspect','red',true);
 try{
  poseOperator(r,{...source,npcTransitionKey:'hostile/surrender'},0);
  const before=snapshot(r,'arm-0-hand');
  poseOperator(r,{...source,seconds:1+1/60,restrained:true,
   npcTransitionKey:'hostile/restrained',npcTransitionDuration:.34},0);
  assert.ok(dist(before,snapshot(r,'arm-0-hand'))<1e-6);
  poseOperator(r,{...source,seconds:1.17,restrained:true,
   npcTransitionKey:'hostile/restrained',npcTransitionDuration:.34},0);
  assert.ok(dist(before,snapshot(r,'arm-0-hand'))>.05);
  for(const t of [1.22,1.28,1.40]){
   poseOperator(r,{...source,seconds:t,restrained:true,
    npcTransitionKey:'hostile/restrained',npcTransitionDuration:.34},0);
   assert.ok(inspectOperatorPoseOutput(r).slots.every(s=>
    s.values.every(Number.isFinite)));
  }
 }finally{r.dispose();}
});

test('civilian restraint transitions arms and knee together after real cuff contact',()=>{
 const c=createCivilian({id:'civ:blend',role:'visitor',
  persona:'steady',activity:'idle',position:{x:100,y:100},
  heading:0,roomId:'room',appearanceSeed:8});
 c.state='compliant';c.stateSince=0;
 const r=createCivilianRig(c);
 try{
  updateCivilianRig(r,c,5);
  const initialArm=r.leftArm.rotation.z;
  const initialLeg=r.leftLeg.position.y;
  c.restrained=true;c.lastContactAt=5;c.lastContactPoint={x:105,y:100};
  const initial=civilianPhysicalityAt(c,5);
  approx(initial.restraintBlend,0);
  updateCivilianRig(r,c,5);
  approx(r.leftArm.rotation.z,initialArm);
  approx(r.leftLeg.position.y,initialLeg);
  const middle=civilianPhysicalityAt(c,5.22);
  assert.ok(middle.restraintBlend>.35&&middle.restraintBlend<.65);
  updateCivilianRig(r,c,5.22);
  assert.ok(r.leftArm.rotation.z>initialArm);
  updateCivilianRig(r,c,5.5);
  approx(r.leftArm.rotation.z,-.45);
  approx(civilianPhysicalityAt(c,5.5).restraintBlend,1);
  for(const mesh of [r.leftArm,r.rightArm,r.leftLeg,r.rightLeg])
   assert.ok(mesh.position.toArray().every(Number.isFinite));
 }finally{disposeCivilianRig(r);}
});
