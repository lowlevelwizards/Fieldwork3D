import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {createOperatorRig} from '../src/breach-operator-rig.ts';
import {updateOperatorAppearance} from '../src/breach-operator-appearance.ts';
import {carryPlacementLedger} from '../src/equipment-carry-placement.ts';
import {bakedOperatorCarry,prewarmSavedOperatorCarry}
 from '../src/rendering/breach-saved-operator-carry-bake.ts';

test('saved operator visuals pre-bake the unchanged magazine and equipment projection',()=>{
 const s=newSession(0,2020);
 const actor=s.operators.find(a=>a.side==='blue');
 assert.ok(actor?.equipment);
 prewarmSavedOperatorCarry(actor);
 const first=bakedOperatorCarry(actor);
 const fresh=carryPlacementLedger(actor.equipment,actor.spareMagazines);
 assert.deepEqual(first.all,fresh);
 assert.deepEqual(first.locations,first.magazines.map(x=>x.location));
 assert.equal(bakedOperatorCarry(actor),first,'no repeat allocation on unchanged loadout');
 const mag=actor.spareMagazines[0];
 if(mag){
  mag.rounds+=1;
  assert.equal(bakedOperatorCarry(actor),first,'rounds never affect pouch presentation');
  mag.location=mag.location==='rig'?'belt':'rig';
  const changed=bakedOperatorCarry(actor);
  assert.notEqual(changed,first,'in-place assigned carry slot invalidates');
  assert.deepEqual(changed.all,carryPlacementLedger(actor.equipment,actor.spareMagazines));
 }
 actor.equipment.slots.rig=actor.equipment.slots.rig==='rig-none'?'rig-full':'rig-none';
 const modified=bakedOperatorCarry(actor);
 assert.deepEqual(modified.all,carryPlacementLedger(actor.equipment,actor.spareMagazines));
 assert.equal(bakedOperatorCarry(actor),modified);
});

test('saved static wardrobe and atlas bake runs before pose and reuses the cached fingerprint',()=>{
 const s=newSession(0,2021),actor=s.operators.find(a=>a.side==='blue');
 assert.ok(actor?.equipment);
 const rig=createOperatorRig(actor.id,actor.side,true);
 const carried=bakedOperatorCarry(actor);
 const saved={
  appearanceSeed:actor.appearanceSeed,equipment:actor.equipment,
  wardrobe:actor.wardrobe,weaponConfiguration:actor.weaponConfiguration,
  magazineCarryLocations:carried.locations,
  medicalCarryLocation:carried.medical,
  utilityCarryLocation:carried.utility,
  flashCharges:actor.flashCharges,treatmentActive:actor.treatmentActive,
  down:actor.health<=0,surrender:actor.surrendered
 };
 const first=updateOperatorAppearance(rig,saved);
 const key=rig.root.userData.fieldworkLightingAppearanceKey;
 assert.equal(typeof key,'string');
 assert.ok(key.length>2);
 const second=updateOperatorAppearance(rig,saved);
 assert.deepEqual(second,first,'same prepared saved look needs no reassembly');
 assert.equal(rig.root.userData.fieldworkLightingAppearanceKey,key);
 rig.dispose();
});
