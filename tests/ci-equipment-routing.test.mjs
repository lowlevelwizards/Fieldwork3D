import test from 'node:test';
import assert from 'node:assert/strict';
import {selectEquipment} from '../scripts/verification/ci-equipment-routing.mjs';
const none={backpack:false,belt:false,footwear:false};
const all={backpack:true,belt:true,footwear:true};
test('isolated equipment changes select their owning lane',()=>{
 for(const [path,key] of [['src/operator-backpack-geometry.ts','backpack'],['src/operator-belt-mounts.ts','belt'],['tests/operator-footwear-options.test.mjs','footwear']]){
  assert.deepEqual(selectEquipment([path]),{...none,[key]:true});
 }
});
test('shared geometry and unknown source changes fail closed',()=>{
 for(const path of ['src/operator-wardrobe-gear-visuals.ts','src/breach-motion-boot.ts','src/new-shared-module.ts','tests/new-contract.test.mjs','package.json','.github/workflows/ci.yml']){
  assert.deepEqual(selectEquipment([path]),all,path);
 }
});
test('isolated unrelated domains and docs do not create equipment jobs',()=>{
 for(const path of ['src/breach-blood-evidence.ts','tests/vfx-v13-blood-evidence.test.mjs','docs/readme.md','src/replay/store.ts'])assert.deepEqual(selectEquipment([path]),none,path);
});
test('multiple changed lanes are unioned',()=>{
 assert.deepEqual(selectEquipment(['src/operator-backpack-shape.ts','tests/operator-footwear-options.test.mjs']),{backpack:true,belt:false,footwear:true});
});
