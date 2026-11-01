import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentCarryAnchor} from '../src/equipment-carry-visuals.ts';
import {carryPlacementLedger} from '../src/equipment-carry-placement.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('24.03 belt, rig, backpack sockets are distinct and finite',()=>{
 for(const kind of ['medical','utility']){
  const a=equipmentCarryAnchor(kind,'rig'),b=equipmentCarryAnchor(kind,'belt'),
   c=equipmentCarryAnchor(kind,'backpack');
  assert.notDeepEqual(a,b);assert.notDeepEqual(a,c);
  for(const anchor of [a,b,c])for(const v of Object.values(anchor))
   assert.ok(Number.isFinite(v));
 }
});
test('24.03 every actual equipment carrying location can be rendered',()=>{
 let kit=initialEquipmentLoadout('carbine');
 kit=setEquipmentChoice(kit,'medical','medical-trauma');
 kit=setEquipmentChoice(kit,'utility','utility-pry');
 for(const p of carryPlacementLedger(kit).filter(p=>p.kind!=='magazine')){
  const anchor=equipmentCarryAnchor(p.kind,p.location);
  assert.ok(Number.isFinite(anchor.x+anchor.y+anchor.z+anchor.angle));
 }
});
