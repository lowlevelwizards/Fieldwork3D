import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readWardrobe,initialWardrobe,wardrobeItemsForSlot}
 from '../src/operator-wardrobe-data.ts';
import {activeAppearanceItems} from '../src/operator-appearance-grid.ts';
import {BALLISTIC_CUT_SHELL,ballisticHelmetCut,canonicalBallisticHelmet}
 from '../src/operator-ballistic-helmet-cut.ts';
import {createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
test('A1: only supported, modeled helmets remain registered',()=>{
 const items=wardrobeItemsForSlot('headwear'),ids=items.map(x=>x.id);
 assert.deepEqual(items.filter(x=>x.family==='ballistic').map(x=>x.id),
  ['soviet-steel','pasgt','ach','mich-2001','mich-2002',
   'm1-steel','ddr-m56','police-helmet']);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(activeAppearanceItems('headwear').filter(x=>x.id==='ach').length,1);
});
test('A1: exactly three ballistic cuts with actual modeled geometry',()=>{
 assert.deepEqual(BALLISTIC_CUT_SHELL,{full:'ach',mid:'mich-2002',high:'mich-2001'});
 for(const id of Object.values(BALLISTIC_CUT_SHELL)){
  assert.ok(ballisticHelmetCut(id));
  assert.equal(canonicalBallisticHelmet(id),id);
  assert.equal(createHeadwearSilhouette(id,new THREE.MeshStandardMaterial()).children.length,1);
 }
 assert.equal(ballisticHelmetCut('pasgt'),null);
});
test('A1: active looks survive repeated save normalization',()=>{
 const base=initialWardrobe();
 for(const id of Object.values(BALLISTIC_CUT_SHELL)){
  const original={...base,styles:{...base.styles,headwear:id},
   helmetSetup:{cover:'fitted'},helmetField:{rails:true,shroud:true,
    bungees:true,goggles:'front',camera:true,cameraSide:'left'}};
  const once=readWardrobe(original),twice=readWardrobe(once);
  assert.deepEqual(once,twice);
  assert.equal(once.styles.headwear,id);
  assert.equal(once.helmetField?.bungees,true);
 }
});
