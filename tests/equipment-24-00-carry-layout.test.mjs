import test from 'node:test';import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {kitMedicalSupplies} from '../src/equipment-medical-supplies.ts';
import {physicalCarryingLayout,firstAccessibleMedical}
 from '../src/equipment-carry-placement.ts';
import {magazineKit} from '../src/breach-magazines.ts';
test('24.00 medical first aid supplies sit in real pouch instead of overflow',()=>{
 const kit=initialEquipmentLoadout('carbine');
 const layout=physicalCarryingLayout(kit,
  magazineKit('rook','carbine',24,12),kitMedicalSupplies(kit));
 const medical=layout.filter(i=>['tourniquet','field-dressing'].includes(i.kind));
 assert.equal(medical.length,3);
 assert.ok(medical.every(i=>i.location==='medical-pouch'));
 assert.ok(firstAccessibleMedical(layout,'tourniquet'));
});
test('24.00 no medical kit means no phantom medicine',()=>{
 const kit=setEquipmentChoice(initialEquipmentLoadout('carbine'),'medical','medical-none');
 const layout=physicalCarryingLayout(kit,[],kitMedicalSupplies(kit));
 assert.equal(layout.filter(i=>i.kind==='field-dressing').length,0);
});
test('24.00 specialist utility tool is one mount and never a duplicate kit',()=>{
 const kit=setEquipmentChoice(initialEquipmentLoadout('carbine'),'utility','utility-pry');
 const layout=physicalCarryingLayout(kit,[],kitMedicalSupplies(kit));
 assert.deepEqual(layout.filter(i=>i.location==='utility-mount').map(i=>i.kind),['utility-pry']);
});
test('24.00 no magazine ID may exist twice in derived layout',()=>{
 const kit=initialEquipmentLoadout('carbine'),magazines=magazineKit('rook','carbine',36,12);
 const layout=physicalCarryingLayout(kit,magazines,kitMedicalSupplies(kit));
 const magIds=layout.filter(i=>i.kind==='magazine').map(i=>i.id);
 assert.equal(new Set(magIds).size,magIds.length);
});
