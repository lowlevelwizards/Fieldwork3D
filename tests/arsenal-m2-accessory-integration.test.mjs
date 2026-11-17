/** M2.5 — rail-owned grips/lights, cross-face clearance, pose and beams. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment,setConfiguredFamilyPart,readWeaponConfiguration,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {physicalAttachmentFitOptions} from '../src/weapons/geometry/weapon-physical-mount-fit.ts';
import {resolveMountedAccessoryLayout,mountedAccessorySeat,
 mountedSeatFromPlacement,accessorySeatsConflict}
 from '../src/weapons/geometry/mounted-accessory-layout.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {weaponGrips} from '../src/breach-weapon-pose.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {weaponLightEmitter} from '../src/equipment-weapon-light-beam.ts';
import {fittedWeaponLight} from '../src/equipment-weapon-light-operations.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {proposeArsenalPartChange} from '../src/arsenal/compatibility.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const preset=id=>{
 const weapon=id.startsWith('hk-mp5')?'smg':
  id==='ak-aks74u'||id==='ar-m4a1'?'carbine':'rifle';
 return selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),id);
};
const equip=(c,slot,id)=>{
 const next=setWeaponAttachment(c,slot,id);
 assert.equal(next.slots[slot],id,'set rejected '+c.build?.family+' '+id);
 return next;
};
const close=(x,y,label)=>assert.ok(Math.abs(x-y)<.001,label+': '+x+' != '+y);
const draw=c=>buildWeaponAccessories(c,WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER);
const dispose=g=>{g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});g.clear()};

test('M2.5A physical layout is deterministic, immutable and covers optic, grip, light',()=>{
 let c=preset('ar-m4a1');
 c=equip(c,'optic','optic-reflex');
 c=equip(c,'foregrip','foregrip-vertical');
 c=equip(c,'light','light-compact');
 const before=JSON.stringify(c);
 const a=resolveMountedAccessoryLayout(c),b=resolveMountedAccessoryLayout(c);
 assert.strictEqual(a,b,'cached immutable config');
 assert.deepEqual(a.unresolved,[],'joint layout available');
 assert.deepEqual(a.mounts.map(x=>x.slot),['optic','foregrip','light']);
 assert.equal(JSON.stringify(c),before);
 assert.ok(a.mounts.every(x=>x.placement.ownerPartId));
});

test('M2.5B vertical grip and handstop touch modeled bottom rail with distinct palm contacts',()=>{
 const c=preset('ar-m4a1');
 for(const id of ['foregrip-vertical','foregrip-handstop']){
  const config=equip(c,'foregrip',id);
  const seat=mountedAccessorySeat(config,'foregrip');
  assert.ok(seat,id);
  assert.equal(seat.placement.face,'bottom');
  assert.equal(seat.placement.ownerPartId,config.build.parts.handguard);
  assert.equal(seat.normalY,-1);
  const contact=riflePoseContacts(config.weapon,config);
  assert.ok(contact);
  close(contact.support.near.x,seat.hand.x-.18,'grip near');
  close(contact.support.far.x,seat.hand.x+.18,'grip far');
  close(contact.support.near.y,seat.hand.y,'palm Y');
  const grip=weaponGrips(config.weapon,config,'ads');
  close(grip.supportX,seat.hand.x,'weapon grip X');
  close(grip.supportY,seat.hand.y,'weapon grip Y');
  const model=draw(config);
  const group=model.getObjectByName('weapon-accessory-'+id);
  assert.ok(group);
  const bounds=new THREE.Box3().setFromObject(group);
  assert.ok(bounds.max.y<=seat.placement.y+.20,'no free-floating grip');
  assert.ok(bounds.min.y<seat.placement.y-.5,'grip extends below rail');
  dispose(model);
 }
});

test('M2.5C AR/MP5 side rail light positions mirror with real face normals',()=>{
 let ar=preset('ar-m4a1');
 const options=physicalAttachmentFitOptions(ar,'light-compact').options;
 assert.ok(options.length>=2);
 const right=options.find(x=>x.face==='right'),left=options.find(x=>x.face==='left');
 assert.ok(right&&left,'both exposed AR rail faces');
 const r=mountedSeatFromPlacement(right),l=mountedSeatFromPlacement(left);
 assert.equal(r.normalZ,1);
 assert.equal(l.normalZ,-1);
 assert.ok(r.z>right.z&&l.z<left.z);
 assert.ok(r.lens.x===r.x+2.68&&l.lens.x===l.x+2.68);
 assert.ok(r.volume.minZ>right.z&&l.volume.maxZ<left.z);
 ar=equip(ar,'light','light-compact');
 const seat=mountedAccessorySeat(ar,'light');
 assert.ok(seat&&seat.placement.face==='right','right-hand default');
 const art=draw(ar);
 const model=art.getObjectByName('weapon-accessory-light-body');
 const lens=art.getObjectByName('weapon-light-lens');
 assert.ok(model&&lens);
 close(model.position.z,seat.z,'visible body normal Z');
 close(lens.position.x,seat.lens.x,'real lens X');
 assert.equal(lens.visible,false,'existing visibility authority');
 dispose(art);
 let mp5=preset('hk-mp5a3');
 mp5=setConfiguredFamilyPart(mp5,'handguard','hk-mp5-trirail');
 mp5=equip(mp5,'light','light-compact');
 const mp5Seat=mountedAccessorySeat(mp5,'light');
 assert.ok(mp5Seat&&mp5Seat.placement.ownerPartId==='hk-mp5-trirail');
});

test('M2.5D 3D volume/hand conflicts reject actual overlap, tolerate different outward rails',()=>{
 const c=preset('ar-m4a1');
 const light=mountedSeatFromPlacement(
  physicalAttachmentFitOptions(c,'light-compact').options[0]);
 const grip=mountedSeatFromPlacement(
  physicalAttachmentFitOptions(c,'foregrip-vertical').options[0]);
 assert.equal(accessorySeatsConflict(light,grip),false);
 const overlapping={
  ...light,
  volume:{...light.volume,
   minY:grip.volume.minY+.1,maxY:grip.volume.maxY-.1,
   minZ:grip.volume.minZ+.1,maxZ:grip.volume.maxZ-.1}
 };
 assert.equal(accessorySeatsConflict(overlapping,grip),true);
});

test('M2.5E/F light emitter projects from rendered lens and support hand follows grip',()=>{
 let c=preset('ar-m4a1');
 c=equip(c,'foregrip','foregrip-vertical');
 c=equip(c,'light','light-compact');
 const light=mountedAccessorySeat(c,'light');
 const p=riflePoseContacts(c.weapon,c);
 assert.ok(light?.lens&&p);
 const hand=mountedAccessorySeat(c,'foregrip').hand;
 close(p.support.near.y,hand.y,'hand and grip share contact');
 // Compare absolute displacement, independent of world-space pose.
 const source=weaponLightEmitter({x:0,z:0,yaw:0},c);
 const actualGun=resolveWeaponAssembly(c);
 close(source.x,-(actualGun.muzzleX-light.lens.x)*actualGun.lengthScale,
  'light emitter uses physical lens X');
});

test('M2.5G prohibit new phantom light/grip without discarding older saved items',()=>{
 const ak=preset('ak-ak74m'),fal=preset('fal-5000');
 for(const c of [ak,fal]){
  assert.strictEqual(setWeaponAttachment(c,'light','light-compact'),c);
  assert.strictEqual(setWeaponAttachment(c,'foregrip','foregrip-vertical'),c);
  const stale=readWeaponConfiguration({...c,
   slots:{...c.slots,light:'light-compact'}},c.weapon);
  assert.equal(stale.slots.light,'light-compact','historical paid stock preserved');
  assert.equal(fittedWeaponLight({weaponConfiguration:stale}),false,
   'phantom rail cannot emit');
  assert.ok(resolveMountedAccessoryLayout(stale).unresolved.some(x=>
   x.attachmentId==='light-compact'));
  const recipe=arsenalRecipeFromLegacy(c);
  assert.ok(recipe);
  assert.equal(proposeArsenalPartChange(recipe,'light','light-compact').valid,false);
 }
 const g=preset('g36-service');
 assert.equal(setWeaponAttachment(g,'light','light-compact').slots.light,'light-none');
});

test('M2.5H MP5 tri-rail supports grip once, without changing factory MP5K',()=>{
 let mp5=preset('hk-mp5a3');
 mp5=setConfiguredFamilyPart(mp5,'handguard','hk-mp5-trirail');
 mp5=equip(mp5,'foregrip','foregrip-vertical');
 const g=draw(mp5);
 assert.equal(g.children.filter(x=>x.name==='weapon-accessory-foregrip-vertical').length,1);
 assert.ok(mountedAccessorySeat(mp5,'foregrip'));
 dispose(g);
 const k=preset('hk-mp5k');
 assert.equal(k.slots.foregrip,'foregrip-none');
 assert.equal(mountedAccessorySeat(k,'foregrip'),undefined);
});
