import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HELMET_MOUNT_PROFILES} from '../src/operator-helmet-attachment-frames.ts';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';

test('H10.3: stowed D2 housing sits proud and its continuous strap wraps outside helmet',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const profile=HELMET_MOUNT_PROFILES[shell];
  for(const where of ['front','rear']){
   const model=kit.modules['goggles-'+where].children.find(x=>x.userData.h9HelmetGoggles);
   assert.ok(model);
   assert.equal(model.userData.h10OverShellStrap,true);
   assert.equal(model.userData.h10ProudHousing,true);
   const pose=model.getObjectByName('approved-d2-goggle-pose');
   assert.ok(pose);
   const faceZ=where==='front'?pose.position.z-5.92:pose.position.z+5.92;
   if(where==='front')assert.ok(faceZ<profile.front-.75);
   else assert.ok(faceZ>profile.rear+.75);
   const p=model.userData.h9StrapPath;
   assert.ok(p.length>=16);
   assert.ok(p.every(x=>x.every(Number.isFinite)));
   assert.ok(p.some(x=>x[2]>profile.rear-.5));
   assert.ok(p.some(x=>x[2]<profile.front+.5));
   assert.ok(model.getObjectByName('continuous-helmet-goggle-strap'));
   const sleeve=model.getObjectByName('goggle-fabric-sleeve');
   assert.equal(sleeve.userData.h9FaceContourPoints,14);
   updateHelmetFieldLayers(kit,{goggles:where,goggleSleeve:true},0x62705a,true);
   assert.equal(sleeve.visible,true);
  }
 }
});
