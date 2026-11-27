import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe,resolvedWardrobe,setWardrobeFabricSolid,setWardrobeFabricCamo,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {makeWardrobeLook,exportWardrobeLook,importWardrobeLook} from '../src/operator-wardrobe-storage.ts';
import {packTextile} from '../src/operator-backpack-textiles.ts';
import {solidChoicesFor} from '../src/operator-garment-color-policy.ts';
import {fabricCamoCompatible} from '../src/operator-fabric-camo-policy.ts';

test('BP13 pack materials, print roll and independent uniform choice survive exported looks',()=>{
 const kit=setEquipmentChoice(initialEquipmentLoadout(),'backpack','backpack-expedition');
 const outfit=resolvedWardrobe(initialWardrobe(),kit);
 assert.equal(outfit.packStyle,'rucksack');
 let w=initialWardrobe();
 w=setWardrobeFabricSolid(w,'top','olive-drab');
 w=setWardrobeFabricSolid(w,'pack','forest-green',outfit);
 w=setWardrobeFabricCamo(w,'pack','woodland-dpm',outfit);
 w=setWardrobeFabricCamo(w,'pack','woodland-dpm',outfit);
 const restored=importWardrobeLook(exportWardrobeLook(makeWardrobeLook('Field load',kit,w)));
 assert.ok(restored);
 assert.equal(restored.kit.slots.backpack,'backpack-expedition');
 assert.deepEqual(restored.wardrobe.fabricCamo,JSON.parse(JSON.stringify(w.fabricCamo)));
 assert.deepEqual(restored.wardrobe.fabricCamoRoll,w.fabricCamoRoll);
 assert.deepEqual(restored.wardrobe.fabricSolids,w.fabricSolids);
 assert.equal(restored.wardrobe.lastFabricCamo.pack,'woodland-dpm');
});

test('BP13 incompatible textiles cannot replace saved choices; returning pack restores eligibility',()=>{
 const base=initialEquipmentLoadout();
 const civilian=resolvedWardrobe(initialWardrobe(),setEquipmentChoice(base,'backpack','backpack-civilian'));
 assert.equal(civilian.packStyle,'civilian-pack');
 let w=setWardrobeFabricSolid(initialWardrobe(),'pack','burnt-orange',civilian);
 assert.equal(w.fabricSolids.pack,'burnt-orange');
 const field=resolvedWardrobe(initialWardrobe(),setEquipmentChoice(base,'backpack','backpack-field'));
 assert.equal(solidChoicesFor('pack',field).includes('burnt-orange'),false);
 assert.equal(setWardrobeFabricSolid(w,'pack','burnt-orange',field),w);
 assert.equal(fabricCamoCompatible('woodland-marpat','pack',civilian),false);
 assert.equal(setWardrobeFabricCamo(w,'pack','woodland-marpat',civilian),w);
 const saved=readWardrobe(JSON.parse(JSON.stringify(w)));
 assert.equal(saved.fabricSolids.pack,'burnt-orange');
 assert.ok(solidChoicesFor('pack',civilian).includes(saved.fabricSolids.pack));
 assert.ok(packTextile('no-pack').solids.length===0);
});
