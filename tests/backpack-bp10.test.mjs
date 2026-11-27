import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {equipmentAssembly,packMountChoices} from '../src/operator-equipment-assembly.ts';
import {fitPack,buildPackHarness} from '../src/operator-backpack-fit.ts';
import {PACK_PROFILES} from '../src/operator-backpack-catalog.ts';
import {packTextile} from '../src/operator-backpack-textiles.ts';
import {solidChoicesFor,GARMENT_SOLID_COLORS} from '../src/operator-garment-color-policy.ts';
import {fabricCamoChoices} from '../src/operator-fabric-camo-policy.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
const m=()=>({fabric:new THREE.MeshStandardMaterial(),trim:new THREE.MeshStandardMaterial(),dark:new THREE.MeshStandardMaterial()});
test('BP10 every compatible mount has a single suspension owner and finite fitted spans',()=>{
 for(const style of Object.keys(PACK_PROFILES))for(const armor of ['armor-bare','soft-slick','plate-jpc','plate-standard','plate-heavy'])for(const rig of ['no-rig','micro-rig','chest-placard','full-chest','chicom-rig','alice-lc2']){
  for(const mode of packMountChoices(style,armor,rig)){
   const a=equipmentAssembly(style,armor,rig,mode),f=fitPack(style,armor,rig,'combat-shirt',undefined,mode,'battle-belt');
   assert.equal(a.compatible,true);assert.equal(f.compatible,true);
   if(a.direct)assert.equal(f.spans.length,0);
   if(a.sharedRig)assert.equal(a.externalRig,false);
   if(['field-pack','rucksack','civilian-pack'].includes(style))assert.equal(mode,'independent');
   for(const s of [...f.spans,...(f.waistSpans??[])])assert.ok([...s.a,...s.b,...s.normal].every(Number.isFinite));
   const g=buildPackHarness(f,m());g.traverse(o=>{if(o.isMesh)assert.ok(o.geometry.getAttribute('position').array.every(Number.isFinite));});
  }
 }
 assert.equal(equipmentAssembly('assault-panel','armor-bare','no-rig').compatible,false);
 assert.equal(equipmentAssembly('day-pack','armor-bare','chicom-rig','direct').mode,'independent');
 assert.equal(readWardrobe({...initialWardrobe(),packMount:'adapter'}).packMount,undefined);
 assert.equal(equipmentAssembly('day-pack','plate-jpc','split-front','independent').mode,'direct');
 assert.equal(equipmentAssembly('day-pack','armor-bare','split-front').mode,'shared');
 assert.equal(readWardrobe({...initialWardrobe(),packMount:'invalid'}).packMount,undefined);
});
test('BP10 category-specific defaults and eligible prints, no irrelevant snow covers or legacy modern panel',()=>{
 const outfit={top:'combat-shirt',trousers:'acu-trousers',armorStyle:'plate-jpc',rigStyle:'micro-rig',packStyle:'rucksack'};
 for(const style of Object.keys(PACK_PROFILES)){
  const t=packTextile(style),o={...outfit,packStyle:style};
  assert.deepEqual(solidChoicesFor('pack',o),t.solids);
  for(const s of t.solids)assert.ok(GARMENT_SOLID_COLORS[s]);
  if(style!=='no-pack')assert.ok(t.solids.includes(t.solid));
  const prints=fabricCamoChoices('pack',o);
  assert.equal(prints.length,t.prints.length);
  assert.ok(!prints.includes('multicam-alpine'));
 }
 assert.ok(fabricCamoChoices('pack',outfit).includes('russian-emr'));
 assert.ok(fabricCamoChoices('pack',outfit).includes('woodland-marpat'));
 assert.ok(fabricCamoChoices('pack',{...outfit,packStyle:'hydration'}).includes('aor1'));
 assert.ok(!fabricCamoChoices('pack',{...outfit,packStyle:'admin-pack'}).includes('alpenflage'));
 assert.ok(solidChoicesFor('pack',{...outfit,packStyle:'medic-pack'}).includes('medical-red'));
});
