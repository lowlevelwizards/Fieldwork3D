/** B7 — golden legacy Workbench geometry and shared pose ownership.
 * The frozen reference below preserves the exact pre-B7 editor mesh writes
 * independently of the new staged implementation. It is test-only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {alignSegment,solveTwoBone,ARM_LIMITS} from '../src/breach-ik.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';
import {operatorPoseScratchForRig} from '../src/breach-operator-animation-frame.ts';
import {releaseOperatorPreviewRig} from '../src/operator-preview-rig-lifecycle.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {captureWorkbenchPose,cloneWorkbenchPose,applyWorkbenchPose,
 weaponWorkbenchContacts,interpolateWorkbenchPose,readWorkbenchPose}
 from '../src/operator-pose-workbench.ts';

const baseline=(weapon,weaponConfiguration,seconds=1)=>({
 x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds,
 stride:0,posture:'stand',injury:0,weapon,
 weaponConfiguration,reload:0,reloadDuration:1.8,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,handlingOverride:'ready',
 deterministic:true,poseV3Preview:false,poseV4ReloadPreview:false
});
const poseNodes=rig=>[rig.root,rig.legacyFrame,rig.hip,rig.chest,
 rig.head,rig.weapon,rig.droppedGun,rig.magazineInserted,rig.magazineHand,
 rig.detachedMagazine,rig.reloadControlMesh,rig.medicalItem,rig.pack,
 ...rig.arms.flatMap(a=>[a.upper,a.lower,a.hand]),
 ...rig.feet.flatMap(f=>[f.upper,f.lower,f.shoe,f.ankleLink]),
 ...rig.slingStraps];
const values=node=>[
 node.position.x,node.position.y,node.position.z,
 node.quaternion.x,node.quaternion.y,node.quaternion.z,node.quaternion.w,
 node.scale.x,node.scale.y,node.scale.z,node.visible?1:0
];
const snapshot=r=>poseNodes(r).map(values);
const close=(actual,expected,why,epsilon=1e-10)=>{
 assert.equal(actual.length,expected.length,why+' length');
 for(let k=0;k<actual.length;k++)
  assert.ok(Math.abs(actual[k]-expected[k])<=epsilon,
   why+'['+k+'] actual '+actual[k]+' expected '+expected[k]);
};
const referenceApply=(rig,recipe,config)=>{
 const gun=weaponWorkbenchContacts(recipe,config);
 const radians=THREE.MathUtils.degToRad;
 const xyz=arr=>new THREE.Vector3(...arr);
 rig.chest.rotation.set(radians(recipe.torso[0]),
  radians(recipe.torso[1]),radians(recipe.torso[2]),'XYZ');
 rig.weapon.position.copy(gun.origin);
 rig.weapon.rotation.copy(gun.rotation);
 rig.weapon.scale.set(gun.lengthScale,1,1);
 const solve=index=>{
  const name=index===0?'support':'firing',arm=rig.arms[index];
  const shoulder=xyz(recipe.targets[name+'Shoulder']);
  const wrist=xyz(recipe.targets[name+'Hand']);
  const pole=xyz(recipe.targets[name+'Elbow']).sub(shoulder);
  const solved=solveTwoBone(shoulder,wrist,10,10,pole,ARM_LIMITS);
  const side=new THREE.Vector3(0,0,index===0?-1:1);
  alignSegment(arm.upper,shoulder,solved.joint,side);
  alignSegment(arm.lower,solved.joint,solved.effector,side);
  arm.hand.position.copy(solved.effector);
  arm.hand.rotation.set(0,gun.rotation.y,0);
  arm.bend.copy(solved.bendPlane);
  arm.outOfReach=!solved.reached;
  rig.elbowSpread[index]=Math.max(0,(index===0?-1:1)*
   (solved.joint.z-shoulder.z));
  return {
   wristGap:solved.effector.distanceTo(wrist),
   elbowGuideGap:solved.joint.distanceTo(
    xyz(recipe.targets[name+'Elbow'])),
   gripGap:solved.effector.distanceTo(index===0?gun.support:gun.firing),
   reached:solved.reached,
   shoulder:shoulder.toArray(),elbow:solved.joint.toArray(),
   hand:solved.effector.toArray()
  };
 };
 const support=solve(0),firing=solve(1);
 return {stock:gun.stock.toArray(),support,firing,
  maxReachError:Math.max(support.wristGap,firing.wristGap),
  maxContactGap:Math.max(support.gripGap,firing.gripGap)};
};
const families=[
 ['carbine','ar-m4a1'],
 ['rifle','ak-akm'],
 ['smg','hk-mp5a3'],
 ['shotgun',null]
];
function fixture(weapon,id){
 if(!id)return undefined;
 return selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),id);
}
function changeRecipe(initial,variant){
 const p=cloneWorkbenchPose(initial);
 if(variant===1){
  p.targets.stock[0]-=5.25;p.targets.stock[1]-=3.75;
  p.targets.stock[2]+=2.35;
  p.targets.supportHand=[9.8,-7,-8.6];
  p.targets.firingHand=[7.6,-6.1,8.8];
  p.targets.supportElbow=[17,-9,-19];
  p.targets.firingElbow=[18,-10,17];
  p.weaponRotation[2]=-17;
  p.torso[1]=12.5;
 }else if(variant===2){
  p.targets.stock[0]+=7.4;p.targets.stock[1]+=5.6;
  p.targets.supportElbow=[-9,-14,-3];
  p.targets.firingElbow=[-7,-12,3];
  p.targets.supportHand=[24,1,-10];
  p.targets.firingHand=[22,-2,11];
  p.weaponRotation=[12,-19,16];
  p.torso=[-11,28,-8];
 }
 return p;
}
test('B7: across four families and authored edits, every old mesh transform and report is unchanged',()=>{
 for(const [weapon,id] of families){
  const configuration=fixture(weapon,id);
  const newRig=createOperatorRig('b7-reference-'+weapon,'blue');
  const reference=createOperatorRig('b7-reference-'+weapon,'blue');
  try{
   const input=baseline(weapon,configuration);
   poseOperator(newRig,input,0);poseOperator(reference,input,0);
   const seed=captureWorkbenchPose(newRig,weapon,id??'',configuration);
   for(const variant of [0,1,2]){
    const recipe=changeRecipe(seed,variant);
    const initialTime=newRig.lastTime;
    const initialPose=newRig.lastPose;
    const feet=newRig.feet.map(f=>f.anchor.clone());
    const before=inspectOperatorPoseOutput(newRig).generation;
    const expected=referenceApply(reference,recipe,configuration);
    const actual=applyWorkbenchPose(newRig,recipe,configuration);
    for(const [k,node] of poseNodes(newRig).entries())
     close(values(node),values(poseNodes(reference)[k]),
      weapon+'/'+variant+'/node'+k);
    for(const key of ['stock','maxReachError','maxContactGap'])
     if(Array.isArray(expected[key]))
      close(actual[key],expected[key],weapon+'/'+key);
     else close([actual[key]],[expected[key]],weapon+'/'+key);
    for(const name of ['support','firing']){
     for(const key of ['wristGap','elbowGuideGap','gripGap'])
      close([actual[name][key]],[expected[name][key]],
       weapon+'/'+name+'/'+key);
     for(const key of ['shoulder','elbow','hand'])
      close(actual[name][key],expected[name][key],
       weapon+'/'+name+'/'+key);
     assert.equal(actual[name].reached,expected[name].reached);
    }
    assert.strictEqual(newRig.lastPose,initialPose,
     'authoring cannot change tactical input snapshot');
    assert.equal(newRig.lastTime,initialTime);
    newRig.feet.forEach((f,i)=>assert.deepEqual(f.anchor,feet[i]));
    const output=inspectOperatorPoseOutput(newRig);
    assert.equal(output.generation,before+1);
    assert.equal(output.slotCount,30);
    for(const slot of output.slots)
     close(Array.from(slot.values),values(slot.node),slot.id);
   }
  }finally{newRig.dispose();reference.dispose();}
 }
});
test('B7: reused authored buffers, atomic invalid edit and explicit recovery',()=>{
 const config=fixture('carbine','ar-m4a1');
 const rig=createOperatorRig('b7-transaction','blue');
 try{
  const p=baseline('carbine',config);poseOperator(rig,p,0);
  const recipe=captureWorkbenchPose(rig,'carbine','ar-m4a1',config);
  const initial=inspectOperatorPoseOutput(rig);
  const typed=initial.slots.map(s=>s.values);
  for(let i=0;i<20;i++){
   recipe.targets.stock[0]-=.14;
   applyWorkbenchPose(rig,recipe,config);
   const current=inspectOperatorPoseOutput(rig);
   assert.strictEqual(current,initial);
   current.slots.forEach((s,j)=>assert.strictEqual(s.values,typed[j]));
  }
  const old=snapshot(rig),previous=initial.generation;
  const invalid=cloneWorkbenchPose(recipe);
  invalid.targets.stock[0]=Infinity;
  assert.throws(()=>applyWorkbenchPose(rig,invalid,config),
   /Non-finite|Invalid direct pose-output/);
  assert.deepEqual(snapshot(rig),old,
   'an incomplete authored edit cannot publish any visible transform');
  assert.equal(initial.generation,previous);
  assert.doesNotMatch(JSON.stringify(old),/null/);
  applyWorkbenchPose(rig,recipe,config);
  assert.equal(initial.generation,previous+1);
 }finally{rig.dispose();}
});
test('B7: recipe roundtrip, blend endpoints and Workbench→gameplay→Workbench handoff',()=>{
 const configuration=fixture('carbine','ar-m4a1');
 const r=createOperatorRig('b7-modes','blue');
 const fresh=createOperatorRig('b7-modes','blue');
 try{
  const input=baseline('carbine',configuration,4.5);
  poseOperator(r,input,0);poseOperator(fresh,input,0);
  const first=captureWorkbenchPose(r,'carbine','ar-m4a1',configuration);
  const changed=changeRecipe(first,1);
  assert.deepEqual(readWorkbenchPose(JSON.stringify(changed)),changed);
  for(const t of [0,.15,.5,.8,1]){
   applyWorkbenchPose(r,interpolateWorkbenchPose(first,changed,t),
    configuration);
  }
  const scratch=operatorPoseScratchForRig(r);
  assert.strictEqual(scratch,operatorPoseScratchForRig(r),
   'Workbench cannot create a second pose scratch');
  const afterEdit=inspectOperatorPoseOutput(r).generation;
  poseOperator(r,{...input,seconds:8},0);
  poseOperator(fresh,{...input,seconds:8},0);
  assert.equal(inspectOperatorPoseOutput(r).generation,afterEdit+1);
  const l=inspectOperatorPoseOutput(r).slots;
  const reference=inspectOperatorPoseOutput(fresh).slots;
  for(let i=0;i<l.length;i++)close(l[i].values,reference[i].values,
   'return-to-ready '+l[i].id,1e-8);
  const newRecipe=captureWorkbenchPose(r,'carbine','ar-m4a1',configuration);
  applyWorkbenchPose(r,newRecipe,configuration);
  assert.equal(inspectOperatorPoseOutput(r).generation,afterEdit+2);
 }finally{r.dispose();fresh.dispose();}
});
test('B7: two authored rigs never share buffers or mutable authoring state',()=>{
 const cfg=fixture('rifle','ak-akm');
 const a=createOperatorRig('b7-separate-a','blue'),
  b=createOperatorRig('b7-separate-b','blue');
 try{
  const p=baseline('rifle',cfg);
  poseOperator(a,p,0);poseOperator(b,p,0);
  const pa=captureWorkbenchPose(a,'rifle','ak-akm',cfg),
   pb=captureWorkbenchPose(b,'rifle','ak-akm',cfg);
  const preserved=snapshot(b),previous=inspectOperatorPoseOutput(b).generation;
  pa.targets.stock[0]-=7;
  applyWorkbenchPose(a,pa,cfg);
  assert.deepEqual(snapshot(b),preserved);
  assert.equal(inspectOperatorPoseOutput(b).generation,previous);
  assert.notStrictEqual(operatorPoseScratchForRig(a),
   operatorPoseScratchForRig(b));
  applyWorkbenchPose(b,pb,cfg);
  assert.notStrictEqual(inspectOperatorPoseOutput(a).slots[0].values,
   inspectOperatorPoseOutput(b).slots[0].values);
 }finally{a.dispose();b.dispose();}
});
test('B7: shared preview release detaches once, runs Studio hook, resets pose registry',()=>{
 const host=new THREE.Scene();
 const r=createOperatorRig('b7-release','blue');
 host.add(r.root);
 try{
  poseOperator(r,baseline('carbine',fixture('carbine','ar-m4a1')),0);
  assert.ok(inspectOperatorPoseOutput(r)?.valid);
  const sequence=[];
  releaseOperatorPreviewRig(host,r,()=>{
   sequence.push('lighting');
   assert.equal(host.children.includes(r.root),false);
   assert.ok(inspectOperatorPoseOutput(r)?.valid);
  });
  sequence.push('returned');
  assert.deepEqual(sequence,['lighting','returned']);
  assert.equal(inspectOperatorPoseOutput(r),null);
  assert.equal(host.children.includes(r.root),false);
 }finally{
  if(inspectOperatorPoseOutput(r))r.dispose();
 }
 const r2=createOperatorRig('b7-release-error','blue');
 host.add(r2.root);
 assert.throws(()=>releaseOperatorPreviewRig(host,r2,()=>{throw Error('lighting');}),
  /lighting/);
 assert.equal(host.children.includes(r2.root),false);
 assert.equal(inspectOperatorPoseOutput(r2),null);
});
test('B7: Workbench edits cannot directly mutate rig pose or advance simulation',()=>{
 const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
 const workbench=read('operator-pose-workbench.ts');
 const frame=read('breach-operator-animation-frame.ts');
 const lab=read('breach-operator-lab.ts');
 const studio=read('operator-studio.ts');
 const kit=read('equipment-preview.ts');
 const lifecycle=read('operator-preview-rig-lifecycle.ts');
 assert.match(workbench,/operatorPoseScratchForRig\(rig\)/);
 assert.match(workbench,/beginOperatorPoseOutput\(rig,outputInput\)/);
 assert.match(workbench,/commitOperatorPoseOutput\(rig,outputInput\)/);
 assert.match(workbench,/setOperatorArmSegments\(scratch,index,/);
 assert.match(workbench,/stageDirectOperatorPoseOutput\(rig,outputInput,'upper-body'/);
 for(const code of [
  /rig\.chest\.rotation\.set\(/,
  /rig\.weapon\.(?:position|rotation|scale)\.(?:copy|set)\(/,
  /alignSegment\(arm\.(upper|lower)/,
  /arm\.hand\.position\.copy/,
  /arm\.hand\.rotation\.set/
 ])assert.doesNotMatch(workbench,code);
 assert.match(frame,/export function operatorPoseScratchForRig/);
 assert.match(lab,/releaseOperatorPreviewRig\(scene,rig\)/);
 assert.match(studio,/releaseOperatorPreviewRig\(scene,rig,/);
 assert.match(kit,/releaseOperatorPreviewRig\(this\.scene,this\.rig\)/);
 assert.doesNotMatch(lifecycle,/\brequestAnimationFrame\(/);
 assert.doesNotMatch(workbench,/\bstepSession\(/);
 assert.doesNotMatch(workbench,/Math\.random\(/);
});
