/** Arsenal M2.4 complete: identities, distinct mounting standards, eye box,
 * visual contact and atomic/non-destructive recipe compatibility. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {WEAPON_ATTACHMENTS,initialWeaponConfiguration,
 selectWeaponFamilyPreset,setWeaponAttachment,setConfiguredFamilyPart,
 weaponAttachmentAllowed,readWeaponConfiguration,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {opticProfile,OPTIC_PROFILES}
 from '../src/weapons/geometry/optic-profiles.ts';
import {aimedOpticEyeReference,opticEyeBoxCheck}
 from '../src/weapons/geometry/weapon-optic-eye-box.ts';
import {physicalAttachmentFitOptions,physicalAttachmentFootprint,
 previewPhysicalMountBuild}
 from '../src/weapons/geometry/weapon-physical-mount-fit.ts';
import {opticVisualSeat} from '../src/weapons/geometry/optic-visual-seating.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy,readArsenalRecipe}
 from '../src/arsenal/recipes.ts';
import {proposeArsenalPartChange}
 from '../src/arsenal/compatibility.ts';
import {attachmentPrice,readAttachmentStock,returnAttachments}
 from '../src/equipment-weapon-inventory.ts';

function factory(id){
 const p=FAMILY_PRESETS.find(x=>x.id===id);assert.ok(p,id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
}
const fit=(c,id)=>physicalAttachmentFitOptions(c,id);
const near=(x,y,l)=>assert.ok(Math.abs(x-y)<.001,l+': '+x+' != '+y);
function mesh(g,name){
 let found;g.traverse(o=>{if(o instanceof THREE.Mesh&&o.name===name)found=o});
 return found;
}
function withArt(c,fn){
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 const body=buildWeaponSilhouette(c.weapon,steel,dark,c);
 const accessory=buildWeaponAccessories(c,steel,dark);
 try{fn(body,accessory)}finally{
  clearWeaponSilhouette(body);
  accessory.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
  accessory.clear();steel.dispose();dark.dispose();
 }
}

test('M2.4A all non-default selectable optics have one authoritative variant profile',()=>{
 for(const part of Object.values(WEAPON_ATTACHMENTS).filter(x=>x.slot==='optic'&&x.id!=='optic-irons')){
  const p=opticProfile(part.id);
  assert.ok(p,'profile missing: '+part.id);
  assert.equal(p.id,part.id);
  assert.ok(p.sightClass&&p.familyId);
  if(!p.mount.integrated)assert.ok(p.mount.clampOffsetsX.length>=1);
 }
 assert.equal(opticProfile('optic-kashtan-ak').familyId,
  opticProfile('optic-kashtan-p').familyId);
 assert.equal(opticProfile('optic-kashtan-ak').magnification,2.8);
 assert.equal(opticProfile('optic-kashtan-p').magnification,2.8);
 assert.equal(opticProfile('optic-kashtan-ak').mount.standard,
  'ak-side-dovetail');
 assert.equal(opticProfile('optic-kashtan-p').mount.standard,'picatinny');
 assert.equal(opticProfile('optic-g36-integrated').mount.standard,'integrated');
 assert.deepEqual(new Set(Object.keys(OPTIC_PROFILES)).size,
  Object.keys(OPTIC_PROFILES).length);
});

test('M2.4B AK direct variant is not universal Picatinny and consumes one dovetail',()=>{
 const ak=factory('ak-ak74m'),ar=factory('ar-m4a1'),hk=factory('hk-g3a3');
 assert.equal(weaponAttachmentAllowed(ak,'optic','optic-kashtan-ak'),true);
 assert.equal(weaponAttachmentAllowed(ak,'optic','optic-kashtan-p'),false);
 assert.equal(weaponAttachmentAllowed(ar,'optic','optic-kashtan-ak'),false);
 assert.equal(weaponAttachmentAllowed(hk,'optic','optic-kashtan-ak'),false);
 const direct=fit(ak,'optic-kashtan-ak');
 assert.equal(direct.feasible,true,direct.reasons.join(','));
 assert.equal(direct.options[0].face,'left');
 assert.equal(direct.options[0].standard,'ak-side-dovetail');
 assert.equal(direct.options[0].supportIds.length,1);
 assert.equal(physicalAttachmentFootprint('optic-kashtan-ak').contactOffsets.length,1);
 const bridge=setWeaponAttachment(ak,'opticMount','optic-ak-side-picatinny');
 assert.deepEqual(fit(bridge,'optic-kashtan-ak').reasons,['mount-conflict']);
 assert.equal(weaponAttachmentAllowed(bridge,'optic','optic-kashtan-ak'),false);
 assert.equal(weaponAttachmentAllowed(bridge,'optic','optic-kashtan-p'),true);
});

test('M2.4C stock-derived aim eye checks actual ocular distance, not just rail ownership',()=>{
 const ar=factory('ar-m4a1');
 const p=opticProfile('optic-magnified');
 const positions=fit(ar,'optic-magnified').options;
 assert.ok(positions.length>=2);
 for(const s of positions){
  const e=opticEyeBoxCheck(ar,p,s);
  assert.equal(e.valid,true);
  assert.ok(e.distance>=p.eyeRelief.minDistance&&
   e.distance<=p.eyeRelief.maxDistance);
  assert.equal(e.eye.source,'aimed-stock-contact');
 }
 const eye=aimedOpticEyeReference(ar);
 assert.ok(eye.x<0);
 const ak=setConfiguredFamilyPart(factory('ak-ak74m'),
  'handguard','ak-rail-long');
 assert.deepEqual(fit(ak,'optic-magnified').reasons,['forward-eye-relief']);
 assert.equal(fit(ak,'optic-reflex').feasible,true,
  'unrestricted 1x remains suitable for forward Picatinny');
 const withBridge=setWeaponAttachment(ak,'opticMount','optic-ak-side-picatinny');
 const rear=fit(withBridge,'optic-magnified');
 assert.equal(rear.feasible,true,rear.reasons.join(','));
 assert.ok(rear.options.every(o=>o.ownerPartId==='optic-ak-side-picatinny'));
 assert.equal(fit(ak,'optic-kashtan-p').feasible,false);
 assert.ok(fit(ak,'optic-kashtan-p').reasons.includes('forward-eye-relief'));
 assert.equal(fit(withBridge,'optic-kashtan-p').feasible,true);
});

test('M2.4D visual optic seat uses accepted physical site with no invented AR/HK supports',()=>{
 for(const [id,optic,mount] of [
  ['ar-m4a1','optic-magnified','optic-mount-none'],
  ['hk-g3a3','optic-reflex','optic-hk-claw'],
  ['ak-ak103','optic-kashtan-p','optic-ak-side-picatinny'],
  ['ak-ak103','optic-kashtan-ak','optic-mount-none']
 ]){
  let c=factory(id);
  if(mount!=='optic-mount-none')c=setWeaponAttachment(c,'opticMount',mount);
  c=setWeaponAttachment(c,'optic',optic);
  assert.equal(c.slots.optic,optic,id);
  const placement=fit(c,optic).options[0];assert.ok(placement,id);
  const seat=opticVisualSeat(c,resolveWeaponAssembly(c).mounted.optic.mountX);
  near(seat.x,placement.x,id+' X');
  near(seat.supportY,placement.y+
   opticProfile(optic).visual.supportRiseY,id+' physical support');
  if(optic==='optic-kashtan-ak'){
   assert.equal(seat.mount,'ak-direct-side');
   near(seat.z,-.48,'asymmetric optic axis');
  }
  if(id==='ar-m4a1')assert.equal(seat.mount,'ar-top');
  if(id==='hk-g3a3')assert.equal(seat.mount,'hk-claw');
 }
});

test('M2.4E Kashtan variants share a readable body but use different owned brackets',()=>{
 const ak=factory('ak-ak103');
 const direct=setWeaponAttachment(ak,'optic','optic-kashtan-ak');
 const rail=setWeaponAttachment(
  setWeaponAttachment(ak,'opticMount','optic-ak-side-picatinny'),
  'optic','optic-kashtan-p');
 assert.equal(direct.slots.optic,'optic-kashtan-ak');
 assert.equal(rail.slots.optic,'optic-kashtan-p');
 withArt(direct,(body,art)=>{
  assert.ok(mesh(body,'family-art-ak-side-dovetail'));
  assert.equal(mesh(body,'family-art-ak-side-picatinny-adapter'),undefined);
  assert.ok(mesh(art,'weapon-accessory-optic-kashtan-main'));
  assert.ok(mesh(art,'weapon-accessory-optic-kashtan-eyecup'));
  assert.ok(mesh(art,'weapon-accessory-optic-kashtan-objective'));
  assert.ok(mesh(art,'weapon-accessory-optic-kashtan-side-bracket'));
  assert.equal(mesh(art,'weapon-accessory-optic-kashtan-rail-bracket'),undefined);
  const dovetail=new THREE.Box3().setFromObject(mesh(body,'family-art-ak-side-dovetail'));
  const bracket=new THREE.Box3().setFromObject(mesh(art,'weapon-accessory-optic-kashtan-side-bracket'));
  assert.ok(bracket.min.z<=dovetail.min.z+.02&&
   bracket.max.z>=dovetail.min.z+.02,'side bracket engages real rail');
  const main=new THREE.Box3().setFromObject(mesh(art,'weapon-accessory-optic-kashtan-main'));
  assert.ok(main.min.z<0&&main.max.z>0,'side optic optical body offset is modest');
  assert.ok(main.min.y<bracket.max.y,'bracket supports actual optic body');
 });
 withArt(rail,(body,art)=>{
  assert.ok(mesh(body,'family-art-ak-side-picatinny-adapter'));
  assert.equal(mesh(art,'weapon-accessory-optic-kashtan-side-bracket'),undefined);
  assert.ok(mesh(art,'weapon-accessory-optic-kashtan-rail-bracket'));
  const bracket=new THREE.Box3().setFromObject(mesh(art,'weapon-accessory-optic-kashtan-rail-bracket'));
  const top=new THREE.Box3().setFromObject(mesh(body,'family-art-ak-side-picatinny-adapter'));
  near(bracket.min.y,top.max.y,'rail variant touches actual top bridge');
 });
});

test('M2.4F Arsenal requires confirmed explicit bridge exchange and preserves equipment',()=>{
 const ak=factory('ak-ak74m');
 const p=arsenalRecipeFromLegacy(ak);assert.ok(p);
 const direct=proposeArsenalPartChange(p,'optic','optic-kashtan-ak');
 assert.equal(direct.valid,true);
 assert.equal(direct.requiresConfirmation,false);
 assert.equal(direct.nextRecipe.accessories.opticMount,'optic-mount-none');
 assert.equal(direct.nextRecipe.accessories.optic,'optic-kashtan-ak');
 const equipped=arsenalRecipeToLegacy(direct.nextRecipe);assert.ok(equipped);
 assert.equal(readWeaponConfiguration(JSON.parse(JSON.stringify(equipped)),
  equipped.weapon).slots.optic,'optic-kashtan-ak');
 const rail=proposeArsenalPartChange(direct.nextRecipe,'optic','optic-kashtan-p');
 assert.equal(rail.valid,true);
 assert.equal(rail.requiresConfirmation,true);
 assert.ok(rail.changes.some(x=>x.slot==='opticMount'&&
  x.to==='optic-ak-side-picatinny'));
 assert.equal(direct.nextRecipe.accessories.optic,'optic-kashtan-ak',
  'proposal never mutates source recipe');
 assert.equal(attachmentPrice('optic-kashtan-ak'),285);
 assert.equal(attachmentPrice('optic-kashtan-p'),285);
 const restored=readArsenalRecipe(JSON.parse(JSON.stringify(rail.nextRecipe)));
 assert.ok(restored);
 assert.equal(arsenalRecipeToLegacy(restored).slots.optic,'optic-kashtan-p');
 const back=proposeArsenalPartChange(rail.nextRecipe,'optic','optic-kashtan-ak');
 assert.equal(back.valid,true);
 assert.equal(back.requiresConfirmation,true);
 assert.ok(back.changes.some(x=>x.slot==='opticMount'&&x.to==='optic-mount-none'));
 const stock=readAttachmentStock({'optic-kashtan-ak':1,'optic-kashtan-p':1});
 const after=returnAttachments(stock,
  arsenalRecipeToLegacy(rail.nextRecipe),arsenalRecipeToLegacy(back.nextRecipe));
 assert.equal(after['optic-kashtan-p'],2,'displaced owned optic returned to stock');
 assert.equal(after['optic-kashtan-ak'],1,'no purchase charged by preview');
});

test('M2.4F new magnified placements enforce eye relief while legacy saves are retained',()=>{
 const base=setConfiguredFamilyPart(factory('ak-ak74m'),'handguard','ak-rail-long');
 const legacy=setWeaponAttachment(base,'optic','optic-magnified');
 assert.equal(legacy.slots.optic,'optic-magnified','old compatible M1 item retained');
 assert.ok(previewPhysicalMountBuild(legacy).unresolved.some(x=>
  x.attachmentId==='optic-magnified'));
 const saved=readWeaponConfiguration(JSON.parse(JSON.stringify(legacy)),legacy.weapon);
 assert.equal(saved.slots.optic,'optic-magnified','read must not delete legacy scope');
 const recipe=arsenalRecipeFromLegacy(base);assert.ok(recipe);
 const proposal=proposeArsenalPartChange(recipe,'optic','optic-magnified');
 assert.equal(proposal.valid,true,'rear adapter should be suggested');
 assert.equal(proposal.requiresConfirmation,true);
 assert.ok(proposal.changes.some(x=>x.slot==='opticMount'&&
  x.to==='optic-ak-side-picatinny'));
});

test('M2.4G factory integrated G36 and preexisting AR/HK optic workflows remain unchanged',()=>{
 const g=FAMILY_PRESETS.find(x=>x.family==='g36');assert.ok(g);
 const factoryG=factory(g.id);
 assert.equal(factoryG.slots.optic,'optic-g36-integrated');
 assert.equal(resolveWeaponAssembly(factoryG).mounted.optic.id,'optic-g36-integrated');
 assert.equal(fit(factoryG,'optic-kashtan-p').feasible,false);
 for(const c of [factory('ar-m4a1'),
  setWeaponAttachment(factory('hk-g3a3'),'opticMount','optic-hk-claw')]){
  for(const id of ['optic-reflex','optic-magnified']){
   const old=JSON.stringify(c);
   const response=fit(c,id);
   assert.equal(response.feasible,true,c.build.family+' '+id+' '+response.reasons);
   assert.equal(JSON.stringify(c),old);
  }
 }
});
