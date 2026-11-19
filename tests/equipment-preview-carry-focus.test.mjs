import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_CARRY_LOCATIONS} from '../src/equipment-field-inventory.ts';
import {previewCarryFocus} from '../src/equipment-preview-carry-focus.ts';
test('each real carrier has a bounded marker on an existing operator bone',()=>{
 const used=new Set();
 for(const location of FIELD_CARRY_LOCATIONS){
  const mark=previewCarryFocus(location);
  assert.ok(['chest','hip','pack'].includes(mark.bone));
  assert.ok(Number.isFinite(mark.x)&&Number.isFinite(mark.y)&&Number.isFinite(mark.z));
  assert.ok(mark.radius>=3&&mark.radius<=8);
  used.add([mark.bone,mark.x,mark.y,mark.z].join(':'));
 }
 assert.equal(used.size,FIELD_CARRY_LOCATIONS.length);
 assert.equal(previewCarryFocus('backpack').bone,'pack');
 assert.equal(previewCarryFocus('pocket').bone,'hip');
});
