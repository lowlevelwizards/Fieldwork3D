/** Arsenal M2.3: receiver-owned AK side dovetail + optional visible adapter. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment,readWeaponConfiguration,resolveWeaponAssembly,
 weaponAttachmentAllowed} from '../src/equipment-weapon-assemblies.ts';
import {ATTACHMENT_PRICES,attachmentPrice}
 from '../src/equipment-weapon-inventory.ts';
import {weaponPartMountSurfaces,preferredOpticMountSurface}
 from '../src/weapons/geometry/weapon-part-mount-surfaces.ts';
import {physicalWeaponMountSlots}
 from '../src/weapons/geometry/weapon-physical-mount-slots.ts';
import {physicalAttachmentFitOptions,previewPhysicalMountBuild}
 from '../src/weapons/geometry/weapon-physical-mount-fit.ts';
import {AK_SIDE_MOUNT_ART}
 from '../src/weapons/geometry/ak-side-mount-geometry.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {opticVisualSeat} from '../src/weapons/geometry/optic-visual-seating.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {proposeArsenalPartChange}
 from '../src/arsenal/compatibility.ts';

const mount='optic-ak-side-picatinny';
function factory(id){
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p,id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
}
function meshOf(root,name){
 let answer;
 root.traverse(o=>{
  if(o instanceof THREE.Mesh&&o.name===name)answer=o;
 });
 return answer;
}
function withBuilt(c,check){
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 const root=buildWeaponSilhouette(c.weapon,steel,dark,c);
 try{check(root)}finally{
  clearWeaponSilhouette(root);steel.dispose();dark.dispose();
 }
}
const near=(n,expected,label)=>assert.ok(Math.abs(n-expected)<.001,
 label+': '+n+' != '+expected);

test('M2.3 only AK-74M, AK-103 and AK-105 receivers advertise modeled left dovetails',()=>{
 const valid=['ak-ak74m','ak-ak103','ak-ak105'];
 for(const id of valid){
  const c=factory(id),snapshot=JSON.stringify(c);
  const mounts=FAMILY_PARTS[c.build.parts.receiver].mounts;
  assert.ok(mounts.some(x=>x.role==='opticMount'&&
   x.standard==='ak-side-dovetail'&&x.face==='side'),id);
  assert.ok(mounts.some(x=>x.role==='optic'&&
   x.standard==='ak-side-dovetail'&&x.face==='side'),id);
  const positions=physicalWeaponMountSlots(c.build);
  assert.equal(positions.filter(x=>x.role==='opticMount').length,1);
  const point=positions.find(x=>x.role==='opticMount');
  assert.equal(point.face,'left');
  assert.equal(point.support,'dovetail-bar');
  near(point.z,AK_SIDE_MOUNT_ART.contactZ,id+' side contact');
  const c2=readWeaponConfiguration(JSON.parse(JSON.stringify(c)),c.weapon);
  assert.equal(JSON.stringify(c),snapshot);
  assert.deepEqual(physicalWeaponMountSlots(c2.build),positions);
  withBuilt(c,root=>{
   const rail=meshOf(root,'family-art-ak-side-dovetail');
   assert.ok(rail,id+' missing real receiver rail mesh');
   assert.equal(rail.userData.akReceiverSideDovetail,true);
   const box=new THREE.Box3().setFromObject(rail);
   near(box.min.x,AK_SIDE_MOUNT_ART.startX,'left receiver bracket rear');
   near(box.max.x,AK_SIDE_MOUNT_ART.endX,'left receiver bracket forward');
   near(box.min.z,AK_SIDE_MOUNT_ART.contactZ,'contact Z must be outer geometry');
   assert.equal(meshOf(root,'family-art-ak-side-picatinny-adapter'),undefined,
    'receiver rail must not spawn a purchased adapter');
  });
 }
 for(const id of ['ak-akm','ak-ak74','ak-rpk74','ak-aks74u']){
  const c=factory(id);
  assert.equal(weaponAttachmentAllowed(c,'opticMount',mount),false,id);
  assert.equal(physicalWeaponMountSlots(c.build).filter(x=>
   x.standard==='ak-side-dovetail').length,0,id);
  withBuilt(c,root=>{
   assert.equal(meshOf(root,'family-art-ak-side-dovetail'),undefined,id);
   assert.equal(meshOf(root,'family-art-ak-side-picatinny-adapter'),undefined,id);
  });
 }
});

test('M2.3 adapter is a chosen owned part, not an automatic handguard replacement',()=>{
 const c=factory('ak-ak74m'),before=JSON.stringify(c);
 assert.equal(weaponAttachmentAllowed(c,'opticMount',mount),true);
 assert.equal(attachmentPrice(mount),125);
 assert.equal(ATTACHMENT_PRICES[mount],125);
 assert.equal(physicalAttachmentFitOptions(c,mount).feasible,true);
 assert.deepEqual(physicalAttachmentFitOptions(c,mount).options.map(x=>x.face),
  ['left']);
 assert.equal(physicalAttachmentFitOptions(c,'optic-magnified').reasons[0],
  'missing-adapter');
 assert.equal(JSON.stringify(c),before,'preview must not equip/purchase');
 const mounted=setWeaponAttachment(c,'opticMount',mount);
 assert.equal(mounted.slots.opticMount,mount);
 assert.equal(mounted.build.parts.handguard,c.build.parts.handguard);
 const surfaces=weaponPartMountSurfaces(mounted.build,mount);
 assert.ok(surfaces.some(x=>x.ownerPartId===mount&&
  x.role==='optic'&&x.standard==='picatinny'));
 assert.equal(preferredOpticMountSurface(mounted.build,mount).ownerPartId,mount);
 const locations=physicalWeaponMountSlots(mounted.build,mount);
 assert.equal(locations.filter(x=>x.ownerPartId===mount).length,3);
 withBuilt(mounted,root=>{
  assert.ok(meshOf(root,'family-art-ak-side-dovetail'));
  const adapter=meshOf(root,'family-art-ak-side-picatinny-adapter');
  assert.ok(adapter);
  assert.equal(adapter.userData.akSidePicatinnyAdapter,true);
  const box=new THREE.Box3().setFromObject(adapter);
  near(box.max.y,AK_SIDE_MOUNT_ART.bridgeTopY,'adapter upper support');
  assert.ok(box.min.z< -2.5,'adapter clamp really engages the left receiver');
  assert.ok(box.max.z>1.0,'cross-bridge reaches the optic centerline');
 });
});

test('M2.3 rear optic bridge seats reflex and magnified bodies without fake forward mount',()=>{
 let c=setWeaponAttachment(factory('ak-ak103'),'opticMount',mount);
 for(const id of ['optic-reflex','optic-magnified']){
  c=setWeaponAttachment(c,'optic',id);
  assert.equal(c.slots.optic,id);
  const before=JSON.stringify(c);
  const fit=physicalAttachmentFitOptions(c,id);
  assert.equal(fit.feasible,true,id+' should fit rear support');
  assert.ok(fit.options.every(p=>p.ownerPartId===mount&&p.face==='top'));
  const assembly=resolveWeaponAssembly(c);
  const visual=opticVisualSeat(c,assembly.mounted.optic.mountX);
  assert.equal(visual.mount,'ak-side-bridge');
  near(visual.supportY,AK_SIDE_MOUNT_ART.bridgeTopY,'bridge top Y');
  assert.ok(visual.x<0,'rear receiver optic, not forward handguard');
  assert.equal(assembly.sightHeight,
   id==='optic-magnified'?4.8:4.4,'keep legacy sight-height behavior');
  const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
  const art=buildWeaponAccessories(c,steel,dark);
  const support=meshOf(art,id==='optic-reflex'?
   'weapon-accessory-optic-reflex-base':
   'weapon-accessory-optic-magnified-mounts');
  assert.ok(support,id);
  const box=new THREE.Box3().setFromObject(support);
  near(box.min.y,AK_SIDE_MOUNT_ART.bridgeTopY,'visible optic feet seated');
  art.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
  art.clear();steel.dispose();dark.dispose();
  assert.equal(JSON.stringify(c),before);
 }
 const preview=previewPhysicalMountBuild(c);
 assert.equal(preview.unresolved.length,0);
 assert.deepEqual(preview.placements.map(p=>p.attachmentId),
  [mount,'optic-magnified']);
});

test('M2.3 a selected AK rear bridge overrides unusable forward magnified positions',()=>{
 const base=factory('ak-ak74m');
 // A legacy build may carry a fore-end top rail. The rear optic has its
 // own mount and must never be forced back to that forward rail.
 const railed={...base,build:{...base.build,
  parts:{...base.build.parts,handguard:'ak-rail-long'}}};
 let c=readWeaponConfiguration(railed,railed.weapon);
 c=setWeaponAttachment(c,'opticMount',mount);
 c=setWeaponAttachment(c,'optic','optic-magnified');
 const fit=physicalAttachmentFitOptions(c,'optic-magnified');
 assert.equal(fit.feasible,true);
 assert.ok(fit.options.length>0);
 assert.ok(fit.options.every(x=>x.ownerPartId===mount));
 assert.equal(c.build.parts.handguard,'ak-rail-long');
});

test('M2.3 existing saves survive equip/remove and Arsenal proposes but does not auto-buy adapter',()=>{
 let c=factory('ak-ak74m');
 const recipe=arsenalRecipeFromLegacy(c);
 assert.ok(recipe,'valid V2 AK recipe');
 const proposed=proposeArsenalPartChange(recipe,'optic','optic-reflex');
 assert.equal(proposed.valid,true);
 assert.equal(proposed.requiresConfirmation,true);
 assert.ok(proposed.changes.some(x=>x.slot==='opticMount'&&x.to===mount));
 assert.equal(recipe.accessories.opticMount,'optic-mount-none');
 assert.equal(recipe.accessories.optic,'optic-irons');
 const normalized=arsenalRecipeToLegacy(proposed.nextRecipe);
 assert.ok(normalized);
 assert.equal(normalized.slots.opticMount,mount);
 assert.equal(normalized.slots.optic,'optic-reflex');
 const saved=JSON.parse(JSON.stringify(normalized));
 const reloaded=readWeaponConfiguration(saved,normalized.weapon);
 assert.equal(reloaded.slots.opticMount,mount);
 assert.equal(reloaded.slots.optic,'optic-reflex');
 const removed=setWeaponAttachment(reloaded,'opticMount','optic-mount-none');
 assert.equal(removed.slots.optic,'optic-irons',
  'cannot leave a free-floating Picatinny optic when removing bridge');
 assert.equal(removed.slots.opticMount,'optic-mount-none');
 assert.equal(removed.build.parts.handguard,c.build.parts.handguard);
 const classic=factory('ak-akm');
 assert.equal(setWeaponAttachment(classic,'opticMount',mount),classic);
});
