/** Roadmap 2 Stage 11 — stable, overhaul-ready animation boundaries.
 * Runtime parity is exercised alongside the frozen animation/IK suites.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {beginOperatorAnimationFrame,sampleOperatorTurnAngles}
 from '../src/breach-operator-animation-frame.ts';
import {sampleOperatorFootContacts}
 from '../src/breach-operator-lower-body.ts';

const src=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
const pose={x:20,z:30,heading:0,velocity:0,seconds:3,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,aimBlend:0,deterministic:true};

test('one public pose API; type contract and rig construction do not own solving',()=>{
 const rig=src('breach-operator-rig.ts');
 const controller=src('breach-operator-animation-controller.ts');
 const contract=src('breach-operator-animation-contract.ts');
 assert.match(rig,/export \{poseOperator\} from '.\/breach-operator-animation-controller.ts'/);
 assert.match(rig,/export type \{OperatorPose\} from '.\/breach-operator-animation-contract.ts'/);
 assert.match(contract,/export type OperatorPose=\{/);
 assert.doesNotMatch(rig,/function poseOperator\(/);
 assert.doesNotMatch(rig,/function solveTwoBone\(/);
 assert.match(controller,/export function poseOperator\(/);
 for(const banned of [/\bstepSession\(/,/\brunCombat\./,/requestAnimationFrame\(/,
   /Math\.random\(/,/setInterval\(/]){
  for(const module of [controller,src('breach-operator-animation-frame.ts'),
   src('breach-operator-appearance.ts'),src('breach-operator-lower-body.ts')])
   assert.doesNotMatch(module,banned);
 }
});

test('frame stages execute once in canonical order, leg IK cannot schedule contacts',()=>{
 const controller=src('breach-operator-animation-controller.ts');
 const stages=['beginOperatorAnimationFrame(r,p,dt)',
   'updateOperatorAppearance(r,p)',
   'sampleOperatorFootContacts(r,p,physicalSpeed,moving,travelYaw)',
   'applyOperatorLegIK(r,p,scratch,targets,kick,headingYaw,smooth)',
   'finishOperatorPoseFrame(r,p)'];
 const indices=stages.map(v=>controller.indexOf(v));
 assert.ok(indices.every(v=>v>=0),JSON.stringify(indices));
 assert.deepEqual(indices,[...indices].sort((a,b)=>a-b));
 const lower=src('breach-operator-lower-body.ts');
 assert.match(lower,/validatedReplayFeet\(gaitInput,p.replayFeet\)/);
 assert.match(lower,/advanceFootsteps\(r.footsteps,gaitInput\)/);
 assert.match(lower,/function applyOperatorLegIK\(/);
 assert.doesNotMatch(controller,/advanceFootsteps\(/);
 assert.doesNotMatch(lower,/r\.footsteps\.feet\[[^\]]+\]\.plantedAt\s*=/);
});

test('frame scratch is reused and backward/long seeks discard frame dt',()=>{
 const rig=createOperatorRig('stage11-frame','blue',true);
 try{
  const p={...pose};
  const a=beginOperatorAnimationFrame(rig,p,1/60);
  const b=beginOperatorAnimationFrame(rig,p,1/60);
  assert.strictEqual(a.scratch,b.scratch);
  assert.equal(a.discontinuity,false);
  rig.lastTime=8;
  const back=beginOperatorAnimationFrame(rig,p,1/60);
  assert.equal(back.discontinuity,true);
  assert.equal(back.dt,0);
  assert.equal(rig.lastTime,p.seconds);
  const neg=beginOperatorAnimationFrame(rig,p,-1);
  assert.equal(neg.discontinuity,true);
  assert.equal(neg.dt,0);
  assert.equal(beginOperatorAnimationFrame(rig,p,10).dt,.08);
  const turns=sampleOperatorTurnAngles(rig,p,{chestYaw:.2,headYaw:.4},
   1/60,true);
  assert.equal(turns.chest,.2);
  assert.equal(turns.head,.4);
  assert.equal(sampleOperatorTurnAngles(rig,p,{chestYaw:.8,headYaw:1},
   1/60,true).chest,.8);
 }finally{rig.dispose();}
});

test('replay foot contacts remain authoritative when posed and do not advance scheduler',()=>{
 const rig=createOperatorRig('stage11-feet','blue',true);
 const feet=[
  {position:{x:20,y:24},height:0,worldYaw:0,phase:'planted',contact:true},
  {position:{x:20,y:36},height:0,worldYaw:0,phase:'planted',contact:true}
 ];
 try{
  const sample={...pose,replayFeet:feet};
  const before=JSON.stringify(feet);
  const target=sampleOperatorFootContacts(rig,sample,0,0,0);
  assert.deepEqual(target,feet);
  assert.equal(rig.footsteps.initialized,false,
   'recorded replay contacts must not advance the live foot scheduler');
  poseOperator(rig,sample,1/60);
  assert.equal(JSON.stringify(feet),before,'IK must not mutate replay contacts');
  assert.equal(rig.feet[0].anchor.x,20);
  assert.equal(rig.feet[0].anchor.z,24);
  assert.equal(rig.feet[1].anchor.x,20);
  assert.equal(rig.feet[1].anchor.z,36);
  assert.ok(rig.feet.every(f=>Number.isFinite(f.shoe.position.x)));
 }finally{rig.dispose();}
});

test('pose evaluation is repeatable and reversible across appearance edits and seek',()=>{
 const rig=createOperatorRig('stage11-parity','blue',true);
 try{
  poseOperator(rig,pose,1/60);
  const baseline=rig.root.userData.fieldworkLightingAppearanceKey;
  const initial={
   weapon:rig.weapon.position.clone(),chest:rig.chest.position.clone(),
   left:rig.arms[0].hand.position.clone(),
   right:rig.arms[1].hand.position.clone(),
   lastTime:rig.lastTime
  };
  poseOperator(rig,pose,1/60);
  assert.ok(rig.weapon.position.distanceTo(initial.weapon)<1e-6);
  assert.ok(rig.chest.position.distanceTo(initial.chest)<1e-6);
  assert.ok(rig.arms[0].hand.position.distanceTo(initial.left)<1e-6);
  assert.ok(rig.arms[1].hand.position.distanceTo(initial.right)<1e-6);
  assert.equal(rig.lastTime,initial.lastTime);
  poseOperator(rig,{...pose,seconds:7,appearanceSeed:9},.01);
  const changed=rig.root.userData.fieldworkLightingAppearanceKey;
  assert.notEqual(changed,baseline);
  poseOperator(rig,pose,-1);
  assert.equal(rig.root.userData.fieldworkLightingAppearanceKey,baseline);
  assert.equal(rig.lastTime,pose.seconds);
 }finally{rig.dispose();}
});
