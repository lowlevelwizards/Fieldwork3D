/** Package B6 — complete direct pose pipeline, independent working parent
 * hierarchy, frozen parent-coordinate semantics and replay consistency.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
import {beginOperatorFramePose,workingOperatorRig,finishOperatorFramePose}
 from '../src/breach-operator-frame-output.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const base={
 x:12,z:-8,heading:.39,travelYaw:.39,pelvisYaw:-.39,
 velocity:0,turning:0,seconds:4,stride:.2,
 posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,aimBlend:0,
 poseV3Preview:true,poseV4ReloadPreview:true,deterministic:true
};
const config=(weapon,id,sling=false)=>{
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),id);
 return sling?{...c,slots:{...c.slots,sling:'sling-two-point'}}:c;
};
const transforms=r=>[r.root,r.legacyFrame,r.hip,r.chest,r.head];
const nums=n=>[n.position.x,n.position.y,n.position.z,
 n.quaternion.x,n.quaternion.y,n.quaternion.z,n.quaternion.w,
 n.scale.x,n.scale.y,n.scale.z,n.visible?1:0];
const close=(a,b,label,eps=1e-9)=>{
 assert.equal(a.length,b.length,label+' count');
 for(let i=0;i<a.length;i++)
  assert.ok(Math.abs(a[i]-b[i])<=eps,
   label+' component '+i+': '+a[i]+' !== '+b[i]);
};
const view=r=>{
 const out=inspectOperatorPoseOutput(r);assert.ok(out?.valid);
 return Object.fromEntries(out.slots.map(s=>[s.id,Array.from(s.values)]));
};
const foot=(x,z)=>({
 position:{x,y:z},worldYaw:.39,height:0,pitch:0,
 contact:true,phase:'planted',progress:1
});

test('B6: five working nodes are invisible, reused, and never mutate published rig',()=>{
 const r=createOperatorRig('b6-shadow','blue',true);
 const scratch=createOperatorPoseScratch();
 try{
  poseOperator(r,base,0);
  const original=transforms(r).map(nums);
  const p=beginOperatorFramePose(r,scratch);
  const v=workingOperatorRig(p);
  assert.strictEqual(v.root,p.root);
  assert.strictEqual(v.legacyFrame,p.legacyFrame);
  assert.strictEqual(v.hip,p.hip);
  assert.strictEqual(v.chest,p.chest);
  assert.strictEqual(v.head,p.head);
  assert.strictEqual(v.arms,r.arms);
  assert.strictEqual(v.feet,r.feet);
  assert.strictEqual(v.root.userData,r.root.userData);
  for(const node of [p.root,p.legacyFrame,p.hip,p.chest,p.head])
   assert.notStrictEqual(node,transforms(r).find(x=>x===node));
  assert.equal(r.root.children.includes(p.root),false);
  assert.equal(p.root.parent,r.root.parent);
  p.root.position.y+=17;
  p.root.quaternion.setFromEuler(new THREE.Euler(.34,.51,.16));
  p.hip.position.y-=6;
  p.chest.position.set(4,12,-3);
  p.head.rotation.set(.12,.5,-.2);
  assert.deepEqual(transforms(r).map(nums),original,
   'working pose must not change real scene nodes');
  const finished=finishOperatorFramePose(p);
  assert.strictEqual(finished,p);
  assert.deepEqual(p.frameOutputs.map(s=>s.id),['root','legacy-frame']);
  assert.deepEqual(p.bodyOutputs.map(s=>s.id),['pelvis','chest','head']);
  for(const [index,node] of [p.root,p.legacyFrame].entries())
   close(p.frameOutputs[index].values,nums(node),'frame'+index);
  for(const [index,node] of [p.hip,p.chest,p.head].entries())
   close(p.bodyOutputs[index].values,nums(node),'body'+index);
  const frameRefs=p.frameOutputs.map(s=>s.values);
  const bodyRefs=p.bodyOutputs.map(s=>s.values);
  const again=beginOperatorFramePose(r,scratch);
  assert.strictEqual(again,p);
  assert.strictEqual(workingOperatorRig(again),v);
  again.frameOutputs.forEach((s,i)=>assert.strictEqual(s.values,frameRefs[i]));
  again.bodyOutputs.forEach((s,i)=>assert.strictEqual(s.values,bodyRefs[i]));
  assert.deepEqual(transforms(r).map(nums),original);
 }finally{r.dispose();}
});

test('B6: real external parent and root X/Z changes persist in shadow world math',()=>{
 const outer=new THREE.Group(),inner=new THREE.Group();
 outer.position.set(130,8,-55);
 outer.rotation.set(.04,-.66,.03);
 outer.scale.set(1.1,1,1.1);
 inner.position.set(24,0,-32);inner.rotation.y=.42;
 outer.add(inner);
 const r=createOperatorRig('b6-outer','blue',true);
 inner.add(r.root);
 const scratch=createOperatorPoseScratch();
 try{
  r.root.position.set(18,-4,72);
  r.root.rotation.set(.2,-.19,.08);
  r.chest.position.set(5,23,-2);
  r.chest.rotation.set(.04,.23,-.07);
  outer.updateMatrixWorld(true);
  const real=r.chest.getWorldPosition(new THREE.Vector3());
  const q=r.chest.getWorldQuaternion(new THREE.Quaternion());
  const frame=beginOperatorFramePose(r,scratch);
  assert.strictEqual(frame.root.parent,inner);
  assert.equal(inner.children.includes(frame.root),false,
   'working root is NOT a new scene child');
  const shadow=frame.chest.getWorldPosition(new THREE.Vector3());
  const shadowQ=frame.chest.getWorldQuaternion(new THREE.Quaternion());
  close(shadow.toArray(),real.toArray(),'world point');
  assert.ok(shadowQ.angleTo(q)<1e-8,'world quaternion');
  // The motor can move the live actor between pose frames.
  r.root.position.set(-30,-2,44);
  r.chest.rotation.y=-.38;
  outer.updateMatrixWorld(true);
  beginOperatorFramePose(r,scratch);
  close(frame.chest.getWorldPosition(new THREE.Vector3()).toArray(),
   r.chest.getWorldPosition(new THREE.Vector3()).toArray(),
   'updated world transform');
  assert.equal(outer.children.includes(frame.root),false);
 }finally{r.dispose();}
});

test('B6: all six owners now publish directly and accurately across action/mode matrix',()=>{
 const arms=[
  {weapon:'carbine',weaponConfiguration:config('carbine','ar-m4a1')},
  {weapon:'rifle',weaponConfiguration:config('rifle','ak-akm')},
  {weapon:'smg',weaponConfiguration:config('smg','hk-mp5a3')},
  {weapon:'shotgun'}
 ];
 const states=[
  {name:'stand',handlingOverride:'low'},
  {name:'ADS',handlingOverride:'ads',aiming:true,aimBlend:1},
  {name:'run',velocity:128,stride:.6,travelYaw:1.12},
  {name:'crouch',posture:'crouch',velocity:25},
  {name:'short',handlingOverride:'short',shortCompression:.81},
  {name:'reload',reload:.78,poseV4ReloadPreview:true},
  {name:'door',lastDoorAt:3.8,doorPoint:{x:22,y:-10},doorMethod:'open'},
  {name:'kick',lastDoorAt:3.6,doorPoint:{x:24,y:-5},doorMethod:'kick'},
  {name:'treatment',treatmentActive:true,treatmentProgress:.7},
  {name:'flash',flashActive:true},
  {name:'injury',injury:2,hitRegion:'torso',hitAge:.22},
  {name:'down-left',down:true,downProgress:.82,downPose:'left'},
  {name:'down-right',down:true,downProgress:1,downPose:'right'},
  {name:'surrender',surrender:true,downProgress:1},
  {name:'unarmed',unarmedPreview:true}
 ];
 for(const arm of arms)for(const state of states){
  const rig=createOperatorRig('b6-'+arm.weapon+'-'+state.name,'blue',true);
  try{
   const p={...base,...arm,...state,
    replayFeet:[foot(12,-14),foot(12,-2)]};
   poseOperator(rig,p,0);
   const out=inspectOperatorPoseOutput(rig);
   assert.ok(out?.valid);
   assert.equal(out.generation,1);
   assert.equal(out.slotCount,rig.arms.length*3+rig.feet.length*4+
    5+2+9);
   for(const slot of out.slots)
    close(slot.values,nums(slot.node),
     arm.weapon+'/'+state.name+'/'+slot.id);
   assert.ok(out.slots.every(s=>s.values.every(Number.isFinite)));
   assert.equal(out.slots.filter(s=>s.owner==='frame').length,2);
   assert.equal(out.slots.filter(s=>s.owner==='body').length,3);
   assert.equal(out.slots.filter(s=>s.owner==='lower-body').length,8);
   assert.equal(out.slots.filter(s=>s.owner==='upper-body').length,6);
   assert.equal(out.slots.filter(s=>s.owner==='weapon').length,2);
   assert.equal(out.slots.filter(s=>s.owner==='attachments').length,9);
  }finally{rig.dispose();}
 }
});

test('B6: two operators and reverse seek preserve complete direct published pose',()=>{
 const a=createOperatorRig('b6-seek-a','blue',true),
  b=createOperatorRig('b6-seek-b','blue',true);
 const p={...base,seconds:9.42,
  weaponConfiguration:config('carbine','ar-m4a1',true),
  replayFeet:[foot(12,-14),foot(12,-2)]};
 try{
  poseOperator(a,p,0);poseOperator(b,{...p,heading:1.18},0);
  const first=view(a),published=inspectOperatorPoseOutput(a);
  const buffers=published.slots.map(s=>s.values);
  poseOperator(b,{...p,seconds:11,down:true,downProgress:1},0);
  assert.deepEqual(view(a),first,'another rig cannot mutate published values');
  poseOperator(a,{...p,seconds:12.42,
   handlingOverride:'short',shortCompression:.8},0);
  poseOperator(a,p,-1);
  for(const [id,expected] of Object.entries(first))
   close(view(a)[id],expected,'seek '+id,2e-7);
  poseOperator(a,p,0);
  for(const [id,expected] of Object.entries(first))
   close(view(a)[id],expected,'same time '+id,2e-7);
  published.slots.forEach((s,i)=>assert.strictEqual(s.values,buffers[i]));
  assert.equal(published.generation,4);
 }finally{a.dispose();b.dispose();}
 assert.equal(inspectOperatorPoseOutput(a),null);
 assert.equal(inspectOperatorPoseOutput(b),null);
});

test('B6: no extra motor or pose clock, no visible intermediate body writes',()=>{
 const src=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
 const controller=src('breach-operator-animation-controller.ts');
 const frame=src('breach-operator-frame-output.ts');
 const output=src('breach-operator-pose-output.ts');
 assert.match(controller,/beginOperatorFramePose\(r,scratch\)/);
 assert.match(controller,/applyOperatorLegIK\(workingRig,p,scratch/);
 assert.match(controller,/applyOperatorTraumaPose\(r,p,downProgress,frame\)/);
 assert.match(controller,/finishOperatorFramePose\(frame\)/);
 for(const stage of ['frame','body','lower-body','upper-body','weapon',
  'attachments']){
  assert.match(controller,new RegExp(
   "stageDirectOperatorPoseOutput\\(r,p,'"+stage+"'"));
  assert.doesNotMatch(controller,new RegExp(
   "stageOperatorPoseOutput\\(r,p,'"+stage+"'"));
 }
 assert.doesNotMatch(controller,/r\.(?:hip|chest|head)\.(?:position|rotation|quaternion)/);
 assert.doesNotMatch(controller,/r\.root\.(?:position|rotation|quaternion)/);
 assert.match(controller,/updateOperatorAppearance\(r,p\)/);
 assert.match(controller,/v4AuthoredPouchAnchor\(v4Magazine,r.chest,r.hip\)/);
 assert.match(frame,/Object\.create\(r\)/);
 assert.match(frame,/f\.root\.parent=r\.root\.parent/);
 assert.doesNotMatch(frame,/\.add\(r\.root\)/);
 assert.equal((controller.match(/commitOperatorPoseOutput\(r,p\)/g)??[]).length,1);
 assert.match(output,/COMPLETE_STAGE_MASK/);
 for(const file of [controller,frame]){
  assert.doesNotMatch(file,/\bstepSession\(/);
  assert.doesNotMatch(file,/requestAnimationFrame\(/);
  assert.doesNotMatch(file,/Math\.random\(/);
 }
});
