/** M2.1: actual part geometry supplies handed contact positions.
 * Candidate locations do not yet reserve a clamp/attachment footprint.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {weaponPartMountSurfaces}
 from '../src/weapons/geometry/weapon-part-mount-surfaces.ts';
import {physicalWeaponMountSlots,physicalMountSlotsForRole}
 from '../src/weapons/geometry/weapon-physical-mount-slots.ts';

function preset(id){
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p,id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
}
const slots=c=>physicalWeaponMountSlots(c.build,c.slots.opticMount);
const round=n=>Math.round(n*10000)/10000;
function near(actual,expected,msg){
 assert.ok(Math.abs(actual-expected)<.0001,msg+': '+actual+' != '+expected);
}
function built(c,assertion){
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 const body=buildWeaponSilhouette(c.weapon,steel,dark,c);
 try{assertion(body)}finally{
  clearWeaponSilhouette(body);steel.dispose();dark.dispose();
 }
}

test('M2.1 every factory surface position is deterministic and backed by a declared owner',()=>{
 for(const factory of FAMILY_PRESETS){
  const c=preset(factory.id),before=JSON.stringify(c);
  const found=slots(c);
  const surfaces=weaponPartMountSurfaces(c.build,c.slots.opticMount);
  assert.deepEqual(slots(c),found,factory.id+' repeat query');
  assert.equal(JSON.stringify(c),before,factory.id+' mutated');
  const keys=new Set();
  for(const s of found){
   assert.ok(s.ownerPartId===c.build.parts.receiver||
    s.ownerPartId===c.build.parts.handguard||
    s.ownerPartId===c.slots.opticMount,factory.id+' ownership');
   assert.ok(surfaces.some(x=>x.id===s.surfaceId&&
    x.standard===s.standard&&x.role===s.role),factory.id+' declaration');
   assert.ok(!keys.has(s.id),factory.id+' duplicate slot '+s.id);
   keys.add(s.id);
   for(const n of [s.x,s.y,s.z,s.normalX,s.normalY,s.normalZ,
    s.contactStartX,s.contactEndX])assert.ok(Number.isFinite(n),s.id);
   assert.ok(s.contactStartX<=s.x&&s.x<=s.contactEndX,s.id);
   assert.ok(s.contactEndX>s.contactStartX,s.id);
   assert.ok(s.face==='left'||s.face==='right'?
    s.normalZ===(s.face==='left'?-1:1):
    s.normalY===(s.face==='top'?1:-1),s.id+' face normal');
  }
 }
});

test('M2.1 AR optic/foregrip/light teeth physically match the generated instanced geometry',()=>{
 const c=preset('ar-m4a1');
 const s=slots(c);
 const optic=s.filter(x=>x.role==='optic');
 const grip=s.filter(x=>x.role==='foregrip');
 const left=s.filter(x=>x.role==='light'&&x.face==='left');
 const right=s.filter(x=>x.role==='light'&&x.face==='right');
 assert.equal(optic.length,3);
 assert.equal(grip.length,4);
 assert.equal(left.length,4);
 assert.equal(right.length,4);
 assert.deepEqual(optic.map(x=>round(x.x)),[-4.5,-1.5,1.5]);
 for(let i=0;i<4;i++){
  near(left[i].x,right[i].x,'paired X');
  near(left[i].z,-2.57,'negative-Z outer tooth face');
  near(right[i].z,2.57,'positive-Z outer tooth face');
  near(left[i].y,.59,'side tooth center Y');
  near(grip[i].y,-1.82,'bottom rail outside Y');
  assert.equal(left[i].normalZ,-1);
  assert.equal(right[i].normalZ,1);
 }
 built(c,root=>{
  const toothInstances=[];
  root.traverse(mesh=>{
   if(!(mesh instanceof THREE.InstancedMesh)||!mesh.userData.arRailTeeth)return;
   const matrix=new THREE.Matrix4(),v=new THREE.Vector3();
   const q=new THREE.Quaternion(),scale=new THREE.Vector3();
   for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);matrix.decompose(v,q,scale);
    toothInstances.push({x:v.x,y:v.y,z:v.z,w:scale.x,h:scale.y,d:scale.z});
   }
  });
  assert.ok(toothInstances.length>15,'factory AR must build actual rail teeth');
  for(const site of s){
   assert.equal(site.support,'rail-tooth');
   const matched=toothInstances.find(t=>
    Math.abs(t.x-site.x)<.0001&&
    (site.face==='left'||site.face==='right'?
     Math.abs(t.y-site.y)<.0001&&
     Math.abs(Math.abs(t.z)+t.d/2-Math.abs(site.z))<.0001:
     Math.abs(t.z)<.0001&&
     Math.abs(t.y+(site.face==='top'?t.h/2:-t.h/2)-site.y)<.0001));
   assert.ok(matched,site.id+' missing actual instanced tooth');
   near(site.contactEndX-site.contactStartX,matched.w,'actual tooth X width');
  }
 });
});

test('M2.1 rail variants reproduce actual tooth count; covered sides offer no slots',()=>{
 const a=preset('ar-m16a4');
 const m5=slots(a);
 assert.equal(m5.filter(s=>s.role==='foregrip').length,5);
 assert.equal(m5.filter(s=>s.role==='light').length,10);
 let c=setConfiguredFamilyPart(preset('ar-mk18'),'handguard','ar-compact-rail');
 assert.equal(c.build.parts.handguard,'ar-compact-rail');
 const covered=slots(c);
 assert.equal(covered.filter(s=>s.role==='foregrip').length,4);
 assert.equal(covered.filter(s=>s.role==='light').length,0,
  'covered side must not be offered as a usable mount');
 const ris=slots(preset('ar-mk18'));
 assert.equal(ris.filter(s=>s.role==='foregrip').length,4);
 assert.equal(ris.filter(s=>s.role==='light').length,8);
 near(ris.find(s=>s.role==='foregrip').y,-1.64,'RIS bottom tooth outside Y');
});

test('M2.1 AK exposes actual top block only, not its legacy phantom lower/side interfaces',()=>{
 let c=setConfiguredFamilyPart(preset('ak-ak74m'),'handguard','ak-rail-long');
 assert.equal(c.build.parts.handguard,'ak-rail-long');
 const available=slots(c).filter(s=>s.ownerPartId==='ak-rail-long');
 assert.equal(available.length,3);
 assert.ok(available.every(s=>s.role==='optic'&&s.face==='top'&&
  s.support==='continuous-rail'));
 assert.equal(available.filter(s=>s.role==='foregrip'||s.role==='light').length,0);
 near(available[0].y,3.12,'top of AK modeled block');
 const spans=new Set(available.map(s=>s.contactStartX+':'+s.contactEndX));
 assert.equal(spans.size,1,'continuous rail shares one actual exposed span');
 built(c,root=>{
  const boxes=[];
  root.traverse(mesh=>{
   if(!(mesh instanceof THREE.Mesh)||!mesh.name.includes('handguard-ak-rail-long'))return;
   boxes.push(new THREE.Box3().setFromObject(mesh));
  });
  assert.ok(boxes.some(box=>available.every(s=>
   s.x>=box.min.x&&s.x<=box.max.x&&Math.abs(box.max.y-s.y)<.0001)),
   'every candidate sits on the rendered top rail box');
 });
 const plain=slots(preset('ak-akm'));
 assert.equal(plain.length,0,'wood furniture and receiver cannot invent a rail');
});

test('M2.1 HK claw feet are one four-point dependency, bridge has distinct top support',()=>{
 const before=preset('hk-g3a3');
 const receiver=slots(before);
 assert.equal(receiver.length,4);
 assert.ok(receiver.every(s=>s.role==='opticMount'&&
  s.support==='claw-foot'&&s.requiresGroup==='hk-claw-four-foot'));
 assert.equal(receiver.filter(s=>s.face==='left').length,2);
 assert.equal(receiver.filter(s=>s.face==='right').length,2);
 assert.deepEqual([...new Set(receiver.map(x=>round(x.x)))],[-4.6,1.25]);
 const withClaw=setWeaponAttachment(before,'opticMount','optic-hk-claw');
 assert.equal(withClaw.slots.opticMount,'optic-hk-claw');
 const found=slots(withClaw);
 const bridge=found.filter(s=>s.role==='optic');
 assert.equal(bridge.length,3);
 assert.ok(bridge.every(s=>s.ownerPartId==='optic-hk-claw'&&
  s.face==='top'&&s.support==='continuous-rail'));
 near(bridge[0].y,3.15,'HK bridge visual upper face');
 assert.equal(physicalMountSlotsForRole(withClaw.build,'optic',
  withClaw.slots.opticMount).length,3);
 for(const id of ['hk-hk33a2','hk-hk53a3','hk-mp5a3']){
  assert.equal(slots(preset(id)).filter(s=>s.requiresGroup).length,4,id);
 }
});

test('M2.1 MP5 tri-rail has correctly handed exterior faces and bottom support',()=>{
 const c=setConfiguredFamilyPart(preset('hk-mp5a3'),
  'handguard','hk-mp5-trirail');
 assert.equal(c.build.parts.handguard,'hk-mp5-trirail');
 const s=slots(c);
 assert.equal(s.filter(x=>x.role==='foregrip').length,3);
 assert.equal(s.filter(x=>x.role==='light').length,6);
 assert.equal(s.filter(x=>x.face==='left'&&x.role==='light').length,3);
 assert.equal(s.filter(x=>x.face==='right'&&x.role==='light').length,3);
 const side=s.find(x=>x.face==='right'&&x.role==='light');
 const bottom=s.find(x=>x.face==='bottom'&&x.role==='foregrip');
 near(side.z,1.755,'MP5 side rail outer Z face');
 near(side.y,-.29,'MP5 side rail center Y');
 near(bottom.y,-1.775,'MP5 lower rail outer Y face');
 built(c,root=>{
  const rails=[];
  root.traverse(obj=>{
   if(obj instanceof THREE.Mesh&&obj.userData.hkMP5TriRailSide)
    rails.push(new THREE.Box3().setFromObject(obj));
  });
  assert.equal(rails.length,3);
  for(const loc of s.filter(x=>x.role==='foregrip'||x.role==='light')){
   assert.ok(rails.some(box=>
    loc.x>=box.min.x&&loc.x<=box.max.x&&
    (loc.face==='bottom'?Math.abs(box.min.y-loc.y)<.0001:
     Math.abs((loc.face==='left'?box.min.z:box.max.z)-loc.z)<.0001)),
    loc.id+' missing physical MP5 rail block');
  }
 });
});

test('M2.1 FAL, FNC, original G36, classic AR and plain AK stay rail-free',()=>{
 for(const id of ['fal-5000','ar-m16a1','ar-m16a2','ak-ak74']){
  assert.equal(slots(preset(id)).length,0,id);
 }
 for(const family of ['fal','fnc','g36']){
  const p=FAMILY_PRESETS.find(x=>x.family===family);
  assert.ok(p);
  assert.equal(slots(preset(p.id)).length,0,p.id);
 }
});
