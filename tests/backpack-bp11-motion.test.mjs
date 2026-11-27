import test from 'node:test';import assert from 'node:assert/strict';
import {PACK_STYLES} from '../src/operator-backpack-catalog.ts';
import {packCargoMass,packSuspensionScale} from '../src/operator-backpack-motion.ts';
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
