/** B4 — direct upper-body output, handoffs and live/replay parity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
import {beginOperatorArmPose,setOperatorArmSegments,setOperatorHandPose,
 rotateOperatorSupportHand,operatorHandTransform,operatorHandEuler,
 finishOperatorArmPose} from '../src/breach-operator-upper-body-output.ts';
import {alignSegment} from '../src/breach-ik.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {armCavityStrength} from '../src/operator-pose-cavity-lighting.ts';

const base={
 x:0,z:0,heading:.35,travelYaw:.35,pelvisYaw:-.35,velocity:0,
 turning:0,seconds:2,stride:0,posture:'stand',injury:0,
 weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,aimBlend:0,shotHeading:.35,
 poseV3Preview:true,poseV4ReloadPreview:true,deterministic:true
};
const config=(weapon,id)=>selectWeaponFamilyPreset(
 initialWeaponConfiguration(weapon),id);
const geometry=node=>[
 node.position.x,node.position.y,node.position.z,
 node.quaternion.x,node.quaternion.y,node.quaternion.z,node.quaternion.w,
 node.scale.x,node.scale.y,node.scale.z,node.visible?1:0
];
const snapshot=rig=>{
 const o=inspectOperatorPoseOutput(rig);
 assert.ok(o?.valid);
 return Object.fromEntries(o.slots.map(s=>[s.id,Array.from(s.values)]));
};
const arms=rig=>rig.arms.flatMap(a=>[a.upper,a.lower,a.hand]);
const close=(a,b,name,eps=1e-10)=>{
 assert.equal(a.length,b.length,name+' length');
 for(let i=0;i<a.length;i++)
  assert.ok(Math.abs(a[i]-b[i])<=eps,
   name+' component '+i+': '+a[i]+' vs '+b[i]);
};
test('B4: arm output matches the frozen pre-B4 mesh math without writing meshes',()=>{
 const rig=createOperatorRig('b4-direct-golden','blue',true);
 const scratch=createOperatorPoseScratch();
 try{
  const out=beginOperatorArmPose(rig,scratch);
  const old=arms(rig).map(geometry);
  const from=[
   new THREE.Vector3(-3,5,-7),
   new THREE.Vector3(-3,5,7)
  ];
  const elbow=[
   new THREE.Vector3(5,-3,-12),
   new THREE.Vector3(5,-3,12)
  ];
  const wrist=[
   new THREE.Vector3(10,-8,-8),
   new THREE.Vector3(10,-8,8)
  ];
  const reference=arms(rig).map(mesh=>{
   const obj=new THREE.Object3D();
   obj.position.copy(mesh.position);obj.quaternion.copy(mesh.quaternion);
   obj.scale.copy(mesh.scale);obj.visible=mesh.visible;
   return obj;
  });
  for(let i=0;i<2;i++){
   const side=new THREE.Vector3(0,0,i===0?-1:1);
   setOperatorArmSegments(scratch,i,from[i],elbow[i],wrist[i],side);
   setOperatorHandPose(scratch,i,wrist[i],.45);
   alignSegment(reference[i*3],from[i],elbow[i],side);
   alignSegment(reference[i*3+1],elbow[i],wrist[i],side);
   reference[i*3+2].position.copy(wrist[i]);
   reference[i*3+2].rotation.set(0,.45,0);
  }
  rotateOperatorSupportHand(scratch,.32);
  reference[2].rotateZ(.32);
  assert.deepEqual(arms(rig).map(geometry),old,
   'no actual arm mesh may change while solving');
  const slots=finishOperatorArmPose(scratch);
  assert.deepEqual(slots.map(s=>s.id),[
   'arm-0-upper','arm-0-lower','arm-0-hand',
   'arm-1-upper','arm-1-lower','arm-1-hand'
  ]);
  slots.forEach((s,i)=>close(s.values,geometry(reference[i]),s.id));
  assert.strictEqual(operatorHandTransform(scratch,0).position,
   out.transforms[2].position);
  close(operatorHandEuler(scratch,0).toArray().slice(0,3),
   reference[2].rotation.toArray().slice(0,3),'AK palm rotation',1e-10);
  const buffers=slots.map(s=>s.values);
  for(let i=0;i<10;i++){
   assert.strictEqual(beginOperatorArmPose(rig,scratch),out);
   const repeated=finishOperatorArmPose(scratch);
   assert.strictEqual(repeated,slots);
   repeated.forEach((slot,j)=>assert.strictEqual(slot.values,buffers[j]));
  }
 }finally{rig.dispose();}
});
test('B4: weapon family, action and mode matrix publishes all six final arm slots',()=>{
 const weapons=[
  {name:'AR M4A1',weapon:'carbine',weaponConfiguration:config('carbine','ar-m4a1')},
  {name:'AKM',weapon:'rifle',weaponConfiguration:config('rifle','ak-akm')},
  {name:'HK MP5',weapon:'smg',weaponConfiguration:config('smg','hk-mp5a3')},
  {name:'shotgun',weapon:'shotgun'}
 ];
 const actions=[
  {name:'low',handlingOverride:'low'},
  {name:'ADS',handlingOverride:'ads',aiming:true,aimBlend:1},
  {name:'short',handlingOverride:'short',shortCompression:.72},
  {name:'moving',velocity:74,stride:.45,travelYaw:1.25},
  {name:'crouch',posture:'crouch',velocity:24,stride:.2},
  {name:'reload',reload:.9,reloadDuration:1.8,reloadMode:'emergency'},
  {name:'throw',lastThrowAt:1.8},
  {name:'door',lastDoorAt:1.8,doorPoint:{x:9,y:4},doorMethod:'open'},
  {name:'treatment',treatmentActive:true},
  {name:'down',down:true,downProgress:.85,hitRegion:'torso',hitAge:.2},
  {name:'surrender',surrender:true,downProgress:.7}
 ];
 for(const w of weapons)for(const state of actions){
  const p={...base,...w,...state};
  const live=createOperatorRig('b4-'+w.name+'-'+state.name,'blue',true);
  const replay=createOperatorRig('b4-'+w.name+'-'+state.name,'blue',true);
  try{
   poseOperator(live,p,0);
   poseOperator(replay,{...p,deterministic:true},0);
   const frame=inspectOperatorPoseOutput(live);
   const slots=frame.slots.filter(s=>s.owner==='upper-body');
   assert.equal(slots.length,6,w.name+'/'+state.name);
   for(const slot of slots){
    assert.deepEqual(Array.from(slot.values),geometry(slot.node),
     w.name+'/'+state.name+'/'+slot.id);
    assert.ok(slot.values.every(Number.isFinite));
   }
   const a=snapshot(live),b=snapshot(replay);
   assert.deepEqual(a,b,w.name+'/'+state.name+' replay');
   assert.equal(frame.generation,1);
   if(live.magazineHand.visible){
    close(geometry(live.magazineHand).slice(0,3),
     geometry(live.arms[0].hand).slice(0,3),'support magazine wrist');
   }
   assert.ok(Number.isFinite(live.gripError));
   assert.ok(Number.isFinite(live.stockError));
   assert.ok(Number.isFinite(live.eyeError));
  }finally{live.dispose();replay.dispose();}
 }
});
test('B4: cavity shading reads committed arm result, not stale precommit bone',()=>{
 const rig=createOperatorRig('b4-cavity','blue',true);
 try{
  poseOperator(rig,base,0);
  for(let i=0;i<2;i++){
   const q=rig.arms[i].upper.quaternion;
   const y=new THREE.Vector3(0,1,0).applyQuaternion(q).y;
   const expected=armCavityStrength(y,rig.elbowSpread[i],false);
   const observed=rig.poseCavity.torso.value.getComponent(i);
   assert.ok(Math.abs(observed-expected)<1e-10,
    'cavity must follow direct upper arm '+i);
  }
 }finally{rig.dispose();}
});
test('B4: same-time playback and backward seek reproduce every hand and weapon output',()=>{
 const rig=createOperatorRig('b4-seek','blue',true);
 const p={...base,weaponConfiguration:config('carbine','ar-m4a1'),
  handlingOverride:'low',seconds:4.2};
 try{
  poseOperator(rig,p,0);
  const old=snapshot(rig),frame=inspectOperatorPoseOutput(rig);
  const buffers=frame.slots.map(s=>s.values);
  poseOperator(rig,{...p,seconds:7.7,handlingOverride:'short',
   shortCompression:.9},0);
  poseOperator(rig,p,-1);
  assert.deepEqual(snapshot(rig),old);
  poseOperator(rig,p,0);
  assert.deepEqual(snapshot(rig),old);
  frame.slots.forEach((s,i)=>assert.strictEqual(s.values,buffers[i]));
  assert.equal(frame.generation,4);
 }finally{rig.dispose();}
 assert.equal(inspectOperatorPoseOutput(rig),null);
});
test('B4: no second authority or arm mesh writer bypasses staged publication',()=>{
 const get=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
 const controller=get('breach-operator-animation-controller.ts');
 const output=get('breach-operator-upper-body-output.ts');
 const b2=get('breach-operator-pose-output.ts');
 const finalizer=get('breach-pose-frame-finalizer.ts');
 assert.match(controller,/stageDirectOperatorPoseOutput\(r,p,'upper-body',/);
 assert.match(controller,/finishOperatorArmPose\(scratch\)/);
 assert.doesNotMatch(controller,/stageOperatorPoseOutput\(r,p,'upper-body'\)/);
 assert.doesNotMatch(controller,/alignSegment\(arm\.(upper|lower)/);
 assert.doesNotMatch(controller,/arm\.hand\.position\.copy/);
 assert.doesNotMatch(controller,/arm\.hand\.rotation\.set/);
 assert.doesNotMatch(controller,/r\.arms\[0\]\.hand\.rotateZ/);
 assert.match(controller,/operatorHandTransform\(scratch,0\)/);
 assert.match(finalizer,/leftUpper,rightUpper/);
 assert.match(output,/alignSegmentComponents\(/);
 assert.match(b2,/Duplicate pose-output stage/);
 assert.equal((controller.match(/commitOperatorPoseOutput\(r,p\)/g)??[]).length,1);
 for(const src of [controller,output]){
  assert.doesNotMatch(src,/\bstepSession\(/);
  assert.doesNotMatch(src,/requestAnimationFrame\(/);
  assert.doesNotMatch(src,/Math\.random\(/);
 }
});
