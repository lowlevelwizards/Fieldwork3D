import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H5.3 goggle strap swaps between shell and fabric surfaces',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const where of ['front','rear']){
   const module=kit.modules['goggles-'+where];
   const a=module.getObjectByName('goggle-retention-covered');
   const b=module.getObjectByName('goggle-retention-bare');
   assert.ok(a&&b);
   assert.ok(a.getObjectByName('continuous-helmet-goggle-strap'));
   assert.ok(b.getObjectByName('bare-shell-goggle-strap'));
   updateHelmetFieldLayers(kit,{goggles:where},0x776655,false);
   assert.equal(a.visible,false);assert.equal(b.visible,true);
   updateHelmetFieldLayers(kit,{goggles:where},0x776655,true);
   assert.equal(a.visible,true);assert.equal(b.visible,false);
   const assembly=module.children.find(x=>x.userData.h9HelmetGoggles);
   assert.ok(assembly.userData.h5StrapOutsideElastic);
   const paths=assembly.userData.h5AdaptiveStrapPaths;
   assert.equal(paths.bare.length,paths.covered.length);
   assert.ok(paths.bare.some((v,i)=>v[0]!==paths.covered[i][0]));
  }
 }
});
