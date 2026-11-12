/** B5 — independent legacy placement parity, direct transform ownership,
 * replay seeking, equipment families and presentation-only safeguards.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
import {beginOperatorEquipmentPose,finishOperatorEquipmentPose,
 solveOperatorDroppedWeapon} from '../src/breach-operator-equipment-output.ts';
import {updateOperatorSlingPose,solveOperatorDirectSlingPose}
 from '../src/breach-operator-sling-pose.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const base={x:12,z:-8,heading:.37,travelYaw:.37,pelvisYaw:-.37,
 velocity:0,turning:0,seconds:4,stride:.2,posture:'stand',
 injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,aimBlend:0,shotHeading:.37,
 poseV3Preview:true,poseV4ReloadPreview:true,deterministic:true};
const config=(weapon,id,sling=false)=>{
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),id);
 return sling?{...c,slots:{...c.slots,sling:'sling-two-point'}}:c;
};
const vals=n=>[n.position.x,n.position.y,n.position.z,
 n.quaternion.x,n.quaternion.y,n.quaternion.z,n.quaternion.w,
 n.scale.x,n.scale.y,n.scale.z,n.visible?1:0];
const close=(a,b,what,eps=2e-8)=>{
 assert.equal(a.length,b.length,what+' count');
 for(let i=0;i<a.length;i++)
  assert.ok(Math.abs(a[i]-b[i])<=eps,
   what+' component '+i+': '+a[i]+' != '+b[i]);
};
const frame=r=>{
 const o=inspectOperatorPoseOutput(r);assert.ok(o?.valid);
 return Object.fromEntries(o.slots.map(s=>[s.id,Array.from(s.values)]));
};
const equipmentNodes=r=>[r.weapon,r.droppedGun,r.magazineInserted,
 r.magazineHand,r.detachedMagazine,r.reloadControlMesh,r.medicalItem,
 r.pack,...r.slingStraps];
const smooth=t=>{const v=Math.min(1,Math.max(0,t));return v*v*(3-2*v)};
function previousDrop(r,p,downProgress){
 r.root.updateMatrixWorld(true);
 const held=r.weapon.getWorldPosition(new THREE.Vector3());
 const orientation=r.weapon.getWorldQuaternion(new THREE.Quaternion());
 const origin=r.root.getWorldPosition(new THREE.Vector3());
 const side=p.downPose==='left'?-1:1;
 const sling=p.weaponConfiguration?.slots.sling==='sling-two-point'&&
  !p.surrender;
 const rest=new THREE.Vector3(origin.x+(sling?4:9),sling?6:1.8,
  origin.z+side*(sling?5:11));
 const t=smooth((downProgress-.30)/.70);
 const point=held.lerp(rest,t);
 const position=r.legacyFrame.worldToLocal(point).clone();
 const flat=new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0,1,0),-p.heading+side*.18);
 orientation.slerp(flat,t);
 const inverse=r.legacyFrame.getWorldQuaternion(
  new THREE.Quaternion()).invert();
 return {position,quaternion:inverse.multiply(orientation)};
}

test('B5: exactly two firearm and nine attachment slots match committed scene',()=>{
 const r=createOperatorRig('b5-slots','blue',true);
 try{
  poseOperator(r,base,0);
  const o=inspectOperatorPoseOutput(r);
  const ids=['held-weapon','dropped-weapon','inserted-magazine',
   'hand-magazine','detached-magazine','reload-control','medical-item',
   'backpack','sling-0','sling-1','sling-2'];
  for(const id of ids){
   const slot=o.slots.find(x=>x.id===id);assert.ok(slot,id);
   close(slot.values,vals(slot.node),id);
   assert.ok(slot.owner=== (id.includes('weapon')?'weapon':'attachments'));
  }
  assert.equal(o.generation,1);
  assert.equal(o.slots.filter(x=>x.owner==='weapon').length,2);
  assert.equal(o.slots.filter(x=>x.owner==='attachments').length,9);
 }finally{r.dispose();}
});

test('B5: frozen old held-to-drop world-space transformation is unchanged',()=>{
 const cases=[
  {name:'fall-right',p:{...base,down:true,downProgress:.34,
   downPose:'right'}},
  {name:'fall-left',p:{...base,down:true,downProgress:.88,
   downPose:'left'}},
  {name:'fall-sling',p:{...base,down:true,downProgress:.61,
   downPose:'right',weaponConfiguration:config('carbine','ar-m4a1',true)}},
  {name:'surrender',p:{...base,surrender:true,downProgress:.75,
   downPose:'left'}},
  {name:'AK injury',p:{...base,weapon:'rifle',down:true,
   downProgress:.97,downPose:'right',injury:1,
   weaponConfiguration:config('rifle','ak-akm')}}
 ];
 for(const {name,p} of cases){
  const r=createOperatorRig('b5-drop-'+name,'blue',true);
  try{
   poseOperator(r,p,0);
   assert.ok(r.droppedGun.visible,name);
   const pose=previousDrop(r,p,p.downProgress);
   close(r.droppedGun.position.toArray(),pose.position.toArray(),name+'/drop origin');
   assert.ok(r.droppedGun.quaternion.angleTo(pose.quaternion)<1e-7,
    name+'/drop quaternion');
   assert.ok(Number.isFinite(r.weapon.position.x));
  }finally{r.dispose();}
 }
});

test('B5: sling segments exactly equal the frozen mesh-based endpoint solver',()=>{
 const cases=[
  {name:'held',p:{...base,
   weaponConfiguration:config('carbine','ar-m4a1',true)}},
  {name:'dropped',p:{...base,down:true,downProgress:.94,
   downPose:'left',weaponConfiguration:config('carbine','ar-m4a1',true)}},
  {name:'suppressed',p:{...base,surrender:true,downProgress:1,
   weaponConfiguration:config('carbine','ar-m4a1',true)}},
  {name:'unslung',p:base}
 ];
 for(const {name,p} of cases){
  const r=createOperatorRig('b5-sling-'+name,'blue',true);
  try{
   poseOperator(r,p,0);
   const before=r.slingStraps.map(vals),gun=vals(r.weapon),
    dropped=vals(r.droppedGun);
   updateOperatorSlingPose(r,p,p.velocity,
    new THREE.Vector3(0,1,0),new THREE.Vector3());
   r.slingStraps.forEach((n,i)=>close(vals(n),before[i],name+'/strap'+i));
   close(vals(r.weapon),gun,name+'/held unchanged');
   close(vals(r.droppedGun),dropped,name+'/drop unchanged');
  }finally{r.dispose();}
 }
});

test('B5: equipment solver cannot mutate registered scene nodes before commit',()=>{
 const r=createOperatorRig('b5-no-live-writes','blue',true);
 const scratch=createOperatorPoseScratch();
 try{
  poseOperator(r,base,0);
  const original=equipmentNodes(r).map(vals);
  const e=beginOperatorEquipmentPose(r,scratch);
  e.weapons[0].position.set(5,2,1);
  e.weapons[0].quaternion.setFromEuler(new THREE.Euler(.1,.2,.3));
  e.weapons[1].visible=true;
  e.attachments[5].position.z=4.2;
  const p={...base,down:true,downProgress:.75,
   weaponConfiguration:config('carbine','ar-m4a1',true)};
  solveOperatorDroppedWeapon(r,p,scratch,.75,smooth);
  solveOperatorDirectSlingPose(r,p,scratch,30);
  assert.deepEqual(equipmentNodes(r).map(vals),original,
   'direct weapon/drop/sling must not write any registered source');
  const outputs=finishOperatorEquipmentPose(scratch);
  assert.equal(outputs.weaponOutputs.length,2);
  assert.equal(outputs.attachmentOutputs.length,9);
  const stable=outputs.attachmentOutputs.map(x=>x.values);
  const same=finishOperatorEquipmentPose(scratch);
  assert.strictEqual(same,outputs);
  same.attachmentOutputs.forEach((s,i)=>assert.strictEqual(s.values,stable[i]));
 }finally{r.dispose();}
});

test('B5: action/weapon matrix publishes matching final equipment transforms',()=>{
 const families=[
  {weapon:'carbine',weaponConfiguration:config('carbine','ar-m4a1')},
  {weapon:'rifle',weaponConfiguration:config('rifle','ak-akm')},
  {weapon:'smg',weaponConfiguration:config('smg','hk-mp5a3')},
  {weapon:'shotgun'}
 ];
 const scenarios=[
  {name:'low',handlingOverride:'low'},
  {name:'ADS',handlingOverride:'ads',aiming:true,aimBlend:1},
  {name:'short',handlingOverride:'short',shortCompression:.7},
  {name:'reload',reload:.8,reloadMode:'emergency'},
  {name:'V3 reload',reload:.6,poseV4ReloadPreview:false},
  {name:'treatment',treatmentActive:true,treatmentProgress:.4},
  {name:'down',down:true,downProgress:.8},
  {name:'surrender',surrender:true,downProgress:.95},
  {name:'unarmed',unarmedPreview:true}
 ];
 for(const family of families)for(const state of scenarios){
  const r=createOperatorRig('b5-matrix-'+family.weapon+'-'+state.name,'blue',true);
  try{
   const p={...base,...family,...state};
   poseOperator(r,p,0);
   const output=inspectOperatorPoseOutput(r);
   for(const slot of output.slots.filter(x=>
    x.owner==='weapon'||x.owner==='attachments')){
    close(slot.values,vals(slot.node),family.weapon+'/'+state.name+'/'+slot.id);
    assert.ok(slot.values.every(Number.isFinite));
   }
   if(state.unarmedPreview){
    assert.equal(r.weapon.visible,false);
    assert.equal(r.droppedGun.visible,false);
    assert.equal(r.magazineHand.visible,false);
    assert.ok(r.slingStraps.every(s=>!s.visible));
   }
   assert.equal(output.generation,1);
  }finally{r.dispose();}
 }
});

test('B5: replay seek and two rigs isolate published direct outputs',()=>{
 const a=createOperatorRig('b5-a','blue',true),
  b=createOperatorRig('b5-b','blue',true);
 const p={...base,seconds:5.4,weaponConfiguration:config(
  'carbine','ar-m4a1',true)};
 try{
  poseOperator(a,p,0);poseOperator(b,{...p,heading:1.4},0);
  const first=frame(a),array=inspectOperatorPoseOutput(a).slots[0].values;
  poseOperator(b,{...p,seconds:9.8,down:true,downProgress:1},0);
  assert.deepEqual(frame(a),first);
  poseOperator(a,{...p,seconds:8,handlingOverride:'short'},0);
  poseOperator(a,p,-1);
  for(const id of ['held-weapon','backpack','sling-0','sling-1','sling-2',
   'arm-0-hand','arm-1-hand'])
    close(frame(a)[id],first[id],'rewind '+id,1e-7);
  poseOperator(a,p,0);
  assert.strictEqual(inspectOperatorPoseOutput(a).slots[0].values,array);
 }finally{a.dispose();b.dispose();}
 assert.equal(inspectOperatorPoseOutput(a),null);
});

test('B5: one stage for each owner, no registered scene transforms written mid-frame',()=>{
 const source=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
 const controller=source('breach-operator-animation-controller.ts'),
  output=source('breach-operator-equipment-output.ts');
 assert.match(controller,/stageDirectOperatorPoseOutput\(r,p,'weapon',/);
 assert.match(controller,/stageDirectOperatorPoseOutput\(r,p,'attachments',/);
 assert.doesNotMatch(controller,/stageOperatorPoseOutput\(r,p,'weapon'\)/);
 assert.doesNotMatch(controller,/stageOperatorPoseOutput\(r,p,'attachments'\)/);
 for(const illegal of [
  /r\.weapon\.position\.copy/,/r\.weapon\.scale\.set/,
  /r\.droppedGun\.position\.copy/,/r\.medicalItem\.position\.copy/,
  /r\.pack\.rotation\.z\s*=/,/r\.magazineHand\.position\.copy/,
  /r\.detachedMagazine\.position\.copy/,/r\.reloadControlMesh\.scale\.set/
 ])assert.doesNotMatch(controller,illegal);
 assert.match(controller,/solveOperatorDroppedWeapon\(workingRig,p,scratch,/);
 assert.match(controller,/solveOperatorDirectSlingPose\(workingRig,p,scratch,/);
 assert.match(output,/r\.chest\.getWorldQuaternion/);
 assert.equal((controller.match(/commitOperatorPoseOutput\(r,p\)/g)??[]).length,1);
});
