/** UOP: appearance fingerprint governs shared resolved garment fit.
 * Mutating a Studio outfit in place must invalidate the per-rig snapshot.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

test('UOP garment cache is stable across time and reacts to in-place kit editing',()=>{
 const rig=createOperatorRig('uop-outfit-cache','blue',true);
 const initial=initialWardrobe();
 const wardrobe={...initial,styles:{...initial.styles,
   armorStyle:'plate-jpc',rigStyle:'no-rig',top:'bdu-shirt'}};
 let kit=initialEquipmentLoadout('carbine');
 kit=setEquipmentChoice(kit,'armor','armor-carrier');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 const configuration=selectWeaponFamilyPreset(
   initialWeaponConfiguration('carbine'),'ar-m4a1');
 const state={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:'carbine',
   reload:0,reloadDuration:0,
   lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
   aiming:false,firing:false,turning:0,deterministic:true,
   handlingOverride:'low',aimBlend:0,poseV3Preview:true,
   poseV4ReloadPreview:true,equipment:kit,wardrobe,
   weaponConfiguration:configuration};
 try{
  poseOperator(rig,state,0);
  const first=rig.root.userData.lowReadyPoseReport;
  assert.equal(first?.armor,'plate-jpc');
  assert.equal(first?.rig,'no-rig');
  assert.equal(first?.top,'bdu-shirt');
  poseOperator(rig,{...state,seconds:1},0);
  assert.equal(rig.root.userData.lowReadyPoseReport?.armor,'plate-jpc');
  // Mutate the exact same wardrobe object (normal Studio behavior).
  wardrobe.styles.armorStyle='plate-heavy';
  wardrobe.styles.top='smock-jacket';
  poseOperator(rig,{...state,seconds:2},0);
  const changed=rig.root.userData.lowReadyPoseReport;
  assert.equal(changed?.armor,'plate-heavy');
  assert.equal(changed?.rig,'no-rig');
  assert.equal(changed?.top,'smock-jacket');
  // An actual full rig must also be present; Wardrobe cosmetics cannot
  // invent equipment that was not equipped by the authoritative loadout.
  const fullKit=setEquipmentChoice(kit,'rig','rig-full');
  wardrobe.styles.rigStyle='full-chest';
  poseOperator(rig,{...state,equipment:fullKit,seconds:2.5},0);
  assert.equal(rig.root.userData.lowReadyPoseReport?.rig,'full-chest');
  wardrobe.styles.armorStyle='plate-jpc';
  wardrobe.styles.rigStyle='no-rig';
  wardrobe.styles.top='bdu-shirt';
  poseOperator(rig,{...state,seconds:3},0);
  assert.equal(rig.root.userData.lowReadyPoseReport?.armor,'plate-jpc',
   'restoring earlier appearance must not preserve heavy envelope');
 }finally{rig.dispose();}
});
