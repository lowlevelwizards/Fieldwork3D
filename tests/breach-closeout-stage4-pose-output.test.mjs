/** Closeout Stage 4 — unified pose output ownership.
 * Existing silhouettes, IK, reload/foot contact and deterministic replay
 * remain golden. The output buffers are presentation-only and rig-scoped.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const base={
 x:0,z:0,heading:.38,travelYaw:.38,pelvisYaw:-.38,
 velocity:0,turning:0,seconds:2,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,aimBlend:0,shotHeading:.38,
 poseV3Preview:true,poseV4ReloadPreview:true,deterministic:true
};
const config=()=>selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const snapshots=r=>{
 const frame=inspectOperatorPoseOutput(r);
 assert.ok(frame?.valid);
 return Object.fromEntries(frame.slots.map(x=>[x.id,Array.from(x.values)]));
};
const check=r=>{
 const frame=inspectOperatorPoseOutput(r);
 assert.ok(frame?.valid);
 const ids=new Set(),objects=new Set();
 for(const slot of frame.slots){
  assert.ok(!ids.has(slot.id));ids.add(slot.id);
  assert.ok(!objects.has(slot.node));objects.add(slot.node);
  const n=slot.node,v=slot.values;
  assert.deepEqual(Array.from(v),[
   n.position.x,n.position.y,n.position.z,
   n.quaternion.x,n.quaternion.y,n.quaternion.z,n.quaternion.w,
   n.scale.x,n.scale.y,n.scale.z,n.visible?1:0],slot.id);
 }
 assert.equal(frame.slotCount,frame.slots.length);
 assert.ok(['root','pelvis','chest','head','held-weapon',
  'dropped-weapon','leg-0-shoe','leg-1-shoe','arm-0-hand',
  'arm-1-hand','inserted-magazine','hand-magazine',
  'detached-magazine','medical-item','sling-0'].every(id=>ids.has(id)));
 assert.ok(frame.slots.every(s=>['frame','body','lower-body',
  'upper-body','weapon','attachments'].includes(s.owner)));
};
test('Stage 4: exactly one bounded pose-output commit for every posed frame',()=>{
 const rig=createOperatorRig('s4-output','blue',true);
 try{
  assert.equal(inspectOperatorPoseOutput(rig),null);
  poseOperator(rig,base,1/60);
  check(rig);
  const first=inspectOperatorPoseOutput(rig),buf=first.slots[0].values;
  assert.equal(first.generation,1);
  for(let i=0;i<4;i++){
   poseOperator(rig,base,1/60);
   check(rig);
  }
  assert.strictEqual(inspectOperatorPoseOutput(rig),first);
  assert.strictEqual(first.slots[0].values,buf);
  assert.equal(first.generation,5,'one commit per poseOperator invocation');
 }finally{rig.dispose();}
 assert.equal(inspectOperatorPoseOutput(rig),null);
});
test('Stage 4: distinct rigs never share output arrays or transform owners',()=>{
 const a=createOperatorRig('s4-one','blue',true);
 const b=createOperatorRig('s4-two','blue',true);
 try{
  poseOperator(a,base,0);poseOperator(b,{...base,heading:1},0);
  const x=inspectOperatorPoseOutput(a),y=inspectOperatorPoseOutput(b);
  assert.notStrictEqual(x,y);
  for(let i=0;i<x.slots.length;i++){
   assert.notStrictEqual(x.slots[i].node,y.slots[i].node);
   assert.notStrictEqual(x.slots[i].values,y.slots[i].values);
  }
  const frozen=snapshots(a);
  poseOperator(b,{...base,heading:2,seconds:9},0);
  assert.deepEqual(snapshots(a),frozen);
 }finally{a.dispose();b.dispose();}
});
test('Stage 4: live/replay/Lab presentation paths publish the same deterministic output',()=>{
 const cases=[
  {name:'low-ready',pose:{...base,weaponConfiguration:config(),handlingOverride:'low'}},
  {name:'short-stock',pose:{...base,weaponConfiguration:config(),handlingOverride:'short',
    shortCompression:.65}},
  {name:'reload',pose:{...base,weaponConfiguration:config(),reload:1.1,
    reloadDuration:1.8,reloadMode:'emergency'}},
  {name:'down',pose:{...base,down:true,downProgress:.8,
    hitAge:.15,hitRegion:'torso',downPose:'left'}},
  {name:'crouch',pose:{...base,posture:'crouch',velocity:75,stride:.41,
    gait:'walk',seconds:7}},
  {name:'surrender',pose:{...base,surrender:true,downProgress:.6}}
 ];
 for(const {name,pose} of cases){
  const live=createOperatorRig('s4-'+name,'blue',true);
  const replay=createOperatorRig('s4-'+name,'blue',true);
  const lab=createOperatorRig('s4-'+name,'blue',true);
  try{
   poseOperator(live,pose,0);
   poseOperator(replay,{...pose,deterministic:true},0);
   poseOperator(lab,{...pose,deterministic:true},0);
   check(live);check(replay);check(lab);
   assert.deepEqual(snapshots(live),snapshots(replay),name+'/live replay');
   assert.deepEqual(snapshots(replay),snapshots(lab),name+'/replay lab');
  }finally{live.dispose();replay.dispose();lab.dispose();}
 }
});
test('Stage 4: replay seeks and fixed timestamps do not contaminate output frames',()=>{
 const rig=createOperatorRig('s4-rewind','blue',true);
 const first={...base,weaponConfiguration:config(),seconds:4.1};
 try{
  poseOperator(rig,first,0);
  const a=snapshots(rig);
  poseOperator(rig,{...first,seconds:7.8,aiming:true,aimBlend:1},0);
  poseOperator(rig,{...first,seconds:4.1},-1);
  assert.deepEqual(snapshots(rig),a,'backward seek must restore original weapon/limb output');
  poseOperator(rig,first,0);
  assert.deepEqual(snapshots(rig),a,'repeated timestamp must be idempotent');
  assert.equal(inspectOperatorPoseOutput(rig).time,first.seconds);
 }finally{rig.dispose();}
});
test('Stage 4: original gameplay input remains read-only after posing',()=>{
 const rig=createOperatorRig('s4-immutable','blue',true);
 const feet=Object.freeze([
  Object.freeze({position:Object.freeze({x:12,y:8}),height:0,
   worldYaw:0,phase:'planted',contact:true}),
  Object.freeze({position:Object.freeze({x:12,y:20}),height:0,
   worldYaw:0,phase:'planted',contact:true})
 ]);
 const pose=Object.freeze({...base,replayFeet:feet});
 const before=JSON.stringify(pose);
 try{
  poseOperator(rig,pose,0);
  assert.equal(JSON.stringify(pose),before);
  check(rig);
 }finally{rig.dispose();}
});
test('Stage 4: exactly one public output writer after trauma and sling; no new clock',()=>{
 const script=readFileSync(new URL('../src/breach-operator-animation-controller.ts',
  import.meta.url),'utf8');
 const out=readFileSync(new URL('../src/breach-operator-pose-output.ts',
  import.meta.url),'utf8');
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.equal((script.match(/commitOperatorPoseOutput\(r,p\)/g)??[]).length,1);
 const final=script.lastIndexOf('finishOperatorPoseFrame(r,p)');
 const commit=script.lastIndexOf('commitOperatorPoseOutput(r,p)');
 assert.ok(final>=0&&commit>final);
 assert.ok(script.lastIndexOf('applyOperatorTraumaPose(r,p,downProgress)')<final);
 assert.ok(script.lastIndexOf('updateOperatorSlingPose(r,p,physicalSpeed,')<final);
 assert.match(rig,/resetOperatorPoseOutput\(rig\)/);
 assert.match(rig,/export \{poseOperator\} from '.\/breach-operator-animation-controller.ts'/);
 for(const source of [out,script]){
  assert.doesNotMatch(source,/\bstepSession\(/);
  assert.doesNotMatch(source,/requestAnimationFrame\(/);
  assert.doesNotMatch(source,/Math\.random\(/);
 }
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 for(const caller of [lab,studio,scene])
  assert.match(caller,/poseOperator\(/);
});
