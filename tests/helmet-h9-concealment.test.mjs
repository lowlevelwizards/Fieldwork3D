import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {sampleHelmetCover} from '../src/operator-helmet-surface.ts';

test('H9.2: each ACH/MICH cover gets twelve true sewn slits, eight folded strips and ten curated bunches',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  assert.equal(kit.modules.loops.userData.h9SewnSlitCount,12);
  assert.equal(kit.modules.scrim.userData.h9FoldedStrips,8);
  assert.equal(kit.modules.leaves.userData.h9FoliageAnchors,10);
  assert.equal(kit.modules.leaves.children.length,10);
  const directions=[];
  for(const leaf of kit.modules.leaves.children){
   assert.equal(leaf.name,'pasgt-derived-foliage');
   const slot=leaf.userData.h9Anchor;
   const frame=sampleHelmetCover(shell,slot.region,slot.u,slot.v);
   const aim=new THREE.Vector3(...leaf.userData.h9OutwardDown);
   assert.ok(aim.y<-.18,shell+' foliage must lean downward');
   assert.ok(aim.dot(frame.normal)>.45,shell+' foliage must lean outward');
   assert.ok(leaf.geometry.userData.pasgtBunchCardCount===3);
   directions.push(aim.toArray().map(x=>Math.round(x*100)).join(','));
  }
  assert.ok(new Set(directions).size>=6,'foliage direction must be asymmetric');
  const active=kit.modules.leaves.children;
  updateHelmetFieldLayers(kit,{concealment:'foliage-sparse'},0x666654,true);
  assert.equal(active.filter(c=>c.visible).length,3);
  updateHelmetFieldLayers(kit,{concealment:'foliage-medium'},0x666654,true);
  assert.equal(active.filter(c=>c.visible).length,6);
  updateHelmetFieldLayers(kit,{concealment:'foliage-heavy'},0x666654,true);
  assert.equal(active.filter(c=>c.visible).length,10);
  updateHelmetFieldLayers(kit,{concealment:'scrim'},0x666654,true);
  assert.equal(kit.modules.scrim.visible,true);
  assert.equal(kit.modules.leaves.visible,false);
 }
});
