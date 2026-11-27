import test from 'node:test';import assert from 'node:assert/strict';
import {PACK_STYLES} from '../src/operator-backpack-catalog.ts';
import {packCargoMass,packSuspensionScale,packPrimaryMagazineMass} from '../src/operator-backpack-motion.ts';
import {packInertia} from '../src/breach-gear-inertia.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
test('BP11 direct mounting is rigid; loaded suspension has less play',()=>{
 for(const style of PACK_STYLES){
  assert.equal(packSuspensionScale(style,'direct',5),0);
  const empty=packSuspensionScale(style,'independent',0);
  const loaded=packSuspensionScale(style,'independent',8);
  assert.ok(empty>=loaded&&loaded>=0&&empty<=.85);
  assert.ok(packSuspensionScale(style,'shared',0)<=empty);
  for(const a of [-10000,0,10000]){
   const p=packInertia(a,.2);
   assert.ok(Math.abs(p.side*empty)<=.187);
   assert.ok(Math.abs(p.lean*empty)<=.034);
  }
 }
 assert.ok(packSuspensionScale('civilian-pack','independent',0)>packSuspensionScale('field-pack','independent',0));
 assert.equal(packSuspensionScale('no-pack','independent',0),0);
});
test('BP11 cargo counts backpack contents only',()=>{
 const kit=initialEquipmentLoadout();
 kit.fieldInventory={version:1,stacks:[{itemId:'flashbang',quantity:2,location:'backpack'},{itemId:'flashbang',quantity:1,location:'belt'}]};
 assert.ok(Math.abs(packCargoMass(kit,['backpack','rig'])-1.08)<1e-8);
 assert.equal(packCargoMass(undefined,['rig']),0);
});

test('BP11 deployed rounds refine suspension from the ledger, not inferred pouch count',()=>{
 const mags=[{id:'one',rounds:25,location:'rig'},{id:'two',rounds:10,location:'backpack'}];
 const placed=[{id:'one',location:'backpack'},{id:'two',location:'rig'}];
 const full=packPrimaryMagazineMass(mags,placed);
 assert.ok(full>.12);
 mags[0].rounds=0;
 const empty=packPrimaryMagazineMass(mags,placed);
 assert.equal(empty,.12);
 assert.ok(packSuspensionScale('rucksack','independent',full)<packSuspensionScale('rucksack','independent',empty));
 assert.equal(packPrimaryMagazineMass(mags,[{id:'missing',location:'backpack'}]),0);
 assert.equal(packCargoMass(undefined,['backpack'],undefined,undefined,0),0);
 assert.equal(packCargoMass(undefined,['backpack']),.32);
});
