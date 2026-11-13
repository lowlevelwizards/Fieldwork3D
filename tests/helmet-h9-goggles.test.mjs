import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
test('H9.5: fitted full-wrap straps exist on front/rear modern stowage',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const where of ['front','rear']){
   const root=kit.modules['goggles-'+where];
   const assembly=root.children.find(x=>x.userData.h9HelmetGoggles);
   assert.ok(assembly,shell+' '+where+' lacks model');
   assert.equal(assembly.userData.h9Position,where);
   assert.equal(assembly.userData.h9FittedStrap,true);
   assert.ok(assembly.userData.h9StrapSegments>=14);
   const path=assembly.userData.h9StrapPath;
   assert.ok(path.every(v=>v.length===3&&v.every(Number.isFinite)));
   assert.ok(path.some(v=>v[2]<-3));
   assert.ok(path.some(v=>v[2]>3));
   assert.ok(path.some(v=>v[0]<-3));
   assert.ok(path.some(v=>v[0]>3));
   assert.ok(assembly.getObjectByName('continuous-helmet-goggle-strap'));
   const sleeve=root.getObjectByName('goggle-fabric-sleeve');
   assert.equal(sleeve?.userData.h9HousingFitted,true);
   assert.ok(sleeve.getObjectByName('fitted-sleeve-folded-cloth'));
   assert.ok(sleeve.userData.h9FaceContourPoints>=12);
   updateHelmetFieldLayers(kit,{goggles:where,goggleSleeve:true},0x67745b,true);
   assert.equal(sleeve.visible,true);
   updateHelmetFieldLayers(kit,{goggles:where,goggleSleeve:false},0x67745b,true);
   assert.equal(sleeve.visible,false);
  }
 }
});
test('H9.5: eye-worn D2 keeps approved band without a duplicate helmet strap',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'ach');
 const g=kit.modules['goggles-eyes'];
 const model=g.children.find(x=>x.userData.h9HelmetGoggles);
 assert.ok(model);
 assert.ok(model.getObjectByName('approved-d2-goggle-pose'));
 assert.equal(model.userData.h9FittedStrap,undefined);
 updateHelmetFieldLayers(kit,{goggles:'eyes',goggleSleeve:true},0x67745b,true);
 assert.equal(g.getObjectByName('goggle-fabric-sleeve')?.visible,false);
});

test('H9.5: historical PASGT retains D2 goggles but uses the fitted sleeve',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 const g=kit.modules['goggles-rear'];
 assert.ok(g.getObjectByName('approved-d2-goggle-pose'));
 const sleeve=g.getObjectByName('goggle-fabric-sleeve');
 assert.ok(sleeve);
 assert.equal(sleeve.userData.h9HousingFitted,true);
 assert.ok(sleeve.getObjectByName('fitted-sleeve-folded-cloth'));
 updateHelmetFieldLayers(kit,{goggles:'rear',goggleSleeve:true},0x687253,true);
 assert.equal(sleeve.visible,true);
});
